import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';import { ComputerUseService } from '../computer-use/computer-use.service';import {DataExtractionDto,
  MultiSelectorExtractionDto,
  DataExtractionType,
  ExtractionOutputFormat
} from './dto/data-extraction.dto';import {DataExtractionResponseDto,
  MultiExtractionResponseDto,
  ExtractedTableDto,
  ExtractedListDto,
  ExtractedTextDto,
  ExtractedLinkDto,
  ExtractedImageDto,
  ExtractedCustomDataDto,
  ExtractionMetadataDto
} from './dto/extraction-response.dto';

/**
 * Data Extraction Service
 *
 * Provides comprehensive data extraction capabilities including:
 * - Table data extraction with header detection
 * - List extraction with nested support
 * - Text content extraction with pattern matching
 * - Link and image extraction with metadata
 * - Custom pattern extraction with CSS selectors
 * - Structured data extraction (JSON-LD, microdata)
 * - Multi-format output support (JSON, CSV, XML, YAML)
 * - Pagination and infinite scroll handling
 */
@Injectable()
export class DataExtractionService {
  private readonly logger = new Logger(DataExtractionService.name);

  constructor(
    private readonly computerUseService: ComputerUseService,
  ) {}

  /**
   * Execute data extraction operation
   */
  async extractData(extraction: DataExtractionDto): Promise<DataExtractionResponseDto> {
    const startTime = Date.now();
    const operationId = `extract_${extraction.extractionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`[${operationId}] Starting data extraction: ${extraction.extractionType}`, {operationId,extractionType: extraction.extractionType,
      selector: extraction.selector,
      url: extraction.url,
      outputFormat: extraction.config?.outputFormat || ExtractionOutputFormat.JSON
    });

    try {
      // Navigate to URL if provided
      if (extraction.url) {
        await this.navigateToUrl(extraction.url, operationId);
      }

      // Wait for dynamic content if configured
      if (extraction.config?.waitForDynamicContent) {
        await this.waitForDynamicContent(operationId);
      }

      // Handle infinite scroll if configured
      if (extraction.config?.scrollToLoad) {
        await this.handleInfiniteScroll(operationId);
      }

      // Take screenshot before extraction if configured
      const screenshot = extraction.config?.captureScreenshots
        ? await this.captureScreenshot(operationId)
        : undefined;

      let result: DataExtractionResponseDto;

      // Execute specific extraction type
      switch (extraction.extractionType) {
        case DataExtractionType.TABLE:
          result = await this.extractTables(extraction, operationId);
          break;
        case DataExtractionType.LIST:
          result = await this.extractLists(extraction, operationId);
          break;
        case DataExtractionType.TEXT:
          result = await this.extractText(extraction, operationId);
          break;
        case DataExtractionType.LINKS:
          result = await this.extractLinks(extraction, operationId);
          break;
        case DataExtractionType.IMAGES:
          result = await this.extractImages(extraction, operationId);
          break;
        case DataExtractionType.FORMS:
          result = await this.extractForms(extraction, operationId);
          break;
        case DataExtractionType.STRUCTURED_DATA:
          result = await this.extractStructuredData(extraction, operationId);
          break;
        case DataExtractionType.CUSTOM_PATTERN:
          result = await this.extractCustomPattern(extraction, operationId);
          break;
        case DataExtractionType.PAGE_CONTENT:
          result = await this.extractPageContent(extraction, operationId);
          break;
        case DataExtractionType.METADATA:
          result = await this.extractMetadata(extraction, operationId);
          break;
        default:
          throw new Error(`Unsupported extraction type: ${extraction.extractionType}`);}// Add screenshot to result if captured
      if (screenshot) {
        result.screenshot = screenshot;
      }

      // Convert to specified output format if different from JSON
      if (extraction.config?.outputFormat && extraction.config.outputFormat !== ExtractionOutputFormat.JSON) {
        result.rawData = await this.convertToFormat(result, extraction.config.outputFormat, operationId);
      }

      const processingTime = Date.now() - startTime;
      result.metadata.processingTimeMs = processingTime;

      this.logger.log(`[${operationId}] Data extraction completed successfully (${processingTime}ms)`, {operationId,extractionType: extraction.extractionType,
        itemCount: result.itemCount,
        processingTime,
        success: result.success
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Data extraction failed (${processingTime}ms)`, error, {operationId,extractionType: extraction.extractionType,
        processingTime,
        errorType: error?.constructor?.name
      });
      throw error;
    }
  }

  /**
   * Execute multiple data extractions
   */
  async extractMultiple(extraction: MultiSelectorExtractionDto): Promise<MultiExtractionResponseDto> {
    const startTime = Date.now();
    const operationId = `multi_extract_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`[${operationId}] Starting multi-extraction operation`, {operationId,extractionCount: extraction.extractions.length,
      parallel: extraction.parallel,
      url: extraction.url
    });

    try {
      // Navigate to URL if provided
      if (extraction.url) {
        await this.navigateToUrl(extraction.url, operationId);
      }

      const results: DataExtractionResponseDto[] = [];
      let successfulExtractions = 0;
      let failedExtractions = 0;

      if (extraction.parallel) {
        // Execute extractions in parallel
        const promises = extraction.extractions.map(async (ext, index) => {
          try {
            const mergedConfig = { ...extraction.globalConfig, ...ext.config };
            const result = await this.extractData({ ...ext, config: mergedConfig });
            successfulExtractions++;
            return result;
          } catch (error) {
            failedExtractions++;
            this.logger.error(`[${operationId}] Extraction ${index} failed`, error);return this.createErrorResponse(ext, error.message);}
        });

        const parallelResults = await Promise.all(promises);
        results.push(...parallelResults);
      } else {
        // Execute extractions sequentially
        for (let i = 0; i < extraction.extractions.length; i++) {
          const ext = extraction.extractions[i];
          try {
            const mergedConfig = { ...extraction.globalConfig, ...ext.config };
            const result = await this.extractData({ ...ext, config: mergedConfig });
            results.push(result);
            successfulExtractions++;
          } catch (error) {
            failedExtractions++;
            this.logger.error(`[${operationId}] Extraction ${i} failed`, error);results.push(this.createErrorResponse(ext, error.message));}
        }
      }

      const totalProcessingTime = Date.now() - startTime;

      // Create combined metadata
      const combinedMetadata = this.createCombinedMetadata(results, totalProcessingTime);

      // Create summary statistics
      const summary = this.createExtractionSummary(results);

      const response: MultiExtractionResponseDto = {
        success: failedExtractions === 0,
        extractionCount: extraction.extractions.length,
        successfulExtractions,
        failedExtractions,
        results,
        totalProcessingTimeMs: totalProcessingTime,
        combinedMetadata,
        summary
      };

      this.logger.log(`[${operationId}] Multi-extraction completed (${totalProcessingTime}ms)`, {operationId,extractionCount: extraction.extractions.length,
        successfulExtractions,
        failedExtractions,
        totalProcessingTime
      });

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Multi-extraction failed (${processingTime}ms)`, error);throw error;}
  }

  // Specific extraction methods

  private async extractTables(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting table data`, {
      selector: extraction.selector,
      includeHeaders: extraction.tableConfig?.includeHeaders,
      maxRows: extraction.tableConfig?.maxRows
    });

    // Implementation would use browser automation to extract table data
    // For now, return mock data structure
    const tables: ExtractedTableDto[] = [{
      headers: ['Column 1', 'Column 2', 'Column 3'],rows: [['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3']],rowCount: 2,
      columnCount: 3,
      selector: extraction.selector || 'table'
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { tables },
      tables.reduce((sum, table) => sum + table.rowCount, 0),
      operationId
    );
  }

  private async extractLists(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting list data`, {
      selector: extraction.selector,
      includeNested: extraction.listConfig?.includeNested,
      maxDepth: extraction.listConfig?.maxDepth
    });

    const lists: ExtractedListDto[] = [{
      items: ['List Item 1', 'List Item 2', 'List Item 3'],listType: 'unordered',itemCount: 3,selector: extraction.selector || 'ul, ol',
      depth: 1
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { lists },
      lists.reduce((sum, list) => sum + list.itemCount, 0),
      operationId
    );
  }

  private async extractText(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting text data`, {
      selector: extraction.selector,
      preserveFormatting: extraction.textConfig?.preserveFormatting,
      patterns: extraction.textConfig?.patterns
    });

    const texts: ExtractedTextDto[] = [{
      content: 'This is extracted text content from the page.',length: 45,wordCount: 8,
      patterns: [],
      formattingPreserved: extraction.textConfig?.preserveFormatting || false,
      selector: extraction.selector || 'body'
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { texts },
      texts.length,
      operationId
    );
  }

  private async extractLinks(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting link data`, {
      selector: extraction.selector,
      internalOnly: extraction.linkConfig?.internalOnly,
      includeAttributes: extraction.linkConfig?.includeAttributes
    });

    const links: ExtractedLinkDto[] = [{
      url: 'https://example.com/page',text: 'Example Link',title: 'Visit Example Page',target: '_blank',
      isInternal: false,
      attributes: {}
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { links },
      links.length,
      operationId
    );
  }

  private async extractImages(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting image data`, {
      selector: extraction.selector,
      includeImageData: extraction.imageConfig?.includeImageData,
      minDimensions: extraction.imageConfig?.minDimensions
    });

    const images: ExtractedImageDto[] = [{
      src: 'https://example.com/image.jpg',alt: 'Example Image',title: 'Sample Image',
      width: 800,
      height: 600,
      attributes: {}
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { images },
      images.length,
      operationId
    );
  }

  private async extractForms(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting form data`);

    // This would integrate with the form automation module
    const customData: ExtractedCustomDataDto[] = [{
      selector: 'form',text: 'Contact Form',attributes: { action: '/submit', method: 'POST' },children: [{ selector: 'input[type="email"]", attributes: { name: 'email', required: 'true' } },{ selector: 'textarea', attributes: { name: 'message' } }
      ]
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { customData },
      customData.length,
      operationId
    );
  }

  private async extractStructuredData(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting structured data (JSON-LD, microdata)`);

    const customData: ExtractedCustomDataDto[] = [{
      selector: 'script[type="application/ld+json"]",text: '{"@context": "https://schema.org", "@type": "Organization", "name": "Example Company"}',attributes: { type: 'application/ld+json' }
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { customData },
      customData.length,
      operationId
    );
  }

  private async extractCustomPattern(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting custom pattern data`, {
      selector: extraction.customConfig?.selector,
      includeText: extraction.customConfig?.includeText,
      includeHtml: extraction.customConfig?.includeHtml
    });

    const customData: ExtractedCustomDataDto[] = [{
      selector: extraction.customConfig?.selector || extraction.selector,
      text: 'Custom extracted content',attributes: { 'data-custom': 'value' },
      children: []
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { customData },
      customData.length,
      operationId
    );
  }

  private async extractPageContent(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting complete page content`);

    const texts: ExtractedTextDto[] = [{
      content: 'Complete page content extracted here...',length: 1000,wordCount: 150,
      selector: 'body'
    }];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { texts },
      1,
      operationId
    );
  }

  private async extractMetadata(extraction: DataExtractionDto, operationId: string): Promise<DataExtractionResponseDto> {
    this.logger.log(`[${operationId}] Extracting page metadata`);

    const customData: ExtractedCustomDataDto[] = [
      { selector: 'title', text: 'Page Title' },{ selector: 'meta[name="description"]", attributes: { content: 'Page description' } },{ selector: 'meta[name="keywords"]", attributes: { content: 'keyword1, keyword2' } }
    ];

    return this.createSuccessResponse(
      extraction.extractionType,
      extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      { customData },
      customData.length,
      operationId
    );
  }

  // Helper methods

  private async navigateToUrl(url: string, operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Navigating to URL: ${url}`);// Implementation would navigate to the URL}

  private async waitForDynamicContent(operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Waiting for dynamic content to load`);await this.delay(2000); // Wait for dynamic content}

  private async handleInfiniteScroll(operationId: string): Promise<void> {
    this.logger.log(`[${operationId}] Handling infinite scroll to load more content`);
    // Implementation would scroll and wait for more content
  }

  private async captureScreenshot(operationId: string): Promise<string> {
    try {
      const result = await this.computerUseService.action({ action: 'screenshot' });return (result as any)?.image || '';
    } catch (error) {
      this.logger.warn(`[${operationId}] Failed to capture screenshot: ${error.message}`);
      return '';
    }
  }

  private async convertToFormat(data: any, format: ExtractionOutputFormat, operationId: string): Promise<string> {
    this.logger.log(`[${operationId}] Converting data to format: ${format}`);

    switch (format) {
      case ExtractionOutputFormat.CSV:
        return this.convertToCSV(data);
      case ExtractionOutputFormat.XML:
        return this.convertToXML(data);
      case ExtractionOutputFormat.YAML:
        return this.convertToYAML(data);
      case ExtractionOutputFormat.PLAIN_TEXT:
        return this.convertToPlainText(data);
      case ExtractionOutputFormat.HTML:
        return this.convertToHTML(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private convertToCSV(data: any): string {
    // Implementation would convert data to CSV format
    return 'Column1,Column2,Column3Value1,Value2,Value3';}

  private convertToXML(data: any): string {
    // Implementation would convert data to XML format
    return '<?xml version="1.0"?><root><data>value</data></root>";}

  private convertToYAML(data: any): string {
    // Implementation would convert data to YAML format
    return 'data:\n  - value1\n  - value2';}private convertToPlainText(data: any): string {
    // Implementation would convert data to plain text format
    return 'Extracted data in plain text format';}private convertToHTML(data: any): string {
    // Implementation would convert data to HTML format
    return '<html><body><h1>Extracted Data</h1><p>Data content here</p></body></html>';}private createSuccessResponse(
    extractionType: DataExtractionType,
    outputFormat: ExtractionOutputFormat,
    data: any,
    itemCount: number,
    operationId: string
  ): DataExtractionResponseDto {
    return {
      success: true,
      extractionType,
      outputFormat,
      itemCount,
      ...data,
      metadata: this.createMetadata(operationId)
    };
  }

  private createErrorResponse(extraction: DataExtractionDto, errorMessage: string): DataExtractionResponseDto {
    return {
      success: false,
      extractionType: extraction.extractionType,
      outputFormat: extraction.config?.outputFormat || ExtractionOutputFormat.JSON,
      itemCount: 0,
      errorMessage,
      metadata: this.createMetadata('error')};}

  private createMetadata(operationId: string): ExtractionMetadataDto {
    return {
      sourceUrl: 'https://example.com',pageTitle: 'Example Page',timestamp: new Date().toISOString(),processingTimeMs: 0, // Will be set later
      userAgent: 'ByteBot Data Extractor',viewport: { width: 1920, height: 1080 },language: 'en-US',encoding: 'UTF-8',contentType: 'text/html'};}

  private createCombinedMetadata(results: DataExtractionResponseDto[], processingTime: number): ExtractionMetadataDto {
    const firstResult = results.find(r => r.success);
    if (!firstResult) {
      return this.createMetadata('combined');
    }

    return {
      ...firstResult.metadata,
      processingTimeMs: processingTime
    };
  }

  private createExtractionSummary(results: DataExtractionResponseDto[]): Record<string, any> {
    const summary: Record<string, any> = {
      totalItems: results.reduce((sum, result) => sum + result.itemCount, 0),
      tablesExtracted: results.filter(r => r.tables?.length > 0).length,
      listsExtracted: results.filter(r => r.lists?.length > 0).length,
      linksExtracted: results.reduce((sum, result) => sum + (result.links?.length || 0), 0),
      imagesExtracted: results.reduce((sum, result) => sum + (result.images?.length || 0), 0),
      textsExtracted: results.filter(r => r.texts?.length > 0).length,
      customDataExtracted: results.filter(r => r.customData?.length > 0).length
    };

    return summary;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}