from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.schemas import PaginatedResponse
from app.modules.distributors import schemas, service

router = APIRouter(prefix="/distributors", tags=["distributors"])

@router.get("", response_model=PaginatedResponse[schemas.DistributorResponse])
def read_distributors(
    search: Optional[str] = None,
    location: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size
    distributors, total = service.get_distributors(db, skip=skip, limit=page_size, search=search, location=location)
    
    return {
        "items": distributors,
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_next": (skip + page_size) < total
    }

@router.get("/{distributor_id}", response_model=schemas.DistributorResponse)
def read_distributor(distributor_id: str, db: Session = Depends(get_db)):
    distributor = service.get_distributor(db, distributor_id)
    if not distributor:
        raise HTTPException(status_code=404, detail="Distributor not found")
    return distributor

@router.get("/{distributor_id}/catalogue", response_model=PaginatedResponse[schemas.DistributorCatalogueItemResponse])
def read_distributor_catalogue(
    distributor_id: str,
    search: Optional[str] = None,
    available_only: bool = False,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    skip = (page - 1) * page_size
    items, total = service.get_distributor_catalogue(db, distributor_id, skip=skip, limit=page_size, search=search, available_only=available_only)
    
    return {
        "items": items,
        "page": page,
        "page_size": page_size,
        "total": total,
        "has_next": (skip + page_size) < total
    }
