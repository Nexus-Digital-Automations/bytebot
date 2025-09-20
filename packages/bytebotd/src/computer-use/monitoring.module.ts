/**
 * Job Monitoring Module - ENTERPRISE MONITORING INTEGRATION
 *
 * NestJS module that integrates comprehensive job monitoring capabilities
 * with the computer-use system, providing enterprise-grade observability.
 *
 * Features:
 * - Job monitoring service with comprehensive metrics tracking
 * - Real-time dashboard controllers for operations teams
 * - WebSocket gateway for live monitoring feeds
 * - Integration with existing metrics and caching infrastructure
 * - Event-driven architecture for real-time updates
 * - Prometheus/Grafana export capabilities
 *
 * INTEGRATION POINTS:
 * - AsyncJobService: Integrated monitoring hooks
 * - MetricsService: Enhanced with job-specific metrics
 * - CacheService: Utilized for performance optimization
 * - EventEmitter: Real-time event distribution
 *
 * @author Claude Code - Enterprise Monitoring Integration Specialist
 * @version 1.0.0 - MAXIMUM ENTERPRISE MONITORING MODULE
 */

import { Module } from '@nestjs/common';import { EventEmitterModule } from '@nestjs/event-emitter';import { ScheduleModule } from '@nestjs/schedule';// Monitoring Servicesimport { JobMonitoringService } from './services/job-monitoring.service';// Controllersimport { JobMonitoringController } from './controllers/job-monitoring.controller';// WebSocket Gatewaysimport { MonitoringRealtimeGateway } from './gateways/monitoring-realtime.gateway';// Dependenciesimport { MetricsService } from '../metrics/metrics.service';import { CacheService } from '../cache/cache.service';@Module({imports: [
    // Event system for real-time monitoring
    EventEmitterModule.forRoot({
      // Enable async event handling for better performance
      wildcard: false,
      delimiter: '.',newListener: false,removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Scheduling for periodic health checks and reports
    ScheduleModule.forRoot(),
  ],

  providers: [
    // Core monitoring service
    JobMonitoringService,

    // WebSocket gateway for real-time feeds
    MonitoringRealtimeGateway,

    // Ensure dependencies are available
    {
      provide: MetricsService,
      useExisting: MetricsService,
    },
    {
      provide: CacheService,
      useExisting: CacheService,
    },
  ],

  controllers: [
    // REST API endpoints for dashboard
    JobMonitoringController,
  ],

  exports: [
    // Export monitoring service for integration with other modules
    JobMonitoringService,
    MonitoringRealtimeGateway,
  ],
})
export class MonitoringModule {
  constructor(
    private readonly jobMonitoringService: JobMonitoringService,
    private readonly monitoringGateway: MonitoringRealtimeGateway,
  ) {
    // Module initialization logging
    console.log('🚀 Enterprise Job Monitoring Module initialized');console.log('📊 Dashboard endpoints: /monitoring/*');console.log('📡 WebSocket gateway: /monitoring namespace');console.log('⚡ Real-time monitoring: ACTIVE');console.log('📈 Metrics collection: COMPREHENSIVE');console.log('🔔 Alerting system: ENABLED');console.log('💹 Business intelligence: ACTIVE');console.log('🎯 SLA monitoring: CONFIGURED');console.log('📦 Capacity planning: OPERATIONAL');
  }
}