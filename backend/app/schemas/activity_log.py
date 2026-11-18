from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.models.enums import ActivityEventType

class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rfq_id: str
    event_type: ActivityEventType
    message: str
    reason: str | None = None
    previous_close_time: datetime | None = None
    new_close_time: datetime | None = None
    metadata_json: str | None = None
    created_at: datetime
