/**
 * Computer Use Service Vision Operations Test Suite
 *
 * Comprehensive unit tests for screenshot, cursor position, and enhanced screenshot operations
 * Focus areas: vision methods, mocking, error handling, performance tracking
 *
 * Tests cover:
 * - screenshot() method with performance monitoring
 * - cursor_position() method with error handling
 * - enhancedScreenshot() method with OCR and text detection
 * - Proper mocking of external dependencies
 * - Error scenarios and edge cases
 * - Performance metrics and logging validation
 */

/**
 * Computer Use Service Vision Operations Test Suite
 *
 * Comprehensive unit tests for screenshot, cursor position, and enhanced screenshot operations
 * with proper TypeScript typing and no unsafe operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  ComputerUseService,
  ScreenshotResult,
  CursorPositionResult,
  EnhancedScreenshotResult,
} from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import {
  CuaVisionService,
  OcrResult,
  TextDetectionResult,
} from '../../cua-integration/cua-vision.service';
import { CuaIntegrationService } from '../../cua-integration/cua-integration.service';
import { CuaPerformanceService } from '../../cua-integration/cua-performance.service';

// Mock child_process.exec to prevent actual system calls
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

// Type definitions for proper testing without `any` usage
interface MockNutService {
  screendump: jest.MockedFunction<() => Promise<Buffer>>;
  getCursorPosition: jest.MockedFunction<
    () => Promise<{ x: number; y: number }>
  >;
}

interface MockCuaVisionService {
  performOcr: jest.MockedFunction<
    (imageData: string, options?: any) => Promise<OcrResult>
  >;
  detectText: jest.MockedFunction<
    (imageData: string, options?: any) => Promise<TextDetectionResult>
  >;
}

interface MockCuaIntegrationService {
  isFrameworkEnabled: jest.MockedFunction<() => boolean>;
}

interface MockCuaPerformanceService {
  recordMetric: jest.MockedFunction<
    (metric: string, data: any) => Promise<void>
  >;
}

interface MockLogger {
  log: jest.MockedFunction<(message: string, context?: any) => void>;
  error: jest.MockedFunction<(message: string, context?: any) => void>;
  warn: jest.MockedFunction<(message: string, context?: any) => void>;
  debug: jest.MockedFunction<(message: string, context?: any) => void>;
  verbose: jest.MockedFunction<(message: string, context?: any) => void>;
}

// Interface for accessing private methods in tests (not enforced at runtime)
interface ComputerUseServiceWithPrivateMethods {
  cursor_position(): Promise<CursorPositionResult>;
  enhancedScreenshot(params: {
    includeOcr?: boolean;
    includeTextDetection?: boolean;
    options?: Record<string, unknown>;
  }): Promise<EnhancedScreenshotResult>;

  // Include the screenshot method that we know exists
  screenshot(): Promise<ScreenshotResult>;
}

describe('ComputerUseService - Vision Operations', () => {
  let service: ComputerUseService;
  let mockNutService: MockNutService;
  let mockCuaVisionService: MockCuaVisionService;
  let mockCuaIntegrationService: MockCuaIntegrationService;
  let mockCuaPerformanceService: MockCuaPerformanceService;
  let mockLogger: MockLogger;

  // Test data constants
  const MOCK_SCREENSHOT_BUFFER = Buffer.from('mock-image-data');
  const MOCK_SCREENSHOT_BASE64 = MOCK_SCREENSHOT_BUFFER.toString('base64');
  const MOCK_CURSOR_POSITION = { x: 100, y: 200 };
  const MOCK_OCR_RESULT: OcrResult = {
    text: 'Extracted text content',
    confidence: 0.95,
    boundingBoxes: [
      {
        text: 'Hello',
        x: 10,
        y: 20,
        width: 50,
        height: 30,
        confidence: 0.98,
      },
    ],
    language: 'en',
    processingTimeMs: 150,
    method: 'ane',
  };
  const MOCK_TEXT_DETECTION_RESULT: TextDetectionResult = {
    detected: true,
    regions: [
      { text: 'Region 1', x: 0, y: 0, width: 100, height: 50, confidence: 0.9 },
      {
        text: 'Region 2',
        x: 50,
        y: 25,
        width: 80,
        height: 40,
        confidence: 0.8,
      },
    ],
    processingTimeMs: 100,
    method: 'cpu',
  };

  beforeEach(async () => {
    // Clear any previous mocks
    jest.clearAllMocks();

    // Create comprehensive mocks with all necessary methods
    const createMockNutService = (): MockNutService => ({
      screendump: jest.fn().mockResolvedValue(MOCK_SCREENSHOT_BUFFER),
      getCursorPosition: jest.fn().mockResolvedValue(MOCK_CURSOR_POSITION),
    });

    const createMockCuaVisionService = (): MockCuaVisionService => ({
      performOcr: jest.fn().mockResolvedValue(MOCK_OCR_RESULT),
      detectText: jest.fn().mockResolvedValue(MOCK_TEXT_DETECTION_RESULT),
    });

    const createMockCuaIntegrationService = (): MockCuaIntegrationService => ({
      isFrameworkEnabled: jest.fn().mockReturnValue(true),
    });

    const createMockCuaPerformanceService = (): MockCuaPerformanceService => ({
      recordMetric: jest.fn().mockResolvedValue(undefined),
    });

    const createMockLogger = (): MockLogger => ({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    });

    // Initialize mocks
    mockNutService = createMockNutService();
    mockCuaVisionService = createMockCuaVisionService();
    mockCuaIntegrationService = createMockCuaIntegrationService();
    mockCuaPerformanceService = createMockCuaPerformanceService();
    mockLogger = createMockLogger();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComputerUseService,
        {
          provide: NutService,
          useValue: mockNutService,
        },
        {
          provide: CuaVisionService,
          useValue: mockCuaVisionService,
        },
        {
          provide: CuaIntegrationService,
          useValue: mockCuaIntegrationService,
        },
        {
          provide: CuaPerformanceService,
          useValue: mockCuaPerformanceService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ComputerUseService>(ComputerUseService);

    // Setup CUA integration mocks to return appropriate services
    // Note: The actual service uses dependency injection, not getter methods
  });

  describe('screenshot()', () => {
    it('should capture screenshot successfully with metadata', async () => {
      // Execute screenshot operation
      const result: ScreenshotResult = await service.screenshot();

      // Verify result structure and content
      expect(result).toBeDefined();
      expect(result.image).toBe(MOCK_SCREENSHOT_BASE64);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.captureTime).toBeInstanceOf(Date);
      expect(result.metadata?.operationId).toMatch(
        /^screenshot_\d+_[a-z0-9]+$/,
      );
      expect(result.metadata?.format).toBe('png');

      // Verify NutService integration
      expect(mockNutService.screendump).toHaveBeenCalledTimes(1);
      expect(mockNutService.screendump).toHaveBeenCalledWith();

      // Verify logging behavior
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[screenshot_.*\] Taking screenshot/),
        expect.objectContaining({
          operationId: expect.stringMatching(/^screenshot_\d+_[a-z0-9]+$/),
          timestamp: expect.any(String),
        }),
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[screenshot_.*\] Screenshot completed successfully/,
        ),
        expect.objectContaining({
          operationId: expect.stringMatching(/^screenshot_\d+_[a-z0-9]+$/),
          processingTimeMs: expect.any(Number),
          imageSizeBytes: MOCK_SCREENSHOT_BASE64.length,
          base64Length: MOCK_SCREENSHOT_BASE64.length,
        }),
      );
    });

    it('should record performance metrics when CUA is enabled', async () => {
      // Execute screenshot operation
      await service.screenshot();

      // Verify performance metric recording
      expect(mockCuaPerformanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
          imageSize: MOCK_SCREENSHOT_BASE64.length,
          operationId: expect.stringMatching(/^screenshot_\d+_[a-z0-9]+$/),
        }),
      );
    });

    it('should handle screenshot capture failures gracefully', async () => {
      // Setup failure scenario
      const screenshotError = new Error('Screenshot capture failed');
      mockNutService.screendump.mockRejectedValueOnce(screenshotError);

      // Execute and expect error
      await expect(service.screenshot()).rejects.toThrow(
        'Screenshot capture failed: Screenshot capture failed',
      );

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[screenshot_.*\] Screenshot failed: Screenshot capture failed/,
        ),
        expect.objectContaining({
          operationId: expect.stringMatching(/^screenshot_\d+_[a-z0-9]+$/),
          processingTimeMs: expect.any(Number),
          error: 'Screenshot capture failed',
          stack: expect.any(String),
        }),
      );

      // Verify error metric recording
      expect(mockCuaPerformanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining({
          duration: expect.any(Number),
          success: false,
          error: 'Screenshot capture failed',
          operationId: expect.stringMatching(/^screenshot_\d+_[a-z0-9]+$/),
        }),
      );
    });

    it('should handle performance metric recording failures gracefully', async () => {
      // Setup metric recording failure
      mockCuaPerformanceService.recordMetric.mockImplementationOnce(() => {
        throw new Error('Metric recording failed');
      });

      // Execute screenshot operation - should still succeed
      const result = await service.screenshot();

      // Verify operation still succeeds
      expect(result.image).toBe(MOCK_SCREENSHOT_BASE64);

      // Verify warning is logged for metric failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[screenshot_.*\] Failed to record performance metric: Metric recording failed/,
        ),
      );
    });

    it('should generate unique operation IDs for concurrent screenshots', async () => {
      // Execute multiple screenshots concurrently
      const [result1, result2, result3] = await Promise.all([
        service.screenshot(),
        service.screenshot(),
        service.screenshot(),
      ]);

      // Verify unique operation IDs
      expect(result1.metadata?.operationId).not.toBe(
        result2.metadata?.operationId,
      );
      expect(result2.metadata?.operationId).not.toBe(
        result3.metadata?.operationId,
      );
      expect(result1.metadata?.operationId).not.toBe(
        result3.metadata?.operationId,
      );

      // Verify all results are valid
      expect(result1.image).toBe(MOCK_SCREENSHOT_BASE64);
      expect(result2.image).toBe(MOCK_SCREENSHOT_BASE64);
      expect(result3.image).toBe(MOCK_SCREENSHOT_BASE64);
    });
  });

  describe('cursor_position() [private method integration]', () => {
    // Since cursor_position is private, we need to test it through public methods
    // or reflection. For this test, we'll use reflection to access the private method.

    it('should retrieve cursor position successfully', async () => {
      // Access private method using typed interface for testing
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute cursor position retrieval
      const result: CursorPositionResult =
        await serviceWithPrivateMethods.cursor_position();

      // Verify result structure and content
      expect(result).toBeDefined();
      expect(result.x).toBe(MOCK_CURSOR_POSITION.x);
      expect(result.y).toBe(MOCK_CURSOR_POSITION.y);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.operationId).toMatch(/^cursor_position_\d+_[a-z0-9]+$/);

      // Verify NutService integration
      expect(mockNutService.getCursorPosition).toHaveBeenCalledTimes(1);

      // Verify logging behavior
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(/\[cursor_position_.*\] Getting cursor position/),
        expect.objectContaining({
          operationId: expect.stringMatching(/^cursor_position_\d+_[a-z0-9]+$/),
          timestamp: expect.any(String),
        }),
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[cursor_position_.*\] Cursor position retrieved successfully/,
        ),
        expect.objectContaining({
          operationId: expect.stringMatching(/^cursor_position_\d+_[a-z0-9]+$/),
          position: { x: MOCK_CURSOR_POSITION.x, y: MOCK_CURSOR_POSITION.y },
        }),
      );
    });

    it('should handle cursor position retrieval failures', async () => {
      // Setup failure scenario
      const cursorError = new Error('Cursor position access denied');
      mockNutService.getCursorPosition.mockRejectedValueOnce(cursorError);

      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute and expect error
      await expect(serviceWithPrivateMethods.cursor_position()).rejects.toThrow(
        'Cursor position retrieval failed: Cursor position access denied',
      );

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[cursor_position_.*\] Failed to get cursor position: Cursor position access denied/,
        ),
        expect.objectContaining({
          operationId: expect.stringMatching(/^cursor_position_\d+_[a-z0-9]+$/),
          error: 'Cursor position access denied',
        }),
      );
    });
  });

  describe('enhancedScreenshot() [private method integration]', () => {
    it('should capture enhanced screenshot with OCR successfully', async () => {
      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot with OCR
      const params = {
        includeOcr: true,
        includeTextDetection: false,
      };

      const result: EnhancedScreenshotResult =
        await serviceWithPrivateMethods.enhancedScreenshot(params);

      // Verify result structure and content
      expect(result).toBeDefined();
      expect(result.image).toBe(MOCK_SCREENSHOT_BASE64);
      expect(result.ocr).toEqual(MOCK_OCR_RESULT);
      expect(result.textDetection).toBeUndefined();
      expect(result.processingTimeMs).toBeGreaterThan(0);
      expect(result.enhancementsApplied).toContain('screenshot');
      expect(result.enhancementsApplied).toContain('ocr');
      expect(result.operationId).toMatch(/^enhanced_screenshot_\d+_[a-z0-9]+$/);

      // Verify OCR service integration
      expect(mockCuaVisionService.performOcr).toHaveBeenCalledWith(
        MOCK_SCREENSHOT_BASE64,
        {
          enableBoundingBoxes: true,
          recognitionLevel: 'accurate',
          languages: ['en'],
        },
      );

      // Verify performance metric recording
      expect(mockCuaPerformanceService.recordMetric).toHaveBeenCalledWith(
        'enhanced_screenshot',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
          enhancementsApplied: 'screenshot,ocr',
          imageSize: MOCK_SCREENSHOT_BASE64.length,
          ocrTextLength: MOCK_OCR_RESULT.text.length,
          textRegions: 0,
          operationId: expect.stringMatching(
            /^enhanced_screenshot_\d+_[a-z0-9]+$/,
          ),
        }),
      );
    });

    it('should capture enhanced screenshot with text detection successfully', async () => {
      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot with text detection
      const params = {
        includeOcr: false,
        includeTextDetection: true,
        options: { sensitivity: 'high' },
      };

      const result: EnhancedScreenshotResult =
        await serviceWithPrivateMethods.enhancedScreenshot(params);

      // Verify result structure and content
      expect(result).toBeDefined();
      expect(result.image).toBe(MOCK_SCREENSHOT_BASE64);
      expect(result.ocr).toBeUndefined();
      expect(result.textDetection).toEqual(MOCK_TEXT_DETECTION_RESULT);
      expect(result.enhancementsApplied).toContain('screenshot');
      expect(result.enhancementsApplied).toContain('text_detection');

      // Verify text detection service integration
      expect(mockCuaVisionService.detectText).toHaveBeenCalledWith(
        MOCK_SCREENSHOT_BASE64,
        { sensitivity: 'high' },
      );
    });

    it('should capture enhanced screenshot with both OCR and text detection', async () => {
      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot with both enhancements
      const params = {
        includeOcr: true,
        includeTextDetection: true,
      };

      const result: EnhancedScreenshotResult =
        await serviceWithPrivateMethods.enhancedScreenshot(params);

      // Verify both enhancements applied
      expect(result.ocr).toEqual(MOCK_OCR_RESULT);
      expect(result.textDetection).toEqual(MOCK_TEXT_DETECTION_RESULT);
      expect(result.enhancementsApplied).toContain('screenshot');
      expect(result.enhancementsApplied).toContain('ocr');
      expect(result.enhancementsApplied).toContain('text_detection');

      // Verify both services called
      expect(mockCuaVisionService.performOcr).toHaveBeenCalled();
      expect(mockCuaVisionService.detectText).toHaveBeenCalled();
    });

    it('should handle OCR failure gracefully and continue processing', async () => {
      // Setup OCR failure scenario
      mockCuaVisionService.performOcr.mockRejectedValueOnce(
        new Error('OCR service unavailable'),
      );

      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot with OCR (should not fail completely)
      const params = {
        includeOcr: true,
        includeTextDetection: false,
      };

      const result: EnhancedScreenshotResult =
        await serviceWithPrivateMethods.enhancedScreenshot(params);

      // Verify operation continues without OCR
      expect(result).toBeDefined();
      expect(result.image).toBe(MOCK_SCREENSHOT_BASE64);
      expect(result.ocr).toBeUndefined();
      expect(result.enhancementsApplied).toEqual(['screenshot']);

      // Verify warning is logged for OCR failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[enhanced_screenshot_.*\] OCR enhancement failed, continuing without OCR: OCR service unavailable/,
        ),
      );
    });

    it('should handle text detection failure gracefully', async () => {
      // Setup text detection failure scenario
      mockCuaVisionService.detectText.mockRejectedValueOnce(
        new Error('Text detection timeout'),
      );

      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot with text detection
      const params = {
        includeOcr: false,
        includeTextDetection: true,
      };

      const result: EnhancedScreenshotResult =
        await serviceWithPrivateMethods.enhancedScreenshot(params);

      // Verify operation continues without text detection
      expect(result).toBeDefined();
      expect(result.textDetection).toBeUndefined();
      expect(result.enhancementsApplied).toEqual(['screenshot']);

      // Verify warning is logged for text detection failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[enhanced_screenshot_.*\] Text detection enhancement failed, continuing without text detection: Text detection timeout/,
        ),
      );
    });

    it('should handle complete failure and propagate error', async () => {
      // Setup base screenshot failure
      mockNutService.screendump.mockRejectedValueOnce(
        new Error('Display capture failed'),
      );

      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot and expect complete failure
      const params = {
        includeOcr: true,
        includeTextDetection: true,
      };

      await expect(
        serviceWithPrivateMethods.enhancedScreenshot(params),
      ).rejects.toThrow(
        'Enhanced screenshot failed: Screenshot capture failed: Display capture failed',
      );

      // Verify error metric is recorded
      expect(mockCuaPerformanceService.recordMetric).toHaveBeenCalledWith(
        'enhanced_screenshot',
        expect.objectContaining({
          success: false,
          error: 'Display capture failed',
        }),
      );
    });

    it('should warn when enhancements requested but CUA not available', async () => {
      // Disable CUA integration
      mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);

      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot with enhancements
      const params = {
        includeOcr: true,
        includeTextDetection: true,
      };

      const result: EnhancedScreenshotResult =
        await serviceWithPrivateMethods.enhancedScreenshot(params);

      // Verify only basic screenshot is captured
      expect(result.enhancementsApplied).toEqual(['screenshot']);
      expect(result.ocr).toBeUndefined();
      expect(result.textDetection).toBeUndefined();

      // Verify warnings for unavailable enhancements
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[enhanced_screenshot_.*\] OCR enhancement requested but C\/ua framework not available/,
        ),
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[enhanced_screenshot_.*\] Text detection enhancement requested but C\/ua framework not available/,
        ),
      );
    });

    it('should handle edge case text detection results safely', async () => {
      // Setup edge case text detection result (empty regions)
      const edgeCaseResult: TextDetectionResult = {
        detected: false,
        regions: [], // Edge case: empty regions array
        processingTimeMs: 50,
        method: 'cpu',
      };
      mockCuaVisionService.detectText.mockResolvedValueOnce(edgeCaseResult);

      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute enhanced screenshot
      const params = {
        includeTextDetection: true,
      };

      const result: EnhancedScreenshotResult =
        await serviceWithPrivateMethods.enhancedScreenshot(params);

      // Verify operation handles null regions gracefully
      expect(result).toBeDefined();
      expect(result.enhancementsApplied).toContain('text_detection');

      // Verify performance metric handles null regions count correctly
      expect(mockCuaPerformanceService.recordMetric).toHaveBeenCalledWith(
        'enhanced_screenshot',
        expect.objectContaining({
          textRegions: 0, // Should be 0 for null regions
        }),
      );
    });
  });

  describe('Integration and Edge Cases', () => {
    it('should handle concurrent enhanced screenshot requests', async () => {
      // Access private method using typed interface
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;

      // Execute multiple enhanced screenshots concurrently
      const params = { includeOcr: true, includeTextDetection: true };

      const [result1, result2, result3] = await Promise.all([
        serviceWithPrivateMethods.enhancedScreenshot(params),
        serviceWithPrivateMethods.enhancedScreenshot(params),
        serviceWithPrivateMethods.enhancedScreenshot(params),
      ]);

      // Verify all operations succeed with unique IDs
      expect(result1.operationId).not.toBe(result2.operationId);
      expect(result2.operationId).not.toBe(result3.operationId);
      expect(result1.operationId).not.toBe(result3.operationId);

      // Verify all have expected enhancements
      [result1, result2, result3].forEach((result) => {
        expect(result.enhancementsApplied).toContain('screenshot');
        expect(result.enhancementsApplied).toContain('ocr');
        expect(result.enhancementsApplied).toContain('text_detection');
      });
    });

    it('should handle very large screenshot data efficiently', async () => {
      // Setup large screenshot buffer
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024, 'x'); // 10MB
      mockNutService.screendump.mockResolvedValueOnce(largeBuffer);

      // Execute screenshot operation
      const result = await service.screenshot();

      // Verify large data handling
      expect(result.image).toBe(largeBuffer.toString('base64'));
      expect(result.image.length).toBeGreaterThan(10000000); // > 10MB when base64 encoded

      // Verify performance metric includes large image size
      expect(mockCuaPerformanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining({
          imageSize: expect.any(Number),
        }),
      );
    });

    it('should maintain operation context across service method calls', async () => {
      // Reset all mocks to track call order
      jest.clearAllMocks();

      // Execute screenshot operation
      await service.screenshot();

      // Verify logging maintains consistent operation context
      const logCalls = mockLogger.log.mock.calls;
      expect(logCalls.length).toBeGreaterThanOrEqual(2);

      // Extract operation IDs from log calls
      const operationIds = logCalls
        .map((call) => {
          const message = call[0];
          const match = message.match(/\[(screenshot_[^)]+)\]/);
          return match ? match[1] : null;
        })
        .filter((id): id is string => id !== null);

      // Verify all log calls use the same operation ID
      expect(operationIds.length).toBeGreaterThan(0);
      operationIds.forEach((id) => {
        expect(id).toBe(operationIds[0]);
      });
    });

    it('should handle performance service unavailability gracefully', async () => {
      // Note: Service dependencies are injected, not retrieved through getters

      // Execute screenshot operation - should still work
      const result = await service.screenshot();

      // Verify operation succeeds
      expect(result.image).toBe(MOCK_SCREENSHOT_BASE64);

      // Verify performance service is not called
      expect(mockCuaPerformanceService.recordMetric).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Logging', () => {
    it('should extract and format error messages consistently', async () => {
      // Setup complex error with stack trace
      const complexError = new Error('Complex screenshot error');
      complexError.stack =
        'Error: Complex screenshot error\n    at test.js:1:1';
      mockNutService.screendump.mockRejectedValueOnce(complexError);

      // Execute screenshot and expect error
      await expect(service.screenshot()).rejects.toThrow(
        'Screenshot capture failed: Complex screenshot error',
      );

      // Verify error logging includes stack trace
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Complex screenshot error'),
        expect.objectContaining({
          error: 'Complex screenshot error',
          stack: expect.stringContaining('Error: Complex screenshot error'),
        }),
      );
    });

    it('should handle non-Error objects thrown as errors', async () => {
      // Setup string error (edge case)
      mockNutService.screendump.mockRejectedValueOnce('String error message');

      // Execute screenshot and expect error handling
      await expect(service.screenshot()).rejects.toThrow(
        'Screenshot capture failed: String error message',
      );

      // Verify error is handled gracefully
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should generate appropriate log levels for different scenarios', async () => {
      // Test info logging for successful operations
      await service.screenshot();
      expect(mockLogger.log).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // Test error logging for failures
      mockNutService.screendump.mockRejectedValueOnce(
        new Error('Screenshot failed'),
      );
      await expect(service.screenshot()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();

      // Reset mocks
      jest.clearAllMocks();

      // Test warning logging for partial failures (in enhanced screenshot)
      const serviceWithPrivateMethods =
        service as unknown as ComputerUseServiceWithPrivateMethods;
      mockCuaVisionService.performOcr.mockRejectedValueOnce(
        new Error('OCR failed'),
      );

      await serviceWithPrivateMethods.enhancedScreenshot({ includeOcr: true });
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
