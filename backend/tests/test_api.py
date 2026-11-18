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

def test_quote_submission_and_extension_via_simulation():
    now = datetime.now(timezone.utc)
    start = now - timedelta(minutes=30)
    close = now + timedelta(minutes=10)
    forced = close + timedelta(minutes=15)

    rfq_payload = {
        "reference_id": f"RFQ-SIM-{int(now.timestamp())}",
        "title": "Sim Test: Singapore to Rotterdam",
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

    # Submit a quote simulated 2 minutes (120s) before close time (inside 10m window)
    quote_payload = {
        "carrier_name": "Maersk Line",
        "freight_charges": 1200.0,
        "origin_charges": 150.0,
        "destination_charges": 150.0,
        "transit_time_days": 22,
        "seconds_before_close": 120
    }

    sim_res = client.post(f"/api/v1/rfqs/{rfq_id}/simulate-bid", json=quote_payload)
    assert sim_res.status_code == 200, sim_res.text
    quote_data = sim_res.json()
    assert quote_data["total_price"] == 1500.0
    assert quote_data["rank_at_submission"] == 1

    # Check that RFQ was extended by 5 minutes
    detail_res = client.get(f"/api/v1/rfqs/{rfq_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["extension_count"] == 1
    assert detail["lowest_bid_amount"] == 1500.0
    assert detail["lowest_bid_carrier"] == "Maersk Line"

    # Verify activity logs contain TIME_EXTENSION
    logs = detail["activity_logs"]
    events = [l["event_type"] for l in logs]
    assert "TIME_EXTENSION" in events
    assert "BID_SUBMITTED" in events
