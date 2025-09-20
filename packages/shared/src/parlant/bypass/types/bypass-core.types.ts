/**
 * PARLANT Phase 1 Emergency Bypass System - Core Types
 *
 * Enterprise-grade emergency bypass mechanisms for database operations
 * when PARLANT validation is unavailable or unresponsive.
 *
 * @version 1.0.0
 * @author PARLANT Emergency Bypass System Agent
 * @compliance GDPR, SOX, HIPAA, SOC2
 */

import { z } from 'zod';

// =============================================================================
// BYPASS AUTHORIZATION TYPES
// =============================================================================

/**
 * Authorization levels for emergency bypass operations
 */
export enum BypassAuthorizationLevel {
  /** System-level automatic bypass for critical operations */
  SYSTEM_CRITICAL = 'system_critical',

  /** Emergency authorization requiring single admin approval */
  EMERGENCY_SINGLE = 'emergency_single',

  /** High-risk operations requiring dual authorization */
  EMERGENCY_DUAL = 'emergency_dual',

  /** Committee-level approval for sensitive operations */
  COMMITTEE_APPROVAL = 'committee_approval',

  /** Board-level approval for top-secret operations */
  BOARD_APPROVAL = 'board_approval'
}

/**
 * User roles authorized for emergency bypass operations
 */
export enum BypassRole {
  /** System administrator with emergency privileges */
  EMERGENCY_ADMIN = 'emergency_admin',

  /** Security administrator */
  SECURITY_ADMIN = 'security_admin',

  /** Database administrator */
  DATABASE_ADMIN = 'database_admin',

  /** System operator */
  SYSTEM_OPERATOR = 'system_operator',

  /** Emergency responder */
  EMERGENCY_RESPONDER = 'emergency_responder',

  /** Audit administrator */
  AUDIT_ADMIN = 'audit_admin'
}

/**
 * Bypass operation categories with different security requirements
 */
export enum BypassOperationType {
  /** Critical database operations */
  DATABASE_CRITICAL = 'database_critical',

  /** User authentication operations */
  AUTH_CRITICAL = 'auth_critical',

  /** System configuration changes */
  CONFIG_CRITICAL = 'config_critical',

  /** Security incident response */
  SECURITY_INCIDENT = 'security_incident',

  /** Data recovery operations */
  DATA_RECOVERY = 'data_recovery',

  /** System maintenance */
  MAINTENANCE = 'maintenance'
}

// =============================================================================
// BYPASS TOKEN TYPES
// =============================================================================

/**
 * Emergency bypass token with time-limited access
 */
export interface EmergencyBypassToken {
  /** Unique token identifier */
  tokenId: string;

  /** Token value (encrypted) */
  tokenValue: string;

  /** User who requested the token */
  requestedBy: string;

  /** User role */
  userRole: BypassRole;

  /** Token creation timestamp */
  createdAt: Date;

  /** Token expiration timestamp */
  expiresAt: Date;

  /** Authorization level granted */
  authorizationLevel: BypassAuthorizationLevel;

  /** Operations allowed with this token */
  allowedOperations: BypassOperationType[];

  /** Specific functions this token can bypass */
  allowedFunctions: string[];

  /** Maximum number of operations allowed */
  maxOperations: number;

  /** Number of operations performed */
  operationsPerformed: number;

  /** Token status */
  status: EmergencyTokenStatus;

  /** Approval chain */
  approvals: TokenApproval[];

  /** Reason for emergency bypass */
  reason: string;

  /** Security metadata */
  securityMetadata: TokenSecurityMetadata;
}

/**
 * Emergency token status tracking
 */
export enum EmergencyTokenStatus {
  /** Token is pending approval */
  PENDING = 'pending',

  /** Token is active and can be used */
  ACTIVE = 'active',

  /** Token has expired */
  EXPIRED = 'expired',

  /** Token has been revoked */
  REVOKED = 'revoked',

  /** Token has reached maximum operations */
  EXHAUSTED = 'exhausted',

  /** Token is suspended due to security concerns */
  SUSPENDED = 'suspended'
}

/**
 * Token approval record
 */
export interface TokenApproval {
  /** Approver identifier */
  approverId: string;

  /** Approver role */
  approverRole: BypassRole;

  /** Approval timestamp */
  approvedAt: Date;

  /** Approval decision */
  decision: ApprovalDecision;

  /** Approval reason */
  reason: string;

  /** Digital signature */
  signature: string;
}

/**
 * Approval decisions
 */
export enum ApprovalDecision {
  APPROVED = 'approved',
  DENIED = 'denied',
  REQUIRES_ESCALATION = 'requires_escalation'
}

/**
 * Token security metadata
 */
export interface TokenSecurityMetadata {
  /** IP address where token was requested */
  requestedFromIp: string;

  /** User agent */
  userAgent: string;

  /** Geographic location */
  location?: string;

  /** Risk score (0-100) */
  riskScore: number;

  /** Security flags */
  securityFlags: SecurityFlag[];

  /** Encryption algorithm used */
  encryptionAlgorithm: string;

  /** Token hash for integrity verification */
  tokenHash: string;
}

/**
 * Security flags for tokens
 */
export enum SecurityFlag {
  HIGH_RISK_USER = 'high_risk_user',
  UNUSUAL_LOCATION = 'unusual_location',
  SUSPICIOUS_TIMING = 'suspicious_timing',
  MULTIPLE_REQUESTS = 'multiple_requests',
  ESCALATED_PRIVILEGES = 'escalated_privileges'
}

// =============================================================================
// BYPASS REQUEST TYPES
// =============================================================================

/**
 * Emergency bypass request
 */
export interface EmergencyBypassRequest {
  /** Unique request identifier */
  requestId: string;

  /** User requesting bypass */
  requestedBy: string;

  /** User role */
  userRole: BypassRole;

  /** Request timestamp */
  requestedAt: Date;

  /** Operation type requiring bypass */
  operationType: BypassOperationType;

  /** Specific function to bypass */
  functionName: string;

  /** Function arguments */
  functionArguments: Record<string, any>;

  /** Reason for emergency bypass */
  reason: string;

  /** Justification details */
  justification: string;

  /** Requested authorization level */
  requestedAuthLevel: BypassAuthorizationLevel;

  /** Duration requested (in minutes) */
  durationMinutes: number;

  /** Priority level */
  priority: BypassPriority;

  /** Context information */
  context: BypassRequestContext;

  /** Request status */
  status: BypassRequestStatus;

  /** Approval workflow */
  approvalWorkflow: ApprovalWorkflow;
}

/**
 * Bypass request priority levels
 */
export enum BypassPriority {
  /** Immediate system failure */
  CRITICAL = 'critical',

  /** High business impact */
  HIGH = 'high',

  /** Medium business impact */
  MEDIUM = 'medium',

  /** Low impact, maintenance */
  LOW = 'low'
}

/**
 * Bypass request status
 */
export enum BypassRequestStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  DENIED = 'denied',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn'
}

/**
 * Context information for bypass requests
 */
export interface BypassRequestContext {
  /** System health status at time of request */
  systemHealth: SystemHealthStatus;

  /** PARLANT service status */
  parlantStatus: ServiceStatus;

  /** Database status */
  databaseStatus: ServiceStatus;

  /** Related incident ID */
  incidentId?: string;

  /** Business impact assessment */
  businessImpact: BusinessImpactLevel;

  /** Technical details */
  technicalDetails: Record<string, any>;
}

/**
 * System health status
 */
export enum SystemHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  CRITICAL = 'critical',
  DOWN = 'down'
}

/**
 * Service status enumeration
 */
export enum ServiceStatus {
  OPERATIONAL = 'operational',
  DEGRADED = 'degraded',
  PARTIAL_OUTAGE = 'partial_outage',
  MAJOR_OUTAGE = 'major_outage',
  MAINTENANCE = 'maintenance'
}

/**
 * Business impact levels
 */
export enum BusinessImpactLevel {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// =============================================================================
// BYPASS WORKFLOW TYPES
// =============================================================================

/**
 * Approval workflow configuration
 */
export interface ApprovalWorkflow {
  /** Workflow identifier */
  workflowId: string;

  /** Required approval levels */
  requiredApprovals: BypassAuthorizationLevel[];

  /** Current approval step */
  currentStep: number;

  /** Approval steps */
  steps: ApprovalStep[];

  /** Workflow status */
  status: WorkflowStatus;

  /** Workflow metadata */
  metadata: WorkflowMetadata;
}

/**
 * Individual approval step
 */
export interface ApprovalStep {
  /** Step number */
  stepNumber: number;

  /** Required role for this step */
  requiredRole: BypassRole;

  /** Required authorization level */
  requiredAuthLevel: BypassAuthorizationLevel;

  /** Assigned approver */
  assignedTo?: string;

  /** Step status */
  status: ApprovalStepStatus;

  /** Approval timestamp */
  completedAt?: Date;

  /** Approval result */
  result?: ApprovalDecision;

  /** Step reason */
  reason?: string;

  /** Time limit for this step */
  timeLimit: number;
}

/**
 * Approval step status
 */
export enum ApprovalStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  TIMEOUT = 'timeout',
  SKIPPED = 'skipped'
}

/**
 * Workflow status
 */
export enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  DENIED = 'denied',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled'
}

/**
 * Workflow metadata
 */
export interface WorkflowMetadata {
  /** Workflow start time */
  startedAt: Date;

  /** Expected completion time */
  expectedCompletionAt: Date;

  /** Actual completion time */
  completedAt?: Date;

  /** Total time limit */
  totalTimeLimit: number;

  /** Escalation rules */
  escalationRules: EscalationRule[];

  /** Notification settings */
  notifications: NotificationSetting[];
}

/**
 * Escalation rule configuration
 */
export interface EscalationRule {
  /** Trigger condition */
  trigger: EscalationTrigger;

  /** Time threshold */
  timeThreshold: number;

  /** Escalation action */
  action: EscalationAction;

  /** Target role for escalation */
  escalateTo: BypassRole;
}

/**
 * Escalation triggers
 */
export enum EscalationTrigger {
  TIMEOUT = 'timeout',
  NO_RESPONSE = 'no_response',
  DENIAL = 'denial',
  HIGH_PRIORITY = 'high_priority'
}

/**
 * Escalation actions
 */
export enum EscalationAction {
  NOTIFY = 'notify',
  REASSIGN = 'reassign',
  AUTO_APPROVE = 'auto_approve',
  ESCALATE_LEVEL = 'escalate_level'
}

/**
 * Notification settings
 */
export interface NotificationSetting {
  /** Notification trigger */
  trigger: NotificationTrigger;

  /** Recipients */
  recipients: string[];

  /** Notification method */
  method: NotificationMethod;

  /** Message template */
  template: string;
}

/**
 * Notification triggers
 */
export enum NotificationTrigger {
  REQUEST_SUBMITTED = 'request_submitted',
  APPROVAL_REQUIRED = 'approval_required',
  APPROVED = 'approved',
  DENIED = 'denied',
  TIMEOUT = 'timeout',
  ESCALATED = 'escalated'
}

/**
 * Notification methods
 */
export enum NotificationMethod {
  EMAIL = 'email',
  SMS = 'sms',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  IN_APP = 'in_app'
}

// =============================================================================
// BYPASS MONITORING TYPES
// =============================================================================

/**
 * Bypass operation result
 */
export interface BypassOperationResult {
  /** Operation identifier */
  operationId: string;

  /** Token used for bypass */
  tokenId: string;

  /** Function bypassed */
  functionName: string;

  /** Operation timestamp */
  executedAt: Date;

  /** Operation success */
  success: boolean;

  /** Operation result */
  result?: any;

  /** Error details if failed */
  error?: BypassOperationError;

  /** Performance metrics */
  performanceMetrics: BypassPerformanceMetrics;

  /** Security validation results */
  securityValidation: SecurityValidationResult;
}

/**
 * Bypass operation error
 */
export interface BypassOperationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Error stack trace */
  stack?: string;

  /** Error metadata */
  metadata: Record<string, any>;
}

/**
 * Performance metrics for bypass operations
 */
export interface BypassPerformanceMetrics {
  /** Execution start time */
  startTime: Date;

  /** Execution end time */
  endTime: Date;

  /** Total duration in milliseconds */
  duration: number;

  /** Authentication time */
  authTime: number;

  /** Authorization time */
  authzTime: number;

  /** Database operation time */
  dbTime: number;

  /** Network latency */
  networkLatency: number;
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  /** Validation success */
  valid: boolean;

  /** Risk score assessment */
  riskScore: number;

  /** Security checks performed */
  checksPerformed: SecurityCheck[];

  /** Security violations detected */
  violations: SecurityViolation[];

  /** Fraud detection result */
  fraudDetection: FraudDetectionResult;
}

/**
 * Security check result
 */
export interface SecurityCheck {
  /** Check name */
  checkName: string;

  /** Check result */
  passed: boolean;

  /** Check details */
  details: string;

  /** Risk contribution */
  riskContribution: number;
}

/**
 * Security violation
 */
export interface SecurityViolation {
  /** Violation type */
  type: SecurityViolationType;

  /** Violation severity */
  severity: ViolationSeverity;

  /** Violation description */
  description: string;

  /** Remediation action */
  remediation: string;
}

/**
 * Security violation types
 */
export enum SecurityViolationType {
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  POLICY_VIOLATION = 'policy_violation',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior'
}

/**
 * Violation severity levels
 */
export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Fraud detection result
 */
export interface FraudDetectionResult {
  /** Fraud risk score (0-100) */
  fraudScore: number;

  /** Fraud indicators detected */
  indicators: FraudIndicator[];

  /** Recommendation */
  recommendation: FraudRecommendation;
}

/**
 * Fraud indicators
 */
export enum FraudIndicator {
  VELOCITY_ABUSE = 'velocity_abuse',
  LOCATION_ANOMALY = 'location_anomaly',
  DEVICE_SPOOFING = 'device_spoofing',
  BEHAVIORAL_ANOMALY = 'behavioral_anomaly',
  CREDENTIAL_STUFFING = 'credential_stuffing'
}

/**
 * Fraud recommendations
 */
export enum FraudRecommendation {
  ALLOW = 'allow',
  CHALLENGE = 'challenge',
  BLOCK = 'block',
  REVIEW = 'review'
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod schema for emergency bypass token
 */
export const EmergencyBypassTokenSchema = z.object({
  tokenId: z.string().uuid(),
  tokenValue: z.string().min(32),
  requestedBy: z.string().min(1),
  userRole: z.nativeEnum(BypassRole),
  createdAt: z.date(),
  expiresAt: z.date(),
  authorizationLevel: z.nativeEnum(BypassAuthorizationLevel),
  allowedOperations: z.array(z.nativeEnum(BypassOperationType)),
  allowedFunctions: z.array(z.string()),
  maxOperations: z.number().positive(),
  operationsPerformed: z.number().min(0),
  status: z.nativeEnum(EmergencyTokenStatus),
  approvals: z.array(z.object({
    approverId: z.string(),
    approverRole: z.nativeEnum(BypassRole),
    approvedAt: z.date(),
    decision: z.nativeEnum(ApprovalDecision),
    reason: z.string(),
    signature: z.string()
  })),
  reason: z.string().min(10),
  securityMetadata: z.object({
    requestedFromIp: z.string().ip(),
    userAgent: z.string(),
    location: z.string().optional(),
    riskScore: z.number().min(0).max(100),
    securityFlags: z.array(z.nativeEnum(SecurityFlag)),
    encryptionAlgorithm: z.string(),
    tokenHash: z.string()
  })
});

/**
 * Zod schema for emergency bypass request
 */
export const EmergencyBypassRequestSchema = z.object({
  requestId: z.string().uuid(),
  requestedBy: z.string().min(1),
  userRole: z.nativeEnum(BypassRole),
  requestedAt: z.date(),
  operationType: z.nativeEnum(BypassOperationType),
  functionName: z.string().min(1),
  functionArguments: z.record(z.any()),
  reason: z.string().min(10),
  justification: z.string().min(20),
  requestedAuthLevel: z.nativeEnum(BypassAuthorizationLevel),
  durationMinutes: z.number().min(5).max(1440), // 5 minutes to 24 hours
  priority: z.nativeEnum(BypassPriority),
  status: z.nativeEnum(BypassRequestStatus)
});

// =============================================================================
// EXPORT ALL TYPES
// =============================================================================

// Types are already exported via 'export interface' declarations above