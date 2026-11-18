from datetime import datetime, timezone, timedelta
import json
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.websocket import ws_manager
from app.models.rfq import RFQ
from app.models.quote import Quote
from app.models.activity_log import RFQActivityLog
from app.models.enums import ActivityEventType
from app.schemas.quote import QuoteResponse
from app.services.auction_engine import (
    AuctionEngine,
    AuctionEngineError,
)

router = APIRouter()

class SimulatedBidRequest(BaseModel):
    carrier_name: str
    freight_charges: float = Field(..., ge=0)
    origin_charges: float = Field(default=0.0, ge=0)
    destination_charges: float = Field(default=0.0, ge=0)
    transit_time_days: int = Field(default=15, gt=0)
    validity_date: datetime | None = None
    notes: str | None = None
    # Allows setting the simulated timestamp relative to current close time
    # e.g. seconds_before_close = 120 (2 minutes before close)
    seconds_before_close: int | None = Field(
        default=120,
        description="Simulate placing bid X seconds before current close time (default: 120s = 2 mins)"
    )

@router.post("/{rfq_id}/simulate-bid", response_model=QuoteResponse)
async def simulate_bid_in_window(
    rfq_id: str,
    sim_in: SimulatedBidRequest,
    db: Session = Depends(get_db)
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).with_for_update().first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    close_time = rfq.current_bid_close_time
    if close_time.tzinfo is None:
        close_time = close_time.replace(tzinfo=timezone.utc)

    # Compute simulated timestamp
    if sim_in.seconds_before_close is not None:
        simulated_time = close_time - timedelta(seconds=sim_in.seconds_before_close)
    else:
        simulated_time = datetime.now(timezone.utc)

    total_price = round(sim_in.freight_charges + sim_in.origin_charges + sim_in.destination_charges, 2)
    validity = sim_in.validity_date or (simulated_time + timedelta(days=30))

    temp_quote = Quote(
        rfq_id=rfq.id,
        carrier_name=sim_in.carrier_name.strip(),
        freight_charges=sim_in.freight_charges,
        origin_charges=sim_in.origin_charges,
        destination_charges=sim_in.destination_charges,
        total_price=total_price,
        transit_time_days=sim_in.transit_time_days,
        validity_date=validity,
        notes=sim_in.notes or f"Simulated bid at {simulated_time.strftime('%H:%M:%S UTC')}",
        submitted_at=simulated_time
    )

    try:
        evaluation = AuctionEngine.evaluate_bid_submission(
            rfq=rfq,
            existing_quotes=rfq.quotes,
            new_quote=temp_quote,
            submission_time=simulated_time
        )
    except AuctionEngineError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    temp_quote.rank_at_submission = next(
        (item["rank"] for item in evaluation.ranking_result.rankings if item["carrier_name"] == temp_quote.carrier_name),
        None
    )
    db.add(temp_quote)
    db.flush()

    extension_info = None
    if evaluation.should_extend:
        old_close = rfq.current_bid_close_time
        rfq.current_bid_close_time = evaluation.new_close_time
        rfq.extension_count += 1
        db.add(rfq)

        ext_log = RFQActivityLog(
            rfq_id=rfq.id,
            event_type=ActivityEventType.TIME_EXTENSION,
            message=f"[Simulation] Auction extended from {old_close.strftime('%H:%M:%S')} to {evaluation.new_close_time.strftime('%H:%M:%S')}.",
            reason=evaluation.reason,
            previous_close_time=old_close,
            new_close_time=evaluation.new_close_time,
            created_at=simulated_time,
            metadata_json=json.dumps({
                "carrier_name": temp_quote.carrier_name,
                "quote_id": temp_quote.id,
                "extension_count": rfq.extension_count,
                "simulated": True
            })
        )
        db.add(ext_log)
        extension_info = {
            "extended": True,
            "old_close_time": old_close.isoformat(),
            "new_close_time": evaluation.new_close_time.isoformat(),
            "extension_count": rfq.extension_count,
            "reason": evaluation.reason
        }

    bid_log = RFQActivityLog(
        rfq_id=rfq.id,
        event_type=ActivityEventType.BID_SUBMITTED,
        message=f"[Simulation] Quote of ${total_price:,.2f} submitted by '{temp_quote.carrier_name}'.",
        reason=f"Assigned rank L{temp_quote.rank_at_submission}." if temp_quote.rank_at_submission else None,
        created_at=simulated_time,
        metadata_json=json.dumps({
            "carrier_name": temp_quote.carrier_name,
            "quote_id": temp_quote.id,
            "total_price": total_price,
            "rank": temp_quote.rank_at_submission,
            "simulated": True
        })
    )
    db.add(bid_log)

    db.commit()
    db.refresh(temp_quote)
    db.refresh(rfq)

    # Broadcast via WebSocket
    broadcast_payload = {
        "type": "NEW_BID",
        "rfq_id": rfq.id,
        "quote": {
            "id": temp_quote.id,
            "carrier_name": temp_quote.carrier_name,
            "total_price": temp_quote.total_price,
            "rank": temp_quote.rank_at_submission,
            "freight_charges": temp_quote.freight_charges,
            "origin_charges": temp_quote.origin_charges,
            "destination_charges": temp_quote.destination_charges,
            "submitted_at": temp_quote.submitted_at.isoformat()
        },
        "current_bid_close_time": rfq.current_bid_close_time.isoformat(),
        "extension_info": extension_info,
        "l1_supplier": evaluation.ranking_result.l1_supplier,
        "l1_price": evaluation.ranking_result.l1_price
    }
    await ws_manager.broadcast_to_rfq(rfq.id, broadcast_payload)

    return QuoteResponse(
        id=temp_quote.id,
        rfq_id=temp_quote.rfq_id,
        carrier_name=temp_quote.carrier_name,
        freight_charges=temp_quote.freight_charges,
        origin_charges=temp_quote.origin_charges,
        destination_charges=temp_quote.destination_charges,
        total_price=temp_quote.total_price,
        transit_time_days=temp_quote.transit_time_days,
        validity_date=temp_quote.validity_date,
        notes=temp_quote.notes,
        rank_at_submission=temp_quote.rank_at_submission,
        current_rank=temp_quote.rank_at_submission,
        submitted_at=temp_quote.submitted_at
    )
