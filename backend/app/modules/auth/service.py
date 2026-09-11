from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.users import User
from app.models.profiles import RetailerProfile, DistributorProfile
from app.core.security import get_password_hash, verify_password, create_access_token
from app.modules.auth import schemas
from datetime import timedelta
from app.core.security import ACCESS_TOKEN_EXPIRE_MINUTES

def authenticate_user(db: Session, mobile: str, password: str) -> User:
    user = db.query(User).filter(User.mobile == mobile).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def create_user(db: Session, user_in: schemas.UserCreate) -> User:
    # Check if mobile exists
    if db.query(User).filter(User.mobile == user_in.mobile).first():
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    # Create user
    db_user = User(
        name=user_in.name,
        mobile=user_in.mobile,
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
    profile_id = None
    profile_complete = False

    if current_user.role == "retailer":
        profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
        if profile:
            profile_id = profile.id
            profile_complete = bool(profile.business_type and profile.address)
    elif current_user.role == "distributor":
        profile = db.query(DistributorProfile).filter(DistributorProfile.user_id == current_user.id).first()
        if profile:
            profile_id = profile.id
            profile_complete = bool(profile.serviceable_pincodes)

    return schemas.MeResponse(
        id=current_user.id,
        name=current_user.name,
        role=current_user.role,
        profile_id=profile_id,
        profile_complete=profile_complete
    )
