/**
 * Enhanced Interaction DTOs - Advanced DOM Interaction Controls
 *
 * This module provides comprehensive Data Transfer Objects for DOM interactions
 * with advanced validation, security controls, and intelligent element targeting.
 * Supports enterprise-grade browser automation with sophisticated interaction patterns.
 *
 * @fileoverview Enhanced interaction DTOs with advanced DOM manipulation
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
  IsRgbColor,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enhanced click types with gesture support
 */
export enum ClickType {
  SINGLE = 'single',
  DOUBLE = 'double',
  RIGHT = 'right',
  MIDDLE = 'middle',
  LONG_PRESS = 'long_press',
  DRAG_START = 'drag_start',
  DRAG_END = 'drag_end',
  TOUCH_TAP = 'touch_tap',
  TOUCH_DOUBLE_TAP = 'touch_double_tap',
}

/**
 * Input methods with advanced text handling
 */
export enum InputMethod {
  TYPE = 'type',
  CLEAR_AND_TYPE = 'clear_and_type',
  APPEND = 'append',
  REPLACE = 'replace',
  PASTE = 'paste',
  TYPE_WITH_DELAY = 'type_with_delay',
  SIMULATE_HUMAN_TYPING = 'simulate_human_typing',
}

/**
 * Element targeting strategies
 */
export enum ElementTargetingStrategy {
  CSS_SELECTOR = 'css_selector',
  XPATH = 'xpath',
  TEXT_CONTENT = 'text_content',
  PARTIAL_TEXT = 'partial_text',
  ARIA_LABEL = 'aria_label',
  DATA_ATTRIBUTE = 'data_attribute',
  COORDINATE = 'coordinate',
  SMART_DETECTION = 'smart_detection',
  AI_VISUAL = 'ai_visual',
}

/**
 * Interaction safety levels
 */
export enum InteractionSafetyLevel {
  SAFE = 'safe',           // Standard interactions with validation
  CAUTIOUS = 'cautious',   // Extra validation and confirmation
  AGGRESSIVE = 'aggressive', // Bypass some safety checks
  TESTING = 'testing',     // Allow dangerous operations for testing
}

/**
 * Scroll behavior options
 */
export enum ScrollBehavior {
  SMOOTH = 'smooth',
  INSTANT = 'instant',
  AUTO = 'auto',
}

/**
 * Element visibility requirements
 */
export enum VisibilityRequirement {
  VISIBLE = 'visible',           // Element must be visible
  IN_VIEWPORT = 'in_viewport',   // Element must be in viewport
  PARTIALLY_VISIBLE = 'partially_visible', // Element can be partially visible
  ANY = 'any',                   // Element can be hidden
}

/**
 * Advanced element locator with multiple strategies
 */
export class ElementLocator {
  @ApiProperty({
    description: 'Element targeting strategy',
    enum: ElementTargetingStrategy,
  })
  @IsEnum(ElementTargetingStrategy, { message: 'Invalid targeting strategy' })
  strategy!: ElementTargetingStrategy;

  @ApiPropertyOptional({
    description: 'CSS selector for element targeting',
    example: '.button-primary, #submit-btn',
  })
  @IsOptional()
  @IsString({ message: 'CSS selector must be a string' })
  @MinLength(1, { message: 'CSS selector cannot be empty' })
  @MaxLength(2000, { message: 'CSS selector too long' })
  @Matches(/^[a-zA-Z0-9\s\-_#.,:[\]()>"'=*+~^$|\\]+$/, {
    message: 'Invalid CSS selector format'
  })
  cssSelector?: string;

  @ApiPropertyOptional({
    description: 'XPath expression for element targeting',
    example: '//button[@class="submit" and contains(text(), "Submit")]',
  })
  @IsOptional()
  @IsString({ message: 'XPath must be a string' })
  @MinLength(1, { message: 'XPath cannot be empty' })
  @MaxLength(2000, { message: 'XPath too long' })
  xpath?: string;

  @ApiPropertyOptional({
    description: 'Exact text content to match',
    example: 'Submit Form',
  })
  @IsOptional()
  @IsString({ message: 'Text content must be a string' })
  @MaxLength(1000, { message: 'Text content too long' })
  textContent?: string;

  @ApiPropertyOptional({
    description: 'Partial text content to match (case-insensitive)',
    example: 'submit',
  })
  @IsOptional()
  @IsString({ message: 'Partial text must be a string' })
  @MaxLength(500, { message: 'Partial text too long' })
  partialText?: string;

  @ApiPropertyOptional({
    description: 'ARIA label attribute value',
    example: 'Submit the contact form',
  })
  @IsOptional()
  @IsString({ message: 'ARIA label must be a string' })
  @MaxLength(500, { message: 'ARIA label too long' })
  ariaLabel?: string;

  @ApiPropertyOptional({
    description: 'Data attribute key-value pairs',
    example: { 'data-testid': 'submit-button', 'data-action': 'submit' },
  })
  @IsOptional()
  @IsObject({ message: 'Data attributes must be an object' })
  dataAttributes?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Exact coordinates for interaction',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Coordinates)
  coordinates?: Coordinates;

  @ApiPropertyOptional({
    description: 'Element index if multiple elements match',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Element index must be a number' })
  @Min(0, { message: 'Element index must be non-negative' })
  @Max(100, { message: 'Element index too high' })
  elementIndex?: number;

  @ApiPropertyOptional({
    description: 'Visual description for AI-powered element detection',
    example: 'A blue button with white text in the bottom right corner',
  })
  @IsOptional()
  @IsString({ message: 'Visual description must be a string' })
  @MaxLength(500, { message: 'Visual description too long' })
  visualDescription?: string;

  @ApiPropertyOptional({
    description: 'Context selector to limit search scope',
    example: '.form-container, #main-content',
  })
  @IsOptional()
  @IsString({ message: 'Context selector must be a string' })
  @MaxLength(1000, { message: 'Context selector too long' })
  contextSelector?: string;
}

/**
 * Precise coordinate definition
 */
export class Coordinates {
  @ApiProperty({
    description: 'X coordinate in pixels',
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'X coordinate must be a number' })
  @Min(0, { message: 'X coordinate must be non-negative' })
  @Max(10000, { message: 'X coordinate too large' })
  x!: number;

  @ApiProperty({
    description: 'Y coordinate in pixels',
    minimum: 0,
    maximum: 10000,
  })
  @IsNumber({}, { message: 'Y coordinate must be a number' })
  @Min(0, { message: 'Y coordinate must be non-negative' })
  @Max(10000, { message: 'Y coordinate too large' })
  y!: number;

  @ApiPropertyOptional({
    description: 'Coordinate offset from element center',
  })
  @IsOptional()
  @IsObject()
  offset?: {
    x: number;
    y: number;
  };
}

/**
 * Advanced interaction timing and delays
 */
export class InteractionTiming {
  @ApiPropertyOptional({
    description: 'Pre-interaction delay in milliseconds',
    minimum: 0,
    maximum: 10000,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Pre-delay must be a number' })
  @Min(0, { message: 'Pre-delay must be non-negative' })
  @Max(10000, { message: 'Pre-delay too long' })
  preDelayMs?: number = 0;

  @ApiPropertyOptional({
    description: 'Post-interaction delay in milliseconds',
    minimum: 0,
    maximum: 10000,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Post-delay must be a number' })
  @Min(0, { message: 'Post-delay must be non-negative' })
  @Max(10000, { message: 'Post-delay too long' })
  postDelayMs?: number = 0;

  @ApiPropertyOptional({
    description: 'Delay between keystrokes for typing (milliseconds)',
    minimum: 0,
    maximum: 1000,
    default: 50,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Keystroke delay must be a number' })
  @Min(0, { message: 'Keystroke delay must be non-negative' })
  @Max(1000, { message: 'Keystroke delay too long' })
  keystrokeDelayMs?: number = 50;

  @ApiPropertyOptional({
    description: 'Random variation in timing (0-1 multiplier)',
    minimum: 0,
    maximum: 1,
    default: 0.1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Timing variation must be a number' })
  @Min(0, { message: 'Timing variation must be non-negative' })
  @Max(1, { message: 'Timing variation too high' })
  timingVariation?: number = 0.1;

  @ApiPropertyOptional({
    description: 'Simulate human-like timing patterns',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Human timing must be boolean' })
  simulateHumanTiming?: boolean = true;
}

/**
 * Enhanced Click Interaction DTO
 */
export class ClickInteractionDto {
  @ApiProperty({
    description: 'Element locator configuration',
  })
  @ValidateNested()
  @Type(() => ElementLocator)
  element!: ElementLocator;

  @ApiPropertyOptional({
    description: 'Type of click interaction',
    enum: ClickType,
    default: ClickType.SINGLE,
  })
  @IsOptional()
  @IsEnum(ClickType, { message: 'Invalid click type' })
  clickType?: ClickType = ClickType.SINGLE;

  @ApiPropertyOptional({
    description: 'Modifier keys to hold during click',
    example: ['ctrl', 'shift'],
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: 'Modifier keys must be an array' })
  @IsEnum(['ctrl', 'alt', 'shift', 'meta'], {
    each: true,
    message: 'Invalid modifier key'
  })
  @ArrayMaxSize(4, { message: 'Too many modifier keys' })
  modifierKeys?: string[];

  @ApiPropertyOptional({
    description: 'Interaction timeout in seconds',
    minimum: 1,
    maximum: 60,
    default: 10,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Timeout must be a number' })
  @Min(1, { message: 'Timeout must be at least 1 second' })
  @Max(60, { message: 'Timeout must not exceed 60 seconds' })
  timeoutSeconds?: number = 10;

  @ApiPropertyOptional({
    description: 'Element visibility requirement',
    enum: VisibilityRequirement,
    default: VisibilityRequirement.VISIBLE,
  })
  @IsOptional()
  @IsEnum(VisibilityRequirement)
  visibilityRequirement?: VisibilityRequirement = VisibilityRequirement.VISIBLE;

  @ApiPropertyOptional({
    description: 'Force click even if element is covered',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Force option must be boolean' })
  force?: boolean = false;

  @ApiPropertyOptional({
    description: 'Scroll element into view before clicking',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Scroll into view must be boolean' })
  scrollIntoView?: boolean = true;

  @ApiPropertyOptional({
    description: 'Wait for navigation after click',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Wait for navigation must be boolean' })
  waitForNavigation?: boolean = false;

  @ApiPropertyOptional({
    description: 'Interaction timing configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InteractionTiming)
  timing?: InteractionTiming;

  @ApiPropertyOptional({
    description: 'Safety level for this interaction',
    enum: InteractionSafetyLevel,
    default: InteractionSafetyLevel.SAFE,
  })
  @IsOptional()
  @IsEnum(InteractionSafetyLevel)
  safetyLevel?: InteractionSafetyLevel = InteractionSafetyLevel.SAFE;

  @ApiPropertyOptional({
    description: 'Capture screenshot before and after interaction',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Screenshot option must be boolean' })
  captureScreenshots?: boolean = false;

  @ApiPropertyOptional({
    description: 'Custom validation after click',
  })
  @IsOptional()
  @IsObject()
  postClickValidation?: {
    expectedUrl?: string;
    expectedText?: string;
    expectedElement?: string;
    timeoutMs?: number;
  };
}

/**
 * Enhanced Type Interaction DTO
 */
export class TypeInteractionDto {
  @ApiProperty({
    description: 'Element locator configuration',
  })
  @ValidateNested()
  @Type(() => ElementLocator)
  element!: ElementLocator;

  @ApiProperty({
    description: 'Text to type into the element',
    minLength: 1,
    maxLength: 50000,
  })
  @IsString({ message: 'Text must be a string' })
  @MinLength(1, { message: 'Text cannot be empty' })
  @MaxLength(50000, { message: 'Text too long' })
  @Transform(({ value }) => typeof value === 'string' ? value : value)
  text!: string;

  @ApiPropertyOptional({
    description: 'Input method for typing',
    enum: InputMethod,
    default: InputMethod.CLEAR_AND_TYPE,
  })
  @IsOptional()
  @IsEnum(InputMethod, { message: 'Invalid input method' })
  inputMethod?: InputMethod = InputMethod.CLEAR_AND_TYPE;

  @ApiPropertyOptional({
    description: 'Interaction timing configuration',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InteractionTiming)
  timing?: InteractionTiming;

  @ApiPropertyOptional({
    description: 'Press specific key after typing',
    enum: ['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'Space'],
  })
  @IsOptional()
  @IsEnum(['Enter', 'Tab', 'Escape', 'ArrowDown', 'ArrowUp', 'Space'])
  pressKeyAfter?: string;

  @ApiPropertyOptional({
    description: 'Validate input after typing',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Validation option must be boolean' })
  validateInput?: boolean = true;

  @ApiPropertyOptional({
    description: 'Element visibility requirement',
    enum: VisibilityRequirement,
    default: VisibilityRequirement.VISIBLE,
  })
  @IsOptional()
  @IsEnum(VisibilityRequirement)
  visibilityRequirement?: VisibilityRequirement = VisibilityRequirement.VISIBLE;

  @ApiPropertyOptional({
    description: 'Scroll element into view before typing',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Scroll into view must be boolean' })
  scrollIntoView?: boolean = true;

  @ApiPropertyOptional({
    description: 'Clear field using Ctrl+A + Delete instead of .clear()',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Force clear must be boolean' })
  forceClear?: boolean = false;

  @ApiPropertyOptional({
    description: 'Mask sensitive input in logs and screenshots',
    default: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Mask input must be boolean' })
  maskSensitiveInput?: boolean = false;

  @ApiPropertyOptional({
    description: 'Input validation rules',
  })
  @IsOptional()
  @IsObject()
  inputValidation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    allowedCharacters?: string;
    forbiddenCharacters?: string;
  };

  @ApiPropertyOptional({
    description: 'Safety level for this interaction',
    enum: InteractionSafetyLevel,
    default: InteractionSafetyLevel.SAFE,
  })
  @IsOptional()
  @IsEnum(InteractionSafetyLevel)
  safetyLevel?: InteractionSafetyLevel = InteractionSafetyLevel.SAFE;
}

/**
 * Enhanced Scroll Interaction DTO
 */
export class ScrollInteractionDto {
  @ApiPropertyOptional({
    description: 'Element to scroll within (defaults to page)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ElementLocator)
  element?: ElementLocator;

  @ApiPropertyOptional({
    description: 'Scroll direction',
    enum: ['up', 'down', 'left', 'right'],
    default: 'down',
  })
  @IsOptional()
  @IsEnum(['up', 'down', 'left', 'right'], { message: 'Invalid scroll direction' })
  direction?: 'up' | 'down' | 'left' | 'right' = 'down';

  @ApiPropertyOptional({
    description: 'Number of pixels to scroll',
    minimum: 1,
    maximum: 10000,
    default: 500,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Pixels must be a number' })
  @Min(1, { message: 'Pixels must be positive' })
  @Max(10000, { message: 'Pixels too large' })
  pixels?: number = 500;

  @ApiPropertyOptional({
    description: 'Scroll behavior',
    enum: ScrollBehavior,
    default: ScrollBehavior.SMOOTH,
  })
  @IsOptional()
  @IsEnum(ScrollBehavior)
  behavior?: ScrollBehavior = ScrollBehavior.SMOOTH;

  @ApiPropertyOptional({
    description: 'Target coordinates to scroll to',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Coordinates)
  targetCoordinates?: Coordinates;

  @ApiPropertyOptional({
    description: 'Element to scroll into view',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ElementLocator)
  scrollToElement?: ElementLocator;

  @ApiPropertyOptional({
    description: 'Number of scroll steps',
    minimum: 1,
    maximum: 20,
    default: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Steps must be a number' })
  @Min(1, { message: 'Steps must be at least 1' })
  @Max(20, { message: 'Too many steps' })
  steps?: number = 1;

  @ApiPropertyOptional({
    description: 'Delay between scroll steps in milliseconds',
    minimum: 0,
    maximum: 2000,
    default: 100,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Step delay must be a number' })
  @Min(0, { message: 'Step delay must be non-negative' })
  @Max(2000, { message: 'Step delay too long' })
  stepDelayMs?: number = 100;

  @ApiPropertyOptional({
    description: 'Wait for scroll to complete',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Wait for completion must be boolean' })
  waitForCompletion?: boolean = true;
}

/**
 * Interaction Response DTO with comprehensive results
 */
export class InteractionResponseDto {
  @ApiProperty({ description: 'Interaction success status' })
  @IsBoolean()
  success!: boolean;

  @ApiProperty({ description: 'Type of interaction performed' })
  @IsString()
  interactionType!: string;

  @ApiProperty({ description: 'Target element information' })
  @IsOptional()
  targetElement?: {
    locator: ElementLocator;
    foundElement: {
      tagName: string;
      text: string;
      attributes: Record<string, string>;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
      visible: boolean;
      enabled: boolean;
    };
    searchTimeMs: number;
  };

  @ApiProperty({ description: 'Interaction timing metrics' })
  performanceMetrics!: {
    totalTimeMs: number;
    elementSearchTimeMs: number;
    interactionTimeMs: number;
    validationTimeMs?: number;
    screenshotTimeMs?: number;
  };

  @ApiProperty({ description: 'Interaction validation results' })
  @IsOptional()
  validationResults?: {
    preInteractionChecks: Array<{
      check: string;
      passed: boolean;
      message?: string;
    }>;
    postInteractionChecks: Array<{
      check: string;
      passed: boolean;
      message?: string;
    }>;
    expectedOutcome: boolean;
  };

  @ApiProperty({ description: 'Screenshots captured during interaction' })
  @IsOptional()
  screenshots?: Array<{
    type: 'before' | 'after' | 'during';
    screenshotId: string;
    timestamp: Date;
    description: string;
  }>;

  @ApiProperty({ description: 'Page state changes detected' })
  @IsOptional()
  pageStateChanges?: {
    urlChanged: boolean;
    newUrl?: string;
    titleChanged: boolean;
    newTitle?: string;
    domChanges: boolean;
    networkActivity: number;
  };

  @ApiProperty({ description: 'Error information if interaction failed' })
  @IsOptional()
  error?: {
    code: string;
    message: string;
    category: 'element_not_found' | 'interaction_failed' | 'validation_failed' | 'timeout' | 'security_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    retryable: boolean;
    context: {
      elementSearchAttempts: number;
      lastKnownElementState?: Record<string, unknown>;
      pageState?: Record<string, unknown>;
    };
  };

  @ApiProperty({ description: 'Correlation ID for request tracking' })
  @IsUUID()
  correlationId!: string;

  @ApiProperty({ description: 'Response generation timestamp' })
  timestamp!: Date;
}

// Export enhanced interaction DTOs
export {
  ClickType,
  InputMethod,
  ElementTargetingStrategy,
  InteractionSafetyLevel,
  ScrollBehavior,
  VisibilityRequirement,
  ElementLocator,
  Coordinates,
  InteractionTiming,
};