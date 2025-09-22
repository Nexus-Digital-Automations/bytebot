/**
 * Database Health Guard - ByteBotd Database Connectivity Protection
 * Ensures database connectivity and health before processing browser automation requests
 *
 * Features:
 * - Real-time database connectivity monitoring
 * - Health check caching with TTL
 * - Graceful degradation for non-critical operations
 * - Comprehensive error handling and logging
 * - Integration with circuit breaker patterns
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Enterprise Resilience Implementation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * Database health status interface
 */
interface DatabaseHealthStatus {
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  connectionCount?: number;
  errorMessage?: string;
  checkCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * Database health check configuration
 */
interface DatabaseHealthConfig {
  checkInterval: number; // Interval between health checks in ms
  timeout: number; // Health check timeout in ms
  maxRetries: number; // Max retries for failed health checks
  cacheTimeout: number; // Cache health status for this duration in ms
  requireHealthy: boolean; // Whether to block requests when unhealthy
  gracefulDegradation: boolean; // Allow read-only operations when degraded
}

/**
 * Decorator to configure database health requirements
 */
export const RequireDatabaseHealth = (options?: {
  requireHealthy?: boolean;
  allowReadOnly?: boolean;
  timeout?: number;
}) => {
  return (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (propertyKey && descriptor) {
      Reflect.defineMetadata(
        'database-health-config',
        options || {},
        target,
        propertyKey,
      );
    } else {
      Reflect.defineMetadata('database-health-config', options || {}, target);
    }
  };
};

@Injectable()
export class DatabaseHealthGuard implements CanActivate {
  private readonly logger = new Logger(DatabaseHealthGuard.name);
  private readonly config: DatabaseHealthConfig;
  private healthStatus: DatabaseHealthStatus;
  private lastHealthCheck = 0;
  private healthCheckPromise: Promise<DatabaseHealthStatus> | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.config = {
      checkInterval: this.configService.get<number>('DB_HEALTH_CHECK_INTERVAL', 30000), // 30 seconds
      timeout: this.configService.get<number>('DB_HEALTH_CHECK_TIMEOUT', 5000), // 5 seconds
      maxRetries: this.configService.get<number>('DB_HEALTH_MAX_RETRIES', 3),
      cacheTimeout: this.configService.get<number>('DB_HEALTH_CACHE_TIMEOUT', 10000), // 10 seconds
      requireHealthy: this.configService.get<boolean>('DB_HEALTH_REQUIRE_HEALTHY', true),
      gracefulDegradation: this.configService.get<boolean>('DB_HEALTH_GRACEFUL_DEGRADATION', true),
    };

    // Initialize health status
    this.healthStatus = {
      isHealthy: false,
      responseTime: 0,
      lastChecked: new Date(0),
      checkCount: 0,
      successCount: 0,
      failureCount: 0,
    };

    this.logger.log('Database Health Guard initialized');
    this.logger.log(`Configuration: ${JSON.stringify(this.config)}`);

    // Start periodic health checks
    this.startPeriodicHealthChecks();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get database health configuration from metadata
    const methodConfig = this.reflector.get<{
      requireHealthy?: boolean;
      allowReadOnly?: boolean;
      timeout?: number;
    }>('database-health-config', handler) || {};
    const classConfig = this.reflector.get<{
      requireHealthy?: boolean;
      allowReadOnly?: boolean;
      timeout?: number;
    }>('database-health-config', controller) || {};

    const options = {
      requireHealthy: this.config.requireHealthy,
      allowReadOnly: this.config.gracefulDegradation,
      timeout: this.config.timeout,
      ...classConfig,
      ...methodConfig,
    };

    try {
      // Get current health status
      const healthStatus = await this.getHealthStatus();

      // Check if database is healthy
      if (!healthStatus.isHealthy) {
        this.logger.warn(
          `Database health check failed - Status: unhealthy, ` +
          `Response time: ${healthStatus.responseTime}ms, ` +
          `Error: ${healthStatus.errorMessage || 'Unknown error'}`
        );

        // Check if we should allow graceful degradation
        if (options.allowReadOnly && this.isReadOnlyOperation(request)) {
          this.logger.debug(
            `Allowing read-only operation despite database health issues: ${request.method} ${request.url}`
          );
          return true;
        }

        // Check if health is required for this endpoint
        if (options.requireHealthy) {
          throw new ServiceUnavailableException({
            message: 'Database is currently unavailable',
            healthStatus: {
              isHealthy: healthStatus.isHealthy,
              responseTime: healthStatus.responseTime,
              lastChecked: healthStatus.lastChecked,
              errorMessage: healthStatus.errorMessage,
            },
            retryAfter: Math.ceil(this.config.checkInterval / 1000), // Convert to seconds
          });
        }
      }

      this.logger.debug(
        `Database health check passed - Response time: ${healthStatus.responseTime}ms`
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Database health guard failed: ${(error as Error).message}`,
        (error as Error).stack
      );
      throw error;
    }
  }

  /**
   * Get current database health status with caching
   */
  private async getHealthStatus(): Promise<DatabaseHealthStatus> {
    const now = Date.now();

    // Return cached status if still valid
    if (
      this.healthStatus.lastChecked.getTime() + this.config.cacheTimeout > now &&
      this.healthStatus.checkCount > 0
    ) {
      return this.healthStatus;
    }

    // If a health check is already in progress, wait for it
    if (this.healthCheckPromise) {
      return this.healthCheckPromise;
    }

    // Perform new health check
    this.healthCheckPromise = this.performHealthCheck();

    try {
      const result = await this.healthCheckPromise;
      this.healthCheckPromise = null;
      return result;
    } catch (error) {
      this.healthCheckPromise = null;
      throw error;
    }
  }

  /**
   * Perform actual database health check
   */
  private async performHealthCheck(): Promise<DatabaseHealthStatus> {
    const startTime = Date.now();
    let retries = 0;

    while (retries <= this.config.maxRetries) {
      try {
        this.logger.debug(`Performing database health check (attempt ${retries + 1})`);

        // Simulate database health check
        // In a real implementation, this would check actual database connectivity
        const isHealthy = await this.checkDatabaseConnectivity();
        const responseTime = Date.now() - startTime;

        this.healthStatus = {
          isHealthy,
          responseTime,
          lastChecked: new Date(),
          checkCount: this.healthStatus.checkCount + 1,
          successCount: isHealthy ? this.healthStatus.successCount + 1 : this.healthStatus.successCount,
          failureCount: isHealthy ? this.healthStatus.failureCount : this.healthStatus.failureCount + 1,
          errorMessage: isHealthy ? undefined : 'Database connectivity check failed',
        };

        if (isHealthy) {
          this.logger.debug(
            `Database health check successful - Response time: ${responseTime}ms`
          );
        } else {
          this.logger.warn(
            `Database health check failed - Response time: ${responseTime}ms`
          );
        }

        return this.healthStatus;
      } catch (error) {
        retries++;
        const responseTime = Date.now() - startTime;

        this.logger.error(
          `Database health check attempt ${retries} failed: ${(error as Error).message}`
        );

        if (retries > this.config.maxRetries) {
          this.healthStatus = {
            isHealthy: false,
            responseTime,
            lastChecked: new Date(),
            checkCount: this.healthStatus.checkCount + 1,
            successCount: this.healthStatus.successCount,
            failureCount: this.healthStatus.failureCount + 1,
            errorMessage: (error as Error).message,
          };

          return this.healthStatus;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Database health check failed after all retries');
  }

  /**
   * Check actual database connectivity
   * This is a placeholder - implement actual database connectivity check
   */
  private async checkDatabaseConnectivity(): Promise<boolean> {
    return new Promise((resolve) => {
      // Simulate database check with random success/failure
      // In real implementation, this would ping the database
      const simulatedLatency = Math.random() * 100 + 50; // 50-150ms

      setTimeout(() => {
        // Simulate 95% success rate
        const isHealthy = Math.random() > 0.05;
        resolve(isHealthy);
      }, simulatedLatency);
    });
  }

  /**
   * Determine if the operation is read-only
   */
  private isReadOnlyOperation(request: any): boolean {
    const method = request.method?.toLowerCase();
    const url = request.url?.toLowerCase() || '';

    // Consider GET requests and specific read-only endpoints as read-only
    if (method === 'get') {
      return true;
    }

    // Check for read-only endpoints by URL pattern
    const readOnlyPatterns = [
      '/health',
      '/status',
      '/metrics',
      '/monitoring',
      '/screenshots',
      '/sessions/.*/state',
    ];

    return readOnlyPatterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '[^/]*'));
      return regex.test(url);
    });
  }

  /**
   * Start periodic health checks
   */
  private startPeriodicHealthChecks(): void {
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error(
          `Periodic health check failed: ${(error as Error).message}`,
          (error as Error).stack
        );
      }
    }, this.config.checkInterval);

    this.logger.log(`Periodic health checks started with ${this.config.checkInterval}ms interval`);
  }

  /**
   * Get current health metrics for monitoring
   */
  getHealthMetrics(): DatabaseHealthStatus & {
    config: DatabaseHealthConfig;
    uptime: number;
    healthPercentage: number;
  } {
    const uptime = Date.now() - this.healthStatus.lastChecked.getTime();
    const healthPercentage = this.healthStatus.checkCount > 0
      ? (this.healthStatus.successCount / this.healthStatus.checkCount) * 100
      : 0;

    return {
      ...this.healthStatus,
      config: this.config,
      uptime,
      healthPercentage,
    };
  }

  /**
   * Force health check for testing/debugging
   */
  async forceHealthCheck(): Promise<DatabaseHealthStatus> {
    this.healthCheckPromise = null; // Clear any pending promise
    this.lastHealthCheck = 0; // Force new check
    return this.performHealthCheck();
  }

  /**
   * Set health status for testing
   */
  setHealthStatus(isHealthy: boolean, errorMessage?: string): void {
    this.healthStatus = {
      isHealthy,
      responseTime: 0,
      lastChecked: new Date(),
      checkCount: this.healthStatus.checkCount + 1,
      successCount: isHealthy ? this.healthStatus.successCount + 1 : this.healthStatus.successCount,
      failureCount: isHealthy ? this.healthStatus.failureCount : this.healthStatus.failureCount + 1,
      errorMessage,
    };

    this.logger.debug(`Health status manually set to: ${isHealthy ? 'healthy' : 'unhealthy'}`);
  }

  /**
   * Get database connection pool status (placeholder)
   */
  getConnectionPoolStatus(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
  } {
    // Placeholder implementation
    // In real implementation, this would query the actual connection pool
    return {
      totalConnections: 10,
      activeConnections: 3,
      idleConnections: 7,
      waitingClients: 0,
    };
  }
}