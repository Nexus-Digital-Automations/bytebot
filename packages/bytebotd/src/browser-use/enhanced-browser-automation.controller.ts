import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  Sse,
  MessageEvent,
} from '@nestjs/common';import {ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';import { Observable } from 'rxjs';// Existing importsimport { BrowserUseService } from './browser-use.service';import { BrowserSessionService } from './browser-session.service';import { BrowserTaskService } from './browser-task.service';import {CreateBrowserTaskDto,
  BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
} from './dto/browser-task.dto';import {CreateBrowserSessionDto,
  BrowserSessionDto,
  BrowserSessionStatus,
} from './dto/browser-session.dto';import { CreateAsyncJobDto, AsyncJobResultDto } from './dto/async-job.dto';// New enhanced DTOsimport {
  ScreenshotCaptureDto,
  BatchScreenshotCaptureDto,
  ScreenshotResultDto,
  BatchScreenshotResultDto,
  ScreenshotFormat,
  ScreenshotType,
} from './dto/screenshot.dto';import {DOMInteractionDto,
  BatchDOMInteractionDto,
  DOMInteractionResultDto,
  BatchDOMInteractionResultDto,
  DOMActionType,
} from './dto/dom-interaction.dto';import {ElementDetectionDto,
  BatchElementDetectionDto,
  ElementDetectionResultDto,
  BatchElementDetectionResultDto,
  DetectionStrategy,
} from './dto/element-detection.dto';import {OCRExtractionDto,
  VisualElementInteractionDto,
  ImageComparisonDto,
  OCRExtractionResultDto,
  VisualElementDetectionResultDto,
  ImageComparisonResultDto,
  OCREngine,
  VisualElementType,
} from './dto/visual-automation.dto';import {RealtimeSubscriptionDto,
  SSEConfigDto,
  RealtimeConnectionStatusDto,
  RealtimeEventStatsDto,
  RealtimeEventType,
  SubscriptionType,
} from './dto/realtime-updates.dto';/*** Enhanced Browser Automation Controller
 *
 * Comprehensive REST API endpoints for advanced browser automation with:
 * - Multi-format screenshot capture (PNG, JPEG, WebP)
 * - Precise DOM interaction with coordinate and selector targeting
 * - Advanced element detection with AI and visual recognition
 * - OCR text extraction and visual automation
 * - Real-time browser state updates via WebSocket/SSE
 * - Batch operations for high-throughput automation
 *
 * All operations are local-only with enterprise-grade performance and security.
 */
@ApiTags('Enhanced Browser Automation')@Controller('browser-automation')export class EnhancedBrowserAutomationController {private readonly logger = new Logger(EnhancedBrowserAutomationController.name);

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly sessionService: BrowserSessionService,
    private readonly taskService: BrowserTaskService,
  ) {
    this.logger.log('Enhanced Browser Automation Controller initialized');}// ===========================
  // ENHANCED SCREENSHOT ENDPOINTS
  // ===========================

  /**
   * Capture single screenshot with advanced options
   */
  @Post('screenshots/capture')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Capture enhanced screenshot',description: 'Capture screenshot with multiple format support, element targeting, and quality options',})@ApiBody({ type: ScreenshotCaptureDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Screenshot captured successfully',
    type: ScreenshotResultDto,
  })
  async captureScreenshot(
    @Body() captureDto: ScreenshotCaptureDto,
  ): Promise<ScreenshotResultDto> {
    this.logger.log(`Capturing screenshot for session: ${captureDto.sessionId}`, {type: captureDto.type,format: captureDto.format,
      quality: captureDto.quality,
    });

    try {
      const result = await this.browserUseService.captureEnhancedScreenshot(captureDto);

      this.logger.log(`Screenshot captured: ${result.screenshotId}`, {format: result.format,dimensions: result.dimensions,
        fileSizeBytes: result.fileSizeBytes,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Screenshot capture failed for session: ${captureDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Screenshot capture failed',error: error instanceof Error ? error.message : String(error),sessionId: captureDto.sessionId,
      });
    }
  }

  /**
   * Capture multiple screenshots in batch
   */
  @Post('screenshots/batch')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Batch screenshot capture',description: 'Capture multiple screenshots with different configurations in a single request',})@ApiBody({ type: BatchScreenshotCaptureDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch screenshots captured',
    type: BatchScreenshotResultDto,
  })
  async batchCaptureScreenshots(
    @Body() batchDto: BatchScreenshotCaptureDto,
  ): Promise<BatchScreenshotResultDto> {
    this.logger.log(`Batch screenshot capture for session: ${batchDto.sessionId}`, {screenshotCount: batchDto.screenshots.length,intervalMs: batchDto.intervalMs,
    });

    try {
      const result = await this.browserUseService.batchCaptureScreenshots(batchDto);

      this.logger.log(`Batch screenshots completed: ${result.batchId}`, {totalRequested: result.totalRequested,successfulCaptures: result.successfulCaptures,
        failedCaptures: result.failedCaptures,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Batch screenshot capture failed for session: ${batchDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Batch screenshot capture failed',error: error instanceof Error ? error.message : String(error),sessionId: batchDto.sessionId,
      });
    }
  }

  // ===========================
  // DOM INTERACTION ENDPOINTS
  // ===========================

  /**
   * Perform DOM interaction
   */
  @Post('dom/interact')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Perform DOM interaction',description: 'Execute precise DOM interactions with element or coordinate targeting',})@ApiBody({ type: DOMInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'DOM interaction completed',
    type: DOMInteractionResultDto,
  })
  async performDOMInteraction(
    @Body() interactionDto: DOMInteractionDto,
  ): Promise<DOMInteractionResultDto> {
    this.logger.log(`Performing DOM interaction for session: ${interactionDto.sessionId}`, {action: interactionDto.action,selector: interactionDto.selector?.value,
      coordinates: interactionDto.coordinates,
    });

    try {
      const result = await this.browserUseService.performDOMInteraction(interactionDto);

      this.logger.log(`DOM interaction completed: ${result.interactionId}`, {success: result.success,action: result.action,
        durationMs: result.durationMs,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `DOM interaction failed for session: ${interactionDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'DOM interaction failed',error: error instanceof Error ? error.message : String(error),sessionId: interactionDto.sessionId,
      });
    }
  }

  /**
   * Perform batch DOM interactions
   */
  @Post('dom/batch-interact')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Perform batch DOM interactions',description: 'Execute multiple DOM interactions sequentially with optional screenshots',})@ApiBody({ type: BatchDOMInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch DOM interactions completed',
    type: BatchDOMInteractionResultDto,
  })
  async performBatchDOMInteractions(
    @Body() batchDto: BatchDOMInteractionDto,
  ): Promise<BatchDOMInteractionResultDto> {
    this.logger.log(`Batch DOM interactions for session: ${batchDto.sessionId}`, {interactionCount: batchDto.interactions.length,continueOnError: batchDto.continueOnError,
      captureScreenshots: batchDto.captureScreenshots,
    });

    try {
      const result = await this.browserUseService.performBatchDOMInteractions(batchDto);

      this.logger.log(`Batch DOM interactions completed: ${result.batchId}`, {totalRequested: result.totalRequested,successfulInteractions: result.successfulInteractions,
        failedInteractions: result.failedInteractions,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Batch DOM interactions failed for session: ${batchDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Batch DOM interactions failed',error: error instanceof Error ? error.message : String(error),sessionId: batchDto.sessionId,
      });
    }
  }

  // ===========================
  // ELEMENT DETECTION ENDPOINTS
  // ===========================

  /**
   * Detect elements with advanced strategies
   */
  @Post('elements/detect')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Detect elements',description: 'Detect elements using CSS selectors, XPath, text content, AI description, or visual similarity',})@ApiBody({ type: ElementDetectionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Element detection completed',
    type: ElementDetectionResultDto,
  })
  async detectElements(
    @Body() detectionDto: ElementDetectionDto,
  ): Promise<ElementDetectionResultDto> {
    this.logger.log(`Detecting elements for session: ${detectionDto.sessionId}`, {strategy: detectionDto.criteria.strategy,waitConfig: detectionDto.waitConfig?.condition,
      includeScreenshot: detectionDto.includeScreenshot,
    });

    try {
      const result = await this.browserUseService.detectElements(detectionDto);

      this.logger.log(`Element detection completed: ${result.detectionId}`, {success: result.success,strategy: result.strategy,
        elementsFound: result.elementsFound,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Element detection failed for session: ${detectionDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Element detection failed',error: error instanceof Error ? error.message : String(error),sessionId: detectionDto.sessionId,
      });
    }
  }

  /**
   * Batch element detection
   */
  @Post('elements/batch-detect')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Batch element detection',description: 'Detect multiple elements concurrently with different criteria',})@ApiBody({ type: BatchElementDetectionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch element detection completed',
    type: BatchElementDetectionResultDto,
  })
  async batchDetectElements(
    @Body() batchDto: BatchElementDetectionDto,
  ): Promise<BatchElementDetectionResultDto> {
    this.logger.log(`Batch element detection for session: ${batchDto.sessionId}`, {detectionCount: batchDto.detections.length,maxConcurrent: batchDto.maxConcurrent,
      continueOnError: batchDto.continueOnError,
    });

    try {
      const result = await this.browserUseService.batchDetectElements(batchDto);

      this.logger.log(`Batch element detection completed: ${result.batchId}`, {totalRequested: result.totalRequested,successfulDetections: result.successfulDetections,
        totalElementsFound: result.totalElementsFound,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Batch element detection failed for session: ${batchDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Batch element detection failed',error: error instanceof Error ? error.message : String(error),sessionId: batchDto.sessionId,
      });
    }
  }

  // ===========================
  // VISUAL AUTOMATION ENDPOINTS
  // ===========================

  /**
   * Extract text using OCR
   */
  @Post('visual/ocr-extract')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'OCR text extraction',description: 'Extract text from screenshots using various OCR engines and preprocessing options',})@ApiBody({ type: OCRExtractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OCR extraction completed',
    type: OCRExtractionResultDto,
  })
  async extractTextOCR(
    @Body() ocrDto: OCRExtractionDto,
  ): Promise<OCRExtractionResultDto> {
    this.logger.log(`OCR text extraction for session: ${ocrDto.sessionId}`, {engine: ocrDto.ocrConfig?.engine,language: ocrDto.ocrConfig?.language,
      regionsCount: ocrDto.regions?.length || 0,
    });

    try {
      const result = await this.browserUseService.extractTextOCR(ocrDto);

      this.logger.log(`OCR extraction completed: ${result.extractionId}`, {success: result.success,textBlocksDetected: result.textBlocksDetected,
        overallConfidence: result.overallConfidence,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `OCR extraction failed for session: ${ocrDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'OCR text extraction failed',error: error instanceof Error ? error.message : String(error),sessionId: ocrDto.sessionId,
      });
    }
  }

  /**
   * Interact with visual elements
   */
  @Post('visual/element-interact')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Visual element interaction',description: 'Detect and interact with visual elements using AI, template matching, or description',})@ApiBody({ type: VisualElementInteractionDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Visual element interaction completed',
    type: VisualElementDetectionResultDto,
  })
  async interactWithVisualElement(
    @Body() interactionDto: VisualElementInteractionDto,
  ): Promise<VisualElementDetectionResultDto> {
    this.logger.log(`Visual element interaction for session: ${interactionDto.sessionId}`, {elementType: interactionDto.elementDetection.elementType,interactionType: interactionDto.interactionType,
      description: interactionDto.elementDetection.description,
    });

    try {
      const result = await this.browserUseService.interactWithVisualElement(interactionDto);

      this.logger.log(`Visual element interaction completed: ${result.detectionId}`, {success: result.success,elementType: result.elementType,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Visual element interaction failed for session: ${interactionDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Visual element interaction failed',error: error instanceof Error ? error.message : String(error),sessionId: interactionDto.sessionId,
      });
    }
  }

  /**
   * Compare images for similarity
   */
  @Post('visual/image-compare')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Image comparison',description: 'Compare screenshots with reference images using various algorithms',})@ApiBody({ type: ImageComparisonDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Image comparison completed',
    type: ImageComparisonResultDto,
  })
  async compareImages(
    @Body() comparisonDto: ImageComparisonDto,
  ): Promise<ImageComparisonResultDto> {
    this.logger.log(`Image comparison for session: ${comparisonDto.sessionId}`, {algorithm: comparisonDto.comparisonConfig.algorithm,similarityThreshold: comparisonDto.comparisonConfig.similarityThreshold,
      returnDifferenceImage: comparisonDto.returnDifferenceImage,
    });

    try {
      const result = await this.browserUseService.compareImages(comparisonDto);

      this.logger.log(`Image comparison completed: ${result.comparisonId}`, {success: result.success,similarityScore: result.similarityScore,
        isMatch: result.isMatch,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Image comparison failed for session: ${comparisonDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Image comparison failed',error: error instanceof Error ? error.message : String(error),sessionId: comparisonDto.sessionId,
      });
    }
  }

  // ===========================
  // REAL-TIME UPDATES ENDPOINTS
  // ===========================

  /**
   * Subscribe to real-time browser events via WebSocket
   */
  @Post('realtime/subscribe')@HttpCode(HttpStatus.CREATED)@ApiOperation({
    summary: 'Subscribe to real-time events',description: 'Subscribe to real-time browser events via WebSocket connection',})@ApiBody({ type: RealtimeSubscriptionDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Real-time subscription created',
    type: RealtimeConnectionStatusDto,
  })
  async subscribeToRealtimeEvents(
    @Body() subscriptionDto: RealtimeSubscriptionDto,
  ): Promise<RealtimeConnectionStatusDto> {
    this.logger.log(`Creating real-time subscription for session: ${subscriptionDto.sessionId}`, {subscriptionTypes: subscriptionDto.subscriptionTypes,includeScreenshots: subscriptionDto.includeScreenshots,
      clientId: subscriptionDto.clientId,
    });

    try {
      const result = await this.browserUseService.subscribeToRealtimeEvents(subscriptionDto);

      this.logger.log(`Real-time subscription created: ${result.connectionId}`, {activeSubscriptions: result.activeSubscriptions,state: result.state,
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Real-time subscription failed for session: ${subscriptionDto.sessionId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException({
        message: 'Real-time subscription failed',error: error instanceof Error ? error.message : String(error),sessionId: subscriptionDto.sessionId,
      });
    }
  }

  /**
   * Get real-time connection status
   */
  @Get('realtime/connections/:connectionId')@ApiOperation({summary: 'Get connection status',description: 'Retrieve status and metrics for a real-time connection',})@ApiParam({ name: 'connectionId', description: 'Connection identifier' })@ApiResponse({status: HttpStatus.OK,
    description: 'Connection status retrieved',type: RealtimeConnectionStatusDto,})
  async getConnectionStatus(
    @Param('connectionId') connectionId: string,
  ): Promise<RealtimeConnectionStatusDto> {
    this.logger.log(`Getting connection status: ${connectionId}`);const status = await this.browserUseService.getConnectionStatus(connectionId);if (!status) {
      throw new NotFoundException(`Connection not found: ${connectionId}`);
    }

    return status;
  }

  /**
   * Close real-time connection
   */
  @Delete('realtime/connections/:connectionId')@HttpCode(HttpStatus.NO_CONTENT)@ApiOperation({
    summary: 'Close real-time connection',description: 'Close a real-time WebSocket connection',})@ApiParam({ name: 'connectionId', description: 'Connection identifier' })@ApiResponse({status: HttpStatus.NO_CONTENT,
    description: 'Connection closed successfully',})async closeRealtimeConnection(
    @Param('connectionId') connectionId: string,
  ): Promise<void> {
    this.logger.log(`Closing real-time connection: ${connectionId}`);try {await this.browserUseService.closeRealtimeConnection(connectionId);
      this.logger.log(`Real-time connection closed: ${connectionId}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Connection not found: ${connectionId}`);
      }
      throw error;
    }
  }

  /**
   * Server-Sent Events stream for real-time updates
   */
  @Sse('realtime/events/:sessionId')@ApiOperation({summary: 'Real-time events stream',description: 'Server-Sent Events stream for real-time browser automation updates',})@ApiParam({ name: 'sessionId', description: 'Browser session identifier' })@ApiQuery({ name: 'eventTypes', required: false, description: 'Comma-separated event types to stream' })@ApiQuery({ name: 'includeScreenshots', required: false, type: Boolean, description: 'Include screenshots in events' })async streamRealtimeEvents(@Param('sessionId') sessionId: string,@Query('eventTypes') eventTypes?: string,@Query('includeScreenshots') includeScreenshots?: boolean,
  ): Promise<Observable<MessageEvent>> {
    this.logger.log(`Starting SSE stream for session: ${sessionId}`, {
      eventTypes: eventTypes?.split(',') || 'all',includeScreenshots: includeScreenshots || false,});

    const sseConfig: SSEConfigDto = {
      sessionId,
      eventTypes: eventTypes ? eventTypes.split(',') as RealtimeEventType[] : undefined,filter: {includeEventTypes: eventTypes ? eventTypes.split(',') as RealtimeEventType[] : undefined,},keepAlive: true,
      heartbeatInterval: 30,
      includeRetry: true,
      metadata: {
        includeScreenshots: includeScreenshots || false,
      },
    };

    return this.browserUseService.createSSEStream(sseConfig);
  }

  /**
   * Get real-time event statistics
   */
  @Get('realtime/stats/:sessionId')@ApiOperation({summary: 'Get real-time event statistics',description: 'Retrieve statistics for real-time events in a session',})@ApiParam({ name: 'sessionId', description: 'Browser session identifier' })@ApiQuery({ name: 'period', required: false, description: 'Statistics period in minutes', type: Number })@ApiResponse({status: HttpStatus.OK,
    description: 'Event statistics retrieved',type: RealtimeEventStatsDto,})
  async getRealtimeEventStats(
    @Param('sessionId') sessionId: string,@Query('period') period?: number,
  ): Promise<RealtimeEventStatsDto> {
    this.logger.log(`Getting real-time event stats for session: ${sessionId}`, {period: period || 60,});

    const stats = await this.browserUseService.getRealtimeEventStats(sessionId, period || 60);
    if (!stats) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return stats;
  }

  // ===========================
  // UTILITY AND HEALTH ENDPOINTS
  // ===========================

  /**
   * Enhanced health check with detailed metrics
   */
  @Get('health')@ApiOperation({summary: 'Enhanced health check',description: 'Comprehensive health check with detailed metrics for all automation components',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health information',})async getEnhancedHealth() {
    this.logger.log('Enhanced health check requested');const activeSessions = await this.sessionService.getAllSessions();const runningTasks = await this.taskService.getTasksByStatus(BrowserTaskStatus.RUNNING);
    const taskMetrics = await this.taskService.getTaskMetrics();

    // Get additional metrics for enhanced endpoints
    const screenshotMetrics = await this.browserUseService.getScreenshotMetrics();
    const domInteractionMetrics = await this.browserUseService.getDOMInteractionMetrics();
    const elementDetectionMetrics = await this.browserUseService.getElementDetectionMetrics();
    const ocrMetrics = await this.browserUseService.getOCRMetrics();
    const realtimeMetrics = await this.browserUseService.getRealtimeMetrics();

    const healthData = {
      status: 'healthy',service: 'Enhanced Browser Automation Controller',timestamp: new Date().toISOString(),version: '3.0.0',capabilities: {multiFormatScreenshots: true,
        advancedDOMInteraction: true,
        aiElementDetection: true,
        ocrTextExtraction: true,
        visualAutomation: true,
        realtimeUpdates: true,
        batchOperations: true,
      },
      statistics: {
        // Core metrics
        activeSessions: activeSessions.filter(s => s.status === BrowserSessionStatus.ACTIVE).length,
        runningTasks: runningTasks.length,
        totalTasksCompleted: taskMetrics.completedTasks,
        successRate: taskMetrics.successRate,

        // Enhanced metrics
        screenshotsCaptured: screenshotMetrics.totalCaptured,
        domInteractions: domInteractionMetrics.totalInteractions,
        elementsDetected: elementDetectionMetrics.totalDetected,
        ocrExtractions: ocrMetrics.totalExtractions,
        realtimeConnections: realtimeMetrics.activeConnections,
      },
      performance: {
        avgScreenshotTime: screenshotMetrics.averageCaptureTime,
        avgDOMInteractionTime: domInteractionMetrics.averageInteractionTime,
        avgElementDetectionTime: elementDetectionMetrics.averageDetectionTime,
        avgOCRTime: ocrMetrics.averageExtractionTime,
        realtimeLatency: realtimeMetrics.averageLatency,
      },
      uptime: process.uptime(),
    };

    this.logger.log('Enhanced health check completed', {activeSessions: healthData.statistics.activeSessions,capabilities: Object.keys(healthData.capabilities).length,
    });

    return healthData;
  }

  /**
   * Get comprehensive automation capabilities
   */
  @Get('capabilities')@ApiOperation({summary: 'Get automation capabilities',description: 'Retrieve detailed information about available automation capabilities and features',})@ApiResponse({
    status: HttpStatus.OK,
    description: 'Automation capabilities information',})async getAutomationCapabilities() {
    this.logger.log('Automation capabilities requested');return {screenshots: {
        formats: Object.values(ScreenshotFormat),
        types: Object.values(ScreenshotType),
        features: [
          'Full page capture','Element-specific capture','Viewport capture','Custom region capture','Multi-format support','Quality control','Batch operations',],},
      domInteraction: {
        actions: Object.values(DOMActionType),
        targeting: [
          'CSS selectors','XPath expressions','Coordinate-based','Text content matching','Attribute filtering',],features: [
          'Typing with delays','Scroll control','Drag and drop','File uploads','Key combinations','Batch operations',],},
      elementDetection: {
        strategies: Object.values(DetectionStrategy),
        features: [
          'Wait conditions','Stability checks','Visibility detection','Interactability detection','AI-powered detection','Visual similarity matching','Batch detection',],},
      visualAutomation: {
        ocrEngines: Object.values(OCREngine),
        elementTypes: Object.values(VisualElementType),
        features: [
          'Multi-language OCR','Template matching','Image comparison','Visual element interaction','Preprocessing options','Confidence scoring',],},
      realtimeUpdates: {
        eventTypes: Object.values(RealtimeEventType),
        subscriptionTypes: Object.values(SubscriptionType),
        features: [
          'WebSocket connections','Server-Sent Events','Event filtering','Auto-reconnection','Event buffering','Statistics tracking',
        ],
      },
      general: {
        localOnly: true,
        enterpriseGrade: true,
        highPerformance: true,
        concurrent: true,
        batchOperations: true,
        realTimeMonitoring: true,
      },
    };
  }
}