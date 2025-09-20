import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsNumber,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Data extraction output formats
 */
export enum ExtractionFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  TEXT = 'text',
}

/**
 * Table extraction configuration
 */
export class TableExtractionConfig {
  @ApiProperty({
    description: 'CSS selector for the table element',
    example: 'table.data-table',
  })
  @IsString()
  selector: string;

  @ApiPropertyOptional({
    description: 'Include table headers',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeHeaders?: boolean = true;

  @ApiPropertyOptional({
    description: 'Column mapping for renamed headers',
    example: { 'Full Name': 'name', 'Email Address': 'email' },
  })
  @IsOptional()
  @IsObject()
  columnMapping?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Maximum number of rows to extract',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  maxRows?: number;

  @ApiPropertyOptional({
    description: 'Skip empty rows',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  skipEmptyRows?: boolean = true;
}

/**
 * Text extraction configuration
 */
export class TextExtractionConfig {
  @ApiProperty({
    description: 'CSS selectors for text extraction',
    example: ['h1', '.content', 'p'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  selectors: string[];

  @ApiPropertyOptional({
    description: 'Include element attributes',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeAttributes?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include element metadata (tag, class, id)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean = true;

  @ApiPropertyOptional({
    description: 'Clean text (remove extra whitespace)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  cleanText?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum text length per element',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50000)
  maxTextLength?: number;
}

/**
 * Link extraction configuration
 */
export class LinkExtractionConfig {
  @ApiPropertyOptional({
    description: 'CSS selector for link container',
    example: 'nav, .menu, .links',
  })
  @IsOptional()
  @IsString()
  containerSelector?: string;

  @ApiPropertyOptional({
    description: 'Include external links',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeExternal?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include internal links',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeInternal?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include link metadata (title, rel, target)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean = true;

  @ApiPropertyOptional({
    description: 'Filter links by pattern (regex)',
    example: '^https://example\\.com.*',
  })
  @IsOptional()
  @IsString()
  filterPattern?: string;

  @ApiPropertyOptional({
    description: 'Exclude links by pattern (regex)',
    example: '\\.(pdf|doc|zip)$',
  })
  @IsOptional()
  @IsString()
  excludePattern?: string;
}

/**
 * Image extraction configuration
 */
export class ImageExtractionConfig {
  @ApiPropertyOptional({
    description: 'CSS selector for image container',
    example: '.gallery, .images, main',
  })
  @IsOptional()
  @IsString()
  containerSelector?: string;

  @ApiPropertyOptional({
    description: 'Include image metadata (alt, title, dimensions)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include data URLs (base64 images)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeDataUrls?: boolean = false;

  @ApiPropertyOptional({
    description: 'Minimum image dimensions (width x height)',
    example: { width: 100, height: 100 },
  })
  @IsOptional()
  @IsObject()
  minDimensions?: { width: number; height: number };

  @ApiPropertyOptional({
    description: 'Filter images by file extension',
    example: ['jpg', 'png', 'webp'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileExtensions?: string[];
}

/**
 * Generic extraction request DTO
 */
export class ExtractionRequestDto {
  @ApiProperty({
    description: 'Browser session ID',
    example: 'session_123456789',
  })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Output format for extracted data',
    enum: ExtractionFormat,
    default: ExtractionFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ExtractionFormat)
  format?: ExtractionFormat = ExtractionFormat.JSON;

  @ApiPropertyOptional({
    description: 'Wait for this selector before extraction',
    example: '.data-loaded',
  })
  @IsOptional()
  @IsString()
  waitForSelector?: string;

  @ApiPropertyOptional({
    description: 'Timeout in milliseconds',
    example: 30000,
    default: 30000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number = 30000;
}

/**
 * Text extraction request DTO
 */
export class TextExtractionRequestDto extends ExtractionRequestDto {
  @ApiProperty({
    description: 'Text extraction configuration',
    type: TextExtractionConfig,
  })
  @ValidateNested()
  @Type(() => TextExtractionConfig)
  config: TextExtractionConfig;
}

/**
 * Table extraction request DTO
 */
export class TableExtractionRequestDto extends ExtractionRequestDto {
  @ApiProperty({
    description: 'Table extraction configuration',
    type: TableExtractionConfig,
  })
  @ValidateNested()
  @Type(() => TableExtractionConfig)
  config: TableExtractionConfig;
}

/**
 * Link extraction request DTO
 */
export class LinkExtractionRequestDto extends ExtractionRequestDto {
  @ApiPropertyOptional({
    description: 'Link extraction configuration',
    type: LinkExtractionConfig,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LinkExtractionConfig)
  config?: LinkExtractionConfig = new LinkExtractionConfig();
}

/**
 * Image extraction request DTO
 */
export class ImageExtractionRequestDto extends ExtractionRequestDto {
  @ApiPropertyOptional({
    description: 'Image extraction configuration',
    type: ImageExtractionConfig,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageExtractionConfig)
  config?: ImageExtractionConfig = new ImageExtractionConfig();
}

/**
 * Structured data extraction request DTO
 */
export class StructuredDataExtractionRequestDto extends ExtractionRequestDto {
  @ApiPropertyOptional({
    description: 'JSON-LD script selectors',
    example: ['script[type="application/ld+json"]'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jsonLdSelectors?: string[];

  @ApiPropertyOptional({
    description: 'Microdata selectors',
    example: ['[itemscope]'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  microdataSelectors?: string[];

  @ApiPropertyOptional({
    description: 'OpenGraph meta selectors',
    example: ['meta[property^="og:"]'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  openGraphSelectors?: string[];
}

/**
 * XPath extraction request DTO
 */
export class XPathExtractionRequestDto extends ExtractionRequestDto {
  @ApiProperty({
    description: 'XPath expressions for extraction',
    example: ['//h1/text()', '//a/@href', '//img/@src'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  xpaths: string[];

  @ApiPropertyOptional({
    description: 'Extract as attributes vs text content',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  extractAttributes?: boolean = false;
}

/**
 * Batch extraction request DTO
 */
export class BatchExtractionRequestDto extends ExtractionRequestDto {
  @ApiProperty({
    description: 'Array of extraction operations',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: TextExtractionConfig, name: 'text' },
        { value: TableExtractionConfig, name: 'table' },
        { value: LinkExtractionConfig, name: 'links' },
        { value: ImageExtractionConfig, name: 'images' },
      ],
    },
  })
  operations: Array<{
    type: 'text' | 'table' | 'links' | 'images';
    name: string;
    config: TextExtractionConfig | TableExtractionConfig | LinkExtractionConfig | ImageExtractionConfig;
  }>;
}

/**
 * Extracted text data
 */
export interface ExtractedTextData {
  selector: string;
  text: string;
  attributes?: Record<string, string>;
  metadata?: {
    tagName: string;
    className?: string;
    id?: string;
    position: number;
  };
}

/**
 * Extracted table data
 */
export interface ExtractedTableData {
  headers: string[];
  rows: Record<string, string | number>[];
  metadata: {
    rowCount: number;
    columnCount: number;
    selector: string;
  };
}

/**
 * Extracted link data
 */
export interface ExtractedLinkData {
  url: string;
  text: string;
  type: 'internal' | 'external';
  metadata?: {
    title?: string;
    rel?: string;
    target?: string;
    position: number;
  };
}

/**
 * Extracted image data
 */
export interface ExtractedImageData {
  src: string;
  alt?: string;
  metadata?: {
    title?: string;
    width?: number;
    height?: number;
    fileSize?: number;
    format?: string;
    position: number;
  };
}

/**
 * Structured data extraction result
 */
export interface ExtractedStructuredData {
  jsonLd: Record<string, unknown>[];
  microdata: Record<string, unknown>[];
  openGraph: Record<string, string>;
  metadata: {
    jsonLdCount: number;
    microdataCount: number;
    openGraphCount: number;
  };
}

/**
 * XPath extraction result
 */
export interface ExtractedXPathData {
  xpath: string;
  results: (string | number)[];
  count: number;
}

/**
 * Generic extraction response DTO
 */
export class ExtractionResponseDto {
  @ApiProperty({
    description: 'Extraction success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Extraction timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Extraction execution time in milliseconds',
    example: 1250,
  })
  executionTime: number;

  @ApiProperty({
    description: 'Session ID used for extraction',
    example: 'session_123456789',
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Extraction error message if failed',
    example: 'Selector not found',
  })
  error?: string;
}

/**
 * Text extraction response DTO
 */
export class TextExtractionResponseDto extends ExtractionResponseDto {
  @ApiProperty({
    description: 'Extracted text data',
    type: [Object],
  })
  data: ExtractedTextData[];

  @ApiProperty({
    description: 'Extraction metadata',
  })
  metadata: {
    totalElements: number;
    selectors: string[];
    totalTextLength: number;
  };
}

/**
 * Table extraction response DTO
 */
export class TableExtractionResponseDto extends ExtractionResponseDto {
  @ApiProperty({
    description: 'Extracted table data',
  })
  data: ExtractedTableData;

  @ApiPropertyOptional({
    description: 'CSV formatted data if format=csv',
  })
  csv?: string;
}

/**
 * Link extraction response DTO
 */
export class LinkExtractionResponseDto extends ExtractionResponseDto {
  @ApiProperty({
    description: 'Extracted link data',
    type: [Object],
  })
  data: ExtractedLinkData[];

  @ApiProperty({
    description: 'Extraction metadata',
  })
  metadata: {
    totalLinks: number;
    internalLinks: number;
    externalLinks: number;
    domains: string[];
  };
}

/**
 * Image extraction response DTO
 */
export class ImageExtractionResponseDto extends ExtractionResponseDto {
  @ApiProperty({
    description: 'Extracted image data',
    type: [Object],
  })
  data: ExtractedImageData[];

  @ApiProperty({
    description: 'Extraction metadata',
  })
  metadata: {
    totalImages: number;
    formats: string[];
    averageDimensions?: { width: number; height: number };
  };
}

/**
 * Structured data extraction response DTO
 */
export class StructuredDataExtractionResponseDto extends ExtractionResponseDto {
  @ApiProperty({
    description: 'Extracted structured data',
  })
  data: ExtractedStructuredData;
}

/**
 * XPath extraction response DTO
 */
export class XPathExtractionResponseDto extends ExtractionResponseDto {
  @ApiProperty({
    description: 'XPath extraction results',
    type: [Object],
  })
  data: ExtractedXPathData[];

  @ApiProperty({
    description: 'Extraction metadata',
  })
  metadata: {
    totalExpressions: number;
    totalResults: number;
    successfulExpressions: number;
  };
}

/**
 * Batch extraction response DTO
 */
export class BatchExtractionResponseDto extends ExtractionResponseDto {
  @ApiProperty({
    description: 'Batch extraction results',
  })
  data: Record<string, {
    type: string;
    success: boolean;
    data: unknown;
    error?: string;
  }>;

  @ApiProperty({
    description: 'Batch extraction metadata',
  })
  metadata: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    operationResults: Record<string, boolean>;
  };
}