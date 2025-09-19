/**
 * PARLANT Phase 1 Security Context Propagation - Module Index
 *
 * Comprehensive security context propagation system that provides enterprise-grade
 * security controls with zero-trust architecture, multi-factor authentication,
 * and real-time threat detection capabilities.
 *
 * @module ParlantSecurityContextPropagation
 * @version 1.0.0
 * @author PARLANT Phase 1 Security Context Propagation Team
 */

// Core Security Context Management
export { ParlantSecurityContextManager } from "./context-manager.service";
export type {
  EnhancedSecurityContext,
  SecurityContextMetadata,
  ContextLifecycle,
  SecurityControl,
  ContextIntegrity,
  ContextPropagation,
  ThreatAnalysis,
  ComplianceTracking,
  ContextCreationOptions,
  ContextValidationOptions,
} from "./context-manager.service";

// JWT Token Propagation and Validation
export { ParlantTokenPropagationService } from "./token-propagation.service";
export type {
  EnhancedJwtPayload,
  TokenSecurityMetadata,
  TokenPropagationHistory,
  TokenValidationContext,
  TokenValidationRequest,
  TokenValidationOptions,
  TokenValidationResult,
  TokenRefreshRequest,
  TokenRefreshOptions,
  TokenRefreshResult,
  TokenPropagationRequest,
  TokenPropagationOptions,
  TokenPropagationResult,
} from "./token-propagation.service";

// Authentication Bridge with Multi-Factor Integration
export { ParlantAuthenticationBridgeService } from "./authentication-bridge.service";
export type {
  AuthenticationMethod,
  AuthenticationFactor,
  AuthenticationRequest,
  AuthenticationRequestMetadata,
  AuthenticationResult,
  AuthenticationResultMetadata,
  SessionInformation,
  RiskAssessment,
  RiskFactor,
  AuthenticationAuditEntry,
  MfaChallenge,
  MfaSetupRequest,
  MfaSetupResult,
  GeolocationData,
  AuthenticationConfig,
} from "./authentication-bridge.service";

// Authorization Engine with Role-Based Inheritance
export { ParlantAuthorizationEngineService } from "./authorization-engine.service";
export type {
  Role,
  Permission,
  RoleConstraint,
  PermissionCondition,
  RoleMetadata,
  PermissionMetadata,
  AuthorizationRequest,
  ResourceIdentifier,
  AuthorizationContext,
  SessionContext,
  EnvironmentContext,
  NetworkContext,
  DeviceContext,
  BusinessContext,
  AuthorizationResult,
  ConditionalRequirement,
  AuthorizationResultMetadata,
  AuthorizationAuditEntry,
  PermissionEscalationRequest,
  ApproverRequirement,
  AuthorizationCacheEntry,
} from "./authorization-engine.service";

// Threat Detection and Response
export { ParlantThreatDetectionService } from "./threat-detection.service";
export type {
  ThreatSeverity,
  ThreatCategory,
  ResponseAction,
  SecurityEvent,
  EventMetadata,
  ThreatIndicator,
  ThreatPattern,
  PatternCondition,
  PatternScoring,
  ResponseConfiguration,
  DelayedAction,
  EscalationRule,
  NotificationRule,
  PatternMetadata,
  PatternStatistics,
  ThreatDetectionResult,
  DetectedThreat,
  ThreatEvidence,
  DetectionMetadata,
  BehavioralProfile,
  BehavioralBaseline,
  TimePattern,
  LocationPattern,
  DevicePattern,
  ActivityPattern,
  AccessPattern,
  AnomalyIndicator,
  IncidentResponse,
  ExecutedAction,
  ResponseMetadata,
} from "./threat-detection.service";

// Security Analytics and Monitoring
export { ParlantSecurityAnalyticsService } from "./security-analytics.service";
export type {
  AnalyticsPeriod,
  AggregationType,
  AlertSeverity,
  SecurityMetric,
  MetricMetadata,
  DashboardConfig,
  DashboardLayout,
  DashboardWidget,
  WidgetPosition,
  WidgetSize,
  WidgetConfig,
  TimeRange,
  DataSourceConfig,
  QueryConfig,
  AggregationConfig,
  DashboardFilter,
  FilterOption,
  DashboardMetadata,
  DashboardPermission,
  SecurityAlert,
  AlertEvidence,
  AlertMetadata,
  AlertRule,
  AlertCondition,
  AlertAction,
  AlertRuleMetadata,
  AlertRuleStatistics,
  ComplianceReport,
  ComplianceSection,
  ComplianceControl,
  ComplianceEvidence,
  ComplianceReportMetadata,
  AnalyticsQuery,
  AnalyticsResult,
  AnalyticsDataPoint,
  AnalyticsResultMetadata,
  QueryStatistics,
} from "./security-analytics.service";

/**
 * PARLANT Security Context Propagation Configuration
 */
export interface ParlantSecurityConfig {
  /** Context manager configuration */
  contextManager: {
    enabled: boolean;
    maxContextsPerUser: number;
    contextTTL: number;
    threatThreshold: number;
  };

  /** Token propagation configuration */
  tokenPropagation: {
    enabled: boolean;
    encryptionAlgorithm: string;
    accessTokenTTL: number;
    refreshTokenTTL: number;
    maxPropagationHops: number;
  };

  /** Authentication bridge configuration */
  authenticationBridge: {
    enabled: boolean;
    enabledMethods: AuthenticationMethod[];
    mfaRequirements: Record<string, AuthenticationMethod[]>;
    sessionTimeouts: Record<string, number>;
    adaptiveAuth: boolean;
  };

  /** Authorization engine configuration */
  authorizationEngine: {
    enabled: boolean;
    enableInheritance: boolean;
    enableCaching: boolean;
    maxPermissionDepth: number;
    maxRoleInheritanceDepth: number;
  };

  /** Threat detection configuration */
  threatDetection: {
    enabled: boolean;
    enableBehavioralAnalysis: boolean;
    enableRealTimeDetection: boolean;
    enableAutomatedResponse: boolean;
    threatScoreThreshold: number;
    anomalyScoreThreshold: number;
  };

  /** Security analytics configuration */
  securityAnalytics: {
    enabled: boolean;
    enableRealTimeMonitoring: boolean;
    enableComplianceReporting: boolean;
    metricsRetentionPeriod: number;
    alertRetentionPeriod: number;
    maxConcurrentQueries: number;
  };
}

/**
 * Default PARLANT Security Configuration
 */
export const DEFAULT_PARLANT_SECURITY_CONFIG: ParlantSecurityConfig = {
  contextManager: {
    enabled: true,
    maxContextsPerUser: 50,
    contextTTL: 3600000, // 1 hour
    threatThreshold: 0.7,
  },

  tokenPropagation: {
    enabled: true,
    encryptionAlgorithm: "RS256",
    accessTokenTTL: 3600, // 1 hour
    refreshTokenTTL: 86400, // 24 hours
    maxPropagationHops: 10,
  },

  authenticationBridge: {
    enabled: true,
    enabledMethods: ["password", "totp", "sms", "email", "push", "hardware_token", "biometric", "sso"],
    mfaRequirements: {
      low: [],
      moderate: ["totp", "sms"],
      high: ["totp", "hardware_token"],
      critical: ["hardware_token", "biometric"],
    },
    sessionTimeouts: {
      low: 86400000, // 24 hours
      moderate: 28800000, // 8 hours
      high: 14400000, // 4 hours
      critical: 3600000, // 1 hour
    },
    adaptiveAuth: true,
  },

  authorizationEngine: {
    enabled: true,
    enableInheritance: true,
    enableCaching: true,
    maxPermissionDepth: 10,
    maxRoleInheritanceDepth: 5,
  },

  threatDetection: {
    enabled: true,
    enableBehavioralAnalysis: true,
    enableRealTimeDetection: true,
    enableAutomatedResponse: true,
    threatScoreThreshold: 0.7,
    anomalyScoreThreshold: 0.6,
  },

  securityAnalytics: {
    enabled: true,
    enableRealTimeMonitoring: true,
    enableComplianceReporting: true,
    metricsRetentionPeriod: 2592000000, // 30 days
    alertRetentionPeriod: 7776000000, // 90 days
    maxConcurrentQueries: 50,
  },
};

/**
 * PARLANT Security Context Propagation Event Types
 */
export const PARLANT_SECURITY_EVENTS = {
  // Context Manager Events
  CONTEXT_CREATED: "context:created",
  CONTEXT_VALIDATED: "context:validated",
  CONTEXT_EXPIRED: "context:expired",
  CONTEXT_THREAT_DETECTED: "context:threat:detected",

  // Token Propagation Events
  TOKEN_GENERATED: "token:generated",
  TOKEN_VALIDATED: "token:validated",
  TOKEN_PROPAGATED: "token:propagated",
  TOKEN_REFRESHED: "token:refreshed",
  TOKEN_REVOKED: "token:revoked",

  // Authentication Bridge Events
  AUTH_SUCCESS: "auth:success",
  AUTH_FAILURE: "auth:failure",
  MFA_CHALLENGE_ISSUED: "mfa:challenge:issued",
  MFA_CHALLENGE_VALIDATED: "mfa:challenge:validated",

  // Authorization Engine Events
  AUTHZ_EVALUATED: "authz:evaluated",
  AUTHZ_ROLE_ASSIGNED: "authz:role:assigned",
  AUTHZ_ROLE_REMOVED: "authz:role:removed",
  AUTHZ_ESCALATION_REQUESTED: "authz:escalation:requested",
  AUTHZ_TEMPORARY_GRANTED: "authz:temporary:granted",

  // Threat Detection Events
  THREAT_DETECTED: "threat:detected",
  BEHAVIORAL_ANOMALY_DETECTED: "behavioral:anomaly:detected",
  INCIDENT_RESPONSE_EXECUTED: "incident:response:executed",

  // Security Analytics Events
  METRIC_INGESTED: "metric:ingested",
  QUERY_EXECUTED: "query:executed",
  ALERT_CREATED: "alert:created",
  DASHBOARD_RENDERED: "dashboard:rendered",
  COMPLIANCE_REPORT_GENERATED: "compliance:report:generated",
} as const;

/**
 * Security Context Propagation Utility Functions
 */
export class ParlantSecurityUtils {
  /**
   * Generate secure context identifier
   */
  static generateSecureId(): string {
    return `parlant_sec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Calculate security score
   */
  static calculateSecurityScore(factors: Array<{ weight: number; value: number }>): number {
    const totalWeightedScore = factors.reduce((sum, factor) => sum + (factor.weight * factor.value), 0);
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);

    return totalWeight > 0 ? Math.min(totalWeightedScore / totalWeight, 1.0) : 0;
  }

  /**
   * Sanitize sensitive data for logging
   */
  static sanitizeForLogging(data: unknown): unknown {
    if (typeof data === "string") {
      // Mask sensitive patterns
      return data
        .replace(/password["\s]*[:=]["\s]*[^",\s}]*/gi, 'password: "***"')
        .replace(/token["\s]*[:=]["\s]*[^",\s}]*/gi, 'token: "***"')
        .replace(/secret["\s]*[:=]["\s]*[^",\s}]*/gi, 'secret: "***"');
    }

    if (typeof data === "object" && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};

      for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes("password") ||
            key.toLowerCase().includes("token") ||
            key.toLowerCase().includes("secret")) {
          sanitized[key] = "***";
        } else {
          sanitized[key] = ParlantSecurityUtils.sanitizeForLogging(value);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Validate security configuration
   */
  static validateSecurityConfig(config: Partial<ParlantSecurityConfig>): string[] {
    const errors: string[] = [];

    if (config.contextManager?.contextTTL && config.contextManager.contextTTL < 60000) {
      errors.push("Context TTL must be at least 60 seconds");
    }

    if (config.tokenPropagation?.accessTokenTTL && config.tokenPropagation.accessTokenTTL < 300) {
      errors.push("Access token TTL must be at least 5 minutes");
    }

    if (config.authorizationEngine?.maxPermissionDepth && config.authorizationEngine.maxPermissionDepth > 20) {
      errors.push("Maximum permission depth should not exceed 20 levels");
    }

    return errors;
  }
}

/**
 * PARLANT Security Context Propagation Constants
 */
export const PARLANT_SECURITY_CONSTANTS = {
  /** Default encryption algorithms */
  ENCRYPTION: {
    JWT_ALGORITHM: "RS256" as const,
    CONTEXT_ALGORITHM: "AES-256-GCM" as const,
    HASH_ALGORITHM: "SHA-256" as const,
  },

  /** Security levels mapping */
  SECURITY_LEVELS: {
    LOW: "low" as const,
    MODERATE: "moderate" as const,
    HIGH: "high" as const,
    CRITICAL: "critical" as const,
  },

  /** Default timeouts and intervals */
  TIMEOUTS: {
    CONTEXT_TTL: 3600000, // 1 hour
    TOKEN_TTL: 3600, // 1 hour
    MFA_CHALLENGE_TTL: 300000, // 5 minutes
    SESSION_TIMEOUT: 28800000, // 8 hours
    QUERY_TIMEOUT: 30000, // 30 seconds
  },

  /** Performance thresholds */
  PERFORMANCE: {
    MAX_CONTEXT_CREATION_TIME: 1000, // 1 second
    MAX_TOKEN_VALIDATION_TIME: 500, // 500ms
    MAX_AUTHORIZATION_TIME: 200, // 200ms
    MAX_THREAT_DETECTION_TIME: 1000, // 1 second
    MAX_QUERY_EXECUTION_TIME: 5000, // 5 seconds
  },

  /** Error codes */
  ERROR_CODES: {
    CONTEXT_CREATION_FAILED: "CONTEXT_CREATE_ERROR",
    TOKEN_VALIDATION_FAILED: "TOKEN_VALIDATION_ERROR",
    AUTHENTICATION_FAILED: "AUTHENTICATION_ERROR",
    AUTHORIZATION_FAILED: "AUTHORIZATION_ERROR",
    THREAT_DETECTION_FAILED: "THREAT_DETECTION_ERROR",
    ANALYTICS_QUERY_FAILED: "QUERY_EXECUTION_ERROR",
  },
} as const;