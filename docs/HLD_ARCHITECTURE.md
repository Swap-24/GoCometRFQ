# High-Level Design (HLD): British Reverse Auction in RFQ System

## 1. System Overview & Context

This system implements a specialized **Request for Quotation (RFQ)** platform featuring **British Reverse Auction** bidding mechanics. 

In freight logistics and procurement, buyers publish RFQs for shipping routes (e.g., *20x 40ft containers from Shanghai to Rotterdam*). Competing carriers and freight suppliers submit quotations where **lower total landed costs win (Rank L1)**.

To eliminate **"bid sniping"** (submitting bids at the very last second so competitors cannot respond), the British Auction introduces an automatic dynamic extension window bounded by an inviolable **Forced Bid Close Time** hard ceiling.

---

## 2. System Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["Frontend Client (React 18 + Vite + Tailwind CSS)"]
        UI_List["RFQ Listing Page<br/>(Metrics, Filter, Countdown Ticker)"]
        UI_Room["Live Auction Room<br/>(L1-Ln Board, Charges Breakdown)"]
        UI_Modal["RFQ Creation Modal<br/>(X/Y Window Config, Validation)"]
        UI_Quote["Supplier Quote Console<br/>(Live Landed Price & Rank Preview)"]
        WS_Client["WebSocket Client<br/>(Auto Reconnect, Room Subscription)"]
    end

    subgraph APILayer["FastAPI Application Server"]
        HTTP_Router["REST API Router (/api/v1)"]
        WS_Broker["WebSocket Connection Manager"]
        
        subgraph Engine["British Auction Core Engine"]
            TimingGuard["Timing Guard<br/>(Before Start, After Close, After Forced)"]
            WindowDetector["Trigger Window Detector<br/>(now in [T_close - X, T_close])"]
            RuleEvaluator["Extension Trigger Evaluator<br/>(BID_RECEIVED | ANY_RANK_CHANGE | L1_RANK_CHANGE)"]
            CeilingClamper["Ceiling Clamper<br/>min(T_close + Y, T_forced)"]
            RankService["Dynamic Supplier Ranking (L1..Ln)"]
        end
    end

    subgraph StorageLayer["PostgreSQL Relational Database"]
        T_RFQS[("rfqs<br/>Deadlines, Status, Counters, Rules")]
        T_QUOTES[("quotes<br/>Freight, Origin, Dest, Landed Total")]
        T_LOGS[("rfq_activity_logs<br/>Extensions, Reasons, Timestamps")]
    end

    UI_List -->|HTTP GET /rfqs| HTTP_Router
    UI_Room -->|HTTP GET /rfqs/:id| HTTP_Router
    UI_Modal -->|HTTP POST /rfqs| HTTP_Router
    UI_Quote -->|HTTP POST /rfqs/:id/quotes| HTTP_Router
    WS_Client <-->|WSS /rfqs/:id/ws| WS_Broker

    HTTP_Router --> Engine
    Engine --> StorageLayer
    Engine -.Broadcast Event.-> WS_Broker
```

---

## 3. Core British Reverse Auction Algorithm

### Trigger Window & Extension Parameters
- **Trigger Window ($X$ minutes)**: The time interval immediately preceding the current close time: $[T_{\text{close}} - X, T_{\text{close}})$.
- **Extension Duration ($Y$ minutes)**: The duration added to the close time when a trigger condition occurs: $T_{\text{close}} \leftarrow T_{\text{close}} + Y$.
- **Hard Forced Close Ceiling ($T_{\text{forced}}$)**: The absolute maximum time beyond which the auction cannot extend under any circumstance.

### Mathematical State Equation
$$\text{New Close Time} = \min(T_{\text{close}} + Y, T_{\text{forced}})$$

If $T_{\text{close}} \ge T_{\text{forced}}$, the auction is at its ceiling and no further extension is granted.

```mermaid
sequenceDiagram
    autonumber
    actor Supplier as Supplier / Carrier
    participant API as FastAPI Router
    participant Engine as Auction Engine
    participant DB as PostgreSQL
    participant WS as WebSocket Clients

    Supplier->>API: POST /rfqs/{id}/quotes (Carrier, Freight, Origin, Dest)
    API->>DB: Lock RFQ row (SELECT ... FOR UPDATE)
    API->>Engine: evaluate_bid_submission(rfq, existing_quotes, new_quote, now)
    
    alt now < bid_start_time
        Engine-->>API: Raise AuctionNotStartedError
        API-->>Supplier: 400 Bad Request
    else now >= forced_close OR now >= current_close
        Engine-->>API: Raise AuctionClosedError
        API-->>Supplier: 400 Bad Request
    else Inside Trigger Window [current_close - X, current_close)
        Engine->>Engine: Check trigger condition (BID_RECEIVED | ANY_RANK | L1_CHANGE)
        alt Trigger Matched
            Engine->>Engine: new_close = min(current_close + Y, forced_close)
            Engine-->>API: ExtensionEvaluation(should_extend=True, new_close, reason)
            API->>DB: UPDATE rfqs SET current_bid_close_time = new_close, extension_count += 1
            API->>DB: INSERT INTO rfq_activity_logs (TIME_EXTENSION, reason)
        else Trigger Not Matched
            Engine-->>API: ExtensionEvaluation(should_extend=False)
        end
    end

    API->>DB: INSERT INTO quotes (...)
    API->>DB: INSERT INTO rfq_activity_logs (BID_SUBMITTED, ...)
    API->>DB: COMMIT TRANSACTION
    API->>WS: Broadcast NEW_BID + Extension payload
    API-->>Supplier: 201 Created (QuoteResponse with Rank)
```

---

## 4. Trigger Modes Comparison

1. **`BID_RECEIVED` (Any Bid in Window)**:
   - Any quote submitted during the last $X$ minutes causes an automatic extension by $Y$ minutes, regardless of whether it is higher or lower than existing quotes.
2. **`ANY_RANK_CHANGE` (Rank Displacement in Window)**:
   - Extends the auction if any carrier's relative rank changes (e.g. Carrier B underbids Carrier A to become $L2$, while $L1$ stays intact).
3. **`L1_RANK_CHANGE` (Lowest Bidder Change in Window)**:
   - Extends the auction **only** when a new overall lowest quote ($L1$) emerges during the last $X$ minutes.

---

## 5. Concurrency & Data Integrity Strategy

- **Row-Level Locking**: Quote submission operations acquire an exclusive row lock (`with_for_update()`) on the target RFQ. This prevents race conditions when two suppliers submit competing bids simultaneously at the exact millisecond of deadline.
- **Strict Timezone Handling**: All timestamps are normalized and compared in UTC (`datetime.now(timezone.utc)`).
- **Audit Immutability**: All status transitions, price changes, and extension rationales are persisted in `rfq_activity_logs`.
