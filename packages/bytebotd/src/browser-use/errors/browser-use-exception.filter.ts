/**
 * Browser-Use API Exception Filter
 *
 * Global exception filter for Browser-Use API endpoints that provides standardized
 * error response formatting, security headers, monitoring integration, and error tracking.
 *
 * Features:
 * - Standardized error response structure
 * - HTTP status code mapping for browser automation errors
 * - Security headers for security-related errors
 * - Error logging and monitoring integration
 * - Performance metrics collection
 * - Recovery recommendations
 * - Debug information for development
 * - Circuit breaker integration
 * - Rate limiting headers
 * - CORS error handling
 *
 * @author Browser-Use API Error Handling Specialist
 * @version 1.0.0
 * @since Browser-Use API Integration
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
import { Request, Response } from 'express';
import {
  BrowserUseErrorClassificationService,
  BrowserUseError,
  BrowserUseErrorCategory,
} from './browser-use-error-classification.service';
import { BrowserUseErrorResponse } from './browser-use-error.interceptor';

/**
 * Error metrics interface for monitoring
 */
interface ErrorMetrics {
  timestamp: Date;
  requestId: string;
  operation: string;
  sessionId?: string;
  errorCategory: string;
  severity: string;
  duration: number;
  httpStatus: number;
  userAgent: string;
  ipAddress: string;
  url: string;
  method: string;
}

/**
 * Exception context interface
 */
interface ExceptionContext {
  request: Request;
  response: Response;
  requestId: string;
  startTime: number;
  operation: string;
  sessionId?: string;
  taskId?: string;
}

/**
 * Browser-Use API Exception Filter
 */
@Catch()
@Injectable()
export class BrowserUseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BrowserUseExceptionFilter.name);
  private readonly errorMetrics: ErrorMetrics[] = [];
  private readonly maxMetricsHistory = 10000;

  constructor(
    private readonly browserUseErrorClassification: BrowserUseErrorClassificationService,
  ) {
    this.logger.log('Browser-Use Exception Filter initialized');
    this.startMetricsCleanup();
  }

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = this.extractRequestId(request);
    const startTime = this.extractStartTime(request);
    const duration = Date.now() - startTime;

    const exceptionContext: ExceptionContext = {
      request,
      response,
      requestId,
      startTime,
      duration,
      operation: this.extractOperation(request),
      sessionId: this.extractSessionId(request),
      taskId: this.extractTaskId(request),
    };

    this.logger.error(`[${requestId}] Browser-Use API exception caught`, {
      requestId,
      operation: exceptionContext.operation,
      sessionId: exceptionContext.sessionId,
      error: exception instanceof Error ? exception.message : String(exception),
      url: request.url,
      method: request.method,
      duration,
    });

    try {
      // Handle different exception types
      if (exception instanceof HttpException) {
        await this.handleHttpException(exception, exceptionContext);
      } else if (exception instanceof Error) {
        await this.handleGenericError(exception, exceptionContext);
      } else {
        await this.handleUnknownException(exception, exceptionContext);
      }
    } catch (handlingError) {
      this.logger.error(`[${requestId}] Exception handling failed`, {
        requestId,
        originalException:
          exception instanceof Error ? exception.message : String(exception),
        handlingError:
          handlingError instanceof Error
            ? handlingError.message
            : String(handlingError),
      });

      // Send minimal fallback response
      this.sendFallbackErrorResponse(exceptionContext);
    }
  }

  /**
   * Handle HTTP exceptions (including our custom Browser-Use errors)
   */
  private async handleHttpException(
    exception: HttpException,
    context: ExceptionContext,
  ): Promise<void> {
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Check if it's already a structured Browser-Use error response
    if (this.isBrowserUseErrorResponse(exceptionResponse)) {
      this.sendBrowserUseErrorResponse(
        exceptionResponse as BrowserUseErrorResponse,
        status,
        context,
      );
      return;
    }

    // Convert HTTP exception to Browser-Use error
    const browserUseError = await this.convertHttpExceptionToBrowserUseError(
      exception,
      context,
    );

    const errorResponse = await this.createBrowserUseErrorResponse(
      browserUseError,
      context,
    );

    this.sendBrowserUseErrorResponse(errorResponse, status, context);
  }

  /**
   * Handle generic JavaScript errors
   */
  private async handleGenericError(
    error: Error,
    context: ExceptionContext,
  ): Promise<void> {
    const browserUseError =
      await this.browserUseErrorClassification.classifyBrowserUseError(error, {
        operation: context.operation,
        sessionId: context.sessionId,
        taskId: context.taskId,
        pageUrl: context.request.body?.url || context.request.query?.url,
        selector:
          context.request.body?.selector || context.request.query?.selector,
        browserInfo: this.extractBrowserInfo(context.request),
        performanceMetrics: this.extractPerformanceMetrics(context),
      });

    const errorResponse = await this.createBrowserUseErrorResponse(
      browserUseError,
      context,
    );

    const httpStatus = this.mapBrowserUseErrorToHttpStatus(browserUseError);

    this.sendBrowserUseErrorResponse(errorResponse, httpStatus, context);
  }

  /**
   * Handle unknown exception types
   */
  private async handleUnknownException(
    exception: unknown,
    context: ExceptionContext,
  ): Promise<void> {
    const error = new Error(
      exception instanceof Error
        ? exception.message
        : `Unknown exception: ${String(exception)}`,
    );

    await this.handleGenericError(error, context);
  }

  /**
   * Convert HTTP exception to Browser-Use error
   */
  private async convertHttpExceptionToBrowserUseError(
    exception: HttpException,
    context: ExceptionContext,
  ): Promise<BrowserUseError> {
    const status = exception.getStatus();
    const message = exception.message;

    // Map HTTP status to Browser-Use category
    let category: BrowserUseErrorCategory;
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        category = BrowserUseErrorCategory.AUTHENTICATION_REQUIRED;
        break;
      case HttpStatus.FORBIDDEN:
        category = BrowserUseErrorCategory.SECURITY_CHALLENGE;
        break;
      case HttpStatus.NOT_FOUND:
        if (context.operation.includes('session')) {
          category = BrowserUseErrorCategory.SESSION_NOT_FOUND;
        } else {
          category = BrowserUseErrorCategory.ELEMENT_NOT_FOUND;
        }
        break;
      case HttpStatus.REQUEST_TIMEOUT:
        category = BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT;
        break;
      case HttpStatus.TOO_MANY_REQUESTS:
        category = BrowserUseErrorCategory.RATE_LIMIT_DETECTED;
        break;
      case HttpStatus.CONFLICT:
        category = BrowserUseErrorCategory.SESSION_CONFLICT;
        break;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        category = BrowserUseErrorCategory.INVALID_TASK_CONFIGURATION;
        break;
      case HttpStatus.INTERNAL_SERVER_ERROR:
      default:
        category = BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT;
        break;
    }

    return this.browserUseErrorClassification.classifyBrowserUseError(
      new Error(message),
      {
        operation: context.operation,
        sessionId: context.sessionId,
        taskId: context.taskId,
        pageUrl: context.request.body?.url,
        selector: context.request.body?.selector,
        browserInfo: this.extractBrowserInfo(context.request),
        performanceMetrics: this.extractPerformanceMetrics(context),
      },
    );
  }

  /**
   * Create standardized Browser-Use error response
   */
  private async createBrowserUseErrorResponse(
    browserUseError: BrowserUseError,
    context: ExceptionContext,
  ): Promise<BrowserUseErrorResponse> {
    const recoveryAction =
      this.browserUseErrorClassification.getRecoveryAction(browserUseError);

    const errorResponse: BrowserUseErrorResponse = {
      success: false,
      error: {
        id: browserUseError.errorId,
        code: this.getBrowserUseErrorCode(browserUseError.browserUseCategory),
        category: browserUseError.browserUseCategory,
        severity: browserUseError.severity,
        message: browserUseError.message,
        userMessage: this.getUserFriendlyMessage(browserUseError),
        details: {
          originalError: browserUseError.originalError?.message,
          stackTrace:
            process.env.NODE_ENV === 'development'
              ? browserUseError.stackTrace
              : undefined,
          performanceMetrics: browserUseError.performanceMetrics,
          browserInfo: browserUseError.browserInfo,
          requestDuration: context.duration,
          operation: context.operation,
        },
        timestamp: browserUseError.timestamp.toISOString(),
        traceId: context.requestId,
      },
      context: {
        sessionId: context.sessionId,
        taskId: context.taskId,
        operation: context.operation,
        pageUrl: browserUseError.pageUrl,
        retryAttempt: browserUseError.recoveryAttempts,
        maxRetries: browserUseError.maxRecoveryAttempts,
      },
      recovery: {
        attempted: (browserUseError.recoveryAttempts || 0) > 0,
        strategy: recoveryAction.strategy,
        retryable: recoveryAction.maxRetries > 0,
        retryAfterMs: recoveryAction.backoffMs,
        recommendations: this.getRecoveryRecommendations(
          browserUseError,
          recoveryAction,
        ),
      },
      support: {
        documentationUrl: this.getDocumentationUrl(
          browserUseError.browserUseCategory,
        ),
        contactInfo: 'support@bytebot.com',
        debugInfo:
          process.env.NODE_ENV === 'development'
            ? {
                requestId: context.requestId,
                errorClassification: browserUseError.browserUseCategory,
                sessionErrorCount: browserUseError.recoveryAttempts,
              }
            : undefined,
      },
    };

    return errorResponse;
  }

  /**
   * Send Browser-Use error response with appropriate headers
   */
  private sendBrowserUseErrorResponse(
    errorResponse: BrowserUseErrorResponse,
    httpStatus: number,
    context: ExceptionContext,
  ): void {
    const { request, response } = context;

    // Record error metrics
    this.recordErrorMetrics(errorResponse, httpStatus, context);

    // Set standard error headers
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('X-Error-ID', errorResponse.error.id);
    response.setHeader('X-Trace-ID', errorResponse.error.traceId);

    // Set security headers for security-related errors
    if (this.isSecurityError(errorResponse.error.category)) {
      this.setSecurityHeaders(response, errorResponse);
    }

    // Set retry headers for retryable errors
    if (
      errorResponse.recovery.retryable &&
      errorResponse.recovery.retryAfterMs
    ) {
      response.setHeader(
        'Retry-After',
        Math.ceil(errorResponse.recovery.retryAfterMs / 1000),
      );
      response.setHeader('X-RateLimit-Limit', '100');
      response.setHeader('X-RateLimit-Remaining', '0');
      response.setHeader(
        'X-RateLimit-Reset',
        String(Math.ceil(Date.now() / 1000) + 60),
      );
    }

    // Set CORS headers if needed
    if (request.headers.origin) {
      response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // Send response
    response.status(httpStatus).json(errorResponse);

    this.logger.debug(
      `[${context.requestId}] Browser-Use error response sent`,
      {
        requestId: context.requestId,
        errorId: errorResponse.error.id,
        category: errorResponse.error.category,
        severity: errorResponse.error.severity,
        httpStatus,
        retryable: errorResponse.recovery.retryable,
      },
    );
  }

  /**
   * Send minimal fallback error response
   */
  private sendFallbackErrorResponse(context: ExceptionContext): void {
    const fallbackResponse = {
      success: false,
      error: {
        id: `fallback_error_${Date.now()}`,
        code: 'INTERNAL_ERROR',
        category: 'technical',
        severity: 'critical',
        message: 'An unexpected error occurred during browser automation',
        userMessage:
          'The system encountered an unexpected error. Please try again later.',
        timestamp: new Date().toISOString(),
        traceId: context.requestId,
      },
      context: {
        operation: context.operation,
        sessionId: context.sessionId,
        taskId: context.taskId,
      },
      recovery: {
        attempted: false,
        retryable: true,
        recommendations: [
          'Check system status',
          'Retry the operation',
          'Contact support',
        ],
      },
      support: {
        contactInfo: 'support@bytebot.com',
      },
    };

    context.response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(fallbackResponse);
  }

  /**
   * Record error metrics for monitoring
   */
  private recordErrorMetrics(
    errorResponse: BrowserUseErrorResponse,
    httpStatus: number,
    context: ExceptionContext,
  ): void {
    const metrics: ErrorMetrics = {
      timestamp: new Date(),
      requestId: context.requestId,
      operation: context.operation,
      sessionId: context.sessionId,
      errorCategory: errorResponse.error.category,
      severity: errorResponse.error.severity,
      duration: context.duration,
      httpStatus,
      userAgent: context.request.headers['user-agent'] || 'unknown',
      ipAddress: context.request.ip || 'unknown',
      url: context.request.url,
      method: context.request.method,
    };

    this.errorMetrics.push(metrics);

    // Keep metrics history within limits
    if (this.errorMetrics.length > this.maxMetricsHistory) {
      this.errorMetrics.splice(
        0,
        this.errorMetrics.length - this.maxMetricsHistory,
      );
    }
  }

  /**
   * Get error analytics for monitoring dashboard
   */
  getErrorAnalytics(timeRange?: { start: Date; end: Date }): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorsByOperation: Record<string, number>;
    httpStatusDistribution: Record<number, number>;
    averageResponseTime: number;
    errorRate: number;
    topErrorUrls: Array<{ url: string; count: number }>;
  } {
    const filteredMetrics = timeRange
      ? this.errorMetrics.filter(
          (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end,
        )
      : this.errorMetrics;

    return {
      totalErrors: filteredMetrics.length,
      errorsByCategory: this.groupBy(filteredMetrics, 'errorCategory'),
      errorsBySeverity: this.groupBy(filteredMetrics, 'severity'),
      errorsByOperation: this.groupBy(filteredMetrics, 'operation'),
      httpStatusDistribution: this.groupBy(filteredMetrics, 'httpStatus'),
      averageResponseTime: this.calculateAverage(filteredMetrics, 'duration'),
      errorRate: this.calculateErrorRate(filteredMetrics),
      topErrorUrls: this.getTopUrls(filteredMetrics),
    };
  }

  // ===== UTILITY METHODS =====

  private isBrowserUseErrorResponse(response: any): boolean {
    return (
      response &&
      typeof response === 'object' &&
      response.success === false &&
      response.error &&
      response.context &&
      response.recovery
    );
  }

  private mapBrowserUseErrorToHttpStatus(
    browserUseError: BrowserUseError,
  ): HttpStatus {
    const categoryToStatus = {
      [BrowserUseErrorCategory.AUTHENTICATION_REQUIRED]:
        HttpStatus.UNAUTHORIZED,
      [BrowserUseErrorCategory.SECURITY_CHALLENGE]: HttpStatus.FORBIDDEN,
      [BrowserUseErrorCategory.SESSION_NOT_FOUND]: HttpStatus.NOT_FOUND,
      [BrowserUseErrorCategory.ELEMENT_NOT_FOUND]: HttpStatus.NOT_FOUND,
      [BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT]:
        HttpStatus.REQUEST_TIMEOUT,
      [BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT]: HttpStatus.REQUEST_TIMEOUT,
      [BrowserUseErrorCategory.RATE_LIMIT_DETECTED]:
        HttpStatus.TOO_MANY_REQUESTS,
      [BrowserUseErrorCategory.SESSION_CONFLICT]: HttpStatus.CONFLICT,
      [BrowserUseErrorCategory.INVALID_TASK_CONFIGURATION]:
        HttpStatus.UNPROCESSABLE_ENTITY,
      [BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED]:
        HttpStatus.SERVICE_UNAVAILABLE,
      [BrowserUseErrorCategory.MEMORY_EXHAUSTED]:
        HttpStatus.SERVICE_UNAVAILABLE,
    };

    return (
      categoryToStatus[browserUseError.browserUseCategory] ||
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  private isSecurityError(category: string): boolean {
    const securityCategories = [
      BrowserUseErrorCategory.BOT_DETECTION,
      BrowserUseErrorCategory.CAPTCHA_DETECTED,
      BrowserUseErrorCategory.AUTHENTICATION_REQUIRED,
      BrowserUseErrorCategory.SECURITY_CHALLENGE,
      BrowserUseErrorCategory.RATE_LIMIT_DETECTED,
    ];

    return securityCategories.includes(category as BrowserUseErrorCategory);
  }

  private setSecurityHeaders(
    response: Response,
    errorResponse: BrowserUseErrorResponse,
  ): void {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );

    if (
      errorResponse.error.category === BrowserUseErrorCategory.BOT_DETECTION
    ) {
      response.setHeader('X-Bot-Detection', 'true');
      response.setHeader('X-Challenge-Required', 'human-verification');
    }

    if (
      errorResponse.error.category ===
      BrowserUseErrorCategory.RATE_LIMIT_DETECTED
    ) {
      response.setHeader('X-Rate-Limit-Type', 'automation');
      response.setHeader('X-Rate-Limit-Policy', 'adaptive');
    }
  }

  private getBrowserUseErrorCode(category: BrowserUseErrorCategory): string {
    return category.toUpperCase().replace(/_/g, '_');
  }

  private getUserFriendlyMessage(browserUseError: BrowserUseError): string {
    const userMessages = {
      [BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED]:
        'Unable to start the browser session. Please try again.',
      [BrowserUseErrorCategory.BROWSER_CRASH]:
        'The browser session crashed. A new session will be created automatically.',
      [BrowserUseErrorCategory.SESSION_NOT_FOUND]:
        'The browser session was not found. Please create a new session.',
      [BrowserUseErrorCategory.SESSION_EXPIRED]:
        'Your browser session has expired. Please start a new session.',
      [BrowserUseErrorCategory.NAVIGATION_FAILED]:
        'Unable to navigate to the requested page. Please check the URL and try again.',
      [BrowserUseErrorCategory.PAGE_LOAD_TIMEOUT]:
        'The page took too long to load. Please try again or check your connection.',
      [BrowserUseErrorCategory.ELEMENT_NOT_FOUND]:
        'The requested element was not found on the page. The page content may have changed.',
      [BrowserUseErrorCategory.ELEMENT_NOT_INTERACTABLE]:
        'The element cannot be interacted with. It may be hidden or disabled.',
      [BrowserUseErrorCategory.BOT_DETECTION]:
        'The website detected automated activity. Manual verification may be required.',
      [BrowserUseErrorCategory.RATE_LIMIT_DETECTED]:
        'Request rate limit exceeded. Please wait before making more requests.',
      [BrowserUseErrorCategory.MEMORY_EXHAUSTED]:
        'System resources are temporarily exhausted. Please try again in a few minutes.',
      [BrowserUseErrorCategory.TASK_EXECUTION_TIMEOUT]:
        'The automation task took too long to complete. Please try again with a simpler task.',
    };

    return (
      userMessages[browserUseError.browserUseCategory] ||
      'An error occurred during browser automation. Please try again.'
    );
  }

  private getRecoveryRecommendations(
    browserUseError: BrowserUseError,
    recoveryAction: any,
  ): string[] {
    // Use the same logic as the interceptor for consistency
    const recommendations: string[] = [];

    if (recoveryAction.maxRetries > 0) {
      recommendations.push('The operation will be retried automatically');
    }

    // Add category-specific recommendations
    switch (browserUseError.browserUseCategory) {
      case BrowserUseErrorCategory.SESSION_EXPIRED:
        recommendations.push('Create a new browser session');
        break;
      case BrowserUseErrorCategory.ELEMENT_NOT_FOUND:
        recommendations.push('Verify the element selector is correct');
        recommendations.push('Wait for the page to fully load');
        break;
      case BrowserUseErrorCategory.RATE_LIMIT_DETECTED:
        recommendations.push('Reduce request frequency');
        recommendations.push('Implement delays between requests');
        break;
      case BrowserUseErrorCategory.MEMORY_EXHAUSTED:
        recommendations.push('Close unused browser sessions');
        recommendations.push('Contact support for resource scaling');
        break;
    }

    return recommendations.length > 0
      ? recommendations
      : ['Check system status and retry the operation'];
  }

  private getDocumentationUrl(category: BrowserUseErrorCategory): string {
    const docUrls = {
      [BrowserUseErrorCategory.BROWSER_LAUNCH_FAILED]:
        '/docs/api/browser-use/browser-management',
      [BrowserUseErrorCategory.SESSION_CREATE_FAILED]:
        '/docs/api/browser-use/session-management',
      [BrowserUseErrorCategory.NAVIGATION_FAILED]:
        '/docs/api/browser-use/navigation',
      [BrowserUseErrorCategory.ELEMENT_NOT_FOUND]:
        '/docs/api/browser-use/element-interaction',
      [BrowserUseErrorCategory.BOT_DETECTION]:
        '/docs/api/browser-use/anti-detection',
      [BrowserUseErrorCategory.RATE_LIMIT_DETECTED]:
        '/docs/api/browser-use/rate-limiting',
    };

    return docUrls[category] || '/docs/api/browser-use';
  }

  private extractRequestId(request: Request): string {
    return (
      (request.headers['x-request-id'] as string) ||
      (request.headers['x-trace-id'] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
    );
  }

  private extractStartTime(request: Request): number {
    return (request as any).startTime || Date.now();
  }

  private extractOperation(request: Request): string {
    const url = request.url;
    if (url.includes('/browser/session')) return 'session_management';
    if (url.includes('/browser/navigate')) return 'navigate';
    if (url.includes('/browser/click')) return 'click';
    if (url.includes('/browser/type')) return 'type';
    if (url.includes('/browser/extract')) return 'extract';
    if (url.includes('/browser/screenshot')) return 'screenshot';
    if (url.includes('/browser/wait')) return 'wait';
    if (url.includes('/browser/execute')) return 'execute';
    return 'unknown';
  }

  private extractSessionId(request: Request): string | undefined {
    return (
      request.params?.sessionId ||
      request.body?.sessionId ||
      (request.query?.sessionId as string)
    );
  }

  private extractTaskId(request: Request): string | undefined {
    return (
      request.body?.taskId ||
      (request.query?.taskId as string) ||
      (request.headers['x-task-id'] as string)
    );
  }

  private extractBrowserInfo(request: Request): any {
    return {
      userAgent: request.headers['user-agent'],
      acceptLanguage: request.headers['accept-language'],
      referer: request.headers['referer'],
    };
  }

  private extractPerformanceMetrics(context: ExceptionContext): any {
    return {
      requestDuration: context.duration,
      timestamp: new Date(),
      memoryUsage: process.memoryUsage(),
    };
  }

  private groupBy(
    metrics: ErrorMetrics[],
    field: keyof ErrorMetrics,
  ): Record<string, number> {
    return metrics.reduce(
      (acc, metric) => {
        const key = String(metric[field]);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private calculateAverage(
    metrics: ErrorMetrics[],
    field: keyof ErrorMetrics,
  ): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, metric) => acc + Number(metric[field]), 0);
    return Math.round(sum / metrics.length);
  }

  private calculateErrorRate(metrics: ErrorMetrics[]): number {
    // Simplified error rate calculation
    const timeWindow = 60000; // 1 minute
    const now = Date.now();
    const recentErrors = metrics.filter(
      (m) => now - m.timestamp.getTime() < timeWindow,
    );
    return recentErrors.length;
  }

  private getTopUrls(
    metrics: ErrorMetrics[],
  ): Array<{ url: string; count: number }> {
    const urlCounts = this.groupBy(metrics, 'url');
    return Object.entries(urlCounts)
      .map(([url, count]) => ({ url, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private startMetricsCleanup(): void {
    // Clean up old metrics every hour
    setInterval(() => {
      const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      const initialLength = this.errorMetrics.length;

      for (let i = this.errorMetrics.length - 1; i >= 0; i--) {
        if (this.errorMetrics[i].timestamp.getTime() < cutoffTime) {
          this.errorMetrics.splice(i, 1);
        }
      }

      if (initialLength > this.errorMetrics.length) {
        this.logger.debug(
          `Cleaned up ${initialLength - this.errorMetrics.length} old error metrics`,
        );
      }
    }, 3600000); // Every hour
  }
}
