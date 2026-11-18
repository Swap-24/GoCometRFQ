from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

class QuoteBase(BaseModel):
    carrier_name: str = Field(..., min_length=2, max_length=100, description="Carrier / Supplier name")
    freight_charges: float = Field(..., ge=0, description="Primary freight charges")
    origin_charges: float = Field(default=0.0, ge=0, description="Origin terminal / handling charges")
    destination_charges: float = Field(default=0.0, ge=0, description="Destination terminal / delivery charges")
    transit_time_days: int = Field(..., gt=0, description="Estimated transit duration in days")
    validity_date: datetime = Field(..., description="Date until which the quotation remains valid")
    notes: str | None = Field(default=None, description="Additional notes or specifications")

class QuoteCreate(QuoteBase):
    pass

class QuoteResponse(QuoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rfq_id: str
    total_price: float
    rank_at_submission: int | None = None
    current_rank: int | None = None
    submitted_at: datetime
