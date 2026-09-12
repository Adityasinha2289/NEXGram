from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas import PaginatedResponse
from app.modules.products import schemas, service

router = APIRouter(prefix="/products", tags=["products"])

@router.get("", response_model=PaginatedResponse[schemas.ProductResponse])
def read_products(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size
    products, total = service.get_products(db, skip=skip, limit=page_size, search=search, category_id=category_id)
    
    return {
        "items": products,
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_next": (skip + page_size) < total
    }

@router.get("/{product_id}", response_model=schemas.ProductResponse)
def read_product(product_id: str, db: Session = Depends(get_db)):
    product = service.get_product(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/{product_id}/suppliers", response_model=schemas.ProductWithSuppliersResponse)
def read_product_with_suppliers(product_id: str, db: Session = Depends(get_db)):
    product_data = service.get_product_with_suppliers(db, product_id)
    if not product_data:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_data
