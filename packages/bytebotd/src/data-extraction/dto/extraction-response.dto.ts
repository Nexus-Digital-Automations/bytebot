import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DataExtractionType, ExtractionOutputFormat } from './data-extraction.dto';

/**
 * Extracted table data structure
 */
export class ExtractedTableDto {
  @ApiProperty({
    description: 'Table headers',
    example: ['Name', 'Email', 'Status', 'Date']
  })
  headers: string[];

  @ApiProperty({
    description: 'Table rows data',
    example: [
      ['John Doe', 'john@example.com', 'Active', '2024-01-15'],
      ['Jane Smith', 'jane@example.com', 'Inactive', '2024-01-14']
    ]
  })
  rows: string[][];

  @ApiPropertyOptional({
    description: 'Table caption or title',
    example: 'User Management Table'
  })
  caption?: string;

  @ApiPropertyOptional({
    description: 'Number of rows extracted',
    example: 150
  })
  rowCount?: number;

  @ApiPropertyOptional({
    description: 'Number of columns extracted',
    example: 4
  })
  columnCount?: number;

  @ApiPropertyOptional({
    description: 'Table CSS selector used for extraction',
    example: '#userTable'
  })
  selector?: string;
}

/**
 * Extracted list data structure
 */
export class ExtractedListDto {
  @ApiProperty({
    description: 'List items',
    example: ['Item 1', 'Item 2', 'Item 3']
  })
  items: (string | ExtractedListDto)[];

  @ApiPropertyOptional({
    description: 'List type (ordered/unordered)',
    example: 'unordered'
  })
  listType?: 'ordered' | 'unordered';

  @ApiPropertyOptional({
    description: 'Number of items in list',
    example: 15
  })
  itemCount?: number;

  @ApiPropertyOptional({
    description: 'List CSS selector used for extraction',
    example: '.product-list'
  })
  selector?: string;

  @ApiPropertyOptional({
    description: 'Nested lists depth',
    example: 2
  })
  depth?: number;
}

/**
 * Extracted text data structure
 */
export class ExtractedTextDto {
  @ApiProperty({
    description: 'Extracted text content',
    example: 'This is the extracted text content from the page.'
  })
  content: string;

  @ApiPropertyOptional({
    description: 'Text length in characters',
    example: 1250
  })
  length?: number;

  @ApiPropertyOptional({
    description: 'Word count',
    example: 185
  })
  wordCount?: number;

  @ApiPropertyOptional({
    description: 'Text patterns found',
    example: ['email@example.com', 'phone: 555-123-4567']
  })
  patterns?: string[];

  @ApiPropertyOptional({
    description: 'Text formatting preserved',
    example: true
  })
  formattingPreserved?: boolean;

  @ApiPropertyOptional({
    description: 'Source element selector',
    example: '.article-content'
  })
  selector?: string;
}

/**
 * Extracted link data structure
 */
export class ExtractedLinkDto {
  @ApiProperty({
    description: 'Link URL',
    example: 'https://example.com/page'
  })
  url: string;

  @ApiPropertyOptional({
    description: 'Link text',
    example: 'Click here to learn more'
  })
  text?: string;

  @ApiPropertyOptional({
    description: 'Link title attribute',
    example: 'Learn more about our services'
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Link target attribute',
    example: '_blank'
  })
  target?: string;

  @ApiPropertyOptional({
    description: 'Link rel attribute',
    example: 'noopener noreferrer'
  })
  rel?: string;

  @ApiPropertyOptional({
    description: 'Whether link is internal',
    example: false
  })
  isInternal?: boolean;

  @ApiPropertyOptional({
    description: 'Additional link attributes',
    example: { 'data-tracking': 'homepage-link' }
  })
  attributes?: Record<string, string>;
}

/**
 * Extracted image data structure
 */
export class ExtractedImageDto {
  @ApiProperty({
    description: 'Image source URL',
    example: 'https://example.com/image.jpg'
  })
  src: string;

  @ApiPropertyOptional({
    description: 'Image alt text',
    example: 'Beautiful landscape photo'
  })
  alt?: string;

  @ApiPropertyOptional({
    description: 'Image title',
    example: 'Sunset over mountains'
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Image width',
    example: 800
  })
  width?: number;

  @ApiPropertyOptional({
    description: 'Image height',
    example: 600
  })
  height?: number;

  @ApiPropertyOptional({
    description: 'Image data as base64 (if requested)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...'
  })
  data?: string;

  @ApiPropertyOptional({
    description: 'Additional image attributes',
    example: { 'data-lazy': 'true', 'loading': 'lazy' }
  })
  attributes?: Record<string, string>;
}

/**
 * Extracted custom pattern data structure
 */
export class ExtractedCustomDataDto {
  @ApiProperty({
    description: 'Element selector',
    example: '.product-card'
  })
  selector: string;

  @ApiPropertyOptional({
    description: 'Element text content',
    example: 'Product Name - $29.99'
  })
  text?: string;

  @ApiPropertyOptional({
    description: 'Element HTML content',
    example: '<div class="product-card"><h3>Product Name</h3><span>$29.99</span></div>'
  })
  html?: string;

  @ApiPropertyOptional({
    description: 'Element attributes',
    example: { 'data-id': '12345', 'data-price': '29.99' }
  })
  attributes?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Child elements data',
    example: [{ selector: 'h3', text: 'Product Name' }]
  })
  children?: ExtractedCustomDataDto[];

  @ApiPropertyOptional({
    description: 'Element position',
    example: { x: 100, y: 200, width: 300, height: 150 }
  })
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Extraction metadata
 */
export class ExtractionMetadataDto {
  @ApiProperty({
    description: 'URL where data was extracted from',
    example: 'https://example.com/data'
  })
  sourceUrl: string;

  @ApiProperty({
    description: 'Page title',
    example: 'Data Page - Example Site'
  })
  pageTitle: string;

  @ApiProperty({
    description: 'Extraction timestamp',
    example: '2024-01-15T10:30:00.000Z'
  })
  timestamp: string;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 2500
  })
  processingTimeMs: number;

  @ApiPropertyOptional({
    description: 'User agent used for extraction',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  })
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Viewport dimensions',
    example: { width: 1920, height: 1080 }
  })
  viewport?: { width: number; height: number };

  @ApiPropertyOptional({
    description: 'Language detected on page',
    example: 'en-US'
  })
  language?: string;

  @ApiPropertyOptional({
    description: 'Character encoding',
    example: 'UTF-8'
  })
  encoding?: string;

  @ApiPropertyOptional({
    description: 'Content type',
    example: 'text/html'
  })
  contentType?: string;
}

/**
 * Data extraction response
 */
export class DataExtractionResponseDto {
  @ApiProperty({
    description: 'Whether extraction was successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Type of data that was extracted',
    enum: DataExtractionType,
    example: DataExtractionType.TABLE
  })
  extractionType: DataExtractionType;

  @ApiProperty({
    description: 'Output format of extracted data',
    enum: ExtractionOutputFormat,
    example: ExtractionOutputFormat.JSON
  })
  outputFormat: ExtractionOutputFormat;

  @ApiProperty({
    description: 'Number of items extracted',
    example: 45
  })
  itemCount: number;

  @ApiPropertyOptional({
    description: 'Extracted table data',
    type: [ExtractedTableDto]
  })
  tables?: ExtractedTableDto[];

  @ApiPropertyOptional({
    description: 'Extracted list data',
    type: [ExtractedListDto]
  })
  lists?: ExtractedListDto[];

  @ApiPropertyOptional({
    description: 'Extracted text data',
    type: [ExtractedTextDto]
  })
  texts?: ExtractedTextDto[];

  @ApiPropertyOptional({
    description: 'Extracted link data',
    type: [ExtractedLinkDto]
  })
  links?: ExtractedLinkDto[];

  @ApiPropertyOptional({
    description: 'Extracted image data',
    type: [ExtractedImageDto]
  })
  images?: ExtractedImageDto[];

  @ApiPropertyOptional({
    description: 'Extracted custom pattern data',
    type: [ExtractedCustomDataDto]
  })
  customData?: ExtractedCustomDataDto[];

  @ApiPropertyOptional({
    description: 'Raw extracted data in specified format',
    example: '{\n  "products": [\n    {"name": "Product 1", "price": "$29.99"}\n  ]\n}'
  })
  rawData?: string;

  @ApiProperty({
    description: 'Extraction metadata',
    type: ExtractionMetadataDto
  })
  metadata: ExtractionMetadataDto;

  @ApiPropertyOptional({
    description: 'Screenshot of the page',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  })
  screenshot?: string;

  @ApiPropertyOptional({
    description: 'Extraction warnings',
    example: ['Some dynamic content may not have been loaded', 'Rate limiting detected']
  })
  warnings?: string[];

  @ApiPropertyOptional({
    description: 'Error message if extraction failed',
    example: 'Unable to find specified selector on page'
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional extraction metadata',
    example: { 'totalPages': 5, 'currentPage': 1, 'hasMore': true }
  })
  additionalMetadata?: Record<string, any>;
}

/**
 * Multi-extraction response
 */
export class MultiExtractionResponseDto {
  @ApiProperty({
    description: 'Whether all extractions were successful',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Number of extraction operations performed',
    example: 3
  })
  extractionCount: number;

  @ApiProperty({
    description: 'Number of successful extractions',
    example: 3
  })
  successfulExtractions: number;

  @ApiProperty({
    description: 'Number of failed extractions',
    example: 0
  })
  failedExtractions: number;

  @ApiProperty({
    description: 'Individual extraction results',
    type: [DataExtractionResponseDto]
  })
  results: DataExtractionResponseDto[];

  @ApiProperty({
    description: 'Total processing time in milliseconds',
    example: 5200
  })
  totalProcessingTimeMs: number;

  @ApiPropertyOptional({
    description: 'Combined extraction metadata',
    type: ExtractionMetadataDto
  })
  combinedMetadata?: ExtractionMetadataDto;

  @ApiPropertyOptional({
    description: 'Global warnings',
    example: ['Page required authentication', 'Some content loaded dynamically']
  })
  warnings?: string[];

  @ApiPropertyOptional({
    description: 'Extraction summary statistics',
    example: {
      'totalItems': 150,
      'tablesExtracted': 2,
      'listsExtracted': 5,
      'linksExtracted': 25
    }
  })
  summary?: Record<string, any>;
}