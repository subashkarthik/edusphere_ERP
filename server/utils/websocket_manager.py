from fastapi import WebSocket
from typing import List, Dict, Any
import json
import asyncio
from config import settings

class ConnectionManager:
    def __init__(self):
        # active_connections: { "user_id": [WebSocket, ...] }
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # broadcast_list: [WebSocket, ...]
        self.broadcast_list: List[WebSocket] = []
        # institutional_rooms: { "org_id": [WebSocket, ...] }
        self.institutional_rooms: Dict[str, List[WebSocket]] = {}
        
        # Redis Pub/Sub support
        self.redis_client = None
        self.pubsub = None
        self.redis_listener_task = None
        self.channel_name = "edusphere_websocket_channel"
        self._is_redis_connected = False

    async def initialize_redis(self):
        """Initialize Redis connection and start listening to the global channel."""
        try:
            import redis.asyncio as aioredis
            self.redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe(self.channel_name)
            self._is_redis_connected = True
            
            # Start background listener task
            self.redis_listener_task = asyncio.create_task(self._listen_redis_channel())
            print("[WS] Connected to Redis Pub/Sub for multi-node event broadcasting.")
        except Exception as e:
            self._is_redis_connected = False
            print(f"[WS WARNING] Failed to connect to Redis: {e}")
            print("[WS WARNING] Falling back to local in-memory WebSocket routing.")

    async def _listen_redis_channel(self):
        """Listen to Redis channel and dispatch messages to local sockets."""
        try:
            while True:
                message = await self.pubsub.get_message(ignore_subscribe_messages=True)
                if message and message.get("type") == "message":
                    payload = json.loads(message["data"])
                    await self._dispatch_local_message(payload)
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[WS ERROR] Exception in Redis listener loop: {e}")
            # Try to reconnect after a short delay
            await asyncio.sleep(5)
            asyncio.create_task(self.initialize_redis())

    async def _dispatch_local_message(self, payload: Dict[str, Any]):
        """Helper to send messages to locally connected clients."""
        msg_type = payload.get("msg_type")
        message = payload.get("message")
        
        if msg_type == "PERSONAL":
            user_id = payload.get("target_id")
            if user_id in self.active_connections:
                for connection in self.active_connections[user_id]:
                    try:
                        await connection.send_text(json.dumps(message))
                    except Exception:
                        pass
        elif msg_type == "INSTITUTION":
            org_id = payload.get("target_id")
            if org_id in self.institutional_rooms:
                for connection in self.institutional_rooms[org_id]:
                    try:
                        await connection.send_text(json.dumps(message))
                    except Exception:
                        pass

    async def connect(self, websocket: WebSocket, user_id: str, org_id: str = "default"):
        await websocket.accept()
        
        # Add to global user connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Add to institutional room
        if org_id not in self.institutional_rooms:
            self.institutional_rooms[org_id] = []
        self.institutional_rooms[org_id].append(websocket)
        
        self.broadcast_list.append(websocket)
        
        # Broadcast pulse to the institution (globally via Redis if available)
        await self.broadcast_pulse(org_id)

    def disconnect(self, websocket: WebSocket, user_id: str, org_id: str = "default"):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        if org_id in self.institutional_rooms:
            if websocket in self.institutional_rooms[org_id]:
                self.institutional_rooms[org_id].remove(websocket)
        
        if websocket in self.broadcast_list:
            self.broadcast_list.remove(websocket)

    async def send_personal_message(self, message: Any, user_id: str):
        payload = {
            "msg_type": "PERSONAL",
            "target_id": user_id,
            "message": message
        }
        
        if self._is_redis_connected:
            try:
                await self.redis_client.publish(self.channel_name, json.dumps(payload))
            except Exception:
                # Fallback to local dispatch
                await self._dispatch_local_message(payload)
        else:
            await self._dispatch_local_message(payload)

    async def broadcast_to_institution(self, message: Any, org_id: str):
        """Enterprise: Broadcast to users within the same tenant, synced via Redis Pub/Sub."""
        payload = {
            "msg_type": "INSTITUTION",
            "target_id": org_id,
            "message": message
        }
        
        if self._is_redis_connected:
            try:
                await self.redis_client.publish(self.channel_name, json.dumps(payload))
            except Exception:
                # Fallback to local dispatch
                await self._dispatch_local_message(payload)
        else:
            await self._dispatch_local_message(payload)

    async def broadcast_pulse(self, org_id: str):
        """Active users count scoped to the institution."""
        active_users = len(self.institutional_rooms.get(org_id, []))
        payload = {
            "type": "LIVE_PULSE",
            "active_users": active_users,
            "org_id": org_id,
            "timestamp": asyncio.get_event_loop().time()
        }
        # To reflect correct counts across nodes when scaling, we broadcast this pulse globally
        await self.broadcast_to_institution(payload, org_id)

manager = ConnectionManager()
