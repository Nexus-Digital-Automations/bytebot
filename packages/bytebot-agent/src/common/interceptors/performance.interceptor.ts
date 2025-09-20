/**
 * Performance Interceptor
 *
 * Monitors and tracks performance metrics for all API endpoints,
 * including execution time, memory usage, and performance categorization.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Enhanced request interface with correlation tracking
 */
interface RequestWithCorrelation extends Request {
  correlationId?: string;
}

/**
 * Performance statistics aggregation for monitoring systems
 */
interface PerformanceStatistics {
  totalRequests: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorRate: number;
  throughputPerSecond: number;
  memoryUsageMB: number;
  performanceCategoryDistribution: Record<string, number>;
  statusCodeDistribution: Record<number, number>;
  endpointMetrics: Array<{
    endpoint: string;
    averageTime: number;
    requestCount: number;
  }>;
}

export interface PerformanceMetrics {
  endpoint: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
  responseSize: number;
  statusCode: number;
  userAgent: string;
  clientIP: string;
  correlationId: string;
  performanceCategory: string;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private readonly metricsBuffer: PerformanceMetrics[] = [];
  private readonly maxBufferSize = 1000;
  private metricsFlushInterval: NodeJS.Timeout;

  constructor() {
    // Flush metrics every 30 seconds
    this.metricsFlushInterval = setInterval(() => {
      this.flushMetrics();
    }, 30000);
  }

  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const startTime = process.hrtime.bigint();
    const memoryBefore = process.memoryUsage();
    const requestWithCorrelation = request as RequestWithCorrelation;
    const correlationId =
      requestWithCorrelation.correlationId || this.generateCorrelationId();

    return next.handle().pipe(
      tap((responseData) => {
        const endTime = process.hrtime.bigint();
        const memoryAfter = process.memoryUsage();

        const metrics = this.calculateMetrics(
          request,
          response,
          responseData,
          startTime,
          endTime,
          memoryBefore,
          memoryAfter,
          correlationId,
        );

        this.recordMetrics(metrics);
      }),
    );
  }

  private calculateMetrics(
    _request: Request,
    _response: Response,
    responseData: unknown,
    startTime: bigint,
    endTime: bigint,
    memoryBefore: NodeJS.MemoryUsage,
    memoryAfter: NodeJS.MemoryUsage,
    correlationId: string,
  ): PerformanceMetrics {
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    const responseSize = this.calculateResponseSize(responseData);

    const memoryDelta = {
      heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
      heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
      external: memoryAfter.external - memoryBefore.external,
      rss: memoryAfter.rss - memoryBefore.rss,
    };

    return {
      endpoint: this.sanitizeEndpoint(request.originalUrl || request.url),
      method: request.method,
      startTime: Number(startTime) / 1000000, // Convert to milliseconds
      endTime: Number(endTime) / 1000000,
      duration,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryDelta,
      },
      responseSize,
      statusCode: response.statusCode,
      userAgent: request.get('User-Agent') || 'unknown',
      clientIP: this.extractClientIP(request),
      correlationId,
      performanceCategory: this.categorizePerformance(duration),
    };
  }

  private recordMetrics(metrics: PerformanceMetrics): void {
    // Add to buffer
    this.metricsBuffer.push(metrics);

    // Log performance warnings for slow requests
    if (metrics.duration > 5000) {
      this.logger.warn(
        `Slow request detected: ${metrics.method} ${metrics.endpoint} - ${metrics.duration}ms ` +
          `[${metrics.correlationId}]`,
        {
          duration: metrics.duration,
          memoryDelta: metrics.memoryUsage.delta,
          responseSize: metrics.responseSize,
          performanceCategory: metrics.performanceCategory,
        },
      );
    }

    // Log memory usage warnings
    if (metrics.memoryUsage.delta.heapUsed > 50 * 1024 * 1024) {
      // 50MB
      this.logger.warn(
        `High memory usage: ${metrics.method} ${metrics.endpoint} - ` +
          `${Math.round(metrics.memoryUsage.delta.heapUsed / 1024 / 1024)}MB ` +
          `[${metrics.correlationId}]`,
      );
    }

    // Maintain buffer size
    if (this.metricsBuffer.length > this.maxBufferSize) {
      this.metricsBuffer.shift();
    }
  }

  private calculateResponseSize(responseData: unknown): number {
    if (!responseData) return 0;

    try {
      return JSON.stringify(responseData).length;
    } catch {
      return 0;
    }
  }

  private sanitizeEndpoint(url: string): string {
    // Remove query parameters and sanitize dynamic segments
    const basePath = url.split('?')[0];

    // Replace UUIDs and IDs with placeholders
    return basePath
      .replace(
        //[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g,
        '/:uuid',
      )
      .replace(//\d+/g, '/:id');
  }

  private extractClientIP(_request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string) ||
      (request.headers['x-real-ip'] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private categorizePerformance(duration: number): string {
    if (duration < 100) return 'excellent';
    if (duration < 300) return 'good';
    if (duration < 1000) return 'acceptable';
    if (duration < 3000) return 'slow';
    if (duration < 10000) return 'very-slow';
    return 'critical';
  }

  private flushMetrics(): void {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer.length = 0; // Clear buffer

    // Calculate aggregate statistics
    const stats = this.calculateAggregateStats(metrics);

    this.logger.debug(
      `Performance metrics flushed: ${metrics.length} requests`,
      stats,
    );

    // In a production environment, you would send these metrics to your
    // monitoring system (e.g., Prometheus, DataDog, CloudWatch, etc.)
    // Convert the calculated stats to match PerformanceStatistics interface
    const performanceStats: PerformanceStatistics = {
      totalRequests: stats.totalRequests,
      averageResponseTime: stats.averageDuration,
      maxResponseTime: stats.p99Duration,
      minResponseTime: Math.min(...metrics.map((m) => m.duration)),
      errorRate: 0, // Would need to track error metrics separately
      throughputPerSecond:
        (stats.totalRequests /
          (metrics.length > 0
            ? metrics[metrics.length - 1].endTime - metrics[0].startTime
            : 1)) *
        1000,
      memoryUsageMB: stats.averageMemoryUsage / (1024 * 1024),
      performanceCategoryDistribution: stats.performanceDistribution,
      statusCodeDistribution: {}, // Would need to track status codes separately
      endpointMetrics: stats.topSlowEndpoints.map((endpoint) => ({
        endpoint: endpoint.endpoint,
        averageTime: endpoint.duration,
        requestCount: 1, // Each entry represents one request
        errorCount: 0, // Would need to track errors separately
      })),
    };

    this.sendToMonitoringSystem(metrics, performanceStats);
  }

  private calculateAggregateStats(metrics: PerformanceMetrics[]) {
    const durations = metrics.map((m) => m.duration);
    const memorySizes = metrics.map((m) => m.memoryUsage.delta.heapUsed);
    const responseSizes = metrics.map((m) => m.responseSize);

    return {
      totalRequests: metrics.length,
      averageDuration: this.average(durations),
      medianDuration: this.median(durations),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      averageMemoryUsage: this.average(memorySizes),
      averageResponseSize: this.average(responseSizes),
      performanceDistribution: this.getPerformanceDistribution(metrics),
      topSlowEndpoints: this.getTopSlowEndpoints(metrics, 5),
      errorCount: metrics.filter((m) => m.statusCode >= 400).length,
      timeRange: {
        start: Math.min(...metrics.map((m) => m.startTime)),
        end: Math.max(...metrics.map((m) => m.endTime)),
      },
    };
  }

  private getPerformanceDistribution(metrics: PerformanceMetrics[]) {
    const categories = [
      'excellent',
      'good',
      'acceptable',
      'slow',
      'very-slow',
      'critical',
    ];
    const distribution: Record<string, number> = {};

    categories.forEach((category) => {
      distribution[category] = metrics.filter(
        (m) => m.performanceCategory === category,
      ).length;
    });

    return distribution;
  }

  private getTopSlowEndpoints(metrics: PerformanceMetrics[], count: number) {
    return metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count)
      .map((m) => ({
        endpoint: `${m.method} ${m.endpoint}`,
        duration: m.duration,
        performanceCategory: m.performanceCategory,
      }));
  }

  private average(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  }

  private median(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  private percentile(numbers: number[], percentile: number): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private sendToMonitoringSystem(
    metrics: PerformanceMetrics[],
    stats: PerformanceStatistics,
  ): void {
    // This is where you would integrate with your monitoring system
    // For example: Prometheus, DataDog, New Relic, etc.

    // For now, we'll just log the stats periodically
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug('Performance statistics:', {
        ...stats,
        sampleMetrics: metrics.slice(0, 3), // Include sample metrics
      });
    }
  }

  private generateCorrelationId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  onModuleDestroy() {
    if (this.metricsFlushInterval) {
      clearInterval(this.metricsFlushInterval);
    }

    // Flush remaining metrics on shutdown
    this.flushMetrics();
  }
}
