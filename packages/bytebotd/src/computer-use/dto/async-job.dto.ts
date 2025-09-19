import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Job status enumeration for async operations
 */
export enum JobStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Job priority enumeration for queue management
 */
export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Job submission response DTO
 */
export class JobSubmissionResponseDto {
  @ApiProperty({
    description: 'Unique job identifier for tracking and status queries',
    example: 'job_1702983456789_abc123',
  })
  @IsString()
  @IsUUID('4', { message: 'Job ID must be a valid UUID v4' })
  jobId: string = '';

  @ApiProperty({
    description: 'Current job status at submission time',
    enum: JobStatus,
    example: JobStatus.PENDING,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.PENDING;

  @ApiProperty({
    description: 'Timestamp when job was submitted',
    example: '2023-12-19T10:30:45.789Z',
  })
  @IsString()
  submittedAt: string = '';

  @ApiPropertyOptional({
    description: 'Estimated completion time (optional)',
    example: '2023-12-19T10:31:15.789Z',
  })
  @IsOptional()
  @IsString()
  estimatedCompletionAt?: string;
}

/**
 * Job status response DTO
 */
export class JobStatusResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @IsString()
  @IsUUID('4')
  jobId: string = '';

  @ApiProperty({
    description: 'Current job status',
    enum: JobStatus,
    example: JobStatus.IN_PROGRESS,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.PENDING;

  @ApiProperty({
    description: 'Job progress percentage (0-100)',
    example: 75,
  })
  progress: number = 0;

  @ApiProperty({
    description: 'Timestamp when job was submitted',
    example: '2023-12-19T10:30:45.789Z',
  })
  @IsString()
  submittedAt: string = '';

  @ApiPropertyOptional({
    description: 'Timestamp when job started processing',
    example: '2023-12-19T10:30:46.123Z',
  })
  @IsOptional()
  @IsString()
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when job completed (success or failure)',
    example: '2023-12-19T10:31:15.456Z',
  })
  @IsOptional()
  @IsString()
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Error message if job failed',
    example: 'Action execution failed: Mouse movement timeout',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional job metadata',
    example: { retryCount: 1, priority: 'normal' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * Job result response DTO
 */
export class JobResultResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @IsString()
  @IsUUID('4')
  jobId: string = '';

  @ApiProperty({
    description: 'Final job status',
    enum: JobStatus,
    example: JobStatus.COMPLETED,
  })
  @IsEnum(JobStatus)
  status: JobStatus = JobStatus.PENDING;

  @ApiPropertyOptional({
    description: 'Job execution result data (varies by action type)',
    example: {
      image: 'base64-screenshot-data',
      metadata: { width: 1920, height: 1080 },
    },
  })
  @IsOptional()
  result?: unknown;

  @ApiPropertyOptional({
    description: 'Error message if job failed',
    example: 'Screenshot capture failed: Display not available',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({
    description: 'Timestamp when job was submitted',
    example: '2023-12-19T10:30:45.789Z',
  })
  @IsString()
  submittedAt: string = '';

  @ApiProperty({
    description: 'Timestamp when job completed',
    example: '2023-12-19T10:31:15.456Z',
  })
  @IsString()
  completedAt: string = '';

  @ApiProperty({
    description: 'Total execution time in milliseconds',
    example: 30123,
  })
  executionTimeMs: number = 0;

  @ApiPropertyOptional({
    description: 'Additional result metadata',
    example: { retryCount: 0, cacheHit: false },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

/**
 * Async action submission DTO - extends base computer action
 */
export class AsyncActionSubmissionDto {
  @ApiPropertyOptional({
    description: 'Job priority for queue management',
    enum: JobPriority,
    example: JobPriority.NORMAL,
    default: JobPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority = JobPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Maximum execution timeout in milliseconds',
    example: 30000,
    default: 30000,
  })
  @IsOptional()
  timeout?: number = 30000;

  @ApiPropertyOptional({
    description: 'Whether to return cached results if available',
    example: true,
    default: false,
  })
  @IsOptional()
  useCache?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom metadata for job tracking',
    example: { userId: 'user123', sessionId: 'session456' },
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}
