from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import ValidationError
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.security import ALGORITHM, SECRET_KEY
from app.models.users import User
from app.models.profiles import RetailerProfile, DistributorProfile

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    except (JWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

def get_current_retailer(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> RetailerProfile:
    if current_user.role != "retailer":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    profile = db.query(RetailerProfile).filter(RetailerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Retailer profile not found")
    return profile

def get_current_distributor(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> DistributorProfile:
    if current_user.role != "distributor":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    profile = db.query(DistributorProfile).filter(DistributorProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Distributor profile not found")
    return profile

def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user
