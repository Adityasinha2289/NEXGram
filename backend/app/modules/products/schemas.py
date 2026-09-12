from pydantic import BaseModel
from typing import Optional, List
from app.modules.categories.schemas import CategoryResponse

class ProductVariantSchema(BaseModel):
    id: str
    variant_name: str
    pack_size: Optional[str]
    unit: Optional[str]
    barcode: Optional[str]

    class Config:
        from_attributes = True

class ProductResponse(BaseModel):
    id: str
    canonical_name: str
    normalized_name: str
    brand: Optional[str]
    description: Optional[str]
    product_type: Optional[str]
    category: Optional[CategoryResponse] = None
    variants: List[ProductVariantSchema] = []

    class Config:
        from_attributes = True

class SupplierOfferSchema(BaseModel):
    id: str
    distributor_id: str
    distributor_name: str
    distributor_location: Optional[str]
    variant_id: str
    variant_name: str
    pack_size: Optional[str]
    price: float
    moq: int
    stock: int
    stock_status: str
    delivery_time: Optional[str]

    class Config:
        from_attributes = True

class ProductWithSuppliersResponse(ProductResponse):
    offers: List[SupplierOfferSchema] = []
