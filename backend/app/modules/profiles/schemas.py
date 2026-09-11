from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any

class LocationBase(BaseModel):
    area: Optional[str] = None
    block: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pin: Optional[str] = None

class RetailerProfileUpdate(BaseModel):
    name: Optional[str] = None # User name
    mobile: Optional[str] = None # User mobile
    business_name: Optional[str] = None
    location: Optional[LocationBase] = None
    business_type: Optional[str] = None
    demanded_categories: Optional[List[str]] = None
    unmet_needs: Optional[Dict[str, Any]] = None
    monthly_sales_range: Optional[str] = None
    purchase_frequency: Optional[str] = None
    investment_budget: Optional[str] = None
    requirements: Optional[List[str]] = None
    existing_supplier_type: Optional[str] = None

class DistributorProfileUpdate(BaseModel):
    contact_name: Optional[str] = None # User name
    mobile: Optional[str] = None # User mobile
    business_name: Optional[str] = None
    business_category: Optional[str] = None
    location: Optional[LocationBase] = None
    service_radius: Optional[str] = None
    custom_radius: Optional[str] = None
    product_categories: Optional[List[str]] = None
    delivery_capabilities: Optional[List[str]] = None
    minimum_order_range: Optional[str] = None
    custom_min_order: Optional[str] = None
    stock_capacity: Optional[Dict[str, Any]] = None
    retailer_coverage: Optional[str] = None

class ProfileCompletenessResponse(BaseModel):
    profile_complete: bool
    missing_fields: List[str]

class ProfileResponse(BaseModel):
    id: str
    role: str
    name: str
    mobile: str
    email: Optional[str] = None
    profile_complete: bool
    missing_fields: List[str]
    profile_data: Dict[str, Any]

    model_config = ConfigDict(from_attributes=True)
