/**
 * Browser Automation Error Handling Orchestrator
 *
 * Main orchestrator service that coordinates all error handling components
 * including classification, recovery, monitoring, degradation, and response
 * formatting for a unified error handling experience.
 *
 * Features:
 * - Centralized error processing pipeline
 * - Intelligent decision making for recovery and degradation
 * - Comprehensive monitoring and alerting
 * - Standardized response formatting
 * - Performance optimization and resource management
 * - Real-time health monitoring and diagnostics
 */

import {
  Injectable,
  Logger,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

// Core Services
import {
  BrowserAutomationRecoveryManager,
  RecoveryResult,
} from './recovery/browser-automation-recovery-manager';
import { BrowserAutomationMonitoringService } from './monitoring/browser-automation-monitoring.service';
import {
  BrowserAutomationDegradationManager,
  DegradationLevel,
} from './degradation/browser-automation-degradation-manager';

// Utility Classes
import {
  BrowserAutomationErrorClassifier,
  BrowserAutomationErrorCode,
  BrowserAutomationErrorCategory,
  BrowserAutomationErrorSeverity,
} from './errors/browser-automation-error-classification';

import {
  BrowserAutomationResponseFormatter,
  BrowserAutomationOperationType,
  BrowserAutomationBaseResponse,
} from './response/browser-automation-response-formatter';

// Configuration
import { BrowserAutomationErrorHandlingConfig } from './browser-automation-error-handling.module';

export interface ErrorHandlingContext {
  operationType: BrowserAutomationOperationType;
  sessionId?: string;
  taskId?: string;
  userId?: string;
  correlationId?: string;
  startTime: number;
  metadata?: Record<string, unknown>;
  retryCount?: number;
  previousErrors?: Error[];
}

export interface ErrorHandlingResult<T = unknown> {
  success: boolean;
  data?: T;
  response: BrowserAutomationBaseResponse;
  recoveryApplied: boolean;
  degradationTriggered: boolean;
  fallbackUsed: boolean;
  performanceMetrics: {
    totalDurationMs: number;
    recoveryDurationMs?: number;
    degradationCheckMs?: number;
    monitoringOverheadMs?: number;
  };
}

/**
 * Main orchestrator for browser automation error handling
 */
@Injectable()
export class BrowserAutomationErrorHandlingOrchestrator
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    BrowserAutomationErrorHandlingOrchestrator.name,
  );
  private readonly errorProcessingQueue: Array<{
    error: Error;
    context: ErrorHandlingContext;
    resolve: (result: ErrorHandlingResult) => void;
    reject: (error: Error) => void;
  }> = [];

  private processingInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsFlushInterval?: NodeJS.Timeout;

  private readonly performanceStats = {
    totalErrorsProcessed: 0,
    totalRecoveriesAttempted: 0,
    totalRecoveriesSuccessful: 0,
    totalDegradationsTriggered: 0,
    averageProcessingTimeMs: 0,
    lastHealthCheck: new Date(),
  };

  constructor(
    private readonly recoveryManager: BrowserAutomationRecoveryManager,
    private readonly monitoringService: BrowserAutomationMonitoringService,
    private readonly degradationManager: BrowserAutomationDegradationManager,
    private readonly eventEmitter: EventEmitter2,
    @Inject('ERROR_HANDLING_CONFIG')
    private readonly config: BrowserAutomationErrorHandlingConfig,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Initializing Browser Automation Error Handling Orchestrator',
    );

    // Start background processing
    this.startErrorProcessing();
    this.startHealthMonitoring();
    this.startMetricsCollection();

    // Set up event listeners
    this.setupEventListeners();

    this.logger.log(
      'Browser Automation Error Handling Orchestrator initialized',
    );
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log(
      'Shutting down Browser Automation Error Handling Orchestrator',
    );

    // Stop background processes
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsFlushInterval) {
      clearInterval(this.metricsFlushInterval);
    }

    // Process remaining queue
    await this.flushErrorProcessingQueue();

    this.logger.log(
      'Browser Automation Error Handling Orchestrator shutdown complete',
    );
  }

  /**
   * Main entry point for handling browser automation operations with full error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: Omit<ErrorHandlingContext, 'startTime'>,
  ): Promise<ErrorHandlingResult<T>> {
    const fullContext: ErrorHandlingContext = {
      ...context,
      startTime: Date.now(),
      correlationId: context.correlationId || this.generateCorrelationId(),
      retryCount: context.retryCount || 0,
      previousErrors: context.previousErrors || [],
    };

    const startTime = Date.now();
    const recoveryApplied = false;
    // Track degradation status through execution results
    let fallbackUsed = false;
    let result: T | undefined;
    let finalError: Error | undefined;

    try {
      this.logger.debug(
        `Executing operation with error handling: ${fullContext.operationType}`,
        {
          correlationId: fullContext.correlationId,
          sessionId: fullContext.sessionId,
          taskId: fullContext.taskId,
        },
      );

      // Check for degradation before operation
      const degradationCheckStart = Date.now();
      const executionResult =
        await this.degradationManager.executeWithDegradation(
          fullContext.operationType,
          operation,
          fullContext.metadata,
        );
      const degradationCheckMs = Date.now() - degradationCheckStart;

      if (executionResult.success) {
        result = executionResult.result;
        fallbackUsed = executionResult.fallbackUsed !== undefined;

        // Record successful operation
        this.monitoringService.recordSuccess({
          correlationId: fullContext.correlationId!,
          operationType: fullContext.operationType,
          sessionId: fullContext.sessionId,
          taskId: fullContext.taskId,
          durationMs: Date.now() - startTime,
          additionalContext: {
            degraded: executionResult.degraded,
            fallbackUsed: fallbackUsed,
            qualityReduction: executionResult.qualityReduction,
          },
        });

        // Create success response
        const response =
          BrowserAutomationResponseFormatter.createSuccessResponse(
            fullContext.operationType,
            result,
            {
              correlationId: fullContext.correlationId!,
              sessionId: fullContext.sessionId,
              taskId: fullContext.taskId,
              durationMs: Date.now() - startTime,
              metadata: {
                degraded: executionResult.degraded,
                fallbackUsed: fallbackUsed,
                qualityReduction: executionResult.qualityReduction,
              },
            },
          );

        this.performanceStats.totalErrorsProcessed++;
        this.updateAverageProcessingTime(Date.now() - startTime);

        return {
          success: true,
          data: result,
          response,
          recoveryApplied,
          degradationTriggered: executionResult.degraded,
          fallbackUsed,
          performanceMetrics: {
            totalDurationMs: Date.now() - startTime,
            degradationCheckMs,
            monitoringOverheadMs: 0,
          },
        };
      } else {
        finalError =
          executionResult.error || new Error('Unknown execution error');
      }
    } catch (error) {
      finalError = error instanceof Error ? error : new Error(String(error));
    }

    // Error occurred - process through error handling pipeline
    if (finalError) {
      return await this.processError(finalError, fullContext);
    }

    throw new Error('Unexpected state: no result and no error');
  }

  /**
   * Process an error through the complete error handling pipeline
   */
  async processError(
    error: Error,
    context: ErrorHandlingContext,
  ): Promise<ErrorHandlingResult> {
    const startTime = Date.now();
    let recoveryResult: RecoveryResult | undefined;
    let degradationTriggered = false;

    try {
      this.logger.warn(`Processing error: ${error.message}`, {
        correlationId: context.correlationId,
        operationType: context.operationType,
        sessionId: context.sessionId,
        taskId: context.taskId,
      });

      // 1. Classify the error
      const errorClassification =
        BrowserAutomationErrorClassifier.classifyError(error, context.metadata);

      // 2. Record error for monitoring
      const monitoringStart = Date.now();
      this.monitoringService.recordError(error, {
        correlationId: context.correlationId!,
        operationType: context.operationType,
        sessionId: context.sessionId,
        taskId: context.taskId,
        durationMs: Date.now() - context.startTime,
        additionalContext: context.metadata,
      });
      const monitoringOverheadMs = Date.now() - monitoringStart;

      // 3. Attempt recovery if error is recoverable
      let recoveryApplied = false;
      if (
        this.config.recovery.enabled &&
        this.shouldAttemptRecovery(errorClassification, context)
      ) {
        // Recovery timing tracked in monitoring
        try {
          recoveryResult = await this.recoveryManager.attemptRecovery(
            error,
            context.operationType,
            {
              sessionId: context.sessionId,
              taskId: context.taskId,
              ...context.metadata,
            },
          );

          recoveryApplied = recoveryResult.success;
          this.performanceStats.totalRecoveriesAttempted++;

          if (recoveryResult.success) {
            this.performanceStats.totalRecoveriesSuccessful++;
            this.logger.log(`Recovery successful: ${recoveryResult.strategy}`, {
              correlationId: context.correlationId,
              strategy: recoveryResult.strategy,
              attemptNumber: recoveryResult.attemptNumber,
            });
          }

          // Record recovery attempt
          this.monitoringService.recordRecovery(recoveryResult, {
            correlationId: context.correlationId!,
            operationType: context.operationType,
            sessionId: context.sessionId,
            taskId: context.taskId,
            originalError: errorClassification.code,
          });
        } catch (recoveryError) {
          this.logger.error(
            `Recovery attempt failed: ${recoveryError}`,
            recoveryError,
          );
        }
      }

      // 4. Check if degradation should be triggered
      if (
        this.config.degradation.enabled &&
        this.shouldTriggerDegradation(errorClassification, context)
      ) {
        try {
          const degradationEvaluation =
            await this.degradationManager.evaluateDegradationNeed();

          if (degradationEvaluation.shouldActivate) {
            const degradationResult =
              await this.degradationManager.activateDegradation(
                degradationEvaluation.recommendedLevel,
                degradationEvaluation.trigger,
                degradationEvaluation.strategy,
                {
                  triggeredByError: errorClassification.code,
                  correlationId: context.correlationId,
                  automaticActivation: true,
                },
              );

            degradationTriggered = degradationResult.success;
            this.performanceStats.totalDegradationsTriggered++;

            if (degradationResult.success) {
              this.logger.warn(
                `Degradation activated: ${degradationEvaluation.recommendedLevel}`,
                {
                  correlationId: context.correlationId,
                  trigger: degradationEvaluation.trigger,
                  strategy: degradationEvaluation.strategy,
                },
              );
            }
          }
        } catch (degradationError) {
          this.logger.error(
            `Degradation evaluation failed: ${degradationError}`,
            degradationError,
          );
        }
      }

      // 5. Create error response
      const response = BrowserAutomationResponseFormatter.createErrorResponse(
        context.operationType,
        {
          code: errorClassification.code,
          category: errorClassification.category,
          severity: errorClassification.severity,
          recoverability: errorClassification.recoverability,
          message: error.message,
          context: context.metadata,
          recoveryActions: errorClassification.recoveryStrategies,
          troubleshootingSteps: errorClassification.commonCauses.map(
            (cause) => `Check: ${cause}`,
          ),
        },
        {
          correlationId: context.correlationId!,
          sessionId: context.sessionId,
          taskId: context.taskId,
          durationMs: Date.now() - context.startTime,
          recoveryAttempt: recoveryResult,
          includeStackTrace: this.config.responses.includeStackTrace,
          metrics: {
            retryCount: context.retryCount || 0,
            recoveryAttempts: recoveryResult ? 1 : 0,
          },
        },
      );

      // 6. Emit error event for additional processing
      this.eventEmitter.emit('browser-automation.error.processed', {
        error,
        classification: errorClassification,
        context,
        recoveryResult,
        degradationTriggered,
        response,
      });

      // 7. Update performance statistics
      this.performanceStats.totalErrorsProcessed++;
      this.updateAverageProcessingTime(Date.now() - startTime);

      return {
        success: false,
        response,
        recoveryApplied,
        degradationTriggered,
        fallbackUsed: false,
        performanceMetrics: {
          totalDurationMs: Date.now() - startTime,
          recoveryDurationMs: recoveryResult?.durationMs,
          monitoringOverheadMs,
        },
      };
    } catch (processingError) {
      // Error in error processing - create minimal response
      this.logger.error(
        `Error processing pipeline failed: ${processingError}`,
        processingError,
      );

      const fallbackResponse =
        BrowserAutomationResponseFormatter.createErrorResponse(
          context.operationType,
          new Error(`Error processing failed: ${processingError}`),
          {
            correlationId: context.correlationId!,
            sessionId: context.sessionId,
            taskId: context.taskId,
            durationMs: Date.now() - context.startTime,
            context: {
              originalError: error.message,
              processingError: String(processingError),
            },
          },
        );

      return {
        success: false,
        response: fallbackResponse,
        recoveryApplied: false,
        degradationTriggered,
        fallbackUsed: false,
        performanceMetrics: {
          totalDurationMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Get comprehensive system health status
   */
  getSystemHealth(): {
    overall: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    components: {
      errorHandling: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
      recovery: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
      monitoring: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
      degradation: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    };
    metrics: {
      errorProcessingQueueSize: number;
      totalErrorsProcessed: number;
      recoverySuccessRate: number;
      averageProcessingTimeMs: number;
      currentDegradationLevel: DegradationLevel;
      uptime: number;
      lastHealthCheck: Date;
    };
    alerts: Array<{
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      message: string;
      timestamp: Date;
    }>;
  } {
    const systemHealth = this.monitoringService.getSystemHealthMetrics();
    const degradationState =
      this.degradationManager.getCurrentDegradationState();
    const recoveryStats = this.recoveryManager.getRecoveryStatistics();
    const activeAlerts = this.monitoringService.getActiveAlerts();

    // Determine component health
    const components = {
      errorHandling:
        this.errorProcessingQueue.length > 100
          ? 'UNHEALTHY'
          : ('HEALTHY' as const),
      recovery: recoveryStats.strategies.some((s) => s.circuitState === 'OPEN')
        ? 'DEGRADED'
        : ('HEALTHY' as const),
      monitoring:
        systemHealth.resources.memoryUsagePercent > 90
          ? 'DEGRADED'
          : ('HEALTHY' as const),
      degradation:
        degradationState?.level === DegradationLevel.EMERGENCY
          ? 'UNHEALTHY'
          : degradationState?.level &&
              degradationState.level !== DegradationLevel.NONE
            ? 'DEGRADED'
            : ('HEALTHY' as const),
    };

    // Determine overall health
    const overall = Object.values(components).includes('UNHEALTHY')
      ? 'UNHEALTHY'
      : Object.values(components).includes('DEGRADED')
        ? 'DEGRADED'
        : 'HEALTHY';

    // Calculate recovery success rate
    const recoverySuccessRate =
      this.performanceStats.totalRecoveriesAttempted > 0
        ? this.performanceStats.totalRecoveriesSuccessful /
          this.performanceStats.totalRecoveriesAttempted
        : 1;

    return {
      overall,
      components,
      metrics: {
        errorProcessingQueueSize: this.errorProcessingQueue.length,
        totalErrorsProcessed: this.performanceStats.totalErrorsProcessed,
        recoverySuccessRate,
        averageProcessingTimeMs: this.performanceStats.averageProcessingTimeMs,
        currentDegradationLevel:
          degradationState?.level || DegradationLevel.NONE,
        uptime: process.uptime(),
        lastHealthCheck: this.performanceStats.lastHealthCheck,
      },
      alerts: activeAlerts.map((alert) => ({
        type: 'monitoring_alert',
        severity: alert.severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        message: alert.ruleName,
        timestamp: alert.triggeredAt,
      })),
    };
  }

  /**
   * Get detailed performance metrics
   */
  getPerformanceMetrics() {
    return {
      errorHandling: this.performanceStats,
      monitoring: this.monitoringService.getPerformanceMetrics(),
      recovery: this.recoveryManager.getRecoveryStatistics(),
      degradation: this.degradationManager.getCurrentDegradationState(),
    };
  }

  /**
   * Export comprehensive metrics for external monitoring
   */
  exportMetrics(format: 'prometheus' | 'json' | 'csv' = 'json'): string {
    const metrics = {
      timestamp: new Date().toISOString(),
      systemHealth: this.getSystemHealth(),
      performanceMetrics: this.getPerformanceMetrics(),
      configuration: this.config,
    };

    switch (format) {
      case 'json':
        return JSON.stringify(metrics, null, 2);
      case 'prometheus':
        return this.convertToPrometheusFormat(metrics);
      case 'csv':
        return this.convertToCsvFormat(metrics);
      default:
        return JSON.stringify(metrics, null, 2);
    }
  }

  /**
   * Private implementation methods
   */

  private shouldAttemptRecovery(
    errorClassification: BrowserAutomationErrorCode,
    context: ErrorHandlingContext,
  ): boolean {
    // Don't attempt recovery if max retries exceeded
    if (
      context.retryCount &&
      context.retryCount >= this.config.recovery.maxRetryAttempts
    ) {
      return false;
    }

    // Don't attempt recovery for non-recoverable errors
    if (
      !BrowserAutomationErrorClassifier.isRecoverable(errorClassification.code)
    ) {
      return false;
    }

    // Don't attempt recovery for low severity errors in degraded mode
    const degradationState =
      this.degradationManager.getCurrentDegradationState();
    if (
      degradationState &&
      degradationState.level === DegradationLevel.EMERGENCY &&
      errorClassification.severity === BrowserAutomationErrorSeverity.LOW
    ) {
      return false;
    }

    return true;
  }

  private shouldTriggerDegradation(
    errorClassification: BrowserAutomationErrorCode,
    _context: ErrorHandlingContext,
  ): boolean {
    // Don't trigger degradation if already at emergency level
    const degradationState =
      this.degradationManager.getCurrentDegradationState();
    if (
      degradationState &&
      degradationState.level === DegradationLevel.EMERGENCY
    ) {
      return false;
    }

    // Trigger degradation for critical errors
    if (
      errorClassification.severity === BrowserAutomationErrorSeverity.CRITICAL
    ) {
      return true;
    }

    // Trigger degradation for high severity errors in certain categories
    if (
      errorClassification.severity === BrowserAutomationErrorSeverity.HIGH &&
      [
        BrowserAutomationErrorCategory.BROWSER_PROCESS,
        BrowserAutomationErrorCategory.MEMORY_EXHAUSTION,
        BrowserAutomationErrorCategory.RESOURCE_ALLOCATION,
      ].includes(errorClassification.category)
    ) {
      return true;
    }

    return false;
  }

  private generateCorrelationId(): string {
    return `${this.config.responses.correlationIdPrefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private startErrorProcessing(): void {
    this.processingInterval = setInterval(() => {
      this.processErrorQueue();
    }, 1000); // Process queue every second
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.monitoring.healthCheckIntervalSeconds * 1000);
  }

  private startMetricsCollection(): void {
    this.metricsFlushInterval = setInterval(() => {
      this.flushMetrics();
    }, 300000); // Flush metrics every 5 minutes
  }

  private setupEventListeners(): void {
    this.eventEmitter.on('browser-automation.error.processed', (event) => {
      this.logger.debug('Error processing event received', {
        errorCode: event.classification?.code,
        correlationId: event.context?.correlationId,
      });
    });

    this.eventEmitter.on('monitoring.alert', (event) => {
      this.logger.warn('Monitoring alert triggered', {
        ruleName: event.rule?.name,
        severity: event.rule?.severity,
      });
    });
  }

  private async processErrorQueue(): Promise<void> {
    // In a real implementation, this would process queued errors
    // For now, it's a placeholder for future queue-based processing
  }

  private performHealthCheck(): void {
    this.performanceStats.lastHealthCheck = new Date();

    // Perform basic health checks
    const health = this.getSystemHealth();

    if (health.overall === 'UNHEALTHY') {
      this.logger.error('System health check failed', health);
    } else if (health.overall === 'DEGRADED') {
      this.logger.warn('System health degraded', health);
    } else {
      this.logger.debug('System health check passed', health);
    }
  }

  private flushMetrics(): void {
    try {
      this.exportMetrics(this.config.monitoring.exportFormat);
      // In a real implementation, this would send metrics to external systems
      this.logger.debug('Metrics flushed', {
        format: this.config.monitoring.exportFormat,
      });
    } catch (error) {
      this.logger.error('Failed to flush metrics', error);
    }
  }

  private async flushErrorProcessingQueue(): Promise<void> {
    if (this.errorProcessingQueue.length > 0) {
      this.logger.log(
        `Flushing ${this.errorProcessingQueue.length} queued errors`,
      );
      // Process remaining errors in queue
      this.errorProcessingQueue.length = 0;
    }
  }

  private updateAverageProcessingTime(durationMs: number): void {
    if (this.performanceStats.totalErrorsProcessed === 0) {
      this.performanceStats.averageProcessingTimeMs = durationMs;
    } else {
      this.performanceStats.averageProcessingTimeMs =
        (this.performanceStats.averageProcessingTimeMs + durationMs) / 2;
    }
  }

  private convertToPrometheusFormat(_metrics: any): string {
    let prometheus = '';

    // Add error handling metrics
    prometheus += `browser_automation_errors_processed_total ${this.performanceStats.totalErrorsProcessed}\n`;
    prometheus += `browser_automation_recoveries_attempted_total ${this.performanceStats.totalRecoveriesAttempted}\n`;
    prometheus += `browser_automation_recoveries_successful_total ${this.performanceStats.totalRecoveriesSuccessful}\n`;
    prometheus += `browser_automation_degradations_triggered_total ${this.performanceStats.totalDegradationsTriggered}\n`;
    prometheus += `browser_automation_processing_time_avg_ms ${this.performanceStats.averageProcessingTimeMs}\n`;

    return prometheus;
  }

  private convertToCsvFormat(_metrics: any): string {
    let csv = 'metric_name,value,timestamp\n';

    csv += `errors_processed,${this.performanceStats.totalErrorsProcessed},${new Date().toISOString()}\n`;
    csv += `recoveries_attempted,${this.performanceStats.totalRecoveriesAttempted},${new Date().toISOString()}\n`;
    csv += `recoveries_successful,${this.performanceStats.totalRecoveriesSuccessful},${new Date().toISOString()}\n`;
    csv += `degradations_triggered,${this.performanceStats.totalDegradationsTriggered},${new Date().toISOString()}\n`;
    csv += `avg_processing_time_ms,${this.performanceStats.averageProcessingTimeMs},${new Date().toISOString()}\n`;

    return csv;
  }
}
