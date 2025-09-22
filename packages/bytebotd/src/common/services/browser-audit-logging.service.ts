/**
 * Browser Audit Logging Service - ByteBotd Computer Control Service
 * Comprehensive audit logging for browser automation security events
 *
 * Features:
 * - Security event classification and logging
 * - Browser operation audit trails
 * - User activity monitoring
 * - Session security tracking
 * - Compliance reporting
 * - Real-time alerting for critical events
 * - Evidence preservation for forensics
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Browser Security Implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BrowserOperationType,
  BrowserSecurityLevel,
} from '../decorators/browser-security.decorator';

/**
 * Audit event types
 */
export enum AuditEventType {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BROWSER_NAVIGATION = 'browser_navigation',
  BROWSER_INTERACTION = 'browser_interaction',
  DATA_EXTRACTION = 'data_extraction',
  SCRIPT_EXECUTION = 'script_execution',
  SESSION_MANAGEMENT = 'session_management',
  SECURITY_VIOLATION = 'security_violation',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  ERROR_OCCURRED = 'error_occurred',
  CONFIG_CHANGE = 'config_change',
  SYSTEM_EVENT = 'system_event',
}

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit event interface
 */
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  operationType?: BrowserOperationType;
  securityLevel?: BrowserSecurityLevel;
  action: string;
  resource: string;
  result: 'success' | 'failure' | 'blocked';
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  securityContext?: {
    riskScore: number;
    violations: string[];
    mitigationActions: string[];
  };
  performanceMetrics?: {
    duration: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

/**
 * Audit configuration
 */
interface AuditConfig {
  enableAuditLogging: boolean;
  logLevel: AuditSeverity;
  retentionDays: number;
  enableRealTimeAlerts: boolean;
  alertThresholds: {
    criticalEventsPerMinute: number;
    securityViolationsPerHour: number;
    failedAuthAttemptsPerMinute: number;
  };
  enableScreenshotCapture: boolean;
  enableRequestBodyLogging: boolean;
  enableResponseBodyLogging: boolean;
  excludeHealthChecks: boolean;
}

/**
 * Alert configuration
 */
interface AlertConfig {
  enabled: boolean;
  webhookUrl?: string;
  emailRecipients?: string[];
  slackChannel?: string;
  minSeverity: AuditSeverity;
}

@Injectable()
export class BrowserAuditLoggingService {
  private readonly logger = new Logger(BrowserAuditLoggingService.name);
  private readonly auditEvents: AuditEvent[] = [];
  private readonly config: AuditConfig;
  private readonly alertConfig: AlertConfig;
  private readonly alertCounters = new Map<
    string,
    { count: number; lastReset: number }
  >();

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enableAuditLogging: this.configService.get<boolean>(
        'AUDIT_LOGGING_ENABLED',
        true,
      ),
      logLevel: this.configService.get<AuditSeverity>(
        'AUDIT_LOG_LEVEL',
        AuditSeverity.INFO,
      ),
      retentionDays: this.configService.get<number>('AUDIT_RETENTION_DAYS', 90),
      enableRealTimeAlerts: this.configService.get<boolean>(
        'AUDIT_REAL_TIME_ALERTS',
        true,
      ),
      alertThresholds: {
        criticalEventsPerMinute: this.configService.get<number>(
          'AUDIT_CRITICAL_EVENTS_PER_MINUTE',
          5,
        ),
        securityViolationsPerHour: this.configService.get<number>(
          'AUDIT_SECURITY_VIOLATIONS_PER_HOUR',
          10,
        ),
        failedAuthAttemptsPerMinute: this.configService.get<number>(
          'AUDIT_FAILED_AUTH_PER_MINUTE',
          10,
        ),
      },
      enableScreenshotCapture: this.configService.get<boolean>(
        'AUDIT_SCREENSHOT_CAPTURE',
        false,
      ),
      enableRequestBodyLogging: this.configService.get<boolean>(
        'AUDIT_REQUEST_BODY_LOGGING',
        false,
      ),
      enableResponseBodyLogging: this.configService.get<boolean>(
        'AUDIT_RESPONSE_BODY_LOGGING',
        false,
      ),
      excludeHealthChecks: this.configService.get<boolean>(
        'AUDIT_EXCLUDE_HEALTH_CHECKS',
        true,
      ),
    };

    this.alertConfig = {
      enabled: this.configService.get<boolean>('AUDIT_ALERTS_ENABLED', false),
      webhookUrl: this.configService.get<string>('AUDIT_WEBHOOK_URL'),
      emailRecipients: this.parseEmailRecipients(),
      slackChannel: this.configService.get<string>('AUDIT_SLACK_CHANNEL'),
      minSeverity: this.configService.get<AuditSeverity>(
        'AUDIT_ALERT_MIN_SEVERITY',
        AuditSeverity.ERROR,
      ),
    };

    this.logger.log('Browser Audit Logging Service initialized');
    this.logger.log(`Configuration: ${JSON.stringify(this.config)}`);
    this.logger.log(`Alert configuration: ${JSON.stringify(this.alertConfig)}`);

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  /**
   * Log authentication event
   */
  async logAuthenticationEvent(
    userId: string,
    action: string,
    result: 'success' | 'failure' | 'blocked',
    details: Record<string, any> = {},
    context?: any,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.AUTHENTICATION,
      severity:
        result === 'failure' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      userId,
      action,
      resource: 'authentication',
      result,
      details: {
        ...details,
        method: details.method || 'jwt',
        timestamp: new Date().toISOString(),
      },
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Log browser navigation event
   */
  async logBrowserNavigation(
    userId: string,
    sessionId: string,
    url: string,
    result: 'success' | 'failure' | 'blocked',
    details: Record<string, any> = {},
    context?: any,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.BROWSER_NAVIGATION,
      severity:
        result === 'blocked' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      userId,
      sessionId,
      operationType: BrowserOperationType.NAVIGATION,
      securityLevel: BrowserSecurityLevel.HIGH,
      action: 'navigate',
      resource: url,
      result,
      details: {
        ...details,
        url,
        domain: this.extractDomain(url),
        protocol: this.extractProtocol(url),
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      performanceMetrics: {
        duration: details.duration || 0,
      },
    });
  }

  /**
   * Log browser interaction event
   */
  async logBrowserInteraction(
    userId: string,
    sessionId: string,
    interactionType: string,
    selector: string,
    result: 'success' | 'failure' | 'blocked',
    details: Record<string, any> = {},
    context?: any,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.BROWSER_INTERACTION,
      severity:
        result === 'blocked' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      userId,
      sessionId,
      operationType: BrowserOperationType.INTERACTION,
      securityLevel: BrowserSecurityLevel.MEDIUM,
      action: interactionType,
      resource: selector,
      result,
      details: {
        ...details,
        interactionType,
        selector,
        sanitizedSelector: this.sanitizeSelector(selector),
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Log data extraction event
   */
  async logDataExtraction(
    userId: string,
    sessionId: string,
    extractionType: string,
    dataSize: number,
    result: 'success' | 'failure' | 'blocked',
    details: Record<string, any> = {},
    context?: any,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.DATA_EXTRACTION,
      severity: result === 'blocked' ? AuditSeverity.ERROR : AuditSeverity.INFO,
      userId,
      sessionId,
      operationType: BrowserOperationType.EXTRACTION,
      securityLevel: BrowserSecurityLevel.HIGH,
      action: extractionType,
      resource: 'browser_data',
      result,
      details: {
        ...details,
        extractionType,
        dataSize,
        extractedFields: details.extractedFields || [],
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Log security violation event
   */
  async logSecurityViolation(
    violationType: string,
    severity: AuditSeverity,
    details: Record<string, any> = {},
    context?: any,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.SECURITY_VIOLATION,
      severity,
      userId: context?.userId,
      sessionId: context?.sessionId,
      action: violationType,
      resource: 'security_system',
      result: 'blocked',
      details: {
        ...details,
        violationType,
        blocked: true,
        mitigationActions: details.mitigationActions || [],
      },
      securityContext: {
        riskScore: details.riskScore || 0,
        violations: details.violations || [],
        mitigationActions: details.mitigationActions || [],
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });

    // Send immediate alert for critical security violations
    if (severity === AuditSeverity.CRITICAL) {
      await this.sendSecurityAlert(violationType, details, context);
    }
  }

  /**
   * Log rate limit exceeded event
   */
  async logRateLimitExceeded(
    userId: string,
    operationType: BrowserOperationType,
    currentCount: number,
    limit: number,
    details: Record<string, any> = {},
    context?: any,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      severity: AuditSeverity.WARNING,
      userId,
      sessionId: context?.sessionId,
      operationType,
      action: 'rate_limit_exceeded',
      resource: operationType,
      result: 'blocked',
      details: {
        ...details,
        currentCount,
        limit,
        operationType,
        windowMs: details.windowMs || 60000,
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Log session management event
   */
  async logSessionEvent(
    action: string,
    sessionId: string,
    userId: string,
    result: 'success' | 'failure' | 'blocked',
    details: Record<string, any> = {},
    context?: any,
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.SESSION_MANAGEMENT,
      severity:
        result === 'failure' ? AuditSeverity.WARNING : AuditSeverity.INFO,
      userId,
      sessionId,
      operationType: BrowserOperationType.SESSION_MANAGEMENT,
      action,
      resource: 'browser_session',
      result,
      details: {
        ...details,
        sessionId,
        action,
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Log system error event
   */
  async logSystemError(
    error: Error,
    context?: any,
    details: Record<string, any> = {},
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.ERROR_OCCURRED,
      severity: AuditSeverity.ERROR,
      userId: context?.userId,
      sessionId: context?.sessionId,
      action: 'system_error',
      resource: 'system',
      result: 'failure',
      details: {
        ...details,
        errorMessage: error.message,
        errorStack: error.stack,
        errorName: error.name,
      },
      requestId: context?.requestId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
    });
  }

  /**
   * Get audit events with filtering
   */
  getAuditEvents(
    filters: {
      eventType?: AuditEventType;
      severity?: AuditSeverity;
      userId?: string;
      sessionId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {},
  ): AuditEvent[] {
    let events = [...this.auditEvents];

    // Apply filters
    if (filters.eventType) {
      events = events.filter((event) => event.eventType === filters.eventType);
    }

    if (filters.severity) {
      events = events.filter((event) => event.severity === filters.severity);
    }

    if (filters.userId) {
      events = events.filter((event) => event.userId === filters.userId);
    }

    if (filters.sessionId) {
      events = events.filter((event) => event.sessionId === filters.sessionId);
    }

    if (filters.startDate) {
      events = events.filter((event) => event.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      events = events.filter((event) => event.timestamp <= filters.endDate!);
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filters.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  /**
   * Get audit statistics
   */
  getAuditStatistics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<AuditSeverity, number>;
    securityViolations: number;
    authenticationFailures: number;
    blockedActions: number;
    topUsers: Array<{ userId: string; eventCount: number }>;
    topResources: Array<{ resource: string; accessCount: number }>;
  } {
    const now = new Date();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoffTime = new Date(now.getTime() - timeRangeMs);

    const recentEvents = this.auditEvents.filter(
      (event) => event.timestamp >= cutoffTime,
    );

    const eventsByType = {} as Record<AuditEventType, number>;
    const eventsBySeverity = {} as Record<AuditSeverity, number>;
    const userCounts = new Map<string, number>();
    const resourceCounts = new Map<string, number>();

    let securityViolations = 0;
    let authenticationFailures = 0;
    let blockedActions = 0;

    for (const event of recentEvents) {
      // Count by type
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;

      // Count by severity
      eventsBySeverity[event.severity] =
        (eventsBySeverity[event.severity] || 0) + 1;

      // Count security violations
      if (event.eventType === AuditEventType.SECURITY_VIOLATION) {
        securityViolations++;
      }

      // Count authentication failures
      if (
        event.eventType === AuditEventType.AUTHENTICATION &&
        event.result === 'failure'
      ) {
        authenticationFailures++;
      }

      // Count blocked actions
      if (event.result === 'blocked') {
        blockedActions++;
      }

      // Count by user
      if (event.userId) {
        userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1);
      }

      // Count by resource
      resourceCounts.set(
        event.resource,
        (resourceCounts.get(event.resource) || 0) + 1,
      );
    }

    // Get top users
    const topUsers = Array.from(userCounts.entries())
      .map(([userId, eventCount]) => ({ userId, eventCount }))
      .sort((a, b) => b.eventCount - a.eventCount)
      .slice(0, 10);

    // Get top resources
    const topResources = Array.from(resourceCounts.entries())
      .map(([resource, accessCount]) => ({ resource, accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10);

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      securityViolations,
      authenticationFailures,
      blockedActions,
      topUsers,
      topResources,
    };
  }

  /**
   * Log generic audit event
   */
  private async logEvent(eventData: Partial<AuditEvent>): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    // Skip if below configured log level
    if (
      this.getSeverityLevel(eventData.severity!) <
      this.getSeverityLevel(this.config.logLevel)
    ) {
      return;
    }

    // Create complete audit event
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: eventData.eventType!,
      severity: eventData.severity!,
      action: eventData.action!,
      resource: eventData.resource!,
      result: eventData.result!,
      details: eventData.details || {},
      ...eventData,
    };

    // Store event
    this.auditEvents.push(auditEvent);

    // Log to application logger
    this.logToApplicationLogger(auditEvent);

    // Check for alert conditions
    if (this.config.enableRealTimeAlerts) {
      await this.checkAlertConditions(auditEvent);
    }

    // Enforce retention policy
    this.enforceRetentionPolicy();
  }

  /**
   * Send security alert
   */
  private async sendSecurityAlert(
    violationType: string,
    details: Record<string, any>,
    context?: any,
  ): Promise<void> {
    if (!this.alertConfig.enabled) {
      return;
    }

    const alertData = {
      violationType,
      severity: 'CRITICAL',
      timestamp: new Date().toISOString(),
      userId: context?.userId,
      sessionId: context?.sessionId,
      ipAddress: context?.ipAddress,
      details,
    };

    this.logger.error(
      `SECURITY ALERT: ${violationType} - ${JSON.stringify(alertData)}`,
      'BrowserAuditLoggingService',
    );

    // In a real implementation, send to external alerting systems
    // e.g., webhook, email, Slack, etc.
  }

  /**
   * Check alert conditions
   */
  private async checkAlertConditions(event: AuditEvent): Promise<void> {
    // Check critical events threshold
    if (event.severity === AuditSeverity.CRITICAL) {
      await this.checkThreshold('critical_events_per_minute', 1, 60000);
    }

    // Check security violations threshold
    if (event.eventType === AuditEventType.SECURITY_VIOLATION) {
      await this.checkThreshold('security_violations_per_hour', 1, 3600000);
    }

    // Check failed authentication attempts
    if (
      event.eventType === AuditEventType.AUTHENTICATION &&
      event.result === 'failure'
    ) {
      await this.checkThreshold('failed_auth_per_minute', 1, 60000);
    }
  }

  /**
   * Check threshold for alert condition
   */
  private async checkThreshold(
    counterKey: string,
    increment: number,
    windowMs: number,
  ): Promise<void> {
    const now = Date.now();
    const counter = this.alertCounters.get(counterKey) || {
      count: 0,
      lastReset: now,
    };

    // Reset counter if window expired
    if (now - counter.lastReset > windowMs) {
      counter.count = 0;
      counter.lastReset = now;
    }

    counter.count += increment;
    this.alertCounters.set(counterKey, counter);

    // Check thresholds
    const thresholds = this.config.alertThresholds;
    let threshold = 0;

    switch (counterKey) {
      case 'critical_events_per_minute':
        threshold = thresholds.criticalEventsPerMinute;
        break;
      case 'security_violations_per_hour':
        threshold = thresholds.securityViolationsPerHour;
        break;
      case 'failed_auth_per_minute':
        threshold = thresholds.failedAuthAttemptsPerMinute;
        break;
    }

    if (counter.count >= threshold) {
      this.logger.warn(
        `Alert threshold reached: ${counterKey} = ${counter.count} (threshold: ${threshold})`,
      );
      // Send alert (implementation specific)
    }
  }

  /**
   * Log to application logger
   */
  private logToApplicationLogger(event: AuditEvent): void {
    const message = `${event.eventType.toUpperCase()}: ${event.action} on ${event.resource} - ${event.result}`;
    const context = {
      id: event.id,
      userId: event.userId,
      sessionId: event.sessionId,
      operationType: event.operationType,
      details: event.details,
    };

    switch (event.severity) {
      case AuditSeverity.CRITICAL:
        this.logger.error(message, context);
        break;
      case AuditSeverity.ERROR:
        this.logger.error(message, context);
        break;
      case AuditSeverity.WARNING:
        this.logger.warn(message, context);
        break;
      case AuditSeverity.INFO:
        this.logger.log(message, context);
        break;
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get severity level for comparison
   */
  private getSeverityLevel(severity: AuditSeverity): number {
    const levels = {
      [AuditSeverity.INFO]: 0,
      [AuditSeverity.WARNING]: 1,
      [AuditSeverity.ERROR]: 2,
      [AuditSeverity.CRITICAL]: 3,
    };
    return levels[severity] || 0;
  }

  /**
   * Get time range in milliseconds
   */
  private getTimeRangeMs(range: string): number {
    const ranges = {
      hour: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
    };
    return ranges[range as keyof typeof ranges] || ranges.day;
  }

  /**
   * Enforce retention policy
   */
  private enforceRetentionPolicy(): void {
    const cutoffTime = new Date(
      Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000,
    );
    const originalLength = this.auditEvents.length;

    // Remove old events
    for (let i = this.auditEvents.length - 1; i >= 0; i--) {
      if (this.auditEvents[i].timestamp < cutoffTime) {
        this.auditEvents.splice(i, 1);
      }
    }

    const removedCount = originalLength - this.auditEvents.length;
    if (removedCount > 0) {
      this.logger.debug(
        `Removed ${removedCount} old audit events (retention: ${this.config.retentionDays} days)`,
      );
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.enforceRetentionPolicy();
    }, 3600000); // Run every hour
  }

  /**
   * Parse email recipients from configuration
   */
  private parseEmailRecipients(): string[] {
    const emails = this.configService.get<string>('AUDIT_EMAIL_RECIPIENTS');
    if (!emails) return [];

    try {
      return JSON.parse(emails);
    } catch {
      return emails.split(',').map((email) => email.trim());
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Extract protocol from URL
   */
  private extractProtocol(url: string): string {
    try {
      return new URL(url).protocol;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Sanitize selector for logging
   */
  private sanitizeSelector(selector: string): string {
    // Remove potential sensitive information from selectors
    return selector
      .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[CARD-REDACTED]')
      .replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        '[EMAIL-REDACTED]',
      )
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN-REDACTED]');
  }
}
