/**
 * Priority Queue DTOs - Data Transfer Objects for Queue Operations
 *
 * Comprehensive DTOs for enterprise-grade priority queue operations:
 * - Queue job submission and management
 * - Queue metrics and analytics
 * - Queue configuration and monitoring
 * - Batch operations and bulk processing
 *
 * All DTOs include comprehensive validation, documentation, and type safety
 */

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { JobStatus } from '../dto/async-job.dto';

/**
 * Enhanced job priority enumeration with execution targets
 */
export enum EnhancedJobPriority {
  URGENT = 'urgent',      // System-critical operations (immediate execution)
  HIGH = 'high',          // User-interactive operations (< 5 second target)
  NORMAL = 'normal',      // Standard automation tasks (< 30 second target)
  LOW = 'low',            // Batch operations (< 5 minute target)
  BACKGROUND = 'background', // Maintenance tasks (best effort)
}

/**
 * Queue operation types for metrics and monitoring
 */
export enum QueueOperation {
  ENQUEUE = 'enqueue',
  DEQUEUE = 'dequeue',
  PEEK = 'peek',
  REMOVE = 'remove',
  CLEAR = 'clear',
  REQUEUE = 'requeue',
  BATCH_ENQUEUE = 'batch_enqueue',
  BATCH_DEQUEUE = 'batch_dequeue',
}

/**
 * Queue job submission DTO with comprehensive metadata
 */
export class QueueJobSubmissionDto {
  @ApiProperty({
    description: 'Job payload data to be processed',
    example: { action: 'screenshot', options: { format: 'png' } },
  })
  @IsObject()
  payload: unknown;

  @ApiPropertyOptional({
    description: 'Job priority level for queue management',
    enum: EnhancedJobPriority,
    example: EnhancedJobPriority.NORMAL,
    default: EnhancedJobPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(EnhancedJobPriority)
  priority?: EnhancedJobPriority = EnhancedJobPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Estimated job execution duration in milliseconds',
    example: 15000,
    minimum: 1000,
    maximum: 1800000, // 30 minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(1800000)
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: 'Maximum number of retry attempts',
    example: 3,
    minimum: 0,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number = 3;

  @ApiPropertyOptional({
    description: 'Job execution timeout in milliseconds',
    example: 30000,
    minimum: 5000,
    maximum: 1800000, // 30 minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(1800000)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Job classification tags for filtering and monitoring',
    example: ['automation', 'user-initiated', 'high-priority'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] = [];

  @ApiPropertyOptional({
    description: 'User ID associated with the job',
    example: 'user_123456789',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for job tracking',
    example: 'session_987654321',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Parent job ID for dependent jobs',
    example: 'job_parent_123',
  })
  @IsOptional()
  @IsString()
  parentJobId?: string;

  @ApiPropertyOptional({
    description: 'List of job IDs that must complete before this job can start',
    example: ['job_dep_1', 'job_dep_2'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[] = [];

  @ApiPropertyOptional({
    description: 'Additional job metadata',
    example: { department: 'operations', cost_center: 'automation' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> = {};
}

/**
 * Queue job response DTO with complete lifecycle information
 */
export class QueueJobResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @IsString()
  @IsUUID('4')
  jobId: string;

  @ApiProperty({
    description: 'Current job status',
    enum: JobStatus,
    example: JobStatus.PENDING,
  })
  @IsEnum(JobStatus)
  status: JobStatus;

  @ApiProperty({
    description: 'Job priority level',
    enum: EnhancedJobPriority,
    example: EnhancedJobPriority.NORMAL,
  })
  @IsEnum(EnhancedJobPriority)
  priority: EnhancedJobPriority;

  @ApiProperty({
    description: 'Job submission timestamp',
    example: '2023-12-19T10:30:45.789Z',
  })
  @IsString()
  submittedAt: string;

  @ApiPropertyOptional({
    description: 'Job processing start timestamp',
    example: '2023-12-19T10:30:50.123Z',
  })
  @IsOptional()
  @IsString()
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Job completion timestamp',
    example: '2023-12-19T10:31:15.456Z',
  })
  @IsOptional()
  @IsString()
  completedAt?: string;

  @ApiProperty({
    description: 'Current position in the queue (0-based)',
    example: 5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  queuePosition: number;

  @ApiProperty({
    description: 'Estimated start time for job processing',
    example: '2023-12-19T10:32:00.000Z',
  })
  @IsString()
  estimatedStartTime: string;

  @ApiPropertyOptional({
    description: 'Job execution duration in milliseconds',
    example: 15750,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  executionTimeMs?: number;

  @ApiPropertyOptional({
    description: 'Job execution result data',
    example: { success: true, data: 'screenshot_base64_data' },
  })
  @IsOptional()
  result?: unknown;

  @ApiPropertyOptional({
    description: 'Error message if job failed',
    example: 'Action execution failed: Timeout waiting for element',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({
    description: 'Number of retry attempts made',
    example: 1,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  retryCount: number;

  @ApiPropertyOptional({
    description: 'Job classification tags',
    example: ['automation', 'screenshot'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Additional job metadata',
    example: { userId: 'user_123', sessionId: 'session_456' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Queue metrics response DTO with comprehensive analytics
 */
export class QueueMetricsDto {
  @ApiProperty({
    description: 'Total number of jobs in the queue system',
    example: 1250,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  totalJobs: number;

  @ApiProperty({
    description: 'Job count by priority level',
    example: {
      urgent: 5,
      high: 25,
      normal: 100,
      low: 75,
      background: 45
    },
  })
  @IsObject()
  jobsByPriority: Record<EnhancedJobPriority, number>;

  @ApiProperty({
    description: 'Job count by status',
    example: {
      pending: 200,
      in_progress: 50,
      completed: 800,
      failed: 15,
      cancelled: 10
    },
  })
  @IsObject()
  jobsByStatus: Record<JobStatus, number>;

  @ApiProperty({
    description: 'Average job wait time in milliseconds',
    example: 5500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  averageWaitTime: number;

  @ApiProperty({
    description: 'Average job execution time in milliseconds',
    example: 12300,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  averageExecutionTime: number;

  @ApiProperty({
    description: 'Job processing throughput per minute',
    example: 24.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  throughputPerMinute: number;

  @ApiProperty({
    description: 'Maximum queue capacity',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  queueCapacity: number;

  @ApiProperty({
    description: 'Current queue capacity utilization (0.0 to 1.0)',
    example: 0.125,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  capacityUtilization: number;

  @ApiProperty({
    description: 'Age of oldest job in queue (milliseconds)',
    example: 45000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  oldestJobAge: number;

  @ApiProperty({
    description: 'Whether backpressure is currently active',
    example: false,
  })
  @IsBoolean()
  backpressureActive: boolean;

  @ApiProperty({
    description: 'Number of lock contention events',
    example: 12,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  lockContention: number;

  @ApiProperty({
    description: 'Number of deadlock events detected',
    example: 0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  deadlockCount: number;

  @ApiProperty({
    description: 'Job retry rate (retries per completed job)',
    example: 0.12,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  retryRate: number;

  @ApiProperty({
    description: 'Job error rate (failures per total jobs)',
    example: 0.015,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  errorRate: number;

  @ApiProperty({
    description: 'Timestamp of last metrics update',
    example: '2023-12-19T10:45:30.789Z',
  })
  @IsString()
  lastUpdated: string;
}

/**
 * Queue operation result DTO
 */
export class QueueOperationResultDto<T = unknown> {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Type of queue operation performed',
    enum: QueueOperation,
    example: QueueOperation.ENQUEUE,
  })
  @IsEnum(QueueOperation)
  operation: QueueOperation;

  @ApiProperty({
    description: 'Operation execution timestamp',
    example: '2023-12-19T10:30:45.789Z',
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    description: 'Operation execution duration in milliseconds',
    example: 125,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  duration: number;

  @ApiPropertyOptional({
    description: 'Operation result data (type varies by operation)',
    example: { jobId: 'job_123', queuePosition: 5 },
  })
  @IsOptional()
  data?: T;

  @ApiPropertyOptional({
    description: 'Error message if operation failed',
    example: 'Queue capacity exceeded',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Whether a distributed lock was acquired for the operation',
    example: true,
  })
  @IsBoolean()
  lockAcquired: boolean;

  @ApiPropertyOptional({
    description: 'Time spent waiting for and holding the lock (milliseconds)',
    example: 45,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lockDuration?: number;

  @ApiProperty({
    description: 'Current queue size at operation time',
    example: 125,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  queueSize: number;

  @ApiProperty({
    description: 'Additional operation metadata',
    example: { priority: 'normal', retryAttempt: 1 },
  })
  @IsObject()
  metadata: Record<string, unknown>;
}

/**
 * Batch job submission DTO for bulk operations
 */
export class BatchJobSubmissionDto {
  @ApiProperty({
    description: 'Array of jobs to submit to the queue',
    type: [QueueJobSubmissionDto],
    minItems: 1,
    maxItems: 100, // Limit batch size for performance
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueueJobSubmissionDto)
  jobs: QueueJobSubmissionDto[];

  @ApiPropertyOptional({
    description: 'Whether to execute all jobs atomically (all or none)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  atomic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Maximum time to wait for batch submission (milliseconds)',
    example: 30000,
    minimum: 1000,
    maximum: 300000, // 5 minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number = 30000;
}

/**
 * Batch job submission result DTO
 */
export class BatchJobSubmissionResultDto {
  @ApiProperty({
    description: 'Whether the entire batch operation was successful',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Number of jobs successfully submitted',
    example: 8,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  successCount: number;

  @ApiProperty({
    description: 'Number of jobs that failed to submit',
    example: 2,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  failureCount: number;

  @ApiProperty({
    description: 'Total batch processing time in milliseconds',
    example: 1250,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  processingTimeMs: number;

  @ApiProperty({
    description: 'Array of successfully submitted job IDs',
    example: ['job_1', 'job_2', 'job_3'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  successfulJobIds: string[];

  @ApiProperty({
    description: 'Array of submission failures with error details',
    example: [
      { index: 3, error: 'Invalid priority value' },
      { index: 7, error: 'Queue capacity exceeded' }
    ],
  })
  @IsArray()
  failures: Array<{ index: number; error: string }>;

  @ApiProperty({
    description: 'Batch submission timestamp',
    example: '2023-12-19T10:30:45.789Z',
  })
  @IsString()
  submittedAt: string;
}

/**
 * Queue configuration DTO for runtime configuration updates
 */
export class QueueConfigurationDto {
  @ApiPropertyOptional({
    description: 'Maximum queue size',
    example: 10000,
    minimum: 100,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(100000)
  maxQueueSize?: number;

  @ApiPropertyOptional({
    description: 'Maximum jobs per priority level',
    example: 2000,
    minimum: 10,
    maximum: 20000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(20000)
  maxJobsPerPriority?: number;

  @ApiPropertyOptional({
    description: 'Backpressure activation threshold (0.0 to 1.0)',
    example: 0.8,
    minimum: 0.1,
    maximum: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  backpressureThreshold?: number;

  @ApiPropertyOptional({
    description: 'Lock timeout in milliseconds',
    example: 30000,
    minimum: 1000,
    maximum: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  lockTimeout?: number;

  @ApiPropertyOptional({
    description: 'Enable starvation prevention mechanism',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  starvationPreventionEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Starvation prevention threshold in milliseconds',
    example: 300000,
    minimum: 60000,  // 1 minute
    maximum: 3600000, // 1 hour
  })
  @IsOptional()
  @IsNumber()
  @Min(60000)
  @Max(3600000)
  starvationPreventionThreshold?: number;
}

/**
 * Queue health status DTO
 */
export class QueueHealthStatusDto {
  @ApiProperty({
    description: 'Overall queue system health status',
    example: 'healthy',
    enum: ['healthy', 'degraded', 'critical', 'maintenance'],
  })
  @IsEnum(['healthy', 'degraded', 'critical', 'maintenance'])
  status: 'healthy' | 'degraded' | 'critical' | 'maintenance';

  @ApiProperty({
    description: 'Detailed health check results',
    example: {
      redis_connection: 'healthy',
      queue_capacity: 'healthy',
      lock_system: 'healthy',
      deadlock_detection: 'healthy'
    },
  })
  @IsObject()
  checks: Record<string, 'healthy' | 'degraded' | 'critical'>;

  @ApiProperty({
    description: 'Health check timestamp',
    example: '2023-12-19T10:45:30.789Z',
  })
  @IsString()
  lastChecked: string;

  @ApiPropertyOptional({
    description: 'Health check warnings',
    example: ['High queue utilization detected'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warnings?: string[];

  @ApiPropertyOptional({
    description: 'Health check errors',
    example: ['Redis connection timeout'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errors?: string[];
}