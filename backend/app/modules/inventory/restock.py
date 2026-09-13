"""What the shop should buy next, and how much of it.

Three different questions feed one list:

* **Running out.** Measured from this shop's own sales ledger, not from a
  reorder level someone typed at signup. A rate the shop actually sells at is
  the only thing that can say whether four cartons is a week of cover or a day.
* **About to expire.** Shelf life caps the order. Suggesting a fortnight of
  bread because the sales rate says so is how a shopkeeper loses money on
  advice, so the quantity is clamped to what will sell before it spoils.
* **Not stocked at all.** The demand engine already knows what nearby shops are
  asked for and cannot supply. A product this shop does not carry, that its
  neighbours are turning customers away for, is the highest-value line here -
  and it is invisible to any purely inventory-based rule.

Everything carries the sentence that produced it. A quantity without a reason
is a number a shopkeeper has to take on trust, and they will not.
"""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.catalogue import Category, DistributorCatalogueItem, Product
from app.models.intelligence import SupplyGap
from app.models.profiles import DistributorProfile, Location, RetailerProfile
from app.models.retail import RetailerInventory
from app.modules.inventory import service

# How far ahead an order should carry the shop. A week matches the purchase
# cadence most kirana report, and keeps capital on the shelf rather than in the
# back room.
TARGET_COVER_DAYS = 7

# Below this many days of cover, a line is urgent rather than merely due.
URGENT_COVER_DAYS = 2


def _local_distributor_ids(db: Session, retailer: RetailerProfile) -> list:
    """Suppliers who can actually deliver to this shop's district."""
    if not retailer.location_id:
        return []
    location = db.query(Location).filter(Location.id == retailer.location_id).first()
    if not location or not location.district:
        return []
    return [
        row.id for row in db.query(DistributorProfile.id)
        .join(Location, DistributorProfile.location_id == Location.id)
        .filter(Location.district == location.district).all()
    ]


def _cheapest_listing(db: Session, product_id: str, distributor_ids: list):
    """The cheapest local listing that can actually ship today."""
    if not distributor_ids:
        return None
    return db.query(DistributorCatalogueItem).filter(
        DistributorCatalogueItem.product_id == product_id,
        DistributorCatalogueItem.distributor_id.in_(distributor_ids),
        DistributorCatalogueItem.is_active == True,  # noqa: E712
        DistributorCatalogueItem.stock_status == "available",
        DistributorCatalogueItem.available_stock > 0,
    ).order_by(DistributorCatalogueItem.selling_price.asc()).first()


def suggested_quantity(rate: float, on_hand: int, shelf_life_days: Optional[int], moq: int) -> int:
    """How much to order to reach the cover target without over-buying.

    Shelf life is the binding constraint when it is shorter than the target:
    ordering a week of milk that keeps for three days is a week of waste
    dressed up as a restock suggestion.
    """
    horizon = TARGET_COVER_DAYS
    if shelf_life_days:
        horizon = min(horizon, max(1, shelf_life_days))

    needed = max(0, round(rate * horizon) - on_hand)
    # Nothing sold yet but the shelf is empty: one minimum order is the only
    # honest suggestion, since there is no rate to project from.
    if needed <= 0 and on_hand <= 0:
        needed = moq
    if needed <= 0:
        return 0
    return max(needed, moq)


def build_restock_plan(db: Session, retailer: RetailerProfile) -> dict:
    """The shop's next purchase, assembled from its own shelf and its area."""
    distributor_ids = _local_distributor_ids(db, retailer)
    rows = db.query(RetailerInventory).filter(
        RetailerInventory.retailer_id == retailer.id,
        RetailerInventory.is_active == True,  # noqa: E712
    ).all()

    today = date.today()
    reorder, expiring, stocked_products = [], [], set()

    for row in rows:
        stocked_products.add(row.product_id)
        product = row.product or db.query(Product).filter(Product.id == row.product_id).first()
        name = product.canonical_name if product else "Unknown"

        rate = service.sales_per_day(db, row.id)
        cover = service.days_of_cover(row.quantity, rate)

        # Stock that will spoil before it sells, reported with what it cost.
        soon = [
            b for b in row.batches
            if b.quantity > 0 and b.expires_on and b.expires_on <= today + timedelta(days=service.EXPIRY_WARNING_DAYS)
        ]
        if soon:
            at_risk = sum(b.quantity for b in soon)
            nearest = min(b.expires_on for b in soon)
            days_left = (nearest - today).days
            # Only the part that will not sell in time is actually at risk.
            will_sell = round(rate * max(0, days_left)) if rate > 0 else 0
            wasted = max(0, at_risk - will_sell)
            expiring.append({
                "inventoryId": row.id,
                "name": name,
                "quantity": at_risk,
                "atRiskQuantity": wasted,
                "expiresOn": nearest.isoformat(),
                "daysLeft": days_left,
                "costValue": round((row.unit_cost or 0) * wasted, 2),
                "action": (
                    "Aaj hi discount par nikalein"
                    if days_left <= 1 else
                    f"{days_left} din mein expire - {'discount karein' if wasted else 'normal bik jayega'}"
                ),
                "reason": (
                    f"{at_risk} pieces {nearest.isoformat()} ko expire ho rahe hain"
                    + (f", aur aap roz lagbhag {rate} bechte hain." if rate > 0
                       else ", aur abhi tak koi sale record nahi hui.")
                ),
            })

        listing = _cheapest_listing(db, row.product_id, distributor_ids)
        moq = max(1, listing.minimum_order_quantity or 1) if listing else 1
        quantity = suggested_quantity(rate, row.quantity, row.shelf_life_days, moq)

        due = row.quantity <= row.reorder_level or (cover is not None and cover <= TARGET_COVER_DAYS)
        if not due or quantity <= 0:
            continue

        urgent = row.quantity == 0 or (cover is not None and cover <= URGENT_COVER_DAYS)
        if rate > 0 and cover is not None:
            why = f"Aap roz lagbhag {rate} bechte hain - {row.quantity} stock {cover} din chalega."
        elif row.quantity == 0:
            why = "Stock khatam ho gaya hai."
        else:
            why = f"Stock {row.quantity} hai, aapka reorder level {row.reorder_level} hai."

        if row.shelf_life_days and row.shelf_life_days < TARGET_COVER_DAYS:
            why += f" Shelf life {row.shelf_life_days} din hai, isliye utna hi mangwaya ja raha hai."

        reorder.append({
            "inventoryId": row.id,
            "productId": row.product_id,
            "name": name,
            "onHand": row.quantity,
            "salesPerDay": rate,
            "daysOfCover": cover,
            "suggestedQuantity": quantity,
            "urgent": urgent,
            "shelfLifeDays": row.shelf_life_days,
            "reason": why,
            **_supply(listing, db, quantity),
        })

    # Anything overdue first, then by how thin the cover is.
    reorder.sort(key=lambda i: (not i["urgent"], i["daysOfCover"] if i["daysOfCover"] is not None else 999))
    expiring.sort(key=lambda i: i["daysLeft"])

    return {
        "reorder": reorder,
        "expiring": expiring,
        "newProducts": local_demand_opportunities(db, retailer, stocked_products, distributor_ids),
        "summary": {
            "linesToReorder": len(reorder),
            "urgentLines": sum(1 for i in reorder if i["urgent"]),
            "estimatedCost": round(sum(i.get("estimatedCost") or 0 for i in reorder), 2),
            "wastageAtRisk": round(sum(e["costValue"] for e in expiring), 2),
        },
    }


def _supply(listing, db: Session, quantity: int) -> dict:
    """Where a suggested line would actually be bought from."""
    if not listing:
        return {
            "available": False,
            "distributorId": None,
            "distributorName": None,
            "unitPrice": None,
            "minimumOrderQuantity": 1,
            "estimatedCost": None,
            "supplyNote": "Aapke district mein abhi koi supplier ise stock nahi karta.",
        }

    distributor = db.query(DistributorProfile).filter(
        DistributorProfile.id == listing.distributor_id
    ).first()
    return {
        "available": True,
        "catalogueItemId": listing.id,
        "distributorId": listing.distributor_id,
        "distributorName": distributor.business_name if distributor else "",
        "unitPrice": listing.selling_price,
        "minimumOrderQuantity": max(1, listing.minimum_order_quantity or 1),
        "estimatedCost": round((listing.selling_price or 0) * quantity, 2),
        "supplyNote": None,
    }


def local_demand_opportunities(
    db: Session,
    retailer: RetailerProfile,
    stocked_products: set,
    distributor_ids: list,
    limit: int = 5,
) -> list:
    """Products the area asks for that this shop does not carry.

    This is the part no stock-level rule can produce: a shop cannot observe
    demand for something it has never sold. It comes from the supply-gap engine,
    which aggregates what nearby shops have reported as unmet, and is filtered
    to what a local supplier can actually deliver - a recommendation nobody can
    fulfil is just a complaint.
    """
    if not retailer.location_id:
        return []

    gaps = db.query(SupplyGap).filter(
        SupplyGap.location_id == retailer.location_id,
        SupplyGap.product_id.isnot(None),
    ).order_by(
        SupplyGap.retailer_demand_count.desc(),
        SupplyGap.gap_score.desc(),
    ).limit(limit * 4).all()

    out = []
    for gap in gaps:
        if gap.product_id in stocked_products:
            continue

        listing = _cheapest_listing(db, gap.product_id, distributor_ids)
        if not listing:
            continue

        product = db.query(Product).filter(Product.id == gap.product_id).first()
        category = db.query(Category).filter(Category.id == gap.category_id).first() if gap.category_id else None
        moq = max(1, listing.minimum_order_quantity or 1)
        shops = gap.retailer_demand_count or 0

        out.append({
            "productId": gap.product_id,
            "name": product.canonical_name if product else "Unknown",
            "category": category.name if category else "General",
            "retailersAsking": shops,
            "suggestedQuantity": moq,
            "reason": (
                f"Aapke area ke {shops} shop{'s' if shops != 1 else ''} ise maang rahe hain "
                f"aur aap abhi yeh nahi rakhte."
            ),
            **_supply(listing, db, moq),
        })
        if len(out) >= limit:
            break

    return out
