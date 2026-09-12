from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Index, func, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid

class RetailerDistributorRelationship(Base):
    __tablename__ = "retailer_distributor_relationships"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    retailer_id = Column(String, ForeignKey("retailer_profiles.id"), index=True, nullable=False)
    distributor_id = Column(String, ForeignKey("distributor_profiles.id"), index=True, nullable=False)
    
    status = Column(String, default="active") # discovered, contacted, active, inactive, blocked
    is_preferred = Column(Integer, default=0) # SQLite Boolean sometimes weird, but using integer or boolean
    
    first_order_at = Column(DateTime(timezone=True), nullable=True)
    last_order_at = Column(DateTime(timezone=True), nullable=True)
    total_orders = Column(Integer, default=0)
    total_value = Column(Float, default=0.0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    retailer = relationship("RetailerProfile")
    distributor = relationship("DistributorProfile")

class Order(Base):
    __tablename__ = "orders"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    retailer_id = Column(String, ForeignKey("retailer_profiles.id"), index=True, nullable=False)
    distributor_id = Column(String, ForeignKey("distributor_profiles.id"), index=True, nullable=False)
    
    order_number = Column(String, unique=True, index=True)
    status = Column(String, default="draft", index=True) # draft, requested, accepted, preparing, ready, completed, cancelled, rejected
    
    subtotal = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    notes = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_orders_retailer_status", "retailer_id", "status"),
    )

class OrderItem(Base):
    __tablename__ = "order_items"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), index=True, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    product_variant_id = Column(String, ForeignKey("product_variants.id"), nullable=False)
    catalogue_item_id = Column(String, ForeignKey("distributor_catalogue_items.id"), nullable=False)
    
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False) # MUST BE SNAPSHOTTED
    line_total = Column(Float, nullable=False)
    
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
    variant = relationship("ProductVariant")
    catalogue_item = relationship("DistributorCatalogueItem")

    __table_args__ = (
        CheckConstraint('quantity > 0', name='check_order_quantity_positive'),
        CheckConstraint('unit_price >= 0', name='check_unit_price_positive'),
    )

class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = Column(String, ForeignKey("orders.id"), index=True, nullable=False)
    previous_status = Column(String, nullable=True)
    new_status = Column(String, nullable=False)
    changed_by = Column(String, ForeignKey("users.id"), nullable=True)
    reason = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    order = relationship("Order", back_populates="history")

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    catalogue_item_id = Column(String, ForeignKey("distributor_catalogue_items.id"), unique=True, nullable=False)
    quantity = Column(Integer, default=0)
    reserved_quantity = Column(Integer, default=0)
    
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    catalogue_item = relationship("DistributorCatalogueItem")
