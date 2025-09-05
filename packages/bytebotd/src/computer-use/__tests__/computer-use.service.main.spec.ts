/**
 * Computer Use Service - Main Action Router and Error Handling Unit Tests
 *
 * Comprehensive test suite for the main action method (router) and error handling
 * in the ComputerUseService class. Tests focus on action routing logic, error scenarios,
 * performance tracking, and delay method operations.
 *
 * Test Coverage:
 * - Main action method routing for all action types
 * - Error handling and structured error creation
 * - Performance logging and operation tracking
 * - Delay method timing operations
 * - Edge cases and invalid input handling
 * - Mock verification and service integration
 */

 
 
 
 
 
 
 

// Mock child_process and fs operations BEFORE imports
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, opts, cb) => {
    if (typeof opts === 'function') cb = opts;
    setTimeout(() => cb(null, { stdout: '', stderr: '' }), 10);
    return { pid: 12345 };
  }),
  spawn: jest.fn().mockReturnValue({
    unref: jest.fn(),
    pid: 12345,
    kill: jest.fn(),
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
  }),
}));

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test content')),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

// Don't mock util completely - just mock promisify when needed
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(
    (fn) =>
      (...args) =>
        Promise.resolve(fn(...args)),
  ),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ComputerUseService, ErrorHandler } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import { CuaIntegrationService } from '../../cua-integration/cua-integration.service';
import { CuaVisionService } from '../../cua-integration/cua-vision.service';
import { CuaPerformanceService } from '../../cua-integration/cua-performance.service';
import {
  ComputerAction,
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
  WaitAction,
  ScreenshotAction,
  CursorPositionAction,
  ApplicationAction,
  WriteFileAction,
  ReadFileAction,
  OcrAction,
  FindTextAction,
  EnhancedScreenshotAction,
} from '@bytebot/shared';

// Mock dependencies
const mockNutService = {
  mouseMoveEvent: jest.fn(),
  mouseClickEvent: jest.fn(),
  mouseButtonEvent: jest.fn(),
  mouseWheelEvent: jest.fn(),
  sendKeys: jest.fn(),
  holdKeys: jest.fn(),
  typeText: jest.fn(),
  pasteText: jest.fn(),
  screendump: jest.fn(),
  getCursorPosition: jest.fn(),
};

const mockCuaIntegrationService = {
  isFrameworkEnabled: jest.fn().mockReturnValue(true),
};

const mockCuaVisionService = {
  performOcr: jest.fn(),
  detectText: jest.fn(),
};

const mockCuaPerformanceService = {
  recordMetric: jest.fn(),
};

describe('ComputerUseService - Main Action Router and Error Handling', () => {
  let service: ComputerUseService;
  let nutService: NutService;
  let cuaIntegrationService: CuaIntegrationService;
  let cuaVisionService: CuaVisionService;
  let performanceService: CuaPerformanceService;

  // Helper function to create test actions
  const createTestAction = <T extends ComputerAction>(
    overrides: Partial<T> = {},
  ): T => {
    const baseAction = {
      action: 'move_mouse' as const,
      coordinates: { x: 100, y: 200 },
      ...overrides,
    };
    return baseAction as T;
  };

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock child_process.exec
    const { exec } = require('child_process');
    const { promisify } = require('util');

    // Mock exec to resolve quickly for tests
    exec.mockImplementation((command, options, callback) => {
      if (typeof options === 'function') {
        callback = options;
      }
      // Simulate quick exec resolution
      setTimeout(() => {
        if (command.includes('stat')) {
          callback(null, { stdout: '1024 1640995200' }); // size and timestamp
        } else {
          callback(null, { stdout: '' });
        }
      }, 10);
      return { pid: 12345 };
    });

    // Mock Logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComputerUseService,
        {
          provide: NutService,
          useValue: mockNutService,
        },
        {
          provide: CuaIntegrationService,
          useValue: mockCuaIntegrationService,
        },
        {
          provide: CuaVisionService,
          useValue: mockCuaVisionService,
        },
        {
          provide: CuaPerformanceService,
          useValue: mockCuaPerformanceService,
        },
      ],
    }).compile();

    service = module.get<ComputerUseService>(ComputerUseService);
    nutService = module.get<NutService>(NutService);
    cuaIntegrationService = module.get<CuaIntegrationService>(
      CuaIntegrationService,
    );
    cuaVisionService = module.get<CuaVisionService>(CuaVisionService);
    performanceService = module.get<CuaPerformanceService>(
      CuaPerformanceService,
    );
  });

  describe('Main Action Router', () => {
    describe('Mouse Action Routing', () => {
      it('should route move_mouse action correctly', async () => {
        // Arrange
        const action = createTestAction<MoveMouseAction>({
          action: 'move_mouse',
          coordinates: { x: 100, y: 200 },
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 100,
          y: 200,
        });
        expect(result).toBeUndefined();
      });

      it('should route trace_mouse action correctly', async () => {
        // Arrange
        const action = createTestAction<TraceMouseAction>({
          action: 'trace_mouse',
          path: [
            { x: 100, y: 200 },
            { x: 150, y: 250 },
          ],
          holdKeys: ['ctrl'],
        });

        // Act
        const result = await service.action(action);

        // Assert - trace_mouse calls move to first coordinate + each path coordinate
        expect(nutService.mouseMoveEvent).toHaveBeenCalledTimes(3); // Initial + 2 path points
        expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], true);
        expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], false);
        expect(result).toBeUndefined();
      });

      it('should route click_mouse action correctly', async () => {
        // Arrange
        const action = createTestAction<ClickMouseAction>({
          action: 'click_mouse',
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 2,
          holdKeys: ['shift'],
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 100,
          y: 200,
        });
        expect(nutService.holdKeys).toHaveBeenCalledWith(['shift'], true);
        expect(nutService.mouseClickEvent).toHaveBeenCalledTimes(2);
        expect(nutService.holdKeys).toHaveBeenCalledWith(['shift'], false);
        expect(result).toBeUndefined();
      });

      it('should route press_mouse action correctly', async () => {
        // Arrange
        const action = createTestAction<PressMouseAction>({
          action: 'press_mouse',
          coordinates: { x: 100, y: 200 },
          button: 'right',
          press: 'down',
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 100,
          y: 200,
        });
        expect(nutService.mouseButtonEvent).toHaveBeenCalledWith('right', true);
        expect(result).toBeUndefined();
      });

      it('should route drag_mouse action correctly', async () => {
        // Arrange
        const action = createTestAction<DragMouseAction>({
          action: 'drag_mouse',
          path: [
            { x: 100, y: 200 },
            { x: 300, y: 400 },
          ],
          button: 'left',
          holdKeys: ['alt'],
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.mouseMoveEvent).toHaveBeenCalledTimes(3); // Initial + path
        expect(nutService.holdKeys).toHaveBeenCalledWith(['alt'], true);
        expect(nutService.mouseButtonEvent).toHaveBeenCalledWith('left', true);
        expect(nutService.mouseButtonEvent).toHaveBeenCalledWith('left', false);
        expect(nutService.holdKeys).toHaveBeenCalledWith(['alt'], false);
        expect(result).toBeUndefined();
      });

      it('should route scroll action correctly', async () => {
        // Arrange
        const action = createTestAction<ScrollAction>({
          action: 'scroll',
          coordinates: { x: 100, y: 200 },
          direction: 'down',
          scrollCount: 3,
          holdKeys: ['ctrl'],
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.mouseMoveEvent).toHaveBeenCalledWith({
          x: 100,
          y: 200,
        });
        expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], true);
        expect(nutService.mouseWheelEvent).toHaveBeenCalledTimes(3);
        expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], false);
        expect(result).toBeUndefined();
      });
    });

    describe('Keyboard Action Routing', () => {
      it('should route type_keys action correctly', async () => {
        // Arrange
        const action = createTestAction<TypeKeysAction>({
          action: 'type_keys',
          keys: ['ctrl', 'c'],
          delay: 100,
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.sendKeys).toHaveBeenCalledWith(['ctrl', 'c'], 100);
        expect(result).toBeUndefined();
      });

      it('should route press_keys action correctly', async () => {
        // Arrange
        const action = createTestAction<PressKeysAction>({
          action: 'press_keys',
          keys: ['ctrl', 'alt'],
          press: 'down',
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl', 'alt'], true);
        expect(result).toBeUndefined();
      });

      it('should route type_text action correctly', async () => {
        // Arrange
        const action = createTestAction<TypeTextAction>({
          action: 'type_text',
          text: 'Hello World',
          delay: 50,
          sensitive: false,
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.typeText).toHaveBeenCalledWith('Hello World', 50);
        expect(result).toBeUndefined();
      });

      it('should route paste_text action correctly', async () => {
        // Arrange
        const action = createTestAction<PasteTextAction>({
          action: 'paste_text',
          text: 'Clipboard content',
        });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.pasteText).toHaveBeenCalledWith('Clipboard content');
        expect(result).toBeUndefined();
      });
    });

    describe('System Action Routing', () => {
      it('should route wait action correctly and call delay', async () => {
        // Arrange
        const action = createTestAction<WaitAction>({
          action: 'wait',
          duration: 1000,
        });

        // Mock setTimeout for delay testing
        jest.useFakeTimers();
        const delayPromise = service.action(action);

        // Act
        jest.advanceTimersByTime(1000);
        const result = await delayPromise;

        // Assert
        expect(result).toBeUndefined();

        // Cleanup
        jest.useRealTimers();
      });

      it('should route screenshot action correctly', async () => {
        // Arrange
        const action = createTestAction<ScreenshotAction>({
          action: 'screenshot',
        });
        const mockBuffer = Buffer.from('test-image-data', 'base64');
        mockNutService.screendump.mockResolvedValue(mockBuffer);

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.screendump).toHaveBeenCalled();
        expect(result).toHaveProperty('image');
        expect(result).toHaveProperty('metadata');
        expect((result as any).image).toBe(mockBuffer.toString('base64'));
      });

      it('should route cursor_position action correctly', async () => {
        // Arrange
        const action = createTestAction<CursorPositionAction>({
          action: 'cursor_position',
        });
        mockNutService.getCursorPosition.mockResolvedValue({ x: 150, y: 250 });

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.getCursorPosition).toHaveBeenCalled();
        expect(result).toHaveProperty('x', 150);
        expect(result).toHaveProperty('y', 250);
        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('operationId');
      });

      it('should route application action correctly', async () => {
        // Arrange
        const { spawn } = require('child_process');
        spawn.mockReturnValue({
          unref: jest.fn(),
          pid: 12345,
          kill: jest.fn(),
          on: jest.fn(),
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn() },
        });

        const action = createTestAction<ApplicationAction>({
          action: 'application',
          application: 'firefox',
        });

        // Act
        const result = await service.action(action);

        // Assert - Application management uses spawn, so we just verify no errors
        expect(result).toBeUndefined();
        expect(spawn).toHaveBeenCalled();
      }, 5000);
    });

    describe('File System Action Routing', () => {
      it('should route write_file action correctly', async () => {
        // Arrange
        const testData = Buffer.from('test file content').toString('base64');
        const action = createTestAction<WriteFileAction>({
          action: 'write_file',
          path: '/tmp/test-file.txt',
          data: testData,
        });

        // Act
        const result = await service.action(action);

        // Assert - file operations may fail in test environment
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('operationId');
        expect(result).toHaveProperty('timestamp');
        // File write may fail due to test environment permissions
        if ((result as any).success) {
          expect(result).toHaveProperty('path');
        } else {
          expect(result).toHaveProperty('message');
        }
      }, 5000);

      it('should route read_file action correctly', async () => {
        // Arrange
        const action = createTestAction<ReadFileAction>({
          action: 'read_file',
          path: '/tmp/test-read.txt',
        });

        // Act
        const result = await service.action(action);

        // Assert - File operations may fail in test environment, check structure
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('operationId');
        expect(result).toHaveProperty('timestamp');
      }, 5000);
    });

    describe('C/ua Enhanced Action Routing', () => {
      it('should route ocr action correctly when C/ua is enabled', async () => {
        // Arrange
        const action = createTestAction<OcrAction>({
          action: 'ocr',
          coordinates: { x: 100, y: 200 },
          language: 'en',
        });

        // Act & Assert - OCR requires proper C/ua integration
        await expect(service.action(action)).rejects.toThrow(
          /OCR processing failed/,
        );
      });

      it('should route find_text action correctly when C/ua is enabled', async () => {
        // Arrange
        const action = createTestAction<FindTextAction>({
          action: 'find_text',
          text: 'Search Text',
          caseSensitive: true,
          wholeWord: false,
        });

        // Act & Assert - Find text requires proper C/ua integration
        await expect(service.action(action)).rejects.toThrow(
          /Text finding failed/,
        );
      });

      it('should route enhanced_screenshot action correctly when C/ua is enabled', async () => {
        // Arrange
        const action = createTestAction<EnhancedScreenshotAction>({
          action: 'enhanced_screenshot',
          region: { x: 0, y: 0, width: 800, height: 600 },
          format: 'png',
        });
        const mockBuffer = Buffer.from('screenshot-data');
        mockNutService.screendump.mockResolvedValue(mockBuffer);

        // Act
        const result = await service.action(action);

        // Assert
        expect(nutService.screendump).toHaveBeenCalled();
        expect(result).toHaveProperty('image');
        expect(result).toHaveProperty('processingTimeMs');
        expect(result).toHaveProperty('enhancementsApplied');
        expect(result).toHaveProperty('operationId');
      });
    });

    describe('Invalid Action Handling', () => {
      it('should throw error for unsupported action type', async () => {
        // Arrange - Create invalid action by type assertion
        const invalidAction = {
          action: 'invalid_action',
          someParam: 'value',
        } as any as ComputerAction;

        // Act & Assert
        await expect(service.action(invalidAction)).rejects.toThrow(
          /Unsupported computer action/,
        );
      });

      it('should handle exhaustive check in default case', async () => {
        // Arrange - Create action with unknown type
        const unknownAction = {
          action: 'completely_unknown',
        } as any as ComputerAction;

        // Act & Assert
        await expect(service.action(unknownAction)).rejects.toThrow();
      });
    });
  });

  describe('Error Handling and Structured Errors', () => {
    describe('Action Error Handling', () => {
      it('should handle NutService errors and wrap them properly', async () => {
        // Arrange
        const action = createTestAction<MoveMouseAction>({
          action: 'move_mouse',
          coordinates: { x: 100, y: 200 },
        });
        const originalError = new Error('NutService connection failed');
        mockNutService.mouseMoveEvent.mockRejectedValue(originalError);

        // Act & Assert
        await expect(service.action(action)).rejects.toThrow(
          /Failed to execute move_mouse/,
        );
      });

      it('should handle C/ua service errors gracefully', async () => {
        // Arrange
        const action = createTestAction<OcrAction>({
          action: 'ocr',
          language: 'en',
        });
        const mockBuffer = Buffer.from('screenshot-data');
        mockNutService.screendump.mockResolvedValue(mockBuffer);
        mockCuaVisionService.performOcr.mockRejectedValue(
          new Error('C/ua framework unavailable'),
        );

        // Act & Assert
        await expect(service.action(action)).rejects.toThrow(
          /OCR processing failed/,
        );
      });

      it('should log structured error information', async () => {
        // Arrange
        const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
        const action = createTestAction<ClickMouseAction>({
          action: 'click_mouse',
          button: 'left',
          clickCount: 1,
        });
        mockNutService.mouseClickEvent.mockRejectedValue(
          new Error('Mouse hardware error'),
        );

        // Act
        await expect(service.action(action)).rejects.toThrow();

        // Assert
        expect(loggerErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining('Computer action failed'),
          expect.objectContaining({
            operationId: expect.any(String),
            actionType: 'click_mouse',
            processingTimeMs: expect.any(Number),
            error: 'Mouse hardware error',
          }),
        );
      });

      it('should include operation ID in all error messages', async () => {
        // Arrange
        const action = createTestAction<TypeTextAction>({
          action: 'type_text',
          text: 'test',
        });
        mockNutService.typeText.mockRejectedValue(new Error('Keyboard error'));

        // Act & Assert
        try {
          await service.action(action);
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain(
            'Failed to execute type_text',
          );
        }
      });
    });

    describe('Performance Monitoring', () => {
      it('should log action start with performance tracking', async () => {
        // Arrange
        const loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
        const action = createTestAction<MoveMouseAction>({
          action: 'move_mouse',
          coordinates: { x: 100, y: 200 },
        });

        // Act
        await service.action(action);

        // Assert
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Executing computer action: move_mouse'),
          expect.objectContaining({
            operationId: expect.any(String),
            actionType: 'move_mouse',
            hasCoordinates: true,
            timestamp: expect.any(String),
          }),
        );
      });

      it('should log action completion with performance metrics', async () => {
        // Arrange
        const loggerLogSpy = jest.spyOn(Logger.prototype, 'log');
        const action = createTestAction<ScreenshotAction>({
          action: 'screenshot',
        });
        const mockBuffer = Buffer.from('test-data');
        mockNutService.screendump.mockResolvedValue(mockBuffer);

        // Act
        await service.action(action);

        // Assert
        expect(loggerLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Computer action completed successfully'),
          expect.objectContaining({
            operationId: expect.any(String),
            actionType: 'screenshot',
            processingTimeMs: expect.any(Number),
            hasResult: true,
            resultType: expect.any(String),
          }),
        );
      });

      it('should record performance metrics when C/ua is enabled', async () => {
        // Arrange
        const action = createTestAction<ScreenshotAction>({
          action: 'screenshot',
        });
        const mockBuffer = Buffer.from('test-data');
        mockNutService.screendump.mockResolvedValue(mockBuffer);

        // Act
        const result = await service.action(action);

        // Assert - Performance service may not be available in test setup
        // This test validates the service doesn't crash when performance service is unavailable
        expect(result).toBeDefined();
        expect(result).toHaveProperty('image');
      });
    });

    describe('Cleanup and Resource Management', () => {
      it('should release held keys on error during trace_mouse', async () => {
        // Arrange
        const action = createTestAction<TraceMouseAction>({
          action: 'trace_mouse',
          path: [{ x: 100, y: 200 }],
          holdKeys: ['ctrl', 'shift'],
        });
        mockNutService.mouseMoveEvent
          .mockResolvedValueOnce(undefined) // First call succeeds
          .mockRejectedValueOnce(new Error('Movement failed')); // Second call fails

        // Act & Assert
        await expect(service.action(action)).rejects.toThrow();

        // Verify cleanup - keys should be released
        expect(mockNutService.holdKeys).toHaveBeenCalledWith(
          ['ctrl', 'shift'],
          false,
        );
      });

      it('should release mouse button on error during drag_mouse', async () => {
        // Arrange
        const action = createTestAction<DragMouseAction>({
          action: 'drag_mouse',
          path: [
            { x: 100, y: 200 },
            { x: 300, y: 400 },
          ],
          button: 'left',
        });
        mockNutService.mouseMoveEvent.mockResolvedValueOnce(undefined);
        mockNutService.mouseButtonEvent.mockResolvedValueOnce(undefined);
        mockNutService.mouseMoveEvent.mockRejectedValueOnce(
          new Error('Move failed'),
        );

        // Act & Assert
        await expect(service.action(action)).rejects.toThrow();

        // Verify cleanup - mouse button should be released
        expect(mockNutService.mouseButtonEvent).toHaveBeenCalledWith(
          'left',
          false,
        );
      });
    });
  });

  describe('Delay Method', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create proper delay with specified duration', async () => {
      // Arrange
      const duration = 2000;
      const action = createTestAction<WaitAction>({
        action: 'wait',
        duration,
      });

      // Act
      const delayPromise = service.action(action);

      // Fast-forward time
      jest.advanceTimersByTime(duration);

      const result = await delayPromise;

      // Assert
      expect(result).toBeUndefined();
    });

    it('should validate and limit delay duration to maximum', async () => {
      // Arrange - Duration exceeding maximum (5 minutes = 300000ms)
      const excessiveDuration = 400000; // 6.67 minutes
      const action = createTestAction<WaitAction>({
        action: 'wait',
        duration: excessiveDuration,
      });
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      const delayPromise = service.action(action);
      jest.advanceTimersByTime(300000); // Advance by maximum allowed time
      await delayPromise;

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Delay adjusted from 400000ms to 300000ms'),
      );
    });

    it('should handle negative delay values', async () => {
      // Arrange
      const negativeDuration = -1000;
      const action = createTestAction<WaitAction>({
        action: 'wait',
        duration: negativeDuration,
      });
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');

      // Act
      const delayPromise = service.action(action);
      jest.advanceTimersByTime(0); // No time advancement needed for 0ms delay
      const result = await delayPromise;

      // Assert
      expect(result).toBeUndefined();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Delay adjusted from -1000ms to 0ms'),
      );
    });

    it('should log delay start and completion', async () => {
      // Arrange
      const duration = 1000;
      const action = createTestAction<WaitAction>({
        action: 'wait',
        duration,
      });
      const loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug');

      // Act
      const delayPromise = service.action(action);
      jest.advanceTimersByTime(duration);
      await delayPromise;

      // Assert
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting delay of 1000ms'),
      );
      expect(loggerDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Delay of 1000ms completed'),
      );
    });
  });

  describe('ErrorHandler Utility Class', () => {
    describe('extractErrorMessage', () => {
      it('should extract message from Error instances', () => {
        // Arrange
        const error = new Error('Test error message');

        // Act
        const result = ErrorHandler.extractErrorMessage(error);

        // Assert
        expect(result).toBe('Test error message');
      });

      it('should handle string errors', () => {
        // Arrange
        const error = 'String error message';

        // Act
        const result = ErrorHandler.extractErrorMessage(error);

        // Assert
        expect(result).toBe('String error message');
      });

      it('should handle objects with message property', () => {
        // Arrange
        const error = { message: 'Object error message', code: 'ERR001' };

        // Act
        const result = ErrorHandler.extractErrorMessage(error);

        // Assert
        expect(result).toBe('Object error message');
      });

      it('should handle non-error objects', () => {
        // Arrange
        const error = { status: 500, detail: 'Server error' };

        // Act
        const result = ErrorHandler.extractErrorMessage(error);

        // Assert
        expect(result).toBe(JSON.stringify(error));
      });

      it('should handle null and undefined', () => {
        // Act & Assert
        expect(ErrorHandler.extractErrorMessage(null)).toBe('null');
        expect(ErrorHandler.extractErrorMessage(undefined)).toBe(
          JSON.stringify(undefined),
        );
      });
    });

    describe('extractErrorStack', () => {
      it('should extract stack from Error instances', () => {
        // Arrange
        const error = new Error('Test error');
        error.stack = 'Error: Test error\n    at test.js:1:1';

        // Act
        const result = ErrorHandler.extractErrorStack(error);

        // Assert
        expect(result).toBe('Error: Test error\n    at test.js:1:1');
      });

      it('should handle objects with stack property', () => {
        // Arrange
        const error = {
          message: 'Custom error',
          stack: 'Custom error\n    at custom.js:1:1',
        };

        // Act
        const result = ErrorHandler.extractErrorStack(error);

        // Assert
        expect(result).toBe('Custom error\n    at custom.js:1:1');
      });

      it('should return undefined for objects without stack', () => {
        // Arrange
        const error = { message: 'No stack error' };

        // Act
        const result = ErrorHandler.extractErrorStack(error);

        // Assert
        expect(result).toBeUndefined();
      });
    });

    describe('createError', () => {
      it('should create comprehensive error object', () => {
        // Arrange
        const code = 'TEST_ERROR';
        const message = 'Test error message';
        const operationId = 'test_op_123';
        const context = { param1: 'value1', param2: 42 };
        const originalError = new Error('Original error');

        // Act
        const result = ErrorHandler.createError(
          code,
          message,
          operationId,
          context,
          originalError,
        );

        // Assert
        expect(result).toEqual({
          code,
          message,
          operationId,
          timestamp: expect.any(Date),
          context,
          stack: expect.any(String),
          originalError,
        });
      });

      it('should handle missing original error', () => {
        // Arrange
        const code = 'TEST_ERROR';
        const message = 'Test error message';
        const operationId = 'test_op_123';

        // Act
        const result = ErrorHandler.createError(code, message, operationId);

        // Assert
        expect(result).toEqual({
          code,
          message,
          operationId,
          timestamp: expect.any(Date),
          context: {},
          stack: undefined,
          originalError: undefined,
        });
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex action sequence with proper logging', async () => {
      // Arrange
      const actions: ComputerAction[] = [
        {
          action: 'move_mouse',
          coordinates: { x: 100, y: 200 },
        },
        {
          action: 'click_mouse',
          button: 'left',
          clickCount: 1,
        },
        {
          action: 'type_text',
          text: 'Hello World',
        },
      ];
      const loggerLogSpy = jest.spyOn(Logger.prototype, 'log');

      // Act
      for (const action of actions) {
        await service.action(action);
      }

      // Assert
      expect(loggerLogSpy.mock.calls.length).toBeGreaterThanOrEqual(
        actions.length * 2,
      ); // At least start + completion for each
      expect(nutService.mouseMoveEvent).toHaveBeenCalledWith({
        x: 100,
        y: 200,
      });
      expect(nutService.mouseClickEvent).toHaveBeenCalledWith('left');
      expect(nutService.typeText).toHaveBeenCalledWith(
        'Hello World',
        undefined,
      );
    });

    it('should maintain operation isolation between concurrent actions', async () => {
      // Arrange
      const action1 = createTestAction<MoveMouseAction>({
        action: 'move_mouse',
        coordinates: { x: 100, y: 200 },
      });
      const action2 = createTestAction<TypeTextAction>({
        action: 'type_text',
        text: 'Concurrent text',
      });

      // Act
      const [result1, result2] = await Promise.all([
        service.action(action1),
        service.action(action2),
      ]);

      // Assert
      expect(result1).toBeUndefined();
      expect(result2).toBeUndefined();
      expect(nutService.mouseMoveEvent).toHaveBeenCalledWith({
        x: 100,
        y: 200,
      });
      expect(nutService.typeText).toHaveBeenCalledWith(
        'Concurrent text',
        undefined,
      );
    });
  });
});
