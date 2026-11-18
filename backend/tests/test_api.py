import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_create_and_fetch_rfq():
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=10)
    close = now + timedelta(minutes=60)
    forced = close + timedelta(minutes=30)

    rfq_payload = {
        "reference_id": f"RFQ-API-{int(now.timestamp())}",
        "title": "API Test: Mumbai to Dubai 20ft Dry",
        "description": "Electronics shipment",
        "pickup_service_date": (now + timedelta(days=15)).isoformat(),
        "bid_start_time": start.isoformat(),
        "initial_bid_close_time": close.isoformat(),
        "forced_bid_close_time": forced.isoformat(),
        "is_british_auction": True,
        "trigger_window_minutes": 10,
        "extension_duration_minutes": 5,
        "extension_trigger_type": "L1_RANK_CHANGE"
    }

    create_res = client.post("/api/v1/rfqs/", json=rfq_payload)
    assert create_res.status_code == 201, create_res.text
    data = create_res.json()
    assert data["reference_id"] == rfq_payload["reference_id"]
    rfq_id = data["id"]

    # Verify listing
    list_res = client.get("/api/v1/rfqs/")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(item["id"] == rfq_id for item in items)

    # Verify details
    detail_res = client.get(f"/api/v1/rfqs/{rfq_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["title"] == rfq_payload["title"]
    assert len(detail["activity_logs"]) >= 1

def test_standard_quote_submission():
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=10)
    close = now + timedelta(minutes=60)
    forced = close + timedelta(minutes=30)

    rfq_payload = {
        "reference_id": f"RFQ-QUOTE-{int(now.timestamp())}",
        "title": "Standard Quote Test: Nhava Sheva to Singapore",
        "pickup_service_date": (now + timedelta(days=20)).isoformat(),
        "bid_start_time": start.isoformat(),
        "initial_bid_close_time": close.isoformat(),
        "forced_bid_close_time": forced.isoformat(),
        "is_british_auction": True,
        "trigger_window_minutes": 10,
        "extension_duration_minutes": 5,
        "extension_trigger_type": "BID_RECEIVED"
    }

    create_res = client.post("/api/v1/rfqs/", json=rfq_payload)
    assert create_res.status_code == 201
    rfq_id = create_res.json()["id"]

    # Submit a standard quote
    quote_payload = {
        "carrier_name": "Maersk Line",
        "freight_charges": 1200.0,
        "origin_charges": 150.0,
        "destination_charges": 150.0,
        "transit_time_days": 18,
        "validity_date": (now + timedelta(days=30)).isoformat()
    }

    quote_res = client.post(f"/api/v1/rfqs/{rfq_id}/quotes", json=quote_payload)
    assert quote_res.status_code == 201, quote_res.text
    quote_data = quote_res.json()
    assert quote_data["total_price"] == 1500.0
    assert quote_data["rank_at_submission"] == 1

    # Check details reflect the quote
    detail_res = client.get(f"/api/v1/rfqs/{rfq_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["lowest_bid_amount"] == 1500.0
    assert detail["lowest_bid_carrier"] == "Maersk Line"
    assert len(detail["quotes"]) == 1
    assert any(log["event_type"] == "BID_SUBMITTED" for log in detail["activity_logs"])
