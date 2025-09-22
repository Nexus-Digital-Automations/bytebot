/**
 * Error Handling Interceptor - ByteBotd Computer Control Service
 * Comprehensive error handling and recovery for browser automation endpoints
 *
 * Features:
 * - Standardized error response formatting
 * - Error classification and severity assessment
 * - Automatic retry mechanisms for transient failures
 * - Security event detection and logging
 * - Performance impact monitoring
 * - Circuit breaker pattern integration
 * - Recovery strategy execution
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Enterprise Error Handling Implementation
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, timeout, tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

/**
 * Error classification types
 */
enum ErrorType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  SECURITY = 'security',
  BROWSER_AUTOMATION = 'browser_automation',
  SESSION_MANAGEMENT = 'session_management',
}

/**
 * Error severity levels
 */
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Recovery strategy types
 */
enum RecoveryStrategy {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  CIRCUIT_BREAKER = 'circuit_breaker',
  DEGRADE_SERVICE = 'degrade_service',
}

/**
 * Standardized error response interface
 */
interface StandardizedErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    type: ErrorType;
    severity: ErrorSeverity;
    timestamp: string;
    requestId: string;
    path: string;
    method: string;
    userId?: string;
    sessionId?: string;
    details?: any;
    retryAfter?: number;
    recoveryActions?: string[];
    correlationId?: string;
    stack?: string;
  };
  metadata?: {
    processingTime: number;
    retryCount?: number;
    lastRetryAt?: string;
    circuitBreakerState?: string;
  };
}

/**
 * Error handling configuration
 */
interface ErrorHandlingConfig {
  enableRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  timeoutDuration: number;
  enableCircuitBreaker: boolean;
  includeStackTrace: boolean;
  logSensitiveData: boolean;
  enableRecovery: boolean;
}

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);
  private readonly config: ErrorHandlingConfig;
  private readonly retryableErrors = new Set([
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'NETWORK_ERROR',
    'BROWSER_TIMEOUT',
    'SESSION_TIMEOUT',
  ]);

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enableRetry: this.configService.get<boolean>('ERROR_HANDLING_ENABLE_RETRY', true),
      maxRetryAttempts: this.configService.get<number>('ERROR_HANDLING_MAX_RETRY_ATTEMPTS', 3),
      retryDelay: this.configService.get<number>('ERROR_HANDLING_RETRY_DELAY', 1000),
      timeoutDuration: this.configService.get<number>('ERROR_HANDLING_TIMEOUT', 30000),
      enableCircuitBreaker: this.configService.get<boolean>('ERROR_HANDLING_CIRCUIT_BREAKER', true),
      includeStackTrace: this.configService.get<boolean>('ERROR_HANDLING_INCLUDE_STACK', false),
      logSensitiveData: this.configService.get<boolean>('ERROR_HANDLING_LOG_SENSITIVE', false),
      enableRecovery: this.configService.get<boolean>('ERROR_HANDLING_ENABLE_RECOVERY', true),
    };

    this.logger.log('Error Handling Interceptor initialized');
    this.logger.log(`Configuration: ${JSON.stringify(this.config)}`);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Add request context for error tracking
    request.errorContext = {
      requestId,
      startTime,
      endpoint: `${request.method} ${request.url}`,
      userId: request.user?.id,
      sessionId: request.headers['x-session-id'] || request.body?.sessionId,
      userAgent: request.headers['user-agent'],
      ipAddress: this.getClientIp(request),
    };

    let retryCount = 0;

    return next.handle().pipe(
      // Apply timeout
      timeout(this.config.timeoutDuration),

      // Add retry logic for transient failures
      retry({
        count: this.config.maxRetryAttempts,
        delay: (error) => {
          retryCount++;
          if (this.shouldRetry(error)) {
            this.logger.warn(
              `Retrying request ${requestId} (attempt ${retryCount}/${this.config.maxRetryAttempts}): ${error.message}`
            );
            return of(null).pipe(
              tap(() => setTimeout(() => {}, this.config.retryDelay * retryCount))
            );
          }
          return throwError(() => error);
        },
      }),

      // Handle errors
      catchError((error: any) => {
        const processingTime = Date.now() - startTime;

        // Classify and standardize the error
        const standardizedError = this.standardizeError(
          error,
          request.errorContext,
          processingTime,
          retryCount
        );

        // Log the error
        this.logError(standardizedError, request.errorContext);

        // Apply recovery strategies if enabled
        if (this.config.enableRecovery) {
          const recoveryResult = this.applyRecoveryStrategy(error, standardizedError);
          if (recoveryResult) {
            return recoveryResult;
          }
        }

        // Return standardized error response
        return throwError(() => new HttpException(
          standardizedError,
          this.getHttpStatusFromError(error)
        ));
      })
    );
  }

  /**
   * Standardize error into consistent format
   */
  private standardizeError(
    error: any,
    context: any,
    processingTime: number,
    retryCount: number
  ): StandardizedErrorResponse {
    const errorType = this.classifyError(error);
    const severity = this.assessSeverity(error, errorType);
    const recoveryActions = this.getRecoveryActions(error, errorType);

    return {
      success: false,
      error: {
        code: this.getErrorCode(error),
        message: this.sanitizeErrorMessage(error.message || 'An unexpected error occurred'),
        type: errorType,
        severity,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        path: context.endpoint.split(' ')[1],
        method: context.endpoint.split(' ')[0],
        userId: context.userId,
        sessionId: context.sessionId,
        details: this.getErrorDetails(error),
        retryAfter: this.getRetryAfter(error, severity),
        recoveryActions,
        correlationId: this.generateCorrelationId(),
        stack: this.config.includeStackTrace ? error.stack : undefined,
      },
      metadata: {
        processingTime,
        retryCount: retryCount > 0 ? retryCount : undefined,
        lastRetryAt: retryCount > 0 ? new Date().toISOString() : undefined,
        circuitBreakerState: this.getCircuitBreakerState(errorType),
      },
    };
  }

  /**
   * Classify error type
   */
  private classifyError(error: any): ErrorType {
    // Check HTTP exceptions first
    if (error instanceof UnauthorizedException) {
      return ErrorType.AUTHENTICATION;
    }
    if (error instanceof ForbiddenException) {
      return ErrorType.AUTHORIZATION;
    }
    if (error instanceof BadRequestException) {
      return ErrorType.VALIDATION;
    }
    if (error instanceof NotFoundException) {
      return ErrorType.BUSINESS_LOGIC;
    }
    if (error instanceof ServiceUnavailableException) {
      return ErrorType.SYSTEM;
    }

    // Check error codes and messages
    const errorMessage = (error.message || '').toLowerCase();
    const errorCode = error.code || '';

    // Network and connectivity errors
    if (this.retryableErrors.has(errorCode) || errorMessage.includes('network')) {
      return ErrorType.NETWORK;
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT') {
      return ErrorType.TIMEOUT;
    }

    // Rate limiting errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
      return ErrorType.RATE_LIMIT;
    }

    // Security violations
    if (errorMessage.includes('security') || errorMessage.includes('violation') ||
        errorMessage.includes('suspicious') || errorMessage.includes('injection')) {
      return ErrorType.SECURITY;
    }

    // Browser automation specific errors
    if (errorMessage.includes('browser') || errorMessage.includes('puppeteer') ||
        errorMessage.includes('playwright') || errorMessage.includes('selenium')) {
      return ErrorType.BROWSER_AUTOMATION;
    }

    // Session management errors
    if (errorMessage.includes('session') || errorMessage.includes('authentication expired')) {
      return ErrorType.SESSION_MANAGEMENT;
    }

    // Default to system error
    return ErrorType.SYSTEM;
  }

  /**
   * Assess error severity
   */
  private assessSeverity(error: any, errorType: ErrorType): ErrorSeverity {
    // Critical errors
    if (errorType === ErrorType.SECURITY ||
        error instanceof InternalServerErrorException ||
        error.message?.includes('critical')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (errorType === ErrorType.AUTHENTICATION ||
        errorType === ErrorType.AUTHORIZATION ||
        errorType === ErrorType.SYSTEM ||
        error.status >= 500) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (errorType === ErrorType.BUSINESS_LOGIC ||
        errorType === ErrorType.RATE_LIMIT ||
        errorType === ErrorType.TIMEOUT ||
        error.status >= 400) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity errors
    return ErrorSeverity.LOW;
  }

  /**
   * Get recovery actions for error
   */
  private getRecoveryActions(error: any, errorType: ErrorType): string[] {
    const actions: string[] = [];

    switch (errorType) {
      case ErrorType.AUTHENTICATION:
        actions.push('reauthenticate', 'refresh_token', 'check_credentials');
        break;
      case ErrorType.AUTHORIZATION:
        actions.push('check_permissions', 'contact_administrator');
        break;
      case ErrorType.VALIDATION:
        actions.push('validate_input', 'check_request_format');
        break;
      case ErrorType.NETWORK:
        actions.push('check_connectivity', 'retry_request', 'use_fallback_endpoint');
        break;
      case ErrorType.TIMEOUT:
        actions.push('retry_with_backoff', 'increase_timeout', 'check_system_load');
        break;
      case ErrorType.RATE_LIMIT:
        actions.push('wait_and_retry', 'implement_backoff', 'check_rate_limits');
        break;
      case ErrorType.BROWSER_AUTOMATION:
        actions.push('restart_browser_session', 'check_browser_health', 'fallback_to_api');
        break;
      case ErrorType.SESSION_MANAGEMENT:
        actions.push('refresh_session', 'recreate_session', 'cleanup_stale_sessions');
        break;
      case ErrorType.SECURITY:
        actions.push('security_review', 'contact_security_team', 'audit_request');
        break;
      default:
        actions.push('retry_request', 'contact_support');
    }

    return actions;
  }

  /**
   * Apply recovery strategy
   */
  private applyRecoveryStrategy(error: any, standardizedError: StandardizedErrorResponse): Observable<any> | null {
    const errorType = standardizedError.error.type;
    const severity = standardizedError.error.severity;

    // Don't attempt recovery for critical security errors
    if (errorType === ErrorType.SECURITY && severity === ErrorSeverity.CRITICAL) {
      return null;
    }

    // For session errors, attempt session refresh
    if (errorType === ErrorType.SESSION_MANAGEMENT) {
      return this.attemptSessionRecovery(standardizedError);
    }

    // For browser automation errors, attempt browser restart
    if (errorType === ErrorType.BROWSER_AUTOMATION) {
      return this.attemptBrowserRecovery(standardizedError);
    }

    // For rate limit errors, return retry information
    if (errorType === ErrorType.RATE_LIMIT) {
      return this.handleRateLimitRecovery(standardizedError);
    }

    return null;
  }

  /**
   * Attempt session recovery
   */
  private attemptSessionRecovery(errorResponse: StandardizedErrorResponse): Observable<any> | null {
    // In a real implementation, this would attempt to refresh the session
    // For now, return null to indicate no recovery available
    this.logger.warn(`Session recovery attempted for request ${errorResponse.error.requestId}`);
    return null;
  }

  /**
   * Attempt browser recovery
   */
  private attemptBrowserRecovery(errorResponse: StandardizedErrorResponse): Observable<any> | null {
    // In a real implementation, this would attempt to restart the browser session
    // For now, return null to indicate no recovery available
    this.logger.warn(`Browser recovery attempted for request ${errorResponse.error.requestId}`);
    return null;
  }

  /**
   * Handle rate limit recovery
   */
  private handleRateLimitRecovery(errorResponse: StandardizedErrorResponse): Observable<any> | null {
    // Add retry-after header information
    errorResponse.error.retryAfter = 60; // 60 seconds
    this.logger.warn(`Rate limit recovery for request ${errorResponse.error.requestId}: retry after 60 seconds`);
    return null;
  }

  /**
   * Check if error should be retried
   */
  private shouldRetry(error: any): boolean {
    if (!this.config.enableRetry) {
      return false;
    }

    // Don't retry authentication/authorization errors
    if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
      return false;
    }

    // Don't retry validation errors
    if (error instanceof BadRequestException) {
      return false;
    }

    // Don't retry security violations
    if (error.message?.toLowerCase().includes('security')) {
      return false;
    }

    // Retry network and transient errors
    return this.retryableErrors.has(error.code) ||
           error.message?.includes('timeout') ||
           error.message?.includes('network') ||
           error.status >= 500;
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.name) return error.name;
    if (error.status) return `HTTP_${error.status}`;
    return 'UNKNOWN_ERROR';
  }

  /**
   * Sanitize error message for security
   */
  private sanitizeErrorMessage(message: string): string {
    if (!this.config.logSensitiveData) {
      // Remove potential sensitive information
      return message
        .replace(/password[=:]\s*\S+/gi, 'password=***')
        .replace(/token[=:]\s*\S+/gi, 'token=***')
        .replace(/key[=:]\s*\S+/gi, 'key=***')
        .replace(/secret[=:]\s*\S+/gi, 'secret=***');
    }
    return message;
  }

  /**
   * Get error details
   */
  private getErrorDetails(error: any): any {
    const details: any = {};

    if (error.response) {
      details.statusCode = error.response.status;
      details.statusText = error.response.statusText;
    }

    if (error.config) {
      details.url = error.config.url;
      details.method = error.config.method;
    }

    if (error.code) {
      details.code = error.code;
    }

    return Object.keys(details).length > 0 ? details : undefined;
  }

  /**
   * Get retry-after seconds based on error
   */
  private getRetryAfter(error: any, severity: ErrorSeverity): number | undefined {
    // Rate limit errors typically include retry-after
    if (error.headers?.['retry-after']) {
      return parseInt(error.headers['retry-after'], 10);
    }

    // Provide default retry-after based on severity
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 300; // 5 minutes
      case ErrorSeverity.HIGH:
        return 60; // 1 minute
      case ErrorSeverity.MEDIUM:
        return 30; // 30 seconds
      case ErrorSeverity.LOW:
        return 10; // 10 seconds
      default:
        return undefined;
    }
  }

  /**
   * Get circuit breaker state
   */
  private getCircuitBreakerState(errorType: ErrorType): string | undefined {
    if (!this.config.enableCircuitBreaker) {
      return undefined;
    }

    // In a real implementation, this would check the actual circuit breaker state
    // For now, return a placeholder
    return 'unknown';
  }

  /**
   * Get HTTP status from error
   */
  private getHttpStatusFromError(error: any): HttpStatus {
    if (error instanceof HttpException) {
      return error.getStatus();
    }

    if (error.status) {
      return error.status;
    }

    // Default mappings
    if (error.code === 'ETIMEDOUT') {
      return HttpStatus.REQUEST_TIMEOUT;
    }

    if (this.retryableErrors.has(error.code)) {
      return HttpStatus.SERVICE_UNAVAILABLE;
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: StandardizedErrorResponse, context: any): void {
    const logContext = {
      ...context,
      errorType: error.error.type,
      severity: error.error.severity,
      code: error.error.code,
    };

    switch (error.error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error(`Critical error: ${error.error.message}`, logContext);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error(`High severity error: ${error.error.message}`, logContext);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn(`Medium severity error: ${error.error.message}`, logContext);
        break;
      case ErrorSeverity.LOW:
        this.logger.debug(`Low severity error: ${error.error.message}`, logContext);
        break;
      default:
        this.logger.log(`Error: ${error.error.message}`, logContext);
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      '0.0.0.0'
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
}