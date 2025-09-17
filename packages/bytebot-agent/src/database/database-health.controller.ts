/**
 * Database Health Controller - Enterprise Database Monitoring API
 * Exposes database health metrics, performance data, and circuit breaker status
 * for monitoring and operational visibility
 */

import {
  Controller,
  Get,
  Post,
  Param,
  HttpStatus,
  HttpCode,
  Logger,
  Header,
} from '@nestjs/common';
import { ParlantSecure } from '@bytebot/shared/server';
import { DatabaseService } from './database.service';
import { DatabaseHealthService } from './health/database-health.service';
import {
  CircuitBreakerGuard,
  CircuitBreakerState,
} from '../common/guards/circuit-breaker.guard';
import {
  DatabaseHealthGuard,
  RequireDatabaseHealth,
} from '../common/guards/database-health.guard';

@Controller('database')
@RequireDatabaseHealth({ enabled: true, gracefulDegradation: true })
export class DatabaseHealthController {
  private readonly logger = new Logger(DatabaseHealthController.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly circuitBreakerGuard: CircuitBreakerGuard,
    private readonly databaseHealthGuard: DatabaseHealthGuard,
  ) {}

  /**
   * Get comprehensive database health status
   * Used by Kubernetes liveness/readiness probes and monitoring systems
   */
  @Get('health')
  @ParlantSecure({
    intent:
      'Retrieve comprehensive database health status including connection state and circuit breaker metrics',
    securityLevel: 'HIGH',
    description:
      'Critical endpoint exposing database health, performance metrics, and operational status for monitoring systems',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getHealthStatus() {
    const operationId = this.generateOperationId();

    try {
      this.logger.debug(`[${operationId}] Database health check requested`, {
        operationId,
      });

      const healthReport =
        await this.databaseHealthService.performHealthCheck(true);
      const detailedHealth = this.databaseHealthGuard.getDetailedHealthReport();

      const response = {
        status: healthReport.status,
        timestamp: healthReport.timestamp.toISOString(),
        duration: healthReport.duration,
        database: {
          connectionStatus: healthReport.status,
          isConnected: healthReport.status !== 'unhealthy',
          checks: healthReport.checks,
        },
        healthGuard: {
          status: detailedHealth.status,
          consecutiveFailures: detailedHealth.consecutiveFailures,
          consecutiveSuccesses: detailedHealth.consecutiveSuccesses,
          errorRate: detailedHealth.errorRate,
          totalChecks: detailedHealth.totalChecks,
        },
        kubernetes: healthReport.kubernetes,
        summary: healthReport.summary,
        operationId,
      };

      this.logger.debug(`[${operationId}] Database health check completed`, {
        status: response.status,
        operationId,
      });

      return response;
    } catch (error) {
      this.logger.error(`[${operationId}] Database health check failed`, {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
        operationId,
      };
    }
  }

  /**
   * Get detailed database metrics for monitoring dashboards
   */
  @Get('metrics')
  @ParlantSecure({
    intent:
      'Retrieve detailed database performance metrics including connection pool utilization and query statistics',
    securityLevel: 'HIGH',
    description:
      'Secure endpoint providing comprehensive database metrics for monitoring dashboards and operational analysis',
  })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-cache, max-age=30')
  getDatabaseMetrics(): {
    timestamp: string;
    connectionPool: {
      utilization: number;
      active: number;
      idle: number;
      waiting: number;
      total: number;
    };
    performance: {
      slowQueryRate: number;
      averageQueryTime: number;
      slowQueries: number;
      totalQueries: number;
      queriesPerSecond: number;
    };
    health: any;
    operationId: string;
  } {
    const operationId = this.generateOperationId();

    try {
      this.logger.debug(`[${operationId}] Database metrics requested`, {
        operationId,
      });

      const metrics = this.databaseService.getMetrics();
      const healthReport = this.databaseHealthGuard.getDetailedHealthReport();

      const response = {
        timestamp: new Date().toISOString(),
        connectionPool: {
          ...metrics.connectionPool,
          utilization:
            metrics.connectionPool.total > 0
              ? (metrics.connectionPool.active / metrics.connectionPool.total) *
                100
              : 0,
        },
        performance: {
          ...metrics.performance,
          slowQueryRate:
            metrics.performance.totalQueries > 0
              ? (metrics.performance.slowQueries /
                  metrics.performance.totalQueries) *
                100
              : 0,
        },
        health: {
          ...metrics.health,
          status: healthReport.status,
          consecutiveFailures: healthReport.consecutiveFailures,
          totalFailures: healthReport.totalFailures,
        },
        operationId,
      };

      this.logger.debug(`[${operationId}] Database metrics collected`, {
        totalQueries: metrics.performance.totalQueries,
        averageQueryTime: metrics.performance.averageQueryTime,
        operationId,
      });

      return response;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to collect database metrics`, {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });

      throw error;
    }
  }

  /**
   * Get circuit breaker status and metrics
   */
  @Get('circuit-breaker')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-cache, max-age=30')
  getCircuitBreakerStatus() {
    const operationId = this.generateOperationId();

    try {
      this.logger.debug(`[${operationId}] Circuit breaker status requested`, {
        operationId,
      });

      const allCircuits = this.circuitBreakerGuard.getAllCircuitMetrics();

      const response = {
        timestamp: new Date().toISOString(),
        totalCircuits: allCircuits.size,
        circuits: Array.from(allCircuits.entries()).map(([key, metrics]) => ({
          circuitKey: key,
          state: metrics.state,
          totalRequests: metrics.totalRequests,
          successCount: metrics.successCount,
          failureCount: metrics.failureCount,
          failureRate: metrics.failureRate,
          lastFailureTime: metrics.lastFailureTime,
          lastSuccessTime: metrics.lastSuccessTime,
          stateChangedAt: metrics.stateChangedAt,
          nextRetryTime: metrics.nextRetryTime,
        })),
        summary: {
          openCircuits: Array.from(allCircuits.values()).filter(
            (c) => c.state === CircuitBreakerState.OPEN,
          ).length,
          halfOpenCircuits: Array.from(allCircuits.values()).filter(
            (c) => c.state === CircuitBreakerState.HALF_OPEN,
          ).length,
          closedCircuits: Array.from(allCircuits.values()).filter(
            (c) => c.state === CircuitBreakerState.CLOSED,
          ).length,
        },
        operationId,
      };

      this.logger.debug(`[${operationId}] Circuit breaker status collected`, {
        totalCircuits: response.totalCircuits,
        openCircuits: response.summary.openCircuits,
        operationId,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `[${operationId}] Failed to get circuit breaker status`,
        {
          error: error instanceof Error ? error.message : String(error),
          operationId,
        },
      );

      throw error;
    }
  }

  /**
   * Reset specific circuit breaker (for manual intervention)
   */
  @Post('circuit-breaker/:circuitKey/reset')
  @HttpCode(HttpStatus.OK)
  resetCircuitBreaker(@Param('circuitKey') circuitKey: string) {
    const operationId = this.generateOperationId();

    try {
      this.logger.log(
        `[${operationId}] Manual circuit breaker reset requested`,
        {
          circuitKey,
          operationId,
        },
      );

      this.circuitBreakerGuard.resetCircuit(circuitKey);

      const response = {
        success: true,
        message: `Circuit breaker '${circuitKey}' has been reset`,
        timestamp: new Date().toISOString(),
        circuitKey,
        operationId,
      };

      this.logger.log(`[${operationId}] Circuit breaker reset completed`, {
        circuitKey,
        operationId,
      });

      return response;
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to reset circuit breaker`, {
        circuitKey,
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });

      throw error;
    }
  }

  /**
   * Kubernetes liveness probe endpoint
   */
  @Get('health/liveness')
  @HttpCode(HttpStatus.OK)
  async getLivenessProbe() {
    const result = await this.databaseHealthService.getLivenessStatus();
    if (!result.status) {
      throw new Error('Database liveness check failed');
    }
    return {
      probe: 'liveness',
      healthy: result.status,
      details: result.details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Kubernetes readiness probe endpoint
   */
  @Get('health/readiness')
  @HttpCode(HttpStatus.OK)
  async getReadinessProbe() {
    const result = await this.databaseHealthService.getReadinessStatus();
    if (!result.status) {
      throw new Error('Database readiness check failed');
    }
    return {
      probe: 'readiness',
      healthy: result.status,
      details: result.details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Kubernetes startup probe endpoint
   */
  @Get('health/startup')
  @HttpCode(HttpStatus.OK)
  async getStartupProbe() {
    const result = await this.databaseHealthService.getStartupStatus();
    if (!result.status) {
      throw new Error('Database startup check failed');
    }
    return {
      probe: 'startup',
      healthy: result.status,
      details: result.details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Perform manual health check
   */
  @Post('health/check')
  @HttpCode(HttpStatus.OK)
  async performHealthCheck() {
    const operationId = this.generateOperationId();

    try {
      this.logger.log(`[${operationId}] Manual health check requested`, {
        operationId,
      });

      const healthResult =
        await this.databaseHealthService.performHealthCheck(true);

      const response = {
        ...healthResult,
        operationId,
      };

      this.logger.log(`[${operationId}] Manual health check completed`, {
        status: healthResult.status,
        duration: healthResult.duration,
        operationId,
      });

      return response;
    } catch (error) {
      this.logger.error(`[${operationId}] Manual health check failed`, {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });

      throw error;
    }
  }

  /**
   * Get database connection pool statistics
   */
  @Get('connection-pool')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-cache, max-age=10')
  getConnectionPoolStatus(): {
    timestamp: string;
    connectionPool: {
      active: number;
      idle: number;
      waiting: number;
      total: number;
    };
    utilization: {
      percentage: number;
      status: string;
    };
    performance: {
      averageQueryTime: number;
      totalQueries: number;
      queriesPerSecond: number;
    };
    operationId: string;
  } {
    const operationId = this.generateOperationId();

    try {
      this.logger.debug(`[${operationId}] Connection pool status requested`, {
        operationId,
      });

      const metrics = this.databaseService.getMetrics();

      const response = {
        timestamp: new Date().toISOString(),
        connectionPool: metrics.connectionPool,
        utilization: {
          percentage:
            metrics.connectionPool.total > 0
              ? (metrics.connectionPool.active / metrics.connectionPool.total) *
                100
              : 0,
          status: this.getPoolUtilizationStatus(metrics.connectionPool),
        },
        performance: {
          averageQueryTime: metrics.performance.averageQueryTime,
          totalQueries: metrics.performance.totalQueries,
          queriesPerSecond: metrics.performance.queriesPerSecond,
        },
        operationId,
      };

      this.logger.debug(`[${operationId}] Connection pool status collected`, {
        active: metrics.connectionPool.active,
        total: metrics.connectionPool.total,
        operationId,
      });

      return response;
    } catch (error) {
      this.logger.error(
        `[${operationId}] Failed to get connection pool status`,
        {
          error: error instanceof Error ? error.message : String(error),
          operationId,
        },
      );

      throw error;
    }
  }

  /**
   * Determine connection pool utilization status
   */
  private getPoolUtilizationStatus(pool: {
    active: number;
    total: number;
    waiting: number;
  }) {
    const utilization = pool.total > 0 ? (pool.active / pool.total) * 100 : 0;

    if (utilization > 90) return 'critical';
    if (utilization > 75) return 'high';
    if (utilization > 50) return 'moderate';
    return 'normal';
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `health_api_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
