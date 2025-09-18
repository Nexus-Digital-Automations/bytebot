/**
 * Shared Monitoring Types for Local-Only Architecture
 *
 * Comprehensive type definitions for health checks, metrics collection,
 * and monitoring system integration across all Bytebot services.
 *
 * Features:
 * - Local health check interfaces
 * - Prometheus metrics type definitions
 * - Performance monitoring structures
 * - Alert and notification schemas
 * - Local storage monitoring types
 * - System resource monitoring interfaces
 *
 * @author Claude Code - Local Health Checks & Monitoring Integration Specialist
 * @version 1.0.0 - Local-Only Architecture Compliant
 */

/**
 * Health check status levels with degraded state support
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/**
 * Service status for dependency monitoring
 */
export type ServiceStatus =
  | "connected"
  | "disconnected"
  | "active"
  | "inactive"
  | "available"
  | "unavailable"
  | "operational"
  | "degraded"
  | "offline"
  | "enabled"
  | "disabled"
  | "loaded"
  | "missing"
  | "reachable"
  | "unreachable"
  | "collecting"
  | "unknown";

/**
 * Metric types for Prometheus integration
 */
export type MetricType = "counter" | "gauge" | "histogram" | "summary";

/**
 * Alert severity levels
 */
export type AlertSeverity = "low" | "medium" | "high" | "critical";

/**
 * Base health check result interface
 */
export interface HealthCheckResult {
  /** Overall health status */
  isHealthy: boolean;
  /** Detailed status information */
  details: Record<string, unknown>;
  /** Error message if unhealthy */
  error?: string;
  /** Timestamp when check was performed */
  timestamp?: string;
  /** Response time in milliseconds */
  responseTime?: number;
}

/**
 * System resource metrics interface
 */
export interface SystemResourceMetrics {
  /** CPU usage percentage */
  cpuUsagePercent: number;
  /** Memory usage percentage */
  memoryUsagePercent: number;
  /** Disk usage percentage */
  diskUsagePercent: number;
  /** Network latency in milliseconds */
  networkLatencyMs: number;
  /** Garbage collection pause time */
  gcPauseTimeMs: number;
  /** Thread pool utilization percentage */
  threadPoolUtilization: number;
}

/**
 * Memory usage details interface
 */
export interface MemoryMetrics {
  /** Used memory in MB */
  used: number;
  /** Free memory in MB */
  free: number;
  /** Total memory in MB */
  total: number;
  /** Heap used memory in MB */
  heapUsed: number;
  /** Heap total memory in MB */
  heapTotal: number;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  /** Requests per second */
  requestsPerSecond: number;
  /** Average response time in ms */
  averageResponseTime: number;
  /** Task processing rate */
  taskProcessingRate: number;
  /** Database query latency in ms */
  databaseQueryLatency: number;
  /** Security overhead in ms */
  securityOverheadMs: number;
  /** Authentication latency in ms */
  authenticationLatency: number;
}

/**
 * Security monitoring metrics interface
 */
export interface SecurityMetrics {
  /** Total security events today */
  totalEvents: number;
  /** High severity events today */
  highSeverityEvents: number;
  /** Threats detected */
  threatsDetected: number;
  /** Threats blocked */
  threatsBlocked: number;
  /** Authentication health status */
  authenticationHealth: HealthStatus;
  /** Authorization health status */
  authorizationHealth: HealthStatus;
  /** Rate limiting health status */
  rateLimitingHealth: HealthStatus;
}

/**
 * Service health status interface
 */
export interface ServiceHealthStatus {
  /** Database connection status */
  database: ServiceStatus;
  /** Authentication service status */
  authentication: ServiceStatus;
  /** Configuration loading status */
  configuration: ServiceStatus;
  /** External services status */
  external: ServiceStatus;
  /** Security monitoring status */
  securityMonitoring: ServiceStatus;
  /** Metrics collection status */
  metrics: ServiceStatus;
  /** Tracing status */
  tracing: ServiceStatus;
  /** Alerting status */
  alerting: ServiceStatus;
  /** Observability status */
  observability: ServiceStatus;
}

/**
 * Dependency status interface
 */
export interface DependencyStatus {
  /** Anthropic AI service */
  anthropic: ServiceStatus;
  /** OpenAI service */
  openai: ServiceStatus;
  /** Redis cache */
  redis: ServiceStatus;
  /** Prometheus metrics */
  prometheus: ServiceStatus;
  /** Jaeger tracing */
  jaeger: ServiceStatus;
  /** Grafana dashboards */
  grafana: ServiceStatus;
  /** Elasticsearch logging */
  elasticsearch: ServiceStatus;
}

/**
 * Prometheus metric definition interface
 */
export interface PrometheusMetric {
  /** Metric name */
  name: string;
  /** Metric type */
  type: MetricType;
  /** Help text description */
  help: string;
  /** Labels for metric */
  labels?: Record<string, string>;
  /** Current value */
  value: number;
  /** Timestamp */
  timestamp?: number;
}

/**
 * Health check configuration interface
 */
export interface HealthCheckConfig {
  /** Check enabled flag */
  enabled: boolean;
  /** Check interval in seconds */
  intervalSeconds: number;
  /** Timeout in seconds */
  timeoutSeconds: number;
  /** Failure threshold before marking unhealthy */
  failureThreshold: number;
  /** Success threshold before marking healthy */
  successThreshold: number;
  /** Retry attempts */
  retryAttempts: number;
}

/**
 * Alert configuration interface
 */
export interface AlertConfig {
  /** Alert name */
  name: string;
  /** Alert description */
  description: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Metric threshold */
  threshold: number;
  /** Comparison operator */
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  /** Alert enabled flag */
  enabled: boolean;
  /** Cool-down period in seconds */
  cooldownSeconds: number;
}

/**
 * Local monitoring configuration interface
 */
export interface LocalMonitoringConfig {
  /** Prometheus configuration */
  prometheus: {
    enabled: boolean;
    port: number;
    path: string;
    scrapeInterval: number;
  };
  /** Grafana configuration */
  grafana: {
    enabled: boolean;
    port: number;
    adminPassword: string;
  };
  /** Health checks configuration */
  healthChecks: HealthCheckConfig;
  /** Alerts configuration */
  alerts: AlertConfig[];
  /** Local storage paths */
  localPaths: {
    dataDirectory: string;
    logsDirectory: string;
    metricsDirectory: string;
    secretsDirectory: string;
  };
}

/**
 * Health dashboard data interface
 */
export interface HealthDashboardData {
  /** Summary information */
  summary: {
    overallStatus: HealthStatus;
    uptime: number;
    lastCheck: string;
    operationId: string;
  };
  /** System health status */
  systemHealth: ServiceHealthStatus;
  /** Security health metrics */
  securityHealth: SecurityMetrics;
  /** Performance metrics */
  performance: PerformanceMetrics & SystemResourceMetrics;
  /** Memory usage details */
  resources: MemoryMetrics;
  /** Dependencies status */
  dependencies: DependencyStatus;
}

/**
 * Monitoring event interface
 */
export interface MonitoringEvent {
  /** Event type */
  type: "health_check" | "metric_update" | "alert_triggered" | "system_event";
  /** Event severity */
  severity: AlertSeverity;
  /** Event source service */
  source: string;
  /** Event message */
  message: string;
  /** Event metadata */
  metadata: Record<string, unknown>;
  /** Event timestamp */
  timestamp: string;
  /** Operation ID for correlation */
  operationId: string;
}

/**
 * Local file health check interface
 */
export interface FileHealthCheck {
  /** File path to check */
  path: string;
  /** Check if file exists */
  exists: boolean;
  /** Check if file is readable */
  readable: boolean;
  /** Check if file is writable */
  writable: boolean;
  /** File size in bytes */
  size?: number;
  /** File modification time */
  lastModified?: Date;
  /** Error message if check failed */
  error?: string;
}

/**
 * Local monitoring probe configuration
 */
export interface LocalProbeConfig {
  /** Probe enabled flag */
  enabled: boolean;
  /** Probe path */
  path: string;
  /** Initial delay before first check */
  initialDelaySeconds: number;
  /** Period between checks */
  periodSeconds: number;
  /** Timeout for each check */
  timeoutSeconds: number;
  /** Failure threshold */
  failureThreshold: number;
  /** Success threshold */
  successThreshold: number;
  /** Local file health checks */
  localFileHealthCheck: boolean;
  /** Process monitoring */
  processMonitoring: boolean;
}

/**
 * Compliance status interface
 */
export interface ComplianceStatus {
  /** Overall compliance status */
  isCompliant: boolean;
  /** Required configurations status */
  requiredConfigs: Array<{
    key: string;
    configured: boolean;
  }>;
  /** Security headers enabled */
  securityHeaders: boolean;
  /** Audit logging enabled */
  auditLogging: boolean;
  /** Error details if non-compliant */
  error?: string;
}

/**
 * Circuit breaker interface for monitoring
 */
export interface CircuitBreakerStatus {
  /** Circuit breaker state */
  state: "CLOSED" | "OPEN" | "HALF_OPEN";
  /** Failure count */
  failureCount: number;
  /** Success count */
  successCount: number;
  /** Last failure time */
  lastFailureTime?: Date;
  /** Next attempt time */
  nextAttemptTime?: Date;
}
