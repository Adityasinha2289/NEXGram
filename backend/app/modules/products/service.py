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
