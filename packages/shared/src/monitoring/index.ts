/**
 * Enterprise Monitoring Package Exports - PARLANT Database Function Monitoring
 *
 * Central export point for all enterprise monitoring utilities, services,
 * and types for comprehensive PARLANT database function monitoring system.
 *
 * @author Claude Code - Enterprise Monitoring Specialist
 * @version 1.0.0 - Production Ready
 */

// Core monitoring services
export { MetricsService } from "./metrics.service";
export { MonitoringController } from "./monitoring.controller";
export { MonitoringModule } from "./monitoring.module";

// Enterprise PARLANT function monitoring
export { ParlantFunctionMonitorService } from "./parlant-function-monitor.service";
export type { FunctionPerformanceMetrics } from "./parlant-function-monitor.service";

// Alerting and notification system
export { AlertingService } from "./alerting.service";
export type { Alert, NotificationChannel, EscalationPolicy } from "./alerting.service";

// Dashboard and reporting system
export { DashboardService } from "./dashboard.service";
export type { DashboardData, DashboardLayout, ReportConfig } from "./dashboard.service";

// Incident response system
export { IncidentResponseService } from "./incident-response.service";
export type { Incident, IncidentStatus, IncidentPriority } from "./incident-response.service";

// Enterprise monitoring controller
export { EnterpriseMonitoringController } from "./enterprise-monitoring.controller";

// Legacy services (for backward compatibility)
export { ParlantMonitoringService } from "./parlant-monitoring.service";
export { ParlantMonitoringController } from "./parlant-monitoring.controller";

// Unified health monitoring utility
export { HealthMonitorUtil } from "./health-monitor.util";
export type {
  HealthCheckContext,
  HealthCheckExecutionResult,
} from "./health-monitor.util";

// Type definitions
export * from "./types";

// Standardized monitoring configuration
export * from "./config/monitoring.config";

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
} from "./types";
