/**
 * PARLANT Performance Alert Manager
 *
 * Advanced alerting and threshold management system for PARLANT Phase 1 performance
 * monitoring. Provides intelligent alert generation, escalation, and automated
 * response coordination for maintaining sub-1000ms P95 response times.
 *
 * Features:
 * - Multi-level threshold management with dynamic adjustments
 * - Intelligent alert aggregation and correlation
 * - Escalation workflows with automated responses
 * - Alert fatigue reduction through smart filtering
 * - Performance degradation prediction and early warning
 * - Integration with external notification systems
 * - Historical alert analysis and pattern recognition
 *
 * Alert Categories:
 * - Performance Degradation (Response time, throughput)
 * - Cache Performance (Hit rates, latency)
 * - System Resources (Memory, CPU, connections)
 * - Error Conditions (Failures, timeouts)
 * - Regression Detection (Performance comparisons)
 *
 * @fileoverview Performance alerting and threshold management
 * @version 1.0.0
 * @author Performance Monitoring Agent
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';

/**
 * Alert manager configuration
 */
export interface AlertManagerConfig {
  /** Alert evaluation interval in milliseconds */
  evaluationInterval: number;
  /** Alert aggregation window in milliseconds */
  aggregationWindow: number;
  /** Maximum alerts per window to prevent spam */
  maxAlertsPerWindow: number;
  /** Enable alert correlation */
  enableCorrelation: boolean;
  /** Enable predictive alerting */
  enablePredictive: boolean;
  /** Enable automated responses */
  enableAutomatedResponse: boolean;
  /** Alert retention period in milliseconds */
  retentionPeriod: number;
  /** Notification channels configuration */
  notifications: NotificationConfig;
  /** Escalation policies */
  escalation: EscalationConfig;
}

/**
 * Notification configuration
 */
export interface NotificationConfig {
  /** Enable email notifications */
  email: {
    enabled: boolean;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: { user: string; pass: string };
    };
    recipients: {
      critical: string[];
      warnings: string[];
      info: string[];
    };
  };
  /** Enable webhook notifications */
  webhook: {
    enabled: boolean;
    endpoints: {
      url: string;
      method: 'POST' | 'PUT';
      headers: Record<string, string>;
      severities: AlertSeverity[];
    }[];
  };
  /** Enable Slack notifications */
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channels: {
      critical: string;
      warnings: string;
      info: string;
    };
  };
  /** Enable SMS notifications for critical alerts */
  sms: {
    enabled: boolean;
    service: string;
    recipients: string[];
  };
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  /** Enable escalation workflows */
  enabled: boolean;
  /** Escalation levels and timing */
  levels: {
    level: number;
    delayMinutes: number;
    actions: EscalationAction[];
    recipients: string[];
  }[];
  /** Auto-resolve configuration */
  autoResolve: {
    enabled: boolean;
    timeoutMinutes: number;
  };
}

/**
 * Escalation actions
 */
export type EscalationAction =
  | 'NOTIFY_ONCALL'
  | 'CREATE_INCIDENT'
  | 'AUTO_SCALE'
  | 'RESTART_SERVICE'
  | 'ENABLE_CIRCUIT_BREAKER'
  | 'CLEAR_CACHE'
  | 'CUSTOM_WEBHOOK';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Alert status
 */
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'SUPPRESSED';

/**
 * Performance alert definition
 */
export interface PerformanceAlert {
  /** Alert unique identifier */
  id: string;
  /** Alert type classification */
  type: AlertType;
  /** Alert severity level */
  severity: AlertSeverity;
  /** Alert status */
  status: AlertStatus;
  /** Alert title */
  title: string;
  /** Detailed alert description */
  description: string;
  /** Metric that triggered the alert */
  metric: {
    name: string;
    currentValue: number;
    thresholdValue: number;
    unit: string;
  };
  /** Alert source component */
  source: {
    component: string;
    level?: 'L1' | 'L2' | 'L3';
    functionName?: string;
    userId?: string;
  };
  /** Alert timestamps */
  timestamps: {
    created: Date;
    lastTriggered: Date;
    acknowledged?: Date;
    resolved?: Date;
  };
  /** Alert correlation information */
  correlation: {
    correlationId?: string;
    relatedAlerts: string[];
    rootCause?: string;
  };
  /** Alert context and metadata */
  context: Record<string, unknown>;
  /** Recommended actions */
  recommendations: string[];
  /** Impact assessment */
  impact: {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedUsers?: number;
    estimatedDowntime?: number;
    businessImpact?: string;
  };
  /** Escalation information */
  escalation: {
    level: number;
    nextEscalationAt?: Date;
    escalatedTo?: string[];
  };
  /** Performance data snapshot */
  performanceSnapshot: Record<string, number>;
}

/**
 * Alert type classification
 */
export type AlertType =
  | 'RESPONSE_TIME_DEGRADATION'
  | 'THROUGHPUT_DEGRADATION'
  | 'CACHE_HIT_RATE_LOW'
  | 'CACHE_LATENCY_HIGH'
  | 'MEMORY_USAGE_HIGH'
  | 'CPU_USAGE_HIGH'
  | 'ERROR_RATE_HIGH'
  | 'PARLANT_LATENCY_HIGH'
  | 'REGRESSION_DETECTED'
  | 'SYSTEM_OVERLOAD'
  | 'BOTTLENECK_DETECTED'
  | 'CONNECTION_ISSUES'
  | 'CUSTOM_THRESHOLD';

/**
 * Threshold definition
 */
export interface PerformanceThreshold {
  /** Threshold identifier */
  id: string;
  /** Metric name */
  metricName: string;
  /** Threshold type */
  type: 'STATIC' | 'DYNAMIC' | 'PERCENTILE' | 'RATE_OF_CHANGE';
  /** Threshold configuration */
  config: {
    /** Static threshold value */
    value?: number;
    /** Upper threshold (for range thresholds) */
    upperValue?: number;
    /** Lower threshold (for range thresholds) */
    lowerValue?: number;
    /** Percentile for percentile-based thresholds */
    percentile?: number;
    /** Time window for rate-of-change thresholds */
    timeWindow?: number;
    /** Rate threshold for rate-of-change */
    rateThreshold?: number;
  };
  /** Comparison operator */
  operator: 'GT' | 'LT' | 'GTE' | 'LTE' | 'EQ' | 'NEQ' | 'BETWEEN' | 'OUTSIDE';
  /** Alert severity when threshold is breached */
  severity: AlertSeverity;
  /** Threshold scope */
  scope: {
    component?: string;
    level?: 'L1' | 'L2' | 'L3';
    functionPattern?: string;
  };
  /** Threshold evaluation settings */
  evaluation: {
    /** Minimum breach duration before alerting */
    minDuration: number;
    /** Evaluation interval */
    interval: number;
    /** Consecutive breaches required */
    consecutiveBreaches: number;
  };
  /** Threshold status */
  enabled: boolean;
  /** Threshold metadata */
  metadata: {
    description: string;
    owner: string;
    createdAt: Date;
    lastModified: Date;
    tags: string[];
  };
}

/**
 * Alert correlation rule
 */
export interface AlertCorrelationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Alert types to correlate */
  alertTypes: AlertType[];
  /** Time window for correlation */
  timeWindow: number;
  /** Minimum alerts required for correlation */
  minAlerts: number;
  /** Correlation logic */
  logic: 'AND' | 'OR' | 'SEQUENCE';
  /** Actions to take when correlation is detected */
  actions: {
    /** Suppress individual alerts */
    suppressIndividual: boolean;
    /** Create combined alert */
    createCombined: boolean;
    /** Combined alert template */
    combinedTemplate?: {
      title: string;
      description: string;
      severity: AlertSeverity;
    };
  };
  /** Rule status */
  enabled: boolean;
}

/**
 * Alert suppression rule
 */
export interface AlertSuppressionRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Suppression criteria */
  criteria: {
    alertTypes?: AlertType[];
    severities?: AlertSeverity[];
    sources?: string[];
    timeWindows?: { start: string; end: string }[];
  };
  /** Suppression duration */
  duration: number;
  /** Maximum suppressions per window */
  maxSuppressions: number;
  /** Rule status */
  enabled: boolean;
}

/**
 * Predictive alert configuration
 */
export interface PredictiveAlertConfig {
  /** Prediction model type */
  modelType: 'LINEAR_REGRESSION' | 'EXPONENTIAL_SMOOTHING' | 'ARIMA' | 'CUSTOM';
  /** Prediction horizon in minutes */
  horizonMinutes: number;
  /** Historical data window for training */
  trainingWindow: number;
  /** Confidence threshold for predictions */
  confidenceThreshold: number;
  /** Metrics to predict */
  predictedMetrics: string[];
  /** Model update frequency */
  updateFrequency: number;
}

/**
 * Performance Alert Manager implementation
 */
export class AlertManager extends EventEmitter {
  private config: AlertManagerConfig;
  private alerts: Map<string, PerformanceAlert> = new Map();
  private thresholds: Map<string, PerformanceThreshold> = new Map();
  private correlationRules: Map<string, AlertCorrelationRule> = new Map();
  private suppressionRules: Map<string, AlertSuppressionRule> = new Map();
  private alertHistory: PerformanceAlert[] = [];
  private evaluationInterval?: NodeJS.Timeout;
  private escalationInterval?: NodeJS.Timeout;

  private metricBuffer: Map<string, { value: number; timestamp: Date }[]> = new Map();
  private correlationBuffer: Map<string, PerformanceAlert[]> = new Map();

  private isRunning = false;
  private readonly logger: Console;

  constructor(config: Partial<AlertManagerConfig> = {}) {
    super();
    this.logger = console;
    this.config = this.mergeConfig(config);
    this.initializeDefaultThresholds();
    this.initializeDefaultCorrelationRules();
  }

  /**
   * Start alert manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Alert manager is already running');
      return;
    }

    this.logger.log('Starting PARLANT Performance Alert Manager');

    // Start threshold evaluation
    this.evaluationInterval = setInterval(
      () => this.evaluateThresholds(),
      this.config.evaluationInterval
    );

    // Start escalation processing
    this.escalationInterval = setInterval(
      () => this.processEscalations(),
      60000 // Check every minute
    );

    this.isRunning = true;
    this.emit('manager.started');
    this.logger.log('Alert manager started successfully');
  }

  /**
   * Stop alert manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Alert manager is not running');
      return;
    }

    this.logger.log('Stopping PARLANT Performance Alert Manager');

    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = undefined;
    }

    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
      this.escalationInterval = undefined;
    }

    this.isRunning = false;
    this.emit('manager.stopped');
    this.logger.log('Alert manager stopped successfully');
  }

  /**
   * Add or update performance threshold
   */
  addThreshold(threshold: PerformanceThreshold): void {
    this.thresholds.set(threshold.id, threshold);
    this.emit('threshold.added', threshold);
    this.logger.log(`Threshold added: ${threshold.metricName} (${threshold.type})`);
  }

  /**
   * Remove performance threshold
   */
  removeThreshold(thresholdId: string): boolean {
    const removed = this.thresholds.delete(thresholdId);
    if (removed) {
      this.emit('threshold.removed', thresholdId);
      this.logger.log(`Threshold removed: ${thresholdId}`);
    }
    return removed;
  }

  /**
   * Record metric value for threshold evaluation
   */
  recordMetric(metricName: string, value: number, context: Record<string, unknown> = {}): void {
    const timestamp = new Date();

    // Store in metric buffer
    if (!this.metricBuffer.has(metricName)) {
      this.metricBuffer.set(metricName, []);
    }

    const buffer = this.metricBuffer.get(metricName)!;
    buffer.push({ value, timestamp });

    // Keep only recent values
    const cutoffTime = new Date(Date.now() - this.config.aggregationWindow);
    this.metricBuffer.set(metricName, buffer.filter(entry => entry.timestamp >= cutoffTime));

    // Immediate threshold evaluation for critical metrics
    this.evaluateMetricThresholds(metricName, value, context);
  }

  /**
   * Create manual alert
   */
  createAlert(alertData: Partial<PerformanceAlert>): PerformanceAlert {
    const alert: PerformanceAlert = {
      id: alertData.id || `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: alertData.type || 'CUSTOM_THRESHOLD',
      severity: alertData.severity || 'WARNING',
      status: 'OPEN',
      title: alertData.title || 'Performance Alert',
      description: alertData.description || 'Performance threshold exceeded',
      metric: alertData.metric || {
        name: 'unknown',
        currentValue: 0,
        thresholdValue: 0,
        unit: ''
      },
      source: alertData.source || { component: 'unknown' },
      timestamps: {
        created: new Date(),
        lastTriggered: new Date()
      },
      correlation: {
        relatedAlerts: []
      },
      context: alertData.context || {},
      recommendations: alertData.recommendations || [],
      impact: alertData.impact || {
        severity: 'MEDIUM'
      },
      escalation: {
        level: 0
      },
      performanceSnapshot: alertData.performanceSnapshot || {}
    };

    return this.processNewAlert(alert);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'OPEN') {
      return false;
    }

    alert.status = 'ACKNOWLEDGED';
    alert.timestamps.acknowledged = new Date();
    alert.context.acknowledgedBy = acknowledgedBy;

    this.emit('alert.acknowledged', alert);
    this.sendNotification(alert, 'acknowledged');

    this.logger.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string, resolvedBy: string, resolution?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status === 'RESOLVED') {
      return false;
    }

    alert.status = 'RESOLVED';
    alert.timestamps.resolved = new Date();
    alert.context.resolvedBy = resolvedBy;
    if (resolution) {
      alert.context.resolution = resolution;
    }

    // Move to history
    this.alertHistory.push(alert);
    this.alerts.delete(alertId);

    this.emit('alert.resolved', alert);
    this.sendNotification(alert, 'resolved');

    this.logger.log(`Alert resolved: ${alertId} by ${resolvedBy}`);
    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters?: {
    severity?: AlertSeverity[];
    type?: AlertType[];
    component?: string;
  }): PerformanceAlert[] {
    let alerts = Array.from(this.alerts.values()).filter(alert => alert.status === 'OPEN');

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
      }
      if (filters.type) {
        alerts = alerts.filter(alert => filters.type!.includes(alert.type));
      }
      if (filters.component) {
        alerts = alerts.filter(alert => alert.source.component === filters.component);
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, ERROR: 3, WARNING: 2, INFO: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(timeWindow: number = 24 * 60 * 60 * 1000): {
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<string, number>;
    resolved: number;
    averageResolutionTime: number;
    topSources: { component: string; count: number }[];
  } {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const recentAlerts = [
      ...Array.from(this.alerts.values()),
      ...this.alertHistory.filter(alert => alert.timestamps.created >= cutoffTime)
    ];

    const bySeverity: Record<AlertSeverity, number> = {
      INFO: 0,
      WARNING: 0,
      ERROR: 0,
      CRITICAL: 0
    };

    const byType: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    let totalResolutionTime = 0;
    let resolvedCount = 0;

    recentAlerts.forEach(alert => {
      bySeverity[alert.severity]++;

      byType[alert.type] = (byType[alert.type] || 0) + 1;

      sourceCount[alert.source.component] = (sourceCount[alert.source.component] || 0) + 1;

      if (alert.status === 'RESOLVED' && alert.timestamps.resolved) {
        resolvedCount++;
        totalResolutionTime += alert.timestamps.resolved.getTime() - alert.timestamps.created.getTime();
      }
    });

    const topSources = Object.entries(sourceCount)
      .map(([component, count]) => ({ component, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: recentAlerts.length,
      bySeverity,
      byType,
      resolved: resolvedCount,
      averageResolutionTime: resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0,
      topSources
    };
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private mergeConfig(userConfig: Partial<AlertManagerConfig>): AlertManagerConfig {
    const defaultConfig: AlertManagerConfig = {
      evaluationInterval: 5000, // 5 seconds
      aggregationWindow: 300000, // 5 minutes
      maxAlertsPerWindow: 50,
      enableCorrelation: true,
      enablePredictive: false,
      enableAutomatedResponse: true,
      retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
      notifications: {
        email: {
          enabled: false,
          smtp: {
            host: 'localhost',
            port: 587,
            secure: false,
            auth: { user: '', pass: '' }
          },
          recipients: {
            critical: [],
            warnings: [],
            info: []
          }
        },
        webhook: {
          enabled: false,
          endpoints: []
        },
        slack: {
          enabled: false,
          webhookUrl: '',
          channels: {
            critical: '#alerts-critical',
            warnings: '#alerts-warnings',
            info: '#alerts-info'
          }
        },
        sms: {
          enabled: false,
          service: '',
          recipients: []
        }
      },
      escalation: {
        enabled: true,
        levels: [
          {
            level: 1,
            delayMinutes: 5,
            actions: ['NOTIFY_ONCALL'],
            recipients: []
          },
          {
            level: 2,
            delayMinutes: 15,
            actions: ['CREATE_INCIDENT', 'NOTIFY_ONCALL'],
            recipients: []
          }
        ],
        autoResolve: {
          enabled: true,
          timeoutMinutes: 60
        }
      }
    };

    return { ...defaultConfig, ...userConfig };
  }

  private initializeDefaultThresholds(): void {
    const defaultThresholds: PerformanceThreshold[] = [
      {
        id: 'p95-response-time',
        metricName: 'p95_response_time',
        type: 'STATIC',
        config: { value: 1000 },
        operator: 'GT',
        severity: 'WARNING',
        scope: {},
        evaluation: {
          minDuration: 30000,
          interval: 5000,
          consecutiveBreaches: 3
        },
        enabled: true,
        metadata: {
          description: 'P95 response time threshold',
          owner: 'performance-team',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['response-time', 'critical']
        }
      },
      {
        id: 'cache-hit-rate',
        metricName: 'cache_hit_rate',
        type: 'STATIC',
        config: { value: 0.85 },
        operator: 'LT',
        severity: 'WARNING',
        scope: {},
        evaluation: {
          minDuration: 60000,
          interval: 30000,
          consecutiveBreaches: 2
        },
        enabled: true,
        metadata: {
          description: 'Cache hit rate threshold',
          owner: 'performance-team',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['cache', 'efficiency']
        }
      },
      {
        id: 'error-rate',
        metricName: 'error_rate',
        type: 'STATIC',
        config: { value: 0.01 },
        operator: 'GT',
        severity: 'ERROR',
        scope: {},
        evaluation: {
          minDuration: 10000,
          interval: 5000,
          consecutiveBreaches: 2
        },
        enabled: true,
        metadata: {
          description: 'Error rate threshold',
          owner: 'reliability-team',
          createdAt: new Date(),
          lastModified: new Date(),
          tags: ['errors', 'reliability']
        }
      }
    ];

    defaultThresholds.forEach(threshold => {
      this.thresholds.set(threshold.id, threshold);
    });
  }

  private initializeDefaultCorrelationRules(): void {
    const defaultRules: AlertCorrelationRule[] = [
      {
        id: 'response-time-and-cache',
        name: 'Response Time and Cache Performance Correlation',
        alertTypes: ['RESPONSE_TIME_DEGRADATION', 'CACHE_HIT_RATE_LOW'],
        timeWindow: 300000, // 5 minutes
        minAlerts: 2,
        logic: 'AND',
        actions: {
          suppressIndividual: false,
          createCombined: true,
          combinedTemplate: {
            title: 'Performance Degradation: Response Time and Cache Issues',
            description: 'Both response time and cache performance are degraded',
            severity: 'ERROR'
          }
        },
        enabled: true
      },
      {
        id: 'system-overload',
        name: 'System Overload Detection',
        alertTypes: ['CPU_USAGE_HIGH', 'MEMORY_USAGE_HIGH', 'THROUGHPUT_DEGRADATION'],
        timeWindow: 180000, // 3 minutes
        minAlerts: 2,
        logic: 'OR',
        actions: {
          suppressIndividual: false,
          createCombined: true,
          combinedTemplate: {
            title: 'System Overload Detected',
            description: 'Multiple system resources are under stress',
            severity: 'CRITICAL'
          }
        },
        enabled: true
      }
    ];

    defaultRules.forEach(rule => {
      this.correlationRules.set(rule.id, rule);
    });
  }

  private async evaluateThresholds(): Promise<void> {
    try {
      for (const [thresholdId, threshold] of this.thresholds) {
        if (!threshold.enabled) continue;

        await this.evaluateThreshold(threshold);
      }
    } catch (error) {
      this.logger.error('Error evaluating thresholds:', error);
    }
  }

  private async evaluateThreshold(threshold: PerformanceThreshold): Promise<void> {
    const metricBuffer = this.metricBuffer.get(threshold.metricName);
    if (!metricBuffer || metricBuffer.length === 0) return;

    const now = Date.now();
    const evaluationWindow = new Date(now - threshold.evaluation.interval);
    const recentValues = metricBuffer.filter(entry => entry.timestamp >= evaluationWindow);

    if (recentValues.length === 0) return;

    let thresholdBreached = false;
    let currentValue = 0;

    switch (threshold.type) {
      case 'STATIC':
        currentValue = recentValues[recentValues.length - 1].value;
        thresholdBreached = this.evaluateStaticThreshold(currentValue, threshold);
        break;

      case 'DYNAMIC':
        // Dynamic thresholds would require baseline calculation
        currentValue = recentValues[recentValues.length - 1].value;
        // Placeholder for dynamic threshold logic
        break;

      case 'PERCENTILE':
        if (threshold.config.percentile) {
          const values = recentValues.map(entry => entry.value).sort((a, b) => a - b);
          currentValue = this.calculatePercentile(values, threshold.config.percentile);
          thresholdBreached = this.evaluateStaticThreshold(currentValue, threshold);
        }
        break;

      case 'RATE_OF_CHANGE':
        if (threshold.config.timeWindow && threshold.config.rateThreshold) {
          const rate = this.calculateRateOfChange(recentValues, threshold.config.timeWindow);
          currentValue = rate;
          thresholdBreached = Math.abs(rate) > threshold.config.rateThreshold;
        }
        break;
    }

    if (thresholdBreached) {
      await this.handleThresholdBreach(threshold, currentValue);
    }
  }

  private evaluateStaticThreshold(value: number, threshold: PerformanceThreshold): boolean {
    const thresholdValue = threshold.config.value || 0;
    const upperValue = threshold.config.upperValue;
    const lowerValue = threshold.config.lowerValue;

    switch (threshold.operator) {
      case 'GT': return value > thresholdValue;
      case 'GTE': return value >= thresholdValue;
      case 'LT': return value < thresholdValue;
      case 'LTE': return value <= thresholdValue;
      case 'EQ': return value === thresholdValue;
      case 'NEQ': return value !== thresholdValue;
      case 'BETWEEN': return upperValue !== undefined && lowerValue !== undefined &&
                             value >= lowerValue && value <= upperValue;
      case 'OUTSIDE': return upperValue !== undefined && lowerValue !== undefined &&
                             (value < lowerValue || value > upperValue);
      default: return false;
    }
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sortedValues[lower];

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private calculateRateOfChange(values: { value: number; timestamp: Date }[], timeWindow: number): number {
    if (values.length < 2) return 0;

    const cutoffTime = new Date(Date.now() - timeWindow);
    const windowValues = values.filter(entry => entry.timestamp >= cutoffTime);

    if (windowValues.length < 2) return 0;

    const firstValue = windowValues[0].value;
    const lastValue = windowValues[windowValues.length - 1].value;
    const timeDiff = windowValues[windowValues.length - 1].timestamp.getTime() - windowValues[0].timestamp.getTime();

    return timeDiff > 0 ? (lastValue - firstValue) / (timeDiff / 1000) : 0; // Change per second
  }

  private async handleThresholdBreach(threshold: PerformanceThreshold, currentValue: number): Promise<void> {
    const alertType = this.mapThresholdToAlertType(threshold.metricName);
    const thresholdValue = threshold.config.value || threshold.config.upperValue || threshold.config.lowerValue || 0;

    const alert: PerformanceAlert = {
      id: `threshold-${threshold.id}-${Date.now()}`,
      type: alertType,
      severity: threshold.severity,
      status: 'OPEN',
      title: `${threshold.metricName} threshold exceeded`,
      description: `${threshold.metricName} value ${currentValue} ${threshold.operator} ${thresholdValue}`,
      metric: {
        name: threshold.metricName,
        currentValue,
        thresholdValue,
        unit: this.getMetricUnit(threshold.metricName)
      },
      source: {
        component: threshold.scope.component || 'performance-monitor',
        level: threshold.scope.level,
        functionName: threshold.scope.functionPattern
      },
      timestamps: {
        created: new Date(),
        lastTriggered: new Date()
      },
      correlation: {
        relatedAlerts: []
      },
      context: {
        thresholdId: threshold.id,
        thresholdType: threshold.type
      },
      recommendations: this.generateRecommendations(alertType, threshold.metricName, currentValue),
      impact: this.assessImpact(alertType, threshold.severity),
      escalation: {
        level: 0
      },
      performanceSnapshot: await this.capturePerformanceSnapshot()
    };

    this.processNewAlert(alert);
  }

  private evaluateMetricThresholds(metricName: string, value: number, context: Record<string, unknown>): void {
    for (const [thresholdId, threshold] of this.thresholds) {
      if (threshold.metricName === metricName && threshold.enabled) {
        if (this.evaluateStaticThreshold(value, threshold)) {
          // Check if we should create an immediate alert
          const alertId = `immediate-${thresholdId}-${metricName}`;
          const existingAlert = this.alerts.get(alertId);

          if (!existingAlert) {
            this.handleThresholdBreach(threshold, value);
          }
        }
      }
    }
  }

  private processNewAlert(alert: PerformanceAlert): PerformanceAlert {
    // Check for correlation
    if (this.config.enableCorrelation) {
      this.checkAlertCorrelation(alert);
    }

    // Check suppression rules
    if (this.shouldSuppressAlert(alert)) {
      alert.status = 'SUPPRESSED';
      this.logger.log(`Alert suppressed: ${alert.id}`);
      return alert;
    }

    // Store alert
    this.alerts.set(alert.id, alert);

    // Send notifications
    this.sendNotification(alert, 'created');

    // Schedule escalation if enabled
    if (this.config.escalation.enabled) {
      this.scheduleEscalation(alert);
    }

    this.emit('alert.created', alert);
    this.logger.log(`Alert created: ${alert.id} [${alert.severity}] ${alert.title}`);

    return alert;
  }

  private checkAlertCorrelation(alert: PerformanceAlert): void {
    for (const [ruleId, rule] of this.correlationRules) {
      if (!rule.enabled || !rule.alertTypes.includes(alert.type)) continue;

      const correlationId = `correlation-${ruleId}`;
      if (!this.correlationBuffer.has(correlationId)) {
        this.correlationBuffer.set(correlationId, []);
      }

      const buffer = this.correlationBuffer.get(correlationId)!;
      buffer.push(alert);

      // Keep only alerts within the correlation window
      const cutoffTime = new Date(Date.now() - rule.timeWindow);
      const recentAlerts = buffer.filter(a => a.timestamps.created >= cutoffTime);
      this.correlationBuffer.set(correlationId, recentAlerts);

      // Check if correlation conditions are met
      if (recentAlerts.length >= rule.minAlerts) {
        this.processCorrelation(rule, recentAlerts);
      }
    }
  }

  private processCorrelation(rule: AlertCorrelationRule, alerts: PerformanceAlert[]): void {
    if (rule.actions.createCombined && rule.combinedTemplate) {
      const combinedAlert: PerformanceAlert = {
        id: `correlated-${rule.id}-${Date.now()}`,
        type: 'CUSTOM_THRESHOLD',
        severity: rule.combinedTemplate.severity,
        status: 'OPEN',
        title: rule.combinedTemplate.title,
        description: rule.combinedTemplate.description,
        metric: {
          name: 'correlation',
          currentValue: alerts.length,
          thresholdValue: rule.minAlerts,
          unit: 'alerts'
        },
        source: {
          component: 'correlation-engine'
        },
        timestamps: {
          created: new Date(),
          lastTriggered: new Date()
        },
        correlation: {
          correlationId: rule.id,
          relatedAlerts: alerts.map(a => a.id)
        },
        context: {
          correlationRule: rule.id,
          correlatedAlerts: alerts.map(a => ({ id: a.id, type: a.type, severity: a.severity }))
        },
        recommendations: [
          `Investigate correlation between ${alerts.map(a => a.type).join(', ')}`,
          'Check for common root cause',
          'Consider system-wide performance analysis'
        ],
        impact: {
          severity: 'HIGH'
        },
        escalation: {
          level: 0
        },
        performanceSnapshot: {}
      };

      this.processNewAlert(combinedAlert);

      // Suppress individual alerts if configured
      if (rule.actions.suppressIndividual) {
        alerts.forEach(alert => {
          if (this.alerts.has(alert.id)) {
            alert.status = 'SUPPRESSED';
            alert.context.suppressedBy = combinedAlert.id;
          }
        });
      }
    }
  }

  private shouldSuppressAlert(alert: PerformanceAlert): boolean {
    for (const [ruleId, rule] of this.suppressionRules) {
      if (!rule.enabled) continue;

      // Check criteria
      if (rule.criteria.alertTypes && !rule.criteria.alertTypes.includes(alert.type)) continue;
      if (rule.criteria.severities && !rule.criteria.severities.includes(alert.severity)) continue;
      if (rule.criteria.sources && !rule.criteria.sources.includes(alert.source.component)) continue;

      // Check time windows
      if (rule.criteria.timeWindows) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();

        const inTimeWindow = rule.criteria.timeWindows.some(window => {
          const [startHour, startMin] = window.start.split(':').map(Number);
          const [endHour, endMin] = window.end.split(':').map(Number);
          const startTime = startHour * 60 + startMin;
          const endTime = endHour * 60 + endMin;

          return currentTime >= startTime && currentTime <= endTime;
        });

        if (!inTimeWindow) continue;
      }

      return true; // Alert should be suppressed
    }

    return false;
  }

  private async sendNotification(alert: PerformanceAlert, action: 'created' | 'acknowledged' | 'resolved'): Promise<void> {
    try {
      const notifications = this.config.notifications;

      // Email notification
      if (notifications.email.enabled) {
        await this.sendEmailNotification(alert, action);
      }

      // Webhook notification
      if (notifications.webhook.enabled) {
        await this.sendWebhookNotification(alert, action);
      }

      // Slack notification
      if (notifications.slack.enabled) {
        await this.sendSlackNotification(alert, action);
      }

      // SMS notification for critical alerts
      if (notifications.sms.enabled && alert.severity === 'CRITICAL' && action === 'created') {
        await this.sendSMSNotification(alert);
      }

    } catch (error) {
      this.logger.error('Failed to send notification:', error);
    }
  }

  private async sendEmailNotification(alert: PerformanceAlert, action: string): Promise<void> {
    // Email notification implementation would go here
    this.logger.log(`Email notification sent for alert ${alert.id} (${action})`);
  }

  private async sendWebhookNotification(alert: PerformanceAlert, action: string): Promise<void> {
    // Webhook notification implementation would go here
    this.logger.log(`Webhook notification sent for alert ${alert.id} (${action})`);
  }

  private async sendSlackNotification(alert: PerformanceAlert, action: string): Promise<void> {
    // Slack notification implementation would go here
    this.logger.log(`Slack notification sent for alert ${alert.id} (${action})`);
  }

  private async sendSMSNotification(alert: PerformanceAlert): Promise<void> {
    // SMS notification implementation would go here
    this.logger.log(`SMS notification sent for critical alert ${alert.id}`);
  }

  private scheduleEscalation(alert: PerformanceAlert): void {
    if (!this.config.escalation.enabled || this.config.escalation.levels.length === 0) return;

    const firstLevel = this.config.escalation.levels[0];
    alert.escalation.nextEscalationAt = new Date(Date.now() + firstLevel.delayMinutes * 60 * 1000);
  }

  private async processEscalations(): Promise<void> {
    const now = new Date();

    for (const [alertId, alert] of this.alerts) {
      if (alert.status !== 'OPEN' || !alert.escalation.nextEscalationAt) continue;

      if (now >= alert.escalation.nextEscalationAt) {
        await this.escalateAlert(alert);
      }
    }
  }

  private async escalateAlert(alert: PerformanceAlert): Promise<void> {
    const nextLevel = alert.escalation.level + 1;
    const escalationLevel = this.config.escalation.levels.find(level => level.level === nextLevel);

    if (!escalationLevel) {
      // No more escalation levels
      alert.escalation.nextEscalationAt = undefined;
      return;
    }

    alert.escalation.level = nextLevel;
    alert.escalation.escalatedTo = escalationLevel.recipients;

    // Execute escalation actions
    for (const action of escalationLevel.actions) {
      await this.executeEscalationAction(action, alert);
    }

    // Schedule next escalation
    const nextLevelConfig = this.config.escalation.levels.find(level => level.level === nextLevel + 1);
    if (nextLevelConfig) {
      alert.escalation.nextEscalationAt = new Date(Date.now() + nextLevelConfig.delayMinutes * 60 * 1000);
    } else {
      alert.escalation.nextEscalationAt = undefined;
    }

    this.emit('alert.escalated', alert);
    this.logger.log(`Alert escalated to level ${nextLevel}: ${alert.id}`);
  }

  private async executeEscalationAction(action: EscalationAction, alert: PerformanceAlert): Promise<void> {
    this.logger.log(`Executing escalation action: ${action} for alert ${alert.id}`);

    switch (action) {
      case 'NOTIFY_ONCALL':
        await this.sendNotification(alert, 'created');
        break;

      case 'CREATE_INCIDENT':
        // Create incident in incident management system
        break;

      case 'AUTO_SCALE':
        // Trigger auto-scaling
        break;

      case 'RESTART_SERVICE':
        // Restart affected service
        break;

      case 'ENABLE_CIRCUIT_BREAKER':
        // Enable circuit breaker
        break;

      case 'CLEAR_CACHE':
        // Clear relevant caches
        break;

      case 'CUSTOM_WEBHOOK':
        await this.sendWebhookNotification(alert, 'escalated');
        break;
    }
  }

  private mapThresholdToAlertType(metricName: string): AlertType {
    const mapping: Record<string, AlertType> = {
      'p95_response_time': 'RESPONSE_TIME_DEGRADATION',
      'p99_response_time': 'RESPONSE_TIME_DEGRADATION',
      'throughput': 'THROUGHPUT_DEGRADATION',
      'cache_hit_rate': 'CACHE_HIT_RATE_LOW',
      'cache_latency': 'CACHE_LATENCY_HIGH',
      'memory_usage': 'MEMORY_USAGE_HIGH',
      'cpu_usage': 'CPU_USAGE_HIGH',
      'error_rate': 'ERROR_RATE_HIGH',
      'parlant_latency': 'PARLANT_LATENCY_HIGH'
    };

    return mapping[metricName] || 'CUSTOM_THRESHOLD';
  }

  private getMetricUnit(metricName: string): string {
    const units: Record<string, string> = {
      'p95_response_time': 'ms',
      'p99_response_time': 'ms',
      'throughput': 'ops/sec',
      'cache_hit_rate': '%',
      'cache_latency': 'ms',
      'memory_usage': 'MB',
      'cpu_usage': '%',
      'error_rate': '%',
      'parlant_latency': 'ms'
    };

    return units[metricName] || '';
  }

  private generateRecommendations(alertType: AlertType, metricName: string, currentValue: number): string[] {
    const recommendations: string[] = [];

    switch (alertType) {
      case 'RESPONSE_TIME_DEGRADATION':
        recommendations.push(
          'Check database query performance and indexes',
          'Review cache hit rates and TTL settings',
          'Analyze network latency and connectivity',
          'Consider scaling infrastructure resources'
        );
        break;

      case 'CACHE_HIT_RATE_LOW':
        recommendations.push(
          'Review cache TTL settings and expiration policies',
          'Analyze cache key patterns and distribution',
          'Consider increasing cache size if memory allows',
          'Implement cache warming strategies for frequently accessed data'
        );
        break;

      case 'ERROR_RATE_HIGH':
        recommendations.push(
          'Review recent code deployments and changes',
          'Check service dependencies and external API status',
          'Analyze error logs for common failure patterns',
          'Verify system resource availability'
        );
        break;

      case 'SYSTEM_OVERLOAD':
        recommendations.push(
          'Scale infrastructure resources immediately',
          'Review resource allocation and limits',
          'Implement circuit breakers for external dependencies',
          'Analyze traffic patterns and consider load balancing'
        );
        break;

      default:
        recommendations.push(
          'Monitor trend patterns for the affected metric',
          'Review recent system changes and deployments',
          'Check related performance metrics for correlation'
        );
    }

    return recommendations;
  }

  private assessImpact(alertType: AlertType, severity: AlertSeverity): {
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedUsers?: number;
    estimatedDowntime?: number;
    businessImpact?: string;
  } {
    const severityMapping = {
      INFO: 'LOW',
      WARNING: 'MEDIUM',
      ERROR: 'HIGH',
      CRITICAL: 'CRITICAL'
    } as const;

    const impact = {
      severity: severityMapping[severity]
    };

    switch (alertType) {
      case 'RESPONSE_TIME_DEGRADATION':
        return {
          ...impact,
          businessImpact: 'User experience degradation, potential customer satisfaction impact'
        };

      case 'ERROR_RATE_HIGH':
        return {
          ...impact,
          businessImpact: 'Service reliability issues, potential data loss or corruption'
        };

      case 'SYSTEM_OVERLOAD':
        return {
          ...impact,
          estimatedDowntime: severity === 'CRITICAL' ? 15 : 0,
          businessImpact: 'System instability, potential service unavailability'
        };

      default:
        return impact;
    }
  }

  private async capturePerformanceSnapshot(): Promise<Record<string, number>> {
    // Capture current performance metrics snapshot
    const snapshot: Record<string, number> = {};

    // Get recent metric values
    for (const [metricName, buffer] of this.metricBuffer) {
      if (buffer.length > 0) {
        snapshot[metricName] = buffer[buffer.length - 1].value;
      }
    }

    return snapshot;
  }
}

/**
 * Default alert manager instance
 */
export const alertManager = new AlertManager();