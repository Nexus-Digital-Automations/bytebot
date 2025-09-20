/**
 * Database Module - Conversational Validation System
 *
 * Comprehensive export file for the conversational database validation system.
 * Provides access to all database services, repositories, types, and utilities
 * with conversational AI validation, risk assessment, and audit capabilities.
 *
 * Features:
 * - ConversationalDatabaseService for universal database validation
 * - Repository pattern with conversational validation
 * - Risk-based approval workflows
 * - Backup and audit trail management
 * - Performance optimization with caching
 * - Multi-party approval for critical operations
 *
 * @author Claude Code - Database Module Index
 * @version 1.0.0
 */

// ===== CORE SERVICES =====

// Import for local use in utility functions
import {
  ConversationalDatabaseService,
  DatabaseOperationType,
  DatabaseRiskLevel,
  type DatabaseOperationContext as _DatabaseOperationContext,
  type DatabaseValidationResult as _DatabaseValidationResult,
  type DatabaseBackupInfo as _DatabaseBackupInfo,
  type MultiPartyApprovalRequest as _MultiPartyApprovalRequest,
} from './conversational-database.service';
import { DatabaseModule } from './database.module';
import { BaseConversationalRepositoryService } from './repositories/base-conversational-repository.service';
import { UserConversationalRepositoryService } from './repositories/user-conversational-repository.service';

// Re-export for external consumption
export { ConversationalDatabaseService } from './conversational-database.service';
export { DatabaseModule } from './database.module';

// ===== TYPES AND ENUMS =====
export {
  DatabaseOperationType,
  DatabaseRiskLevel,
  type DatabaseOperationContext,
  type DatabaseValidationResult,
  type DatabaseBackupInfo,
  type MultiPartyApprovalRequest,
} from './conversational-database.service';

// ===== REPOSITORY SERVICES =====
export { BaseConversationalRepositoryService } from './repositories/base-conversational-repository.service';
export { UserConversationalRepositoryService } from './repositories/user-conversational-repository.service';
export {
  type RepositoryOperationContext,
  type BusinessValidationResult,
} from './repositories/base-conversational-repository.service';
export {
  type UserOperationContext,
} from './repositories/user-conversational-repository.service';

// ===== EXAMPLES AND INTEGRATION =====
export {
  ExampleUserManagementService,
  ConversationalDatabaseUsageExamples,
  ConversationalDatabaseExampleModule,
} from './examples/conversational-database-integration.example';

// ===== TYPE DEFINITIONS AND UTILITIES =====

/**
 * Standard operation context for all database operations
 */
export interface StandardOperationContext {
  userId?: string;
  userRole?: string;
  businessPurpose?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Database health information
 */
export interface DatabaseHealthInfo {
  metrics: {
    totalOperations: number;
    approvedOperations: number;
    rejectedOperations: number;
    averageValidationTime: number;
    cacheHitRate: number;
  };
  cacheStatus: {
    size: number;
    hitRate: number;
  };
  backupStatus: {
    totalBackups: number;
    backupsCreated: number;
  };
}

/**
 * Conversational validation configuration
 */
export interface ConversationalValidationConfig {
  enableCaching: boolean;
  cacheExpirationMinutes: number;
  backupRetentionDays: number;
  requireMultiPartyApproval: boolean;
  enableAuditTrail: boolean;
  performanceOptimization: boolean;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Create a standard operation context with defaults
 */
export function createOperationContext(
  userId: string,
  userRole: string,
  businessPurpose: string,
  additional?: Partial<StandardOperationContext>,
): StandardOperationContext {
  return {
    userId,
    userRole,
    businessPurpose,
    sessionId: additional?.sessionId ?? `session_${Date.now()}`,correlationId: additional?.correlationId ?? `op_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    metadata: additional?.metadata ?? {},
    ...additional,
  };
}

/**
 * Check if operation requires high-level approval
 */
export function requiresHighLevelApproval(
  operationType: DatabaseOperationType,
  riskLevel: DatabaseRiskLevel,
): boolean {
  // Critical risk operations always require high-level approval
  if (riskLevel === DatabaseRiskLevel.CRITICAL) {
    return true;
  }

  // Specific operations that require approval regardless of computed risk
  const highRiskOperations = [
    DatabaseOperationType.DELETE,
    DatabaseOperationType.BULK_DELETE,
    DatabaseOperationType.TRUNCATE,
    DatabaseOperationType.DROP_TABLE,
    DatabaseOperationType.ALTER_SCHEMA,
    DatabaseOperationType.MIGRATION,
  ];

  return highRiskOperations.includes(operationType);
}

/**
 * Get recommended backup retention days for operation
 */
export function getRecommendedBackupRetention(
  operationType: DatabaseOperationType,
  riskLevel: DatabaseRiskLevel,
): number {
  switch (riskLevel) {
    case DatabaseRiskLevel.LOW:
      return 7; // 1 week
    case DatabaseRiskLevel.MEDIUM:
      return 30; // 1 month
    case DatabaseRiskLevel.HIGH:
      return 90; // 3 months
    case DatabaseRiskLevel.CRITICAL:
      return 365; // 1 year
    default:
      return 30; // Default to 1 month
  }
}

/**
 * Create default validation configuration
 */
export function createDefaultValidationConfig(): ConversationalValidationConfig {
  return {
    enableCaching: true,
    cacheExpirationMinutes: 5,
    backupRetentionDays: 30,
    requireMultiPartyApproval: true,
    enableAuditTrail: true,
    performanceOptimization: true,
  };
}

/**
 * Sanitize operation data for logging (remove sensitive information)
 */
export function sanitizeOperationData(data: unknown): unknown {
  if (!data || typeof data !== 'object') {return data;}

  const sensitiveFields = [
    'password','passwordHash','token','secret','key','apiKey','accessToken','refreshToken','sessionToken','authToken','privateKey','publicKey','salt','hash',];const sanitized = { ...data as Record<string, unknown> };

  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';} else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {sanitized[key] = sanitizeOperationData(sanitized[key]);}
  });

  return sanitized;
}

/**
 * Validate operation context completeness
 */
export function validateOperationContext(context: StandardOperationContext): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!context.userId) {
    errors.push('userId is required');}if (!context.userRole) {
    errors.push('userRole is required');}if (!context.businessPurpose) {
    errors.push('businessPurpose is required');}// Warnings for missing optional fields
  if (!context.sessionId) {
    warnings.push('sessionId not provided - using generated value');}if (!context.correlationId) {
    warnings.push('correlationId not provided - using generated value');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ===== DEFAULT EXPORT =====

/**
 * Default export with commonly used services and utilities
 */
export default {
  ConversationalDatabaseService,
  DatabaseModule,
  BaseConversationalRepositoryService,
  UserConversationalRepositoryService,
  DatabaseOperationType,
  DatabaseRiskLevel,
  createOperationContext,
  requiresHighLevelApproval,
  getRecommendedBackupRetention,
  createDefaultValidationConfig,
  sanitizeOperationData,
  validateOperationContext,
} as const;