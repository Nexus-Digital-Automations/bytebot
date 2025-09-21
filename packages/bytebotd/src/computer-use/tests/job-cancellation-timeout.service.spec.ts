/**
 * Job Cancellation and Timeout Service Tests
 *
 * Comprehensive test suite for the JobCancellationTimeoutService covering
 * all cancellation strategies, timeout configurations, bulk operations,
 * and error handling scenarios.
 *
 * @author Claude Code - Job Management Enhancement Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  JobCancellationTimeoutService,
  CancellationStrategy,
  TimeoutEscalation,
  JobCancellationRequest,
  BulkCancellationRequest,
  TimeoutConfiguration,
} from '../services/job-cancellation-timeout.service';
import { AsyncJobService } from '../async-job.service';
import { EnhancedAsyncJobService } from '../enhanced-async-job.service';
import { JobStatus, JobPriority } from '../dto/async-job.dto';

describe('JobCancellationTimeoutService', () => {
  let service: JobCancellationTimeoutService;
  let asyncJobService: AsyncJobService;
  let enhancedAsyncJobService: EnhancedAsyncJobService;
  let eventEmitter: EventEmitter2;

  // Mock services
  const mockAsyncJobService = {
    cancelJob: jest.fn(),
    getJobStatus: jest.fn(),
  };

  const mockEnhancedAsyncJobService = {
    cancelJobsByCriteria: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobCancellationTimeoutService,
        {
          provide: AsyncJobService,
          useValue: mockAsyncJobService,
        },
        {
          provide: EnhancedAsyncJobService,
          useValue: mockEnhancedAsyncJobService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<JobCancellationTimeoutService>(JobCancellationTimeoutService);
    asyncJobService = module.get<AsyncJobService>(AsyncJobService);
    enhancedAsyncJobService = module.get<EnhancedAsyncJobService>(EnhancedAsyncJobService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with empty tracking maps', () => {
      const activeJobs = service.getActiveJobs();
      expect(activeJobs).toEqual([]);
    });

    it('should set up event listeners', () => {
      expect(mockEventEmitter.on).toHaveBeenCalledWith('job.completed', expect.any(Function));
      expect(mockEventEmitter.on).toHaveBeenCalledWith('job.failed', expect.any(Function));
    });
  });

  describe('Single Job Cancellation', () => {
    const testJobId = 'test_job_123';

    beforeEach(() => {
      mockAsyncJobService.getJobStatus.mockReturnValue({
        jobId: testJobId,
        status: JobStatus.IN_PROGRESS,
        progress: 50,
        submittedAt: new Date().toISOString(),
      });
    });

    describe('Graceful Cancellation', () => {
      it('should successfully cancel job with graceful strategy', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(true);

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test cancellation',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe(CancellationStrategy.GRACEFUL);
        expect(result.jobId).toBe(testJobId);
        expect(result.reason).toBe('Test cancellation');
        expect(mockAsyncJobService.cancelJob).toHaveBeenCalledWith(testJobId);
        expect(mockEventEmitter.emit).toHaveBeenCalledWith('job.cancellation.completed', expect.any(Object));
      });

      it('should handle graceful cancellation with cleanup', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(true);

        // Register active job with cleanup callbacks
        const cleanupCallback = jest.fn().mockResolvedValue(undefined);
        service.registerActiveJob(testJobId, undefined, [cleanupCallback]);

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test with cleanup',
          cleanup: true,
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.cleanup.resourcesReleased).toContain('cleanup_callback');
        expect(cleanupCallback).toHaveBeenCalled();
      });

      it('should handle abort controller in graceful cancellation', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(false);

        const abortController = new AbortController();
        const abortSpy = jest.spyOn(abortController, 'abort');

        service.registerActiveJob(testJobId, abortController);

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test abort controller',
          gracePeriodMs: 1000,
        };

        const result = await service.cancelJob(request);

        expect(abortSpy).toHaveBeenCalled();
        expect(result.actualStrategy).toBe(CancellationStrategy.GRACEFUL);
      });
    });

    describe('Immediate Cancellation', () => {
      it('should cancel job immediately', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(true);

        const abortController = new AbortController();
        const abortSpy = jest.spyOn(abortController, 'abort');

        service.registerActiveJob(testJobId, abortController);

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.IMMEDIATE,
          reason: 'Immediate cancellation test',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.actualStrategy).toBe(CancellationStrategy.IMMEDIATE);
        expect(abortSpy).toHaveBeenCalled();
        expect(mockAsyncJobService.cancelJob).toHaveBeenCalledWith(testJobId);
      });
    });

    describe('Forced Cancellation', () => {
      it('should force cancel job with all cleanup procedures', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(true);
        mockEnhancedAsyncJobService.cancelJobsByCriteria.mockResolvedValue({
          cancelled: [testJobId],
          failed: [],
        });

        const cleanupCallback = jest.fn().mockResolvedValue(undefined);
        const abortController = new AbortController();
        const abortSpy = jest.spyOn(abortController, 'abort');

        service.registerActiveJob(testJobId, abortController, [cleanupCallback]);

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.FORCED,
          reason: 'Force cancellation test',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.actualStrategy).toBe(CancellationStrategy.FORCED);
        expect(abortSpy).toHaveBeenCalled();
        expect(cleanupCallback).toHaveBeenCalled();
        expect(result.cleanup.resourcesReleased).toContain('cleanup_callback');
      });

      it('should handle enhanced service cancellation failure', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(true);
        mockEnhancedAsyncJobService.cancelJobsByCriteria.mockRejectedValue(new Error('Enhanced service error'));

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.FORCED,
          reason: 'Test enhanced service failure',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.actualStrategy).toBe(CancellationStrategy.FORCED);
        // Should not fail even if enhanced service fails
      });
    });

    describe('Escalated Cancellation', () => {
      it('should try graceful first, then escalate to forced', async () => {
        // Mock graceful cancellation to fail
        mockAsyncJobService.cancelJob.mockReturnValue(false);
        mockEnhancedAsyncJobService.cancelJobsByCriteria.mockResolvedValue({
          cancelled: [testJobId],
          failed: [],
        });

        // Mock job status to show it's still running after graceful attempt
        let callCount = 0;
        mockAsyncJobService.getJobStatus.mockImplementation(() => {
          callCount++;
          return {
            jobId: testJobId,
            status: callCount <= 20 ? JobStatus.IN_PROGRESS : JobStatus.CANCELLED, // Still running during wait period
            progress: 50,
            submittedAt: new Date().toISOString(),
          };
        });

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.ESCALATED,
          reason: 'Escalation test',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.actualStrategy).toBe(CancellationStrategy.FORCED);
      });

      it('should complete with graceful if job completes quickly', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(true);

        // Mock job to complete quickly
        let callCount = 0;
        mockAsyncJobService.getJobStatus.mockImplementation(() => {
          callCount++;
          return {
            jobId: testJobId,
            status: callCount <= 2 ? JobStatus.IN_PROGRESS : JobStatus.COMPLETED,
            progress: callCount <= 2 ? 50 : 100,
            submittedAt: new Date().toISOString(),
          };
        });

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.ESCALATED,
          reason: 'Quick completion test',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.actualStrategy).toBe(CancellationStrategy.GRACEFUL);
      });
    });

    describe('Error Handling', () => {
      it('should handle job not found error', async () => {
        mockAsyncJobService.getJobStatus.mockImplementation(() => {
          throw new Error('Job not found: ' + testJobId);
        });

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test job not found',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(false);
        expect(result.cleanup.errors).toContain(expect.stringContaining('Job not found'));
      });

      it('should handle already completed job', async () => {
        mockAsyncJobService.getJobStatus.mockReturnValue({
          jobId: testJobId,
          status: JobStatus.COMPLETED,
          progress: 100,
          submittedAt: new Date().toISOString(),
        });

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test completed job',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(false);
        expect(result.cleanup.errors).toContain(expect.stringContaining('Cannot cancel job in completed state'));
      });

      it('should handle already cancelled job', async () => {
        mockAsyncJobService.getJobStatus.mockReturnValue({
          jobId: testJobId,
          status: JobStatus.CANCELLED,
          progress: 0,
          submittedAt: new Date().toISOString(),
        });

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test already cancelled job',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.duration).toBeGreaterThanOrEqual(0);
      });

      it('should handle cleanup callback failures', async () => {
        mockAsyncJobService.cancelJob.mockReturnValue(true);

        const failingCallback = jest.fn().mockRejectedValue(new Error('Cleanup failed'));
        service.registerActiveJob(testJobId, undefined, [failingCallback]);

        const request: JobCancellationRequest = {
          jobId: testJobId,
          strategy: CancellationStrategy.FORCED,
          reason: 'Test cleanup failure',
        };

        const result = await service.cancelJob(request);

        expect(result.success).toBe(true);
        expect(result.cleanup.errors).toContain(expect.stringContaining('Cleanup failed'));
        expect(failingCallback).toHaveBeenCalled();
      });
    });
  });

  describe('Bulk Job Cancellation', () => {
    const testJobIds = ['job1', 'job2', 'job3', 'job4', 'job5'];

    beforeEach(() => {
      // Register some active jobs
      testJobIds.forEach((jobId, index) => {
        service.registerActiveJob(jobId);
      });
    });

    it('should cancel multiple jobs based on criteria', async () => {
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const request: BulkCancellationRequest = {
        criteria: {
          status: [JobStatus.PENDING, JobStatus.IN_PROGRESS],
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Bulk cancellation test',
        maxJobs: 3,
      };

      const result = await service.cancelJobsBulk(request);

      expect(result.attempted).toBeLessThanOrEqual(3);
      expect(result.successful).toBeGreaterThan(0);
      expect(result.cancelled.length).toBe(result.successful);
      expect(result.dryRun).toBe(false);
    });

    it('should perform dry run without actual cancellation', async () => {
      const request: BulkCancellationRequest = {
        criteria: {
          status: [JobStatus.PENDING, JobStatus.IN_PROGRESS],
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Dry run test',
        dryRun: true,
      };

      const result = await service.cancelJobsBulk(request);

      expect(result.dryRun).toBe(true);
      expect(result.attempted).toBeGreaterThan(0);
      expect(result.cancelled).toEqual([]);
      expect(mockAsyncJobService.cancelJob).not.toHaveBeenCalled();
    });

    it('should handle time-based criteria', async () => {
      const oldDate = new Date(Date.now() - 10000); // 10 seconds ago
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const request: BulkCancellationRequest = {
        criteria: {
          olderThan: oldDate,
          longerThan: 5000, // 5 seconds
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Time-based cancellation test',
      };

      const result = await service.cancelJobsBulk(request);

      expect(result.totalMatched).toBeGreaterThanOrEqual(0);
      expect(result.requestId).toMatch(/^bulk_/);
    });

    it('should handle partial failures in bulk cancellation', async () => {
      // Mock some cancellations to fail
      mockAsyncJobService.cancelJob.mockImplementation((jobId: string) => {
        return !jobId.includes('job2'); // job2 will fail
      });

      const request: BulkCancellationRequest = {
        criteria: {
          status: [JobStatus.PENDING, JobStatus.IN_PROGRESS],
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Partial failure test',
      };

      const result = await service.cancelJobsBulk(request);

      expect(result.failed).toBeGreaterThan(0);
      expect(result.failures.length).toBe(result.failed);
      expect(result.successful + result.failed).toBe(result.attempted);
    });

    it('should respect maxJobs limit', async () => {
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const request: BulkCancellationRequest = {
        criteria: {
          status: [JobStatus.PENDING, JobStatus.IN_PROGRESS],
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Max jobs limit test',
        maxJobs: 2,
      };

      const result = await service.cancelJobsBulk(request);

      expect(result.attempted).toBeLessThanOrEqual(2);
    });
  });

  describe('Timeout Configuration', () => {
    const testJobId = 'timeout_test_job';

    it('should configure timeout for a job', async () => {
      const config: TimeoutConfiguration = {
        jobId: testJobId,
        softTimeoutMs: 30000,
        hardTimeoutMs: 60000,
        escalationSteps: [
          {
            delayMs: 25000,
            action: TimeoutEscalation.WARNING,
          },
          {
            delayMs: 50000,
            action: TimeoutEscalation.GRACEFUL_CANCEL,
          },
        ],
      };

      await expect(service.configureJobTimeout(config)).resolves.toBeUndefined();
    });

    it('should set up timeout monitoring for active job', async () => {
      const config: TimeoutConfiguration = {
        jobId: testJobId,
        softTimeoutMs: 1000,
        hardTimeoutMs: 2000,
        escalationSteps: [
          {
            delayMs: 500,
            action: TimeoutEscalation.WARNING,
          },
        ],
      };

      service.registerActiveJob(testJobId);
      await service.configureJobTimeout(config);

      // Verify timeout is configured (implementation detail)
      const activeJobs = service.getActiveJobs();
      const job = activeJobs.find(j => j.jobId === testJobId);
      expect(job).toBeDefined();
      expect(job?.hasTimeout).toBe(true);
    });
  });

  describe('Active Job Tracking', () => {
    const testJobId = 'active_job_test';

    it('should register and track active jobs', () => {
      const abortController = new AbortController();
      const cleanupCallback = jest.fn();

      service.registerActiveJob(testJobId, abortController, [cleanupCallback]);

      const activeJobs = service.getActiveJobs();
      expect(activeJobs).toHaveLength(1);
      expect(activeJobs[0].jobId).toBe(testJobId);
      expect(activeJobs[0].startedAt).toBeInstanceOf(Date);
    });

    it('should unregister active jobs', () => {
      service.registerActiveJob(testJobId);

      let activeJobs = service.getActiveJobs();
      expect(activeJobs).toHaveLength(1);

      service.unregisterActiveJob(testJobId);

      activeJobs = service.getActiveJobs();
      expect(activeJobs).toHaveLength(0);
    });

    it('should handle multiple active jobs', () => {
      const jobIds = ['job1', 'job2', 'job3'];

      jobIds.forEach(jobId => {
        service.registerActiveJob(jobId);
      });

      const activeJobs = service.getActiveJobs();
      expect(activeJobs).toHaveLength(3);

      const trackedJobIds = activeJobs.map(job => job.jobId);
      expect(trackedJobIds).toEqual(expect.arrayContaining(jobIds));
    });
  });

  describe('Emergency Shutdown', () => {
    beforeEach(() => {
      // Register some active jobs
      service.registerActiveJob('emergency_job_1');
      service.registerActiveJob('emergency_job_2');
      service.registerActiveJob('emergency_job_3');
    });

    it('should perform emergency shutdown', async () => {
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const result = await service.emergencyShutdown('System maintenance');

      expect(result.requestId).toMatch(/^bulk_/);
      expect(result.attempted).toBeGreaterThan(0);
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should use forced cancellation strategy for emergency shutdown', async () => {
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const result = await service.emergencyShutdown('Critical error');

      // Verify that forced cancellation was used
      expect(result.cancelled.every(c =>
        c.strategy === CancellationStrategy.FORCED ||
        c.actualStrategy === CancellationStrategy.FORCED
      )).toBe(true);
    });
  });

  describe('Cancellation History', () => {
    const testJobId = 'history_test_job';

    it('should store and retrieve cancellation history', async () => {
      mockAsyncJobService.getJobStatus.mockReturnValue({
        jobId: testJobId,
        status: JobStatus.IN_PROGRESS,
        progress: 50,
        submittedAt: new Date().toISOString(),
      });
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const request: JobCancellationRequest = {
        jobId: testJobId,
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'History test',
      };

      await service.cancelJob(request);

      const history = service.getCancellationHistory(testJobId);
      expect(history).toBeDefined();
      expect(history?.jobId).toBe(testJobId);
      expect(history?.reason).toBe('History test');
      expect(history?.strategy).toBe(CancellationStrategy.GRACEFUL);
    });

    it('should return undefined for non-existent cancellation history', () => {
      const history = service.getCancellationHistory('non_existent_job');
      expect(history).toBeUndefined();
    });
  });

  describe('Event Handling', () => {
    const testJobId = 'event_test_job';

    it('should emit cancellation completion event', async () => {
      mockAsyncJobService.getJobStatus.mockReturnValue({
        jobId: testJobId,
        status: JobStatus.IN_PROGRESS,
        progress: 50,
        submittedAt: new Date().toISOString(),
      });
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const request: JobCancellationRequest = {
        jobId: testJobId,
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Event test',
      };

      await service.cancelJob(request);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'job.cancellation.completed',
        expect.objectContaining({
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Event test',
          success: true,
        })
      );
    });

    it('should handle job completion events to unregister tracking', () => {
      service.registerActiveJob(testJobId);

      let activeJobs = service.getActiveJobs();
      expect(activeJobs).toHaveLength(1);

      // Simulate job completion event
      const completionHandler = mockEventEmitter.on.mock.calls
        .find(call => call[0] === 'job.completed')?.[1];

      if (completionHandler) {
        completionHandler({ jobId: testJobId });
      }

      // Job should be unregistered
      activeJobs = service.getActiveJobs();
      expect(activeJobs).toHaveLength(0);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle rapid successive cancellation requests', async () => {
      const testJobId = 'rapid_cancel_test';
      mockAsyncJobService.getJobStatus.mockReturnValue({
        jobId: testJobId,
        status: JobStatus.IN_PROGRESS,
        progress: 50,
        submittedAt: new Date().toISOString(),
      });
      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const request: JobCancellationRequest = {
        jobId: testJobId,
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Rapid test',
      };

      // Submit multiple cancellation requests rapidly
      const promises = Array.from({ length: 5 }, () => service.cancelJob(request));
      const results = await Promise.all(promises);

      // All should succeed or handle the already-cancelled state
      results.forEach(result => {
        expect(result.jobId).toBe(testJobId);
        expect(typeof result.success).toBe('boolean');
      });
    });

    it('should handle large bulk cancellation requests', async () => {
      // Register many active jobs
      const jobIds = Array.from({ length: 100 }, (_, i) => `bulk_job_${i}`);
      jobIds.forEach(jobId => service.registerActiveJob(jobId));

      mockAsyncJobService.cancelJob.mockReturnValue(true);

      const request: BulkCancellationRequest = {
        criteria: {
          status: [JobStatus.PENDING, JobStatus.IN_PROGRESS],
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Large bulk test',
      };

      const result = await service.cancelJobsBulk(request);

      expect(result.attempted).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.requestId).toBeDefined();
    });

    it('should handle invalid job IDs gracefully', async () => {
      const invalidJobIds = ['', null, undefined, 'invalid_job'];

      for (const jobId of invalidJobIds) {
        if (jobId === '' || jobId) { // Skip null/undefined for TypeScript
          const request: JobCancellationRequest = {
            jobId: jobId as string,
            strategy: CancellationStrategy.GRACEFUL,
            reason: 'Invalid job ID test',
          };

          const result = await service.cancelJob(request);
          expect(typeof result.success).toBe('boolean');
        }
      }
    });
  });
});