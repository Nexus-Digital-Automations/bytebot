/**
 * Enhanced Job Status DTOs - Enterprise-Grade Status Management
 *
 * Comprehensive data transfer objects for advanced job status tracking,
 * real-time progress monitoring, and detailed execution analytics.
 *
 * Features:
 * - Multi-dimensional progress tracking with subtask support
 * - Real-time performance metrics and resource monitoring
 * - Detailed error information with recovery suggestions
 * - Comprehensive execution timeline and ETA calculation
 * - Audit trail integration and history tracking
 * - Advanced metadata and context preservation
 *
 * @author Claude Code - Job Management Specialist
 * @version 1.0.0
 */

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';import { Type } from 'class-transformer';import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { JobStatus, JobPriority } from './async-job.dto';/*** Enhanced job progress tracking with subtask support
 */
export class JobProgressDetailsDto {
  @ApiPropertyOptional({
    description: 'Current execution step description',example: 'Capturing screenshot of target element',})@IsOptional()
  @IsString()
  currentStep?: string;

  @ApiPropertyOptional({
    description: 'Total number of execution steps',example: 5,})
  @IsOptional()
  @IsNumber()
  @Min(1)
  totalSteps?: number;

  @ApiPropertyOptional({
    description: 'Current step index (0-based)',example: 2,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStepIndex?: number;

  @ApiPropertyOptional({
    description: 'Estimated time remaining in milliseconds',example: 15000,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedTimeRemaining?: number;

  @ApiPropertyOptional({
    description: 'Subtask progress details',type: [SubtaskProgressDto],})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubtaskProgressDto)
  subtasks?: SubtaskProgressDto[];
}

/**
 * Individual subtask progress information
 */
export class SubtaskProgressDto {
  @ApiProperty({
    description: 'Subtask name or identifier',example: 'element-location',})@IsString()
  name: string = '';@ApiProperty({description: 'Subtask status',enum: JobStatus,example: JobStatus.COMPLETED,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.PENDING;

  @ApiProperty({
    description: 'Subtask progress percentage (0-100)',example: 85,})
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number = 0;

  @ApiPropertyOptional({
    description: 'Subtask execution time in milliseconds',example: 1250,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  executionTimeMs?: number;

  @ApiPropertyOptional({
    description: 'Subtask error message if failed',example: 'Element not found within timeout',})@IsOptional()
  @IsString()
  errorMessage?: string;
}

/**
 * Detailed execution timestamps for job lifecycle tracking
 */
export class JobTimestampsDto {
  @ApiProperty({
    description: 'Job submission timestamp',example: '2023-12-19T10:30:45.789Z',})@IsDateString()
  submitted: string = '';@ApiPropertyOptional({description: 'Job execution start timestamp',example: '2023-12-19T10:30:46.123Z',})@IsOptional()
  @IsDateString()
  started?: string;

  @ApiProperty({
    description: 'Last status update timestamp',example: '2023-12-19T10:31:10.456Z',})@IsDateString()
  lastUpdated: string = '';@ApiPropertyOptional({description: 'Job completion timestamp',example: '2023-12-19T10:31:15.789Z',})@IsOptional()
  @IsDateString()
  completed?: string;

  @ApiPropertyOptional({
    description: 'Next retry attempt timestamp (if applicable)',example: '2023-12-19T10:35:00.000Z',})@IsOptional()
  @IsDateString()
  nextRetry?: string;
}

/**
 * Real-time performance metrics during job execution
 */
export class JobPerformanceMetricsDto {
  @ApiPropertyOptional({
    description: 'Total execution time in milliseconds',example: 30123,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  executionTimeMs?: number;

  @ApiPropertyOptional({
    description: 'Peak memory usage in megabytes',example: 45.7,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  memoryUsageMB?: number;

  @ApiPropertyOptional({
    description: 'Average CPU usage percentage',example: 12.5,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  cpuUsagePercent?: number;

  @ApiPropertyOptional({
    description: 'Network bytes transferred',example: 1048576,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  networkBytesTransferred?: number;

  @ApiPropertyOptional({
    description: 'Disk I/O operations count',example: 25,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  diskIOOperations?: number;
}

/**
 * Comprehensive error information with recovery guidance
 */
export class JobErrorDetailsDto {
  @ApiProperty({
    description: 'Error message',example: 'Element not found: Unable to locate target element within timeout',})@IsString()
  message: string = '';@ApiProperty({description: 'Error code for categorization',example: 'ELEMENT_NOT_FOUND',})@IsString()
  code: string = '';@ApiPropertyOptional({description: 'Error stack trace (for debugging)',example: 'Error: Element not found\at ComputerUseService.findElement...',})
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiProperty({
    description: 'Whether this error is retryable',example: true,})
  @IsBoolean()
  retryable: boolean = false;

  @ApiPropertyOptional({
    description: 'Suggested retry delay in milliseconds',example: 5000,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  retryDelayMs?: number;

  @ApiPropertyOptional({
    description: 'Recovery suggestions for the user',example: ['Ensure the target element is visible', 'Check element selector accuracy', 'Increase timeout value'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  recoverySuggestions?: string[];

  @ApiPropertyOptional({
    description: 'Error context and additional information',})@IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}

/**
 * Enhanced job status response with comprehensive tracking
 */
export class EnhancedJobStatusResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Current job status',enum: JobStatus,example: JobStatus.IN_PROGRESS,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.PENDING;

  @ApiProperty({
    description: 'Overall job progress percentage (0-100)',example: 65,})
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number = 0;

  @ApiPropertyOptional({
    description: 'Detailed progress information with subtasks',type: JobProgressDetailsDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => JobProgressDetailsDto)
  progressDetails?: JobProgressDetailsDto;

  @ApiProperty({
    description: 'Job execution timestamps',type: JobTimestampsDto,})
  @ValidateNested()
  @Type(() => JobTimestampsDto)
  timestamps: JobTimestampsDto = new JobTimestampsDto();

  @ApiPropertyOptional({
    description: 'Real-time performance metrics',type: JobPerformanceMetricsDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => JobPerformanceMetricsDto)
  performance?: JobPerformanceMetricsDto;

  @ApiPropertyOptional({
    description: 'Detailed error information if job failed',type: JobErrorDetailsDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => JobErrorDetailsDto)
  error?: JobErrorDetailsDto;

  @ApiProperty({
    description: 'Job priority level',enum: JobPriority,example: JobPriority.NORMAL,
  })
  @IsEnum(JobPriority)
  priority: JobPriority = JobPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Custom job metadata and context',example: {userId: 'user123',sessionId: 'session456',retryCount: 1,cacheEnabled: true,
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Job tags for categorization and filtering',example: ['automation', 'screenshot', 'high-priority'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'User ID who submitted the job',example: 'user_123',})@IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for request correlation',example: 'session_456',})@IsOptional()
  @IsString()
  sessionId?: string;
}

/**
 * Job analytics and statistical information
 */
export class JobAnalyticsDto {
  @ApiProperty({
    description: 'Job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Execution performance metrics',type: Object,})
  @IsObject()
  executionMetrics: {
    totalTimeMs: number;
    queueTimeMs: number;
    processingTimeMs: number;
    memoryPeakMB: number;
    cpuAveragePercent: number;
  } = {
    totalTimeMs: 0,
    queueTimeMs: 0,
    processingTimeMs: 0,
    memoryPeakMB: 0,
    cpuAveragePercent: 0,
  };

  @ApiProperty({
    description: 'Cache utilization metrics',type: Object,})
  @IsObject()
  cacheMetrics: {
    hitRate: number;
    missCount: number;
    evictionCount: number;
  } = {
    hitRate: 0,
    missCount: 0,
    evictionCount: 0,
  };

  @ApiProperty({
    description: 'Error and retry statistics',type: Object,})
  @IsObject()
  errorMetrics: {
    errorCount: number;
    retryCount: number;
    lastErrorCode?: string;
  } = {
    errorCount: 0,
    retryCount: 0,
  };

  @ApiProperty({
    description: 'Resource utilization metrics',type: Object,})
  @IsObject()
  resourceMetrics: {
    diskUsageMB: number;
    networkBytesIn: number;
    networkBytesOut: number;
  } = {
    diskUsageMB: 0,
    networkBytesIn: 0,
    networkBytesOut: 0,
  };

  @ApiPropertyOptional({
    description: 'Comparison with historical performance',type: Object,})
  @IsOptional()
  @IsObject()
  historicalComparison?: {
    averageExecutionTimeMs: number;
    performancePercentile: number;
    efficiency: number;
  };
}

/**
 * Real-time job status update notification
 */
export class JobStatusUpdateNotificationDto {
  @ApiProperty({
    description: 'Job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Updated job status',enum: JobStatus,example: JobStatus.IN_PROGRESS,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.PENDING;

  @ApiProperty({
    description: 'Updated progress percentage',example: 75,})
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number = 0;

  @ApiProperty({
    description: 'Update timestamp',example: '2023-12-19T10:31:10.456Z',})@IsDateString()
  timestamp: string = '';@ApiPropertyOptional({description: 'Update message or description',example: 'Element located successfully, proceeding with interaction',})@IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Update metadata',example: { step: 'element-interaction', confidence: 0.95 },})@IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Job execution history entry
 */
export class JobHistoryEntryDto {
  @ApiProperty({
    description: 'History entry timestamp',example: '2023-12-19T10:30:46.123Z',})@IsDateString()
  timestamp: string = '';@ApiProperty({description: 'History event type',enum: ['created', 'started', 'progress', 'completed', 'failed', 'cancelled', 'retried'],example: 'started',})@IsEnum(['created', 'started', 'progress', 'completed', 'failed', 'cancelled', 'retried'])event: string = '';@ApiPropertyOptional({description: 'User ID who triggered the event',example: 'user_123',})@IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for event correlation',example: 'session_456',})@IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({
    description: 'Event data and context',example: { status: 'in_progress', progress: 25, step: 'initialization' },})@IsObject()
  data: Record<string, unknown> = {};

  @ApiProperty({
    description: 'Event source',enum: ['system', 'user', 'webhook', 'scheduler'],example: 'system',})@IsEnum(['system', 'user', 'webhook', 'scheduler'])source: string = 'system';@ApiPropertyOptional({description: 'Client information for the event',type: Object,})
  @IsOptional()
  @IsObject()
  clientInfo?: {
    userAgent?: string;
    ipAddress?: string;
    requestId?: string;
  };
}

/**
 * Bulk job status request for multiple jobs
 */
export class BulkJobStatusRequestDto {
  @ApiProperty({
    description: 'List of job IDs to query',example: ['job_1702983456789_abc123', 'job_1702983456790_def456'],})@IsArray()
  @IsString({ each: true })
  @IsUUID('4', { each: true })jobIds: string[] = [];@ApiPropertyOptional({
    description: 'Include detailed progress information',example: true,default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeProgressDetails?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include performance metrics',example: true,default: false,
  })
  @IsOptional()
  @IsBoolean()
  includePerformanceMetrics?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include job history',example: false,default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeHistory?: boolean = false;
}

/**
 * Bulk job status response
 */
export class BulkJobStatusResponseDto {
  @ApiProperty({
    description: 'Job status results',type: [EnhancedJobStatusResponseDto],})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnhancedJobStatusResponseDto)
  jobs: EnhancedJobStatusResponseDto[] = [];

  @ApiProperty({
    description: 'Request processing timestamp',example: '2023-12-19T10:31:15.789Z',})@IsDateString()
  timestamp: string = '';@ApiProperty({description: 'Total jobs requested',example: 5,})
  @IsNumber()
  @Min(0)
  totalRequested: number = 0;

  @ApiProperty({
    description: 'Total jobs found',example: 4,})
  @IsNumber()
  @Min(0)
  totalFound: number = 0;

  @ApiPropertyOptional({
    description: 'Job IDs not found',example: ['job_1702983456791_ghi789'],})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  notFound?: string[];

  @ApiProperty({
    description: 'Query execution time in milliseconds',
    example: 125,
  })
  @IsNumber()
  @Min(0)
  executionTimeMs: number = 0;
}