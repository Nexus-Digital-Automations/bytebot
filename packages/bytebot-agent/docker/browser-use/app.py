#!/usr/bin/env python3
"""
Browser-Use Service - FastAPI Application
Local browser automation service for Bytebot platform
Provides REST API and WebSocket endpoints for browser automation
"""

import asyncio
import json
import os
import signal
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import structlog

# Browser-use imports
try:
    from browser_use import Agent, Browser, BrowserConfig
    from browser_use.browser.service import BrowserService
    from browser_use.controller.service import ControllerService
except ImportError:
    # Fallback if browser-use not available
    print("Warning: browser-use not found, using mock implementations")
    Agent = None
    Browser = None
    BrowserConfig = None
    BrowserService = None
    ControllerService = None

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Configuration
PORT = int(os.getenv("PORT", 8080))
HEALTH_PORT = int(os.getenv("HEALTH_PORT", 8081))
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
CHROME_EXECUTABLE_PATH = os.getenv("CHROME_EXECUTABLE_PATH", "/usr/bin/google-chrome")
WORKING_DIR = Path(os.getenv("WORKING_DIR", "/app/data/browser-use"))
USER_DATA_DIR = Path(os.getenv("USER_DATA_DIR", "/app/data/chrome-user-data"))
MAX_CONCURRENT_SESSIONS = int(os.getenv("MAX_CONCURRENT_SESSIONS", "10"))
SESSION_TIMEOUT = int(os.getenv("SESSION_TIMEOUT", "600000"))  # 10 minutes
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://bytebot-agent:9991").split(",")
API_KEY = os.getenv("API_KEY", "secure-api-key-change-in-prod")

# Ensure directories exist
WORKING_DIR.mkdir(parents=True, exist_ok=True)
USER_DATA_DIR.mkdir(parents=True, exist_ok=True)
(WORKING_DIR / "sessions").mkdir(exist_ok=True)
(WORKING_DIR / "screenshots").mkdir(exist_ok=True)
(WORKING_DIR / "videos").mkdir(exist_ok=True)
(WORKING_DIR / "logs").mkdir(exist_ok=True)

# FastAPI application
app = FastAPI(
    title="Browser-Use Service",
    description="Local browser automation service for Bytebot platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS + ["http://localhost:*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global state management
class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.browser_service: Optional[BrowserService] = None
        self.controller_service: Optional[ControllerService] = None

    async def initialize(self):
        """Initialize browser services"""
        if BrowserService and ControllerService:
            try:
                self.browser_service = BrowserService()
                self.controller_service = ControllerService()
                await self.browser_service.start()
                logger.info("Browser services initialized")
            except Exception as e:
                logger.error("Failed to initialize browser services", error=str(e))

    async def create_session(
        self, session_id: str, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new browser session"""
        if len(self.sessions) >= MAX_CONCURRENT_SESSIONS:
            raise HTTPException(
                status_code=429, detail="Maximum concurrent sessions reached"
            )

        session_dir = WORKING_DIR / "sessions" / session_id
        session_dir.mkdir(parents=True, exist_ok=True)

        browser_config = {
            "headless": config.get("headless", True),
            "user_data_dir": str(USER_DATA_DIR / session_id),
            "screenshots_dir": str(session_dir / "screenshots"),
            "chrome_executable_path": CHROME_EXECUTABLE_PATH,
            "window_width": config.get("window_width", 1280),
            "window_height": config.get("window_height", 720),
            "timeout": config.get("timeout", 30000),
        }

        session_info = {
            "session_id": session_id,
            "created_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat(),
            "config": browser_config,
            "status": "created",
            "browser": None,
            "agent": None,
        }

        try:
            # Initialize browser if browser-use is available
            if Browser and BrowserConfig:
                browser_cfg = BrowserConfig(**browser_config)
                browser = Browser(config=browser_cfg)
                await browser.start()

                session_info["browser"] = browser
                session_info["status"] = "ready"

                logger.info("Browser session created", session_id=session_id)
            else:
                # Mock browser for testing
                session_info["status"] = "ready"
                logger.warning(
                    "Browser-use not available, using mock session",
                    session_id=session_id,
                )

        except Exception as e:
            session_info["status"] = "error"
            session_info["error"] = str(e)
            logger.error(
                "Failed to create browser session", session_id=session_id, error=str(e)
            )

        self.sessions[session_id] = session_info
        return session_info

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session information"""
        session = self.sessions.get(session_id)
        if session:
            session["last_activity"] = datetime.now().isoformat()
        return session

    async def close_session(self, session_id: str) -> bool:
        """Close and cleanup a browser session"""
        session = self.sessions.get(session_id)
        if not session:
            return False

        try:
            if session.get("browser"):
                await session["browser"].close()

            # Cleanup session directory (optional)
            session_dir = WORKING_DIR / "sessions" / session_id
            # Add cleanup logic here if needed

            del self.sessions[session_id]
            logger.info("Browser session closed", session_id=session_id)
            return True

        except Exception as e:
            logger.error(
                "Failed to close browser session", session_id=session_id, error=str(e)
            )
            return False

    async def cleanup_expired_sessions(self):
        """Cleanup expired sessions"""
        current_time = time.time()
        expired_sessions = []

        for session_id, session in self.sessions.items():
            last_activity = datetime.fromisoformat(session["last_activity"])
            if (current_time - last_activity.timestamp()) > (SESSION_TIMEOUT / 1000):
                expired_sessions.append(session_id)

        for session_id in expired_sessions:
            await self.close_session(session_id)
            logger.info("Cleaned up expired session", session_id=session_id)


# Global session manager
session_manager = SessionManager()


# Pydantic models
class SessionConfig(BaseModel):
    headless: Optional[bool] = True
    window_width: Optional[int] = 1280
    window_height: Optional[int] = 720
    timeout: Optional[int] = 30000
    screenshots: Optional[bool] = True
    user_agent: Optional[str] = None


class BrowserAction(BaseModel):
    action_type: str = Field(..., description="Type of action to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict)
    wait_for_completion: Optional[bool] = True
    timeout: Optional[int] = 30000


class AutomationTask(BaseModel):
    session_id: str
    actions: List[BrowserAction]
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SessionResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# API key validation
async def validate_api_key(api_key: str = None):
    if not api_key or api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key


# API Endpoints
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Browser-Use Service", port=PORT)
    await session_manager.initialize()

    # Start cleanup task
    asyncio.create_task(cleanup_task())


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Browser-Use Service")

    # Close all sessions
    for session_id in list(session_manager.sessions.keys()):
        await session_manager.close_session(session_id)


async def cleanup_task():
    """Background task for session cleanup"""
    while True:
        try:
            await session_manager.cleanup_expired_sessions()
            await asyncio.sleep(300)  # Cleanup every 5 minutes
        except Exception as e:
            logger.error("Cleanup task error", error=str(e))
            await asyncio.sleep(60)  # Retry after 1 minute on error


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "browser-use",
        "version": "1.0.0",
        "active_sessions": len(session_manager.sessions),
        "max_sessions": MAX_CONCURRENT_SESSIONS,
    }


@app.post("/sessions", response_model=SessionResponse)
async def create_session(config: SessionConfig, _: str = Depends(validate_api_key)):
    """Create a new browser automation session"""
    session_id = str(uuid.uuid4())

    try:
        session_info = await session_manager.create_session(session_id, config.dict())

        return SessionResponse(
            success=True,
            session_id=session_id,
            status=session_info["status"],
            data={"created_at": session_info["created_at"]},
        )

    except Exception as e:
        logger.error("Failed to create session", error=str(e))
        return SessionResponse(success=False, error=str(e))


@app.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session_info(session_id: str, _: str = Depends(validate_api_key)):
    """Get information about a specific session"""
    session = await session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Remove browser object from response (not serializable)
    session_data = {k: v for k, v in session.items() if k not in ["browser", "agent"]}

    return SessionResponse(
        success=True, session_id=session_id, status=session["status"], data=session_data
    )


@app.delete("/sessions/{session_id}", response_model=SessionResponse)
async def close_session(session_id: str, _: str = Depends(validate_api_key)):
    """Close a browser session"""
    success = await session_manager.close_session(session_id)

    if not success:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse(success=True, session_id=session_id, status="closed")


@app.post("/sessions/{session_id}/execute")
async def execute_automation_task(
    session_id: str, task: AutomationTask, _: str = Depends(validate_api_key)
):
    """Execute browser automation task"""
    session = await session_manager.get_session(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session["status"] != "ready":
        raise HTTPException(
            status_code=400, detail=f"Session not ready: {session['status']}"
        )

    try:
        # Execute actions
        results = []
        browser = session.get("browser")

        for action in task.actions:
            result = await execute_browser_action(browser, action)
            results.append(result)

            if not result.get("success", False):
                break

        return {
            "success": True,
            "session_id": session_id,
            "results": results,
            "execution_time": datetime.now().isoformat(),
        }

    except Exception as e:
        logger.error("Task execution failed", session_id=session_id, error=str(e))
        return {"success": False, "session_id": session_id, "error": str(e)}


async def execute_browser_action(browser: Any, action: BrowserAction) -> Dict[str, Any]:
    """Execute a single browser action"""
    action_type = action.action_type
    params = action.parameters

    try:
        if action_type == "navigate":
            url = params.get("url")
            if browser:
                await browser.get(url)
            result = {"success": True, "action": "navigate", "url": url}

        elif action_type == "click":
            selector = params.get("selector")
            if browser:
                element = await browser.find_element(selector)
                await element.click()
            result = {"success": True, "action": "click", "selector": selector}

        elif action_type == "type":
            selector = params.get("selector")
            text = params.get("text", "")
            if browser:
                element = await browser.find_element(selector)
                await element.send_keys(text)
            result = {
                "success": True,
                "action": "type",
                "selector": selector,
                "text": text,
            }

        elif action_type == "screenshot":
            if browser:
                screenshot_path = (
                    WORKING_DIR / "screenshots" / f"screenshot_{int(time.time())}.png"
                )
                await browser.save_screenshot(str(screenshot_path))
                result = {
                    "success": True,
                    "action": "screenshot",
                    "path": str(screenshot_path),
                }
            else:
                result = {
                    "success": True,
                    "action": "screenshot",
                    "path": "mock_screenshot.png",
                }

        else:
            result = {"success": False, "error": f"Unknown action type: {action_type}"}

        logger.info(
            "Browser action executed", action=action_type, success=result["success"]
        )
        return result

    except Exception as e:
        logger.error("Browser action failed", action=action_type, error=str(e))
        return {"success": False, "action": action_type, "error": str(e)}


@app.get("/sessions")
async def list_sessions(_: str = Depends(validate_api_key)):
    """List all active sessions"""
    sessions_data = []

    for session_id, session in session_manager.sessions.items():
        session_data = {
            k: v for k, v in session.items() if k not in ["browser", "agent"]
        }
        sessions_data.append(session_data)

    return {
        "success": True,
        "sessions": sessions_data,
        "total_sessions": len(sessions_data),
        "max_sessions": MAX_CONCURRENT_SESSIONS,
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for real-time browser automation"""
    await websocket.accept()

    session = await session_manager.get_session(session_id)
    if not session:
        await websocket.close(code=4004, reason="Session not found")
        return

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "action":
                action = BrowserAction(**message.get("action", {}))
                result = await execute_browser_action(session.get("browser"), action)
                await websocket.send_text(json.dumps(result))

            elif message.get("type") == "ping":
                await websocket.send_text(
                    json.dumps({"type": "pong", "timestamp": time.time()})
                )

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected", session_id=session_id)
    except Exception as e:
        logger.error("WebSocket error", session_id=session_id, error=str(e))
        await websocket.close(code=1011, reason="Internal error")


# Health check server on separate port
health_app = FastAPI(title="Browser-Use Health Check")


@health_app.get("/health")
async def health_endpoint():
    """Separate health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "browser-use-health",
        "main_service_port": PORT,
    }


# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    logger.info("Received shutdown signal", signal=signum)
    sys.exit(0)


signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

if __name__ == "__main__":
    # Start health check server in background
    import threading

    def run_health_server():
        uvicorn.run(
            health_app, host="0.0.0.0", port=HEALTH_PORT, log_level=LOG_LEVEL.lower()
        )

    health_thread = threading.Thread(target=run_health_server, daemon=True)
    health_thread.start()

    # Start main application
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=PORT,
        log_level=LOG_LEVEL.lower(),
        access_log=True,
        server_header=False,
    )
