/**
 * Compliance Reporter - Bytebot Platform Compliance Reporting
 *
 * This utility provides comprehensive compliance reporting capabilities
 * for regulatory requirements and audit purposes.
 *
 * @fileoverview Compliance reporting utility
 * @version 1.0.0
 * @author Security Module Specialist
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  SecurityContext,
  AuthorizationResult,
  UserContext,
  Role,
  Permission,
} from "../types/rbac.types";

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  _SOC2 = "SOC2",
  _ISO27001 = "ISO27001",
  _GDPR = "GDPR",
  _HIPAA = "HIPAA",
  _PCI_DSS = "PCI_DSS",
  _NIST = "NIST",
  _SOX = "SOX",
}

/**
 * Compliance event types
 */
export enum ComplianceEventType {
  _ACCESS_GRANTED = "ACCESS_GRANTED",
  _ACCESS_DENIED = "ACCESS_DENIED",
  _PRIVILEGE_ESCALATION = "PRIVILEGE_ESCALATION",
  _DATA_ACCESS = "DATA_ACCESS",
  _ADMIN_ACTION = "ADMIN_ACTION",
  _SECURITY_VIOLATION = "SECURITY_VIOLATION",
  _AUTHENTICATION_FAILURE = "AUTHENTICATION_FAILURE",
  _EMERGENCY_ACCESS = "EMERGENCY_ACCESS",
}

/**
 * Compliance report entry
 */
export interface ComplianceReportEntry {
  /** Unique event identifier */
  id: string;

  /** Timestamp of the event */
  timestamp: Date;

  /** Event type */
  eventType: ComplianceEventType;

  /** Applicable compliance frameworks */
  frameworks: ComplianceFramework[];

  /** User context */
  user: {
    id: string;
    username: string;
    roles: Role[];
    permissions: Permission[];
  };

  /** Resource accessed */
  resource: {
    type: string;
    id?: string;
    action: string;
  };

  /** Event details */
  details: {
    success: boolean;
    reason?: string;
    securityLevel: string;
    clientIP: string;
    userAgent?: string;
  };

  /** Compliance-specific metadata */
  compliance: {
    requiresReview: boolean;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    dataClassification?: string;
    retentionPeriod: number; // days
    auditTrail: string[];
  };

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Compliance configuration
 */
export interface ComplianceConfig {
  /** Enabled compliance frameworks */
  enabledFrameworks: ComplianceFramework[];

  /** Data retention periods by framework */
  retentionPeriods: Record<ComplianceFramework, number>;

  /** Auto-reporting configuration */
  autoReporting: {
    enabled: boolean;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY";
    recipients: string[];
  };

  /** Risk thresholds */
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

@Injectable()
export class ComplianceReporter {
  private readonly logger = new Logger(ComplianceReporter.name);

  constructor(private readonly _configService: ConfigService) {}

  /**
   * Report authorization event for compliance
   */
  async reportAuthorizationEvent(
    context: SecurityContext,
    result: AuthorizationResult,
  ): Promise<void> {
    try {
      const reportEntry = this.createComplianceEntry(context, result);
      await this.logComplianceEvent(reportEntry);

      // Check if immediate notification is required
      if (reportEntry.compliance.requiresReview) {
        await this.triggerImmediateReview(reportEntry);
      }

      // Store for compliance reporting
      await this.storeComplianceRecord(reportEntry);
    } catch (error) {
      this.logger.error("Failed to report compliance event:", error);
    }
  }

  /**
   * Report administrative action
   */
  async reportAdminAction(
    user: UserContext,
    action: string,
    resource: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      const reportEntry: ComplianceReportEntry = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: ComplianceEventType._ADMIN_ACTION,
        frameworks: this.getApplicableFrameworks(
          ComplianceEventType._ADMIN_ACTION,
        ),
        user: {
          id: user.id,
          username: user.username,
          roles: user.roles,
          permissions: user.permissions,
        },
        resource: {
          type: "admin",
          action,
          id: resource,
        },
        details: {
          success: true,
          securityLevel: "HIGH",
          clientIP: "unknown", // Would be extracted from context in real implementation
        },
        compliance: {
          requiresReview: this.requiresReview(
            ComplianceEventType._ADMIN_ACTION,
            user.roles,
          ),
          riskLevel: this.calculateRiskLevel(
            ComplianceEventType._ADMIN_ACTION,
            user.roles,
          ),
          retentionPeriod: this.getRetentionPeriod(
            ComplianceEventType._ADMIN_ACTION,
          ),
          auditTrail: [`Admin action: ${action} on ${resource}`],
        },
        metadata: details,
      };

      await this.logComplianceEvent(reportEntry);
      await this.storeComplianceRecord(reportEntry);
    } catch (error) {
      this.logger.error("Failed to report admin action:", error);
    }
  }

  /**
   * Report security violation
   */
  async reportSecurityViolation(
    user: UserContext | null,
    violation: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      const reportEntry: ComplianceReportEntry = {
        id: this.generateEventId(),
        timestamp: new Date(),
        eventType: ComplianceEventType._SECURITY_VIOLATION,
        frameworks: this.getApplicableFrameworks(
          ComplianceEventType._SECURITY_VIOLATION,
        ),
        user: user
          ? {
              id: user.id,
              username: user.username,
              roles: user.roles,
              permissions: user.permissions,
            }
          : {
              id: "unknown",
              username: "unknown",
              roles: [],
              permissions: [],
            },
        resource: {
          type: "security",
          action: "violation",
        },
        details: {
          success: false,
          reason: violation,
          securityLevel: "CRITICAL",
          clientIP: (details.clientIP as string) || "unknown",
          userAgent: details.userAgent as string,
        },
        compliance: {
          requiresReview: true,
          riskLevel: "CRITICAL",
          retentionPeriod: this.getRetentionPeriod(
            ComplianceEventType._SECURITY_VIOLATION,
          ),
          auditTrail: [`Security violation: ${violation}`],
        },
        metadata: details,
      };

      await this.logComplianceEvent(reportEntry);
      await this.storeComplianceRecord(reportEntry);
      await this.triggerImmediateReview(reportEntry);
    } catch (error) {
      this.logger.error("Failed to report security violation:", error);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    summary: {
      totalEvents: number;
      eventsByType: Record<ComplianceEventType, number>;
      riskDistribution: Record<string, number>;
    };
    events: ComplianceReportEntry[];
    recommendations: string[];
  }> {
    try {
      // This would query stored compliance records in a real implementation
      const events = await this.queryComplianceRecords(
        framework,
        startDate,
        endDate,
      );

      const summary = {
        totalEvents: events.length,
        eventsByType: this.summarizeEventsByType(events),
        riskDistribution: this.summarizeRiskDistribution(events),
      };

      const recommendations = this.generateRecommendations(events, framework);

      return {
        summary,
        events,
        recommendations,
      };
    } catch (error) {
      this.logger.error("Failed to generate compliance report:", error);
      throw error;
    }
  }

  /**
   * Create compliance entry from authorization context
   */
  private createComplianceEntry(
    context: SecurityContext,
    result: AuthorizationResult,
  ): ComplianceReportEntry {
    const eventType = result.granted
      ? ComplianceEventType._ACCESS_GRANTED
      : ComplianceEventType._ACCESS_DENIED;

    return {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      frameworks: this.getApplicableFrameworks(eventType),
      user: {
        id: context.user.id,
        username: context.user.username,
        roles: context.user.roles,
        permissions: context.user.permissions,
      },
      resource: {
        type: context.resource.type,
        id: context.resource.id,
        action: context.action.type,
      },
      details: {
        success: result.granted,
        reason: result.reason,
        securityLevel: context.environment.securityLevel,
        clientIP: context.environment.clientIP,
        userAgent: context.environment.headers["user-agent"],
      },
      compliance: {
        requiresReview: this.requiresReview(eventType, context.user.roles),
        riskLevel: this.calculateRiskLevel(eventType, context.user.roles),
        retentionPeriod: this.getRetentionPeriod(eventType),
        auditTrail: this.buildAuditTrail(context, result),
      },
      metadata: {
        authorizationDuration: result.timing.durationMs,
        matchedRules: result.context.matchedRules,
        failedConditions: result.context.failedConditions,
      },
    };
  }

  /**
   * Get applicable compliance frameworks for event type
   */
  private getApplicableFrameworks(
    eventType: ComplianceEventType,
  ): ComplianceFramework[] {
    const config = this.getComplianceConfig();
    const allFrameworks = config.enabledFrameworks;

    // Different event types may apply to different frameworks
    switch (eventType) {
      case ComplianceEventType._ACCESS_GRANTED:
      case ComplianceEventType._ACCESS_DENIED:
        return allFrameworks.filter((f) =>
          [
            ComplianceFramework._SOC2,
            ComplianceFramework._ISO27001,
            ComplianceFramework._NIST,
          ].includes(f),
        );

      case ComplianceEventType._ADMIN_ACTION:
        return allFrameworks;

      case ComplianceEventType._SECURITY_VIOLATION:
        return allFrameworks;

      default:
        return [ComplianceFramework._SOC2];
    }
  }

  /**
   * Calculate risk level for compliance event
   */
  private calculateRiskLevel(
    eventType: ComplianceEventType,
    userRoles: Role[],
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    let riskScore = 0;

    // Base risk by event type
    switch (eventType) {
      case ComplianceEventType._SECURITY_VIOLATION:
        riskScore += 80;
        break;
      case ComplianceEventType._ADMIN_ACTION:
        riskScore += 60;
        break;
      case ComplianceEventType._ACCESS_DENIED:
        riskScore += 30;
        break;
      case ComplianceEventType._ACCESS_GRANTED:
        riskScore += 10;
        break;
    }

    // Risk by user roles
    if (userRoles.includes(Role._SUPER_ADMIN)) {
      riskScore += 30;
    } else if (userRoles.includes(Role._ADMIN)) {
      riskScore += 20;
    }

    // Convert to risk level
    if (riskScore >= 80) return "CRITICAL";
    if (riskScore >= 60) return "HIGH";
    if (riskScore >= 30) return "MEDIUM";
    return "LOW";
  }

  /**
   * Check if event requires immediate review
   */
  private requiresReview(
    eventType: ComplianceEventType,
    userRoles: Role[],
  ): boolean {
    // Always review security violations and super admin actions
    if (
      eventType === ComplianceEventType._SECURITY_VIOLATION ||
      userRoles.includes(Role._SUPER_ADMIN)
    ) {
      return true;
    }

    // Review admin actions
    if (eventType === ComplianceEventType._ADMIN_ACTION) {
      return true;
    }

    return false;
  }

  /**
   * Get retention period for event type
   */
  private getRetentionPeriod(eventType: ComplianceEventType): number {
    const config = this.getComplianceConfig();

    // Use the longest retention period from enabled frameworks
    let maxRetention = 365; // Default 1 year

    for (const framework of config.enabledFrameworks) {
      const retention = config.retentionPeriods[framework];
      if (retention > maxRetention) {
        maxRetention = retention;
      }
    }

    // Extend for critical events
    if (eventType === ComplianceEventType._SECURITY_VIOLATION) {
      maxRetention = Math.max(maxRetention, 2555); // Minimum 7 years
    }

    return maxRetention;
  }

  /**
   * Build audit trail for compliance record
   */
  private buildAuditTrail(
    context: SecurityContext,
    result: AuthorizationResult,
  ): string[] {
    const trail: string[] = [];

    trail.push(
      `User ${context.user.username} (${context.user.id}) attempted ${context.action.type} on ${context.resource.type}`,
    );
    trail.push(
      `Result: ${result.granted ? "GRANTED" : "DENIED"} - ${result.reason}`,
    );
    trail.push(`Security Level: ${context.environment.securityLevel}`);
    trail.push(`Client IP: ${context.environment.clientIP}`);

    if (result.context.matchedRules?.length) {
      trail.push(`Matched Rules: ${result.context.matchedRules.join(", ")}`);
    }

    if (result.context.failedConditions?.length) {
      trail.push(
        `Failed Conditions: ${result.context.failedConditions.join(", ")}`,
      );
    }

    return trail;
  }

  /**
   * Log compliance event
   */
  private async logComplianceEvent(
    entry: ComplianceReportEntry,
  ): Promise<void> {
    this.logger.log("COMPLIANCE EVENT", {
      id: entry.id,
      eventType: entry.eventType,
      user: entry.user.username,
      success: entry.details.success,
      riskLevel: entry.compliance.riskLevel,
      frameworks: entry.frameworks,
    });
  }

  /**
   * Store compliance record (would integrate with database in production)
   */
  private async storeComplianceRecord(
    entry: ComplianceReportEntry,
  ): Promise<void> {
    // In production, this would store to a compliance database
    // For now, we'll just log it
    this.logger.debug("Storing compliance record:", entry.id);
  }

  /**
   * Trigger immediate review for high-risk events
   */
  private async triggerImmediateReview(
    entry: ComplianceReportEntry,
  ): Promise<void> {
    this.logger.warn("IMMEDIATE REVIEW REQUIRED", {
      eventId: entry.id,
      eventType: entry.eventType,
      riskLevel: entry.compliance.riskLevel,
      user: entry.user.username,
    });

    // In production, this would trigger notifications to compliance team
  }

  /**
   * Query compliance records (mock implementation)
   */
  private async queryComplianceRecords(
    _framework: ComplianceFramework,
    _startDate: Date,
    _endDate: Date,
  ): Promise<ComplianceReportEntry[]> {
    // Mock implementation - in production, query from database
    return [];
  }

  /**
   * Summarize events by type
   */
  private summarizeEventsByType(
    events: ComplianceReportEntry[],
  ): Record<ComplianceEventType, number> {
    const summary = Object.values(ComplianceEventType).reduce(
      (acc, type) => {
        acc[type] = 0;
        return acc;
      },
      {} as Record<ComplianceEventType, number>,
    );

    events.forEach((event) => {
      summary[event.eventType]++;
    });

    return summary;
  }

  /**
   * Summarize risk distribution
   */
  private summarizeRiskDistribution(
    events: ComplianceReportEntry[],
  ): Record<string, number> {
    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

    events.forEach((event) => {
      distribution[event.compliance.riskLevel]++;
    });

    return distribution;
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(
    events: ComplianceReportEntry[],
    framework: ComplianceFramework,
  ): string[] {
    const recommendations: string[] = [];

    const criticalEvents = events.filter(
      (e) => e.compliance.riskLevel === "CRITICAL",
    ).length;
    const deniedAccess = events.filter(
      (e) => e.eventType === ComplianceEventType._ACCESS_DENIED,
    ).length;

    if (criticalEvents > 0) {
      recommendations.push(
        `Review ${criticalEvents} critical risk events for potential security improvements`,
      );
    }

    if (deniedAccess > events.length * 0.1) {
      recommendations.push(
        "High access denial rate detected - review authorization policies",
      );
    }

    // Framework-specific recommendations
    if (framework === ComplianceFramework._SOC2) {
      recommendations.push(
        "Ensure all administrative actions are properly documented",
      );
    }

    if (framework === ComplianceFramework._GDPR) {
      recommendations.push(
        "Verify data access events comply with data minimization principles",
      );
    }

    return recommendations;
  }

  /**
   * Get compliance configuration
   */
  private getComplianceConfig(): ComplianceConfig {
    return {
      enabledFrameworks: this._configService.get<ComplianceFramework[]>(
        "compliance.frameworks",
        [ComplianceFramework._SOC2, ComplianceFramework._ISO27001],
      ),
      retentionPeriods: {
        [ComplianceFramework._SOC2]: 2555, // 7 years
        [ComplianceFramework._ISO27001]: 2190, // 6 years
        [ComplianceFramework._GDPR]: 2555, // 7 years
        [ComplianceFramework._HIPAA]: 2555, // 7 years
        [ComplianceFramework._PCI_DSS]: 365, // 1 year
        [ComplianceFramework._NIST]: 2190, // 6 years
        [ComplianceFramework._SOX]: 2555, // 7 years
      },
      autoReporting: {
        enabled: this._configService.get<boolean>(
          "compliance.autoReporting.enabled",
          true,
        ),
        frequency: this._configService.get<"DAILY" | "WEEKLY" | "MONTHLY">(
          "compliance.autoReporting.frequency",
          "WEEKLY",
        ),
        recipients: this._configService.get<string[]>(
          "compliance.autoReporting.recipients",
          [],
        ),
      },
      riskThresholds: {
        low: 25,
        medium: 50,
        high: 75,
      },
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `compliance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
