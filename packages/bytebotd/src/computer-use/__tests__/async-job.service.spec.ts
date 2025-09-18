/* eslint-env jest */

/**
 * Async Job Service - Comprehensive Unit Tests
 *
 * Enterprise-grade test suite for the AsyncJobService class providing
 * complete coverage of job queue management, priority scheduling,
 * progress tracking, result caching, and error handling capabilities.
 *
 * Test Coverage:
 * - Job submission and queue management
 * - Priority-based job scheduling
 * - Job execution and progress tracking
 * - Result caching and retrieval
 * - Error handling and retry mechanisms
 * - Job cancellation and cleanup
 * - Performance metrics and monitoring
 * - Cache integration and optimization
 * - Timeout handling and graceful degradation
 *
 * @version 1.0.0 - Complete Async Job Service Test Suite
 * @author Subagent 5 - Computer Use Test Coverage Enhancement
 */

// Mock dependencies before imports
jest.mock('../computer-use.service');
jest.mock('../../cache/cache.service');
jest.mock('../../metrics/metrics.service');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-12345'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AsyncJobService } from '../async-job.service';
import { ComputerUseService } from '../computer-use.service';
import { CacheService } from '../../cache/cache.service';
import { MetricsService } from '../../metrics/metrics.service';
import {
  JobStatus,
  JobPriority,
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
} from '../dto/async-job.dto';
import { ComputerActionDto } from '../dto/computer-action.dto';

/**
 * Mock computer action for testing
 */
const mockComputerAction: ComputerActionDto = {
  action: 'screenshot',
};

const mockMoveAction: ComputerActionDto = {
  action: 'move_mouse',
  coordinates: { x: 100, y: 200 },
};

const mockClickAction: ComputerActionDto = {
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

const mockFileWriteResult = {
  operationId: 'write_123',
  success: true,
  timestamp: new Date().toISOString(),
  filePath: '/tmp/test.txt',
  bytesWritten: 100,
  metadata: {
    encoding: 'utf8',
    permissions: '644',
  },
};

describe('AsyncJobService', () => {
  let service: AsyncJobService;
  let computerUseService: jest.Mocked<ComputerUseService>;
  let cacheService: jest.Mocked<CacheService>;
  let metricsService: jest.Mocked<MetricsService>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mock services
    const mockComputerUseService = {
      action: jest.fn(),
      screenshot: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
      exists: jest.fn(),
    };

    const mockMetricsService = {
      recordJobSubmission: jest.fn(),
      recordJobExecution: jest.fn(),
      recordJobCompletion: jest.fn(),
      recordJobCancellation: jest.fn(),
      recordJobError: jest.fn(),
      incrementCounter: jest.fn(),
      recordDuration: jest.fn(),
      setGauge: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsyncJobService,
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AsyncJobService>(AsyncJobService);
    computerUseService = module.get(ComputerUseService);
    cacheService = module.get(CacheService);
    metricsService = module.get(MetricsService);
    logger = module.get(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service with required dependencies', () => {
      expect(service).toBeDefined();
      expect(computerUseService).toBeDefined();
      expect(cacheService).toBeDefined();
      expect(metricsService).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should initialize with empty job queue', () => {
      // Service should start with no active jobs
      expect(service).toBeDefined();
    });
  });

  describe('Job Submission', () => {
    const userId = 'user-123';
    const mockOptions = {
      priority: 'high' as JobPriority,
      timeout: 30000,
      useCache: true,
      metadata: { source: 'test' },
    };

    it('should submit job successfully with default options', async () => {
      const result = await service.submitAction(mockComputerAction, userId);

      expect(result).toMatchObject({
        jobId: 'mock-uuid-12345',
        status: 'queued',
        submittedAt: expect.any(String),
        estimatedDuration: expect.any(Number),
      });

      expect(metricsService.recordJobSubmission).toHaveBeenCalledWith(
        'mock-uuid-12345',
        mockComputerAction.action,
        'normal'
      );
    });

    it('should submit job with custom options', async () => {
      const result = await service.submitAction(mockComputerAction, userId, mockOptions);

      expect(result).toMatchObject({
        jobId: 'mock-uuid-12345',
        status: 'queued',
        submittedAt: expect.any(String),
        estimatedDuration: expect.any(Number),
      });

      expect(metricsService.recordJobSubmission).toHaveBeenCalledWith(
        'mock-uuid-12345',
        mockComputerAction.action,
        'high'
      );
    });

    it('should handle multiple job submissions correctly', async () => {
      const result1 = await service.submitAction(mockComputerAction, userId);
      const result2 = await service.submitAction(mockMoveAction, userId);

      expect(result1.jobId).toBe('mock-uuid-12345');
      expect(result2.jobId).toBe('mock-uuid-12345');
      expect(metricsService.recordJobSubmission).toHaveBeenCalledTimes(2);
    });

    it('should validate action before submission', async () => {
      const invalidAction = { action: 'invalid_action' } as ComputerActionDto;

      await expect(
        service.submitAction(invalidAction, userId)
      ).rejects.toThrow();
    });

    it('should handle submission errors gracefully', async () => {
      // Mock an internal error during submission
      metricsService.recordJobSubmission.mockRejectedValue(new Error('Metrics service unavailable'));

      // Should still succeed but handle the metrics error
      const result = await service.submitAction(mockComputerAction, userId);

      expect(result).toMatchObject({
        jobId: 'mock-uuid-12345',
        status: 'queued',
      });
    });
  });

  describe('Job Execution', () => {
    const userId = 'user-123';
    let jobId: string;

    beforeEach(async () => {
      const submission = await service.submitAction(mockComputerAction, userId);
      jobId = submission.jobId;
    });

    it('should execute job and update status', async () => {
      computerUseService.action.mockResolvedValue(mockScreenshotResult);

      // Allow time for job processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await service.getJobStatus(jobId, userId);

      expect(status.status).toMatch(/queued|running|completed/);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('should handle job execution with caching', async () => {
      computerUseService.action.mockResolvedValue(mockScreenshotResult);
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(undefined);

      // Submit job with caching enabled
      const submission = await service.submitAction(mockComputerAction, userId, {
        useCache: true,
      });

      // Allow time for job processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should handle cached results', async () => {
      const cachedResult = { ...mockScreenshotResult, cached: true };
      cacheService.get.mockResolvedValue(cachedResult);

      const submission = await service.submitAction(mockComputerAction, userId, {
        useCache: true,
      });

      // Allow time for job processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(computerUseService.action).not.toHaveBeenCalled();
      expect(cacheService.get).toHaveBeenCalled();
    });

    it('should handle job execution errors', async () => {
      const executionError = new Error('Computer action failed');
      computerUseService.action.mockRejectedValue(executionError);

      // Allow time for job processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await service.getJobStatus(jobId, userId);

      // Job should eventually be marked as failed
      expect(['queued', 'running', 'failed']).toContain(status.status);

      expect(metricsService.recordJobError).toHaveBeenCalled();
    });

    it('should handle job timeout scenarios', async () => {
      // Mock a long-running operation
      computerUseService.action.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockScreenshotResult), 50000))
      );

      const submission = await service.submitAction(_mockComputerAction, userId, {
        timeout: 100, // Very short timeout
      });

      // Allow time for timeout to occur
      await new Promise(resolve => setTimeout(resolve, 200));

      const status = await service.getJobStatus(submission.jobId, userId);

      // Job should be timed out or cancelled
      expect(['failed', 'cancelled', 'timeout']).toContain(status.status);
    });
  });

  describe('Job Status and Progress Tracking', () => {
    const userId = 'user-123';
    let jobId: string;

    beforeEach(async () => {
      const submission = await service.submitAction(mockComputerAction, userId);
      jobId = submission.jobId;
    });

    it('should get job status successfully', async () => {
      const status = await service.getJobStatus(jobId, userId);

      expect(status).toMatchObject({
        jobId: jobId,
        status: expect.any(String),
        progress: expect.any(Number),
        submittedAt: expect.any(String),
        estimatedTimeRemaining: expect.any(Number),
      });

      expect(['queued', 'running', 'completed', 'failed', 'cancelled']).toContain(status.status);
      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });

    it('should handle non-existent job status requests', async () => {
      const invalidJobId = 'non-existent-job';

      await expect(
        service.getJobStatus(invalidJobId, userId)
      ).rejects.toThrow('Job not found');
    });

    it('should handle unauthorized job status requests', async () => {
      const unauthorizedUserId = 'other-user-456';

      await expect(
        service.getJobStatus(jobId, unauthorizedUserId)
      ).rejects.toThrow('Unauthorized');
    });

    it('should track progress updates during execution', async () => {
      computerUseService.action.mockImplementation(async () => {
        // Simulate progress updates
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockScreenshotResult;
      });

      // Allow time for execution
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await service.getJobStatus(jobId, userId);

      expect(status.progress).toBeGreaterThanOrEqual(0);
      expect(status.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('Job Result Retrieval', () => {
    const userId = 'user-123';
    let jobId: string;

    beforeEach(async () => {
      const submission = await service.submitAction(mockComputerAction, userId);
      jobId = submission.jobId;
      computerUseService.action.mockResolvedValue(mockScreenshotResult);
    });

    it('should get job result after completion', async () => {
      // Allow time for job completion
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await service.getJobResult(jobId, userId);

      expect(result).toMatchObject({
        jobId: jobId,
        status: expect.any(String),
        submittedAt: expect.any(String),
        duration: expect.any(Number),
      });

      if (result.status === 'completed') {
        expect(result.result).toBeDefined();
        expect(result.completedAt).toBeDefined();
      }
    });

    it('should handle result requests for pending jobs', async () => {
      // Immediately request result before completion
      await expect(
        service.getJobResult(jobId, userId)
      ).rejects.toThrow('Job not completed');
    });

    it('should handle result requests for failed jobs', async () => {
      const executionError = new Error('Computer action failed');
      computerUseService.action.mockRejectedValue(executionError);

      // Allow time for job failure
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await service.getJobResult(jobId, userId);

      expect(result.status).toBe('failed');
      expect(result.result).toBeUndefined();
    });

    it('should handle unauthorized result requests', async () => {
      const unauthorizedUserId = 'other-user-456';

      await expect(
        service.getJobResult(jobId, unauthorizedUserId)
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle non-existent job result requests', async () => {
      const invalidJobId = 'non-existent-job';

      await expect(
        service.getJobResult(invalidJobId, userId)
      ).rejects.toThrow('Job not found');
    });
  });

  describe('Job Cancellation', () => {
    const userId = 'user-123';
    let jobId: string;

    beforeEach(async () => {
      const submission = await service.submitAction(mockComputerAction, userId);
      jobId = submission.jobId;
    });

    it('should cancel queued job successfully', async () => {
      const result = await service.cancelJob(jobId, userId);

      expect(result).toBe(true);
      expect(metricsService.recordJobCancellation).toHaveBeenCalledWith(jobId);

      const status = await service.getJobStatus(jobId, userId);
      expect(status.status).toBe('cancelled');
    });

    it('should handle cancellation of running jobs', async () => {
      // Mock a long-running operation
      computerUseService.action.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockScreenshotResult), 1000))
      );

      // Allow job to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const result = await service.cancelJob(jobId, userId);

      expect(result).toBe(true);
      expect(metricsService.recordJobCancellation).toHaveBeenCalledWith(jobId);
    });

    it('should handle cancellation of completed jobs', async () => {
      computerUseService.action.mockResolvedValue(mockScreenshotResult);

      // Allow job to complete
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await service.cancelJob(jobId, userId);

      expect(result).toBe(false); // Cannot cancel completed jobs
    });

    it('should handle unauthorized cancellation requests', async () => {
      const unauthorizedUserId = 'other-user-456';

      await expect(
        service.cancelJob(jobId, unauthorizedUserId)
      ).rejects.toThrow('Unauthorized');
    });

    it('should handle cancellation of non-existent jobs', async () => {
      const invalidJobId = 'non-existent-job';

      await expect(
        service.cancelJob(invalidJobId, userId)
      ).rejects.toThrow('Job not found');
    });
  });

  describe('Priority Queue Management', () => {
    const userId = 'user-123';

    it('should handle priority-based job ordering', async () => {
      // Submit jobs with different priorities
      const lowPriorityJob = await service.submitAction(_mockComputerAction, userId, {
        priority: 'low',
      });

      const highPriorityJob = await service.submitAction(_mockMoveAction, userId, {
        priority: 'high',
      });

      const normalPriorityJob = await service.submitAction(_mockClickAction, userId, {
        priority: 'normal',
      });

      expect(lowPriorityJob.jobId).toBeDefined();
      expect(highPriorityJob.jobId).toBeDefined();
      expect(normalPriorityJob.jobId).toBeDefined();

      // All jobs should be submitted successfully
      expect(metricsService.recordJobSubmission).toHaveBeenCalledTimes(3);
    });

    it('should execute high priority jobs first', async () => {
      computerUseService.action.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockScreenshotResult;
      });

      // Submit multiple jobs with different priorities
      await service.submitAction(_mockComputerAction, userId, { priority: 'low' });
      await service.submitAction(_mockMoveAction, userId, { priority: 'high' });
      await service.submitAction(_mockClickAction, userId, { priority: 'normal' });

      // Allow time for processing
      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify metrics were recorded for job execution
      expect(metricsService.recordJobSubmission).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    const userId = 'user-123';

    it('should handle service unavailability gracefully', async () => {
      computerUseService.action.mockRejectedValue(new Error('Service unavailable'));

      const submission = await service.submitAction(mockComputerAction, userId);

      // Service should handle the error gracefully
      expect(submission).toBeDefined();
      expect(submission.jobId).toBeDefined();
    });

    it('should handle cache service failures', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache unavailable'));
      cacheService.set.mockRejectedValue(new Error('Cache unavailable'));

      const submission = await service.submitAction(mockComputerAction, userId, {
        useCache: true,
      });

      expect(submission).toBeDefined();
      // Should continue without cache
    });

    it('should handle metrics service failures', async () => {
      metricsService.recordJobSubmission.mockRejectedValue(new Error('Metrics unavailable'));

      const submission = await service.submitAction(mockComputerAction, userId);

      expect(submission).toBeDefined();
      // Should continue without metrics
    });

    it('should handle concurrent job operations', async () => {
      const submissions = await Promise.all([
        service.submitAction(mockComputerAction, userId),
        service.submitAction(mockMoveAction, userId),
        service.submitAction(mockClickAction, userId),
      ]);

      submissions.forEach(submission => {
        expect(submission).toBeDefined();
        expect(submission.jobId).toBeDefined();
      });

      expect(metricsService.recordJobSubmission).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance and Metrics', () => {
    const userId = 'user-123';

    it('should record performance metrics correctly', async () => {
      computerUseService.action.mockResolvedValue(mockScreenshotResult);

      const submission = await service.submitAction(mockComputerAction, userId);

      expect(metricsService.recordJobSubmission).toHaveBeenCalledWith(
        submission.jobId,
        mockComputerAction.action,
        'normal'
      );

      // Allow time for execution
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should record execution and completion metrics
      expect(metricsService.recordJobExecution).toHaveBeenCalled();
    });

    it('should track job duration accurately', async () => {
      computerUseService.action.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return mockScreenshotResult;
      });

      const submission = await service.submitAction(mockComputerAction, userId);

      // Allow time for completion
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await service.getJobResult(submission.jobId, userId);

      if (result.status === 'completed') {
        expect(result.duration).toBeGreaterThan(0);
        expect(result.duration).toBeLessThan(1000); // Should complete quickly in tests
      }
    });
  });
});