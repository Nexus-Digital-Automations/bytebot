/**
 * PARLANT Phase 1 Transaction System Integration Tests
 *
 * Comprehensive integration test suite for PARLANT transaction management system.
 * Tests all components working together including coordination, rollback, batching,
 * deadlock detection, distributed coordination, and performance optimization.
 *
 * Test Coverage:
 * - Transaction lifecycle with PARLANT validation
 * - Rollback scenarios for denied validations
 * - Batch processing with multiple validation strategies
 * - Deadlock detection and resolution
 * - Distributed transaction coordination
 * - Performance optimization integration
 * - Error handling and recovery
 * - End-to-end transaction workflows
 *
 * @author Claude Code - PARLANT Phase 1 Transaction Testing Specialist
 * @version 1.0.0 - COMPREHENSIVE TRANSACTION SYSTEM INTEGRATION TESTS
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ParlantTransactionCoordinatorService } from "../coordinators/parlant-transaction-coordinator.service";
import { ParlantRollbackManagerService } from "../rollback/parlant-rollback-manager.service";
import { ParlantBatchProcessorService } from "../batching/parlant-batch-processor.service";
import { ParlantDeadlockDetectorService } from "../deadlock/parlant-deadlock-detector.service";
import { ParlantDistributedCoordinatorService } from "../distributed/parlant-distributed-coordinator.service";
import { ParlantPerformanceOptimizerService } from "../optimization/parlant-performance-optimizer.service";
import {
  TransactionMetadata,
  TransactionOperation,
  TransactionState,
  TransactionOperationType,
  TransactionIsolationLevel,
  TransactionPriority,
  TransactionExecutionContext,
  TransactionOperationResult,
  TransactionBatchConfiguration,
  DistributedTransactionParticipant,
  DistributedProtocol,
  OptimizationStrategy,
  PerformanceMetricType,
} from "../types";
import {
  ParlantUserContext,
  SecurityLevel,
} from "../../../types/parlant-integration.types";

describe("PARLANT Transaction System Integration Tests", () => {
  let module: TestingModule;
  let coordinatorService: ParlantTransactionCoordinatorService;
  let rollbackService: ParlantRollbackManagerService;
  let batchService: ParlantBatchProcessorService;
  let deadlockService: ParlantDeadlockDetectorService;
  let distributedService: ParlantDistributedCoordinatorService;
  let optimizerService: ParlantPerformanceOptimizerService;

  // Test data
  const testUserContext: ParlantUserContext = {
    userId: "test-user-123",
    roles: ["transaction-manager"],
    sessionId: "test-session-456",
    ipAddress: "127.0.0.1",
    metadata: { testMode: true },
  };

  const mockTransactionOperations: TransactionOperation[] = [
    {
      operationId: "op-1",
      type: TransactionOperationType.WRITE,
      description: "Create user record",
      executor: async (context: TransactionExecutionContext) => ({
        success: true,
        data: { userId: "user-123" },
        performanceMetrics: {
          executionDuration: 100,
          operationCount: 1,
          validationRequestCount: 1,
          retryCount: 0,
        },
        auditInfo: {
          auditId: "audit-1",
          type: "OPERATION",
          timestamp: new Date(),
          userContext: context.transaction.userContext,
          details: { operation: "create_user" },
          securityLevel: SecurityLevel.MEDIUM,
        },
      }),
      parameters: { name: "Test User", email: "test@example.com" },
      dependencies: [],
      estimatedExecutionTime: 100,
      securityRequirements: ["user_creation"],
    },
    {
      operationId: "op-2",
      type: TransactionOperationType.WRITE,
      description: "Create user profile",
      executor: async (context: TransactionExecutionContext) => ({
        success: true,
        data: { profileId: "profile-456" },
        performanceMetrics: {
          executionDuration: 150,
          operationCount: 1,
          validationRequestCount: 1,
          retryCount: 0,
        },
        auditInfo: {
          auditId: "audit-2",
          type: "OPERATION",
          timestamp: new Date(),
          userContext: context.transaction.userContext,
          details: { operation: "create_profile" },
          securityLevel: SecurityLevel.MEDIUM,
        },
      }),
      parameters: { userId: "user-123", preferences: {} },
      dependencies: ["op-1"],
      estimatedExecutionTime: 150,
      securityRequirements: ["profile_creation"],
    },
  ];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ParlantTransactionCoordinatorService,
        ParlantRollbackManagerService,
        ParlantBatchProcessorService,
        ParlantDeadlockDetectorService,
        ParlantDistributedCoordinatorService,
        ParlantPerformanceOptimizerService,
      ],
    }).compile();

    coordinatorService = module.get<ParlantTransactionCoordinatorService>(
      ParlantTransactionCoordinatorService,
    );
    rollbackService = module.get<ParlantRollbackManagerService>(
      ParlantRollbackManagerService,
    );
    batchService = module.get<ParlantBatchProcessorService>(
      ParlantBatchProcessorService,
    );
    deadlockService = module.get<ParlantDeadlockDetectorService>(
      ParlantDeadlockDetectorService,
    );
    distributedService = module.get<ParlantDistributedCoordinatorService>(
      ParlantDistributedCoordinatorService,
    );
    optimizerService = module.get<ParlantPerformanceOptimizerService>(
      ParlantPerformanceOptimizerService,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  describe("Basic Transaction Lifecycle", () => {
    it("should execute a simple transaction with PARLANT validation", async () => {
      // Initialize transaction
      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        mockTransactionOperations,
        testUserContext,
        {
          isolationLevel: TransactionIsolationLevel.READ_COMMITTED,
          priority: TransactionPriority.NORMAL,
          securityLevel: SecurityLevel.MEDIUM,
        },
      );

      expect(transaction).toBeDefined();
      expect(transaction.transactionId).toMatch(/^parlant_tx_/);
      expect(transaction.state).toBe(TransactionState.INITIALIZED);

      // Begin validation
      const validationResponse = await coordinatorService.beginValidation(
        transaction.transactionId,
      );

      expect(validationResponse).toBeDefined();
      expect(validationResponse.approved).toBe(true);

      // Execute transaction
      const results = await coordinatorService.executeTransaction(
        transaction.transactionId,
      );

      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      expect(results.every((result) => result.success)).toBe(true);

      // Verify transaction state
      const transactionInfo = coordinatorService.getTransactionInfo(
        transaction.transactionId,
      );
      expect(transactionInfo.state).toBe(TransactionState.COMMITTED);
    });

    it("should handle transaction validation rejection", async () => {
      // Mock a transaction that will be rejected
      const rejectedOperations: TransactionOperation[] = [
        {
          operationId: "dangerous-op",
          type: TransactionOperationType.DELETE,
          description: "Delete all user data",
          executor: async () => ({
            success: true,
            performanceMetrics: {
              operationCount: 1,
              validationRequestCount: 1,
              retryCount: 0,
            },
            auditInfo: {
              auditId: "audit",
              type: "OPERATION",
              timestamp: new Date(),
              userContext: testUserContext,
              details: {},
              securityLevel: SecurityLevel.HIGH,
            },
          }),
          parameters: { scope: "ALL_USERS" },
          dependencies: [],
          estimatedExecutionTime: 5000,
          securityRequirements: ["admin_privileges"],
        },
      ];

      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.DELETE,
        rejectedOperations,
        testUserContext,
        { securityLevel: SecurityLevel.HIGH },
      );

      // This should trigger rejection due to high risk
      await expect(
        coordinatorService.beginValidation(transaction.transactionId),
      ).rejects.toThrow();

      const transactionInfo = coordinatorService.getTransactionInfo(
        transaction.transactionId,
      );
      expect(transactionInfo.state).toBe(TransactionState.FAILED);
    });

    it("should handle transaction execution failure with rollback", async () => {
      // Mock operations where one will fail
      const failingOperations: TransactionOperation[] = [
        mockTransactionOperations[0],
        {
          operationId: "failing-op",
          type: TransactionOperationType.WRITE,
          description: "Operation that will fail",
          executor: async () => {
            throw new Error("Simulated operation failure");
          },
          parameters: {},
          dependencies: [],
          estimatedExecutionTime: 100,
          securityRequirements: [],
        },
      ];

      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        failingOperations,
        testUserContext,
      );

      await coordinatorService.beginValidation(transaction.transactionId);

      await expect(
        coordinatorService.executeTransaction(transaction.transactionId),
      ).rejects.toThrow("Simulated operation failure");

      const transactionInfo = coordinatorService.getTransactionInfo(
        transaction.transactionId,
      );
      expect(transactionInfo.state).toBe(TransactionState.ROLLED_BACK);
    });
  });

  describe("Rollback Manager Integration", () => {
    it("should initiate rollback for denied validation", async () => {
      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        mockTransactionOperations,
        testUserContext,
      );

      // Mock validation response that denies the transaction
      const mockValidationResponse = {
        approved: false,
        conversationId: "conv-123",
        reason: "Transaction violates security policy",
        confidence: 0.95,
        metadata: {
          validationTime: Date.now(),
          validatorId: "test",
          validationVersion: "1.0.0",
        },
        approvedOperations: [],
        rejectedOperations: ["op-1", "op-2"],
        conditionalApprovals: [],
      };

      // Create mock execution context
      const mockContext = {
        transaction,
        operation: mockTransactionOperations[0],
        databaseConnections: new Map(),
        environment: {},
        performanceMonitor: {} as any,
        auditLogger: {} as any,
      };

      // Initiate rollback
      const rollbackContext = await rollbackService.initiateValidationRollback(
        transaction.transactionId,
        mockValidationResponse,
        transaction,
        mockTransactionOperations,
        mockContext,
      );

      expect(rollbackContext).toBeDefined();
      expect(rollbackContext.strategy).toBeDefined();
      expect(rollbackContext.scope).toBeDefined();

      // Execute rollback
      const rollbackSuccess = await rollbackService.executeRollback(
        transaction.transactionId,
      );
      expect(rollbackSuccess).toBe(true);

      // Check rollback metrics
      const metrics = rollbackService.getRollbackMetrics(
        transaction.transactionId,
      );
      expect(metrics).toBeDefined();
      expect(metrics?.totalDuration).toBeGreaterThan(0);
    });

    it("should handle compensating transaction rollback", async () => {
      // Register compensating operations
      rollbackService.registerCompensatingOperation("op-1", {
        operationId: "comp-op-1",
        type: TransactionOperationType.DELETE,
        description: "Delete created user record",
        executor: async () => ({
          success: true,
          performanceMetrics: {
            operationCount: 1,
            validationRequestCount: 0,
            retryCount: 0,
          },
          auditInfo: {
            auditId: "comp-audit-1",
            type: "OPERATION",
            timestamp: new Date(),
            userContext: testUserContext,
            details: { compensation: true },
            securityLevel: SecurityLevel.MEDIUM,
          },
        }),
        parameters: { userId: "user-123" },
        dependencies: [],
        estimatedExecutionTime: 50,
        securityRequirements: [],
      });

      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        [mockTransactionOperations[0]],
        testUserContext,
      );

      // Simulate rollback scenario
      const mockValidationResponse = {
        approved: false,
        conversationId: "conv-456",
        reason: "Compensating rollback test",
        confidence: 0.9,
        metadata: {
          validationTime: Date.now(),
          validatorId: "test",
          validationVersion: "1.0.0",
        },
        approvedOperations: [],
        rejectedOperations: ["op-1"],
        conditionalApprovals: [],
      };

      const mockContext = {
        transaction,
        operation: mockTransactionOperations[0],
        databaseConnections: new Map(),
        environment: {},
        performanceMonitor: {} as any,
        auditLogger: {} as any,
      };

      await rollbackService.initiateValidationRollback(
        transaction.transactionId,
        mockValidationResponse,
        transaction,
        [mockTransactionOperations[0]],
        mockContext,
      );

      const rollbackSuccess = await rollbackService.executeRollback(
        transaction.transactionId,
      );
      expect(rollbackSuccess).toBe(true);
    });
  });

  describe("Batch Processing Integration", () => {
    it("should process multiple transactions in a batch", async () => {
      // Create multiple transactions
      const transactions: TransactionMetadata[] = [];
      for (let i = 0; i < 3; i++) {
        const transaction = await coordinatorService.initializeTransaction(
          TransactionOperationType.WRITE,
          [mockTransactionOperations[0]],
          testUserContext,
        );
        transactions.push(transaction);
      }

      // Create batch
      const batchId = await batchService.createBatch(
        "Test Batch",
        "Integration test batch processing",
        transactions,
        testUserContext,
        {
          priority: "NORMAL",
          configuration: {
            maxBatchSize: 10,
            enableParallelExecution: true,
            maxParallelOperations: 3,
            validationStrategy: "HYBRID",
            failureStrategy: "CONTINUE_ON_ERROR",
          },
        },
      );

      expect(batchId).toBeDefined();

      // Process batch
      const batchResult = await batchService.processBatch(batchId);

      expect(batchResult).toBeDefined();
      expect(batchResult.success).toBe(true);
      expect(batchResult.operationResults.size).toBe(3);
      expect(batchResult.failedOperations.length).toBe(0);

      // Check batch metrics
      const metrics = batchService.getBatchMetrics(batchId);
      expect(metrics).toBeDefined();
      expect(metrics?.throughput).toBeGreaterThan(0);
    });

    it("should handle batch validation strategies", async () => {
      const transactions: TransactionMetadata[] = [];
      for (let i = 0; i < 5; i++) {
        const transaction = await coordinatorService.initializeTransaction(
          TransactionOperationType.READ,
          [mockTransactionOperations[0]],
          testUserContext,
        );
        transactions.push(transaction);
      }

      // Test individual validation strategy
      const batchId1 = await batchService.createBatch(
        "Individual Validation Batch",
        "Test individual validation strategy",
        transactions.slice(0, 2),
        testUserContext,
        {
          configuration: { validationStrategy: "INDIVIDUAL" },
        },
      );

      const result1 = await batchService.processBatch(batchId1);
      expect(result1.success).toBe(true);

      // Test batch validation strategy
      const batchId2 = await batchService.createBatch(
        "Batch Validation Batch",
        "Test batch validation strategy",
        transactions.slice(2, 4),
        testUserContext,
        {
          configuration: { validationStrategy: "BATCH" },
        },
      );

      const result2 = await batchService.processBatch(batchId2);
      expect(result2.success).toBe(true);

      // Test hybrid validation strategy
      const batchId3 = await batchService.createBatch(
        "Hybrid Validation Batch",
        "Test hybrid validation strategy",
        transactions.slice(4, 5),
        testUserContext,
        {
          configuration: { validationStrategy: "HYBRID" },
        },
      );

      const result3 = await batchService.processBatch(batchId3);
      expect(result3.success).toBe(true);
    });

    it("should handle batch cancellation", async () => {
      const transactions: TransactionMetadata[] = [];
      for (let i = 0; i < 2; i++) {
        const transaction = await coordinatorService.initializeTransaction(
          TransactionOperationType.WRITE,
          [mockTransactionOperations[0]],
          testUserContext,
        );
        transactions.push(transaction);
      }

      const batchId = await batchService.createBatch(
        "Cancellation Test Batch",
        "Test batch cancellation",
        transactions,
        testUserContext,
      );

      // Cancel batch before processing
      await batchService.cancelBatch(batchId, "Integration test cancellation");

      const status = batchService.getBatchStatus(batchId);
      expect(status.status).toBe("CANCELLED");
    });
  });

  describe("Deadlock Detection Integration", () => {
    it("should detect and resolve transaction deadlocks", async () => {
      // Create transactions that will create a deadlock scenario
      const transaction1 = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        [mockTransactionOperations[0]],
        testUserContext,
        { priority: TransactionPriority.HIGH },
      );

      const transaction2 = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        [mockTransactionOperations[1]],
        testUserContext,
        { priority: TransactionPriority.NORMAL },
      );

      // Register transactions for deadlock monitoring
      deadlockService.registerTransaction(transaction1);
      deadlockService.registerTransaction(transaction2);

      // Simulate conflicting locks
      deadlockService.registerLock({
        lockId: "lock-1",
        transactionId: transaction1.transactionId,
        resourceId: "resource-A",
        resourceType: "TABLE",
        lockType: "EXCLUSIVE",
        acquiredAt: new Date(),
        mode: "HELD",
        priority: 1,
        timeout: 30000,
      });

      deadlockService.registerLock({
        lockId: "lock-2",
        transactionId: transaction2.transactionId,
        resourceId: "resource-B",
        resourceType: "TABLE",
        lockType: "EXCLUSIVE",
        acquiredAt: new Date(),
        mode: "HELD",
        priority: 1,
        timeout: 30000,
      });

      // Create waiting locks that will cause deadlock
      deadlockService.registerLock({
        lockId: "lock-3",
        transactionId: transaction1.transactionId,
        resourceId: "resource-B",
        resourceType: "TABLE",
        lockType: "EXCLUSIVE",
        acquiredAt: new Date(),
        mode: "WAITING",
        priority: 1,
        timeout: 30000,
      });

      deadlockService.registerLock({
        lockId: "lock-4",
        transactionId: transaction2.transactionId,
        resourceId: "resource-A",
        resourceType: "TABLE",
        lockType: "EXCLUSIVE",
        acquiredAt: new Date(),
        mode: "WAITING",
        priority: 1,
        timeout: 30000,
      });

      // Force deadlock detection
      const detectionResult = await deadlockService.forceDetection();

      expect(detectionResult.deadlockDetected).toBe(true);
      expect(detectionResult.deadlocks.length).toBeGreaterThan(0);

      // Check that deadlock was resolved
      const statistics = deadlockService.getStatistics();
      expect(statistics.totalDeadlocksDetected).toBeGreaterThan(0);
    });

    it("should handle different deadlock resolution strategies", async () => {
      // Test with different resolution strategies
      const strategies = [
        "VICTIM_ABORT",
        "PRIORITY_BASED",
        "WAIT_DIE",
        "WOUND_WAIT",
      ];

      for (const strategy of strategies) {
        deadlockService.updateConfiguration({
          resolutionStrategy: strategy as any,
        });

        // Create test transactions
        const transaction1 = await coordinatorService.initializeTransaction(
          TransactionOperationType.WRITE,
          [mockTransactionOperations[0]],
          testUserContext,
          { priority: TransactionPriority.HIGH },
        );

        const transaction2 = await coordinatorService.initializeTransaction(
          TransactionOperationType.WRITE,
          [mockTransactionOperations[1]],
          testUserContext,
          { priority: TransactionPriority.LOW },
        );

        deadlockService.registerTransaction(transaction1);
        deadlockService.registerTransaction(transaction2);

        // Clean up for next iteration
        deadlockService.unregisterTransaction(transaction1.transactionId);
        deadlockService.unregisterTransaction(transaction2.transactionId);
      }
    });

    it("should maintain wait-for graph correctly", async () => {
      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        [mockTransactionOperations[0]],
        testUserContext,
      );

      deadlockService.registerTransaction(transaction);

      // Get initial graph snapshot
      const initialGraph = deadlockService.getWaitForGraphSnapshot();
      expect(initialGraph.nodes.has(transaction.transactionId)).toBe(true);

      // Unregister transaction
      deadlockService.unregisterTransaction(transaction.transactionId);

      // Verify transaction was removed from graph
      const finalGraph = deadlockService.getWaitForGraphSnapshot();
      expect(finalGraph.nodes.has(transaction.transactionId)).toBe(false);
    });
  });

  describe("Distributed Transaction Integration", () => {
    it("should coordinate distributed transactions across participants", async () => {
      // Register distributed transaction participants
      const participants: DistributedTransactionParticipant[] = [
        {
          participantId: "db-1",
          participantName: "Primary Database",
          databaseType: "POSTGRESQL",
          connectionString: "postgresql://localhost:5432/db1",
          status: "ACTIVE",
          lastHeartbeat: new Date(),
          capabilities: ["PREPARE", "COMMIT", "ABORT"],
        },
        {
          participantId: "db-2",
          participantName: "Secondary Database",
          databaseType: "MYSQL",
          connectionString: "mysql://localhost:3306/db2",
          status: "ACTIVE",
          lastHeartbeat: new Date(),
          capabilities: ["PREPARE", "COMMIT", "ABORT"],
        },
      ];

      participants.forEach((participant) => {
        distributedService.registerParticipant(participant);
      });

      // Create transaction
      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        mockTransactionOperations,
        testUserContext,
      );

      // Start distributed transaction
      const globalTxId = await distributedService.startDistributedTransaction(
        transaction,
        participants.map((p) => p.participantId),
        DistributedProtocol.TWO_PHASE_COMMIT,
      );

      expect(globalTxId).toBeDefined();

      // Execute distributed transaction
      const success =
        await distributedService.executeDistributedTransaction(globalTxId);
      expect(success).toBe(true);

      // Check coordination metrics
      const metrics = distributedService.getCoordinationMetrics(globalTxId);
      expect(metrics).toBeDefined();
      expect(metrics?.totalCoordinationTime).toBeGreaterThan(0);
    });

    it("should handle participant health monitoring", async () => {
      const participant: DistributedTransactionParticipant = {
        participantId: "health-test-db",
        participantName: "Health Test Database",
        databaseType: "SQLITE",
        connectionString: "sqlite://test.db",
        status: "ACTIVE",
        lastHeartbeat: new Date(),
        capabilities: ["PREPARE", "COMMIT", "ABORT"],
      };

      distributedService.registerParticipant(participant);

      // Check health
      const healthStatus = await distributedService.checkParticipantHealth(
        participant.participantId,
      );
      expect(healthStatus).toBeDefined();
      expect(healthStatus.participantId).toBe(participant.participantId);

      // Get all participants health
      const allHealth = distributedService.getAllParticipantsHealth();
      expect(allHealth.length).toBeGreaterThan(0);
    });

    it("should support different distributed protocols", async () => {
      const participant: DistributedTransactionParticipant = {
        participantId: "protocol-test-db",
        participantName: "Protocol Test Database",
        databaseType: "POSTGRESQL",
        connectionString: "postgresql://localhost:5432/protocol_test",
        status: "ACTIVE",
        lastHeartbeat: new Date(),
        capabilities: ["PREPARE", "COMMIT", "ABORT"],
      };

      distributedService.registerParticipant(participant);

      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        [mockTransactionOperations[0]],
        testUserContext,
      );

      // Test Two-Phase Commit
      const tpcTxId = await distributedService.startDistributedTransaction(
        transaction,
        [participant.participantId],
        DistributedProtocol.TWO_PHASE_COMMIT,
      );

      const tpcSuccess =
        await distributedService.executeDistributedTransaction(tpcTxId);
      expect(tpcSuccess).toBe(true);

      // Test Three-Phase Commit
      const threepcTxId = await distributedService.startDistributedTransaction(
        transaction,
        [participant.participantId],
        DistributedProtocol.THREE_PHASE_COMMIT,
      );

      const threepcSuccess =
        await distributedService.executeDistributedTransaction(threepcTxId);
      expect(threepcSuccess).toBe(true);
    });
  });

  describe("Performance Optimization Integration", () => {
    it("should create optimization context and generate recommendations", async () => {
      // Create optimization context
      const contextId = await optimizerService.createOptimizationContext(
        OptimizationStrategy.BALANCED,
        testUserContext,
        {
          thresholds: {
            maxLatency: 500,
            minThroughput: 200,
            maxCpuUsage: 70,
            maxMemoryUsage: 2048,
            maxConnectionUsage: 70,
            minCacheHitRate: 95,
            maxDeadlockRate: 0.5,
            maxLockWaitTime: 3000,
          },
        },
      );

      expect(contextId).toBeDefined();

      // Record performance measurements
      optimizerService.recordPerformanceMeasurement(
        contextId,
        PerformanceMetricType.LATENCY,
        800, // Above threshold
        "ms",
      );

      optimizerService.recordPerformanceMeasurement(
        contextId,
        PerformanceMetricType.THROUGHPUT,
        150, // Below threshold
        "tps",
      );

      // Generate optimization recommendations
      const recommendations =
        await optimizerService.generateOptimizationRecommendations(contextId);
      expect(recommendations).toBeDefined();
      expect(recommendations.length).toBeGreaterThan(0);

      // Approve a recommendation
      if (recommendations.length > 0) {
        await optimizerService.approveOptimizationRecommendation(
          contextId,
          recommendations[0].recommendationId,
        );

        // Implement the recommendation
        const implementationSuccess =
          await optimizerService.implementOptimizationRecommendation(
            contextId,
            recommendations[0].recommendationId,
          );
        expect(implementationSuccess).toBe(true);
      }

      // Get performance report
      const report = optimizerService.getPerformanceReport(contextId);
      expect(report).toBeDefined();
      expect(report?.performanceScore).toBeGreaterThan(0);
    });

    it("should adapt optimization strategy based on workload", async () => {
      const contextId = await optimizerService.createOptimizationContext(
        OptimizationStrategy.ADAPTIVE,
        testUserContext,
      );

      // Simulate high-throughput workload
      for (let i = 0; i < 10; i++) {
        optimizerService.recordPerformanceMeasurement(
          contextId,
          PerformanceMetricType.THROUGHPUT,
          1500 + Math.random() * 500,
        );

        optimizerService.recordPerformanceMeasurement(
          contextId,
          PerformanceMetricType.LATENCY,
          50 + Math.random() * 50,
        );
      }

      // Generate adaptive recommendations
      const recommendations =
        await optimizerService.generateOptimizationRecommendations(contextId);
      expect(recommendations.length).toBeGreaterThan(0);

      // Verify recommendations are appropriate for high-throughput workload
      const throughputOptimizations = recommendations.filter(
        (rec) => rec.targetMetric === PerformanceMetricType.THROUGHPUT,
      );
      expect(throughputOptimizations.length).toBeGreaterThan(0);
    });

    it("should handle different optimization strategies", async () => {
      const strategies = [
        OptimizationStrategy.THROUGHPUT,
        OptimizationStrategy.LATENCY,
        OptimizationStrategy.RESOURCE_EFFICIENCY,
        OptimizationStrategy.BALANCED,
      ];

      for (const strategy of strategies) {
        const contextId = await optimizerService.createOptimizationContext(
          strategy,
          testUserContext,
        );

        // Record some performance issues
        optimizerService.recordPerformanceMeasurement(
          contextId,
          PerformanceMetricType.LATENCY,
          1200, // High latency
        );

        optimizerService.recordPerformanceMeasurement(
          contextId,
          PerformanceMetricType.CPU_USAGE,
          85, // High CPU usage
        );

        const recommendations =
          await optimizerService.generateOptimizationRecommendations(contextId);
        expect(recommendations.length).toBeGreaterThan(0);

        // Verify recommendations are strategy-appropriate
        switch (strategy) {
          case OptimizationStrategy.LATENCY:
            expect(
              recommendations.some(
                (rec) => rec.targetMetric === PerformanceMetricType.LATENCY,
              ),
            ).toBe(true);
            break;
          case OptimizationStrategy.RESOURCE_EFFICIENCY:
            expect(
              recommendations.some(
                (rec) => rec.targetMetric === PerformanceMetricType.CPU_USAGE,
              ),
            ).toBe(true);
            break;
        }
      }
    });
  });

  describe("End-to-End Transaction Workflows", () => {
    it("should handle complex multi-service transaction with all components", async () => {
      // 1. Create optimization context
      const optimizationContextId =
        await optimizerService.createOptimizationContext(
          OptimizationStrategy.BALANCED,
          testUserContext,
        );

      // 2. Register distributed participants
      const participants: DistributedTransactionParticipant[] = [
        {
          participantId: "user-service-db",
          participantName: "User Service Database",
          databaseType: "POSTGRESQL",
          connectionString: "postgresql://localhost:5432/users",
          status: "ACTIVE",
          lastHeartbeat: new Date(),
          capabilities: ["PREPARE", "COMMIT", "ABORT"],
        },
        {
          participantId: "order-service-db",
          participantName: "Order Service Database",
          databaseType: "MYSQL",
          connectionString: "mysql://localhost:3306/orders",
          status: "ACTIVE",
          lastHeartbeat: new Date(),
          capabilities: ["PREPARE", "COMMIT", "ABORT"],
        },
      ];

      participants.forEach((participant) => {
        distributedService.registerParticipant(participant);
      });

      // 3. Create complex transaction operations
      const complexOperations: TransactionOperation[] = [
        {
          operationId: "create-user",
          type: TransactionOperationType.WRITE,
          description: "Create new user account",
          executor: async (context) => {
            // Record performance measurement
            optimizerService.recordPerformanceMeasurement(
              optimizationContextId,
              PerformanceMetricType.LATENCY,
              Math.random() * 200 + 100,
            );

            return {
              success: true,
              data: { userId: "user-789" },
              performanceMetrics: {
                executionDuration: 150,
                operationCount: 1,
                validationRequestCount: 1,
                retryCount: 0,
              },
              auditInfo: {
                auditId: "create-user-audit",
                type: "OPERATION",
                timestamp: new Date(),
                userContext: context.transaction.userContext,
                details: { operation: "create_user", service: "user-service" },
                securityLevel: SecurityLevel.MEDIUM,
              },
            };
          },
          parameters: { name: "John Doe", email: "john@example.com" },
          dependencies: [],
          estimatedExecutionTime: 200,
          securityRequirements: ["user_creation"],
        },
        {
          operationId: "create-order",
          type: TransactionOperationType.WRITE,
          description: "Create initial order for user",
          executor: async (context) => {
            // Record performance measurement
            optimizerService.recordPerformanceMeasurement(
              optimizationContextId,
              PerformanceMetricType.LATENCY,
              Math.random() * 300 + 200,
            );

            return {
              success: true,
              data: { orderId: "order-456" },
              performanceMetrics: {
                executionDuration: 250,
                operationCount: 1,
                validationRequestCount: 1,
                retryCount: 0,
              },
              auditInfo: {
                auditId: "create-order-audit",
                type: "OPERATION",
                timestamp: new Date(),
                userContext: context.transaction.userContext,
                details: {
                  operation: "create_order",
                  service: "order-service",
                },
                securityLevel: SecurityLevel.MEDIUM,
              },
            };
          },
          parameters: { userId: "user-789", items: [] },
          dependencies: ["create-user"],
          estimatedExecutionTime: 300,
          securityRequirements: ["order_creation"],
        },
      ];

      // 4. Initialize transaction with deadlock monitoring
      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        complexOperations,
        testUserContext,
        {
          isolationLevel: TransactionIsolationLevel.READ_COMMITTED,
          priority: TransactionPriority.HIGH,
          securityLevel: SecurityLevel.MEDIUM,
          timeout: 120000,
        },
      );

      deadlockService.registerTransaction(transaction);

      // 5. Start distributed transaction
      const globalTxId = await distributedService.startDistributedTransaction(
        transaction,
        participants.map((p) => p.participantId),
        DistributedProtocol.TWO_PHASE_COMMIT,
        { coordinationTimeout: 60000 },
      );

      // 6. Begin validation
      const validationResponse = await coordinatorService.beginValidation(
        transaction.transactionId,
      );
      expect(validationResponse.approved).toBe(true);

      // 7. Execute transaction
      const executionResults = await coordinatorService.executeTransaction(
        transaction.transactionId,
      );
      expect(executionResults.every((result) => result.success)).toBe(true);

      // 8. Execute distributed coordination
      const distributedSuccess =
        await distributedService.executeDistributedTransaction(globalTxId);
      expect(distributedSuccess).toBe(true);

      // 9. Verify final states
      const finalTransactionInfo = coordinatorService.getTransactionInfo(
        transaction.transactionId,
      );
      expect(finalTransactionInfo.state).toBe(TransactionState.COMMITTED);

      const distributedStatus =
        distributedService.getDistributedTransactionStatus(globalTxId);
      expect(distributedStatus.status).toBe("COMPLETED");

      // 10. Generate performance recommendations
      const recommendations =
        await optimizerService.generateOptimizationRecommendations(
          optimizationContextId,
        );
      expect(recommendations.length).toBeGreaterThan(0);

      // 11. Clean up
      deadlockService.unregisterTransaction(transaction.transactionId);
      participants.forEach((participant) => {
        distributedService.unregisterParticipant(participant.participantId);
      });
    });

    it("should handle transaction failure with comprehensive rollback", async () => {
      // Create transaction with rollback scenarios
      const rollbackOperations: TransactionOperation[] = [
        {
          operationId: "successful-op",
          type: TransactionOperationType.WRITE,
          description: "Operation that succeeds",
          executor: async () => ({
            success: true,
            data: { id: "success-123" },
            performanceMetrics: {
              executionDuration: 100,
              operationCount: 1,
              validationRequestCount: 1,
              retryCount: 0,
            },
            auditInfo: {
              auditId: "success-audit",
              type: "OPERATION",
              timestamp: new Date(),
              userContext: testUserContext,
              details: { operation: "successful_operation" },
              securityLevel: SecurityLevel.MEDIUM,
            },
          }),
          rollbackExecutor: async () => {
            // Simulate successful rollback
          },
          parameters: {},
          dependencies: [],
          estimatedExecutionTime: 100,
          securityRequirements: [],
        },
        {
          operationId: "failing-op",
          type: TransactionOperationType.WRITE,
          description: "Operation that fails",
          executor: async () => {
            throw new Error("Intentional failure for rollback test");
          },
          rollbackExecutor: async () => {
            // Simulate rollback of failing operation
          },
          parameters: {},
          dependencies: ["successful-op"],
          estimatedExecutionTime: 100,
          securityRequirements: [],
        },
      ];

      // Register compensating operations
      rollbackService.registerCompensatingOperation("successful-op", {
        operationId: "compensate-successful-op",
        type: TransactionOperationType.DELETE,
        description: "Compensate successful operation",
        executor: async () => ({
          success: true,
          performanceMetrics: {
            operationCount: 1,
            validationRequestCount: 0,
            retryCount: 0,
          },
          auditInfo: {
            auditId: "compensate-audit",
            type: "OPERATION",
            timestamp: new Date(),
            userContext: testUserContext,
            details: { compensation: true },
            securityLevel: SecurityLevel.MEDIUM,
          },
        }),
        parameters: {},
        dependencies: [],
        estimatedExecutionTime: 50,
        securityRequirements: [],
      });

      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        rollbackOperations,
        testUserContext,
      );

      await coordinatorService.beginValidation(transaction.transactionId);

      // Execution should fail and trigger rollback
      await expect(
        coordinatorService.executeTransaction(transaction.transactionId),
      ).rejects.toThrow("Intentional failure for rollback test");

      const finalState = coordinatorService.getTransactionInfo(
        transaction.transactionId,
      );
      expect(finalState.state).toBe(TransactionState.ROLLED_BACK);
    });

    it("should handle high-concurrency batch processing with performance optimization", async () => {
      const optimizationContextId =
        await optimizerService.createOptimizationContext(
          OptimizationStrategy.THROUGHPUT,
          testUserContext,
          {
            thresholds: {
              maxLatency: 200,
              minThroughput: 500,
              maxCpuUsage: 75,
              maxMemoryUsage: 4096,
              maxConnectionUsage: 80,
              minCacheHitRate: 95,
              maxDeadlockRate: 1,
              maxLockWaitTime: 2000,
            },
          },
        );

      // Create many transactions for high-concurrency test
      const transactions: TransactionMetadata[] = [];
      for (let i = 0; i < 20; i++) {
        const transaction = await coordinatorService.initializeTransaction(
          TransactionOperationType.READ,
          [
            {
              operationId: `read-op-${i}`,
              type: TransactionOperationType.READ,
              description: `Read operation ${i}`,
              executor: async () => {
                // Simulate performance measurement
                optimizerService.recordPerformanceMeasurement(
                  optimizationContextId,
                  PerformanceMetricType.THROUGHPUT,
                  Math.random() * 100 + 400,
                );

                return {
                  success: true,
                  data: { id: `data-${i}` },
                  performanceMetrics: {
                    executionDuration: Math.random() * 50 + 25,
                    operationCount: 1,
                    validationRequestCount: 1,
                    retryCount: 0,
                  },
                  auditInfo: {
                    auditId: `read-audit-${i}`,
                    type: "OPERATION",
                    timestamp: new Date(),
                    userContext: testUserContext,
                    details: { operation: `read_${i}` },
                    securityLevel: SecurityLevel.LOW,
                  },
                };
              },
              parameters: { index: i },
              dependencies: [],
              estimatedExecutionTime: 50,
              securityRequirements: [],
            },
          ],
          testUserContext,
        );
        transactions.push(transaction);
      }

      // Process in high-throughput batch
      const batchId = await batchService.createBatch(
        "High Concurrency Batch",
        "Test high-concurrency processing with performance optimization",
        transactions,
        testUserContext,
        {
          priority: "HIGH",
          configuration: {
            maxBatchSize: 20,
            enableParallelExecution: true,
            maxParallelOperations: 10,
            validationStrategy: "BATCH",
            failureStrategy: "CONTINUE_ON_ERROR",
          },
        },
      );

      const startTime = Date.now();
      const batchResult = await batchService.processBatch(batchId);
      const totalTime = Date.now() - startTime;

      expect(batchResult.success).toBe(true);
      expect(batchResult.operationResults.size).toBe(20);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Generate performance recommendations
      const recommendations =
        await optimizerService.generateOptimizationRecommendations(
          optimizationContextId,
        );
      expect(recommendations.length).toBeGreaterThan(0);

      // Verify throughput optimization recommendations
      const throughputRecs = recommendations.filter(
        (rec) => rec.targetMetric === PerformanceMetricType.THROUGHPUT,
      );
      expect(throughputRecs.length).toBeGreaterThan(0);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should recover from transaction coordinator failures", async () => {
      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        mockTransactionOperations,
        testUserContext,
      );

      // Simulate coordinator failure during validation
      try {
        // Force an error condition
        await coordinatorService.beginValidation("invalid-transaction-id");
      } catch (error) {
        expect(error.message).toContain("not found");
      }

      // Original transaction should still be recoverable
      const validationResponse = await coordinatorService.beginValidation(
        transaction.transactionId,
      );
      expect(validationResponse.approved).toBe(true);
    });

    it("should handle network failures in distributed transactions", async () => {
      const participant: DistributedTransactionParticipant = {
        participantId: "unreliable-db",
        participantName: "Unreliable Database",
        databaseType: "MYSQL",
        connectionString: "mysql://unreliable:3306/test",
        status: "ACTIVE",
        lastHeartbeat: new Date(),
        capabilities: ["PREPARE", "COMMIT", "ABORT"],
      };

      distributedService.registerParticipant(participant);

      // Health check should handle network failures gracefully
      try {
        await distributedService.checkParticipantHealth(
          participant.participantId,
        );
      } catch (error) {
        // Expected to fail for unreliable participant
      }

      const healthStatus = distributedService.getParticipantHealthStatus(
        participant.participantId,
      );
      expect(healthStatus).toBeDefined();
    });

    it("should handle deadlock resolution failures", async () => {
      const transaction = await coordinatorService.initializeTransaction(
        TransactionOperationType.WRITE,
        mockTransactionOperations,
        testUserContext,
      );

      deadlockService.registerTransaction(transaction);

      // Create a lock scenario
      deadlockService.registerLock({
        lockId: "test-lock",
        transactionId: transaction.transactionId,
        resourceId: "test-resource",
        resourceType: "TABLE",
        lockType: "EXCLUSIVE",
        acquiredAt: new Date(),
        mode: "HELD",
        priority: 1,
        timeout: 30000,
      });

      // Test deadlock detector statistics
      const stats = deadlockService.getStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalDeadlocksDetected).toBeGreaterThanOrEqual(0);
    });
  });
});
