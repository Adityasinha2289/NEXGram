from sqlalchemy import Column, String, Boolean, DateTime, func
from app.core.database import Base
import uuid

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    role = Column(String, nullable=False) # 'retailer', 'distributor', 'admin'
    name = Column(String, nullable=False)
    mobile = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=True)
    # Set when an account is linked to a Clerk identity. Nullable because
    # mobile+password accounts never get one, and because password_hash is
    # nullable the reverse also holds: a Clerk-only user has no local password.
    clerk_user_id = Column(String, unique=True, index=True, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
