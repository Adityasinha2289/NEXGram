"""The shop's online counter, and the boy who cycles the order over.

A household opens the app, sees what the kirana two streets away actually has
on its shelf right now, and orders it. The shop's own delivery boy walks or
cycles it across.

The radius is the design. Everything here is bounded by what someone can carry
on a bicycle in a few minutes, which is what makes the promise deliverable
without a fleet, a rider app, or a dispatch algorithm. A shop four kilometres
away is not a slower option - it is not an option, and saying so up front beats
an order that sits unaccepted.

Stock is the shop's real shelf, the same rows the counter sells from. That is
the point: an online order and a walk-in customer draw down the same milk, so
the app cannot sell what someone just bought in person.
"""

import random
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.catalogue import Category, Product, ProductVariant
from app.models.profiles import Location, RetailerProfile
from app.models.retail import (
    CONSUMER_STATUSES,
    ConsumerOrder,
    ConsumerOrderItem,
    CustomerProfile,
    DeliveryRunner,
    RetailerInventory,
)
from app.modules.inventory import service as inventory_service

# What a shop may do next with a consumer order. Mirrors the wholesale order
# table's shape so both sides of the app behave the same way, but shorter -
# a delivery that takes four states is not a ten-minute delivery.
VALID_TRANSITIONS = {
    "placed": ["accepted", "rejected", "cancelled"],
    "accepted": ["out_for_delivery", "cancelled"],
    "out_for_delivery": ["delivered", "cancelled"],
    "delivered": [],
    "cancelled": [],
    "rejected": [],
}

# Stock is committed when the shop accepts, not when the order is placed.
# Reserving at placement lets anyone empty a shelf by placing orders they never
# pay for; the shopkeeper accepting is the point they have agreed to sell it.
COMMITTING_STATUS = "accepted"

# Statuses whose committed stock must be returned to the shelf if cancelled.
RELEASING_STATUSES = {"accepted", "out_for_delivery"}


def naive_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def distance_km(lat1, lon1, lat2, lon2) -> Optional[float]:
    """Great-circle distance, or None when either point is ungeocoded."""
    if None in (lat1, lon1, lat2, lon2):
        return None
    rlat1, rlon1, rlat2, rlon2 = map(radians, [lat1, lon1, lat2, lon2])
    h = sin((rlat2 - rlat1) / 2) ** 2 + cos(rlat1) * cos(rlat2) * sin((rlon2 - rlon1) / 2) ** 2
    return round(2 * 6371 * asin(sqrt(h)), 2)


def _customer_point(customer: CustomerProfile, db: Session) -> tuple:
    """Where to measure from: the customer's own pin, else their area."""
    if customer.latitude is not None and customer.longitude is not None:
        return customer.latitude, customer.longitude
    if customer.location_id:
        loc = db.query(Location).filter(Location.id == customer.location_id).first()
        if loc:
            return loc.latitude, loc.longitude
    return None, None


def _shop_point(retailer: RetailerProfile, db: Session) -> tuple:
    if not retailer.location_id:
        return None, None
    loc = db.query(Location).filter(Location.id == retailer.location_id).first()
    return (loc.latitude, loc.longitude) if loc else (None, None)


def _same_area(customer: CustomerProfile, retailer: RetailerProfile) -> bool:
    """Fallback when nothing is geocoded: same recorded location row."""
    return bool(customer.location_id) and customer.location_id == retailer.location_id


def nearby_shops(db: Session, customer: CustomerProfile, search: Optional[str] = None) -> list:
    """Shops close enough to walk or cycle an order from.

    A shop with no geocoding is included only when it shares the customer's
    area, so an unmapped village shop is still reachable by its neighbours
    without silently offering every shop in the district.
    """
    cust_lat, cust_lon = _customer_point(customer, db)
    radius = settings.DELIVERY_RADIUS_KM

    # Only shops with something actually listed online are worth returning.
    listed_ids = {
        row.retailer_id for row in db.query(RetailerInventory.retailer_id).filter(
            RetailerInventory.is_listed_online == True,  # noqa: E712
            RetailerInventory.is_active == True,  # noqa: E712
            RetailerInventory.quantity > 0,
        ).distinct().all()
    }
    if not listed_ids:
        return []

    shops = db.query(RetailerProfile).filter(RetailerProfile.id.in_(listed_ids)).all()

    out = []
    for shop in shops:
        shop_lat, shop_lon = _shop_point(shop, db)
        km = distance_km(cust_lat, cust_lon, shop_lat, shop_lon)

        if km is not None:
            if km > radius:
                continue
            label = "Aapke paas hi" if km < 0.5 else f"{km} km door"
        elif _same_area(customer, shop):
            label = "Aapke area mein"
        else:
            continue

        if search and search.strip().lower() not in (shop.business_name or "").lower():
            continue

        location = db.query(Location).filter(Location.id == shop.location_id).first() if shop.location_id else None
        item_count = db.query(RetailerInventory).filter(
            RetailerInventory.retailer_id == shop.id,
            RetailerInventory.is_listed_online == True,  # noqa: E712
            RetailerInventory.is_active == True,  # noqa: E712
            RetailerInventory.quantity > 0,
        ).count()

        out.append({
            "shopId": shop.id,
            "name": shop.business_name,
            "businessType": shop.business_type,
            "area": location.area if location else None,
            "distanceKm": km,
            "distanceLabel": label,
            "itemsAvailable": item_count,
            "deliveryEstimate": _delivery_estimate(km),
        })

    out.sort(key=lambda s: (s["distanceKm"] if s["distanceKm"] is not None else 99))
    return out


def _delivery_estimate(km: Optional[float]) -> str:
    """Rough time on a cycle, stated as a range rather than a false precision."""
    if km is None:
        return "15-30 min"
    if km <= 0.5:
        return "10-15 min"
    if km <= 1.5:
        return "15-25 min"
    return "25-40 min"


def shop_catalogue(db: Session, shop_id: str, search: Optional[str] = None) -> dict:
    """What one shop has on its shelf and has chosen to sell online."""
    shop = db.query(RetailerProfile).filter(RetailerProfile.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Yeh dukaan nahi mili")

    rows = db.query(RetailerInventory).filter(
        RetailerInventory.retailer_id == shop_id,
        RetailerInventory.is_listed_online == True,  # noqa: E712
        RetailerInventory.is_active == True,  # noqa: E712
        RetailerInventory.quantity > 0,
    ).all()

    items = []
    for row in rows:
        product = row.product or db.query(Product).filter(Product.id == row.product_id).first()
        if not product:
            continue
        if search and search.strip().lower() not in product.canonical_name.lower():
            continue

        variant = row.variant or db.query(ProductVariant).filter(
            ProductVariant.id == row.product_variant_id
        ).first()
        category = db.query(Category).filter(Category.id == product.category_id).first()

        items.append({
            "inventoryId": row.id,
            "name": product.canonical_name,
            "variant": variant.variant_name if variant else "",
            "unit": variant.unit if variant else "unit",
            "category": category.name if category else "General",
            "price": row.selling_price,
            "available": row.quantity,
        })

    items.sort(key=lambda i: i["name"])
    location = db.query(Location).filter(Location.id == shop.location_id).first() if shop.location_id else None

    return {
        "shopId": shop.id,
        "name": shop.business_name,
        "area": location.area if location else None,
        "items": items,
    }


def _order_number(db: Session) -> str:
    """Short, human-readable, and unique. Read aloud over a phone daily."""
    stamp = naive_now().strftime("%Y%m%d")
    for _ in range(12):
        candidate = f"NXD-{stamp}-{random.randint(1000, 9999)}"
        if not db.query(ConsumerOrder).filter(ConsumerOrder.order_number == candidate).first():
            return candidate
    raise HTTPException(status_code=503, detail="Order number generate nahi ho paya, dobara try karein")


def place_order(
    db: Session,
    customer: CustomerProfile,
    shop_id: str,
    items: list,
    note: Optional[str] = None,
) -> ConsumerOrder:
    """Places a household order against one nearby shop.

    Validates the radius first, because a shop that is too far away cannot
    fulfil the order however much stock it has, and the customer should be told
    that before they choose the items rather than after.
    """
    shop = db.query(RetailerProfile).filter(RetailerProfile.id == shop_id).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Yeh dukaan nahi mili")
    if not items:
        raise HTTPException(status_code=400, detail="Order mein kam se kam ek item hona chahiye")

    cust_lat, cust_lon = _customer_point(customer, db)
    shop_lat, shop_lon = _shop_point(shop, db)
    km = distance_km(cust_lat, cust_lon, shop_lat, shop_lon)

    if km is not None and km > settings.DELIVERY_RADIUS_KM:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Yeh dukaan {km} km door hai. Hamare delivery boy cycle par jaate hain, "
                f"isliye sirf {settings.DELIVERY_RADIUS_KM} km tak delivery hoti hai."
            ),
        )
    if km is None and not _same_area(customer, shop):
        raise HTTPException(
            status_code=400,
            detail="Yeh dukaan aapke delivery area mein nahi hai.",
        )

    order = ConsumerOrder(
        order_number=_order_number(db),
        customer_id=customer.id,
        retailer_id=shop.id,
        status="placed",
        distance_km=km,
        # Snapshotted: a later profile edit must not rewrite where a past order
        # was actually sent.
        delivery_address=customer.address_line,
        delivery_landmark=customer.landmark,
        customer_note=note,
    )
    db.add(order)
    db.flush()

    subtotal = 0.0
    for entry in items:
        inventory_id = entry.get("inventory_id")
        quantity = int(entry.get("quantity") or 0)
        if quantity <= 0:
            raise HTTPException(status_code=400, detail="Har item ki quantity 0 se zyada honi chahiye")

        row = db.query(RetailerInventory).filter(
            RetailerInventory.id == inventory_id,
            RetailerInventory.retailer_id == shop.id,
        ).first()
        if not row:
            raise HTTPException(status_code=404, detail="Yeh item is dukaan mein nahi hai")
        if not row.is_listed_online or not row.is_active:
            raise HTTPException(status_code=400, detail="Yeh item abhi online available nahi hai")
        if row.quantity < quantity:
            product = row.product or db.query(Product).filter(Product.id == row.product_id).first()
            name = product.canonical_name if product else "Item"
            raise HTTPException(
                status_code=409,
                detail=f"{name}: sirf {row.quantity} available hain",
            )

        product = row.product or db.query(Product).filter(Product.id == row.product_id).first()
        variant = row.variant or db.query(ProductVariant).filter(
            ProductVariant.id == row.product_variant_id
        ).first()
        price = row.selling_price or 0.0
        line_total = round(price * quantity, 2)
        subtotal += line_total

        db.add(ConsumerOrderItem(
            order_id=order.id,
            inventory_id=row.id,
            product_name=product.canonical_name if product else "Unknown",
            variant_name=variant.variant_name if variant else None,
            quantity=quantity,
            unit_price=price,
            line_total=line_total,
        ))

    order.subtotal = round(subtotal, 2)
    order.delivery_fee = 0.0
    order.total = round(subtotal, 2)

    db.commit()
    db.refresh(order)
    return order


def update_status(
    db: Session,
    order: ConsumerOrder,
    new_status: str,
    *,
    runner_id: Optional[str] = None,
    reason: Optional[str] = None,
) -> ConsumerOrder:
    """Moves an order along, committing or releasing stock as it goes.

    Accepting is the moment the shop commits the goods, so that is where the
    shelf is decremented and a `sale_online` movement is written - the same
    ledger the counter and the microphone write to, so the day's sales are one
    number rather than three.
    """
    if new_status not in CONSUMER_STATUSES:
        raise HTTPException(status_code=400, detail=f"Unknown status: {new_status}")
    if new_status not in VALID_TRANSITIONS.get(order.status, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition from {order.status} to {new_status}",
        )

    if new_status == COMMITTING_STATUS:
        for item in order.items:
            row = db.query(RetailerInventory).filter(
                RetailerInventory.id == item.inventory_id
            ).with_for_update(read=False).first()
            if not row:
                raise HTTPException(status_code=404, detail=f"{item.product_name} ab inventory mein nahi hai")
            if row.quantity < item.quantity:
                raise HTTPException(
                    status_code=409,
                    detail=f"{item.product_name}: sirf {row.quantity} bache hain, order accept nahi ho sakta",
                )
            inventory_service.consume_stock(
                db, row, item.quantity, "sale_online",
                unit_price=item.unit_price,
                reference_id=order.id,
                commit=False,
            )
        order.accepted_at = naive_now()
        if runner_id:
            _assign_runner(db, order, runner_id)

    elif new_status == "out_for_delivery":
        if runner_id:
            _assign_runner(db, order, runner_id)
        if not order.runner_id:
            raise HTTPException(
                status_code=400,
                detail="Delivery ke liye pehle kisi ko assign karein",
            )

    elif new_status == "delivered":
        order.delivered_at = naive_now()

    elif new_status in {"cancelled", "rejected"}:
        # Stock only goes back if it was ever taken off the shelf.
        if order.status in RELEASING_STATUSES:
            for item in order.items:
                row = db.query(RetailerInventory).filter(
                    RetailerInventory.id == item.inventory_id
                ).first()
                if row:
                    inventory_service.add_stock_back(
                        db, row, item.quantity, reference_id=order.id,
                        note=f"{order.order_number} {new_status}",
                    )
        order.cancelled_at = naive_now()
        order.cancel_reason = reason

    order.status = new_status
    db.commit()
    db.refresh(order)
    return order


def _assign_runner(db: Session, order: ConsumerOrder, runner_id: str) -> None:
    runner = db.query(DeliveryRunner).filter(
        DeliveryRunner.id == runner_id,
        DeliveryRunner.retailer_id == order.retailer_id,
    ).first()
    if not runner:
        raise HTTPException(status_code=404, detail="Yeh delivery person aapki dukaan ka nahi hai")
    if not runner.is_active:
        raise HTTPException(status_code=400, detail="Yeh delivery person abhi active nahi hai")
    order.runner_id = runner.id


def serialise_order(db: Session, order: ConsumerOrder, *, for_shop: bool = False) -> dict:
    """Display shape for one consumer order."""
    runner = order.runner
    payload = {
        "id": order.id,
        "orderNumber": order.order_number,
        "status": order.status,
        "subtotal": order.subtotal,
        "deliveryFee": order.delivery_fee,
        "total": order.total,
        "distanceKm": order.distance_km,
        "deliveryEstimate": _delivery_estimate(order.distance_km),
        "placedAt": order.placed_at.isoformat() if order.placed_at else None,
        "acceptedAt": order.accepted_at.isoformat() if order.accepted_at else None,
        "deliveredAt": order.delivered_at.isoformat() if order.delivered_at else None,
        "cancelReason": order.cancel_reason,
        "note": order.customer_note,
        "runner": {"id": runner.id, "name": runner.name, "mode": runner.mode} if runner else None,
        "items": [
            {
                "id": item.id,
                "name": item.product_name,
                "variant": item.variant_name,
                "quantity": item.quantity,
                "unitPrice": item.unit_price,
                "lineTotal": item.line_total,
            }
            for item in order.items
        ],
        "nextStatuses": VALID_TRANSITIONS.get(order.status, []),
    }

    if for_shop:
        customer = order.customer
        user = customer.user if customer else None
        payload["customer"] = {
            "name": user.name if user else "Customer",
            # The runner needs a number to call when they cannot find the house.
            "mobile": user.mobile if user else None,
            "address": order.delivery_address,
            "landmark": order.delivery_landmark,
        }
    else:
        shop = order.retailer
        payload["shop"] = {"id": shop.id, "name": shop.business_name} if shop else None

    return payload
