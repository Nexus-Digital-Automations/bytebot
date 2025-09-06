/**
 * Enterprise Health Monitoring Controller
 *
 * Provides comprehensive Kubernetes-compatible health check and system status
 * endpoints for enterprise deployment monitoring. Supports liveness, readiness,
 * and startup probes for production-grade observability.
 *
 * Features:
 * - Kubernetes health probe endpoints (liveness, readiness, startup)
 * - Database connectivity health checks
 * - External service dependency monitoring
 * - Detailed system status information
 * - Performance metrics and resource monitoring
 * - Structured logging with correlation IDs
 *
 * @author Claude Code - Monitoring & Observability Specialist
 * @version 2.0.0
 */

import { Controller, Get, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Health monitoring controller providing system status endpoints
 */
@Controller('health')
@ApiTags('Health Monitoring')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {
    this.logger.log('Enterprise Health Controller initialized');
    this.logger.log(
      'Available endpoints: /health, /health/live, /health/ready, /health/startup, /health/status',
    );
  }

  /**
   * Basic health check endpoint
   * GET /health
   */
  @Get()
  @ApiOperation({
    summary: 'Basic health check',
    description:
      'Returns basic health status with uptime and memory information',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2025-09-06T01:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        memory: {
          type: 'object',
          properties: {
            used: { type: 'number', example: 128 },
            free: { type: 'number', example: 256 },
            total: { type: 'number', example: 512 },
          },
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  getHealth() {
    const operationId = this.healthService.generateCorrelationId();
    this.logger.debug(`[${operationId}] Health check requested`);

    try {
      const healthData = this.healthService.getBasicHealth();
      this.logger.debug(
        `[${operationId}] Health check completed successfully`,
        {
          status: healthData.status,
          uptime: healthData.uptime,
          memoryUsed: `${healthData.memory.used}MB`,
        },
      );
      return healthData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Health check failed: ${errorMessage}`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        operationId,
      };
    }
  }

  /**
   * Kubernetes liveness probe endpoint
   * GET /health/live
   *
   * Checks if the application process is alive and running.
   * If this fails, Kubernetes will restart the pod.
   */
  @Get('live')
  @ApiOperation({
    summary: 'Kubernetes liveness probe',
    description: 'Checks if the application process is alive and responsive',
  })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  @ApiResponse({ status: 503, description: 'Service is not alive' })
  @HttpCode(HttpStatus.OK)
  async checkLiveness() {
    const operationId = this.healthService.generateCorrelationId();
    this.logger.debug(`[${operationId}] Liveness probe requested`);

    try {
      const processHealth = await this.healthService.checkProcessHealth();
      const systemHealth = await this.healthService.checkSystemResponsiveness();

      const isHealthy = processHealth.isHealthy && systemHealth.isHealthy;

      if (isHealthy) {
        return {
          status: 'ok',
          info: {
            process: processHealth.details,
            system: systemHealth.details,
          },
          error: {},
          details: {
            process: processHealth.details,
            system: systemHealth.details,
          },
        };
      } else {
        const response = {
          status: 'error',
          info: {},
          error: {
            liveness: {
              status: 'down',
              message: 'Liveness checks failed',
            },
          },
          details: {
            process: processHealth.details,
            system: systemHealth.details,
          },
        };

        this.logger.error(`[${operationId}] Liveness check failed`, response);
        return response;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Liveness check failed`, {
        error: errorMessage,
      });

      return {
        status: 'error',
        info: {},
        error: {
          liveness: {
            status: 'down',
            message: errorMessage,
          },
        },
        details: {
          liveness: {
            status: 'down',
            message: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Kubernetes readiness probe endpoint
   * GET /health/ready
   *
   * Checks if the application is ready to receive traffic.
   * This includes database connections and external dependencies.
   */
  @Get('ready')
  @ApiOperation({
    summary: 'Kubernetes readiness probe',
    description: 'Checks if the application is ready to receive traffic',
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  @HttpCode(HttpStatus.OK)
  async checkReadiness() {
    const operationId = this.healthService.generateCorrelationId();
    this.logger.debug(`[${operationId}] Readiness probe requested`);

    try {
      const [databaseHealth, externalServices, authService] = await Promise.all(
        [
          this.healthService.checkDatabaseHealth(),
          this.healthService.checkExternalServices(),
          this.healthService.checkAuthenticationService(),
        ],
      );

      const checks = {
        database: databaseHealth,
        external_services: externalServices,
        authentication: authService,
      };

      const isReady = Object.values(checks).every((check) => check.isHealthy);

      if (isReady) {
        return {
          status: 'ok',
          info: checks,
          error: {},
          details: checks,
        };
      } else {
        const failedChecks = Object.entries(checks)
          .filter(([_, check]) => !check.isHealthy)
          .reduce(
            (acc, [key, check]) => ({
              ...acc,
              [key]: {
                status: 'down',
                message: check.error || 'Health check failed',
              },
            }),
            {},
          );

        return {
          status: 'error',
          info: {},
          error: failedChecks,
          details: checks,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Readiness check failed`, {
        error: errorMessage,
      });

      return {
        status: 'error',
        info: {},
        error: {
          readiness: {
            status: 'down',
            message: errorMessage,
          },
        },
        details: {
          readiness: {
            status: 'down',
            message: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Kubernetes startup probe endpoint
   * GET /health/startup
   *
   * Checks if the application has completed startup initialization.
   * Has longer timeout to allow for slow startup processes.
   */
  @Get('startup')
  @ApiOperation({
    summary: 'Kubernetes startup probe',
    description:
      'Checks if the application has completed startup initialization',
  })
  @ApiResponse({ status: 200, description: 'Service startup complete' })
  @ApiResponse({ status: 503, description: 'Service still starting up' })
  @HttpCode(HttpStatus.OK)
  async checkStartup() {
    const operationId = this.healthService.generateCorrelationId();
    this.logger.debug(`[${operationId}] Startup probe requested`);

    try {
      const [startupComplete, moduleInit, configLoaded] = await Promise.all([
        this.healthService.checkStartupComplete(),
        this.healthService.checkModuleInitialization(),
        this.healthService.checkConfigurationLoaded(),
      ]);

      const checks = {
        startup: startupComplete,
        modules: moduleInit,
        configuration: configLoaded,
      };

      const isStarted = Object.values(checks).every((check) => check.isHealthy);

      if (isStarted) {
        return {
          status: 'ok',
          info: checks,
          error: {},
          details: checks,
        };
      } else {
        const failedChecks = Object.entries(checks)
          .filter(([_, check]) => !check.isHealthy)
          .reduce(
            (acc, [key, check]) => ({
              ...acc,
              [key]: {
                status: 'down',
                message: check.error || 'Startup check failed',
              },
            }),
            {},
          );

        return {
          status: 'error',
          info: {},
          error: failedChecks,
          details: checks,
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Startup check failed`, {
        error: errorMessage,
      });

      return {
        status: 'error',
        info: {},
        error: {
          startup: {
            status: 'down',
            message: errorMessage,
          },
        },
        details: {
          startup: {
            status: 'down',
            message: errorMessage,
          },
        },
      };
    }
  }

  /**
   * Detailed system status endpoint
   * GET /health/status
   */
  @Get('status')
  @ApiOperation({
    summary: 'Detailed system status',
    description:
      'Returns comprehensive system status with service dependencies',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed system status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        timestamp: { type: 'string' },
        uptime: { type: 'number' },
        services: { type: 'object' },
        performance: { type: 'object' },
        dependencies: { type: 'object' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  getDetailedStatus() {
    const operationId = this.healthService.generateCorrelationId();
    this.logger.debug(`[${operationId}] Detailed status requested`);

    try {
      const statusData = this.healthService.getDetailedStatus();
      this.logger.debug(
        `[${operationId}] Detailed status completed successfully`,
        {
          status: statusData.status,
          uptime: statusData.uptime,
          serviceCount: Object.keys(statusData.services).length,
        },
      );
      return statusData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Detailed status check failed: ${errorMessage}`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        services: {},
        operationId,
      };
    }
  }
}
