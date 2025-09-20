/**
 * Orchestration-Specific Error Handling Types and Utilities
 *
 * This module provides comprehensive error handling for browser orchestration operations
 * including distributed task management, parallel operation coordination, and multi-step
 * workflow error aggregation and recovery.
 *
 * @author Browser Orchestration Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

import { BaseError, ApplicationError, ErrorSeverity } from '../../types/error-types';

/*** Orchestration-specific error categories extending the base automation categories
 */
export enum OrchestrationErrorCategory {
  // Distributed operation errors
  DISTRIBUTED_TASK_ERROR = 'distributed_task_error',
  PARALLEL_EXECUTION_ERROR = 'parallel_execution_error',
  WORKFLOW_COORDINATION_ERROR = 'workflow_coordination_error',

  // Resource management errors
  RESOURCE_ALLOCATION_ERROR = 'resource_allocation_error',
  BROWSER_POOL_ERROR = 'browser_pool_error',
  SESSION_COORDINATION_ERROR = 'session_coordination_error',

  // Synchronization errors
  STATE_SYNCHRONIZATION_ERROR = 'state_synchronization_error',
  COORDINATION_TIMEOUT_ERROR = 'coordination_timeout_error',
  DEPENDENCY_RESOLUTION_ERROR = 'dependency_resolution_error',

  // Aggregation errors
  RESULT_AGGREGATION_ERROR = 'result_aggregation_error',
  DATA_MERGE_ERROR = 'data_merge_error',
  OUTPUT_COORDINATION_ERROR = 'output_coordination_error',

  // Performance and scaling errors
  PERFORMANCE_THRESHOLD_ERROR = 'performance_threshold_error',
  SCALING_LIMIT_ERROR = 'scaling_limit_error',
  LOAD_BALANCING_ERROR = 'load_balancing_error',
}/**
 * Orchestration operation types for context identification
 */
export enum OrchestrationOperationType {
  PARALLEL_EXTRACTION = 'parallel_extraction',
  DISTRIBUTED_FORM_FILLING = 'distributed_form_filling',
  MULTI_SITE_MONITORING = 'multi_site_monitoring',
  WORKFLOW_EXECUTION = 'workflow_execution',
  BATCH_PROCESSING = 'batch_processing',
  COORDINATED_INTERACTION = 'coordinated_interaction',
  SYNCHRONIZED_NAVIGATION = 'synchronized_navigation',
  AGGREGATED_REPORTING = 'aggregated_reporting',
}/**
 * Orchestration error severity with additional levels for distributed operations
 */
export enum OrchestrationErrorSeverity {
  LOW = 'low',MEDIUM = 'medium',HIGH = 'high',CRITICAL = 'critical',SYSTEM_WIDE = 'system_wide', // Affects entire orchestration systemWORKFLOW_BREAKING = 'workflow_breaking' // Breaks multi-step workflows}/**
 * Orchestration-specific error interface extending BaseError
 */
export interface OrchestrationError extends BaseError {
  readonly name: 'OrchestrationError';
  readonly category: OrchestrationErrorCategory;
  readonly severity: OrchestrationErrorSeverity;
  readonly operationType: OrchestrationOperationType;
  readonly orchestrationId: string;
  readonly workflowId?: string;
  readonly stepId?: string;
  readonly distributedContext: {
    readonly totalOperations: number;
    readonly completedOperations: number;
    readonly failedOperations: number;
    readonly remainingOperations: number;
    readonly parallelExecutions: number;
    readonly coordinationState: 'initializing' | 'executing' | 'aggregating' | 'finalizing' | 'failed';};readonly resourceContext: {
    readonly browserSessions: number;
    readonly activeTasks: number;
    readonly memoryUsage?: number;
    readonly cpuUsage?: number;
    readonly networkConnections?: number;
  };
  readonly affectedOperations: Array<{
    readonly operationId: string;
    readonly status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  readonly errorMessage?: string;
  readonly retryCount?: number;
  }>;
  readonly dependencies: {
    readonly requiredOperations: string[];
    readonly blockedOperations: string[];
    readonly criticalPath: boolean;
  };
  readonly performanceMetrics: {
    readonly executionTime: number;
    readonly expectedTime?: number;
    readonly performanceRatio?: number;
    readonly throughputMbps?: number;
  };
}

/**
 * Distributed operation error for parallel task failures
 */
export interface DistributedOperationError extends OrchestrationError {
  readonly category: OrchestrationErrorCategory.DISTRIBUTED_TASK_ERROR | OrchestrationErrorCategory.PARALLEL_EXECUTION_ERROR;
  readonly distributedError: {
    readonly nodeId: string;
    readonly nodeType: 'coordinator' | 'worker' | 'aggregator';
  readonly taskDistribution: Array<{readonly nodeId: string;
      readonly taskCount: number;
      readonly status: 'pending' | 'running' | 'completed' | 'failed';
  readonly errorDetails?: string;}>;
    readonly coordinationFailure: boolean;
    readonly partialResults: boolean;
  };
}

/**
 * Workflow coordination error for multi-step operation failures
 */
export interface WorkflowCoordinationError extends OrchestrationError {
  readonly category: OrchestrationErrorCategory.WORKFLOW_COORDINATION_ERROR;
  readonly workflowError: {
    readonly currentStep: string;
    readonly failedStep: string;
    readonly totalSteps: number;
    readonly completedSteps: number;
    readonly workflowState: Record<string, unknown>;
    readonly rollbackRequired: boolean;
    readonly compensationActions: string[];
  };
}

/**
 * Resource allocation error for browser pool and session management
 */
export interface ResourceAllocationError extends OrchestrationError {
  readonly category: OrchestrationErrorCategory.RESOURCE_ALLOCATION_ERROR | OrchestrationErrorCategory.BROWSER_POOL_ERROR | OrchestrationErrorCategory.SESSION_COORDINATION_ERROR;
  readonly resourceError: {
    readonly requestedResources: {
      readonly browsers: number;
      readonly sessions: number;
      readonly memory: number;
      readonly connections: number;
    };
    readonly availableResources: {
      readonly browsers: number;
      readonly sessions: number;
      readonly memory: number;
      readonly connections: number;
    };
    readonly allocationStrategy: 'round_robin' | 'least_loaded' | 'resource_based' | 'priority_based';
  readonly queuePosition?: number;
  readonly estimatedWaitTime?: number;
  };
}

/**
 * Aggregation error for result collection and merging failures
 */
export interface AggregationError extends OrchestrationError {
  readonly category: OrchestrationErrorCategory.RESULT_AGGREGATION_ERROR | OrchestrationErrorCategory.DATA_MERGE_ERROR | OrchestrationErrorCategory.OUTPUT_COORDINATION_ERROR;
  readonly aggregationError: {
    readonly aggregationType: 'data_merge' | 'result_collection' | 'output_formatting' | 'report_generation';
  readonly partialResults: Array<{readonly operationId: string;
      readonly status: 'success' | 'partial' | 'failed';
  readonly dataSize: number;
  readonly dataType: string;
      readonly mergeStatus: 'pending' | 'merged' | 'failed';}>;readonly mergeConflicts: Array<{
      readonly field: string;
      readonly conflictType: 'type_mismatch' | 'value_conflict' | 'structure_mismatch';
  readonly resolution: 'manual' | 'automatic' | 'skip';}>;readonly dataIntegrity: {
      readonly checksumValid: boolean;
      readonly completenessScore: number;
      readonly consistencyScore: number;
    };
  };
}

/**
 * Union type for all orchestration error types
 */
export type OrchestrationErrorType =
  | OrchestrationError
  | DistributedOperationError
  | WorkflowCoordinationError
  | ResourceAllocationError
  | AggregationError;

/**
 * Type guards for orchestration errors
 */
export function isOrchestrationError(error: unknown): error is OrchestrationError {
  return (
    typeof error === 'object' &&error !== null &&'name' in error &&(error as { name: string }).name === 'OrchestrationError' &&'orchestrationId' in error &&'operationType' in error &&'distributedContext' in error);}

export function isDistributedOperationError(error: unknown): error is DistributedOperationError {
  return (
    isOrchestrationError(error) &&
    'distributedError' in error &&(error.category === OrchestrationErrorCategory.DISTRIBUTED_TASK_ERROR ||error.category === OrchestrationErrorCategory.PARALLEL_EXECUTION_ERROR)
  );
}

export function isWorkflowCoordinationError(error: unknown): error is WorkflowCoordinationError {
  return (
    isOrchestrationError(error) &&
    'workflowError' in error &&error.category === OrchestrationErrorCategory.WORKFLOW_COORDINATION_ERROR);
}

export function isResourceAllocationError(error: unknown): error is ResourceAllocationError {
  return (
    isOrchestrationError(error) &&
    'resourceError' in error &&(error.category === OrchestrationErrorCategory.RESOURCE_ALLOCATION_ERROR ||error.category === OrchestrationErrorCategory.BROWSER_POOL_ERROR ||
     error.category === OrchestrationErrorCategory.SESSION_COORDINATION_ERROR)
  );
}

export function isAggregationError(error: unknown): error is AggregationError {
  return (
    isOrchestrationError(error) &&
    'aggregationError' in error &&(error.category === OrchestrationErrorCategory.RESULT_AGGREGATION_ERROR ||error.category === OrchestrationErrorCategory.DATA_MERGE_ERROR ||
     error.category === OrchestrationErrorCategory.OUTPUT_COORDINATION_ERROR)
  );
}

/**
 * Orchestration error factory for creating typed errors
 */
export class OrchestrationErrorFactory {
  /**
   * Create a distributed operation error
   */
  static createDistributedOperationError(
    message: string,
    orchestrationId: string,
    operationType: OrchestrationOperationType,
    distributedContext: OrchestrationError['distributedContext'],distributedError: DistributedOperationError['distributedError'],additionalContext?: Record<string, unknown>): DistributedOperationError {
    return {
      name: 'OrchestrationError',message,code: 'DISTRIBUTED_OPERATION_FAILED',timestamp: new Date(),category: OrchestrationErrorCategory.DISTRIBUTED_TASK_ERROR,
      severity: OrchestrationErrorSeverity.HIGH,
      operationType,
      orchestrationId,
      distributedContext,
      resourceContext: {
        browserSessions: 0,
        activeTasks: distributedContext.totalOperations,
      },
      affectedOperations: [],
      dependencies: {
        requiredOperations: [],
        blockedOperations: [],
        criticalPath: false,
      },
      performanceMetrics: {
        executionTime: 0,
      },
      distributedError,
      context: additionalContext || {},
    };
  }

  /**
   * Create a workflow coordination error
   */
  static createWorkflowCoordinationError(
    message: string,
    orchestrationId: string,
    workflowId: string,
    operationType: OrchestrationOperationType,
    workflowError: WorkflowCoordinationError['workflowError'],additionalContext?: Record<string, unknown>): WorkflowCoordinationError {
    return {
      name: 'OrchestrationError',message,code: 'WORKFLOW_COORDINATION_FAILED',timestamp: new Date(),category: OrchestrationErrorCategory.WORKFLOW_COORDINATION_ERROR,
      severity: OrchestrationErrorSeverity.WORKFLOW_BREAKING,
      operationType,
      orchestrationId,
      workflowId,
      distributedContext: {
        totalOperations: workflowError.totalSteps,
        completedOperations: workflowError.completedSteps,
        failedOperations: 1,
        remainingOperations: workflowError.totalSteps - workflowError.completedSteps,
        parallelExecutions: 1,
        coordinationState: 'failed',},resourceContext: {
        browserSessions: 1,
        activeTasks: 1,
      },
      affectedOperations: [],
      dependencies: {
        requiredOperations: [],
        blockedOperations: [],
        criticalPath: true,
      },
      performanceMetrics: {
        executionTime: 0,
      },
      workflowError,
      context: additionalContext || {},
    };
  }

  /**
   * Create a resource allocation error
   */
  static createResourceAllocationError(
    message: string,
    orchestrationId: string,
    operationType: OrchestrationOperationType,
    resourceError: ResourceAllocationError['resourceError'],additionalContext?: Record<string, unknown>): ResourceAllocationError {
    return {
      name: 'OrchestrationError',message,code: 'RESOURCE_ALLOCATION_FAILED',timestamp: new Date(),category: OrchestrationErrorCategory.RESOURCE_ALLOCATION_ERROR,
      severity: OrchestrationErrorSeverity.HIGH,
      operationType,
      orchestrationId,
      distributedContext: {
        totalOperations: 1,
        completedOperations: 0,
        failedOperations: 1,
        remainingOperations: 0,
        parallelExecutions: 0,
        coordinationState: 'failed',},resourceContext: {
        browserSessions: resourceError.availableResources.browsers,
        activeTasks: 0,
        memoryUsage: resourceError.availableResources.memory,
        networkConnections: resourceError.availableResources.connections,
      },
      affectedOperations: [],
      dependencies: {
        requiredOperations: [],
        blockedOperations: [],
        criticalPath: false,
      },
      performanceMetrics: {
        executionTime: 0,
      },
      resourceError,
      context: additionalContext || {},
    };
  }

  /**
   * Create an aggregation error
   */
  static createAggregationError(
    message: string,
    orchestrationId: string,
    operationType: OrchestrationOperationType,
    aggregationError: AggregationError['aggregationError'],additionalContext?: Record<string, unknown>): AggregationError {
    return {
      name: 'OrchestrationError',message,code: 'AGGREGATION_FAILED',timestamp: new Date(),category: OrchestrationErrorCategory.RESULT_AGGREGATION_ERROR,
      severity: OrchestrationErrorSeverity.MEDIUM,
      operationType,
      orchestrationId,
      distributedContext: {
        totalOperations: aggregationError.partialResults.length,
        completedOperations: aggregationError.partialResults.filter(r => r.status === 'success').length,failedOperations: aggregationError.partialResults.filter(r => r.status === 'failed').length,remainingOperations: aggregationError.partialResults.filter(r => r.status === 'partial').length,parallelExecutions: aggregationError.partialResults.length,coordinationState: 'aggregating',},resourceContext: {
        browserSessions: 0,
        activeTasks: 0,
      },
      affectedOperations: aggregationError.partialResults.map(result => ({
        operationId: result.operationId,
        status: result.status === 'success' ? 'completed' :result.status === 'failed' ? 'failed' : 'running',})),dependencies: {
        requiredOperations: [],
        blockedOperations: [],
        criticalPath: false,
      },
      performanceMetrics: {
        executionTime: 0,
      },
      aggregationError,
      context: additionalContext || {},
    };
  }
}

/**
 * Orchestration error analysis utilities
 */
export class OrchestrationErrorAnalyzer {
  /**
   * Analyze error impact on orchestration operations
   */
  static analyzeErrorImpact(error: OrchestrationErrorType): {
    impactLevel: 'minimal' | 'moderate' | 'severe' | 'critical';affectedOperationsCount: number;recoveryComplexity: 'simple' | 'moderate' | 'complex' | 'manual';estimatedRecoveryTime: number;rollbackRequired: boolean;
    criticalPathAffected: boolean;
  } {
    const affectedOperationsCount = error.affectedOperations.length;
    const criticalPathAffected = error.dependencies.criticalPath;

    let impactLevel: 'minimal' | 'moderate' | 'severe' | 'critical';let recoveryComplexity: 'simple' | 'moderate' | 'complex' | 'manual';let estimatedRecoveryTime: number;// Determine impact level
    if (error.severity === OrchestrationErrorSeverity.SYSTEM_WIDE) {
      impactLevel = 'critical';} else if (error.severity === OrchestrationErrorSeverity.WORKFLOW_BREAKING || criticalPathAffected) {impactLevel = 'severe';} else if (affectedOperationsCount > 5 || error.severity === OrchestrationErrorSeverity.HIGH) {impactLevel = 'moderate';} else {impactLevel = 'minimal';}// Determine recovery complexity
    if (isWorkflowCoordinationError(error) && error.workflowError.rollbackRequired) {
      recoveryComplexity = 'complex';estimatedRecoveryTime = 30000; // 30 seconds} else if (isDistributedOperationError(error) && error.distributedError.coordinationFailure) {
      recoveryComplexity = 'complex';estimatedRecoveryTime = 20000; // 20 seconds} else if (isAggregationError(error)) {
      recoveryComplexity = 'moderate';estimatedRecoveryTime = 10000; // 10 seconds} else if (error.severity === OrchestrationErrorSeverity.SYSTEM_WIDE) {
      recoveryComplexity = 'manual';estimatedRecoveryTime = -1; // Manual intervention required} else {
      recoveryComplexity = 'simple';estimatedRecoveryTime = 5000; // 5 seconds}

    return {
      impactLevel,
      affectedOperationsCount,
      recoveryComplexity,
      estimatedRecoveryTime,
      rollbackRequired: isWorkflowCoordinationError(error) ? error.workflowError.rollbackRequired : false,
      criticalPathAffected,
    };
  }

  /**
   * Get orchestration error recommendations
   */
  static getErrorRecommendations(error: OrchestrationErrorType): string[] {
    const recommendations: string[] = [];

    if (isDistributedOperationError(error)) {
      recommendations.push('Consider reducing parallel operation count');recommendations.push('Implement better coordination mechanisms');if (error.distributedError.partialResults) {recommendations.push('Salvage partial results and retry failed operations');}}

    if (isWorkflowCoordinationError(error)) {
      recommendations.push('Review workflow step dependencies');recommendations.push('Implement checkpointing for long workflows');if (error.workflowError.rollbackRequired) {recommendations.push('Execute compensation actions to rollback changes');}}

    if (isResourceAllocationError(error)) {
      recommendations.push('Scale up resource allocation');recommendations.push('Implement resource pooling and sharing');recommendations.push('Consider load balancing strategies');}if (isAggregationError(error)) {
      recommendations.push('Implement partial result recovery');recommendations.push('Add data validation and conflict resolution');recommendations.push('Use streaming aggregation for large datasets');}// General recommendations based on severity
    if (error.severity === OrchestrationErrorSeverity.SYSTEM_WIDE) {
      recommendations.push('System-wide restart may be required');recommendations.push('Contact system administrator');}if (error.dependencies.criticalPath) {
      recommendations.push('Priority handling for critical path operations');recommendations.push('Consider alternative execution paths');
    }

    return recommendations;
  }
}

/**
 * Export extended error types for backward compatibility
 */
export type ExtendedApplicationError = ApplicationError | OrchestrationErrorType;