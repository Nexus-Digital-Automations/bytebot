/**
 * Audit Event Types and Interfaces
 *
 * Comprehensive type definitions for enterprise-grade audit logging system
 * supporting security events, compliance requirements, and SIEM integration.
 *
 * NOTE: Many enum values are intentionally unused as they represent a complete
 * API surface for enterprise audit requirements. ESLint warnings are disabled
 * for comprehensive enum definitions that provide full industry-standard coverage.
 *
 * @fileoverview Core audit event types and interfaces
 * @version 2.0.0
 * @author Enterprise Security Audit Team
 * @created 2025-09-07
 */

/* eslint-disable no-unused-vars */

/**
 * Audit event severity levels following industry standards
 */
export enum AuditSeverity {
  /** Debug-level events for troubleshooting */
  DEBUG = "debug",
  /** Informational events for normal operations */
  INFO = "info",
  /** Warning events for potential security concerns */
  WARN = "warn",
  /** Error events for security violations */
  ERROR = "error",
  /** Critical events requiring immediate attention */
  CRITICAL = "critical",
  /** Fatal events indicating system compromise */
  FATAL = "fatal",
}

/**
 * Security event categories for comprehensive audit logging
 */
export enum SecurityEventCategory {
  /** Authentication events (login, logout, failed attempts) */
  AUTHENTICATION = "authentication",
  /** Authorization events (permission checks, role assignments) */
  AUTHORIZATION = "authorization",
  /** Data access events (read operations, queries) */
  DATA_ACCESS = "data_access",
  /** Data modification events (create, update, delete) */
  DATA_MODIFICATION = "data_modification",
  /** System events (startup, shutdown, configuration changes) */
  SYSTEM = "system",
  /** Security events (threat detection, policy violations) */
  SECURITY = "security",
  /** Compliance events (audit trail, regulatory reporting) */
  COMPLIANCE = "compliance",
  /** Performance events (monitoring, metrics) */
  PERFORMANCE = "performance",
  /** Network events (connections, traffic patterns) */
  NETWORK = "network",
  /** Error and exception events */
  ERROR = "error",
  /** User activity tracking */
  USER_ACTIVITY = "user_activity",
  /** API access and usage */
  API_ACCESS = "api_access",
}

/**
 * Compliance framework types
 */
export enum ComplianceFramework {
  /** General Data Protection Regulation */
  GDPR = "gdpr",
  /** Sarbanes-Oxley Act */
  SOX = "sox",
  /** Health Insurance Portability and Accountability Act */
  HIPAA = "hipaa",
  /** Payment Card Industry Data Security Standard */
  PCI_DSS = "pci_dss",
  /** International Organization for Standardization 27001 */
  ISO_27001 = "iso_27001",
  /** NIST Cybersecurity Framework */
  NIST_CSF = "nist_csf",
  /** Cloud Security Alliance */
  CSA = "csa",
  /** Open Web Application Security Project */
  OWASP = "owasp",
  /** Service Organization Control 2 */
  SOC2 = "soc2",
}

/**
 * Audit event processing status
 */
export enum AuditEventStatus {
  /** Event created but not yet processed */
  PENDING = "pending",
  /** Event currently being processed */
  PROCESSING = "processing",
  /** Event successfully processed and stored */
  COMPLETED = "completed",
  /** Event processing failed */
  FAILED = "failed",
  /** Event archived for long-term storage */
  ARCHIVED = "archived",
}

/**
 * Core audit event interface
 */
export interface AuditEvent {
  /** Unique event identifier */
  id: string;
  /** Event timestamp in ISO 8601 format */
  timestamp: Date;
  /** Event severity level */
  severity: AuditSeverity;
  /** Security event category */
  category: SecurityEventCategory;
  /** Event name/type */
  event: string;
  /** Human-readable event message */
  message: string;
  /** Service or component generating the event */
  source: string;
  /** Processing status */
  status: AuditEventStatus;
  /** Event metadata and additional context */
  metadata: AuditEventMetadata;
  /** Security context information */
  securityContext?: SecurityContext;
  /** Compliance-related information */
  compliance?: ComplianceInfo;
  /** Performance metrics if applicable */
  performance?: PerformanceMetrics;
  /** Geographic information */
  geolocation?: GeolocationInfo;
}

/**
 * Audit event metadata interface
 */
export interface AuditEventMetadata {
  /** User identifier */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Request identifier for correlation */
  requestId?: string;
  /** Client IP address */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Resource being accessed */
  resource?: string;
  /** Action being performed */
  action?: string;
  /** Additional custom metadata */
  custom?: Record<string, unknown>;
  /** Error information if applicable */
  error?: ErrorInfo;
  /** Correlation identifiers for distributed tracing */
  correlationIds?: string[];
}

/**
 * Security context information
 */
export interface SecurityContext {
  /** User roles */
  roles?: string[];
  /** User permissions */
  permissions?: string[];
  /** Authentication method used */
  authMethod?: string;
  /** JWT token information */
  tokenInfo?: TokenInfo;
  /** Security risk score */
  riskScore?: number;
  /** Threat indicators */
  threatIndicators?: string[];
  /** Security policies applied */
  appliedPolicies?: string[];
}

/**
 * JWT token information
 */
export interface TokenInfo {
  /** Token type */
  type: string;
  /** Token issuer */
  issuer?: string;
  /** Token subject */
  subject?: string;
  /** Token expiration time */
  expiresAt?: Date;
  /** Token scopes */
  scopes?: string[];
}

/**
 * Compliance information
 */
export interface ComplianceInfo {
  /** Applicable compliance frameworks */
  frameworks: ComplianceFramework[];
  /** Data classification level */
  dataClassification?: string;
  /** Data retention period */
  retentionPeriod?: number;
  /** Data processing purpose */
  processingPurpose?: string;
  /** Legal basis for processing */
  legalBasis?: string;
  /** Data subject rights */
  subjectRights?: string[];
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Operation duration in milliseconds */
  duration?: number;
  /** Memory usage in bytes */
  memoryUsage?: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Database query count */
  dbQueries?: number;
  /** Cache hit ratio */
  cacheHitRatio?: number;
  /** Network latency in milliseconds */
  networkLatency?: number;
}

/**
 * Geographic location information
 */
export interface GeolocationInfo {
  /** Country code */
  country?: string;
  /** Region/state */
  region?: string;
  /** City */
  city?: string;
  /** Latitude coordinate */
  latitude?: number;
  /** Longitude coordinate */
  longitude?: number;
  /** Timezone */
  timezone?: string;
}

/**
 * Error information
 */
export interface ErrorInfo {
  /** Error code */
  code?: string;
  /** Error message */
  message: string;
  /** Stack trace */
  stack?: string;
  /** Error type */
  type?: string;
  /** Additional error context */
  context?: Record<string, unknown>;
}

/**
 * Audit event query interface
 */
export interface AuditEventQuery {
  /** Start date for query range */
  startDate?: Date;
  /** End date for query range */
  endDate?: Date;
  /** Severity levels to include */
  severity?: AuditSeverity[];
  /** Categories to include */
  category?: SecurityEventCategory[];
  /** Specific event types */
  events?: string[];
  /** User ID filter */
  userId?: string;
  /** Session ID filter */
  sessionId?: string;
  /** IP address filter */
  ipAddress?: string;
  /** Resource filter */
  resource?: string;
  /** Action filter */
  action?: string;
  /** Minimum risk score */
  minRiskScore?: number;
  /** Maximum risk score */
  maxRiskScore?: number;
  /** Compliance framework filter */
  complianceFramework?: ComplianceFramework[];
  /** Status filter */
  status?: AuditEventStatus[];
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort order */
  sortOrder?: "asc" | "desc";
}

/**
 * Audit event search result interface
 */
export interface AuditEventSearchResult {
  /** Array of matching audit events */
  events: AuditEvent[];
  /** Total number of matching events */
  totalCount: number;
  /** Number of events returned in this result set */
  returnedCount: number;
  /** Query metadata */
  queryMetadata: {
    /** Query execution time in milliseconds */
    executionTime: number;
    /** Cached result indicator */
    cached: boolean;
    /** Applied filters */
    appliedFilters: string[];
  };
}

/**
 * Audit statistics interface
 */
export interface AuditStatistics {
  /** Total number of events */
  totalEvents: number;
  /** Events by severity */
  eventsBySeverity: Record<AuditSeverity, number>;
  /** Events by category */
  eventsByCategory: Record<SecurityEventCategory, number>;
  /** Events by status */
  eventsByStatus: Record<AuditEventStatus, number>;
  /** Security events count */
  securityEvents: number;
  /** Error rate percentage */
  errorRate: number;
  /** Average risk score */
  avgRiskScore?: number;
  /** Top users by activity */
  topUsers: Array<{
    userId: string;
    eventCount: number;
  }>;
  /** Top resources accessed */
  topResources: Array<{
    resource: string;
    accessCount: number;
  }>;
}

/**
 * Export configuration for audit logs
 */
export interface AuditExportConfig {
  /** Export format */
  format: "json" | "csv" | "xml" | "syslog" | "cef";
  /** Include metadata in export */
  includeMetadata: boolean;
  /** Include security context */
  includeSecurityContext: boolean;
  /** Include performance metrics */
  includePerformanceMetrics: boolean;
  /** Compression type */
  compression?: "gzip" | "brotli";
  /** Encryption configuration */
  encryption?: {
    algorithm: string;
    keyId?: string;
  };
}

/**
 * Audit log retention policy
 */
export interface RetentionPolicy {
  /** Policy identifier */
  id: string;
  /** Policy name */
  name: string;
  /** Event categories this policy applies to */
  categories: SecurityEventCategory[];
  /** Retention period in days */
  retentionDays: number;
  /** Archive after days */
  archiveAfterDays?: number;
  /** Compliance requirements */
  complianceRequirements: ComplianceFramework[];
  /** Auto-delete after retention period */
  autoDelete: boolean;
  /** Backup before deletion */
  backupBeforeDelete: boolean;
}

/**
 * Audit alert configuration
 */
export interface AlertConfig {
  /** Alert identifier */
  id: string;
  /** Alert name */
  name: string;
  /** Alert description */
  description: string;
  /** Event conditions that trigger the alert */
  conditions: AlertCondition[];
  /** Alert severity */
  severity: AuditSeverity;
  /** Alert destinations */
  destinations: AlertDestination[];
  /** Cooldown period between alerts in minutes */
  cooldownMinutes: number;
  /** Alert enabled status */
  enabled: boolean;
}

/**
 * Alert condition configuration
 */
export interface AlertCondition {
  /** Field to evaluate */
  field: string;
  /** Comparison operator */
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "regex";
  /** Value to compare against */
  value: string | number | boolean | Date | null;
  /** Logical operator for multiple conditions */
  logicalOperator?: "and" | "or";
}

/**
 * Alert destination configuration
 */
export interface AlertDestination {
  /** Destination type */
  type: "email" | "webhook" | "sms" | "slack" | "teams" | "syslog";
  /** Destination configuration */
  config: Record<string, unknown>;
  /** Alert template */
  template?: string;
}
