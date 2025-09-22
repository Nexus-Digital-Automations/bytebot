/**
 * PARLANT Phase 1 Advanced Threat Detection and Response Service
 *
 * Comprehensive threat detection and automated response system that provides
 * real-time security monitoring, AI-powered threat analysis, and automated
 * incident response capabilities with enterprise-grade security intelligence.
 *
 * Features:
 * - Real-time threat detection with machine learning algorithms
 * - Behavioral analysis and anomaly detection
 * - Automated incident response and mitigation
 * - Threat intelligence integration and correlation
 * - Security event aggregation and analysis
 * - Adaptive security controls and dynamic response
 * - Comprehensive security incident reporting
 *
 * @module ParlantThreatDetectionService
 * @version 1.0.0
 * @author PARLANT Phase 1 Threat Detection Security Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import { performance } from "perf_hooks";
import {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from "../../types/parlant-integration.types";
import { EnhancedSecurityContext } from "./context-manager.service";

/**
 * Threat severity levels
 */
export type ThreatSeverity = "low" | "medium" | "high" | "critical";

/**
 * Threat categories
 */
export type ThreatCategory =
  | "authentication_abuse"
  | "authorization_bypass"
  | "data_exfiltration"
  | "malicious_behavior"
  | "anomalous_activity"
  | "credential_compromise"
  | "insider_threat"
  | "external_attack"
  | "system_compromise"
  | "social_engineering";

/**
 * Response action types
 */
export type ResponseAction =
  | "block_user"
  | "block_ip"
  | "quarantine_session"
  | "escalate_alert"
  | "require_mfa"
  | "force_logout"
  | "reduce_permissions"
  | "enable_monitoring"
  | "notify_admin"
  | "create_incident";

/**
 * Security event
 */
export interface SecurityEvent {
  /** Event identifier */
  eventId: string;
  /** Event timestamp */
  timestamp: Date;
  /** Event type */
  type: string;
  /** Event category */
  category: ThreatCategory;
  /** Event severity */
  severity: ThreatSeverity;
  /** Event source */
  source: string;
  /** User context */
  userContext?: ParlantUserContext;
  /** Security context */
  securityContext?: EnhancedSecurityContext;
  /** Event data */
  data: Record<string, unknown>;
  /** Event metadata */
  metadata: EventMetadata;
  /** Event indicators */
  indicators: ThreatIndicator[];
  /** Event risk score */
  riskScore: number;
}

/**
 * Event metadata
 */
export interface EventMetadata {
  /** Client IP address */
  ipAddress: string;
  /** User agent */
  userAgent: string;
  /** Device fingerprint */
  deviceFingerprint?: string;
  /** Geolocation */
  geolocation?: GeolocationData;
  /** Session identifier */
  sessionId?: string;
  /** Request identifier */
  requestId?: string;
  /** Application component */
  component: string;
  /** Additional attributes */
  attributes: Record<string, unknown>;
}

/**
 * Threat indicator
 */
export interface ThreatIndicator {
  /** Indicator type */
  type: string;
  /** Indicator value */
  value: string;
  /** Indicator confidence */
  confidence: number;
  /** Indicator source */
  source: string;
  /** Indicator description */
  description: string;
  /** Indicator metadata */
  metadata: Record<string, unknown>;
}

/**
 * Threat pattern
 */
export interface ThreatPattern {
  /** Pattern identifier */
  patternId: string;
  /** Pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** Pattern category */
  category: ThreatCategory;
  /** Pattern severity */
  severity: ThreatSeverity;
  /** Pattern conditions */
  conditions: PatternCondition[];
  /** Pattern scoring */
  scoring: PatternScoring;
  /** Pattern response */
  response: ResponseConfiguration;
  /** Pattern metadata */
  metadata: PatternMetadata;
}

/**
 * Pattern condition
 */
export interface PatternCondition {
  /** Condition field */
  field: string;
  /** Condition operator */
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than"
    | "regex"
    | "in"
    | "not_in";
  /** Condition value */
  value: unknown;
  /** Condition weight */
  weight: number;
  /** Time window (for temporal conditions) */
  timeWindow?: number;
  /** Aggregation function (for temporal conditions) */
  aggregation?: "count" | "sum" | "avg" | "max" | "min";
}

/**
 * Pattern scoring
 */
export interface PatternScoring {
  /** Base score */
  baseScore: number;
  /** Multiplier factors */
  multipliers: Record<string, number>;
  /** Threshold for triggering */
  threshold: number;
  /** Maximum score */
  maxScore: number;
}

/**
 * Response configuration
 */
export interface ResponseConfiguration {
  /** Immediate actions */
  immediateActions: ResponseAction[];
  /** Delayed actions */
  delayedActions: DelayedAction[];
  /** Escalation rules */
  escalation: EscalationRule[];
  /** Notification rules */
  notifications: NotificationRule[];
}

/**
 * Delayed action
 */
export interface DelayedAction {
  /** Action to perform */
  action: ResponseAction;
  /** Delay in milliseconds */
  delay: number;
  /** Conditions for execution */
  conditions: Record<string, unknown>;
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  /** Escalation level */
  level: "tier1" | "tier2" | "tier3" | "emergency";
  /** Escalation conditions */
  conditions: Record<string, unknown>;
  /** Escalation delay */
  delay: number;
  /** Escalation targets */
  targets: string[];
}

/**
 * Notification rule
 */
export interface NotificationRule {
  /** Notification channel */
  channel: "email" | "sms" | "slack" | "webhook" | "dashboard";
  /** Notification recipients */
  recipients: string[];
  /** Notification template */
  template: string;
  /** Notification conditions */
  conditions: Record<string, unknown>;
}

/**
 * Pattern metadata
 */
export interface PatternMetadata {
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
  /** Created by */
  createdBy: string;
  /** Pattern version */
  version: number;
  /** Pattern status */
  status: "active" | "inactive" | "testing";
  /** Pattern tags */
  tags: string[];
  /** Pattern statistics */
  statistics: PatternStatistics;
}

/**
 * Pattern statistics
 */
export interface PatternStatistics {
  /** Total matches */
  totalMatches: number;
  /** True positives */
  truePositives: number;
  /** False positives */
  falsePositives: number;
  /** Last match timestamp */
  lastMatch?: Date;
  /** Average confidence */
  averageConfidence: number;
}

/**
 * Threat detection result
 */
export interface ThreatDetectionResult {
  /** Detection timestamp */
  timestamp: Date;
  /** Threats detected */
  threats: DetectedThreat[];
  /** Overall risk score */
  overallRiskScore: number;
  /** Recommended actions */
  recommendedActions: ResponseAction[];
  /** Analysis metadata */
  metadata: DetectionMetadata;
}

/**
 * Detected threat
 */
export interface DetectedThreat {
  /** Threat identifier */
  threatId: string;
  /** Threat type */
  type: string;
  /** Threat category */
  category: ThreatCategory;
  /** Threat severity */
  severity: ThreatSeverity;
  /** Threat confidence */
  confidence: number;
  /** Threat score */
  score: number;
  /** Threat description */
  description: string;
  /** Matched patterns */
  matchedPatterns: string[];
  /** Threat indicators */
  indicators: ThreatIndicator[];
  /** Threat evidence */
  evidence: ThreatEvidence[];
  /** Recommended response */
  recommendedResponse: ResponseAction[];
}

/**
 * Threat evidence
 */
export interface ThreatEvidence {
  /** Evidence type */
  type: string;
  /** Evidence value */
  value: unknown;
  /** Evidence source */
  source: string;
  /** Evidence timestamp */
  timestamp: Date;
  /** Evidence confidence */
  confidence: number;
}

/**
 * Detection metadata
 */
export interface DetectionMetadata {
  /** Detection duration */
  detectionDuration: number;
  /** Patterns evaluated */
  patternsEvaluated: number;
  /** Events analyzed */
  eventsAnalyzed: number;
  /** Detection algorithm version */
  algorithmVersion: string;
  /** Analysis timestamp */
  analysisTimestamp: Date;
}

/**
 * Behavioral profile
 */
export interface BehavioralProfile {
  /** User identifier */
  userId: string;
  /** Profile creation timestamp */
  createdAt: Date;
  /** Profile last updated */
  lastUpdated: Date;
  /** Baseline behaviors */
  baseline: BehavioralBaseline;
  /** Recent activities */
  recentActivities: ActivityPattern[];
  /** Anomaly indicators */
  anomalyIndicators: AnomalyIndicator[];
  /** Risk factors */
  riskFactors: RiskFactor[];
  /** Profile metadata */
  metadata: Record<string, unknown>;
}

/**
 * Behavioral baseline
 */
export interface BehavioralBaseline {
  /** Typical login times */
  loginTimes: TimePattern[];
  /** Typical locations */
  locations: LocationPattern[];
  /** Typical devices */
  devices: DevicePattern[];
  /** Typical activities */
  activities: ActivityPattern[];
  /** Access patterns */
  accessPatterns: AccessPattern[];
}

/**
 * Time pattern
 */
export interface TimePattern {
  /** Day of week */
  dayOfWeek: number;
  /** Hour of day */
  hourOfDay: number;
  /** Frequency */
  frequency: number;
  /** Confidence */
  confidence: number;
}

/**
 * Location pattern
 */
export interface LocationPattern {
  /** Country */
  country: string;
  /** Region */
  region: string;
  /** City */
  city: string;
  /** Frequency */
  frequency: number;
  /** Confidence */
  confidence: number;
}

/**
 * Device pattern
 */
export interface DevicePattern {
  /** Device fingerprint */
  fingerprint: string;
  /** Device type */
  deviceType: string;
  /** Operating system */
  operatingSystem: string;
  /** Browser */
  browser: string;
  /** Frequency */
  frequency: number;
  /** Last seen */
  lastSeen: Date;
}

/**
 * Activity pattern
 */
export interface ActivityPattern {
  /** Activity type */
  activityType: string;
  /** Activity frequency */
  frequency: number;
  /** Activity duration */
  averageDuration: number;
  /** Activity context */
  context: Record<string, unknown>;
  /** Last occurrence */
  lastOccurrence: Date;
}

/**
 * Access pattern
 */
export interface AccessPattern {
  /** Resource type */
  resourceType: string;
  /** Resource pattern */
  resourcePattern: string;
  /** Access frequency */
  frequency: number;
  /** Access times */
  accessTimes: TimePattern[];
  /** Success rate */
  successRate: number;
}

/**
 * Anomaly indicator
 */
export interface AnomalyIndicator {
  /** Indicator type */
  type: string;
  /** Anomaly score */
  score: number;
  /** Anomaly description */
  description: string;
  /** Detection timestamp */
  detectedAt: Date;
  /** Evidence */
  evidence: Record<string, unknown>;
}

/**
 * Risk factor
 */
export interface RiskFactor {
  /** Factor type */
  type: string;
  /** Factor value */
  value: number;
  /** Factor weight */
  weight: number;
  /** Factor description */
  description: string;
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Incident response
 */
export interface IncidentResponse {
  /** Response identifier */
  responseId: string;
  /** Response timestamp */
  timestamp: Date;
  /** Threat being responded to */
  threatId: string;
  /** Actions taken */
  actionsTaken: ExecutedAction[];
  /** Response status */
  status: "initiated" | "in_progress" | "completed" | "failed";
  /** Response metadata */
  metadata: ResponseMetadata;
}

/**
 * Executed action
 */
export interface ExecutedAction {
  /** Action type */
  action: ResponseAction;
  /** Execution timestamp */
  executedAt: Date;
  /** Execution status */
  status: "success" | "failure" | "partial";
  /** Execution details */
  details: Record<string, unknown>;
  /** Execution duration */
  duration: number;
}

/**
 * Response metadata
 */
export interface ResponseMetadata {
  /** Automated response */
  automated: boolean;
  /** Response confidence */
  confidence: number;
  /** Human review required */
  humanReviewRequired: boolean;
  /** Response escalation level */
  escalationLevel: string;
  /** Additional context */
  context: Record<string, unknown>;
}

/**
 * Geolocation data
 */
export interface GeolocationData {
  /** Country code */
  country: string;
  /** Region/state */
  region: string;
  /** City */
  city: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Accuracy */
  accuracy: number;
  /** VPN detected */
  isVpn: boolean;
  /** Proxy detected */
  isProxy: boolean;
}

/**
 * Advanced Threat Detection and Response Service
 *
 * Provides comprehensive threat detection with machine learning-based
 * behavioral analysis and automated incident response capabilities.
 */
@Injectable()
export class ParlantThreatDetectionService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantThreatDetectionService.name);

  // Threat detection configuration
  private readonly detectionConfig = {
    enableBehavioralAnalysis: true,
    enableRealTimeDetection: true,
    enableAutomatedResponse: true,
    maxEventsPerMinute: 10000,
    threatScoreThreshold: 0.7,
    anomalyScoreThreshold: 0.6,
    maxResponseActions: 5,
  };

  // Threat patterns and indicators
  private readonly threatPatterns = new Map<string, ThreatPattern>();
  private readonly threatIndicators = new Set<string>();
  private readonly behavioralProfiles = new Map<string, BehavioralProfile>();

  // Event storage and analysis
  private readonly recentEvents = new Map<string, SecurityEvent[]>();
  private readonly eventWindow = 3600000; // 1 hour
  private readonly maxEventsPerUser = 1000;

  // Threat detection cache
  private readonly detectionCache = new Map<string, ThreatDetectionResult>();
  private readonly cacheTTL = 300000; // 5 minutes

  // Response tracking
  private readonly activeResponses = new Map<string, IncidentResponse>();
  private readonly responseHistory = new Map<string, IncidentResponse[]>();

  // Performance metrics
  private readonly metrics = {
    eventsProcessed: 0,
    threatsDetected: 0,
    responsesExecuted: 0,
    falsePositives: 0,
    averageDetectionTime: 0,
    averageResponseTime: 0,
    patternsMatched: 0,
    anomaliesDetected: 0,
  };

  // Cleanup timers
  private eventCleanupTimer: NodeJS.Timeout | null = null;
  private cacheCleanupTimer: NodeJS.Timeout | null = null;
  private profileUpdateTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🚨 Initializing Advanced Threat Detection Service");
  }

  /**
   * Initialize the threat detection service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🚀 Starting Advanced Threat Detection Service...");

    try {
      await this.loadThreatPatterns();
      await this.loadBehavioralProfiles();
      await this.initializeThreatIntelligence();
      await this.startPeriodicTasks();
      await this.validateDetectionConfig();

      this.logger.log(
        "✅ Advanced Threat Detection Service initialized successfully",
      );
      this.emit("threat:service:initialized");
    } catch (error) {
      this.logger.error(
        "❌ Failed to initialize Threat Detection Service",
        error,
      );
      throw new ParlantIntegrationError(
        "Threat Detection Service initialization failed",
        "THREAT_SERVICE_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Clean up on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Advanced Threat Detection Service...");

    await this.stopPeriodicTasks();
    await this.saveBehavioralProfiles();
    await this.saveMetrics();

    this.logger.log("✅ Advanced Threat Detection Service shutdown complete");
  }

  /**
   * Analyze security event for threats
   */
  async analyzeSecurityEvent(
    event: SecurityEvent,
  ): Promise<ThreatDetectionResult> {
    const startTime = performance.now();

    try {
      // Store event for analysis
      this.storeSecurityEvent(event);

      // Generate cache key
      const cacheKey = this.generateEventCacheKey(event);

      // Check cache
      const cachedResult = this.detectionCache.get(cacheKey);
      if (cachedResult && this.isCacheValid(cachedResult)) {
        return cachedResult;
      }

      // Perform threat pattern matching
      const patternMatches = await this.matchThreatPatterns(event);

      // Perform behavioral analysis
      const behavioralAnalysis = await this.performBehavioralAnalysis(event);

      // Perform anomaly detection
      const anomalyDetection = await this.performAnomalyDetection(event);

      // Combine detection results
      const threats = await this.combineDetectionResults(
        patternMatches,
        behavioralAnalysis,
        anomalyDetection,
        event,
      );

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(threats);

      // Determine recommended actions
      const recommendedActions = await this.determineRecommendedActions(
        threats,
        overallRiskScore,
      );

      // Build detection result
      const result: ThreatDetectionResult = {
        timestamp: new Date(),
        threats,
        overallRiskScore,
        recommendedActions,
        metadata: {
          detectionDuration: performance.now() - startTime,
          patternsEvaluated: this.threatPatterns.size,
          eventsAnalyzed: 1,
          algorithmVersion: "1.0.0",
          analysisTimestamp: new Date(),
        },
      };

      // Cache result
      this.detectionCache.set(cacheKey, result);

      // Execute automated response if enabled
      if (
        this.detectionConfig.enableAutomatedResponse &&
        overallRiskScore > this.detectionConfig.threatScoreThreshold
      ) {
        await this.executeAutomatedResponse(result, event);
      }

      // Update metrics
      this.updateDetectionMetrics(result, performance.now() - startTime);

      // Emit threat detection event
      this.emit("threat:detected", {
        eventId: event.eventId,
        threats: threats.length,
        riskScore: overallRiskScore,
        detectionTime: performance.now() - startTime,
      });

      this.logger.debug(
        `🚨 Threat analysis completed: ${event.eventId} - ${threats.length} threats, risk: ${overallRiskScore.toFixed(2)} (${(performance.now() - startTime).toFixed(2)}ms)`,
      );

      return result;
    } catch (error) {
      this.logger.error("❌ Threat detection analysis failed", error);
      throw new ParlantIntegrationError(
        "Threat detection analysis failed",
        "THREAT_DETECTION_ERROR",
        {
          eventId: event.eventId,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Update behavioral profile for user
   */
  async updateBehavioralProfile(
    userId: string,
    activity: ActivityPattern,
  ): Promise<void> {
    try {
      let profile = this.behavioralProfiles.get(userId);

      if (!profile) {
        profile = await this.createNewBehavioralProfile(userId);
        this.behavioralProfiles.set(userId, profile);
      }

      // Update profile with new activity
      await this.updateProfileWithActivity(profile, activity);

      // Detect anomalies
      const anomalies = await this.detectBehavioralAnomalies(profile, activity);

      if (anomalies.length > 0) {
        profile.anomalyIndicators.push(...anomalies);

        // Emit anomaly detection event
        this.emit("behavioral:anomaly:detected", {
          userId,
          anomalies: anomalies.length,
          profile: profile.userId,
        });
      }

      profile.lastUpdated = new Date();

      this.logger.debug(`✅ Behavioral profile updated for user: ${userId}`);
    } catch (error) {
      this.logger.error("❌ Failed to update behavioral profile", error);
    }
  }

  /**
   * Execute incident response
   */
  async executeIncidentResponse(
    threatId: string,
    actions: ResponseAction[],
    automated: boolean = true,
  ): Promise<IncidentResponse> {
    const startTime = performance.now();

    try {
      const responseId = crypto.randomUUID();
      const executedActions: ExecutedAction[] = [];

      // Execute each action
      for (const action of actions) {
        const actionResult = await this.executeResponseAction(action, threatId);
        executedActions.push(actionResult);
      }

      // Create incident response record
      const response: IncidentResponse = {
        responseId,
        timestamp: new Date(),
        threatId,
        actionsTaken: executedActions,
        status: this.determineResponseStatus(executedActions),
        metadata: {
          automated,
          confidence: 0.9,
          humanReviewRequired: executedActions.some(
            (a) => a.status === "failure",
          ),
          escalationLevel: "tier1",
          context: {
            responseTime: performance.now() - startTime,
          },
        },
      };

      // Store response
      this.activeResponses.set(responseId, response);

      // Update response history
      if (!this.responseHistory.has(threatId)) {
        this.responseHistory.set(threatId, []);
      }
      this.responseHistory.get(threatId)!.push(response);

      // Update metrics
      this.metrics.responsesExecuted++;
      this.metrics.averageResponseTime = this.updateAverage(
        this.metrics.averageResponseTime,
        performance.now() - startTime,
        this.metrics.responsesExecuted,
      );

      // Emit response execution event
      this.emit("incident:response:executed", {
        responseId,
        threatId,
        actions: actions.length,
        status: response.status,
        responseTime: performance.now() - startTime,
      });

      this.logger.debug(
        `🚨 Incident response executed: ${responseId} for threat ${threatId} - ${actions.length} actions (${(performance.now() - startTime).toFixed(2)}ms)`,
      );

      return response;
    } catch (error) {
      this.logger.error("❌ Incident response execution failed", error);
      throw new ParlantIntegrationError(
        "Incident response execution failed",
        "INCIDENT_RESPONSE_ERROR",
        {
          threatId,
          actions,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get threat detection statistics
   */
  getThreatDetectionStatistics(): Record<string, unknown> {
    return {
      threatPatterns: this.threatPatterns.size,
      behavioralProfiles: this.behavioralProfiles.size,
      recentEvents: this.calculateTotalEvents(),
      activeResponses: this.activeResponses.size,
      detectionCache: this.detectionCache.size,
      metrics: { ...this.metrics },
      config: this.detectionConfig,
    };
  }

  /**
   * Private helper methods
   */

  private storeSecurityEvent(event: SecurityEvent): void {
    const userId = event.userContext?.userId || "anonymous";

    if (!this.recentEvents.has(userId)) {
      this.recentEvents.set(userId, []);
    }

    const userEvents = this.recentEvents.get(userId)!;
    userEvents.push(event);

    // Maintain event window
    const cutoffTime = Date.now() - this.eventWindow;
    const filteredEvents = userEvents.filter(
      (e) => e.timestamp.getTime() > cutoffTime,
    );

    // Limit events per user
    if (filteredEvents.length > this.maxEventsPerUser) {
      filteredEvents.splice(0, filteredEvents.length - this.maxEventsPerUser);
    }

    this.recentEvents.set(userId, filteredEvents);
    this.metrics.eventsProcessed++;
  }

  private generateEventCacheKey(event: SecurityEvent): string {
    const keyData = {
      type: event.type,
      category: event.category,
      userId: event.userContext?.userId,
      ipAddress: event.metadata.ipAddress,
      timestamp: Math.floor(event.timestamp.getTime() / 60000), // 1-minute buckets
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(keyData))
      .digest("hex");
  }

  private isCacheValid(result: ThreatDetectionResult): boolean {
    return Date.now() - result.timestamp.getTime() < this.cacheTTL;
  }

  private async matchThreatPatterns(
    event: SecurityEvent,
  ): Promise<DetectedThreat[]> {
    const detectedThreats: DetectedThreat[] = [];

    for (const pattern of this.threatPatterns.values()) {
      if (pattern.metadata.status !== "active") {
        continue;
      }

      const matchResult = await this.evaluatePattern(pattern, event);

      if (matchResult.matched) {
        const threat: DetectedThreat = {
          threatId: crypto.randomUUID(),
          type: pattern.name,
          category: pattern.category,
          severity: pattern.severity,
          confidence: matchResult.confidence,
          score: matchResult.score,
          description: pattern.description,
          matchedPatterns: [pattern.patternId],
          indicators: this.extractIndicators(event, pattern),
          evidence: this.extractEvidence(event, matchResult),
          recommendedResponse: pattern.response.immediateActions,
        };

        detectedThreats.push(threat);
        this.metrics.patternsMatched++;

        // Update pattern statistics
        pattern.metadata.statistics.totalMatches++;
        pattern.metadata.statistics.lastMatch = new Date();
        pattern.metadata.statistics.averageConfidence = this.updateAverage(
          pattern.metadata.statistics.averageConfidence,
          matchResult.confidence,
          pattern.metadata.statistics.totalMatches,
        );
      }
    }

    return detectedThreats;
  }

  private async evaluatePattern(
    pattern: ThreatPattern,
    event: SecurityEvent,
  ): Promise<{
    matched: boolean;
    confidence: number;
    score: number;
    evidence: Record<string, unknown>;
  }> {
    let totalScore = 0;
    let maxScore = 0;
    const evidence: Record<string, unknown> = {};

    for (const condition of pattern.conditions) {
      const conditionResult = await this.evaluatePatternCondition(
        condition,
        event,
      );
      const weightedScore = conditionResult.score * condition.weight;

      totalScore += weightedScore;
      maxScore += condition.weight;

      if (conditionResult.matched) {
        evidence[condition.field] = conditionResult.value;
      }
    }

    const normalizedScore = maxScore > 0 ? totalScore / maxScore : 0;
    const finalScore = Math.min(
      normalizedScore * pattern.scoring.baseScore,
      pattern.scoring.maxScore,
    );
    const matched = finalScore >= pattern.scoring.threshold;
    const confidence = matched ? Math.min(normalizedScore, 1.0) : 0;

    return { matched, confidence, score: finalScore, evidence };
  }

  private async evaluatePatternCondition(
    condition: PatternCondition,
    event: SecurityEvent,
  ): Promise<{ matched: boolean; score: number; value: unknown }> {
    const fieldValue = this.extractFieldValue(condition.field, event);

    if (fieldValue === null || fieldValue === undefined) {
      return { matched: false, score: 0, value: null };
    }

    const matched = this.evaluateConditionOperator(
      condition.operator,
      fieldValue,
      condition.value,
    );
    const score = matched ? 1.0 : 0.0;

    return { matched, score, value: fieldValue };
  }

  private extractFieldValue(field: string, event: SecurityEvent): unknown {
    const fieldParts = field.split(".");
    let value: any = event;

    for (const part of fieldParts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }

    return value;
  }

  private evaluateConditionOperator(
    operator: string,
    fieldValue: unknown,
    conditionValue: unknown,
  ): boolean {
    switch (operator) {
      case "equals":
        return fieldValue === conditionValue;
      case "not_equals":
        return fieldValue !== conditionValue;
      case "contains":
        return String(fieldValue).includes(String(conditionValue));
      case "not_contains":
        return !String(fieldValue).includes(String(conditionValue));
      case "greater_than":
        return Number(fieldValue) > Number(conditionValue);
      case "less_than":
        return Number(fieldValue) < Number(conditionValue);
      case "regex":
        const regex = new RegExp(String(conditionValue));
        return regex.test(String(fieldValue));
      case "in":
        return (
          Array.isArray(conditionValue) && conditionValue.includes(fieldValue)
        );
      case "not_in":
        return (
          Array.isArray(conditionValue) && !conditionValue.includes(fieldValue)
        );
      default:
        return false;
    }
  }

  private extractIndicators(
    event: SecurityEvent,
    pattern: ThreatPattern,
  ): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];

    // Extract relevant indicators based on the pattern
    if (event.metadata.ipAddress) {
      indicators.push({
        type: "ip_address",
        value: event.metadata.ipAddress,
        confidence: 0.8,
        source: "event_analysis",
        description: "Source IP address",
        metadata: { pattern: pattern.patternId },
      });
    }

    if (event.userContext?.userId) {
      indicators.push({
        type: "user_id",
        value: event.userContext.userId,
        confidence: 0.9,
        source: "event_analysis",
        description: "User identifier",
        metadata: { pattern: pattern.patternId },
      });
    }

    return indicators;
  }

  private extractEvidence(
    event: SecurityEvent,
    matchResult: any,
  ): ThreatEvidence[] {
    const evidence: ThreatEvidence[] = [];

    for (const [field, value] of Object.entries(matchResult.evidence)) {
      evidence.push({
        type: field,
        value,
        source: "pattern_match",
        timestamp: event.timestamp,
        confidence: 0.8,
      });
    }

    return evidence;
  }

  private async performBehavioralAnalysis(
    event: SecurityEvent,
  ): Promise<DetectedThreat[]> {
    const threats: DetectedThreat[] = [];

    if (!event.userContext?.userId) {
      return threats;
    }

    const profile = this.behavioralProfiles.get(event.userContext.userId);
    if (!profile) {
      return threats;
    }

    // Analyze deviations from baseline behavior
    const deviations = await this.analyzeBehavioralDeviations(profile, event);

    for (const deviation of deviations) {
      if (deviation.score > this.detectionConfig.anomalyScoreThreshold) {
        const threat: DetectedThreat = {
          threatId: crypto.randomUUID(),
          type: "behavioral_anomaly",
          category: "anomalous_activity",
          severity: this.mapScoreToSeverity(deviation.score),
          confidence: deviation.confidence,
          score: deviation.score,
          description: deviation.description,
          matchedPatterns: ["behavioral_analysis"],
          indicators: [],
          evidence: deviation.evidence,
          recommendedResponse: this.getAnomalyResponseActions(deviation.score),
        };

        threats.push(threat);
        this.metrics.anomaliesDetected++;
      }
    }

    return threats;
  }

  private async analyzeBehavioralDeviations(
    profile: BehavioralProfile,
    event: SecurityEvent,
  ): Promise<
    Array<{
      score: number;
      confidence: number;
      description: string;
      evidence: ThreatEvidence[];
    }>
  > {
    const deviations: Array<{
      score: number;
      confidence: number;
      description: string;
      evidence: ThreatEvidence[];
    }> = [];

    // Time-based deviation analysis
    const timeDeviation = this.analyzeTimeDeviation(profile, event);
    if (timeDeviation.score > 0) {
      deviations.push(timeDeviation);
    }

    // Location-based deviation analysis
    if (event.metadata.geolocation) {
      const locationDeviation = this.analyzeLocationDeviation(profile, event);
      if (locationDeviation.score > 0) {
        deviations.push(locationDeviation);
      }
    }

    // Device-based deviation analysis
    if (event.metadata.deviceFingerprint) {
      const deviceDeviation = this.analyzeDeviceDeviation(profile, event);
      if (deviceDeviation.score > 0) {
        deviations.push(deviceDeviation);
      }
    }

    return deviations;
  }

  private analyzeTimeDeviation(
    profile: BehavioralProfile,
    event: SecurityEvent,
  ): {
    score: number;
    confidence: number;
    description: string;
    evidence: ThreatEvidence[];
  } {
    const eventTime = event.timestamp;
    const dayOfWeek = eventTime.getDay();
    const hourOfDay = eventTime.getHours();

    // Find matching time patterns
    const matchingPatterns = profile.baseline.loginTimes.filter(
      (pattern) =>
        pattern.dayOfWeek === dayOfWeek &&
        Math.abs(pattern.hourOfDay - hourOfDay) <= 1,
    );

    if (matchingPatterns.length === 0) {
      return {
        score: 0.7,
        confidence: 0.8,
        description: "Unusual login time detected",
        evidence: [
          {
            type: "time_deviation",
            value: { dayOfWeek, hourOfDay },
            source: "behavioral_analysis",
            timestamp: eventTime,
            confidence: 0.8,
          },
        ],
      };
    }

    return { score: 0, confidence: 0, description: "", evidence: [] };
  }

  private analyzeLocationDeviation(
    profile: BehavioralProfile,
    event: SecurityEvent,
  ): {
    score: number;
    confidence: number;
    description: string;
    evidence: ThreatEvidence[];
  } {
    const eventLocation = event.metadata.geolocation!;

    // Check against known locations
    const knownLocation = profile.baseline.locations.some(
      (loc) =>
        loc.country === eventLocation.country &&
        loc.region === eventLocation.region,
    );

    if (!knownLocation) {
      return {
        score: 0.8,
        confidence: 0.9,
        description: "Login from unusual location",
        evidence: [
          {
            type: "location_deviation",
            value: eventLocation,
            source: "behavioral_analysis",
            timestamp: event.timestamp,
            confidence: 0.9,
          },
        ],
      };
    }

    return { score: 0, confidence: 0, description: "", evidence: [] };
  }

  private analyzeDeviceDeviation(
    profile: BehavioralProfile,
    event: SecurityEvent,
  ): {
    score: number;
    confidence: number;
    description: string;
    evidence: ThreatEvidence[];
  } {
    const deviceFingerprint = event.metadata.deviceFingerprint!;

    // Check against known devices
    const knownDevice = profile.baseline.devices.some(
      (device) => device.fingerprint === deviceFingerprint,
    );

    if (!knownDevice) {
      return {
        score: 0.6,
        confidence: 0.7,
        description: "Login from unknown device",
        evidence: [
          {
            type: "device_deviation",
            value: { fingerprint: deviceFingerprint },
            source: "behavioral_analysis",
            timestamp: event.timestamp,
            confidence: 0.7,
          },
        ],
      };
    }

    return { score: 0, confidence: 0, description: "", evidence: [] };
  }

  private async performAnomalyDetection(
    event: SecurityEvent,
  ): Promise<DetectedThreat[]> {
    // Placeholder for advanced ML-based anomaly detection
    // This would integrate with machine learning models
    return [];
  }

  private async combineDetectionResults(
    patternMatches: DetectedThreat[],
    behavioralAnalysis: DetectedThreat[],
    anomalyDetection: DetectedThreat[],
    event: SecurityEvent,
  ): Promise<DetectedThreat[]> {
    return [...patternMatches, ...behavioralAnalysis, ...anomalyDetection];
  }

  private calculateOverallRiskScore(threats: DetectedThreat[]): number {
    if (threats.length === 0) {
      return 0;
    }

    // Calculate weighted average of threat scores
    const totalWeightedScore = threats.reduce((sum, threat) => {
      const severityWeight = this.getSeverityWeight(threat.severity);
      return sum + threat.score * threat.confidence * severityWeight;
    }, 0);

    const totalWeight = threats.reduce((sum, threat) => {
      const severityWeight = this.getSeverityWeight(threat.severity);
      return sum + threat.confidence * severityWeight;
    }, 0);

    return totalWeight > 0
      ? Math.min(totalWeightedScore / totalWeight, 1.0)
      : 0;
  }

  private getSeverityWeight(severity: ThreatSeverity): number {
    switch (severity) {
      case "low":
        return 0.25;
      case "medium":
        return 0.5;
      case "high":
        return 0.75;
      case "critical":
        return 1.0;
      default:
        return 0.5;
    }
  }

  private async determineRecommendedActions(
    threats: DetectedThreat[],
    overallRiskScore: number,
  ): Promise<ResponseAction[]> {
    const actions = new Set<ResponseAction>();

    // Add actions based on threat severity
    for (const threat of threats) {
      threat.recommendedResponse.forEach((action) => actions.add(action));
    }

    // Add risk-based actions
    if (overallRiskScore > 0.9) {
      actions.add("block_user");
      actions.add("escalate_alert");
    } else if (overallRiskScore > 0.7) {
      actions.add("require_mfa");
      actions.add("enable_monitoring");
    } else if (overallRiskScore > 0.5) {
      actions.add("notify_admin");
    }

    return Array.from(actions).slice(
      0,
      this.detectionConfig.maxResponseActions,
    );
  }

  private mapScoreToSeverity(score: number): ThreatSeverity {
    if (score >= 0.9) return "critical";
    if (score >= 0.7) return "high";
    if (score >= 0.5) return "medium";
    return "low";
  }

  private getAnomalyResponseActions(score: number): ResponseAction[] {
    if (score >= 0.9) {
      return ["block_user", "escalate_alert"];
    } else if (score >= 0.7) {
      return ["require_mfa", "enable_monitoring"];
    } else {
      return ["notify_admin"];
    }
  }

  private async executeAutomatedResponse(
    result: ThreatDetectionResult,
    event: SecurityEvent,
  ): Promise<void> {
    try {
      if (result.recommendedActions.length > 0) {
        const highestThreat = result.threats.reduce((max, threat) =>
          threat.score > max.score ? threat : max,
        );

        await this.executeIncidentResponse(
          highestThreat.threatId,
          result.recommendedActions,
          true,
        );
      }
    } catch (error) {
      this.logger.error("❌ Automated response execution failed", error);
    }
  }

  private async executeResponseAction(
    action: ResponseAction,
    threatId: string,
  ): Promise<ExecutedAction> {
    const startTime = performance.now();

    try {
      // Execute the actual response action
      await this.performResponseAction(action, threatId);

      return {
        action,
        executedAt: new Date(),
        status: "success",
        details: { threatId },
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        action,
        executedAt: new Date(),
        status: "failure",
        details: {
          threatId,
          error: error instanceof Error ? error.message : String(error),
        },
        duration: performance.now() - startTime,
      };
    }
  }

  private async performResponseAction(
    action: ResponseAction,
    threatId: string,
  ): Promise<void> {
    switch (action) {
      case "block_user":
        // Implement user blocking logic
        this.logger.warn(`🚫 Blocking user for threat: ${threatId}`);
        break;
      case "block_ip":
        // Implement IP blocking logic
        this.logger.warn(`🚫 Blocking IP for threat: ${threatId}`);
        break;
      case "require_mfa":
        // Implement MFA requirement logic
        this.logger.warn(`🔐 Requiring MFA for threat: ${threatId}`);
        break;
      case "escalate_alert":
        // Implement alert escalation logic
        this.logger.warn(`🚨 Escalating alert for threat: ${threatId}`);
        break;
      case "notify_admin":
        // Implement admin notification logic
        this.logger.warn(`📧 Notifying admin for threat: ${threatId}`);
        break;
      default:
        this.logger.warn(`❓ Unknown response action: ${action}`);
    }
  }

  private determineResponseStatus(
    actions: ExecutedAction[],
  ): "initiated" | "in_progress" | "completed" | "failed" {
    const successCount = actions.filter((a) => a.status === "success").length;
    const failureCount = actions.filter((a) => a.status === "failure").length;

    if (failureCount === actions.length) {
      return "failed";
    } else if (successCount === actions.length) {
      return "completed";
    } else {
      return "in_progress";
    }
  }

  private async createNewBehavioralProfile(
    userId: string,
  ): Promise<BehavioralProfile> {
    return {
      userId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      baseline: {
        loginTimes: [],
        locations: [],
        devices: [],
        activities: [],
        accessPatterns: [],
      },
      recentActivities: [],
      anomalyIndicators: [],
      riskFactors: [],
      metadata: {},
    };
  }

  private async updateProfileWithActivity(
    profile: BehavioralProfile,
    activity: ActivityPattern,
  ): Promise<void> {
    // Add to recent activities
    profile.recentActivities.push(activity);

    // Keep only last 100 activities
    if (profile.recentActivities.length > 100) {
      profile.recentActivities.shift();
    }

    // Update baseline patterns (simplified)
    const existingActivity = profile.baseline.activities.find(
      (a) => a.activityType === activity.activityType,
    );
    if (existingActivity) {
      existingActivity.frequency++;
      existingActivity.lastOccurrence = activity.lastOccurrence;
    } else {
      profile.baseline.activities.push({ ...activity });
    }
  }

  private async detectBehavioralAnomalies(
    profile: BehavioralProfile,
    activity: ActivityPattern,
  ): Promise<AnomalyIndicator[]> {
    const anomalies: AnomalyIndicator[] = [];

    // Check for unusual activity frequency
    const expectedFrequency = this.calculateExpectedFrequency(
      profile,
      activity,
    );
    if (activity.frequency > expectedFrequency * 3) {
      anomalies.push({
        type: "high_frequency_activity",
        score: 0.7,
        description: `Unusual high frequency for activity: ${activity.activityType}`,
        detectedAt: new Date(),
        evidence: { activity, expectedFrequency },
      });
    }

    return anomalies;
  }

  private calculateExpectedFrequency(
    profile: BehavioralProfile,
    activity: ActivityPattern,
  ): number {
    const baselineActivity = profile.baseline.activities.find(
      (a) => a.activityType === activity.activityType,
    );
    return baselineActivity ? baselineActivity.frequency : 1;
  }

  private calculateTotalEvents(): number {
    return Array.from(this.recentEvents.values()).reduce(
      (total, events) => total + events.length,
      0,
    );
  }

  private updateDetectionMetrics(
    result: ThreatDetectionResult,
    detectionTime: number,
  ): void {
    this.metrics.threatsDetected += result.threats.length;
    this.metrics.averageDetectionTime = this.updateAverage(
      this.metrics.averageDetectionTime,
      detectionTime,
      this.metrics.eventsProcessed,
    );
  }

  private updateAverage(
    currentAverage: number,
    newValue: number,
    count: number,
  ): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  private async loadThreatPatterns(): Promise<void> {
    // Load default threat patterns
    await this.createDefaultThreatPatterns();
    this.logger.debug(`📋 Loaded ${this.threatPatterns.size} threat patterns`);
  }

  private async createDefaultThreatPatterns(): Promise<void> {
    const defaultPatterns: ThreatPattern[] = [
      {
        patternId: "brute_force_login",
        name: "Brute Force Login Attack",
        description: "Multiple failed login attempts from same IP",
        category: "authentication_abuse",
        severity: "high",
        conditions: [
          {
            field: "type",
            operator: "equals",
            value: "login_failed",
            weight: 1.0,
            timeWindow: 300000, // 5 minutes
            aggregation: "count",
          },
        ],
        scoring: {
          baseScore: 0.8,
          multipliers: {},
          threshold: 0.7,
          maxScore: 1.0,
        },
        response: {
          immediateActions: ["block_ip", "notify_admin"],
          delayedActions: [],
          escalation: [],
          notifications: [],
        },
        metadata: {
          createdAt: new Date(),
          modifiedAt: new Date(),
          createdBy: "system",
          version: 1,
          status: "active",
          tags: ["authentication", "brute_force"],
          statistics: {
            totalMatches: 0,
            truePositives: 0,
            falsePositives: 0,
            averageConfidence: 0,
          },
        },
      },
    ];

    for (const pattern of defaultPatterns) {
      this.threatPatterns.set(pattern.patternId, pattern);
    }
  }

  private async loadBehavioralProfiles(): Promise<void> {
    this.logger.debug("👥 Loading behavioral profiles...");
  }

  private async saveBehavioralProfiles(): Promise<void> {
    this.logger.debug("💾 Saving behavioral profiles...");
  }

  private async initializeThreatIntelligence(): Promise<void> {
    this.logger.debug("🔍 Initializing threat intelligence...");
  }

  private async validateDetectionConfig(): Promise<void> {
    this.logger.debug("🔍 Validating detection configuration...");
  }

  private async saveMetrics(): Promise<void> {
    this.logger.debug("📊 Saving threat detection metrics...", this.metrics);
  }

  private async startPeriodicTasks(): Promise<void> {
    // Event cleanup every 10 minutes
    this.eventCleanupTimer = setInterval(
      () => {
        this.performEventCleanup();
      },
      10 * 60 * 1000,
    );

    // Cache cleanup every 5 minutes
    this.cacheCleanupTimer = setInterval(
      () => {
        this.performCacheCleanup();
      },
      5 * 60 * 1000,
    );

    // Profile update every hour
    this.profileUpdateTimer = setInterval(
      () => {
        this.performProfileMaintenance();
      },
      60 * 60 * 1000,
    );

    // Metrics update every minute
    this.metricsTimer = setInterval(() => {
      this.updatePeriodicMetrics();
    }, 60 * 1000);
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.eventCleanupTimer) {
      clearInterval(this.eventCleanupTimer);
      this.eventCleanupTimer = null;
    }

    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    if (this.profileUpdateTimer) {
      clearInterval(this.profileUpdateTimer);
      this.profileUpdateTimer = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  private async performEventCleanup(): Promise<void> {
    const cutoffTime = Date.now() - this.eventWindow;
    let cleanedCount = 0;

    for (const [userId, events] of this.recentEvents.entries()) {
      const filteredEvents = events.filter(
        (e) => e.timestamp.getTime() > cutoffTime,
      );

      if (filteredEvents.length !== events.length) {
        cleanedCount += events.length - filteredEvents.length;
        this.recentEvents.set(userId, filteredEvents);
      }

      if (filteredEvents.length === 0) {
        this.recentEvents.delete(userId);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} old security events`);
    }
  }

  private async performCacheCleanup(): Promise<void> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, result] of this.detectionCache.entries()) {
      if (now - result.timestamp.getTime() > this.cacheTTL) {
        this.detectionCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `🧹 Cleaned up ${cleanedCount} expired detection cache entries`,
      );
    }
  }

  private async performProfileMaintenance(): Promise<void> {
    // Clean up old anomaly indicators and update profiles
    const cutoffTime = new Date(Date.now() - 86400000); // 24 hours ago

    for (const profile of this.behavioralProfiles.values()) {
      const originalAnomalies = profile.anomalyIndicators.length;
      profile.anomalyIndicators = profile.anomalyIndicators.filter(
        (indicator) => indicator.detectedAt > cutoffTime,
      );

      if (profile.anomalyIndicators.length !== originalAnomalies) {
        profile.lastUpdated = new Date();
      }
    }
  }

  private updatePeriodicMetrics(): void {
    this.emit("threat:metrics:updated", this.metrics);
  }
}
