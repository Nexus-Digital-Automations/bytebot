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
import { BaseResponseDto, BaseEntityDto } from './base.dto';

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
  @Transform(({ value }: { value: string | undefined }) =>
    typeof value === 'string' ? value.trim() : value,
  )
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
  @Length(1, 10000, { message: 'Text must be between 1 and 10000 characters' })
  @IsNotEmpty({ message: 'Text cannot be empty' })
  // Security: Prevent potentially dangerous characters
  @Matches(/^[\x20-\x7E\r\n\t\u00A0-\uFFFF]*$/, {
    message: 'Text contains invalid characters',
  })
  @Expose()
  text: string;

  @ApiPropertyOptional({
    description: 'Typing speed in characters per minute',
    example: 300,
    minimum: 50,
    maximum: 1000,
    default: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  @Expose()
  typingSpeed?: number = 300;

  @ApiPropertyOptional({
    description: 'Clear existing text before typing',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose()
  clearFirst?: boolean = false;
}

/**
 * Key press action DTO
 */
export class KeyActionDto extends BaseComputerActionDto {
  action: ComputerActionType.KEY = ComputerActionType.KEY;

  @ApiProperty({
    description: 'Key or key combination to press',
    example: 'Enter',
    maxLength: 50,
  })
  @IsString({ message: 'Key must be a string' })
  @Length(1, 50, { message: 'Key must be between 1 and 50 characters' })
  @IsNotEmpty({ message: 'Key cannot be empty' })
  // Security: Restrict to known safe key names
  @Matches(/^[a-zA-Z0-9_+\\-\\s]+$/, {
    message: 'Invalid key format',
  })
  @Expose()
  key: string;

  @ApiPropertyOptional({
    description: 'Modifier keys to hold',
    enum: KeyModifier,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(KeyModifier, { each: true })
  @ArrayMaxSize(4)
  @Expose()
  modifiers?: KeyModifier[];

  @ApiPropertyOptional({
    description: 'Hold duration for key press in milliseconds',
    example: 100,
    minimum: 10,
    maximum: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(5000)
  @Expose()
  holdDuration?: number;
}

/**
 * Scroll action DTO
 */
export class ScrollActionDto extends BaseComputerActionDto {
  action: ComputerActionType.SCROLL = ComputerActionType.SCROLL;

  @ApiProperty({
    description: 'Scroll direction',
    enum: ScrollDirection,
    example: ScrollDirection.DOWN,
  })
  @IsEnum(ScrollDirection, { message: 'Invalid scroll direction' })
  @Expose()
  direction: ScrollDirection;

  @ApiPropertyOptional({
    description: 'Number of scroll units (lines or pixels)',
    example: 3,
    minimum: 1,
    maximum: 100,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Expose()
  amount?: number = 3;

  @ApiPropertyOptional({
    description: 'Coordinates to scroll at (default: center)',
    type: ScreenCoordinatesDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScreenCoordinatesDto)
  @Expose()
  coordinates?: ScreenCoordinatesDto;
}

/**
 * Wait action DTO
 */
export class WaitActionDto extends BaseComputerActionDto {
  action: ComputerActionType.WAIT = ComputerActionType.WAIT;

  @ApiProperty({
    description: 'Wait duration in milliseconds',
    example: 1000,
    minimum: 100,
    maximum: 30000,
  })
  @IsNumber({}, { message: 'Duration must be a number' })
  @Min(100, { message: 'Wait duration must be at least 100ms' })
  @Max(30000, { message: 'Wait duration cannot exceed 30 seconds' })
  @Expose()
  duration: number;

  @ApiPropertyOptional({
    description: 'Reason for waiting (for logging)',
    example: 'Waiting for page to load',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Transform(({ value }: { value: string | undefined }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Expose()
  reason?: string;
}

/**
 * OCR action DTO
 */
export class OcrActionDto extends BaseComputerActionDto {
  action: ComputerActionType.OCR = ComputerActionType.OCR;

  @ApiPropertyOptional({
    description: 'Region to perform OCR on (default: full screen)',
    type: ScreenRegionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScreenRegionDto)
  @Expose()
  region?: ScreenRegionDto;

  @ApiPropertyOptional({
    description: 'Language for OCR recognition',
    example: 'eng',
    enum: ['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'chi_sim', 'jpn'],
    default: 'eng',
  })
  @IsOptional()
  @IsEnum(['eng', 'fra', 'deu', 'spa', 'ita', 'por', 'rus', 'chi_sim', 'jpn'])
  @Expose()
  language?: string = 'eng';

  @ApiPropertyOptional({
    description: 'OCR confidence threshold (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
    default: 60,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Expose()
  confidenceThreshold?: number = 60;
}

/**
 * Computer action execution request DTO
 */
export class ExecuteComputerActionDto {
  @ApiProperty({
    description: 'Computer action to execute',
    oneOf: [
      { $ref: '#/components/schemas/ScreenshotActionDto' },
      { $ref: '#/components/schemas/ClickActionDto' },
      { $ref: '#/components/schemas/DragActionDto' },
      { $ref: '#/components/schemas/TypeActionDto' },
      { $ref: '#/components/schemas/KeyActionDto' },
      { $ref: '#/components/schemas/ScrollActionDto' },
      { $ref: '#/components/schemas/WaitActionDto' },
      { $ref: '#/components/schemas/OcrActionDto' },
    ],
  })
  @ValidateNested()
  @Type(() => BaseComputerActionDto, {
    discriminator: {
      property: 'action',
      subTypes: [
        { value: ScreenshotActionDto, name: ComputerActionType.SCREENSHOT },
        { value: ClickActionDto, name: ComputerActionType.CLICK },
        { value: DragActionDto, name: ComputerActionType.DRAG },
        { value: TypeActionDto, name: ComputerActionType.TYPE },
        { value: KeyActionDto, name: ComputerActionType.KEY },
        { value: ScrollActionDto, name: ComputerActionType.SCROLL },
        { value: WaitActionDto, name: ComputerActionType.WAIT },
        { value: OcrActionDto, name: ComputerActionType.OCR },
      ],
    },
  })
  @Expose()
  action: BaseComputerActionDto;

  @ApiPropertyOptional({
    description: 'Execution context metadata',
    example: {
      sessionId: 'session_123',
      userId: 'user_456',
      requestId: 'req_789',
    },
  })
  @IsOptional()
  @IsObject()
  @Expose()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Enable debug mode with detailed logging',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  @Expose()
  debug?: boolean = false;
}

/**
 * Computer action execution result DTO
 */
export class ComputerActionResultDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Executed action details',
  })
  @IsObject()
  @Expose()
  action: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Action execution result data',
    example: {
      screenshot: 'base64-encoded-image',
      text: 'extracted-text',
      success: true,
    },
  })
  @IsOptional()
  @IsObject()
  @Expose()
  result?: Record<string, any>;

  @ApiProperty({
    description: 'Execution duration in milliseconds',
    example: 1250,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Expose()
  executionTime: number;

  @ApiPropertyOptional({
    description: 'Debug information if debug mode enabled',
  })
  @IsOptional()
  @IsObject()
  @Expose()
  debug?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Screen information at time of action',
    example: {
      resolution: { width: 1920, height: 1080 },
      colorDepth: 24,
      scaleFactor: 1.0,
    },
  })
  @IsOptional()
  @IsObject()
  @Expose()
  screenInfo?: {
    resolution: { width: number; height: number };
    colorDepth: number;
    scaleFactor: number;
  };
}

/**
 * Batch computer actions DTO
 */
export class BatchComputerActionsDto {
  @ApiProperty({
    description: 'Array of computer actions to execute in sequence',
    type: [ExecuteComputerActionDto],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one action is required' })
  @ArrayMaxSize(50, { message: 'Cannot execute more than 50 actions in batch' })
  @ValidateNested({ each: true })
  @Type(() => ExecuteComputerActionDto)
  @Expose()
  actions: ExecuteComputerActionDto[];

  @ApiPropertyOptional({
    description: 'Stop execution on first failure',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  @Expose()
  stopOnError?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum total execution time for all actions (milliseconds)',
    example: 60000,
    minimum: 1000,
    maximum: 300000,
    default: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  @Expose()
  maxTotalTime?: number = 60000;

  @ApiPropertyOptional({
    description: 'Batch execution context',
  })
  @IsOptional()
  @IsObject()
  @Expose()
  context?: Record<string, any>;
}

/**
 * Computer action history/audit DTO
 */
export class ComputerActionHistoryDto extends BaseEntityDto {
  @ApiProperty({
    description: 'Action type that was executed',
    enum: ComputerActionType,
  })
  @IsEnum(ComputerActionType)
  @Expose()
  actionType: ComputerActionType;

  @ApiProperty({
    description: 'Action parameters used',
  })
  @IsObject()
  @Expose()
  parameters: Record<string, any>;

  @ApiProperty({
    description: 'Whether the action succeeded',
    example: true,
  })
  @IsBoolean()
  @Expose()
  success: boolean;

  @ApiProperty({
    description: 'Execution duration in milliseconds',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @Expose()
  executionTime: number;

  @ApiPropertyOptional({
    description: 'Error message if action failed',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500)
  @Expose()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'User ID who executed the action',
    format: 'uuid',
  })
  @IsOptional()
  @IsString()
  @Expose()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID when action was executed',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  @Expose()
  sessionId?: string;
}

export default {
  ComputerActionType,
  MouseButton,
  KeyModifier,
  ScrollDirection,
  ScreenCoordinatesDto,
  ScreenRegionDto,
  ExecuteComputerActionDto,
  ComputerActionResultDto,
  BatchComputerActionsDto,
  ComputerActionHistoryDto,
  // Individual action DTOs
  ScreenshotActionDto,
  ClickActionDto,
  DragActionDto,
  TypeActionDto,
  KeyActionDto,
  ScrollActionDto,
  WaitActionDto,
  OcrActionDto,
};
