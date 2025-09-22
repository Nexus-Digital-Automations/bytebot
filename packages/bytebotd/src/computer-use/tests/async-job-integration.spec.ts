/**
 * Async Job System Integration Tests
 *
 * End-to-end integration tests for the complete async job processing system
 * including job submission, monitoring, cancellation, and timeout management.
 * Tests real system interactions and performance characteristics.
 *
 * @author Claude Code - Job Management Enhancement Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import * as request from 'supertest';
import { ComputerUseModule } from '../computer-use.module';
import { AsyncJobService } from '../async-job.service';
import { EnhancedAsyncJobService } from '../enhanced-async-job.service';
import { JobCancellationTimeoutService } from '../services/job-cancellation-timeout.service';
import { JobEventsGateway } from '../job-events.gateway';
import {
  JobStatus,
  JobPriority,
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
} from '../dto/async-job.dto';
import { ComputerActionDto } from '../dto/computer-action.dto';
import { CancellationStrategy } from '../services/job-cancellation-timeout.service';

describe('Async Job System Integration', () => {
  let app: INestApplication;
  let asyncJobService: AsyncJobService;
  let enhancedAsyncJobService: EnhancedAsyncJobService;
  let cancellationService: JobCancellationTimeoutService;
  let jobEventsGateway: JobEventsGateway;

  // Mock external dependencies
  const mockComputerUseService = {
    action: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockMetricsService = {
    recordJobExecution: jest.fn(),
  };

  const mockJobMonitoringService = {
    recordJobExecution: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ComputerUseModule,
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
      ],
    })
      .overrideProvider('ComputerUseService')
      .useValue(mockComputerUseService)
      .overrideProvider('CacheService')
      .useValue(mockCacheService)
      .overrideProvider('MetricsService')
      .useValue(mockMetricsService)
      .overrideProvider('JobMonitoringService')
      .useValue(mockJobMonitoringService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    asyncJobService = moduleFixture.get<AsyncJobService>(AsyncJobService);
    enhancedAsyncJobService = moduleFixture.get<EnhancedAsyncJobService>(
      EnhancedAsyncJobService,
    );
    cancellationService = moduleFixture.get<JobCancellationTimeoutService>(
      JobCancellationTimeoutService,
    );
    jobEventsGateway = moduleFixture.get<JobEventsGateway>(JobEventsGateway);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Job Lifecycle', () => {
    it('should handle complete job submission to completion lifecycle', async () => {
      // Mock successful computer action
      const mockResult = { screenshot: 'base64_data', timestamp: new Date() };
      mockComputerUseService.action.mockResolvedValue(mockResult);

      // 1. Submit job via API
      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;
      expect(jobSubmission.jobId).toBeDefined();
      expect(jobSubmission.status).toBe(JobStatus.PENDING);

      // 2. Check initial job status
      const statusResponse = await request(app.getHttpServer())
        .get(`/computer-use/status/${jobSubmission.jobId}`)
        .expect(200);

      const jobStatus: JobStatusResponseDto = statusResponse.body;
      expect(jobStatus.jobId).toBe(jobSubmission.jobId);
      expect([JobStatus.PENDING, JobStatus.IN_PROGRESS]).toContain(
        jobStatus.status,
      );

      // 3. Wait for job completion
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 4. Check final status
      const finalStatusResponse = await request(app.getHttpServer())
        .get(`/computer-use/status/${jobSubmission.jobId}`)
        .expect(200);

      const finalStatus: JobStatusResponseDto = finalStatusResponse.body;
      expect(finalStatus.status).toBe(JobStatus.COMPLETED);
      expect(finalStatus.progress).toBe(100);

      // 5. Get job result
      const resultResponse = await request(app.getHttpServer())
        .get(`/computer-use/result/${jobSubmission.jobId}`)
        .expect(200);

      const jobResult: JobResultResponseDto = resultResponse.body;
      expect(jobResult.jobId).toBe(jobSubmission.jobId);
      expect(jobResult.status).toBe(JobStatus.COMPLETED);
      expect(jobResult.result).toEqual(mockResult);
      expect(jobResult.executionTimeMs).toBeGreaterThan(0);
    });

    it('should handle job failure scenarios', async () => {
      // Mock computer action failure
      mockComputerUseService.action.mockRejectedValue(
        new Error('Action execution failed'),
      );

      const actionDto: ComputerActionDto = {
        action: 'click',
        coordinate: [300, 400],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;

      // Wait for job processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check job failed
      const statusResponse = await request(app.getHttpServer())
        .get(`/computer-use/status/${jobSubmission.jobId}`)
        .expect(200);

      const jobStatus: JobStatusResponseDto = statusResponse.body;
      expect(jobStatus.status).toBe(JobStatus.FAILED);
      expect(jobStatus.errorMessage).toContain('Action execution failed');
    });

    it('should handle job retry mechanism', async () => {
      let callCount = 0;
      mockComputerUseService.action.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve({ success: true });
      });

      const actionDto: ComputerActionDto = {
        action: 'key',
        text: 'test input',
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;

      // Wait for retries and completion
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const statusResponse = await request(app.getHttpServer())
        .get(`/computer-use/status/${jobSubmission.jobId}`)
        .expect(200);

      const jobStatus: JobStatusResponseDto = statusResponse.body;
      expect(jobStatus.status).toBe(JobStatus.COMPLETED);
      expect(mockComputerUseService.action).toHaveBeenCalledTimes(3);
    });
  });

  describe('Job Cancellation Integration', () => {
    it('should cancel pending jobs successfully', async () => {
      // Submit job that will be cancelled before execution
      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;

      // Cancel the job immediately
      const cancelResponse = await request(app.getHttpServer())
        .post(`/computer-use/cancellation/${jobSubmission.jobId}/cancel`)
        .send({
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Integration test cancellation',
        })
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.jobId).toBe(jobSubmission.jobId);

      // Verify job status is cancelled
      const statusResponse = await request(app.getHttpServer())
        .get(`/computer-use/status/${jobSubmission.jobId}`)
        .expect(200);

      const jobStatus: JobStatusResponseDto = statusResponse.body;
      expect(jobStatus.status).toBe(JobStatus.CANCELLED);
    });

    it('should handle bulk job cancellation', async () => {
      // Submit multiple jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const actionDto: ComputerActionDto = {
          action: 'screenshot',
          coordinate: [100 + i * 10, 200 + i * 10],
        };

        const submitResponse = await request(app.getHttpServer())
          .post('/computer-use/action')
          .send(actionDto)
          .expect(201);

        jobIds.push(submitResponse.body.jobId);
      }

      // Bulk cancel jobs
      const bulkCancelResponse = await request(app.getHttpServer())
        .post('/computer-use/cancellation/bulk-cancel')
        .send({
          criteria: {
            status: [JobStatus.PENDING, JobStatus.IN_PROGRESS],
          },
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Bulk integration test cancellation',
        })
        .expect(200);

      expect(bulkCancelResponse.body.attempted).toBeGreaterThan(0);
      expect(bulkCancelResponse.body.successful).toBeGreaterThan(0);

      // Verify at least some jobs were cancelled
      for (const jobId of jobIds) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/computer-use/status/${jobId}`)
          .expect(200);

        const jobStatus: JobStatusResponseDto = statusResponse.body;
        expect([
          JobStatus.CANCELLED,
          JobStatus.PENDING,
          JobStatus.IN_PROGRESS,
        ]).toContain(jobStatus.status);
      }
    });

    it('should handle timeout configuration', async () => {
      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;

      // Configure timeout for the job
      const timeoutResponse = await request(app.getHttpServer())
        .post(
          `/computer-use/cancellation/${jobSubmission.jobId}/timeout-config`,
        )
        .send({
          softTimeoutMs: 5000,
          hardTimeoutMs: 10000,
          escalationSteps: [
            {
              delayMs: 3000,
              action: 'warning',
            },
            {
              delayMs: 8000,
              action: 'graceful_cancel',
            },
          ],
        })
        .expect(201);

      expect(timeoutResponse.body.configured).toBe(true);
      expect(timeoutResponse.body.jobId).toBe(jobSubmission.jobId);
    });
  });

  describe('Enhanced Job Operations', () => {
    it('should handle batch job submission', async () => {
      const batchRequest = {
        executionMode: 'parallel',
        batchPriority: JobPriority.HIGH,
        jobs: [
          {
            jobKey: 'screenshot_1',
            action: {
              action: 'screenshot',
              coordinate: [100, 200],
            },
            priority: JobPriority.HIGH,
          },
          {
            jobKey: 'click_1',
            action: {
              action: 'click',
              coordinate: [150, 250],
            },
            dependencies: [
              {
                dependsOnJobId: 'screenshot_1',
                type: 'completion',
              },
            ],
          },
        ],
      };

      const batchResponse = await request(app.getHttpServer())
        .post('/computer-use/enhanced/batch')
        .send(batchRequest)
        .expect(201);

      expect(batchResponse.body.batchId).toBeDefined();
      expect(batchResponse.body.jobIds).toBeDefined();
      expect(batchResponse.body.totalJobs).toBe(2);
      expect(Object.keys(batchResponse.body.jobIds)).toContain('screenshot_1');
      expect(Object.keys(batchResponse.body.jobIds)).toContain('click_1');
    });

    it('should provide bulk job status', async () => {
      // Submit multiple jobs
      const jobIds: string[] = [];
      for (let i = 0; i < 2; i++) {
        const actionDto: ComputerActionDto = {
          action: 'screenshot',
          coordinate: [100 + i * 10, 200 + i * 10],
        };

        const submitResponse = await request(app.getHttpServer())
          .post('/computer-use/action')
          .send(actionDto)
          .expect(201);

        jobIds.push(submitResponse.body.jobId);
      }

      // Get bulk status
      const bulkStatusResponse = await request(app.getHttpServer())
        .post('/computer-use/enhanced/jobs/bulk-status')
        .send({
          jobIds,
          includeMetrics: true,
          includeProgress: true,
        })
        .expect(200);

      expect(bulkStatusResponse.body.requestId).toBeDefined();
      expect(bulkStatusResponse.body.jobs).toHaveLength(jobIds.length);
      expect(bulkStatusResponse.body.summary).toBeDefined();
      expect(bulkStatusResponse.body.summary.total).toBe(jobIds.length);
    });

    it('should provide enhanced job status with metrics', async () => {
      mockComputerUseService.action.mockResolvedValue({ success: true });

      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get enhanced status
      const enhancedStatusResponse = await request(app.getHttpServer())
        .get(`/computer-use/enhanced/jobs/${jobSubmission.jobId}/status`)
        .expect(200);

      const enhancedStatus = enhancedStatusResponse.body;
      expect(enhancedStatus.jobId).toBe(jobSubmission.jobId);
      expect(enhancedStatus.performanceMetrics).toBeDefined();
      expect(enhancedStatus.estimatedCompletion).toBeDefined();
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide system health information', async () => {
      const healthResponse = await request(app.getHttpServer())
        .get('/computer-use/enhanced/health')
        .expect(200);

      expect(healthResponse.body.status).toBeDefined();
      expect(healthResponse.body.metrics).toBeDefined();
      expect(healthResponse.body.metrics.activeJobs).toBeGreaterThanOrEqual(0);
      expect(healthResponse.body.metrics.queueLength).toBeGreaterThanOrEqual(0);
      expect(healthResponse.body.timestamp).toBeDefined();
    });

    it('should provide cancellation service health', async () => {
      const healthResponse = await request(app.getHttpServer())
        .get('/computer-use/cancellation/health')
        .expect(200);

      expect(healthResponse.body.status).toBe('healthy');
      expect(healthResponse.body.activeJobs).toBeGreaterThanOrEqual(0);
      expect(healthResponse.body.uptime).toBeGreaterThan(0);
      expect(healthResponse.body.lastCheck).toBeDefined();
    });

    it('should track active jobs', async () => {
      // Submit a job to have active tracking
      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      // Check active jobs tracking
      const activeJobsResponse = await request(app.getHttpServer())
        .get('/computer-use/cancellation/active-jobs')
        .expect(200);

      expect(Array.isArray(activeJobsResponse.body)).toBe(true);
      // May or may not have active jobs depending on timing
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid job ID requests', async () => {
      await request(app.getHttpServer())
        .get('/computer-use/status/invalid_job_id')
        .expect(400);

      await request(app.getHttpServer())
        .get('/computer-use/result/invalid_job_id')
        .expect(400);
    });

    it('should handle malformed action requests', async () => {
      await request(app.getHttpServer())
        .post('/computer-use/action')
        .send({
          action: 'invalid_action',
          // Missing required fields
        })
        .expect(400);
    });

    it('should handle cancellation of non-existent jobs', async () => {
      await request(app.getHttpServer())
        .post('/computer-use/cancellation/non_existent_job/cancel')
        .send({
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test cancellation',
        })
        .expect(404);
    });

    it('should handle invalid bulk cancellation criteria', async () => {
      await request(app.getHttpServer())
        .post('/computer-use/cancellation/bulk-cancel')
        .send({
          criteria: {
            olderThan: 'invalid-date-format',
          },
          strategy: CancellationStrategy.GRACEFUL,
          reason: 'Test cancellation',
        })
        .expect(400);
    });

    it('should handle invalid timeout configurations', async () => {
      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;

      await request(app.getHttpServer())
        .post(
          `/computer-use/cancellation/${jobSubmission.jobId}/timeout-config`,
        )
        .send({
          softTimeoutMs: 10000,
          hardTimeoutMs: 5000, // Invalid: hard timeout less than soft timeout
          escalationSteps: [],
        })
        .expect(400);
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent job submissions', async () => {
      mockComputerUseService.action.mockResolvedValue({ success: true });

      const concurrentRequests = 10;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const actionDto: ComputerActionDto = {
          action: 'screenshot',
          coordinate: [100 + i, 200 + i],
        };

        const promise = request(app.getHttpServer())
          .post('/computer-use/action')
          .send(actionDto);

        promises.push(promise);
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.jobId).toBeDefined();
      });

      // All job IDs should be unique
      const jobIds = responses.map((r) => r.body.jobId);
      const uniqueJobIds = new Set(jobIds);
      expect(uniqueJobIds.size).toBe(concurrentRequests);
    });

    it('should handle rapid job status polling', async () => {
      mockComputerUseService.action.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), 1000);
        });
      });

      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      const jobSubmission: JobSubmissionResponseDto = submitResponse.body;

      // Rapidly poll job status
      const statusPromises: Promise<any>[] = [];
      for (let i = 0; i < 10; i++) {
        const promise = request(app.getHttpServer()).get(
          `/computer-use/status/${jobSubmission.jobId}`,
        );
        statusPromises.push(promise);
      }

      const statusResponses = await Promise.all(statusPromises);

      // All status requests should succeed
      statusResponses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.jobId).toBe(jobSubmission.jobId);
      });
    });

    it('should handle system under load', async () => {
      // Simulate system load with many jobs
      const loadTestJobs = 20;
      const jobPromises: Promise<any>[] = [];

      mockComputerUseService.action.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ success: true }), Math.random() * 500);
        });
      });

      for (let i = 0; i < loadTestJobs; i++) {
        const actionDto: ComputerActionDto = {
          action: 'screenshot',
          coordinate: [100 + i, 200 + i],
        };

        const promise = request(app.getHttpServer())
          .post('/computer-use/action')
          .send(actionDto)
          .expect(201);

        jobPromises.push(promise);
      }

      const jobSubmissions = await Promise.all(jobPromises);

      // Wait for jobs to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check system health under load
      const healthResponse = await request(app.getHttpServer())
        .get('/computer-use/enhanced/health')
        .expect(200);

      expect(healthResponse.body.status).toBeDefined();
      expect(healthResponse.body.metrics.activeJobs).toBeGreaterThanOrEqual(0);

      // Verify jobs completed or are in progress
      const statusChecks = jobSubmissions.map((submission) =>
        request(app.getHttpServer())
          .get(`/computer-use/status/${submission.body.jobId}`)
          .expect(200),
      );

      const statusResults = await Promise.all(statusChecks);
      statusResults.forEach((result) => {
        expect([
          JobStatus.PENDING,
          JobStatus.IN_PROGRESS,
          JobStatus.COMPLETED,
          JobStatus.FAILED,
        ]).toContain(result.body.status);
      });
    });
  });

  describe('Emergency Scenarios', () => {
    it('should handle emergency shutdown', async () => {
      // Submit some jobs first
      for (let i = 0; i < 3; i++) {
        const actionDto: ComputerActionDto = {
          action: 'screenshot',
          coordinate: [100 + i * 10, 200 + i * 10],
        };

        await request(app.getHttpServer())
          .post('/computer-use/action')
          .send(actionDto)
          .expect(201);
      }

      // Perform emergency shutdown
      const shutdownResponse = await request(app.getHttpServer())
        .post('/computer-use/cancellation/emergency-shutdown')
        .send({
          reason: 'Integration test emergency shutdown',
        })
        .expect(200);

      expect(shutdownResponse.body.requestId).toBeDefined();
      expect(shutdownResponse.body.attempted).toBeGreaterThanOrEqual(0);
    });

    it('should handle system recovery after emergency shutdown', async () => {
      // After emergency shutdown, system should still accept new jobs
      const actionDto: ComputerActionDto = {
        action: 'screenshot',
        coordinate: [100, 200],
      };

      const submitResponse = await request(app.getHttpServer())
        .post('/computer-use/action')
        .send(actionDto)
        .expect(201);

      expect(submitResponse.body.jobId).toBeDefined();
      expect(submitResponse.body.status).toBe(JobStatus.PENDING);
    });
  });
});
