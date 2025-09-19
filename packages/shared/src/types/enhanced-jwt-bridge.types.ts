/**
 * Enhanced JWT Bridge Types - PARLANT Phase 1 Integration
 *
 * Comprehensive type definitions for the enhanced JWT-Parlant bridge service
 * supporting bi-directional authentication, identity mapping, failover systems,
 * and enterprise-grade security monitoring.
 *
 * @module EnhancedJwtBridgeTypes
 * @version 2.0.0
 * @author PARLANT Phase 1 JWT Bridge Security Specialist
 */

import {
  Role as _Role,
  Permission as _Permission,
  ResourceType as _ResourceType,
} from "./rbac.types";

/**
 * Token exchange algorithms supported by the bridge
 */
export enum TokenExchangeAlgorithm {
  _RS256 = "RS256",
  _ES256 = "ES256",
  _EdDSA = "EdDSA",
  _HS256 = "HS256",
}

/**
 * Platform identifiers for token exchange
 */
export enum Platform {
  _AIGENT = "aigent",
  _PARLANT = "parlant",
}

/**
 * Security validation levels
 */
export enum SecurityValidationLevel {
  _BASIC = "basic",
  _STANDARD = "standard",
  _ELEVATED = "elevated",
  _CRITICAL = "critical",
}

/**
 * Token lifecycle operations
 */
export enum TokenLifecycleOperation {
  _REFRESH = "refresh",
  _REVOKE = "revoke",
  _EXTEND = "extend",
  _VALIDATE = "validate",
}

/**
 * System health status
 */
export enum SystemHealthStatus {
  _HEALTHY = "healthy",
  _DEGRADED = "degraded",
  _UNAVAILABLE = "unavailable",
}

/**
 * Security alert types
 */
export enum SecurityAlertType {
  _AUTHENTICATION_FAILURE = "authentication_failure",
  _TOKEN_ABUSE = "token_abuse",
  _SUSPICIOUS_ACTIVITY = "suspicious_activity",
  _SYSTEM_COMPROMISE = "system_compromise",
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _CRITICAL = "critical",
}

/**
 * Compliance report types
 */
export enum ComplianceReportType {
  _SOC2 = "soc2",
  _GDPR = "gdpr",
  _HIPAA = "hipaa",
  _PCI_DSS = "pci_dss",
  _COMPREHENSIVE = "comprehensive",
}

/**
 * Enhanced token validation context
 */
export interface TokenValidationContext {
  /** Request IP address */
  ipAddress: string;
  /** User agent string */
  userAgent: string;
  /** Request timestamp */
  timestamp: Date;
  /** Validation level required */
  validationLevel: SecurityValidationLevel;
  /** Source system */
  sourceSystem: Platform;
  /** Target system */
  targetSystem: Platform;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Token security properties
 */
export interface TokenSecurityProperties {
  /** Encryption algorithm */
  algorithm: TokenExchangeAlgorithm;
  /** Key ID for rotation */
  keyId: string;
  /** Security classification */
  classification: "public" | "internal" | "confidential" | "secret";
  /** Audience restrictions */
  audienceRestrictions: string[];
  /** Issuer validation */
  issuerValidation: boolean;
  /** Signature verification */
  signatureVerification: boolean;
  /** Timestamp validation */
  timestampValidation: boolean;
}

/**
 * Identity verification result
 */
export interface IdentityVerificationResult {
  /** Verification success */
  verified: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Verification method */
  method: "automatic" | "manual" | "biometric" | "mfa";
  /** Verification timestamp */
  timestamp: Date;
  /** Verification evidence */
  evidence: {
    factors: string[];
    riskScore: number;
    anomalies: string[];
  };
  /** Verification metadata */
  metadata: Record<string, unknown>;
}

/**
 * Cross-platform user context
 */
export interface CrossPlatformUserContext {
  /** User identifiers across platforms */
  identifiers: {
    aigent: {
      userId: string;
      username: string;
      email: string;
    };
    parlant: {
      userId: string;
      agentId: string;
      conversationId: string;
    };
  };
  /** Unified user profile */
  profile: {
    displayName: string;
    preferences: Record<string, unknown>;
    securitySettings: {
      mfaEnabled: boolean;
      sessionTimeout: number;
      ipRestrictions: string[];
    };
  };
  /** Permission synchronization */
  permissions: {
    aigent: Permission[];
    parlant: Permission[];
    synchronized: boolean;
    lastSyncAt: Date;
  };
  /** Session information */
  sessions: {
    active: boolean;
    platforms: Platform[];
    startTime: Date;
    lastActivity: Date;
  };
}

/**
 * Token exchange audit trail
 */
export interface TokenExchangeAuditTrail {
  /** Exchange ID */
  exchangeId: string;
  /** Source token fingerprint */
  sourceTokenFingerprint: string;
  /** Target token fingerprint */
  targetTokenFingerprint: string;
  /** Exchange timestamp */
  timestamp: Date;
  /** User context */
  userContext: CrossPlatformUserContext;
  /** Security context */
  securityContext: {
    riskScore: number;
    threatIndicators: string[];
    validationResults: Record<string, boolean>;
  };
  /** Performance metrics */
  performanceMetrics: {
    exchangeTime: number;
    validationTime: number;
    networkLatency: number;
  };
  /** Compliance tags */
  complianceTags: string[];
}

/**
 * Failover event details
 */
export interface FailoverEventDetails {
  /** Event ID */
  eventId: string;
  /** Trigger reason */
  triggerReason:
    | "health_check_failed"
    | "timeout"
    | "manual_failover"
    | "load_threshold";
  /** Source system */
  sourceSystem: {
    systemId: string;
    systemType: "primary" | "secondary" | "backup";
    lastHealthStatus: SystemHealthStatus;
    errorDetails?: string;
  };
  /** Target system */
  targetSystem: {
    systemId: string;
    systemType: "primary" | "secondary" | "backup";
    healthStatus: SystemHealthStatus;
    loadCapacity: number;
  };
  /** Migration details */
  migration: {
    sessionsAffected: number;
    migrationTime: number;
    successRate: number;
    failures: Array<{
      sessionId: string;
      reason: string;
    }>;
  };
  /** Timeline */
  timeline: {
    detectionTime: Date;
    decisionTime: Date;
    migrationStartTime: Date;
    migrationEndTime: Date;
    totalDuration: number;
  };
}

/**
 * Security monitoring configuration
 */
export interface SecurityMonitoringConfig {
  /** Monitoring intervals */
  intervals: {
    realTimeMonitoring: number; // milliseconds
    batchAnalysis: number; // milliseconds
    reportGeneration: number; // milliseconds
  };
  /** Detection thresholds */
  thresholds: {
    authenticationFailureRate: number;
    tokenAbuseCount: number;
    suspiciousActivityScore: number;
    systemAnomalyScore: number;
  };
  /** Alert configuration */
  alerting: {
    immediateAlerts: SecurityAlertType[];
    batchAlerts: SecurityAlertType[];
    escalationRules: Array<{
      severity: AlertSeverity;
      escalationTime: number;
      recipients: string[];
    }>;
  };
  /** Integration settings */
  integrations: {
    siem: {
      enabled: boolean;
      endpoint: string;
      apiKey: string;
    };
    webhook: {
      enabled: boolean;
      url: string;
      headers: Record<string, string>;
    };
  };
}

/**
 * Performance optimization configuration
 */
export interface PerformanceOptimizationConfig {
  /** Target response times (milliseconds) */
  targets: {
    authentication: number;
    tokenExchange: number;
    identityMapping: number;
    securityValidation: number;
  };
  /** Caching configuration */
  caching: {
    tokenCache: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
    identityMappingCache: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
    securityContextCache: {
      enabled: boolean;
      ttl: number;
      maxSize: number;
    };
  };
  /** Connection pooling */
  connectionPooling: {
    maxConnections: number;
    connectionTimeout: number;
    idleTimeout: number;
    retryAttempts: number;
  };
  /** Load balancing */
  loadBalancing: {
    algorithm: "round_robin" | "least_connections" | "weighted_round_robin";
    healthCheckInterval: number;
    failoverThreshold: number;
  };
}

/**
 * Compliance audit configuration
 */
export interface ComplianceAuditConfig {
  /** Retention policies */
  retention: {
    auditLogs: number; // days
    complianceReports: number; // days
    securityEvents: number; // days
    performanceMetrics: number; // days
  };
  /** Report scheduling */
  scheduling: {
    dailyReports: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    quarterlyReports: boolean;
    customSchedules: Array<{
      name: string;
      cron: string;
      reportType: ComplianceReportType;
    }>;
  };
  /** Data classification */
  classification: {
    levels: Array<{
      level: "public" | "internal" | "confidential" | "secret";
      retentionDays: number;
      encryptionRequired: boolean;
      accessControls: string[];
    }>;
  };
  /** Export configuration */
  export: {
    formats: ("json" | "csv" | "pdf" | "xml")[];
    compression: boolean;
    encryption: boolean;
    digitalSignature: boolean;
  };
}

/**
 * Enhanced bridge service configuration
 */
export interface EnhancedBridgeServiceConfig {
  /** Service identification */
  service: {
    name: string;
    version: string;
    environment: "development" | "staging" | "production";
    region: string;
  };
  /** Platform configurations */
  platforms: {
    aigent: {
      baseUrl: string;
      apiVersion: string;
      authentication: {
        type: "jwt" | "oauth2" | "api_key";
        credentials: Record<string, string>;
      };
      endpoints: {
        token: string;
        user: string;
        session: string;
        health: string;
      };
    };
    parlant: {
      baseUrl: string;
      apiVersion: string;
      authentication: {
        type: "jwt" | "oauth2" | "api_key";
        credentials: Record<string, string>;
      };
      endpoints: {
        conversation: string;
        agent: string;
        session: string;
        health: string;
      };
    };
  };
  /** Security configuration */
  security: TokenSecurityProperties & {
    rateLimiting: {
      enabled: boolean;
      windowMs: number;
      maxRequests: number;
      skipSuccessfulRequests: boolean;
    };
    ipWhitelist: string[];
    corsSettings: {
      origins: string[];
      methods: string[];
      allowCredentials: boolean;
    };
  };
  /** Monitoring configuration */
  monitoring: SecurityMonitoringConfig;
  /** Performance configuration */
  performance: PerformanceOptimizationConfig;
  /** Compliance configuration */
  compliance: ComplianceAuditConfig;
}

/**
 * Bridge service health check result
 */
export interface BridgeHealthCheckResult {
  /** Overall health status */
  status: SystemHealthStatus;
  /** Health check timestamp */
  timestamp: Date;
  /** Component health */
  components: {
    redis: {
      status: SystemHealthStatus;
      responseTime: number;
      connectionCount: number;
      memoryUsage: number;
    };
    aigent: {
      status: SystemHealthStatus;
      responseTime: number;
      apiVersion: string;
      lastSuccessfulCall: Date;
    };
    parlant: {
      status: SystemHealthStatus;
      responseTime: number;
      apiVersion: string;
      lastSuccessfulCall: Date;
    };
  };
  /** Performance metrics */
  performance: {
    avgResponseTime: number;
    successRate: number;
    throughput: number;
    errorRate: number;
  };
  /** Resource utilization */
  resources: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
}

/**
 * Token exchange rate limiting
 */
export interface TokenExchangeRateLimiting {
  /** Rate limiting rules */
  rules: Array<{
    platform: Platform;
    operation: TokenLifecycleOperation;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  }>;
  /** Current usage */
  usage: Map<
    string,
    {
      count: number;
      resetTime: Date;
      blocked: boolean;
    }
  >;
  /** Bypass rules */
  bypass: {
    ipAddresses: string[];
    userIds: string[];
    apiKeys: string[];
  };
}

/**
 * Identity synchronization status
 */
export interface IdentitySynchronizationStatus {
  /** Synchronization ID */
  syncId: string;
  /** User identifiers */
  userIds: {
    aigent: string;
    parlant: string;
  };
  /** Synchronization state */
  state: "pending" | "in_progress" | "completed" | "failed" | "conflict";
  /** Last synchronization */
  lastSync: {
    timestamp: Date;
    direction: "aigent_to_parlant" | "parlant_to_aigent" | "bidirectional";
    changedFields: string[];
    conflicts: Array<{
      field: string;
      aigentValue: unknown;
      parlantValue: unknown;
      resolution: "manual" | "auto_aigent" | "auto_parlant";
    }>;
  };
  /** Synchronization metadata */
  metadata: {
    priority: "low" | "medium" | "high" | "critical";
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: Date;
  };
}

/**
 * Export types for use in other modules
 */
export type {
  TokenValidationContext,
  TokenSecurityProperties,
  IdentityVerificationResult,
  CrossPlatformUserContext,
  TokenExchangeAuditTrail,
  FailoverEventDetails,
  SecurityMonitoringConfig,
  PerformanceOptimizationConfig,
  ComplianceAuditConfig,
  EnhancedBridgeServiceConfig,
  BridgeHealthCheckResult,
  TokenExchangeRateLimiting,
  IdentitySynchronizationStatus,
};
