/**
 * Security Monitoring Service - Real-time Security Event Processing
 *
 * This service provides comprehensive security monitoring capabilities including:
 * - Real-time security event aggregation and analysis
 * - CSP violation reporting and alerting
 * - CORS attack pattern detection
 * - Risk scoring and threat intelligence
 * - Security metrics collection and dashboard integration
 * - Automated threat response and rate limiting escalation
 *
 * @fileoverview Enterprise security monitoring with real-time threat detection
 * @version 2.0.0
 * @author Security Monitoring Specialist
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SecurityEvent, SecurityEventType } from '../middleware/comprehensive-security.middleware';
import { createHash } from 'crypto';

/**
 * Security alert levels
 */
export enum SecurityAlertLevel {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Security metric types
 */
export enum SecurityMetricType {
  CORS_VIOLATIONS = 'cors_violations',
  CSP_VIOLATIONS = 'csp_violations',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  AUTHENTICATION_FAILURES = 'auth_failures',
  SUSPICIOUS_ACTIVITIES = 'suspicious_activities',
  BLOCKED_REQUESTS = 'blocked_requests',
}

/**
 * Security alert interface
 */
export interface SecurityAlert {
  alertId: string;
  level: SecurityAlertLevel;
  type: SecurityEventType;
  title: string;
  description: string;
  timestamp: Date;
  serviceName: string;
  environment: string;
  eventCount: number;
  riskScore: number;
  sourceIPs: string[];
  affectedEndpoints: string[];
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Security metric interface
 */
export interface SecurityMetric {
  type: SecurityMetricType;
  serviceName: string;
  environment: string;
  timestamp: Date;
  count: number;
  value: number;
  tags: Record<string, string>;
  metadata: Record<string, any>;
}

/**
 * Attack pattern detection interface
 */
export interface AttackPattern {
  patternId: string;
  name: string;
  description: string;
  indicators: string[];
  riskScore: number;
  detectionCount: number;
  lastDetected: Date;
  blocked: boolean;
}

/**
 * Security dashboard summary interface
 */
export interface SecurityDashboardSummary {
  timestamp: Date;
  environment: string;
  totalEvents: number;
  criticalAlerts: number;
  highRiskEvents: number;
  blockedRequests: number;
  topThreats: AttackPattern[];
  recentAlerts: SecurityAlert[];
  metrics: SecurityMetric[];
}

@Injectable()
export class SecurityMonitoringService {
  private readonly logger = new Logger(SecurityMonitoringService.name);
  private readonly eventBuffer = new Map<string, SecurityEvent[]>();
  private readonly alertBuffer = new Map<string, SecurityAlert>();
  private readonly metrics = new Map<string, SecurityMetric>();
  private readonly attackPatterns = new Map<string, AttackPattern>();
  private readonly environment: string;
  private readonly enableRealTimeAlerting: boolean;
  private readonly alertThresholds: Record<SecurityEventType, number>;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.environment = this.configService.get('NODE_ENV', 'development');
    this.enableRealTimeAlerting = this.configService.get('ENABLE_SECURITY_ALERTS', 'true') === 'true';

    // Configure alert thresholds by event type
    this.alertThresholds = {
      [SecurityEventType.CORS_VIOLATION]: 5,
      [SecurityEventType.CSP_VIOLATION]: 3,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 10,
      [SecurityEventType.SUSPICIOUS_ORIGIN]: 3,
      [SecurityEventType.MALFORMED_REQUEST]: 5,
      [SecurityEventType.SECURITY_BYPASS_ATTEMPT]: 1,
    };

    // Initialize attack patterns
    this.initializeAttackPatterns();

    // Start monitoring tasks
    this.startPeriodicTasks();

    this.logger.log('Security monitoring service initialized', {
      environment: this.environment,
      realTimeAlerting: this.enableRealTimeAlerting,
      alertThresholds: this.alertThresholds,
    });
  }

  /**
   * Process incoming security event
   */
  async processSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // Store event in buffer for analysis
      this.storeEventInBuffer(event);

      // Update security metrics
      this.updateSecurityMetrics(event);

      // Detect attack patterns
      await this.detectAttackPatterns(event);

      // Check for alert conditions
      await this.checkAlertConditions(event);

      // Emit event for real-time processing
      this.eventEmitter.emit('security.event', event);

      this.logger.debug('Security event processed', {
        eventId: event.eventId,
        type: event.type,
        riskScore: event.riskScore,
        blocked: event.blocked,
      });
    } catch (error) {
      this.logger.error('Failed to process security event', {
        eventId: event.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Store event in buffer for pattern analysis
   */
  private storeEventInBuffer(event: SecurityEvent): void {
    const bufferKey = `${event.serviceName}-${event.type}`;
    const events = this.eventBuffer.get(bufferKey) || [];
    
    events.push(event);
    
    // Keep only last 100 events per service/type
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
    
    this.eventBuffer.set(bufferKey, events);
  }

  /**
   * Update security metrics
   */
  private updateSecurityMetrics(event: SecurityEvent): void {
    const metricKey = `${event.serviceName}-${event.type}-${this.getTimeWindow()}`;
    const existing = this.metrics.get(metricKey);

    if (existing) {
      existing.count += 1;
      existing.value += event.riskScore;
      existing.timestamp = new Date();
    } else {
      this.metrics.set(metricKey, {
        type: this.mapEventTypeToMetric(event.type),
        serviceName: event.serviceName,
        environment: event.environment,
        timestamp: new Date(),
        count: 1,
        value: event.riskScore,
        tags: {
          type: event.type,
          blocked: event.blocked.toString(),
        },
        metadata: {
          averageRiskScore: event.riskScore,
        },
      });
    }
  }

  /**
   * Detect attack patterns from events
   */
  private async detectAttackPatterns(event: SecurityEvent): Promise<void> {
    const bufferKey = `${event.serviceName}-${event.type}`;
    const events = this.eventBuffer.get(bufferKey) || [];

    // Pattern 1: Rapid CORS violations from same IP
    if (event.type === SecurityEventType.CORS_VIOLATION) {
      await this.detectCORSFloodPattern(events, event);
    }

    // Pattern 2: Multiple CSP violations from same origin
    if (event.type === SecurityEventType.CSP_VIOLATION) {
      await this.detectCSPBypassPattern(events, event);
    }

    // Pattern 3: Rate limiting exceeded across multiple endpoints
    if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      await this.detectBruteForcePattern(events, event);
    }

    // Pattern 4: Suspicious origin patterns
    if (event.type === SecurityEventType.SUSPICIOUS_ORIGIN) {
      await this.detectSuspiciousOriginPattern(events, event);
    }
  }

  /**
   * Detect CORS flood attack pattern
   */
  private async detectCORSFloodPattern(events: SecurityEvent[], currentEvent: SecurityEvent): Promise<void> {
    const recentEvents = events.filter(e => 
      e.ipAddress === currentEvent.ipAddress &&
      Date.now() - e.timestamp.getTime() < 60000 // Last minute
    );

    if (recentEvents.length >= 10) {
      await this.createAttackPattern({
        patternId: `cors-flood-${currentEvent.ipAddress}`,
        name: 'CORS Flood Attack',
        description: `Rapid CORS violations from IP ${currentEvent.ipAddress}`,
        indicators: [`ip:${currentEvent.ipAddress}`, 'cors-flood'],
        riskScore: 85,
        detectionCount: recentEvents.length,
        lastDetected: new Date(),
        blocked: true,
      });
    }
  }

  /**
   * Detect CSP bypass attempt pattern
   */
  private async detectCSPBypassPattern(events: SecurityEvent[], currentEvent: SecurityEvent): Promise<void> {
    const recentEvents = events.filter(e => 
      e.origin === currentEvent.origin &&
      Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    );

    if (recentEvents.length >= 3) {
      await this.createAttackPattern({
        patternId: `csp-bypass-${createHash('md5').update(currentEvent.origin || '').digest('hex')}`,
        name: 'CSP Bypass Attempt',
        description: `Multiple CSP violations from origin ${currentEvent.origin}`,
        indicators: [`origin:${currentEvent.origin}`, 'csp-bypass'],
        riskScore: 75,
        detectionCount: recentEvents.length,
        lastDetected: new Date(),
        blocked: true,
      });
    }
  }

  /**
   * Detect brute force attack pattern
   */
  private async detectBruteForcePattern(events: SecurityEvent[], currentEvent: SecurityEvent): Promise<void> {
    const recentEvents = events.filter(e => 
      e.ipAddress === currentEvent.ipAddress &&
      Date.now() - e.timestamp.getTime() < 900000 // Last 15 minutes
    );

    if (recentEvents.length >= 20) {
      await this.createAttackPattern({
        patternId: `brute-force-${currentEvent.ipAddress}`,
        name: 'Brute Force Attack',
        description: `Excessive rate limiting from IP ${currentEvent.ipAddress}`,
        indicators: [`ip:${currentEvent.ipAddress}`, 'brute-force'],
        riskScore: 90,
        detectionCount: recentEvents.length,
        lastDetected: new Date(),
        blocked: true,
      });
    }
  }

  /**
   * Detect suspicious origin pattern
   */
  private async detectSuspiciousOriginPattern(events: SecurityEvent[], currentEvent: SecurityEvent): Promise<void> {
    const suspiciousOrigins = events
      .filter(e => e.riskScore > 70)
      .map(e => e.origin)
      .filter((origin, index, array) => array.indexOf(origin) === index);

    if (suspiciousOrigins.length >= 5) {
      await this.createAttackPattern({
        patternId: `suspicious-origins-${Date.now()}`,
        name: 'Suspicious Origin Campaign',
        description: `Multiple high-risk origins detected`,
        indicators: suspiciousOrigins.map(o => `origin:${o}`),
        riskScore: 80,
        detectionCount: suspiciousOrigins.length,
        lastDetected: new Date(),
        blocked: false,
      });
    }
  }

  /**
   * Create or update attack pattern
   */
  private async createAttackPattern(pattern: AttackPattern): Promise<void> {
    const existing = this.attackPatterns.get(pattern.patternId);

    if (existing) {
      existing.detectionCount += 1;
      existing.lastDetected = pattern.lastDetected;
      existing.riskScore = Math.max(existing.riskScore, pattern.riskScore);
    } else {
      this.attackPatterns.set(pattern.patternId, pattern);
    }

    // Create high-priority alert for new attack patterns
    await this.createSecurityAlert({
      alertId: `alert-${pattern.patternId}-${Date.now()}`,
      level: pattern.riskScore > 85 ? SecurityAlertLevel.CRITICAL : SecurityAlertLevel.HIGH,
      type: SecurityEventType.SECURITY_BYPASS_ATTEMPT,
      title: `Attack Pattern Detected: ${pattern.name}`,
      description: pattern.description,
      timestamp: new Date(),
      serviceName: 'security-monitoring',
      environment: this.environment,
      eventCount: pattern.detectionCount,
      riskScore: pattern.riskScore,
      sourceIPs: pattern.indicators.filter(i => i.startsWith('ip:')).map(i => i.substring(3)),
      affectedEndpoints: [],
      metadata: {
        patternId: pattern.patternId,
        indicators: pattern.indicators,
      },
      resolved: false,
    });

    this.logger.warn('Attack pattern detected', {
      patternId: pattern.patternId,
      name: pattern.name,
      riskScore: pattern.riskScore,
      detectionCount: pattern.detectionCount,
    });
  }

  /**
   * Check alert conditions and create alerts
   */
  private async checkAlertConditions(event: SecurityEvent): Promise<void> {
    const threshold = this.alertThresholds[event.type] || 5;
    const bufferKey = `${event.serviceName}-${event.type}`;
    const events = this.eventBuffer.get(bufferKey) || [];

    // Count recent events of this type
    const recentEvents = events.filter(e => 
      Date.now() - e.timestamp.getTime() < 300000 // Last 5 minutes
    );

    if (recentEvents.length >= threshold) {
      await this.createSecurityAlert({
        alertId: `alert-${event.type}-${Date.now()}`,
        level: this.getAlertLevelForEvent(event),
        type: event.type,
        title: `Security Alert: ${event.type.replace('_', ' ').toUpperCase()}`,
        description: `${recentEvents.length} ${event.type} events detected in the last 5 minutes`,
        timestamp: new Date(),
        serviceName: event.serviceName,
        environment: event.environment,
        eventCount: recentEvents.length,
        riskScore: Math.max(...recentEvents.map(e => e.riskScore)),
        sourceIPs: [...new Set(recentEvents.map(e => e.ipAddress).filter(Boolean))],
        affectedEndpoints: [...new Set(recentEvents.map(e => e.endpoint))],
        metadata: {
          threshold,
          timeWindowMinutes: 5,
        },
        resolved: false,
      });
    }
  }

  /**
   * Create security alert
   */
  private async createSecurityAlert(alert: SecurityAlert): Promise<void> {
    this.alertBuffer.set(alert.alertId, alert);

    // Emit alert for real-time processing
    this.eventEmitter.emit('security.alert', alert);

    // Send notifications if enabled
    if (this.enableRealTimeAlerting) {
      await this.sendAlertNotification(alert);
    }

    this.logger.warn('Security alert created', {
      alertId: alert.alertId,
      level: alert.level,
      type: alert.type,
      eventCount: alert.eventCount,
      riskScore: alert.riskScore,
    });
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: SecurityAlert): Promise<void> {
    try {
      // In a production environment, this would integrate with:
      // - Slack/Teams notifications
      // - Email alerts
      // - PagerDuty/OpsGenie
      // - SIEM systems
      // - Security orchestration platforms

      this.logger.warn(`SECURITY ALERT: ${alert.title}`, {
        alertId: alert.alertId,
        level: alert.level,
        description: alert.description,
        eventCount: alert.eventCount,
        riskScore: alert.riskScore,
        sourceIPs: alert.sourceIPs,
        affectedEndpoints: alert.affectedEndpoints,
      });
    } catch (error) {
      this.logger.error('Failed to send alert notification', {
        alertId: alert.alertId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get security dashboard summary
   */
  async getSecurityDashboardSummary(): Promise<SecurityDashboardSummary> {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 3600000);

    // Calculate totals
    const allEvents = Array.from(this.eventBuffer.values()).flat();
    const recentEvents = allEvents.filter(e => e.timestamp >= lastHour);
    const recentAlerts = Array.from(this.alertBuffer.values()).filter(a => a.timestamp >= lastHour);

    return {
      timestamp: now,
      environment: this.environment,
      totalEvents: recentEvents.length,
      criticalAlerts: recentAlerts.filter(a => a.level === SecurityAlertLevel.CRITICAL).length,
      highRiskEvents: recentEvents.filter(e => e.riskScore > 70).length,
      blockedRequests: recentEvents.filter(e => e.blocked).length,
      topThreats: Array.from(this.attackPatterns.values())
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 5),
      recentAlerts: recentAlerts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10),
      metrics: Array.from(this.metrics.values()),
    };
  }

  /**
   * Get alert level for security event
   */
  private getAlertLevelForEvent(event: SecurityEvent): SecurityAlertLevel {
    if (event.riskScore >= 90) return SecurityAlertLevel.CRITICAL;
    if (event.riskScore >= 70) return SecurityAlertLevel.HIGH;
    if (event.riskScore >= 50) return SecurityAlertLevel.MEDIUM;
    if (event.riskScore >= 30) return SecurityAlertLevel.LOW;
    return SecurityAlertLevel.INFO;
  }

  /**
   * Map event type to metric type
   */
  private mapEventTypeToMetric(eventType: SecurityEventType): SecurityMetricType {
    switch (eventType) {
      case SecurityEventType.CORS_VIOLATION:
        return SecurityMetricType.CORS_VIOLATIONS;
      case SecurityEventType.CSP_VIOLATION:
        return SecurityMetricType.CSP_VIOLATIONS;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        return SecurityMetricType.RATE_LIMIT_EXCEEDED;
      default:
        return SecurityMetricType.SUSPICIOUS_ACTIVITIES;
    }
  }

  /**
   * Get time window for metrics
   */
  private getTimeWindow(): string {
    const now = new Date();
    return `${now.getHours()}-${Math.floor(now.getMinutes() / 5)}`;
  }

  /**
   * Initialize attack patterns database
   */
  private initializeAttackPatterns(): void {
    // Initialize with known attack patterns
    const knownPatterns: AttackPattern[] = [
      {
        patternId: 'cors-flood-generic',
        name: 'Generic CORS Flood',
        description: 'High frequency CORS violations from single source',
        indicators: ['cors-flood', 'high-frequency'],
        riskScore: 80,
        detectionCount: 0,
        lastDetected: new Date(),
        blocked: true,
      },
      {
        patternId: 'csp-bypass-generic',
        name: 'Generic CSP Bypass',
        description: 'Content Security Policy bypass attempts',
        indicators: ['csp-bypass', 'script-injection'],
        riskScore: 85,
        detectionCount: 0,
        lastDetected: new Date(),
        blocked: true,
      },
    ];

    knownPatterns.forEach(pattern => {
      this.attackPatterns.set(pattern.patternId, pattern);
    });
  }

  /**
   * Start periodic monitoring tasks
   */
  private startPeriodicTasks(): void {
    // Clean up old events every 10 minutes
    setInterval(() => {
      this.cleanupOldEvents();
    }, 600000);

    // Clean up old alerts every hour
    setInterval(() => {
      this.cleanupOldAlerts();
    }, 3600000);

    // Update metrics every 5 minutes
    setInterval(() => {
      this.updateAggregatedMetrics();
    }, 300000);
  }

  /**
   * Cleanup old events from buffer
   */
  private cleanupOldEvents(): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago

    this.eventBuffer.forEach((events, key) => {
      const filtered = events.filter(e => e.timestamp.getTime() > cutoff);
      if (filtered.length !== events.length) {
        this.eventBuffer.set(key, filtered);
      }
    });
  }

  /**
   * Cleanup old alerts
   */
  private cleanupOldAlerts(): void {
    const cutoff = Date.now() - 86400000; // 24 hours ago

    this.alertBuffer.forEach((alert, key) => {
      if (alert.timestamp.getTime() < cutoff) {
        this.alertBuffer.delete(key);
      }
    });
  }

  /**
   * Update aggregated metrics
   */
  private updateAggregatedMetrics(): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago

    this.metrics.forEach((metric, key) => {
      if (metric.timestamp.getTime() < cutoff) {
        this.metrics.delete(key);
      }
    });
  }
}

export default SecurityMonitoringService;