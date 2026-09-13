"""Sourcing a shopping list across the whole local distributor network."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_retailer, get_db
from app.models.profiles import RetailerProfile
from app.modules.orders import schemas as order_schemas
from app.modules.orders import service as order_service
from app.modules.procurement import service

router = APIRouter(prefix="/procurement", tags=["procurement"])


class BasketLine(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)


class BasketIn(BaseModel):
    items: List[BasketLine] = Field(min_length=1)


class PlaceSplitIn(BaseModel):
    """A priced plan, sent back to be turned into real orders."""
    items: List[BasketLine] = Field(min_length=1)
    notes: Optional[str] = None
    # "split" buys each line from whoever is cheapest; "single" buys the whole
    # list from the one supplier who can cover it. Both are offered because one
    # delivery and one relationship is worth something the cheapest price is not.
    mode: str = Field(default="split", pattern="^(split|single)$")


@router.post("/optimise", summary="Price a shopping list across every local supplier")
def optimise_basket(
    payload: BasketIn,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """The cheapest split, the best single supplier, and the gap between them.

    Answers "who should I buy this from" in one request instead of a morning
    spent on the phone to four distributors.
    """
    return service.optimise(
        db, retailer, [line.model_dump() for line in payload.items]
    )


@router.get("/auto-basket", summary="Price what the shop needs, without a list")
def auto_basket(
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Builds the list from the shelf and the area, then sources it.

    Running low plus what nearby shops are asked for and cannot supply, priced
    across the network - the whole loop in one call.
    """
    return service.auto_basket(db, retailer)


@router.post("/place-split", status_code=201, summary="Turn a priced plan into orders")
def place_split(
    payload: PlaceSplitIn,
    db: Session = Depends(get_db),
    retailer: RetailerProfile = Depends(get_current_retailer),
):
    """Places one wholesale order per supplier in the optimised plan.

    Re-optimised here rather than trusting a plan posted back by the client:
    prices and stock move between quoting and ordering, and a client-supplied
    allocation is also a client-supplied price.
    """
    plan = service.optimise(db, retailer, [line.model_dump() for line in payload.items])

    if payload.mode == "single":
        single = plan["singleSupplier"]
        if not single or not single["coversWholeList"]:
            raise HTTPException(
                status_code=400,
                detail="Koi ek supplier poori list nahi de sakta.",
            )
        groups = [{
            "distributorId": single["distributorId"],
            "distributorName": single["distributorName"],
            "items": single["items"],
        }]
    else:
        groups = plan["split"]["groups"]

    if not groups:
        raise HTTPException(
            status_code=400,
            detail=plan["recommendation"] or "Is list ke liye koi supplier nahi mila.",
        )

    placed, failed = [], []
    for group in groups:
        order_in = order_schemas.OrderCreate(
            retailer_id=retailer.id,
            distributor_id=group["distributorId"],
            items=[
                order_schemas.OrderItemCreate(
                    catalogue_item_id=item["catalogueItemId"],
                    quantity=item["quantity"],
                )
                for item in group["items"]
            ],
            notes=payload.notes or "NEXGram ne sabse saste supplier chune",
        )
        try:
            order = order_service.create_order(db, order_in)
            placed.append({
                "orderId": order["id"],
                "orderNumber": order["order_number"],
                "distributorName": group["distributorName"],
                "total": order["total"],
            })
        except HTTPException as exc:
            # One supplier being out of stock must not lose the others: the
            # orders that did go through are real.
            failed.append({
                "distributorName": group["distributorName"],
                "reason": exc.detail,
            })

    return {
        "placed": placed,
        "failed": failed,
        "ordersPlaced": len(placed),
        "totalValue": round(sum(p["total"] for p in placed), 2),
    }
