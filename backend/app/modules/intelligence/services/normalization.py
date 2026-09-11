from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.catalogue import Category, Product
from typing import Optional

class NormalizationService:
    @staticmethod
    def normalize_text(text: str) -> str:
        """Basic text normalization (lowercase, trim)."""
        if not text:
            return ""
        return text.strip().lower()
    
    @staticmethod
    def map_category_id(db: Session, category_name: str) -> Optional[str]:
        """Map a raw category string to a canonical Category ID."""
        normalized = NormalizationService.normalize_text(category_name)
        if not normalized:
            return None
            
        category = db.query(Category).filter(
            func.lower(Category.name) == normalized
        ).first()
        
        return category.id if category else None

    @staticmethod
    def map_product_id(db: Session, product_name: str) -> Optional[str]:
        """Map a raw product string to a canonical Product ID."""
        normalized = NormalizationService.normalize_text(product_name)
        if not normalized:
            return None
            
        product = db.query(Product).filter(
            func.lower(Product.canonical_name) == normalized
        ).first()
        
        if not product:
            product = db.query(Product).filter(
                Product.normalized_name.ilike(f"%{normalized}%")
            ).first()
            
        return product.id if product else None
