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
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { Controller, Get, Logger } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { HealthService } from './health.service';

/**
 * Health monitoring controller providing system status endpoints
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly healthService: HealthService,
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {
    this.logger.log('Enterprise Health Controller initialized');
    this.logger.log(
      'Available endpoints: /health, /health/live, /health/ready, /health/startup, /health/status',
    );
  }

  /**
   * Basic health check endpoint
   * GET /health
   *
   * @returns Simple health status response
   */
  @Get()
  getHealth() {
    this.logger.debug('Health check requested');

    try {
      const healthData = this.healthService.getBasicHealth();
      this.logger.debug('Health check completed successfully');
      return healthData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Health check failed: ${errorMessage}`);

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage,
      };
    }
  }

  /**
   * Kubernetes liveness probe endpoint
   * GET /health/live
   *
   * Checks if the application process is alive and running.
   * If this fails, Kubernetes will restart the pod.
   *
   * @returns Liveness probe status
   */
  @Get('live')
  @HealthCheck()
  checkLiveness() {
    const operationId = `liveness_${Date.now()}`;
    this.logger.debug(`[${operationId}] Liveness probe requested`);

    return this.health.check([
      // Check memory usage (fail if over 90% memory usage)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024 * 1024), // 150MB limit
      // Check if core services are responsive
      () => this.healthService.checkProcessHealth(),
    ]);
  }

  /**
   * Kubernetes readiness probe endpoint
   * GET /health/ready
   *
   * Checks if the application is ready to receive traffic.
   * This includes database connections and external dependencies.
   *
   * @returns Readiness probe status
   */
  @Get('ready')
  @HealthCheck()
  checkReadiness() {
    const operationId = `readiness_${Date.now()}`;
    this.logger.debug(`[${operationId}] Readiness probe requested`);

    return this.health.check([
      // Check database connectivity
      () => this.healthService.checkDatabaseHealth(),
      // Check external service dependencies
      () => this.healthService.checkExternalServices(),
      // Check disk space (warn if over 80%)
      () =>
        this.disk.checkStorage('storage', { thresholdPercent: 0.8, path: '/' }),
      // Check memory usage (warn if over 80%)
      () => this.memory.checkHeap('memory_heap', 120 * 1024 * 1024 * 1024), // 120MB limit
    ]);
  }

  /**
   * Kubernetes startup probe endpoint
   * GET /health/startup
   *
   * Checks if the application has completed startup initialization.
   * Has longer timeout to allow for slow startup processes.
   *
   * @returns Startup probe status
   */
  @Get('startup')
  @HealthCheck()
  checkStartup() {
    const operationId = `startup_${Date.now()}`;
    this.logger.debug(`[${operationId}] Startup probe requested`);

    return this.health.check([
      // Check if service has been running long enough to be considered stable
      () => this.healthService.checkStartupComplete(),
      // Check if all modules are initialized
      () => this.healthService.checkModuleInitialization(),
      // Basic database connectivity (for startup)
      () => this.healthService.checkDatabaseHealth(),
    ]);
  }

  /**
   * Detailed system status endpoint
   * GET /health/status
   *
   * @returns Comprehensive system status information
   */
  @Get('status')
  getDetailedStatus() {
    this.logger.debug('Detailed status requested');

    try {
      const statusData = this.healthService.getDetailedStatus();
      this.logger.debug('Detailed status completed successfully');
      return statusData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Detailed status check failed: ${errorMessage}`);

      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        services: {},
      };
    }
  }
}
