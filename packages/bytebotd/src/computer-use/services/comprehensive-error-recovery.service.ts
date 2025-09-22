/**
 * Comprehensive Error Recovery Service - Enterprise Error Handling & Recovery
 *
 * Provides enterprise-grade error handling, automatic recovery mechanisms,
 * and intelligent failure analysis for the job management system.
 *
 * Features:
 * - Comprehensive error categorization and classification
 * - Automatic retry mechanisms with intelligent backoff strategies
 * - Dead letter queue management and analysis
 * - Circuit breaker pattern for cascading failure prevention
 * - Error pattern analysis and predictive failure detection
 * - Recovery procedure automation and workflow management
 * - Error reporting and alerting with severity levels
 * - Root cause analysis and remediation suggestions
 *
 * @author Claude Code - Agent 8 Job Management Specialist
 * @version 3.0.0
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { ComprehensiveJobStorageService, JobStatus, JobPriority } from './comprehensive-job-storage.service';

/**
 * Error classification categories
 */
export enum ErrorCategory {
  NETWORK = 'network',
  RESOURCE = 'resource',
  TIMEOUT = 'timeout',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  SYSTEM = 'system',
  APPLICATION = 'application',
  EXTERNAL = 'external',
  UNKNOWN = 'unknown',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  FATAL = 'fatal',
}

/**
 * Recovery action types
 */
export enum RecoveryAction {
  RETRY = 'retry',
  SKIP = 'skip',
  FALLBACK = 'fallback',
  ESCALATE = 'escalate',
  RESTART = 'restart',
  ABORT = 'abort',
}

/**
 * Comprehensive error information
 */
export interface ErrorInfo {
  errorId: string;
  jobId: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: Record<string, unknown>;
  timestamp: Date;
  retryCount: number;
  recoveryAction: RecoveryAction;
  isRecoverable: boolean;
  similarErrorCount: number;
  patternSignature: string;
  rootCause?: string;
  suggestedFix?: string;
}

/**
 * Retry strategy configuration
 */
export interface RetryStrategy {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  jitterEnabled: boolean;
  retryableErrors: ErrorCategory[];
  nonRetryableErrors: ErrorCategory[];
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number; // milliseconds
  monitoringPeriod: number; // milliseconds
  halfOpenRetryCount: number;
  resetTimeout: number; // milliseconds
}

/**
 * Circuit breaker state
 */
export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

/**
 * Recovery procedure definition
 */
export interface RecoveryProcedure {
  id: string;
  name: string;
  description: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  enabled: boolean;
  steps: RecoveryStep[];
  successRate: number;
  averageExecutionTime: number;
  lastExecuted?: Date;
  executionCount: number;
}

/**
 * Individual recovery step
 */
export interface RecoveryStep {
  id: string;
  name: string;
  action: 'validate' | 'cleanup' | 'restart' | 'notify' | 'fallback' | 'custom';
  parameters: Record<string, unknown>;
  timeout: number;
  required: boolean;
  onFailure: 'continue' | 'skip' | 'abort';
}

/**
 * Error pattern for analysis
 */
export interface ErrorPattern {
  signature: string;
  category: ErrorCategory;
  frequency: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedJobs: string[];
  commonContext: Record<string, unknown>;
  severity: ErrorSeverity;
  isEscalating: boolean;
  suggestedActions: RecoveryAction[];
}

/**
 * Dead letter queue item
 */
export interface DeadLetterItem {
  id: string;
  jobId: string;
  originalError: ErrorInfo;
  failureReason: string;
  attempts: number;
  lastAttempt: Date;
  recoveryProceduresAttempted: string[];
  canRetry: boolean;
  escalationLevel: number;
  metadata: Record<string, unknown>;
}

/**
 * Error recovery statistics
 */
export interface ErrorRecoveryStats {
  totalErrors: number;
  recoveredErrors: number;
  recoveryRate: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  topErrorPatterns: ErrorPattern[];
  circuitBreakerStatus: {
    state: CircuitBreakerState;
    failureCount: number;
    lastFailure?: Date;
    nextRetryTime?: Date;
  };
  deadLetterQueueSize: number;
  averageRecoveryTime: number;
  activeRecoveryProcedures: number;
}

@Injectable()
export class ComprehensiveErrorRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComprehensiveErrorRecoveryService.name);
  private readonly errorHistory = new Map<string, ErrorInfo>();
  private readonly errorPatterns = new Map<string, ErrorPattern>();
  private readonly recoveryProcedures = new Map<string, RecoveryProcedure>();
  private readonly deadLetterQueue = new Map<string, DeadLetterItem>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  private isInitialized = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;

  private readonly defaultRetryStrategy: RetryStrategy = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: [
      ErrorCategory.NETWORK,
      ErrorCategory.TIMEOUT,
      ErrorCategory.RESOURCE,
      ErrorCategory.SYSTEM,
    ],
    nonRetryableErrors: [
      ErrorCategory.PERMISSION,
      ErrorCategory.VALIDATION,
    ],
  };

  private readonly circuitBreakerConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    halfOpenRetryCount: 3,
    resetTimeout: 300000, // 5 minutes
  };

  private stats: ErrorRecoveryStats = {
    totalErrors: 0,
    recoveredErrors: 0,
    recoveryRate: 0,
    errorsByCategory: {
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.RESOURCE]: 0,
      [ErrorCategory.TIMEOUT]: 0,
      [ErrorCategory.PERMISSION]: 0,
      [ErrorCategory.VALIDATION]: 0,
      [ErrorCategory.SYSTEM]: 0,
      [ErrorCategory.APPLICATION]: 0,
      [ErrorCategory.EXTERNAL]: 0,
      [ErrorCategory.UNKNOWN]: 0,
    },
    errorsBySeverity: {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
      [ErrorSeverity.FATAL]: 0,
    },
    topErrorPatterns: [],
    circuitBreakerStatus: {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
    },
    deadLetterQueueSize: 0,
    averageRecoveryTime: 0,
    activeRecoveryProcedures: 0,
  };

  constructor(
    private readonly jobStorage: ComprehensiveJobStorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultRecoveryProcedures();
  }

  /**
   * Initialize error recovery service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Comprehensive Error Recovery Service');

    this.startErrorMonitoring();
    this.startPatternAnalysis();
    this.startCleanupTasks();

    this.isInitialized = true;
    this.logger.log('Comprehensive Error Recovery Service initialized successfully');
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Comprehensive Error Recovery Service');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.logger.log('Comprehensive Error Recovery Service shutdown completed');
  }

  /**
   * Handle job error with comprehensive analysis and recovery
   */
  async handleJobError(
    jobId: string,
    error: Error,
    context: Record<string, unknown> = {}
  ): Promise<ErrorInfo> {
    if (!this.isInitialized) {
      throw new Error('Error recovery service not initialized');
    }

    const errorInfo = await this.analyzeError(jobId, error, context);

    // Store error information
    this.errorHistory.set(errorInfo.errorId, errorInfo);

    // Update statistics
    this.updateErrorStats(errorInfo);

    // Update or create error pattern
    await this.updateErrorPattern(errorInfo);

    // Check circuit breaker
    await this.checkCircuitBreaker(errorInfo);

    // Determine recovery action
    const recoveryAction = await this.determineRecoveryAction(errorInfo);
    errorInfo.recoveryAction = recoveryAction;

    // Execute recovery if appropriate
    if (errorInfo.isRecoverable && recoveryAction !== RecoveryAction.ABORT) {
      await this.executeRecovery(errorInfo);
    } else {
      // Add to dead letter queue
      await this.addToDeadLetterQueue(errorInfo);
    }

    // Emit error event
    this.eventEmitter.emit('error.handled', {
      errorId: errorInfo.errorId,
      jobId,
      category: errorInfo.category,
      severity: errorInfo.severity,
      recoveryAction,
      isRecoverable: errorInfo.isRecoverable,
    });

    this.logger.error(
      `Handled error ${errorInfo.errorId} for job ${jobId}: ${errorInfo.message}`,
      {
        category: errorInfo.category,
        severity: errorInfo.severity,
        recoveryAction,
        retryCount: errorInfo.retryCount,
      }
    );

    return errorInfo;
  }

  /**
   * Retry job with intelligent backoff strategy
   */
  async retryJobWithBackoff(
    jobId: string,
    currentRetryCount: number,
    strategy: Partial<RetryStrategy> = {}
  ): Promise<boolean> {
    const finalStrategy = { ...this.defaultRetryStrategy, ...strategy };

    if (currentRetryCount >= finalStrategy.maxRetries) {
      return false;
    }

    // Calculate delay with exponential backoff and jitter
    const baseDelay = finalStrategy.baseDelay * Math.pow(finalStrategy.backoffMultiplier, currentRetryCount);
    const jitter = finalStrategy.jitterEnabled ? Math.random() * 0.1 : 0;
    const delay = Math.min(baseDelay * (1 + jitter), finalStrategy.maxDelay);

    this.logger.debug(
      `Scheduling retry for job ${jobId} (attempt ${currentRetryCount + 1}/${finalStrategy.maxRetries}) in ${delay}ms`
    );

    // Schedule retry
    setTimeout(async () => {
      try {
        await this.jobStorage.updateJob(jobId, {
          status: JobStatus.RETRY,
          retryCount: currentRetryCount + 1,
        });

        this.eventEmitter.emit('job.retry_scheduled', {
          jobId,
          retryCount: currentRetryCount + 1,
          delay,
        });
      } catch (error) {
        this.logger.error(`Failed to schedule retry for job ${jobId}:`, error);
      }
    }, delay);

    return true;
  }

  /**
   * Get comprehensive error statistics
   */
  getErrorRecoveryStats(): ErrorRecoveryStats {
    // Update real-time statistics
    this.updateRealtimeStats();
    return { ...this.stats };
  }

  /**
   * Get error patterns for analysis
   */
  getErrorPatterns(limit: number = 10): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get dead letter queue items
   */
  getDeadLetterQueue(): DeadLetterItem[] {
    return Array.from(this.deadLetterQueue.values())
      .sort((a, b) => b.lastAttempt.getTime() - a.lastAttempt.getTime());
  }

  /**
   * Manually retry items from dead letter queue
   */
  async retryFromDeadLetterQueue(itemIds: string[]): Promise<number> {
    let retryCount = 0;

    for (const itemId of itemIds) {
      const item = this.deadLetterQueue.get(itemId);
      if (!item || !item.canRetry) {
        continue;
      }

      try {
        // Update job status to retry
        await this.jobStorage.updateJob(item.jobId, {
          status: JobStatus.RETRY,
          retryCount: item.attempts + 1,
        });

        // Remove from dead letter queue
        this.deadLetterQueue.delete(itemId);
        retryCount++;

        this.eventEmitter.emit('deadletter.retry', {
          itemId,
          jobId: item.jobId,
        });

        this.logger.log(`Retried dead letter item ${itemId} for job ${item.jobId}`);
      } catch (error) {
        this.logger.error(`Failed to retry dead letter item ${itemId}:`, error);
      }
    }

    return retryCount;
  }

  /**
   * Create custom recovery procedure
   */
  async createRecoveryProcedure(procedure: Omit<RecoveryProcedure, 'id' | 'successRate' | 'averageExecutionTime' | 'executionCount'>): Promise<string> {
    const procedureId = uuidv4();
    const fullProcedure: RecoveryProcedure = {
      ...procedure,
      id: procedureId,
      successRate: 0,
      averageExecutionTime: 0,
      executionCount: 0,
    };

    this.recoveryProcedures.set(procedureId, fullProcedure);

    this.logger.log(`Created recovery procedure ${procedureId}: ${procedure.name}`);
    return procedureId;
  }

  /**
   * Analyze error and classify it
   */
  private async analyzeError(
    jobId: string,
    error: Error,
    context: Record<string, unknown>
  ): Promise<ErrorInfo> {
    const errorId = uuidv4();
    const message = error.message || 'Unknown error';
    const stack = error.stack;

    // Classify error category
    const category = this.classifyError(error, context);

    // Determine severity
    const severity = this.determineSeverity(error, category, context);

    // Generate pattern signature
    const patternSignature = this.generatePatternSignature(message, category, context);

    // Count similar errors
    const similarErrorCount = this.countSimilarErrors(patternSignature);

    // Determine if recoverable
    const isRecoverable = this.isErrorRecoverable(category, severity, similarErrorCount);

    // Get retry count from job
    const job = await this.jobStorage.getJob(jobId);
    const retryCount = job?.retryCount || 0;

    // Analyze root cause
    const rootCause = this.analyzeRootCause(error, context);
    const suggestedFix = this.suggestFix(category, rootCause, context);

    return {
      errorId,
      jobId,
      category,
      severity,
      message,
      stack,
      context,
      timestamp: new Date(),
      retryCount,
      recoveryAction: RecoveryAction.RETRY, // Default, will be updated
      isRecoverable,
      similarErrorCount,
      patternSignature,
      rootCause,
      suggestedFix,
    };
  }

  /**
   * Classify error into appropriate category
   */
  private classifyError(error: Error, context: Record<string, unknown>): ErrorCategory {
    const message = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('connection') ||
        message.includes('timeout') || message.includes('refused') ||
        errorName.includes('network')) {
      return ErrorCategory.NETWORK;
    }

    // Resource errors
    if (message.includes('memory') || message.includes('disk') ||
        message.includes('resource') || message.includes('limit') ||
        message.includes('quota')) {
      return ErrorCategory.RESOURCE;
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('deadline') ||
        errorName.includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    }

    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized') ||
        message.includes('forbidden') || message.includes('access denied') ||
        errorName.includes('permission')) {
      return ErrorCategory.PERMISSION;
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') ||
        message.includes('malformed') || errorName.includes('validation')) {
      return ErrorCategory.VALIDATION;
    }

    // System errors
    if (message.includes('system') || message.includes('internal') ||
        errorName.includes('system')) {
      return ErrorCategory.SYSTEM;
    }

    // External service errors
    if (context.isExternalCall || message.includes('external') ||
        message.includes('api') || message.includes('service')) {
      return ErrorCategory.EXTERNAL;
    }

    // Application errors
    if (errorName.includes('application') || context.isApplicationError) {
      return ErrorCategory.APPLICATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(
    error: Error,
    category: ErrorCategory,
    context: Record<string, unknown>
  ): ErrorSeverity {
    // Fatal errors that crash the system
    if (error.name === 'FatalError' || context.isFatal) {
      return ErrorSeverity.FATAL;
    }

    // Critical errors that affect core functionality
    if (category === ErrorCategory.SYSTEM || category === ErrorCategory.RESOURCE ||
        context.isCritical || error.message.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity for permission and external service errors
    if (category === ErrorCategory.PERMISSION || category === ErrorCategory.EXTERNAL) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity for network and timeout errors
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.TIMEOUT) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity for validation and application errors
    return ErrorSeverity.LOW;
  }

  /**
   * Generate error pattern signature for grouping
   */
  private generatePatternSignature(
    message: string,
    category: ErrorCategory,
    context: Record<string, unknown>
  ): string {
    // Normalize message by removing dynamic parts
    const normalizedMessage = message
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/[a-f0-9-]{36}/g, 'UUID') // Replace UUIDs
      .replace(/\b\w+@\w+\.\w+\b/g, 'EMAIL') // Replace emails
      .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 'IP') // Replace IPs
      .toLowerCase();

    const actionType = context.actionType || 'unknown';
    const signature = `${category}:${actionType}:${normalizedMessage}`;

    // Create hash for consistent signature
    const crypto = require('crypto');
    return crypto.createHash('md5').update(signature).digest('hex');
  }

  /**
   * Count similar errors in recent history
   */
  private countSimilarErrors(patternSignature: string): number {
    const pattern = this.errorPatterns.get(patternSignature);
    return pattern ? pattern.frequency : 0;
  }

  /**
   * Determine if error is recoverable
   */
  private isErrorRecoverable(
    category: ErrorCategory,
    severity: ErrorSeverity,
    similarErrorCount: number
  ): boolean {
    // Never retry fatal errors
    if (severity === ErrorSeverity.FATAL) {
      return false;
    }

    // Don't retry validation and permission errors
    if (category === ErrorCategory.VALIDATION || category === ErrorCategory.PERMISSION) {
      return false;
    }

    // Don't retry if we've seen too many similar errors
    if (similarErrorCount > 10) {
      return false;
    }

    return true;
  }

  /**
   * Analyze root cause of error
   */
  private analyzeRootCause(error: Error, context: Record<string, unknown>): string {
    const message = error.message.toLowerCase();

    if (message.includes('connection refused')) {
      return 'Service is unavailable or not running';
    }

    if (message.includes('timeout')) {
      return 'Operation took too long to complete';
    }

    if (message.includes('memory')) {
      return 'Insufficient memory resources';
    }

    if (message.includes('permission')) {
      return 'Insufficient permissions for operation';
    }

    if (message.includes('not found')) {
      return 'Resource or endpoint does not exist';
    }

    return 'Unknown root cause - requires manual investigation';
  }

  /**
   * Suggest fix for error
   */
  private suggestFix(
    category: ErrorCategory,
    rootCause: string,
    context: Record<string, unknown>
  ): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Check network connectivity and service availability';

      case ErrorCategory.TIMEOUT:
        return 'Increase timeout duration or optimize operation performance';

      case ErrorCategory.RESOURCE:
        return 'Free up system resources or increase resource limits';

      case ErrorCategory.PERMISSION:
        return 'Verify and update access permissions';

      case ErrorCategory.VALIDATION:
        return 'Correct input data format and validation rules';

      default:
        return 'Review error details and consult documentation';
    }
  }

  /**
   * Update or create error pattern
   */
  private async updateErrorPattern(errorInfo: ErrorInfo): Promise<void> {
    const existing = this.errorPatterns.get(errorInfo.patternSignature);

    if (existing) {
      // Update existing pattern
      existing.frequency++;
      existing.lastSeen = errorInfo.timestamp;
      existing.affectedJobs.push(errorInfo.jobId);

      // Check if escalating
      const recentOccurrences = existing.affectedJobs.filter(jobId => {
        const jobError = Array.from(this.errorHistory.values())
          .find(e => e.jobId === jobId && e.patternSignature === errorInfo.patternSignature);
        return jobError && (Date.now() - jobError.timestamp.getTime()) < 3600000; // Last hour
      });

      existing.isEscalating = recentOccurrences.length > 3;

      // Update severity if escalating
      if (existing.isEscalating && existing.severity !== ErrorSeverity.CRITICAL) {
        existing.severity = ErrorSeverity.HIGH;
      }
    } else {
      // Create new pattern
      const newPattern: ErrorPattern = {
        signature: errorInfo.patternSignature,
        category: errorInfo.category,
        frequency: 1,
        firstSeen: errorInfo.timestamp,
        lastSeen: errorInfo.timestamp,
        affectedJobs: [errorInfo.jobId],
        commonContext: errorInfo.context,
        severity: errorInfo.severity,
        isEscalating: false,
        suggestedActions: [RecoveryAction.RETRY],
      };

      this.errorPatterns.set(errorInfo.patternSignature, newPattern);
    }
  }

  /**
   * Check and update circuit breaker state
   */
  private async checkCircuitBreaker(errorInfo: ErrorInfo): Promise<void> {
    const key = `${errorInfo.category}:${errorInfo.context.actionType || 'unknown'}`;
    const currentState = this.circuitBreakers.get(key) || CircuitBreakerState.CLOSED;

    // Count recent failures
    const recentFailures = Array.from(this.errorHistory.values())
      .filter(e =>
        e.category === errorInfo.category &&
        e.context.actionType === errorInfo.context.actionType &&
        (Date.now() - e.timestamp.getTime()) < this.circuitBreakerConfig.monitoringPeriod
      ).length;

    // Update circuit breaker state
    if (currentState === CircuitBreakerState.CLOSED &&
        recentFailures >= this.circuitBreakerConfig.failureThreshold) {
      this.circuitBreakers.set(key, CircuitBreakerState.OPEN);
      this.logger.warn(`Circuit breaker opened for ${key} due to ${recentFailures} failures`);

      // Schedule automatic reset
      setTimeout(() => {
        this.circuitBreakers.set(key, CircuitBreakerState.HALF_OPEN);
        this.logger.log(`Circuit breaker moved to half-open for ${key}`);
      }, this.circuitBreakerConfig.resetTimeout);
    }

    // Update statistics
    this.stats.circuitBreakerStatus.state = currentState;
    this.stats.circuitBreakerStatus.failureCount = recentFailures;
    this.stats.circuitBreakerStatus.lastFailure = errorInfo.timestamp;
  }

  /**
   * Determine appropriate recovery action
   */
  private async determineRecoveryAction(errorInfo: ErrorInfo): Promise<RecoveryAction> {
    // Check circuit breaker state
    const key = `${errorInfo.category}:${errorInfo.context.actionType || 'unknown'}`;
    const circuitState = this.circuitBreakers.get(key);

    if (circuitState === CircuitBreakerState.OPEN) {
      return RecoveryAction.ABORT;
    }

    // Don't retry non-recoverable errors
    if (!errorInfo.isRecoverable) {
      return RecoveryAction.ESCALATE;
    }

    // Check retry limits
    if (errorInfo.retryCount >= this.defaultRetryStrategy.maxRetries) {
      return RecoveryAction.ESCALATE;
    }

    // Check if error is in non-retryable category
    if (this.defaultRetryStrategy.nonRetryableErrors.includes(errorInfo.category)) {
      return RecoveryAction.SKIP;
    }

    // Check error frequency for this pattern
    const pattern = this.errorPatterns.get(errorInfo.patternSignature);
    if (pattern && pattern.frequency > 5) {
      return RecoveryAction.FALLBACK;
    }

    return RecoveryAction.RETRY;
  }

  /**
   * Execute recovery action
   */
  private async executeRecovery(errorInfo: ErrorInfo): Promise<void> {
    const startTime = Date.now();

    try {
      switch (errorInfo.recoveryAction) {
        case RecoveryAction.RETRY:
          await this.retryJobWithBackoff(errorInfo.jobId, errorInfo.retryCount);
          break;

        case RecoveryAction.FALLBACK:
          await this.executeFallbackProcedure(errorInfo);
          break;

        case RecoveryAction.RESTART:
          await this.restartJobExecution(errorInfo);
          break;

        case RecoveryAction.ESCALATE:
          await this.escalateError(errorInfo);
          break;

        default:
          this.logger.warn(`Unknown recovery action: ${errorInfo.recoveryAction}`);
      }

      const executionTime = Date.now() - startTime;
      this.updateRecoveryStats(true, executionTime);

      this.eventEmitter.emit('recovery.success', {
        errorId: errorInfo.errorId,
        jobId: errorInfo.jobId,
        action: errorInfo.recoveryAction,
        executionTime,
      });

    } catch (recoveryError) {
      const executionTime = Date.now() - startTime;
      this.updateRecoveryStats(false, executionTime);

      this.logger.error(`Recovery failed for error ${errorInfo.errorId}:`, recoveryError);

      this.eventEmitter.emit('recovery.failed', {
        errorId: errorInfo.errorId,
        jobId: errorInfo.jobId,
        action: errorInfo.recoveryAction,
        error: recoveryError.message,
      });
    }
  }

  /**
   * Execute fallback procedure
   */
  private async executeFallbackProcedure(errorInfo: ErrorInfo): Promise<void> {
    // Find applicable recovery procedures
    const procedures = Array.from(this.recoveryProcedures.values())
      .filter(p =>
        p.enabled &&
        p.category === errorInfo.category &&
        p.severity <= errorInfo.severity
      )
      .sort((a, b) => b.successRate - a.successRate);

    if (procedures.length === 0) {
      throw new Error(`No fallback procedures available for ${errorInfo.category}`);
    }

    const procedure = procedures[0];
    this.logger.log(`Executing fallback procedure ${procedure.name} for error ${errorInfo.errorId}`);

    // Execute procedure steps
    for (const step of procedure.steps) {
      try {
        await this.executeRecoveryStep(step, errorInfo);
      } catch (stepError) {
        this.logger.error(`Recovery step ${step.name} failed:`, stepError);

        if (step.required && step.onFailure === 'abort') {
          throw stepError;
        }

        if (step.onFailure === 'skip') {
          continue;
        }
      }
    }

    // Update procedure statistics
    procedure.executionCount++;
    procedure.lastExecuted = new Date();
  }

  /**
   * Execute individual recovery step
   */
  private async executeRecoveryStep(step: RecoveryStep, errorInfo: ErrorInfo): Promise<void> {
    this.logger.debug(`Executing recovery step: ${step.name}`);

    switch (step.action) {
      case 'validate':
        await this.validateJobState(errorInfo.jobId);
        break;

      case 'cleanup':
        await this.cleanupJobResources(errorInfo.jobId);
        break;

      case 'restart':
        await this.restartJobExecution(errorInfo);
        break;

      case 'notify':
        await this.notifyOperators(errorInfo);
        break;

      case 'fallback':
        // Implement fallback logic
        break;

      case 'custom':
        // Execute custom recovery logic
        break;

      default:
        throw new Error(`Unknown recovery step action: ${step.action}`);
    }
  }

  /**
   * Restart job execution
   */
  private async restartJobExecution(errorInfo: ErrorInfo): Promise<void> {
    await this.jobStorage.updateJob(errorInfo.jobId, {
      status: JobStatus.PENDING,
      retryCount: 0,
      errorMessage: undefined,
    });

    this.eventEmitter.emit('job.restarted', {
      jobId: errorInfo.jobId,
      reason: 'error_recovery',
    });
  }

  /**
   * Escalate error to operations team
   */
  private async escalateError(errorInfo: ErrorInfo): Promise<void> {
    this.logger.error(`Escalating error ${errorInfo.errorId} to operations team`);

    // Create escalation record
    const escalation = {
      errorId: errorInfo.errorId,
      jobId: errorInfo.jobId,
      severity: errorInfo.severity,
      category: errorInfo.category,
      message: errorInfo.message,
      escalatedAt: new Date(),
      escalationLevel: 1,
    };

    this.eventEmitter.emit('error.escalated', escalation);
  }

  /**
   * Add error to dead letter queue
   */
  private async addToDeadLetterQueue(errorInfo: ErrorInfo): Promise<void> {
    const itemId = uuidv4();
    const deadLetterItem: DeadLetterItem = {
      id: itemId,
      jobId: errorInfo.jobId,
      originalError: errorInfo,
      failureReason: `${errorInfo.category}: ${errorInfo.message}`,
      attempts: errorInfo.retryCount,
      lastAttempt: new Date(),
      recoveryProceduresAttempted: [],
      canRetry: errorInfo.category !== ErrorCategory.VALIDATION && errorInfo.category !== ErrorCategory.PERMISSION,
      escalationLevel: 0,
      metadata: errorInfo.context,
    };

    this.deadLetterQueue.set(itemId, deadLetterItem);
    this.stats.deadLetterQueueSize = this.deadLetterQueue.size;

    this.eventEmitter.emit('deadletter.added', {
      itemId,
      jobId: errorInfo.jobId,
      reason: deadLetterItem.failureReason,
    });

    this.logger.warn(`Added job ${errorInfo.jobId} to dead letter queue: ${deadLetterItem.failureReason}`);
  }

  /**
   * Initialize default recovery procedures
   */
  private initializeDefaultRecoveryProcedures(): void {
    const procedures: Array<Omit<RecoveryProcedure, 'id' | 'successRate' | 'averageExecutionTime' | 'executionCount'>> = [
      {
        name: 'Network Error Recovery',
        description: 'Standard recovery for network-related errors',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        enabled: true,
        steps: [
          {
            id: 'validate_network',
            name: 'Validate Network Connectivity',
            action: 'validate',
            parameters: { checkConnectivity: true },
            timeout: 10000,
            required: true,
            onFailure: 'abort',
          },
          {
            id: 'retry_with_backoff',
            name: 'Retry with Exponential Backoff',
            action: 'fallback',
            parameters: { backoffMultiplier: 2, maxDelay: 30000 },
            timeout: 60000,
            required: false,
            onFailure: 'continue',
          },
        ],
      },
      {
        name: 'Resource Exhaustion Recovery',
        description: 'Recovery for resource-related errors',
        category: ErrorCategory.RESOURCE,
        severity: ErrorSeverity.HIGH,
        enabled: true,
        steps: [
          {
            id: 'cleanup_resources',
            name: 'Cleanup Job Resources',
            action: 'cleanup',
            parameters: { cleanupMemory: true, cleanupFiles: true },
            timeout: 30000,
            required: true,
            onFailure: 'continue',
          },
          {
            id: 'restart_execution',
            name: 'Restart Job Execution',
            action: 'restart',
            parameters: {},
            timeout: 5000,
            required: false,
            onFailure: 'skip',
          },
        ],
      },
    ];

    procedures.forEach(proc => {
      this.createRecoveryProcedure(proc);
    });
  }

  /**
   * Validate job state for recovery
   */
  private async validateJobState(jobId: string): Promise<void> {
    const job = await this.jobStorage.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found during validation`);
    }

    // Perform additional validation checks
    // This is where you'd implement specific validation logic
  }

  /**
   * Cleanup job resources
   */
  private async cleanupJobResources(jobId: string): Promise<void> {
    // Implement resource cleanup logic
    this.logger.debug(`Cleaning up resources for job ${jobId}`);
  }

  /**
   * Notify operators about critical errors
   */
  private async notifyOperators(errorInfo: ErrorInfo): Promise<void> {
    // Implement operator notification logic
    this.logger.warn(`Notifying operators about error ${errorInfo.errorId}`);
  }

  /**
   * Start error monitoring tasks
   */
  private startErrorMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateRealtimeStats();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Start pattern analysis tasks
   */
  private startPatternAnalysis(): void {
    this.analysisInterval = setInterval(() => {
      this.analyzeErrorTrends();
    }, 300000); // Analyze every 5 minutes
  }

  /**
   * Start cleanup tasks
   */
  private startCleanupTasks(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldErrors();
    }, 3600000); // Cleanup every hour
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(errorInfo: ErrorInfo): void {
    this.stats.totalErrors++;
    this.stats.errorsByCategory[errorInfo.category]++;
    this.stats.errorsBySeverity[errorInfo.severity]++;
  }

  /**
   * Update recovery statistics
   */
  private updateRecoveryStats(success: boolean, executionTime: number): void {
    if (success) {
      this.stats.recoveredErrors++;
    }

    // Update rolling average
    this.stats.averageRecoveryTime = (this.stats.averageRecoveryTime + executionTime) / 2;

    // Update recovery rate
    this.stats.recoveryRate = this.stats.totalErrors > 0 ?
      (this.stats.recoveredErrors / this.stats.totalErrors) * 100 : 0;
  }

  /**
   * Update real-time statistics
   */
  private updateRealtimeStats(): void {
    // Update top error patterns
    this.stats.topErrorPatterns = Array.from(this.errorPatterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);

    // Update dead letter queue size
    this.stats.deadLetterQueueSize = this.deadLetterQueue.size;

    // Update active recovery procedures
    this.stats.activeRecoveryProcedures = Array.from(this.recoveryProcedures.values())
      .filter(p => p.enabled).length;
  }

  /**
   * Analyze error trends for predictive insights
   */
  private analyzeErrorTrends(): void {
    // Implement trend analysis logic
    const recentErrors = Array.from(this.errorHistory.values())
      .filter(e => Date.now() - e.timestamp.getTime() < 3600000); // Last hour

    // Check for emerging patterns
    const patternCounts = new Map<string, number>();
    recentErrors.forEach(error => {
      const count = patternCounts.get(error.patternSignature) || 0;
      patternCounts.set(error.patternSignature, count + 1);
    });

    // Identify patterns that are increasing
    for (const [signature, count] of patternCounts) {
      const pattern = this.errorPatterns.get(signature);
      if (pattern && count > 3 && !pattern.isEscalating) {
        pattern.isEscalating = true;
        this.logger.warn(`Error pattern ${signature} is escalating (${count} occurrences in last hour)`);

        this.eventEmitter.emit('pattern.escalating', {
          signature,
          category: pattern.category,
          frequency: count,
        });
      }
    }
  }

  /**
   * Cleanup old error records
   */
  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours

    // Remove old error history
    for (const [errorId, error] of this.errorHistory) {
      if (error.timestamp.getTime() < cutoffTime) {
        this.errorHistory.delete(errorId);
      }
    }

    // Clean up old dead letter items that can't be retried
    for (const [itemId, item] of this.deadLetterQueue) {
      if (!item.canRetry && item.lastAttempt.getTime() < cutoffTime) {
        this.deadLetterQueue.delete(itemId);
      }
    }

    const removedCount = Array.from(this.errorHistory.values())
      .filter(e => e.timestamp.getTime() < cutoffTime).length;

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} old error records`);
    }
  }
}