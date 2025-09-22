import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer'; /*** Workflow step types
 */
export enum WorkflowStepType {
  FORM_AUTOMATION = 'form_automation',
  DATA_EXTRACTION = 'data_extraction',
  NAVIGATION = 'navigation',
  WAIT = 'wait',
  CONDITIONAL = 'conditional',
  LOOP = 'loop',
  SCREENSHOT = 'screenshot',
  COMPUTER_ACTION = 'computer_action',
  DATA_TRANSFORMATION = 'data_transformation',
  NOTIFICATION = 'notification',
  API_CALL = 'api_call',
  FILE_OPERATION = 'file_operation',
  CUSTOM_SCRIPT = 'custom_script',
} /**
 * Conditional operators for workflow logic
 */
export enum ConditionalOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  EXISTS = 'exists',
  NOT_EXISTS = 'not_exists',
  MATCHES_REGEX = 'matches_regex',
  IS_EMPTY = 'is_empty',
  IS_NOT_EMPTY = 'is_not_empty',
} /**
 * Loop types for iterative operations
 */
export enum LoopType {
  FOR_EACH = 'for_each',
  WHILE = 'while',
  UNTIL = 'until',
  FIXED_COUNT = 'fixed_count',
} /**
 * Workflow execution mode
 */
export enum WorkflowExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL_PARALLEL = 'conditional_parallel',
} /**
 * Conditional logic definition
 */
export class ConditionalLogicDto {
  @ApiProperty({
    description: 'Variable or data path to evaluate',
    example: 'extractedData.tables[0].rowCount',
  })
  @IsString()
  variable: string;

  @ApiProperty({
    description: 'Conditional operator',
    enum: ConditionalOperator,
    example: ConditionalOperator.GREATER_THAN,
  })
  @IsEnum(ConditionalOperator)
  operator: ConditionalOperator;

  @ApiPropertyOptional({
    description: 'Value to compare against',
    example: 10,
  })
  @IsOptional()
  value?: unknown;

  @ApiPropertyOptional({
    description: 'Nested conditional logic (AND/OR operations)',
    type: [ConditionalLogicDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionalLogicDto)
  and?: ConditionalLogicDto[];

  @ApiPropertyOptional({
    description: 'Alternative conditional logic (OR operation)',
    type: [ConditionalLogicDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionalLogicDto)
  or?: ConditionalLogicDto[];
}

/**
 * Loop configuration
 */
export class LoopConfigDto {
  @ApiProperty({
    description: 'Type of loop to execute',
    enum: LoopType,
    example: LoopType.FOR_EACH,
  })
  @IsEnum(LoopType)
  type: LoopType;

  @ApiPropertyOptional({
    description: 'Data array to iterate over (for FOR_EACH)',
    example: 'extractedData.productList',
  })
  @IsOptional()
  @IsString()
  iterateOver?: string;

  @ApiPropertyOptional({
    description: 'Condition for WHILE/UNTIL loops',
    type: ConditionalLogicDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionalLogicDto)
  condition?: ConditionalLogicDto;

  @ApiPropertyOptional({
    description: 'Fixed count for FIXED_COUNT loops',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  count?: number;

  @ApiPropertyOptional({
    description: 'Maximum iterations to prevent infinite loops',
    example: 100,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  maxIterations?: number;

  @ApiPropertyOptional({
    description: 'Variable name for current iteration value',
    example: 'currentItem',
    default: 'item',
  })
  @IsOptional()
  @IsString()
  iteratorVariable?: string;

  @ApiPropertyOptional({
    description: 'Variable name for current iteration index',
    example: 'currentIndex',
    default: 'index',
  })
  @IsOptional()
  @IsString()
  indexVariable?: string;
}

/**
 * Error handling configuration
 */
export class ErrorHandlingDto {
  @ApiPropertyOptional({
    description: 'Whether to continue workflow on step failure',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts for failed steps',
    example: 3,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Delay between retry attempts in milliseconds',
    example: 5000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  retryDelay?: number;

  @ApiPropertyOptional({
    description: 'Alternative workflow steps to execute on error',
    example: ['step_error_handler', 'step_cleanup'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fallbackSteps?: string[];

  @ApiPropertyOptional({
    description: 'Whether to send notifications on errors',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  notifyOnError?: boolean;
}

/**
 * Data transformation configuration
 */
export class DataTransformationDto {
  @ApiProperty({
    description: 'Source data path or variable',
    example: 'extractedData.tables[0].rows',
  })
  @IsString()
  source: string;

  @ApiProperty({
    description: 'Target variable to store transformed data',
    example: 'processedData',
  })
  @IsString()
  target: string;

  @ApiPropertyOptional({
    description: 'Transformation operations to apply',
    example: ['filter', 'map', 'sort'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operations?: string[];

  @ApiPropertyOptional({
    description: 'Custom transformation function (JavaScript)',
    example:
      'data => data.filter(row => row.length > 0).map(row => ({ name: row[0], value: row[1] }))',
  })
  @IsOptional()
  @IsString()
  customFunction?: string;

  @ApiPropertyOptional({
    description: 'Transformation parameters',
    example: { filterColumn: 0, filterValue: 'Active' },
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}

/**
 * Workflow step definition
 */
export class WorkflowStepDto {
  @ApiProperty({
    description: 'Unique step identifier',
    example: 'step_1_login',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Human-readable step name',
    example: 'Login to Application',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Step type',
    enum: WorkflowStepType,
    example: WorkflowStepType.FORM_AUTOMATION,
  })
  @IsEnum(WorkflowStepType)
  type: WorkflowStepType;

  @ApiPropertyOptional({
    description: 'Step description',
    example: 'Fill login form and submit credentials',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Step configuration parameters',
    example: {
      action: 'fill_form',
      formSelector: '#loginForm',
      fields: [
        { selector: '#email', value: '${user.email}' },
        { selector: '#password', value: '${user.password}' },
      ],
    },
  })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Conditional logic for step execution',
    type: ConditionalLogicDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConditionalLogicDto)
  condition?: ConditionalLogicDto;

  @ApiPropertyOptional({
    description: 'Loop configuration for iterative execution',
    type: LoopConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LoopConfigDto)
  loop?: LoopConfigDto;

  @ApiPropertyOptional({
    description: 'Error handling configuration',
    type: ErrorHandlingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorHandlingDto)
  errorHandling?: ErrorHandlingDto;

  @ApiPropertyOptional({
    description: 'Data transformation configuration',
    type: DataTransformationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DataTransformationDto)
  dataTransformation?: DataTransformationDto;

  @ApiPropertyOptional({
    description: 'Step dependencies (must complete before this step)',
    example: ['step_navigate', 'step_wait_for_load'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Timeout for step execution in milliseconds',
    example: 30000,
    default: 60000,
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Whether to capture screenshots before/after step',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean;

  @ApiPropertyOptional({
    description: 'Variables to extract from step results',
    example: {
      loginSuccess: 'result.success',
      userProfile: 'result.data.profile',
    },
  })
  @IsOptional()
  @IsObject()
  outputVariables?: Record<string, string>;
}

/**
 * Workflow configuration
 */
export class WorkflowConfigDto {
  @ApiPropertyOptional({
    description: 'Workflow execution mode',
    enum: WorkflowExecutionMode,
    example: WorkflowExecutionMode.SEQUENTIAL,
    default: WorkflowExecutionMode.SEQUENTIAL,
  })
  @IsOptional()
  @IsEnum(WorkflowExecutionMode)
  executionMode?: WorkflowExecutionMode;

  @ApiPropertyOptional({
    description: 'Maximum concurrent steps for parallel execution',
    example: 3,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  maxConcurrentSteps?: number;

  @ApiPropertyOptional({
    description: 'Global timeout for entire workflow in milliseconds',
    example: 300000,
    default: 600000,
  })
  @IsOptional()
  @IsNumber()
  globalTimeout?: number;

  @ApiPropertyOptional({
    description: 'Whether to continue workflow on step failures',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to capture screenshots during execution',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean;

  @ApiPropertyOptional({
    description: 'Global error handling configuration',
    type: ErrorHandlingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ErrorHandlingDto)
  errorHandling?: ErrorHandlingDto;

  @ApiPropertyOptional({
    description: 'Notification settings for workflow events',
    example: { onSuccess: true, onError: true, onCompletion: true },
  })
  @IsOptional()
  @IsObject()
  notifications?: Record<string, any>;
}

/**
 * Workflow definition
 */
export class WorkflowDto {
  @ApiProperty({
    description: 'Unique workflow identifier',
    example: 'workflow_data_collection',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Workflow name',
    example: 'E-commerce Data Collection Workflow',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Workflow description',
    example:
      'Automated workflow to collect product data from e-commerce websites',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Workflow version',
    example: '1.2.0',
  })
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Workflow steps',
    type: [WorkflowStepDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({
    description: 'Workflow configuration',
    type: WorkflowConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowConfigDto)
  config?: WorkflowConfigDto;

  @ApiPropertyOptional({
    description: 'Initial workflow variables',
    example: {
      targetUrl: 'https://example.com',
      maxPages: 10,
      outputFormat: 'json',
    },
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Workflow metadata',
    example: {
      author: 'Data Team',
      category: 'Data Collection',
      tags: ['ecommerce', 'scraping', 'automation'],
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Workflow execution request
 */
export class WorkflowExecutionDto {
  @ApiProperty({
    description: 'Workflow to execute',
    type: WorkflowDto,
  })
  @ValidateNested()
  @Type(() => WorkflowDto)
  workflow: WorkflowDto;

  @ApiPropertyOptional({
    description: 'Runtime variables to override workflow defaults',
    example: {
      targetUrl: 'https://specific-site.com',
      userCredentials: { email: 'user@example.com', password: 'secret' },
    },
  })
  @IsOptional()
  @IsObject()
  runtimeVariables?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Steps to execute (if not all)',
    example: ['step_1_login', 'step_2_navigate', 'step_3_extract'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stepsToExecute?: string[];

  @ApiPropertyOptional({
    description: 'Whether to execute in debug mode',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  debugMode?: boolean;

  @ApiPropertyOptional({
    description: 'Additional execution metadata',
    example: { executionId: 'exec_12345', triggeredBy: 'scheduled_job' },
  })
  @IsOptional()
  @IsObject()
  executionMetadata?: Record<string, any>;
}
