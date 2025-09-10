/**
 * Security Monitoring Service - Bytebot Platform Security Framework
 *
 * This service provides real-time security event monitoring, threat detection,
 * attack pattern analysis, and automated security alerting for all Bytebot services.
 *
 * @fileoverview Enterprise-grade security monitoring and threat detection
 * @version 1.0.0
 * @author Bytebot Security Team
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SecurityEvent, SecurityEventType } from "../types/security.types";

/**
 * Security alert severity levels
 */
export enum SecurityAlertLevel {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical",
}

/**
 * Security alert interface
 */
export interface SecurityAlert {
  alertId: string;
  level: SecurityAlertLevel;
  title: string;
  description: string;
  timestamp: Date;
  eventIds: string[];
  riskScore: number;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Attack pattern definition for threat detection
 */
export interface AttackPattern {
  patternId: string;
  name: string;
  description: string;
  riskScore: number;
  indicators: string[];
  eventTypes: SecurityEventType[];
  threshold: number;
  timeWindow: number; // in milliseconds
}

/**
 * Security dashboard summary
 */
export interface SecurityDashboardSummary {
  timestamp: Date;
  environment: string;
  serviceName: string;
  totalEvents: number;
  blockedRequests: number;
  criticalAlerts: number;
  highRiskEvents: number;
  topThreats: Array<{
    threat: string;
    count: number;
    riskScore: number;
  }>;
  recentAlerts: SecurityAlert[];
  metrics: Array<{
    name: string;
    value: number;
    unit: string;
    trend: "up" | "down" | "stable";
  }>;
}

@Injectable()
export class SecurityMonitoringService {
  private readonly logger = new Logger(SecurityMonitoringService.name);
  private readonly events: SecurityEvent[] = [];
  private readonly alerts: SecurityAlert[] = [];
  private readonly attackPatterns: AttackPattern[] = [];

  constructor(
    private readonly _configService: ConfigService,
    private readonly _eventEmitter: EventEmitter2,
  ) {
    this.initializeAttackPatterns();
    this.logger.log("Security monitoring service initialized");
  }

  /**
   * Process incoming security event
   */
  async processSecurityEvent(event: SecurityEvent): Promise<void> {
    // Store event
    this.events.push(event);

    // Log high-risk events
    if (event.riskScore >= 70) {
      this.logger.warn(`High-risk security event detected`, {
        eventId: event.eventId,
        type: event.type,
        riskScore: event.riskScore,
        endpoint: event.endpoint,
        ipAddress: event.ipAddress,
      });
    }

    // Detect attack patterns
    await this.detectAttackPatterns(event);

    // Emit event for other services
    this._eventEmitter.emit("security.event.processed", event);

    // Clean up old events periodically
    if (this.events.length % 100 === 0) {
      this.cleanup();
    }
  }

  /**
   * Get security dashboard summary
   */
  async getSecurityDashboardSummary(): Promise<SecurityDashboardSummary> {
    const environment = this._configService.get<string>(
      "NODE_ENV",
      "development",
    );
    const serviceName = this._configService.get<string>(
      "SERVICE_NAME",
      "security-service",
    );

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Filter recent events (last 24 hours)
    const recentEvents = this.events.filter(
      (event) => event.timestamp >= oneDayAgo,
    );

    const blockedRequests = recentEvents.filter(
      (event) => event.blocked === true,
    ).length;

    const criticalAlerts = this.alerts.filter(
      (alert) =>
        alert.level === SecurityAlertLevel._CRITICAL &&
        alert.timestamp >= oneDayAgo,
    ).length;

    const highRiskEvents = recentEvents.filter(
      (event) => event.riskScore >= 70,
    ).length;

    // Calculate top threats
    const threatCounts = new Map<
      string,
      { count: number; totalRiskScore: number }
    >();

    recentEvents.forEach((event) => {
      const threat = event.type;
      const existing = threatCounts.get(threat) || {
        count: 0,
        totalRiskScore: 0,
      };
      threatCounts.set(threat, {
        count: existing.count + 1,
        totalRiskScore: existing.totalRiskScore + event.riskScore,
      });
    });

    const topThreats = Array.from(threatCounts.entries())
      .map(([threat, data]) => ({
        threat,
        count: data.count,
        riskScore: Math.round(data.totalRiskScore / data.count),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get recent alerts
    const recentAlerts = this.alerts
      .filter((alert) => alert.timestamp >= oneDayAgo)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    const metrics = [
      {
        name: "Total Events",
        value: recentEvents.length,
        unit: "events",
        trend: "stable" as const,
      },
      {
        name: "Events per Hour",
        value: Math.round(recentEvents.length / 24),
        unit: "events/hour",
        trend: "stable" as const,
      },
      {
        name: "Average Risk Score",
        value:
          recentEvents.length > 0
            ? Math.round(
                recentEvents.reduce((sum, e) => sum + e.riskScore, 0) /
                  recentEvents.length,
              )
            : 0,
        unit: "score",
        trend: "stable" as const,
      },
      {
        name: "Block Rate",
        value:
          recentEvents.length > 0
            ? Math.round((blockedRequests / recentEvents.length) * 100)
            : 0,
        unit: "%",
        trend: "stable" as const,
      },
    ];

    return {
      timestamp: now,
      environment,
      serviceName,
      totalEvents: recentEvents.length,
      blockedRequests,
      criticalAlerts,
      highRiskEvents,
      topThreats,
      recentAlerts,
      metrics,
    };
  }

  /**
   * Initialize attack patterns for threat detection
   */
  private initializeAttackPatterns(): void {
    this.attackPatterns.push(
      {
        patternId: "cors-attack",
        name: "CORS Policy Violation Pattern",
        description: "Multiple CORS violations from same origin",
        riskScore: 75,
        indicators: ["same_origin", "same_ip"],
        eventTypes: [SecurityEventType._CORS_VIOLATION],
        threshold: 5,
        timeWindow: 300000, // 5 minutes
      },
      {
        patternId: "brute-force",
        name: "Authentication Brute Force",
        description: "Repeated authentication failures from same source",
        riskScore: 90,
        indicators: ["auth_failures", "same_ip", "rapid_attempts"],
        eventTypes: [
          SecurityEventType._AUTHENTICATION_FAILED,
          SecurityEventType._LOGIN_FAILED,
        ],
        threshold: 15,
        timeWindow: 900000, // 15 minutes
      },
    );
  }

  /**
   * Detect attack patterns in incoming events
   */
  private async detectAttackPatterns(newEvent: SecurityEvent): Promise<void> {
    for (const pattern of this.attackPatterns) {
      // Check if event type matches pattern
      if (!pattern.eventTypes.includes(newEvent.type)) {
        continue;
      }

      // Get events within time window
      const cutoffTime = new Date(
        newEvent.timestamp.getTime() - pattern.timeWindow,
      );
      const relevantEvents = this.events.filter(
        (event) =>
          pattern.eventTypes.includes(event.type) &&
          event.timestamp >= cutoffTime &&
          this.eventsShareCommonIndicators(event, newEvent, pattern),
      );

      // Check if threshold is exceeded
      if (relevantEvents.length >= pattern.threshold) {
        await this.createSecurityAlert(pattern, relevantEvents);
      }
    }
  }

  /**
   * Check if events share common indicators for pattern matching
   */
  private eventsShareCommonIndicators(
    event1: SecurityEvent,
    event2: SecurityEvent,
    pattern: AttackPattern,
  ): boolean {
    // Check same IP address
    if (pattern.indicators.includes("same_ip")) {
      if (
        event1.ipAddress &&
        event2.ipAddress &&
        event1.ipAddress === event2.ipAddress
      ) {
        return true;
      }
    }

    // Check same origin
    if (pattern.indicators.includes("same_origin")) {
      if (event1.origin && event2.origin && event1.origin === event2.origin) {
        return true;
      }
    }

    // Check same user agent
    if (pattern.indicators.includes("same_user_agent")) {
      if (
        event1.userAgent &&
        event2.userAgent &&
        event1.userAgent === event2.userAgent
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create security alert for detected attack pattern
   */
  private async createSecurityAlert(
    pattern: AttackPattern,
    events: SecurityEvent[],
  ): Promise<void> {
    const alertId = `alert-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const alert: SecurityAlert = {
      alertId,
      level: this.getAlertLevel(pattern.riskScore),
      title: `Attack Pattern Detected: ${pattern.name}`,
      description: pattern.description,
      timestamp: new Date(),
      eventIds: events.map((e) => e.eventId),
      riskScore: pattern.riskScore,
      acknowledged: false,
      metadata: {
        patternId: pattern.patternId,
        eventCount: events.length,
        timeWindow: pattern.timeWindow,
        indicators: pattern.indicators,
      },
    };

    this.alerts.push(alert);

    this.logger.error(`Security alert created: ${alert.title}`, {
      alertId,
      level: alert.level,
      riskScore: alert.riskScore,
      eventCount: events.length,
    });

    // Emit alert for immediate notification
    this._eventEmitter.emit("security.alert.created", alert);
  }

  /**
   * Determine alert level based on risk score
   */
  private getAlertLevel(riskScore: number): SecurityAlertLevel {
    if (riskScore >= 90) return SecurityAlertLevel._CRITICAL;
    if (riskScore >= 70) return SecurityAlertLevel._HIGH;
    if (riskScore >= 40) return SecurityAlertLevel._MEDIUM;
    return SecurityAlertLevel._LOW;
  }

  /**
   * Clear old events and alerts to prevent memory leaks
   */
  cleanup(): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days

    // Remove events older than 7 days
    const eventsToKeep = this.events.filter(
      (event) => event.timestamp >= cutoffTime,
    );
    this.events.length = 0;
    this.events.push(...eventsToKeep);

    // Remove alerts older than 7 days
    const alertsToKeep = this.alerts.filter(
      (alert) => alert.timestamp >= cutoffTime,
    );
    this.alerts.length = 0;
    this.alerts.push(...alertsToKeep);

    this.logger.debug("Security monitoring cleanup completed", {
      eventsRetained: this.events.length,
      alertsRetained: this.alerts.length,
    });
  }
}
