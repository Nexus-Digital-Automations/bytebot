# PARLANT Atomic Operation Pattern Library

**Generated**: 2025-09-20
**Task ID**: feature_1758353418385_ual7abf61qa
**Purpose**: Comprehensive library of atomic operation patterns for conversational validation
**Author**: Claude Code - Atomic Patterns Specialist

## Overview

This library provides comprehensive atomic operation patterns specifically designed for PARLANT conversational validation integration. Each pattern includes complete TypeScript implementations, usage examples, and integration guidelines for the Bytebot ecosystem.

## 1. Conversational Validation Transaction (CVT) Pattern

### 1.1 Core Implementation

```typescript
/**
 * Conversational Validation Transaction - Atomic pattern for PARLANT-validated operations
 * Ensures atomic execution with conversational pre-validation and automatic rollback
 */
import { Injectable, Logger } from '@nestjs/common';
import { ParlantIntegrationService, ParlantValidationRequest, ConversationalValidationError } from '../parlant/parlant-integration.service';

export interface TransactionOperation {
  readonly operationId: string;
  readonly result: unknown;
  readonly timestamp: Date;
  readonly conversationId: string;
  readonly rollbackData?: unknown;
}

export interface RollbackOperation {
  readonly operationId: string;
  readonly execute: () => Promise<void>;
  readonly priority: number; // Higher priority executes first during rollback
  readonly timeout: number;
}

export interface TransactionResult {
  readonly transactionId: string;
  readonly success: boolean;
  readonly operations: TransactionOperation[];
  readonly duration: number;
  readonly conversationSummary: string;
}

@Injectable()
export class ConversationalValidationTransaction {
  private readonly logger = new Logger(ConversationalValidationTransaction.name);
  private readonly transactionId: string;
  private readonly operations: TransactionOperation[] = [];
  private readonly rollbackStack: RollbackOperation[] = [];
  private readonly startTime: Date;
  private isCommitted = false;
  private isRolledBack = false;

  constructor(
    private readonly parlantService: ParlantIntegrationService,
    transactionId?: string
  ) {
    this.transactionId = transactionId ?? `cvt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.startTime = new Date();
    this.logger.log(`Conversational validation transaction started: ${this.transactionId}`);
  }

  /**
   * Execute operation with conversational validation and automatic rollback registration
   */
  async executeWithValidation<T>(
    operation: () => Promise<T>,
    validationRequest: ParlantValidationRequest,
    rollbackOperation: () => Promise<void>,
    rollbackPriority: number = 0,
    rollbackTimeout: number = 30000
  ): Promise<T> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error(`Transaction ${this.transactionId} is already finalized`);
    }

    const operationId = `op_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.debug(`[${this.transactionId}] Executing operation: ${operationId}`);

    // 1. Conversational Pre-validation
    const validation = await this.parlantService.validateFunctionExecution({
      ...validationRequest,
      operationId: `${this.transactionId}_${operationId}`
    });

    if (!validation.approved) {
      this.logger.warn(`[${this.transactionId}] Operation ${operationId} rejected by conversational validation`);
      throw new ConversationalValidationError(
        validation.conversationId,
        validation.reasoning,
        validation.suggestedAlternatives
      );
    }

    // 2. Execute Operation with Error Handling
    try {
      const result = await operation();

      // 3. Register Successful Operation and Rollback
      this.registerOperation(operationId, result, validation.conversationId);
      this.registerRollback(operationId, rollbackOperation, rollbackPriority, rollbackTimeout);

      this.logger.debug(`[${this.transactionId}] Operation ${operationId} completed successfully`);
      return result;

    } catch (error) {
      this.logger.error(`[${this.transactionId}] Operation ${operationId} failed: ${error.message}`);

      // 4. Automatic Rollback on Failure
      await this.executeRollback();
      throw error;
    }
  }

  /**
   * Execute operation without validation (for internal operations)
   */
  async executeInternal<T>(
    operation: () => Promise<T>,
    rollbackOperation: () => Promise<void>,
    operationDescription: string = 'internal operation'
  ): Promise<T> {
    const operationId = `internal_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      const result = await operation();
      this.registerOperation(operationId, result, 'internal');
      this.registerRollback(operationId, rollbackOperation, 0);
      return result;
    } catch (error) {
      this.logger.error(`[${this.transactionId}] Internal operation failed: ${error.message}`);
      await this.executeRollback();
      throw error;
    }
  }

  /**
   * Commit transaction with optional final validation
   */
  async commitTransaction(finalValidationRequired: boolean = false): Promise<TransactionResult> {
    if (this.isCommitted || this.isRolledBack) {
      throw new Error(`Transaction ${this.transactionId} is already finalized`);
    }

    this.logger.debug(`[${this.transactionId}] Committing transaction with ${this.operations.length} operations`);

    if (finalValidationRequired && this.operations.length > 0) {
      const commitValidation = await this.validateCommit();
      if (!commitValidation.approved) {
        this.logger.warn(`[${this.transactionId}] Commit validation rejected`);
        await this.executeRollback();
        throw new ConversationalValidationError(
          commitValidation.conversationId,
          'Transaction commit rejected by conversational validation',
          commitValidation.suggestedAlternatives
        );
      }
    }

    const result = this.finalizeCommit();
    this.logger.log(`[${this.transactionId}] Transaction committed successfully`);
    return result;
  }

  /**
   * Execute rollback of all operations
   */
  async executeRollback(): Promise<void> {
    if (this.isRolledBack) {
      this.logger.warn(`[${this.transactionId}] Transaction already rolled back`);
      return;
    }

    this.logger.warn(`[${this.transactionId}] Executing rollback of ${this.rollbackStack.length} operations`);

    // Sort rollback operations by priority (highest first)
    const sortedRollbacks = [...this.rollbackStack].sort((a, b) => b.priority - a.priority);

    const rollbackResults: Array<{ operationId: string; success: boolean; error?: string }> = [];

    for (const rollback of sortedRollbacks) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Rollback timeout')), rollback.timeout)
        );

        await Promise.race([rollback.execute(), timeoutPromise]);
        rollbackResults.push({ operationId: rollback.operationId, success: true });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown rollback error';
        this.logger.error(`[${this.transactionId}] Rollback failed for operation ${rollback.operationId}: ${errorMessage}`);
        rollbackResults.push({
          operationId: rollback.operationId,
          success: false,
          error: errorMessage
        });
        // Continue with remaining rollbacks even if one fails
      }
    }

    this.isRolledBack = true;

    const successfulRollbacks = rollbackResults.filter(r => r.success).length;
    const failedRollbacks = rollbackResults.filter(r => !r.success).length;

    this.logger.warn(`[${this.transactionId}] Rollback completed: ${successfulRollbacks} successful, ${failedRollbacks} failed`);

    if (failedRollbacks > 0) {
      // Log failed rollbacks for manual intervention
      const failedOps = rollbackResults.filter(r => !r.success);
      this.logger.error(`[${this.transactionId}] Failed rollback operations require manual intervention:`, failedOps);
    }
  }

  /**
   * Get transaction status
   */
  getStatus(): {
    transactionId: string;
    isCommitted: boolean;
    isRolledBack: boolean;
    operationsCount: number;
    duration: number;
  } {
    return {
      transactionId: this.transactionId,
      isCommitted: this.isCommitted,
      isRolledBack: this.isRolledBack,
      operationsCount: this.operations.length,
      duration: Date.now() - this.startTime.getTime()
    };
  }

  // Private Helper Methods

  private registerOperation(operationId: string, result: unknown, conversationId: string): void {
    this.operations.push({
      operationId,
      result,
      timestamp: new Date(),
      conversationId
    });
  }

  private registerRollback(
    operationId: string,
    rollbackOperation: () => Promise<void>,
    priority: number = 0,
    timeout: number = 30000
  ): void {
    this.rollbackStack.push({
      operationId,
      execute: rollbackOperation,
      priority,
      timeout
    });
  }

  private async validateCommit(): Promise<{ approved: boolean; conversationId: string; reasoning?: string; suggestedAlternatives?: string[] }> {
    const commitValidationRequest: ParlantValidationRequest = {
      functionName: 'commitTransaction',
      functionParams: {
        transactionId: this.transactionId,
        operationsCount: this.operations.length,
        operationSummary: this.operations.map(op => op.operationId).join(', ')
      },
      actionDescription: `Commit transaction ${this.transactionId} with ${this.operations.length} operations`,
      context: {
        userId: 'system',
        agentRole: 'transaction_manager',
        securityLevel: 'HIGH',
        conversationHistory: [],
        metadata: {
          transactionId: this.transactionId,
          operationsCount: this.operations.length
        }
      },
      riskLevel: this.operations.length > 5 ? 'HIGH' : 'MEDIUM',
      operationId: `${this.transactionId}_commit`
    };

    try {
      const validation = await this.parlantService.validateFunctionExecution(commitValidationRequest);
      return {
        approved: validation.approved,
        conversationId: validation.conversationId,
        reasoning: validation.reasoning,
        suggestedAlternatives: validation.suggestedAlternatives
      };
    } catch (error) {
      return {
        approved: false,
        conversationId: 'error',
        reasoning: `Commit validation failed: ${error.message}`,
        suggestedAlternatives: ['Retry commit validation', 'Manual transaction review']
      };
    }
  }

  private finalizeCommit(): TransactionResult {
    this.isCommitted = true;
    const duration = Date.now() - this.startTime.getTime();

    return {
      transactionId: this.transactionId,
      success: true,
      operations: [...this.operations],
      duration,
      conversationSummary: `Transaction ${this.transactionId} committed with ${this.operations.length} operations in ${duration}ms`
    };
  }
}
```

### 1.2 Usage Examples

```typescript
// Example 1: Database Transaction with Browser Actions
export class DatabaseBrowserTransactionExample {
  constructor(
    private readonly databaseService: ConversationalDatabaseService,
    private readonly browserService: ParlantValidatedBrowserUseService,
    private readonly parlantService: ParlantIntegrationService
  ) {}

  async createUserWithBrowserVerification(userData: UserData, verificationUrl: string): Promise<User> {
    const transaction = new ConversationalValidationTransaction(this.parlantService);

    try {
      // Step 1: Create user in database
      const user = await transaction.executeWithValidation(
        () => this.databaseService.create(userData),
        {
          functionName: 'createUser',
          functionParams: userData,
          actionDescription: `Create new user: ${userData.email}`,
          context: this.createConversationContext('create_user'),
          riskLevel: 'MEDIUM',
          operationId: 'create_user'
        },
        () => this.databaseService.delete(user.id), // Rollback: delete created user
        10 // High priority rollback
      );

      // Step 2: Verify user via browser automation
      const verification = await transaction.executeWithValidation(
        () => this.browserService.navigateAndVerify(verificationUrl, user.email),
        {
          functionName: 'verifyUserBrowser',
          functionParams: { url: verificationUrl, email: user.email },
          actionDescription: `Browser verification for user: ${user.email}`,
          context: this.createConversationContext('verify_user'),
          riskLevel: 'HIGH',
          operationId: 'verify_user'
        },
        () => this.browserService.cancelVerification(user.email), // Rollback: cancel verification
        5 // Medium priority rollback
      );

      // Step 3: Update user verification status
      const updatedUser = await transaction.executeWithValidation(
        () => this.databaseService.update(user.id, { verified: true, verificationDate: new Date() }),
        {
          functionName: 'updateUserVerification',
          functionParams: { userId: user.id, verified: true },
          actionDescription: `Mark user as verified: ${user.email}`,
          context: this.createConversationContext('update_verification'),
          riskLevel: 'MEDIUM',
          operationId: 'update_verification'
        },
        () => this.databaseService.update(user.id, { verified: false, verificationDate: null }), // Rollback: unverify user
        8 // High priority rollback
      );

      // Commit transaction with final validation
      await transaction.commitTransaction(true);
      return updatedUser;

    } catch (error) {
      // Transaction automatically rolls back on error
      throw new Error(`User creation with verification failed: ${error.message}`);
    }
  }
}

// Example 2: Multi-Service Data Processing
export class MultiServiceProcessingExample {
  async processInputDataAcrossServices(inputData: InputData): Promise<ProcessingResult> {
    const transaction = new ConversationalValidationTransaction(this.parlantService);

    try {
      // Step 1: Validate and capture input
      const capturedInput = await transaction.executeWithValidation(
        () => this.inputService.captureAndValidate(inputData),
        {
          functionName: 'captureInput',
          functionParams: inputData,
          actionDescription: 'Capture and validate input data',
          context: this.createInputContext(),
          riskLevel: 'LOW',
          operationId: 'capture_input'
        },
        () => this.inputService.discardInput(inputData.id)
      );

      // Step 2: Process data with AI services
      const aiProcessing = await transaction.executeWithValidation(
        () => this.aiService.processInput(capturedInput),
        {
          functionName: 'processWithAI',
          functionParams: { inputId: capturedInput.id },
          actionDescription: 'Process input data with AI services',
          context: this.createAIContext(),
          riskLevel: 'MEDIUM',
          operationId: 'ai_processing'
        },
        () => this.aiService.cancelProcessing(capturedInput.id)
      );

      // Step 3: Store results
      const storedResult = await transaction.executeWithValidation(
        () => this.databaseService.storeProcessingResult(aiProcessing),
        {
          functionName: 'storeResult',
          functionParams: { result: aiProcessing },
          actionDescription: 'Store AI processing results',
          context: this.createStorageContext(),
          riskLevel: 'MEDIUM',
          operationId: 'store_result'
        },
        () => this.databaseService.deleteResult(aiProcessing.id)
      );

      await transaction.commitTransaction();
      return storedResult;

    } catch (error) {
      throw new Error(`Multi-service processing failed: ${error.message}`);
    }
  }
}
```

## 2. Multi-Service Compensation Pattern

### 2.1 Core Implementation

```typescript
/**
 * Multi-Service Compensation Manager - Saga pattern for distributed PARLANT validation
 * Handles distributed transactions across multiple services with compensating actions
 */
export interface DistributedTransactionStep {
  readonly stepId: string;
  readonly serviceName: string;
  readonly operationName: string;
  readonly execute: () => Promise<unknown>;
  readonly compensationAction: CompensationAction;
  readonly validationRequest: ParlantValidationRequest;
  readonly dependencies: string[]; // stepIds this step depends on
  readonly timeout: number;
}

export interface CompensationAction {
  readonly compensationId: string;
  readonly execute: () => Promise<void>;
  readonly description: string;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly timeout: number;
}

export interface DistributedTransactionPlan {
  readonly sagaId: string;
  readonly description: string;
  readonly steps: DistributedTransactionStep[];
  readonly overallTimeout: number;
  readonly requiresFinalValidation: boolean;
}

export interface ExecutedAction {
  readonly stepId: string;
  readonly result: unknown;
  readonly executedAt: Date;
  readonly compensationAction: CompensationAction;
  readonly conversationId: string;
}

export interface DistributedTransactionResult {
  readonly sagaId: string;
  readonly success: boolean;
  readonly executedActions: ExecutedAction[];
  readonly compensationExecuted: boolean;
  readonly duration: number;
  readonly finalConversationId?: string;
}

@Injectable()
export class MultiServiceCompensationManager {
  private readonly logger = new Logger(MultiServiceCompensationManager.name);
  private readonly compensationRegistry = new Map<string, CompensationAction[]>();
  private readonly executionHistory = new Map<string, ExecutedAction[]>();

  constructor(private readonly parlantService: ParlantIntegrationService) {}

  /**
   * Execute distributed transaction with automatic compensation on failure
   */
  async executeDistributedTransaction(
    transactionPlan: DistributedTransactionPlan
  ): Promise<DistributedTransactionResult> {
    const sagaId = transactionPlan.sagaId;
    const startTime = Date.now();
    const executedActions: ExecutedAction[] = [];

    this.logger.log(`[${sagaId}] Starting distributed transaction with ${transactionPlan.steps.length} steps`);

    try {
      // Validate overall transaction plan
      await this.validateTransactionPlan(transactionPlan);

      // Execute steps in dependency order
      const executionOrder = this.determineExecutionOrder(transactionPlan.steps);

      for (const step of executionOrder) {
        const executedAction = await this.executeStep(step, sagaId);
        executedActions.push(executedAction);
        this.registerCompensation(sagaId, step.compensationAction);
      }

      // Final validation if required
      if (transactionPlan.requiresFinalValidation) {
        const finalValidation = await this.validateFinalState(transactionPlan, executedActions);
        if (!finalValidation.approved) {
          throw new ConversationalValidationError(
            finalValidation.conversationId,
            `Final validation failed: ${finalValidation.reasoning}`
          );
        }
      }

      this.executionHistory.set(sagaId, executedActions);
      const duration = Date.now() - startTime;

      this.logger.log(`[${sagaId}] Distributed transaction completed successfully in ${duration}ms`);

      return {
        sagaId,
        success: true,
        executedActions,
        compensationExecuted: false,
        duration,
        finalConversationId: executedActions[executedActions.length - 1]?.conversationId
      };

    } catch (error) {
      this.logger.error(`[${sagaId}] Distributed transaction failed: ${error.message}`);

      // Execute compensation for all completed actions
      const compensationResult = await this.compensateExecutedActions(sagaId, executedActions);
      const duration = Date.now() - startTime;

      return {
        sagaId,
        success: false,
        executedActions,
        compensationExecuted: compensationResult.success,
        duration,
        finalConversationId: undefined
      };
    }
  }

  /**
   * Execute individual step with validation
   */
  private async executeStep(
    step: DistributedTransactionStep,
    sagaId: string
  ): Promise<ExecutedAction> {
    this.logger.debug(`[${sagaId}] Executing step: ${step.stepId}`);

    // Validate step execution
    const validation = await this.parlantService.validateFunctionExecution({
      ...step.validationRequest,
      operationId: `${sagaId}_${step.stepId}`
    });

    if (!validation.approved) {
      throw new ConversationalValidationError(
        validation.conversationId,
        `Step ${step.stepId} rejected: ${validation.reasoning}`,
        validation.suggestedAlternatives
      );
    }

    // Execute step with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Step ${step.stepId} timeout`)), step.timeout)
    );

    try {
      const result = await Promise.race([step.execute(), timeoutPromise]);

      return {
        stepId: step.stepId,
        result,
        executedAt: new Date(),
        compensationAction: step.compensationAction,
        conversationId: validation.conversationId
      };

    } catch (error) {
      this.logger.error(`[${sagaId}] Step ${step.stepId} execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute compensation actions for failed transaction
   */
  private async compensateExecutedActions(
    sagaId: string,
    executedActions: ExecutedAction[]
  ): Promise<{ success: boolean; compensatedCount: number; failedCount: number }> {
    if (executedActions.length === 0) {
      return { success: true, compensatedCount: 0, failedCount: 0 };
    }

    this.logger.warn(`[${sagaId}] Executing compensation for ${executedActions.length} actions`);

    // Execute compensations in reverse order
    const compensationResults: Array<{ action: ExecutedAction; success: boolean; error?: string }> = [];

    for (const action of executedActions.reverse()) {
      try {
        // Validate compensation action
        const compensationValidation = await this.validateCompensationAction(action, sagaId);

        if (!compensationValidation.approved) {
          this.logger.warn(`[${sagaId}] Compensation validation rejected for ${action.stepId}: ${compensationValidation.reasoning}`);
          compensationResults.push({ action, success: false, error: compensationValidation.reasoning });
          continue;
        }

        // Execute compensation with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Compensation timeout')), action.compensationAction.timeout)
        );

        await Promise.race([action.compensationAction.execute(), timeoutPromise]);
        compensationResults.push({ action, success: true });

        this.logger.debug(`[${sagaId}] Compensation executed successfully for step: ${action.stepId}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown compensation error';
        this.logger.error(`[${sagaId}] Compensation failed for step ${action.stepId}: ${errorMessage}`);
        compensationResults.push({ action, success: false, error: errorMessage });
      }
    }

    const successfulCompensations = compensationResults.filter(r => r.success).length;
    const failedCompensations = compensationResults.filter(r => !r.success).length;

    if (failedCompensations > 0) {
      const failedActions = compensationResults.filter(r => !r.success);
      this.logger.error(`[${sagaId}] Failed compensations require manual intervention:`, failedActions);
    }

    this.logger.warn(`[${sagaId}] Compensation completed: ${successfulCompensations} successful, ${failedCompensations} failed`);

    return {
      success: failedCompensations === 0,
      compensatedCount: successfulCompensations,
      failedCount: failedCompensations
    };
  }

  // Helper Methods

  private registerCompensation(sagaId: string, compensationAction: CompensationAction): void {
    if (!this.compensationRegistry.has(sagaId)) {
      this.compensationRegistry.set(sagaId, []);
    }
    this.compensationRegistry.get(sagaId)!.push(compensationAction);
  }

  private determineExecutionOrder(steps: DistributedTransactionStep[]): DistributedTransactionStep[] {
    // Topological sort based on dependencies
    const sorted: DistributedTransactionStep[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: DistributedTransactionStep) => {
      if (visiting.has(step.stepId)) {
        throw new Error(`Circular dependency detected involving step: ${step.stepId}`);
      }
      if (visited.has(step.stepId)) {
        return;
      }

      visiting.add(step.stepId);

      // Visit dependencies first
      for (const depId of step.dependencies) {
        const depStep = steps.find(s => s.stepId === depId);
        if (depStep) {
          visit(depStep);
        }
      }

      visiting.delete(step.stepId);
      visited.add(step.stepId);
      sorted.push(step);
    };

    for (const step of steps) {
      visit(step);
    }

    return sorted;
  }

  private async validateTransactionPlan(plan: DistributedTransactionPlan): Promise<void> {
    const planValidation = await this.parlantService.validateFunctionExecution({
      functionName: 'executeDistributedTransaction',
      functionParams: {
        sagaId: plan.sagaId,
        stepsCount: plan.steps.length,
        overallTimeout: plan.overallTimeout
      },
      actionDescription: `Execute distributed transaction: ${plan.description}`,
      context: {
        userId: 'system',
        agentRole: 'saga_manager',
        securityLevel: 'HIGH',
        conversationHistory: [],
        metadata: { sagaId: plan.sagaId }
      },
      riskLevel: plan.steps.length > 3 ? 'HIGH' : 'MEDIUM',
      operationId: `${plan.sagaId}_plan_validation`
    });

    if (!planValidation.approved) {
      throw new ConversationalValidationError(
        planValidation.conversationId,
        `Transaction plan rejected: ${planValidation.reasoning}`,
        planValidation.suggestedAlternatives
      );
    }
  }

  private async validateFinalState(
    plan: DistributedTransactionPlan,
    executedActions: ExecutedAction[]
  ): Promise<{ approved: boolean; conversationId: string; reasoning?: string }> {
    const finalValidation = await this.parlantService.validateFunctionExecution({
      functionName: 'validateFinalTransactionState',
      functionParams: {
        sagaId: plan.sagaId,
        executedSteps: executedActions.map(a => a.stepId),
        resultsCount: executedActions.length
      },
      actionDescription: `Validate final state of distributed transaction: ${plan.sagaId}`,
      context: {
        userId: 'system',
        agentRole: 'saga_validator',
        securityLevel: 'CRITICAL',
        conversationHistory: [],
        metadata: { sagaId: plan.sagaId, executedActions: executedActions.length }
      },
      riskLevel: 'HIGH',
      operationId: `${plan.sagaId}_final_validation`
    });

    return {
      approved: finalValidation.approved,
      conversationId: finalValidation.conversationId,
      reasoning: finalValidation.reasoning
    };
  }

  private async validateCompensationAction(
    action: ExecutedAction,
    sagaId: string
  ): Promise<{ approved: boolean; reasoning?: string }> {
    const compensationValidation = await this.parlantService.validateFunctionExecution({
      functionName: 'executeCompensation',
      functionParams: {
        stepId: action.stepId,
        compensationDescription: action.compensationAction.description,
        riskLevel: action.compensationAction.riskLevel
      },
      actionDescription: `Execute compensation for step: ${action.stepId}`,
      context: {
        userId: 'system',
        agentRole: 'compensation_manager',
        securityLevel: 'HIGH',
        conversationHistory: [],
        metadata: { sagaId, stepId: action.stepId }
      },
      riskLevel: action.compensationAction.riskLevel as any,
      operationId: `${sagaId}_${action.stepId}_compensation`
    });

    return {
      approved: compensationValidation.approved,
      reasoning: compensationValidation.reasoning
    };
  }
}
```

### 2.2 Usage Examples

```typescript
// Example: E-commerce Order Processing Saga
export class EcommerceOrderSaga {
  constructor(
    private readonly compensationManager: MultiServiceCompensationManager,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly shippingService: ShippingService,
    private readonly emailService: EmailService
  ) {}

  async processOrder(orderData: OrderData): Promise<DistributedTransactionResult> {
    const sagaId = `order_saga_${orderData.orderId}`;

    const transactionPlan: DistributedTransactionPlan = {
      sagaId,
      description: `Process order ${orderData.orderId}`,
      overallTimeout: 300000, // 5 minutes
      requiresFinalValidation: true,
      steps: [
        // Step 1: Reserve inventory
        {
          stepId: 'reserve_inventory',
          serviceName: 'inventory',
          operationName: 'reserveItems',
          execute: () => this.inventoryService.reserveItems(orderData.items),
          compensationAction: {
            compensationId: 'release_inventory',
            execute: () => this.inventoryService.releaseReservation(orderData.orderId),
            description: 'Release inventory reservation',
            riskLevel: 'LOW',
            timeout: 10000
          },
          validationRequest: {
            functionName: 'reserveInventory',
            functionParams: { orderId: orderData.orderId, items: orderData.items },
            actionDescription: `Reserve inventory for order ${orderData.orderId}`,
            context: this.createOrderContext('inventory', orderData),
            riskLevel: 'MEDIUM',
            operationId: 'reserve_inventory'
          },
          dependencies: [],
          timeout: 30000
        },

        // Step 2: Process payment (depends on inventory reservation)
        {
          stepId: 'process_payment',
          serviceName: 'payment',
          operationName: 'chargeCard',
          execute: () => this.paymentService.processPayment(orderData.payment),
          compensationAction: {
            compensationId: 'refund_payment',
            execute: () => this.paymentService.refundPayment(orderData.orderId),
            description: 'Refund processed payment',
            riskLevel: 'HIGH',
            timeout: 60000
          },
          validationRequest: {
            functionName: 'processPayment',
            functionParams: { orderId: orderData.orderId, amount: orderData.total },
            actionDescription: `Process payment for order ${orderData.orderId}`,
            context: this.createOrderContext('payment', orderData),
            riskLevel: 'HIGH',
            operationId: 'process_payment'
          },
          dependencies: ['reserve_inventory'],
          timeout: 45000
        },

        // Step 3: Create shipping label (depends on payment)
        {
          stepId: 'create_shipping',
          serviceName: 'shipping',
          operationName: 'createLabel',
          execute: () => this.shippingService.createShippingLabel(orderData.shipping),
          compensationAction: {
            compensationId: 'cancel_shipping',
            execute: () => this.shippingService.cancelShippingLabel(orderData.orderId),
            description: 'Cancel shipping label',
            riskLevel: 'MEDIUM',
            timeout: 20000
          },
          validationRequest: {
            functionName: 'createShipping',
            functionParams: { orderId: orderData.orderId, address: orderData.shipping },
            actionDescription: `Create shipping label for order ${orderData.orderId}`,
            context: this.createOrderContext('shipping', orderData),
            riskLevel: 'MEDIUM',
            operationId: 'create_shipping'
          },
          dependencies: ['process_payment'],
          timeout: 30000
        },

        // Step 4: Send confirmation email (depends on shipping)
        {
          stepId: 'send_confirmation',
          serviceName: 'email',
          operationName: 'sendConfirmation',
          execute: () => this.emailService.sendOrderConfirmation(orderData),
          compensationAction: {
            compensationId: 'send_cancellation',
            execute: () => this.emailService.sendOrderCancellation(orderData.orderId),
            description: 'Send cancellation email',
            riskLevel: 'LOW',
            timeout: 15000
          },
          validationRequest: {
            functionName: 'sendConfirmation',
            functionParams: { orderId: orderData.orderId, email: orderData.customerEmail },
            actionDescription: `Send confirmation email for order ${orderData.orderId}`,
            context: this.createOrderContext('email', orderData),
            riskLevel: 'LOW',
            operationId: 'send_confirmation'
          },
          dependencies: ['create_shipping'],
          timeout: 20000
        }
      ]
    };

    return this.compensationManager.executeDistributedTransaction(transactionPlan);
  }

  private createOrderContext(service: string, orderData: OrderData): any {
    return {
      userId: orderData.customerId,
      agentRole: `order_processor_${service}`,
      securityLevel: service === 'payment' ? 'CRITICAL' : 'MEDIUM',
      conversationHistory: [],
      metadata: {
        orderId: orderData.orderId,
        service,
        customerEmail: orderData.customerEmail
      }
    };
  }
}
```

## 3. Idempotent Operation Pattern

### 3.1 Core Implementation

```typescript
/**
 * Conversational Idempotency Manager - Ensures operations can be safely retried
 * Provides idempotent execution with conversational validation and result caching
 */
export interface OperationResult {
  readonly status: 'in_progress' | 'completed' | 'failed';
  readonly result?: unknown;
  readonly error?: string;
  readonly startTime?: Date;
  readonly completionTime?: Date;
  readonly failureTime?: Date;
  readonly conversationId?: string;
  readonly validationRequest?: ParlantValidationRequest;
  readonly retryCount?: number;
}

export interface IdempotencyConfiguration {
  readonly maxRetries: number;
  readonly retryDelayMs: number;
  readonly resultCacheTtlMs: number;
  readonly enableConversationalRevalidation: boolean;
  readonly cleanupIntervalMs: number;
}

@Injectable()
export class ConversationalIdempotencyManager {
  private readonly logger = new Logger(ConversationalIdempotencyManager.name);
  private readonly operationRegistry = new Map<string, OperationResult>();
  private readonly waitingOperations = new Map<string, Promise<unknown>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly parlantService: ParlantIntegrationService,
    private readonly config: IdempotencyConfiguration = {
      maxRetries: 3,
      retryDelayMs: 1000,
      resultCacheTtlMs: 300000, // 5 minutes
      enableConversationalRevalidation: true,
      cleanupIntervalMs: 60000 // 1 minute
    }
  ) {
    this.startCleanupProcess();
  }

  /**
   * Execute operation idempotently with conversational validation
   */
  async executeIdempotently<T>(
    idempotencyKey: string,
    operation: () => Promise<T>,
    validationRequest: ParlantValidationRequest,
    options: {
      maxRetries?: number;
      retryDelayMs?: number;
      enableRevalidation?: boolean;
    } = {}
  ): Promise<T> {
    const effectiveOptions = {
      maxRetries: options.maxRetries ?? this.config.maxRetries,
      retryDelayMs: options.retryDelayMs ?? this.config.retryDelayMs,
      enableRevalidation: options.enableRevalidation ?? this.config.enableConversationalRevalidation
    };

    this.logger.debug(`Executing idempotent operation: ${idempotencyKey}`);

    // Check for existing operation
    const existingResult = this.operationRegistry.get(idempotencyKey);

    if (existingResult) {
      return this.handleExistingOperation<T>(idempotencyKey, existingResult, validationRequest, effectiveOptions);
    }

    // Register new operation as in progress
    this.registerOperation(idempotencyKey, {
      status: 'in_progress',
      startTime: new Date(),
      validationRequest,
      retryCount: 0
    });

    // Create operation promise and register for waiting operations
    const operationPromise = this.executeWithRetries<T>(
      idempotencyKey,
      operation,
      validationRequest,
      effectiveOptions
    );

    this.waitingOperations.set(idempotencyKey, operationPromise);

    try {
      const result = await operationPromise;
      this.waitingOperations.delete(idempotencyKey);
      return result;
    } catch (error) {
      this.waitingOperations.delete(idempotencyKey);
      throw error;
    }
  }

  /**
   * Check if operation result exists and is valid
   */
  async hasValidResult(idempotencyKey: string): Promise<boolean> {
    const existingResult = this.operationRegistry.get(idempotencyKey);

    if (!existingResult) {
      return false;
    }

    // Check if result is still valid based on TTL
    if (existingResult.status === 'completed' && existingResult.completionTime) {
      const age = Date.now() - existingResult.completionTime.getTime();
      return age < this.config.resultCacheTtlMs;
    }

    return existingResult.status === 'completed';
  }

  /**
   * Get cached operation result if available
   */
  async getCachedResult<T>(idempotencyKey: string): Promise<T | null> {
    const existingResult = this.operationRegistry.get(idempotencyKey);

    if (!existingResult || existingResult.status !== 'completed') {
      return null;
    }

    // Check TTL
    if (existingResult.completionTime) {
      const age = Date.now() - existingResult.completionTime.getTime();
      if (age >= this.config.resultCacheTtlMs) {
        this.operationRegistry.delete(idempotencyKey);
        return null;
      }
    }

    return existingResult.result as T;
  }

  /**
   * Invalidate cached result for an operation
   */
  async invalidateResult(idempotencyKey: string): Promise<void> {
    this.operationRegistry.delete(idempotencyKey);
    this.logger.debug(`Invalidated cached result for: ${idempotencyKey}`);
  }

  /**
   * Get operation status and metadata
   */
  getOperationStatus(idempotencyKey: string): OperationResult | null {
    return this.operationRegistry.get(idempotencyKey) ?? null;
  }

  // Private Methods

  private async handleExistingOperation<T>(
    idempotencyKey: string,
    existingResult: OperationResult,
    validationRequest: ParlantValidationRequest,
    options: { maxRetries: number; retryDelayMs: number; enableRevalidation: boolean }
  ): Promise<T> {
    switch (existingResult.status) {
      case 'completed':
        // Check if result is still valid
        if (existingResult.completionTime) {
          const age = Date.now() - existingResult.completionTime.getTime();
          if (age >= this.config.resultCacheTtlMs) {
            this.logger.debug(`Cached result expired for: ${idempotencyKey}, re-executing`);
            this.operationRegistry.delete(idempotencyKey);
            return this.executeIdempotently(idempotencyKey, undefined!, validationRequest, options);
          }
        }

        // Revalidate if enabled and significant time has passed
        if (options.enableRevalidation && this.shouldRevalidate(existingResult)) {
          await this.revalidateExistingResult(idempotencyKey, existingResult, validationRequest);
        }

        this.logger.debug(`Returning cached result for: ${idempotencyKey}`);
        return existingResult.result as T;

      case 'in_progress':
        // Wait for existing operation to complete
        this.logger.debug(`Waiting for in-progress operation: ${idempotencyKey}`);
        return this.waitForCompletion<T>(idempotencyKey);

      case 'failed':
        // Retry failed operation if within retry limits
        const retryCount = existingResult.retryCount ?? 0;
        if (retryCount < options.maxRetries) {
          this.logger.debug(`Retrying failed operation: ${idempotencyKey} (attempt ${retryCount + 1}/${options.maxRetries})`);

          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, options.retryDelayMs * (retryCount + 1)));

          // Update retry count and re-execute
          this.updateOperationRetryCount(idempotencyKey, retryCount + 1);
          return this.executeWithRetries(idempotencyKey, undefined!, validationRequest, options);
        } else {
          throw new Error(`Operation ${idempotencyKey} failed after ${options.maxRetries} retries: ${existingResult.error}`);
        }

      default:
        throw new Error(`Unknown operation status: ${existingResult.status}`);
    }
  }

  private async executeWithRetries<T>(
    idempotencyKey: string,
    operation: () => Promise<T>,
    validationRequest: ParlantValidationRequest,
    options: { maxRetries: number; retryDelayMs: number; enableRevalidation: boolean }
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
      try {
        // Execute with conversational validation
        const validation = await this.parlantService.validateFunctionExecution({
          ...validationRequest,
          operationId: `${validationRequest.operationId}_attempt_${attempt}`
        });

        if (!validation.approved) {
          const error = new ConversationalValidationError(
            validation.conversationId,
            validation.reasoning,
            validation.suggestedAlternatives
          );

          this.registerOperationFailure(idempotencyKey, error.message, validation.conversationId);
          throw error;
        }

        // Execute the operation
        const result = await operation();

        // Mark as completed
        this.registerOperationCompletion(idempotencyKey, result, validation.conversationId);

        this.logger.debug(`Operation completed successfully: ${idempotencyKey} (attempt ${attempt + 1})`);
        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < options.maxRetries) {
          this.logger.warn(`Operation attempt ${attempt + 1} failed for ${idempotencyKey}: ${lastError.message}, retrying...`);
          this.updateOperationRetryCount(idempotencyKey, attempt + 1);

          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, options.retryDelayMs * Math.pow(2, attempt)));
        } else {
          this.logger.error(`Operation failed after ${options.maxRetries + 1} attempts: ${idempotencyKey}`);
          this.registerOperationFailure(idempotencyKey, lastError.message);
        }
      }
    }

    throw lastError ?? new Error(`Operation failed after ${options.maxRetries + 1} attempts`);
  }

  private async waitForCompletion<T>(idempotencyKey: string): Promise<T> {
    const waitingPromise = this.waitingOperations.get(idempotencyKey);

    if (waitingPromise) {
      try {
        return await waitingPromise as T;
      } catch (error) {
        // If waiting promise failed, check final result in registry
        const finalResult = this.operationRegistry.get(idempotencyKey);
        if (finalResult?.status === 'completed') {
          return finalResult.result as T;
        }
        throw error;
      }
    }

    // Poll for completion if no waiting promise
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(() => {
        const result = this.operationRegistry.get(idempotencyKey);

        if (!result) {
          clearInterval(pollInterval);
          reject(new Error(`Operation ${idempotencyKey} no longer exists`));
          return;
        }

        if (result.status === 'completed') {
          clearInterval(pollInterval);
          resolve(result.result as T);
        } else if (result.status === 'failed') {
          clearInterval(pollInterval);
          reject(new Error(`Operation ${idempotencyKey} failed: ${result.error}`));
        }
        // Continue polling if still in progress
      }, 100);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error(`Timeout waiting for operation ${idempotencyKey} to complete`));
      }, 300000);
    });
  }

  private shouldRevalidate(existingResult: OperationResult): boolean {
    if (!existingResult.completionTime) {
      return false;
    }

    // Revalidate if result is older than 1 minute
    const age = Date.now() - existingResult.completionTime.getTime();
    return age > 60000;
  }

  private async revalidateExistingResult(
    idempotencyKey: string,
    existingResult: OperationResult,
    validationRequest: ParlantValidationRequest
  ): Promise<void> {
    if (!existingResult.validationRequest) {
      return;
    }

    try {
      const revalidation = await this.parlantService.validateFunctionExecution({
        ...validationRequest,
        operationId: `${validationRequest.operationId}_revalidation`
      });

      if (!revalidation.approved) {
        this.logger.warn(`Revalidation failed for cached result: ${idempotencyKey}, invalidating cache`);
        this.operationRegistry.delete(idempotencyKey);
      }
    } catch (error) {
      this.logger.error(`Revalidation error for ${idempotencyKey}: ${error.message}`);
      // Keep existing result on revalidation error
    }
  }

  private registerOperation(idempotencyKey: string, result: OperationResult): void {
    this.operationRegistry.set(idempotencyKey, result);
  }

  private registerOperationCompletion(idempotencyKey: string, result: unknown, conversationId?: string): void {
    this.operationRegistry.set(idempotencyKey, {
      status: 'completed',
      result,
      completionTime: new Date(),
      conversationId
    });
  }

  private registerOperationFailure(idempotencyKey: string, error: string, conversationId?: string): void {
    this.operationRegistry.set(idempotencyKey, {
      status: 'failed',
      error,
      failureTime: new Date(),
      conversationId
    });
  }

  private updateOperationRetryCount(idempotencyKey: string, retryCount: number): void {
    const existing = this.operationRegistry.get(idempotencyKey);
    if (existing) {
      this.operationRegistry.set(idempotencyKey, {
        ...existing,
        retryCount,
        status: 'in_progress'
      });
    }
  }

  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredResults();
    }, this.config.cleanupIntervalMs);
  }

  private cleanupExpiredResults(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, result] of this.operationRegistry.entries()) {
      let shouldDelete = false;

      if (result.status === 'completed' && result.completionTime) {
        const age = now - result.completionTime.getTime();
        shouldDelete = age >= this.config.resultCacheTtlMs;
      } else if (result.status === 'failed' && result.failureTime) {
        const age = now - result.failureTime.getTime();
        shouldDelete = age >= this.config.resultCacheTtlMs;
      }

      if (shouldDelete) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.operationRegistry.delete(key));

    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired operation results`);
    }
  }

  onApplicationShutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
```

### 3.2 Usage Examples

```typescript
// Example 1: Idempotent File Upload
export class IdempotentFileUploadService {
  constructor(
    private readonly idempotencyManager: ConversationalIdempotencyManager,
    private readonly storageService: StorageService
  ) {}

  async uploadFile(fileData: FileUploadData): Promise<UploadResult> {
    const idempotencyKey = `file_upload_${fileData.checksum}_${fileData.fileName}`;

    return this.idempotencyManager.executeIdempotently(
      idempotencyKey,
      async () => {
        // Actual upload operation
        const uploadResult = await this.storageService.uploadFile(fileData);

        // Verify upload integrity
        const verificationResult = await this.storageService.verifyUpload(uploadResult.fileId);
        if (!verificationResult.isValid) {
          throw new Error('File upload verification failed');
        }

        return {
          fileId: uploadResult.fileId,
          url: uploadResult.url,
          size: fileData.size,
          uploadedAt: new Date(),
          checksum: fileData.checksum
        };
      },
      {
        functionName: 'uploadFile',
        functionParams: {
          fileName: fileData.fileName,
          size: fileData.size,
          mimeType: fileData.mimeType
        },
        actionDescription: `Upload file: ${fileData.fileName} (${fileData.size} bytes)`,
        context: {
          userId: fileData.userId,
          agentRole: 'file_uploader',
          securityLevel: 'MEDIUM',
          conversationHistory: [],
          metadata: { fileName: fileData.fileName, size: fileData.size }
        },
        riskLevel: fileData.size > 100_000_000 ? 'HIGH' : 'MEDIUM', // High risk for large files
        operationId: `upload_${fileData.checksum}`
      },
      {
        maxRetries: 3,
        retryDelayMs: 2000,
        enableRevalidation: true
      }
    );
  }
}

// Example 2: Idempotent Payment Processing
export class IdempotentPaymentService {
  constructor(
    private readonly idempotencyManager: ConversationalIdempotencyManager,
    private readonly paymentProcessor: PaymentProcessor
  ) {}

  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    const idempotencyKey = `payment_${paymentData.orderId}_${paymentData.amount}_${paymentData.currency}`;

    return this.idempotencyManager.executeIdempotently(
      idempotencyKey,
      async () => {
        // Check if payment was already processed
        const existingPayment = await this.paymentProcessor.findPaymentByOrderId(paymentData.orderId);
        if (existingPayment && existingPayment.status === 'completed') {
          return existingPayment;
        }

        // Process payment
        const paymentResult = await this.paymentProcessor.charge({
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.paymentMethod,
          customerId: paymentData.customerId
        });

        // Verify payment status
        const verification = await this.paymentProcessor.verifyPayment(paymentResult.transactionId);
        if (verification.status !== 'success') {
          throw new Error(`Payment verification failed: ${verification.reason}`);
        }

        return {
          transactionId: paymentResult.transactionId,
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: 'completed',
          processedAt: new Date(),
          fees: paymentResult.fees
        };
      },
      {
        functionName: 'processPayment',
        functionParams: {
          orderId: paymentData.orderId,
          amount: paymentData.amount,
          currency: paymentData.currency,
          customerId: paymentData.customerId
        },
        actionDescription: `Process payment for order ${paymentData.orderId}: ${paymentData.amount} ${paymentData.currency}`,
        context: {
          userId: paymentData.customerId,
          agentRole: 'payment_processor',
          securityLevel: 'CRITICAL',
          conversationHistory: [],
          metadata: {
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            currency: paymentData.currency
          }
        },
        riskLevel: paymentData.amount > 1000 ? 'CRITICAL' : 'HIGH',
        operationId: `payment_${paymentData.orderId}`
      },
      {
        maxRetries: 2, // Fewer retries for financial operations
        retryDelayMs: 5000,
        enableRevalidation: false // Disable revalidation for payments
      }
    );
  }
}

// Example 3: Idempotent Data Synchronization
export class IdempotentSyncService {
  constructor(
    private readonly idempotencyManager: ConversationalIdempotencyManager,
    private readonly sourceApi: SourceApiService,
    private readonly targetDatabase: TargetDatabaseService
  ) {}

  async synchronizeData(syncConfig: SyncConfiguration): Promise<SyncResult> {
    const idempotencyKey = `sync_${syncConfig.sourceTable}_${syncConfig.lastSyncTimestamp?.getTime() ?? 'full'}`;

    return this.idempotencyManager.executeIdempotently(
      idempotencyKey,
      async () => {
        // Fetch data from source
        const sourceData = await this.sourceApi.fetchData({
          table: syncConfig.sourceTable,
          since: syncConfig.lastSyncTimestamp,
          batchSize: syncConfig.batchSize
        });

        if (sourceData.records.length === 0) {
          return {
            syncId: this.generateSyncId(),
            recordsProcessed: 0,
            recordsInserted: 0,
            recordsUpdated: 0,
            recordsDeleted: 0,
            syncedAt: new Date(),
            nextSyncTimestamp: new Date()
          };
        }

        // Transform data
        const transformedData = await this.transformRecords(sourceData.records, syncConfig.transformRules);

        // Sync to target database
        const syncResult = await this.targetDatabase.upsertBatch({
          table: syncConfig.targetTable,
          records: transformedData,
          keyFields: syncConfig.keyFields
        });

        // Handle deletions if configured
        let deletedCount = 0;
        if (syncConfig.handleDeletions) {
          const deletions = await this.sourceApi.fetchDeletions({
            table: syncConfig.sourceTable,
            since: syncConfig.lastSyncTimestamp
          });

          if (deletions.length > 0) {
            deletedCount = await this.targetDatabase.deleteByKeys({
              table: syncConfig.targetTable,
              keys: deletions,
              keyFields: syncConfig.keyFields
            });
          }
        }

        return {
          syncId: this.generateSyncId(),
          recordsProcessed: sourceData.records.length,
          recordsInserted: syncResult.insertedCount,
          recordsUpdated: syncResult.updatedCount,
          recordsDeleted: deletedCount,
          syncedAt: new Date(),
          nextSyncTimestamp: sourceData.maxTimestamp
        };
      },
      {
        functionName: 'synchronizeData',
        functionParams: {
          sourceTable: syncConfig.sourceTable,
          targetTable: syncConfig.targetTable,
          recordCount: syncConfig.batchSize
        },
        actionDescription: `Synchronize data from ${syncConfig.sourceTable} to ${syncConfig.targetTable}`,
        context: {
          userId: 'system',
          agentRole: 'data_synchronizer',
          securityLevel: 'MEDIUM',
          conversationHistory: [],
          metadata: {
            sourceTable: syncConfig.sourceTable,
            targetTable: syncConfig.targetTable,
            batchSize: syncConfig.batchSize
          }
        },
        riskLevel: syncConfig.handleDeletions ? 'HIGH' : 'MEDIUM',
        operationId: `sync_${syncConfig.sourceTable}`
      },
      {
        maxRetries: 3,
        retryDelayMs: 10000,
        enableRevalidation: true
      }
    );
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private async transformRecords(records: any[], transformRules: TransformRule[]): Promise<any[]> {
    // Implementation of data transformation logic
    return records; // Placeholder
  }
}
```

## 4. State Consistency Pattern

### 4.1 Core Implementation

```typescript
/**
 * Conversational State Consistency Manager - Ensures state consistency across services
 * Provides state validation, consistency enforcement, and recovery mechanisms
 */
export interface StateValidator {
  readonly validatorId: string;
  readonly serviceName: string;
  readonly validateState: (context: ConversationalValidationContext) => Promise<StateValidationResult>;
  readonly getStateSnapshot: () => Promise<ServiceStateSnapshot>;
  readonly restoreState: (snapshot: ServiceStateSnapshot) => Promise<void>;
}

export interface StateValidationResult {
  readonly validatorId: string;
  readonly serviceName: string;
  readonly consistent: boolean;
  readonly inconsistencies: StateInconsistency[];
  readonly validatedAt: Date;
  readonly stateHash: string;
  readonly confidence: number; // 0-1 scale
}

export interface StateInconsistency {
  readonly inconsistencyId: string;
  readonly type: 'DATA_MISMATCH' | 'STALE_DATA' | 'MISSING_DATA' | 'CONSTRAINT_VIOLATION' | 'ORPHANED_DATA';
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly description: string;
  readonly affectedEntities: string[];
  readonly detectedAt: Date;
  readonly suggestedActions: ConsistencyAction[];
}

export interface ConsistencyAction {
  readonly actionId: string;
  readonly type: 'SYNC_DATA' | 'DELETE_ORPHANED' | 'UPDATE_REFERENCES' | 'RECREATE_ENTITY' | 'MANUAL_REVIEW';
  readonly description: string;
  readonly riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly execute: () => Promise<void>;
  readonly rollback: () => Promise<void>;
  readonly estimatedDuration: number;
  readonly prerequisites: string[];
}

export interface ServiceStateSnapshot {
  readonly serviceName: string;
  readonly snapshotId: string;
  readonly capturedAt: Date;
  readonly stateData: Record<string, unknown>;
  readonly checksum: string;
  readonly version: string;
}

export interface StateConsistencyResult {
  readonly consistent: boolean;
  readonly overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILURE';
  readonly inconsistencies: StateInconsistency[];
  readonly requiredActions: ConsistencyAction[];
  readonly conversationContext: ConversationalValidationContext;
  readonly validatedServices: string[];
  readonly validationDuration: number;
}

export interface ConsistencyEnforcementResult {
  readonly success: boolean;
  readonly actionsExecuted: ConsistencyAction[];
  readonly actionsFailed: Array<{ action: ConsistencyAction; error: string }>;
  readonly finalStateHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILURE';
  readonly enforcementDuration: number;
}

@Injectable()
export class ConversationalStateConsistencyManager {
  private readonly logger = new Logger(ConversationalStateConsistencyManager.name);
  private readonly stateValidators = new Map<string, StateValidator>();
  private readonly stateSnapshots = new Map<string, ServiceStateSnapshot>();
  private readonly consistencyHistory: StateConsistencyResult[] = [];

  constructor(private readonly parlantService: ParlantIntegrationService) {}

  /**
   * Register a state validator for a service
   */
  registerStateValidator(validator: StateValidator): void {
    this.stateValidators.set(validator.serviceName, validator);
    this.logger.log(`Registered state validator for service: ${validator.serviceName}`);
  }

  /**
   * Validate state consistency across all registered services
   */
  async validateStateConsistency(
    context: ConversationalValidationContext
  ): Promise<StateConsistencyResult> {
    const startTime = Date.now();
    const validationTasks: Promise<StateValidationResult>[] = [];

    this.logger.debug(`Starting state consistency validation for ${this.stateValidators.size} services`);

    // Validate each service state
    for (const [serviceName, validator] of this.stateValidators) {
      validationTasks.push(
        this.validateServiceState(serviceName, validator, context)
      );
    }

    const results = await Promise.allSettled(validationTasks);
    const validationResults: StateValidationResult[] = [];
    const allInconsistencies: StateInconsistency[] = [];

    // Process validation results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        validationResults.push(result.value);
        if (!result.value.consistent) {
          allInconsistencies.push(...result.value.inconsistencies);
        }
      } else {
        this.logger.error(`State validation failed: ${result.reason}`);
        // Create a critical inconsistency for failed validation
        allInconsistencies.push({
          inconsistencyId: `validation_failure_${Date.now()}`,
          type: 'CONSTRAINT_VIOLATION',
          severity: 'CRITICAL',
          description: `State validation failed: ${result.reason}`,
          affectedEntities: ['unknown'],
          detectedAt: new Date(),
          suggestedActions: [{
            actionId: `manual_review_${Date.now()}`,
            type: 'MANUAL_REVIEW',
            description: 'Manual investigation required',
            riskLevel: 'CRITICAL',
            execute: async () => { /* Manual review placeholder */ },
            rollback: async () => { /* No rollback needed */ },
            estimatedDuration: 0,
            prerequisites: []
          }]
        });
      }
    }

    // Determine overall consistency
    const isConsistent = allInconsistencies.length === 0;
    const overallHealth = this.determineOverallHealth(allInconsistencies);
    const requiredActions = this.generateConsistencyActions(allInconsistencies);

    const consistencyResult: StateConsistencyResult = {
      consistent: isConsistent,
      overallHealth,
      inconsistencies: allInconsistencies,
      requiredActions,
      conversationContext: context,
      validatedServices: validationResults.map(r => r.serviceName),
      validationDuration: Date.now() - startTime
    };

    // Store in history
    this.consistencyHistory.push(consistencyResult);
    if (this.consistencyHistory.length > 100) {
      this.consistencyHistory.shift(); // Keep only last 100 results
    }

    this.logger.debug(`State consistency validation completed: ${isConsistent ? 'CONSISTENT' : 'INCONSISTENT'} (${allInconsistencies.length} issues)`);

    return consistencyResult;
  }

  /**
   * Enforce state consistency by executing required actions
   */
  async enforceConsistency(
    inconsistencyResult: StateConsistencyResult
  ): Promise<ConsistencyEnforcementResult> {
    if (inconsistencyResult.consistent) {
      return {
        success: true,
        actionsExecuted: [],
        actionsFailed: [],
        finalStateHealth: 'HEALTHY',
        enforcementDuration: 0
      };
    }

    const startTime = Date.now();
    const executedActions: ConsistencyAction[] = [];
    const failedActions: Array<{ action: ConsistencyAction; error: string }> = [];

    this.logger.warn(`Enforcing state consistency: ${inconsistencyResult.requiredActions.length} actions required`);

    // Sort actions by risk level (lowest risk first)
    const sortedActions = [...inconsistencyResult.requiredActions].sort((a, b) => {
      const riskOrder = { 'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });

    for (const action of sortedActions) {
      try {
        // Validate consistency action through conversation
        const validationRequest: ParlantValidationRequest = {
          functionName: 'enforceStateConsistency',
          functionParams: {
            actionType: action.type,
            description: action.description,
            riskLevel: action.riskLevel,
            affectedEntities: action.prerequisites
          },
          actionDescription: `Enforce state consistency: ${action.description}`,
          context: inconsistencyResult.conversationContext,
          riskLevel: action.riskLevel as any,
          operationId: action.actionId
        };

        const validation = await this.parlantService.validateFunctionExecution(validationRequest);
        if (!validation.approved) {
          this.logger.warn(`Consistency action rejected: ${action.description} - ${validation.reasoning}`);
          failedActions.push({
            action,
            error: `Validation rejected: ${validation.reasoning}`
          });
          continue;
        }

        // Check prerequisites
        const prerequisitesMet = await this.checkActionPrerequisites(action);
        if (!prerequisitesMet) {
          failedActions.push({
            action,
            error: 'Prerequisites not met'
          });
          continue;
        }

        // Execute action with timeout
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Action timeout')), action.estimatedDuration + 30000)
        );

        await Promise.race([action.execute(), timeoutPromise]);
        executedActions.push(action);

        this.logger.debug(`Consistency action executed successfully: ${action.description}`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown action error';
        this.logger.error(`Consistency action failed: ${action.description} - ${errorMessage}`);
        failedActions.push({ action, error: errorMessage });

        // If critical action fails, stop enforcement
        if (action.riskLevel === 'CRITICAL') {
          this.logger.error('Critical consistency action failed, stopping enforcement');
          break;
        }
      }
    }

    // Validate final state
    const finalValidation = await this.validateStateConsistency(inconsistencyResult.conversationContext);
    const enforcementDuration = Date.now() - startTime;

    const result: ConsistencyEnforcementResult = {
      success: failedActions.length === 0,
      actionsExecuted: executedActions,
      actionsFailed: failedActions,
      finalStateHealth: finalValidation.overallHealth,
      enforcementDuration
    };

    this.logger.warn(`State consistency enforcement completed: ${executedActions.length} succeeded, ${failedActions.length} failed`);

    return result;
  }

  /**
   * Create state snapshot for a service
   */
  async createStateSnapshot(serviceName: string): Promise<ServiceStateSnapshot> {
    const validator = this.stateValidators.get(serviceName);
    if (!validator) {
      throw new Error(`No state validator registered for service: ${serviceName}`);
    }

    const snapshot = await validator.getStateSnapshot();
    this.stateSnapshots.set(`${serviceName}_${snapshot.snapshotId}`, snapshot);

    this.logger.debug(`Created state snapshot for service: ${serviceName}`);
    return snapshot;
  }

  /**
   * Restore service state from snapshot
   */
  async restoreStateFromSnapshot(
    serviceName: string,
    snapshotId: string
  ): Promise<void> {
    const validator = this.stateValidators.get(serviceName);
    if (!validator) {
      throw new Error(`No state validator registered for service: ${serviceName}`);
    }

    const snapshot = this.stateSnapshots.get(`${serviceName}_${snapshotId}`);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${serviceName}_${snapshotId}`);
    }

    // Validate state restore operation
    const validationRequest: ParlantValidationRequest = {
      functionName: 'restoreServiceState',
      functionParams: {
        serviceName,
        snapshotId,
        snapshotAge: Date.now() - snapshot.capturedAt.getTime()
      },
      actionDescription: `Restore state for service ${serviceName} from snapshot ${snapshotId}`,
      context: {
        userId: 'system',
        agentRole: 'state_manager',
        securityLevel: 'CRITICAL',
        conversationHistory: [],
        metadata: { serviceName, snapshotId }
      },
      riskLevel: 'CRITICAL',
      operationId: `restore_${serviceName}_${snapshotId}`
    };

    const validation = await this.parlantService.validateFunctionExecution(validationRequest);
    if (!validation.approved) {
      throw new ConversationalValidationError(
        validation.conversationId,
        `State restore rejected: ${validation.reasoning}`,
        validation.suggestedAlternatives
      );
    }

    await validator.restoreState(snapshot);
    this.logger.warn(`Restored state for service: ${serviceName} from snapshot: ${snapshotId}`);
  }

  /**
   * Get consistency history
   */
  getConsistencyHistory(limit?: number): StateConsistencyResult[] {
    return limit
      ? this.consistencyHistory.slice(-limit)
      : [...this.consistencyHistory];
  }

  /**
   * Get current state health summary
   */
  async getCurrentStateHealth(): Promise<{
    overallHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILURE';
    serviceStates: Array<{ serviceName: string; health: string; lastValidated: Date }>;
    totalInconsistencies: number;
    criticalInconsistencies: number;
  }> {
    const latestValidation = this.consistencyHistory[this.consistencyHistory.length - 1];

    if (!latestValidation) {
      return {
        overallHealth: 'FAILURE',
        serviceStates: [],
        totalInconsistencies: 0,
        criticalInconsistencies: 0
      };
    }

    const serviceStates = Array.from(this.stateValidators.keys()).map(serviceName => ({
      serviceName,
      health: latestValidation.validatedServices.includes(serviceName) ? 'VALIDATED' : 'UNKNOWN',
      lastValidated: latestValidation.validatedServices.includes(serviceName)
        ? new Date(Date.now() - latestValidation.validationDuration)
        : new Date(0)
    }));

    const criticalInconsistencies = latestValidation.inconsistencies
      .filter(inc => inc.severity === 'CRITICAL').length;

    return {
      overallHealth: latestValidation.overallHealth,
      serviceStates,
      totalInconsistencies: latestValidation.inconsistencies.length,
      criticalInconsistencies
    };
  }

  // Private Helper Methods

  private async validateServiceState(
    serviceName: string,
    validator: StateValidator,
    context: ConversationalValidationContext
  ): Promise<StateValidationResult> {
    try {
      this.logger.debug(`Validating state for service: ${serviceName}`);

      const result = await validator.validateState(context);

      this.logger.debug(`State validation completed for ${serviceName}: ${result.consistent ? 'CONSISTENT' : 'INCONSISTENT'}`);

      return result;
    } catch (error) {
      this.logger.error(`State validation failed for service ${serviceName}: ${error.message}`);
      throw error;
    }
  }

  private determineOverallHealth(inconsistencies: StateInconsistency[]): 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'FAILURE' {
    if (inconsistencies.length === 0) {
      return 'HEALTHY';
    }

    const criticalCount = inconsistencies.filter(inc => inc.severity === 'CRITICAL').length;
    const highCount = inconsistencies.filter(inc => inc.severity === 'HIGH').length;
    const mediumCount = inconsistencies.filter(inc => inc.severity === 'MEDIUM').length;

    if (criticalCount > 0) {
      return 'CRITICAL';
    } else if (highCount > 2 || (highCount > 0 && mediumCount > 5)) {
      return 'CRITICAL';
    } else if (highCount > 0 || mediumCount > 3) {
      return 'DEGRADED';
    } else {
      return 'DEGRADED';
    }
  }

  private generateConsistencyActions(inconsistencies: StateInconsistency[]): ConsistencyAction[] {
    const actions: ConsistencyAction[] = [];

    for (const inconsistency of inconsistencies) {
      actions.push(...inconsistency.suggestedActions);
    }

    // Remove duplicates and sort by priority
    const uniqueActions = actions.filter((action, index, array) =>
      array.findIndex(a => a.actionId === action.actionId) === index
    );

    return uniqueActions.sort((a, b) => {
      const priorityOrder = { 'LOW': 0, 'MEDIUM': 1, 'HIGH': 2, 'CRITICAL': 3 };
      return priorityOrder[a.riskLevel] - priorityOrder[b.riskLevel];
    });
  }

  private async checkActionPrerequisites(action: ConsistencyAction): Promise<boolean> {
    // Check if all prerequisite actions have been completed
    for (const prerequisite of action.prerequisites) {
      // Implementation would check if prerequisite has been satisfied
      // For now, return true as placeholder
    }
    return true;
  }
}
```

### 4.2 Service-Specific State Validators

```typescript
// Database State Validator
@Injectable()
export class DatabaseStateValidator implements StateValidator {
  readonly validatorId = 'database_validator';
  readonly serviceName = 'database';

  constructor(
    private readonly databaseService: ConversationalDatabaseService,
    private readonly logger: Logger
  ) {}

  async validateState(context: ConversationalValidationContext): Promise<StateValidationResult> {
    const inconsistencies: StateInconsistency[] = [];
    const startTime = Date.now();

    try {
      // Check referential integrity
      const referentialIssues = await this.checkReferentialIntegrity();
      inconsistencies.push(...referentialIssues);

      // Check data freshness
      const stalenessIssues = await this.checkDataStaleness();
      inconsistencies.push(...stalenessIssues);

      // Check constraint violations
      const constraintIssues = await this.checkConstraintViolations();
      inconsistencies.push(...constraintIssues);

      // Check orphaned records
      const orphanedIssues = await this.checkOrphanedRecords();
      inconsistencies.push(...orphanedIssues);

      const isConsistent = inconsistencies.length === 0;
      const stateHash = await this.generateStateHash();

      return {
        validatorId: this.validatorId,
        serviceName: this.serviceName,
        consistent: isConsistent,
        inconsistencies,
        validatedAt: new Date(),
        stateHash,
        confidence: this.calculateConfidence(inconsistencies)
      };

    } catch (error) {
      this.logger.error(`Database state validation failed: ${error.message}`);
      throw error;
    }
  }

  async getStateSnapshot(): Promise<ServiceStateSnapshot> {
    const snapshotId = `db_snapshot_${Date.now()}`;

    // Capture critical state data
    const stateData = {
      tableStats: await this.getTableStatistics(),
      indexHealth: await this.getIndexHealth(),
      connectionPool: await this.getConnectionPoolStatus(),
      replicationStatus: await this.getReplicationStatus(),
      performanceMetrics: await this.getPerformanceMetrics()
    };

    const checksum = this.calculateChecksum(stateData);

    return {
      serviceName: this.serviceName,
      snapshotId,
      capturedAt: new Date(),
      stateData,
      checksum,
      version: '1.0'
    };
  }

  async restoreState(snapshot: ServiceStateSnapshot): Promise<void> {
    this.logger.warn('Database state restore not implemented - manual intervention required');
    // Database state restore would typically involve:
    // - Restoring connection pool settings
    // - Rebuilding corrupted indexes
    // - Restarting replication if needed
    // - Clearing problematic cache entries
  }

  private async checkReferentialIntegrity(): Promise<StateInconsistency[]> {
    // Implementation would check for foreign key violations, etc.
    return [];
  }

  private async checkDataStaleness(): Promise<StateInconsistency[]> {
    // Implementation would check for stale data based on timestamps
    return [];
  }

  private async checkConstraintViolations(): Promise<StateInconsistency[]> {
    // Implementation would check for constraint violations
    return [];
  }

  private async checkOrphanedRecords(): Promise<StateInconsistency[]> {
    // Implementation would check for orphaned records
    return [];
  }

  private async generateStateHash(): Promise<string> {
    // Generate hash of critical state indicators
    return 'placeholder_hash';
  }

  private calculateConfidence(inconsistencies: StateInconsistency[]): number {
    // Calculate confidence based on validation completeness and issues found
    const baseConfidence = 0.9;
    const penaltyPerIssue = 0.1;
    return Math.max(0.1, baseConfidence - (inconsistencies.length * penaltyPerIssue));
  }

  private calculateChecksum(data: any): string {
    // Calculate checksum of state data
    return 'placeholder_checksum';
  }

  private async getTableStatistics(): Promise<any> {
    // Get table row counts, sizes, etc.
    return {};
  }

  private async getIndexHealth(): Promise<any> {
    // Get index fragmentation, usage stats, etc.
    return {};
  }

  private async getConnectionPoolStatus(): Promise<any> {
    // Get connection pool metrics
    return {};
  }

  private async getReplicationStatus(): Promise<any> {
    // Get replication lag, status, etc.
    return {};
  }

  private async getPerformanceMetrics(): Promise<any> {
    // Get query performance, cache hit rates, etc.
    return {};
  }
}

// Browser Service State Validator
@Injectable()
export class BrowserStateValidator implements StateValidator {
  readonly validatorId = 'browser_validator';
  readonly serviceName = 'browser';

  constructor(
    private readonly browserService: ParlantValidatedBrowserUseService,
    private readonly logger: Logger
  ) {}

  async validateState(context: ConversationalValidationContext): Promise<StateValidationResult> {
    const inconsistencies: StateInconsistency[] = [];

    try {
      // Check active sessions
      const sessionIssues = await this.checkActiveSessions();
      inconsistencies.push(...sessionIssues);

      // Check browser health
      const healthIssues = await this.checkBrowserHealth();
      inconsistencies.push(...healthIssues);

      // Check resource usage
      const resourceIssues = await this.checkResourceUsage();
      inconsistencies.push(...resourceIssues);

      // Check security compliance
      const securityIssues = await this.checkSecurityCompliance();
      inconsistencies.push(...securityIssues);

      const isConsistent = inconsistencies.length === 0;
      const stateHash = await this.generateBrowserStateHash();

      return {
        validatorId: this.validatorId,
        serviceName: this.serviceName,
        consistent: isConsistent,
        inconsistencies,
        validatedAt: new Date(),
        stateHash,
        confidence: this.calculateConfidence(inconsistencies)
      };

    } catch (error) {
      this.logger.error(`Browser state validation failed: ${error.message}`);
      throw error;
    }
  }

  async getStateSnapshot(): Promise<ServiceStateSnapshot> {
    const snapshotId = `browser_snapshot_${Date.now()}`;

    const stateData = {
      activeSessions: await this.getActiveSessionsInfo(),
      browserInstances: await this.getBrowserInstancesInfo(),
      resourceUsage: await this.getResourceUsageInfo(),
      securitySettings: await this.getSecuritySettingsInfo(),
      performanceMetrics: await this.getBrowserPerformanceMetrics()
    };

    return {
      serviceName: this.serviceName,
      snapshotId,
      capturedAt: new Date(),
      stateData,
      checksum: this.calculateChecksum(stateData),
      version: '1.0'
    };
  }

  async restoreState(snapshot: ServiceStateSnapshot): Promise<void> {
    this.logger.warn('Browser state restore: cleaning up resources');

    // Browser state restore actions:
    // - Close zombie browser instances
    // - Clean up temporary files
    // - Reset browser configurations
    // - Restart browser pool if needed
  }

  private async checkActiveSessions(): Promise<StateInconsistency[]> {
    // Check for stuck sessions, zombie processes, etc.
    return [];
  }

  private async checkBrowserHealth(): Promise<StateInconsistency[]> {
    // Check browser responsiveness, crash detection, etc.
    return [];
  }

  private async checkResourceUsage(): Promise<StateInconsistency[]> {
    // Check memory usage, CPU usage, disk space, etc.
    return [];
  }

  private async checkSecurityCompliance(): Promise<StateInconsistency[]> {
    // Check security settings, certificate validation, etc.
    return [];
  }

  private async generateBrowserStateHash(): Promise<string> {
    return 'browser_state_hash';
  }

  private calculateConfidence(inconsistencies: StateInconsistency[]): number {
    const baseConfidence = 0.85;
    const penaltyPerIssue = 0.15;
    return Math.max(0.1, baseConfidence - (inconsistencies.length * penaltyPerIssue));
  }

  private calculateChecksum(data: any): string {
    return 'browser_checksum';
  }

  private async getActiveSessionsInfo(): Promise<any> {
    return {};
  }

  private async getBrowserInstancesInfo(): Promise<any> {
    return {};
  }

  private async getResourceUsageInfo(): Promise<any> {
    return {};
  }

  private async getSecuritySettingsInfo(): Promise<any> {
    return {};
  }

  private async getBrowserPerformanceMetrics(): Promise<any> {
    return {};
  }
}
```

## 5. Pattern Integration Examples

### 5.1 Complete E-commerce Workflow with All Patterns

```typescript
/**
 * Complete e-commerce order processing workflow demonstrating all atomic operation patterns
 */
@Injectable()
export class EcommerceWorkflowOrchestrator {
  constructor(
    private readonly transactionManager: ConversationalValidationTransaction,
    private readonly compensationManager: MultiServiceCompensationManager,
    private readonly idempotencyManager: ConversationalIdempotencyManager,
    private readonly stateManager: ConversationalStateConsistencyManager,
    private readonly orderService: OrderService,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly shippingService: ShippingService,
    private readonly notificationService: NotificationService
  ) {}

  async processCompleteOrder(orderRequest: CompleteOrderRequest): Promise<OrderProcessingResult> {
    const workflowId = `workflow_${orderRequest.orderId}`;

    // Step 1: Validate initial state consistency
    const initialStateCheck = await this.stateManager.validateStateConsistency({
      userId: orderRequest.customerId,
      agentRole: 'order_processor',
      securityLevel: 'HIGH',
      conversationHistory: [],
      metadata: { orderId: orderRequest.orderId, workflowId }
    });

    if (!initialStateCheck.consistent) {
      await this.stateManager.enforceConsistency(initialStateCheck);
    }

    // Step 2: Execute idempotent order validation
    const orderValidation = await this.idempotencyManager.executeIdempotently(
      `validate_order_${orderRequest.orderId}`,
      () => this.validateOrderRequest(orderRequest),
      {
        functionName: 'validateOrder',
        functionParams: { orderId: orderRequest.orderId },
        actionDescription: `Validate order request ${orderRequest.orderId}`,
        context: {
          userId: orderRequest.customerId,
          agentRole: 'order_validator',
          securityLevel: 'MEDIUM',
          conversationHistory: [],
          metadata: { orderId: orderRequest.orderId }
        },
        riskLevel: 'MEDIUM',
        operationId: `validate_${orderRequest.orderId}`
      }
    );

    if (!orderValidation.isValid) {
      throw new Error(`Order validation failed: ${orderValidation.errors.join(', ')}`);
    }

    // Step 3: Execute transactional order processing
    const transaction = new ConversationalValidationTransaction(this.parlantService);

    try {
      // 3a: Create order record
      const order = await transaction.executeWithValidation(
        () => this.orderService.createOrder(orderRequest),
        {
          functionName: 'createOrder',
          functionParams: orderRequest,
          actionDescription: `Create order ${orderRequest.orderId}`,
          context: this.createOrderContext(orderRequest),
          riskLevel: 'MEDIUM',
          operationId: 'create_order'
        },
        () => this.orderService.deleteOrder(orderRequest.orderId),
        10 // High priority rollback
      );

      // 3b: Reserve inventory
      const inventoryReservation = await transaction.executeWithValidation(
        () => this.inventoryService.reserveItems(orderRequest.items),
        {
          functionName: 'reserveInventory',
          functionParams: { items: orderRequest.items },
          actionDescription: `Reserve inventory for order ${orderRequest.orderId}`,
          context: this.createInventoryContext(orderRequest),
          riskLevel: 'HIGH',
          operationId: 'reserve_inventory'
        },
        () => this.inventoryService.releaseReservation(orderRequest.orderId),
        9 // High priority rollback
      );

      // 3c: Process payment idempotently
      const paymentResult = await this.idempotencyManager.executeIdempotently(
        `payment_${orderRequest.orderId}_${orderRequest.paymentDetails.amount}`,
        () => this.paymentService.processPayment(orderRequest.paymentDetails),
        {
          functionName: 'processPayment',
          functionParams: orderRequest.paymentDetails,
          actionDescription: `Process payment for order ${orderRequest.orderId}`,
          context: this.createPaymentContext(orderRequest),
          riskLevel: 'CRITICAL',
          operationId: 'process_payment'
        }
      );

      // 3d: Update order with payment info
      const updatedOrder = await transaction.executeWithValidation(
        () => this.orderService.updateOrderPayment(order.id, paymentResult),
        {
          functionName: 'updateOrderPayment',
          functionParams: { orderId: order.id, paymentResult },
          actionDescription: `Update order payment status`,
          context: this.createOrderContext(orderRequest),
          riskLevel: 'MEDIUM',
          operationId: 'update_payment'
        },
        () => this.orderService.clearPaymentInfo(order.id),
        8
      );

      // Step 4: Execute distributed transaction for fulfillment
      const fulfillmentSaga = await this.compensationManager.executeDistributedTransaction({
        sagaId: `fulfillment_${orderRequest.orderId}`,
        description: `Fulfill order ${orderRequest.orderId}`,
        overallTimeout: 300000,
        requiresFinalValidation: true,
        steps: [
          {
            stepId: 'create_shipping_label',
            serviceName: 'shipping',
            operationName: 'createLabel',
            execute: () => this.shippingService.createShippingLabel(orderRequest.shippingAddress),
            compensationAction: {
              compensationId: 'cancel_shipping_label',
              execute: () => this.shippingService.cancelLabel(orderRequest.orderId),
              description: 'Cancel shipping label',
              riskLevel: 'MEDIUM',
              timeout: 30000
            },
            validationRequest: {
              functionName: 'createShippingLabel',
              functionParams: orderRequest.shippingAddress,
              actionDescription: `Create shipping label for order ${orderRequest.orderId}`,
              context: this.createShippingContext(orderRequest),
              riskLevel: 'MEDIUM',
              operationId: 'create_shipping'
            },
            dependencies: [],
            timeout: 60000
          },
          {
            stepId: 'send_confirmation',
            serviceName: 'notification',
            operationName: 'sendConfirmation',
            execute: () => this.notificationService.sendOrderConfirmation(updatedOrder),
            compensationAction: {
              compensationId: 'send_cancellation',
              execute: () => this.notificationService.sendOrderCancellation(orderRequest.orderId),
              description: 'Send cancellation notification',
              riskLevel: 'LOW',
              timeout: 15000
            },
            validationRequest: {
              functionName: 'sendConfirmation',
              functionParams: { orderId: orderRequest.orderId },
              actionDescription: `Send order confirmation`,
              context: this.createNotificationContext(orderRequest),
              riskLevel: 'LOW',
              operationId: 'send_confirmation'
            },
            dependencies: ['create_shipping_label'],
            timeout: 30000
          }
        ]
      });

      // Step 5: Commit transaction
      await transaction.commitTransaction(true);

      // Step 6: Final state consistency check
      const finalStateCheck = await this.stateManager.validateStateConsistency({
        userId: orderRequest.customerId,
        agentRole: 'order_processor',
        securityLevel: 'HIGH',
        conversationHistory: [],
        metadata: { orderId: orderRequest.orderId, workflowId, phase: 'completion' }
      });

      if (!finalStateCheck.consistent) {
        this.logger.warn(`Final state inconsistency detected for order ${orderRequest.orderId}`);
        // Note: At this point, we don't want to fail the order, but we should alert operations
        await this.notificationService.sendOperationalAlert({
          type: 'STATE_INCONSISTENCY',
          orderId: orderRequest.orderId,
          details: finalStateCheck.inconsistencies
        });
      }

      return {
        success: true,
        orderId: orderRequest.orderId,
        order: updatedOrder,
        paymentResult,
        shippingInfo: fulfillmentSaga.executedActions.find(a => a.stepId === 'create_shipping_label')?.result,
        processingDuration: Date.now() - Date.parse(order.createdAt),
        stateConsistency: finalStateCheck.consistent
      };

    } catch (error) {
      this.logger.error(`Order processing failed for ${orderRequest.orderId}: ${error.message}`);

      // Transaction will automatically rollback
      // Saga compensation will automatically execute

      throw new Error(`Order processing failed: ${error.message}`);
    }
  }

  // Helper methods for creating conversation contexts
  private createOrderContext(orderRequest: CompleteOrderRequest): any {
    return {
      userId: orderRequest.customerId,
      agentRole: 'order_processor',
      securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: { orderId: orderRequest.orderId, customerId: orderRequest.customerId }
    };
  }

  private createInventoryContext(orderRequest: CompleteOrderRequest): any {
    return {
      userId: orderRequest.customerId,
      agentRole: 'inventory_manager',
      securityLevel: 'HIGH',
      conversationHistory: [],
      metadata: { orderId: orderRequest.orderId, itemCount: orderRequest.items.length }
    };
  }

  private createPaymentContext(orderRequest: CompleteOrderRequest): any {
    return {
      userId: orderRequest.customerId,
      agentRole: 'payment_processor',
      securityLevel: 'CRITICAL',
      conversationHistory: [],
      metadata: {
        orderId: orderRequest.orderId,
        amount: orderRequest.paymentDetails.amount,
        currency: orderRequest.paymentDetails.currency
      }
    };
  }

  private createShippingContext(orderRequest: CompleteOrderRequest): any {
    return {
      userId: orderRequest.customerId,
      agentRole: 'shipping_coordinator',
      securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: { orderId: orderRequest.orderId, shippingMethod: orderRequest.shippingMethod }
    };
  }

  private createNotificationContext(orderRequest: CompleteOrderRequest): any {
    return {
      userId: orderRequest.customerId,
      agentRole: 'notification_sender',
      securityLevel: 'LOW',
      conversationHistory: [],
      metadata: { orderId: orderRequest.orderId, customerEmail: orderRequest.customerEmail }
    };
  }

  private async validateOrderRequest(orderRequest: CompleteOrderRequest): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate order data
    if (!orderRequest.orderId) errors.push('Order ID is required');
    if (!orderRequest.customerId) errors.push('Customer ID is required');
    if (!orderRequest.items || orderRequest.items.length === 0) errors.push('Order items are required');
    if (!orderRequest.paymentDetails) errors.push('Payment details are required');
    if (!orderRequest.shippingAddress) errors.push('Shipping address is required');

    // Validate business rules
    const totalAmount = orderRequest.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (totalAmount !== orderRequest.paymentDetails.amount) {
      errors.push('Payment amount does not match order total');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
```

## 6. Pattern Summary & Best Practices

### 6.1 Pattern Selection Guidelines

| Scenario | Recommended Pattern | Rationale |
|----------|-------------------|-----------|
| Single service operation with rollback needs | Conversational Validation Transaction | Provides atomic execution with conversational approval |
| Multi-service workflow with failure recovery | Multi-Service Compensation | Handles distributed transactions with compensating actions |
| Retry-safe operations | Idempotent Operation | Prevents duplicate execution and state corruption |
| Cross-service consistency checks | State Consistency | Ensures system-wide state validity |
| Complex workflows combining multiple patterns | All patterns integrated | Provides comprehensive reliability and validation |

### 6.2 Implementation Best Practices

1. **Always validate through PARLANT before execution**
2. **Design rollback/compensation operations first**
3. **Use appropriate risk levels for validation requests**
4. **Implement comprehensive logging and monitoring**
5. **Test failure scenarios extensively**
6. **Plan for manual intervention when automation fails**
7. **Monitor performance impact of validation overhead**
8. **Use caching strategically to optimize performance**

### 6.3 Performance Considerations

- **Validation Caching**: Cache validation results for repeated operations
- **Batch Processing**: Group similar operations for efficiency
- **Async Execution**: Use asynchronous patterns where possible
- **Circuit Breaking**: Implement circuit breakers for external services
- **Resource Management**: Monitor and manage resource usage
- **Timeout Configuration**: Set appropriate timeouts for all operations

This atomic operation pattern library provides the foundation for building reliable, conversationally-validated systems with comprehensive error handling and recovery mechanisms.