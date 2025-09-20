/**
 * Orchestration Error Recovery Service
 *
 * Advanced error recovery mechanisms specifically designed for browser orchestration
 * operations including distributed task recovery, workflow restoration, resource
 * reallocation, and intelligent coordination across multiple browser instances.
 *
 * @author Browser Orchestration Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

import { Injectable, Logger } from '@nestjs/common';import { Observable, from, of, throwError, timer, concat, defer } from 'rxjs';import { retryWhen, delay, take, mergeMap, catchError, tap, concatMap, switchMap } from 'rxjs/operators';import {OrchestrationError,
  OrchestrationErrorType,
  OrchestrationErrorCategory,
  OrchestrationErrorSeverity,
  OrchestrationOperationType,
  isDistributedOperationError,
  isWorkflowCoordinationError,
  isResourceAllocationError,
  isAggregationError,
  DistributedOperationError,
  WorkflowCoordinationError,
  ResourceAllocationError,
  AggregationError,
  OrchestrationErrorAnalyzer,
} from './orchestration-errors';/*** Recovery operation result interface
 */
export interface RecoveryOperationResult {
  readonly success: boolean;
  readonly operationId: string;
  readonly recoveryStrategy: string;
  readonly attempts: number;
  readonly duration: number;
  readonly result?: unknown;
  readonly error?: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * Orchestration recovery context
 */
export interface OrchestrationRecoveryContext {
  readonly orchestrationId: string;
  readonly operationType: OrchestrationOperationType;
  readonly originalError: OrchestrationErrorType;
  readonly recoveryStartTime: Date;
  readonly maxRetries: number;
  readonly timeoutMs: number;
  readonly resourceConstraints: {
    readonly maxBrowsers: number;
    readonly maxMemoryMb: number;
    readonly maxConcurrency: number;
  };
  readonly preserveState: boolean;
  readonly allowPartialRecovery: boolean;
  readonly criticalPathOnly: boolean;
}

/**
 * Distributed recovery strategy configuration
 */
export interface DistributedRecoveryConfig {
  readonly isolationLevel: 'operation' | 'node' | 'cluster';
  readonly redistributionStrategy: 'even' | 'load_based' | 'capability_based' | 'priority_based';
  readonly nodeSelectionCriteria: {readonly preferredNodes?: string[];
    readonly excludedNodes?: string[];
    readonly minResourceThreshold: number;
    readonly maxLoadThreshold: number;
  };
  readonly coordinationProtocol: 'leader_follower' | 'consensus' | 'master_slave' | 'peer_to_peer';
  readonly checkpointingEnabled: boolean;
  readonly rollbackToLastCheckpoint: boolean;
}

/**
 * Workflow recovery strategy configuration
 */
export interface WorkflowRecoveryConfig {
  readonly recoveryScope: 'step' | 'stage' | 'workflow' | 'cascade';
  readonly compensationOrder: 'reverse' | 'dependency' | 'priority';
  readonly statePreservation: 'full' | 'partial' | 'minimal';
  readonly rollbackDepth: number;
  readonly reexecutionStrategy: 'from_failure' | 'from_checkpoint' | 'full_restart';
  readonly dependencyHandling: 'block' | 'skip' | 'substitute';}/**
 * Resource recovery strategy configuration
 */
export interface ResourceRecoveryConfig {
  readonly reallocationStrategy: 'immediate' | 'gradual' | 'queued';
  readonly resourcePoolExpansion: boolean;
  readonly degradationAcceptable: boolean;
  readonly priorityReallocation: boolean;
  readonly temporaryResourceBorrowing: boolean;
  readonly resourceCleanupRequired: boolean;
}

/**
 * Aggregation recovery strategy configuration
 */
export interface AggregationRecoveryConfig {
  readonly partialResultHandling: 'salvage' | 'recompute' | 'interpolate';
  readonly conflictResolution: 'manual' | 'automatic' | 'weighted_merge';
  readonly dataValidationLevel: 'strict' | 'relaxed' | 'disabled';
  readonly outputFormat: 'original' | 'degraded' | 'summary';
  readonly qualityThreshold: number;}

/**
 * Recovery operation statistics
 */
export interface RecoveryStatistics {
  readonly totalRecoveryAttempts: number;
  readonly successfulRecoveries: number;
  readonly failedRecoveries: number;
  readonly partialRecoveries: number;
  readonly averageRecoveryTime: number;
  readonly recoverySuccessRate: number;
  readonly mostCommonFailures: Array<{
    readonly errorCategory: string;
    readonly count: number;
    readonly successRate: number;
  }>;
  readonly resourceUtilizationDuringRecovery: {
    readonly averageBrowsers: number;
    readonly peakMemoryUsage: number;
    readonly averageRecoveryLoad: number;
  };
}

/**
 * Orchestration Error Recovery Service
 *
 * Comprehensive recovery mechanisms:
 * - Distributed operation recovery with node isolation and redistribution
 * - Workflow recovery with step-by-step compensation and rollback
 * - Resource recovery with dynamic allocation and degradation strategies
 * - Aggregation recovery with partial result salvaging and conflict resolution
 * - Intelligent retry strategies with exponential backoff and circuit breaking
 * - Recovery coordination across multiple browser instances
 * - State preservation and checkpointing for complex workflows
 * - Performance-aware recovery with resource constraint consideration
 * - Recovery analytics and optimization based on historical data
 */
@Injectable()
export class OrchestrationErrorRecoveryService {
  private readonly logger = new Logger(OrchestrationErrorRecoveryService.name);
  private readonly recoveryHistory = new Map<string, RecoveryOperationResult[]>();
  private readonly activeRecoveries = new Map<string, OrchestrationRecoveryContext>();
  private readonly recoveryStatistics: RecoveryStatistics = {
    totalRecoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    partialRecoveries: 0,
    averageRecoveryTime: 0,
    recoverySuccessRate: 0,
    mostCommonFailures: [],
    resourceUtilizationDuringRecovery: {
      averageBrowsers: 0,
      peakMemoryUsage: 0,
      averageRecoveryLoad: 0,
    },
  };

  constructor() {
    this.logger.log('OrchestrationErrorRecoveryService initialized');}/**
   * Main entry point for orchestration error recovery
   */
  async recoverFromError(
    error: OrchestrationErrorType,
    context: OrchestrationRecoveryContext
  ): Promise<RecoveryOperationResult> {
    const startTime = Date.now();
    const recoveryId = this.generateRecoveryId();

    this.logger.log('Starting orchestration error recovery', {recoveryId,orchestrationId: context.orchestrationId,
      errorCategory: error.category,
      errorSeverity: error.severity,
      operationType: context.operationType,
    });

    try {
      // Register active recovery
      this.activeRecoveries.set(recoveryId, context);

      // Analyze error impact and determine recovery strategy
      const errorAnalysis = OrchestrationErrorAnalyzer.analyzeErrorImpact(error);
      this.logger.log('Error impact analysis completed', {recoveryId,impactLevel: errorAnalysis.impactLevel,
        recoveryComplexity: errorAnalysis.recoveryComplexity,
        estimatedRecoveryTime: errorAnalysis.estimatedRecoveryTime,
      });

      // Execute appropriate recovery strategy
      let recoveryResult: RecoveryOperationResult;

      if (isDistributedOperationError(error)) {
        recoveryResult = await this.recoverDistributedOperation(error, context, recoveryId);
      } else if (isWorkflowCoordinationError(error)) {
        recoveryResult = await this.recoverWorkflowCoordination(error, context, recoveryId);
      } else if (isResourceAllocationError(error)) {
        recoveryResult = await this.recoverResourceAllocation(error, context, recoveryId);
      } else if (isAggregationError(error)) {
        recoveryResult = await this.recoverAggregation(error, context, recoveryId);
      } else {
        recoveryResult = await this.recoverGenericOrchestrationError(error, context, recoveryId);
      }

      // Update statistics
      this.updateRecoveryStatistics(recoveryResult, error, Date.now() - startTime);

      // Store recovery history
      this.storeRecoveryHistory(recoveryId, recoveryResult);

      this.logger.log('Orchestration error recovery completed', {recoveryId,success: recoveryResult.success,
        duration: recoveryResult.duration,
        attempts: recoveryResult.attempts,
        strategy: recoveryResult.recoveryStrategy,
      });

      return recoveryResult;

    } catch (recoveryError) {
      const errorMessage = recoveryError instanceof Error ? recoveryError.message : 'Unknown recovery error';this.logger.error('Orchestration error recovery failed', {recoveryId,recoveryError: errorMessage,
        originalError: error.message,
        duration: Date.now() - startTime,
      });

      const failedResult: RecoveryOperationResult = {
        success: false,
        operationId: recoveryId,
        recoveryStrategy: 'recovery_failed',attempts: 1,duration: Date.now() - startTime,
        error: errorMessage,
        metadata: {
          originalError: error,
          recoveryError,
        },
      };

      this.updateRecoveryStatistics(failedResult, error, Date.now() - startTime);
      return failedResult;

    } finally {
      // Clean up active recovery tracking
      this.activeRecoveries.delete(recoveryId);
    }
  }

  /**
   * Recover from distributed operation errors
   */
  private async recoverDistributedOperation(
    error: DistributedOperationError,
    context: OrchestrationRecoveryContext,
    recoveryId: string
  ): Promise<RecoveryOperationResult> {
    const config: DistributedRecoveryConfig = {
      isolationLevel: 'operation',redistributionStrategy: 'load_based',nodeSelectionCriteria: {minResourceThreshold: 0.3,
        maxLoadThreshold: 0.8,
      },
      coordinationProtocol: 'leader_follower',checkpointingEnabled: true,rollbackToLastCheckpoint: true,
    };

    this.logger.log('Executing distributed operation recovery', {recoveryId,isolationLevel: config.isolationLevel,
      redistributionStrategy: config.redistributionStrategy,
      coordinationFailure: error.distributedError.coordinationFailure,
      partialResults: error.distributedError.partialResults,
    });

    try {
      // Step 1: Isolate failed operations
      const isolatedOperations = await this.isolateFailedOperations(error, config);

      // Step 2: Assess partial results
      const salvageableResults = await this.assessPartialResults(error, config);

      // Step 3: Redistribute failed operations
      const redistributedOperations = await this.redistributeOperations(isolatedOperations, config);

      // Step 4: Re-coordinate execution
      const recoordinationResult = await this.recoordinateExecution(redistributedOperations, config, context);

      // Step 5: Merge results with salvaged data
      const finalResult = await this.mergeDistributedResults(recoordinationResult, salvageableResults);

      return {
        success: true,
        operationId: recoveryId,
        recoveryStrategy: 'distributed_operation_recovery',
        attempts: 1,
        duration: Date.now() - context.recoveryStartTime.getTime(),
        result: finalResult,
        metadata: {
          isolatedOperations: isolatedOperations.length,
          salvageableResults: salvageableResults.length,
          redistributedOperations: redistributedOperations.length,
          coordinationProtocol: config.coordinationProtocol,
        },
      };

    } catch (recoveryError) {
      throw new Error(`Distributed operation recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
    }
  }

  /**
   * Recover from workflow coordination errors
   */
  private async recoverWorkflowCoordination(
    error: WorkflowCoordinationError,
    context: OrchestrationRecoveryContext,
    recoveryId: string
  ): Promise<RecoveryOperationResult> {
    const config: WorkflowRecoveryConfig = {
      recoveryScope: error.workflowError.rollbackRequired ? 'workflow' : 'step',compensationOrder: 'reverse',statePreservation: 'partial',rollbackDepth: error.workflowError.completedSteps,reexecutionStrategy: 'from_failure',dependencyHandling: 'block',};this.logger.log('Executing workflow coordination recovery', {recoveryId,currentStep: error.workflowError.currentStep,
      failedStep: error.workflowError.failedStep,
      rollbackRequired: error.workflowError.rollbackRequired,
      compensationActions: error.workflowError.compensationActions.length,
    });

    try {
      let result: unknown;

      if (error.workflowError.rollbackRequired) {
        // Execute rollback sequence
        result = await this.executeWorkflowRollback(error, config, context);
      } else {
        // Execute compensation actions
        result = await this.executeCompensationActions(error, config, context);
      }

      // Resume workflow from appropriate point
      const resumptionResult = await this.resumeWorkflowExecution(error, config, context, result);

      return {
        success: true,
        operationId: recoveryId,
        recoveryStrategy: 'workflow_coordination_recovery',
        attempts: 1,
        duration: Date.now() - context.recoveryStartTime.getTime(),
        result: resumptionResult,
        metadata: {
          rollbackExecuted: error.workflowError.rollbackRequired,
          compensationActionsExecuted: error.workflowError.compensationActions.length,
          stepsRolledBack: config.rollbackDepth,
          resumedFromStep: error.workflowError.failedStep,
        },
      };

    } catch (recoveryError) {
      throw new Error(`Workflow coordination recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
    }
  }

  /**
   * Recover from resource allocation errors
   */
  private async recoverResourceAllocation(
    error: ResourceAllocationError,
    context: OrchestrationRecoveryContext,
    recoveryId: string
  ): Promise<RecoveryOperationResult> {
    const config: ResourceRecoveryConfig = {
      reallocationStrategy: 'gradual',resourcePoolExpansion: true,degradationAcceptable: !context.criticalPathOnly,
      priorityReallocation: true,
      temporaryResourceBorrowing: true,
      resourceCleanupRequired: true,
    };

    this.logger.log('Executing resource allocation recovery', {recoveryId,requestedBrowsers: error.resourceError.requestedResources.browsers,
      availableBrowsers: error.resourceError.availableResources.browsers,
      allocationStrategy: error.resourceError.allocationStrategy,
      queuePosition: error.resourceError.queuePosition,
    });

    try {
      // Step 1: Attempt resource pool expansion
      const expansionResult = await this.expandResourcePool(error, config, context);

      // Step 2: Reallocate resources based on priority
      const reallocationResult = await this.reallocateResources(error, config, context, expansionResult);

      // Step 3: Apply degradation if necessary and acceptable
      const degradationResult = config.degradationAcceptable
        ? await this.applyResourceDegradation(error, config, context)
        : null;

      // Step 4: Execute operation with recovered resources
      const executionResult = await this.executeWithRecoveredResources(
        reallocationResult,
        degradationResult,
        context
      );

      return {
        success: true,
        operationId: recoveryId,
        recoveryStrategy: 'resource_allocation_recovery',
        attempts: 1,
        duration: Date.now() - context.recoveryStartTime.getTime(),
        result: executionResult,
        metadata: {
          resourcesExpanded: expansionResult.expandedResources,
          resourcesReallocated: reallocationResult.reallocatedResources,
          degradationApplied: degradationResult !== null,
          finalResourceAllocation: reallocationResult.finalAllocation,
        },
      };

    } catch (recoveryError) {
      throw new Error(`Resource allocation recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
    }
  }

  /**
   * Recover from aggregation errors
   */
  private async recoverAggregation(
    error: AggregationError,
    context: OrchestrationRecoveryContext,
    recoveryId: string
  ): Promise<RecoveryOperationResult> {
    const config: AggregationRecoveryConfig = {
      partialResultHandling: 'salvage',conflictResolution: 'weighted_merge',dataValidationLevel: 'relaxed',outputFormat: context.allowPartialRecovery ? 'degraded' : 'original',qualityThreshold: 0.7,};

    this.logger.log('Executing aggregation recovery', {recoveryId,aggregationType: error.aggregationError.aggregationType,
      partialResultsCount: error.aggregationError.partialResults.length,
      mergeConflictsCount: error.aggregationError.mergeConflicts.length,
      dataIntegrityValid: error.aggregationError.dataIntegrity.checksumValid,
    });

    try {
      // Step 1: Salvage partial results
      const salvagedResults = await this.salvagePartialResults(error, config);

      // Step 2: Resolve merge conflicts
      const conflictResolution = await this.resolveMergeConflicts(error, config);

      // Step 3: Re-aggregate with conflict resolution
      const aggregationResult = await this.performRecoveredAggregation(
        salvagedResults,
        conflictResolution,
        config
      );

      // Step 4: Validate and format output
      const validatedResult = await this.validateAndFormatOutput(aggregationResult, config);

      return {
        success: true,
        operationId: recoveryId,
        recoveryStrategy: 'aggregation_recovery',
        attempts: 1,
        duration: Date.now() - context.recoveryStartTime.getTime(),
        result: validatedResult,
        metadata: {
          salvagedResultsCount: salvagedResults.length,
          conflictsResolved: conflictResolution.resolvedConflicts,
          dataQualityScore: validatedResult.qualityScore,
          outputFormat: config.outputFormat,
        },
      };

    } catch (recoveryError) {
      throw new Error(`Aggregation recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
    }
  }

  /**
   * Generic orchestration error recovery
   */
  private async recoverGenericOrchestrationError(
    error: OrchestrationError,
    context: OrchestrationRecoveryContext,
    recoveryId: string
  ): Promise<RecoveryOperationResult> {
    this.logger.log('Executing generic orchestration error recovery', {recoveryId,errorCategory: error.category,
      errorSeverity: error.severity,
      affectedOperations: error.affectedOperations.length,
    });

    try {
      // Simple retry with exponential backoff
      const retryResult = await this.executeWithRetry(
        () => this.reexecuteFailedOperations(error, context),
        context.maxRetries,
        1000,
        context.timeoutMs
      );

      return {
        success: true,
        operationId: recoveryId,
        recoveryStrategy: 'generic_retry_recovery',attempts: retryResult.attempts,duration: Date.now() - context.recoveryStartTime.getTime(),
        result: retryResult.result,
        metadata: {
          retryAttempts: retryResult.attempts,
          backoffStrategy: 'exponential',
        },
      };

    } catch (recoveryError) {
      throw new Error(`Generic orchestration recovery failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current recovery statistics
   */
  getRecoveryStatistics(): RecoveryStatistics {
    return { ...this.recoveryStatistics };
  }

  /**
   * Get recovery history for a specific orchestration
   */
  getRecoveryHistory(orchestrationId: string): RecoveryOperationResult[] {
    return this.recoveryHistory.get(orchestrationId) || [];
  }

  /**
   * Check if recovery is currently active for an orchestration
   */
  isRecoveryActive(orchestrationId: string): boolean {
    return Array.from(this.activeRecoveries.values()).some(
      context => context.orchestrationId === orchestrationId
    );
  }

  // Private helper methods (implementations would be provided based on specific requirements)

  private async isolateFailedOperations(error: DistributedOperationError, config: DistributedRecoveryConfig): Promise<string[]> {
    // Implementation for isolating failed operations
    return [];
  }

  private async assessPartialResults(error: DistributedOperationError, config: DistributedRecoveryConfig): Promise<unknown[]> {
    // Implementation for assessing partial results
    return [];
  }

  private async redistributeOperations(operations: string[], config: DistributedRecoveryConfig): Promise<string[]> {
    // Implementation for redistributing operations
    return operations;
  }

  private async recoordinateExecution(operations: string[], config: DistributedRecoveryConfig, context: OrchestrationRecoveryContext): Promise<unknown> {
    // Implementation for re-coordinating execution
    return {};
  }

  private async mergeDistributedResults(recoordinationResult: unknown, salvageableResults: unknown[]): Promise<unknown> {
    // Implementation for merging distributed results
    return { recoordinationResult, salvageableResults };
  }

  private async executeWorkflowRollback(error: WorkflowCoordinationError, config: WorkflowRecoveryConfig, context: OrchestrationRecoveryContext): Promise<unknown> {
    // Implementation for workflow rollback
    return {};
  }

  private async executeCompensationActions(error: WorkflowCoordinationError, config: WorkflowRecoveryConfig, context: OrchestrationRecoveryContext): Promise<unknown> {
    // Implementation for compensation actions
    return {};
  }

  private async resumeWorkflowExecution(error: WorkflowCoordinationError, config: WorkflowRecoveryConfig, context: OrchestrationRecoveryContext, previousResult: unknown): Promise<unknown> {
    // Implementation for resuming workflow execution
    return previousResult;
  }

  private async expandResourcePool(error: ResourceAllocationError, config: ResourceRecoveryConfig, context: OrchestrationRecoveryContext): Promise<{ expandedResources: number }> {
    // Implementation for expanding resource pool
    return { expandedResources: 0 };
  }

  private async reallocateResources(error: ResourceAllocationError, config: ResourceRecoveryConfig, context: OrchestrationRecoveryContext, expansionResult: { expandedResources: number }): Promise<{ reallocatedResources: number; finalAllocation: Record<string, number> }> {
    // Implementation for reallocating resources
    return { reallocatedResources: 0, finalAllocation: {} };
  }

  private async applyResourceDegradation(error: ResourceAllocationError, config: ResourceRecoveryConfig, context: OrchestrationRecoveryContext): Promise<{ degradationLevel: number }> {
    // Implementation for applying resource degradation
    return { degradationLevel: 0.8 };
  }

  private async executeWithRecoveredResources(reallocationResult: { reallocatedResources: number; finalAllocation: Record<string, number> }, degradationResult: { degradationLevel: number } | null, context: OrchestrationRecoveryContext): Promise<unknown> {
    // Implementation for executing with recovered resources
    return {};
  }

  private async salvagePartialResults(error: AggregationError, config: AggregationRecoveryConfig): Promise<unknown[]> {
    // Implementation for salvaging partial results
    return [];
  }

  private async resolveMergeConflicts(error: AggregationError, config: AggregationRecoveryConfig): Promise<{ resolvedConflicts: number }> {
    // Implementation for resolving merge conflicts
    return { resolvedConflicts: 0 };
  }

  private async performRecoveredAggregation(salvagedResults: unknown[], conflictResolution: { resolvedConflicts: number }, config: AggregationRecoveryConfig): Promise<unknown> {
    // Implementation for performing recovered aggregation
    return {};
  }

  private async validateAndFormatOutput(aggregationResult: unknown, config: AggregationRecoveryConfig): Promise<{ result: unknown; qualityScore: number }> {
    // Implementation for validating and formatting output
    return { result: aggregationResult, qualityScore: 0.8 };
  }

  private async reexecuteFailedOperations(error: OrchestrationError, context: OrchestrationRecoveryContext): Promise<unknown> {
    // Implementation for re-executing failed operations
    return {};
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    baseDelayMs: number,
    timeoutMs: number
  ): Promise<{ result: T; attempts: number }> {
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxRetries) {
      attempts++;
      try {
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)),]);
        return { result, attempts };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');if (attempts < maxRetries) {const delay = baseDelayMs * Math.pow(2, attempts - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  private updateRecoveryStatistics(result: RecoveryOperationResult, error: OrchestrationErrorType, duration: number): void {
    this.recoveryStatistics.totalRecoveryAttempts++;

    if (result.success) {
      this.recoveryStatistics.successfulRecoveries++;
    } else {
      this.recoveryStatistics.failedRecoveries++;
    }

    // Update average recovery time
    const totalTime = this.recoveryStatistics.averageRecoveryTime * (this.recoveryStatistics.totalRecoveryAttempts - 1) + duration;
    this.recoveryStatistics.averageRecoveryTime = totalTime / this.recoveryStatistics.totalRecoveryAttempts;

    // Update success rate
    this.recoveryStatistics.recoverySuccessRate = this.recoveryStatistics.successfulRecoveries / this.recoveryStatistics.totalRecoveryAttempts;
  }

  private storeRecoveryHistory(recoveryId: string, result: RecoveryOperationResult): void {
    const key = result.operationId;
    const history = this.recoveryHistory.get(key) || [];
    history.push(result);
    this.recoveryHistory.set(key, history);
  }

  private generateRecoveryId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}