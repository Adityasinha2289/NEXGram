from pydantic import BaseModel, Field
from typing import Optional, List
from app.modules.products.schemas import ProductVariantSchema

class LocationSchema(BaseModel):
    state: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    area: Optional[str] = None
    pincode: Optional[str] = None

    class Config:
        from_attributes = True

class DistributorResponse(BaseModel):
    id: str
    business_name: str
    business_category: Optional[str]
    service_radius: Optional[str]
    delivery_capabilities: Optional[List[str]] = None
    minimum_order_range: Optional[str] = None
    verification_status: str
    location: Optional[LocationSchema] = None

    class Config:
        from_attributes = True

class DistributorCatalogueItemResponse(BaseModel):
    id: str
    product_id: str
    product_variant_id: str
    
    product_name: str # Flattened for UI
    variant_name: str # Flattened for UI
    brand: Optional[str] # Flattened
    category_slug: Optional[str] # Flattened
    
    selling_price: float
    minimum_order_quantity: int
    available_stock: int
    stock_status: str
    delivery_time: Optional[str]
    is_available: bool

    class Config:
        from_attributes = True


class CatalogueItemCreate(BaseModel):
    product_variant_id: str
    selling_price: float = Field(ge=0)
    minimum_order_quantity: int = Field(default=1, ge=1)
    available_stock: int = Field(default=0, ge=0)
    delivery_time: Optional[str] = None


class CatalogueItemUpdate(BaseModel):
    selling_price: Optional[float] = Field(default=None, ge=0)
    minimum_order_quantity: Optional[int] = Field(default=None, ge=1)
    available_stock: Optional[int] = Field(default=None, ge=0)
    delivery_time: Optional[str] = None
    is_available: Optional[bool] = None
