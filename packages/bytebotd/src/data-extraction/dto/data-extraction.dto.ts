import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';import { IsString, IsObject, IsOptional, IsBoolean, IsArray, IsEnum, IsNumber, ValidateNested } from 'class-validator';import { Type } from 'class-transformer';/*** Data extraction types supported by the system
 */
export enum DataExtractionType {
  TABLE = 'table',LIST = 'list',TEXT = 'text',LINKS = 'links',IMAGES = 'images',FORMS = 'forms',STRUCTURED_DATA = 'structured_data',CUSTOM_PATTERN = 'custom_pattern',PAGE_CONTENT = 'page_content',METADATA = 'metadata'}/**
 * Data extraction output formats
 */
export enum ExtractionOutputFormat {
  JSON = 'json',CSV = 'csv',XML = 'xml',YAML = 'yaml',PLAIN_TEXT = 'plain_text',HTML = 'html'}/**
 * Table extraction configuration
 */
export class TableExtractionConfigDto {
  @ApiPropertyOptional({
    description: 'Include table headers',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  includeHeaders?: boolean;

  @ApiPropertyOptional({
    description: 'Skip empty rows',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  skipEmptyRows?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of rows to extract',example: 1000})
  @IsOptional()
  @IsNumber()
  maxRows?: number;

  @ApiPropertyOptional({
    description: 'Column indices to extract (0-based)',example: [0, 2, 4]})
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  columnIndices?: number[];

  @ApiPropertyOptional({
    description: 'Column names to extract',example: ['Name', 'Email', 'Status']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  columnNames?: string[];
}

/**
 * List extraction configuration
 */
export class ListExtractionConfigDto {
  @ApiPropertyOptional({
    description: 'Extract nested lists',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  includeNested?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum depth for nested lists',example: 3,default: 1
  })
  @IsOptional()
  @IsNumber()
  maxDepth?: number;

  @ApiPropertyOptional({
    description: 'Extract list item attributes',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  includeAttributes?: boolean;

  @ApiPropertyOptional({
    description: 'Filter list items by pattern',example: '^Product:'})@IsOptional()
  @IsString()
  filterPattern?: string;
}

/**
 * Text extraction configuration
 */
export class TextExtractionConfigDto {
  @ApiPropertyOptional({
    description: 'Preserve text formatting',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  preserveFormatting?: boolean;

  @ApiPropertyOptional({
    description: 'Extract only visible text',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  visibleOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Minimum text length to extract',example: 10,default: 1
  })
  @IsOptional()
  @IsNumber()
  minLength?: number;

  @ApiPropertyOptional({
    description: 'Maximum text length to extract',example: 5000})
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({
    description: 'Text patterns to extract (regex)',example: ['\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  patterns?: string[];
}

/**
 * Link extraction configuration
 */
export class LinkExtractionConfigDto {
  @ApiPropertyOptional({
    description: 'Include internal links only',example: false,default: false
  })
  @IsOptional()
  @IsBoolean()
  internalOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Include external links only',example: false,default: false
  })
  @IsOptional()
  @IsBoolean()
  externalOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Extract link text',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  includeLinkText?: boolean;

  @ApiPropertyOptional({
    description: 'Extract link attributes',example: ['title', 'target', 'rel']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeAttributes?: string[];

  @ApiPropertyOptional({
    description: 'Filter links by URL pattern',example: '^https://example\\.com'})@IsOptional()
  @IsString()
  urlFilter?: string;
}

/**
 * Image extraction configuration
 */
export class ImageExtractionConfigDto {
  @ApiPropertyOptional({
    description: 'Include image data (base64)',example: false,default: false
  })
  @IsOptional()
  @IsBoolean()
  includeImageData?: boolean;

  @ApiPropertyOptional({
    description: 'Include image attributes',example: ['alt', 'title', 'width', 'height']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeAttributes?: string[];

  @ApiPropertyOptional({
    description: 'Minimum image dimensions (width x height)',example: { width: 100, height: 100 }})
  @IsOptional()
  @IsObject()
  minDimensions?: { width: number; height: number };

  @ApiPropertyOptional({
    description: 'Maximum image dimensions (width x height)',example: { width: 2000, height: 2000 }})
  @IsOptional()
  @IsObject()
  maxDimensions?: { width: number; height: number };
}

/**
 * Custom pattern extraction configuration
 */
export class CustomPatternConfigDto {
  @ApiProperty({
    description: 'CSS selector for elements to extract',example: '.product-card'})@IsString()
  selector: string;

  @ApiPropertyOptional({
    description: 'Attributes to extract from elements',example: ['data-id', 'data-price', 'data-name']})@IsOptional()
  @IsArray()
  @IsString({ each: true })
  attributes?: string[];

  @ApiPropertyOptional({
    description: 'Extract element text content',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  includeText?: boolean;

  @ApiPropertyOptional({
    description: 'Extract element HTML content',example: false,default: false
  })
  @IsOptional()
  @IsBoolean()
  includeHtml?: boolean;

  @ApiPropertyOptional({
    description: 'Extract child elements',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  includeChildren?: boolean;
}

/**
 * Data extraction configuration
 */
export class DataExtractionConfigDto {
  @ApiPropertyOptional({
    description: 'Timeout for extraction operations in milliseconds',example: 30000,default: 30000
  })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Whether to take screenshots during extraction',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  captureScreenshots?: boolean;

  @ApiPropertyOptional({
    description: 'Output format for extracted data',enum: ExtractionOutputFormat,example: ExtractionOutputFormat.JSON,
    default: ExtractionOutputFormat.JSON
  })
  @IsOptional()
  @IsEnum(ExtractionOutputFormat)
  outputFormat?: ExtractionOutputFormat;

  @ApiPropertyOptional({
    description: 'Maximum number of items to extract',example: 1000})
  @IsOptional()
  @IsNumber()
  maxItems?: number;

  @ApiPropertyOptional({
    description: 'Include extraction metadata',example: true,default: true
  })
  @IsOptional()
  @IsBoolean()
  includeMetadata?: boolean;

  @ApiPropertyOptional({
    description: 'Wait for dynamic content loading',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  waitForDynamicContent?: boolean;

  @ApiPropertyOptional({
    description: 'Scroll to load more content',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  scrollToLoad?: boolean;
}

/**
 * Base data extraction action DTO
 */
export class DataExtractionDto {
  @ApiProperty({
    description: 'Type of data to extract',enum: DataExtractionType,example: DataExtractionType.TABLE
  })
  @IsEnum(DataExtractionType)
  extractionType: DataExtractionType;

  @ApiPropertyOptional({
    description: 'CSS selector for target element(s)',example: '#dataTable, .product-list, .article-content'})@IsOptional()
  @IsString()
  selector?: string;

  @ApiPropertyOptional({
    description: 'Page URL to extract data from',example: 'https://example.com/data'})@IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'General extraction configuration',type: DataExtractionConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => DataExtractionConfigDto)
  config?: DataExtractionConfigDto;

  @ApiPropertyOptional({
    description: 'Table-specific extraction configuration',type: TableExtractionConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => TableExtractionConfigDto)
  tableConfig?: TableExtractionConfigDto;

  @ApiPropertyOptional({
    description: 'List-specific extraction configuration',type: ListExtractionConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => ListExtractionConfigDto)
  listConfig?: ListExtractionConfigDto;

  @ApiPropertyOptional({
    description: 'Text-specific extraction configuration',type: TextExtractionConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => TextExtractionConfigDto)
  textConfig?: TextExtractionConfigDto;

  @ApiPropertyOptional({
    description: 'Link-specific extraction configuration',type: LinkExtractionConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => LinkExtractionConfigDto)
  linkConfig?: LinkExtractionConfigDto;

  @ApiPropertyOptional({
    description: 'Image-specific extraction configuration',type: ImageExtractionConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => ImageExtractionConfigDto)
  imageConfig?: ImageExtractionConfigDto;

  @ApiPropertyOptional({
    description: 'Custom pattern extraction configuration',type: CustomPatternConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomPatternConfigDto)
  customConfig?: CustomPatternConfigDto;

  @ApiPropertyOptional({
    description: 'Additional metadata for the operation',example: { sessionId: 'abc123', extractionId: 'extract456' }})@IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Multi-selector data extraction DTO
 */
export class MultiSelectorExtractionDto {
  @ApiProperty({
    description: 'Multiple extraction operations to perform',type: [DataExtractionDto]})
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DataExtractionDto)
  extractions: DataExtractionDto[];

  @ApiPropertyOptional({
    description: 'Page URL to extract data from (applies to all extractions)',example: 'https://example.com/data'})@IsOptional()
  @IsString()
  url?: string;

  @ApiPropertyOptional({
    description: 'Global extraction configuration',type: DataExtractionConfigDto})
  @IsOptional()
  @ValidateNested()
  @Type(() => DataExtractionConfigDto)
  globalConfig?: DataExtractionConfigDto;

  @ApiPropertyOptional({
    description: 'Whether to execute extractions in parallel',example: true,default: false
  })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata for the operation',example: { sessionId: 'abc123', batchId: 'batch456' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}