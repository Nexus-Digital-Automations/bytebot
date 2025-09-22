/**
 * Browser-Use API Error Interceptor
 *
 * Comprehensive error handling interceptor for Browser-Use API endpoints that provides
 * intelligent error classification, recovery strategies, response formatting, and monitoring.
 *
 * Features:
 * - Automatic error classification and categorization
 * - Intelligent error recovery with retry mechanisms
 * - Standardized error response formatting
 * - Session and task error correlation
 * - Performance impact monitoring
 * - Security incident detection
 * - Error analytics and reporting
 * - Circuit breaker pattern implementation
 * - Graceful degradation strategies
 *
 * @author Browser-Use API Error Handling Specialist
 * @version 1.0.0
 * @since Browser-Use API Integration
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, timeout, retry, retryWhen, delay, take, concatMap } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  BrowserUseErrorClassificationService,
  BrowserUseError,
  BrowserUseErrorCategory,
  BrowserUseRecoveryAction
} from './browser-use-error-classification.service';
import { ErrorSeverity } from '../../common/error-handling/automation-error-handler.service';

/**
 * Standardized Browser-Use API error response interface
 */
export interface BrowserUseErrorResponse {
  readonly success: false;
  readonly error: {
    readonly id: string;
    readonly code: string;
    readonly category: string;
    readonly severity: string;
    readonly message: string;
    readonly userMessage: string;
    readonly details: Record<string, unknown>;
    readonly timestamp: string;
    readonly traceId: string;
  };
  readonly context: {
    readonly sessionId?: string;
    readonly taskId?: string;
    readonly operation?: string;
    readonly pageUrl?: string;
    readonly retryAttempt?: number;
    readonly maxRetries?: number;
  };
  readonly recovery: {
    readonly attempted: boolean;
    readonly strategy?: string;
    readonly retryable: boolean;
    readonly retryAfterMs?: number;
    readonly recommendations: string[];
  };
  readonly support: {
    readonly documentationUrl?: string;
    readonly contactInfo?: string;
    readonly debugInfo?: Record<string, unknown>;
  };
}

/**
 * Circuit breaker state tracking
 */
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: Date;
  state: 'closed' | 'open' | 'half-open';
  nextAttemptTime?: Date;
}

/**
 * Browser-Use API Error Interceptor
 */
@Injectable()
export class BrowserUseErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(BrowserUseErrorInterceptor.name);
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
  private readonly errorCounts = new Map<string, number>();

  // Configuration
  private readonly REQUEST_TIMEOUT_MS = 300000; // 5 minutes
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT_MS = 60000; // 1 minute
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor(
    private readonly browserUseErrorClassification: BrowserUseErrorClassificationService
  ) {
    this.logger.log('Browser-Use Error Interceptor initialized');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    // Extract operation context
    const operationContext = this.extractOperationContext(request);

    this.logger.debug(`[${operationId}] Browser-Use API request intercepted`, {
      operationId,
      method: request.method,
      url: request.url,
      operation: operationContext.operation,
      sessionId: operationContext.sessionId,
      taskId: operationContext.taskId
    });

    // Check circuit breaker state
    const circuitBreakerKey = `${operationContext.operation}:${operationContext.sessionId}`;
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) {
      this.logger.warn(`[${operationId}] Circuit breaker open for operation`, {
        operationId,
        circuitBreakerKey,
        operation: operationContext.operation
      });

      const errorResponse = this.createCircuitBreakerErrorResponse(operationId, operationContext);
      throw new HttpException(errorResponse, HttpStatus.SERVICE_UNAVAILABLE);
    }

    return next.handle().pipe(
      // Add request timeout
      timeout(this.REQUEST_TIMEOUT_MS),

      // Implement retry logic with exponential backoff
      retryWhen(errors =>
        errors.pipe(
          concatMap((error, attempt) =>
            this.shouldRetry(error, attempt, operationContext)
              ? delay(this.calculateRetryDelay(attempt)).pipe(
                  tap(() => {
                    this.logger.debug(`[${operationId}] Retrying operation`, {
                      operationId,
                      attempt: attempt + 1,
                      error: error.message,
                      operation: operationContext.operation
                    });
                  })
                )
              : throwError(error)
          ),
          take(this.MAX_RETRY_ATTEMPTS)
        )
      ),

      // Log successful responses
      tap(data => {
        const duration = Date.now() - startTime;
        this.logger.debug(`[${operationId}] Browser-Use API request completed successfully`, {
          operationId,
          duration,
          operation: operationContext.operation,
          sessionId: operationContext.sessionId
        });

        // Reset circuit breaker on success
        this.recordCircuitBreakerSuccess(circuitBreakerKey);
      }),

      // Handle errors
      catchError(error => {
        return this.handleBrowserUseError(
          error,
          operationId,
          operationContext,
          request,
          response,
          startTime
        );
      })
    );
  }

  private async handleBrowserUseError(
    error: any,
    operationId: string,
    operationContext: any,
    request: Request,
    response: Response,
    startTime: number
  ): Promise<Observable<never>> {
    const duration = Date.now() - startTime;

    this.logger.warn(`[${operationId}] Browser-Use API error encountered`, {
      operationId,
      error: error.message,
      operation: operationContext.operation,
      sessionId: operationContext.sessionId,
      duration
    });

    try {
      // Classify the browser-use error
      const browserUseError = await this.browserUseErrorClassification.classifyBrowserUseError(
        error instanceof Error ? error : new Error(String(error)),
        {
          ...operationContext,
          requestId: operationId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          endpoint: request.url,
          method: request.method
        }
      );

      // Record circuit breaker failure
      const circuitBreakerKey = `${operationContext.operation}:${operationContext.sessionId}`;
      this.recordCircuitBreakerFailure(circuitBreakerKey);

      // Get recovery recommendations
      const recoveryAction = this.browserUseErrorClassification.getRecoveryAction(browserUseError);

      // Create standardized error response
      const errorResponse = this.createStandardizedErrorResponse(
        browserUseError,
        operationId,
        operationContext,
        recoveryAction,
        duration
      );

      // Set appropriate HTTP status code
      const httpStatus = this.mapToHttpStatus(browserUseError);

      // Add security headers for security-related errors
      if (this.isSecurityError(browserUseError)) {
        this.addSecurityHeaders(response, browserUseError);
      }

      // Add retry headers for retryable errors
      if (recoveryAction.strategy === 'retry' || recoveryAction.strategy === 'retry_with_backoff') {
        response.setHeader('Retry-After', Math.ceil((recoveryAction.backoffMs || 1000) / 1000));
      }

      this.logger.error(`[${operationId}] Browser-Use API error handled`, {
        operationId,
        errorId: browserUseError.errorId,
        category: browserUseError.browserUseCategory,
        severity: browserUseError.severity,
        httpStatus,
        recoveryStrategy: recoveryAction.strategy,
        duration
      });

      throw new HttpException(errorResponse, httpStatus);

    } catch (handlingError) {
      this.logger.error(`[${operationId}] Error handling failed`, {
        operationId,
        originalError: error.message,
        handlingError: handlingError instanceof Error ? handlingError.message : String(handlingError),
        duration
      });

      // Fallback error response
      const fallbackResponse: BrowserUseErrorResponse = {
        success: false,
        error: {
          id: `error_${Date.now()}`,
          code: 'INTERNAL_ERROR',
          category: 'technical',
          severity: 'high',
          message: 'An unexpected error occurred during browser automation',
          userMessage: 'The browser automation operation failed. Please try again later.',
          details: { originalError: error.message },
          timestamp: new Date().toISOString(),
          traceId: operationId
        },
        context: operationContext,
        recovery: {
          attempted: false,
          retryable: true,
          recommendations: ['Check system status', 'Retry the operation', 'Contact support if problem persists']
        },
        support: {
          documentationUrl: '/docs/api/browser-use',
          contactInfo: 'support@bytebot.com'
        }
      };

      throw new HttpException(fallbackResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private extractOperationContext(request: Request): {
    operation: string;
    sessionId?: string;
    taskId?: string;
    pageUrl?: string;
    selector?: string;
  } {
    const url = request.url;
    const body = request.body || {};
    const params = request.params || {};
    const query = request.query || {};

    // Extract operation from URL pattern
    let operation = 'unknown';
    if (url.includes('/browser/session')) operation = 'session_management';
    else if (url.includes('/browser/navigate')) operation = 'navigate';
    else if (url.includes('/browser/click')) operation = 'click';
    else if (url.includes('/browser/type')) operation = 'type';
    else if (url.includes('/browser/extract')) operation = 'extract';
    else if (url.includes('/browser/screenshot')) operation = 'screenshot';
    else if (url.includes('/browser/wait')) operation = 'wait';
    else if (url.includes('/browser/execute')) operation = 'execute';

    return {
      operation,
      sessionId: params.sessionId || body.sessionId || query.sessionId,
      taskId: body.taskId || query.taskId || request.headers['x-task-id'],
      pageUrl: body.url || body.pageUrl || query.url,
      selector: body.selector || query.selector
    };
  }

  private createStandardizedErrorResponse(
    browserUseError: BrowserUseError,
    operationId: string,
    operationContext: any,
    recoveryAction: BrowserUseRecoveryAction,
    duration: number
  ): BrowserUseErrorResponse {
    return {
      success: false,
      error: {
        id: browserUseError.errorId,
        code: this.getErrorCode(browserUseError.browserUseCategory),
        category: browserUseError.browserUseCategory,
        severity: browserUseError.severity,
        message: browserUseError.message,
        userMessage: this.getUserFriendlyMessage(browserUseError),
        details: {
          originalError: browserUseError.originalError?.message,
          stackTrace: process.env.NODE_ENV === 'development' ? browserUseError.stackTrace : undefined,
          performanceMetrics: browserUseError.performanceMetrics,
          browserInfo: browserUseError.browserInfo,
          duration
        },
        timestamp: browserUseError.timestamp.toISOString(),
        traceId: operationId
      },
      context: {
        sessionId: operationContext.sessionId,
        taskId: operationContext.taskId,
        operation: operationContext.operation,
        pageUrl: browserUseError.pageUrl,
        retryAttempt: browserUseError.recoveryAttempts,
        maxRetries: browserUseError.maxRecoveryAttempts
      },
      recovery: {
        attempted: (browserUseError.recoveryAttempts || 0) > 0,
        strategy: recoveryAction.strategy,
        retryable: recoveryAction.maxRetries > 0,
        retryAfterMs: recoveryAction.backoffMs,
        recommendations: this.getRecoveryRecommendations(browserUseError, recoveryAction)
      },
      support: {
        documentationUrl: this.getDocumentationUrl(browserUseError.browserUseCategory),
        contactInfo: 'support@bytebot.com',
        debugInfo: process.env.NODE_ENV === 'development' ? {
          sessionErrorCount: browserUseError.recoveryAttempts,
          circuitBreakerState: this.getCircuitBreakerState(`${operationContext.operation}:${operationContext.sessionId}`)
        } : undefined
      }
    };
  }

  private createCircuitBreakerErrorResponse(operationId: string, operationContext: any): BrowserUseErrorResponse {
    return {
      success: false,
      error: {
        id: `circuit_breaker_${Date.now()}`,
        code: 'CIRCUIT_BREAKER_OPEN',
        category: 'resource_exhaustion',
        severity: 'high',
        message: 'Circuit breaker is open due to repeated failures',
        userMessage: 'The service is temporarily unavailable due to repeated errors. Please try again later.',
        details: {
          circuitBreakerState: 'open',
          reason: 'Too many consecutive failures'
        },
        timestamp: new Date().toISOString(),
        traceId: operationId
      },
      context: operationContext,
      recovery: {
        attempted: false,
        retryable: true,
        retryAfterMs: this.CIRCUIT_BREAKER_TIMEOUT_MS,
        recommendations: [
          'Wait for the circuit breaker to reset',
          'Check system health status',
          'Try a different session if available'
        ]
      },
      support: {
        documentationUrl: '/docs/api/circuit-breaker',
        contactInfo: 'support@bytebot.com'
      }
    };
  }

  private shouldRetry(error: any, attempt: number, operationContext: any): boolean {
    if (attempt >= this.MAX_RETRY_ATTEMPTS) return false;

    // Don't retry if circuit breaker is open
    const circuitBreakerKey = `${operationContext.operation}:${operationContext.sessionId}`;
    if (this.isCircuitBreakerOpen(circuitBreakerKey)) return false;

    // Retry on specific error types
    const retryableErrors = [
      'TimeoutError',
      'NetworkError',
      'ConnectionError',
      'TemporaryFailure'
    ];

    const errorType = error.constructor.name;
    const errorMessage = error.message?.toLowerCase() || '';

    return retryableErrors.includes(errorType) ||
           errorMessage.includes('timeout') ||
           errorMessage.includes('network') ||
           errorMessage.includes('connection') ||
           errorMessage.includes('temporary');
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
  }

  private isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;

    if (state.state === 'open') {
      if (state.nextAttemptTime && Date.now() > state.nextAttemptTime.getTime()) {
        // Transition to half-open
        state.state = 'half-open';
        this.logger.debug(`Circuit breaker transitioning to half-open: ${key}`);
        return false;
      }
      return true;
    }

    return false;
  }

  private recordCircuitBreakerFailure(key: string): void {
    const state = this.circuitBreakers.get(key) || {
      failures: 0,
      lastFailureTime: new Date(),
      state: 'closed' as const
    };

    state.failures += 1;
    state.lastFailureTime = new Date();

    if (state.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'open';
      state.nextAttemptTime = new Date(Date.now() + this.CIRCUIT_BREAKER_TIMEOUT_MS);
      this.logger.warn(`Circuit breaker opened: ${key}`, {
        failures: state.failures,
        nextAttemptTime: state.nextAttemptTime
      });
    }

    this.circuitBreakers.set(key, state);
  }

  private recordCircuitBreakerSuccess(key: string): void {
    const state = this.circuitBreakers.get(key);
    if (state) {
      state.failures = 0;
      state.state = 'closed';
      delete state.nextAttemptTime;
      this.circuitBreakers.set(key, state);
    }
  }

  private getCircuitBreakerState(key: string): any {
    return this.circuitBreakers.get(key) || { state: 'closed', failures: 0 };
  }

  private mapToHttpStatus(browserUseError: BrowserUseError): HttpStatus {
    switch (browserUseError.severity) {
      case ErrorSeverity.CRITICAL:
        return HttpStatus.INTERNAL_SERVER_ERROR;
      case ErrorSeverity.HIGH:
        if (browserUseError.browserUseCategory.includes('authentication')) {
          return HttpStatus.UNAUTHORIZED;
        }
        if (browserUseError.browserUseCategory.includes('rate_limit')) {
          return HttpStatus.TOO_MANY_REQUESTS;
        }
        return HttpStatus.BAD_REQUEST;
      case ErrorSeverity.MEDIUM:
        if (browserUseError.browserUseCategory.includes('timeout')) {
          return HttpStatus.REQUEST_TIMEOUT;
        }
        if (browserUseError.browserUseCategory.includes('not_found')) {
          return HttpStatus.NOT_FOUND;
        }
        return HttpStatus.UNPROCESSABLE_ENTITY;
      default:
        return HttpStatus.BAD_REQUEST;
    }
  }

  private isSecurityError(browserUseError: BrowserUseError): boolean {
    const securityCategories = [
      BrowserUseErrorCategory.BOT_DETECTION,
      BrowserUseErrorCategory.CAPTCHA_DETECTED,
      BrowserUseErrorCategory.AUTHENTICATION_REQUIRED,
      BrowserUseErrorCategory.SECURITY_CHALLENGE
    ];

    return securityCategories.includes(browserUseError.browserUseCategory);
  }

  private addSecurityHeaders(response: Response, browserUseError: BrowserUseError): void {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');

    if (browserUseError.browserUseCategory === BrowserUseErrorCategory.BOT_DETECTION) {
      response.setHeader('X-RateLimit-Limit', '10');
      response.setHeader('X-RateLimit-Remaining', '0');
      response.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + 3600));
    }
  }

  private getErrorCode(category: BrowserUseErrorCategory): string {
    const errorCodes = {
      [BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED]: 'BROWSER_LAUNCH_FAILED',
      [BrowserUseErrorCategory.BROWSER_CRASH]: 'BROWSER_CRASH',
      [BrowserUseErrorCategory.SESSION_CREATE_FAILED]: 'SESSION_CREATE_FAILED',
      [BrowserUseErrorCategory.SESSION_NOT_FOUND]: 'SESSION_NOT_FOUND',
      [BrowserUseErrorCategory.SESSION_EXPIRED]: 'SESSION_EXPIRED',
      [BrowserUseErrorCategory.NAVIGATION_FAILED]: 'NAVIGATION_FAILED',
      [BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT]: 'PAGE_LOAD_TIMEOUT',
      [BrowserUseErrorCategory.ELEMENT_NOT_FOUND]: 'ELEMENT_NOT_FOUND',
      [BrowserUseErrorCategory.ELEMENT_NOT_INTERACTABLE]: 'ELEMENT_NOT_INTERACTABLE',
      [BrowserUseErrorCategory.BOT_DETECTION]: 'BOT_DETECTION',
      [BrowserUseErrorCategory.RATE_LIMIT_DETECTED]: 'RATE_LIMIT_DETECTED',
      [BrowserUseErrorCategory.MEMORY_EXHAUSTED]: 'MEMORY_EXHAUSTED',
      [BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT]: 'TASK_EXECUTION_TIMEOUT'
    };

    return errorCodes[category] || 'UNKNOWN_ERROR';
  }

  private getUserFriendlyMessage(browserUseError: BrowserUseError): string {
    const userMessages = {
      [BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED]: 'Failed to start the browser. Please try again.',
      [BrowserUseErrorCategory.BROWSER_CRASH]: 'The browser crashed unexpectedly. A new session will be created.',
      [BrowserUseErrorCategory.SESSION_EXPIRED]: 'Your browser session has expired. Please start a new session.',
      [BrowserUseErrorCategory.NAVIGATION_FAILED]: 'Unable to navigate to the requested page. Please check the URL.',
      [BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT]: 'The page took too long to load. Please try again.',
      [BrowserUseErrorCategory.ELEMENT_NOT_FOUND]: 'The requested element was not found on the page.',
      [BrowserUseErrorCategory.BOT_DETECTION]: 'The website detected automated activity. Manual verification may be required.',
      [BrowserUseErrorCategory.RATE_LIMIT_DETECTED]: 'Rate limit exceeded. Please wait before making more requests.',
      [BrowserUseErrorCategory.MEMORY_EXHAUSTED]: 'System resources are exhausted. Please try again later.'
    };

    return userMessages[browserUseError.browserUseCategory] || 'An error occurred during browser automation.';
  }

  private getRecoveryRecommendations(
    browserUseError: BrowserUseError,
    recoveryAction: BrowserUseRecoveryAction
  ): string[] {
    const recommendations: string[] = [];

    if (recoveryAction.maxRetries > 0) {
      recommendations.push('The operation will be retried automatically');
    }

    if (recoveryAction.sessionRestart) {
      recommendations.push('Consider restarting the browser session');
    }

    if (recoveryAction.browserRelaunch) {
      recommendations.push('Browser restart may be required');
    }

    if (recoveryAction.clearCache) {
      recommendations.push('Clear browser cache and cookies');
    }

    if (recoveryAction.waitForStability) {
      recommendations.push('Wait for page to fully load before retrying');
    }

    // Category-specific recommendations
    switch (browserUseError.browserUseCategory) {
      case BrowserUseErrorCategory.BOT_DETECTION:
        recommendations.push('Use different user agent or proxy');
        recommendations.push('Implement human-like delays');
        break;
      case BrowserUseErrorCategory.ELEMENT_NOT_FOUND:
        recommendations.push('Verify element selector');
        recommendations.push('Wait for page content to load');
        break;
      case BrowserUseErrorCategory.MEMORY_EXHAUSTED:
        recommendations.push('Reduce concurrent sessions');
        recommendations.push('Contact support for resource scaling');
        break;
    }

    return recommendations.length > 0 ? recommendations : ['Check system status and retry'];
  }

  private getDocumentationUrl(category: BrowserUseErrorCategory): string {
    const docUrls = {
      [BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED]: '/docs/api/browser-use/browser-management',
      [BrowserUseErrorCategory.SESSION_CREATE_FAILED]: '/docs/api/browser-use/session-management',
      [BrowserUseErrorCategory.NAVIGATION_FAILED]: '/docs/api/browser-use/navigation',
      [BrowserUseErrorCategory.ELEMENT_NOT_FOUND]: '/docs/api/browser-use/element-interaction',
      [BrowserUseErrorCategory.BOT_DETECTION]: '/docs/api/browser-use/anti-detection',
      [BrowserUseErrorCategory.RATE_LIMIT_DETECTED]: '/docs/api/browser-use/rate-limiting'
    };

    return docUrls[category] || '/docs/api/browser-use';
  }

  private generateOperationId(): string {
    return `browser_use_op_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}