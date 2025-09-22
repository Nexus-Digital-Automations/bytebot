import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { FormAutomationService } from '../form-automation/form-automation.service';
import { DataExtractionService } from '../data-extraction/data-extraction.service';
import { ComputerUseService } from '../computer-use/computer-use.service';
import {
  WorkflowDto,
  WorkflowExecutionDto,
  WorkflowStepDto,
  WorkflowStepType,
  ConditionalLogicDto,
  ConditionalOperator,
  LoopConfigDto,
  LoopType,
  WorkflowExecutionMode,
} from './dto/workflow.dto';
import {
  WorkflowExecutionResponseDto,
  WorkflowValidationResultDto,
  StepExecutionResultDto,
  StepExecutionStatus,
  WorkflowExecutionStatus,
  WorkflowExecutionProgressDto,
  WorkflowExecutionStatsDto,
  LoopExecutionInfoDto,
} from './dto/workflow-response.dto';

interface WorkflowExecutionContext {
  executionId: string;
  workflow: WorkflowDto;
  variables: Record<string, unknown>;
  stepResults: Map<string, StepExecutionResultDto>;
  statistics: WorkflowExecutionStatsDto;
  startTime: number;
  status: WorkflowExecutionStatus;
  progress: WorkflowExecutionProgressDto;
}

/**
 * Workflow Automation Service
 *
 * Provides comprehensive workflow automation capabilities including:
 * - Multi-step workflow orchestration
 * - Conditional logic and branching
 * - Loop execution with various types
 * - Error handling and recovery
 * - Data transformation between steps
 * - Parallel and sequential execution modes
 * - Variable management and templating
 * - Screenshot capture and debugging
 */
@Injectable()
export class WorkflowAutomationService {
  private readonly logger = new Logger(WorkflowAutomationService.name);
  private readonly activeExecutions = new Map<string, any>();

  constructor(
    private readonly formAutomationService: FormAutomationService,
    private readonly dataExtractionService: DataExtractionService,
    private readonly computerUseService: ComputerUseService,
  ) {}

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    execution: WorkflowExecutionDto,
  ): Promise<WorkflowExecutionResponseDto> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    this.logger.log(
      `[${executionId}] Starting workflow execution: ${execution.workflow.name}`,
      {
        executionId,
        workflowId: execution.workflow.id,
        workflowName: execution.workflow.name,
        stepCount: execution.workflow.steps.length,
        executionMode:
          execution.workflow.config?.executionMode ||
          WorkflowExecutionMode.SEQUENTIAL,
      },
    );

    try {
      // Validate workflow before execution
      const validation = await this.validateWorkflow(execution.workflow);
      if (!validation.isValid) {
        throw new Error(
          `Workflow validation failed: ${validation.errors?.join(', ')}`,
        );
      }

      // Initialize execution context
      const executionContext: WorkflowExecutionContext =
        this.initializeExecutionContext(execution, executionId);
      this.activeExecutions.set(executionId, executionContext);

      // Execute workflow based on execution mode
      const result: {
        status: WorkflowExecutionStatus;
        progress: WorkflowExecutionProgressDto;
        stepResults: StepExecutionResultDto[];
        statistics: WorkflowExecutionStatsDto;
        outputData: Record<string, unknown>;
        errorMessage?: string;
        errorDetails?: {
          code: string;
          message: string;
          details?: Record<string, unknown>;
        };
        warnings?: string[];
      } = await this.executeWorkflowSteps(executionContext);

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // Build final response
      const response: WorkflowExecutionResponseDto = {
        executionId,
        workflowId: execution.workflow.id,
        workflowName: execution.workflow.name,
        status: result.status,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMs,
        progress: result.progress,
        stepResults: result.stepResults,
        statistics: result.statistics,
        outputData: result.outputData,
        finalVariables: executionContext.variables,
        errorMessage: result.errorMessage,
        errorDetails: result.errorDetails,
        warnings: result.warnings,
        executionConfig: execution.workflow.config,
        executionMetadata: execution.executionMetadata,
      };

      this.activeExecutions.delete(executionId);

      this.logger.log(
        `[${executionId}] Workflow execution completed: ${result.status} (${durationMs}ms)`,
        {
          executionId,
          status: result.status,
          durationMs,
          completedSteps: result.progress.completedSteps,
          failedSteps: result.progress.failedSteps,
        },
      );

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `[${executionId}] Workflow execution failed (${durationMs}ms)`,
        error,
      );
      this.activeExecutions.delete(executionId);
      throw new HttpException(
        `Workflow execution failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate workflow structure and dependencies
   */
  async validateWorkflow(
    workflow: WorkflowDto,
  ): Promise<WorkflowValidationResultDto> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validationStats: Record<string, any> = {
      totalSteps: workflow.steps.length,
      stepsWithErrorHandling: 0,
      stepsWithTimeouts: 0,
      conditionalSteps: 0,
      loopSteps: 0,
    };

    // Validate step structure
    const stepIds = new Set<string>();
    for (const step of workflow.steps) {
      // Check for duplicate step IDs
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);

      // Validate step configuration
      if (!step.config || Object.keys(step.config).length === 0) {
        errors.push(`Step ${step.id} has empty configuration`);
      } // Count configuration types
      if (step.errorHandling) validationStats.stepsWithErrorHandling++;
      if (step.timeout) validationStats.stepsWithTimeouts++;
      if (step.condition) validationStats.conditionalSteps++;
      if (step.loop) validationStats.loopSteps++;

      // Validate dependencies
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (
            !stepIds.has(depId) &&
            !workflow.steps.find((s) => s.id === depId)
          ) {
            errors.push(
              `Step ${step.id} references undefined dependency: ${depId}`,
            );
          }
        }
      }

      // Validate step-specific configurations
      await this.validateStepConfiguration(step, errors, warnings);
    }

    // Validate dependency cycles
    const dependencyValidation = this.validateDependencies(workflow.steps);
    if (dependencyValidation.hasCircularDependencies) {
      errors.push('Circular dependencies detected in workflow');
    } // Generate recommendations
    const recommendations = this.generateRecommendations(
      workflow,
      validationStats,
    );

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      validationStats,
      dependencyValidation,
      recommendations,
    };
  }

  /**
   * Get workflow execution status
   */
  getExecutionStatus(
    executionId: string,
  ): Partial<WorkflowExecutionResponseDto> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      throw new HttpException('Execution not found', HttpStatus.NOT_FOUND);
    }

    return {
      executionId,
      status: execution.status as WorkflowExecutionStatus,
      progress: execution.progress as WorkflowExecutionProgressDto,
      stepResults: Array.from(execution.stepResults.values()).filter(
        (r: StepExecutionResultDto) => r.status !== StepExecutionStatus.PENDING,
      ),
    };
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(
    executionId: string,
  ): Promise<{ cancelled: boolean; message: string }> {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return {
        cancelled: false,
        message: 'Execution not found or already completed',
      };
    }

    execution.status = WorkflowExecutionStatus.CANCELLED;
    execution.cancelled = true;

    this.logger.log(`[${executionId}] Workflow execution cancelled`);

    return {
      cancelled: true,
      message: 'Workflow execution cancelled successfully',
    };
  }

  // Private helper methods

  private initializeExecutionContext(
    execution: WorkflowExecutionDto,
    executionId: string,
  ): any {
    return {
      executionId,
      workflow: execution.workflow,
      status: WorkflowExecutionStatus.RUNNING,
      variables: {
        ...execution.workflow.variables,
        ...execution.runtimeVariables,
      },
      stepResults: [],
      currentStepIndex: 0,
      activeLoops: [],
      screenshots: [],
      logs: [],
      startTime: Date.now(),
      cancelled: false,
      debugMode: execution.debugMode || false,
      progress: {
        totalSteps: execution.workflow.steps.length,
        completedSteps: 0,
        failedSteps: 0,
        skippedSteps: 0,
        progressPercentage: 0,
      },
    };
  }

  private async executeWorkflowSteps(context: any): Promise<any> {
    const { workflow, variables } = context;
    const mode =
      workflow.config?.executionMode || WorkflowExecutionMode.SEQUENTIAL;

    try {
      switch (mode) {
        case WorkflowExecutionMode.SEQUENTIAL:
          return await this.executeSequential(context);
        case WorkflowExecutionMode.PARALLEL:
          return await this.executeParallel(context);
        case WorkflowExecutionMode.CONDITIONAL_PARALLEL:
          return await this.executeConditionalParallel(context);
        default:
          throw new Error(`Unsupported execution mode: ${mode}`);
      }
    } catch (error) {
      context.status = WorkflowExecutionStatus.FAILED;
      return {
        status: WorkflowExecutionStatus.FAILED,
        progress: context.progress,
        stepResults: context.stepResults,
        statistics: this.calculateStatistics(context),
        errorMessage: error.message,
        errorDetails: { errorType: error.constructor.name },
      };
    }
  }

  private async executeSequential(context: any): Promise<any> {
    const { workflow } = context;

    for (let i = 0; i < workflow.steps.length && !context.cancelled; i++) {
      const step = workflow.steps[i];
      context.currentStepIndex = i;

      // Check step dependencies
      if (!this.areDependenciesMet(step, context.stepResults)) {
        this.skipStep(step, context, 'Dependencies not met');
        continue;
      }

      // Evaluate step condition
      if (
        step.condition &&
        !this.evaluateCondition(step.condition, context.variables)
      ) {
        this.skipStep(step, context, 'Condition not met');
        continue;
      }

      // Execute step (with loop if configured)
      await this.executeStep(step, context);

      // Update progress
      this.updateProgress(context);
    }

    const finalStatus = context.cancelled
      ? WorkflowExecutionStatus.CANCELLED
      : context.progress.failedSteps > 0
        ? WorkflowExecutionStatus.FAILED
        : WorkflowExecutionStatus.COMPLETED;

    return {
      status: finalStatus,
      progress: context.progress,
      stepResults: context.stepResults,
      statistics: this.calculateStatistics(context),
      outputData: this.extractOutputData(context),
      warnings: context.warnings || [],
    };
  }

  private async executeParallel(context: any): Promise<any> {
    const { workflow } = context;
    const maxConcurrent = workflow.config?.maxConcurrentSteps || 3;

    // Group steps by dependency levels
    const stepGroups = this.groupStepsByDependencies(workflow.steps);

    for (const group of stepGroups) {
      if (context.cancelled) break;

      // Execute steps in current group in parallel
      const promises = group.map((step) =>
        this.executeStepWithErrorHandling(step, context),
      );
      await Promise.all(promises);

      this.updateProgress(context);
    }

    const finalStatus = context.cancelled
      ? WorkflowExecutionStatus.CANCELLED
      : context.progress.failedSteps > 0
        ? WorkflowExecutionStatus.FAILED
        : WorkflowExecutionStatus.COMPLETED;

    return {
      status: finalStatus,
      progress: context.progress,
      stepResults: context.stepResults,
      statistics: this.calculateStatistics(context),
      outputData: this.extractOutputData(context),
    };
  }

  private async executeConditionalParallel(context: any): Promise<any> {
    // Implementation for conditional parallel execution
    // This would evaluate conditions and execute eligible steps in parallel
    return this.executeSequential(context); // Fallback for now
  }

  private async executeStep(
    step: WorkflowStepDto,
    context: any,
  ): Promise<void> {
    const stepStartTime = Date.now();
    const stepResult: StepExecutionResultDto = {
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      status: StepExecutionStatus.IN_PROGRESS,
      startTime: new Date(stepStartTime).toISOString(),
      durationMs: 0,
      logs: [],
    };

    context.stepResults.push(stepResult);

    try {
      // Capture screenshot before step if configured
      if (
        step.captureScreenshots ||
        context.workflow.config?.captureScreenshots
      ) {
        stepResult.screenshotBefore = await this.captureScreenshot();
      }

      // Execute step with loop if configured
      if (step.loop) {
        await this.executeStepWithLoop(step, context, stepResult);
      } else {
        await this.executeStepAction(step, context, stepResult);
      }

      // Extract output variables
      if (step.outputVariables && stepResult.result) {
        stepResult.outputVariables = this.extractOutputVariables(
          step.outputVariables,
          stepResult.result,
        );
        Object.assign(context.variables, stepResult.outputVariables);
      }

      // Apply data transformation if configured
      if (step.dataTransformation) {
        await this.applyDataTransformation(step.dataTransformation, context);
      }

      // Capture screenshot after step if configured
      if (
        step.captureScreenshots ||
        context.workflow.config?.captureScreenshots
      ) {
        stepResult.screenshotAfter = await this.captureScreenshot();
      }

      stepResult.status = StepExecutionStatus.COMPLETED;
      stepResult.endTime = new Date().toISOString();
      stepResult.durationMs = Date.now() - stepStartTime;
    } catch (error) {
      stepResult.status = StepExecutionStatus.FAILED;
      stepResult.errorMessage = error.message;
      stepResult.errorDetails = {
        errorType: error.constructor.name,
        stackTrace: error.stack,
      };
      stepResult.endTime = new Date().toISOString();
      stepResult.durationMs = Date.now() - stepStartTime;

      // Handle error based on configuration
      await this.handleStepError(step, context, stepResult, error);
    }
  }

  private async executeStepWithLoop(
    step: WorkflowStepDto,
    context: any,
    stepResult: StepExecutionResultDto,
  ): Promise<void> {
    if (!step.loop) {
      throw new Error('Loop configuration is required for loop step');
    }
    const loop = step.loop;
    const loopInfo: LoopExecutionInfoDto = {
      currentIteration: 0,
      totalIterations: 0,
      maxIterations: loop.maxIterations || 50,
      isActive: true,
    };

    context.activeLoops.push(loopInfo);

    try {
      switch (loop.type) {
        case LoopType.FOR_EACH:
          await this.executeForEachLoop(
            step,
            context,
            stepResult,
            loop,
            loopInfo,
          );
          break;
        case LoopType.WHILE:
          await this.executeWhileLoop(
            step,
            context,
            stepResult,
            loop,
            loopInfo,
          );
          break;
        case LoopType.UNTIL:
          await this.executeUntilLoop(
            step,
            context,
            stepResult,
            loop,
            loopInfo,
          );
          break;
        case LoopType.FIXED_COUNT:
          await this.executeFixedCountLoop(
            step,
            context,
            stepResult,
            loop,
            loopInfo,
          );
          break;
      }
    } finally {
      loopInfo.isActive = false;
      context.activeLoops = context.activeLoops.filter(
        (l: any) => l !== loopInfo,
      );
    }
  }

  private async executeStepAction(
    step: WorkflowStepDto,
    context: any,
    stepResult: StepExecutionResultDto,
  ): Promise<void> {
    const interpolatedConfig = this.interpolateVariables(
      step.config,
      context.variables,
    );

    switch (step.type) {
      case WorkflowStepType.FORM_AUTOMATION:
        stepResult.result =
          await this.formAutomationService.executeFormAction(
            interpolatedConfig,
          );
        break;
      case WorkflowStepType.DATA_EXTRACTION:
        stepResult.result =
          await this.dataExtractionService.extractData(interpolatedConfig);
        break;
      case WorkflowStepType.COMPUTER_ACTION:
        stepResult.result =
          await this.computerUseService.action(interpolatedConfig);
        break;
      case WorkflowStepType.NAVIGATION:
        stepResult.result = await this.executeNavigation(interpolatedConfig);
        break;
      case WorkflowStepType.WAIT:
        stepResult.result = await this.executeWait(interpolatedConfig);
        break;
      case WorkflowStepType.SCREENSHOT:
        stepResult.result = { screenshot: await this.captureScreenshot() };
        break;
      case WorkflowStepType.NOTIFICATION:
        stepResult.result = await this.executeNotification(interpolatedConfig);
        break;
      case WorkflowStepType.API_CALL:
        stepResult.result = await this.executeApiCall(interpolatedConfig);
        break;
      case WorkflowStepType.FILE_OPERATION:
        stepResult.result = await this.executeFileOperation(interpolatedConfig);
        break;
      case WorkflowStepType.CUSTOM_SCRIPT:
        stepResult.result = await this.executeCustomScript(
          interpolatedConfig,
          context.variables,
        );
        break;
      default:
        throw new Error(`Unsupported step type: ${step.type}`);
    }
  }

  // Loop execution methods

  private async executeForEachLoop(
    step: WorkflowStepDto,
    context: any,
    stepResult: StepExecutionResultDto,
    loop: LoopConfigDto,
    loopInfo: LoopExecutionInfoDto,
  ): Promise<void> {
    if (!loop.iterateOver) {
      throw new Error('iterateOver is required for forEach loop');
    }
    const iterateOver = this.getVariableValue(
      loop.iterateOver,
      context.variables,
    );
    if (!Array.isArray(iterateOver)) {
      throw new Error(
        `Loop iterate value is not an array: ${loop.iterateOver}`,
      );
    }

    const maxIterations = loopInfo.maxIterations || 50;
    for (let i = 0; i < iterateOver.length && i < maxIterations; i++) {
      const item = iterateOver[i];

      // Set loop variables
      context.variables[loop.iteratorVariable || 'item'] = item;
      context.variables[loop.indexVariable || 'index'] = i;
      loopInfo.currentIteration = i + 1;
      loopInfo.currentIterationData = { item, index: i };

      await this.executeStepAction(step, context, stepResult);

      loopInfo.totalIterations++;
    }
  }

  private async executeWhileLoop(
    step: WorkflowStepDto,
    context: any,
    stepResult: StepExecutionResultDto,
    loop: LoopConfigDto,
    loopInfo: LoopExecutionInfoDto,
  ): Promise<void> {
    if (!loop.condition) {
      throw new Error('Condition is required for while loop');
    }
    const maxIterations = loopInfo.maxIterations || 50;
    while (
      this.evaluateCondition(loop.condition, context.variables) &&
      loopInfo.totalIterations < maxIterations
    ) {
      loopInfo.currentIteration = loopInfo.totalIterations + 1;

      await this.executeStepAction(step, context, stepResult);

      loopInfo.totalIterations++;
    }
  }

  private async executeUntilLoop(
    step: WorkflowStepDto,
    context: any,
    stepResult: StepExecutionResultDto,
    loop: LoopConfigDto,
    loopInfo: LoopExecutionInfoDto,
  ): Promise<void> {
    if (!loop.condition) {
      throw new Error('Condition is required for until loop');
    }
    const maxIterations = loopInfo.maxIterations || 50;
    while (
      !this.evaluateCondition(loop.condition, context.variables) &&
      loopInfo.totalIterations < maxIterations
    ) {
      loopInfo.currentIteration = loopInfo.totalIterations + 1;

      await this.executeStepAction(step, context, stepResult);

      loopInfo.totalIterations++;
    }
  }

  private async executeFixedCountLoop(
    step: WorkflowStepDto,
    context: any,
    stepResult: StepExecutionResultDto,
    loop: LoopConfigDto,
    loopInfo: LoopExecutionInfoDto,
  ): Promise<void> {
    const maxIterations = loopInfo.maxIterations || 50;
    const count = Math.min(loop.count || 1, maxIterations);

    for (let i = 0; i < count; i++) {
      context.variables[loop.indexVariable || 'index'] = i;
      loopInfo.currentIteration = i + 1;
      loopInfo.currentIterationData = { index: i };

      await this.executeStepAction(step, context, stepResult);

      loopInfo.totalIterations++;
    }
  }

  // Utility methods

  private evaluateCondition(
    condition: ConditionalLogicDto,
    variables: Record<string, any>,
  ): boolean {
    const value = this.getVariableValue(condition.variable, variables);

    let result = false;

    switch (condition.operator) {
      case ConditionalOperator.EQUALS:
        result = value === condition.value;
        break;
      case ConditionalOperator.NOT_EQUALS:
        result = value !== condition.value;
        break;
      case ConditionalOperator.CONTAINS:
        result = String(value).includes(String(condition.value));
        break;
      case ConditionalOperator.NOT_CONTAINS:
        result = !String(value).includes(String(condition.value));
        break;
      case ConditionalOperator.GREATER_THAN:
        result = Number(value) > Number(condition.value);
        break;
      case ConditionalOperator.LESS_THAN:
        result = Number(value) < Number(condition.value);
        break;
      case ConditionalOperator.EXISTS:
        result = value !== undefined && value !== null;
        break;
      case ConditionalOperator.NOT_EXISTS:
        result = value === undefined || value === null;
        break;
      case ConditionalOperator.IS_EMPTY:
        result =
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          (typeof value === 'string' && value.trim() === '');
        break;
      case ConditionalOperator.IS_NOT_EMPTY:
        result =
          !!value &&
          !(Array.isArray(value) && value.length === 0) &&
          !(typeof value === 'string' && value.trim() === '');
        break;
      case ConditionalOperator.MATCHES_REGEX:
        result = new RegExp(String(condition.value)).test(String(value));
        break;
    }

    // Handle AND/OR logic
    if (condition.and) {
      result =
        result &&
        condition.and.every((cond) => this.evaluateCondition(cond, variables));
    }

    if (condition.or) {
      result =
        result ||
        condition.or.some((cond) => this.evaluateCondition(cond, variables));
    }

    return result;
  }

  private getVariableValue(path: string, variables: Record<string, any>): any {
    const keys = path.split('.');
    let value = variables;
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private interpolateVariables(
    config: any,
    variables: Record<string, any>,
  ): any {
    const configStr = JSON.stringify(config);
    const interpolated = configStr.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const value = this.getVariableValue(path, variables);
      return value !== undefined ? JSON.stringify(value) : match;
    });

    return JSON.parse(interpolated);
  }

  private async captureScreenshot(): Promise<string> {
    try {
      const result = await this.computerUseService.action({
        action: 'screenshot',
      });
      return (result as any)?.image || '';
    } catch (error) {
      this.logger.warn('Failed to capture screenshot', error);
      return '';
    }
  }

  private areDependenciesMet(
    step: WorkflowStepDto,
    stepResults: StepExecutionResultDto[],
  ): boolean {
    if (!step.dependencies || step.dependencies.length === 0) return true;

    return step.dependencies.every((depId) =>
      stepResults.some(
        (result) =>
          result.stepId === depId &&
          result.status === StepExecutionStatus.COMPLETED,
      ),
    );
  }

  private skipStep(step: WorkflowStepDto, context: any, reason: string): void {
    const stepResult: StepExecutionResultDto = {
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      status: StepExecutionStatus.SKIPPED,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      durationMs: 0,
      errorMessage: reason,
    };

    context.stepResults.push(stepResult);
    context.progress.skippedSteps++;
  }

  private updateProgress(context: any): void {
    const progress = context.progress;
    const completedCount = context.stepResults.filter(
      (r: any) => r.status === StepExecutionStatus.COMPLETED,
    ).length;
    const failedCount = context.stepResults.filter(
      (r: any) => r.status === StepExecutionStatus.FAILED,
    ).length;

    progress.completedSteps = completedCount;
    progress.failedSteps = failedCount;
    progress.progressPercentage = (completedCount / progress.totalSteps) * 100;
  }

  private calculateStatistics(context: any): WorkflowExecutionStatsDto {
    const stepResults = context.stepResults;
    const completedSteps = stepResults.filter(
      (r: any) => r.status === StepExecutionStatus.COMPLETED,
    );

    const totalTime = Date.now() - context.startTime;
    const stepTimes = completedSteps.map((r: any) => r.durationMs);

    return {
      totalExecutionTimeMs: totalTime,
      averageStepTimeMs:
        stepTimes.length > 0
          ? stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length
          : 0,
      fastestStepTimeMs: stepTimes.length > 0 ? Math.min(...stepTimes) : 0,
      slowestStepTimeMs: stepTimes.length > 0 ? Math.max(...stepTimes) : 0,
      totalDataProcessed: 0,
      screenshotsCaptured: context.screenshots?.length || 0,
      totalErrors: stepResults.filter(
        (r: any) => r.status === StepExecutionStatus.FAILED,
      ).length,
      totalRetries: stepResults.reduce(
        (sum: number, r: any) => sum + (r.retryCount || 0),
        0,
      ),
    };
  }

  private extractOutputData(context: any): any {
    // Extract final output data from workflow execution
    const outputData: any = {};

    for (const result of context.stepResults) {
      if (result.result && result.status === StepExecutionStatus.COMPLETED) {
        outputData[result.stepId] = result.result;
      }
    }

    return outputData;
  }

  private extractOutputVariables(
    mapping: Record<string, string>,
    result: any,
  ): Record<string, any> {
    const output: Record<string, any> = {};

    for (const [varName, path] of Object.entries(mapping)) {
      output[varName] = this.getVariableValue(path, { result });
    }

    return output;
  }

  // Placeholder implementations for specific step types

  private executeNavigation(config: { url: string }): {
    navigated: boolean;
    url: string;
  } {
    this.logger.log('Executing navigation step', config);
    return { navigated: true, url: config.url };
  }

  private async executeWait(config: {
    duration?: number;
  }): Promise<{ waited: number }> {
    const duration = config.duration || 1000;
    await new Promise((resolve) => setTimeout(resolve, duration));
    return { waited: duration };
  }

  private executeNotification(config: { message: string }): {
    notificationSent: boolean;
    message: string;
  } {
    this.logger.log('Sending notification', config);
    return { notificationSent: true, message: config.message };
  }

  private executeApiCall(config: { url: string }): {
    apiCallMade: boolean;
    endpoint: string;
  } {
    this.logger.log('Making API call', config);
    return { apiCallMade: true, endpoint: config.url };
  }

  private executeFileOperation(config: { operation: string }): {
    fileOperationCompleted: boolean;
    operation: string;
  } {
    this.logger.log('Executing file operation', config);
    return { fileOperationCompleted: true, operation: config.operation };
  }

  private executeCustomScript(
    config: Record<string, unknown>,
    variables: Record<string, unknown>,
  ): { scriptExecuted: boolean; variables: Record<string, unknown> } {
    this.logger.log('Executing custom script', config);
    return { scriptExecuted: true, variables };
  }

  private handleStepError(
    step: WorkflowStepDto,
    context: WorkflowExecutionContext,
    stepResult: StepExecutionResultDto,
    error: Error,
  ): void {
    // Implement retry logic, fallback steps, etc.
    this.logger.error(`Step ${step.id} failed: ${error.message}`);
  }

  private applyDataTransformation(
    transformation: Record<string, unknown>,
    context: WorkflowExecutionContext,
  ): void {
    // Implement data transformation logic
    this.logger.log('Applying data transformation', transformation);
  }

  private validateStepConfiguration(
    step: WorkflowStepDto,
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    // Validate step-specific configuration
    return Promise.resolve();
  }

  private validateDependencies(steps: WorkflowStepDto[]): {
    hasCircularDependencies: boolean;
    unreachableSteps: string[];
  } {
    // Check for circular dependencies
    return { hasCircularDependencies: false, unreachableSteps: [] };
  }

  private generateRecommendations(
    workflow: WorkflowDto,
    stats: { stepsWithErrorHandling: number; totalSteps: number },
  ): string[] {
    const recommendations: string[] = [];

    if (stats.stepsWithErrorHandling < stats.totalSteps * 0.8) {
      recommendations.push('Consider adding error handling to more steps');
    }

    return recommendations;
  }

  private groupStepsByDependencies(
    steps: WorkflowStepDto[],
  ): WorkflowStepDto[][] {
    // Group steps by dependency levels for parallel execution
    return [steps]; // Simplified implementation
  }

  private async executeStepWithErrorHandling(
    step: WorkflowStepDto,
    context: any,
  ): Promise<void> {
    try {
      await this.executeStep(step, context);
    } catch (error) {
      this.logger.error(`Parallel step ${step.id} failed`, error);
    }
  }
}
