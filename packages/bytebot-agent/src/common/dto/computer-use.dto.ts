/**
 * Computer Use DTOs - Enterprise Computer Control API Validation
 *
 * This module provides comprehensive DTOs for computer control operations
 * with advanced validation, security constraints, and API documentation.
 * All computer-use endpoints use these DTOs for request/response validation.
 *
 * @fileoverview Computer control DTOs with enterprise validation
 * @version 1.0.0
 * @author API Security & Documentation Specialist
 */

import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
  Length,
  Matches,
  ValidateNested,
  IsNotEmpty,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BaseResponseDto,
  BaseEntityDto,
  PaginationDto,
  FilterDto,
} from './base.dto';

/**
 * Computer action types enumeration
 */
export enum ComputerActionType {
  SCREENSHOT = 'screenshot',
  CLICK = 'click',
  DOUBLE_CLICK = 'double_click',
  RIGHT_CLICK = 'right_click',
  DRAG = 'drag',
  TYPE = 'type',
  KEY = 'key',
  SCROLL = 'scroll',
  MOVE_MOUSE = 'move_mouse',
  WAIT = 'wait',
  OCR = 'ocr',
  FIND_ELEMENT = 'find_element',
}

/**
 * Mouse button enumeration
 */
export enum MouseButton {
  LEFT = 'left',
  RIGHT = 'right',
  MIDDLE = 'middle',
}

/**
 * Key modifier enumeration
 */
export enum KeyModifier {
  CTRL = 'ctrl',
  ALT = 'alt',
  SHIFT = 'shift',
  META = 'meta', // Windows/Cmd key
}

/**
 * Scroll direction enumeration
 */
export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

/**
 * Screen coordinates DTO
 */
export class ScreenCoordinatesDto {
  @ApiProperty({
    description: 'X coordinate on screen',
    example: 100,
    minimum: 0,
    maximum: 7680, // Support up to 8K resolution
  })
  @IsNumber({}, { message: 'X coordinate must be a number' })
  @Min(0, { message: 'X coordinate cannot be negative' })
  @Max(7680, { message: 'X coordinate exceeds maximum screen width' })
  @Expose()
  x: number;

  @ApiProperty({
    description: 'Y coordinate on screen',
    example: 200,
    minimum: 0,
    maximum: 4320, // Support up to 8K resolution
  })
  @IsNumber({}, { message: 'Y coordinate must be a number' })
  @Min(0, { message: 'Y coordinate cannot be negative' })
  @Max(4320, { message: 'Y coordinate exceeds maximum screen height' })
  @Expose()
  y: number;
}

/**
 * Screen region/bounds DTO
 */
export class ScreenRegionDto extends ScreenCoordinatesDto {
  @ApiProperty({
    description: 'Width of the region',
    example: 300,
    minimum: 1,
    maximum: 7680,
  })
  @IsNumber({}, { message: 'Width must be a number' })
  @Min(1, { message: 'Width must be at least 1 pixel' })
  @Max(7680, { message: 'Width exceeds maximum screen width' })
  @Expose()
  width: number;

  @ApiProperty({
    description: 'Height of the region',
    example: 400,
    minimum: 1,
    maximum: 4320,
  })
  @IsNumber({}, { message: 'Height must be a number' })
  @Min(1, { message: 'Height must be at least 1 pixel' })
  @Max(4320, { message: 'Height exceeds maximum screen height' })
  @Expose()
  height: number;
}

/**
 * Base computer action DTO
 */
export abstract class BaseComputerActionDto {
  @ApiProperty({
    description: 'Type of computer action to perform',
    enum: ComputerActionType,
    example: ComputerActionType.CLICK,
  })
  @IsEnum(ComputerActionType, { message: 'Invalid computer action type' })
  @Expose()
  action: ComputerActionType;

  @ApiPropertyOptional({
    description: 'Action timeout in milliseconds',
    example: 5000,
    minimum: 100,
    maximum: 60000,
    default: 5000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Timeout must be a number' })
  @Min(100, { message: 'Timeout cannot be less than 100ms' })
  @Max(60000, { message: 'Timeout cannot exceed 60 seconds' })
  @Expose()
  timeout?: number = 5000;

  @ApiPropertyOptional({
    description: 'Wait delay before executing action (milliseconds)',
    example: 100,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Wait delay must be a number' })
  @Min(0, { message: 'Wait delay cannot be negative' })
  @Max(10000, { message: 'Wait delay cannot exceed 10 seconds' })
  @Expose()
  waitBefore?: number;

  @ApiPropertyOptional({
    description: 'Wait delay after executing action (milliseconds)',
    example: 100,
    minimum: 0,
    maximum: 10000,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Wait delay must be a number' })
  @Min(0, { message: 'Wait delay cannot be negative' })
  @Max(10000, { message: 'Wait delay cannot exceed 10 seconds' })
  @Expose()
  waitAfter?: number;

  @ApiPropertyOptional({
    description: 'Action description for logging',
    example: 'Click on submit button',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: 'Description cannot exceed 200 characters' })
  @Transform(({ value }) => value?.trim())
  @Expose()
  description?: string;
}

/**
 * Screenshot action DTO
 */
export class ScreenshotActionDto extends BaseComputerActionDto {
  action: ComputerActionType.SCREENSHOT = ComputerActionType.SCREENSHOT;

  @ApiPropertyOptional({
    description: 'Capture specific region instead of full screen',
    type: ScreenRegionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScreenRegionDto)
  @Expose()
  region?: ScreenRegionDto;

  @ApiPropertyOptional({
    description: 'Include cursor in screenshot',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose()
  includeCursor?: boolean = false;

  @ApiPropertyOptional({
    description: 'Image format for screenshot',
    example: 'png',
    enum: ['png', 'jpeg', 'webp'],
    default: 'png',
  })
  @IsOptional()
  @IsEnum(['png', 'jpeg', 'webp'], { message: 'Invalid image format' })
  @Expose()
  format?: 'png' | 'jpeg' | 'webp' = 'png';

  @ApiPropertyOptional({
    description: 'Image quality for JPEG format (1-100)',
    example: 90,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Expose()
  quality?: number;
}

/**
 * Click action DTO
 */
export class ClickActionDto extends BaseComputerActionDto {
  action: ComputerActionType.CLICK = ComputerActionType.CLICK;

  @ApiProperty({
    description: 'Coordinates to click',
    type: ScreenCoordinatesDto,
  })
  @ValidateNested()
  @Type(() => ScreenCoordinatesDto)
  @Expose()
  coordinates: ScreenCoordinatesDto;

  @ApiPropertyOptional({
    description: 'Mouse button to click',
    enum: MouseButton,
    example: MouseButton.LEFT,
    default: MouseButton.LEFT,
  })
  @IsOptional()
  @IsEnum(MouseButton, { message: 'Invalid mouse button' })
  @Expose()
  button?: MouseButton = MouseButton.LEFT;

  @ApiPropertyOptional({
    description: 'Number of clicks (1 for single, 2 for double)',
    example: 1,
    minimum: 1,
    maximum: 3,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3)
  @Expose()
  clickCount?: number = 1;

  @ApiPropertyOptional({
    description: 'Hold modifier keys while clicking',
    enum: KeyModifier,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(KeyModifier, { each: true })
  @ArrayMaxSize(4)
  @Expose()
  modifiers?: KeyModifier[];
}

/**
 * Drag action DTO
 */
export class DragActionDto extends BaseComputerActionDto {
  action: ComputerActionType.DRAG = ComputerActionType.DRAG;

  @ApiProperty({
    description: 'Starting coordinates for drag',
    type: ScreenCoordinatesDto,
  })
  @ValidateNested()
  @Type(() => ScreenCoordinatesDto)
  @Expose()
  from: ScreenCoordinatesDto;

  @ApiProperty({
    description: 'Ending coordinates for drag',
    type: ScreenCoordinatesDto,
  })
  @ValidateNested()
  @Type(() => ScreenCoordinatesDto)
  @Expose()
  to: ScreenCoordinatesDto;

  @ApiPropertyOptional({
    description: 'Drag duration in milliseconds',
    example: 500,
    minimum: 100,
    maximum: 5000,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(5000)
  @Expose()
  duration?: number = 500;

  @ApiPropertyOptional({
    description: 'Mouse button for dragging',
    enum: MouseButton,
    default: MouseButton.LEFT,
  })
  @IsOptional()
  @IsEnum(MouseButton)
  @Expose()
  button?: MouseButton = MouseButton.LEFT;
}

/**
 * Type text action DTO
 */
export class TypeActionDto extends BaseComputerActionDto {
  action: ComputerActionType.TYPE = ComputerActionType.TYPE;

  @ApiProperty({
    description: 'Text to type',
    example: 'Hello, World!',
    minLength: 1,
    maxLength: 10000,
  })
  @IsString({ message: 'Text must be a string' })
  @Length(1, 10000, { message: 'Text must be between 1 and 10000 characters' })\n  @IsNotEmpty({ message: 'Text cannot be empty' })\n  // Security: Prevent potentially dangerous characters\n  @Matches(/^[\\x20-\\x7E\\r\\n\\t\\u00A0-\\uFFFF]*$/, {\n    message: 'Text contains invalid characters',\n  })\n  @Expose()\n  text: string;\n\n  @ApiPropertyOptional({\n    description: 'Typing speed in characters per minute',\n    example: 300,\n    minimum: 50,\n    maximum: 1000,\n    default: 300,\n  })\n  @IsOptional()\n  @IsNumber()\n  @Min(50)\n  @Max(1000)\n  @Expose()\n  typingSpeed?: number = 300;\n\n  @ApiPropertyOptional({\n    description: 'Clear existing text before typing',\n    example: false,\n    default: false,\n  })\n  @IsOptional()\n  @IsBoolean()\n  @Expose()\n  clearFirst?: boolean = false;\n}\n\n/**\n * Key press action DTO\n */\nexport class KeyActionDto extends BaseComputerActionDto {\n  action: ComputerActionType.KEY = ComputerActionType.KEY;\n\n  @ApiProperty({\n    description: 'Key or key combination to press',\n    example: 'Enter',\n    maxLength: 50,\n  })\n  @IsString({ message: 'Key must be a string' })\n  @Length(1, 50, { message: 'Key must be between 1 and 50 characters' })\n  @IsNotEmpty({ message: 'Key cannot be empty' })\n  // Security: Restrict to known safe key names\n  @Matches(/^[a-zA-Z0-9_+\\-\\s]+$/, {\n    message: 'Invalid key format',\n  })\n  @Expose()\n  key: string;\n\n  @ApiPropertyOptional({\n    description: 'Modifier keys to hold',\n    enum: KeyModifier,\n    isArray: true,\n  })\n  @IsOptional()\n  @IsArray()\n  @IsEnum(KeyModifier, { each: true })\n  @ArrayMaxSize(4)\n  @Expose()\n  modifiers?: KeyModifier[];\n\n  @ApiPropertyOptional({\n    description: 'Hold duration for key press in milliseconds',\n    example: 100,\n    minimum: 10,\n    maximum: 5000,\n  })\n  @IsOptional()\n  @IsNumber()\n  @Min(10)\n  @Max(5000)\n  @Expose()\n  holdDuration?: number;\n}\n\n/**\n * Scroll action DTO\n */\nexport class ScrollActionDto extends BaseComputerActionDto {\n  action: ComputerActionType.SCROLL = ComputerActionType.SCROLL;\n\n  @ApiProperty({\n    description: 'Scroll direction',\n    enum: ScrollDirection,\n    example: ScrollDirection.DOWN,\n  })\n  @IsEnum(ScrollDirection, { message: 'Invalid scroll direction' })\n  @Expose()\n  direction: ScrollDirection;\n\n  @ApiPropertyOptional({\n    description: 'Number of scroll units (lines or pixels)',\n    example: 3,\n    minimum: 1,\n    maximum: 100,\n    default: 3,\n  })\n  @IsOptional()\n  @IsNumber()\n  @Min(1)\n  @Max(100)\n  @Expose()\n  amount?: number = 3;\n\n  @ApiPropertyOptional({\n    description: 'Coordinates to scroll at (default: center)',\n    type: ScreenCoordinatesDto,\n  })\n  @IsOptional()\n  @ValidateNested()\n  @Type(() => ScreenCoordinatesDto)\n  @Expose()\n  coordinates?: ScreenCoordinatesDto;\n}\n\n/**\n * Wait action DTO\n */\nexport class WaitActionDto extends BaseComputerActionDto {\n  action: ComputerActionType.WAIT = ComputerActionType.WAIT;\n\n  @ApiProperty({\n    description: 'Wait duration in milliseconds',\n    example: 1000,\n    minimum: 100,\n    maximum: 30000,\n  })\n  @IsNumber({}, { message: 'Duration must be a number' })\n  @Min(100, { message: 'Wait duration must be at least 100ms' })\n  @Max(30000, { message: 'Wait duration cannot exceed 30 seconds' })\n  @Expose()\n  duration: number;\n\n  @ApiPropertyOptional({\n    description: 'Reason for waiting (for logging)',\n    example: 'Waiting for page to load',\n    maxLength: 100,\n  })\n  @IsOptional()\n  @IsString()\n  @Length(0, 100)\n  @Transform(({ value }) => value?.trim())\n  @Expose()\n  reason?: string;\n}\n\n/**\n * OCR action DTO\n */\nexport class OcrActionDto extends BaseComputerActionDto {\n  action: ComputerActionType.OCR = ComputerActionType.OCR;\n\n  @ApiPropertyOptional({\n    description: 'Region to perform OCR on (default: full screen)',\n    type: ScreenRegionDto,\n  })\n  @IsOptional()\n  @ValidateNested()\n  @Type(() => ScreenRegionDto)\n  @Expose()\n  region?: ScreenRegionDto;\n\n  @ApiPropertyOptional({\n    description: 'Language for OCR recognition',\n    example: 'eng',\n    enum: ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'chi_sim', 'jpn'],\n    default: 'eng',\n  })\n  @IsOptional()\n  @IsEnum(['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'chi_sim', 'jpn'])\n  @Expose()\n  language?: string = 'eng';\n\n  @ApiPropertyOptional({\n    description: 'OCR confidence threshold (0-100)',\n    example: 80,\n    minimum: 0,\n    maximum: 100,\n    default: 60,\n  })\n  @IsOptional()\n  @IsNumber()\n  @Min(0)\n  @Max(100)\n  @Expose()\n  confidenceThreshold?: number = 60;\n}\n\n/**\n * Computer action execution request DTO\n */\nexport class ExecuteComputerActionDto {\n  @ApiProperty({\n    description: 'Computer action to execute',\n    oneOf: [\n      { $ref: '#/components/schemas/ScreenshotActionDto' },\n      { $ref: '#/components/schemas/ClickActionDto' },\n      { $ref: '#/components/schemas/DragActionDto' },\n      { $ref: '#/components/schemas/TypeActionDto' },\n      { $ref: '#/components/schemas/KeyActionDto' },\n      { $ref: '#/components/schemas/ScrollActionDto' },\n      { $ref: '#/components/schemas/WaitActionDto' },\n      { $ref: '#/components/schemas/OcrActionDto' },\n    ],\n  })\n  @ValidateNested()\n  @Type(() => BaseComputerActionDto, {\n    discriminator: {\n      property: 'action',\n      subTypes: [\n        { value: ScreenshotActionDto, name: ComputerActionType.SCREENSHOT },\n        { value: ClickActionDto, name: ComputerActionType.CLICK },\n        { value: DragActionDto, name: ComputerActionType.DRAG },\n        { value: TypeActionDto, name: ComputerActionType.TYPE },\n        { value: KeyActionDto, name: ComputerActionType.KEY },\n        { value: ScrollActionDto, name: ComputerActionType.SCROLL },\n        { value: WaitActionDto, name: ComputerActionType.WAIT },\n        { value: OcrActionDto, name: ComputerActionType.OCR },\n      ],\n    },\n  })\n  @Expose()\n  action: BaseComputerActionDto;\n\n  @ApiPropertyOptional({\n    description: 'Execution context metadata',\n    type: 'object',\n    example: {\n      sessionId: 'session_123',\n      userId: 'user_456',\n      requestId: 'req_789',\n    },\n  })\n  @IsOptional()\n  @IsObject()\n  @Expose()\n  context?: Record<string, any>;\n\n  @ApiPropertyOptional({\n    description: 'Enable debug mode with detailed logging',\n    example: false,\n    default: false,\n  })\n  @IsOptional()\n  @IsBoolean()\n  @Expose()\n  debug?: boolean = false;\n}\n\n/**\n * Computer action execution result DTO\n */\nexport class ComputerActionResultDto extends BaseResponseDto {\n  @ApiProperty({\n    description: 'Executed action details',\n    type: 'object',\n  })\n  @IsObject()\n  @Expose()\n  action: Record<string, any>;\n\n  @ApiPropertyOptional({\n    description: 'Action execution result data',\n    type: 'object',\n    example: {\n      screenshot: 'base64-encoded-image',\n      text: 'extracted-text',\n      success: true,\n    },\n  })\n  @IsOptional()\n  @IsObject()\n  @Expose()\n  result?: Record<string, any>;\n\n  @ApiProperty({\n    description: 'Execution duration in milliseconds',\n    example: 1250,\n    minimum: 0,\n  })\n  @IsNumber()\n  @Min(0)\n  @Expose()\n  executionTime: number;\n\n  @ApiPropertyOptional({\n    description: 'Debug information if debug mode enabled',\n    type: 'object',\n  })\n  @IsOptional()\n  @IsObject()\n  @Expose()\n  debug?: Record<string, any>;\n\n  @ApiPropertyOptional({\n    description: 'Screen information at time of action',\n    type: 'object',\n    example: {\n      resolution: { width: 1920, height: 1080 },\n      colorDepth: 24,\n      scaleFactor: 1.0,\n    },\n  })\n  @IsOptional()\n  @IsObject()\n  @Expose()\n  screenInfo?: {\n    resolution: { width: number; height: number };\n    colorDepth: number;\n    scaleFactor: number;\n  };\n}\n\n/**\n * Batch computer actions DTO\n */\nexport class BatchComputerActionsDto {\n  @ApiProperty({\n    description: 'Array of computer actions to execute in sequence',\n    type: [ExecuteComputerActionDto],\n    minItems: 1,\n    maxItems: 50,\n  })\n  @IsArray()\n  @ArrayMinSize(1, { message: 'At least one action is required' })\n  @ArrayMaxSize(50, { message: 'Cannot execute more than 50 actions in batch' })\n  @ValidateNested({ each: true })\n  @Type(() => ExecuteComputerActionDto)\n  @Expose()\n  actions: ExecuteComputerActionDto[];\n\n  @ApiPropertyOptional({\n    description: 'Stop execution on first failure',\n    example: true,\n    default: true,\n  })\n  @IsOptional()\n  @IsBoolean()\n  @Expose()\n  stopOnError?: boolean = true;\n\n  @ApiPropertyOptional({\n    description: 'Maximum total execution time for all actions (milliseconds)',\n    example: 60000,\n    minimum: 1000,\n    maximum: 300000,\n    default: 60000,\n  })\n  @IsOptional()\n  @IsNumber()\n  @Min(1000)\n  @Max(300000)\n  @Expose()\n  maxTotalTime?: number = 60000;\n\n  @ApiPropertyOptional({\n    description: 'Batch execution context',\n    type: 'object',\n  })\n  @IsOptional()\n  @IsObject()\n  @Expose()\n  context?: Record<string, any>;\n}\n\n/**\n * Computer action history/audit DTO\n */\nexport class ComputerActionHistoryDto extends BaseEntityDto {\n  @ApiProperty({\n    description: 'Action type that was executed',\n    enum: ComputerActionType,\n  })\n  @IsEnum(ComputerActionType)\n  @Expose()\n  actionType: ComputerActionType;\n\n  @ApiProperty({\n    description: 'Action parameters used',\n    type: 'object',\n  })\n  @IsObject()\n  @Expose()\n  parameters: Record<string, any>;\n\n  @ApiProperty({\n    description: 'Whether the action succeeded',\n    example: true,\n  })\n  @IsBoolean()\n  @Expose()\n  success: boolean;\n\n  @ApiProperty({\n    description: 'Execution duration in milliseconds',\n    minimum: 0,\n  })\n  @IsNumber()\n  @Min(0)\n  @Expose()\n  executionTime: number;\n\n  @ApiPropertyOptional({\n    description: 'Error message if action failed',\n    maxLength: 500,\n  })\n  @IsOptional()\n  @IsString()\n  @Length(0, 500)\n  @Expose()\n  errorMessage?: string;\n\n  @ApiPropertyOptional({\n    description: 'User ID who executed the action',\n    format: 'uuid',\n  })\n  @IsOptional()\n  @IsString()\n  @Expose()\n  userId?: string;\n\n  @ApiPropertyOptional({\n    description: 'Session ID when action was executed',\n    maxLength: 100,\n  })\n  @IsOptional()\n  @IsString()\n  @Length(0, 100)\n  @Expose()\n  sessionId?: string;\n}\n\nexport default {\n  ComputerActionType,\n  MouseButton,\n  KeyModifier,\n  ScrollDirection,\n  ScreenCoordinatesDto,\n  ScreenRegionDto,\n  ExecuteComputerActionDto,\n  ComputerActionResultDto,\n  BatchComputerActionsDto,\n  ComputerActionHistoryDto,\n  // Individual action DTOs\n  ScreenshotActionDto,\n  ClickActionDto,\n  DragActionDto,\n  TypeActionDto,\n  KeyActionDto,\n  ScrollActionDto,\n  WaitActionDto,\n  OcrActionDto,\n};