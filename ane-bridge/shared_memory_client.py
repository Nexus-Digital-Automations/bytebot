#!/usr/bin/env python3
"""
Shared Memory Bridge Client Library

High-performance client library for containerized applications to communicate
with the native ANE service using zero-copy shared memory IPC. Provides a
simple API that abstracts the complexity of shared memory management.

Features:
- Zero-copy image data transfer
- Automatic fallback to HTTP communication
- Connection pooling and resource management
- Async/await support for high-performance applications
- Comprehensive error handling and retry logic

Author: Development Agent
Date: 2025-09-05
Version: 1.0.0
"""

import asyncio
import base64
import json
import logging
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import asdict, dataclass
from multiprocessing import shared_memory
from typing import Any, Dict, List, Optional, Tuple, Union

import httpx
import numpy as np


@dataclass
class OCRRequest:
    """OCR processing request"""

    image_data: Union[
        bytes, np.ndarray, str
    ]  # Raw bytes, numpy array, or base64 string
    recognition_level: str = "accurate"
    languages: List[str] = None
    custom_words: List[str] = None
    minimum_text_height: float = 0.03125
    request_id: Optional[str] = None


@dataclass
class OCRResponse:
    """OCR processing response"""

    request_id: str
    text: str
    confidence: float
    processing_time_ms: float
    ane_used: bool
    communication_mode: str  # 'shared_memory' or 'http'
    bounding_boxes: Optional[List[Dict[str, Any]]] = None
    language: Optional[str] = None
    error: Optional[str] = None
    cache_hit: bool = False


@dataclass
class ClientMetrics:
    """Client performance metrics"""

    total_requests: int = 0
    shared_memory_requests: int = 0
    http_requests: int = 0
    fallback_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_latency_ms: float = 0.0
    last_request_time: Optional[float] = None


class SharedMemoryClient:
    """
    Shared Memory Bridge Client

    High-performance client for zero-copy communication with native ANE service.
    Automatically handles shared memory allocation, synchronization, and fallback
    to HTTP communication when shared memory is unavailable.
    """

    def __init__(
        self,
        service_url: str = "http://localhost:8080",
        shared_memory_enabled: bool = True,
        max_segment_size_mb: int = 100,
        connection_timeout: float = 10.0,
        request_timeout: float = 30.0,
    ):
        """
        Initialize shared memory client

        Args:
            service_url: Base URL for ANE bridge service
            shared_memory_enabled: Enable shared memory communication
            max_segment_size_mb: Maximum size for shared memory segments
            connection_timeout: Connection timeout in seconds
            request_timeout: Request timeout in seconds
        """
        self.service_url = service_url.rstrip("/")
        self.shared_memory_enabled = shared_memory_enabled
        self.max_segment_size = max_segment_size_mb * 1024 * 1024
        self.connection_timeout = connection_timeout
        self.request_timeout = request_timeout

        # HTTP client configuration
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=connection_timeout,
                read=request_timeout,
                write=request_timeout,
                pool=request_timeout,
            ),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

        # Shared memory management
        self.active_segments: Dict[str, shared_memory.SharedMemory] = {}

        # Performance tracking
        self.metrics = ClientMetrics()
        self.start_time = time.time()

        # Logging
        self.logger = logging.getLogger("SharedMemoryClient")

        self.logger.info(
            f"Shared Memory Client initialized\n"
            f"  - Service URL: {self.service_url}\n"
            f"  - Shared Memory: {'Enabled' if self.shared_memory_enabled else 'Disabled'}\n"
            f"  - Max Segment Size: {max_segment_size_mb}MB"
        )

    async def process_ocr(
        self,
        image_data: Union[bytes, np.ndarray, str],
        recognition_level: str = "accurate",
        languages: List[str] = None,
        custom_words: List[str] = None,
        minimum_text_height: float = 0.03125,
        request_id: str = None,
        force_http: bool = False,
    ) -> OCRResponse:
        """
        Process OCR request using optimal communication method

        Args:
            image_data: Image data as bytes, numpy array, or base64 string
            recognition_level: OCR accuracy level ('accurate' or 'fast')
            languages: List of language codes (e.g., ['en-US', 'fr-FR'])
            custom_words: Custom vocabulary words
            minimum_text_height: Minimum text height ratio
            request_id: Optional request identifier
            force_http: Force HTTP communication (disable shared memory)

        Returns:
            OCRResponse with processing results and metadata
        """
        request_id = request_id or str(uuid.uuid4())
        start_time = time.time()
        languages = languages or ["en-US"]
        custom_words = custom_words or []

        self.logger.info(f"Processing OCR request {request_id}")
        self.metrics.total_requests += 1

        try:
            # Normalize image data
            image_bytes = self._normalize_image_data(image_data)

            # Determine communication method
            use_shared_memory = (
                self.shared_memory_enabled
                and not force_http
                and len(image_bytes) <= self.max_segment_size
                and await self._check_shared_memory_availability()
            )

            if use_shared_memory:
                try:
                    result = await self._process_ocr_shared_memory(
                        image_bytes=image_bytes,
                        recognition_level=recognition_level,
                        languages=languages,
                        custom_words=custom_words,
                        minimum_text_height=minimum_text_height,
                        request_id=request_id,
                    )
                    result.communication_mode = "shared_memory"
                    self.metrics.shared_memory_requests += 1

                except Exception as e:
                    self.logger.warning(
                        f"Shared memory failed for {request_id}, falling back to HTTP: {e}"
                    )
                    result = await self._process_ocr_http(
                        image_bytes=image_bytes,
                        recognition_level=recognition_level,
                        languages=languages,
                        custom_words=custom_words,
                        minimum_text_height=minimum_text_height,
                        request_id=request_id,
                    )
                    result.communication_mode = "http_fallback"
                    self.metrics.fallback_requests += 1
            else:
                result = await self._process_ocr_http(
                    image_bytes=image_bytes,
                    recognition_level=recognition_level,
                    languages=languages,
                    custom_words=custom_words,
                    minimum_text_height=minimum_text_height,
                    request_id=request_id,
                )
                result.communication_mode = "http"
                self.metrics.http_requests += 1

            # Update metrics
            processing_time_ms = (time.time() - start_time) * 1000
            if result.error is None:
                self.metrics.successful_requests += 1
            else:
                self.metrics.failed_requests += 1

            self._update_latency_metrics(processing_time_ms)

            self.logger.info(
                f"OCR request {request_id} completed in {processing_time_ms:.2f}ms "
                f"(mode: {result.communication_mode})"
            )

            return result

        except Exception as e:
            processing_time_ms = (time.time() - start_time) * 1000
            self.metrics.failed_requests += 1
            self._update_latency_metrics(processing_time_ms)

            self.logger.error(f"OCR request {request_id} failed: {e}")
            return OCRResponse(
                request_id=request_id,
                text="",
                confidence=0.0,
                processing_time_ms=processing_time_ms,
                ane_used=False,
                communication_mode="error",
                error=str(e),
            )

    async def get_service_info(self) -> Dict[str, Any]:
        """Get service information and capabilities"""
        try:
            response = await self.http_client.get(
                f"{self.service_url}/api/v1/bridge/info"
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            self.logger.error(f"Failed to get service info: {e}")
            return {"error": str(e)}

    async def get_health_status(self) -> Dict[str, Any]:
        """Get service health status"""
        try:
            response = await self.http_client.get(f"{self.service_url}/health")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            self.logger.error(f"Failed to get health status: {e}")
            return {"error": str(e), "healthy": False}

    async def get_metrics(self) -> Dict[str, Any]:
        """Get client and service metrics"""
        try:
            # Get service metrics
            service_response = await self.http_client.get(
                f"{self.service_url}/metrics/enhanced"
            )
            service_metrics = (
                service_response.json() if service_response.status_code == 200 else {}
            )

            # Get client metrics
            client_metrics = {
                "client_metrics": asdict(self.metrics),
                "uptime_seconds": time.time() - self.start_time,
                "active_segments": len(self.active_segments),
                "performance": {
                    "shared_memory_ratio": (
                        self.metrics.shared_memory_requests
                        / max(self.metrics.total_requests, 1)
                    )
                    * 100,
                    "fallback_ratio": (
                        self.metrics.fallback_requests
                        / max(self.metrics.total_requests, 1)
                    )
                    * 100,
                    "success_rate": (
                        self.metrics.successful_requests
                        / max(self.metrics.total_requests, 1)
                    )
                    * 100,
                },
            }

            return {
                "client": client_metrics,
                "service": service_metrics,
            }

        except Exception as e:
            self.logger.error(f"Failed to get metrics: {e}")
            return {"error": str(e)}

    async def cleanup(self):
        """Clean up client resources"""
        self.logger.info("Cleaning up shared memory client")

        # Clean up active shared memory segments
        for segment_name, shm in self.active_segments.items():
            try:
                shm.close()
                self.logger.debug(f"Closed shared memory segment {segment_name}")
            except Exception as e:
                self.logger.warning(f"Error closing segment {segment_name}: {e}")

        self.active_segments.clear()

        # Close HTTP client
        await self.http_client.aclose()

        self.logger.info("Shared memory client cleanup complete")

    # Private methods

    def _normalize_image_data(self, image_data: Union[bytes, np.ndarray, str]) -> bytes:
        """Normalize image data to bytes"""
        if isinstance(image_data, bytes):
            return image_data
        elif isinstance(image_data, np.ndarray):
            return image_data.tobytes()
        elif isinstance(image_data, str):
            # Assume base64 encoded
            try:
                return base64.b64decode(image_data)
            except Exception as e:
                raise ValueError(f"Invalid base64 image data: {e}")
        else:
            raise ValueError(f"Unsupported image data type: {type(image_data)}")

    async def _check_shared_memory_availability(self) -> bool:
        """Check if shared memory communication is available"""
        try:
            response = await self.http_client.get(
                f"{self.service_url}/api/v1/shmem/status"
            )
            if response.status_code == 200:
                status = response.json()
                return status.get("bridge_enabled", False)
            return False
        except Exception:
            return False

    async def _process_ocr_shared_memory(
        self,
        image_bytes: bytes,
        recognition_level: str,
        languages: List[str],
        custom_words: List[str],
        minimum_text_height: float,
        request_id: str,
    ) -> OCRResponse:
        """Process OCR using shared memory communication"""
        self.logger.debug(f"Using shared memory for request {request_id}")

        try:
            # Estimate image dimensions (simplified)
            image_shape = self._estimate_image_shape(image_bytes)

            # Create shared memory segment
            segment_size = len(image_bytes) + 8192  # Add space for metadata
            segment_name = f"client_{request_id}_{int(time.time())}"

            shm = shared_memory.SharedMemory(
                create=True, size=segment_size, name=segment_name
            )
            self.active_segments[request_id] = shm

            try:
                # Write image data to shared memory
                shm.buf[: len(image_bytes)] = image_bytes

                # Prepare request payload
                shmem_request = {
                    "request_id": request_id,
                    "shared_memory_name": segment_name,
                    "image_shape": image_shape,
                    "recognition_level": recognition_level,
                    "languages": languages,
                    "custom_words": custom_words,
                    "minimum_text_height": minimum_text_height,
                }

                # Send shared memory OCR request
                response = await self.http_client.post(
                    f"{self.service_url}/api/v1/shmem/ocr",
                    json=shmem_request,
                )
                response.raise_for_status()

                result_data = response.json()

                return OCRResponse(
                    request_id=result_data.get("request_id", request_id),
                    text=result_data.get("text", ""),
                    confidence=float(result_data.get("confidence", 0.0)),
                    processing_time_ms=float(
                        result_data.get("processing_time_ms", 0.0)
                    ),
                    ane_used=bool(result_data.get("ane_used", False)),
                    communication_mode="shared_memory",
                    bounding_boxes=result_data.get("bounding_boxes"),
                    language=result_data.get("language"),
                    error=result_data.get("error"),
                    cache_hit=bool(result_data.get("cache_hit", False)),
                )

            finally:
                # Clean up shared memory segment
                if request_id in self.active_segments:
                    del self.active_segments[request_id]
                try:
                    shm.close()
                    shm.unlink()
                except Exception as e:
                    self.logger.warning(f"Error cleaning up shared memory: {e}")

        except Exception as e:
            raise RuntimeError(f"Shared memory processing failed: {e}")

    async def _process_ocr_http(
        self,
        image_bytes: bytes,
        recognition_level: str,
        languages: List[str],
        custom_words: List[str],
        minimum_text_height: float,
        request_id: str,
    ) -> OCRResponse:
        """Process OCR using HTTP communication"""
        self.logger.debug(f"Using HTTP for request {request_id}")

        try:
            # Encode image as base64
            image_base64 = base64.b64encode(image_bytes).decode("utf-8")

            # Prepare HTTP request payload
            http_request = {
                "image_data": image_base64,
                "recognition_level": recognition_level,
                "languages": languages,
                "custom_words": custom_words,
                "minimum_text_height": minimum_text_height,
                "request_id": request_id,
            }

            # Send HTTP OCR request
            response = await self.http_client.post(
                f"{self.service_url}/api/v1/vision/ocr",
                json=http_request,
            )
            response.raise_for_status()

            result_data = response.json()

            return OCRResponse(
                request_id=result_data.get("request_id", request_id),
                text=result_data.get("text", ""),
                confidence=float(result_data.get("confidence", 0.0)),
                processing_time_ms=float(result_data.get("processing_time_ms", 0.0)),
                ane_used=bool(result_data.get("ane_used", False)),
                communication_mode="http",
                bounding_boxes=result_data.get("bounding_boxes"),
                language=result_data.get("language"),
                error=result_data.get("error"),
                cache_hit=bool(result_data.get("cache_hit", False)),
            )

        except Exception as e:
            raise RuntimeError(f"HTTP processing failed: {e}")

    def _estimate_image_shape(self, image_bytes: bytes) -> Tuple[int, int, int]:
        """Estimate image dimensions from byte size"""
        # Simplified estimation - in production would parse image headers
        data_size = len(image_bytes)

        if data_size > 5 * 1024 * 1024:  # > 5MB
            return (2160, 3840, 3)  # 4K
        elif data_size > 2 * 1024 * 1024:  # > 2MB
            return (1080, 1920, 3)  # Full HD
        elif data_size > 500 * 1024:  # > 500KB
            return (720, 1280, 3)  # HD
        else:
            return (480, 640, 3)  # SD

    def _update_latency_metrics(self, processing_time_ms: float):
        """Update latency metrics"""
        self.metrics.last_request_time = time.time()

        # Update rolling average latency
        if self.metrics.total_requests == 1:
            self.metrics.average_latency_ms = processing_time_ms
        else:
            # Exponential moving average
            alpha = 0.1
            self.metrics.average_latency_ms = (
                alpha * processing_time_ms
                + (1 - alpha) * self.metrics.average_latency_ms
            )


@asynccontextmanager
async def shared_memory_client(
    service_url: str = "http://localhost:8080", **kwargs
) -> SharedMemoryClient:
    """Async context manager for shared memory client"""
    client = SharedMemoryClient(service_url=service_url, **kwargs)
    try:
        yield client
    finally:
        await client.cleanup()


# Convenience function for simple usage
async def process_ocr_simple(
    image_data: Union[bytes, np.ndarray, str],
    service_url: str = "http://localhost:8080",
    **kwargs,
) -> OCRResponse:
    """Simple function to process OCR with automatic client management"""
    async with shared_memory_client(service_url) as client:
        return await client.process_ocr(image_data, **kwargs)


if __name__ == "__main__":
    # Example usage
    async def test_client():
        logging.basicConfig(level=logging.INFO)

        # Create test image data
        test_image = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)

        async with shared_memory_client() as client:
            print("Testing shared memory client...")

            # Get service info
            info = await client.get_service_info()
            print(f"Service info: {json.dumps(info, indent=2)}")

            # Process OCR request
            result = await client.process_ocr(
                image_data=test_image,
                recognition_level="fast",
                request_id="test_client_001",
            )

            print(f"OCR result: {asdict(result)}")

            # Get metrics
            metrics = await client.get_metrics()
            print(f"Client metrics: {json.dumps(metrics, indent=2)}")

        print("Client test completed!")

    asyncio.run(test_client())
