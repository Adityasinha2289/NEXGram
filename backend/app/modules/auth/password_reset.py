"""Forgotten-password recovery.

Design decisions worth stating, because each one is a place this could leak:

  - The request endpoint answers identically whether or not the number is
    registered. Otherwise it becomes a tool for discovering which shops are on
    the platform.
  - Only a hash of the code is stored, so a database leak cannot be used to take
    over accounts.
  - A code is single use and short-lived, and issuing a new one invalidates the
    outstanding ones, so a code read over someone's shoulder yesterday is dead.
  - Completing a reset invalidates every other outstanding code for that user.
"""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core import audit, notifications
from app.core.security import get_password_hash, normalise_mobile, password_problem
from app.models.auth_tokens import PasswordResetToken
from app.models.users import User

logger = logging.getLogger("nexgram.auth")

CODE_LENGTH = 6
CODE_TTL_MINUTES = 15
# A shop owner may mistype a code read off a screen; more than this is guessing.
MAX_ATTEMPTS_PER_CODE = 5


def _hash(code: str) -> str:
    """SHA-256 rather than bcrypt.

    The code is a 6-digit random value that lives for 15 minutes and is
    rate-limited, so the slow-hash property bcrypt provides for user-chosen
    passwords buys nothing here, and reset verification stays fast.
    """
    return hashlib.sha256(code.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _naive(value: datetime) -> datetime:
    """SQLite hands back naive datetimes; Postgres keeps the offset."""
    return value.replace(tzinfo=None) if value.tzinfo else value


def request_reset(db: Session, mobile: str, ip: Optional[str] = None) -> None:
    """Issues a reset code if the number belongs to an active account.

    Returns nothing in every case. The caller must respond identically either
    way - see the module docstring.
    """
    normalised = normalise_mobile(mobile)
    if not normalised:
        return

    user = db.query(User).filter(User.mobile == normalised).first()
    if not user or not user.is_active:
        return

    # Outstanding codes die when a new one is issued.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": _naive(_now())}, synchronize_session=False)

    code = f"{secrets.randbelow(10 ** CODE_LENGTH):0{CODE_LENGTH}d}"
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=_hash(code),
        expires_at=_naive(_now() + timedelta(minutes=CODE_TTL_MINUTES)),
        requested_ip=ip,
    ))
    audit.record(
        db,
        action="auth.password_reset_requested",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
        metadata={"ip": ip},
    )
    db.commit()

    notifications.send(
        normalised,
        f"NEXGram password reset code: {code}. {CODE_TTL_MINUTES} minute mein expire ho jayega.",
        purpose="password_reset",
    )


def confirm_reset(db: Session, mobile: str, code: str, new_password: str) -> tuple:
    """Consumes a code and sets a new password.

    Returns (ok, error_message). Errors are deliberately non-specific about
    whether the number or the code was wrong.
    """
    problem = password_problem(new_password)
    if problem:
        return False, problem

    normalised = normalise_mobile(mobile)
    if not normalised:
        return False, "Code galat ya expire ho chuka hai."

    user = db.query(User).filter(User.mobile == normalised).first()
    if not user or not user.is_active:
        return False, "Code galat ya expire ho chuka hai."

    token = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.token_hash == _hash(code or ""),
        PasswordResetToken.used_at.is_(None),
    ).first()

    if not token or _naive(token.expires_at) < _naive(_now()):
        audit.record(
            db,
            action="auth.password_reset_failed",
            entity_type="user",
            entity_id=user.id,
            metadata={"reason": "invalid_or_expired_code"},
            commit=True,
        )
        return False, "Code galat ya expire ho chuka hai."

    user.password_hash = get_password_hash(new_password)
    token.used_at = _naive(_now())

    # Any other code outstanding for this user is now void.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": _naive(_now())}, synchronize_session=False)

    audit.record(
        db,
        action="auth.password_reset_completed",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
    )
    db.commit()

    notifications.send(
        normalised,
        "NEXGram ka password badal diya gaya hai. Agar yeh aapne nahi kiya, turant support se baat karein.",
        purpose="password_changed",
    )
    return True, None


def change_password(db: Session, user: User, current_password: str, new_password: str) -> tuple:
    """Changes the password of someone already signed in.

    Re-checks the current password: a token alone should not be enough to lock
    the real owner out of their account on a borrowed phone.
    """
    from app.core.security import verify_password

    if not verify_password(current_password, user.password_hash):
        return False, "Abhi ka password galat hai."

    problem = password_problem(new_password)
    if problem:
        return False, problem

    user.password_hash = get_password_hash(new_password)
    audit.record(
        db,
        action="auth.password_changed",
        entity_type="user",
        entity_id=user.id,
        actor_id=user.id,
    )
    db.commit()
    return True, None
