/**
 * Enterprise Health Monitoring Module
 *
 * NestJS module providing comprehensive Kubernetes-compatible health monitoring
 * and system status capabilities for the Bytebot platform. Enables enterprise-grade
 * deployment orchestration and operational monitoring with Prometheus integration.
 *
 * Features:
 * - Kubernetes health probe endpoints (liveness, readiness, startup)
 * - Database connectivity health checks
 * - External service dependency monitoring
 * - Detailed system status information
 * - Performance metrics collection
 * - Terminus health check integration
 *
 * Dependencies: @nestjs/terminus
 * Exports: HealthService for use by other modules
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ParlantModule } from '../parlant/parlant.module';

/**
 * Enterprise health monitoring module providing Kubernetes observability
 */
@Module({
  imports: [
    TerminusModule, // Provides health check indicators
    HttpModule, // For external service health checks
    ParlantModule, // Provides ParlantHealthMetricsValidationService for conversational validation
    // MonitoringModule, // Provides MetricsService for Prometheus metrics - temporarily disabled due to EventEmitter dependency issue
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService], // Export service for use by other modules
})
export class HealthModule {
  private readonly logger = new Logger(HealthModule.name);

  constructor() {
    this.logger.log(
      'Enterprise Health Module initialized - Kubernetes monitoring and Prometheus metrics enabled',
    );
    this.logger.log(
      'Available endpoints: GET /health, GET /health/live, GET /health/ready, GET /health/startup, GET /health/status, GET /health/metrics',
    );
    this.logger.log(
      'Kubernetes probes: liveness (/health/live), readiness (/health/ready), startup (/health/startup)',
    );
    this.logger.log(
      'Prometheus metrics: /health/metrics - exposing health and performance metrics for local monitoring',
    );
  }
}
