/**
 * Shared Monitoring Package Exports
 * 
 * Central export point for all local monitoring utilities, types,
 * and services for the Bytebot platform.
 * 
 * @author Claude Code - Local Health Checks & Monitoring Integration Specialist
 * @version 1.0.0 - Local-Only Architecture Compliant
 */

// Core monitoring services
export { MetricsService } from './metrics.service';
export { MonitoringController } from './monitoring.controller';
export { MonitoringModule } from './monitoring.module';

// Type definitions
export * from './types';

// Re-export commonly used types for convenience
export type {
  HealthStatus,
  ServiceStatus,
  MetricType,
  AlertSeverity,
  HealthCheckResult,
  SystemResourceMetrics,
  MemoryMetrics,
  PerformanceMetrics,
  SecurityMetrics,
  ServiceHealthStatus,
  DependencyStatus,
  PrometheusMetric,
  HealthCheckConfig,
  AlertConfig,
  LocalMonitoringConfig,
  HealthDashboardData,
  MonitoringEvent,
  FileHealthCheck,
  LocalProbeConfig,
  ComplianceStatus,
  CircuitBreakerStatus,
} from './types';