#!/usr/bin/env python3
"""
ANE Bridge Monitor
==================

Monitoring service for Apple Neural Engine Bridge connectivity and health.
Provides continuous health monitoring, fallback management, and bridge status reporting.

Features:
- Bridge connectivity monitoring
- Automatic fallback management
- Health status reporting
- Performance metrics collection
- Error recovery and retry logic

Author: Claude Code
Version: 1.0.0
"""

import asyncio
import json
import logging
import os
import sys
import time
from datetime import datetime
from typing import Dict

import aiohttp


class ANEBridgeMonitor:
    """Monitor for Apple Neural Engine Bridge service"""

    def __init__(self, config_path: str = None):
        self.config_path = config_path or "/opt/ane-bridge/bridge-config.json"
        self.config = self._load_config()

        # Setup logging
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )
        self.logger = logging.getLogger("ANEBridgeMonitor")

        # Monitor state
        self.bridge_status = "unknown"
        self.last_successful_check = None
        self.consecutive_failures = 0
        self.total_checks = 0
        self.total_failures = 0

        # Configuration
        self.bridge_url = os.getenv(
            "ANE_BRIDGE_URL", "http://host.docker.internal:8080"
        )
        self.check_interval = self.config.get("monitoring", {}).get(
            "check_interval_seconds", 30
        )
        self.max_consecutive_failures = self.config.get("monitoring", {}).get(
            "max_consecutive_failures", 5
        )
        self.timeout_seconds = self.config.get("monitoring", {}).get(
            "timeout_seconds", 10
        )

        # Status file paths
        self.status_file = "/opt/cua/shared/ane_bridge_status.json"
        self.metrics_file = "/opt/ane-bridge/logs/bridge_metrics.json"

        self.logger.info(f"ANE Bridge Monitor initialized - URL: {self.bridge_url}")
        self.logger.info(
            f"Check interval: {self.check_interval}s, Max failures: {self.max_consecutive_failures}"
        )

    def _load_config(self) -> Dict:
        """Load monitor configuration"""
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

    async def check_bridge_health(self) -> Dict[str, any]:
        """Check Apple Neural Engine Bridge health"""
        check_start = time.time()
        self.total_checks += 1

        try:
            async with aiohttp.ClientSession() as session:
                # Check health endpoint
                health_url = f"{self.bridge_url}/health"

                async with session.get(
                    health_url,
                    timeout=aiohttp.ClientTimeout(total=self.timeout_seconds),
                ) as response:
                    response_time = (time.time() - check_start) * 1000  # ms

                    if response.status == 200:
                        health_data = await response.json()

                        # Reset failure counter on successful check
                        self.consecutive_failures = 0
                        self.last_successful_check = datetime.now()
                        self.bridge_status = "connected"

                        result = {
                            "status": "healthy",
                            "bridge_available": True,
                            "response_time_ms": response_time,
                            "bridge_data": health_data,
                            "timestamp": datetime.now().isoformat(),
                        }

                        self.logger.debug(
                            f"Bridge health check passed ({response_time:.1f}ms)"
                        )
                        return result

                    else:
                        raise aiohttp.ClientError(f"HTTP {response.status}")

        except asyncio.TimeoutError:
            error_msg = f"Bridge health check timeout ({self.timeout_seconds}s)"
            return await self._handle_check_failure(error_msg, check_start)

        except aiohttp.ClientError as e:
            error_msg = f"Bridge connectivity error: {e}"
            return await self._handle_check_failure(error_msg, check_start)

        except Exception as e:
            error_msg = f"Unexpected error during health check: {e}"
            return await self._handle_check_failure(error_msg, check_start)

    async def _handle_check_failure(
        self, error_msg: str, check_start: float
    ) -> Dict[str, any]:
        """Handle failed health check"""
        response_time = (time.time() - check_start) * 1000
        self.consecutive_failures += 1
        self.total_failures += 1

        # Determine bridge status based on failure count
        if self.consecutive_failures >= self.max_consecutive_failures:
            self.bridge_status = "unavailable"
            self.logger.error(
                f"Bridge marked as unavailable after {self.consecutive_failures} consecutive failures"
            )
        else:
            self.bridge_status = "unstable"
            self.logger.warning(
                f"Bridge unstable - failure {self.consecutive_failures}/{self.max_consecutive_failures}: {error_msg}"
            )

        return {
            "status": "unhealthy",
            "bridge_available": False,
            "response_time_ms": response_time,
            "error": error_msg,
            "consecutive_failures": self.consecutive_failures,
            "timestamp": datetime.now().isoformat(),
        }

    async def check_bridge_capabilities(self) -> Dict[str, any]:
        """Check bridge capabilities and service info"""
        try:
            async with aiohttp.ClientSession() as session:
                info_url = f"{self.bridge_url}/api/v1/vision/info"

                async with session.get(
                    info_url, timeout=aiohttp.ClientTimeout(total=self.timeout_seconds)
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {"error": f"HTTP {response.status}"}

        except Exception as e:
            self.logger.debug(f"Failed to get bridge capabilities: {e}")
            return {"error": str(e)}

    async def update_status_file(self, health_result: Dict[str, any]):
        """Update shared status file for other services"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.status_file), exist_ok=True)

            status_data = {
                "timestamp": datetime.now().isoformat(),
                "monitor_service": "ane_bridge_monitor",
                "bridge_url": self.bridge_url,
                "bridge_status": self.bridge_status,
                "health_check": health_result,
                "statistics": {
                    "total_checks": self.total_checks,
                    "total_failures": self.total_failures,
                    "consecutive_failures": self.consecutive_failures,
                    "success_rate": (
                        (self.total_checks - self.total_failures)
                        / max(self.total_checks, 1)
                    )
                    * 100,
                    "last_successful_check": (
                        self.last_successful_check.isoformat()
                        if self.last_successful_check
                        else None
                    ),
                },
            }

            with open(self.status_file, "w") as f:
                json.dump(status_data, f, indent=2)

            self.logger.debug(f"Status file updated: {self.status_file}")

        except Exception as e:
            self.logger.error(f"Failed to update status file: {e}")

    async def update_metrics_file(self, health_result: Dict[str, any]):
        """Update metrics file with historical data"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.metrics_file), exist_ok=True)

            # Load existing metrics
            metrics_data = []
            if os.path.exists(self.metrics_file):
                try:
                    with open(self.metrics_file) as f:
                        metrics_data = json.load(f)
                except:
                    metrics_data = []

            # Add new metric
            metric_entry = {
                "timestamp": datetime.now().isoformat(),
                "bridge_status": self.bridge_status,
                "response_time_ms": health_result.get("response_time_ms"),
                "success": health_result.get("status") == "healthy",
                "error": health_result.get("error"),
            }

            metrics_data.append(metric_entry)

            # Keep only last 1000 entries
            if len(metrics_data) > 1000:
                metrics_data = metrics_data[-1000:]

            with open(self.metrics_file, "w") as f:
                json.dump(metrics_data, f, indent=2)

        except Exception as e:
            self.logger.error(f"Failed to update metrics file: {e}")

    async def log_status_summary(self):
        """Log periodic status summary"""
        uptime = time.time() - self.start_time
        success_rate = (
            (self.total_checks - self.total_failures) / max(self.total_checks, 1)
        ) * 100

        status_msg = (
            f"ANE Bridge Status: {self.bridge_status} | "
            f"Success Rate: {success_rate:.1f}% ({self.total_checks} checks) | "
            f"Consecutive Failures: {self.consecutive_failures} | "
            f"Uptime: {uptime/3600:.1f}h"
        )

        if self.bridge_status == "connected":
            self.logger.info(status_msg)
        else:
            self.logger.warning(status_msg)

    async def monitor_loop(self):
        """Main monitoring loop"""
        self.start_time = time.time()
        self.logger.info("Starting ANE Bridge monitoring loop")

        summary_interval = 300  # 5 minutes
        last_summary = time.time()

        while True:
            try:
                # Perform health check
                health_result = await self.check_bridge_health()

                # Update status files
                await self.update_status_file(health_result)
                await self.update_metrics_file(health_result)

                # Log periodic summary
                if time.time() - last_summary >= summary_interval:
                    await self.log_status_summary()
                    last_summary = time.time()

                # Wait for next check
                await asyncio.sleep(self.check_interval)

            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(5)  # Brief pause before retry

    async def run_diagnostics(self):
        """Run comprehensive bridge diagnostics"""
        self.logger.info("Running ANE Bridge diagnostics")

        # Basic health check
        health_result = await self.check_bridge_health()
        self.logger.info(f"Health Check: {health_result['status']}")

        # Capabilities check
        capabilities = await self.check_bridge_capabilities()
        if "error" not in capabilities:
            self.logger.info(
                f"Bridge capabilities: {capabilities.get('service_name', 'Unknown')}"
            )
            self.logger.info(
                f"ANE Available: {capabilities.get('apple_neural_engine', {}).get('available', False)}"
            )

        # Performance test (if bridge is available)
        if health_result["status"] == "healthy":
            await self.run_performance_test()

    async def run_performance_test(self):
        """Run basic performance test"""
        self.logger.info("Running bridge performance test")

        # Test multiple health checks for response time consistency
        response_times = []

        for i in range(5):
            start_time = time.time()
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.bridge_url}/health",
                        timeout=aiohttp.ClientTimeout(total=5),
                    ) as response:
                        if response.status == 200:
                            response_time = (time.time() - start_time) * 1000
                            response_times.append(response_time)
            except:
                pass

            await asyncio.sleep(0.5)

        if response_times:
            avg_response_time = sum(response_times) / len(response_times)
            min_response_time = min(response_times)
            max_response_time = max(response_times)

            self.logger.info("Performance test results:")
            self.logger.info(f"  Average response time: {avg_response_time:.1f}ms")
            self.logger.info(
                f"  Min/Max response time: {min_response_time:.1f}ms / {max_response_time:.1f}ms"
            )
            self.logger.info(f"  Successful requests: {len(response_times)}/5")


async def main():
    """Main function"""
    import argparse

    parser = argparse.ArgumentParser(description="ANE Bridge Monitor")
    parser.add_argument("--config", help="Path to bridge configuration file")
    parser.add_argument(
        "--diagnostics", action="store_true", help="Run diagnostics and exit"
    )

    args = parser.parse_args()

    # Initialize monitor
    monitor = ANEBridgeMonitor(args.config)

    if args.diagnostics:
        # Run diagnostics only
        await monitor.run_diagnostics()
    else:
        # Run continuous monitoring
        await monitor.monitor_loop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down ANE Bridge Monitor...")
        sys.exit(0)
    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)
