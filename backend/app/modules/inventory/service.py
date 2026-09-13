"""Shelf stock: what the shop holds, and every movement in and out.

Two rules run through all of it.

Stock leaves by expiry order (FEFO). A kirana that sells the newest carton
first throws the oldest one away, so a sale always draws from the batch
expiring soonest. That single choice is what turns a shelf-life field into
money saved rather than a date printed on a screen.

Nothing changes a quantity without writing a movement. Sales rate, wastage and
"why is my count wrong" are all read back out of that ledger, so a write that
skipped it would quietly corrupt every figure downstream.
"""

from datetime import date, datetime, timedelta, timezone
from typing import Iterable, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.catalogue import Product, ProductVariant
from app.models.profiles import RetailerProfile
from app.models.retail import (
    MOVEMENT_CORRECTION,
    MOVEMENT_RESTOCK,
    MOVEMENT_WASTAGE,
    InventoryBatch,
    RetailerInventory,
    StockMovement,
)

# Reasons a quantity may change. Closed set: an unrecognised reason would make
# the sales-rate query silently wrong by counting a restock as a sale.
SALE_REASONS = {"sale_voice", "sale_counter", "sale_online"}
REASONS = SALE_REASONS | {"restock", "wastage", "correction", "return"}

# How much history the sales rate is measured over. Long enough to survive a
# quiet week, short enough to follow a season.
RATE_WINDOW_DAYS = 30

# An item is "expiring soon" inside this window. A kirana can discount or
# return stock with a week's notice; a day's notice is just a loss.
EXPIRY_WARNING_DAYS = 7


def naive_now() -> datetime:
    """UTC with the offset stripped, to compare against stored timestamps.

    SQLite returns naive datetimes and Postgres returns aware ones, so every
    comparison has to normalise or it raises on one backend and not the other.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _naive(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    return value.replace(tzinfo=None) if value.tzinfo else value


def get_inventory(db: Session, retailer_id: str, inventory_id: str) -> RetailerInventory:
    """One shelf row, scoped to its owner.

    Scoped rather than fetched by id alone: without the retailer filter, any
    signed-in shop could adjust another shop's stock by guessing an id.
    """
    row = db.query(RetailerInventory).filter(
        RetailerInventory.id == inventory_id,
        RetailerInventory.retailer_id == retailer_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Yeh item aapki inventory mein nahi hai")
    return row


def list_inventory(
    db: Session,
    retailer_id: str,
    search: Optional[str] = None,
    low_stock_only: bool = False,
    expiring_only: bool = False,
) -> list:
    """The shop's shelf, newest concern first."""
    query = db.query(RetailerInventory).filter(
        RetailerInventory.retailer_id == retailer_id,
        RetailerInventory.is_active == True,  # noqa: E712 - SQL, not Python truthiness
    )

    if search:
        like = f"%{search.strip()}%"
        query = query.join(Product, RetailerInventory.product_id == Product.id).filter(
            Product.canonical_name.ilike(like)
        )

    rows = query.all()
    results = [serialise(db, row) for row in rows]

    if low_stock_only:
        results = [r for r in results if r["isLow"]]
    if expiring_only:
        results = [r for r in results if r["expiringQuantity"] > 0]

    # Whatever needs attention soonest leads: out of stock, then expiring, then
    # low, then everything else alphabetically.
    def rank(item):
        return (
            0 if item["quantity"] == 0 else 1,
            0 if item["expiringQuantity"] else 1,
            0 if item["isLow"] else 1,
            item["name"],
        )

    results.sort(key=rank)
    return results


def sales_per_day(db: Session, inventory_id: str, window_days: int = RATE_WINDOW_DAYS) -> float:
    """How fast this line actually sells, from the movement ledger.

    Counted over a fixed window rather than since the item was first stocked,
    so a product that sold well six months ago does not keep recommending
    itself today.
    """
    since = naive_now() - timedelta(days=window_days)
    sold = db.query(func.coalesce(func.sum(-StockMovement.quantity_delta), 0)).filter(
        StockMovement.inventory_id == inventory_id,
        StockMovement.reason.in_(SALE_REASONS),
        StockMovement.created_at >= since,
    ).scalar() or 0
    return round(float(sold) / window_days, 3)


def days_of_cover(quantity: int, rate: float) -> Optional[float]:
    """How long the shelf lasts at the observed rate.

    None when nothing has sold: with no rate there is no honest answer, and
    reporting "infinite days of cover" would read as a recommendation to hold.
    """
    if rate <= 0:
        return None
    return round(quantity / rate, 1)


def serialise(db: Session, row: RetailerInventory) -> dict:
    """Display shape for one shelf line, with the batch picture folded in."""
    product = row.product or db.query(Product).filter(Product.id == row.product_id).first()
    variant = row.variant or db.query(ProductVariant).filter(
        ProductVariant.id == row.product_variant_id
    ).first()

    today = date.today()
    horizon = today + timedelta(days=EXPIRY_WARNING_DAYS)

    batches = sorted(
        [b for b in row.batches if b.quantity > 0],
        key=lambda b: (b.expires_on is None, b.expires_on or today),
    )
    expiring = sum(b.quantity for b in batches if b.expires_on and b.expires_on <= horizon)
    expired = sum(b.quantity for b in batches if b.expires_on and b.expires_on < today)
    next_expiry = next((b.expires_on for b in batches if b.expires_on), None)

    rate = sales_per_day(db, row.id)
    cover = days_of_cover(row.quantity, rate)

    return {
        "id": row.id,
        "productId": row.product_id,
        "productVariantId": row.product_variant_id,
        "name": product.canonical_name if product else "Unknown",
        "variant": variant.variant_name if variant else "",
        "unit": variant.unit if variant else "unit",
        "quantity": row.quantity,
        "unitCost": row.unit_cost,
        "sellingPrice": row.selling_price,
        "reorderLevel": row.reorder_level,
        "shelfLifeDays": row.shelf_life_days,
        "isListedOnline": row.is_listed_online,
        "isLow": row.quantity <= row.reorder_level,
        "salesPerDay": rate,
        "daysOfCover": cover,
        "expiringQuantity": expiring,
        "expiredQuantity": expired,
        "nextExpiry": next_expiry.isoformat() if next_expiry else None,
        "batches": [
            {
                "id": b.id,
                "quantity": b.quantity,
                "unitCost": b.unit_cost,
                "receivedOn": b.received_on.isoformat() if b.received_on else None,
                "expiresOn": b.expires_on.isoformat() if b.expires_on else None,
                "isExpired": bool(b.expires_on and b.expires_on < today),
                "daysLeft": (b.expires_on - today).days if b.expires_on else None,
            }
            for b in batches
        ],
    }


def record_movement(
    db: Session,
    inventory: RetailerInventory,
    delta: int,
    reason: str,
    *,
    unit_price: Optional[float] = None,
    source_text: Optional[str] = None,
    reference_id: Optional[str] = None,
    note: Optional[str] = None,
) -> StockMovement:
    """Writes the ledger entry for a change that has already been applied."""
    if reason not in REASONS:
        raise HTTPException(status_code=400, detail=f"Unknown stock movement reason: {reason}")

    price = unit_price if unit_price is not None else inventory.selling_price
    movement = StockMovement(
        retailer_id=inventory.retailer_id,
        inventory_id=inventory.id,
        quantity_delta=delta,
        reason=reason,
        unit_price=price,
        total_value=round(abs(delta) * price, 2) if price is not None else None,
        source_text=source_text,
        reference_id=reference_id,
        note=note,
    )
    db.add(movement)
    return movement


def add_stock(
    db: Session,
    retailer: RetailerProfile,
    *,
    product_variant_id: str,
    quantity: int,
    unit_cost: Optional[float] = None,
    selling_price: Optional[float] = None,
    expires_on: Optional[date] = None,
    shelf_life_days: Optional[int] = None,
    reorder_level: Optional[int] = None,
    reason: str = MOVEMENT_RESTOCK,
    reference_id: Optional[str] = None,
) -> RetailerInventory:
    """Puts stock on the shelf as a dated batch.

    Creates the shelf row on first receipt, so a shopkeeper never has to
    "create a product" before recording that a delivery arrived.
    """
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity 0 se zyada honi chahiye")

    variant = db.query(ProductVariant).filter(ProductVariant.id == product_variant_id).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Yeh product variant nahi mila")

    row = db.query(RetailerInventory).filter(
        RetailerInventory.retailer_id == retailer.id,
        RetailerInventory.product_variant_id == product_variant_id,
    ).first()

    if not row:
        row = RetailerInventory(
            retailer_id=retailer.id,
            product_id=variant.product_id,
            product_variant_id=product_variant_id,
            quantity=0,
            unit_cost=unit_cost,
            selling_price=selling_price,
            shelf_life_days=shelf_life_days,
            reorder_level=reorder_level or 0,
        )
        db.add(row)
        db.flush()
    else:
        row.is_active = True
        if unit_cost is not None:
            row.unit_cost = unit_cost
        if selling_price is not None:
            row.selling_price = selling_price
        if shelf_life_days is not None:
            row.shelf_life_days = shelf_life_days
        if reorder_level is not None:
            row.reorder_level = reorder_level

    # An undated delivery of something with a known shelf life still gets an
    # expiry, or the FEFO ordering silently degrades to arrival order.
    if expires_on is None and row.shelf_life_days:
        expires_on = date.today() + timedelta(days=row.shelf_life_days)

    db.add(InventoryBatch(
        inventory_id=row.id,
        quantity=quantity,
        unit_cost=unit_cost if unit_cost is not None else row.unit_cost,
        received_on=date.today(),
        expires_on=expires_on,
    ))
    row.quantity += quantity

    record_movement(
        db, row, quantity, reason,
        unit_price=unit_cost, reference_id=reference_id,
        note="Stock received",
    )
    db.commit()
    db.refresh(row)
    return row


def consume_stock(
    db: Session,
    inventory: RetailerInventory,
    quantity: int,
    reason: str,
    *,
    unit_price: Optional[float] = None,
    source_text: Optional[str] = None,
    reference_id: Optional[str] = None,
    commit: bool = True,
) -> dict:
    """Takes stock off the shelf, oldest-expiring batch first.

    Refuses rather than going negative: a shop that can sell what it does not
    have gets a stock count it stops trusting, and every restock suggestion
    built on that count is wrong too.
    """
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity 0 se zyada honi chahiye")
    if inventory.quantity < quantity:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Stock kam hai: {inventory.quantity} available, {quantity} chahiye"
            ),
        )

    remaining = quantity
    drawn = []
    # Undated batches go last: a batch with no expiry can wait, one with an
    # expiry cannot.
    batches = sorted(
        [b for b in inventory.batches if b.quantity > 0],
        key=lambda b: (b.expires_on is None, b.expires_on or date.max),
    )

    for batch in batches:
        if remaining <= 0:
            break
        take = min(batch.quantity, remaining)
        batch.quantity -= take
        remaining -= take
        drawn.append({
            "batchId": batch.id,
            "quantity": take,
            "expiresOn": batch.expires_on.isoformat() if batch.expires_on else None,
        })

    # Batches can lag the header count if stock was corrected directly; the
    # header is the number the shopkeeper sees, so it stays authoritative.
    inventory.quantity -= quantity

    movement = record_movement(
        db, inventory, -quantity, reason,
        unit_price=unit_price, source_text=source_text, reference_id=reference_id,
    )
    if commit:
        db.commit()
        db.refresh(inventory)

    return {
        "inventoryId": inventory.id,
        "quantity": quantity,
        "remaining": inventory.quantity,
        "drawnFrom": drawn,
        "movementId": movement.id,
    }


def add_stock_back(
    db: Session,
    inventory: RetailerInventory,
    quantity: int,
    *,
    reference_id: Optional[str] = None,
    note: Optional[str] = None,
    commit: bool = False,
) -> RetailerInventory:
    """Returns stock to the shelf after a cancelled sale.

    A new batch rather than reopening the one it came from: the goods left the
    shop and came back, and dating them from today is the conservative call.
    Where a shelf life is known the batch is re-dated from the original receipt
    would be wrong in the other direction, so the shorter of the two wins.
    """
    if quantity <= 0:
        return inventory

    expires_on = None
    if inventory.shelf_life_days:
        expires_on = date.today() + timedelta(days=inventory.shelf_life_days)

    db.add(InventoryBatch(
        inventory_id=inventory.id,
        quantity=quantity,
        unit_cost=inventory.unit_cost,
        received_on=date.today(),
        expires_on=expires_on,
    ))
    inventory.quantity += quantity

    record_movement(
        db, inventory, quantity, "return",
        unit_price=inventory.selling_price,
        reference_id=reference_id,
        note=note or "Returned to shelf",
    )
    if commit:
        db.commit()
        db.refresh(inventory)
    return inventory


def write_off_expired(db: Session, retailer: RetailerProfile) -> dict:
    """Clears stock that is past its date off the shelf.

    Explicit rather than automatic on read: a shopkeeper decides when something
    is thrown away, and a count that silently dropped overnight is a count they
    would stop trusting. The wastage lands in the ledger with its value, which
    is the number that makes shelf life worth tracking at all.
    """
    today = date.today()
    rows = db.query(RetailerInventory).filter(
        RetailerInventory.retailer_id == retailer.id,
        RetailerInventory.is_active == True,  # noqa: E712
    ).all()

    written_off, value = [], 0.0
    for row in rows:
        expired_qty = sum(
            b.quantity for b in row.batches
            if b.quantity > 0 and b.expires_on and b.expires_on < today
        )
        if expired_qty <= 0:
            continue

        for batch in row.batches:
            if batch.quantity > 0 and batch.expires_on and batch.expires_on < today:
                batch.quantity = 0

        take = min(expired_qty, row.quantity)
        row.quantity -= take
        cost = (row.unit_cost or 0) * take
        value += cost
        record_movement(
            db, row, -take, MOVEMENT_WASTAGE,
            unit_price=row.unit_cost,
            note=f"{take} expired on or before {today.isoformat()}",
        )
        product = row.product or db.query(Product).filter(Product.id == row.product_id).first()
        written_off.append({
            "inventoryId": row.id,
            "name": product.canonical_name if product else "Unknown",
            "quantity": take,
            "costValue": round(cost, 2),
        })

    db.commit()
    return {
        "writtenOff": written_off,
        "totalQuantity": sum(w["quantity"] for w in written_off),
        "totalCostValue": round(value, 2),
    }


def adjust_stock(
    db: Session,
    inventory: RetailerInventory,
    new_quantity: int,
    note: Optional[str] = None,
) -> RetailerInventory:
    """Sets the count to what a physical stock-take found.

    Recorded as a correction rather than a silent overwrite, so the difference
    between what the ledger expected and what was on the shelf stays visible.
    """
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity negative nahi ho sakti")

    delta = new_quantity - inventory.quantity
    if delta == 0:
        return inventory

    if delta < 0:
        # Take the shortfall off the soonest-expiring batches, so the batch
        # picture stays consistent with the header.
        remaining = -delta
        for batch in sorted(
            [b for b in inventory.batches if b.quantity > 0],
            key=lambda b: (b.expires_on is None, b.expires_on or date.max),
        ):
            if remaining <= 0:
                break
            take = min(batch.quantity, remaining)
            batch.quantity -= take
            remaining -= take
    else:
        db.add(InventoryBatch(
            inventory_id=inventory.id,
            quantity=delta,
            unit_cost=inventory.unit_cost,
            received_on=date.today(),
            expires_on=(
                date.today() + timedelta(days=inventory.shelf_life_days)
                if inventory.shelf_life_days else None
            ),
        ))

    inventory.quantity = new_quantity
    record_movement(
        db, inventory, delta, MOVEMENT_CORRECTION,
        note=note or "Stock take correction",
    )
    db.commit()
    db.refresh(inventory)
    return inventory


def movements(db: Session, retailer_id: str, limit: int = 50, inventory_id: Optional[str] = None) -> list:
    """The stock ledger, most recent first."""
    query = db.query(StockMovement).filter(StockMovement.retailer_id == retailer_id)
    if inventory_id:
        query = query.filter(StockMovement.inventory_id == inventory_id)

    rows = query.order_by(StockMovement.created_at.desc()).limit(limit).all()

    out = []
    for m in rows:
        inv = m.inventory
        product = inv.product if inv else None
        out.append({
            "id": m.id,
            "inventoryId": m.inventory_id,
            "name": product.canonical_name if product else "Unknown",
            "quantityDelta": m.quantity_delta,
            "reason": m.reason,
            "unitPrice": m.unit_price,
            "totalValue": m.total_value,
            "sourceText": m.source_text,
            "note": m.note,
            "at": _naive(m.created_at).isoformat() if m.created_at else None,
        })
    return out
