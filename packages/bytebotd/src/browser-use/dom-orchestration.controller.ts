/**
 * DOM Orchestration Controller - Advanced Multi-Agent Form Automation
 *
 * Provides sophisticated DOM interaction and form automation endpoints that leverage
 * multi-agent orchestration for complex workflows. Integrates with the orchestration
 * layer for coordinated browser automation across multiple agents and sessions.
 *
 * Key Features:
 * - Multi-step form workflows with orchestration coordination
 * - Parallel form field validation across multiple browser agents
 * - Complex DOM interaction sequences with state synchronization
 * - Advanced selector strategies with intelligent fallbacks
 * - Form data validation and transformation pipelines
 * - Element state coordination across distributed sessions
 * - Workflow progress tracking and recovery mechanisms
 *
 * Security:
 * - JWT authentication and role-based authorization
 * - Input sanitization and XSS prevention
 * - Rate limiting with orchestration-aware throttling
 * - Comprehensive audit logging for compliance
 * - Secure session coordination protocols
 *
 * @module DOMOrchestrationController
 * @version 1.0.0
 * @author ByteBot Browser Automation Team
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  UseGuards,
  UsePipes,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';import {ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { IsUUID, IsOptional, IsEnum, IsNumber, IsString, IsBoolean, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Security and middleware
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EnterpriseRateLimitGuard } from '../common/guards/rate-limit.guard';
import { SecuritySanitizationPipes } from '../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import {
  ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';

// Core services
import { FormAutomationService } from '../form-automation/form-automation.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserTaskService } from './browser-task.service';

// Orchestration integration
import { ParlantOrchestratorService } from '../../orchestrator/src/services/parlant-orchestrator.service';
import type {
  ParlantOrchestrationRequest,
  ParlantOrchestrationResult,
  OrchestrationUserContext,
} from '../../orchestrator/src/services/parlant-orchestrator.service';import type {OrchestrationTask,
  OrchestrationPriority,
  WorkflowStep,
  WorkflowStepType,
} from '../../orchestrator/src/types/orchestrator.types';// Form automation typesimport {
  FormFieldDto,
  FormAutomationConfigDto,
  FormActionType,
  FormFieldType,
} from '../form-automation/dto/form-action.dto';
import {
  FormAutomationResponseDto,
  FormDetectionResponseDto,
  FormSubmissionResponseDto,
} from '../form-automation/dto/form-response.dto';

// ===== DOM ORCHESTRATION ENUMS =====
export enum DOMOrchestrationWorkflowType {
  MULTI_STEP_FORM = 'multi_step_form',
  PARALLEL_INTERACTIONS = 'parallel_interactions',
  FORM_VALIDATION_WORKFLOW = 'form_validation_workflow',
  ELEMENT_COORDINATION = 'element_coordination',
  CROSS_SESSION_WORKFLOW = 'cross_session_workflow',
  CONDITIONAL_FORM_FLOW = 'conditional_form_flow',
  DATA_COLLECTION_PIPELINE = 'data_collection_pipeline',
}

export enum ValidationScope {
  FIELD_LEVEL = 'field_level',
  FORM_LEVEL = 'form_level',
  CROSS_FORM = 'cross_form',
  SESSION_LEVEL = 'session_level',
  WORKFLOW_LEVEL = 'workflow_level',
}

export enum CoordinationStrategy {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  PIPELINE = 'pipeline',
  BROADCAST = 'broadcast',
  AGGREGATION = 'aggregation',
}

export enum WorkflowPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

export enum WorkflowStatus {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  EXECUTING = 'executing',
  COORDINATING = 'coordinating',
  VALIDATING = 'validating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

// ===== DTO CLASSES =====

/**
 * Workflow step for DOM orchestration
 */
export class DOMOrchestrationStepDto {
  @ApiProperty({
    description: 'Unique step identifier',example: 'step_fill_personal_info',})@IsString()
  stepId: string;

  @ApiProperty({
    description: 'Step display name',example: 'Fill Personal Information',})@IsString()
  name: string;

  @ApiProperty({
    description: 'Step description',example: 'Fill personal information fields in the registration form',})@IsString()
  description: string;

  @ApiProperty({
    description: 'Form action type for this step',enum: FormActionType,example: FormActionType.FILL_FORM,
  })
  @IsEnum(FormActionType)
  actionType: FormActionType;

  @ApiProperty({
    description: 'Browser session ID for this step',example: 'session_12345',})@IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Form selector for this step',example: '#registrationForm',})@IsOptional()
  @IsString()
  formSelector?: string;

  @ApiProperty({
    description: 'Form fields for this step',type: [FormFieldDto],})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields?: FormFieldDto[];

  @ApiProperty({
    description: 'Step dependencies (must complete before this step)',example: ['step_navigate_to_form', 'step_validate_session'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiProperty({
    description: 'Validation scope for this step',enum: ValidationScope,example: ValidationScope.FORM_LEVEL,
  })
  @IsOptional()
  @IsEnum(ValidationScope)
  validationScope?: ValidationScope;

  @ApiProperty({
    description: 'Timeout for step execution in milliseconds',example: 30000,default: 30000,
  })
  @IsOptional()
  @IsNumber()
  timeoutMs?: number;

  @ApiProperty({
    description: 'Maximum retry attempts for this step',example: 3,default: 1,
  })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiProperty({
    description: 'Conditions for step execution',example: { previousStepResult: 'success', formVisible: true },})@IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @ApiProperty({
    description: 'Step configuration',type: FormAutomationConfigDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => FormAutomationConfigDto)
  config?: FormAutomationConfigDto;
}

/**
 * Coordination configuration for multi-agent workflows
 */
export class CoordinationConfigDto {
  @ApiProperty({
    description: 'Coordination strategy',enum: CoordinationStrategy,example: CoordinationStrategy.PARALLEL,
  })
  @IsEnum(CoordinationStrategy)
  strategy: CoordinationStrategy;

  @ApiProperty({
    description: 'Maximum concurrent agents for parallel execution',example: 5,default: 3,
  })
  @IsOptional()
  @IsNumber()
  maxConcurrentAgents?: number;

  @ApiProperty({
    description: 'Timeout for coordination in milliseconds',example: 300000,default: 300000,
  })
  @IsOptional()
  @IsNumber()
  coordinationTimeoutMs?: number;

  @ApiProperty({
    description: 'Failure strategy for coordination',enum: ['fail_fast', 'continue_on_error', 'retry_failed'],example: 'retry_failed',})@IsOptional()
  @IsEnum(['fail_fast', 'continue_on_error', 'retry_failed'])failureStrategy?: 'fail_fast' | 'continue_on_error' | 'retry_failed';@ApiProperty({description: 'Whether to enable cross-session state synchronization',example: true,default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableStateSynchronization?: boolean;

  @ApiProperty({
    description: 'Result aggregation method',enum: ['merge', 'append', 'override', 'select_best'],example: 'merge',})@IsOptional()
  @IsEnum(['merge', 'append', 'override', 'select_best'])resultAggregation?: 'merge' | 'append' | 'override' | 'select_best';}/**
 * Multi-step form workflow DTO
 */
export class MultiStepFormWorkflowDto {
  @ApiProperty({
    description: 'Workflow identifier',example: 'workflow_registration_complete',})@IsString()
  workflowId: string;

  @ApiProperty({
    description: 'Workflow display name',example: 'Complete User Registration',})@IsString()
  name: string;

  @ApiProperty({
    description: 'Workflow description',example: 'Complete multi-step user registration across multiple forms',})@IsString()
  description: string;

  @ApiProperty({
    description: 'Workflow type',enum: DOMOrchestrationWorkflowType,example: DOMOrchestrationWorkflowType.MULTI_STEP_FORM,
  })
  @IsEnum(DOMOrchestrationWorkflowType)
  workflowType: DOMOrchestrationWorkflowType;

  @ApiProperty({
    description: 'Workflow priority level',enum: WorkflowPriority,example: WorkflowPriority.NORMAL,
  })
  @IsEnum(WorkflowPriority)
  priority: WorkflowPriority;

  @ApiProperty({
    description: 'Workflow steps',type: [DOMOrchestrationStepDto],})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DOMOrchestrationStepDto)
  steps: DOMOrchestrationStepDto[];

  @ApiProperty({
    description: 'Coordination configuration',type: CoordinationConfigDto,})
  @ValidateNested()
  @Type(() => CoordinationConfigDto)
  coordination: CoordinationConfigDto;

  @ApiProperty({
    description: 'Global workflow timeout in milliseconds',example: 600000,default: 600000,
  })
  @IsOptional()
  @IsNumber()
  globalTimeoutMs?: number;

  @ApiProperty({
    description: 'Workflow metadata',example: { userId: 'user123', sessionType: 'registration' },})@IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Parallel interactions workflow DTO
 */
export class ParallelInteractionsDto {
  @ApiProperty({
    description: 'Workflow identifier',example: 'parallel_form_validation',})@IsString()
  workflowId: string;

  @ApiProperty({
    description: 'Parallel interaction configurations',type: [DOMOrchestrationStepDto],})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DOMOrchestrationStepDto)
  interactions: DOMOrchestrationStepDto[];

  @ApiProperty({
    description: 'Coordination configuration',type: CoordinationConfigDto,})
  @ValidateNested()
  @Type(() => CoordinationConfigDto)
  coordination: CoordinationConfigDto;

  @ApiProperty({
    description: 'Synchronization points for parallel execution',example: ['after_validation', 'before_submission'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  synchronizationPoints?: string[];
}

/**
 * Form validation workflow DTO
 */
export class FormValidationWorkflowDto {
  @ApiProperty({
    description: 'Workflow identifier',example: 'comprehensive_form_validation',})@IsString()
  workflowId: string;

  @ApiProperty({
    description: 'Forms to validate',example: ['#registrationForm', '#paymentForm', '#confirmationForm'],})@IsArray()
  @IsString({ each: true })
  formSelectors: string[];

  @ApiProperty({
    description: 'Validation rules by form',example: {'#registrationForm': { email: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' },'#paymentForm': { cardNumber: '^[0-9]{13,19}$' },},})
  @IsOptional()
  @IsObject()
  validationRules?: Record<string, Record<string, string>>;

  @ApiProperty({
    description: 'Browser session IDs for validation',example: ['session_1', 'session_2'],})@IsArray()
  @IsString({ each: true })
  sessionIds: string[];

  @ApiProperty({
    description: 'Coordination configuration',type: CoordinationConfigDto,})
  @ValidateNested()
  @Type(() => CoordinationConfigDto)
  coordination: CoordinationConfigDto;
}

/**
 * Element coordination workflow DTO
 */
export class ElementCoordinationDto {
  @ApiProperty({
    description: 'Workflow identifier',example: 'element_state_sync',})@IsString()
  workflowId: string;

  @ApiProperty({
    description: 'Elements to coordinate',example: ['#shoppingCart', '.product-item', 'button[data-action="add-to-cart"]'],})@IsArray()
  @IsString({ each: true })
  elementSelectors: string[];

  @ApiProperty({
    description: 'Coordination actions',enum: ['sync_state', 'update_values', 'trigger_events', 'validate_consistency'],example: ['sync_state', 'validate_consistency'],})@IsArray()
  @IsEnum(['sync_state', 'update_values', 'trigger_events', 'validate_consistency'], { each: true })actions: ('sync_state' | 'update_values' | 'trigger_events' | 'validate_consistency')[];@ApiProperty({description: 'Browser session IDs for coordination',example: ['session_main', 'session_popup', 'session_iframe'],})@IsArray()
  @IsString({ each: true })
  sessionIds: string[];

  @ApiProperty({
    description: 'Coordination configuration',type: CoordinationConfigDto,})
  @ValidateNested()
  @Type(() => CoordinationConfigDto)
  coordination: CoordinationConfigDto;

  @ApiProperty({
    description: 'State synchronization interval in milliseconds',example: 5000,default: 10000,
  })
  @IsOptional()
  @IsNumber()
  syncIntervalMs?: number;
}

/**
 * Workflow progress response DTO
 */
export class WorkflowProgressDto {
  @ApiProperty({
    description: 'Workflow identifier',example: 'workflow_registration_complete',})workflowId: string;

  @ApiProperty({
    description: 'Current workflow status',enum: WorkflowStatus,example: WorkflowStatus.EXECUTING,
  })
  status: WorkflowStatus;

  @ApiProperty({
    description: 'Overall progress percentage',example: 65.5,})
  progressPercentage: number;

  @ApiProperty({
    description: 'Currently executing step',example: 'step_fill_payment_info',})currentStep?: string;

  @ApiProperty({
    description: 'Completed steps',example: ['step_navigate_to_form', 'step_fill_personal_info'],})completedSteps: string[];

  @ApiProperty({
    description: 'Failed steps with error details',example: { step_validate_email: 'Invalid email format' },})failedSteps: Record<string, string>;

  @ApiProperty({
    description: 'Step execution results',})stepResults: Record<string, unknown>;

  @ApiProperty({
    description: 'Workflow execution metrics',})metrics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    executionTimeMs: number;
    averageStepTimeMs: number;
    coordinationOverheadMs: number;
  };

  @ApiProperty({
    description: 'Workflow start time',})startedAt: Date;

  @ApiProperty({
    description: 'Last update time',})lastUpdatedAt: Date;

  @ApiProperty({
    description: 'Estimated completion time',})estimatedCompletionAt?: Date;
}

/**
 * Workflow execution result DTO
 */
export class WorkflowExecutionResultDto extends WorkflowProgressDto {
  @ApiProperty({
    description: 'Final workflow result',})result?: unknown;

  @ApiProperty({
    description: 'Workflow completion time',})completedAt?: Date;

  @ApiProperty({
    description: 'Error details if workflow failed',})error?: {
    code: string;
    message: string;
    details?: unknown;
    stack?: string;
  };

  @ApiProperty({
    description: 'Agent coordination details',})coordinationDetails: {
    agentsUsed: number;
    coordinationEvents: number;
    synchronizationPoints: number;
    crossSessionOperations: number;
  };
}

// ===== CONTROLLER IMPLEMENTATION =====

@ApiTags('DOM Orchestration')@Controller('dom-orchestration')@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')@ApiSecurity('bearer')export class DOMOrchestrationController {private readonly logger = new Logger(DOMOrchestrationController.name);

  // Active workflow tracking
  private readonly activeWorkflows = new Map<string, WorkflowProgressDto>();
  private readonly workflowResults = new Map<string, WorkflowExecutionResultDto>();

  constructor(
    private readonly formAutomationService: FormAutomationService,
    private readonly sessionService: BrowserSessionService,
    private readonly taskService: BrowserTaskService,
    private readonly orchestratorService: ParlantOrchestratorService,
  ) {
    this.logger.log('DOM Orchestration Controller initialized');}/**
   * Execute multi-step form workflow with orchestration
   *
   * Coordinates complex multi-step form workflows across multiple browser sessions
   * with intelligent step ordering, dependency resolution, and failure recovery.
   */
  @Post('multi-step-form')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Execute multi-step form workflow',description: 'Execute complex multi-step form workflows with orchestration coordination, dependency management, and cross-session state synchronization.',operationId: 'executeMultiStepFormWorkflow',})@ApiBody({
    type: MultiStepFormWorkflowDto,
    description: 'Multi-step form workflow configuration',})@ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Multi-step form workflow started successfully',type: WorkflowProgressDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid workflow configuration',})@ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Workflow execution failed to start',
  })
  async executeMultiStepFormWorkflow(
    @Body() workflowDto: MultiStepFormWorkflowDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<WorkflowProgressDto> {
    const operationId = `multi_step_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`Starting multi-step form workflow: ${workflowDto.workflowId}`, {operationId,workflowId: workflowDto.workflowId,
      stepsCount: workflowDto.steps.length,
      priority: workflowDto.priority,
      userId: user.id,
    });

    try {
      // Validate workflow configuration
      await this.validateWorkflowConfiguration(workflowDto);

      // Create workflow progress tracking
      const workflowProgress = this.createWorkflowProgress(workflowDto);
      this.activeWorkflows.set(workflowDto.workflowId, workflowProgress);

      // Convert to orchestration task
      const orchestrationTask = this.convertToOrchestrationTask(workflowDto, user);

      // Execute through orchestrator
      this.executeWorkflowAsync(workflowDto.workflowId, orchestrationTask, user)
        .catch((error: Error) => {
          this.logger.error(`Async workflow execution failed: ${workflowDto.workflowId}`, error);
          this.updateWorkflowStatus(workflowDto.workflowId, WorkflowStatus.FAILED, {
            error: {
              code: 'WORKFLOW_EXECUTION_ERROR',
              message: error.message,
              details: error,
            },
          });
        });

      return workflowProgress;

    } catch (error: unknown) {
      this.logger.error(`Failed to start multi-step form workflow: ${workflowDto.workflowId}`, error);

      throw new InternalServerErrorException({
        message: 'Failed to start multi-step form workflow',error: error instanceof Error ? error.message : String(error),operationId,
        workflowId: workflowDto.workflowId,
      });
    }
  }

  /**
   * Execute parallel DOM interactions
   *
   * Executes multiple DOM interactions in parallel across different browser sessions
   * with coordination and result aggregation.
   */
  @Post('parallel-interactions')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Execute parallel DOM interactions',description: 'Execute multiple DOM interactions in parallel with coordination and result aggregation.',operationId: 'executeParallelInteractions',})@ApiBody({
    type: ParallelInteractionsDto,
    description: 'Parallel interactions configuration',})@ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Parallel interactions started successfully',
    type: WorkflowProgressDto,
  })
  async executeParallelInteractions(
    @Body() interactionsDto: ParallelInteractionsDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<WorkflowProgressDto> {
    const operationId = `parallel_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`Starting parallel interactions: ${interactionsDto.workflowId}`, {operationId,workflowId: interactionsDto.workflowId,
      interactionsCount: interactionsDto.interactions.length,
      coordinationStrategy: interactionsDto.coordination.strategy,
      userId: user.id,
    });

    try {
      // Create workflow from parallel interactions
      const workflow: MultiStepFormWorkflowDto = {
        workflowId: interactionsDto.workflowId,
        name: `Parallel Interactions: ${interactionsDto.workflowId}`,
        description: 'Parallel DOM interactions workflow',
        workflowType: DOMOrchestrationWorkflowType.PARALLEL_INTERACTIONS,
        priority: WorkflowPriority.NORMAL,
        steps: interactionsDto.interactions,
        coordination: interactionsDto.coordination,
        globalTimeoutMs: 300000,
      };

      // Execute as multi-step workflow with parallel coordination
      return await this.executeMultiStepFormWorkflow(workflow, user);

    } catch (error: unknown) {
      this.logger.error(`Failed to start parallel interactions: ${interactionsDto.workflowId}`, error);

      throw new InternalServerErrorException({
        message: 'Failed to start parallel interactions',error: error instanceof Error ? error.message : String(error),operationId,
        workflowId: interactionsDto.workflowId,
      });
    }
  }

  /**
   * Execute form validation workflow
   *
   * Coordinates validation across multiple forms and browser sessions with
   * comprehensive error reporting and validation rule enforcement.
   */
  @Post('form-validation-workflow')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Execute form validation workflow',description: 'Execute comprehensive form validation across multiple forms and sessions with coordinated error reporting.',operationId: 'executeFormValidationWorkflow',})@ApiBody({
    type: FormValidationWorkflowDto,
    description: 'Form validation workflow configuration',})@ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Form validation workflow started successfully',
    type: WorkflowProgressDto,
  })
  async executeFormValidationWorkflow(
    @Body() validationDto: FormValidationWorkflowDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<WorkflowProgressDto> {
    const operationId = `validation_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`Starting form validation workflow: ${validationDto.workflowId}`, {operationId,workflowId: validationDto.workflowId,
      formsCount: validationDto.formSelectors.length,
      sessionsCount: validationDto.sessionIds.length,
      userId: user.id,
    });

    try {
      // Create validation steps for each form
      const validationSteps: DOMOrchestrationStepDto[] = validationDto.formSelectors.map((formSelector, index) => ({
        stepId: `validation_${index}_${formSelector.replace(/[^a-zA-Z0-9]/g, '_')}',name: `Validate Form: ${formSelector}`,description: `Validate form ${formSelector} according to specified rules`,actionType: FormActionType.VALIDATE_FORM,sessionId: validationDto.sessionIds[index % validationDto.sessionIds.length],
        formSelector,
        validationScope: ValidationScope.FORM_LEVEL,
        timeoutMs: 30000,
        maxRetries: 2,
        config: {
          validateBeforeSubmit: true,
          captureScreenshots: true,
        },
      }));

      // Create workflow from validation configuration
      const workflow: MultiStepFormWorkflowDto = {
        workflowId: validationDto.workflowId,
        name: `Form Validation: ${validationDto.workflowId}`,
        description: 'Comprehensive form validation workflow',
        workflowType: DOMOrchestrationWorkflowType.FORM_VALIDATION_WORKFLOW,
        priority: WorkflowPriority.HIGH,
        steps: validationSteps,
        coordination: validationDto.coordination,
        globalTimeoutMs: 300000,
        metadata: {
          validationRules: validationDto.validationRules,
          formSelectors: validationDto.formSelectors,
        },
      };

      return await this.executeMultiStepFormWorkflow(workflow, user);

    } catch (error: unknown) {
      this.logger.error(`Failed to start form validation workflow: ${validationDto.workflowId}`, error);

      throw new InternalServerErrorException({
        message: 'Failed to start form validation workflow',error: error instanceof Error ? error.message : String(error),operationId,
        workflowId: validationDto.workflowId,
      });
    }
  }

  /**
   * Execute element coordination workflow
   *
   * Coordinates element states and interactions across multiple browser sessions
   * with real-time synchronization and consistency validation.
   */
  @Post('element-coordination')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Execute element coordination workflow',description: 'Coordinate element states and interactions across multiple browser sessions with real-time synchronization.',operationId: 'executeElementCoordination',})@ApiBody({
    type: ElementCoordinationDto,
    description: 'Element coordination configuration',})@ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Element coordination started successfully',
    type: WorkflowProgressDto,
  })
  async executeElementCoordination(
    @Body() coordinationDto: ElementCoordinationDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<WorkflowProgressDto> {
    const operationId = `coordination_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`Starting element coordination: ${coordinationDto.workflowId}`, {operationId,workflowId: coordinationDto.workflowId,
      elementsCount: coordinationDto.elementSelectors.length,
      actionsCount: coordinationDto.actions.length,
      sessionsCount: coordinationDto.sessionIds.length,
      userId: user.id,
    });

    try {
      // Create coordination steps for each action/element combination
      const coordinationSteps: DOMOrchestrationStepDto[] = [];
      let stepIndex = 0;

      for (const action of coordinationDto.actions) {
        for (const elementSelector of coordinationDto.elementSelectors) {
          coordinationSteps.push({
            stepId: `coord_${stepIndex}_${action}_${elementSelector.replace(/[^a-zA-Z0-9]/g, '_')}',name: `${action}: ${elementSelector}`,description: `Execute ${action} for element ${elementSelector}`,actionType: this.mapCoordinationActionToFormAction(action),sessionId: coordinationDto.sessionIds[stepIndex % coordinationDto.sessionIds.length],
            formSelector: elementSelector,
            validationScope: ValidationScope.SESSION_LEVEL,
            timeoutMs: coordinationDto.coordination.coordinationTimeoutMs || 30000,
            maxRetries: 1,
            config: {
              captureScreenshots: true,
            },
          });
          stepIndex++;
        }
      }

      // Create workflow from coordination configuration
      const workflow: MultiStepFormWorkflowDto = {
        workflowId: coordinationDto.workflowId,
        name: `Element Coordination: ${coordinationDto.workflowId}`,
        description: 'Element state coordination workflow',
        workflowType: DOMOrchestrationWorkflowType.ELEMENT_COORDINATION,
        priority: WorkflowPriority.HIGH,
        steps: coordinationSteps,
        coordination: coordinationDto.coordination,
        globalTimeoutMs: coordinationDto.coordination.coordinationTimeoutMs || 300000,
        metadata: {
          elementSelectors: coordinationDto.elementSelectors,
          actions: coordinationDto.actions,
          syncIntervalMs: coordinationDto.syncIntervalMs,
        },
      };

      return await this.executeMultiStepFormWorkflow(workflow, user);

    } catch (error: unknown) {
      this.logger.error(`Failed to start element coordination: ${coordinationDto.workflowId}`, error);

      throw new InternalServerErrorException({
        message: 'Failed to start element coordination',error: error instanceof Error ? error.message : String(error),operationId,
        workflowId: coordinationDto.workflowId,
      });
    }
  }

  /**
   * Get workflow progress
   *
   * Retrieves current progress and status of an active or completed workflow.
   */
  @Get('workflow/:workflowId/progress')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get workflow progress',description: 'Get current progress, status, and metrics for a workflow execution.',operationId: 'getWorkflowProgress',})@ApiParam({
    name: 'workflowId',description: 'Workflow identifier',type: 'string',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow progress retrieved successfully',type: WorkflowProgressDto,})
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workflow not found',})async getWorkflowProgress(
    @Param('workflowId') workflowId: string,
  ): Promise<WorkflowProgressDto> {
    this.logger.debug(`Getting workflow progress: ${workflowId}`);// Check active workflows firstconst activeWorkflow = this.activeWorkflows.get(workflowId);
    if (activeWorkflow) {
      return activeWorkflow;
    }

    // Check completed workflows
    const completedWorkflow = this.workflowResults.get(workflowId);
    if (completedWorkflow) {
      return completedWorkflow;
    }

    throw new NotFoundException(`Workflow not found: ${workflowId}`);
  }

  /**
   * Get workflow result
   *
   * Retrieves the complete result of a completed workflow execution.
   */
  @Get('workflow/:workflowId/result')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get workflow result',description: 'Get complete result and execution details for a completed workflow.',operationId: 'getWorkflowResult',})@ApiParam({
    name: 'workflowId',description: 'Workflow identifier',type: 'string',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow result retrieved successfully',type: WorkflowExecutionResultDto,})
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Workflow result not found',})async getWorkflowResult(
    @Param('workflowId') workflowId: string,
  ): Promise<WorkflowExecutionResultDto> {
    this.logger.debug(`Getting workflow result: ${workflowId}`);const result = this.workflowResults.get(workflowId);if (!result) {
      throw new NotFoundException(`Workflow result not found: ${workflowId}`);
    }

    return result;
  }

  /**
   * Cancel active workflow
   *
   * Cancels an actively running workflow and cleans up resources.
   */
  @Post('workflow/:workflowId/cancel')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Cancel workflow',description: 'Cancel an actively running workflow and clean up associated resources.',operationId: 'cancelWorkflow',})@ApiParam({
    name: 'workflowId',description: 'Workflow identifier',type: 'string',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow cancelled successfully',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Active workflow not found',})async cancelWorkflow(
    @Param('workflowId') workflowId: string,
  ): Promise<{ cancelled: boolean; message: string }> {
    this.logger.log(`Cancelling workflow: ${workflowId}`);const activeWorkflow = this.activeWorkflows.get(workflowId);if (!activeWorkflow) {
      throw new NotFoundException(`Active workflow not found: ${workflowId}`);}try {
      // Update workflow status
      this.updateWorkflowStatus(workflowId, WorkflowStatus.CANCELLED);

      // Try to cancel through orchestrator if available
      await this.orchestratorService.cancelExecution(workflowId).catch(() => {
        // Ignore orchestrator cancellation errors since workflow might not be in orchestrator
      });

      // Move to results
      const result = this.createWorkflowResult(activeWorkflow, { cancelled: true });
      this.workflowResults.set(workflowId, result);
      this.activeWorkflows.delete(workflowId);

      return {
        cancelled: true,
        message: `Workflow ${workflowId} cancelled successfully`,};} catch (error: unknown) {
      this.logger.error(`Failed to cancel workflow: ${workflowId}`, error);

      throw new InternalServerErrorException({
        message: 'Failed to cancel workflow',
        error: error instanceof Error ? error.message : String(error),
        workflowId,
      });
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private async validateWorkflowConfiguration(workflow: MultiStepFormWorkflowDto): Promise<void> {
    // Validate steps have unique IDs
    const stepIds = new Set();
    for (const step of workflow.steps) {
      if (stepIds.has(step.stepId)) {
        throw new BadRequestException(`Duplicate step ID: ${step.stepId}`);}stepIds.add(step.stepId);
    }

    // Validate dependencies exist
    for (const step of workflow.steps) {
      if (step.dependencies) {
        for (const depId of step.dependencies) {
          if (!stepIds.has(depId)) {
            throw new BadRequestException(`Step ${step.stepId} depends on non-existent step: ${depId}`);}}
      }
    }

    // Validate session IDs exist
    const uniqueSessionIds = [...new Set(workflow.steps.map(s => s.sessionId))];
    for (const sessionId of uniqueSessionIds) {
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new BadRequestException(`Session not found: ${sessionId}`);
      }
    }
  }

  private createWorkflowProgress(workflow: MultiStepFormWorkflowDto): WorkflowProgressDto {
    return {
      workflowId: workflow.workflowId,
      status: WorkflowStatus.PENDING,
      progressPercentage: 0,
      completedSteps: [],
      failedSteps: {},
      stepResults: {},
      metrics: {
        totalSteps: workflow.steps.length,
        completedSteps: 0,
        failedSteps: 0,
        executionTimeMs: 0,
        averageStepTimeMs: 0,
        coordinationOverheadMs: 0,
      },
      startedAt: new Date(),
      lastUpdatedAt: new Date(),
    };
  }

  private convertToOrchestrationTask(
    workflow: MultiStepFormWorkflowDto,
    user: ByteBotdUser,
  ): OrchestrationTask {
    // Convert workflow steps to orchestration workflow steps
    const orchestrationSteps: WorkflowStep[] = workflow.steps.map(step => ({
      stepId: step.stepId,
      type: this.mapActionTypeToWorkflowStepType(step.actionType),
      serviceId: 'browser-automation',endpoint: '/form-automation/action',parameters: {action: step.actionType,
        sessionId: step.sessionId,
        formSelector: step.formSelector,
        fields: step.fields,
        config: step.config,
      },
      dependencies: step.dependencies || [],
      timeout: {
        stepTimeoutMs: step.timeoutMs || 30000,
        warningThresholdMs: (step.timeoutMs || 30000) * 0.8,
      },
      retryConfig: {
        maxAttempts: step.maxRetries || 1,
        baseDelayMs: 1000,
        backoffMultiplier: 2,
        maxDelayMs: 10000,
        jitterMs: 100,
      },
      parlantValidation: {
        enabled: true,
        approvalLevel: 'HUMAN_REVIEW' as any,validationRules: [],timeoutMs: 30000,
      },
      condition: step.conditions ? {
        expression: 'true', // Simplified - would need proper condition parsingvariables: step.conditions,onTrue: 'continue',onFalse: 'skip',} : undefined,}));

    return {
      taskId: workflow.workflowId,
      name: workflow.name,
      description: workflow.description,
      priority: this.mapWorkflowPriorityToOrchestrationPriority(workflow.priority),
      workflow: orchestrationSteps,
      timeout: workflow.globalTimeoutMs || 600000,
      metadata: workflow.metadata || {},
      performanceRequirements: {
        maxExecutionTimeMs: workflow.globalTimeoutMs || 600000,
        maxMemoryUsageMb: 512,
        maxCpuUsagePercent: 80,
        targetThroughput: 10,
        slaRequirements: {
          p95ResponseTimeMs: 30000,
          p99ResponseTimeMs: 60000,
          availabilityPercent: 99.9,
          errorRatePercent: 1.0,
        },
      },
      complianceRequirements: {
        frameworks: [{
          name: 'GDPR',version: '2018',level: 'standard',requirements: ['data_protection', 'user_consent'],}],dataClassification: 'internal',auditingLevel: 'detailed',
        retentionDays: 90,
      },
    };
  }

  private async executeWorkflowAsync(
    workflowId: string,
    orchestrationTask: OrchestrationTask,
    user: ByteBotdUser,
  ): Promise<void> {
    try {
      // Update status to initializing
      this.updateWorkflowStatus(workflowId, WorkflowStatus.INITIALIZING);

      // Create orchestration request
      const orchestrationRequest: ParlantOrchestrationRequest = {
        task: orchestrationTask,
        conversationContext: {
          userId: user.id,
          sessionId: `workflow_${workflowId}`,
          roles: user.roles || ['user'],ipAddress: 'unknown',metadata: { workflowId },},
        userContext: {
          userId: user.id,
          roles: user.roles || ['user'],
          sessionId: `workflow_${workflowId}`,
          ipAddress: 'unknown',
          metadata: { workflowId },
        },
        options: {
          dryRun: false,
          skipValidation: false,
        },
      };

      // Update status to executing
      this.updateWorkflowStatus(workflowId, WorkflowStatus.EXECUTING);

      // Execute through orchestrator
      const result: ParlantOrchestrationResult = await this.orchestratorService.executeOrchestration(
        orchestrationRequest
      );

      // Process result
      if (result.error) {
        this.updateWorkflowStatus(workflowId, WorkflowStatus.FAILED, {
          error: {
            code: result.error.type,
            message: result.error.message,
            details: result.error.details,
          },
        });
      } else {
        this.updateWorkflowStatus(workflowId, WorkflowStatus.COMPLETED, {
          result: result.result,
          completedAt: new Date(),
        });
      }

      // Move to results
      const activeWorkflow = this.activeWorkflows.get(workflowId);
      if (activeWorkflow) {
        const finalResult = this.createWorkflowResult(activeWorkflow, result);
        this.workflowResults.set(workflowId, finalResult);
        this.activeWorkflows.delete(workflowId);
      }

    } catch (error: unknown) {
      this.logger.error(`Workflow execution failed: ${workflowId}`, error);

      this.updateWorkflowStatus(workflowId, WorkflowStatus.FAILED, {
        error: {
          code: 'EXECUTION_ERROR',message: error instanceof Error ? error.message : String(error),details: error,
        },
      });
    }
  }

  private updateWorkflowStatus(
    workflowId: string,
    status: WorkflowStatus,
    updates: Partial<WorkflowProgressDto> = {},
  ): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      const updatedWorkflow = {
        ...workflow,
        status,
        lastUpdatedAt: new Date(),
        ...updates,
      };

      // Update progress percentage based on status
      if (status === WorkflowStatus.COMPLETED) {
        updatedWorkflow.progressPercentage = 100;
      } else if (status === WorkflowStatus.FAILED || status === WorkflowStatus.CANCELLED) {
        // Keep current progress
      }

      this.activeWorkflows.set(workflowId, updatedWorkflow);
    }
  }

  private createWorkflowResult(
    workflowProgress: WorkflowProgressDto,
    orchestrationResult?: unknown,
  ): WorkflowExecutionResultDto {
    return {
      ...workflowProgress,
      result: orchestrationResult,
      coordinationDetails: {
        agentsUsed: 1, // Default for now
        coordinationEvents: 0,
        synchronizationPoints: 0,
        crossSessionOperations: 0,
      },
    };
  }

  private mapActionTypeToWorkflowStepType(actionType: FormActionType): WorkflowStepType {
    switch (actionType) {
      case FormActionType.VALIDATE_FORM:
        return WorkflowStepType.VALIDATION;
      case FormActionType.FILL_FORM:
      case FormActionType.SUBMIT_FORM:
      case FormActionType.CLEAR_FORM:
      case FormActionType.AUTO_COMPLETE:
        return WorkflowStepType.SERVICE_CALL;
      default:
        return WorkflowStepType.SERVICE_CALL;
    }
  }

  private mapWorkflowPriorityToOrchestrationPriority(priority: WorkflowPriority): OrchestrationPriority {
    switch (priority) {
      case WorkflowPriority.LOW:
        return OrchestrationPriority.LOW;
      case WorkflowPriority.NORMAL:
        return OrchestrationPriority.NORMAL;
      case WorkflowPriority.HIGH:
        return OrchestrationPriority.HIGH;
      case WorkflowPriority.CRITICAL:
        return OrchestrationPriority.CRITICAL;
      case WorkflowPriority.EMERGENCY:
        return OrchestrationPriority.CRITICAL; // Map to highest available
      default:
        return OrchestrationPriority.NORMAL;
    }
  }

  private mapCoordinationActionToFormAction(
    action: 'sync_state' | 'update_values' | 'trigger_events' | 'validate_consistency'): FormActionType {switch (action) {
      case 'sync_state':case 'update_values':return FormActionType.FILL_FORM;case 'trigger_events':return FormActionType.SUBMIT_FORM;case 'validate_consistency':
        return FormActionType.VALIDATE_FORM;
      default:
        return FormActionType.FILL_FORM;
    }
  }
}