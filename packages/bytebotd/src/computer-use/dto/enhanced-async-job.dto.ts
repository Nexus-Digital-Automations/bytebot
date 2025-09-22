import { IsEnum, IsOptional, IsString, IsNumber, IsBoolean, IsObject, IsArray, ValidateNested, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus, JobPriority } from './async-job.dto';

/**
 * Enhanced job status with additional states for comprehensive tracking
 */
export enum EnhancedJobStatus {
  QUEUED = 'queued',
  PENDING = 'pending',
  VALIDATING = 'validating',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  RETRYING = 'retrying',
  COMPLETING = 'completing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  CLEANUP = 'cleanup'
}

/**
 * Job execution phases for granular progress tracking
 */
export enum JobExecutionPhase {
  INITIALIZATION = 'initialization',
  VALIDATION = 'validation',
  PREPARATION = 'preparation',
  EXECUTION = 'execution',
  POST_PROCESSING = 'post_processing',
  RESULT_STORAGE = 'result_storage',
  CLEANUP = 'cleanup'
}

/**
 * Enhanced job priority with enterprise-level options
 */
export enum EnhancedJobPriority {
  CRITICAL = 'critical',
  URGENT = 'urgent',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
  BACKGROUND = 'background'
}

/**
 * Job result storage options
 */
export enum JobResultStorageType {
  MEMORY = 'memory',
  DATABASE = 'database',
  FILE_SYSTEM = 'file_system',
  CLOUD_STORAGE = 'cloud_storage',
  REDIS = 'redis'
}

/**
 * Job execution context for comprehensive tracking
 */
export class JobExecutionContext {
  @ApiProperty({
    description: 'User who submitted the job',
    example: 'user123'
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Username for audit trail',
    example: 'john.doe'
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Session ID for correlation',
    example: 'session_abc123'
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'IP address of the request origin',
    example: '192.168.1.100'
  })
  @IsString()
  ipAddress: string;

  @ApiProperty({
    description: 'User agent string',
    example: 'Mozilla/5.0...'
  })
  @IsString()
  userAgent: string;

  @ApiPropertyOptional({
    description: 'Additional context metadata',
    example: { department: 'IT', project: 'automation' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Job resource requirements and constraints
 */
export class JobResourceRequirements {
  @ApiProperty({
    description: 'Maximum memory usage in MB',
    example: 512
  })
  @IsNumber()
  @Min(0)
  @Max(8192)
  maxMemoryMB: number;

  @ApiProperty({
    description: 'Maximum CPU usage percentage',
    example: 50
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  maxCpuPercent: number;

  @ApiProperty({
    description: 'Maximum execution time in milliseconds',
    example: 300000
  })
  @IsNumber()
  @Min(1000)
  @Max(3600000)
  timeoutMs: number;

  @ApiPropertyOptional({
    description: 'Required disk space in MB',
    example: 100
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  requiredDiskSpaceMB?: number;
}

/**
 * Job progress tracking with detailed phases
 */
export class JobProgressTracking {
  @ApiProperty({
    description: 'Overall progress percentage (0-100)',
    example: 75
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  overallProgress: number;

  @ApiProperty({
    description: 'Current execution phase',
    enum: JobExecutionPhase,
    example: JobExecutionPhase.EXECUTION
  })
  @IsEnum(JobExecutionPhase)
  currentPhase: JobExecutionPhase;

  @ApiProperty({
    description: 'Progress within current phase (0-100)',
    example: 25
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  phaseProgress: number;

  @ApiProperty({
    description: 'Current operation description',
    example: 'Processing mouse click action'
  })
  @IsString()
  currentOperation: string;

  @ApiPropertyOptional({
    description: 'Estimated completion time',
    example: '2024-01-15T14:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  estimatedCompletionAt?: string;

  @ApiPropertyOptional({
    description: 'Phase-specific progress details',
    example: { steps_completed: 3, total_steps: 5 }
  })
  @IsOptional()
  @IsObject()
  phaseDetails?: Record<string, unknown>;
}

/**
 * Enhanced job result with comprehensive metadata
 */
export class EnhancedJobResult {
  @ApiProperty({
    description: 'Primary result data',
    example: { image: 'base64...', success: true }
  })
  @IsObject()
  data: unknown;

  @ApiProperty({
    description: 'Result storage type used',
    enum: JobResultStorageType,
    example: JobResultStorageType.MEMORY
  })
  @IsEnum(JobResultStorageType)
  storageType: JobResultStorageType;

  @ApiProperty({
    description: 'Result size in bytes',
    example: 1024000
  })
  @IsNumber()
  @Min(0)
  sizeBytes: number;

  @ApiProperty({
    description: 'Result checksum for integrity verification',
    example: 'sha256:abc123...'
  })
  @IsString()
  checksum: string;

  @ApiProperty({
    description: 'Result creation timestamp',
    example: '2024-01-15T14:30:00Z'
  })
  @IsDateString()
  createdAt: string;

  @ApiPropertyOptional({
    description: 'Result expiration timestamp',
    example: '2024-01-16T14:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: 'Result access control metadata',
    example: { allowedUsers: ['user123'], accessLevel: 'confidential' }
  })
  @IsOptional()
  @IsObject()
  accessControl?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Result compression information',
    example: { compressed: true, algorithm: 'gzip', originalSize: 2048000 }
  })
  @IsOptional()
  @IsObject()
  compression?: {
    compressed: boolean;
    algorithm?: string;
    originalSize?: number;
  };
}

/**
 * Comprehensive job error information
 */
export class JobErrorDetails {
  @ApiProperty({
    description: 'Error code for categorization',
    example: 'EXECUTION_TIMEOUT'
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'Job execution exceeded timeout limit of 300 seconds'
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Error severity level',
    enum: ['low', 'medium', 'high', 'critical'],
    example: 'high'
  })
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({
    description: 'Error stack trace (if available)',
    example: 'Error: Timeout\n    at ...'
  })
  @IsOptional()
  @IsString()
  stackTrace?: string;

  @ApiPropertyOptional({
    description: 'Error context and additional details',
    example: { phase: 'execution', attempt: 2, timeout: 300000 }
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiProperty({
    description: 'Error occurrence timestamp',
    example: '2024-01-15T14:30:00Z'
  })
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional({
    description: 'Recovery suggestions or actions',
    example: ['Increase timeout limit', 'Retry with different parameters']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recoverySuggestions?: string[];
}

/**
 * Enhanced job performance metrics
 */
export class JobPerformanceMetrics {
  @ApiProperty({
    description: 'Total execution time in milliseconds',
    example: 15750
  })
  @IsNumber()
  @Min(0)
  executionTimeMs: number;

  @ApiProperty({
    description: 'Queue waiting time in milliseconds',
    example: 2500
  })
  @IsNumber()
  @Min(0)
  queueTimeMs: number;

  @ApiProperty({
    description: 'Peak memory usage in MB',
    example: 128
  })
  @IsNumber()
  @Min(0)
  peakMemoryMB: number;

  @ApiProperty({
    description: 'Average CPU usage percentage',
    example: 35.5
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  avgCpuPercent: number;

  @ApiPropertyOptional({
    description: 'Network I/O metrics',
    example: { bytesIn: 1024, bytesOut: 2048 }
  })
  @IsOptional()
  @IsObject()
  networkMetrics?: {
    bytesIn: number;
    bytesOut: number;
    requestCount?: number;
  };

  @ApiPropertyOptional({
    description: 'Disk I/O metrics',
    example: { bytesRead: 5120, bytesWritten: 3072 }
  })
  @IsOptional()
  @IsObject()
  diskMetrics?: {
    bytesRead: number;
    bytesWritten: number;
    fileOperations?: number;
  };

  @ApiPropertyOptional({
    description: 'Performance bottlenecks detected',
    example: ['high_memory_usage', 'slow_disk_io']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bottlenecks?: string[];
}

/**
 * Comprehensive enhanced job submission DTO
 */
export class EnhancedJobSubmissionDto {
  @ApiProperty({
    description: 'Enhanced job priority',
    enum: EnhancedJobPriority,
    example: EnhancedJobPriority.NORMAL
  })
  @IsEnum(EnhancedJobPriority)
  priority: EnhancedJobPriority;

  @ApiProperty({
    description: 'Job execution context',
    type: JobExecutionContext
  })
  @ValidateNested()
  @Type(() => JobExecutionContext)
  executionContext: JobExecutionContext;

  @ApiProperty({
    description: 'Job resource requirements',
    type: JobResourceRequirements
  })
  @ValidateNested()
  @Type(() => JobResourceRequirements)
  resourceRequirements: JobResourceRequirements;

  @ApiPropertyOptional({
    description: 'Result storage preferences',
    enum: JobResultStorageType,
    example: JobResultStorageType.DATABASE
  })
  @IsOptional()
  @IsEnum(JobResultStorageType)
  resultStorageType?: JobResultStorageType;

  @ApiPropertyOptional({
    description: 'Enable result caching',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  enableCaching?: boolean;

  @ApiPropertyOptional({
    description: 'Job tags for organization',
    example: ['automation', 'ui-testing', 'critical']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Job dependencies (must complete before this job)',
    example: ['job_123', 'job_456']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Custom job metadata',
    example: { project: 'automation-suite', build: '1.2.3' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Enhanced job status response with comprehensive information
 */
export class EnhancedJobStatusResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123'
  })
  @IsString()
  jobId: string;

  @ApiProperty({
    description: 'Enhanced job status',
    enum: EnhancedJobStatus,
    example: EnhancedJobStatus.IN_PROGRESS
  })
  @IsEnum(EnhancedJobStatus)
  status: EnhancedJobStatus;

  @ApiProperty({
    description: 'Job priority level',
    enum: EnhancedJobPriority,
    example: EnhancedJobPriority.NORMAL
  })
  @IsEnum(EnhancedJobPriority)
  priority: EnhancedJobPriority;

  @ApiProperty({
    description: 'Detailed progress tracking',
    type: JobProgressTracking
  })
  @ValidateNested()
  @Type(() => JobProgressTracking)
  progress: JobProgressTracking;

  @ApiProperty({
    description: 'Job submission timestamp',
    example: '2024-01-15T14:20:00Z'
  })
  @IsDateString()
  submittedAt: string;

  @ApiPropertyOptional({
    description: 'Job start timestamp',
    example: '2024-01-15T14:21:00Z'
  })
  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Job completion timestamp',
    example: '2024-01-15T14:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @ApiProperty({
    description: 'Current performance metrics',
    type: JobPerformanceMetrics
  })
  @ValidateNested()
  @Type(() => JobPerformanceMetrics)
  performanceMetrics: JobPerformanceMetrics;

  @ApiPropertyOptional({
    description: 'Error details if job failed',
    type: JobErrorDetails
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobErrorDetails)
  errorDetails?: JobErrorDetails;

  @ApiProperty({
    description: 'Job execution context',
    type: JobExecutionContext
  })
  @ValidateNested()
  @Type(() => JobExecutionContext)
  executionContext: JobExecutionContext;

  @ApiPropertyOptional({
    description: 'Retry information',
    example: { currentAttempt: 2, maxAttempts: 3, nextRetryAt: '2024-01-15T14:35:00Z' }
  })
  @IsOptional()
  @IsObject()
  retryInfo?: {
    currentAttempt: number;
    maxAttempts: number;
    nextRetryAt?: string;
    retryReason?: string;
  };

  @ApiPropertyOptional({
    description: 'Job tags',
    example: ['automation', 'ui-testing']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Enhanced job result response with comprehensive metadata
 */
export class EnhancedJobResultResponseDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123'
  })
  @IsString()
  jobId: string;

  @ApiProperty({
    description: 'Final job status',
    enum: EnhancedJobStatus,
    example: EnhancedJobStatus.COMPLETED
  })
  @IsEnum(EnhancedJobStatus)
  status: EnhancedJobStatus;

  @ApiProperty({
    description: 'Enhanced job result with metadata',
    type: EnhancedJobResult
  })
  @ValidateNested()
  @Type(() => EnhancedJobResult)
  result: EnhancedJobResult;

  @ApiProperty({
    description: 'Complete performance metrics',
    type: JobPerformanceMetrics
  })
  @ValidateNested()
  @Type(() => JobPerformanceMetrics)
  performanceMetrics: JobPerformanceMetrics;

  @ApiProperty({
    description: 'Job execution timeline',
    example: {
      submittedAt: '2024-01-15T14:20:00Z',
      queuedAt: '2024-01-15T14:20:01Z',
      startedAt: '2024-01-15T14:21:00Z',
      completedAt: '2024-01-15T14:30:00Z'
    }
  })
  @IsObject()
  timeline: {
    submittedAt: string;
    queuedAt?: string;
    startedAt?: string;
    completedAt: string;
  };

  @ApiPropertyOptional({
    description: 'Error details if job failed',
    type: JobErrorDetails
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobErrorDetails)
  errorDetails?: JobErrorDetails;

  @ApiProperty({
    description: 'Job execution context',
    type: JobExecutionContext
  })
  @ValidateNested()
  @Type(() => JobExecutionContext)
  executionContext: JobExecutionContext;

  @ApiPropertyOptional({
    description: 'Quality metrics and validation results',
    example: {
      dataIntegrity: 'verified',
      performanceScore: 95,
      securityScan: 'passed'
    }
  })
  @IsOptional()
  @IsObject()
  qualityMetrics?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Audit trail for compliance',
    example: {
      accessedBy: ['user123'],
      modifiedBy: [],
      accessHistory: [{ timestamp: '2024-01-15T14:30:00Z', action: 'result_retrieved' }]
    }
  })
  @IsOptional()
  @IsObject()
  auditTrail?: {
    accessedBy: string[];
    modifiedBy: string[];
    accessHistory: Array<{
      timestamp: string;
      action: string;
      userId?: string;
      details?: Record<string, unknown>;
    }>;
  };
}