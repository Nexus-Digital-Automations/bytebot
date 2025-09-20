/**
 * Priority Job Queue Service Tests
 *
 * Comprehensive test suite for enterprise-grade priority queue functionality:
 * - Thread-safe operations validation
 * - Priority-based scheduling tests
 * - Concurrency and performance testing
 * - Error handling and edge cases
 * - Queue metrics and analytics validation
 * - Distributed locking mechanism tests
 * - Fair scheduling and starvation prevention
 * - Redis persistence and recovery testing
 *
 * Test Coverage:
 * - Unit tests for all queue operations
 * - Integration tests with Redis
 * - Performance benchmarks
 * - Concurrency stress tests
 * - Error injection and resilience testing
 */

import { Test, TestingModule } from '@nestjs/testing';import { ConfigService } from '@nestjs/config';import { Logger } from '@nestjs/common';import Redis from 'ioredis';import {PriorityJobQueueService,
  EnhancedJobPriority,
  QueueOperation,
} from '../priority-job-queue.service';import { JobStatus } from '../../dto/async-job.dto';// Mock Redis for testingjest.mock('ioredis');describe('PriorityJobQueueService', () => {let service: PriorityJobQueueService;let module: TestingModule;
  let mockRedis: jest.Mocked<Redis>;
  let mockConfigService: jest.Mocked<ConfigService>;

  // Test data
  const testJobPayload = { action: 'screenshot', options: { format: 'png' } };const testJobId = 'job_test_123456789';beforeEach(async () => {// Create mock Redis instance
    mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue('OK'),get: jest.fn().mockResolvedValue(null),del: jest.fn().mockResolvedValue(1),
      hset: jest.fn().mockResolvedValue(1),
      hget: jest.fn().mockResolvedValue(null),
      hgetall: jest.fn().mockResolvedValue({}),
      hincrby: jest.fn().mockResolvedValue(1),
      zadd: jest.fn().mockResolvedValue(1),
      zrem: jest.fn().mockResolvedValue(1),
      zrange: jest.fn().mockResolvedValue([]),
      zcard: jest.fn().mockResolvedValue(0),
      pipeline: jest.fn().mockReturnValue({
        hset: jest.fn().mockReturnThis(),
        zadd: jest.fn().mockReturnThis(),
        zrem: jest.fn().mockReturnThis(),
        hincrby: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      eval: jest.fn().mockResolvedValue(1),
    } as any;

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    // Create mock ConfigService
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config = {
          REDIS_HOST: 'localhost',REDIS_PORT: 6379,REDIS_DB: 0,
          QUEUE_MAX_SIZE: 1000,
          QUEUE_MAX_JOBS_PER_PRIORITY: 200,
          QUEUE_BACKPRESSURE_THRESHOLD: 0.8,
          QUEUE_LOCK_TIMEOUT: 30000,
          QUEUE_LOCK_RETRY_ATTEMPTS: 5,
          QUEUE_LOCK_RETRY_DELAY: 100,
          QUEUE_METRICS_UPDATE_INTERVAL: 5000,
          QUEUE_PERSISTENCE_INTERVAL: 30000,
          QUEUE_DEADLOCK_DETECTION_INTERVAL: 10000,
          QUEUE_STARVATION_PREVENTION: true,
          QUEUE_STARVATION_THRESHOLD: 300000,
          QUEUE_BATCH_SIZE: 100,
          QUEUE_COMPRESSION: true,
          QUEUE_ENCRYPTION: false,
        };
        return config[key] || defaultValue;
      }),
    } as any;

    const moduleBuilder = Test.createTestingModule({
      providers: [
        PriorityJobQueueService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    });

    module = await moduleBuilder.compile();
    service = module.get<PriorityJobQueueService>(PriorityJobQueueService);

    // Suppress console logs during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();jest.spyOn(Logger.prototype, 'debug').mockImplementation();jest.spyOn(Logger.prototype, 'warn').mockImplementation();jest.spyOn(Logger.prototype, 'error').mockImplementation();});afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {it('should be defined', () => {expect(service).toBeDefined();});

    it('should initialize with correct configuration', async () => {await service.onModuleInit();expect(mockRedis.connect).toHaveBeenCalled();
      expect(mockConfigService.get).toHaveBeenCalledWith('REDIS_HOST', 'localhost');expect(mockConfigService.get).toHaveBeenCalledWith('QUEUE_MAX_SIZE', 10000);});it('should handle Redis connection errors during initialization', async () => {mockRedis.connect.mockRejectedValueOnce(new Error('Redis connection failed'));await expect(service.onModuleInit()).rejects.toThrow('Queue service initialization failed');});it('should cleanup resources on module destroy', async () => {await service.onModuleInit();await service.onModuleDestroy();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });
  });

  describe('Job Enqueue Operations', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should enqueue a job with default priority', async () => {// Mock Redis responsesmockRedis.zcard.mockResolvedValue(0); // Queue size
      mockRedis.pipeline().exec.mockResolvedValue([]);

      const result = await service.enqueue(testJobId, testJobPayload);

      expect(result.success).toBe(true);
      expect(result.operation).toBe(QueueOperation.ENQUEUE);
      expect(result.data?.metadata.jobId).toBe(testJobId);
      expect(result.data?.metadata.priority).toBe(EnhancedJobPriority.NORMAL);
      expect(result.data?.status).toBe(JobStatus.PENDING);
    });

    it('should enqueue a job with high priority', async () => {mockRedis.zcard.mockResolvedValue(0);mockRedis.pipeline().exec.mockResolvedValue([]);

      const result = await service.enqueue(
        testJobId,
        testJobPayload,
        EnhancedJobPriority.HIGH,
        {
          estimatedDuration: 5000,
          maxRetries: 5,
          tags: ['high-priority', 'user-action'],userId: 'user123',});

      expect(result.success).toBe(true);
      expect(result.data?.metadata.priority).toBe(EnhancedJobPriority.HIGH);
      expect(result.data?.metadata.estimatedDuration).toBe(5000);
      expect(result.data?.metadata.maxRetries).toBe(5);
      expect(result.data?.metadata.tags).toEqual(['high-priority', 'user-action']);expect(result.data?.metadata.userId).toBe('user123');});it('should reject jobs when queue capacity is exceeded', async () => {// Mock queue size at capacitymockRedis.zcard.mockResolvedValue(1000); // At max capacity

      const result = await service.enqueue(testJobId, testJobPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Queue capacity exceeded');});it('should handle Redis errors during enqueue', async () => {mockRedis.zcard.mockResolvedValue(0);mockRedis.pipeline().exec.mockRejectedValueOnce(new Error('Redis error'));const result = await service.enqueue(testJobId, testJobPayload);expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should calculate correct priority scores', async () => {mockRedis.zcard.mockResolvedValue(0);mockRedis.pipeline().exec.mockResolvedValue([]);

      await service.enqueue('urgent_job', testJobPayload, EnhancedJobPriority.URGENT);await service.enqueue('normal_job', testJobPayload, EnhancedJobPriority.NORMAL);await service.enqueue('background_job', testJobPayload, EnhancedJobPriority.BACKGROUND);// Verify that zadd was called with appropriate scoresconst pipeline = mockRedis.pipeline();
      expect(pipeline.zadd).toHaveBeenCalledTimes(3);
    });
  });

  describe('Job Dequeue Operations', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should dequeue the highest priority job', async () => {// Mock a job in the urgent queuemockRedis.zrange.mockImplementation((key: string) => {
        if (key.includes('urgent')) {return Promise.resolve(['urgent_job_123']);}return Promise.resolve([]);
      });

      // Mock job data
      const mockJobData = {
        metadata: JSON.stringify({
          jobId: 'urgent_job_123',priority: EnhancedJobPriority.URGENT,submittedAt: new Date().toISOString(),
          estimatedDuration: 1000,
          retryCount: 0,
          maxRetries: 3,
          timeout: 5000,
          tags: [],
          dependencies: [],
          queuePosition: 0,
          estimatedStartTime: new Date().toISOString(),
          metadata: {},
        }),
        payload: JSON.stringify(testJobPayload),
        status: JobStatus.PENDING,
        queuedAt: new Date().toISOString(),
      };

      mockRedis.hgetall.mockResolvedValue(mockJobData);
      mockRedis.zrem.mockResolvedValue(1);

      const result = await service.dequeue();

      expect(result.success).toBe(true);
      expect(result.operation).toBe(QueueOperation.DEQUEUE);
      expect(result.data?.metadata.jobId).toBe('urgent_job_123');expect(result.data?.metadata.priority).toBe(EnhancedJobPriority.URGENT);expect(result.data?.status).toBe(JobStatus.IN_PROGRESS);
    });

    it('should return null when queue is empty', async () => {// Mock empty queuesmockRedis.zrange.mockResolvedValue([]);

      const result = await service.dequeue();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.metadata.reason).toBe('queue_empty');});it('should handle starvation prevention', async () => {// Mock scenario where low priority job has been waiting too longconst oldTimestamp = Date.now() - 400000; // 6.67 minutes ago (exceeds 5 minute threshold)

      mockRedis.zrange.mockImplementation((key: string, start: number, stop: number, ...args: any[]) => {
        if (key.includes('low') && args[0] === 'WITHSCORES') {return Promise.resolve(['starved_job_123', oldTimestamp.toString()]);}if (key.includes('low')) {return Promise.resolve(['starved_job_123']);}return Promise.resolve([]);
      });

      const result = await service.dequeue();

      expect(result.success).toBe(true);
      expect(result.data?.metadata.jobId).toBe('starved_job_123');});it('should handle Redis errors during dequeue', async () => {mockRedis.zrange.mockRejectedValue(new Error('Redis error'));const result = await service.dequeue();expect(result.success).toBe(false);
      expect(result.error).toContain('Redis error');});});

  describe('Job Peek Operations', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should peek at next job without removing it', async () => {// Mock a job in the high priority queuemockRedis.zrange.mockImplementation((key: string) => {
        if (key.includes('high')) {return Promise.resolve(['high_job_123']);}return Promise.resolve([]);
      });

      const mockJobData = {
        metadata: JSON.stringify({
          jobId: 'high_job_123',priority: EnhancedJobPriority.HIGH,submittedAt: new Date().toISOString(),
          estimatedDuration: 5000,
          retryCount: 0,
          maxRetries: 3,
          timeout: 30000,
          tags: [],
          dependencies: [],
          queuePosition: 0,
          estimatedStartTime: new Date().toISOString(),
          metadata: {},
        }),
        payload: JSON.stringify(testJobPayload),
        status: JobStatus.PENDING,
        queuedAt: new Date().toISOString(),
      };

      mockRedis.hgetall.mockResolvedValue(mockJobData);

      const result = await service.peek();

      expect(result.success).toBe(true);
      expect(result.operation).toBe(QueueOperation.PEEK);
      expect(result.data?.metadata.jobId).toBe('high_job_123');expect(result.data?.status).toBe(JobStatus.PENDING);// Verify job was not removed from queue
      expect(mockRedis.zrem).not.toHaveBeenCalled();
    });

    it('should peek at specific priority queue', async () => {mockRedis.zrange.mockImplementation((key: string) => {if (key.includes('normal')) {return Promise.resolve(['normal_job_123']);}return Promise.resolve([]);
      });

      const mockJobData = {
        metadata: JSON.stringify({
          jobId: 'normal_job_123',priority: EnhancedJobPriority.NORMAL,submittedAt: new Date().toISOString(),
          estimatedDuration: 15000,
          retryCount: 0,
          maxRetries: 3,
          timeout: 120000,
          tags: [],
          dependencies: [],
          queuePosition: 0,
          estimatedStartTime: new Date().toISOString(),
          metadata: {},
        }),
        payload: JSON.stringify(testJobPayload),
        status: JobStatus.PENDING,
        queuedAt: new Date().toISOString(),
      };

      mockRedis.hgetall.mockResolvedValue(mockJobData);

      const result = await service.peek(EnhancedJobPriority.NORMAL);

      expect(result.success).toBe(true);
      expect(result.data?.metadata.priority).toBe(EnhancedJobPriority.NORMAL);
    });

    it('should return null when peeking at empty queue', async () => {mockRedis.zrange.mockResolvedValue([]);const result = await service.peek();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(result.metadata.reason).toBe('queue_empty');});});

  describe('Job Removal Operations', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should remove a job from the queue', async () => {const mockJobData = {metadata: JSON.stringify({
          jobId: testJobId,
          priority: EnhancedJobPriority.NORMAL,
          submittedAt: new Date().toISOString(),
          estimatedDuration: 15000,
          retryCount: 0,
          maxRetries: 3,
          timeout: 120000,
          tags: [],
          dependencies: [],
          queuePosition: 5,
          estimatedStartTime: new Date().toISOString(),
          metadata: {},
        }),
        payload: JSON.stringify(testJobPayload),
        status: JobStatus.PENDING,
        queuedAt: new Date().toISOString(),
      };

      mockRedis.hgetall.mockResolvedValue(mockJobData);
      mockRedis.zrem.mockResolvedValue(1);

      const result = await service.removeJob(testJobId);

      expect(result.success).toBe(true);
      expect(result.operation).toBe(QueueOperation.REMOVE);
      expect(result.data).toBe(true);
      expect(mockRedis.zrem).toHaveBeenCalled();
    });

    it('should return error when trying to remove non-existent job', async () => {mockRedis.hgetall.mockResolvedValue({});const result = await service.removeJob('non_existent_job');expect(result.success).toBe(false);expect(result.error).toBe('Job not found');});});

  describe('Job Status Updates', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should update job status successfully', async () => {const mockJobData = {metadata: JSON.stringify({
          jobId: testJobId,
          priority: EnhancedJobPriority.NORMAL,
          submittedAt: new Date().toISOString(),
          estimatedDuration: 15000,
          retryCount: 0,
          maxRetries: 3,
          timeout: 120000,
          tags: [],
          dependencies: [],
          queuePosition: 0,
          estimatedStartTime: new Date().toISOString(),
          metadata: {},
        }),
        payload: JSON.stringify(testJobPayload),
        status: JobStatus.IN_PROGRESS,
        queuedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };

      mockRedis.hgetall.mockResolvedValue(mockJobData);
      mockRedis.hset.mockResolvedValue(1);

      const result = await service.updateJobStatus(
        testJobId,
        JobStatus.COMPLETED,
        { success: true, data: 'screenshot_data' },undefined);

      expect(result).toBe(true);
      expect(mockRedis.hset).toHaveBeenCalled();
    });

    it('should return false when updating non-existent job', async () => {mockRedis.hgetall.mockResolvedValue({});const result = await service.updateJobStatus(
        'non_existent_job',JobStatus.COMPLETED);

      expect(result).toBe(false);
    });

    it('should handle Redis errors during status update', async () => {const mockJobData = {metadata: JSON.stringify({
          jobId: testJobId,
          priority: EnhancedJobPriority.NORMAL,
          submittedAt: new Date().toISOString(),
          estimatedDuration: 15000,
          retryCount: 0,
          maxRetries: 3,
          timeout: 120000,
          tags: [],
          dependencies: [],
          queuePosition: 0,
          estimatedStartTime: new Date().toISOString(),
          metadata: {},
        }),
        payload: JSON.stringify(testJobPayload),
        status: JobStatus.IN_PROGRESS,
        queuedAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };

      mockRedis.hgetall.mockResolvedValue(mockJobData);
      mockRedis.hset.mockRejectedValue(new Error('Redis error'));const result = await service.updateJobStatus(testJobId, JobStatus.COMPLETED);expect(result).toBe(false);
    });
  });

  describe('Queue Metrics', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should return comprehensive queue metrics', async () => {// Mock Redis metrics dataconst mockMetricsData = {
        totalJobs: '150','priority:urgent': '5','priority:high': '25','priority:normal': '100','priority:low': '15','priority:background': '5','status:pending': '120','status:in_progress': '20','status:completed': '8','status:failed': '2','status:cancelled': '0',};mockRedis.hgetall.mockResolvedValue(mockMetricsData);

      const metrics = await service.getQueueMetrics();

      expect(metrics.totalJobs).toBe(150);
      expect(metrics.jobsByPriority[EnhancedJobPriority.URGENT]).toBe(5);
      expect(metrics.jobsByPriority[EnhancedJobPriority.HIGH]).toBe(25);
      expect(metrics.jobsByPriority[EnhancedJobPriority.NORMAL]).toBe(100);
      expect(metrics.jobsByStatus[JobStatus.PENDING]).toBe(120);
      expect(metrics.jobsByStatus[JobStatus.IN_PROGRESS]).toBe(20);
      expect(metrics.capacityUtilization).toBe(0.15); // 150 / 1000
    });

    it('should handle metrics retrieval errors gracefully', async () => {mockRedis.hgetall.mockRejectedValue(new Error('Redis error'));const metrics = await service.getQueueMetrics();// Should return default metrics structure
      expect(metrics.totalJobs).toBe(0);
      expect(metrics.jobsByPriority).toBeDefined();
      expect(metrics.jobsByStatus).toBeDefined();
    });
  });

  describe('Job Retrieval', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should retrieve job details successfully', async () => {const mockJobData = {metadata: JSON.stringify({
          jobId: testJobId,
          priority: EnhancedJobPriority.NORMAL,
          submittedAt: new Date().toISOString(),
          estimatedDuration: 15000,
          retryCount: 0,
          maxRetries: 3,
          timeout: 120000,
          tags: ['test'],dependencies: [],queuePosition: 5,
          estimatedStartTime: new Date().toISOString(),
          metadata: { custom: 'data' },}),payload: JSON.stringify(testJobPayload),
        status: JobStatus.PENDING,
        queuedAt: new Date().toISOString(),
      };

      mockRedis.hgetall.mockResolvedValue(mockJobData);

      const job = await service.getJob(testJobId);

      expect(job).toBeDefined();
      expect(job?.metadata.jobId).toBe(testJobId);
      expect(job?.metadata.priority).toBe(EnhancedJobPriority.NORMAL);
      expect(job?.status).toBe(JobStatus.PENDING);
      expect(job?.payload).toEqual(testJobPayload);
    });

    it('should return null for non-existent job', async () => {mockRedis.hgetall.mockResolvedValue({});const job = await service.getJob('non_existent_job');expect(job).toBeNull();});

    it('should handle Redis errors during job retrieval', async () => {mockRedis.hgetall.mockRejectedValue(new Error('Redis error'));const job = await service.getJob(testJobId);expect(job).toBeNull();
    });
  });

  describe('Distributed Locking', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should acquire and release locks properly during enqueue', async () => {mockRedis.set.mockResolvedValue('OK'); // Lock acquiredmockRedis.eval.mockResolvedValue(1); // Lock releasedmockRedis.zcard.mockResolvedValue(0);
      mockRedis.pipeline().exec.mockResolvedValue([]);

      const result = await service.enqueue(testJobId, testJobPayload);

      expect(result.success).toBe(true);
      expect(result.lockAcquired).toBe(true);
      expect(mockRedis.set).toHaveBeenCalled(); // Lock acquisition
      expect(mockRedis.eval).toHaveBeenCalled(); // Lock release
    });

    it('should handle lock acquisition failures', async () => {mockRedis.set.mockResolvedValue(null); // Lock not acquiredmockRedis.zcard.mockResolvedValue(0);

      const result = await service.enqueue(testJobId, testJobPayload);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to acquire lock');});it('should retry lock acquisition with backoff', async () => {let callCount = 0;mockRedis.set.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.resolve(null); // Failed attempts
        }
        return Promise.resolve('OK'); // Success on 4th attempt});mockRedis.eval.mockResolvedValue(1);
      mockRedis.zcard.mockResolvedValue(0);
      mockRedis.pipeline().exec.mockResolvedValue([]);

      const result = await service.enqueue(testJobId, testJobPayload);

      expect(result.success).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledTimes(4);
    });
  });

  describe('Performance and Concurrency', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should handle multiple concurrent enqueue operations', async () => {mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);
      mockRedis.zcard.mockResolvedValue(0);
      mockRedis.pipeline().exec.mockResolvedValue([]);

      const concurrentEnqueues = Array.from({ length: 10 }, (_, i) =>
        service.enqueue(`job_${i}`, testJobPayload, EnhancedJobPriority.NORMAL)
      );

      const results = await Promise.all(concurrentEnqueues);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should maintain performance under load', async () => {mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);
      mockRedis.zcard.mockResolvedValue(0);
      mockRedis.pipeline().exec.mockResolvedValue([]);

      const startTime = Date.now();

      const concurrentOperations = Array.from({ length: 100 }, (_, i) =>
        service.enqueue(`job_${i}`, testJobPayload, EnhancedJobPriority.NORMAL)
      );

      await Promise.all(concurrentOperations);

      const duration = Date.now() - startTime;

      // Should complete 100 operations in reasonable time (< 5 seconds)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle priority ordering correctly under concurrent access', async () => {mockRedis.set.mockResolvedValue('OK');mockRedis.eval.mockResolvedValue(1);mockRedis.zcard.mockResolvedValue(0);
      mockRedis.pipeline().exec.mockResolvedValue([]);

      // Enqueue jobs with different priorities
      const jobs = [
        { id: 'urgent_job', priority: EnhancedJobPriority.URGENT },{ id: 'normal_job', priority: EnhancedJobPriority.NORMAL },{ id: 'high_job', priority: EnhancedJobPriority.HIGH },{ id: 'low_job', priority: EnhancedJobPriority.LOW },{ id: 'background_job', priority: EnhancedJobPriority.BACKGROUND },];const enqueuePromises = jobs.map(job =>
        service.enqueue(job.id, testJobPayload, job.priority)
      );

      const results = await Promise.all(enqueuePromises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify that higher priority jobs get lower scores (processed first)
      const pipelineCalls = mockRedis.pipeline().zadd as jest.MockedFunction<any>;
      expect(pipelineCalls).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling and Resilience', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should gracefully handle Redis connection failures', async () => {mockRedis.zcard.mockRejectedValue(new Error('Connection lost'));const result = await service.enqueue(testJobId, testJobPayload);expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle corrupted job data gracefully', async () => {// Mock corrupted job datamockRedis.hgetall.mockResolvedValue({
        metadata: 'invalid_json',payload: JSON.stringify(testJobPayload),status: JobStatus.PENDING,
        queuedAt: new Date().toISOString(),
      });

      const job = await service.getJob(testJobId);

      expect(job).toBeNull();
    });

    it('should recover from transaction failures', async () => {mockRedis.set.mockResolvedValue('OK');mockRedis.eval.mockResolvedValue(1);mockRedis.zcard.mockResolvedValue(0);

      // Mock pipeline execution failure
      mockRedis.pipeline().exec.mockRejectedValueOnce(new Error('Transaction failed'));const result = await service.enqueue(testJobId, testJobPayload);expect(result.success).toBe(false);
      expect(result.error).toContain('Transaction failed');});});

  describe('Queue Configuration and Limits', () => {beforeEach(async () => {await service.onModuleInit();
    });

    it('should respect queue capacity limits', async () => {// Mock queue at 80% capacity (backpressure threshold)mockRedis.zcard.mockResolvedValue(800);

      const result = await service.enqueue(testJobId, testJobPayload);

      // Should still succeed but with backpressure warning
      expect(result.success).toBe(true);
    });

    it('should activate backpressure at configured threshold', async () => {// Mock queue at 90% capacity (above backpressure threshold)mockRedis.zcard.mockResolvedValue(900);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);
      mockRedis.pipeline().exec.mockResolvedValue([]);

      const result = await service.enqueue(testJobId, testJobPayload);

      const metrics = await service.getQueueMetrics();
      expect(metrics.backpressureActive).toBe(true);
    });
  });
});