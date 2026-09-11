from sqlalchemy.orm import Session, joinedload
from app.models import DistributorProfile, DistributorCatalogueItem, Product, ProductVariant, Category, Location
from typing import Optional, Tuple

def get_distributors(db: Session, skip: int = 0, limit: int = 20, search: Optional[str] = None, location: Optional[str] = None) -> Tuple[list[DistributorProfile], int]:
    query = db.query(DistributorProfile).filter(DistributorProfile.verification_status == "verified")
    
    if search:
        query = query.filter(DistributorProfile.business_name.ilike(f"%{search}%"))
        
    if location:
        # Simple location text search across related Location fields
        query = query.join(DistributorProfile.location).filter(
            (Location.area.ilike(f"%{location}%")) |
            (Location.district.ilike(f"%{location}%")) |
            (Location.state.ilike(f"%{location}%"))
        )
        
    total = query.count()
    distributors = query.options(joinedload(DistributorProfile.location)).offset(skip).limit(limit).all()
    return distributors, total

def get_distributor(db: Session, distributor_id: str) -> Optional[DistributorProfile]:
    return db.query(DistributorProfile).options(joinedload(DistributorProfile.location)).filter(DistributorProfile.id == distributor_id).first()

def get_distributor_catalogue(
    db: Session, 
    distributor_id: str, 
    skip: int = 0, 
    limit: int = 20, 
    search: Optional[str] = None,
    available_only: bool = False
) -> Tuple[list[dict], int]:
    
    query = db.query(DistributorCatalogueItem).filter(
        DistributorCatalogueItem.distributor_id == distributor_id,
        DistributorCatalogueItem.is_active == True
    )
    
    if available_only:
        query = query.filter(DistributorCatalogueItem.is_available == True, DistributorCatalogueItem.available_stock > 0)
        
    # We need product names for search
    query = query.join(DistributorCatalogueItem.product).join(DistributorCatalogueItem.variant)
    
    if search:
        query = query.filter(
            (Product.canonical_name.ilike(f"%{search}%")) |
            (ProductVariant.variant_name.ilike(f"%{search}%"))
        )
        
    total = query.count()
    
    # Eager load related entities
    items = query.options(
        joinedload(DistributorCatalogueItem.product).joinedload(Product.category),
        joinedload(DistributorCatalogueItem.variant)
    ).offset(skip).limit(limit).all()
    
    # Flatten the response to match UI expectations
    results = []
    for item in items:
        results.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_variant_id": item.product_variant_id,
            "product_name": item.product.canonical_name,
            "variant_name": item.variant.variant_name,
            "brand": item.product.brand,
            "category_slug": item.product.category.slug if item.product.category else None,
            "selling_price": item.selling_price,
            "minimum_order_quantity": item.minimum_order_quantity,
            "available_stock": item.available_stock,
            "stock_status": item.stock_status,
            "delivery_time": item.delivery_time,
            "is_available": item.is_available
        })
        
    return results, total
