#!/usr/bin/env python3
"""
Apple Neural Engine Resource Monitor for Phase 1.2.1

Advanced ANE resource management with dynamic allocation, utilization optimization,
and performance monitoring for maximum Neural Engine efficiency.

Author: Development Agent - Phase 1.2.1 Enhancement
Date: 2025-09-05
Version: 1.2.1
"""

import asyncio
import logging
import subprocess
import time
from collections import deque
from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional

import psutil


@dataclass
class ANEUtilization:
    """ANE utilization data"""

    timestamp: float
    ane_usage: float
    ane_temperature: Optional[float]
    throughput: float
    active_requests: int
    queue_depth: int
    efficiency_score: float


@dataclass
class ResourceAllocation:
    """Resource allocation configuration"""

    max_concurrent_requests: int
    batch_size_recommendation: int
    priority_queue_size: int
    memory_limit_mb: int
    throttle_threshold: float


class ANEResourceMonitor:
    """
    Apple Neural Engine Resource Monitor for Phase 1.2.1 Enhancement

    Provides comprehensive monitoring and optimization of ANE resources including:
    - Real-time utilization tracking
    - Dynamic resource allocation
    - Performance optimization recommendations
    - Thermal and power management
    - Predictive load balancing
    """

    def __init__(self, hardware_info: Dict[str, Any], config: Dict[str, Any]):
        """Initialize the ANE resource monitor"""
        self.logger = logging.getLogger("ANEResourceMonitor")
        self.hardware_info = hardware_info
        self.config = config

        # Monitoring state
        self.is_initialized = False
        self.monitoring_active = False

        # Resource tracking
        self.utilization_history = deque(maxlen=config.get("history_size", 1000))
        self.performance_baseline = {}
        self.thermal_history = deque(maxlen=100)

        # Resource allocation management
        self.current_allocation = ResourceAllocation(
            max_concurrent_requests=config.get("max_concurrent", 10),
            batch_size_recommendation=config.get("initial_batch_size", 5),
            priority_queue_size=config.get("queue_size", 50),
            memory_limit_mb=config.get("memory_limit_mb", 2048),
            throttle_threshold=config.get("throttle_threshold", 0.85),
        )

        # Performance optimization
        self.optimization_enabled = config.get("optimization_enabled", True)
        self.adaptive_throttling = config.get("adaptive_throttling", True)
        self.predictive_scaling = config.get("predictive_scaling", True)

        # Monitoring intervals
        self.monitoring_interval = (
            config.get("monitoring_interval_ms", 1000) / 1000.0
        )  # Convert to seconds
        self.optimization_interval = (
            config.get("optimization_interval_ms", 5000) / 1000.0
        )

        self.logger.info("ANE resource monitor initialized")

    async def initialize(self):
        """Initialize the ANE resource monitor"""
        try:
            self.logger.info("Initializing ANE resource monitor")

            # Detect ANE capabilities
            ane_capabilities = await self._detect_ane_capabilities()
            self.logger.info(f"ANE capabilities detected: {ane_capabilities}")

            # Establish performance baseline
            await self._establish_performance_baseline()

            # Start monitoring background tasks
            if self.optimization_enabled:
                asyncio.create_task(self._resource_optimization_loop())

            self.is_initialized = True
            self.monitoring_active = True

            self.logger.info("ANE resource monitor initialization complete")

        except Exception as e:
            self.logger.error(f"Failed to initialize ANE resource monitor: {e}")
            raise

    async def get_current_utilization(self) -> Dict[str, float]:
        """Get current ANE utilization metrics"""
        try:
            # Collect system metrics
            system_metrics = await self._collect_system_metrics()

            # Calculate ANE-specific utilization with Phase 1.1.3 direct Core ML metrics
            ane_utilization = await self._calculate_ane_utilization()

            # Phase 1.1.3: Add Core ML direct access metrics
            coreml_metrics = await self._get_coreml_direct_metrics()

            # Combine metrics
            utilization_data = {
                **system_metrics,
                **ane_utilization,
                **coreml_metrics,
                "timestamp": time.time(),
            }

            # Store in history
            self.utilization_history.append(
                ANEUtilization(
                    timestamp=utilization_data["timestamp"],
                    ane_usage=utilization_data.get("ane_usage", 0.0),
                    ane_temperature=utilization_data.get("ane_temperature"),
                    throughput=utilization_data.get("throughput", 0.0),
                    active_requests=utilization_data.get("active_requests", 0),
                    queue_depth=utilization_data.get("queue_depth", 0),
                    efficiency_score=utilization_data.get("efficiency_score", 0.0),
                )
            )

            return utilization_data

        except Exception as e:
            self.logger.error(f"Failed to get current utilization: {e}")
            return {
                "ane_usage": 0.0,
                "throughput": 0.0,
                "active_requests": 0,
                "queue_depth": 0,
                "efficiency_score": 0.0,
                "timestamp": time.time(),
            }

    async def optimize_allocation(
        self, current_load: Dict[str, Any]
    ) -> ResourceAllocation:
        """Optimize resource allocation based on current load"""
        try:
            # Analyze current load patterns
            load_analysis = await self._analyze_load_patterns(current_load)

            # Calculate optimal allocation
            optimal_allocation = await self._calculate_optimal_allocation(load_analysis)

            # Update current allocation
            self.current_allocation = optimal_allocation

            self.logger.debug(
                f"Resource allocation optimized: {asdict(optimal_allocation)}"
            )
            return optimal_allocation

        except Exception as e:
            self.logger.error(f"Failed to optimize resource allocation: {e}")
            return self.current_allocation

    async def should_throttle(self) -> bool:
        """Determine if requests should be throttled based on current conditions"""
        try:
            if not self.adaptive_throttling:
                return False

            current_utilization = await self.get_current_utilization()

            # Check multiple throttling conditions
            throttle_conditions = [
                current_utilization.get("ane_usage", 0)
                > self.current_allocation.throttle_threshold,
                current_utilization.get("ane_temperature", 0)
                > 80.0,  # High temperature threshold
                current_utilization.get("queue_depth", 0)
                > self.current_allocation.priority_queue_size * 0.8,
            ]

            should_throttle = any(throttle_conditions)

            if should_throttle:
                self.logger.debug("Throttling recommended based on current conditions")

            return should_throttle

        except Exception as e:
            self.logger.error(f"Failed to determine throttling status: {e}")
            return False

    async def get_performance_recommendations(self) -> Dict[str, Any]:
        """Get performance optimization recommendations"""
        try:
            if not self.utilization_history:
                return {"recommendations": [], "confidence": 0.0}

            recommendations = []

            # Analyze recent performance
            recent_utilizations = list(self.utilization_history)[
                -20:
            ]  # Last 20 readings

            avg_utilization = sum(u.ane_usage for u in recent_utilizations) / len(
                recent_utilizations
            )
            avg_efficiency = sum(u.efficiency_score for u in recent_utilizations) / len(
                recent_utilizations
            )

            # Generate recommendations based on analysis
            if avg_utilization < 0.3:
                recommendations.append(
                    {
                        "type": "increase_batch_size",
                        "current": self.current_allocation.batch_size_recommendation,
                        "recommended": min(
                            20, self.current_allocation.batch_size_recommendation + 2
                        ),
                        "reason": "Low ANE utilization - can handle larger batches",
                    }
                )

            elif avg_utilization > 0.8:
                recommendations.append(
                    {
                        "type": "decrease_batch_size",
                        "current": self.current_allocation.batch_size_recommendation,
                        "recommended": max(
                            1, self.current_allocation.batch_size_recommendation - 1
                        ),
                        "reason": "High ANE utilization - reduce batch sizes for stability",
                    }
                )

            if avg_efficiency < 0.6:
                recommendations.append(
                    {
                        "type": "optimize_concurrent_requests",
                        "current": self.current_allocation.max_concurrent_requests,
                        "recommended": max(
                            4, self.current_allocation.max_concurrent_requests - 2
                        ),
                        "reason": "Low efficiency - reduce concurrent requests",
                    }
                )

            # Calculate confidence based on data quality
            confidence = min(1.0, len(recent_utilizations) / 20.0)

            return {
                "recommendations": recommendations,
                "confidence": confidence,
                "avg_utilization": avg_utilization,
                "avg_efficiency": avg_efficiency,
            }

        except Exception as e:
            self.logger.error(f"Failed to generate performance recommendations: {e}")
            return {"recommendations": [], "confidence": 0.0}

    async def get_resource_metrics(self) -> Dict[str, Any]:
        """Get comprehensive resource metrics"""
        try:
            current_utilization = await self.get_current_utilization()

            # Calculate historical metrics
            if self.utilization_history:
                historical_data = list(self.utilization_history)
                avg_utilization = sum(u.ane_usage for u in historical_data) / len(
                    historical_data
                )
                peak_utilization = max(u.ane_usage for u in historical_data)
                avg_throughput = sum(u.throughput for u in historical_data) / len(
                    historical_data
                )
                peak_throughput = max(u.throughput for u in historical_data)
            else:
                avg_utilization = peak_utilization = avg_throughput = (
                    peak_throughput
                ) = 0.0

            return {
                "current_utilization": current_utilization,
                "historical_metrics": {
                    "avg_utilization": avg_utilization,
                    "peak_utilization": peak_utilization,
                    "avg_throughput": avg_throughput,
                    "peak_throughput": peak_throughput,
                    "sample_count": len(self.utilization_history),
                },
                "resource_allocation": asdict(self.current_allocation),
                "monitoring_status": {
                    "is_initialized": self.is_initialized,
                    "monitoring_active": self.monitoring_active,
                    "optimization_enabled": self.optimization_enabled,
                },
            }

        except Exception as e:
            self.logger.error(f"Failed to get resource metrics: {e}")
            return {}

    # === Private Methods ===

    async def _detect_ane_capabilities(self) -> Dict[str, Any]:
        """Detect ANE hardware capabilities"""
        try:
            capabilities = {
                "ane_present": False,
                "ane_version": "unknown",
                "cores": 0,
                "memory_gb": 0,
                "thermal_design_power": 0,
            }

            # Try to detect ANE through system profiler
            try:
                result = subprocess.run(
                    ["system_profiler", "SPHardwareDataType"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )

                if result.returncode == 0:
                    output = result.stdout.lower()

                    # Look for Apple Silicon indicators
                    if any(
                        chip in output for chip in ["m1", "m2", "m3", "m4", "apple"]
                    ):
                        capabilities["ane_present"] = True

                        # Try to determine chip generation
                        if "m4" in output:
                            capabilities["ane_version"] = "ANE 4.0"
                            capabilities["cores"] = 16
                        elif "m3" in output:
                            capabilities["ane_version"] = "ANE 3.0"
                            capabilities["cores"] = 16
                        elif "m2" in output:
                            capabilities["ane_version"] = "ANE 2.0"
                            capabilities["cores"] = 16
                        elif "m1" in output:
                            capabilities["ane_version"] = "ANE 1.0"
                            capabilities["cores"] = 16

            except (subprocess.TimeoutExpired, subprocess.SubprocessError):
                pass

            return capabilities

        except Exception as e:
            self.logger.error(f"Failed to detect ANE capabilities: {e}")
            return {"ane_present": False}

    async def _establish_performance_baseline(self):
        """Establish performance baseline for comparison"""
        try:
            self.logger.info("Establishing ANE performance baseline")

            # Collect baseline measurements
            baseline_measurements = []

            for i in range(5):
                measurement = await self._collect_system_metrics()
                baseline_measurements.append(measurement)
                await asyncio.sleep(1)

            # Calculate baseline values
            if baseline_measurements:
                self.performance_baseline = {
                    "avg_cpu_usage": sum(
                        m.get("cpu_usage", 0) for m in baseline_measurements
                    )
                    / len(baseline_measurements),
                    "avg_memory_usage": sum(
                        m.get("memory_usage", 0) for m in baseline_measurements
                    )
                    / len(baseline_measurements),
                    "baseline_timestamp": time.time(),
                }

            self.logger.info(
                f"Performance baseline established: {self.performance_baseline}"
            )

        except Exception as e:
            self.logger.error(f"Failed to establish performance baseline: {e}")
            self.performance_baseline = {"baseline_timestamp": time.time()}

    async def _collect_system_metrics(self) -> Dict[str, float]:
        """Collect current system metrics"""
        try:
            # CPU and memory metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()

            # Process-specific metrics
            current_process = psutil.Process()
            process_memory = current_process.memory_info().rss / (1024 * 1024)  # MB
            process_cpu = current_process.cpu_percent()

            return {
                "cpu_usage": cpu_percent,
                "memory_usage": memory.percent,
                "available_memory_mb": memory.available / (1024 * 1024),
                "process_memory_mb": process_memory,
                "process_cpu": process_cpu,
                "load_average": (
                    psutil.getloadavg()[0] if hasattr(psutil, "getloadavg") else 0.0
                ),
            }

        except Exception as e:
            self.logger.error(f"Failed to collect system metrics: {e}")
            return {}

    async def _calculate_ane_utilization(self) -> Dict[str, float]:
        """Calculate ANE-specific utilization metrics"""
        try:
            # This is a simplified calculation
            # In a real implementation, this would interface with Core ML performance counters

            # Estimate ANE usage based on system activity
            system_metrics = await self._collect_system_metrics()

            # Heuristic calculation (would be replaced with actual ANE metrics)
            estimated_ane_usage = min(100.0, system_metrics.get("process_cpu", 0) * 2.0)

            # Simulate throughput calculation
            estimated_throughput = max(0.0, 100.0 - estimated_ane_usage)

            # Efficiency score based on utilization vs performance
            efficiency_score = (
                estimated_throughput / max(1.0, estimated_ane_usage)
            ) * 10.0
            efficiency_score = min(100.0, efficiency_score)

            return {
                "ane_usage": estimated_ane_usage,
                "throughput": estimated_throughput,
                "efficiency_score": efficiency_score,
                "active_requests": 0,  # Would be updated from actual request tracking
                "queue_depth": 0,  # Would be updated from actual queue monitoring
            }

        except Exception as e:
            self.logger.error(f"Failed to calculate ANE utilization: {e}")
            return {
                "ane_usage": 0.0,
                "throughput": 0.0,
                "efficiency_score": 0.0,
                "active_requests": 0,
                "queue_depth": 0,
            }

    async def _analyze_load_patterns(
        self, current_load: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze load patterns for optimization"""
        try:
            if not self.utilization_history:
                return {"pattern": "unknown", "trend": "stable"}

            recent_data = list(self.utilization_history)[-10:]

            # Calculate trends
            if len(recent_data) >= 2:
                utilization_trend = recent_data[-1].ane_usage - recent_data[0].ane_usage
                throughput_trend = (
                    recent_data[-1].throughput - recent_data[0].throughput
                )
            else:
                utilization_trend = throughput_trend = 0.0

            # Determine pattern
            avg_utilization = sum(u.ane_usage for u in recent_data) / len(recent_data)

            if avg_utilization < 30:
                pattern = "low_utilization"
            elif avg_utilization > 80:
                pattern = "high_utilization"
            else:
                pattern = "normal_utilization"

            # Determine trend
            if abs(utilization_trend) < 5:
                trend = "stable"
            elif utilization_trend > 5:
                trend = "increasing"
            else:
                trend = "decreasing"

            return {
                "pattern": pattern,
                "trend": trend,
                "utilization_trend": utilization_trend,
                "throughput_trend": throughput_trend,
                "avg_utilization": avg_utilization,
            }

        except Exception as e:
            self.logger.error(f"Failed to analyze load patterns: {e}")
            return {"pattern": "unknown", "trend": "stable"}

    async def _calculate_optimal_allocation(
        self, load_analysis: Dict[str, Any]
    ) -> ResourceAllocation:
        """Calculate optimal resource allocation"""
        try:
            # Start with current allocation
            optimal = ResourceAllocation(
                max_concurrent_requests=self.current_allocation.max_concurrent_requests,
                batch_size_recommendation=self.current_allocation.batch_size_recommendation,
                priority_queue_size=self.current_allocation.priority_queue_size,
                memory_limit_mb=self.current_allocation.memory_limit_mb,
                throttle_threshold=self.current_allocation.throttle_threshold,
            )

            pattern = load_analysis.get("pattern", "normal_utilization")
            trend = load_analysis.get("trend", "stable")

            # Adjust based on load patterns
            if pattern == "low_utilization" and trend != "increasing":
                # Increase capacity for better throughput
                optimal.max_concurrent_requests = min(
                    15, optimal.max_concurrent_requests + 1
                )
                optimal.batch_size_recommendation = min(
                    15, optimal.batch_size_recommendation + 1
                )

            elif pattern == "high_utilization" and trend != "decreasing":
                # Reduce capacity to maintain stability
                optimal.max_concurrent_requests = max(
                    4, optimal.max_concurrent_requests - 1
                )
                optimal.batch_size_recommendation = max(
                    2, optimal.batch_size_recommendation - 1
                )
                optimal.throttle_threshold = max(0.7, optimal.throttle_threshold - 0.05)

            return optimal

        except Exception as e:
            self.logger.error(f"Failed to calculate optimal allocation: {e}")
            return self.current_allocation

    async def _resource_optimization_loop(self):
        """Background loop for continuous resource optimization"""
        self.logger.info("Starting resource optimization loop")

        while self.monitoring_active:
            try:
                # Get current utilization
                current_utilization = await self.get_current_utilization()

                # Optimize allocation if needed
                if self.optimization_enabled:
                    await self.optimize_allocation(current_utilization)

                # Sleep until next optimization cycle
                await asyncio.sleep(self.optimization_interval)

            except asyncio.CancelledError:
                self.logger.info("Resource optimization loop cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error in resource optimization loop: {e}")
                await asyncio.sleep(30)  # Back off on error

    async def _get_coreml_direct_metrics(self) -> Dict[str, float]:
        """Get Core ML direct access metrics - Phase 1.1.3"""
        try:
            # Placeholder metrics for Core ML direct access performance
            # In a real implementation, these would interface with Core ML performance counters
            return {
                "coreml_direct_requests": 0.0,  # Number of direct Core ML requests
                "coreml_avg_latency_ms": 0.0,  # Average latency for direct requests
                "coreml_cache_hit_rate": 0.0,  # Model cache hit rate
                "coreml_memory_usage_mb": 0.0,  # Memory usage for Core ML models
                "ane_direct_utilization": 0.0,  # Direct ANE utilization percentage
            }
        except Exception as e:
            self.logger.error(f"Failed to get Core ML direct metrics: {e}")
            return {}

    async def shutdown(self):
        """Shutdown the resource monitor"""
        try:
            self.logger.info("Shutting down ANE resource monitor")

            self.monitoring_active = False

            # Allow background tasks to finish
            await asyncio.sleep(1)

            self.logger.info("ANE resource monitor shutdown complete")

        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
