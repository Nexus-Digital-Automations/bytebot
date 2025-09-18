/**
 * Browser Data Extraction DTOs
 *
 * Data Transfer Objects for extracting structured data from web pages
 * using AI-powered extraction, CSS selectors, or custom extraction rules.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsBoolean,
  ValidateNested,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ExtractionMethod {
  AI_QUERY = 'ai_query',
  CSS_SELECTORS = 'css_selectors',
  XPATH_SELECTORS = 'xpath_selectors',
  REGEX_PATTERNS = 'regex_patterns',
  STRUCTURED_DATA = 'structured_data', // JSON-LD, microdata, etc.
}

export enum OutputFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
  PLAIN_TEXT = 'plain_text',
}

export class ExtractionRule {
  @ApiProperty({ description: 'Field name for extracted data' })
  @IsString()
  @MinLength(1)
  fieldName!: string;

  @ApiProperty({ description: 'CSS selector for data extraction' })
  @IsOptional()
  @IsString()
  selector?: string;

  @ApiProperty({ description: 'XPath selector for data extraction' })
  @IsOptional()
  @IsString()
  xpath?: string;

  @ApiProperty({ description: 'Regular expression pattern' })
  @IsOptional()
  @IsString()
  regex?: string;

  @ApiPropertyOptional({ description: 'Attribute to extract from element' })
  @IsOptional()
  @IsString()
  attribute?: string; // text, href, src, title, etc.

  @ApiPropertyOptional({ description: 'Data transformation rules' })
  @IsOptional()
  @IsObject()
  transform?: {
    trim?: boolean;
    lowercase?: boolean;
    uppercase?: boolean;
    removeHtml?: boolean;
    parseNumber?: boolean;
    parseDate?: boolean;
    replacePattern?: { pattern: string; replacement: string };
  };

  @ApiPropertyOptional({ description: 'Whether field is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Default value if extraction fails' })
  @IsOptional()
  @IsString()
  defaultValue?: string;
}

export class ExtractDataDto {
  @ApiPropertyOptional({
    description: 'Extraction method to use',
    enum: ExtractionMethod,
    default: ExtractionMethod.AI_QUERY,
  })
  @IsOptional()
  @IsEnum(ExtractionMethod)
  method?: ExtractionMethod = ExtractionMethod.AI_QUERY;

  @ApiPropertyOptional({
    description: 'AI query for data extraction (for AI_QUERY method)',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  query?: string;

  @ApiPropertyOptional({
    description: 'Extraction rules (for selector-based methods)',
    type: [ExtractionRule],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractionRule)
  rules?: ExtractionRule[];

  @ApiPropertyOptional({
    description: 'Output format for extracted data',
    enum: OutputFormat,
    default: OutputFormat.JSON,
  })
  @IsOptional()
  @IsEnum(OutputFormat)
  outputFormat?: OutputFormat = OutputFormat.JSON;

  @ApiPropertyOptional({
    description: 'Include links in extraction',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeLinks?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include images in extraction',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeImages?: boolean = false;

  @ApiPropertyOptional({
    description: 'Include metadata in extraction',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean = true;

  @ApiPropertyOptional({
    description: 'Maximum number of items to extract',
    default: 100,
  })
  @IsOptional()
  @IsBoolean()
  maxItems?: number = 100;

  @ApiPropertyOptional({
    description: 'CSS selector to limit extraction scope',
  })
  @IsOptional()
  @IsString()
  scopeSelector?: string;

  @ApiPropertyOptional({
    description: 'Wait for dynamic content before extraction',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  waitForDynamicContent?: boolean = true;

  @ApiPropertyOptional({
    description: 'Extraction timeout in seconds',
    default: 30,
  })
  @IsOptional()
  @IsBoolean()
  timeoutSeconds?: number = 30;
}

export class ExtractedDataItem {
  @ApiProperty({ description: 'Extracted field values' })
  data!: Record<string, any>;

  @ApiProperty({ description: 'Source element information' })
  source!: {
    selector?: string;
    xpath?: string;
    tagName: string;
    textContent: string;
    attributes: Record<string, string>;
  };

  @ApiProperty({ description: 'Extraction confidence score (0-1)' })
  confidence!: number;

  @ApiProperty({ description: 'Item index in extraction results' })
  index!: number;
}

export class DataExtractionResponseDto {
  @ApiProperty({ description: 'Whether extraction was successful' })
  success!: boolean;

  @ApiProperty({
    description: 'Extraction method used',
    enum: ExtractionMethod,
  })
  method!: ExtractionMethod;

  @ApiProperty({ description: 'Output format', enum: OutputFormat })
  outputFormat!: OutputFormat;

  @ApiProperty({ description: 'Number of items extracted' })
  itemsExtracted!: number;

  @ApiProperty({
    description: 'Extracted data items',
    type: [ExtractedDataItem],
  })
  extractedData!: ExtractedDataItem[];

  @ApiProperty({ description: 'Raw extracted data in requested format' })
  rawData!: string;

  @ApiProperty({ description: 'Page metadata' })
  pageMetadata!: {
    url: string;
    title: string;
    description?: string;
    keywords?: string[];
    author?: string;
    publishedDate?: Date;
    modifiedDate?: Date;
    language?: string;
    canonicalUrl?: string;
    ogTags?: Record<string, string>;
    twitterTags?: Record<string, string>;
    structuredData?: any[];
  };

  @ApiProperty({ description: 'Extraction statistics' })
  statistics!: {
    totalElements: number;
    processedElements: number;
    matchedElements: number;
    extractionTimeMs: number;
    aiProcessingTimeMs?: number;
    dataQualityScore: number; // 0-1
  };

  @ApiProperty({ description: 'Links found during extraction' })
  links?: Array<{
    text: string;
    href: string;
    title?: string;
    rel?: string;
    target?: string;
  }>;

  @ApiProperty({ description: 'Images found during extraction' })
  images?: Array<{
    src: string;
    alt?: string;
    title?: string;
    width?: number;
    height?: number;
  }>;

  @ApiProperty({ description: 'Extraction timestamp' })
  timestamp!: Date;

  @ApiProperty({ description: 'Screenshot after extraction (base64)' })
  screenshot?: string;

  @ApiProperty({ description: 'Error information if extraction failed' })
  error?: {
    code: string;
    message: string;
    failedRules?: string[];
    details?: any;
  };

  @ApiProperty({ description: 'Warnings encountered during extraction' })
  warnings?: string[];
}

// Type aliases for backward compatibility
export type BrowserDataDto = ExtractDataDto;
