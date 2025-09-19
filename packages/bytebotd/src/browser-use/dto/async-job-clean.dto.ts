import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * Configuration parameters for job execution
 */
export interface JobConfiguration {
  url?: string;
  selectors?: string[];
  actions?: string[];
  timeout?: number;
  viewport?: {
    width: number;
    height: number;
  };
  headers?: Record<string, string>;
  cookies?: Array<{
    name: string;
    value: string;
    domain?: string;
    path?: string;
  }>;
  waitForSelectors?: string[];
  extractFields?: Record<string, string>;
  formData?: Record<string, string>;
  scrollBehavior?: 'auto' | 'smooth';
  screenshot?: {
    enabled: boolean;
    quality?: number;
    fullPage?: boolean;
  };
  [key: string]: unknown;
}

/**
 * Job metadata information
 */
export interface JobMetadata {
  retryCount: number;
  maxRetries: number;
  createdBy: string;
  tags: string[];
  priority?: AsyncJobPriority;
  estimatedDuration?: number;
  sessionId?: string;
  parentJobId?: string;
  [key: string]: unknown;
}

/**
 * Job execution log entry
 */
export interface JobLogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  step?: string;
  actionIndex?: number;
  screenshot?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Extracted data structure
 */
export interface ExtractedData {
  [key: string]: unknown;
}

/**
 * Job error details
 */
export interface JobErrorDetails {
  message: string;
  code: string;
  step: string;
  actionIndex?: number;
  timestamp: Date;
  recoverable?: boolean;
  screenshot?: string;
  details?: Record<string, unknown>;
}

/**
 * File download information
 */
export interface DownloadInfo {
  filename: string;
  path: string;
  size: number;
  mimeType: string;
  downloadedAt: Date;
}

/**
 * Job execution statistics
 */
export interface JobExecutionStatistics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  actionsCompleted?: number;
  screenshotsCaptured: number;
  pagesNavigated: number;
  formsSubmitted: number;
  elementsClicked: number;
  textExtracted: number;
  dataPoints: number;
  dataExtracted?: number;
}

/**
 * Job progress information
 */
export interface JobProgress {
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  estimatedRemainingMs: number;
}

/**
 * Job results structure
 */
export interface JobResults {
  tasksCompleted: number;
  totalTasks: number;
  screenshots: string[];
  extractedData: ExtractedData;
  logs: JobLogEntry[];
}

/**
 * Resource URLs for job artifacts
 */
export interface JobResourceUrls {
  screenshotsUrl?: string;
  downloadsUrl?: string;
  logsUrl?: string;
  reportUrl?: string;
}

/**
 * Export options for job data
 */
export interface JobExportOptions {
  availableFormats: string[];
  downloadUrls: Record<string, string>;
}

/**
 * Retry configuration for jobs
 */
export interface JobRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
}

/**
 * Async job status for long-running browser automation tasks
 */
export enum AsyncJobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/**
 * Async job priority levels
 */
export enum AsyncJobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

/**
 * Async job types for different automation tasks
 */
export enum AsyncJobType {
  BATCH_AUTOMATION = 'batch_automation',
  DATA_EXTRACTION = 'data_extraction',
  FORM_FILLING = 'form_filling',
  SCREENSHOT_CAPTURE = 'screenshot_capture',
  CUSTOM_WORKFLOW = 'custom_workflow',
}

/**
 * DTO for creating async browser automation jobs
 */
export class CreateAsyncJobDto {
  @ApiProperty({
    description: 'Human-readable job name',
    example: 'Data extraction from e-commerce site',
  })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed job description',
    example:
      'Extract product information including prices, ratings, and reviews',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Job type for automation task',
    enum: AsyncJobType,
    example: AsyncJobType.DATA_EXTRACTION,
  })
  @IsEnum(AsyncJobType)
  jobType!: AsyncJobType;

  @ApiPropertyOptional({
    description: 'Job priority level',
    enum: AsyncJobPriority,
    default: AsyncJobPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(AsyncJobPriority)
  priority?: AsyncJobPriority;

  @ApiPropertyOptional({
    description: 'Estimated duration in milliseconds',
    minimum: 10000, // 10 seconds
    maximum: 3600000, // 1 hour
    default: 300000, // 5 minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(10000)
  @Max(3600000)
  estimatedDurationMs?: number;

  @ApiProperty({
    description: 'Job configuration parameters',
    type: 'object',
    additionalProperties: true,
    example: {
      url: 'https://example.com',
      selectors: ['#products .item'],
      actions: ['click', 'extract'],
    },
  })
  @IsObject()
  configuration!: JobConfiguration;

  @ApiPropertyOptional({
    description: 'Maximum retry attempts on failure',
    minimum: 0,
    maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Job tags for organization and filtering',
    type: [String],
    example: ['e-commerce', 'product-data', 'automated'],
  })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Additional job metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Async job result DTO containing job state and execution details
 */
export class AsyncJobResultDto {
  @ApiProperty({
    description: 'Unique job identifier',
    example: 'job_browser_1234567890_abcdef',
  })
  jobId!: string;

  @ApiProperty({
    description: 'Human-readable job name',
    example: 'Data extraction from e-commerce site',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Detailed job description',
  })
  description?: string;

  @ApiProperty({
    description: 'Job type for automation task',
    enum: AsyncJobType,
  })
  jobType!: AsyncJobType;

  @ApiProperty({
    description: 'Current job status',
    enum: AsyncJobStatus,
  })
  status!: AsyncJobStatus;

  @ApiProperty({
    description: 'Job priority level',
    enum: AsyncJobPriority,
  })
  priority!: AsyncJobPriority;

  @ApiProperty({
    description: 'Job execution progress information',
    type: 'object',
    additionalProperties: false,
    properties: {
      currentStep: { type: 'string' },
      completedSteps: { type: 'number' },
      totalSteps: { type: 'number' },
      percentage: { type: 'number' },
      estimatedRemainingMs: { type: 'number' },
    },
  })
  progress!: {
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
    percentage: number;
    estimatedRemainingMs: number;
  };

  @ApiProperty({
    description: 'Job creation timestamp',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Job queued timestamp',
  })
  queuedAt?: Date;

  @ApiPropertyOptional({
    description: 'Job start timestamp',
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Job completion timestamp',
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Estimated duration in milliseconds',
  })
  estimatedDurationMs!: number;

  @ApiPropertyOptional({
    description: 'Actual execution duration in milliseconds',
  })
  actualDurationMs?: number;

  @ApiProperty({
    description: 'Job configuration parameters',
    type: 'object',
    additionalProperties: true,
  })
  configuration!: JobConfiguration;

  @ApiProperty({
    description: 'Job execution results',
    type: 'object',
    additionalProperties: false,
    properties: {
      tasksCompleted: { type: 'number' },
      totalTasks: { type: 'number' },
      screenshots: { type: 'array', items: { type: 'string' } },
      extractedData: { type: 'object', additionalProperties: true },
      logs: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            level: { type: 'string' },
            message: { type: 'string' },
            step: { type: 'string' },
            metadata: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  })
  results!: JobResults;

  @ApiPropertyOptional({
    description: 'Associated task IDs for this job',
    type: [String],
  })
  taskIds?: string[];

  @ApiPropertyOptional({
    description: 'Error message if job failed',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Error information if job failed',
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
      code: { type: 'string' },
      step: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
      details: { type: 'object', additionalProperties: true },
    },
  })
  error?: JobErrorDetails;

  @ApiProperty({
    description: 'Job metadata and execution details',
    type: 'object',
    additionalProperties: true,
  })
  metadata!: JobMetadata;
}

/**
 * Job submission response
 */
export class JobSubmissionResponseDto {
  @ApiProperty({
    description: 'Unique job identifier for status tracking',
    example: 'job_browser_1234567890_abcdef',
  })
  jobId!: string;

  @ApiProperty({
    description: 'Job submission status',
    enum: AsyncJobStatus,
  })
  status!: AsyncJobStatus;

  @ApiProperty({
    description: 'Job submission timestamp',
  })
  submittedAt!: Date;

  @ApiProperty({
    description: 'Estimated completion time in milliseconds',
  })
  estimatedCompletionTimeMs!: number;

  @ApiPropertyOptional({
    description: 'Position in execution queue',
  })
  queuePosition?: number;

  @ApiProperty({
    description: 'Job priority level',
    enum: AsyncJobPriority,
  })
  priority!: AsyncJobPriority;

  @ApiProperty({
    description: 'Polling URL for job status',
    example: '/api/v1/browser-use/jobs/job_browser_1234567890_abcdef/status',
  })
  statusUrl!: string;

  @ApiProperty({
    description: 'Results URL (available once completed)',
    example: '/api/v1/browser-use/jobs/job_browser_1234567890_abcdef/results',
  })
  resultsUrl!: string;

  @ApiPropertyOptional({
    description: 'WebSocket URL for real-time updates',
    example:
      'ws://localhost:3000/browser-use/jobs/job_browser_1234567890_abcdef/stream',
  })
  streamUrl?: string;

  @ApiPropertyOptional({
    description: 'Additional job metadata',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}

/**
 * Job status response
 */
export class JobStatusResponseDto {
  @ApiProperty({
    description: 'Job identifier',
  })
  jobId!: string;

  @ApiProperty({
    description: 'Current job status',
    enum: AsyncJobStatus,
  })
  status!: AsyncJobStatus;

  @ApiProperty({
    description: 'Job creation timestamp',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Job start timestamp',
  })
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Job completion timestamp',
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Execution progress percentage (0-100)',
    minimum: 0,
    maximum: 100,
  })
  progress!: number;

  @ApiProperty({
    description: 'Current step description',
  })
  currentStep!: string;

  @ApiProperty({
    description: 'Total execution time in milliseconds',
  })
  executionTimeMs!: number;

  @ApiPropertyOptional({
    description: 'Estimated remaining time in milliseconds',
  })
  estimatedRemainingTimeMs?: number;

  @ApiPropertyOptional({
    description: 'Browser session ID associated with job',
  })
  sessionId?: string;

  @ApiProperty({
    description: 'Job execution statistics',
    type: 'object',
    additionalProperties: false,
    properties: {
      actionsCompleted: { type: 'number' },
      totalActions: { type: 'number' },
      screenshotsCaptured: { type: 'number' },
      pagesNavigated: { type: 'number' },
      formsSubmitted: { type: 'number' },
      dataExtracted: { type: 'number' },
    },
  })
  statistics!: {
    actionsCompleted: number;
    totalActions: number;
    screenshotsCaptured: number;
    pagesNavigated: number;
    formsSubmitted: number;
    dataExtracted: number;
  };

  @ApiPropertyOptional({
    description: 'Error information if job failed',
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
      code: { type: 'string' },
      step: { type: 'string' },
      timestamp: { type: 'string', format: 'date-time' },
      recoverable: { type: 'boolean' },
      details: { type: 'object', additionalProperties: true },
    },
  })
  errorInfo?: JobErrorDetails;

  @ApiPropertyOptional({
    description: 'Recent execution logs',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        level: { type: 'string' },
        message: { type: 'string' },
        step: { type: 'string' },
        screenshot: { type: 'string' },
      },
    },
  })
  recentLogs?: Array<{
    timestamp: Date;
    level: string;
    message: string;
    step?: string;
    screenshot?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Job metadata',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Whether results are ready for retrieval',
  })
  resultsReady!: boolean;
}

/**
 * Job results response
 */
export class JobResultResponseDto {
  @ApiProperty({
    description: 'Job identifier',
  })
  jobId!: string;

  @ApiProperty({
    description: 'Final job status',
    enum: AsyncJobStatus,
  })
  status!: AsyncJobStatus;

  @ApiProperty({
    description: 'Job completion timestamp',
  })
  completedAt!: Date;

  @ApiProperty({
    description: 'Total execution time in milliseconds',
  })
  totalExecutionTimeMs!: number;

  @ApiProperty({
    description: 'Job execution success flag',
  })
  success!: boolean;

  @ApiPropertyOptional({
    description: 'Extracted data from browser automation',
    type: 'object',
    additionalProperties: true,
  })
  data?: ExtractedData;

  @ApiPropertyOptional({
    description: 'Screenshots captured during execution',
    type: 'array',
    items: { type: 'string' },
  })
  screenshots?: string[]; // Base64 or file paths

  @ApiPropertyOptional({
    description: 'Downloaded files during execution',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        filename: { type: 'string' },
        path: { type: 'string' },
        size: { type: 'number' },
        mimeType: { type: 'string' },
        downloadedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  downloads?: DownloadInfo[];

  @ApiProperty({
    description: 'Complete execution logs',
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      properties: {
        timestamp: { type: 'string', format: 'date-time' },
        level: { type: 'string' },
        message: { type: 'string' },
        actionIndex: { type: 'number' },
        step: { type: 'string' },
        screenshot: { type: 'string' },
        metadata: { type: 'object', additionalProperties: true },
      },
    },
  })
  logs!: JobLogEntry[];

  @ApiProperty({
    description: 'Final execution statistics',
    type: 'object',
    additionalProperties: false,
    properties: {
      totalActions: { type: 'number' },
      successfulActions: { type: 'number' },
      failedActions: { type: 'number' },
      screenshotsCaptured: { type: 'number' },
      pagesNavigated: { type: 'number' },
      formsSubmitted: { type: 'number' },
      elementsClicked: { type: 'number' },
      textExtracted: { type: 'number' },
      dataPoints: { type: 'number' },
    },
  })
  statistics!: JobExecutionStatistics;

  @ApiPropertyOptional({
    description: 'Error information if job failed',
    type: 'object',
    additionalProperties: false,
    properties: {
      message: { type: 'string' },
      code: { type: 'string' },
      step: { type: 'string' },
      actionIndex: { type: 'number' },
      timestamp: { type: 'string', format: 'date-time' },
      screenshot: { type: 'string' },
      details: { type: 'object', additionalProperties: true },
    },
  })
  errorInfo?: JobErrorDetails;

  @ApiPropertyOptional({
    description: 'Job metadata and configuration',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Resource URLs for artifacts',
    type: 'object',
    additionalProperties: false,
    properties: {
      screenshotsUrl: { type: 'string' },
      downloadsUrl: { type: 'string' },
      logsUrl: { type: 'string' },
      reportUrl: { type: 'string' },
    },
  })
  resources!: JobResourceUrls;

  @ApiProperty({
    description: 'Data export options',
    type: 'object',
    additionalProperties: false,
    properties: {
      availableFormats: { type: 'array', items: { type: 'string' } },
      downloadUrls: {
        type: 'object',
        additionalProperties: { type: 'string' },
      },
    },
  })
  exports!: JobExportOptions;
}

/**
 * Async job submission for browser automation
 */
export class AsyncBrowserJobSubmissionDto {
  @ApiProperty({
    description: 'Job type identifier',
    example: 'browser_automation',
  })
  @IsString()
  jobType!: string;

  @ApiPropertyOptional({
    description: 'Job priority level',
    enum: AsyncJobPriority,
    default: AsyncJobPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(AsyncJobPriority)
  priority?: AsyncJobPriority;

  @ApiPropertyOptional({
    description: 'Maximum execution time in milliseconds',
    minimum: 30000, // 30 seconds
    maximum: 3600000, // 1 hour
    default: 600000, // 10 minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(30000)
  @Max(3600000)
  maxExecutionTimeMs?: number;

  @ApiProperty({
    description: 'Job payload containing task configuration',
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  payload!: JobConfiguration;

  @ApiPropertyOptional({
    description: 'Enable real-time streaming of job progress',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  enableStreaming?: boolean;

  @ApiPropertyOptional({
    description: 'Callback URL for job completion notification',
  })
  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Custom job metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Job retry configuration',
    type: 'object',
    additionalProperties: false,
    properties: {
      maxRetries: { type: 'number' },
      retryDelayMs: { type: 'number' },
      exponentialBackoff: { type: 'boolean' },
    },
  })
  @IsOptional()
  @IsObject()
  retryConfig?: JobRetryConfig;
}