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
    elif db_user.role == "customer":
        # A household has no business to name; the address is collected when
        # they first order, not at signup.
        from app.models.retail import CustomerProfile
        db.add(CustomerProfile(user_id=db_user.id))
    
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


def _create_role_profile(db: Session, user: User) -> None:
    """The profile row each role needs before its part of the app will load."""
    if user.role == "retailer":
        db.add(RetailerProfile(user_id=user.id, business_name=f"{user.name}'s Store"))
    elif user.role == "distributor":
        db.add(DistributorProfile(user_id=user.id, business_name=f"{user.name} Distribution"))
    elif user.role == "customer":
        from app.models.retail import CustomerProfile

        db.add(CustomerProfile(user_id=user.id))


def link_or_create_clerk_user(db: Session, identity, default_role: str = "retailer") -> tuple[User, bool]:
    """Finds the NEXGram account behind a Clerk identity, creating one if new.

    Returns the user and whether this call created them.

    The matching order is the security-sensitive part. An identity is joined to
    an existing account only on a contact detail Clerk has *verified* - the
    caller is responsible for dropping unverified ones, which clerk.py does -
    because matching an unverified number would let anyone who typed a
    shopkeeper's mobile into a Clerk signup inherit that shop.

    A shopkeeper who has been signing in with a password for months and then
    signs in with Clerk on the same verified number is the same person, and
    lands on the same shop. That is the whole point of matching at all.
    """
    existing = (
        db.query(User).filter(User.clerk_user_id == identity.clerk_user_id).first()
    )
    if existing:
        return existing, False

    user = None
    if identity.mobile:
        user = db.query(User).filter(User.mobile == identity.mobile).first()
    if not user and identity.email:
        user = db.query(User).filter(User.email == identity.email).first()

    if user:
        if user.clerk_user_id and user.clerk_user_id != identity.clerk_user_id:
            # Two Clerk identities claiming one shop. Refusing is the safe
            # answer; silently repointing the account would be a takeover.
            raise HTTPException(
                status_code=409,
                detail="Yeh account pehle se kisi aur Clerk login se juda hai.",
            )
        user.clerk_user_id = identity.clerk_user_id
        if not user.email and identity.email:
            user.email = identity.email
        db.commit()
        db.refresh(user)
        return user, False

    if not identity.mobile and not identity.email:
        # Nothing verified came back, so there is no safe key to create against.
        raise HTTPException(
            status_code=400,
            detail="Clerk se koi verified mobile ya email nahi mila. Apna number verify karein.",
        )

    user = User(
        name=identity.name or (identity.mobile or identity.email or "NEXGram user"),
        mobile=identity.mobile,
        email=identity.email,
        role=default_role,
        # No local password. They sign in through Clerk; password_hash has
        # always been nullable, so nothing in the schema had to change.
        password_hash=None,
        clerk_user_id=identity.clerk_user_id,
    )
    db.add(user)
    db.flush()
    _create_role_profile(db, user)
    db.commit()
    db.refresh(user)
    return user, True
