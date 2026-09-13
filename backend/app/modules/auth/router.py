from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core import audit
from app.core.config import settings
from app.core.rate_limit import auth_limiter, client_key, rate_limit_auth
from app.core.security import ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token
from app.modules.auth import clerk, password_reset, schemas, service
from app.models.users import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.UserResponse, dependencies=[Depends(rate_limit_auth)])
def register_user(user_in: schemas.UserCreate, request: Request, db: Session = Depends(get_db)):
    """Registers a user and creates their role profile."""
    user = service.create_user(db, user_in)
    audit.record(
        db,
        action="user.registered",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
        metadata={"role": user.role, "ip": client_key(request)},
        commit=True,
    )
    return user


@router.post("/login", response_model=schemas.Token, dependencies=[Depends(rate_limit_auth)])
def login_for_access_token(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    """OAuth2-compatible token login. `username` carries the mobile number."""
    user = service.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        # Failed attempts stay on the limiter's clock; only success clears it.
        audit.record(
            db,
            action="auth.login_failed",
            entity_type="user",
            entity_id=form_data.username or "unknown",
            metadata={"ip": client_key(request)},
            commit=True,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Mobile number ya password galat hai",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # One person's typos should not lock out the next customer on a shared
    # village connection.
    auth_limiter.reset(f"auth:{client_key(request)}")

    audit.record(
        db,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
        metadata={"ip": client_key(request)},
        commit=True,
    )
    return {
        "access_token": create_access_token(
            subject=user.id, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        ),
        "token_type": "bearer",
    }


# The accounts seed/demo_seed.py creates. Kept here rather than imported so the
# API does not depend on the seed package at runtime, and so this list is the
# only thing /auth/demo can ever reach.
DEMO_MOBILES = {
    "retailer": "9000000001",
    "distributor": "9100000002",
    "customer": "9500000001",
}


@router.get("/demo/status", summary="Whether one-tap demo access is available")
def demo_status(db: Session = Depends(get_db)):
    """Lets the landing page hide the demo buttons rather than offer a dead one.

    Reports ready only when the accounts actually exist, because "enabled" and
    "seeded" are different things and an unseeded database is exactly how the
    demo used to fail.
    """
    if not settings.DEMO_LOGIN_ENABLED:
        return {"enabled": False, "roles": []}
    present = [
        role for role, mobile in DEMO_MOBILES.items()
        if db.query(User).filter(User.mobile == mobile).first()
    ]
    return {"enabled": True, "roles": present}


@router.post(
    "/demo",
    response_model=schemas.Token,
    summary="Open a seeded demo account without credentials",
)
def open_demo_account(
    payload: schemas.DemoLogin,
    request: Request,
    db: Session = Depends(get_db),
):
    """Issues a session for one of the three seeded demo accounts.

    Deliberately not behind the auth rate limiter. The limiter exists to slow
    down password guessing, and there is no password here to guess — while a
    shared limit is exactly what breaks a demo button when several people try
    it at once from behind one NAT, which is the normal case in a hall.
    """
    if not settings.DEMO_LOGIN_ENABLED:
        raise HTTPException(status_code=404, detail="Demo access is not enabled.")

    mobile = DEMO_MOBILES.get(payload.role.value)
    if not mobile:
        raise HTTPException(status_code=404, detail="Is role ka demo account nahi hai.")

    user = db.query(User).filter(User.mobile == mobile).first()
    if not user:
        # The database has not been seeded. Say so, rather than repeating the
        # "mobile ya password galat hai" that sent everyone looking at
        # credentials the last time this happened.
        raise HTTPException(
            status_code=503,
            detail="Demo data abhi load nahi hua hai. Thodi der baad try karein.",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Yeh demo account band hai.")

    audit.record(
        db,
        action="auth.demo_login",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
        metadata={"ip": client_key(request), "role": user.role},
        commit=True,
    )
    return {
        "access_token": create_access_token(
            subject=user.id, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        ),
        "token_type": "bearer",
    }


@router.get("/clerk/status", summary="Whether Clerk sign-in is available")
def clerk_status():
    """Lets the UI hide the Clerk button instead of offering a broken one."""
    return {"configured": clerk.is_configured()}


@router.post(
    "/clerk",
    response_model=schemas.Token,
    dependencies=[Depends(rate_limit_auth)],
    summary="Exchange a Clerk session token for a NEXGram one",
)
def exchange_clerk_token(
    payload: schemas.ClerkExchange,
    request: Request,
    db: Session = Depends(get_db),
):
    """Signs someone in with Clerk and hands back this app's own session.

    Clerk's token is checked once, here, and then not used again: what the rest
    of the API sees is the same NEXGram bearer token that /login issues. That
    keeps a week-long session on a connection that drops, which a 60-second
    Clerk token could not.
    """
    try:
        identity = clerk.identify(payload.token)
    except clerk.ClerkError as exc:
        audit.record(
            db,
            action="auth.clerk_rejected",
            entity_type="user",
            entity_id="unknown",
            metadata={"ip": client_key(request), "reason": str(exc)[:120]},
            commit=True,
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

    user, created = service.link_or_create_clerk_user(
        db, identity, default_role=(payload.role.value if payload.role else "retailer")
    )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Yeh account band hai.")

    auth_limiter.reset(f"auth:{client_key(request)}")
    audit.record(
        db,
        action="user.registered" if created else "auth.login",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
        metadata={"ip": client_key(request), "via": "clerk", "role": user.role},
        commit=True,
    )
    return {
        "access_token": create_access_token(
            subject=user.id, expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        ),
        "token_type": "bearer",
    }


@router.get("/me", response_model=schemas.MeResponse)
def read_users_me(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """The signed-in user with their resolved profile id."""
    return service.get_me_response(db, current_user)


@router.post(
    "/password-reset/request",
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit_auth)],
    summary="Request a password reset code",
)
def request_password_reset(
    payload: schemas.PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Always answers the same way.

    Confirming whether a number is registered would turn this into a directory
    of which shops are on the platform, so the response never varies.
    """
    password_reset.request_reset(db, payload.mobile, ip=client_key(request))
    return {
        "detail": "Agar yeh number registered hai, to reset code bhej diya gaya hai.",
        "expires_in_minutes": password_reset.CODE_TTL_MINUTES,
    }


@router.post(
    "/password-reset/confirm",
    dependencies=[Depends(rate_limit_auth)],
    summary="Set a new password using a reset code",
)
def confirm_password_reset(payload: schemas.PasswordResetConfirm, db: Session = Depends(get_db)):
    ok, error = password_reset.confirm_reset(
        db, payload.mobile, payload.code, payload.new_password
    )
    if not ok:
        raise HTTPException(status_code=400, detail=error)
    return {"detail": "Password badal diya gaya hai. Ab login karein."}


@router.post("/password", summary="Change password while signed in")
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ok, error = password_reset.change_password(
        db, current_user, payload.current_password, payload.new_password
    )
    if not ok:
        raise HTTPException(status_code=400, detail=error)
    return {"detail": "Password update ho gaya."}
