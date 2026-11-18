# Database Schema Design: British Reverse Auction in RFQ System

## 1. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    RFQS ||--o{ QUOTES : "receives (1:N)"
    RFQS ||--o{ RFQ_ACTIVITY_LOGS : "records (1:N)"

    RFQS {
        VARCHAR(36) id PK "UUID"
        VARCHAR(50) reference_id UK "Unique RFQ Code e.g. RFQ-1042"
        VARCHAR(255) title "RFQ Shipment Description"
        TEXT description "Optional freight notes"
        TIMESTAMPTZ pickup_service_date "Scheduled cargo pickup"
        TIMESTAMPTZ bid_start_time "Bidding open timestamp"
        TIMESTAMPTZ initial_bid_close_time "Originally planned close"
        TIMESTAMPTZ current_bid_close_time "Dynamically extended close"
        TIMESTAMPTZ forced_bid_close_time "Hard ceiling stop"
        BOOLEAN is_british_auction "British extension flag"
        INTEGER trigger_window_minutes "X minutes before close"
        INTEGER extension_duration_minutes "Y minutes per extension"
        VARCHAR(30) extension_trigger_type "BID_RECEIVED | ANY_RANK_CHANGE | L1_RANK_CHANGE"
        VARCHAR(20) status "UPCOMING | ACTIVE | CLOSED | FORCE_CLOSED"
        INTEGER extension_count "Total extensions granted"
        TIMESTAMPTZ created_at "Creation timestamp"
        TIMESTAMPTZ updated_at "Last update timestamp"
    }

    QUOTES {
        VARCHAR(36) id PK "UUID"
        VARCHAR(36) rfq_id FK "References rfqs(id) ON DELETE CASCADE"
        VARCHAR(100) carrier_name "Carrier / Supplier name"
        FLOAT freight_charges "Ocean / Air freight rate"
        FLOAT origin_charges "Origin terminal handling charge"
        FLOAT destination_charges "Destination port clearance charge"
        FLOAT total_price "Landed sum (freight + origin + dest)"
        INTEGER transit_time_days "Transit duration in days"
        TIMESTAMPTZ validity_date "Quote expiration date"
        TEXT notes "Optional carrier terms"
        INTEGER rank_at_submission "Snapshot rank (1 for L1, etc.)"
        TIMESTAMPTZ submitted_at "Submission timestamp"
    }

    RFQ_ACTIVITY_LOGS {
        VARCHAR(36) id PK "UUID"
        VARCHAR(36) rfq_id FK "References rfqs(id) ON DELETE CASCADE"
        VARCHAR(30) event_type "AUCTION_CREATED | BID_SUBMITTED | TIME_EXTENSION | AUCTION_CLOSED | AUCTION_FORCE_CLOSED"
        VARCHAR(255) message "Summary description"
        TEXT reason "Detailed explanation for extension or event"
        TIMESTAMPTZ previous_close_time "Close time before extension"
        TIMESTAMPTZ new_close_time "Close time after extension"
        TEXT metadata_json "JSON payload with prices and rankings"
        TIMESTAMPTZ created_at "Log timestamp"
    }
```

---

## 2. Table Specifications


### Table: `rfqs`
Stores the RFQ specifications, timing windows, British auction configurations, and status.

| Column | Data Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY` | UUID v4 identifier |
| `reference_id` | `VARCHAR(50)` | `UNIQUE`, `NOT NULL`, `INDEX` | Human-readable RFQ code (e.g. `RFQ-2026-001`) |
| `title` | `VARCHAR(255)` | `NOT NULL` | Route and cargo title (e.g. *Shanghai to Rotterdam 40ft HC*) |
| `description` | `TEXT` | `NULLABLE` | Cargo details, packaging specifications |
| `pickup_service_date`| `TIMESTAMPTZ` | `NOT NULL` | Scheduled date for freight pickup |
| `bid_start_time` | `TIMESTAMPTZ` | `NOT NULL` | Timestamp when bidding opens |
| `initial_bid_close_time` | `TIMESTAMPTZ` | `NOT NULL` | Original scheduled auction deadline |
| `current_bid_close_time` | `TIMESTAMPTZ` | `NOT NULL` | Dynamically prolonged deadline |
| `forced_bid_close_time` | `TIMESTAMPTZ` | `NOT NULL` | Inviolable ceiling beyond which auction cannot extend |
| `is_british_auction` | `BOOLEAN` | `DEFAULT TRUE`, `NOT NULL` | Controls if auto-extension is active |
| `trigger_window_minutes` | `INTEGER` | `DEFAULT 10`, `NOT NULL` | $X$: Trigger window prior to deadline |
| `extension_duration_minutes` | `INTEGER` | `DEFAULT 5`, `NOT NULL` | $Y$: Extra minutes added upon trigger |
| `extension_trigger_type` | `VARCHAR(30)` | `NOT NULL` | `BID_RECEIVED`, `ANY_RANK_CHANGE`, or `L1_RANK_CHANGE` |
| `status` | `VARCHAR(20)` | `DEFAULT 'UPCOMING'`, `INDEX` | `UPCOMING`, `ACTIVE`, `CLOSED`, `FORCE_CLOSED` |
| `extension_count` | `INTEGER` | `DEFAULT 0`, `NOT NULL` | Number of extensions granted |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Audit creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Last update timestamp |

### Table: `quotes`
Stores quotations submitted by competing carriers.

| Column | Data Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY` | UUID v4 identifier |
| `rfq_id` | `VARCHAR(36)` | `FOREIGN KEY (rfqs.id)`, `INDEX` | RFQ this quote belongs to |
| `carrier_name` | `VARCHAR(100)` | `NOT NULL`, `INDEX` | Carrier company name (e.g. *Maersk Line*) |
| `freight_charges` | `FLOAT` | `NOT NULL`, `DEFAULT 0.0` | Ocean/air base freight rate |
| `origin_charges` | `FLOAT` | `NOT NULL`, `DEFAULT 0.0` | Origin terminal handling charge (THC) |
| `destination_charges` | `FLOAT` | `NOT NULL`, `DEFAULT 0.0` | Destination clearance and delivery fee |
| `total_price` | `FLOAT` | `NOT NULL`, `INDEX` | Landed price: `freight + origin + destination` |
| `transit_time_days` | `INTEGER` | `NOT NULL` | Estimated transit duration in days |
| `validity_date` | `TIMESTAMPTZ` | `NOT NULL` | Quote validity expiration |
| `notes` | `TEXT` | `NULLABLE` | Terms, equipment availability notes |
| `rank_at_submission` | `INTEGER` | `NULLABLE` | Snapshot rank when submitted (1 for L1) |
| `submitted_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `NOT NULL` | Submission timestamp |

### Table: `rfq_activity_logs`
Chronological audit trail documenting all bids, rank displacements, extensions, and extension reasons.

| Column | Data Type | Constraints / Default | Description |
|---|---|---|---|
| `id` | `VARCHAR(36)` | `PRIMARY KEY` | UUID v4 identifier |
| `rfq_id` | `VARCHAR(36)` | `FOREIGN KEY (rfqs.id)`, `INDEX` | Target RFQ |
| `event_type` | `VARCHAR(30)` | `NOT NULL`, `INDEX` | Event category |
| `message` | `VARCHAR(255)` | `NOT NULL` | Human-readable event headline |
| `reason` | `TEXT` | `NULLABLE` | **Detailed justification for extension** |
| `previous_close_time`| `TIMESTAMPTZ` | `NULLABLE` | Close time before extension |
| `new_close_time` | `TIMESTAMPTZ` | `NULLABLE` | Close time after extension |
| `metadata_json` | `TEXT` | `NULLABLE` | JSON snapshot of delta & ranking shifts |
| `created_at` | `TIMESTAMPTZ` | `DEFAULT NOW()`, `INDEX` | Timestamp of event |

---

## 3. Key Indexes & Optimization

1. **`quotes.total_price ASC`**: Enables instant sorting and dynamic $L1\dots L_n$ ranking determination across high bid volumes.
2. **`quotes.rfq_id`**: Fast foreign key lookup when retrieving all bids for an RFQ room.
3. **`rfqs.reference_id`**: Unique B-tree index for rapid lookups and search filtering.
4. **`rfq_activity_logs.created_at DESC`**: Rapid retrieval of chronological timeline events.
