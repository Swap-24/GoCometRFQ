import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import AuctionStatus, ExtensionTriggerType

def generate_uuid() -> str:
    return str(uuid.uuid4())

class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    reference_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    pickup_service_date = Column(DateTime(timezone=True), nullable=False)

    # Auction Deadlines
    bid_start_time = Column(DateTime(timezone=True), nullable=False)
    initial_bid_close_time = Column(DateTime(timezone=True), nullable=False)
    current_bid_close_time = Column(DateTime(timezone=True), nullable=False)
    forced_bid_close_time = Column(DateTime(timezone=True), nullable=False)

    # British Auction Configurations
    is_british_auction = Column(Boolean, default=True, nullable=False)
    trigger_window_minutes = Column(Integer, default=10, nullable=False)  # X minutes
    extension_duration_minutes = Column(Integer, default=5, nullable=False)  # Y minutes
    extension_trigger_type = Column(
        SQLEnum(ExtensionTriggerType, name="extension_trigger_type_enum"),
        default=ExtensionTriggerType.BID_RECEIVED,
        nullable=False
    )

    # Status & Counters
    status = Column(
        SQLEnum(AuctionStatus, name="auction_status_enum"),
        default=AuctionStatus.UPCOMING,
        nullable=False,
        index=True
    )
    extension_count = Column(Integer, default=0, nullable=False)

    # Audit Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    quotes = relationship("Quote", back_populates="rfq", cascade="all, delete-orphan", order_by="Quote.total_price.asc()")
    activity_logs = relationship("RFQActivityLog", back_populates="rfq", cascade="all, delete-orphan", order_by="RFQActivityLog.created_at.desc()")

    def get_effective_status(self, current_time: datetime | None = None) -> AuctionStatus:
        """Dynamically computes the auction status based on current timestamp and close deadlines."""
        if current_time is None:
            current_time = datetime.now(timezone.utc)
            
        # Ensure timezone-aware comparison
        if current_time.tzinfo is None:
            current_time = current_time.replace(tzinfo=timezone.utc)

        # Check start time
        start = self.bid_start_time
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
            
        current_close = self.current_bid_close_time
        if current_close.tzinfo is None:
            current_close = current_close.replace(tzinfo=timezone.utc)
            
        forced_close = self.forced_bid_close_time
        if forced_close.tzinfo is None:
            forced_close = forced_close.replace(tzinfo=timezone.utc)

        if current_time < start:
            return AuctionStatus.UPCOMING
        elif current_time >= forced_close:
            return AuctionStatus.FORCE_CLOSED
        elif current_time >= current_close:
            return AuctionStatus.CLOSED
        else:
            return AuctionStatus.ACTIVE
