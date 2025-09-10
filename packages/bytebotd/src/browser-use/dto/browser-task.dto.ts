import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
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
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Browser task execution priorities
 */
export enum BrowserTaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Browser task execution status
 */
export enum BrowserTaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
}

/**
 * Browser automation action types
 */
export enum BrowserActionType {
  NAVIGATE = 'navigate',
  CLICK = 'click',
  TYPE = 'type',
  SCROLL = 'scroll',
  SCREENSHOT = 'screenshot',
  EXTRACT_TEXT = 'extract_text',
  EXTRACT_DATA = 'extract_data',
  FILL_FORM = 'fill_form',
  SUBMIT_FORM = 'submit_form',
  WAIT_FOR_ELEMENT = 'wait_for_element',
  WAIT_FOR_URL = 'wait_for_url',
  CUSTOM = 'custom',
}

/**
 * Browser session configuration
 */
export class BrowserSessionConfigDto {
  @ApiPropertyOptional({
    description: 'Browser viewport width',
    minimum: 320,
    maximum: 3840,
    default: 1920,
  })
  @IsOptional()
  @IsNumber()
  @Min(320)
  @Max(3840)
  viewportWidth?: number = 1920;

  @ApiPropertyOptional({
    description: 'Browser viewport height',
    minimum: 240,
    maximum: 2160,
    default: 1080,
  })
  @IsOptional()
  @IsNumber()
  @Min(240)
  @Max(2160)
  viewportHeight?: number = 1080;

  @ApiPropertyOptional({
    description: 'Run browser in headless mode',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  headless?: boolean = false;

  @ApiPropertyOptional({
    description: 'Enable browser developer tools',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  devtools?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom user agent string',
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Additional Chrome launch arguments',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalArgs?: string[];

  @ApiPropertyOptional({
    description: 'Proxy configuration',
    type: 'object', additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };

  @ApiPropertyOptional({
    description: 'Browser profile directory path (local filesystem)',
  })
  @IsOptional()
  @IsString()
  profilePath?: string;

  @ApiPropertyOptional({
    description: 'Session timeout in milliseconds',
    minimum: 1000,
    maximum: 3600000,
    default: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(3600000)
  timeoutMs?: number = 300000; // 5 minutes default
}

/**
 * Browser action configuration
 */
export class BrowserActionDto {
  @ApiProperty({
    description: 'Type of browser action to perform',
    enum: BrowserActionType,
  })
  @IsEnum(BrowserActionType)
  type: BrowserActionType;

  @ApiPropertyOptional({
    description: 'CSS selector or XPath for element targeting',
  })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Text content for typing actions',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'URL for navigation actions',
  })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  url?: string;

  @ApiPropertyOptional({
    description: 'Wait timeout in milliseconds',
    minimum: 100,
    maximum: 60000,
    default: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(60000)
  waitTimeoutMs?: number = 5000;

  @ApiPropertyOptional({
    description: 'Additional action parameters',
    type: 'object', additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Expected outcome validation',
    type: 'object', additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  validation?: {
    expectedUrl?: string;
    expectedText?: string;
    expectedSelector?: string;
  };
}

/**
 * Create browser task request
 */
export class CreateBrowserTaskDto {
  @ApiProperty({
    description: 'Descriptive name for the browser task',
    example: 'Extract product information from e-commerce site',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Detailed task description or instructions',
    example: 'Navigate to product page, extract name, price, and description',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Array of browser actions to execute sequentially',
    type: [BrowserActionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BrowserActionDto)
  actions: BrowserActionDto[];

  @ApiPropertyOptional({
    description: 'Task execution priority',
    enum: BrowserTaskPriority,
    default: BrowserTaskPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(BrowserTaskPriority)
  priority?: BrowserTaskPriority = BrowserTaskPriority.NORMAL;

  @ApiPropertyOptional({
    description: 'Browser session configuration',
    type: BrowserSessionConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BrowserSessionConfigDto)
  sessionConfig?: BrowserSessionConfigDto;

  @ApiPropertyOptional({
    description: 'Maximum execution time in milliseconds',
    minimum: 5000,
    maximum: 1800000, // 30 minutes
    default: 300000, // 5 minutes
  })
  @IsOptional()
  @IsNumber()
  @Min(5000)
  @Max(1800000)
  maxExecutionTimeMs?: number = 300000;

  @ApiPropertyOptional({
    description: 'Custom metadata for task tracking',
    type: 'object', additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Enable detailed logging and screenshots',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableLogging?: boolean = true;

  @ApiPropertyOptional({
    description: 'Continue on errors (vs fail fast)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = false;
}

/**
 * Browser task execution result
 */
export class BrowserTaskResultDto {
  @ApiProperty({
    description: 'Unique task identifier',
  })
  taskId: string;

  @ApiProperty({
    description: 'Current task status',
    enum: BrowserTaskStatus,
  })
  status: BrowserTaskStatus;

  @ApiProperty({
    description: 'Task execution start timestamp',
  })
  startedAt: Date;

  @ApiPropertyOptional({
    description: 'Task execution completion timestamp',
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'Total execution time in milliseconds',
  })
  executionTimeMs: number;

  @ApiProperty({
    description: 'Number of actions completed successfully',
  })
  actionsCompleted: number;

  @ApiProperty({
    description: 'Total number of actions in task',
  })
  totalActions: number;

  @ApiPropertyOptional({
    description: 'Extracted data from browser actions',
    type: 'object', additionalProperties: true,
  })
  extractedData?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Screenshots captured during execution',
    type: [String],
  })
  screenshots?: string[]; // Base64 or file paths

  @ApiPropertyOptional({
    description: 'Error message if task failed',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',
    type: 'object', additionalProperties: true,
  })
  errorDetails?: Record<string, any>;

  @ApiProperty({
    description: 'Execution logs and action details',
    type: [Object],
  })
  logs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    actionIndex?: number;
    screenshot?: string;
    metadata?: Record<string, any>;
  }>;

  @ApiPropertyOptional({
    description: 'Task metadata and configuration used',
    type: 'object', additionalProperties: true,
  })
  metadata?: Record<string, any>;
}
