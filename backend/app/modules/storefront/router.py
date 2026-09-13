"""The consumer storefront and the shop's delivery desk.

Two audiences on one set of tables: a household browsing nearby shops, and the
shopkeeper working through the orders that arrive.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_retailer, get_current_user, get_db
from app.models.profiles import RetailerProfile
from app.models.retail import ConsumerOrder, CustomerProfile, DeliveryRunner
from app.models.users import User
from app.modules.storefront import service

router = APIRouter(prefix="/storefront", tags=["storefront"])


def get_current_customer(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CustomerProfile:
    """The signed-in household.

    Created on demand rather than only at registration, so an account that
    predates the storefront can still order without a migration touching user
    rows.
    """
    if current_user.role != "customer":
        raise HTTPException(status_code=403, detail="Yeh sirf customers ke liye hai")
    profile = db.query(CustomerProfile).filter(CustomerProfile.user_id == current_user.id).first()
    if not profile:
        profile = CustomerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


class CustomerUpdate(BaseModel):
    address_line: Optional[str] = None
    landmark: Optional[str] = None
    latitude: Optional[float] = Field(default=None, ge=-90, le=90)
    longitude: Optional[float] = Field(default=None, ge=-180, le=180)
    location_id: Optional[str] = None


class OrderLine(BaseModel):
    inventory_id: str
    quantity: int = Field(gt=0)


class OrderIn(BaseModel):
    shop_id: str
    items: List[OrderLine] = Field(min_length=1)
    note: Optional[str] = None


class StatusIn(BaseModel):
    status: str
    runner_id: Optional[str] = None
    reason: Optional[str] = None


class RunnerIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    mobile: Optional[str] = None
    mode: str = Field(default="cycle", pattern="^(walk|cycle)$")


# --------------------------------------------------------------------------
# Customer side
# --------------------------------------------------------------------------

@router.get("/me", summary="The signed-in household")
def read_me(customer: CustomerProfile = Depends(get_current_customer)):
    return {
        "id": customer.id,
        "addressLine": customer.address_line,
        "landmark": customer.landmark,
        "latitude": customer.latitude,
        "longitude": customer.longitude,
        "locationId": customer.location_id,
    }


@router.patch("/me", summary="Set the delivery address")
def update_me(
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    customer: CustomerProfile = Depends(get_current_customer),
):
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(customer, field, value)
    db.commit()
    db.refresh(customer)
    return read_me(customer)


@router.get("/shops", summary="Shops close enough to deliver to you")
def nearby_shops(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    customer: CustomerProfile = Depends(get_current_customer),
):
    """Bounded by what a delivery boy covers on foot or by cycle."""
    return service.nearby_shops(db, customer, search=search)


@router.get("/shops/{shop_id}", summary="What one shop has in stock right now")
def shop_catalogue(
    shop_id: str,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _customer: CustomerProfile = Depends(get_current_customer),
):
    return service.shop_catalogue(db, shop_id, search=search)


@router.post("/orders", status_code=201, summary="Order from a nearby shop")
def place_order(
    payload: OrderIn,
    db: Session = Depends(get_db),
    customer: CustomerProfile = Depends(get_current_customer),
):
    order = service.place_order(
        db, customer, payload.shop_id,
        [line.model_dump() for line in payload.items],
        note=payload.note,
    )
    return service.serialise_order(db, order)


@router.get("/orders", summary="Your orders")
def my_orders(
    db: Session = Depends(get_db),
    customer: CustomerProfile = Depends(get_current_customer),
):
    rows = db.query(ConsumerOrder).filter(
        ConsumerOrder.customer_id == customer.id
    ).order_by(ConsumerOrder.placed_at.desc()).all()
    return [service.serialise_order(db, row) for row in rows]


@router.get("/orders/{order_id}", summary="One of your orders")
def my_order(
    order_id: str,
    db: Session = Depends(get_db),
    customer: CustomerProfile = Depends(get_current_customer),
):
    order = db.query(ConsumerOrder).filter(
        ConsumerOrder.id == order_id,
        ConsumerOrder.customer_id == customer.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Yeh order nahi mila")
    return service.serialise_order(db, order)


@router.post("/orders/{order_id}/cancel", summary="Cancel before it is on its way")
def cancel_order(
    order_id: str,
    db: Session = Depends(get_db),
    customer: CustomerProfile = Depends(get_current_customer),
):
    """A customer may call an order back until the runner leaves.

    Once it is out for delivery someone is already on a bicycle with the goods,
    so the shop handles it rather than the app.
    """
    order = db.query(ConsumerOrder).filter(
        ConsumerOrder.id == order_id,
        ConsumerOrder.customer_id == customer.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Yeh order nahi mila")
    if order.status not in {"placed", "accepted"}:
        raise HTTPException(
            status_code=400,
            detail="Yeh order ab cancel nahi ho sakta - dukaan se baat karein.",
        )
    order = service.update_status(db, order, "cancelled", reason="Customer ne cancel kiya")
    return service.serialise_order(db, order)


# --------------------------------------------------------------------------
# Shop side
# --------------------------------------------------------------------------

@router.get("/shop/orders", summary="Orders waiting on your shop")
def shop_orders(
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    query = db.query(ConsumerOrder).filter(ConsumerOrder.retailer_id == retailer.id)
    if status:
        query = query.filter(ConsumerOrder.status == status)
    rows = query.order_by(ConsumerOrder.placed_at.desc()).all()
    return [service.serialise_order(db, row, for_shop=True) for row in rows]


@router.patch("/shop/orders/{order_id}/status", summary="Accept, dispatch or close an order")
def update_order_status(
    order_id: str,
    payload: StatusIn,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Accepting commits the stock; cancelling after that returns it."""
    order = db.query(ConsumerOrder).filter(
        ConsumerOrder.id == order_id,
        ConsumerOrder.retailer_id == retailer.id,
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Yeh order aapki dukaan ka nahi hai")

    order = service.update_status(
        db, order, payload.status, runner_id=payload.runner_id, reason=payload.reason,
    )
    return service.serialise_order(db, order, for_shop=True)


@router.get("/shop/runners", summary="Your delivery people")
def list_runners(
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    rows = db.query(DeliveryRunner).filter(
        DeliveryRunner.retailer_id == retailer.id
    ).order_by(DeliveryRunner.name).all()
    return [
        {"id": r.id, "name": r.name, "mobile": r.mobile, "mode": r.mode, "isActive": r.is_active}
        for r in rows
    ]


@router.post("/shop/runners", status_code=201, summary="Add a delivery person")
def add_runner(
    payload: RunnerIn,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    runner = DeliveryRunner(
        retailer_id=retailer.id,
        name=payload.name.strip(),
        mobile=payload.mobile,
        mode=payload.mode,
    )
    db.add(runner)
    db.commit()
    db.refresh(runner)
    return {
        "id": runner.id, "name": runner.name, "mobile": runner.mobile,
        "mode": runner.mode, "isActive": runner.is_active,
    }


@router.delete("/shop/runners/{runner_id}", status_code=204, summary="Retire a delivery person")
def remove_runner(
    runner_id: str,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Deactivated, not deleted: past orders still reference who delivered them."""
    runner = db.query(DeliveryRunner).filter(
        DeliveryRunner.id == runner_id,
        DeliveryRunner.retailer_id == retailer.id,
    ).first()
    if not runner:
        raise HTTPException(status_code=404, detail="Yeh delivery person nahi mila")
    runner.is_active = False
    db.commit()
