/**
 * Enhanced Async Job Service - Comprehensive Test Suite
 *
 * Tests for enterprise-grade Redis-integrated job management functionality including:
 * - Enhanced job submission with Redis persistence
 * - Job recovery across service restarts
 * - Bulk job operations and high-throughput scenarios
 * - Fallback to memory-only mode during Redis failures
 * - Performance monitoring and alerting
 * - Integration with existing AsyncJobService API
 *
 * @author Claude Code - Redis Job Persistence Architect
 * @version 2.0.0
 * @created 2025-09-20
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  EnhancedAsyncJobService,
  EnhancedJobStats,
} from './enhanced-async-job.service';
import {
  RedisJobPersistenceService,
  RedisJobData,
  BulkJobOperationResult,
  CacheOperationResult,
} from './redis-job-persistence.service';
import {
  JobStatus,
  JobPriority,
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
} from '../dto/async-job.dto';
import { ComputerActionDto } from '../dto/computer-action.dto';
import { ComputerUseService } from '../computer-use.service';
import { CacheService } from '../../cache/cache.service';
import { MetricsService } from '../../metrics/metrics.service';

// ===== TEST HELPERS AND MOCKS =====

/**
 * Mock Computer Use Service for testing
 */
class MockComputerUseService {
  private executionLatency = 100; // 100ms simulated execution time
  private failureRate = 0; // 0% failure rate by default

  async action(action: ComputerActionDto): Promise<unknown> {
    await this.simulateExecution();

    if (Math.random() < this.failureRate) {
      throw new Error(`Mock execution failure for action: ${action.action}`);
    }

    return {
      success: true,
      action: action.action,
      timestamp: new Date().toISOString(),
      result: `Executed ${action.action} successfully`,
    };
  }

  setExecutionLatency(latency: number): void {
    this.executionLatency = latency;
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate));
  }

  private async simulateExecution(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.executionLatency));
  }
}

/**
 * Mock Cache Service for testing
 */
class MockCacheService {
  private cache = new Map<string, any>();

  async get(key: string, options?: any): Promise<unknown> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: unknown, options?: any): Promise<void> {
    this.cache.set(key, value);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Mock Metrics Service for testing
 */
class MockMetricsService {
  private metrics: Array<{
    action: string;
    executionTime: number;
    success: boolean;
    retryCount: number;
    priority: JobPriority;
  }> = [];

  recordJobExecution(
    action: string,
    executionTime: number,
    success: boolean,
    retryCount: number,
    priority: JobPriority,
  ): void {
    this.metrics.push({ action, executionTime, success, retryCount, priority });
  }

  getMetrics() {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

/**
 * Mock Redis Job Persistence Service for testing
 */
class MockRedisJobPersistenceService {
  private storage = new Map<string, RedisJobData>();
  private operationLatency = 10; // 10ms simulated latency
  private healthy = true;
  private operationCount = 0;

  async saveJob(jobData: RedisJobData): Promise<CacheOperationResult<void>> {
    await this.simulateLatency();
    this.operationCount++;

    if (!this.healthy) {
      return {
        success: false,
        error: 'Redis persistence is unhealthy',
        metadata: {
          latency: this.operationLatency,
          fromCache: false,
          compressed: false,
          retryCount: 0,
        },
      };
    }

    this.storage.set(jobData.jobId, { ...jobData });

    return {
      success: true,
      metadata: {
        latency: this.operationLatency,
        fromCache: false,
        compressed: (jobData.originalSize || 0) > 1024,
        retryCount: 0,
      },
    };
  }

  async loadJob(jobId: string): Promise<CacheOperationResult<RedisJobData>> {
    await this.simulateLatency();
    this.operationCount++;

    if (!this.healthy) {
      return {
        success: false,
        error: 'Redis persistence is unhealthy',
        metadata: {
          latency: this.operationLatency,
          fromCache: false,
          compressed: false,
          retryCount: 0,
        },
      } as CacheOperationResult<RedisJobData>;
    }

    const jobData = this.storage.get(jobId);

    return {
      success: true,
      data: jobData,
      metadata: {
        latency: this.operationLatency,
        fromCache: !!jobData,
        compressed: false,
        retryCount: 0,
      },
    };
  }

  async deleteJob(jobId: string): Promise<CacheOperationResult<void>> {
    await this.simulateLatency();
    this.operationCount++;

    this.storage.delete(jobId);

    return {
      success: this.healthy,
      error: this.healthy ? undefined : 'Redis persistence is unhealthy',
      metadata: {
        latency: this.operationLatency,
        fromCache: false,
        compressed: false,
        retryCount: 0,
      },
    };
  }

  async queryJobs(): Promise<CacheOperationResult<RedisJobData[]>> {
    await this.simulateLatency();
    this.operationCount++;

    if (!this.healthy) {
      return {
        success: false,
        error: 'Redis persistence is unhealthy',
        data: [],
        metadata: {
          latency: this.operationLatency,
          fromCache: false,
          compressed: false,
          retryCount: 0,
        },
      };
    }

    const jobs = Array.from(this.storage.values());
    return {
      success: true,
      data: jobs,
      metadata: {
        latency: this.operationLatency,
        fromCache: true,
        compressed: false,
        retryCount: 0,
      },
    };
  }

  async bulkSaveJobs(jobs: RedisJobData[]): Promise<BulkJobOperationResult> {
    await this.simulateLatency();
    this.operationCount += jobs.length;

    if (!this.healthy) {
      return {
        success: false,
        processedCount: jobs.length,
        successCount: 0,
        failureCount: jobs.length,
        errors: jobs.map(job => ({ jobId: job.jobId, error: 'Redis persistence is unhealthy' })),
        latency: this.operationLatency,
        metadata: {
          operationType: 'BULK_SAVE',
          batchSize: jobs.length,
          compressionUsed: false,
          nodeDistribution: {},
        },
      };
    }

    for (const job of jobs) {
      this.storage.set(job.jobId, { ...job });
    }

    return {
      success: true,
      processedCount: jobs.length,
      successCount: jobs.length,
      failureCount: 0,
      errors: [],
      latency: this.operationLatency,
      metadata: {
        operationType: 'BULK_SAVE',
        batchSize: jobs.length,
        compressionUsed: jobs.some(job => (job.originalSize || 0) > 1024),
        nodeDistribution: { 'node_0': jobs.length },
      },
    };
  }

  getMetrics() {
    return {
      healthy: this.healthy,
      metrics: {
        operations: {
          total: this.operationCount,
          saves: Math.floor(this.operationCount * 0.4),
          loads: Math.floor(this.operationCount * 0.4),
          deletes: Math.floor(this.operationCount * 0.1),
          queries: Math.floor(this.operationCount * 0.1),
          cleanup: 0,
        },
        performance: {
          avgLatency: this.operationLatency,
          p95Latency: this.operationLatency * 1.2,
          p99Latency: this.operationLatency * 1.5,
          throughput: 100,
        },
        storage: {
          totalJobs: this.storage.size,
          compressedJobs: 0,
          compressionRatio: 0,
          storageUtilization: 50,
        },
        health: {
          uptime: 60000,
          errorRate: this.healthy ? 0 : 50,
          recoveryCount: 0,
        },
      },
      recommendations: [],
      alerts: [],
    };
  }

  // Test utilities
  setHealthy(healthy: boolean): void {
    this.healthy = healthy;
  }

  setOperationLatency(latency: number): void {
    this.operationLatency = latency;
  }

  getStorageSize(): number {
    return this.storage.size;
  }

  clearStorage(): void {
    this.storage.clear();
    this.operationCount = 0;
  }

  simulateRecoveryJobs(count: number): void {
    for (let i = 0; i < count; i++) {
      const jobId = `recovery_job_${i}`;
      const now = new Date();

      const jobData: RedisJobData = {
        jobId,
        status: i % 2 === 0 ? JobStatus.PENDING : JobStatus.IN_PROGRESS,
        priority: JobPriority.NORMAL,
        action: { action: 'screenshot', parameters: {} } as ComputerActionDto,
        progress: i % 2 === 0 ? 0 : 50,
        submittedAt: now,
        startedAt: i % 2 === 0 ? undefined : now,
        timeout: 30000,
        useCache: false,
        retryCount: 0,
        maxRetries: 3,
        userId: `user_${i}`,
        indexKeys: [],
        ttlSeconds: 86400,
        createdAt: now,
        updatedAt: now,
        version: 1,
        originalSize: 256,
      };

      this.storage.set(jobId, jobData);
    }
  }

  private async simulateLatency(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.operationLatency));
  }
}

/**
 * Create test configuration
 */
function createTestConfig(): any {
  return {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        ENHANCED_JOB_PERSISTENCE_ENABLED: true,
        ENHANCED_JOB_FALLBACK_TO_MEMORY: true,
        ENHANCED_JOB_RECOVERY_ON_STARTUP: true,
        ENHANCED_JOB_HEARTBEAT_INTERVAL: 30000,
        ENHANCED_JOB_RECOVERY_TIMEOUT: 10000,
        ENHANCED_JOB_BULK_BATCH_SIZE: 100,
        ENHANCED_JOB_MONITORING_ENABLED: true,
        ENHANCED_JOB_MONITORING_INTERVAL: 300000,
        ENHANCED_JOB_ALERT_PERSISTENCE_LATENCY: 25,
        ENHANCED_JOB_ALERT_ERROR_RATE: 5,
        ENHANCED_JOB_ALERT_RECOVERY_TIME: 10000,
      };
      return config[key] || defaultValue;
    }),
  };
}

/**
 * Create test computer action
 */
function createTestAction(action: string = 'screenshot'): ComputerActionDto {
  return {
    action,
    parameters: { format: 'png', quality: 'high' },
  } as ComputerActionDto;
}

// ===== TEST SUITE =====

describe('EnhancedAsyncJobService', () => {
  let service: EnhancedAsyncJobService;
  let mockComputerUse: MockComputerUseService;
  let mockCache: MockCacheService;
  let mockMetrics: MockMetricsService;
  let mockRedisPersistence: MockRedisJobPersistenceService;
  let mockConfigService: any;

  beforeEach(async () => {
    mockComputerUse = new MockComputerUseService();
    mockCache = new MockCacheService();
    mockMetrics = new MockMetricsService();
    mockRedisPersistence = new MockRedisJobPersistenceService();
    mockConfigService = createTestConfig();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedAsyncJobService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ComputerUseService,
          useValue: mockComputerUse,
        },
        {
          provide: CacheService,
          useValue: mockCache,
        },
        {
          provide: MetricsService,
          useValue: mockMetrics,
        },
        {
          provide: RedisJobPersistenceService,
          useValue: mockRedisPersistence,
        },
      ],
    }).compile();

    service = module.get<EnhancedAsyncJobService>(EnhancedAsyncJobService);

    // Suppress logs during testing
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    mockCache.clearCache();
    mockMetrics.clearMetrics();
    mockRedisPersistence.clearStorage();
    jest.clearAllMocks();
  });

  // ===== ENHANCED JOB SUBMISSION =====

  describe('Enhanced Job Submission', () => {
    it('should submit job with Redis persistence enabled', async () => {
      const action = createTestAction();
      const options = {
        priority: JobPriority.HIGH,
        metadata: { userId: 'test_user' },
        userId: 'test_user',
        sessionId: 'test_session',
      };

      const response = await service.submitJob(action, options);

      expect(response.jobId).toBeDefined();
      expect(response.status).toBe(JobStatus.PENDING);
      expect(response.submittedAt).toBeDefined();

      // Verify job is persisted to Redis
      expect(mockRedisPersistence.getStorageSize()).toBe(1);
    });

    it('should submit job with fallback to memory when Redis fails', async () => {
      mockRedisPersistence.setHealthy(false);

      const action = createTestAction();
      const response = await service.submitJob(action);

      expect(response.jobId).toBeDefined();
      expect(response.status).toBe(JobStatus.PENDING);

      // Job should still be submitted even with Redis failure
      const jobStatus = service.getJobStatus(response.jobId);
      expect(jobStatus.jobId).toBe(response.jobId);
    });

    it('should handle cached results with enhanced metadata', async () => {
      const action = createTestAction();
      const cachedResult = { cached: true, data: 'test' };

      // Pre-populate cache
      const cacheKey = `action${Buffer.from(JSON.stringify(action)).toString('base64').substring(0, 32)}`;
      await mockCache.set(cacheKey, cachedResult);

      const response = await service.submitJob(action, { useCache: true });

      expect(response.status).toBe(JobStatus.COMPLETED);

      const jobStatus = service.getJobStatus(response.jobId);
      expect(jobStatus.metadata?.cacheHit).toBe(true);
      expect(jobStatus.metadata?.persistenceEnabled).toBe(true);
    });

    it('should maintain backwards compatibility with submitAction', async () => {
      const action = createTestAction();
      const response = await service.submitAction(action);

      expect(response.jobId).toBeDefined();
      expect(response.status).toBe(JobStatus.PENDING);
    });
  });

  // ===== JOB EXECUTION WITH PERSISTENCE =====

  describe('Job Execution with Persistence', () => {
    it('should execute job and persist status updates', async () => {
      const action = createTestAction();
      const response = await service.submitJob(action);

      // Wait for job execution
      await new Promise(resolve => setTimeout(resolve, 200));

      const jobResult = service.getJobResult(response.jobId);
      expect(jobResult.status).toBe(JobStatus.COMPLETED);
      expect(jobResult.metadata?.persistenceEnabled).toBe(true);
      expect(jobResult.metadata?.persistenceHealthy).toBe(true);
    });

    it('should handle job retries with persistence', async () => {
      mockComputerUse.setFailureRate(0.8); // 80% failure rate

      const action = createTestAction();
      const response = await service.submitJob(action, { timeout: 50 });

      // Wait for retries and eventual completion/failure
      await new Promise(resolve => setTimeout(resolve, 500));

      const jobStatus = service.getJobStatus(response.jobId);
      expect([JobStatus.COMPLETED, JobStatus.FAILED]).toContain(jobStatus.status);

      if (jobStatus.status === JobStatus.COMPLETED) {
        expect(jobStatus.metadata?.retryCount).toBeGreaterThan(0);
      }
    });

    it('should persist job cancellation', async () => {
      const action = createTestAction();
      const response = await service.submitJob(action);

      const cancelled = service.cancelJob(response.jobId);
      expect(cancelled).toBe(true);

      const jobStatus = service.getJobStatus(response.jobId);
      expect(jobStatus.status).toBe(JobStatus.CANCELLED);
    });
  });

  // ===== BULK OPERATIONS =====

  describe('Bulk Operations', () => {
    it('should submit bulk jobs successfully', async () => {
      const actions = Array.from({ length: 10 }, (_, i) => ({
        action: createTestAction(`action_${i}`),
        options: {
          priority: i % 2 === 0 ? JobPriority.HIGH : JobPriority.NORMAL,
          metadata: { index: i },
          userId: `user_${i % 3}`,
        },
      }));

      const result = await service.submitBulkJobs(actions);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(10);
      expect(result.successCount).toBe(10);
      expect(result.failureCount).toBe(0);
      expect(result.latency).toBeGreaterThan(0);

      // Verify all jobs are persisted
      expect(mockRedisPersistence.getStorageSize()).toBe(10);
    });

    it('should handle bulk job submission with Redis failure', async () => {
      mockRedisPersistence.setHealthy(false);

      const actions = Array.from({ length: 5 }, (_, i) => ({
        action: createTestAction(`action_${i}`),
      }));

      const result = await service.submitBulkJobs(actions);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(5);
      expect(result.successCount).toBe(5);

      // Jobs should still be created in memory
      const stats = service.getJobStats();
      expect(stats.totalJobs).toBe(5);
    });

    it('should reject bulk operations exceeding batch size', async () => {
      const actions = Array.from({ length: 150 }, (_, i) => ({
        action: createTestAction(`action_${i}`),
      }));

      const result = await service.submitBulkJobs(actions);

      expect(result.success).toBe(false);
      expect(result.errors[0].error).toContain('exceeds maximum');
    });
  });

  // ===== JOB RECOVERY =====

  describe('Job Recovery', () => {
    it('should recover jobs from Redis on service restart', async () => {
      // Simulate persisted jobs from previous session
      mockRedisPersistence.simulateRecoveryJobs(5);

      // Initialize service (this would trigger recovery)
      await service.onModuleInit();

      const health = service.getServiceHealth();
      expect(health.recoveredJobs).toBe(5);
      expect(health.memoryJobs).toBeGreaterThanOrEqual(5);
    });

    it('should handle recovery when Redis is unhealthy', async () => {
      mockRedisPersistence.setHealthy(false);

      // Should not throw error during recovery
      await expect(service.onModuleInit()).resolves.not.toThrow();

      const health = service.getServiceHealth();
      expect(health.persistenceHealthy).toBe(false);
      expect(health.healthy).toBe(true); // Should still be healthy due to fallback
    });

    it('should continue processing recovered jobs', async () => {
      // Simulate pending jobs from previous session
      mockRedisPersistence.simulateRecoveryJobs(3);
      await service.onModuleInit();

      // Wait for jobs to process
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = service.getJobStats();
      expect(stats.completedJobs).toBeGreaterThan(0);
    });
  });

  // ===== ENHANCED QUERYING =====

  describe('Enhanced Querying', () => {
    beforeEach(async () => {
      // Submit test jobs with different users and statuses
      await service.submitJob(createTestAction(), { userId: 'user1' });
      await service.submitJob(createTestAction(), { userId: 'user1' });
      await service.submitJob(createTestAction(), { userId: 'user2' });
    });

    it('should query jobs by user ID', async () => {
      const jobs = await service.getJobsByUser('user1');

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should query jobs with status filter', async () => {
      const jobs = await service.getJobsByUser('user1', { status: JobStatus.PENDING });

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should query jobs with limit', async () => {
      const jobs = await service.getJobsByUser('user1', { limit: 1 });

      expect(jobs).toBeDefined();
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should throw error when querying with Redis disabled', async () => {
      mockRedisPersistence.setHealthy(false);

      await expect(service.queryJobs()).rejects.toThrow('Redis persistence');
    });
  });

  // ===== ENHANCED STATISTICS =====

  describe('Enhanced Statistics', () => {
    it('should provide enhanced job statistics', async () => {
      // Submit and execute some jobs
      const actions = Array.from({ length: 5 }, (_, i) => createTestAction(`action_${i}`));

      for (const action of actions) {
        await service.submitJob(action);
      }

      // Wait for some jobs to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const stats: EnhancedJobStats = service.getJobStats();

      expect(stats.totalJobs).toBe(5);
      expect(stats.persistedJobs).toBeGreaterThanOrEqual(0);
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(stats.averagePersistenceTime).toBeGreaterThanOrEqual(0);
      expect(stats.redisHealthy).toBe(true);
      expect(stats.compressionRate).toBeGreaterThanOrEqual(0);
    });

    it('should track Redis health in statistics', async () => {
      mockRedisPersistence.setHealthy(false);

      const stats = service.getJobStats();
      expect(stats.redisHealthy).toBe(false);
    });
  });

  // ===== SERVICE HEALTH MONITORING =====

  describe('Service Health Monitoring', () => {
    it('should provide comprehensive service health status', async () => {
      const health = service.getServiceHealth();

      expect(health.healthy).toBe(true);
      expect(health.memoryJobs).toBeGreaterThanOrEqual(0);
      expect(health.queueLength).toBeGreaterThanOrEqual(0);
      expect(health.activeJobs).toBeGreaterThanOrEqual(0);
      expect(health.persistenceEnabled).toBe(true);
      expect(health.persistenceHealthy).toBe(true);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.stats).toBeDefined();
    });

    it('should reflect Redis health in service health', async () => {
      mockRedisPersistence.setHealthy(false);

      const health = service.getServiceHealth();
      expect(health.persistenceHealthy).toBe(false);
      expect(health.healthy).toBe(true); // Should still be healthy due to fallback
    });

    it('should track service uptime', async () => {
      await new Promise(resolve => setTimeout(resolve, 100));

      const health = service.getServiceHealth();
      expect(health.uptime).toBeGreaterThan(50);
    });
  });

  // ===== ERROR HANDLING AND FALLBACK =====

  describe('Error Handling and Fallback', () => {
    it('should gracefully handle Redis connection failures', async () => {
      mockRedisPersistence.setHealthy(false);

      const action = createTestAction();

      // Should not throw error
      await expect(service.submitJob(action)).resolves.toBeDefined();

      const response = await service.submitJob(action);
      const jobStatus = service.getJobStatus(response.jobId);

      expect(jobStatus.metadata?.persistenceHealthy).toBe(false);
    });

    it('should continue operation in memory-only mode', async () => {
      mockRedisPersistence.setHealthy(false);

      const actions = Array.from({ length: 3 }, (_, i) => createTestAction(`action_${i}`));

      for (const action of actions) {
        await service.submitJob(action);
      }

      // Wait for job execution
      await new Promise(resolve => setTimeout(resolve, 200));

      const stats = service.getJobStats();
      expect(stats.totalJobs).toBe(3);
      expect(stats.completedJobs).toBeGreaterThan(0);
    });

    it('should handle persistence latency spikes gracefully', async () => {
      mockRedisPersistence.setOperationLatency(100); // High latency

      const action = createTestAction();
      const startTime = Date.now();

      const response = await service.submitJob(action);
      const submitLatency = Date.now() - startTime;

      expect(response.jobId).toBeDefined();
      // Should not be blocked by persistence latency
      expect(submitLatency).toBeLessThan(50);
    });
  });

  // ===== PERFORMANCE CHARACTERISTICS =====

  describe('Performance Characteristics', () => {
    it('should handle high-throughput job submission', async () => {
      const jobCount = 50;
      const startTime = Date.now();

      const promises = Array.from({ length: jobCount }, (_, i) =>
        service.submitJob(createTestAction(`perf_action_${i}`))
      );

      const responses = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const throughput = (jobCount / totalTime) * 1000; // jobs/sec

      expect(responses).toHaveLength(jobCount);
      expect(responses.every(r => r.jobId)).toBe(true);
      expect(throughput).toBeGreaterThan(100); // Should handle 100+ jobs/sec
    });

    it('should maintain performance with Redis persistence', async () => {
      const jobCount = 20;
      const startTime = Date.now();

      for (let i = 0; i < jobCount; i++) {
        await service.submitJob(createTestAction(`perf_${i}`));
      }

      const submitTime = Date.now() - startTime;
      const avgSubmitTime = submitTime / jobCount;

      expect(avgSubmitTime).toBeLessThan(50); // Should be under 50ms per job
    });

    it('should handle memory usage efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Submit many jobs
      for (let i = 0; i < 100; i++) {
        await service.submitJob(createTestAction(`memory_test_${i}`), {
          metadata: { data: 'x'.repeat(1000) }, // 1KB metadata per job
        });
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryPerJob = memoryIncrease / 100;

      // Memory usage should be reasonable
      expect(memoryPerJob).toBeLessThan(50000); // Less than 50KB per job
    });
  });

  // ===== INTEGRATION SCENARIOS =====

  describe('Integration Scenarios', () => {
    it('should handle complete job lifecycle with persistence', async () => {
      const action = createTestAction();
      const options = {
        priority: JobPriority.HIGH,
        metadata: { testCase: 'lifecycle' },
        userId: 'lifecycle_user',
        sessionId: 'lifecycle_session',
      };

      // Submit job
      const response = await service.submitJob(action, options);
      expect(response.status).toBe(JobStatus.PENDING);

      // Check initial status
      let jobStatus = service.getJobStatus(response.jobId);
      expect(jobStatus.status).toBe(JobStatus.PENDING);
      expect(jobStatus.metadata?.persistenceEnabled).toBe(true);

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check final status
      jobStatus = service.getJobStatus(response.jobId);
      expect(jobStatus.status).toBe(JobStatus.COMPLETED);

      // Get result
      const jobResult = service.getJobResult(response.jobId);
      expect(jobResult.status).toBe(JobStatus.COMPLETED);
      expect(jobResult.result).toBeDefined();
      expect(jobResult.metadata?.persistenceHealthy).toBe(true);
    });

    it('should handle service restart with job recovery', async () => {
      // Submit initial jobs
      for (let i = 0; i < 3; i++) {
        await service.submitJob(createTestAction(`initial_${i}`));
      }

      // Simulate service restart by adding recovery jobs
      mockRedisPersistence.simulateRecoveryJobs(2);

      // Re-initialize service
      await service.onModuleInit();

      const health = service.getServiceHealth();
      expect(health.recoveredJobs).toBe(2);
      expect(health.memoryJobs).toBeGreaterThanOrEqual(5);
    });

    it('should handle mixed persistence success/failure scenarios', async () => {
      const actions = Array.from({ length: 5 }, (_, i) => createTestAction(`mixed_${i}`));

      // Submit first batch with healthy Redis
      for (let i = 0; i < 2; i++) {
        await service.submitJob(actions[i]);
      }

      // Simulate Redis failure
      mockRedisPersistence.setHealthy(false);

      // Submit remaining jobs with failed Redis
      for (let i = 2; i < 5; i++) {
        await service.submitJob(actions[i]);
      }

      // Wait for execution
      await new Promise(resolve => setTimeout(resolve, 300));

      const stats = service.getJobStats();
      expect(stats.totalJobs).toBe(5);

      // All jobs should be executed regardless of persistence issues
      expect(stats.completedJobs + stats.failedJobs).toBeGreaterThan(0);
    });
  });

  // ===== EDGE CASES =====

  describe('Edge Cases', () => {
    it('should handle very large job metadata', async () => {
      const largeMetadata = {
        data: Array.from({ length: 1000 }, (_, i) => `item_${i}`),
        description: 'x'.repeat(10000),
      };

      const action = createTestAction();
      const response = await service.submitJob(action, { metadata: largeMetadata });

      expect(response.jobId).toBeDefined();

      const jobStatus = service.getJobStatus(response.jobId);
      expect(jobStatus.metadata).toMatchObject(largeMetadata);
    });

    it('should handle special characters in job data', async () => {
      const action = createTestAction();
      const options = {
        metadata: {
          description: 'Special chars: 你好 🚀 émoji',
          unicode: '\u2603\u2764\uFE0F',
        },
        userId: 'user_unicode_🚀',
      };

      const response = await service.submitJob(action, options);
      expect(response.jobId).toBeDefined();

      const jobStatus = service.getJobStatus(response.jobId);
      expect(jobStatus.metadata?.description).toBe('Special chars: 你好 🚀 émoji');
    });

    it('should handle concurrent job operations', async () => {
      const concurrentJobs = 20;
      const promises: Promise<any>[] = [];

      // Submit jobs concurrently
      for (let i = 0; i < concurrentJobs; i++) {
        promises.push(service.submitJob(createTestAction(`concurrent_${i}`)));
      }

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(concurrentJobs);
      expect(responses.every(r => r.jobId)).toBe(true);

      // Verify all jobs are unique
      const jobIds = responses.map(r => r.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(concurrentJobs);
    });

    it('should handle service shutdown gracefully', async () => {
      // Submit jobs
      for (let i = 0; i < 3; i++) {
        await service.submitJob(createTestAction(`shutdown_${i}`));
      }

      // Should not throw during shutdown
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});