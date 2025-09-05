#!/usr/bin/env python3
"""
Apple Neural Engine Bridge Service

Native macOS service providing ANE-accelerated vision processing for containerized AI agents.
This service leverages Apple's Vision framework through Core ML for optimal Neural Engine utilization.

Author: Development Agent
Date: 2025-09-05
Version: 1.0.0
"""

import asyncio
import json
import logging
import os
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Optional

import psutil

# Third-party imports
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel, ConfigDict, Field

# Vision processing imports
from vision_processor import (
    OCRResult,
    ProcessingError,
    TextDetectionResult,
    VisionProcessor,
)


# Data models
@dataclass
class ServiceHealth:
    """Service health status information"""

    service_name: str
    version: str
    status: str
    uptime_seconds: float
    memory_usage_mb: float
    cpu_usage_percent: float
    ane_available: bool
    active_requests: int
    total_requests: int
    last_request_time: Optional[float]
    performance_metrics: Dict[str, Any]


class OCRRequest(BaseModel):
    """OCR processing request model"""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    image_data: str = Field(..., description="Base64 encoded image data")
    recognition_level: str = Field(
        default="accurate", description="Recognition level: accurate or fast"
    )
    languages: List[str] = Field(default=["en-US"], description="Recognition languages")
    custom_words: List[str] = Field(default=[], description="Custom vocabulary words")
    minimum_text_height: float = Field(
        default=0.03125, description="Minimum text height ratio"
    )
    priority: str = Field(
        default="normal", description="Processing priority: high, normal, low"
    )
    request_id: Optional[str] = Field(
        default=None, description="Optional request identifier"
    )


class BatchOCRRequest(BaseModel):
    """Batch OCR processing request model"""

    images: List[OCRRequest] = Field(..., description="List of OCR requests to process")
    max_concurrent: int = Field(default=5, description="Maximum concurrent processing")
    timeout_seconds: int = Field(default=30, description="Processing timeout")


class TextDetectionRequest(BaseModel):
    """Text detection request model"""

    image_data: str = Field(..., description="Base64 encoded image data")
    confidence_threshold: float = Field(
        default=0.8, description="Minimum confidence threshold"
    )
    include_bounding_boxes: bool = Field(
        default=True, description="Include text bounding boxes"
    )
    detect_orientation: bool = Field(
        default=True, description="Detect text orientation"
    )
    priority: str = Field(default="normal", description="Processing priority")
    request_id: Optional[str] = Field(
        default=None, description="Optional request identifier"
    )


class ANEBridgeService:
    """
    Apple Neural Engine Bridge Service

    High-performance native macOS service providing ANE-accelerated vision processing
    capabilities through REST API endpoints for containerized AI agents.
    """

    def __init__(self, config_path: str = None):
        """Initialize the ANE Bridge Service"""
        self.start_time = time.time()
        self.active_requests = 0
        self.total_requests = 0
        self.last_request_time = None

        # Load configuration
        self.config = self._load_config(config_path)

        # Initialize logging
        self._setup_logging()

        # Initialize vision processor with Phase 1.1.3 Core ML direct access
        self.vision_processor = VisionProcessor(self.config)

        # Phase 1.1.3: Initialize Core ML model cache
        self.coreml_model_cache = {}
        self.coreml_initialized = False

        # Initialize thread pool for async operations
        max_workers = self.config.get("server_config", {}).get("workers", 4)
        self.executor = ThreadPoolExecutor(max_workers=max_workers)

        # Performance tracking
        self.performance_metrics = {
            "ocr_requests": 0,
            "batch_ocr_requests": 0,
            "text_detection_requests": 0,
            "average_latency_ms": 0.0,
            "success_rate": 1.0,
            "error_count": 0,
            "cache_hit_rate": 0.0,
            "ane_utilization": 0.0,
        }

        self.logger.info(
            f"ANE Bridge Service initialized - Version {self.config.get('version', '1.0.0')}"
        )

    def _load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load service configuration"""
        if config_path is None:
            config_path = os.path.join(
                os.path.dirname(__file__), "config", "service-config.json"
            )

        # Fallback to docker/ane-bridge/bridge-config.json if the config directory doesn't exist
        if not os.path.exists(config_path):
            fallback_path = os.path.join(
                os.path.dirname(__file__),
                "..",
                "docker",
                "ane-bridge",
                "bridge-config.json",
            )
            if os.path.exists(fallback_path):
                config_path = fallback_path

        try:
            with open(config_path) as f:
                config = json.load(f)
            return config
        except FileNotFoundError:
            # Return default configuration if file not found
            return self._get_default_config()
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Invalid JSON in configuration file {config_path}: {e}")

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration if config file is not found"""
        return {
            "service_name": "Apple Neural Engine Bridge",
            "version": "1.0.0",
            "server_config": {
                "host": "0.0.0.0",
                "port": 8080,
                "workers": 4,
                "max_connections": 100,
                "timeout_seconds": 30,
            },
            "apple_neural_engine": {
                "enabled": True,
                "fallback_to_cpu": True,
                "max_concurrent_requests": 10,
            },
            "vision_processing": {
                "ocr_service": {
                    "enabled": True,
                    "recognition_level": "accurate",
                    "supported_languages": ["en-US"],
                    "minimum_text_height": 0.03125,
                }
            },
            "monitoring": {"logging": {"level": "info"}},
        }

    def _setup_logging(self):
        """Setup structured logging"""
        log_config = self.config.get("monitoring", {}).get("logging", {})
        log_level = log_config.get("level", "info").upper()

        # Configure logging
        logging.basicConfig(
            level=getattr(logging, log_level),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            handlers=[
                logging.StreamHandler(sys.stdout),
            ],
        )

        self.logger = logging.getLogger("ANEBridgeService")

        # Add file handler if specified
        log_file = log_config.get("file")
        if log_file:
            # Ensure log directory exists
            log_dir = os.path.dirname(log_file)
            os.makedirs(log_dir, exist_ok=True)

            file_handler = logging.FileHandler(log_file)
            file_handler.setLevel(getattr(logging, log_level))
            formatter = logging.Formatter(
                "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            )
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)

    def _update_request_metrics(
        self, request_type: str, latency_ms: float, success: bool = True
    ):
        """Update performance metrics for a request"""
        self.total_requests += 1
        self.last_request_time = time.time()

        # Update type-specific metrics
        metric_key = f"{request_type}_requests"
        if metric_key in self.performance_metrics:
            self.performance_metrics[metric_key] += 1

        # Update average latency (exponential moving average)
        current_avg = self.performance_metrics["average_latency_ms"]
        alpha = 0.1  # Smoothing factor
        self.performance_metrics["average_latency_ms"] = (
            alpha * latency_ms + (1 - alpha) * current_avg
        )

        # Update success rate
        if not success:
            self.performance_metrics["error_count"] += 1

        total_requests = max(self.total_requests, 1)
        self.performance_metrics["success_rate"] = (
            total_requests - self.performance_metrics["error_count"]
        ) / total_requests

    async def health_check(self) -> ServiceHealth:
        """Get service health status"""
        try:
            # Get system metrics
            process = psutil.Process()
            memory_usage = process.memory_info().rss / (1024 * 1024)  # MB
            cpu_usage = process.cpu_percent()

            # Check ANE availability through vision processor
            ane_available = await self.vision_processor.check_ane_availability()

            return ServiceHealth(
                service_name=self.config["service_name"],
                version=self.config["version"],
                status="healthy",
                uptime_seconds=time.time() - self.start_time,
                memory_usage_mb=memory_usage,
                cpu_usage_percent=cpu_usage,
                ane_available=ane_available,
                active_requests=self.active_requests,
                total_requests=self.total_requests,
                last_request_time=self.last_request_time,
                performance_metrics=self.performance_metrics.copy(),
            )
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return ServiceHealth(
                service_name=self.config["service_name"],
                version=self.config["version"],
                status="unhealthy",
                uptime_seconds=time.time() - self.start_time,
                memory_usage_mb=0.0,
                cpu_usage_percent=0.0,
                ane_available=False,
                active_requests=self.active_requests,
                total_requests=self.total_requests,
                last_request_time=self.last_request_time,
                performance_metrics={},
            )

    async def process_ocr(self, request: OCRRequest) -> OCRResult:
        """Process OCR request with ANE acceleration"""
        request_id = request.request_id or str(uuid.uuid4())
        start_time = time.time()

        self.active_requests += 1
        self.logger.info(f"Processing OCR request {request_id}")

        try:
            # Process through vision processor
            result = await self.vision_processor.process_ocr(
                image_data=request.image_data,
                recognition_level=request.recognition_level,
                languages=request.languages,
                custom_words=request.custom_words,
                minimum_text_height=request.minimum_text_height,
                request_id=request_id,
            )

            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("ocr", latency_ms, success=True)

            self.logger.info(
                f"OCR request {request_id} completed in {latency_ms:.2f}ms"
            )
            return result

        except ProcessingError as e:
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("ocr", latency_ms, success=False)
            self.logger.error(f"OCR request {request_id} failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("ocr", latency_ms, success=False)
            self.logger.error(f"Unexpected error in OCR request {request_id}: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
        finally:
            self.active_requests -= 1

    async def process_batch_ocr(self, request: BatchOCRRequest) -> List[OCRResult]:
        """Process batch OCR requests with concurrent execution"""
        batch_id = str(uuid.uuid4())
        start_time = time.time()

        self.active_requests += 1
        self.logger.info(
            f"Processing batch OCR request {batch_id} with {len(request.images)} images"
        )

        try:
            # Process images concurrently
            semaphore = asyncio.Semaphore(request.max_concurrent)

            async def process_single(ocr_request: OCRRequest) -> OCRResult:
                async with semaphore:
                    return await self.process_ocr(ocr_request)

            # Create tasks for concurrent processing
            tasks = [process_single(ocr_req) for ocr_req in request.images]

            # Execute with timeout
            try:
                results = await asyncio.wait_for(
                    asyncio.gather(*tasks, return_exceptions=True),
                    timeout=request.timeout_seconds,
                )
            except asyncio.TimeoutError:
                self.logger.error(f"Batch OCR request {batch_id} timed out")
                raise HTTPException(status_code=408, detail="Request timeout")

            # Process results and handle exceptions
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    self.logger.error(f"Image {i} in batch {batch_id} failed: {result}")
                    # Create error result
                    error_result = OCRResult(
                        request_id=f"{batch_id}_image_{i}",
                        text="",
                        confidence=0.0,
                        processing_time_ms=0.0,
                        ane_used=False,
                        error=str(result),
                    )
                    processed_results.append(error_result)
                else:
                    processed_results.append(result)

            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("batch_ocr", latency_ms, success=True)

            self.logger.info(
                f"Batch OCR request {batch_id} completed in {latency_ms:.2f}ms"
            )
            return processed_results

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("batch_ocr", latency_ms, success=False)
            self.logger.error(f"Batch OCR request {batch_id} failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))
        finally:
            self.active_requests -= 1

    async def process_text_detection(
        self, request: TextDetectionRequest
    ) -> TextDetectionResult:
        """Process text detection request"""
        request_id = request.request_id or str(uuid.uuid4())
        start_time = time.time()

        self.active_requests += 1
        self.logger.info(f"Processing text detection request {request_id}")

        try:
            # Process through vision processor
            result = await self.vision_processor.detect_text(
                image_data=request.image_data,
                confidence_threshold=request.confidence_threshold,
                include_bounding_boxes=request.include_bounding_boxes,
                detect_orientation=request.detect_orientation,
                request_id=request_id,
            )

            # Update metrics
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("text_detection", latency_ms, success=True)

            self.logger.info(
                f"Text detection request {request_id} completed in {latency_ms:.2f}ms"
            )
            return result

        except ProcessingError as e:
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("text_detection", latency_ms, success=False)
            self.logger.error(f"Text detection request {request_id} failed: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000
            self._update_request_metrics("text_detection", latency_ms, success=False)
            self.logger.error(
                f"Unexpected error in text detection request {request_id}: {e}"
            )
            raise HTTPException(status_code=500, detail="Internal server error")
        finally:
            self.active_requests -= 1


# Global service instance
service = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    global service

    # Startup
    config_path = os.getenv("ANE_BRIDGE_CONFIG")
    service = ANEBridgeService(config_path)

    # Initialize vision processor
    await service.vision_processor.initialize()

    yield

    # Shutdown
    if service:
        await service.vision_processor.cleanup()
        service.executor.shutdown(wait=True)


# FastAPI application
app = FastAPI(
    title="Apple Neural Engine Bridge Service",
    description="Native macOS service providing ANE-accelerated vision processing for containerized AI agents",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on requirements
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer(auto_error=False)


# API Endpoints
@app.get("/health")
async def health_check():
    """Service health check endpoint"""
    global service
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    health_status = await service.health_check()
    return asdict(health_status)


@app.get("/metrics")
async def get_metrics():
    """Get service performance metrics"""
    global service
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    return {
        "service_metrics": service.performance_metrics,
        "vision_processor_metrics": await service.vision_processor.get_metrics(),
        "system_metrics": {
            "memory_usage_mb": psutil.Process().memory_info().rss / (1024 * 1024),
            "cpu_usage_percent": psutil.Process().cpu_percent(),
            "active_requests": service.active_requests,
            "total_requests": service.total_requests,
        },
    }


@app.post("/api/v1/vision/ocr")
async def ocr_endpoint(request: OCRRequest):
    """OCR processing endpoint with ANE acceleration"""
    global service
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    result = await service.process_ocr(request)
    return asdict(result)


@app.post("/api/v1/vision/ocr/batch")
async def batch_ocr_endpoint(request: BatchOCRRequest):
    """Batch OCR processing endpoint"""
    global service
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    results = await service.process_batch_ocr(request)
    return [asdict(result) for result in results]


@app.post("/api/v1/vision/text")
async def text_detection_endpoint(request: TextDetectionRequest):
    """Text detection endpoint"""
    global service
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    result = await service.process_text_detection(request)
    return asdict(result)


@app.get("/api/v1/vision/formats")
async def supported_formats():
    """Get supported image formats"""
    return {
        "supported_formats": ["PNG", "JPEG", "WebP", "TIFF", "BMP", "GIF"],
        "max_file_size_mb": 10,
        "recommended_formats": ["PNG", "JPEG"],
        "encoding": "base64",
    }


@app.get("/api/v1/vision/info")
async def service_info():
    """Get service information and capabilities"""
    global service
    if not service:
        raise HTTPException(status_code=503, detail="Service not initialized")

    ane_available = await service.vision_processor.check_ane_availability()

    return {
        "service_name": service.config["service_name"],
        "version": service.config["version"],
        "apple_neural_engine": {
            "available": ane_available,
            "enabled": service.config.get("apple_neural_engine", {}).get(
                "enabled", False
            ),
            "hardware_detected": await service.vision_processor.get_hardware_info(),
        },
        "vision_capabilities": {
            "ocr_enabled": service.config.get("vision_processing", {})
            .get("ocr_service", {})
            .get("enabled", True),
            "text_detection_enabled": service.config.get("vision_processing", {})
            .get("text_detection", {})
            .get("enabled", True),
            "batch_processing": service.config.get("vision_processing", {})
            .get("ocr_service", {})
            .get("batch_processing", True),
            "supported_languages": service.config.get("vision_processing", {})
            .get("ocr_service", {})
            .get("supported_languages", ["en-US"]),
        },
        "performance": {
            "max_concurrent_requests": service.config.get(
                "apple_neural_engine", {}
            ).get("max_concurrent_requests", 10),
            "expected_latency_ms": "2-5ms (ANE) / 15-40ms (CPU)",
            "throughput_estimate": "100-500 images/second",
        },
    }


if __name__ == "__main__":
    # Configuration from environment or defaults
    host = os.getenv("ANE_BRIDGE_HOST", "0.0.0.0")
    port = int(os.getenv("ANE_BRIDGE_PORT", "8080"))
    workers = int(
        os.getenv("ANE_BRIDGE_WORKERS", "1")
    )  # Single worker for macOS service
    log_level = os.getenv("ANE_BRIDGE_LOG_LEVEL", "info")

    print(f"Starting Apple Neural Engine Bridge Service on {host}:{port}")
    print(f"Workers: {workers}, Log Level: {log_level}")

    uvicorn.run(
        "ane_service:app",
        host=host,
        port=port,
        workers=workers,
        log_level=log_level,
        reload=False,  # Disable reload for production stability
        access_log=True,
        timeout_keep_alive=30,
        limit_concurrency=100,
    )
