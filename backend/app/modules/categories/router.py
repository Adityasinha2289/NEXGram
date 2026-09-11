from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.modules.categories import schemas, service

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=List[schemas.CategoryResponse])
def read_categories(db: Session = Depends(get_db)):
    """
    Get all active categories.
    """
    categories = service.get_active_categories(db)
    return categories
