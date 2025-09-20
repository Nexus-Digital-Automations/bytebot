import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';import { v4 as uuidv4 } from 'uuid';import { BrowserUseService } from './browser-use.service';import { BrowserSessionService } from './browser-session.service';import {ClickInteractionDto,
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
  ClickType,
  ElementInfoType,
} from './dto/browser-interaction.dto';

/**
 * Browser Interaction Service
 *
 * Provides simplified, individual browser interaction methods for:
 * - Click actions (left, right, double, middle)
 * - Text typing with configurable options
 * - Scrolling with direction and distance control
 * - Element hovering
 * - Element finding and information retrieval
 * - Page source extraction
 *
 * This service complements the enhanced browser automation service by providing
 * simpler, more focused endpoints for common browser interactions.
 */
@Injectable()
export class BrowserInteractionService {
  private readonly logger = new Logger(BrowserInteractionService.name);

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly browserSessionService: BrowserSessionService,
  ) {}

  /**
   * Perform click interaction
   */
  async click(clickDto: ClickInteractionDto): Promise<InteractionResultDto> {
    const startTime = new Date();
    const interactionId = uuidv4();

    this.logger.log(`Performing click interaction: ${interactionId}`, {
      sessionId: clickDto.sessionId,
      selector: clickDto.selector,
      coordinates: clickDto.x !== undefined ? { x: clickDto.x, y: clickDto.y } : undefined,
      clickType: clickDto.clickType,
    });

    try {
      // Validate session exists
      await this.validateSession(clickDto.sessionId);

      // Validate that either selector or coordinates are provided
      if (!clickDto.selector && (clickDto.x === undefined || clickDto.y === undefined)) {
        throw new BadRequestException('Either selector or coordinates (x, y) must be provided');}// Create DOM interaction DTO for enhanced service
      const domInteractionDto = {
        sessionId: clickDto.sessionId,
        action: this.mapClickTypeToDOMAction(clickDto.clickType),
        selector: clickDto.selector ? {
          type: this.mapSelectorStrategy(clickDto.selectorType),
          value: clickDto.selector,
          options: {
            timeout: clickDto.timeout,
          },
        } : undefined,
        coordinates: (clickDto.x !== undefined && clickDto.y !== undefined) ? {
          x: clickDto.x,
          y: clickDto.y,
        } : undefined,
        waitForElement: clickDto.waitForElement,
        waitTimeoutMs: clickDto.timeout,
        force: clickDto.force,
      };

      // Use enhanced browser service for actual interaction
      const result = await this.browserUseService.performDOMInteraction(domInteractionDto);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: clickDto.sessionId,
        success: Boolean(result.success),
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: result.errorMessage ?? undefined,
        pageUrl: result.pageUrl ?? '',pageTitle: result.pageTitle ?? '',
      };

      this.logger.log(`Click interaction completed: ${interactionId}`, {success: result.success,durationMs: duration,
      });

      return interactionResult;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.error(`Click interaction failed: ${interactionId}`, error);

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: clickDto.sessionId,
        success: false,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: error instanceof Error ? error.message : String(error),
        pageUrl: '',pageTitle: '',
      };

      return interactionResult;
    }
  }

  /**
   * Perform type interaction
   */
  async type(typeDto: TypeInteractionDto): Promise<InteractionResultDto> {
    const startTime = new Date();
    const interactionId = uuidv4();

    this.logger.log(`Performing type interaction: ${interactionId}`, {
      sessionId: typeDto.sessionId,
      selector: typeDto.selector,
      textLength: typeDto.text.length,
      clearFirst: typeDto.clearFirst,
    });

    try {
      // Validate session exists
      await this.validateSession(typeDto.sessionId);

      // Create DOM interaction DTO for enhanced service
      const domInteractionDto = {
        sessionId: typeDto.sessionId,
        action: 'type' as any,
        selector: {
          type: this.mapSelectorStrategy(typeDto.selectorType),
          value: typeDto.selector,
          options: {
            timeout: typeDto.timeout,
          },
        },
        typing: {
          text: typeDto.text,
          delayMs: typeDto.delay,
          clearFirst: typeDto.clearFirst,
          pressTab: typeDto.pressTab,
          pressEnter: typeDto.pressEnter,
        },
        waitForElement: true,
        waitTimeoutMs: typeDto.timeout,
      };

      // Use enhanced browser service for actual interaction
      const result = await this.browserUseService.performDOMInteraction(domInteractionDto);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: typeDto.sessionId,
        success: result.success,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: result.errorMessage,
        pageUrl: result.pageUrl,
        pageTitle: result.pageTitle,
      };

      this.logger.log(`Type interaction completed: ${interactionId}`, {success: result.success,durationMs: duration,
      });

      return interactionResult;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.error(`Type interaction failed: ${interactionId}`, error);

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: typeDto.sessionId,
        success: false,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: error instanceof Error ? error.message : String(error),
        pageUrl: '',pageTitle: '',
      };

      return interactionResult;
    }
  }

  /**
   * Perform scroll interaction
   */
  async scroll(scrollDto: ScrollInteractionDto): Promise<InteractionResultDto> {
    const startTime = new Date();
    const interactionId = uuidv4();

    this.logger.log(`Performing scroll interaction: ${interactionId}`, {
      sessionId: scrollDto.sessionId,
      selector: scrollDto.selector,
      direction: scrollDto.direction,
      distance: scrollDto.distance,
    });

    try {
      // Validate session exists
      await this.validateSession(scrollDto.sessionId);

      // Create DOM interaction DTO for enhanced service
      const domInteractionDto = {
        sessionId: scrollDto.sessionId,
        action: 'scroll' as any,
        selector: scrollDto.selector ? {
          type: this.mapSelectorStrategy(scrollDto.selectorType),
          value: scrollDto.selector,
        } : undefined,
        scroll: {
          direction: scrollDto.direction,
          distance: scrollDto.distance,
          smooth: scrollDto.smooth,
          coordinates: scrollDto.coordinates,
        },
        waitForElement: !!scrollDto.selector,
        waitTimeoutMs: 5000,
      };

      // Use enhanced browser service for actual interaction
      const result = await this.browserUseService.performDOMInteraction(domInteractionDto);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: scrollDto.sessionId,
        success: result.success,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: result.errorMessage,
        pageUrl: result.pageUrl,
        pageTitle: result.pageTitle,
      };

      this.logger.log(`Scroll interaction completed: ${interactionId}`, {success: result.success,durationMs: duration,
      });

      return interactionResult;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.error(`Scroll interaction failed: ${interactionId}`, error);

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: scrollDto.sessionId,
        success: false,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: error instanceof Error ? error.message : String(error),
        pageUrl: '',pageTitle: '',
      };

      return interactionResult;
    }
  }

  /**
   * Perform hover interaction
   */
  async hover(hoverDto: HoverInteractionDto): Promise<InteractionResultDto> {
    const startTime = new Date();
    const interactionId = uuidv4();

    this.logger.log(`Performing hover interaction: ${interactionId}`, {
      sessionId: hoverDto.sessionId,
      selector: hoverDto.selector,
      duration: hoverDto.duration,
    });

    try {
      // Validate session exists
      await this.validateSession(hoverDto.sessionId);

      // Create DOM interaction DTO for enhanced service
      const domInteractionDto = {
        sessionId: hoverDto.sessionId,
        action: 'hover' as any,
        selector: {
          type: this.mapSelectorStrategy(hoverDto.selectorType),
          value: hoverDto.selector,
          options: {
            timeout: hoverDto.timeout,
          },
        },
        waitForElement: true,
        waitTimeoutMs: hoverDto.timeout,
      };

      // Use enhanced browser service for actual interaction
      const result = await this.browserUseService.performDOMInteraction(domInteractionDto);

      // If hover duration is specified, wait
      if (hoverDto.duration && hoverDto.duration > 0) {
        await new Promise(resolve => setTimeout(resolve, hoverDto.duration));
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: hoverDto.sessionId,
        success: result.success,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: result.errorMessage,
        pageUrl: result.pageUrl,
        pageTitle: result.pageTitle,
      };

      this.logger.log(`Hover interaction completed: ${interactionId}`, {success: result.success,durationMs: duration,
      });

      return interactionResult;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logger.error(`Hover interaction failed: ${interactionId}`, error);

      const interactionResult: InteractionResultDto = {
        interactionId,
        sessionId: hoverDto.sessionId,
        success: false,
        startedAt: startTime,
        completedAt: endTime,
        durationMs: duration,
        errorMessage: error instanceof Error ? error.message : String(error),
        pageUrl: '',pageTitle: '',
      };

      return interactionResult;
    }
  }

  /**
   * Find elements by selector
   */
  async findElements(findDto: ElementFindDto): Promise<ElementFindResultDto> {
    const timestamp = new Date();

    this.logger.log(`Finding elements`, {
      sessionId: findDto.sessionId,
      selector: findDto.selector,
      selectorType: findDto.selectorType,
      findAll: findDto.findAll,
    });

    try {
      // Validate session exists
      await this.validateSession(findDto.sessionId);

      // Create element detection DTO for enhanced service
      const detectionDto = {
        sessionId: findDto.sessionId,
        criteria: {
          strategy: 'selector' as any,selector: {type: this.mapSelectorStrategy(findDto.selectorType),
            value: findDto.selector,
            options: {
              timeout: findDto.timeout,
            },
          },
        },
        waitConfig: findDto.waitForElement ? {
          condition: 'visible' as any,timeoutMs: findDto.timeout,} : undefined,
        includeScreenshot: findDto.includeScreenshot,
        findMultiple: findDto.findAll,
      };

      // Use enhanced browser service for element detection
      const result = await this.browserUseService.detectElements(detectionDto);

      // Convert detected elements to our format
      const elements: ElementInfoResultDto[] = (result.elements as unknown[]).map((element: Record<string, unknown>) => ({
        found: true,
        sessionId: findDto.sessionId,
        tagName: String(element.tagName ?? ''),id: String(element.id ?? ''),className: String(element.className ?? ''),textContent: String(element.textContent ?? ''),innerHTML: String(element.innerHTML ?? ''),outerHTML: String(element.outerHTML ?? ''),attributes: element.attributes as Record<string, string> ?? {},styles: element.styles as Record<string, string> ?? {},
        boundingBox: element.boundingBox as ElementInfoResultDto['boundingBox'],visible: Boolean(element.visible),interactable: Boolean(element.interactable),
        screenshot: String(element.screenshot ?? ''),
        timestamp,
      }));

      const findResult: ElementFindResultDto = {
        elements,
        sessionId: findDto.sessionId,
        count: elements.length,
        selector: findDto.selector,
        selectorType: findDto.selectorType ?? SelectorStrategy.CSS,
        timestamp,
      };

      this.logger.log(`Found ${elements.length} elements`, {sessionId: findDto.sessionId,count: elements.length,
      });

      return findResult;
    } catch (error) {
      this.logger.error(`Element finding failed`, error);// Return empty result on errorconst findResult: ElementFindResultDto = {
        elements: [],
        sessionId: findDto.sessionId,
        count: 0,
        selector: findDto.selector,
        selectorType: findDto.selectorType ?? SelectorStrategy.CSS,
        timestamp,
      };

      return findResult;
    }
  }

  /**
   * Get element information
   */
  async getElementInfo(infoDto: ElementInfoDto): Promise<ElementInfoResultDto> {
    const timestamp = new Date();

    this.logger.log(`Getting element info`, {sessionId: infoDto.sessionId,selector: infoDto.selector,
      infoType: infoDto.infoType,
    });

    try {
      // Validate session exists
      await this.validateSession(infoDto.sessionId);

      // Find the element first
      const findDto: ElementFindDto = {
        sessionId: infoDto.sessionId,
        selector: infoDto.selector,
        selectorType: infoDto.selectorType,
        findAll: false,
        waitForElement: true,
        timeout: 5000,
        includeScreenshot: false,
      };

      const findResult = await this.findElements(findDto);

      if (findResult.count === 0) {
        return {
          found: false,
          sessionId: infoDto.sessionId,
          timestamp,
        };
      }

      // Get the first element
      const element = findResult.elements[0];

      // Enhance with additional info based on infoType
      if (infoDto.infoType === ElementInfoType.FULL || infoDto.includeStyles) {
        // TODO: Add logic to fetch computed styles if needed
        // This would require additional browser automation calls
      }

      this.logger.log(`Element info retrieved successfully`, {sessionId: infoDto.sessionId,tagName: element.tagName,
        visible: element.visible,
      });

      return element;
    } catch (error) {
      this.logger.error(`Element info retrieval failed`, error);return {found: false,
        sessionId: infoDto.sessionId,
        timestamp,
      };
    }
  }

  /**
   * Get page source
   */
  async getPageSource(sourceDto: PageSourceDto): Promise<PageSourceResultDto> {
    const timestamp = new Date();

    this.logger.log(`Getting page source`, {
      sessionId: sourceDto.sessionId,
      formatted: sourceDto.formatted,
      includeMetadata: sourceDto.includeMetadata,
    });

    try {
      // Validate session exists
      await this.validateSession(sourceDto.sessionId);

      // TODO: Implement page source extraction using browser service
      // This might require adding a new method to the enhanced browser service
      // For now, we'll simulate the response structure// Get current page info using existing browser service capabilitiesconst session = await this.browserSessionService.getSessionById(sourceDto.sessionId);

      // Placeholder implementation - in a real scenario, you'd extract the actual HTML
      const sourceResult: PageSourceResultDto = {
        source: '<!DOCTYPE html><html><!-- Page source would be extracted here --></html>',sessionId: sourceDto.sessionId,url: session?.url || '',title: session?.title || '',metadata: sourceDto.includeMetadata ? {charset: 'utf-8',lang: 'en',
          // Add more metadata extraction logic
        } : undefined,
        length: 0, // Would be calculated from actual source
        timestamp,
      };

      // Calculate actual length
      sourceResult.length = sourceResult.source.length;

      this.logger.log(`Page source retrieved successfully`, {sessionId: sourceDto.sessionId,sourceLength: sourceResult.length,
      });

      return sourceResult;
    } catch (error) {
      this.logger.error(`Page source retrieval failed`, error);throw error;}
  }

  /**
   * Validate that a browser session exists
   */
  private async validateSession(sessionId: string): Promise<void> {
    try {
      const session = await this.browserSessionService.getSessionById(sessionId);
      if (!session) {
        throw new NotFoundException(`Browser session not found: ${sessionId}`);}} catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Invalid session ID: ${sessionId}`);
    }
  }

  /**
   * Map click type to DOM action
   */
  private mapClickTypeToDOMAction(clickType?: ClickType): string {
    switch (clickType) {
      case ClickType.RIGHT:
        return 'right_click';case ClickType.DOUBLE:return 'double_click';case ClickType.MIDDLE:return 'click'; // Middle click is still a click actioncase ClickType.LEFT:default:
        return 'click';}}

  /**
   * Map selector strategy to enhanced service format
   */
  private mapSelectorStrategy(strategy?: SelectorStrategy): string {
    switch (strategy) {
      case SelectorStrategy.XPATH:
        return 'xpath';case SelectorStrategy.TEXT:return 'text';case SelectorStrategy.ID:return 'id';case SelectorStrategy.CLASS:return 'class';case SelectorStrategy.TAG:return 'tag';case SelectorStrategy.NAME:return 'name';case SelectorStrategy.ATTRIBUTE:return 'attribute';case SelectorStrategy.CSS:default:
        return 'css';
    }
  }
}