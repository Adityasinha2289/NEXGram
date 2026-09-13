from pydantic import BaseModel
from typing import Optional
from enum import Enum

class RoleEnum(str, Enum):
    retailer = "retailer"
    distributor = "distributor"
    # A household buying from a nearby shop through the storefront.
    customer = "customer"
    admin = "admin"

class UserCreate(BaseModel):
    name: str
    mobile: str
    password: str
    role: RoleEnum
    email: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str


class DemoLogin(BaseModel):
    """Opens one of the seeded demo accounts. No credentials."""

    role: RoleEnum


class ClerkExchange(BaseModel):
    """Trades a Clerk session token for a NEXGram one.

    `role` is consulted only when this Clerk identity has never been seen here
    and an account has to be created. For anyone who already exists, the role
    stored on their account wins — the same rule the login screens follow, so
    that arriving through the wrong door cannot change what someone is.
    """

    token: str
    role: Optional[RoleEnum] = None

class UserResponse(BaseModel):
    id: str
    name: str
    mobile: str
    email: Optional[str] = None
    role: str
    is_active: bool

    class Config:
        from_attributes = True

class MeResponse(BaseModel):
    id: str
    name: str
    role: str
    profile_id: Optional[str] = None
    profile_complete: bool = False


class PasswordResetRequest(BaseModel):
    mobile: str


class PasswordResetConfirm(BaseModel):
    mobile: str
    code: str
    new_password: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str
