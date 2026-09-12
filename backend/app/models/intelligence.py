from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Index, func, JSON, UniqueConstraint
from app.core.database import Base
import uuid

class DemandSignal(Base):
    __tablename__ = "demand_signals"
    
    id = Column(String, primary_key=True)
    retailer_id = Column(String, ForeignKey("retailer_profiles.id"), index=True, nullable=True)
    product_id = Column(String, ForeignKey("products.id"), index=True, nullable=True)
    category_id = Column(String, ForeignKey("categories.id"), index=True, nullable=True)
    
    location_id = Column(String, ForeignKey("locations.id"), index=True, nullable=True)
    signal_type = Column(String, nullable=False) # e.g. "unmet_need", "search", "order"
    quantity = Column(Integer, nullable=True)
    source = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class SupplyGap(Base):
    __tablename__ = "supply_gaps"

    id = Column(String, primary_key=True)
    product_id = Column(String, ForeignKey("products.id"), index=True, nullable=True)
    category_id = Column(String, ForeignKey("categories.id"), index=True, nullable=True)
    location_id = Column(String, ForeignKey("locations.id"), index=True, nullable=True)
    
    retailer_demand_count = Column(Integer, default=0)
    supplier_count = Column(Integer, default=0)
    available_supplier_count = Column(Integer, default=0)
    low_stock_supplier_count = Column(Integer, default=0)
    out_of_stock_supplier_count = Column(Integer, default=0)
    
    gap_score = Column(Float, default=0.0)
    supply_level = Column(String, default="unavailable") # unavailable, limited, adequate, strong
    
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Opportunity(Base):
    __tablename__ = "opportunities"
    
    id = Column(String, primary_key=True)
    distributor_id = Column(String, ForeignKey("distributor_profiles.id"), index=True, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    category_id = Column(String, ForeignKey("categories.id"), nullable=True)
    location_id = Column(String, ForeignKey("locations.id"), nullable=True)
    
    # Weighted components of opportunity_score; they sum to it. Stored
    # separately so the API can show a reader the arithmetic, not just a number.
    demand_score = Column(Float, default=0.0)      # 0-45, unmet local demand
    supply_score = Column(Float, default=0.0)      # 0-35, scarcity of fulfilment
    fit_score = Column(Float, default=0.0)         # 0-20, distributor's own footprint
    competition_score = Column(Float, default=0.0) # distributors already listing it
    opportunity_score = Column(Float, default=0.0)
    confidence = Column(String, nullable=True)     # High | Medium | Low
    
    potential_retailer_count = Column(Integer, default=0)
    recommended_initial_stock = Column(Integer, default=0)
    
    distributor_fit = Column(String, nullable=True) # High, Medium, Low
    evidence_json = Column(JSON, nullable=True)
    
    status = Column(String, default="active")
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_opportunities_distributor_status", "distributor_id", "status"),
    )

class RecommendationEvidence(Base):
    __tablename__ = "recommendation_evidence"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recommendation_id = Column(String, index=True, nullable=False) # Polymorphic, can link to DeveloperPack or similar
    evidence_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
