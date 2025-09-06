/**
 * Database Health Guard - Enterprise Database Health Monitoring
 * Provides comprehensive database health checking and graceful degradation
 * for the Bytebot API platform
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ServiceUnavailableException,
  BadGatewayException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

export interface DatabaseHealthConfig {
  enabled: boolean;
  checkInterval: number; // Health check interval in ms
  unhealthyThreshold: number; // Number of failed checks to mark unhealthy
  degradedThreshold: number; // Number of failed checks to mark degraded
  recoveryThreshold: number; // Number of successful checks to recover
  queryTimeout: number; // Timeout for health check queries
  gracefulDegradation: boolean; // Allow requests in degraded state
  blockOnUnhealthy: boolean; // Block requests when unhealthy
}

export interface DatabaseHealthMetrics {
  status: HealthStatus;
  lastCheckTime: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalChecks: number;
  totalFailures: number;
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastError: string | null;
  checkHistory: HealthCheckResult[];
}

export interface HealthCheckResult {
  timestamp: Date;
  success: boolean;
  responseTime: number;
  error?: string;
}

/**
 * Decorator to enable database health checking on routes or controllers
 */
export const RequireDatabaseHealth = (
  config?: Partial<DatabaseHealthConfig>,
) => {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata(
        'database-health-config',
        config || {},
        target,
        propertyKey,
      );
    } else {
      // Class decorator
      Reflect.defineMetadata('database-health-config', config || {}, target);
    }
  };
};

@Injectable()
export class DatabaseHealthGuard implements CanActivate {
  private readonly logger = new Logger(DatabaseHealthGuard.name);
  private readonly defaultConfig: DatabaseHealthConfig;
  private healthMetrics: DatabaseHealthMetrics;
  private healthCheckInterval: NodeJS.Timeout;
  private readonly startTime = new Date();

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
    private readonly databaseService: DatabaseService,
  ) {
    this.defaultConfig = {
      enabled: this.configService.get<boolean>('DB_HEALTH_CHECK_ENABLED', true),
      checkInterval: this.configService.get<number>(
        'DB_HEALTH_CHECK_INTERVAL',
        30000,
      ), // 30 seconds
      unhealthyThreshold: this.configService.get<number>(
        'DB_HEALTH_UNHEALTHY_THRESHOLD',
        3,
      ),
      degradedThreshold: this.configService.get<number>(
        'DB_HEALTH_DEGRADED_THRESHOLD',
        2,
      ),
      recoveryThreshold: this.configService.get<number>(
        'DB_HEALTH_RECOVERY_THRESHOLD',
        3,
      ),
      queryTimeout: this.configService.get<number>(
        'DB_HEALTH_QUERY_TIMEOUT',
        5000,
      ), // 5 seconds
      gracefulDegradation: this.configService.get<boolean>(
        'DB_HEALTH_GRACEFUL_DEGRADATION',
        true,
      ),
      blockOnUnhealthy: this.configService.get<boolean>(
        'DB_HEALTH_BLOCK_ON_UNHEALTHY',
        true,
      ),
    };

    this.initializeHealthMetrics();

    if (this.defaultConfig.enabled) {
      this.startHealthMonitoring();
    }

    this.logger.log('Database health guard initialized', {
      config: this.defaultConfig,
      healthMonitoringEnabled: this.defaultConfig.enabled,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get health check configuration
    const handlerConfig = this.reflector.get<Partial<DatabaseHealthConfig>>(
      'database-health-config',
      handler,
    );
    const controllerConfig = this.reflector.get<Partial<DatabaseHealthConfig>>(
      'database-health-config',
      controller,
    );

    if (!handlerConfig && !controllerConfig) {
      // No health check configuration, allow request
      return true;
    }

    const config = {
      ...this.defaultConfig,
      ...controllerConfig,
      ...handlerConfig,
    };

    if (!config.enabled) {
      return true;
    }

    const health = this.getHealthStatus();
    const operationId = this.generateOperationId();

    this.logger.debug(`[${operationId}] Database health check`, {
      status: health.status,
      consecutiveFailures: health.consecutiveFailures,
      responseTime: health.responseTime,
      operationId,
    });

    // Handle different health states
    switch (health.status) {
      case HealthStatus.HEALTHY:
        return true;

      case HealthStatus.DEGRADED:
        if (config.gracefulDegradation) {
          this.logger.warn(
            `[${operationId}] Database degraded but allowing request`,
            {
              consecutiveFailures: health.consecutiveFailures,
              operationId,
            },
          );
          // Add degraded status header for client awareness
          request.res?.set('X-Database-Status', 'DEGRADED');
          return true;
        } else {
          this.logger.warn(
            `[${operationId}] Database degraded - blocking request`,
            {
              consecutiveFailures: health.consecutiveFailures,
              operationId,
            },
          );
          throw new BadGatewayException(
            'Database is experiencing issues - Service degraded',
          );
        }

      case HealthStatus.UNHEALTHY:
        if (!config.blockOnUnhealthy) {
          this.logger.warn(
            `[${operationId}] Database unhealthy but allowing request`,
            {
              consecutiveFailures: health.consecutiveFailures,
              lastError: health.lastError,
              operationId,
            },
          );
          request.res?.set('X-Database-Status', 'UNHEALTHY');
          return true;
        } else {
          this.logger.error(
            `[${operationId}] Database unhealthy - blocking request`,
            {
              consecutiveFailures: health.consecutiveFailures,
              lastError: health.lastError,
              operationId,
            },
          );
          throw new ServiceUnavailableException(
            'Database is currently unavailable',
          );
        }

      case HealthStatus.UNKNOWN:
        this.logger.warn(
          `[${operationId}] Database health unknown - allowing request`,
          {
            operationId,
          },
        );
        request.res?.set('X-Database-Status', 'UNKNOWN');
        return true;

      default:
        return false;
    }
  }

  /**
   * Get current database health status
   */
  getHealthStatus(): DatabaseHealthMetrics {
    return { ...this.healthMetrics };
  }

  /**
   * Perform manual health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      this.logger.debug(`[${operationId}] Performing database health check`, {
        operationId,
      });

      // Use database service health check with timeout
      const healthPromise = this.databaseService.getHealthStatus();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error('Health check timeout')),
          this.defaultConfig.queryTimeout,
        );
      });

      await Promise.race([healthPromise, timeoutPromise]);

      const responseTime = Date.now() - startTime;

      const result: HealthCheckResult = {
        timestamp: new Date(),
        success: true,
        responseTime,
      };

      this.recordHealthCheckResult(result);

      this.logger.debug(`[${operationId}] Database health check passed`, {
        responseTime,
        operationId,
      });

      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const result: HealthCheckResult = {
        timestamp: new Date(),
        success: false,
        responseTime,
        error: errorMessage,
      };

      this.recordHealthCheckResult(result);

      this.logger.error(`[${operationId}] Database health check failed`, {
        error: errorMessage,
        responseTime,
        operationId,
      });

      return result;
    }
  }

  /**
   * Get detailed health report for monitoring
   */
  getDetailedHealthReport() {
    const uptime = Date.now() - this.startTime.getTime();

    return {
      status: this.healthMetrics.status,
      uptime,
      lastCheckTime: this.healthMetrics.lastCheckTime,
      responseTime: this.healthMetrics.responseTime,
      errorRate: this.healthMetrics.errorRate,
      consecutiveFailures: this.healthMetrics.consecutiveFailures,
      consecutiveSuccesses: this.healthMetrics.consecutiveSuccesses,
      totalChecks: this.healthMetrics.totalChecks,
      totalFailures: this.healthMetrics.totalFailures,
      lastError: this.healthMetrics.lastError,
      recentHistory: this.healthMetrics.checkHistory.slice(-10), // Last 10 checks
      configuration: this.defaultConfig,
    };
  }

  /**
   * Force health status change (for testing or manual intervention)
   */
  setHealthStatus(status: HealthStatus, reason?: string) {
    const oldStatus = this.healthMetrics.status;
    this.healthMetrics.status = status;
    this.healthMetrics.lastCheckTime = new Date();

    this.logger.log('Manual health status change', {
      fromStatus: oldStatus,
      toStatus: status,
      reason: reason || 'Manual override',
    });
  }

  /**
   * Initialize health metrics
   */
  private initializeHealthMetrics() {
    this.healthMetrics = {
      status: HealthStatus.UNKNOWN,
      lastCheckTime: new Date(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalChecks: 0,
      totalFailures: 0,
      uptime: 0,
      responseTime: 0,
      errorRate: 0,
      lastError: null,
      checkHistory: [],
    };
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring() {
    this.logger.log('Starting database health monitoring', {
      interval: this.defaultConfig.checkInterval,
    });

    // Perform initial health check
    this.performHealthCheck();

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.defaultConfig.checkInterval);
  }

  /**
   * Record health check result and update metrics
   */
  private recordHealthCheckResult(result: HealthCheckResult) {
    // Update basic metrics
    this.healthMetrics.lastCheckTime = result.timestamp;
    this.healthMetrics.totalChecks++;
    this.healthMetrics.responseTime = result.responseTime;

    // Add to history
    this.healthMetrics.checkHistory.push(result);
    if (this.healthMetrics.checkHistory.length > 100) {
      this.healthMetrics.checkHistory =
        this.healthMetrics.checkHistory.slice(-100);
    }

    if (result.success) {
      // Successful check
      this.healthMetrics.consecutiveSuccesses++;
      this.healthMetrics.consecutiveFailures = 0;

      // Check if we should transition to healthy
      if (
        this.healthMetrics.consecutiveSuccesses >=
        this.defaultConfig.recoveryThreshold
      ) {
        this.updateHealthStatus(HealthStatus.HEALTHY);
      }
    } else {
      // Failed check
      this.healthMetrics.consecutiveFailures++;
      this.healthMetrics.consecutiveSuccesses = 0;
      this.healthMetrics.totalFailures++;
      this.healthMetrics.lastError = result.error || null;

      // Determine new health status based on consecutive failures
      if (
        this.healthMetrics.consecutiveFailures >=
        this.defaultConfig.unhealthyThreshold
      ) {
        this.updateHealthStatus(HealthStatus.UNHEALTHY);
      } else if (
        this.healthMetrics.consecutiveFailures >=
        this.defaultConfig.degradedThreshold
      ) {
        this.updateHealthStatus(HealthStatus.DEGRADED);
      }
    }

    // Update error rate
    if (this.healthMetrics.totalChecks > 0) {
      this.healthMetrics.errorRate =
        this.healthMetrics.totalFailures / this.healthMetrics.totalChecks;
    }

    // Update uptime
    this.healthMetrics.uptime = Date.now() - this.startTime.getTime();
  }

  /**
   * Update health status with logging
   */
  private updateHealthStatus(newStatus: HealthStatus) {
    if (this.healthMetrics.status !== newStatus) {
      const oldStatus = this.healthMetrics.status;
      this.healthMetrics.status = newStatus;

      this.logger.log('Database health status changed', {
        fromStatus: oldStatus,
        toStatus: newStatus,
        consecutiveFailures: this.healthMetrics.consecutiveFailures,
        consecutiveSuccesses: this.healthMetrics.consecutiveSuccesses,
        errorRate: this.healthMetrics.errorRate,
      });
    }
  }

  /**
   * Clean up resources on service destruction
   */
  onDestroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.logger.log('Database health monitoring stopped');
    }
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `health_op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
