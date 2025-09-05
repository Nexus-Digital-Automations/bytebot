#!/usr/bin/env python3
"""
C/ua Performance Monitor
========================

Standalone performance monitoring service for C/ua framework integration.
Provides metrics collection, system monitoring, and health reporting.

Features:
- Real-time performance metrics
- System resource monitoring
- Service health checks
- REST API for metrics access
- Configurable alerting

Author: Claude Code
Version: 1.0.0
"""

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import psutil
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


# Data models
class SystemMetrics(BaseModel):
    timestamp: str
    cpu_usage: float
    memory_usage: float
    memory_total: int
    memory_available: int
    disk_usage: float
    network_io: Dict[str, int]
    load_average: List[float]


class ServiceHealth(BaseModel):
    service_name: str
    status: str
    response_time: Optional[float]
    last_check: str
    error_message: Optional[str]


class PerformanceReport(BaseModel):
    timestamp: str
    system_metrics: SystemMetrics
    services_health: List[ServiceHealth]
    alerts: List[str]
    uptime_seconds: float


class PerformanceMonitor:
    """Main performance monitoring class"""

    def __init__(self, config_path: str, log_file: str = None):
        self.start_time = time.time()
        self.config_path = config_path
        self.config = self._load_config()

        # Setup logging
        log_level = logging.INFO
        log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

        if log_file:
            # Ensure log directory exists
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            logging.basicConfig(
                level=log_level,
                format=log_format,
                handlers=[
                    logging.FileHandler(log_file),
                    logging.StreamHandler(sys.stdout),
                ],
            )
        else:
            logging.basicConfig(level=log_level, format=log_format)

        self.logger = logging.getLogger("PerformanceMonitor")

        # Metrics storage
        self.metrics_history: List[SystemMetrics] = []
        self.services_status: List[ServiceHealth] = []
        self.alerts: List[str] = []

        # Configuration
        self.monitor_interval = self.config.get("performance", {}).get(
            "monitor_interval", 30
        )
        self.max_history = self.config.get("performance", {}).get("max_history", 1000)

        # Services to monitor
        self.monitored_services = [
            {"name": "Bytebot Desktop", "url": "http://localhost:9990"},
            {"name": "C/ua Agent API", "url": "http://localhost:9993/api/v1/health"},
            {"name": "WebSocket Server", "url": "http://localhost:9996/health"},
        ]

        self.logger.info(
            f"Performance Monitor initialized - interval: {self.monitor_interval}s"
        )

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

    async def collect_system_metrics(self) -> SystemMetrics:
        """Collect current system performance metrics"""

        # CPU usage
        cpu_usage = psutil.cpu_percent(interval=1)

        # Memory usage
        memory = psutil.virtual_memory()

        # Disk usage
        disk = psutil.disk_usage("/")
        disk_usage = (disk.used / disk.total) * 100

        # Network I/O
        network = psutil.net_io_counters()
        network_io = {
            "bytes_sent": network.bytes_sent,
            "bytes_recv": network.bytes_recv,
            "packets_sent": network.packets_sent,
            "packets_recv": network.packets_recv,
        }

        # Load average
        load_average = os.getloadavg() if hasattr(os, "getloadavg") else [0, 0, 0]

        metrics = SystemMetrics(
            timestamp=datetime.now().isoformat(),
            cpu_usage=cpu_usage,
            memory_usage=memory.percent,
            memory_total=memory.total,
            memory_available=memory.available,
            disk_usage=disk_usage,
            network_io=network_io,
            load_average=list(load_average),
        )

        # Store in history
        self.metrics_history.append(metrics)

        # Limit history size
        if len(self.metrics_history) > self.max_history:
            self.metrics_history = self.metrics_history[-self.max_history :]

        return metrics

    async def check_service_health(self) -> List[ServiceHealth]:
        """Check health of monitored services"""
        health_checks = []

        for service in self.monitored_services:
            service_name = service["name"]
            service_url = service["url"]

            start_time = time.time()

            try:
                import aiohttp

                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        service_url, timeout=aiohttp.ClientTimeout(total=5)
                    ) as response:
                        response_time = (time.time() - start_time) * 1000  # ms

                        if response.status < 400:
                            status = "healthy"
                            error_message = None
                        else:
                            status = "unhealthy"
                            error_message = f"HTTP {response.status}"

            except asyncio.TimeoutError:
                status = "timeout"
                response_time = None
                error_message = "Request timeout"
            except Exception as e:
                status = "error"
                response_time = None
                error_message = str(e)

            health = ServiceHealth(
                service_name=service_name,
                status=status,
                response_time=response_time,
                last_check=datetime.now().isoformat(),
                error_message=error_message,
            )

            health_checks.append(health)

        self.services_status = health_checks
        return health_checks

    def check_alerts(
        self, metrics: SystemMetrics, services: List[ServiceHealth]
    ) -> List[str]:
        """Check for alert conditions"""
        alerts = []

        # High CPU usage
        if metrics.cpu_usage > 85:
            alerts.append(f"High CPU usage: {metrics.cpu_usage:.1f}%")

        # High memory usage
        if metrics.memory_usage > 85:
            alerts.append(f"High memory usage: {metrics.memory_usage:.1f}%")

        # High disk usage
        if metrics.disk_usage > 90:
            alerts.append(f"High disk usage: {metrics.disk_usage:.1f}%")

        # Service health issues
        unhealthy_services = [s for s in services if s.status != "healthy"]
        for service in unhealthy_services:
            alerts.append(
                f"Service unhealthy: {service.service_name} ({service.status})"
            )

        # High load average (if available)
        if metrics.load_average and len(metrics.load_average) > 0:
            cpu_count = psutil.cpu_count()
            if metrics.load_average[0] > cpu_count * 2:  # Load > 2x CPU count
                alerts.append(f"High load average: {metrics.load_average[0]:.2f}")

        self.alerts = alerts
        return alerts

    async def monitor_cycle(self):
        """Single monitoring cycle"""
        try:
            # Collect metrics
            system_metrics = await self.collect_system_metrics()

            # Check service health
            services_health = await self.check_service_health()

            # Check for alerts
            alerts = self.check_alerts(system_metrics, services_health)

            # Log significant events
            if alerts:
                self.logger.warning(f"Alerts detected: {', '.join(alerts)}")

            healthy_services = [s for s in services_health if s.status == "healthy"]
            self.logger.info(
                f"System: CPU {system_metrics.cpu_usage:.1f}%, "
                f"Memory {system_metrics.memory_usage:.1f}%, "
                f"Services: {len(healthy_services)}/{len(services_health)} healthy"
            )

        except Exception as e:
            self.logger.error(f"Error in monitoring cycle: {e}")

    async def start_monitoring(self):
        """Start the monitoring loop"""
        self.logger.info("Starting performance monitoring")

        while True:
            await self.monitor_cycle()
            await asyncio.sleep(self.monitor_interval)

    def get_current_report(self) -> PerformanceReport:
        """Get current performance report"""
        latest_metrics = (
            self.metrics_history[-1]
            if self.metrics_history
            else SystemMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_usage=0,
                memory_usage=0,
                memory_total=0,
                memory_available=0,
                disk_usage=0,
                network_io={},
                load_average=[],
            )
        )

        return PerformanceReport(
            timestamp=datetime.now().isoformat(),
            system_metrics=latest_metrics,
            services_health=self.services_status,
            alerts=self.alerts,
            uptime_seconds=time.time() - self.start_time,
        )

    def get_metrics_history(self, minutes: int = 60) -> List[SystemMetrics]:
        """Get metrics history for specified time period"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)

        return [
            m
            for m in self.metrics_history
            if datetime.fromisoformat(
                m.timestamp.replace("Z", "+00:00").replace("+00:00", "")
            )
            >= cutoff_time
        ]


# Global monitor instance
monitor: Optional[PerformanceMonitor] = None

# FastAPI application
app = FastAPI(
    title="C/ua Performance Monitor",
    description="Performance monitoring service for C/ua framework integration",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "performance-monitor",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/metrics")
async def get_metrics():
    """Get current system metrics"""
    global monitor
    if not monitor:
        return {"error": "Monitor not initialized"}

    return monitor.get_current_report()


@app.get("/metrics/history")
async def get_metrics_history(minutes: int = 60):
    """Get metrics history"""
    global monitor
    if not monitor:
        return {"error": "Monitor not initialized"}

    return {"history": monitor.get_metrics_history(minutes), "period_minutes": minutes}


@app.get("/services")
async def get_services_status():
    """Get services health status"""
    global monitor
    if not monitor:
        return {"error": "Monitor not initialized"}

    return {
        "services": monitor.services_status,
        "last_check": datetime.now().isoformat(),
    }


@app.get("/alerts")
async def get_alerts():
    """Get current alerts"""
    global monitor
    if not monitor:
        return {"error": "Monitor not initialized"}

    return {
        "alerts": monitor.alerts,
        "count": len(monitor.alerts),
        "timestamp": datetime.now().isoformat(),
    }


async def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="C/ua Performance Monitor")
    parser.add_argument(
        "--config",
        default="/opt/cua/config/agent-config.json",
        help="Path to configuration file",
    )
    parser.add_argument("--log-file", help="Path to log file")
    parser.add_argument("--port", type=int, default=9995, help="Port to run on")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")

    args = parser.parse_args()

    # Initialize monitor
    global monitor
    monitor = PerformanceMonitor(args.config, args.log_file)

    # Start monitoring in background
    asyncio.create_task(monitor.start_monitoring())

    # Start web server
    config = uvicorn.Config(
        app, host=args.host, port=args.port, log_level="info", access_log=True
    )

    server = uvicorn.Server(config)
    await server.serve()


if __name__ == "__main__":
    try:
        # Install required packages if needed
        try:
            import aiohttp
        except ImportError:
            print("Installing required packages...")
            os.system("pip install aiohttp")

        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down performance monitor...")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
