/**
 * System Health Monitoring Module
 *
 * NestJS module providing comprehensive health monitoring and system status
 * capabilities for the Bytebot platform. Enables deployment orchestration
 * and operational monitoring.
 *
 * Features:
 * - Health check endpoints
 * - System status monitoring
 * - Service dependency validation
 * - Performance metrics collection
 *
 * Dependencies: None (standalone module)
 * Exports: HealthService for use by other modules
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Health monitoring module providing system observability
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService], // Export service for use by other modules
})
export class HealthModule {
  private readonly logger = new Logger(HealthModule.name);

  constructor() {
    this.logger.log('Health Module initialized - System monitoring enabled');
    this.logger.log('Available endpoints: GET /health, GET /health/status');
  }
}
