#!/usr/bin/env python3

"""
Apple Silicon M4 Performance Monitor for Bytebot C/ua Framework

This module provides comprehensive performance monitoring specifically optimized
for Apple Silicon M4 Neural Engine systems, tracking optimization targets:

Performance Targets (from research report):
- CPU overhead: Reduce from 25% to 5-10%
- Memory usage: Optimize from 8GB to 4-6GB efficient allocation
- Container startup: Reduce from 120s to <30s
- OCR processing: Improve latency by 40-50% (2-5ms to 1-3ms)
- Throughput: Achieve 200-800 images/second

Key Features:
- Real-time Apple Silicon unified memory monitoring
- M4 performance core utilization tracking
- Zero-copy IPC performance metrics
- Neural Engine workload analysis
- Container startup optimization monitoring
"""

import argparse
import asyncio
import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

import psutil

# Configure comprehensive logging for performance analysis
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - [%(levelname)s] - M4Monitor - %(message)s",
    handlers=[
        logging.FileHandler("/opt/monitoring/logs/m4-performance-monitor.log"),
        logging.StreamHandler(),
    ],
)

logger = logging.getLogger("M4PerformanceMonitor")


@dataclass
class PerformanceMetrics:
    """Apple Silicon M4 Performance Metrics"""

    timestamp: str
    cpu_usage_percent: float
    cpu_cores_active: int
    performance_cores_usage: float
    efficiency_cores_usage: float
    memory_total_mb: int
    memory_used_mb: int
    memory_available_mb: int
    memory_efficiency_percent: float
    shared_memory_usage_mb: float
    zero_copy_operations: int
    ipc_latency_ms: float
    neural_engine_utilization: float
    container_startup_time_s: Optional[float]
    ocr_processing_latency_ms: float
    image_throughput_per_s: float

    # Target achievement tracking
    cpu_overhead_target_achieved: bool
    memory_usage_target_achieved: bool
    startup_time_target_achieved: bool
    latency_target_achieved: bool


class M4PerformanceMonitor:
    """
    Apple Silicon M4 Performance Monitor for Bytebot optimization tracking

    Monitors system performance against the optimization targets defined in
    the research report, providing real-time feedback on Apple Silicon M4
    specific optimizations.
    """

    def __init__(
        self,
        operation_id: str = None,
        target_cpu_overhead: int = 10,
        target_memory_usage: str = "4G",
        monitoring_interval: int = 5,
    ):
        """
        Initialize Apple Silicon M4 Performance Monitor

        Args:
            operation_id: Unique operation identifier
            target_cpu_overhead: Target CPU overhead percentage (default: 10%)
            target_memory_usage: Target memory usage (default: 4G)
            monitoring_interval: Monitoring interval in seconds (default: 5s)
        """
        self.operation_id = operation_id or self._generate_operation_id()
        self.target_cpu_overhead = target_cpu_overhead
        self.target_memory_mb = self._parse_memory_target(target_memory_usage)
        self.monitoring_interval = monitoring_interval

        self.metrics_history: List[PerformanceMetrics] = []
        self.monitoring_active = False
        self.start_time = datetime.now()

        # Performance tracking counters
        self.zero_copy_operations = 0
        self.total_operations = 0
        self.ipc_latency_samples = []
        self.ocr_latency_samples = []
        self.throughput_samples = []

        logger.info(
            f"[{self.operation_id}] Initializing Apple Silicon M4 Performance Monitor"
        )
        logger.info(
            f"[{self.operation_id}] Targets: CPU<{target_cpu_overhead}%, Memory<{target_memory_usage}, Startup<30s"
        )
        logger.info(
            f"[{self.operation_id}] Monitoring interval: {monitoring_interval}s"
        )

        # Initialize performance baselines
        self._initialize_performance_baselines()

    def _generate_operation_id(self) -> str:
        """Generate unique operation ID"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"m4_monitor_{timestamp}_{os.getpid()}"

    def _parse_memory_target(self, target: str) -> int:
        """Parse memory target string to MB"""
        if target.lower().endswith("g"):
            return int(target[:-1]) * 1024
        elif target.lower().endswith("m"):
            return int(target[:-1])
        else:
            return int(target)

    def _initialize_performance_baselines(self) -> None:
        """Initialize performance measurement baselines"""
        try:
            # Get initial system metrics
            initial_metrics = self._collect_system_metrics()
            logger.info(f"[{self.operation_id}] Performance baselines initialized")
            logger.info(
                f"[{self.operation_id}] Initial CPU usage: {initial_metrics.cpu_usage_percent:.1f}%"
            )
            logger.info(
                f"[{self.operation_id}] Initial memory usage: {initial_metrics.memory_used_mb}MB"
            )

        except Exception as e:
            logger.error(f"[{self.operation_id}] Failed to initialize baselines: {e}")

    def _collect_system_metrics(self) -> PerformanceMetrics:
        """
        Collect comprehensive system metrics optimized for Apple Silicon M4

        Returns:
            PerformanceMetrics with current system state
        """
        try:
            # CPU metrics with performance/efficiency core tracking
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_cores = psutil.cpu_count()
            cpu_per_core = psutil.cpu_percent(percpu=True, interval=0.1)

            # Apple Silicon M4 has 10 cores: 4 performance + 6 efficiency
            # Performance cores typically mapped to cores 0-3, efficiency cores 4-9
            performance_cores = (
                cpu_per_core[:4] if len(cpu_per_core) >= 4 else cpu_per_core
            )
            efficiency_cores = cpu_per_core[4:10] if len(cpu_per_core) >= 10 else []

            performance_cores_usage = (
                sum(performance_cores) / len(performance_cores)
                if performance_cores
                else 0
            )
            efficiency_cores_usage = (
                sum(efficiency_cores) / len(efficiency_cores) if efficiency_cores else 0
            )

            # Memory metrics optimized for unified memory architecture
            memory = psutil.virtual_memory()
            memory_total_mb = memory.total // (1024 * 1024)
            memory_used_mb = memory.used // (1024 * 1024)
            memory_available_mb = memory.available // (1024 * 1024)
            memory_efficiency = (
                (memory_used_mb / memory_total_mb) * 100 if memory_total_mb > 0 else 0
            )

            # Shared memory usage for zero-copy IPC
            shared_memory_usage = self._get_shared_memory_usage()

            # Calculate average IPC latency
            avg_ipc_latency = (
                sum(self.ipc_latency_samples) / len(self.ipc_latency_samples)
                if self.ipc_latency_samples
                else 0
            )

            # Calculate average OCR processing latency
            avg_ocr_latency = (
                sum(self.ocr_latency_samples) / len(self.ocr_latency_samples)
                if self.ocr_latency_samples
                else 0
            )

            # Calculate image throughput
            current_throughput = (
                sum(self.throughput_samples) / len(self.throughput_samples)
                if self.throughput_samples
                else 0
            )

            # Neural Engine utilization (estimated based on workload patterns)
            neural_engine_util = self._estimate_neural_engine_utilization()

            # Container startup time (if available)
            startup_time = self._get_container_startup_time()

            # Target achievement analysis
            cpu_target_achieved = cpu_percent <= self.target_cpu_overhead
            memory_target_achieved = memory_used_mb <= self.target_memory_mb
            startup_target_achieved = startup_time is None or startup_time <= 30.0
            latency_target_achieved = (
                avg_ocr_latency <= 3.0 if avg_ocr_latency > 0 else True
            )

            return PerformanceMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_usage_percent=cpu_percent,
                cpu_cores_active=cpu_cores,
                performance_cores_usage=performance_cores_usage,
                efficiency_cores_usage=efficiency_cores_usage,
                memory_total_mb=memory_total_mb,
                memory_used_mb=memory_used_mb,
                memory_available_mb=memory_available_mb,
                memory_efficiency_percent=memory_efficiency,
                shared_memory_usage_mb=shared_memory_usage,
                zero_copy_operations=self.zero_copy_operations,
                ipc_latency_ms=avg_ipc_latency,
                neural_engine_utilization=neural_engine_util,
                container_startup_time_s=startup_time,
                ocr_processing_latency_ms=avg_ocr_latency,
                image_throughput_per_s=current_throughput,
                cpu_overhead_target_achieved=cpu_target_achieved,
                memory_usage_target_achieved=memory_target_achieved,
                startup_time_target_achieved=startup_target_achieved,
                latency_target_achieved=latency_target_achieved,
            )

        except Exception as e:
            logger.error(f"[{self.operation_id}] Error collecting system metrics: {e}")
            # Return empty metrics on error
            return PerformanceMetrics(
                timestamp=datetime.now().isoformat(),
                cpu_usage_percent=0,
                cpu_cores_active=0,
                performance_cores_usage=0,
                efficiency_cores_usage=0,
                memory_total_mb=0,
                memory_used_mb=0,
                memory_available_mb=0,
                memory_efficiency_percent=0,
                shared_memory_usage_mb=0,
                zero_copy_operations=0,
                ipc_latency_ms=0,
                neural_engine_utilization=0,
                container_startup_time_s=None,
                ocr_processing_latency_ms=0,
                image_throughput_per_s=0,
                cpu_overhead_target_achieved=False,
                memory_usage_target_achieved=False,
                startup_time_target_achieved=False,
                latency_target_achieved=False,
            )

    def _get_shared_memory_usage(self) -> float:
        """Get shared memory usage in MB"""
        try:
            # Check /dev/shm usage for zero-copy IPC
            shm_path = "/dev/shm/ane-bridge"
            if os.path.exists(shm_path):
                total_size = 0
                for root, dirs, files in os.walk(shm_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        total_size += os.path.getsize(file_path)
                return total_size / (1024 * 1024)  # Convert to MB
            return 0.0
        except Exception as e:
            logger.warning(
                f"[{self.operation_id}] Could not get shared memory usage: {e}"
            )
            return 0.0

    def _estimate_neural_engine_utilization(self) -> float:
        """Estimate Apple Neural Engine utilization based on workload patterns"""
        try:
            # This is an approximation - actual ANE utilization requires specialized tools
            # We base this on CPU usage patterns and known ANE workloads

            # Check if ANE bridge is active
            ane_processes = []
            for proc in psutil.process_iter(["pid", "name", "cpu_percent"]):
                try:
                    if (
                        "ane" in proc.info["name"].lower()
                        or "neural" in proc.info["name"].lower()
                    ):
                        ane_processes.append(proc.info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            if ane_processes:
                # Estimate based on ANE-related process activity
                total_ane_cpu = sum(proc["cpu_percent"] for proc in ane_processes)
                # ANE utilization is typically higher than CPU usage for ML workloads
                estimated_ane_util = min(total_ane_cpu * 2.5, 100.0)
                return estimated_ane_util

            return 0.0

        except Exception as e:
            logger.warning(
                f"[{self.operation_id}] Could not estimate ANE utilization: {e}"
            )
            return 0.0

    def _get_container_startup_time(self) -> Optional[float]:
        """Get container startup time if available"""
        try:
            # Check for container startup markers
            startup_markers = [
                "/opt/monitoring/logs/m4-startup-*.log",
                "/tmp/container-start-time",
            ]

            for marker_pattern in startup_markers:
                if "*" in marker_pattern:
                    # Handle glob patterns
                    import glob

                    matching_files = glob.glob(marker_pattern)
                    if matching_files:
                        # Get most recent file
                        latest_file = max(matching_files, key=os.path.getmtime)
                        # Parse startup time from log
                        return self._parse_startup_time_from_log(latest_file)
                else:
                    if os.path.exists(marker_pattern):
                        with open(marker_pattern) as f:
                            content = f.read().strip()
                            return float(content)

            return None

        except Exception as e:
            logger.warning(
                f"[{self.operation_id}] Could not get container startup time: {e}"
            )
            return None

    def _parse_startup_time_from_log(self, log_file: str) -> Optional[float]:
        """Parse startup time from log file"""
        try:
            with open(log_file) as f:
                content = f.read()

            # Look for startup duration pattern
            import re

            pattern = r"Startup duration: (\d+) seconds"
            match = re.search(pattern, content)
            if match:
                return float(match.group(1))

            return None

        except Exception as e:
            logger.warning(
                f"[{self.operation_id}] Could not parse startup time from log: {e}"
            )
            return None

    def record_ipc_operation(self, latency_ms: float, zero_copy: bool = False) -> None:
        """
        Record IPC operation metrics

        Args:
            latency_ms: Operation latency in milliseconds
            zero_copy: Whether this was a zero-copy operation
        """
        self.total_operations += 1
        self.ipc_latency_samples.append(latency_ms)

        if zero_copy:
            self.zero_copy_operations += 1

        # Keep only recent samples (last 100)
        if len(self.ipc_latency_samples) > 100:
            self.ipc_latency_samples = self.ipc_latency_samples[-100:]

        logger.debug(
            f"[{self.operation_id}] Recorded IPC operation: {latency_ms:.2f}ms (zero-copy: {zero_copy})"
        )

    def record_ocr_operation(
        self, latency_ms: float, throughput_per_s: float = 0
    ) -> None:
        """
        Record OCR processing operation metrics

        Args:
            latency_ms: OCR processing latency in milliseconds
            throughput_per_s: Images processed per second
        """
        self.ocr_latency_samples.append(latency_ms)

        if throughput_per_s > 0:
            self.throughput_samples.append(throughput_per_s)

        # Keep only recent samples
        if len(self.ocr_latency_samples) > 100:
            self.ocr_latency_samples = self.ocr_latency_samples[-100:]

        if len(self.throughput_samples) > 50:
            self.throughput_samples = self.throughput_samples[-50:]

        logger.debug(
            f"[{self.operation_id}] Recorded OCR operation: {latency_ms:.2f}ms, throughput: {throughput_per_s:.1f}/s"
        )

    async def start_monitoring(self) -> None:
        """Start asynchronous performance monitoring"""
        self.monitoring_active = True
        logger.info(
            f"[{self.operation_id}] Starting Apple Silicon M4 performance monitoring"
        )

        while self.monitoring_active:
            try:
                # Collect current metrics
                metrics = self._collect_system_metrics()
                self.metrics_history.append(metrics)

                # Log current performance status
                self._log_performance_status(metrics)

                # Save metrics to shared memory for external access
                self._save_metrics_to_shared_memory(metrics)

                # Keep only recent history (last 500 samples)
                if len(self.metrics_history) > 500:
                    self.metrics_history = self.metrics_history[-500:]

                await asyncio.sleep(self.monitoring_interval)

            except Exception as e:
                logger.error(
                    f"[{self.operation_id}] Error during monitoring cycle: {e}"
                )
                await asyncio.sleep(1)  # Brief pause before retry

    def _log_performance_status(self, metrics: PerformanceMetrics) -> None:
        """Log current performance status with target achievements"""
        status_indicators = []

        if metrics.cpu_overhead_target_achieved:
            status_indicators.append(
                f"✅ CPU: {metrics.cpu_usage_percent:.1f}% (target: <{self.target_cpu_overhead}%)"
            )
        else:
            status_indicators.append(
                f"⚠️  CPU: {metrics.cpu_usage_percent:.1f}% (target: <{self.target_cpu_overhead}%)"
            )

        if metrics.memory_usage_target_achieved:
            status_indicators.append(
                f"✅ Memory: {metrics.memory_used_mb}MB (target: <{self.target_memory_mb}MB)"
            )
        else:
            status_indicators.append(
                f"⚠️  Memory: {metrics.memory_used_mb}MB (target: <{self.target_memory_mb}MB)"
            )

        if metrics.startup_time_target_achieved:
            startup_str = (
                f"{metrics.container_startup_time_s:.1f}s"
                if metrics.container_startup_time_s
                else "N/A"
            )
            status_indicators.append(f"✅ Startup: {startup_str} (target: <30s)")
        elif metrics.container_startup_time_s is not None:
            status_indicators.append(
                f"⚠️  Startup: {metrics.container_startup_time_s:.1f}s (target: <30s)"
            )

        if metrics.latency_target_achieved:
            status_indicators.append(
                f"✅ OCR Latency: {metrics.ocr_processing_latency_ms:.2f}ms (target: <3ms)"
            )
        elif metrics.ocr_processing_latency_ms > 0:
            status_indicators.append(
                f"⚠️  OCR Latency: {metrics.ocr_processing_latency_ms:.2f}ms (target: <3ms)"
            )

        logger.info(
            f"[{self.operation_id}] Performance Status: {' | '.join(status_indicators)}"
        )

        # Log additional Apple Silicon specific metrics
        logger.info(
            f"[{self.operation_id}] Apple Silicon: P-cores: {metrics.performance_cores_usage:.1f}%, E-cores: {metrics.efficiency_cores_usage:.1f}%, ANE: {metrics.neural_engine_utilization:.1f}%"
        )
        logger.info(
            f"[{self.operation_id}] Zero-copy ops: {metrics.zero_copy_operations}, Throughput: {metrics.image_throughput_per_s:.1f}/s"
        )

    def _save_metrics_to_shared_memory(self, metrics: PerformanceMetrics) -> None:
        """Save current metrics to shared memory for external monitoring"""
        try:
            metrics_path = "/dev/shm/ane-bridge/performance"
            os.makedirs(metrics_path, exist_ok=True)

            # Save current metrics
            current_metrics_file = os.path.join(metrics_path, "current_metrics.json")
            with open(current_metrics_file, "w") as f:
                json.dump(asdict(metrics), f, indent=2)

            # Save performance summary
            summary = self.generate_performance_summary()
            summary_file = os.path.join(metrics_path, "performance_summary.json")
            with open(summary_file, "w") as f:
                json.dump(summary, f, indent=2)

        except Exception as e:
            logger.warning(
                f"[{self.operation_id}] Could not save metrics to shared memory: {e}"
            )

    def stop_monitoring(self) -> None:
        """Stop performance monitoring"""
        self.monitoring_active = False
        logger.info(
            f"[{self.operation_id}] Stopped Apple Silicon M4 performance monitoring"
        )

    def generate_performance_summary(self) -> Dict[str, Any]:
        """
        Generate comprehensive performance summary report

        Returns:
            Performance summary with target achievement analysis
        """
        if not self.metrics_history:
            return {"error": "No metrics collected yet"}

        latest_metrics = self.metrics_history[-1]

        # Calculate averages over recent history (last 20 samples)
        recent_metrics = (
            self.metrics_history[-20:]
            if len(self.metrics_history) >= 20
            else self.metrics_history
        )

        avg_cpu = sum(m.cpu_usage_percent for m in recent_metrics) / len(recent_metrics)
        avg_memory = sum(m.memory_used_mb for m in recent_metrics) / len(recent_metrics)
        avg_ipc_latency = sum(m.ipc_latency_ms for m in recent_metrics) / len(
            recent_metrics
        )
        avg_ocr_latency = sum(
            m.ocr_processing_latency_ms for m in recent_metrics
        ) / len(recent_metrics)
        avg_throughput = sum(m.image_throughput_per_s for m in recent_metrics) / len(
            recent_metrics
        )

        # Target achievement analysis
        cpu_achievements = [m.cpu_overhead_target_achieved for m in recent_metrics]
        memory_achievements = [m.memory_usage_target_achieved for m in recent_metrics]
        latency_achievements = [m.latency_target_achieved for m in recent_metrics]

        cpu_achievement_rate = sum(cpu_achievements) / len(cpu_achievements) * 100
        memory_achievement_rate = (
            sum(memory_achievements) / len(memory_achievements) * 100
        )
        latency_achievement_rate = (
            sum(latency_achievements) / len(latency_achievements) * 100
        )

        return {
            "operation_id": self.operation_id,
            "monitoring_duration_minutes": (
                datetime.now() - self.start_time
            ).total_seconds()
            / 60,
            "samples_collected": len(self.metrics_history),
            "current_metrics": asdict(latest_metrics),
            "average_performance": {
                "cpu_usage_percent": avg_cpu,
                "memory_used_mb": avg_memory,
                "ipc_latency_ms": avg_ipc_latency,
                "ocr_latency_ms": avg_ocr_latency,
                "image_throughput_per_s": avg_throughput,
            },
            "target_achievements": {
                "cpu_target_achievement_rate_percent": cpu_achievement_rate,
                "memory_target_achievement_rate_percent": memory_achievement_rate,
                "latency_target_achievement_rate_percent": latency_achievement_rate,
            },
            "apple_silicon_optimizations": {
                "zero_copy_operations": self.zero_copy_operations,
                "total_operations": self.total_operations,
                "zero_copy_rate_percent": (
                    (self.zero_copy_operations / self.total_operations * 100)
                    if self.total_operations > 0
                    else 0
                ),
                "shared_memory_usage_mb": latest_metrics.shared_memory_usage_mb,
                "neural_engine_utilization_percent": latest_metrics.neural_engine_utilization,
            },
            "optimization_targets": {
                "cpu_overhead_target_percent": self.target_cpu_overhead,
                "memory_usage_target_mb": self.target_memory_mb,
                "startup_time_target_s": 30,
                "ocr_latency_target_ms": 3.0,
                "throughput_target_per_s": 200,
            },
        }


async def main():
    """Main function for Apple Silicon M4 performance monitoring"""
    parser = argparse.ArgumentParser(description="Apple Silicon M4 Performance Monitor")
    parser.add_argument(
        "--apple-silicon-m4", action="store_true", help="Enable M4 optimizations"
    )
    parser.add_argument("--operation-id", type=str, help="Operation ID for tracking")
    parser.add_argument(
        "--target-cpu-overhead",
        type=int,
        default=10,
        help="Target CPU overhead percentage",
    )
    parser.add_argument(
        "--target-memory-usage", type=str, default="4G", help="Target memory usage"
    )
    parser.add_argument(
        "--monitoring-interval",
        type=int,
        default=5,
        help="Monitoring interval in seconds",
    )
    parser.add_argument("--duration", type=int, help="Monitoring duration in seconds")

    args = parser.parse_args()

    # Initialize M4 performance monitor
    monitor = M4PerformanceMonitor(
        operation_id=args.operation_id,
        target_cpu_overhead=args.target_cpu_overhead,
        target_memory_usage=args.target_memory_usage,
        monitoring_interval=args.monitoring_interval,
    )

    logger.info("Starting Apple Silicon M4 Performance Monitor...")

    try:
        if args.duration:
            # Run for specified duration
            monitoring_task = asyncio.create_task(monitor.start_monitoring())
            await asyncio.sleep(args.duration)
            monitor.stop_monitoring()
            await monitoring_task
        else:
            # Run indefinitely
            await monitor.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Received interrupt, stopping monitoring...")
        monitor.stop_monitoring()
    except Exception as e:
        logger.error(f"Monitoring error: {e}")
    finally:
        # Generate final performance report
        summary = monitor.generate_performance_summary()
        logger.info("=== Final Performance Summary ===")
        logger.info(json.dumps(summary, indent=2))

        # Save final report
        report_file = (
            f"/opt/monitoring/logs/m4-performance-report-{monitor.operation_id}.json"
        )
        with open(report_file, "w") as f:
            json.dump(summary, f, indent=2)
        logger.info(f"Performance report saved to: {report_file}")


if __name__ == "__main__":
    asyncio.run(main())
