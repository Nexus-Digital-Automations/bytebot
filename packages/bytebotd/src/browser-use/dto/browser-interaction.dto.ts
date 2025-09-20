import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

/**
 * Click action types
 */
export enum ClickType {
  LEFT = 'left',
  RIGHT = 'right',
  MIDDLE = 'middle',
  DOUBLE = 'double',
}

/**
 * Key modifier types for keyboard actions
 */
export enum KeyModifier {
  CTRL = 'ctrl',
  ALT = 'alt',
  SHIFT = 'shift',
  META = 'meta',
  CMD = 'cmd',
}

/**
 * Scroll direction types
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
 * Element selector strategy
 */
export enum SelectorStrategy {
  CSS = 'css',
  XPATH = 'xpath',
  TEXT = 'text',
  ID = 'id',
  CLASS = 'class',
  TAG = 'tag',
  NAME = 'name',
  ATTRIBUTE = 'attribute',
}

/**
 * Element information type
 */
export enum ElementInfoType {
  BASIC = 'basic',
  FULL = 'full',
  ATTRIBUTES = 'attributes',
  STYLES = 'styles',
  PROPERTIES = 'properties',
}

/**
 * Click interaction request
 */
export class ClickInteractionDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Element selector (CSS, XPath, etc.)',
    example: '#submit-button',
  })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Selector strategy type',
    enum: SelectorStrategy,
    default: SelectorStrategy.CSS,
  })
  @IsOptional()
  @IsEnum(SelectorStrategy)
  selectorType?: SelectorStrategy = SelectorStrategy.CSS;

  @ApiPropertyOptional({
    description: 'X coordinate for click (alternative to selector)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  x?: number;

  @ApiPropertyOptional({
    description: 'Y coordinate for click (alternative to selector)',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  y?: number;

  @ApiPropertyOptional({
    description: 'Click type',
    enum: ClickType,
    default: ClickType.LEFT,
  })
  @IsOptional()
  @IsEnum(ClickType)
  clickType?: ClickType = ClickType.LEFT;

  @ApiPropertyOptional({
    description: 'Wait for element to be clickable',
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
  timeout?: number = 5000;

  @ApiPropertyOptional({
    description: 'Force click even if element is not visible',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;
}

/**
 * Type interaction request
 */
export class TypeInteractionDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Element selector where to type',
    example: 'input[name="username"]',
  })
  @IsString()
  selector: string;

  @ApiPropertyOptional({
    description: 'Selector strategy type',
    enum: SelectorStrategy,
    default: SelectorStrategy.CSS,
  })
  @IsOptional()
  @IsEnum(SelectorStrategy)
  selectorType?: SelectorStrategy = SelectorStrategy.CSS;

  @ApiProperty({
    description: 'Text to type',
    example: 'Hello World',
  })
  @IsString()
  text: string;

  @ApiPropertyOptional({
    description: 'Clear existing text before typing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  clearFirst?: boolean = true;

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
  delay?: number = 50;

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
  timeout?: number = 5000;
}

/**
 * Scroll interaction request
 */
export class ScrollInteractionDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Element selector to scroll (default: page)',
    example: '.scrollable-container',
  })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Selector strategy type',
    enum: SelectorStrategy,
    default: SelectorStrategy.CSS,
  })
  @IsOptional()
  @IsEnum(SelectorStrategy)
  selectorType?: SelectorStrategy = SelectorStrategy.CSS;

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
 * Hover interaction request
 */
export class HoverInteractionDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Element selector to hover over',
    example: '.menu-item',
  })
  @IsString()
  selector: string;

  @ApiPropertyOptional({
    description: 'Selector strategy type',
    enum: SelectorStrategy,
    default: SelectorStrategy.CSS,
  })
  @IsOptional()
  @IsEnum(SelectorStrategy)
  selectorType?: SelectorStrategy = SelectorStrategy.CSS;

  @ApiPropertyOptional({
    description: 'Hover duration in milliseconds',
    minimum: 100,
    maximum: 10000,
    default: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  duration?: number = 1000;

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
  timeout?: number = 5000;
}

/**
 * Element find request
 */
export class ElementFindDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Element selector',
    example: 'button.primary',
  })
  @IsString()
  selector: string;

  @ApiPropertyOptional({
    description: 'Selector strategy type',
    enum: SelectorStrategy,
    default: SelectorStrategy.CSS,
  })
  @IsOptional()
  @IsEnum(SelectorStrategy)
  selectorType?: SelectorStrategy = SelectorStrategy.CSS;

  @ApiPropertyOptional({
    description: 'Find all matching elements',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  findAll?: boolean = false;

  @ApiPropertyOptional({
    description: 'Wait for element to appear',
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
  timeout?: number = 5000;

  @ApiPropertyOptional({
    description: 'Include element screenshot',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeScreenshot?: boolean = false;
}

/**
 * Element information request
 */
export class ElementInfoDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string;

  @ApiProperty({
    description: 'Element selector',
    example: '#main-content',
  })
  @IsString()
  selector: string;

  @ApiPropertyOptional({
    description: 'Selector strategy type',
    enum: SelectorStrategy,
    default: SelectorStrategy.CSS,
  })
  @IsOptional()
  @IsEnum(SelectorStrategy)
  selectorType?: SelectorStrategy = SelectorStrategy.CSS;

  @ApiPropertyOptional({
    description: 'Information detail level',
    enum: ElementInfoType,
    default: ElementInfoType.BASIC,
  })
  @IsOptional()
  @IsEnum(ElementInfoType)
  infoType?: ElementInfoType = ElementInfoType.BASIC;

  @ApiPropertyOptional({
    description: 'Include computed styles',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeStyles?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include element attributes',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeAttributes?: boolean = true;
}

/**
 * Page source request
 */
export class PageSourceDto {
  @ApiProperty({
    description: 'Browser session identifier',
    example: 'session_abc123',
  })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Include processed HTML (formatted)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  formatted?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include page metadata',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean = true;
}

/**
 * Interaction result base class
 */
export class InteractionResultDto {
  @ApiProperty({
    description: 'Unique interaction identifier',
  })
  interactionId: string;

  @ApiProperty({
    description: 'Browser session identifier',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Interaction success status',
  })
  success: boolean;

  @ApiProperty({
    description: 'Interaction start timestamp',
  })
  startedAt: Date;

  @ApiProperty({
    description: 'Interaction completion timestamp',
  })
  completedAt: Date;

  @ApiProperty({
    description: 'Interaction duration in milliseconds',
  })
  durationMs: number;

  @ApiPropertyOptional({
    description: 'Error message if interaction failed',
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Page URL at time of interaction',
  })
  pageUrl: string;

  @ApiProperty({
    description: 'Page title at time of interaction',
  })
  pageTitle: string;
}

/**
 * Element information result
 */
export class ElementInfoResultDto {
  @ApiProperty({
    description: 'Element found status',
  })
  found: boolean;

  @ApiProperty({
    description: 'Browser session identifier',
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Element tag name',
  })
  tagName?: string;

  @ApiPropertyOptional({
    description: 'Element ID attribute',
  })
  id?: string;

  @ApiPropertyOptional({
    description: 'Element class names',
  })
  className?: string;

  @ApiPropertyOptional({
    description: 'Element text content',
  })
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Element inner HTML',
  })
  innerHTML?: string;

  @ApiPropertyOptional({
    description: 'Element outer HTML',
  })
  outerHTML?: string;

  @ApiPropertyOptional({
    description: 'Element attributes',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  attributes?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Element computed styles',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  styles?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Element bounding box',
    type: 'object',
    properties: {
      x: { type: 'number' },
      y: { type: 'number' },
      width: { type: 'number' },
      height: { type: 'number' },
      top: { type: 'number' },
      left: { type: 'number' },
      right: { type: 'number' },
      bottom: { type: 'number' },
    },
  })
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    right: number;
    bottom: number;
  };

  @ApiPropertyOptional({
    description: 'Element visibility status',
  })
  visible?: boolean;

  @ApiPropertyOptional({
    description: 'Element interactable status',
  })
  interactable?: boolean;

  @ApiPropertyOptional({
    description: 'Element screenshot (base64)',
  })
  screenshot?: string;

  @ApiProperty({
    description: 'Query timestamp',
  })
  timestamp: Date;
}

/**
 * Element find result
 */
export class ElementFindResultDto {
  @ApiProperty({
    description: 'Elements found',
    type: [ElementInfoResultDto],
  })
  elements: ElementInfoResultDto[];

  @ApiProperty({
    description: 'Browser session identifier',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Number of elements found',
  })
  count: number;

  @ApiProperty({
    description: 'Selector used for search',
  })
  selector: string;

  @ApiProperty({
    description: 'Selector strategy used',
    enum: SelectorStrategy,
  })
  selectorType: SelectorStrategy;

  @ApiProperty({
    description: 'Search timestamp',
  })
  timestamp: Date;
}

/**
 * Page source result
 */
export class PageSourceResultDto {
  @ApiProperty({
    description: 'Page HTML source',
  })
  source: string;

  @ApiProperty({
    description: 'Browser session identifier',
  })
  sessionId: string;

  @ApiProperty({
    description: 'Page URL',
  })
  url: string;

  @ApiProperty({
    description: 'Page title',
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Page metadata',
    type: 'object',
    properties: {
      charset: { type: 'string' },
      lang: { type: 'string' },
      viewport: { type: 'string' },
      description: { type: 'string' },
      keywords: { type: 'string' },
      author: { type: 'string' },
    },
  })
  metadata?: {
    charset?: string;
    lang?: string;
    viewport?: string;
    description?: string;
    keywords?: string;
    author?: string;
  };

  @ApiProperty({
    description: 'Source length in characters',
  })
  length: number;

  @ApiProperty({
    description: 'Source retrieval timestamp',
  })
  timestamp: Date;
}