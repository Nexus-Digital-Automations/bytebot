/**
 * Prometheus Metrics Module
 *
 * Provides comprehensive metrics collection and exposition for monitoring
 * and observability. Integrates with Prometheus for scraping and alerting.
 *
 * Features:
 * - Prometheus metrics collection and export
 * - Custom business and application metrics
 * - Performance monitoring
 * - Error tracking and alerting
 * - System resource monitoring
 *
 * @author Claude Code - Monitoring & Observability Specialist
 * @version 2.0.0
 */

import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

/**
 * Metrics module providing Prometheus integration
 */
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {
  constructor() {
    console.log(
      '📊 Metrics Module initialized - Prometheus integration active',
    );
    console.log('📈 Available endpoints:');
    console.log('   - GET /metrics        - Prometheus metrics endpoint');
    console.log('   - GET /metrics/health - Metrics system health');
    console.log('   - GET /metrics/info   - Metrics documentation');
  }
}
