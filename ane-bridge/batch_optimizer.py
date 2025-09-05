#!/usr/bin/env python3
"""
Dynamic Batch Optimizer for Phase 1.2.1

Advanced batch processing optimization with adaptive sizing, priority-based processing,
and intelligent concurrency management for 2-5x throughput improvement.

Author: Development Agent - Phase 1.2.1 Enhancement
Date: 2025-09-05
Version: 1.2.1
"""

import base64
import logging
import time
from collections import deque
from dataclasses import dataclass
from typing import Any, Dict, List

import psutil


@dataclass
class BatchConfig:
    """Configuration for dynamic batch optimization"""

    high_priority_batch_size: int
    normal_priority_batch_size: int
    max_concurrent: int
    adaptive_threshold: float
    performance_target_ms: float


@dataclass
class PrioritizedBatch:
    """A batch of requests with priority information"""

    requests: List[Dict[str, Any]]
    priority: str
    estimated_processing_time_ms: float
    batch_id: str


class DynamicBatchOptimizer:
    """
    Dynamic Batch Optimizer for Phase 1.2.1 Enhancement

    Provides intelligent batch sizing and optimization based on:
    - Current system load and resource utilization
    - Request characteristics and priorities
    - Historical performance data
    - ANE utilization patterns
    """

    def __init__(
        self,
        initial_size: int = 5,
        adaptive_sizing: bool = True,
        performance_monitor=None,
    ):
        """Initialize the dynamic batch optimizer"""
        self.logger = logging.getLogger("DynamicBatchOptimizer")

        # Configuration
        self.initial_size = initial_size
        self.adaptive_sizing = adaptive_sizing
        self.performance_monitor = performance_monitor

        # Current optimization state
        self.current_config = BatchConfig(
            high_priority_batch_size=max(
                2, initial_size // 2
            ),  # Smaller batches for high priority
            normal_priority_batch_size=initial_size,
            max_concurrent=8,
            adaptive_threshold=0.7,  # ANE utilization threshold for adaptation
            performance_target_ms=5.0,  # Target processing time per request
        )

        # Performance history for optimization
        self.performance_history = deque(maxlen=100)
        self.adaptation_history = deque(maxlen=50)

        # System metrics
        self.cpu_utilization_history = deque(maxlen=20)
        self.memory_utilization_history = deque(maxlen=20)

        self.logger.info(
            f"Dynamic batch optimizer initialized with adaptive sizing: {adaptive_sizing}"
        )

    async def optimize_batch(
        self, requests: List[Dict[str, Any]]
    ) -> List[List[Dict[str, Any]]]:
        """
        Optimize batch processing by creating intelligent sub-batches

        Args:
            requests: List of OCR requests to optimize

        Returns:
            List of optimized batches for concurrent processing
        """
        if not requests:
            return []

        try:
            self.logger.debug(f"Optimizing batch of {len(requests)} requests")

            # Analyze current system state
            system_state = await self._analyze_system_state()

            # Update batch configuration based on system state
            if self.adaptive_sizing:
                await self._adapt_batch_sizes(system_state)

            # Separate requests by priority
            prioritized_batches = await self._create_prioritized_batches(requests)

            # Further optimize each batch based on characteristics
            optimized_batches = []
            for batch in prioritized_batches:
                sub_batches = await self._optimize_single_batch(batch, system_state)
                optimized_batches.extend(sub_batches)

            self.logger.debug(f"Created {len(optimized_batches)} optimized batches")
            return [batch.requests for batch in optimized_batches]

        except Exception as e:
            self.logger.error(f"Failed to optimize batch: {e}")
            # Fallback to simple batching
            return [requests]

    async def adjust_for_utilization(self, utilization: Dict[str, float]):
        """Adjust batch sizes based on current ANE utilization"""
        try:
            ane_usage = utilization.get("ane_usage", 0.0)
            throughput = utilization.get("throughput", 0.0)

            # Record performance data
            self.performance_history.append(
                {
                    "timestamp": time.time(),
                    "ane_usage": ane_usage,
                    "throughput": throughput,
                    "batch_size_high": self.current_config.high_priority_batch_size,
                    "batch_size_normal": self.current_config.normal_priority_batch_size,
                }
            )

            # Adaptive adjustment logic
            if ane_usage < 0.5:  # Low utilization - increase batch sizes
                self._increase_batch_sizes()
            elif ane_usage > 0.8:  # High utilization - decrease batch sizes
                self._decrease_batch_sizes()

            # Log adjustments
            self.logger.debug(
                f"Adjusted batch sizes based on ANE utilization: {ane_usage:.2f}"
            )

        except Exception as e:
            self.logger.error(f"Failed to adjust for utilization: {e}")

    async def _analyze_system_state(self) -> Dict[str, float]:
        """Analyze current system state for optimization decisions"""
        try:
            # Get current CPU and memory usage
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory_percent = psutil.virtual_memory().percent

            self.cpu_utilization_history.append(cpu_percent)
            self.memory_utilization_history.append(memory_percent)

            # Calculate moving averages
            avg_cpu = sum(self.cpu_utilization_history) / len(
                self.cpu_utilization_history
            )
            avg_memory = sum(self.memory_utilization_history) / len(
                self.memory_utilization_history
            )

            # Get ANE utilization if performance monitor is available
            ane_utilization = 0.0
            if self.performance_monitor:
                ane_data = await self.performance_monitor.get_current_utilization()
                ane_utilization = ane_data.get("ane_usage", 0.0)

            system_state = {
                "cpu_utilization": avg_cpu,
                "memory_utilization": avg_memory,
                "ane_utilization": ane_utilization,
                "system_load": (avg_cpu + avg_memory + ane_utilization) / 3,
                "timestamp": time.time(),
            }

            self.logger.debug(
                f"System state analysis: CPU={avg_cpu:.1f}%, Memory={avg_memory:.1f}%, ANE={ane_utilization:.1f}%"
            )
            return system_state

        except Exception as e:
            self.logger.error(f"Failed to analyze system state: {e}")
            return {
                "cpu_utilization": 50.0,
                "memory_utilization": 50.0,
                "ane_utilization": 50.0,
                "system_load": 50.0,
                "timestamp": time.time(),
            }

    async def _adapt_batch_sizes(self, system_state: Dict[str, float]):
        """Adapt batch sizes based on system state"""
        try:
            system_load = system_state.get("system_load", 50.0)

            # Adaptation logic based on system load
            if system_load < 30.0:  # Low load - increase batch sizes
                self.current_config.high_priority_batch_size = min(
                    10, self.current_config.high_priority_batch_size + 1
                )
                self.current_config.normal_priority_batch_size = min(
                    20, self.current_config.normal_priority_batch_size + 2
                )
                self.current_config.max_concurrent = min(
                    12, self.current_config.max_concurrent + 1
                )

            elif system_load > 80.0:  # High load - decrease batch sizes
                self.current_config.high_priority_batch_size = max(
                    1, self.current_config.high_priority_batch_size - 1
                )
                self.current_config.normal_priority_batch_size = max(
                    2, self.current_config.normal_priority_batch_size - 2
                )
                self.current_config.max_concurrent = max(
                    4, self.current_config.max_concurrent - 1
                )

            # Record adaptation decision
            self.adaptation_history.append(
                {
                    "timestamp": time.time(),
                    "system_load": system_load,
                    "high_priority_batch_size": self.current_config.high_priority_batch_size,
                    "normal_priority_batch_size": self.current_config.normal_priority_batch_size,
                    "max_concurrent": self.current_config.max_concurrent,
                }
            )

        except Exception as e:
            self.logger.error(f"Failed to adapt batch sizes: {e}")

    async def _create_prioritized_batches(
        self, requests: List[Dict[str, Any]]
    ) -> List[PrioritizedBatch]:
        """Create prioritized batches from requests"""
        try:
            # Separate requests by priority
            high_priority_requests = [
                r for r in requests if r.get("priority", "normal") == "high"
            ]
            normal_priority_requests = [
                r for r in requests if r.get("priority", "normal") == "normal"
            ]
            low_priority_requests = [
                r for r in requests if r.get("priority", "normal") == "low"
            ]

            prioritized_batches = []

            # Create high priority batches (smaller sizes for lower latency)
            for i in range(
                0,
                len(high_priority_requests),
                self.current_config.high_priority_batch_size,
            ):
                batch_requests = high_priority_requests[
                    i : i + self.current_config.high_priority_batch_size
                ]
                estimated_time = (
                    len(batch_requests) * self.current_config.performance_target_ms
                )

                batch = PrioritizedBatch(
                    requests=batch_requests,
                    priority="high",
                    estimated_processing_time_ms=estimated_time,
                    batch_id=f"high_priority_{i // self.current_config.high_priority_batch_size}",
                )
                prioritized_batches.append(batch)

            # Create normal priority batches (larger sizes for better throughput)
            for i in range(
                0,
                len(normal_priority_requests),
                self.current_config.normal_priority_batch_size,
            ):
                batch_requests = normal_priority_requests[
                    i : i + self.current_config.normal_priority_batch_size
                ]
                estimated_time = (
                    len(batch_requests) * self.current_config.performance_target_ms
                )

                batch = PrioritizedBatch(
                    requests=batch_requests,
                    priority="normal",
                    estimated_processing_time_ms=estimated_time,
                    batch_id=f"normal_priority_{i // self.current_config.normal_priority_batch_size}",
                )
                prioritized_batches.append(batch)

            # Create low priority batches (largest sizes for maximum throughput)
            low_priority_batch_size = max(
                self.current_config.normal_priority_batch_size, 10
            )
            for i in range(0, len(low_priority_requests), low_priority_batch_size):
                batch_requests = low_priority_requests[i : i + low_priority_batch_size]
                estimated_time = (
                    len(batch_requests) * self.current_config.performance_target_ms
                )

                batch = PrioritizedBatch(
                    requests=batch_requests,
                    priority="low",
                    estimated_processing_time_ms=estimated_time,
                    batch_id=f"low_priority_{i // low_priority_batch_size}",
                )
                prioritized_batches.append(batch)

            # Sort batches by priority (high first, then normal, then low)
            priority_order = {"high": 0, "normal": 1, "low": 2}
            prioritized_batches.sort(key=lambda b: priority_order.get(b.priority, 1))

            return prioritized_batches

        except Exception as e:
            self.logger.error(f"Failed to create prioritized batches: {e}")
            # Fallback to single batch
            return [
                PrioritizedBatch(
                    requests=requests,
                    priority="normal",
                    estimated_processing_time_ms=len(requests)
                    * self.current_config.performance_target_ms,
                    batch_id="fallback_batch",
                )
            ]

    async def _optimize_single_batch(
        self, batch: PrioritizedBatch, system_state: Dict[str, float]
    ) -> List[PrioritizedBatch]:
        """Further optimize a single batch based on request characteristics - Phase 1.1.3 Enhanced"""
        try:
            # Phase 1.1.3: Enhanced batch optimization for Core ML direct access
            if len(batch.requests) <= 2:
                # Small batches - no further optimization needed
                return [batch]

            # Analyze request characteristics for optimal batching
            image_sizes = []
            recognition_levels = []
            languages = []

            for request in batch.requests:
                # Analyze image data size
                image_data = request.get("image_data", "")
                if image_data:
                    image_sizes.append(
                        len(base64.b64decode(image_data)) if image_data else 0
                    )

                # Track recognition levels and languages
                recognition_levels.append(request.get("recognition_level", "accurate"))
                languages.extend(request.get("languages", ["en-US"]))

            # Group similar requests for better ANE utilization
            similar_batches = self._group_similar_requests(
                batch.requests,
                {
                    "avg_image_size": (
                        sum(image_sizes) / len(image_sizes) if image_sizes else 0
                    ),
                    "common_recognition_level": (
                        max(set(recognition_levels), key=recognition_levels.count)
                        if recognition_levels
                        else "accurate"
                    ),
                    "common_languages": list(set(languages)),
                },
            )

            # Create optimized sub-batches
            optimized_batches = []
            for i, sub_requests in enumerate(similar_batches):
                sub_batch = PrioritizedBatch(
                    requests=sub_requests,
                    priority=batch.priority,
                    estimated_processing_time_ms=len(sub_requests)
                    * self.current_config.performance_target_ms,
                    batch_id=f"{batch.batch_id}_optimized_{i}",
                )
                optimized_batches.append(sub_batch)

            self.logger.debug(
                f"Optimized batch {batch.batch_id} into {len(optimized_batches)} sub-batches"
            )
            return optimized_batches

        except Exception as e:
            self.logger.error(f"Failed to optimize single batch: {e}")
            return [batch]

    def _group_similar_requests(
        self, requests: List[Dict[str, Any]], characteristics: Dict[str, Any]
    ) -> List[List[Dict[str, Any]]]:
        """Group similar requests for optimal batch processing - Phase 1.1.3"""
        try:
            # Group by recognition level first (most important for ANE optimization)
            level_groups = {}
            for request in requests:
                level = request.get("recognition_level", "accurate")
                if level not in level_groups:
                    level_groups[level] = []
                level_groups[level].append(request)

            # Further group by image size categories within each level
            final_groups = []
            for level, level_requests in level_groups.items():
                # Sort by image size and create groups
                size_sorted = sorted(
                    level_requests, key=lambda r: len(r.get("image_data", ""))
                )

                # Create groups of similar-sized images (better for ANE memory management)
                current_group = []
                current_size_category = None

                for request in size_sorted:
                    image_size = len(request.get("image_data", ""))
                    size_category = self._get_image_size_category(image_size)

                    if (
                        current_size_category is None
                        or current_size_category == size_category
                    ):
                        current_group.append(request)
                        current_size_category = size_category
                    else:
                        # Size category changed, start new group
                        if current_group:
                            final_groups.append(current_group)
                        current_group = [request]
                        current_size_category = size_category

                # Add final group
                if current_group:
                    final_groups.append(current_group)

            return final_groups if final_groups else [requests]

        except Exception as e:
            self.logger.error(f"Failed to group similar requests: {e}")
            return [requests]

    def _get_image_size_category(self, image_size: int) -> str:
        """Categorize image size for optimal ANE processing"""
        if image_size < 50 * 1024:  # < 50KB
            return "small"
        elif image_size < 200 * 1024:  # < 200KB
            return "medium"
        elif image_size < 500 * 1024:  # < 500KB
            return "large"
        else:
            return "xlarge"

    def _increase_batch_sizes(self):
        """Increase batch sizes for better throughput"""
        self.current_config.high_priority_batch_size = min(
            10, self.current_config.high_priority_batch_size + 1
        )
        self.current_config.normal_priority_batch_size = min(
            20, self.current_config.normal_priority_batch_size + 1
        )
        self.logger.debug("Increased batch sizes for better throughput")

    def _decrease_batch_sizes(self):
        """Decrease batch sizes for lower latency"""
        self.current_config.high_priority_batch_size = max(
            1, self.current_config.high_priority_batch_size - 1
        )
        self.current_config.normal_priority_batch_size = max(
            2, self.current_config.normal_priority_batch_size - 1
        )
        self.logger.debug("Decreased batch sizes for lower latency")

    def get_current_config(self) -> BatchConfig:
        """Get current batch configuration"""
        return self.current_config

    def get_performance_history(self) -> List[Dict[str, Any]]:
        """Get performance history for analysis"""
        return list(self.performance_history)

    def get_adaptation_metrics(self) -> Dict[str, Any]:
        """Get metrics about batch adaptation"""
        if not self.adaptation_history:
            return {}

        recent_adaptations = list(self.adaptation_history)[-10:]  # Last 10 adaptations

        return {
            "total_adaptations": len(self.adaptation_history),
            "recent_adaptations": len(recent_adaptations),
            "avg_high_priority_batch_size": (
                sum(a["high_priority_batch_size"] for a in recent_adaptations)
                / len(recent_adaptations)
                if recent_adaptations
                else 0
            ),
            "avg_normal_priority_batch_size": (
                sum(a["normal_priority_batch_size"] for a in recent_adaptations)
                / len(recent_adaptations)
                if recent_adaptations
                else 0
            ),
            "current_config": {
                "high_priority_batch_size": self.current_config.high_priority_batch_size,
                "normal_priority_batch_size": self.current_config.normal_priority_batch_size,
                "max_concurrent": self.current_config.max_concurrent,
            },
        }
