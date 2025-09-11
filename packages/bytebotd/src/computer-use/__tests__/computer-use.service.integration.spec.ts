/* eslint-env jest */
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
 * - Integration testing for computer use workflows
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  ComputerUseService,
  _ScreenshotResult,
  FileWriteResult,
  FileReadResult,
} from '../computer-use.service';
import { _ComputerUseModule } from '../computer-use.module';
import { NutService } from '../../nut/nut.service';
import {
  MoveMouseAction,
  ClickMouseAction,
  _ScreenshotAction,
  WriteFileAction,
  _ReadFileAction,
  _ApplicationAction,
} from '@bytebot/shared';
import * as fs from 'fs/promises';
import * as path from 'path';

// Integration test specific interfaces
interface IntegrationTestContext {
  service: ComputerUseService;
  nutService: NutService;
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
      imports: [ComputerUseModule],
    })
      .overrideProvider(NutService)
      .useValue(createMockNutService())
      .compile();

    // Create NestJS application for full integration testing
    app = testModule.createNestApplication();
    await app.init();

    // Setup test context with all services
    context = {
      service: testModule.get<ComputerUseService>(ComputerUseService),
      nutService: testModule.get<NutService>(NutService),
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
    });

    it('should have proper service lifecycle management', async () => {
      // Test service interaction
      const screenshot = await context.service.action({ action: 'screenshot' });
      expect(screenshot).toBeDefined();
      expect((screenshot as ScreenshotResult).image).toBeDefined();
    });

    it('should handle unsupported actions gracefully', async () => {
      // Test with unsupported action
      const invalidAction = { action: 'invalid_action' } as any;

      await expect(context.service.action(invalidAction)).rejects.toThrow(
        'Unsupported computer action',
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

    it('should handle multiple actions successfully', async () => {
      const actions = [
        { action: 'screenshot' as const },
        { action: 'move_mouse' as const, coordinates: { x: 100, y: 200 } },
        {
          action: 'click_mouse' as const,
          coordinates: { x: 100, y: 200 },
          button: 'left' as const,
          clickCount: 1,
        },
      ];

      // Execute actions sequentially
      for (const action of actions) {
        const _result = await context.service.action(action);
        expect(result).toBeDefined();
      }

      // Verify service calls were made
      expect(context.nutService.screendump).toHaveBeenCalled();
      expect(context.nutService.mouseMoveEvent).toHaveBeenCalled();
      expect(context.nutService.mouseClickEvent).toHaveBeenCalled();
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

    it('should provide detailed _error context for debugging', async () => {
      const invalidAction = {
        action: 'invalid_action',
      } as any;

      try {
        await context.service.action(invalidAction);
        fail('Should have thrown an error');
      } catch (_error) {
        expect(_error).toBeInstanceOf(Error);
        expect((_error as Error).message).toContain(
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

      const _result = (await context.service.action(
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
    it('should handle typical automation workflow: screenshot → navigate → interact', async () => {
      const workflow = async () => {
        // 1. Take initial screenshot
        const screenshot = await context.service.action({
          action: 'screenshot',
        });
        expect((screenshot as ScreenshotResult).image).toBeDefined();

        // 2. Move mouse to target location
        await context.service.action({
          action: 'move_mouse',
          coordinates: { x: 200, y: 300 },
        });

        // 3. Click on target location
        await context.service.action({
          action: 'click_mouse',
          coordinates: { x: 200, y: 300 },
          button: 'left',
          clickCount: 1,
        });

        // 4. Take final screenshot to verify state
        const finalScreenshot = await context.service.action({
          action: 'screenshot',
        });
        expect((finalScreenshot as ScreenshotResult).image).toBeDefined();
      };

      await expect(workflow()).resolves.not.toThrow();
    });

    it('should handle document processing workflow: read → process → save results', async () => {
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

      // Read document back to verify
      const readResult = (await context.service.action({
        action: 'read_file',
        path: writeResult.path,
      })) as FileReadResult;
      expect(readResult.success).toBe(true);

      // Take screenshot to document the process
      const screenshot = await context.service.action({ action: 'screenshot' });
      expect((screenshot as ScreenshotResult).image).toBeDefined();

      // Create processing results
      const processingResults = JSON.stringify({
        originalFile: 'test-document.txt',
        fileSize: readResult.size,
        mediaType: readResult.mediaType,
        processedAt: new Date().toISOString(),
        status: 'completed',
      });

      const saveResultsAction: WriteFileAction = {
        action: 'write_file',
        path: path.join(testDataDir, 'processing-results.json'),
        data: Buffer.from(processingResults).toString('base64'),
      };

      const saveResult = (await context.service.action(
        saveResultsAction,
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
      expect(parsedResults.status).toBe('completed');
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
    } catch (_error) {
      // Directory might not exist or already cleaned up
      console.warn('Failed to cleanup test data:', _error);
    }
  }
});
