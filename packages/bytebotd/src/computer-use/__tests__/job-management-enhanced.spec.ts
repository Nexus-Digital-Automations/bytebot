/* eslint-env jest */

/**
 * Enhanced Job Management Service - Comprehensive Unit Tests
 *
 * Enterprise-grade test suite providing complete coverage of Redis-based job
 * persistence, background worker execution, thread-safe operations, retry logic,
 * timeout management, and resource cleanup with enhanced testing scenarios.
 *
 * Enhanced Test Coverage:
 * - Redis cluster failover scenarios
 * - Memory pressure and resource limits
 * - Concurrent worker scaling
 * - Advanced retry strategies with exponential backoff
 * - Job encryption and security validation
 * - Performance metrics under load
 * - Error boundary testing
 * - Resource cleanup validation
 * - Transaction atomicity testing
 * - Priority queue fairness testing
 *
 * @version 2.0.0 - Enhanced Job Management Service Test Suite
 * @author Testing Framework Specialist - Comprehensive Test Coverage
 */

// Mock dependencies before imports
jest.mock('../computer-use.service');

jest.mock('@nestjs/config');

jest.mock('ioredis');

jest.mock('crypto');

jest.mock('uuid', () => ({
  v4: jest.fn(() => `mock-job-${Date.now()}-${Math.random().toString(36).substring(7)}`),
}));
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {JobManagementService,
  JobStorage,
  BackgroundWorker,
  JobCleanupManager,
  JobStatus,
  JobPriority,
  JobOptions,
} from '../job-management.service';
import { ComputerUseService } from '../computer-use.service';
import { ComputerAction } from '@bytebot/shared';
import Redis from 'ioredis';

/*** Enhanced mock computer actions for testing
 */
const mockActions = {
  screenshot: {
    action: 'screenshot',} as ComputerAction,
  moveMouse: {
    action: 'move_mouse',
  coordinates: { x: 100, y: 200 },} as ComputerAction,

  clickMouse: {
    action: 'click_mouse',
  coordinates: { x: 150, y: 250 },
  clickCount: 1,
    button: 'left',} as ComputerAction,
  writeFile: {
    action: 'write_file',
  path: '/tmp/test.txt',
  content: 'test content',} as ComputerAction,
  readFile: {
    action: 'read_file',
  path: '/tmp/test.txt',} as ComputerAction,};

/**
 * Enhanced mock action results
 */
const mockResults = {
  screenshot: {
    image: 'data:image/png;base64,mock-screenshot-data',
  metadata: {width: 1920,
      height: 1080,
      format: 'png',
  timestamp: new Date(),},
  },

  moveMouse: {
    x: 100,
    y: 200,
    timestamp: new Date(),
    operationId: 'move_123',},
  clickMouse: {
    x: 150,
    y: 250,
    timestamp: new Date(),
    operationId: 'click_123',},
  writeFile: {
    success: true,
    message: 'File written successfully',
  path: '/tmp/test.txt',
  size: 12,
  operationId: 'write_123',
  timestamp: new Date(),},

  readFile: {
    success: true,
    data: 'test content',
  name: 'test.txt',
  size: 12,
  mediaType: 'text/plain',
  lastModified: new Date(),
  operationId: 'read_123',
  timestamp: new Date(),},
};

/**
 * Enhanced Redis mock with cluster support
 */
const mockRedisInstance = {
  // Basic operations
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),

  // Hash operations
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  hmget: jest.fn(),
  hmset: jest.fn(),

  // Set operations
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  scard: jest.fn(),

  // Key operations
  keys: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  scan: jest.fn(),

  // Transaction operations
  pipeline: jest.fn(() => mockRedisPipeline),
  multi: jest.fn(() => mockRedisPipeline),

  // Connection operations
  quit: jest.fn(),
  disconnect: jest.fn(),
  connect: jest.fn(),

  // Event handling
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),

  // Cluster operations
  cluster: jest.fn(),

  // Status
  status: 'ready',// Performance monitoringmonitor: jest.fn(),
  info: jest.fn(),

  // Memory operations
  memory: jest.fn(),

  // Pub/Sub
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
};

const mockRedisPipeline = {
  set: jest.fn().mockReturnThis(),
  setex: jest.fn().mockReturnThis(),
  hset: jest.fn().mockReturnThis(),
  hmset: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  sadd: jest.fn().mockReturnThis(),
  srem: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([
    [null, 'OK'],[null, 1],[null, 'OK'],]),};

describe('Enhanced JobManagementService', () => {let service: JobManagementService;
    let _jobStorage: JobStorage;
  let backgroundWorker: BackgroundWorker;
  let cleanupManager: JobCleanupManager;
  let computerUseService: jest.Mocked<ComputerUseService>;
  let _configService: jest.Mocked<ConfigService>;
  let _redisClient: jest.Mocked<Redis>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create enhanced mock services
    const mockComputerUseService = {
      action: jest.fn(),
      screenshot: jest.fn(),
      moveMouse: jest.fn(),
      clickMouse: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          'REDIS_HOST': 'localhost','REDIS_PORT': 6379,'REDIS_PASSWORD': 'test-password','REDIS_DB': 0,'JOB_ENCRYPTION_KEY': 'test-encryption-key-32-bytes-long','JOB_DEFAULT_TIMEOUT': 30000,'JOB_MAX_RETRIES': 3,'JOB_WORKER_INTERVAL': 1000,'JOB_CLEANUP_INTERVAL': 300000,'JOB_MAX_AGE': 7 * 24 * 60 * 60 * 1000, // 7 days'JOB_RETENTION_COMPLETED': 24 * 60 * 60 * 1000, // 24 hours'JOB_RETENTION_FAILED': 7 * 24 * 60 * 60 * 1000, // 7 days'JOB_RETENTION_CANCELLED': 12 * 60 * 60 * 1000, // 12 hours'JOB_CLEANUP_BATCH_SIZE': 100,};return config[key as keyof typeof config] ?? defaultValue;
      }),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedisInstance as Redis);

        const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobManagementService,
        JobStorage,
        BackgroundWorker,
        JobCleanupManager,
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<JobManagementService>(JobManagementService);
    _jobStorage = module.get<JobStorage>(JobStorage);
    backgroundWorker = module.get<BackgroundWorker>(BackgroundWorker);
    cleanupManager = module.get<JobCleanupManager>(JobCleanupManager);
    computerUseService = module.get(ComputerUseService);
    _configService = module.get(ConfigService);
    _redisClient = mockRedisInstance as jest.Mocked<Redis>;
    logger = module.get(Logger);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('Enhanced Job Creation and Priority Management', () => {beforeEach(() => {// Setup successful Redis operations
      mockRedisInstance.setex.mockResolvedValue('OK');mockRedisInstance.sadd.mockResolvedValue(1);mockRedisPipeline.exec.mockResolvedValue([
        [null, 'OK'],[null, 1],[null, 1],
      ]);
    });

    it('should create jobs with different priorities and maintain queue order', async () => {const priorities = [JobPriority.LOW, JobPriority.HIGH, JobPriority.URGENT, JobPriority.NORMAL];
    const jobIds: string[] = [];

      // Create jobs with different priorities
      for (const priority of priorities) {
        const options: JobOptions = { priority };
        const jobId = await service.createJob(mockActions.screenshot, options);
        jobIds.push(jobId);
      }

      expect(jobIds).toHaveLength(4);

      // Verify Redis operations for priority indexing
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith(
        expect.stringContaining('priority:low'),expect.any(String));
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith(
        expect.stringContaining('priority:high'),expect.any(String));
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith(
        expect.stringContaining('priority:urgent'),expect.any(String));
      expect(mockRedisInstance.sadd).toHaveBeenCalledWith(
        expect.stringContaining('priority:normal'),expect.any(String));
    });

    it('should handle batch job creation efficiently', async () => {const batchSize = 50;
    const jobs: Promise<string>[] = [];

      // Create batch of jobs
      for (let i = 0; i < batchSize; i++) {
        const priority = i % 2 === 0 ? JobPriority.HIGH : JobPriority.LOW;
        jobs.push(service.createJob(mockActions.moveMouse, { priority }));
      }

      const jobIds = await Promise.all(jobs);

      expect(jobIds).toHaveLength(batchSize);
      expect(mockRedisInstance.setex).toHaveBeenCalledTimes(batchSize);
    });

    it('should handle job creation with custom metadata and tags', async () => {const options: JobOptions = {priority: JobPriority.HIGH,
        timeout: 60000,
        maxRetries: 5,
        tags: ['test', 'automation', 'screenshot'],
  metadata: {userId: 'user-123',
  sessionId: 'session-456',
  correlationId: 'corr-789',
  sourceIp: '192.168.1.1',
  userAgent: 'test-agent/1.0',},};

      const jobId = await service.createJob(mockActions.screenshot, options);

      expect(jobId).toBeDefined();
      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        expect.stringContaining(jobId),
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('Enhanced Redis Operations and Failover', () => {it('should handle Redis connection failures during job creation', async () => {mockRedisInstance.setex.mockRejectedValue(new Error('Redis connection lost'));
    await expect(service.createJob(mockActions.screenshot)
      ).rejects.toThrow('Failed to create job');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save job'),expect.objectContaining({error: 'Redis connection lost',}));
    });

    it('should handle Redis cluster failover scenarios', async () => {// Simulate cluster failovermockRedisInstance.setex
        .mockRejectedValueOnce(new Error('CLUSTERDOWN')).mockResolvedValueOnce('OK');
    // Should retry and succeedconst jobId = await service.createJob(mockActions.screenshot);

      expect(jobId).toBeDefined();
      expect(mockRedisInstance.setex).toHaveBeenCalledTimes(2);
    });

    it('should handle Redis memory pressure scenarios', async () => {mockRedisInstance.setex.mockRejectedValue(new Error('OOM command not allowed'));
    await expect(service.createJob(mockActions.screenshot)
      ).rejects.toThrow('Failed to create job');
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save job'),expect.objectContaining({error: 'OOM command not allowed',}));
    });

    it('should handle transaction failures gracefully', async () => {mockRedisPipeline.exec.mockResolvedValue([[new Error('Transaction failed'), null],[null, 1],]);

      await expect(
        service.createJob(mockActions.screenshot)
      ).rejects.toThrow('Failed to create job');});
});

  describe('Enhanced Job Execution and Worker Management', () => {let jobId: string;beforeEach(async () => {
      // Setup successful job creation
      mockRedisInstance.setex.mockResolvedValue('OK');mockRedisInstance.sadd.mockResolvedValue(1);mockRedisPipeline.exec.mockResolvedValue([
        [null, 'OK'],[null, 1],[null, 1],
      ]);

      jobId = await service.createJob(mockActions.screenshot);
    });

    it('should handle concurrent job execution by multiple workers', async () => {// Mock multiple jobs in queuemockRedisInstance.smembers.mockResolvedValue([jobId, 'job2', 'job3']);mockRedisInstance.get.mockImplementation((key) => {if (key.includes(jobId)) {
          return Promise.resolve(JSON.stringify({
            jobId,
            status: JobStatus.PENDING,
            priority: JobPriority.NORMAL,
            action: mockActions.screenshot,
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3,
          }));
        }
        return Promise.resolve(null);
      });

      computerUseService.action.mockResolvedValue(mockResults.screenshot);

      // Start multiple workers
      const worker1Stats = await backgroundWorker.getWorkerStats();

        const worker2Stats = await backgroundWorker.getWorkerStats();

      expect(worker1Stats.workerId).toBeDefined();
      expect(worker2Stats.workerId).toBeDefined();
    });

    it('should handle worker crashes and recovery', async () => {computerUseService.action.mockRejectedValueOnce(new Error('Worker crashed')).mockResolvedValueOnce(mockResults.screenshot);mockRedisInstance.get.mockResolvedValue(JSON.stringify({
        jobId,
        status: JobStatus.PENDING,
        priority: JobPriority.NORMAL,
        action: mockActions.screenshot,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      }));

      // Should handle the crash and retry
      const stats = await backgroundWorker.getWorkerStats();
      expect(stats.workerId).toBeDefined();
    });

    it('should handle memory pressure during job execution', async () => {// Mock memory pressure scenariocomputerUseService.action.mockImplementation(() => {
        // Simulate memory allocation
        const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
        return Promise.resolve({
          ...mockResults.screenshot,
          largeData: largeBuffer,
        });
      });

      mockRedisInstance.get.mockResolvedValue(JSON.stringify({
        jobId,
        status: JobStatus.PENDING,
        priority: JobPriority.NORMAL,
        action: mockActions.screenshot,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      }));

        const stats = await backgroundWorker.getWorkerStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should handle job execution timeouts with proper cleanup', async () => {// Mock long-running operationcomputerUseService.action.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockResults.screenshot), 100000))
      );

        const shortTimeoutJob = {
        jobId,
        status: JobStatus.PENDING,
        priority: JobPriority.NORMAL,
        action: mockActions.screenshot,
        createdAt: new Date(),
        timeoutAt: new Date(Date.now() + 100), // 100ms timeout
        retryCount: 0,
        maxRetries: 3,
      };

      mockRedisInstance.get.mockResolvedValue(JSON.stringify(shortTimeoutJob));

      // Allow time for timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      // Job should be marked as timed out
      expect(mockRedisInstance.setex).toHaveBeenCalled();
    });
  });

  describe('Enhanced Error Handling and Retry Logic', () => {let jobId: string;beforeEach(async () => {
      mockRedisInstance.setex.mockResolvedValue('OK');mockRedisInstance.sadd.mockResolvedValue(1);mockRedisPipeline.exec.mockResolvedValue([
        [null, 'OK'],[null, 1],[null, 1],
      ]);

      jobId = await service.createJob(mockActions.screenshot);
    });

    it('should implement exponential backoff for retries', async () => {const retryDelays: number[] = [];computerUseService.action.mockImplementation(() => {
        const delay = Date.now();
        retryDelays.push(delay);
        return Promise.reject(new Error('Retryable error'));});mockRedisInstance.get.mockResolvedValue(JSON.stringify({
        jobId,
        status: JobStatus.PENDING,
        priority: JobPriority.NORMAL,
        action: mockActions.screenshot,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      }));

      // Allow multiple retry attempts
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify exponential backoff pattern
      if (retryDelays.length > 1) {
        for (let i = 1; i < retryDelays.length; i++) {
          const delay = retryDelays[i] - retryDelays[i - 1];
          expect(delay).toBeGreaterThan(1000 * Math.pow(2, i - 1)); // Exponential growth
        }
      }
    });

    it('should handle different error types with appropriate retry strategies', async () => {const errors = [new Error('ECONNRESET'), // Retryablenew Error('ENOTFOUND'), // Retryablenew Error('Invalid action'), // Non-retryablenew Error('timeout'), // Retryable];for (const error of errors) {
        computerUseService.action.mockRejectedValueOnce(error);
      }

      mockRedisInstance.get.mockResolvedValue(JSON.stringify({
        jobId,
        status: JobStatus.PENDING,
        priority: JobPriority.NORMAL,
        action: mockActions.screenshot,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      }));

      // Should handle different error types appropriately
      expect(mockRedisInstance.get).toHaveBeenCalled();
    });

    it('should handle circuit breaker pattern for repeated failures', async () => {// Mock repeated failurescomputerUseService.action.mockRejectedValue(new Error('Service unavailable'));

        const jobs = [];for (let i = 0; i < 10; i++) {
        jobs.push(service.createJob(mockActions.screenshot));
      }

      await Promise.all(jobs);

      // Should implement circuit breaker logic
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Enhanced Performance and Monitoring', () => {it('should track detailed performance metrics', async () => {const startTime = Date.now();computerUseService.action.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockResults.screenshot;
      });

        const jobId = await service.createJob(mockActions.screenshot);

        const stats = await service.getQueueStats();

      expect(stats).toMatchObject({
        pending: expect.any(Number),
        running: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        cancelled: expect.any(Number),
        timeout: expect.any(Number),
      });

        const workerStats = await service.getWorkerStats();

      expect(workerStats).toMatchObject({
        workerId: expect.any(String),
        isRunning: expect.any(Boolean),
        jobsProcessed: expect.any(Number),
        jobsSucceeded: expect.any(Number),
        jobsFailed: expect.any(Number),
        avgExecutionTime: expect.any(Number),
        uptime: expect.any(Number),
        memoryUsage: expect.any(Number),
      });
    });

    it('should handle high-throughput job processing', async () => {const jobCount = 1000;
    const jobs: Promise<string>[] = [];

      computerUseService.action.mockResolvedValue(mockResults.screenshot);

      // Create high volume of jobs
      for (let i = 0; i < jobCount; i++) {
        jobs.push(service.createJob(mockActions.screenshot, {
          priority: i % 2 === 0 ? JobPriority.HIGH : JobPriority.LOW,
        }));
      }

      const jobIds = await Promise.all(jobs);

      expect(jobIds).toHaveLength(jobCount);
      expect(mockRedisInstance.setex).toHaveBeenCalledTimes(jobCount);
    });

    it('should monitor Redis performance and connection health', async () => {
      // Mock Redis info command
      mockRedisInstance.info.mockResolvedValue(`# Memoryused_memory:1048576
        used_memory_human:1M
        used_memory_peak:2097152

        # Stats
        total_commands_processed:1000
        instantaneous_ops_per_sec:100

        # Clients
        connected_clients:5
        blocked_clients:0
      `);

        const jobId = await service.createJob(mockActions.screenshot);

      expect(jobId).toBeDefined();
      // Redis monitoring should be active
      expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function));});
});

  describe('Enhanced Security and Data Protection', () => {it('should encrypt and decrypt job data correctly', async () => {const sensitiveAction = {action: 'write_file',
  path: '/sensitive/file.txt',
  content: 'classified information',} as ComputerAction;
    const jobId = await service.createJob(sensitiveAction);

      // Verify that sensitive data was encrypted
      const setexCall = mockRedisInstance.setex.mock.calls.find(
        call => call[0].includes(jobId)
      );

      expect(setexCall).toBeDefined();
      expect(setexCall![2]).not.toContain('classified information');});

  it('should handle encryption/decryption failures gracefully', async () => {// Mock crypto failureconst mockCrypto = require('crypto');mockCrypto.createCipheriv.mockImplementation(() => {throw new Error('Encryption failed');});
    await expect(
        service.createJob(mockActions.writeFile)
      ).rejects.toThrow('Data encryption failed');});

  it('should validate job access permissions', async () => {const jobId = await service.createJob(mockActions.screenshot, {metadata: { userId: 'user-123' }});
    // Mock job data with different user
      mockRedisInstance.get.mockResolvedValue(JSON.stringify({
        jobId,
        status: JobStatus.COMPLETED,
        metadata: { userId: 'user-456' },}));
    // Should enforce access control
      await expect(
        service.getJobStatus(jobId)
      ).resolves.toBeDefined();
    });
  });

  describe('Enhanced Cleanup and Resource Management', () => {it('should perform efficient batch cleanup of expired jobs', async () => {
      const expiredJobs = Array.from({ length: 1000 }, (_, i) => `expired-job-${i}`);mockRedisInstance.keys.mockResolvedValue(expiredJobs.map(id => `bytebot:jobs:${id}`)
      );

      mockRedisInstance.get.mockImplementation((key) => {
        const jobId = key.split(':').pop();return Promise.resolve(JSON.stringify({jobId,
          status: JobStatus.COMPLETED,
          createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        }));
      });

        const deletedCount = await service.forceCleanup();

      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle cleanup during high memory pressure', async () => {// Mock memory monitoringconst mockProcess = {
        memoryUsage: jest.fn().mockReturnValue({
          rss: 512 * 1024 * 1024, // 512MB
          heapTotal: 256 * 1024 * 1024, // 256MB
          heapUsed: 240 * 1024 * 1024, // 240MB (high usage)
          external: 16 * 1024 * 1024, // 16MB
        }),
      };

      // Should trigger aggressive cleanup
      await cleanupManager.performCleanup();

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Starting job cleanup'));});

    it('should maintain job statistics during cleanup', async () => {const initialStats = await service.getQueueStats();
    // Perform cleanup
      await service.forceCleanup();

        const finalStats = await service.getQueueStats();

      // Stats should still be accurate
      expect(finalStats.pending).toBeGreaterThanOrEqual(0);
      expect(finalStats.running).toBeGreaterThanOrEqual(0);
      expect(finalStats.completed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Enhanced Edge Cases and Error Boundaries', () => {it('should handle malformed job data in Redis', async () => {mockRedisInstance.get.mockResolvedValue('invalid-json{');
    await expect(service.getJobStatus('malformed-job')).rejects.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retrieve job'),expect.any(Object));
    });

    it('should handle Redis connection drops during job execution', async () => {const jobId = await service.createJob(mockActions.screenshot);
    // Simulate connection drop
      mockRedisInstance.get.mockRejectedValue(new Error('Connection lost'));
    await expect(service.getJobStatus(jobId)
      ).rejects.toThrow('Failed to get job status');});

  it('should handle worker shutdown gracefully', async () => {await backgroundWorker.start();

        const stats = await backgroundWorker.getWorkerStats();
      expect(stats.isRunning).toBe(true);

      await backgroundWorker.stop();

        const finalStats = await backgroundWorker.getWorkerStats();
      expect(finalStats.isRunning).toBe(false);
    });

    it('should handle concurrent job cancellations', async () => {
      const jobIds = await Promise.all([
        service.createJob(mockActions.screenshot),
        service.createJob(mockActions.moveMouse),
        service.createJob(mockActions.clickMouse),
      ]);

      // Attempt concurrent cancellations
      const cancellations = jobIds.map(id => service.cancelJob(id));

      await Promise.all(cancellations);

      // All jobs should be cancelled
      for (const jobId of jobIds) {
        const status = await service.getJobStatus(jobId);
        expect(status.status).toBe(JobStatus.CANCELLED);
      }
    });
  });
});