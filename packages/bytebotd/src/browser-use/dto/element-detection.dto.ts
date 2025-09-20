import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import {IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';import { Type } from 'class-transformer';/*** Element detection strategies
 */
export enum DetectionStrategy {
  CSS_SELECTOR = 'css_selector',XPATH = 'xpath',TEXT_CONTENT = 'text_content',ATTRIBUTE_VALUE = 'attribute_value',VISUAL_SIMILARITY = 'visual_similarity',AI_DESCRIPTION = 'ai_description',COMBINED = 'combined',}/**
 * Element visibility states
 */
export enum ElementVisibility {
  VISIBLE = 'visible',HIDDEN = 'hidden',PARTIALLY_VISIBLE = 'partially_visible',OUT_OF_VIEWPORT = 'out_of_viewport',}/**
 * Element interactability states
 */
export enum ElementInteractability {
  INTERACTABLE = 'interactable',DISABLED = 'disabled',READ_ONLY = 'read_only',HIDDEN = 'hidden',OVERLAPPED = 'overlapped',}/**
 * Wait condition types
 */
export enum WaitCondition {
  PRESENT = 'present',VISIBLE = 'visible',HIDDEN = 'hidden',CLICKABLE = 'clickable',STABLE = 'stable',ATTACHED = 'attached',DETACHED = 'detached',}/**
 * Element attribute filter
 */
export class ElementAttributeFilterDto {
  @ApiProperty({
    description: 'Attribute name to filter by',example: 'data-testid',})@IsString()
  name: string = '';@ApiPropertyOptional({description: 'Expected attribute value',example: 'submit-button',})@IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Use regex matching for value',default: false,})
  @IsOptional()
  @IsBoolean()
  useRegex?: boolean = false;

  @ApiPropertyOptional({
    description: 'Case insensitive matching',default: false,})
  @IsOptional()
  @IsBoolean()
  caseInsensitive?: boolean = false;

  @ApiPropertyOptional({
    description: 'Attribute must be present (ignore value)',default: false,})
  @IsOptional()
  @IsBoolean()
  presenceOnly?: boolean = false;
}

/**
 * Text content filter
 */
export class TextContentFilterDto {
  @ApiProperty({
    description: 'Text content to search for',example: 'Submit Form',})@IsString()
  text: string = '';@ApiPropertyOptional({description: 'Exact text match',default: false,})
  @IsOptional()
  @IsBoolean()
  exact?: boolean = false;

  @ApiPropertyOptional({
    description: 'Case insensitive matching',default: true,})
  @IsOptional()
  @IsBoolean()
  caseInsensitive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Use regex pattern matching',default: false,})
  @IsOptional()
  @IsBoolean()
  useRegex?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include child element text in search',default: true,})
  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean = true;

  @ApiPropertyOptional({
    description: 'Trim whitespace before matching',default: true,})
  @IsOptional()
  @IsBoolean()
  trimWhitespace?: boolean = true;
}

/**
 * Visual similarity filter
 */
export class VisualSimilarityFilterDto {
  @ApiProperty({
    description: 'Base64 encoded reference image',})@IsString()
  referenceImage: string = '';@ApiPropertyOptional({description: 'Similarity threshold (0-1)',minimum: 0,maximum: 1,
    default: 0.8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number = 0.8;

  @ApiPropertyOptional({
    description: 'Resize images for comparison',default: true,})
  @IsOptional()
  @IsBoolean()
  resizeForComparison?: boolean = true;

  @ApiPropertyOptional({
    description: 'Comparison region (relative to element)',type: 'object',properties: {x: { type: 'number', minimum: 0, maximum: 1 },y: { type: 'number', minimum: 0, maximum: 1 },width: { type: 'number', minimum: 0, maximum: 1 },height: { type: 'number', minimum: 0, maximum: 1 },},})
  @IsOptional()
  @IsObject()
  compareRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * AI description filter
 */
export class AIDescriptionFilterDto {
  @ApiProperty({
    description: 'Natural language description of the element',example: 'The blue submit button in the footer',})@IsString()
  description: string = '';@ApiPropertyOptional({description: 'AI confidence threshold (0-1)',minimum: 0,maximum: 1,
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Include surrounding context in analysis',default: true,})
  @IsOptional()
  @IsBoolean()
  includeContext?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum number of candidates to evaluate',minimum: 1,maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxCandidates?: number = 5;
}

/**
 * Element detection criteria
 */
export class ElementDetectionCriteriaDto {
  @ApiProperty({
    description: 'Detection strategy to use',enum: DetectionStrategy,})
  @IsEnum(DetectionStrategy)
  strategy: DetectionStrategy = DetectionStrategy.CSS_SELECTOR;

  @ApiPropertyOptional({
    description: 'CSS selector for CSS_SELECTOR strategy',example: '#submit-button',})@IsOptional()
  @IsString()
  cssSelector?: string;

  @ApiPropertyOptional({
    description: 'XPath expression for XPATH strategy',example: '//button[@type="submit"]",})
  @IsOptional()
  @IsString()
  xpath?: string;

  @ApiPropertyOptional({
    description: 'Text content filter for TEXT_CONTENT strategy',type: TextContentFilterDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => TextContentFilterDto)
  textContent?: TextContentFilterDto;

  @ApiPropertyOptional({
    description: 'Attribute filters for ATTRIBUTE_VALUE strategy',type: [ElementAttributeFilterDto],})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ElementAttributeFilterDto)
  attributes?: ElementAttributeFilterDto[];

  @ApiPropertyOptional({
    description: 'Visual similarity filter for VISUAL_SIMILARITY strategy',type: VisualSimilarityFilterDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => VisualSimilarityFilterDto)
  visualSimilarity?: VisualSimilarityFilterDto;

  @ApiPropertyOptional({
    description: 'AI description filter for AI_DESCRIPTION strategy',type: AIDescriptionFilterDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => AIDescriptionFilterDto)
  aiDescription?: AIDescriptionFilterDto;

  @ApiPropertyOptional({
    description: 'Element tag name filter',example: 'button',})@IsOptional()
  @IsString()
  tagName?: string;

  @ApiPropertyOptional({
    description: 'Required visibility state',enum: ElementVisibility,})
  @IsOptional()
  @IsEnum(ElementVisibility)
  visibility?: ElementVisibility;

  @ApiPropertyOptional({
    description: 'Required interactability state',enum: ElementInteractability,})
  @IsOptional()
  @IsEnum(ElementInteractability)
  interactability?: ElementInteractability;

  @ApiPropertyOptional({
    description: 'Element index when multiple matches (0-based)',minimum: 0,})
  @IsOptional()
  @IsNumber()
  @Min(0)
  index?: number;

  @ApiPropertyOptional({
    description: 'Return all matching elements',default: false,})
  @IsOptional()
  @IsBoolean()
  returnAll?: boolean = false;
}

/**
 * Wait configuration for element detection
 */
export class ElementWaitConfigDto {
  @ApiProperty({
    description: 'Wait condition to satisfy',enum: WaitCondition,default: WaitCondition.VISIBLE,
  })
  @IsEnum(WaitCondition)
  condition: WaitCondition = WaitCondition.VISIBLE;

  @ApiPropertyOptional({
    description: 'Maximum wait time in milliseconds',minimum: 100,maximum: 300000,
    default: 10000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(300000)
  timeoutMs?: number = 10000;

  @ApiPropertyOptional({
    description: 'Polling interval in milliseconds',minimum: 50,maximum: 5000,
    default: 250,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(5000)
  pollIntervalMs?: number = 250;

  @ApiPropertyOptional({
    description: 'Stability check duration (element must remain stable)',minimum: 0,maximum: 10000,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  stabilityDurationMs?: number = 0;

  @ApiPropertyOptional({
    description: 'Abort wait if condition is not met initially',default: false,})
  @IsOptional()
  @IsBoolean()
  abortOnInitialFailure?: boolean = false;
}

/**
 * Element detection request
 */
export class ElementDetectionDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})@IsString()
  sessionId: string = '';@ApiProperty({description: 'Element detection criteria',type: ElementDetectionCriteriaDto,})
  @ValidateNested()
  @Type(() => ElementDetectionCriteriaDto)
  criteria: ElementDetectionCriteriaDto = new ElementDetectionCriteriaDto();

  @ApiPropertyOptional({
    description: 'Wait configuration for element detection',type: ElementWaitConfigDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => ElementWaitConfigDto)
  waitConfig?: ElementWaitConfigDto;

  @ApiPropertyOptional({
    description: 'Include element screenshot in result',default: false,})
  @IsOptional()
  @IsBoolean()
  includeScreenshot?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include element HTML content in result',default: false,})
  @IsOptional()
  @IsBoolean()
  includeHtml?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include computed styles in result',default: false,})
  @IsOptional()
  @IsBoolean()
  includeStyles?: boolean = false;

  @ApiPropertyOptional({
    description: 'Additional detection metadata',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Batch element detection request
 */
export class BatchElementDetectionDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})@IsString()
  sessionId: string = '';@ApiProperty({description: 'Array of element detection requests',type: [ElementDetectionDto],})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ElementDetectionDto)
  detections: Omit<ElementDetectionDto, 'sessionId'>[] = [];@ApiPropertyOptional({description: 'Continue detection on individual failures',default: true,})
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum concurrent detections',minimum: 1,maximum: 10,
    default: 3,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxConcurrent?: number = 3;
}

/**
 * Detected element information
 */
export class DetectedElementDto {
  @ApiProperty({
    description: 'Element tag name',example: 'button',})tagName: string = '';@ApiPropertyOptional({description: 'Element ID attribute',example: 'submit-button',})id?: string;

  @ApiPropertyOptional({
    description: 'Element class names',type: [String],example: ['btn', 'btn-primary'],})classNames?: string[];

  @ApiProperty({
    description: 'Element text content',})textContent: string = '';@ApiProperty({description: 'Element attributes',type: 'object',additionalProperties: { type: 'string' },})attributes: Record<string, string> = {};

  @ApiProperty({
    description: 'Element bounding box',type: 'object',properties: {x: { type: 'number' },y: { type: 'number' },width: { type: 'number' },height: { type: 'number' },top: { type: 'number' },left: { type: 'number' },bottom: { type: 'number' },right: { type: 'number' },},})
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    left: number;
    bottom: number;
    right: number;
  } = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  };

  @ApiProperty({
    description: 'Element visibility state',enum: ElementVisibility,})
  visibility: ElementVisibility = ElementVisibility.VISIBLE;

  @ApiProperty({
    description: 'Element interactability state',enum: ElementInteractability,})
  interactability: ElementInteractability = ElementInteractability.INTERACTABLE;

  @ApiProperty({
    description: 'CSS selector that uniquely identifies this element',})uniqueSelector: string = '';@ApiProperty({description: 'XPath that uniquely identifies this element',})uniqueXPath: string = '';@ApiPropertyOptional({description: 'Element screenshot (base64)',})screenshot?: string;

  @ApiPropertyOptional({
    description: 'Element HTML content',})html?: string;

  @ApiPropertyOptional({
    description: 'Element computed styles',type: 'object',additionalProperties: { type: 'string' },})computedStyles?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Parent element information',type: 'object',properties: {tagName: { type: 'string' },id: { type: 'string' },className: { type: 'string' },},})
  parent?: {
    tagName: string;
    id?: string;
    className?: string;
  };

  @ApiPropertyOptional({
    description: 'Child elements count',})childCount?: number;

  @ApiPropertyOptional({
    description: 'Detection confidence score (0-1)',minimum: 0,maximum: 1,
  })
  confidence?: number;
}

/**
 * Element detection result
 */
export class ElementDetectionResultDto {
  @ApiProperty({
    description: 'Unique detection identifier',example: 'detection_xyz789',})detectionId: string = '';@ApiProperty({description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'Detection success status',})success: boolean = false;

  @ApiProperty({
    description: 'Detection start timestamp',})startedAt: Date = new Date();

  @ApiProperty({
    description: 'Detection completion timestamp',})completedAt: Date = new Date();

  @ApiProperty({
    description: 'Detection duration in milliseconds',})durationMs: number = 0;

  @ApiProperty({
    description: 'Detection strategy used',enum: DetectionStrategy,})
  strategy: DetectionStrategy = DetectionStrategy.CSS_SELECTOR;

  @ApiProperty({
    description: 'Number of elements found',})elementsFound: number = 0;

  @ApiProperty({
    description: 'Detected elements',type: [DetectedElementDto],})
  elements: DetectedElementDto[] = [];

  @ApiPropertyOptional({
    description: 'Primary detected element (first match)',type: DetectedElementDto,})
  primaryElement?: DetectedElementDto;

  @ApiPropertyOptional({
    description: 'Wait condition result',type: 'object',properties: {condition: { type: 'string', enum: Object.values(WaitCondition) },satisfied: { type: 'boolean' },waitTime: { type: 'number' },},})
  waitResult?: {
    condition: WaitCondition;
    satisfied: boolean;
    waitTime: number;
  };

  @ApiPropertyOptional({
    description: 'Error message if detection failed',})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Detailed error information',type: 'object',additionalProperties: true,})
  errorDetails?: Record<string, unknown>;

  @ApiProperty({
    description: 'Page URL at time of detection',})pageUrl: string = '';@ApiProperty({description: 'Page title at time of detection',})pageTitle: string = '';@ApiPropertyOptional({description: 'Detection metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Batch element detection result
 */
export class BatchElementDetectionResultDto {
  @ApiProperty({
    description: 'Unique batch identifier',example: 'batch_abc123',})batchId: string = '';@ApiProperty({description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'Array of individual detection results',type: [ElementDetectionResultDto],})
  detections: ElementDetectionResultDto[] = [];

  @ApiProperty({
    description: 'Total detections requested',})totalRequested: number = 0;

  @ApiProperty({
    description: 'Detections completed successfully',})successfulDetections: number = 0;

  @ApiProperty({
    description: 'Detections that failed',})failedDetections: number = 0;

  @ApiProperty({
    description: 'Total elements found across all detections',})totalElementsFound: number = 0;

  @ApiProperty({
    description: 'Batch execution start timestamp',})startedAt: Date = new Date();

  @ApiProperty({
    description: 'Batch execution completion timestamp',})completedAt: Date = new Date();

  @ApiProperty({
    description: 'Total batch execution time in milliseconds',})totalDurationMs: number = 0;

  @ApiPropertyOptional({
    description: 'Batch execution errors',type: [String],})
  errors?: string[];

  @ApiPropertyOptional({
    description: 'Batch metadata',type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}