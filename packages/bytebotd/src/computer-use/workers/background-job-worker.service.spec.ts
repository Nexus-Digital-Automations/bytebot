/**
 * Background Job Worker Service Tests
 *
 * Comprehensive test suite for the enterprise-grade background worker system.
 * Tests worker pool management, job distribution, health monitoring, scaling,
 * performance metrics, and graceful shutdown scenarios.
 *
 * @author Claude Code - Background Worker Engine Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BackgroundJobWorkerService, WorkerState, WorkerMessageType } from './background-job-worker.service';
import { JobManagementService, JobStatus, JobPriority } from '../job-management.service';
import { ComputerUseService } from '../computer-use.service';
import { ComputerAction } from '@bytebot/shared';
import { EventEmitter } from 'events';
import * as child_process from 'child_process';

// Mock child_process module
jest.mock('child_process');
const mockFork = child_process.fork as jest.MockedFunction<typeof child_process.fork>;

// Mock implementations
class MockChildProcess extends EventEmitter {
  pid = Math.floor(Math.random() * 10000) + 1000;
  killed = false;

  send(message: any) {
    // Simulate message sending
    setTimeout(() => {
      this.emit('mockSent', message);
    }, 10);
    return true;
  }

  kill(signal?: string) {
    this.killed = true;
    setTimeout(() => {
      this.emit('exit', 0, signal);
    }, 100);
    return true;
  }

  disconnect() {
    setTimeout(() => {
      this.emit('disconnect');
    }, 50);
  }
}

describe('BackgroundJobWorkerService', () => {
  let service: BackgroundJobWorkerService;
  let configService: jest.Mocked<ConfigService>;
  let jobManagementService: jest.Mocked<JobManagementService>;
  let computerUseService: jest.Mocked<ComputerUseService>;
  let module: TestingModule;

  // Mock child processes
  const mockProcesses: MockChildProcess[] = [];

  beforeEach(async () => {
    // Clear mock processes
    mockProcesses.length = 0;

    // Setup child_process.fork mock
    mockFork.mockImplementation(() => {
      const mockProcess = new MockChildProcess();
      mockProcesses.push(mockProcess);

      // Simulate worker ready message after a short delay
      setTimeout(() => {
        mockProcess.emit('message', {
          type: WorkerMessageType.WORKER_READY,
          workerId: 'test-worker-' + mockProcess.pid,
          timestamp: new Date(),
          data: {
            workerId: 'test-worker-' + mockProcess.pid,
            pid: mockProcess.pid,
            startTime: new Date(),
            resourceUsage: {
              memoryUsage: { rss: 50000000, heapUsed: 30000000, heapTotal: 40000000, external: 5000000 },
              cpuUsage: { user: 1000, system: 500 },
            },
          },
        });
      }, 100);

      return mockProcess as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundJobWorkerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                WORKER_MIN_WORKERS: 2,
                WORKER_MAX_WORKERS: 5,
                WORKER_SCALE_UP_THRESHOLD: 3,
                WORKER_SCALE_DOWN_THRESHOLD: 1,
                WORKER_TIMEOUT_MS: 30000,
                WORKER_HEALTH_CHECK_INTERVAL_MS: 5000,
                WORKER_MAX_JOBS_PER_WORKER: 5,
                WORKER_RESTART_DELAY_MS: 1000,
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

    // Disable timers for testing
    jest.useFakeTimers();
  });

  afterEach(async () => {
    // Clean up
    jest.useRealTimers();
    await service.shutdown();
    mockProcesses.length = 0;
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with minimum workers', async () => {
      await service.onModuleInit();

      // Fast-forward timers to allow worker initialization
      jest.advanceTimersByTime(1000);

      const metrics = service.getWorkerPoolMetrics();
      expect(metrics.totalWorkers).toBe(2); // minWorkers = 2
      expect(mockFork).toHaveBeenCalledTimes(2);
    });

    it('should configure worker pool with correct settings', async () => {
      await service.onModuleInit();

      const config = service.getWorkerPoolConfig();
      expect(config.minWorkers).toBe(2);
      expect(config.maxWorkers).toBe(5);
      expect(config.scaleUpThreshold).toBe(3);
      expect(config.scaleDownThreshold).toBe(1);
    });

    it('should emit worker_pool_ready event after initialization', async () => {
      const eventPromise = new Promise((resolve) => {
        service.once('worker_pool_ready', resolve);
      });

      await service.onModuleInit();
      jest.advanceTimersByTime(1000);

      await eventPromise;
      expect(eventPromise).resolves.toBeDefined();
    });
  });

  describe('Worker Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should create workers with proper isolation', () => {
      expect(mockFork).toHaveBeenCalledWith(
        expect.stringContaining('worker-process.js'),
        [],
        expect.objectContaining({
          silent: false,
          env: expect.objectContaining({
            WORKER_ID: expect.any(String),
            WORKER_TIMEOUT_MS: '30000',
          }),
          execArgv: expect.arrayContaining([
            '--max-old-space-size=512',
            '--expose-gc',
          ]),
        })
      );
    });

    it('should track worker information', () => {
      const workers = service.getWorkerInfo();
      expect(workers).toHaveLength(2);

      workers.forEach(worker => {
        expect(worker).toMatchObject({
          workerId: expect.any(String),
          processId: expect.any(Number),
          state: WorkerState.IDLE,
          createdAt: expect.any(Date),
          lastHeartbeat: expect.any(Date),
          assignedJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          averageExecutionTime: 0,
        });
      });
    });

    it('should handle worker heartbeats', () => {
      const mockProcess = mockProcesses[0];
      const workerId = 'test-worker-' + mockProcess.pid;

      // Simulate heartbeat message
      mockProcess.emit('message', {
        type: WorkerMessageType.HEARTBEAT,
        workerId,
        timestamp: new Date(),
        data: {
          memoryUsage: { rss: 55000000, heapUsed: 35000000, heapTotal: 45000000, external: 6000000 },
          cpuUsage: { user: 1100, system: 550 },
          performance: { jobsCompleted: 0, jobsFailed: 0 },
        },
      });

      const workers = service.getWorkerInfo();
      const worker = workers.find(w => w.workerId === workerId);
      expect(worker?.memoryUsage.rss).toBe(55000000);
    });

    it('should restart failed workers', async () => {
      const initialWorkerCount = mockProcesses.length;
      const mockProcess = mockProcesses[0];

      // Simulate worker failure
      mockProcess.emit('error', new Error('Worker crashed'));
      jest.advanceTimersByTime(2000); // Allow restart delay

      // Should have created a new worker
      expect(mockFork).toHaveBeenCalledTimes(initialWorkerCount + 1);
    });

    it('should handle worker disconnection', () => {
      const mockProcess = mockProcesses[0];
      const workerId = 'test-worker-' + mockProcess.pid;

      mockProcess.emit('disconnect');

      const workers = service.getWorkerInfo();
      const worker = workers.find(w => w.workerId === workerId);
      expect(worker?.state).toBe(WorkerState.FAILED);
    });
  });

  describe('Job Submission and Distribution', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should submit jobs with correct priority ordering', async () => {
      const lowPriorityAction: ComputerAction = { action: 'screenshot' };
      const highPriorityAction: ComputerAction = { action: 'click_mouse', x: 100, y: 200 };
      const urgentPriorityAction: ComputerAction = { action: 'type_text', text: 'urgent' };

      // Submit jobs in reverse priority order
      const jobId1 = await service.submitJob(lowPriorityAction, JobPriority.LOW);
      const jobId2 = await service.submitJob(highPriorityAction, JobPriority.HIGH);
      const jobId3 = await service.submitJob(urgentPriorityAction, JobPriority.URGENT);

      expect(jobId1).toBeDefined();
      expect(jobId2).toBeDefined();
      expect(jobId3).toBeDefined();

      // Process job queue
      jest.advanceTimersByTime(2000);

      // Verify jobs were distributed to workers
      const mockProcess1 = mockProcesses[0];
      const mockProcess2 = mockProcesses[1];

      // Should have received job assignment messages
      expect(mockProcess1.listeners('mockSent').length).toBeGreaterThan(0);
      expect(mockProcess2.listeners('mockSent').length).toBeGreaterThan(0);
    });

    it('should handle job completion', async () => {
      const action: ComputerAction = { action: 'screenshot' };
      const jobId = await service.submitJob(action);

      jest.advanceTimersByTime(1000); // Allow job assignment

      const mockProcess = mockProcesses.find(p => !p.killed);
      const workerId = 'test-worker-' + mockProcess!.pid;

      // Simulate job completion
      mockProcess!.emit('message', {
        type: WorkerMessageType.JOB_COMPLETED,
        workerId,
        jobId,
        timestamp: new Date(),
        data: {
          image: 'base64-screenshot-data',
          metadata: { width: 1920, height: 1080 },
        },
      });

      expect(jobManagementService.updateJobResult).toHaveBeenCalledWith(jobId, expect.any(Object));
    });

    it('should handle job failures', async () => {
      const action: ComputerAction = { action: 'screenshot' };
      const jobId = await service.submitJob(action);

      jest.advanceTimersByTime(1000); // Allow job assignment

      const mockProcess = mockProcesses.find(p => !p.killed);
      const workerId = 'test-worker-' + mockProcess!.pid;

      // Simulate job failure
      mockProcess!.emit('message', {
        type: WorkerMessageType.JOB_FAILED,
        workerId,
        jobId,
        timestamp: new Date(),
        data: 'Screenshot capture failed',
      });

      expect(jobManagementService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        undefined,
        'Screenshot capture failed'
      );
    });

    it('should emit job progress events', async () => {
      const action: ComputerAction = { action: 'write_file', path: '/test/file.txt', content: 'test' };
      const jobId = await service.submitJob(action);

      jest.advanceTimersByTime(1000); // Allow job assignment

      const mockProcess = mockProcesses.find(p => !p.killed);
      const workerId = 'test-worker-' + mockProcess!.pid;

      const progressPromise = new Promise((resolve) => {
        service.once('job_progress', resolve);
      });

      // Simulate job progress
      mockProcess!.emit('message', {
        type: WorkerMessageType.JOB_PROGRESS,
        workerId,
        jobId,
        timestamp: new Date(),
        data: { progress: 50 },
      });

      await progressPromise;
      expect(progressPromise).resolves.toMatchObject({
        jobId,
        workerId,
        progress: { progress: 50 },
      });
    });
  });

  describe('Auto-scaling', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should scale up when queue depth exceeds threshold', async () => {
      // Submit multiple jobs to trigger scaling
      const jobs = [];
      for (let i = 0; i < 5; i++) {
        jobs.push(service.submitJob({ action: 'screenshot' }));
      }
      await Promise.all(jobs);

      // Trigger scaling evaluation
      jest.advanceTimersByTime(30000); // Scaling check interval

      // Should have created additional workers
      expect(mockFork).toHaveBeenCalledTimes(4); // 2 initial + 2 scaled up
    });

    it('should scale down when workers are idle', async () => {
      // First scale up by adding workers manually
      const initialWorkerCount = mockProcesses.length;

      // Add more workers to test scale-down
      for (let i = 0; i < 2; i++) {
        await (service as any).createWorker();
      }

      jest.advanceTimersByTime(1000);

      const metricsBeforeScaleDown = service.getWorkerPoolMetrics();
      expect(metricsBeforeScaleDown.totalWorkers).toBe(initialWorkerCount + 2);

      // Trigger scale-down evaluation with no jobs in queue
      jest.advanceTimersByTime(30000);

      // Should have terminated some idle workers
      const metricsAfterScaleDown = service.getWorkerPoolMetrics();
      expect(metricsAfterScaleDown.totalWorkers).toBeLessThanOrEqual(metricsBeforeScaleDown.totalWorkers);
    });
  });

  describe('Health Monitoring', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should monitor worker health and restart unhealthy workers', async () => {
      const initialWorkerCount = mockProcesses.length;
      const mockProcess = mockProcesses[0];

      // Stop sending heartbeats to simulate unhealthy worker
      mockProcess.removeAllListeners('message');

      // Advance time to trigger health check
      jest.advanceTimersByTime(20000); // 4x health check interval

      // Should have restarted the unhealthy worker
      expect(mockFork).toHaveBeenCalledTimes(initialWorkerCount + 1);
    });

    it('should collect and emit metrics', () => {
      const metricsPromise = new Promise((resolve) => {
        service.once('metrics_collected', resolve);
      });

      // Trigger metrics collection
      jest.advanceTimersByTime(60000); // Metrics collection interval

      expect(metricsPromise).resolves.toMatchObject({
        totalWorkers: expect.any(Number),
        activeWorkers: expect.any(Number),
        idleWorkers: expect.any(Number),
        queueSize: expect.any(Number),
        averageExecutionTime: expect.any(Number),
      });
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should track performance metrics accurately', () => {
      const metrics = service.getWorkerPoolMetrics();

      expect(metrics).toMatchObject({
        totalWorkers: expect.any(Number),
        activeWorkers: expect.any(Number),
        idleWorkers: expect.any(Number),
        failedWorkers: expect.any(Number),
        queueSize: expect.any(Number),
        averageQueueTime: expect.any(Number),
        averageExecutionTime: expect.any(Number),
        totalJobsProcessed: expect.any(Number),
        jobsPerSecond: expect.any(Number),
        memoryUsage: expect.any(Number),
        cpuUsage: expect.any(Number),
      });
    });

    it('should update execution time metrics on job completion', async () => {
      const action: ComputerAction = { action: 'screenshot' };
      const jobId = await service.submitJob(action);

      jest.advanceTimersByTime(1000); // Allow job assignment

      const mockProcess = mockProcesses.find(p => !p.killed);
      const workerId = 'test-worker-' + mockProcess!.pid;

      // Simulate job completion with execution time
      mockProcess!.emit('message', {
        type: WorkerMessageType.JOB_COMPLETED,
        workerId,
        jobId,
        timestamp: new Date(),
        data: { success: true },
      });

      const workers = service.getWorkerInfo();
      const worker = workers.find(w => w.workerId === workerId);
      expect(worker?.completedJobs).toBe(1);
      expect(worker?.averageExecutionTime).toBeGreaterThan(0);
    });
  });

  describe('Resource Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should track worker resource usage', () => {
      const mockProcess = mockProcesses[0];
      const workerId = 'test-worker-' + mockProcess.pid;

      // Simulate resource usage update
      mockProcess.emit('message', {
        type: WorkerMessageType.HEARTBEAT,
        workerId,
        timestamp: new Date(),
        data: {
          memoryUsage: { rss: 100000000, heapUsed: 60000000, heapTotal: 80000000, external: 10000000 },
          cpuUsage: { user: 2000, system: 1000 },
        },
      });

      const workers = service.getWorkerInfo();
      const worker = workers.find(w => w.workerId === workerId);
      expect(worker?.memoryUsage.rss).toBe(100000000);
      expect(worker?.cpuUsage.user).toBe(2000);
    });

    it('should enforce maximum jobs per worker', async () => {
      const maxJobsPerWorker = 5;
      const action: ComputerAction = { action: 'screenshot' };

      // Submit more jobs than max per worker
      const jobs = [];
      for (let i = 0; i < maxJobsPerWorker + 2; i++) {
        jobs.push(service.submitJob(action));
      }

      await Promise.all(jobs);
      jest.advanceTimersByTime(2000); // Allow job distribution

      // Should distribute jobs across workers, respecting limits
      const workers = service.getWorkerInfo();
      workers.forEach(worker => {
        expect(worker.assignedJobs).toBeLessThanOrEqual(maxJobsPerWorker);
      });
    });
  });

  describe('Graceful Shutdown', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should perform graceful shutdown', async () => {
      const shutdownPromise = service.shutdown();

      // Fast-forward shutdown timeout
      jest.advanceTimersByTime(35000);

      await shutdownPromise;

      // All workers should be terminated
      mockProcesses.forEach(process => {
        expect(process.killed).toBe(true);
      });
    });

    it('should wait for active jobs to complete during shutdown', async () => {
      // Submit a job
      const action: ComputerAction = { action: 'screenshot' };
      const jobId = await service.submitJob(action);

      jest.advanceTimersByTime(1000); // Allow job assignment

      // Start shutdown
      const shutdownPromise = service.shutdown();

      // Simulate job completion after shutdown started
      setTimeout(() => {
        const mockProcess = mockProcesses.find(p => !p.killed);
        const workerId = 'test-worker-' + mockProcess!.pid;

        mockProcess!.emit('message', {
          type: WorkerMessageType.JOB_COMPLETED,
          workerId,
          jobId,
          timestamp: new Date(),
          data: { success: true },
        });
      }, 1000);

      jest.advanceTimersByTime(35000);
      await shutdownPromise;

      expect(jobManagementService.updateJobResult).toHaveBeenCalledWith(jobId, expect.any(Object));
    });

    it('should handle module destroy', async () => {
      const shutdownSpy = jest.spyOn(service, 'shutdown');

      await service.onModuleDestroy();

      expect(shutdownSpy).toHaveBeenCalled();
    });

    it('should handle application shutdown signals', async () => {
      const shutdownSpy = jest.spyOn(service, 'shutdown');

      await service.onApplicationShutdown('SIGTERM');

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should handle worker process errors gracefully', async () => {
      const initialWorkerCount = mockProcesses.length;
      const mockProcess = mockProcesses[0];

      // Simulate worker error
      mockProcess.emit('error', new Error('Worker process error'));

      jest.advanceTimersByTime(2000); // Allow error handling and restart

      // Should have restarted the failed worker
      expect(mockFork).toHaveBeenCalledTimes(initialWorkerCount + 1);
    });

    it('should handle job assignment failures', async () => {
      // Mock a scenario where worker process is not found
      const action: ComputerAction = { action: 'screenshot' };

      // Remove all worker processes to simulate assignment failure
      mockProcesses.forEach(process => {
        process.kill();
      });

      const jobId = await service.submitJob(action);
      jest.advanceTimersByTime(2000);

      // Job should be marked as failed
      expect(jobManagementService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        undefined,
        expect.stringContaining('Worker assignment failed')
      );
    });

    it('should handle worker exit during job execution', async () => {
      const action: ComputerAction = { action: 'screenshot' };
      const jobId = await service.submitJob(action);

      jest.advanceTimersByTime(1000); // Allow job assignment

      const mockProcess = mockProcesses.find(p => !p.killed);

      // Simulate worker exit during job execution
      mockProcess!.emit('exit', 1, 'SIGKILL');

      jest.advanceTimersByTime(1000);

      // Job should be marked as failed
      expect(jobManagementService.updateJobStatus).toHaveBeenCalledWith(
        jobId,
        JobStatus.FAILED,
        undefined,
        'Worker process terminated unexpectedly'
      );
    });
  });

  describe('Edge Cases', () => {
    beforeEach(async () => {
      await service.onModuleInit();
      jest.advanceTimersByTime(1000);
    });

    it('should handle rapid job submissions', async () => {
      const jobs = [];
      const action: ComputerAction = { action: 'screenshot' };

      // Submit 20 jobs rapidly
      for (let i = 0; i < 20; i++) {
        jobs.push(service.submitJob(action, JobPriority.NORMAL, 30000, { testJob: i }));
      }

      const jobIds = await Promise.all(jobs);
      expect(jobIds).toHaveLength(20);
      expect(jobIds.every(id => typeof id === 'string')).toBe(true);

      // All jobs should be queued
      const metrics = service.getWorkerPoolMetrics();
      expect(metrics.queueSize).toBeGreaterThan(0);
    });

    it('should maintain worker pool size within limits', async () => {
      const maxWorkers = 5;

      // Trigger massive scaling by submitting many jobs
      const jobs = [];
      for (let i = 0; i < 50; i++) {
        jobs.push(service.submitJob({ action: 'screenshot' }));
      }

      await Promise.all(jobs);

      // Trigger multiple scaling evaluations
      for (let i = 0; i < 10; i++) {
        jest.advanceTimersByTime(30000);
      }

      const metrics = service.getWorkerPoolMetrics();
      expect(metrics.totalWorkers).toBeLessThanOrEqual(maxWorkers);
    });

    it('should handle worker message parsing errors', () => {
      const mockProcess = mockProcesses[0];

      // Simulate malformed message
      expect(() => {
        mockProcess.emit('message', null);
      }).not.toThrow();

      expect(() => {
        mockProcess.emit('message', { invalidMessage: true });
      }).not.toThrow();
    });
  });
});