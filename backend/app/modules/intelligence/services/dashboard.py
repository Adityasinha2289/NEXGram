"""Dashboard read models.

Both dashboards used to render hardcoded fixtures while the rest of the app ran
on live data, so a distributor could see "72/100" on the home screen and a
different number one tap away. These builders assemble the same cards from the
database instead, in one round trip each, because the target user is on a rural
mobile connection.

Nothing here computes intelligence. Scores come from the engines; this only
shapes what they already persisted into what the screens display.
"""

from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.catalogue import Category, DistributorCatalogueItem, Product, ProductVariant
from app.models.commerce import Order, OrderItem
from app.models.intelligence import DemandSignal, Opportunity, SupplyGap
from app.models.profiles import DistributorProfile, Location, RetailerProfile
from app.modules.intelligence.services import explanation

# Opportunity score -> what the user is told, and which colour carries it.
# Thresholds match OpportunityEngine's tiering so the label never contradicts
# the number printed beside it.
TIERS = [
    (80, "Strong", "success", "Bahut achha scope hai"),
    (65, "Good", "primary", "Achha scope hai"),
    (45, "Moderate", "warning", "Thoda scope hai"),
    (0, "Low", "danger", "Abhi scope kam hai"),
]


def naive(value: Optional[datetime]) -> Optional[datetime]:
    """Drops the offset so a value can be compared with `now_naive()`.

    SQLite hands back naive datetimes and Postgres hands back aware ones, so
    every comparison in this module has to normalise first or it raises
    "can't subtract offset-naive and offset-aware datetimes" on one backend and
    not the other.
    """
    if value is None:
        return None
    if isinstance(value, str):
        value = datetime.fromisoformat(value)
    return value.replace(tzinfo=None) if value.tzinfo else value


def now_naive() -> datetime:
    """Current UTC time, offset stripped, to compare against stored timestamps."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def tier_for(score: float):
    for threshold, label, variant, blurb in TIERS:
        if score >= threshold:
            return label, variant, blurb
    return TIERS[-1][1], TIERS[-1][2], TIERS[-1][3]


def demand_level(retailer_count: int) -> str:
    if retailer_count >= 10:
        return "High"
    if retailer_count >= 5:
        return "Medium-High"
    if retailer_count >= 2:
        return "Medium"
    return "Low"


def supply_level_label(gap: SupplyGap) -> str:
    available = gap.available_supplier_count or 0
    if available == 0:
        return "Koi supplier nahi"
    if available == 1:
        return "Limited (1 supplier)"
    return f"Available ({available} suppliers)"


def distance_km(a: Optional[Location], b: Optional[Location]) -> Optional[float]:
    """Great-circle distance between two locations, if both are geocoded."""
    if not a or not b:
        return None
    if None in (a.latitude, a.longitude, b.latitude, b.longitude):
        return None

    lat1, lon1, lat2, lon2 = map(radians, [a.latitude, a.longitude, b.latitude, b.longitude])
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return round(2 * 6371 * asin(sqrt(h)), 1)


# Onboarding stores delivery capability as a list of ids ("own", "pickup", ...).
# Actual delivery time lives per catalogue listing, so summarise how a supplier
# gets goods to a shop rather than inventing a duration.
DELIVERY_LABELS = {
    "own": "Khud delivery karte hain",
    "staff": "Delivery staff hai",
    "transport": "Transport partner se",
    "pickup": "Retailer pickup",
    "multiple": "Multiple options",
}


def delivery_label(distributor: DistributorProfile) -> str:
    capabilities = distributor.delivery_capabilities or []
    if isinstance(capabilities, dict):  # tolerate older rows
        capabilities = list(capabilities.keys())
    labels = [DELIVERY_LABELS.get(c, c) for c in capabilities if c]
    return " / ".join(labels[:2]) if labels else "Pucho"


def _label_for(db: Session, gap) -> tuple:
    """Resolves a gap's product and category names for display."""
    product = db.query(Product).filter(Product.id == gap.product_id).first() if gap.product_id else None
    category = db.query(Category).filter(Category.id == gap.category_id).first() if gap.category_id else None
    return (
        product.canonical_name if product else (category.name if category else "Unknown"),
        category.name if category else "General",
    )


def build_distributor_dashboard(db: Session, distributor: DistributorProfile) -> dict:
    location = db.query(Location).filter(Location.id == distributor.location_id).first()

    opportunities = db.query(Opportunity).filter(
        Opportunity.distributor_id == distributor.id,
        Opportunity.status == "active",
    ).order_by(Opportunity.opportunity_score.desc()).all()

    top = opportunities[0] if opportunities else None
    if top:
        tier_label, tier_variant, tier_blurb = tier_for(top.opportunity_score or 0)
        snapshot_score = f"{int(round(top.opportunity_score))}/100"
    else:
        tier_label, tier_variant, tier_blurb = "—", "primary", "Abhi koi signal nahi"
        snapshot_score = "—"

    # Everyone reporting demand in this distributor's district: the market they
    # could serve, not merely the one they already sell into.
    district_locations = []
    if location and location.district:
        district_locations = [
            row.id for row in db.query(Location.id).filter(Location.district == location.district).all()
        ]

    retailers_looking = 0
    if district_locations:
        retailers_looking = db.query(func.count(func.distinct(DemandSignal.retailer_id))).filter(
            DemandSignal.location_id.in_(district_locations)
        ).scalar() or 0

    demand_gaps = []
    for opp in opportunities[:3]:
        gap = db.query(SupplyGap).filter(
            SupplyGap.product_id == opp.product_id,
            SupplyGap.category_id == opp.category_id,
            SupplyGap.location_id == opp.location_id,
        ).first()
        name, category_name = _label_for(db, opp)
        label, variant, _ = tier_for(opp.opportunity_score or 0)
        demand_gaps.append({
            "id": opp.id,
            "category": category_name,
            "product": name,
            "demand": demand_level(opp.potential_retailer_count or 0),
            "retailers": opp.potential_retailer_count or 0,
            "supply": supply_level_label(gap) if gap else "Unknown",
            "opportunity": label,
            "badgeVariant": variant,
            "score": opp.opportunity_score,
            "confidence": opp.confidence or "Low",
        })

    # Which categories the local market is asking for, biggest first.
    retailer_demand = []
    if district_locations:
        rows = db.query(
            Category.id,
            Category.name,
            func.count(func.distinct(DemandSignal.retailer_id)).label("count"),
        ).join(DemandSignal, DemandSignal.category_id == Category.id).filter(
            DemandSignal.location_id.in_(district_locations)
        ).group_by(Category.id, Category.name).order_by(func.count(func.distinct(DemandSignal.retailer_id)).desc()).limit(4).all()
        retailer_demand = [{"id": r.id, "category": r.name, "count": r.count} for r in rows]

    status_counts = dict(
        db.query(Order.status, func.count(Order.id))
        .filter(Order.distributor_id == distributor.id)
        .group_by(Order.status).all()
    )

    catalogue_items = db.query(DistributorCatalogueItem).filter(
        DistributorCatalogueItem.distributor_id == distributor.id,
        DistributorCatalogueItem.is_active == True,
    ).all()
    catalogue_category_ids = {
        row.category_id for row in db.query(Product.category_id).filter(
            Product.id.in_([item.product_id for item in catalogue_items] or [""])
        ).all()
    }

    return {
        "businessName": distributor.business_name,
        "location": {
            "area": location.area if location else "",
            "district": location.district if location else "",
        },
        "snapshot": {
            "opportunityScore": snapshot_score,
            "opportunityLabel": tier_blurb,
            "opportunityTier": tier_label,
            "opportunityVariant": tier_variant,
            "retailersLooking": retailers_looking,
            "retailersLabel": "Aapke district mein demand",
        },
        "demandGaps": demand_gaps,
        "retailerDemand": retailer_demand,
        "orders": {
            "pending": status_counts.get("requested", 0),
            "ready": status_counts.get("accepted", 0) + status_counts.get("ready", 0),
            "completed": status_counts.get("completed", 0),
        },
        "catalogue": {
            "totalProducts": len(catalogue_items),
            "totalCategories": len(catalogue_category_ids),
        },
        "opportunityCount": len(opportunities),
    }


def parse_budget(raw: Optional[str]) -> tuple:
    """Turns an onboarding budget band into (min, max) rupees.

    Onboarding collects bands like "10000-25000", "under-10000" or "50000+",
    so this stays tolerant: an unparseable value means no ceiling rather than
    a plan of nothing.
    """
    if not raw:
        return 0, None
    digits = [int(part) for part in "".join(c if c.isdigit() else " " for c in raw).split()]
    if not digits:
        return 0, None
    if raw.strip().lower().startswith("under"):
        return 0, digits[0]
    if len(digits) == 1:
        return digits[0], None
    return min(digits), max(digits)


def build_developer_pack(db: Session, retailer: RetailerProfile, limit: int = 6) -> dict:
    """A budget-aware stock plan for one shop.

    Greedy allocation over the local shortages, worst first: for each gap, take
    the cheapest variant a nearby distributor can actually deliver, order enough
    to matter without breaching the shop's stated budget, and stop when the
    money runs out. Every line carries the evidence that put it there.
    """
    if not retailer.location_id:
        return {"title": "Starter Pack", "items": [], "estimatedTotal": 0, "budget": None, "skipped": []}

    budget_min, budget_max = parse_budget(retailer.investment_budget)
    ceiling = budget_max if budget_max else float("inf")

    gaps = db.query(SupplyGap).filter(
        SupplyGap.location_id == retailer.location_id,
        SupplyGap.product_id.isnot(None),
    ).order_by(
        SupplyGap.retailer_demand_count.desc(),
        SupplyGap.gap_score.desc(),
    ).limit(limit * 3).all()

    # Suppliers who can deliver to this shop's district.
    location = db.query(Location).filter(Location.id == retailer.location_id).first()
    local_distributor_ids = []
    if location and location.district:
        local_distributor_ids = [
            row.id for row in db.query(DistributorProfile.id)
            .join(Location, DistributorProfile.location_id == Location.id)
            .filter(Location.district == location.district).all()
        ]

    # Pair each shortage with the cheapest local listing that can actually ship.
    candidates, skipped = [], []
    for gap in gaps:
        name, category_name = _label_for(db, gap)
        listing = db.query(DistributorCatalogueItem).filter(
            DistributorCatalogueItem.product_id == gap.product_id,
            DistributorCatalogueItem.distributor_id.in_(local_distributor_ids or [""]),
            DistributorCatalogueItem.is_active == True,
            DistributorCatalogueItem.stock_status == "available",
            DistributorCatalogueItem.available_stock > 0,
        ).order_by(DistributorCatalogueItem.selling_price.asc()).first()

        if not listing:
            # Wanted locally but nobody can supply it. That absence is itself the
            # signal, so name it rather than dropping the product silently.
            skipped.append({"name": name, "reason": "Abhi koi local distributor supply nahi karta"})
            continue

        candidates.append((gap, listing, name, category_name))
        if len(candidates) >= limit:
            break

    # Split the budget across those shortages in proportion to how many shops
    # are asking, so proven demand earns the larger share of scarce capital.
    # Each line is then clamped to the supplier's MOQ and actual stock.
    target = budget_max or budget_min or 0
    weights = [max(1, gap.retailer_demand_count or 1) for gap, _, _, _ in candidates]
    total_weight = sum(weights) or 1

    items, total = [], 0.0
    for (gap, listing, name, category_name), weight in zip(candidates, weights):
        moq = max(1, listing.minimum_order_quantity or 1)
        price = listing.selling_price or 0

        allocation = (target * weight / total_weight) if target else 0
        quantity = int(allocation // price) if price else moq
        quantity = max(quantity, moq)

        stock_capped = quantity > listing.available_stock
        if stock_capped:
            quantity = listing.available_stock

        line_total = round(price * quantity, 2)

        # Never breach the stated ceiling: fall back to the minimum order, and
        # only drop the product if even that does not fit.
        if total + line_total > ceiling:
            quantity = moq
            line_total = round(price * quantity, 2)
            if total + line_total > ceiling:
                skipped.append({"name": name, "reason": "Budget mein fit nahi hua"})
                continue

        variant = listing.variant
        distributor = db.query(DistributorProfile).filter(
            DistributorProfile.id == listing.distributor_id
        ).first()
        retailers = gap.retailer_demand_count or 0
        reason = (
            f"{retailers} nearby retailer{'s' if retailers != 1 else ''} "
            f"report{'' if retailers != 1 else 's'} unmet demand for {name}."
        )
        if stock_capped:
            reason += " Limited by what your local supplier has in stock."

        total += line_total
        items.append({
            "id": listing.id,
            "productId": gap.product_id,
            "name": name,
            "category": category_name,
            "variant": variant.variant_name if variant else "",
            "unit": variant.unit if variant else "unit",
            "suggestedQuantity": quantity,
            "price": price,
            "lineTotal": line_total,
            "minimumOrderQuantity": moq,
            "availability": "Available",
            "stockCapped": stock_capped,
            "distributorId": listing.distributor_id,
            "distributorName": distributor.business_name if distributor else "",
            "reason": reason,
            "retailers": retailers,
            "suppliers": gap.available_supplier_count or 0,
        })

    return {
        "title": "Starter Pack for Your Shop",
        "description": "Aapke area ki demand aur budget ke hisaab se suggested products.",
        "items": items,
        "estimatedTotal": round(total, 2),
        "budget": {"min": budget_min, "max": budget_max},
        "skipped": skipped,
    }


def serialise_opportunity(db: Session, opp: Opportunity) -> dict:
    """Display shape for one opportunity.

    The raw ORM row carries ids, so the UI was rendering PROD_PANEER and
    labelling the scarcity component as a supplier count. Names, the score and
    its confidence are resolved here, once, for every screen that shows them.
    """
    name, category_name = _label_for(db, opp)
    location = db.query(Location).filter(Location.id == opp.location_id).first() if opp.location_id else None
    gap = db.query(SupplyGap).filter(
        SupplyGap.product_id == opp.product_id,
        SupplyGap.category_id == opp.category_id,
        SupplyGap.location_id == opp.location_id,
    ).first()
    tier_label, tier_variant, _ = tier_for(opp.opportunity_score or 0)

    # The cheapest variant the distributor would realistically list, so the
    # "add this to my catalogue" action can arrive pre-filled instead of making
    # them search for the product they were just told about.
    default_variant = (
        db.query(ProductVariant)
        .filter(ProductVariant.product_id == opp.product_id)
        .order_by(ProductVariant.id.asc())
        .first()
        if opp.product_id else None
    )

    payload = {
        "id": opp.id,
        "name": name,
        "category": category_name,
        "isProduct": bool(opp.product_id),
        "productId": opp.product_id,
        "defaultVariantId": default_variant.id if default_variant else None,
        "defaultVariantName": default_variant.variant_name if default_variant else None,
        "area": location.area if location else "",
        "district": location.district if location else "",
        "score": round(opp.opportunity_score or 0, 1),
        "tier": tier_label,
        "tierVariant": tier_variant,
        "confidence": opp.confidence or "Low",
        "retailerCount": opp.potential_retailer_count or 0,
        "supplierCount": int(opp.competition_score or 0),
        "availableSupplierCount": (gap.available_supplier_count or 0) if gap else 0,
        "supplyLabel": supply_level_label(gap) if gap else "Unknown",
        "recommendedInitialStock": opp.recommended_initial_stock or 0,
        "distributorFit": opp.distributor_fit,
        "components": {
            "demand": opp.demand_score or 0,
            "scarcity": opp.supply_score or 0,
            "fit": opp.fit_score or 0,
        },
        "evidence": opp.evidence_json or {},
        "generatedAt": opp.generated_at.isoformat() if opp.generated_at else None,
    }

    # Every explanation is checked against the same evidence it describes, so a
    # sentence can never state a figure the engine did not produce.
    payload["explanation"] = explanation.explain_opportunity(payload)
    return payload


def build_reorder_list(db: Session, retailer: RetailerProfile) -> list:
    """What this shop has bought before and is probably due to buy again.

    Cadence comes from the gaps between their own past orders of that product,
    so the nudge is grounded in their history rather than a generic reminder.
    Whether the item is still buyable today is checked against live stock.
    """
    rows = db.query(
        OrderItem.product_id,
        OrderItem.product_variant_id,
        OrderItem.unit_price,
        Order.created_at,
        Order.distributor_id,
    ).select_from(Order).join(OrderItem, OrderItem.order_id == Order.id).filter(
        Order.retailer_id == retailer.id,
        Order.status.in_(["completed", "accepted"]),
    ).order_by(Order.created_at.desc()).all()

    history = {}
    for row in rows:
        history.setdefault(row.product_id, []).append(row)

    now = now_naive()
    items = []
    for product_id, entries in history.items():
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            continue

        # One order containing two variants of the same product is still one
        # purchase occasion, so dedupe by date before measuring cadence.
        dates = set()
        for entry in entries:
            created = naive(entry.created_at)
            if created:
                dates.add(created.date())
        if not dates:
            continue

        dates = sorted((datetime.combine(d, datetime.min.time()) for d in dates), reverse=True)
        last = dates[0]
        days_ago = (now - last).days

        # Mean interval between consecutive orders of this product.
        cadence = None
        if len(dates) > 1:
            gaps = [(dates[i] - dates[i + 1]).days for i in range(len(dates) - 1)]
            gaps = [g for g in gaps if g > 0]
            if gaps:
                cadence = round(sum(gaps) / len(gaps))

        latest = entries[0]
        listing = db.query(DistributorCatalogueItem).filter(
            DistributorCatalogueItem.product_variant_id == latest.product_variant_id,
            DistributorCatalogueItem.is_active == True,
            DistributorCatalogueItem.stock_status == "available",
            DistributorCatalogueItem.available_stock > 0,
        ).order_by(DistributorCatalogueItem.selling_price.asc()).first()

        distributor = db.query(DistributorProfile).filter(
            DistributorProfile.id == (listing.distributor_id if listing else latest.distributor_id)
        ).first()
        variant = db.query(ProductVariant).filter(ProductVariant.id == latest.product_variant_id).first()
        category = db.query(Category).filter(Category.id == product.category_id).first()

        if cadence and days_ago >= cadence:
            suggestion = f"Aap har {cadence} din mein mangwate hain - {days_ago} din ho gaye."
        elif cadence:
            suggestion = f"Aap har {cadence} din mein mangwate hain."
        else:
            suggestion = f"{days_ago} din pehle order kiya tha."

        items.append({
            "id": listing.id if listing else product_id,
            "productId": product_id,
            "productVariantId": latest.product_variant_id,
            "name": product.canonical_name,
            "category": category.name if category else "General",
            "variant": variant.variant_name if variant else "",
            "unit": variant.unit if variant else "unit",
            "price": listing.selling_price if listing else latest.unit_price,
            "lastPaidPrice": latest.unit_price,
            "minimumOrderQuantity": listing.minimum_order_quantity if listing else 1,
            "distributorId": listing.distributor_id if listing else latest.distributor_id,
            "distributorName": distributor.business_name if distributor else "",
            "lastOrderedDate": last.isoformat(),
            "daysAgo": days_ago,
            "timesOrdered": len(dates),
            "cadenceDays": cadence,
            "dueNow": bool(cadence and days_ago >= cadence),
            "available": listing is not None,
            "suggestion": suggestion,
        })

    # Anything overdue first, then by how long it has been.
    items.sort(key=lambda i: (not i["dueNow"], -i["daysAgo"]))
    return items


def build_pack_matches(db: Session, retailer: RetailerProfile, pack: dict) -> list:
    """Which local supplier can fill the most of this shop's plan, and for how much.

    Answers the retailer's "who should I actually buy from" directly from the
    plan's own lines, so the ranking cannot disagree with the plan it came from.
    """
    wanted = {item["productId"]: item for item in pack.get("items", []) if item.get("productId")}
    if not wanted:
        return []

    location = db.query(Location).filter(Location.id == retailer.location_id).first() if retailer.location_id else None
    if not location or not location.district:
        return []

    distributors = db.query(DistributorProfile).join(
        Location, DistributorProfile.location_id == Location.id
    ).filter(Location.district == location.district).all()

    matches = []
    for dist in distributors:
        listings = db.query(DistributorCatalogueItem).filter(
            DistributorCatalogueItem.distributor_id == dist.id,
            DistributorCatalogueItem.product_id.in_(list(wanted)),
            DistributorCatalogueItem.is_active == True,
            DistributorCatalogueItem.stock_status == "available",
            DistributorCatalogueItem.available_stock > 0,
        ).all()
        if not listings:
            continue

        # Cheapest listing wins when a distributor stocks several variants.
        best_by_product = {}
        for listing in listings:
            current = best_by_product.get(listing.product_id)
            if not current or (listing.selling_price or 0) < (current.selling_price or 0):
                best_by_product[listing.product_id] = listing

        subtotal = 0.0
        for product_id, listing in best_by_product.items():
            quantity = min(wanted[product_id]["suggestedQuantity"], listing.available_stock)
            quantity = max(quantity, listing.minimum_order_quantity or 1)
            subtotal += (listing.selling_price or 0) * quantity

        dist_location = db.query(Location).filter(Location.id == dist.location_id).first()
        fulfilled = len(best_by_product)
        km = distance_km(location, dist_location)
        same_area = dist.location_id == retailer.location_id

        # Say why this supplier ranks where it does; a ranking without reasons
        # is just another unexplained number.
        reasons = [f"Aapke pack ke {fulfilled} of {len(wanted)} products supply karte hain."]
        if same_area:
            reasons.append("Aapke hi area mein hain.")
        elif km is not None:
            reasons.append(f"{km} km door hain.")
        reasons.append(delivery_label(dist) + ".")

        matches.append({
            "distributorId": dist.id,
            "distributorName": dist.business_name,
            "productsFulfilled": fulfilled,
            "productsRequested": len(wanted),
            "fulfilmentPercent": round(fulfilled / len(wanted) * 100),
            "fulfilmentStatus": "Full" if fulfilled == len(wanted) else "Partial",
            "estimatedTotal": round(subtotal, 2),
            "distanceKm": km,
            "sameArea": same_area,
            "reasons": reasons,
        })

    # Most of the plan covered first; cheapest breaks the tie.
    matches.sort(key=lambda m: (-m["productsFulfilled"], m["estimatedTotal"]))
    return matches


def build_pack_options(db: Session, retailer: RetailerProfile, limit: int = 60) -> list:
    """Everything a shop could add to its plan by hand.

    Shaped exactly like a pack line so the selector and the plan speak the same
    language, and scoped to suppliers that can actually deliver here.
    """
    if not retailer.location_id:
        return []

    location = db.query(Location).filter(Location.id == retailer.location_id).first()
    if not location or not location.district:
        return []

    listings = db.query(DistributorCatalogueItem).join(
        DistributorProfile, DistributorCatalogueItem.distributor_id == DistributorProfile.id
    ).join(
        Location, DistributorProfile.location_id == Location.id
    ).filter(
        Location.district == location.district,
        DistributorCatalogueItem.is_active == True,
        DistributorCatalogueItem.stock_status == "available",
        DistributorCatalogueItem.available_stock > 0,
    ).order_by(DistributorCatalogueItem.selling_price.asc()).limit(limit).all()

    options = []
    for listing in listings:
        product = listing.product
        variant = listing.variant
        category = db.query(Category).filter(Category.id == product.category_id).first() if product else None
        moq = max(1, listing.minimum_order_quantity or 1)
        options.append({
            "id": listing.id,
            "productId": listing.product_id,
            "name": product.canonical_name if product else "Unknown",
            "category": category.name if category else "General",
            "variant": variant.variant_name if variant else "",
            "unit": variant.unit if variant else "unit",
            "suggestedQuantity": moq,
            "price": listing.selling_price,
            "lineTotal": round((listing.selling_price or 0) * moq, 2),
            "minimumOrderQuantity": moq,
            "availability": "Available",
            "stockCapped": False,
            "distributorId": listing.distributor_id,
            "distributorName": listing.distributor.business_name if listing.distributor else "",
            "reason": "Aapne manually add kiya.",
            "retailers": 0,
            "suppliers": 1,
        })
    return options


def build_retailer_dashboard(db: Session, retailer: RetailerProfile) -> dict:
    location = db.query(Location).filter(Location.id == retailer.location_id).first()

    # Ordered by how many shops are asking before how wide the gap is: "14 shops
    # near you want this" is the reason a retailer acts, and it keeps one shop's
    # idiosyncratic request from outranking a genuine local shortage.
    gaps = db.query(SupplyGap).filter(
        SupplyGap.location_id == retailer.location_id,
        SupplyGap.product_id.isnot(None),
    ).order_by(
        SupplyGap.retailer_demand_count.desc(),
        SupplyGap.gap_score.desc(),
    ).all() if retailer.location_id else []

    # What this shop should look at next: the local shortages, worst first.
    recommended = []
    for gap in gaps[:4]:
        name, category_name = _label_for(db, gap)
        available = gap.available_supplier_count or 0
        recommended.append({
            "id": gap.id,
            "name": name,
            "category": category_name,
            "demand": demand_level(gap.retailer_demand_count or 0),
            "demandBadge": "success" if (gap.retailer_demand_count or 0) >= 10 else "primary",
            "availability": "Limited" if available <= 1 else "Available",
            "availabilityBadge": "warning" if available <= 1 else "success",
            "retailers": gap.retailer_demand_count or 0,
            "suppliers": available,
        })

    # Reorder candidates: distinct products this shop has actually bought,
    # most recent first. "Last ordered" is what makes the suggestion credible.
    recent_rows = db.query(
        Product.id, Product.canonical_name, func.max(Order.created_at).label("last_ordered")
    ).select_from(Order).join(OrderItem, OrderItem.order_id == Order.id) \
        .join(Product, Product.id == OrderItem.product_id) \
        .filter(Order.retailer_id == retailer.id) \
        .group_by(Product.id, Product.canonical_name) \
        .order_by(func.max(Order.created_at).desc()).limit(4).all()

    now = now_naive()
    reorder_items = []
    for row in recent_rows:
        last = naive(row.last_ordered)
        days = (now - last).days if last else None
        reorder_items.append({
            "id": row.id,
            "name": row.canonical_name,
            "lastOrdered": f"{days} days ago" if days is not None else "Recently",
            "daysAgo": days,
        })

    # Suppliers who can actually reach this shop.
    nearby = []
    if location and location.district:
        candidates = db.query(DistributorProfile).join(
            Location, DistributorProfile.location_id == Location.id
        ).filter(Location.district == location.district).all()

        for dist in candidates:
            dist_location = db.query(Location).filter(Location.id == dist.location_id).first()
            km = distance_km(location, dist_location)
            categories = dist.product_categories or ([dist.business_category] if dist.business_category else [])

            # A supplier in the same market is "in your area", not "0.0 km away".
            if dist.location_id == retailer.location_id:
                distance_label = "Aapke area mein"
            elif km is not None:
                distance_label = f"{km} km away"
            else:
                distance_label = dist_location.area if dist_location else ""

            nearby.append({
                "id": dist.id,
                "name": dist.business_name,
                "categories": " & ".join(categories[:2]) if categories else "General",
                "distance": distance_label,
                "distanceKm": km,
                "delivery": delivery_label(dist),
            })
        nearby.sort(key=lambda d: d["distanceKm"] if d["distanceKm"] is not None else 9999)

    signal_count = db.query(func.count(DemandSignal.id)).filter(
        DemandSignal.retailer_id == retailer.id
    ).scalar() or 0

    strongest = max((g.retailer_demand_count or 0) for g in gaps) if gaps else 0

    return {
        "businessName": retailer.business_name,
        "location": {
            "area": location.area if location else "",
            "district": location.district if location else "",
        },
        "developerPack": build_developer_pack(db, retailer, limit=3),
        "snapshot": {
            "health": "Achha" if signal_count else "Adhura",
            "healthLabel": "Business profile complete" if signal_count else "Profile poora karo",
            "demand": demand_level(strongest),
            "demandLabel": "Area mein demand strong hai" if strongest >= 10 else "Area mein demand normal hai",
            "opportunity": str(len(recommended)),
            "opportunityLabel": "Products worth checking",
        },
        "recommendedProducts": recommended,
        "reorderItems": reorder_items,
        "nearbyDistributors": nearby[:3],
    }


def search_local_market(
    db: Session,
    retailer: RetailerProfile,
    query: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = 30,
) -> list:
    """"Who near me sells this, and for how much."

    Groups every in-stock listing in the retailer's district by product, so the
    answer is a price comparison across suppliers rather than a flat list of
    duplicate rows. Sorted so the strongest local demand signals surface first -
    a shop searching "dairy" should meet the products their neighbours are
    already asking for.
    """
    if not retailer.location_id:
        return []

    location = db.query(Location).filter(Location.id == retailer.location_id).first()
    if not location or not location.district:
        return []

    listings_q = db.query(DistributorCatalogueItem).join(
        DistributorProfile, DistributorCatalogueItem.distributor_id == DistributorProfile.id
    ).join(
        Location, DistributorProfile.location_id == Location.id
    ).join(
        Product, DistributorCatalogueItem.product_id == Product.id
    ).filter(
        Location.district == location.district,
        DistributorCatalogueItem.is_active == True,
        DistributorCatalogueItem.available_stock > 0,
    )

    if query:
        listings_q = listings_q.filter(Product.canonical_name.ilike(f"%{query.strip()}%"))
    if category_id:
        listings_q = listings_q.filter(Product.category_id == category_id)

    # Local demand for the same products, so each result can carry the signal
    # that makes it worth stocking.
    demand_by_product = dict(
        db.query(SupplyGap.product_id, SupplyGap.retailer_demand_count)
        .filter(SupplyGap.location_id == retailer.location_id,
                SupplyGap.product_id.isnot(None))
        .all()
    )

    grouped = {}
    for listing in listings_q.all():
        product = listing.product
        variant = listing.variant
        distributor = listing.distributor
        if not product:
            continue

        entry = grouped.setdefault(product.id, {
            "productId": product.id,
            "name": product.canonical_name,
            "category": (product.category.name if product.category else "General"),
            "retailersAsking": demand_by_product.get(product.id, 0),
            "offers": [],
        })
        entry["offers"].append({
            "catalogueItemId": listing.id,
            "distributorId": listing.distributor_id,
            "distributorName": distributor.business_name if distributor else "",
            "variant": variant.variant_name if variant else "",
            "price": listing.selling_price,
            "minimumOrderQuantity": listing.minimum_order_quantity,
            "availableStock": listing.available_stock,
            "deliveryTime": listing.delivery_time,
            "sameArea": bool(distributor and distributor.location_id == retailer.location_id),
        })

    results = []
    for entry in grouped.values():
        entry["offers"].sort(key=lambda o: o["price"] or 0)
        cheapest = entry["offers"][0]
        entry["bestPrice"] = cheapest["price"]
        entry["bestDistributorName"] = cheapest["distributorName"]
        entry["supplierCount"] = len({o["distributorId"] for o in entry["offers"]})

        # Only compare like with like: 200g against 200g. Spreading across pack
        # sizes would report a "Rs 233 saving" that is really a bigger packet.
        by_variant = {}
        for offer in entry["offers"]:
            by_variant.setdefault(offer["variant"], []).append(offer["price"] or 0)
        entry["priceSpread"] = max(
            (round(max(prices) - min(prices), 2) for prices in by_variant.values() if len(prices) > 1),
            default=0,
        )
        entry["comparableVariant"] = next(
            (variant for variant, prices in by_variant.items() if len(prices) > 1), None
        )
        results.append(entry)

    results.sort(key=lambda r: (-r["retailersAsking"], r["name"]))
    return results[:limit]
