/**
 * Job Cancellation Controller Tests
 *
 * Comprehensive test suite for the JobCancellationController covering
 * all REST API endpoints, request validation, error handling, and
 * response formatting for job cancellation and timeout management.
 *
 * @author Claude Code - Job Management Enhancement Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  JobCancellationController,
  CancelJobDto,
  BulkCancelJobsDto,
  TimeoutConfigurationDto,
  EmergencyShutdownDto,
} from '../controllers/job-cancellation-controller';
import {
  JobCancellationTimeoutService,
  CancellationStrategy,
  TimeoutEscalation,
  CancellationResult,
  BulkCancellationResult,
} from '../services/job-cancellation-timeout.service';
import { JobStatus, JobPriority } from '../dto/async-job.dto';

describe('JobCancellationController', () => {
  let controller: JobCancellationController;
  let cancellationService: JobCancellationTimeoutService;

  // Mock service
  const mockCancellationService = {
    cancelJob: jest.fn(),
    cancelJobsBulk: jest.fn(),
    configureJobTimeout: jest.fn(),
    getCancellationHistory: jest.fn(),
    getActiveJobs: jest.fn(),
    emergencyShutdown: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobCancellationController],
      providers: [
        {
          provide: JobCancellationTimeoutService,
          useValue: mockCancellationService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true }) // Mock throttler guard
      .compile();

    controller = module.get<JobCancellationController>(JobCancellationController);
    cancellationService = module.get<JobCancellationTimeoutService>(JobCancellationTimeoutService);

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have cancellation service injected', () => {
      expect(cancellationService).toBeDefined();
    });
  });

  describe('POST /:jobId/cancel - Cancel Single Job', () => {
    const testJobId = 'test_job_123';

    it('should successfully cancel a job with default options', async () => {
      const mockResult: CancellationResult = {
        jobId: testJobId,
        success: true,
        strategy: CancellationStrategy.GRACEFUL,
        actualStrategy: CancellationStrategy.GRACEFUL,
        cancelledAt: new Date(),
        duration: 250,
        reason: 'User requested cancellation',
        cleanup: {
          resourcesReleased: ['memory_buffer'],
          dependentsNotified: 1,
          errors: [],
        },
      };

      mockCancellationService.cancelJob.mockResolvedValue(mockResult);

      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'User requested cancellation',
      };

      const result = await controller.cancelJob(testJobId, cancelRequest);

      expect(result).toEqual(mockResult);
      expect(mockCancellationService.cancelJob).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: testJobId,
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'User requested cancellation',
          metadata: expect.objectContaining({
            requestedAt: expect.any(String),
            userAgent: 'JobCancellationController',
          }),
        })
      );
    });

    it('should handle custom cancellation options', async () => {
      const mockResult: CancellationResult = {
        jobId: testJobId,
        success: true,
        strategy: CancellationStrategy.FORCED,
        actualStrategy: CancellationStrategy.FORCED,
        cancelledAt: new Date(),
        duration: 100,
        reason: 'Emergency cancellation',
        cleanup: {
          resourcesReleased: ['memory_buffer', 'file_handles'],
          dependentsNotified: 0,
          errors: [],
        },
      };

      mockCancellationService.cancelJob.mockResolvedValue(mockResult);

      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.FORCED,
        reason: 'Emergency cancellation',
        gracePeriodMs: 1000,
        cleanup: true,
        notifyDependents: false,
        metadata: { priority: 'urgent' },
      };

      const result = await controller.cancelJob(testJobId, cancelRequest);

      expect(result).toEqual(mockResult);
      expect(mockCancellationService.cancelJob).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: testJobId,
          strategy: CancellationStrategy.FORCED,
          reason: 'Emergency cancellation',
          gracePeriodMs: 1000,
          cleanup: true,
          notifyDependents: false,
          metadata: expect.objectContaining({
            priority: 'urgent',
            requestedAt: expect.any(String),
          }),
        })
      );
    });

    it('should throw BadRequestException for empty job ID', async () => {
      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
      };

      await expect(controller.cancelJob('', cancelRequest)).rejects.toThrow(BadRequestException);
      await expect(controller.cancelJob('   ', cancelRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid cancellation strategy', async () => {
      const cancelRequest = {
        strategy: 'invalid_strategy' as CancellationStrategy,
        reason: 'Test reason',
      };

      await expect(controller.cancelJob(testJobId, cancelRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when job is not found', async () => {
      mockCancellationService.cancelJob.mockRejectedValue(new Error('Job not found: ' + testJobId));

      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
      };

      await expect(controller.cancelJob(testJobId, cancelRequest)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for other cancellation errors', async () => {
      mockCancellationService.cancelJob.mockRejectedValue(new Error('Cancellation failed: invalid state'));

      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
      };

      await expect(controller.cancelJob(testJobId, cancelRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle service success with cleanup errors', async () => {
      const mockResult: CancellationResult = {
        jobId: testJobId,
        success: true,
        strategy: CancellationStrategy.GRACEFUL,
        actualStrategy: CancellationStrategy.GRACEFUL,
        cancelledAt: new Date(),
        duration: 300,
        reason: 'Test with cleanup errors',
        cleanup: {
          resourcesReleased: ['memory_buffer'],
          dependentsNotified: 1,
          errors: ['Failed to release file handle'],
        },
      };

      mockCancellationService.cancelJob.mockResolvedValue(mockResult);

      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test with cleanup errors',
      };

      const result = await controller.cancelJob(testJobId, cancelRequest);

      expect(result).toEqual(mockResult);
      expect(result.cleanup.errors).toContain('Failed to release file handle');
    });
  });

  describe('POST /bulk-cancel - Bulk Job Cancellation', () => {
    it('should successfully cancel multiple jobs', async () => {
      const mockResult: BulkCancellationResult = {
        requestId: 'bulk_123',
        criteria: { status: [JobStatus.PENDING] },
        totalMatched: 5,
        attempted: 5,
        successful: 4,
        failed: 1,
        cancelled: [
          {
            jobId: 'job1',
            success: true,
            strategy: CancellationStrategy.GRACEFUL,
            actualStrategy: CancellationStrategy.GRACEFUL,
            cancelledAt: new Date(),
            duration: 150,
            reason: 'Bulk cancellation',
            cleanup: { resourcesReleased: [], dependentsNotified: 0, errors: [] },
          },
        ],
        failures: [
          { jobId: 'job2', error: 'Job not found' },
        ],
        duration: 1200,
        dryRun: false,
      };

      mockCancellationService.cancelJobsBulk.mockResolvedValue(mockResult);

      const bulkRequest: BulkCancelJobsDto = {
        criteria: { status: [JobStatus.PENDING] },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Bulk cancellation',
      };

      const result = await controller.cancelJobsBulk(bulkRequest);

      expect(result).toEqual(mockResult);
      expect(mockCancellationService.cancelJobsBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          criteria: { status: [JobStatus.PENDING] },
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Bulk cancellation',
        })
      );
    });

    it('should handle dry run mode', async () => {
      const mockResult: BulkCancellationResult = {
        requestId: 'bulk_dry_run_456',
        criteria: { batchId: 'test_batch' },
        totalMatched: 10,
        attempted: 10,
        successful: 0,
        failed: 0,
        cancelled: [],
        failures: [],
        duration: 50,
        dryRun: true,
      };

      mockCancellationService.cancelJobsBulk.mockResolvedValue(mockResult);

      const bulkRequest: BulkCancelJobsDto = {
        criteria: { batchId: 'test_batch' },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Dry run test',
        dryRun: true,
      };

      const result = await controller.cancelJobsBulk(bulkRequest);

      expect(result.dryRun).toBe(true);
      expect(result.cancelled).toEqual([]);
      expect(mockCancellationService.cancelJobsBulk).toHaveBeenCalledWith(
        expect.objectContaining({ dryRun: true })
      );
    });

    it('should handle time-based criteria with date string conversion', async () => {
      const mockResult: BulkCancellationResult = {
        requestId: 'bulk_time_789',
        criteria: { olderThan: new Date('2023-12-31T12:00:00.000Z') },
        totalMatched: 3,
        attempted: 3,
        successful: 3,
        failed: 0,
        cancelled: [],
        failures: [],
        duration: 800,
        dryRun: false,
      };

      mockCancellationService.cancelJobsBulk.mockResolvedValue(mockResult);

      const bulkRequest: BulkCancelJobsDto = {
        criteria: {
          olderThan: '2023-12-31T12:00:00.000Z',
          longerThan: 300000,
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Time-based cleanup',
      };

      await controller.cancelJobsBulk(bulkRequest);

      expect(mockCancellationService.cancelJobsBulk).toHaveBeenCalledWith(
        expect.objectContaining({
          criteria: expect.objectContaining({
            olderThan: new Date('2023-12-31T12:00:00.000Z'),
            longerThan: 300000,
          }),
        })
      );
    });

    it('should throw BadRequestException for invalid strategy', async () => {
      const bulkRequest = {
        criteria: { status: [JobStatus.PENDING] },
        strategy: 'invalid_strategy' as CancellationStrategy,
        reason: 'Test reason',
      };

      await expect(controller.cancelJobsBulk(bulkRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid maxJobs', async () => {
      const bulkRequest: BulkCancelJobsDto = {
        criteria: { status: [JobStatus.PENDING] },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
        maxJobs: 0,
      };

      await expect(controller.cancelJobsBulk(bulkRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative longerThan', async () => {
      const bulkRequest: BulkCancelJobsDto = {
        criteria: {
          status: [JobStatus.PENDING],
          longerThan: -1000,
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
      };

      await expect(controller.cancelJobsBulk(bulkRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid date format', async () => {
      const bulkRequest: BulkCancelJobsDto = {
        criteria: {
          status: [JobStatus.PENDING],
          olderThan: 'invalid-date-format',
        },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
      };

      await expect(controller.cancelJobsBulk(bulkRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors', async () => {
      mockCancellationService.cancelJobsBulk.mockRejectedValue(new Error('Service error'));

      const bulkRequest: BulkCancelJobsDto = {
        criteria: { status: [JobStatus.PENDING] },
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
      };

      await expect(controller.cancelJobsBulk(bulkRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /:jobId/timeout-config - Configure Job Timeout', () => {
    const testJobId = 'timeout_test_job';

    it('should successfully configure job timeout', async () => {
      mockCancellationService.configureJobTimeout.mockResolvedValue(undefined);

      const timeoutConfig: TimeoutConfigurationDto = {
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

      const result = await controller.configureJobTimeout(testJobId, timeoutConfig);

      expect(result).toEqual({
        message: 'Timeout configuration applied successfully',
        jobId: testJobId,
        configured: true,
      });

      expect(mockCancellationService.configureJobTimeout).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: testJobId,
          softTimeoutMs: 30000,
          hardTimeoutMs: 60000,
          escalationSteps: expect.arrayContaining([
            expect.objectContaining({
              delayMs: 25000,
              action: TimeoutEscalation.WARNING,
            }),
          ]),
        })
      );
    });

    it('should throw BadRequestException for empty job ID', async () => {
      const timeoutConfig: TimeoutConfigurationDto = {
        softTimeoutMs: 30000,
        hardTimeoutMs: 60000,
        escalationSteps: [],
      };

      await expect(controller.configureJobTimeout('', timeoutConfig)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-positive timeout values', async () => {
      const invalidConfigs = [
        {
          softTimeoutMs: 0,
          hardTimeoutMs: 60000,
          escalationSteps: [{ delayMs: 1000, action: TimeoutEscalation.WARNING }],
        },
        {
          softTimeoutMs: -1000,
          hardTimeoutMs: 60000,
          escalationSteps: [{ delayMs: 1000, action: TimeoutEscalation.WARNING }],
        },
        {
          softTimeoutMs: 30000,
          hardTimeoutMs: 0,
          escalationSteps: [{ delayMs: 1000, action: TimeoutEscalation.WARNING }],
        },
      ];

      for (const config of invalidConfigs) {
        await expect(controller.configureJobTimeout(testJobId, config)).rejects.toThrow(BadRequestException);
      }
    });

    it('should throw BadRequestException when soft timeout >= hard timeout', async () => {
      const timeoutConfig: TimeoutConfigurationDto = {
        softTimeoutMs: 60000,
        hardTimeoutMs: 60000, // Equal to soft timeout
        escalationSteps: [{ delayMs: 1000, action: TimeoutEscalation.WARNING }],
      };

      await expect(controller.configureJobTimeout(testJobId, timeoutConfig)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty escalation steps', async () => {
      const timeoutConfig: TimeoutConfigurationDto = {
        softTimeoutMs: 30000,
        hardTimeoutMs: 60000,
        escalationSteps: [],
      };

      await expect(controller.configureJobTimeout(testJobId, timeoutConfig)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid escalation step delays', async () => {
      const timeoutConfig: TimeoutConfigurationDto = {
        softTimeoutMs: 30000,
        hardTimeoutMs: 60000,
        escalationSteps: [
          {
            delayMs: 0, // Invalid
            action: TimeoutEscalation.WARNING,
          },
        ],
      };

      await expect(controller.configureJobTimeout(testJobId, timeoutConfig)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid escalation actions', async () => {
      const timeoutConfig = {
        softTimeoutMs: 30000,
        hardTimeoutMs: 60000,
        escalationSteps: [
          {
            delayMs: 1000,
            action: 'invalid_action' as TimeoutEscalation,
          },
        ],
      };

      await expect(controller.configureJobTimeout(testJobId, timeoutConfig)).rejects.toThrow(BadRequestException);
    });

    it('should handle service configuration errors', async () => {
      mockCancellationService.configureJobTimeout.mockRejectedValue(new Error('Configuration failed'));

      const timeoutConfig: TimeoutConfigurationDto = {
        softTimeoutMs: 30000,
        hardTimeoutMs: 60000,
        escalationSteps: [{ delayMs: 1000, action: TimeoutEscalation.WARNING }],
      };

      await expect(controller.configureJobTimeout(testJobId, timeoutConfig)).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /:jobId/cancellation-history - Get Cancellation History', () => {
    const testJobId = 'history_test_job';

    it('should return cancellation history for existing job', async () => {
      const mockHistory: CancellationResult = {
        jobId: testJobId,
        success: true,
        strategy: CancellationStrategy.GRACEFUL,
        actualStrategy: CancellationStrategy.GRACEFUL,
        cancelledAt: new Date(),
        duration: 250,
        reason: 'User requested',
        cleanup: {
          resourcesReleased: ['memory_buffer'],
          dependentsNotified: 1,
          errors: [],
        },
      };

      mockCancellationService.getCancellationHistory.mockReturnValue(mockHistory);

      const result = await controller.getCancellationHistory(testJobId);

      expect(result).toEqual(mockHistory);
      expect(mockCancellationService.getCancellationHistory).toHaveBeenCalledWith(testJobId);
    });

    it('should throw NotFoundException when no history exists', async () => {
      mockCancellationService.getCancellationHistory.mockReturnValue(undefined);

      await expect(controller.getCancellationHistory(testJobId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for empty job ID', async () => {
      await expect(controller.getCancellationHistory('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /active-jobs - Get Active Jobs', () => {
    it('should return list of active jobs', async () => {
      const mockActiveJobs = [
        {
          jobId: 'job1',
          startedAt: new Date(),
          hasTimeout: true,
        },
        {
          jobId: 'job2',
          startedAt: new Date(),
          hasTimeout: false,
        },
      ];

      mockCancellationService.getActiveJobs.mockReturnValue(mockActiveJobs);

      const result = await controller.getActiveJobs();

      expect(result).toEqual(mockActiveJobs);
      expect(mockCancellationService.getActiveJobs).toHaveBeenCalled();
    });

    it('should return empty array when no active jobs', async () => {
      mockCancellationService.getActiveJobs.mockReturnValue([]);

      const result = await controller.getActiveJobs();

      expect(result).toEqual([]);
    });
  });

  describe('POST /emergency-shutdown - Emergency Shutdown', () => {
    it('should perform emergency shutdown with valid reason', async () => {
      const mockResult: BulkCancellationResult = {
        requestId: 'emergency_123',
        criteria: { status: [JobStatus.PENDING, JobStatus.IN_PROGRESS] },
        totalMatched: 10,
        attempted: 10,
        successful: 9,
        failed: 1,
        cancelled: [],
        failures: [{ jobId: 'stubborn_job', error: 'Could not terminate' }],
        duration: 2500,
        dryRun: false,
      };

      mockCancellationService.emergencyShutdown.mockResolvedValue(mockResult);

      const shutdownRequest: EmergencyShutdownDto = {
        reason: 'System maintenance required',
      };

      const result = await controller.emergencyShutdown(shutdownRequest);

      expect(result).toEqual(mockResult);
      expect(mockCancellationService.emergencyShutdown).toHaveBeenCalledWith('System maintenance required');
    });

    it('should handle emergency shutdown with confirmation code', async () => {
      const mockResult: BulkCancellationResult = {
        requestId: 'emergency_456',
        criteria: { status: [JobStatus.PENDING, JobStatus.IN_PROGRESS] },
        totalMatched: 5,
        attempted: 5,
        successful: 5,
        failed: 0,
        cancelled: [],
        failures: [],
        duration: 1200,
        dryRun: false,
      };

      mockCancellationService.emergencyShutdown.mockResolvedValue(mockResult);

      const shutdownRequest: EmergencyShutdownDto = {
        reason: 'Critical system error',
        confirmationCode: 'EMERGENCY_SHUTDOWN_CONFIRMED',
      };

      const result = await controller.emergencyShutdown(shutdownRequest);

      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException for empty reason', async () => {
      const shutdownRequest: EmergencyShutdownDto = {
        reason: '',
      };

      await expect(controller.emergencyShutdown(shutdownRequest)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid confirmation code', async () => {
      const shutdownRequest: EmergencyShutdownDto = {
        reason: 'Test shutdown',
        confirmationCode: 'INVALID_CODE',
      };

      await expect(controller.emergencyShutdown(shutdownRequest)).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors during emergency shutdown', async () => {
      mockCancellationService.emergencyShutdown.mockRejectedValue(new Error('Shutdown failed'));

      const shutdownRequest: EmergencyShutdownDto = {
        reason: 'Test shutdown',
      };

      await expect(controller.emergencyShutdown(shutdownRequest)).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /health - Health Check', () => {
    it('should return health status', async () => {
      mockCancellationService.getActiveJobs.mockReturnValue([
        { jobId: 'job1', startedAt: new Date(), hasTimeout: true },
        { jobId: 'job2', startedAt: new Date(), hasTimeout: false },
      ]);

      const result = await controller.healthCheck();

      expect(result).toEqual({
        status: 'healthy',
        activeJobs: 2,
        configuredTimeouts: 0,
        cancellationHistory: 0,
        uptime: expect.any(Number),
        lastCheck: expect.any(String),
      });

      expect(result.uptime).toBeGreaterThan(0);
      expect(new Date(result.lastCheck)).toBeInstanceOf(Date);
    });

    it('should handle empty active jobs list', async () => {
      mockCancellationService.getActiveJobs.mockReturnValue([]);

      const result = await controller.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.activeJobs).toBe(0);
    });
  });

  describe('Request Validation and Error Handling', () => {
    it('should handle various job ID formats', async () => {
      const validJobIds = [
        'job_123',
        'job1640995200000abc12345',
        'simple-job-id',
        'JOB_WITH_CAPS',
        '123456789',
      ];

      const mockResult: CancellationResult = {
        jobId: '',
        success: true,
        strategy: CancellationStrategy.GRACEFUL,
        actualStrategy: CancellationStrategy.GRACEFUL,
        cancelledAt: new Date(),
        duration: 100,
        reason: 'Test',
        cleanup: { resourcesReleased: [], dependentsNotified: 0, errors: [] },
      };

      for (const jobId of validJobIds) {
        mockResult.jobId = jobId;
        mockCancellationService.cancelJob.mockResolvedValue(mockResult);

        const cancelRequest: CancelJobDto = {
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test reason',
        };

        const result = await controller.cancelJob(jobId, cancelRequest);
        expect(result.jobId).toBe(jobId);
      }
    });

    it('should trim whitespace from job IDs', async () => {
      const jobIdWithWhitespace = '  test_job_123  ';
      const trimmedJobId = 'test_job_123';

      const mockResult: CancellationResult = {
        jobId: trimmedJobId,
        success: true,
        strategy: CancellationStrategy.GRACEFUL,
        actualStrategy: CancellationStrategy.GRACEFUL,
        cancelledAt: new Date(),
        duration: 100,
        reason: 'Test',
        cleanup: { resourcesReleased: [], dependentsNotified: 0, errors: [] },
      };

      mockCancellationService.cancelJob.mockResolvedValue(mockResult);

      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test reason',
      };

      await controller.cancelJob(jobIdWithWhitespace, cancelRequest);

      expect(mockCancellationService.cancelJob).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: trimmedJobId,
        })
      );
    });

    it('should handle metadata in cancellation requests', async () => {
      const testJobId = 'metadata_test_job';
      const mockResult: CancellationResult = {
        jobId: testJobId,
        success: true,
        strategy: CancellationStrategy.GRACEFUL,
        actualStrategy: CancellationStrategy.GRACEFUL,
        cancelledAt: new Date(),
        duration: 200,
        reason: 'Test with metadata',
        cleanup: { resourcesReleased: [], dependentsNotified: 0, errors: [] },
        metadata: { customField: 'customValue' },
      };

      mockCancellationService.cancelJob.mockResolvedValue(mockResult);

      const cancelRequest: CancelJobDto = {
        strategy: CancellationStrategy.GRACEFUL,
        reason: 'Test with metadata',
        metadata: {
          customField: 'customValue',
          priority: 'high',
        },
      };

      const result = await controller.cancelJob(testJobId, cancelRequest);

      expect(mockCancellationService.cancelJob).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            customField: 'customValue',
            priority: 'high',
            requestedAt: expect.any(String),
            userAgent: 'JobCancellationController',
          }),
        })
      );

      expect(result.metadata).toEqual({ customField: 'customValue' });
    });
  });
});