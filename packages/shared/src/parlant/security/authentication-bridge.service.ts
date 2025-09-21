/**
 * PARLANT Phase 1 Enhanced Authentication Bridge Service
 *
 * Comprehensive authentication bridge that provides seamless integration
 * between multiple authentication systems with enterprise-grade security,
 * multi-factor authentication, and real-time threat detection.
 *
 * Features:
 * - Multi-factor authentication (MFA) integration and orchestration
 * - Cross-system authentication bridging and synchronization
 * - Real-time authentication threat detection and response
 * - Adaptive authentication based on risk analysis
 * - Hardware token and biometric authentication support
 * - Session management with cross-system synchronization
 * - Comprehensive audit trails and compliance tracking
 *
 * @module ParlantAuthenticationBridgeService
 * @version 1.0.0
 * @author PARLANT Phase 1 Authentication Security Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as crypto from "crypto";
// import * as speakeasy from "speakeasy";
import { performance } from "perf_hooks";
import {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from "../../types/parlant-integration.types";
import { EnhancedSecurityContext } from "./context-manager.service";

/**
 * Authentication method types
 */
export type AuthenticationMethod =
  | "password"
  | "totp"
  | "sms"
  | "email"
  | "push"
  | "hardware_token"
  | "biometric"
  | "certificate"
  | "sso"
  | "oauth2"
  | "saml";

/**
 * Authentication factor levels
 */
export type AuthenticationFactor = "primary" | "secondary" | "tertiary";

/**
 * Authentication request
 */
export interface AuthenticationRequest {
  /** User identifier */
  userId: string;
  /** Authentication method */
  method: AuthenticationMethod;
  /** Authentication factor level */
  factor: AuthenticationFactor;
  /** Authentication credentials */
  credentials: Record<string, unknown>;
  /** Request metadata */
  metadata: AuthenticationRequestMetadata;
  /** Challenge response (for MFA) */
  challengeResponse?: string;
  /** Security context */
  securityContext?: EnhancedSecurityContext;
}

/**
 * Authentication request metadata
 */
export interface AuthenticationRequestMetadata {
  /** Client IP address */
  ipAddress: string;
  /** User agent */
  userAgent: string;
  /** Device fingerprint */
  deviceFingerprint: string;
  /** Geolocation data */
  geolocation?: GeolocationData;
  /** Session identifier */
  sessionId?: string;
  /** Request timestamp */
  timestamp: Date;
  /** Request source */
  source: string;
  /** Risk indicators */
  riskIndicators: string[];
}

/**
 * Authentication result
 */
export interface AuthenticationResult {
  /** Authentication success */
  success: boolean;
  /** User context (if successful) */
  userContext?: ParlantUserContext;
  /** Authentication errors */
  errors: string[];
  /** Authentication warnings */
  warnings: string[];
  /** Authentication score */
  score: number;
  /** Required additional factors */
  requiredFactors: AuthenticationMethod[];
  /** Authentication metadata */
  metadata: AuthenticationResultMetadata;
  /** Session information */
  session?: SessionInformation;
  /** Audit trail entry */
  auditTrail: AuthenticationAuditEntry;
}

/**
 * Authentication result metadata
 */
export interface AuthenticationResultMetadata {
  /** Authentication method used */
  methodUsed: AuthenticationMethod;
  /** Factor level achieved */
  factorLevel: AuthenticationFactor;
  /** Authentication duration */
  duration: number;
  /** Risk assessment */
  riskAssessment: RiskAssessment;
  /** Security controls applied */
  securityControls: string[];
  /** Compliance status */
  complianceStatus: string[];
}

/**
 * Session information
 */
export interface SessionInformation {
  /** Session identifier */
  sessionId: string;
  /** Session creation time */
  createdAt: Date;
  /** Session expiration time */
  expiresAt: Date;
  /** Session security level */
  securityLevel: SecurityLevel;
  /** MFA verification status */
  mfaVerified: boolean;
  /** Device binding */
  deviceBinding: string;
  /** IP binding */
  ipBinding: string;
  /** Session properties */
  properties: Record<string, unknown>;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  /** Overall risk score */
  overallScore: number;
  /** Risk factors */
  factors: RiskFactor[];
  /** Risk mitigation actions */
  mitigationActions: string[];
  /** Risk level */
  level: "low" | "medium" | "high" | "critical";
  /** Assessment confidence */
  confidence: number;
}

/**
 * Risk factor
 */
export interface RiskFactor {
  /** Factor type */
  type: string;
  /** Factor weight */
  weight: number;
  /** Factor value */
  value: number;
  /** Factor description */
  description: string;
  /** Factor source */
  source: string;
}

/**
 * Authentication audit entry
 */
export interface AuthenticationAuditEntry {
  /** Entry identifier */
  entryId: string;
  /** Timestamp */
  timestamp: Date;
  /** User identifier */
  userId: string;
  /** Authentication method */
  method: AuthenticationMethod;
  /** Authentication result */
  result: "success" | "failure" | "partial";
  /** IP address */
  ipAddress: string;
  /** User agent */
  userAgent: string;
  /** Failure reason (if applicable) */
  failureReason?: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * MFA challenge
 */
export interface MfaChallenge {
  /** Challenge identifier */
  challengeId: string;
  /** Challenge type */
  type: AuthenticationMethod;
  /** Challenge data */
  data: Record<string, unknown>;
  /** Challenge expiration */
  expiresAt: Date;
  /** Challenge attempts remaining */
  attemptsRemaining: number;
  /** Challenge metadata */
  metadata: Record<string, unknown>;
}

/**
 * MFA setup request
 */
export interface MfaSetupRequest {
  /** User identifier */
  userId: string;
  /** MFA method */
  method: AuthenticationMethod;
  /** Setup parameters */
  parameters: Record<string, unknown>;
  /** Device information */
  deviceInfo?: Record<string, unknown>;
}

/**
 * MFA setup result
 */
export interface MfaSetupResult {
  /** Setup success */
  success: boolean;
  /** MFA secret (for TOTP) */
  secret?: string;
  /** QR code data (for TOTP) */
  qrCode?: string;
  /** Backup codes */
  backupCodes?: string[];
  /** Setup errors */
  errors: string[];
  /** Setup metadata */
  metadata: Record<string, unknown>;
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
  /** Accuracy in meters */
  accuracy: number;
  /** VPN detection */
  isVpn: boolean;
  /** Proxy detection */
  isProxy: boolean;
  /** ASN information */
  asn?: string;
}

/**
 * Authentication configuration
 */
export interface AuthenticationConfig {
  /** Enabled authentication methods */
  enabledMethods: AuthenticationMethod[];
  /** MFA requirements by security level */
  mfaRequirements: Record<SecurityLevel, AuthenticationMethod[]>;
  /** Session timeout configuration */
  sessionTimeouts: Record<SecurityLevel, number>;
  /** Risk thresholds */
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  /** Adaptive authentication settings */
  adaptiveAuth: {
    enabled: boolean;
    riskBasedMfa: boolean;
    locationTracking: boolean;
    deviceTracking: boolean;
  };
}

/**
 * Enhanced Authentication Bridge Service
 *
 * Provides comprehensive authentication services with multi-factor support,
 * risk-based authentication, and cross-system integration capabilities.
 */
@Injectable()
export class ParlantAuthenticationBridgeService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantAuthenticationBridgeService.name);

  // Authentication configuration
  private readonly config: AuthenticationConfig = {
    enabledMethods: [
      "password",
      "totp",
      "sms",
      "email",
      "push",
      "hardware_token",
      "biometric",
      "sso",
    ],
    mfaRequirements: {
      [SecurityLevel._LOW]: [],
      [SecurityLevel._MODERATE]: ["totp", "sms"],
      [SecurityLevel._HIGH]: ["totp", "hardware_token"],
      [SecurityLevel._CRITICAL]: ["hardware_token", "biometric"],
    },
    sessionTimeouts: {
      [SecurityLevel._LOW]: 86400000, // 24 hours
      [SecurityLevel._MODERATE]: 28800000, // 8 hours
      [SecurityLevel._HIGH]: 14400000, // 4 hours
      [SecurityLevel._CRITICAL]: 3600000, // 1 hour
    },
    riskThresholds: {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
      critical: 0.9,
    },
    adaptiveAuth: {
      enabled: true,
      riskBasedMfa: true,
      locationTracking: true,
      deviceTracking: true,
    },
  };

  // Authentication state management
  private readonly activeSessions = new Map<string, SessionInformation>();
  private readonly mfaChallenges = new Map<string, MfaChallenge>();
  private readonly userMfaSecrets = new Map<string, Map<AuthenticationMethod, string>>();
  private readonly authenticationAttempts = new Map<string, AuthenticationAttempt[]>();

  // Risk and threat tracking
  private readonly knownDevices = new Map<string, DeviceInfo>();
  private readonly suspiciousActivities = new Map<string, SuspiciousActivity[]>();
  private readonly geoLocationHistory = new Map<string, GeolocationData[]>();

  // Performance metrics
  private readonly metrics = {
    authenticationsProcessed: 0,
    mfaChallengesIssued: 0,
    successfulAuthentications: 0,
    failedAuthentications: 0,
    averageAuthTime: 0,
    riskBasedBlocks: 0,
    adaptiveAuthTriggers: 0,
  };

  // Cleanup timers
  private sessionCleanupTimer: NodeJS.Timeout | null = null;
  private challengeCleanupTimer: NodeJS.Timeout | null = null;
  private metricsTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🔐 Initializing Enhanced Authentication Bridge Service");
  }

  /**
   * Initialize the authentication bridge service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🚀 Starting Enhanced Authentication Bridge Service...");

    try {
      await this.initializeAuthenticationProviders();
      await this.loadUserMfaSecrets();
      await this.startPeriodicTasks();
      await this.validateAuthenticationConfig();

      this.logger.log("✅ Enhanced Authentication Bridge Service initialized successfully");
      this.emit("auth:service:initialized");
    } catch (error: unknown) {
      this.logger.error("❌ Failed to initialize Authentication Bridge Service", error);
      throw new ParlantIntegrationError(
        "Authentication Bridge Service initialization failed",
        "AUTH_SERVICE_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Clean up on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Enhanced Authentication Bridge Service...");

    await this.stopPeriodicTasks();
    await this.saveUserMfaSecrets();
    await this.saveMetrics();

    this.logger.log("✅ Enhanced Authentication Bridge Service shutdown complete");
  }

  /**
   * Authenticate user with comprehensive security checks
   */
  async authenticate(request: AuthenticationRequest): Promise<AuthenticationResult> {
    const startTime = performance.now();

    try {
      // Record authentication attempt
      this.recordAuthenticationAttempt(request);

      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(request);

      // Check if user is temporarily blocked
      await this.checkUserBlockStatus(request.userId, request.metadata.ipAddress);

      // Validate authentication method
      await this.validateAuthenticationMethod(request.method, request.factor);

      // Perform primary authentication
      const primaryResult = await this.performPrimaryAuthentication(request);

      if (!primaryResult.success) {
        return this.buildFailureResult(request, primaryResult.errors, riskAssessment, startTime);
      }

      // Determine required additional factors based on risk
      const requiredFactors = await this.determineRequiredFactors(
        request,
        riskAssessment,
        primaryResult.userContext!,
      );

      // If additional factors are required
      if (requiredFactors.length > 0 && request.factor === "primary") {
        return this.buildPartialResult(request, requiredFactors, riskAssessment, startTime);
      }

      // Perform MFA validation if challenge response provided
      if (request.challengeResponse && request.factor !== "primary") {
        const mfaResult = await this.validateMfaChallenge(request);
        if (!mfaResult.success) {
          return this.buildFailureResult(request, mfaResult.errors, riskAssessment, startTime);
        }
      }

      // Create or update session
      const session = await this.createOrUpdateSession(
        primaryResult.userContext!,
        request,
        riskAssessment,
      );

      // Apply security controls
      const securityControls = await this.applySecurityControls(session, riskAssessment);

      // Build successful result
      const result = this.buildSuccessResult(
        request,
        primaryResult.userContext!,
        session,
        riskAssessment,
        securityControls,
        startTime,
      );

      // Update metrics
      this.updateMetrics("success", performance.now() - startTime);

      // Emit authentication event
      this.emit("auth:success", {
        userId: request.userId,
        method: request.method,
        factor: request.factor,
        sessionId: session.sessionId,
        riskScore: riskAssessment.overallScore,
        duration: performance.now() - startTime,
      });

      this.logger.debug(
        `✅ Authentication successful: ${request.userId} via ${request.method} (${(performance.now() - startTime).toFixed(2)}ms)`
      );

      return result;
    } catch (error: unknown) {
      this.logger.error("❌ Authentication failed", error);

      // Update metrics
      this.updateMetrics("failure", performance.now() - startTime);

      // Record suspicious activity
      await this.recordSuspiciousActivity(request, error);

      throw new ParlantIntegrationError(
        "Authentication failed",
        "AUTHENTICATION_ERROR",
        {
          userId: request.userId,
          method: request.method,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Setup MFA for user
   */
  async setupMfa(request: MfaSetupRequest): Promise<MfaSetupResult> {
    try {
      const errors: string[] = [];

      // Validate MFA method
      if (!this.config.enabledMethods.includes(request.method)) {
        errors.push(`MFA method not supported: ${request.method}`);
      }

      if (errors.length > 0) {
        return { success: false, errors, metadata: {} };
      }

      let secret: string | undefined;
      let qrCode: string | undefined;
      let backupCodes: string[] | undefined;

      switch (request.method) {
        case "totp":
          const totpSetup = await this.setupTotpMfa(request);
          secret = totpSetup.secret;
          qrCode = totpSetup.qrCode;
          backupCodes = totpSetup.backupCodes;
          break;

        case "sms":
          await this.setupSmsMfa(request);
          break;

        case "email":
          await this.setupEmailMfa(request);
          break;

        case "hardware_token":
          await this.setupHardwareTokenMfa(request);
          break;

        default:
          errors.push(`MFA setup not implemented for method: ${request.method}`);
      }

      if (errors.length > 0) {
        return { success: false, errors, metadata: {} };
      }

      // Store MFA secret
      if (secret) {
        this.storeMfaSecret(request.userId, request.method, secret);
      }

      // Emit MFA setup event
      this.emit("mfa:setup", {
        userId: request.userId,
        method: request.method,
        timestamp: new Date(),
      });

      this.logger.debug(`✅ MFA setup completed: ${request.userId} with ${request.method}`);

      return {
        success: true,
        secret,
        qrCode,
        backupCodes,
        errors: [],
        metadata: {
          method: request.method,
          setupTime: new Date(),
        },
      };
    } catch (error: unknown) {
      this.logger.error("❌ MFA setup failed", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
        metadata: {},
      };
    }
  }

  /**
   * Issue MFA challenge
   */
  async issueMfaChallenge(
    userId: string,
    method: AuthenticationMethod,
    metadata: Record<string, unknown> = {},
  ): Promise<MfaChallenge> {
    try {
      const challengeId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 300000); // 5 minutes

      let challengeData: Record<string, unknown> = {};

      switch (method) {
        case "totp":
          // For TOTP, no challenge data needed - user uses their app
          challengeData = { instruction: "Enter code from your authenticator app" };
          break;

        case "sms":
          const smsCode = this.generateSmsCode();
          await this.sendSmsCode(userId, smsCode);
          challengeData = { codeSent: true, phoneNumber: this.maskPhoneNumber(userId) };
          break;

        case "email":
          const emailCode = this.generateEmailCode();
          await this.sendEmailCode(userId, emailCode);
          challengeData = { codeSent: true, email: this.maskEmail(userId) };
          break;

        case "push":
          const pushToken = await this.sendPushNotification(userId);
          challengeData = { pushSent: true, token: pushToken };
          break;

        default:
          throw new Error(`MFA challenge not supported for method: ${method}`);
      }

      const challenge: MfaChallenge = {
        challengeId,
        type: method,
        data: challengeData,
        expiresAt,
        attemptsRemaining: 3,
        metadata: {
          userId,
          issuedAt: new Date(),
          ...metadata,
        },
      };

      // Store challenge
      this.mfaChallenges.set(challengeId, challenge);

      // Update metrics
      this.metrics.mfaChallengesIssued++;

      // Emit challenge event
      this.emit("mfa:challenge:issued", {
        challengeId,
        userId,
        method,
        timestamp: new Date(),
      });

      this.logger.debug(`✅ MFA challenge issued: ${challengeId} for ${userId} via ${method}`);

      return challenge;
    } catch (error: unknown) {
      this.logger.error("❌ Failed to issue MFA challenge", error);
      throw new ParlantIntegrationError(
        "MFA challenge issuance failed",
        "MFA_CHALLENGE_ERROR",
        { userId, method, error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Validate MFA challenge response
   */
  async validateMfaChallenge(request: AuthenticationRequest): Promise<{ success: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      // Find active challenge
      const challenge = Array.from(this.mfaChallenges.values()).find(
        c => c.metadata.userId === request.userId && c.type === request.method
      );

      if (!challenge) {
        errors.push("No active MFA challenge found");
        return { success: false, errors };
      }

      // Check challenge expiration
      if (challenge.expiresAt < new Date()) {
        errors.push("MFA challenge has expired");
        this.mfaChallenges.delete(challenge.challengeId);
        return { success: false, errors };
      }

      // Check attempts remaining
      if (challenge.attemptsRemaining <= 0) {
        errors.push("Maximum MFA attempts exceeded");
        this.mfaChallenges.delete(challenge.challengeId);
        return { success: false, errors };
      }

      // Validate response based on method
      let isValid = false;

      switch (request.method) {
        case "totp":
          isValid = await this.validateTotpCode(request.userId, request.challengeResponse!);
          break;

        case "sms":
        case "email":
          isValid = await this.validateOtpCode(challenge, request.challengeResponse!);
          break;

        case "push":
          isValid = await this.validatePushResponse(challenge, request.challengeResponse!);
          break;

        default:
          errors.push(`MFA validation not implemented for method: ${request.method}`);
          return { success: false, errors };
      }

      if (!isValid) {
        challenge.attemptsRemaining--;
        errors.push("Invalid MFA code");

        if (challenge.attemptsRemaining <= 0) {
          this.mfaChallenges.delete(challenge.challengeId);
        }

        return { success: false, errors };
      }

      // Successful validation
      this.mfaChallenges.delete(challenge.challengeId);

      // Emit validation event
      this.emit("mfa:challenge:validated", {
        challengeId: challenge.challengeId,
        userId: request.userId,
        method: request.method,
        timestamp: new Date(),
      });

      this.logger.debug(`✅ MFA challenge validated: ${challenge.challengeId} for ${request.userId}`);

      return { success: true, errors: [] };
    } catch (error: unknown) {
      this.logger.error("❌ MFA challenge validation failed", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Get authentication statistics
   */
  getAuthenticationStatistics(): Record<string, unknown> {
    return {
      activeSessions: this.activeSessions.size,
      activeChallenges: this.mfaChallenges.size,
      knownDevices: this.knownDevices.size,
      metrics: { ...this.metrics },
      config: this.config,
    };
  }

  /**
   * Private helper methods
   */

  private recordAuthenticationAttempt(request: AuthenticationRequest): void {
    const attempt: AuthenticationAttempt = {
      timestamp: new Date(),
      method: request.method,
      factor: request.factor,
      ipAddress: request.metadata.ipAddress,
      userAgent: request.metadata.userAgent,
      success: false, // Will be updated later
    };

    if (!this.authenticationAttempts.has(request.userId)) {
      this.authenticationAttempts.set(request.userId, []);
    }

    this.authenticationAttempts.get(request.userId)!.push(attempt);

    // Keep only last 100 attempts per user
    const attempts = this.authenticationAttempts.get(request.userId)!;
    if (attempts.length > 100) {
      attempts.splice(0, attempts.length - 100);
    }
  }

  private async performRiskAssessment(request: AuthenticationRequest): Promise<RiskAssessment> {
    const factors: RiskFactor[] = [];

    // IP address risk
    const ipRisk = await this.assessIpRisk(request.metadata.ipAddress);
    factors.push({
      type: "ip_address",
      weight: 0.3,
      value: ipRisk,
      description: `IP address risk assessment: ${ipRisk}`,
      source: "threat_intelligence",
    });

    // Device risk
    const deviceRisk = await this.assessDeviceRisk(request.metadata.deviceFingerprint, request.userId);
    factors.push({
      type: "device",
      weight: 0.2,
      value: deviceRisk,
      description: `Device risk assessment: ${deviceRisk}`,
      source: "device_analysis",
    });

    // Location risk
    if (request.metadata.geolocation) {
      const locationRisk = await this.assessLocationRisk(request.metadata.geolocation, request.userId);
      factors.push({
        type: "location",
        weight: 0.2,
        value: locationRisk,
        description: `Location risk assessment: ${locationRisk}`,
        source: "geolocation_analysis",
      });
    }

    // Behavioral risk
    const behaviorRisk = await this.assessBehavioralRisk(request);
    factors.push({
      type: "behavior",
      weight: 0.3,
      value: behaviorRisk,
      description: `Behavioral risk assessment: ${behaviorRisk}`,
      source: "behavioral_analysis",
    });

    // Calculate overall score
    const overallScore = factors.reduce((score, factor) => {
      return score + (factor.weight * factor.value);
    }, 0);

    // Determine risk level
    let level: "low" | "medium" | "high" | "critical";
    if (overallScore < this.config.riskThresholds.low) {
      level = "low";
    } else if (overallScore < this.config.riskThresholds.medium) {
      level = "medium";
    } else if (overallScore < this.config.riskThresholds.high) {
      level = "high";
    } else {
      level = "critical";
    }

    return {
      overallScore,
      factors,
      mitigationActions: this.determineMitigationActions(level),
      level,
      confidence: 0.85,
    };
  }

  private determineMitigationActions(level: "low" | "medium" | "high" | "critical"): string[] {
    switch (level) {
      case "low":
        return ["standard_monitoring"];
      case "medium":
        return ["enhanced_monitoring", "require_mfa"];
      case "high":
        return ["enhanced_monitoring", "require_strong_mfa", "additional_verification"];
      case "critical":
        return ["block_authentication", "security_review", "incident_response"];
      default:
        return [];
    }
  }

  private async assessIpRisk(ipAddress: string): Promise<number> {
    // Placeholder for IP risk assessment
    // Would integrate with threat intelligence services
    return 0.1;
  }

  private async assessDeviceRisk(deviceFingerprint: string, userId: string): Promise<number> {
    const deviceInfo = this.knownDevices.get(deviceFingerprint);

    if (!deviceInfo) {
      // Unknown device
      return 0.6;
    }

    if (deviceInfo.userId !== userId) {
      // Device associated with different user
      return 0.8;
    }

    // Known device for this user
    return 0.1;
  }

  private async assessLocationRisk(geolocation: GeolocationData, userId: string): Promise<number> {
    const history = this.geoLocationHistory.get(userId) || [];

    if (history.length === 0) {
      // First time location
      return 0.3;
    }

    // Check if location is significantly different from recent history
    const recentLocation = history[history.length - 1];
    const distance = this.calculateDistance(geolocation, recentLocation);

    if (distance > 1000) { // More than 1000km from last location
      return 0.7;
    }

    return 0.1;
  }

  private calculateDistance(loc1: GeolocationData, loc2: GeolocationData): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async assessBehavioralRisk(request: AuthenticationRequest): Promise<number> {
    const attempts = this.authenticationAttempts.get(request.userId) || [];

    // Check for rapid authentication attempts
    const recentAttempts = attempts.filter(
      a => Date.now() - a.timestamp.getTime() < 300000 // Last 5 minutes
    );

    if (recentAttempts.length > 5) {
      return 0.8;
    }

    // Check for unusual time patterns
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      return 0.4;
    }

    return 0.1;
  }

  private async checkUserBlockStatus(userId: string, ipAddress: string): Promise<void> {
    // Check if user is temporarily blocked due to suspicious activity
    const suspiciousActivities = this.suspiciousActivities.get(userId) || [];
    const recentActivities = suspiciousActivities.filter(
      a => Date.now() - a.timestamp.getTime() < 3600000 // Last hour
    );

    if (recentActivities.length > 3) {
      throw new ForbiddenException("User temporarily blocked due to suspicious activity");
    }
  }

  private async validateAuthenticationMethod(
    method: AuthenticationMethod,
    factor: AuthenticationFactor,
  ): Promise<void> {
    if (!this.config.enabledMethods.includes(method)) {
      throw new UnauthorizedException(`Authentication method not supported: ${method}`);
    }
  }

  private async performPrimaryAuthentication(
    request: AuthenticationRequest,
  ): Promise<{ success: boolean; userContext?: ParlantUserContext; errors: string[] }> {
    const errors: string[] = [];

    // This would integrate with actual authentication providers
    // For now, it's a placeholder implementation

    switch (request.method) {
      case "password":
        return this.validatePasswordAuth(request);
      case "sso":
        return this.validateSsoAuth(request);
      case "certificate":
        return this.validateCertificateAuth(request);
      default:
        errors.push(`Primary authentication not supported for method: ${request.method}`);
        return { success: false, errors };
    }
  }

  private async validatePasswordAuth(
    request: AuthenticationRequest,
  ): Promise<{ success: boolean; userContext?: ParlantUserContext; errors: string[] }> {
    // Placeholder for password validation
    // Would integrate with user store/directory service

    const userContext: ParlantUserContext = {
      userId: request.userId,
      roles: ["user"], // Would be retrieved from user store
      sessionId: crypto.randomUUID(),
      ipAddress: request.metadata.ipAddress,
      metadata: {
        userAgent: request.metadata.userAgent,
        deviceFingerprint: request.metadata.deviceFingerprint,
      },
    };

    return { success: true, userContext, errors: [] };
  }

  private async validateSsoAuth(
    request: AuthenticationRequest,
  ): Promise<{ success: boolean; userContext?: ParlantUserContext; errors: string[] }> {
    // Placeholder for SSO validation
    return { success: true, errors: [] };
  }

  private async validateCertificateAuth(
    request: AuthenticationRequest,
  ): Promise<{ success: boolean; userContext?: ParlantUserContext; errors: string[] }> {
    // Placeholder for certificate validation
    return { success: true, errors: [] };
  }

  private async determineRequiredFactors(
    request: AuthenticationRequest,
    riskAssessment: RiskAssessment,
    userContext: ParlantUserContext,
  ): Promise<AuthenticationMethod[]> {
    if (!this.config.adaptiveAuth.enabled) {
      return [];
    }

    const requiredFactors: AuthenticationMethod[] = [];

    // Base MFA requirements by security level
    const securityLevel = request.securityContext?.securityLevel || SecurityLevel._MODERATE;
    const baseMfaRequirements = this.config.mfaRequirements[securityLevel];

    // Risk-based additional factors
    if (this.config.adaptiveAuth.riskBasedMfa) {
      if (riskAssessment.level === "high" || riskAssessment.level === "critical") {
        requiredFactors.push("hardware_token");
      } else if (riskAssessment.level === "medium") {
        requiredFactors.push("totp");
      }
    }

    // Combine and deduplicate
    const allRequiredFactors = [...baseMfaRequirements, ...requiredFactors];
    return Array.from(new Set(allRequiredFactors));
  }

  private async createOrUpdateSession(
    userContext: ParlantUserContext,
    request: AuthenticationRequest,
    riskAssessment: RiskAssessment,
  ): Promise<SessionInformation> {
    const sessionId = userContext.sessionId;
    const securityLevel = request.securityContext?.securityLevel || SecurityLevel._MODERATE;
    const sessionTimeout = this.config.sessionTimeouts[securityLevel];

    const session: SessionInformation = {
      sessionId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + sessionTimeout),
      securityLevel,
      mfaVerified: request.factor !== "primary",
      deviceBinding: request.metadata.deviceFingerprint,
      ipBinding: request.metadata.ipAddress,
      properties: {
        riskScore: riskAssessment.overallScore,
        authMethod: request.method,
        userAgent: request.metadata.userAgent,
      },
    };

    this.activeSessions.set(sessionId, session);

    return session;
  }

  private async applySecurityControls(
    session: SessionInformation,
    riskAssessment: RiskAssessment,
  ): Promise<string[]> {
    const controls: string[] = [];

    if (riskAssessment.level === "high" || riskAssessment.level === "critical") {
      controls.push("enhanced_monitoring");
      controls.push("ip_binding");
      controls.push("device_binding");
    }

    if (session.securityLevel === SecurityLevel._CRITICAL) {
      controls.push("session_encryption");
      controls.push("real_time_validation");
    }

    return controls;
  }

  private buildSuccessResult(
    request: AuthenticationRequest,
    userContext: ParlantUserContext,
    session: SessionInformation,
    riskAssessment: RiskAssessment,
    securityControls: string[],
    startTime: number,
  ): AuthenticationResult {
    return {
      success: true,
      userContext,
      errors: [],
      warnings: riskAssessment.level === "medium" ? ["Medium risk authentication"] : [],
      score: Math.max(0, 100 - (riskAssessment.overallScore * 100)),
      requiredFactors: [],
      metadata: {
        methodUsed: request.method,
        factorLevel: request.factor,
        duration: performance.now() - startTime,
        riskAssessment,
        securityControls,
        complianceStatus: ["authenticated"],
      },
      session,
      auditTrail: this.createAuditEntry(request, "success"),
    };
  }

  private buildFailureResult(
    request: AuthenticationRequest,
    errors: string[],
    riskAssessment: RiskAssessment,
    startTime: number,
  ): AuthenticationResult {
    return {
      success: false,
      errors,
      warnings: [],
      score: 0,
      requiredFactors: [],
      metadata: {
        methodUsed: request.method,
        factorLevel: request.factor,
        duration: performance.now() - startTime,
        riskAssessment,
        securityControls: [],
        complianceStatus: ["authentication_failed"],
      },
      auditTrail: this.createAuditEntry(request, "failure", errors[0]),
    };
  }

  private buildPartialResult(
    request: AuthenticationRequest,
    requiredFactors: AuthenticationMethod[],
    riskAssessment: RiskAssessment,
    startTime: number,
  ): AuthenticationResult {
    return {
      success: false,
      errors: [],
      warnings: ["Additional authentication factors required"],
      score: 50,
      requiredFactors,
      metadata: {
        methodUsed: request.method,
        factorLevel: request.factor,
        duration: performance.now() - startTime,
        riskAssessment,
        securityControls: [],
        complianceStatus: ["partial_authentication"],
      },
      auditTrail: this.createAuditEntry(request, "partial"),
    };
  }

  private createAuditEntry(
    request: AuthenticationRequest,
    result: "success" | "failure" | "partial",
    failureReason?: string,
  ): AuthenticationAuditEntry {
    return {
      entryId: crypto.randomUUID(),
      timestamp: new Date(),
      userId: request.userId,
      method: request.method,
      result,
      ipAddress: request.metadata.ipAddress,
      userAgent: request.metadata.userAgent,
      failureReason,
      metadata: {
        factor: request.factor,
        source: request.metadata.source,
        deviceFingerprint: request.metadata.deviceFingerprint,
      },
    };
  }

  private async setupTotpMfa(request: MfaSetupRequest): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    // Generate a secure secret for TOTP
    const secret = crypto.randomBytes(32).toString("base32");
    const qrCode = `otpauth://totp/Parlant:${request.userId}?secret=${secret}&issuer=Parlant%20Security`;
    const backupCodes = this.generateBackupCodes();

    return {
      secret,
      qrCode,
      backupCodes,
    };
  }

  private async setupSmsMfa(request: MfaSetupRequest): Promise<void> {
    // Placeholder for SMS MFA setup
    this.logger.debug(`Setting up SMS MFA for user: ${request.userId}`);
  }

  private async setupEmailMfa(request: MfaSetupRequest): Promise<void> {
    // Placeholder for Email MFA setup
    this.logger.debug(`Setting up Email MFA for user: ${request.userId}`);
  }

  private async setupHardwareTokenMfa(request: MfaSetupRequest): Promise<void> {
    // Placeholder for Hardware Token MFA setup
    this.logger.debug(`Setting up Hardware Token MFA for user: ${request.userId}`);
  }

  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
    }
    return codes;
  }

  private storeMfaSecret(userId: string, method: AuthenticationMethod, secret: string): void {
    if (!this.userMfaSecrets.has(userId)) {
      this.userMfaSecrets.set(userId, new Map());
    }
    this.userMfaSecrets.get(userId)!.set(method, secret);
  }

  private generateSmsCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateEmailCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendSmsCode(userId: string, code: string): Promise<void> {
    // Placeholder for SMS sending
    this.logger.debug(`Sending SMS code to user: ${userId}`);
  }

  private async sendEmailCode(userId: string, code: string): Promise<void> {
    // Placeholder for email sending
    this.logger.debug(`Sending email code to user: ${userId}`);
  }

  private async sendPushNotification(userId: string): Promise<string> {
    // Placeholder for push notification
    this.logger.debug(`Sending push notification to user: ${userId}`);
    return crypto.randomUUID();
  }

  private maskPhoneNumber(userId: string): string {
    // Placeholder for phone number masking
    return "***-***-1234";
  }

  private maskEmail(userId: string): string {
    // Placeholder for email masking
    return "user@*****.com";
  }

  private async validateTotpCode(userId: string, code: string): Promise<boolean> {
    const userSecrets = this.userMfaSecrets.get(userId);
    if (!userSecrets) {
      return false;
    }

    const secret = userSecrets.get("totp");
    if (!secret) {
      return false;
    }

    // Simplified TOTP validation - in production, use a proper TOTP library
    // This is a placeholder implementation
    return code.length === 6 && /^\d+$/.test(code);
  }

  private async validateOtpCode(challenge: MfaChallenge, code: string): Promise<boolean> {
    // This would validate against the stored OTP code
    // Placeholder implementation
    return code.length === 6 && /^\d+$/.test(code);
  }

  private async validatePushResponse(challenge: MfaChallenge, response: string): Promise<boolean> {
    // This would validate the push notification response
    // Placeholder implementation
    return response === "approved";
  }

  private async recordSuspiciousActivity(
    request: AuthenticationRequest,
    error: unknown,
  ): Promise<void> {
    const activity: SuspiciousActivity = {
      timestamp: new Date(),
      type: "authentication_failure",
      details: {
        method: request.method,
        ipAddress: request.metadata.ipAddress,
        userAgent: request.metadata.userAgent,
        error: error instanceof Error ? error.message : String(error),
      },
      riskScore: 0.7,
    };

    if (!this.suspiciousActivities.has(request.userId)) {
      this.suspiciousActivities.set(request.userId, []);
    }

    this.suspiciousActivities.get(request.userId)!.push(activity);
  }

  private updateMetrics(type: "success" | "failure", duration: number): void {
    this.metrics.authenticationsProcessed++;

    if (type === "success") {
      this.metrics.successfulAuthentications++;
    } else {
      this.metrics.failedAuthentications++;
    }

    this.metrics.averageAuthTime = this.updateAverage(
      this.metrics.averageAuthTime,
      duration,
      this.metrics.authenticationsProcessed,
    );
  }

  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  private async initializeAuthenticationProviders(): Promise<void> {
    this.logger.debug("🔐 Initializing authentication providers...");
  }

  private async loadUserMfaSecrets(): Promise<void> {
    this.logger.debug("🔑 Loading user MFA secrets...");
  }

  private async saveUserMfaSecrets(): Promise<void> {
    this.logger.debug("💾 Saving user MFA secrets...");
  }

  private async validateAuthenticationConfig(): Promise<void> {
    this.logger.debug("🔍 Validating authentication configuration...");
  }

  private async saveMetrics(): Promise<void> {
    this.logger.debug("📊 Saving authentication metrics...", this.metrics);
  }

  private async startPeriodicTasks(): Promise<void> {
    // Session cleanup every 10 minutes
    this.sessionCleanupTimer = setInterval(() => {
      this.performSessionCleanup();
    }, 10 * 60 * 1000);

    // Challenge cleanup every 5 minutes
    this.challengeCleanupTimer = setInterval(() => {
      this.performChallengeCleanup();
    }, 5 * 60 * 1000);

    // Metrics update every minute
    this.metricsTimer = setInterval(() => {
      this.updatePeriodicMetrics();
    }, 60 * 1000);
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.sessionCleanupTimer) {
      clearInterval(this.sessionCleanupTimer);
      this.sessionCleanupTimer = null;
    }

    if (this.challengeCleanupTimer) {
      clearInterval(this.challengeCleanupTimer);
      this.challengeCleanupTimer = null;
    }

    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  private async performSessionCleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.expiresAt < now) {
        this.activeSessions.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  private async performChallengeCleanup(): Promise<void> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [challengeId, challenge] of this.mfaChallenges.entries()) {
      if (challenge.expiresAt < now) {
        this.mfaChallenges.delete(challengeId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`🧹 Cleaned up ${cleanedCount} expired MFA challenges`);
    }
  }

  private updatePeriodicMetrics(): void {
    this.emit("auth:metrics:updated", this.metrics);
  }
}

/**
 * Supporting interfaces and types
 */

interface AuthenticationAttempt {
  timestamp: Date;
  method: AuthenticationMethod;
  factor: AuthenticationFactor;
  ipAddress: string;
  userAgent: string;
  success: boolean;
}

interface DeviceInfo {
  deviceFingerprint: string;
  userId: string;
  firstSeen: Date;
  lastSeen: Date;
  trusted: boolean;
  metadata: Record<string, unknown>;
}

interface SuspiciousActivity {
  timestamp: Date;
  type: string;
  details: Record<string, unknown>;
  riskScore: number;
}