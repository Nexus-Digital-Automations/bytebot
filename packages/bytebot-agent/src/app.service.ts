/**
 * Application Service - Core application health and status management
 *
 * Provides comprehensive system health monitoring, application status reporting,
 * and system-wide metrics collection for the ByteBot Agent platform.
 *
 * Dependencies: Logger, performance monitoring
 * Usage: Application bootstrap, health checks, status reporting
 */

import { Injectable, Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

/**
 * Interface for application health status response
 */
export interface AppHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  timestamp: Date;
  uptime: number;
  operationId: string;
  performanceMetrics: {
    responseTimeMs: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

/**
 * Interface for application status with detailed metrics
 */
export interface AppStatusResponse {
  service: string;
  version: string;
  environment: string;
  status: 'running' | 'initializing' | 'error';
  operationId: string;
  performanceMetrics: {
    responseTimeMs: number;
    memoryUsage: NodeJS.MemoryUsage;
  };
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly startTime = Date.now();
  private cpuUsageBaseline: NodeJS.CpuUsage;

  constructor() {
    // Initialize CPU usage baseline for accurate measurements
    this.cpuUsageBaseline = process.cpuUsage();

    this.logger.log(
      'AppService initialized with comprehensive monitoring capabilities',
      {
        timestamp: new Date().toISOString(),
        component: 'AppService',
        action: 'initialize',
      },
    );
  }

  /**
   * Returns application greeting with comprehensive logging and performance metrics
   * @returns string Standard application greeting message
   */
  getHello(): string {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Processing application greeting request', {
      operationId,
      timestamp: new Date().toISOString(),
      component: 'AppService',
      action: 'getHello',
    });

    try {
      const greeting =
        'Hello World! ByteBot Agent is running with comprehensive monitoring.';
      const processingTime = performance.now() - startTime;

      this.logger.log('Application greeting request completed successfully', {
        operationId,
        processingTimeMs: processingTime,
        responseLength: greeting.length,
        timestamp: new Date().toISOString(),
        component: 'AppService',
        action: 'getHello',
      });

      return greeting;
    } catch (error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Application greeting request failed', {
        operationId,
        processingTimeMs: processingTime,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'AppService',
        action: 'getHello',
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * Returns comprehensive application health status with performance metrics
   * @returns AppHealthResponse Detailed health status and metrics
   */
  getHealthStatus(): AppHealthResponse {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Processing health status request', {
      operationId,
      timestamp: new Date().toISOString(),
      component: 'AppService',
      action: 'getHealthStatus',
    });

    try {
      // Collect performance metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage(this.cpuUsageBaseline);
      const uptime = Date.now() - this.startTime;
      const responseTime = performance.now() - startTime;

      // Determine health status based on resource usage
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = 'Application is operating normally';

      // Check memory usage (consider degraded if RSS > 1GB)
      if (memoryUsage.rss > 1024 * 1024 * 1024) {
        status = 'degraded';
        message = 'Application is running with high memory usage';
      }

      // Check if memory usage is critical (RSS > 2GB)
      if (memoryUsage.rss > 2 * 1024 * 1024 * 1024) {
        status = 'unhealthy';
        message = 'Application is running with critical memory usage';
      }

      const healthResponse: AppHealthResponse = {
        status,
        message,
        timestamp: new Date(),
        uptime,
        operationId,
        performanceMetrics: {
          responseTimeMs: responseTime,
          memoryUsage,
          cpuUsage,
        },
      };

      this.logger.log('Health status request completed', {
        operationId,
        processingTimeMs: responseTime,
        healthStatus: status,
        memoryUsageMB: Math.round(memoryUsage.rss / 1024 / 1024),
        uptimeMs: uptime,
        timestamp: new Date().toISOString(),
        component: 'AppService',
        action: 'getHealthStatus',
      });

      return healthResponse;
    } catch (error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Health status request failed', {
        operationId,
        processingTimeMs: processingTime,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'AppService',
        action: 'getHealthStatus',
      });

      throw new Error(errorMessage);
    }
  }

  /**
   * Returns comprehensive application status with version and environment information
   * @returns AppStatusResponse Detailed application status and metrics
   */
  getStatus(): AppStatusResponse {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Processing application status request', {
      operationId,
      timestamp: new Date().toISOString(),
      component: 'AppService',
      action: 'getStatus',
    });

    try {
      // Collect performance metrics
      const memoryUsage = process.memoryUsage();
      const responseTime = performance.now() - startTime;

      const statusResponse: AppStatusResponse = {
        service: 'ByteBot Agent',
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        status: 'running',
        operationId,
        performanceMetrics: {
          responseTimeMs: responseTime,
          memoryUsage,
        },
      };

      this.logger.log('Application status request completed', {
        operationId,
        processingTimeMs: responseTime,
        version: statusResponse.version,
        environment: statusResponse.environment,
        memoryUsageMB: Math.round(memoryUsage.rss / 1024 / 1024),
        timestamp: new Date().toISOString(),
        component: 'AppService',
        action: 'getStatus',
      });

      return statusResponse;
    } catch (error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Application status request failed', {
        operationId,
        processingTimeMs: processingTime,
        error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'AppService',
        action: 'getStatus',
      });

      throw new Error(errorMessage);
    }
  }
}
