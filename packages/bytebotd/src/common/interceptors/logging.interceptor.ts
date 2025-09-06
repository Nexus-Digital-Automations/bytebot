/**
 * Logging Interceptor with Correlation ID Tracking
 *
 * NestJS interceptor providing comprehensive request/response logging with
 * correlation ID tracking for enterprise-grade observability. Enables
 * distributed tracing and structured JSON logging.
 *
 * Features:
 * - Correlation ID generation and propagation
 * - Structured JSON logging format
 * - Request/response timing
 * - Error tracking with stack traces
 * - Performance metrics integration
 * - User context tracking
 *
 * @author Claude Code
 * @version 1.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * Request context interface for structured logging
 */
export interface RequestContext {
  correlationId: string;
  method: string;
  url: string;
  userAgent?: string;
  remoteAddress: string;
  timestamp: string;
  userId?: string;
  sessionId?: string;
}

/**
 * Response context interface for structured logging
 */
export interface ResponseContext {
  statusCode: number;
  processingTime: number;
  contentLength?: number;
  cacheHit?: boolean;
}

/**
 * Error context interface for structured logging
 */
export interface ErrorContext {
  name: string;
  message: string;
  stack?: string;
  statusCode?: number;
}

/**
 * Comprehensive logging interceptor with correlation tracking
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(private readonly metricsService?: MetricsService) {
    this.logger.log(
      'Logging Interceptor initialized - Structured logging enabled',
    );
  }

  /**
   * Intercept HTTP requests and responses for comprehensive logging
   *
   * @param context Execution context
   * @param next Call handler
   * @returns Observable with logging side effects
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    // Generate correlation ID
    const correlationId = this.generateCorrelationId(request);

    // Add correlation ID to request headers for downstream services
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('X-Correlation-ID', correlationId);

    // Create request context
    const requestContext = this.createRequestContext(request, correlationId);

    const startTime = Date.now();
    const route = this.extractRoute(request);

    // Log request start
    this.logRequest(requestContext);

    // Track request start metrics
    if (this.metricsService) {
      this.metricsService.recordRequestStart(request.method, route);
    }

    return next.handle().pipe(
      tap(() => {
        // Handle successful response
        const processingTime = Date.now() - startTime;
        const responseContext = this.createResponseContext(
          response,
          processingTime,
        );

        this.logResponse(requestContext, responseContext);

        // Record metrics for successful requests
        if (this.metricsService) {
          this.metricsService.recordApiRequestDuration(
            request.method,
            route,
            response.statusCode,
            processingTime,
          );
          this.metricsService.recordRequestEnd(request.method, route);
        }
      }),
      catchError((error) => {
        // Handle error response
        const processingTime = Date.now() - startTime;
        const responseContext = this.createResponseContext(
          response,
          processingTime,
        );
        const errorContext = this.createErrorContext(error);

        this.logError(requestContext, responseContext, errorContext);

        // Record metrics for failed requests
        if (this.metricsService) {
          const statusCode = error?.status || error?.statusCode || 500;
          this.metricsService.recordApiRequestDuration(
            request.method,
            route,
            statusCode,
            processingTime,
          );
          this.metricsService.recordRequestEnd(request.method, route);
        }

        // Re-throw the error to maintain normal error handling
        throw error;
      }),
    );
  }

  /**
   * Generate or retrieve correlation ID from request
   *
   * @param request HTTP request object
   * @returns Correlation ID string
   */
  private generateCorrelationId(request: Request): string {
    // Check if correlation ID already exists (from upstream service)
    const existingId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      request.headers['x-trace-id'];

    return (existingId as string) || uuidv4();
  }

  /**
   * Create structured request context
   *
   * @param request HTTP request object
   * @param correlationId Request correlation ID
   * @returns Request context object
   */
  private createRequestContext(
    request: Request,
    correlationId: string,
  ): RequestContext {
    return {
      correlationId,
      method: request.method,
      url: request.originalUrl || request.url,
      userAgent: request.headers['user-agent'],
      remoteAddress: this.getClientIpAddress(request),
      timestamp: new Date().toISOString(),
      userId: (request as any).user?.id, // If authentication is implemented
      sessionId: (request as any).session?.id, // If sessions are used
    };
  }

  /**
   * Create structured response context
   *
   * @param response HTTP response object
   * @param processingTime Request processing time in milliseconds
   * @returns Response context object
   */
  private createResponseContext(
    response: Response,
    processingTime: number,
  ): ResponseContext {
    return {
      statusCode: response.statusCode,
      processingTime,
      contentLength:
        parseInt(response.get('Content-Length') || '0', 10) || undefined,
      cacheHit: response.get('X-Cache-Status') === 'HIT',
    };
  }

  /**
   * Create structured error context
   *
   * @param error Error object
   * @returns Error context object
   */
  private createErrorContext(error: any): ErrorContext {
    return {
      name: error?.name || 'UnknownError',
      message: error?.message || 'An unknown error occurred',
      stack: error?.stack,
      statusCode: error?.status || error?.statusCode,
    };
  }

  /**
   * Extract route pattern from request
   *
   * @param request HTTP request object
   * @returns Route pattern string
   */
  private extractRoute(request: Request): string {
    // Try to get route pattern from NestJS route info
    const routePattern = (request as any).route?.path;
    if (routePattern) {
      return routePattern;
    }

    // Fallback to URL path with parameter normalization
    const url = request.originalUrl || request.url;
    return this.normalizeUrlForMetrics(url);
  }

  /**
   * Normalize URL path for consistent metrics grouping
   *
   * @param url Original URL
   * @returns Normalized URL pattern
   */
  private normalizeUrlForMetrics(url: string): string {
    // Remove query parameters
    const path = url.split('?')[0];

    // Replace common ID patterns with placeholders
    return path
      .replace(/\/\d+/g, '/:id') // Replace numeric IDs
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
      .replace(/\/[a-f0-9]{24}/g, '/:objectId') // Replace MongoDB ObjectIDs
      .replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get client IP address from request
   *
   * @param request HTTP request object
   * @returns Client IP address
   */
  private getClientIpAddress(request: Request): string {
    return (request.headers['x-forwarded-for'] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown') as string;
  }

  /**
   * Log successful request
   *
   * @param requestContext Request context information
   */
  private logRequest(requestContext: RequestContext): void {
    this.logger.log({
      message: 'HTTP Request Started',
      level: 'info',
      type: 'http_request',
      context: requestContext,
      timestamp: requestContext.timestamp,
    });
  }

  /**
   * Log successful response
   *
   * @param requestContext Request context information
   * @param responseContext Response context information
   */
  private logResponse(
    requestContext: RequestContext,
    responseContext: ResponseContext,
  ): void {
    const logLevel = responseContext.statusCode >= 400 ? 'warn' : 'info';
    const message = `HTTP Request Completed - ${requestContext.method} ${requestContext.url} - ${responseContext.statusCode}`;

    this.logger[logLevel]({
      message,
      level: logLevel,
      type: 'http_response',
      context: {
        request: requestContext,
        response: responseContext,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log error response
   *
   * @param requestContext Request context information
   * @param responseContext Response context information
   * @param errorContext Error context information
   */
  private logError(
    requestContext: RequestContext,
    responseContext: ResponseContext,
    errorContext: ErrorContext,
  ): void {
    this.logger.error({
      message: `HTTP Request Failed - ${requestContext.method} ${requestContext.url} - ${errorContext.name}`,
      level: 'error',
      type: 'http_error',
      context: {
        request: requestContext,
        response: responseContext,
        error: errorContext,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
