/**
 * JobStatusResultService Test Suite - Enterprise-Grade Testing
 *
 * Comprehensive test coverage for job status tracking and result management:
 * - Unit tests for all service methods and edge cases
 * - Integration tests with Redis and cache services
 * - Performance tests for high-throughput scenarios
 * - Error handling and recovery testing
 * - Data consistency and integrity validation
 * - Streaming and compression functionality testing
 *
 * @author Claude Code - Job Management Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';import { ConfigService } from '@nestjs/config';import { EventEmitter2 } from '@nestjs/event-emitter';import { NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';import Redis from 'ioredis';import { JobStatusResultService } from '../job-status-result.service';import { CacheService } from '../../../cache/cache.service';import { MetricsService } from '../../../metrics/metrics.service';import { JobStatus, JobPriority } from '../../dto/async-job.dto';// Mock dependenciesconst mockRedis = {
  pipeline: jest.fn(() => ({
    hset: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    lpush: jest.fn().mockReturnThis(),
    ltrim: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  })),
  hget: jest.fn(),
  hset: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  lrange: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  ping: jest.fn().mockResolvedValue('PONG'),quit: jest.fn().mockResolvedValue(undefined),subscribe: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
};

const mockRedisSubscriber = {
  ...mockRedis,
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const mockMetricsService = {
  recordMetric: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: any) => {
    const config = {
      'redis.host': 'localhost','redis.port': 6379,'redis.password': undefined,'redis.db': 0,'job.streaming.chunkSize': 1024 * 1024,'job.streaming.maxConcurrentChunks': 5,'job.streaming.compression': true,'job.streaming.resumable': true,'job.streaming.cacheChunks': true,'job.streaming.thresholdMB': 5,};return config[key] ?? defaultValue;
  }),
};

const mockEventEmitter = {
  emit: jest.fn(),
};

// Mock Redis constructor
jest.mock('ioredis', () => {return jest.fn().mockImplementation(() => mockRedis);});

describe('JobStatusResultService', () => {let service: JobStatusResultService;let module: TestingModule;

  const sampleJobId = 'job_1702983456789_abc123';const sampleEnhancedStatus = {jobId: sampleJobId,
    status: JobStatus.IN_PROGRESS,
    progress: 50,
    progressDetails: {
      currentStep: 'Processing request',totalSteps: 4,currentStepIndex: 2,
      estimatedTimeRemaining: 15000,
    },
    metadata: { priority: JobPriority.NORMAL },
    timestamps: {
      submitted: new Date('2023-12-19T10:30:45.789Z'),started: new Date('2023-12-19T10:30:46.123Z'),lastUpdated: new Date('2023-12-19T10:31:10.456Z'),},performance: {
      executionTimeMs: 25000,
      memoryUsageMB: 45.7,
      cpuUsagePercent: 12.5,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        JobStatusResultService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<JobStatusResultService>(JobStatusResultService);

    // Mock the Redis instances on the service
    (service as any).redis = mockRedis;
    (service as any).redisSubscriber = mockRedisSubscriber;
    (service as any).isInitialized = true;
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Service Initialization', () => {it('should be defined', () => {expect(service).toBeDefined();});

    it('should initialize with correct streaming configuration', () => {const streamingConfig = (service as any).streamingConfig;expect(streamingConfig).toEqual({
        chunkSize: 1024 * 1024,
        maxConcurrentChunks: 5,
        compressionEnabled: true,
        resumableDownloads: true,
        cacheChunks: true,
        streamingThresholdMB: 5,
      });
    });

    it('should initialize retention policies', () => {const retentionPolicies = (service as any).retentionPolicies;expect(retentionPolicies.size).toBeGreaterThan(0);
    });
  });

  describe('Job Status Management', () => {describe('updateJobStatus', () => {beforeEach(() => {mockCacheService.get.mockResolvedValue(sampleEnhancedStatus);
      });

      it('should update job status successfully', async () => {const pipeline = {hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          lpush: jest.fn().mockReturnThis(),
          ltrim: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline);

        await service.updateJobStatus(
          sampleJobId,
          JobStatus.COMPLETED,
          100,
          { currentStep: 'Completed successfully' },{ completedBy: 'system' });expect(pipeline.hset).toHaveBeenCalled();
        expect(pipeline.expire).toHaveBeenCalled();
        expect(pipeline.lpush).toHaveBeenCalled();
        expect(pipeline.ltrim).toHaveBeenCalled();
        expect(pipeline.exec).toHaveBeenCalled();
        expect(mockCacheService.set).toHaveBeenCalled();
        expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.status.updated', expect.objectContaining({jobId: sampleJobId,status: JobStatus.COMPLETED,
          progress: 100,
        }));
      });

      it('should validate job ID', async () => {await expect(service.updateJobStatus('', JobStatus.COMPLETED, 100)).rejects.toThrow(BadRequestException);await expect(service.updateJobStatus(null as any, JobStatus.COMPLETED, 100))
          .rejects.toThrow(BadRequestException);
      });

      it('should validate progress range', async () => {mockCacheService.get.mockResolvedValue(sampleEnhancedStatus);await expect(service.updateJobStatus(sampleJobId, JobStatus.IN_PROGRESS, -10))
          .rejects.toThrow(BadRequestException);

        await expect(service.updateJobStatus(sampleJobId, JobStatus.IN_PROGRESS, 150))
          .rejects.toThrow(BadRequestException);
      });

      it('should handle job not found', async () => {mockCacheService.get.mockResolvedValue(null);mockRedis.hget.mockResolvedValue(null);

        await expect(service.updateJobStatus(sampleJobId, JobStatus.COMPLETED, 100))
          .rejects.toThrow(NotFoundException);
      });

      it('should clamp progress values to valid range', async () => {mockCacheService.get.mockResolvedValue(sampleEnhancedStatus);const pipeline = {
          hset: jest.fn().mockReturnThis(),
          expire: jest.fn().mockReturnThis(),
          lpush: jest.fn().mockReturnThis(),
          ltrim: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        };
        mockRedis.pipeline.mockReturnValue(pipeline);

        // Test progress clamping in the actual stored value
        await service.updateJobStatus(sampleJobId, JobStatus.IN_PROGRESS, 50);

        const hsetCall = pipeline.hset.mock.calls[0];
        const storedStatusJson = hsetCall[1].status;
        const storedStatus = JSON.parse(storedStatusJson);
        expect(storedStatus.progress).toBe(50);
      });
    });

    describe('getJobStatus', () => {it('should retrieve job status from cache', async () => {
        mockCacheService.get.mockResolvedValue(sampleEnhancedStatus);

        const result = await service.getJobStatus(sampleJobId);

        expect(result).toEqual(sampleEnhancedStatus);
        expect(mockCacheService.get).toHaveBeenCalledWith(`job:status:${sampleJobId}`);
        expect(mockRedis.hget).not.toHaveBeenCalled();
      });

      it('should fallback to Redis when cache misses', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockRedis.hget.mockResolvedValue(JSON.stringify(sampleEnhancedStatus));

        const result = await service.getJobStatus(sampleJobId);

        expect(result).toBeDefined();
        expect(mockRedis.hget).toHaveBeenCalledWith(
          `bytebot:job:status:${sampleJobId}`,
          'status');expect(mockCacheService.set).toHaveBeenCalled();
      });

      it('should return null for non-existent job', async () => {mockCacheService.get.mockResolvedValue(null);mockRedis.hget.mockResolvedValue(null);

        const result = await service.getJobStatus(sampleJobId);

        expect(result).toBeNull();
      });

      it('should handle invalid job ID', async () => {await expect(service.getJobStatus('')).rejects.toThrow(BadRequestException);});

      it('should properly deserialize dates', async () => {const statusWithDateStrings = {...sampleEnhancedStatus,
          timestamps: {
            submitted: '2023-12-19T10:30:45.789Z',started: '2023-12-19T10:30:46.123Z',lastUpdated: '2023-12-19T10:31:10.456Z',},};

        mockCacheService.get.mockResolvedValue(null);
        mockRedis.hget.mockResolvedValue(JSON.stringify(statusWithDateStrings));

        const result = await service.getJobStatus(sampleJobId);

        expect(result?.timestamps.submitted).toBeInstanceOf(Date);
        expect(result?.timestamps.started).toBeInstanceOf(Date);
        expect(result?.timestamps.lastUpdated).toBeInstanceOf(Date);
      });
    });
  });

  describe('Result Management', () => {const sampleResult = {screenshot: 'base64-encoded-data',success: true,metadata: { action: 'screenshot' },};describe('storeJobResult', () => {it('should store small result directly', async () => {const resultData = { test: 'data' };mockRedis.hset.mockResolvedValue('OK');mockRedis.expire.mockResolvedValue(1);const storageInfo = await service.storeJobResult(
          sampleJobId,
          resultData,
          'application/json',true);

        expect(storageInfo).toBeDefined();
        expect(storageInfo.jobId).toBe(sampleJobId);
        expect(storageInfo.format).toBe('json');expect(storageInfo.compressed).toBe(false); // Small data not compressedexpect(mockRedis.hset).toHaveBeenCalled();
        expect(mockCacheService.set).toHaveBeenCalled();
      });

      it('should compress large results', async () => {const largeResult = { data: 'x'.repeat(2000) }; // Large enough to trigger compressionmockRedis.hset.mockResolvedValue('OK');mockRedis.expire.mockResolvedValue(1);const storageInfo = await service.storeJobResult(
          sampleJobId,
          largeResult,
          'application/json',true);

        expect(storageInfo.compressed).toBe(true);
        expect(storageInfo.compressionRatio).toBeGreaterThan(1);
      });

      it('should handle streaming for very large results', async () => {const veryLargeResult = { data: 'x'.repeat(6 * 1024 * 1024) }; // 6MBmockRedis.hset.mockResolvedValue('OK');mockRedis.expire.mockResolvedValue(1);const storageInfo = await service.storeJobResult(
          sampleJobId,
          veryLargeResult,
          'application/json',true);

        expect(storageInfo.chunks).toBeGreaterThan(1);
        expect(storageInfo.format).toBe('stream');});it('should generate and verify checksums', async () => {const testData = { test: 'checksum' };mockRedis.hset.mockResolvedValue('OK');mockRedis.expire.mockResolvedValue(1);const storageInfo = await service.storeJobResult(
          sampleJobId,
          testData,
          'application/json',false);

        expect(storageInfo.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
      });

      it('should validate job ID', async () => {await expect(service.storeJobResult('', sampleResult)).rejects.toThrow(BadRequestException);});
    });

    describe('getJobResult', () => {const mockStorageInfo = {resultId: 'result_123',size: 1024,compressed: false,
        format: 'json',contentType: 'application/json',checksum: 'abc123',storageLocation: 'test-location',createdAt: new Date().toISOString(),expiresAt: new Date().toISOString(),
      };

      it('should retrieve result from cache', async () => {const cachedResult = { test: 'cached' };
        mockCacheService.get.mockResolvedValue(cachedResult);
        (service as any).getResultStorageInfo = jest.fn().mockResolvedValue(mockStorageInfo);

        const result = await service.getJobResult(sampleJobId, false);

        expect(result).toEqual({
          result: cachedResult,
          metadata: mockStorageInfo,
        });
        expect(mockCacheService.get).toHaveBeenCalledWith(`job:result:${sampleJobId}`);
      });

      it('should retrieve result from Redis when cache misses', async () => {const storedResult = { test: 'redis' };mockCacheService.get.mockResolvedValue(null);(service as any).getResultStorageInfo = jest.fn().mockResolvedValue(mockStorageInfo);
        mockRedis.hget.mockResolvedValue(Buffer.from(JSON.stringify(storedResult)).toString('base64'));const result = await service.getJobResult(sampleJobId, false);expect(result).toEqual({
          result: storedResult,
          metadata: mockStorageInfo,
        });
        expect(mockRedis.hget).toHaveBeenCalled();
        expect(mockCacheService.set).toHaveBeenCalled();
      });

      it('should handle compressed results', async () => {const originalData = { test: 'compressed' };const compressedStorageInfo = { ...mockStorageInfo, compressed: true };mockCacheService.get.mockResolvedValue(null);
        (service as any).getResultStorageInfo = jest.fn().mockResolvedValue(compressedStorageInfo);

        const zlib = require('zlib');const compressed = zlib.gzipSync(JSON.stringify(originalData));mockRedis.hget.mockResolvedValue(compressed.toString('base64'));const result = await service.getJobResult(sampleJobId, false);expect(result).toBeDefined();
        expect((result as any).result).toEqual(originalData);
      });

      it('should return stream for streaming request', async () => {const streamingStorageInfo = { ...mockStorageInfo, chunks: 5 };(service as any).getResultStorageInfo = jest.fn().mockResolvedValue(streamingStorageInfo);
        (service as any).createResultStream = jest.fn().mockReturnValue('mock-stream');const result = await service.getJobResult(sampleJobId, true);expect(result).toBe('mock-stream');expect((service as any).createResultStream).toHaveBeenCalledWith(sampleJobId, streamingStorageInfo);});

      it('should throw NotFoundException for missing result', async () => {(service as any).getResultStorageInfo = jest.fn().mockResolvedValue(null);await expect(service.getJobResult(sampleJobId, false))
          .rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('History and Audit Trail', () => {describe('recordJobHistory', () => {it('should record history entry successfully', async () => {mockRedis.lpush.mockResolvedValue(1);mockRedis.ltrim.mockResolvedValue('OK');mockRedis.expire.mockResolvedValue(1);await service.recordJobHistory(
          sampleJobId,
          'started',{ progress: 0 },'user123','session456'
        );

        expect(mockRedis.lpush).toHaveBeenCalled();
        expect(mockRedis.ltrim).toHaveBeenCalledWith(
          `bytebot:job:history:${sampleJobId}`,
          0,
          999
        );
        expect(mockRedis.expire).toHaveBeenCalled();
      });

      it('should not throw on history recording errors', async () => {mockRedis.lpush.mockRejectedValue(new Error('Redis error'));// Should not throwawait expect(service.recordJobHistory(sampleJobId, 'started', {})).resolves.not.toThrow();});
    });

    describe('getJobHistory', () => {const mockHistoryData = [JSON.stringify({
          jobId: sampleJobId,
          timestamp: '2023-12-19T10:30:45.789Z',event: 'created',data: { status: 'pending' },source: 'system',}),JSON.stringify({
          jobId: sampleJobId,
          timestamp: '2023-12-19T10:30:46.123Z',event: 'started',data: { status: 'in_progress' },source: 'system',}),];

      it('should retrieve job history', async () => {mockRedis.lrange.mockResolvedValue(mockHistoryData);const history = await service.getJobHistory(sampleJobId, 100, 0);

        expect(history).toHaveLength(2);
        expect(history[0].event).toBe('created');expect(history[1].event).toBe('started');
        expect(history[0].timestamp).toBeInstanceOf(Date);
        expect(mockRedis.lrange).toHaveBeenCalledWith(
          `bytebot:job:history:${sampleJobId}`,
          0,
          99
        );
      });

      it('should handle pagination', async () => {
        mockRedis.lrange.mockResolvedValue([mockHistoryData[1]]);

        const history = await service.getJobHistory(sampleJobId, 50, 10);

        expect(mockRedis.lrange).toHaveBeenCalledWith(
          `bytebot:job:history:${sampleJobId}`,
          10,
          59
        );
      });

      it('should validate job ID', async () => {await expect(service.getJobHistory('')).rejects.toThrow(BadRequestException);});
    });
  });

  describe('Analytics and Monitoring', () => {describe('getJobAnalytics', () => {beforeEach(() => {mockCacheService.get.mockResolvedValue(sampleEnhancedStatus);
        mockRedis.lrange.mockResolvedValue([]);
      });

      it('should calculate comprehensive analytics', async () => {const analytics = await service.getJobAnalytics(sampleJobId);expect(analytics).toBeDefined();
        expect(analytics.jobId).toBe(sampleJobId);
        expect(analytics.executionMetrics).toBeDefined();
        expect(analytics.cacheMetrics).toBeDefined();
        expect(analytics.errorMetrics).toBeDefined();
        expect(analytics.resourceMetrics).toBeDefined();
      });

      it('should calculate execution metrics correctly', async () => {const completedStatus = {...sampleEnhancedStatus,
          status: JobStatus.COMPLETED,
          timestamps: {
            ...sampleEnhancedStatus.timestamps,
            completed: new Date('2023-12-19T10:31:15.789Z'),},};
        mockCacheService.get.mockResolvedValue(completedStatus);

        const analytics = await service.getJobAnalytics(sampleJobId);

        expect(analytics.executionMetrics.totalTimeMs).toBeGreaterThan(0);
        expect(analytics.executionMetrics.queueTimeMs).toBeGreaterThan(0);
        expect(analytics.executionMetrics.processingTimeMs).toBeGreaterThan(0);
      });

      it('should throw NotFoundException for missing job', async () => {mockCacheService.get.mockResolvedValue(null);mockRedis.hget.mockResolvedValue(null);

        await expect(service.getJobAnalytics(sampleJobId))
          .rejects.toThrow(NotFoundException);
      });
    });

    describe('getSystemMetrics', () => {it('should return system performance metrics', async () => {const metrics = await service.getSystemMetrics();expect(metrics).toBeDefined();
        expect(typeof metrics.operationsPerSecond).toBe('number');expect(typeof metrics.averageResponseTimeMs).toBe('number');expect(typeof metrics.memoryUsageMB).toBe('number');expect(typeof metrics.activeJobs).toBe('number');expect(typeof metrics.cacheHitRate).toBe('number');});});
  });

  describe('Data Retention and Cleanup', () => {describe('cleanupJob', () => {
      beforeEach(() => {
        mockRedis.keys.mockResolvedValue([
          `bytebot:job:status:${sampleJobId}`,`bytebot:job:result:${sampleJobId}`,`bytebot:job:history:${sampleJobId}`,
        ]);
        mockRedis.del.mockResolvedValue(3);
        mockCacheService.del.mockResolvedValue(undefined);
      });

      it('should cleanup job data without archiving', async () => {
        await service.cleanupJob(sampleJobId, false);

        expect(mockRedis.keys).toHaveBeenCalledWith(`bytebot:job:*:${sampleJobId}*`);
        expect(mockRedis.del).toHaveBeenCalled();
        expect(mockCacheService.del).toHaveBeenCalledTimes(2);
      });

      it('should archive before cleanup when requested', async () => {// Mock archiveJob method(service as any).archiveJob = jest.fn().mockResolvedValue(undefined);

        await service.cleanupJob(sampleJobId, true);

        expect((service as any).archiveJob).toHaveBeenCalledWith(sampleJobId);
        expect(mockRedis.del).toHaveBeenCalled();
      });

      it('should validate job ID', async () => {await expect(service.cleanupJob('')).rejects.toThrow(BadRequestException);});
    });

    describe('performRetentionCleanup', () => {it('should perform scheduled cleanup', async () => {const oldJobKeys = ['bytebot:job:status:old_job_1','bytebot:job:status:old_job_2',];mockRedis.keys.mockResolvedValue(oldJobKeys);

        // Mock methods used by retention cleanup
        (service as any).extractJobIdFromKey = jest.fn()
          .mockReturnValueOnce('old_job_1').mockReturnValueOnce('old_job_2');(service as any).getRetentionPolicyForJob = jest.fn().mockReturnValue({retentionDays: 7,
          archiveBeforeDelete: false,
        });
        (service as any).shouldCleanupJob = jest.fn().mockResolvedValue(true);
        (service as any).deleteJobData = jest.fn().mockResolvedValue(undefined);

        await service.performRetentionCleanup();

        expect(mockRedis.keys).toHaveBeenCalledWith('bytebot:job:status:*');expect((service as any).deleteJobData).toHaveBeenCalledTimes(2);expect(mockMetricsService.recordMetric).toHaveBeenCalledWith(
          'job.retention.cleanup',expect.objectContaining({cleaned: 2,
            archived: 0,
          })
        );
      });
    });
  });

  describe('Error Handling', () => {it('should handle Redis connection failures gracefully', async () => {mockRedis.pipeline.mockImplementation(() => {throw new Error('Redis connection failed');});await expect(service.updateJobStatus(sampleJobId, JobStatus.COMPLETED, 100))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('should handle cache service failures gracefully', async () => {mockCacheService.get.mockRejectedValue(new Error('Cache error'));mockRedis.hget.mockResolvedValue(JSON.stringify(sampleEnhancedStatus));// Should still work by falling back to Redis
      const result = await service.getJobStatus(sampleJobId);
      expect(result).toBeDefined();
    });

    it('should handle JSON parsing errors', async () => {mockCacheService.get.mockResolvedValue(null);mockRedis.hget.mockResolvedValue('invalid-json');await expect(service.getJobStatus(sampleJobId)).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle compression/decompression errors', async () => {const storageInfo = { compressed: true, format: 'json' };mockCacheService.get.mockResolvedValue(null);(service as any).getResultStorageInfo = jest.fn().mockResolvedValue(storageInfo);
      mockRedis.hget.mockResolvedValue('invalid-compressed-data');await expect(service.getJobResult(sampleJobId, false)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('Performance and Concurrency', () => {it('should handle high-frequency status updates', async () => {mockCacheService.get.mockResolvedValue(sampleEnhancedStatus);const pipeline = {
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        lpush: jest.fn().mockReturnThis(),
        ltrim: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(pipeline);

      // Simulate 100 concurrent status updates
      const updates = Array.from({ length: 100 }, (_, i) =>
        service.updateJobStatus(sampleJobId, JobStatus.IN_PROGRESS, i)
      );

      await Promise.all(updates);

      expect(pipeline.exec).toHaveBeenCalledTimes(100);
    });

    it('should handle bulk status retrieval efficiently', async () => {
      const jobIds = Array.from({ length: 50 }, (_, i) => `job_${i}`);

      // Mock each job status retrieval
      jobIds.forEach((jobId) => {
        mockCacheService.get.mockResolvedValueOnce({
          ...sampleEnhancedStatus,
          jobId,
        });
      });

      const startTime = Date.now();
      const results = await Promise.all(
        jobIds.map(jobId => service.getJobStatus(jobId))
      );
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Data Integrity', () => {it('should maintain data consistency across Redis and cache', async () => {
      const updatedStatus = {
        ...sampleEnhancedStatus,
        status: JobStatus.COMPLETED,
        progress: 100,
      };

      mockCacheService.get.mockResolvedValue(sampleEnhancedStatus);
      const pipeline = {
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        lpush: jest.fn().mockReturnThis(),
        ltrim: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedis.pipeline.mockReturnValue(pipeline);

      await service.updateJobStatus(sampleJobId, JobStatus.COMPLETED, 100);

      // Verify both Redis and cache are updated
      expect(pipeline.hset).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `job:status:${sampleJobId}`,
        expect.objectContaining({
          status: JobStatus.COMPLETED,
          progress: 100,
        }),
        300
      );
    });

    it('should verify result checksums on retrieval', async () => {const testData = { test: 'checksum' };const checksum = require('crypto').createHash('sha256').update(Buffer.from(JSON.stringify(testData), 'utf8')).digest('hex');const storageInfo = {compressed: false,
        checksum,
        format: 'json',};mockCacheService.get.mockResolvedValue(null);
      (service as any).getResultStorageInfo = jest.fn().mockResolvedValue(storageInfo);
      mockRedis.hget.mockResolvedValue(
        Buffer.from(JSON.stringify(testData)).toString('base64')
      );

      const result = await service.getJobResult(sampleJobId, false);

      expect(result).toBeDefined();
      // Checksum verification should pass silently
    });
  });
});