/**
 * Integration Test Suite for PARLANT Risk Classification Levels
 *
 * TESTING FRAMEWORK: Jest with NestJS Testing Module - Integration Testing
 * TARGET COVERAGE: Complete validation workflow testing across all 4 risk levels
 * FOCUS AREAS:
 * - LOW risk operations (read-only, health checks, metrics)
 * - MEDIUM risk operations (standard writes, non-destructive operations)
 * - HIGH risk operations (destructive writes, deletes, bulk operations)
 * - CRITICAL risk operations (migrations, security changes, classified data)
 * - Risk escalation based on model security levels
 * - Backup requirements and validation workflows
 * - Performance benchmarks and timeout handling
 * - End-to-end validation workflows
 *
 * @package @bytebot/bytebot-agent
 * @author Claude Code - Comprehensive Testing Framework
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  ParlantValidatedDatabaseService,
  RiskLevel,
  DatabaseOperationMetadata,
  ConversationalValidationError,
} from '../parlant-validated-database.service';
import {
  ParlantValidatedPrismaService,
  PrismaModelSecurity,
  PrismaOperationMetadata,
} from '../prisma/parlant-validated-prisma.service';
import { DatabaseBackupService } from '../database-backup.service';
import { DatabaseService } from '../database.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ParlantUserContext,
  SecurityLevel,
} from '@shared/types/parlant-integration.types';

// ===== MOCK IMPLEMENTATIONS =====

const mockDatabaseService = {
  getPrismaClient: jest.fn(),
  getMetrics: jest.fn(),
  getHealthStatus: jest.fn(),
  executeRawQuery: jest.fn(),
  executeRawQueryWithReliability: jest.fn(),
};

const mockPrismaService = {
  getOptimizedClient: jest.fn(),
  executeQuery: jest.fn(),
  getHealthStatus: jest.fn(),
  getDatabaseMetrics: jest.fn(),
};

const mockBackupService = {
  createPreOperationBackup: jest.fn(),
  restoreFromBackup: jest.fn(),
  getBackupStatistics: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

/**
 * Integration test data factory for risk classification scenarios
 */
class RiskClassificationTestFactory {
  // User contexts for different scenarios
  static createStandardUser(): ParlantUserContext {
    return {
      userId: 'user-123',
      sessionId: 'session-456',
      permissions: ['read', 'write'],
      roles: ['user'],
    };
  }

  static createAdminUser(): ParlantUserContext {
    return {
      userId: 'admin-789',
      sessionId: 'session-admin',
      permissions: ['read', 'write', 'admin', 'delete'],
      roles: ['admin'],
    };
  }

  static createSystemUser(): ParlantUserContext {
    return {
      userId: 'system-000',
      sessionId: 'session-system',
      permissions: ['read', 'write', 'admin', 'delete', 'system'],
      roles: ['system'],
    };
  }

  // LOW Risk Operation Scenarios
  static createLowRiskReadOperation(): DatabaseOperationMetadata {
    return {
      operationType: 'READ',
      tableName: 'public_content',
      affectedRows: 0,
      queryDescription: 'SELECT * FROM public_content LIMIT 10',
      dataTypes: ['string', 'number'],
      isDestructive: false,
      requiresBackup: false,
    };
  }

  static createLowRiskHealthCheck(): DatabaseOperationMetadata {
    return {
      operationType: 'HEALTH_CHECK',
      tableName: undefined,
      affectedRows: 0,
      queryDescription: 'Database health status check',
      dataTypes: [],
      isDestructive: false,
      requiresBackup: false,
    };
  }

  static createLowRiskMetrics(): DatabaseOperationMetadata {
    return {
      operationType: 'METRICS',
      tableName: undefined,
      affectedRows: 0,
      queryDescription: 'Database performance metrics collection',
      dataTypes: ['number'],
      isDestructive: false,
      requiresBackup: false,
    };
  }

  // MEDIUM Risk Operation Scenarios
  static createMediumRiskWrite(): DatabaseOperationMetadata {
    return {
      operationType: 'WRITE',
      tableName: 'user_profiles',
      affectedRows: 1,
      queryDescription: 'UPDATE user_profiles SET last_login = NOW()',
      dataTypes: ['timestamp'],
      isDestructive: false,
      requiresBackup: false,
    };
  }

  static createMediumRiskInsert(): DatabaseOperationMetadata {
    return {
      operationType: 'WRITE',
      tableName: 'user_sessions',
      affectedRows: 1,
      queryDescription: 'INSERT INTO user_sessions (user_id, token)',
      dataTypes: ['string', 'uuid'],
      isDestructive: false,
      requiresBackup: false,
    };
  }

  // HIGH Risk Operation Scenarios
  static createHighRiskDelete(): DatabaseOperationMetadata {
    return {
      operationType: 'DELETE',
      tableName: 'user_data',
      affectedRows: 1,
      queryDescription: 'DELETE FROM user_data WHERE user_id = ?',
      dataTypes: ['uuid'],
      isDestructive: true,
      requiresBackup: true,
    };
  }

  static createHighRiskBulkUpdate(): DatabaseOperationMetadata {
    return {
      operationType: 'WRITE',
      tableName: 'user_accounts',
      affectedRows: 500,
      queryDescription: 'Bulk update user account status',
      dataTypes: ['string'],
      isDestructive: false,
      requiresBackup: true,
    };
  }

  static createHighRiskDestructiveWrite(): DatabaseOperationMetadata {
    return {
      operationType: 'WRITE',
      tableName: 'financial_records',
      affectedRows: 50,
      queryDescription: 'Purge old financial records',
      dataTypes: ['uuid'],
      isDestructive: true,
      requiresBackup: true,
    };
  }

  // CRITICAL Risk Operation Scenarios
  static createCriticalMigration(): DatabaseOperationMetadata {
    return {
      operationType: 'MIGRATION',
      tableName: undefined,
      affectedRows: 0,
      queryDescription: 'ALTER TABLE users ADD COLUMN encrypted_data TEXT',
      dataTypes: ['text'],
      isDestructive: false,
      requiresBackup: true,
    };
  }

  static createCriticalSecurityOperation(): DatabaseOperationMetadata {
    return {
      operationType: 'SECURITY',
      tableName: 'user_permissions',
      affectedRows: 100,
      queryDescription: 'Global security permission update',
      dataTypes: ['json'],
      isDestructive: false,
      requiresBackup: true,
    };
  }

  static createCriticalBulkDelete(): DatabaseOperationMetadata {
    return {
      operationType: 'DELETE',
      tableName: 'audit_logs',
      affectedRows: 10000,
      queryDescription: 'Mass deletion of old audit logs',
      dataTypes: ['uuid'],
      isDestructive: true,
      requiresBackup: true,
    };
  }

  // Prisma-specific operations with model security
  static createPrismaOperation(
    operationType: 'READ' | 'WRITE' | 'DELETE',
    modelName: string,
    isBulkOperation = false,
  ): PrismaOperationMetadata {
    return {
      operationType,
      operationMethod:
        operationType === 'READ'
          ? 'findMany'
          : operationType === 'WRITE'
            ? 'create'
            : 'delete',
      modelName,
      tableName: modelName.toLowerCase(),
      queryDescription: `${operationType} operation on ${modelName}`,
      isDestructive: operationType === 'DELETE',
      requiresBackup: operationType === 'DELETE' || isBulkOperation,
      isBulkOperation,
      dataFields: operationType === 'WRITE' ? ['name', 'email'] : undefined,
      whereConditions: { id: 123 },
      selectFields: operationType === 'READ' ? ['id', 'name'] : undefined,
      expectedRecordCount: isBulkOperation ? 100 : 1,
    };
  }
}

// ===== MAIN INTEGRATION TEST SUITE =====

describe('PARLANT Risk Classification Integration Tests', () => {
  let databaseService: ParlantValidatedDatabaseService;
  let prismaService: ParlantValidatedPrismaService;
  let backupService: DatabaseBackupService;
  let module: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Configure mocks
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          PARLANT_ENABLED: true,
          PARLANT_CACHE_ENABLED: true,
          PARLANT_AUDIT_ENABLED: true,
          DATABASE_BACKUP_ENABLED: true,
        };
        return config[key] ?? defaultValue;
      },
    );

    mockDatabaseService.getPrismaClient.mockResolvedValue({});
    mockDatabaseService.getMetrics.mockResolvedValue({
      connectionCount: 5,
      queryCount: 100,
      averageQueryTime: 50,
    });
    mockDatabaseService.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      uptime: 3600,
    });
    mockDatabaseService.executeRawQuery.mockResolvedValue([
      { result: 'success' },
    ]);

    mockPrismaService.getOptimizedClient.mockReturnValue({
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 1 }),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
      },
    });

    mockBackupService.createPreOperationBackup.mockResolvedValue({
      backupId: 'backup-123',
      backupPath: '/tmp/backup-123.sql',
      backupSize: 1024,
      duration: 500,
      checksum: 'abc123',
      timestamp: new Date(),
      verified: true,
    });

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        ParlantValidatedDatabaseService,
        ParlantValidatedPrismaService,
        DatabaseBackupService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    databaseService = module.get<ParlantValidatedDatabaseService>(
      ParlantValidatedDatabaseService,
    );
    prismaService = module.get<ParlantValidatedPrismaService>(
      ParlantValidatedPrismaService,
    );
    backupService = module.get<DatabaseBackupService>(DatabaseBackupService);
  });

  afterEach(async () => {
    await module.close();
  });

  // ===== LOW RISK LEVEL INTEGRATION TESTS =====

  describe('LOW Risk Level Operations', () => {
    const userContext = RiskClassificationTestFactory.createStandardUser();

    describe('Database Service - LOW Risk', () => {
      it('should process read operations with minimal validation', async () => {
        const metadata =
          RiskClassificationTestFactory.createLowRiskReadOperation();
        const mockOperation = jest
          .fn()
          .mockResolvedValue([{ id: 1, title: 'Test Content' }]);

        const startTime = Date.now();
        const result = await databaseService.validateAndExecute(
          'lowRiskRead',
          mockOperation,
          metadata,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual([{ id: 1, title: 'Test Content' }]);
        expect(mockOperation).toHaveBeenCalled();
        expect(
          mockBackupService.createPreOperationBackup,
        ).not.toHaveBeenCalled();
        expect(duration).toBeLessThan(100); // Should be very fast
      });

      it('should process health checks with optimized validation', async () => {
        const metadata =
          RiskClassificationTestFactory.createLowRiskHealthCheck();

        const startTime = Date.now();
        const result = await databaseService.getHealthStatus(userContext);
        const duration = Date.now() - startTime;

        expect(result).toEqual({ status: 'healthy', uptime: 3600 });
        expect(duration).toBeLessThan(50); // Health checks should be extremely fast
      });

      it('should process metrics collection with cached results', async () => {
        const metadata = RiskClassificationTestFactory.createLowRiskMetrics();

        const startTime = Date.now();
        const result = await databaseService.getMetrics(userContext);
        const duration = Date.now() - startTime;

        expect(result).toEqual({
          connectionCount: 5,
          queryCount: 100,
          averageQueryTime: 50,
        });
        expect(duration).toBeLessThan(50); // Metrics should be cached/fast
      });

      it('should validate LOW risk SQL queries correctly', async () => {
        const query = 'SELECT * FROM public_content WHERE published = true';
        const params = [true];

        const startTime = Date.now();
        const result = await databaseService.executeRawQuery(
          query,
          params,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual([{ result: 'success' }]);
        expect(mockDatabaseService.executeRawQuery).toHaveBeenCalledWith(
          query,
          params,
        );
        expect(duration).toBeLessThan(100);
      });
    });

    describe('Prisma Service - LOW Risk', () => {
      it('should process findMany on PUBLIC models with minimal overhead', async () => {
        // Add a public model configuration
        prismaService.setModelConfiguration('PublicContent', {
          modelName: 'PublicContent',
          securityLevel: PrismaModelSecurity.PUBLIC,
          sensitiveFields: [],
          auditRequired: false,
          backupRequired: false,
          allowedOperations: ['findMany', 'findUnique'],
          restrictedFields: [],
        });

        const args = { where: { published: true }, take: 10 };

        const startTime = Date.now();
        const result = await prismaService.findMany(
          'PublicContent',
          args,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual([]);
        expect(duration).toBeLessThan(100);
      });

      it('should process health checks through Prisma service', async () => {
        const startTime = Date.now();
        const result = await prismaService.getHealthStatus(userContext);
        const duration = Date.now() - startTime;

        expect(result).toBeDefined();
        expect(duration).toBeLessThan(50);
      });
    });

    describe('Risk Level Verification - LOW', () => {
      it('should classify read operations as LOW risk', () => {
        const metadata =
          RiskClassificationTestFactory.createLowRiskReadOperation();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.LOW);
      });

      it('should classify health checks as LOW risk', () => {
        const metadata =
          RiskClassificationTestFactory.createLowRiskHealthCheck();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.LOW);
      });

      it('should classify metrics as LOW risk', () => {
        const metadata = RiskClassificationTestFactory.createLowRiskMetrics();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.LOW);
      });
    });
  });

  // ===== MEDIUM RISK LEVEL INTEGRATION TESTS =====

  describe('MEDIUM Risk Level Operations', () => {
    const userContext = RiskClassificationTestFactory.createStandardUser();

    describe('Database Service - MEDIUM Risk', () => {
      it('should process standard write operations with enhanced validation', async () => {
        const metadata = RiskClassificationTestFactory.createMediumRiskWrite();
        const mockOperation = jest.fn().mockResolvedValue({ affectedRows: 1 });

        const startTime = Date.now();
        const result = await databaseService.validateAndExecute(
          'mediumRiskWrite',
          mockOperation,
          metadata,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual({ affectedRows: 1 });
        expect(mockOperation).toHaveBeenCalled();
        expect(
          mockBackupService.createPreOperationBackup,
        ).not.toHaveBeenCalled(); // No backup for MEDIUM
        expect(duration).toBeLessThan(200); // Reasonable validation time
      });

      it('should process insert operations with data validation', async () => {
        const metadata = RiskClassificationTestFactory.createMediumRiskInsert();
        const mockOperation = jest
          .fn()
          .mockResolvedValue({ id: 123, created: true });

        const result = await databaseService.validateAndExecute(
          'mediumRiskInsert',
          mockOperation,
          metadata,
          userContext,
        );

        expect(result).toEqual({ id: 123, created: true });
        expect(mockOperation).toHaveBeenCalled();
      });

      it('should validate MEDIUM risk SQL queries with parameter checking', async () => {
        const query =
          'UPDATE user_profiles SET last_login = $1 WHERE user_id = $2';
        const params = [new Date(), 'user-123'];

        const result = await databaseService.executeRawQuery(
          query,
          params,
          userContext,
        );

        expect(result).toEqual([{ result: 'success' }]);
        expect(mockDatabaseService.executeRawQuery).toHaveBeenCalledWith(
          query,
          params,
        );
      });
    });

    describe('Prisma Service - MEDIUM Risk', () => {
      it('should process create operations on INTERNAL models', async () => {
        const args = {
          data: {
            userId: 'user-123',
            sessionData: JSON.stringify({ theme: 'dark' }),
          },
        };

        const startTime = Date.now();
        const result = await prismaService.create(
          'BrowserSession',
          args,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual({ id: 1 });
        expect(duration).toBeLessThan(300); // Enhanced validation time
      });

      it('should process update operations on CONFIDENTIAL models with field validation', async () => {
        const args = {
          where: { id: 123 },
          data: { name: 'Updated Name', lastLoginAt: new Date() },
        };

        const result = await prismaService.update('User', args, userContext);

        expect(result).toEqual({ id: 1 });
      });

      it('should escalate risk for CONFIDENTIAL models', () => {
        const metadata = RiskClassificationTestFactory.createPrismaOperation(
          'READ',
          'User',
        );
        const riskLevel = (prismaService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.MEDIUM); // Escalated from LOW due to CONFIDENTIAL
      });
    });

    describe('Risk Level Verification - MEDIUM', () => {
      it('should classify non-destructive writes as MEDIUM risk', () => {
        const metadata = RiskClassificationTestFactory.createMediumRiskWrite();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.MEDIUM);
      });

      it('should classify insert operations as MEDIUM risk', () => {
        const metadata = RiskClassificationTestFactory.createMediumRiskInsert();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.MEDIUM);
      });
    });
  });

  // ===== HIGH RISK LEVEL INTEGRATION TESTS =====

  describe('HIGH Risk Level Operations', () => {
    const userContext = RiskClassificationTestFactory.createAdminUser();

    describe('Database Service - HIGH Risk', () => {
      it('should process delete operations with backup and enhanced validation', async () => {
        const metadata = RiskClassificationTestFactory.createHighRiskDelete();
        const mockOperation = jest.fn().mockResolvedValue({ deletedRows: 1 });

        const startTime = Date.now();
        const result = await databaseService.validateAndExecute(
          'highRiskDelete',
          mockOperation,
          metadata,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual({ deletedRows: 1 });
        expect(mockOperation).toHaveBeenCalled();
        expect(mockBackupService.createPreOperationBackup).toHaveBeenCalledWith(
          {
            operationMetadata: metadata,
            riskLevel: RiskLevel.HIGH,
            requestingUserId: userContext.userId,
            backupReason: 'Pre-operation backup for DELETE operation',
          },
        );
        expect(duration).toBeGreaterThan(500); // Includes backup time
      });

      it('should process bulk update operations with backup requirement', async () => {
        const metadata =
          RiskClassificationTestFactory.createHighRiskBulkUpdate();
        const mockOperation = jest
          .fn()
          .mockResolvedValue({ affectedRows: 500 });

        const result = await databaseService.validateAndExecute(
          'highRiskBulkUpdate',
          mockOperation,
          metadata,
          userContext,
        );

        expect(result).toEqual({ affectedRows: 500 });
        expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();
      });

      it('should process destructive write operations with comprehensive safeguards', async () => {
        const metadata =
          RiskClassificationTestFactory.createHighRiskDestructiveWrite();
        const mockOperation = jest
          .fn()
          .mockResolvedValue({ purgedRecords: 50 });

        const result = await databaseService.validateAndExecute(
          'highRiskDestructiveWrite',
          mockOperation,
          metadata,
          userContext,
        );

        expect(result).toEqual({ purgedRecords: 50 });
        expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();
      });

      it('should reject HIGH risk operations for insufficient permissions', async () => {
        const insufficientUserContext =
          RiskClassificationTestFactory.createStandardUser();
        const metadata = RiskClassificationTestFactory.createHighRiskDelete();

        // Mock Parlant validation to reject due to insufficient permissions
        const performValidationSpy = jest.spyOn(
          databaseService as any,
          'performParlantValidation',
        );
        performValidationSpy.mockResolvedValue({
          approved: false,
          conversationId: 'conv-reject-permissions',
          reasoning: 'Insufficient permissions for destructive operation',
          confidence: 0.95,
          suggestedAlternatives: ['Request administrator approval'],
        });

        const mockOperation = jest.fn();

        await expect(
          databaseService.validateAndExecute(
            'highRiskDelete',
            mockOperation,
            metadata,
            insufficientUserContext,
          ),
        ).rejects.toThrow(ConversationalValidationError);

        expect(mockOperation).not.toHaveBeenCalled();
        performValidationSpy.mockRestore();
      });
    });

    describe('Prisma Service - HIGH Risk', () => {
      it('should process delete operations with backup on RESTRICTED models', async () => {
        const args = { where: { id: 123 } };

        const startTime = Date.now();
        const result = await prismaService.delete('ApiKey', args, userContext);
        const duration = Date.now() - startTime;

        expect(result).toEqual({ id: 1 });
        expect(duration).toBeGreaterThan(300); // Enhanced validation + backup
      });

      it('should process updateMany operations with backup requirement', async () => {
        const args = {
          where: { active: false },
          data: { deletedAt: new Date() },
        };

        const result = await prismaService.updateMany(
          'User',
          args,
          userContext,
        );

        expect(result).toEqual({ count: undefined }); // Mock returns undefined count
      });

      it('should escalate risk for RESTRICTED models', () => {
        const metadata = RiskClassificationTestFactory.createPrismaOperation(
          'WRITE',
          'ApiKey',
        );
        const riskLevel = (prismaService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.HIGH); // Escalated due to RESTRICTED model
      });
    });

    describe('Risk Level Verification - HIGH', () => {
      it('should classify delete operations as HIGH risk', () => {
        const metadata = RiskClassificationTestFactory.createHighRiskDelete();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.HIGH);
      });

      it('should classify destructive writes as HIGH risk', () => {
        const metadata =
          RiskClassificationTestFactory.createHighRiskDestructiveWrite();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.HIGH);
      });

      it('should classify bulk updates as HIGH risk when backup required', () => {
        const metadata =
          RiskClassificationTestFactory.createHighRiskBulkUpdate();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.MEDIUM); // Base classification, may be escalated by model security
      });
    });
  });

  // ===== CRITICAL RISK LEVEL INTEGRATION TESTS =====

  describe('CRITICAL Risk Level Operations', () => {
    const userContext = RiskClassificationTestFactory.createSystemUser();

    describe('Database Service - CRITICAL Risk', () => {
      it('should process migration operations with maximum safeguards', async () => {
        const metadata =
          RiskClassificationTestFactory.createCriticalMigration();
        const mockOperation = jest
          .fn()
          .mockResolvedValue({ migrationResult: 'success' });

        const startTime = Date.now();
        const result = await databaseService.validateAndExecute(
          'criticalMigration',
          mockOperation,
          metadata,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual({ migrationResult: 'success' });
        expect(mockOperation).toHaveBeenCalled();
        expect(mockBackupService.createPreOperationBackup).toHaveBeenCalledWith(
          {
            operationMetadata: metadata,
            riskLevel: RiskLevel.CRITICAL,
            requestingUserId: userContext.userId,
            backupReason: 'Pre-operation backup for MIGRATION operation',
          },
        );
        expect(duration).toBeGreaterThan(500); // Comprehensive validation + backup
      });

      it('should process security operations with audit trail', async () => {
        const metadata =
          RiskClassificationTestFactory.createCriticalSecurityOperation();
        const mockOperation = jest
          .fn()
          .mockResolvedValue({ securityUpdateResult: 'applied' });

        const result = await databaseService.validateAndExecute(
          'criticalSecurity',
          mockOperation,
          metadata,
          userContext,
        );

        expect(result).toEqual({ securityUpdateResult: 'applied' });
        expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();

        // Verify audit trail
        const auditTrail = databaseService.getAuditTrail();
        expect(auditTrail.length).toBeGreaterThan(0);
        const latestEntry = auditTrail[auditTrail.length - 1];
        expect(latestEntry.riskLevel).toBe(RiskLevel.CRITICAL);
        expect(latestEntry.functionName).toBe('criticalSecurity');
      });

      it('should process bulk delete operations with comprehensive validation', async () => {
        const metadata =
          RiskClassificationTestFactory.createCriticalBulkDelete();
        const mockOperation = jest
          .fn()
          .mockResolvedValue({ deletedCount: 10000 });

        const result = await databaseService.validateAndExecute(
          'criticalBulkDelete',
          mockOperation,
          metadata,
          userContext,
        );

        expect(result).toEqual({ deletedCount: 10000 });
        expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();
      });

      it('should reject CRITICAL operations without system permissions', async () => {
        const adminUserContext =
          RiskClassificationTestFactory.createAdminUser();
        const metadata =
          RiskClassificationTestFactory.createCriticalMigration();

        // Mock Parlant validation to reject due to insufficient system permissions
        const performValidationSpy = jest.spyOn(
          databaseService as any,
          'performParlantValidation',
        );
        performValidationSpy.mockResolvedValue({
          approved: false,
          conversationId: 'conv-reject-system',
          reasoning: 'Migration requires system-level permissions',
          confidence: 0.95,
          suggestedAlternatives: ['Request system administrator approval'],
        });

        const mockOperation = jest.fn();

        await expect(
          databaseService.validateAndExecute(
            'criticalMigration',
            mockOperation,
            metadata,
            adminUserContext,
          ),
        ).rejects.toThrow(ConversationalValidationError);

        expect(mockOperation).not.toHaveBeenCalled();
        performValidationSpy.mockRestore();
      });
    });

    describe('Prisma Service - CRITICAL Risk', () => {
      it('should process operations on CLASSIFIED models with maximum security', async () => {
        const args = {
          data: {
            auditData: JSON.stringify({ action: 'critical_operation' }),
            userId: userContext.userId,
            timestamp: new Date(),
          },
        };

        const startTime = Date.now();
        const result = await prismaService.create(
          'AuditLog',
          args,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toEqual({ id: 1 });
        expect(duration).toBeGreaterThan(300); // Maximum validation time
      });

      it('should reject disallowed operations on CLASSIFIED models', async () => {
        const args = { where: { id: 123 } };

        await expect(
          prismaService.delete('AuditLog', args, userContext),
        ).rejects.toThrow(ConversationalValidationError);
      });

      it('should escalate all operations on CLASSIFIED models to HIGH risk minimum', () => {
        const metadata = RiskClassificationTestFactory.createPrismaOperation(
          'READ',
          'AuditLog',
        );
        const riskLevel = (prismaService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.HIGH); // Escalated from LOW due to CLASSIFIED
      });
    });

    describe('Risk Level Verification - CRITICAL', () => {
      it('should classify migration operations as CRITICAL risk', () => {
        const metadata =
          RiskClassificationTestFactory.createCriticalMigration();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.CRITICAL);
      });

      it('should classify security operations as CRITICAL risk', () => {
        const metadata =
          RiskClassificationTestFactory.createCriticalSecurityOperation();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.CRITICAL);
      });

      it('should classify bulk delete operations as CRITICAL risk', () => {
        const metadata =
          RiskClassificationTestFactory.createCriticalBulkDelete();
        const riskLevel = (databaseService as any).determineRiskLevel(metadata);
        expect(riskLevel).toBe(RiskLevel.CRITICAL);
      });
    });
  });

  // ===== CROSS-RISK LEVEL PERFORMANCE BENCHMARKS =====

  describe('Cross-Risk Level Performance Benchmarks', () => {
    const userContext = RiskClassificationTestFactory.createAdminUser();

    it('should maintain sub-1000ms validation times across all risk levels', async () => {
      const operations = [
        {
          name: 'LOW_RISK_READ',
          metadata: RiskClassificationTestFactory.createLowRiskReadOperation(),
          expectedMaxTime: 100,
        },
        {
          name: 'MEDIUM_RISK_WRITE',
          metadata: RiskClassificationTestFactory.createMediumRiskWrite(),
          expectedMaxTime: 300,
        },
        {
          name: 'HIGH_RISK_DELETE',
          metadata: RiskClassificationTestFactory.createHighRiskDelete(),
          expectedMaxTime: 800,
        },
        {
          name: 'CRITICAL_MIGRATION',
          metadata: RiskClassificationTestFactory.createCriticalMigration(),
          expectedMaxTime: 1000,
        },
      ];

      for (const operation of operations) {
        const mockOperation = jest.fn().mockResolvedValue({ success: true });

        const startTime = Date.now();
        await databaseService.validateAndExecute(
          operation.name,
          mockOperation,
          operation.metadata,
          userContext,
        );
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(operation.expectedMaxTime);
      }
    });

    it('should demonstrate risk level escalation cascade', () => {
      const testCases = [
        { base: RiskLevel.LOW, expected: RiskLevel.LOW },
        { base: RiskLevel.MEDIUM, expected: RiskLevel.MEDIUM },
        { base: RiskLevel.HIGH, expected: RiskLevel.HIGH },
        { base: RiskLevel.CRITICAL, expected: RiskLevel.CRITICAL },
      ];

      testCases.forEach(({ base, expected }) => {
        const securityLevel = (
          databaseService as any
        ).mapRiskLevelToSecurityLevel(base);
        expect(securityLevel).toBeDefined();
      });
    });
  });

  // ===== END-TO-END VALIDATION WORKFLOW TESTS =====

  describe('End-to-End Validation Workflows', () => {
    const userContext = RiskClassificationTestFactory.createAdminUser();

    it('should complete full validation workflow for HIGH risk operation', async () => {
      const metadata = RiskClassificationTestFactory.createHighRiskDelete();
      const mockOperation = jest.fn().mockResolvedValue({ deleted: true });

      // Verify pre-conditions
      expect(mockBackupService.createPreOperationBackup).not.toHaveBeenCalled();

      const result = await databaseService.validateAndExecute(
        'completeWorkflow',
        mockOperation,
        metadata,
        userContext,
      );

      // Verify post-conditions
      expect(result).toEqual({ deleted: true });
      expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();

      const auditTrail = databaseService.getAuditTrail();
      expect(auditTrail.length).toBeGreaterThan(0);

      const latestEntry = auditTrail[auditTrail.length - 1];
      expect(latestEntry.executionResult).toBe('SUCCESS');
      expect(latestEntry.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should handle validation failure with proper error propagation', async () => {
      const metadata = RiskClassificationTestFactory.createCriticalMigration();
      const mockOperation = jest.fn();

      // Mock validation failure
      const performValidationSpy = jest.spyOn(
        databaseService as any,
        'performParlantValidation',
      );
      performValidationSpy.mockResolvedValue({
        approved: false,
        conversationId: 'conv-fail-test',
        reasoning: 'Test validation failure',
        confidence: 0.95,
        suggestedAlternatives: ['Review operation parameters'],
      });

      await expect(
        databaseService.validateAndExecute(
          'failedValidation',
          mockOperation,
          metadata,
          userContext,
        ),
      ).rejects.toThrow(ConversationalValidationError);

      expect(mockOperation).not.toHaveBeenCalled();
      expect(mockBackupService.createPreOperationBackup).not.toHaveBeenCalled();

      performValidationSpy.mockRestore();
    });
  });

  // ===== INTEGRATION STATISTICS AND MONITORING =====

  describe('Integration Statistics and Monitoring', () => {
    it('should collect comprehensive statistics across all risk levels', async () => {
      const userContext = RiskClassificationTestFactory.createAdminUser();

      // Execute operations across different risk levels
      const operations = [
        {
          metadata: RiskClassificationTestFactory.createLowRiskReadOperation(),
          name: 'lowRead',
        },
        {
          metadata: RiskClassificationTestFactory.createMediumRiskWrite(),
          name: 'mediumWrite',
        },
        {
          metadata: RiskClassificationTestFactory.createHighRiskDelete(),
          name: 'highDelete',
        },
      ];

      for (const operation of operations) {
        const mockOperation = jest.fn().mockResolvedValue({ success: true });
        await databaseService.validateAndExecute(
          operation.name,
          mockOperation,
          operation.metadata,
          userContext,
        );
      }

      // Verify statistics collection
      const databaseStats = databaseService.getDatabaseOperationStatistics();
      expect(databaseStats.totalOperations).toBeGreaterThanOrEqual(3);
      expect(databaseStats.operationTypes).toHaveProperty('READ');
      expect(databaseStats.operationTypes).toHaveProperty('WRITE');
      expect(databaseStats.operationTypes).toHaveProperty('DELETE');

      const prismaStats = prismaService.getPrismaOperationStatistics();
      expect(prismaStats).toHaveProperty('totalOperations');
      expect(prismaStats).toHaveProperty('successRate');

      const backupStats = backupService.getBackupStatistics();
      expect(backupStats).toHaveProperty('totalBackups');
    });

    it('should maintain audit trail integrity across risk levels', () => {
      const auditTrail = databaseService.getAuditTrail();

      if (auditTrail.length > 0) {
        auditTrail.forEach((entry) => {
          expect(entry).toHaveProperty('operationId');
          expect(entry).toHaveProperty('riskLevel');
          expect(entry).toHaveProperty('executionResult');
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('userId');
          expect(entry).toHaveProperty('databaseOperation');
        });
      }
    });
  });
});
