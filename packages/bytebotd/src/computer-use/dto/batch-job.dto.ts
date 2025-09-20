/**
 * Batch Job Management DTOs
 *
 * Enterprise-grade DTOs for batch job submission, dependency management,
 * and advanced job filtering capabilities.
 */

import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
  IsUUID,
} from 'class-validator';import { Type } from 'class-transformer';import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { JobPriority, JobStatus } from './async-job.dto';import { ComputerActionDto } from './computer-action.dto';/*** Job dependency relationship types
 */
export enum DependencyType {
  SEQUENTIAL = 'sequential', // Job must wait for dependency to completeCONDITIONAL = 'conditional', // Job runs only if dependency succeedsPARALLEL = 'parallel', // Job can run in parallel but starts after dependency}/**
 * Job execution mode for batch operations
 */
export enum BatchExecutionMode {
  SEQUENTIAL = 'sequential', // Execute jobs one after anotherPARALLEL = 'parallel', // Execute all jobs simultaneouslyMIXED = 'mixed', // Use job-specific dependencies and priorities}/**
 * Single job dependency definition
 */
export class JobDependencyDto {
  @ApiProperty({
    description: 'Job ID that this job depends on',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')dependsOnJobId: string = '';@ApiProperty({description: 'Type of dependency relationship',enum: DependencyType,example: DependencyType.SEQUENTIAL,
  })
  @IsEnum(DependencyType)
  type: DependencyType = DependencyType.SEQUENTIAL;

  @ApiPropertyOptional({
    description: 'Condition for conditional dependencies',example: 'result.success === true',})@IsOptional()
  @IsString()
  condition?: string;
}

/**
 * Individual job specification for batch submission
 */
export class BatchJobSpecDto {
  @ApiProperty({
    description: 'Unique identifier for this job within the batch',example: 'screenshot-job-1',})@IsString()
  jobKey: string = '';@ApiProperty({description: 'Computer action to execute',type: ComputerActionDto,})
  @ValidateNested()
  @Type(() => ComputerActionDto)
  action: ComputerActionDto = new ComputerActionDto();

  @ApiPropertyOptional({
    description: 'Job priority for queue management',enum: JobPriority,example: JobPriority.NORMAL,
    default: JobPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority = JobPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Maximum execution timeout in milliseconds',example: 30000,default: 30000,
  })
  @IsOptional()
  @Min(1000)
  @Max(300000)
  timeout?: number = 30000;

  @ApiPropertyOptional({
    description: 'Whether to use cached results if available',example: true,default: false,
  })
  @IsOptional()
  @IsBoolean()
  useCache?: boolean = false;

  @ApiPropertyOptional({
    description: 'Job dependencies within this batch',type: [JobDependencyDto],})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobDependencyDto)
  dependencies?: JobDependencyDto[];

  @ApiPropertyOptional({
    description: 'Custom metadata for job tracking',example: { stepName: 'capture-screen', retryable: true },})@IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * Batch job submission request DTO
 */
export class BatchJobSubmissionDto {
  @ApiProperty({
    description: 'Array of jobs to execute as a batch',type: [BatchJobSpecDto],minimum: 1,
    maximum: 50,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BatchJobSpecDto)
  jobs: BatchJobSpecDto[] = [];

  @ApiProperty({
    description: 'Execution mode for the batch',enum: BatchExecutionMode,example: BatchExecutionMode.MIXED,
    default: BatchExecutionMode.MIXED,
  })
  @IsEnum(BatchExecutionMode)
  executionMode: BatchExecutionMode = BatchExecutionMode.MIXED;

  @ApiPropertyOptional({
    description: 'Overall batch priority',enum: JobPriority,example: JobPriority.NORMAL,
    default: JobPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(JobPriority)
  batchPriority?: JobPriority = JobPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Maximum total execution time for entire batch',example: 300000,default: 300000,
  })
  @IsOptional()
  @Min(5000)
  @Max(3600000)
  batchTimeout?: number = 300000;

  @ApiPropertyOptional({
    description: 'Whether to stop batch execution on first job failure',example: false,default: false,
  })
  @IsOptional()
  @IsBoolean()
  stopOnFirstFailure?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom metadata for batch tracking',example: { workflowName: 'ui-automation', userId: 'user123' },})@IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * Batch job submission response DTO
 */
export class BatchJobSubmissionResponseDto {
  @ApiProperty({
    description: 'Unique batch identifier',example: 'batch_1702983456789_xyz789',})@IsString()
  batchId: string = '';@ApiProperty({description: 'Individual job IDs within the batch',example: {'screenshot-job-1': 'job_1702983456789_abc123','click-job-2': 'job_1702983456790_def456',},})
  jobIds: Record<string, string> = {};

  @ApiProperty({
    description: 'Total number of jobs in batch',example: 5,})
  @IsNumber()
  totalJobs: number = 0;

  @ApiProperty({
    description: 'Batch execution mode used',enum: BatchExecutionMode,example: BatchExecutionMode.MIXED,
  })
  @IsEnum(BatchExecutionMode)
  executionMode: BatchExecutionMode = BatchExecutionMode.MIXED;

  @ApiProperty({
    description: 'Timestamp when batch was submitted',example: '2023-12-19T10:30:45.789Z',})@IsDateString()
  submittedAt: string = '';@ApiPropertyOptional({description: 'Estimated completion time for entire batch',example: '2023-12-19T10:35:45.789Z',})@IsOptional()
  @IsDateString()
  estimatedCompletionAt?: string;
}

/**
 * Job search and filtering criteria DTO
 */
export class JobSearchCriteriaDto {
  @ApiPropertyOptional({
    description: 'Filter by job status',enum: JobStatus,example: JobStatus.COMPLETED,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Filter by job priority',enum: JobPriority,example: JobPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @ApiPropertyOptional({
    description: 'Filter by computer action type',example: 'screenshot',})@IsOptional()
  @IsString()
  actionType?: string;

  @ApiPropertyOptional({
    description: 'Filter by user ID',example: 'user123',})@IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter jobs submitted after this date',example: '2023-12-19T00:00:00.000Z',})@IsOptional()
  @IsDateString()
  submittedAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter jobs submitted before this date',example: '2023-12-19T23:59:59.999Z',})@IsOptional()
  @IsDateString()
  submittedBefore?: string;

  @ApiPropertyOptional({
    description: 'Filter jobs with execution time greater than (ms)',example: 5000,})
  @IsOptional()
  @Min(0)
  executionTimeGte?: number;

  @ApiPropertyOptional({
    description: 'Filter jobs with execution time less than (ms)',example: 30000,})
  @IsOptional()
  @Min(0)
  executionTimeLte?: number;

  @ApiPropertyOptional({
    description: 'Search term for job metadata or error messages',example: 'screenshot',})@IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({
    description: 'Filter by batch ID',example: 'batch_1702983456789_xyz789',})@IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({
    description: 'Number of results per page',example: 20,minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of results to skip (for pagination)',example: 0,minimum: 0,
    default: 0,
  })
  @IsOptional()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Sort field',example: 'submittedAt',enum: ['submittedAt', 'completedAt', 'executionTime', 'priority', 'status'],})@IsOptional()
  @IsString()
  sortBy?: string = 'submittedAt';@ApiPropertyOptional({description: 'Sort order',example: 'desc',enum: ['asc', 'desc'],})@IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';}/**
 * Job search results response DTO
 */
export class JobSearchResultsDto {
  @ApiProperty({
    description: 'Array of matching jobs',type: [Object], // Will be JobStatusResponseDto[]})
  jobs: unknown[] = [];

  @ApiProperty({
    description: 'Total number of matching jobs (before pagination)',example: 156,})
  @IsNumber()
  totalCount: number = 0;

  @ApiProperty({
    description: 'Number of results per page',example: 20,})
  @IsNumber()
  limit: number = 20;

  @ApiProperty({
    description: 'Number of results skipped',example: 0,})
  @IsNumber()
  offset: number = 0;

  @ApiProperty({
    description: 'Whether there are more results available',example: true,})
  @IsBoolean()
  hasMore: boolean = false;

  @ApiProperty({
    description: 'Search criteria used',type: JobSearchCriteriaDto,})
  @ValidateNested()
  @Type(() => JobSearchCriteriaDto)
  criteria: JobSearchCriteriaDto = new JobSearchCriteriaDto();
}

/**
 * Job analytics summary DTO
 */
export class JobAnalyticsDto {
  @ApiProperty({
    description: 'Total number of jobs in timeframe',example: 1250,})
  @IsNumber()
  totalJobs: number = 0;

  @ApiProperty({
    description: 'Number of completed jobs',example: 1100,})
  @IsNumber()
  completedJobs: number = 0;

  @ApiProperty({
    description: 'Number of failed jobs',example: 50,})
  @IsNumber()
  failedJobs: number = 0;

  @ApiProperty({
    description: 'Number of cancelled jobs',example: 25,})
  @IsNumber()
  cancelledJobs: number = 0;

  @ApiProperty({
    description: 'Number of jobs currently pending',example: 75,})
  @IsNumber()
  pendingJobs: number = 0;

  @ApiProperty({
    description: 'Number of jobs currently in progress',example: 15,})
  @IsNumber()
  inProgressJobs: number = 0;

  @ApiProperty({
    description: 'Average execution time in milliseconds',example: 2456.7,})
  @IsNumber()
  averageExecutionTime: number = 0;

  @ApiProperty({
    description: 'Median execution time in milliseconds',example: 1850.0,})
  @IsNumber()
  medianExecutionTime: number = 0;

  @ApiProperty({
    description: 'Success rate as percentage',example: 92.5,})
  @IsNumber()
  successRate: number = 0;

  @ApiProperty({
    description: 'Jobs per action type breakdown',example: {screenshot: 450,
      click: 320,
      type: 280,
      scroll: 200,
    },
  })
  actionTypeBreakdown: Record<string, number> = {};

  @ApiProperty({
    description: 'Jobs per priority breakdown',example: {urgent: 50,
      high: 200,
      normal: 800,
      low: 200,
    },
  })
  priorityBreakdown: Record<string, number> = {};

  @ApiProperty({
    description: 'Performance trends over time (hourly)',example: [{ hour: '2023-12-19T10:00:00Z', jobCount: 45, avgExecutionTime: 2300 },{ hour: '2023-12-19T11:00:00Z', jobCount: 52, avgExecutionTime: 2150 },],})
  performanceTrends: Array<{
    hour: string;
    jobCount: number;
    avgExecutionTime: number;
  }> = [];
}

/**
 * Real-time job progress update DTO
 */
export class JobProgressUpdateDto {
  @ApiProperty({
    description: 'Job identifier',example: 'job_1702983456789_abc123',})@IsString()
  @IsUUID('4')jobId: string = '';@ApiProperty({description: 'Current progress percentage (0-100)',example: 75,})
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number = 0;

  @ApiProperty({
    description: 'Current job status',enum: JobStatus,example: JobStatus.IN_PROGRESS,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.PENDING;

  @ApiPropertyOptional({
    description: 'Current step or operation description',example: 'Processing image recognition...',})@IsOptional()
  @IsString()
  currentStep?: string;

  @ApiPropertyOptional({
    description: 'Estimated completion time',example: '2023-12-19T10:31:15.789Z',})@IsOptional()
  @IsDateString()
  estimatedCompletion?: string;

  @ApiPropertyOptional({
    description: 'Additional progress metadata',example: { stepsCompleted: 3, totalSteps: 5 },})
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Timestamp of this progress update',example: '2023-12-19T10:30:55.123Z',
  })
  @IsDateString()
  timestamp: string = new Date().toISOString();
}