from sqlalchemy import Column, DateTime, ForeignKey, Index, String, func

from app.core.database import Base
import uuid


class PasswordResetToken(Base):
    """A single-use, expiring credential for resetting a forgotten password.

    Only the hash is stored. If the database leaks, the rows are useless for
    taking over an account - the same reason passwords are not stored in the
    clear, applied to the thing that can replace a password.
    """

    __tablename__ = "password_reset_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), index=True, nullable=False)

    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    # Kept for the audit trail: a burst of requests from one address is the
    # signal that someone is hunting for valid accounts.
    requested_ip = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_password_reset_user_used", "user_id", "used_at"),
    )
