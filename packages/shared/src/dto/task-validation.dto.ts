/**
 * Task Management DTOs with Enhanced Security Validation
 *
 * This module provides comprehensive DTOs for task management operations
 * with advanced security validation specifically designed for Bytebot-Agent
 * and cross-service task synchronization.
 *
 * @fileoverview Enhanced security task validation DTOs
 * @version 2.0.0
 * @author Specialized Input Validation Enhancement Subagent
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  IsDateString,
  ValidateNested,
  Min,
  Max,
  Length,
  IsUUID,
  IsJSON,
  ArrayMaxSize,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import {
  IsBytebotAgentSecureText,
  IsNotXSS,
  IsNotSQLInjection,
  IsSafeTextInput,
} from "../decorators/security-validation.decorators";

/**
 * Task status enumeration with security validation
 */
export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Task priority enumeration with security validation
 */
export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Task category enumeration with security validation
 */
export enum TaskCategory {
  COMPUTER_USE = "computer_use",
  DATA_PROCESSING = "data_processing",
  FILE_OPERATION = "file_operation",
  SYSTEM_ADMIN = "system_admin",
  USER_INTERFACE = "user_interface",
  INTEGRATION = "integration",
  VALIDATION = "validation",
  TESTING = "testing",
}

/**
 * Task metadata DTO with enhanced security validation
 */
export class TaskMetadataDto {
  @IsOptional()
  @IsString()
  @IsNotXSS({ message: "Creator field contains potential XSS content" })
  @Length(1, 100, { message: "Creator must be between 1 and 100 characters" })
  creator?: string;

  @IsOptional()
  @IsString()
  @IsNotXSS({ message: "Assigned user contains potential XSS content" })
  @Length(1, 100, {
    message: "Assigned user must be between 1 and 100 characters",
  })
  assignedTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: "Cannot have more than 20 tags" })
  @Length(1, 50, {
    message: "Each tag must be between 1 and 50 characters",
    each: true,
  })
  @IsNotXSS({ message: "Tags contain potential XSS content", each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber({}, { message: "Estimated duration must be a valid number" })
  @Min(0, { message: "Estimated duration cannot be negative" })
  @Max(86400000, {
    message: "Estimated duration cannot exceed 24 hours (86400000ms)",
  })
  estimatedDuration?: number;

  @IsOptional()
  @IsNumber({}, { message: "Actual duration must be a valid number" })
  @Min(0, { message: "Actual duration cannot be negative" })
  @Max(86400000, {
    message: "Actual duration cannot exceed 24 hours (86400000ms)",
  })
  actualDuration?: number;

  @IsOptional()
  @IsJSON({ message: "Context must be valid JSON" })
  @Length(0, 10000, {
    message: "Context JSON must not exceed 10000 characters",
  })
  context?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50, { message: "Cannot have more than 50 dependencies" })
  @IsUUID(4, { message: "Each dependency must be a valid UUID", each: true })
  dependencies?: string[];
}

/**
 * Create task DTO with comprehensive security validation
 */
export class CreateTaskDto {
  @IsString()
  @IsBytebotAgentSecureText({ message: "Task title contains unsafe content" })
  @Length(1, 200, {
    message: "Task title must be between 1 and 200 characters",
  })
  title!: string;

  @IsOptional()
  @IsString()
  @IsBytebotAgentSecureText({
    message: "Task description contains unsafe content",
  })
  @Length(0, 5000, {
    message: "Task description must not exceed 5000 characters",
  })
  description?: string;

  @IsEnum(TaskCategory, { message: "Category must be a valid task category" })
  category!: TaskCategory;

  @IsOptional()
  @IsEnum(TaskPriority, { message: "Priority must be a valid task priority" })
  priority?: TaskPriority;

  @IsOptional()
  @IsDateString({}, { message: "Due date must be a valid ISO date string" })
  dueDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskMetadataDto)
  metadata?: TaskMetadataDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100, { message: "Cannot have more than 100 important files" })
  @Length(1, 500, {
    message: "Each file path must be between 1 and 500 characters",
    each: true,
  })
  @IsSafeTextInput(true, {
    message: "File paths contain unsafe patterns",
    each: true,
  })
  importantFiles?: string[];

  @IsOptional()
  @IsJSON({ message: "Additional data must be valid JSON" })
  @Length(0, 50000, {
    message: "Additional data JSON must not exceed 50000 characters",
  })
  additionalData?: string;
}

/**
 * Update task DTO with enhanced security validation
 */
export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @IsBytebotAgentSecureText({ message: "Task title contains unsafe content" })
  @Length(1, 200, {
    message: "Task title must be between 1 and 200 characters",
  })
  title?: string;

  @IsOptional()
  @IsString()
  @IsBytebotAgentSecureText({
    message: "Task description contains unsafe content",
  })
  @Length(0, 5000, {
    message: "Task description must not exceed 5000 characters",
  })
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus, { message: "Status must be a valid task status" })
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(TaskPriority, { message: "Priority must be a valid task priority" })
  priority?: TaskPriority;

  @IsOptional()
  @IsEnum(TaskCategory, { message: "Category must be a valid task category" })
  category?: TaskCategory;

  @IsOptional()
  @IsDateString({}, { message: "Due date must be a valid ISO date string" })
  dueDate?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaskMetadataDto)
  metadata?: TaskMetadataDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100, { message: "Cannot have more than 100 important files" })
  @Length(1, 500, {
    message: "Each file path must be between 1 and 500 characters",
    each: true,
  })
  @IsSafeTextInput(true, {
    message: "File paths contain unsafe patterns",
    each: true,
  })
  importantFiles?: string[];

  @IsOptional()
  @IsJSON({ message: "Additional data must be valid JSON" })
  @Length(0, 50000, {
    message: "Additional data JSON must not exceed 50000 characters",
  })
  additionalData?: string;
}

/**
 * Task comment/note DTO with security validation
 */
export class TaskCommentDto {
  @IsString()
  @IsBytebotAgentSecureText({
    message: "Comment content contains unsafe content",
  })
  @Length(1, 2000, { message: "Comment must be between 1 and 2000 characters" })
  content!: string;

  @IsOptional()
  @IsString()
  @IsNotXSS({ message: "Author field contains potential XSS content" })
  @Length(1, 100, { message: "Author must be between 1 and 100 characters" })
  author?: string;

  @IsOptional()
  @IsEnum(TaskCategory, {
    message: "Comment type must be a valid task category",
  })
  type?: TaskCategory;

  @IsOptional()
  @IsJSON({ message: "Comment metadata must be valid JSON" })
  @Length(0, 1000, {
    message: "Comment metadata JSON must not exceed 1000 characters",
  })
  metadata?: string;
}

/**
 * Task search/filter DTO with security validation
 */
export class TaskSearchDto {
  @IsOptional()
  @IsString()
  @IsSafeTextInput(false, { message: "Search query contains unsafe content" })
  @Length(1, 100, {
    message: "Search query must be between 1 and 100 characters",
  })
  query?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TaskStatus, {
    each: true,
    message: "Each status must be a valid task status",
  })
  @ArrayMaxSize(10, { message: "Cannot filter by more than 10 statuses" })
  statuses?: TaskStatus[];

  @IsOptional()
  @IsArray()
  @IsEnum(TaskCategory, {
    each: true,
    message: "Each category must be a valid task category",
  })
  @ArrayMaxSize(10, { message: "Cannot filter by more than 10 categories" })
  categories?: TaskCategory[];

  @IsOptional()
  @IsArray()
  @IsEnum(TaskPriority, {
    each: true,
    message: "Each priority must be a valid task priority",
  })
  @ArrayMaxSize(5, { message: "Cannot filter by more than 5 priorities" })
  priorities?: TaskPriority[];

  @IsOptional()
  @IsString()
  @IsNotXSS({ message: "Assigned to field contains potential XSS content" })
  @Length(1, 100, {
    message: "Assigned to must be between 1 and 100 characters",
  })
  assignedTo?: string;

  @IsOptional()
  @IsDateString({}, { message: "Date from must be a valid ISO date string" })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: "Date to must be a valid ISO date string" })
  dateTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20, { message: "Cannot filter by more than 20 tags" })
  @Length(1, 50, {
    message: "Each tag must be between 1 and 50 characters",
    each: true,
  })
  @IsNotXSS({ message: "Tags contain potential XSS content", each: true })
  tags?: string[];

  @IsOptional()
  @IsNumber({}, { message: "Page must be a valid number" })
  @Min(1, { message: "Page must be at least 1" })
  @Max(10000, { message: "Page cannot exceed 10000" })
  page?: number;

  @IsOptional()
  @IsNumber({}, { message: "Limit must be a valid number" })
  @Min(1, { message: "Limit must be at least 1" })
  @Max(1000, { message: "Limit cannot exceed 1000" })
  limit?: number;
}

/**
 * Task execution result DTO with security validation
 */
export class TaskExecutionResultDto {
  @IsBoolean({ message: "Success must be a boolean value" })
  success!: boolean;

  @IsOptional()
  @IsString()
  @IsSafeTextInput(true, { message: "Result message contains unsafe content" })
  @Length(0, 2000, {
    message: "Result message must not exceed 2000 characters",
  })
  message?: string;

  @IsOptional()
  @IsJSON({ message: "Result data must be valid JSON" })
  @Length(0, 100000, {
    message: "Result data JSON must not exceed 100000 characters",
  })
  data?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100, { message: "Cannot have more than 100 error messages" })
  @Length(1, 500, {
    message: "Each error must be between 1 and 500 characters",
    each: true,
  })
  @IsSafeTextInput(false, {
    message: "Error messages contain unsafe content",
    each: true,
  })
  errors?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(100, { message: "Cannot have more than 100 warnings" })
  @Length(1, 500, {
    message: "Each warning must be between 1 and 500 characters",
    each: true,
  })
  @IsSafeTextInput(false, {
    message: "Warnings contain unsafe content",
    each: true,
  })
  warnings?: string[];

  @IsOptional()
  @IsNumber({}, { message: "Execution time must be a valid number" })
  @Min(0, { message: "Execution time cannot be negative" })
  @Max(86400000, {
    message: "Execution time cannot exceed 24 hours (86400000ms)",
  })
  executionTimeMs?: number;

  @IsOptional()
  @IsJSON({ message: "Performance metrics must be valid JSON" })
  @Length(0, 10000, {
    message: "Performance metrics JSON must not exceed 10000 characters",
  })
  performanceMetrics?: string;
}

/**
 * Batch task operation DTO with security validation
 */
export class BatchTaskOperationDto {
  @IsArray()
  @IsUUID(4, { message: "Each task ID must be a valid UUID", each: true })
  @ArrayMinSize(1, { message: "At least one task ID is required" })
  @ArrayMaxSize(100, {
    message: "Cannot operate on more than 100 tasks at once",
  })
  taskIds!: string[];

  @IsEnum(["update", "delete", "execute", "cancel"], {
    message: "Operation must be one of: update, delete, execute, cancel",
  })
  operation!: "update" | "delete" | "execute" | "cancel";

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateTaskDto)
  updateData?: UpdateTaskDto;

  @IsOptional()
  @IsString()
  @IsSafeTextInput(false, { message: "Reason contains unsafe content" })
  @Length(0, 500, { message: "Reason must not exceed 500 characters" })
  reason?: string;
}

export default {
  // Enums
  TaskStatus,
  TaskPriority,
  TaskCategory,

  // DTOs
  TaskMetadataDto,
  CreateTaskDto,
  UpdateTaskDto,
  TaskCommentDto,
  TaskSearchDto,
  TaskExecutionResultDto,
  BatchTaskOperationDto,
};
