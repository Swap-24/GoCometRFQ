from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_db
from app.models.rfq import RFQ
from app.models.quote import Quote
from app.models.activity_log import RFQActivityLog
from app.models.enums import AuctionStatus, ActivityEventType
from app.schemas.rfq import RFQCreate, RFQListItem, RFQDetail
from app.services.ranking_service import RankingService

router = APIRouter()

def sync_rfq_status(rfq: RFQ, db: Session, now: datetime | None = None) -> AuctionStatus:
    """Updates and saves the effective status of the RFQ if changed."""
    effective_status = rfq.get_effective_status(now)
    if rfq.status != effective_status:
        old_status = rfq.status
        rfq.status = effective_status
        db.add(rfq)
        
        # Log status transition
        if effective_status in (AuctionStatus.CLOSED, AuctionStatus.FORCE_CLOSED):
            event = ActivityEventType.AUCTION_FORCE_CLOSED if effective_status == AuctionStatus.FORCE_CLOSED else ActivityEventType.AUCTION_CLOSED
            log = RFQActivityLog(
                rfq_id=rfq.id,
                event_type=event,
                message=f"Auction transitioned to {effective_status.value} (was {old_status.value}).",
                reason="Auction reached close deadline."
            )
            db.add(log)
        db.commit()
        db.refresh(rfq)
    return rfq.status

@router.post("/", response_model=RFQDetail, status_code=status.HTTP_201_CREATED)
def create_rfq(rfq_in: RFQCreate, db: Session = Depends(get_db)):
    # Check if reference_id is already in use
    existing = db.query(RFQ).filter(RFQ.reference_id == rfq_in.reference_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An RFQ with Reference ID '{rfq_in.reference_id}' already exists."
        )

    now = datetime.now(timezone.utc)
    
    rfq = RFQ(
        reference_id=rfq_in.reference_id,
        title=rfq_in.title,
        description=rfq_in.description,
        pickup_service_date=rfq_in.pickup_service_date,
        bid_start_time=rfq_in.bid_start_time,
        initial_bid_close_time=rfq_in.initial_bid_close_time,
        current_bid_close_time=rfq_in.initial_bid_close_time,
        forced_bid_close_time=rfq_in.forced_bid_close_time,
        is_british_auction=rfq_in.is_british_auction,
        trigger_window_minutes=rfq_in.trigger_window_minutes,
        extension_duration_minutes=rfq_in.extension_duration_minutes,
        extension_trigger_type=rfq_in.extension_trigger_type,
        status=AuctionStatus.UPCOMING
    )
    # Determine initial status
    rfq.status = rfq.get_effective_status(now)
    db.add(rfq)
    db.flush()

    # Create initial activity log
    init_log = RFQActivityLog(
        rfq_id=rfq.id,
        event_type=ActivityEventType.AUCTION_CREATED,
        message=f"British Auction RFQ created ({rfq.reference_id}).",
        reason=(
            f"Configured with Trigger Window X={rfq.trigger_window_minutes}m, "
            f"Extension Duration Y={rfq.extension_duration_minutes}m, "
            f"Trigger Rule: {rfq.extension_trigger_type.value}."
        )
    )
    db.add(init_log)
    db.commit()
    db.refresh(rfq)

    return get_rfq_detail(rfq.id, db)

@router.get("/", response_model=list[RFQListItem])
def list_rfqs(
    status_filter: AuctionStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    query = db.query(RFQ)

    if search:
        query = query.filter(
            (RFQ.reference_id.ilike(f"%{search}%")) | (RFQ.title.ilike(f"%{search}%"))
        )

    rfqs = query.order_by(desc(RFQ.created_at)).all()
    results = []

    for rfq in rfqs:
        sync_rfq_status(rfq, db, now)

        if status_filter and rfq.status != status_filter:
            continue

        # Compute summary metrics
        best_quotes = RankingService.get_supplier_best_quotes(rfq.quotes)
        l1 = best_quotes[0] if best_quotes else None
        
        current_close = rfq.current_bid_close_time
        if current_close.tzinfo is None:
            current_close = current_close.replace(tzinfo=timezone.utc)
        
        time_rem = (current_close - now).total_seconds()

        results.append(RFQListItem(
            id=rfq.id,
            reference_id=rfq.reference_id,
            title=rfq.title,
            pickup_service_date=rfq.pickup_service_date,
            bid_start_time=rfq.bid_start_time,
            current_bid_close_time=rfq.current_bid_close_time,
            forced_bid_close_time=rfq.forced_bid_close_time,
            is_british_auction=rfq.is_british_auction,
            trigger_window_minutes=rfq.trigger_window_minutes,
            extension_duration_minutes=rfq.extension_duration_minutes,
            extension_trigger_type=rfq.extension_trigger_type,
            status=rfq.status,
            extension_count=rfq.extension_count,
            lowest_bid_amount=l1["total_price"] if l1 else None,
            lowest_bid_carrier=l1["carrier_name"] if l1 else None,
            total_bids_count=len(rfq.quotes),
            time_remaining_seconds=max(0.0, time_rem) if rfq.status == AuctionStatus.ACTIVE else 0.0,
            created_at=rfq.created_at,
            updated_at=rfq.updated_at
        ))

    return results

@router.get("/{rfq_id}", response_model=RFQDetail)
def get_rfq_detail(rfq_id: str, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="RFQ not found")

    now = datetime.now(timezone.utc)
    sync_rfq_status(rfq, db, now)

    # Calculate live ranks for all quotes
    best_quotes = RankingService.get_supplier_best_quotes(rfq.quotes)
    carrier_rank_map = {item["carrier_name"]: item["rank"] for item in best_quotes}
    l1 = best_quotes[0] if best_quotes else None

    current_close = rfq.current_bid_close_time
    if current_close.tzinfo is None:
        current_close = current_close.replace(tzinfo=timezone.utc)
    time_rem = (current_close - now).total_seconds()

    # Format quotes with current_rank
    formatted_quotes = []
    for q in rfq.quotes:
        q_dict = {
            "id": q.id,
            "rfq_id": q.rfq_id,
            "carrier_name": q.carrier_name,
            "freight_charges": q.freight_charges,
            "origin_charges": q.origin_charges,
            "destination_charges": q.destination_charges,
            "total_price": q.total_price,
            "transit_time_days": q.transit_time_days,
            "validity_date": q.validity_date,
            "notes": q.notes,
            "rank_at_submission": q.rank_at_submission,
            "current_rank": carrier_rank_map.get(q.carrier_name),
            "submitted_at": q.submitted_at
        }
        formatted_quotes.append(q_dict)

    # Sort formatted quotes: best quote first
    formatted_quotes.sort(key=lambda x: (x["total_price"], x["submitted_at"]))

    return RFQDetail(
        id=rfq.id,
        reference_id=rfq.reference_id,
        title=rfq.title,
        description=rfq.description,
        pickup_service_date=rfq.pickup_service_date,
        bid_start_time=rfq.bid_start_time,
        initial_bid_close_time=rfq.initial_bid_close_time,
        current_bid_close_time=rfq.current_bid_close_time,
        forced_bid_close_time=rfq.forced_bid_close_time,
        is_british_auction=rfq.is_british_auction,
        trigger_window_minutes=rfq.trigger_window_minutes,
        extension_duration_minutes=rfq.extension_duration_minutes,
        extension_trigger_type=rfq.extension_trigger_type,
        status=rfq.status,
        extension_count=rfq.extension_count,
        created_at=rfq.created_at,
        updated_at=rfq.updated_at,
        lowest_bid_amount=l1["total_price"] if l1 else None,
        lowest_bid_carrier=l1["carrier_name"] if l1 else None,
        time_remaining_seconds=max(0.0, time_rem) if rfq.status == AuctionStatus.ACTIVE else 0.0,
        quotes=formatted_quotes,
        activity_logs=rfq.activity_logs
    )
