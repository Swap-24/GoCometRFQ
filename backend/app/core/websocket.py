from collections import defaultdict
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("websocket")

class ConnectionManager:
    def __init__(self):
        # Map of rfq_id -> set of active WebSockets
        self.active_rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, rfq_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_rooms[rfq_id].add(websocket)
        logger.info(f"WebSocket client connected to RFQ room {rfq_id}. Active: {len(self.active_rooms[rfq_id])}")

    def disconnect(self, rfq_id: str, websocket: WebSocket):
        if rfq_id in self.active_rooms and websocket in self.active_rooms[rfq_id]:
            self.active_rooms[rfq_id].remove(websocket)
            if not self.active_rooms[rfq_id]:
                del self.active_rooms[rfq_id]
        logger.info(f"WebSocket client disconnected from RFQ room {rfq_id}")

    async def broadcast_to_rfq(self, rfq_id: str, message: dict):
        if rfq_id not in self.active_rooms:
            return
        
        dead_sockets = set()
        for connection in list(self.active_rooms[rfq_id]):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send to client in {rfq_id}: {e}")
                dead_sockets.add(connection)

        for dead in dead_sockets:
            self.disconnect(rfq_id, dead)

ws_manager = ConnectionManager()
