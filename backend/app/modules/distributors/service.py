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


def derive_stock_status(available_stock: int) -> str:
    """Single definition of what a stock number means.

    This used to live in the frontend, which meant the label a retailer saw and
    the number the supply-gap engine scored could disagree.
    """
    if available_stock <= 0:
        return "out_of_stock"
    if available_stock < 10:
        return "low_stock"
    return "available"


def create_catalogue_item(db: Session, distributor_id: str, data) -> DistributorCatalogueItem:
    """Adds a variant to a distributor's catalogue.

    Re-listing a variant the distributor already carries reactivates and updates
    the existing row instead of creating a duplicate, which would otherwise
    inflate the supplier counts the intelligence layer relies on.
    """
    variant = db.query(ProductVariant).filter(ProductVariant.id == data.product_variant_id).first()
    if not variant:
        raise ValueError("Product variant not found")

    existing = db.query(DistributorCatalogueItem).filter(
        DistributorCatalogueItem.distributor_id == distributor_id,
        DistributorCatalogueItem.product_variant_id == variant.id,
    ).first()

    item = existing or DistributorCatalogueItem(
        distributor_id=distributor_id,
        product_id=variant.product_id,
        product_variant_id=variant.id,
    )

    item.selling_price = data.selling_price
    item.minimum_order_quantity = data.minimum_order_quantity
    item.available_stock = data.available_stock
    item.stock_status = derive_stock_status(data.available_stock)
    item.delivery_time = data.delivery_time
    item.is_available = data.available_stock > 0
    item.is_active = True

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_catalogue_item(db: Session, distributor_id: str, item_id: str, data) -> Optional[DistributorCatalogueItem]:
    item = db.query(DistributorCatalogueItem).filter(
        DistributorCatalogueItem.id == item_id,
        DistributorCatalogueItem.distributor_id == distributor_id,
    ).first()
    if not item:
        return None

    if data.selling_price is not None:
        item.selling_price = data.selling_price
    if data.minimum_order_quantity is not None:
        item.minimum_order_quantity = data.minimum_order_quantity
    if data.available_stock is not None:
        item.available_stock = data.available_stock
        item.stock_status = derive_stock_status(data.available_stock)
        item.is_available = data.available_stock > 0
    if data.delivery_time is not None:
        item.delivery_time = data.delivery_time
    if data.is_available is not None:
        item.is_available = data.is_available

    db.commit()
    db.refresh(item)
    return item


def delete_catalogue_item(db: Session, distributor_id: str, item_id: str) -> bool:
    """Soft delete. Historical orders reference this row's snapshotted price."""
    item = db.query(DistributorCatalogueItem).filter(
        DistributorCatalogueItem.id == item_id,
        DistributorCatalogueItem.distributor_id == distributor_id,
    ).first()
    if not item:
        return False

    item.is_active = False
    item.is_available = False
    db.commit()
    return True


def flatten_catalogue_item(item: DistributorCatalogueItem) -> dict:
    return {
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
        "is_available": item.is_available,
    }
