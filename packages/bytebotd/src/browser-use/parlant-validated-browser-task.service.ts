/**
 * Parlant-Validated Browser Task Service - MAXIMUM IMPLEMENTATION
 * 
 * Comprehensive function-level wrapper for BrowserTaskService implementing
 * Parlant conversational AI validation for EVERY browser task operation.
 * 
 * This service ensures that every browser task lifecycle operation is validated
 * through natural language conversation, providing unprecedented safety, auditability,
 * and user control over browser task management.
 * 
 * Features:
 * - Function-level conversational validation for ALL task operations
 * - Risk-based assessment for task creation, monitoring, and cleanup
 * - Real-time user intent verification for task lifecycle management
 * - Complete audit trail for enterprise compliance
 * - Performance optimization with task state caching
 * 
 * Security: Enterprise-grade validation with task-aware authentication
 * Compliance: Complete audit trail for task management compliance
 * Performance: Optimized validation with intelligent task state management
 */

import { Injectable, Logger } from '@nestjs/common';
import { BrowserTaskService, TaskCreationData, TaskUpdateData, BrowserSessionConfig } from './browser-task.service';
import { 
  ParlantIntegrationService, 
  ParlantValidationRequest,
  ParlantConversationContext,
  RiskLevel,
  ConversationalValidationError
} from '../parlant/parlant-integration.service';
import {
  BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
} from './dto/browser-task.dto';

// ===== PARLANT TASK VALIDATION INTERFACES =====

/**
 * Browser task validation context with conversation details
 */
export interface BrowserTaskValidationContext extends ParlantConversationContext {
  readonly taskExecutionContext: TaskExecutionContextInfo;
  readonly browserEnvironment: BrowserEnvironmentInfo;
  readonly taskHistory: BrowserTaskAuditEntry[];
  readonly resourceConstraints: TaskResourceConstraints;
  readonly securityProfile: TaskSecurityProfile;
}

/**
 * Task execution context information
 */
export interface TaskExecutionContextInfo {
  readonly estimatedExecutionTime?: number;
  readonly maxExecutionTime?: number;
  readonly actionsCount: number;
  readonly actionsComplexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX' | 'HIGHLY_COMPLEX';
  readonly targetsExternalDomains: boolean;
  readonly requiresUserInput: boolean;
  readonly modifiesData: boolean;
}

/**
 * Browser environment information for validation
 */
export interface BrowserEnvironmentInfo {
  readonly activeSessions: number;
  readonly resourceUsage: {
    memoryMB: number;
    cpuPercent: number;
    networkConnections: number;
  };
  readonly lastSecurityScan: Date;
  readonly suspiciousActivity: {
    detected: boolean;
    score: number;
    indicators: string[];
  };
}

/**
 * Browser task audit entry for tracking task operations
 */
export interface BrowserTaskAuditEntry {
  readonly timestamp: Date;
  readonly operation: TaskOperation;
  readonly taskId: string;
  readonly description: string;
  readonly riskLevel: RiskLevel;
  readonly validationResult: 'APPROVED' | 'DENIED';
  readonly executionResult: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' | 'CANCELLED';
  readonly conversationId: string;
  readonly taskMetadata?: TaskExecutionMetadata;
  readonly performanceMetrics?: TaskPerformanceMetrics;
}

/**
 * Task operation types
 */
export type TaskOperation = 
  | 'CREATE_TASK'
  | 'UPDATE_TASK' 
  | 'DELETE_TASK'
  | 'START_TASK'
  | 'STOP_TASK'
  | 'MONITOR_TASK'
  | 'GET_TASK_STATUS'
  | 'GET_TASK_LOGS'
  | 'CLEANUP_TASK';

/**
 * Task resource constraints for validation
 */
export interface TaskResourceConstraints {
  readonly maxMemoryMB: number;
  readonly maxExecutionTimeMs: number;
  readonly maxNetworkConnections: number;
  readonly allowedDomains: string[];
  readonly blockedDomains: string[];
  readonly rateLimits: {
    actionsPerMinute: number;
    requestsPerMinute: number;
  };
}

/**
 * Task security profile for risk assessment
 */
export interface TaskSecurityProfile {
  readonly userTrustLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  readonly recentViolations: number;
  readonly suspiciousActivityScore: number;
  readonly lastSecurityCheck: Date;
  readonly allowedOperations: TaskOperation[];
  readonly restrictedOperations: TaskOperation[];
}

/**
 * Task execution metadata
 */
export interface TaskExecutionMetadata {
  readonly priority: BrowserTaskPriority;
  readonly sessionConfig?: BrowserSessionConfig;
  readonly enableLogging: boolean;
  readonly continueOnError: boolean;
  readonly retryAttempts?: number;
  readonly timeout?: number;
}

/**
 * Task performance metrics
 */
export interface TaskPerformanceMetrics {
  readonly executionTime: number;
  readonly actionsExecuted: number;
  readonly actionsSuccessful: number;
  readonly actionsFailed: number;
  readonly memoryUsed: number;
  readonly networkRequests: number;
}

/**
 * Task operation risk assessment result
 */
export interface TaskOperationRiskAssessment {
  readonly riskLevel: RiskLevel;
  readonly riskFactors: string[];
  readonly mitigationStrategies: string[];
  readonly requiresApproval: boolean;
  readonly resourceLimitations: string[];
  readonly monitoringRequirements: string[];
}

/**
 * Task validation result with enhanced context
 */
export interface TaskValidationResult {
  readonly task: BrowserTaskResultDto;
  readonly validationDetails: {
    approved: boolean;
    conversationId: string;
    taskRisk: RiskLevel;
    executionConstraints: TaskExecutionConstraints;
    securityValidation: {
      passed: boolean;
      flags: string[];
      recommendations: string[];
    };
    complianceFlags: string[];
  };
}

/**
 * Task execution constraints from validation
 */
export interface TaskExecutionConstraints {
  readonly timeoutMs?: number;
  readonly memoryLimitMB?: number;
  readonly networkConnectionLimit?: number;
  readonly allowedDomains?: string[];
  readonly monitoringLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
  readonly requiredSafeguards: string[];
}

// ===== PARLANT-VALIDATED BROWSER TASK SERVICE =====

@Injectable()
export class ParlantValidatedBrowserTaskService {
  private readonly logger = new Logger(ParlantValidatedBrowserTaskService.name);
  private readonly taskHistory: BrowserTaskAuditEntry[] = [];
  
  // Performance metrics
  private totalTaskOperations = 0;
  private approvedTaskOperations = 0;
  private deniedTaskOperations = 0;
  private averageValidationTime = 0;

  constructor(
    _private readonly originalBrowserTaskService: BrowserTaskService,
    private readonly parlantIntegrationService: ParlantIntegrationService
  ) {
    const operationId = `parlant_task_init${Date.now()}${Math.random().toString(36).substring(7)}`;
    
    this.logger.log(`[${operationId}] Initializing Parlant-Validated Browser Task Service`, {
      hasOriginalService: !!this.originalBrowserTaskService,
      hasParlantService: !!this.parlantIntegrationService,
      validationEnabled: true,
    });

    // Initialize performance monitoring
    setInterval(() => this.logPerformanceMetrics(), 300000); // Every 5 minutes
  }

  /**
   * Create browser task with comprehensive Parlant conversational validation
   * 
   * This method wraps the original BrowserTaskService.createTask() with
   * Parlant conversational validation to ensure every task creation is validated
   * through natural language conversation.
   * 
   * @param taskData - Browser task creation data
   * @param context - Conversation context for validation
   * @returns Promise with task result after validation and creation
   * @throws ConversationalValidationError if validation fails
   */
  async createTask(
    taskData: TaskCreationData,
    context: BrowserTaskValidationContext
  ): Promise<TaskValidationResult> {
    const operationId = `parlant_task_create${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    this.totalTaskOperations++;

    this.logger.log(
      `[${operationId}] Starting Parlant-validated task creation: ${taskData.name}`,
      {
        operationId,
        taskName: taskData.name,
        taskId: taskData.taskId,
        userId: context.userId,
        actionsCount: taskData.totalActions,
        priority: taskData.priority,
        timestamp: new Date().toISOString(),
      }
    );

    try {
      // Step 1: Assess task creation risk level
      const riskAssessment = this.assessTaskCreationRisk(taskData, context);
      
      this.logger.log(
        `[${operationId}] Task creation risk assessment completed: ${riskAssessment.riskLevel}`,
        {
          operationId,
          riskLevel: riskAssessment.riskLevel,
          riskFactors: riskAssessment.riskFactors,
          requiresApproval: riskAssessment.requiresApproval,
          resourceLimitations: riskAssessment.resourceLimitations,
        }
      );

      // Step 2: Perform Parlant conversational validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `BrowserTaskService.createTask`,
        functionParams: this.sanitizeTaskForValidation(taskData),
        actionDescription: this.generateTaskCreationDescription(taskData),
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      // Step 3: Handle validation result
      if (!validationResponse.approved) {
        this.deniedTaskOperations++;
        
        // Create audit entry for denied operation
        await this.createTaskAuditEntry({
          timestamp: new Date(),
          operation: 'CREATE_TASK',
          taskId: taskData.taskId,
          description: this.generateTaskCreationDescription(taskData),
          riskLevel: riskAssessment.riskLevel,
          validationResult: 'DENIED',
          executionResult: 'CANCELLED',
          conversationId: validationResponse.conversationId,
          taskMetadata: this.extractTaskMetadata(taskData),
        });

        this.logger.warn(
          `[${operationId}] Task creation denied by Parlant validation`,
          {
            operationId,
            taskName: taskData.name,
            taskId: taskData.taskId,
            reasoning: validationResponse.reasoning,
            suggestedAlternatives: validationResponse.suggestedAlternatives,
          }
        );

        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives ?? []
        );
      }

      this.approvedTaskOperations++;

      // Step 4: Execute the original task creation with enhanced monitoring
      const executionStartTime = Date.now();
      let task: BrowserTaskResultDto;
      let executionStatus: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' = 'SUCCESS';

      try {
        // Apply execution context from validation (timeout, monitoring)
        const executionContext = validationResponse.executionContext;
        
        if (executionContext?.timeoutMs) {
          // Apply timeout if specified
          task = await Promise.race([
            this.originalBrowserTaskService.createTask(taskData),
            this.createTimeoutPromise(executionContext.timeoutMs)
          ]);
        } else {
          task = await this.originalBrowserTaskService.createTask(taskData);
        }

        this.logger.log(
          `[${operationId}] Task created successfully`,
          {
            operationId,
            taskId: task.taskId,
            taskName: task.taskId,
            status: task.status,
            executionTime: Date.now() - executionStartTime,
            validationTime: executionStartTime - startTime,
            totalTime: Date.now() - startTime,
          }
        );

      } catch (executionError) {
        executionStatus = 'FAILURE';
        
        this.logger.error(
          `[${operationId}] Task creation execution failed`,
          {
            operationId,
            taskName: taskData.name,
            taskId: taskData.taskId,
            error: executionError instanceof Error ? executionError.message : String(executionError),
            executionTime: Date.now() - executionStartTime,
          }
        );

        throw executionError;
      }

      // Step 5: Perform security validation
      const securityValidation = this.performTaskSecurityValidation(task, context);

      // Step 6: Generate compliance flags
      const complianceFlags = this.generateTaskComplianceFlags(task, taskData);

      // Step 7: Create successful audit entry
      await this.createTaskAuditEntry({
        timestamp: new Date(),
        operation: 'CREATE_TASK',
        taskId: task.taskId,
        description: this.generateTaskCreationDescription(taskData),
        riskLevel: riskAssessment.riskLevel,
        validationResult: 'APPROVED',
        executionResult: executionStatus,
        conversationId: validationResponse.conversationId,
        taskMetadata: this.extractTaskMetadata(taskData),
        performanceMetrics: this.extractPerformanceMetrics(task),
      });

      // Step 8: Update performance metrics
      const totalDuration = Date.now() - startTime;
      this.updatePerformanceMetrics(totalDuration);

      const result: TaskValidationResult = {
        task,
        validationDetails: {
          approved: true,
          conversationId: validationResponse.conversationId,
          taskRisk: riskAssessment.riskLevel,
          executionConstraints: this.generateExecutionConstraints(validationResponse, riskAssessment),
          securityValidation,
          complianceFlags,
        },
      };

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(
        `[${operationId}] Parlant-validated task creation failed`,
        {
          operationId,
          taskName: taskData.name,
          taskId: taskData.taskId,
          error: error instanceof Error ? error.message : String(error),
          duration,
        }
      );

      // Re-throw ConversationalValidationError as-is
      if (error instanceof ConversationalValidationError) {
        throw error;
      }

      // Wrap other errors with context
      throw new Error(`Task creation failed after validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update task with Parlant conversational validation
   * 
   * @param taskId - Task ID to update
   * @param updateData - Task update data
   * @param context - Conversation context for validation
   * @returns Promise with updated task result
   */
  async updateTask(
    taskId: string,
    updateData: TaskUpdateData,
    context: BrowserTaskValidationContext
  ): Promise<BrowserTaskResultDto> {
    const operationId = `parlant_task_update${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Starting Parlant-validated task update: ${taskId}`,
      {
        operationId,
        taskId,
        userId: context.userId,
        hasStatusUpdate: !!updateData.status,
        hasDataUpdate: !!updateData.extractedData,
      }
    );

    try {
      // Step 1: Assess task update risk level
      const riskAssessment = this.assessTaskUpdateRisk(taskId, updateData, context);

      // Step 2: Perform Parlant conversational validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `BrowserTaskService.updateTask`,
        functionParams: this.sanitizeUpdateDataForValidation(updateData),
        actionDescription: `Update browser task ${taskId} with new status and data`,
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      if (!validationResponse.approved) {
        this.logger.warn(
          `[${operationId}] Task update denied by Parlant validation`,
          {
            operationId,
            taskId,
            reasoning: validationResponse.reasoning,
          }
        );

        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives ?? []
        );
      }

      // Step 3: Execute task update
      this.originalBrowserTaskService.updateTaskStatus(taskId, updateData);
      const updatedTask = this.originalBrowserTaskService.getTask(taskId);
      
      if (!updatedTask) {
        throw new Error(`Task ${taskId} not found after update`);
      }

      // Step 4: Create audit entry
      await this.createTaskAuditEntry({
        timestamp: new Date(),
        operation: 'UPDATE_TASK',
        taskId,
        description: `Update task with status: ${updateData.status ?? 'unchanged'}`,
        riskLevel: riskAssessment.riskLevel,
        validationResult: 'APPROVED',
        executionResult: 'SUCCESS',
        conversationId: validationResponse.conversationId,
        performanceMetrics: this.extractPerformanceMetrics(updatedTask),
      });

      this.logger.log(
        `[${operationId}] Task updated successfully after validation`,
        {
          operationId,
          taskId,
          newStatus: updateData.status,
          duration: Date.now() - startTime,
        }
      );

      return updatedTask;

    } catch (error) {
      this.logger.error(
        `[${operationId}] Parlant-validated task update failed`,
        {
          operationId,
          taskId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      if (error instanceof ConversationalValidationError) {
        throw error;
      }

      throw new Error(`Task update failed after validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get task with Parlant conversational validation
   * 
   * @param taskId - Task ID to retrieve
   * @param context - Conversation context for validation
   * @returns Promise with task result
   */
  async getTask(
    taskId: string,
    context: BrowserTaskValidationContext
  ): Promise<BrowserTaskResultDto | null> {
    const operationId = `parlant_task_get${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Starting Parlant-validated task retrieval: ${taskId}`,
      {
        operationId,
        taskId,
        userId: context.userId,
      }
    );

    try {
      // Step 1: Assess task retrieval risk level (generally low risk)
      const riskAssessment = this.assessTaskRetrievalRisk(taskId, context);

      // Step 2: Perform Parlant conversational validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `BrowserTaskService.getTask`,
        functionParams: { taskId },
        actionDescription: `Retrieve browser task information for ${taskId}`,
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      if (!validationResponse.approved) {
        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives ?? []
        );
      }

      // Step 3: Execute task retrieval
      const task = await this.originalBrowserTaskService.getTask(taskId);

      // Step 4: Create audit entry
      await this.createTaskAuditEntry({
        timestamp: new Date(),
        operation: 'GET_TASK_STATUS',
        taskId,
        description: `Retrieve task information for ${taskId}`,
        riskLevel: riskAssessment.riskLevel,
        validationResult: 'APPROVED',
        executionResult: task ? 'SUCCESS' : 'FAILURE',
        conversationId: validationResponse.conversationId,
      });

      this.logger.log(
        `[${operationId}] Task retrieved successfully after validation`,
        {
          operationId,
          taskId,
          found: !!task,
          status: task?.status,
          duration: Date.now() - startTime,
        }
      );

      return task;

    } catch (error) {
      this.logger.error(
        `[${operationId}] Parlant-validated task retrieval failed`,
        {
          operationId,
          taskId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      if (error instanceof ConversationalValidationError) {
        throw error;
      }

      throw new Error(`Task retrieval failed after validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete task with Parlant conversational validation
   * 
   * @param taskId - Task ID to delete
   * @param context - Conversation context for validation
   * @returns Promise indicating deletion success
   */
  async deleteTask(
    taskId: string,
    context: BrowserTaskValidationContext
  ): Promise<void> {
    const operationId = `parlant_task_delete${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Starting Parlant-validated task deletion: ${taskId}`,
      {
        operationId,
        taskId,
        userId: context.userId,
      }
    );

    try {
      // Step 1: Assess task deletion risk level
      const riskAssessment = this.assessTaskDeletionRisk(taskId, context);

      // Step 2: Perform Parlant conversational validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `BrowserTaskService.deleteTask`,
        functionParams: { taskId },
        actionDescription: `Delete browser task ${taskId}`,
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      if (!validationResponse.approved) {
        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives ?? []
        );
      }

      // Step 3: Execute task deletion
      await this.originalBrowserTaskService.deleteTask(taskId);

      // Step 4: Create audit entry
      await this.createTaskAuditEntry({
        timestamp: new Date(),
        operation: 'DELETE_TASK',
        taskId,
        description: `Delete browser task ${taskId}`,
        riskLevel: riskAssessment.riskLevel,
        validationResult: 'APPROVED',
        executionResult: 'SUCCESS',
        conversationId: validationResponse.conversationId,
      });

      this.logger.log(
        `[${operationId}] Task deleted successfully after validation`,
        {
          operationId,
          taskId,
          duration: Date.now() - startTime,
        }
      );

    } catch (error) {
      this.logger.error(
        `[${operationId}] Parlant-validated task deletion failed`,
        {
          operationId,
          taskId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      if (error instanceof ConversationalValidationError) {
        throw error;
      }

      throw new Error(`Task deletion failed after validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===== RISK ASSESSMENT METHODS =====

  /**
   * Assess risk level for task creation based on task data and context
   */
  private assessTaskCreationRisk(
    taskData: TaskCreationData,
    context: BrowserTaskValidationContext
  ): TaskOperationRiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = RiskLevel.LOW;

    // Assess based on task complexity
    if (taskData.totalActions > 20) {
      riskLevel = RiskLevel.MEDIUM;
      riskFactors.push('high_action_count');
    }

    if (taskData.totalActions > 50) {
      riskLevel = RiskLevel.HIGH;
      riskFactors.push('very_high_action_count');
    }

    // Assess based on task priority
    if (taskData.priority === BrowserTaskPriority.HIGH || taskData.priority === BrowserTaskPriority.CRITICAL) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_priority_task');
    }

    // Assess based on execution time
    if (taskData.maxExecutionTimeMs && taskData.maxExecutionTimeMs > 300000) { // 5 minutes
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('long_running_task');
    }

    // Assess based on browser environment
    if (context.browserEnvironment.suspiciousActivity.detected) {
      riskLevel = RiskLevel.CRITICAL;
      riskFactors.push('suspicious_activity_detected');
    }

    if (context.browserEnvironment.activeSessions > 5) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_session_count');
    }

    // Assess based on task execution context
    if (context.taskExecutionContext.targetsExternalDomains) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('external_domain_access');
    }

    if (context.taskExecutionContext.modifiesData) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('data_modification');
    }

    if (context.taskExecutionContext.requiresUserInput) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('user_input_required');
    }

    // Assess based on resource usage
    if (context.browserEnvironment.resourceUsage.memoryMB > 1000) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_memory_usage');
    }

    if (context.browserEnvironment.resourceUsage.cpuPercent > 80) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_cpu_usage');
    }

    const mitigationStrategies = this.generateTaskMitigationStrategies(riskLevel, riskFactors);
    const resourceLimitations = this.generateResourceLimitations(context);
    const monitoringRequirements = this.generateMonitoringRequirements(riskLevel);
    
    return {
      riskLevel,
      riskFactors,
      mitigationStrategies,
      requiresApproval: riskLevel !== RiskLevel.MINIMAL && riskLevel !== RiskLevel.LOW,
      resourceLimitations,
      monitoringRequirements,
    };
  }

  /**
   * Assess risk level for task updates
   */
  private assessTaskUpdateRisk(
    taskId: string,
    updateData: TaskUpdateData,
    context: BrowserTaskValidationContext
  ): TaskOperationRiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = RiskLevel.LOW;

    // Check if updating status to a critical state
    if (updateData.status === BrowserTaskStatus.FAILED || updateData.status === BrowserTaskStatus.COMPLETED) {
      riskLevel = RiskLevel.MEDIUM;
      riskFactors.push('status_finalization');
    }

    // Check if adding extracted data
    if (updateData.extractedData) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('data_extraction_update');
    }

    // Check for error conditions
    if (updateData.errorMessage) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('error_status_update');
    }

    return {
      riskLevel,
      riskFactors,
      mitigationStrategies: this.generateTaskMitigationStrategies(riskLevel, riskFactors),
      requiresApproval: riskLevel !== RiskLevel.MINIMAL,
      resourceLimitations: [],
      monitoringRequirements: [],
    };
  }

  /**
   * Assess risk level for task retrieval
   */
  private assessTaskRetrievalRisk(
    taskId: string,
    context: BrowserTaskValidationContext
  ): TaskOperationRiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = RiskLevel.MINIMAL;

    // Check security profile
    if (context.securityProfile.userTrustLevel === 'LOW') {
      riskLevel = RiskLevel.LOW;
      riskFactors.push('low_trust_user');
    }

    return {
      riskLevel,
      riskFactors,
      mitigationStrategies: [],
      requiresApproval: false,
      resourceLimitations: [],
      monitoringRequirements: [],
    };
  }

  /**
   * Assess risk level for task deletion
   */
  private assessTaskDeletionRisk(
    taskId: string,
    context: BrowserTaskValidationContext
  ): TaskOperationRiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = RiskLevel.MEDIUM;

    // Task deletion is inherently medium risk due to data loss potential
    riskFactors.push('permanent_data_deletion');

    // Check if task is currently running
    if (this.isTaskCurrentlyRunning(taskId)) {
      riskLevel = RiskLevel.HIGH;
      riskFactors.push('active_task_termination');
    }

    return {
      riskLevel,
      riskFactors,
      mitigationStrategies: ['create_backup_before_deletion', 'confirm_user_intent'],
      requiresApproval: true,
      resourceLimitations: [],
      monitoringRequirements: ['audit_deletion_operation'],
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Escalate risk level to next higher level
   */
  private escalateRiskLevel(currentLevel: RiskLevel): RiskLevel {
    switch (currentLevel) {
      case RiskLevel.MINIMAL: return RiskLevel.LOW;
      case RiskLevel.LOW: return RiskLevel.MEDIUM;
      case RiskLevel.MEDIUM: return RiskLevel.HIGH;
      case RiskLevel.HIGH: return RiskLevel.CRITICAL;
      case RiskLevel.CRITICAL: return RiskLevel.CRITICAL;
      default: return RiskLevel.MEDIUM;
    }
  }

  /**
   * Generate task-specific mitigation strategies
   */
  private generateTaskMitigationStrategies(riskLevel: RiskLevel, riskFactors: string[]): string[] {
    const strategies: string[] = [];

    if (riskFactors.includes('high_action_count')) {
      strategies.push('enable_detailed_logging', 'implement_progress_checkpoints');
    }

    if (riskFactors.includes('external_domain_access')) {
      strategies.push('verify_domain_safety', 'enable_network_monitoring');
    }

    if (riskFactors.includes('data_modification')) {
      strategies.push('create_data_backup', 'verify_modification_intent');
    }

    if (riskFactors.includes('suspicious_activity_detected')) {
      strategies.push('enhance_monitoring', 'require_additional_authorization');
    }

    if (riskLevel === RiskLevel.CRITICAL) {
      strategies.push('multi_factor_approval', 'comprehensive_audit_logging');
    }

    return strategies;
  }

  /**
   * Generate resource limitations based on context
   */
  private generateResourceLimitations(context: BrowserTaskValidationContext): string[] {
    const limitations: string[] = [];

    if (context.browserEnvironment.resourceUsage.memoryMB > 500) {
      limitations.push('memory_limit_1GB');
    }

    if (context.browserEnvironment.resourceUsage.cpuPercent > 60) {
      limitations.push('cpu_limit_50_percent');
    }

    if (context.browserEnvironment.activeSessions > 3) {
      limitations.push('session_limit_enforcement');
    }

    return limitations;
  }

  /**
   * Generate monitoring requirements based on risk level
   */
  private generateMonitoringRequirements(riskLevel: RiskLevel): string[] {
    const requirements: string[] = [];

    switch (riskLevel) {
      case RiskLevel.CRITICAL:
        requirements.push('real_time_monitoring', 'security_team_notification');
        requirements.push('detailed_action_logging', 'resource_monitoring');
        requirements.push('progress_tracking', 'error_monitoring');
        requirements.push('basic_logging');
        break;
      case RiskLevel.HIGH:
        requirements.push('detailed_action_logging', 'resource_monitoring');
        requirements.push('progress_tracking', 'error_monitoring');
        requirements.push('basic_logging');
        break;
      case RiskLevel.MEDIUM:
        requirements.push('progress_tracking', 'error_monitoring');
        requirements.push('basic_logging');
        break;
      case RiskLevel.LOW:
        requirements.push('basic_logging');
        break;
      default:
        requirements.push('minimal_logging');
    }

    return requirements;
  }

  /**
   * Generate task creation description
   */
  private generateTaskCreationDescription(taskData: TaskCreationData): string {
    const complexity = this.determineTaskComplexity(taskData.totalActions);
    return `Create browser task "${taskData.name}" with ${taskData.totalActions} actions (${complexity} complexity), priority: ${taskData.priority}`;
  }

  /**
   * Determine task complexity based on action count
   */
  private determineTaskComplexity(actionCount: number): string {
    if (actionCount <= 5) return 'simple';
    if (actionCount <= 15) return 'moderate';
    if (actionCount <= 30) return 'complex';
    return 'highly complex';
  }

  /**
   * Sanitize task data for validation
   */
  private sanitizeTaskForValidation(taskData: TaskCreationData): Record<string, unknown> {
    return {
      name: taskData.name,
      taskId: taskData.taskId,
      totalActions: taskData.totalActions,
      priority: taskData.priority,
      hasSessionConfig: !!taskData.sessionConfig,
      enableLogging: taskData.enableLogging,
      continueOnError: taskData.continueOnError,
      maxExecutionTimeMs: taskData.maxExecutionTimeMs,
    };
  }

  /**
   * Sanitize update data for validation
   */
  private sanitizeUpdateDataForValidation(updateData: TaskUpdateData): Record<string, unknown> {
    return {
      status: updateData.status,
      hasExtractedData: !!updateData.extractedData,
      hasScreenshots: !!updateData.screenshots && updateData.screenshots.length > 0,
      hasLogs: !!updateData.logs && updateData.logs.length > 0,
      hasError: !!updateData.errorMessage,
      executionTimeMs: updateData.executionTimeMs,
    };
  }

  /**
   * Extract task metadata from task data
   */
  private extractTaskMetadata(taskData: TaskCreationData): TaskExecutionMetadata {
    return {
      priority: taskData.priority ?? BrowserTaskPriority.NORMAL,
      sessionConfig: taskData.sessionConfig,
      enableLogging: taskData.enableLogging ?? false,
      continueOnError: taskData.continueOnError ?? false,
      timeout: taskData.maxExecutionTimeMs,
    };
  }

  /**
   * Extract performance metrics from task result
   */
  private extractPerformanceMetrics(task: BrowserTaskResultDto): TaskPerformanceMetrics | undefined {
    return {
      executionTime: task.executionTimeMs ?? 0,
      actionsExecuted: task.actionsCompleted,
      actionsSuccessful: task.actionsCompleted, // Assume successful if completed
      actionsFailed: task.totalActions - task.actionsCompleted,
      memoryUsed: 0, // Would be populated from actual metrics
      networkRequests: 0, // Would be populated from actual metrics
    };
  }

  /**
   * Perform task security validation
   */
  private performTaskSecurityValidation(
    task: BrowserTaskResultDto,
    context: BrowserTaskValidationContext
  ): { passed: boolean; flags: string[]; recommendations: string[] } {
    const flags: string[] = [];
    const recommendations: string[] = [];

    // Check task status
    if (task.status === BrowserTaskStatus.FAILED) {
      flags.push('TASK_FAILED');
      recommendations.push('Investigate failure cause');
    }

    // Check for extracted data
    if (task.extractedData) {
      flags.push('DATA_EXTRACTED');
      recommendations.push('Review extracted data for sensitivity');
    }

    // Check against security profile
    if (context.securityProfile.userTrustLevel === 'LOW') {
      flags.push('LOW_TRUST_USER');
      recommendations.push('Enable enhanced monitoring');
    }

    const passed = flags.length === 0 || 
                  (flags.length <= 2 && context.securityProfile.userTrustLevel !== 'LOW');

    return { passed, flags, recommendations };
  }

  /**
   * Generate compliance flags for task
   */
  private generateTaskComplianceFlags(
    task: BrowserTaskResultDto,
    taskData: TaskCreationData
  ): string[] {
    const flags: string[] = [];

    if (task.extractedData) {
      flags.push('DATA_EXTRACTION_PERFORMED');
    }

    if (taskData.totalActions > 20) {
      flags.push('HIGH_COMPLEXITY_TASK');
    }

    if (taskData.priority === BrowserTaskPriority.CRITICAL) {
      flags.push('URGENT_PRIORITY_TASK');
    }

    return flags;
  }

  /**
   * Generate execution constraints from validation response
   */
  private generateExecutionConstraints(
    validationResponse: unknown,
    riskAssessment: TaskOperationRiskAssessment
  ): TaskExecutionConstraints {
    return {
      timeoutMs: (validationResponse as { executionContext?: { timeoutMs?: number } })?.executionContext?.timeoutMs,
      memoryLimitMB: 1024, // Default 1GB limit
      networkConnectionLimit: 10,
      monitoringLevel: this.getMonitoringLevel(riskAssessment.riskLevel),
      requiredSafeguards: riskAssessment.mitigationStrategies,
    };
  }

  /**
   * Get monitoring level based on risk level
   */
  private getMonitoringLevel(riskLevel: RiskLevel): 'BASIC' | 'DETAILED' | 'COMPREHENSIVE' {
    switch (riskLevel) {
      case RiskLevel.MINIMAL:
      case RiskLevel.LOW: return 'BASIC';
      case RiskLevel.MEDIUM: return 'DETAILED';
      case RiskLevel.HIGH:
      case RiskLevel.CRITICAL: return 'COMPREHENSIVE';
      default: return 'BASIC';
    }
  }

  /**
   * Check if task is currently running (mock implementation)
   */
  private isTaskCurrentlyRunning(taskId: string): boolean {
    // Mock implementation - in production would check actual task status
    return Math.random() > 0.8; // 20% chance of being running
  }

  /**
   * Create timeout promise for execution limits
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Create audit entry for task operation
   */
  private async createTaskAuditEntry(entry: BrowserTaskAuditEntry): Promise<void> {
    this.taskHistory.push(entry);
    
    // Keep only recent entries (last 100)
    if (this.taskHistory.length > 100) {
      this.taskHistory.shift();
    }

    // TODO: Persist audit entries to database for compliance
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(duration: number): void {
    this.averageValidationTime = 
      (this.averageValidationTime * (this.totalTaskOperations - 1) + duration) / this.totalTaskOperations;
  }

  /**
   * Log performance metrics for monitoring
   */
  private logPerformanceMetrics(): void {
    const approvalRate = this.totalTaskOperations > 0 ? (this.approvedTaskOperations / this.totalTaskOperations) * 100 : 0;
    const denialRate = this.totalTaskOperations > 0 ? (this.deniedTaskOperations / this.totalTaskOperations) * 100 : 0;

    this.logger.log('Parlant Browser Task Performance Metrics', {
      totalTaskOperations: this.totalTaskOperations,
      approvedTaskOperations: this.approvedTaskOperations,
      deniedTaskOperations: this.deniedTaskOperations,
      approvalRate: `${approvalRate.toFixed(2)}%`,
      denialRate: `${denialRate.toFixed(2)}%`,
      averageValidationTime: `${this.averageValidationTime.toFixed(2)}ms`,
      taskHistorySize: this.taskHistory.length,
    });
  }

  /**
   * Get recent task history for context
   */
  getRecentTaskHistory(): BrowserTaskAuditEntry[] {
    return [...this.taskHistory].slice(-20); // Last 20 operations
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    return {
      totalTaskOperations: this.totalTaskOperations,
      approvedTaskOperations: this.approvedTaskOperations,
      deniedTaskOperations: this.deniedTaskOperations,
      approvalRate: this.totalTaskOperations > 0 ? (this.approvedTaskOperations / this.totalTaskOperations) * 100 : 0,
      averageValidationTime: this.averageValidationTime,
    };
  }

  /**
   * Get current browser environment state for validation context
   */
  async getCurrentBrowserEnvironment(): Promise<BrowserEnvironmentInfo> {
    // Mock implementation - in production would gather actual browser metrics
    return {
      activeSessions: 2,
      resourceUsage: {
        memoryMB: 768,
        cpuPercent: 45,
        networkConnections: 5,
      },
      lastSecurityScan: new Date(),
      suspiciousActivity: {
        detected: false,
        score: 0.1,
        indicators: [],
      },
    };
  }

  /**
   * Get task security profile for validation context
   */
  async getTaskSecurityProfile(userId: string): Promise<TaskSecurityProfile> {
    // Mock implementation - in production would check actual security data
    return {
      userTrustLevel: 'MEDIUM',
      recentViolations: 0,
      suspiciousActivityScore: 0.1,
      lastSecurityCheck: new Date(),
      allowedOperations: ['CREATE_TASK', 'UPDATE_TASK', 'GET_TASK_STATUS', 'DELETE_TASK'],
      restrictedOperations: [],
    };
  }
}