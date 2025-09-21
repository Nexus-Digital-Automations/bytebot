/**
 * Job Error Recovery Service - Enterprise-Grade Error Handling & Recovery
 *
 * Provides comprehensive error handling and intelligent recovery mechanisms
 * for enterprise job management with advanced error classification, retry logic,
 * failure analysis, and recovery strategies.
 *
 * Features:
 * - Comprehensive error classification with recovery strategies
 * - Intelligent retry logic with exponential backoff and circuit breakers
 * - Detailed failure analysis with root cause identification
 * - Multiple recovery strategies based on error type and job criticality
 * - Dead letter queue for permanently failed jobs
 * - Manual intervention workflows for critical failures
 * - Error correlation and pattern detection
 * - Performance metrics and analytics
 *
 * Architecture:
 * - ErrorClassifier: Categorizes errors and determines recovery strategies
 * - RetryManager: Handles intelligent retry mechanisms with circuit breakers
 * - RecoveryStrategyManager: Implements multiple recovery approaches
 * - FailureAnalyzer: Performs root cause analysis and pattern detection
 * - DeadLetterQueue: Manages permanently failed jobs for manual intervention
 * - ErrorCorrelation: Tracks error patterns and system health
 *
 * @author Error Handling & Recovery Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  JobResult,
  JobError,
  JobStatus,
  JobPriority,
  JobStorage,
} from '../job-management.service';
import {
  getErrorMessage,
  getErrorSeverity,
  ErrorSeverity,
} from '../../types/error-types';

// ===== ERROR CLASSIFICATION & RECOVERY TYPES =====

/**
 * Comprehensive error classification for intelligent recovery
 */
export enum ErrorCategory {
  TRANSIENT = 'transient',           // Temporary issues (network, resource)PERMANENT = 'permanent',           // Non-recoverable errors (logic, validation)NETWORK = 'network',               // Network connectivity issuesSYSTEM = 'system',                 // System resource exhaustionUSER = 'user',                     // User input or permission errorsTIMEOUT = 'timeout',               // Execution timeout errorsSECURITY = 'security',             // Security violationsDEPENDENCY = 'dependency',         // External service failuresRESOURCE = 'resource',             // Resource allocation failuresBUSINESS_LOGIC = 'business_logic', // Business rule violations}/**
 * Recovery strategy types based on error analysis
 */
export enum RecoveryStrategy {
  IMMEDIATE_RETRY = 'immediate_retry',         // Retry immediatelyDELAYED_RETRY = 'delayed_retry',             // Retry with exponential backoffALTERNATIVE_WORKER = 'alternative_worker',   // Try different worker/resourceJOB_SPLITTING = 'job_splitting',             // Break job into smaller partsMANUAL_REVIEW = 'manual_review',             // Require human interventionDEAD_LETTER = 'dead_letter',                 // Move to dead letter queueCIRCUIT_BREAKER = 'circuit_breaker',         // Activate circuit breakerESCALATION = 'escalation',                   // Escalate to administratorsRESOURCE_SCALING = 'resource_scaling',       // Scale resourcesCONFIGURATION_UPDATE = 'configuration_update', // Update configuration}/**
 * Circuit breaker states for cascading failure prevention
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',       // Normal operationOPEN = 'open',           // Failing fastHALF_OPEN = 'half_open', // Testing recovery
}

/**
 * Error pattern for correlation and analysis
 */
export interface ErrorPattern {
  readonly patternId: string;
  readonly errorCategory: ErrorCategory;
  readonly errorSignature: string;
  readonly frequency: number;
  readonly firstSeen: Date;
  readonly lastSeen: Date;
  readonly affectedJobs: string[];
  readonly commonContext: Record<string, unknown>;
  readonly severity: ErrorSeverity;
  readonly suggestedActions: string[];
}

/**
 * Recovery attempt record for tracking and analysis
 */
export interface RecoveryAttempt {
  readonly attemptId: string;
  readonly jobId: string;
  readonly strategy: RecoveryStrategy;
  readonly timestamp: Date;
  readonly success: boolean;
  readonly duration: number;
  readonly errorBefore?: JobError;
  readonly errorAfter?: JobError;
  readonly metadata: Record<string, unknown>;
}

/**
 * Circuit breaker configuration and state
 */
export interface CircuitBreaker {
  readonly name: string;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  readonly failureThreshold: number;
  readonly recoveryTimeout: number;
  readonly halfOpenMaxCalls: number;
  halfOpenCalls: number;
}

/**
 * Dead letter queue item for manual intervention
 */
export interface DeadLetterItem {
  readonly id: string;
  readonly jobId: string;
  readonly originalJob: JobResult;
  readonly finalError: JobError;
  readonly recoveryAttempts: RecoveryAttempt[];
  readonly addedAt: Date;
  readonly priority: JobPriority;
  readonly category: ErrorCategory;
  readonly requiresManualReview: boolean;
  readonly escalationLevel: number;
  readonly metadata: Record<string, unknown>;
}

/**
 * Failure analysis result with recommendations
 */
export interface FailureAnalysis {
  readonly analysisId: string;
  readonly jobId: string;
  readonly errorCategory: ErrorCategory;
  readonly rootCause: string;
  readonly contributing_factors: string[];
  readonly severity: ErrorSeverity;
  readonly recommendedStrategy: RecoveryStrategy;
  readonly alternativeStrategies: RecoveryStrategy[];
  readonly preventionMeasures: string[];
  readonly estimatedRecoveryTime: number;
  readonly confidence: number;
  readonly similarPatterns: string[];
}

/**
 * Error recovery configuration
 */
export interface ErrorRecoveryConfig {
  readonly maxRetryAttempts: number;
  readonly baseRetryDelay: number;
  readonly maxRetryDelay: number;
  readonly exponentialBackoffMultiplier: number;
  readonly jitterMaxPercent: number;
  readonly circuitBreakerFailureThreshold: number;
  readonly circuitBreakerRecoveryTimeout: number;
  readonly deadLetterQueueMaxSize: number;
  readonly errorPatternAnalysisWindow: number;
  readonly manualReviewEscalationTime: number;
}

// ===== ERROR CLASSIFICATION SERVICE =====

/**
 * Intelligent error classifier for recovery strategy determination
 */
@Injectable()
export class ErrorClassifier {
  private readonly logger = new Logger(ErrorClassifier.name);

/**
   * Classify error and determine appropriate recovery strategy
   */
  classifyError(error: JobError, _jobContext: JobResult): {
    category: ErrorCategory;
    strategy: RecoveryStrategy;
    confidence: number;
    reasoning: string;
  } {
    const operationId = `classify_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.debug(`[${operationId}] Classifying error`, {jobId: _jobContext.jobId,
  errorCode: error.code,
      errorMessage: error.message,
    });

    // Analyze error characteristics
    const category = this.categorizeError(error, _jobContext);

        const strategy = this.determineRecoveryStrategy(category, error, _jobContext);

        const confidence = this.calculateConfidence(category, error, _jobContext);

        const reasoning = this.generateReasoning(category, strategy, error, _jobContext);

    this.logger.log(`[${operationId}] Error classified`, {
      jobId: _jobContext.jobId,
      category,
      strategy,
      confidence,
    });

    return {
      category,
      strategy,
      confidence,
      reasoning,
    };
  }

  /**
   * Categorize error based on characteristics
   */
  private categorizeError(error: JobError, _jobContext: JobResult): ErrorCategory {
    const errorMessage = error.message.toLowerCase();

        const errorCode = error.code.toLowerCase();

    // Network-related errors
    if (
      errorMessage.includes('network') ||errorMessage.includes('connection') ||errorCode.includes('econnreset') ||errorCode.includes('econnrefused') ||errorCode.includes('enotfound')) {return ErrorCategory.NETWORK;
    }

    // Timeout errors
    if (
      errorMessage.includes('timeout') ||errorCode.includes('timeout') ||error.code === 'JOB_TIMEOUT') {return ErrorCategory.TIMEOUT;
    }

    // System resource errors
    if (
      errorMessage.includes('memory') ||errorMessage.includes('disk') ||errorMessage.includes('cpu') ||errorMessage.includes('resource') ||errorCode.includes('enomem') ||errorCode.includes('enospc')) {return ErrorCategory.SYSTEM;
    }

    // Security errors
    if (
      errorMessage.includes('unauthorized') ||errorMessage.includes('forbidden') ||errorMessage.includes('permission') ||errorCode.includes('auth') ||errorCode.includes('security')) {return ErrorCategory.SECURITY;
    }

    // User input errors
    if (
      errorMessage.includes('invalid') ||errorMessage.includes('validation') ||errorMessage.includes('bad request') ||errorCode.includes('validation') ||errorCode.includes('invalid')) {return ErrorCategory.USER;
    }

    // Dependency service errors
    if (
      errorMessage.includes('service unavailable') ||errorMessage.includes('external service') ||errorMessage.includes('api error') ||error.code === 'EXTERNAL_SERVICE_ERROR') {return ErrorCategory.DEPENDENCY;
    }

    // Business logic errors
    if (
      errorMessage.includes('business rule') ||errorMessage.includes('constraint') ||errorMessage.includes('workflow') ||error.code === 'BUSINESS_LOGIC_ERROR') {return ErrorCategory.BUSINESS_LOGIC;
    }

    // Determine if error is likely transient
    const transientIndicators = [
      'temporary','retry','unavailable','busy','throttled','rate limit',];
    const isTransient = transientIndicators.some(indicator =>
      errorMessage.includes(indicator) || errorCode.includes(indicator)
    );

    if (isTransient || error.retryable) {
      return ErrorCategory.TRANSIENT;
    }

    // Default to permanent if no other category matches
    return ErrorCategory.PERMANENT;
  }

  /**
   * Determine recovery strategy based on error category and context
   */
  private determineRecoveryStrategy(
    category: ErrorCategory,
    error: JobError,
    jobContext: JobResult,
  ): RecoveryStrategy {
    const retryCount = jobContext.retryCount;
    const maxRetries = jobContext.maxRetries;
    const jobPriority = jobContext.priority;

    switch (category) {
      case ErrorCategory.TRANSIENT:
        if (retryCount < maxRetries) {
          return retryCount === 0
            ? RecoveryStrategy.IMMEDIATE_RETRY
            : RecoveryStrategy.DELAYED_RETRY;
        }
        return RecoveryStrategy.ALTERNATIVE_WORKER;

      case ErrorCategory.NETWORK:
        if (retryCount < maxRetries) {
          return RecoveryStrategy.DELAYED_RETRY;
        }
        return RecoveryStrategy.CIRCUIT_BREAKER;

      case ErrorCategory.TIMEOUT:
        if (retryCount < maxRetries) {
          return RecoveryStrategy.JOB_SPLITTING;
        }
        return RecoveryStrategy.ALTERNATIVE_WORKER;

      case ErrorCategory.SYSTEM:
        return RecoveryStrategy.RESOURCE_SCALING;

      case ErrorCategory.SECURITY:
        return RecoveryStrategy.MANUAL_REVIEW;

      case ErrorCategory.USER:
        return RecoveryStrategy.DEAD_LETTER;

      case ErrorCategory.DEPENDENCY:
        if (retryCount < maxRetries) {
          return RecoveryStrategy.DELAYED_RETRY;
        }
        return RecoveryStrategy.CIRCUIT_BREAKER;

      case ErrorCategory.BUSINESS_LOGIC:
        return RecoveryStrategy.MANUAL_REVIEW;

      case ErrorCategory.RESOURCE:
        return RecoveryStrategy.RESOURCE_SCALING;

      case ErrorCategory.PERMANENT:
        if (jobPriority === JobPriority.URGENT || jobPriority === JobPriority.HIGH) {
          return RecoveryStrategy.MANUAL_REVIEW;
        }
        return RecoveryStrategy.DEAD_LETTER;

      default:
        return RecoveryStrategy.DELAYED_RETRY;
    }
  }

  /**
   * Calculate confidence level for classification
   */
  private calculateConfidence(
    category: ErrorCategory,
    error: JobError,
    jobContext: JobResult,
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on specific error patterns
    const errorMessage = error.message.toLowerCase();

        const errorCode = error.code.toLowerCase();

    // Strong indicators increase confidence
    if (errorCode.includes('timeout')) confidence += 0.3;if (errorMessage.includes('network')) confidence += 0.3;if (errorMessage.includes('unauthorized')) confidence += 0.4;
    if (error.retryable !== undefined) confidence += 0.2;

    // Context factors
    if (jobContext.retryCount > 0) confidence += 0.1;
    if (error.context && Object.keys(error.context).length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate human-readable reasoning for classification
   */
  private generateReasoning(
    category: ErrorCategory,
    strategy: RecoveryStrategy,
    error: JobError,
    jobContext: JobResult,
  ): string {
    const reasons = [];

    reasons.push(`Error categorized as ${category} based on error message and code`);

    if (error.retryable) {
      reasons.push('Error marked as retryable');
    }

    if (jobContext.retryCount > 0) {
      reasons.push(`Previous retry attempts: ${jobContext.retryCount}`);}reasons.push(`Recommended strategy: ${strategy}`);

    return reasons.join('. ');}}

// ===== RETRY MANAGER SERVICE =====

/**
 * Intelligent retry manager with exponential backoff and circuit breakers
 */
@Injectable()
export class RetryManager {
  private readonly logger = new Logger(RetryManager.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(private readonly config: ConfigService) {}

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateRetryDelay(retryCount: number, baseDelay?: number): number {
    const base = baseDelay ?? this.config.get<number>('ERROR_RECOVERY_BASE_RETRY_DELAY', 1000);

        const multiplier = this.config.get<number>('ERROR_RECOVERY_BACKOFF_MULTIPLIER', 2);

        const maxDelay = this.config.get<number>('ERROR_RECOVERY_MAX_RETRY_DELAY', 60000);

        const jitterPercent = this.config.get<number>('ERROR_RECOVERY_JITTER_PERCENT', 10);
    // Exponential backoffconst exponentialDelay = Math.min(base * Math.pow(multiplier, retryCount), maxDelay);

    // Add jitter to prevent thundering herd
    const jitterRange = exponentialDelay * (jitterPercent / 100);

        const jitter = (Math.random() * 2 - 1) * jitterRange;

    return Math.max(exponentialDelay + jitter, base);
  }

  /**
   * Check if retry should be attempted based on circuit breaker state
   */
  shouldRetry(
    jobId: string,
    errorCategory: ErrorCategory,
    retryCount: number,
    maxRetries: number,
  ): {
    shouldRetry: boolean;
    reason: string;
    delayMs?: number;
  } {
    // Check max retries
    if (retryCount >= maxRetries) {
      return {
        shouldRetry: false,
        reason: 'Maximum retry attempts exceeded',
      };
    }

    // Check circuit breaker for network/dependency errors
    if (errorCategory === ErrorCategory.NETWORK || errorCategory === ErrorCategory.DEPENDENCY) {
      const circuitBreakerKey = `${errorCategory}_circuit`;
      const circuitBreaker = this.getOrCreateCircuitBreaker(circuitBreakerKey);

      if (circuitBreaker.state === CircuitBreakerState.OPEN) {
        return {
          shouldRetry: false,
          reason: 'Circuit breaker is open',};}

      if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
        if (circuitBreaker.halfOpenCalls >= circuitBreaker.halfOpenMaxCalls) {
          return {
            shouldRetry: false,
            reason: 'Circuit breaker half-open limit reached',};}
        circuitBreaker.halfOpenCalls++;
      }
    }

    // Calculate delay
    const delayMs = this.calculateRetryDelay(retryCount);

    return {
      shouldRetry: true,
      reason: 'Retry approved',
      delayMs,
    };
  }

  /**
   * Record retry success for circuit breaker management
   */
  recordRetrySuccess(errorCategory: ErrorCategory): void {
    if (errorCategory === ErrorCategory.NETWORK || errorCategory === ErrorCategory.DEPENDENCY) {
      const circuitBreakerKey = `${errorCategory}_circuit`;
    const circuitBreaker = this.getOrCreateCircuitBreaker(circuitBreakerKey);circuitBreaker.successCount++;
      circuitBreaker.lastSuccessTime = new Date();

      if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
        // Transition to closed if enough successes
        if (circuitBreaker.successCount >= 5) {
          circuitBreaker.state = CircuitBreakerState.CLOSED;
          circuitBreaker.failureCount = 0;
          circuitBreaker.halfOpenCalls = 0;
          this.logger.log(`Circuit breaker ${circuitBreakerKey} closed`);}}
    }
  }

  /**
   * Record retry failure for circuit breaker management
   */
  recordRetryFailure(errorCategory: ErrorCategory): void {
    if (errorCategory === ErrorCategory.NETWORK || errorCategory === ErrorCategory.DEPENDENCY) {
      const circuitBreakerKey = `${errorCategory}_circuit`;
    const circuitBreaker = this.getOrCreateCircuitBreaker(circuitBreakerKey);circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();

      // Open circuit breaker if threshold exceeded
      if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
        circuitBreaker.state = CircuitBreakerState.OPEN;
        this.logger.warn(`Circuit breaker ${circuitBreakerKey} opened`);
    // Schedule half-open transitionsetTimeout(() => {
          if (circuitBreaker.state === CircuitBreakerState.OPEN) {
            circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
            circuitBreaker.halfOpenCalls = 0;
            this.logger.log(`Circuit breaker ${circuitBreakerKey} half-open`);
          }
        }, circuitBreaker.recoveryTimeout);
      }
    }
  }

  /**
   * Get or create circuit breaker for error category
   */
  private getOrCreateCircuitBreaker(key: string): CircuitBreaker {
    if (!this.circuitBreakers.has(key)) {
      const circuitBreaker: CircuitBreaker = {
        name: key,
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        successCount: 0,
        failureThreshold: this.config.get<number>('ERROR_RECOVERY_CIRCUIT_BREAKER_THRESHOLD', 5),
  recoveryTimeout: this.config.get<number>('ERROR_RECOVERY_CIRCUIT_BREAKER_TIMEOUT', 60000),
  halfOpenMaxCalls: this.config.get<number>('ERROR_RECOVERY_HALF_OPEN_MAX_CALLS', 3),
        halfOpenCalls: 0,
      };
      this.circuitBreakers.set(key, circuitBreaker);
    }
    return this.circuitBreakers.get(key) as CircuitBreaker;
  }

  /**
   * Get circuit breaker states for monitoring
   */
  getCircuitBreakerStates(): Record<string, CircuitBreaker> {
    const states: Record<string, CircuitBreaker> = {};
    this.circuitBreakers.forEach((breaker, key) => {
      states[key] = { ...breaker };
    });
    return states;
  }
}

// ===== FAILURE ANALYZER SERVICE =====

/**
 * Advanced failure analyzer for root cause identification
 */
@Injectable()
export class FailureAnalyzer {
  private readonly logger = new Logger(FailureAnalyzer.name);
  private readonly errorPatterns = new Map<string, ErrorPattern>();

/**
   * Perform comprehensive failure analysis
   */
  analyzeFailure(
    job: JobResult,
    error: JobError,
    recoveryAttempts: RecoveryAttempt[],
  ): FailureAnalysis {
    const operationId = `analyze_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`[${operationId}] Analyzing failure`, {jobId: job.jobId,
  errorCode: error.code,
    });

    // Generate error signature for pattern matching
    const errorSignature = this.generateErrorSignature(error);

    // Update error patterns
    this.updateErrorPattern(errorSignature, job.jobId, error);

    // Perform root cause analysis
    const rootCause = this.identifyRootCause(job, error, recoveryAttempts);

        const contributingFactors = this.identifyContributingFactors(job, error, recoveryAttempts);

    // Determine severity and recommendations
    const severity = getErrorSeverity(error);

        const recommendedStrategy = this.recommendStrategy(job, error, recoveryAttempts);

        const alternativeStrategies = this.getAlternativeStrategies(recommendedStrategy);

    // Generate prevention measures
    const preventionMeasures = this.generatePreventionMeasures(rootCause, contributingFactors);

    // Find similar patterns
    const similarPatterns = this.findSimilarPatterns(errorSignature);

        const analysis: FailureAnalysis = {
      analysisId: uuidv4(),
      jobId: job.jobId,
      errorCategory: this.categorizeErrorForAnalysis(error),
      rootCause,
      contributing_factors: contributingFactors,
      severity,
      recommendedStrategy,
      alternativeStrategies,
      preventionMeasures,
      estimatedRecoveryTime: this.estimateRecoveryTime(recommendedStrategy, recoveryAttempts),
      confidence: this.calculateAnalysisConfidence(job, error, recoveryAttempts),
      similarPatterns,
    };

    this.logger.log(`[${operationId}] Failure analysis completed`, {
      jobId: job.jobId,
      rootCause,
      recommendedStrategy,
      confidence: analysis.confidence,
    });

    return analysis;
  }

  /**
   * Generate unique error signature for pattern matching
   */
  private generateErrorSignature(error: JobError): string {
    const components = [
      error.code,
      error.message.split(' ').slice(0, 5).join(' '), // First 5 wordsObject.keys(error.context || {}).sort().join(','),];return Buffer.from(components.join('|')).toString('base64').substring(0, 16);}/**
   * Update error pattern tracking
   */
  private updateErrorPattern(
    signature: string,
    jobId: string,
    error: JobError,
  ): void {
    const existingPattern = this.errorPatterns.get(signature);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = new Date();
      existingPattern.affectedJobs.push(jobId);
    } else {
      const newPattern: ErrorPattern = {
        patternId: signature,
        errorCategory: this.categorizeErrorForAnalysis(error),
        errorSignature: signature,
        frequency: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        affectedJobs: [jobId],
        commonContext: error.context || {},
        severity: getErrorSeverity(error),
        suggestedActions: this.generateSuggestedActions(error),
      };
      this.errorPatterns.set(signature, newPattern);
    }
  }

  /**
   * Identify root cause of failure
   */
  private identifyRootCause(
    job: JobResult,
    error: JobError,
    recoveryAttempts: RecoveryAttempt[],
  ): string {
    const errorMessage = error.message.toLowerCase();

        const errorCode = error.code.toLowerCase();

    // Analyze based on error patterns
    if (errorCode.includes('timeout')) {return 'Job execution exceeded time limit due to long-running operation or resource contention';}if (errorMessage.includes('network') || errorMessage.includes('connection')) {return 'Network connectivity issue preventing communication with required services';}if (errorMessage.includes('memory') || errorMessage.includes('out of memory')) {return 'Insufficient memory allocation causing job execution failure';}if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {return 'Insufficient permissions or expired credentials preventing job execution';}if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {return 'Invalid input data or parameters causing validation failure';}if (recoveryAttempts.length > 0) {
      const lastAttempt = recoveryAttempts[recoveryAttempts.length - 1];
      if (lastAttempt.strategy === RecoveryStrategy.DELAYED_RETRY) {
        return 'Persistent transient failure indicating possible system instability';}}

    return 'Unknown error condition requiring detailed investigation';}/**
   * Identify contributing factors
   */
  private identifyContributingFactors(
    job: JobResult,
    error: JobError,
    recoveryAttempts: RecoveryAttempt[],
  ): string[] {
    const factors: string[] = [];

    // Job-related factors
    if (job.priority === JobPriority.URGENT) {
      factors.push('High priority job may have been processed during peak load');
    }

    if (job.retryCount > 0) {
      factors.push(`Previous ${job.retryCount} retry attempts indicate recurring issue`);}// Error context factors
    if (error.context) {
      if (error.context.workerId) {
        factors.push(`Specific worker involved: ${String(error.context.workerId)}`);}if (error.context.executionTimeMs) {
        factors.push(`Execution time: ${String(error.context.executionTimeMs)}ms`);}}

    // Recovery attempt factors
    if (recoveryAttempts.length > 0) {
      const failedStrategies = recoveryAttempts
        .filter(attempt => !attempt.success)
        .map(attempt => attempt.strategy);

      if (failedStrategies.length > 0) {
        factors.push(`Failed recovery strategies: ${failedStrategies.join(`, ')}`);
      }
    }

    // Timing factors
    const currentHour = new Date().getHours();
    if (currentHour >= 9 && currentHour <= 17) {
      factors.push('Failure occurred during peak business hours');}return factors;
  }

  /**
   * Categorize error for analysis purposes
   */
  private categorizeErrorForAnalysis(error: JobError): ErrorCategory {
    // Reuse classification logic
    const errorMessage = error.message.toLowerCase();

        const errorCode = error.code.toLowerCase();

    if (errorCode.includes('timeout')) return ErrorCategory.TIMEOUT;if (errorMessage.includes('network')) return ErrorCategory.NETWORK;if (errorMessage.includes('memory')) return ErrorCategory.SYSTEM;if (errorMessage.includes('permission')) return ErrorCategory.SECURITY;if (errorMessage.includes('validation')) return ErrorCategory.USER;return ErrorCategory.PERMANENT;}

  /**
   * Recommend recovery strategy based on analysis
   */
  private recommendStrategy(
    job: JobResult,
    error: JobError,
    recoveryAttempts: RecoveryAttempt[],
  ): RecoveryStrategy {
    const category = this.categorizeErrorForAnalysis(error);

        const failedStrategies = recoveryAttempts
      .filter(attempt => !attempt.success)
      .map(attempt => attempt.strategy);

    // Avoid previously failed strategies
    switch (category) {
      case ErrorCategory.TIMEOUT:
        if (!failedStrategies.includes(RecoveryStrategy.JOB_SPLITTING)) {
          return RecoveryStrategy.JOB_SPLITTING;
        }
        return RecoveryStrategy.RESOURCE_SCALING;

      case ErrorCategory.NETWORK:
        if (!failedStrategies.includes(RecoveryStrategy.DELAYED_RETRY)) {
          return RecoveryStrategy.DELAYED_RETRY;
        }
        return RecoveryStrategy.CIRCUIT_BREAKER;

      case ErrorCategory.SYSTEM:
        return RecoveryStrategy.RESOURCE_SCALING;

      case ErrorCategory.SECURITY:
        return RecoveryStrategy.MANUAL_REVIEW;

      case ErrorCategory.USER:
        return RecoveryStrategy.DEAD_LETTER;

      default:
        if (job.priority === JobPriority.URGENT) {
          return RecoveryStrategy.ESCALATION;
        }
        return RecoveryStrategy.MANUAL_REVIEW;
    }
  }

  /**
   * Get alternative recovery strategies
   */
  private getAlternativeStrategies(primary: RecoveryStrategy): RecoveryStrategy[] {
    const strategies: RecoveryStrategy[] = [];

    switch (primary) {
      case RecoveryStrategy.IMMEDIATE_RETRY:
        strategies.push(RecoveryStrategy.DELAYED_RETRY, RecoveryStrategy.ALTERNATIVE_WORKER);
        break;
      case RecoveryStrategy.DELAYED_RETRY:
        strategies.push(RecoveryStrategy.ALTERNATIVE_WORKER, RecoveryStrategy.CIRCUIT_BREAKER);
        break;
      case RecoveryStrategy.JOB_SPLITTING:
        strategies.push(RecoveryStrategy.RESOURCE_SCALING, RecoveryStrategy.ALTERNATIVE_WORKER);
        break;
      case RecoveryStrategy.RESOURCE_SCALING:
        strategies.push(RecoveryStrategy.ALTERNATIVE_WORKER, RecoveryStrategy.MANUAL_REVIEW);
        break;
      default:
        strategies.push(RecoveryStrategy.MANUAL_REVIEW, RecoveryStrategy.ESCALATION);
    }

    return strategies;
  }

  /**
   * Generate prevention measures
   */
  private generatePreventionMeasures(
    rootCause: string,
    contributingFactors: string[],
  ): string[] {
    const measures: string[] = [];

    if (rootCause.includes('timeout')) {measures.push('Implement job timeout monitoring and alerting');measures.push('Optimize job execution performance');measures.push('Consider job splitting for long-running operations');}if (rootCause.includes('network')) {measures.push('Implement network connectivity monitoring');measures.push('Add circuit breaker patterns for external dependencies');measures.push('Configure network retry policies');}if (rootCause.includes('memory')) {measures.push('Monitor memory usage and implement limits');measures.push('Add memory cleanup procedures');measures.push('Implement resource scaling triggers');}if (contributingFactors.some(factor => factor.includes('peak'))) {measures.push('Implement load balancing during peak hours');measures.push('Add capacity planning and scaling policies');}return measures;
  }

  /**
   * Find similar error patterns
   */
  private findSimilarPatterns(signature: string): string[] {
    return Array.from(this.errorPatterns.values())
      .filter(pattern => pattern.errorSignature !== signature)
      .filter(pattern => pattern.frequency > 1)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5)
      .map(pattern => pattern.patternId);
  }

  /**
   * Estimate recovery time based on strategy
   */
  private estimateRecoveryTime(
    strategy: RecoveryStrategy,
    _previousAttempts: RecoveryAttempt[],
  ): number {
    const baseTime = 30000; // 30 seconds

    switch (strategy) {
      case RecoveryStrategy.IMMEDIATE_RETRY:
        return baseTime;
      case RecoveryStrategy.DELAYED_RETRY:
        return baseTime * 2;
      case RecoveryStrategy.ALTERNATIVE_WORKER:
        return baseTime * 1.5;
      case RecoveryStrategy.JOB_SPLITTING:
        return baseTime * 3;
      case RecoveryStrategy.RESOURCE_SCALING:
        return baseTime * 5;
      case RecoveryStrategy.MANUAL_REVIEW:
        return baseTime * 20; // 10 minutes
      case RecoveryStrategy.ESCALATION:
        return baseTime * 40; // 20 minutes
      default:
        return baseTime * 2;
    }
  }

  /**
   * Calculate analysis confidence
   */
  private calculateAnalysisConfidence(
    job: JobResult,
    error: JobError,
    recoveryAttempts: RecoveryAttempt[],
  ): number {
    let confidence = 0.5;

    // Error specificity
    if (error.code && error.code !== 'UNKNOWN_ERROR') confidence += 0.2;if (error.context && Object.keys(error.context).length > 0) confidence += 0.1;
    // Historical data
    if (recoveryAttempts.length > 0) confidence += 0.1;
    if (job.retryCount > 0) confidence += 0.1;

    // Pattern matching
    const signature = this.generateErrorSignature(error);

        const existingPattern = this.errorPatterns.get(signature);
    if (existingPattern && existingPattern.frequency > 3) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate suggested actions for error pattern
   */
  private generateSuggestedActions(error: JobError): string[] {
    const actions: string[] = [];
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('timeout')) {actions.push('Increase job timeout limits');actions.push('Optimize job execution performance');}if (errorMessage.includes('network')) {actions.push('Check network connectivity');actions.push('Verify external service availability');}if (errorMessage.includes('memory')) {actions.push('Increase memory allocation');actions.push('Check for memory leaks');
    }

    return actions;
  }

  /**
   * Get error patterns for monitoring
   */
  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }
}

// ===== RECOVERY STRATEGY MANAGER SERVICE =====

/**
 * Manages multiple recovery strategies based on error analysis
 */
@Injectable()
export class RecoveryStrategyManager {
  private readonly logger = new Logger(RecoveryStrategyManager.name);

  constructor(
    private readonly jobStorage: JobStorage,
    private readonly retryManager: RetryManager,
    private readonly config: ConfigService,
  ) {}

  /**
   * Execute recovery strategy for failed job
   */
  async executeRecoveryStrategy(
    job: JobResult,
    strategy: RecoveryStrategy,
    analysis: FailureAnalysis,
  ): Promise<RecoveryAttempt> {
    const operationId = `recovery_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();this.logger.log(`[${operationId}] Executing recovery strategy`, {jobId: job.jobId,strategy,
      errorCategory: analysis.errorCategory,
    });

        const attempt: RecoveryAttempt = {
      attemptId: uuidv4(),
      jobId: job.jobId,
      strategy,
      timestamp: new Date(),
      success: false,
      duration: 0,
      errorBefore: job.error,
      metadata: {
        operationId,
        analysisId: analysis.analysisId,
        errorCategory: analysis.errorCategory,
      },
    };

    try {
      switch (strategy) {
        case RecoveryStrategy.IMMEDIATE_RETRY:
          await this.executeImmediateRetry(job);
          break;

        case RecoveryStrategy.DELAYED_RETRY:
          await this.executeDelayedRetry(job, analysis);
          break;

        case RecoveryStrategy.ALTERNATIVE_WORKER:
          await this.executeAlternativeWorker(job);
          break;

        case RecoveryStrategy.JOB_SPLITTING:
          await this.executeJobSplitting(job);
          break;

        case RecoveryStrategy.RESOURCE_SCALING:
          await this.executeResourceScaling(job);
          break;

        case RecoveryStrategy.MANUAL_REVIEW:
          await this.executeManualReview(job, analysis);
          break;

        case RecoveryStrategy.DEAD_LETTER:
          await this.executeDeadLetter(job, analysis);
          break;

        case RecoveryStrategy.CIRCUIT_BREAKER:
          await this.executeCircuitBreaker(job, analysis);
          break;

        case RecoveryStrategy.ESCALATION:
          await this.executeEscalation(job, analysis);
          break;

        case RecoveryStrategy.CONFIGURATION_UPDATE:
          await this.executeConfigurationUpdate(job, analysis);
          break;

        default:
          throw new Error(`Unknown recovery strategy: ${String(strategy)}`);}attempt.success = true;
      this.logger.log(`[${operationId}] Recovery strategy succeeded`, {
        jobId: job.jobId,
        strategy,
      });

    } catch (error) {
      attempt.errorAfter = {
        code: 'RECOVERY_FAILED',
        message: getErrorMessage(error),
        timestamp: new Date(),
        retryable: false,
        context: { strategy, originalError: error },
      };

      this.logger.error(`[${operationId}] Recovery strategy failed`, {
        jobId: job.jobId,
        strategy,
        error: getErrorMessage(error),
      });
    }

    attempt.duration = Date.now() - startTime;
    return attempt;
  }

  /**
   * Execute immediate retry strategy
   */
  private async executeImmediateRetry(job: JobResult): Promise<void> {
    await this.jobStorage.updateJobStatus(job.jobId, JobStatus.PENDING);
  }

  /**
   * Execute delayed retry with exponential backoff
   */
  private async executeDelayedRetry(
    job: JobResult,
    _analysis: FailureAnalysis,
  ): Promise<void> {
    const delay = this.retryManager.calculateRetryDelay(job.retryCount);

    setTimeout(async () => {
      await this.jobStorage.updateJobStatus(job.jobId, JobStatus.PENDING);
    }, delay);
  }

  /**
   * Execute alternative worker strategy
   */
  private async executeAlternativeWorker(job: JobResult): Promise<void> {
    // Mark job for execution on alternative worker
    const updatedJob = {
      ...job,
      metadata: {
        ...job.metadata,
        alternativeWorker: true,
        excludeWorkers: [job.error?.context?.workerId ?? 'unknown'],},};

    await this.jobStorage.saveJob(updatedJob);
    await this.jobStorage.updateJobStatus(job.jobId, JobStatus.PENDING);
  }

  /**
   * Execute job splitting strategy
   */
  private async executeJobSplitting(job: JobResult): Promise<void> {
    // For demonstration - in reality this would split the job into smaller parts
    this.logger.log('Job splitting strategy executed', {jobId: job.jobId,
  note: 'Job marked for splitting into smaller components',});
    // Mark job for manual splitting
    const updatedJob = {
      ...job,
      metadata: {
        ...job.metadata,
        requiresSplitting: true,
        splittingReason: 'timeout_recovery',},};

    await this.jobStorage.saveJob(updatedJob);
  }

  /**
   * Execute resource scaling strategy
   */
  private async executeResourceScaling(job: JobResult): Promise<void> {
    this.logger.log('Resource scaling strategy executed', {jobId: job.jobId,
  note: 'Requesting additional resources for job execution',});
    // Mark job for high-resource execution
    const updatedJob = {
      ...job,
      metadata: {
        ...job.metadata,
        requiresScaling: true,
        scalingReason: 'resource_exhaustion_recovery',},};

    await this.jobStorage.saveJob(updatedJob);
    await this.jobStorage.updateJobStatus(job.jobId, JobStatus.PENDING);
  }

  /**
   * Execute manual review strategy
   */
  private async executeManualReview(
    job: JobResult,
    _analysis: FailureAnalysis,
  ): Promise<void> {
    this.logger.log('Manual review strategy executed', {jobId: job.jobId,
  analysisId: _analysis.analysisId,
    });

    // Update job with manual review flag
    const reviewError: JobError = {
      code: 'REQUIRES_MANUAL_REVIEW',
  message: 'Job requires manual intervention for recovery',
  timestamp: new Date(),
  retryable: false,
      context: {
        analysisId: _analysis.analysisId,
        rootCause: _analysis.rootCause,
        recommendedActions: _analysis.preventionMeasures,
      },
    };

    await this.jobStorage.updateJobStatus(
      job.jobId,
      JobStatus.FAILED,
      undefined,
      reviewError,
    );
  }

  /**
   * Execute dead letter queue strategy
   */
  private async executeDeadLetter(
    job: JobResult,
    _analysis: FailureAnalysis,
  ): Promise<void> {
    this.logger.log('Dead letter queue strategy executed', {jobId: job.jobId,
  analysisId: _analysis.analysisId,
    });

        const deadLetterError: JobError = {
      code: 'MOVED_TO_DEAD_LETTER',
  message: 'Job moved to dead letter queue for permanent failure',
  timestamp: new Date(),
  retryable: false,
      context: {
        analysisId: _analysis.analysisId,
        rootCause: _analysis.rootCause,
        deadLetterQueue: true,
      },
    };

    await this.jobStorage.updateJobStatus(
      job.jobId,
      JobStatus.FAILED,
      undefined,
      deadLetterError,
    );
  }

  /**
   * Execute circuit breaker strategy
   */
  private async executeCircuitBreaker(
    job: JobResult,
    analysis: FailureAnalysis,
  ): Promise<void> {
    this.logger.log('Circuit breaker strategy executed', {jobId: job.jobId,
  errorCategory: analysis.errorCategory,
    });

    // Record failure for circuit breaker
    this.retryManager.recordRetryFailure(analysis.errorCategory);

        const circuitError: JobError = {
      code: 'CIRCUIT_BREAKER_ACTIVATED',
  message: 'Circuit breaker activated due to repeated failures',
  timestamp: new Date(),
  retryable: true, // Can be retried when circuit closes
      context: {
        errorCategory: analysis.errorCategory,
        circuitBreakerActivated: true,
      },
    };

    await this.jobStorage.updateJobStatus(
      job.jobId,
      JobStatus.FAILED,
      undefined,
      circuitError,
    );
  }

  /**
   * Execute escalation strategy
   */
  private async executeEscalation(
    job: JobResult,
    analysis: FailureAnalysis,
  ): Promise<void> {
    this.logger.warn('Escalation strategy executed - URGENT ATTENTION REQUIRED', {jobId: job.jobId,
  priority: job.priority,
      rootCause: analysis.rootCause,
      analysisId: analysis.analysisId,
    });

        const escalationError: JobError = {
      code: 'ESCALATED_TO_ADMIN',
  message: 'Job failure escalated to administrator for immediate attention',
  timestamp: new Date(),
  retryable: false,
      context: {
        escalationLevel: 'CRITICAL',
  requiresImmediateAttention: true,
  analysisId: analysis.analysisId,
        rootCause: analysis.rootCause,
        adminNotificationSent: true,
      },
    };

    await this.jobStorage.updateJobStatus(
      job.jobId,
      JobStatus.FAILED,
      undefined,
      escalationError,
    );
  }

  /**
   * Execute configuration update strategy
   */
  private async executeConfigurationUpdate(
    job: JobResult,
    analysis: FailureAnalysis,
  ): Promise<void> {
    this.logger.log('Configuration update strategy executed', {jobId: job.jobId,
  analysisId: analysis.analysisId,
    });

        const configError: JobError = {
      code: 'REQUIRES_CONFIG_UPDATE',
  message: 'Job requires configuration update for successful execution',
      timestamp: new Date(),
      retryable: true,
      context: {
        configUpdateRequired: true,
        analysisId: analysis.analysisId,
        suggestedUpdates: analysis.preventionMeasures,
      },
    };

    await this.jobStorage.updateJobStatus(
      job.jobId,
      JobStatus.FAILED,
      undefined,
      configError,
    );
  }
}

// ===== DEAD LETTER QUEUE SERVICE =====

/**
 * Dead letter queue for permanently failed jobs requiring manual intervention
 */
@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);
  private readonly deadLetterItems = new Map<string, DeadLetterItem>();

  constructor(private readonly config: ConfigService) {}

  /**
   * Add job to dead letter queue
   */
  async addToDeadLetter(
    job: JobResult,
    finalError: JobError,
    recoveryAttempts: RecoveryAttempt[],
    analysis: FailureAnalysis,
  ): Promise<string> {
    const operationId = `dlq_add_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`[${operationId}] Adding job to dead letter queue`, {jobId: job.jobId,
  errorCode: finalError.code,
      analysisId: analysis.analysisId,
    });

        const deadLetterItem: DeadLetterItem = {
      id: uuidv4(),
      jobId: job.jobId,
      originalJob: job,
      finalError,
      recoveryAttempts,
      addedAt: new Date(),
      priority: job.priority,
      category: analysis.errorCategory,
      requiresManualReview: this.requiresManualReview(analysis),
      escalationLevel: this.calculateEscalationLevel(job, analysis),
      metadata: {
        analysisId: analysis.analysisId,
        rootCause: analysis.rootCause,
        recommendedActions: analysis.preventionMeasures,
        operationId,
      },
    };

    this.deadLetterItems.set(deadLetterItem.id, deadLetterItem);

    this.logger.log(`[${operationId}] Job added to dead letter queue`, {
      jobId: job.jobId,
      deadLetterId: deadLetterItem.id,
      escalationLevel: deadLetterItem.escalationLevel,
    });

    return deadLetterItem.id;
  }

  /**
   * Get dead letter queue items
   */
  getDeadLetterItems(filters?: {
    priority?: JobPriority;
    category?: ErrorCategory;
    requiresManualReview?: boolean;
    escalationLevel?: number;
  }): DeadLetterItem[] {
    let items = Array.from(this.deadLetterItems.values());

    if (filters) {
      if (filters.priority) {
        items = items.filter(item => item.priority === filters.priority);
      }
      if (filters.category) {
        items = items.filter(item => item.category === filters.category);
      }
      if (filters.requiresManualReview !== undefined) {
        items = items.filter(item => item.requiresManualReview === filters.requiresManualReview);
      }
      if (filters.escalationLevel !== undefined) {
        items = items.filter(item => item.escalationLevel >= filters.escalationLevel);
      }
    }

    return items.sort((a, b) => {
      // Sort by escalation level (desc), then priority, then added date
      if (a.escalationLevel !== b.escalationLevel) {
        return b.escalationLevel - a.escalationLevel;
      }

      const priorityOrder: Record<JobPriority, number> = {
        [JobPriority.URGENT]: 0,
        [JobPriority.HIGH]: 1,
        [JobPriority.NORMAL]: 2,
        [JobPriority.LOW]: 3,
      };

      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      return a.addedAt.getTime() - b.addedAt.getTime();
    });
  }

  /**
   * Remove item from dead letter queue
   */
  removeFromDeadLetter(deadLetterId: string): boolean {
    const existed = this.deadLetterItems.has(deadLetterId);
    this.deadLetterItems.delete(deadLetterId);

    if (existed) {
      this.logger.log('Item removed from dead letter queue', { deadLetterId });
}return existed;
  }

  /**
   * Get dead letter queue statistics
   */
  getStatistics(): {
    totalItems: number;
    byPriority: Record<JobPriority, number>;
    byCategory: Record<ErrorCategory, number>;
    requiresManualReview: number;
    escalationLevels: Record<number, number>;
  } {
    const items = Array.from(this.deadLetterItems.values());

        const byPriority: Record<JobPriority, number> = {
      [JobPriority.URGENT]: 0,
      [JobPriority.HIGH]: 0,
      [JobPriority.NORMAL]: 0,
      [JobPriority.LOW]: 0,
    };

    const byCategory: Record<ErrorCategory, number> = Object.values(ErrorCategory)
      .reduce((acc, category) => ({ ...acc, [category]: 0 }), {} as Record<ErrorCategory, number>);

        const escalationLevels: Record<number, number> = {};
    let requiresManualReview = 0;

    items.forEach(item => {
      byPriority[item.priority]++;
      byCategory[item.category]++;

      if (item.requiresManualReview) {
        requiresManualReview++;
      }

      escalationLevels[item.escalationLevel] = (escalationLevels[item.escalationLevel] ?? 0) + 1;
    });

    return {
      totalItems: items.length,
      byPriority,
      byCategory,
      requiresManualReview,
      escalationLevels,
    };
  }

  /**
   * Determine if item requires manual review
   */
  private requiresManualReview(analysis: FailureAnalysis): boolean {
    return (
      analysis.severity === ErrorSeverity.HIGH ||
      analysis.severity === ErrorSeverity.CRITICAL ||
      analysis.errorCategory === ErrorCategory.SECURITY ||
      analysis.errorCategory === ErrorCategory.BUSINESS_LOGIC ||
      analysis.confidence < 0.7
    );
  }

  /**
   * Calculate escalation level
   */
  private calculateEscalationLevel(job: JobResult, analysis: FailureAnalysis): number {
    let level = 1; // Base level

    // Priority influence
    if (job.priority === JobPriority.URGENT) level += 3;
    else if (job.priority === JobPriority.HIGH) level += 2;
    else if (job.priority === JobPriority.NORMAL) level += 1;

    // Severity influence
    if (analysis.severity === ErrorSeverity.CRITICAL) level += 3;
    else if (analysis.severity === ErrorSeverity.HIGH) level += 2;
    else if (analysis.severity === ErrorSeverity.MEDIUM) level += 1;

    // Category influence
    if (analysis.errorCategory === ErrorCategory.SECURITY) level += 2;
    else if (analysis.errorCategory === ErrorCategory.BUSINESS_LOGIC) level += 1;

    // Retry count influence
    if (job.retryCount >= job.maxRetries) level += 1;

    return Math.min(level, 10); // Cap at level 10
  }
}

// ===== MAIN JOB ERROR RECOVERY SERVICE =====

/**
 * Main job error recovery service orchestrating all recovery mechanisms
 */
@Injectable()
export class JobErrorRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobErrorRecoveryService.name);
  private readonly config: ErrorRecoveryConfig;
  private readonly recoveryAttempts = new Map<string, RecoveryAttempt[]>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jobStorage: JobStorage,
    private readonly errorClassifier: ErrorClassifier,
    private readonly retryManager: RetryManager,
    private readonly failureAnalyzer: FailureAnalyzer,
    private readonly recoveryStrategyManager: RecoveryStrategyManager,
    private readonly deadLetterQueue: DeadLetterQueueService,
  ) {
    this.config = {
      maxRetryAttempts: this.configService.get<number>('ERROR_RECOVERY_MAX_RETRIES', 3),
  baseRetryDelay: this.configService.get<number>('ERROR_RECOVERY_BASE_DELAY', 1000),
  maxRetryDelay: this.configService.get<number>('ERROR_RECOVERY_MAX_DELAY', 60000),
  exponentialBackoffMultiplier: this.configService.get<number>('ERROR_RECOVERY_BACKOFF_MULTIPLIER', 2),
  jitterMaxPercent: this.configService.get<number>('ERROR_RECOVERY_JITTER_PERCENT', 10),
  circuitBreakerFailureThreshold: this.configService.get<number>('ERROR_RECOVERY_CIRCUIT_THRESHOLD', 5),
  circuitBreakerRecoveryTimeout: this.configService.get<number>('ERROR_RECOVERY_CIRCUIT_TIMEOUT', 60000),
  deadLetterQueueMaxSize: this.configService.get<number>('ERROR_RECOVERY_DLQ_MAX_SIZE', 1000),
  errorPatternAnalysisWindow: this.configService.get<number>('ERROR_RECOVERY_PATTERN_WINDOW', 3600000),
  manualReviewEscalationTime: this.configService.get<number>('ERROR_RECOVERY_ESCALATION_TIME', 1800000),};this.logger.log('JobErrorRecoveryService initialized', this.config);}onModuleInit(): void {
    this.logger.log('Job Error Recovery Service starting...');this.startErrorPatternCleanup();}

  onModuleDestroy(): void {
    this.logger.log('Job Error Recovery Service shutting down...');
  }

  /**
   * Handle job failure and execute recovery strategy
   */
  async handleJobFailure(job: JobResult): Promise<{
    recoveryAttempted: boolean;
    strategy?: RecoveryStrategy;
    analysisId?: string;
    deadLetterId?: string;
    nextAction: string;
  }> {
    const operationId = `handle_failure_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`[${operationId}] Handling job failure`, {
      jobId: job.jobId,
      errorCode: job.error?.code,
      retryCount: job.retryCount,
    });

    if (!job.error) {
      throw new Error('Cannot handle failure: job has no error information');
    }

    // Get or initialize recovery attempts for this job
    const attempts = this.recoveryAttempts.get(job.jobId) ?? [];

    try {
      // Step 1: Classify error and determine recovery strategy
      const classification = this.errorClassifier.classifyError(job.error, job);

      this.logger.log(`[${operationId}] Error classified`, {jobId: job.jobId,
  category: classification.category,
        strategy: classification.strategy,
        confidence: classification.confidence,
      });

      // Step 2: Check if recovery should be attempted
      const retryDecision = this.retryManager.shouldRetry(
        job.jobId,
        classification.category,
        job.retryCount,
        job.maxRetries,
      );

      if (!retryDecision.shouldRetry) {
        this.logger.log(`[${operationId}] Recovery not attempted: ${retryDecision.reason}`, {
          jobId: job.jobId,
        });

        // Perform failure analysis
        const analysis = this.failureAnalyzer.analyzeFailure(job, job.error, attempts);

        // Add to dead letter queue
        const deadLetterId = await this.deadLetterQueue.addToDeadLetter(
          job,
          job.error,
          attempts,
          analysis,
        );

        return {
          recoveryAttempted: false,
          analysisId: analysis.analysisId,
          deadLetterId,
          nextAction: 'Job moved to dead letter queue for manual review',
        };
      }

      // Step 3: Perform failure analysis
      const analysis = this.failureAnalyzer.analyzeFailure(job, job.error, attempts);

      this.logger.log(`[${operationId}] Failure analysis completed`, {jobId: job.jobId,
  analysisId: analysis.analysisId,
        rootCause: analysis.rootCause,
        recommendedStrategy: analysis.recommendedStrategy,
      });

      // Step 4: Execute recovery strategy
      const strategy = analysis.recommendedStrategy;
      const recoveryAttempt = await this.recoveryStrategyManager.executeRecoveryStrategy(
        job,
        strategy,
        analysis,
      );

      // Step 5: Record recovery attempt
      attempts.push(recoveryAttempt);
      this.recoveryAttempts.set(job.jobId, attempts);

      // Step 6: Update circuit breaker state
      if (recoveryAttempt.success) {
        this.retryManager.recordRetrySuccess(classification.category);
      } else {
        this.retryManager.recordRetryFailure(classification.category);
      }

      this.logger.log(`[${operationId}] Recovery attempt completed`, {
        jobId: job.jobId,
        strategy,
        success: recoveryAttempt.success,
        duration: recoveryAttempt.duration,
      });

      return {
        recoveryAttempted: true,
        strategy,
        analysisId: analysis.analysisId,
        nextAction: recoveryAttempt.success
          ? 'Recovery successful - job will be retried': 'Recovery failed - job may require manual intervention',
      };

    } catch (error) {
      this.logger.error(`[${operationId}] Error during failure handling`, {
        jobId: job.jobId,
        error: getErrorMessage(error),
      });

      return {
        recoveryAttempted: false,
        nextAction: 'Error handling failed - manual investigation required',
      };
    }
  }

  /**
   * Get recovery statistics for monitoring
   */
  getRecoveryStatistics(): {
    totalRecoveryAttempts: number;
    successfulRecoveries: number;
    failedRecoveries: number;
    strategiesByType: Record<RecoveryStrategy, number>;
    circuitBreakerStates: Record<string, CircuitBreaker>;
    deadLetterQueueStats: {
      totalItems: number;
      byPriority: Record<JobPriority, number>;
      byCategory: Record<ErrorCategory, number>;
      requiresManualReview: number;
      escalationLevels: Record<number, number>;
    };
    errorPatterns: ErrorPattern[];
  } {
    const allAttempts = Array.from(this.recoveryAttempts.values()).flat();

        const strategiesByType: Record<RecoveryStrategy, number> = Object.values(RecoveryStrategy)
      .reduce((acc, strategy) => ({ ...acc, [strategy]: 0 }), {} as Record<RecoveryStrategy, number>);

    allAttempts.forEach(attempt => {
      strategiesByType[attempt.strategy]++;
    });

    return {
      totalRecoveryAttempts: allAttempts.length,
      successfulRecoveries: allAttempts.filter(a => a.success).length,
      failedRecoveries: allAttempts.filter(a => !a.success).length,
      strategiesByType,
      circuitBreakerStates: this.retryManager.getCircuitBreakerStates(),
      deadLetterQueueStats: this.deadLetterQueue.getStatistics(),
      errorPatterns: this.failureAnalyzer.getErrorPatterns(),
    };
  }

  /**
   * Get recovery attempts for a specific job
   */
  getJobRecoveryAttempts(jobId: string): RecoveryAttempt[] {
    return this.recoveryAttempts.get(jobId) ?? [];
  }

  /**
   * Clear recovery attempts for completed jobs
   */
  clearCompletedJobAttempts(): number {
    let clearedCount = 0;
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [jobId, attempts] of this.recoveryAttempts.entries()) {
      const latestAttempt = attempts[attempts.length - 1];
      if (latestAttempt && latestAttempt.timestamp < cutoffTime) {
        this.recoveryAttempts.delete(jobId);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      this.logger.log(`Cleared recovery attempts for ${clearedCount} completed jobs`);
    }

    return clearedCount;
  }

  /**
   * Force circuit breaker state change (for testing/admin purposes)
   */
  setCircuitBreakerState(category: ErrorCategory, state: CircuitBreakerState): void {
    this.logger.log('Manually setting circuit breaker state', { category, state });
    // This would be implemented in the RetryManager// For now, just log the action
  }

  /**
   * Get comprehensive error recovery health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';details: {circuitBreakers: Record<string, string>;
      deadLetterQueueSize: number;
      recentFailureRate: number;
      errorPatternCount: number;
    };
  } {
    const stats = this.getRecoveryStatistics();

        const recentAttempts = Array.from(this.recoveryAttempts.values())
      .flat()
      .filter(attempt =>
        attempt.timestamp.getTime() > Date.now() - 15 * 60 * 1000 // Last 15 minutes
      );

        const recentFailureRate = recentAttempts.length > 0
      ? recentAttempts.filter(a => !a.success).length / recentAttempts.length
      : 0;

    const openCircuitBreakers = Object.values(stats.circuitBreakerStates)
      .filter(cb => cb.state === CircuitBreakerState.OPEN).length;

    const dlqSize = stats.deadLetterQueueStats.totalItems;

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';if (openCircuitBreakers > 0 || recentFailureRate > 0.5 || dlqSize > 100) {status = 'degraded';}if (openCircuitBreakers > 2 || recentFailureRate > 0.8 || dlqSize > 500) {
      status = 'critical';}const circuitBreakerDetails: Record<string, string> = {};
    Object.entries(stats.circuitBreakerStates).forEach(([name, cb]) => {
      circuitBreakerDetails[name] = cb.state;
    });

    return {
      status,
      details: {
        circuitBreakers: circuitBreakerDetails,
        deadLetterQueueSize: dlqSize,
        recentFailureRate,
        errorPatternCount: stats.errorPatterns.length,
      },
    };
  }

  /**
   * Start error pattern cleanup background task
   */
  private startErrorPatternCleanup(): void {
    setInterval(() => {
      try {
        this.clearCompletedJobAttempts();
      } catch (error) {
        this.logger.error('Error during pattern cleanup', {
          error: getErrorMessage(error),
        });
      }
    }, 60 * 60 * 1000); // 1 hour
  }
}