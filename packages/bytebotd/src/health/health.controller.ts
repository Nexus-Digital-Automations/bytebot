/**
 * System Health Monitoring Controller
 *
 * Provides simple health check and system status endpoints for monitoring
 * and deployment orchestration. Enables basic service health validation.
 *
 * Features:
 * - Basic health check endpoint
 * - System status information
 * - Service dependency status
 * - Memory and uptime metrics
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * Health monitoring controller providing system status endpoints
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly healthService: HealthService) {
    this.logger.log('Health Controller initialized');
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
