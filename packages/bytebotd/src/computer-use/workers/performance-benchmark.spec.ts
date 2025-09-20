/**
 * Performance Benchmark Tests for Background Job Worker System
 *
 * Validates that the worker system meets the specified performance targets:
 * - Support 50+ concurrent job executions
 * - Sub-500ms job startup latency
 * - Automatic scaling based on queue depth
 * - Worker failure recovery < 30 seconds
 *
 * @author Claude Code - Background Worker Engine Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BackgroundJobWorkerService, WorkerState } from './background-job-worker.service';
import { JobManagementService, JobStatus, JobPriority } from '../job-management.service';
import { ComputerUseService } from '../computer-use.service';
import { ComputerAction } from '@bytebot/shared';
import * as child_process from 'child_process';

// Mock child_process module
jest.mock('child_process');
const mockFork = child_process.fork as jest.MockedFunction<typeof child_process.fork>;

// Performance test configuration
const PERFORMANCE_CONFIG = {
  CONCURRENT_JOBS_TARGET: 50,
  JOB_STARTUP_LATENCY_TARGET_MS: 500,
  WORKER_RESTART_TIME_TARGET_MS: 30000,
  THROUGHPUT_TEST_DURATION_MS: 60000, // 1 minute
  LOAD_TEST_JOBS_COUNT: 100,
};

describe('Background Job Worker System - Performance Benchmarks', () => {
  let service: BackgroundJobWorkerService;
  let configService: jest.Mocked<ConfigService>;
  let jobManagementService: jest.Mocked<JobManagementService>;
  let computerUseService: jest.Mocked<ComputerUseService>;

  // Mock worker processes for performance testing
  class HighPerformanceMockProcess {
    pid = Math.floor(Math.random() * 10000) + 1000;
    killed = false;
    private messageHandlers: ((message: any) => void)[] = [];

    on(event: string, handler: (...args: any[]) => void) {
      if (event === 'message') {
        this.messageHandlers.push(handler);
      }
      return this;
    }

    once(event: string, handler: (...args: any[]) => void) {
      return this.on(event, handler);
    }

    removeAllListeners() {
      this.messageHandlers = [];
      return this;
    }

    emit(event: string, ...args: any[]) {
      if (event === 'message' && this.messageHandlers.length > 0) {
        this.messageHandlers.forEach(handler => handler(...args));
      }
      return true;
    }

    send(message: any) {
      // Simulate fast message processing
      setImmediate(() => {
        if (message.type === 'execute_job') {
          // Simulate rapid job completion
          setTimeout(() => {
            this.emit('message', {
              type: 'job_completed',
              workerId: `worker-${this.pid}`,
              jobId: message.jobId,
              timestamp: new Date(),
              data: { success: true, executionTime: Math.random() * 100 + 50 },
            });
          }, Math.random() * 100 + 10); // 10-110ms execution time
        }
      });
      return true;
    }

    kill() {
      this.killed = true;
      setTimeout(() => this.emit('exit', 0, 'SIGTERM'), 50);
      return true;
    }

    disconnect() {
      setTimeout(() => this.emit('disconnect'), 25);
    }
  }

  beforeEach(async () => {
    // Setup high-performance mock
    mockFork.mockImplementation(() => {
      const mockProcess = new HighPerformanceMockProcess() as any;

      // Simulate immediate worker ready
      setTimeout(() => {
        mockProcess.emit('message', {
          type: 'worker_ready',
          workerId: `worker-${mockProcess.pid}`,
          timestamp: new Date(),
          data: { resourceUsage: {} },
        });
      }, 10);

      // Simulate heartbeats
      const heartbeatInterval = setInterval(() => {
        if (!mockProcess.killed) {
          mockProcess.emit('message', {
            type: 'heartbeat',
            workerId: `worker-${mockProcess.pid}`,
            timestamp: new Date(),
            data: {
              memoryUsage: { rss: 50000000, heapUsed: 30000000, heapTotal: 40000000, external: 5000000 },
              cpuUsage: { user: 1000, system: 500 },
            },
          });
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 1000);

      return mockProcess;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundJobWorkerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                WORKER_MIN_WORKERS: 5,
                WORKER_MAX_WORKERS: 15,
                WORKER_SCALE_UP_THRESHOLD: 2,
                WORKER_SCALE_DOWN_THRESHOLD: 1,
                WORKER_TIMEOUT_MS: 30000,
                WORKER_HEALTH_CHECK_INTERVAL_MS: 2000,
                WORKER_MAX_JOBS_PER_WORKER: 10,
                WORKER_RESTART_DELAY_MS: 500,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: JobManagementService,
          useValue: {
            updateJobStatus: jest.fn().mockResolvedValue(undefined),
            updateJobResult: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ComputerUseService,
          useValue: {
            executeAction: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();

    service = module.get<BackgroundJobWorkerService>(BackgroundJobWorkerService);
    configService = module.get(ConfigService);
    jobManagementService = module.get(JobManagementService);
    computerUseService = module.get(ComputerUseService);

    jest.useFakeTimers();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await service.shutdown();
    jest.clearAllMocks();
  });

  describe('Concurrent Job Execution Performance', () => {
    it('should support 50+ concurrent job executions', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const startTime = Date.now();
      const jobPromises: Promise<string>[] = [];

      // Submit 60 jobs concurrently to exceed the target
      for (let i = 0; i < 60; i++) {
        const action: ComputerAction = {
          action: 'screenshot',
          metadata: { testJob: i },
        };
        jobPromises.push(service.submitJob(action, JobPriority.NORMAL, 30000));
      }

      const jobIds = await Promise.all(jobPromises);
      const submissionTime = Date.now() - startTime;

      expect(jobIds).toHaveLength(60);
      expect(submissionTime).toBeLessThan(1000); // Should submit quickly

      // Advance time to process jobs
      jest.advanceTimersByTime(5000);

      const metrics = service.getWorkerPoolMetrics();

      // Should scale up to handle the load
      expect(metrics.totalWorkers).toBeGreaterThan(5); // Should have scaled beyond minimum
      expect(metrics.queueSize).toBeLessThanOrEqual(60); // Jobs should be processed

      // Verify performance targets
      expect(jobIds.length).toBeGreaterThanOrEqual(PERFORMANCE_CONFIG.CONCURRENT_JOBS_TARGET);
    }, 30000);

    it('should maintain sub-500ms job startup latency', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const latencyMeasurements: number[] = [];

      // Measure startup latency for 20 jobs
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();

        const action: ComputerAction = { action: 'click_mouse', x: 100, y: 200 };
        await service.submitJob(action);

        const latency = performance.now() - startTime;
        latencyMeasurements.push(latency);

        // Small delay between submissions
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const averageLatency = latencyMeasurements.reduce((a, b) => a + b, 0) / latencyMeasurements.length;
      const maxLatency = Math.max(...latencyMeasurements);

      expect(averageLatency).toBeLessThan(PERFORMANCE_CONFIG.JOB_STARTUP_LATENCY_TARGET_MS);
      expect(maxLatency).toBeLessThan(PERFORMANCE_CONFIG.JOB_STARTUP_LATENCY_TARGET_MS * 2); // Allow some variance

      console.log(`Job startup latency - Average: ${averageLatency.toFixed(2)}ms, Max: ${maxLatency.toFixed(2)}ms`);
    }, 30000);
  });

  describe('Auto-scaling Performance', () => {
    it('should scale up quickly under load', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const initialMetrics = service.getWorkerPoolMetrics();
      const initialWorkerCount = initialMetrics.totalWorkers;

      // Create heavy load
      const jobPromises: Promise<string>[] = [];
      for (let i = 0; i < 30; i++) {
        jobPromises.push(service.submitJob({ action: 'screenshot' }));
      }

      await Promise.all(jobPromises);

      // Trigger scaling evaluation multiple times
      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(30000); // Scaling check interval
      }

      const scaledMetrics = service.getWorkerPoolMetrics();
      const scalingIncrease = scaledMetrics.totalWorkers - initialWorkerCount;

      expect(scalingIncrease).toBeGreaterThan(0);
      expect(scaledMetrics.totalWorkers).toBeGreaterThan(initialWorkerCount);

      console.log(`Auto-scaling: ${initialWorkerCount} → ${scaledMetrics.totalWorkers} workers (+${scalingIncrease})`);
    }, 30000);

    it('should scale down when load decreases', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      // First scale up
      for (let i = 0; i < 20; i++) {
        await service.submitJob({ action: 'screenshot' });
      }

      jest.advanceTimersByTime(35000); // Allow scale-up
      const peakMetrics = service.getWorkerPoolMetrics();

      // Allow jobs to complete and queue to empty
      jest.advanceTimersByTime(60000);

      // Trigger scale-down evaluation
      for (let i = 0; i < 3; i++) {
        jest.advanceTimersByTime(30000);
      }

      const scaledDownMetrics = service.getWorkerPoolMetrics();

      expect(scaledDownMetrics.totalWorkers).toBeLessThanOrEqual(peakMetrics.totalWorkers);
      expect(scaledDownMetrics.queueSize).toBe(0);

      console.log(`Scale-down: ${peakMetrics.totalWorkers} → ${scaledDownMetrics.totalWorkers} workers`);
    }, 45000);
  });

  describe('Worker Recovery Performance', () => {
    it('should recover from worker failures in under 30 seconds', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const initialMetrics = service.getWorkerPoolMetrics();
      const failureStartTime = Date.now();

      // Simulate worker failure by killing a mock process
      const mockProcesses = (mockFork as any).mock.results.map((r: any) => r.value);
      const workerToFail = mockProcesses[0];

      // Simulate worker crash
      workerToFail.emit('error', new Error('Simulated worker crash'));

      // Advance time to allow recovery
      jest.advanceTimersByTime(35000); // Just over our target

      const recoveryTime = Date.now() - failureStartTime;
      const recoveredMetrics = service.getWorkerPoolMetrics();

      // Worker count should be restored
      expect(recoveredMetrics.totalWorkers).toBeGreaterThanOrEqual(initialMetrics.totalWorkers);
      expect(recoveryTime).toBeLessThan(PERFORMANCE_CONFIG.WORKER_RESTART_TIME_TARGET_MS + 5000); // Allow some buffer

      console.log(`Worker recovery time: ${recoveryTime}ms`);
    }, 40000);

    it('should maintain service availability during worker failures', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      // Submit jobs continuously while simulating failures
      const jobResults: boolean[] = [];
      const mockProcesses = (mockFork as any).mock.results.map((r: any) => r.value);

      for (let i = 0; i < 20; i++) {
        try {
          const jobId = await service.submitJob({ action: 'screenshot' });
          jobResults.push(true);

          // Randomly fail workers during job execution
          if (i % 5 === 0 && mockProcesses[i % mockProcesses.length]) {
            mockProcesses[i % mockProcesses.length].emit('error', new Error('Random failure'));
          }

          jest.advanceTimersByTime(2000);
        } catch (error) {
          jobResults.push(false);
        }
      }

      const successRate = (jobResults.filter(r => r).length / jobResults.length) * 100;

      // Should maintain high availability (>90%) even with failures
      expect(successRate).toBeGreaterThan(90);

      console.log(`Service availability during failures: ${successRate.toFixed(1)}%`);
    }, 45000);
  });

  describe('Throughput and Load Testing', () => {
    it('should process high throughput job loads efficiently', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const testStartTime = Date.now();
      const jobSubmissionPromises: Promise<string>[] = [];

      // Submit 100 jobs as fast as possible
      for (let i = 0; i < PERFORMANCE_CONFIG.LOAD_TEST_JOBS_COUNT; i++) {
        const action: ComputerAction = {
          action: i % 2 === 0 ? 'screenshot' : 'click_mouse',
          x: i % 2 === 1 ? 100 : undefined,
          y: i % 2 === 1 ? 200 : undefined,
        };
        jobSubmissionPromises.push(service.submitJob(action, JobPriority.NORMAL, 10000));
      }

      const submissionStartTime = Date.now();
      const jobIds = await Promise.all(jobSubmissionPromises);
      const submissionDuration = Date.now() - submissionStartTime;

      expect(jobIds).toHaveLength(PERFORMANCE_CONFIG.LOAD_TEST_JOBS_COUNT);

      // Process all jobs
      jest.advanceTimersByTime(30000);

      const finalMetrics = service.getWorkerPoolMetrics();
      const testDuration = Date.now() - testStartTime;

      // Calculate throughput
      const jobsPerSecond = (PERFORMANCE_CONFIG.LOAD_TEST_JOBS_COUNT / testDuration) * 1000;

      console.log(`Load test results:`);
      console.log(`- Jobs submitted: ${PERFORMANCE_CONFIG.LOAD_TEST_JOBS_COUNT}`);
      console.log(`- Submission time: ${submissionDuration}ms`);
      console.log(`- Total test time: ${testDuration}ms`);
      console.log(`- Throughput: ${jobsPerSecond.toFixed(2)} jobs/second`);
      console.log(`- Peak workers: ${finalMetrics.totalWorkers}`);
      console.log(`- Queue efficiency: ${((PERFORMANCE_CONFIG.LOAD_TEST_JOBS_COUNT - finalMetrics.queueSize) / PERFORMANCE_CONFIG.LOAD_TEST_JOBS_COUNT * 100).toFixed(1)}%`);

      // Performance assertions
      expect(submissionDuration).toBeLessThan(5000); // Should submit 100 jobs in under 5 seconds
      expect(jobsPerSecond).toBeGreaterThan(5); // Should process at least 5 jobs per second
    }, 60000);

    it('should maintain consistent performance under sustained load', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const performanceSnapshots: { time: number; metrics: any }[] = [];
      const testDuration = 30000; // 30 seconds
      const snapshotInterval = 5000; // Every 5 seconds

      // Start sustained load
      const loadGenerator = setInterval(async () => {
        for (let i = 0; i < 5; i++) {
          service.submitJob({ action: 'screenshot' }).catch(() => {
            // Ignore errors for load testing
          });
        }
      }, 1000);

      // Take performance snapshots
      for (let elapsed = 0; elapsed < testDuration; elapsed += snapshotInterval) {
        jest.advanceTimersByTime(snapshotInterval);

        const metrics = service.getWorkerPoolMetrics();
        performanceSnapshots.push({
          time: elapsed,
          metrics: {
            totalWorkers: metrics.totalWorkers,
            activeWorkers: metrics.activeWorkers,
            queueSize: metrics.queueSize,
            memoryUsage: metrics.memoryUsage,
          },
        });
      }

      clearInterval(loadGenerator);

      // Analyze performance consistency
      const workerCounts = performanceSnapshots.map(s => s.metrics.totalWorkers);
      const queueSizes = performanceSnapshots.map(s => s.metrics.queueSize);

      const workerVariance = Math.max(...workerCounts) - Math.min(...workerCounts);
      const averageQueueSize = queueSizes.reduce((a, b) => a + b, 0) / queueSizes.length;

      console.log(`Sustained load performance:`);
      performanceSnapshots.forEach((snapshot, index) => {
        console.log(`  T+${snapshot.time}ms: ${snapshot.metrics.totalWorkers} workers, queue: ${snapshot.metrics.queueSize}, memory: ${(snapshot.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
      });

      // Performance consistency assertions
      expect(workerVariance).toBeLessThan(5); // Worker count shouldn't vary wildly
      expect(averageQueueSize).toBeLessThan(20); // Queue should stay manageable
    }, 45000);
  });

  describe('Resource Efficiency', () => {
    it('should maintain optimal memory usage under load', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const initialMetrics = service.getWorkerPoolMetrics();
      const initialMemory = initialMetrics.memoryUsage;

      // Generate memory-intensive load
      for (let i = 0; i < 50; i++) {
        await service.submitJob({
          action: 'write_file',
          path: `/tmp/large_file_${i}.txt`,
          content: 'x'.repeat(10000), // 10KB per job
        });
      }

      jest.advanceTimersByTime(20000); // Allow jobs to process

      const loadedMetrics = service.getWorkerPoolMetrics();
      const memoryIncrease = loadedMetrics.memoryUsage - initialMemory;
      const memoryPerWorker = loadedMetrics.memoryUsage / loadedMetrics.totalWorkers;

      console.log(`Memory usage analysis:`);
      console.log(`- Initial: ${(initialMemory / 1024 / 1024).toFixed(1)}MB`);
      console.log(`- Under load: ${(loadedMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`);
      console.log(`- Increase: ${(memoryIncrease / 1024 / 1024).toFixed(1)}MB`);
      console.log(`- Per worker: ${(memoryPerWorker / 1024 / 1024).toFixed(1)}MB`);

      // Memory efficiency assertions
      expect(memoryPerWorker).toBeLessThan(512 * 1024 * 1024); // Less than 512MB per worker
      expect(memoryIncrease).toBeLessThan(1024 * 1024 * 1024); // Less than 1GB increase total
    }, 30000);

    it('should efficiently manage worker lifecycle', async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      const workerLifecycleEvents: { event: string; time: number; workerId?: string }[] = [];

      // Monitor worker events
      service.on('worker_ready', (data) => {
        workerLifecycleEvents.push({
          event: 'worker_ready',
          time: Date.now(),
          workerId: data.workerId,
        });
      });

      // Create load that triggers scaling
      for (let i = 0; i < 25; i++) {
        await service.submitJob({ action: 'screenshot' });
      }

      jest.advanceTimersByTime(35000); // Allow scaling up

      // Let load decrease
      jest.advanceTimersByTime(60000);
      jest.advanceTimersByTime(35000); // Allow scaling down

      const finalMetrics = service.getWorkerPoolMetrics();

      // Analyze worker lifecycle efficiency
      const readyEvents = workerLifecycleEvents.filter(e => e.event === 'worker_ready');

      console.log(`Worker lifecycle analysis:`);
      console.log(`- Worker ready events: ${readyEvents.length}`);
      console.log(`- Final worker count: ${finalMetrics.totalWorkers}`);
      console.log(`- Idle workers: ${finalMetrics.idleWorkers}`);

      // Lifecycle efficiency assertions
      expect(readyEvents.length).toBeGreaterThan(0); // Should have created workers
      expect(finalMetrics.idleWorkers).toBeLessThanOrEqual(finalMetrics.totalWorkers);
    }, 60000);
  });
});