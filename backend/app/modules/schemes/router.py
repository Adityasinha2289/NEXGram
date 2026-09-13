from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.profiles import DistributorProfile, RetailerProfile
from app.models.users import User
from app.modules.profiles import service as profiles_service
from app.modules.schemes.catalogue import SCHEMES, match_schemes

router = APIRouter(prefix="/schemes", tags=["schemes"])


def _profile_data(db: Session, user: User) -> dict:
    """The same profile payload the app already renders, reused for matching."""
    if user.role == "retailer":
        profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == user.id).first()
        if not profile:
            return {}
        return profiles_service.build_retailer_profile_response(user, profile).profile_data

    if user.role == "distributor":
        profile = db.query(DistributorProfile).filter(DistributorProfile.user_id == user.id).first()
        if not profile:
            return {}
        return profiles_service.build_distributor_profile_response(user, profile).profile_data

    return {}


@router.get("", summary="Schemes matched against the signed-in user's profile")
def list_schemes(
    amount: Optional[float] = Query(
        default=None, gt=0,
        description="How much the user wants to borrow. Schemes that cover it rank first.",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rule-based matching only.

    Criteria are checked against facts onboarding already collected. Anything
    the platform cannot observe is returned for the user to self-declare, and
    the response never claims an eligibility decision - it reports which stated
    criteria a profile appears to meet and links to the official portal.
    """
    return {
        "role": current_user.role,
        "schemes": match_schemes(_profile_data(db, current_user), current_user.role, amount),
        "totalCatalogued": len(SCHEMES),
        "requestedAmount": amount,
    }
