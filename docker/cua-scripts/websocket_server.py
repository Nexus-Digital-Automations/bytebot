#!/usr/bin/env python3
"""
C/ua WebSocket Server
====================

Real-time communication server for C/ua framework integration.
Provides bidirectional WebSocket communication between containerized agents
and native macOS services.

Features:
- Real-time event streaming
- Performance metrics broadcasting
- Service status updates
- Command/response messaging
- Connection management

Author: Claude Code
Version: 1.0.0
"""

import argparse
import asyncio
import json
import logging
import sys
import time
from datetime import datetime
from typing import Dict, Set

import websockets
from websockets.server import WebSocketServerProtocol


class CuaWebSocketServer:
    """C/ua WebSocket Server for real-time communication"""

    def __init__(self, config_path: str):
        self.config_path = config_path
        self.config = self._load_config()

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        self.logger = logging.getLogger("CuaWebSocketServer")

        # Connection management
        self.clients: Set[WebSocketServerProtocol] = set()
        self.client_info: Dict[WebSocketServerProtocol, Dict] = {}

        # Message handling
        self.message_handlers = {
            "ping": self._handle_ping,
            "subscribe": self._handle_subscribe,
            "unsubscribe": self._handle_unsubscribe,
            "get_status": self._handle_get_status,
            "get_metrics": self._handle_get_metrics,
        }

        # Subscription management
        self.subscriptions: Dict[str, Set[WebSocketServerProtocol]] = {
            "metrics": set(),
            "status": set(),
            "alerts": set(),
            "events": set(),
        }

        self.logger.info("C/ua WebSocket Server initialized")

    def _load_config(self) -> Dict:
        """Load configuration from file"""
        try:
            with open(self.config_path) as f:
                return json.load(f)
        except FileNotFoundError:
            self.logger.warning(
                f"Config file not found: {self.config_path}, using defaults"
            )
            return {}
        except json.JSONDecodeError as e:
            self.logger.error(f"Invalid JSON in config file: {e}")
            return {}

    async def register_client(self, websocket: WebSocketServerProtocol, path: str):
        """Register a new WebSocket client"""
        self.clients.add(websocket)
        self.client_info[websocket] = {
            "path": path,
            "connected_at": datetime.now().isoformat(),
            "remote_address": (
                websocket.remote_address[0] if websocket.remote_address else "unknown"
            ),
            "subscriptions": set(),
        }

        client_count = len(self.clients)
        self.logger.info(
            f"Client connected from {websocket.remote_address} - Total clients: {client_count}"
        )

        # Send welcome message
        await self._send_message(
            websocket,
            {
                "type": "welcome",
                "data": {
                    "server": "C/ua WebSocket Server",
                    "version": "1.0.0",
                    "timestamp": datetime.now().isoformat(),
                    "available_subscriptions": list(self.subscriptions.keys()),
                },
            },
        )

    async def unregister_client(self, websocket: WebSocketServerProtocol):
        """Unregister a WebSocket client"""
        if websocket in self.clients:
            self.clients.remove(websocket)

            # Remove from all subscriptions
            client_subscriptions = self.client_info.get(websocket, {}).get(
                "subscriptions", set()
            )
            for subscription_type in client_subscriptions:
                if subscription_type in self.subscriptions:
                    self.subscriptions[subscription_type].discard(websocket)

            # Remove client info
            if websocket in self.client_info:
                del self.client_info[websocket]

            client_count = len(self.clients)
            self.logger.info(f"Client disconnected - Total clients: {client_count}")

    async def _send_message(self, websocket: WebSocketServerProtocol, message: Dict):
        """Send message to a specific client"""
        try:
            await websocket.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            await self.unregister_client(websocket)
        except Exception as e:
            self.logger.error(f"Error sending message: {e}")

    async def broadcast_message(self, message: Dict, subscription_type: str = None):
        """Broadcast message to all clients or specific subscription group"""
        if subscription_type and subscription_type in self.subscriptions:
            clients = self.subscriptions[subscription_type]
        else:
            clients = self.clients

        if not clients:
            return

        # Send to all clients in parallel
        await asyncio.gather(
            *[self._send_message(client, message) for client in clients.copy()],
            return_exceptions=True,
        )

    async def handle_client_message(
        self, websocket: WebSocketServerProtocol, message: str
    ):
        """Handle incoming message from client"""
        try:
            data = json.loads(message)
            message_type = data.get("type")

            if message_type in self.message_handlers:
                await self.message_handlers[message_type](websocket, data)
            else:
                await self._send_message(
                    websocket,
                    {
                        "type": "error",
                        "data": {
                            "message": f"Unknown message type: {message_type}",
                            "timestamp": datetime.now().isoformat(),
                        },
                    },
                )
        except json.JSONDecodeError:
            await self._send_message(
                websocket,
                {
                    "type": "error",
                    "data": {
                        "message": "Invalid JSON message",
                        "timestamp": datetime.now().isoformat(),
                    },
                },
            )
        except Exception as e:
            self.logger.error(f"Error handling client message: {e}")
            await self._send_message(
                websocket,
                {
                    "type": "error",
                    "data": {
                        "message": "Internal server error",
                        "timestamp": datetime.now().isoformat(),
                    },
                },
            )

    async def _handle_ping(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle ping message"""
        await self._send_message(
            websocket,
            {
                "type": "pong",
                "data": {
                    "timestamp": datetime.now().isoformat(),
                    "original_timestamp": data.get("data", {}).get("timestamp"),
                },
            },
        )

    async def _handle_subscribe(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle subscription request"""
        subscription_type = data.get("data", {}).get("subscription_type")

        if subscription_type in self.subscriptions:
            self.subscriptions[subscription_type].add(websocket)
            self.client_info[websocket]["subscriptions"].add(subscription_type)

            await self._send_message(
                websocket,
                {
                    "type": "subscription_confirmed",
                    "data": {
                        "subscription_type": subscription_type,
                        "timestamp": datetime.now().isoformat(),
                    },
                },
            )

            self.logger.debug(f"Client subscribed to {subscription_type}")
        else:
            await self._send_message(
                websocket,
                {
                    "type": "subscription_error",
                    "data": {
                        "message": f"Invalid subscription type: {subscription_type}",
                        "available_types": list(self.subscriptions.keys()),
                        "timestamp": datetime.now().isoformat(),
                    },
                },
            )

    async def _handle_unsubscribe(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle unsubscription request"""
        subscription_type = data.get("data", {}).get("subscription_type")

        if subscription_type in self.subscriptions:
            self.subscriptions[subscription_type].discard(websocket)
            self.client_info[websocket]["subscriptions"].discard(subscription_type)

            await self._send_message(
                websocket,
                {
                    "type": "unsubscription_confirmed",
                    "data": {
                        "subscription_type": subscription_type,
                        "timestamp": datetime.now().isoformat(),
                    },
                },
            )

            self.logger.debug(f"Client unsubscribed from {subscription_type}")

    async def _handle_get_status(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle status request"""
        status_data = {
            "server_status": "running",
            "connected_clients": len(self.clients),
            "subscriptions": {
                subscription_type: len(clients)
                for subscription_type, clients in self.subscriptions.items()
            },
            "uptime_seconds": time.time() - self.start_time,
            "timestamp": datetime.now().isoformat(),
        }

        await self._send_message(
            websocket, {"type": "status_response", "data": status_data}
        )

    async def _handle_get_metrics(self, websocket: WebSocketServerProtocol, data: Dict):
        """Handle metrics request"""
        # This would typically fetch from the performance monitor
        metrics_data = {
            "message": "Metrics endpoint not yet implemented",
            "timestamp": datetime.now().isoformat(),
        }

        await self._send_message(
            websocket, {"type": "metrics_response", "data": metrics_data}
        )

    async def client_handler(self, websocket: WebSocketServerProtocol, path: str):
        """Handle WebSocket client connection"""
        await self.register_client(websocket, path)

        try:
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            self.logger.error(f"Error in client handler: {e}")
        finally:
            await self.unregister_client(websocket)

    async def periodic_broadcast_task(self):
        """Periodic task to broadcast updates"""
        while True:
            try:
                # Broadcast status updates every 30 seconds
                await self.broadcast_status_update()
                await asyncio.sleep(30)

            except Exception as e:
                self.logger.error(f"Error in periodic broadcast: {e}")
                await asyncio.sleep(5)

    async def broadcast_status_update(self):
        """Broadcast current status to subscribed clients"""
        if not self.subscriptions["status"]:
            return

        status_update = {
            "type": "status_update",
            "data": {
                "server_status": "running",
                "connected_clients": len(self.clients),
                "active_subscriptions": sum(
                    len(clients) for clients in self.subscriptions.values()
                ),
                "timestamp": datetime.now().isoformat(),
            },
        }

        await self.broadcast_message(status_update, "status")

    async def start_server(self, host: str = "0.0.0.0", port: int = 9996):
        """Start the WebSocket server"""
        self.start_time = time.time()

        self.logger.info(f"Starting C/ua WebSocket server on {host}:{port}")

        # Start periodic broadcast task
        asyncio.create_task(self.periodic_broadcast_task())

        # Start WebSocket server
        async with websockets.serve(
            self.client_handler,
            host,
            port,
            ping_interval=30,
            ping_timeout=10,
            close_timeout=10,
        ):
            self.logger.info(f"C/ua WebSocket server running on ws://{host}:{port}")

            # Keep the server running
            await asyncio.Future()  # Run forever


# Simple health check HTTP server
async def health_server(port: int = 9996):
    """Simple HTTP server for health checks"""
    import threading
    from http.server import BaseHTTPRequestHandler, HTTPServer

    class HealthHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == "/health":
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                response = {
                    "status": "healthy",
                    "service": "websocket-server",
                    "timestamp": datetime.now().isoformat(),
                }
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *args):
            pass  # Disable logging

    def run_http_server():
        server = HTTPServer(
            ("", port + 1000), HealthHandler
        )  # Use port+1000 for HTTP health
        server.serve_forever()

    # Start HTTP server in background thread
    http_thread = threading.Thread(target=run_http_server, daemon=True)
    http_thread.start()


async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="C/ua WebSocket Server")
    parser.add_argument(
        "--config",
        default="/opt/cua/config/agent-config.json",
        help="Path to configuration file",
    )
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=9996, help="Port to run on")

    args = parser.parse_args()

    # Initialize server
    server = CuaWebSocketServer(args.config)

    # Start health check HTTP server
    await health_server(args.port)

    # Start WebSocket server
    await server.start_server(args.host, args.port)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down WebSocket server...")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
