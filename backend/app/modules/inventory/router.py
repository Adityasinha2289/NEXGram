"""Shop inventory: the shelf, the ledger, and the microphone."""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_retailer, get_db
from app.models.profiles import RetailerProfile
from app.modules.inventory import restock, service, voice

router = APIRouter(prefix="/inventory", tags=["inventory"])


class StockIn(BaseModel):
    product_variant_id: str
    quantity: int = Field(gt=0)
    unit_cost: Optional[float] = Field(default=None, ge=0)
    selling_price: Optional[float] = Field(default=None, ge=0)
    expires_on: Optional[date] = None
    shelf_life_days: Optional[int] = Field(default=None, ge=1)
    reorder_level: Optional[int] = Field(default=None, ge=0)


class InventoryUpdate(BaseModel):
    selling_price: Optional[float] = Field(default=None, ge=0)
    unit_cost: Optional[float] = Field(default=None, ge=0)
    reorder_level: Optional[int] = Field(default=None, ge=0)
    shelf_life_days: Optional[int] = Field(default=None, ge=1)
    is_listed_online: Optional[bool] = None


class StockAdjust(BaseModel):
    quantity: int = Field(ge=0)
    note: Optional[str] = None


class CounterSale(BaseModel):
    inventory_id: str
    quantity: int = Field(gt=0)


class VoiceSale(BaseModel):
    transcript: str = Field(min_length=1, max_length=500)
    # Maps a heard phrase to the row the shopkeeper tapped, for lines the
    # matcher was not sure enough about to apply on its own.
    confirmations: Optional[dict] = None


@router.get("", summary="What is on the shelf")
def list_inventory(
    search: Optional[str] = None,
    low_stock_only: bool = False,
    expiring_only: bool = False,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    return service.list_inventory(
        db, retailer.id, search=search,
        low_stock_only=low_stock_only, expiring_only=expiring_only,
    )


@router.post("", status_code=201, summary="Receive stock onto the shelf")
def receive_stock(
    payload: StockIn,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Adds a dated batch, creating the shelf row on first receipt."""
    row = service.add_stock(
        db, retailer,
        product_variant_id=payload.product_variant_id,
        quantity=payload.quantity,
        unit_cost=payload.unit_cost,
        selling_price=payload.selling_price,
        expires_on=payload.expires_on,
        shelf_life_days=payload.shelf_life_days,
        reorder_level=payload.reorder_level,
    )
    return service.serialise(db, row)


@router.get("/movements", summary="The stock ledger")
def stock_movements(
    limit: int = Query(50, ge=1, le=200),
    inventory_id: Optional[str] = None,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    return service.movements(db, retailer.id, limit=limit, inventory_id=inventory_id)


@router.get("/restock-plan", summary="What to buy next, and why")
def restock_plan(
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Running low, about to expire, and what the area wants that you lack."""
    return restock.build_restock_plan(db, retailer)


@router.post("/write-off-expired", summary="Clear expired stock off the shelf")
def write_off_expired(
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    return service.write_off_expired(db, retailer)


@router.post("/voice-sale/preview", summary="Read a spoken sale without applying it")
def preview_voice_sale(
    payload: VoiceSale,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """What the sentence was understood to mean, changing nothing.

    Used to show the shopkeeper what will happen before it happens, and to
    debug a mis-heard product without spending stock to find out.
    """
    return voice.interpret(db, retailer, payload.transcript)


@router.post("/voice-sale", summary="Record a sale heard at the counter")
def voice_sale(
    payload: VoiceSale,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Deducts what it is sure of, and returns the rest for a tap.

    A line it cannot place confidently is never guessed at: phantom deductions
    are how a shopkeeper stops trusting their own stock count.
    """
    return voice.apply_sale(
        db, retailer, payload.transcript, confirmations=payload.confirmations,
    )


@router.post("/counter-sale", summary="Record a sale typed at the counter")
def counter_sale(
    payload: CounterSale,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    row = service.get_inventory(db, retailer.id, payload.inventory_id)
    return service.consume_stock(
        db, row, payload.quantity, "sale_counter", unit_price=row.selling_price,
    )


@router.get("/{inventory_id}", summary="One shelf line")
def get_item(
    inventory_id: str,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    return service.serialise(db, service.get_inventory(db, retailer.id, inventory_id))


@router.patch("/{inventory_id}", summary="Update price, reorder level or listing")
def update_item(
    inventory_id: str,
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    row = service.get_inventory(db, retailer.id, inventory_id)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return service.serialise(db, row)


@router.post("/{inventory_id}/adjust", summary="Correct the count after a stock-take")
def adjust_item(
    inventory_id: str,
    payload: StockAdjust,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    row = service.get_inventory(db, retailer.id, inventory_id)
    return service.serialise(db, service.adjust_stock(db, row, payload.quantity, payload.note))
