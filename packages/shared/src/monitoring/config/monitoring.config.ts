/**
 * Standardized Monitoring Configuration for AIgent Platform
 *
 * Provides unified configuration for health monitoring, metrics collection,
 * and observability across all services in the AIgent platform.
 *
 * Features:
 * - Standardized health check intervals and timeouts
 * - Consistent Prometheus metrics configuration
 * - Unified alerting thresholds
 * - Service-specific monitoring settings
 * - Local-only deployment optimization
 *
 * @author Claude Code - Monitoring Integration Specialist
 * @version 1.0.0
 */

/**
 * Health check configuration interface
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  retries: number;
  failureThreshold: number;
  successThreshold: number;
}

/**
 * Prometheus metrics configuration interface
 */
export interface PrometheusConfig {
  enabled: boolean;
  endpoint: string;
  collectInterval: number; // milliseconds
  retentionDays: number;
  buckets: number[];
  quantiles: number[];
}

/**
 * Alerting configuration interface
 */
export interface AlertingConfig {
  enabled: boolean;
  channels: string[];
  thresholds: {
    cpu: number;
    memory: number;
    disk: number;
    responseTime: number;
    errorRate: number;
  };
  cooldownPeriod: number; // milliseconds
}

/**
 * Service-specific monitoring configuration
 */
export interface ServiceMonitoringConfig {
  serviceName: string;
  healthChecks: HealthCheckConfig;
  prometheus: PrometheusConfig;
  alerting: AlertingConfig;
  customMetrics: string[];
}

/**
 * Complete monitoring configuration
 */
export interface MonitoringConfig {
  global: {
    environment: string;
    logLevel: string;
    correlationIds: boolean;
    structuredLogging: boolean;
    localOnly: boolean;
  };
  healthChecks: HealthCheckConfig;
  prometheus: PrometheusConfig;
  alerting: AlertingConfig;
  services: Record<string, ServiceMonitoringConfig>;
}

/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: HealthCheckConfig = {
  enabled: true,
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retries: 3,
  failureThreshold: 3,
  successThreshold: 1,
};

/**
 * Default Prometheus configuration for local monitoring
 */
export const DEFAULT_PROMETHEUS_CONFIG: PrometheusConfig = {
  enabled: true,
  endpoint: "/metrics",
  collectInterval: 15000, // 15 seconds
  retentionDays: 7, // 1 week retention for local deployment
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  quantiles: [0.5, 0.9, 0.95, 0.99],
};

/**
 * Default alerting configuration
 */
export const DEFAULT_ALERTING_CONFIG: AlertingConfig = {
  enabled: true,
  channels: ["console", "webhook"],
  thresholds: {
    cpu: 80, // 80% CPU usage
    memory: 85, // 85% memory usage
    disk: 90, // 90% disk usage
    responseTime: 5000, // 5 seconds
    errorRate: 5, // 5% error rate
  },
  cooldownPeriod: 300000, // 5 minutes
};

/**
 * Bytebot Agent monitoring configuration
 */
export const BYTEBOT_AGENT_CONFIG: ServiceMonitoringConfig = {
  serviceName: "bytebot-agent",
  healthChecks: {
    ...DEFAULT_HEALTH_CHECK_CONFIG,
    interval: 10000, // More frequent for agent
  },
  prometheus: {
    ...DEFAULT_PROMETHEUS_CONFIG,
    collectInterval: 10000, // More frequent collection
  },
  alerting: {
    ...DEFAULT_ALERTING_CONFIG,
    thresholds: {
      ...DEFAULT_ALERTING_CONFIG.thresholds,
      responseTime: 3000, // Tighter SLA for agent
    },
  },
  customMetrics: [
    "task_processing_duration",
    "active_tasks_count",
    "authentication_attempts",
    "security_events",
    "parlant_validation_duration",
  ],
};

/**
 * Bytebotd service monitoring configuration
 */
export const BYTEBOTD_CONFIG: ServiceMonitoringConfig = {
  serviceName: "bytebotd",
  healthChecks: {
    ...DEFAULT_HEALTH_CHECK_CONFIG,
    interval: 15000, // Standard interval
  },
  prometheus: {
    ...DEFAULT_PROMETHEUS_CONFIG,
    collectInterval: 15000, // Standard collection
  },
  alerting: {
    ...DEFAULT_ALERTING_CONFIG,
    thresholds: {
      ...DEFAULT_ALERTING_CONFIG.thresholds,
      memory: 80, // Daemon might use more memory
    },
  },
  customMetrics: [
    "daemon_uptime",
    "background_tasks_count",
    "system_resource_usage",
    "security_monitoring_events",
    "parlant_conversations_active",
  ],
};

/**
 * Orchestrator monitoring configuration
 */
export const ORCHESTRATOR_CONFIG: ServiceMonitoringConfig = {
  serviceName: "orchestrator",
  healthChecks: {
    ...DEFAULT_HEALTH_CHECK_CONFIG,
    interval: 20000, // Less frequent for orchestrator
  },
  prometheus: {
    ...DEFAULT_PROMETHEUS_CONFIG,
    collectInterval: 20000,
  },
  alerting: {
    ...DEFAULT_ALERTING_CONFIG,
    thresholds: {
      ...DEFAULT_ALERTING_CONFIG.thresholds,
      responseTime: 10000, // Orchestrator can be slower
    },
  },
  customMetrics: [
    "orchestration_tasks_count",
    "service_coordination_latency",
    "resource_allocation_efficiency",
    "inter_service_communication",
  ],
};

/**
 * Complete monitoring configuration for AIgent platform
 */
export const AIGENT_MONITORING_CONFIG: MonitoringConfig = {
  global: {
    environment: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
    correlationIds: true,
    structuredLogging: true,
    localOnly: true, // 100% local deployment
  },
  healthChecks: DEFAULT_HEALTH_CHECK_CONFIG,
  prometheus: DEFAULT_PROMETHEUS_CONFIG,
  alerting: DEFAULT_ALERTING_CONFIG,
  services: {
    "bytebot-agent": BYTEBOT_AGENT_CONFIG,
    bytebotd: BYTEBOTD_CONFIG,
    orchestrator: ORCHESTRATOR_CONFIG,
  },
};

/**
 * Get monitoring configuration for a specific service
 */
export function getServiceMonitoringConfig(
  serviceName: string,
): ServiceMonitoringConfig {
  const config = AIGENT_MONITORING_CONFIG.services[serviceName];
  if (!config) {
    throw new Error(
      `No monitoring configuration found for service: ${serviceName}`,
    );
  }
  return config;
}

/**
 * Get global monitoring configuration
 */
export function getGlobalMonitoringConfig(): MonitoringConfig {
  return AIGENT_MONITORING_CONFIG;
}

/**
 * Create custom service monitoring configuration
 */
export function createServiceConfig(
  serviceName: string,
  overrides: Partial<ServiceMonitoringConfig> = {},
): ServiceMonitoringConfig {
  return {
    serviceName,
    healthChecks: { ...DEFAULT_HEALTH_CHECK_CONFIG, ...overrides.healthChecks },
    prometheus: { ...DEFAULT_PROMETHEUS_CONFIG, ...overrides.prometheus },
    alerting: { ...DEFAULT_ALERTING_CONFIG, ...overrides.alerting },
    customMetrics: overrides.customMetrics || [],
  };
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(config: MonitoringConfig): boolean {
  // Validate global config
  if (!config.global || !config.global.environment) {
    return false;
  }

  // Validate health checks
  if (!config.healthChecks || config.healthChecks.interval <= 0) {
    return false;
  }

  // Validate Prometheus config
  if (!config.prometheus || !config.prometheus.endpoint) {
    return false;
  }

  // Validate alerting config
  if (!config.alerting || !config.alerting.thresholds) {
    return false;
  }

  // Validate service configs
  if (!config.services || Object.keys(config.services).length === 0) {
    return false;
  }

  return true;
}

/**
 * Environment-specific configuration adjustments
 */
export function adjustConfigForEnvironment(
  config: MonitoringConfig,
  environment: string,
): MonitoringConfig {
  const adjustedConfig = { ...config };

  switch (environment) {
    case "development":
      // More verbose logging and frequent checks in development
      adjustedConfig.global.logLevel = "debug";
      adjustedConfig.healthChecks.interval = 5000; // 5 seconds
      adjustedConfig.prometheus.collectInterval = 5000;
      break;

    case "production":
      // Optimized for performance in production
      adjustedConfig.global.logLevel = "warn";
      adjustedConfig.healthChecks.interval = 30000; // 30 seconds
      adjustedConfig.prometheus.collectInterval = 30000;
      adjustedConfig.prometheus.retentionDays = 30; // Longer retention
      break;

    case "testing":
      // Minimal monitoring for testing
      adjustedConfig.alerting.enabled = false;
      adjustedConfig.healthChecks.interval = 60000; // 1 minute
      adjustedConfig.prometheus.collectInterval = 60000;
      break;

    default:
      // Use default configuration
      break;
  }

  return adjustedConfig;
}
