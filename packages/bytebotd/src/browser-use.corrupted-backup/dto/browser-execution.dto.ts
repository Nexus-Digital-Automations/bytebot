import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import {IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsUrl,
  ValidateNested,
  Min,
  Max,
  IsUUID,
} from 'class-validator';import { Type } from 'class-transformer';/*** Browser execution task types
 */
export enum BrowserExecutionType {
  NAVIGATION = 'navigation',INTERACTION = 'interaction',DATA_EXTRACTION = 'data_extraction',FORM_SUBMISSION = 'form_submission',WAIT_OPERATION = 'wait_operation',SCREENSHOT = 'screenshot',CUSTOM_SCRIPT = 'custom_script',}/**
 * Navigation execution options
 */
export enum NavigationType {
  GOTO = 'goto',BACK = 'back',FORWARD = 'forward',RELOAD = 'reload',REFRESH = 'refresh',}/**
 * Wait operation types
 */
export enum WaitType {
  ELEMENT = 'element',TIMEOUT = 'timeout',NETWORK_IDLE = 'network_idle',LOAD_STATE = 'load_state',URL_CHANGE = 'url_change',CUSTOM_CONDITION = 'custom_condition',}/**
 * Task execution status for browser operations
 */
export enum BrowserExecutionStatus {
  QUEUED = 'queued',INITIALIZING = 'initializing',EXECUTING = 'executing',COMPLETED = 'completed',FAILED = 'failed',CANCELLED = 'cancelled',TIMEOUT = 'timeout',RETRY = 'retry',}/**
 * Browser execution request DTO
 */
export class BrowserExecuteDto {
  @ApiProperty({
    description: 'Type of browser execution to perform',enum: BrowserExecutionType,})
  @IsEnum(BrowserExecutionType)
  executionType: BrowserExecutionType = BrowserExecutionType.INTERACTION;

  @ApiProperty({
    description: 'Task name for tracking and logging',example: 'Extract product data from e-commerce page',})@IsString()
  taskName: string = '';@ApiProperty({description: 'Detailed execution instructions',example: 'Navigate to product page, wait for content, extract title and price',})@IsString()
  instructions: string = '';@ApiPropertyOptional({description: 'Target URL for navigation operations',})@IsOptional()
  @IsUrl({ require_protocol: true })
  targetUrl?: string;

  @ApiPropertyOptional({
    description: 'CSS selector for element targeting',})@IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'JavaScript code to execute in browser context',})@IsOptional()
  @IsString()
  scriptCode?: string;

  @ApiPropertyOptional({
    description: 'Execution parameters and configuration',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  parameters?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Maximum execution timeout in milliseconds',minimum: 1000,maximum: 300000,
    default: 30000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeoutMs?: number = 30000;

  @ApiPropertyOptional({
    description: 'Whether to capture screenshots during execution',default: true,})
  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean = true;

  @ApiPropertyOptional({
    description: 'Enable detailed execution logging',default: true,})
  @IsOptional()
  @IsBoolean()
  enableLogging?: boolean = true;

  @ApiPropertyOptional({
    description: 'Session ID to reuse existing browser session',})@IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Retry configuration for failed executions',type: 'object',})@IsOptional()
  @IsObject()
  retryConfig?: {
    maxRetries: number;
    retryDelayMs: number;
    exponentialBackoff: boolean;
  };
}

/**
 * Browser navigation request DTO
 */
export class BrowserNavigateDto {
  @ApiProperty({
    description: 'Type of navigation to perform',enum: NavigationType,})
  @IsEnum(NavigationType)
  navigationType: NavigationType = NavigationType.GOTO;

  @ApiPropertyOptional({
    description: 'Target URL for navigation (required for GOTO)',})@IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional({
    description: 'Wait for specific condition after navigation',type: 'object',})@IsOptional()
  @IsObject()
  waitCondition?: {
    type: WaitType;
    selector?: string;
    timeout?: number;
    condition?: string;
  };

  @ApiPropertyOptional({
    description: 'Session ID to perform navigation in',})@IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Navigation timeout in milliseconds',minimum: 5000,maximum: 120000,
    default: 30000,
  })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(120000)
  timeoutMs?: number = 30000;

  @ApiPropertyOptional({
    description: 'Additional navigation options',type: 'object',})@IsOptional()
  @IsObject()
  options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';referer?: string;userAgent?: string;
  };
}

/**
 * Browser wait operation request DTO
 */
export class BrowserWaitDto {
  @ApiProperty({
    description: 'Type of wait operation to perform',enum: WaitType,})
  @IsEnum(WaitType)
  waitType: WaitType = WaitType.ELEMENT;

  @ApiPropertyOptional({
    description: 'CSS selector to wait for (required for ELEMENT wait)',})@IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Wait timeout in milliseconds',minimum: 100,maximum: 120000,
    default: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(120000)
  timeoutMs?: number = 10000;

  @ApiPropertyOptional({
    description: 'Custom condition JavaScript code',})@IsOptional()
  @IsString()
  customCondition?: string;

  @ApiPropertyOptional({
    description: 'Expected URL pattern for URL_CHANGE wait',})@IsOptional()
  @IsString()
  expectedUrl?: string;

  @ApiPropertyOptional({
    description: 'Session ID to perform wait operation in',})@IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Polling interval for custom conditions in milliseconds',minimum: 100,maximum: 5000,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(5000)
  pollingIntervalMs?: number = 500;

  @ApiPropertyOptional({
    description: 'Additional wait options',type: 'object',})@IsOptional()
  @IsObject()
  options?: {
    visible?: boolean;
    hidden?: boolean;
    stable?: boolean;
  };
}

/**
 * Browser execution result DTO
 */
export class BrowserExecutionResultDto {
  @ApiProperty({
    description: 'Unique execution identifier',})executionId: string = '';@ApiProperty({description: 'Current execution status',enum: BrowserExecutionStatus,})
  status: BrowserExecutionStatus = BrowserExecutionStatus.QUEUED;

  @ApiProperty({
    description: 'Task name that was executed',})taskName: string = '';@ApiProperty({description: 'Execution type that was performed',enum: BrowserExecutionType,})
  executionType: BrowserExecutionType = BrowserExecutionType.INTERACTION;

  @ApiProperty({
    description: 'Execution start timestamp',})startedAt: Date = new Date();

  @ApiPropertyOptional({
    description: 'Execution completion timestamp',})completedAt?: Date;

  @ApiProperty({
    description: 'Execution duration in milliseconds',})durationMs: number = 0;

  @ApiPropertyOptional({
    description: 'Success indicator',})success?: boolean;

  @ApiPropertyOptional({
    description: 'Result data from execution',type: 'object',additionalProperties: true,})
  result?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Screenshots captured during execution',type: [String],})
  screenshots?: string[];

  @ApiPropertyOptional({
    description: 'Error message if execution failed',})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',type: 'object',})errorDetails?: {
    code: string;
    type: string;
    stack?: string;
    context?: Record<string, unknown>;
  };

  @ApiProperty({
    description: 'Execution logs and events',type: [Object],})
  logs: Array<{
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';message: string;category?: string;
    data?: Record<string, unknown>;
  }> = [];

  @ApiPropertyOptional({
    description: 'Session ID used for execution',})sessionId?: string;

  @ApiPropertyOptional({
    description: 'Retry information if applicable',type: 'object',})retryInfo?: {
    attemptNumber: number;
    maxRetries: number;
    nextRetryAt?: Date;
  };

  @ApiPropertyOptional({
    description: 'Performance metrics',type: 'object',})metrics?: {
    networkRequests: number;
    domNodes: number;
    memoryUsage: number;
    cpuTime: number;
  };
}

/**
 * Browser status response DTO
 */
export class BrowserStatusDto {
  @ApiProperty({
    description: 'Overall browser service status',})serviceStatus: 'healthy' | 'degraded' | 'down' = 'healthy';@ApiProperty({description: 'Active browser sessions count',})activeSessions: number = 0;

  @ApiProperty({
    description: 'Running executions count',})runningExecutions: number = 0;

  @ApiProperty({
    description: 'Queued executions count',})queuedExecutions: number = 0;

  @ApiProperty({
    description: 'Total executions today',})totalExecutionsToday: number = 0;

  @ApiProperty({
    description: 'Success rate percentage for today',})successRateToday: number = 0;

  @ApiProperty({
    description: 'Average execution time in milliseconds',})averageExecutionTimeMs: number = 0;

  @ApiPropertyOptional({
    description: 'System resource usage',type: 'object',})resourceUsage?: {
    cpuPercent: number;
    memoryPercent: number;
    diskSpacePercent: number;
    networkConnections: number;
  };

  @ApiPropertyOptional({
    description: 'Recent execution summary',type: [Object],})
  recentExecutions?: Array<{
    executionId: string;
    taskName: string;
    status: BrowserExecutionStatus;
    durationMs: number;
    timestamp: Date;
  }>;

  @ApiProperty({
    description: 'Status check timestamp',})timestamp: Date = new Date();

  @ApiPropertyOptional({
    description: 'Service uptime in seconds',})uptimeSeconds?: number;

  @ApiPropertyOptional({
    description: 'Last error information',type: 'object',})lastError?: {
    message: string;
    timestamp: Date;
    executionId?: string;
  };
}

/**
 * Execution queue status DTO
 */
export class ExecutionQueueStatusDto {
  @ApiProperty({
    description: 'Queue length',})queueLength: number = 0;

  @ApiProperty({
    description: 'Processing capacity',})processingCapacity: number = 0;

  @ApiProperty({
    description: 'Estimated wait time in milliseconds',})estimatedWaitTimeMs: number = 0;

  @ApiProperty({
    description: 'Queue items by priority',type: 'object',})queueByPriority: {
    critical: number;
    high: number;
    normal: number;
    low: number;
  } = { critical: 0, high: 0, normal: 0, low: 0 };

  @ApiProperty({
    description: 'Active workers count',})activeWorkers: number = 0;

  @ApiProperty({
    description: 'Available workers count',
  })
  availableWorkers: number = 0;
}