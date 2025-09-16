/**
 * Local Monitoring Module for Bytebot Platform
 * 
 * NestJS module providing comprehensive local monitoring capabilities
 * including Prometheus metrics collection, health checks, and 
 * performance monitoring for local-only deployment architecture.
 * 
 * Features:
 * - Metrics collection service registration
 * - Monitoring controller endpoints
 * - Event-driven monitoring integration
 * - Configuration management
 * - Local monitoring stack coordination
 * 
 * @author Claude Code - Local Health Checks & Monitoring Integration Specialist
 * @version 1.0.0 - Local-Only Architecture Compliant
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MetricsService } from './metrics.service';
import { MonitoringController } from './monitoring.controller';

/**
 * Global monitoring module for local deployment
 * Provides metrics collection and monitoring capabilities across all services
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
  ],
  providers: [
    MetricsService,
  ],
  controllers: [
    MonitoringController,
  ],
  exports: [
    MetricsService,
  ],
})
export class MonitoringModule {
  constructor(private readonly metricsService: MetricsService) {
    // Initialize monitoring on module load
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring system
   */
  private initializeMonitoring(): void {
    // Register application startup metric
    this.metricsService.incrementCounter('application_starts_total', 1, {
      module: 'monitoring',
      timestamp: new Date().toISOString(),
    });

    // Set application info gauge
    this.metricsService.setGauge('application_info', 1, {
      version: process.env.npm_package_version || '1.0.0',
      node_version: process.version,
      platform: process.platform,
      arch: process.arch,
    });
  }
}