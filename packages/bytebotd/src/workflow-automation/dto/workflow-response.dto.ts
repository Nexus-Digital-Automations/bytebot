import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { WorkflowStepType, WorkflowExecutionMode } from './workflow.dto';/*** Step execution status
 */
export enum StepExecutionStatus {
  PENDING = 'pending',IN_PROGRESS = 'in_progress',COMPLETED = 'completed',FAILED = 'failed',SKIPPED = 'skipped',CANCELLED = 'cancelled'}/**
 * Workflow execution status
 */
export enum WorkflowExecutionStatus {
  PENDING = 'pending',RUNNING = 'running',COMPLETED = 'completed',FAILED = 'failed',CANCELLED = 'cancelled',PAUSED = 'paused'}/**
 * Step execution result
 */
export class StepExecutionResultDto {
  @ApiProperty({
    description: 'Step identifier',example: 'step_1_login'})stepId: string;

  @ApiProperty({
    description: 'Step name',example: 'Login to Application'})stepName: string;

  @ApiProperty({
    description: 'Step type',enum: WorkflowStepType,example: WorkflowStepType.FORM_AUTOMATION
  })
  stepType: WorkflowStepType;

  @ApiProperty({
    description: 'Step execution status',enum: StepExecutionStatus,example: StepExecutionStatus.COMPLETED
  })
  status: StepExecutionStatus;

  @ApiProperty({
    description: 'Step start time',example: '2024-01-15T10:30:00.000Z'})startTime: string;

  @ApiPropertyOptional({
    description: 'Step completion time',example: '2024-01-15T10:30:05.250Z'})endTime?: string;

  @ApiProperty({
    description: 'Step execution duration in milliseconds',example: 5250})
  durationMs: number;

  @ApiPropertyOptional({
    description: 'Step execution result data',example: {success: true,
      formFieldsFilled: 2,
      validationPassed: true
    }
  })
  result?: {
    success: boolean;
    data?: Record<string, unknown>;
    message?: string;
    details?: Record<string, unknown>;
  };

  @ApiPropertyOptional({
    description: 'Output variables extracted from step',example: {loginSuccess: true,
      userProfile: { name: 'John Doe', email: 'john@example.com' }}})
  outputVariables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Error message if step failed',example: 'Login form not found on page'})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',example: {errorType: 'ElementNotFoundError',errorCode: 'ELEMENT_NOT_FOUND',stackTrace: 'Error: Element not found...'}})
  errorDetails?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  @ApiPropertyOptional({
    description: 'Number of retry attempts made',example: 1})
  retryCount?: number;

  @ApiPropertyOptional({
    description: 'Screenshot before step execution',example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='})screenshotBefore?: string;

  @ApiPropertyOptional({
    description: 'Screenshot after step execution',example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='})screenshotAfter?: string;

  @ApiPropertyOptional({
    description: 'Execution logs for this step',example: ['Step started', 'Form found', 'Fields filled successfully', 'Step completed']})logs?: string[];

  @ApiPropertyOptional({
    description: 'Performance metrics for this step',example: {memoryUsage: '45.2MB',cpuUsage: '15%',networkRequests: 3}
  })
  metrics?: Record<string, any>;
}

/**
 * Loop execution information
 */
export class LoopExecutionInfoDto {
  @ApiProperty({
    description: 'Current iteration number',example: 3})
  currentIteration: number;

  @ApiProperty({
    description: 'Total iterations completed',example: 5})
  totalIterations: number;

  @ApiPropertyOptional({
    description: 'Maximum iterations allowed',example: 10})
  maxIterations?: number;

  @ApiPropertyOptional({
    description: 'Current iteration data',example: { item: 'Product A', index: 2 }})currentIterationData?: {
    item: unknown;
    index: number;
    total?: number;
  };

  @ApiProperty({
    description: 'Whether loop is still active',example: true})
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Loop completion reason',example: 'condition_met'})completionReason?: string;
}

/**
 * Workflow execution progress
 */
export class WorkflowExecutionProgressDto {
  @ApiProperty({
    description: 'Total number of steps in workflow',example: 8})
  totalSteps: number;

  @ApiProperty({
    description: 'Number of completed steps',example: 5})
  completedSteps: number;

  @ApiProperty({
    description: 'Number of failed steps',example: 1})
  failedSteps: number;

  @ApiProperty({
    description: 'Number of skipped steps',example: 0})
  skippedSteps: number;

  @ApiProperty({
    description: 'Progress percentage',example: 62.5})
  progressPercentage: number;

  @ApiPropertyOptional({
    description: 'Currently executing step',example: 'step_6_data_processing'})currentStep?: string;

  @ApiPropertyOptional({
    description: 'Estimated time remaining in milliseconds',example: 45000})
  estimatedTimeRemainingMs?: number;

  @ApiPropertyOptional({
    description: 'Active loops information',type: [LoopExecutionInfoDto]})
  activeLoops?: LoopExecutionInfoDto[];
}

/**
 * Workflow execution statistics
 */
export class WorkflowExecutionStatsDto {
  @ApiProperty({
    description: 'Total execution time in milliseconds',example: 125000})
  totalExecutionTimeMs: number;

  @ApiProperty({
    description: 'Average step execution time in milliseconds',example: 15625})
  averageStepTimeMs: number;

  @ApiProperty({
    description: 'Fastest step execution time in milliseconds',example: 1200})
  fastestStepTimeMs: number;

  @ApiProperty({
    description: 'Slowest step execution time in milliseconds',example: 45000})
  slowestStepTimeMs: number;

  @ApiProperty({
    description: 'Total data processed (bytes)',example: 2048576})
  totalDataProcessed: number;

  @ApiProperty({
    description: 'Total screenshots captured',example: 16})
  screenshotsCaptured: number;

  @ApiProperty({
    description: 'Total errors encountered',example: 2})
  totalErrors: number;

  @ApiProperty({
    description: 'Total retries attempted',example: 3})
  totalRetries: number;

  @ApiPropertyOptional({
    description: 'Performance metrics',example: {averageMemoryUsage: '128MB',peakMemoryUsage: '256MB',averageCpuUsage: '25%',totalNetworkRequests: 45}
  })
  performanceMetrics?: Record<string, any>;
}

/**
 * Workflow execution result
 */
export class WorkflowExecutionResponseDto {
  @ApiProperty({
    description: 'Workflow execution ID',example: 'exec_1704454800_abc123'})executionId: string;

  @ApiProperty({
    description: 'Workflow ID',example: 'workflow_data_collection'})workflowId: string;

  @ApiProperty({
    description: 'Workflow name',example: 'E-commerce Data Collection Workflow'})workflowName: string;

  @ApiProperty({
    description: 'Workflow execution status',enum: WorkflowExecutionStatus,example: WorkflowExecutionStatus.COMPLETED
  })
  status: WorkflowExecutionStatus;

  @ApiProperty({
    description: 'Execution start time',example: '2024-01-15T10:00:00.000Z'})startTime: string;

  @ApiPropertyOptional({
    description: 'Execution completion time',example: '2024-01-15T10:02:05.000Z'})endTime?: string;

  @ApiProperty({
    description: 'Total execution duration in milliseconds',example: 125000})
  durationMs: number;

  @ApiProperty({
    description: 'Execution progress information',type: WorkflowExecutionProgressDto})
  progress: WorkflowExecutionProgressDto;

  @ApiProperty({
    description: 'Individual step execution results',type: [StepExecutionResultDto]})
  stepResults: StepExecutionResultDto[];

  @ApiProperty({
    description: 'Execution statistics',type: WorkflowExecutionStatsDto})
  statistics: WorkflowExecutionStatsDto;

  @ApiPropertyOptional({
    description: 'Final workflow output data',example: {extractedProducts: 156,
      processedData: 'data/products_2024-01-15.json',summaryReport: 'reports/summary_2024-01-15.html'}})
  outputData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Final workflow variables state',example: {totalItemsProcessed: 156,
      lastProcessedUrl: 'https://example.com/page/8',processingErrors: 2}
  })
  finalVariables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Global error message if workflow failed',example: 'Workflow failed due to network connectivity issues'})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',example: {errorType: 'NetworkError',failedStep: 'step_3_navigate',errorCode: 'NETWORK_TIMEOUT'}})
  errorDetails?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  @ApiPropertyOptional({
    description: 'Workflow execution warnings',example: ['Step timeout increased automatically', 'Rate limiting detected on target site']})warnings?: string[];

  @ApiPropertyOptional({
    description: 'Execution configuration used',example: {executionMode: 'sequential',captureScreenshots: true,debugMode: false
    }
  })
  executionConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Runtime metadata',example: {executedBy: 'user@example.com',executorAgent: 'agent_123',environment: 'production',triggerSource: 'manual'}})
  executionMetadata?: Record<string, any>;
}

/**
 * Workflow validation result
 */
export class WorkflowValidationResultDto {
  @ApiProperty({
    description: 'Whether workflow is valid',example: true})
  isValid: boolean;

  @ApiPropertyOptional({
    description: 'Validation errors',example: ['Step step_2 references undefined variable: userData']})errors?: string[];

  @ApiPropertyOptional({
    description: 'Validation warnings',example: ['Step step_5 has no error handling configured']})warnings?: string[];

  @ApiProperty({
    description: 'Validation statistics',example: {totalSteps: 8,
      stepsWithErrorHandling: 6,
      stepsWithTimeouts: 8,
      conditionalSteps: 2,
      loopSteps: 1
    }
  })
  validationStats: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dependency graph validation',example: {hasCircularDependencies: false,
      unreachableSteps: [],
      dependencyChains: ['step_1 -> step_2 -> step_3']}})
  dependencyValidation?: {
    satisfied: boolean;
    missing?: string[];
    conflicts?: string[];
  };

  @ApiPropertyOptional({
    description: 'Performance recommendations',example: ['Consider adding parallel execution for steps 4-6','Step 3 timeout may be too short for complex forms']})
  recommendations?: string[];
}

/**
 * Workflow execution list response
 */
export class WorkflowExecutionListDto {
  @ApiProperty({
    description: 'List of workflow executions',type: [WorkflowExecutionResponseDto]})
  executions: WorkflowExecutionResponseDto[];

  @ApiProperty({
    description: 'Total number of executions',example: 125})
  totalCount: number;

  @ApiProperty({
    description: 'Current page number',example: 1})
  page: number;

  @ApiProperty({
    description: 'Number of items per page',example: 20})
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',example: 7})
  totalPages: number;

  @ApiPropertyOptional({
    description: 'Execution summary statistics',
    example: {
      successRate: 92.8,
      averageExecutionTime: 95000,
      totalExecutions: 125,
      failedExecutions: 9
    }
  })
  summaryStats?: Record<string, any>;
}