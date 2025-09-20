import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  UseInterceptors,
  Get,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EnterpriseRateLimitGuard } from '../common/guards/rate-limit.guard';
import { SecuritySanitizationPipes } from '../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import {
  ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { WorkflowAutomationService } from './workflow-automation.service';
import {
  WorkflowDto,
  WorkflowExecutionDto,
  WorkflowStepType,
  WorkflowExecutionMode
} from './dto/workflow.dto';
import {
  WorkflowExecutionResponseDto,
  WorkflowValidationResultDto,
  WorkflowExecutionListDto
} from './dto/workflow-response.dto';

/**
 * Workflow Automation Controller
 *
 * Provides enterprise-grade APIs for automated workflow orchestration including:
 * - Multi-step workflow execution with conditional logic
 * - Loop execution with various types (for-each, while, until, fixed-count)
 * - Error handling and recovery mechanisms
 * - Data transformation between workflow steps
 * - Parallel and sequential execution modes
 * - Variable management and templating
 * - Screenshot capture and debugging support
 * - Workflow validation and dependency analysis
 *
 * Security Features:
 * - JWT authentication and RBAC authorization
 * - Input sanitization and XSS prevention
 * - Rate limiting with suspicious activity detection
 * - Comprehensive audit logging
 * - Secure variable interpolation
 */
@ApiTags('Workflow Automation API')
@Controller('workflow-automation')
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')
export class WorkflowAutomationController {
  private readonly logger = new Logger(WorkflowAutomationController.name);

  constructor(private readonly workflowAutomationService: WorkflowAutomationService) {}

  /**
   * Execute workflow
   *
   * Executes a complete workflow with multi-step orchestration, conditional logic,
   * and error handling. Supports sequential, parallel, and conditional parallel
   * execution modes with comprehensive progress tracking and result aggregation.
   *
   * @param params - Workflow execution parameters
   * @param user - Authenticated user context
   * @returns Promise<WorkflowExecutionResponseDto> - Complete execution results
   */
  @Post('execute')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Execute workflow',
    description: 'Execute a complete workflow with multi-step orchestration, conditional logic, loops, and error handling. Supports various execution modes and comprehensive tracking.',
    operationId: 'executeWorkflow',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow execution completed successfully',
    type: WorkflowExecutionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid workflow definition or execution parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ApiResponse({
    status: 408,
    description: 'Workflow execution timeout exceeded',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async executeWorkflow(
    @Body() params: WorkflowExecutionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<WorkflowExecutionResponseDto> {
    const operationId = `workflow_exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Workflow execution request: ${params.workflow.name}`,
        {
          operationId,
          workflowId: params.workflow.id,
          workflowName: params.workflow.name,
          stepCount: params.workflow.steps.length,
          executionMode: params.workflow.config?.executionMode,
          debugMode: params.debugMode,
          userId: user.id,
          username: user.username,
          userRole: user.role,
        },
      );

      const result = await this.workflowAutomationService.executeWorkflow(params);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Workflow execution completed: ${result.status} (${processingTime}ms)`,
        {
          operationId,
          workflowId: result.workflowId,
          executionId: result.executionId,
          status: result.status,
          completedSteps: result.progress.completedSteps,
          failedSteps: result.progress.failedSteps,
          durationMs: result.durationMs,
          userId: user.id,
          username: user.username,
        },
      );

      return result;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Workflow execution failed: ${errorMessage} (${processingTime}ms)`,
        this.getErrorStack(error),
        {
          operationId,
          workflowId: params.workflow.id,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      // Map specific errors to appropriate HTTP status codes
      if (errorMessage.includes('validation failed') || errorMessage.includes('Invalid workflow')) {
        throw new HttpException(
          `Workflow validation failed: ${errorMessage}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        throw new HttpException(
          `Workflow execution timeout: ${errorMessage}`,
          HttpStatus.REQUEST_TIMEOUT,
        );
      }

      throw new HttpException(
        `Workflow execution failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Validate workflow
   *
   * Validates workflow structure, dependencies, and configuration before execution.
   * Performs comprehensive analysis including circular dependency detection,
   * step configuration validation, and performance recommendations.
   *
   * @param workflow - Workflow definition to validate
   * @param user - Authenticated user context
   * @returns Promise<WorkflowValidationResultDto> - Validation results and recommendations
   */
  @Post('validate')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Validate workflow',
    description: 'Validate workflow structure, dependencies, and configuration. Provides detailed analysis and recommendations for optimization.',
    operationId: 'validateWorkflow',
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow validation completed',
    type: WorkflowValidationResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid workflow structure',
  })
  async validateWorkflow(
    @Body() workflow: WorkflowDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<WorkflowValidationResultDto> {
    const operationId = `workflow_validate_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(
      `[${operationId}] Workflow validation request: ${workflow.name}`,
      {
        operationId,
        workflowId: workflow.id,
        workflowName: workflow.name,
        stepCount: workflow.steps.length,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.workflowAutomationService.validateWorkflow(workflow);

    this.logger.log(
      `[${operationId}] Workflow validation completed: ${result.isValid ? 'VALID' : 'INVALID'}`,
      {
        operationId,
        workflowId: workflow.id,
        isValid: result.isValid,
        errorCount: result.errors?.length || 0,
        warningCount: result.warnings?.length || 0,
        userId: user.id,
        username: user.username,
      },
    );

    return result;
  }

  /**
   * Get execution status
   *
   * Retrieves current status and progress information for a running workflow execution.
   * Provides real-time tracking of step completion, active loops, and performance metrics.
   *
   * @param executionId - Unique execution identifier
   * @param user - Authenticated user context
   * @returns Promise<Partial<WorkflowExecutionResponseDto>> - Current execution status
   */
  @Get('executions/:executionId/status')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get execution status',
    description: 'Retrieve current status and progress information for a running workflow execution with real-time step tracking.',
    operationId: 'getExecutionStatus',
  })
  @ApiParam({
    name: 'executionId',
    description: 'Unique workflow execution identifier',
    example: 'exec_1704454800_abc123'
  })
  @ApiResponse({
    status: 200,
    description: 'Execution status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        executionId: { type: 'string' },
        status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
        progress: { type: 'object' },
        stepResults: { type: 'array', items: { type: 'object' } }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Execution not found',
  })
  async getExecutionStatus(
    @Param('executionId') executionId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<Partial<WorkflowExecutionResponseDto>> {
    const operationId = `status_${executionId}_${Date.now()}`;

    this.logger.log(
      `[${operationId}] Execution status request for: ${executionId}`,
      {
        operationId,
        executionId,
        userId: user.id,
        username: user.username,
      },
    );

    return this.workflowAutomationService.getExecutionStatus(executionId);
  }

  /**
   * Cancel execution
   *
   * Cancels a running workflow execution gracefully. Allows currently executing
   * steps to complete but prevents new steps from starting.
   *
   * @param executionId - Unique execution identifier
   * @param user - Authenticated user context
   * @returns Promise<object> - Cancellation result
   */
  @Delete('executions/:executionId')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Cancel execution',
    description: 'Cancel a running workflow execution gracefully. Currently executing steps will complete but no new steps will start.',
    operationId: 'cancelExecution',
  })
  @ApiParam({
    name: 'executionId',
    description: 'Unique workflow execution identifier',
    example: 'exec_1704454800_abc123'
  })
  @ApiResponse({
    status: 200,
    description: 'Execution cancellation processed',
    schema: {
      type: 'object',
      properties: {
        cancelled: { type: 'boolean' },
        message: { type: 'string' },
        executionId: { type: 'string' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Execution not found',
  })
  async cancelExecution(
    @Param('executionId') executionId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ cancelled: boolean; message: string; executionId: string }> {
    const operationId = `cancel_${executionId}_${Date.now()}`;

    this.logger.log(
      `[${operationId}] Execution cancellation request for: ${executionId}`,
      {
        operationId,
        executionId,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.workflowAutomationService.cancelExecution(executionId);

    this.logger.log(
      `[${operationId}] Execution cancellation result: ${result.cancelled}`,
      {
        operationId,
        executionId,
        cancelled: result.cancelled,
        userId: user.id,
        username: user.username,
      },
    );

    return {
      ...result,
      executionId
    };
  }

  /**
   * Get workflow templates
   *
   * Returns predefined workflow templates for common automation scenarios
   * to help users quickly create standardized workflows.
   *
   * @param category - Template category filter
   * @returns Workflow templates for specified category
   */
  @Get('templates')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get workflow templates',
    description: 'Retrieve predefined workflow templates for common automation scenarios and use cases.',
    operationId: 'getWorkflowTemplates',
  })
  @ApiQuery({
    name: 'category',
    description: 'Template category filter',
    example: 'data-collection',
    required: false
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        templates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              category: { type: 'string' },
              workflow: { type: 'object' }
            }
          }
        },
        categories: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getWorkflowTemplates(
    @Query('category') category?: string,
  ): Promise<{
    templates: any[];
    categories: string[];
  }> {
    // Return predefined workflow templates
    const templates = [
      {
        id: 'data-collection-basic',
        name: 'Basic Data Collection',
        description: 'Navigate to page, extract data, and save results',
        category: 'data-collection',
        workflow: {
          id: 'template_data_collection_basic',
          name: 'Basic Data Collection Workflow',
          version: '1.0.0',
          steps: [
            {
              id: 'step_1_navigate',
              name: 'Navigate to Target Page',
              type: WorkflowStepType.NAVIGATION,
              config: { url: '${targetUrl}' }
            },
            {
              id: 'step_2_extract',
              name: 'Extract Data',
              type: WorkflowStepType.DATA_EXTRACTION,
              config: {
                extractionType: 'table',
                selector: 'table'
              },
              dependencies: ['step_1_navigate']
            },
            {
              id: 'step_3_save',
              name: 'Save Results',
              type: WorkflowStepType.FILE_OPERATION,
              config: {
                operation: 'write',
                path: '${outputPath}',
                data: '${step_2_extract.result}'
              },
              dependencies: ['step_2_extract']
            }
          ],
          config: {
            executionMode: WorkflowExecutionMode.SEQUENTIAL,
            captureScreenshots: true
          }
        }
      },
      {
        id: 'form-automation-login',
        name: 'Form Automation with Login',
        description: 'Login to application and perform form operations',
        category: 'form-automation',
        workflow: {
          id: 'template_form_automation_login',
          name: 'Form Automation with Login Workflow',
          version: '1.0.0',
          steps: [
            {
              id: 'step_1_login',
              name: 'Login to Application',
              type: WorkflowStepType.FORM_AUTOMATION,
              config: {
                action: 'fill_form',
                formSelector: '#loginForm',
                fields: [
                  { selector: '#email', value: '${credentials.email}' },
                  { selector: '#password', value: '${credentials.password}' }
                ],
                submitAfterFill: true
              }
            },
            {
              id: 'step_2_navigate_dashboard',
              name: 'Navigate to Dashboard',
              type: WorkflowStepType.NAVIGATION,
              config: { url: '/dashboard' },
              dependencies: ['step_1_login']
            }
          ]
        }
      }
    ];

    const categories = ['data-collection', 'form-automation', 'web-scraping', 'testing', 'monitoring'];

    const filteredTemplates = category
      ? templates.filter(t => t.category === category)
      : templates;

    return {
      templates: filteredTemplates,
      categories
    };
  }

  /**
   * Get supported step types
   *
   * Returns all supported workflow step types and their configuration schemas
   * for building dynamic workflow creation interfaces.
   *
   * @returns Supported step types and their schemas
   */
  @Get('step-types')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get supported step types',
    description: 'Retrieve all supported workflow step types and their configuration schemas for dynamic workflow building.',
    operationId: 'getStepTypes',
  })
  @ApiResponse({
    status: 200,
    description: 'Step types retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        stepTypes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              configSchema: { type: 'object' },
              examples: { type: 'array' }
            }
          }
        },
        executionModes: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async getStepTypes(): Promise<{
    stepTypes: any[];
    executionModes: WorkflowExecutionMode[];
  }> {
    const stepTypes = [
      {
        type: WorkflowStepType.FORM_AUTOMATION,
        name: 'Form Automation',
        description: 'Automate form interactions including filling, validation, and submission',
        configSchema: {
          action: { type: 'string', enum: ['fill_form', 'submit_form', 'validate_form'] },
          formSelector: { type: 'string' },
          fields: { type: 'array' }
        },
        examples: [
          { action: 'fill_form', formSelector: '#contactForm', fields: [] }
        ]
      },
      {
        type: WorkflowStepType.DATA_EXTRACTION,
        name: 'Data Extraction',
        description: 'Extract structured data from web pages including tables, lists, and custom patterns',
        configSchema: {
          extractionType: { type: 'string', enum: ['table', 'list', 'text', 'links', 'images'] },
          selector: { type: 'string' },
          config: { type: 'object' }
        },
        examples: [
          { extractionType: 'table', selector: 'table.data' }
        ]
      },
      {
        type: WorkflowStepType.NAVIGATION,
        name: 'Navigation',
        description: 'Navigate to specific URLs or perform browser navigation actions',
        configSchema: {
          url: { type: 'string' },
          waitForLoad: { type: 'boolean' }
        },
        examples: [
          { url: 'https://example.com', waitForLoad: true }
        ]
      },
      {
        type: WorkflowStepType.CONDITIONAL,
        name: 'Conditional Logic',
        description: 'Execute steps based on conditional logic and variable evaluation',
        configSchema: {
          condition: { type: 'object' },
          thenSteps: { type: 'array' },
          elseSteps: { type: 'array' }
        }
      },
      {
        type: WorkflowStepType.LOOP,
        name: 'Loop Execution',
        description: 'Execute steps repeatedly with various loop types',
        configSchema: {
          loopType: { type: 'string', enum: ['for_each', 'while', 'until', 'fixed_count'] },
          condition: { type: 'object' },
          steps: { type: 'array' }
        }
      }
    ];

    return {
      stepTypes,
      executionModes: Object.values(WorkflowExecutionMode)
    };
  }

  // Helper methods for error handling

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as { message: string }).message;
    }
    return typeof error === 'string' ? error : 'Unknown error';
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'stack' in error) {
      return (error as { stack?: string }).stack;
    }
    return undefined;
  }
}