from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class OrderItemCreate(BaseModel):
    catalogue_item_id: str
    quantity: int = Field(gt=0)

class OrderCreate(BaseModel):
    retailer_id: str
    distributor_id: str
    items: List[OrderItemCreate] = Field(min_length=1)
    notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None
    changed_by: Optional[str] = None  # Temporary until real auth

class OrderItemResponse(BaseModel):
    id: str
    catalogue_item_id: str
    product_name: str
    variant_name: str
    quantity: int
    unit_price: float
    line_total: float

    class Config:
        from_attributes = True

class OrderStatusHistoryResponse(BaseModel):
    id: str
    previous_status: Optional[str]
    new_status: str
    changed_by: Optional[str]
    reason: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class OrderSummary(BaseModel):
    id: str
    order_number: str
    retailer_id: str
    distributor_id: str
    retailer_name: str
    distributor_name: str
    status: str
    item_count: int
    subtotal: float
    total: float
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class OrderDetail(OrderSummary):
    notes: Optional[str]
    accepted_at: Optional[datetime]
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    items: List[OrderItemResponse]
    history: List[OrderStatusHistoryResponse]

    class Config:
        from_attributes = True
