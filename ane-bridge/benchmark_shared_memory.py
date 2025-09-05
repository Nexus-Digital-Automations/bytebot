#!/usr/bin/env python3
"""
Shared Memory Bridge Performance Benchmark

Comprehensive benchmarking suite to validate the performance improvements
achieved by the shared memory IPC system compared to HTTP communication.
Measures latency, throughput, and resource utilization across different
workload scenarios.

Author: Development Agent
Date: 2025-09-05
Version: 1.0.0
"""

import asyncio
import json
import logging
import statistics
import time
from dataclasses import asdict, dataclass
from typing import Dict, List

import numpy as np
import psutil
from shared_memory_client import SharedMemoryClient, shared_memory_client


@dataclass
class BenchmarkConfig:
    """Benchmark configuration"""

    service_url: str = "http://localhost:8080"
    num_requests: int = 100
    concurrent_requests: int = 10
    image_sizes: List[str] = None  # ['SD', 'HD', 'FHD', '4K']
    test_modes: List[str] = None  # ['http', 'shared_memory', 'mixed']
    warmup_requests: int = 10
    timeout_seconds: float = 60.0


@dataclass
class BenchmarkResult:
    """Individual benchmark result"""

    request_id: str
    communication_mode: str
    image_size: str
    latency_ms: float
    success: bool
    error: str = None
    ane_used: bool = False


@dataclass
class BenchmarkSummary:
    """Benchmark summary statistics"""

    test_name: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float

    # Latency statistics
    mean_latency_ms: float
    median_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float

    # Throughput statistics
    requests_per_second: float
    total_time_seconds: float

    # Communication mode breakdown
    shared_memory_requests: int = 0
    http_requests: int = 0
    fallback_requests: int = 0

    # Resource utilization
    peak_memory_mb: float = 0.0
    avg_cpu_percent: float = 0.0


class SharedMemoryBenchmark:
    """
    Shared Memory Bridge Performance Benchmark Suite

    Comprehensive benchmarking tool to measure and validate the performance
    improvements achieved by shared memory IPC compared to HTTP communication.
    """

    def __init__(self, config: BenchmarkConfig):
        """Initialize benchmark suite"""
        self.config = config
        self.logger = logging.getLogger("SharedMemoryBenchmark")

        # Set defaults
        if self.config.image_sizes is None:
            self.config.image_sizes = ["SD", "HD", "FHD"]

        if self.config.test_modes is None:
            self.config.test_modes = ["http", "shared_memory", "mixed"]

        # Test image data
        self.test_images = self._generate_test_images()

        # Results storage
        self.results: List[BenchmarkResult] = []
        self.summaries: Dict[str, BenchmarkSummary] = {}

        self.logger.info(
            f"Benchmark suite initialized with {len(self.test_images)} test images"
        )

    def _generate_test_images(self) -> Dict[str, np.ndarray]:
        """Generate test images of different sizes"""
        images = {}

        size_configs = {
            "SD": (480, 640, 3),  # ~900KB
            "HD": (720, 1280, 3),  # ~2.5MB
            "FHD": (1080, 1920, 3),  # ~6MB
            "4K": (2160, 3840, 3),  # ~25MB
        }

        for size_name in self.config.image_sizes:
            if size_name in size_configs:
                shape = size_configs[size_name]
                image = np.random.randint(0, 255, shape, dtype=np.uint8)
                images[size_name] = image

                data_size = image.nbytes / (1024 * 1024)  # MB
                self.logger.info(
                    f"Generated {size_name} test image: {shape} ({data_size:.1f}MB)"
                )

        return images

    async def run_benchmark_suite(self) -> Dict[str, BenchmarkSummary]:
        """Run complete benchmark suite"""
        self.logger.info("=" * 60)
        self.logger.info("🚀 Starting Shared Memory Bridge Benchmark Suite")
        self.logger.info("=" * 60)

        try:
            # Service health check
            await self._check_service_health()

            # Run benchmarks for each test mode
            for test_mode in self.config.test_modes:
                self.logger.info(f"\n📊 Running {test_mode.upper()} benchmark...")

                if test_mode == "http":
                    summary = await self._run_http_benchmark()
                elif test_mode == "shared_memory":
                    summary = await self._run_shared_memory_benchmark()
                elif test_mode == "mixed":
                    summary = await self._run_mixed_benchmark()
                else:
                    self.logger.warning(f"Unknown test mode: {test_mode}")
                    continue

                self.summaries[test_mode] = summary
                self._print_summary(summary)

            # Performance comparison
            if len(self.summaries) > 1:
                self._print_performance_comparison()

            return self.summaries

        except Exception as e:
            self.logger.error(f"Benchmark suite failed: {e}")
            raise

    async def _check_service_health(self):
        """Verify service is healthy before benchmarking"""
        self.logger.info("🔍 Checking service health...")

        async with shared_memory_client(self.config.service_url) as client:
            health = await client.get_health_status()

            if health.get("error"):
                raise RuntimeError(f"Service health check failed: {health['error']}")

            service_info = await client.get_service_info()

            self.logger.info(
                f"✅ Service healthy: {health.get('service_name', 'ANE Bridge')}"
            )
            self.logger.info(f"   Version: {health.get('version', 'unknown')}")
            self.logger.info(f"   ANE Available: {health.get('ane_available', False)}")

            # Check shared memory support
            shmem_enabled = (
                service_info.get("communication_modes", {})
                .get("shared_memory_bridge", {})
                .get("enabled", False)
            )
            self.logger.info(
                f"   Shared Memory: {'Enabled' if shmem_enabled else 'Disabled'}"
            )

    async def _run_http_benchmark(self) -> BenchmarkSummary:
        """Run HTTP-only benchmark"""
        return await self._run_benchmark_mode("http", force_http=True)

    async def _run_shared_memory_benchmark(self) -> BenchmarkSummary:
        """Run shared memory-only benchmark"""
        return await self._run_benchmark_mode("shared_memory", force_http=False)

    async def _run_mixed_benchmark(self) -> BenchmarkSummary:
        """Run mixed mode benchmark (automatic selection)"""
        return await self._run_benchmark_mode("mixed", force_http=None)

    async def _run_benchmark_mode(
        self, test_name: str, force_http: bool = None
    ) -> BenchmarkSummary:
        """Run benchmark for specific communication mode"""
        results = []
        start_time = time.time()

        # Resource monitoring
        process = psutil.Process()
        memory_samples = []
        cpu_samples = []

        async with shared_memory_client(
            service_url=self.config.service_url,
            shared_memory_enabled=(force_http is not True),
        ) as client:

            # Warmup requests
            if self.config.warmup_requests > 0:
                self.logger.info(
                    f"🔥 Warming up with {self.config.warmup_requests} requests..."
                )
                await self._run_warmup_requests(client, force_http)

            # Main benchmark
            self.logger.info(
                f"⚡ Running {self.config.num_requests} requests with {self.config.concurrent_requests} concurrent..."
            )

            # Create request batches for concurrency
            request_batches = []
            for i in range(
                0, self.config.num_requests, self.config.concurrent_requests
            ):
                batch_size = min(
                    self.config.concurrent_requests, self.config.num_requests - i
                )
                batch = []

                for j in range(batch_size):
                    request_id = f"{test_name}_{i+j:04d}"
                    image_size = self.config.image_sizes[
                        j % len(self.config.image_sizes)
                    ]
                    image_data = self.test_images[image_size]

                    batch.append(
                        {
                            "request_id": request_id,
                            "image_size": image_size,
                            "image_data": image_data,
                            "force_http": force_http,
                        }
                    )

                request_batches.append(batch)

            # Execute batches
            for batch_idx, batch in enumerate(request_batches):
                # Monitor resources
                memory_samples.append(process.memory_info().rss / (1024 * 1024))  # MB
                cpu_samples.append(process.cpu_percent())

                # Execute concurrent requests
                batch_tasks = []
                for request in batch:
                    task = asyncio.create_task(
                        self._execute_benchmark_request(client, request)
                    )
                    batch_tasks.append(task)

                # Wait for batch completion
                batch_results = await asyncio.gather(
                    *batch_tasks, return_exceptions=True
                )

                # Process results
                for result in batch_results:
                    if isinstance(result, Exception):
                        self.logger.warning(f"Request failed: {result}")
                        results.append(
                            BenchmarkResult(
                                request_id=f"error_{len(results)}",
                                communication_mode="error",
                                image_size="unknown",
                                latency_ms=0.0,
                                success=False,
                                error=str(result),
                            )
                        )
                    else:
                        results.append(result)

                # Progress logging
                if (batch_idx + 1) % 10 == 0 or batch_idx == len(request_batches) - 1:
                    completed = min(
                        (batch_idx + 1) * self.config.concurrent_requests,
                        self.config.num_requests,
                    )
                    progress = (completed / self.config.num_requests) * 100
                    self.logger.info(
                        f"   Progress: {completed}/{self.config.num_requests} ({progress:.1f}%)"
                    )

        # Calculate summary statistics
        total_time = time.time() - start_time
        successful_results = [r for r in results if r.success]
        latencies = [r.latency_ms for r in successful_results]

        summary = BenchmarkSummary(
            test_name=test_name,
            total_requests=len(results),
            successful_requests=len(successful_results),
            failed_requests=len(results) - len(successful_results),
            success_rate=(
                (len(successful_results) / len(results)) * 100 if results else 0.0
            ),
            # Latency statistics
            mean_latency_ms=statistics.mean(latencies) if latencies else 0.0,
            median_latency_ms=statistics.median(latencies) if latencies else 0.0,
            p95_latency_ms=np.percentile(latencies, 95) if latencies else 0.0,
            p99_latency_ms=np.percentile(latencies, 99) if latencies else 0.0,
            min_latency_ms=min(latencies) if latencies else 0.0,
            max_latency_ms=max(latencies) if latencies else 0.0,
            # Throughput statistics
            requests_per_second=(
                len(successful_results) / total_time if total_time > 0 else 0.0
            ),
            total_time_seconds=total_time,
            # Communication mode breakdown
            shared_memory_requests=len(
                [
                    r
                    for r in successful_results
                    if r.communication_mode == "shared_memory"
                ]
            ),
            http_requests=len(
                [
                    r
                    for r in successful_results
                    if r.communication_mode in ["http", "http_fallback"]
                ]
            ),
            fallback_requests=len(
                [
                    r
                    for r in successful_results
                    if r.communication_mode == "http_fallback"
                ]
            ),
            # Resource utilization
            peak_memory_mb=max(memory_samples) if memory_samples else 0.0,
            avg_cpu_percent=statistics.mean(cpu_samples) if cpu_samples else 0.0,
        )

        return summary

    async def _run_warmup_requests(
        self, client: SharedMemoryClient, force_http: bool = None
    ):
        """Run warmup requests to initialize connections and caches"""
        for i in range(self.config.warmup_requests):
            image_size = self.config.image_sizes[i % len(self.config.image_sizes)]
            image_data = self.test_images[image_size]

            try:
                await client.process_ocr(
                    image_data=image_data,
                    request_id=f"warmup_{i}",
                    force_http=(force_http is True),
                )
            except Exception as e:
                self.logger.warning(f"Warmup request {i} failed: {e}")

    async def _execute_benchmark_request(
        self, client: SharedMemoryClient, request: Dict
    ) -> BenchmarkResult:
        """Execute single benchmark request"""
        start_time = time.time()

        try:
            response = await client.process_ocr(
                image_data=request["image_data"],
                request_id=request["request_id"],
                force_http=(request["force_http"] is True),
            )

            latency_ms = (time.time() - start_time) * 1000

            return BenchmarkResult(
                request_id=response.request_id,
                communication_mode=response.communication_mode,
                image_size=request["image_size"],
                latency_ms=latency_ms,
                success=(response.error is None),
                error=response.error,
                ane_used=response.ane_used,
            )

        except Exception as e:
            latency_ms = (time.time() - start_time) * 1000

            return BenchmarkResult(
                request_id=request["request_id"],
                communication_mode="error",
                image_size=request["image_size"],
                latency_ms=latency_ms,
                success=False,
                error=str(e),
            )

    def _print_summary(self, summary: BenchmarkSummary):
        """Print benchmark summary"""
        self.logger.info(f"\n📈 {summary.test_name.upper()} Benchmark Results:")
        self.logger.info(f"   Total Requests: {summary.total_requests}")
        self.logger.info(f"   Success Rate: {summary.success_rate:.1f}%")
        self.logger.info(f"   Total Time: {summary.total_time_seconds:.1f}s")
        self.logger.info(f"   Throughput: {summary.requests_per_second:.1f} req/s")

        self.logger.info("\n   Latency Statistics:")
        self.logger.info(f"     Mean: {summary.mean_latency_ms:.2f}ms")
        self.logger.info(f"     Median: {summary.median_latency_ms:.2f}ms")
        self.logger.info(f"     P95: {summary.p95_latency_ms:.2f}ms")
        self.logger.info(f"     P99: {summary.p99_latency_ms:.2f}ms")
        self.logger.info(f"     Min: {summary.min_latency_ms:.2f}ms")
        self.logger.info(f"     Max: {summary.max_latency_ms:.2f}ms")

        if summary.shared_memory_requests > 0 or summary.http_requests > 0:
            self.logger.info("\n   Communication Modes:")
            if summary.shared_memory_requests > 0:
                shmem_pct = (
                    summary.shared_memory_requests / summary.successful_requests
                ) * 100
                self.logger.info(
                    f"     Shared Memory: {summary.shared_memory_requests} ({shmem_pct:.1f}%)"
                )
            if summary.http_requests > 0:
                http_pct = (summary.http_requests / summary.successful_requests) * 100
                self.logger.info(
                    f"     HTTP: {summary.http_requests} ({http_pct:.1f}%)"
                )
            if summary.fallback_requests > 0:
                fallback_pct = (
                    summary.fallback_requests / summary.successful_requests
                ) * 100
                self.logger.info(
                    f"     Fallback: {summary.fallback_requests} ({fallback_pct:.1f}%)"
                )

        self.logger.info("\n   Resource Utilization:")
        self.logger.info(f"     Peak Memory: {summary.peak_memory_mb:.1f}MB")
        self.logger.info(f"     Avg CPU: {summary.avg_cpu_percent:.1f}%")

    def _print_performance_comparison(self):
        """Print performance comparison between modes"""
        if "http" in self.summaries and "shared_memory" in self.summaries:
            http_summary = self.summaries["http"]
            shmem_summary = self.summaries["shared_memory"]

            self.logger.info("\n🏁 Performance Comparison (HTTP vs Shared Memory):")

            # Latency improvement
            if http_summary.mean_latency_ms > 0:
                latency_improvement = (
                    (http_summary.mean_latency_ms - shmem_summary.mean_latency_ms)
                    / http_summary.mean_latency_ms
                ) * 100
                self.logger.info(f"   Latency Improvement: {latency_improvement:.1f}%")
                self.logger.info(
                    f"     HTTP Mean: {http_summary.mean_latency_ms:.2f}ms"
                )
                self.logger.info(
                    f"     Shared Memory Mean: {shmem_summary.mean_latency_ms:.2f}ms"
                )

            # Throughput improvement
            if http_summary.requests_per_second > 0:
                throughput_improvement = (
                    (
                        shmem_summary.requests_per_second
                        - http_summary.requests_per_second
                    )
                    / http_summary.requests_per_second
                ) * 100
                self.logger.info(
                    f"\n   Throughput Improvement: {throughput_improvement:.1f}%"
                )
                self.logger.info(
                    f"     HTTP: {http_summary.requests_per_second:.1f} req/s"
                )
                self.logger.info(
                    f"     Shared Memory: {shmem_summary.requests_per_second:.1f} req/s"
                )

            # Success rate comparison
            self.logger.info("\n   Success Rates:")
            self.logger.info(f"     HTTP: {http_summary.success_rate:.1f}%")
            self.logger.info(f"     Shared Memory: {shmem_summary.success_rate:.1f}%")

    def save_results(self, output_file: str = "benchmark_results.json"):
        """Save benchmark results to JSON file"""
        results_data = {
            "config": asdict(self.config),
            "summaries": {
                name: asdict(summary) for name, summary in self.summaries.items()
            },
            "timestamp": time.time(),
            "test_images": {
                name: {"shape": img.shape, "size_mb": img.nbytes / (1024 * 1024)}
                for name, img in self.test_images.items()
            },
        }

        with open(output_file, "w") as f:
            json.dump(results_data, f, indent=2)

        self.logger.info(f"📁 Results saved to {output_file}")


async def main():
    """Main benchmark execution"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Configure benchmark
    config = BenchmarkConfig(
        service_url="http://localhost:8080",
        num_requests=50,  # Reduced for testing
        concurrent_requests=5,
        image_sizes=["SD", "HD", "FHD"],
        test_modes=["http", "shared_memory"],
        warmup_requests=5,
        timeout_seconds=120.0,
    )

    # Run benchmark suite
    benchmark = SharedMemoryBenchmark(config)

    try:
        summaries = await benchmark.run_benchmark_suite()

        # Save results
        benchmark.save_results("shared_memory_benchmark_results.json")

        print("\n" + "=" * 60)
        print("🎉 Benchmark Suite Completed Successfully!")
        print("=" * 60)

        return summaries

    except Exception as e:
        logging.error(f"Benchmark failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
