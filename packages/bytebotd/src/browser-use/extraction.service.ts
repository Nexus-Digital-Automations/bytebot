import { Injectable, Logger } from '@nestjs/common';
import { BrowserSessionService } from './browser-session.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import {
  TextExtractionConfig,
  TableExtractionConfig,
  LinkExtractionConfig,
  ImageExtractionConfig,
  ExtractedTextData,
  ExtractedTableData,
  ExtractedLinkData,
  ExtractedImageData,
  ExtractedStructuredData,
  ExtractedXPathData,
  ExtractionFormat,
  TextExtractionResponseDto,
  TableExtractionResponseDto,
  LinkExtractionResponseDto,
  ImageExtractionResponseDto,
  StructuredDataExtractionResponseDto,
  XPathExtractionResponseDto,
  BatchExtractionResponseDto,
} from './dto/data-extraction.dto';

/**
 * Data Extraction Service
 *
 * Comprehensive service for extracting various types of data from web pages
 * including text, tables, links, images, structured data, and XPath queries.
 *
 * Features:
 * - Text extraction with custom selectors and metadata
 * - Table extraction with CSV/JSON output formats
 * - Link extraction with internal/external filtering
 * - Image extraction with metadata and dimensions
 * - Structured data parsing (JSON-LD, Microdata, OpenGraph)
 * - XPath query support for complex element selection
 * - Batch extraction operations
 * - Data transformation and formatting
 */
@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);
  private readonly workingDirectory: string;
  private readonly tempDirectory: string;
  private readonly browserUsePath: string;
  private readonly pythonExecutable: string;

  constructor(private readonly sessionService: BrowserSessionService) {
    this.workingDirectory = process.env.BROWSER_USE_WORKING_DIR ?? '/tmp/browser-use';this.tempDirectory = path.join(this.workingDirectory, 'temp');this.browserUsePath = process.env.BROWSER_USE_PATH ?? path.join(process.cwd(), 'browser-use');this.pythonExecutable = process.env.PYTHON_EXECUTABLE ?? 'python3';this.initializeWorkspace().catch((error) => {this.logger.error('Failed to initialize extraction workspace', error);
    });
  }

  /**
   * Extract text content from page using selectors
   */
  async extractText(
    sessionId: string,
    config: TextExtractionConfig,
    waitForSelector?: string,
    timeout: number = 30000,
    format: ExtractionFormat = ExtractionFormat.JSON,
  ): Promise<TextExtractionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting text extraction for session: ${sessionId}`, {
      sessionId,
      selectors: config.selectors,
      format,
    });

    try {
      // Validate session
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Generate Python script for text extraction
      const script = this.generateTextExtractionScript(sessionId, config, waitForSelector, timeout);
      const result = await this.executePythonScript(script);

      if (!result.success) {
        throw new Error(`Text extraction failed: ${result.error}`);
      }

      const extractedData = JSON.parse(result.output) as ExtractedTextData[];
      const executionTime = Date.now() - startTime;

      // Calculate metadata
      const totalTextLength = extractedData.reduce((sum, item) => sum + item.text.length, 0);
      const uniqueSelectors = [...new Set(extractedData.map(item => item.selector))];

      return {
        success: true,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: extractedData,
        metadata: {
          totalElements: extractedData.length,
          selectors: uniqueSelectors,
          totalTextLength,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Text extraction failed for session: ${sessionId}`, error);

      return {
        success: false,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: [],
        metadata: {
          totalElements: 0,
          selectors: [],
          totalTextLength: 0,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract table data with support for CSV/JSON output formats
   */
  async extractTable(
    sessionId: string,
    config: TableExtractionConfig,
    waitForSelector?: string,
    timeout: number = 30000,
    format: ExtractionFormat = ExtractionFormat.JSON,
  ): Promise<TableExtractionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting table extraction for session: ${sessionId}`, {sessionId,selector: config.selector,
      format,
    });

    try {
      // Validate session
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);}// Generate Python script for table extraction
      const script = this.generateTableExtractionScript(sessionId, config, waitForSelector, timeout);
      const result = await this.executePythonScript(script);

      if (!result.success) {
        throw new Error(`Table extraction failed: ${result.error}`);}const extractedData = JSON.parse(result.output) as ExtractedTableData;
      const executionTime = Date.now() - startTime;

      const response: TableExtractionResponseDto = {
        success: true,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: extractedData,
      };

      // Generate CSV format if requested
      if (format === ExtractionFormat.CSV) {
        response.csv = this.convertTableToCSV(extractedData);
      }

      return response;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Table extraction failed for session: ${sessionId}`, error);return {success: false,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: {
          headers: [],
          rows: [],
          metadata: { rowCount: 0, columnCount: 0, selector: config.selector },
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract all links from page with filtering options
   */
  async extractLinks(
    sessionId: string,
    config: LinkExtractionConfig = new LinkExtractionConfig(),
    waitForSelector?: string,
    timeout: number = 30000,
  ): Promise<LinkExtractionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting link extraction for session: ${sessionId}`, {sessionId,containerSelector: config.containerSelector,
    });

    try {
      // Validate session
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);}// Generate Python script for link extraction
      const script = this.generateLinkExtractionScript(sessionId, config, waitForSelector, timeout);
      const result = await this.executePythonScript(script);

      if (!result.success) {
        throw new Error(`Link extraction failed: ${result.error}`);
      }

      const extractedData = JSON.parse(result.output) as ExtractedLinkData[];
      const executionTime = Date.now() - startTime;

      // Calculate metadata
      const internalLinks = extractedData.filter(link => link.type === 'internal').length;const externalLinks = extractedData.filter(link => link.type === 'external').length;const domains = [...new Set(extractedData
          .filter(link => link.type === 'external').map(link => {try {
              const urlObj = new URL(link.url);
              return urlObj.hostname;
            } catch {
              return 'invalid-url';
            }
          })
      )];

      return {
        success: true,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: extractedData,
        metadata: {
          totalLinks: extractedData.length,
          internalLinks,
          externalLinks,
          domains,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Link extraction failed for session: ${sessionId}`, error);return {success: false,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: [],
        metadata: {
          totalLinks: 0,
          internalLinks: 0,
          externalLinks: 0,
          domains: [],
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract image sources and metadata
   */
  async extractImages(
    sessionId: string,
    config: ImageExtractionConfig = new ImageExtractionConfig(),
    waitForSelector?: string,
    timeout: number = 30000,
  ): Promise<ImageExtractionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting image extraction for session: ${sessionId}`, {sessionId,containerSelector: config.containerSelector,
    });

    try {
      // Validate session
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);}// Generate Python script for image extraction
      const script = this.generateImageExtractionScript(sessionId, config, waitForSelector, timeout);
      const result = await this.executePythonScript(script);

      if (!result.success) {
        throw new Error(`Image extraction failed: ${result.error}`);}const extractedData = JSON.parse(result.output) as ExtractedImageData[];
      const executionTime = Date.now() - startTime;

      // Calculate metadata
      const formats = [...new Set(
        extractedData
          .map(img => img.metadata?.format)
          .filter(Boolean)
      )] as string[];

      const averageDimensions = this.calculateAverageDimensions(extractedData);

      return {
        success: true,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: extractedData,
        metadata: {
          totalImages: extractedData.length,
          formats,
          averageDimensions,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Image extraction failed for session: ${sessionId}`, error);

      return {
        success: false,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: [],
        metadata: {
          totalImages: 0,
          formats: [],
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract structured data (JSON-LD, Microdata, OpenGraph)
   */
  async extractStructuredData(
    sessionId: string,
    jsonLdSelectors: string[] = ['script[type="application/ld+json"]'],microdataSelectors: string[] = ['[itemscope]'],openGraphSelectors: string[] = ['meta[property^="og:"]'],
    waitForSelector?: string,
    timeout: number = 30000,
  ): Promise<StructuredDataExtractionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting structured data extraction for session: ${sessionId}`);try {// Validate session
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);}// Generate Python script for structured data extraction
      const script = this.generateStructuredDataExtractionScript(
        sessionId,
        jsonLdSelectors,
        microdataSelectors,
        openGraphSelectors,
        waitForSelector,
        timeout,
      );
      const result = await this.executePythonScript(script);

      if (!result.success) {
        throw new Error(`Structured data extraction failed: ${result.error}`);}const extractedData = JSON.parse(result.output) as ExtractedStructuredData;
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: extractedData,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Structured data extraction failed for session: ${sessionId}`, error);return {success: false,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: {
          jsonLd: [],
          microdata: [],
          openGraph: {},
          metadata: {
            jsonLdCount: 0,
            microdataCount: 0,
            openGraphCount: 0,
          },
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extract data using XPath expressions
   */
  async extractXPath(
    sessionId: string,
    xpaths: string[],
    extractAttributes: boolean = false,
    waitForSelector?: string,
    timeout: number = 30000,
  ): Promise<XPathExtractionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting XPath extraction for session: ${sessionId}`, {sessionId,xpaths,
      extractAttributes,
    });

    try {
      // Validate session
      const session = this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);}// Generate Python script for XPath extraction
      const script = this.generateXPathExtractionScript(
        sessionId,
        xpaths,
        extractAttributes,
        waitForSelector,
        timeout,
      );
      const result = await this.executePythonScript(script);

      if (!result.success) {
        throw new Error(`XPath extraction failed: ${result.error}`);}const extractedData = JSON.parse(result.output) as ExtractedXPathData[];
      const executionTime = Date.now() - startTime;

      // Calculate metadata
      const totalResults = extractedData.reduce((sum, item) => sum + item.count, 0);
      const successfulExpressions = extractedData.filter(item => item.count > 0).length;

      return {
        success: true,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: extractedData,
        metadata: {
          totalExpressions: xpaths.length,
          totalResults,
          successfulExpressions,
        },
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`XPath extraction failed for session: ${sessionId}`, error);

      return {
        success: false,
        timestamp: new Date(),
        executionTime,
        sessionId,
        data: [],
        metadata: {
          totalExpressions: xpaths.length,
          totalResults: 0,
          successfulExpressions: 0,
        },
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Perform batch extraction operations
   */
  async extractBatch(
    sessionId: string,
    operations: Array<{
      type: 'text' | 'table' | 'links' | 'images';
      name: string;
      config: TextExtractionConfig | TableExtractionConfig | LinkExtractionConfig | ImageExtractionConfig;
    }>,
    waitForSelector?: string,
    timeout: number = 30000,
  ): Promise<BatchExtractionResponseDto> {
    const startTime = Date.now();
    this.logger.log(`Starting batch extraction for session: ${sessionId}`, {
      sessionId,
      operationCount: operations.length,
    });

    const results: Record<string, {
      type: string;
      success: boolean;
      data: unknown;
      error?: string;
    }> = {};

    let successfulOperations = 0;
    let failedOperations = 0;

    for (const operation of operations) {
      try {
        let operationResult: unknown;

        switch (operation.type) {
          case 'text':operationResult = await this.extractText(sessionId,
              operation.config as TextExtractionConfig,
              waitForSelector,
              timeout,
            );
            break;
          case 'table':operationResult = await this.extractTable(sessionId,
              operation.config as TableExtractionConfig,
              waitForSelector,
              timeout,
            );
            break;
          case 'links':operationResult = await this.extractLinks(sessionId,
              operation.config as LinkExtractionConfig,
              waitForSelector,
              timeout,
            );
            break;
          case 'images':
            operationResult = await this.extractImages(
              sessionId,
              operation.config as ImageExtractionConfig,
              waitForSelector,
              timeout,
            );
            break;
          default:
            throw new Error(`Unsupported operation type: ${String(operation.type)}`);}results[operation.name] = {
          type: operation.type,
          success: true,
          data: operationResult,
        };
        successfulOperations++;
      } catch (error) {
        results[operation.name] = {
          type: operation.type,
          success: false,
          data: null,
          error: error instanceof Error ? error.message : String(error),
        };
        failedOperations++;
      }
    }

    const executionTime = Date.now() - startTime;
    const operationResults: Record<string, boolean> = {};
    Object.entries(results).forEach(([name, result]) => {
      operationResults[name] = result.success;
    });

    return {
      success: successfulOperations > 0,
      timestamp: new Date(),
      executionTime,
      sessionId,
      data: results,
      metadata: {
        totalOperations: operations.length,
        successfulOperations,
        failedOperations,
        operationResults,
      },
    };
  }

  // Private utility methods

  /**
   * Generate Python script for text extraction
   */
  private generateTextExtractionScript(
    sessionId: string,
    config: TextExtractionConfig,
    waitForSelector?: string,
    timeout: number = 30000,
  ): string {
    const selectorsJson = JSON.stringify(config.selectors);
    const configJson = JSON.stringify(config);

    return `
import asyncio
import json
import sys
from browser_use import Agent

async def extract_text():
    agent = Agent()

    try:
        # Session validation would be handled here
        session_id = "${sessionId}"
        selectors = ${selectorsJson}
        config = ${configJson}

        ${waitForSelector ? `
        # Wait for selector if specified
        await agent.browser.wait_for_selector("${waitForSelector}", timeout=${timeout})
        ` : ''}extracted_data = []for i, selector in enumerate(selectors):
            try:
                elements = await agent.browser.query_selector_all(selector)

                for j, element in enumerate(elements):
                    text_content = await element.text_content()

                    if config.get('cleanText', True):text_content = ' '.join(text_content.split())if config.get('maxTextLength') and len(text_content) > config['maxTextLength']:text_content = text_content[:config['maxTextLength']] + '...'item_data = {'selector': selector,'text': text_content,'metadata': {'tagName': await element.tag_name(),'position': j}}

                    if config.get('includeMetadata', True):class_name = await element.get_attribute('class')element_id = await element.get_attribute('id')if class_name:item_data['metadata']['className'] = class_nameif element_id:item_data['metadata']['id'] = element_idif config.get('includeAttributes', False):# Get common attributesattributes = {}
                        for attr in ['title', 'data-*', 'aria-*']:value = await element.get_attribute(attr)if value:
                                attributes[attr] = value
                        if attributes:
                            item_data['attributes'] = attributes

                    extracted_data.append(item_data)

            except Exception as e:
                # Log selector error but continue with other selectors
                sys.stderr.write(f"Error extracting selector {selector}: {str(e)}\n")
                continue

        print(json.dumps(extracted_data))

    except Exception as e:
        sys.stderr.write(f"Text extraction error: {str(e)}\n")
        sys.exit(1)

asyncio.run(extract_text())
`;
  }

  /**
   * Generate Python script for table extraction
   */
  private generateTableExtractionScript(
    sessionId: string,
    config: TableExtractionConfig,
    waitForSelector?: string,
    timeout: number = 30000,
  ): string {
    const configJson = JSON.stringify(config);
    const waitForSelectorCode = waitForSelector
      ? '        # Wait for selector if specified\n        await agent.browser.wait_for_selector("' + waitForSelector + '", timeout=' + timeout + ')\n'
      : '';

    const pythonScript = [
      'import asyncio',
      'import json',
      'import sys',
      'from browser_use import Agent',
      '',
      'async def extract_table():',
      '    agent = Agent()',
      '',
      '    try:',
      '        session_id = "' + sessionId + '"',
      "        config_json = '''" + configJson + "'''",
      '        config = json.loads(config_json)',
      "        selector = config['selector']",
      waitForSelectorCode,
      '',
      '        # Find table element',
      '        table = await agent.browser.query_selector(selector)',
      '        if not table:',
      '            raise Exception(f"Table not found with selector: {selector}")',
      '',
      '        # Extract headers',
      '        headers = []',
      '        header_rows = await table.query_selector_all("thead tr, tr:first-child")',
      "        if header_rows and config.get('includeHeaders', True):",
      '            header_cells = await header_rows[0].query_selector_all("th, td")',
      '            for cell in header_cells:',
      '                header_text = await cell.text_content()',
      '                headers.append(header_text.strip())',
      '',
      '        # Extract data rows',
      '        rows = []',
      '        data_rows = await table.query_selector_all("tbody tr, tr")',
      '',
      '        # Skip header row if it was included in data rows',
      "        start_index = 1 if config.get('includeHeaders', True) and not await table.query_selector('thead') else 0",
      '',
      '        for i, row in enumerate(data_rows[start_index:]):',
      "            if config.get('maxRows') and i >= config['maxRows']:",
      '                break',
      '',
      '            cells = await row.query_selector_all("td, th")',
      '            row_data = {}',
      '',
      '            for j, cell in enumerate(cells):',
      '                cell_text = await cell.text_content()',
      '                cell_text = cell_text.strip()',
      '',
      '                # Skip empty rows if configured',
      "                if config.get('skipEmptyRows', True) and not cell_text:",
      '                    continue',
      '',
      '                # Use header as key or fallback to column index',
      '                if j < len(headers):',
      '                    column_key = headers[j]',
      '                    # Apply column mapping if provided',
      "                    if config.get('columnMapping') and column_key in config['columnMapping']:",
      "                        column_key = config['columnMapping'][column_key]",
      '                else:',
      '                    column_key = f"column_{j}"',
      '',
      '                # Try to convert to number if possible',
      '                try:',
      "                    if '.' in cell_text:",
      '                        row_data[column_key] = float(cell_text)',
      '                    else:',
      '                        row_data[column_key] = int(cell_text)',
      '                except ValueError:',
      '                    row_data[column_key] = cell_text',
      '',
      '            if row_data:  # Only add non-empty rows',
      '                rows.append(row_data)',
      '',
      '        result = {',
      "            'headers': headers,",
      "            'rows': rows,",
      "            'metadata': {",
      "                'rowCount': len(rows),",
      "                'columnCount': len(headers),",
      "                'selector': selector",
      '            }',
      '        }',
      '',
      '        print(json.dumps(result))',
      '',
      '    except Exception as e:',
      '        sys.stderr.write(f"Table extraction error: {str(e)}\\n")',
      '        sys.exit(1)',
      '',
      'asyncio.run(extract_table())'
    ];

    return pythonScript.join('\n');
  }

  /**
   * Generate Python script for link extraction
   */
  private generateLinkExtractionScript(
    sessionId: string,
    config: LinkExtractionConfig,
    waitForSelector?: string,
    timeout: number = 30000,
  ): string {
    const configJson = JSON.stringify(config);

    return `
import asyncio
import json
import sys
import re
from urllib.parse import urljoin, urlparse
from browser_use import Agent

async def extract_links():
    agent = Agent()

    try:
        session_id = "${sessionId}"
        config = ${configJson}

        ${waitForSelector ? `
        # Wait for selector if specified
        await agent.browser.wait_for_selector("${waitForSelector}", timeout=${timeout})
        ` : ''}

        # Get current page URL for relative link resolution
        current_url = await agent.browser.url()
        current_domain = urlparse(current_url).netloc

        # Find links within container or entire page
        container_selector = config.get('containerSelector', 'body')
        container = await agent.browser.query_selector(container_selector)

        if not container:
            container = await agent.browser.query_selector('body')links = await container.query_selector_all('a[href]')extracted_data = []for i, link in enumerate(links):
            try:
                href = await link.get_attribute('href')text = await link.text_content()text = text.strip()

                # Resolve relative URLs
                absolute_url = urljoin(current_url, href)
                parsed_url = urlparse(absolute_url)

                # Determine if link is internal or external
                is_internal = parsed_url.netloc == current_domain or parsed_url.netloc == ''
                link_type = 'internal' if is_internal else 'external'

                # Apply include/exclude filters
                if not config.get('includeInternal', True) and is_internal:
                    continue
                if not config.get('includeExternal', True) and not is_internal:
                    continue

                # Apply regex filters
                if config.get('filterPattern'):
                    if not re.search(config['filterPattern'], absolute_url):
                        continue
                if config.get('excludePattern'):
                    if re.search(config['excludePattern'], absolute_url):
                        continue

                link_data = {
                    'url': absolute_url,
                    'text': text,
                    'type': link_type,
                    'metadata': {'position': i}
                }

                if config.get('includeMetadata', True):
                    # Get additional link attributes
                    title = await link.get_attribute('title')
                    rel = await link.get_attribute('rel')
                    target = await link.get_attribute('target')

                    if title:
                        link_data['metadata']['title'] = title
                    if rel:
                        link_data['metadata']['rel'] = rel
                    if target:
                        link_data['metadata']['target'] = target

                extracted_data.append(link_data)

            except Exception as e:
                sys.stderr.write(f"Error processing link {i}: {str(e)}\n")
                continue

        print(json.dumps(extracted_data))

    except Exception as e:
        sys.stderr.write(f"Link extraction error: {str(e)}\n")
        sys.exit(1)

asyncio.run(extract_links())
`;
  }

  /**
   * Generate Python script for image extraction
   */
  private generateImageExtractionScript(
    sessionId: string,
    config: ImageExtractionConfig,
    waitForSelector?: string,
    timeout: number = 30000,
  ): string {
    const configJson = JSON.stringify(config);

    return `
import asyncio
import json
import sys
import re
from urllib.parse import urljoin
from browser_use import Agent

async def extract_images():
    agent = Agent()

    try:
        session_id = "${sessionId}"
        config = ${configJson}

        ${waitForSelector ? `
        # Wait for selector if specified
        await agent.browser.wait_for_selector("${waitForSelector}", timeout=${timeout})
        ` : ''}# Get current page URL for relative URL resolutioncurrent_url = await agent.browser.url()

        # Find images within container or entire page
        container_selector = config.get('containerSelector', 'body')container = await agent.browser.query_selector(container_selector)if not container:
            container = await agent.browser.query_selector('body')images = await container.query_selector_all('img[src]')extracted_data = []for i, img in enumerate(images):
            try:
                src = await img.get_attribute('src')alt = await img.get_attribute('alt')# Skip data URLs unless specifically requestedif src.startswith('data:') and not config.get('includeDataUrls', False):continue# Resolve relative URLs
                if not src.startswith('data:'):src = urljoin(current_url, src)# Apply file extension filter
                if config.get('fileExtensions'):file_ext = src.split('.')[-1].lower().split('?')[0]if file_ext not in config['fileExtensions']:continueimg_data = {
                    'src': src,'alt': alt or '','metadata': {'position': i}}

                if config.get('includeMetadata', True):# Get image dimensions and other metadatatry:
                        width = await img.get_attribute('width')height = await img.get_attribute('height')title = await img.get_attribute('title')# Get computed dimensions if not in attributesif not width or not height:
                            bounding_box = await img.bounding_box()
                            if bounding_box:
                                computed_width = bounding_box['width']computed_height = bounding_box['height']width = width or computed_widthheight = height or computed_height

                        if width:
                            img_data['metadata']['width'] = int(float(width))if height:img_data['metadata']['height'] = int(float(height))if title:img_data['metadata']['title'] = title# Determine format from URL or data URIif src.startswith('data:'):format_match = re.search(r'data:image/([^;]+)', src)if format_match:img_data['metadata']['format'] = format_match.group(1)else:file_ext = src.split('.')[-1].lower().split('?')[0]if file_ext in ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']:img_data['metadata']['format'] = file_ext

                    except Exception as meta_error:
                        sys.stderr.write(f"Error getting image metadata: {str(meta_error)}\n")

                # Apply dimension filter
                if config.get('minDimensions'):min_width = config['minDimensions'].get('width', 0)min_height = config['minDimensions'].get('height', 0)img_width = img_data['metadata'].get('width', 0)img_height = img_data['metadata'].get('height', 0)

                    if img_width < min_width or img_height < min_height:
                        continue

                extracted_data.append(img_data)

            except Exception as e:
                sys.stderr.write(f"Error processing image {i}: {str(e)}\n")
                continue

        print(json.dumps(extracted_data))

    except Exception as e:
        sys.stderr.write(f"Image extraction error: {str(e)}\n")
        sys.exit(1)

asyncio.run(extract_images())
`;
  }

  /**
   * Generate Python script for structured data extraction
   */
  private generateStructuredDataExtractionScript(
    sessionId: string,
    jsonLdSelectors: string[],
    microdataSelectors: string[],
    openGraphSelectors: string[],
    waitForSelector?: string,
    timeout: number = 30000,
  ): string {
    const jsonLdSelectorsJson = JSON.stringify(jsonLdSelectors);
    const microdataSelectorsJson = JSON.stringify(microdataSelectors);
    const openGraphSelectorsJson = JSON.stringify(openGraphSelectors);

    return `
import asyncio
import json
import sys
from browser_use import Agent

async def extract_structured_data():
    agent = Agent()

    try:
        session_id = "${sessionId}"

        ${waitForSelector ? `
        # Wait for selector if specified
        await agent.browser.wait_for_selector("${waitForSelector}", timeout=${timeout})
        ` : ''}result = {'jsonLd': [],'microdata': [],'openGraph': {},'metadata': {'jsonLdCount': 0,'microdataCount': 0,'openGraphCount': 0}}

        # Extract JSON-LD data
        jsonld_selectors = ${jsonLdSelectorsJson}
        for selector in jsonld_selectors:
            try:
                scripts = await agent.browser.query_selector_all(selector)
                for script in scripts:
                    content = await script.text_content()
                    if content.strip():
                        try:
                            jsonld_data = json.loads(content)
                            result['jsonLd'].append(jsonld_data)
                        except json.JSONDecodeError:
                            sys.stderr.write(f"Invalid JSON-LD content found\n")except Exception as e:sys.stderr.write(f"Error extracting JSON-LD with selector {selector}: {str(e)}\n")

        result['metadata']['jsonLdCount'] = len(result['jsonLd'])# Extract Microdatamicrodata_selectors = ${microdataSelectorsJson}
        for selector in microdata_selectors:
            try:
                elements = await agent.browser.query_selector_all(selector)
                for element in elements:
                    microdata_item = {}

                    # Get itemtype
                    itemtype = await element.get_attribute('itemtype')if itemtype:microdata_item['@type'] = itemtype# Get itemprop elementsprops = await element.query_selector_all('[itemprop]')for prop in props:prop_name = await prop.get_attribute('itemprop')prop_value = await prop.text_content()# Check for special attributes
                        if await prop.tag_name() == 'META':prop_value = await prop.get_attribute('content')elif await prop.tag_name() == 'A':prop_value = await prop.get_attribute('href')elif await prop.tag_name() == 'IMG':prop_value = await prop.get_attribute('src')if prop_name and prop_value:microdata_item[prop_name] = prop_value.strip()

                    if microdata_item:
                        result['microdata'].append(microdata_item)

            except Exception as e:
                sys.stderr.write(f"Error extracting microdata with selector {selector}: {str(e)}\n")

        result['metadata']['microdataCount'] = len(result['microdata'])# Extract OpenGraph dataog_selectors = ${openGraphSelectorsJson}
        for selector in og_selectors:
            try:
                meta_tags = await agent.browser.query_selector_all(selector)
                for meta in meta_tags:
                    property_name = await meta.get_attribute('property')content = await meta.get_attribute('content')if property_name and content:result['openGraph'][property_name] = content

            except Exception as e:
                sys.stderr.write(f"Error extracting OpenGraph with selector {selector}: {str(e)}\n")

        result['metadata']['openGraphCount'] = len(result['openGraph'])

        print(json.dumps(result))

    except Exception as e:
        sys.stderr.write(f"Structured data extraction error: {str(e)}\n")
        sys.exit(1)

asyncio.run(extract_structured_data())
`;
  }

  /**
   * Generate Python script for XPath extraction
   */
  private generateXPathExtractionScript(
    sessionId: string,
    xpaths: string[],
    extractAttributes: boolean,
    waitForSelector?: string,
    timeout: number = 30000,
  ): string {
    const xpathsJson = JSON.stringify(xpaths);

    return `
import asyncio
import json
import sys
from browser_use import Agent

async def extract_xpath():
    agent = Agent()

    try:
        session_id = "${sessionId}"
        xpaths = ${xpathsJson}
        extract_attributes = ${extractAttributes}

        ${waitForSelector ? `
        # Wait for selector if specified
        await agent.browser.wait_for_selector("${waitForSelector}", timeout=${timeout})
        ` : ''}results = []for xpath in xpaths:
            try:
                # Use XPath to find elements
                xpath_result = await agent.browser.evaluate(f'''
                    () => {{
                        const xpath = "{xpath}";
                        const result = document.evaluate(
                            xpath,
                            document,
                            null,
                            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                            null
                        );

                        const values = [];
                        for (let i = 0; i < result.snapshotLength; i++) {{
                            const node = result.snapshotItem(i);
                            if (node.nodeType === Node.TEXT_NODE) {{
                                values.push(node.textContent.trim());
                            }} else if (node.nodeType === Node.ATTRIBUTE_NODE) {{
                                values.push(node.value);
                            }} else if (node.nodeType === Node.ELEMENT_NODE) {{
                                if ({extractAttributes ? 'true' : 'false'}) {{// Extract attributesconst attrs = {{}};
                                    for (let attr of node.attributes) {{
                                        attrs[attr.name] = attr.value;
                                    }}
                                    values.push(attrs);
                                }} else {{
                                    // Extract text content
                                    values.push(node.textContent.trim());
                                }}
                            }}
                        }}

                        return values;
                    }}
                ''')xpath_data = {'xpath': xpath,'results': xpath_result,'count': len(xpath_result)
                }

                results.append(xpath_data)

            except Exception as e:
                sys.stderr.write(f"Error extracting XPath {xpath}: {str(e)}\n")
                results.append({
                    'xpath': xpath,'results': [],'count': 0
                })

        print(json.dumps(results))

    except Exception as e:
        sys.stderr.write(f"XPath extraction error: {str(e)}\n")
        sys.exit(1)

asyncio.run(extract_xpath())
";
  }

  /**
   * Convert table data to CSV format
   */
  private convertTableToCSV(tableData: ExtractedTableData): string {
    const { headers, rows } = tableData;

    const csvLines: string[] = [];

    // Add headers
    if (headers.length > 0) {
      csvLines.push(headers.map(this.escapeCsvValue).join(','));
    }

    // Add data rows
    for (const row of rows) {
      const values = headers.map(header => this.escapeCsvValue(String(row[header] ?? '')));
      csvLines.push(values.join(','));
    }

    return csvLines.join('\n');
  }

  /**
   * Escape CSV values (handle quotes and commas)
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Calculate average dimensions from image data
   */
  private calculateAverageDimensions(images: ExtractedImageData[]): { width: number; height: number } | undefined {
    const imagesWithDimensions = images.filter(
      img => img.metadata?.width && img.metadata?.height
    );

    if (imagesWithDimensions.length === 0) {
      return undefined;
    }

    const totalWidth = imagesWithDimensions.reduce(
      (sum, img) => sum + (img.metadata?.width ?? 0),
      0
    );
    const totalHeight = imagesWithDimensions.reduce(
      (sum, img) => sum + (img.metadata?.height ?? 0),
      0
    );

    return {
      width: Math.round(totalWidth / imagesWithDimensions.length),
      height: Math.round(totalHeight / imagesWithDimensions.length),
    };
  }

  /**
   * Execute Python script with browser-use library
   */
  private async executePythonScript(script: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const scriptFile = path.join(
        this.tempDirectory,
        `extraction_script_${Date.now()}_${Math.random().toString(36).substring(7)}.py`,
      );

      // Write script to temporary file
      fs.writeFile(scriptFile, script)
        .then(() => {
          // Execute Python script
          const childProcess = spawn(this.pythonExecutable, [scriptFile], {
            cwd: this.browserUsePath,
            env: {
              ...process.env,
              PYTHONPATH: this.browserUsePath,
            },
          });

          let stdout = '';let stderr = '';childProcess.stdout.on('data', (data: Buffer) => {stdout += data.toString();});

          childProcess.stderr.on('data', (data: Buffer) => {stderr += data.toString();});

          childProcess.on('close', async (code) => {// Cleanup script filetry {
              await fs.unlink(scriptFile);
            } catch (cleanupError) {
              this.logger.warn('Failed to cleanup script file', cleanupError);
            }

            if (code === 0) {
              resolve({
                success: true,
                output: stdout,
              });
            } else {
              resolve({
                success: false,
                output: stdout,
                error: stderr || `Process exited with code ${code}`,
              });
            }
          });

          childProcess.on('error', async (error) => {
            // Cleanup script file
            try {
              await fs.unlink(scriptFile);
            } catch (cleanupError) {
              this.logger.warn('Failed to cleanup script file', cleanupError);
            }

            resolve({
              success: false,
              output: '',
              error: error instanceof Error ? error.message : String(error),
            });
          });
        })
        .catch((error) => {
          resolve({
            success: false,
            output: '',
            error: `Failed to write script file: ${error instanceof Error ? error.message : String(error)}`,
          });
        });
    });
  }

  /**
   * Initialize workspace directories
   */
  private async initializeWorkspace(): Promise<void> {
    try {
      await fs.mkdir(this.workingDirectory, { recursive: true });
      await fs.mkdir(this.tempDirectory, { recursive: true });

      this.logger.log('Extraction workspace initialized', {
        workingDirectory: this.workingDirectory,
        tempDirectory: this.tempDirectory,
        browserUsePath: this.browserUsePath,
      });
    } catch (error) {
      throw new Error(
        `Failed to initialize extraction workspace: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}