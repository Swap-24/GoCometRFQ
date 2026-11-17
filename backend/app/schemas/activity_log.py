from datetime import datetime
from pydantic import BaseModel
from app.models.enums import ActivityEventType

class ActivityLogResponse(BaseModel):
    id: str
    rfq_id: str
    event_type: ActivityEventType
    message: str
    reason: str | None = None
    previous_close_time: datetime | None = None
    new_close_time: datetime | None = None
    metadata_json: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
