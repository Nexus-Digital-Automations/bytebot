/**
 * Job Error Recovery Service Test Suite
 *
 * Comprehensive test coverage for enterprise-grade error handling and recovery mechanisms.
 * Tests all components of the error recovery system including classification, retry logic,
 * failure analysis, and recovery strategies.
 *
 * @author Error Handling & Recovery Specialist
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {JobErrorRecoveryService,
  ErrorClassifier,
  RetryManager,
  FailureAnalyzer,
  RecoveryStrategyManager,
  DeadLetterQueueService,
  ErrorCategory,
  RecoveryStrategy,
  CircuitBreakerState,
} from '../services/job-error-recovery.service';
import {JobResult,
  JobError,
  JobStatus,
  JobPriority,
  JobStorage,
} from '../job-management.service';
import { ErrorSeverity } from '../../types/error-types';describe('JobErrorRecoveryService', () => {let service: JobErrorRecoveryService;
    let errorClassifier: ErrorClassifier;
  let retryManager: RetryManager;
  let failureAnalyzer: FailureAnalyzer;
  let recoveryStrategyManager: RecoveryStrategyManager;
  let deadLetterQueue: DeadLetterQueueService;
  let jobStorage: jest.Mocked<JobStorage>;
  let configService: jest.Mocked<ConfigService>;

  // Mock job for testing
  const mockJob: JobResult = {
    jobId: 'test-job-123',
  status: JobStatus.FAILED,
  priority: JobPriority.NORMAL,
    action: {
      action: 'screenshot',
  params: { format: 'png' },},
  createdAt: new Date('2023-01-01T10:00:00Z'),
  startedAt: new Date('2023-01-01T10:00:01Z'),
  completedAt: new Date('2023-01-01T10:00:05Z'),
  timeoutAt: new Date('2023-01-01T10:00:30Z'),
  retryCount: 1,
  maxRetries: 3,
    metadata: {
      userId: 'user-123',
  sessionId: 'session-456',
  tags: ['test'],
  metrics: {memoryUsage: 1024000,
      },
    },
    error: {
      code: 'NETWORK_ERROR',
  message: 'Connection timeout while executing action',
  timestamp: new Date('2023-01-01T10:00:05Z'),
  retryable: true,
  context: {
        workerId: 'worker-1',
  executionTimeMs: 4000,},
    },
  };

  beforeEach(async () => {
    // Mock JobStorage
    const mockJobStorage = {
      saveJob: jest.fn(),
      getJob: jest.fn(),
      updateJobStatus: jest.fn(),
      deleteJob: jest.fn(),
      getJobsByStatus: jest.fn(),
      getJobsByPriority: jest.fn(),
      cleanupExpiredJobs: jest.fn(),
    };

    // Mock ConfigService
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          ERROR_RECOVERY_MAX_RETRIES: 3,
          ERROR_RECOVERY_BASE_DELAY: 1000,
          ERROR_RECOVERY_MAX_DELAY: 60000,
          ERROR_RECOVERY_BACKOFF_MULTIPLIER: 2,
          ERROR_RECOVERY_JITTER_PERCENT: 10,
          ERROR_RECOVERY_CIRCUIT_THRESHOLD: 5,
          ERROR_RECOVERY_CIRCUIT_TIMEOUT: 60000,
          ERROR_RECOVERY_DLQ_MAX_SIZE: 1000,
          ERROR_RECOVERY_PATTERN_WINDOW: 3600000,
          ERROR_RECOVERY_ESCALATION_TIME: 1800000,
          ERROR_RECOVERY_HALF_OPEN_MAX_CALLS: 3,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobErrorRecoveryService,
        ErrorClassifier,
        RetryManager,
        FailureAnalyzer,
        RecoveryStrategyManager,
        DeadLetterQueueService,
        { provide: JobStorage, useValue: mockJobStorage },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JobErrorRecoveryService>(JobErrorRecoveryService);
    errorClassifier = module.get<ErrorClassifier>(ErrorClassifier);
    retryManager = module.get<RetryManager>(RetryManager);
    failureAnalyzer = module.get<FailureAnalyzer>(FailureAnalyzer);
    recoveryStrategyManager = module.get<RecoveryStrategyManager>(RecoveryStrategyManager);
    deadLetterQueue = module.get<DeadLetterQueueService>(DeadLetterQueueService);
    jobStorage = module.get(JobStorage);
    configService = module.get(ConfigService);
  });

  describe('Error Classification', () => {it('should classify network errors correctly', () => {const networkError: JobError = {code: 'ECONNRESET',
  message: 'Connection reset by peer',
  timestamp: new Date(),
  retryable: true,
        context: {},
      };

      const classification = errorClassifier.classifyError(networkError, mockJob);

      expect(classification.category).toBe(ErrorCategory.NETWORK);
      expect(classification.strategy).toBe(RecoveryStrategy.DELAYED_RETRY);
      expect(classification.confidence).toBeGreaterThan(0.5);
    });

    it('should classify timeout errors correctly', () => {const timeoutError: JobError = {code: 'JOB_TIMEOUT',
  message: 'Job execution exceeded timeout limit',
  timestamp: new Date(),
  retryable: false,
        context: {},
      };

      const classification = errorClassifier.classifyError(timeoutError, mockJob);

      expect(classification.category).toBe(ErrorCategory.TIMEOUT);
      expect(classification.strategy).toBe(RecoveryStrategy.JOB_SPLITTING);
      expect(classification.confidence).toBeGreaterThan(0.5);
    });

    it('should classify security errors correctly', () => {const securityError: JobError = {code: 'UNAUTHORIZED',
  message: 'Access denied - insufficient permissions',
  timestamp: new Date(),
  retryable: false,
        context: {},
      };

      const classification = errorClassifier.classifyError(securityError, mockJob);

      expect(classification.category).toBe(ErrorCategory.SECURITY);
      expect(classification.strategy).toBe(RecoveryStrategy.MANUAL_REVIEW);
      expect(classification.confidence).toBeGreaterThan(0.5);
    });

    it('should classify system errors correctly', () => {const systemError: JobError = {code: 'ENOMEM',
  message: 'Out of memory error during execution',
  timestamp: new Date(),
  retryable: true,
        context: {},
      };

      const classification = errorClassifier.classifyError(systemError, mockJob);

      expect(classification.category).toBe(ErrorCategory.SYSTEM);
      expect(classification.strategy).toBe(RecoveryStrategy.RESOURCE_SCALING);
    });

    it('should handle unknown errors gracefully', () => {const unknownError: JobError = {code: 'UNKNOWN_ERROR',
  message: 'Something went wrong',
  timestamp: new Date(),
  retryable: false,
        context: {},
      };

      const classification = errorClassifier.classifyError(unknownError, mockJob);

      expect(classification.category).toBe(ErrorCategory.PERMANENT);
      expect(classification.strategy).toBe(RecoveryStrategy.DEAD_LETTER);
    });
  });

  describe('Retry Manager', () => {it('should calculate exponential backoff correctly', () => {const delay1 = retryManager.calculateRetryDelay(0);

        const delay2 = retryManager.calculateRetryDelay(1);

        const delay3 = retryManager.calculateRetryDelay(2);

      expect(delay1).toBe(1000); // Base delay
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay3).toBeLessThanOrEqual(60000); // Max delay
    });

    it('should respect max retries limit', () => {const decision = retryManager.shouldRetry('test-job',ErrorCategory.NETWORK,3, // Current retry count
        3, // Max retries
      );

      expect(decision.shouldRetry).toBe(false);
      expect(decision.reason).toContain('Maximum retry attempts exceeded');});

  it('should allow retries when under limit', () => {const decision = retryManager.shouldRetry('test-job',ErrorCategory.NETWORK,1, // Current retry count
        3, // Max retries
      );

      expect(decision.shouldRetry).toBe(true);
      expect(decision.delayMs).toBeGreaterThan(0);
    });

    it('should handle circuit breaker correctly', () => {// Simulate multiple failures to trigger circuit breakerfor (let i = 0; i < 6; i++) {
        retryManager.recordRetryFailure(ErrorCategory.NETWORK);
      }

      const decision = retryManager.shouldRetry(
        'test-job',ErrorCategory.NETWORK,1,
        3,
      );

      expect(decision.shouldRetry).toBe(false);
      expect(decision.reason).toContain('Circuit breaker is open');});

  it('should transition circuit breaker to half-open after timeout', (done) => {// Trigger circuit breakerfor (let i = 0; i < 6; i++) {
        retryManager.recordRetryFailure(ErrorCategory.NETWORK);
      }

      // Wait for circuit breaker timeout (mocked to be short)
      setTimeout(() => {
        const states = retryManager.getCircuitBreakerStates();

        const networkCircuit = states['network_circuit'];
      expect(networkCircuit?.state).toBe(CircuitBreakerState.HALF_OPEN);done();
      }, 100);
    }, 1000);

    it('should close circuit breaker after successful retries', () => {// Open circuit breakerfor (let i = 0; i < 6; i++) {
        retryManager.recordRetryFailure(ErrorCategory.NETWORK);
      }

      // Record successes to close it
      for (let i = 0; i < 6; i++) {
        retryManager.recordRetrySuccess(ErrorCategory.NETWORK);
      }

      const states = retryManager.getCircuitBreakerStates();

        const networkCircuit = states['network_circuit'];
      expect(networkCircuit?.state).toBe(CircuitBreakerState.CLOSED);});
  });

  describe('Failure Analyzer', () => {it('should perform comprehensive failure analysis', () => {const analysis = failureAnalyzer.analyzeFailure(mockJob, mockJob.error!, []);
      expect(analysis.jobId).toBe(mockJob.jobId);
      expect(analysis.errorCategory).toBe(ErrorCategory.NETWORK);
      expect(analysis.rootCause).toContain('Network connectivity issue');
      expect(analysis.recommendedStrategy).toBe(RecoveryStrategy.DELAYED_RETRY);
      expect(analysis.preventionMeasures).toEqual(
        expect.arrayContaining([
          expect.stringContaining('network'),]));
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    it('should identify contributing factors', () => {const jobWithRetries = {...mockJob,
        retryCount: 2,
        priority: JobPriority.URGENT,
      };

      const analysis = failureAnalyzer.analyzeFailure(jobWithRetries, mockJob.error!, []);

      expect(analysis.contributing_factors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('High priority job'),expect.stringContaining('Previous 2 retry attempts'),]));
    });

    it('should track error patterns', () => {// Analyze the same error multiple timesfailureAnalyzer.analyzeFailure(mockJob, mockJob.error!, []);
      failureAnalyzer.analyzeFailure(mockJob, mockJob.error!, []);

        const patterns = failureAnalyzer.getErrorPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].frequency).toBeGreaterThan(1);
    });

    it('should estimate recovery time accurately', () => {const analysis = failureAnalyzer.analyzeFailure(mockJob, mockJob.error!, []);
      expect(analysis.estimatedRecoveryTime).toBeGreaterThan(0);
    });
  });

  describe('Recovery Strategy Manager', () => {it('should execute immediate retry strategy', async () => {const mockAnalysis = {analysisId: 'analysis-123',
  jobId: mockJob.jobId,
  errorCategory: ErrorCategory.TRANSIENT,
        rootCause: 'Temporary network issue',
  contributing_factors: [],
  severity: ErrorSeverity.LOW,
        recommendedStrategy: RecoveryStrategy.IMMEDIATE_RETRY,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 30000,
        confidence: 0.8,
        similarPatterns: [],
      };

      const attempt = await recoveryStrategyManager.executeRecoveryStrategy(
        mockJob,
        RecoveryStrategy.IMMEDIATE_RETRY,
        mockAnalysis,
      );

      expect(attempt.strategy).toBe(RecoveryStrategy.IMMEDIATE_RETRY);
      expect(attempt.success).toBe(true);
      expect(jobStorage.updateJobStatus).toHaveBeenCalledWith(
        mockJob.jobId,
        JobStatus.PENDING
      );
    });

    it('should execute delayed retry strategy', async () => {const mockAnalysis = {analysisId: 'analysis-123',
  jobId: mockJob.jobId,
  errorCategory: ErrorCategory.NETWORK,
        rootCause: 'Network connectivity issue',
  contributing_factors: [],
  severity: ErrorSeverity.MEDIUM,
        recommendedStrategy: RecoveryStrategy.DELAYED_RETRY,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 60000,
        confidence: 0.9,
        similarPatterns: [],
      };

      const attempt = await recoveryStrategyManager.executeRecoveryStrategy(
        mockJob,
        RecoveryStrategy.DELAYED_RETRY,
        mockAnalysis,
      );

      expect(attempt.strategy).toBe(RecoveryStrategy.DELAYED_RETRY);
      expect(attempt.success).toBe(true);
    });

    it('should execute manual review strategy', async () => {const mockAnalysis = {analysisId: 'analysis-123',
  jobId: mockJob.jobId,
  errorCategory: ErrorCategory.SECURITY,
        rootCause: 'Security violation detected',
  contributing_factors: [],
  severity: ErrorSeverity.HIGH,
        recommendedStrategy: RecoveryStrategy.MANUAL_REVIEW,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 600000,
        confidence: 0.95,
        similarPatterns: [],
      };

      const attempt = await recoveryStrategyManager.executeRecoveryStrategy(
        mockJob,
        RecoveryStrategy.MANUAL_REVIEW,
        mockAnalysis,
      );

      expect(attempt.strategy).toBe(RecoveryStrategy.MANUAL_REVIEW);
      expect(attempt.success).toBe(true);
      expect(jobStorage.updateJobStatus).toHaveBeenCalledWith(
        mockJob.jobId,
        JobStatus.FAILED,
        undefined,
        expect.objectContaining({
          code: 'REQUIRES_MANUAL_REVIEW',}));
    });

    it('should handle strategy execution errors', async () => {// Mock an error during job storage updatejobStorage.updateJobStatus.mockRejectedValueOnce(new Error('Storage error'));

        const mockAnalysis = {analysisId: 'analysis-123',
  jobId: mockJob.jobId,
  errorCategory: ErrorCategory.TRANSIENT,
        rootCause: 'Temporary issue',
  contributing_factors: [],
  severity: ErrorSeverity.LOW,
        recommendedStrategy: RecoveryStrategy.IMMEDIATE_RETRY,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 30000,
        confidence: 0.8,
        similarPatterns: [],
      };

      const attempt = await recoveryStrategyManager.executeRecoveryStrategy(
        mockJob,
        RecoveryStrategy.IMMEDIATE_RETRY,
        mockAnalysis,
      );

      expect(attempt.success).toBe(false);
      expect(attempt.errorAfter).toBeDefined();
      expect(attempt.errorAfter?.code).toBe('RECOVERY_FAILED');});
});

  describe('Dead Letter Queue', () => {it('should add job to dead letter queue', async () => {const mockAnalysis = {analysisId: 'analysis-123',
  jobId: mockJob.jobId,
  errorCategory: ErrorCategory.PERMANENT,
        rootCause: 'Permanent failure',
  contributing_factors: [],
  severity: ErrorSeverity.HIGH,
        recommendedStrategy: RecoveryStrategy.DEAD_LETTER,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 0,
        confidence: 0.9,
        similarPatterns: [],
      };

      const deadLetterId = await deadLetterQueue.addToDeadLetter(
        mockJob,
        mockJob.error!,
        [],
        mockAnalysis,
      );

      expect(deadLetterId).toBeDefined();
      expect(typeof deadLetterId).toBe('string');

        const items = deadLetterQueue.getDeadLetterItems();
      expect(items.length).toBe(1);
      expect(items[0].jobId).toBe(mockJob.jobId);
    });

    it('should filter dead letter items by criteria', async () => {const mockAnalysis = {analysisId: 'analysis-123',
  jobId: mockJob.jobId,
  errorCategory: ErrorCategory.SECURITY,
        rootCause: 'Security violation',
  contributing_factors: [],
  severity: ErrorSeverity.CRITICAL,
        recommendedStrategy: RecoveryStrategy.MANUAL_REVIEW,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 0,
        confidence: 0.95,
        similarPatterns: [],
      };

      await deadLetterQueue.addToDeadLetter(mockJob, mockJob.error!, [], mockAnalysis);

        const urgentItems = deadLetterQueue.getDeadLetterItems({
        priority: JobPriority.URGENT,
      });
      expect(urgentItems.length).toBe(0);

        const securityItems = deadLetterQueue.getDeadLetterItems({
        category: ErrorCategory.SECURITY,
      });
      expect(securityItems.length).toBe(1);

        const manualReviewItems = deadLetterQueue.getDeadLetterItems({
        requiresManualReview: true,
      });
      expect(manualReviewItems.length).toBe(1);
    });

    it('should calculate escalation levels correctly', async () => {const urgentJob = { ...mockJob, priority: JobPriority.URGENT };
    const mockAnalysis = {
        analysisId: 'analysis-123',
  jobId: urgentJob.jobId,
  errorCategory: ErrorCategory.SECURITY,
        rootCause: 'Critical security violation',
  contributing_factors: [],
  severity: ErrorSeverity.CRITICAL,
        recommendedStrategy: RecoveryStrategy.ESCALATION,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 0,
        confidence: 0.95,
        similarPatterns: [],
      };

      await deadLetterQueue.addToDeadLetter(urgentJob, mockJob.error!, [], mockAnalysis);

        const items = deadLetterQueue.getDeadLetterItems();
      expect(items[0].escalationLevel).toBeGreaterThan(5);
    });

    it('should provide comprehensive statistics', async () => {const mockAnalysis = {analysisId: 'analysis-123',
  jobId: mockJob.jobId,
  errorCategory: ErrorCategory.NETWORK,
        rootCause: 'Network failure',
  contributing_factors: [],
  severity: ErrorSeverity.MEDIUM,
        recommendedStrategy: RecoveryStrategy.DEAD_LETTER,
        alternativeStrategies: [],
        preventionMeasures: [],
        estimatedRecoveryTime: 0,
        confidence: 0.8,
        similarPatterns: [],
      };

      await deadLetterQueue.addToDeadLetter(mockJob, mockJob.error!, [], mockAnalysis);

        const stats = deadLetterQueue.getStatistics();
      expect(stats.totalItems).toBe(1);
      expect(stats.byPriority[JobPriority.NORMAL]).toBe(1);
      expect(stats.byCategory[ErrorCategory.NETWORK]).toBe(1);
    });
  });

  describe('Main Error Recovery Service', () => {it('should handle job failure end-to-end', async () => {const result = await service.handleJobFailure(mockJob);
      expect(result.recoveryAttempted).toBe(true);
      expect(result.strategy).toBeDefined();
      expect(result.analysisId).toBeDefined();
      expect(result.nextAction).toBeDefined();
    });

    it('should move job to dead letter queue when retries exhausted', async () => {const exhaustedJob = {...mockJob,
        retryCount: 3,
        maxRetries: 3,
      };

      const result = await service.handleJobFailure(exhaustedJob);

      expect(result.recoveryAttempted).toBe(false);
      expect(result.deadLetterId).toBeDefined();
      expect(result.nextAction).toContain('dead letter queue');});

  it('should provide comprehensive recovery statistics', async () => {// Perform some recovery attemptsawait service.handleJobFailure(mockJob);

        const stats = service.getRecoveryStatistics();
      expect(stats.totalRecoveryAttempts).toBeGreaterThan(0);
      expect(stats.strategiesByType).toBeDefined();
      expect(stats.circuitBreakerStates).toBeDefined();
      expect(stats.deadLetterQueueStats).toBeDefined();
      expect(stats.errorPatterns).toBeDefined();
    });

    it('should track recovery attempts by job', async () => {await service.handleJobFailure(mockJob);

        const attempts = service.getJobRecoveryAttempts(mockJob.jobId);
      expect(attempts.length).toBeGreaterThan(0);
      expect(attempts[0].jobId).toBe(mockJob.jobId);
    });

    it('should provide health status assessment', async () => {const health = service.getHealthStatus();
      expect(health.status).toMatch(/^(healthy|degraded|critical)$/);
      expect(health.details).toBeDefined();
      expect(health.details.circuitBreakers).toBeDefined();
      expect(health.details.deadLetterQueueSize).toBeGreaterThanOrEqual(0);
      expect(health.details.recentFailureRate).toBeGreaterThanOrEqual(0);
      expect(health.details.errorPatternCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors during failure handling gracefully', async () => {const jobWithoutError = { ...mockJob, error: undefined };await expect(service.handleJobFailure(jobWithoutError as any))
        .rejects.toThrow('Cannot handle failure: job has no error information');});

  it('should clean up completed job attempts', async () => {// Add some recovery attemptsawait service.handleJobFailure(mockJob);

        const clearedCount = service.clearCompletedJobAttempts();
      expect(clearedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {it('should handle multiple concurrent failures', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        ...mockJob,
        jobId: `test-job-${i}`,
        error: {
          ...mockJob.error!,
          code: i % 2 === 0 ? 'NETWORK_ERROR' : 'TIMEOUT_ERROR',},}));

        const results = await Promise.all(
        jobs.map(job => service.handleJobFailure(job))
      );

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.recoveryAttempted).toBeDefined();
        expect(result.nextAction).toBeDefined();
      });
    });

    it('should handle cascading failures with circuit breaker', async () => {
      const networkJobs = Array.from({ length: 8 }, (_, i) => ({
        ...mockJob,
        jobId: `network-job-${i}`,
        error: {
          code: 'ECONNRESET',
  message: 'Connection reset by peer',
  timestamp: new Date(),
  retryable: true,
          context: {},
        },
      }));

      // Process jobs to trigger circuit breaker
      const results = await Promise.all(
        networkJobs.map(job => service.handleJobFailure(job))
      );

      // Later jobs should be affected by circuit breaker
      const states = retryManager.getCircuitBreakerStates();

        const networkCircuit = states['network_circuit'];
      expect(networkCircuit?.state).toBe(CircuitBreakerState.OPEN);});

    it('should demonstrate complete recovery workflow', async () => {// 1. Initial failureconst result1 = await service.handleJobFailure(mockJob);
      expect(result1.recoveryAttempted).toBe(true);

      // 2. Subsequent failure with updated retry count
      const retriedJob = { ...mockJob, retryCount: 2 };
      const result2 = await service.handleJobFailure(retriedJob);
      expect(result2.recoveryAttempted).toBe(true);

      // 3. Final failure exceeding max retries
      const exhaustedJob = { ...mockJob, retryCount: 3, maxRetries: 3 };
      const result3 = await service.handleJobFailure(exhaustedJob);
      expect(result3.recoveryAttempted).toBe(false);
      expect(result3.deadLetterId).toBeDefined();

      // Verify comprehensive tracking
      const stats = service.getRecoveryStatistics();
      expect(stats.totalRecoveryAttempts).toBeGreaterThan(0);
      expect(stats.deadLetterQueueStats.totalItems).toBeGreaterThan(0);
    });
  });
});

/**
 * Performance and Load Testing Suite
 */
describe('JobErrorRecoveryService Performance', () => {let service: JobErrorRecoveryService;beforeEach(async () => {
    const mockJobStorage = {
      saveJob: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
      updateJobStatus: jest.fn().mockResolvedValue(undefined),
      deleteJob: jest.fn().mockResolvedValue(undefined),
      getJobsByStatus: jest.fn().mockResolvedValue([]),
      getJobsByPriority: jest.fn().mockResolvedValue([]),
      cleanupExpiredJobs: jest.fn().mockResolvedValue(0),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => defaultValue),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobErrorRecoveryService,
        ErrorClassifier,
        RetryManager,
        FailureAnalyzer,
        RecoveryStrategyManager,
        DeadLetterQueueService,
        { provide: JobStorage, useValue: mockJobStorage },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<JobErrorRecoveryService>(JobErrorRecoveryService);
  });

  it('should handle high volume of failures efficiently', async () => {
    const startTime = Date.now();

        const jobCount = 100;

    const jobs = Array.from({ length: jobCount }, (_, i) => ({
      jobId: `perf-test-${i}`,
      status: JobStatus.FAILED,
      priority: JobPriority.NORMAL,
      action: { action: 'test', params: {} },
  createdAt: new Date(),
  retryCount: 0,
      maxRetries: 3,
      metadata: { tags: [], metrics: {} },
      error: {
        code: 'TEST_ERROR',
  message: 'Performance test error',
  timestamp: new Date(),
  retryable: true,
        context: {},
      },
    }));

        const results = await Promise.all(
      jobs.map(job => service.handleJobFailure(job as JobResult))
    );

        const endTime = Date.now();

        const duration = endTime - startTime;

    expect(results).toHaveLength(jobCount);
    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

    // Verify all jobs were processed
    results.forEach(result => {
      expect(result.recoveryAttempted).toBeDefined();
    });
  });

  it('should maintain performance with many error patterns', async () => {const errorTypes = ['NETWORK_ERROR','TIMEOUT_ERROR','MEMORY_ERROR','PERMISSION_ERROR','VALIDATION_ERROR',
    ];

    const jobs = Array.from({ length: 50 }, (_, i) => ({
      jobId: `pattern-test-${i}`,
      status: JobStatus.FAILED,
      priority: JobPriority.NORMAL,
      action: { action: 'test', params: {} },
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      metadata: { tags: [], metrics: {} },
      error: {
        code: errorTypes[i % errorTypes.length],
        message: `Error type ${errorTypes[i % errorTypes.length]}`,
        timestamp: new Date(),
        retryable: true,
        context: { iteration: i },
      },
    }));

        const startTime = Date.now();

    for (const job of jobs) {
      await service.handleJobFailure(job as JobResult);
    }

    const endTime = Date.now();

        const duration = endTime - startTime;

    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds

    const stats = service.getRecoveryStatistics();
    expect(stats.errorPatterns.length).toBeGreaterThan(0);
  });
});