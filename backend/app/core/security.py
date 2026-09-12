import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# Validated at startup by settings.validate_runtime(): required in production,
# random per process in development. There is deliberately no literal fallback.
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Indian mobile numbers: 10 digits starting 6-9. Accepts the +91 / 0 prefixes
# people actually type and stores the bare 10 digits.
MOBILE_PATTERN = re.compile(r"^(?:\+?91|0)?([6-9]\d{9})$")
MIN_PASSWORD_LENGTH = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = {
        "exp": expire,
        "iat": now,
        "sub": str(subject),
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def normalise_mobile(raw: str) -> Optional[str]:
    """Returns the bare 10-digit number, or None if it is not a valid one.

    Normalising at the boundary means "+91 98765 43210" and "09876543210" cannot
    become two accounts for the same person.
    """
    if not raw:
        return None
    match = MOBILE_PATTERN.match(re.sub(r"[\s-]", "", str(raw)))
    return match.group(1) if match else None


def password_problem(password: str) -> Optional[str]:
    """Returns why a password is unacceptable, or None if it is fine.

    Deliberately minimal: length carries most of the strength, and composition
    rules mostly push people towards predictable substitutions. The target user
    is typing on a phone keypad.
    """
    if not password or len(password) < MIN_PASSWORD_LENGTH:
        return f"Password kam se kam {MIN_PASSWORD_LENGTH} characters ka hona chahiye."
    if password.isdigit():
        return "Sirf numbers ka password surakshit nahi hai."
    return None
