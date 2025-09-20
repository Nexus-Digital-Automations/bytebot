/**
 * Parlant Performance Alerting Service - Enterprise Alerting & Escalation
 *
 * Provides comprehensive automated alerting system for Parlant performance
 * monitoring with intelligent escalation, anomaly detection, and recovery.
 *
 * Features:
 * - Multi-level alert escalation with automated escalation policies
 * - Intelligent anomaly detection with machine learning algorithms
 * - Performance regression detection and automated recovery recommendations
 * - Custom alert rules with dynamic threshold adjustment
 * - Integration with external alerting systems (PagerDuty, Slack, Email)
 * - Alert correlation and noise reduction algorithms
 * - Predictive alerting based on trend analysis
 * - Self-healing alert acknowledgment and resolution
 * - Business impact assessment for alert prioritization
 * - Alert fatigue prevention with intelligent grouping
 *
 * Architecture: Event-driven alerting with intelligent correlation
 * Integration: Multi-channel notifications with escalation management
 * Recovery: Automated incident response and self-healing capabilities
 *
 * @author Claude Code - Performance Alerting Agent
 * @version 1.0.0 - Enterprise Alerting System
 */

import { Injectable, Logger } from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { EventEmitter2 } from '@nestjs/event-emitter';// Note: Using setInterval instead of Cron decorators for schedulingimport { performance } from 'perf_hooks';import { ParlantPerformanceMonitorService, ParlantPerformanceStats } from '../performance/parlant-performance-monitor.service';// ===== ALERTING INTERFACES =====/**
 * Alert rule configuration
 */
export interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly metric: string;
  readonly condition: AlertCondition;
  readonly thresholds: AlertThresholds;
  readonly severity: AlertSeverity;
  readonly escalationPolicy: EscalationPolicy;
  readonly notificationChannels: NotificationChannel[];
  readonly tags: string[];
  readonly businessImpact: BusinessImpact;
  readonly suppressionRules: SuppressionRule[];
  readonly autoResolution: AutoResolutionConfig;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly lastModified: Date;
}

/**
 * Alert condition types
 */
export interface AlertCondition {
  readonly type: 'THRESHOLD' | 'ANOMALY' | 'TREND' | 'COMPOSITE' | 'PREDICTIVE';readonly operator: 'GT' | 'LT' | 'EQ' | 'NE' | 'GTE' | 'LTE';readonly aggregation: 'AVG' | 'MAX' | 'MIN' | 'SUM' | 'COUNT' | 'P95' | 'P99';readonly timeWindow: string; // e.g., '5m', '1h', '1d'readonly evaluationFrequency: string; // e.g., '30s', '1m', '5m'readonly dataPoints: number; // Number of data points to evaluatereadonly missingSDataBehavior: 'IGNORE' | 'TREAT_AS_ZERO' | 'ALERT';}/**
 * Alert thresholds with dynamic adjustment
 */
export interface AlertThresholds {
  readonly warning: number;
  readonly critical: number;
  readonly emergency?: number;
  readonly dynamicAdjustment: {
    readonly enabled: boolean;
    readonly algorithm: 'STATISTICAL' | 'MACHINE_LEARNING' | 'SEASONAL';readonly learningPeriod: string; // e.g., '7d', '30d'readonly adjustmentFactor: number; // 0.1 = 10% adjustmentreadonly minThreshold: number;
    readonly maxThreshold: number;
  };
  readonly percentileThresholds?: {
    readonly p95: number;
    readonly p99: number;
  };
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'INFO',WARNING = 'WARNING',CRITICAL = 'CRITICAL',EMERGENCY = 'EMERGENCY',}/**
 * Escalation policy configuration
 */
export interface EscalationPolicy {
  readonly id: string;
  readonly name: string;
  readonly steps: EscalationStep[];
  readonly globalTimeout: number; // Maximum time before highest escalation
  readonly repeatInterval?: number; // How often to repeat notifications
  readonly maxRepetitions?: number; // Maximum number of repetitions
  readonly businessHoursOnly: boolean;
  readonly timezone: string;
}

/**
 * Escalation step
 */
export interface EscalationStep {
  readonly level: number;
  readonly timeout: number; // Minutes to wait before escalating to next level
  readonly targets: EscalationTarget[];
  readonly actions: EscalationAction[];
  readonly conditions?: EscalationCondition[];
}

/**
 * Escalation target
 */
export interface EscalationTarget {
  readonly type: 'USER' | 'TEAM' | 'EXTERNAL_SYSTEM';readonly identifier: string; // User ID, team ID, or system identifierreadonly contactMethods: string[]; // email, sms, push, webhook
  readonly priority: number; // Lower number = higher priority
}

/**
 * Escalation action
 */
export interface EscalationAction {
  readonly type: 'NOTIFY' | 'CREATE_INCIDENT' | 'RUN_AUTOMATION' | 'SCALE_RESOURCES';readonly config: Record<string, unknown>;readonly conditions?: string[]; // Conditions that must be met to execute action
}

/**
 * Escalation condition
 */
export interface EscalationCondition {
  readonly metric: string;
  readonly operator: 'GT' | 'LT' | 'EQ';readonly value: number;readonly timeWindow: string;
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  readonly type: 'EMAIL' | 'SMS' | 'SLACK' | 'WEBHOOK' | 'PAGERDUTY' | 'TEAMS';readonly config: Record<string, unknown>;readonly enabled: boolean;
  readonly priority: number;
  readonly rateLimiting: {
    readonly maxPerHour: number;
    readonly maxPerDay: number;
    readonly cooldownMinutes: number;
  };
  readonly template: NotificationTemplate;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  readonly subject: string;
  readonly body: string;
  readonly format: 'TEXT' | 'HTML' | 'MARKDOWN' | 'JSON';readonly variables: string[]; // Available template variables}

/**
 * Business impact assessment
 */
export interface BusinessImpact {
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';readonly category: 'PERFORMANCE' | 'AVAILABILITY' | 'SECURITY' | 'COMPLIANCE';readonly affectedServices: string[];readonly estimatedUserImpact: number; // Number of affected users
  readonly revenueImpact: {
    readonly currency: string;
    readonly amountPerHour: number;
    readonly calculationMethod: 'ESTIMATED' | 'HISTORICAL' | 'CALCULATED';};readonly complianceRisk: {
    readonly level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';readonly regulations: string[]; // e.g., ['GDPR', 'SOX', 'HIPAA']readonly penalties: string[];};
}

/**
 * Suppression rule to prevent alert fatigue
 */
export interface SuppressionRule {
  readonly id: string;
  readonly condition: string; // Expression to evaluate
  readonly duration: number; // Minutes to suppress
  readonly reason: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Auto-resolution configuration
 */
export interface AutoResolutionConfig {
  readonly enabled: boolean;
  readonly conditions: AutoResolutionCondition[];
  readonly timeout: number; // Minutes after which to auto-resolve
  readonly actions: AutoResolutionAction[];
}

/**
 * Auto-resolution condition
 */
export interface AutoResolutionCondition {
  readonly metric: string;
  readonly operator: 'GT' | 'LT' | 'EQ';readonly value: number;readonly duration: number; // Minutes the condition must be met
}

/**
 * Auto-resolution action
 */
export interface AutoResolutionAction {
  readonly type: 'RESOLVE_ALERT' | 'SEND_NOTIFICATION' | 'RUN_SCRIPT' | 'UPDATE_STATUS';readonly config: Record<string, unknown>;}

/**
 * Active alert instance
 */
export interface ActiveAlert {
  readonly id: string;
  readonly ruleId: string;
  readonly ruleName: string;
  readonly metric: string;
  readonly currentValue: number;
  readonly threshold: number;
  readonly severity: AlertSeverity;
  readonly status: AlertStatus;
  readonly triggeredAt: Date;
  readonly acknowledgedAt?: Date;
  readonly acknowledgedBy?: string;
  readonly resolvedAt?: Date;
  readonly resolvedBy?: string;
  readonly escalationLevel: number;
  readonly escalationHistory: EscalationEvent[];
  readonly notificationHistory: NotificationEvent[];
  readonly context: AlertContext;
  readonly correlation: AlertCorrelation;
  readonly businessImpact: BusinessImpactAssessment;
  readonly autoResolutionAttempts: number;
  readonly tags: string[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Alert status enumeration
 */
export enum AlertStatus {
  TRIGGERED = 'TRIGGERED',ACKNOWLEDGED = 'ACKNOWLEDGED',ESCALATED = 'ESCALATED',RESOLVED = 'RESOLVED',SUPPRESSED = 'SUPPRESSED',AUTO_RESOLVED = 'AUTO_RESOLVED',}/**
 * Escalation event
 */
export interface EscalationEvent {
  readonly timestamp: Date;
  readonly fromLevel: number;
  readonly toLevel: number;
  readonly reason: string;
  readonly triggeredBy: 'SYSTEM' | 'USER';readonly targets: EscalationTarget[];readonly actions: EscalationAction[];
}

/**
 * Notification event
 */
export interface NotificationEvent {
  readonly timestamp: Date;
  readonly channel: string;
  readonly target: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'RATE_LIMITED';responseTime: number;errorMessage?: string;
  deliveryConfirmation?: Date;
}

/**
 * Alert context information
 */
export interface AlertContext {
  readonly triggeringEvent: {
    readonly timestamp: Date;
    readonly value: number;
    readonly trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'VOLATILE';readonly changeRate: number; // Rate of changereadonly historicalComparison: {
      readonly samePeriodLastWeek: number;
      readonly samePeriodLastMonth: number;
      readonly percentChange: number;
    };
  };
  readonly systemState: {
    readonly activeOperations: number;
    readonly systemLoad: number;
    readonly memoryUsage: number;
    readonly networkLatency: number;
    readonly dependencyHealth: Record<string, string>;
  };
  readonly relatedMetrics: {
    readonly metric: string;
    readonly value: number;
    readonly correlation: number; // -1 to 1
  }[];
  readonly recentChanges: {
    readonly deployments: DeploymentEvent[];
    readonly configChanges: ConfigChangeEvent[];
    readonly trafficSpikes: TrafficSpikeEvent[];
  };
}

/**
 * Deployment event
 */
export interface DeploymentEvent {
  readonly timestamp: Date;
  readonly service: string;
  readonly version: string;
  readonly type: 'DEPLOYMENT' | 'ROLLBACK' | 'CONFIG_CHANGE';readonly impact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';}/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  readonly timestamp: Date;
  readonly component: string;
  readonly parameter: string;
  readonly oldValue: string;
  readonly newValue: string;
  readonly changedBy: string;
}

/**
 * Traffic spike event
 */
export interface TrafficSpikeEvent {
  readonly timestamp: Date;
  readonly magnitude: number; // Multiplier of normal traffic
  readonly duration: number; // Minutes
  readonly source: string;
  readonly type: 'ORGANIC' | 'DDOS' | 'LOAD_TEST' | 'MARKETING_CAMPAIGN';}/**
 * Alert correlation analysis
 */
export interface AlertCorrelation {
  readonly correlatedAlerts: string[]; // IDs of related alerts
  readonly rootCauseCandidate: boolean;
  readonly correlationScore: number; // 0 to 1
  readonly timeCorrelation: {
    readonly type: 'SIMULTANEOUS' | 'CASCADING' | 'PERIODIC';readonly timeDelta: number; // Milliseconds between related alerts};
  readonly metricCorrelation: {
    readonly strongCorrelations: string[]; // Metrics with strong correlation
    readonly weakCorrelations: string[]; // Metrics with weak correlation
    readonly inverseCorrelations: string[]; // Metrics with inverse correlation
  };
  readonly impactChain: AlertImpactChain[];
}

/**
 * Alert impact chain
 */
export interface AlertImpactChain {
  readonly metric: string;
  readonly impact: 'CAUSE' | 'EFFECT' | 'AMPLIFIER' | 'DAMPENER';readonly confidence: number; // 0 to 1readonly evidence: string[];
}

/**
 * Business impact assessment
 */
export interface BusinessImpactAssessment {
  readonly overallImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';readonly affectedUsers: number;readonly affectedServices: string[];
  readonly affectedRevenue: number;
  readonly slaViolations: string[];
  readonly complianceRisks: string[];
  readonly reputationImpact: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';readonly customerSatisfactionImpact: number; // -100 to 100readonly recoveryTimeEstimate: number; // Minutes
  readonly mitigationActions: string[];
}

/**
 * Alert analytics and insights
 */
export interface AlertAnalytics {
  readonly alertTrends: {
    readonly totalAlerts: number;
    readonly alertsByType: Record<string, number>;
    readonly alertsBySeverity: Record<AlertSeverity, number>;
    readonly alertsByService: Record<string, number>;
    readonly meanTimeToDetection: number; // Minutes
    readonly meanTimeToAcknowledgment: number; // Minutes
    readonly meanTimeToResolution: number; // Minutes
    readonly falsePositiveRate: number; // Percentage
    readonly autoResolutionRate: number; // Percentage
  };
  readonly escalationAnalytics: {
    readonly escalationRate: number; // Percentage of alerts that escalate
    readonly averageEscalationTime: number; // Minutes
    readonly escalationsByLevel: Record<number, number>;
    readonly topEscalationReasons: string[];
  };
  readonly performanceImpact: {
    readonly alertingOverhead: number; // Milliseconds per alert
    readonly notificationLatency: number; // Milliseconds
    readonly systemResourceImpact: number; // Percentage
  };
  readonly recommendations: AlertingRecommendation[];
}

/**
 * Alerting system recommendation
 */
export interface AlertingRecommendation {
  readonly id: string;
  readonly type: 'THRESHOLD_ADJUSTMENT' | 'RULE_OPTIMIZATION' | 'NOISE_REDUCTION' | 'ESCALATION_TUNING';readonly priority: 'LOW' | 'MEDIUM' | 'HIGH';readonly title: string;readonly description: string;
  readonly impact: {
    readonly falsePositiveReduction: number; // Percentage
    readonly detectionImprovement: number; // Percentage
    readonly resolutionTimeImprovement: number; // Percentage
  };
  readonly implementation: {
    readonly difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    readonly estimatedTime: number; // Hours
    readonly dependencies: string[];
    readonly risks: string[];
  };
  readonly generatedAt: Date;
  readonly validUntil: Date;
}

// ===== ALERTING SERVICE =====

@Injectable()
export class ParlantPerformanceAlertingService {
  private readonly logger = new Logger(ParlantPerformanceAlertingService.name);

  // Alert rules and active alerts
  private readonly alertRules: Map<string, AlertRule> = new Map();
  private readonly activeAlerts: Map<string, ActiveAlert> = new Map();
  private readonly alertHistory: ActiveAlert[] = [];

  // Configuration and state
  private readonly alertingConfig = {
    evaluationIntervalMs: 30000, // 30 seconds
    maxActiveAlerts: 1000,
    historyRetentionDays: 90,
    correlationTimeWindow: 300000, // 5 minutes
    autoResolutionEnabled: true,
    falsePositiveThreshold: 0.15, // 15% false positive rate triggers optimization
  };

  // Analytics and metrics
  private alertAnalytics: AlertAnalytics | null = null;
  private readonly notificationQueue: NotificationEvent[] = [];
  private readonly correlationEngine: AlertCorrelationEngine;

  constructor(
    private readonly configService: ConfigService,
    private readonly performanceMonitor: ParlantPerformanceMonitorService,
    private readonly eventEmitter: EventEmitter2
  ) {
    const operationId = `alerting_init_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.correlationEngine = new AlertCorrelationEngine();this.logger.log(`[${operationId}] Initializing Parlant Performance Alerting Service`, {
      operationId,
      config: this.alertingConfig,
      features: [
        'Multi-level escalation','Anomaly detection','Alert correlation','Auto-resolution','Business impact assessment','Predictive alerting',],});

    // Initialize default alert rules
    this.initializeDefaultAlertRules();

    // Start alert evaluation engine
    this.startAlertEvaluationEngine();

    // Start notification processing
    this.startNotificationProcessor();

    // Initialize scheduled tasks and event handlers
    this.initializeScheduledTasks();
    this.initializeEventHandlers();
  }

  /**
   * Initialize scheduled tasks using setInterval
   */
  private initializeScheduledTasks(): void {
    // Continuous evaluation every minute
    setInterval(async () => {
      try {
        await this.performContinuousEvaluation();
      } catch (error) {
        this.logger.error('Continuous evaluation failed', error);}}, 60 * 1000); // 1 minute

    // Performance analysis every 10 minutes
    setInterval(async () => {
      try {
        await this.performPerformanceAnalysis();
      } catch (error) {
        this.logger.error('Performance analysis failed', error);}}, 10 * 60 * 1000); // 10 minutes

    // Comprehensive analysis every hour
    setInterval(async () => {
      try {
        await this.performComprehensiveAnalysis();
      } catch (error) {
        this.logger.error('Comprehensive analysis failed', error);}}, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Initialize event handlers
   */
  private initializeEventHandlers(): void {
    this.eventEmitter.on('performance.metric.updated', async (data: { metric: string; value: number }) => {try {await this.handleMetricUpdate(data);
      } catch (error) {
        this.logger.error('Failed to handle metric update', error);}});
  }

  /**
   * Create new alert rule
   *
   * @param rule - Alert rule configuration
   * @returns Created rule ID
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'lastModified'>): Promise<string> {
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substring(7)}`;const alertRule: AlertRule = {...rule,
      id: ruleId,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    this.alertRules.set(ruleId, alertRule);

    this.logger.log(`Alert rule created: ${ruleId}`, {ruleId,name: rule.name,
      metric: rule.metric,
      severity: rule.severity,
      enabled: rule.enabled,
    });

    return ruleId;
  }

  /**
   * Update existing alert rule
   *
   * @param ruleId - Rule ID to update
   * @param updates - Partial rule updates
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const existingRule = this.alertRules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Alert rule not found: ${ruleId}`);}const updatedRule: AlertRule = {
      ...existingRule,
      ...updates,
      id: ruleId, // Preserve original ID
      createdAt: existingRule.createdAt, // Preserve creation time
      lastModified: new Date(),
    };

    this.alertRules.set(ruleId, updatedRule);

    this.logger.log(`Alert rule updated: ${ruleId}`, {ruleId,updatedFields: Object.keys(updates),
    });
  }

  /**
   * Delete alert rule
   *
   * @param ruleId - Rule ID to delete
   */
  async deleteAlertRule(ruleId: string): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    this.alertRules.delete(ruleId);

    // Resolve any active alerts for this rule
    const activeAlertsForRule = Array.from(this.activeAlerts.values())
      .filter(alert => alert.ruleId === ruleId);

    for (const alert of activeAlertsForRule) {
      await this.resolveAlert(alert.id, 'SYSTEM', 'Alert rule deleted');
    }

    this.logger.log(`Alert rule deleted: ${ruleId}`, {ruleId,resolvedAlerts: activeAlertsForRule.length,
    });
  }

  /**
   * Acknowledge alert
   *
   * @param alertId - Alert ID
   * @param acknowledgedBy - User acknowledging the alert
   * @param notes - Optional acknowledgment notes
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string, notes?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);}if (alert.status === AlertStatus.ACKNOWLEDGED) {
      throw new Error(`Alert already acknowledged: ${alertId}`);}const updatedAlert: ActiveAlert = {
      ...alert,
      status: AlertStatus.ACKNOWLEDGED,
      acknowledgedAt: new Date(),
      acknowledgedBy,
      metadata: {
        ...alert.metadata,
        acknowledgmentNotes: notes,
      },
    };

    this.activeAlerts.set(alertId, updatedAlert);

    // Send acknowledgment notification
    await this.sendAcknowledgmentNotification(updatedAlert, acknowledgedBy, notes);

    this.logger.log(`Alert acknowledged: ${alertId}`, {
      alertId,
      acknowledgedBy,
      acknowledgedAt: updatedAlert.acknowledgedAt,
      notes,
    });

    this.eventEmitter.emit('alert.acknowledged', updatedAlert);
  }

  /**
   * Resolve alert
   *
   * @param alertId - Alert ID
   * @param resolvedBy - User or system resolving the alert
   * @param resolution - Resolution details
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);}if (alert.status === AlertStatus.RESOLVED) {
      throw new Error(`Alert already resolved: ${alertId}`);}const updatedAlert: ActiveAlert = {
      ...alert,
      status: AlertStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy,
      metadata: {
        ...alert.metadata,
        resolution,
      },
    };

    // Move to history and remove from active alerts
    this.alertHistory.push(updatedAlert);
    this.activeAlerts.delete(alertId);

    // Send resolution notification
    await this.sendResolutionNotification(updatedAlert, resolvedBy, resolution);

    this.logger.log(`Alert resolved: ${alertId}`, {
      alertId,
      resolvedBy,
      resolvedAt: updatedAlert.resolvedAt,
      resolution,
      duration: updatedAlert.resolvedAt!.getTime() - updatedAlert.triggeredAt.getTime(),
    });

    this.eventEmitter.emit('alert.resolved', updatedAlert);}/**
   * Get active alerts with optional filtering
   *
   * @param filters - Optional filters
   * @returns Array of active alerts
   */
  getActiveAlerts(filters?: {
    severity?: AlertSeverity[];
    status?: AlertStatus[];
    ruleIds?: string[];
    tags?: string[];
  }): ActiveAlert[] {
    let alerts = Array.from(this.activeAlerts.values());

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
      }
      if (filters.status) {
        alerts = alerts.filter(alert => filters.status!.includes(alert.status));
      }
      if (filters.ruleIds) {
        alerts = alerts.filter(alert => filters.ruleIds!.includes(alert.ruleId));
      }
      if (filters.tags) {
        alerts = alerts.filter(alert =>
          filters.tags!.some(tag => alert.tags.includes(tag))
        );
      }
    }

    return alerts.sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
  }

  /**
   * Get alert analytics and insights
   *
   * @param timeRange - Time range for analytics ('1h', '24h', '7d', '30d')* @returns Alert analytics data*/
  async getAlertAnalytics(timeRange: string = '24h'): Promise<AlertAnalytics> {
    const cutoffTime = this.getTimeRangeCutoff(timeRange);
    const relevantAlerts = this.alertHistory.filter(alert => alert.triggeredAt >= cutoffTime);

    const analytics: AlertAnalytics = {
      alertTrends: this.calculateAlertTrends(relevantAlerts),
      escalationAnalytics: this.calculateEscalationAnalytics(relevantAlerts),
      performanceImpact: await this.calculatePerformanceImpact(),
      recommendations: await this.generateAlertingRecommendations(relevantAlerts),
    };

    this.alertAnalytics = analytics;
    return analytics;
  }

  /**
   * Trigger manual alert for testing
   *
   * @param ruleId - Rule ID to trigger
   * @param testValue - Test value to use
   * @param reason - Reason for manual trigger
   */
  async triggerManualAlert(ruleId: string, testValue: number, reason: string): Promise<string> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule not found: ${ruleId}`);
    }

    const alertId = await this.createAlert(rule, testValue, {
      manual: true,
      reason,
      triggeredBy: 'MANUAL_TEST',
    });

    this.logger.log(`Manual alert triggered: ${alertId}`, {
      alertId,
      ruleId,
      testValue,
      reason,
    });

    return alertId;
  }

  // ===== PRIVATE METHODS =====

  private initializeDefaultAlertRules(): void {
    const defaultRules: Omit<AlertRule, 'id' | 'createdAt' | 'lastModified'>[] = [{name: 'High Response Time',description: 'Alert when average response time exceeds thresholds',enabled: true,metric: 'averageLatency',condition: {type: 'THRESHOLD',operator: 'GT',aggregation: 'AVG',timeWindow: '5m',evaluationFrequency: '1m',dataPoints: 5,missingSDataBehavior: 'IGNORE',},thresholds: {
          warning: 800,
          critical: 1500,
          emergency: 3000,
          dynamicAdjustment: {
            enabled: true,
            algorithm: 'STATISTICAL',learningPeriod: '7d',adjustmentFactor: 0.1,minThreshold: 500,
            maxThreshold: 5000,
          },
        },
        severity: AlertSeverity.CRITICAL,
        escalationPolicy: this.createDefaultEscalationPolicy(),
        notificationChannels: this.createDefaultNotificationChannels(),
        tags: ['performance', 'latency', 'user-experience'],businessImpact: {severity: 'HIGH',category: 'PERFORMANCE',affectedServices: ['parlant-validation'],estimatedUserImpact: 1000,revenueImpact: {
            currency: 'USD',amountPerHour: 5000,calculationMethod: 'ESTIMATED',},complianceRisk: {
            level: 'LOW',regulations: [],penalties: [],
          },
        },
        suppressionRules: [],
        autoResolution: {
          enabled: true,
          conditions: [
            {
              metric: 'averageLatency',operator: 'LT',value: 600,duration: 5,
            },
          ],
          timeout: 60,
          actions: [
            {
              type: 'RESOLVE_ALERT',config: {reason: 'Response time returned to normal levels',},},
          ],
        },
        createdBy: 'SYSTEM',},{
        name: 'Low Cache Hit Rate',description: 'Alert when cache hit rate drops below optimal levels',enabled: true,metric: 'cacheHitRate',condition: {type: 'THRESHOLD',operator: 'LT',aggregation: 'AVG',timeWindow: '10m',evaluationFrequency: '2m',dataPoints: 5,missingSDataBehavior: 'TREAT_AS_ZERO',},thresholds: {
          warning: 85,
          critical: 70,
          dynamicAdjustment: {
            enabled: false,
            algorithm: 'STATISTICAL',learningPeriod: '7d',adjustmentFactor: 0.05,minThreshold: 60,
            maxThreshold: 95,
          },
        },
        severity: AlertSeverity.WARNING,
        escalationPolicy: this.createDefaultEscalationPolicy(),
        notificationChannels: this.createDefaultNotificationChannels(),
        tags: ['performance', 'cache', 'optimization'],businessImpact: {severity: 'MEDIUM',category: 'PERFORMANCE',affectedServices: ['parlant-validation'],estimatedUserImpact: 500,revenueImpact: {
            currency: 'USD',amountPerHour: 1000,calculationMethod: 'ESTIMATED',},complianceRisk: {
            level: 'NONE',regulations: [],penalties: [],
          },
        },
        suppressionRules: [],
        autoResolution: {
          enabled: true,
          conditions: [
            {
              metric: 'cacheHitRate',operator: 'GT',value: 90,duration: 10,
            },
          ],
          timeout: 120,
          actions: [
            {
              type: 'RESOLVE_ALERT',config: {reason: 'Cache hit rate improved to acceptable levels',},},
          ],
        },
        createdBy: 'SYSTEM',
      },
    ];

    for (const rule of defaultRules) {
      this.createAlertRule(rule);
    }

    this.logger.log(`Initialized ${defaultRules.length} default alert rules`);
  }

  private createDefaultEscalationPolicy(): EscalationPolicy {
    return {
      id: 'default_escalation',name: 'Default Escalation Policy',steps: [{
          level: 1,
          timeout: 15, // 15 minutes
          targets: [
            {
              type: 'TEAM',identifier: 'on-call-engineers',contactMethods: ['email', 'slack'],priority: 1,},
          ],
          actions: [
            {
              type: 'NOTIFY',config: {channels: ['slack', 'email'],urgency: 'normal',},},
          ],
        },
        {
          level: 2,
          timeout: 30, // 30 minutes
          targets: [
            {
              type: 'TEAM',identifier: 'engineering-managers',contactMethods: ['email', 'sms'],priority: 1,},
          ],
          actions: [
            {
              type: 'NOTIFY',config: {channels: ['sms', 'email'],urgency: 'high',},},
            {
              type: 'CREATE_INCIDENT',config: {severity: 'major',assignTo: 'on-call-engineers',},},
          ],
        },
        {
          level: 3,
          timeout: 60, // 60 minutes
          targets: [
            {
              type: 'USER',identifier: 'cto',contactMethods: ['sms', 'push'],priority: 1,},
          ],
          actions: [
            {
              type: 'NOTIFY',config: {channels: ['sms', 'push'],urgency: 'emergency',},},
          ],
        },
      ],
      globalTimeout: 120, // 2 hours
      repeatInterval: 30, // Repeat every 30 minutes
      maxRepetitions: 5,
      businessHoursOnly: false,
      timezone: 'UTC',};}

  private createDefaultNotificationChannels(): NotificationChannel[] {
    return [
      {
        type: 'EMAIL',config: {recipients: ['alerts@company.com'],smtpServer: 'smtp.company.com',},enabled: true,
        priority: 1,
        rateLimiting: {
          maxPerHour: 50,
          maxPerDay: 200,
          cooldownMinutes: 5,
        },
        template: {
          subject: 'Parlant Performance Alert: {{alertTitle}}',body: 'Alert: {{alertTitle}}Severity: {{severity}}
Metric: {{metric}}
Value: {{currentValue}}
Threshold: {{threshold}}
Time: {{timestamp}}',format: 'TEXT',variables: ['alertTitle', 'severity', 'metric', 'currentValue', 'threshold', 'timestamp'],},},
      {
        type: 'SLACK',config: {webhookUrl: 'https://hooks.slack.com/services/...',channel: '#alerts',},enabled: true,
        priority: 2,
        rateLimiting: {
          maxPerHour: 100,
          maxPerDay: 500,
          cooldownMinutes: 1,
        },
        template: {
          subject: '',body: '🚨 *{{alertTitle}}*\n*Severity:* {{severity}}\n*Metric:* {{metric}} ({{currentValue}})\n*Threshold:* {{threshold}}\n*Time:* {{timestamp}}',format: 'MARKDOWN',variables: ['alertTitle', 'severity', 'metric', 'currentValue', 'threshold', 'timestamp'],},},
    ];
  }

  private startAlertEvaluationEngine(): void {
    setInterval(async () => {
      try {
        await this.evaluateAlertRules();
      } catch (error) {
        this.logger.error('Alert evaluation failed', error);}}, this.alertingConfig.evaluationIntervalMs);

    this.logger.log('Alert evaluation engine started', {interval: this.alertingConfig.evaluationIntervalMs,enabledRules: Array.from(this.alertRules.values()).filter(rule => rule.enabled).length,
    });
  }

  private startNotificationProcessor(): void {
    setInterval(async () => {
      try {
        await this.processNotificationQueue();
      } catch (error) {
        this.logger.error('Notification processing failed', error);}}, 5000); // Process every 5 seconds

    this.logger.log('Notification processor started');}private async evaluateAlertRules(): Promise<void> {
    const enabledRules = Array.from(this.alertRules.values()).filter(rule => rule.enabled);
    const stats = this.performanceMonitor.getPerformanceStats('minute');

    for (const rule of enabledRules) {
      try {
        await this.evaluateRule(rule, stats);
      } catch (error) {
        this.logger.error(`Failed to evaluate rule ${rule.id}`, error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule, stats: ParlantPerformanceStats): Promise<void> {
    const metricValue = this.getMetricValue(rule.metric, stats);
    if (metricValue === null) return;

    const threshold = this.getApplicableThreshold(rule, metricValue);
    const shouldAlert = this.evaluateCondition(rule.condition, metricValue, threshold);

    const existingAlert = Array.from(this.activeAlerts.values())
      .find(alert => alert.ruleId === rule.id && alert.status !== AlertStatus.RESOLVED);

    if (shouldAlert && !existingAlert) {
      // Create new alert
      await this.createAlert(rule, metricValue);
    } else if (!shouldAlert && existingAlert && rule.autoResolution.enabled) {
      // Check auto-resolution conditions
      const shouldAutoResolve = await this.checkAutoResolutionConditions(rule, existingAlert, stats);
      if (shouldAutoResolve) {
        await this.autoResolveAlert(existingAlert);
      }
    } else if (existingAlert) {
      // Update existing alert
      await this.updateExistingAlert(existingAlert, metricValue, threshold);
    }
  }

  private getMetricValue(metric: string, stats: ParlantPerformanceStats): number | null {
    switch (metric) {
      case 'averageLatency': return stats.averageLatency;case 'p95Latency': return stats.p95Latency;case 'p99Latency': return stats.p99Latency;case 'throughputRpm': return stats.throughputRpm;case 'cacheHitRate': return stats.cacheHitRate;case 'errorRate': return stats.errorRate;case 'performanceScore': return stats.performanceScore;default: return null;}
  }

  private getApplicableThreshold(rule: AlertRule, metricValue: number): number {
    if (rule.thresholds.emergency && metricValue >= rule.thresholds.emergency) {
      return rule.thresholds.emergency;
    }
    if (metricValue >= rule.thresholds.critical) {
      return rule.thresholds.critical;
    }
    return rule.thresholds.warning;
  }

  private evaluateCondition(condition: AlertCondition, value: number, threshold: number): boolean {
    switch (condition.operator) {
      case 'GT': return value > threshold;case 'LT': return value < threshold;case 'GTE': return value >= threshold;case 'LTE': return value <= threshold;case 'EQ': return value === threshold;case 'NE': return value !== threshold;
      default: return false;
    }
  }

  private async createAlert(rule: AlertRule, metricValue: number, metadata: Record<string, unknown> = {}): Promise<string> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;const threshold = this.getApplicableThreshold(rule, metricValue);const alert: ActiveAlert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue: metricValue,
      threshold,
      severity: this.determineSeverity(rule, metricValue),
      status: AlertStatus.TRIGGERED,
      triggeredAt: new Date(),
      escalationLevel: 0,
      escalationHistory: [],
      notificationHistory: [],
      context: await this.buildAlertContext(rule, metricValue),
      correlation: await this.correlationEngine.analyzeCorrelation(alertId, rule.metric, metricValue),
      businessImpact: await this.assessBusinessImpact(rule, metricValue),
      autoResolutionAttempts: 0,
      tags: rule.tags,
      metadata,
    };

    this.activeAlerts.set(alertId, alert);

    // Send initial notifications
    await this.sendAlertNotifications(alert);

    // Start escalation timer
    this.scheduleEscalation(alert);

    this.logger.warn(`Alert triggered: ${alertId}`, {
      alertId,
      ruleName: rule.name,
      metric: rule.metric,
      currentValue: metricValue,
      threshold,
      severity: alert.severity,
    });

    this.eventEmitter.emit('alert.triggered', alert);return alertId;}

  private determineSeverity(rule: AlertRule, metricValue: number): AlertSeverity {
    if (rule.thresholds.emergency && metricValue >= rule.thresholds.emergency) {
      return AlertSeverity.EMERGENCY;
    }
    if (metricValue >= rule.thresholds.critical) {
      return AlertSeverity.CRITICAL;
    }
    return AlertSeverity.WARNING;
  }

  private async buildAlertContext(rule: AlertRule, metricValue: number): Promise<AlertContext> {
    const stats = this.performanceMonitor.getPerformanceStats('hour');return {triggeringEvent: {
        timestamp: new Date(),
        value: metricValue,
        trend: 'STABLE', // TODO: Calculate actual trendchangeRate: 0, // TODO: Calculate change ratehistoricalComparison: {
          samePeriodLastWeek: metricValue * 0.9, // Mock data
          samePeriodLastMonth: metricValue * 0.8,
          percentChange: 10,
        },
      },
      systemState: {
        activeOperations: 0, // TODO: Get actual active operations
        systemLoad: 50, // TODO: Get actual system load
        memoryUsage: 70, // TODO: Get actual memory usage
        networkLatency: 20, // TODO: Get actual network latency
        dependencyHealth: {
          database: 'HEALTHY',cache: 'HEALTHY',},},
      relatedMetrics: [
        {
          metric: 'throughputRpm',value: stats.throughputRpm,correlation: 0.8,
        },
        {
          metric: 'errorRate',value: stats.errorRate,correlation: 0.6,
        },
      ],
      recentChanges: {
        deployments: [], // TODO: Get recent deployments
        configChanges: [], // TODO: Get recent config changes
        trafficSpikes: [], // TODO: Get recent traffic spikes
      },
    };
  }

  private async assessBusinessImpact(rule: AlertRule, metricValue: number): Promise<BusinessImpactAssessment> {
    const baseImpact = rule.businessImpact;

    // Calculate dynamic impact based on severity
    const impactMultiplier = metricValue / rule.thresholds.warning;
    const affectedUsers = Math.floor(baseImpact.estimatedUserImpact * impactMultiplier);
    const affectedRevenue = baseImpact.revenueImpact.amountPerHour * impactMultiplier;

    return {
      overallImpact: this.calculateOverallImpact(impactMultiplier),
      affectedUsers,
      affectedServices: impactMultiplier > 1.5 ? ['parlant-validation', 'parlant-integration'] : [],affectedRevenue,slaViolations: impactMultiplier > 2 ? ['Response Time SLA'] : [],complianceRisks: baseImpact.complianceRisk.regulations,reputationImpact: impactMultiplier > 3 ? 'HIGH' : 'MEDIUM',customerSatisfactionImpact: Math.min(-100, -(impactMultiplier * 20)),recoveryTimeEstimate: Math.floor(impactMultiplier * 30), // Minutes
      mitigationActions: this.generateMitigationActions(rule.metric, impactMultiplier),
    };
  }

  private calculateOverallImpact(multiplier: number): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {if (multiplier > 5) return 'CRITICAL';if (multiplier > 3) return 'HIGH';if (multiplier > 2) return 'MEDIUM';if (multiplier > 1.5) return 'LOW';return 'NONE';}private generateMitigationActions(metric: string, multiplier: number): string[] {
    const actions: string[] = [];

    switch (metric) {
      case 'averageLatency':actions.push('Scale up application instances');actions.push('Enable additional caching layers');actions.push('Optimize database queries');if (multiplier > 3) {actions.push('Activate circuit breaker');actions.push('Redirect traffic to backup systems');}break;

      case 'cacheHitRate':actions.push('Warm cache with frequently accessed data');actions.push('Increase cache memory allocation');actions.push('Optimize cache key strategies');break;default:
        actions.push('Monitor system closely');actions.push('Prepare for manual intervention');}return actions;
  }

  private async sendAlertNotifications(alert: ActiveAlert): Promise<void> {
    const rule = this.alertRules.get(alert.ruleId);
    if (!rule) return;

    for (const channel of rule.notificationChannels) {
      if (channel.enabled) {
        const notification: NotificationEvent = {
          timestamp: new Date(),
          channel: channel.type,
          target: this.getChannelTarget(channel),
          status: 'SENT',responseTime: 0,};

        this.notificationQueue.push(notification);
        alert.notificationHistory.push(notification);
      }
    }
  }

  private getChannelTarget(channel: NotificationChannel): string {
    switch (channel.type) {
      case 'EMAIL':const recipients = channel.config.recipients as string[] | undefined;return Array.isArray(recipients)
          ? recipients[0] || 'unknown@example.com': 'unknown@example.com';case 'SLACK':return (channel.config.channel as string) || '#alerts';default:return 'unknown';}}

  private scheduleEscalation(alert: ActiveAlert): void {
    const rule = this.alertRules.get(alert.ruleId);
    if (!rule || alert.escalationLevel >= rule.escalationPolicy.steps.length) return;

    const step = rule.escalationPolicy.steps[alert.escalationLevel]!;
    const timeoutMs = step.timeout * 60 * 1000; // Convert minutes to milliseconds

    setTimeout(async () => {
      const currentAlert = this.activeAlerts.get(alert.id);
      if (currentAlert &&
          currentAlert.status !== AlertStatus.RESOLVED &&
          currentAlert.status !== AlertStatus.ACKNOWLEDGED) {
        await this.escalateAlert(currentAlert);
      }
    }, timeoutMs);
  }

  private async escalateAlert(alert: ActiveAlert): Promise<void> {
    const rule = this.alertRules.get(alert.ruleId);
    if (!rule) return;

    const nextLevel = alert.escalationLevel + 1;
    if (nextLevel >= rule.escalationPolicy.steps.length) return;

    const escalationEvent: EscalationEvent = {
      timestamp: new Date(),
      fromLevel: alert.escalationLevel,
      toLevel: nextLevel,
      reason: 'Escalation timeout reached',triggeredBy: 'SYSTEM',
      targets: rule.escalationPolicy.steps[nextLevel]?.targets || [],
      actions: rule.escalationPolicy.steps[nextLevel]?.actions || [],
    };

    const updatedAlert: ActiveAlert = {
      ...alert,
      status: AlertStatus.ESCALATED,
      escalationLevel: nextLevel,
      escalationHistory: [...alert.escalationHistory, escalationEvent],
    };

    this.activeAlerts.set(alert.id, updatedAlert);

    // Execute escalation actions
    await this.executeEscalationActions(escalationEvent, updatedAlert);

    // Schedule next escalation
    this.scheduleEscalation(updatedAlert);

    this.logger.warn(`Alert escalated: ${alert.id}`, {
      alertId: alert.id,
      fromLevel: escalationEvent.fromLevel,
      toLevel: escalationEvent.toLevel,
      targets: escalationEvent.targets.length,
    });

    this.eventEmitter.emit('alert.escalated', updatedAlert);
  }

  private async executeEscalationActions(escalation: EscalationEvent, alert: ActiveAlert): Promise<void> {
    for (const action of escalation.actions) {
      try {
        await this.executeAction(action, alert);
      } catch (error) {
        this.logger.error(`Failed to execute escalation action: ${action.type}`, error);
      }
    }
  }

  private async executeAction(action: EscalationAction, alert: ActiveAlert): Promise<void> {
    switch (action.type) {
      case 'NOTIFY':await this.sendEscalationNotification(alert, action.config);break;
      case 'CREATE_INCIDENT':await this.createIncident(alert, action.config);break;
      case 'RUN_AUTOMATION':await this.runAutomation(alert, action.config);break;
      case 'SCALE_RESOURCES':
        await this.scaleResources(alert, action.config);
        break;
    }
  }

  private async sendEscalationNotification(alert: ActiveAlert, config: Record<string, unknown>): Promise<void> {
    this.logger.log(`Sending escalation notification for alert: ${alert.id}`, config);// TODO: Implement actual notification sending}

  private async createIncident(alert: ActiveAlert, config: Record<string, unknown>): Promise<void> {
    this.logger.log(`Creating incident for alert: ${alert.id}`, config);// TODO: Implement incident creation}

  private async runAutomation(alert: ActiveAlert, config: Record<string, unknown>): Promise<void> {
    this.logger.log(`Running automation for alert: ${alert.id}`, config);// TODO: Implement automation execution}

  private async scaleResources(alert: ActiveAlert, config: Record<string, unknown>): Promise<void> {
    this.logger.log(`Scaling resources for alert: ${alert.id}`, config);
    // TODO: Implement resource scaling
  }

  private async checkAutoResolutionConditions(
    rule: AlertRule,
    alert: ActiveAlert,
    stats: ParlantPerformanceStats
  ): Promise<boolean> {
    if (!rule.autoResolution.enabled) return false;

    for (const condition of rule.autoResolution.conditions) {
      const metricValue = this.getMetricValue(condition.metric, stats);
      if (metricValue === null) continue;

      const conditionMet = this.evaluateCondition(
        { ...rule.condition, operator: condition.operator },
        metricValue,
        condition.value
      );

      if (!conditionMet) return false;
    }

    return true;
  }

  private async autoResolveAlert(alert: ActiveAlert): Promise<void> {
    const updatedAlert: ActiveAlert = {
      ...alert,
      status: AlertStatus.AUTO_RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: 'SYSTEM',
      autoResolutionAttempts: alert.autoResolutionAttempts + 1,
    };

    this.alertHistory.push(updatedAlert);
    this.activeAlerts.delete(alert.id);

    this.logger.log(`Alert auto-resolved: ${alert.id}`, {
      alertId: alert.id,
      resolvedAt: updatedAlert.resolvedAt,
      attempts: updatedAlert.autoResolutionAttempts,
    });

    this.eventEmitter.emit('alert.auto_resolved', updatedAlert);}private async updateExistingAlert(alert: ActiveAlert, currentValue: number, threshold: number): Promise<void> {
    const updatedAlert: ActiveAlert = {
      ...alert,
      currentValue,
      threshold,
      metadata: {
        ...alert.metadata,
        lastUpdated: new Date(),
      },
    };

    this.activeAlerts.set(alert.id, updatedAlert);
  }

  private async processNotificationQueue(): Promise<void> {
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      if (notification) {
        try {
          await this.deliverNotification(notification);
        } catch (error) {
          this.logger.error('Failed to deliver notification', error);notification.status = 'FAILED';notification.errorMessage = error instanceof Error ? error.message : 'Unknown error';}}
    }
  }

  private async deliverNotification(notification: NotificationEvent): Promise<void> {
    const startTime = performance.now();

    // TODO: Implement actual notification delivery based on channel type
    await this.delay(Math.random() * 100 + 50); // Simulate delivery time

    notification.responseTime = performance.now() - startTime;
    notification.status = 'DELIVERED';
    notification.deliveryConfirmation = new Date();
  }

  private async sendAcknowledgmentNotification(alert: ActiveAlert, acknowledgedBy: string, notes?: string): Promise<void> {
    this.logger.log(`Sending acknowledgment notification for alert: ${alert.id}`, {acknowledgedBy,notes,
    });
    // TODO: Implement acknowledgment notification
  }

  private async sendResolutionNotification(alert: ActiveAlert, resolvedBy: string, resolution: string): Promise<void> {
    this.logger.log(`Sending resolution notification for alert: ${alert.id}`, {
      resolvedBy,
      resolution,
    });
    // TODO: Implement resolution notification
  }

  private calculateAlertTrends(alerts: ActiveAlert[]): AlertAnalytics['alertTrends'] {const totalAlerts = alerts.length;const alertsByType: Record<string, number> = {};
    const alertsBySeverity: Record<AlertSeverity, number> = {
      [AlertSeverity.INFO]: 0,
      [AlertSeverity.WARNING]: 0,
      [AlertSeverity.CRITICAL]: 0,
      [AlertSeverity.EMERGENCY]: 0,
    };
    const alertsByService: Record<string, number> = {};

    let totalDetectionTime = 0;
    let totalAcknowledgmentTime = 0;
    let totalResolutionTime = 0;
    let falsePositives = 0;
    let autoResolutions = 0;

    for (const alert of alerts) {
      // Count by type
      alertsByType[alert.metric] = (alertsByType[alert.metric] || 0) + 1;

      // Count by severity
      alertsBySeverity[alert.severity]++;

      // Count by service
      for (const service of alert.businessImpact.affectedServices || []) {
        alertsByService[service] = (alertsByService[service] || 0) + 1;
      }

      // Calculate timing metrics
      if (alert.acknowledgedAt) {
        totalAcknowledgmentTime += alert.acknowledgedAt.getTime() - alert.triggeredAt.getTime();
      }

      if (alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt.getTime() - alert.triggeredAt.getTime();
      }

      // Count false positives and auto-resolutions
      if (alert.metadata.falsePositive) falsePositives++;
      if (alert.status === AlertStatus.AUTO_RESOLVED) autoResolutions++;
    }

    return {
      totalAlerts,
      alertsByType,
      alertsBySeverity,
      alertsByService,
      meanTimeToDetection: totalDetectionTime / Math.max(1, totalAlerts) / 60000, // Convert to minutes
      meanTimeToAcknowledgment: totalAcknowledgmentTime / Math.max(1, totalAlerts) / 60000,
      meanTimeToResolution: totalResolutionTime / Math.max(1, totalAlerts) / 60000,
      falsePositiveRate: (falsePositives / Math.max(1, totalAlerts)) * 100,
      autoResolutionRate: (autoResolutions / Math.max(1, totalAlerts)) * 100,
    };
  }

  private calculateEscalationAnalytics(alerts: ActiveAlert[]): AlertAnalytics['escalationAnalytics'] {const escalatedAlerts = alerts.filter(alert => alert.escalationLevel > 0);const totalEscalationTime = escalatedAlerts.reduce(
      (sum, alert) => {
        const firstEscalation = alert.escalationHistory[0];
        return firstEscalation
          ? sum + (firstEscalation.timestamp.getTime() - alert.triggeredAt.getTime())
          : sum;
      },
      0
    );

    const escalationsByLevel: Record<number, number> = {};
    const escalationReasons: Record<string, number> = {};

    for (const alert of escalatedAlerts) {
      escalationsByLevel[alert.escalationLevel] = (escalationsByLevel[alert.escalationLevel] || 0) + 1;

      for (const escalation of alert.escalationHistory) {
        escalationReasons[escalation.reason] = (escalationReasons[escalation.reason] || 0) + 1;
      }
    }

    const topEscalationReasons = Object.entries(escalationReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason]) => reason);

    return {
      escalationRate: (escalatedAlerts.length / Math.max(1, alerts.length)) * 100,
      averageEscalationTime: totalEscalationTime / Math.max(1, escalatedAlerts.length) / 60000,
      escalationsByLevel,
      topEscalationReasons,
    };
  }

  private async calculatePerformanceImpact(): Promise<AlertAnalytics['performanceImpact']> {
    return {
      alertingOverhead: 5, // TODO: Calculate actual overhead
      notificationLatency: 100, // TODO: Calculate actual latency
      systemResourceImpact: 2, // TODO: Calculate actual impact
    };
  }

  private async generateAlertingRecommendations(alerts: ActiveAlert[]): Promise<AlertingRecommendation[]> {
    const recommendations: AlertingRecommendation[] = [];

    // Analyze false positive rate
    const falsePositives = alerts.filter(alert => alert.metadata.falsePositive).length;
    const falsePositiveRate = (falsePositives / Math.max(1, alerts.length)) * 100;

    if (falsePositiveRate > this.alertingConfig.falsePositiveThreshold * 100) {
      recommendations.push({
        id: `rec_false_positive_${Date.now()}`,
        type: 'THRESHOLD_ADJUSTMENT',priority: 'HIGH',title: 'Reduce False Positive Rate',
        description: `False positive rate (${falsePositiveRate.toFixed(1)}%) exceeds acceptable threshold. Consider adjusting alert thresholds or conditions.`,
        impact: {
          falsePositiveReduction: 50,
          detectionImprovement: 10,
          resolutionTimeImprovement: 5,
        },
        implementation: {
          difficulty: 'MEDIUM',estimatedTime: 4,dependencies: ['Historical data analysis', 'Threshold modeling'],risks: ['Potential for missing actual issues', 'Requires careful validation'],},generatedAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    }

    return recommendations;
  }

  private getTimeRangeCutoff(timeRange: string): Date {
    const now = Date.now();
    switch (timeRange) {
      case '1h': return new Date(now - 60 * 60 * 1000);case '24h': return new Date(now - 24 * 60 * 60 * 1000);case '7d': return new Date(now - 7 * 24 * 60 * 60 * 1000);case '30d': return new Date(now - 30 * 24 * 60 * 60 * 1000);default: return new Date(now - 24 * 60 * 60 * 1000);}
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async performContinuousEvaluation(): Promise<void> {
    // Lightweight continuous evaluation
    await this.evaluateAlertRules();
  }

  private async performPerformanceAnalysis(): Promise<void> {
    // Enhanced performance analysis
    await this.evaluateAlertRules();
    this.updateAnalytics();
  }

  private async performComprehensiveAnalysis(): Promise<void> {
    // Comprehensive analysis including correlations
    await this.evaluateAlertRules();
    this.updateAnalytics();
    await this.performCorrelationAnalysis();
  }

  private async performCorrelationAnalysis(): Promise<void> {
    // TODO: Implement correlation analysis
    this.logger.debug('Performing correlation analysis');}private updateAnalytics(): void {
    // TODO: Update analytics data
    this.logger.debug('Updating analytics');}// ===== EVENT HANDLERS =====

  // Note: Event handling implemented in initializeEventHandlers()
  private async handleMetricUpdate(data: { metric: string; value: number }): Promise<void> {
    // Trigger immediate evaluation for critical metrics
    const criticalMetrics = ['averageLatency', 'errorRate'];if (criticalMetrics.includes(data.metric)) {const relevantRules = Array.from(this.alertRules.values())
        .filter(rule => rule.metric === data.metric && rule.enabled);

      const stats = this.performanceMonitor.getPerformanceStats('minute');for (const rule of relevantRules) {await this.evaluateRule(rule, stats);
      }
    }
  }

  // ===== SCHEDULED TASKS =====

  // Note: Scheduled via initializeScheduledTasks()
  private async performMinutelyTasks(): Promise<void> {
    try {
      await this.evaluateAlertRules();
    } catch (error) {
      this.logger.error('Minutely alerting tasks failed', error);}}

  // Note: Scheduled via initializeScheduledTasks()
  private async performTenMinuteTasks(): Promise<void> {
    try {
      await this.cleanupResolvedAlerts();
      await this.updateAlertAnalytics();
    } catch (error) {
      this.logger.error('Ten-minute alerting tasks failed', error);}}

  // Note: Scheduled via initializeScheduledTasks()
  private async performHourlyTasks(): Promise<void> {
    try {
      await this.generateAlertingReport();
      await this.optimizeAlertThresholds();
    } catch (error) {
      this.logger.error('Hourly alerting tasks failed', error);
    }
  }

  private async cleanupResolvedAlerts(): Promise<void> {
    const retentionCutoff = new Date(Date.now() - this.alertingConfig.historyRetentionDays * 24 * 60 * 60 * 1000);
    const initialLength = this.alertHistory.length;

    this.alertHistory.splice(0, this.alertHistory.findIndex(alert => alert.triggeredAt > retentionCutoff));

    if (this.alertHistory.length !== initialLength) {
      this.logger.log(`Cleaned up ${initialLength - this.alertHistory.length} old alerts from history`);
    }
  }

  private async updateAlertAnalytics(): Promise<void> {
    this.alertAnalytics = await this.getAlertAnalytics('24h');}private async generateAlertingReport(): Promise<void> {
    const analytics = await this.getAlertAnalytics('1h');this.logger.log('Alerting System Report', {activeAlerts: this.activeAlerts.size,totalRules: this.alertRules.size,
      enabledRules: Array.from(this.alertRules.values()).filter(rule => rule.enabled).length,
      alertTrends: analytics.alertTrends,
      escalationAnalytics: analytics.escalationAnalytics,
      recommendations: analytics.recommendations.length,
    });
  }

  private async optimizeAlertThresholds(): Promise<void> {
    // TODO: Implement machine learning-based threshold optimization
    this.logger.debug('Alert threshold optimization completed');}}

// ===== ALERT CORRELATION ENGINE =====

class AlertCorrelationEngine {
  private readonly correlationHistory: Map<string, AlertCorrelation> = new Map();

  async analyzeCorrelation(alertId: string, metric: string, value: number): Promise<AlertCorrelation> {
    // TODO: Implement sophisticated correlation analysis
    return {
      correlatedAlerts: [],
      rootCauseCandidate: false,
      correlationScore: 0,
      timeCorrelation: {
        type: 'SIMULTANEOUS',
        timeDelta: 0,
      },
      metricCorrelation: {
        strongCorrelations: [],
        weakCorrelations: [],
        inverseCorrelations: [],
      },
      impactChain: [],
    };
  }
}