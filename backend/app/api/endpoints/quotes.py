from datetime import datetime, timezone
import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.websocket import ws_manager
from app.models.rfq import RFQ
from app.models.quote import Quote
from app.models.activity_log import RFQActivityLog
from app.models.enums import AuctionStatus, ActivityEventType
from app.schemas.quote import QuoteCreate, QuoteResponse
from app.services.auction_engine import (
    AuctionEngine,
    AuctionEngineError,
    AuctionNotStartedError,
    AuctionClosedError,
)

router = APIRouter()

@router.post("/{rfq_id}/quotes", response_model=QuoteResponse, status_code=status.HTTP_201_CREATED)
async def submit_quote(
    rfq_id: str,
    quote_in: QuoteCreate,
    db: Session = Depends(get_db)
):
    # Lock RFQ row for update to ensure atomic extension evaluation
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).with_for_update().first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    now = datetime.now(timezone.utc)
    
    # Check effective status
    effective_status = rfq.get_effective_status(now)
    if effective_status == AuctionStatus.UPCOMING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Auction has not started yet. Bidding opens at {rfq.bid_start_time.isoformat()}."
        )
    elif effective_status in (AuctionStatus.CLOSED, AuctionStatus.FORCE_CLOSED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Auction is closed for bidding (Status: {effective_status.value})."
        )

    # Compute total price
    total_price = round(quote_in.freight_charges + quote_in.origin_charges + quote_in.destination_charges, 2)

    # Prepare Quote instance for engine evaluation
    temp_quote = Quote(
        rfq_id=rfq.id,
        carrier_name=quote_in.carrier_name.strip(),
        freight_charges=quote_in.freight_charges,
        origin_charges=quote_in.origin_charges,
        destination_charges=quote_in.destination_charges,
        total_price=total_price,
        transit_time_days=quote_in.transit_time_days,
        validity_date=quote_in.validity_date,
        notes=quote_in.notes,
        submitted_at=now
    )

    # Evaluate extension rules with the Auction Engine
    try:
        evaluation = AuctionEngine.evaluate_bid_submission(
            rfq=rfq,
            existing_quotes=rfq.quotes,
            new_quote=temp_quote,
            submission_time=now
        )
    except AuctionEngineError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Determine rank at submission
    temp_quote.rank_at_submission = next(
        (item["rank"] for item in evaluation.ranking_result.rankings if item["carrier_name"] == temp_quote.carrier_name),
        None
    )
    db.add(temp_quote)
    db.flush()

    # 1. Handle Time Extension if triggered
    extension_info = None
    if evaluation.should_extend:
        old_close = rfq.current_bid_close_time
        rfq.current_bid_close_time = evaluation.new_close_time
        rfq.extension_count += 1
        db.add(rfq)

        ext_log = RFQActivityLog(
            rfq_id=rfq.id,
            event_type=ActivityEventType.TIME_EXTENSION,
            message=f"Auction extended from {old_close.strftime('%H:%M:%S')} to {evaluation.new_close_time.strftime('%H:%M:%S')}.",
            reason=evaluation.reason,
            previous_close_time=old_close,
            new_close_time=evaluation.new_close_time,
            metadata_json=json.dumps({
                "carrier_name": temp_quote.carrier_name,
                "quote_id": temp_quote.id,
                "extension_count": rfq.extension_count,
                "is_capped": evaluation.is_capped_by_forced_close
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

    # 2. Record Bid Submission Activity Log
    bid_log = RFQActivityLog(
        rfq_id=rfq.id,
        event_type=ActivityEventType.BID_SUBMITTED,
        message=f"Quote of ${total_price:,.2f} submitted by '{temp_quote.carrier_name}'.",
        reason=f"Assigned rank L{temp_quote.rank_at_submission}." if temp_quote.rank_at_submission else None,
        metadata_json=json.dumps({
            "carrier_name": temp_quote.carrier_name,
            "quote_id": temp_quote.id,
            "total_price": total_price,
            "rank": temp_quote.rank_at_submission,
            "freight": temp_quote.freight_charges,
            "origin": temp_quote.origin_charges,
            "destination": temp_quote.destination_charges
        })
    )
    db.add(bid_log)

    db.commit()
    db.refresh(temp_quote)
    db.refresh(rfq)

    # 3. Broadcast real-time event to all clients viewing this RFQ
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
