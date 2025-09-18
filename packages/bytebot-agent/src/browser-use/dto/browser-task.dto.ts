/**
 * Browser Task DTOs
 *
 * Data Transfer Objects for browser automation task operations.
 * Defines the structure for creating, updating, and responding with task data.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  IsUrl,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BrowserTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum BrowserTaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class BrowserTaskConstraints {
  @ApiPropertyOptional({
    description: 'Maximum execution time in seconds',
    minimum: 1,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  maxExecutionTime?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of browser actions to perform',
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxActions?: number;

  @ApiPropertyOptional({
    description: 'List of allowed domains for navigation',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({
    description: 'List of blocked domains',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedDomains?: string[];

  @ApiPropertyOptional({
    description: 'Enable screenshot capture during execution',
  })
  @IsOptional()
  @IsBoolean()
  enableScreenshots?: boolean;

  @ApiPropertyOptional({
    description: 'Enable video recording of task execution',
  })
  @IsOptional()
  @IsBoolean()
  enableVideoRecording?: boolean;
}

export class CreateBrowserTaskDto {
  @ApiProperty({
    description: 'Human-readable name for the task',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    description:
      'Detailed description of the task to be performed by the browser agent',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiPropertyOptional({
    description: 'Initial URL to start the task from',
  })
  @IsOptional()
  @IsUrl()
  startUrl?: string;

  @ApiPropertyOptional({
    description: 'Task priority level',
    enum: BrowserTaskPriority,
    default: BrowserTaskPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(BrowserTaskPriority)
  priority?: BrowserTaskPriority = BrowserTaskPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Task execution constraints and limitations',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrowserTaskConstraints)
  constraints?: BrowserTaskConstraints;

  @ApiPropertyOptional({
    description: 'Additional configuration parameters',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Tags for organizing and filtering tasks',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether to start execution immediately upon creation',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoStart?: boolean = false;
}

export class UpdateBrowserTaskDto {
  @ApiPropertyOptional({
    description: 'Updated task name',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated task description',
    minLength: 10,
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated task priority',
    enum: BrowserTaskPriority,
  })
  @IsOptional()
  @IsEnum(BrowserTaskPriority)
  priority?: BrowserTaskPriority;

  @ApiPropertyOptional({
    description: 'Updated task constraints',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrowserTaskConstraints)
  constraints?: BrowserTaskConstraints;

  @ApiPropertyOptional({
    description: 'Updated configuration parameters',
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Updated tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class BrowserTaskExecutionStep {
  @ApiProperty({ description: 'Step number in execution sequence' })
  stepNumber!: number;

  @ApiProperty({ description: 'Action performed in this step' })
  action!: string;

  @ApiProperty({ description: 'Target element or URL for the action' })
  target!: string;

  @ApiProperty({ description: 'Result of the action' })
  result!: string;

  @ApiProperty({ description: 'Timestamp of step execution' })
  timestamp!: Date;

  @ApiProperty({ description: 'Screenshot captured during this step (base64)' })
  screenshot?: string;

  @ApiProperty({ description: 'Whether this step was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Error message if step failed' })
  error?: string;
}

export class BrowserTaskResponseDto {
  @ApiProperty({ description: 'Unique task identifier' })
  id!: string;

  @ApiProperty({ description: 'Task name' })
  name!: string;

  @ApiProperty({ description: 'Task description' })
  description!: string;

  @ApiProperty({ description: 'Current task status', enum: BrowserTaskStatus })
  status!: BrowserTaskStatus;

  @ApiProperty({
    description: 'Task priority level',
    enum: BrowserTaskPriority,
  })
  priority!: BrowserTaskPriority;

  @ApiProperty({ description: 'Initial URL for the task' })
  startUrl?: string;

  @ApiProperty({ description: 'Task constraints and limitations' })
  constraints?: BrowserTaskConstraints;

  @ApiProperty({ description: 'Task configuration parameters' })
  config?: Record<string, any>;

  @ApiProperty({ description: 'Task tags', type: [String] })
  tags?: string[];

  @ApiProperty({ description: 'Task creation timestamp' })
  createdAt!: Date;

  @ApiProperty({ description: 'Task last updated timestamp' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Task execution start timestamp' })
  startedAt?: Date;

  @ApiProperty({ description: 'Task completion timestamp' })
  completedAt?: Date;

  @ApiProperty({ description: 'User who created the task' })
  createdBy!: string;

  @ApiProperty({ description: 'Browser session ID associated with this task' })
  sessionId?: string;

  @ApiProperty({ description: 'Current execution progress (0-100)' })
  progress!: number;

  @ApiProperty({ description: 'Total number of execution steps' })
  totalSteps!: number;

  @ApiProperty({ description: 'Number of completed steps' })
  completedSteps!: number;

  @ApiProperty({
    description: 'Detailed execution steps',
    type: [BrowserTaskExecutionStep],
  })
  executionSteps?: BrowserTaskExecutionStep[];

  @ApiProperty({ description: 'Final result of task execution' })
  result?: any;

  @ApiProperty({ description: 'Error information if task failed' })
  error?: {
    message: string;
    code: string;
    details?: any;
    timestamp: Date;
  };

  @ApiProperty({ description: 'Task execution metrics' })
  metrics?: {
    duration: number; // Total execution time in seconds
    actionsPerformed: number;
    pagesVisited: number;
    screenshotsTaken: number;
    errorsEncountered: number;
  };
}

export class BrowserTaskStatusDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;

  @ApiProperty({ description: 'Task identifier' })
  taskId!: string;

  @ApiProperty({ description: 'Whether the task was found' })
  found!: boolean;

  @ApiProperty({ description: 'Current task status', enum: BrowserTaskStatus })
  status?: BrowserTaskStatus;

  @ApiProperty({ description: 'Task progress information' })
  progress?: {
    currentStep: number;
    totalSteps: number;
    percentComplete: number;
    estimatedRemainingMs?: number;
  };

  @ApiProperty({ description: 'Task timing information' })
  timing?: {
    startedAt: Date;
    completedAt?: Date;
    lastActivityAt: Date;
    totalDurationMs: number;
  };

  @ApiProperty({ description: 'Associated browser session ID' })
  sessionId?: string;

  @ApiProperty({ description: 'Task execution metrics' })
  metrics?: {
    executionTimeMs?: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    networkRequests: number;
    screenshotsTaken: number;
    pagesVisited: number;
  };

  @ApiProperty({ description: 'Execution steps' })
  executionSteps?: Array<{
    stepNumber: number;
    action: string;
    status: BrowserTaskStatus;
    startedAt?: Date;
    completedAt?: Date;
    result?: string;
    error?: string;
    durationMs?: number;
  }>;

  @ApiProperty({ description: 'Legacy execution time property' })
  executionTime?: number;

  @ApiProperty({ description: 'Task result data' })
  result?: any;

  @ApiProperty({ description: 'Error information if task failed' })
  error?: {
    code: string;
    message: string;
    stack?: string;
    timestamp: Date;
  };

  @ApiProperty({ description: 'Response timestamp' })
  timestamp!: Date;
}

export class BrowserTaskListResponseDto {
  @ApiProperty({
    description: 'List of browser tasks',
    type: [BrowserTaskResponseDto],
  })
  tasks!: BrowserTaskResponseDto[];

  @ApiProperty({ description: 'Total number of tasks' })
  total!: number;

  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of tasks per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  hasNext!: boolean;

  @ApiProperty({ description: 'Whether there are previous pages' })
  hasPrevious!: boolean;
}

// Type aliases for backward compatibility
export type BrowserTaskDto = CreateBrowserTaskDto;
