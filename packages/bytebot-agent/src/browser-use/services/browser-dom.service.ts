/**
 * Browser DOM Service
 *
 * Service for managing DOM interactions including navigation, clicking, typing,
 * scrolling, and browser state management. Integrates with browser-use framework
 * to provide comprehensive DOM manipulation capabilities with enterprise-grade
 * error handling and logging.
 *
 * Features:
 * - URL navigation and page management
 * - Element interaction (click, type, hover)
 * - Page scrolling and viewport management
 * - DOM state inspection and element discovery
 * - Browser history and tab management
 * - Local-only architecture compliance
 * - Comprehensive error handling and retry logic
 *
 * @service BrowserDomService
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BrowserUseService } from '../browser-use.service';
import { BrowserSessionService } from './browser-session.service';

// Import DTOs
import {
  BrowserNavigateDto,
  BrowserClickDto,
  BrowserTypeDto,
  BrowserScrollDto,
  BrowserElementResponseDto,
  BrowserStateResponseDto,
} from '../dto/browser-dom.dto';

// Browser API response interfaces
interface BrowserCommandResult {
  success: boolean;
  error?: string;
  executionTime?: number;
  [key: string]: unknown;
}

interface BrowserElementResult {
  element?: BrowserElementData;
  success?: boolean;
  error?: string;
}

interface BrowserPageInfoResult {
  url?: string;
  title?: string;
  loadingStatus?: string;
  viewport?: {
    width: number;
    height: number;
  };
  scrollPosition?: {
    x: number;
    y: number;
  };
  performance?: {
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
  };
}

interface BrowserElementData {
  index?: number;
  tagName?: string;
  text?: string;
  textContent?: string;
  id?: string;
  className?: string;
  attributes?: unknown;
  boundingBox?: unknown;
  visible?: boolean;
  enabled?: boolean;
  clickable?: boolean;
  inputField?: boolean;
  selector?: string;
}

interface BrowserInteractiveElementsResult {
  elements?: Array<unknown>;
}

interface BrowserScreenshotResult {
  screenshot?: string | { data?: string };
}

// Type guards for browser API responses
function isBrowserCommandResult(obj: unknown): obj is BrowserCommandResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as BrowserCommandResult).success === 'boolean'
  );
}

// Helper function to safely extract element data
function safeExtractElement(element: unknown): ElementInfo | null {
  if (!element || typeof element !== 'object') {
    return null;
  }

  const el = element as Record<string, unknown>;

  const safeAttributes =
    el.attributes &&
    typeof el.attributes === 'object' &&
    el.attributes !== null &&
    el.attributes.constructor === Object
      ? (el.attributes as Record<string, string>)
      : {};

  const boundingBoxObj = el.boundingBox;
  const safeBoundingBox =
    boundingBoxObj &&
    typeof boundingBoxObj === 'object' &&
    boundingBoxObj !== null &&
    typeof (boundingBoxObj as Record<string, unknown>).x === 'number' &&
    typeof (boundingBoxObj as Record<string, unknown>).y === 'number' &&
    typeof (boundingBoxObj as Record<string, unknown>).width === 'number' &&
    typeof (boundingBoxObj as Record<string, unknown>).height === 'number'
      ? (boundingBoxObj as {
          x: number;
          y: number;
          width: number;
          height: number;
        })
      : { x: 0, y: 0, width: 0, height: 0 };

  const safeTagName = typeof el.tagName === 'string' ? el.tagName : 'div';

  return {
    index: typeof el.index === 'number' ? el.index : 0,
    tagName: safeTagName,
    text:
      typeof el.text === 'string'
        ? el.text
        : typeof el.textContent === 'string'
          ? el.textContent
          : '',
    id: typeof el.id === 'string' ? el.id : undefined,
    className: typeof el.className === 'string' ? el.className : undefined,
    textContent:
      typeof el.textContent === 'string' ? el.textContent : undefined,
    attributes: safeAttributes,
    boundingBox: safeBoundingBox,
    visible: typeof el.visible === 'boolean' ? el.visible : true,
    enabled: typeof el.enabled === 'boolean' ? el.enabled : true,
    clickable: typeof el.clickable === 'boolean' ? el.clickable : true,
    inputField:
      typeof el.inputField === 'boolean'
        ? el.inputField
        : ['input', 'textarea', 'select'].includes(safeTagName.toLowerCase()),
    selector: typeof el.selector === 'string' ? el.selector : '',
  };
}

function isBrowserElementResult(obj: unknown): obj is BrowserElementResult {
  return typeof obj === 'object' && obj !== null;
}

function isBrowserPageInfoResult(obj: unknown): obj is BrowserPageInfoResult {
  return typeof obj === 'object' && obj !== null;
}

function isBrowserInteractiveElementsResult(
  obj: unknown,
): obj is BrowserInteractiveElementsResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (typeof (obj as BrowserInteractiveElementsResult).elements ===
      'undefined' ||
      Array.isArray((obj as BrowserInteractiveElementsResult).elements))
  );
}

function isBrowserScreenshotResult(
  obj: unknown,
): obj is BrowserScreenshotResult {
  return typeof obj === 'object' && obj !== null;
}

interface ElementInfo {
  index: number; // Required by DOMElement
  tagName: string;
  text: string; // Required by DOMElement
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  enabled: boolean;
  clickable: boolean;
  inputField: boolean; // Required by DOMElement
  selector: string;
}

interface PageInfo {
  url: string;
  title: string;
  loadingStatus: 'loading' | 'complete' | 'error';
  viewport: {
    width: number;
    height: number;
  };
  scrollPosition: {
    x: number;
    y: number;
  };
  performance: {
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint: number;
  };
}

// Exported interfaces for use by other services
export interface PageElement {
  index: number;
  tagName: string;
  text?: string;
  id?: string;
  type?: string;
  attributes: Record<string, string>;
  selector: string;
  xpath?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible?: boolean;
  clickable?: boolean;
  inputField?: boolean;
}

export interface PageState {
  url: string;
  title: string;
  elements: PageElement[];
  forms: Array<{
    index: number;
    action?: string;
    method?: string;
    fields: PageElement[];
  }>;
  buttons: PageElement[];
  inputs: PageElement[];
  links: PageElement[];
}

@Injectable()
export class BrowserDomService {
  private readonly logger = new Logger(BrowserDomService.name);
  private readonly maxRetries = 3;
  private readonly defaultTimeout = 30000; // 30 seconds

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly browserSessionService: BrowserSessionService,
  ) {}

  /**
   * Navigate to a specific URL
   */
  async navigate(
    sessionId: string,
    navigateDto: BrowserNavigateDto,
  ): Promise<BrowserStateResponseDto> {
    this.logger.log(`Navigating session ${sessionId} to: ${navigateDto.url}`);

    try {
      // Validate session exists and is active
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      // Get browser process for the session
      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Prepare navigation command
      const command = {
        action: 'navigate',
        parameters: {
          url: navigateDto.url,
          waitUntil: navigateDto.waitUntil || 'networkidle0',
          timeout: navigateDto.timeout || this.defaultTimeout,
          referer: navigateDto.referer,
        },
        timestamp: new Date().toISOString(),
      };

      // Execute navigation command with retry logic
      const result = await this.executeWithRetry(
        browserProcess.id,
        command,
        this.maxRetries,
      );

      if (!result.success) {
        throw new BadRequestException(`Navigation failed: ${result.error}`);
      }

      // Wait for page load completion
      if (navigateDto.waitForElement) {
        await this.waitForElementPrivate(
          browserProcess.id,
          navigateDto.waitForElement,
        );
      }

      // Get current browser state
      const browserState = await this.getState(sessionId, {
        includeScreenshot: navigateDto.takeScreenshot || false,
      });

      this.logger.log(`Navigation completed for session ${sessionId}`);
      return browserState;
    } catch (error) {
      this.logger.error(`Navigation failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Click on a DOM element
   */
  async click(
    sessionId: string,
    clickDto: BrowserClickDto,
  ): Promise<BrowserElementResponseDto> {
    this.logger.log(`Clicking element in session ${sessionId}`);

    try {
      // Validate session
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Prepare click command
      const command = {
        action: 'click',
        parameters: {
          selector: clickDto.selector,
          coordinates: clickDto.coordinates,
          button: clickDto.button || 'left',
          modifiers: clickDto.modifiers || [],
          waitForNavigation: clickDto.waitForNavigation || false,
          timeout: clickDto.timeout || this.defaultTimeout,
        },
        timestamp: new Date().toISOString(),
      };

      // Execute click command
      const result = await this.executeWithRetry(
        browserProcess.id,
        command,
        this.maxRetries,
      );

      if (!result.success) {
        throw new BadRequestException(`Click failed: ${result.error}`);
      }

      // Get element information after click
      const elementInfo = await this.getElementInfo(
        browserProcess.id,
        clickDto.selector ||
          `${clickDto.coordinates?.x},${clickDto.coordinates?.y}`,
      );

      const response: BrowserElementResponseDto = {
        success: true,
        message: 'Element clicked successfully',
        element: elementInfo || undefined,
        timestamp: new Date(),
        executionTimeMs: result.executionTime || 0,
      };

      this.logger.log(`Click completed for session ${sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(`Click failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Type text into an input element
   */
  async type(
    sessionId: string,
    typeDto: BrowserTypeDto,
  ): Promise<BrowserElementResponseDto> {
    this.logger.log(`Typing text in session ${sessionId}`);

    try {
      // Validate session
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Prepare type command
      const command = {
        action: 'type',
        parameters: {
          selector: typeDto.selector,
          text: typeDto.text,
          clearFirst: typeDto.clearFirst !== false,
          delay: typeDto.delay || 50, // Typing speed
          pressEnter: typeDto.pressEnter || false,
          timeout: typeDto.timeout || this.defaultTimeout,
        },
        timestamp: new Date().toISOString(),
      };

      // Execute typing command
      const result = await this.executeWithRetry(
        browserProcess.id,
        command,
        this.maxRetries,
      );

      if (!result.success) {
        throw new BadRequestException(`Typing failed: ${result.error}`);
      }

      // Get element information after typing
      const elementInfo = typeDto.selector
        ? await this.getElementInfo(browserProcess.id, typeDto.selector)
        : null;

      const response: BrowserElementResponseDto = {
        success: true,
        message: 'Text typed successfully',
        element: elementInfo || undefined,
        timestamp: new Date(),
        executionTimeMs: result.executionTime || 0,
      };

      this.logger.log(`Typing completed for session ${sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(`Typing failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Scroll the page
   */
  async scroll(
    sessionId: string,
    scrollDto: BrowserScrollDto,
  ): Promise<BrowserStateResponseDto> {
    this.logger.log(`Scrolling page in session ${sessionId}`);

    try {
      // Validate session
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Prepare scroll command
      const command = {
        action: 'scroll',
        parameters: {
          direction: scrollDto.direction,
          amount: scrollDto.amount || 500,
          smooth: scrollDto.smooth !== false,
          selector: scrollDto.selector, // Scroll specific element
          coordinates: scrollDto.coordinates, // Scroll to specific position
        },
        timestamp: new Date().toISOString(),
      };

      // Execute scroll command
      const result = await this.executeWithRetry(
        browserProcess.id,
        command,
        this.maxRetries,
      );

      if (!result.success) {
        throw new BadRequestException(`Scroll failed: ${result.error}`);
      }

      // Get updated browser state
      const browserState = await this.getState(sessionId, {
        includeScreenshot: false,
      });

      this.logger.log(`Scroll completed for session ${sessionId}`);
      return browserState;
    } catch (error) {
      this.logger.error(`Scroll failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get current browser state including DOM elements and page information
   */
  async getState(
    sessionId: string,
    options: { includeScreenshot?: boolean } = {},
  ): Promise<BrowserStateResponseDto> {
    this.logger.debug(`Getting browser state for session ${sessionId}`);

    try {
      // Validate session
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Get page information
      const pageInfo = await this.getPageInfo(browserProcess.id);

      // Get interactive elements
      const interactiveElements = await this.getInteractiveElements(
        browserProcess.id,
      );

      // Get screenshot if requested
      let screenshotData: string | undefined;
      if (options.includeScreenshot) {
        const screenshotResult = await this.captureScreenshot(
          browserProcess.id,
        );
        screenshotData = screenshotResult.data;
      }

      const response: BrowserStateResponseDto = {
        success: true,
        sessionId,
        pageInfo: {
          url: pageInfo.url,
          title: pageInfo.title,
          loadingStatus: pageInfo.loadingStatus,
          viewport: pageInfo.viewport,
          scrollPosition: pageInfo.scrollPosition,
          dimensions: {
            width: pageInfo.viewport?.width ?? 1280,
            height: pageInfo.viewport?.height ?? 720,
            scrollWidth: pageInfo.viewport?.width ?? 1280,
            scrollHeight: pageInfo.viewport?.height ?? 720,
          },
        },
        interactiveElements: interactiveElements.map((element, index) => ({
          index,
          tagName: element.tagName,
          text: element.text ?? element.textContent?.substring(0, 100) ?? '', // Required by DOMElement
          textContent: element.textContent?.substring(0, 100), // Limit text content
          selector: element.selector,
          boundingBox: element.boundingBox,
          visible: element.visible,
          clickable: element.clickable,
          inputField:
            element.inputField ??
            ['input', 'textarea', 'select'].includes(
              element.tagName?.toLowerCase(),
            ), // Required by DOMElement
          attributes: element.attributes,
        })),
        performance: pageInfo.performance,
        screenshot: screenshotData,
        timestamp: new Date(),
      };

      return response;
    } catch (error) {
      this.logger.error(
        `Failed to get browser state for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Execute command with retry logic
   */
  private async executeWithRetry(
    processId: string,
    command: Record<string, unknown>,
    maxRetries: number,
  ): Promise<BrowserCommandResult> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await this.browserUseService.sendCommand(
          processId,
          command,
        );
        const executionTime = Date.now() - startTime;

        if (!isBrowserCommandResult(result)) {
          // Convert unknown result to BrowserCommandResult
          const convertedResult: BrowserCommandResult = {
            success:
              typeof result === 'object' &&
              result !== null &&
              'success' in result
                ? Boolean((result as { success: unknown }).success)
                : true,
            error:
              typeof result === 'object' && result !== null && 'error' in result
                ? (() => {
                    const errorValue = (result as { error: unknown }).error;
                    if (typeof errorValue === 'string') {
                      return errorValue;
                    }
                    if (
                      typeof errorValue === 'number' ||
                      typeof errorValue === 'boolean'
                    ) {
                      return String(errorValue);
                    }
                    if (typeof errorValue === 'object' && errorValue !== null) {
                      try {
                        return JSON.stringify(errorValue);
                      } catch {
                        return '[Error: Unable to serialize]';
                      }
                    }
                    return 'Unknown error';
                  })()
                : undefined,
            executionTime,
            ...(typeof result === 'object' && result !== null ? result : {}),
          };
          return convertedResult;
        }

        return {
          ...result,
          executionTime,
        };
      } catch (error) {
        this.logger.warn(`Command attempt ${attempt} failed:`, error);

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw new Error('Max retries exceeded');
  }

  /**
   * Wait for a specific element to appear (private method)
   */
  private async waitForElementPrivate(
    processId: string,
    selector: string,
    timeout = 10000,
  ): Promise<void> {
    const command = {
      action: 'waitForElement',
      parameters: {
        selector,
        timeout,
      },
    };

    await this.browserUseService.sendCommand(processId, command);
  }

  /**
   * Get detailed page information
   */
  private async getPageInfo(processId: string): Promise<PageInfo> {
    const command = {
      action: 'getPageInfo',
      parameters: {},
    };

    const result = await this.browserUseService.sendCommand(processId, command);

    if (!isBrowserPageInfoResult(result)) {
      return {
        url: 'about:blank',
        title: '',
        loadingStatus: 'complete' as const,
        viewport: { width: 1280, height: 720 },
        scrollPosition: { x: 0, y: 0 },
        performance: {
          loadTime: 0,
          domContentLoaded: 0,
          firstContentfulPaint: 0,
        },
      };
    }

    return {
      url: typeof result.url === 'string' ? result.url : 'about:blank',
      title: typeof result.title === 'string' ? result.title : '',
      loadingStatus:
        result.loadingStatus === 'loading' ||
        result.loadingStatus === 'complete' ||
        result.loadingStatus === 'error'
          ? result.loadingStatus
          : 'complete',
      viewport:
        result.viewport &&
        typeof result.viewport === 'object' &&
        typeof result.viewport.width === 'number' &&
        typeof result.viewport.height === 'number'
          ? result.viewport
          : { width: 1280, height: 720 },
      scrollPosition:
        result.scrollPosition &&
        typeof result.scrollPosition === 'object' &&
        typeof result.scrollPosition.x === 'number' &&
        typeof result.scrollPosition.y === 'number'
          ? result.scrollPosition
          : { x: 0, y: 0 },
      performance:
        result.performance &&
        typeof result.performance === 'object' &&
        typeof result.performance.loadTime === 'number' &&
        typeof result.performance.domContentLoaded === 'number' &&
        typeof result.performance.firstContentfulPaint === 'number'
          ? result.performance
          : {
              loadTime: 0,
              domContentLoaded: 0,
              firstContentfulPaint: 0,
            },
    };
  }

  /**
   * Get all interactive elements on the page
   */
  private async getInteractiveElements(
    processId: string,
  ): Promise<ElementInfo[]> {
    const command = {
      action: 'getInteractiveElements',
      parameters: {
        includeHidden: false,
        maxElements: 100, // Limit to prevent excessive data
      },
    };

    const result = await this.browserUseService.sendCommand(processId, command);

    if (!isBrowserInteractiveElementsResult(result)) {
      return [];
    }

    if (!Array.isArray(result.elements)) {
      return [];
    }

    // Safely convert elements to ElementInfo using helper function
    return result.elements
      .map(safeExtractElement)
      .filter((element): element is ElementInfo => element !== null);
  }

  /**
   * Get information about a specific element
   */
  private async getElementInfo(
    processId: string,
    selector: string,
  ): Promise<ElementInfo | null> {
    const command = {
      action: 'getElementInfo',
      parameters: {
        selector,
      },
    };

    try {
      const result = await this.browserUseService.sendCommand(
        processId,
        command,
      );

      if (!isBrowserElementResult(result)) {
        return null;
      }

      const element = result.element;
      if (!element) return null;

      // Use the safe helper function and provide fallback selector
      const extractedElement = safeExtractElement(element);
      if (extractedElement && !extractedElement.selector) {
        extractedElement.selector = selector;
      }

      return extractedElement;
    } catch (error) {
      this.logger.warn(
        `Failed to get element info for selector ${selector}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Capture screenshot
   */
  private async captureScreenshot(
    processId: string,
  ): Promise<{ data: string }> {
    const command = {
      action: 'screenshot',
      parameters: {
        format: 'png',
        quality: 90,
        fullPage: false,
      },
    };

    const result = await this.browserUseService.sendCommand(processId, command);

    if (!isBrowserScreenshotResult(result)) {
      return { data: '' };
    }

    return {
      data:
        typeof result.screenshot === 'string'
          ? result.screenshot
          : typeof result.screenshot === 'object' &&
              result.screenshot !== null &&
              typeof (result.screenshot as { data?: string }).data === 'string'
            ? (result.screenshot as { data: string }).data
            : '',
    };
  }

  /**
   * Type text into an element (alternative method signature)
   */
  async typeText(
    sessionId: string,
    options: {
      elementIndex?: number;
      selector?: string;
      text: string;
      clearExisting?: boolean;
      delay?: number;
    },
  ): Promise<BrowserElementResponseDto> {
    this.logger.log(`Typing text into element in session ${sessionId}`);

    try {
      // Validate session
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Prepare type command
      const command = {
        action: 'type',
        parameters: {
          elementIndex: options.elementIndex,
          selector: options.selector,
          text: options.text,
          clearFirst: options.clearExisting !== false,
          delay: options.delay || 50,
          timeout: this.defaultTimeout,
        },
        timestamp: new Date().toISOString(),
      };

      // Execute typing command
      const result = await this.executeWithRetry(
        browserProcess.id,
        command,
        this.maxRetries,
      );

      if (!result.success) {
        throw new BadRequestException(`Typing failed: ${result.error}`);
      }

      // Get element information after typing
      const elementSelector =
        options.selector || `[data-element-index="${options.elementIndex}"]`;
      const elementInfo = await this.getElementInfo(
        browserProcess.id,
        elementSelector,
      );

      const response: BrowserElementResponseDto = {
        success: true,
        message: 'Text typed successfully',
        element: elementInfo || undefined,
        timestamp: new Date(),
        executionTimeMs: result.executionTime || 0,
      };

      this.logger.log(`Type text completed for session ${sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(`Type text failed for session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Click on an element (alternative method signature)
   */
  async clickElement(
    sessionId: string,
    options: {
      elementIndex?: number;
      selector?: string;
      waitForNavigation?: boolean;
    },
  ): Promise<BrowserElementResponseDto> {
    this.logger.log(`Clicking element in session ${sessionId}`);

    try {
      // Validate session
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Prepare click command
      const command = {
        action: 'click',
        parameters: {
          elementIndex: options.elementIndex,
          selector: options.selector,
          waitForNavigation: options.waitForNavigation || false,
          timeout: this.defaultTimeout,
        },
        timestamp: new Date().toISOString(),
      };

      // Execute click command
      const result = await this.executeWithRetry(
        browserProcess.id,
        command,
        this.maxRetries,
      );

      if (!result.success) {
        throw new BadRequestException(`Click failed: ${result.error}`);
      }

      // Get element information after click
      const elementSelector =
        options.selector || `[data-element-index="${options.elementIndex}"]`;
      const elementInfo = await this.getElementInfo(
        browserProcess.id,
        elementSelector,
      );

      const response: BrowserElementResponseDto = {
        success: true,
        message: 'Element clicked successfully',
        element: elementInfo || undefined,
        timestamp: new Date(),
        executionTimeMs: result.executionTime || 0,
      };

      this.logger.log(`Click element completed for session ${sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Click element failed for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get page state (alias for getState method)
   */
  async getPageState(
    sessionId: string,
    options?: {
      includeElements?: boolean;
      includeScreenshot?: boolean;
      useCache?: boolean;
    },
  ): Promise<PageState | null> {
    try {
      const browserState = await this.getState(sessionId, {
        includeScreenshot: options?.includeScreenshot || false,
      });

      if (!browserState.success) {
        return null;
      }

      // Transform BrowserStateResponseDto to PageState format
      const pageState: PageState = {
        url: browserState.pageInfo?.url || 'about:blank',
        title: browserState.pageInfo?.title || '',
        elements:
          browserState.interactiveElements?.map((element) => ({
            index: element.index,
            tagName: element.tagName,
            text: element.text,
            id: element.attributes?.id,
            type: element.attributes?.type,
            attributes: element.attributes || {},
            selector: element.selector,
            boundingBox: element.boundingBox,
            visible: element.visible,
            clickable: element.clickable,
            inputField: element.inputField,
          })) || [],
        forms: [],
        buttons: [],
        inputs: [],
        links: [],
      };

      // Categorize elements
      pageState.elements.forEach((element) => {
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'form') {
          pageState.forms.push({
            index: element.index,
            action: element.attributes.action,
            method: element.attributes.method,
            fields: [],
          });
        } else if (
          tagName === 'button' ||
          (tagName === 'input' && element.type === 'button') ||
          (tagName === 'input' && element.type === 'submit')
        ) {
          pageState.buttons.push(element);
        } else if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select'
        ) {
          pageState.inputs.push(element);
        } else if (tagName === 'a') {
          pageState.links.push(element);
        }
      });

      return pageState;
    } catch (error) {
      this.logger.error(
        `Failed to get page state for session ${sessionId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Wait for element to appear
   */
  async waitForElement(
    sessionId: string,
    options: {
      selector: string;
      timeout?: number;
    },
  ): Promise<BrowserElementResponseDto> {
    this.logger.log(`Waiting for element in session ${sessionId}`);

    try {
      // Validate session
      const session = await this.browserSessionService.getSession(sessionId);
      if (!session.success) {
        throw new NotFoundException(`Session ${sessionId} not found`);
      }

      const browserProcess =
        this.browserUseService.getProcessBySession(sessionId);
      if (!browserProcess) {
        throw new InternalServerErrorException(
          `No browser process found for session ${sessionId}`,
        );
      }

      // Wait for element using the private method
      await this.waitForElementPrivate(
        browserProcess.id,
        options.selector,
        options.timeout || this.defaultTimeout,
      );

      // Get element information
      const elementInfo = await this.getElementInfo(
        browserProcess.id,
        options.selector,
      );

      const response: BrowserElementResponseDto = {
        success: true,
        message: 'Element found successfully',
        element: elementInfo || undefined,
        timestamp: new Date(),
        executionTimeMs: 0,
      };

      this.logger.log(`Wait for element completed for session ${sessionId}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Wait for element failed for session ${sessionId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
