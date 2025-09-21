import { Test, TestingModule } from '@nestjs/testing';import { HttpStatus, NotFoundException, InternalServerErrorException } from '@nestjs/common';import { Observable } from 'rxjs';import { EnhancedBrowserAutomationController } from '../enhanced-browser-automation.controller';import { BrowserUseService } from '../browser-use.service';import { BrowserSessionService } from '../browser-session.service';import { BrowserTaskService } from '../browser-task.service';import { BrowserTaskStatus, BrowserSessionStatus } from '../dto/browser-session.dto';import {ScreenshotCaptureDto,
  BatchScreenshotCaptureDto,
  ScreenshotResultDto,
  BatchScreenshotResultDto,
  ScreenshotFormat,
  ScreenshotType,
} from '../dto/screenshot.dto';import {DOMInteractionDto,
  BatchDOMInteractionDto,
  DOMInteractionResultDto,
  BatchDOMInteractionResultDto,
  DOMActionType,
} from '../dto/dom-interaction.dto';import {ElementDetectionDto,
  ElementDetectionResultDto,
  DetectionStrategy,
} from '../dto/element-detection.dto';import {OCRExtractionDto,
  OCRExtractionResultDto,
  OCREngine,
} from '../dto/visual-automation.dto';import {RealtimeSubscriptionDto,
  RealtimeConnectionStatusDto,
  SSEConfigDto,
} from '../dto/realtime-updates.dto';describe('EnhancedBrowserAutomationController', () => {let controller: EnhancedBrowserAutomationController;let browserUseService: jest.Mocked<BrowserUseService>;
  let sessionService: jest.Mocked<BrowserSessionService>;
  let taskService: jest.Mocked<BrowserTaskService>;

  const mockScreenshotResult: ScreenshotResultDto = {
    screenshotId: 'screenshot-123',sessionId: 'session-123',success: true,format: ScreenshotFormat.PNG,
    type: ScreenshotType.FULLPAGE,
    base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',dimensions: { width: 1280, height: 720 },fileSizeBytes: 1024,
    quality: 90,
    timestamp: new Date(),
    captureTimeMs: 150,
  };

  const mockDOMInteractionResult: DOMInteractionResultDto = {
    interactionId: 'interaction-123',sessionId: 'session-123',success: true,action: DOMActionType.CLICK,
    elementFound: true,
    coordinates: { x: 100, y: 200 },
    durationMs: 50,
    timestamp: new Date(),
    screenshot: mockScreenshotResult,
  };

  const mockElementDetectionResult: ElementDetectionResultDto = {
    detectionId: 'detection-123',sessionId: 'session-123',success: true,strategy: DetectionStrategy.CSS_SELECTOR,
    elementsFound: 1,
    elements: [
      {
        selector: '#submit-button',coordinates: { x: 100, y: 200 },dimensions: { width: 120, height: 40 },
        visible: true,
        interactable: true,
      },
    ],
    detectionTimeMs: 200,
    timestamp: new Date(),
  };

  const mockOCRResult: OCRExtractionResultDto = {
    extractionId: 'ocr-123',sessionId: 'session-123',success: true,engine: OCREngine.TESSERACT,
    textBlocksDetected: 5,
    overallConfidence: 0.95,
    textBlocks: [
      {
        text: 'Sample Text',coordinates: { x: 10, y: 20, width: 100, height: 30 },confidence: 0.98,
      },
    ],
    processingTimeMs: 500,
    timestamp: new Date(),
  };

  const mockRealtimeConnectionStatus: RealtimeConnectionStatusDto = {
    connectionId: 'conn-123',sessionId: 'session-123',state: 'connected',activeSubscriptions: ['page-changes', 'dom-mutations'],eventsReceived: 25,lastEventTimestamp: new Date(),
    connectionDurationMs: 60000,
    averageLatencyMs: 15,
  };

  beforeEach(async () => {
    const mockBrowserUseService = {
      captureEnhancedScreenshot: jest.fn(),
      batchCaptureScreenshots: jest.fn(),
      performDOMInteraction: jest.fn(),
      performBatchDOMInteractions: jest.fn(),
      detectElements: jest.fn(),
      batchDetectElements: jest.fn(),
      extractTextOCR: jest.fn(),
      interactWithVisualElement: jest.fn(),
      compareImages: jest.fn(),
      subscribeToRealtimeEvents: jest.fn(),
      getConnectionStatus: jest.fn(),
      closeRealtimeConnection: jest.fn(),
      createSSEStream: jest.fn(),
      getRealtimeEventStats: jest.fn(),
      getScreenshotMetrics: jest.fn(),
      getDOMInteractionMetrics: jest.fn(),
      getElementDetectionMetrics: jest.fn(),
      getOCRMetrics: jest.fn(),
      getRealtimeMetrics: jest.fn(),
    };

    const mockSessionService = {
      getAllSessions: jest.fn(),
    };

    const mockTaskService = {
      getTasksByStatus: jest.fn(),
      getTaskMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnhancedBrowserAutomationController],
      providers: [
        {
          provide: BrowserUseService,
          useValue: mockBrowserUseService,
        },
        {
          provide: BrowserSessionService,
          useValue: mockSessionService,
        },
        {
          provide: BrowserTaskService,
          useValue: mockTaskService,
        },
      ],
    }).compile();

    controller = module.get<EnhancedBrowserAutomationController>(EnhancedBrowserAutomationController);
    browserUseService = module.get(BrowserUseService);
    sessionService = module.get(BrowserSessionService);
    taskService = module.get(BrowserTaskService);
  });

  it('should be defined', () => {expect(controller).toBeDefined();});

  describe('captureScreenshot', () => {const captureDto: ScreenshotCaptureDto = {sessionId: 'session-123',type: ScreenshotType.FULLPAGE,format: ScreenshotFormat.PNG,
      quality: 90,
      waitForElement: '#content',timeout: 5000,};

    it('should capture a screenshot successfully', async () => {browserUseService.captureEnhancedScreenshot.mockResolvedValue(mockScreenshotResult);const result = await controller.captureScreenshot(captureDto);

      expect(result).toEqual(mockScreenshotResult);
      expect(browserUseService.captureEnhancedScreenshot).toHaveBeenCalledWith(captureDto);
    });

    it('should handle screenshot capture failure', async () => {const error = new Error('Screenshot capture failed');browserUseService.captureEnhancedScreenshot.mockRejectedValue(error);await expect(controller.captureScreenshot(captureDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('batchCaptureScreenshots', () => {const batchDto: BatchScreenshotCaptureDto = {sessionId: 'session-123',screenshots: [{
          type: ScreenshotType.FULLPAGE,
          format: ScreenshotFormat.PNG,
          quality: 90,
        },
        {
          type: ScreenshotType.VIEWPORT,
          format: ScreenshotFormat.JPEG,
          quality: 80,
        },
      ],
      intervalMs: 1000,
      continueOnError: true,
    };

    it('should capture batch screenshots successfully', async () => {const batchResult: BatchScreenshotResultDto = {batchId: 'batch-123',sessionId: 'session-123',totalRequested: 2,successfulCaptures: 2,
        failedCaptures: 0,
        screenshots: [mockScreenshotResult, mockScreenshotResult],
        batchDurationMs: 2000,
        timestamp: new Date(),
      };

      browserUseService.batchCaptureScreenshots.mockResolvedValue(batchResult);

      const result = await controller.batchCaptureScreenshots(batchDto);

      expect(result).toEqual(batchResult);
      expect(browserUseService.batchCaptureScreenshots).toHaveBeenCalledWith(batchDto);
    });
  });

  describe('performDOMInteraction', () => {const interactionDto: DOMInteractionDto = {sessionId: 'session-123',action: DOMActionType.CLICK,selector: {
        value: '#submit-button',type: 'css',},waitForElement: true,
      timeout: 5000,
      captureScreenshot: true,
    };

    it('should perform DOM interaction successfully', async () => {browserUseService.performDOMInteraction.mockResolvedValue(mockDOMInteractionResult);const result = await controller.performDOMInteraction(interactionDto);

      expect(result).toEqual(mockDOMInteractionResult);
      expect(browserUseService.performDOMInteraction).toHaveBeenCalledWith(interactionDto);
    });

    it('should handle DOM interaction failure', async () => {const error = new Error('DOM interaction failed');browserUseService.performDOMInteraction.mockRejectedValue(error);await expect(controller.performDOMInteraction(interactionDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('performBatchDOMInteractions', () => {const batchDto: BatchDOMInteractionDto = {sessionId: 'session-123',interactions: [{
          action: DOMActionType.CLICK,
          selector: { value: '#button1', type: 'css' },},{
          action: DOMActionType.TYPE,
          selector: { value: '#input1', type: 'css' },value: 'test input',},],
      continueOnError: true,
      captureScreenshots: true,
      intervalMs: 500,
    };

    it('should perform batch DOM interactions successfully', async () => {const batchResult: BatchDOMInteractionResultDto = {batchId: 'batch-123',sessionId: 'session-123',totalRequested: 2,successfulInteractions: 2,
        failedInteractions: 0,
        interactions: [mockDOMInteractionResult, mockDOMInteractionResult],
        batchDurationMs: 1000,
        timestamp: new Date(),
      };

      browserUseService.performBatchDOMInteractions.mockResolvedValue(batchResult);

      const result = await controller.performBatchDOMInteractions(batchDto);

      expect(result).toEqual(batchResult);
      expect(browserUseService.performBatchDOMInteractions).toHaveBeenCalledWith(batchDto);
    });
  });

  describe('detectElements', () => {const detectionDto: ElementDetectionDto = {sessionId: 'session-123',criteria: {strategy: DetectionStrategy.CSS_SELECTOR,
        value: '.clickable-button',},waitConfig: {
        condition: 'visible',timeout: 5000,},
      includeScreenshot: true,
    };

    it('should detect elements successfully', async () => {browserUseService.detectElements.mockResolvedValue(mockElementDetectionResult);const result = await controller.detectElements(detectionDto);

      expect(result).toEqual(mockElementDetectionResult);
      expect(browserUseService.detectElements).toHaveBeenCalledWith(detectionDto);
    });

    it('should handle element detection failure', async () => {const error = new Error('Element detection failed');browserUseService.detectElements.mockRejectedValue(error);await expect(controller.detectElements(detectionDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('extractTextOCR', () => {const ocrDto: OCRExtractionDto = {sessionId: 'session-123',ocrConfig: {engine: OCREngine.TESSERACT,
        language: 'eng',confidence: 0.8,},
      regions: [
        {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
        },
      ],
      preprocessing: {
        grayscale: true,
        sharpen: true,
        contrast: 1.2,
      },
    };

    it('should extract text using OCR successfully', async () => {browserUseService.extractTextOCR.mockResolvedValue(mockOCRResult);const result = await controller.extractTextOCR(ocrDto);

      expect(result).toEqual(mockOCRResult);
      expect(browserUseService.extractTextOCR).toHaveBeenCalledWith(ocrDto);
    });

    it('should handle OCR extraction failure', async () => {const error = new Error('OCR extraction failed');browserUseService.extractTextOCR.mockRejectedValue(error);await expect(controller.extractTextOCR(ocrDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('subscribeToRealtimeEvents', () => {const subscriptionDto: RealtimeSubscriptionDto = {sessionId: 'session-123',subscriptionTypes: ['page-changes', 'dom-mutations'],includeScreenshots: true,clientId: 'client-123',eventFilters: {elementSelectors: ['.important'],urlPatterns: ['*/api/*'],},};

    it('should subscribe to real-time events successfully', async () => {browserUseService.subscribeToRealtimeEvents.mockResolvedValue(mockRealtimeConnectionStatus);const result = await controller.subscribeToRealtimeEvents(subscriptionDto);

      expect(result).toEqual(mockRealtimeConnectionStatus);
      expect(browserUseService.subscribeToRealtimeEvents).toHaveBeenCalledWith(subscriptionDto);
    });

    it('should handle subscription failure', async () => {const error = new Error('Subscription failed');browserUseService.subscribeToRealtimeEvents.mockRejectedValue(error);await expect(controller.subscribeToRealtimeEvents(subscriptionDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getConnectionStatus', () => {it('should return connection status', async () => {browserUseService.getConnectionStatus.mockResolvedValue(mockRealtimeConnectionStatus);const result = await controller.getConnectionStatus('conn-123');expect(result).toEqual(mockRealtimeConnectionStatus);expect(browserUseService.getConnectionStatus).toHaveBeenCalledWith('conn-123');});it('should throw NotFoundException when connection not found', async () => {browserUseService.getConnectionStatus.mockResolvedValue(null);await expect(controller.getConnectionStatus('invalid-conn')).rejects.toThrow(NotFoundException,);
    });
  });

  describe('closeRealtimeConnection', () => {it('should close real-time connection successfully', async () => {browserUseService.closeRealtimeConnection.mockResolvedValue(undefined);await controller.closeRealtimeConnection('conn-123');expect(browserUseService.closeRealtimeConnection).toHaveBeenCalledWith('conn-123');});it('should throw NotFoundException when connection not found', async () => {const error = new Error('Connection not found');browserUseService.closeRealtimeConnection.mockRejectedValue(error);await expect(controller.closeRealtimeConnection('invalid-conn')).rejects.toThrow(NotFoundException,);
    });
  });

  describe('streamRealtimeEvents', () => {it('should create SSE stream successfully', async () => {const mockObservable = new Observable((subscriber) => {subscriber.next({ data: 'test event' });subscriber.complete();});

      browserUseService.createSSEStream.mockReturnValue(mockObservable);

      const result = await controller.streamRealtimeEvents(
        'session-123','page-changes,dom-mutations',true,);

      expect(result).toBe(mockObservable);
      expect(browserUseService.createSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'session-123',eventTypes: ['page-changes', 'dom-mutations'],metadata: { includeScreenshots: true },}),
      );
    });
  });

  describe('getRealtimeEventStats', () => {it('should return real-time event statistics', async () => {const mockStats = {sessionId: 'session-123',periodMinutes: 60,totalEvents: 150,
        eventBreakdown: {
          'page-changes': 50,'dom-mutations': 100,},averageEventsPerMinute: 2.5,
        peakEventsPerMinute: 10,
        lastEventTimestamp: new Date(),
      };

      browserUseService.getRealtimeEventStats.mockResolvedValue(mockStats);

      const result = await controller.getRealtimeEventStats('session-123', 60);expect(result).toEqual(mockStats);expect(browserUseService.getRealtimeEventStats).toHaveBeenCalledWith('session-123', 60);});it('should throw NotFoundException when session not found', async () => {browserUseService.getRealtimeEventStats.mockResolvedValue(null);await expect(controller.getRealtimeEventStats('invalid-session', 60)).rejects.toThrow(NotFoundException,);
    });
  });

  describe('getEnhancedHealth', () => {it('should return enhanced health information', async () => {const mockSessions = [{ sessionId: 'session-1', status: BrowserSessionStatus.ACTIVE },];const mockRunningTasks = [
        { taskId: 'task-1', status: BrowserTaskStatus.RUNNING },];const mockTaskMetrics = {
        totalTasks: 10,
        completedTasks: 8,
        successRate: 0.8,
        averageExecutionTime: 2500,
      };

      const mockMetrics = {
        totalCaptured: 100,
        averageCaptureTime: 150,
        totalInteractions: 200,
        averageInteractionTime: 50,
        totalDetected: 300,
        averageDetectionTime: 200,
        totalExtractions: 50,
        averageExtractionTime: 500,
        activeConnections: 5,
        averageLatency: 15,
      };

      sessionService.getAllSessions.mockResolvedValue(mockSessions as any);
      taskService.getTasksByStatus.mockResolvedValue(mockRunningTasks as any);
      taskService.getTaskMetrics.mockResolvedValue(mockTaskMetrics);
      browserUseService.getScreenshotMetrics.mockResolvedValue(mockMetrics);
      browserUseService.getDOMInteractionMetrics.mockResolvedValue(mockMetrics);
      browserUseService.getElementDetectionMetrics.mockResolvedValue(mockMetrics);
      browserUseService.getOCRMetrics.mockResolvedValue(mockMetrics);
      browserUseService.getRealtimeMetrics.mockResolvedValue(mockMetrics);

      const result = await controller.getEnhancedHealth();

      expect(result.status).toBe('healthy');expect(result.service).toBe('Enhanced Browser Automation Controller');expect(result.version).toBe('3.0.0');expect(result.capabilities.multiFormatScreenshots).toBe(true);expect(result.statistics.activeSessions).toBe(1);
      expect(result.statistics.runningTasks).toBe(1);
      expect(result.performance.avgScreenshotTime).toBe(150);
    });
  });

  describe('getAutomationCapabilities', () => {it('should return automation capabilities', async () => {
      const result = await controller.getAutomationCapabilities();

      expect(result.screenshots.formats).toContain(ScreenshotFormat.PNG);
      expect(result.screenshots.formats).toContain(ScreenshotFormat.JPEG);
      expect(result.screenshots.types).toContain(ScreenshotType.FULLPAGE);
      expect(result.domInteraction.actions).toContain(DOMActionType.CLICK);
      expect(result.elementDetection.strategies).toContain(DetectionStrategy.CSS_SELECTOR);
      expect(result.visualAutomation.ocrEngines).toContain(OCREngine.TESSERACT);
      expect(result.general.localOnly).toBe(true);
      expect(result.general.enterpriseGrade).toBe(true);
    });
  });
});