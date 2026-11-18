from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.endpoints import rfqs, quotes, simulation
from app.core.websocket import ws_manager

api_router = APIRouter()

api_router.include_router(rfqs.router, prefix="/rfqs", tags=["RFQs"])
api_router.include_router(quotes.router, prefix="/rfqs", tags=["Quotes"])
api_router.include_router(simulation.router, prefix="/rfqs", tags=["Simulation"])

@api_router.websocket("/rfqs/{rfq_id}/ws")
async def websocket_rfq_endpoint(websocket: WebSocket, rfq_id: str):
    await ws_manager.connect(rfq_id, websocket)
    try:
        while True:
            # Keep connection alive; accept any client pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(rfq_id, websocket)
    except Exception:
        ws_manager.disconnect(rfq_id, websocket)
