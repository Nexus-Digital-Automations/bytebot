/**
 * Metrics Collection Module
 *
 * NestJS module providing comprehensive application metrics collection using
 * Prometheus client. Enables enterprise-grade observability with custom
 * business metrics and performance tracking.
 *
 * Features:
 * - Prometheus metrics endpoints
 * - Custom application metrics (task processing, API performance)
 * - Computer-use operation metrics
 * - WebSocket connection tracking
 * - Database performance metrics
 *
 * Dependencies: prom-client
 * Exports: MetricsService for use by other modules
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Module, Logger } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * Metrics collection module providing application observability
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService], // Export service for use by other modules
})
export class MetricsModule {
  private readonly logger = new Logger(MetricsModule.name);

  constructor() {
    this.logger.log('Metrics Module initialized - Prometheus metrics enabled');
    this.logger.log('Available endpoints: GET /metrics');
  }
}
