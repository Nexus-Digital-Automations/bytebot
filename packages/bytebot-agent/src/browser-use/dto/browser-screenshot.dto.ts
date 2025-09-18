/**
 * Browser Screenshot DTOs
 *
 * Data Transfer Objects for screenshot capture and management operations.
 * Provides comprehensive options for capturing, storing, and retrieving
 * browser screenshots with quality and format controls.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScreenshotFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  WEBP = 'webp',
}

export enum ScreenshotType {
  FULLPAGE = 'fullpage',
  VIEWPORT = 'viewport',
  ELEMENT = 'element',
}

export class CaptureScreenshotDto {
  @ApiPropertyOptional({
    description: 'Screenshot type to capture',
    enum: ScreenshotType,
    default: ScreenshotType.FULLPAGE,
  })
  @IsOptional()
  @IsEnum(ScreenshotType)
  type?: ScreenshotType = ScreenshotType.FULLPAGE;

  @ApiPropertyOptional({
    description: 'Screenshot format',
    enum: ScreenshotFormat,
    default: ScreenshotFormat.PNG,
  })
  @IsOptional()
  @IsEnum(ScreenshotFormat)
  format?: ScreenshotFormat = ScreenshotFormat.PNG;

  @ApiPropertyOptional({
    description: 'JPEG quality (only for JPEG format)',
    minimum: 1,
    maximum: 100,
    default: 80,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number = 80;

  @ApiPropertyOptional({
    description: 'CSS selector of element to screenshot (for element type)',
  })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Include timestamp in screenshot metadata',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeTimestamp?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include page URL in screenshot metadata',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeUrl?: boolean = true;

  @ApiPropertyOptional({
    description: 'Custom filename prefix',
  })
  @IsOptional()
  @IsString()
  filenamePrefix?: string;

  @ApiPropertyOptional({
    description: 'Capture options for fine-tuning',
  })
  @IsOptional()
  @IsObject()
  options?: {
    width?: number;
    height?: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Wait for specific conditions before capture',
  })
  @IsOptional()
  @IsObject()
  waitFor?: {
    selector?: string; // Wait for element to be visible
    timeout?: number; // Wait timeout in seconds
    networkIdle?: boolean; // Wait for network to be idle
    loadState?: 'load' | 'domcontentloaded' | 'networkidle'; // Wait for page load state
  };

  @ApiPropertyOptional({
    description: 'Capture full page screenshot',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fullPage?: boolean = false;

  @ApiPropertyOptional({
    description: 'Clip area for screenshot',
  })
  @IsOptional()
  @IsObject()
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiPropertyOptional({
    description: 'Return screenshot as base64 string',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  returnBase64?: boolean = true;

  @ApiPropertyOptional({
    description: 'Compare screenshot with existing image',
  })
  @IsOptional()
  @IsString()
  compareWith?: string;

  @ApiPropertyOptional({
    description: 'Omit default white background',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  omitBackground?: boolean = false;

  @ApiPropertyOptional({
    description: 'Delay before capturing screenshot in milliseconds',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delay?: number = 0;

  @ApiPropertyOptional({
    description: 'CSS selectors of elements to hide before capture',
  })
  @IsOptional()
  @IsString({ each: true })
  hideElements?: string[];

  @ApiPropertyOptional({
    description: 'CSS selector of element to scroll into view before capture',
  })
  @IsOptional()
  @IsString()
  scrollIntoView?: string;

  @ApiPropertyOptional({
    description: 'Annotations to add to the screenshot',
  })
  @IsOptional()
  @IsObject()
  annotations?: Array<{
    type: 'rectangle' | 'circle' | 'arrow' | 'text';
    coordinates: {
      x: number;
      y: number;
      width?: number;
      height?: number;
    };
    style: {
      color: string;
      thickness: number;
      fill?: string;
    };
    text?: string;
  }>;

  @ApiPropertyOptional({
    description: 'Save screenshot to disk',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  saveToDisk?: boolean = false;
}

export class ScreenshotResponseDto {
  @ApiProperty({ description: 'Unique screenshot identifier' })
  id!: string;

  @ApiProperty({ description: 'Screenshot data as base64 string' })
  data!: string;

  @ApiProperty({ description: 'Screenshot format', enum: ScreenshotFormat })
  format!: ScreenshotFormat;

  @ApiProperty({ description: 'Screenshot type', enum: ScreenshotType })
  type!: ScreenshotType;

  @ApiProperty({ description: 'File size in bytes' })
  sizeBytes!: number;

  @ApiProperty({ description: 'Screenshot dimensions' })
  dimensions!: {
    width: number;
    height: number;
  };

  @ApiProperty({ description: 'Screenshot metadata' })
  metadata!: {
    capturedAt: Date;
    sessionId: string;
    url: string;
    title: string;
    selector?: string;
    quality?: number;
    deviceScaleFactor: number;
  };

  @ApiProperty({ description: 'Local file path (if saved to disk)' })
  filePath?: string;

  @ApiProperty({ description: 'Screenshot capture duration in milliseconds' })
  captureDurationMs!: number;

  @ApiProperty({ description: 'Whether screenshot was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Screenshot identifier (legacy)' })
  screenshotId?: string;

  @ApiProperty({ description: 'Screenshot capture timestamp' })
  timestamp?: Date;

  @ApiProperty({ description: 'Associated session identifier' })
  sessionId?: string;

  @ApiProperty({ description: 'Error information if capture failed' })
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    timestamp?: Date;
  };
}

// Type aliases for backward compatibility
export type BrowserScreenshotDto = CaptureScreenshotDto;
