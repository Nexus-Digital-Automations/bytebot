/**
 * Global Exception Filter - Enterprise Error Handling & Security Logging
 *
 * This filter provides comprehensive error handling with security event logging,
 * structured error responses, correlation ID tracking, and sensitive data protection.
 * Integrates with monitoring systems and audit logging for enterprise compliance.
 *
 * @fileoverview Enterprise global exception filter with security logging
 * @version 1.0.0
 * @author Global Error Handling & Logging Specialist
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ValidationError } from 'class-validator';
import { ThrottlerException } from '@nestjs/throttler';
import {
  SecurityEventType,
  SecurityErrorCode,
  createSecurityEvent,
  generateEventId,
} from '@bytebot/shared';

/**
 * Error response structure
 */
interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;

  /** Error message */
  message: string | string[];

  /** Error type/name */
  error: string;

  /** Timestamp of error */
  timestamp: string;

  /** Request path */
  path: string;

  /** Request method */
  method: string;

  /** Correlation/operation ID */
  correlationId: string;

  /** Additional error details (development only) */
  details?: any;

  /** Validation errors (if applicable) */
  validation?: ValidationErrorDetails[];

  /** Rate limiting info (if applicable) */
  rateLimit?: {
    limit: number;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  };
}

/**
 * Structured validation error details
 */
interface ValidationErrorDetails {
  /** Field name */
  field: string;

  /** Rejected value */
  value: any;

  /** Validation constraints */
  constraints: Record<string, string>;

  /** Nested validation errors */
  children?: ValidationErrorDetails[];
}

/**
 * Error classification for security monitoring
 */
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Error metadata for logging and monitoring
 */
interface ErrorMetadata {
  /** Error severity level */
  severity: ErrorSeverity;

  /** Security risk score */
  riskScore: number;

  /** Error category */
  category: string;

  /** Whether error contains sensitive data */
  hasSensitiveData: boolean;

  /** Whether this is a security-related error */
  isSecurityError: boolean;

  /** Error frequency tracking */
  frequency?: {
    count: number;
    period: string;
  };
}

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isDevelopment: boolean;
  private readonly enableDetailedErrors: boolean;
  private readonly enableSecurityLogging: boolean;
  private readonly errorCounts = new Map<string, number>();

  constructor(private configService: ConfigService) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
    this.enableDetailedErrors = this.configService.get(
      'ENABLE_DETAILED_ERRORS',
      this.isDevelopment,
    );
    this.enableSecurityLogging = this.configService.get(
      'ENABLE_SECURITY_LOGGING',
      !this.isDevelopment,
    );

    this.logger.log('Global exception filter initialized', {
      isDevelopment: this.isDevelopment,
      enableDetailedErrors: this.enableDetailedErrors,
      enableSecurityLogging: this.enableSecurityLogging,
    });
  }

  /**
   * Handle exceptions and generate structured responses
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const operationId = (request as any).correlationId || generateEventId();
    const timestamp = new Date().toISOString();

    try {
      // Analyze the exception
      const errorInfo = this.analyzeException(exception, request, operationId);

      // Create structured error response
      const errorResponse = this.createErrorResponse(
        errorInfo,
        request,
        timestamp,
        operationId,
      );

      // Log the error with appropriate level
      this.logError(exception, errorInfo, request, operationId);

      // Log security event if applicable
      if (errorInfo.metadata.isSecurityError && this.enableSecurityLogging) {
        this.logSecurityEvent(exception, errorInfo, request, operationId);
      }

      // Track error frequency
      this.trackErrorFrequency(errorInfo, operationId);

      // Set response headers
      this.setErrorHeaders(response, errorInfo);

      // Send response
      response.status(errorInfo.statusCode).json(errorResponse);
    } catch (filterError) {
      // Fallback error handling if the filter itself fails
      this.logger.error(
        `Exception filter failed for operation ${operationId}`,
        {
          operationId,
          filterError: filterError.message,
          originalException:
            exception instanceof Error ? exception.message : String(exception),
          stack: filterError.stack,
        },
      );

      // Send minimal error response
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
        timestamp,
        path: request.url,
        method: request.method,
        correlationId: operationId,
      });
    }
  }

  /**
   * Analyze exception and extract relevant information
   */
  private analyzeException(
    exception: unknown,
    request: Request,
    operationId: string,
  ): {
    statusCode: number;
    message: string | string[];
    error: string;
    metadata: ErrorMetadata;
    validationErrors?: ValidationErrorDetails[];
    rateLimitInfo?: any;
  } {
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let validationErrors: ValidationErrorDetails[] | undefined;
    let rateLimitInfo: any;

    // Determine error type and extract information
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
        error = exception.constructor.name;
      } else if (typeof response === 'object') {
        message = (response as any).message || exception.message;
        error = (response as any).error || exception.constructor.name;

        // Extract validation errors
        if ((response as any).errors || (response as any).validation) {
          validationErrors = this.extractValidationErrors(response as any);
        }

        // Extract rate limit info
        if ((response as any).rateLimitInfo) {
          rateLimitInfo = (response as any).rateLimitInfo;
        }
      }
    } else if (exception instanceof ThrottlerException) {
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      message = 'Rate limit exceeded';
      error = 'Too Many Requests';
    } else if (exception instanceof Error) {
      message = this.enableDetailedErrors
        ? exception.message
        : 'Internal server error';
      error = exception.constructor.name;
    } else {
      message = 'Unknown error occurred';
      error = 'Unknown Error';
    }

    // Generate error metadata
    const metadata = this.generateErrorMetadata(exception, statusCode, request);

    return {
      statusCode,
      message,
      error,
      metadata,
      validationErrors,
      rateLimitInfo,
    };
  }

  /**
   * Create structured error response
   */
  private createErrorResponse(
    errorInfo: any,
    request: Request,
    timestamp: string,
    operationId: string,
  ): ErrorResponse {
    const baseResponse: ErrorResponse = {
      statusCode: errorInfo.statusCode,
      message: errorInfo.message,
      error: errorInfo.error,
      timestamp,
      path: request.url,
      method: request.method,
      correlationId: operationId,
    };

    // Add validation errors if present
    if (errorInfo.validationErrors) {
      baseResponse.validation = errorInfo.validationErrors;
    }

    // Add rate limit info if present
    if (errorInfo.rateLimitInfo) {
      baseResponse.rateLimit = errorInfo.rateLimitInfo;
    }

    // Add detailed information in development
    if (
      this.enableDetailedErrors &&
      errorInfo.metadata.severity !== ErrorSeverity.CRITICAL
    ) {
      baseResponse.details = {
        severity: errorInfo.metadata.severity,
        category: errorInfo.metadata.category,
        riskScore: errorInfo.metadata.riskScore,
        timestamp: new Date().toISOString(),
      };
    }

    return baseResponse;
  }

  /**
   * Extract validation errors from response
   */
  private extractValidationErrors(response: any): ValidationErrorDetails[] {
    const errors = response.errors || response.validation || [];

    return errors.map(
      (error: any): ValidationErrorDetails => ({
        field: error.property || error.field,
        value: error.value,
        constraints: error.constraints || {},
        children: error.children
          ? this.extractValidationErrors({ validation: error.children })
          : undefined,
      }),
    );
  }

  /**
   * Generate error metadata for classification and monitoring
   */
  private generateErrorMetadata(
    exception: unknown,
    statusCode: number,
    request: Request,
  ): ErrorMetadata {
    let severity = ErrorSeverity.MEDIUM;
    let riskScore = 30;
    let category = 'application';
    let hasSensitiveData = false;
    let isSecurityError = false;

    // Classify by status code
    if (statusCode >= 500) {
      severity = ErrorSeverity.HIGH;
      riskScore = 70;
      category = 'server';
    } else if (statusCode >= 400) {
      severity = ErrorSeverity.MEDIUM;
      riskScore = 40;
      category = 'client';
    }

    // Security-related errors
    if (
      statusCode === HttpStatus.UNAUTHORIZED ||
      statusCode === HttpStatus.FORBIDDEN ||
      statusCode === HttpStatus.TOO_MANY_REQUESTS
    ) {
      isSecurityError = true;
      riskScore += 20;
      category = 'security';
    }

    // Check for validation errors (potential security issue)
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'object' && (response as any).validation) {
        isSecurityError = true;
        category = 'validation';
        riskScore += 15;
      }
    }

    // Check for sensitive endpoints
    if (
      request.url.includes('/auth/') ||
      request.url.includes('/password') ||
      request.url.includes('/token')
    ) {
      hasSensitiveData = true;
      riskScore += 10;
    }

    // Check for critical errors
    if (
      exception instanceof Error &&
      (exception.message.includes('database') ||
        exception.message.includes('connection') ||
        exception.message.includes('timeout'))
    ) {
      severity = ErrorSeverity.CRITICAL;
      riskScore = 90;
      category = 'infrastructure';
    }

    return {
      severity,
      riskScore: Math.min(100, riskScore),
      category,
      hasSensitiveData,
      isSecurityError,
    };
  }

  /**
   * Log error with appropriate level and details
   */
  private logError(
    exception: unknown,
    errorInfo: any,
    request: Request,
    operationId: string,
  ): void {
    const logData = {
      operationId,
      statusCode: errorInfo.statusCode,
      error: errorInfo.error,
      message: errorInfo.message,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.get('User-Agent'),
      userId: (request as any).user?.id,
      severity: errorInfo.metadata.severity,
      category: errorInfo.metadata.category,
      riskScore: errorInfo.metadata.riskScore,
      timestamp: new Date().toISOString(),
    };

    // Add stack trace for server errors in development
    if (
      this.isDevelopment &&
      exception instanceof Error &&
      errorInfo.statusCode >= 500
    ) {
      (logData as any).stack = exception.stack;
    }

    // Add validation details if present
    if (errorInfo.validationErrors) {
      (logData as any).validationErrors = errorInfo.validationErrors;
    }

    // Log with appropriate level
    switch (errorInfo.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('CRITICAL ERROR', logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('High severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.debug('Low severity error', logData);
        break;
    }
  }

  /**
   * Log security event for security-related errors
   */
  private logSecurityEvent(
    exception: unknown,
    errorInfo: any,
    request: Request,
    operationId: string,
  ): void {
    try {
      let eventType = SecurityEventType.VALIDATION_FAILED;

      // Map error to security event type
      if (errorInfo.statusCode === HttpStatus.UNAUTHORIZED) {
        eventType = SecurityEventType.ACCESS_DENIED;
      } else if (errorInfo.statusCode === HttpStatus.TOO_MANY_REQUESTS) {
        eventType = SecurityEventType.RATE_LIMIT_EXCEEDED;
      } else if (errorInfo.validationErrors) {
        eventType = SecurityEventType.VALIDATION_FAILED;
      }

      const securityEvent = createSecurityEvent(
        eventType,
        request.url,
        request.method,
        false,
        `Security error: ${errorInfo.message}`,
        {
          operationId,
          statusCode: errorInfo.statusCode,
          errorType: errorInfo.error,
          category: errorInfo.metadata.category,
          severity: errorInfo.metadata.severity,
          hasSensitiveData: errorInfo.metadata.hasSensitiveData,
          validationErrors: errorInfo.validationErrors,
          rateLimitInfo: errorInfo.rateLimitInfo,
        },
        (request as any).user?.id,
        request.ip,
        request.get('User-Agent'),
        (request as any).sessionId,
      );

      this.logger.warn(
        `Security event from exception filter: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
          operationId,
        },
      );
    } catch (error) {
      this.logger.error('Failed to log security event from exception filter', {
        operationId,
        error: error.message,
      });
    }
  }

  /**
   * Track error frequency for pattern analysis
   */
  private trackErrorFrequency(errorInfo: any, operationId: string): void {
    const errorKey = `${errorInfo.error}:${errorInfo.statusCode}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Reset count after 5 minutes
    setTimeout(
      () => {
        const count = this.errorCounts.get(errorKey) || 0;
        if (count > 0) {
          this.errorCounts.set(errorKey, count - 1);
        }
      },
      5 * 60 * 1000,
    );

    // Log if error frequency is high
    if (currentCount > 10) {
      // More than 10 similar errors in 5 minutes
      this.logger.warn(`High error frequency detected`, {
        operationId,
        errorKey,
        frequency: currentCount,
        windowMinutes: 5,
      });
    }
  }

  /**
   * Set error response headers
   */
  private setErrorHeaders(response: Response, errorInfo: any): void {
    // Set correlation ID header
    response.setHeader(
      'X-Correlation-ID',
      response.req?.correlationId || 'unknown',
    );

    // Set error classification headers for monitoring
    response.setHeader('X-Error-Severity', errorInfo.metadata.severity);
    response.setHeader('X-Error-Category', errorInfo.metadata.category);

    // Set cache control for error responses
    if (errorInfo.statusCode >= 500) {
      response.setHeader(
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      );
    }

    // Set retry headers for rate limiting
    if (errorInfo.rateLimitInfo?.retryAfter) {
      response.setHeader('Retry-After', errorInfo.rateLimitInfo.retryAfter);
    }
  }

  /**
   * Get error statistics (for health checks and monitoring)
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    highFrequencyErrors: string[];
  } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    const errorsByType = Object.fromEntries(this.errorCounts);
    const highFrequencyErrors = Array.from(this.errorCounts.entries())
      .filter(([, count]) => count > 5)
      .map(([key]) => key);

    return {
      totalErrors,
      errorsByType,
      highFrequencyErrors,
    };
  }
}

export default GlobalExceptionFilter;
