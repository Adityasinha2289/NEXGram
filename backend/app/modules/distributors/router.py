from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.api.deps import get_current_distributor
from app.core import audit
from app.core.database import get_db
from app.models.profiles import DistributorProfile
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

@router.post("/me/catalogue", response_model=schemas.DistributorCatalogueItemResponse, status_code=201)
def add_my_catalogue_item(
    payload: schemas.CatalogueItemCreate,
    db: Session = Depends(get_db),
    current_distributor: DistributorProfile = Depends(get_current_distributor),
):
    """Lists a product on the signed-in distributor's catalogue.

    The distributor is taken from the token, never from the payload, so one
    distributor cannot write into another's catalogue.
    """
    try:
        item = service.create_catalogue_item(db, current_distributor.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    audit.record(
        db,
        action="catalogue.listed",
        entity_type="catalogue_item",
        entity_id=item.id,
        actor_id=current_distributor.id,
        metadata={
            "product_id": item.product_id,
            "price": item.selling_price,
            "stock": item.available_stock,
        },
        commit=True,
    )
    return service.flatten_catalogue_item(item)


@router.patch("/me/catalogue/{item_id}", response_model=schemas.DistributorCatalogueItemResponse)
def update_my_catalogue_item(
    item_id: str,
    payload: schemas.CatalogueItemUpdate,
    db: Session = Depends(get_db),
    current_distributor: DistributorProfile = Depends(get_current_distributor),
):
    item = service.update_catalogue_item(db, current_distributor.id, item_id, payload)
    if not item:
        raise HTTPException(status_code=404, detail="Catalogue item not found")

    audit.record(
        db,
        action="catalogue.updated",
        entity_type="catalogue_item",
        entity_id=item.id,
        actor_id=current_distributor.id,
        metadata=payload.model_dump(exclude_none=True),
        commit=True,
    )
    return service.flatten_catalogue_item(item)


@router.delete("/me/catalogue/{item_id}", status_code=204)
def delete_my_catalogue_item(
    item_id: str,
    db: Session = Depends(get_db),
    current_distributor: DistributorProfile = Depends(get_current_distributor),
):
    if not service.delete_catalogue_item(db, current_distributor.id, item_id):
        raise HTTPException(status_code=404, detail="Catalogue item not found")

    audit.record(
        db,
        action="catalogue.delisted",
        entity_type="catalogue_item",
        entity_id=item_id,
        actor_id=current_distributor.id,
        commit=True,
    )


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
