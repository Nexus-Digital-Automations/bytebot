/**
 * Browser DOM Interaction DTOs
 *
 * Data Transfer Objects for DOM manipulation, navigation, and interaction operations.
 * Supports comprehensive browser automation including clicking, typing, scrolling,
 * and element interaction with enhanced validation and error handling.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsNumber,
  IsBoolean,
  IsUrl,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScrollDirection {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
}

export enum ClickType {
  SINGLE = 'single',
  DOUBLE = 'double',
  RIGHT = 'right',
  MIDDLE = 'middle',
}

export enum InputMethod {
  TYPE = 'type',
  CLEAR_AND_TYPE = 'clear_and_type',
  APPEND = 'append',
}

export class Coordinates {
  @ApiProperty({ description: 'X coordinate in pixels', minimum: 0 })
  @IsNumber()
  @Min(0)
  x: number;

  @ApiProperty({ description: 'Y coordinate in pixels', minimum: 0 })
  @IsNumber()
  @Min(0)
  y: number;
}

export class BrowserNavigateDto {
  @ApiProperty({
    description: 'URL to navigate to',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    description: 'Wait for page load completion',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForLoad?: boolean = true;

  @ApiPropertyOptional({
    description: 'Navigation timeout in seconds',
    minimum: 1,
    maximum: 300,
    default: 30,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  timeoutSeconds?: number = 30;

  @ApiPropertyOptional({
    description: 'Navigation timeout in milliseconds (legacy support)',
    minimum: 1000,
    maximum: 300000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Wait condition for navigation completion',
    enum: ['load', 'domcontentloaded', 'networkidle0', 'networkidle2'],
    default: 'networkidle0',
  })
  @IsOptional()
  @IsString()
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';

  @ApiPropertyOptional({
    description: 'CSS selector to wait for after navigation',
  })
  @IsOptional()
  @IsString()
  waitForElement?: string;

  @ApiPropertyOptional({
    description: 'Take screenshot after navigation',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  takeScreenshot?: boolean = false;

  @ApiPropertyOptional({
    description: 'Open in new tab',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  newTab?: boolean = false;

  @ApiPropertyOptional({
    description: 'Referer header value',
  })
  @IsOptional()
  @IsString()
  referer?: string;

  @ApiPropertyOptional({
    description: 'Custom headers to send with navigation request',
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;
}

export class BrowserClickDto {
  @ApiPropertyOptional({
    description: 'CSS selector of element to click',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  selector?: string;

  @ApiPropertyOptional({
    description: 'XPath selector of element to click',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  xpath?: string;

  @ApiPropertyOptional({
    description: 'Element index from previous browser state query',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  elementIndex?: number;

  @ApiPropertyOptional({
    description: 'Exact coordinates to click',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Coordinates)
  coordinates?: Coordinates;

  @ApiPropertyOptional({
    description: 'Type of click to perform',
    enum: ClickType,
    default: ClickType.SINGLE,
  })
  @IsOptional()
  @IsEnum(ClickType)
  clickType?: ClickType = ClickType.SINGLE;

  @ApiPropertyOptional({
    description: 'Click timeout in seconds',
    minimum: 1,
    maximum: 60,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  timeoutSeconds?: number = 10;

  @ApiPropertyOptional({
    description: 'Wait for element to be visible before clicking',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForVisible?: boolean = true;

  @ApiPropertyOptional({
    description: 'Force click even if element is covered',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean = false;

  @ApiPropertyOptional({
    description: 'Modifier keys to hold during click',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifierKeys?: string[]; // ['shift', 'ctrl', 'alt', 'meta']

  @ApiPropertyOptional({
    description: 'Legacy modifier keys support',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modifiers?: string[]; // ['shift', 'ctrl', 'alt', 'meta']

  @ApiPropertyOptional({
    description: 'Mouse button to click with',
    enum: ['left', 'right', 'middle'],
    default: 'left',
  })
  @IsOptional()
  @IsString()
  button?: 'left' | 'right' | 'middle';

  @ApiPropertyOptional({
    description: 'Wait for navigation after click',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  waitForNavigation?: boolean = false;

  @ApiPropertyOptional({
    description: 'Legacy timeout property (use timeoutSeconds instead)',
    minimum: 1000,
    maximum: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeout?: number;
}

export class BrowserTypeDto {
  @ApiPropertyOptional({
    description: 'CSS selector of input element',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  selector?: string;

  @ApiPropertyOptional({
    description: 'XPath selector of input element',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  xpath?: string;

  @ApiPropertyOptional({
    description: 'Element index from previous browser state query',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  elementIndex?: number;

  @ApiProperty({
    description: 'Text to type into the element',
    maxLength: 10000,
  })
  @IsString()
  @MaxLength(10000)
  text: string;

  @ApiPropertyOptional({
    description: 'Input method for typing',
    enum: InputMethod,
    default: InputMethod.CLEAR_AND_TYPE,
  })
  @IsOptional()
  @IsEnum(InputMethod)
  inputMethod?: InputMethod = InputMethod.CLEAR_AND_TYPE;

  @ApiPropertyOptional({
    description: 'Delay between keystrokes in milliseconds',
    minimum: 0,
    maximum: 1000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  delayMs?: number = 0;

  @ApiPropertyOptional({
    description: 'Press Enter after typing',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pressEnter?: boolean = false;

  @ApiPropertyOptional({
    description: 'Press Tab after typing',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  pressTab?: boolean = false;

  @ApiPropertyOptional({
    description: 'Timeout for typing operation in seconds',
    minimum: 1,
    maximum: 60,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  timeoutSeconds?: number = 10;

  @ApiPropertyOptional({
    description: 'Clear field before typing',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  clearFirst?: boolean = true;

  @ApiPropertyOptional({
    description: 'Legacy delay property (use delayMs instead)',
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  delay?: number;

  @ApiPropertyOptional({
    description: 'Legacy timeout property (use timeoutSeconds instead)',
    minimum: 1000,
    maximum: 60000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeout?: number;
}

export class BrowserScrollDto {
  @ApiProperty({
    description: 'Direction to scroll',
    enum: ScrollDirection,
  })
  @IsEnum(ScrollDirection)
  direction: ScrollDirection;

  @ApiPropertyOptional({
    description: 'Number of pixels to scroll',
    minimum: 1,
    maximum: 5000,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  pixels?: number = 500;

  @ApiPropertyOptional({
    description: 'CSS selector of element to scroll within',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  selector?: string;

  @ApiPropertyOptional({
    description: 'Scroll smoothly with animation',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  smooth?: boolean = true;

  @ApiPropertyOptional({
    description: 'Number of scroll steps to break the scroll into',
    minimum: 1,
    maximum: 20,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  steps?: number = 1;

  @ApiPropertyOptional({
    description: 'Delay between scroll steps in milliseconds',
    minimum: 0,
    maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  stepDelayMs?: number = 100;

  @ApiPropertyOptional({
    description: 'Scroll amount (legacy support)',
    minimum: 1,
    maximum: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5000)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Scroll to specific coordinates',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Coordinates)
  coordinates?: Coordinates;
}

export class DOMElement {
  @ApiProperty({ description: 'Element index for interactions' })
  index: number;

  @ApiProperty({ description: 'HTML tag name' })
  tagName: string;

  @ApiProperty({ description: 'Element text content (truncated)' })
  text: string;

  @ApiProperty({ description: 'Legacy text content property' })
  textContent?: string;

  @ApiProperty({ description: 'Element attributes' })
  attributes: Record<string, string>;

  @ApiProperty({ description: 'Element bounding box coordinates' })
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiProperty({ description: 'Whether element is visible' })
  visible: boolean;

  @ApiProperty({ description: 'Whether element is clickable' })
  clickable: boolean;

  @ApiProperty({ description: 'Whether element is an input field' })
  inputField: boolean;

  @ApiProperty({ description: 'CSS selector for this element' })
  selector: string;

  @ApiProperty({ description: 'XPath for this element' })
  xpath?: string;
}

export class PageInfo {
  @ApiProperty({ description: 'Page URL' })
  url: string;

  @ApiProperty({ description: 'Page title' })
  title: string;

  @ApiProperty({ description: 'Page loading status' })
  loadingStatus: 'loading' | 'complete' | 'error';

  @ApiProperty({ description: 'Page dimensions' })
  dimensions: {
    width: number;
    height: number;
    scrollWidth: number;
    scrollHeight: number;
  };

  @ApiProperty({ description: 'Current scroll position' })
  scrollPosition: {
    x: number;
    y: number;
  };

  @ApiProperty({ description: 'Page load time in milliseconds' })
  loadTime?: number;

  @ApiProperty({ description: 'Number of network requests for this page' })
  networkRequests?: number;

  @ApiProperty({ description: 'Console errors and warnings' })
  consoleMessages?: Array<{
    level: 'error' | 'warning' | 'info' | 'debug';
    message: string;
    timestamp: Date;
  }>;

  @ApiProperty({ description: 'Browser viewport information' })
  viewport?: {
    width: number;
    height: number;
    deviceScaleFactor?: number;
    isMobile?: boolean;
    hasTouch?: boolean;
    isLandscape?: boolean;
  };

  @ApiProperty({ description: 'Page performance metrics' })
  performance?: {
    loadTime?: number;
    domContentLoaded?: number;
    firstContentfulPaint?: number;
    memoryUsageMB?: number;
    cpuUsagePercent?: number;
    networkLatencyMs?: number;
    pageLoadTimeMs?: number;
  };
}

export class BrowserElementResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success: boolean;

  @ApiProperty({ description: 'Operation result message' })
  message: string;

  @ApiProperty({ description: 'Target element information' })
  element?: DOMElement;

  @ApiProperty({ description: 'Updated page information' })
  pageInfo?: PageInfo;

  @ApiProperty({ description: 'Operation timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Operation duration in milliseconds' })
  durationMs?: number;

  @ApiProperty({ description: 'Operation execution time in milliseconds' })
  executionTimeMs: number;

  @ApiProperty({ description: 'Screenshot after operation (base64)' })
  screenshot?: string;

  @ApiProperty({ description: 'Error details if operation failed' })
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export class BrowserStateResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success?: boolean;

  @ApiProperty({ description: 'Session identifier' })
  sessionId?: string;

  @ApiProperty({ description: 'Current page information' })
  pageInfo: PageInfo;

  @ApiProperty({
    description: 'Interactive elements on the page',
    type: [DOMElement],
  })
  interactiveElements: DOMElement[];

  @ApiProperty({
    description: 'All form elements on the page',
    type: [DOMElement],
  })
  formElements?: DOMElement[];

  @ApiProperty({ description: 'All clickable links', type: [DOMElement] })
  links?: DOMElement[];

  @ApiProperty({ description: 'Current screenshot (base64)' })
  screenshot?: string;

  @ApiProperty({ description: 'Browser session information' })
  session?: {
    id: string;
    name: string;
    status: string;
    lastActivity: Date;
  };

  @ApiProperty({ description: 'Browser performance metrics' })
  performance?: {
    memoryUsageMB?: number;
    cpuUsagePercent?: number;
    networkLatencyMs?: number;
    pageLoadTimeMs?: number;
    loadTime?: number;
    domContentLoaded?: number;
    firstContentfulPaint?: number;
  };

  @ApiProperty({ description: 'State capture timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Total number of elements found' })
  totalElements?: number;

  @ApiProperty({ description: 'Browser tabs information' })
  tabs?: Array<{
    id: string;
    title: string;
    url: string;
    active: boolean;
  }>;
}
