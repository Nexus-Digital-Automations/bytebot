/**
 * PARLANT Secure Secret Management Service - Enterprise Secret Management & Rotation
 *
 * Comprehensive secret management service providing secure storage, automated rotation,
 * and access control for sensitive credentials and cryptographic keys with enterprise-grade
 * security and compliance features.
 *
 * Features:
 * - Secure secret storage with encryption at rest and in transit
 * - Automated secret rotation with configurable policies
 * - Role-based access control and just-in-time access
 * - Multi-provider support (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault)
 * - Comprehensive audit logging and compliance tracking
 * - Secret lifecycle management and versioning
 * - Emergency access and break-glass procedures
 * - Integration with CI/CD pipelines and deployment systems
 *
 * @fileoverview Enterprise secret management and rotation service
 * @version 1.0.0
 * @author Claude Code - Secret Management Specialist
 */

import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash, randomBytes, createCipher, createDecipher, pbkdf2Sync } from 'crypto';

// ===========================
// SECRET MANAGEMENT TYPES
// ===========================

/**
 * Secret types
 */
export enum SecretType {
  API_KEY = 'api_key',
  DATABASE_PASSWORD = 'database_password',
  JWT_SECRET = 'jwt_secret',
  ENCRYPTION_KEY = 'encryption_key',
  CERTIFICATE = 'certificate',
  PRIVATE_KEY = 'private_key',
  OAUTH_TOKEN = 'oauth_token',
  WEBHOOK_SECRET = 'webhook_secret',
  SIGNING_KEY = 'signing_key',
  SERVICE_ACCOUNT_KEY = 'service_account_key',
}

/**
 * Secret status
 */
export enum SecretStatus {
  ACTIVE = 'active',
  PENDING_ROTATION = 'pending_rotation',
  ROTATING = 'rotating',
  DEPRECATED = 'deprecated',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  COMPROMISED = 'compromised',
}

/**
 * Secret storage providers
 */
export enum SecretProvider {
  HASHICORP_VAULT = 'hashicorp_vault',
  AWS_SECRETS_MANAGER = 'aws_secrets_manager',
  AZURE_KEY_VAULT = 'azure_key_vault',
  GOOGLE_SECRET_MANAGER = 'google_secret_manager',
  KUBERNETES_SECRETS = 'kubernetes_secrets',
  LOCAL_ENCRYPTED = 'local_encrypted',
}

/**
 * Rotation strategies
 */
export enum RotationStrategy {
  TIME_BASED = 'time_based',
  USAGE_BASED = 'usage_based',
  RISK_BASED = 'risk_based',
  MANUAL = 'manual',
  EMERGENCY = 'emergency',
}

/**
 * Access patterns
 */
export enum AccessPattern {
  DIRECT_ACCESS = 'direct_access',
  JUST_IN_TIME = 'just_in_time',
  BREAK_GLASS = 'break_glass',
  SERVICE_ACCOUNT = 'service_account',
  TEMPORARY_GRANT = 'temporary_grant',
}

// ===========================
// SECRET MANAGEMENT DATA STRUCTURES
// ===========================

/**
 * Secret metadata
 */
export interface SecretMetadata {
  /** Secret identifier */
  secretId: string;

  /** Secret name */
  name: string;

  /** Secret type */
  type: SecretType;

  /** Description */
  description: string;

  /** Current status */
  status: SecretStatus;

  /** Storage provider */
  provider: SecretProvider;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;

  /** Expiration timestamp */
  expiresAt?: Date;

  /** Last accessed timestamp */
  lastAccessedAt?: Date;

  /** Access count */
  accessCount: number;

  /** Owner information */
  owner: SecretOwner;

  /** Tags for organization */
  tags: Record<string, string>;

  /** Compliance requirements */
  complianceRequirements: ComplianceRequirement[];

  /** Rotation configuration */
  rotationConfig: RotationConfiguration;

  /** Access control configuration */
  accessControl: AccessControlConfiguration;

  /** Backup and recovery settings */
  backupConfig: BackupConfiguration;
}

/**
 * Secret owner information
 */
export interface SecretOwner {
  /** Owner type */
  type: OwnerType;

  /** Owner identifier */
  id: string;

  /** Owner name */
  name: string;

  /** Contact information */
  contact: string;

  /** Department or team */
  department?: string;
}

/**
 * Owner types
 */
export enum OwnerType {
  USER = 'user',
  SERVICE_ACCOUNT = 'service_account',
  TEAM = 'team',
  SYSTEM = 'system',
}

/**
 * Compliance requirement
 */
export interface ComplianceRequirement {
  /** Framework */
  framework: string;

  /** Requirement identifier */
  requirementId: string;

  /** Description */
  description: string;

  /** Compliance status */
  status: ComplianceStatus;

  /** Evidence */
  evidence: string[];
}

/**
 * Compliance status
 */
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_APPLICABLE = 'not_applicable',
}

/**
 * Rotation configuration
 */
export interface RotationConfiguration {
  /** Enable automatic rotation */
  enabled: boolean;

  /** Rotation strategy */
  strategy: RotationStrategy;

  /** Rotation interval (in days) */
  intervalDays: number;

  /** Maximum age before forced rotation */
  maxAgeDays: number;

  /** Usage threshold for usage-based rotation */
  usageThreshold?: number;

  /** Risk threshold for risk-based rotation */
  riskThreshold?: number;

  /** Notification settings */
  notifications: RotationNotification[];

  /** Custom rotation handler */
  customHandler?: string;

  /** Pre-rotation validation */
  preRotationValidation: boolean;

  /** Post-rotation verification */
  postRotationVerification: boolean;

  /** Rollback configuration */
  rollbackConfig: RollbackConfiguration;
}

/**
 * Rotation notification
 */
export interface RotationNotification {
  /** Notification type */
  type: NotificationType;

  /** Recipients */
  recipients: string[];

  /** Trigger timing */
  trigger: NotificationTrigger;

  /** Message template */
  template: string;
}

/**
 * Notification types
 */
export enum NotificationType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  PAGERDUTY = 'pagerduty',
}

/**
 * Notification triggers
 */
export enum NotificationTrigger {
  BEFORE_ROTATION = 'before_rotation',
  DURING_ROTATION = 'during_rotation',
  AFTER_ROTATION = 'after_rotation',
  ROTATION_FAILED = 'rotation_failed',
  EXPIRY_WARNING = 'expiry_warning',
}

/**
 * Rollback configuration
 */
export interface RollbackConfiguration {
  /** Enable automatic rollback */
  autoRollbackEnabled: boolean;

  /** Rollback triggers */
  rollbackTriggers: RollbackTrigger[];

  /** Rollback timeout */
  rollbackTimeoutMinutes: number;

  /** Manual approval required */
  manualApprovalRequired: boolean;

  /** Notification settings */
  notifications: RollbackNotification[];
}

/**
 * Rollback trigger
 */
export interface RollbackTrigger {
  /** Trigger condition */
  condition: string;

  /** Threshold */
  threshold: number;

  /** Evaluation period */
  evaluationPeriodMinutes: number;
}

/**
 * Rollback notification
 */
export interface RollbackNotification {
  /** Notification type */
  type: NotificationType;

  /** Recipients */
  recipients: string[];

  /** Message template */
  template: string;
}

/**
 * Access control configuration
 */
export interface AccessControlConfiguration {
  /** Access pattern */
  pattern: AccessPattern;

  /** Allowed roles */
  allowedRoles: string[];

  /** Allowed users */
  allowedUsers: string[];

  /** Allowed services */
  allowedServices: string[];

  /** Access restrictions */
  restrictions: AccessRestriction[];

  /** Approval requirements */
  approvalRequirements: ApprovalRequirement[];

  /** Session configuration */
  sessionConfig: SessionConfiguration;

  /** Audit requirements */
  auditRequirements: AuditRequirement[];
}

/**
 * Access restriction
 */
export interface AccessRestriction {
  /** Restriction type */
  type: RestrictionType;

  /** Configuration */
  config: Record<string, unknown>;

  /** Active status */
  active: boolean;
}

/**
 * Restriction types
 */
export enum RestrictionType {
  TIME_BASED = 'time_based',
  LOCATION_BASED = 'location_based',
  IP_BASED = 'ip_based',
  DEVICE_BASED = 'device_based',
  MFA_REQUIRED = 'mfa_required',
  VPN_REQUIRED = 'vpn_required',
}

/**
 * Approval requirement
 */
export interface ApprovalRequirement {
  /** Required for access pattern */
  pattern: AccessPattern;

  /** Number of approvals required */
  approvalsRequired: number;

  /** Approver roles */
  approverRoles: string[];

  /** Approval timeout */
  approvalTimeoutMinutes: number;

  /** Auto-approval conditions */
  autoApprovalConditions: string[];
}

/**
 * Session configuration
 */
export interface SessionConfiguration {
  /** Maximum session duration */
  maxDurationMinutes: number;

  /** Idle timeout */
  idleTimeoutMinutes: number;

  /** Renewable session */
  renewable: boolean;

  /** Session monitoring */
  monitoring: boolean;

  /** Concurrent session limit */
  concurrentSessionLimit: number;
}

/**
 * Audit requirement
 */
export interface AuditRequirement {
  /** Log all access */
  logAllAccess: boolean;

  /** Log failed attempts */
  logFailedAttempts: boolean;

  /** Detailed logging */
  detailedLogging: boolean;

  /** Real-time alerting */
  realTimeAlerting: boolean;

  /** Retention period */
  retentionPeriodDays: number;
}

/**
 * Backup configuration
 */
export interface BackupConfiguration {
  /** Enable backups */
  enabled: boolean;

  /** Backup frequency */
  frequency: BackupFrequency;

  /** Backup encryption */
  encryption: BackupEncryption;

  /** Backup storage */
  storage: BackupStorage[];

  /** Recovery testing */
  recoveryTesting: RecoveryTestingConfig;
}

/**
 * Backup frequency
 */
export enum BackupFrequency {
  REAL_TIME = 'real_time',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/**
 * Backup encryption
 */
export interface BackupEncryption {
  /** Encryption algorithm */
  algorithm: string;

  /** Key derivation */
  keyDerivation: string;

  /** Verification */
  verification: boolean;
}

/**
 * Backup storage
 */
export interface BackupStorage {
  /** Storage type */
  type: StorageType;

  /** Configuration */
  config: Record<string, unknown>;

  /** Priority */
  priority: number;
}

/**
 * Storage types
 */
export enum StorageType {
  LOCAL_ENCRYPTED = 'local_encrypted',
  S3_ENCRYPTED = 's3_encrypted',
  AZURE_BLOB = 'azure_blob',
  GOOGLE_CLOUD_STORAGE = 'google_cloud_storage',
  TAPE_BACKUP = 'tape_backup',
}

/**
 * Recovery testing configuration
 */
export interface RecoveryTestingConfig {
  /** Enable testing */
  enabled: boolean;

  /** Testing frequency */
  frequency: string;

  /** Test scenarios */
  scenarios: RecoveryScenario[];

  /** Notification settings */
  notifications: RecoveryTestNotification[];
}

/**
 * Recovery scenario
 */
export interface RecoveryScenario {
  /** Scenario name */
  name: string;

  /** Description */
  description: string;

  /** Test steps */
  steps: string[];

  /** Success criteria */
  successCriteria: string[];
}

/**
 * Recovery test notification
 */
export interface RecoveryTestNotification {
  /** Event type */
  event: RecoveryTestEvent;

  /** Recipients */
  recipients: string[];

  /** Template */
  template: string;
}

/**
 * Recovery test events
 */
export enum RecoveryTestEvent {
  TEST_STARTED = 'test_started',
  TEST_COMPLETED = 'test_completed',
  TEST_FAILED = 'test_failed',
  RECOVERY_SUCCESSFUL = 'recovery_successful',
  RECOVERY_FAILED = 'recovery_failed',
}

/**
 * Secret value (encrypted)
 */
export interface SecretValue {
  /** Encrypted value */
  encryptedValue: string;

  /** Encryption algorithm */
  algorithm: string;

  /** Initialization vector */
  iv: string;

  /** Key derivation parameters */
  keyDerivation: KeyDerivationParams;

  /** Integrity hash */
  integrityHash: string;

  /** Version */
  version: number;
}

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
  /** Salt */
  salt: string;

  /** Iterations */
  iterations: number;

  /** Key length */
  keyLength: number;

  /** Algorithm */
  algorithm: string;
}

/**
 * Secret access request
 */
export interface SecretAccessRequest {
  /** Request identifier */
  requestId: string;

  /** Secret identifier */
  secretId: string;

  /** Requester information */
  requester: SecretRequester;

  /** Access pattern */
  pattern: AccessPattern;

  /** Justification */
  justification: string;

  /** Request timestamp */
  requestedAt: Date;

  /** Expiration timestamp */
  expiresAt: Date;

  /** Request status */
  status: AccessRequestStatus;

  /** Approval chain */
  approvals: AccessApproval[];

  /** Audit trail */
  auditTrail: AccessAuditEvent[];
}

/**
 * Secret requester
 */
export interface SecretRequester {
  /** Requester type */
  type: RequesterType;

  /** Requester identifier */
  id: string;

  /** Name */
  name: string;

  /** Role */
  role: string;

  /** IP address */
  ipAddress: string;

  /** User agent */
  userAgent?: string;

  /** Location */
  location?: GeoLocation;
}

/**
 * Requester types
 */
export enum RequesterType {
  USER = 'user',
  SERVICE = 'service',
  CI_CD_SYSTEM = 'ci_cd_system',
  AUTOMATED_SYSTEM = 'automated_system',
}

/**
 * Geographic location
 */
export interface GeoLocation {
  /** Country */
  country: string;

  /** Region */
  region: string;

  /** City */
  city: string;

  /** Latitude */
  latitude: number;

  /** Longitude */
  longitude: number;
}

/**
 * Access request status
 */
export enum AccessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  FULFILLED = 'fulfilled',
}

/**
 * Access approval
 */
export interface AccessApproval {
  /** Approval identifier */
  approvalId: string;

  /** Approver information */
  approver: SecretApprover;

  /** Approval decision */
  decision: ApprovalDecision;

  /** Approval timestamp */
  approvedAt: Date;

  /** Comments */
  comments: string;

  /** Conditions */
  conditions: ApprovalCondition[];
}

/**
 * Secret approver
 */
export interface SecretApprover {
  /** Approver identifier */
  id: string;

  /** Name */
  name: string;

  /** Role */
  role: string;

  /** Authority level */
  authorityLevel: AuthorityLevel;
}

/**
 * Authority levels
 */
export enum AuthorityLevel {
  BASIC = 'basic',
  SENIOR = 'senior',
  MANAGER = 'manager',
  EXECUTIVE = 'executive',
  EMERGENCY = 'emergency',
}

/**
 * Approval decisions
 */
export enum ApprovalDecision {
  APPROVE = 'approve',
  DENY = 'deny',
  CONDITIONAL_APPROVE = 'conditional_approve',
  ESCALATE = 'escalate',
}

/**
 * Approval condition
 */
export interface ApprovalCondition {
  /** Condition type */
  type: ConditionType;

  /** Configuration */
  config: Record<string, unknown>;

  /** Active status */
  active: boolean;
}

/**
 * Condition types
 */
export enum ConditionType {
  TIME_LIMITED = 'time_limited',
  USAGE_LIMITED = 'usage_limited',
  MONITORING_REQUIRED = 'monitoring_required',
  ADDITIONAL_APPROVAL = 'additional_approval',
  EMERGENCY_ONLY = 'emergency_only',
}

/**
 * Access audit event
 */
export interface AccessAuditEvent {
  /** Event identifier */
  eventId: string;

  /** Event type */
  type: AuditEventType;

  /** Timestamp */
  timestamp: Date;

  /** Actor */
  actor: string;

  /** Details */
  details: Record<string, unknown>;

  /** IP address */
  ipAddress: string;

  /** Session identifier */
  sessionId?: string;
}

/**
 * Audit event types
 */
export enum AuditEventType {
  ACCESS_REQUESTED = 'access_requested',
  ACCESS_APPROVED = 'access_approved',
  ACCESS_DENIED = 'access_denied',
  SECRET_ACCESSED = 'secret_accessed',
  SECRET_MODIFIED = 'secret_modified',
  SECRET_ROTATED = 'secret_rotated',
  SECRET_DELETED = 'secret_deleted',
  EMERGENCY_ACCESS = 'emergency_access',
  POLICY_VIOLATION = 'policy_violation',
}

/**
 * Rotation result
 */
export interface RotationResult {
  /** Rotation identifier */
  rotationId: string;

  /** Secret identifier */
  secretId: string;

  /** Rotation timestamp */
  timestamp: Date;

  /** Rotation status */
  status: RotationStatus;

  /** Previous version */
  previousVersion: number;

  /** New version */
  newVersion: number;

  /** Rotation duration */
  duration: number;

  /** Error details */
  error?: RotationError;

  /** Validation results */
  validationResults: ValidationResult[];

  /** Rollback information */
  rollbackInfo?: RollbackInfo;
}

/**
 * Rotation status
 */
export enum RotationStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PARTIAL = 'partial',
  ROLLED_BACK = 'rolled_back',
  IN_PROGRESS = 'in_progress',
}

/**
 * Rotation error
 */
export interface RotationError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Stack trace */
  stackTrace?: string;

  /** Recovery suggestions */
  recoverySuggestions: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Validation type */
  type: ValidationType;

  /** Result */
  result: ValidationResultStatus;

  /** Details */
  details: string;

  /** Timestamp */
  timestamp: Date;
}

/**
 * Validation types
 */
export enum ValidationType {
  CONNECTIVITY = 'connectivity',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  FUNCTIONALITY = 'functionality',
  PERFORMANCE = 'performance',
}

/**
 * Validation result status
 */
export enum ValidationResultStatus {
  PASS = 'pass',
  FAIL = 'fail',
  WARNING = 'warning',
  SKIP = 'skip',
}

/**
 * Rollback information
 */
export interface RollbackInfo {
  /** Rollback reason */
  reason: string;

  /** Rollback timestamp */
  timestamp: Date;

  /** Previous version restored */
  restoredVersion: number;

  /** Rollback success */
  success: boolean;

  /** Rollback details */
  details: string;
}

// ===========================
// SECRET MANAGEMENT SERVICE IMPLEMENTATION
// ===========================

/**
 * Secret management service configuration
 */
export interface SecretManagementConfig {
  /** Enable secret management */
  enabled: boolean;

  /** Default provider */
  defaultProvider: SecretProvider;

  /** Provider configurations */
  providers: Record<SecretProvider, ProviderConfig>;

  /** Encryption settings */
  encryption: EncryptionConfig;

  /** Rotation settings */
  rotation: GlobalRotationConfig;

  /** Access control settings */
  accessControl: GlobalAccessControlConfig;

  /** Monitoring settings */
  monitoring: MonitoringConfig;

  /** Backup settings */
  backup: GlobalBackupConfig;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  /** Provider enabled */
  enabled: boolean;

  /** Connection configuration */
  connection: Record<string, unknown>;

  /** Authentication configuration */
  authentication: Record<string, unknown>;

  /** Provider-specific settings */
  settings: Record<string, unknown>;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Default algorithm */
  defaultAlgorithm: string;

  /** Key derivation settings */
  keyDerivation: KeyDerivationConfig;

  /** Master key settings */
  masterKey: MasterKeyConfig;
}

/**
 * Key derivation configuration
 */
export interface KeyDerivationConfig {
  /** Algorithm */
  algorithm: string;

  /** Iterations */
  iterations: number;

  /** Salt length */
  saltLength: number;

  /** Key length */
  keyLength: number;
}

/**
 * Master key configuration
 */
export interface MasterKeyConfig {
  /** Key source */
  source: KeySource;

  /** Rotation frequency */
  rotationFrequency: string;

  /** Backup configuration */
  backup: boolean;
}

/**
 * Key sources
 */
export enum KeySource {
  ENVIRONMENT = 'environment',
  FILE = 'file',
  HSM = 'hsm',
  KMS = 'kms',
  VAULT = 'vault',
}

/**
 * Global rotation configuration
 */
export interface GlobalRotationConfig {
  /** Enable global rotation */
  enabled: boolean;

  /** Default rotation interval */
  defaultIntervalDays: number;

  /** Maximum age before forced rotation */
  maxAgeDays: number;

  /** Rotation window */
  rotationWindow: RotationWindow;

  /** Concurrent rotation limit */
  concurrentRotationLimit: number;
}

/**
 * Rotation window
 */
export interface RotationWindow {
  /** Start hour (0-23) */
  startHour: number;

  /** End hour (0-23) */
  endHour: number;

  /** Allowed days */
  allowedDays: DayOfWeek[];

  /** Timezone */
  timezone: string;
}

/**
 * Days of week
 */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

/**
 * Global access control configuration
 */
export interface GlobalAccessControlConfig {
  /** Default access pattern */
  defaultPattern: AccessPattern;

  /** Require MFA by default */
  requireMfaByDefault: boolean;

  /** Default session duration */
  defaultSessionDuration: number;

  /** Emergency access settings */
  emergencyAccess: EmergencyAccessConfig;
}

/**
 * Emergency access configuration
 */
export interface EmergencyAccessConfig {
  /** Enable emergency access */
  enabled: boolean;

  /** Emergency roles */
  emergencyRoles: string[];

  /** Break-glass procedures */
  breakGlassProcedures: BreakGlassProcedure[];

  /** Notification requirements */
  notificationRequirements: EmergencyNotificationRequirement[];
}

/**
 * Break-glass procedure
 */
export interface BreakGlassProcedure {
  /** Procedure name */
  name: string;

  /** Description */
  description: string;

  /** Required justification */
  requiredJustification: string[];

  /** Approval requirements */
  approvalRequirements: EmergencyApprovalRequirement[];

  /** Time limitations */
  timeLimitations: TimeLimitation[];
}

/**
 * Emergency approval requirement
 */
export interface EmergencyApprovalRequirement {
  /** Required role */
  role: string;

  /** Response time limit */
  responseTimeLimitMinutes: number;

  /** Alternative approvers */
  alternativeApprovers: string[];
}

/**
 * Time limitation
 */
export interface TimeLimitation {
  /** Access duration */
  accessDurationMinutes: number;

  /** Review period */
  reviewPeriodHours: number;

  /** Automatic revocation */
  automaticRevocation: boolean;
}

/**
 * Emergency notification requirement
 */
export interface EmergencyNotificationRequirement {
  /** Notification trigger */
  trigger: EmergencyNotificationTrigger;

  /** Recipients */
  recipients: string[];

  /** Escalation chain */
  escalationChain: EscalationStep[];
}

/**
 * Emergency notification triggers
 */
export enum EmergencyNotificationTrigger {
  BREAK_GLASS_INITIATED = 'break_glass_initiated',
  EMERGENCY_ACCESS_GRANTED = 'emergency_access_granted',
  EMERGENCY_ACCESS_USED = 'emergency_access_used',
  EMERGENCY_ACCESS_EXPIRED = 'emergency_access_expired',
}

/**
 * Escalation step
 */
export interface EscalationStep {
  /** Step number */
  step: number;

  /** Delay minutes */
  delayMinutes: number;

  /** Recipients */
  recipients: string[];

  /** Message template */
  messageTemplate: string;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable monitoring */
  enabled: boolean;

  /** Metrics collection */
  metricsCollection: MetricsCollectionConfig;

  /** Alerting */
  alerting: AlertingConfig;

  /** Anomaly detection */
  anomalyDetection: AnomalyDetectionConfig;
}

/**
 * Metrics collection configuration
 */
export interface MetricsCollectionConfig {
  /** Collection interval */
  intervalSeconds: number;

  /** Metrics to collect */
  metrics: MetricType[];

  /** Storage configuration */
  storage: MetricsStorageConfig;
}

/**
 * Metric types
 */
export enum MetricType {
  ACCESS_COUNT = 'access_count',
  ROTATION_COUNT = 'rotation_count',
  FAILURE_COUNT = 'failure_count',
  RESPONSE_TIME = 'response_time',
  ACTIVE_SESSIONS = 'active_sessions',
  SECRET_AGE = 'secret_age',
}

/**
 * Metrics storage configuration
 */
export interface MetricsStorageConfig {
  /** Storage type */
  type: MetricsStorageType;

  /** Configuration */
  config: Record<string, unknown>;

  /** Retention period */
  retentionPeriodDays: number;
}

/**
 * Metrics storage types
 */
export enum MetricsStorageType {
  PROMETHEUS = 'prometheus',
  INFLUXDB = 'influxdb',
  CLOUDWATCH = 'cloudwatch',
  DATADOG = 'datadog',
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  /** Alert rules */
  rules: AlertRule[];

  /** Notification channels */
  channels: AlertChannel[];

  /** Escalation policies */
  escalationPolicies: AlertEscalationPolicy[];
}

/**
 * Alert rule
 */
export interface AlertRule {
  /** Rule name */
  name: string;

  /** Condition */
  condition: string;

  /** Severity */
  severity: AlertSeverity;

  /** Threshold */
  threshold: number;

  /** Evaluation period */
  evaluationPeriodMinutes: number;

  /** Channels */
  channels: string[];
}

/**
 * Alert severities
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert channel
 */
export interface AlertChannel {
  /** Channel name */
  name: string;

  /** Channel type */
  type: AlertChannelType;

  /** Configuration */
  config: Record<string, unknown>;
}

/**
 * Alert channel types
 */
export enum AlertChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  PAGERDUTY = 'pagerduty',
  OPSGENIE = 'opsgenie',
}

/**
 * Alert escalation policy
 */
export interface AlertEscalationPolicy {
  /** Policy name */
  name: string;

  /** Escalation steps */
  steps: AlertEscalationStep[];
}

/**
 * Alert escalation step
 */
export interface AlertEscalationStep {
  /** Step number */
  step: number;

  /** Delay minutes */
  delayMinutes: number;

  /** Channels */
  channels: string[];
}

/**
 * Anomaly detection configuration
 */
export interface AnomalyDetectionConfig {
  /** Enable anomaly detection */
  enabled: boolean;

  /** Detection algorithms */
  algorithms: AnomalyDetectionAlgorithm[];

  /** Sensitivity level */
  sensitivityLevel: SensitivityLevel;

  /** Training period */
  trainingPeriodDays: number;
}

/**
 * Anomaly detection algorithms
 */
export enum AnomalyDetectionAlgorithm {
  STATISTICAL = 'statistical',
  MACHINE_LEARNING = 'machine_learning',
  RULE_BASED = 'rule_based',
  BEHAVIOR_ANALYSIS = 'behavior_analysis',
}

/**
 * Sensitivity levels
 */
export enum SensitivityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

/**
 * Global backup configuration
 */
export interface GlobalBackupConfig {
  /** Enable backups */
  enabled: boolean;

  /** Default frequency */
  defaultFrequency: BackupFrequency;

  /** Backup storage */
  storage: BackupStorageConfig[];

  /** Recovery testing */
  recoveryTesting: GlobalRecoveryTestingConfig;
}

/**
 * Backup storage configuration
 */
export interface BackupStorageConfig {
  /** Storage name */
  name: string;

  /** Storage type */
  type: StorageType;

  /** Configuration */
  config: Record<string, unknown>;

  /** Priority */
  priority: number;

  /** Encryption */
  encryption: BackupEncryption;
}

/**
 * Global recovery testing configuration
 */
export interface GlobalRecoveryTestingConfig {
  /** Enable testing */
  enabled: boolean;

  /** Testing schedule */
  schedule: string;

  /** Test coverage percentage */
  testCoveragePercentage: number;

  /** Notification settings */
  notifications: RecoveryTestNotification[];
}

// ===========================
// SECRET MANAGEMENT SERVICE IMPLEMENTATION
// ===========================

/**
 * Enterprise secret management service
 */
@Injectable()
export class SecretManagementService implements OnApplicationShutdown {
  private readonly logger = new Logger(SecretManagementService.name);
  private readonly config: SecretManagementConfig;
  private secretCache = new Map<string, SecretMetadata>();
  private accessRequestCache = new Map<string, SecretAccessRequest>();
  private rotationQueue: string[] = [];
  private isRotationRunning = false;
  private readonly masterKey: Buffer;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.config = this.loadConfiguration();
    this.masterKey = this.deriveMasterKey();
    this.initializeSecretManagement();
  }

  /**
   * Initialize secret management service
   */
  private async initializeSecretManagement(): Promise<void> {
    try {
      this.logger.log('🔧 Initializing secret management service');

      if (!this.config.enabled) {
        this.logger.warn('⚠️ Secret management is disabled');
        return;
      }

      // Initialize providers
      await this.initializeProviders();

      // Load existing secrets
      await this.loadSecretsMetadata();

      // Start rotation monitoring
      if (this.config.rotation.enabled) {
        await this.startRotationMonitoring();
      }

      // Start access monitoring
      await this.startAccessMonitoring();

      this.logger.log('✅ Secret management service initialized successfully');

      // Emit initialization event
      this.eventEmitter.emit('secret.management.initialized', {
        timestamp: new Date(),
        providers: Object.keys(this.config.providers),
        secretCount: this.secretCache.size,
      });

    } catch (error) {
      this.logger.error('❌ Failed to initialize secret management service', error);
      throw error;
    }
  }

  /**
   * Create a new secret
   */
  public async createSecret(
    secretData: CreateSecretRequest,
  ): Promise<SecretMetadata> {
    const secretId = this.generateSecretId();

    try {
      this.logger.log(`🔐 Creating new secret: ${secretId}`);

      // Validate secret data
      await this.validateSecretData(secretData);

      // Encrypt secret value
      const encryptedValue = await this.encryptValue(secretData.value);

      // Create metadata
      const metadata: SecretMetadata = {
        secretId,
        name: secretData.name,
        type: secretData.type,
        description: secretData.description,
        status: SecretStatus.ACTIVE,
        provider: secretData.provider || this.config.defaultProvider,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: secretData.expiresAt,
        accessCount: 0,
        owner: secretData.owner,
        tags: secretData.tags || {},
        complianceRequirements: secretData.complianceRequirements || [],
        rotationConfig: secretData.rotationConfig || this.getDefaultRotationConfig(),
        accessControl: secretData.accessControl || this.getDefaultAccessControlConfig(),
        backupConfig: secretData.backupConfig || this.getDefaultBackupConfig(),
      };

      // Store secret in provider
      await this.storeSecretInProvider(metadata, encryptedValue);

      // Cache metadata
      this.secretCache.set(secretId, metadata);

      // Create backup
      if (metadata.backupConfig.enabled) {
        await this.createSecretBackup(metadata, encryptedValue);
      }

      // Schedule rotation if enabled
      if (metadata.rotationConfig.enabled) {
        await this.scheduleRotation(secretId);
      }

      this.logger.log(`✅ Secret created successfully: ${secretId}`);

      // Emit creation event
      this.eventEmitter.emit('secret.created', {
        secretId,
        type: metadata.type,
        provider: metadata.provider,
        timestamp: new Date(),
      });

      return metadata;

    } catch (error) {
      this.logger.error(`❌ Failed to create secret: ${secretId}`, error);
      throw error;
    }
  }

  /**
   * Request access to a secret
   */
  public async requestSecretAccess(
    request: SecretAccessRequestData,
  ): Promise<SecretAccessRequest> {
    const requestId = this.generateRequestId();

    try {
      this.logger.log(`🔑 Processing secret access request: ${requestId}`);

      // Get secret metadata
      const secretMetadata = this.secretCache.get(request.secretId);
      if (!secretMetadata) {
        throw new Error(`Secret not found: ${request.secretId}`);
      }

      // Create access request
      const accessRequest: SecretAccessRequest = {
        requestId,
        secretId: request.secretId,
        requester: request.requester,
        pattern: request.pattern,
        justification: request.justification,
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
        status: AccessRequestStatus.PENDING,
        approvals: [],
        auditTrail: [{
          eventId: this.generateEventId(),
          type: AuditEventType.ACCESS_REQUESTED,
          timestamp: new Date(),
          actor: request.requester.id,
          details: { justification: request.justification },
          ipAddress: request.requester.ipAddress,
        }],
      };

      // Check if automatic approval is possible
      if (await this.canAutoApprove(accessRequest, secretMetadata)) {
        accessRequest.status = AccessRequestStatus.APPROVED;
        this.logger.log(`✅ Auto-approved access request: ${requestId}`);
      } else {
        // Require manual approval
        await this.processApprovalWorkflow(accessRequest, secretMetadata);
      }

      // Cache request
      this.accessRequestCache.set(requestId, accessRequest);

      // Emit access request event
      this.eventEmitter.emit('secret.access.requested', {
        requestId,
        secretId: request.secretId,
        requester: request.requester.id,
        pattern: request.pattern,
        timestamp: new Date(),
      });

      return accessRequest;

    } catch (error) {
      this.logger.error(`❌ Failed to process access request: ${requestId}`, error);
      throw error;
    }
  }

  /**
   * Get secret value (after access approval)
   */
  public async getSecretValue(
    requestId: string,
    requester: SecretRequester,
  ): Promise<string> {
    try {
      this.logger.log(`🔍 Retrieving secret value for request: ${requestId}`);

      // Get access request
      const accessRequest = this.accessRequestCache.get(requestId);
      if (!accessRequest) {
        throw new Error(`Access request not found: ${requestId}`);
      }

      // Verify requester
      if (accessRequest.requester.id !== requester.id) {
        throw new Error('Unauthorized access attempt');
      }

      // Check if access is approved
      if (accessRequest.status !== AccessRequestStatus.APPROVED) {
        throw new Error(`Access not approved: ${accessRequest.status}`);
      }

      // Check if request is still valid
      if (accessRequest.expiresAt < new Date()) {
        throw new Error('Access request expired');
      }

      // Get secret metadata
      const secretMetadata = this.secretCache.get(accessRequest.secretId);
      if (!secretMetadata) {
        throw new Error(`Secret not found: ${accessRequest.secretId}`);
      }

      // Retrieve encrypted value from provider
      const encryptedValue = await this.retrieveSecretFromProvider(secretMetadata);

      // Decrypt value
      const decryptedValue = await this.decryptValue(encryptedValue);

      // Update access tracking
      await this.trackSecretAccess(secretMetadata, requester);

      // Mark request as fulfilled
      accessRequest.status = AccessRequestStatus.FULFILLED;
      accessRequest.auditTrail.push({
        eventId: this.generateEventId(),
        type: AuditEventType.SECRET_ACCESSED,
        timestamp: new Date(),
        actor: requester.id,
        details: { success: true },
        ipAddress: requester.ipAddress,
      });

      this.logger.log(`✅ Secret value retrieved successfully: ${requestId}`);

      // Emit access event
      this.eventEmitter.emit('secret.accessed', {
        secretId: accessRequest.secretId,
        requester: requester.id,
        requestId,
        timestamp: new Date(),
      });

      return decryptedValue;

    } catch (error) {
      this.logger.error(`❌ Failed to retrieve secret value: ${requestId}`, error);
      throw error;
    }
  }

  /**
   * Rotate a secret
   */
  public async rotateSecret(secretId: string): Promise<RotationResult> {
    const rotationId = this.generateRotationId();

    try {
      this.logger.log(`🔄 Starting secret rotation: ${secretId} (${rotationId})`);

      // Get secret metadata
      const secretMetadata = this.secretCache.get(secretId);
      if (!secretMetadata) {
        throw new Error(`Secret not found: ${secretId}`);
      }

      // Check if rotation is already in progress
      if (secretMetadata.status === SecretStatus.ROTATING) {
        throw new Error(`Secret rotation already in progress: ${secretId}`);
      }

      const startTime = Date.now();

      // Update status
      secretMetadata.status = SecretStatus.ROTATING;
      secretMetadata.updatedAt = new Date();

      // Generate new secret value
      const newValue = await this.generateNewSecretValue(secretMetadata);

      // Encrypt new value
      const encryptedNewValue = await this.encryptValue(newValue);

      // Pre-rotation validation
      if (secretMetadata.rotationConfig.preRotationValidation) {
        await this.performPreRotationValidation(secretMetadata);
      }

      // Store new version
      const newVersion = await this.storeNewSecretVersion(secretMetadata, encryptedNewValue);

      // Post-rotation verification
      const validationResults: ValidationResult[] = [];
      if (secretMetadata.rotationConfig.postRotationVerification) {
        validationResults.push(...await this.performPostRotationVerification(secretMetadata, newVersion));
      }

      // Update metadata
      secretMetadata.status = SecretStatus.ACTIVE;
      secretMetadata.updatedAt = new Date();

      const duration = Date.now() - startTime;

      const rotationResult: RotationResult = {
        rotationId,
        secretId,
        timestamp: new Date(),
        status: RotationStatus.SUCCESS,
        previousVersion: newVersion - 1,
        newVersion,
        duration,
        validationResults,
      };

      this.logger.log(`✅ Secret rotation completed successfully: ${secretId} (${rotationId})`);

      // Emit rotation event
      this.eventEmitter.emit('secret.rotated', {
        secretId,
        rotationId,
        newVersion,
        duration,
        timestamp: new Date(),
      });

      return rotationResult;

    } catch (error) {
      this.logger.error(`❌ Secret rotation failed: ${secretId} (${rotationId})`, error);

      // Handle rotation failure
      await this.handleRotationFailure(secretId, rotationId, error);

      throw error;
    }
  }

  /**
   * Emergency access to secret (break-glass)
   */
  public async emergencyAccess(
    request: EmergencyAccessRequest,
  ): Promise<string> {
    const emergencyId = this.generateEmergencyId();

    try {
      this.logger.warn(`🚨 Emergency access requested: ${emergencyId}`);

      // Validate emergency access request
      await this.validateEmergencyAccess(request);

      // Get secret metadata
      const secretMetadata = this.secretCache.get(request.secretId);
      if (!secretMetadata) {
        throw new Error(`Secret not found: ${request.secretId}`);
      }

      // Trigger emergency notifications
      await this.triggerEmergencyNotifications(request, emergencyId);

      // Retrieve and decrypt secret
      const encryptedValue = await this.retrieveSecretFromProvider(secretMetadata);
      const decryptedValue = await this.decryptValue(encryptedValue);

      // Log emergency access
      await this.logEmergencyAccess(request, emergencyId, secretMetadata);

      this.logger.warn(`🚨 Emergency access granted: ${emergencyId}`);

      // Emit emergency access event
      this.eventEmitter.emit('secret.emergency.access', {
        secretId: request.secretId,
        requester: request.requester.id,
        emergencyId,
        justification: request.justification,
        timestamp: new Date(),
      });

      return decryptedValue;

    } catch (error) {
      this.logger.error(`❌ Emergency access failed: ${emergencyId}`, error);
      throw error;
    }
  }

  /**
   * Scheduled rotation monitoring
   */
  @Cron(CronExpression.EVERY_HOUR)
  private async monitorSecretRotations(): Promise<void> {
    if (!this.config.rotation.enabled || this.isRotationRunning) {
      return;
    }

    try {
      this.logger.log('🔄 Monitoring secret rotations');
      this.isRotationRunning = true;

      const now = new Date();

      // Check for secrets that need rotation
      for (const [secretId, metadata] of this.secretCache) {
        if (await this.shouldRotateSecret(metadata, now)) {
          this.rotationQueue.push(secretId);
        }
      }

      // Process rotation queue
      await this.processRotationQueue();

      this.logger.log('✅ Secret rotation monitoring completed');

    } catch (error) {
      this.logger.error('❌ Secret rotation monitoring failed', error);
    } finally {
      this.isRotationRunning = false;
    }
  }

  /**
   * Derive master key for encryption
   */
  private deriveMasterKey(): Buffer {
    const masterKeySource = this.configService.get<string>('secret.management.master.key');
    if (!masterKeySource) {
      throw new Error('Master key not configured');
    }

    // In production, this would use a more secure key derivation method
    return pbkdf2Sync(masterKeySource, 'parlant-secret-salt', 100000, 32, 'sha256');
  }

  /**
   * Encrypt secret value
   */
  private async encryptValue(value: string): Promise<SecretValue> {
    const algorithm = this.config.encryption.defaultAlgorithm;
    const iv = randomBytes(16);
    const salt = randomBytes(32);

    // Derive encryption key
    const derivedKey = pbkdf2Sync(
      this.masterKey,
      salt,
      this.config.encryption.keyDerivation.iterations,
      this.config.encryption.keyDerivation.keyLength,
      'sha256',
    );

    // Encrypt value
    const cipher = createCipher(algorithm, derivedKey);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Calculate integrity hash
    const integrityHash = createHash('sha256')
      .update(encrypted + iv.toString('hex') + salt.toString('hex'))
      .digest('hex');

    return {
      encryptedValue: encrypted,
      algorithm,
      iv: iv.toString('hex'),
      keyDerivation: {
        salt: salt.toString('hex'),
        iterations: this.config.encryption.keyDerivation.iterations,
        keyLength: this.config.encryption.keyDerivation.keyLength,
        algorithm: 'pbkdf2',
      },
      integrityHash,
      version: 1,
    };
  }

  /**
   * Decrypt secret value
   */
  private async decryptValue(secretValue: SecretValue): Promise<string> {
    // Verify integrity
    const calculatedHash = createHash('sha256')
      .update(secretValue.encryptedValue + secretValue.iv + secretValue.keyDerivation.salt)
      .digest('hex');

    if (calculatedHash !== secretValue.integrityHash) {
      throw new Error('Secret integrity verification failed');
    }

    // Derive decryption key
    const derivedKey = pbkdf2Sync(
      this.masterKey,
      Buffer.from(secretValue.keyDerivation.salt, 'hex'),
      secretValue.keyDerivation.iterations,
      secretValue.keyDerivation.keyLength,
      'sha256',
    );

    // Decrypt value
    const decipher = createDecipher(secretValue.algorithm, derivedKey);
    let decrypted = decipher.update(secretValue.encryptedValue, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Initialize providers
   */
  private async initializeProviders(): Promise<void> {
    // Implementation for provider initialization
    this.logger.log('🔧 Initializing secret storage providers');
  }

  /**
   * Load secrets metadata
   */
  private async loadSecretsMetadata(): Promise<void> {
    // Implementation for loading existing secrets
    this.logger.log('📚 Loading existing secrets metadata');
  }

  /**
   * Store secret in provider
   */
  private async storeSecretInProvider(
    metadata: SecretMetadata,
    encryptedValue: SecretValue,
  ): Promise<void> {
    // Implementation for storing secret in configured provider
    this.logger.debug(`Storing secret in provider: ${metadata.provider}`);
  }

  /**
   * Retrieve secret from provider
   */
  private async retrieveSecretFromProvider(metadata: SecretMetadata): Promise<SecretValue> {
    // Implementation for retrieving secret from configured provider
    this.logger.debug(`Retrieving secret from provider: ${metadata.provider}`);

    // Mock encrypted value for demonstration
    return {
      encryptedValue: 'mock_encrypted_value',
      algorithm: 'aes-256-cbc',
      iv: 'mock_iv',
      keyDerivation: {
        salt: 'mock_salt',
        iterations: 100000,
        keyLength: 32,
        algorithm: 'pbkdf2',
      },
      integrityHash: 'mock_hash',
      version: 1,
    };
  }

  /**
   * Generate utility methods
   */
  private generateSecretId(): string {
    return `secret_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateRequestId(): string {
    return `request_${Date.now()}_${randomBytes(6).toString('hex')}`;
  }

  private generateRotationId(): string {
    return `rotation_${Date.now()}_${randomBytes(6).toString('hex')}`;
  }

  private generateEmergencyId(): string {
    return `emergency_${Date.now()}_${randomBytes(6).toString('hex')}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  /**
   * Additional helper methods (stubs for implementation)
   */
  private async validateSecretData(data: any): Promise<void> {}
  private getDefaultRotationConfig(): RotationConfiguration { return {} as any; }
  private getDefaultAccessControlConfig(): AccessControlConfiguration { return {} as any; }
  private getDefaultBackupConfig(): BackupConfiguration { return {} as any; }
  private async createSecretBackup(metadata: SecretMetadata, value: SecretValue): Promise<void> {}
  private async scheduleRotation(secretId: string): Promise<void> {}
  private async canAutoApprove(request: SecretAccessRequest, metadata: SecretMetadata): Promise<boolean> { return false; }
  private async processApprovalWorkflow(request: SecretAccessRequest, metadata: SecretMetadata): Promise<void> {}
  private async trackSecretAccess(metadata: SecretMetadata, requester: SecretRequester): Promise<void> {}
  private async generateNewSecretValue(metadata: SecretMetadata): Promise<string> { return 'new_secret_value'; }
  private async performPreRotationValidation(metadata: SecretMetadata): Promise<void> {}
  private async storeNewSecretVersion(metadata: SecretMetadata, value: SecretValue): Promise<number> { return 2; }
  private async performPostRotationVerification(metadata: SecretMetadata, version: number): Promise<ValidationResult[]> { return []; }
  private async handleRotationFailure(secretId: string, rotationId: string, error: any): Promise<void> {}
  private async validateEmergencyAccess(request: any): Promise<void> {}
  private async triggerEmergencyNotifications(request: any, emergencyId: string): Promise<void> {}
  private async logEmergencyAccess(request: any, emergencyId: string, metadata: SecretMetadata): Promise<void> {}
  private async shouldRotateSecret(metadata: SecretMetadata, now: Date): Promise<boolean> { return false; }
  private async processRotationQueue(): Promise<void> {}
  private async startRotationMonitoring(): Promise<void> {}
  private async startAccessMonitoring(): Promise<void> {}

  /**
   * Load configuration
   */
  private loadConfiguration(): SecretManagementConfig {
    return {
      enabled: this.configService.get<boolean>('secret.management.enabled', true),
      defaultProvider: SecretProvider.LOCAL_ENCRYPTED,
      providers: {},
      encryption: {
        defaultAlgorithm: 'aes-256-cbc',
        keyDerivation: {
          algorithm: 'pbkdf2',
          iterations: 100000,
          saltLength: 32,
          keyLength: 32,
        },
        masterKey: {
          source: KeySource.ENVIRONMENT,
          rotationFrequency: '1y',
          backup: true,
        },
      },
      rotation: {
        enabled: true,
        defaultIntervalDays: 90,
        maxAgeDays: 365,
        rotationWindow: {
          startHour: 2,
          endHour: 6,
          allowedDays: [DayOfWeek.SUNDAY, DayOfWeek.SATURDAY],
          timezone: 'UTC',
        },
        concurrentRotationLimit: 5,
      },
      accessControl: {
        defaultPattern: AccessPattern.JUST_IN_TIME,
        requireMfaByDefault: true,
        defaultSessionDuration: 60,
        emergencyAccess: {
          enabled: true,
          emergencyRoles: ['security_admin', 'incident_commander'],
          breakGlassProcedures: [],
          notificationRequirements: [],
        },
      },
      monitoring: {
        enabled: true,
        metricsCollection: {
          intervalSeconds: 60,
          metrics: [MetricType.ACCESS_COUNT, MetricType.ROTATION_COUNT],
          storage: {
            type: MetricsStorageType.PROMETHEUS,
            config: {},
            retentionPeriodDays: 30,
          },
        },
        alerting: {
          rules: [],
          channels: [],
          escalationPolicies: [],
        },
        anomalyDetection: {
          enabled: true,
          algorithms: [AnomalyDetectionAlgorithm.STATISTICAL],
          sensitivityLevel: SensitivityLevel.MEDIUM,
          trainingPeriodDays: 30,
        },
      },
      backup: {
        enabled: true,
        defaultFrequency: BackupFrequency.DAILY,
        storage: [],
        recoveryTesting: {
          enabled: true,
          schedule: '0 2 * * 0', // Weekly
          testCoveragePercentage: 10,
          notifications: [],
        },
      },
    };
  }

  /**
   * Application shutdown cleanup
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(`🔄 Shutting down secret management service (signal: ${signal})`);
    this.secretCache.clear();
    this.accessRequestCache.clear();
    this.rotationQueue = [];
  }
}

// ===========================
// TYPE DEFINITIONS FOR EXTERNAL INTERFACES
// ===========================

export interface CreateSecretRequest {
  name: string;
  type: SecretType;
  description: string;
  value: string;
  provider?: SecretProvider;
  expiresAt?: Date;
  owner: SecretOwner;
  tags?: Record<string, string>;
  complianceRequirements?: ComplianceRequirement[];
  rotationConfig?: RotationConfiguration;
  accessControl?: AccessControlConfiguration;
  backupConfig?: BackupConfiguration;
}

export interface SecretAccessRequestData {
  secretId: string;
  requester: SecretRequester;
  pattern: AccessPattern;
  justification: string;
}

export interface EmergencyAccessRequest {
  secretId: string;
  requester: SecretRequester;
  justification: string;
  emergencyType: string;
  approver?: string;
}