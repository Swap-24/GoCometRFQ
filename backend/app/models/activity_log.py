import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import ActivityEventType

def generate_uuid() -> str:
    return str(uuid.uuid4())

class RFQActivityLog(Base):
    __tablename__ = "rfq_activity_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)

    event_type = Column(
        SQLEnum(ActivityEventType, name="activity_event_type_enum"),
        nullable=False,
        index=True
    )
    message = Column(String(255), nullable=False)
    reason = Column(Text, nullable=True)  # Human-readable explanation of extension/event
    
    # Extension tracking
    previous_close_time = Column(DateTime(timezone=True), nullable=True)
    new_close_time = Column(DateTime(timezone=True), nullable=True)
    
    # Metadata snapshot (JSON string: carrier, quote_id, prices, rank shifts)
    metadata_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    # Relationships
    rfq = relationship("RFQ", back_populates="activity_logs")
