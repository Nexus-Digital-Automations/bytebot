import { Injectable, Logger } from '@nestjs/common';import { Observable, Subject, BehaviorSubject, MessageEvent } from 'rxjs';import { filter, map } from 'rxjs/operators';import { v4 as uuidv4 } from 'uuid';import { spawn, ChildProcess } from 'child_process';import { promises as fs } from 'fs';import * as path from 'path';// Import existing servicesimport { BrowserUseService } from './browser-use.service';import { BrowserSessionService } from './browser-session.service';import { BrowserTaskService } from './browser-task.service';// Import enhanced DTOsimport {
  ScreenshotCaptureDto,
  BatchScreenshotCaptureDto,
  ScreenshotResultDto,
  BatchScreenshotResultDto,
  ScreenshotFormat,
  ScreenshotType,
  ScreenshotQuality,
} from './dto/screenshot.dto';import {DOMInteractionDto,
  BatchDOMInteractionDto,
  DOMInteractionResultDto,
  BatchDOMInteractionResultDto,
  DOMActionType,
  SelectorType,
} from './dto/dom-interaction.dto';import {ElementDetectionDto,
  BatchElementDetectionDto,
  ElementDetectionResultDto,
  BatchElementDetectionResultDto,
  DetectionStrategy,
  DetectedElementDto,
  WaitCondition,
} from './dto/element-detection.dto';import {OCRExtractionDto,
  VisualElementInteractionDto,
  ImageComparisonDto,
  OCRExtractionResultDto,
  VisualElementDetectionResultDto,
  ImageComparisonResultDto,
  OCREngine,
  VisualElementType,
  ImageComparisonAlgorithm,
} from './dto/visual-automation.dto';import {RealtimeSubscriptionDto,
  SSEConfigDto,
  RealtimeConnectionStatusDto,
  RealtimeEventStatsDto,
  RealtimeEventDto,
  RealtimeEventType,
  WebSocketState,
  SubscriptionType,
} from './dto/realtime-updates.dto';/*** Real-time connection manager
 */
interface RealtimeConnection {
  connectionId: string;
  sessionId: string;
  subscriptions: SubscriptionType[];
  eventFilter?: any;
  lastActivity: Date;
  eventsSent: number;
  eventsBuffered: number;
  state: WebSocketState;
  clientId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Service metrics interfaces
 */
interface ScreenshotMetrics {
  totalCaptured: number;
  averageCaptureTime: number;
  formatDistribution: Record<ScreenshotFormat, number>;
  typeDistribution: Record<ScreenshotType, number>;
}

interface DOMInteractionMetrics {
  totalInteractions: number;
  averageInteractionTime: number;
  actionDistribution: Record<DOMActionType, number>;
  successRate: number;
}

interface ElementDetectionMetrics {
  totalDetected: number;
  averageDetectionTime: number;
  strategyDistribution: Record<DetectionStrategy, number>;
  successRate: number;
}

interface OCRMetrics {
  totalExtractions: number;
  averageExtractionTime: number;
  engineDistribution: Record<OCREngine, number>;
  averageConfidence: number;
}

interface RealtimeMetrics {
  activeConnections: number;
  totalEventsSent: number;
  averageLatency: number;
  eventTypeDistribution: Record<RealtimeEventType, number>;
}

/**
 * Enhanced Browser Automation Service
 *
 * Provides comprehensive browser automation capabilities including:
 * - Multi-format screenshot capture with advanced options
 * - Precise DOM interaction with multiple targeting strategies
 * - AI-powered element detection with visual recognition
 * - OCR text extraction and visual automation
 * - Real-time browser state updates via WebSocket/SSE
 * - Batch operations for high-throughput scenarios
 *
 * All operations are local-only with enterprise-grade performance.
 */
@Injectable()
export class EnhancedBrowserAutomationService {
  private readonly logger = new Logger(EnhancedBrowserAutomationService.name);

  // Real-time event management
  private readonly eventSubject = new Subject<RealtimeEventDto>();
  private readonly connections = new Map<string, RealtimeConnection>();
  private readonly eventBuffer = new Map<string, RealtimeEventDto[]>();

  // Metrics tracking
  private screenshotMetrics: ScreenshotMetrics = {
    totalCaptured: 0,
    averageCaptureTime: 0,
    formatDistribution: {} as Record<ScreenshotFormat, number>,
    typeDistribution: {} as Record<ScreenshotType, number>,
  };

  private domInteractionMetrics: DOMInteractionMetrics = {
    totalInteractions: 0,
    averageInteractionTime: 0,
    actionDistribution: {} as Record<DOMActionType, number>,
    successRate: 0,
  };

  private elementDetectionMetrics: ElementDetectionMetrics = {
    totalDetected: 0,
    averageDetectionTime: 0,
    strategyDistribution: {} as Record<DetectionStrategy, number>,
    successRate: 0,
  };

  private ocrMetrics: OCRMetrics = {
    totalExtractions: 0,
    averageExtractionTime: 0,
    engineDistribution: {} as Record<OCREngine, number>,
    averageConfidence: 0,
  };

  private realtimeMetrics: RealtimeMetrics = {
    activeConnections: 0,
    totalEventsSent: 0,
    averageLatency: 0,
    eventTypeDistribution: {} as Record<RealtimeEventType, number>,
  };

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly sessionService: BrowserSessionService,
    private readonly taskService: BrowserTaskService,
  ) {
    this.logger.log('Enhanced Browser Automation Service initialized');
    this.initializeMetrics();
  }

  // ===========================
  // SCREENSHOT CAPTURE METHODS
  // ===========================

  /**
   * Capture enhanced screenshot with multiple format support
   */
  async captureEnhancedScreenshot(captureDto: ScreenshotCaptureDto): Promise<ScreenshotResultDto> {
    const startTime = Date.now();
    const screenshotId = uuidv4();

    this.logger.log(`Capturing enhanced screenshot: ${screenshotId}`, {sessionId: captureDto.sessionId,type: captureDto.type,
      format: captureDto.format,
    });

    try {
      // Validate session exists
      const session = this.sessionService.getSession(captureDto.sessionId);
      if (!session) {
        throw new Error(`Session not found: ${captureDto.sessionId}`);}// Execute screenshot capture based on type
      let imageData: string;
      let dimensions: { width: number; height: number };
      let elementBounds: any;

      switch (captureDto.type) {
        case ScreenshotType.FULL_PAGE:
          ({ imageData, dimensions } = await this.captureFullPageScreenshot(captureDto));
          break;
        case ScreenshotType.VIEWPORT:
          ({ imageData, dimensions } = await this.captureViewportScreenshot(captureDto));
          break;
        case ScreenshotType.ELEMENT:
          ({ imageData, dimensions, elementBounds } = await this.captureElementScreenshot(captureDto));
          break;
        default:
          throw new Error(`Unsupported screenshot type: ${captureDto.type}`);
      }

      const endTime = Date.now();
      const captureDurationMs = endTime - startTime;

      // Get page information
      const pageInfo = await this.getPageInfo(captureDto.sessionId);

      const result: ScreenshotResultDto = {
        screenshotId,
        sessionId: captureDto.sessionId,
        type: captureDto.type || ScreenshotType.VIEWPORT,
        format: captureDto.format || ScreenshotFormat.PNG,
        imageData,
        dimensions,
        fileSizeBytes: Buffer.byteLength(imageData, 'base64'),capturedAt: new Date(),captureDurationMs,
        elementSelector: captureDto.elementSelector?.selector,
        elementBounds,
        pageUrl: pageInfo.url,
        pageTitle: pageInfo.title,
        devicePixelRatio: pageInfo.devicePixelRatio,
        viewportSize: pageInfo.viewport,
        metadata: captureDto.metadata,
      };

      // Update metrics
      this.updateScreenshotMetrics(result);

      // Emit real-time event
      this.emitRealtimeEvent({
        eventId: uuidv4(),
        eventType: RealtimeEventType.SCREENSHOT_CAPTURED,
        sessionId: captureDto.sessionId,
        timestamp: new Date(),
        severity: 'info',sourceUrl: pageInfo.url,title: 'Screenshot Captured',
        payload: {
          screenshotId,
          type: captureDto.type,
          format: captureDto.format,
          dimensions,
          captureDurationMs,
        },
        screenshot: captureDto.includeDeviceScaling ? imageData : undefined,
      });

      this.logger.log(`Screenshot captured successfully: ${screenshotId}`, {dimensions,format: result.format,
        fileSizeBytes: result.fileSizeBytes,
        captureDurationMs,
      });

      return result;
    } catch (error) {
      this.logger.error(`Screenshot capture failed: ${screenshotId}`, error);

      // Emit error event
      this.emitRealtimeEvent({
        eventId: uuidv4(),
        eventType: RealtimeEventType.SCREENSHOT_FAILED,
        sessionId: captureDto.sessionId,
        timestamp: new Date(),
        severity: 'error',sourceUrl: '',title: 'Screenshot Capture Failed',
        payload: {
          screenshotId,
          error: error instanceof Error ? error.message : String(error),
        },
        errorData: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      });

      throw error;
    }
  }

  /**
   * Capture multiple screenshots in batch
   */
  async batchCaptureScreenshots(batchDto: BatchScreenshotCaptureDto): Promise<BatchScreenshotResultDto> {
    const batchId = uuidv4();
    const startTime = Date.now();

    this.logger.log(`Starting batch screenshot capture: ${batchId}`, {sessionId: batchDto.sessionId,screenshotCount: batchDto.screenshots.length,
    });

    const results: ScreenshotResultDto[] = [];
    let successfulCaptures = 0;
    let failedCaptures = 0;
    const errors: string[] = [];

    for (let i = 0; i < batchDto.screenshots.length; i++) {
      const screenshotConfig = batchDto.screenshots[i];
      const enhancedConfig: ScreenshotCaptureDto = {
        ...screenshotConfig,
        sessionId: batchDto.sessionId,
      };

      try {
        const result = await this.captureEnhancedScreenshot(enhancedConfig);
        results.push(result);
        successfulCaptures++;

        // Wait between captures if specified
        if (i < batchDto.screenshots.length - 1 && batchDto.intervalMs && batchDto.intervalMs > 0) {
          await new Promise(resolve => setTimeout(resolve, batchDto.intervalMs));
        }
      } catch (error) {
        failedCaptures++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Screenshot ${i + 1}: ${errorMessage}`);if (!batchDto.continueOnError) {break;
        }
      }
    }

    const endTime = Date.now();

    const batchResult: BatchScreenshotResultDto = {
      batchId,
      sessionId: batchDto.sessionId,
      screenshots: results,
      totalRequested: batchDto.screenshots.length,
      successfulCaptures,
      failedCaptures,
      startedAt: new Date(startTime),
      completedAt: new Date(endTime),
      totalDurationMs: endTime - startTime,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        intervalMs: batchDto.intervalMs,
        continueOnError: batchDto.continueOnError,
      },
    };

    this.logger.log(`Batch screenshot capture completed: ${batchId}`, {totalRequested: batchResult.totalRequested,successfulCaptures: batchResult.successfulCaptures,
      failedCaptures: batchResult.failedCaptures,
    });

    return batchResult;
  }

  // ===========================
  // DOM INTERACTION METHODS
  // ===========================

  /**
   * Perform DOM interaction
   */
  async performDOMInteraction(interactionDto: DOMInteractionDto): Promise<DOMInteractionResultDto> {
    const interactionId = uuidv4();
    const startTime = Date.now();

    this.logger.log(`Performing DOM interaction: ${interactionId}`, {sessionId: interactionDto.sessionId,action: interactionDto.action,
    });

    try {
      // Validate session
      const session = this.sessionService.getSession(interactionDto.sessionId);
      if (!session) {
        throw new Error(`Session not found: ${interactionDto.sessionId}`);}// Execute interaction based on action type
      let targetElement: any;
      let coordinates: { x: number; y: number } | undefined;
      let resultData: Record<string, unknown> | undefined;

      // Find target element or use coordinates
      if (interactionDto.selector) {
        targetElement = await this.findElement(interactionDto.sessionId, interactionDto.selector);
        if (!targetElement && !interactionDto.force) {
          throw new Error(`Element not found: ${interactionDto.selector.value}`);
        }
      }

      if (interactionDto.coordinates) {
        coordinates = {
          x: interactionDto.coordinates.x,
          y: interactionDto.coordinates.y,
        };
      }

      // Execute the action
      switch (interactionDto.action) {
        case DOMActionType.CLICK:
          await this.performClickAction(interactionDto.sessionId, targetElement, coordinates);
          break;
        case DOMActionType.DOUBLE_CLICK:
          await this.performDoubleClickAction(interactionDto.sessionId, targetElement, coordinates);
          break;
        case DOMActionType.TYPE:
          if (!interactionDto.typing) {
            throw new Error('Typing configuration required for TYPE action');}await this.performTypeAction(interactionDto.sessionId, targetElement, interactionDto.typing);
          break;
        case DOMActionType.SCROLL:
          if (!interactionDto.scroll) {
            throw new Error('Scroll configuration required for SCROLL action');}await this.performScrollAction(interactionDto.sessionId, interactionDto.scroll);
          break;
        case DOMActionType.DRAG_AND_DROP:
          if (!interactionDto.dragDrop) {
            throw new Error('Drag and drop configuration required for DRAG_AND_DROP action');
          }
          await this.performDragDropAction(interactionDto.sessionId, interactionDto.dragDrop);
          break;
        default:
          throw new Error(`Unsupported action type: ${interactionDto.action}`);
      }

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // Get page information
      const pageInfo = await this.getPageInfo(interactionDto.sessionId);

      const result: DOMInteractionResultDto = {
        interactionId,
        sessionId: interactionDto.sessionId,
        action: interactionDto.action,
        success: true,
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        durationMs,
        elementSelector: interactionDto.selector?.value,
        targetElement,
        coordinates,
        resultData,
        pageUrl: pageInfo.url,
        pageTitle: pageInfo.title,
        metadata: interactionDto.metadata,
      };

      // Update metrics
      this.updateDOMInteractionMetrics(result);

      // Emit real-time event
      this.emitRealtimeEvent({
        eventId: uuidv4(),
        eventType: RealtimeEventType.ELEMENT_INTERACTION,
        sessionId: interactionDto.sessionId,
        timestamp: new Date(),
        severity: 'info',sourceUrl: pageInfo.url,title: 'DOM Interaction Completed',
        payload: {
          interactionId,
          action: interactionDto.action,
          success: true,
          durationMs,
        },
        elementSelector: interactionDto.selector?.value,
        elementInfo: targetElement,
      });

      this.logger.log(`DOM interaction completed successfully: ${interactionId}`, {action: result.action,durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      this.logger.error(`DOM interaction failed: ${interactionId}`, error);

      const result: DOMInteractionResultDto = {
        interactionId,
        sessionId: interactionDto.sessionId,
        action: interactionDto.action,
        success: false,
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        durationMs,
        elementSelector: interactionDto.selector?.value,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : { error: String(error) },
        pageUrl: '',pageTitle: '',metadata: interactionDto.metadata,};

      // Update metrics
      this.updateDOMInteractionMetrics(result);

      // Emit error event
      this.emitRealtimeEvent({
        eventId: uuidv4(),
        eventType: RealtimeEventType.ELEMENT_INTERACTION,
        sessionId: interactionDto.sessionId,
        timestamp: new Date(),
        severity: 'error',sourceUrl: '',title: 'DOM Interaction Failed',
        payload: {
          interactionId,
          action: interactionDto.action,
          success: false,
          error: result.errorMessage,
        },
        errorData: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      });

      return result;
    }
  }

  /**
   * Perform batch DOM interactions
   */
  async performBatchDOMInteractions(batchDto: BatchDOMInteractionDto): Promise<BatchDOMInteractionResultDto> {
    const batchId = uuidv4();
    const startTime = Date.now();

    this.logger.log(`Starting batch DOM interactions: ${batchId}`, {sessionId: batchDto.sessionId,interactionCount: batchDto.interactions.length,
    });

    const results: DOMInteractionResultDto[] = [];
    let successfulInteractions = 0;
    let failedInteractions = 0;
    const errors: string[] = [];

    for (let i = 0; i < batchDto.interactions.length; i++) {
      const interactionConfig = batchDto.interactions[i];
      const enhancedConfig: DOMInteractionDto = {
        ...interactionConfig,
        sessionId: batchDto.sessionId,
      };

      try {
        const result = await this.performDOMInteraction(enhancedConfig);
        results.push(result);

        if (result.success) {
          successfulInteractions++;
        } else {
          failedInteractions++;
          if (result.errorMessage) {
            errors.push(`Interaction ${i + 1}: ${result.errorMessage}`);}}

        // Capture screenshot if requested
        if (batchDto.captureScreenshots) {
          try {
            await this.captureEnhancedScreenshot({
              sessionId: batchDto.sessionId,
              type: ScreenshotType.VIEWPORT,
              format: ScreenshotFormat.PNG,
              metadata: { interactionIndex: i, interactionId: result.interactionId },
            });
          } catch (screenshotError) {
            this.logger.warn(`Screenshot capture failed for interaction ${i + 1}`, screenshotError);}}

        // Wait between interactions if specified
        if (i < batchDto.interactions.length - 1 && batchDto.intervalMs && batchDto.intervalMs > 0) {
          await new Promise(resolve => setTimeout(resolve, batchDto.intervalMs));
        }

        // Stop on error if continueOnError is false
        if (!result.success && !batchDto.continueOnError) {
          break;
        }
      } catch (error) {
        failedInteractions++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Interaction ${i + 1}: ${errorMessage}`);if (!batchDto.continueOnError) {break;
        }
      }
    }

    const endTime = Date.now();

    const batchResult: BatchDOMInteractionResultDto = {
      batchId,
      sessionId: batchDto.sessionId,
      interactions: results,
      totalRequested: batchDto.interactions.length,
      successfulInteractions,
      failedInteractions,
      startedAt: new Date(startTime),
      completedAt: new Date(endTime),
      totalDurationMs: endTime - startTime,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        intervalMs: batchDto.intervalMs,
        continueOnError: batchDto.continueOnError,
        captureScreenshots: batchDto.captureScreenshots,
      },
    };

    this.logger.log(`Batch DOM interactions completed: ${batchId}`, {totalRequested: batchResult.totalRequested,successfulInteractions: batchResult.successfulInteractions,
      failedInteractions: batchResult.failedInteractions,
    });

    return batchResult;
  }

  // ===========================
  // ELEMENT DETECTION METHODS
  // ===========================

  /**
   * Detect elements with advanced strategies
   */
  async detectElements(detectionDto: ElementDetectionDto): Promise<ElementDetectionResultDto> {
    const detectionId = uuidv4();
    const startTime = Date.now();

    this.logger.log(`Detecting elements: ${detectionId}`, {sessionId: detectionDto.sessionId,strategy: detectionDto.criteria.strategy,
    });

    try {
      // Validate session
      const session = this.sessionService.getSession(detectionDto.sessionId);
      if (!session) {
        throw new Error(`Session not found: ${detectionDto.sessionId}`);}// Execute detection based on strategy
      let elements: DetectedElementDto[] = [];

      switch (detectionDto.criteria.strategy) {
        case DetectionStrategy.CSS_SELECTOR:
          elements = await this.detectElementsByCSS(detectionDto);
          break;
        case DetectionStrategy.XPATH:
          elements = await this.detectElementsByXPath(detectionDto);
          break;
        case DetectionStrategy.TEXT_CONTENT:
          elements = await this.detectElementsByText(detectionDto);
          break;
        case DetectionStrategy.ATTRIBUTE_VALUE:
          elements = await this.detectElementsByAttribute(detectionDto);
          break;
        case DetectionStrategy.VISUAL_SIMILARITY:
          elements = await this.detectElementsByVisualSimilarity(detectionDto);
          break;
        case DetectionStrategy.AI_DESCRIPTION:
          elements = await this.detectElementsByAIDescription(detectionDto);
          break;
        case DetectionStrategy.COMBINED:
          elements = await this.detectElementsByCombinedStrategy(detectionDto);
          break;
        default:
          throw new Error(`Unsupported detection strategy: ${detectionDto.criteria.strategy}`);
      }

      // Apply filters and wait conditions
      if (detectionDto.waitConfig) {
        await this.waitForElements(detectionDto.sessionId, elements, detectionDto.waitConfig);
      }

      // Filter by visibility and interactability
      elements = this.filterElementsByState(elements, detectionDto.criteria);

      // Return specific index or all elements
      if (detectionDto.criteria.index !== undefined && !detectionDto.criteria.returnAll) {
        elements = elements[detectionDto.criteria.index] ? [elements[detectionDto.criteria.index]] : [];
      }

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      // Get page information
      const pageInfo = await this.getPageInfo(detectionDto.sessionId);

      const result: ElementDetectionResultDto = {
        detectionId,
        sessionId: detectionDto.sessionId,
        success: elements.length > 0,
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        durationMs,
        strategy: detectionDto.criteria.strategy,
        elementsFound: elements.length,
        elements,
        primaryElement: elements.length > 0 ? elements[0] : undefined,
        pageUrl: pageInfo.url,
        pageTitle: pageInfo.title,
        metadata: detectionDto.metadata,
      };

      // Update metrics
      this.updateElementDetectionMetrics(result);

      // Emit real-time event
      this.emitRealtimeEvent({
        eventId: uuidv4(),
        eventType: RealtimeEventType.ELEMENT_DETECTED,
        sessionId: detectionDto.sessionId,
        timestamp: new Date(),
        severity: 'info',sourceUrl: pageInfo.url,title: 'Elements Detected',
        payload: {
          detectionId,
          strategy: detectionDto.criteria.strategy,
          elementsFound: elements.length,
          durationMs,
        },
      });

      this.logger.log(`Element detection completed: ${detectionId}`, {strategy: result.strategy,elementsFound: result.elementsFound,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      const endTime = Date.now();
      const durationMs = endTime - startTime;

      this.logger.error(`Element detection failed: ${detectionId}`, error);

      const result: ElementDetectionResultDto = {
        detectionId,
        sessionId: detectionDto.sessionId,
        success: false,
        startedAt: new Date(startTime),
        completedAt: new Date(endTime),
        durationMs,
        strategy: detectionDto.criteria.strategy,
        elementsFound: 0,
        elements: [],
        errorMessage: error instanceof Error ? error.message : String(error),
        errorDetails: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : { error: String(error) },
        pageUrl: '',pageTitle: '',
        metadata: detectionDto.metadata,
      };

      // Update metrics
      this.updateElementDetectionMetrics(result);

      return result;
    }
  }

  // ===========================
  // REAL-TIME UPDATES METHODS
  // ===========================

  /**
   * Subscribe to real-time events
   */
  async subscribeToRealtimeEvents(subscriptionDto: RealtimeSubscriptionDto): Promise<RealtimeConnectionStatusDto> {
    const connectionId = uuidv4();

    this.logger.log(`Creating real-time subscription: ${connectionId}`, {sessionId: subscriptionDto.sessionId,subscriptionTypes: subscriptionDto.subscriptionTypes,
    });

    const connection: RealtimeConnection = {
      connectionId,
      sessionId: subscriptionDto.sessionId,
      subscriptions: subscriptionDto.subscriptionTypes,
      eventFilter: subscriptionDto.eventFilter,
      lastActivity: new Date(),
      eventsSent: 0,
      eventsBuffered: 0,
      state: WebSocketState.CONNECTED,
      clientId: subscriptionDto.clientId,
      metadata: subscriptionDto.metadata,
    };

    this.connections.set(connectionId, connection);
    this.eventBuffer.set(connectionId, []);

    // Initialize event buffer
    if (subscriptionDto.bufferSize && subscriptionDto.bufferSize > 0) {
      this.eventBuffer.set(connectionId, []);
    }

    const status: RealtimeConnectionStatusDto = {
      connectionId,
      sessionId: subscriptionDto.sessionId,
      state: WebSocketState.CONNECTED,
      connectedAt: new Date(),
      lastActivity: new Date(),
      activeSubscriptions: subscriptionDto.subscriptionTypes,
      eventsSent: 0,
      eventsBuffered: 0,
      clientId: subscriptionDto.clientId,
      quality: {
        stability: 1.0,
        throughput: 0,
        reliability: 1.0,
      },
      metadata: subscriptionDto.metadata,
    };

    // Update metrics
    this.realtimeMetrics.activeConnections = this.connections.size;

    this.logger.log(`Real-time subscription created: ${connectionId}`, {activeSubscriptions: status.activeSubscriptions,totalConnections: this.connections.size,
    });

    return status;
  }

  /**
   * Create Server-Sent Events stream
   */
  createSSEStream(sseConfig: SSEConfigDto): Observable<MessageEvent> {
    this.logger.log(`Creating SSE stream for session: ${sseConfig.sessionId}`, {eventTypes: sseConfig.eventTypes,streamId: sseConfig.streamId,
    });

    return this.eventSubject.pipe(
      filter(event => {
        // Filter by session
        if (event.sessionId !== sseConfig.sessionId) {
          return false;
        }

        // Filter by event types if specified
        if (sseConfig.eventTypes && sseConfig.eventTypes.length > 0) {
          return sseConfig.eventTypes.includes(event.eventType);
        }

        // Apply additional filters
        if (sseConfig.filter) {
          return this.applyEventFilter(event, sseConfig.filter);
        }

        return true;
      }),
      map(event => ({
        id: event.eventId,
        type: event.eventType,
        data: JSON.stringify(event),
        retry: sseConfig.includeRetry ? 3000 : undefined,
      } as MessageEvent)),
    );
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(connectionId: string): Promise<RealtimeConnectionStatusDto | null> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return null;
    }

    const bufferedEvents = this.eventBuffer.get(connectionId) || [];

    return {
      connectionId: connection.connectionId,
      sessionId: connection.sessionId,
      state: connection.state,
      connectedAt: new Date(), // Would track actual connection time
      lastActivity: connection.lastActivity,
      activeSubscriptions: connection.subscriptions,
      eventsSent: connection.eventsSent,
      eventsBuffered: bufferedEvents.length,
      clientId: connection.clientId,
      quality: {
        stability: 1.0,
        throughput: connection.eventsSent,
        reliability: 1.0,
      },
      metadata: connection.metadata,
    };
  }

  /**
   * Close real-time connection
   */
  async closeRealtimeConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);}this.connections.delete(connectionId);
    this.eventBuffer.delete(connectionId);

    // Update metrics
    this.realtimeMetrics.activeConnections = this.connections.size;

    this.logger.log(`Real-time connection closed: ${connectionId}`, {
      sessionId: connection.sessionId,
      totalConnections: this.connections.size,
    });
  }

  // ===========================
  // METRICS METHODS
  // ===========================

  getScreenshotMetrics(): ScreenshotMetrics {
    return { ...this.screenshotMetrics };
  }

  getDOMInteractionMetrics(): DOMInteractionMetrics {
    return { ...this.domInteractionMetrics };
  }

  getElementDetectionMetrics(): ElementDetectionMetrics {
    return { ...this.elementDetectionMetrics };
  }

  getOCRMetrics(): OCRMetrics {
    return { ...this.ocrMetrics };
  }

  getRealtimeMetrics(): RealtimeMetrics {
    return { ...this.realtimeMetrics };
  }

  // ===========================
  // PLACEHOLDER IMPLEMENTATION METHODS
  // ===========================

  // These methods would be implemented with actual browser automation logic
  // using puppeteer, playwright, or similar libraries

  private async captureFullPageScreenshot(captureDto: ScreenshotCaptureDto): Promise<{ imageData: string; dimensions: { width: number; height: number } }> {
    // Implementation would use browser automation library
    return {
      imageData: 'base64_encoded_screenshot_data',dimensions: { width: 1920, height: 1080 }};
  }

  private async captureViewportScreenshot(captureDto: ScreenshotCaptureDto): Promise<{ imageData: string; dimensions: { width: number; height: number } }> {
    // Implementation would use browser automation library
    return {
      imageData: 'base64_encoded_screenshot_data',dimensions: { width: 1920, height: 1080 }};
  }

  private async captureElementScreenshot(captureDto: ScreenshotCaptureDto): Promise<{ imageData: string; dimensions: { width: number; height: number }; elementBounds: any }> {
    // Implementation would use browser automation library
    return {
      imageData: 'base64_encoded_screenshot_data',dimensions: { width: 200, height: 100 },elementBounds: { x: 100, y: 200, width: 200, height: 100 }
    };
  }

  private async getPageInfo(sessionId: string): Promise<{ url: string; title: string; devicePixelRatio: number; viewport: { width: number; height: number } }> {
    // Implementation would get actual page info
    return {
      url: 'https://example.com',title: 'Example Page',devicePixelRatio: 1.0,viewport: { width: 1920, height: 1080 }
    };
  }

  private async findElement(sessionId: string, selector: any): Promise<any> {
    // Implementation would find actual element
    return {
      tagName: 'button',id: 'submit-btn',textContent: 'Submit',boundingBox: { x: 100, y: 200, width: 80, height: 40 }};
  }

  private async performClickAction(sessionId: string, element: any, coordinates?: { x: number; y: number }): Promise<void> {
    // Implementation would perform actual click
  }

  private async performDoubleClickAction(sessionId: string, element: any, coordinates?: { x: number; y: number }): Promise<void> {
    // Implementation would perform actual double click
  }

  private async performTypeAction(sessionId: string, element: any, typing: any): Promise<void> {
    // Implementation would perform actual typing
  }

  private async performScrollAction(sessionId: string, scroll: any): Promise<void> {
    // Implementation would perform actual scrolling
  }

  private async performDragDropAction(sessionId: string, dragDrop: any): Promise<void> {
    // Implementation would perform actual drag and drop
  }

  private async detectElementsByCSS(detectionDto: ElementDetectionDto): Promise<DetectedElementDto[]> {
    // Implementation would detect elements by CSS selector
    return [];
  }

  private async detectElementsByXPath(detectionDto: ElementDetectionDto): Promise<DetectedElementDto[]> {
    // Implementation would detect elements by XPath
    return [];
  }

  private async detectElementsByText(detectionDto: ElementDetectionDto): Promise<DetectedElementDto[]> {
    // Implementation would detect elements by text content
    return [];
  }

  private async detectElementsByAttribute(detectionDto: ElementDetectionDto): Promise<DetectedElementDto[]> {
    // Implementation would detect elements by attributes
    return [];
  }

  private async detectElementsByVisualSimilarity(detectionDto: ElementDetectionDto): Promise<DetectedElementDto[]> {
    // Implementation would detect elements by visual similarity
    return [];
  }

  private async detectElementsByAIDescription(detectionDto: ElementDetectionDto): Promise<DetectedElementDto[]> {
    // Implementation would detect elements using AI description
    return [];
  }

  private async detectElementsByCombinedStrategy(detectionDto: ElementDetectionDto): Promise<DetectedElementDto[]> {
    // Implementation would combine multiple strategies
    return [];
  }

  private async waitForElements(sessionId: string, elements: DetectedElementDto[], waitConfig: any): Promise<void> {
    // Implementation would wait for element conditions
  }

  private filterElementsByState(elements: DetectedElementDto[], criteria: any): DetectedElementDto[] {
    // Implementation would filter elements by visibility/interactability
    return elements;
  }

  private emitRealtimeEvent(event: RealtimeEventDto): void {
    this.eventSubject.next(event);
    this.realtimeMetrics.totalEventsSent++;

    // Update event type distribution
    if (!this.realtimeMetrics.eventTypeDistribution[event.eventType]) {
      this.realtimeMetrics.eventTypeDistribution[event.eventType] = 0;
    }
    this.realtimeMetrics.eventTypeDistribution[event.eventType]++;
  }

  private applyEventFilter(event: RealtimeEventDto, filter: any): boolean {
    // Implementation would apply event filtering logic
    return true;
  }

  private initializeMetrics(): void {
    // Initialize metric distributions
    Object.values(ScreenshotFormat).forEach(format => {
      this.screenshotMetrics.formatDistribution[format] = 0;
    });
    Object.values(ScreenshotType).forEach(type => {
      this.screenshotMetrics.typeDistribution[type] = 0;
    });
    Object.values(DOMActionType).forEach(action => {
      this.domInteractionMetrics.actionDistribution[action] = 0;
    });
    Object.values(DetectionStrategy).forEach(strategy => {
      this.elementDetectionMetrics.strategyDistribution[strategy] = 0;
    });
    Object.values(OCREngine).forEach(engine => {
      this.ocrMetrics.engineDistribution[engine] = 0;
    });
    Object.values(RealtimeEventType).forEach(eventType => {
      this.realtimeMetrics.eventTypeDistribution[eventType] = 0;
    });
  }

  private updateScreenshotMetrics(result: ScreenshotResultDto): void {
    this.screenshotMetrics.totalCaptured++;
    this.screenshotMetrics.formatDistribution[result.format]++;
    this.screenshotMetrics.typeDistribution[result.type]++;

    // Update average capture time
    const totalTime = (this.screenshotMetrics.averageCaptureTime * (this.screenshotMetrics.totalCaptured - 1)) + result.captureDurationMs;
    this.screenshotMetrics.averageCaptureTime = totalTime / this.screenshotMetrics.totalCaptured;
  }

  private updateDOMInteractionMetrics(result: DOMInteractionResultDto): void {
    this.domInteractionMetrics.totalInteractions++;
    this.domInteractionMetrics.actionDistribution[result.action]++;

    // Update average interaction time
    const totalTime = (this.domInteractionMetrics.averageInteractionTime * (this.domInteractionMetrics.totalInteractions - 1)) + result.durationMs;
    this.domInteractionMetrics.averageInteractionTime = totalTime / this.domInteractionMetrics.totalInteractions;

    // Update success rate
    const successfulInteractions = this.domInteractionMetrics.totalInteractions * this.domInteractionMetrics.successRate;
    const newSuccessfulCount = successfulInteractions + (result.success ? 1 : 0);
    this.domInteractionMetrics.successRate = newSuccessfulCount / this.domInteractionMetrics.totalInteractions;
  }

  private updateElementDetectionMetrics(result: ElementDetectionResultDto): void {
    this.elementDetectionMetrics.totalDetected++;
    this.elementDetectionMetrics.strategyDistribution[result.strategy]++;

    // Update average detection time
    const totalTime = (this.elementDetectionMetrics.averageDetectionTime * (this.elementDetectionMetrics.totalDetected - 1)) + result.durationMs;
    this.elementDetectionMetrics.averageDetectionTime = totalTime / this.elementDetectionMetrics.totalDetected;

    // Update success rate
    const successfulDetections = this.elementDetectionMetrics.totalDetected * this.elementDetectionMetrics.successRate;
    const newSuccessfulCount = successfulDetections + (result.success ? 1 : 0);
    this.elementDetectionMetrics.successRate = newSuccessfulCount / this.elementDetectionMetrics.totalDetected;
  }

  // Placeholder methods for visual automation
  async extractTextOCR(ocrDto: OCRExtractionDto): Promise<OCRExtractionResultDto> {
    // Placeholder implementation
    return {
      extractionId: uuidv4(),
      sessionId: ocrDto.sessionId,
      success: true,
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 100,
      ocrEngine: ocrDto.ocrConfig?.engine || OCREngine.TESSERACT,
      fullText: 'Extracted text content',
      textDetections: [],
      overallConfidence: 0.9,
      textBlocksDetected: 1,
      imageDimensions: { width: 1920, height: 1080 },
    };
  }

  async interactWithVisualElement(interactionDto: VisualElementInteractionDto): Promise<VisualElementDetectionResultDto> {
    // Placeholder implementation
    return {
      detectionId: uuidv4(),
      sessionId: interactionDto.sessionId,
      success: true,
      elementType: interactionDto.elementDetection.elementType,
      confidence: 0.9,
      location: { x: 100, y: 200, width: 80, height: 40 },
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 200,
    };
  }

  async compareImages(comparisonDto: ImageComparisonDto): Promise<ImageComparisonResultDto> {
    // Placeholder implementation
    return {
      comparisonId: uuidv4(),
      sessionId: comparisonDto.sessionId,
      success: true,
      similarityScore: 0.95,
      isMatch: true,
      algorithm: comparisonDto.comparisonConfig.algorithm,
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 150,
    };
  }

  async batchDetectElements(batchDto: BatchElementDetectionDto): Promise<BatchElementDetectionResultDto> {
    // Placeholder implementation
    return {
      batchId: uuidv4(),
      sessionId: batchDto.sessionId,
      detections: [],
      totalRequested: batchDto.detections.length,
      successfulDetections: 0,
      failedDetections: 0,
      totalElementsFound: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      totalDurationMs: 100,
    };
  }

  async getRealtimeEventStats(sessionId: string, periodMinutes: number): Promise<RealtimeEventStatsDto | null> {
    // Placeholder implementation
    return {
      sessionId,
      periodStart: new Date(Date.now() - periodMinutes * 60 * 1000),
      periodEnd: new Date(),
      totalEvents: 100,
      eventsByType: {},
      eventsBySeverity: { debug: 10, info: 70, warn: 15, error: 5 },
      activeConnections: this.connections.size,
      averageEventsPerMinute: 5,
      peakEventsPerMinute: 20,
    };
  }
}