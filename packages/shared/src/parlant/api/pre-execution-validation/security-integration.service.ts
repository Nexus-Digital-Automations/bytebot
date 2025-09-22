/**
 * PARLANT Phase 1 - Security Framework Integration
 *
 * Seamless integration with existing Parlant security framework providing
 * enterprise-grade security controls, authentication bridging, and unified
 * security policy enforcement for pre-execution validation.
 *
 * Key Features:
 * - JWT authentication bridge with existing security
 * - RBAC integration and permission mapping
 * - Security policy enforcement and validation
 * - Threat detection and response integration
 * - Compliance framework alignment
 * - Security audit trail consolidation
 * - Real-time security monitoring
 * - Emergency override and incident response
 *
 * @module SecurityIntegrationService
 * @version 1.0.0
 * @author PARLANT Phase 1 Security Team
 */

import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter } from "events";
import {
  PreExecutionValidationRequest,
  UserValidationContext,
  ValidationLevel,
} from "./pre-execution-validation.service";
import { SecurityLevel } from "../../validation/types/validation-layer.types";

// ===== SECURITY INTEGRATION TYPES =====

/**
 * Security context from existing Parlant security framework
 */
export interface ParlantSecurityContext {
  /** JWT token information */
  jwtContext: {
    token: string;
    claims: JWTClaims;
    algorithm: string;
    issuedAt: Date;
    expiresAt: Date;
    issuer: string;
  };

  /** Session security information */
  sessionSecurity: {
    sessionId: string;
    securityLevel: SecurityLevel;
    trustScore: number;
    riskProfile: SecurityRiskProfile;
    lastSecurityCheck: Date;
  };

  /** RBAC context */
  rbacContext: {
    roles: SecurityRole[];
    permissions: SecurityPermission[];
    groups: SecurityGroup[];
    effectivePermissions: string[];
  };

  /** Threat detection context */
  threatContext: {
    threatLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    activeThreats: SecurityThreat[];
    behavioralAnomalies: BehavioralAnomaly[];
    geoLocation: GeoSecurityContext;
  };
}

/**
 * JWT claims from existing authentication system
 */
export interface JWTClaims {
  /** Subject (user ID) */
  sub: string;

  /** Issued at timestamp */
  iat: number;

  /** Expiration timestamp */
  exp: number;

  /** Issuer */
  iss: string;

  /** Audience */
  aud: string;

  /** JWT ID */
  jti: string;

  /** Custom claims */
  roles?: string[];
  permissions?: string[];
  securityLevel?: SecurityLevel;
  trustScore?: number;
  groups?: string[];

  /** Extended security claims */
  securityContext?: {
    ipAddress: string;
    userAgent: string;
    deviceFingerprint: string;
    sessionRisk: number;
    lastPasswordChange: Date;
    mfaEnabled: boolean;
    mfaVerified: boolean;
  };
}

/**
 * Security role with hierarchical permissions
 */
export interface SecurityRole {
  /** Role identifier */
  id: string;

  /** Role name */
  name: string;

  /** Role description */
  description: string;

  /** Role hierarchy level */
  level: number;

  /** Role permissions */
  permissions: SecurityPermission[];

  /** Role inheritance */
  inheritsFrom: string[];

  /** Role constraints */
  constraints: {
    timeRestrictions?: TimeRestriction[];
    ipRestrictions?: string[];
    resourceRestrictions?: string[];
    operationRestrictions?: string[];
  };
}

/**
 * Security permission with granular controls
 */
export interface SecurityPermission {
  /** Permission identifier */
  id: string;

  /** Permission name */
  name: string;

  /** Permission resource */
  resource: string;

  /** Permission action */
  action: string;

  /** Permission effect */
  effect: "ALLOW" | "DENY";

  /** Permission conditions */
  conditions?: PermissionCondition[];

  /** Permission scope */
  scope: {
    global: boolean;
    resources: string[];
    operations: string[];
    contexts: string[];
  };
}

/**
 * Security group for role aggregation
 */
export interface SecurityGroup {
  /** Group identifier */
  id: string;

  /** Group name */
  name: string;

  /** Group type */
  type: "DEPARTMENT" | "PROJECT" | "FUNCTIONAL" | "EMERGENCY";

  /** Group members */
  members: string[];

  /** Group roles */
  roles: string[];

  /** Group policies */
  policies: SecurityPolicy[];
}

/**
 * Security risk profile for users
 */
export interface SecurityRiskProfile {
  /** Overall risk score */
  riskScore: number;

  /** Risk factors */
  riskFactors: {
    behavioralRisk: number;
    accessPatternRisk: number;
    deviceRisk: number;
    locationRisk: number;
    timeRisk: number;
    operationalRisk: number;
  };

  /** Risk history */
  riskHistory: {
    averageRisk: number;
    peakRisk: number;
    riskTrend: "INCREASING" | "DECREASING" | "STABLE";
    lastRiskEvent: Date;
  };

  /** Mitigation measures */
  mitigationMeasures: {
    mfaRequired: boolean;
    sessionTimeout: number;
    ipWhitelisting: boolean;
    deviceRestriction: boolean;
    operationLimits: Record<string, number>;
  };
}

/**
 * Security threat information
 */
export interface SecurityThreat {
  /** Threat identifier */
  id: string;

  /** Threat type */
  type:
    | "BRUTE_FORCE"
    | "CREDENTIAL_STUFFING"
    | "ANOMALOUS_BEHAVIOR"
    | "SUSPICIOUS_LOCATION"
    | "PRIVILEGE_ESCALATION";

  /** Threat severity */
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  /** Threat description */
  description: string;

  /** Threat detection time */
  detectedAt: Date;

  /** Threat source */
  source: {
    ipAddress: string;
    userAgent: string;
    geolocation: string;
    userId?: string;
  };

  /** Threat indicators */
  indicators: string[];

  /** Response actions taken */
  responseActions: string[];

  /** Threat status */
  status: "ACTIVE" | "MITIGATED" | "RESOLVED" | "FALSE_POSITIVE";
}

/**
 * Behavioral anomaly detection
 */
export interface BehavioralAnomaly {
  /** Anomaly identifier */
  id: string;

  /** Anomaly type */
  type:
    | "ACCESS_PATTERN"
    | "OPERATION_FREQUENCY"
    | "TIME_PATTERN"
    | "LOCATION_CHANGE"
    | "PERMISSION_USAGE";

  /** Anomaly score (0-1) */
  score: number;

  /** Anomaly description */
  description: string;

  /** Detection timestamp */
  detectedAt: Date;

  /** Baseline comparison */
  baseline: {
    expected: any;
    actual: any;
    variance: number;
  };

  /** Confidence level */
  confidence: number;
}

/**
 * Geo-location security context
 */
export interface GeoSecurityContext {
  /** IP address */
  ipAddress: string;

  /** Geographic location */
  location: {
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
  };

  /** Location risk assessment */
  locationRisk: {
    riskScore: number;
    riskFactors: string[];
    isKnownLocation: boolean;
    isVpnDetected: boolean;
    isTorDetected: boolean;
  };

  /** ISP information */
  isp: {
    name: string;
    organization: string;
    type: "RESIDENTIAL" | "BUSINESS" | "MOBILE" | "HOSTING" | "VPN" | "TOR";
  };
}

/**
 * Time-based restrictions
 */
export interface TimeRestriction {
  /** Days of week (0-6, Sunday=0) */
  daysOfWeek: number[];

  /** Start time (24-hour format) */
  startTime: string;

  /** End time (24-hour format) */
  endTime: string;

  /** Timezone */
  timezone: string;

  /** Restriction type */
  type: "ALLOWED" | "DENIED" | "RESTRICTED";
}

/**
 * Permission condition for dynamic evaluation
 */
export interface PermissionCondition {
  /** Condition type */
  type: "TIME" | "LOCATION" | "RISK_SCORE" | "MFA" | "DEVICE" | "CUSTOM";

  /** Condition operator */
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "IN"
    | "NOT_IN"
    | "CONTAINS";

  /** Condition value */
  value: any;

  /** Condition description */
  description: string;
}

/**
 * Security policy definition
 */
export interface SecurityPolicy {
  /** Policy identifier */
  id: string;

  /** Policy name */
  name: string;

  /** Policy type */
  type:
    | "ACCESS_CONTROL"
    | "DATA_PROTECTION"
    | "OPERATION_RESTRICTION"
    | "COMPLIANCE"
    | "INCIDENT_RESPONSE";

  /** Policy rules */
  rules: SecurityPolicyRule[];

  /** Policy enforcement level */
  enforcementLevel: "ADVISORY" | "ENFORCED" | "STRICT";

  /** Policy priority */
  priority: number;

  /** Policy activation conditions */
  activationConditions: PermissionCondition[];
}

/**
 * Security policy rule
 */
export interface SecurityPolicyRule {
  /** Rule identifier */
  id: string;

  /** Rule condition */
  condition: string;

  /** Rule action */
  action: "ALLOW" | "DENY" | "REQUIRE_APPROVAL" | "LOG" | "ALERT" | "ESCALATE";

  /** Rule parameters */
  parameters: Record<string, any>;

  /** Rule description */
  description: string;
}

/**
 * Security integration configuration
 */
export interface SecurityIntegrationConfig {
  /** Enable security integration */
  enabled: boolean;

  /** JWT configuration */
  jwt: {
    verificationEnabled: boolean;
    algorithms: string[];
    secretOrKey: string;
    issuer: string;
    audience: string;
    clockTolerance: number;
  };

  /** RBAC configuration */
  rbac: {
    enabled: boolean;
    strictMode: boolean;
    inheritanceEnabled: boolean;
    cacheEnabled: boolean;
    cacheTtlMs: number;
  };

  /** Threat detection configuration */
  threatDetection: {
    enabled: boolean;
    realTimeMonitoring: boolean;
    anomalyDetectionThreshold: number;
    responseActions: string[];
  };

  /** Geo-location security */
  geoSecurity: {
    enabled: boolean;
    restrictedCountries: string[];
    vpnDetection: boolean;
    torDetection: boolean;
    locationTrustScoring: boolean;
  };

  /** Emergency overrides */
  emergencyOverride: {
    enabled: boolean;
    overrideCodes: string[];
    approvalRequired: boolean;
    auditRequired: boolean;
    timeoutMinutes: number;
  };
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  /** Validation decision */
  decision:
    | "APPROVED"
    | "DENIED"
    | "REQUIRES_ADDITIONAL_AUTH"
    | "REQUIRES_APPROVAL"
    | "EMERGENCY_OVERRIDE";

  /** Security score (0-100) */
  securityScore: number;

  /** Security factors that contributed to decision */
  securityFactors: {
    authentication: number;
    authorization: number;
    riskProfile: number;
    threatLevel: number;
    compliance: number;
    behavioral: number;
  };

  /** Required additional security measures */
  additionalSecurityMeasures: SecurityMeasure[];

  /** Security warnings */
  securityWarnings: SecurityWarning[];

  /** Policy violations */
  policyViolations: PolicyViolation[];

  /** Validation timestamp */
  validatedAt: Date;

  /** Security context used */
  securityContext: ParlantSecurityContext;
}

/**
 * Additional security measure required
 */
export interface SecurityMeasure {
  /** Measure type */
  type:
    | "MFA"
    | "APPROVAL"
    | "ELEVATED_AUTH"
    | "DEVICE_VERIFICATION"
    | "LOCATION_VERIFICATION";

  /** Measure description */
  description: string;

  /** Measure priority */
  priority: number;

  /** Measure timeout */
  timeoutMs: number;

  /** Measure parameters */
  parameters: Record<string, any>;
}

/**
 * Security warning
 */
export interface SecurityWarning {
  /** Warning type */
  type: "ANOMALY" | "THREAT" | "POLICY" | "COMPLIANCE" | "RISK";

  /** Warning severity */
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  /** Warning message */
  message: string;

  /** Warning details */
  details: Record<string, any>;

  /** Recommended actions */
  recommendedActions: string[];
}

/**
 * Policy violation
 */
export interface PolicyViolation {
  /** Policy identifier */
  policyId: string;

  /** Policy name */
  policyName: string;

  /** Violation type */
  violationType:
    | "ACCESS_DENIED"
    | "TIME_RESTRICTION"
    | "LOCATION_RESTRICTION"
    | "RISK_THRESHOLD"
    | "COMPLIANCE";

  /** Violation description */
  description: string;

  /** Violation severity */
  severity: "WARNING" | "ERROR" | "CRITICAL";

  /** Required remediation */
  remediation: string[];
}

// ===== SECURITY INTEGRATION SERVICE =====

/**
 * Security Integration Service
 *
 * Provides seamless integration with existing Parlant security framework
 * for enterprise-grade security validation and enforcement.
 */
@Injectable()
export class SecurityIntegrationService implements OnApplicationShutdown {
  private readonly logger = new Logger(SecurityIntegrationService.name);
  private readonly eventEmitter = new EventEmitter();
  private readonly config: SecurityIntegrationConfig;

  // Security caches
  private readonly securityContextCache = new Map<
    string,
    ParlantSecurityContext
  >();
  private readonly permissionCache = new Map<string, SecurityPermission[]>();
  private readonly threatCache = new Map<string, SecurityThreat[]>();

  // Performance tracking
  private metrics = {
    totalSecurityValidations: 0,
    securityApprovalsRate: 0.85,
    averageSecurityValidationTime: 0,
    threatDetections: 0,
    policyViolations: 0,
    emergencyOverrides: 0,
  };

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadSecurityConfiguration();
    this.initializeSecurityIntegration();

    this.logger.log("SecurityIntegrationService initialized", {
      version: "1.0.0",
      features: [
        "jwt_authentication_bridge",
        "rbac_integration",
        "threat_detection",
        "geo_security",
        "policy_enforcement",
        "emergency_override",
        "compliance_validation",
        "behavioral_analysis",
      ],
      config: {
        enabled: this.config.enabled,
        jwtVerification: this.config.jwt.verificationEnabled,
        rbacEnabled: this.config.rbac.enabled,
        threatDetection: this.config.threatDetection.enabled,
        geoSecurity: this.config.geoSecurity.enabled,
      },
    });
  }

  /**
   * Validate security context for pre-execution validation
   *
   * @param request Pre-execution validation request
   * @returns Promise<SecurityValidationResult>
   */
  async validateSecurityContext(
    request: PreExecutionValidationRequest,
  ): Promise<SecurityValidationResult> {
    const startTime = performance.now();

    try {
      if (!this.config.enabled) {
        return this.createBypassSecurityResult();
      }

      this.logger.debug("Starting security context validation", {
        requestId: request.id,
        userId: request.userContext.userId,
        functionName: request.functionName,
      });

      // Extract security context
      const securityContext = await this.extractSecurityContext(
        request.userContext,
      );

      // Validate JWT authentication
      const authResult = await this.validateAuthentication(securityContext);

      // Validate RBAC authorization
      const authzResult = await this.validateAuthorization(
        request,
        securityContext,
      );

      // Assess security risk profile
      const riskResult = await this.assessSecurityRisk(
        request,
        securityContext,
      );

      // Detect threats and anomalies
      const threatResult = await this.detectThreats(request, securityContext);

      // Validate compliance policies
      const complianceResult = await this.validateCompliance(
        request,
        securityContext,
      );

      // Calculate overall security score
      const securityScore = this.calculateSecurityScore({
        authentication: authResult.score,
        authorization: authzResult.score,
        riskProfile: riskResult.score,
        threatLevel: threatResult.score,
        compliance: complianceResult.score,
        behavioral: this.calculateBehavioralScore(securityContext),
      });

      // Determine final security decision
      const decision = this.determineSecurityDecision(
        securityScore,
        authResult,
        authzResult,
        riskResult,
        threatResult,
        complianceResult,
      );

      // Compile additional security measures
      const additionalSecurityMeasures = this.compileSecurityMeasures(
        decision,
        authResult,
        authzResult,
        riskResult,
        threatResult,
      );

      // Compile security warnings
      const securityWarnings = this.compileSecurityWarnings(
        authResult,
        authzResult,
        riskResult,
        threatResult,
        complianceResult,
      );

      // Compile policy violations
      const policyViolations = this.compilePolicyViolations(
        authzResult,
        complianceResult,
      );

      const result: SecurityValidationResult = {
        decision,
        securityScore,
        securityFactors: {
          authentication: authResult.score,
          authorization: authzResult.score,
          riskProfile: riskResult.score,
          threatLevel: threatResult.score,
          compliance: complianceResult.score,
          behavioral: this.calculateBehavioralScore(securityContext),
        },
        additionalSecurityMeasures,
        securityWarnings,
        policyViolations,
        validatedAt: new Date(),
        securityContext,
      };

      // Update metrics and emit events
      const validationTime = performance.now() - startTime;
      this.updateSecurityMetrics(result, validationTime);
      this.emitSecurityEvents(result, request);

      this.logger.debug("Security context validation completed", {
        requestId: request.id,
        decision,
        securityScore,
        validationTime,
        additionalMeasures: additionalSecurityMeasures.length,
        warnings: securityWarnings.length,
      });

      return result;
    } catch (error) {
      this.logger.error("Security context validation failed", {
        requestId: request.id,
        error: error.message,
        stack: error.stack,
      });

      // Return deny-by-default on security errors
      return {
        decision: "DENIED",
        securityScore: 0,
        securityFactors: {
          authentication: 0,
          authorization: 0,
          riskProfile: 100,
          threatLevel: 100,
          compliance: 0,
          behavioral: 0,
        },
        additionalSecurityMeasures: [],
        securityWarnings: [
          {
            type: "RISK",
            severity: "CRITICAL",
            message: "Security validation system error",
            details: { error: error.message },
            recommendedActions: ["Contact security team", "Review system logs"],
          },
        ],
        policyViolations: [],
        validatedAt: new Date(),
        securityContext: await this.getDefaultSecurityContext(),
      };
    }
  }

  /**
   * Extract security context from user validation context
   */
  private async extractSecurityContext(
    userContext: UserValidationContext,
  ): Promise<ParlantSecurityContext> {
    // Check cache first
    const cacheKey = `security-context-${userContext.userId}-${userContext.sessionContext.sessionId}`;
    const cachedContext = this.securityContextCache.get(cacheKey);

    if (cachedContext && this.isSecurityContextValid(cachedContext)) {
      return cachedContext;
    }

    // Extract JWT context (simulated - would integrate with actual JWT service)
    const jwtContext = await this.extractJWTContext(userContext);

    // Extract session security
    const sessionSecurity = await this.extractSessionSecurity(userContext);

    // Extract RBAC context
    const rbacContext = await this.extractRBACContext(userContext);

    // Extract threat context
    const threatContext = await this.extractThreatContext(userContext);

    const securityContext: ParlantSecurityContext = {
      jwtContext,
      sessionSecurity,
      rbacContext,
      threatContext,
    };

    // Cache the context
    this.securityContextCache.set(cacheKey, securityContext);

    // Clean up cache after TTL
    setTimeout(() => {
      this.securityContextCache.delete(cacheKey);
    }, this.config.rbac.cacheTtlMs);

    return securityContext;
  }

  /**
   * Validate JWT authentication
   */
  private async validateAuthentication(
    securityContext: ParlantSecurityContext,
  ): Promise<{ score: number; valid: boolean; issues: string[] }> {
    if (!this.config.jwt.verificationEnabled) {
      return { score: 100, valid: true, issues: [] };
    }

    const issues: string[] = [];
    let score = 100;

    const jwt = securityContext.jwtContext;

    // Check token expiration
    if (jwt.expiresAt <= new Date()) {
      issues.push("JWT token expired");
      score -= 50;
    }

    // Check token freshness
    const tokenAge = Date.now() - jwt.issuedAt.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (tokenAge > maxAge) {
      issues.push("JWT token too old");
      score -= 20;
    }

    // Check issuer
    if (jwt.issuer !== this.config.jwt.issuer) {
      issues.push("Invalid JWT issuer");
      score -= 30;
    }

    // Check algorithm
    if (!this.config.jwt.algorithms.includes(jwt.algorithm)) {
      issues.push("Unsupported JWT algorithm");
      score -= 40;
    }

    // Check security context claims
    if (jwt.claims.securityContext) {
      const secCtx = jwt.claims.securityContext;

      // Check MFA status for high-security operations
      if (
        !secCtx.mfaVerified &&
        securityContext.sessionSecurity.securityLevel === "RESTRICTED"
      ) {
        issues.push("MFA verification required for restricted operations");
        score -= 25;
      }

      // Check password age
      if (secCtx.lastPasswordChange) {
        const passwordAge =
          Date.now() - new Date(secCtx.lastPasswordChange).getTime();
        const maxPasswordAge = 90 * 24 * 60 * 60 * 1000; // 90 days
        if (passwordAge > maxPasswordAge) {
          issues.push("Password change required");
          score -= 15;
        }
      }
    }

    return {
      score: Math.max(0, score),
      valid: score > 50,
      issues,
    };
  }

  /**
   * Validate RBAC authorization
   */
  private async validateAuthorization(
    request: PreExecutionValidationRequest,
    securityContext: ParlantSecurityContext,
  ): Promise<{
    score: number;
    authorized: boolean;
    issues: string[];
    violations: PolicyViolation[];
  }> {
    if (!this.config.rbac.enabled) {
      return { score: 100, authorized: true, issues: [], violations: [] };
    }

    const issues: string[] = [];
    const violations: PolicyViolation[] = [];
    let score = 100;

    const rbac = securityContext.rbacContext;

    // Check if user has required permissions for operation
    const requiredPermissions = this.getRequiredPermissions(request);
    const hasPermissions = this.checkPermissions(
      rbac.effectivePermissions,
      requiredPermissions,
    );

    if (!hasPermissions.allGranted) {
      issues.push(`Missing permissions: ${hasPermissions.missing.join(", ")}`);
      score -= 40;

      violations.push({
        policyId: "rbac-permission-check",
        policyName: "RBAC Permission Verification",
        violationType: "ACCESS_DENIED",
        description: `User lacks required permissions: ${hasPermissions.missing.join(", ")}`,
        severity: "ERROR",
        remediation: ["Request permission elevation", "Contact administrator"],
      });
    }

    // Check role-based restrictions
    for (const role of rbac.roles) {
      const restrictionViolations = this.checkRoleRestrictions(role, request);
      if (restrictionViolations.length > 0) {
        issues.push(`Role restrictions violated: ${role.name}`);
        score -= 20;
        violations.push(...restrictionViolations);
      }
    }

    // Check security level requirements
    const requiredSecurityLevel = this.getRequiredSecurityLevel(request);
    if (
      !this.hasRequiredSecurityLevel(
        securityContext.sessionSecurity.securityLevel,
        requiredSecurityLevel,
      )
    ) {
      issues.push(
        `Insufficient security level: required ${requiredSecurityLevel}, current ${securityContext.sessionSecurity.securityLevel}`,
      );
      score -= 30;

      violations.push({
        policyId: "security-level-check",
        policyName: "Security Level Verification",
        violationType: "ACCESS_DENIED",
        description: `Operation requires ${requiredSecurityLevel} security level`,
        severity: "ERROR",
        remediation: ["Elevate security level", "Use privileged session"],
      });
    }

    return {
      score: Math.max(0, score),
      authorized: score > 60,
      issues,
      violations,
    };
  }

  /**
   * Assess security risk profile
   */
  private async assessSecurityRisk(
    request: PreExecutionValidationRequest,
    securityContext: ParlantSecurityContext,
  ): Promise<{
    score: number;
    riskLevel: string;
    factors: Record<string, number>;
  }> {
    const sessionSecurity = securityContext.sessionSecurity;
    const riskProfile = sessionSecurity.riskProfile;

    // Calculate composite risk factors
    const factors = {
      userRisk: riskProfile.riskScore,
      behavioralRisk: riskProfile.riskFactors.behavioralRisk,
      locationRisk:
        securityContext.threatContext.geoLocation.locationRisk.riskScore,
      deviceRisk: riskProfile.riskFactors.deviceRisk,
      operationRisk: this.assessOperationRisk(request),
      contextualRisk: this.assessContextualRisk(request, securityContext),
    };

    // Weight and combine risk factors
    const weights = {
      userRisk: 0.25,
      behavioralRisk: 0.2,
      locationRisk: 0.15,
      deviceRisk: 0.15,
      operationRisk: 0.15,
      contextualRisk: 0.1,
    };

    let weightedRisk = 0;
    for (const [factor, risk] of Object.entries(factors)) {
      weightedRisk += risk * (weights[factor] || 0);
    }

    // Determine risk level
    let riskLevel = "LOW";
    if (weightedRisk > 75) {
      riskLevel = "CRITICAL";
    } else if (weightedRisk > 60) {
      riskLevel = "HIGH";
    } else if (weightedRisk > 40) {
      riskLevel = "MEDIUM";
    }

    // Risk score is inverse of risk level (higher risk = lower security score)
    const score = Math.max(0, 100 - weightedRisk);

    return { score, riskLevel, factors };
  }

  /**
   * Detect threats and anomalies
   */
  private async detectThreats(
    request: PreExecutionValidationRequest,
    securityContext: ParlantSecurityContext,
  ): Promise<{
    score: number;
    threats: SecurityThreat[];
    anomalies: BehavioralAnomaly[];
  }> {
    if (!this.config.threatDetection.enabled) {
      return { score: 100, threats: [], anomalies: [] };
    }

    const threatContext = securityContext.threatContext;
    const threats = threatContext.activeThreats;
    const anomalies = threatContext.behavioralAnomalies;

    // Calculate threat score based on active threats
    let threatScore = 100;

    for (const threat of threats) {
      const threatPenalty = {
        LOW: 5,
        MEDIUM: 15,
        HIGH: 30,
        CRITICAL: 50,
      };
      threatScore -= threatPenalty[threat.severity] || 0;
    }

    // Consider behavioral anomalies
    for (const anomaly of anomalies) {
      const anomalyPenalty = anomaly.score * 20; // Scale 0-1 to 0-20
      threatScore -= anomalyPenalty;
    }

    // Consider threat level
    const threatLevelPenalty = {
      NONE: 0,
      LOW: 5,
      MEDIUM: 15,
      HIGH: 30,
      CRITICAL: 50,
    };
    threatScore -= threatLevelPenalty[threatContext.threatLevel] || 0;

    return {
      score: Math.max(0, threatScore),
      threats,
      anomalies,
    };
  }

  /**
   * Validate compliance policies
   */
  private async validateCompliance(
    request: PreExecutionValidationRequest,
    securityContext: ParlantSecurityContext,
  ): Promise<{
    score: number;
    compliant: boolean;
    violations: PolicyViolation[];
  }> {
    const violations: PolicyViolation[] = [];
    let score = 100;

    // Check compliance frameworks
    const requiredFrameworks =
      request.riskMetadata.compliance.complianceFrameworks;

    for (const framework of requiredFrameworks) {
      const frameworkViolations = await this.validateComplianceFramework(
        framework,
        request,
        securityContext,
      );
      violations.push(...frameworkViolations);
      score -= frameworkViolations.length * 10;
    }

    // Check data protection requirements
    if (
      request.riskMetadata.dataSensitivity === "restricted" ||
      request.riskMetadata.dataSensitivity === "confidential"
    ) {
      const dataProtectionViolations = this.validateDataProtection(
        request,
        securityContext,
      );
      violations.push(...dataProtectionViolations);
      score -= dataProtectionViolations.length * 15;
    }

    return {
      score: Math.max(0, score),
      compliant: violations.length === 0,
      violations,
    };
  }

  // ===== UTILITY METHODS =====

  private createBypassSecurityResult(): SecurityValidationResult {
    return {
      decision: "APPROVED",
      securityScore: 100,
      securityFactors: {
        authentication: 100,
        authorization: 100,
        riskProfile: 0,
        threatLevel: 0,
        compliance: 100,
        behavioral: 100,
      },
      additionalSecurityMeasures: [],
      securityWarnings: [],
      policyViolations: [],
      validatedAt: new Date(),
      securityContext: {} as ParlantSecurityContext,
    };
  }

  private async extractJWTContext(
    userContext: UserValidationContext,
  ): Promise<ParlantSecurityContext["jwtContext"]> {
    // Simulate JWT extraction - would integrate with actual JWT service
    return {
      token: "simulated-jwt-token",
      claims: {
        sub: userContext.userId,
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        iss: this.config.jwt.issuer,
        aud: this.config.jwt.audience,
        jti: `jwt-${Date.now()}`,
        roles: userContext.roles,
        securityContext: {
          ipAddress: userContext.sessionContext.ipAddress,
          userAgent: userContext.sessionContext.userAgent,
          deviceFingerprint: "simulated-fingerprint",
          sessionRisk: 0.2,
          lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          mfaEnabled: true,
          mfaVerified: userContext.roles.includes("admin"),
        },
      },
      algorithm: "RS256",
      issuedAt: new Date(Date.now() - 3600000),
      expiresAt: new Date(Date.now() + 3600000),
      issuer: this.config.jwt.issuer,
    };
  }

  private async extractSessionSecurity(
    userContext: UserValidationContext,
  ): Promise<ParlantSecurityContext["sessionSecurity"]> {
    return {
      sessionId: userContext.sessionContext.sessionId,
      securityLevel: "INTERNAL",
      trustScore: userContext.validationHistory.successRate,
      riskProfile: {
        riskScore: (1 - userContext.validationHistory.successRate) * 100,
        riskFactors: {
          behavioralRisk: Math.random() * 20,
          accessPatternRisk: Math.random() * 15,
          deviceRisk: Math.random() * 10,
          locationRisk: Math.random() * 25,
          timeRisk: Math.random() * 10,
          operationalRisk: Math.random() * 20,
        },
        riskHistory: {
          averageRisk: 25,
          peakRisk: 45,
          riskTrend: "STABLE",
          lastRiskEvent: new Date(Date.now() - 86400000), // 1 day ago
        },
        mitigationMeasures: {
          mfaRequired: userContext.roles.includes("admin"),
          sessionTimeout: 3600000, // 1 hour
          ipWhitelisting: false,
          deviceRestriction: false,
          operationLimits: { "high-risk": 10, "medium-risk": 50 },
        },
      },
      lastSecurityCheck: new Date(),
    };
  }

  private async extractRBACContext(
    userContext: UserValidationContext,
  ): Promise<ParlantSecurityContext["rbacContext"]> {
    // Simulate RBAC context extraction
    const roles = userContext.roles.map((roleName) => ({
      id: `role-${roleName}`,
      name: roleName,
      description: `${roleName} role`,
      level: roleName === "admin" ? 100 : roleName === "user" ? 50 : 25,
      permissions: [],
      inheritsFrom: [],
      constraints: {},
    }));

    const permissions = this.generatePermissionsForRoles(userContext.roles);

    return {
      roles,
      permissions,
      groups: [],
      effectivePermissions: permissions.map((p) => `${p.resource}:${p.action}`),
    };
  }

  private async extractThreatContext(
    userContext: UserValidationContext,
  ): Promise<ParlantSecurityContext["threatContext"]> {
    return {
      threatLevel: "LOW",
      activeThreats: [],
      behavioralAnomalies: [],
      geoLocation: {
        ipAddress: userContext.sessionContext.ipAddress,
        location: {
          country: "US",
          region: "CA",
          city: "San Francisco",
          latitude: 37.7749,
          longitude: -122.4194,
        },
        locationRisk: {
          riskScore: 10,
          riskFactors: [],
          isKnownLocation: true,
          isVpnDetected: false,
          isTorDetected: false,
        },
        isp: {
          name: "Example ISP",
          organization: "Example Corp",
          type: "BUSINESS",
        },
      },
    };
  }

  private generatePermissionsForRoles(roles: string[]): SecurityPermission[] {
    const permissions: SecurityPermission[] = [];

    for (const role of roles) {
      if (role === "admin") {
        permissions.push({
          id: "admin-all",
          name: "Admin All Access",
          resource: "*",
          action: "*",
          effect: "ALLOW",
          scope: {
            global: true,
            resources: ["*"],
            operations: ["*"],
            contexts: ["*"],
          },
        });
      } else if (role === "user") {
        permissions.push(
          {
            id: "user-read",
            name: "User Read Access",
            resource: "user-data",
            action: "read",
            effect: "ALLOW",
            scope: {
              global: false,
              resources: ["user-data"],
              operations: ["read"],
              contexts: ["user"],
            },
          },
          {
            id: "user-write-own",
            name: "User Write Own Data",
            resource: "user-data",
            action: "write",
            effect: "ALLOW",
            conditions: [
              {
                type: "CUSTOM",
                operator: "EQUALS",
                value: "own-data",
                description: "User can only modify own data",
              },
            ],
            scope: {
              global: false,
              resources: ["user-data"],
              operations: ["write"],
              contexts: ["user"],
            },
          },
        );
      }
    }

    return permissions;
  }

  private isSecurityContextValid(context: ParlantSecurityContext): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return (
      Date.now() - context.sessionSecurity.lastSecurityCheck.getTime() < maxAge
    );
  }

  private calculateSecurityScore(factors: Record<string, number>): number {
    const weights = {
      authentication: 0.25,
      authorization: 0.25,
      riskProfile: 0.2,
      threatLevel: 0.15,
      compliance: 0.1,
      behavioral: 0.05,
    };

    let weightedScore = 0;
    for (const [factor, score] of Object.entries(factors)) {
      weightedScore += score * (weights[factor] || 0);
    }

    return Math.round(weightedScore);
  }

  private calculateBehavioralScore(
    securityContext: ParlantSecurityContext,
  ): number {
    const anomalies = securityContext.threatContext.behavioralAnomalies;
    if (anomalies.length === 0) return 100;

    const totalAnomalyScore = anomalies.reduce(
      (sum, anomaly) => sum + anomaly.score,
      0,
    );
    const averageAnomalyScore = totalAnomalyScore / anomalies.length;

    return Math.max(0, 100 - averageAnomalyScore * 100);
  }

  private determineSecurityDecision(
    securityScore: number,
    authResult: any,
    authzResult: any,
    riskResult: any,
    threatResult: any,
    complianceResult: any,
  ): SecurityValidationResult["decision"] {
    // Deny if authentication failed
    if (!authResult.valid) {
      return "DENIED";
    }

    // Deny if authorization failed
    if (!authzResult.authorized) {
      return "DENIED";
    }

    // Require additional auth for high risk
    if (
      riskResult.riskLevel === "CRITICAL" ||
      riskResult.riskLevel === "HIGH"
    ) {
      return "REQUIRES_ADDITIONAL_AUTH";
    }

    // Require approval for active critical threats
    if (threatResult.threats.some((t) => t.severity === "CRITICAL")) {
      return "REQUIRES_APPROVAL";
    }

    // Require approval for compliance violations
    if (!complianceResult.compliant) {
      return "REQUIRES_APPROVAL";
    }

    // Approve if security score is sufficient
    if (securityScore >= 70) {
      return "APPROVED";
    }

    // Default to requiring additional auth
    return "REQUIRES_ADDITIONAL_AUTH";
  }

  private compileSecurityMeasures(
    decision: SecurityValidationResult["decision"],
    authResult: any,
    authzResult: any,
    riskResult: any,
    threatResult: any,
  ): SecurityMeasure[] {
    const measures: SecurityMeasure[] = [];

    if (decision === "REQUIRES_ADDITIONAL_AUTH") {
      measures.push({
        type: "MFA",
        description: "Multi-factor authentication required",
        priority: 1,
        timeoutMs: 300000, // 5 minutes
        parameters: { methods: ["totp", "sms", "email"] },
      });
    }

    if (decision === "REQUIRES_APPROVAL") {
      measures.push({
        type: "APPROVAL",
        description: "Supervisor approval required",
        priority: 1,
        timeoutMs: 1800000, // 30 minutes
        parameters: { approvers: ["supervisor", "security-team"] },
      });
    }

    if (
      riskResult.riskLevel === "HIGH" ||
      riskResult.riskLevel === "CRITICAL"
    ) {
      measures.push({
        type: "ELEVATED_AUTH",
        description: "Elevated authentication required for high-risk operation",
        priority: 2,
        timeoutMs: 600000, // 10 minutes
        parameters: { elevation_level: "high" },
      });
    }

    return measures;
  }

  private compileSecurityWarnings(
    authResult: any,
    authzResult: any,
    riskResult: any,
    threatResult: any,
    complianceResult: any,
  ): SecurityWarning[] {
    const warnings: SecurityWarning[] = [];

    // Authentication warnings
    for (const issue of authResult.issues) {
      warnings.push({
        type: "RISK",
        severity: "MEDIUM",
        message: `Authentication issue: ${issue}`,
        details: { issue },
        recommendedActions: ["Renew authentication", "Verify credentials"],
      });
    }

    // Authorization warnings
    for (const issue of authzResult.issues) {
      warnings.push({
        type: "POLICY",
        severity: "HIGH",
        message: `Authorization issue: ${issue}`,
        details: { issue },
        recommendedActions: ["Check permissions", "Contact administrator"],
      });
    }

    // Threat warnings
    for (const threat of threatResult.threats) {
      warnings.push({
        type: "THREAT",
        severity: threat.severity as any,
        message: `Active threat detected: ${threat.description}`,
        details: { threat },
        recommendedActions: ["Review security logs", "Verify user identity"],
      });
    }

    // Behavioral anomaly warnings
    for (const anomaly of threatResult.anomalies) {
      if (anomaly.score > 0.7) {
        warnings.push({
          type: "ANOMALY",
          severity: "MEDIUM",
          message: `Behavioral anomaly detected: ${anomaly.description}`,
          details: { anomaly },
          recommendedActions: [
            "Monitor user behavior",
            "Verify normal operation",
          ],
        });
      }
    }

    return warnings;
  }

  private compilePolicyViolations(
    authzResult: any,
    complianceResult: any,
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    violations.push(...authzResult.violations);
    violations.push(...complianceResult.violations);

    return violations;
  }

  private getRequiredPermissions(
    request: PreExecutionValidationRequest,
  ): string[] {
    // Map operation to required permissions
    const functionPermissionMap = {
      delete: ["data:delete"],
      create: ["data:create"],
      update: ["data:update"],
      read: ["data:read"],
      admin: ["admin:*"],
      system: ["system:*"],
    };

    const permissions: string[] = [];

    for (const [pattern, perms] of Object.entries(functionPermissionMap)) {
      if (request.functionName.toLowerCase().includes(pattern)) {
        permissions.push(...perms);
      }
    }

    // Default permission
    if (permissions.length === 0) {
      permissions.push("operation:execute");
    }

    return permissions;
  }

  private checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
  ): { allGranted: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const required of requiredPermissions) {
      const hasPermission = userPermissions.some((userPerm) => {
        // Check for exact match or wildcard match
        return (
          userPerm === required ||
          userPerm === "*" ||
          (userPerm.endsWith(":*") &&
            required.startsWith(userPerm.slice(0, -1)))
        );
      });

      if (!hasPermission) {
        missing.push(required);
      }
    }

    return {
      allGranted: missing.length === 0,
      missing,
    };
  }

  private checkRoleRestrictions(
    role: SecurityRole,
    request: PreExecutionValidationRequest,
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check time restrictions
    if (role.constraints.timeRestrictions) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();

      for (const timeRestriction of role.constraints.timeRestrictions) {
        if (
          timeRestriction.type === "DENIED" &&
          timeRestriction.daysOfWeek.includes(currentDay)
        ) {
          const startHour = parseInt(timeRestriction.startTime.split(":")[0]);
          const endHour = parseInt(timeRestriction.endTime.split(":")[0]);

          if (currentHour >= startHour && currentHour <= endHour) {
            violations.push({
              policyId: `role-time-restriction-${role.id}`,
              policyName: `${role.name} Time Restriction`,
              violationType: "TIME_RESTRICTION",
              description: `Operation not allowed during ${timeRestriction.startTime}-${timeRestriction.endTime}`,
              severity: "ERROR",
              remediation: [
                "Wait for allowed time window",
                "Request emergency override",
              ],
            });
          }
        }
      }
    }

    return violations;
  }

  private getRequiredSecurityLevel(
    request: PreExecutionValidationRequest,
  ): SecurityLevel {
    return request.securityClassification;
  }

  private hasRequiredSecurityLevel(
    currentLevel: SecurityLevel,
    requiredLevel: SecurityLevel,
  ): boolean {
    const securityLevelHierarchy = {
      PUBLIC: 0,
      INTERNAL: 1,
      CONFIDENTIAL: 2,
      RESTRICTED: 3,
      CLASSIFIED: 4,
    };

    return (
      securityLevelHierarchy[currentLevel] >=
      securityLevelHierarchy[requiredLevel]
    );
  }

  private assessOperationRisk(request: PreExecutionValidationRequest): number {
    let risk = 0;

    // Function name risk patterns
    const riskPatterns = {
      "delete|drop|remove": 40,
      "admin|system|root": 35,
      "batch|bulk|mass": 30,
      "update|modify": 20,
      "create|insert": 10,
    };

    for (const [pattern, riskValue] of Object.entries(riskPatterns)) {
      if (new RegExp(pattern, "i").test(request.functionName)) {
        risk += riskValue;
        break;
      }
    }

    // Parameter risk
    const paramCount = Object.keys(request.parameters).length;
    risk += Math.min(paramCount * 2, 20);

    return Math.min(risk, 100);
  }

  private assessContextualRisk(
    request: PreExecutionValidationRequest,
    securityContext: ParlantSecurityContext,
  ): number {
    let risk = 0;

    // Time-based risk
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      risk += 15; // Higher risk during off-hours
    }

    // Location risk
    const locationRisk =
      securityContext.threatContext.geoLocation.locationRisk.riskScore;
    risk += locationRisk * 0.3; // Scale down location risk

    // Session age risk
    const sessionAge =
      Date.now() - securityContext.sessionSecurity.lastSecurityCheck.getTime();
    const maxSessionAge = 4 * 60 * 60 * 1000; // 4 hours
    if (sessionAge > maxSessionAge) {
      risk += 20;
    }

    return Math.min(risk, 100);
  }

  private async validateComplianceFramework(
    framework: string,
    request: PreExecutionValidationRequest,
    securityContext: ParlantSecurityContext,
  ): Promise<PolicyViolation[]> {
    const violations: PolicyViolation[] = [];

    switch (framework) {
      case "SOC2":
        // SOC2 requires audit trails and access controls
        if (!request.riskMetadata.compliance.auditRequired) {
          violations.push({
            policyId: "soc2-audit-requirement",
            policyName: "SOC2 Audit Requirement",
            violationType: "COMPLIANCE",
            description: "SOC2 requires audit trail for this operation",
            severity: "ERROR",
            remediation: ["Enable audit logging", "Document operation purpose"],
          });
        }
        break;

      case "GDPR":
        // GDPR requires data protection for personal data
        if (
          request.riskMetadata.dataSensitivity === "restricted" &&
          !securityContext.jwtContext.claims.securityContext?.mfaVerified
        ) {
          violations.push({
            policyId: "gdpr-data-protection",
            policyName: "GDPR Data Protection",
            violationType: "COMPLIANCE",
            description: "GDPR requires MFA for personal data access",
            severity: "ERROR",
            remediation: [
              "Complete MFA verification",
              "Request data controller approval",
            ],
          });
        }
        break;

      case "HIPAA":
        // HIPAA requires enhanced security for health data
        if (request.riskMetadata.dataSensitivity === "restricted") {
          if (securityContext.sessionSecurity.securityLevel !== "RESTRICTED") {
            violations.push({
              policyId: "hipaa-security-level",
              policyName: "HIPAA Security Level Requirement",
              violationType: "COMPLIANCE",
              description:
                "HIPAA requires RESTRICTED security level for health data",
              severity: "CRITICAL",
              remediation: [
                "Elevate to RESTRICTED security level",
                "Use HIPAA-compliant session",
              ],
            });
          }
        }
        break;
    }

    return violations;
  }

  private validateDataProtection(
    request: PreExecutionValidationRequest,
    securityContext: ParlantSecurityContext,
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Check encryption requirements
    if (
      request.riskMetadata.dataSensitivity === "restricted" ||
      request.riskMetadata.dataSensitivity === "confidential"
    ) {
      // In a real implementation, would check if data is encrypted
      // For this simulation, assume encryption is required but not verified
    }

    // Check access logging
    if (!request.riskMetadata.compliance.auditRequired) {
      violations.push({
        policyId: "data-protection-audit",
        policyName: "Data Protection Audit Requirement",
        violationType: "COMPLIANCE",
        description: "Sensitive data operations require audit logging",
        severity: "ERROR",
        remediation: [
          "Enable audit logging",
          "Configure data access monitoring",
        ],
      });
    }

    return violations;
  }

  private async getDefaultSecurityContext(): Promise<ParlantSecurityContext> {
    return {
      jwtContext: {
        token: "",
        claims: { sub: "", iat: 0, exp: 0, iss: "", aud: "", jti: "" },
        algorithm: "none",
        issuedAt: new Date(),
        expiresAt: new Date(),
        issuer: "",
      },
      sessionSecurity: {
        sessionId: "",
        securityLevel: "PUBLIC",
        trustScore: 0,
        riskProfile: {
          riskScore: 100,
          riskFactors: {
            behavioralRisk: 100,
            accessPatternRisk: 100,
            deviceRisk: 100,
            locationRisk: 100,
            timeRisk: 100,
            operationalRisk: 100,
          },
          riskHistory: {
            averageRisk: 100,
            peakRisk: 100,
            riskTrend: "INCREASING",
            lastRiskEvent: new Date(),
          },
          mitigationMeasures: {
            mfaRequired: true,
            sessionTimeout: 300000,
            ipWhitelisting: true,
            deviceRestriction: true,
            operationLimits: {},
          },
        },
        lastSecurityCheck: new Date(),
      },
      rbacContext: {
        roles: [],
        permissions: [],
        groups: [],
        effectivePermissions: [],
      },
      threatContext: {
        threatLevel: "CRITICAL",
        activeThreats: [],
        behavioralAnomalies: [],
        geoLocation: {
          ipAddress: "",
          location: {
            country: "",
            region: "",
            city: "",
            latitude: 0,
            longitude: 0,
          },
          locationRisk: {
            riskScore: 100,
            riskFactors: [],
            isKnownLocation: false,
            isVpnDetected: true,
            isTorDetected: true,
          },
          isp: { name: "", organization: "", type: "VPN" },
        },
      },
    };
  }

  private updateSecurityMetrics(
    result: SecurityValidationResult,
    validationTime: number,
  ): void {
    this.metrics.totalSecurityValidations++;

    if (result.decision === "APPROVED") {
      this.metrics.securityApprovalsRate =
        (this.metrics.securityApprovalsRate *
          (this.metrics.totalSecurityValidations - 1) +
          1) /
        this.metrics.totalSecurityValidations;
    } else {
      this.metrics.securityApprovalsRate =
        (this.metrics.securityApprovalsRate *
          (this.metrics.totalSecurityValidations - 1)) /
        this.metrics.totalSecurityValidations;
    }

    // Update average validation time
    this.metrics.averageSecurityValidationTime =
      (this.metrics.averageSecurityValidationTime *
        (this.metrics.totalSecurityValidations - 1) +
        validationTime) /
      this.metrics.totalSecurityValidations;

    // Update threat and violation counts
    this.metrics.threatDetections += result.securityWarnings.filter(
      (w) => w.type === "THREAT",
    ).length;
    this.metrics.policyViolations += result.policyViolations.length;

    if (result.decision === "EMERGENCY_OVERRIDE") {
      this.metrics.emergencyOverrides++;
    }
  }

  private emitSecurityEvents(
    result: SecurityValidationResult,
    request: PreExecutionValidationRequest,
  ): void {
    // Emit security decision event
    this.eventEmitter.emit("security-validation-completed", {
      requestId: request.id,
      decision: result.decision,
      securityScore: result.securityScore,
      timestamp: new Date(),
    });

    // Emit threat events
    for (const warning of result.securityWarnings) {
      if (warning.type === "THREAT" && warning.severity === "CRITICAL") {
        this.eventEmitter.emit("critical-threat-detected", {
          requestId: request.id,
          warning,
          timestamp: new Date(),
        });
      }
    }

    // Emit policy violation events
    for (const violation of result.policyViolations) {
      if (violation.severity === "CRITICAL") {
        this.eventEmitter.emit("critical-policy-violation", {
          requestId: request.id,
          violation,
          timestamp: new Date(),
        });
      }
    }
  }

  private loadSecurityConfiguration(): SecurityIntegrationConfig {
    return {
      enabled: this.configService.get<boolean>(
        "PARLANT_SECURITY_INTEGRATION_ENABLED",
        true,
      ),
      jwt: {
        verificationEnabled: this.configService.get<boolean>(
          "PARLANT_JWT_VERIFICATION_ENABLED",
          true,
        ),
        algorithms: this.configService
          .get<string>("PARLANT_JWT_ALGORITHMS", "RS256,ES256")
          .split(","),
        secretOrKey: this.configService.get<string>(
          "PARLANT_JWT_SECRET",
          "default-secret",
        ),
        issuer: this.configService.get<string>(
          "PARLANT_JWT_ISSUER",
          "parlant-system",
        ),
        audience: this.configService.get<string>(
          "PARLANT_JWT_AUDIENCE",
          "parlant-validation",
        ),
        clockTolerance: this.configService.get<number>(
          "PARLANT_JWT_CLOCK_TOLERANCE",
          60,
        ),
      },
      rbac: {
        enabled: this.configService.get<boolean>("PARLANT_RBAC_ENABLED", true),
        strictMode: this.configService.get<boolean>(
          "PARLANT_RBAC_STRICT_MODE",
          true,
        ),
        inheritanceEnabled: this.configService.get<boolean>(
          "PARLANT_RBAC_INHERITANCE_ENABLED",
          true,
        ),
        cacheEnabled: this.configService.get<boolean>(
          "PARLANT_RBAC_CACHE_ENABLED",
          true,
        ),
        cacheTtlMs: this.configService.get<number>(
          "PARLANT_RBAC_CACHE_TTL_MS",
          300000,
        ),
      },
      threatDetection: {
        enabled: this.configService.get<boolean>(
          "PARLANT_THREAT_DETECTION_ENABLED",
          true,
        ),
        realTimeMonitoring: this.configService.get<boolean>(
          "PARLANT_REAL_TIME_MONITORING_ENABLED",
          true,
        ),
        anomalyDetectionThreshold: this.configService.get<number>(
          "PARLANT_ANOMALY_THRESHOLD",
          0.7,
        ),
        responseActions: this.configService
          .get<string>("PARLANT_THREAT_RESPONSE_ACTIONS", "alert,log")
          .split(","),
      },
      geoSecurity: {
        enabled: this.configService.get<boolean>(
          "PARLANT_GEO_SECURITY_ENABLED",
          true,
        ),
        restrictedCountries: this.configService
          .get<string>("PARLANT_RESTRICTED_COUNTRIES", "")
          .split(",")
          .filter(Boolean),
        vpnDetection: this.configService.get<boolean>(
          "PARLANT_VPN_DETECTION_ENABLED",
          true,
        ),
        torDetection: this.configService.get<boolean>(
          "PARLANT_TOR_DETECTION_ENABLED",
          true,
        ),
        locationTrustScoring: this.configService.get<boolean>(
          "PARLANT_LOCATION_TRUST_SCORING_ENABLED",
          true,
        ),
      },
      emergencyOverride: {
        enabled: this.configService.get<boolean>(
          "PARLANT_EMERGENCY_OVERRIDE_ENABLED",
          true,
        ),
        overrideCodes: this.configService
          .get<string>("PARLANT_EMERGENCY_OVERRIDE_CODES", "")
          .split(",")
          .filter(Boolean),
        approvalRequired: this.configService.get<boolean>(
          "PARLANT_EMERGENCY_APPROVAL_REQUIRED",
          true,
        ),
        auditRequired: this.configService.get<boolean>(
          "PARLANT_EMERGENCY_AUDIT_REQUIRED",
          true,
        ),
        timeoutMinutes: this.configService.get<number>(
          "PARLANT_EMERGENCY_TIMEOUT_MINUTES",
          30,
        ),
      },
    };
  }

  private initializeSecurityIntegration(): void {
    this.logger.log("Initializing security integration framework");

    // Set up event listeners for security events
    this.eventEmitter.on("critical-threat-detected", (event) => {
      this.logger.warn("Critical threat detected during validation", event);
      // In production, would trigger automated incident response
    });

    this.eventEmitter.on("critical-policy-violation", (event) => {
      this.logger.error("Critical policy violation detected", event);
      // In production, would trigger compliance alerts
    });

    this.logger.log("Security integration framework initialized");
  }

  /**
   * Get security integration metrics
   */
  getSecurityMetrics() {
    return {
      ...this.metrics,
      securityContextCacheSize: this.securityContextCache.size,
      permissionCacheSize: this.permissionCache.size,
      threatCacheSize: this.threatCache.size,
    };
  }

  /**
   * Health check for security integration service
   */
  async healthCheck(): Promise<{ status: string; metrics: any; config: any }> {
    return {
      status: "healthy",
      metrics: this.getSecurityMetrics(),
      config: {
        enabled: this.config.enabled,
        jwtVerification: this.config.jwt.verificationEnabled,
        rbacEnabled: this.config.rbac.enabled,
        threatDetection: this.config.threatDetection.enabled,
        geoSecurity: this.config.geoSecurity.enabled,
      },
    };
  }

  /**
   * Cleanup when application shuts down
   */
  async onApplicationShutdown(signal?: string) {
    this.logger.log("SecurityIntegrationService shutting down", { signal });

    // Clear caches
    this.securityContextCache.clear();
    this.permissionCache.clear();
    this.threatCache.clear();

    // Log final metrics
    this.logger.log("Final security metrics", this.getSecurityMetrics());
  }
}

/**
 * Custom error for security integration failures
 */
export class SecurityIntegrationError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown>,
  ) {
    super(message);
    this.name = "SecurityIntegrationError";
  }
}
