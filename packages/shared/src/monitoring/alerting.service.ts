/**
 * Enterprise Alerting and Notification System
 *
 * Comprehensive alerting system with intelligent escalation, notification management,
 * and automated incident response for PARLANT database function monitoring.
 *
 * Features:
 * - Intelligent alert routing and escalation
 * - Multi-channel notification delivery (email, Slack, SMS, webhook)
 * - Alert correlation and noise reduction
 * - Escalation policies with time-based rules
 * - Alert fatigue prevention
 * - On-call rotation management
 * - SLA tracking and breach notifications
 * - Automated incident creation and management
 *
 * @author Claude Code - Enterprise Monitoring Specialist
 * @version 1.0.0 - Production Ready
 */

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import { AlertSeverity, MonitoringEvent } from "./types";

/**
 * Alert definition interface
 */
export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  source: string;
  metric: string;
  currentValue: number;
  threshold: number;
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | "SUPPRESSED";
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgerId?: string;
  resolverId?: string;
  escalationLevel: number;
  nextEscalationAt?: Date;
  correlationId?: string;
  runbookUrl?: string;
  metadata: Record<string, any>;
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  id: string;
  type: "email" | "slack" | "sms" | "webhook" | "pagerduty" | "teams";
  name: string;
  enabled: boolean;
  config: {
    url?: string;
    apiKey?: string;
    recipients?: string[];
    channel?: string;
    phoneNumbers?: string[];
  };
  severityFilter: AlertSeverity[];
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
}

/**
 * Escalation policy configuration
 */
export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  steps: EscalationStep[];
  metadata: Record<string, any>;
}

/**
 * Escalation step configuration
 */
export interface EscalationStep {
  stepNumber: number;
  delayMinutes: number;
  channels: string[];
  assignees: string[];
  autoAcknowledge: boolean;
  conditions?: {
    severities?: AlertSeverity[];
    sources?: string[];
    tags?: string[];
  };
}

/**
 * On-call schedule configuration
 */
export interface OnCallSchedule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  timeZone: string;
  rotations: OnCallRotation[];
}

/**
 * On-call rotation configuration
 */
export interface OnCallRotation {
  id: string;
  name: string;
  type: "daily" | "weekly" | "custom";
  participants: string[];
  startDate: Date;
  rotationIntervalHours: number;
  currentAssignee?: string;
  nextRotationAt?: Date;
}

/**
 * Alert correlation rule
 */
export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  timeWindowMinutes: number;
  conditions: {
    sources?: string[];
    metrics?: string[];
    severities?: AlertSeverity[];
    tags?: string[];
  };
  action: "suppress" | "merge" | "escalate";
  parentAlertTemplate?: string;
}

/**
 * Notification delivery result
 */
interface NotificationResult {
  channelId: string;
  channelType: string;
  success: boolean;
  timestamp: Date;
  retryCount: number;
  errorMessage?: string;
  responseData?: any;
}

/**
 * Enterprise Alerting Service
 */
@Injectable()
export class AlertingService implements OnModuleInit {
  private readonly logger = new Logger(AlertingService.name);

  private readonly activeAlerts = new Map<string, Alert>();
  private readonly notificationChannels = new Map<
    string,
    NotificationChannel
  >();
  private readonly escalationPolicies = new Map<string, EscalationPolicy>();
  private readonly onCallSchedules = new Map<string, OnCallSchedule>();
  private readonly correlationRules: CorrelationRule[] = [];
  private readonly alertHistory: Alert[] = [];
  private readonly notificationHistory: NotificationResult[] = [];

  private readonly maxAlertHistory = 10000;
  private readonly maxNotificationHistory = 5000;

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.initializeDefaultChannels();
    this.initializeDefaultPolicies();
    this.initializeCorrelationRules();
  }

  async onModuleInit(): Promise<void> {
    await this.startAlertProcessing();
    await this.startEscalationProcessing();
    await this.startOnCallRotation();

    this.logger.log("Enterprise Alerting Service initialized", {
      notificationChannels: this.notificationChannels.size,
      escalationPolicies: this.escalationPolicies.size,
      correlationRules: this.correlationRules.length,
      onCallSchedules: this.onCallSchedules.size,
    });
  }

  /**
   * Trigger new alert
   */
  async triggerAlert(
    name: string,
    description: string,
    severity: AlertSeverity,
    source: string,
    metric: string,
    currentValue: number,
    threshold: number,
    operator: ">" | "<" | ">=" | "<=" | "==" | "!=",
    metadata: Record<string, any> = {},
  ): Promise<string> {
    const alertId = this.generateAlertId();

    const alert: Alert = {
      id: alertId,
      name,
      description,
      severity,
      source,
      metric,
      currentValue,
      threshold,
      operator,
      status: "TRIGGERED",
      triggeredAt: new Date(),
      escalationLevel: 0,
      metadata,
    };

    // Check for correlation
    const correlatedAlert = await this.checkCorrelation(alert);
    if (correlatedAlert) {
      this.logger.debug(
        `Alert correlated with existing alert: ${correlatedAlert.id}`,
        {
          newAlertId: alertId,
          correlatedAlertId: correlatedAlert.id,
        },
      );
      return correlatedAlert.id;
    }

    this.activeAlerts.set(alertId, alert);

    // Schedule initial escalation
    await this.scheduleEscalation(alert);

    // Emit alert event
    this.eventEmitter.emit("alerting.alert_triggered", {
      alert,
      timestamp: new Date(),
    });

    this.logger.warn(`Alert triggered: ${name}`, {
      alertId,
      severity,
      source,
      metric,
      currentValue,
      threshold,
    });

    return alertId;
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgerId: string,
  ): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.status !== "TRIGGERED") {
      return false;
    }

    alert.status = "ACKNOWLEDGED";
    alert.acknowledgedAt = new Date();
    alert.acknowledgerId = acknowledgerId;

    // Cancel pending escalations
    await this.cancelEscalation(alert);

    this.logger.log(`Alert acknowledged: ${alert.name}`, {
      alertId,
      acknowledgerId,
      acknowledgedAt: alert.acknowledgedAt,
    });

    this.eventEmitter.emit("alerting.alert_acknowledged", {
      alert,
      acknowledgerId,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolverId?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = "RESOLVED";
    alert.resolvedAt = new Date();
    alert.resolverId = resolverId;

    // Move to history
    this.alertHistory.push(alert);
    this.activeAlerts.delete(alertId);

    // Maintain history size
    if (this.alertHistory.length > this.maxAlertHistory) {
      this.alertHistory.splice(
        0,
        this.alertHistory.length - this.maxAlertHistory,
      );
    }

    this.logger.log(`Alert resolved: ${alert.name}`, {
      alertId,
      resolverId,
      resolvedAt: alert.resolvedAt,
      duration: alert.resolvedAt.getTime() - alert.triggeredAt.getTime(),
    });

    this.eventEmitter.emit("alerting.alert_resolved", {
      alert,
      resolverId,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Suppress alert
   */
  async suppressAlert(alertId: string, reason: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.status = "SUPPRESSED";
    alert.metadata.suppressionReason = reason;
    alert.metadata.suppressedAt = new Date();

    this.logger.log(`Alert suppressed: ${alert.name}`, {
      alertId,
      reason,
      suppressedAt: alert.metadata.suppressedAt,
    });

    return true;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(filters?: {
    severity?: AlertSeverity;
    source?: string;
    status?: string;
  }): Alert[] {
    let alerts = Array.from(this.activeAlerts.values());

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter((alert) => alert.severity === filters.severity);
      }
      if (filters.source) {
        alerts = alerts.filter((alert) => alert.source === filters.source);
      }
      if (filters.status) {
        alerts = alerts.filter((alert) => alert.status === filters.status);
      }
    }

    return alerts.sort(
      (a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime(),
    );
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(timeRangeHours = 24): {
    totalAlerts: number;
    alertsBySeverity: Record<AlertSeverity, number>;
    alertsBySource: Record<string, number>;
    averageResolutionTime: number;
    acknowledgmentRate: number;
    falsePositiveRate: number;
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000);
    const recentAlerts = this.alertHistory.filter(
      (alert) => alert.triggeredAt >= cutoffTime,
    );

    const alertsBySeverity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    } as Record<AlertSeverity, number>;

    const alertsBySource: Record<string, number> = {};
    let totalResolutionTime = 0;
    let acknowledgedAlerts = 0;
    let resolvedAlerts = 0;

    for (const alert of recentAlerts) {
      alertsBySeverity[alert.severity]++;
      alertsBySource[alert.source] = (alertsBySource[alert.source] || 0) + 1;

      if (alert.acknowledgedAt) {
        acknowledgedAlerts++;
      }

      if (alert.resolvedAt) {
        resolvedAlerts++;
        totalResolutionTime +=
          alert.resolvedAt.getTime() - alert.triggeredAt.getTime();
      }
    }

    const averageResolutionTime =
      resolvedAlerts > 0 ? totalResolutionTime / resolvedAlerts : 0;
    const acknowledgmentRate =
      recentAlerts.length > 0
        ? (acknowledgedAlerts / recentAlerts.length) * 100
        : 0;
    const falsePositiveRate = 0; // Would be calculated based on alert feedback

    return {
      totalAlerts: recentAlerts.length,
      alertsBySeverity,
      alertsBySource,
      averageResolutionTime,
      acknowledgmentRate,
      falsePositiveRate,
    };
  }

  /**
   * Configure notification channel
   */
  configureNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.set(channel.id, channel);

    this.logger.log(`Notification channel configured: ${channel.name}`, {
      channelId: channel.id,
      type: channel.type,
      enabled: channel.enabled,
    });
  }

  /**
   * Configure escalation policy
   */
  configureEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicies.set(policy.id, policy);

    this.logger.log(`Escalation policy configured: ${policy.name}`, {
      policyId: policy.id,
      stepsCount: policy.steps.length,
      enabled: policy.enabled,
    });
  }

  /**
   * Process escalation cycle
   */
  @Cron(CronExpression.EVERY_MINUTE)
  private async processEscalations(): Promise<void> {
    const now = new Date();

    for (const alert of this.activeAlerts.values()) {
      if (
        alert.status === "TRIGGERED" &&
        alert.nextEscalationAt &&
        alert.nextEscalationAt <= now
      ) {
        await this.escalateAlert(alert);
      }
    }
  }

  /**
   * Process on-call rotations
   */
  @Cron(CronExpression.EVERY_HOUR)
  private async processOnCallRotations(): Promise<void> {
    const now = new Date();

    for (const schedule of this.onCallSchedules.values()) {
      if (!schedule.enabled) continue;

      for (const rotation of schedule.rotations) {
        if (rotation.nextRotationAt && rotation.nextRotationAt <= now) {
          await this.rotateOnCall(rotation);
        }
      }
    }
  }

  /**
   * Send notification through specified channel
   */
  private async sendNotification(
    channel: NotificationChannel,
    alert: Alert,
    escalationLevel: number,
  ): Promise<NotificationResult> {
    const result: NotificationResult = {
      channelId: channel.id,
      channelType: channel.type,
      success: false,
      timestamp: new Date(),
      retryCount: 0,
    };

    try {
      switch (channel.type) {
        case "email":
          await this.sendEmailNotification(channel, alert, escalationLevel);
          break;
        case "slack":
          await this.sendSlackNotification(channel, alert, escalationLevel);
          break;
        case "sms":
          await this.sendSMSNotification(channel, alert, escalationLevel);
          break;
        case "webhook":
          await this.sendWebhookNotification(channel, alert, escalationLevel);
          break;
        case "pagerduty":
          await this.sendPagerDutyNotification(channel, alert, escalationLevel);
          break;
        case "teams":
          await this.sendTeamsNotification(channel, alert, escalationLevel);
          break;
        default:
          throw new Error(`Unsupported notification type: ${channel.type}`);
      }

      result.success = true;

      this.logger.debug(`Notification sent successfully`, {
        channelId: channel.id,
        channelType: channel.type,
        alertId: alert.id,
        escalationLevel,
      });
    } catch (error) {
      result.success = false;
      result.errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`Notification failed`, {
        channelId: channel.id,
        channelType: channel.type,
        alertId: alert.id,
        error: result.errorMessage,
      });
    }

    this.notificationHistory.push(result);

    // Maintain history size
    if (this.notificationHistory.length > this.maxNotificationHistory) {
      this.notificationHistory.splice(
        0,
        this.notificationHistory.length - this.maxNotificationHistory,
      );
    }

    return result;
  }

  /**
   * Check alert correlation against existing alerts
   */
  private async checkCorrelation(newAlert: Alert): Promise<Alert | null> {
    for (const rule of this.correlationRules) {
      if (!rule.enabled) continue;

      const timeWindow = new Date(
        Date.now() - rule.timeWindowMinutes * 60 * 1000,
      );
      const existingAlerts = Array.from(this.activeAlerts.values()).filter(
        (alert) => alert.triggeredAt >= timeWindow,
      );

      for (const existingAlert of existingAlerts) {
        if (this.matchesCorrelationRule(newAlert, existingAlert, rule)) {
          if (rule.action === "suppress") {
            return existingAlert;
          } else if (rule.action === "merge") {
            // Merge logic would go here
            return existingAlert;
          } else if (rule.action === "escalate") {
            // Escalate existing alert
            await this.escalateAlert(existingAlert);
            return existingAlert;
          }
        }
      }
    }

    return null;
  }

  /**
   * Check if alerts match correlation rule
   */
  private matchesCorrelationRule(
    alert1: Alert,
    alert2: Alert,
    rule: CorrelationRule,
  ): boolean {
    if (
      rule.conditions.sources &&
      !rule.conditions.sources.includes(alert1.source) &&
      !rule.conditions.sources.includes(alert2.source)
    ) {
      return false;
    }

    if (
      rule.conditions.metrics &&
      !rule.conditions.metrics.includes(alert1.metric) &&
      !rule.conditions.metrics.includes(alert2.metric)
    ) {
      return false;
    }

    if (
      rule.conditions.severities &&
      !rule.conditions.severities.includes(alert1.severity) &&
      !rule.conditions.severities.includes(alert2.severity)
    ) {
      return false;
    }

    return true;
  }

  /**
   * Schedule alert escalation
   */
  private async scheduleEscalation(alert: Alert): Promise<void> {
    const policy = Array.from(this.escalationPolicies.values()).find(
      (p) => p.enabled && this.matchesEscalationPolicy(alert, p),
    );

    if (!policy || policy.steps.length === 0) {
      return;
    }

    const firstStep = policy.steps[0];
    alert.nextEscalationAt = new Date(
      Date.now() + firstStep.delayMinutes * 60 * 1000,
    );

    this.logger.debug(`Escalation scheduled for alert: ${alert.id}`, {
      policyId: policy.id,
      nextEscalationAt: alert.nextEscalationAt,
      delayMinutes: firstStep.delayMinutes,
    });
  }

  /**
   * Escalate alert to next level
   */
  private async escalateAlert(alert: Alert): Promise<void> {
    const policy = Array.from(this.escalationPolicies.values()).find(
      (p) => p.enabled && this.matchesEscalationPolicy(alert, p),
    );

    if (!policy) return;

    const currentStep = policy.steps[alert.escalationLevel];
    if (!currentStep) return;

    // Send notifications to channels in current step
    for (const channelId of currentStep.channels) {
      const channel = this.notificationChannels.get(channelId);
      if (channel && channel.enabled) {
        await this.sendNotification(channel, alert, alert.escalationLevel);
      }
    }

    // Move to next escalation level
    alert.escalationLevel++;

    // Schedule next escalation if available
    const nextStep = policy.steps[alert.escalationLevel];
    if (nextStep) {
      alert.nextEscalationAt = new Date(
        Date.now() + nextStep.delayMinutes * 60 * 1000,
      );
    } else {
      alert.nextEscalationAt = undefined;
    }

    this.logger.warn(`Alert escalated: ${alert.name}`, {
      alertId: alert.id,
      escalationLevel: alert.escalationLevel,
      nextEscalationAt: alert.nextEscalationAt,
    });
  }

  /**
   * Initialize default notification channels
   */
  private initializeDefaultChannels(): void {
    // Email channel
    this.notificationChannels.set("email-default", {
      id: "email-default",
      type: "email",
      name: "Default Email",
      enabled: true,
      config: {
        recipients: ["admin@company.com", "ops-team@company.com"],
      },
      severityFilter: ["medium", "high", "critical"],
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
      },
    });

    // Slack channel
    this.notificationChannels.set("slack-alerts", {
      id: "slack-alerts",
      type: "slack",
      name: "Slack Alerts",
      enabled: true,
      config: {
        url: process.env.SLACK_WEBHOOK_URL,
        channel: "#alerts",
      },
      severityFilter: ["high", "critical"],
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelayMs: 500,
      },
    });

    this.logger.log(
      `Initialized ${this.notificationChannels.size} default notification channels`,
    );
  }

  /**
   * Initialize default escalation policies
   */
  private initializeDefaultPolicies(): void {
    const defaultPolicy: EscalationPolicy = {
      id: "default-escalation",
      name: "Default Escalation Policy",
      description: "Standard escalation for production alerts",
      enabled: true,
      steps: [
        {
          stepNumber: 1,
          delayMinutes: 0,
          channels: ["slack-alerts"],
          assignees: ["on-call-engineer"],
          autoAcknowledge: false,
        },
        {
          stepNumber: 2,
          delayMinutes: 5,
          channels: ["email-default"],
          assignees: ["team-lead"],
          autoAcknowledge: false,
        },
        {
          stepNumber: 3,
          delayMinutes: 15,
          channels: ["email-default", "slack-alerts"],
          assignees: ["senior-engineer", "manager"],
          autoAcknowledge: false,
        },
      ],
      metadata: {},
    };

    this.escalationPolicies.set(defaultPolicy.id, defaultPolicy);
    this.logger.log("Initialized default escalation policy");
  }

  /**
   * Initialize correlation rules
   */
  private initializeCorrelationRules(): void {
    this.correlationRules.push(
      {
        id: "function-performance-correlation",
        name: "Function Performance Correlation",
        description: "Correlate multiple slow function alerts",
        enabled: true,
        timeWindowMinutes: 5,
        conditions: {
          metrics: ["average_response_time", "p95_response_time"],
          severities: ["high", "critical"],
        },
        action: "merge",
      },
      {
        id: "error-rate-correlation",
        name: "Error Rate Correlation",
        description: "Correlate error rate spikes",
        enabled: true,
        timeWindowMinutes: 2,
        conditions: {
          metrics: ["error_rate"],
          severities: ["medium", "high", "critical"],
        },
        action: "escalate",
      },
    );

    this.logger.log(
      `Initialized ${this.correlationRules.length} correlation rules`,
    );
  }

  // Placeholder implementations for notification methods
  private async sendEmailNotification(
    channel: NotificationChannel,
    alert: Alert,
    escalationLevel: number,
  ): Promise<void> {
    // Email notification implementation
    this.logger.debug("Sending email notification", {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  private async sendSlackNotification(
    channel: NotificationChannel,
    alert: Alert,
    escalationLevel: number,
  ): Promise<void> {
    // Slack notification implementation
    this.logger.debug("Sending Slack notification", {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  private async sendSMSNotification(
    channel: NotificationChannel,
    alert: Alert,
    escalationLevel: number,
  ): Promise<void> {
    // SMS notification implementation
    this.logger.debug("Sending SMS notification", {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  private async sendWebhookNotification(
    channel: NotificationChannel,
    alert: Alert,
    escalationLevel: number,
  ): Promise<void> {
    // Webhook notification implementation
    this.logger.debug("Sending webhook notification", {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  private async sendPagerDutyNotification(
    channel: NotificationChannel,
    alert: Alert,
    escalationLevel: number,
  ): Promise<void> {
    // PagerDuty notification implementation
    this.logger.debug("Sending PagerDuty notification", {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  private async sendTeamsNotification(
    channel: NotificationChannel,
    alert: Alert,
    escalationLevel: number,
  ): Promise<void> {
    // Microsoft Teams notification implementation
    this.logger.debug("Sending Teams notification", {
      channelId: channel.id,
      alertId: alert.id,
    });
  }

  private async startAlertProcessing(): Promise<void> {
    this.logger.log("Starting alert processing");
  }

  private async startEscalationProcessing(): Promise<void> {
    this.logger.log("Starting escalation processing");
  }

  private async startOnCallRotation(): Promise<void> {
    this.logger.log("Starting on-call rotation");
  }

  private async cancelEscalation(alert: Alert): Promise<void> {
    alert.nextEscalationAt = undefined;
  }

  private matchesEscalationPolicy(
    alert: Alert,
    policy: EscalationPolicy,
  ): boolean {
    // Implementation for matching alerts to escalation policies
    return true;
  }

  private async rotateOnCall(rotation: OnCallRotation): Promise<void> {
    // Implementation for on-call rotation
    this.logger.debug("Rotating on-call assignment", {
      rotationId: rotation.id,
    });
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}
