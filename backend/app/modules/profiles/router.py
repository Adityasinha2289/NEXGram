from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_user, get_current_retailer, get_current_distributor
from app.models.users import User
from app.models.profiles import RetailerProfile, DistributorProfile
from app.modules.profiles import schemas, service

router = APIRouter()

@router.get("/retailer/me", response_model=schemas.ProfileResponse)
def get_my_retailer_profile(
    current_user: User = Depends(get_current_user),
    current_profile: RetailerProfile = Depends(get_current_retailer)
):
    """
    Get the authenticated retailer's profile.
    """
    return service.build_retailer_profile_response(current_user, current_profile)

@router.patch("/retailer/me", response_model=schemas.ProfileResponse)
def update_my_retailer_profile(
    update_data: schemas.RetailerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_profile: RetailerProfile = Depends(get_current_retailer)
):
    """
    Update the authenticated retailer's profile incrementally.
    """
    service.update_retailer_profile(db, current_user, current_profile, update_data)
    return service.build_retailer_profile_response(current_user, current_profile)

@router.get("/distributor/me", response_model=schemas.ProfileResponse)
def get_my_distributor_profile(
    current_user: User = Depends(get_current_user),
    current_profile: DistributorProfile = Depends(get_current_distributor)
):
    """
    Get the authenticated distributor's profile.
    """
    return service.build_distributor_profile_response(current_user, current_profile)

@router.patch("/distributor/me", response_model=schemas.ProfileResponse)
def update_my_distributor_profile(
    update_data: schemas.DistributorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_profile: DistributorProfile = Depends(get_current_distributor)
):
    """
    Update the authenticated distributor's profile incrementally.
    """
    service.update_distributor_profile(db, current_user, current_profile, update_data)
    return service.build_distributor_profile_response(current_user, current_profile)
