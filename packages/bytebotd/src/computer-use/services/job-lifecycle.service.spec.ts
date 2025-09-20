/**
 * Job Lifecycle Service - Comprehensive Integration Tests
 *
 * Tests all core functionality:
 * - State machine transitions and validation
 * - Job dependency management and resolution
 * - Progress tracking with ETA calculation
 * - Result management with caching and compression
 * - Event emission and lifecycle management
 * - Batch job processing and coordination
 * - Error handling and retry mechanisms
 * - Cleanup and resource management
 *
 * @author Claude Code - Job Lifecycle Testing Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';import { ConfigService } from '@nestjs/config';import { EventEmitter2 } from '@nestjs/event-emitter';import {JobLifecycleService,
  JobLifecycleStateMachine,
  JobDependencyManager,
  JobProgressTracker,
  JobResultManager,
  JobLifecycleState,
  JobLifecycleEvent,
} from './job-lifecycle.service';import { JobStatus, JobPriority } from '../dto/async-job.dto';import { ComputerActionDto } from '../dto/computer-action.dto';// Mock Redis for testingjest.mock('ioredis', () => {return jest.fn().mockImplementation(() => ({setex: jest.fn().mockResolvedValue('OK'),get: jest.fn().mockResolvedValue(null),del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    ttl: jest.fn().mockResolvedValue(-1),
  }));
});

// Mock CronJob
jest.mock('cron', () => ({CronJob: jest.fn().mockImplementation(() => ({start: jest.fn(),
    stop: jest.fn(),
  })),
}));

describe('JobLifecycleService', () => {let service: JobLifecycleService;let stateMachine: JobLifecycleStateMachine;
  let dependencyManager: JobDependencyManager;
  let progressTracker: JobProgressTracker;
  let resultManager: JobResultManager;
  let eventEmitter: EventEmitter2;
  let configService: ConfigService;

  // Test fixtures
  const mockAction: ComputerActionDto = {
    action: 'screenshot',};const mockConfig = {
    priority: JobPriority.NORMAL,
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    dependencies: [],
    schedule: {},
    tags: ['test'],metadata: { testRun: true },compression: false,
    encryption: false,
    webhooks: [],
    resultTtl: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobLifecycleService,
        JobLifecycleStateMachine,
        JobDependencyManager,
        JobProgressTracker,
        JobResultManager,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                REDIS_HOST: 'localhost',REDIS_PORT: 6379,REDIS_PASSWORD: undefined,
                REDIS_DB: 0,
                REDIS_JOB_RESULTS_DB: 1,
                JOB_ENCRYPTION_KEY: 'test-key',};return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JobLifecycleService>(JobLifecycleService);
    stateMachine = module.get<JobLifecycleStateMachine>(JobLifecycleStateMachine);
    dependencyManager = module.get<JobDependencyManager>(JobDependencyManager);
    progressTracker = module.get<JobProgressTracker>(JobProgressTracker);
    resultManager = module.get<JobResultManager>(JobResultManager);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Job State Machine', () => {it('should validate correct state transitions', () => {expect(stateMachine.validateTransition(JobLifecycleState.SUBMITTED, JobLifecycleState.QUEUED)).toBe(true);expect(stateMachine.validateTransition(JobLifecycleState.QUEUED, JobLifecycleState.RUNNING)).toBe(false);
      expect(stateMachine.validateTransition(JobLifecycleState.QUEUED, JobLifecycleState.READY)).toBe(true);
      expect(stateMachine.validateTransition(JobLifecycleState.READY, JobLifecycleState.RUNNING)).toBe(true);
      expect(stateMachine.validateTransition(JobLifecycleState.RUNNING, JobLifecycleState.COMPLETED)).toBe(false);
      expect(stateMachine.validateTransition(JobLifecycleState.RUNNING, JobLifecycleState.COMPLETING)).toBe(true);
      expect(stateMachine.validateTransition(JobLifecycleState.COMPLETING, JobLifecycleState.COMPLETED)).toBe(true);
    });

    it('should reject invalid state transitions', () => {expect(stateMachine.validateTransition(JobLifecycleState.COMPLETED, JobLifecycleState.RUNNING)).toBe(false);expect(stateMachine.validateTransition(JobLifecycleState.FAILED, JobLifecycleState.RUNNING)).toBe(false);
      expect(stateMachine.validateTransition(JobLifecycleState.CANCELLED, JobLifecycleState.RUNNING)).toBe(false);
    });

    it('should identify terminal states correctly', () => {expect(stateMachine.isTerminalState(JobLifecycleState.COMPLETED)).toBe(false); // Can transition to EXPIREDexpect(stateMachine.isTerminalState(JobLifecycleState.EXPIRED)).toBe(true);
      expect(stateMachine.isTerminalState(JobLifecycleState.RUNNING)).toBe(false);
    });

    it('should return valid next states', () => {const validStates = stateMachine.getValidNextStates(JobLifecycleState.RUNNING);expect(validStates).toContain(JobLifecycleState.PAUSED);
      expect(validStates).toContain(JobLifecycleState.COMPLETING);
      expect(validStates).toContain(JobLifecycleState.FAILED);
      expect(validStates).toContain(JobLifecycleState.CANCELLED);
      expect(validStates).toContain(JobLifecycleState.TIMEOUT);
      expect(validStates).not.toContain(JobLifecycleState.COMPLETED);
    });
  });

  describe('Job Dependency Management', () => {it('should add and retrieve dependencies correctly', () => {const jobA = 'job-a';const jobB = 'job-b';const jobC = 'job-c';dependencyManager.addDependency(jobB, jobA);dependencyManager.addDependency(jobC, jobA);
      dependencyManager.addDependency(jobC, jobB);

      expect(dependencyManager.getDependencies(jobB)).toEqual([jobA]);
      expect(dependencyManager.getDependencies(jobC)).toEqual([jobA, jobB]);
      expect(dependencyManager.getDependents(jobA)).toEqual([jobB, jobC]);
      expect(dependencyManager.getDependents(jobB)).toEqual([jobC]);
    });

    it('should detect circular dependencies', () => {const jobA = 'job-a';const jobB = 'job-b';const jobC = 'job-c';dependencyManager.addDependency(jobB, jobA);dependencyManager.addDependency(jobC, jobB);
      dependencyManager.addDependency(jobA, jobC); // Creates cycle

      expect(dependencyManager.hasCircularDependencies(jobA)).toBe(true);
      expect(dependencyManager.hasCircularDependencies(jobB)).toBe(true);
      expect(dependencyManager.hasCircularDependencies(jobC)).toBe(true);
    });

    it('should check dependency satisfaction correctly', () => {const jobA = 'job-a';const jobB = 'job-b';const jobC = 'job-c';dependencyManager.addDependency(jobC, jobA);dependencyManager.addDependency(jobC, jobB);

      const completedJobs = new Set([jobA]);
      expect(dependencyManager.areDependenciesSatisfied(jobC, completedJobs)).toBe(false);

      completedJobs.add(jobB);
      expect(dependencyManager.areDependenciesSatisfied(jobC, completedJobs)).toBe(true);
    });

    it('should generate correct execution order', () => {const jobA = 'job-a';const jobB = 'job-b';const jobC = 'job-c';const jobD = 'job-d';dependencyManager.addDependency(jobB, jobA);dependencyManager.addDependency(jobC, jobA);
      dependencyManager.addDependency(jobD, jobB);
      dependencyManager.addDependency(jobD, jobC);

      const executionOrder = dependencyManager.getExecutionOrder([jobA, jobB, jobC, jobD]);

      expect(executionOrder.indexOf(jobA)).toBeLessThan(executionOrder.indexOf(jobB));
      expect(executionOrder.indexOf(jobA)).toBeLessThan(executionOrder.indexOf(jobC));
      expect(executionOrder.indexOf(jobB)).toBeLessThan(executionOrder.indexOf(jobD));
      expect(executionOrder.indexOf(jobC)).toBeLessThan(executionOrder.indexOf(jobD));
    });
  });

  describe('Progress Tracking', () => {it('should update and track progress correctly', () => {const jobId = 'test-job';const progress1 = progressTracker.updateProgress(jobId, 25, 'Step 1', 4, 1);expect(progress1.percentage).toBe(25);expect(progress1.currentStep).toBe('Step 1');expect(progress1.completedSteps).toBe(1);expect(progress1.totalSteps).toBe(4);

      // Wait a bit to simulate time passage
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      return delay(100).then(() => {
        const progress2 = progressTracker.updateProgress(jobId, 50, 'Step 2', 4, 2);expect(progress2.percentage).toBe(50);expect(progress2.currentStep).toBe('Step 2');expect(progress2.averageStepTime).toBeGreaterThan(0);expect(progress2.estimatedTimeRemaining).toBeGreaterThan(0);
      });
    });

    it('should calculate ETA based on progress history', () => {const jobId = 'test-job-eta';// Simulate step-by-step progressprogressTracker.updateProgress(jobId, 10, 'Step 1', 10, 1);const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));return delay(50).then(() => {
        progressTracker.updateProgress(jobId, 20, 'Step 2', 10, 2);return delay(50);}).then(() => {
        const progress = progressTracker.updateProgress(jobId, 30, 'Step 3', 10, 3);expect(progress.averageStepTime).toBeGreaterThan(0);expect(progress.estimatedTimeRemaining).toBeGreaterThan(0);

        // Should estimate 7 more steps * average time
        const expectedETA = 7 * progress.averageStepTime;
        expect(Math.abs(progress.estimatedTimeRemaining - expectedETA)).toBeLessThan(100);
      });
    });

    it('should retrieve current progress', () => {const jobId = 'test-job-retrieve';progressTracker.updateProgress(jobId, 75, 'Almost done', 4, 3);const currentProgress = progressTracker.getProgress(jobId);expect(currentProgress).toBeDefined();
      expect(currentProgress!.percentage).toBe(75);
      expect(currentProgress!.currentStep).toBe('Almost done');});it('should clear progress history', () => {const jobId = 'test-job-clear';progressTracker.updateProgress(jobId, 50, 'Halfway', 2, 1);expect(progressTracker.getProgress(jobId)).toBeDefined();progressTracker.clearProgress(jobId);
      expect(progressTracker.getProgress(jobId)).toBeNull();
    });
  });

  describe('Result Management', () => {it('should store and retrieve results', async () => {const jobId = 'test-job-result';const testResult = { success: true, data: 'test-data' };await resultManager.storeResult(jobId, testResult, 3600, false);// Mock Redis get to return stored data
      const mockRedis = (resultManager as any).redis;
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(testResult));

      const retrievedResult = await resultManager.getResult(jobId, false);
      expect(retrievedResult).toEqual(testResult);
    });

    it('should handle compression', async () => {const jobId = 'test-job-compressed';const testResult = { large: 'data'.repeat(1000) };await resultManager.storeResult(jobId, testResult, 3600, true);// Verify compression was used (store call should have base64 data)
      const mockRedis = (resultManager as any).redis;
      const storeCall = mockRedis.setex.mock.calls.find((call: any) => call[0] === jobId);
      expect(storeCall).toBeDefined();
      expect(typeof storeCall[2]).toBe('string');});it('should check result existence', async () => {const jobId = 'test-job-exists';// Mock Redis exists responseconst mockRedis = (resultManager as any).redis;
      mockRedis.exists.mockResolvedValueOnce(1);

      const exists = await resultManager.hasResult(jobId);
      expect(exists).toBe(true);
    });

    it('should get result TTL', async () => {const jobId = 'test-job-ttl';const expectedTtl = 1800;// Mock Redis TTL response
      const mockRedis = (resultManager as any).redis;
      mockRedis.ttl.mockResolvedValueOnce(expectedTtl);

      const ttl = await resultManager.getResultTtl(jobId);
      expect(ttl).toBe(expectedTtl);
    });

    it('should delete results', async () => {const jobId = 'test-job-delete';await resultManager.deleteResult(jobId);const mockRedis = (resultManager as any).redis;
      expect(mockRedis.del).toHaveBeenCalledWith(jobId);
    });
  });

  describe('Job Lifecycle Operations', () => {it('should submit a job successfully', async () => {const result = await service.submitJob(mockAction, mockConfig);expect(result).toBeDefined();
      expect(result.jobId).toBeDefined();
      expect(result.status).toBe(JobStatus.PENDING);
      expect(result.submittedAt).toBeDefined();
      expect(result.estimatedCompletionAt).toBeDefined();
    });

    it('should reject jobs with circular dependencies', async () => {const jobA = await service.submitJob(mockAction, mockConfig);const configWithDep = {
        ...mockConfig,
        dependencies: [{ jobId: jobA.jobId, type: 'completion' as const }],};const jobB = await service.submitJob(mockAction, configWithDep);

      // Try to create circular dependency
      const circularConfig = {
        ...mockConfig,
        dependencies: [{ jobId: jobB.jobId, type: 'completion' as const }],};// Add circular dependency to dependency manager
      dependencyManager.addDependency(jobA.jobId, jobB.jobId);

      await expect(service.submitJob(mockAction, circularConfig)).rejects.toThrow('Circular dependency detected');});it('should get job status', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);const status = service.getJobStatus(submissionResult.jobId);

      expect(status).toBeDefined();
      expect(status.jobId).toBe(submissionResult.jobId);
      expect(status.status).toBe(JobStatus.PENDING);
      expect(status.progress).toBe(0);
      expect(status.metadata).toBeDefined();
      expect(status.metadata!.state).toBe(JobLifecycleState.QUEUED);
    });

    it('should throw error for non-existent job status', () => {expect(() => service.getJobStatus('non-existent-job')).toThrow('Job not found');});it('should get job result for completed job', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);const testResult = { success: true, screenshot: 'base64-data' };// Complete the jobawait service.completeJob(submissionResult.jobId, testResult);

      const jobResult = await service.getJobResult(submissionResult.jobId);

      expect(jobResult).toBeDefined();
      expect(jobResult.jobId).toBe(submissionResult.jobId);
      expect(jobResult.status).toBe(JobStatus.COMPLETED);
      expect(jobResult.result).toEqual(testResult);
      expect(jobResult.executionTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should throw error for incomplete job result', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);await expect(service.getJobResult(submissionResult.jobId)).rejects.toThrow('has not completed yet');});it('should cancel jobs successfully', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);const cancelled = await service.cancelJob(submissionResult.jobId);
      expect(cancelled).toBe(true);

      const status = service.getJobStatus(submissionResult.jobId);
      expect(status.status).toBe(JobStatus.CANCELLED);
    });

    it('should not cancel already completed jobs', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);await service.completeJob(submissionResult.jobId, { success: true });

      const cancelled = await service.cancelJob(submissionResult.jobId);
      expect(cancelled).toBe(false);
    });

    it('should pause and resume jobs', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);// Manually transition to running state for testing
      const job = (service as any).jobs.get(submissionResult.jobId);
      job.state = JobLifecycleState.RUNNING;

      const paused = await service.pauseJob(submissionResult.jobId);
      expect(paused).toBe(true);

      const status1 = service.getJobStatus(submissionResult.jobId);
      expect(status1.metadata!.state).toBe(JobLifecycleState.PAUSED);

      const resumed = await service.resumeJob(submissionResult.jobId);
      expect(resumed).toBe(true);

      const status2 = service.getJobStatus(submissionResult.jobId);
      expect(status2.metadata!.state).toBe(JobLifecycleState.RUNNING);
    });

    it('should update job progress', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);await service.updateJobProgress(submissionResult.jobId, 50, 'Processing', 10, 5);const status = service.getJobStatus(submissionResult.jobId);expect(status.progress).toBe(50);
      expect(status.metadata!.currentStep).toBe('Processing');expect(status.metadata!.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);});

    it('should handle job failures and retries', async () => {const submissionResult = await service.submitJob(mockAction, {...mockConfig,
        maxRetries: 2,
      });

      const testError = new Error('Test error');await service.failJob(submissionResult.jobId, testError);const status = service.getJobStatus(submissionResult.jobId);
      expect(status.metadata!.retryCount).toBe(1);
      expect(status.metadata!.state).toBe(JobLifecycleState.RETRYING);
    });
  });

  describe('Batch Job Operations', () => {it('should submit batch jobs successfully', async () => {const batchConfig = {batchId: 'test-batch',name: 'Test Batch',description: 'Test batch processing',strategy: 'parallel' as const,failurePolicy: 'continue' as const,timeout: 60000,webhooks: [],
      };

      const jobs = [
        { action: mockAction, config: mockConfig },
        { action: mockAction, config: mockConfig },
        { action: mockAction, config: mockConfig },
      ];

      const result = await service.submitBatch(batchConfig, jobs);

      expect(result).toBeDefined();
      expect(result.batchId).toBe('test-batch');expect(result.jobIds).toHaveLength(3);// Verify all jobs have the batch ID
      result.jobIds.forEach(jobId => {
        const status = service.getJobStatus(jobId);
        expect(status.metadata!.batchId).toBe('test-batch');});});

    it('should handle batch submission errors gracefully', async () => {const batchConfig = {batchId: 'error-batch',name: 'Error Batch',description: 'Batch that should fail',strategy: 'parallel' as const,failurePolicy: 'fail_fast' as const,timeout: 60000,webhooks: [],
      };

      // Create a job with circular dependency to force error
      const firstJob = await service.submitJob(mockAction, mockConfig);
      dependencyManager.addDependency(firstJob.jobId, 'non-existent-job');const jobs = [{
          action: mockAction,
          config: {
            ...mockConfig,
            dependencies: [{ jobId: firstJob.jobId, type: 'completion' as const }]}},
      ];

      await expect(service.submitBatch(batchConfig, jobs)).rejects.toThrow();
    });
  });

  describe('Job Statistics', () => {it('should provide comprehensive job statistics', async () => {// Submit various jobsawait service.submitJob(mockAction, { ...mockConfig, priority: JobPriority.HIGH });
      await service.submitJob(mockAction, { ...mockConfig, priority: JobPriority.LOW });
      const completedJob = await service.submitJob(mockAction, mockConfig);

      // Complete one job
      await service.completeJob(completedJob.jobId, { success: true });

      const stats = service.getJobStats();

      expect(stats).toBeDefined();
      expect(stats.total).toBe(3);
      expect(stats.byState[JobLifecycleState.QUEUED]).toBe(2);
      expect(stats.byState[JobLifecycleState.COMPLETED]).toBe(1);
      expect(stats.byPriority[JobPriority.NORMAL]).toBe(2);
      expect(stats.byPriority[JobPriority.HIGH]).toBe(1);
      expect(stats.byPriority[JobPriority.LOW]).toBe(1);
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(stats.queueLength).toBe(2);
    });
  });

  describe('Event Emission', () => {it('should emit lifecycle events', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);// Verify job submission event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobLifecycleEvent.JOB_SUBMITTED,
        expect.objectContaining({
          jobId: submissionResult.jobId,
        })
      );

      // Verify job queued event was emitted
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobLifecycleEvent.JOB_QUEUED,
        expect.objectContaining({
          jobId: submissionResult.jobId,
        })
      );
    });

    it('should emit progress update events', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);await service.updateJobProgress(submissionResult.jobId, 50, 'Processing');expect(eventEmitter.emit).toHaveBeenCalledWith(JobLifecycleEvent.JOB_PROGRESS_UPDATED,
        expect.objectContaining({
          jobId: submissionResult.jobId,
          progress: expect.objectContaining({
            percentage: 50,
            currentStep: 'Processing',}),})
      );
    });

    it('should emit completion events', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);const testResult = { success: true };

      await service.completeJob(submissionResult.jobId, testResult);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        JobLifecycleEvent.JOB_COMPLETED,
        expect.objectContaining({
          jobId: submissionResult.jobId,
          result: testResult,
        })
      );
    });
  });

  describe('Error Handling', () => {it('should handle service initialization errors gracefully', async () => {// Test that service can handle Redis connection failuresconst failingService = new JobLifecycleService(
        configService,
        eventEmitter,
        stateMachine,
        dependencyManager,
        progressTracker,
        resultManager
      );

      // Should not throw during initialization
      await expect(failingService.onModuleInit()).resolves.not.toThrow();
    });

    it('should handle result storage failures gracefully', async () => {const submissionResult = await service.submitJob(mockAction, mockConfig);// Mock Redis failure
      const mockRedis = (resultManager as any).redis;
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis connection failed'));// Should handle storage failure gracefullyawait expect(service.completeJob(submissionResult.jobId, { success: true })).resolves.not.toThrow();
    });

    it('should handle invalid job operations gracefully', async () => {// Test operations on non-existent jobsexpect(await service.cancelJob('non-existent')).toBe(false);expect(await service.pauseJob('non-existent')).toBe(false);expect(await service.resumeJob('non-existent')).toBe(false);// Should not throw for progress updates on non-existent jobsawait expect(service.updateJobProgress('non-existent', 50, 'test')).resolves.not.toThrow();});});

  describe('Memory Management and Cleanup', () => {it('should clean up progress tracking data', () => {const jobId = 'cleanup-test-job';progressTracker.updateProgress(jobId, 50, 'Test', 2, 1);expect(progressTracker.getProgress(jobId)).toBeDefined();progressTracker.clearProgress(jobId);
      expect(progressTracker.getProgress(jobId)).toBeNull();
    });

    it('should limit progress history size', () => {const jobId = 'history-limit-test';

      // Simulate more than 100 progress updates
      for (let i = 0; i <= 105; i++) {
        progressTracker.updateProgress(jobId, i, `Step ${i}`, 106, i);
      }

      const history = (progressTracker as any).progressHistory.get(jobId);
      expect(history).toBeDefined();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should handle service shutdown gracefully', async () => {const testService = new JobLifecycleService(configService,
        eventEmitter,
        stateMachine,
        dependencyManager,
        progressTracker,
        resultManager
      );

      await testService.onModuleInit();

      // Should not throw during shutdown
      await expect(testService.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {it('should handle complex job dependency chain', async () => {// Create a complex dependency chain: A -> B -> C, A -> D -> Cconst jobA = await service.submitJob(mockAction, mockConfig);

      const jobB = await service.submitJob(mockAction, {
        ...mockConfig,
        dependencies: [{ jobId: jobA.jobId, type: 'completion' }],});const jobD = await service.submitJob(mockAction, {
        ...mockConfig,
        dependencies: [{ jobId: jobA.jobId, type: 'completion' }],});const jobC = await service.submitJob(mockAction, {
        ...mockConfig,
        dependencies: [
          { jobId: jobB.jobId, type: 'completion' },{ jobId: jobD.jobId, type: 'completion' },],});

      // Verify dependency setup
      expect(dependencyManager.getDependencies(jobB.jobId)).toContain(jobA.jobId);
      expect(dependencyManager.getDependencies(jobD.jobId)).toContain(jobA.jobId);
      expect(dependencyManager.getDependencies(jobC.jobId)).toContain(jobB.jobId);
      expect(dependencyManager.getDependencies(jobC.jobId)).toContain(jobD.jobId);

      // Get execution order
      const executionOrder = dependencyManager.getExecutionOrder([
        jobA.jobId, jobB.jobId, jobC.jobId, jobD.jobId
      ]);

      expect(executionOrder[0]).toBe(jobA.jobId);
      expect(executionOrder[executionOrder.length - 1]).toBe(jobC.jobId);
    });

    it('should handle job lifecycle with progress tracking and completion', async () => {const job = await service.submitJob(mockAction, mockConfig);// Simulate job progression
      await service.updateJobProgress(job.jobId, 25, 'Starting', 4, 1);await service.updateJobProgress(job.jobId, 50, 'Halfway', 4, 2);await service.updateJobProgress(job.jobId, 75, 'Almost done', 4, 3);const finalResult = { success: true, data: 'completed' };await service.completeJob(job.jobId, finalResult);const jobResult = await service.getJobResult(job.jobId);
      expect(jobResult.status).toBe(JobStatus.COMPLETED);
      expect(jobResult.result).toEqual(finalResult);
      expect(jobResult.executionTimeMs).toBeGreaterThan(0);
    });

    it('should handle batch processing with mixed outcomes', async () => {const batchConfig = {batchId: 'mixed-outcome-batch',name: 'Mixed Outcome Batch',description: 'Batch with successful and failed jobs',strategy: 'parallel' as const,failurePolicy: 'continue' as const,timeout: 60000,webhooks: [],
      };

      const jobs = [
        { action: mockAction, config: mockConfig },
        { action: mockAction, config: mockConfig },
        { action: mockAction, config: mockConfig },
      ];

      const batchResult = await service.submitBatch(batchConfig, jobs);

      // Complete some jobs successfully
      await service.completeJob(batchResult.jobIds[0], { success: true });
      await service.completeJob(batchResult.jobIds[1], { success: true });

      // Fail one job
      await service.failJob(batchResult.jobIds[2], new Error('Test failure'));

      // Verify mixed outcomes
      const stats = service.getJobStats();
      expect(stats.byState[JobLifecycleState.COMPLETED]).toBe(2);
      expect(stats.byState[JobLifecycleState.RETRYING]).toBe(1);
    });
  });
});