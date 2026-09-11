from sqlalchemy import Column, String, DateTime, JSON, func
from app.core.database import Base
import uuid

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id = Column(String, index=True, nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, index=True, nullable=False)
    metadata_json = Column(JSON, nullable=True)
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
