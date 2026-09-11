from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, DateTime, func, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    parent_id = Column(String, ForeignKey("categories.id"), nullable=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    children = relationship("Category", backref="parent", remote_side=[id])
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    category_id = Column(String, ForeignKey("categories.id"))
    canonical_name = Column(String, nullable=False)
    normalized_name = Column(String, index=True, nullable=False)
    brand = Column(String, nullable=True)
    description = Column(String, nullable=True)
    product_type = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    category = relationship("Category", back_populates="products")
    variants = relationship("ProductVariant", back_populates="product")

class ProductVariant(Base):
    __tablename__ = "product_variants"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    variant_name = Column(String, nullable=False)
    pack_size = Column(String, nullable=True)
    unit = Column(String, nullable=True)
    barcode = Column(String, nullable=True, unique=True, index=True)
    normalized_identifier = Column(String, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    product = relationship("Product", back_populates="variants")
    catalogue_items = relationship("DistributorCatalogueItem", back_populates="variant")

class DistributorCatalogueItem(Base):
    __tablename__ = "distributor_catalogue_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    distributor_id = Column(String, ForeignKey("distributor_profiles.id"), index=True, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), index=True, nullable=False)
    product_variant_id = Column(String, ForeignKey("product_variants.id"), index=True, nullable=False)
    distributor_sku = Column(String, nullable=True)
    
    selling_price = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    minimum_order_quantity = Column(Integer, default=1)
    available_stock = Column(Integer, default=0)
    stock_status = Column(String, default="available") # available, low_stock, out_of_stock
    delivery_time = Column(String, nullable=True)
    
    is_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    variant = relationship("ProductVariant", back_populates="catalogue_items")
    product = relationship("Product")
    distributor = relationship("DistributorProfile")

    __table_args__ = (
        CheckConstraint('selling_price >= 0', name='check_selling_price_positive'),
        CheckConstraint('minimum_order_quantity >= 0', name='check_moq_positive'),
        CheckConstraint('available_stock >= 0', name='check_stock_positive'),
    )
