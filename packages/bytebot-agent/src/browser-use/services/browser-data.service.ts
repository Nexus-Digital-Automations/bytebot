/**
 * Browser Data Service
 *
 * Service for extracting structured data from web pages using various methods
 * including AI-powered queries, CSS selectors, XPath expressions, and regex patterns.
 * Provides comprehensive data extraction capabilities with quality validation,
 * confidence scoring, and enterprise-grade error handling.
 *
 * Features:
 * - AI-powered intelligent data extraction
 * - CSS selector-based data extraction
 * - XPath expression data extraction
 * - Regular expression pattern matching
 * - Structured data discovery (JSON-LD, microdata)
 * - Data quality assessment and confidence scoring
 * - Multiple output formats (JSON, CSV, XML)
 * - Local-only architecture compliance
 *
 * @service BrowserDataService
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserUseService } from '../browser-use.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserDomService } from './browser-dom.service';

// Import DTOs
import {
  ExtractDataDto,
  DataExtractionResponseDto,
  ExtractionMethod,
  OutputFormat,
  ExtractedDataItem,
} from '../dto/browser-data.dto';

interface ExtractionContext {
  sessionId: string;
  url: string;
  title: string;
  timestamp: Date;
  method: ExtractionMethod;
  outputFormat: OutputFormat;
}

interface BrowserCommandResult {
  success: boolean;
  error?: string;
  data?: unknown;
  content?: string;
  links?: BrowserLink[];
  images?: BrowserImage[];
}

// Define interfaces for browser API responses
interface BrowserExtractionItem {
  data?: Record<string, unknown>;
  tagName?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  confidence?: number;
  selector?: string;
  xpath?: string;
}

interface BrowserStructuredData {
  jsonLD?: unknown[];
  microdata?: unknown[];
  openGraph?: Record<string, string>;
  twitterCards?: Record<string, string>;
}

interface BrowserLink {
  text: string;
  href: string;
  title?: string;
  rel?: string;
  target?: string;
}

interface BrowserImage {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

interface TransformationRule {
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeHtml?: boolean;
  parseNumber?: boolean;
  parseDate?: boolean;
  replacePattern?: { pattern: string; replacement: string };
}

@Injectable()
export class BrowserDataService {
  private readonly logger = new Logger(BrowserDataService.name);
  private readonly aiProvider: string;
  private readonly maxRetries = 3;
  private readonly defaultTimeout = 30000;

  // Type guard functions
  private isBrowserExtractionItem(
    value: unknown,
  ): value is BrowserExtractionItem {
    return typeof value === 'object' && value !== null;
  }

  private isBrowserStructuredData(
    value: unknown,
  ): value is BrowserStructuredData {
    return typeof value === 'object' && value !== null;
  }

  private isTransformationRule(value: unknown): value is TransformationRule {
    return typeof value === 'object' && value !== null;
  }

  private isStringRecord(value: unknown): value is Record<string, string> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  private safeGetString(obj: unknown, key: string, defaultValue = ''): string {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : defaultValue;
    }
    return defaultValue;
  }

  private safeGetNumber(obj: unknown, key: string, defaultValue = 0): number {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return typeof value === 'number' ? value : defaultValue;
    }
    return defaultValue;
  }

  private safeGetRecord(obj: unknown, key: string): Record<string, string> {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return this.isStringRecord(value) ? value : {};
    }
    return {};
  }

  private safeGetArray(obj: unknown, key: string): unknown[] {
    if (typeof obj === 'object' && obj !== null && key in obj) {
      const value = (obj as Record<string, unknown>)[key];
      return this.isUnknownArray(value) ? value : [];
    }
    return [];
  }

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly browserSessionService: BrowserSessionService,
    private readonly browserDomService: BrowserDomService,
    private readonly configService: ConfigService,
  ) {
    this.aiProvider = this.configService.get<string>('AI_PROVIDER') || 'openai';
  }

  /**
   * Extract structured data from the current page
   */
  async extractData(
    sessionId: string,
    extractDto: ExtractDataDto,
  ): Promise<DataExtractionResponseDto> {
    this.logger.log(
      `Extracting data from session ${sessionId} using method: ${extractDto.method}`,
    );

    const startTime = Date.now();
    const context: ExtractionContext = {
      sessionId,
      url: '',
      title: '',
      timestamp: new Date(),
      method: extractDto.method || ExtractionMethod.AI_QUERY,
      outputFormat: extractDto.outputFormat || OutputFormat.JSON,
    };

    try {
      // Validate session exists and is active
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // Get current page information
      const pageState = await this.browserDomService.getState(sessionId);
      context.url = pageState.pageInfo?.url || '';
      context.title = pageState.pageInfo?.title || '';

      // Wait for dynamic content if needed
      if (extractDto.waitForDynamicContent) {
        await this.waitForDynamicContent(
          sessionId,
          extractDto.timeoutSeconds || 30,
        );
      }

      // Extract data based on selected method
      let extractedData: ExtractedDataItem[] = [];

      switch (context.method) {
        case ExtractionMethod.AI_QUERY:
          extractedData = await this.extractWithAI(
            sessionId,
            extractDto,
            context,
          );
          break;
        case ExtractionMethod.CSS_SELECTORS:
          extractedData = await this.extractWithCSSSelectors(
            sessionId,
            extractDto,
            context,
          );
          break;
        case ExtractionMethod.XPATH_SELECTORS:
          extractedData = await this.extractWithXPath(
            sessionId,
            extractDto,
            context,
          );
          break;
        case ExtractionMethod.REGEX_PATTERNS:
          extractedData = await this.extractWithRegex(
            sessionId,
            extractDto,
            context,
          );
          break;
        case ExtractionMethod.STRUCTURED_DATA:
          extractedData = await this.extractStructuredData(
            sessionId,
            extractDto,
            context,
          );
          break;
        default:
          throw new BadRequestException(
            `Unsupported extraction method: ${String(context.method)}`,
          );
      }

      // Limit results if specified
      if (extractDto.maxItems && extractedData.length > extractDto.maxItems) {
        extractedData = extractedData.slice(0, extractDto.maxItems);
      }

      // Get page metadata
      const pageMetadata = await this.getPageMetadata(sessionId);

      // Update statistics with actual data
      const finalStatistics = this.calculateExtractionStatistics(
        extractedData,
        startTime,
      );

      // Extract links and images if requested
      const links = extractDto.includeLinks
        ? await this.extractLinks(sessionId)
        : undefined;
      const images = extractDto.includeImages
        ? await this.extractImages(sessionId)
        : undefined;

      // Convert data to requested format
      const rawData = this.convertToFormat(extractedData, context.outputFormat);

      // Take screenshot if enabled
      let screenshot: string | undefined;
      try {
        const screenshotResult = await this.browserDomService.getState(
          sessionId,
          {
            includeScreenshot: true,
          },
        );
        screenshot = screenshotResult.screenshot;
      } catch (error) {
        this.logger.warn(
          'Failed to capture screenshot during extraction:',
          error,
        );
      }

      const response: DataExtractionResponseDto = {
        success: true,
        method: context.method,
        outputFormat: context.outputFormat,
        itemsExtracted: extractedData.length,
        extractedData,
        rawData,
        pageMetadata,
        statistics: finalStatistics,
        links,
        images,
        timestamp: context.timestamp,
        screenshot,
      };

      this.logger.log(
        `Data extraction completed: ${extractedData.length} items extracted`,
      );
      return response;
    } catch (error) {
      this.logger.error(
        `Data extraction failed for session ${sessionId}:`,
        error,
      );

      const failureResponse: DataExtractionResponseDto = {
        success: false,
        method: context.method,
        outputFormat: context.outputFormat,
        itemsExtracted: 0,
        extractedData: [],
        rawData: '',
        pageMetadata: {
          url: context.url,
          title: context.title,
        },
        statistics: {
          totalElements: 0,
          processedElements: 0,
          matchedElements: 0,
          extractionTimeMs: Date.now() - startTime,
          dataQualityScore: 0,
        },
        timestamp: context.timestamp,
        error: {
          code: (error as Error).name || 'EXTRACTION_ERROR',
          message: (error as Error).message,
          details: {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack,
          } as Record<string, unknown>,
        },
      };

      return failureResponse;
    }
  }

  /**
   * Extract data using AI-powered queries
   */
  private async extractWithAI(
    sessionId: string,
    extractDto: ExtractDataDto,
    context: ExtractionContext,
  ): Promise<ExtractedDataItem[]> {
    if (!extractDto.query) {
      throw new BadRequestException('AI query is required for AI_QUERY method');
    }

    this.logger.debug('Extracting data with AI query:', extractDto.query);

    // Get current page content
    const browserProcess =
      this.browserUseService.getProcessBySession(sessionId);
    if (!browserProcess) {
      throw new InternalServerErrorException(
        `No browser process found for session ${sessionId}`,
      );
    }

    // Prepare AI extraction command
    const command = {
      action: 'ai_extract',
      parameters: {
        query: extractDto.query,
        maxItems: extractDto.maxItems || 100,
        includeContext: true,
        confidenceThreshold: 0.7,
        scopeSelector: extractDto.scopeSelector,
      },
      timestamp: context.timestamp.toISOString(),
    };

    // Execute AI extraction
    const result = await this.executeWithRetry(browserProcess.id, command);

    if (!result.success) {
      throw new InternalServerErrorException(
        `AI extraction failed: ${result.error}`,
      );
    }

    // Convert AI results to standardized format
    return this.normalizeAIResults(result.data, context);
  }

  /**
   * Extract data using CSS selectors
   */
  private async extractWithCSSSelectors(
    sessionId: string,
    extractDto: ExtractDataDto,
    context: ExtractionContext,
  ): Promise<ExtractedDataItem[]> {
    if (!extractDto.rules || extractDto.rules.length === 0) {
      throw new BadRequestException(
        'Extraction rules are required for CSS_SELECTORS method',
      );
    }

    this.logger.debug('Extracting data with CSS selectors');

    const browserProcess =
      this.browserUseService.getProcessBySession(sessionId);
    if (!browserProcess) {
      throw new InternalServerErrorException(
        `No browser process found for session ${sessionId}`,
      );
    }

    // Prepare extraction rules
    const cssRules = extractDto.rules.filter((rule) => rule.selector);

    // Execute CSS selector extraction
    const command = {
      action: 'css_extract',
      parameters: {
        rules: cssRules.map((rule) => ({
          fieldName: rule.fieldName,
          selector: rule.selector,
          attribute: rule.attribute || 'textContent',
          required: rule.required || false,
          defaultValue: rule.defaultValue,
          transform: rule.transform,
        })),
        scopeSelector: extractDto.scopeSelector,
        maxItems: extractDto.maxItems || 100,
      },
      timestamp: context.timestamp.toISOString(),
    };

    const result: { success: boolean; error?: string; data?: unknown } =
      await this.executeWithRetry(browserProcess.id, command);

    if (!result.success) {
      throw new InternalServerErrorException(
        `CSS extraction failed: ${result.error}`,
      );
    }

    // Convert results to standardized format
    return this.normalizeSelectorResults(result.data, context);
  }

  /**
   * Extract data using XPath expressions
   */
  private async extractWithXPath(
    sessionId: string,
    extractDto: ExtractDataDto,
    context: ExtractionContext,
  ): Promise<ExtractedDataItem[]> {
    if (!extractDto.rules || extractDto.rules.length === 0) {
      throw new BadRequestException(
        'Extraction rules are required for XPATH_SELECTORS method',
      );
    }

    this.logger.debug('Extracting data with XPath selectors');

    const browserProcess =
      this.browserUseService.getProcessBySession(sessionId);
    if (!browserProcess) {
      throw new InternalServerErrorException(
        `No browser process found for session ${sessionId}`,
      );
    }

    // Prepare XPath rules
    const xpathRules = extractDto.rules.filter((rule) => rule.xpath);

    // Execute XPath extraction
    const command = {
      action: 'xpath_extract',
      parameters: {
        rules: xpathRules.map((rule) => ({
          fieldName: rule.fieldName,
          xpath: rule.xpath,
          attribute: rule.attribute || 'textContent',
          required: rule.required || false,
          defaultValue: rule.defaultValue,
          transform: rule.transform,
        })),
        maxItems: extractDto.maxItems || 100,
      },
      timestamp: context.timestamp.toISOString(),
    };

    const result = await this.executeWithRetry(browserProcess.id, command);

    if (!result.success) {
      throw new InternalServerErrorException(
        `XPath extraction failed: ${result.error}`,
      );
    }

    // Convert results to standardized format
    return this.normalizeSelectorResults(result.data, context);
  }

  /**
   * Extract data using regular expressions
   */
  private async extractWithRegex(
    sessionId: string,
    extractDto: ExtractDataDto,
    context: ExtractionContext,
  ): Promise<ExtractedDataItem[]> {
    if (!extractDto.rules || extractDto.rules.length === 0) {
      throw new BadRequestException(
        'Extraction rules are required for REGEX_PATTERNS method',
      );
    }

    this.logger.debug('Extracting data with regex patterns');

    const browserProcess =
      this.browserUseService.getProcessBySession(sessionId);
    if (!browserProcess) {
      throw new InternalServerErrorException(
        `No browser process found for session ${sessionId}`,
      );
    }

    // Get page content
    const command = {
      action: 'get_content',
      parameters: {
        format: 'text',
        scopeSelector: extractDto.scopeSelector,
      },
      timestamp: context.timestamp.toISOString(),
    };

    const contentResult = await this.executeWithRetry(
      browserProcess.id,
      command,
    );
    if (!contentResult.success) {
      throw new InternalServerErrorException(
        `Failed to get page content: ${contentResult.error}`,
      );
    }

    const pageContent =
      typeof contentResult.content === 'string' ? contentResult.content : '';
    const extractedData: ExtractedDataItem[] = [];

    // Apply regex rules
    const regexRules = extractDto.rules.filter((rule) => rule.regex);

    for (const rule of regexRules) {
      try {
        const regex = new RegExp(rule.regex || '', 'gi');
        const matches = Array.from(pageContent.matchAll(regex));

        for (
          let i = 0;
          i < matches.length && i < (extractDto.maxItems || 100);
          i++
        ) {
          const match = matches[i];
          const matchText = match[0] || '';
          const extractedItem: ExtractedDataItem = {
            data: {
              [rule.fieldName]: this.transformValue(matchText, rule.transform),
            },
            source: {
              tagName: 'text',
              textContent: matchText,
              attributes: {},
            },
            confidence: 0.8, // Regex has good confidence
            index: i,
          };

          extractedData.push(extractedItem);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to apply regex rule ${rule.fieldName}:`,
          error,
        );
      }
    }

    return extractedData;
  }

  /**
   * Extract structured data (JSON-LD, microdata, etc.)
   */
  private async extractStructuredData(
    sessionId: string,
    extractDto: ExtractDataDto,
    context: ExtractionContext,
  ): Promise<ExtractedDataItem[]> {
    this.logger.debug('Extracting structured data');

    const browserProcess =
      this.browserUseService.getProcessBySession(sessionId);
    if (!browserProcess) {
      throw new InternalServerErrorException(
        `No browser process found for session ${sessionId}`,
      );
    }

    // Extract structured data
    const command = {
      action: 'structured_data_extract',
      parameters: {
        types: ['jsonLD', 'microdata', 'openGraph', 'twitterCards'],
        maxItems: extractDto.maxItems || 100,
      },
      timestamp: context.timestamp.toISOString(),
    };

    const result = await this.executeWithRetry(browserProcess.id, command);

    if (!result.success) {
      throw new InternalServerErrorException(
        `Structured data extraction failed: ${result.error}`,
      );
    }

    // Convert structured data to standardized format
    return this.normalizeStructuredData(result.data, context);
  }

  /**
   * Execute command with retry logic
   */
  private async executeWithRetry(
    processId: string,
    command: unknown,
  ): Promise<BrowserCommandResult> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.browserUseService.sendCommand(
          processId,
          command,
        );
        // Type guard to ensure the result matches our expected interface
        if (
          typeof result === 'object' &&
          result !== null &&
          'success' in result
        ) {
          return result as BrowserCommandResult;
        }
        // If the result doesn't match expected format, treat as error
        return {
          success: false,
          error: 'Invalid response format from browser service',
        };
      } catch (error) {
        this.logger.warn(`Extraction attempt ${attempt} failed:`, error);

        if (attempt === this.maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }

    // Fallback return (should never reach here due to throws above)
    throw new Error('Maximum retry attempts exceeded');
  }

  /**
   * Wait for dynamic content to load
   */
  private async waitForDynamicContent(
    sessionId: string,
    timeoutSeconds: number,
  ): Promise<void> {
    // Simple implementation - wait for a fixed time
    // In a real implementation, you might wait for specific indicators
    await this.delay(Math.min(timeoutSeconds * 1000, 5000));
  }

  /**
   * Get comprehensive page metadata
   */
  private async getPageMetadata(sessionId: string): Promise<{
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
    structuredData?: Record<string, unknown>[];
  }> {
    try {
      const pageState = await this.browserDomService.getState(sessionId);

      return {
        url: pageState.pageInfo?.url || '',
        title: pageState.pageInfo?.title || '',
        description: '', // Would be extracted from meta tags
        keywords: [], // Would be extracted from meta tags
        author: '', // Would be extracted from meta tags
        language: '', // Would be extracted from html lang attribute
        canonicalUrl: '', // Would be extracted from link rel="canonical"
        ogTags: {}, // Would be extracted from Open Graph tags
        twitterTags: {}, // Would be extracted from Twitter Card tags
        structuredData: [] as Record<string, unknown>[], // Would be extracted from JSON-LD
      };
    } catch (error) {
      this.logger.warn('Failed to get page metadata:', error);
      return {
        url: '',
        title: '',
        description: undefined,
        keywords: undefined,
        author: undefined,
        publishedDate: undefined,
        modifiedDate: undefined,
        language: undefined,
        canonicalUrl: undefined,
        ogTags: undefined,
        twitterTags: undefined,
        structuredData: undefined,
      };
    }
  }

  /**
   * Extract all links from the page
   */
  private async extractLinks(sessionId: string): Promise<
    Array<{
      text: string;
      href: string;
      title?: string;
      rel?: string;
      target?: string;
    }>
  > {
    try {
      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        return [];
      }

      const command = {
        action: 'extract_links',
        parameters: {},
      };

      const result = await this.browserUseService.sendCommand(
        browserProcess.id,
        command,
      );

      // Type-safe extraction of links with validation
      if (typeof result === 'object' && result !== null && 'links' in result) {
        const links = (result as { links?: unknown }).links;
        if (Array.isArray(links)) {
          return links.filter((link): link is BrowserLink => {
            return (
              typeof link === 'object' &&
              link !== null &&
              'text' in link &&
              'href' in link &&
              typeof (link as BrowserLink).text === 'string' &&
              typeof (link as BrowserLink).href === 'string'
            );
          });
        }
      }
      return [];
    } catch (error) {
      this.logger.warn('Failed to extract links:', error);
      return [];
    }
  }

  /**
   * Extract all images from the page
   */
  private async extractImages(sessionId: string): Promise<
    Array<{
      src: string;
      alt?: string;
      title?: string;
      width?: number;
      height?: number;
    }>
  > {
    try {
      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        return [];
      }

      const command = {
        action: 'extract_images',
        parameters: {},
      };

      const result = await this.browserUseService.sendCommand(
        browserProcess.id,
        command,
      );

      // Type-safe extraction of images with validation
      if (typeof result === 'object' && result !== null && 'images' in result) {
        const images = (result as { images?: unknown }).images;
        if (Array.isArray(images)) {
          return images.filter((image): image is BrowserImage => {
            return (
              typeof image === 'object' &&
              image !== null &&
              'src' in image &&
              typeof (image as BrowserImage).src === 'string'
            );
          });
        }
      }
      return [];
    } catch (error) {
      this.logger.warn('Failed to extract images:', error);
      return [];
    }
  }

  /**
   * Calculate extraction statistics
   */
  private calculateExtractionStatistics(
    extractedData: ExtractedDataItem[],
    startTime: number,
  ): {
    totalElements: number;
    processedElements: number;
    matchedElements: number;
    extractionTimeMs: number;
    aiProcessingTimeMs?: number;
    dataQualityScore: number;
  } {
    const endTime = Date.now();
    const extractionTimeMs = endTime - startTime;

    // Calculate quality score based on confidence and completeness
    const avgConfidence =
      extractedData.length > 0
        ? extractedData.reduce((sum, item) => sum + item.confidence, 0) /
          extractedData.length
        : 0;

    return {
      totalElements: extractedData.length,
      processedElements: extractedData.length,
      matchedElements: extractedData.length,
      extractionTimeMs,
      dataQualityScore: avgConfidence,
    };
  }

  /**
   * Convert data to specified output format
   */
  private convertToFormat(
    data: ExtractedDataItem[],
    format: OutputFormat,
  ): string {
    try {
      switch (format) {
        case OutputFormat.JSON:
          return JSON.stringify(data, null, 2);

        case OutputFormat.CSV:
          return this.convertToCSV(data);

        case OutputFormat.XML:
          return this.convertToXML(data);

        case OutputFormat.PLAIN_TEXT:
          return this.convertToPlainText(data);

        default:
          return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      this.logger.warn('Failed to convert data to format:', error);
      return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: ExtractedDataItem[]): string {
    if (data.length === 0) {
      return '';
    }

    // Get all unique field names
    const fieldNames = new Set<string>();
    data.forEach((item) => {
      Object.keys(item.data).forEach((key) => fieldNames.add(key));
    });

    const headers = Array.from(fieldNames);
    const csvRows = [headers.join(',')];

    // Add data rows
    data.forEach((item) => {
      const row = headers.map((header) => {
        const value = item.data[header] || '';
        const stringValue =
          typeof value === 'string' ? value : JSON.stringify(value);
        return `"${stringValue.replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Convert data to XML format
   */
  private convertToXML(data: ExtractedDataItem[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<extracted-data>\n';

    data.forEach((item, index) => {
      xml += `  <item index="${index}">\n`;
      Object.entries(item.data).forEach(([key, value]) => {
        const stringValue =
          typeof value === 'string' ? value : JSON.stringify(value);
        xml += `    <${key}>${stringValue}</${key}>\n`;
      });
      xml += '  </item>\n';
    });

    xml += '</extracted-data>';
    return xml;
  }

  /**
   * Convert data to plain text format
   */
  private convertToPlainText(data: ExtractedDataItem[]): string {
    return data
      .map((item, index) => {
        const itemText = Object.entries(item.data)
          .map(([key, value]) => {
            const stringValue =
              typeof value === 'string' ? value : JSON.stringify(value);
            return `${key}: ${stringValue}`;
          })
          .join('\n  ');
        return `Item ${index + 1}:\n  ${itemText}`;
      })
      .join('\n\n');
  }

  /**
   * Normalize AI extraction results
   */
  private normalizeAIResults(
    data: unknown,
    _context: ExtractionContext,
  ): ExtractedDataItem[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((item: unknown, index) => {
      if (!this.isBrowserExtractionItem(item)) {
        return {
          data:
            typeof item === 'object' && item !== null
              ? (item as Record<string, unknown>)
              : {},
          source: {
            tagName: 'unknown',
            textContent: '',
            attributes: {},
          },
          confidence: 0.5,
          index,
        };
      }

      const normalizedItem = item;
      return {
        data:
          (normalizedItem.data as Record<string, unknown>) ||
          (normalizedItem as Record<string, unknown>),
        source: {
          tagName: this.safeGetString(normalizedItem, 'tagName', 'unknown'),
          textContent: this.safeGetString(normalizedItem, 'textContent', ''),
          attributes: this.safeGetRecord(normalizedItem, 'attributes'),
        },
        confidence: this.safeGetNumber(normalizedItem, 'confidence', 0.8),
        index,
      };
    });
  }

  /**
   * Normalize selector-based extraction results
   */
  private normalizeSelectorResults(
    data: unknown,
    _context: ExtractionContext,
  ): ExtractedDataItem[] {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    return data.map((item: unknown, index) => {
      if (!this.isBrowserExtractionItem(item)) {
        return {
          data: {},
          source: {
            selector: '',
            xpath: '',
            tagName: 'unknown',
            textContent: '',
            attributes: {},
          },
          confidence: 0.5,
          index,
        };
      }

      const normalizedItem = item;
      return {
        data: normalizedItem.data || {},
        source: {
          selector: this.safeGetString(normalizedItem, 'selector', ''),
          xpath: this.safeGetString(normalizedItem, 'xpath', ''),
          tagName: this.safeGetString(normalizedItem, 'tagName', 'unknown'),
          textContent: this.safeGetString(normalizedItem, 'textContent', ''),
          attributes: this.safeGetRecord(normalizedItem, 'attributes'),
        },
        confidence: 0.9, // Selector-based extraction has high confidence
        index,
      };
    });
  }

  /**
   * Normalize structured data results
   */
  private normalizeStructuredData(
    data: unknown,
    _context: ExtractionContext,
  ): ExtractedDataItem[] {
    const items: ExtractedDataItem[] = [];
    const structuredData = data as Record<string, unknown>;

    if (structuredData?.jsonLD && Array.isArray(structuredData.jsonLD)) {
      (structuredData.jsonLD as unknown[]).forEach(
        (item: unknown, index: number) => {
          items.push({
            data: item as Record<string, unknown>,
            source: {
              tagName: 'script',
              textContent: JSON.stringify(item),
              attributes: { type: 'application/ld+json' },
            },
            confidence: 0.95, // Structured data has very high confidence
            index,
          });
        },
      );
    }

    if (structuredData?.microdata && Array.isArray(structuredData.microdata)) {
      (structuredData.microdata as unknown[]).forEach(
        (item: unknown, _index: number) => {
          items.push({
            data: item as Record<string, unknown>,
            source: {
              tagName: 'div',
              textContent: JSON.stringify(item),
              attributes: { itemscope: 'true' },
            },
            confidence: 0.9,
            index: items.length,
          });
        },
      );
    }

    return items;
  }

  /**
   * Transform value based on transformation rules
   */
  private transformValue(value: string, transform?: unknown): string {
    if (!transform || !this.isTransformationRule(transform)) {
      return value;
    }

    const transformObj = transform;
    let result = value;

    if (transformObj.trim === true) {
      result = result.trim();
    }

    if (transformObj.lowercase === true) {
      result = result.toLowerCase();
    }

    if (transformObj.uppercase === true) {
      result = result.toUpperCase();
    }

    if (transformObj.removeHtml === true) {
      result = result.replace(/<[^>]*>/g, '');
    }

    if (
      transformObj.replacePattern &&
      typeof transformObj.replacePattern === 'object' &&
      transformObj.replacePattern !== null &&
      'pattern' in transformObj.replacePattern &&
      'replacement' in transformObj.replacePattern
    ) {
      const replacePattern = transformObj.replacePattern;
      if (
        typeof replacePattern.pattern === 'string' &&
        typeof replacePattern.replacement === 'string'
      ) {
        try {
          const regex = new RegExp(replacePattern.pattern, 'g');
          result = result.replace(regex, replacePattern.replacement);
        } catch (error) {
          this.logger.warn('Invalid regex pattern in transformation:', error);
        }
      }
    }

    return result;
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
