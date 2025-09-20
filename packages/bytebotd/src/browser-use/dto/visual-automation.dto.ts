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
} from 'class-validator';import { Type } from 'class-transformer';/*** OCR engine types
 */
export enum OCREngine {
  TESSERACT = 'tesseract',PADDLE_OCR = 'paddle_ocr',EASY_OCR = 'easy_ocr',AZURE_COGNITIVE = 'azure_cognitive',GOOGLE_VISION = 'google_vision',}/**
 * OCR language codes
 */
export enum OCRLanguage {
  ENGLISH = 'en',SPANISH = 'es',FRENCH = 'fr',GERMAN = 'de',CHINESE_SIMPLIFIED = 'zh-cn',CHINESE_TRADITIONAL = 'zh-tw',JAPANESE = 'ja',KOREAN = 'ko',RUSSIAN = 'ru',ARABIC = 'ar',AUTO_DETECT = 'auto',}/**
 * Image preprocessing options
 */
export enum ImagePreprocessing {
  NONE = 'none',GRAYSCALE = 'grayscale',THRESHOLD = 'threshold',NOISE_REDUCTION = 'noise_reduction',CONTRAST_ENHANCEMENT = 'contrast_enhancement',SHARPENING = 'sharpening',DESKEW = 'deskew',RESIZE = 'resize',}/**
 * Visual element types for detection
 */
export enum VisualElementType {
  BUTTON = 'button',INPUT_FIELD = 'input_field',CHECKBOX = 'checkbox',RADIO_BUTTON = 'radio_button',DROPDOWN = 'dropdown',LINK = 'link',IMAGE = 'image',ICON = 'icon',TEXT_BLOCK = 'text_block',TABLE = 'table',FORM = 'form',MODAL = 'modal',MENU = 'menu',CUSTOM = 'custom',}/**
 * Template matching methods
 */
export enum TemplateMatchingMethod {
  SQDIFF = 'sqdiff',SQDIFF_NORMED = 'sqdiff_normed',CCORR = 'ccorr',CCORR_NORMED = 'ccorr_normed',CCOEFF = 'ccoeff',CCOEFF_NORMED = 'ccoeff_normed',}/**
 * Image comparison algorithms
 */
export enum ImageComparisonAlgorithm {
  STRUCTURAL_SIMILARITY = 'structural_similarity',HISTOGRAM_COMPARISON = 'histogram_comparison',FEATURE_MATCHING = 'feature_matching',PIXEL_DIFFERENCE = 'pixel_difference',PERCEPTUAL_HASH = 'perceptual_hash',}/**
 * OCR region definition
 */
export class OCRRegionDto {
  @ApiProperty({
    description: 'Region x coordinate',minimum: 0,})
  @IsNumber()
  @Min(0)
  x: number = 0;

  @ApiProperty({
    description: 'Region y coordinate',minimum: 0,})
  @IsNumber()
  @Min(0)
  y: number = 0;

  @ApiProperty({
    description: 'Region width',minimum: 1,})
  @IsNumber()
  @Min(1)
  width: number = 100;

  @ApiProperty({
    description: 'Region height',minimum: 1,})
  @IsNumber()
  @Min(1)
  height: number = 100;

  @ApiPropertyOptional({
    description: 'Region label for identification',example: 'price_area',})@IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    description: 'OCR confidence threshold for this region',minimum: 0,maximum: 1,
    default: 0.8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number = 0.8;
}

/**
 * OCR configuration
 */
export class OCRConfigDto {
  @ApiPropertyOptional({
    description: 'OCR engine to use',enum: OCREngine,default: OCREngine.TESSERACT,
  })
  @IsOptional()
  @IsEnum(OCREngine)
  engine?: OCREngine = OCREngine.TESSERACT;

  @ApiPropertyOptional({
    description: 'Primary language for OCR',enum: OCRLanguage,default: OCRLanguage.ENGLISH,
  })
  @IsOptional()
  @IsEnum(OCRLanguage)
  language?: OCRLanguage = OCRLanguage.ENGLISH;

  @ApiPropertyOptional({
    description: 'Additional languages for OCR',type: [String],enum: OCRLanguage,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(OCRLanguage, { each: true })
  additionalLanguages?: OCRLanguage[];

  @ApiPropertyOptional({
    description: 'Image preprocessing options',type: [String],enum: ImagePreprocessing,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ImagePreprocessing, { each: true })
  preprocessing?: ImagePreprocessing[];

  @ApiPropertyOptional({
    description: 'OCR confidence threshold',minimum: 0,maximum: 1,
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Remove noise from detected text',default: true,})
  @IsOptional()
  @IsBoolean()
  removeNoise?: boolean = true;

  @ApiPropertyOptional({
    description: 'Scale factor for image before OCR',minimum: 0.1,maximum: 5.0,
    default: 1.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  scaleFactor?: number = 1.0;

  @ApiPropertyOptional({
    description: 'Custom OCR configuration parameters',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  customParams?: Record<string, unknown>;
}

/**
 * Template matching configuration
 */
export class TemplateMatchingConfigDto {
  @ApiProperty({
    description: 'Base64 encoded template image',})@IsString()
  templateImage: string = '';@ApiPropertyOptional({description: 'Template matching method',enum: TemplateMatchingMethod,default: TemplateMatchingMethod.CCOEFF_NORMED,
  })
  @IsOptional()
  @IsEnum(TemplateMatchingMethod)
  method?: TemplateMatchingMethod = TemplateMatchingMethod.CCOEFF_NORMED;

  @ApiPropertyOptional({
    description: 'Matching confidence threshold',minimum: 0,maximum: 1,
    default: 0.8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number = 0.8;

  @ApiPropertyOptional({
    description: 'Scale template for better matching',type: [Number],example: [0.8, 1.0, 1.2],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  scaleFactors?: number[];

  @ApiPropertyOptional({
    description: 'Maximum number of matches to return',minimum: 1,maximum: 50,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxMatches?: number = 1;

  @ApiPropertyOptional({
    description: 'Search region within the image',type: OCRRegionDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => OCRRegionDto)
  searchRegion?: OCRRegionDto;
}

/**
 * Visual element detection configuration
 */
export class VisualElementDetectionConfigDto {
  @ApiProperty({
    description: 'Type of visual element to detect',enum: VisualElementType,})
  @IsEnum(VisualElementType)
  elementType: VisualElementType = VisualElementType.BUTTON;

  @ApiPropertyOptional({
    description: 'Element description for AI-based detection',example: 'Red submit button with white text',})@IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Reference image for template matching',type: TemplateMatchingConfigDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => TemplateMatchingConfigDto)
  templateMatching?: TemplateMatchingConfigDto;

  @ApiPropertyOptional({
    description: 'Expected text content within element',example: 'Submit',})@IsOptional()
  @IsString()
  expectedText?: string;

  @ApiPropertyOptional({
    description: 'Confidence threshold for detection',minimum: 0,maximum: 1,
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidenceThreshold?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Search region within the screenshot',type: OCRRegionDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => OCRRegionDto)
  searchRegion?: OCRRegionDto;
}

/**
 * Image comparison configuration
 */
export class ImageComparisonConfigDto {
  @ApiProperty({
    description: 'Base64 encoded reference image',})@IsString()
  referenceImage: string = '';@ApiPropertyOptional({description: 'Comparison algorithm to use',enum: ImageComparisonAlgorithm,default: ImageComparisonAlgorithm.STRUCTURAL_SIMILARITY,
  })
  @IsOptional()
  @IsEnum(ImageComparisonAlgorithm)
  algorithm?: ImageComparisonAlgorithm = ImageComparisonAlgorithm.STRUCTURAL_SIMILARITY;

  @ApiPropertyOptional({
    description: 'Similarity threshold for match',minimum: 0,maximum: 1,
    default: 0.9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityThreshold?: number = 0.9;

  @ApiPropertyOptional({
    description: 'Resize images for comparison',default: true,})
  @IsOptional()
  @IsBoolean()
  resizeForComparison?: boolean = true;

  @ApiPropertyOptional({
    description: 'Ignore color differences (grayscale comparison)',default: false,})
  @IsOptional()
  @IsBoolean()
  ignoreColor?: boolean = false;

  @ApiPropertyOptional({
    description: 'Comparison region mask',type: OCRRegionDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => OCRRegionDto)
  mask?: OCRRegionDto;
}

/**
 * OCR extraction request
 */
export class OCRExtractionDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})@IsString()
  sessionId: string = '';@ApiPropertyOptional({description: 'Base64 encoded image (if not using session screenshot)',})@IsOptional()
  @IsString()
  imageData?: string;

  @ApiPropertyOptional({
    description: 'OCR configuration',type: OCRConfigDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => OCRConfigDto)
  ocrConfig?: OCRConfigDto;

  @ApiPropertyOptional({
    description: 'Specific regions to extract text from',type: [OCRRegionDto],})
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OCRRegionDto)
  regions?: OCRRegionDto[];

  @ApiPropertyOptional({
    description: 'Return bounding boxes for detected text',default: true,})
  @IsOptional()
  @IsBoolean()
  includeBoundingBoxes?: boolean = true;

  @ApiPropertyOptional({
    description: 'Return confidence scores for detected text',default: true,})
  @IsOptional()
  @IsBoolean()
  includeConfidence?: boolean = true;

  @ApiPropertyOptional({
    description: 'Filter text by minimum confidence',minimum: 0,maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({
    description: 'Additional extraction metadata',type: 'object',additionalProperties: true,})
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * Visual element interaction request
 */
export class VisualElementInteractionDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})@IsString()
  sessionId: string = '';@ApiProperty({description: 'Visual element detection configuration',type: VisualElementDetectionConfigDto,})
  @ValidateNested()
  @Type(() => VisualElementDetectionConfigDto)
  elementDetection: VisualElementDetectionConfigDto = new VisualElementDetectionConfigDto();

  @ApiPropertyOptional({
    description: 'Interaction type to perform on detected element',enum: ['click', 'double_click', 'right_click', 'hover', 'drag'],default: 'click',})@IsOptional()
  @IsString()
  interactionType?: string = 'click';@ApiPropertyOptional({description: 'Offset from element center for interaction',type: 'object',properties: {x: { type: 'number' },y: { type: 'number' },},})
  @IsOptional()
  @IsObject()
  interactionOffset?: {
    x: number;
    y: number;
  };

  @ApiPropertyOptional({
    description: 'Take screenshot after interaction',default: true,})
  @IsOptional()
  @IsBoolean()
  captureAfterInteraction?: boolean = true;

  @ApiPropertyOptional({
    description: 'Verify interaction success',default: true,})
  @IsOptional()
  @IsBoolean()
  verifyInteraction?: boolean = true;
}

/**
 * Image comparison request
 */
export class ImageComparisonDto {
  @ApiProperty({
    description: 'Browser session identifier',example: 'session_abc123',})@IsString()
  sessionId: string = '';@ApiProperty({description: 'Image comparison configuration',type: ImageComparisonConfigDto,})
  @ValidateNested()
  @Type(() => ImageComparisonConfigDto)
  comparisonConfig: ImageComparisonConfigDto = new ImageComparisonConfigDto();

  @ApiPropertyOptional({
    description: 'Specific screenshot region to compare',type: OCRRegionDto,})
  @IsOptional()
  @ValidateNested()
  @Type(() => OCRRegionDto)
  screenshotRegion?: OCRRegionDto;

  @ApiPropertyOptional({
    description: 'Return difference image',default: false,})
  @IsOptional()
  @IsBoolean()
  returnDifferenceImage?: boolean = false;

  @ApiPropertyOptional({
    description: 'Return similarity heatmap',default: false,})
  @IsOptional()
  @IsBoolean()
  returnHeatmap?: boolean = false;
}

/**
 * OCR text detection result
 */
export class OCRTextDetectionDto {
  @ApiProperty({
    description: 'Detected text content',})text: string = '';@ApiProperty({description: 'Detection confidence score',minimum: 0,maximum: 1,
  })
  confidence: number = 0;

  @ApiProperty({
    description: 'Text bounding box',type: 'object',properties: {x: { type: 'number' },y: { type: 'number' },width: { type: 'number' },height: { type: 'number' },},})
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } = { x: 0, y: 0, width: 0, height: 0 };

  @ApiPropertyOptional({
    description: 'Region label if extraction was region-specific',})regionLabel?: string;

  @ApiPropertyOptional({
    description: 'Detected language',enum: OCRLanguage,})
  detectedLanguage?: OCRLanguage;

  @ApiPropertyOptional({
    description: 'Character-level confidence scores',type: [Number],})
  characterConfidences?: number[];
}

/**
 * OCR extraction result
 */
export class OCRExtractionResultDto {
  @ApiProperty({
    description: 'Unique extraction identifier',example: 'ocr_xyz789',})extractionId: string = '';@ApiProperty({description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'Extraction success status',})success: boolean = false;

  @ApiProperty({
    description: 'Extraction start timestamp',})startedAt: Date = new Date();

  @ApiProperty({
    description: 'Extraction completion timestamp',})completedAt: Date = new Date();

  @ApiProperty({
    description: 'Extraction duration in milliseconds',})durationMs: number = 0;

  @ApiProperty({
    description: 'OCR engine used',enum: OCREngine,})
  ocrEngine: OCREngine = OCREngine.TESSERACT;

  @ApiProperty({
    description: 'Full extracted text content',})fullText: string = '';@ApiProperty({description: 'Individual text detections',type: [OCRTextDetectionDto],})
  textDetections: OCRTextDetectionDto[] = [];

  @ApiProperty({
    description: 'Overall extraction confidence',minimum: 0,maximum: 1,
  })
  overallConfidence: number = 0;

  @ApiProperty({
    description: 'Number of text blocks detected',})textBlocksDetected: number = 0;

  @ApiPropertyOptional({
    description: 'Region-specific extraction results',type: 'object',additionalProperties: {type: 'object',properties: {text: { type: 'string' },confidence: { type: 'number' },detections: { type: 'array', items: { $ref: '#/components/schemas/OCRTextDetectionDto' } },},},
  })
  regionResults?: Record<string, {
    text: string;
    confidence: number;
    detections: OCRTextDetectionDto[];
  }>;

  @ApiPropertyOptional({
    description: 'Error message if extraction failed',})errorMessage?: string;

  @ApiProperty({
    description: 'Image dimensions',type: 'object',properties: {width: { type: 'number' },height: { type: 'number' },},})
  imageDimensions: {
    width: number;
    height: number;
  } = { width: 0, height: 0 };

  @ApiPropertyOptional({
    description: 'Additional extraction metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Visual element detection result
 */
export class VisualElementDetectionResultDto {
  @ApiProperty({
    description: 'Unique detection identifier',example: 'visual_detection_xyz789',})detectionId: string = '';@ApiProperty({description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'Detection success status',})success: boolean = false;

  @ApiProperty({
    description: 'Visual element type detected',enum: VisualElementType,})
  elementType: VisualElementType = VisualElementType.BUTTON;

  @ApiProperty({
    description: 'Detection confidence score',minimum: 0,maximum: 1,
  })
  confidence: number = 0;

  @ApiProperty({
    description: 'Detected element location',type: 'object',properties: {x: { type: 'number' },y: { type: 'number' },width: { type: 'number' },height: { type: 'number' },},})
  location: {
    x: number;
    y: number;
    width: number;
    height: number;
  } = { x: 0, y: 0, width: 0, height: 0 };

  @ApiPropertyOptional({
    description: 'Detected text within element',})detectedText?: string;

  @ApiPropertyOptional({
    description: 'Element screenshot (base64)',})elementScreenshot?: string;

  @ApiPropertyOptional({
    description: 'Template matching result if used',type: 'object',properties: {matchScore: { type: 'number', minimum: 0, maximum: 1 },method: { type: 'string', enum: Object.values(TemplateMatchingMethod) },scaleUsed: { type: 'number' },},})
  templateMatchResult?: {
    matchScore: number;
    method: TemplateMatchingMethod;
    scaleUsed: number;
  };

  @ApiProperty({
    description: 'Detection start timestamp',})startedAt: Date = new Date();

  @ApiProperty({
    description: 'Detection completion timestamp',})completedAt: Date = new Date();

  @ApiProperty({
    description: 'Detection duration in milliseconds',})durationMs: number = 0;

  @ApiPropertyOptional({
    description: 'Error message if detection failed',})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional detection metadata',type: 'object',additionalProperties: true,})
  metadata?: Record<string, unknown>;
}

/**
 * Image comparison result
 */
export class ImageComparisonResultDto {
  @ApiProperty({
    description: 'Unique comparison identifier',example: 'comparison_xyz789',})comparisonId: string = '';@ApiProperty({description: 'Browser session identifier',example: 'session_abc123',})sessionId: string = '';@ApiProperty({description: 'Comparison success status',})success: boolean = false;

  @ApiProperty({
    description: 'Similarity score',minimum: 0,maximum: 1,
  })
  similarityScore: number = 0;

  @ApiProperty({
    description: 'Images match based on threshold',})isMatch: boolean = false;

  @ApiProperty({
    description: 'Comparison algorithm used',enum: ImageComparisonAlgorithm,})
  algorithm: ImageComparisonAlgorithm = ImageComparisonAlgorithm.STRUCTURAL_SIMILARITY;

  @ApiPropertyOptional({
    description: 'Difference regions',type: [Object],items: {
      type: 'object',properties: {x: { type: 'number' },y: { type: 'number' },width: { type: 'number' },height: { type: 'number' },severity: { type: 'number', minimum: 0, maximum: 1 },},},
  })
  differenceRegions?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    severity: number;
  }>;

  @ApiPropertyOptional({
    description: 'Difference image (base64)',})differenceImage?: string;

  @ApiPropertyOptional({
    description: 'Similarity heatmap (base64)',})similarityHeatmap?: string;

  @ApiProperty({
    description: 'Comparison start timestamp',})startedAt: Date = new Date();

  @ApiProperty({
    description: 'Comparison completion timestamp',})completedAt: Date = new Date();

  @ApiProperty({
    description: 'Comparison duration in milliseconds',})durationMs: number = 0;

  @ApiPropertyOptional({
    description: 'Error message if comparison failed',})errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional comparison metadata',type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}