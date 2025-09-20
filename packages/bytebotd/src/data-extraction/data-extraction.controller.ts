import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  UseInterceptors,
  Get,
  Query,
} from '@nestjs/common';import {ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';import { EnterpriseRateLimitGuard } from '../common/guards/rate-limit.guard';import { SecuritySanitizationPipes } from '../common/pipes/security-sanitization.pipe';import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';import {ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';import { RolesGuard } from '../auth/guards/roles.guard';import {OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';import { DataExtractionService } from './data-extraction.service';import {DataExtractionDto,
  MultiSelectorExtractionDto,
  DataExtractionType,
  ExtractionOutputFormat
} from './dto/data-extraction.dto';import {DataExtractionResponseDto,
  MultiExtractionResponseDto
} from './dto/extraction-response.dto';/*** Data Extraction Controller
 *
 * Provides enterprise-grade APIs for automated web data extraction including:
 * - Table data extraction with header detection
 * - List extraction with nested support
 * - Text content extraction with pattern matching
 * - Link and image extraction with metadata
 * - Custom pattern extraction with CSS selectors
 * - Structured data extraction (JSON-LD, microdata)
 * - Multi-format output support (JSON, CSV, XML, YAML)
 * - Pagination and infinite scroll handling
 *
 * Security Features:
 * - JWT authentication and RBAC authorization
 * - Input sanitization and XSS prevention
 * - Rate limiting with suspicious activity detection
 * - Comprehensive audit logging
 * - Safe data serialization and output
 */
@ApiTags('Data Extraction API')@Controller('data-extraction')@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')export class DataExtractionController {private readonly logger = new Logger(DataExtractionController.name);

  constructor(private readonly dataExtractionService: DataExtractionService) {}

  /**
   * Extract data from web page
   *
   * Universal endpoint for extracting various types of data from web pages
   * including tables, lists, text, links, images, and custom patterns.
   * Supports multiple output formats and comprehensive configuration options.
   *
   * @param params - Data extraction parameters
   * @param user - Authenticated user context
   * @returns Promise<DataExtractionResponseDto> - Extracted data and metadata
   */
  @Post('extract')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract data from web page',description: 'Extract various types of data from web pages including tables, lists, text, links, images, and custom patterns. Supports multiple output formats and advanced configuration.',operationId: 'extractData',})@ApiResponse({
    status: 200,
    description: 'Data extraction completed successfully',type: DataExtractionResponseDto,})
  @ApiResponse({
    status: 400,
    description: 'Invalid extraction parameters or unsupported extraction type',})@ApiResponse({
    status: 401,
    description: 'Authentication required',})@ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',})@ApiResponse({
    status: 404,
    description: 'Target elements not found on page',})@ApiResponse({
    status: 408,
    description: 'Extraction timeout exceeded',})@ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async extractData(
    @Body() params: DataExtractionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<DataExtractionResponseDto> {
    const operationId = `extract_${params.extractionType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;const startTime = Date.now();try {
      this.logger.log(
        `[${operationId}] Data extraction request: ${params.extractionType}`,{operationId,
          extractionType: params.extractionType,
          selector: params.selector,
          url: params.url,
          outputFormat: params.config?.outputFormat,
          userId: user.id,
          username: user.username,
          userRole: user.role,
        },
      );

      const result = await this.dataExtractionService.extractData(params);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Data extraction completed successfully (${processingTime}ms)`,{operationId,
          extractionType: params.extractionType,
          itemCount: result.itemCount,
          processingTime,
          success: result.success,
          userId: user.id,
          username: user.username,
        },
      );

      return result;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = this.getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Data extraction failed: ${errorMessage} (${processingTime}ms)`,
        this.getErrorStack(error),
        {
          operationId,
          extractionType: params.extractionType,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',userId: user.id,username: user.username,
        },
      );

      // Map specific errors to appropriate HTTP status codes
      if (errorMessage.includes('not found') || errorMessage.includes('elements not found')) {
        throw new HttpException(
          `Target elements not found: ${errorMessage}`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        throw new HttpException(
          `Extraction timeout: ${errorMessage}`,HttpStatus.REQUEST_TIMEOUT,);
      }

      throw new HttpException(
        `Data extraction failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Extract multiple data sets
   *
   * Performs multiple data extraction operations on a single page or across
   * multiple pages. Supports parallel execution for performance optimization
   * and provides comprehensive results aggregation.
   *
   * @param params - Multi-extraction parameters
   * @param user - Authenticated user context
   * @returns Promise<MultiExtractionResponseDto> - Aggregated extraction results
   */
  @Post('extract-multiple')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract multiple data sets',description: 'Perform multiple data extraction operations on a single page or across multiple pages. Supports parallel execution and result aggregation.',operationId: 'extractMultipleData',})@ApiResponse({
    status: 200,
    description: 'Multi-extraction completed successfully',type: MultiExtractionResponseDto,})
  @ApiResponse({
    status: 400,
    description: 'Invalid multi-extraction parameters',})@ApiResponse({
    status: 401,
    description: 'Authentication required',})@ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async extractMultiple(
    @Body() params: MultiSelectorExtractionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<MultiExtractionResponseDto> {
    const operationId = `multi_extract_${Date.now()}_${Math.random().toString(36).substring(7)}`;this.logger.log(`[${operationId}] Multi-extraction request`,
      {
        operationId,
        extractionCount: params.extractions.length,
        parallel: params.parallel,
        url: params.url,
        userId: user.id,
        username: user.username,
      },
    );

    const result = await this.dataExtractionService.extractMultiple(params);
    return result;
  }

  /**
   * Extract table data
   *
   * Specialized endpoint for extracting table data with advanced configuration
   * options including header detection, column filtering, and row limiting.
   *
   * @param selector - CSS selector for target table(s)
   * @param includeHeaders - Whether to include table headers
   * @param maxRows - Maximum number of rows to extract
   * @param outputFormat - Output format for extracted data
   * @param user - Authenticated user context
   * @returns Promise<DataExtractionResponseDto> - Extracted table data
   */
  @Post('extract-tables')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract table data',description: 'Extract table data with advanced configuration options including header detection, column filtering, and row limiting.',operationId: 'extractTables',})@ApiResponse({
    status: 200,
    description: 'Table extraction completed successfully',type: DataExtractionResponseDto,})
  async extractTables(
    @Body('selector') selector?: string,@Body('includeHeaders') includeHeaders: boolean = true,@Body('maxRows') maxRows?: number,@Body('outputFormat') outputFormat: ExtractionOutputFormat = ExtractionOutputFormat.JSON,@CurrentUser() user: ByteBotdUser,): Promise<DataExtractionResponseDto> {
    const params: DataExtractionDto = {
      extractionType: DataExtractionType.TABLE,
      selector: selector || 'table',tableConfig: {includeHeaders,
        maxRows,
        skipEmptyRows: true
      },
      config: {
        outputFormat,
        includeMetadata: true
      }
    };

    return this.extractData(params, user);
  }

  /**
   * Extract text content
   *
   * Specialized endpoint for extracting text content with pattern matching,
   * formatting preservation, and length filtering options.
   *
   * @param selector - CSS selector for target element(s)
   * @param patterns - Text patterns to extract (regex)
   * @param preserveFormatting - Whether to preserve text formatting
   * @param minLength - Minimum text length to extract
   * @param user - Authenticated user context
   * @returns Promise<DataExtractionResponseDto> - Extracted text content
   */
  @Post('extract-text')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract text content',description: 'Extract text content with pattern matching, formatting preservation, and length filtering options.',operationId: 'extractText',})@ApiResponse({
    status: 200,
    description: 'Text extraction completed successfully',type: DataExtractionResponseDto,})
  async extractText(
    @Body('selector') selector?: string,@Body('patterns') patterns?: string[],@Body('preserveFormatting') preserveFormatting: boolean = false,@Body('minLength') minLength: number = 1,@CurrentUser() user: ByteBotdUser,): Promise<DataExtractionResponseDto> {
    const params: DataExtractionDto = {
      extractionType: DataExtractionType.TEXT,
      selector: selector || 'body',textConfig: {patterns,
        preserveFormatting,
        minLength,
        visibleOnly: true
      },
      config: {
        includeMetadata: true
      }
    };

    return this.extractData(params, user);
  }

  /**
   * Extract links
   *
   * Specialized endpoint for extracting links with filtering options for
   * internal/external links, attribute extraction, and URL pattern matching.
   *
   * @param selector - CSS selector for target link elements
   * @param internalOnly - Extract only internal links
   * @param includeAttributes - Link attributes to extract
   * @param urlFilter - URL pattern filter (regex)
   * @param user - Authenticated user context
   * @returns Promise<DataExtractionResponseDto> - Extracted link data
   */
  @Post('extract-links')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract links',description: 'Extract links with filtering options for internal/external links, attribute extraction, and URL pattern matching.',operationId: 'extractLinks',})@ApiResponse({
    status: 200,
    description: 'Link extraction completed successfully',type: DataExtractionResponseDto,})
  async extractLinks(
    @Body('selector') selector?: string,@Body('internalOnly') internalOnly: boolean = false,@Body('includeAttributes') includeAttributes?: string[],@Body('urlFilter') urlFilter?: string,@CurrentUser() user: ByteBotdUser,): Promise<DataExtractionResponseDto> {
    const params: DataExtractionDto = {
      extractionType: DataExtractionType.LINKS,
      selector: selector || 'a[href]',linkConfig: {internalOnly,
        includeAttributes: includeAttributes || ['title', 'target', 'rel'],includeLinkText: true,urlFilter
      },
      config: {
        includeMetadata: true
      }
    };

    return this.extractData(params, user);
  }

  /**
   * Extract images
   *
   * Specialized endpoint for extracting image data with dimension filtering,
   * attribute extraction, and optional base64 data inclusion.
   *
   * @param selector - CSS selector for target image elements
   * @param includeImageData - Whether to include base64 image data
   * @param minWidth - Minimum image width
   * @param minHeight - Minimum image height
   * @param user - Authenticated user context
   * @returns Promise<DataExtractionResponseDto> - Extracted image data
   */
  @Post('extract-images')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract images',description: 'Extract image data with dimension filtering, attribute extraction, and optional base64 data inclusion.',operationId: 'extractImages',})@ApiResponse({
    status: 200,
    description: 'Image extraction completed successfully',type: DataExtractionResponseDto,})
  async extractImages(
    @Body('selector') selector?: string,@Body('includeImageData') includeImageData: boolean = false,@Body('minWidth') minWidth?: number,@Body('minHeight') minHeight?: number,@CurrentUser() user: ByteBotdUser,): Promise<DataExtractionResponseDto> {
    const params: DataExtractionDto = {
      extractionType: DataExtractionType.IMAGES,
      selector: selector || 'img',imageConfig: {includeImageData,
        includeAttributes: ['alt', 'title', 'width', 'height', 'loading'],minDimensions: minWidth && minHeight ? { width: minWidth, height: minHeight } : undefined},
      config: {
        includeMetadata: true
      }
    };

    return this.extractData(params, user);
  }

  /**
   * Extract custom pattern data
   *
   * Flexible endpoint for extracting data using custom CSS selectors with
   * configurable attribute and content extraction options.
   *
   * @param selector - CSS selector for target elements
   * @param attributes - Element attributes to extract
   * @param includeText - Whether to extract element text content
   * @param includeHtml - Whether to extract element HTML content
   * @param user - Authenticated user context
   * @returns Promise<DataExtractionResponseDto> - Extracted custom data
   */
  @Post('extract-custom')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Extract custom pattern data',description: 'Extract data using custom CSS selectors with configurable attribute and content extraction options.',operationId: 'extractCustomPattern',})@ApiResponse({
    status: 200,
    description: 'Custom pattern extraction completed successfully',type: DataExtractionResponseDto,})
  async extractCustomPattern(
    @Body('selector') selector: string,@Body('attributes') attributes?: string[],@Body('includeText') includeText: boolean = true,@Body('includeHtml') includeHtml: boolean = false,@CurrentUser() user: ByteBotdUser,): Promise<DataExtractionResponseDto> {
    const params: DataExtractionDto = {
      extractionType: DataExtractionType.CUSTOM_PATTERN,
      selector,
      customConfig: {
        selector,
        attributes,
        includeText,
        includeHtml,
        includeChildren: false
      },
      config: {
        includeMetadata: true
      }
    };

    return this.extractData(params, user);
  }

  /**
   * Get extraction formats
   *
   * Returns supported data extraction types and output formats for client
   * applications to build dynamic extraction interfaces.
   *
   * @returns Supported extraction types and output formats
   */
  @Get('formats')@OperatorOrAdmin()@ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get supported extraction formats',description: 'Returns supported data extraction types and output formats for building dynamic extraction interfaces.',operationId: 'getExtractionFormats',})@ApiResponse({
    status: 200,
    description: 'Extraction formats retrieved successfully',schema: {type: 'object',properties: {extractionTypes: {
          type: 'array',items: { type: 'string', enum: Object.values(DataExtractionType) }},outputFormats: {
          type: 'array',items: { type: 'string', enum: Object.values(ExtractionOutputFormat) }}}
    }
  })
  async getExtractionFormats(): Promise<{
    extractionTypes: DataExtractionType[];
    outputFormats: ExtractionOutputFormat[];
  }> {
    return {
      extractionTypes: Object.values(DataExtractionType),
      outputFormats: Object.values(ExtractionOutputFormat)
    };
  }

  // Helper methods for error handling

  private getErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {return (error as { message: string }).message;}
    return typeof error === 'string' ? error : 'Unknown error';}private getErrorStack(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'stack' in error) {
      return (error as { stack?: string }).stack;
    }
    return undefined;
  }
}