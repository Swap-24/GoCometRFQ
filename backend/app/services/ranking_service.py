from typing import Sequence
from app.models.quote import Quote

class RankingResult:
    def __init__(
        self,
        rankings: list[dict],
        l1_supplier: str | None,
        l1_price: float | None,
        any_rank_changed: bool,
        l1_changed: bool,
        rank_change_summary: str | None
    ):
        self.rankings = rankings
        self.l1_supplier = l1_supplier
        self.l1_price = l1_price
        self.any_rank_changed = any_rank_changed
        self.l1_changed = l1_changed
        self.rank_change_summary = rank_change_summary

class RankingService:
    @staticmethod
    def get_supplier_best_quotes(quotes: Sequence[Quote]) -> list[dict]:
        """
        Groups quotes by supplier/carrier and takes each carrier's best (lowest total_price) quote.
        Returns a list sorted by total_price ascending (L1, L2, L3...).
        """
        best_by_carrier: dict[str, Quote] = {}
        for quote in quotes:
            carrier = quote.carrier_name.strip()
            if carrier not in best_by_carrier or quote.total_price < best_by_carrier[carrier].total_price:
                best_by_carrier[carrier] = quote

        # Sort carriers by lowest price ascending
        sorted_quotes = sorted(best_by_carrier.values(), key=lambda q: (q.total_price, q.submitted_at))

        ranked = []
        for index, q in enumerate(sorted_quotes, start=1):
            ranked.append({
                "rank": index,
                "carrier_name": q.carrier_name,
                "total_price": q.total_price,
                "quote_id": q.id,
                "freight_charges": q.freight_charges,
                "origin_charges": q.origin_charges,
                "destination_charges": q.destination_charges,
                "transit_time_days": q.transit_time_days,
            })
        return ranked

    @classmethod
    def evaluate_rank_changes(
        cls,
        existing_quotes: Sequence[Quote],
        new_quote: Quote
    ) -> RankingResult:
        """
        Compares carrier rankings before vs after adding a new quote.
        Detects whether any carrier's rank changed or if the L1 leader changed.
        """
        # Previous rankings
        previous_ranked = cls.get_supplier_best_quotes(existing_quotes)
        prev_carrier_ranks = {item["carrier_name"]: item["rank"] for item in previous_ranked}
        prev_l1 = previous_ranked[0] if previous_ranked else None

        # New rankings with the new quote included
        combined = list(existing_quotes) + [new_quote]
        new_ranked = cls.get_supplier_best_quotes(combined)
        new_carrier_ranks = {item["carrier_name"]: item["rank"] for item in new_ranked}
        new_l1 = new_ranked[0] if new_ranked else None

        # Check L1 change
        l1_changed = False
        if prev_l1 is None and new_l1 is not None:
            l1_changed = True
        elif prev_l1 is not None and new_l1 is not None:
            if (new_l1["carrier_name"] != prev_l1["carrier_name"]) or (new_l1["total_price"] < prev_l1["total_price"]):
                l1_changed = True

        # Check if ANY rank changed
        any_rank_changed = False
        changes = []
        for carrier, new_rank in new_carrier_ranks.items():
            old_rank = prev_carrier_ranks.get(carrier)
            if old_rank is None:
                # Brand new supplier entered
                any_rank_changed = True
                changes.append(f"{carrier} entered at L{new_rank}")
            elif old_rank != new_rank:
                any_rank_changed = True
                direction = "improved to" if new_rank < old_rank else "dropped to"
                changes.append(f"{carrier} {direction} L{new_rank} (from L{old_rank})")

        rank_change_summary = "; ".join(changes) if changes else None

        return RankingResult(
            rankings=new_ranked,
            l1_supplier=new_l1["carrier_name"] if new_l1 else None,
            l1_price=new_l1["total_price"] if new_l1 else None,
            any_rank_changed=any_rank_changed,
            l1_changed=l1_changed,
            rank_change_summary=rank_change_summary
        )
