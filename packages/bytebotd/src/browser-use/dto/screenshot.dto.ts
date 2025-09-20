import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Screenshot capture formats
 */
export enum ScreenshotFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  WEBP = 'webp',
}

/**
 * Screenshot capture types
 */
export enum ScreenshotType {
  FULL_PAGE = 'full_page',
  VIEWPORT = 'viewport',
  ELEMENT = 'element',
}

/**
 * Screenshot quality modes
 */
export enum ScreenshotQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  MAXIMUM = 'maximum',
}

/**
 * Element selector configuration for screenshot capture
 */
export class ScreenshotElementSelectorDto {
  @ApiProperty({
    description: 'CSS selector for target element',
    example: '#main-content',
  })
  @IsString()
  selector: string = '';

  @ApiPropertyOptional({
    description: 'Wait for element to be visible before capturing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForVisible?: boolean = true;

  @ApiPropertyOptional({
    description: 'Wait timeout in milliseconds',
    minimum: 100,
    maximum: 30000,
    default: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(30000)
  waitTimeoutMs?: number = 5000;

  @ApiPropertyOptional({
    description: 'Include padding around element in pixels',
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  padding?: number = 0;

  @ApiPropertyOptional({
    description: 'Scroll element into view before capturing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  scrollIntoView?: boolean = true;
}

/**
 * Screenshot capture configuration
 */
export class ScreenshotCaptureDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string = '';

  @ApiPropertyOptional({
    description: 'Screenshot capture type',
    enum: ScreenshotType,
    default: ScreenshotType.VIEWPORT,
  })
  @IsOptional()
  @IsEnum(ScreenshotType)
  type?: ScreenshotType = ScreenshotType.VIEWPORT;

  @ApiPropertyOptional({
    description: 'Image format for screenshot',
    enum: ScreenshotFormat,
    default: ScreenshotFormat.PNG,
  })
  @IsOptional()
  @IsEnum(ScreenshotFormat)
  format?: ScreenshotFormat = ScreenshotFormat.PNG;

  @ApiPropertyOptional({
    description: 'Image quality level',
    enum: ScreenshotQuality,
    default: ScreenshotQuality.HIGH,
  })
  @IsOptional()
  @IsEnum(ScreenshotQuality)
  quality?: ScreenshotQuality = ScreenshotQuality.HIGH;

  @ApiPropertyOptional({
    description: 'Custom quality value for JPEG (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  customQuality?: number;

  @ApiPropertyOptional({
    description: 'Element selector for element-specific screenshots',
    type: ScreenshotElementSelectorDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScreenshotElementSelectorDto)
  elementSelector?: ScreenshotElementSelectorDto;

  @ApiPropertyOptional({
    description: 'Include device pixel ratio scaling',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeDeviceScaling?: boolean = true;

  @ApiPropertyOptional({
    description: 'Capture area coordinates for custom regions',
    type: 'object',
    properties: {
      x: { type: 'number', minimum: 0 },
      y: { type: 'number', minimum: 0 },
      width: { type: 'number', minimum: 1 },
      height: { type: 'number', minimum: 1 },
    },
  })
  @IsOptional()
  @IsObject()
  captureArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiPropertyOptional({
    description: 'Delay before capture in milliseconds',
    minimum: 0,
    maximum: 10000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  delayMs?: number = 0;

  @ApiPropertyOptional({
    description: 'Hide scrollbars in screenshot',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  hideScrollbars?: boolean = true;

  @ApiPropertyOptional({
    description: 'Additional screenshot metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Batch screenshot capture configuration
 */
export class BatchScreenshotCaptureDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string = '';

  @ApiProperty({
    description: 'Array of screenshot configurations to capture',
    type: [ScreenshotCaptureDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScreenshotCaptureDto)
  screenshots: Omit<ScreenshotCaptureDto, 'sessionId'>[] = [];

  @ApiPropertyOptional({
    description: 'Delay between captures in milliseconds',
    minimum: 0,
    maximum: 5000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  intervalMs?: number = 100;

  @ApiPropertyOptional({
    description: 'Continue capturing on individual failures',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;
}

/**
 * Screenshot capture result
 */
export class ScreenshotResultDto {
  @ApiProperty({
    description: 'Unique screenshot identifier',
    example: 'screenshot_xyz789',
  })
  screenshotId: string = '';

  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  sessionId: string = '';

  @ApiProperty({
    description: 'Screenshot capture type',
    enum: ScreenshotType,
  })
  type: ScreenshotType = ScreenshotType.VIEWPORT;

  @ApiProperty({
    description: 'Image format used',
    enum: ScreenshotFormat,
  })
  format: ScreenshotFormat = ScreenshotFormat.PNG;

  @ApiProperty({
    description: 'Base64 encoded image data',
  })
  imageData: string = '';

  @ApiProperty({
    description: 'Image dimensions',
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' },
    },
  })
  dimensions: {
    width: number;
    height: number;
  } = { width: 0, height: 0 };

  @ApiProperty({
    description: 'File size in bytes',
  })
  fileSizeBytes: number = 0;

  @ApiProperty({
    description: 'Capture timestamp',
  })
  capturedAt: Date = new Date();

  @ApiProperty({
    description: 'Capture duration in milliseconds',
  })
  captureDurationMs: number = 0;

  @ApiPropertyOptional({
    description: 'Element selector used for element screenshots',
  })
  elementSelector?: string;

  @ApiPropertyOptional({
    description: 'Element bounding box for element screenshots',
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      width: { type: 'number' },
      height: { type: 'number' },
    },
  })
  elementBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiProperty({
    description: 'Current page URL at time of capture',
  })
  pageUrl: string = '';

  @ApiProperty({
    description: 'Page title at time of capture',
  })
  pageTitle: string = '';

  @ApiPropertyOptional({
    description: 'Device pixel ratio used',
  })
  devicePixelRatio?: number;

  @ApiPropertyOptional({
    description: 'Viewport dimensions at time of capture',
    type: 'object',
    properties: {
      width: { type: 'number' },
      height: { type: 'number' },
    },
  })
  viewportSize?: {
    width: number;
    height: number;
  };

  @ApiPropertyOptional({
    description: 'Error message if capture failed',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}

/**
 * Batch screenshot capture result
 */
export class BatchScreenshotResultDto {
  @ApiProperty({
    description: 'Unique batch identifier',
    example: 'batch_abc123',
  })
  batchId: string = '';

  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  sessionId: string = '';

  @ApiProperty({
    description: 'Array of individual screenshot results',
    type: [ScreenshotResultDto],
  })
  screenshots: ScreenshotResultDto[] = [];

  @ApiProperty({
    description: 'Total screenshots requested',
  })
  totalRequested: number = 0;

  @ApiProperty({
    description: 'Screenshots captured successfully',
  })
  successfulCaptures: number = 0;

  @ApiProperty({
    description: 'Screenshots that failed to capture',
  })
  failedCaptures: number = 0;

  @ApiProperty({
    description: 'Batch execution start timestamp',
  })
  startedAt: Date = new Date();

  @ApiProperty({
    description: 'Batch execution completion timestamp',
  })
  completedAt: Date = new Date();

  @ApiProperty({
    description: 'Total batch execution time in milliseconds',
  })
  totalDurationMs: number = 0;

  @ApiPropertyOptional({
    description: 'Batch execution errors',
    type: [String],
  })
  errors?: string[];

  @ApiPropertyOptional({
    description: 'Batch metadata',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}