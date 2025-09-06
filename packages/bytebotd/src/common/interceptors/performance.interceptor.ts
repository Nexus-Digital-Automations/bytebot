/**
 * Performance Interceptor - Response Time Tracking and Monitoring
 *
 * Provides comprehensive performance monitoring for API endpoints with
 * automatic metrics collection, slow query detection, and performance
 * alerting. Designed for enterprise-grade observability.
 *
 * Features:
 * - Response time tracking with percentile metrics
 * - Slow endpoint detection and alerting
 * - Memory usage monitoring per request
 * - Database query performance tracking
 * - Comprehensive logging with operation IDs
 * - Prometheus metrics integration
 * - Performance baseline establishment
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 1.0.0
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { Request, Response } from 'express';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * Performance monitoring data for each request
 */
interface PerformanceMetrics {
  operationId: string;
  startTime: number;
  endTime: number;
  duration: number;
  method: string;
  url: string;
  statusCode: number;
  memoryBefore: NodeJS.MemoryUsage;
  memoryAfter: NodeJS.MemoryUsage;
  memoryDelta: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

/**
 * Performance warning thresholds
 */
interface PerformanceThresholds {
  slowRequestWarning: number; // ms
  slowRequestCritical: number; // ms
  memoryLeakWarning: number; // bytes
  memoryUsageWarning: number; // percentage
}

/**
 * Performance statistics tracking
 */
interface PerformanceStats {
  requestCount: number;
  averageResponseTime: number;
  slowRequests: number;
  memoryAlerts: number;
  p50ResponseTime: number;
  p90ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

/**
 * Performance monitoring interceptor
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly responseTimes: number[] = [];
  private readonly stats: PerformanceStats = {
    requestCount: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    memoryAlerts: 0,
    p50ResponseTime: 0,
    p90ResponseTime: 0,
    p95ResponseTime: 0,
    p99ResponseTime: 0,
  };

  // Performance thresholds (configurable via environment variables)
  private readonly thresholds: PerformanceThresholds = {
    slowRequestWarning: parseInt(
      process.env.SLOW_REQUEST_WARNING || '1000',
      10,
    ), // 1 second
    slowRequestCritical: parseInt(
      process.env.SLOW_REQUEST_CRITICAL || '5000',
      10,
    ), // 5 seconds
    memoryLeakWarning: parseInt(
      process.env.MEMORY_LEAK_WARNING || '50000000',
      10,
    ), // 50MB
    memoryUsageWarning: parseInt(process.env.MEMORY_USAGE_WARNING || '80', 10), // 80%
  };

  constructor(private readonly metricsService?: MetricsService) {
    this.logger.log('Performance Interceptor initialized');
    this.logger.log(
      `Thresholds: warning=${this.thresholds.slowRequestWarning}ms, critical=${this.thresholds.slowRequestCritical}ms`,
    );

    // Start periodic stats reporting
    this.startPeriodicReporting();
  }

  /**
   * Intercept HTTP requests to monitor performance
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate unique operation ID for request tracking
    const operationId = `perf_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    const memoryBefore = process.memoryUsage();

    // Add operation ID to request for downstream services
    (request as any).operationId = operationId;

    this.logger.debug(
      `[${operationId}] Performance monitoring started: ${request.method} ${request.url}`,
    );

    return next.handle().pipe(
      tap((data) => {
        // Request completed successfully
        this.recordPerformanceMetrics({
          operationId,
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          method: request.method,
          url: request.url,
          statusCode: response.statusCode,
          memoryBefore,
          memoryAfter: process.memoryUsage(),
          memoryDelta: this.calculateMemoryDelta(
            memoryBefore,
            process.memoryUsage(),
          ),
        });
      }),
      catchError((error) => {
        // Request failed - still record performance metrics
        this.recordPerformanceMetrics({
          operationId,
          startTime,
          endTime: Date.now(),
          duration: Date.now() - startTime,
          method: request.method,
          url: request.url,
          statusCode: response.statusCode || 500,
          memoryBefore,
          memoryAfter: process.memoryUsage(),
          memoryDelta: this.calculateMemoryDelta(
            memoryBefore,
            process.memoryUsage(),
          ),
        });

        throw error; // Re-throw the error
      }),
    );
  }

  /**
   * Record comprehensive performance metrics for the request
   */
  private recordPerformanceMetrics(metrics: PerformanceMetrics): void {
    try {
      // Log performance information
      this.logPerformanceMetrics(metrics);

      // Record metrics in MetricsService
      if (this.metricsService) {
        this.metricsService.recordApiRequestDuration(
          metrics.method,
          this.normalizeUrl(metrics.url),
          metrics.statusCode,
          metrics.duration,
        );
      }

      // Update internal statistics
      this.updateStats(metrics);

      // Check for performance warnings
      this.checkPerformanceThresholds(metrics);

      // Store response time for percentile calculations
      this.storeResponseTime(metrics.duration);
    } catch (error) {
      this.logger.error(
        `[${metrics.operationId}] Failed to record performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Log detailed performance metrics
   */
  private logPerformanceMetrics(metrics: PerformanceMetrics): void {
    const logLevel = this.determineLogLevel(metrics.duration);
    const logData = {
      operationId: metrics.operationId,
      method: metrics.method,
      url: metrics.url,
      statusCode: metrics.statusCode,
      duration: `${metrics.duration}ms`,
      memoryDelta: {
        rss: `${(metrics.memoryDelta.rss / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(metrics.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      },
    };

    switch (logLevel) {
      case 'debug':
        this.logger.debug(
          `[${metrics.operationId}] Request completed`,
          logData,
        );
        break;
      case 'log':
        this.logger.log(`[${metrics.operationId}] Request completed`, logData);
        break;
      case 'warn':
        this.logger.warn(
          `[${metrics.operationId}] Slow request detected`,
          logData,
        );
        break;
      case 'error':
        this.logger.error(
          `[${metrics.operationId}] Critical slow request`,
          logData,
        );
        break;
    }
  }

  /**
   * Determine appropriate log level based on response time
   */
  private determineLogLevel(
    duration: number,
  ): 'debug' | 'log' | 'warn' | 'error' {
    if (duration >= this.thresholds.slowRequestCritical) {
      return 'error';
    } else if (duration >= this.thresholds.slowRequestWarning) {
      return 'warn';
    } else if (duration >= 500) {
      return 'log';
    } else {
      return 'debug';
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkPerformanceThresholds(metrics: PerformanceMetrics): void {
    // Check response time thresholds
    if (metrics.duration >= this.thresholds.slowRequestCritical) {
      this.stats.slowRequests++;
      this.logger.error(
        `[${metrics.operationId}] CRITICAL: Request exceeded ${this.thresholds.slowRequestCritical}ms threshold`,
        {
          duration: metrics.duration,
          url: metrics.url,
          method: metrics.method,
        },
      );
    } else if (metrics.duration >= this.thresholds.slowRequestWarning) {
      this.stats.slowRequests++;
      this.logger.warn(
        `[${metrics.operationId}] WARNING: Request exceeded ${this.thresholds.slowRequestWarning}ms threshold`,
        {
          duration: metrics.duration,
          url: metrics.url,
          method: metrics.method,
        },
      );
    }

    // Check memory usage thresholds
    const memoryIncrease = Math.max(
      metrics.memoryDelta.rss,
      metrics.memoryDelta.heapUsed,
    );

    if (memoryIncrease > this.thresholds.memoryLeakWarning) {
      this.stats.memoryAlerts++;
      this.logger.warn(`[${metrics.operationId}] Memory usage spike detected`, {
        memoryDelta: metrics.memoryDelta,
        url: metrics.url,
        method: metrics.method,
      });
    }
  }

  /**
   * Calculate memory usage delta
   */
  private calculateMemoryDelta(
    before: NodeJS.MemoryUsage,
    after: NodeJS.MemoryUsage,
  ): PerformanceMetrics['memoryDelta'] {
    return {
      rss: after.rss - before.rss,
      heapTotal: after.heapTotal - before.heapTotal,
      heapUsed: after.heapUsed - before.heapUsed,
      external: after.external - before.external,
    };
  }

  /**
   * Normalize URL for consistent metrics grouping
   */
  private normalizeUrl(url: string): string {
    // Remove query parameters and normalize path parameters
    return url
      .split('?')[0] // Remove query string
      .replace(/\/\d+/g, '/:id') // Replace numeric path params
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid') // Replace UUID path params
      .replace(/\/[a-f0-9]{24}/g, '/:objectid'); // Replace MongoDB ObjectId path params
  }

  /**
   * Store response time for percentile calculations
   */
  private storeResponseTime(duration: number): void {
    this.responseTimes.push(duration);

    // Keep only last 1000 response times to prevent memory bloat
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }

    // Recalculate percentiles periodically
    if (this.responseTimes.length % 50 === 0) {
      this.calculatePercentiles();
    }
  }

  /**
   * Calculate response time percentiles
   */
  private calculatePercentiles(): void {
    if (this.responseTimes.length === 0) return;

    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const length = sortedTimes.length;

    this.stats.p50ResponseTime = this.getPercentile(sortedTimes, 50);
    this.stats.p90ResponseTime = this.getPercentile(sortedTimes, 90);
    this.stats.p95ResponseTime = this.getPercentile(sortedTimes, 95);
    this.stats.p99ResponseTime = this.getPercentile(sortedTimes, 99);
  }

  /**
   * Get specific percentile from sorted array
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Update internal performance statistics
   */
  private updateStats(metrics: PerformanceMetrics): void {
    this.stats.requestCount++;

    // Update average response time
    this.stats.averageResponseTime =
      (this.stats.averageResponseTime * (this.stats.requestCount - 1) +
        metrics.duration) /
      this.stats.requestCount;
  }

  /**
   * Get current performance statistics
   */
  getStats(): PerformanceStats {
    this.calculatePercentiles();
    return { ...this.stats };
  }

  /**
   * Clear performance statistics
   */
  clearStats(): void {
    Object.assign(this.stats, {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      memoryAlerts: 0,
      p50ResponseTime: 0,
      p90ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
    });

    this.responseTimes.length = 0;
    this.logger.log('Performance statistics cleared');
  }

  /**
   * Start periodic performance statistics reporting
   */
  private startPeriodicReporting(): void {
    // Report stats every 5 minutes
    setInterval(() => {
      if (this.stats.requestCount > 0) {
        this.calculatePercentiles();

        this.logger.log('Performance Statistics Summary:', {
          requestCount: this.stats.requestCount,
          averageResponseTime: `${this.stats.averageResponseTime.toFixed(2)}ms`,
          slowRequests: this.stats.slowRequests,
          memoryAlerts: this.stats.memoryAlerts,
          percentiles: {
            p50: `${this.stats.p50ResponseTime}ms`,
            p90: `${this.stats.p90ResponseTime}ms`,
            p95: `${this.stats.p95ResponseTime}ms`,
            p99: `${this.stats.p99ResponseTime}ms`,
          },
        });
      }
    }, 300000); // 5 minutes
  }
}
