/**
 * Enhanced Screenshot DTOs - Advanced Screenshot Capture and Management
 *
 * This module provides comprehensive Data Transfer Objects for screenshot capture
 * with advanced validation, format optimization, and enterprise-grade storage
 * management. Supports multiple capture modes and intelligent image processing.
 *
 * @fileoverview Enhanced screenshot DTOs with advanced capture capabilities
 * @version 2.0.0
 * @author DTO & Validation Agent
 * @since Browser-Use API Endpoints Implementation
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsPositive,
  IsHexColor,
  IsBase64,
  IsMimeType,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enhanced screenshot formats with compression options
 */
export enum ScreenshotFormat {
  PNG = 'png',
  JPEG = 'jpeg',
  WEBP = 'webp',
  AVIF = 'avif',
  BMP = 'bmp',
  TIFF = 'tiff',
}

/**
 * Screenshot capture types with advanced options
 */
export enum ScreenshotType {
  FULLPAGE = 'fullpage',
  VIEWPORT = 'viewport',
  ELEMENT = 'element',
  VISIBLE_AREA = 'visible_area',
  ABOVE_FOLD = 'above_fold',
  MOBILE_VIEWPORT = 'mobile_viewport',
  CUSTOM_CLIP = 'custom_clip',
  MULTI_ELEMENT = 'multi_element',
}

/**
 * Image quality levels for optimization
 */
export enum ImageQuality {
  MAXIMUM = 'maximum',     // 100% quality, largest file
  HIGH = 'high',           // 90% quality
  STANDARD = 'standard',   // 80% quality (default)
  OPTIMIZED = 'optimized', // 70% quality, good compression
  COMPRESSED = 'compressed', // 60% quality, high compression
  MINIMAL = 'minimal',     // 40% quality, smallest file
}

/**
 * Screenshot processing operations
 */
export enum ImageProcessingOperation {
  RESIZE = 'resize',
  CROP = 'crop',
  ROTATE = 'rotate',
  FLIP = 'flip',
  BLUR = 'blur',
  SHARPEN = 'sharpen',
  GRAYSCALE = 'grayscale',
  SEPIA = 'sepia',
  BRIGHTNESS = 'brightness',
  CONTRAST = 'contrast',
  WATERMARK = 'watermark',
  ANNOTATE = 'annotate',
}

/**
 * Storage options for screenshots
 */
export enum StorageOption {
  MEMORY = 'memory',         // Keep in memory only
  LOCAL_DISK = 'local_disk', // Save to local filesystem
  CLOUD_STORAGE = 'cloud_storage', // Upload to cloud storage
  DATABASE = 'database',     // Store in database as BLOB
  CDN = 'cdn',              // Upload to CDN
  TEMPORARY = 'temporary',   // Temporary storage with TTL
}

/**
 * Screenshot annotation types
 */
export enum AnnotationType {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  ARROW = 'arrow',
  TEXT = 'text',
  HIGHLIGHT = 'highlight',
  BLUR_REGION = 'blur_region',
  REDACT = 'redact',
  CALLOUT = 'callout',
}

/**
 * Advanced clipping region configuration
 */
export class ClipRegion {
  @ApiProperty({
    description: 'X coordinate of top-left corner',
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'X coordinate must be a number' })
  @Min(0, { message: 'X coordinate must be non-negative' })
  @Max(10000, { message: 'X coordinate too large' })
  x!: number;

  @ApiProperty({
    description: 'Y coordinate of top-left corner',
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Y coordinate must be a number' })
  @Min(0, { message: 'Y coordinate must be non-negative' })
  @Max(10000, { message: 'Y coordinate too large' })
  y!: number;

  @ApiProperty({
    description: 'Width of clipping region',
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Width must be a number' })
  @Min(1, { message: 'Width must be positive' })
  @Max(10000, { message: 'Width too large' })
  width!: number;

  @ApiProperty({
    description: 'Height of clipping region',
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(1, { message: 'Height must be positive' })
  @Max(10000, { message: 'Height too large' })
  height!: number;

  @ApiPropertyOptional({
    description: 'Rounded corners radius',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Border radius must be a number' })
  @Min(0, { message: 'Border radius must be non-negative' })
  @Max(100, { message: 'Border radius too large' })
  borderRadius?: number;
}

/**
 * Screenshot annotation configuration
 */
export class ScreenshotAnnotation {
  @ApiProperty({
    description: 'Annotation type',
    enum: AnnotationType,
  })
  @IsEnum(AnnotationType, { message: 'Invalid annotation type' })
  type!: AnnotationType;

  @ApiProperty({
    description: 'Annotation coordinates',
  })
  @ValidateNested()
  @Type(() => ClipRegion)
  coordinates!: ClipRegion;

  @ApiPropertyOptional({
    description: 'Annotation style configuration',
  })
  @IsOptional()
  @IsObject()
  style?: {
    color?: string;
    thickness?: number;
    fillColor?: string;
    opacity?: number;
    dashPattern?: number[];
    fontSize?: number;
    fontFamily?: string;
  };

  @ApiPropertyOptional({
    description: 'Text content for text annotations',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Text must be a string' })
  @MaxLength(500, { message: 'Text too long' })
  text?: string;

  @ApiPropertyOptional({
    description: 'Z-index for layering annotations',
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Z-index must be a number' })
  @Min(0, { message: 'Z-index must be non-negative' })
  @Max(1000, { message: 'Z-index too high' })
  zIndex?: number;

  @ApiPropertyOptional({
    description: 'Animation configuration for dynamic annotations',
  })
  @IsOptional()
  @IsObject()
  animation?: {
    type: 'fade' | 'slide' | 'pulse' | 'bounce';
    duration: number;
    delay?: number;
    repeat?: number;
  };
}

/**
 * Image processing configuration
 */
export class ImageProcessing {
  @ApiPropertyOptional({
    description: 'Processing operations to apply',
    type: [String],
    enum: ImageProcessingOperation,
  })
  @IsOptional()
  @IsArray({ message: 'Operations must be an array' })
  @IsEnum(ImageProcessingOperation, { each: true, message: 'Invalid processing operation' })
  @ArrayMaxSize(10, { message: 'Too many processing operations' })
  operations?: ImageProcessingOperation[];

  @ApiPropertyOptional({
    description: 'Resize configuration',
  })
  @IsOptional()
  @IsObject()
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
    resizeMode?: 'fit' | 'fill' | 'stretch' | 'crop';
  };

  @ApiPropertyOptional({
    description: 'Crop configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClipRegion)
  crop?: ClipRegion;

  @ApiPropertyOptional({
    description: 'Rotation angle in degrees',
    minimum: -360,
    maximum: 360,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Rotation must be a number' })
  @Min(-360, { message: 'Rotation angle too negative' })
  @Max(360, { message: 'Rotation angle too positive' })
  rotation?: number;

  @ApiPropertyOptional({
    description: 'Flip configuration',
  })
  @IsOptional()
  @IsObject()
  flip?: {
    horizontal?: boolean;
    vertical?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Filter adjustments',
  })
  @IsOptional()
  @IsObject()
  filters?: {
    brightness?: number;    // -100 to 100
    contrast?: number;      // -100 to 100
    saturation?: number;    // -100 to 100
    hue?: number;          // -180 to 180
    blur?: number;         // 0 to 10
    sharpen?: number;      // 0 to 10
  };

  @ApiPropertyOptional({
    description: 'Watermark configuration',
  })
  @IsOptional()
  @IsObject()
  watermark?: {
    text?: string;
    image?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
    scale?: number;
  };
}

/**
 * Advanced wait conditions for screenshot capture
 */
export class WaitConditions {
  @ApiPropertyOptional({
    description: 'CSS selector to wait for before capture',
    example: '.content-loaded, #main-image',
  })
  @IsOptional()
  @IsString({ message: 'CSS selector must be a string' })
  @MaxLength(1000, { message: 'CSS selector too long' })
  selector?: string;

  @ApiPropertyOptional({
    description: 'Wait timeout in seconds',
    minimum: 1,
    maximum: 300,
    default: 30,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Timeout must be a number' })
  @Min(1, { message: 'Timeout must be at least 1 second' })
  @Max(300, { message: 'Timeout too long' })
  timeoutSeconds?: number = 30;

  @ApiPropertyOptional({
    description: 'Wait for network to be idle',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Network idle must be boolean' })
  networkIdle?: boolean = false;

  @ApiPropertyOptional({
    description: 'Page load state to wait for',
    enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
    default: 'load',
  })
  @IsOptional()
  @IsEnum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
  loadState?: string = 'load';

  @ApiPropertyOptional({
    description: 'Additional delay after conditions are met (milliseconds)',
    minimum: 0,
    maximum: 10000,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Additional delay must be a number' })
  @Min(0, { message: 'Additional delay must be non-negative' })
  @Max(10000, { message: 'Additional delay too long' })
  additionalDelayMs?: number = 0;

  @ApiPropertyOptional({
    description: 'JavaScript condition to evaluate',
    example: 'window.dataLoaded === true',
  })
  @IsOptional()
  @IsString({ message: 'JavaScript condition must be a string' })
  @MaxLength(1000, { message: 'JavaScript condition too long' })
  javascriptCondition?: string;

  @ApiPropertyOptional({
    description: 'Wait for fonts to load',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Font loading must be boolean' })
  waitForFonts?: boolean = true;

  @ApiPropertyOptional({
    description: 'Wait for images to load',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Image loading must be boolean' })
  waitForImages?: boolean = true;
}

/**
 * Enhanced Screenshot Capture DTO
 */
export class CaptureScreenshotDto {
  @ApiPropertyOptional({
    description: 'Screenshot capture type',
    enum: ScreenshotType,
    default: ScreenshotType.FULLPAGE,
  })
  @IsOptional()
  @IsEnum(ScreenshotType, { message: 'Invalid screenshot type' })
  type?: ScreenshotType = ScreenshotType.FULLPAGE;

  @ApiPropertyOptional({
    description: 'Output image format',
    enum: ScreenshotFormat,
    default: ScreenshotFormat.PNG,
  })
  @IsOptional()
  @IsEnum(ScreenshotFormat, { message: 'Invalid screenshot format' })
  format?: ScreenshotFormat = ScreenshotFormat.PNG;

  @ApiPropertyOptional({
    description: 'Image quality level',
    enum: ImageQuality,
    default: ImageQuality.STANDARD,
  })
  @IsOptional()
  @IsEnum(ImageQuality, { message: 'Invalid image quality' })
  quality?: ImageQuality = ImageQuality.STANDARD;

  @ApiPropertyOptional({
    description: 'Manual quality value (overrides quality enum)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Quality value must be a number' })
  @Min(1, { message: 'Quality must be at least 1' })
  @Max(100, { message: 'Quality must not exceed 100' })
  qualityValue?: number;

  @ApiPropertyOptional({
    description: 'CSS selector of specific element to capture',
    example: '#main-content, .screenshot-target',
  })
  @IsOptional()
  @IsString({ message: 'Element selector must be a string' })
  @MaxLength(1000, { message: 'Element selector too long' })
  @Matches(/^[a-zA-Z0-9\s\-_#.,:[\]()>"'=*+~^$|\\]+$/, {
    message: 'Invalid CSS selector format'
  })
  elementSelector?: string;

  @ApiPropertyOptional({
    description: 'Multiple element selectors for multi-element capture',
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Element selectors must be an array' })
  @IsString({ each: true, message: 'Each selector must be a string' })
  @ArrayMaxSize(20, { message: 'Too many element selectors' })
  elementSelectors?: string[];

  @ApiPropertyOptional({
    description: 'Custom clipping region',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ClipRegion)
  clipRegion?: ClipRegion;

  @ApiPropertyOptional({
    description: 'Wait conditions before capture',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WaitConditions)
  waitConditions?: WaitConditions;

  @ApiPropertyOptional({
    description: 'Image processing operations',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageProcessing)
  processing?: ImageProcessing;

  @ApiPropertyOptional({
    description: 'Screenshot annotations',
    type: [ScreenshotAnnotation],
  })
  @IsOptional()
  @IsArray({ message: 'Annotations must be an array' })
  @ValidateNested({ each: true })
  @Type(() => ScreenshotAnnotation)
  @ArrayMaxSize(50, { message: 'Too many annotations' })
  annotations?: ScreenshotAnnotation[];

  @ApiPropertyOptional({
    description: 'Storage configuration',
    enum: StorageOption,
    default: StorageOption.MEMORY,
  })
  @IsOptional()
  @IsEnum(StorageOption, { message: 'Invalid storage option' })
  storageOption?: StorageOption = StorageOption.MEMORY;

  @ApiPropertyOptional({
    description: 'Custom filename (without extension)',
    example: 'homepage-screenshot-2024-01-01',
  })
  @IsOptional()
  @IsString({ message: 'Filename must be a string' })
  @MinLength(1, { message: 'Filename cannot be empty' })
  @MaxLength(200, { message: 'Filename too long' })
  @Matches(/^[a-zA-Z0-9\-_. ]+$/, {
    message: 'Filename contains invalid characters'
  })
  filename?: string;

  @ApiPropertyOptional({
    description: 'Include timestamp in metadata',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include timestamp must be boolean' })
  includeTimestamp?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include page URL in metadata',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include URL must be boolean' })
  includeUrl?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include page title in metadata',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Include title must be boolean' })
  includePageTitle?: boolean = true;

  @ApiPropertyOptional({
    description: 'Return screenshot as base64 string',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Return base64 must be boolean' })
  returnBase64?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum file size in bytes',
    minimum: 1024,
    maximum: 50000000,
    default: 10000000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Max file size must be a number' })
  @Min(1024, { message: 'Max file size too small' })
  @Max(50000000, { message: 'Max file size too large' })
  maxFileSizeBytes?: number = 10000000;

  @ApiPropertyOptional({
    description: 'Hide elements before capture',
    example: ['.advertisement', '#cookie-banner', '.popup'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Hide elements must be an array' })
  @IsString({ each: true, message: 'Each hide selector must be a string' })
  @ArrayMaxSize(50, { message: 'Too many elements to hide' })
  hideElements?: string[];

  @ApiPropertyOptional({
    description: 'Scroll element into view before capture',
  })
  @IsOptional()
  @IsString({ message: 'Scroll target must be a string' })
  @MaxLength(1000, { message: 'Scroll target selector too long' })
  scrollIntoView?: string;

  @ApiPropertyOptional({
    description: 'Device emulation settings',
  })
  @IsOptional()
  @IsObject()
  deviceEmulation?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
    userAgent?: string;
  };

  @ApiPropertyOptional({
    description: 'Privacy protection settings',
  })
  @IsOptional()
  @IsObject()
  privacySettings?: {
    blurPersonalInfo?: boolean;
    redactSensitiveFields?: boolean;
    hidePersonalData?: boolean;
    anonymizeText?: boolean;
  };

  @ApiPropertyOptional({
    description: 'Capture metadata and context',
  })
  @IsOptional()
  @IsObject()
  metadata?: {
    purpose?: string;
    category?: string;
    tags?: string[];
    description?: string;
    businessUnit?: string;
    projectId?: string;
  };
}

/**
 * Enhanced Screenshot Response DTO
 */
export class ScreenshotResponseDto {
  @ApiProperty({ description: 'Unique screenshot identifier' })
  @IsUUID(4, { message: 'Invalid screenshot ID format' })
  id!: string;

  @ApiProperty({ description: 'Screenshot capture success status' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: 'Screenshot data as base64 string' })
  @IsOptional()
  @IsBase64({ message: 'Invalid base64 format' })
  data?: string;

  @ApiProperty({ description: 'Screenshot format' })
  @IsEnum(ScreenshotFormat)
  format!: ScreenshotFormat;

  @ApiProperty({ description: 'Screenshot type' })
  @IsEnum(ScreenshotType)
  type!: ScreenshotType;

  @ApiProperty({ description: 'File size in bytes' })
  @IsNumber()
  @Min(0)
  sizeBytes!: number;

  @ApiProperty({ description: 'Image dimensions' })
  dimensions!: {
    width: number;
    height: number;
    originalWidth?: number;
    originalHeight?: number;
  };

  @ApiProperty({ description: 'Comprehensive screenshot metadata' })
  metadata!: {
    capturedAt: Date;
    sessionId: string;
    url: string;
    title: string;
    captureType: ScreenshotType;
    format: ScreenshotFormat;
    quality: number;
    deviceInfo?: {
      userAgent: string;
      viewport: {
        width: number;
        height: number;
      };
      deviceScaleFactor: number;
    };
    processingApplied?: ImageProcessingOperation[];
    annotationsCount?: number;
    captureSettings: CaptureScreenshotDto;
  };

  @ApiProperty({ description: 'Storage information' })
  @IsOptional()
  storageInfo?: {
    storageOption: StorageOption;
    filePath?: string;
    url?: string;
    cdnUrl?: string;
    expiresAt?: Date;
    downloadUrl?: string;
  };

  @ApiProperty({ description: 'Capture performance metrics' })
  performanceMetrics!: {
    totalCaptureTimeMs: number;
    waitTimeMs: number;
    processingTimeMs: number;
    annotationTimeMs?: number;
    uploadTimeMs?: number;
    memoryUsageMB: number;
  };

  @ApiProperty({ description: 'Quality assessment results' })
  @IsOptional()
  qualityAssessment?: {
    overallScore: number; // 0-100
    clarity: number;
    completeness: number;
    accuracy: number;
    issues?: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
    }>;
  };

  @ApiProperty({ description: 'Error information if capture failed' })
  @IsOptional()
  error?: {
    code: string;
    message: string;
    category: 'capture_failed' | 'processing_failed' | 'storage_failed' | 'validation_failed';
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryable: boolean;
    context: {
      element?: string;
      waitCondition?: string;
      processingStep?: string;
      storageLocation?: string;
    };
  };

  @ApiProperty({ description: 'Correlation ID for request tracking' })
  @IsUUID()
  correlationId!: string;

  @ApiProperty({ description: 'Response generation timestamp' })
  timestamp!: Date;
}

// Export enhanced screenshot DTOs
export {
  ScreenshotFormat,
  ScreenshotType,
  ImageQuality,
  ImageProcessingOperation,
  StorageOption,
  AnnotationType,
  ClipRegion,
  ScreenshotAnnotation,
  ImageProcessing,
  WaitConditions,
};