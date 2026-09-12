from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Integer, func, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    state = Column(String, nullable=True)
    district = Column(String, index=True, nullable=True)
    block = Column(String, nullable=True)
    area = Column(String, nullable=True)
    village_town_city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RetailerProfile(Base):
    __tablename__ = "retailer_profiles"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=True)
    
    business_name = Column(String, nullable=False)
    business_type = Column(String, nullable=True)
    business_age = Column(String, nullable=True)
    monthly_sales_range = Column(String, nullable=True)
    investment_budget = Column(String, nullable=True)
    customer_volume = Column(String, nullable=True)
    purchase_frequency = Column(String, nullable=True)
    existing_supplier_type = Column(String, nullable=True)
    
    # JSON arrays/objects
    demanded_categories = Column(JSON, nullable=True)
    unmet_needs = Column(JSON, nullable=True) # { categories: [], other: '' }
    requirements = Column(JSON, nullable=True) # array of strings
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", backref="retailer_profile")
    location = relationship("Location")

class DistributorProfile(Base):
    __tablename__ = "distributor_profiles"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=True)
    
    business_name = Column(String, nullable=False)
    business_category = Column(String, nullable=True)
    service_radius = Column(String, nullable=True)
    custom_radius = Column(String, nullable=True)
    minimum_order_range = Column(String, nullable=True) # string from form
    custom_min_order = Column(String, nullable=True)
    retailer_coverage = Column(String, nullable=True)
    verification_status = Column(String, default="pending") # pending, verified, rejected
    
    # JSON arrays/objects
    product_categories = Column(JSON, nullable=True)
    delivery_capabilities = Column(JSON, nullable=True)
    stock_capacity = Column(JSON, nullable=True) # { level: '', customDescription: '' }
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    user = relationship("User", backref="distributor_profile")
    location = relationship("Location")
