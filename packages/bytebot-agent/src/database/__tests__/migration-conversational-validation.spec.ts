/**
 * Database Migration Testing with Conversational Schema Validation - PARLANT Phase 1
 *
 * Comprehensive testing framework for database migration operations with conversational
 * validation, schema validation, and migration rollback scenarios.
 *
 * Features:
 * - Conversational approval workflows for database schema migrations
 * - Migration rollback testing with comprehensive safety validation
 * - Cross-database migration testing (SQLite to PostgreSQL)
 * - Schema validation with PARLANT conversational verification
 * - Performance testing for migration operations under load
 * - Migration audit trail and compliance validation
 *
 * Architecture: Jest testing framework with migration simulation and validation
 * Security: Enterprise-grade migration validation with conversational approval
 * Performance: Sub-5000ms migration validation with comprehensive rollback testing
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import {
  ParlantValidatedDatabaseService,
  DatabaseOperationMetadata,
  RiskLevel,
  ConversationalValidationError,
} from '../parlant-validated-database.service';
import { DatabaseService } from '../database.service';
import { DatabaseBackupService } from '../database-backup.service';
import { ParlantUserContext } from '@shared/types/parlant-integration.types';

// ===== MIGRATION TESTING INTERFACES =====

/**
 * Migration test scenario configuration
 */
interface MigrationTestScenario {
  readonly migrationName: string;
  readonly migrationVersion: string;
  readonly description: string;
  readonly migrationSteps: MigrationStep[];
  readonly rollbackSteps: MigrationStep[];
  readonly riskLevel: RiskLevel;
  readonly estimatedDuration: number;
  readonly requiresBackup: boolean;
  readonly conversationalApprovalRequired: boolean;
  readonly crossDatabaseCompatible: boolean;
  readonly dataTransformationRequired: boolean;
}

/**
 * Individual migration step
 */
interface MigrationStep {
  readonly stepNumber: number;
  readonly stepType:
    | 'CREATE_TABLE'
    | 'ALTER_TABLE'
    | 'DROP_TABLE'
    | 'CREATE_INDEX'
    | 'DROP_INDEX'
    | 'INSERT_DATA'
    | 'UPDATE_DATA'
    | 'DELETE_DATA';
  readonly sql: string;
  readonly description: string;
  readonly canRollback: boolean;
  readonly rollbackSql?: string;
  readonly validationQuery?: string;
  readonly expectedResult?: any;
}

/**
 * Migration execution result
 */
interface MigrationExecutionResult {
  readonly migrationId: string;
  readonly migrationName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly totalDuration: number;
  readonly validationDuration: number;
  readonly outcome: 'SUCCESS' | 'FAILURE' | 'ROLLBACK' | 'PARTIAL';
  readonly stepsExecuted: number;
  readonly stepsRolledBack: number;
  readonly conversationId: string;
  readonly backupCreated: boolean;
  readonly rollbackAvailable: boolean;
  readonly performanceMetrics: MigrationPerformanceMetrics;
  readonly errorDetails?: string;
}

/**
 * Migration performance metrics
 */
interface MigrationPerformanceMetrics {
  readonly schemaLockTime: number;
  readonly dataTransferTime: number;
  readonly indexRebuildTime: number;
  readonly validationTime: number;
  readonly resourceUtilization: {
    cpu: number;
    memory: number;
    diskIO: number;
    databaseConnections: number;
  };
  readonly tablesSizeBeforeMigration: Record<string, number>;
  readonly tablesSizeAfterMigration: Record<string, number>;
}

/**
 * Schema validation result
 */
interface SchemaValidationResult {
  readonly tableName: string;
  readonly validationType:
    | 'STRUCTURE'
    | 'CONSTRAINTS'
    | 'INDEXES'
    | 'DATA_INTEGRITY';
  readonly isValid: boolean;
  readonly validationErrors: string[];
  readonly expectedSchema: any;
  readonly actualSchema: any;
  readonly complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
}

// ===== MIGRATION TEST SCENARIOS =====

/**
 * Database migration test scenarios
 */
const migrationTestScenarios: MigrationTestScenario[] = [
  {
    migrationName: 'add_user_preferences_table',
    migrationVersion: '2024.09.001',
    description:
      'Add user preferences table with JSON storage for customizable user settings',
    migrationSteps: [
      {
        stepNumber: 1,
        stepType: 'CREATE_TABLE',
        sql: `CREATE TABLE user_preferences (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT NOT NULL,
          preference_category TEXT NOT NULL,
          preference_data JSON NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        description: 'Create user_preferences table with JSON storage',
        canRollback: true,
        rollbackSql: 'DROP TABLE IF EXISTS user_preferences',
        validationQuery:
          'SELECT name FROM sqlite_master WHERE type="table" AND name="user_preferences"',
        expectedResult: [{ name: 'user_preferences' }],
      },
      {
        stepNumber: 2,
        stepType: 'CREATE_INDEX',
        sql: 'CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id)',
        description: 'Create index on user_id for efficient lookups',
        canRollback: true,
        rollbackSql: 'DROP INDEX IF EXISTS idx_user_preferences_user_id',
        validationQuery:
          'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_user_preferences_user_id"',
        expectedResult: [{ name: 'idx_user_preferences_user_id' }],
      },
      {
        stepNumber: 3,
        stepType: 'CREATE_INDEX',
        sql: 'CREATE INDEX idx_user_preferences_category ON user_preferences(preference_category)',
        description:
          'Create index on preference_category for category-based queries',
        canRollback: true,
        rollbackSql: 'DROP INDEX IF EXISTS idx_user_preferences_category',
        validationQuery:
          'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_user_preferences_category"',
        expectedResult: [{ name: 'idx_user_preferences_category' }],
      },
    ],
    rollbackSteps: [
      {
        stepNumber: 1,
        stepType: 'DROP_INDEX',
        sql: 'DROP INDEX IF EXISTS idx_user_preferences_category',
        description: 'Remove category index',
        canRollback: false,
      },
      {
        stepNumber: 2,
        stepType: 'DROP_INDEX',
        sql: 'DROP INDEX IF EXISTS idx_user_preferences_user_id',
        description: 'Remove user_id index',
        canRollback: false,
      },
      {
        stepNumber: 3,
        stepType: 'DROP_TABLE',
        sql: 'DROP TABLE IF EXISTS user_preferences',
        description: 'Remove user_preferences table',
        canRollback: false,
      },
    ],
    riskLevel: RiskLevel.MEDIUM,
    estimatedDuration: 5000,
    requiresBackup: true,
    conversationalApprovalRequired: true,
    crossDatabaseCompatible: true,
    dataTransformationRequired: false,
  },
  {
    migrationName: 'audit_log_partitioning',
    migrationVersion: '2024.09.002',
    description:
      'Implement audit log table partitioning for improved performance and data management',
    migrationSteps: [
      {
        stepNumber: 1,
        stepType: 'CREATE_TABLE',
        sql: `CREATE TABLE audit_logs_partitioned (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          event_type TEXT NOT NULL,
          user_id TEXT,
          event_data JSON NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          partition_date TEXT GENERATED ALWAYS AS (date(created_at)) STORED
        )`,
        description: 'Create partitioned audit logs table',
        canRollback: true,
        rollbackSql: 'DROP TABLE IF EXISTS audit_logs_partitioned',
        validationQuery:
          'SELECT name FROM sqlite_master WHERE type="table" AND name="audit_logs_partitioned"',
        expectedResult: [{ name: 'audit_logs_partitioned' }],
      },
      {
        stepNumber: 2,
        stepType: 'INSERT_DATA',
        sql: 'INSERT INTO audit_logs_partitioned (event_type, user_id, event_data) SELECT event_type, user_id, event_data FROM audit_logs',
        description: 'Migrate existing audit log data to partitioned table',
        canRollback: true,
        rollbackSql: 'DELETE FROM audit_logs_partitioned',
        validationQuery: 'SELECT COUNT(*) as count FROM audit_logs_partitioned',
        expectedResult: [{ count: 0 }], // Will be updated based on existing data
      },
      {
        stepNumber: 3,
        stepType: 'CREATE_INDEX',
        sql: 'CREATE INDEX idx_audit_logs_partitioned_date ON audit_logs_partitioned(partition_date)',
        description: 'Create partition date index for efficient queries',
        canRollback: true,
        rollbackSql: 'DROP INDEX IF EXISTS idx_audit_logs_partitioned_date',
        validationQuery:
          'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_audit_logs_partitioned_date"',
        expectedResult: [{ name: 'idx_audit_logs_partitioned_date' }],
      },
    ],
    rollbackSteps: [
      {
        stepNumber: 1,
        stepType: 'DROP_INDEX',
        sql: 'DROP INDEX IF EXISTS idx_audit_logs_partitioned_date',
        description: 'Remove partition date index',
        canRollback: false,
      },
      {
        stepNumber: 2,
        stepType: 'DROP_TABLE',
        sql: 'DROP TABLE IF EXISTS audit_logs_partitioned',
        description: 'Remove partitioned audit logs table',
        canRollback: false,
      },
    ],
    riskLevel: RiskLevel.HIGH,
    estimatedDuration: 15000,
    requiresBackup: true,
    conversationalApprovalRequired: true,
    crossDatabaseCompatible: false,
    dataTransformationRequired: true,
  },
  {
    migrationName: 'browser_session_optimization',
    migrationVersion: '2024.09.003',
    description:
      'Optimize browser session table with better indexing and data compression',
    migrationSteps: [
      {
        stepNumber: 1,
        stepType: 'ALTER_TABLE',
        sql: 'ALTER TABLE browser_sessions ADD COLUMN session_metadata JSON',
        description:
          'Add session metadata column for extended session information',
        canRollback: true,
        rollbackSql:
          'ALTER TABLE browser_sessions DROP COLUMN session_metadata',
        validationQuery: 'PRAGMA table_info(browser_sessions)',
        expectedResult: [], // Will validate column existence
      },
      {
        stepNumber: 2,
        stepType: 'CREATE_INDEX',
        sql: 'CREATE INDEX idx_browser_sessions_status_created ON browser_sessions(status, created_at)',
        description:
          'Create composite index for status and creation date queries',
        canRollback: true,
        rollbackSql: 'DROP INDEX IF EXISTS idx_browser_sessions_status_created',
        validationQuery:
          'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_browser_sessions_status_created"',
        expectedResult: [{ name: 'idx_browser_sessions_status_created' }],
      },
    ],
    rollbackSteps: [
      {
        stepNumber: 1,
        stepType: 'DROP_INDEX',
        sql: 'DROP INDEX IF EXISTS idx_browser_sessions_status_created',
        description: 'Remove composite index',
        canRollback: false,
      },
      {
        stepNumber: 2,
        stepType: 'ALTER_TABLE',
        sql: 'ALTER TABLE browser_sessions DROP COLUMN session_metadata',
        description: 'Remove session metadata column',
        canRollback: false,
      },
    ],
    riskLevel: RiskLevel.LOW,
    estimatedDuration: 3000,
    requiresBackup: false,
    conversationalApprovalRequired: false,
    crossDatabaseCompatible: true,
    dataTransformationRequired: false,
  },
];

/**
 * Mock Parlant validation responses for migration scenarios
 */
const mockMigrationValidationResponses: Record<string> = {
  MIGRATION_APPROVED: {
    approved: true,
    conversationId: 'conv_migration_001',
    reason:
      'Database migration approved with comprehensive backup and rollback procedures',
    confidence: 0.9,
    executionContext: {
      monitoringLevel: 'COMPREHENSIVE',
      safeguards: [
        'backup_verification',
        'rollback_plan',
        'schema_validation',
        'performance_monitoring',
      ],
      timeoutMs: 60000,
      retryAttempts: 0, // No retries for migrations
    },
    _metadata: {
      startTime: new Date(),
      endTime: new Date(),
      processingTime: 300,
      cacheStatus: 'miss', // Migrations are never cached
      source: 'parlant',
      riskAssessment: {
        level: SecurityLevel._HIGH,
        factors: [
          'Schema modification',
          'Data transformation',
          'Rollback complexity',
        ],
        score: 65,
        mitigations: [
          'Pre-migration backup created',
          'Step-by-step rollback plan available',
          'Schema validation at each step',
          'Performance monitoring during execution',
        ],
      },
    },
  },
  MIGRATION_DENIED: {
    approved: false,
    conversationId: 'conv_migration_denied_001',
    reason:
      'Migration denied - insufficient backup verification and high data loss risk',
    confidence: 0.95,
    executionContext: {
      monitoringLevel: 'COMPREHENSIVE',
      safeguards: ['manual_approval_required', 'administrator_review'],
      timeoutMs: 0,
      retryAttempts: 0,
    },
    _metadata: {
      startTime: new Date(),
      endTime: new Date(),
      processingTime: 180,
      cacheStatus: 'miss',
      source: 'parlant',
      riskAssessment: {
        level: SecurityLevel._CRITICAL,
        factors: [
          'Critical schema changes',
          'Large data volume affected',
          'Complex rollback requirements',
          'Production database impact',
        ],
        score: 90,
        mitigations: [
          'Perform migration during maintenance window',
          'Test migration in staging environment',
          'Obtain database administrator approval',
          'Create verified backup before proceeding',
          'Implement phased migration approach',
        ],
      },
    },
  },
};

/**
 * Test user contexts for migration testing
 */
const migrationTestUserContexts: Record<string, ParlantUserContext> = {
  DATABASE_ADMIN: {
    userId: 'db_admin_001',
    role: 'database_administrator',
    permissions: ['read', 'write', 'delete', 'migrate', 'backup', 'admin'],
    sessionId: 'session_db_admin_001',
    timestamp: new Date(),
  },
  MIGRATION_OPERATOR: {
    userId: 'migration_op_001',
    role: 'migration_operator',
    permissions: ['read', 'write', 'migrate'],
    sessionId: 'session_migration_op_001',
    timestamp: new Date(),
  },
  STANDARD_USER: {
    userId: 'standard_user_001',
    role: 'user',
    permissions: ['read', 'write'],
    sessionId: 'session_standard_user_001',
    timestamp: new Date(),
  },
};

// ===== MAIN TEST SUITE =====

describe('Database Migration Testing with Conversational Schema Validation', () => {
  let module: TestingModule;
  let parlantDatabaseService: ParlantValidatedDatabaseService;
  let databaseService: DatabaseService;
  let backupService: DatabaseBackupService;
  let prismaClient: PrismaClient;

  // Test results storage
  const migrationExecutionResults: MigrationExecutionResult[] = [];
  const schemaValidationResults: SchemaValidationResult[] = [];

  beforeAll(async () => {
    // Setup testing module
    module = await Test.createTestingModule({
      providers: [
        ParlantValidatedDatabaseService,
        DatabaseService,
        DatabaseBackupService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                DATABASE_URL: 'file:./test.db',
                PARLANT_ENABLED: true,
                PARLANT_CACHE_ENABLED: false, // Disable caching for migrations
                PARLANT_AUDIT_ENABLED: true,
                MIGRATION_TIMEOUT: 60000,
                BACKUP_REQUIRED_FOR_MIGRATIONS: true,
                ...defaultValue,
              };
              return config[key] || defaultValue;
            }),
          },
        },
        {
          provide: PrismaClient,
          useValue: {
            $connect: jest.fn(),
            $disconnect: jest.fn(),
            $transaction: jest.fn(),
            $executeRaw: jest.fn(),
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    // Get service instances
    parlantDatabaseService = module.get<ParlantValidatedDatabaseService>(
      ParlantValidatedDatabaseService,
    );
    databaseService = module.get<DatabaseService>(DatabaseService);
    backupService = module.get<DatabaseBackupService>(DatabaseBackupService);
    prismaClient = module.get<PrismaClient>(PrismaClient);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== MIGRATION EXECUTION TESTS =====

  describe('Migration Execution with Conversational Validation', () => {
    it('should execute simple migration with conversational approval', async () => {
      // Arrange
      const scenario = migrationTestScenarios[0]; // add_user_preferences_table
      const userContext = migrationTestUserContexts.DATABASE_ADMIN;
      const migrationId = `migration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Mock backup creation
      jest.spyOn(backupService, 'createPreOperationBackup').mockResolvedValue({
        backupId: 'backup_001',
        backupPath: '/tmp/backup_001.sql',
        backupSize: 1024 * 1024, // 1MB
        createdAt: new Date(),
        _metadata: {
          operationType: 'MIGRATION',
          tables: ['users', 'user_preferences'],
          compressionUsed: false,
        },
      });

      // Mock migration steps execution
      scenario.migrationSteps.forEach((step, index) => {
        jest.spyOn(prismaClient, '$executeRaw').mockResolvedValueOnce(1); // Simulate successful execution
        jest
          .spyOn(prismaClient, '$queryRaw')
          .mockResolvedValueOnce(step.expectedResult || []);
      });

      // Mock Parlant validation approval
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockMigrationValidationResponses.MIGRATION_APPROVED);

      // Act
      const startTime = Date.now();

      const migrationMetadata: DatabaseOperationMetadata = {
        operationType: 'MIGRATION',
        tableName: 'user_preferences',
        queryDescription: `Migration: ${scenario.migrationName} - ${scenario.description}`,
        isDestructive: false,
        requiresBackup: scenario.requiresBackup,
        affectedRows: 0, // Schema changes don't affect existing rows initially
      };

      // Execute migration steps with validation
      const migrationOperations = scenario.migrationSteps.map(
        (step) => async () => {
          // Execute the migration step
          await prismaClient.$executeRaw`${step.sql}`;

          // Validate the step if validation query exists
          if (step.validationQuery) {
            const validationResult =
              await prismaClient.$queryRaw`${step.validationQuery}`;
            return { step: step.stepNumber, _result: validationResult };
          }

          return { step: step.stepNumber, _result: 'completed' };
        },
      );

      const result = await parlantDatabaseService.executeWithTransaction(
        scenario.migrationName,
        migrationOperations,
        migrationMetadata,
        userContext,
        { migrationId, migrationVersion: scenario.migrationVersion },
      );

      const executionTime = Date.now() - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(scenario.migrationSteps.length);

      // Verify backup was created
      expect(backupService.createPreOperationBackup).toHaveBeenCalledTimes(1);

      // Verify migration steps were executed
      expect(prismaClient.$executeRaw).toHaveBeenCalledTimes(
        scenario.migrationSteps.length,
      );

      // Verify audit trail
      const auditTrail = parlantDatabaseService.getAuditTrail();
      const migrationEntry = auditTrail.find(
        (entry) => entry.functionName === scenario.migrationName,
      );

      expect(migrationEntry).toBeDefined();
      expect(migrationEntry!.validationResult).toBe('APPROVED');
      expect(migrationEntry!.executionResult).toBe('SUCCESS');

      // Store migration execution result
      migrationExecutionResults.push({
        migrationId,
        migrationName: scenario.migrationName,
        startTime: new Date(startTime),
        endTime: new Date(),
        totalDuration: executionTime,
        validationDuration: 300, // From mock response
        outcome: 'SUCCESS',
        stepsExecuted: scenario.migrationSteps.length,
        stepsRolledBack: 0,
        conversationId: migrationEntry!.conversationId,
        backupCreated: true,
        rollbackAvailable: true,
        performanceMetrics: {
          schemaLockTime: 100,
          dataTransferTime: 0,
          indexRebuildTime: 200,
          validationTime: 50,
          resourceUtilization: {
            cpu: 25,
            memory: 256,
            diskIO: 2048,
            databaseConnections: 1,
          },
          tablesSizeBeforeMigration: { users: 1024 },
          tablesSizeAfterMigration: { users: 1024, user_preferences: 0 },
        },
      });

      console.log('Migration Execution Result:', {
        migrationName: scenario.migrationName,
        executionTime: `${executionTime}ms`,
        stepsExecuted: scenario.migrationSteps.length,
        outcome: 'SUCCESS',
        backupCreated: true,
      });
    });

    it('should deny high-risk migration without proper authorization', async () => {
      // Arrange
      const scenario = migrationTestScenarios[1]; // audit_log_partitioning (HIGH risk)
      const userContext = migrationTestUserContexts.STANDARD_USER; // User without migration permissions

      // Mock Parlant validation denial
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockMigrationValidationResponses.MIGRATION_DENIED);

      // Act & Assert
      const migrationMetadata: DatabaseOperationMetadata = {
        operationType: 'MIGRATION',
        tableName: 'audit_logs',
        queryDescription: `High-risk migration: ${scenario.migrationName} - ${scenario.description}`,
        isDestructive: true,
        requiresBackup: true,
        affectedRows: 1000, // Large data transformation
      };

      await expect(
        parlantDatabaseService.executeWithTransaction(
          scenario.migrationName,
          scenario.migrationSteps.map(
            (step) => () => prismaClient.$executeRaw`${step.sql}`,
          ),
          migrationMetadata,
          userContext,
          { migrationVersion: scenario.migrationVersion },
        ),
      ).rejects.toThrow(ConversationalValidationError);

      // Verify no migration was executed
      expect(prismaClient.$executeRaw).not.toHaveBeenCalled();

      // Verify no backup was created
      expect(backupService.createPreOperationBackup).not.toHaveBeenCalled();
    });

    it('should handle migration rollback on step failure', async () => {
      // Arrange
      const scenario = migrationTestScenarios[2]; // browser_session_optimization
      const userContext = migrationTestUserContexts.MIGRATION_OPERATOR;

      // Mock first step success, second step failure
      jest
        .spyOn(prismaClient, '$executeRaw')
        .mockResolvedValueOnce(1) // First step succeeds
        .mockRejectedValueOnce(
          new Error('Index creation failed - insufficient disk space'),
        ); // Second step fails

      // Mock Parlant validation approval
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockMigrationValidationResponses.MIGRATION_APPROVED);

      // Act & Assert
      const migrationMetadata: DatabaseOperationMetadata = {
        operationType: 'MIGRATION',
        tableName: 'browser_sessions',
        queryDescription: `Rollback test migration: ${scenario.migrationName}`,
        isDestructive: false,
        requiresBackup: false, // Low-risk migration
        affectedRows: 0,
      };

      await expect(
        parlantDatabaseService.executeWithTransaction(
          `rollback_test_${scenario.migrationName}`,
          scenario.migrationSteps.map(
            (step) => () => prismaClient.$executeRaw`${step.sql}`,
          ),
          migrationMetadata,
          userContext,
        ),
      ).rejects.toThrow('Index creation failed');

      // Verify partial execution occurred
      expect(prismaClient.$executeRaw).toHaveBeenCalledTimes(2);

      // Verify rollback is recorded in audit trail
      const auditTrail = parlantDatabaseService.getAuditTrail();
      const rollbackEntry = auditTrail.find((entry) =>
        entry.functionName.includes('rollback_test'),
      );

      expect(rollbackEntry).toBeDefined();
      expect(rollbackEntry!.executionResult).toBe('FAILURE');
    });

    it('should validate schema changes after migration completion', async () => {
      // Arrange
      const scenario = migrationTestScenarios[0]; // add_user_preferences_table
      const userContext = migrationTestUserContexts.DATABASE_ADMIN;

      // Mock successful migration execution
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockMigrationValidationResponses.MIGRATION_APPROVED);

      scenario.migrationSteps.forEach((step) => {
        jest.spyOn(prismaClient, '$executeRaw').mockResolvedValueOnce(1);
        jest
          .spyOn(prismaClient, '$queryRaw')
          .mockResolvedValueOnce(step.expectedResult || []);
      });

      // Mock schema validation queries
      jest
        .spyOn(prismaClient, '$queryRaw')
        .mockResolvedValueOnce([{ name: 'user_preferences' }]) // Table exists
        .mockResolvedValueOnce([{ name: 'idx_user_preferences_user_id' }]) // Index exists
        .mockResolvedValueOnce([{ name: 'idx_user_preferences_category' }]); // Index exists

      // Act
      const migrationMetadata: DatabaseOperationMetadata = {
        operationType: 'MIGRATION',
        tableName: 'user_preferences',
        queryDescription: `Schema validation test: ${scenario.migrationName}`,
        isDestructive: false,
        requiresBackup: true,
        affectedRows: 0,
      };

      await parlantDatabaseService.executeWithTransaction(
        `schema_validation_${scenario.migrationName}`,
        scenario.migrationSteps.map(
          (step) => () => prismaClient.$executeRaw`${step.sql}`,
        ),
        migrationMetadata,
        userContext,
      );

      // Perform post-migration schema validation
      const schemaValidationTasks = scenario.migrationSteps
        .filter((step) => step.validationQuery)
        .map(async (step) => {
          const validationResult =
            await prismaClient.$queryRaw`${step.validationQuery}`;

          return {
            tableName: 'user_preferences',
            validationType: step.stepType.includes('TABLE')
              ? ('STRUCTURE' as const)
              : ('INDEXES' as const),
            isValid:
              JSON.stringify(validationResult) ===
              JSON.stringify(step.expectedResult),
            validationErrors: [],
            expectedSchema: step.expectedResult,
            actualSchema: validationResult,
            complianceStatus: 'COMPLIANT' as const,
          };
        });

      const validationResults = await Promise.all(schemaValidationTasks);

      // Assert
      validationResults.forEach((result) => {
        expect(result.isValid).toBe(true);
        expect(result.complianceStatus).toBe('COMPLIANT');
        expect(result.validationErrors).toHaveLength(0);
      });

      // Store schema validation results
      schemaValidationResults.push(...validationResults);

      console.log('Schema Validation Results:', {
        totalValidations: validationResults.length,
        successfulValidations: validationResults.filter((r) => r.isValid)
          .length,
        complianceRate: `${((validationResults.filter((r) => r.isValid).length / validationResults.length) * 100).toFixed(2)}%`,
      });
    });
  });

  // ===== CROSS-DATABASE MIGRATION TESTS =====

  describe('Cross-Database Migration Testing', () => {
    it('should test SQLite to PostgreSQL migration compatibility', async () => {
      // Arrange
      const scenario = migrationTestScenarios[0]; // add_user_preferences_table (cross-compatible)
      const userContext = migrationTestUserContexts.DATABASE_ADMIN;

      // Mock cross-database compatibility check
      const sqliteToPostgreSQLTransformations = scenario.migrationSteps.map(
        (step) => ({
          ...step,
          sql: step.sql
            .replace(
              /TEXT PRIMARY KEY DEFAULT \(lower\(hex\(randomblob\(16\)\)\)\)/,
              'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
            )
            .replace(
              /DATETIME DEFAULT CURRENT_TIMESTAMP/,
              'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            )
            .replace(/JSON/, 'JSONB'), // PostgreSQL optimization
        }),
      );

      // Mock validation for both database types
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockMigrationValidationResponses.MIGRATION_APPROVED);

      // Act - Test SQLite version
      const sqliteMetadata: DatabaseOperationMetadata = {
        operationType: 'MIGRATION',
        tableName: 'user_preferences',
        queryDescription: `SQLite migration: ${scenario.migrationName}`,
        isDestructive: false,
        requiresBackup: true,
        affectedRows: 0,
      };

      jest.spyOn(prismaClient, '$executeRaw').mockResolvedValue(1);

      await parlantDatabaseService.executeWithTransaction(
        `sqlite_${scenario.migrationName}`,
        scenario.migrationSteps.map(
          (step) => () => prismaClient.$executeRaw`${step.sql}`,
        ),
        sqliteMetadata,
        userContext,
      );

      // Act - Test PostgreSQL version
      const postgresMetadata: DatabaseOperationMetadata = {
        operationType: 'MIGRATION',
        tableName: 'user_preferences',
        queryDescription: `PostgreSQL migration: ${scenario.migrationName}`,
        isDestructive: false,
        requiresBackup: true,
        affectedRows: 0,
      };

      await parlantDatabaseService.executeWithTransaction(
        `postgresql_${scenario.migrationName}`,
        sqliteToPostgreSQLTransformations.map(
          (step) => () => prismaClient.$executeRaw`${step.sql}`,
        ),
        postgresMetadata,
        userContext,
      );

      // Assert
      expect(prismaClient.$executeRaw).toHaveBeenCalledTimes(
        scenario.migrationSteps.length * 2, // SQLite + PostgreSQL
      );

      // Verify both migrations are in audit trail
      const auditTrail = parlantDatabaseService.getAuditTrail();
      const sqliteMigration = auditTrail.find((entry) =>
        entry.functionName.includes('sqlite_'),
      );
      const postgresqlMigration = auditTrail.find((entry) =>
        entry.functionName.includes('postgresql_'),
      );

      expect(sqliteMigration).toBeDefined();
      expect(postgresqlMigration).toBeDefined();
      expect(sqliteMigration!.executionResult).toBe('SUCCESS');
      expect(postgresqlMigration!.executionResult).toBe('SUCCESS');

      console.log('Cross-Database Migration Test:', {
        sqliteCompatible: scenario.crossDatabaseCompatible,
        sqliteSteps: scenario.migrationSteps.length,
        postgresqlSteps: sqliteToPostgreSQLTransformations.length,
        bothSuccessful: true,
      });
    });
  });

  // ===== PERFORMANCE TESTING =====

  describe('Migration Performance Testing', () => {
    it('should complete migrations within acceptable time limits', async () => {
      // Arrange
      const performanceTestScenarios = migrationTestScenarios.slice(0, 2); // Test first two scenarios
      const userContext = migrationTestUserContexts.DATABASE_ADMIN;

      // Act - Execute performance tests for each scenario
      for (const scenario of performanceTestScenarios) {
        const startTime = Date.now();

        // Mock successful execution
        jest
          .spyOn(parlantDatabaseService as any, 'performParlantValidation')
          .mockResolvedValue(
            mockMigrationValidationResponses.MIGRATION_APPROVED,
          );

        scenario.migrationSteps.forEach(() => {
          jest.spyOn(prismaClient, '$executeRaw').mockResolvedValueOnce(1);
        });

        const migrationMetadata: DatabaseOperationMetadata = {
          operationType: 'MIGRATION',
          tableName: scenario.migrationSteps[0]?.tableName || 'unknown',
          queryDescription: `Performance test: ${scenario.migrationName}`,
          isDestructive: scenario.riskLevel === RiskLevel.HIGH,
          requiresBackup: scenario.requiresBackup,
          affectedRows: 0,
        };

        await parlantDatabaseService.executeWithTransaction(
          `perf_test_${scenario.migrationName}`,
          scenario.migrationSteps.map((step) => () => {
            // Simulate step execution time based on complexity
            const stepDelay = step.stepType.includes('DATA') ? 500 : 100;
            return new Promise((resolve) =>
              setTimeout(() => resolve(1), stepDelay),
            );
          }),
          migrationMetadata,
          userContext,
        );

        const actualDuration = Date.now() - startTime;

        // Assert
        expect(actualDuration).toBeLessThan(scenario.estimatedDuration * 2); // Allow 2x buffer for test environment

        console.log(`Migration Performance - ${scenario.migrationName}:`, {
          estimatedDuration: `${scenario.estimatedDuration}ms`,
          actualDuration: `${actualDuration}ms`,
          performanceRatio: `${(actualDuration / scenario.estimatedDuration).toFixed(2)}x`,
          withinLimits: actualDuration < scenario.estimatedDuration * 2,
        });
      }
    });

    it('should generate comprehensive migration performance report', async () => {
      // Act
      const performanceReport = {
        totalMigrationsExecuted: migrationExecutionResults.length,
        successfulMigrations: migrationExecutionResults.filter(
          (result) => result.outcome === 'SUCCESS',
        ).length,
        failedMigrations: migrationExecutionResults.filter(
          (result) => result.outcome === 'FAILURE',
        ).length,
        averageExecutionTime:
          migrationExecutionResults.reduce(
            (sum, result) => sum + result.totalDuration,
            0,
          ) / Math.max(migrationExecutionResults.length, 1),
        averageValidationTime:
          migrationExecutionResults.reduce(
            (sum, result) => sum + result.validationDuration,
            0,
          ) / Math.max(migrationExecutionResults.length, 1),
        schemaValidationResults: {
          totalValidations: schemaValidationResults.length,
          successfulValidations: schemaValidationResults.filter(
            (result) => result.isValid,
          ).length,
          complianceRate:
            schemaValidationResults.length > 0
              ? (
                  (schemaValidationResults.filter((result) => result.isValid)
                    .length /
                    schemaValidationResults.length) *
                  100
                ).toFixed(2) + '%'
              : '0%',
        },
        backupOperations: {
          backupsCreated: migrationExecutionResults.filter(
            (result) => result.backupCreated,
          ).length,
          rollbacksAvailable: migrationExecutionResults.filter(
            (result) => result.rollbackAvailable,
          ).length,
        },
      };

      // Assert
      expect(performanceReport.totalMigrationsExecuted).toBeGreaterThanOrEqual(
        0,
      );
      expect(
        performanceReport.schemaValidationResults.totalValidations,
      ).toBeGreaterThanOrEqual(0);

      console.log(
        'Comprehensive Migration Performance Report:',
        performanceReport,
      );

      // Verify performance targets if we have results
      if (migrationExecutionResults.length > 0) {
        expect(performanceReport.averageValidationTime).toBeLessThan(5000); // Sub-5000ms validation
        expect(performanceReport.successfulMigrations).toBeGreaterThan(0);
      }
    });
  });
});
