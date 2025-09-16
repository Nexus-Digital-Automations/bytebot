/**
 * Parlant Database Module - MAXIMUM IMPLEMENTATION
 *
 * Comprehensive module integrating ALL Parlant-validated database services
 * implementing function-level wrapping with enterprise-grade orchestration.
 *
 * Features:
 * - Centralized Parlant validation for all database operations
 * - Risk-appropriate validation routing (READ: LOW, WRITE: MEDIUM, MIGRATIONS: HIGH, SECURITY: CRITICAL)
 * - Comprehensive audit trail aggregation across all database services
 * - Performance optimization with intelligent service coordination
 * - Enterprise-grade dependency injection and lifecycle management
 *
 * Architecture: NestJS module with comprehensive Parlant database service integration
 * Security: Multi-tier validation with conversational authentication for all database operations
 * Performance: Sub-500ms validation coordination with optimized service routing
 */

import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Core database services
import { DatabaseModule } from './database.module';
import { PrismaModule } from '../prisma/prisma.module';

// Parlant-validated database services
import { ParlantValidatedDatabaseService } from './parlant-validated-database.service';
import { ParlantValidatedPrismaService } from '../prisma/parlant-validated-prisma.service';
import { ParlantValidatedDatabaseMigrationService } from './services/parlant-validated-database-migration.service';
import { ParlantValidatedDatabaseSecurityService } from './security/parlant-validated-database-security.service';

// Database service implementations
import { DatabaseService } from './database.service';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseMigrationService } from './services/database-migration.service';
import { DatabaseSecurityService } from './security/database-security.service';

// Connection and configuration services
import { ConnectionPoolConfig } from './connection-pool.config';

// Common services for circuit breaker and retry patterns
import { CircuitBreakerService } from '../common/services/circuit-breaker.service';
import { RetryService } from '../common/services/retry.service';
import { ShutdownService } from '../common/services/shutdown.service';

// Parlant integration service
import { ParlantIntegrationService } from '../../bytebotd/src/parlant/parlant-integration.service';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => DatabaseModule),
    forwardRef(() => PrismaModule),
  ],
  providers: [
    // ===== CORE DATABASE SERVICES =====
    ConnectionPoolConfig,
    CircuitBreakerService,
    RetryService,
    ShutdownService,

    // Core database service
    {
      provide: DatabaseService,
      useClass: DatabaseService,
    },

    // Core Prisma service
    {
      provide: PrismaService,
      useClass: PrismaService,
    },

    // Database migration service
    {
      provide: DatabaseMigrationService,
      useClass: DatabaseMigrationService,
    },

    // Database security service
    {
      provide: DatabaseSecurityService,
      useClass: DatabaseSecurityService,
    },

    // ===== PARLANT INTEGRATION SERVICES =====

    // Parlant integration service (if not already provided)
    {
      provide: ParlantIntegrationService,
      useClass: ParlantIntegrationService,
    },

    // ===== PARLANT-VALIDATED DATABASE SERVICES =====

    // Parlant-validated database service
    {
      provide: ParlantValidatedDatabaseService,
      useClass: ParlantValidatedDatabaseService,
    },

    // Parlant-validated Prisma service
    {
      provide: ParlantValidatedPrismaService,
      useClass: ParlantValidatedPrismaService,
    },

    // Parlant-validated migration service
    {
      provide: ParlantValidatedDatabaseMigrationService,
      useClass: ParlantValidatedDatabaseMigrationService,
    },

    // Parlant-validated security service
    {
      provide: ParlantValidatedDatabaseSecurityService,
      useClass: ParlantValidatedDatabaseSecurityService,
    },

    // ===== ORCHESTRATION SERVICE =====

    // Database orchestration service for coordinating all Parlant-validated operations
    ParlantDatabaseOrchestrationService,
  ],
  exports: [
    // Export Parlant-validated services for use by other modules
    ParlantValidatedDatabaseService,
    ParlantValidatedPrismaService,
    ParlantValidatedDatabaseMigrationService,
    ParlantValidatedDatabaseSecurityService,

    // Export orchestration service
    ParlantDatabaseOrchestrationService,

    // Also export core services if needed
    DatabaseService,
    PrismaService,
    DatabaseMigrationService,
    DatabaseSecurityService,
  ],
})
export class ParlantDatabaseModule {}

/**
 * Parlant Database Orchestration Service - COMPREHENSIVE COORDINATION
 *
 * Provides centralized orchestration of all Parlant-validated database operations
 * with intelligent routing, performance optimization, and comprehensive audit trail aggregation.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ParlantConversationContext,
  RiskLevel,
} from '../../bytebotd/src/parlant/parlant-integration.service';

@Injectable()
export class ParlantDatabaseOrchestrationService {
  private readonly logger = new Logger(
    ParlantDatabaseOrchestrationService.name,
  );

  // Performance and monitoring metrics
  private totalOperations = 0;
  private operationsByRiskLevel = new Map<RiskLevel, number>();
  private operationsByService = new Map<string, number>();
  private averageExecutionTime = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantDatabaseService: ParlantValidatedDatabaseService,
    private readonly parlantPrismaService: ParlantValidatedPrismaService,
    private readonly parlantMigrationService: ParlantValidatedDatabaseMigrationService,
    private readonly parlantSecurityService: ParlantValidatedDatabaseSecurityService,
  ) {
    const operationId = this.generateOperationId();

    this.logger.log(
      `[${operationId}] Initializing Parlant Database Orchestration Service`,
      {
        parlantEnabled: this.isParlantEnabled(),
        servicesIntegrated: 4,
        orchestrationMode: 'MAXIMUM',
        validationTiers: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      },
    );

    // Initialize performance monitoring
    setInterval(() => this.logOrchestrationMetrics(), 60000); // Every minute

    // Initialize all risk levels in tracking
    Object.values(RiskLevel).forEach((level) => {
      this.operationsByRiskLevel.set(level, 0);
    });

    // Initialize service tracking
    const services = ['database', 'prisma', 'migration', 'security'];
    services.forEach((service) => {
      this.operationsByService.set(service, 0);
    });
  }

  // ===== ORCHESTRATED DATABASE OPERATIONS =====

  /**
   * Execute database operation with intelligent Parlant routing
   */
  async executeDatabase<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata: any,
    context: ParlantConversationContext,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await this.parlantDatabaseService.validateAndExecute(
        operationName,
        operation,
        metadata,
        context,
      );

      this.updateMetrics(
        'database',
        metadata.riskLevel || RiskLevel.MEDIUM,
        Date.now() - startTime,
      );
      return result;
    } catch (error) {
      this.logger.error('Database operation failed', {
        operationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute Prisma operation with intelligent routing
   */
  async executePrisma<T>(
    operationName: string,
    operation: (client: any) => Promise<T>,
    metadata: any,
    context: ParlantConversationContext,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result =
        await this.parlantPrismaService.validateAndExecutePrismaOperation(
          operationName,
          operation,
          metadata,
          context,
        );

      this.updateMetrics(
        'prisma',
        metadata.riskLevel || RiskLevel.MEDIUM,
        Date.now() - startTime,
      );
      return result;
    } catch (error) {
      this.logger.error('Prisma operation failed', {
        operationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute migration operation with HIGH to CRITICAL risk validation
   */
  async executeMigration<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata: any,
    context: ParlantConversationContext,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result =
        await this.parlantMigrationService.validateAndExecuteMigration(
          operationName,
          operation,
          metadata,
          context,
        );

      this.updateMetrics('migration', RiskLevel.HIGH, Date.now() - startTime);
      return result;
    } catch (error) {
      this.logger.error('Migration operation failed', {
        operationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute security operation with CRITICAL risk validation
   */
  async executeSecurity<T>(
    operationName: string,
    operation: () => Promise<T>,
    metadata: any,
    context: ParlantConversationContext,
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result =
        await this.parlantSecurityService.validateAndExecuteSecurityOperation(
          operationName,
          operation,
          metadata,
          context,
        );

      this.updateMetrics(
        'security',
        RiskLevel.CRITICAL,
        Date.now() - startTime,
      );
      return result;
    } catch (error) {
      this.logger.error('Security operation failed', {
        operationName,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // ===== CONVENIENT OPERATION METHODS =====

  /**
   * Execute read operation (LOW risk)
   */
  async executeRead<T>(
    query: () => Promise<T>,
    context: ParlantConversationContext,
    tableName?: string,
  ): Promise<T> {
    const metadata = {
      operationType: 'READ',
      queryDescription: `Read operation${tableName ? ` on ${tableName}` : ''}`,
      isDestructive: false,
      requiresBackup: false,
      riskLevel: RiskLevel.LOW,
    };

    return this.executeDatabase('executeRead', query, metadata, context);
  }

  /**
   * Execute write operation (MEDIUM risk)
   */
  async executeWrite<T>(
    query: () => Promise<T>,
    context: ParlantConversationContext,
    tableName?: string,
    expectedRows?: number,
  ): Promise<T> {
    const metadata = {
      operationType: 'WRITE',
      queryDescription: `Write operation${tableName ? ` on ${tableName}` : ''}`,
      isDestructive: false,
      requiresBackup: expectedRows && expectedRows > 100,
      riskLevel:
        expectedRows && expectedRows > 1000 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
      affectedRows: expectedRows,
    };

    return this.executeDatabase('executeWrite', query, metadata, context);
  }

  /**
   * Execute delete operation (HIGH risk)
   */
  async executeDelete<T>(
    query: () => Promise<T>,
    context: ParlantConversationContext,
    tableName?: string,
    expectedRows?: number,
  ): Promise<T> {
    const metadata = {
      operationType: 'DELETE',
      queryDescription: `Delete operation${tableName ? ` on ${tableName}` : ''}`,
      isDestructive: true,
      requiresBackup: true,
      riskLevel:
        expectedRows && expectedRows > 100
          ? RiskLevel.CRITICAL
          : RiskLevel.HIGH,
      affectedRows: expectedRows,
    };

    return this.executeDatabase('executeDelete', query, metadata, context);
  }

  /**
   * Execute Prisma model operation with automatic risk assessment
   */
  async executePrismaModel<T>(
    modelName: string,
    operation: string,
    query: (client: any) => Promise<T>,
    context: ParlantConversationContext,
    args?: any,
  ): Promise<T> {
    const metadata = {
      operationType: this.determineOperationType(operation),
      operationMethod: operation,
      modelName,
      queryDescription: `Prisma ${operation} operation on ${modelName} model`,
      isDestructive: this.isDestructiveOperation(operation),
      requiresBackup: this.requiresBackup(modelName, operation),
      isBulkOperation: operation.includes('Many'),
      dataFields: args?.data ? Object.keys(args.data) : undefined,
      whereConditions: args?.where,
      selectFields: args?.select ? Object.keys(args.select) : undefined,
    };

    return this.executePrisma(
      `${modelName}.${operation}`,
      query,
      metadata,
      context,
    );
  }

  // ===== COMPREHENSIVE AUDIT AND METRICS =====

  /**
   * Get comprehensive audit trail from all services
   */
  getComprehensiveAuditTrail() {
    const databaseAudit = this.parlantDatabaseService.getAuditTrail();
    const prismaAudit = this.parlantPrismaService.getAuditTrail();
    const migrationAudit =
      this.parlantMigrationService.getMigrationAuditTrail();
    const securityAudit = this.parlantSecurityService.getSecurityAuditTrail();

    return {
      database: databaseAudit,
      prisma: prismaAudit,
      migration: migrationAudit,
      security: securityAudit,
      totalEntries:
        databaseAudit.length +
        prismaAudit.length +
        migrationAudit.length +
        securityAudit.length,
      summary: this.generateAuditSummary(
        databaseAudit,
        prismaAudit,
        migrationAudit,
        securityAudit,
      ),
    };
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStatistics() {
    const databaseStats =
      this.parlantDatabaseService.getDatabaseOperationStatistics();
    const prismaStats =
      this.parlantPrismaService.getPrismaOperationStatistics();
    const migrationStats =
      this.parlantMigrationService.getMigrationStatistics();
    const securityStats = this.parlantSecurityService.getSecurityStatistics();

    const orchestrationStats = {
      totalOperations: this.totalOperations,
      operationsByRiskLevel: Object.fromEntries(this.operationsByRiskLevel),
      operationsByService: Object.fromEntries(this.operationsByService),
      averageExecutionTime: `${this.averageExecutionTime.toFixed(2)}ms`,
    };

    return {
      orchestration: orchestrationStats,
      database: databaseStats,
      prisma: prismaStats,
      migration: migrationStats,
      security: securityStats,
    };
  }

  /**
   * Get cache statistics from all services
   */
  getCacheStatistics() {
    return {
      database: this.parlantDatabaseService.getCacheStatistics(),
      prisma: this.parlantPrismaService.getCacheStatistics(),
      migration: this.parlantMigrationService.getCacheStatistics?.() || {
        message: 'No cache statistics available',
      },
      security: this.parlantSecurityService.getCacheStatistics?.() || {
        message: 'No cache statistics available',
      },
    };
  }

  /**
   * Clear all caches across services
   */
  clearAllCaches(): void {
    this.parlantDatabaseService.clearCache();
    this.parlantPrismaService.clearCache();

    if (this.parlantMigrationService.clearCache) {
      this.parlantMigrationService.clearCache();
    }

    if (this.parlantSecurityService.clearCache) {
      this.parlantSecurityService.clearCache();
    }

    this.logger.log('All Parlant database service caches cleared');
  }

  // ===== UTILITY METHODS =====

  /**
   * Determine operation type from Prisma method
   */
  private determineOperationType(
    operation: string,
  ): 'READ' | 'WRITE' | 'DELETE' {
    if (
      operation.startsWith('find') ||
      operation.startsWith('count') ||
      operation.startsWith('aggregate')
    ) {
      return 'READ';
    }

    if (operation.startsWith('delete')) {
      return 'DELETE';
    }

    return 'WRITE';
  }

  /**
   * Check if operation is destructive
   */
  private isDestructiveOperation(operation: string): boolean {
    return (
      operation.startsWith('delete') ||
      operation.startsWith('deleteMany') ||
      operation.includes('disconnect') ||
      operation.includes('set')
    );
  }

  /**
   * Check if operation requires backup
   */
  private requiresBackup(modelName: string, operation: string): boolean {
    // High-value models always require backup for write operations
    const highValueModels = ['User', 'ApiKey', 'SystemConfig', 'AuditLog'];

    if (highValueModels.includes(modelName) && !operation.startsWith('find')) {
      return true;
    }

    // Bulk operations require backup
    if (operation.includes('Many')) {
      return true;
    }

    // Delete operations require backup
    if (operation.startsWith('delete')) {
      return true;
    }

    return false;
  }

  /**
   * Generate audit summary
   */
  private generateAuditSummary(
    databaseAudit: any[],
    prismaAudit: any[],
    migrationAudit: any[],
    securityAudit: any[],
  ) {
    const totalEntries =
      databaseAudit.length +
      prismaAudit.length +
      migrationAudit.length +
      securityAudit.length;

    const successCount = [
      ...databaseAudit,
      ...prismaAudit,
      ...migrationAudit,
      ...securityAudit,
    ].filter((entry) => entry.executionResult === 'SUCCESS').length;

    const riskLevelDistribution = [
      ...databaseAudit,
      ...prismaAudit,
      ...migrationAudit,
      ...securityAudit,
    ].reduce(
      (acc, entry) => {
        const risk = entry.riskLevel;
        acc[risk] = (acc[risk] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalEntries,
      successRate:
        totalEntries > 0
          ? `${((successCount / totalEntries) * 100).toFixed(2)}%`
          : '0%',
      riskLevelDistribution,
      serviceDistribution: {
        database: databaseAudit.length,
        prisma: prismaAudit.length,
        migration: migrationAudit.length,
        security: securityAudit.length,
      },
    };
  }

  /**
   * Update orchestration metrics
   */
  private updateMetrics(
    service: string,
    riskLevel: RiskLevel,
    executionTime: number,
  ): void {
    this.totalOperations++;

    // Update service metrics
    const currentServiceCount = this.operationsByService.get(service) || 0;
    this.operationsByService.set(service, currentServiceCount + 1);

    // Update risk level metrics
    const currentRiskCount = this.operationsByRiskLevel.get(riskLevel) || 0;
    this.operationsByRiskLevel.set(riskLevel, currentRiskCount + 1);

    // Update average execution time
    this.averageExecutionTime =
      (this.averageExecutionTime * (this.totalOperations - 1) + executionTime) /
      this.totalOperations;
  }

  /**
   * Log orchestration metrics
   */
  private logOrchestrationMetrics(): void {
    const riskDistribution = Object.fromEntries(this.operationsByRiskLevel);
    const serviceDistribution = Object.fromEntries(this.operationsByService);

    this.logger.log('Parlant Database Orchestration Metrics', {
      totalOperations: this.totalOperations,
      averageExecutionTime: `${this.averageExecutionTime.toFixed(2)}ms`,
      riskLevelDistribution: riskDistribution,
      serviceDistribution: serviceDistribution,
    });
  }

  /**
   * Configuration helper methods
   */
  private isParlantEnabled(): boolean {
    return this.configService.get<boolean>('PARLANT_ENABLED', true);
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `db_orchestration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ===== HEALTH AND MONITORING =====

  /**
   * Get service health status
   */
  getServiceHealth() {
    return {
      orchestrationService: {
        status: 'healthy',
        totalOperations: this.totalOperations,
        averageExecutionTime: this.averageExecutionTime,
      },
      database: {
        status: 'healthy',
        cacheSize: this.parlantDatabaseService.getCacheStatistics().cacheSize,
      },
      prisma: {
        status: 'healthy',
        cacheSize: this.parlantPrismaService.getCacheStatistics().cacheSize,
      },
      migration: {
        status: 'healthy',
        totalMigrations:
          this.parlantMigrationService.getMigrationStatistics().totalMigrations,
      },
      security: {
        status: 'healthy',
        totalOperations:
          this.parlantSecurityService.getSecurityStatistics().totalOperations,
      },
    };
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      // Test each service
      const systemContext = {
        userId: 'system',
        sessionId: this.generateOperationId(),
        agentRole: 'health_check_agent',
        securityLevel: 'LOW' as const,
        conversationHistory: [],
        metadata: { healthCheck: true },
      };

      // Test database service
      await this.parlantDatabaseService.getHealthStatus(systemContext);

      // Test Prisma service
      await this.parlantPrismaService.getHealthStatus(systemContext);

      // Test migration service
      await this.parlantMigrationService.getMigrationStatus(systemContext);

      // Test security service
      await this.parlantSecurityService.getSecurityConfiguration(systemContext);

      this.logger.log('All Parlant database services healthy');
      return true;
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
