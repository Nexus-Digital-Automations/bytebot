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
 * DOM interaction action types
 */
export enum DOMActionType {
  CLICK = 'click',
  DOUBLE_CLICK = 'double_click',
  RIGHT_CLICK = 'right_click',
  HOVER = 'hover',
  TYPE = 'type',
  CLEAR = 'clear',
  FOCUS = 'focus',
  BLUR = 'blur',
  SCROLL = 'scroll',
  DRAG_AND_DROP = 'drag_and_drop',
  KEY_PRESS = 'key_press',
  KEY_COMBINATION = 'key_combination',
  SUBMIT = 'submit',
  SELECT_OPTION = 'select_option',
  UPLOAD_FILE = 'upload_file',
}

/**
 * Element selector types
 */
export enum SelectorType {
  CSS = 'css',
  XPATH = 'xpath',
  TEXT = 'text',
  ATTRIBUTE = 'attribute',
  ID = 'id',
  CLASS = 'class',
  TAG = 'tag',
  NAME = 'name',
}

/**
 * Scroll directions
 */
export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom',
}

/**
 * Key modifier types
 */
export enum KeyModifier {
  CTRL = 'ctrl',
  ALT = 'alt',
  SHIFT = 'shift',
  META = 'meta',
  CMD = 'cmd',
}

/**
 * Element selector configuration
 */
export class ElementSelectorDto {
  @ApiProperty({
    description: 'Selector type',
    enum: SelectorType,
    example: SelectorType.CSS,
  })
  @IsEnum(SelectorType)
  type: SelectorType = SelectorType.CSS;

  @ApiProperty({
    description: 'Selector value/expression',
    example: '#submit-button',
  })
  @IsString()
  value: string = '';

  @ApiPropertyOptional({
    description: 'Additional selector options',
    type: 'object',
    properties: {
      exact: { type: 'boolean', description: 'Exact text match for text selectors' },
      caseSensitive: { type: 'boolean', description: 'Case sensitive matching' },
      timeout: { type: 'number', description: 'Wait timeout in milliseconds' },
    },
  })
  @IsOptional()
  @IsObject()
  options?: {
    exact?: boolean;
    caseSensitive?: boolean;
    timeout?: number;
  };
}

/**
 * Coordinate-based interaction configuration
 */
export class CoordinateInteractionDto {
  @ApiProperty({
    description: 'X coordinate in pixels',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  x: number = 0;

  @ApiProperty({
    description: 'Y coordinate in pixels',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  y: number = 0;

  @ApiPropertyOptional({
    description: 'Interaction offset from element center',
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
    },
  })
  @IsOptional()
  @IsObject()
  offset?: {
    x: number;
    y: number;
  };

  @ApiPropertyOptional({
    description: 'Force coordinates relative to viewport',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  relativeToViewport?: boolean = false;
}

/**
 * Typing configuration
 */
export class TypingConfigDto {
  @ApiProperty({
    description: 'Text to type',
    example: 'Hello World',
  })
  @IsString()
  text: string = '';

  @ApiPropertyOptional({
    description: 'Typing delay between characters in milliseconds',
    minimum: 0,
    maximum: 1000,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  delayMs?: number = 50;

  @ApiPropertyOptional({
    description: 'Clear existing text before typing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  clearFirst?: boolean = true;

  @ApiPropertyOptional({
    description: 'Press Tab after typing',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pressTab?: boolean = false;

  @ApiPropertyOptional({
    description: 'Press Enter after typing',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pressEnter?: boolean = false;
}

/**
 * Scroll configuration
 */
export class ScrollConfigDto {
  @ApiPropertyOptional({
    description: 'Scroll direction',
    enum: ScrollDirection,
    default: ScrollDirection.DOWN,
  })
  @IsOptional()
  @IsEnum(ScrollDirection)
  direction?: ScrollDirection = ScrollDirection.DOWN;

  @ApiPropertyOptional({
    description: 'Scroll distance in pixels',
    minimum: 1,
    maximum: 10000,
    default: 300,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  distance?: number = 300;

  @ApiPropertyOptional({
    description: 'Smooth scrolling animation',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  smooth?: boolean = true;

  @ApiPropertyOptional({
    description: 'Scroll to specific coordinates',
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
    },
  })
  @IsOptional()
  @IsObject()
  coordinates?: {
    x: number;
    y: number;
  };
}

/**
 * Key press configuration
 */
export class KeyPressConfigDto {
  @ApiProperty({
    description: 'Key to press',
    example: 'Enter',
  })
  @IsString()
  key: string = '';

  @ApiPropertyOptional({
    description: 'Key modifiers',
    type: [String],
    enum: KeyModifier,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(KeyModifier, { each: true })
  modifiers?: KeyModifier[];

  @ApiPropertyOptional({
    description: 'Hold duration in milliseconds',
    minimum: 0,
    maximum: 5000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  holdDurationMs?: number = 100;
}

/**
 * Drag and drop configuration
 */
export class DragDropConfigDto {
  @ApiProperty({
    description: 'Source element selector',
    type: ElementSelectorDto,
  })
  @ValidateNested()
  @Type(() => ElementSelectorDto)
  source: ElementSelectorDto = new ElementSelectorDto();

  @ApiProperty({
    description: 'Target element selector',
    type: ElementSelectorDto,
  })
  @ValidateNested()
  @Type(() => ElementSelectorDto)
  target: ElementSelectorDto = new ElementSelectorDto();

  @ApiPropertyOptional({
    description: 'Drag animation duration in milliseconds',
    minimum: 100,
    maximum: 5000,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(5000)
  durationMs?: number = 500;

  @ApiPropertyOptional({
    description: 'Additional drag options',
    type: 'object',
    properties: {
      force: { type: 'boolean', description: 'Force drag even if elements are not visible' },
      sourcePosition: { type: 'object', description: 'Specific position on source element' },
      targetPosition: { type: 'object', description: 'Specific position on target element' },
    },
  })
  @IsOptional()
  @IsObject()
  options?: {
    force?: boolean;
    sourcePosition?: { x: number; y: number };
    targetPosition?: { x: number; y: number };
  };
}

/**
 * File upload configuration
 */
export class FileUploadConfigDto {
  @ApiProperty({
    description: 'Array of file paths to upload',
    type: [String],
    example: ['/path/to/file1.txt', '/path/to/file2.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  filePaths: string[] = [];

  @ApiPropertyOptional({
    description: 'Wait for upload completion',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForCompletion?: boolean = true;

  @ApiPropertyOptional({
    description: 'Upload timeout in milliseconds',
    minimum: 1000,
    maximum: 300000,
    default: 30000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeoutMs?: number = 30000;
}

/**
 * DOM interaction request
 */
export class DOMInteractionDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string = '';

  @ApiProperty({
    description: 'DOM action to perform',
    enum: DOMActionType,
  })
  @IsEnum(DOMActionType)
  action: DOMActionType = DOMActionType.CLICK;

  @ApiPropertyOptional({
    description: 'Element selector for the target element',
    type: ElementSelectorDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ElementSelectorDto)
  selector?: ElementSelectorDto;

  @ApiPropertyOptional({
    description: 'Coordinate-based interaction (alternative to selector)',
    type: CoordinateInteractionDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinateInteractionDto)
  coordinates?: CoordinateInteractionDto;

  @ApiPropertyOptional({
    description: 'Typing configuration for TYPE actions',
    type: TypingConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TypingConfigDto)
  typing?: TypingConfigDto;

  @ApiPropertyOptional({
    description: 'Scroll configuration for SCROLL actions',
    type: ScrollConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScrollConfigDto)
  scroll?: ScrollConfigDto;

  @ApiPropertyOptional({
    description: 'Key press configuration for KEY_PRESS actions',
    type: KeyPressConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => KeyPressConfigDto)
  keyPress?: KeyPressConfigDto;

  @ApiPropertyOptional({
    description: 'Drag and drop configuration for DRAG_AND_DROP actions',
    type: DragDropConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DragDropConfigDto)
  dragDrop?: DragDropConfigDto;

  @ApiPropertyOptional({
    description: 'File upload configuration for UPLOAD_FILE actions',
    type: FileUploadConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FileUploadConfigDto)
  fileUpload?: FileUploadConfigDto;

  @ApiPropertyOptional({
    description: 'Wait for element before performing action',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForElement?: boolean = true;

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
    description: 'Force action even if element is not interactable',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional action metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Batch DOM interaction request
 */
export class BatchDOMInteractionDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string = '';

  @ApiProperty({
    description: 'Array of DOM interactions to perform sequentially',
    type: [DOMInteractionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DOMInteractionDto)
  interactions: Omit<DOMInteractionDto, 'sessionId'>[] = [];

  @ApiPropertyOptional({
    description: 'Delay between interactions in milliseconds',
    minimum: 0,
    maximum: 10000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  intervalMs?: number = 100;

  @ApiPropertyOptional({
    description: 'Continue on individual interaction failures',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = false;

  @ApiPropertyOptional({
    description: 'Take screenshot after each interaction',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean = false;
}

/**
 * DOM interaction result
 */
export class DOMInteractionResultDto {
  @ApiProperty({
    description: 'Unique interaction identifier',
    example: 'interaction_xyz789',
  })
  interactionId: string = '';

  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  sessionId: string = '';

  @ApiProperty({
    description: 'DOM action performed',
    enum: DOMActionType,
  })
  action: DOMActionType = DOMActionType.CLICK;

  @ApiProperty({
    description: 'Interaction success status',
  })
  success: boolean = false;

  @ApiProperty({
    description: 'Interaction start timestamp',
  })
  startedAt: Date = new Date();

  @ApiProperty({
    description: 'Interaction completion timestamp',
  })
  completedAt: Date = new Date();

  @ApiProperty({
    description: 'Interaction duration in milliseconds',
  })
  durationMs: number = 0;

  @ApiPropertyOptional({
    description: 'Element selector used',
  })
  elementSelector?: string;

  @ApiPropertyOptional({
    description: 'Element found and targeted',
    type: 'object',
    properties: {
      tagName: { type: 'string' },
      id: { type: 'string' },
      className: { type: 'string' },
      textContent: { type: 'string' },
      attributes: { type: 'object' },
      boundingBox: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
        },
      },
    },
  })
  targetElement?: {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    attributes?: Record<string, string>;
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };

  @ApiPropertyOptional({
    description: 'Coordinates used for interaction',
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
    },
  })
  coordinates?: {
    x: number;
    y: number;
  };

  @ApiPropertyOptional({
    description: 'Result data from interaction (e.g., extracted text)',
    type: 'object',
    additionalProperties: true,
  })
  resultData?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Error message if interaction failed',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',
    type: 'object',
    additionalProperties: true,
  })
  errorDetails?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Screenshot captured after interaction (base64)',
  })
  screenshot?: string;

  @ApiProperty({
    description: 'Page URL at time of interaction',
  })
  pageUrl: string = '';

  @ApiProperty({
    description: 'Page title at time of interaction',
  })
  pageTitle: string = '';

  @ApiPropertyOptional({
    description: 'Additional metadata',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}

/**
 * Batch DOM interaction result
 */
export class BatchDOMInteractionResultDto {
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
    description: 'Array of individual interaction results',
    type: [DOMInteractionResultDto],
  })
  interactions: DOMInteractionResultDto[] = [];

  @ApiProperty({
    description: 'Total interactions requested',
  })
  totalRequested: number = 0;

  @ApiProperty({
    description: 'Interactions executed successfully',
  })
  successfulInteractions: number = 0;

  @ApiProperty({
    description: 'Interactions that failed',
  })
  failedInteractions: number = 0;

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