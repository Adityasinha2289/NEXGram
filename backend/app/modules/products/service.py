from sqlalchemy.orm import Session, joinedload
from app.models import Product, Category
from typing import Optional, Tuple

def get_products(db: Session, skip: int = 0, limit: int = 20, search: Optional[str] = None, category_id: Optional[str] = None) -> Tuple[list[Product], int]:
    query = db.query(Product).filter(Product.is_active == True)
    
    if search:
        query = query.filter(Product.canonical_name.ilike(f"%{search}%"))
        
    if category_id:
        # Simplistic category match; for hierarchy we might need a recursive CTE or just relying on UI passing correct leaf IDs
        query = query.filter(Product.category_id == category_id)
        
    total = query.count()
    
    # Use joinedload to avoid N+1 on categories and variants
    products = query.options(joinedload(Product.category), joinedload(Product.variants)).offset(skip).limit(limit).all()
    
    return products, total

def get_product(db: Session, product_id: str) -> Optional[Product]:
    return db.query(Product).options(joinedload(Product.category), joinedload(Product.variants)).filter(Product.id == product_id, Product.is_active == True).first()

def get_product_with_suppliers(db: Session, product_id: str):
    from app.models.catalogue import DistributorCatalogueItem
    from app.models.profiles import DistributorProfile
    
    product = get_product(db, product_id)
    if not product:
        return None
        
    # Get all active catalogue items for this product
    items = db.query(DistributorCatalogueItem).options(
        joinedload(DistributorCatalogueItem.distributor).joinedload(DistributorProfile.location),
        joinedload(DistributorCatalogueItem.variant)
    ).filter(
        DistributorCatalogueItem.product_id == product_id,
        DistributorCatalogueItem.is_active == True,
        DistributorCatalogueItem.is_available == True
    ).all()
    
    offers = []
    for item in items:
        # Extract location info safely. The column is `area` (the market a
        # supplier trades in); `village_town_city` is the fallback for rows
        # geocoded to a settlement rather than a market.
        loc = item.distributor.location
        loc_str = None
        if loc:
            parts = [loc.area or loc.village_town_city, loc.block or loc.district]
            loc_str = ", ".join(p for p in parts if p) or None
        
        offers.append({
            "id": item.id,
            "distributor_id": item.distributor_id,
            "distributor_name": item.distributor.business_name,
            "distributor_location": loc_str,
            "variant_id": item.product_variant_id,
            "variant_name": item.variant.variant_name,
            "pack_size": item.variant.pack_size,
            "price": item.selling_price,
            "moq": item.minimum_order_quantity,
            "stock": item.available_stock,
            "stock_status": item.stock_status,
            "delivery_time": item.delivery_time
        })
        
    return {
        **product.__dict__,
        "category": product.category,
        "variants": product.variants,
        "offers": offers
    }
