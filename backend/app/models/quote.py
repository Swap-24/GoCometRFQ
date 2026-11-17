import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    rfq_id = Column(String(36), ForeignKey("rfqs.id", ondelete="CASCADE"), nullable=False, index=True)

    carrier_name = Column(String(100), nullable=False, index=True)
    freight_charges = Column(Float, nullable=False, default=0.0)
    origin_charges = Column(Float, nullable=False, default=0.0)
    destination_charges = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False, index=True)

    transit_time_days = Column(Integer, nullable=False)
    validity_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)

    rank_at_submission = Column(Integer, nullable=True)  # Snapshot rank (1 for L1, etc.)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    rfq = relationship("RFQ", back_populates="quotes")
