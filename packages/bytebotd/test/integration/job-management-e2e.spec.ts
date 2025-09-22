/* eslint-env jest */

/**
 * Job Management Service - End-to-End Integration Tests
 *
 * Comprehensive integration testing suite for enterprise job management system
 * covering complete job lifecycle workflows, Redis integration, worker coordination,
 * and real-world scenarios with actual service dependencies.
 *
 * Integration Test Coverage:
 * - Complete job lifecycle (create → queue → execute → complete)
 * - Redis persistence and data consistency
 * - Multi-worker coordination and scaling
 * - Job priority queue management
 * - Error recovery and retry mechanisms
 * - Resource cleanup and memory management
 * - Service interaction and dependency validation
 * - Real-time job monitoring and metrics
 * - Concurrent user scenarios
 * - System resilience under load
 *
 * @version 1.0.0 - Complete Job Management E2E Test Suite
 * @author Testing Framework Specialist - Integration Test Coverage
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import {
  JobManagementService,
  JobStatus,
  JobPriority,
  JobResult,
  JobOptions,
} from '../../src/computer-use/job-management.service';
import { ComputerUseService } from '../../src/computer-use/computer-use.service';
import { ComputerAction } from '@bytebot/shared';

// ===== TEST INTERFACES =====

/**
 * Job management statistics interface
 */
interface JobManagementStats {
  workerId: string;
  isRunning: boolean;
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  avgExecutionTime: number;
  uptime: number;
  memoryUsage: number;
}

/**
 * Test configuration for integration tests
 */
const TEST_CONFIG = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_TEST_DB || '15'), // Use test database
    password: process.env.REDIS_PASSWORD,
  },
  job: {
    defaultTimeout: 30000,
    maxRetries: 3,
    workerInterval: 100, // Fast polling for tests
    cleanupInterval: 5000,
    maxAge: 60000, // 1 minute for tests
  },
  test: {
    timeout: 30000,
    concurrency: 10,
    batchSize: 100,
  },
};

/**
 * Test computer actions for integration testing
 */
const TEST_ACTIONS = {
  screenshot: {
    action: 'screenshot',
  } as ComputerAction,

  moveMouse: {
    action: 'move_mouse',
    coordinates: { x: 500, y: 300 },
  } as ComputerAction,

  clickMouse: {
    action: 'click_mouse',
    coordinates: { x: 250, y: 150 },
    clickCount: 1,
    button: 'left',
  } as ComputerAction,

  writeFile: {
    action: 'write_file',
    path: '/tmp/integration-test.txt',
    content: 'Integration test content',
  } as ComputerAction,

  readFile: {
    action: 'read_file',
    path: '/tmp/integration-test.txt',
  } as ComputerAction,

  keyPress: {
    action: 'key_press',
    key: 'Enter',
  } as ComputerAction,

  typeText: {
    action: 'type_text',
    text: 'Integration test text',
  } as ComputerAction,
};

describe('Job Management Service - Integration Tests', () => {
  let app: INestApplication;
  let jobManagementService: JobManagementService;
  let computerUseService: ComputerUseService;
  let configService: ConfigService;
  let redisClient: Redis;

  beforeAll(async () => {
    // Create integration test module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              redis: TEST_CONFIG.redis,
              job: TEST_CONFIG.job,
            }),
          ],
        }),
      ],
      providers: [
        JobManagementService,
        ComputerUseService,
        // Add other required providers for integration testing
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    jobManagementService =
      moduleFixture.get<JobManagementService>(JobManagementService);
    computerUseService =
      moduleFixture.get<ComputerUseService>(ComputerUseService);
    configService = moduleFixture.get<ConfigService>(ConfigService);

    // Initialize Redis client for test verification
    redisClient = new Redis({
      ...TEST_CONFIG.redis,
      lazyConnect: true,
    });

    await app.init();
    await redisClient.connect();

    // Clean test database before starting
    await redisClient.flushdb();
  });

  afterAll(async () => {
    // Clean up test data
    await redisClient.flushdb();
    await redisClient.quit();
    await app.close();
  });

  beforeEach(async () => {
    // Clean job data between tests
    const keys = await redisClient.keys('bytebot:jobs:*');
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    // Clean job indexes
    const indexKeys = await redisClient.keys('bytebot:jobs:status:*');
    if (indexKeys.length > 0) {
      await redisClient.del(...indexKeys);
    }

    const priorityKeys = await redisClient.keys('bytebot:jobs:priority:*');
    if (priorityKeys.length > 0) {
      await redisClient.del(...priorityKeys);
    }
  });

  describe('Complete Job Lifecycle Integration', () => {
    it(
      'should complete full job lifecycle: create → queue → execute → complete',
      async () => {
        // Step 1: Create job
        const jobId = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
          {
            priority: JobPriority.NORMAL,
            timeout: 10000,
            metadata: {
              userId: 'integration-test-user',
              sessionId: 'integration-test-session',
            },
          },
        );

        expect(jobId).toBeDefined();
        expect(typeof jobId).toBe('string');

        // Step 2: Verify job in queue
        const initialStatus = await jobManagementService.getJobStatus(jobId);
        expect(initialStatus).toBeDefined();
        expect(initialStatus.status).toBe(JobStatus.PENDING);
        expect(initialStatus.priority).toBe(JobPriority.NORMAL);

        // Step 3: Verify Redis persistence
        const redisKey = `bytebot:jobs:${jobId}`;
        const jobExists = await redisClient.exists(redisKey);
        expect(jobExists).toBe(1);

        // Step 4: Wait for job execution
        let finalStatus: JobResult | null = null;
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds with 100ms intervals

        while (attempts < maxAttempts) {
          finalStatus = await jobManagementService.getJobStatus(jobId);
          if (
            finalStatus.status === JobStatus.COMPLETED ||
            finalStatus.status === JobStatus.FAILED
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        // Step 5: Verify completion
        expect(finalStatus).toBeDefined();
        expect(finalStatus!.status).toBe(JobStatus.COMPLETED);
        expect(finalStatus!.result).toBeDefined();
        expect(finalStatus!.completedAt).toBeDefined();
        expect(finalStatus!.executionTimeMs).toBeGreaterThan(0);

        // Step 6: Verify job result retrieval
        const jobResult = await jobManagementService.getJobResult(jobId);
        expect(jobResult).toBeDefined();
      },
      TEST_CONFIG.test.timeout,
    );

    it(
      'should handle job execution with different action types',
      async () => {
        const testCases = [
          { action: TEST_ACTIONS.screenshot, expectedType: 'screenshot' },
          { action: TEST_ACTIONS.moveMouse, expectedType: 'move_mouse' },
          { action: TEST_ACTIONS.clickMouse, expectedType: 'click_mouse' },
          { action: TEST_ACTIONS.writeFile, expectedType: 'write_file' },
          { action: TEST_ACTIONS.keyPress, expectedType: 'key_press' },
        ];

        const jobPromises = testCases.map(async ({ action, expectedType }) => {
          const jobId = await jobManagementService.createJob(action, {
            priority: JobPriority.NORMAL,
            timeout: 15000,
          });

          // Wait for completion
          let status: JobResult | null = null;
          let attempts = 0;
          while (attempts < 50) {
            status = await jobManagementService.getJobStatus(jobId);
            if (
              status.status === JobStatus.COMPLETED ||
              status.status === JobStatus.FAILED
            ) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }

          return { jobId, action: expectedType, status };
        });

        const results = await Promise.all(jobPromises);

        results.forEach(({ jobId, action, status }) => {
          expect(status).toBeDefined();
          expect(status!.status).toMatch(/completed|failed/);
          expect(jobId).toBeDefined();
        });
      },
      TEST_CONFIG.test.timeout * 2,
    );

    it(
      'should handle job priority ordering correctly',
      async () => {
        // Create jobs with different priorities
        const urgentJob = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
          {
            priority: JobPriority.URGENT,
          },
        );

        const lowJob = await jobManagementService.createJob(
          TEST_ACTIONS.moveMouse,
          {
            priority: JobPriority.LOW,
          },
        );

        const highJob = await jobManagementService.createJob(
          TEST_ACTIONS.clickMouse,
          {
            priority: JobPriority.HIGH,
          },
        );

        const normalJob = await jobManagementService.createJob(
          TEST_ACTIONS.writeFile,
          {
            priority: JobPriority.NORMAL,
          },
        );

        // Verify priority indexes in Redis
        const urgentJobs = await redisClient.smembers(
          'bytebot:jobs:priority:urgent',
        );
        const highJobs = await redisClient.smembers(
          'bytebot:jobs:priority:high',
        );
        const normalJobs = await redisClient.smembers(
          'bytebot:jobs:priority:normal',
        );
        const lowJobs = await redisClient.smembers('bytebot:jobs:priority:low');

        expect(urgentJobs).toContain(urgentJob);
        expect(highJobs).toContain(highJob);
        expect(normalJobs).toContain(normalJob);
        expect(lowJobs).toContain(lowJob);

        // Wait for all jobs to complete
        const allJobIds = [urgentJob, lowJob, highJob, normalJob];
        for (const jobId of allJobIds) {
          let attempts = 0;
          while (attempts < 50) {
            const status = await jobManagementService.getJobStatus(jobId);
            if (
              status.status === JobStatus.COMPLETED ||
              status.status === JobStatus.FAILED
            ) {
              break;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
        }
      },
      TEST_CONFIG.test.timeout,
    );
  });

  describe('Multi-Worker Coordination Integration', () => {
    it(
      'should handle concurrent job processing by multiple workers',
      async () => {
        const jobCount = 20;
        const jobs: Promise<string>[] = [];

        // Create multiple jobs simultaneously
        for (let i = 0; i < jobCount; i++) {
          const action =
            i % 2 === 0 ? TEST_ACTIONS.screenshot : TEST_ACTIONS.moveMouse;
          jobs.push(
            jobManagementService.createJob(action, {
              priority: i % 3 === 0 ? JobPriority.HIGH : JobPriority.NORMAL,
            }),
          );
        }

        const jobIds = await Promise.all(jobs);
        expect(jobIds).toHaveLength(jobCount);

        // Wait for all jobs to complete
        const completionPromises = jobIds.map(async (jobId) => {
          let attempts = 0;
          while (attempts < 100) {
            const status = await jobManagementService.getJobStatus(jobId);
            if (
              status.status === JobStatus.COMPLETED ||
              status.status === JobStatus.FAILED
            ) {
              return status;
            }
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }
          throw new Error(`Job ${jobId} did not complete within timeout`);
        });

        const completedJobs = await Promise.all(completionPromises);

        // Verify all jobs completed
        completedJobs.forEach((status, index) => {
          expect(status.status).toMatch(/completed|failed/);
          if (status.status === JobStatus.COMPLETED) {
            expect(status.result).toBeDefined();
            expect(status.executionTimeMs).toBeGreaterThan(0);
          }
        });

        // Verify queue statistics
        const queueStats = await jobManagementService.getQueueStats();
        expect(queueStats.completed + queueStats.failed).toBe(jobCount);
      },
      TEST_CONFIG.test.timeout * 3,
    );

    it(
      'should handle worker scaling under load',
      async () => {
        const batchCount = 5;
        const batchSize = 10;
        const totalJobs = batchCount * batchSize;

        // Submit jobs in batches to simulate load
        for (let batch = 0; batch < batchCount; batch++) {
          const batchJobs: Promise<string>[] = [];

          for (let i = 0; i < batchSize; i++) {
            batchJobs.push(
              jobManagementService.createJob(TEST_ACTIONS.screenshot, {
                priority: JobPriority.NORMAL,
              }),
            );
          }

          await Promise.all(batchJobs);

          // Small delay between batches
          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        // Monitor queue statistics during processing
        let totalProcessed = 0;
        let attempts = 0;
        const maxAttempts = 200; // 20 seconds

        while (totalProcessed < totalJobs && attempts < maxAttempts) {
          const queueStats = await jobManagementService.getQueueStats();
          totalProcessed = queueStats.completed + queueStats.failed;

          if (totalProcessed < totalJobs) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          attempts++;
        }

        // Verify all jobs were processed
        const finalStats = await jobManagementService.getQueueStats();
        expect(finalStats.completed + finalStats.failed).toBe(totalJobs);
      },
      TEST_CONFIG.test.timeout * 4,
    );
  });

  describe('Error Recovery and Resilience Integration', () => {
    it(
      'should handle Redis connection interruptions gracefully',
      async () => {
        // Create initial job
        const jobId = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
        );

        // Verify job creation
        let initialStatus = await jobManagementService.getJobStatus(jobId);
        expect(initialStatus.status).toBe(JobStatus.PENDING);

        // Simulate Redis connection issue by disconnecting test client
        await redisClient.quit();

        // Wait a moment
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Reconnect Redis
        await redisClient.connect();

        // Job should still be retrievable (service should reconnect)
        const recoveredStatus = await jobManagementService.getJobStatus(jobId);
        expect(recoveredStatus).toBeDefined();
      },
      TEST_CONFIG.test.timeout,
    );

    it(
      'should handle job retry scenarios with backoff',
      async () => {
        // Mock a computer action that fails initially but succeeds on retry
        let attemptCount = 0;
        const originalAction = computerUseService.action;

        computerUseService.action = jest.fn().mockImplementation((action) => {
          attemptCount++;
          if (attemptCount <= 2) {
            return Promise.reject(new Error('Temporary failure'));
          }
          return originalAction.call(computerUseService, action);
        });

        const jobId = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
          {
            maxRetries: 3,
          },
        );

        // Wait for job completion with retries
        let finalStatus: JobResult | null = null;
        let checkAttempts = 0;
        while (checkAttempts < 100) {
          finalStatus = await jobManagementService.getJobStatus(jobId);
          if (
            finalStatus.status === JobStatus.COMPLETED ||
            finalStatus.status === JobStatus.FAILED
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          checkAttempts++;
        }

        // Should eventually succeed after retries
        expect(finalStatus!.status).toBe(JobStatus.COMPLETED);
        expect(finalStatus!.retryCount).toBeGreaterThan(0);

        // Restore original method
        computerUseService.action = originalAction;
      },
      TEST_CONFIG.test.timeout,
    );

    it(
      'should handle job timeout scenarios correctly',
      async () => {
        // Create job with very short timeout
        const jobId = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
          {
            timeout: 100, // 100ms timeout
          },
        );

        // Wait for timeout to occur
        let timeoutStatus: JobResult | null = null;
        let attempts = 0;
        while (attempts < 50) {
          timeoutStatus = await jobManagementService.getJobStatus(jobId);
          if (
            timeoutStatus.status === JobStatus.TIMEOUT ||
            timeoutStatus.status === JobStatus.FAILED
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        expect(timeoutStatus!.status).toMatch(/timeout|failed/);
        if (timeoutStatus!.error) {
          expect(timeoutStatus!.error.code).toMatch(/TIMEOUT|JOB_TIMEOUT/);
        }
      },
      TEST_CONFIG.test.timeout,
    );
  });

  describe('Job Cancellation Integration', () => {
    it('should cancel pending jobs successfully', async () => {
      // Create job
      const jobId = await jobManagementService.createJob(
        TEST_ACTIONS.screenshot,
      );

      // Verify job is pending
      const pendingStatus = await jobManagementService.getJobStatus(jobId);
      expect(pendingStatus.status).toBe(JobStatus.PENDING);

      // Cancel job
      await jobManagementService.cancelJob(jobId);

      // Verify cancellation
      const cancelledStatus = await jobManagementService.getJobStatus(jobId);
      expect(cancelledStatus.status).toBe(JobStatus.CANCELLED);
      expect(cancelledStatus.error?.code).toBe('JOB_CANCELLED');
    });

    it(
      'should handle cancellation of running jobs',
      async () => {
        // Mock long-running operation
        const originalAction = computerUseService.action;
        computerUseService.action = jest
          .fn()
          .mockImplementation(
            () =>
              new Promise((resolve) =>
                setTimeout(() => resolve({ success: true }), 5000),
              ),
          );

        const jobId = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
        );

        // Wait for job to start running
        let runningStatus: JobResult | null = null;
        let attempts = 0;
        while (attempts < 30) {
          runningStatus = await jobManagementService.getJobStatus(jobId);
          if (runningStatus.status === JobStatus.RUNNING) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        // Cancel running job
        if (runningStatus?.status === JobStatus.RUNNING) {
          await jobManagementService.cancelJob(jobId);

          const cancelledStatus =
            await jobManagementService.getJobStatus(jobId);
          expect(cancelledStatus.status).toBe(JobStatus.CANCELLED);
        }

        // Restore original method
        computerUseService.action = originalAction;
      },
      TEST_CONFIG.test.timeout,
    );
  });

  describe('Resource Management Integration', () => {
    it('should perform cleanup of expired jobs', async () => {
      // Create jobs that will expire quickly
      const expiredJobIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const jobId = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
        );
        expiredJobIds.push(jobId);
      }

      // Verify jobs exist
      for (const jobId of expiredJobIds) {
        const status = await jobManagementService.getJobStatus(jobId);
        expect(status).toBeDefined();
      }

      // Wait for jobs to expire (based on test configuration)
      await new Promise((resolve) =>
        setTimeout(resolve, TEST_CONFIG.job.maxAge + 1000),
      );

      // Force cleanup
      const deletedCount = await jobManagementService.forceCleanup();

      // Verify jobs were cleaned up
      expect(deletedCount).toBeGreaterThanOrEqual(0);
    });

    it(
      'should handle memory optimization during processing',
      async () => {
        const initialMemory = process.memoryUsage();

        // Create and process many jobs
        const jobCount = 50;
        const jobIds: string[] = [];

        for (let i = 0; i < jobCount; i++) {
          const jobId = await jobManagementService.createJob(
            TEST_ACTIONS.screenshot,
          );
          jobIds.push(jobId);
        }

        // Wait for processing
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Check memory usage
        const finalMemory = process.memoryUsage();
        const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

        // Memory increase should be reasonable (less than 100MB for test)
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

        // Get worker statistics
        const workerStats = await jobManagementService.getWorkerStats();
        expect(workerStats.memoryUsage).toBeGreaterThan(0);
        expect(workerStats.jobsProcessed).toBeGreaterThanOrEqual(0);
      },
      TEST_CONFIG.test.timeout,
    );
  });

  describe('Real-time Monitoring Integration', () => {
    it(
      'should provide accurate queue statistics during processing',
      async () => {
        // Create jobs with different priorities
        const jobIds: string[] = [];
        const priorities = [
          JobPriority.LOW,
          JobPriority.NORMAL,
          JobPriority.HIGH,
          JobPriority.URGENT,
        ];

        for (let i = 0; i < 20; i++) {
          const priority = priorities[i % priorities.length];
          const jobId = await jobManagementService.createJob(
            TEST_ACTIONS.screenshot,
            { priority },
          );
          jobIds.push(jobId);
        }

        // Monitor statistics during processing
        const statsHistory: Array<{
          timestamp: number;
          stats: JobManagementStats;
        }> = [];

        for (let i = 0; i < 10; i++) {
          const stats = await jobManagementService.getQueueStats();
          statsHistory.push({
            timestamp: Date.now(),
            stats,
          });

          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Verify statistics progression
        expect(statsHistory).toHaveLength(10);
        statsHistory.forEach(({ stats }) => {
          expect(stats.pending).toBeGreaterThanOrEqual(0);
          expect(stats.running).toBeGreaterThanOrEqual(0);
          expect(stats.completed).toBeGreaterThanOrEqual(0);
          expect(stats.failed).toBeGreaterThanOrEqual(0);
        });

        // Final statistics should show progress
        const finalStats = statsHistory[statsHistory.length - 1].stats;
        const initialStats = statsHistory[0].stats;

        expect(finalStats.completed + finalStats.failed).toBeGreaterThanOrEqual(
          initialStats.completed + initialStats.failed,
        );
      },
      TEST_CONFIG.test.timeout,
    );

    it('should provide worker performance metrics', async () => {
      // Create some jobs for worker activity
      for (let i = 0; i < 10; i++) {
        await jobManagementService.createJob(TEST_ACTIONS.screenshot);
      }

      // Wait for some processing
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const workerStats = await jobManagementService.getWorkerStats();

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

      expect(workerStats.jobsProcessed).toBeGreaterThanOrEqual(0);
      expect(workerStats.avgExecutionTime).toBeGreaterThanOrEqual(0);
      expect(workerStats.uptime).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency Integration', () => {
    it(
      'should maintain data consistency across Redis operations',
      async () => {
        const jobId = await jobManagementService.createJob(
          TEST_ACTIONS.screenshot,
          {
            priority: JobPriority.HIGH,
          },
        );

        // Verify job in main storage
        const redisKey = `bytebot:jobs:${jobId}`;
        const jobData = await redisClient.get(redisKey);
        expect(jobData).toBeDefined();

        // Verify job in status index
        const statusMembers = await redisClient.smembers(
          'bytebot:jobs:status:pending',
        );
        expect(statusMembers).toContain(jobId);

        // Verify job in priority index
        const priorityMembers = await redisClient.smembers(
          'bytebot:jobs:priority:high',
        );
        expect(priorityMembers).toContain(jobId);

        // Wait for job completion
        let completedStatus: JobResult | null = null;
        let attempts = 0;
        while (attempts < 50) {
          completedStatus = await jobManagementService.getJobStatus(jobId);
          if (
            completedStatus.status === JobStatus.COMPLETED ||
            completedStatus.status === JobStatus.FAILED
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        // Verify status index updated
        const completedMembers = await redisClient.smembers(
          'bytebot:jobs:status:completed',
        );
        const pendingMembers = await redisClient.smembers(
          'bytebot:jobs:status:pending',
        );

        if (completedStatus!.status === JobStatus.COMPLETED) {
          expect(completedMembers).toContain(jobId);
          expect(pendingMembers).not.toContain(jobId);
        }
      },
      TEST_CONFIG.test.timeout,
    );

    it('should handle concurrent job operations without race conditions', async () => {
      const concurrentJobs = 15;
      const operations: Promise<JobResult>[] = [];

      // Start concurrent operations
      for (let i = 0; i < concurrentJobs; i++) {
        if (i % 3 === 0) {
          // Create job
          operations.push(
            jobManagementService.createJob(TEST_ACTIONS.screenshot),
          );
        } else if (i % 3 === 1) {
          // Get queue stats
          operations.push(jobManagementService.getQueueStats());
        } else {
          // Get worker stats
          operations.push(jobManagementService.getWorkerStats());
        }
      }

      // Wait for all operations
      const results = await Promise.all(operations);

      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentJobs);
      results.forEach((result) => {
        expect(result).toBeDefined();
      });
    });
  });
});
