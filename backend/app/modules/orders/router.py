from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.core.database import get_db
from app.api.deps import get_current_user, get_current_retailer, get_current_distributor
from app.models.users import User
from app.models.profiles import RetailerProfile, DistributorProfile
from app.schemas import PaginatedResponse
from app.modules.orders import schemas, service

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("", response_model=schemas.OrderDetail, status_code=201)
def create_order(
    order_in: schemas.OrderCreate, 
    db: Session = Depends(get_db),
    current_retailer: RetailerProfile = Depends(get_current_retailer)
):
    """
    Create a new procurement order. Only Retailers can create orders.
    Overrides retailer_id in payload with authenticated retailer_id.
    """
    order_in.retailer_id = current_retailer.id
    return service.create_order(db, order_in)

@router.get("", response_model=PaginatedResponse[schemas.OrderSummary])
def get_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get orders belonging to the authenticated user.
    """
    skip = (page - 1) * page_size
    retailer_id = None
    distributor_id = None
    
    if current_user.role == "retailer":
        profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=403, detail="Profile not complete")
        retailer_id = profile.id
    elif current_user.role == "distributor":
        profile = db.query(DistributorProfile).filter(DistributorProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=403, detail="Profile not complete")
        distributor_id = profile.id
    else:
        # Admin can view all, so we leave retailer_id and distributor_id as None
        pass

    orders, total = service.get_orders(db, skip=skip, limit=page_size, retailer_id=retailer_id, distributor_id=distributor_id)
    
    return {
        "items": orders,
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_next": (skip + page_size) < total
    }

@router.get("/{order_id}", response_model=schemas.OrderDetail)
def get_order_detail(
    order_id: str, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = service.get_order_detail(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Authorization Check
    if current_user.role == "retailer":
        profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
        if order["retailer_id"] != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
    elif current_user.role == "distributor":
        profile = db.query(DistributorProfile).filter(DistributorProfile.user_id == current_user.id).first()
        if order["distributor_id"] != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
            
    return order

@router.patch("/{order_id}/status", response_model=schemas.OrderDetail)
def update_order_status(
    order_id: str, 
    update_in: schemas.OrderStatusUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update order status. Handles stock deduction on 'accepted' and stock rollback on 'cancelled'/'rejected'.
    """
    order = service.get_order_detail(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    # Authorization & Validations
    if current_user.role == "retailer":
        profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
        if order["retailer_id"] != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this order")
        # Retailer can only cancel
        if update_in.status != "cancelled":
            raise HTTPException(status_code=403, detail="Retailers can only cancel orders")
            
    elif current_user.role == "distributor":
        profile = db.query(DistributorProfile).filter(DistributorProfile.user_id == current_user.id).first()
        if order["distributor_id"] != profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this order")
    else:
        raise HTTPException(status_code=403, detail="Not authorized to perform this action")

    update_in.changed_by = current_user.id
    return service.update_order_status(db, order_id, update_in)

