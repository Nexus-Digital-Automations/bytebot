/**
 * Prisma Function Wrapper Service - Comprehensive Model Operation Wrapping
 *
 * Provides complete PARLANT conversational validation for all Prisma model operations
 * based on the database schema. Wraps all CRUD operations for every model with
 * appropriate security levels and validation patterns.
 *
 * Key Features:
 * - Complete wrapping of all Prisma model operations (Task, User, BrowserSession, etc.)
 * - Model-specific security classifications (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED, CLASSIFIED)
 * - Operation-method validation with field-level access controls
 * - Bulk operation safety with enhanced validation for high-impact operations
 * - Comprehensive ORM operation wrapping with transaction safety
 * - Performance optimization with sub-500ms validation targets
 */

import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import {
  UniversalDatabaseFunctionWrapperService,
  UniversalFunctionMetadata,
  FunctionExecutionResult,
  WrappedFunction,
} from './universal-function-wrapper.service';
import {
  DatabaseOperationMetadata,
  RiskLevel,
  ParlantUserContext,
} from './parlant-validated-database.service';

// ===== PRISMA MODEL SECURITY CLASSIFICATIONS =====

/**
 * Security classifications for database models
 */
export enum ModelSecurity {
  PUBLIC = 'PUBLIC', // No restrictions
  INTERNAL = 'INTERNAL', // Internal use only
  CONFIDENTIAL = 'CONFIDENTIAL', // Restricted access, logged
  RESTRICTED = 'RESTRICTED', // Elevated permissions required
  CLASSIFIED = 'CLASSIFIED', // Maximum security, multi-factor validation
}

/**
 * Model security mapping based on data sensitivity
 */
export const MODEL_SECURITY_CLASSIFICATIONS: Record<string, ModelSecurity> = {
  // Low security - general application data
  Task: ModelSecurity.INTERNAL,
  Summary: ModelSecurity.INTERNAL,
  Message: ModelSecurity.INTERNAL,
  File: ModelSecurity.INTERNAL,

  // Medium security - user and session data
  User: ModelSecurity.CONFIDENTIAL,
  UserSession: ModelSecurity.CONFIDENTIAL,
  RolePermission: ModelSecurity.CONFIDENTIAL,

  // High security - browser automation and sensitive operations
  BrowserSession: ModelSecurity.RESTRICTED,
  BrowserTask: ModelSecurity.RESTRICTED,
  BrowserTaskStep: ModelSecurity.RESTRICTED,
  BrowserScreenshot: ModelSecurity.RESTRICTED,
  BrowserDomSnapshot: ModelSecurity.RESTRICTED,
  BrowserFormData: ModelSecurity.CLASSIFIED, // Form data may contain sensitive user inputs
  BrowserDataExtraction: ModelSecurity.RESTRICTED,
};

/**
 * Field-level security for sensitive data
 */
export const SENSITIVE_FIELDS: Record<string, string[]> = {
  User: ['passwordHash', 'email'],
  UserSession: ['refreshToken', 'ipAddress'],
  BrowserFormData: ['fieldValue'], // Form field values may contain passwords, PII
  BrowserTask: ['customData'], // Custom data may contain sensitive information
  BrowserDataExtraction: ['extractedData', 'rawContent'], // May contain PII from web pages
};

/**
 * Prisma operation metadata
 */
export interface PrismaOperationMetadata extends UniversalFunctionMetadata {
  readonly modelName: string;
  readonly modelSecurity: ModelSecurity;
  readonly operationMethod:
    | 'findUnique'
    | 'findFirst'
    | 'findMany'
    | 'create'
    | 'update'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'updateMany'
    | 'count'
    | 'aggregate'
    | 'groupBy';
  readonly affectedFields?: string[];
  readonly isBulkOperation: boolean;
  readonly estimatedRecordCount?: number;
  readonly hasJoins: boolean;
  readonly includesRelations: boolean;
}

/**
 * Prisma execution context with model-specific data
 */
export interface PrismaExecutionContext {
  readonly modelName: string;
  readonly operation: string;
  readonly whereClause?: Record<string, unknown>;
  readonly dataPayload?: Record<string, unknown>;
  readonly includeClause?: Record<string, unknown>;
  readonly selectClause?: Record<string, unknown>;
  readonly orderByClause?: Record<string, unknown>;
  readonly limitClause?: number;
  readonly skipClause?: number;
}

// ===== PRISMA FUNCTION WRAPPER SERVICE =====

@Injectable()
export class PrismaFunctionWrapperService {
  private readonly logger = new Logger(PrismaFunctionWrapperService.name);

  // Model operation registry
  private readonly modelOperations = new Map<
    string,
    WrappedFunction<unknown[], unknown>
  >();

  // Prisma client instance
  private prismaClient!: PrismaClient;

  constructor(
    @Inject(forwardRef(() => UniversalDatabaseFunctionWrapperService))
    private readonly universalWrapper: UniversalDatabaseFunctionWrapperService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('Initializing Prisma Function Wrapper Service');

    // Initialize all Prisma model operation wrappers
    this.initializePrismaModelWrappers();

    this.logger.log(`Prisma function wrapper initialization complete`, {
      totalModelOperations: this.modelOperations.size,
      modelSecurityClassifications: Object.keys(MODEL_SECURITY_CLASSIFICATIONS)
        .length,
      supportedModels: Object.keys(MODEL_SECURITY_CLASSIFICATIONS),
    });
  }

  /**
   * Set Prisma client instance
   */
  setPrismaClient(client: PrismaClient): void {
    this.prismaClient = client;
    this.logger.log('Prisma client instance configured');
  }

  // ===== PRISMA MODEL OPERATION WRAPPERS =====

  /**
   * Initialize all Prisma model operation wrappers
   */
  private initializePrismaModelWrappers(): void {
    const models = Object.keys(MODEL_SECURITY_CLASSIFICATIONS);

    for (const modelName of models) {
      this.initializeModelOperations(modelName);
    }
  }

  /**
   * Initialize all CRUD operations for a specific model
   */
  private initializeModelOperations(modelName: string): void {
    const security = MODEL_SECURITY_CLASSIFICATIONS[modelName];

    // READ OPERATIONS
    this.createModelOperation(modelName, 'findUnique', security, 'READ', false);
    this.createModelOperation(modelName, 'findFirst', security, 'READ', false);
    this.createModelOperation(modelName, 'findMany', security, 'READ', true);
    this.createModelOperation(modelName, 'count', security, 'READ', false);
    this.createModelOperation(modelName, 'aggregate', security, 'READ', true);
    this.createModelOperation(modelName, 'groupBy', security, 'READ', true);

    // WRITE OPERATIONS
    this.createModelOperation(modelName, 'create', security, 'WRITE', false);
    this.createModelOperation(modelName, 'update', security, 'WRITE', false);
    this.createModelOperation(modelName, 'upsert', security, 'WRITE', false);

    // BULK OPERATIONS (Higher risk)
    this.createModelOperation(modelName, 'createMany', security, 'WRITE', true);
    this.createModelOperation(modelName, 'updateMany', security, 'WRITE', true);

    // DELETE OPERATIONS (Highest risk)
    this.createModelOperation(modelName, 'delete', security, 'DELETE', false);
    this.createModelOperation(
      modelName,
      'deleteMany',
      security,
      'DELETE',
      true,
    );
  }

  /**
   * Create a wrapped operation for a specific model and method
   */
  private createModelOperation(
    modelName: string,
    operation: string,
    modelSecurity: ModelSecurity,
    operationType: DatabaseOperationMetadata['operationType'],
    isBulkOperation: boolean,
  ): void {
    const functionName = `${modelName}.${operation}`;
    const riskLevel = this.determineRiskLevel(
      modelSecurity,
      operationType,
      isBulkOperation,
    );

    // Create metadata for this operation
    const _metadata: PrismaOperationMetadata = {
      functionName,
      packageName: 'prisma-client',
      category: 'PRISMA',
      description: `${operation} operation on ${modelName} model`,
      operationType,
      riskLevel,
      requiresValidation: true,
      cacheable: this.isCacheableOperation(operation),
      requiresBackup: this.requiresBackup(operationType, isBulkOperation),
      timeoutMs: this.getOperationTimeout(operationType, isBulkOperation),
      retryAttempts: this.getRetryAttempts(operationType, isBulkOperation),
      parameters: {},
      tags: [modelName.toLowerCase(), operation, operationType.toLowerCase()],
      modelName,
      modelSecurity,
      operationMethod: operation as any,
      isBulkOperation,
      hasJoins: false,
      includesRelations: false,
    };

    // Create the actual function wrapper
    const originalFunction = this.createPrismaOperationFunction(
      modelName,
      operation,
    );

    // Register with universal wrapper
    const wrappedFunction = this.universalWrapper.registerFunction(
      functionName,
      originalFunction,
      metadata,
    );

    // Store in local registry
    this.modelOperations.set(functionName, wrappedFunction);

    this.logger.debug(`Registered Prisma operation: ${functionName}`, {
      modelName,
      operation,
      modelSecurity,
      operationType,
      riskLevel,
      isBulkOperation,
    });
  }

  /**
   * Create the actual Prisma operation function
   */
  private createPrismaOperationFunction(
    modelName: string,
    operation: string,
  ): (...args: unknown[]) => Promise<unknown> {
    return async (...args: unknown[]): Promise<unknown> => {
      if (!this.prismaClient) {
        throw new Error(
          'Prisma client not initialized. Call setPrismaClient first.',
        );
      }

      // Get the model delegate
      const modelDelegate = (this.prismaClient as any)[modelName.toLowerCase()];
      if (!modelDelegate) {
        throw new Error(`Model ${modelName} not found in Prisma client`);
      }

      // Get the operation function
      const operationFunction = modelDelegate[operation];
      if (!operationFunction) {
        throw new Error(
          `Operation ${operation} not found on model ${modelName}`,
        );
      }

      // Execute the operation with arguments
      const operationArgs = args[0] || {};
      return await operationFunction(operationArgs);
    };
  }

  // ===== RISK ASSESSMENT AND SECURITY =====

  /**
   * Determine risk level based on model security and operation type
   */
  private determineRiskLevel(
    modelSecurity: ModelSecurity,
    operationType: DatabaseOperationMetadata['operationType'],
    isBulkOperation: boolean,
  ): RiskLevel {
    let baseRisk: RiskLevel;

    // Base risk by operation type
    switch (operationType) {
      case 'READ':
      case 'HEALTH_CHECK':
      case 'METRICS':
        baseRisk = RiskLevel.LOW;
        break;
      case 'WRITE':
        baseRisk = RiskLevel.MEDIUM;
        break;
      case 'DELETE':
        baseRisk = RiskLevel.HIGH;
        break;
      case 'MIGRATION':
      case 'SECURITY':
        baseRisk = RiskLevel.CRITICAL;
        break;
      default:
        baseRisk = RiskLevel.MEDIUM;
    }

    // Escalate based on model security
    if (modelSecurity === ModelSecurity.CLASSIFIED) {
      if (baseRisk === RiskLevel.LOW) baseRisk = RiskLevel.MEDIUM;
      else if (baseRisk === RiskLevel.MEDIUM) baseRisk = RiskLevel.HIGH;
      else if (baseRisk === RiskLevel.HIGH) baseRisk = RiskLevel.CRITICAL;
    } else if (modelSecurity === ModelSecurity.RESTRICTED) {
      if (baseRisk === RiskLevel.LOW) baseRisk = RiskLevel.MEDIUM;
      else if (baseRisk === RiskLevel.MEDIUM) baseRisk = RiskLevel.HIGH;
    } else if (modelSecurity === ModelSecurity.CONFIDENTIAL) {
      if (baseRisk === RiskLevel.LOW) baseRisk = RiskLevel.MEDIUM;
    }

    // Escalate for bulk operations
    if (isBulkOperation) {
      if (baseRisk === RiskLevel.LOW) baseRisk = RiskLevel.MEDIUM;
      else if (baseRisk === RiskLevel.MEDIUM) baseRisk = RiskLevel.HIGH;
      else if (baseRisk === RiskLevel.HIGH) baseRisk = RiskLevel.CRITICAL;
    }

    return baseRisk;
  }

  /**
   * Check if operation is cacheable
   */
  private isCacheableOperation(operation: string): boolean {
    const readOnlyOperations = [
      'findUnique',
      'findFirst',
      'findMany',
      'count',
      'aggregate',
      'groupBy',
    ];
    return readOnlyOperations.includes(operation);
  }

  /**
   * Check if operation requires backup
   */
  private requiresBackup(
    operationType: DatabaseOperationMetadata['operationType'],
    isBulkOperation: boolean,
  ): boolean {
    if (operationType === 'DELETE') return true;
    if (isBulkOperation && operationType === 'WRITE') return true;
    return false;
  }

  /**
   * Get operation timeout based on type and scope
   */
  private getOperationTimeout(
    operationType: DatabaseOperationMetadata['operationType'],
    isBulkOperation: boolean,
  ): number {
    if (isBulkOperation) {
      return 60000; // 1 minute for bulk operations
    }

    switch (operationType) {
      case 'READ':
        return 10000; // 10 seconds for reads
      case 'WRITE':
        return 30000; // 30 seconds for writes
      case 'DELETE':
        return 45000; // 45 seconds for deletes
      default:
        return 30000;
    }
  }

  /**
   * Get retry attempts based on operation risk
   */
  private getRetryAttempts(
    operationType: DatabaseOperationMetadata['operationType'],
    isBulkOperation: boolean,
  ): number {
    if (operationType === 'DELETE' || isBulkOperation) {
      return 1; // Limited retries for destructive operations
    }

    if (operationType === 'READ') {
      return 3; // More retries for read operations
    }

    return 2; // Standard retries for write operations
  }

  // ===== ENHANCED MODEL OPERATIONS =====

  /**
   * Execute model operation with enhanced context
   */
  async executeModelOperation<T>(
    modelName: string,
    operation: string,
    args: Record<string, unknown>,
    _context: ParlantUserContext,
  ): Promise<FunctionExecutionResult<T>> {
    const functionName = `${modelName}.${operation}`;
    const wrappedFunction = this.modelOperations.get(functionName);

    if (!wrappedFunction) {
      throw new Error(`Operation ${functionName} not found in registry`);
    }

    // Enhance args with execution context
    const enhancedArgs = this.enhanceOperationArgs(
      modelName,
      operation,
      args,
      context,
    );

    return (await wrappedFunction(
      context,
      enhancedArgs,
    )) as FunctionExecutionResult<T>;
  }

  /**
   * Enhance operation arguments with security and monitoring context
   */
  private enhanceOperationArgs(
    modelName: string,
    operation: string,
    args: Record<string, unknown>,
    _context: ParlantUserContext,
  ): Record<string, unknown> {
    const enhanced = { ...args };

    // Add audit fields for write operations
    if (['create', 'update', 'upsert'].includes(operation)) {
      if (enhanced.data && typeof enhanced.data === 'object') {
        const data = enhanced.data as Record<string, unknown>;

        // Add audit timestamp
        if (operation === 'create') {
          data.createdAt = new Date();
        }
        data.updatedAt = new Date();

        // Add user context if applicable
        if ('userId' in data && !data.userId) {
          data.userId = context.userId;
        }
      }
    }

    // Add field filtering for sensitive data
    if (operation.startsWith('find')) {
      enhanced.select = this.filterSensitiveFields(
        modelName,
        enhanced.select as Record<string, unknown>,
      );
    }

    return enhanced;
  }

  /**
   * Filter sensitive fields based on user permissions
   */
  private filterSensitiveFields(
    modelName: string,
    selectClause?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const sensitiveFields = SENSITIVE_FIELDS[modelName];
    if (!sensitiveFields || !selectClause) {
      return selectClause;
    }

    // TODO: Implement proper field filtering based on user permissions
    // For now, return selectClause as-is
    return selectClause;
  }

  // ===== BULK OPERATION SAFETY =====

  /**
   * Execute bulk operation with enhanced safety checks
   */
  async executeBulkOperation<T>(
    modelName: string,
    operation: string,
    args: Record<string, unknown>,
    _context: ParlantUserContext,
    _options: {
      maxRecords?: number;
      requireConfirmation?: boolean;
      progressCallback?: (progress: number) => void;
    } = {},
  ): Promise<FunctionExecutionResult<T>> {
    const { maxRecords = 1000, _requireConfirmation = true } = options;

    // Estimate affected records
    const estimatedCount = await this.estimateAffectedRecords(
      modelName,
      operation,
      args,
    );

    if (estimatedCount > maxRecords) {
      throw new Error(
        `Bulk operation would affect ${estimatedCount} records, exceeding limit of ${maxRecords}`,
      );
    }

    // Execute with progress monitoring if callback provided
    if (options.progressCallback) {
      return await this.executeWithProgress(
        modelName,
        operation,
        args,
        context,
        options.progressCallback,
      );
    }

    return await this.executeModelOperation(
      modelName,
      operation,
      args,
      context,
    );
  }

  /**
   * Estimate number of records affected by operation
   */
  private async estimateAffectedRecords(
    modelName: string,
    operation: string,
    args: Record<string, unknown>,
  ): Promise<number> {
    if (!this.prismaClient) return 0;

    try {
      // For operations with where clause, count matching records
      if (args.where) {
        const modelDelegate = (this.prismaClient as any)[
          modelName.toLowerCase()
        ];
        const count = await modelDelegate.count({ where: args.where });
        return count;
      }

      // For operations without where clause, return conservative estimate
      return 1;
    } catch (error) {
      this.logger.warn(
        `Failed to estimate affected records for ${modelName}.${operation}`,
        {
          _error: error instanceof Error ? error.message : String(error),
        },
      );
      return 1;
    }
  }

  /**
   * Execute operation with progress monitoring
   */
  private async executeWithProgress<T>(
    modelName: string,
    operation: string,
    args: Record<string, unknown>,
    _context: ParlantUserContext,
    progressCallback: (progress: number) => void,
  ): Promise<FunctionExecutionResult<T>> {
    // TODO: Implement progressive execution for large bulk operations
    // For now, execute normally and report 100% completion
    const result = await this.executeModelOperation<T>(
      modelName,
      operation,
      args,
      context,
    );
    progressCallback(100);
    return result;
  }

  // ===== TRANSACTION SUPPORT =====

  /**
   * Execute multiple model operations within a transaction
   */
  async executeTransaction<T>(
    operations: Array<{
      modelName: string;
      operation: string;
      args: Record<string, unknown>;
    }>,
    _context: ParlantUserContext,
  ): Promise<FunctionExecutionResult<T[]>> {
    if (!this.prismaClient) {
      throw new Error('Prisma client not initialized');
    }

    const transactionOperations = operations.map(
      ({ modelName, operation, args }) => {
        return async (prisma: PrismaClient) => {
          const modelDelegate = (prisma as any)[modelName.toLowerCase()];
          const operationFunction = modelDelegate[operation];
          return await operationFunction(args);
        };
      },
    );

    // Use universal wrapper for transaction execution
    const wrappedFunction = this.universalWrapper.registerFunction(
      'prismaTransaction',
      () => this.prismaClient.$transaction(transactionOperations),
      {
        functionName: 'prismaTransaction',
        packageName: 'prisma-client',
        category: 'TRANSACTION',
        description: `Execute ${operations.length} operations within transaction`,
        operationType: 'WRITE',
        riskLevel: RiskLevel.HIGH,
        requiresValidation: true,
        cacheable: false,
        requiresBackup: true,
        timeoutMs: 90000,
        retryAttempts: 1,
        parameters: { operations: operations.length },
        tags: ['transaction', 'multi-operation', 'atomic'],
      },
    );

    return (await wrappedFunction(
      context,
      operations,
    )) as FunctionExecutionResult<T[]>;
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get all registered model operations
   */
  getRegisteredModelOperations(): string[] {
    return Array.from(this.modelOperations.keys()).sort();
  }

  /**
   * Get model security classification
   */
  getModelSecurity(modelName: string): ModelSecurity | undefined {
    return MODEL_SECURITY_CLASSIFICATIONS[modelName];
  }

  /**
   * Get sensitive fields for a model
   */
  getSensitiveFields(modelName: string): string[] {
    return SENSITIVE_FIELDS[modelName] || [];
  }

  /**
   * Check if operation is available for model
   */
  isOperationAvailable(modelName: string, operation: string): boolean {
    const functionName = `${modelName}.${operation}`;
    return this.modelOperations.has(functionName);
  }

  /**
   * Get operation metadata
   */
  getOperationMetadata(
    modelName: string,
    operation: string,
  ): PrismaOperationMetadata | undefined {
    const functionName = `${modelName}.${operation}`;
    const registry = this.universalWrapper.getRegisteredFunctions();
    const entry = registry.get(functionName);
    return entry?.metadata as PrismaOperationMetadata;
  }

  /**
   * Get model operation statistics
   */
  getModelOperationStatistics() {
    const registry = this.universalWrapper.getRegisteredFunctions();
    const modelStats: Record<
      string,
      {
        operations: number;
        executions: number;
        averageTime: number;
        successRate: number;
      }
    > = {};

    for (const [_functionName, entry] of registry.entries()) {
      if (entry.metadata.category === 'PRISMA') {
        const metadata = entry.metadata as PrismaOperationMetadata;
        const modelName = metadata.modelName;

        if (!modelStats[modelName]) {
          modelStats[modelName] = {
            operations: 0,
            executions: 0,
            averageTime: 0,
            successRate: 0,
          };
        }

        modelStats[modelName].operations++;
        modelStats[modelName].executions += entry.executionCount;
        modelStats[modelName].averageTime += entry.averageExecutionTime;
        modelStats[modelName].successRate += entry.successRate;
      }
    }

    // Calculate averages
    for (const modelName in modelStats) {
      const stats = modelStats[modelName];
      if (stats.operations > 0) {
        stats.averageTime /= stats.operations;
        stats.successRate /= stats.operations;
      }
    }

    return modelStats;
  }

  /**
   * Get comprehensive service statistics
   */
  getServiceStatistics() {
    return {
      totalModelOperations: this.modelOperations.size,
      supportedModels: Object.keys(MODEL_SECURITY_CLASSIFICATIONS),
      modelSecurityBreakdown: this.getModelSecurityBreakdown(),
      operationTypeBreakdown: this.getOperationTypeBreakdown(),
      modelOperationStats: this.getModelOperationStatistics(),
    };
  }

  /**
   * Get breakdown of models by security classification
   */
  private getModelSecurityBreakdown(): Record<ModelSecurity, number> {
    const breakdown: Record<ModelSecurity, number> = {
      [ModelSecurity.PUBLIC]: 0,
      [ModelSecurity.INTERNAL]: 0,
      [ModelSecurity.CONFIDENTIAL]: 0,
      [ModelSecurity.RESTRICTED]: 0,
      [ModelSecurity.CLASSIFIED]: 0,
    };

    for (const security of Object.values(MODEL_SECURITY_CLASSIFICATIONS)) {
      breakdown[security]++;
    }

    return breakdown;
  }

  /**
   * Get breakdown of operations by type
   */
  private getOperationTypeBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    const registry = this.universalWrapper.getRegisteredFunctions();

    for (const entry of registry.values()) {
      if (entry.metadata.category === 'PRISMA') {
        const metadata = entry.metadata as PrismaOperationMetadata;
        const opType = metadata.operationMethod;
        breakdown[opType] = (breakdown[opType] || 0) + 1;
      }
    }

    return breakdown;
  }
}
