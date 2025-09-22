/**
 * PARLANT Phase 1 Transaction Management Types
 *
 * Comprehensive type definitions for sophisticated transaction management
 * with PARLANT conversational validation integration. Provides enterprise-grade
 * transaction coordination, rollback mechanisms, and ACID compliance.
 *
 * Features:
 * - Transaction-aware PARLANT validation integration
 * - ACID transaction property enforcement
 * - Sophisticated rollback and recovery mechanisms
 * - Multi-database transaction coordination
 * - Performance optimization and monitoring
 * - Comprehensive audit and compliance tracking
 *
 * @module ParlantTransactionTypes
 * @version 1.0.0
 * @author Claude Code - PARLANT Phase 1 Transaction Management Specialist
 */

import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  ParlantUserContext,
  SecurityLevel,
} from "../../types/parlant-integration.types";

// ===== CORE TRANSACTION INTERFACES =====

/**
 * Transaction operation types for comprehensive management
 */
export enum TransactionOperationType {
  // Single operations
  READ = "READ",
  WRITE = "WRITE",
  UPDATE = "UPDATE",
  DELETE = "DELETE",

  // Batch operations
  BATCH_READ = "BATCH_READ",
  BATCH_WRITE = "BATCH_WRITE",
  BATCH_UPDATE = "BATCH_UPDATE",
  BATCH_DELETE = "BATCH_DELETE",

  // Complex operations
  MIGRATION = "MIGRATION",
  BACKUP = "BACKUP",
  RESTORE = "RESTORE",
  SCHEMA_CHANGE = "SCHEMA_CHANGE",
}

/**
 * Transaction isolation levels for consistency control
 */
export enum TransactionIsolationLevel {
  READ_UNCOMMITTED = "READ_UNCOMMITTED",
  READ_COMMITTED = "READ_COMMITTED",
  REPEATABLE_READ = "REPEATABLE_READ",
  SERIALIZABLE = "SERIALIZABLE",
}

/**
 * Transaction state management
 */
export enum TransactionState {
  INITIALIZED = "INITIALIZED",
  PENDING_VALIDATION = "PENDING_VALIDATION",
  VALIDATED = "VALIDATED",
  EXECUTING = "EXECUTING",
  COMMITTED = "COMMITTED",
  ROLLED_BACK = "ROLLED_BACK",
  FAILED = "FAILED",
  TIMEOUT = "TIMEOUT",
  DEADLOCKED = "DEADLOCKED",
}

/**
 * Transaction priority levels for conflict resolution
 */
export enum TransactionPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
  SYSTEM = "SYSTEM",
}

// ===== TRANSACTION CONTEXT AND METADATA =====

/**
 * Comprehensive transaction metadata for tracking and optimization
 */
export interface TransactionMetadata {
  /** Unique transaction identifier */
  readonly transactionId: string;

  /** Transaction type for categorization */
  readonly operationType: TransactionOperationType;

  /** Current transaction state */
  state: TransactionState;

  /** Transaction isolation level */
  readonly isolationLevel: TransactionIsolationLevel;

  /** Transaction priority for conflict resolution */
  readonly priority: TransactionPriority;

  /** User context for PARLANT validation */
  readonly userContext: ParlantUserContext;

  /** Security level required for operations */
  readonly securityLevel: SecurityLevel;

  /** Transaction timeout in milliseconds */
  readonly timeout: number;

  /** Transaction creation timestamp */
  readonly createdAt: Date;

  /** Last state update timestamp */
  updatedAt: Date;

  /** Transaction completion timestamp */
  completedAt?: Date;

  /** Parent transaction ID for nested transactions */
  readonly parentTransactionId?: string;

  /** Child transaction IDs */
  readonly childTransactionIds: string[];

  /** Database connection identifiers */
  readonly databaseConnections: string[];

  /** PARLANT conversation ID for validation */
  parlantConversationId?: string;

  /** Performance metrics */
  readonly performanceMetrics: TransactionPerformanceMetrics;

  /** Transaction-specific configuration */
  readonly configuration: TransactionConfiguration;
}

/**
 * Transaction performance metrics for optimization
 */
export interface TransactionPerformanceMetrics {
  /** Validation start time */
  validationStartTime?: number;

  /** Validation completion time */
  validationEndTime?: number;

  /** Execution start time */
  executionStartTime?: number;

  /** Execution completion time */
  executionEndTime?: number;

  /** Total validation duration in milliseconds */
  validationDuration?: number;

  /** Total execution duration in milliseconds */
  executionDuration?: number;

  /** Memory usage in bytes */
  memoryUsage?: number;

  /** CPU time in milliseconds */
  cpuTime?: number;

  /** Number of database operations */
  operationCount: number;

  /** Number of validation requests */
  validationRequestCount: number;

  /** Number of retry attempts */
  retryCount: number;

  /** Lock wait time in milliseconds */
  lockWaitTime?: number;
}

/**
 * Transaction configuration for customization
 */
export interface TransactionConfiguration {
  /** Enable automatic retry on failure */
  enableAutoRetry: boolean;

  /** Maximum retry attempts */
  maxRetryAttempts: number;

  /** Retry delay in milliseconds */
  retryDelay: number;

  /** Enable deadlock detection */
  enableDeadlockDetection: boolean;

  /** Enable performance monitoring */
  enablePerformanceMonitoring: boolean;

  /** Enable audit logging */
  enableAuditLogging: boolean;

  /** Custom validation timeout */
  customValidationTimeout?: number;

  /** Resource limits for transaction */
  resourceLimits?: TransactionResourceLimits;
}

/**
 * Resource limits for transaction execution
 */
export interface TransactionResourceLimits {
  /** Maximum memory usage in MB */
  maxMemoryUsage: number;

  /** Maximum CPU usage percentage */
  maxCpuUsage: number;

  /** Maximum execution time in milliseconds */
  maxExecutionTime: number;

  /** Maximum number of database connections */
  maxDatabaseConnections: number;

  /** Maximum number of concurrent operations */
  maxConcurrentOperations: number;
}

// ===== TRANSACTION OPERATION INTERFACES =====

/**
 * Transaction operation definition
 */
export interface TransactionOperation {
  /** Unique operation identifier */
  readonly operationId: string;

  /** Operation type */
  readonly type: TransactionOperationType;

  /** Operation description for PARLANT validation */
  readonly description: string;

  /** Function to execute */
  readonly executor: TransactionExecutor;

  /** Operation parameters */
  readonly parameters: Record<string, unknown>;

  /** Rollback function for recovery */
  readonly rollbackExecutor?: TransactionRollbackExecutor;

  /** Operation dependencies */
  readonly dependencies: string[];

  /** Estimated execution time in milliseconds */
  readonly estimatedExecutionTime: number;

  /** Security requirements */
  readonly securityRequirements: string[];
}

/**
 * Transaction executor function type
 */
export type TransactionExecutor = (
  context: TransactionExecutionContext,
) => Promise<TransactionOperationResult>;

/**
 * Transaction rollback executor function type
 */
export type TransactionRollbackExecutor = (
  context: TransactionExecutionContext,
  originalResult: TransactionOperationResult,
) => Promise<void>;

/**
 * Transaction execution context
 */
export interface TransactionExecutionContext {
  /** Transaction metadata */
  readonly transaction: TransactionMetadata;

  /** Current operation being executed */
  readonly operation: TransactionOperation;

  /** Database connections available to transaction */
  readonly databaseConnections: Map<string, unknown>;

  /** PARLANT validation response */
  readonly validationResponse?: ParlantValidationResponse;

  /** Execution environment variables */
  readonly environment: Record<string, unknown>;

  /** Performance monitoring callbacks */
  readonly performanceMonitor: TransactionPerformanceMonitor;

  /** Audit logging callbacks */
  readonly auditLogger: TransactionAuditLogger;
}

/**
 * Transaction operation result
 */
export interface TransactionOperationResult {
  /** Operation success status */
  readonly success: boolean;

  /** Operation result data */
  readonly data?: unknown;

  /** Error information if failed */
  readonly error?: TransactionError;

  /** Performance metrics for operation */
  readonly performanceMetrics: Partial<TransactionPerformanceMetrics>;

  /** Audit trail information */
  readonly auditInfo: TransactionAuditInfo;

  /** Rollback information if needed */
  readonly rollbackInfo?: TransactionRollbackInfo;
}

// ===== ERROR HANDLING AND RECOVERY =====

/**
 * Transaction error types
 */
export enum TransactionErrorType {
  VALIDATION_FAILED = "VALIDATION_FAILED",
  EXECUTION_FAILED = "EXECUTION_FAILED",
  TIMEOUT = "TIMEOUT",
  DEADLOCK = "DEADLOCK",
  CONNECTION_FAILED = "CONNECTION_FAILED",
  ROLLBACK_FAILED = "ROLLBACK_FAILED",
  RESOURCE_EXHAUSTED = "RESOURCE_EXHAUSTED",
  SECURITY_VIOLATION = "SECURITY_VIOLATION",
  CONSTRAINT_VIOLATION = "CONSTRAINT_VIOLATION",
}

/**
 * Comprehensive transaction error information
 */
export interface TransactionError {
  /** Error type classification */
  readonly type: TransactionErrorType;

  /** Error message */
  readonly message: string;

  /** Error code */
  readonly code: string;

  /** Underlying error details */
  readonly details: Record<string, unknown>;

  /** Error timestamp */
  readonly timestamp: Date;

  /** Stack trace for debugging */
  readonly stackTrace?: string;

  /** Recovery suggestions */
  readonly recoverySuggestions: string[];

  /** Is error recoverable */
  readonly isRecoverable: boolean;
}

/**
 * Transaction rollback information
 */
export interface TransactionRollbackInfo {
  /** Rollback trigger reason */
  readonly reason: string;

  /** Rollback execution status */
  readonly status: "PENDING" | "EXECUTING" | "COMPLETED" | "FAILED";

  /** Operations that need rollback */
  readonly operationsToRollback: string[];

  /** Rollback start time */
  readonly startTime: Date;

  /** Rollback completion time */
  readonly completionTime?: Date;

  /** Rollback error if failed */
  readonly rollbackError?: TransactionError;
}

// ===== MONITORING AND AUDIT INTERFACES =====

/**
 * Transaction performance monitor interface
 */
export interface TransactionPerformanceMonitor {
  /** Record operation start */
  recordOperationStart(operationId: string): void;

  /** Record operation completion */
  recordOperationCompletion(
    operationId: string,
    result: TransactionOperationResult,
  ): void;

  /** Record resource usage */
  recordResourceUsage(metrics: Partial<TransactionPerformanceMetrics>): void;

  /** Get current performance metrics */
  getCurrentMetrics(): TransactionPerformanceMetrics;
}

/**
 * Transaction audit logger interface
 */
export interface TransactionAuditLogger {
  /** Log transaction state change */
  logStateChange(
    oldState: TransactionState,
    newState: TransactionState,
    reason: string,
  ): void;

  /** Log operation execution */
  logOperationExecution(
    operation: TransactionOperation,
    result: TransactionOperationResult,
  ): void;

  /** Log validation request */
  logValidationRequest(request: ParlantValidationRequest): void;

  /** Log validation response */
  logValidationResponse(response: ParlantValidationResponse): void;

  /** Log error occurrence */
  logError(error: TransactionError): void;

  /** Get audit trail */
  getAuditTrail(): TransactionAuditInfo[];
}

/**
 * Transaction audit information
 */
export interface TransactionAuditInfo {
  /** Audit entry ID */
  readonly auditId: string;

  /** Audit entry type */
  readonly type:
    | "STATE_CHANGE"
    | "OPERATION"
    | "VALIDATION"
    | "ERROR"
    | "SECURITY";

  /** Audit entry timestamp */
  readonly timestamp: Date;

  /** User context at time of audit */
  readonly userContext: ParlantUserContext;

  /** Audit entry details */
  readonly details: Record<string, unknown>;

  /** Security classification */
  readonly securityLevel: SecurityLevel;
}

// ===== BATCH PROCESSING INTERFACES =====

/**
 * Transaction batch configuration
 */
export interface TransactionBatchConfiguration {
  /** Maximum batch size */
  maxBatchSize: number;

  /** Batch timeout in milliseconds */
  batchTimeout: number;

  /** Enable parallel execution */
  enableParallelExecution: boolean;

  /** Maximum parallel operations */
  maxParallelOperations: number;

  /** Batch validation strategy */
  validationStrategy: "INDIVIDUAL" | "BATCH" | "HYBRID";

  /** Failure handling strategy */
  failureStrategy: "FAIL_FAST" | "CONTINUE_ON_ERROR" | "ROLLBACK_ALL";
}

/**
 * Transaction batch result
 */
export interface TransactionBatchResult {
  /** Batch execution success status */
  readonly success: boolean;

  /** Individual operation results */
  readonly operationResults: Map<string, TransactionOperationResult>;

  /** Failed operations */
  readonly failedOperations: string[];

  /** Batch performance metrics */
  readonly batchMetrics: TransactionPerformanceMetrics;

  /** Batch audit information */
  readonly auditInfo: TransactionAuditInfo;
}

// ===== DISTRIBUTED TRANSACTION INTERFACES =====

/**
 * Distributed transaction participant
 */
export interface DistributedTransactionParticipant {
  /** Participant identifier */
  readonly participantId: string;

  /** Participant name */
  readonly participantName: string;

  /** Database type */
  readonly databaseType:
    | "SQLITE"
    | "MYSQL"
    | "POSTGRESQL"
    | "MONGODB"
    | "REDIS";

  /** Connection string */
  readonly connectionString: string;

  /** Participant status */
  status: "ACTIVE" | "INACTIVE" | "FAILED" | "RECOVERING";

  /** Last heartbeat timestamp */
  lastHeartbeat: Date;

  /** Participant capabilities */
  readonly capabilities: string[];
}

/**
 * Distributed transaction coordination info
 */
export interface DistributedTransactionInfo {
  /** Coordinator node ID */
  readonly coordinatorId: string;

  /** Participating nodes */
  readonly participants: DistributedTransactionParticipant[];

  /** Two-phase commit status */
  readonly commitPhase: "PREPARE" | "COMMIT" | "ABORT";

  /** Participant votes */
  readonly participantVotes: Map<string, "YES" | "NO" | "TIMEOUT">;

  /** Coordination timeout */
  readonly coordinationTimeout: number;

  /** Recovery information */
  readonly recoveryInfo?: DistributedTransactionRecoveryInfo;
}

/**
 * Distributed transaction recovery information
 */
export interface DistributedTransactionRecoveryInfo {
  /** Recovery start time */
  readonly recoveryStartTime: Date;

  /** Recovery type */
  readonly recoveryType: "AUTOMATIC" | "MANUAL" | "OPERATOR_INTERVENTION";

  /** Failed participants */
  readonly failedParticipants: string[];

  /** Recovery strategy */
  readonly recoveryStrategy: "RETRY" | "COMPENSATE" | "ROLLBACK";

  /** Recovery status */
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

// ===== DEADLOCK DETECTION INTERFACES =====

/**
 * Deadlock detection information
 */
export interface DeadlockInfo {
  /** Deadlock detection timestamp */
  readonly detectedAt: Date;

  /** Transactions involved in deadlock */
  readonly involvedTransactions: string[];

  /** Deadlock cycle description */
  readonly cycle: DeadlockCycle[];

  /** Suggested victim transaction */
  readonly suggestedVictim: string;

  /** Resolution strategy */
  readonly resolutionStrategy:
    | "TIMEOUT"
    | "VICTIM_SELECTION"
    | "PRIORITY_BASED";

  /** Resolution status */
  status: "DETECTED" | "RESOLVING" | "RESOLVED" | "FAILED";
}

/**
 * Deadlock cycle information
 */
export interface DeadlockCycle {
  /** Transaction waiting */
  readonly waitingTransaction: string;

  /** Transaction holding lock */
  readonly holdingTransaction: string;

  /** Resource being waited for */
  readonly resource: string;

  /** Lock type */
  readonly lockType: "READ" | "WRITE" | "EXCLUSIVE";
}

// ===== VALIDATION INTEGRATION INTERFACES =====

/**
 * PARLANT transaction validation request
 */
export interface ParlantTransactionValidationRequest
  extends ParlantValidationRequest {
  /** Transaction metadata */
  readonly transaction: TransactionMetadata;

  /** Operations to validate */
  readonly operations: TransactionOperation[];

  /** Validation scope */
  readonly validationScope: "TRANSACTION" | "OPERATION" | "BATCH";

  /** Risk assessment */
  readonly riskAssessment: TransactionRiskAssessment;
}

/**
 * Transaction risk assessment
 */
export interface TransactionRiskAssessment {
  /** Overall risk level */
  readonly riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  /** Risk factors identified */
  readonly riskFactors: string[];

  /** Potential impact assessment */
  readonly potentialImpact: string[];

  /** Mitigation strategies */
  readonly mitigationStrategies: string[];

  /** Requires elevated approval */
  readonly requiresElevatedApproval: boolean;
}

/**
 * PARLANT transaction validation response
 */
export interface ParlantTransactionValidationResponse
  extends ParlantValidationResponse {
  /** Transaction-specific constraints */
  readonly transactionConstraints?: TransactionConstraints;

  /** Approved operations */
  readonly approvedOperations: string[];

  /** Rejected operations */
  readonly rejectedOperations: string[];

  /** Conditional approvals */
  readonly conditionalApprovals: ConditionalApproval[];
}

/**
 * Transaction constraints from PARLANT validation
 */
export interface TransactionConstraints {
  /** Maximum execution time allowed */
  readonly maxExecutionTime: number;

  /** Required checkpoints */
  readonly requiredCheckpoints: string[];

  /** Monitoring requirements */
  readonly monitoringRequirements: string[];

  /** Additional security measures */
  readonly additionalSecurityMeasures: string[];
}

/**
 * Conditional approval information
 */
export interface ConditionalApproval {
  /** Operation ID */
  readonly operationId: string;

  /** Conditions that must be met */
  readonly conditions: string[];

  /** Timeout for condition fulfillment */
  readonly conditionTimeout: number;

  /** Fallback action if conditions not met */
  readonly fallbackAction: "REJECT" | "DEFER" | "REQUEST_APPROVAL";
}
