import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';import {ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';import { BrowserInteractionService } from './browser-interaction.service';import {ClickInteractionDto,
  TypeInteractionDto,
  ScrollInteractionDto,
  HoverInteractionDto,
  ElementFindDto,
  ElementInfoDto,
  PageSourceDto,
  InteractionResultDto,
  ElementInfoResultDto,
  ElementFindResultDto,
  PageSourceResultDto,
  SelectorStrategy,
  ElementInfoType,
} from './dto/browser-interaction.dto';/*** Browser Interaction Controller
 *
 * Provides simple, focused REST API endpoints for individual browser interactions:
 * - Click actions (left, right, double, middle)
 * - Text typing with configurable options
 * - Scrolling with direction and distance control
 * - Element hovering
 * - Element finding and information retrieval
 * - Page source extraction
 *
 * These endpoints complement the enhanced browser automation API by providing
 * simpler, more focused endpoints for common browser interactions that don't
 * require the complexity of the full automation system.
 */
@ApiTags('Browser Interaction')@Controller('browser')export class BrowserInteractionController {private readonly logger = new Logger(BrowserInteractionController.name);

  constructor(private readonly browserInteractionService: BrowserInteractionService) {}

  // ===========================
  // ELEMENT INTERACTION ENDPOINTS
  // ===========================

  /**
   * Click element by selector or coordinates
   */
  @Post('click')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Click element',description: 'Click an element by selector or coordinates with configurable click type',})@ApiBody({ type: ClickInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Click interaction completed',type: InteractionResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',
  })
  async clickElement(@Body() clickDto: ClickInteractionDto): Promise<InteractionResultDto> {
    this.logger.log(`Click element request for session: ${clickDto.sessionId}`, {selector: clickDto.selector,coordinates: clickDto.x !== undefined ? { x: clickDto.x, y: clickDto.y } : undefined,
      clickType: clickDto.clickType,
    });

    try {
      const result = await this.browserInteractionService.click(clickDto);

      this.logger.log(`Click element completed: ${result.interactionId}`, {success: result.success,durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Click element failed for session: ${clickDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Click interaction failed',error: error instanceof Error ? error.message : String(error),sessionId: clickDto.sessionId,
      });
    }
  }

  /**
   * Type text into element
   */
  @Post('type')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Type text',description: 'Type text into an element with configurable typing options',})@ApiBody({ type: TypeInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Type interaction completed',type: InteractionResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',
  })
  async typeText(@Body() typeDto: TypeInteractionDto): Promise<InteractionResultDto> {
    this.logger.log(`Type text request for session: ${typeDto.sessionId}`, {selector: typeDto.selector,textLength: typeDto.text.length,
      clearFirst: typeDto.clearFirst,
    });

    try {
      const result = await this.browserInteractionService.type(typeDto);

      this.logger.log(`Type text completed: ${result.interactionId}`, {success: result.success,durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Type text failed for session: ${typeDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Type interaction failed',error: error instanceof Error ? error.message : String(error),sessionId: typeDto.sessionId,
      });
    }
  }

  /**
   * Scroll page or element
   */
  @Post('scroll')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Scroll page or element',description: 'Scroll the page or a specific element with direction and distance control',})@ApiBody({ type: ScrollInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scroll interaction completed',type: InteractionResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',
  })
  async scrollElement(@Body() scrollDto: ScrollInteractionDto): Promise<InteractionResultDto> {
    this.logger.log(`Scroll request for session: ${scrollDto.sessionId}`, {selector: scrollDto.selector,direction: scrollDto.direction,
      distance: scrollDto.distance,
    });

    try {
      const result = await this.browserInteractionService.scroll(scrollDto);

      this.logger.log(`Scroll completed: ${result.interactionId}`, {success: result.success,durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Scroll failed for session: ${scrollDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Scroll interaction failed',error: error instanceof Error ? error.message : String(error),sessionId: scrollDto.sessionId,
      });
    }
  }

  /**
   * Hover over element
   */
  @Post('hover')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Hover over element',description: 'Hover over an element with configurable hover duration',})@ApiBody({ type: HoverInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hover interaction completed',type: InteractionResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',
  })
  async hoverElement(@Body() hoverDto: HoverInteractionDto): Promise<InteractionResultDto> {
    this.logger.log(`Hover request for session: ${hoverDto.sessionId}`, {selector: hoverDto.selector,duration: hoverDto.duration,
    });

    try {
      const result = await this.browserInteractionService.hover(hoverDto);

      this.logger.log(`Hover completed: ${result.interactionId}`, {success: result.success,durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Hover failed for session: ${hoverDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Hover interaction failed',error: error instanceof Error ? error.message : String(error),sessionId: hoverDto.sessionId,
      });
    }
  }

  // ===========================
  // ELEMENT QUERY ENDPOINTS
  // ===========================

  /**
   * Find elements by selector
   */
  @Get('element/find')@ApiOperation({summary: 'Find elements',description: 'Find elements by selector with optional screenshot capture',})@ApiQuery({
    name: 'sessionId',description: 'Browser session identifier',example: 'session_abc123',})@ApiQuery({
    name: 'selector',description: 'Element selector',example: 'button.primary',})@ApiQuery({
    name: 'selectorType',description: 'Selector strategy type',enum: SelectorStrategy,required: false,
  })
  @ApiQuery({
    name: 'findAll',description: 'Find all matching elements',type: Boolean,required: false,
  })
  @ApiQuery({
    name: 'waitForElement',description: 'Wait for element to appear',type: Boolean,required: false,
  })
  @ApiQuery({
    name: 'timeout',description: 'Wait timeout in milliseconds',type: Number,required: false,
  })
  @ApiQuery({
    name: 'includeScreenshot',description: 'Include element screenshot',type: Boolean,required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Element search completed',type: ElementFindResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',})async findElements(
    @Query('sessionId') sessionId: string,@Query('selector') selector: string,@Query('selectorType') selectorType?: SelectorStrategy,@Query('findAll') findAll?: boolean,@Query('waitForElement') waitForElement?: boolean,@Query('timeout') timeout?: number,@Query('includeScreenshot') includeScreenshot?: boolean,
  ): Promise<ElementFindResultDto> {
    this.logger.log(`Find elements request for session: ${sessionId}`, {selector,selectorType,
      findAll,
    });

    try {
      const findDto: ElementFindDto = {
        sessionId,
        selector,
        selectorType: selectorType ?? SelectorStrategy.CSS,
        findAll: findAll ?? false,
        waitForElement: waitForElement !== undefined ? waitForElement : true,
        timeout: timeout ?? 5000,
        includeScreenshot: includeScreenshot ?? false,
      };

      const result = await this.browserInteractionService.findElements(findDto);

      this.logger.log(`Find elements completed for session: ${sessionId}`, {count: result.count,});

      return result;
    } catch (error) {
      this.logger.error(
        `Find elements failed for session: ${sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Element search failed',error: error instanceof Error ? error.message : String(error),sessionId,
      });
    }
  }

  /**
   * Get element information
   */
  @Get('element/info')@ApiOperation({summary: 'Get element information',description: 'Get detailed information about an element including attributes, styles, and properties',})@ApiQuery({
    name: 'sessionId',description: 'Browser session identifier',example: 'session_abc123',})@ApiQuery({
    name: 'selector',description: 'Element selector',example: '#main-content',})@ApiQuery({
    name: 'selectorType',description: 'Selector strategy type',enum: SelectorStrategy,required: false,
  })
  @ApiQuery({
    name: 'infoType',description: 'Information detail level',enum: ElementInfoType,required: false,
  })
  @ApiQuery({
    name: 'includeStyles',description: 'Include computed styles',type: Boolean,required: false,
  })
  @ApiQuery({
    name: 'includeAttributes',description: 'Include element attributes',type: Boolean,required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Element information retrieved',type: ElementInfoResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',})async getElementInfo(
    @Query('sessionId') sessionId: string,@Query('selector') selector: string,@Query('selectorType') selectorType?: SelectorStrategy,@Query('infoType') infoType?: ElementInfoType,@Query('includeStyles') includeStyles?: boolean,@Query('includeAttributes') includeAttributes?: boolean,
  ): Promise<ElementInfoResultDto> {
    this.logger.log(`Get element info request for session: ${sessionId}`, {selector,selectorType,
      infoType,
    });

    try {
      const infoDto: ElementInfoDto = {
        sessionId,
        selector,
        selectorType: selectorType ?? SelectorStrategy.CSS,
        infoType: infoType ?? ElementInfoType.BASIC,
        includeStyles: includeStyles ?? false,
        includeAttributes: includeAttributes !== undefined ? includeAttributes : true,
      };

      const result = await this.browserInteractionService.getElementInfo(infoDto);

      this.logger.log(`Get element info completed for session: ${sessionId}`, {found: result.found,tagName: result.tagName,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Get element info failed for session: ${sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Element info retrieval failed',error: error instanceof Error ? error.message : String(error),sessionId,
      });
    }
  }

  /**
   * Get element text content
   */
  @Get('element/text')@ApiOperation({summary: 'Get element text content',description: 'Extract text content from an element',})@ApiQuery({
    name: 'sessionId',description: 'Browser session identifier',example: 'session_abc123',})@ApiQuery({
    name: 'selector',description: 'Element selector',example: 'h1.title',})@ApiQuery({
    name: 'selectorType',description: 'Selector strategy type',enum: SelectorStrategy,required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Element text content extracted',schema: {type: 'object',properties: {sessionId: { type: 'string' },selector: { type: 'string' },found: { type: 'boolean' },textContent: { type: 'string' },innerText: { type: 'string' },length: { type: 'number' },timestamp: { type: 'string', format: 'date-time' },},},
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',})async getElementText(
    @Query('sessionId') sessionId: string,@Query('selector') selector: string,@Query('selectorType') selectorType?: SelectorStrategy,
  ): Promise<{
    sessionId: string;
    selector: string;
    found: boolean;
    textContent?: string;
    innerText?: string;
    length?: number;
    timestamp: Date;
  }> {
    this.logger.log(`Get element text request for session: ${sessionId}`, {selector,selectorType,
    });

    try {
      const infoDto: ElementInfoDto = {
        sessionId,
        selector,
        selectorType: selectorType ?? SelectorStrategy.CSS,
        infoType: ElementInfoType.BASIC,
        includeStyles: false,
        includeAttributes: false,
      };

      const result = await this.browserInteractionService.getElementInfo(infoDto);

      const textResult = {
        sessionId,
        selector,
        found: result.found,
        textContent: result.textContent,
        innerText: result.textContent, // Using textContent as innerText equivalent
        length: result.textContent?.length || 0,
        timestamp: new Date(),
      };

      this.logger.log(`Get element text completed for session: ${sessionId}`, {found: result.found,textLength: textResult.length,
      });

      return textResult;
    } catch (error) {
      this.logger.error(
        `Get element text failed for session: ${sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Element text extraction failed',error: error instanceof Error ? error.message : String(error),sessionId,
      });
    }
  }

  // ===========================
  // PAGE SOURCE ENDPOINTS
  // ===========================

  /**
   * Get page HTML source
   */
  @Get('page/source')@ApiOperation({summary: 'Get page source',description: 'Extract the HTML source code of the current page',})@ApiQuery({
    name: 'sessionId',description: 'Browser session identifier',example: 'session_abc123',})@ApiQuery({
    name: 'formatted',description: 'Return formatted HTML',type: Boolean,required: false,
  })
  @ApiQuery({
    name: 'includeMetadata',description: 'Include page metadata',type: Boolean,required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Page source extracted',type: PageSourceResultDto,})
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters',})@ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Browser session not found',})async getPageSource(
    @Query('sessionId') sessionId: string,@Query('formatted') formatted?: boolean,@Query('includeMetadata') includeMetadata?: boolean,
  ): Promise<PageSourceResultDto> {
    this.logger.log(`Get page source request for session: ${sessionId}`, {formatted,includeMetadata,
    });

    try {
      const sourceDto: PageSourceDto = {
        sessionId,
        formatted: formatted ?? false,
        includeMetadata: includeMetadata !== undefined ? includeMetadata : true,
      };

      const result = await this.browserInteractionService.getPageSource(sourceDto);

      this.logger.log(`Get page source completed for session: ${sessionId}`, {sourceLength: result.length,url: result.url,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Get page source failed for session: ${sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Page source extraction failed',error: error instanceof Error ? error.message : String(error),sessionId,
      });
    }
  }

  // ===========================
  // HEALTH AND STATUS ENDPOINTS
  // ===========================

  /**
   * Get browser interaction capabilities
   */
  @Get('capabilities')@ApiOperation({summary: 'Get browser interaction capabilities',description: 'Get information about available browser interaction capabilities',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Browser interaction capabilities',schema: {type: 'object',properties: {interactions: {
          type: 'array',items: { type: 'string' },},selectorTypes: {
          type: 'array',items: { type: 'string' },},clickTypes: {
          type: 'array',items: { type: 'string' },},scrollDirections: {
          type: 'array',items: { type: 'string' },},infoTypes: {
          type: 'array',items: { type: 'string' },},version: { type: 'string' },timestamp: { type: 'string', format: 'date-time' },},},
  })
  async getCapabilities(): Promise<{
    interactions: string[];
    selectorTypes: string[];
    clickTypes: string[];
    scrollDirections: string[];
    infoTypes: string[];
    version: string;
    timestamp: Date;
  }> {
    this.logger.log('Get browser interaction capabilities request');const capabilities = {interactions: ['click', 'type', 'scroll', 'hover'],selectorTypes: Object.values(SelectorStrategy),clickTypes: ['left', 'right', 'double', 'middle'],scrollDirections: ['up', 'down', 'left', 'right', 'top', 'bottom'],infoTypes: Object.values(ElementInfoType),version: '1.0.0',timestamp: new Date(),};

    this.logger.log('Browser interaction capabilities retrieved');

    return capabilities;
  }
}