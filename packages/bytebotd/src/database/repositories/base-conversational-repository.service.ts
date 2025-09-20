/**
 * Base Conversational Repository Service
 *
 * Abstract base class that provides conversational validation for repository operations.
 * All entity-specific repositories should extend this class to inherit conversational
 * validation, audit trails, and risk-based approval workflows.
 *
 * Features:
 * - Generic repository operations with conversational validation
 * - Entity-specific business logic validation
 * - Automated backup creation for write operations
 * - Comprehensive audit trails with conversation context
 * - Performance optimization with intelligent caching
 * - Type-safe operations with strict TypeScript enforcement
 *
 * @author Claude Code - Repository Pattern Specialist
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConversationalDatabaseService } from '../conversational-database.service';
import {
  BaseEntity,
  Repository,
  QueryOptions,
  Optional,
  StrictRecord,
} from '../../types/index';

/**
 * Context for repository operations
 */
export interface RepositoryOperationContext {
  userId?: string;
  userRole?: string;
  businessPurpose?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: StrictRecord<unknown>;
}

/**
 * Business validation result
 */
export interface BusinessValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Abstract base repository with conversational validation
 */
@Injectable()
export abstract class BaseConversationalRepositoryService<T extends BaseEntity> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly conversationalDbService: ConversationalDatabaseService,
    protected readonly baseRepository: Repository<T>,
  ) {}

  // ===== ABSTRACT METHODS TO BE IMPLEMENTED BY SUBCLASSES =====

  /**
   * Get entity type name for validation context
   */
  protected abstract getEntityType(): string;

  /**
   * Validate business rules before operations
   */
  protected abstract validateBusinessRules(
    operation: string,
    data: Partial<T>,
    context?: RepositoryOperationContext,
  ): Promise<BusinessValidationResult>;

  /**
   * Transform entity before returning to caller
   */
  protected abstract transformEntity(entity: T, context?: RepositoryOperationContext): Promise<T>;

  // ===== PUBLIC REPOSITORY METHODS =====

  /**
   * Find entity by ID with conversational validation
   */
  async findById(
    id: string,
    context?: RepositoryOperationContext,
  ): Promise<Optional<T>> {
    const operationContext = this.buildContext('findById', context);

    this.logger.debug(`[${operationContext.correlationId}] Finding ${this.getEntityType()} by ID: ${id}`);

    try {
      const entity = await this.conversationalDbService.findById(
        this.baseRepository,
        id,
        operationContext,
      );

      if (entity) {
        const transformedEntity = await this.transformEntity(entity, context);
        this.logOperation('findById', { id }, true, operationContext);
        return transformedEntity;
      }

      this.logOperation('findById', { id }, false, operationContext, 'Entity not found');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to find ${this.getEntityType()} by ID: ${errorMessage}`, {
        id,
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  /**
   * Find all entities with conversational validation
   */
  async findAll(
    options?: QueryOptions,
    context?: RepositoryOperationContext,
  ): Promise<readonly T[]> {
    const operationContext = this.buildContext('findAll', context);

    this.logger.debug(`[${operationContext.correlationId}] Finding all ${this.getEntityType()} entities`, {
      options,
      context: operationContext,
    });

    try {
      const entities = await this.conversationalDbService.findAll(
        this.baseRepository,
        options,
        operationContext,
      );

      const transformedEntities = await Promise.all(
        entities.map(entity => this.transformEntity(entity, context))
      );

      this.logOperation('findAll', { options }, true, operationContext, `Found ${entities.length} entities`);
      return transformedEntities;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to find all ${this.getEntityType()} entities: ${errorMessage}`, {
        options,
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  /**
   * Create entity with business validation and conversational approval
   */
  async create(
    data: Omit<T, keyof BaseEntity>,
    context?: RepositoryOperationContext,
  ): Promise<T> {
    const operationContext = this.buildContext('create', context);

    this.logger.debug(`[${operationContext.correlationId}] Creating ${this.getEntityType()} entity`, {
      data: this.sanitizeLogData(data),
      context: operationContext,
    });

    try {
      // Validate business rules first
      const businessValidation = await this.validateBusinessRules('create', data, context);
      if (!businessValidation.valid) {
        const errors = businessValidation.errors.join(', ');
        this.logger.warn(`[${operationContext.correlationId}] Business validation failed for ${this.getEntityType()} creation: ${errors}`);
        throw new Error(`Business validation failed: ${errors}`);
      }

      // Log warnings if any
      if (businessValidation.warnings.length > 0) {
        this.logger.warn(`[${operationContext.correlationId}] Business validation warnings for ${this.getEntityType()}: ${businessValidation.warnings.join(', ')}`);
      }

      // Execute conversational database operation
      const entity = await this.conversationalDbService.create(
        this.baseRepository,
        data,
        {
          ...operationContext,
          businessPurpose: operationContext.businessPurpose ?? `Create new ${this.getEntityType()}`,
        },
      );

      const transformedEntity = await this.transformEntity(entity, context);

      this.logOperation('create', { entityId: entity.id }, true, operationContext);
      return transformedEntity;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to create ${this.getEntityType()} entity: ${errorMessage}`, {
        data: this.sanitizeLogData(data),
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  /**
   * Update entity with business validation and conversational approval
   */
  async update(
    id: string,
    data: Partial<T>,
    context?: RepositoryOperationContext,
  ): Promise<Optional<T>> {
    const operationContext = this.buildContext('update', context);

    this.logger.debug(`[${operationContext.correlationId}] Updating ${this.getEntityType()} entity: ${id}`, {
      data: this.sanitizeLogData(data),
      context: operationContext,
    });

    try {
      // Validate business rules first
      const businessValidation = await this.validateBusinessRules('update', data, context);
      if (!businessValidation.valid) {
        const errors = businessValidation.errors.join(', ');
        this.logger.warn(`[${operationContext.correlationId}] Business validation failed for ${this.getEntityType()} update: ${errors}`);
        throw new Error(`Business validation failed: ${errors}`);
      }

      // Log warnings if any
      if (businessValidation.warnings.length > 0) {
        this.logger.warn(`[${operationContext.correlationId}] Business validation warnings for ${this.getEntityType()}: ${businessValidation.warnings.join(', ')}`);
      }

      // Execute conversational database operation
      const entity = await this.conversationalDbService.update(
        this.baseRepository,
        id,
        data,
        {
          ...operationContext,
          businessPurpose: operationContext.businessPurpose ?? `Update ${this.getEntityType()} (${id})`,
        },
      );

      if (entity) {
        const transformedEntity = await this.transformEntity(entity, context);
        this.logOperation('update', { id, changes: Object.keys(data) }, true, operationContext);
        return transformedEntity;
      }

      this.logOperation('update', { id }, false, operationContext, 'Entity not found for update');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to update ${this.getEntityType()} entity: ${errorMessage}`, {
        id,
        data: this.sanitizeLogData(data),
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  /**
   * Delete entity with conversational approval and multi-step validation
   */
  async delete(
    id: string,
    context?: RepositoryOperationContext & { confirmDeletion?: boolean },
  ): Promise<boolean> {
    const operationContext = this.buildContext('delete', context);

    this.logger.debug(`[${operationContext.correlationId}] Deleting ${this.getEntityType()} entity: ${id}`, {
      confirmDeletion: context?.confirmDeletion,
      context: operationContext,
    });

    try {
      // Additional validation for delete operations
      const businessValidation = await this.validateBusinessRules('delete', { id } as Partial<T>, context);
      if (!businessValidation.valid) {
        const errors = businessValidation.errors.join(', ');
        this.logger.warn(`[${operationContext.correlationId}] Business validation failed for ${this.getEntityType()} deletion: ${errors}`);
        throw new Error(`Business validation failed: ${errors}`);
      }

      // Execute conversational database operation
      const success = await this.conversationalDbService.delete(
        this.baseRepository,
        id,
        {
          ...operationContext,
          businessPurpose: operationContext.businessPurpose ?? `Delete ${this.getEntityType()} (${id})`,
          confirmDeletion: context?.confirmDeletion,
        },
      );

      this.logOperation('delete', { id }, success, operationContext);
      return success;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to delete ${this.getEntityType()} entity: ${errorMessage}`, {
        id,
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  /**
   * Count entities with conversational validation
   */
  async count(
    filter?: Partial<T>,
    context?: RepositoryOperationContext,
  ): Promise<number> {
    const operationContext = this.buildContext('count', context);

    this.logger.debug(`[${operationContext.correlationId}] Counting ${this.getEntityType()} entities`, {
      filter: this.sanitizeLogData(filter),
      context: operationContext,
    });

    try {
      const count = await this.conversationalDbService.count(
        this.baseRepository,
        filter,
        operationContext,
      );

      this.logOperation('count', { filter }, true, operationContext, `Count: ${count}`);
      return count;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to count ${this.getEntityType()} entities: ${errorMessage}`, {
        filter: this.sanitizeLogData(filter),
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  // ===== BULK OPERATIONS =====

  /**
   * Bulk create entities with enhanced validation
   */
  async bulkCreate(
    dataArray: Array<Omit<T, keyof BaseEntity>>,
    context?: RepositoryOperationContext,
  ): Promise<T[]> {
    const operationContext = this.buildContext('bulkCreate', context);

    this.logger.debug(`[${operationContext.correlationId}] Bulk creating ${dataArray.length} ${this.getEntityType()} entities`, {
      count: dataArray.length,
      context: operationContext,
    });

    try {
      // Validate business rules for each entity
      for (let i = 0; i < dataArray.length; i++) {
        const businessValidation = await this.validateBusinessRules('create', dataArray[i], context);
        if (!businessValidation.valid) {
          const errors = businessValidation.errors.join(', ');
          throw new Error(`Business validation failed for entity ${i + 1}: ${errors}`);
        }
      }

      // Execute conversational bulk operation
      const entities = await this.conversationalDbService.bulkCreate(
        this.baseRepository,
        dataArray,
        {
          ...operationContext,
          businessPurpose: operationContext.businessPurpose ?? `Bulk create ${dataArray.length} ${this.getEntityType()} entities`,
        },
      );

      const transformedEntities = await Promise.all(
        entities.map(entity => this.transformEntity(entity, context))
      );

      this.logOperation('bulkCreate', { count: dataArray.length }, true, operationContext, `Created ${entities.length} entities`);
      return transformedEntities;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to bulk create ${this.getEntityType()} entities: ${errorMessage}`, {
        count: dataArray.length,
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  /**
   * Bulk delete entities with enhanced protection
   */
  async bulkDelete(
    filter: Partial<T>,
    context?: RepositoryOperationContext & { confirmBulkDeletion?: boolean },
  ): Promise<number> {
    const operationContext = this.buildContext('bulkDelete', context);

    this.logger.debug(`[${operationContext.correlationId}] Bulk deleting ${this.getEntityType()} entities`, {
      filter: this.sanitizeLogData(filter),
      confirmBulkDeletion: context?.confirmBulkDeletion,
      context: operationContext,
    });

    try {
      // Additional validation for bulk delete operations
      const businessValidation = await this.validateBusinessRules('bulkDelete', filter, context);
      if (!businessValidation.valid) {
        const errors = businessValidation.errors.join(', ');
        this.logger.warn(`[${operationContext.correlationId}] Business validation failed for ${this.getEntityType()} bulk deletion: ${errors}`);
        throw new Error(`Business validation failed: ${errors}`);
      }

      // Execute conversational bulk delete operation
      const deletedCount = await this.conversationalDbService.bulkDelete(
        this.baseRepository,
        filter,
        {
          ...operationContext,
          businessPurpose: operationContext.businessPurpose ?? `Bulk delete ${this.getEntityType()} entities`,
          confirmBulkDeletion: context?.confirmBulkDeletion,
        },
      );

      this.logOperation('bulkDelete', { filter, deletedCount }, true, operationContext, `Deleted ${deletedCount} entities`);
      return deletedCount;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationContext.correlationId}] Failed to bulk delete ${this.getEntityType()} entities: ${errorMessage}`, {
        filter: this.sanitizeLogData(filter),
        error: errorMessage,
        context: operationContext,
      });
      throw error;
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Build operation context with defaults
   */
  private buildContext(
    operation: string,
    context?: RepositoryOperationContext,
  ): RepositoryOperationContext & { correlationId: string } {
    return {
      userId: context?.userId ?? 'system',
      userRole: context?.userRole ?? 'service',
      businessPurpose: context?.businessPurpose,
      sessionId: context?.sessionId,
      correlationId: context?.correlationId ?? `${operation}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      metadata: context?.metadata ?? {},
    };
  }

  /**
   * Log repository operation with structured data
   */
  private logOperation(
    operation: string,
    operationData: StrictRecord<unknown>,
    success: boolean,
    context: RepositoryOperationContext & { correlationId: string },
    message?: string,
  ): void {
    const logData = {
      operation,
      entityType: this.getEntityType(),
      success,
      correlationId: context.correlationId,
      userId: context.userId,
      sessionId: context.sessionId,
      operationData: this.sanitizeLogData(operationData),
      message,
    };

    if (success) {
      this.logger.debug(`[${context.correlationId}] ${this.getEntityType()} ${operation} completed`, logData);
    } else {
      this.logger.warn(`[${context.correlationId}] ${this.getEntityType()} ${operation} failed`, logData);
    }
  }

  /**
   * Sanitize data for logging (remove sensitive fields)
   */
  private sanitizeLogData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
    const sanitized = { ...data as StrictRecord<unknown> };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  // ===== PUBLIC UTILITY METHODS =====

  /**
   * Get entity type name
   */
  getEntityTypeName(): string {
    return this.getEntityType();
  }

  /**
   * Check if entity exists
   */
  async exists(id: string, context?: RepositoryOperationContext): Promise<boolean> {
    try {
      const entity = await this.findById(id, context);
      return entity !== null;
    } catch (error) {
      this.logger.error(`Failed to check existence of ${this.getEntityType()} ${id}`, { error });
      return false;
    }
  }

  /**
   * Get repository metrics from conversational database service
   */
  getMetrics() {
    return this.conversationalDbService.getMetrics();
  }
}