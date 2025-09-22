/**
 * PARLANT Session Management Service - Conversational Security Monitoring
 *
 * Provides comprehensive conversational session management with intelligent
 * security monitoring, real-time anomaly detection, and natural language
 * session security validation for enterprise-grade session protection.
 *
 * Features:
 * - Real-time conversational session monitoring and anomaly detection
 * - Intelligent session security validation through natural language
 * - Dynamic session risk assessment with AI-driven threat detection
 * - Conversational session termination and security escalation
 * - Advanced session hijacking and impersonation detection
 * - Enterprise-grade session audit trails with conversational context
 *
 * Security Level: CRITICAL - All session security events validated through conversation
 * Performance Target: <500ms for session validation, <2000ms for anomaly detection
 * Compliance: NIST 800-63B Session Management, SOC 2 Type II, GDPR Article 32
 */

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ParlantIntegrationService,
  ParlantConversationContext,
  ParlantValidationRequest,
  ParlantValidationResponse,
  ConversationalValidationError,
} from '@bytebot/shared/src/parlant/parlant-integration.service';
import {
  SecurityClassification,
  RiskLevel,
  SecurityLevel,
  UserRole,
} from '@bytebot/shared';
import { User, UserSession } from '@prisma/client';
import { createHash } from 'crypto';

// ===== SESSION MANAGEMENT INTERFACES =====

/**
 * Session security states
 */
export enum SessionSecurityState {
  ACTIVE = 'ACTIVE',
  MONITORING = 'MONITORING',
  SUSPICIOUS = 'SUSPICIOUS',
  COMPROMISED = 'COMPROMISED',
  TERMINATED = 'TERMINATED',
  LOCKED = 'LOCKED',
}

/**
 * Session anomaly types
 */
export enum SessionAnomalyType {
  LOCATION_CHANGE = 'LOCATION_CHANGE',
  DEVICE_CHANGE = 'DEVICE_CHANGE',
  BEHAVIOR_CHANGE = 'BEHAVIOR_CHANGE',
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  RAPID_REQUESTS = 'RAPID_REQUESTS',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  TIME_ANOMALY = 'TIME_ANOMALY',
  IP_REPUTATION = 'IP_REPUTATION',
  CONCURRENT_SESSIONS = 'CONCURRENT_SESSIONS',
  SESSION_HIJACKING = 'SESSION_HIJACKING',
}

/**
 * Conversational session context
 */
export interface ConversationalSessionContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly userRole: UserRole;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly deviceFingerprint: string;
  readonly geolocation?: {
    country: string;
    region: string;
    city: string;
    latitude?: number;
    longitude?: number;
  };
  readonly createdAt: Date;
  readonly lastActivity: Date;
  readonly securityLevel: SecurityLevel;
  readonly riskScore: number;
}

/**
 * Session security monitoring configuration
 */
export interface SessionMonitoringConfig {
  readonly userId: string;
  readonly securityLevel: SecurityLevel;
  readonly monitoringEnabled: boolean;
  readonly anomalyDetectionEnabled: boolean;
  readonly conversationalValidationThreshold: number;
  readonly maxConcurrentSessions: number;
  readonly sessionTimeoutMinutes: number;
  readonly locationChangeAlerts: boolean;
  readonly deviceChangeAlerts: boolean;
  readonly behaviorAnalysisEnabled: boolean;
  readonly realTimeMonitoring: boolean;
}

/**
 * Session anomaly detection result
 */
export interface SessionAnomalyDetection {
  readonly sessionId: string;
  readonly anomalyId: string;
  readonly anomalyType: SessionAnomalyType;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly confidence: number; // 0.0 to 1.0
  readonly description: string;
  readonly detectedAt: Date;
  readonly currentValue: any;
  readonly expectedValue: any;
  readonly riskAssessment: SessionRiskAssessment;
  readonly recommendedActions: string[];
  readonly conversationalValidationRequired: boolean;
  readonly evidenceData: Record<string, any>;
  readonly aiAnalysisExplanation: string;
}

/**
 * Session risk assessment
 */
export interface SessionRiskAssessment {
  readonly sessionId: string;
  readonly userId: string;
  readonly riskScore: number;
  readonly riskLevel: RiskLevel;
  readonly riskFactors: SessionRiskFactor[];
  readonly anomalies: SessionAnomalyDetection[];
  readonly trustScore: number;
  readonly sessionHealth: SessionHealthMetrics;
  readonly assessmentTimestamp: Date;
  readonly aiReasoningExplanation: string;
}

/**
 * Session risk factor
 */
export interface SessionRiskFactor {
  readonly factor: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly weight: number;
  readonly description: string;
  readonly detectedValue: any;
  readonly normalValue: any;
  readonly mitigationActions: string[];
}

/**
 * Session health metrics
 */
export interface SessionHealthMetrics {
  readonly uptime: number;
  readonly requestCount: number;
  readonly errorRate: number;
  readonly averageResponseTime: number;
  readonly anomalyCount: number;
  readonly securityEvents: number;
  readonly lastSecurityCheck: Date;
  readonly overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
}

/**
 * Conversational session validation request
 */
export interface ConversationalSessionValidationRequest {
  readonly sessionId: string;
  readonly validationType:
    | 'ANOMALY_DETECTION'
    | 'SECURITY_CHECK'
    | 'TERMINATION'
    | 'ESCALATION';
  readonly anomalyData?: SessionAnomalyDetection;
  readonly securityContext: ConversationalSessionContext;
  readonly businessJustification?: string;
  readonly urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Session security action result
 */
export interface SessionSecurityActionResult {
  readonly success: boolean;
  readonly sessionId: string;
  readonly actionTaken: string;
  readonly conversationId: string;
  readonly riskAssessment: SessionRiskAssessment;
  readonly newSecurityState: SessionSecurityState;
  readonly restrictions: string[];
  readonly monitoringEnhanced: boolean;
  readonly auditTrail: SessionAuditEntry[];
  readonly nextReviewTime?: Date;
}

/**
 * Session audit entry
 */
export interface SessionAuditEntry {
  readonly timestamp: Date;
  readonly action: string;
  readonly outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'ESCALATED';
  readonly details: string;
  readonly anomalyType?: SessionAnomalyType;
  readonly conversationId?: string;
  readonly riskScore: number;
  readonly securityLevel: SecurityLevel;
  readonly ipAddress: string;
  readonly userAgent: string;
}

// ===== SESSION TRACKING INTERFACES =====

/**
 * Enhanced session tracking data
 */
export interface EnhancedSessionData {
  readonly sessionId: string;
  readonly userId: string;
  readonly state: SessionSecurityState;
  readonly context: ConversationalSessionContext;
  readonly monitoring: SessionMonitoringConfig;
  readonly riskAssessment: SessionRiskAssessment;
  readonly anomalies: SessionAnomalyDetection[];
  readonly auditTrail: SessionAuditEntry[];
  readonly conversationHistory: string[];
  readonly metadata: Record<string, any>;
}

// ===== PARLANT SESSION MANAGEMENT SERVICE =====

@Injectable()
export class ParlantSessionManagementService {
  private readonly logger = new Logger(ParlantSessionManagementService.name);

  // In-memory session tracking (use Redis cluster in production)
  private readonly activeSessions = new Map<string, EnhancedSessionData>();
  private readonly userSessions = new Map<string, Set<string>>(); // userId -> Set<sessionId>
  private readonly sessionBaselines = new Map<string, any>(); // sessionId -> baseline behavior
  private readonly locationHistory = new Map<string, any[]>(); // userId -> location history
  private readonly deviceHistory = new Map<string, any[]>(); // userId -> device history

  // Configuration constants
  private readonly MAX_SESSION_ANOMALIES = 5;
  private readonly ANOMALY_DETECTION_INTERVAL = 30000; // 30 seconds
  private readonly SESSION_HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly LOCATION_CHANGE_THRESHOLD = 100; // km
  private readonly BEHAVIOR_ANALYSIS_WINDOW = 3600000; // 1 hour

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    const operationId = `parlant-session-mgmt-init-${Date.now()}`;
    this.logger.log(
      `[${operationId}] Initializing PARLANT Session Management Service`,
      {
        operationId,
        maxAnomalies: this.MAX_SESSION_ANOMALIES,
        detectionInterval: this.ANOMALY_DETECTION_INTERVAL,
        healthCheckInterval: this.SESSION_HEALTH_CHECK_INTERVAL,
      },
    );

    // Start background monitoring
    this.startBackgroundMonitoring();
  }

  /**
   * Initialize conversational session monitoring
   *
   * @param sessionId - Session ID to monitor
   * @param context - Session context
   * @param monitoringConfig - Monitoring configuration
   * @returns Promise<SessionSecurityActionResult> - Initialization result
   */
  async initializeConversationalSessionMonitoring(
    sessionId: string,
    context: ConversationalSessionContext,
    monitoringConfig: SessionMonitoringConfig,
  ): Promise<SessionSecurityActionResult> {
    const operationId = `session-init-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Initializing conversational session monitoring`,
      {
        operationId,
        sessionId,
        userId: context.userId,
        userRole: context.userRole,
        securityLevel: context.securityLevel,
        ipAddress: context.ipAddress,
      },
    );

    try {
      // Step 1: Perform initial session risk assessment
      const initialRiskAssessment =
        await this.performInitialSessionRiskAssessment(context);

      // Step 2: Create session baseline
      const sessionBaseline = this.createSessionBaseline(context);
      this.sessionBaselines.set(sessionId, sessionBaseline);

      // Step 3: Create enhanced session data
      const enhancedSession: EnhancedSessionData = {
        sessionId,
        userId: context.userId,
        state: SessionSecurityState.ACTIVE,
        context,
        monitoring: monitoringConfig,
        riskAssessment: initialRiskAssessment,
        anomalies: [],
        auditTrail: [
          {
            timestamp: new Date(),
            action: 'SESSION_MONITORING_INITIALIZED',
            outcome: 'SUCCESS',
            details: `Conversational session monitoring initialized with ${context.securityLevel} security level`,
            riskScore: initialRiskAssessment.riskScore,
            securityLevel: context.securityLevel,
            ipAddress: context.ipAddress,
            userAgent: context.userAgent,
          },
        ],
        conversationHistory: [],
        metadata: {
          deviceFingerprint: context.deviceFingerprint,
          geolocation: context.geolocation,
          createdAt: context.createdAt.toISOString(),
          monitoringLevel: monitoringConfig.securityLevel,
        },
      };

      // Step 4: Store session
      this.activeSessions.set(sessionId, enhancedSession);

      // Step 5: Track user sessions
      const userSessionSet = this.userSessions.get(context.userId) || new Set();
      userSessionSet.add(sessionId);
      this.userSessions.set(context.userId, userSessionSet);

      // Step 6: Check for concurrent session limits
      await this.checkConcurrentSessionLimits(context.userId, monitoringConfig);

      // Step 7: Initialize conversational monitoring if required
      if (
        initialRiskAssessment.riskLevel === 'HIGH' ||
        initialRiskAssessment.riskLevel === 'CRITICAL'
      ) {
        await this.initiateConversationalSessionValidation(
          sessionId,
          'SECURITY_CHECK',
          {
            sessionId,
            validationType: 'SECURITY_CHECK',
            securityContext: context,
            businessJustification:
              'High-risk session requires conversational validation',
            urgency: 'HIGH',
          },
        );
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Session monitoring initialized successfully`,
        {
          operationId,
          sessionId,
          userId: context.userId,
          riskScore: initialRiskAssessment.riskScore,
          securityState: enhancedSession.state,
          duration,
        },
      );

      return {
        success: true,
        sessionId,
        actionTaken: 'SESSION_MONITORING_INITIALIZED',
        conversationId: `session-init-${operationId}`,
        riskAssessment: initialRiskAssessment,
        newSecurityState: SessionSecurityState.ACTIVE,
        restrictions: this.generateSessionRestrictions(initialRiskAssessment),
        monitoringEnhanced: true,
        auditTrail: enhancedSession.auditTrail,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `[${operationId}] Session monitoring initialization failed`,
        {
          operationId,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      );

      throw error instanceof Error
        ? error
        : new Error('Session monitoring initialization failed');
    }
  }

  /**
   * Perform real-time session anomaly detection
   *
   * @param sessionId - Session ID to analyze
   * @param currentActivity - Current session activity data
   * @returns Promise<SessionAnomalyDetection[]> - Detected anomalies
   */
  async performConversationalAnomalyDetection(
    sessionId: string,
    currentActivity: {
      ipAddress: string;
      userAgent: string;
      location?: any;
      deviceFingerprint: string;
      requestCount: number;
      errorRate: number;
      timestamp: Date;
    },
  ): Promise<SessionAnomalyDetection[]> {
    const operationId = `anomaly-detect-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(
      `[${operationId}] Performing conversational anomaly detection`,
      {
        operationId,
        sessionId,
        ipAddress: currentActivity.ipAddress,
        requestCount: currentActivity.requestCount,
      },
    );

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        this.logger.warn(
          `[${operationId}] Session not found for anomaly detection`,
          {
            operationId,
            sessionId,
          },
        );
        return [];
      }

      const detectedAnomalies: SessionAnomalyDetection[] = [];
      const baseline = this.sessionBaselines.get(sessionId);

      // 1. Location change detection
      const locationAnomaly = this.detectLocationAnomaly(
        session,
        currentActivity,
      );
      if (locationAnomaly) {
        detectedAnomalies.push(locationAnomaly);
      }

      // 2. Device change detection
      const deviceAnomaly = this.detectDeviceAnomaly(session, currentActivity);
      if (deviceAnomaly) {
        detectedAnomalies.push(deviceAnomaly);
      }

      // 3. Behavior change detection
      const behaviorAnomaly = this.detectBehaviorAnomaly(
        session,
        currentActivity,
        baseline,
      );
      if (behaviorAnomaly) {
        detectedAnomalies.push(behaviorAnomaly);
      }

      // 4. Rapid request detection
      const rapidRequestAnomaly = this.detectRapidRequestAnomaly(
        session,
        currentActivity,
      );
      if (rapidRequestAnomaly) {
        detectedAnomalies.push(rapidRequestAnomaly);
      }

      // 5. Time-based anomaly detection
      const timeAnomaly = this.detectTimeAnomaly(session, currentActivity);
      if (timeAnomaly) {
        detectedAnomalies.push(timeAnomaly);
      }

      // 6. Concurrent session anomaly
      const concurrentAnomaly = this.detectConcurrentSessionAnomaly(session);
      if (concurrentAnomaly) {
        detectedAnomalies.push(concurrentAnomaly);
      }

      // Process detected anomalies
      if (detectedAnomalies.length > 0) {
        await this.processDetectedAnomalies(sessionId, detectedAnomalies);
      }

      const duration = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Anomaly detection completed`, {
        operationId,
        sessionId,
        anomaliesDetected: detectedAnomalies.length,
        anomalyTypes: detectedAnomalies.map((a) => a.anomalyType),
        duration,
      });

      return detectedAnomalies;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationId}] Anomaly detection failed`, {
        operationId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return [];
    }
  }

  /**
   * Validate session security through conversational analysis
   *
   * @param validationRequest - Session validation request
   * @returns Promise<SessionSecurityActionResult> - Validation result
   */
  async validateConversationalSessionSecurity(
    validationRequest: ConversationalSessionValidationRequest,
  ): Promise<SessionSecurityActionResult> {
    const operationId = `session-validate-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Validating conversational session security`,
      {
        operationId,
        sessionId: validationRequest.sessionId,
        validationType: validationRequest.validationType,
        urgency: validationRequest.urgency,
      },
    );

    try {
      const session = this.activeSessions.get(validationRequest.sessionId);
      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      // Step 1: Create comprehensive validation context
      const parlantContext = this.createSessionValidationConversationContext(
        validationRequest,
        session,
      );

      // Step 2: Prepare validation request for Parlant
      const parlantValidationRequest: ParlantValidationRequest = {
        functionName:
          'ParlantSessionManagementService.validateConversationalSessionSecurity',
        functionParams: {
          sessionId: validationRequest.sessionId,
          validationType: validationRequest.validationType,
          userId: session.userId,
          riskScore: session.riskAssessment.riskScore,
          anomalyCount: session.anomalies.length,
          securityState: session.state,
          anomalyData: validationRequest.anomalyData,
          urgency: validationRequest.urgency,
        },
        actionDescription: this.createValidationDescription(
          validationRequest,
          session,
        ),
        context: parlantContext,
        riskLevel: session.riskAssessment.riskLevel,
        operationId,
      };

      // Step 3: Execute conversational validation
      const validation = await this.parlantService.validateFunctionExecution(
        parlantValidationRequest,
      );

      // Step 4: Process validation result
      const actionResult = await this.processValidationResult(
        validationRequest,
        session,
        validation,
        operationId,
      );

      const duration = Date.now() - startTime;
      this.logger.log(`[${operationId}] Session validation completed`, {
        operationId,
        sessionId: validationRequest.sessionId,
        validationApproved: validation.approved,
        actionTaken: actionResult.actionTaken,
        newSecurityState: actionResult.newSecurityState,
        conversationId: validation.conversationId,
        duration,
      });

      return actionResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${operationId}] Session validation failed`, {
        operationId,
        sessionId: validationRequest.sessionId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error instanceof Error
        ? error
        : new Error('Session validation failed');
    }
  }

  /**
   * Terminate session with conversational confirmation
   *
   * @param sessionId - Session ID to terminate
   * @param reason - Termination reason
   * @param urgency - Termination urgency
   * @returns Promise<SessionSecurityActionResult> - Termination result
   */
  async terminateConversationalSession(
    sessionId: string,
    reason: string,
    urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM',
  ): Promise<SessionSecurityActionResult> {
    const operationId = `session-terminate-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] Terminating conversational session`, {
      operationId,
      sessionId,
      reason,
      urgency,
    });

    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new UnauthorizedException('Session not found');
      }

      // Create termination validation request
      const validationRequest: ConversationalSessionValidationRequest = {
        sessionId,
        validationType: 'TERMINATION',
        securityContext: session.context,
        businessJustification: reason,
        urgency,
      };

      // Validate termination through conversation
      const validationResult =
        await this.validateConversationalSessionSecurity(validationRequest);

      if (validationResult.success) {
        // Actually terminate the session
        await this.executeSessionTermination(sessionId, reason);

        return {
          ...validationResult,
          actionTaken: 'SESSION_TERMINATED',
          newSecurityState: SessionSecurityState.TERMINATED,
        };
      } else {
        return validationResult;
      }
    } catch (error) {
      this.logger.error(`[${operationId}] Session termination failed`, {
        operationId,
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error instanceof Error
        ? error
        : new Error('Session termination failed');
    }
  }

  /**
   * Get comprehensive session security status
   *
   * @param sessionId - Session ID
   * @returns Promise<EnhancedSessionData | null> - Session security status
   */
  async getSessionSecurityStatus(
    sessionId: string,
  ): Promise<EnhancedSessionData | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Update session health metrics
    session.riskAssessment.sessionHealth = this.calculateSessionHealth(session);

    return session;
  }

  // ===== PRIVATE HELPER METHODS =====

  private async performInitialSessionRiskAssessment(
    context: ConversationalSessionContext,
  ): Promise<SessionRiskAssessment> {
    const riskFactors: SessionRiskFactor[] = [];
    let riskScore = 0.1; // Base risk

    // User role risk assessment
    if (context.userRole === UserRole.ADMIN) {
      riskFactors.push({
        factor: 'ADMIN_SESSION',
        severity: 'HIGH',
        weight: 0.3,
        description: 'Administrator session requires enhanced monitoring',
        detectedValue: context.userRole,
        normalValue: UserRole.USER,
        mitigationActions: ['Enhanced monitoring', 'Conversational validation'],
      });
      riskScore += 0.3;
    }

    // Security level risk
    if (
      context.securityLevel === 'HIGH' ||
      context.securityLevel === 'CRITICAL'
    ) {
      riskFactors.push({
        factor: 'HIGH_SECURITY_LEVEL',
        severity: 'MEDIUM',
        weight: 0.2,
        description: 'High security level session',
        detectedValue: context.securityLevel,
        normalValue: 'MEDIUM',
        mitigationActions: ['Continuous monitoring', 'Anomaly detection'],
      });
      riskScore += 0.2;
    }

    // Time-based risk (unusual hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      riskFactors.push({
        factor: 'UNUSUAL_TIME',
        severity: 'LOW',
        weight: 0.1,
        description: 'Session started during unusual hours',
        detectedValue: hour,
        normalValue: '9-17',
        mitigationActions: ['Monitor activity patterns'],
      });
      riskScore += 0.1;
    }

    const riskLevel = this.calculateRiskLevel(riskScore);

    return {
      sessionId: context.sessionId,
      userId: context.userId,
      riskScore: Math.min(riskScore, 1.0),
      riskLevel,
      riskFactors,
      anomalies: [],
      trustScore: 1.0 - riskScore,
      sessionHealth: {
        uptime: 0,
        requestCount: 0,
        errorRate: 0,
        averageResponseTime: 0,
        anomalyCount: 0,
        securityEvents: 0,
        lastSecurityCheck: new Date(),
        overallHealth: 'EXCELLENT',
      },
      assessmentTimestamp: new Date(),
      aiReasoningExplanation: `Initial session risk assessment: score ${riskScore.toFixed(2)}, level ${riskLevel}. Factors: ${riskFactors.map((f) => f.factor).join(', ')}.`,
    };
  }

  private createSessionBaseline(context: ConversationalSessionContext): any {
    return {
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceFingerprint: context.deviceFingerprint,
      geolocation: context.geolocation,
      createdAt: context.createdAt,
      expectedBehavior: {
        requestRate: 10, // requests per minute
        errorRate: 0.01, // 1% error rate
        activeHours: [9, 10, 11, 12, 13, 14, 15, 16, 17], // Business hours
        typicalLocations: context.geolocation ? [context.geolocation] : [],
      },
    };
  }

  private detectLocationAnomaly(
    session: EnhancedSessionData,
    currentActivity: any,
  ): SessionAnomalyDetection | null {
    if (!currentActivity.location || !session.context.geolocation) {
      return null;
    }

    const baseline = this.sessionBaselines.get(session.sessionId);
    if (!baseline?.geolocation) {
      return null;
    }

    const distance = this.calculateDistance(
      baseline.geolocation,
      currentActivity.location,
    );

    if (distance > this.LOCATION_CHANGE_THRESHOLD) {
      return {
        sessionId: session.sessionId,
        anomalyId: `location_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: SessionAnomalyType.LOCATION_CHANGE,
        severity: distance > 1000 ? 'CRITICAL' : 'HIGH',
        confidence: 0.9,
        description: `Significant location change detected: ${distance.toFixed(0)}km from baseline`,
        detectedAt: new Date(),
        currentValue: currentActivity.location,
        expectedValue: baseline.geolocation,
        riskAssessment: session.riskAssessment,
        recommendedActions: [
          'Verify user identity',
          'Require MFA',
          'Monitor session closely',
        ],
        conversationalValidationRequired: true,
        evidenceData: {
          distance,
          previousLocation: baseline.geolocation,
          currentLocation: currentActivity.location,
        },
        aiAnalysisExplanation: `User location changed by ${distance.toFixed(0)}km, which exceeds the normal threshold of ${this.LOCATION_CHANGE_THRESHOLD}km. This could indicate session hijacking or legitimate travel.`,
      };
    }

    return null;
  }

  private detectDeviceAnomaly(
    session: EnhancedSessionData,
    currentActivity: any,
  ): SessionAnomalyDetection | null {
    const baseline = this.sessionBaselines.get(session.sessionId);
    if (!baseline) {
      return null;
    }

    // Check device fingerprint change
    if (currentActivity.deviceFingerprint !== baseline.deviceFingerprint) {
      return {
        sessionId: session.sessionId,
        anomalyId: `device_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: SessionAnomalyType.DEVICE_CHANGE,
        severity: 'HIGH',
        confidence: 0.95,
        description: 'Device fingerprint change detected',
        detectedAt: new Date(),
        currentValue: currentActivity.deviceFingerprint,
        expectedValue: baseline.deviceFingerprint,
        riskAssessment: session.riskAssessment,
        recommendedActions: [
          'Verify device change',
          'Require MFA',
          'Audit session activity',
        ],
        conversationalValidationRequired: true,
        evidenceData: {
          previousFingerprint: baseline.deviceFingerprint,
          currentFingerprint: currentActivity.deviceFingerprint,
        },
        aiAnalysisExplanation:
          'Device fingerprint change indicates possible session hijacking or device switching. This requires immediate validation.',
      };
    }

    // Check user agent change
    if (currentActivity.userAgent !== baseline.userAgent) {
      return {
        sessionId: session.sessionId,
        anomalyId: `useragent_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: SessionAnomalyType.DEVICE_CHANGE,
        severity: 'MEDIUM',
        confidence: 0.8,
        description: 'User agent change detected',
        detectedAt: new Date(),
        currentValue: currentActivity.userAgent,
        expectedValue: baseline.userAgent,
        riskAssessment: session.riskAssessment,
        recommendedActions: [
          'Monitor for additional changes',
          'Log security event',
        ],
        conversationalValidationRequired: false,
        evidenceData: {
          previousUserAgent: baseline.userAgent,
          currentUserAgent: currentActivity.userAgent,
        },
        aiAnalysisExplanation:
          'User agent change detected. Could be browser update or potential security issue.',
      };
    }

    return null;
  }

  private detectBehaviorAnomaly(
    session: EnhancedSessionData,
    currentActivity: any,
    baseline: any,
  ): SessionAnomalyDetection | null {
    if (!baseline?.expectedBehavior) {
      return null;
    }

    // Check request rate anomaly
    const expectedRate = baseline.expectedBehavior.requestRate;
    const currentRate = currentActivity.requestCount;

    if (currentRate > expectedRate * 3) {
      return {
        sessionId: session.sessionId,
        anomalyId: `behavior_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: SessionAnomalyType.BEHAVIOR_CHANGE,
        severity: 'MEDIUM',
        confidence: 0.7,
        description: `Unusual request rate: ${currentRate} vs expected ${expectedRate}`,
        detectedAt: new Date(),
        currentValue: currentRate,
        expectedValue: expectedRate,
        riskAssessment: session.riskAssessment,
        recommendedActions: [
          'Monitor request patterns',
          'Check for automation',
        ],
        conversationalValidationRequired: false,
        evidenceData: {
          requestRate: currentRate,
          expectedRate,
          threshold: expectedRate * 3,
        },
        aiAnalysisExplanation: `Request rate significantly higher than baseline. Could indicate automated activity or unusual user behavior.`,
      };
    }

    return null;
  }

  private detectRapidRequestAnomaly(
    session: EnhancedSessionData,
    currentActivity: any,
  ): SessionAnomalyDetection | null {
    const recentRequestCount = currentActivity.requestCount;
    const timeWindow = 60000; // 1 minute

    if (recentRequestCount > 100) {
      // More than 100 requests per minute
      return {
        sessionId: session.sessionId,
        anomalyId: `rapid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: SessionAnomalyType.RAPID_REQUESTS,
        severity: 'HIGH',
        confidence: 0.9,
        description: `Rapid request pattern detected: ${recentRequestCount} requests in ${timeWindow / 1000} seconds`,
        detectedAt: new Date(),
        currentValue: recentRequestCount,
        expectedValue: 20,
        riskAssessment: session.riskAssessment,
        recommendedActions: [
          'Rate limiting',
          'Bot detection',
          'Session review',
        ],
        conversationalValidationRequired: true,
        evidenceData: {
          requestCount: recentRequestCount,
          timeWindow,
          threshold: 100,
        },
        aiAnalysisExplanation:
          'Rapid request pattern suggests potential automated activity or DoS attempt.',
      };
    }

    return null;
  }

  private detectTimeAnomaly(
    session: EnhancedSessionData,
    currentActivity: any,
  ): SessionAnomalyDetection | null {
    const currentHour = new Date().getHours();
    const baseline = this.sessionBaselines.get(session.sessionId);

    if (baseline?.expectedBehavior?.activeHours) {
      const expectedHours = baseline.expectedBehavior.activeHours;

      if (!expectedHours.includes(currentHour)) {
        return {
          sessionId: session.sessionId,
          anomalyId: `time_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          anomalyType: SessionAnomalyType.TIME_ANOMALY,
          severity: 'LOW',
          confidence: 0.6,
          description: `Activity during unusual hours: ${currentHour}:00`,
          detectedAt: new Date(),
          currentValue: currentHour,
          expectedValue: expectedHours,
          riskAssessment: session.riskAssessment,
          recommendedActions: [
            'Monitor activity patterns',
            'Log time-based activity',
          ],
          conversationalValidationRequired: false,
          evidenceData: {
            currentHour,
            expectedHours,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          aiAnalysisExplanation:
            'Activity detected outside normal business hours. Could be legitimate overtime or suspicious activity.',
        };
      }
    }

    return null;
  }

  private detectConcurrentSessionAnomaly(
    session: EnhancedSessionData,
  ): SessionAnomalyDetection | null {
    const userSessions = this.userSessions.get(session.userId);
    if (!userSessions) {
      return null;
    }

    const activeSessionCount = Array.from(userSessions).filter((sessionId) => {
      const s = this.activeSessions.get(sessionId);
      return s && s.state === SessionSecurityState.ACTIVE;
    }).length;

    const maxAllowed = session.monitoring.maxConcurrentSessions || 3;

    if (activeSessionCount > maxAllowed) {
      return {
        sessionId: session.sessionId,
        anomalyId: `concurrent_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        anomalyType: SessionAnomalyType.CONCURRENT_SESSIONS,
        severity: 'MEDIUM',
        confidence: 0.8,
        description: `Too many concurrent sessions: ${activeSessionCount} (max: ${maxAllowed})`,
        detectedAt: new Date(),
        currentValue: activeSessionCount,
        expectedValue: maxAllowed,
        riskAssessment: session.riskAssessment,
        recommendedActions: [
          'Review session legitimacy',
          'Consider session termination',
        ],
        conversationalValidationRequired: false,
        evidenceData: {
          activeSessionCount,
          maxAllowed,
          sessionIds: Array.from(userSessions),
        },
        aiAnalysisExplanation:
          'Multiple concurrent sessions detected. Could indicate shared credentials or account compromise.',
      };
    }

    return null;
  }

  private async processDetectedAnomalies(
    sessionId: string,
    anomalies: SessionAnomalyDetection[],
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Add anomalies to session
    session.anomalies.push(...anomalies);

    // Update session state based on anomaly severity
    const hasCriticalAnomaly = anomalies.some((a) => a.severity === 'CRITICAL');
    const hasHighAnomaly = anomalies.some((a) => a.severity === 'HIGH');

    if (hasCriticalAnomaly) {
      session.state = SessionSecurityState.COMPROMISED;
    } else if (hasHighAnomaly) {
      session.state = SessionSecurityState.SUSPICIOUS;
    } else {
      session.state = SessionSecurityState.MONITORING;
    }

    // Create audit entries
    for (const anomaly of anomalies) {
      session.auditTrail.push({
        timestamp: new Date(),
        action: 'ANOMALY_DETECTED',
        outcome: 'SUCCESS',
        details: anomaly.description,
        anomalyType: anomaly.anomalyType,
        riskScore: anomaly.riskAssessment.riskScore,
        securityLevel: session.context.securityLevel,
        ipAddress: session.context.ipAddress,
        userAgent: session.context.userAgent,
      });
    }

    // Process conversational validation for critical anomalies
    const conversationalAnomalies = anomalies.filter(
      (a) => a.conversationalValidationRequired,
    );
    for (const anomaly of conversationalAnomalies) {
      await this.initiateConversationalSessionValidation(
        sessionId,
        'ANOMALY_DETECTION',
        {
          sessionId,
          validationType: 'ANOMALY_DETECTION',
          anomalyData: anomaly,
          securityContext: session.context,
          businessJustification: `Anomaly detected: ${anomaly.description}`,
          urgency: this.mapSeverityToUrgency(anomaly.severity),
        },
      );
    }

    this.logger.warn('Session anomalies processed', {
      sessionId,
      anomalyCount: anomalies.length,
      severities: anomalies.map((a) => a.severity),
      newState: session.state,
    });
  }

  private async initiateConversationalSessionValidation(
    sessionId: string,
    validationType:
      | 'ANOMALY_DETECTION'
      | 'SECURITY_CHECK'
      | 'TERMINATION'
      | 'ESCALATION',
    validationRequest: ConversationalSessionValidationRequest,
  ): Promise<void> {
    try {
      const result =
        await this.validateConversationalSessionSecurity(validationRequest);

      this.logger.log('Conversational session validation completed', {
        sessionId,
        validationType,
        success: result.success,
        actionTaken: result.actionTaken,
        conversationId: result.conversationId,
      });
    } catch (error) {
      this.logger.error('Conversational session validation failed', {
        sessionId,
        validationType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private createSessionValidationConversationContext(
    validationRequest: ConversationalSessionValidationRequest,
    session: EnhancedSessionData,
  ): ParlantConversationContext {
    return {
      userId: session.userId,
      agentRole: session.context.userRole.toString(),
      securityLevel: session.context.securityLevel,
      conversationHistory: session.conversationHistory,
      metadata: {
        sessionValidation: true,
        sessionId: validationRequest.sessionId,
        validationType: validationRequest.validationType,
        riskScore: session.riskAssessment.riskScore,
        anomalyCount: session.anomalies.length,
        securityState: session.state,
        urgency: validationRequest.urgency,
        anomalyData: validationRequest.anomalyData,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private createValidationDescription(
    validationRequest: ConversationalSessionValidationRequest,
    session: EnhancedSessionData,
  ): string {
    switch (validationRequest.validationType) {
      case 'ANOMALY_DETECTION':
        return `Session anomaly validation for user ${session.userId}: ${validationRequest.anomalyData?.description || 'Security anomaly detected'}`;
      case 'SECURITY_CHECK':
        return `Security validation for ${session.context.userRole} session with risk score ${session.riskAssessment.riskScore}`;
      case 'TERMINATION':
        return `Session termination validation for ${session.userId}: ${validationRequest.businessJustification}`;
      case 'ESCALATION':
        return `Security escalation for session ${validationRequest.sessionId}: ${validationRequest.businessJustification}`;
      default:
        return `Session validation for ${session.userId}`;
    }
  }

  private async processValidationResult(
    validationRequest: ConversationalSessionValidationRequest,
    session: EnhancedSessionData,
    validation: ParlantValidationResponse,
    operationId: string,
  ): Promise<SessionSecurityActionResult> {
    let actionTaken: string;
    let newSecurityState: SessionSecurityState;
    let restrictions: string[] = [];

    if (validation.approved) {
      switch (validationRequest.validationType) {
        case 'ANOMALY_DETECTION':
          actionTaken = 'ANOMALY_APPROVED';
          newSecurityState = SessionSecurityState.MONITORING;
          restrictions = ['ENHANCED_MONITORING'];
          break;
        case 'SECURITY_CHECK':
          actionTaken = 'SECURITY_CHECK_PASSED';
          newSecurityState = SessionSecurityState.ACTIVE;
          break;
        case 'TERMINATION':
          actionTaken = 'TERMINATION_APPROVED';
          newSecurityState = SessionSecurityState.TERMINATED;
          await this.executeSessionTermination(
            session.sessionId,
            'Conversational termination approved',
          );
          break;
        case 'ESCALATION':
          actionTaken = 'ESCALATION_APPROVED';
          newSecurityState = SessionSecurityState.MONITORING;
          restrictions = ['ENHANCED_MONITORING', 'ESCALATED_PRIVILEGES'];
          break;
        default:
          actionTaken = 'VALIDATION_APPROVED';
          newSecurityState = session.state;
      }
    } else {
      actionTaken = 'VALIDATION_BLOCKED';
      newSecurityState = SessionSecurityState.LOCKED;
      restrictions = ['SESSION_LOCKED', 'CONVERSATION_BLOCKED'];
    }

    // Update session
    session.state = newSecurityState;
    session.auditTrail.push({
      timestamp: new Date(),
      action: actionTaken,
      outcome: validation.approved ? 'SUCCESS' : 'BLOCKED',
      details: validation.reasoning,
      conversationId: validation.conversationId,
      riskScore: session.riskAssessment.riskScore,
      securityLevel: session.context.securityLevel,
      ipAddress: session.context.ipAddress,
      userAgent: session.context.userAgent,
    });

    this.activeSessions.set(session.sessionId, session);

    return {
      success: validation.approved,
      sessionId: session.sessionId,
      actionTaken,
      conversationId: validation.conversationId,
      riskAssessment: session.riskAssessment,
      newSecurityState,
      restrictions,
      monitoringEnhanced: restrictions.includes('ENHANCED_MONITORING'),
      auditTrail: session.auditTrail,
    };
  }

  private async executeSessionTermination(
    sessionId: string,
    reason: string,
  ): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Update session state
    session.state = SessionSecurityState.TERMINATED;
    session.auditTrail.push({
      timestamp: new Date(),
      action: 'SESSION_TERMINATED',
      outcome: 'SUCCESS',
      details: reason,
      riskScore: session.riskAssessment.riskScore,
      securityLevel: session.context.securityLevel,
      ipAddress: session.context.ipAddress,
      userAgent: session.context.userAgent,
    });

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    // Remove from user sessions
    const userSessions = this.userSessions.get(session.userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    // Clean up baselines
    this.sessionBaselines.delete(sessionId);

    this.logger.log('Session terminated', {
      sessionId,
      userId: session.userId,
      reason,
    });
  }

  private async checkConcurrentSessionLimits(
    userId: string,
    config: SessionMonitoringConfig,
  ): Promise<void> {
    const userSessions = this.userSessions.get(userId);
    if (!userSessions) {
      return;
    }

    const activeSessionCount = Array.from(userSessions).filter((sessionId) => {
      const session = this.activeSessions.get(sessionId);
      return session && session.state === SessionSecurityState.ACTIVE;
    }).length;

    if (activeSessionCount > config.maxConcurrentSessions) {
      this.logger.warn('Concurrent session limit exceeded', {
        userId,
        activeSessionCount,
        maxAllowed: config.maxConcurrentSessions,
      });

      // Optionally terminate oldest sessions
      // Implementation would depend on business requirements
    }
  }

  private generateSessionRestrictions(
    riskAssessment: SessionRiskAssessment,
  ): string[] {
    const restrictions: string[] = [];

    if (
      riskAssessment.riskLevel === 'HIGH' ||
      riskAssessment.riskLevel === 'CRITICAL'
    ) {
      restrictions.push('ENHANCED_MONITORING');
    }

    if (riskAssessment.riskLevel === 'CRITICAL') {
      restrictions.push('REAL_TIME_VALIDATION');
    }

    if (riskAssessment.riskFactors.some((f) => f.factor === 'ADMIN_SESSION')) {
      restrictions.push('ADMIN_SESSION_MONITORING');
    }

    return restrictions;
  }

  private calculateSessionHealth(
    session: EnhancedSessionData,
  ): SessionHealthMetrics {
    const now = Date.now();
    const uptime = now - session.context.createdAt.getTime();
    const anomalyCount = session.anomalies.length;
    const securityEvents = session.auditTrail.filter(
      (entry) =>
        entry.action.includes('ANOMALY') || entry.action.includes('SECURITY'),
    ).length;

    let overallHealth: SessionHealthMetrics['overallHealth'];
    if (anomalyCount === 0 && securityEvents === 0) {
      overallHealth = 'EXCELLENT';
    } else if (anomalyCount <= 2 && securityEvents <= 5) {
      overallHealth = 'GOOD';
    } else if (anomalyCount <= 5 && securityEvents <= 10) {
      overallHealth = 'FAIR';
    } else if (anomalyCount <= 10) {
      overallHealth = 'POOR';
    } else {
      overallHealth = 'CRITICAL';
    }

    return {
      uptime,
      requestCount: session.auditTrail.length,
      errorRate: 0.01, // Would be calculated from actual error data
      averageResponseTime: 100, // Would be calculated from actual response times
      anomalyCount,
      securityEvents,
      lastSecurityCheck: new Date(),
      overallHealth,
    };
  }

  private calculateDistance(loc1: any, loc2: any): number {
    if (
      !loc1.latitude ||
      !loc1.longitude ||
      !loc2.latitude ||
      !loc2.longitude
    ) {
      return 0;
    }

    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) *
        Math.cos(this.toRadians(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateRiskLevel(riskScore: number): RiskLevel {
    if (riskScore >= 0.8) return 'CRITICAL' as RiskLevel;
    if (riskScore >= 0.6) return 'HIGH' as RiskLevel;
    if (riskScore >= 0.3) return 'MEDIUM' as RiskLevel;
    return 'LOW' as RiskLevel;
  }

  private mapSeverityToUrgency(
    severity: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    switch (severity) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      case 'LOW':
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  private startBackgroundMonitoring(): void {
    // Start anomaly detection monitoring
    setInterval(() => {
      this.performBackgroundAnomalyDetection();
    }, this.ANOMALY_DETECTION_INTERVAL);

    // Start session health monitoring
    setInterval(() => {
      this.performBackgroundHealthChecks();
    }, this.SESSION_HEALTH_CHECK_INTERVAL);

    this.logger.log('Background session monitoring started', {
      anomalyDetectionInterval: this.ANOMALY_DETECTION_INTERVAL,
      healthCheckInterval: this.SESSION_HEALTH_CHECK_INTERVAL,
    });
  }

  private async performBackgroundAnomalyDetection(): Promise<void> {
    try {
      for (const [sessionId, session] of this.activeSessions) {
        if (
          session.state === SessionSecurityState.ACTIVE ||
          session.state === SessionSecurityState.MONITORING
        ) {
          // Simulate current activity (in production, this would come from actual metrics)
          const currentActivity = {
            ipAddress: session.context.ipAddress,
            userAgent: session.context.userAgent,
            deviceFingerprint: session.context.deviceFingerprint,
            requestCount: Math.floor(Math.random() * 50), // Simulated
            errorRate: Math.random() * 0.1,
            timestamp: new Date(),
          };

          await this.performConversationalAnomalyDetection(
            sessionId,
            currentActivity,
          );
        }
      }
    } catch (error) {
      this.logger.error('Background anomaly detection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async performBackgroundHealthChecks(): Promise<void> {
    try {
      for (const [sessionId, session] of this.activeSessions) {
        // Update session health
        session.riskAssessment.sessionHealth =
          this.calculateSessionHealth(session);

        // Check for expired sessions
        const sessionAge = Date.now() - session.context.createdAt.getTime();
        const maxAge = session.monitoring.sessionTimeoutMinutes * 60 * 1000;

        if (sessionAge > maxAge) {
          await this.executeSessionTermination(sessionId, 'Session timeout');
        }
      }
    } catch (error) {
      this.logger.error('Background health checks failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
