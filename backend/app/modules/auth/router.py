from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.database import SessionLocal
from app.core.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.api.deps import get_db, get_current_user
from app.modules.auth import schemas, service

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserResponse)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user and automatically create their role profile.
    """
    return service.create_user(db, user_in)

@router.post("/login", response_model=schemas.Token)
def login_for_access_token(
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    Using form_data.username for mobile number.
    """
    user = service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect mobile or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.id, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.MeResponse)
def read_users_me(
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    """
    Get current user along with their resolved profile ID.
    """
    return service.get_me_response(db, current_user)
