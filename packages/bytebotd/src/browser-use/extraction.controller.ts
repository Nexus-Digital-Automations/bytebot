import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ExtractionService } from './extraction.service';
import {
  TextExtractionRequestDto,
  TableExtractionRequestDto,
  LinkExtractionRequestDto,
  ImageExtractionRequestDto,
  StructuredDataExtractionRequestDto,
  XPathExtractionRequestDto,
  BatchExtractionRequestDto,
  TextExtractionResponseDto,
  TableExtractionResponseDto,
  LinkExtractionResponseDto,
  ImageExtractionResponseDto,
  StructuredDataExtractionResponseDto,
  XPathExtractionResponseDto,
  BatchExtractionResponseDto,
} from './dto/data-extraction.dto';

/**
 * Data Extraction Controller
 *
 * REST API endpoints for comprehensive web page data extraction.
 * Provides specialized endpoints for different types of data extraction
 * including text, tables, links, images, structured data, and XPath queries.
 *
 * Key Features:
 * - Text content extraction with custom selectors
 * - Table data extraction with CSV/JSON output formats
 * - Link extraction with internal/external filtering
 * - Image extraction with metadata and dimensions
 * - Structured data parsing (JSON-LD, Microdata, OpenGraph)
 * - XPath query support for complex element selection
 * - Batch extraction operations for multiple data types
 * - Data transformation and formatting options
 * - Comprehensive error handling and validation
 *
 * Security Features:
 * - Input validation for all extraction parameters
 * - Timeout controls to prevent hung operations
 * - Resource limits for large data sets
 * - Safe Python script execution with cleanup
 *
 * Performance Features:
 * - Concurrent extraction operations
 * - Optimized selector strategies
 * - Memory-efficient data processing
 * - Execution time monitoring
 */
@ApiTags('Data Extraction')
@Controller('browser/extract')
export class ExtractionController {
  private readonly logger = new Logger(ExtractionController.name);

  constructor(private readonly extractionService: ExtractionService) {}

  /**
   * Extract text content from page using CSS selectors
   */
  @Post('text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract text content',
    description: `
Extract text content from web page elements using CSS selectors.
Supports multiple selectors, text cleaning, metadata extraction, and content length limits.

Features:
- Multiple CSS selector support
- Text content cleaning and normalization
- Element metadata extraction (tag, class, id)
- Attribute extraction for accessibility data
- Position tracking for element ordering
- Content length limits for performance
- Custom wait conditions for dynamic content

Use cases:
- Article content extraction
- Navigation menu text extraction
- Form label and help text extraction
- Product description and review extraction
- SEO content analysis and optimization
`,
  })
  @ApiBody({
    type: TextExtractionRequestDto,
    description: 'Text extraction configuration',
    examples: {
      basic: {
        summary: 'Basic text extraction',
        description: 'Extract headings and paragraphs from a page',
        value: {
          sessionId: 'session_123456789',
          config: {
            selectors: ['h1', 'h2', 'p', '.content'],
            includeMetadata: true,
            cleanText: true,
          },
          format: 'json',
          timeout: 30000,
        },
      },
      advanced: {
        summary: 'Advanced text extraction with attributes',
        description: 'Extract text with attributes and length limits',
        value: {
          sessionId: 'session_123456789',
          config: {
            selectors: ['[data-content]', '.article-text', 'blockquote'],
            includeAttributes: true,
            includeMetadata: true,
            cleanText: true,
            maxTextLength: 500,
          },
          format: 'json',
          waitForSelector: '.content-loaded',
          timeout: 45000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Text content extracted successfully',
    type: TextExtractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid extraction configuration',
  })
  @ApiResponse({
    status: 500,
    description: 'Text extraction failed',
  })
  async extractText(@Body() dto: TextExtractionRequestDto): Promise<TextExtractionResponseDto> {
    this.logger.log(`Text extraction request for session: ${dto.sessionId}`, {
      sessionId: dto.sessionId,
      selectorCount: dto.config.selectors.length,
      format: dto.format,
      waitForSelector: dto.waitForSelector,
    });

    try {
      const result = await this.extractionService.extractText(
        dto.sessionId,
        dto.config,
        dto.waitForSelector,
        dto.timeout,
        dto.format,
      );

      this.logger.log(`Text extraction completed for session: ${dto.sessionId}`, {
        sessionId: dto.sessionId,
        success: result.success,
        elementCount: result.data.length,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Text extraction failed for session: ${dto.sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Text extraction failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract table data with support for CSV/JSON output formats
   */
  @Post('table')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract table data',
    description: `
Extract structured table data from HTML tables with advanced formatting options.
Supports header extraction, column mapping, row limits, and multiple output formats.

Features:
- HTML table structure parsing
- Header row detection and extraction
- Column mapping for renamed headers
- Row filtering and limits for performance
- Empty row detection and skipping
- Data type conversion (numbers, text)
- CSV and JSON output formats
- Custom wait conditions for dynamic tables

Use cases:
- Data table scraping for analysis
- Price comparison table extraction
- Product specification table parsing
- Financial data table extraction
- Sports statistics and league tables
`,
  })
  @ApiBody({
    type: TableExtractionRequestDto,
    description: 'Table extraction configuration',
    examples: {
      basic: {
        summary: 'Basic table extraction',
        description: 'Extract data from a simple table',
        value: {
          sessionId: 'session_123456789',
          config: {
            selector: 'table.data-table',
            includeHeaders: true,
            skipEmptyRows: true,
          },
          format: 'json',
          timeout: 30000,
        },
      },
      advanced: {
        summary: 'Advanced table extraction with mapping',
        description: 'Extract table with column mapping and limits',
        value: {
          sessionId: 'session_123456789',
          config: {
            selector: '#products-table',
            includeHeaders: true,
            columnMapping: {
              'Product Name': 'name',
              'Price ($)': 'price',
              'In Stock': 'available',
            },
            maxRows: 100,
            skipEmptyRows: true,
          },
          format: 'csv',
          waitForSelector: '.table-loaded',
          timeout: 45000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Table data extracted successfully',
    type: TableExtractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid table extraction configuration',
  })
  @ApiResponse({
    status: 500,
    description: 'Table extraction failed',
  })
  async extractTable(@Body() dto: TableExtractionRequestDto): Promise<TableExtractionResponseDto> {
    this.logger.log(`Table extraction request for session: ${dto.sessionId}`, {
      sessionId: dto.sessionId,
      selector: dto.config.selector,
      format: dto.format,
      includeHeaders: dto.config.includeHeaders,
      maxRows: dto.config.maxRows,
    });

    try {
      const result = await this.extractionService.extractTable(
        dto.sessionId,
        dto.config,
        dto.waitForSelector,
        dto.timeout,
        dto.format,
      );

      this.logger.log(`Table extraction completed for session: ${dto.sessionId}`, {
        sessionId: dto.sessionId,
        success: result.success,
        rowCount: result.data.metadata.rowCount,
        columnCount: result.data.metadata.columnCount,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Table extraction failed for session: ${dto.sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Table extraction failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract all links from page with filtering options
   */
  @Post('links')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract page links',
    description: `
Extract all links from a web page with advanced filtering and categorization.
Supports internal/external link detection, pattern filtering, and metadata extraction.

Features:
- Internal vs external link classification
- Container-scoped link extraction
- Regex pattern filtering (include/exclude)
- Link metadata extraction (title, rel, target)
- URL resolution for relative links
- Domain analysis and categorization
- Position tracking for link ordering
- Custom wait conditions for dynamic navigation

Use cases:
- Website navigation analysis
- Broken link detection and monitoring
- SEO link audit and optimization
- Competitor link analysis
- Site architecture mapping
`,
  })
  @ApiBody({
    type: LinkExtractionRequestDto,
    description: 'Link extraction configuration',
    examples: {
      basic: {
        summary: 'Basic link extraction',
        description: 'Extract all links from a page',
        value: {
          sessionId: 'session_123456789',
          config: {
            includeInternal: true,
            includeExternal: true,
            includeMetadata: true,
          },
          timeout: 30000,
        },
      },
      filtered: {
        summary: 'Filtered link extraction',
        description: 'Extract links with pattern filtering',
        value: {
          sessionId: 'session_123456789',
          config: {
            containerSelector: 'nav, .menu',
            includeInternal: true,
            includeExternal: false,
            includeMetadata: true,
            filterPattern: '^/products/.*',
            excludePattern: '\\.(pdf|doc|zip)$',
          },
          waitForSelector: '.navigation-loaded',
          timeout: 30000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Links extracted successfully',
    type: LinkExtractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid link extraction configuration',
  })
  @ApiResponse({
    status: 500,
    description: 'Link extraction failed',
  })
  async extractLinks(@Body() dto: LinkExtractionRequestDto): Promise<LinkExtractionResponseDto> {
    this.logger.log(`Link extraction request for session: ${dto.sessionId}`, {
      sessionId: dto.sessionId,
      containerSelector: dto.config?.containerSelector,
      includeInternal: dto.config?.includeInternal,
      includeExternal: dto.config?.includeExternal,
    });

    try {
      const result = await this.extractionService.extractLinks(
        dto.sessionId,
        dto.config,
        dto.waitForSelector,
        dto.timeout,
      );

      this.logger.log(`Link extraction completed for session: ${dto.sessionId}`, {
        sessionId: dto.sessionId,
        success: result.success,
        totalLinks: result.metadata.totalLinks,
        internalLinks: result.metadata.internalLinks,
        externalLinks: result.metadata.externalLinks,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Link extraction failed for session: ${dto.sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Link extraction failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract image sources and metadata
   */
  @Post('images')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract page images',
    description: `
Extract image sources and comprehensive metadata from web pages.
Supports dimension filtering, format detection, and metadata extraction.

Features:
- Image source URL extraction and resolution
- Dimension detection (width/height)
- Alt text and title extraction
- File format detection and filtering
- Data URL support for base64 images
- Container-scoped image extraction
- Minimum dimension filtering
- Position tracking for image ordering

Use cases:
- Image gallery analysis and download
- Product image extraction for catalogs
- SEO image optimization audits
- Visual content analysis
- Website asset inventory
`,
  })
  @ApiBody({
    type: ImageExtractionRequestDto,
    description: 'Image extraction configuration',
    examples: {
      basic: {
        summary: 'Basic image extraction',
        description: 'Extract all images from a page',
        value: {
          sessionId: 'session_123456789',
          config: {
            includeMetadata: true,
            includeDataUrls: false,
          },
          timeout: 30000,
        },
      },
      filtered: {
        summary: 'Filtered image extraction',
        description: 'Extract images with size and format filters',
        value: {
          sessionId: 'session_123456789',
          config: {
            containerSelector: '.gallery, .product-images',
            includeMetadata: true,
            includeDataUrls: false,
            minDimensions: { width: 200, height: 200 },
            fileExtensions: ['jpg', 'png', 'webp'],
          },
          waitForSelector: '.images-loaded',
          timeout: 45000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Images extracted successfully',
    type: ImageExtractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid image extraction configuration',
  })
  @ApiResponse({
    status: 500,
    description: 'Image extraction failed',
  })
  async extractImages(@Body() dto: ImageExtractionRequestDto): Promise<ImageExtractionResponseDto> {
    this.logger.log(`Image extraction request for session: ${dto.sessionId}`, {
      sessionId: dto.sessionId,
      containerSelector: dto.config?.containerSelector,
      includeDataUrls: dto.config?.includeDataUrls,
      minDimensions: dto.config?.minDimensions,
    });

    try {
      const result = await this.extractionService.extractImages(
        dto.sessionId,
        dto.config,
        dto.waitForSelector,
        dto.timeout,
      );

      this.logger.log(`Image extraction completed for session: ${dto.sessionId}`, {
        sessionId: dto.sessionId,
        success: result.success,
        totalImages: result.metadata.totalImages,
        formats: result.metadata.formats,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Image extraction failed for session: ${dto.sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Image extraction failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract structured data (JSON-LD, Microdata, OpenGraph)
   */
  @Post('structured-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract structured data',
    description: `
Extract structured data from web pages including JSON-LD, Microdata, and OpenGraph.
Supports schema.org markup, social media metadata, and SEO structured data.

Features:
- JSON-LD script extraction and parsing
- Microdata attribute extraction
- OpenGraph meta tag extraction
- Schema.org vocabulary support
- Social media metadata detection
- SEO structured data analysis
- Rich snippet data extraction
- Custom selector configuration

Use cases:
- SEO analysis and optimization
- Rich snippet extraction
- Social media metadata analysis
- Schema.org markup validation
- E-commerce product data extraction
`,
  })
  @ApiBody({
    type: StructuredDataExtractionRequestDto,
    description: 'Structured data extraction configuration',
    examples: {
      basic: {
        summary: 'Basic structured data extraction',
        description: 'Extract all common structured data types',
        value: {
          sessionId: 'session_123456789',
          timeout: 30000,
        },
      },
      custom: {
        summary: 'Custom structured data extraction',
        description: 'Extract with custom selectors',
        value: {
          sessionId: 'session_123456789',
          jsonLdSelectors: ['script[type="application/ld+json"]', '.structured-data script'],
          microdataSelectors: ['[itemscope]', '[itemtype]'],
          openGraphSelectors: ['meta[property^="og:"]', 'meta[name^="twitter:"]'],
          waitForSelector: '.metadata-loaded',
          timeout: 30000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Structured data extracted successfully',
    type: StructuredDataExtractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid structured data extraction configuration',
  })
  @ApiResponse({
    status: 500,
    description: 'Structured data extraction failed',
  })
  async extractStructuredData(
    @Body() dto: StructuredDataExtractionRequestDto,
  ): Promise<StructuredDataExtractionResponseDto> {
    this.logger.log(`Structured data extraction request for session: ${dto.sessionId}`, {
      sessionId: dto.sessionId,
      jsonLdSelectors: dto.jsonLdSelectors?.length,
      microdataSelectors: dto.microdataSelectors?.length,
      openGraphSelectors: dto.openGraphSelectors?.length,
    });

    try {
      const result = await this.extractionService.extractStructuredData(
        dto.sessionId,
        dto.jsonLdSelectors,
        dto.microdataSelectors,
        dto.openGraphSelectors,
        dto.waitForSelector,
        dto.timeout,
      );

      this.logger.log(`Structured data extraction completed for session: ${dto.sessionId}`, {
        sessionId: dto.sessionId,
        success: result.success,
        jsonLdCount: result.data.metadata.jsonLdCount,
        microdataCount: result.data.metadata.microdataCount,
        openGraphCount: result.data.metadata.openGraphCount,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Structured data extraction failed for session: ${dto.sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Structured data extraction failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Extract data using XPath expressions
   */
  @Post('xpath')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Extract data using XPath',
    description: `
Extract data using XPath expressions for complex element selection and data extraction.
Supports advanced DOM querying, attribute extraction, and text content retrieval.

Features:
- XPath expression evaluation
- Text content and attribute extraction
- Complex DOM traversal queries
- Multiple expression support
- Node type handling (text, element, attribute)
- Advanced selector capabilities beyond CSS
- Custom wait conditions for dynamic content
- Result validation and error handling

Use cases:
- Complex DOM structure navigation
- Advanced data scraping requirements
- XML/HTML document parsing
- Legacy system data extraction
- Custom selector requirements
`,
  })
  @ApiBody({
    type: XPathExtractionRequestDto,
    description: 'XPath extraction configuration',
    examples: {
      basic: {
        summary: 'Basic XPath extraction',
        description: 'Extract text using XPath expressions',
        value: {
          sessionId: 'session_123456789',
          xpaths: ['//h1/text()', '//p[@class="content"]/text()', '//a/@href'],
          extractAttributes: false,
          timeout: 30000,
        },
      },
      advanced: {
        summary: 'Advanced XPath extraction',
        description: 'Extract with complex XPath expressions',
        value: {
          sessionId: 'session_123456789',
          xpaths: [
            '//div[contains(@class, "product")]//span[@class="price"]/text()',
            '//table//tr[position()>1]/td[1]/text()',
            '//form//input[@type="hidden"]/@value',
          ],
          extractAttributes: true,
          waitForSelector: '.content-loaded',
          timeout: 45000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'XPath data extracted successfully',
    type: XPathExtractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid XPath extraction configuration',
  })
  @ApiResponse({
    status: 500,
    description: 'XPath extraction failed',
  })
  async extractXPath(@Body() dto: XPathExtractionRequestDto): Promise<XPathExtractionResponseDto> {
    this.logger.log(`XPath extraction request for session: ${dto.sessionId}`, {
      sessionId: dto.sessionId,
      xpathCount: dto.xpaths.length,
      extractAttributes: dto.extractAttributes,
    });

    // Validate XPath expressions (basic validation)
    for (const xpath of dto.xpaths) {
      if (!xpath.trim()) {
        throw new BadRequestException(`Empty XPath expression found`);
      }
      // Basic XPath syntax validation
      if (xpath.includes('<') || xpath.includes('>')) {
        throw new BadRequestException(`Invalid XPath expression: ${xpath}`);
      }
    }

    try {
      const result = await this.extractionService.extractXPath(
        dto.sessionId,
        dto.xpaths,
        dto.extractAttributes,
        dto.waitForSelector,
        dto.timeout,
      );

      this.logger.log(`XPath extraction completed for session: ${dto.sessionId}`, {
        sessionId: dto.sessionId,
        success: result.success,
        totalExpressions: result.metadata.totalExpressions,
        totalResults: result.metadata.totalResults,
        successfulExpressions: result.metadata.successfulExpressions,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`XPath extraction failed for session: ${dto.sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'XPath extraction failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Perform batch extraction operations
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Perform batch extraction',
    description: `
Perform multiple extraction operations in a single request for efficiency.
Supports combining different extraction types with individual configurations.

Features:
- Multiple extraction types in one request
- Independent configuration per operation
- Parallel execution for performance
- Individual error handling per operation
- Comprehensive result aggregation
- Operation success/failure tracking
- Optimized resource utilization
- Custom wait conditions for dynamic content

Use cases:
- Comprehensive page analysis
- Multi-format data export
- Efficiency optimization for multiple extractions
- Complete content auditing
- Data pipeline automation
`,
  })
  @ApiBody({
    type: BatchExtractionRequestDto,
    description: 'Batch extraction configuration',
    examples: {
      comprehensive: {
        summary: 'Comprehensive page extraction',
        description: 'Extract multiple data types from a page',
        value: {
          sessionId: 'session_123456789',
          operations: [
            {
              type: 'text',
              name: 'page_content',
              config: {
                selectors: ['h1', 'h2', 'p', '.content'],
                includeMetadata: true,
                cleanText: true,
              },
            },
            {
              type: 'links',
              name: 'navigation',
              config: {
                containerSelector: 'nav',
                includeInternal: true,
                includeExternal: false,
              },
            },
            {
              type: 'images',
              name: 'gallery',
              config: {
                containerSelector: '.gallery',
                includeMetadata: true,
                minDimensions: { width: 100, height: 100 },
              },
            },
          ],
          timeout: 60000,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Batch extraction completed',
    type: BatchExtractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid batch extraction configuration',
  })
  @ApiResponse({
    status: 500,
    description: 'Batch extraction failed',
  })
  async extractBatch(@Body() dto: BatchExtractionRequestDto): Promise<BatchExtractionResponseDto> {
    this.logger.log(`Batch extraction request for session: ${dto.sessionId}`, {
      sessionId: dto.sessionId,
      operationCount: dto.operations.length,
      operationTypes: dto.operations.map(op => op.type),
    });

    // Validate operation names are unique
    const operationNames = dto.operations.map(op => op.name);
    const uniqueNames = new Set(operationNames);
    if (operationNames.length !== uniqueNames.size) {
      throw new BadRequestException('Operation names must be unique');
    }

    try {
      const result = await this.extractionService.extractBatch(
        dto.sessionId,
        dto.operations,
        dto.waitForSelector,
        dto.timeout,
      );

      this.logger.log(`Batch extraction completed for session: ${dto.sessionId}`, {
        sessionId: dto.sessionId,
        success: result.success,
        totalOperations: result.metadata.totalOperations,
        successfulOperations: result.metadata.successfulOperations,
        failedOperations: result.metadata.failedOperations,
        executionTime: result.executionTime,
      });

      return result;
    } catch (error) {
      this.logger.error(`Batch extraction failed for session: ${dto.sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Batch extraction failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}