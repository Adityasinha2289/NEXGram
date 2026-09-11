from pydantic import BaseModel
from typing import Optional
from enum import Enum

class RoleEnum(str, Enum):
    retailer = "retailer"
    distributor = "distributor"
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
