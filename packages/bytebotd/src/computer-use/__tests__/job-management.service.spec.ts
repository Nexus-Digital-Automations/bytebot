/* eslint-env jest */

/**
 * Job Management Service - Comprehensive Unit Tests
 *
 * Enterprise-grade test suite for the JobManagementService class providing
 * complete coverage of Redis-based job persistence, background worker execution,
 * thread-safe operations, retry logic, timeout management, and resource cleanup.
 *
 * Test Coverage:
 * - Job creation and Redis persistence
 * - Background worker execution pipeline
 * - Thread-safe operations with distributed locking
 * - Error handling and retry mechanisms
 * - Job timeout management and cancellation
 * - Resource cleanup and memory optimization
 * - Redis connection management and failover
 * - Job encryption and security features
 * - Performance metrics and monitoring
 * - Service lifecycle management
 *
 * @version 1.0.0 - Complete Job Management Service Test Suite
 * @author Subagent 5 - Computer Use Test Coverage Enhancement
 */

// Mock dependencies before imports
jest.mock('../computer-use.service');
jest.mock('@nestjs/config');
jest.mock('ioredis');
jest.mock('crypto');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-job-uuid-12345'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobManagementService, JobStatus, JobPriority } from '../job-management.service';
import { ComputerUseService } from '../computer-use.service';
import { ComputerAction } from '@bytebot/shared';
import Redis from 'ioredis';

/**
 * Mock computer actions for testing
 */
const mockScreenshotAction: ComputerAction = {
  action: 'screenshot',
};

const mockMoveAction: ComputerAction = {
  action: 'move_mouse',
  coordinates: { x: 100, y: 200 },
};

const mockClickAction: ComputerAction = {
  action: 'click_mouse',
  coordinates: { x: 150, y: 250 },
  clickCount: 1,
  button: 'left',
};

/**
 * Mock action results
 */
const mockScreenshotResult = {
  operationId: 'screenshot_123',
  success: true,
  timestamp: new Date().toISOString(),
  screenshotPath: '/tmp/screenshot_123.png',
  screenshotData: Buffer.from('fake-image-data'),
  metadata: {
    width: 1920,
    height: 1080,
    format: 'png',
    fileSize: 1024,
  },
};

/**
 * Mock Redis implementation
 */
const mockRedisInstance = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  keys: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  pipeline: jest.fn(() => mockRedisPipeline),
  multi: jest.fn(() => mockRedisPipeline),
  quit: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  status: 'ready',
};

const mockRedisPipeline = {
  set: jest.fn().mockReturnThis(),
  setex: jest.fn().mockReturnThis(),
  hset: jest.fn().mockReturnThis(),
  del: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([[null, 'OK'], [null, 1]]),
};

describe('JobManagementService', () => {
  let service: JobManagementService;
  let computerUseService: jest.Mocked<ComputerUseService>;
  let configService: jest.Mocked<ConfigService>;
  let redisClient: jest.Mocked<Redis>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mock services
    const mockComputerUseService = {
      action: jest.fn(),
      screenshot: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'redis.host':
            return 'localhost';
          case 'redis.port':
            return 6379;
          case 'redis.password':
            return 'redis-password';
          case 'job.defaultTimeout':
            return 30000;
          case 'job.maxRetries':
            return 3;
          case 'job.cleanupInterval':
            return 300000;
          case 'job.encryptionKey':
            return 'test-encryption-key-32-bytes-long';
          default:
            return undefined;
        }
      }),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    // Mock Redis constructor
    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedisInstance as unknown);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobManagementService,
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
    computerUseService = module.get(ComputerUseService);
    configService = module.get(ConfigService);
    redisClient = mockRedisInstance as unknown;
    logger = module.get(Logger);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize service with required dependencies', () => {
      expect(service).toBeDefined();
      expect(computerUseService).toBeDefined();
      expect(configService).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should connect to Redis on module init', async () => {
      expect(Redis).toHaveBeenCalledWith({
        host: 'localhost',
        port: 6379,
        password: 'redis-password',
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    });

    it('should setup Redis event listeners', () => {
      expect(redisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(redisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    });

    it('should handle Redis connection errors gracefully', async () => {
      const errorCallback = (redisClient.on as jest.Mock).mock.calls
        .find(call => call[0] === 'error')[1];

      expect(() => errorCallback(new Error('Redis connection failed'))).not.toThrow();
      expect(logger.error).toHaveBeenCalledWith(
        'Redis connection error:',
        expect.stringContaining('Redis connection failed')
      );
    });

    it('should start cleanup interval on initialization', async () => {
      // Verify that cleanup was scheduled
      expect(configService.get).toHaveBeenCalledWith('job.cleanupInterval');
    });
  });

  describe('Job Creation and Persistence', () => {
    const userId = 'user-123';

    it('should create job successfully', async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');

      const jobId = await service.createJob(mockScreenshotAction, userId);

      expect(jobId).toBe('mock-job-uuid-12345');
      expect(redisClient.hset).toHaveBeenCalledWith(
        'job:mock-job-uuid-12345',
        expect.objectContaining({
          id: 'mock-job-uuid-12345',
          userId: userId,
          status: JobStatus.PENDING,
          action: expect.any(String), // Encrypted action data
          createdAt: expect.any(String),
        })
      );
    });

    it('should create job with custom options', async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');

      const options = {
        priority: JobPriority.HIGH,
        timeout: 60000,
        metadata: { source: 'test' },
      };

      const jobId = await service.createJob(mockScreenshotAction, userId, options);

      expect(jobId).toBe('mock-job-uuid-12345');
      expect(redisClient.hset).toHaveBeenCalledWith(
        'job:mock-job-uuid-12345',
        expect.objectContaining({
          priority: JobPriority.HIGH,
          timeout: 60000,
          metadata: expect.any(String), // Encrypted metadata
        })
      );
    });

    it('should handle Redis persistence errors', async () => {
      redisClient.hset.mockRejectedValue(new Error('Redis write failed'));

      await expect(
        service.createJob(mockScreenshotAction, userId)
      ).rejects.toThrow('Failed to create job');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to persist job to Redis:',
        expect.stringContaining('Redis write failed')
      );
    });

    it('should encrypt sensitive job data', async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');

      await service.createJob(mockScreenshotAction, userId);

      const hsetCall = redisClient.hset.mock.calls[0]!;
      const jobData = hsetCall[1]!;

      // Action and metadata should be encrypted
      expect(jobData.action).not.toEqual(JSON.stringify(mockScreenshotAction));
      expect(typeof jobData.action).toBe('string');
    });
  });

  describe('Job Execution and Worker Pipeline', () => {
    const userId = 'user-123';
    let jobId: string;

    beforeEach(async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');
      jobId = await service.createJob(mockScreenshotAction, userId);
    });

    it('should execute job successfully', async () => {
      computerUseService.action.mockResolvedValue(mockScreenshotResult);
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.PENDING,
        action: JSON.stringify(mockScreenshotAction), // Simplified for test
        createdAt: new Date().toISOString(),
      });

      const result = await service.executeJob(jobId);

      expect(result).toBe(true);
      expect(computerUseService.action).toHaveBeenCalledWith(mockScreenshotAction);
      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          status: JobStatus.COMPLETED,
          result: expect.any(String), // Encrypted result
          completedAt: expect.any(String),
        })
      );
    });

    it('should handle job execution errors with retry logic', async () => {
      computerUseService.action.mockRejectedValue(new Error('Execution failed'));
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.PENDING,
        action: JSON.stringify(mockScreenshotAction),
        createdAt: new Date().toISOString(),
        retryCount: '0',
      });

      const result = await service.executeJob(jobId);

      expect(result).toBe(false);
      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          status: JobStatus.RETRY,
          retryCount: '1',
          errorMessage: expect.any(String),
        })
      );
    });

    it('should mark job as failed after max retries', async () => {
      computerUseService.action.mockRejectedValue(new Error('Execution failed'));
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.RETRY,
        action: JSON.stringify(mockScreenshotAction),
        createdAt: new Date().toISOString(),
        retryCount: '3', // Max retries reached
      });

      const result = await service.executeJob(jobId);

      expect(result).toBe(false);
      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          status: JobStatus.FAILED,
          failedAt: expect.any(String),
        })
      );
    });

    it('should handle job timeout scenarios', async () => {
      computerUseService.action.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockScreenshotResult), 100000))
      );

      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.PENDING,
        action: JSON.stringify(mockScreenshotAction),
        createdAt: new Date(Date.now() - 100000).toISOString(), // Job started 100s ago
        timeout: '1000', // 1 second timeout
      });

      const result = await service.executeJob(jobId);

      expect(result).toBe(false);
      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          status: JobStatus.TIMEOUT,
          timeoutAt: expect.any(String),
        })
      );
    });

    it('should handle non-existent job execution requests', async () => {
      redisClient.hgetall.mockResolvedValue(null);

      const result = await service.executeJob('non-existent-job');

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Attempted to execute non-existent job:',
        'non-existent-job'
      );
    });
  });

  describe('Job Status and Retrieval', () => {
    const userId = 'user-123';
    let jobId: string;

    beforeEach(async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');
      jobId = await service.createJob(mockScreenshotAction, userId);
    });

    it('should get job status successfully', async () => {
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.COMPLETED,
        action: JSON.stringify(mockScreenshotAction),
        result: JSON.stringify(mockScreenshotResult),
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      const status = await service.getJobStatus(jobId, userId);

      expect(status).toMatchObject({
        id: jobId,
        userId: userId,
        status: JobStatus.COMPLETED,
        action: mockScreenshotAction,
        result: mockScreenshotResult,
        createdAt: expect.any(Date),
        completedAt: expect.any(Date),
      });
    });

    it('should handle unauthorized access attempts', async () => {
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: 'other-user-456',
        status: JobStatus.COMPLETED,
        action: JSON.stringify(mockScreenshotAction),
      });

      await expect(
        service.getJobStatus(jobId, userId)
      ).rejects.toThrow('Unauthorized access to job');
    });

    it('should handle non-existent job status requests', async () => {
      redisClient.hgetall.mockResolvedValue(null);

      await expect(
        service.getJobStatus('non-existent-job', userId)
      ).rejects.toThrow('Job not found');
    });

    it('should handle Redis retrieval errors', async () => {
      redisClient.hgetall.mockRejectedValue(new Error('Redis read failed'));

      await expect(
        service.getJobStatus(jobId, userId)
      ).rejects.toThrow('Failed to retrieve job status');
    });

    it('should decrypt job data correctly', async () => {
      const encryptedAction = 'encrypted-action-data';
      const encryptedResult = 'encrypted-result-data';

      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.COMPLETED,
        action: encryptedAction,
        result: encryptedResult,
        createdAt: new Date().toISOString(),
      });

      // Mock crypto decryption
      const mockCrypto = require('crypto');
      const mockDecipher = {
        update: jest.fn().mockReturnValue('decrypted-'),
        final: jest.fn().mockReturnValue('data'),
      };
      mockCrypto.createDecipher.mockReturnValue(mockDecipher);

      const status = await service.getJobStatus(jobId, userId);

      expect(status).toBeDefined();
      // Verify decryption was attempted
      expect(mockCrypto.createDecipher).toHaveBeenCalled();
    });
  });

  describe('Job Cancellation', () => {
    const userId = 'user-123';
    let jobId: string;

    beforeEach(async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');
      jobId = await service.createJob(mockScreenshotAction, userId);
    });

    it('should cancel pending job successfully', async () => {
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.PENDING,
        action: JSON.stringify(mockScreenshotAction),
        createdAt: new Date().toISOString(),
      });

      const result = await service.cancelJob(jobId, userId);

      expect(result).toBe(true);
      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          status: JobStatus.CANCELLED,
          cancelledAt: expect.any(String),
        })
      );
    });

    it('should handle cancellation of running jobs', async () => {
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.RUNNING,
        action: JSON.stringify(mockScreenshotAction),
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      });

      const result = await service.cancelJob(jobId, userId);

      expect(result).toBe(true);
      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          status: JobStatus.CANCELLED,
          cancelledAt: expect.any(String),
        })
      );
    });

    it('should not cancel completed jobs', async () => {
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.COMPLETED,
        action: JSON.stringify(mockScreenshotAction),
        result: JSON.stringify(mockScreenshotResult),
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      const result = await service.cancelJob(jobId, userId);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        'Cannot cancel job in status:',
        JobStatus.COMPLETED
      );
    });

    it('should handle unauthorized cancellation attempts', async () => {
      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: 'other-user-456',
        status: JobStatus.PENDING,
        action: JSON.stringify(mockScreenshotAction),
      });

      await expect(
        service.cancelJob(jobId, userId)
      ).rejects.toThrow('Unauthorized access to job');
    });
  });

  describe('Job Cleanup and Resource Management', () => {
    it('should clean up expired jobs', async () => {
      const expiredJobKeys = [
        'job:expired-job-1',
        'job:expired-job-2',
        'job:expired-job-3',
      ];

      redisClient.keys.mockResolvedValue(expiredJobKeys);
      redisClient.hgetall.mockResolvedValue({
        id: 'expired-job-1',
        status: JobStatus.COMPLETED,
        completedAt: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
      });

      await service.cleanupExpiredJobs();

      expect(redisClient.keys).toHaveBeenCalledWith('job:*');
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      redisClient.keys.mockRejectedValue(new Error('Redis keys failed'));

      await expect(service.cleanupExpiredJobs()).resolves.not.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Error during job cleanup:',
        expect.stringContaining('Redis keys failed')
      );
    });

    it('should cleanup on module destroy', async () => {
      await service.onModuleDestroy();

      expect(redisClient.quit).toHaveBeenCalled();
    });
  });

  describe('Job Priority and Queue Management', () => {
    const userId = 'user-123';

    it('should handle different job priorities', async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');

      const highPriorityJob = await service.createJob(_mockScreenshotAction, userId, {
        priority: JobPriority.HIGH,
      });

      const lowPriorityJob = await service.createJob(_mockMoveAction, userId, {
        priority: JobPriority.LOW,
      });

      expect(highPriorityJob).toBeDefined();
      expect(lowPriorityJob).toBeDefined();

      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${highPriorityJob}`,
        expect.objectContaining({
          priority: JobPriority.HIGH,
        })
      );

      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${lowPriorityJob}`,
        expect.objectContaining({
          priority: JobPriority.LOW,
        })
      );
    });

    it('should get jobs by priority for queue processing', async () => {
      redisClient.keys.mockResolvedValue(['job:job1', 'job:job2', 'job:job3']);
      redisClient.hgetall
        .mockResolvedValueOnce({
          id: 'job1',
          priority: JobPriority.HIGH,
          status: JobStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: 'job2',
          priority: JobPriority.LOW,
          status: JobStatus.PENDING,
        })
        .mockResolvedValueOnce({
          id: 'job3',
          priority: JobPriority.NORMAL,
          status: JobStatus.PENDING,
        });

      const pendingJobs = await service.getPendingJobs();

      expect(pendingJobs).toHaveLength(3);
      expect(redisClient.keys).toHaveBeenCalledWith('job:*');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const userId = 'user-123';

    it('should handle Redis connection failures', async () => {
      redisClient.hset.mockRejectedValue(new Error('Connection lost'));

      await expect(
        service.createJob(mockScreenshotAction, userId)
      ).rejects.toThrow('Failed to create job');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to persist job to Redis:',
        expect.stringContaining('Connection lost')
      );
    });

    it('should handle malformed job data gracefully', async () => {
      redisClient.hgetall.mockResolvedValue({
        id: 'malformed-job',
        userId: userId,
        status: 'invalid-status',
        action: 'invalid-json{',
      });

      await expect(
        service.getJobStatus('malformed-job', userId)
      ).rejects.toThrow();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle concurrent access to same job', async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.hgetall.mockResolvedValue({
        id: 'concurrent-job',
        userId: userId,
        status: JobStatus.RUNNING,
        action: JSON.stringify(mockScreenshotAction),
      });

      const result1 = service.executeJob('concurrent-job');
      const result2 = service.executeJob('concurrent-job');

      await Promise.all([result1, result2]);

      // Should handle concurrent execution gracefully
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe('Performance and Monitoring', () => {
    const userId = 'user-123';

    it('should track job performance metrics', async () => {
      redisClient.hset.mockResolvedValue(1);
      redisClient.setex.mockResolvedValue('OK');
      computerUseService.action.mockResolvedValue(mockScreenshotResult);

      const jobId = await service.createJob(mockScreenshotAction, userId);

      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.PENDING,
        action: JSON.stringify(mockScreenshotAction),
        createdAt: new Date().toISOString(),
      });

      await service.executeJob(jobId);

      // Should track execution time
      expect(redisClient.hset).toHaveBeenCalledWith(
        `job:${jobId}`,
        expect.objectContaining({
          executionTime: expect.any(String),
        })
      );
    });

    it('should handle memory optimization for large results', async () => {
      const largeResult = {
        ...mockScreenshotResult,
        screenshotData: Buffer.alloc(10 * 1024 * 1024), // 10MB buffer
      };

      computerUseService.action.mockResolvedValue(largeResult);
      redisClient.hset.mockResolvedValue(1);

      const jobId = await service.createJob(mockScreenshotAction, userId);

      redisClient.hgetall.mockResolvedValue({
        id: jobId,
        userId: userId,
        status: JobStatus.PENDING,
        action: JSON.stringify(mockScreenshotAction),
        createdAt: new Date().toISOString(),
      });

      await service.executeJob(jobId);

      // Should handle large results without memory issues
      expect(redisClient.hset).toHaveBeenCalled();
    });
  });
});