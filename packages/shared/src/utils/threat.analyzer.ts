/**
 * Threat Analyzer - Bytebot Platform Threat Analysis and Detection
 *
 * This utility provides comprehensive threat analysis capabilities including
 * behavioral analysis, anomaly detection, and risk assessment.
 *
 * @fileoverview Threat analysis and detection utility
 * @version 1.0.0
 * @author Security Module Specialist
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SecurityContext, Role, Permission } from "../types/rbac.types";

/**
 * Threat types
 */
export enum ThreatType {
  _BRUTE_FORCE = "BRUTE_FORCE",
  _PRIVILEGE_ESCALATION = "PRIVILEGE_ESCALATION",
  _SUSPICIOUS_ACCESS_PATTERN = "SUSPICIOUS_ACCESS_PATTERN",
  _ANOMALOUS_BEHAVIOR = "ANOMALOUS_BEHAVIOR",
  _UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS",
  _DATA_EXFILTRATION = "DATA_EXFILTRATION",
  _ACCOUNT_TAKEOVER = "ACCOUNT_TAKEOVER",
  _INSIDER_THREAT = "INSIDER_THREAT",
}

/**
 * Threat severity levels
 */
export enum ThreatSeverity {
  _LOW = "LOW",
  _MEDIUM = "MEDIUM",
  _HIGH = "HIGH",
  _CRITICAL = "CRITICAL",
}

/**
 * Threat analysis result
 */
export interface ThreatAnalysisResult {
  /** Unique analysis ID */
  id: string;

  /** Analysis timestamp */
  timestamp: Date;

  /** Detected threats */
  threats: DetectedThreat[];

  /** Overall risk score (0-100) */
  riskScore: number;

  /** Risk level */
  riskLevel: ThreatSeverity;

  /** Behavioral analysis */
  behavioralAnalysis: {
    isAnomalous: boolean;
    anomalyScore: number;
    patterns: string[];
    deviations: string[];
  };

  /** Recommendations */
  recommendations: string[];

  /** Requires immediate action */
  requiresImmediateAction: boolean;

  /** Analysis metadata */
  metadata: {
    analysisType: string;
    duration: number;
    confidence: number;
    dataPoints: number;
  };
}

/**
 * Detected threat information
 */
export interface DetectedThreat {
  /** Threat type */
  type: ThreatType;

  /** Severity level */
  severity: ThreatSeverity;

  /** Confidence score (0-1) */
  confidence: number;

  /** Threat description */
  description: string;

  /** Evidence supporting the threat detection */
  evidence: string[];

  /** Indicators of compromise */
  indicators: {
    [key: string]: unknown;
  };

  /** Recommended actions */
  recommendedActions: string[];

  /** Time to live for this threat (in minutes) */
  ttl: number;
}

/**
 * User behavior pattern
 */
export interface UserBehaviorPattern {
  /** User ID */
  userId: string;

  /** Pattern type */
  patternType: string;

  /** Frequency of pattern */
  frequency: number;

  /** Last observed */
  lastObserved: Date;

  /** Pattern data */
  data: Record<string, unknown>;
}

/**
 * Threat analysis configuration
 */
export interface ThreatAnalysisConfig {
  /** Enable behavioral analysis */
  behavioralAnalysis: boolean;

  /** Risk score thresholds */
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };

  /** Anomaly detection settings */
  anomalyDetection: {
    enabled: boolean;
    sensitivity: number; // 0-1
    lookbackPeriod: number; // hours
    minimumDataPoints: number;
  };

  /** Pattern analysis settings */
  patternAnalysis: {
    enabled: boolean;
    patternTypes: string[];
    correlationThreshold: number;
  };

  /** Threat correlation settings */
  threatCorrelation: {
    enabled: boolean;
    timeWindow: number; // minutes
    correlationRules: Array<{
      threatTypes: ThreatType[];
      minOccurrences: number;
      severity: ThreatSeverity;
    }>;
  };
}

@Injectable()
export class ThreatAnalyzer {
  private readonly logger = new Logger(ThreatAnalyzer.name);
  private userBehaviorPatterns = new Map<string, UserBehaviorPattern[]>();
  private recentThreats = new Map<string, DetectedThreat[]>();

  constructor(private readonly _configService: ConfigService) {}

  /**
   * Analyze security context for threats
   */
  async analyzeSecurityContext(
    context: SecurityContext,
    _additionalContext?: Record<string, unknown>,
  ): Promise<ThreatAnalysisResult> {
    const startTime = Date.now();

    try {
      const config = this.getThreatAnalysisConfig();
      const threats: DetectedThreat[] = [];

      // Perform different types of analysis
      const accessPatternThreats = await this.analyzeAccessPatterns(context);
      const behavioralThreats = config.behavioralAnalysis
        ? await this.analyzeBehavioralPatterns(context)
        : [];
      const privilegeThreats = await this.analyzePrivilegeUsage(context);
      const anomalyThreats = config.anomalyDetection.enabled
        ? await this.detectAnomalies(context)
        : [];

      threats.push(
        ...accessPatternThreats,
        ...behavioralThreats,
        ...privilegeThreats,
        ...anomalyThreats,
      );

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(threats, context);
      const riskLevel = this.determineRiskLevel(riskScore, config);

      // Perform behavioral analysis
      const behavioralAnalysis = await this.performBehavioralAnalysis(context);

      // Generate recommendations
      const recommendations = this.generateRecommendations(threats, context);

      // Check if immediate action is required
      const requiresImmediateAction = this.requiresImmediateAction(
        threats,
        riskScore,
      );

      const result: ThreatAnalysisResult = {
        id: this.generateAnalysisId(),
        timestamp: new Date(),
        threats,
        riskScore,
        riskLevel,
        behavioralAnalysis,
        recommendations,
        requiresImmediateAction,
        metadata: {
          analysisType: "comprehensive",
          duration: Date.now() - startTime,
          confidence: this.calculateOverallConfidence(threats),
          dataPoints: threats.length,
        },
      };

      // Store recent threats for correlation
      this.storeRecentThreats(context.user.id, threats);

      // Log significant threats
      if (
        riskLevel === ThreatSeverity._HIGH ||
        riskLevel === ThreatSeverity._CRITICAL
      ) {
        this.logger.warn("High-risk threat detected", {
          userId: context.user.id,
          riskScore,
          riskLevel,
          threatCount: threats.length,
        });
      }

      return result;
    } catch (error) {
      this.logger.error("Threat analysis failed:", error);
      throw new Error("Threat analysis failed");
    }
  }

  /**
   * Analyze access patterns for suspicious behavior
   */
  private async analyzeAccessPatterns(
    context: SecurityContext,
  ): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    // Check for unusual access times
    const hour = context.environment.currentTime.getHours();
    if (hour < 5 || hour > 22) {
      threats.push({
        type: ThreatType._SUSPICIOUS_ACCESS_PATTERN,
        severity: ThreatSeverity._MEDIUM,
        confidence: 0.6,
        description: "Access during unusual hours",
        evidence: [`Access at ${hour}:00 hours`],
        indicators: {
          accessTime: context.environment.currentTime,
          hour,
        },
        recommendedActions: [
          "Verify user identity",
          "Monitor subsequent actions",
        ],
        ttl: 60, // 1 hour
      });
    }

    // Check for rapid successive requests (potential brute force)
    const recentAccessCount = this.getRecentAccessCount(context.user.id);
    if (recentAccessCount > 10) {
      threats.push({
        type: ThreatType._BRUTE_FORCE,
        severity: ThreatSeverity._HIGH,
        confidence: 0.8,
        description: "Potential brute force attack detected",
        evidence: [`${recentAccessCount} requests in short timeframe`],
        indicators: {
          requestCount: recentAccessCount,
          timeWindow: "5 minutes",
        },
        recommendedActions: [
          "Implement rate limiting",
          "Require additional authentication",
        ],
        ttl: 120, // 2 hours
      });
    }

    // Check for unauthorized access attempts
    if (
      context.user.id === "anonymous" &&
      context.environment.securityLevel === "high"
    ) {
      threats.push({
        type: ThreatType._UNAUTHORIZED_ACCESS,
        severity: ThreatSeverity._HIGH,
        confidence: 0.9,
        description: "Anonymous user attempting high-security operation",
        evidence: ["Anonymous user", "High security level operation"],
        indicators: {
          userType: "anonymous",
          securityLevel: context.environment.securityLevel,
        },
        recommendedActions: ["Block access", "Require authentication"],
        ttl: 30, // 30 minutes
      });
    }

    return threats;
  }

  /**
   * Analyze behavioral patterns for anomalies
   */
  private async analyzeBehavioralPatterns(
    context: SecurityContext,
  ): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    // Get user's historical patterns
    const userPatterns = this.getUserBehaviorPatterns(context.user.id);

    // Check for deviations from normal behavior
    const currentBehavior = this.extractCurrentBehavior(context);
    const isAnomalous = this.detectBehavioralAnomaly(
      currentBehavior,
      userPatterns,
    );

    if (isAnomalous) {
      threats.push({
        type: ThreatType._ANOMALOUS_BEHAVIOR,
        severity: ThreatSeverity._MEDIUM,
        confidence: 0.7,
        description: "User behavior deviates from established patterns",
        evidence: [
          "Unusual access pattern",
          "Deviation from historical behavior",
        ],
        indicators: {
          currentBehavior,
          deviation: true,
        },
        recommendedActions: [
          "Monitor user activity",
          "Consider additional verification",
        ],
        ttl: 240, // 4 hours
      });
    }

    return threats;
  }

  /**
   * Analyze privilege usage for escalation attempts
   */
  private async analyzePrivilegeUsage(
    context: SecurityContext,
  ): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    // Check for privilege escalation patterns
    const hasAdminRoles = context.user.roles.some((role) =>
      [Role._ADMIN, Role._SUPER_ADMIN].includes(role),
    );

    const hasSystemPermissions = context.user.permissions.some((permission) =>
      [Permission._ADMIN, Permission._SYSTEM_MANAGEMENT].includes(permission),
    );

    // Check for unusual admin activity
    if (hasAdminRoles && context.action.type !== "read") {
      const recentAdminActions = this.getRecentAdminActions(context.user.id);
      if (recentAdminActions > 5) {
        threats.push({
          type: ThreatType._PRIVILEGE_ESCALATION,
          severity: ThreatSeverity._HIGH,
          confidence: 0.8,
          description: "Excessive administrative actions detected",
          evidence: [`${recentAdminActions} admin actions in short period`],
          indicators: {
            adminActionCount: recentAdminActions,
            userRoles: context.user.roles,
          },
          recommendedActions: [
            "Review admin activities",
            "Verify authorization",
          ],
          ttl: 180, // 3 hours
        });
      }
    }

    // Check for potential insider threat
    if (
      hasSystemPermissions &&
      context.environment.securityLevel === "critical"
    ) {
      threats.push({
        type: ThreatType._INSIDER_THREAT,
        severity: ThreatSeverity._HIGH,
        confidence: 0.6,
        description: "Privileged user performing critical operations",
        evidence: ["System permissions", "Critical operation"],
        indicators: {
          permissions: context.user.permissions,
          operation: context.action.type,
        },
        recommendedActions: ["Enhanced monitoring", "Dual authorization"],
        ttl: 360, // 6 hours
      });
    }

    return threats;
  }

  /**
   * Detect anomalies in user behavior
   */
  private async detectAnomalies(
    context: SecurityContext,
  ): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    // Check for data access anomalies
    if (context.resource.type === "file" && context.action.type === "read") {
      const recentFileAccess = this.getRecentFileAccessCount(context.user.id);
      if (recentFileAccess > 20) {
        threats.push({
          type: ThreatType._DATA_EXFILTRATION,
          severity: ThreatSeverity._CRITICAL,
          confidence: 0.9,
          description: "Potential data exfiltration detected",
          evidence: [`${recentFileAccess} file accesses in short period`],
          indicators: {
            fileAccessCount: recentFileAccess,
            timeWindow: "10 minutes",
          },
          recommendedActions: ["Block file access", "Investigate immediately"],
          ttl: 60, // 1 hour
        });
      }
    }

    return threats;
  }

  /**
   * Perform comprehensive behavioral analysis
   */
  private async performBehavioralAnalysis(
    context: SecurityContext,
  ): Promise<ThreatAnalysisResult["behavioralAnalysis"]> {
    const userPatterns = this.getUserBehaviorPatterns(context.user.id);
    const currentBehavior = this.extractCurrentBehavior(context);

    const isAnomalous = this.detectBehavioralAnomaly(
      currentBehavior,
      userPatterns,
    );
    const anomalyScore = this.calculateAnomalyScore(
      currentBehavior,
      userPatterns,
    );

    const patterns = userPatterns.map((p) => p.patternType);
    const deviations = this.identifyDeviations(currentBehavior, userPatterns);

    return {
      isAnomalous,
      anomalyScore,
      patterns,
      deviations,
    };
  }

  /**
   * Calculate overall risk score
   */
  private calculateRiskScore(
    threats: DetectedThreat[],
    context: SecurityContext,
  ): number {
    if (threats.length === 0) return 0;

    // Base score from threats
    const threatScore = threats.reduce((total, threat) => {
      const severityWeight = {
        [ThreatSeverity._LOW]: 10,
        [ThreatSeverity._MEDIUM]: 25,
        [ThreatSeverity._HIGH]: 50,
        [ThreatSeverity._CRITICAL]: 75,
      };

      return total + severityWeight[threat.severity] * threat.confidence;
    }, 0);

    // Context modifiers
    let modifier = 1;

    // Security level modifier
    const securityLevelModifier = {
      low: 0.5,
      medium: 0.7,
      high: 1.0,
      critical: 1.5,
    };
    modifier *= securityLevelModifier[context.environment.securityLevel];

    // User role modifier
    const hasHighPrivileges = context.user.roles.some((role) =>
      [Role._ADMIN, Role._SUPER_ADMIN].includes(role),
    );
    if (hasHighPrivileges) {
      modifier *= 1.2;
    }

    // Anonymous user modifier
    if (context.user.id === "anonymous") {
      modifier *= 1.3;
    }

    const finalScore = Math.min(threatScore * modifier, 100);
    return Math.round(finalScore);
  }

  /**
   * Determine risk level from score
   */
  private determineRiskLevel(
    score: number,
    config: ThreatAnalysisConfig,
  ): ThreatSeverity {
    if (score >= config.riskThresholds.critical)
      return ThreatSeverity._CRITICAL;
    if (score >= config.riskThresholds.high) return ThreatSeverity._HIGH;
    if (score >= config.riskThresholds.medium) return ThreatSeverity._MEDIUM;
    return ThreatSeverity._LOW;
  }

  /**
   * Generate recommendations based on threats
   */
  private generateRecommendations(
    threats: DetectedThreat[],
    context: SecurityContext,
  ): string[] {
    const recommendations = new Set<string>();

    // Add threat-specific recommendations
    threats.forEach((threat) => {
      threat.recommendedActions.forEach((action) =>
        recommendations.add(action),
      );
    });

    // Add context-specific recommendations
    if (context.user.id === "anonymous") {
      recommendations.add("Require user authentication");
    }

    if (context.environment.securityLevel === "critical") {
      recommendations.add("Enable enhanced monitoring");
      recommendations.add("Require dual authorization");
    }

    const criticalThreats = threats.filter(
      (t) => t.severity === ThreatSeverity._CRITICAL,
    );
    if (criticalThreats.length > 0) {
      recommendations.add("Immediate security team notification required");
      recommendations.add("Consider temporary access restriction");
    }

    return Array.from(recommendations);
  }

  /**
   * Check if immediate action is required
   */
  private requiresImmediateAction(
    threats: DetectedThreat[],
    riskScore: number,
  ): boolean {
    // Critical threats always require immediate action
    const hasCriticalThreats = threats.some(
      (t) => t.severity === ThreatSeverity._CRITICAL,
    );
    if (hasCriticalThreats) return true;

    // High risk score requires immediate action
    if (riskScore >= 80) return true;

    // Multiple high-severity threats
    const highSeverityCount = threats.filter(
      (t) => t.severity === ThreatSeverity._HIGH,
    ).length;
    if (highSeverityCount >= 2) return true;

    return false;
  }

  /**
   * Calculate overall confidence from threats
   */
  private calculateOverallConfidence(threats: DetectedThreat[]): number {
    if (threats.length === 0) return 1.0;

    const totalConfidence = threats.reduce(
      (sum, threat) => sum + threat.confidence,
      0,
    );
    return Math.round((totalConfidence / threats.length) * 100) / 100;
  }

  // Helper methods for behavioral analysis

  private getUserBehaviorPatterns(userId: string): UserBehaviorPattern[] {
    return this.userBehaviorPatterns.get(userId) || [];
  }

  private extractCurrentBehavior(
    context: SecurityContext,
  ): Record<string, unknown> {
    return {
      resourceType: context.resource.type,
      actionType: context.action.type,
      hour: context.environment.currentTime.getHours(),
      dayOfWeek: context.environment.currentTime.getDay(),
      securityLevel: context.environment.securityLevel,
    };
  }

  private detectBehavioralAnomaly(
    current: Record<string, unknown>,
    patterns: UserBehaviorPattern[],
  ): boolean {
    // Simple anomaly detection - in production, this would use ML models
    const currentHour = current.hour as number;
    const historicalHours = patterns
      .filter((p) => p.patternType === "access_time")
      .map((p) => p.data.hour as number);

    if (historicalHours.length === 0) return false;

    const avgHour =
      historicalHours.reduce((sum, h) => sum + h, 0) / historicalHours.length;
    const deviation = Math.abs(currentHour - avgHour);

    return deviation > 4; // More than 4 hours deviation
  }

  private calculateAnomalyScore(
    _current: Record<string, unknown>,
    _patterns: UserBehaviorPattern[],
  ): number {
    // Mock implementation - would use sophisticated algorithms in production
    return Math.random() * 100;
  }

  private identifyDeviations(
    current: Record<string, unknown>,
    patterns: UserBehaviorPattern[],
  ): string[] {
    const deviations: string[] = [];

    // Check for unusual access time
    const currentHour = current.hour as number;
    if (currentHour < 6 || currentHour > 22) {
      deviations.push("unusual_access_time");
    }

    // Check for unusual resource access
    const resourceType = current.resourceType as string;
    const hasAccessedBefore = patterns.some(
      (p) =>
        p.patternType === "resource_access" &&
        p.data.resourceType === resourceType,
    );

    if (!hasAccessedBefore) {
      deviations.push("new_resource_type");
    }

    return deviations;
  }

  // Mock methods for demonstration - would integrate with real data stores in production

  private getRecentAccessCount(_userId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 15);
  }

  private getRecentAdminActions(_userId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 8);
  }

  private getRecentFileAccessCount(_userId: string): number {
    // Mock implementation
    return Math.floor(Math.random() * 25);
  }

  private storeRecentThreats(userId: string, threats: DetectedThreat[]): void {
    this.recentThreats.set(userId, threats);
    // In production, this would store to a database with TTL
  }

  private getThreatAnalysisConfig(): ThreatAnalysisConfig {
    return {
      behavioralAnalysis: this._configService.get<boolean>(
        "threat.behavioralAnalysis",
        true,
      ),
      riskThresholds: {
        low: this._configService.get<number>("threat.riskThresholds.low", 25),
        medium: this._configService.get<number>(
          "threat.riskThresholds.medium",
          50,
        ),
        high: this._configService.get<number>("threat.riskThresholds.high", 75),
        critical: this._configService.get<number>(
          "threat.riskThresholds.critical",
          90,
        ),
      },
      anomalyDetection: {
        enabled: this._configService.get<boolean>(
          "threat.anomalyDetection.enabled",
          true,
        ),
        sensitivity: this._configService.get<number>(
          "threat.anomalyDetection.sensitivity",
          0.7,
        ),
        lookbackPeriod: this._configService.get<number>(
          "threat.anomalyDetection.lookbackPeriod",
          24,
        ),
        minimumDataPoints: this._configService.get<number>(
          "threat.anomalyDetection.minimumDataPoints",
          10,
        ),
      },
      patternAnalysis: {
        enabled: this._configService.get<boolean>(
          "threat.patternAnalysis.enabled",
          true,
        ),
        patternTypes: this._configService.get<string[]>(
          "threat.patternAnalysis.patternTypes",
          ["access_time", "resource_access", "action_frequency"],
        ),
        correlationThreshold: this._configService.get<number>(
          "threat.patternAnalysis.correlationThreshold",
          0.8,
        ),
      },
      threatCorrelation: {
        enabled: this._configService.get<boolean>(
          "threat.threatCorrelation.enabled",
          true,
        ),
        timeWindow: this._configService.get<number>(
          "threat.threatCorrelation.timeWindow",
          60,
        ),
        correlationRules: [],
      },
    };
  }

  private generateAnalysisId(): string {
    return `threat_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
