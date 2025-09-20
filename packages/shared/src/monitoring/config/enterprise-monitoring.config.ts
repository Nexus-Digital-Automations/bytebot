/**
 * Enterprise Monitoring Configuration
 *
 * Comprehensive configuration for enterprise-grade monitoring system
 * supporting PARLANT database function monitoring with sub-1000ms tracking,
 * 99.9% uptime monitoring, and intelligent alerting.
 *
 * @author Claude Code - Enterprise Monitoring Specialist
 * @version 1.0.0 - Production Ready
 */

import { AlertSeverity } from "../types";

/**
 * Enterprise monitoring configuration interface
 */
export interface EnterpriseMonitoringConfig {
  // Core monitoring settings
  monitoring: {
    enabled: boolean;
    performanceThreshold: number; // Sub-1000ms requirement
    uptimeTarget: number; // 99.9% uptime target
    healthCheckInterval: number;
    metricsCollectionInterval: number;
    alertingEnabled: boolean;
    incidentResponseEnabled: boolean;
  };

  // Function monitoring configuration
  functionMonitoring: {
    enabled: boolean;
    trackingEnabled: boolean;
    performanceTracking: {
      responseTimeThreshold: number;
      errorRateThreshold: number;
      validationRejectionThreshold: number;
    };
    capacityMonitoring: {
      cpuThreshold: number;
      memoryThreshold: number;
      diskThreshold: number;
      networkLatencyThreshold: number;
    };
    historyRetention: {
      executionHistorySize: number;
      metricsHistoryDays: number;
      trendDataPoints: number;
    };
  };

  // Alerting configuration
  alerting: {
    enabled: boolean;
    channels: {
      email: {
        enabled: boolean;
        smtp: {
          host: string;
          port: number;
          secure: boolean;
          auth: {
            user: string;
            pass: string;
          };
        };
        defaultRecipients: string[];
      };
      slack: {
        enabled: boolean;
        webhookUrl?: string;
        botToken?: string;
        defaultChannel: string;
        criticalChannel: string;
      };
      sms: {
        enabled: boolean;
        provider: "twilio" | "aws_sns";
        config: Record<string, any>;
        defaultNumbers: string[];
      };
      webhook: {
        enabled: boolean;
        endpoints: Array<{
          url: string;
          method: "POST" | "PUT";
          headers: Record<string, string>;
          severityFilter: AlertSeverity[];
        }>;
      };
    };
    escalation: {
      policies: Array<{
        id: string;
        name: string;
        steps: Array<{
          delayMinutes: number;
          channels: string[];
          assignees: string[];
        }>;
      }>;
    };
    correlation: {
      enabled: boolean;
      timeWindowMinutes: number;
      rules: Array<{
        id: string;
        conditions: Record<string, any>;
        action: "suppress" | "merge" | "escalate";
      }>;
    };
  };

  // Incident response configuration
  incidentResponse: {
    enabled: boolean;
    automation: {
      enabled: boolean;
      actions: Array<{
        id: string;
        name: string;
        autoExecute: boolean;
        conditions: Record<string, any>;
        script: {
          command: string;
          timeout: number;
          retries: number;
        };
      }>;
    };
    sla: {
      acknowledgmentMinutes: {
        P1: number;
        P2: number;
        P3: number;
        P4: number;
      };
      responseMinutes: {
        P1: number;
        P2: number;
        P3: number;
        P4: number;
      };
      resolutionMinutes: {
        P1: number;
        P2: number;
        P3: number;
        P4: number;
      };
    };
    workflows: Array<{
      id: string;
      name: string;
      triggers: Record<string, any>;
      steps: Array<{
        type: string;
        config: Record<string, any>;
      }>;
    }>;
  };

  // Dashboard and reporting configuration
  dashboard: {
    enabled: boolean;
    refreshInterval: number;
    autoRefresh: boolean;
    defaultTimeRange: string;
    widgets: Array<{
      id: string;
      type: string;
      config: Record<string, any>;
    }>;
    reports: {
      enabled: boolean;
      schedules: Array<{
        id: string;
        frequency: "daily" | "weekly" | "monthly";
        time: string;
        recipients: string[];
        format: "pdf" | "html" | "csv";
      }>;
    };
  };

  // Security monitoring configuration
  security: {
    enabled: boolean;
    eventMonitoring: {
      enabled: boolean;
      logSources: string[];
      alertThresholds: Record<string, number>;
    };
    complianceTracking: {
      enabled: boolean;
      frameworks: string[];
      auditLogRetention: number;
    };
    threatDetection: {
      enabled: boolean;
      aiAnalysis: boolean;
      blockingSeverity: AlertSeverity;
    };
  };

  // Integration configuration
  integrations: {
    prometheus: {
      enabled: boolean;
      port: number;
      path: string;
      scrapeInterval: number;
    };
    grafana: {
      enabled: boolean;
      url?: string;
      apiKey?: string;
      dashboardIds: string[];
    };
    elasticsearch: {
      enabled: boolean;
      url?: string;
      index: string;
      retention: string;
    };
    jaeger: {
      enabled: boolean;
      endpoint?: string;
      serviceName: string;
    };
    pagerduty: {
      enabled: boolean;
      apiKey?: string;
      serviceId?: string;
    };
  };
}

/**
 * Default enterprise monitoring configuration
 */
export const defaultEnterpriseMonitoringConfig: EnterpriseMonitoringConfig = {
  monitoring: {
    enabled: true,
    performanceThreshold: 1000, // Sub-1000ms requirement
    uptimeTarget: 99.9, // 99.9% uptime target
    healthCheckInterval: 30000, // 30 seconds
    metricsCollectionInterval: 10000, // 10 seconds
    alertingEnabled: true,
    incidentResponseEnabled: true,
  },

  functionMonitoring: {
    enabled: true,
    trackingEnabled: true,
    performanceTracking: {
      responseTimeThreshold: 1000, // 1 second
      errorRateThreshold: 5, // 5%
      validationRejectionThreshold: 10, // 10%
    },
    capacityMonitoring: {
      cpuThreshold: 80, // 80%
      memoryThreshold: 85, // 85%
      diskThreshold: 90, // 90%
      networkLatencyThreshold: 100, // 100ms
    },
    historyRetention: {
      executionHistorySize: 10000,
      metricsHistoryDays: 30,
      trendDataPoints: 1000,
    },
  },

  alerting: {
    enabled: true,
    channels: {
      email: {
        enabled: true,
        smtp: {
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER || "",
            pass: process.env.SMTP_PASS || "",
          },
        },
        defaultRecipients: ["ops-team@company.com", "admin@company.com"],
      },
      slack: {
        enabled: true,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        defaultChannel: "#alerts",
        criticalChannel: "#critical-alerts",
      },
      sms: {
        enabled: false,
        provider: "twilio",
        config: {
          accountSid: process.env.TWILIO_ACCOUNT_SID,
          authToken: process.env.TWILIO_AUTH_TOKEN,
          fromNumber: process.env.TWILIO_FROM_NUMBER,
        },
        defaultNumbers: [],
      },
      webhook: {
        enabled: true,
        endpoints: [
          {
            url: process.env.MONITORING_WEBHOOK_URL || "",
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.WEBHOOK_TOKEN || ""}`,
            },
            severityFilter: ["high", "critical"],
          },
        ],
      },
    },
    escalation: {
      policies: [
        {
          id: "default-escalation",
          name: "Default Escalation Policy",
          steps: [
            {
              delayMinutes: 0,
              channels: ["slack"],
              assignees: ["on-call-engineer"],
            },
            {
              delayMinutes: 5,
              channels: ["email", "slack"],
              assignees: ["team-lead"],
            },
            {
              delayMinutes: 15,
              channels: ["email", "slack", "sms"],
              assignees: ["senior-engineer", "manager"],
            },
          ],
        },
      ],
    },
    correlation: {
      enabled: true,
      timeWindowMinutes: 5,
      rules: [
        {
          id: "performance-correlation",
          conditions: {
            metrics: ["response_time", "error_rate"],
            timeWindow: 300,
          },
          action: "merge",
        },
      ],
    },
  },

  incidentResponse: {
    enabled: true,
    automation: {
      enabled: true,
      actions: [
        {
          id: "restart-function",
          name: "Restart Function",
          autoExecute: true,
          conditions: {
            severities: ["medium", "high"],
            components: ["function"],
          },
          script: {
            command: "docker restart function-container",
            timeout: 30000,
            retries: 2,
          },
        },
        {
          id: "scale-functions",
          name: "Scale Functions",
          autoExecute: false,
          conditions: {
            severities: ["high", "critical"],
            metrics: ["cpu_usage", "response_time"],
          },
          script: {
            command: "kubectl scale deployment functions --replicas=5",
            timeout: 60000,
            retries: 1,
          },
        },
      ],
    },
    sla: {
      acknowledgmentMinutes: {
        P1: 5,
        P2: 10,
        P3: 30,
        P4: 60,
      },
      responseMinutes: {
        P1: 15,
        P2: 30,
        P3: 120,
        P4: 480,
      },
      resolutionMinutes: {
        P1: 60,
        P2: 240,
        P3: 720,
        P4: 1440,
      },
    },
    workflows: [
      {
        id: "critical-incident-workflow",
        name: "Critical Incident Response",
        triggers: {
          severities: ["critical"],
          sources: ["parlant_function_monitor"],
        },
        steps: [
          {
            type: "notification",
            config: {
              channels: ["slack", "email"],
              immediate: true,
            },
          },
          {
            type: "remediation",
            config: {
              actions: ["restart-function"],
              parallel: true,
            },
          },
        ],
      },
    ],
  },

  dashboard: {
    enabled: true,
    refreshInterval: 30000, // 30 seconds
    autoRefresh: true,
    defaultTimeRange: "1h",
    widgets: [
      {
        id: "overview-metrics",
        type: "metric",
        config: {
          title: "System Overview",
          metrics: ["total_functions", "active_alerts", "uptime"],
        },
      },
      {
        id: "performance-chart",
        type: "chart",
        config: {
          title: "Performance Metrics",
          metrics: ["response_time", "throughput"],
          timeRange: "4h",
        },
      },
    ],
    reports: {
      enabled: true,
      schedules: [
        {
          id: "daily-performance",
          frequency: "daily",
          time: "08:00",
          recipients: ["ops-team@company.com"],
          format: "pdf",
        },
        {
          id: "weekly-summary",
          frequency: "weekly",
          time: "09:00",
          recipients: ["management@company.com"],
          format: "html",
        },
      ],
    },
  },

  security: {
    enabled: true,
    eventMonitoring: {
      enabled: true,
      logSources: ["application", "system", "security"],
      alertThresholds: {
        failed_logins: 5,
        security_events: 10,
        anomalous_behavior: 3,
      },
    },
    complianceTracking: {
      enabled: true,
      frameworks: ["SOC2", "GDPR", "HIPAA"],
      auditLogRetention: 365, // days
    },
    threatDetection: {
      enabled: true,
      aiAnalysis: true,
      blockingSeverity: "high",
    },
  },

  integrations: {
    prometheus: {
      enabled: true,
      port: Number(process.env.PROMETHEUS_PORT) || 9090,
      path: "/metrics",
      scrapeInterval: 15, // seconds
    },
    grafana: {
      enabled: Boolean(process.env.GRAFANA_URL),
      url: process.env.GRAFANA_URL,
      apiKey: process.env.GRAFANA_API_KEY,
      dashboardIds: ["system-overview", "function-performance", "alerts"],
    },
    elasticsearch: {
      enabled: Boolean(process.env.ELASTICSEARCH_URL),
      url: process.env.ELASTICSEARCH_URL,
      index: "monitoring-logs",
      retention: "30d",
    },
    jaeger: {
      enabled: Boolean(process.env.JAEGER_ENDPOINT),
      endpoint: process.env.JAEGER_ENDPOINT,
      serviceName: "parlant-function-monitor",
    },
    pagerduty: {
      enabled: Boolean(process.env.PAGERDUTY_API_KEY),
      apiKey: process.env.PAGERDUTY_API_KEY,
      serviceId: process.env.PAGERDUTY_SERVICE_ID,
    },
  },
};

/**
 * Get monitoring configuration with environment overrides
 */
export function getEnterpriseMonitoringConfig(): EnterpriseMonitoringConfig {
  const config = { ...defaultEnterpriseMonitoringConfig };

  // Apply environment variable overrides
  if (process.env.MONITORING_ENABLED !== undefined) {
    config.monitoring.enabled = process.env.MONITORING_ENABLED === "true";
  }

  if (process.env.PERFORMANCE_THRESHOLD) {
    config.monitoring.performanceThreshold = Number(process.env.PERFORMANCE_THRESHOLD);
  }

  if (process.env.UPTIME_TARGET) {
    config.monitoring.uptimeTarget = Number(process.env.UPTIME_TARGET);
  }

  if (process.env.ALERTING_ENABLED !== undefined) {
    config.alerting.enabled = process.env.ALERTING_ENABLED === "true";
  }

  if (process.env.INCIDENT_RESPONSE_ENABLED !== undefined) {
    config.incidentResponse.enabled = process.env.INCIDENT_RESPONSE_ENABLED === "true";
  }

  return config;
}

/**
 * Validate monitoring configuration
 */
export function validateMonitoringConfig(config: EnterpriseMonitoringConfig): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate performance thresholds
  if (config.monitoring.performanceThreshold <= 0) {
    errors.push("Performance threshold must be greater than 0");
  }

  if (config.monitoring.performanceThreshold > 1000) {
    warnings.push("Performance threshold exceeds sub-1000ms requirement");
  }

  // Validate uptime target
  if (config.monitoring.uptimeTarget < 0 || config.monitoring.uptimeTarget > 100) {
    errors.push("Uptime target must be between 0 and 100");
  }

  if (config.monitoring.uptimeTarget < 99.9) {
    warnings.push("Uptime target is below 99.9% requirement");
  }

  // Validate alerting configuration
  if (config.alerting.enabled) {
    const hasEnabledChannel = Object.values(config.alerting.channels).some(channel => channel.enabled);
    if (!hasEnabledChannel) {
      errors.push("At least one alerting channel must be enabled");
    }

    // Validate email configuration
    if (config.alerting.channels.email.enabled) {
      if (!config.alerting.channels.email.smtp.host) {
        errors.push("SMTP host is required for email alerts");
      }
      if (config.alerting.channels.email.defaultRecipients.length === 0) {
        warnings.push("No default email recipients configured");
      }
    }

    // Validate Slack configuration
    if (config.alerting.channels.slack.enabled && !config.alerting.channels.slack.webhookUrl) {
      errors.push("Slack webhook URL is required for Slack alerts");
    }
  }

  // Validate incident response SLA targets
  const slaTargets = config.incidentResponse.sla;
  Object.keys(slaTargets.acknowledgmentMinutes).forEach(priority => {
    const ackTime = slaTargets.acknowledgmentMinutes[priority as keyof typeof slaTargets.acknowledgmentMinutes];
    const responseTime = slaTargets.responseMinutes[priority as keyof typeof slaTargets.responseMinutes];

    if (ackTime >= responseTime) {
      errors.push(`Acknowledgment time must be less than response time for priority ${priority}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Enterprise monitoring feature flags
 */
export const MONITORING_FEATURES = {
  PERFORMANCE_TRACKING: "performance_tracking",
  REAL_TIME_ALERTING: "real_time_alerting",
  INCIDENT_RESPONSE: "incident_response",
  DASHBOARD_ANALYTICS: "dashboard_analytics",
  CAPACITY_PLANNING: "capacity_planning",
  SECURITY_MONITORING: "security_monitoring",
  UPTIME_MONITORING: "uptime_monitoring",
  ERROR_TRACKING: "error_tracking",
  METRICS_COLLECTION: "metrics_collection",
  PRODUCTION_INFRASTRUCTURE: "production_infrastructure",
} as const;

/**
 * Check if monitoring feature is enabled
 */
export function isMonitoringFeatureEnabled(
  feature: keyof typeof MONITORING_FEATURES,
  config: EnterpriseMonitoringConfig = getEnterpriseMonitoringConfig(),
): boolean {
  const featureMap = {
    PERFORMANCE_TRACKING: config.functionMonitoring.enabled && config.functionMonitoring.trackingEnabled,
    REAL_TIME_ALERTING: config.alerting.enabled,
    INCIDENT_RESPONSE: config.incidentResponse.enabled,
    DASHBOARD_ANALYTICS: config.dashboard.enabled,
    CAPACITY_PLANNING: config.functionMonitoring.capacityMonitoring.cpuThreshold > 0,
    SECURITY_MONITORING: config.security.enabled,
    UPTIME_MONITORING: config.monitoring.uptimeTarget > 0,
    ERROR_TRACKING: config.functionMonitoring.performanceTracking.errorRateThreshold > 0,
    METRICS_COLLECTION: config.integrations.prometheus.enabled,
    PRODUCTION_INFRASTRUCTURE: config.monitoring.enabled,
  };

  return featureMap[feature] || false;
}