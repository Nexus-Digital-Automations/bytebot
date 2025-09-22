import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Comprehensive Security Alerts Service
 *
 * Features:
 * - Multi-channel alert delivery (email, SMS, Slack, PagerDuty)
 * - Alert severity-based escalation
 * - Alert suppression and deduplication
 * - Alert templates and customization
 * - Alert analytics and reporting
 * - Integration with external services
 * - Alert acknowledgment and resolution tracking
 * - Automated alert correlation and grouping
 */

export interface SecurityAlert {
  id: string;
  timestamp: number;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  source: string;
  correlationId?: string;
  data: Record<string, any>;
  channels: string[];
  status: 'pending' | 'sent' | 'acknowledged' | 'resolved' | 'suppressed';
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolvedBy?: string;
  resolvedAt?: number;
  escalated: boolean;
  escalatedAt?: number;
  escalationLevel: number;
  suppressedUntil?: number;
  retryCount: number;
  deliveryAttempts: Array<{
    channel: string;
    timestamp: number;
    success: boolean;
    error?: string;
  }>;
  tags: string[];
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    eventType?: string;
    severity?: string[];
    source?: string[];
    tags?: string[];
    frequency?: {
      count: number;
      timeWindow: number;
    };
    customLogic?: string;
  };
  actions: {
    channels: string[];
    template?: string;
    escalation?: {
      enabled: boolean;
      levels: Array<{
        delay: number;
        channels: string[];
      }>;
    };
    suppression?: {
      enabled: boolean;
      duration: number;
      conditions: Record<string, any>;
    };
  };
  priority: number;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface AlertChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'pagerduty' | 'teams' | 'discord';
  enabled: boolean;
  config: Record<string, any>;
  rateLimit?: {
    maxPerHour: number;
    maxPerDay: number;
  };
  failureHandling: {
    retryCount: number;
    retryDelay: number;
    fallbackChannel?: string;
  };
  filters?: {
    severities: string[];
    types: string[];
    sources: string[];
  };
}

export interface AlertTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject: string;
  body: string;
  variables: string[];
  formatting: {
    html: boolean;
    markdown: boolean;
    emoji: boolean;
  };
}

@Injectable()
export class SecurityAlertsService {
  private readonly logger = new Logger(SecurityAlertsService.name);

  // Alert storage
  private alerts: SecurityAlert[] = [];
  private alertRules: AlertRule[] = [];
  private channels: AlertChannel[] = [];
  private templates: AlertTemplate[] = [];

  // Alert suppression and deduplication
  private suppressedAlerts = new Map<string, number>();
  private alertCounts = new Map<string, { count: number; firstSeen: number }>();

  // Configuration
  private config = {
    alertRetentionDays: 90,
    maxRetryAttempts: 3,
    defaultEscalationDelay: 300000, // 5 minutes
    defaultSuppressionDuration: 3600000, // 1 hour
    enableDeduplication: true,
    enableAutoResolution: true
  };

  constructor(private readonly configService: ConfigService) {
    this.loadConfiguration();
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
    this.initializeDefaultTemplates();
    this.startAlertProcessing();
  }

  /**
   * Create a new security alert
   */
  async createAlert(alertData: {
    type: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    title: string;
    description: string;
    source: string;
    correlationId?: string;
    data?: Record<string, any>;
    tags?: string[];
  }): Promise<SecurityAlert> {

    const alert: SecurityAlert = {
      id: this.generateAlertId(),
      timestamp: Date.now(),
      channels: [],
      status: 'pending',
      escalated: false,
      escalationLevel: 0,
      retryCount: 0,
      deliveryAttempts: [],
      tags: alertData.tags || [],
      ...alertData,
      data: alertData.data || {}
    };

    // Check for suppression
    if (this.isAlertSuppressed(alert)) {
      alert.status = 'suppressed';
      this.alerts.push(alert);
      this.logger.debug('Alert suppressed', { alertId: alert.id, type: alert.type });
      return alert;
    }

    // Check for deduplication
    if (this.config.enableDeduplication && this.isDuplicateAlert(alert)) {
      this.logger.debug('Duplicate alert detected, updating existing', { alertId: alert.id });
      return this.updateExistingAlert(alert);
    }

    // Apply alert rules to determine channels and actions
    this.applyAlertRules(alert);

    // Add to alerts collection
    this.alerts.push(alert);

    // Process alert immediately
    await this.processAlert(alert);

    this.logger.log('Security alert created', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      channels: alert.channels.length
    });

    return alert;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = Date.now();

    this.logger.log('Alert acknowledged', { alertId, acknowledgedBy });
    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy: string, notes?: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = Date.now();

    if (notes) {
      alert.data.resolutionNotes = notes;
    }

    this.logger.log('Alert resolved', { alertId, resolvedBy });
    return true;
  }

  /**
   * Get alerts with filtering and pagination
   */
  getAlerts(options: {
    status?: string;
    severity?: string;
    type?: string;
    source?: string;
    timeRange?: { start: number; end: number };
    limit?: number;
    offset?: number;
  } = {}): { alerts: SecurityAlert[]; total: number } {

    let filteredAlerts = [...this.alerts];

    // Apply filters
    if (options.status) {
      filteredAlerts = filteredAlerts.filter(a => a.status === options.status);
    }

    if (options.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === options.severity);
    }

    if (options.type) {
      filteredAlerts = filteredAlerts.filter(a => a.type === options.type);
    }

    if (options.source) {
      filteredAlerts = filteredAlerts.filter(a => a.source === options.source);
    }

    if (options.timeRange) {
      filteredAlerts = filteredAlerts.filter(
        a => a.timestamp >= options.timeRange!.start && a.timestamp <= options.timeRange!.end
      );
    }

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp - a.timestamp);

    const total = filteredAlerts.length;

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    const paginatedAlerts = filteredAlerts.slice(offset, offset + limit);

    return { alerts: paginatedAlerts, total };
  }

  /**
   * Get alert statistics
   */
  getAlertStatistics(timeRange?: { start: number; end: number }): {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
    escalated: number;
    suppressed: number;
    averageResolutionTime: number;
  } {

    let alerts = [...this.alerts];

    if (timeRange) {
      alerts = alerts.filter(
        a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    const stats = {
      total: alerts.length,
      bySeverity: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byChannel: {} as Record<string, number>,
      escalated: 0,
      suppressed: 0,
      averageResolutionTime: 0
    };

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const alert of alerts) {
      // Count by severity
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;

      // Count by type
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;

      // Count by status
      stats.byStatus[alert.status] = (stats.byStatus[alert.status] || 0) + 1;

      // Count by channels
      for (const channel of alert.channels) {
        stats.byChannel[channel] = (stats.byChannel[channel] || 0) + 1;
      }

      // Count escalated
      if (alert.escalated) {
        stats.escalated++;
      }

      // Count suppressed
      if (alert.status === 'suppressed') {
        stats.suppressed++;
      }

      // Calculate resolution time
      if (alert.status === 'resolved' && alert.resolvedAt) {
        totalResolutionTime += alert.resolvedAt - alert.timestamp;
        resolvedCount++;
      }
    }

    if (resolvedCount > 0) {
      stats.averageResolutionTime = totalResolutionTime / resolvedCount;
    }

    return stats;
  }

  /**
   * Create or update alert rule
   */
  createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const alertRule: AlertRule = {
      id: this.generateRuleId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...rule
    };

    this.alertRules.push(alertRule);
    this.logger.log('Alert rule created', { ruleId: alertRule.id, name: alertRule.name });

    return alertRule;
  }

  /**
   * Create or update alert channel
   */
  createAlertChannel(channel: Omit<AlertChannel, 'id'>): AlertChannel {
    const alertChannel: AlertChannel = {
      id: this.generateChannelId(),
      ...channel
    };

    this.channels.push(alertChannel);
    this.logger.log('Alert channel created', { channelId: alertChannel.id, name: alertChannel.name });

    return alertChannel;
  }

  /**
   * Test alert channel
   */
  async testAlertChannel(channelId: string): Promise<boolean> {
    const channel = this.channels.find(c => c.id === channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const testAlert: SecurityAlert = {
      id: 'test_alert',
      timestamp: Date.now(),
      type: 'test',
      severity: 'info',
      title: 'Test Alert',
      description: 'This is a test alert to verify channel configuration',
      source: 'alert_service',
      channels: [channelId],
      status: 'pending',
      escalated: false,
      escalationLevel: 0,
      retryCount: 0,
      deliveryAttempts: [],
      tags: ['test'],
      data: {}
    };

    try {
      await this.sendAlert(testAlert, channel);
      this.logger.log('Alert channel test successful', { channelId, name: channel.name });
      return true;
    } catch (error) {
      this.logger.error('Alert channel test failed', error, { channelId, name: channel.name });
      return false;
    }
  }

  /**
   * Process alert - send to configured channels
   */
  private async processAlert(alert: SecurityAlert): Promise<void> {
    if (alert.channels.length === 0) {
      this.logger.warn('No channels configured for alert', { alertId: alert.id });
      return;
    }

    for (const channelId of alert.channels) {
      const channel = this.channels.find(c => c.id === channelId && c.enabled);
      if (!channel) {
        this.logger.warn('Channel not found or disabled', { channelId, alertId: alert.id });
        continue;
      }

      try {
        await this.sendAlert(alert, channel);
        alert.status = 'sent';

        alert.deliveryAttempts.push({
          channel: channelId,
          timestamp: Date.now(),
          success: true
        });

      } catch (error) {
        this.logger.error('Failed to send alert', error, { channelId, alertId: alert.id });

        alert.deliveryAttempts.push({
          channel: channelId,
          timestamp: Date.now(),
          success: false,
          error: error.message
        });

        // Schedule retry if under retry limit
        if (alert.retryCount < this.config.maxRetryAttempts) {
          this.scheduleRetry(alert, channel);
        }
      }
    }

    // Start escalation timer if configured
    this.startEscalationTimer(alert);
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlert(alert: SecurityAlert, channel: AlertChannel): Promise<void> {
    const template = this.getTemplate(alert.type, channel.type);
    const message = this.formatMessage(alert, template);

    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(alert, channel, message);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, channel, message);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, channel, message);
        break;
      case 'sms':
        await this.sendSMSAlert(alert, channel, message);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert, channel, message);
        break;
      case 'teams':
        await this.sendTeamsAlert(alert, channel, message);
        break;
      case 'discord':
        await this.sendDiscordAlert(alert, channel, message);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Apply alert rules to determine channels and actions
   */
  private applyAlertRules(alert: SecurityAlert): void {
    const applicableRules = this.alertRules
      .filter(rule => rule.enabled && this.ruleMatches(rule, alert))
      .sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      // Add channels
      alert.channels.push(...rule.actions.channels);

      // Apply suppression if configured
      if (rule.actions.suppression?.enabled) {
        const suppressionKey = this.generateSuppressionKey(alert, rule);
        this.suppressedAlerts.set(suppressionKey, Date.now() + rule.actions.suppression.duration);
      }
    }

    // Remove duplicate channels
    alert.channels = [...new Set(alert.channels)];
  }

  /**
   * Check if alert rule matches current alert
   */
  private ruleMatches(rule: AlertRule, alert: SecurityAlert): boolean {
    const { conditions } = rule;

    // Check event type
    if (conditions.eventType && conditions.eventType !== alert.type) {
      return false;
    }

    // Check severity
    if (conditions.severity && !conditions.severity.includes(alert.severity)) {
      return false;
    }

    // Check source
    if (conditions.source && !conditions.source.includes(alert.source)) {
      return false;
    }

    // Check tags
    if (conditions.tags && !conditions.tags.some(tag => alert.tags.includes(tag))) {
      return false;
    }

    // Check frequency conditions
    if (conditions.frequency) {
      const key = `${alert.type}_${alert.source}`;
      const count = this.alertCounts.get(key);

      if (!count || count.count < conditions.frequency.count) {
        return false;
      }

      const timeWindow = Date.now() - conditions.frequency.timeWindow;
      if (count.firstSeen < timeWindow) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if alert should be suppressed
   */
  private isAlertSuppressed(alert: SecurityAlert): boolean {
    for (const [key, until] of this.suppressedAlerts.entries()) {
      if (Date.now() < until && key.includes(alert.type)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if alert is duplicate
   */
  private isDuplicateAlert(alert: SecurityAlert): boolean {
    const recentAlerts = this.alerts.filter(
      a => a.timestamp > Date.now() - 300000 && // Last 5 minutes
           a.type === alert.type &&
           a.source === alert.source &&
           a.status !== 'resolved'
    );

    return recentAlerts.length > 0;
  }

  /**
   * Update existing alert instead of creating duplicate
   */
  private updateExistingAlert(alert: SecurityAlert): SecurityAlert {
    const existing = this.alerts.find(
      a => a.type === alert.type &&
           a.source === alert.source &&
           a.status !== 'resolved' &&
           a.timestamp > Date.now() - 300000
    );

    if (existing) {
      existing.timestamp = alert.timestamp;
      existing.description = alert.description;
      existing.data = { ...existing.data, ...alert.data };
      return existing;
    }

    return alert;
  }

  /**
   * Format alert message using template
   */
  private formatMessage(alert: SecurityAlert, template: AlertTemplate): any {
    let subject = template.subject;
    let body = template.body;

    // Replace variables
    const variables = {
      id: alert.id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      description: alert.description,
      source: alert.source,
      timestamp: new Date(alert.timestamp).toISOString(),
      ...alert.data
    };

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, String(value));
      body = body.replace(regex, String(value));
    }

    return { subject, body, ...template.formatting };
  }

  /**
   * Get template for alert type and channel
   */
  private getTemplate(alertType: string, channelType: string): AlertTemplate {
    const template = this.templates.find(
      t => t.type === alertType && t.channel === channelType
    );

    if (template) {
      return template;
    }

    // Return default template
    return this.getDefaultTemplate(channelType);
  }

  /**
   * Get default template for channel type
   */
  private getDefaultTemplate(channelType: string): AlertTemplate {
    return {
      id: 'default',
      name: 'Default Template',
      type: 'default',
      channel: channelType,
      subject: 'Security Alert: {{title}}',
      body: `
Alert ID: {{id}}
Type: {{type}}
Severity: {{severity}}
Source: {{source}}
Time: {{timestamp}}

Description:
{{description}}
      `.trim(),
      variables: ['id', 'type', 'severity', 'title', 'description', 'source', 'timestamp'],
      formatting: {
        html: false,
        markdown: false,
        emoji: false
      }
    };
  }

  // Channel-specific alert sending methods (simplified implementations)
  private async sendEmailAlert(alert: SecurityAlert, channel: AlertChannel, message: any): Promise<void> {
    this.logger.debug('Sending email alert', { alertId: alert.id, channel: channel.name });
    // Implementation would use nodemailer or similar
  }

  private async sendSlackAlert(alert: SecurityAlert, channel: AlertChannel, message: any): Promise<void> {
    this.logger.debug('Sending Slack alert', { alertId: alert.id, channel: channel.name });
    // Implementation would use Slack Web API
  }

  private async sendWebhookAlert(alert: SecurityAlert, channel: AlertChannel, message: any): Promise<void> {
    this.logger.debug('Sending webhook alert', { alertId: alert.id, channel: channel.name });
    // Implementation would use HTTP client
  }

  private async sendSMSAlert(alert: SecurityAlert, channel: AlertChannel, message: any): Promise<void> {
    this.logger.debug('Sending SMS alert', { alertId: alert.id, channel: channel.name });
    // Implementation would use Twilio or similar
  }

  private async sendPagerDutyAlert(alert: SecurityAlert, channel: AlertChannel, message: any): Promise<void> {
    this.logger.debug('Sending PagerDuty alert', { alertId: alert.id, channel: channel.name });
    // Implementation would use PagerDuty API
  }

  private async sendTeamsAlert(alert: SecurityAlert, channel: AlertChannel, message: any): Promise<void> {
    this.logger.debug('Sending Teams alert', { alertId: alert.id, channel: channel.name });
    // Implementation would use Teams webhook
  }

  private async sendDiscordAlert(alert: SecurityAlert, channel: AlertChannel, message: any): Promise<void> {
    this.logger.debug('Sending Discord alert', { alertId: alert.id, channel: channel.name });
    // Implementation would use Discord webhook
  }

  /**
   * Schedule alert retry
   */
  private scheduleRetry(alert: SecurityAlert, channel: AlertChannel): void {
    const delay = channel.failureHandling.retryDelay * Math.pow(2, alert.retryCount);

    setTimeout(async () => {
      alert.retryCount++;
      try {
        await this.sendAlert(alert, channel);
      } catch (error) {
        this.logger.error('Alert retry failed', error, { alertId: alert.id, channel: channel.id });
      }
    }, delay);
  }

  /**
   * Start escalation timer
   */
  private startEscalationTimer(alert: SecurityAlert): void {
    const rule = this.alertRules.find(r =>
      r.enabled &&
      r.actions.escalation?.enabled &&
      this.ruleMatches(r, alert)
    );

    if (!rule?.actions.escalation) {
      return;
    }

    const escalation = rule.actions.escalation;

    for (let level = 0; level < escalation.levels.length; level++) {
      const escalationLevel = escalation.levels[level];

      setTimeout(async () => {
        if (alert.status === 'resolved' || alert.status === 'acknowledged') {
          return; // Don't escalate if already handled
        }

        alert.escalated = true;
        alert.escalationLevel = level + 1;
        alert.escalatedAt = Date.now();

        // Send escalation alerts
        for (const channelId of escalationLevel.channels) {
          const channel = this.channels.find(c => c.id === channelId && c.enabled);
          if (channel) {
            try {
              await this.sendAlert(alert, channel);
            } catch (error) {
              this.logger.error('Escalation alert failed', error, { alertId: alert.id, level });
            }
          }
        }

        this.logger.warn('Alert escalated', {
          alertId: alert.id,
          level: level + 1,
          channels: escalationLevel.channels
        });

      }, escalationLevel.delay);
    }
  }

  // Helper methods
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRuleId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateChannelId(): string {
    return `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSuppressionKey(alert: SecurityAlert, rule: AlertRule): string {
    return `${rule.id}_${alert.type}_${alert.source}`;
  }

  private loadConfiguration(): void {
    this.config.alertRetentionDays = this.configService.get<number>('ALERT_RETENTION_DAYS', 90);
    this.config.maxRetryAttempts = this.configService.get<number>('ALERT_MAX_RETRY_ATTEMPTS', 3);
    this.config.enableDeduplication = this.configService.get<boolean>('ALERT_ENABLE_DEDUPLICATION', true);
  }

  private initializeDefaultChannels(): void {
    // Initialize default email channel
    this.channels.push({
      id: 'default_email',
      name: 'Default Email',
      type: 'email',
      enabled: true,
      config: {
        to: this.configService.get<string>('ALERT_EMAIL_TO', 'admin@example.com'),
        from: this.configService.get<string>('ALERT_EMAIL_FROM', 'alerts@example.com')
      },
      failureHandling: {
        retryCount: 3,
        retryDelay: 5000
      }
    });

    // Initialize webhook channel if configured
    const webhookUrl = this.configService.get<string>('ALERT_WEBHOOK_URL');
    if (webhookUrl) {
      this.channels.push({
        id: 'default_webhook',
        name: 'Default Webhook',
        type: 'webhook',
        enabled: true,
        config: { url: webhookUrl },
        failureHandling: {
          retryCount: 3,
          retryDelay: 5000
        }
      });
    }
  }

  private initializeDefaultRules(): void {
    // Critical severity alerts
    this.alertRules.push({
      id: 'critical_alerts',
      name: 'Critical Security Alerts',
      description: 'Send all critical alerts to all channels',
      enabled: true,
      conditions: {
        severity: ['critical']
      },
      actions: {
        channels: this.channels.map(c => c.id),
        escalation: {
          enabled: true,
          levels: [
            { delay: 300000, channels: ['default_email'] }, // 5 minutes
            { delay: 900000, channels: ['default_email'] }  // 15 minutes
          ]
        }
      },
      priority: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    });

    // High frequency alerts suppression
    this.alertRules.push({
      id: 'suppress_high_frequency',
      name: 'Suppress High Frequency Alerts',
      description: 'Suppress alerts that occur too frequently',
      enabled: true,
      conditions: {
        frequency: {
          count: 10,
          timeWindow: 300000 // 5 minutes
        }
      },
      actions: {
        channels: [],
        suppression: {
          enabled: true,
          duration: 3600000, // 1 hour
          conditions: {}
        }
      },
      priority: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: 'system'
    });
  }

  private initializeDefaultTemplates(): void {
    // Email template for security alerts
    this.templates.push({
      id: 'security_email',
      name: 'Security Alert Email',
      type: 'security_event',
      channel: 'email',
      subject: '🚨 Security Alert: {{title}}',
      body: `
<!DOCTYPE html>
<html>
<head>
    <title>Security Alert</title>
</head>
<body>
    <h2 style="color: #d32f2f;">🚨 Security Alert</h2>

    <table style="border-collapse: collapse; width: 100%;">
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Alert ID:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">{{id}}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Type:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">{{type}}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Severity:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">{{severity}}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Source:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">{{source}}</td>
        </tr>
        <tr>
            <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Time:</td>
            <td style="border: 1px solid #ddd; padding: 8px;">{{timestamp}}</td>
        </tr>
    </table>

    <h3>Description:</h3>
    <p>{{description}}</p>

    <p><em>This is an automated security alert from the AIgent system.</em></p>
</body>
</html>
      `.trim(),
      variables: ['id', 'type', 'severity', 'title', 'description', 'source', 'timestamp'],
      formatting: {
        html: true,
        markdown: false,
        emoji: true
      }
    });

    // Slack template for security alerts
    this.templates.push({
      id: 'security_slack',
      name: 'Security Alert Slack',
      type: 'security_event',
      channel: 'slack',
      subject: '',
      body: `{
        "text": "🚨 Security Alert: {{title}}",
        "attachments": [
          {
            "color": "danger",
            "fields": [
              {
                "title": "Alert ID",
                "value": "{{id}}",
                "short": true
              },
              {
                "title": "Type",
                "value": "{{type}}",
                "short": true
              },
              {
                "title": "Severity",
                "value": "{{severity}}",
                "short": true
              },
              {
                "title": "Source",
                "value": "{{source}}",
                "short": true
              },
              {
                "title": "Description",
                "value": "{{description}}",
                "short": false
              }
            ],
            "footer": "AIgent Security System",
            "ts": {{timestamp}}
          }
        ]
      }`,
      variables: ['id', 'type', 'severity', 'title', 'description', 'source', 'timestamp'],
      formatting: {
        html: false,
        markdown: true,
        emoji: true
      }
    });
  }

  private startAlertProcessing(): void {
    // Start periodic cleanup of old alerts
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000); // Every hour

    // Start periodic cleanup of suppressed alerts
    setInterval(() => {
      this.cleanupExpiredSuppressions();
    }, 300000); // Every 5 minutes

    // Start alert count cleanup
    setInterval(() => {
      this.cleanupAlertCounts();
    }, 600000); // Every 10 minutes
  }

  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - (this.config.alertRetentionDays * 24 * 60 * 60 * 1000);
    const beforeCount = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);

    if (this.alerts.length !== beforeCount) {
      this.logger.log('Cleaned up old alerts', {
        removed: beforeCount - this.alerts.length,
        remaining: this.alerts.length
      });
    }
  }

  private cleanupExpiredSuppressions(): void {
    const now = Date.now();
    const beforeCount = this.suppressedAlerts.size;

    for (const [key, until] of this.suppressedAlerts.entries()) {
      if (now > until) {
        this.suppressedAlerts.delete(key);
      }
    }

    if (this.suppressedAlerts.size !== beforeCount) {
      this.logger.debug('Cleaned up expired suppressions', {
        removed: beforeCount - this.suppressedAlerts.size,
        remaining: this.suppressedAlerts.size
      });
    }
  }

  private cleanupAlertCounts(): void {
    const now = Date.now();
    const beforeCount = this.alertCounts.size;

    for (const [key, data] of this.alertCounts.entries()) {
      if (now - data.firstSeen > 3600000) { // 1 hour
        this.alertCounts.delete(key);
      }
    }

    if (this.alertCounts.size !== beforeCount) {
      this.logger.debug('Cleaned up alert counts', {
        removed: beforeCount - this.alertCounts.size,
        remaining: this.alertCounts.size
      });
    }
  }
}