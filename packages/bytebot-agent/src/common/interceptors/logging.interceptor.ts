/**
 * Enterprise Structured Logging Interceptor
 *
 * Provides comprehensive request/response logging with correlation IDs,
 * performance timing, error context, and structured JSON formatting
 * for enterprise observability and troubleshooting.
 *
 * Features:
 * - Structured JSON logging with correlation IDs
 * - Request/response timing and performance metrics
 * - Error logging with stack traces and context
 * - User activity tracking
 * - Security event logging
 * - Integration with metrics collection
 *
 * @author Claude Code - Monitoring & Observability Specialist
 * @version 2.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Structured log entry interface
 */
interface LogEntry {
  timestamp: string;
  correlationId: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  event: string;
  component: 'api' | 'task' | 'auth' | 'database' | 'system';
  method?: string;
  url?: string;
  statusCode?: number;
  userId?: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  requestSize?: number;
  responseSize?: number;
  error?: {
    message: string;
    stack?: string;
    type: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Request context interface
 */
interface RequestContext {
  correlationId: string;
  startTime: number;
  userId?: string;
  sessionId?: string;
  requestSize: number;
}

/**
 * Structured logging interceptor for comprehensive observability
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor() {
    this.logger.log('Enterprise Structured Logging Interceptor initialized');
  }

  /**
   * Intercept requests and responses for logging
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate or extract correlation ID
    const correlationId = this.getOrCreateCorrelationId(request);

    // Create request context
    const requestContext: RequestContext = {
      correlationId,
      startTime: Date.now(),
      userId: this.extractUserId(request),
      sessionId: this.extractSessionId(request),
      requestSize: this.calculateRequestSize(request),
    };

    // Add correlation ID to response headers
    response.setHeader('X-Correlation-ID', correlationId);

    // Log incoming request
    this.logIncomingRequest(request, requestContext);

    return next.handle().pipe(
      tap((responseData) => {
        // Log successful response
        this.logSuccessfulResponse(
          request,
          response,
          requestContext,
          responseData,
        );
      }),
      catchError((error) => {
        // Log error response
        this.logErrorResponse(request, response, requestContext, error);
        return throwError(error);
      }),
    );
  }

  /**
   * Get or create correlation ID for request tracking
   */
  private getOrCreateCorrelationId(request: Request): string {
    // Check for existing correlation ID in headers
    const existingId =
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      request.headers['correlation-id'];

    if (existingId && typeof existingId === 'string') {
      return existingId;
    }

    // Generate new correlation ID
    return `req_${Date.now()}_${uuidv4().substring(0, 8)}`;
  }

  /**
   * Extract user ID from request (JWT token, session, etc.)
   */
  private extractUserId(request: Request): string | undefined {
    // Extract from JWT token if available
    if (request.user && typeof request.user === 'object') {
      const user = request.user as any;
      return user.id || user.sub || user.userId;
    }

    // Extract from session if available
    if (request.session && (request.session as any).userId) {
      return (request.session as any).userId;
    }

    // Extract from custom header
    const userIdHeader = request.headers['x-user-id'];
    if (userIdHeader && typeof userIdHeader === 'string') {
      return userIdHeader;
    }

    return undefined;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: Request): string | undefined {
    if (request.session && request.session.id) {
      return request.session.id;
    }

    const sessionHeader = request.headers['x-session-id'];
    if (sessionHeader && typeof sessionHeader === 'string') {
      return sessionHeader;
    }

    return undefined;
  }

  /**
   * Calculate request payload size
   */
  private calculateRequestSize(request: Request): number {
    if (request.body) {
      try {
        return JSON.stringify(request.body).length;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Calculate response payload size
   */
  private calculateResponseSize(responseData: any): number {
    if (responseData) {
      try {
        return JSON.stringify(responseData).length;
      } catch {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Extract client IP address
   */
  private extractClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Log incoming request
   */
  private logIncomingRequest(request: Request, context: RequestContext): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      level: 'info',
      event: 'http_request_incoming',
      component: 'api',
      method: request.method,
      url: this.sanitizeUrl(request.url),
      userId: context.userId,
      userAgent: request.headers['user-agent'],
      ip: this.extractClientIP(request),
      requestSize: context.requestSize,
      metadata: {
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
        params: request.params,
        sessionId: context.sessionId,
        contentType: request.headers['content-type'],
        contentLength: request.headers['content-length'],
      },
    };

    // Log at appropriate level based on request type
    if (this.isHealthCheck(request.url)) {
      this.logger.debug(JSON.stringify(logEntry));
    } else {
      this.logger.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Log successful response
   */
  private logSuccessfulResponse(
    request: Request,
    response: Response,
    context: RequestContext,
    responseData: any,
  ): void {
    const duration = Date.now() - context.startTime;
    const responseSize = this.calculateResponseSize(responseData);

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      level: 'info',
      event: 'http_request_completed',
      component: 'api',
      method: request.method,
      url: this.sanitizeUrl(request.url),
      statusCode: response.statusCode,
      userId: context.userId,
      duration,
      requestSize: context.requestSize,
      responseSize,
      metadata: {
        sessionId: context.sessionId,
        responseHeaders: this.sanitizeHeaders(response.getHeaders()),
        performanceCategory: this.categorizePerformance(duration),
        cached: response.getHeader('x-cache-status') === 'HIT',
      },
    };

    // Log at appropriate level based on performance and status
    if (this.isHealthCheck(request.url)) {
      this.logger.debug(JSON.stringify(logEntry));
    } else if (duration > 5000) {
      // Slow request (>5s)
      this.logger.warn(JSON.stringify(logEntry));
    } else {
      this.logger.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Log error response
   */
  private logErrorResponse(
    request: Request,
    response: Response,
    context: RequestContext,
    error: any,
  ): void {
    const duration = Date.now() - context.startTime;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: context.correlationId,
      level: 'error',
      event: 'http_request_error',
      component: 'api',
      method: request.method,
      url: this.sanitizeUrl(request.url),
      statusCode: error.status || error.statusCode || 500,
      userId: context.userId,
      duration,
      requestSize: context.requestSize,
      error: {
        message: error.message || 'Unknown error',
        stack: error.stack,
        type: error.constructor?.name || 'Error',
      },
      metadata: {
        sessionId: context.sessionId,
        errorCode: error.code,
        errorDetails: error.details || error.response,
        requestBody: this.sanitizeRequestBody(request.body),
        userAgent: request.headers['user-agent'],
        ip: this.extractClientIP(request),
        performanceCategory: this.categorizePerformance(duration),
      },
    };

    this.logger.error(JSON.stringify(logEntry));
  }

  /**
   * Sanitize URL to remove sensitive information
   */
  private sanitizeUrl(url: string): string {
    if (!url) return 'unknown';

    // Remove query parameters that might contain sensitive data
    const sensitiveParams = ['password', 'token', 'key', 'secret', 'auth'];
    let sanitizedUrl = url;

    sensitiveParams.forEach((param) => {
      const regex = new RegExp(`([?&])${param}=[^&]*`, 'gi');
      sanitizedUrl = sanitizedUrl.replace(regex, `$1${param}=***`);
    });

    return sanitizedUrl;
  }

  /**
   * Sanitize headers to remove sensitive information
   */
  private sanitizeHeaders(headers: any): Record<string, any> {
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
      'x-secret-key',
    ];

    const sanitized: Record<string, any> = {};

    Object.keys(headers).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = headers[key];
      }
    });

    return sanitized;
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'secret', 'token', 'key', 'auth'];
    const sanitized = { ...body };

    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    });

    return sanitized;
  }

  /**
   * Check if request is a health check
   */
  private isHealthCheck(url: string): boolean {
    const healthPaths = ['/health', '/metrics', '/ping', '/status'];
    return healthPaths.some((path) => url.includes(path));
  }

  /**
   * Categorize performance based on response time
   */
  private categorizePerformance(duration: number): string {
    if (duration < 100) return 'excellent';
    if (duration < 500) return 'good';
    if (duration < 1000) return 'acceptable';
    if (duration < 5000) return 'slow';
    return 'critical';
  }
}
