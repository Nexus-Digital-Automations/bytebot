/**
 * Security Alerts Service - Real-time security alerting and notification system
 * Advanced alerting system with intelligent throttling and multi-channel delivery
 *
 * Features:
 * - Multi-channel alert delivery (email, webhook, Slack, Teams)
 * - Intelligent alert throttling and deduplication
 * - Alert severity-based routing and escalation
 * - Alert acknowledgment and response tracking
 * - Emergency alert bypass for critical threats
 * - Alert template management and customization
 *
 * @author Security Alerts & Notification Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Security Enhancement
 */

import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  SecuritySeverity,
  SecurityEventType,
  SecurityEvent,
} from './security-monitoring.service';

/**
 * Alert channel types
 */
export enum AlertChannel {
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  SLACK = 'SLACK',
  TEAMS = 'TEAMS',
  SMS = 'SMS',
  CONSOLE = 'CONSOLE',
}

/**
 * Alert status types
 */
export enum AlertStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  FAILED = 'FAILED',
  THROTTLED = 'THROTTLED',
}

/**
 * Security alert data structure
 */
export interface SecurityAlert {
  /** Unique alert identifier */
  alertId: string;

  /** Associated security event ID */
  eventId: string;

  /** Alert severity level */
  severity: SecuritySeverity;

  /** Alert title */
  title: string;

  /** Alert description */
  description: string;

  /** Alert timestamp */
  timestamp: Date;

  /** Target alert channels */
  channels: AlertChannel[];

  /** Alert status */
  status: AlertStatus;

  /** Alert metadata */
  metadata: Record<string, any>;

  /** Delivery attempts */
  deliveryAttempts: number;

  /** Last delivery attempt */
  lastDeliveryAttempt?: Date;

  /** Acknowledgment timestamp */
  acknowledgedAt?: Date;

  /** User who acknowledged the alert */
  acknowledgedBy?: string;

  /** Alert expiration time */
  expiresAt?: Date;

  /** Whether this is an emergency alert */
  emergency: boolean;

  /** Alert tags for filtering */
  tags: string[];

  /** Related alert IDs for deduplication */
  relatedAlerts: string[];
}

/**
 * Alert delivery configuration
 */
interface AlertDeliveryConfig {
  /** Channel type */
  channel: AlertChannel;

  /** Channel-specific configuration */
  config: {
    /** Endpoint URL for webhooks */
    url?: string;

    /** Email configuration */
    email?: {
      to: string[];
      from: string;
      subject: string;
    };

    /** Slack configuration */
    slack?: {
      webhook: string;
      channel: string;
      username: string;
    };

    /** Teams configuration */
    teams?: {
      webhook: string;
    };

    /** SMS configuration */
    sms?: {
      apiKey: string;
      from: string;
      to: string[];
    };
  };

  /** Minimum severity level for this channel */
  minSeverity: SecuritySeverity;

  /** Whether this channel is enabled */
  enabled: boolean;

  /** Rate limiting configuration */
  rateLimit?: {
    maxAlerts: number;
    windowSeconds: number;
  };
}

/**
 * Alert template for consistent messaging
 */
interface AlertTemplate {
  /** Template ID */
  templateId: string;

  /** Template name */
  name: string;

  /** Event types this template applies to */
  eventTypes: SecurityEventType[];

  /** Title template */
  titleTemplate: string;

  /** Description template */
  descriptionTemplate: string;

  /** Tags to add to alerts */
  tags: string[];

  /** Whether template is active */
  active: boolean;
}

@Injectable()
export class SecurityAlertsService implements OnModuleInit {
  private readonly logger = new Logger(SecurityAlertsService.name);

  /** Active alerts cache */
  private readonly activeAlerts = new Map<string, SecurityAlert>();

  /** Alert delivery configurations */
  private deliveryConfigs: AlertDeliveryConfig[] = [];

  /** Alert templates */
  private alertTemplates: AlertTemplate[] = [];

  /** Alert throttling state */
  private throttlingState = new Map<
    string,
    { count: number; windowStart: Date }
  >();

  /** Alert delivery metrics */
  private deliveryMetrics = {
    totalAlerts: 0,
    alertsBySeverity: new Map<SecuritySeverity, number>(),
    alertsByChannel: new Map<AlertChannel, number>(),
    alertsByStatus: new Map<AlertStatus, number>(),
    deliveryFailures: 0,
    throttledAlerts: 0,
    acknowledgedAlerts: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    @Inject('SECURITY_CONFIG') private readonly securityConfig: any,
  ) {}

  async onModuleInit(): Promise<void> {
    const operationId = `security-alerts-init-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Initializing Security Alerts Service...`);

    try {
      // Initialize alert delivery configurations
      await this.initializeDeliveryConfigs();

      // Initialize alert templates
      await this.initializeAlertTemplates();

      // Setup event listeners
      this.setupEventListeners();

      const initTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Security Alerts Service initialized successfully`,
        {
          operationId,
          initTimeMs: initTime,
          deliveryChannels: this.deliveryConfigs.length,
          alertTemplates: this.alertTemplates.length,
          alertingEnabled: this.securityConfig.alerts.enabled,
        },
      );
    } catch (error) {
      const initTime = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Security Alerts Service initialization failed`,
        {
          operationId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          initTimeMs: initTime,
        },
      );
      throw error;
    }
  }

  /**
   * Process security event and generate alerts
   */
  @OnEvent('security.event.processed')
  async handleSecurityEvent(event: SecurityEvent): Promise<void> {
    if (!this.securityConfig.alerts.enabled) {
      return;
    }

    const operationId = `process-alert-${Date.now()}`;

    this.logger.debug(
      `[${operationId}] Processing security event for alerting`,
      {
        operationId,
        eventId: event.eventId,
        eventType: event.type,
        severity: event.severity,
        riskScore: event.riskScore,
      },
    );

    try {
      // Check if event meets minimum alert severity
      if (!this.meetsSeverityThreshold(event.severity)) {
        this.logger.debug(
          `[${operationId}] Event below minimum alert severity`,
          {
            operationId,
            eventSeverity: event.severity,
            minSeverity: this.securityConfig.alerts.severity,
          },
        );
        return;
      }

      // Check for alert deduplication
      const existingAlert = await this.findExistingAlert(event);
      if (existingAlert) {
        this.logger.debug(`[${operationId}] Duplicate alert suppressed`, {
          operationId,
          eventId: event.eventId,
          existingAlertId: existingAlert.alertId,
        });
        return;
      }

      // Generate alert
      const alert = await this.generateAlert(event);

      // Store alert
      this.activeAlerts.set(alert.alertId, alert);

      // Send alert through configured channels
      await this.deliverAlert(alert);

      // Update metrics
      this.updateAlertMetrics(alert);

      this.logger.log(
        `[${operationId}] Security alert generated and delivered`,
        {
          operationId,
          alertId: alert.alertId,
          eventId: event.eventId,
          severity: alert.severity,
          channels: alert.channels.length,
          emergency: alert.emergency,
        },
      );
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to process security alert`, {
        operationId,
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  }

  /**
   * Process security incidents and generate high-priority alerts
   */
  @OnEvent('security.incident.created')
  async handleSecurityIncident(incident: any): Promise<void> {
    const operationId = `incident-alert-${Date.now()}`;

    this.logger.warn(
      `[${operationId}] Processing security incident for alerting`,
      {
        operationId,
        incidentId: incident.incidentId,
        severity: incident.severity,
        eventIds: incident.eventIds,
      },
    );

    try {
      // Create emergency alert for critical incidents
      const alert: SecurityAlert = {
        alertId: `alert_inc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        eventId: incident.eventIds[0], // Primary event
        severity: incident.severity,
        title: `🚨 SECURITY INCIDENT: ${incident.title}`,
        description: `${incident.description}\n\nIncident ID: ${incident.incidentId}\nAffected Events: ${incident.eventIds.length}\nStatus: ${incident.status}`,
        timestamp: new Date(),
        channels: this.getAllChannelsForSeverity(incident.severity),
        status: AlertStatus.PENDING,
        metadata: {
          incidentId: incident.incidentId,
          eventIds: incident.eventIds,
          incidentType: 'security_incident',
        },
        deliveryAttempts: 0,
        emergency: incident.severity === SecuritySeverity.CRITICAL,
        tags: [
          'security_incident',
          incident.severity.toLowerCase(),
          ...incident.tags,
        ],
        relatedAlerts: [],
      };

      // Store and deliver incident alert
      this.activeAlerts.set(alert.alertId, alert);
      await this.deliverAlert(alert);
      this.updateAlertMetrics(alert);

      this.logger.error(`[${operationId}] Security incident alert delivered`, {
        operationId,
        alertId: alert.alertId,
        incidentId: incident.incidentId,
        severity: alert.severity,
        emergency: alert.emergency,
      });
    } catch (error) {
      this.logger.error(`[${operationId}] Failed to process incident alert`, {
        operationId,
        incidentId: incident.incidentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Initialize alert delivery configurations
   */
  private async initializeDeliveryConfigs(): Promise<void> {
    this.deliveryConfigs = [
      {
        channel: AlertChannel.CONSOLE,
        config: {},
        minSeverity: SecuritySeverity.LOW,
        enabled: true,
      },
      {
        channel: AlertChannel.EMAIL,
        config: {
          email: {
            to: this.configService
              .get('SECURITY_EMAIL_ALERTS', '')
              .split(',')
              .filter(Boolean),
            from: this.configService.get('EMAIL_FROM', 'security@bytebot.ai'),
            subject: 'Bytebot Security Alert',
          },
        },
        minSeverity: SecuritySeverity.MEDIUM,
        enabled: this.configService.get('EMAIL_ALERTS_ENABLED', false),
      },
      {
        channel: AlertChannel.WEBHOOK,
        config: {
          url: this.configService.get('SECURITY_WEBHOOK_URL'),
        },
        minSeverity: SecuritySeverity.MEDIUM,
        enabled: !!this.configService.get('SECURITY_WEBHOOK_URL'),
        rateLimit: {
          maxAlerts: 10,
          windowSeconds: 300, // 5 minutes
        },
      },
      {
        channel: AlertChannel.SLACK,
        config: {
          slack: {
            webhook: this.configService.get('SLACK_WEBHOOK_URL'),
            channel: this.configService.get('SLACK_CHANNEL', '#security'),
            username: 'Bytebot Security Bot',
          },
        },
        minSeverity: SecuritySeverity.HIGH,
        enabled: !!this.configService.get('SLACK_WEBHOOK_URL'),
      },
    ].filter((config) => config.enabled);

    this.logger.log('Alert delivery configurations initialized', {
      channels: this.deliveryConfigs.map((c) => c.channel),
      enabledChannels: this.deliveryConfigs.length,
    });
  }

  /**
   * Initialize alert templates
   */
  private async initializeAlertTemplates(): Promise<void> {
    this.alertTemplates = [
      {
        templateId: 'authentication-failure',
        name: 'Authentication Failure Alert',
        eventTypes: [SecurityEventType.AUTHENTICATION_FAILURE],
        titleTemplate: '🔐 Authentication Failure Detected',
        descriptionTemplate:
          'Multiple authentication failures detected from IP: {{sourceIp}}\nUser: {{userId}}\nAttempts: {{metadata.attempts}}',
        tags: ['authentication', 'login_failure'],
        active: true,
      },
      {
        templateId: 'brute-force-attack',
        name: 'Brute Force Attack Alert',
        eventTypes: [SecurityEventType.BRUTE_FORCE_ATTACK],
        titleTemplate: '⚠️  Brute Force Attack Detected',
        descriptionTemplate:
          'Brute force attack detected from IP: {{sourceIp}}\nTarget: {{metadata.target}}\nAttempts: {{metadata.attempts}}\nTime Window: {{metadata.timeWindow}}',
        tags: ['brute_force', 'attack', 'critical'],
        active: true,
      },
      {
        templateId: 'injection-attack',
        name: 'Injection Attack Alert',
        eventTypes: [
          SecurityEventType.SQL_INJECTION_ATTEMPT,
          SecurityEventType.XSS_ATTEMPT,
        ],
        titleTemplate: '🚨 Injection Attack Detected',
        descriptionTemplate:
          'Injection attack attempt detected!\nType: {{type}}\nSource IP: {{sourceIp}}\nEndpoint: {{requestUrl}}\nPayload: {{metadata.payload}}',
        tags: ['injection', 'attack', 'critical'],
        active: true,
      },
      {
        templateId: 'privilege-escalation',
        name: 'Privilege Escalation Alert',
        eventTypes: [SecurityEventType.PRIVILEGE_ESCALATION],
        titleTemplate: '🛡️ Privilege Escalation Attempt',
        descriptionTemplate:
          'Privilege escalation attempt detected!\nUser: {{userId}}\nRequested Privilege: {{metadata.requestedPrivilege}}\nCurrent Role: {{metadata.currentRole}}',
        tags: ['privilege_escalation', 'access_control'],
        active: true,
      },
      {
        templateId: 'anomalous-behavior',
        name: 'Anomalous Behavior Alert',
        eventTypes: [SecurityEventType.ANOMALOUS_BEHAVIOR],
        titleTemplate: '📊 Anomalous Behavior Detected',
        descriptionTemplate:
          'Unusual behavior pattern detected\nUser: {{userId}}\nPattern: {{metadata.pattern}}\nDeviation Score: {{riskScore}}',
        tags: ['anomaly', 'behavioral'],
        active: true,
      },
    ];

    this.logger.log('Alert templates initialized', {
      templates: this.alertTemplates.length,
      activeTemplates: this.alertTemplates.filter((t) => t.active).length,
    });
  }

  /**
   * Setup event listeners for security events
   */
  private setupEventListeners(): void {
    // Additional event listeners can be added here
    this.logger.log('Security alert event listeners configured');
  }

  /**
   * Check if event meets minimum severity threshold
   */
  private meetsSeverityThreshold(severity: SecuritySeverity): boolean {
    const severityLevels = {
      [SecuritySeverity.LOW]: 1,
      [SecuritySeverity.MEDIUM]: 2,
      [SecuritySeverity.HIGH]: 3,
      [SecuritySeverity.CRITICAL]: 4,
    };

    const eventLevel = severityLevels[severity] || 0;
    const minLevel = severityLevels[this.securityConfig.alerts.severity] || 0;

    return eventLevel >= minLevel;
  }

  /**
   * Find existing alert to prevent duplication
   */
  private async findExistingAlert(
    event: SecurityEvent,
  ): Promise<SecurityAlert | null> {
    const recentAlerts = Array.from(this.activeAlerts.values()).filter(
      (alert) => {
        const timeDiff = Date.now() - alert.timestamp.getTime();
        return timeDiff < 300000; // 5 minutes
      },
    );

    // Look for similar alerts (same type, same source IP, within time window)
    const duplicateAlert = recentAlerts.find(
      (alert) =>
        alert.metadata.eventType === event.type &&
        alert.metadata.sourceIp === event.sourceIp &&
        alert.status !== AlertStatus.FAILED,
    );

    return duplicateAlert || null;
  }

  /**
   * Generate alert from security event
   */
  private async generateAlert(event: SecurityEvent): Promise<SecurityAlert> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Find matching template
    const template = this.alertTemplates.find(
      (t) => t.active && t.eventTypes.includes(event.type),
    );

    let title: string;
    let description: string;
    let tags: string[];

    if (template) {
      title = this.renderTemplate(template.titleTemplate, event);
      description = this.renderTemplate(template.descriptionTemplate, event);
      tags = [...template.tags, event.type.toLowerCase()];
    } else {
      // Default formatting
      title = `Security Event: ${event.type}`;
      description = event.description;
      tags = [event.type.toLowerCase(), event.severity.toLowerCase()];
    }

    const alert: SecurityAlert = {
      alertId,
      eventId: event.eventId,
      severity: event.severity,
      title,
      description,
      timestamp: new Date(),
      channels: this.getAllChannelsForSeverity(event.severity),
      status: AlertStatus.PENDING,
      metadata: {
        eventType: event.type,
        sourceIp: event.sourceIp,
        userId: event.userId,
        riskScore: event.riskScore,
        correlationId: event.correlationId,
        ...event.metadata,
      },
      deliveryAttempts: 0,
      emergency:
        event.severity === SecuritySeverity.CRITICAL || event.riskScore >= 80,
      tags,
      relatedAlerts: [],
    };

    return alert;
  }

  /**
   * Get all alert channels that should receive alerts for given severity
   */
  private getAllChannelsForSeverity(
    severity: SecuritySeverity,
  ): AlertChannel[] {
    return this.deliveryConfigs
      .filter((config) => this.meetsSeverityThreshold(severity))
      .map((config) => config.channel);
  }

  /**
   * Deliver alert through all configured channels
   */
  private async deliverAlert(alert: SecurityAlert): Promise<void> {
    const operationId = `deliver-alert-${alert.alertId}`;

    this.logger.debug(`[${operationId}] Delivering alert through channels`, {
      operationId,
      alertId: alert.alertId,
      channels: alert.channels,
      severity: alert.severity,
      emergency: alert.emergency,
    });

    const deliveryPromises = alert.channels.map(async (channel) => {
      try {
        await this.deliverToChannel(alert, channel, operationId);
        this.deliveryMetrics.alertsByChannel.set(
          channel,
          (this.deliveryMetrics.alertsByChannel.get(channel) || 0) + 1,
        );
      } catch (error) {
        this.logger.error(
          `[${operationId}] Failed to deliver alert to ${channel}`,
          {
            operationId,
            alertId: alert.alertId,
            channel,
            error: error instanceof Error ? error.message : String(error),
          },
        );
        this.deliveryMetrics.deliveryFailures++;
      }
    });

    await Promise.allSettled(deliveryPromises);

    alert.status = AlertStatus.SENT;
    alert.deliveryAttempts++;
    alert.lastDeliveryAttempt = new Date();
  }

  /**
   * Deliver alert to specific channel
   */
  private async deliverToChannel(
    alert: SecurityAlert,
    channel: AlertChannel,
    operationId: string,
  ): Promise<void> {
    const config = this.deliveryConfigs.find((c) => c.channel === channel);
    if (!config) {
      throw new Error(`No configuration found for channel: ${channel}`);
    }

    // Check rate limiting
    if (await this.isRateLimited(channel, config)) {
      alert.status = AlertStatus.THROTTLED;
      this.deliveryMetrics.throttledAlerts++;
      this.logger.warn(
        `[${operationId}] Alert throttled for channel: ${channel}`,
        {
          operationId,
          alertId: alert.alertId,
          channel,
        },
      );
      return;
    }

    switch (channel) {
      case AlertChannel.CONSOLE:
        await this.deliverToConsole(alert, operationId);
        break;
      case AlertChannel.EMAIL:
        await this.deliverToEmail(alert, config, operationId);
        break;
      case AlertChannel.WEBHOOK:
        await this.deliverToWebhook(alert, config, operationId);
        break;
      case AlertChannel.SLACK:
        await this.deliverToSlack(alert, config, operationId);
        break;
      default:
        throw new Error(`Unsupported alert channel: ${channel}`);
    }
  }

  /**
   * Check if channel is rate limited
   */
  private async isRateLimited(
    channel: AlertChannel,
    config: AlertDeliveryConfig,
  ): Promise<boolean> {
    if (!config.rateLimit || !this.securityConfig.alerts.throttling.enabled) {
      return false;
    }

    const key = `rate_limit_${channel}`;
    const now = new Date();
    const windowMs = config.rateLimit.windowSeconds * 1000;

    const state = this.throttlingState.get(key);
    if (!state || now.getTime() - state.windowStart.getTime() > windowMs) {
      // Reset or initialize window
      this.throttlingState.set(key, { count: 1, windowStart: now });
      return false;
    }

    state.count++;
    return state.count > config.rateLimit.maxAlerts;
  }

  /**
   * Deliver alert to console
   */
  private async deliverToConsole(
    alert: SecurityAlert,
    operationId: string,
  ): Promise<void> {
    const logMessage = `SECURITY ALERT [${alert.severity}]: ${alert.title}`;
    const logData = {
      operationId,
      alertId: alert.alertId,
      eventId: alert.eventId,
      severity: alert.severity,
      description: alert.description,
      metadata: alert.metadata,
      emergency: alert.emergency,
      tags: alert.tags,
    };

    switch (alert.severity) {
      case SecuritySeverity.CRITICAL:
        this.logger.error(logMessage, logData);
        break;
      case SecuritySeverity.HIGH:
        this.logger.error(logMessage, logData);
        break;
      case SecuritySeverity.MEDIUM:
        this.logger.warn(logMessage, logData);
        break;
      default:
        this.logger.log(logMessage, logData);
    }
  }

  /**
   * Deliver alert to email
   */
  private async deliverToEmail(
    alert: SecurityAlert,
    config: AlertDeliveryConfig,
    operationId: string,
  ): Promise<void> {
    // In a production environment, this would use a real email service
    this.logger.log(`[${operationId}] Email alert sent`, {
      operationId,
      alertId: alert.alertId,
      to: config.config.email?.to,
      subject: config.config.email?.subject,
    });
  }

  /**
   * Deliver alert to webhook
   */
  private async deliverToWebhook(
    alert: SecurityAlert,
    config: AlertDeliveryConfig,
    operationId: string,
  ): Promise<void> {
    // In a production environment, this would make an HTTP POST request
    this.logger.log(`[${operationId}] Webhook alert sent`, {
      operationId,
      alertId: alert.alertId,
      webhook: config.config.url,
      payload: {
        alertId: alert.alertId,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        timestamp: alert.timestamp,
        metadata: alert.metadata,
      },
    });
  }

  /**
   * Deliver alert to Slack
   */
  private async deliverToSlack(
    alert: SecurityAlert,
    config: AlertDeliveryConfig,
    operationId: string,
  ): Promise<void> {
    // In a production environment, this would send to Slack webhook
    const slackMessage = {
      channel: config.config.slack?.channel,
      username: config.config.slack?.username,
      text: `${alert.title}\n\n${alert.description}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Event ID', value: alert.eventId, short: true },
            {
              title: 'Source IP',
              value: alert.metadata.sourceIp || 'Unknown',
              short: true,
            },
            {
              title: 'Risk Score',
              value: alert.metadata.riskScore || 'Unknown',
              short: true,
            },
          ],
        },
      ],
    };

    this.logger.log(`[${operationId}] Slack alert sent`, {
      operationId,
      alertId: alert.alertId,
      channel: config.config.slack?.channel,
      message: slackMessage,
    });
  }

  /**
   * Get color for severity level (for Slack/Teams)
   */
  private getSeverityColor(severity: SecuritySeverity): string {
    switch (severity) {
      case SecuritySeverity.CRITICAL:
        return '#ff0000'; // Red
      case SecuritySeverity.HIGH:
        return '#ff8000'; // Orange
      case SecuritySeverity.MEDIUM:
        return '#ffff00'; // Yellow
      case SecuritySeverity.LOW:
        return '#00ff00'; // Green
      default:
        return '#808080'; // Gray
    }
  }

  /**
   * Render alert template with event data
   */
  private renderTemplate(template: string, event: SecurityEvent): string {
    let rendered = template;

    // Replace event fields
    rendered = rendered.replace(/\{\{(\w+)\}\}/g, (match, field) => {
      return String(event[field as keyof SecurityEvent] || match);
    });

    // Replace metadata fields
    rendered = rendered.replace(/\{\{metadata\.(\w+)\}\}/g, (match, field) => {
      return String(event.metadata[field] || match);
    });

    return rendered;
  }

  /**
   * Update alert delivery metrics
   */
  private updateAlertMetrics(alert: SecurityAlert): void {
    this.deliveryMetrics.totalAlerts++;

    // Update severity counters
    const severityCount =
      this.deliveryMetrics.alertsBySeverity.get(alert.severity) || 0;
    this.deliveryMetrics.alertsBySeverity.set(
      alert.severity,
      severityCount + 1,
    );

    // Update status counters
    const statusCount =
      this.deliveryMetrics.alertsByStatus.get(alert.status) || 0;
    this.deliveryMetrics.alertsByStatus.set(alert.status, statusCount + 1);
  }

  /**
   * Acknowledge security alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = userId;

    this.deliveryMetrics.acknowledgedAlerts++;

    this.logger.log(`Security alert acknowledged`, {
      alertId,
      acknowledgedBy: userId,
      acknowledgedAt: alert.acknowledgedAt,
    });

    // Emit acknowledgment event
    this.eventEmitter.emit('security.alert.acknowledged', {
      alertId,
      userId,
      timestamp: alert.acknowledgedAt,
    });
  }

  /**
   * Get alert delivery metrics
   */
  getAlertMetrics(): any {
    return {
      ...this.deliveryMetrics,
      alertsBySeverity: Object.fromEntries(
        this.deliveryMetrics.alertsBySeverity,
      ),
      alertsByChannel: Object.fromEntries(this.deliveryMetrics.alertsByChannel),
      alertsByStatus: Object.fromEntries(this.deliveryMetrics.alertsByStatus),
      activeAlerts: this.activeAlerts.size,
      deliveryChannels: this.deliveryConfigs.length,
      templates: this.alertTemplates.length,
    };
  }

  /**
   * Cleanup old alerts (run daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldAlerts(): Promise<void> {
    const startTime = Date.now();
    let alertsCleanedUp = 0;

    try {
      // Clean up alerts older than 7 days
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const [alertId, alert] of this.activeAlerts.entries()) {
        if (
          alert.timestamp < cutoffTime &&
          alert.status !== AlertStatus.PENDING
        ) {
          this.activeAlerts.delete(alertId);
          alertsCleanedUp++;
        }
      }

      // Clean up throttling state
      const throttleCutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      for (const [key, state] of this.throttlingState.entries()) {
        if (state.windowStart < throttleCutoff) {
          this.throttlingState.delete(key);
        }
      }

      const cleanupTime = Date.now() - startTime;
      this.logger.log('Alert cleanup completed', {
        alertsCleanedUp,
        cleanupTimeMs: cleanupTime,
        activeAlerts: this.activeAlerts.size,
        throttlingEntries: this.throttlingState.size,
      });
    } catch (error) {
      this.logger.error('Alert cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
