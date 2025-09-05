/**
 * C/ua Performance Service
 *
 * Comprehensive performance monitoring and optimization service for C/ua framework integration.
 * Handles metrics collection, resource monitoring, and performance analytics.
 *
 * Features:
 * - Real-time performance metrics collection
 * - Resource usage monitoring (CPU, memory, network)
 * - Operation timing and profiling
 * - Performance alerts and notifications
 * - Historical data analysis
 *
 * @author Claude Code
 * @version 1.0.0
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CuaIntegrationConfig } from './cua-integration.service';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Error Handler Utility for safe error processing
 * Provides type-safe error message extraction and stack trace handling
 */
export class ErrorHandler {
  /**
   * Safely extract error message from unknown error types
   * @param error - Unknown error object
   * @returns Safe error message string
   */
  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: unknown };
      return typeof errorObj.message === 'string'
        ? errorObj.message
        : JSON.stringify(error);
    }
    return typeof error === 'string' ? error : JSON.stringify(error);
  }
}

/**
 * Performance Metric Interface
 */
export interface PerformanceMetric {
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  method?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * System Resource Metrics
 */
export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usagePercent: number;
  };
  disk: {
    used: number;
    free: number;
    usagePercent: number;
  };
  network?: {
    bytesIn: number;
    bytesOut: number;
  };
}

/**
 * Performance Summary
 */
export interface PerformanceSummary {
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  operationBreakdown: Record<
    string,
    {
      count: number;
      averageDuration: number;
      successRate: number;
    }
  >;
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
  timeRange: {
    start: Date;
    end: Date;
  };
}

@Injectable()
export class CuaPerformanceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CuaPerformanceService.name);
  private readonly config: CuaIntegrationConfig;
  private readonly metrics: PerformanceMetric[] = [];
  private readonly systemMetrics: SystemMetrics[] = [];
  private metricsCollectionInterval!: NodeJS.Timeout;
  private readonly MAX_METRICS_HISTORY = 10000;
  private readonly METRICS_COLLECTION_INTERVAL = 30000; // 30 seconds

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<CuaIntegrationConfig>('cua') || {
      framework: {
        enabled: false,
        containerId: 'unknown',
        version: '1.0.0',
        performanceMode: 'standard',
        logLevel: 'info',
      },
      aneBridge: {
        enabled: false,
        host: 'localhost',
        port: 8080,
        baseUrl: 'http://localhost:8080',
        fallbackEnabled: true,
        timeoutMs: 5000,
      },
      monitoring: { enabled: false, metricsCollection: false },
      hybrid: { nativeBridgeEnabled: false, sharedVolumePath: '/tmp' },
    };

    this.logger.log(
      `Performance monitoring: ${this.config?.monitoring?.enabled ? 'enabled' : 'disabled'}`,
    );
  }

  onModuleInit(): void {
    if (!this.config?.monitoring?.enabled) {
      this.logger.log('Performance monitoring is disabled');
      return;
    }

    this.logger.log('Starting performance monitoring');

    // Start metrics collection
    this.startMetricsCollection();

    // Log initial system state
    this.collectSystemMetrics();

    this.logger.log('Performance monitoring initialized');
  }

  async onModuleDestroy() {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
    }

    // Save final metrics summary
    await this.saveMetricsSummary();

    this.logger.log('Performance monitoring shut down');
  }

  /**
   * Record a performance metric for an operation
   */
  recordMetric(
    operation: string,
    data: {
      duration: number;
      success: boolean;
      method?: string;
      error?: string;
      [key: string]: unknown;
    },
  ): void {
    if (!this.config?.monitoring?.enabled) {
      return;
    }

    // Safely extract metadata from data object
    const extractedMetadata: Record<string, unknown> = {};
    const excludedKeys = ['duration', 'success', 'method', 'error'];

    for (const [key, value] of Object.entries(data)) {
      if (!excludedKeys.includes(key)) {
        extractedMetadata[key] = value;
      }
    }

    const metric: PerformanceMetric = {
      timestamp: new Date(),
      operation,
      duration: data.duration,
      success: data.success,
      method: data.method,
      error: data.error,
      metadata: extractedMetadata,
    };

    this.metrics.push(metric);

    // Limit metrics history
    if (this.metrics.length > this.MAX_METRICS_HISTORY) {
      this.metrics.splice(0, this.metrics.length - this.MAX_METRICS_HISTORY);
    }

    // Log significant events
    if (!data.success) {
      this.logger.warn(
        `Performance metric recorded: ${operation} failed in ${data.duration}ms - ${data.error}`,
      );
    } else if (data.duration > 10000) {
      // > 10 seconds
      this.logger.warn(
        `Performance metric recorded: ${operation} took ${data.duration}ms (slow operation)`,
      );
    }

    this.logger.debug(
      `Performance metric: ${operation} - ${data.duration}ms (${data.method || 'unknown'}) - ${data.success ? 'success' : 'failure'}`,
    );
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(timeRangeMinutes: number = 60): PerformanceSummary {
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRangeMinutes * 60 * 1000);

    // Filter metrics within time range
    const relevantMetrics = this.metrics.filter(
      (m) => m.timestamp >= startTime,
    );

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        operationBreakdown: {},
        systemHealth: {
          cpuUsage: 0,
          memoryUsage: 0,
          diskUsage: 0,
        },
        timeRange: { start: startTime, end: now },
      };
    }

    // Calculate overall statistics
    const totalOperations = relevantMetrics.length;
    const successfulOperations = relevantMetrics.filter(
      (m) => m.success,
    ).length;
    const successRate = (successfulOperations / totalOperations) * 100;
    const averageDuration =
      relevantMetrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations;

    // Calculate operation breakdown with proper typing
    interface OperationBreakdownData {
      count: number;
      totalDuration: number;
      successes: number;
      averageDuration?: number;
      successRate?: number;
    }

    const operationBreakdown: Record<string, OperationBreakdownData> = {};

    for (const metric of relevantMetrics) {
      if (!operationBreakdown[metric.operation]) {
        operationBreakdown[metric.operation] = {
          count: 0,
          totalDuration: 0,
          successes: 0,
        };
      }

      const breakdown = operationBreakdown[metric.operation];
      breakdown.count++;
      breakdown.totalDuration += metric.duration;
      if (metric.success) breakdown.successes++;
    }

    // Finalize breakdown calculations and create proper return type
    const finalOperationBreakdown: Record<
      string,
      {
        count: number;
        averageDuration: number;
        successRate: number;
      }
    > = {};

    for (const [operation, data] of Object.entries(operationBreakdown)) {
      finalOperationBreakdown[operation] = {
        count: data.count,
        averageDuration: data.totalDuration / data.count,
        successRate: (data.successes / data.count) * 100,
      };
    }

    // Get latest system health
    const latestSystemMetrics =
      this.systemMetrics[this.systemMetrics.length - 1];
    const systemHealth = latestSystemMetrics
      ? {
          cpuUsage: latestSystemMetrics.cpu.usage,
          memoryUsage: latestSystemMetrics.memory.usagePercent,
          diskUsage: latestSystemMetrics.disk.usagePercent,
        }
      : { cpuUsage: 0, memoryUsage: 0, diskUsage: 0 };

    return {
      totalOperations,
      successRate,
      averageDuration,
      operationBreakdown: finalOperationBreakdown,
      systemHealth,
      timeRange: { start: startTime, end: now },
    };
  }

  /**
   * Get detailed metrics for a specific operation
   */
  getOperationMetrics(
    operation: string,
    timeRangeMinutes: number = 60,
  ): PerformanceMetric[] {
    const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);

    return this.metrics.filter(
      (m) => m.operation === operation && m.timestamp >= cutoffTime,
    );
  }

  /**
   * Get current system resource usage
   */
  getCurrentSystemMetrics(): SystemMetrics {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      timestamp: new Date(),
      cpu: {
        usage: this.getCpuUsage(),
        loadAverage: os.loadavg(),
      },
      memory: {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        usagePercent: (usedMemory / totalMemory) * 100,
      },
      disk: {
        used: 0, // Would need additional system calls
        free: 0,
        usagePercent: 0,
      },
    };
  }

  /**
   * Check if system performance is within acceptable limits
   */
  isSystemHealthy(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];
    const latest = this.systemMetrics[this.systemMetrics.length - 1];

    if (!latest) {
      return { healthy: true, issues: [] };
    }

    // Check CPU usage
    if (latest.cpu.usage > 80) {
      issues.push(`High CPU usage: ${latest.cpu.usage.toFixed(1)}%`);
    }

    // Check memory usage
    if (latest.memory.usagePercent > 85) {
      issues.push(
        `High memory usage: ${latest.memory.usagePercent.toFixed(1)}%`,
      );
    }

    // Check recent operation success rate
    const recentMetrics = this.metrics.slice(-100); // Last 100 operations
    if (recentMetrics.length > 10) {
      const successRate =
        (recentMetrics.filter((m) => m.success).length / recentMetrics.length) *
        100;
      if (successRate < 90) {
        issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Export metrics data for external analysis
   */
  exportMetrics(timeRangeMinutes: number = 60): {
    performanceMetrics: PerformanceMetric[];
    systemMetrics: SystemMetrics[];
    summary: PerformanceSummary;
  } {
    const cutoffTime = new Date(Date.now() - timeRangeMinutes * 60 * 1000);

    const performanceMetrics = this.metrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    const systemMetrics = this.systemMetrics.filter(
      (m) => m.timestamp >= cutoffTime,
    );
    const summary = this.getPerformanceSummary(timeRangeMinutes);

    return {
      performanceMetrics,
      systemMetrics,
      summary,
    };
  }

  // === Private Methods ===

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      try {
        this.collectSystemMetrics();
      } catch (error) {
        const errorMessage = ErrorHandler.extractErrorMessage(error);
        this.logger.warn(`Failed to collect system metrics: ${errorMessage}`);
      }
    }, this.METRICS_COLLECTION_INTERVAL);
  }

  /**
   * Collect current system metrics
   */
  private collectSystemMetrics(): void {
    const metrics = this.getCurrentSystemMetrics();
    this.systemMetrics.push(metrics);

    // Limit system metrics history
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics.splice(0, this.systemMetrics.length - 1000);
    }

    // Log system health warnings
    const health = this.isSystemHealthy();
    if (!health.healthy) {
      this.logger.warn(
        `System health issues detected: ${health.issues.join(', ')}`,
      );
    }
  }

  /**
   * Get approximate CPU usage (simplified)
   */
  private getCpuUsage(): number {
    // This is a simplified CPU usage calculation
    // In production, you'd want to use a proper system monitoring library
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    return Math.min((loadAvg / cpuCount) * 100, 100);
  }

  /**
   * Save metrics summary to shared volume
   */
  private async saveMetricsSummary(): Promise<void> {
    if (!this.config?.hybrid?.sharedVolumePath) {
      return;
    }

    try {
      const summary = this.getPerformanceSummary(60); // Last hour
      const metricsData = {
        timestamp: new Date().toISOString(),
        service: 'bytebotd-performance',
        summary,
        systemHealth: this.isSystemHealthy(),
      };

      const metricsPath = path.join(
        this.config.hybrid.sharedVolumePath,
        'performance-metrics.json',
      );
      await fs.writeFile(metricsPath, JSON.stringify(metricsData, null, 2));

      this.logger.debug('Performance metrics saved to shared volume');
    } catch (error) {
      const errorMessage = ErrorHandler.extractErrorMessage(error);
      this.logger.warn(`Failed to save metrics summary: ${errorMessage}`);
    }
  }
}
