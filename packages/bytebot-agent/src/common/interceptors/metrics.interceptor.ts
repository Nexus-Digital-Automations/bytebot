/**
 * Metrics Collection Interceptor
 *
 * Automatically collects and records metrics for HTTP requests, database queries,
 * and other operations. Integrates with Prometheus metrics service for comprehensive
 * observability and performance monitoring.
 *
 * Features:
 * - Automatic API request metrics collection
 * - Response time and throughput monitoring
 * - Error rate tracking
 * - User activity metrics
 * - Integration with Prometheus metrics service
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
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * Request context for metrics collection
 */
interface MetricsContext {
  startTime: number;
  route: string;
  method: string;
  userId?: string;
  operationId: string;
}

/**
 * Automated metrics collection interceptor
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(
    @Optional()
    @Inject(MetricsService)
    private readonly metricsService: MetricsService,
  ) {
    if (this.metricsService) {
      this.logger.log(
        'Metrics Interceptor initialized with Prometheus integration',
      );
    } else {
      this.logger.warn(
        'Metrics Interceptor initialized without Prometheus service',
      );
    }
  }

  /**
   * Intercept requests for metrics collection
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Create metrics context
    const metricsContext: MetricsContext = {
      startTime: Date.now(),
      route: this.extractRoute(context, request),
      method: request.method,
      userId: this.extractUserId(request),
      operationId: this.generateOperationId(),
    };

    // Record request start (in-flight metrics)
    this.recordRequestStart(metricsContext);

    this.logger.debug(
      `[${metricsContext.operationId}] Request metrics collection started`,
      {
        method: metricsContext.method,
        route: metricsContext.route,
        userId: metricsContext.userId,
      },
    );

    return next.handle().pipe(
      tap((responseData) => {
        // Record successful request metrics
        this.recordSuccessfulRequest(
          metricsContext,
          response.statusCode,
          responseData,
        );
      }),
      catchError((error) => {
        // Record error request metrics
        this.recordErrorRequest(metricsContext, error);
        return throwError(error);
      }),
      finalize(() => {
        // Always record request completion (in-flight cleanup)
        this.recordRequestEnd(metricsContext);
      }),
    );
  }

  /**
   * Extract route pattern from execution context
   */
  private extractRoute(context: ExecutionContext, request: Request): string {
    try {
      // Try to get route from NestJS handler
      const handler = context.getHandler();
      const controller = context.getClass();

      if (handler && controller) {
        const controllerPath = Reflect.getMetadata('path', controller) || '';
        const handlerPath = Reflect.getMetadata('path', handler) || '';
        const route = `${controllerPath}${handlerPath}`.replace(/\/+/g, '/');

        if (route && route !== '/') {
          return route;
        }
      }
    } catch (error) {
      this.logger.debug(
        'Failed to extract route from context, using URL path',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    // Fallback to request URL path, normalized
    return this.normalizeRoutePath(request.url);
  }

  /**
   * Normalize route path for consistent metrics labeling
   */
  private normalizeRoutePath(url: string): string {
    if (!url) return '/unknown';

    // Remove query parameters
    const path = url.split('?')[0];

    // Common path normalizations for consistent metrics
    const normalizedPath =
      path
        .replace(/\/\d+/g, '/:id') // Replace numeric IDs
        .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUIDs
        .replace(/\/[a-f0-9]{24}/g, '/:objectId') // Replace MongoDB ObjectIDs
        .replace(/\/+/g, '/') // Remove duplicate slashes
        .replace(/\/$/, '') || '/'; // Remove trailing slash

    return normalizedPath;
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: Request): string | undefined {
    // Extract from JWT token payload
    if (request.user && typeof request.user === 'object') {
      const user = request.user as any;
      return user.id || user.sub || user.userId;
    }

    // Extract from headers
    const userIdHeader = request.headers['x-user-id'];
    if (userIdHeader && typeof userIdHeader === 'string') {
      return userIdHeader;
    }

    return undefined;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `metrics_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Record request start (in-flight tracking)
   */
  private recordRequestStart(context: MetricsContext): void {
    if (!this.metricsService) return;

    try {
      this.metricsService.recordRequestStart(context.method, context.route);

      this.logger.debug(`[${context.operationId}] Request start recorded`, {
        method: context.method,
        route: context.route,
      });
    } catch (error) {
      this.logger.error(
        `[${context.operationId}] Failed to record request start`,
        {
          error: error instanceof Error ? error.message : String(error),
          method: context.method,
          route: context.route,
        },
      );
    }
  }

  /**
   * Record successful request metrics
   */
  private recordSuccessfulRequest(
    context: MetricsContext,
    statusCode: number,
    responseData: any,
  ): void {
    if (!this.metricsService) return;

    try {
      const duration = Date.now() - context.startTime;

      this.metricsService.recordApiRequest(
        context.method,
        context.route,
        statusCode,
        duration,
        context.userId,
      );

      this.logger.debug(
        `[${context.operationId}] Successful request metrics recorded`,
        {
          method: context.method,
          route: context.route,
          statusCode,
          durationMs: duration,
          userId: context.userId,
          responseSize: this.calculateResponseSize(responseData),
        },
      );
    } catch (error) {
      this.logger.error(
        `[${context.operationId}] Failed to record successful request metrics`,
        {
          error: error instanceof Error ? error.message : String(error),
          method: context.method,
          route: context.route,
          statusCode,
        },
      );
    }
  }

  /**
   * Record error request metrics
   */
  private recordErrorRequest(context: MetricsContext, error: any): void {
    if (!this.metricsService) return;

    try {
      const duration = Date.now() - context.startTime;
      const statusCode = error.status || error.statusCode || 500;

      this.metricsService.recordApiRequest(
        context.method,
        context.route,
        statusCode,
        duration,
        context.userId,
      );

      // Record application error
      this.metricsService.recordApplicationError(
        error.constructor?.name || 'UnknownError',
        this.categorizeErrorSeverity(statusCode),
        'api',
      );

      this.logger.debug(
        `[${context.operationId}] Error request metrics recorded`,
        {
          method: context.method,
          route: context.route,
          statusCode,
          durationMs: duration,
          userId: context.userId,
          errorType: error.constructor?.name || 'UnknownError',
          errorMessage: error.message,
        },
      );
    } catch (metricsError) {
      this.logger.error(
        `[${context.operationId}] Failed to record error request metrics`,
        {
          error:
            metricsError instanceof Error
              ? metricsError.message
              : String(metricsError),
          method: context.method,
          route: context.route,
          originalError: error.message,
        },
      );
    }
  }

  /**
   * Record request end (in-flight cleanup)
   */
  private recordRequestEnd(context: MetricsContext): void {
    if (!this.metricsService) return;

    try {
      this.metricsService.recordRequestEnd(context.method, context.route);

      this.logger.debug(`[${context.operationId}] Request end recorded`, {
        method: context.method,
        route: context.route,
        totalDurationMs: Date.now() - context.startTime,
      });
    } catch (error) {
      this.logger.error(
        `[${context.operationId}] Failed to record request end`,
        {
          error: error instanceof Error ? error.message : String(error),
          method: context.method,
          route: context.route,
        },
      );
    }
  }

  /**
   * Calculate response payload size
   */
  private calculateResponseSize(responseData: any): number {
    if (!responseData) return 0;

    try {
      if (typeof responseData === 'string') {
        return responseData.length;
      }

      if (typeof responseData === 'object') {
        return JSON.stringify(responseData).length;
      }

      return String(responseData).length;
    } catch {
      return 0;
    }
  }

  /**
   * Categorize error severity based on status code
   */
  private categorizeErrorSeverity(
    statusCode: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400 && statusCode < 500) return 'medium';
    if (statusCode >= 300 && statusCode < 400) return 'low';
    return 'low';
  }

  /**
   * Check if request should be excluded from metrics
   */
  private shouldExcludeFromMetrics(route: string): boolean {
    const excludedRoutes = ['/metrics', '/health', '/favicon.ico'];

    return excludedRoutes.some((excluded) => route.includes(excluded));
  }
}
