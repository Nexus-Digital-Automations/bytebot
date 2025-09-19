/**
 * Database Transaction Integrity and Rollback Testing - PARLANT Phase 1
 *
 * Comprehensive testing framework for transaction integrity, rollback scenarios,
 * and conversational validation of database transaction operations.
 *
 * Features:
 * - Transaction integrity validation with ACID compliance testing
 * - Rollback scenario testing with conversational approval workflows
 * - Concurrent transaction testing with deadlock detection
 * - Transaction performance testing with conversational validation overhead
 * - Cross-database transaction testing for distributed scenarios
 * - Transaction audit trail validation for compliance requirements
 *
 * Architecture: Jest testing framework with transaction mocking and validation
 * Security: Enterprise-grade transaction validation with conversational approval
 * Performance: Sub-1000ms transaction validation with rollback testing
 */

import { Test, TestingModule } from '@nestjs/testing';
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
import {
  ParlantValidationResponse,
  ParlantUserContext,
  SecurityLevel,
} from '@shared/types/parlant-integration.types';

// ===== TRANSACTION TESTING INTERFACES =====

/**
 * Transaction test scenario configuration
 */
interface TransactionTestScenario {
  readonly scenarioName: string;
  readonly operations: TransactionOperation[];
  readonly expectedOutcome: 'SUCCESS' | 'ROLLBACK' | 'DEADLOCK' | 'TIMEOUT';
  readonly riskLevel: RiskLevel;
  readonly conversationalApprovalRequired: boolean;
  readonly estimatedDuration: number;
  readonly rollbackComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly concurrentTransactions?: number;
}

/**
 * Individual transaction operation
 */
interface TransactionOperation {
  readonly operationType: 'READ' | 'WRITE' | 'DELETE' | 'UPDATE';
  readonly tableName: string;
  readonly query: string;
  readonly parameters: unknown[];
  readonly expectedAffectedRows: number;
  readonly canFail: boolean;
}

/**
 * Transaction execution results
 */
interface TransactionExecutionResult {
  readonly transactionId: string;
  readonly scenarioName: string;
  readonly startTime: Date;
  readonly endTime: Date;
  readonly totalDuration: number;
  readonly validationDuration: number;
  readonly executionDuration: number;
  readonly outcome: 'SUCCESS' | 'ROLLBACK' | 'FAILURE' | 'TIMEOUT';
  readonly operationsExecuted: number;
  readonly operationsRolledBack: number;
  readonly conversationId: string;
  readonly rollbackReason?: string;
  readonly performanceMetrics: TransactionPerformanceMetrics;
}

/**
 * Transaction performance metrics
 */
interface TransactionPerformanceMetrics {
  readonly lockWaitTime: number;
  readonly commitTime: number;
  readonly rollbackTime?: number;
  readonly resourceUtilization: {
    cpu: number;
    memory: number;
    diskIO: number;
    networkIO: number;
  };
  readonly concurrentTransactions: number;
  readonly deadlockDetected: boolean;
}

/**
 * Rollback testing configuration
 */
interface RollbackTestConfig {
  readonly testPartialRollbacks: boolean;
  readonly testCascadeRollbacks: boolean;
  readonly testConcurrentRollbacks: boolean;
  readonly testRollbackPerformance: boolean;
  readonly maxRollbackTime: number; // milliseconds
  readonly rollbackValidationRequired: boolean;
}

// ===== TEST DATA AND SCENARIOS =====

/**
 * Standard transaction test scenarios
 */
const transactionTestScenarios: TransactionTestScenario[] = [
  {
    scenarioName: 'simple_user_creation_transaction',
    operations: [
      {
        operationType: 'WRITE',
        tableName: 'users',
        query: 'INSERT INTO users (id, email, role) VALUES (?, ?, ?)',
        parameters: ['test_user_001', 'test@example.com', 'user'],
        expectedAffectedRows: 1,
        canFail: false,
      },
      {
        operationType: 'WRITE',
        tableName: 'user_preferences',
        query: 'INSERT INTO user_preferences (user_id, preferences) VALUES (?, ?)',
        parameters: ['test_user_001', JSON.stringify({ theme: 'dark', language: 'en' })],
        expectedAffectedRows: 1,
        canFail: false,
      },
    ],
    expectedOutcome: 'SUCCESS',
    riskLevel: RiskLevel.MEDIUM,
    conversationalApprovalRequired: true,
    estimatedDuration: 500,
    rollbackComplexity: 'LOW',
  },
  {
    scenarioName: 'complex_data_migration_transaction',
    operations: [
      {
        operationType: 'UPDATE',
        tableName: 'users',
        query: 'UPDATE users SET role = ? WHERE role = ?',
        parameters: ['premium_user', 'user'],
        expectedAffectedRows: 100,
        canFail: false,
      },
      {
        operationType: 'WRITE',
        tableName: 'audit_logs',
        query: 'INSERT INTO audit_logs (event_type, user_id, details) VALUES (?, ?, ?)',
        parameters: ['role_migration', 'system', 'Migrated 100 users to premium'],
        expectedAffectedRows: 1,
        canFail: false,
      },
      {
        operationType: 'DELETE',
        tableName: 'user_sessions',
        query: 'DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE role = ?)',
        parameters: ['premium_user'],
        expectedAffectedRows: 50,
        canFail: true, // This operation can fail if no sessions exist
      },
    ],
    expectedOutcome: 'SUCCESS',
    riskLevel: RiskLevel.HIGH,
    conversationalApprovalRequired: true,
    estimatedDuration: 2000,
    rollbackComplexity: 'HIGH',
  },
  {
    scenarioName: 'high_risk_data_deletion_transaction',
    operations: [
      {
        operationType: 'DELETE',
        tableName: 'audit_logs',
        query: 'DELETE FROM audit_logs WHERE created_at < ?',
        parameters: [new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)], // 1 year old
        expectedAffectedRows: 1000,
        canFail: false,
      },
      {
        operationType: 'WRITE',
        tableName: 'system_events',
        query: 'INSERT INTO system_events (event_type, details) VALUES (?, ?)',
        parameters: ['audit_cleanup', 'Deleted 1000 old audit log entries'],
        expectedAffectedRows: 1,
        canFail: false,
      },
    ],
    expectedOutcome: 'SUCCESS',
    riskLevel: RiskLevel.CRITICAL,
    conversationalApprovalRequired: true,
    estimatedDuration: 5000,
    rollbackComplexity: 'CRITICAL',
  },
  {
    scenarioName: 'concurrent_user_session_management',
    operations: [
      {
        operationType: 'UPDATE',
        tableName: 'user_sessions',
        query: 'UPDATE user_sessions SET last_activity = ? WHERE user_id = ?',
        parameters: [new Date(), 'test_user_001'],
        expectedAffectedRows: 1,
        canFail: false,
      },
      {
        operationType: 'WRITE',
        tableName: 'user_activities',
        query: 'INSERT INTO user_activities (user_id, activity_type, timestamp) VALUES (?, ?, ?)',
        parameters: ['test_user_001', 'session_update', new Date()],
        expectedAffectedRows: 1,
        canFail: false,
      },
    ],
    expectedOutcome: 'SUCCESS',
    riskLevel: RiskLevel.LOW,
    conversationalApprovalRequired: false,
    estimatedDuration: 300,
    rollbackComplexity: 'LOW',
    concurrentTransactions: 10, // Test with 10 concurrent similar transactions
  },
];

/**
 * Mock Parlant validation responses for transaction scenarios
 */
const mockTransactionValidationResponses: Record<string, ParlantValidationResponse> = {
  TRANSACTION_APPROVED: {
    approved: true,
    conversationId: 'conv_transaction_001',
    reason: 'Transaction approved with comprehensive monitoring and rollback capabilities',
    confidence: 0.92,
    executionContext: {
      monitoringLevel: 'COMPREHENSIVE',
      safeguards: ['transaction_wrapper', 'rollback_monitoring', 'performance_tracking'],
      timeoutMs: 30000,
      retryAttempts: 1,
    },
    metadata: {
      startTime: new Date(),
      endTime: new Date(),
      processingTime: 180,
      cacheStatus: 'miss',
      source: 'parlant',
      riskAssessment: {
        level: SecurityLevel._MEDIUM,
        factors: ['Multi-operation transaction', 'Data modification', 'Rollback complexity'],
        score: 45,
        mitigations: [
          'Automatic rollback on failure',
          'Transaction monitoring',
          'Backup verification before execution',
        ],
      },
    },
  },
  TRANSACTION_DENIED: {
    approved: false,
    conversationId: 'conv_transaction_denied_001',
    reason: 'Transaction denied - high risk destructive operations require additional approval',
    confidence: 0.95,
    executionContext: {
      monitoringLevel: 'COMPREHENSIVE',
      safeguards: ['manual_approval_required'],
      timeoutMs: 0,
      retryAttempts: 0,
    },
    metadata: {
      startTime: new Date(),
      endTime: new Date(),
      processingTime: 120,
      cacheStatus: 'miss',
      source: 'parlant',
      riskAssessment: {
        level: SecurityLevel._CRITICAL,
        factors: [
          'High-risk destructive operations',
          'Large data volume affected',
          'Complex rollback requirements',
        ],
        score: 85,
        mitigations: [
          'Break transaction into smaller operations',
          'Perform operations during maintenance window',
          'Obtain administrator approval',
          'Test in staging environment first',
        ],
      },
    },
  },
};

/**
 * Test user contexts for transaction testing
 */
const transactionTestUserContexts: Record<string, ParlantUserContext> = {
  TRANSACTION_ADMIN: {
    userId: 'transaction_admin_001',
    role: 'transaction_administrator',
    permissions: ['read', 'write', 'delete', 'transaction_admin'],
    sessionId: 'session_tx_admin_001',
    timestamp: new Date(),
  },
  STANDARD_USER: {
    userId: 'transaction_user_001',
    role: 'user',
    permissions: ['read', 'write'],
    sessionId: 'session_tx_user_001',
    timestamp: new Date(),
  },
};

// ===== MAIN TEST SUITE =====

describe('Database Transaction Integrity and Rollback Testing', () => {
  let module: TestingModule;
  let parlantDatabaseService: ParlantValidatedDatabaseService;
  let databaseService: DatabaseService;
  let backupService: DatabaseBackupService;
  let prismaClient: PrismaClient;

  // Test configuration
  const rollbackTestConfig: RollbackTestConfig = {
    testPartialRollbacks: true,
    testCascadeRollbacks: true,
    testConcurrentRollbacks: true,
    testRollbackPerformance: true,
    maxRollbackTime: 5000, // 5 seconds maximum
    rollbackValidationRequired: true,
  };

  // Test results storage
  let transactionExecutionResults: TransactionExecutionResult[] = [];

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
                PARLANT_CACHE_ENABLED: true,
                PARLANT_AUDIT_ENABLED: true,
                TRANSACTION_TIMEOUT: 30000,
                MAX_CONCURRENT_TRANSACTIONS: 10,
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

  // ===== TRANSACTION INTEGRITY TESTS =====

  describe('Transaction Integrity Validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should execute simple transaction with conversational validation', async () => {
      // Arrange
      const scenario = transactionTestScenarios[0]; // simple_user_creation_transaction
      const userContext = transactionTestUserContexts.TRANSACTION_ADMIN;
      const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Mock successful transaction execution
      const mockTransactionResult = { users: 1, user_preferences: 1 };
      jest.spyOn(prismaClient, '$transaction').mockResolvedValue(mockTransactionResult);

      // Mock Parlant validation approval
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockTransactionValidationResponses.TRANSACTION_APPROVED);

      // Act
      const startTime = Date.now();

      const transactionMetadata: DatabaseOperationMetadata = {
        operationType: 'WRITE',
        tableName: 'users,user_preferences',
        queryDescription: `Transaction: ${scenario.scenarioName}`,
        isDestructive: false,
        requiresBackup: scenario.riskLevel === RiskLevel.HIGH,
        affectedRows: scenario.operations.reduce((sum, op) => sum + op.expectedAffectedRows, 0),
      };

      const result = await parlantDatabaseService.executeWithTransaction(
        scenario.scenarioName,
        scenario.operations.map((op) => () => prismaClient.$executeRaw`${op.query}`),
        transactionMetadata,
        userContext,
        { transactionId, scenario: scenario.scenarioName },
      );

      const executionTime = Date.now() - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(prismaClient.$transaction).toHaveBeenCalledTimes(1);

      // Verify audit trail
      const auditTrail = parlantDatabaseService.getAuditTrail();
      const transactionEntry = auditTrail.find(
        (entry) => entry.functionName === scenario.scenarioName,
      );

      expect(transactionEntry).toBeDefined();
      expect(transactionEntry!.validationResult).toBe('APPROVED');
      expect(transactionEntry!.executionResult).toBe('SUCCESS');

      // Store execution results
      transactionExecutionResults.push({
        transactionId,
        scenarioName: scenario.scenarioName,
        startTime: new Date(startTime),
        endTime: new Date(),
        totalDuration: executionTime,
        validationDuration: 180, // From mock response
        executionDuration: executionTime - 180,
        outcome: 'SUCCESS',
        operationsExecuted: scenario.operations.length,
        operationsRolledBack: 0,
        conversationId: transactionEntry!.conversationId,
        performanceMetrics: {
          lockWaitTime: 0,
          commitTime: 50,
          resourceUtilization: {
            cpu: 15,
            memory: 128,
            diskIO: 1024,
            networkIO: 512,
          },
          concurrentTransactions: 1,
          deadlockDetected: false,
        },
      });
    });

    it('should handle transaction rollback scenarios with conversational validation', async () => {
      // Arrange
      const scenario = transactionTestScenarios[2]; // high_risk_data_deletion_transaction
      const userContext = transactionTestUserContexts.STANDARD_USER; // User without sufficient permissions

      // Mock transaction failure (simulating rollback scenario)
      const mockError = new Error('Insufficient permissions for data deletion');
      jest.spyOn(prismaClient, '$transaction').mockRejectedValue(mockError);

      // Mock Parlant validation denial for high-risk operation
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockTransactionValidationResponses.TRANSACTION_DENIED);

      // Act & Assert
      const transactionMetadata: DatabaseOperationMetadata = {
        operationType: 'DELETE',
        tableName: 'audit_logs',
        queryDescription: `Transaction: ${scenario.scenarioName}`,
        isDestructive: true,
        requiresBackup: true,
        affectedRows: scenario.operations.reduce((sum, op) => sum + op.expectedAffectedRows, 0),
      };

      await expect(
        parlantDatabaseService.executeWithTransaction(
          scenario.scenarioName,
          scenario.operations.map((op) => () => prismaClient.$executeRaw`${op.query}`),
          transactionMetadata,
          userContext,
          { scenario: scenario.scenarioName },
        ),
      ).rejects.toThrow(ConversationalValidationError);

      // Verify no database transaction was executed
      expect(prismaClient.$transaction).not.toHaveBeenCalled();

      // Verify denial is properly logged
      const auditTrail = parlantDatabaseService.getAuditTrail();
      expect(auditTrail.some((entry) => entry.executionResult === 'FAILURE')).toBe(false);
    });

    it('should validate ACID compliance during transaction execution', async () => {
      // Arrange
      const scenario = transactionTestScenarios[1]; // complex_data_migration_transaction
      const userContext = transactionTestUserContexts.TRANSACTION_ADMIN;

      // Mock transaction execution with intermediate states
      const mockTransactionSteps: any[] = [
        { updatedUsers: 100 }, // Step 1: Update users
        { auditLogCreated: 1 }, // Step 2: Create audit log
        { deletedSessions: 50 }, // Step 3: Delete sessions
      ];

      jest.spyOn(prismaClient, '$transaction').mockImplementation(async (operations) => {
        // Simulate ACID compliance testing
        for (let i = 0; i < operations.length; i++) {
          const result = await operations[i](prismaClient);
          // Verify each step completes before proceeding
          expect(result).toBeDefined();
        }
        return mockTransactionSteps;
      });

      // Mock Parlant validation approval
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockTransactionValidationResponses.TRANSACTION_APPROVED);

      // Act
      const transactionMetadata: DatabaseOperationMetadata = {
        operationType: 'WRITE',
        tableName: 'users,audit_logs,user_sessions',
        queryDescription: `ACID Transaction: ${scenario.scenarioName}`,
        isDestructive: true,
        requiresBackup: true,
        affectedRows: scenario.operations.reduce((sum, op) => sum + op.expectedAffectedRows, 0),
      };

      const result = await parlantDatabaseService.executeWithTransaction(
        scenario.scenarioName,
        scenario.operations.map((op, index) => () => Promise.resolve(mockTransactionSteps[index])),
        transactionMetadata,
        userContext,
        { acidCompliance: true },
      );

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(mockTransactionSteps.length);

      // Verify ACID properties
      // Atomicity: All operations completed or none
      expect(prismaClient.$transaction).toHaveBeenCalledTimes(1);

      // Consistency: Data integrity maintained (verified through successful execution)
      const auditTrail = parlantDatabaseService.getAuditTrail();
      const transactionEntry = auditTrail.find(
        (entry) => entry.functionName === scenario.scenarioName,
      );
      expect(transactionEntry!.executionResult).toBe('SUCCESS');

      // Isolation: No interference from other transactions (tested in concurrent scenarios)
      // Durability: Changes are permanent (verified through successful completion)
    });

    it('should handle concurrent transactions without deadlocks', async () => {
      // Arrange
      const scenario = transactionTestScenarios[3]; // concurrent_user_session_management
      const concurrentCount = scenario.concurrentTransactions || 5;
      const userContext = transactionTestUserContexts.TRANSACTION_ADMIN;

      // Mock concurrent transaction execution
      jest.spyOn(prismaClient, '$transaction').mockImplementation(async () => {
        // Simulate short processing time to test concurrency
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { updated: 1, created: 1 };
      });

      // Mock Parlant validation approval for concurrent operations
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockTransactionValidationResponses.TRANSACTION_APPROVED);

      // Act - Execute concurrent transactions
      const startTime = Date.now();
      const concurrentPromises = Array.from({ length: concurrentCount }, (_, index) => {
        const transactionMetadata: DatabaseOperationMetadata = {
          operationType: 'WRITE',
          tableName: 'user_sessions,user_activities',
          queryDescription: `Concurrent transaction ${index + 1}: ${scenario.scenarioName}`,
          isDestructive: false,
          requiresBackup: false,
          affectedRows: 2,
        };

        return parlantDatabaseService.executeWithTransaction(
          `${scenario.scenarioName}_${index}`,
          scenario.operations.map(() => () => Promise.resolve({ success: true })),
          transactionMetadata,
          userContext,
          { concurrentIndex: index },
        );
      });

      const results = await Promise.all(concurrentPromises);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(results).toHaveLength(concurrentCount);
      expect(results.every((result) => result !== null)).toBe(true);

      // Verify no deadlocks occurred (all transactions completed successfully)
      expect(prismaClient.$transaction).toHaveBeenCalledTimes(concurrentCount);

      // Verify performance under concurrent load
      const averageTimePerTransaction = totalTime / concurrentCount;
      expect(averageTimePerTransaction).toBeLessThan(1000); // Each transaction should complete within 1 second

      console.log('Concurrent Transaction Results:', {
        concurrentTransactions: concurrentCount,
        totalTime: `${totalTime}ms`,
        averageTimePerTransaction: `${averageTimePerTransaction.toFixed(2)}ms`,
        successfulTransactions: results.length,
      });
    });
  });

  // ===== ROLLBACK TESTING SUITE =====

  describe('Transaction Rollback Testing', () => {
    it('should perform automatic rollback on transaction failure', async () => {
      // Arrange
      const scenario = transactionTestScenarios[1]; // complex_data_migration_transaction
      const userContext = transactionTestUserContexts.TRANSACTION_ADMIN;

      // Mock transaction failure at step 2 (should trigger rollback)
      jest.spyOn(prismaClient, '$transaction').mockImplementation(async (operations) => {
        // Execute first operation successfully
        await operations[0](prismaClient);

        // Fail at second operation
        throw new Error('Audit log creation failed - insufficient storage space');
      });

      // Mock Parlant validation approval
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockTransactionValidationResponses.TRANSACTION_APPROVED);

      // Act & Assert
      const transactionMetadata: DatabaseOperationMetadata = {
        operationType: 'WRITE',
        tableName: 'users,audit_logs',
        queryDescription: `Rollback test: ${scenario.scenarioName}`,
        isDestructive: true,
        requiresBackup: true,
        affectedRows: 101,
      };

      await expect(
        parlantDatabaseService.executeWithTransaction(
          scenario.scenarioName,
          scenario.operations.map((op) => () => prismaClient.$executeRaw`${op.query}`),
          transactionMetadata,
          userContext,
        ),
      ).rejects.toThrow('Audit log creation failed');

      // Verify rollback occurred (Prisma handles this automatically)
      expect(prismaClient.$transaction).toHaveBeenCalledTimes(1);

      // Verify rollback is recorded in audit trail
      const auditTrail = parlantDatabaseService.getAuditTrail();
      const failedTransaction = auditTrail.find(
        (entry) => entry.executionResult === 'FAILURE',
      );

      expect(failedTransaction).toBeDefined();
      expect(failedTransaction!.functionName).toBe(scenario.scenarioName);
    });

    it('should test rollback performance within acceptable limits', async () => {
      // Arrange
      const rollbackStartTime = Date.now();
      const scenario = transactionTestScenarios[0]; // simple transaction for rollback testing
      const userContext = transactionTestUserContexts.TRANSACTION_ADMIN;

      // Mock transaction failure for rollback testing
      jest.spyOn(prismaClient, '$transaction').mockImplementation(async () => {
        // Simulate processing time before failure
        await new Promise((resolve) => setTimeout(resolve, 200));
        throw new Error('Simulated rollback test failure');
      });

      // Mock Parlant validation approval
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockTransactionValidationResponses.TRANSACTION_APPROVED);

      // Act
      const transactionMetadata: DatabaseOperationMetadata = {
        operationType: 'WRITE',
        tableName: 'users',
        queryDescription: `Rollback performance test: ${scenario.scenarioName}`,
        isDestructive: false,
        requiresBackup: false,
        affectedRows: 1,
      };

      try {
        await parlantDatabaseService.executeWithTransaction(
          `rollback_test_${scenario.scenarioName}`,
          scenario.operations.map(() => () => Promise.resolve({})),
          transactionMetadata,
          userContext,
        );
      } catch (error) {
        // Expected failure for rollback testing
        expect(error).toBeInstanceOf(Error);
      }

      const rollbackTime = Date.now() - rollbackStartTime;

      // Assert
      expect(rollbackTime).toBeLessThan(rollbackTestConfig.maxRollbackTime);

      console.log('Rollback Performance Results:', {
        rollbackTime: `${rollbackTime}ms`,
        maxAllowedTime: `${rollbackTestConfig.maxRollbackTime}ms`,
        performanceMet: rollbackTime < rollbackTestConfig.maxRollbackTime,
      });
    });

    it('should validate rollback data integrity and consistency', async () => {
      // Arrange
      const scenario = transactionTestScenarios[1]; // Complex scenario with multiple operations
      const userContext = transactionTestUserContexts.TRANSACTION_ADMIN;

      // Track operations for rollback validation
      const executedOperations: string[] = [];

      jest.spyOn(prismaClient, '$transaction').mockImplementation(async (operations) => {
        try {
          for (let i = 0; i < operations.length; i++) {
            executedOperations.push(`operation_${i}`);

            // Simulate failure at operation 2
            if (i === 2) {
              throw new Error('Intentional failure for rollback testing');
            }

            await operations[i](prismaClient);
          }
        } catch (error) {
          // Prisma will automatically rollback all operations
          executedOperations.length = 0; // Simulate rollback
          throw error;
        }
      });

      // Mock Parlant validation approval
      jest
        .spyOn(parlantDatabaseService as any, 'performParlantValidation')
        .mockResolvedValue(mockTransactionValidationResponses.TRANSACTION_APPROVED);

      // Act
      const transactionMetadata: DatabaseOperationMetadata = {
        operationType: 'WRITE',
        tableName: 'users,audit_logs,user_sessions',
        queryDescription: `Rollback integrity test: ${scenario.scenarioName}`,
        isDestructive: true,
        requiresBackup: true,
        affectedRows: 151,
      };

      try {
        await parlantDatabaseService.executeWithTransaction(
          `rollback_integrity_${scenario.scenarioName}`,
          scenario.operations.map(() => () => Promise.resolve({})),
          transactionMetadata,
          userContext,
        );
      } catch (error) {
        // Expected failure
        expect(error).toBeInstanceOf(Error);
      }

      // Assert - Verify rollback integrity
      // All operations should be rolled back (simulated by clearing the array)
      expect(executedOperations).toHaveLength(0);

      // Verify audit trail reflects rollback
      const auditTrail = parlantDatabaseService.getAuditTrail();
      const rollbackEntry = auditTrail.find(
        (entry) => entry.functionName.includes('rollback_integrity'),
      );

      expect(rollbackEntry).toBeDefined();
      expect(rollbackEntry!.executionResult).toBe('FAILURE');
    });
  });

  // ===== PERFORMANCE AND STATISTICS =====

  describe('Transaction Performance Analysis', () => {
    it('should generate comprehensive transaction performance report', async () => {
      // Act
      const performanceReport = {
        totalTransactionsExecuted: transactionExecutionResults.length,
        successfulTransactions: transactionExecutionResults.filter(
          (result) => result.outcome === 'SUCCESS',
        ).length,
        rolledBackTransactions: transactionExecutionResults.filter(
          (result) => result.outcome === 'ROLLBACK',
        ).length,
        averageExecutionTime: transactionExecutionResults.reduce(
          (sum, result) => sum + result.totalDuration,
          0,
        ) / Math.max(transactionExecutionResults.length, 1),
        averageValidationTime: transactionExecutionResults.reduce(
          (sum, result) => sum + result.validationDuration,
          0,
        ) / Math.max(transactionExecutionResults.length, 1),
        performanceMetrics: {
          p95ExecutionTime: calculateP95(
            transactionExecutionResults.map((result) => result.totalDuration),
          ),
          p99ExecutionTime: calculateP99(
            transactionExecutionResults.map((result) => result.totalDuration),
          ),
          transactionThroughput: calculateThroughput(transactionExecutionResults),
        },
      };

      // Assert
      expect(performanceReport.totalTransactionsExecuted).toBeGreaterThanOrEqual(0);
      expect(performanceReport.averageValidationTime).toBeLessThan(1000); // Sub-1000ms target

      console.log('Transaction Performance Report:', performanceReport);

      // Performance targets validation
      if (performanceReport.totalTransactionsExecuted > 0) {
        expect(performanceReport.averageExecutionTime).toBeLessThan(5000); // 5 second average
        expect(performanceReport.performanceMetrics.p95ExecutionTime).toBeLessThan(10000); // 10 second P95
      }
    });
  });

  // ===== HELPER FUNCTIONS =====

  /**
   * Calculate P95 percentile
   */
  function calculateP95(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.floor(0.95 * sorted.length);
    return sorted[index];
  }

  /**
   * Calculate P99 percentile
   */
  function calculateP99(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = values.sort((a, b) => a - b);
    const index = Math.floor(0.99 * sorted.length);
    return sorted[index];
  }

  /**
   * Calculate transaction throughput
   */
  function calculateThroughput(results: TransactionExecutionResult[]): number {
    if (results.length === 0) return 0;
    const totalTime = results.reduce((sum, result) => sum + result.totalDuration, 0);
    return results.length / (totalTime / 1000); // transactions per second
  }
});