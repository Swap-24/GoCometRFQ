import pytest
from datetime import datetime, timezone, timedelta
from app.models.rfq import RFQ
from app.models.quote import Quote
from app.models.enums import ExtensionTriggerType, AuctionStatus
from app.services.auction_engine import (
    AuctionEngine,
    AuctionNotStartedError,
    AuctionClosedError,
)

def create_sample_rfq(
    trigger_type: ExtensionTriggerType = ExtensionTriggerType.BID_RECEIVED,
    window_minutes: int = 10,
    extension_minutes: int = 5,
    duration_hours: int = 2,
    forced_extra_hours: int = 1
) -> RFQ:
    start = datetime(2026, 11, 18, 10, 0, 0, tzinfo=timezone.utc)
    close = start + timedelta(hours=duration_hours)  # 12:00:00
    forced = close + timedelta(hours=forced_extra_hours)  # 13:00:00

    return RFQ(
        id="rfq-test-1",
        reference_id="RFQ-TEST-001",
        title="Shanghai to Rotterdam 40ft HC",
        pickup_service_date=datetime(2026, 12, 1, 0, 0, 0, tzinfo=timezone.utc),
        bid_start_time=start,
        initial_bid_close_time=close,
        current_bid_close_time=close,
        forced_bid_close_time=forced,
        is_british_auction=True,
        trigger_window_minutes=window_minutes,
        extension_duration_minutes=extension_minutes,
        extension_trigger_type=trigger_type,
        status=AuctionStatus.ACTIVE
    )

def test_bid_before_auction_start_raises_error():
    rfq = create_sample_rfq()
    bid_time = rfq.bid_start_time - timedelta(minutes=5)
    quote = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", freight_charges=1000, origin_charges=100, destination_charges=100, total_price=1200, transit_time_days=25, validity_date=rfq.pickup_service_date)

    with pytest.raises(AuctionNotStartedError):
        AuctionEngine.evaluate_bid_submission(rfq, [], quote, submission_time=bid_time)

def test_bid_after_auction_closed_raises_error():
    rfq = create_sample_rfq()
    bid_time = rfq.current_bid_close_time + timedelta(seconds=1)
    quote = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", freight_charges=1000, origin_charges=100, destination_charges=100, total_price=1200, transit_time_days=25, validity_date=rfq.pickup_service_date)

    with pytest.raises(AuctionClosedError):
        AuctionEngine.evaluate_bid_submission(rfq, [], quote, submission_time=bid_time)

def test_bid_outside_trigger_window_no_extension():
    # Close is 12:00, Window is 10 min (11:50 - 12:00). Bid placed at 11:45.
    rfq = create_sample_rfq(trigger_type=ExtensionTriggerType.BID_RECEIVED, window_minutes=10, extension_minutes=5)
    bid_time = datetime(2026, 11, 18, 11, 45, 0, tzinfo=timezone.utc)
    quote = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", freight_charges=1000, origin_charges=100, destination_charges=100, total_price=1200, transit_time_days=25, validity_date=rfq.pickup_service_date)

    result = AuctionEngine.evaluate_bid_submission(rfq, [], quote, submission_time=bid_time)
    assert result.should_extend is False
    assert result.new_close_time == rfq.current_bid_close_time

def test_bid_received_trigger_in_window_extends():
    # Close is 12:00. Window is 10 min (11:50 - 12:00). Bid placed at 11:55.
    rfq = create_sample_rfq(trigger_type=ExtensionTriggerType.BID_RECEIVED, window_minutes=10, extension_minutes=5)
    bid_time = datetime(2026, 11, 18, 11, 55, 0, tzinfo=timezone.utc)
    quote = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", freight_charges=1000, origin_charges=100, destination_charges=100, total_price=1200, transit_time_days=25, validity_date=rfq.pickup_service_date)

    result = AuctionEngine.evaluate_bid_submission(rfq, [], quote, submission_time=bid_time)
    assert result.should_extend is True
    # Initial 12:00 + 5 min = 12:05
    expected_close = datetime(2026, 11, 18, 12, 5, 0, tzinfo=timezone.utc)
    assert result.new_close_time == expected_close
    assert "Auction extended by 5 minutes" in result.reason

def test_l1_rank_change_trigger():
    # RFQ with L1_RANK_CHANGE trigger
    rfq = create_sample_rfq(trigger_type=ExtensionTriggerType.L1_RANK_CHANGE, window_minutes=10, extension_minutes=5)
    
    # Existing quote: Maersk at $1,200 (L1)
    q1 = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", freight_charges=1000, origin_charges=100, destination_charges=100, total_price=1200, transit_time_days=25, validity_date=rfq.pickup_service_date, submitted_at=datetime(2026, 11, 18, 10, 30, 0, tzinfo=timezone.utc))

    # Case A: MSC submits $1,300 at 11:56 (Becomes L2, does NOT displace L1)
    q2 = Quote(id="q2", rfq_id=rfq.id, carrier_name="MSC", freight_charges=1100, origin_charges=100, destination_charges=100, total_price=1300, transit_time_days=26, validity_date=rfq.pickup_service_date)
    bid_time_1 = datetime(2026, 11, 18, 11, 56, 0, tzinfo=timezone.utc)

    res1 = AuctionEngine.evaluate_bid_submission(rfq, [q1], q2, submission_time=bid_time_1)
    assert res1.should_extend is False
    assert res1.ranking_result.l1_changed is False

    # Case B: CMA CGM submits $1,150 at 11:58 (Beats Maersk to become new L1)
    q3 = Quote(id="q3", rfq_id=rfq.id, carrier_name="CMA CGM", freight_charges=950, origin_charges=100, destination_charges=100, total_price=1150, transit_time_days=24, validity_date=rfq.pickup_service_date)
    bid_time_2 = datetime(2026, 11, 18, 11, 58, 0, tzinfo=timezone.utc)

    res2 = AuctionEngine.evaluate_bid_submission(rfq, [q1, q2], q3, submission_time=bid_time_2)
    assert res2.should_extend is True
    assert res2.ranking_result.l1_changed is True
    assert res2.ranking_result.l1_supplier == "CMA CGM"
    assert res2.new_close_time == datetime(2026, 11, 18, 12, 5, 0, tzinfo=timezone.utc)

def test_any_rank_change_trigger():
    # RFQ with ANY_RANK_CHANGE trigger
    rfq = create_sample_rfq(trigger_type=ExtensionTriggerType.ANY_RANK_CHANGE, window_minutes=10, extension_minutes=5)

    # Initial state:
    # L1: Maersk ($1,000)
    # L2: MSC ($1,200)
    # L3: Hapag-Lloyd ($1,400)
    q_maersk = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", total_price=1000, freight_charges=800, origin_charges=100, destination_charges=100, transit_time_days=25, validity_date=rfq.pickup_service_date)
    q_msc = Quote(id="q2", rfq_id=rfq.id, carrier_name="MSC", total_price=1200, freight_charges=1000, origin_charges=100, destination_charges=100, transit_time_days=25, validity_date=rfq.pickup_service_date)
    q_hapag = Quote(id="q3", rfq_id=rfq.id, carrier_name="Hapag-Lloyd", total_price=1400, freight_charges=1200, origin_charges=100, destination_charges=100, transit_time_days=25, validity_date=rfq.pickup_service_date)

    # Hapag-Lloyd drops price to $1,100 (Displaces MSC for L2, while Maersk remains L1)
    q_hapag_update = Quote(id="q4", rfq_id=rfq.id, carrier_name="Hapag-Lloyd", total_price=1100, freight_charges=900, origin_charges=100, destination_charges=100, transit_time_days=25, validity_date=rfq.pickup_service_date)
    bid_time = datetime(2026, 11, 18, 11, 55, 0, tzinfo=timezone.utc)

    result = AuctionEngine.evaluate_bid_submission(rfq, [q_maersk, q_msc, q_hapag], q_hapag_update, submission_time=bid_time)
    assert result.should_extend is True
    assert result.ranking_result.any_rank_changed is True
    assert result.ranking_result.l1_changed is False  # L1 did not change, but rank changed!

def test_extension_clamped_by_forced_close_time():
    # Current close: 12:00:00, Forced close: 12:03:00 (only 3 min away)
    # Extension duration: 5 min -> Proposed: 12:05:00
    # Must clamp to 12:03:00!
    rfq = create_sample_rfq(trigger_type=ExtensionTriggerType.BID_RECEIVED, window_minutes=10, extension_minutes=5)
    rfq.forced_bid_close_time = datetime(2026, 11, 18, 12, 3, 0, tzinfo=timezone.utc)

    bid_time = datetime(2026, 11, 18, 11, 55, 0, tzinfo=timezone.utc)
    quote = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", freight_charges=1000, origin_charges=100, destination_charges=100, total_price=1200, transit_time_days=25, validity_date=rfq.pickup_service_date)

    result = AuctionEngine.evaluate_bid_submission(rfq, [], quote, submission_time=bid_time)
    assert result.should_extend is True
    assert result.new_close_time == rfq.forced_bid_close_time
    assert result.is_capped_by_forced_close is True
    assert "Clamped to Forced Bid Close Time ceiling" in result.reason

def test_auction_already_at_forced_close_cannot_extend():
    # Current close is already at forced close
    rfq = create_sample_rfq(trigger_type=ExtensionTriggerType.BID_RECEIVED, window_minutes=10, extension_minutes=5)
    rfq.current_bid_close_time = rfq.forced_bid_close_time

    bid_time = rfq.forced_bid_close_time - timedelta(minutes=2)
    quote = Quote(id="q1", rfq_id=rfq.id, carrier_name="Maersk", freight_charges=1000, origin_charges=100, destination_charges=100, total_price=1200, transit_time_days=25, validity_date=rfq.pickup_service_date)

    result = AuctionEngine.evaluate_bid_submission(rfq, [], quote, submission_time=bid_time)
    assert result.should_extend is False
    assert result.new_close_time == rfq.forced_bid_close_time
    assert "ceiling" in result.reason.lower()
