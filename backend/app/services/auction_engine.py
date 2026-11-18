from datetime import datetime, timezone, timedelta
from typing import Sequence
from app.models.rfq import RFQ
from app.models.quote import Quote
from app.models.enums import ExtensionTriggerType, AuctionStatus
from app.services.ranking_service import RankingService, RankingResult

class AuctionEngineError(Exception):
    """Base exception for auction engine errors."""
    pass

class AuctionNotStartedError(AuctionEngineError):
    pass

class AuctionClosedError(AuctionEngineError):
    pass

class ExtensionEvaluation:
    def __init__(
        self,
        should_extend: bool,
        old_close_time: datetime,
        new_close_time: datetime,
        reason: str | None,
        is_capped_by_forced_close: bool,
        ranking_result: RankingResult
    ):
        self.should_extend = should_extend
        self.old_close_time = old_close_time
        self.new_close_time = new_close_time
        self.reason = reason
        self.is_capped_by_forced_close = is_capped_by_forced_close
        self.ranking_result = ranking_result

class AuctionEngine:
    @staticmethod
    def to_utc(dt: datetime) -> datetime:
        """Helper to ensure datetime is timezone-aware in UTC."""
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @classmethod
    def evaluate_bid_submission(
        cls,
        rfq: RFQ,
        existing_quotes: Sequence[Quote],
        new_quote: Quote,
        submission_time: datetime | None = None
    ) -> ExtensionEvaluation:
        """
        Evaluates a newly placed quote against the British Reverse Auction rules.
        Validates auction window, evaluates trigger modes, and computes extended close time
        clamped strictly by forced_bid_close_time.
        """
        if submission_time is None:
            submission_time = datetime.now(timezone.utc)
        else:
            submission_time = cls.to_utc(submission_time)

        start_time = cls.to_utc(rfq.bid_start_time)
        current_close = cls.to_utc(rfq.current_bid_close_time)
        forced_close = cls.to_utc(rfq.forced_bid_close_time)

        # 1. Validation checks on auction timing
        if submission_time < start_time:
            raise AuctionNotStartedError(
                f"Auction for RFQ '{rfq.reference_id}' has not started yet. Bidding opens at {start_time.isoformat()}."
            )

        if submission_time >= forced_close:
            raise AuctionClosedError(
                f"Auction for RFQ '{rfq.reference_id}' reached Forced Bid Close Time ({forced_close.isoformat()}). Bidding is permanently closed."
            )

        if submission_time >= current_close:
            raise AuctionClosedError(
                f"Auction for RFQ '{rfq.reference_id}' closed at {current_close.isoformat()}. No more bids are accepted."
            )

        # 2. Evaluate rankings
        ranking_result = RankingService.evaluate_rank_changes(existing_quotes, new_quote)

        # 3. If British Auction is disabled, no extensions happen
        if not rfq.is_british_auction:
            return ExtensionEvaluation(
                should_extend=False,
                old_close_time=current_close,
                new_close_time=current_close,
                reason="British Auction extension disabled for this RFQ.",
                is_capped_by_forced_close=False,
                ranking_result=ranking_result
            )

        # 4. Check if submission is within the trigger window [current_close - X, current_close)
        window_delta = timedelta(minutes=rfq.trigger_window_minutes)
        window_start = current_close - window_delta

        if submission_time < window_start:
            # Bid placed before trigger window
            return ExtensionEvaluation(
                should_extend=False,
                old_close_time=current_close,
                new_close_time=current_close,
                reason=f"Bid submitted outside trigger window (Window starts {window_start.isoformat()}).",
                is_capped_by_forced_close=False,
                ranking_result=ranking_result
            )

        # 5. Check if current close is ALREADY at or beyond forced close ceiling
        if current_close >= forced_close:
            return ExtensionEvaluation(
                should_extend=False,
                old_close_time=current_close,
                new_close_time=current_close,
                reason="Auction already at Forced Bid Close Time ceiling. No further extensions permitted.",
                is_capped_by_forced_close=True,
                ranking_result=ranking_result
            )

        # 6. Evaluate trigger condition
        trigger_matched = False
        trigger_reason = ""

        if rfq.extension_trigger_type == ExtensionTriggerType.BID_RECEIVED:
            trigger_matched = True
            trigger_reason = (
                f"Bid of ${new_quote.total_price:,.2f} placed by '{new_quote.carrier_name}' "
                f"within the last {rfq.trigger_window_minutes} minutes."
            )

        elif rfq.extension_trigger_type == ExtensionTriggerType.ANY_RANK_CHANGE:
            if ranking_result.any_rank_changed:
                trigger_matched = True
                trigger_reason = (
                    f"Supplier ranking shift in last {rfq.trigger_window_minutes} minutes: "
                    f"{ranking_result.rank_change_summary}"
                )
            else:
                trigger_reason = "Bid did not alter any supplier rankings."

        elif rfq.extension_trigger_type == ExtensionTriggerType.L1_RANK_CHANGE:
            if ranking_result.l1_changed:
                trigger_matched = True
                trigger_reason = (
                    f"New lowest bidder (L1) emerged in last {rfq.trigger_window_minutes} minutes: "
                    f"'{ranking_result.l1_supplier}' with ${ranking_result.l1_price:,.2f}."
                )
            else:
                trigger_reason = "Bid did not displace the L1 lowest bidder."

        if not trigger_matched:
            return ExtensionEvaluation(
                should_extend=False,
                old_close_time=current_close,
                new_close_time=current_close,
                reason=trigger_reason,
                is_capped_by_forced_close=False,
                ranking_result=ranking_result
            )

        # 7. Calculate extension clamped by Forced Close Time
        extension_delta = timedelta(minutes=rfq.extension_duration_minutes)
        proposed_close = current_close + extension_delta
        clamped_close = min(proposed_close, forced_close)
        is_capped = proposed_close > forced_close

        if clamped_close > current_close:
            final_reason = f"Auction extended by {rfq.extension_duration_minutes} minutes. Reason: {trigger_reason}"
            if is_capped:
                final_reason += " (Clamped to Forced Bid Close Time ceiling)."

            return ExtensionEvaluation(
                should_extend=True,
                old_close_time=current_close,
                new_close_time=clamped_close,
                reason=final_reason,
                is_capped_by_forced_close=is_capped,
                ranking_result=ranking_result
            )
        else:
            return ExtensionEvaluation(
                should_extend=False,
                old_close_time=current_close,
                new_close_time=current_close,
                reason="Trigger condition met, but close time is already at Forced Bid Close Time ceiling.",
                is_capped_by_forced_close=True,
                ranking_result=ranking_result
            )
