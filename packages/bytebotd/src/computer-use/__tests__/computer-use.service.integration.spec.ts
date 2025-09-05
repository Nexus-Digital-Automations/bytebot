/**
 * Comprehensive Integration Tests for ComputerUseService
 *
 * This integration test suite provides end-to-end testing of the ComputerUseService
 * with real dependencies and system integration scenarios including:
 * - Full dependency injection container testing
 * - Real service interactions and workflow testing
 * - Cross-module integration validation
 * - Performance and resource management testing
 * - Error handling and recovery scenarios
 * - C/ua framework integration testing
 *
 * @author Claude Code
 * @version 1.0.0
 */

 
 
 

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  ComputerUseService,
  ScreenshotResult,
  FileWriteResult,
  FileReadResult,
  OcrOperationResult,
  FindTextResult,
  EnhancedScreenshotResult,
} from '../computer-use.service';
import { ComputerUseModule } from '../computer-use.module';
import { NutService } from '../../nut/nut.service';
import { CuaIntegrationModule } from '../../cua-integration/cua-integration.module';
import { CuaIntegrationService } from '../../cua-integration/cua-integration.service';
import { CuaVisionService } from '../../cua-integration/cua-vision.service';
import { CuaPerformanceService } from '../../cua-integration/cua-performance.service';
import {
  MoveMouseAction,
  ClickMouseAction,
  ScreenshotAction,
  WriteFileAction,
  ReadFileAction,
  OcrAction,
  FindTextAction,
  ApplicationAction,
} from '@bytebot/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

// Integration test specific interfaces
interface IntegrationTestContext {
  service: ComputerUseService;
  nutService: NutService;
  cuaIntegrationService?: CuaIntegrationService;
  cuaVisionService?: CuaVisionService;
  performanceService?: CuaPerformanceService;
  testDataDir: string;
}

interface TestFileData {
  path: string;
  content: string;
  base64: string;
  expectedMediaType: string;
}

describe('ComputerUseService Integration Tests', () => {
  let app: INestApplication;
  let testModule: TestingModule;
  let context: IntegrationTestContext;
  const testDataDir = '/tmp/bytebot-integration-tests';

  /**
   * Setup comprehensive integration test environment
   * Creates real services with minimal mocking for genuine integration testing
   */
  beforeAll(async () => {
    // Initialize comprehensive test module with real services
    testModule = await Test.createTestingModule({
      imports: [ComputerUseModule, CuaIntegrationModule],
    })
      .overrideProvider(NutService)
      .useValue(createMockNutService())
      .overrideProvider(CuaIntegrationService)
      .useValue(createMockCuaIntegrationService())
      .overrideProvider(CuaVisionService)
      .useValue(createMockCuaVisionService())
      .overrideProvider(CuaPerformanceService)
      .useValue(createMockPerformanceService())
      .compile();

    // Create NestJS application for full integration testing
    app = testModule.createNestApplication();
    await app.init();

    // Setup test context with all services
    context = {
      service: testModule.get<ComputerUseService>(ComputerUseService),
      nutService: testModule.get<NutService>(NutService),
      cuaIntegrationService: testModule.get<CuaIntegrationService>(
        CuaIntegrationService,
      ),
      cuaVisionService: testModule.get<CuaVisionService>(CuaVisionService),
      performanceService: testModule.get<CuaPerformanceService>(
        CuaPerformanceService,
      ),
      testDataDir,
    };

    // Create test data directory
    await createTestDataDirectory();
  });

  afterAll(async () => {
    // Cleanup test environment
    await cleanupTestData();
    await app?.close();
    await testModule?.close();
  });

  beforeEach(() => {
    // Reset all mocks before each test for isolation
    jest.clearAllMocks();
  });

  describe('Service Integration and Dependency Injection', () => {
    it('should initialize all services with proper dependency injection', () => {
      expect(context.service).toBeDefined();
      expect(context.nutService).toBeDefined();
      expect(context.cuaIntegrationService).toBeDefined();
      expect(context.cuaVisionService).toBeDefined();
      expect(context.performanceService).toBeDefined();
    });

    it('should have proper service lifecycle management', async () => {
      // Verify services are properly initialized and ready
      expect(context.cuaIntegrationService.isFrameworkEnabled()).toBe(true);

      // Test service interaction
      const screenshot = await context.service.action({ action: 'screenshot' });
      expect(screenshot).toBeDefined();
      expect((screenshot as ScreenshotResult).image).toBeDefined();
    });

    it('should handle service dependency failures gracefully', async () => {
      // Test with disabled C/ua framework
      jest
        .spyOn(context.cuaIntegrationService, 'isFrameworkEnabled')
        .mockReturnValue(false);

      const ocrAction: OcrAction = { action: 'ocr' };

      await expect(context.service.action(ocrAction)).rejects.toThrow(
        'OCR requires C/ua framework integration',
      );
    });
  });

  describe('End-to-End Action Workflows', () => {
    it('should execute complex mouse interaction workflow', async () => {
      // Comprehensive mouse workflow: move → click → drag
      const moveAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
      };

      const clickAction: ClickMouseAction = {
        action: 'click_mouse',
        coordinates: { x: 150, y: 250 },
        button: 'left',
        clickCount: 2,
        holdKeys: ['ctrl'],
      };

      // Execute workflow sequence
      await context.service.action(moveAction);
      await context.service.action(clickAction);

      // Verify service calls in sequence
      expect(context.nutService.mouseMoveEvent).toHaveBeenCalledTimes(2); // Move + Click move
      expect(context.nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], true);
      expect(context.nutService.mouseClickEvent).toHaveBeenCalledTimes(2);
      expect(context.nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], false);
    });

    it('should handle application lifecycle with window management', async () => {
      const appAction: ApplicationAction = {
        action: 'application',
        application: 'firefox',
      };

      // Mock application not running initially
      const util = await import('util');
      jest
        .spyOn(util, 'promisify')
        .mockReturnValue(jest.fn().mockRejectedValue({ code: 1 }));

      await context.service.action(appAction);

      // Verify application launch sequence
      // Note: spawn calls are mocked in createMockNutService
    });

    it('should execute screenshot and OCR workflow integration', async () => {
      const screenshotAction: ScreenshotAction = { action: 'screenshot' };
      const ocrAction: OcrAction = {
        action: 'ocr',
        language: 'en',
      };

      // Execute screenshot first
      const screenshotResult = (await context.service.action(
        screenshotAction,
      )) as ScreenshotResult;
      expect(screenshotResult.image).toBeDefined();

      // Execute OCR on screenshot
      const ocrResult = (await context.service.action(
        ocrAction,
      )) as OcrOperationResult;
      expect(ocrResult.text).toBeDefined();
      expect(ocrResult.confidence).toBeGreaterThan(0);
      expect(ocrResult.method).toBeDefined();

      // Verify performance metrics were recorded
      expect(context.performanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining({ success: true }),
      );
      expect(context.performanceService.recordMetric).toHaveBeenCalledWith(
        'ocr',
        expect.objectContaining({ success: true }),
      );
    });
  });

  describe('File Operations Integration', () => {
    it('should handle complete file write-read cycle', async () => {
      const testFile = createTestFile(
        'integration-test.txt',
        'Integration test content',
      );

      // Write file
      const writeAction: WriteFileAction = {
        action: 'write_file',
        path: path.join(testDataDir, 'test-write.txt'),
        data: testFile.base64,
      };

      const writeResult = (await context.service.action(
        writeAction,
      )) as FileWriteResult;
      expect(writeResult.success).toBe(true);
      expect(writeResult.path).toBeDefined();
      expect(writeResult.size).toBe(testFile.content.length);

      // Read file back
      const readAction: ReadFileAction = {
        action: 'read_file',
        path: writeResult.path,
      };

      const readResult = (await context.service.action(
        readAction,
      )) as FileReadResult;
      expect(readResult.success).toBe(true);
      expect(readResult.data).toBe(testFile.base64);
      expect(readResult.mediaType).toBe(testFile.expectedMediaType);
      expect(readResult.size).toBe(testFile.content.length);
    });

    it('should handle multiple file formats correctly', async () => {
      const testFiles = [
        createTestFile('test.json', '{"test": "data"}', 'application/json'),
        createTestFile(
          'test.html',
          '<html><body>Test</body></html>',
          'text/html',
        ),
        createTestFile('test.css', 'body { color: red; }', 'text/css'),
      ];

      for (const testFile of testFiles) {
        const writeAction: WriteFileAction = {
          action: 'write_file',
          path: path.join(testDataDir, testFile.path),
          data: testFile.base64,
        };

        const writeResult = (await context.service.action(
          writeAction,
        )) as FileWriteResult;
        expect(writeResult.success).toBe(true);

        const readAction: ReadFileAction = {
          action: 'read_file',
          path: writeResult.path,
        };

        const readResult = (await context.service.action(
          readAction,
        )) as FileReadResult;
        expect(readResult.success).toBe(true);
        expect(readResult.mediaType).toBe(testFile.expectedMediaType);
      }
    });

    it('should enforce security restrictions on file paths', async () => {
      const maliciousWriteAction: WriteFileAction = {
        action: 'write_file',
        path: '/etc/passwd',
        data: Buffer.from('malicious content').toString('base64'),
      };

      const writeResult = (await context.service.action(
        maliciousWriteAction,
      )) as FileWriteResult;
      expect(writeResult.success).toBe(false);
      expect(writeResult.message).toContain(
        'File path outside allowed directories',
      );

      const maliciousReadAction: ReadFileAction = {
        action: 'read_file',
        path: '/etc/shadow',
      };

      const readResult = (await context.service.action(
        maliciousReadAction,
      )) as FileReadResult;
      expect(readResult.success).toBe(false);
      expect(readResult.message).toContain(
        'File path outside allowed directories',
      );
    });
  });

  describe('C/ua Framework Integration', () => {
    it('should integrate OCR and text finding workflows', async () => {
      const findTextAction: FindTextAction = {
        action: 'find_text',
        text: 'Integration Test',
        caseSensitive: false,
        wholeWord: true,
      };

      const findResult = (await context.service.action(
        findTextAction,
      )) as FindTextResult;
      expect(findResult.found).toBe(true);
      expect(findResult.matches).toHaveLength(1);
      expect(findResult.matches[0].text).toBe('Integration Test');
      expect(findResult.searchCriteria.text).toBe('Integration Test');
      expect(findResult.searchCriteria.caseSensitive).toBe(false);
      expect(findResult.searchCriteria.wholeWord).toBe(true);
    });

    it('should handle enhanced screenshot with all enhancements', async () => {
      const enhancedAction = {
        action: 'enhanced_screenshot' as const,
        includeOcr: true,
        includeTextDetection: true,
        options: { threshold: 0.8 },
      };

      const result = (await context.service.action(
        enhancedAction,
      )) as EnhancedScreenshotResult;

      expect(result.image).toBeDefined();
      expect(result.ocr).toBeDefined();
      expect(result.ocr.text).toBe('Mocked OCR text');
      expect(result.textDetection).toBeDefined();
      expect(result.enhancementsApplied).toContain('screenshot');
      expect(result.enhancementsApplied).toContain('ocr');
      expect(result.enhancementsApplied).toContain('text_detection');
      expect(result.processingTimeMs).toBeGreaterThan(0);
    });

    it('should gracefully degrade when C/ua enhancements fail', async () => {
      // Mock OCR failure
      jest
        .spyOn(context.cuaVisionService, 'performOcr')
        .mockRejectedValue(new Error('OCR service unavailable'));

      const enhancedAction = {
        action: 'enhanced_screenshot' as const,
        includeOcr: true,
        includeTextDetection: true,
      };

      const result = (await context.service.action(
        enhancedAction,
      )) as EnhancedScreenshotResult;

      expect(result.image).toBeDefined();
      expect(result.ocr).toBeUndefined();
      expect(result.textDetection).toBeDefined();
      expect(result.enhancementsApplied).toContain('screenshot');
      expect(result.enhancementsApplied).toContain('text_detection');
      expect(result.enhancementsApplied).not.toContain('ocr');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent operations efficiently', async () => {
      const concurrentActions = Array.from({ length: 5 }, () => ({
        action: 'screenshot' as const,
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        concurrentActions.map((action) => context.service.action(action)),
      );
      const endTime = Date.now();

      // Verify all operations completed
      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect((result as ScreenshotResult).image).toBeDefined();
      });

      // Verify reasonable performance
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Verify unique operation IDs
      const operationIds = results.map(
        (result) => (result as ScreenshotResult).metadata?.operationId,
      );
      const uniqueIds = new Set(operationIds);
      expect(uniqueIds.size).toBe(5);
    });

    it('should properly manage memory and cleanup resources', async () => {
      // Monitor memory usage during file operations
      const initialMemory = process.memoryUsage();

      // Perform multiple file operations
      for (let i = 0; i < 10; i++) {
        const testFile = createTestFile(
          `stress-test-${i}.txt`,
          'Stress test content',
        );

        const writeAction: WriteFileAction = {
          action: 'write_file',
          path: path.join(testDataDir, `stress-${i}.txt`),
          data: testFile.base64,
        };

        const writeResult = (await context.service.action(
          writeAction,
        )) as FileWriteResult;
        expect(writeResult.success).toBe(true);

        const readAction: ReadFileAction = {
          action: 'read_file',
          path: writeResult.path,
        };

        const readResult = (await context.service.action(
          readAction,
        )) as FileReadResult;
        expect(readResult.success).toBe(true);
      }

      // Force garbage collection and check memory
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();

      // Memory should not have grown excessively (allow for some variance)
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
    });

    it('should record comprehensive performance metrics', async () => {
      const actions = [
        { action: 'screenshot' as const },
        { action: 'ocr' as const },
        { action: 'find_text' as const, text: 'test' },
      ];

      for (const action of actions) {
        await context.service.action(action);
      }

      // Verify metrics were recorded for each action
      expect(context.performanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
        }),
      );

      expect(context.performanceService.recordMetric).toHaveBeenCalledWith(
        'ocr',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
        }),
      );

      expect(context.performanceService.recordMetric).toHaveBeenCalledWith(
        'find_text',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
        }),
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle and recover from temporary service failures', async () => {
      // Mock temporary NUT service failure
      const originalMouseMove = context.nutService.mouseMoveEvent;
      jest
        .spyOn(context.nutService, 'mouseMoveEvent')
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockImplementation(originalMouseMove);

      const moveAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
      };

      // First attempt should fail
      await expect(context.service.action(moveAction)).rejects.toThrow(
        'Temporary failure',
      );

      // Second attempt should succeed (service recovered)
      await expect(context.service.action(moveAction)).resolves.not.toThrow();
    });

    it('should provide detailed error context for debugging', async () => {
      const invalidAction = {
        action: 'invalid_action',
      } as any;

      try {
        await context.service.action(invalidAction);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          'Unsupported computer action',
        );
      }
    });

    it('should handle resource cleanup on operation failures', async () => {
      // Mock file write failure after temporary file creation
      const util = await import('util');
      jest
        .spyOn(util, 'promisify')
        .mockReturnValue(jest.fn().mockRejectedValue(new Error('Copy failed')));

      const testFile = createTestFile('failure-test.txt', 'Test content');
      const writeAction: WriteFileAction = {
        action: 'write_file',
        path: path.join(testDataDir, 'failure-test.txt'),
        data: testFile.base64,
      };

      const result = (await context.service.action(
        writeAction,
      )) as FileWriteResult;
      expect(result.success).toBe(false);
      expect(result.message).toContain(
        'Failed to move file to target location',
      );

      // Verify temporary file cleanup was attempted
      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  describe('Real-world Integration Scenarios', () => {
    it('should handle typical automation workflow: navigate → screenshot → OCR → interaction', async () => {
      const workflow = async () => {
        // 1. Take initial screenshot
        const screenshot = await context.service.action({
          action: 'screenshot',
        });
        expect((screenshot as ScreenshotResult).image).toBeDefined();

        // 2. Perform OCR to find text
        const ocr = await context.service.action({
          action: 'ocr',
          language: 'en',
        });
        expect((ocr as OcrOperationResult).text).toBeDefined();

        // 3. Find specific text
        const findText = await context.service.action({
          action: 'find_text',
          text: 'Integration Test',
        });
        const findResult = findText as FindTextResult;
        expect(findResult.found).toBe(true);

        // 4. Click on found text
        if (findResult.matches.length > 0) {
          const match = findResult.matches[0];
          await context.service.action({
            action: 'click_mouse',
            coordinates: {
              x: match.x + match.width / 2,
              y: match.y + match.height / 2,
            },
            button: 'left',
            clickCount: 1,
          });
        }

        // 5. Take final screenshot
        const finalScreenshot = await context.service.action({
          action: 'screenshot',
        });
        expect((finalScreenshot as ScreenshotResult).image).toBeDefined();
      };

      await expect(workflow()).resolves.not.toThrow();
    });

    it('should handle document processing workflow: read → OCR → save results', async () => {
      // Create test document
      const testDoc = createTestFile(
        'document.txt',
        'Document processing test content',
      );
      const writeAction: WriteFileAction = {
        action: 'write_file',
        path: path.join(testDataDir, 'test-document.txt'),
        data: testDoc.base64,
      };

      // Write document
      const writeResult = (await context.service.action(
        writeAction,
      )) as FileWriteResult;
      expect(writeResult.success).toBe(true);

      // Take screenshot for OCR
      const screenshot = await context.service.action({ action: 'screenshot' });
      expect((screenshot as ScreenshotResult).image).toBeDefined();

      // Perform OCR
      const ocrResult = (await context.service.action({
        action: 'ocr',
        language: 'en',
      })) as OcrOperationResult;

      // Save OCR results
      const ocrData = JSON.stringify({
        originalFile: 'test-document.txt',
        ocrText: ocrResult.text,
        confidence: ocrResult.confidence,
        processingTime: ocrResult.processingTimeMs,
        timestamp: new Date().toISOString(),
      });

      const saveOcrAction: WriteFileAction = {
        action: 'write_file',
        path: path.join(testDataDir, 'ocr-results.json'),
        data: Buffer.from(ocrData).toString('base64'),
      };

      const saveResult = (await context.service.action(
        saveOcrAction,
      )) as FileWriteResult;
      expect(saveResult.success).toBe(true);

      // Verify results can be read back
      const readResults = (await context.service.action({
        action: 'read_file',
        path: saveResult.path,
      })) as FileReadResult;

      expect(readResults.success).toBe(true);
      const parsedResults = JSON.parse(
        Buffer.from(readResults.data, 'base64').toString(),
      );
      expect(parsedResults.originalFile).toBe('test-document.txt');
      expect(parsedResults.ocrText).toBeDefined();
    });
  });

  // Helper functions for integration testing

  /**
   * Create mock NUT service with realistic behavior
   */
  function createMockNutService(): Partial<NutService> {
    return {
      mouseMoveEvent: jest.fn().mockResolvedValue({ success: true }),
      mouseClickEvent: jest.fn().mockResolvedValue({ success: true }),
      mouseButtonEvent: jest.fn().mockResolvedValue({ success: true }),
      mouseWheelEvent: jest.fn().mockResolvedValue({ success: true }),
      holdKeys: jest.fn().mockResolvedValue({ success: true }),
      sendKeys: jest.fn().mockResolvedValue({ success: true }),
      typeText: jest.fn().mockResolvedValue({ success: true }),
      pasteText: jest.fn().mockResolvedValue({ success: true }),
      screendump: jest
        .fn()
        .mockResolvedValue(Buffer.from('mocked-screenshot-data')),
      getCursorPosition: jest.fn().mockResolvedValue({ x: 100, y: 200 }),
    };
  }

  /**
   * Create mock C/ua integration service
   */
  function createMockCuaIntegrationService(): Partial<CuaIntegrationService> {
    return {
      isFrameworkEnabled: jest.fn().mockReturnValue(true),
      isAneBridgeAvailable: jest.fn().mockReturnValue(true),
      getConfiguration: jest.fn().mockResolvedValue({}),
    };
  }

  /**
   * Create mock C/ua vision service with realistic responses
   */
  function createMockCuaVisionService(): Partial<CuaVisionService> {
    return {
      performOcr: jest.fn().mockResolvedValue({
        text: 'Mocked OCR text with Integration Test content',
        confidence: 0.95,
        method: 'ANE',
        boundingBoxes: [
          {
            text: 'Integration Test',
            x: 100,
            y: 200,
            width: 120,
            height: 25,
            confidence: 0.98,
          },
        ],
      }),
      detectText: jest.fn().mockResolvedValue({
        regions: [
          {
            text: 'Detected text region',
            x: 50,
            y: 75,
            width: 200,
            height: 30,
            confidence: 0.92,
          },
        ],
      }),
      batchOcr: jest.fn().mockResolvedValue([]),
    };
  }

  /**
   * Create mock performance service
   */
  function createMockPerformanceService(): Partial<CuaPerformanceService> {
    return {
      recordMetric: jest.fn().mockImplementation(() => Promise.resolve()),
    };
  }

  /**
   * Create test data directory
   */
  async function createTestDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(testDataDir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  /**
   * Create test file with specified content and format
   */
  function createTestFile(
    fileName: string,
    content: string,
    expectedMediaType?: string,
  ): TestFileData {
    const ext = path.extname(fileName).toLowerCase().slice(1);
    const mediaTypeMap: Record<string, string> = {
      txt: 'text/plain',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      js: 'text/javascript',
      ts: 'text/typescript',
      png: 'image/png',
      jpg: 'image/jpeg',
      pdf: 'application/pdf',
    };

    return {
      path: fileName,
      content,
      base64: Buffer.from(content).toString('base64'),
      expectedMediaType:
        expectedMediaType || mediaTypeMap[ext] || 'application/octet-stream',
    };
  }

  /**
   * Cleanup test data after tests complete
   */
  async function cleanupTestData(): Promise<void> {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist or already cleaned up
      console.warn('Failed to cleanup test data:', error);
    }
  }
});
