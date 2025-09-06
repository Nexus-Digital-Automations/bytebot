/**
 * Task Data Transfer Objects - API Version-Aware DTOs
 *
 * This module provides versioned DTOs for task-related API endpoints,
 * demonstrating proper API versioning patterns and OpenAPI documentation.
 *
 * @fileoverview Versioned task DTOs with OpenAPI documentation
 * @version 1.0.0
 * @author API Versioning & Documentation Specialist
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  Length,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ApiProperty,
  ApiPropertyOptional,
  PartialType,
  OmitType,
  PickType,
} from '@nestjs/swagger';

/**
 * Task status enumeration
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Task priority enumeration
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Task category enumeration
 */
export enum TaskCategory {
  COMPUTER_USE = 'computer_use',
  FILE_PROCESSING = 'file_processing',
  SYSTEM_OPERATION = 'system_operation',
  USER_REQUEST = 'user_request',
  AUTOMATED = 'automated',
}

/**
 * Base task metadata
 */
export class TaskMetadata {
  @ApiPropertyOptional({
    description: 'Estimated execution time in seconds',
    example: 30,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Task tags for organization',
    example: ['automation', 'urgent'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Custom metadata object',
    example: { source: 'api', userId: '12345' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Create Task DTO - Version 1
 */
export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Process document upload',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  title: string;

  @ApiPropertyOptional({
    description: 'Detailed task description',
    example: 'Extract text from uploaded PDF and create summary',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;

  @ApiProperty({
    description: 'Task category',
    enum: TaskCategory,
    example: TaskCategory.FILE_PROCESSING,
  })
  @IsEnum(TaskCategory)
  category: TaskCategory;

  @ApiPropertyOptional({
    description: 'Task priority level',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Scheduled execution time',
    example: '2024-01-01T12:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({
    description: 'Task metadata and configuration',
    type: TaskMetadata,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskMetadata)
  metadata?: TaskMetadata;
}

/**
 * Create Task DTO - Version 2 (Enhanced)
 */
export class CreateTaskDtoV2 extends CreateTaskDto {
  @ApiPropertyOptional({
    description: 'Parent task ID for subtask relationships',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({
    description: 'Task dependencies (must complete before this task)',
    example: ['task-111', 'task-222'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Enable real-time progress updates via WebSocket',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enableRealTimeUpdates?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum execution time in seconds (auto-timeout)',
    example: 300,
    minimum: 10,
    maximum: 3600,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(3600)
  maxExecutionTime?: number;

  @ApiPropertyOptional({
    description: 'Retry configuration',
    example: { maxAttempts: 3, backoffMultiplier: 2 },
  })
  @IsOptional()
  retryConfig?: {
    maxAttempts: number;
    backoffMultiplier?: number;
    retryOnFailure?: boolean;
  };
}

/**
 * Update Task DTO - Version 1
 */
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, ['category'] as const),
) {
  @ApiPropertyOptional({
    description: 'Task status update',
    enum: TaskStatus,
    example: TaskStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Task progress percentage (0-100)',
    example: 75,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({
    description: 'Execution result or error message',
    example: 'Task completed successfully',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  result?: string;
}

/**
 * Update Task DTO - Version 2
 */
export class UpdateTaskDtoV2 extends UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Actual execution time in seconds',
    example: 45,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualExecutionTime?: number;

  @ApiPropertyOptional({
    description: 'Resource usage statistics',
    example: { cpuUsage: 25.5, memoryUsage: 128 },
  })
  @IsOptional()
  resourceUsage?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
  };

  @ApiPropertyOptional({
    description: 'Detailed execution logs',
    example: ['Started processing', 'Completed step 1', 'Task finished'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  executionLogs?: string[];
}

/**
 * Task response DTO - Version 1
 */
export class TaskResponseDto {
  @ApiProperty({
    description: 'Unique task identifier',
    example: 'task-123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Task title',
    example: 'Process document upload',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Extract text from uploaded PDF and create summary',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Current task status',
    enum: TaskStatus,
    example: TaskStatus.COMPLETED,
  })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiProperty({
    description: 'Task category',
    enum: TaskCategory,
    example: TaskCategory.FILE_PROCESSING,
  })
  @IsEnum(TaskCategory)
  category: TaskCategory;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
    example: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Task progress (0-100)',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  progress?: number;

  @ApiProperty({
    description: 'Task creation timestamp',
    example: '2024-01-01T10:00:00Z',
  })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Task completion timestamp',
    example: '2024-01-01T10:05:00Z',
  })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Task result or error message',
    example: 'Task completed successfully',
  })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({
    description: 'Task metadata',
    type: TaskMetadata,
  })
  @IsOptional()
  metadata?: TaskMetadata;
}

/**
 * Task response DTO - Version 2 (Enhanced)
 */
export class TaskResponseDtoV2 extends TaskResponseDto {
  @ApiPropertyOptional({
    description: 'Parent task ID',
    example: 'task-parent-123',
  })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({
    description: 'Child task IDs',
    example: ['task-child-1', 'task-child-2'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  childTaskIds?: string[];

  @ApiPropertyOptional({
    description: 'Task dependencies',
    example: ['task-dep-1', 'task-dep-2'],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Actual execution time in seconds',
    example: 45,
  })
  @IsOptional()
  @IsNumber()
  actualExecutionTime?: number;

  @ApiPropertyOptional({
    description: 'Resource usage statistics',
  })
  @IsOptional()
  resourceUsage?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
  };

  @ApiPropertyOptional({
    description: 'WebSocket channel for real-time updates',
    example: 'task-updates-123e4567',
  })
  @IsOptional()
  @IsString()
  websocketChannel?: string;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2024-01-01T10:05:00Z',
  })
  @IsDateString()
  updatedAt: string;
}

/**
 * Task list query DTO
 */
export class TaskQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by task status',
    enum: TaskStatus,
    example: TaskStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Filter by task category',
    enum: TaskCategory,
    example: TaskCategory.COMPUTER_USE,
  })
  @IsOptional()
  @IsEnum(TaskCategory)
  category?: TaskCategory;

  @ApiPropertyOptional({
    description: 'Filter by priority',
    enum: TaskPriority,
    example: TaskPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    enum: ['createdAt', 'updatedAt', 'priority', 'status'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status' = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Paginated task response
 */
export class PaginatedTaskResponseDto<T = TaskResponseDto> {
  @ApiProperty({
    description: 'Array of tasks',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 20,
      total: 100,
      pages: 5,
    },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default {
  CreateTaskDto,
  CreateTaskDtoV2,
  UpdateTaskDto,
  UpdateTaskDtoV2,
  TaskResponseDto,
  TaskResponseDtoV2,
  TaskQueryDto,
  PaginatedTaskResponseDto,
  TaskStatus,
  TaskPriority,
  TaskCategory,
};
