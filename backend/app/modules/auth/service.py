from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User
from app.models.profiles import RetailerProfile, DistributorProfile
from app.core import audit
from app.core.security import (
    create_access_token,
    get_password_hash,
    normalise_mobile,
    password_problem,
    verify_password,
)
from app.modules.auth import schemas
from datetime import timedelta
from app.core.security import ACCESS_TOKEN_EXPIRE_MINUTES

# A real bcrypt hash of a random string, compared against when no account
# matches so that "unknown number" and "wrong password" cost the same time.
_TIMING_DECOY = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO1LhAGsfBRMzxwvkcVFHgVpQKG4BHdlS"


def authenticate_user(db: Session, mobile: str, password: str) -> User:
    """Verifies credentials.

    The submitted number is normalised the same way it was at registration, so
    someone who signed up as "+919000000001" can sign in as "9000000001".
    """
    normalised = normalise_mobile(mobile) or mobile
    user = db.query(User).filter(User.mobile == normalised).first()
    if not user:
        # Hash anyway so a missing account and a wrong password take the same
        # time; otherwise response timing reveals which numbers are registered.
        verify_password(password, _TIMING_DECOY)
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def create_user(db: Session, user_in: schemas.UserCreate) -> User:
    mobile = normalise_mobile(user_in.mobile)
    if not mobile:
        raise HTTPException(status_code=400, detail="Sahi 10-digit mobile number daalein.")

    problem = password_problem(user_in.password)
    if problem:
        raise HTTPException(status_code=400, detail=problem)

    if db.query(User).filter(User.mobile == mobile).first():
        raise HTTPException(status_code=400, detail="Yeh mobile number pehle se registered hai")

    db_user = User(
        name=user_in.name.strip(),
        mobile=mobile,
        email=user_in.email,
        role=user_in.role.value,
        password_hash=get_password_hash(user_in.password)
    )
    db.add(db_user)
    db.flush()

    # Create corresponding profile
    if db_user.role == "retailer":
        profile = RetailerProfile(user_id=db_user.id, business_name=f"{db_user.name}'s Store")
        db.add(profile)
    elif db_user.role == "distributor":
        profile = DistributorProfile(user_id=db_user.id, business_name=f"{db_user.name} Distribution")
        db.add(profile)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def get_me_response(db: Session, current_user: User) -> schemas.MeResponse:
    # Completeness is defined once, in the profiles module. Re-deriving it here
    # is how this endpoint ended up reading columns that never existed
    # (retailer.address, distributor.serviceable_pincodes) and 500ing for every
    # signed-in user.
    from app.modules.profiles.service import (
        get_distributor_completeness,
        get_retailer_completeness,
    )

    profile_id = None
    profile_complete = False

    if current_user.role == "retailer":
        profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
        if profile:
            profile_id = profile.id
            profile_complete = get_retailer_completeness(profile).profile_complete
    elif current_user.role == "distributor":
        profile = db.query(DistributorProfile).filter(DistributorProfile.user_id == current_user.id).first()
        if profile:
            profile_id = profile.id
            profile_complete = get_distributor_completeness(profile).profile_complete

    return schemas.MeResponse(
        id=current_user.id,
        name=current_user.name,
        role=current_user.role,
        profile_id=profile_id,
        profile_complete=profile_complete
    )
