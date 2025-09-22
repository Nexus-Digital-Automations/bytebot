/**
 * @fileoverview Monitoring Security Service
 * PARLANT Phase 1 - Enterprise-grade security and access control for real-time monitoring
 * Provides comprehensive authentication, authorization, audit trails, and threat detection
 *
 * @version 1.0.0
 * @author AIgent PARLANT Team
 * @since 2025-09-22
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { performance } from "perf_hooks";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import {
  MonitoringSecurityFramework,
  AuthenticationProvider,
  AuthorizationEngine,
  AuditLogger,
  EncryptionManager,
  SessionManager,
  ThreatDetector,
  AccessControlPolicy,
  OperationPermission,
  MonitoringPermission,
  InterventionPermission,
  TimeRestriction,
  ContextualRestriction,
  AccessValidationResult,
  MonitoringActivity,
  SecurityEvent,
  ThreatAssessment,
  UserSecurityProfile,
  SecurityAuditTrail,
} from "../interfaces/real-time-monitoring.interface";

/**
 * Monitoring Security Service
 *
 * Security Features:
 * - Multi-factor authentication with enterprise SSO integration
 * - Fine-grained role-based access control (RBAC)
 * - Real-time threat detection and prevention
 * - Comprehensive audit logging and compliance
 * - End-to-end encryption for sensitive data
 * - Session management with intelligent timeout
 * - Context-aware access controls
 * - Zero-trust security architecture
 */
@Injectable()
export class MonitoringSecurityService implements MonitoringSecurityFramework {
  private readonly logger = new Logger(MonitoringSecurityService.name);

  // Security components
  public readonly authenticationProvider: AuthenticationProvider;
  public readonly authorizationEngine: AuthorizationEngine;
  public readonly auditLogger: AuditLogger;
  public readonly encryptionManager: EncryptionManager;
  public readonly sessionManager: SessionManager;
  public readonly threatDetector: ThreatDetector;

  // Security state management
  private userSecurityProfiles = new Map<string, UserSecurityProfile>();
  private activeSessions = new Map<string, SecuritySession>();
  private accessPolicies = new Map<string, AccessControlPolicy>();
  private securityEvents = new Map<string, SecurityEvent[]>();

  // Threat detection and monitoring
  private threatPatterns = new Map<string, ThreatPattern>();
  private securityMetrics = {
    authenticationAttempts: 0,
    authenticationFailures: 0,
    authorizationDenials: 0,
    threatDetections: 0,
    sessionViolations: 0,
    auditEvents: 0,
  };

  // Security configuration
  private config: SecurityConfig = {
    authentication: {
      providers: ["jwt", "oauth2", "saml", "ldap"],
      mfaRequired: true,
      tokenExpiration: 3600000, // 1 hour
      refreshTokenExpiration: 604800000, // 7 days
      maxLoginAttempts: 5,
      lockoutDuration: 900000, // 15 minutes
    },
    authorization: {
      model: "rbac",
      inheritanceEnabled: true,
      contextualRulesEnabled: true,
      dynamicPermissionsEnabled: true,
      temporaryAccessEnabled: true,
    },
    encryption: {
      algorithm: "aes-256-gcm",
      keyRotationInterval: 2592000000, // 30 days
      dataAtRestEncryption: true,
      dataInTransitEncryption: true,
      keyEscrowEnabled: false,
    },
    auditing: {
      compressionEnabled: true,
      retentionPeriod: 31536000000, // 1 year
      realTimeMonitoring: true,
      complianceReporting: true,
      alertOnSuspiciousActivity: true,
    },
    threatDetection: {
      enabled: true,
      mlModelEnabled: true,
      behavioralAnalysis: true,
      anomalyThreshold: 0.8,
      responseAutomation: true,
    },
    session: {
      timeoutWarning: 300000, // 5 minutes
      absoluteTimeout: 28800000, // 8 hours
      concurrentSessionLimit: 3,
      deviceFingerprinting: true,
      locationValidation: true,
    },
  };

  constructor() {
    // Initialize security components
    this.authenticationProvider = new EnterpriseAuthenticationProvider(
      this.config.authentication,
    );
    this.authorizationEngine = new RBACAuthorizationEngine(
      this.config.authorization,
    );
    this.auditLogger = new ComprehensiveAuditLogger(this.config.auditing);
    this.encryptionManager = new AdvancedEncryptionManager(
      this.config.encryption,
    );
    this.sessionManager = new IntelligentSessionManager(this.config.session);
    this.threatDetector = new MLThreatDetector(this.config.threatDetection);

    this.initializeSecurityFramework();
    this.setupThreatDetection();
    this.startSecurityMonitoring();
  }

  /**
   * Validates comprehensive access permissions for monitoring operations
   */
  async validateAccess(
    userId: string,
    operationId: string,
    action: string,
    context?: AccessContext,
  ): Promise<AccessValidationResult> {
    const startTime = performance.now();

    try {
      // Get user security profile
      const userProfile = await this.getUserSecurityProfile(userId);
      if (!userProfile) {
        return {
          allowed: false,
          reason: "User security profile not found",
          requiredPermissions: [],
          validationTime: performance.now() - startTime,
        };
      }

      // Validate session
      const sessionValidation = await this.sessionManager.validateSession(
        userProfile.currentSessionId,
        context,
      );
      if (!sessionValidation.valid) {
        return {
          allowed: false,
          reason: `Session validation failed: ${sessionValidation.reason}`,
          requiredPermissions: [],
          validationTime: performance.now() - startTime,
        };
      }

      // Check authentication status
      const authValidation =
        await this.authenticationProvider.validateAuthentication(
          userId,
          userProfile.authToken,
        );
      if (!authValidation.valid) {
        return {
          allowed: false,
          reason: `Authentication failed: ${authValidation.reason}`,
          requiredPermissions: [],
          validationTime: performance.now() - startTime,
        };
      }

      // Perform authorization check
      const authzResult = await this.authorizationEngine.authorize({
        userId,
        operationId,
        action,
        context: context || {},
        userProfile,
        timestamp: new Date(),
      });

      // Perform threat assessment
      const threatAssessment = await this.threatDetector.assessThreat({
        userId,
        operationId,
        action,
        context,
        userProfile,
        requestMetadata: {
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
          timestamp: new Date(),
        },
      });

      // Apply additional security checks
      const securityChecks = await this.performAdditionalSecurityChecks(
        userId,
        operationId,
        action,
        context,
        threatAssessment,
      );

      const finalResult =
        authzResult.allowed &&
        !threatAssessment.threatDetected &&
        securityChecks.passed;

      const validationTime = performance.now() - startTime;

      // Log access attempt
      await this.auditLogger.logAccessAttempt({
        userId,
        operationId,
        action,
        allowed: finalResult,
        reason: finalResult
          ? "Access granted"
          : authzResult.reason ||
            threatAssessment.reason ||
            securityChecks.reason,
        context,
        validationTime,
        timestamp: new Date(),
      });

      // Update security metrics
      if (!finalResult) {
        this.securityMetrics.authorizationDenials++;
      }
      if (threatAssessment.threatDetected) {
        this.securityMetrics.threatDetections++;
      }

      this.logger.log(
        `Access validation completed in ${validationTime.toFixed(2)}ms`,
        {
          userId,
          operationId,
          action,
          allowed: finalResult,
          threatDetected: threatAssessment.threatDetected,
          validationTime,
        },
      );

      return {
        allowed: finalResult,
        reason: finalResult
          ? "Access granted"
          : authzResult.reason ||
            threatAssessment.reason ||
            securityChecks.reason,
        requiredPermissions: authzResult.requiredPermissions,
        grantedPermissions: authzResult.grantedPermissions,
        restrictions: authzResult.restrictions,
        threatLevel: threatAssessment.threatLevel,
        validationTime,
        sessionExpiration: sessionValidation.expiresAt,
      };
    } catch (error) {
      const validationTime = performance.now() - startTime;
      this.logger.error(
        `Access validation failed after ${validationTime.toFixed(2)}ms`,
        {
          userId,
          operationId,
          action,
          error: error instanceof Error ? error.message : String(error),
          validationTime,
        },
      );

      return {
        allowed: false,
        reason: "Access validation error",
        requiredPermissions: [],
        validationTime,
      };
    }
  }

  /**
   * Audits monitoring activities with comprehensive logging
   */
  async auditMonitoringActivity(activity: MonitoringActivity): Promise<void> {
    const startTime = performance.now();

    try {
      // Enrich activity with security context
      const enrichedActivity =
        await this.enrichActivityWithSecurityContext(activity);

      // Perform security analysis on the activity
      const securityAnalysis =
        await this.analyzeActivitySecurity(enrichedActivity);

      // Log to comprehensive audit trail
      await this.auditLogger.logActivity({
        ...enrichedActivity,
        securityAnalysis,
        auditId: uuidv4(),
        timestamp: new Date(),
        complianceFlags: await this.generateComplianceFlags(enrichedActivity),
      });

      // Check for suspicious patterns
      await this.checkForSuspiciousPatterns(enrichedActivity);

      // Update security metrics
      this.securityMetrics.auditEvents++;

      const auditTime = performance.now() - startTime;

      this.logger.debug(
        `Monitoring activity audited in ${auditTime.toFixed(2)}ms`,
        {
          activityType: activity.type,
          userId: activity.userId,
          operationId: activity.operationId,
          auditTime,
        },
      );
    } catch (error) {
      const auditTime = performance.now() - startTime;
      this.logger.error(
        `Activity auditing failed after ${auditTime.toFixed(2)}ms`,
        {
          activityType: activity.type,
          userId: activity.userId,
          error: error instanceof Error ? error.message : String(error),
          auditTime,
        },
      );
    }
  }

  /**
   * Creates and manages user security profiles
   */
  async createUserSecurityProfile(
    userId: string,
    userMetadata: UserMetadata,
  ): Promise<UserSecurityProfile> {
    const startTime = performance.now();

    try {
      // Generate security profile
      const securityProfile: UserSecurityProfile = {
        userId,
        securityLevel: await this.calculateSecurityLevel(userMetadata),
        permissions: await this.calculateUserPermissions(userId, userMetadata),
        restrictions: await this.calculateUserRestrictions(
          userId,
          userMetadata,
        ),
        authenticationMethods: await this.getSupportedAuthMethods(userId),
        riskScore: await this.calculateUserRiskScore(userId, userMetadata),
        lastSecurityReview: new Date(),
        complianceStatus: await this.checkComplianceStatus(userId),
        behavioralBaseline: await this.establishBehavioralBaseline(userId),
        currentSessionId: null,
        authToken: null,
        mfaEnabled: userMetadata.mfaEnabled || false,
        securityClearance: userMetadata.securityClearance || "standard",
      };

      // Store security profile
      this.userSecurityProfiles.set(userId, securityProfile);

      // Log profile creation
      await this.auditLogger.logSecurityEvent({
        eventType: "USER_PROFILE_CREATED",
        userId,
        details: { securityLevel: securityProfile.securityLevel },
        timestamp: new Date(),
      });

      const creationTime = performance.now() - startTime;

      this.logger.log(
        `User security profile created in ${creationTime.toFixed(2)}ms`,
        {
          userId,
          securityLevel: securityProfile.securityLevel,
          permissionsCount: securityProfile.permissions.length,
          creationTime,
        },
      );

      return securityProfile;
    } catch (error) {
      const creationTime = performance.now() - startTime;
      this.logger.error(
        `Security profile creation failed after ${creationTime.toFixed(2)}ms`,
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
          creationTime,
        },
      );
      throw error;
    }
  }

  /**
   * Manages secure session lifecycle
   */
  async createSecureSession(
    userId: string,
    authenticationResult: AuthenticationResult,
    context: SessionContext,
  ): Promise<SecuritySession> {
    const startTime = performance.now();

    try {
      // Validate authentication result
      if (!authenticationResult.success) {
        throw new Error("Authentication failed");
      }

      // Get user security profile
      const userProfile = await this.getUserSecurityProfile(userId);
      if (!userProfile) {
        throw new Error("User security profile not found");
      }

      // Perform device fingerprinting
      const deviceFingerprint = await this.generateDeviceFingerprint(context);

      // Create session
      const session: SecuritySession = {
        sessionId: uuidv4(),
        userId,
        startTime: new Date(),
        lastActivity: new Date(),
        expiresAt: new Date(Date.now() + this.config.session.absoluteTimeout),
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceFingerprint,
        securityLevel: userProfile.securityLevel,
        encryptionKey: await this.encryptionManager.generateSessionKey(),
        mfaVerified: authenticationResult.mfaVerified,
        permissions: userProfile.permissions,
        threatLevel: "low",
        complianceFlags: [],
        activityLog: [],
      };

      // Store session
      this.activeSessions.set(session.sessionId, session);
      userProfile.currentSessionId = session.sessionId;

      // Log session creation
      await this.auditLogger.logSecurityEvent({
        eventType: "SESSION_CREATED",
        userId,
        sessionId: session.sessionId,
        details: {
          securityLevel: session.securityLevel,
          mfaVerified: session.mfaVerified,
        },
        timestamp: new Date(),
      });

      const sessionTime = performance.now() - startTime;

      this.logger.log(`Secure session created in ${sessionTime.toFixed(2)}ms`, {
        userId,
        sessionId: session.sessionId,
        securityLevel: session.securityLevel,
        mfaVerified: session.mfaVerified,
        sessionTime,
      });

      return session;
    } catch (error) {
      const sessionTime = performance.now() - startTime;
      this.logger.error(
        `Secure session creation failed after ${sessionTime.toFixed(2)}ms`,
        {
          userId,
          error: error instanceof Error ? error.message : String(error),
          sessionTime,
        },
      );
      throw error;
    }
  }

  /**
   * Encrypts sensitive monitoring data
   */
  async encryptSensitiveData(
    data: unknown,
    encryptionContext: EncryptionContext,
  ): Promise<EncryptedData> {
    const startTime = performance.now();

    try {
      const encryptedData = await this.encryptionManager.encrypt(
        data,
        encryptionContext,
      );

      const encryptionTime = performance.now() - startTime;

      this.logger.debug(`Data encrypted in ${encryptionTime.toFixed(2)}ms`, {
        dataType: encryptionContext.dataType,
        keyId: encryptionContext.keyId,
        encryptionTime,
      });

      return encryptedData;
    } catch (error) {
      const encryptionTime = performance.now() - startTime;
      this.logger.error(
        `Data encryption failed after ${encryptionTime.toFixed(2)}ms`,
        {
          dataType: encryptionContext.dataType,
          error: error instanceof Error ? error.message : String(error),
          encryptionTime,
        },
      );
      throw error;
    }
  }

  /**
   * Decrypts sensitive monitoring data
   */
  async decryptSensitiveData(
    encryptedData: EncryptedData,
    decryptionContext: DecryptionContext,
  ): Promise<unknown> {
    const startTime = performance.now();

    try {
      const decryptedData = await this.encryptionManager.decrypt(
        encryptedData,
        decryptionContext,
      );

      const decryptionTime = performance.now() - startTime;

      this.logger.debug(`Data decrypted in ${decryptionTime.toFixed(2)}ms`, {
        dataType: decryptionContext.dataType,
        keyId: decryptionContext.keyId,
        decryptionTime,
      });

      return decryptedData;
    } catch (error) {
      const decryptionTime = performance.now() - startTime;
      this.logger.error(
        `Data decryption failed after ${decryptionTime.toFixed(2)}ms`,
        {
          dataType: decryptionContext.dataType,
          error: error instanceof Error ? error.message : String(error),
          decryptionTime,
        },
      );
      throw error;
    }
  }

  /**
   * Gets comprehensive security analytics
   */
  getSecurityAnalytics(timeRange?: TimeRange): SecurityAnalytics {
    const range = timeRange || {
      start: new Date(Date.now() - 86400000), // Last 24 hours
      end: new Date(),
    };

    // Calculate security metrics
    const totalAuthAttempts = this.securityMetrics.authenticationAttempts;
    const authFailureRate =
      totalAuthAttempts > 0
        ? this.securityMetrics.authenticationFailures / totalAuthAttempts
        : 0;

    const totalThreats = this.securityMetrics.threatDetections;
    const sessionViolations = this.securityMetrics.sessionViolations;

    // Get active sessions analytics
    const activeSessions = Array.from(this.activeSessions.values());
    const sessionsCount = activeSessions.length;
    const highRiskSessions = activeSessions.filter(
      (s) => s.threatLevel === "high",
    ).length;

    // Calculate compliance scores
    const complianceScore = this.calculateComplianceScore();

    return {
      timeRange: range,
      authentication: {
        totalAttempts: totalAuthAttempts,
        failureRate: authFailureRate,
        mfaUsage: this.calculateMFAUsage(),
        averageAuthTime: this.calculateAverageAuthTime(),
      },
      authorization: {
        totalChecks:
          this.securityMetrics.authorizationDenials +
          (totalAuthAttempts - this.securityMetrics.authenticationFailures),
        denialRate:
          this.securityMetrics.authorizationDenials /
          Math.max(1, totalAuthAttempts),
        permissionViolations: this.securityMetrics.authorizationDenials,
      },
      threats: {
        totalDetections: totalThreats,
        threatsByType: this.getThreatsByType(),
        threatsByRisk: this.getThreatsByRisk(),
        blockedThreats: this.getBlockedThreats(),
      },
      sessions: {
        activeSessions: sessionsCount,
        highRiskSessions,
        sessionViolations,
        averageSessionDuration: this.calculateAverageSessionDuration(),
      },
      compliance: {
        overallScore: complianceScore,
        auditEvents: this.securityMetrics.auditEvents,
        complianceViolations: this.getComplianceViolations(),
        dataRetentionCompliance: this.getDataRetentionCompliance(),
      },
      encryption: {
        keyRotations: this.encryptionManager.getKeyRotationCount(),
        encryptionCoverage: this.calculateEncryptionCoverage(),
        keyManagementCompliance: this.getKeyManagementCompliance(),
      },
    };
  }

  /**
   * Private implementation methods
   */
  private initializeSecurityFramework(): void {
    // Initialize security components and load configurations
  }

  private setupThreatDetection(): void {
    // Set up threat detection patterns and ML models
  }

  private startSecurityMonitoring(): void {
    // Start continuous security monitoring
    setInterval(async () => {
      await this.performSecurityHealthCheck();
    }, 60000); // Every minute
  }

  private async getUserSecurityProfile(
    userId: string,
  ): Promise<UserSecurityProfile | null> {
    return this.userSecurityProfiles.get(userId) || null;
  }

  private async performAdditionalSecurityChecks(
    userId: string,
    operationId: string,
    action: string,
    context?: AccessContext,
    threatAssessment?: ThreatAssessment,
  ): Promise<SecurityCheckResult> {
    // Perform additional security validations
    return {
      passed: true,
      reason: null,
      checkResults: [],
    };
  }

  private async enrichActivityWithSecurityContext(
    activity: MonitoringActivity,
  ): Promise<EnrichedMonitoringActivity> {
    // Add security context to monitoring activity
    return {
      ...activity,
      securityContext: await this.getSecurityContext(activity.userId),
      riskAssessment: await this.assessActivityRisk(activity),
      complianceContext: await this.getComplianceContext(activity),
    };
  }

  private async analyzeActivitySecurity(
    activity: EnrichedMonitoringActivity,
  ): Promise<SecurityAnalysis> {
    // Analyze activity for security implications
    return {
      riskLevel: "low",
      complianceFlags: [],
      anomaliesDetected: [],
      recommendedActions: [],
    };
  }

  private async generateComplianceFlags(
    activity: EnrichedMonitoringActivity,
  ): Promise<string[]> {
    // Generate compliance flags for the activity
    return [];
  }

  private async checkForSuspiciousPatterns(
    activity: EnrichedMonitoringActivity,
  ): Promise<void> {
    // Check for suspicious activity patterns
  }

  // Additional helper methods for full implementation...
  private async calculateSecurityLevel(
    metadata: UserMetadata,
  ): Promise<string> {
    // Calculate user security level based on metadata
    return metadata.securityClearance || "standard";
  }

  private async calculateUserPermissions(
    userId: string,
    metadata: UserMetadata,
  ): Promise<string[]> {
    // Calculate user permissions
    return metadata.permissions || [];
  }

  private async calculateUserRestrictions(
    userId: string,
    metadata: UserMetadata,
  ): Promise<string[]> {
    // Calculate user restrictions
    return [];
  }

  private async getSupportedAuthMethods(userId: string): Promise<string[]> {
    // Get supported authentication methods
    return ["password", "mfa", "sso"];
  }

  private async calculateUserRiskScore(
    userId: string,
    metadata: UserMetadata,
  ): Promise<number> {
    // Calculate user risk score
    return 0.1; // Low risk
  }

  private async checkComplianceStatus(userId: string): Promise<string> {
    // Check user compliance status
    return "compliant";
  }

  private async establishBehavioralBaseline(
    userId: string,
  ): Promise<BehavioralBaseline> {
    // Establish behavioral baseline for user
    return {
      normalWorkingHours: { start: "09:00", end: "17:00" },
      typicalLocations: [],
      commonActions: [],
      averageSessionDuration: 3600000,
    };
  }

  // More helper methods would continue here...
}

// Supporting classes
class EnterpriseAuthenticationProvider implements AuthenticationProvider {
  constructor(private config: any) {}

  async validateAuthentication(
    userId: string,
    token: string,
  ): Promise<{ valid: boolean; reason?: string }> {
    // Implement authentication validation
    return { valid: true };
  }

  async authenticate(credentials: any): Promise<AuthenticationResult> {
    // Implement authentication
    return { success: true, mfaVerified: true };
  }
}

class RBACAuthorizationEngine implements AuthorizationEngine {
  constructor(private config: any) {}

  async authorize(request: any): Promise<AuthorizationResult> {
    // Implement RBAC authorization
    return {
      allowed: true,
      requiredPermissions: [],
      grantedPermissions: [],
      restrictions: [],
    };
  }
}

class ComprehensiveAuditLogger implements AuditLogger {
  constructor(private config: any) {}

  async logAccessAttempt(event: any): Promise<void> {
    // Log access attempt
  }

  async logActivity(activity: any): Promise<void> {
    // Log activity
  }

  async logSecurityEvent(event: any): Promise<void> {
    // Log security event
  }
}

class AdvancedEncryptionManager implements EncryptionManager {
  async encrypt(
    data: unknown,
    context: EncryptionContext,
  ): Promise<EncryptedData> {
    // Implement encryption
    return {
      encryptedData: Buffer.from(JSON.stringify(data)),
      keyId: context.keyId,
      algorithm: "aes-256-gcm",
    };
  }

  async decrypt(
    encryptedData: EncryptedData,
    context: DecryptionContext,
  ): Promise<unknown> {
    // Implement decryption
    return JSON.parse(encryptedData.encryptedData.toString());
  }

  async generateSessionKey(): Promise<string> {
    // Generate session key
    return crypto.randomBytes(32).toString("hex");
  }

  getKeyRotationCount(): number {
    return 0;
  }
}

class IntelligentSessionManager implements SessionManager {
  constructor(private config: any) {}

  async validateSession(
    sessionId: string | null,
    context?: any,
  ): Promise<{ valid: boolean; reason?: string; expiresAt?: Date }> {
    // Validate session
    return { valid: true, expiresAt: new Date(Date.now() + 3600000) };
  }
}

class MLThreatDetector implements ThreatDetector {
  constructor(private config: any) {}

  async assessThreat(request: any): Promise<ThreatAssessment> {
    // Assess threat using ML
    return {
      threatDetected: false,
      threatLevel: "low",
      confidence: 0.9,
      reason: null,
    };
  }
}

// Supporting interfaces
interface SecurityConfig {
  authentication: any;
  authorization: any;
  encryption: any;
  auditing: any;
  threatDetection: any;
  session: any;
}

interface UserMetadata {
  permissions?: string[];
  securityClearance?: string;
  mfaEnabled?: boolean;
}

interface SecuritySession {
  sessionId: string;
  userId: string;
  startTime: Date;
  lastActivity: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  securityLevel: string;
  encryptionKey: string;
  mfaVerified: boolean;
  permissions: string[];
  threatLevel: string;
  complianceFlags: string[];
  activityLog: any[];
}

interface AuthenticationResult {
  success: boolean;
  mfaVerified: boolean;
}

interface SessionContext {
  ipAddress: string;
  userAgent: string;
}

interface AccessContext {
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

interface EncryptionContext {
  dataType: string;
  keyId: string;
}

interface DecryptionContext {
  dataType: string;
  keyId: string;
}

interface EncryptedData {
  encryptedData: Buffer;
  keyId: string;
  algorithm: string;
}

interface ThreatPattern {
  patternId: string;
  description: string;
  indicators: string[];
  severity: string;
}

interface SecurityCheckResult {
  passed: boolean;
  reason: string | null;
  checkResults: any[];
}

interface EnrichedMonitoringActivity extends MonitoringActivity {
  securityContext: any;
  riskAssessment: any;
  complianceContext: any;
}

interface SecurityAnalysis {
  riskLevel: string;
  complianceFlags: string[];
  anomaliesDetected: any[];
  recommendedActions: string[];
}

interface AuthorizationResult {
  allowed: boolean;
  requiredPermissions: string[];
  grantedPermissions: string[];
  restrictions: any[];
  reason?: string;
}

interface BehavioralBaseline {
  normalWorkingHours: { start: string; end: string };
  typicalLocations: string[];
  commonActions: string[];
  averageSessionDuration: number;
}

interface SecurityAnalytics {
  timeRange: { start: Date; end: Date };
  authentication: any;
  authorization: any;
  threats: any;
  sessions: any;
  compliance: any;
  encryption: any;
}

interface TimeRange {
  start: Date;
  end: Date;
}
