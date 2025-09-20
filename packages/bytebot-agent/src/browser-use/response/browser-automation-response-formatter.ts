/**
 * Browser Automation Response Formatter
 *
 * Standardized API response formats with consistent error codes, detailed
 * error messages, and actionable troubleshooting information.
 *
 * Features:
 * - Consistent response structure across all endpoints
 * - Detailed error information with context
 * - Success and failure response patterns
 * - Troubleshooting guidance and next steps
 * - Performance metrics and timing data
 * - Correlation IDs for request tracking
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsNumber, IsOptional, IsArray, IsObject, IsEnum, IsDate } from 'class-validator';
import {
  BrowserAutomationErrorCategory,
  BrowserAutomationErrorSeverity,
  BrowserAutomationErrorRecoverability
} from '../errors/browser-automation-error-classification';
import { RecoveryResult } from '../recovery/browser-automation-recovery-manager';

export enum BrowserAutomationResponseStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL_SUCCESS = 'PARTIAL_SUCCESS',
  ERROR = 'ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
  DEGRADED = 'DEGRADED'
}

export enum BrowserAutomationOperationType {
  NAVIGATION = 'NAVIGATION',
  ELEMENT_INTERACTION = 'ELEMENT_INTERACTION',
  DATA_EXTRACTION = 'DATA_EXTRACTION',
  FORM_SUBMISSION = 'FORM_SUBMISSION',
  FILE_UPLOAD = 'FILE_UPLOAD',
  SCREENSHOT = 'SCREENSHOT',
  SESSION_MANAGEMENT = 'SESSION_MANAGEMENT',
  TASK_EXECUTION = 'TASK_EXECUTION',
  HEALTH_CHECK = 'HEALTH_CHECK',
  SYSTEM_INFO = 'SYSTEM_INFO'
}

/**
 * Core response structure for all browser automation operations
 */
export class BrowserAutomationBaseResponse {
  @ApiProperty({
    description: 'Operation success status',
    enum: BrowserAutomationResponseStatus
  })
  @IsEnum(BrowserAutomationResponseStatus)
  status!: BrowserAutomationResponseStatus;

  @ApiProperty({
    description: 'Human-readable message describing the operation result'
  })
  @IsString()
  message!: string;

  @ApiProperty({
    description: 'Unique correlation ID for request tracking and debugging'
  })
  @IsString()
  correlationId!: string;

  @ApiProperty({
    description: 'Response timestamp in ISO format'
  })
  @IsDate()
  timestamp!: Date;

  @ApiProperty({
    description: 'Type of operation performed',
    enum: BrowserAutomationOperationType
  })
  @IsEnum(BrowserAutomationOperationType)
  operationType!: BrowserAutomationOperationType;

  @ApiPropertyOptional({
    description: 'Session ID associated with this operation'
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Task ID associated with this operation'
  })
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiProperty({
    description: 'Performance metrics for the operation'
  })
  @IsObject()
  metrics!: {
    durationMs: number;
    memoryUsageMB?: number;
    cpuUsagePercent?: number;
    networkRequestCount?: number;
    cacheHitRatio?: number;
    retryCount?: number;
    recoveryAttempts?: number;
  };
}

/**
 * Error details structure for failed operations
 */
export class BrowserAutomationErrorDetails {
  @ApiProperty({
    description: 'Specific error code for programmatic handling'
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'Error category for classification',
    enum: BrowserAutomationErrorCategory
  })
  @IsEnum(BrowserAutomationErrorCategory)
  category!: BrowserAutomationErrorCategory;

  @ApiProperty({
    description: 'Error severity level',
    enum: BrowserAutomationErrorSeverity
  })
  @IsEnum(BrowserAutomationErrorSeverity)
  severity!: BrowserAutomationErrorSeverity;

  @ApiProperty({
    description: 'Whether the error can be automatically recovered',
    enum: BrowserAutomationErrorRecoverability
  })
  @IsEnum(BrowserAutomationErrorRecoverability)
  recoverability!: BrowserAutomationErrorRecoverability;

  @ApiProperty({
    description: 'Detailed error message'
  })
  @IsString()
  message!: string;

  @ApiPropertyOptional({
    description: 'Additional error context and metadata'
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Stack trace for debugging (in development mode)'
  })
  @IsOptional()
  @IsString()
  stackTrace?: string;

  @ApiProperty({
    description: 'Suggested recovery actions'
  })
  @IsArray()
  @IsString({ each: true })
  recoveryActions!: string[];

  @ApiProperty({
    description: 'Troubleshooting steps for resolving the issue'
  })
  @IsArray()
  @IsString({ each: true })
  troubleshootingSteps!: string[];

  @ApiPropertyOptional({
    description: 'Links to relevant documentation or resources'
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentationLinks?: string[];

  @ApiPropertyOptional({
    description: 'Recovery attempt results if recovery was attempted'
  })
  @IsOptional()
  @IsObject()
  recoveryAttempt?: {
    attempted: boolean;
    strategy: string;
    success: boolean;
    attemptNumber: number;
    durationMs: number;
    nextAction: string;
  };
}

/**
 * Success response with operation results
 */
export class BrowserAutomationSuccessResponse<T = unknown> extends BrowserAutomationBaseResponse {
  @ApiProperty({
    description: 'Operation result data'
  })
  @IsObject()
  data!: T;

  @ApiPropertyOptional({
    description: 'Additional metadata about the operation'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Warnings that occurred during successful operation'
  })
  @IsOptional()
  @IsArray()
  warnings?: Array<{
    code: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
}

/**
 * Error response with detailed error information
 */
export class BrowserAutomationErrorResponse extends BrowserAutomationBaseResponse {
  @ApiProperty({
    description: 'Detailed error information'
  })
  @IsObject()
  error!: BrowserAutomationErrorDetails;

  @ApiPropertyOptional({
    description: 'Partial results if operation completed partially'
  })
  @IsOptional()
  @IsObject()
  partialData?: unknown;

  @ApiPropertyOptional({
    description: 'Error history for debugging recurring issues'
  })
  @IsOptional()
  @IsArray()
  errorHistory?: Array<{
    timestamp: Date;
    errorCode: string;
    message: string;
    context?: Record<string, unknown>;
  }>;
}

/**
 * Response formatter service for creating consistent API responses
 */
export class BrowserAutomationResponseFormatter {
  private static generateCorrelationId(): string {
    return `ba_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a success response
   */
  static createSuccessResponse<T>(
    operationType: BrowserAutomationOperationType,
    data: T,
    options: {
      message?: string;
      correlationId?: string;
      sessionId?: string;
      taskId?: string;
      durationMs: number;
      metadata?: Record<string, unknown>;
      warnings?: Array<{ code: string; message: string; severity: 'LOW' | 'MEDIUM' | 'HIGH' }>;
      metrics?: Partial<BrowserAutomationBaseResponse['metrics']>;
    }
  ): BrowserAutomationSuccessResponse<T> {
    return {
      status: BrowserAutomationResponseStatus.SUCCESS,
      message: options.message || 'Operation completed successfully',
      correlationId: options.correlationId || this.generateCorrelationId(),
      timestamp: new Date(),
      operationType,
      sessionId: options.sessionId,
      taskId: options.taskId,
      metrics: {
        durationMs: options.durationMs,
        retryCount: 0,
        recoveryAttempts: 0,
        ...options.metrics
      },
      data,
      metadata: options.metadata,
      warnings: options.warnings
    };
  }

  /**
   * Create an error response
   */
  static createErrorResponse(
    operationType: BrowserAutomationOperationType,
    error: Error | BrowserAutomationErrorDetails,
    options: {
      correlationId?: string;
      sessionId?: string;
      taskId?: string;
      durationMs: number;
      context?: Record<string, unknown>;
      partialData?: unknown;
      recoveryAttempt?: RecoveryResult;
      includeStackTrace?: boolean;
      metrics?: Partial<BrowserAutomationBaseResponse['metrics']>;
      errorHistory?: Array<{
        timestamp: Date;
        errorCode: string;
        message: string;
        context?: Record<string, unknown>;
      }>;
    }
  ): BrowserAutomationErrorResponse {
    let errorDetails: BrowserAutomationErrorDetails;

    if (error instanceof Error) {
      // Convert Error to BrowserAutomationErrorDetails
      errorDetails = {
        code: 'UNKNOWN_ERROR',
        category: BrowserAutomationErrorCategory.UNKNOWN,
        severity: BrowserAutomationErrorSeverity.MEDIUM,
        recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
        message: error.message,
        context: options.context,
        stackTrace: options.includeStackTrace ? error.stack : undefined,
        recoveryActions: [
          'Retry the operation',
          'Check system logs for more details',
          'Contact support if issue persists'
        ],
        troubleshootingSteps: [
          'Verify operation parameters',
          'Check network connectivity',
          'Ensure browser service is running',
          'Review system resources'
        ]
      };
    } else {
      errorDetails = {
        ...error,
        stackTrace: options.includeStackTrace ? errorDetails?.stackTrace : undefined
      };
    }

    // Add recovery attempt information if available
    if (options.recoveryAttempt) {
      errorDetails.recoveryAttempt = {
        attempted: true,
        strategy: options.recoveryAttempt.strategy,
        success: options.recoveryAttempt.success,
        attemptNumber: options.recoveryAttempt.attemptNumber,
        durationMs: options.recoveryAttempt.durationMs,
        nextAction: options.recoveryAttempt.nextAction
      };
    }

    return {
      status: BrowserAutomationResponseStatus.ERROR,
      message: `Operation failed: ${errorDetails.message}`,
      correlationId: options.correlationId || this.generateCorrelationId(),
      timestamp: new Date(),
      operationType,
      sessionId: options.sessionId,
      taskId: options.taskId,
      metrics: {
        durationMs: options.durationMs,
        retryCount: options.recoveryAttempt?.attemptNumber || 0,
        recoveryAttempts: options.recoveryAttempt ? 1 : 0,
        ...options.metrics
      },
      error: errorDetails,
      partialData: options.partialData,
      errorHistory: options.errorHistory
    };
  }

  /**
   * Create a partial success response
   */
  static createPartialSuccessResponse<T>(
    operationType: BrowserAutomationOperationType,
    data: T,
    errors: BrowserAutomationErrorDetails[],
    options: {
      message?: string;
      correlationId?: string;
      sessionId?: string;
      taskId?: string;
      durationMs: number;
      metadata?: Record<string, unknown>;
      metrics?: Partial<BrowserAutomationBaseResponse['metrics']>;
    }
  ): BrowserAutomationSuccessResponse<T> & { errors: BrowserAutomationErrorDetails[] } {
    const baseResponse = this.createSuccessResponse(operationType, data, {
      ...options,
      message: options.message || 'Operation completed with some errors'
    });

    return {
      ...baseResponse,
      status: BrowserAutomationResponseStatus.PARTIAL_SUCCESS,
      errors
    };
  }

  /**
   * Create a timeout response
   */
  static createTimeoutResponse(
    operationType: BrowserAutomationOperationType,
    timeoutMs: number,
    options: {
      correlationId?: string;
      sessionId?: string;
      taskId?: string;
      partialData?: unknown;
      context?: Record<string, unknown>;
      metrics?: Partial<BrowserAutomationBaseResponse['metrics']>;
    }
  ): BrowserAutomationErrorResponse {
    const errorDetails: BrowserAutomationErrorDetails = {
      code: 'OPERATION_TIMEOUT',
      category: BrowserAutomationErrorCategory.TIMEOUT,
      severity: BrowserAutomationErrorSeverity.MEDIUM,
      recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
      message: `Operation timed out after ${timeoutMs}ms`,
      context: {
        timeoutMs,
        ...options.context
      },
      recoveryActions: [
        'Increase timeout value',
        'Retry with optimized parameters',
        'Break down operation into smaller steps'
      ],
      troubleshootingSteps: [
        'Check network connectivity',
        'Verify server response time',
        'Review operation complexity',
        'Monitor system resources'
      ]
    };

    return {
      status: BrowserAutomationResponseStatus.TIMEOUT,
      message: `Operation timed out after ${timeoutMs}ms`,
      correlationId: options.correlationId || this.generateCorrelationId(),
      timestamp: new Date(),
      operationType,
      sessionId: options.sessionId,
      taskId: options.taskId,
      metrics: {
        durationMs: timeoutMs,
        retryCount: 0,
        recoveryAttempts: 0,
        ...options.metrics
      },
      error: errorDetails,
      partialData: options.partialData
    };
  }

  /**
   * Create a cancelled response
   */
  static createCancelledResponse(
    operationType: BrowserAutomationOperationType,
    reason: string,
    options: {
      correlationId?: string;
      sessionId?: string;
      taskId?: string;
      durationMs: number;
      partialData?: unknown;
      metrics?: Partial<BrowserAutomationBaseResponse['metrics']>;
    }
  ): BrowserAutomationErrorResponse {
    const errorDetails: BrowserAutomationErrorDetails = {
      code: 'OPERATION_CANCELLED',
      category: BrowserAutomationErrorCategory.WORKFLOW_INTERRUPTION,
      severity: BrowserAutomationErrorSeverity.LOW,
      recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
      message: `Operation was cancelled: ${reason}`,
      context: { reason },
      recoveryActions: [
        'Restart the operation if needed',
        'Check cancellation reason',
        'Verify operation parameters'
      ],
      troubleshootingSteps: [
        'Review cancellation trigger',
        'Check user permissions',
        'Verify operation state'
      ]
    };

    return {
      status: BrowserAutomationResponseStatus.CANCELLED,
      message: `Operation cancelled: ${reason}`,
      correlationId: options.correlationId || this.generateCorrelationId(),
      timestamp: new Date(),
      operationType,
      sessionId: options.sessionId,
      taskId: options.taskId,
      metrics: {
        durationMs: options.durationMs,
        retryCount: 0,
        recoveryAttempts: 0,
        ...options.metrics
      },
      error: errorDetails,
      partialData: options.partialData
    };
  }

  /**
   * Create a degraded mode response
   */
  static createDegradedResponse<T>(
    operationType: BrowserAutomationOperationType,
    data: T,
    degradationReason: string,
    options: {
      message?: string;
      correlationId?: string;
      sessionId?: string;
      taskId?: string;
      durationMs: number;
      metadata?: Record<string, unknown>;
      metrics?: Partial<BrowserAutomationBaseResponse['metrics']>;
    }
  ): BrowserAutomationSuccessResponse<T> & { degradationInfo: { reason: string; impact: string } } {
    const baseResponse = this.createSuccessResponse(operationType, data, {
      ...options,
      message: options.message || 'Operation completed in degraded mode'
    });

    return {
      ...baseResponse,
      status: BrowserAutomationResponseStatus.DEGRADED,
      degradationInfo: {
        reason: degradationReason,
        impact: 'Reduced functionality or performance'
      }
    };
  }

  /**
   * Wrap response with additional context for monitoring and debugging
   */
  static wrapWithMonitoringContext<T extends BrowserAutomationBaseResponse>(
    response: T,
    context: {
      requestId?: string;
      userId?: string;
      clientInfo?: Record<string, unknown>;
      environment?: string;
      version?: string;
    }
  ): T & { monitoringContext: typeof context } {
    return {
      ...response,
      monitoringContext: context
    };
  }
}

/**
 * Response validation utilities
 */
export class BrowserAutomationResponseValidator {
  /**
   * Validate response structure
   */
  static validateResponse(response: BrowserAutomationBaseResponse): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!response.status) {
      errors.push('Missing status field');
    }

    if (!response.message) {
      errors.push('Missing message field');
    }

    if (!response.correlationId) {
      errors.push('Missing correlationId field');
    }

    if (!response.timestamp) {
      errors.push('Missing timestamp field');
    }

    if (!response.operationType) {
      errors.push('Missing operationType field');
    }

    if (!response.metrics) {
      errors.push('Missing metrics field');
    } else {
      if (typeof response.metrics.durationMs !== 'number') {
        errors.push('Invalid durationMs in metrics');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize response for external consumption
   */
  static sanitizeResponse<T extends BrowserAutomationBaseResponse>(
    response: T,
    options: {
      removeStackTrace?: boolean;
      removeSensitiveData?: boolean;
      includeDebugInfo?: boolean;
    } = {}
  ): T {
    const sanitized = { ...response };

    // Remove stack trace if requested
    if (options.removeStackTrace && 'error' in sanitized && sanitized.error) {
      delete (sanitized.error as any).stackTrace;
    }

    // Remove sensitive data if requested
    if (options.removeSensitiveData) {
      // Remove any fields that might contain sensitive information
      const sensitiveFields = ['password', 'token', 'key', 'secret'];
      const removeSensitiveFromObject = (obj: any) => {
        if (typeof obj === 'object' && obj !== null) {
          for (const key of Object.keys(obj)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
              delete obj[key];
            } else if (typeof obj[key] === 'object') {
              removeSensitiveFromObject(obj[key]);
            }
          }
        }
      };

      removeSensitiveFromObject(sanitized);
    }

    return sanitized;
  }
}