/**
 * PARLANT Quality Gates Framework - Core Types and Interfaces
 *
 * Comprehensive quality gate system for automated validation, performance monitoring,
 * security checks, and rollback mechanisms for PARLANT database function wrapping.
 *
 * @fileoverview Core types and interfaces for quality gates framework
 * @version 1.0.0
 * @author Quality Gates Framework Agent
 * @created 2025-09-20
 */

import { ValidationLevel, ErrorCategory, WrapperError } from '../../function-wrapper/interfaces/wrapper-types';

/**
 * Quality Gate Status Enumeration
 * Represents the current state of a quality gate
 */
export enum QualityGateStatus {
  /** Gate is passing all criteria */
  PASSED = 'passed',

  /** Gate is failing but not blocking */
  WARNING = 'warning',

  /** Gate is failing and blocking deployment */
  FAILED = 'failed',

  /** Gate is currently being evaluated */
  EVALUATING = 'evaluating',

  /** Gate evaluation was skipped */
  SKIPPED = 'skipped',

  /** Gate evaluation encountered an error */
  ERROR = 'error'
}

/**
 * Quality Gate Type Enumeration
 * Categorizes different types of quality gates
 */
export enum QualityGateType {
  /** Performance-related gates */
  PERFORMANCE = 'performance',

  /** Security validation gates */
  SECURITY = 'security',

  /** Test coverage gates */
  COVERAGE = 'coverage',

  /** Function wrapper integrity gates */
  INTEGRITY = 'integrity',

  /** Compliance validation gates */
  COMPLIANCE = 'compliance',

  /** Custom business logic gates */
  CUSTOM = 'custom'
}

/**
 * Quality Gate Priority Levels
 * Determines execution order and failure handling
 */
export enum QualityGatePriority {
  /** Critical gates that must pass - block on failure */
  CRITICAL = 'critical',

  /** High priority gates - warn on failure */
  HIGH = 'high',

  /** Medium priority gates - log on failure */
  MEDIUM = 'medium',

  /** Low priority gates - informational */
  LOW = 'low'
}

/**
 * Rollback Strategy Enumeration
 * Defines how rollbacks are executed
 */
export enum RollbackStrategy {
  /** Immediate rollback on failure */
  IMMEDIATE = 'immediate',

  /** Gradual rollback over time */
  GRADUAL = 'gradual',

  /** Canary rollback to subset */
  CANARY = 'canary',

  /** Blue-green deployment rollback */
  BLUE_GREEN = 'blue_green',

  /** Manual rollback only */
  MANUAL = 'manual'
}

/**
 * Approval State Enumeration
 * Tracks approval workflow states
 */
export enum ApprovalState {
  /** Pending approval */
  PENDING = 'pending',

  /** Approved by authorized user */
  APPROVED = 'approved',

  /** Rejected by authorized user */
  REJECTED = 'rejected',

  /** Approval expired */
  EXPIRED = 'expired',

  /** Approval revoked */
  REVOKED = 'revoked'
}

/**
 * Core Quality Gate Interface
 * Defines the contract for all quality gates
 */
export interface QualityGate {
  /** Unique gate identifier */
  readonly id: string;

  /** Human-readable gate name */
  readonly name: string;

  /** Gate description */
  readonly description: string;

  /** Gate type category */
  readonly type: QualityGateType;

  /** Gate priority level */
  readonly priority: QualityGatePriority;

  /** Whether gate is enabled */
  readonly enabled: boolean;

  /** Gate configuration */
  readonly config: QualityGateConfig;

  /** Gate thresholds */
  readonly thresholds: QualityGateThresholds;

  /**
   * Execute quality gate validation
   * @param context - Execution context
   * @returns Promise resolving to gate result
   */
  execute(context: QualityGateContext): Promise<QualityGateResult>;

  /**
   * Validate gate configuration
   * @returns Validation result
   */
  validateConfig(): QualityGateConfigValidation;
}

/**
 * Quality Gate Configuration Interface
 * Base configuration for all quality gates
 */
export interface QualityGateConfig {
  /** Gate execution timeout in milliseconds */
  readonly timeout: number;

  /** Number of retry attempts on failure */
  readonly retryAttempts: number;

  /** Delay between retry attempts in milliseconds */
  readonly retryDelay: number;

  /** Enable parallel execution with other gates */
  readonly parallelExecution: boolean;

  /** Gate dependencies - must pass before this gate */
  readonly dependencies: readonly string[];

  /** Custom configuration parameters */
  readonly customParams: Record<string, any>;

  /** Environment-specific overrides */
  readonly environmentOverrides: Record<string, Partial<QualityGateConfig>>;
}

/**
 * Quality Gate Thresholds Interface
 * Defines pass/fail criteria for gates
 */
export interface QualityGateThresholds {
  /** Critical threshold - must not exceed */
  readonly critical: QualityGateThreshold;

  /** Warning threshold - should not exceed */
  readonly warning: QualityGateThreshold;

  /** Success threshold - should achieve */
  readonly success: QualityGateThreshold;

  /** Custom thresholds for specific metrics */
  readonly custom: Record<string, QualityGateThreshold>;
}

/**
 * Individual Quality Gate Threshold
 * Defines a specific threshold criteria
 */
export interface QualityGateThreshold {
  /** Metric name */
  readonly metric: string;

  /** Threshold value */
  readonly value: number;

  /** Comparison operator */
  readonly operator: ThresholdOperator;

  /** Threshold unit */
  readonly unit: string;

  /** Threshold description */
  readonly description: string;
}

/**
 * Threshold Operator Enumeration
 * Operators for threshold comparisons
 */
export enum ThresholdOperator {
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between'
}

/**
 * Quality Gate Execution Context
 * Provides context for gate execution
 */
export interface QualityGateContext {
  /** Execution session ID */
  readonly sessionId: string;

  /** Function being validated */
  readonly functionId: string;

  /** Function metadata */
  readonly functionMetadata: Record<string, any>;

  /** Deployment environment */
  readonly environment: string;

  /** User context */
  readonly userContext: QualityGateUserContext;

  /** Previous gate results in session */
  readonly previousResults: readonly QualityGateResult[];

  /** Execution timestamp */
  readonly timestamp: Date;

  /** Additional context data */
  readonly additionalData: Record<string, any>;
}

/**
 * Quality Gate User Context
 * User information for gate execution
 */
export interface QualityGateUserContext {
  /** User ID */
  readonly userId: string;

  /** User roles */
  readonly roles: readonly string[];

  /** User permissions */
  readonly permissions: readonly string[];

  /** User session information */
  readonly sessionInfo: Record<string, any>;
}

/**
 * Quality Gate Execution Result
 * Result of quality gate execution
 */
export interface QualityGateResult {
  /** Gate ID */
  readonly gateId: string;

  /** Execution status */
  readonly status: QualityGateStatus;

  /** Execution score (0-100) */
  readonly score: number;

  /** Detailed metrics */
  readonly metrics: QualityGateMetrics;

  /** Validation details */
  readonly details: QualityGateDetails;

  /** Execution metadata */
  readonly metadata: QualityGateExecutionMetadata;

  /** Error information if failed */
  readonly error?: WrapperError;

  /** Recommendations for improvement */
  readonly recommendations: readonly string[];
}

/**
 * Quality Gate Metrics
 * Quantitative metrics from gate execution
 */
export interface QualityGateMetrics {
  /** Execution time in milliseconds */
  readonly executionTime: number;

  /** Performance metrics */
  readonly performance: PerformanceMetrics;

  /** Security metrics */
  readonly security: SecurityMetrics;

  /** Coverage metrics */
  readonly coverage: CoverageMetrics;

  /** Custom metrics */
  readonly custom: Record<string, number>;
}

/**
 * Performance Metrics for Quality Gates
 * Performance-related measurements
 */
export interface PerformanceMetrics {
  /** Response time in milliseconds */
  readonly responseTime: number;

  /** Throughput (operations per second) */
  readonly throughput: number;

  /** Memory usage in bytes */
  readonly memoryUsage: number;

  /** CPU usage percentage */
  readonly cpuUsage: number;

  /** Error rate percentage */
  readonly errorRate: number;

  /** Resource utilization metrics */
  readonly resourceUtilization: ResourceUtilizationMetrics;
}

/**
 * Resource Utilization Metrics
 * Detailed resource usage information
 */
export interface ResourceUtilizationMetrics {
  /** Database connection pool usage */
  readonly dbConnectionPool: number;

  /** Network bandwidth usage */
  readonly networkBandwidth: number;

  /** Disk I/O operations */
  readonly diskIo: number;

  /** Cache hit rate */
  readonly cacheHitRate: number;
}

/**
 * Security Metrics for Quality Gates
 * Security-related measurements
 */
export interface SecurityMetrics {
  /** Vulnerability count by severity */
  readonly vulnerabilities: VulnerabilityCount;

  /** Authentication success rate */
  readonly authSuccessRate: number;

  /** Authorization violations */
  readonly authzViolations: number;

  /** Security policy compliance score */
  readonly complianceScore: number;

  /** Threat detection alerts */
  readonly threatAlerts: number;
}

/**
 * Vulnerability Count by Severity
 * Count of vulnerabilities by severity level
 */
export interface VulnerabilityCount {
  /** Critical vulnerabilities */
  readonly critical: number;

  /** High severity vulnerabilities */
  readonly high: number;

  /** Medium severity vulnerabilities */
  readonly medium: number;

  /** Low severity vulnerabilities */
  readonly low: number;

  /** Informational findings */
  readonly info: number;
}

/**
 * Coverage Metrics for Quality Gates
 * Test and validation coverage measurements
 */
export interface CoverageMetrics {
  /** Test coverage percentage */
  readonly testCoverage: number;

  /** Code coverage percentage */
  readonly codeCoverage: number;

  /** Function coverage percentage */
  readonly functionCoverage: number;

  /** Branch coverage percentage */
  readonly branchCoverage: number;

  /** Integration test coverage */
  readonly integrationCoverage: number;
}

/**
 * Quality Gate Details
 * Detailed information about gate execution
 */
export interface QualityGateDetails {
  /** Threshold evaluations */
  readonly thresholdEvaluations: readonly ThresholdEvaluation[];

  /** Validation steps performed */
  readonly validationSteps: readonly ValidationStep[];

  /** Warnings generated */
  readonly warnings: readonly string[];

  /** Information messages */
  readonly info: readonly string[];

  /** Execution logs */
  readonly logs: readonly QualityGateLogEntry[];
}

/**
 * Threshold Evaluation Result
 * Result of evaluating a specific threshold
 */
export interface ThresholdEvaluation {
  /** Threshold ID */
  readonly thresholdId: string;

  /** Metric name */
  readonly metric: string;

  /** Actual value */
  readonly actualValue: number;

  /** Expected threshold value */
  readonly thresholdValue: number;

  /** Comparison operator */
  readonly operator: ThresholdOperator;

  /** Whether threshold was met */
  readonly passed: boolean;

  /** Evaluation details */
  readonly details: string;
}

/**
 * Validation Step Information
 * Information about individual validation steps
 */
export interface ValidationStep {
  /** Step ID */
  readonly stepId: string;

  /** Step name */
  readonly stepName: string;

  /** Step status */
  readonly status: 'passed' | 'failed' | 'skipped' | 'error';

  /** Step execution time */
  readonly executionTime: number;

  /** Step details */
  readonly details: string;

  /** Step output data */
  readonly output: Record<string, any>;
}

/**
 * Quality Gate Log Entry
 * Individual log entry from gate execution
 */
export interface QualityGateLogEntry {
  /** Log timestamp */
  readonly timestamp: Date;

  /** Log level */
  readonly level: 'debug' | 'info' | 'warn' | 'error';

  /** Log message */
  readonly message: string;

  /** Log metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Quality Gate Execution Metadata
 * Metadata about gate execution
 */
export interface QualityGateExecutionMetadata {
  /** Execution ID */
  readonly executionId: string;

  /** Gate version */
  readonly gateVersion: string;

  /** Execution environment */
  readonly environment: string;

  /** Execution host */
  readonly host: string;

  /** Retry attempt number */
  readonly retryAttempt: number;

  /** Execution correlation ID */
  readonly correlationId: string;

  /** Additional metadata */
  readonly additionalMetadata: Record<string, any>;
}

/**
 * Quality Gate Configuration Validation
 * Result of validating gate configuration
 */
export interface QualityGateConfigValidation {
  /** Whether configuration is valid */
  readonly valid: boolean;

  /** Validation errors */
  readonly errors: readonly string[];

  /** Validation warnings */
  readonly warnings: readonly string[];

  /** Configuration suggestions */
  readonly suggestions: readonly string[];
}

/**
 * Quality Gate Pipeline Interface
 * Manages execution of multiple quality gates
 */
export interface QualityGatePipeline {
  /** Pipeline ID */
  readonly id: string;

  /** Pipeline name */
  readonly name: string;

  /** Pipeline configuration */
  readonly config: QualityGatePipelineConfig;

  /** Registered gates */
  readonly gates: readonly QualityGate[];

  /**
   * Execute all gates in pipeline
   * @param context - Pipeline execution context
   * @returns Promise resolving to pipeline result
   */
  execute(context: QualityGateContext): Promise<QualityGatePipelineResult>;

  /**
   * Add gate to pipeline
   * @param gate - Quality gate to add
   */
  addGate(gate: QualityGate): void;

  /**
   * Remove gate from pipeline
   * @param gateId - ID of gate to remove
   */
  removeGate(gateId: string): void;

  /**
   * Get gate by ID
   * @param gateId - Gate ID
   * @returns Quality gate or undefined
   */
  getGate(gateId: string): QualityGate | undefined;
}

/**
 * Quality Gate Pipeline Configuration
 * Configuration for pipeline execution
 */
export interface QualityGatePipelineConfig {
  /** Pipeline execution mode */
  readonly executionMode: PipelineExecutionMode;

  /** Continue on gate failure */
  readonly continueOnFailure: boolean;

  /** Fail fast on critical failure */
  readonly failFast: boolean;

  /** Pipeline timeout in milliseconds */
  readonly timeout: number;

  /** Enable parallel gate execution */
  readonly parallelExecution: boolean;

  /** Maximum parallel gates */
  readonly maxParallelGates: number;

  /** Rollback configuration */
  readonly rollbackConfig: RollbackConfiguration;

  /** Approval configuration */
  readonly approvalConfig: ApprovalConfiguration;
}

/**
 * Pipeline Execution Mode Enumeration
 * Modes for pipeline execution
 */
export enum PipelineExecutionMode {
  /** Execute all gates regardless of failures */
  CONTINUE_ALL = 'continue_all',

  /** Stop on first critical failure */
  FAIL_FAST = 'fail_fast',

  /** Stop on any failure */
  STOP_ON_FAILURE = 'stop_on_failure',

  /** Execute based on gate priorities */
  PRIORITY_BASED = 'priority_based'
}

/**
 * Quality Gate Pipeline Result
 * Result of pipeline execution
 */
export interface QualityGatePipelineResult {
  /** Pipeline ID */
  readonly pipelineId: string;

  /** Overall pipeline status */
  readonly status: QualityGateStatus;

  /** Individual gate results */
  readonly gateResults: readonly QualityGateResult[];

  /** Pipeline metrics */
  readonly metrics: QualityGatePipelineMetrics;

  /** Pipeline execution summary */
  readonly summary: QualityGatePipelineSummary;

  /** Rollback information if triggered */
  readonly rollbackInfo?: RollbackInfo;

  /** Approval information if required */
  readonly approvalInfo?: ApprovalInfo;
}

/**
 * Quality Gate Pipeline Metrics
 * Aggregate metrics from pipeline execution
 */
export interface QualityGatePipelineMetrics {
  /** Total pipeline execution time */
  readonly totalExecutionTime: number;

  /** Number of gates executed */
  readonly gatesExecuted: number;

  /** Number of gates passed */
  readonly gatesPassed: number;

  /** Number of gates failed */
  readonly gatesFailed: number;

  /** Number of gates with warnings */
  readonly gatesWithWarnings: number;

  /** Overall pipeline score */
  readonly overallScore: number;

  /** Performance summary */
  readonly performanceSummary: PerformanceMetrics;

  /** Security summary */
  readonly securitySummary: SecurityMetrics;

  /** Coverage summary */
  readonly coverageSummary: CoverageMetrics;
}

/**
 * Quality Gate Pipeline Summary
 * High-level summary of pipeline execution
 */
export interface QualityGatePipelineSummary {
  /** Pipeline success indicator */
  readonly success: boolean;

  /** Critical failures */
  readonly criticalFailures: readonly string[];

  /** Warnings */
  readonly warnings: readonly string[];

  /** Recommendations */
  readonly recommendations: readonly string[];

  /** Next steps */
  readonly nextSteps: readonly string[];

  /** Quality assessment */
  readonly qualityAssessment: QualityAssessment;
}

/**
 * Quality Assessment
 * Overall quality assessment from pipeline
 */
export interface QualityAssessment {
  /** Overall quality grade */
  readonly grade: QualityGrade;

  /** Quality score (0-100) */
  readonly score: number;

  /** Quality trends */
  readonly trends: QualityTrends;

  /** Improvement areas */
  readonly improvementAreas: readonly string[];

  /** Quality compliance status */
  readonly complianceStatus: ComplianceStatus;
}

/**
 * Quality Grade Enumeration
 * Quality grades for assessments
 */
export enum QualityGrade {
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  C_PLUS = 'C+',
  C = 'C',
  C_MINUS = 'C-',
  D = 'D',
  F = 'F'
}

/**
 * Quality Trends
 * Quality trend information
 */
export interface QualityTrends {
  /** Score trend direction */
  readonly scoreDirection: TrendDirection;

  /** Performance trend */
  readonly performanceTrend: TrendDirection;

  /** Security trend */
  readonly securityTrend: TrendDirection;

  /** Coverage trend */
  readonly coverageTrend: TrendDirection;

  /** Historical data points */
  readonly historicalData: readonly QualityDataPoint[];
}

/**
 * Trend Direction Enumeration
 * Direction of quality trends
 */
export enum TrendDirection {
  IMPROVING = 'improving',
  STABLE = 'stable',
  DECLINING = 'declining',
  UNKNOWN = 'unknown'
}

/**
 * Quality Data Point
 * Historical quality measurement
 */
export interface QualityDataPoint {
  /** Measurement timestamp */
  readonly timestamp: Date;

  /** Quality score */
  readonly score: number;

  /** Performance score */
  readonly performanceScore: number;

  /** Security score */
  readonly securityScore: number;

  /** Coverage score */
  readonly coverageScore: number;
}

/**
 * Compliance Status
 * Compliance status information
 */
export interface ComplianceStatus {
  /** Overall compliance state */
  readonly status: 'compliant' | 'non_compliant' | 'partial' | 'unknown';

  /** Compliance frameworks */
  readonly frameworks: readonly ComplianceFrameworkStatus[];

  /** Compliance gaps */
  readonly gaps: readonly string[];

  /** Remediation timeline */
  readonly remediationTimeline: Date;
}

/**
 * Compliance Framework Status
 * Status for individual compliance framework
 */
export interface ComplianceFrameworkStatus {
  /** Framework name */
  readonly framework: string;

  /** Compliance status */
  readonly status: 'compliant' | 'non_compliant' | 'partial';

  /** Compliance score */
  readonly score: number;

  /** Required actions */
  readonly requiredActions: readonly string[];
}

/**
 * Rollback Configuration
 * Configuration for automated rollback
 */
export interface RollbackConfiguration {
  /** Enable automatic rollback */
  readonly enabled: boolean;

  /** Rollback strategy */
  readonly strategy: RollbackStrategy;

  /** Rollback triggers */
  readonly triggers: readonly RollbackTrigger[];

  /** Rollback timeout */
  readonly timeout: number;

  /** Recovery procedures */
  readonly recoveryProcedures: readonly RecoveryProcedure[];

  /** Notification settings */
  readonly notifications: RollbackNotificationSettings;
}

/**
 * Rollback Trigger
 * Conditions that trigger automatic rollback
 */
export interface RollbackTrigger {
  /** Trigger ID */
  readonly id: string;

  /** Trigger condition */
  readonly condition: RollbackCondition;

  /** Trigger threshold */
  readonly threshold: number;

  /** Trigger evaluation window */
  readonly evaluationWindow: number;

  /** Trigger enabled */
  readonly enabled: boolean;
}

/**
 * Rollback Condition Enumeration
 * Conditions that can trigger rollback
 */
export enum RollbackCondition {
  /** Error rate exceeds threshold */
  ERROR_RATE_THRESHOLD = 'error_rate_threshold',

  /** Response time exceeds threshold */
  RESPONSE_TIME_THRESHOLD = 'response_time_threshold',

  /** Security violation detected */
  SECURITY_VIOLATION = 'security_violation',

  /** Critical gate failure */
  CRITICAL_GATE_FAILURE = 'critical_gate_failure',

  /** Manual rollback request */
  MANUAL_REQUEST = 'manual_request',

  /** Health check failure */
  HEALTH_CHECK_FAILURE = 'health_check_failure'
}

/**
 * Recovery Procedure
 * Automated recovery procedure
 */
export interface RecoveryProcedure {
  /** Procedure ID */
  readonly id: string;

  /** Procedure name */
  readonly name: string;

  /** Procedure steps */
  readonly steps: readonly RecoveryStep[];

  /** Procedure timeout */
  readonly timeout: number;

  /** Procedure retry configuration */
  readonly retryConfig: RecoveryRetryConfig;
}

/**
 * Recovery Step
 * Individual step in recovery procedure
 */
export interface RecoveryStep {
  /** Step ID */
  readonly id: string;

  /** Step name */
  readonly name: string;

  /** Step type */
  readonly type: RecoveryStepType;

  /** Step configuration */
  readonly config: Record<string, any>;

  /** Step timeout */
  readonly timeout: number;

  /** Continue on failure */
  readonly continueOnFailure: boolean;
}

/**
 * Recovery Step Type Enumeration
 * Types of recovery steps
 */
export enum RecoveryStepType {
  /** Execute script or command */
  SCRIPT = 'script',

  /** Call API endpoint */
  API_CALL = 'api_call',

  /** Database operation */
  DATABASE = 'database',

  /** Service restart */
  SERVICE_RESTART = 'service_restart',

  /** Configuration change */
  CONFIG_CHANGE = 'config_change',

  /** Custom action */
  CUSTOM = 'custom'
}

/**
 * Recovery Retry Configuration
 * Retry settings for recovery procedures
 */
export interface RecoveryRetryConfig {
  /** Maximum retry attempts */
  readonly maxAttempts: number;

  /** Retry delay in milliseconds */
  readonly delay: number;

  /** Backoff strategy */
  readonly backoffStrategy: 'fixed' | 'linear' | 'exponential';

  /** Maximum delay between retries */
  readonly maxDelay: number;
}

/**
 * Rollback Notification Settings
 * Settings for rollback notifications
 */
export interface RollbackNotificationSettings {
  /** Enable notifications */
  readonly enabled: boolean;

  /** Notification channels */
  readonly channels: readonly NotificationChannel[];

  /** Notification recipients */
  readonly recipients: readonly string[];

  /** Notification templates */
  readonly templates: Record<string, string>;
}

/**
 * Notification Channel Enumeration
 * Available notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  PAGER_DUTY = 'pager_duty'
}

/**
 * Rollback Information
 * Information about executed rollback
 */
export interface RollbackInfo {
  /** Rollback ID */
  readonly rollbackId: string;

  /** Rollback trigger */
  readonly trigger: RollbackTrigger;

  /** Rollback strategy used */
  readonly strategy: RollbackStrategy;

  /** Rollback execution time */
  readonly executionTime: number;

  /** Rollback success status */
  readonly success: boolean;

  /** Recovery procedures executed */
  readonly proceduresExecuted: readonly RecoveryProcedureResult[];

  /** Rollback error if failed */
  readonly error?: WrapperError;
}

/**
 * Recovery Procedure Result
 * Result of executing recovery procedure
 */
export interface RecoveryProcedureResult {
  /** Procedure ID */
  readonly procedureId: string;

  /** Execution success */
  readonly success: boolean;

  /** Execution time */
  readonly executionTime: number;

  /** Step results */
  readonly stepResults: readonly RecoveryStepResult[];

  /** Procedure error if failed */
  readonly error?: WrapperError;
}

/**
 * Recovery Step Result
 * Result of executing recovery step
 */
export interface RecoveryStepResult {
  /** Step ID */
  readonly stepId: string;

  /** Execution success */
  readonly success: boolean;

  /** Execution time */
  readonly executionTime: number;

  /** Step output */
  readonly output: Record<string, any>;

  /** Step error if failed */
  readonly error?: WrapperError;
}

/**
 * Approval Configuration
 * Configuration for approval workflows
 */
export interface ApprovalConfiguration {
  /** Enable approval workflows */
  readonly enabled: boolean;

  /** Approval requirements */
  readonly requirements: readonly ApprovalRequirement[];

  /** Approval timeout */
  readonly timeout: number;

  /** Auto-approval conditions */
  readonly autoApprovalConditions: readonly AutoApprovalCondition[];

  /** Approval notification settings */
  readonly notifications: ApprovalNotificationSettings;
}

/**
 * Approval Requirement
 * Requirement for approval
 */
export interface ApprovalRequirement {
  /** Requirement ID */
  readonly id: string;

  /** Requirement name */
  readonly name: string;

  /** Required approvers */
  readonly approvers: readonly ApproverDefinition[];

  /** Minimum approvals needed */
  readonly minApprovals: number;

  /** Approval conditions */
  readonly conditions: readonly ApprovalCondition[];

  /** Requirement priority */
  readonly priority: number;
}

/**
 * Approver Definition
 * Definition of who can approve
 */
export interface ApproverDefinition {
  /** Approver type */
  readonly type: ApproverType;

  /** Approver identifier */
  readonly identifier: string;

  /** Approver role or group */
  readonly role?: string;

  /** Approver permissions required */
  readonly permissions: readonly string[];
}

/**
 * Approver Type Enumeration
 * Types of approvers
 */
export enum ApproverType {
  USER = 'user',
  GROUP = 'group',
  ROLE = 'role',
  SERVICE_ACCOUNT = 'service_account'
}

/**
 * Approval Condition
 * Condition for when approval is needed
 */
export interface ApprovalCondition {
  /** Condition ID */
  readonly id: string;

  /** Condition type */
  readonly type: ApprovalConditionType;

  /** Condition parameters */
  readonly parameters: Record<string, any>;

  /** Condition description */
  readonly description: string;
}

/**
 * Approval Condition Type Enumeration
 * Types of approval conditions
 */
export enum ApprovalConditionType {
  /** Production environment deployment */
  PRODUCTION_DEPLOYMENT = 'production_deployment',

  /** High risk change */
  HIGH_RISK_CHANGE = 'high_risk_change',

  /** Security policy violation */
  SECURITY_VIOLATION = 'security_violation',

  /** Performance degradation */
  PERFORMANCE_DEGRADATION = 'performance_degradation',

  /** Custom condition */
  CUSTOM = 'custom'
}

/**
 * Auto Approval Condition
 * Condition for automatic approval
 */
export interface AutoApprovalCondition {
  /** Condition ID */
  readonly id: string;

  /** Condition criteria */
  readonly criteria: AutoApprovalCriteria;

  /** Condition enabled */
  readonly enabled: boolean;

  /** Condition description */
  readonly description: string;
}

/**
 * Auto Approval Criteria
 * Criteria for automatic approval
 */
export interface AutoApprovalCriteria {
  /** Environment restrictions */
  readonly environments: readonly string[];

  /** User restrictions */
  readonly users: readonly string[];

  /** Quality score threshold */
  readonly qualityScoreThreshold: number;

  /** No critical failures */
  readonly noCriticalFailures: boolean;

  /** Additional criteria */
  readonly additionalCriteria: Record<string, any>;
}

/**
 * Approval Notification Settings
 * Settings for approval notifications
 */
export interface ApprovalNotificationSettings {
  /** Enable notifications */
  readonly enabled: boolean;

  /** Notification channels */
  readonly channels: readonly NotificationChannel[];

  /** Notification recipients */
  readonly recipients: readonly string[];

  /** Escalation settings */
  readonly escalation: ApprovalEscalationSettings;
}

/**
 * Approval Escalation Settings
 * Settings for approval escalation
 */
export interface ApprovalEscalationSettings {
  /** Enable escalation */
  readonly enabled: boolean;

  /** Escalation delay */
  readonly delay: number;

  /** Escalation levels */
  readonly levels: readonly EscalationLevel[];
}

/**
 * Escalation Level
 * Individual escalation level
 */
export interface EscalationLevel {
  /** Level number */
  readonly level: number;

  /** Escalation recipients */
  readonly recipients: readonly string[];

  /** Escalation message template */
  readonly messageTemplate: string;

  /** Escalation channels */
  readonly channels: readonly NotificationChannel[];
}

/**
 * Approval Information
 * Information about approval workflow
 */
export interface ApprovalInfo {
  /** Approval ID */
  readonly approvalId: string;

  /** Approval state */
  readonly state: ApprovalState;

  /** Required approvals */
  readonly requiredApprovals: readonly ApprovalRequirement[];

  /** Received approvals */
  readonly receivedApprovals: readonly ApprovalRecord[];

  /** Approval timeline */
  readonly timeline: ApprovalTimeline;

  /** Approval metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Approval Record
 * Record of individual approval
 */
export interface ApprovalRecord {
  /** Approval ID */
  readonly id: string;

  /** Approver information */
  readonly approver: ApproverInfo;

  /** Approval decision */
  readonly decision: 'approved' | 'rejected';

  /** Approval timestamp */
  readonly timestamp: Date;

  /** Approval comments */
  readonly comments?: string;

  /** Approval metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Approver Information
 * Information about the approver
 */
export interface ApproverInfo {
  /** Approver ID */
  readonly id: string;

  /** Approver name */
  readonly name: string;

  /** Approver type */
  readonly type: ApproverType;

  /** Approver role */
  readonly role: string;

  /** Approver contact */
  readonly contact: string;
}

/**
 * Approval Timeline
 * Timeline of approval events
 */
export interface ApprovalTimeline {
  /** Request timestamp */
  readonly requested: Date;

  /** First approval timestamp */
  readonly firstApproval?: Date;

  /** Final approval timestamp */
  readonly finalApproval?: Date;

  /** Expiration timestamp */
  readonly expiration: Date;

  /** Timeline events */
  readonly events: readonly ApprovalTimelineEvent[];
}

/**
 * Approval Timeline Event
 * Individual event in approval timeline
 */
export interface ApprovalTimelineEvent {
  /** Event ID */
  readonly id: string;

  /** Event type */
  readonly type: ApprovalEventType;

  /** Event timestamp */
  readonly timestamp: Date;

  /** Event description */
  readonly description: string;

  /** Event metadata */
  readonly metadata: Record<string, any>;
}

/**
 * Approval Event Type Enumeration
 * Types of approval events
 */
export enum ApprovalEventType {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  ESCALATED = 'escalated',
  WITHDRAWN = 'withdrawn'
}