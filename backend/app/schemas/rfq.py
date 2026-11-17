from datetime import datetime, timezone
from pydantic import BaseModel, Field, model_validator
from app.models.enums import AuctionStatus, ExtensionTriggerType
from app.schemas.quote import QuoteResponse
from app.schemas.activity_log import ActivityLogResponse

class RFQBase(BaseModel):
    reference_id: str = Field(..., min_length=3, max_length=50, description="Unique RFQ reference code (e.g. RFQ-2026-001)")
    title: str = Field(..., min_length=3, max_length=255, description="RFQ Route or Title")
    description: str | None = Field(default=None, description="Detailed freight / shipment requirements")
    pickup_service_date: datetime = Field(..., description="Target pickup or shipment execution date")
    
    bid_start_time: datetime = Field(..., description="Auction bidding start timestamp")
    initial_bid_close_time: datetime = Field(..., description="Initial planned auction close timestamp")
    forced_bid_close_time: datetime = Field(..., description="Hard absolute deadline after which auction cannot extend")

    is_british_auction: bool = Field(default=True, description="Enable British Reverse Auction extension mechanism")
    trigger_window_minutes: int = Field(default=10, gt=0, description="X minutes: activity within this window triggers extension")
    extension_duration_minutes: int = Field(default=5, gt=0, description="Y minutes: duration added when extension triggers")
    extension_trigger_type: ExtensionTriggerType = Field(
        default=ExtensionTriggerType.BID_RECEIVED,
        description="Trigger condition: BID_RECEIVED, ANY_RANK_CHANGE, or L1_RANK_CHANGE"
    )

class RFQCreate(RFQBase):
    @model_validator(mode="after")
    def validate_auction_deadlines(self):
        # Ensure UTC comparisons
        start = self.bid_start_time
        close = self.initial_bid_close_time
        forced = self.forced_bid_close_time

        if close <= start:
            raise ValueError("Bid Close Time must be strictly later than Bid Start Time.")
        if forced <= close:
            raise ValueError("Forced Bid Close Time must be strictly greater than Bid Close Time.")
        return self

class RFQListItem(BaseModel):
    id: str
    reference_id: str
    title: str
    pickup_service_date: datetime
    bid_start_time: datetime
    current_bid_close_time: datetime
    forced_bid_close_time: datetime
    is_british_auction: bool
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger_type: ExtensionTriggerType
    status: AuctionStatus
    extension_count: int
    
    # Summary metrics
    lowest_bid_amount: float | None = None
    lowest_bid_carrier: str | None = None
    total_bids_count: int = 0
    time_remaining_seconds: float | None = None

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RFQDetail(BaseModel):
    id: str
    reference_id: str
    title: str
    description: str | None = None
    pickup_service_date: datetime
    bid_start_time: datetime
    initial_bid_close_time: datetime
    current_bid_close_time: datetime
    forced_bid_close_time: datetime
    is_british_auction: bool
    trigger_window_minutes: int
    extension_duration_minutes: int
    extension_trigger_type: ExtensionTriggerType
    status: AuctionStatus
    extension_count: int
    created_at: datetime
    updated_at: datetime

    lowest_bid_amount: float | None = None
    lowest_bid_carrier: str | None = None
    time_remaining_seconds: float | None = None

    quotes: list[QuoteResponse] = []
    activity_logs: list[ActivityLogResponse] = []

    class Config:
        from_attributes = True
