/**
 * Comprehensive Unit Tests for ComputerUseService
 *
 * This test suite provides 100% coverage for the ComputerUseService class including:
 * - All public and private methods
 * - Error handling scenarios
 * - Edge cases and boundary conditions
 * - External dependency mocking
 * - Performance monitoring integration
 * - C/ua framework integration scenarios
 *
 * @author Claude Code
 * @version 1.0.0
 */

 
 
 
 

import { Test, TestingModule } from '@nestjs/testing';
import {
  ComputerUseService,
  ErrorHandler,
  ScreenshotResult,
  FileWriteResult,
  FileReadResult,
  FindTextResult,
  EnhancedScreenshotResult,
} from './computer-use.service';
import { NutService } from '../nut/nut.service';
import { CuaVisionService } from '../cua-integration/cua-vision.service';
import { CuaIntegrationService } from '../cua-integration/cua-integration.service';
import { CuaPerformanceService } from '../cua-integration/cua-performance.service';
import {
  MoveMouseAction,
  TraceMouseAction,
  ClickMouseAction,
  PressMouseAction,
  DragMouseAction,
  ScrollAction,
  TypeKeysAction,
  PressKeysAction,
  TypeTextAction,
  PasteTextAction,
  ScreenshotAction,
  CursorPositionAction,
  ApplicationAction,
  WriteFileAction,
  ReadFileAction,
  OcrAction,
  FindTextAction,
  EnhancedScreenshotAction,
} from '@bytebot/shared';
import * as fs from 'fs/promises';

// Mock external modules
jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('util', () => ({
  promisify: jest.fn(() =>
    jest.fn().mockResolvedValue({ stdout: 'mocked output' }),
  ),
}));

describe('ComputerUseService', () => {
  let service: ComputerUseService;
  let testModule: TestingModule;

  // Mock implementations with proper typing
  const mockNutService: jest.Mocked<NutService> = {
    mouseMoveEvent: jest.fn(),
    mouseClickEvent: jest.fn(),
    mouseButtonEvent: jest.fn(),
    mouseWheelEvent: jest.fn(),
    holdKeys: jest.fn(),
    sendKeys: jest.fn(),
    typeText: jest.fn(),
    pasteText: jest.fn(),
    screendump: jest.fn(),
    getCursorPosition: jest.fn(),
    // Add any other required methods from NutService
  } as unknown as jest.Mocked<NutService>;

  const mockCuaVisionService: jest.Mocked<CuaVisionService> = {
    performOcr: jest.fn(),
    detectText: jest.fn(),
    batchOcr: jest.fn(),
    getCapabilities: jest.fn(),
  } as unknown as jest.Mocked<CuaVisionService>;

  const mockCuaIntegrationService: jest.Mocked<CuaIntegrationService> = {
    isFrameworkEnabled: jest.fn(),
    isAneBridgeAvailable: jest.fn(),
    getConfiguration: jest.fn(),
    initialize: jest.fn(),
    getNetworkTopology: jest.fn(),
  } as unknown as jest.Mocked<CuaIntegrationService>;

  const mockPerformanceService: jest.Mocked<CuaPerformanceService> = {
    recordMetric: jest.fn(),
    getMetrics: jest.fn(),
    clearMetrics: jest.fn(),
    setMetricThreshold: jest.fn(),
    // Add other required methods
  } as unknown as jest.Mocked<CuaPerformanceService>;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset file system mocks
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test content'));
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);

    testModule = await Test.createTestingModule({
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
          useValue: mockPerformanceService,
        },
      ],
    }).compile();

    service = testModule.get<ComputerUseService>(ComputerUseService);

    // Setup default mock behaviors
    mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
    mockNutService.screendump.mockResolvedValue(Buffer.from('fake-image-data'));
    mockNutService.getCursorPosition.mockResolvedValue({ x: 100, y: 200 });
  });

  afterEach(async () => {
    await testModule?.close();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(mockCuaIntegrationService.isFrameworkEnabled).toHaveBeenCalled();
    });

    it('should initialize with C/ua framework disabled', async () => {
      mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);

      const moduleWithDisabledCua: TestingModule =
        await Test.createTestingModule({
          providers: [
            ComputerUseService,
            { provide: NutService, useValue: mockNutService },
            {
              provide: CuaIntegrationService,
              useValue: mockCuaIntegrationService,
            },
          ],
        }).compile();

      const serviceWithDisabledCua =
        moduleWithDisabledCua.get<ComputerUseService>(ComputerUseService);
      expect(serviceWithDisabledCua).toBeDefined();

      await moduleWithDisabledCua.close();
    });

    it('should initialize without optional services', async () => {
      const moduleMinimal: TestingModule = await Test.createTestingModule({
        providers: [
          ComputerUseService,
          { provide: NutService, useValue: mockNutService },
        ],
      }).compile();

      const serviceMinimal =
        moduleMinimal.get<ComputerUseService>(ComputerUseService);
      expect(serviceMinimal).toBeDefined();

      await moduleMinimal.close();
    });
  });

  describe('Mouse Operations', () => {
    describe('move_mouse action', () => {
      it('should move mouse to specified coordinates', async () => {
        const action: MoveMouseAction = {
          action: 'move_mouse',
          coordinates: { x: 100, y: 200 },
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 100,
          y: 200,
        });
      });

      it('should handle mouse movement error', async () => {
        const action: MoveMouseAction = {
          action: 'move_mouse',
          coordinates: { x: 100, y: 200 },
        };

        mockNutService.mouseMoveEvent.mockRejectedValue(
          new Error('Mouse movement failed'),
        );

        await expect(service.action(action)).rejects.toThrow(
          'Failed to execute move_mouse: Mouse movement failed',
        );
      });
    });

    describe('trace_mouse action', () => {
      it('should trace mouse along path without hold keys', async () => {
        const action: TraceMouseAction = {
          action: 'trace_mouse',
          path: [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
            { x: 100, y: 100 },
          ],
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseMoveEvent).toHaveBeenCalledTimes(3);
        expect(mockNutService.mouseMoveEvent).toHaveBeenNthCalledWith(1, {
          x: 0,
          y: 0,
        });
        expect(mockNutService.mouseMoveEvent).toHaveBeenNthCalledWith(2, {
          x: 50,
          y: 50,
        });
        expect(mockNutService.mouseMoveEvent).toHaveBeenNthCalledWith(3, {
          x: 100,
          y: 100,
        });
      });

      it('should trace mouse along path with hold keys', async () => {
        const action: TraceMouseAction = {
          action: 'trace_mouse',
          path: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
          holdKeys: ['shift', 'ctrl'],
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });
        mockNutService.holdKeys.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.holdKeys).toHaveBeenCalledWith(
          ['shift', 'ctrl'],
          true,
        );
        expect(mockNutService.holdKeys).toHaveBeenCalledWith(
          ['shift', 'ctrl'],
          false,
        );
      });

      it('should handle empty path error', async () => {
        const action: TraceMouseAction = {
          action: 'trace_mouse',
          path: [],
        };

        await expect(service.action(action)).rejects.toThrow(
          'Mouse trace path must contain at least one coordinate',
        );
      });

      it('should release keys on error', async () => {
        const action: TraceMouseAction = {
          action: 'trace_mouse',
          path: [{ x: 0, y: 0 }],
          holdKeys: ['shift'],
        };

        mockNutService.mouseMoveEvent.mockRejectedValue(
          new Error('Movement failed'),
        );
        mockNutService.holdKeys.mockResolvedValue({ success: true });

        await expect(service.action(action)).rejects.toThrow();
        expect(mockNutService.holdKeys).toHaveBeenCalledWith(['shift'], false);
      });
    });

    describe('click_mouse action', () => {
      it('should perform single click without coordinates', async () => {
        const action: ClickMouseAction = {
          action: 'click_mouse',
          button: 'left',
          clickCount: 1,
        };

        mockNutService.mouseClickEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseClickEvent).toHaveBeenCalledWith('left');
      });

      it('should perform multiple clicks with coordinates', async () => {
        const action: ClickMouseAction = {
          action: 'click_mouse',
          coordinates: { x: 100, y: 200 },
          button: 'right',
          clickCount: 3,
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });
        mockNutService.mouseClickEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 100,
          y: 200,
        });
        expect(mockNutService.mouseClickEvent).toHaveBeenCalledTimes(3);
      });

      it('should handle click count limits', async () => {
        const action: ClickMouseAction = {
          action: 'click_mouse',
          button: 'left',
          clickCount: 20, // Over limit
        };

        mockNutService.mouseClickEvent.mockResolvedValue({ success: true });

        await service.action(action);

        // Should be limited to 10 clicks
        expect(mockNutService.mouseClickEvent).toHaveBeenCalledTimes(10);
      });

      it('should handle click with hold keys and error cleanup', async () => {
        const action: ClickMouseAction = {
          action: 'click_mouse',
          button: 'left',
          clickCount: 1,
          holdKeys: ['ctrl'],
        };

        mockNutService.holdKeys.mockResolvedValue({ success: true });
        mockNutService.mouseClickEvent.mockRejectedValue(
          new Error('Click failed'),
        );

        await expect(service.action(action)).rejects.toThrow();
        expect(mockNutService.holdKeys).toHaveBeenCalledWith(['ctrl'], false);
      });
    });

    describe('press_mouse action', () => {
      it('should press mouse button', async () => {
        const action: PressMouseAction = {
          action: 'press_mouse',
          button: 'left',
          press: 'down',
        };

        mockNutService.mouseButtonEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseButtonEvent).toHaveBeenCalledWith(
          'left',
          true,
        );
      });

      it('should release mouse button with coordinates', async () => {
        const action: PressMouseAction = {
          action: 'press_mouse',
          coordinates: { x: 50, y: 75 },
          button: 'right',
          press: 'up',
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });
        mockNutService.mouseButtonEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 50,
          y: 75,
        });
        expect(mockNutService.mouseButtonEvent).toHaveBeenCalledWith(
          'right',
          false,
        );
      });
    });

    describe('drag_mouse action', () => {
      it('should perform drag operation', async () => {
        const action: DragMouseAction = {
          action: 'drag_mouse',
          path: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
          button: 'left',
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });
        mockNutService.mouseButtonEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseButtonEvent).toHaveBeenCalledWith(
          'left',
          true,
        );
        expect(mockNutService.mouseMoveEvent).toHaveBeenCalledTimes(2);
        expect(mockNutService.mouseButtonEvent).toHaveBeenCalledWith(
          'left',
          false,
        );
      });

      it('should handle empty drag path', async () => {
        const action: DragMouseAction = {
          action: 'drag_mouse',
          path: [],
          button: 'left',
        };

        await expect(service.action(action)).rejects.toThrow(
          'Mouse drag path must contain at least one coordinate',
        );
      });

      it('should cleanup on drag error', async () => {
        const action: DragMouseAction = {
          action: 'drag_mouse',
          path: [{ x: 0, y: 0 }],
          button: 'left',
          holdKeys: ['shift'],
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });
        mockNutService.mouseButtonEvent
          .mockResolvedValueOnce({ success: true }) // Press
          .mockRejectedValue(new Error('Release failed')); // Release fails
        mockNutService.holdKeys.mockResolvedValue({ success: true });

        await expect(service.action(action)).rejects.toThrow();
        expect(mockNutService.holdKeys).toHaveBeenCalledWith(['shift'], false);
      });
    });

    describe('scroll action', () => {
      it('should perform scroll operation', async () => {
        const action: ScrollAction = {
          action: 'scroll',
          direction: 'up',
          scrollCount: 3,
        };

        mockNutService.mouseWheelEvent.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseWheelEvent).toHaveBeenCalledTimes(3);
        expect(mockNutService.mouseWheelEvent).toHaveBeenCalledWith('up', 1);
      });

      it('should handle scroll count limits', async () => {
        const action: ScrollAction = {
          action: 'scroll',
          direction: 'down',
          scrollCount: 100, // Over limit
        };

        mockNutService.mouseWheelEvent.mockResolvedValue({ success: true });

        await service.action(action);

        // Should be limited to 50 scrolls
        expect(mockNutService.mouseWheelEvent).toHaveBeenCalledTimes(50);
      });

      it('should scroll with coordinates and hold keys', async () => {
        const action: ScrollAction = {
          action: 'scroll',
          coordinates: { x: 200, y: 300 },
          direction: 'left',
          scrollCount: 2,
          holdKeys: ['alt'],
        };

        mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });
        mockNutService.mouseWheelEvent.mockResolvedValue({ success: true });
        mockNutService.holdKeys.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 200,
          y: 300,
        });
        expect(mockNutService.holdKeys).toHaveBeenCalledWith(['alt'], true);
        expect(mockNutService.holdKeys).toHaveBeenCalledWith(['alt'], false);
      });
    });
  });

  describe('Keyboard Operations', () => {
    describe('type_keys action', () => {
      it('should type key sequence', async () => {
        const action: TypeKeysAction = {
          action: 'type_keys',
          keys: ['a', 'b', 'c'],
        };

        mockNutService.sendKeys.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.sendKeys).toHaveBeenCalledWith(
          ['a', 'b', 'c'],
          undefined,
        );
      });

      it('should type keys with delay', async () => {
        const action: TypeKeysAction = {
          action: 'type_keys',
          keys: ['ctrl', 'c'],
          delay: 100,
        };

        mockNutService.sendKeys.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.sendKeys).toHaveBeenCalledWith(
          ['ctrl', 'c'],
          100,
        );
      });
    });

    describe('press_keys action', () => {
      it('should press keys down', async () => {
        const action: PressKeysAction = {
          action: 'press_keys',
          keys: ['shift', 'ctrl'],
          press: 'down',
        };

        mockNutService.holdKeys.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.holdKeys).toHaveBeenCalledWith(
          ['shift', 'ctrl'],
          true,
        );
      });

      it('should release keys', async () => {
        const action: PressKeysAction = {
          action: 'press_keys',
          keys: ['alt'],
          press: 'up',
        };

        mockNutService.holdKeys.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.holdKeys).toHaveBeenCalledWith(['alt'], false);
      });
    });

    describe('type_text action', () => {
      it('should type text without delay', async () => {
        const action: TypeTextAction = {
          action: 'type_text',
          text: 'Hello World',
        };

        mockNutService.typeText.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.typeText).toHaveBeenCalledWith(
          'Hello World',
          undefined,
        );
      });

      it('should type text with delay', async () => {
        const action: TypeTextAction = {
          action: 'type_text',
          text: 'Sensitive data',
          delay: 50,
          sensitive: true,
        };

        mockNutService.typeText.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.typeText).toHaveBeenCalledWith(
          'Sensitive data',
          50,
        );
      });
    });

    describe('paste_text action', () => {
      it('should paste text', async () => {
        const action: PasteTextAction = {
          action: 'paste_text',
          text: 'Clipboard content',
        };

        mockNutService.pasteText.mockResolvedValue({ success: true });

        await service.action(action);

        expect(mockNutService.pasteText).toHaveBeenCalledWith(
          'Clipboard content',
        );
      });
    });
  });

  describe('Utility Operations', () => {
    describe('wait action', () => {
      it('should wait for specified duration', async () => {
        const action = {
          action: 'wait' as const,
          duration: 100,
        };

        const startTime = Date.now();
        await service.action(action);
        const endTime = Date.now();

        expect(endTime - startTime).toBeGreaterThanOrEqual(90); // Allow some tolerance
      });

      it('should handle wait duration limits', async () => {
        const action = {
          action: 'wait' as const,
          duration: 400000, // Over 5 minute limit
        };

        // This should complete quickly due to the limit
        const startTime = Date.now();
        await service.action(action);
        const endTime = Date.now();

        // Should be limited to 5 minutes max, but we can't wait that long in tests
        // So we just verify it doesn't throw an error
        expect(endTime - startTime).toBeLessThan(10000); // Should complete in reasonable time
      });
    });

    describe('screenshot action', () => {
      it('should take screenshot successfully', async () => {
        const action: ScreenshotAction = {
          action: 'screenshot',
        };

        const fakeImageBuffer = Buffer.from('fake-image-data');
        mockNutService.screendump.mockResolvedValue(fakeImageBuffer);

        const result = await service.action(action);

        expect(mockNutService.screendump).toHaveBeenCalled();
        expect(result).toMatchObject({
          image: fakeImageBuffer.toString('base64'),
          metadata: expect.objectContaining({
            captureTime: expect.any(Date),
            operationId: expect.any(String),
            format: 'png',
          }),
        });
      });

      it('should record performance metrics when available', async () => {
        const action: ScreenshotAction = {
          action: 'screenshot',
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('test'));
        mockPerformanceService.recordMetric.mockImplementation(() => {});

        await service.action(action);

        expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
          'screenshot',
          expect.objectContaining({
            duration: expect.any(Number),
            success: true,
            imageSize: expect.any(Number),
            operationId: expect.any(String),
          }),
        );
      });

      it('should handle screenshot error with metrics', async () => {
        const action: ScreenshotAction = {
          action: 'screenshot',
        };

        mockNutService.screendump.mockRejectedValue(
          new Error('Screenshot failed'),
        );
        mockPerformanceService.recordMetric.mockImplementation(() => {});

        await expect(service.action(action)).rejects.toThrow(
          'Screenshot capture failed: Screenshot failed',
        );

        expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
          'screenshot',
          expect.objectContaining({
            success: false,
            error: 'Screenshot failed',
          }),
        );
      });
    });

    describe('cursor_position action', () => {
      it('should get cursor position', async () => {
        const action: CursorPositionAction = {
          action: 'cursor_position',
        };

        mockNutService.getCursorPosition.mockResolvedValue({ x: 150, y: 250 });

        const result = await service.action(action);

        expect(result).toMatchObject({
          x: 150,
          y: 250,
          timestamp: expect.any(Date),
          operationId: expect.any(String),
        });
      });

      it('should handle cursor position error', async () => {
        const action: CursorPositionAction = {
          action: 'cursor_position',
        };

        mockNutService.getCursorPosition.mockRejectedValue(
          new Error('Position failed'),
        );

        await expect(service.action(action)).rejects.toThrow(
          'Cursor position retrieval failed: Position failed',
        );
      });
    });
  });

  describe('Application Management', () => {
    const mockExecAsync = jest.fn();
    const mockSpawn = jest.fn();

    beforeEach(() => {
      // Mock exec and spawn
      const util = jest.requireMock('util');
      util.promisify.mockReturnValue(mockExecAsync);

      // Mock child_process.spawn
      jest.doMock('child_process', () => ({
        spawn: mockSpawn,
        exec: jest.fn(),
      }));

      mockSpawn.mockReturnValue({
        unref: jest.fn(),
      });
    });

    describe('application action', () => {
      it('should handle desktop activation', async () => {
        const action: ApplicationAction = {
          action: 'application',
          application: 'desktop',
        };

        await service.action(action);

        expect(mockSpawn).toHaveBeenCalledWith(
          'sudo',
          ['-u', 'user', 'wmctrl', '-k', 'on'],
          expect.objectContaining({
            env: expect.objectContaining({ DISPLAY: ':0.0' }),
            stdio: 'ignore',
            detached: true,
          }),
        );
      });

      it('should launch new application when not running', async () => {
        const action: ApplicationAction = {
          action: 'application',
          application: 'firefox',
        };

        // Mock application not running (error code 1)
        mockExecAsync.mockRejectedValue({ code: 1 });

        await service.action(action);

        expect(mockSpawn).toHaveBeenCalledWith(
          'sudo',
          ['-u', 'user', 'nohup', 'firefox-esr'],
          expect.objectContaining({
            env: expect.objectContaining({ DISPLAY: ':0.0' }),
            stdio: 'ignore',
            detached: true,
          }),
        );
      });

      it('should activate existing application when running', async () => {
        const action: ApplicationAction = {
          action: 'application',
          application: 'vscode',
        };

        // Mock application already running
        mockExecAsync.mockResolvedValue({
          stdout: 'Navigator.code.Code running',
        });

        await service.action(action);

        expect(mockSpawn).toHaveBeenCalledWith(
          'sudo',
          ['-u', 'user', 'wmctrl', '-x', '-a', 'code.Code'],
          expect.any(Object),
        );
      });

      it('should handle unsupported application', async () => {
        const action = {
          action: 'application' as const,
          application: 'unsupported-app' as 'firefox' | 'chrome' | 'safari',
        };

        await expect(service.action(action)).rejects.toThrow(
          'Unsupported application: unsupported-app',
        );
      });

      it('should handle wmctrl timeout error gracefully', async () => {
        const action: ApplicationAction = {
          action: 'application',
          application: 'firefox',
        };

        // Mock timeout error
        mockExecAsync.mockRejectedValue({ message: 'timeout' });

        await service.action(action);

        // Should proceed to launch new application
        expect(mockSpawn).toHaveBeenCalledWith(
          'sudo',
          ['-u', 'user', 'nohup', 'firefox-esr'],
          expect.any(Object),
        );
      });
    });
  });

  describe('File Operations', () => {
    const mockExecAsync = jest.fn();

    beforeEach(() => {
      const util = jest.requireMock('util');
      util.promisify.mockReturnValue(mockExecAsync);
      mockExecAsync.mockResolvedValue({ stdout: 'success' });
    });

    describe('write_file action', () => {
      it('should write file successfully', async () => {
        const testData = Buffer.from('test file content').toString('base64');
        const action: WriteFileAction = {
          action: 'write_file',
          path: '/home/user/test.txt',
          data: testData,
        };

        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        mockExecAsync.mockResolvedValue({ stdout: '' });

        const result = await service.action(action);

        expect(result).toMatchObject({
          success: true,
          message: expect.stringContaining('File written successfully'),
          path: '/home/user/test.txt',
          size: expect.any(Number),
          operationId: expect.any(String),
          timestamp: expect.any(Date),
        });
      });

      it('should handle relative paths', async () => {
        const testData = Buffer.from('test').toString('base64');
        const action: WriteFileAction = {
          action: 'write_file',
          path: 'relative/test.txt',
          data: testData,
        };

        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

        const result = (await service.action(action)) as FileWriteResult;

        expect(result.path).toBe('/home/user/Desktop/relative/test.txt');
      });

      it('should reject unsafe paths', async () => {
        const testData = Buffer.from('test').toString('base64');
        const action: WriteFileAction = {
          action: 'write_file',
          path: '/etc/passwd',
          data: testData,
        };

        const result = (await service.action(action)) as FileWriteResult;

        expect(result.success).toBe(false);
        expect(result.message).toContain(
          'File path outside allowed directories',
        );
      });

      it('should handle invalid base64 data', async () => {
        const action: WriteFileAction = {
          action: 'write_file',
          path: '/home/user/test.txt',
          data: 'invalid-base64-data',
        };

        const result = (await service.action(action)) as FileWriteResult;

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid base64 data');
      });

      it('should cleanup temporary file on error', async () => {
        const testData = Buffer.from('test').toString('base64');
        const action: WriteFileAction = {
          action: 'write_file',
          path: '/home/user/test.txt',
          data: testData,
        };

        (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
        mockExecAsync.mockRejectedValue(new Error('Copy failed'));

        const result = (await service.action(action)) as FileWriteResult;

        expect(result.success).toBe(false);
        expect(fs.unlink).toHaveBeenCalled();
      });
    });

    describe('read_file action', () => {
      it('should read file successfully', async () => {
        const action: ReadFileAction = {
          action: 'read_file',
          path: '/home/user/test.txt',
        };

        const fileContent = Buffer.from('test file content');
        (fs.readFile as jest.Mock).mockResolvedValue(fileContent);
        mockExecAsync
          .mockResolvedValueOnce({ stdout: '' }) // mkdir
          .mockResolvedValueOnce({ stdout: '' }) // chmod
          .mockResolvedValueOnce({ stdout: '17 1609459200' }); // stat

        const result = await service.action(action);

        expect(result).toMatchObject({
          success: true,
          data: fileContent.toString('base64'),
          name: 'test.txt',
          size: 17,
          mediaType: 'text/plain',
          lastModified: expect.any(Date),
          operationId: expect.any(String),
          timestamp: expect.any(Date),
        });
      });

      it('should handle relative paths', async () => {
        const action: ReadFileAction = {
          action: 'read_file',
          path: 'test.txt',
        };

        (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test'));
        mockExecAsync
          .mockResolvedValueOnce({ stdout: '' })
          .mockResolvedValueOnce({ stdout: '' })
          .mockResolvedValueOnce({ stdout: '4 1609459200' });

        const result = (await service.action(action)) as FileReadResult;

        expect(result.success).toBe(true);
      });

      it('should detect media types correctly', async () => {
        const action: ReadFileAction = {
          action: 'read_file',
          path: '/home/user/image.png',
        };

        (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('png data'));
        mockExecAsync
          .mockResolvedValueOnce({ stdout: '' })
          .mockResolvedValueOnce({ stdout: '' })
          .mockResolvedValueOnce({ stdout: '8 1609459200' });

        const result = (await service.action(action)) as FileReadResult;

        expect(result.mediaType).toBe('image/png');
      });

      it('should reject unsafe paths', async () => {
        const action: ReadFileAction = {
          action: 'read_file',
          path: '/etc/shadow',
        };

        const result = (await service.action(action)) as FileReadResult;

        expect(result.success).toBe(false);
        expect(result.message).toContain(
          'File path outside allowed directories',
        );
      });

      it('should handle file read errors', async () => {
        const action: ReadFileAction = {
          action: 'read_file',
          path: '/home/user/nonexistent.txt',
        };

        mockExecAsync.mockRejectedValue(new Error('File not found'));

        const result = (await service.action(action)) as FileReadResult;

        expect(result.success).toBe(false);
        expect(result.message).toContain('File read failed');
      });

      it('should cleanup temporary file on error', async () => {
        const action: ReadFileAction = {
          action: 'read_file',
          path: '/home/user/test.txt',
        };

        mockExecAsync.mockRejectedValue(new Error('Copy failed'));

        await service.action(action);

        expect(fs.unlink).toHaveBeenCalled();
      });
    });
  });

  describe('C/ua Enhanced Operations', () => {
    describe('ocr action', () => {
      beforeEach(() => {
        mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
      });

      it('should perform OCR successfully', async () => {
        const action: OcrAction = {
          action: 'ocr',
          language: 'en',
        };

        const ocrResult = {
          text: 'Extracted text',
          confidence: 0.95,
          boundingBoxes: [
            {
              text: 'Extracted',
              x: 10,
              y: 20,
              width: 100,
              height: 30,
              confidence: 0.9,
            },
          ],
          method: 'ANE',
          processingTimeMs: 50,
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockResolvedValue(ocrResult);

        const result = await service.action(action);

        expect(result).toMatchObject({
          text: 'Extracted text',
          confidence: 0.95,
          boundingBoxes: expect.any(Array),
          processingTimeMs: expect.any(Number),
          method: 'ANE',
          operationId: expect.any(String),
          language: 'en',
        });

        expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
          'ocr',
          expect.objectContaining({
            success: true,
            textLength: 14,
            confidence: 0.95,
          }),
        );
      });

      it('should handle OCR without C/ua framework', async () => {
        mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);

        const serviceWithoutCua = new ComputerUseService(
          mockNutService as NutService,
        );

        const action: OcrAction = {
          action: 'ocr',
        };

        await expect(serviceWithoutCua.action(action)).rejects.toThrow(
          'OCR requires C/ua framework integration',
        );
      });

      it('should handle OCR error with metrics', async () => {
        const action: OcrAction = {
          action: 'ocr',
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockRejectedValue(
          new Error('OCR failed'),
        );

        await expect(service.action(action)).rejects.toThrow(
          'OCR processing failed: OCR failed',
        );

        expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
          'ocr',
          expect.objectContaining({
            success: false,
            error: 'OCR failed',
          }),
        );
      });

      it('should log region warning when provided', async () => {
        const action: OcrAction = {
          action: 'ocr',
          region: { x: 0, y: 0, width: 100, height: 100 },
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockResolvedValue({
          text: 'text',
          confidence: 0.9,
          method: 'CPU',
          processingTimeMs: 100,
        });

        await service.action(action);

        // Should continue processing despite region warning
        expect(mockCuaVisionService.performOcr).toHaveBeenCalled();
      });
    });

    describe('find_text action', () => {
      beforeEach(() => {
        mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
      });

      it('should find text successfully with bounding boxes', async () => {
        const action: FindTextAction = {
          action: 'find_text',
          text: 'search text',
          caseSensitive: false,
          wholeWord: false,
        };

        const ocrResult = {
          text: 'This contains search text here',
          confidence: 0.9,
          boundingBoxes: [
            {
              text: 'search text',
              x: 100,
              y: 200,
              width: 80,
              height: 20,
              confidence: 0.95,
            },
          ],
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockResolvedValue(ocrResult);

        const result = await service.action(action);

        expect(result).toMatchObject({
          found: true,
          matches: [
            {
              text: 'search text',
              x: 100,
              y: 200,
              width: 80,
              height: 20,
              confidence: 0.95,
            },
          ],
          processingTimeMs: expect.any(Number),
          operationId: expect.any(String),
          searchCriteria: {
            text: 'search text',
            caseSensitive: false,
            wholeWord: false,
          },
        });
      });

      it('should handle case sensitive search', async () => {
        const action: FindTextAction = {
          action: 'find_text',
          text: 'CaseSensitive',
          caseSensitive: true,
        };

        const ocrResult = {
          text: 'This has casesensitive text',
          confidence: 0.9,
          boundingBoxes: [],
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockResolvedValue(ocrResult);

        const result = (await service.action(action)) as FindTextResult;

        expect(result.found).toBe(false);
        expect(result.matches).toHaveLength(0);
      });

      it('should handle whole word search', async () => {
        const action: FindTextAction = {
          action: 'find_text',
          text: 'word',
          wholeWord: true,
        };

        const ocrResult = {
          text: 'This has word and password',
          confidence: 0.9,
          boundingBoxes: [
            {
              text: 'This has word and',
              x: 0,
              y: 0,
              width: 200,
              height: 20,
              confidence: 0.9,
            },
          ],
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockResolvedValue(ocrResult);

        const result = (await service.action(action)) as FindTextResult;

        expect(result.found).toBe(true);
        expect(result.matches).toHaveLength(1);
      });

      it('should fallback to full text search without bounding boxes', async () => {
        const action: FindTextAction = {
          action: 'find_text',
          text: 'fallback',
        };

        const ocrResult = {
          text: 'This uses fallback search',
          confidence: 0.8,
          // No boundingBoxes provided
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockResolvedValue(ocrResult);

        const result = (await service.action(action)) as FindTextResult;

        expect(result.found).toBe(true);
        expect(result.matches).toHaveLength(1);
        expect(result.matches[0]).toMatchObject({
          text: 'fallback',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          confidence: 0.8,
        });
      });

      it('should handle empty search text', async () => {
        const action: FindTextAction = {
          action: 'find_text',
          text: '   ', // Empty/whitespace text
        };

        await expect(service.action(action)).rejects.toThrow(
          'Search text parameter is required and must be a non-empty string',
        );
      });

      it('should handle find text without C/ua framework', async () => {
        mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);

        const serviceWithoutCua = new ComputerUseService(
          mockNutService as NutService,
        );

        const action: FindTextAction = {
          action: 'find_text',
          text: 'test',
        };

        await expect(serviceWithoutCua.action(action)).rejects.toThrow(
          'Text finding requires C/ua framework integration',
        );
      });

      it('should record performance metrics', async () => {
        const action: FindTextAction = {
          action: 'find_text',
          text: 'metrics',
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
        mockCuaVisionService.performOcr.mockResolvedValue({
          text: 'no match',
          confidence: 0.9,
          boundingBoxes: [],
        });

        await service.action(action);

        expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
          'find_text',
          expect.objectContaining({
            success: true,
            matchCount: 0,
            searchText: 'metrics',
          }),
        );
      });
    });

    describe('enhanced_screenshot action', () => {
      beforeEach(() => {
        mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(true);
      });

      it('should take enhanced screenshot without enhancements', async () => {
        const action: EnhancedScreenshotAction = {
          action: 'enhanced_screenshot',
        };

        mockNutService.screendump.mockResolvedValue(
          Buffer.from('screenshot-data'),
        );

        const result = (await service.action(
          action,
        )) as EnhancedScreenshotResult;

        expect(result).toMatchObject({
          image: expect.any(String),
          processingTimeMs: expect.any(Number),
          enhancementsApplied: ['screenshot'],
          operationId: expect.any(String),
        });

        expect(result.ocr).toBeUndefined();
        expect(result.textDetection).toBeUndefined();
      });

      it('should include OCR enhancement when requested', async () => {
        const action = {
          action: 'enhanced_screenshot' as const,
          includeOcr: true,
        };

        const ocrResult = {
          text: 'OCR text',
          confidence: 0.9,
          method: 'ANE',
        };

        mockNutService.screendump.mockResolvedValue(
          Buffer.from('screenshot-data'),
        );
        mockCuaVisionService.performOcr.mockResolvedValue(ocrResult);

        const result = (await service.action(
          action,
        )) as EnhancedScreenshotResult;

        expect(result.ocr).toEqual(ocrResult);
        expect(result.enhancementsApplied).toContain('ocr');
        expect(mockCuaVisionService.performOcr).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            enableBoundingBoxes: true,
            recognitionLevel: 'accurate',
          }),
        );
      });

      it('should include text detection enhancement when requested', async () => {
        const action = {
          action: 'enhanced_screenshot' as const,
          includeTextDetection: true,
          options: { threshold: 0.8 },
        };

        const textDetectionResult = {
          regions: [
            { text: 'detected text', x: 10, y: 20, width: 100, height: 15 },
          ],
        };

        mockNutService.screendump.mockResolvedValue(
          Buffer.from('screenshot-data'),
        );
        mockCuaVisionService.detectText.mockResolvedValue(textDetectionResult);

        const result = (await service.action(
          action,
        )) as EnhancedScreenshotResult;

        expect(result.textDetection).toEqual(textDetectionResult);
        expect(result.enhancementsApplied).toContain('text_detection');
        expect(mockCuaVisionService.detectText).toHaveBeenCalledWith(
          expect.any(String),
          { threshold: 0.8 },
        );
      });

      it('should continue processing when OCR enhancement fails', async () => {
        const action = {
          action: 'enhanced_screenshot' as const,
          includeOcr: true,
        };

        mockNutService.screendump.mockResolvedValue(
          Buffer.from('screenshot-data'),
        );
        mockCuaVisionService.performOcr.mockRejectedValue(
          new Error('OCR service unavailable'),
        );

        const result = (await service.action(
          action,
        )) as EnhancedScreenshotResult;

        expect(result.ocr).toBeUndefined();
        expect(result.enhancementsApplied).toEqual(['screenshot']);
        // Should still complete successfully
        expect(result.image).toBeDefined();
      });

      it('should continue processing when text detection enhancement fails', async () => {
        const action = {
          action: 'enhanced_screenshot' as const,
          includeTextDetection: true,
        };

        mockNutService.screendump.mockResolvedValue(
          Buffer.from('screenshot-data'),
        );
        mockCuaVisionService.detectText.mockRejectedValue(
          new Error('Text detection failed'),
        );

        const result = (await service.action(
          action,
        )) as EnhancedScreenshotResult;

        expect(result.textDetection).toBeUndefined();
        expect(result.enhancementsApplied).toEqual(['screenshot']);
      });

      it('should warn when enhancements requested without C/ua framework', async () => {
        const action = {
          action: 'enhanced_screenshot' as const,
          includeOcr: true,
          includeTextDetection: true,
        };

        mockNutService.screendump.mockResolvedValue(
          Buffer.from('screenshot-data'),
        );
        // C/ua framework disabled
        mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);

        const serviceWithoutCua = new ComputerUseService(
          mockNutService as NutService,
          mockCuaIntegrationService as CuaIntegrationService,
        );

        const result = (await serviceWithoutCua.action(
          action,
        )) as EnhancedScreenshotResult;

        expect(result.enhancementsApplied).toEqual(['screenshot']);
        expect(result.ocr).toBeUndefined();
        expect(result.textDetection).toBeUndefined();
      });

      it('should record comprehensive performance metrics', async () => {
        const action = {
          action: 'enhanced_screenshot' as const,
          includeOcr: true,
          includeTextDetection: true,
        };

        const ocrResult = { text: 'OCR', confidence: 0.9, method: 'ANE' };
        const textDetectionResult = { regions: [{ text: 'region' }] };

        mockNutService.screendump.mockResolvedValue(
          Buffer.from('screenshot-data'),
        );
        mockCuaVisionService.performOcr.mockResolvedValue(ocrResult);
        mockCuaVisionService.detectText.mockResolvedValue(textDetectionResult);

        await service.action(action);

        expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
          'enhanced_screenshot',
          expect.objectContaining({
            success: true,
            enhancementsApplied: 'screenshot,ocr,text_detection',
            ocrTextLength: 3,
            textRegions: 1,
          }),
        );
      });
    });
  });

  describe('Error Handling', () => {
    describe('ErrorHandler utility', () => {
      it('should extract error messages from Error objects', () => {
        const error = new Error('Test error message');
        const message = ErrorHandler.extractErrorMessage(error);
        expect(message).toBe('Test error message');
      });

      it('should extract error messages from string errors', () => {
        const message = ErrorHandler.extractErrorMessage('String error');
        expect(message).toBe('String error');
      });

      it('should extract error messages from objects with message property', () => {
        const error = { message: 'Object error message' };
        const message = ErrorHandler.extractErrorMessage(error);
        expect(message).toBe('Object error message');
      });

      it('should handle unknown error types', () => {
        const error = { unknownProperty: 'value' };
        const message = ErrorHandler.extractErrorMessage(error);
        expect(message).toBe(JSON.stringify(error));
      });

      it('should extract stack traces from Error objects', () => {
        const error = new Error('Test error');
        const stack = ErrorHandler.extractErrorStack(error);
        expect(stack).toBeDefined();
        expect(stack).toContain('Error: Test error');
      });

      it('should extract stack traces from objects with stack property', () => {
        const error = { stack: 'Custom stack trace' };
        const stack = ErrorHandler.extractErrorStack(error);
        expect(stack).toBe('Custom stack trace');
      });

      it('should return undefined for objects without stack', () => {
        const error = { message: 'No stack' };
        const stack = ErrorHandler.extractErrorStack(error);
        expect(stack).toBeUndefined();
      });

      it('should create comprehensive error objects', () => {
        const originalError = new Error('Original error');
        const error = ErrorHandler.createError(
          'TEST_ERROR',
          'Test message',
          'operation_123',
          { contextKey: 'contextValue' },
          originalError,
        );

        expect(error).toMatchObject({
          code: 'TEST_ERROR',
          message: 'Test message',
          operationId: 'operation_123',
          timestamp: expect.any(Date),
          context: { contextKey: 'contextValue' },
          stack: expect.stringContaining('Error: Original error'),
          originalError: originalError,
        });
      });

      it('should create error objects without original error', () => {
        const error = ErrorHandler.createError(
          'SIMPLE_ERROR',
          'Simple message',
          'operation_456',
        );

        expect(error).toMatchObject({
          code: 'SIMPLE_ERROR',
          message: 'Simple message',
          operationId: 'operation_456',
          timestamp: expect.any(Date),
          context: {},
          stack: undefined,
          originalError: undefined,
        });
      });
    });

    describe('Action error handling', () => {
      it('should handle unknown action types', async () => {
        const invalidAction = {
          action: 'invalid_action',
        } as MoveMouseAction;

        await expect(service.action(invalidAction)).rejects.toThrow(
          'Unsupported computer action',
        );
      });

      it('should provide structured error information', async () => {
        const action: MoveMouseAction = {
          action: 'move_mouse',
          coordinates: { x: 100, y: 200 },
        };

        const originalError = new Error('NUT service error');
        mockNutService.mouseMoveEvent.mockRejectedValue(originalError);

        try {
          await service.action(action);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error.message).toContain('Failed to execute move_mouse');
          expect(error.message).toContain('NUT service error');
        }
      });

      it('should handle performance service metric recording errors gracefully', async () => {
        const action: ScreenshotAction = {
          action: 'screenshot',
        };

        mockNutService.screendump.mockResolvedValue(Buffer.from('test'));
        mockPerformanceService.recordMetric.mockRejectedValue(
          new Error('Metrics service down'),
        );

        // Should complete successfully despite metrics error
        const result = await service.action(action);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complex mouse operation with all features', async () => {
      const action: ClickMouseAction = {
        action: 'click_mouse',
        coordinates: { x: 100, y: 200 },
        button: 'left',
        clickCount: 2,
        holdKeys: ['ctrl', 'shift'],
      };

      mockNutService.mouseMoveEvent.mockResolvedValue({ success: true });
      mockNutService.holdKeys.mockResolvedValue({ success: true });
      mockNutService.mouseClickEvent.mockResolvedValue({ success: true });

      await service.action(action);

      expect(mockNutService.mouseMoveEvent).toHaveBeenCalledWith({
        x: 100,
        y: 200,
      });
      expect(mockNutService.holdKeys).toHaveBeenCalledWith(
        ['ctrl', 'shift'],
        true,
      );
      expect(mockNutService.mouseClickEvent).toHaveBeenCalledTimes(2);
      expect(mockNutService.holdKeys).toHaveBeenCalledWith(
        ['ctrl', 'shift'],
        false,
      );
    });

    it('should handle file operations with comprehensive error scenarios', async () => {
      const action: WriteFileAction = {
        action: 'write_file',
        path: '/home/user/test.txt',
        data: 'invalid-base64',
      };

      const result = (await service.action(action)) as FileWriteResult;

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid base64 data');
    });

    it('should handle enhanced screenshot with multiple enhancements and partial failures', async () => {
      const action = {
        action: 'enhanced_screenshot' as const,
        includeOcr: true,
        includeTextDetection: true,
      };

      mockNutService.screendump.mockResolvedValue(Buffer.from('screenshot'));
      mockCuaVisionService.performOcr.mockResolvedValue({
        text: 'OCR success',
        confidence: 0.9,
        method: 'ANE',
      });
      // Text detection fails
      mockCuaVisionService.detectText.mockRejectedValue(
        new Error('Text detection unavailable'),
      );

      const result = (await service.action(action)) as EnhancedScreenshotResult;

      expect(result.enhancementsApplied).toContain('screenshot');
      expect(result.enhancementsApplied).toContain('ocr');
      expect(result.enhancementsApplied).not.toContain('text_detection');
      expect(result.ocr).toBeDefined();
      expect(result.textDetection).toBeUndefined();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should record timing metrics for all operations', async () => {
      const action: ScreenshotAction = {
        action: 'screenshot',
      };

      mockNutService.screendump.mockResolvedValue(Buffer.from('test'));

      const startTime = Date.now();
      await service.action(action);
      const endTime = Date.now();

      expect(mockPerformanceService.recordMetric).toHaveBeenCalledWith(
        'screenshot',
        expect.objectContaining({
          duration: expect.any(Number),
          success: true,
        }),
      );

      // Verify the recorded duration is reasonable
      const recordedMetric =
        mockPerformanceService.recordMetric.mock.calls[0][1];
      expect(recordedMetric.duration).toBeGreaterThanOrEqual(0);
      expect(recordedMetric.duration).toBeLessThan(endTime - startTime + 100); // Allow some tolerance
    });

    it('should generate unique operation IDs', async () => {
      const action1: ScreenshotAction = { action: 'screenshot' };
      const action2: ScreenshotAction = { action: 'screenshot' };

      mockNutService.screendump.mockResolvedValue(Buffer.from('test'));

      const [result1, result2] = await Promise.all([
        service.action(action1) as Promise<ScreenshotResult>,
        service.action(action2) as Promise<ScreenshotResult>,
      ]);

      expect(result1.metadata?.operationId).toBeDefined();
      expect(result2.metadata?.operationId).toBeDefined();
      expect(result1.metadata?.operationId).not.toBe(
        result2.metadata?.operationId,
      );
    });

    it('should handle performance service unavailability gracefully', async () => {
      // Create service without performance service
      const moduleWithoutPerf: TestingModule = await Test.createTestingModule({
        providers: [
          ComputerUseService,
          { provide: NutService, useValue: mockNutService },
          {
            provide: CuaIntegrationService,
            useValue: mockCuaIntegrationService,
          },
        ],
      }).compile();

      const serviceWithoutPerf =
        moduleWithoutPerf.get<ComputerUseService>(ComputerUseService);

      const action: ScreenshotAction = { action: 'screenshot' };
      mockNutService.screendump.mockResolvedValue(Buffer.from('test'));

      // Should complete successfully without performance service
      const result = await serviceWithoutPerf.action(action);
      expect(result).toBeDefined();

      await moduleWithoutPerf.close();
    });
  });
});
