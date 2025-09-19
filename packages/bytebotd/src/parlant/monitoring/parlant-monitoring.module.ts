/**
 * Parlant Monitoring Module - Enterprise Performance Monitoring Integration
 *
 * Comprehensive monitoring module that integrates all Parlant performance
 * monitoring, alerting, dashboards, and validation services.
 *
 * Features:
 * - Complete performance monitoring stack integration
 * - Real-time dashboard with enterprise metrics
 * - Automated alerting with intelligent escalation
 * - Continuous performance validation and compliance monitoring
 * - Benchmark validation with automated regression detection
 * - Business impact assessment with ROI analysis
 * - Enterprise audit trail and compliance reporting
 * - Integration with existing monitoring infrastructure
 *
 * Architecture: Modular enterprise monitoring with event-driven communication
 * Integration: Seamless integration with existing metrics and health services
 * Scalability: Designed for enterprise-scale monitoring requirements
 *
 * @author Claude Code - Performance Monitoring Integration
 * @version 1.0.0 - Enterprise Monitoring Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Core performance services
import { ParlantPerformanceMonitorService } from '../performance/parlant-performance-monitor.service';
import { ParlantPerformanceBenchmarkService } from '../testing/parlant-performance-benchmark.service';

// Monitoring services
import { ParlantPerformanceDashboardService } from './parlant-performance-dashboard.service';
import { ParlantPerformanceAlertingService } from './parlant-performance-alerting.service';
import { ParlantPerformanceValidatorService } from './parlant-performance-validator.service';

// Existing infrastructure services
import { MetricsService } from '../../metrics/metrics.service';
import { ParlantHealthMetricsValidationService } from '../services/parlant-health-metrics-validation.service';

/**
 * Parlant Monitoring Module
 *
 * Provides comprehensive performance monitoring capabilities including:
 * - Real-time performance dashboards
 * - Automated alerting and escalation
 * - Performance validation and compliance monitoring
 * - Benchmark validation and regression detection
 * - Business impact assessment
 * - Enterprise audit and reporting
 */
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // Event emitter configuration for real-time monitoring
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 100,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ScheduleModule.forRoot(), // Enable scheduled tasks for continuous monitoring
  ],
  providers: [
    // Core performance monitoring
    ParlantPerformanceMonitorService,
    ParlantPerformanceBenchmarkService,

    // Monitoring services
    ParlantPerformanceDashboardService,
    ParlantPerformanceAlertingService,
    ParlantPerformanceValidatorService,

    // Integration with existing infrastructure
    MetricsService,
    ParlantHealthMetricsValidationService,
  ],
  exports: [
    // Export all monitoring services for use by other modules
    ParlantPerformanceMonitorService,
    ParlantPerformanceBenchmarkService,
    ParlantPerformanceDashboardService,
    ParlantPerformanceAlertingService,
    ParlantPerformanceValidatorService,

    // Export infrastructure services
    MetricsService,
    ParlantHealthMetricsValidationService,
  ],
})
export class ParlantMonitoringModule {
  constructor() {
    console.log('🚀 Parlant Enterprise Monitoring Module initialized');
    console.log('   ✅ Real-time performance dashboard');
    console.log('   ✅ Automated alerting with escalation');
    console.log('   ✅ Continuous performance validation');
    console.log('   ✅ Benchmark validation and regression detection');
    console.log('   ✅ Business impact assessment');
    console.log('   ✅ Enterprise audit trail and compliance');
    console.log('   ✅ Integration with existing monitoring infrastructure');
    console.log('');
    console.log('📊 Performance Targets:');
    console.log('   • Response Time: <1000ms P95, <500ms average');
    console.log('   • Cache Hit Rate: >85% minimum, >95% target');
    console.log('   • Throughput: >50 req/sec sustained, >100 req/sec peak');
    console.log('   • Error Rate: <1% target, <5% maximum');
    console.log('   • Availability: >99.9% uptime');
    console.log('');
    console.log('🎯 Enterprise Features:');
    console.log('   • Real-time anomaly detection with ML algorithms');
    console.log('   • Multi-level alert escalation with business impact');
    console.log('   • Automated performance regression detection');
    console.log('   • SLA compliance monitoring and reporting');
    console.log('   • Comprehensive audit trail for enterprise compliance');
    console.log('   • ROI analysis for performance optimization investments');
  }
}