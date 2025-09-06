/**
 * Query Logging Interceptor - Comprehensive Database Query Monitoring
 * Provides detailed query performance monitoring, slow query detection,
 * and comprehensive logging for the Bytebot API database operations
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { performance } from 'perf_hooks';

export interface QueryMetrics {
  operationId: string;
  queryType: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  connectionId?: string;
  rowsAffected?: number;
  error?: string;
  queryFingerprint?: string;
  requestContext?: {
    userId?: string;
    sessionId?: string;
    endpoint?: string;
    method?: string;
    userAgent?: string;
  };
}

export interface SlowQueryAlert {
  operationId: string;
  query: string;
  duration: number;
  threshold: number;
  timestamp: Date;
  context: any;
}

@Injectable()
export class QueryLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryLoggingInterceptor.name);
  private readonly queryMetrics: QueryMetrics[] = [];
  private readonly slowQueryThreshold: number;
  private readonly enableVerboseLogging: boolean;
  private readonly enableSlowQueryAlerts: boolean;
  private readonly maxMetricsHistory: number;

  constructor(private readonly configService: ConfigService) {
    this.slowQueryThreshold = this.configService.get<number>(
      'DB_SLOW_QUERY_THRESHOLD_MS',
      1000,
    );

    this.enableVerboseLogging = this.configService.get<boolean>(
      'DB_ENABLE_VERBOSE_LOGGING',
      false,
    );

    this.enableSlowQueryAlerts = this.configService.get<boolean>(
      'DB_ENABLE_SLOW_QUERY_ALERTS',
      true,
    );

    this.maxMetricsHistory = this.configService.get<number>(
      'DB_MAX_METRICS_HISTORY',
      10000,
    );

    this.logger.log('Query logging interceptor initialized', {
      slowQueryThreshold: this.slowQueryThreshold,
      verboseLogging: this.enableVerboseLogging,
      slowQueryAlerts: this.enableSlowQueryAlerts,
      maxMetricsHistory: this.maxMetricsHistory,
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationId = this.generateOperationId();
    const startTime = performance.now();
    const requestContext = this.extractRequestContext(context);

    // Extract query information from the execution context
    const queryInfo = this.extractQueryInfo(context);

    if (this.enableVerboseLogging) {
      this.logger.debug(`[${operationId}] Database operation started`, {
        operationId,
        queryType: queryInfo.type,
        endpoint: requestContext.endpoint,
        method: requestContext.method,
        userId: requestContext.userId,
      });
    }

    return next.handle().pipe(
      tap((result) => {
        const duration = performance.now() - startTime;

        // Record successful query metrics
        const metrics: QueryMetrics = {
          operationId,
          queryType: queryInfo.type,
          duration,
          success: true,
          timestamp: new Date(),
          connectionId: queryInfo.connectionId,
          rowsAffected: this.extractRowsAffected(result),
          queryFingerprint: queryInfo.fingerprint,
          requestContext,
        };

        this.recordQueryMetrics(metrics);

        // Log successful operation
        if (duration > this.slowQueryThreshold || this.enableVerboseLogging) {
          this.logger.log(`[${operationId}] Database operation completed`, {
            operationId,
            queryType: queryInfo.type,
            duration: `${duration.toFixed(2)}ms`,
            success: true,
            rowsAffected: metrics.rowsAffected,
            slow: duration > this.slowQueryThreshold,
          });
        }

        // Alert for slow queries
        if (duration > this.slowQueryThreshold && this.enableSlowQueryAlerts) {
          this.handleSlowQuery({
            operationId,
            query: queryInfo.type,
            duration,
            threshold: this.slowQueryThreshold,
            timestamp: new Date(),
            context: { ...requestContext, result: this.sanitizeResult(result) },
          });
        }
      }),

      catchError((error) => {
        const duration = performance.now() - startTime;

        // Record failed query metrics
        const metrics: QueryMetrics = {
          operationId,
          queryType: queryInfo.type,
          duration,
          success: false,
          timestamp: new Date(),
          connectionId: queryInfo.connectionId,
          error: error instanceof Error ? error.message : String(error),
          queryFingerprint: queryInfo.fingerprint,
          requestContext,
        };

        this.recordQueryMetrics(metrics);

        // Log database error
        this.logger.error(`[${operationId}] Database operation failed`, {
          operationId,
          queryType: queryInfo.type,
          duration: `${duration.toFixed(2)}ms`,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          requestContext,
        });

        return throwError(() => error);
      }),
    );
  }

  /**
   * Get query performance metrics for monitoring
   */
  getQueryMetrics(): QueryMetrics[] {
    return [...this.queryMetrics];
  }

  /**
   * Get aggregated query performance statistics
   */
  getQueryStatistics() {
    const metrics = this.queryMetrics;
    const recentMetrics = metrics.filter(
      (m) => Date.now() - m.timestamp.getTime() < 3600000, // Last hour
    );

    if (recentMetrics.length === 0) {
      return {
        totalQueries: 0,
        successfulQueries: 0,
        failedQueries: 0,
        averageDuration: 0,
        slowQueries: 0,
        errorRate: 0,
        queriesPerMinute: 0,
        queryTypes: {},
      };
    }

    const successful = recentMetrics.filter((m) => m.success);
    const failed = recentMetrics.filter((m) => !m.success);
    const slow = recentMetrics.filter(
      (m) => m.duration > this.slowQueryThreshold,
    );

    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageDuration = totalDuration / recentMetrics.length;

    // Query type distribution
    const queryTypes = recentMetrics.reduce(
      (acc, m) => {
        acc[m.queryType] = (acc[m.queryType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Calculate queries per minute
    const timeSpanMs = Math.max(
      recentMetrics[recentMetrics.length - 1].timestamp.getTime() -
        recentMetrics[0].timestamp.getTime(),
      60000, // Minimum 1 minute
    );
    const queriesPerMinute = (recentMetrics.length / timeSpanMs) * 60000;

    return {
      totalQueries: recentMetrics.length,
      successfulQueries: successful.length,
      failedQueries: failed.length,
      averageDuration: Math.round(averageDuration * 100) / 100,
      slowQueries: slow.length,
      errorRate:
        Math.round((failed.length / recentMetrics.length) * 10000) / 100,
      queriesPerMinute: Math.round(queriesPerMinute * 100) / 100,
      queryTypes,
    };
  }

  /**
   * Get slow query report
   */
  getSlowQueryReport() {
    const slowQueries = this.queryMetrics.filter(
      (m) => m.duration > this.slowQueryThreshold,
    );

    return {
      totalSlowQueries: slowQueries.length,
      slowQueryThreshold: this.slowQueryThreshold,
      queries: slowQueries
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 50) // Top 50 slowest
        .map((query) => ({
          operationId: query.operationId,
          queryType: query.queryType,
          duration: query.duration,
          timestamp: query.timestamp,
          success: query.success,
          error: query.error,
          requestContext: query.requestContext,
        })),
    };
  }

  /**
   * Clear query metrics history
   */
  clearMetrics() {
    this.queryMetrics.length = 0;
    this.logger.log('Query metrics history cleared');
  }

  /**
   * Extract request context from execution context
   */
  private extractRequestContext(context: ExecutionContext) {
    try {
      const request = context.switchToHttp().getRequest();

      return {
        userId: request.user?.id || request.headers['x-user-id'],
        sessionId: request.sessionId || request.headers['x-session-id'],
        endpoint: request.route?.path || request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        correlationId: request.headers['x-correlation-id'],
      };
    } catch (error) {
      // If HTTP context is not available (e.g., in background tasks)
      return {
        userId: 'system',
        endpoint: 'background',
        method: 'internal',
      };
    }
  }

  /**
   * Extract query information from execution context
   */
  private extractQueryInfo(context: ExecutionContext) {
    const handler = context.getHandler();
    const controllerName = context.getClass().name;
    const methodName = handler.name;

    // Attempt to determine query type from method naming conventions
    const queryType = this.inferQueryType(controllerName, methodName);

    return {
      type: queryType,
      connectionId: this.generateConnectionId(),
      fingerprint: `${controllerName}.${methodName}`,
    };
  }

  /**
   * Infer query type from controller and method names
   */
  private inferQueryType(controllerName: string, methodName: string): string {
    const name = `${controllerName}.${methodName}`.toLowerCase();

    if (
      name.includes('create') ||
      name.includes('insert') ||
      name.includes('add')
    ) {
      return 'INSERT';
    }
    if (
      name.includes('update') ||
      name.includes('modify') ||
      name.includes('edit')
    ) {
      return 'UPDATE';
    }
    if (name.includes('delete') || name.includes('remove')) {
      return 'DELETE';
    }
    if (
      name.includes('find') ||
      name.includes('get') ||
      name.includes('select')
    ) {
      return 'SELECT';
    }

    return 'UNKNOWN';
  }

  /**
   * Extract rows affected from query result
   */
  private extractRowsAffected(result: any): number | undefined {
    if (typeof result === 'object' && result !== null) {
      // Prisma typically returns count for bulk operations
      if ('count' in result && typeof result.count === 'number') {
        return result.count;
      }

      // Array results indicate multiple rows
      if (Array.isArray(result)) {
        return result.length;
      }

      // Single object result
      if (typeof result === 'object') {
        return 1;
      }
    }

    return undefined;
  }

  /**
   * Sanitize result for logging (remove sensitive data)
   */
  private sanitizeResult(result: any): any {
    if (typeof result !== 'object' || result === null) {
      return result;
    }

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];

    if (Array.isArray(result)) {
      return result.map((item) => this.sanitizeObject(item, sensitiveFields));
    }

    return this.sanitizeObject(result, sensitiveFields);
  }

  /**
   * Sanitize object by removing sensitive fields
   */
  private sanitizeObject(obj: any, sensitiveFields: string[]): any {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const sanitized = { ...obj };

    for (const field of sensitiveFields) {
      for (const key of Object.keys(sanitized)) {
        if (key.toLowerCase().includes(field)) {
          sanitized[key] = '[REDACTED]';
        }
      }
    }

    return sanitized;
  }

  /**
   * Record query metrics with history management
   */
  private recordQueryMetrics(metrics: QueryMetrics) {
    this.queryMetrics.push(metrics);

    // Maintain maximum history size
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics.splice(
        0,
        this.queryMetrics.length - this.maxMetricsHistory,
      );
    }
  }

  /**
   * Handle slow query detection and alerting
   */
  private handleSlowQuery(alert: SlowQueryAlert) {
    this.logger.warn('Slow query detected', {
      operationId: alert.operationId,
      query: alert.query,
      duration: `${alert.duration.toFixed(2)}ms`,
      threshold: `${alert.threshold}ms`,
      slowBy: `${(alert.duration - alert.threshold).toFixed(2)}ms`,
      context: alert.context,
    });

    // Here you could integrate with alerting systems like:
    // - Send to metrics collection service
    // - Publish to message queue for alerting
    // - Store in dedicated slow query log table
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Generate connection ID for tracking (placeholder for real connection tracking)
   */
  private generateConnectionId(): string {
    return `conn_${Math.random().toString(36).substring(2, 8)}`;
  }
}
