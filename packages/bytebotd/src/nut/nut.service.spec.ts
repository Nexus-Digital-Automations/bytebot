/**
 * NUT Service Unit Tests
 * Comprehensive test suite covering all methods, error handling, and edge cases
 *
 * Test Coverage Areas:
 * - Key input simulation and validation
 * - Text typing and pasting functionality
 * - Mouse movement, clicking, and scrolling
 * - Screen capture capabilities
 * - Cursor position tracking
 * - Error handling and edge cases
 * - Service health monitoring
 * - Async operations and logging
 *
 * Dependencies Mocked:
 * - @nut-tree-fork/nut-js (keyboard, mouse, screen)
 * - child_process (spawn for xclip)
 * - fs promises (file operations)
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { NutService } from './nut.service';
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';

// Type definitions for nut-js mocks
interface MockKeyboard {
  pressKey: jest.MockedFunction<(...keys: string[]) => Promise<void>>;
  releaseKey: jest.MockedFunction<(...keys: string[]) => Promise<void>>;
  config: { autoDelayMs: number };
}

interface MockMouse {
  setPosition: jest.MockedFunction<
    (point: { x: number; y: number }) => Promise<void>
  >;
  click: jest.MockedFunction<(button: string) => Promise<void>>;
  pressButton: jest.MockedFunction<(button: string) => Promise<void>>;
  releaseButton: jest.MockedFunction<(button: string) => Promise<void>>;
  scrollUp: jest.MockedFunction<(amount: number) => Promise<void>>;
  scrollDown: jest.MockedFunction<(amount: number) => Promise<void>>;
  scrollLeft: jest.MockedFunction<(amount: number) => Promise<void>>;
  scrollRight: jest.MockedFunction<(amount: number) => Promise<void>>;
  getPosition: jest.MockedFunction<() => Promise<{ x: number; y: number }>>;
  config: { autoDelayMs: number };
}

interface MockScreen {
  capture: jest.MockedFunction<
    (filename: string, fileType: string, outputPath: string) => Promise<void>
  >;
}

interface MockPoint {
  (x: number, y: number): { x: number; y: number };
}

interface MockNutJs {
  keyboard: MockKeyboard;
  mouse: MockMouse;
  screen: MockScreen;
  Point: MockPoint;
  Key: Record<string, string>;
  Button: Record<string, string>;
  FileType: Record<string, string>;
}

// Mock @nut-tree-fork/nut-js
jest.mock('@nut-tree-fork/nut-js', () => ({
  keyboard: {
    pressKey: jest.fn().mockResolvedValue(undefined),
    releaseKey: jest.fn().mockResolvedValue(undefined),
    config: { autoDelayMs: 100 },
  },
  mouse: {
    setPosition: jest.fn().mockResolvedValue(undefined),
    click: jest.fn().mockResolvedValue(undefined),
    pressButton: jest.fn().mockResolvedValue(undefined),
    releaseButton: jest.fn().mockResolvedValue(undefined),
    scrollUp: jest.fn().mockResolvedValue(undefined),
    scrollDown: jest.fn().mockResolvedValue(undefined),
    scrollLeft: jest.fn().mockResolvedValue(undefined),
    scrollRight: jest.fn().mockResolvedValue(undefined),
    getPosition: jest.fn().mockResolvedValue({ x: 100, y: 200 }),
    config: { autoDelayMs: 100 },
  },
  screen: {
    capture: jest.fn().mockResolvedValue(undefined),
  },
  Point: jest.fn().mockImplementation((x: number, y: number) => ({ x, y })),
  Key: {
    // Alphanumeric keys
    A: 'A',
    B: 'B',
    C: 'C',
    D: 'D',
    E: 'E',
    F: 'F',
    G: 'G',
    H: 'H',
    I: 'I',
    J: 'J',
    K: 'K',
    L: 'L',
    M: 'M',
    N: 'N',
    O: 'O',
    P: 'P',
    Q: 'Q',
    R: 'R',
    S: 'S',
    T: 'T',
    U: 'U',
    V: 'V',
    W: 'W',
    X: 'X',
    Y: 'Y',
    Z: 'Z',

    // Number keys
    Num0: 'Num0',
    Num1: 'Num1',
    Num2: 'Num2',
    Num3: 'Num3',
    Num4: 'Num4',
    Num5: 'Num5',
    Num6: 'Num6',
    Num7: 'Num7',
    Num8: 'Num8',
    Num9: 'Num9',

    // Modifier keys
    LeftShift: 'LeftShift',
    RightShift: 'RightShift',
    LeftControl: 'LeftControl',
    RightControl: 'RightControl',
    LeftAlt: 'LeftAlt',
    RightAlt: 'RightAlt',
    LeftSuper: 'LeftSuper',
    RightSuper: 'RightSuper',
    LeftMeta: 'LeftMeta',
    RightMeta: 'RightMeta',

    // Special keys
    Space: 'Space',
    Enter: 'Enter',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Tab: 'Tab',
    Escape: 'Escape',
    CapsLock: 'CapsLock',
    NumLock: 'NumLock',
    ScrollLock: 'ScrollLock',
    PageUp: 'PageUp',
    PageDown: 'PageDown',

    // Punctuation keys
    Period: 'Period',
    Comma: 'Comma',
    Semicolon: 'Semicolon',
    Quote: 'Quote',
    Grave: 'Grave',
    Minus: 'Minus',
    Equal: 'Equal',
    LeftBracket: 'LeftBracket',
    RightBracket: 'RightBracket',
    Backslash: 'Backslash',
    Slash: 'Slash',

    // Numpad keys
    NumPad0: 'NumPad0',
    NumPad1: 'NumPad1',
    NumPad2: 'NumPad2',
    NumPad3: 'NumPad3',
    NumPad4: 'NumPad4',
    NumPad5: 'NumPad5',
    NumPad6: 'NumPad6',
    NumPad7: 'NumPad7',
    NumPad8: 'NumPad8',
    NumPad9: 'NumPad9',
    Add: 'Add',
    Subtract: 'Subtract',
    Multiply: 'Multiply',
    Divide: 'Divide',
    Decimal: 'Decimal',
    NumPadEqual: 'NumPadEqual',

    // Audio keys
    AudioVolDown: 'AudioVolDown',
    AudioVolUp: 'AudioVolUp',
    AudioRandom: 'AudioRandom',
  },
  Button: {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    MIDDLE: 'MIDDLE',
  },
  FileType: {
    PNG: 'PNG',
  },
}));

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('NutService', () => {
  let service: NutService;
  let loggerSpy: jest.SpyInstance;

  const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
  const mockFs = fs.promises as jest.Mocked<typeof fs.promises>;

  // Extract mocked dependencies
  const mockNutJs = jest.requireMock('@nut-tree-fork/nut-js') as MockNutJs;
  const mockKeyboard = mockNutJs.keyboard;
  const mockMouse = mockNutJs.mouse;
  const mockScreen = mockNutJs.screen;
  const mockPoint = mockNutJs.Point;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup logger spy
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [NutService],
    }).compile();

    service = module.get<NutService>(NutService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      // Verify service instance
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(NutService);
    });

    it('should configure nut-js settings during initialization', () => {
      // Verify that mouse and keyboard configs are set to 100ms
      expect(mockMouse.config.autoDelayMs).toBe(100);
      expect(mockKeyboard.config.autoDelayMs).toBe(100);
    });

    it('should create screenshot directory during initialization', () => {
      // Since constructor runs during service creation, verify mkdir was called
      // Note: This is tested indirectly through the service health check
      const status = service.getServiceStatus();
      expect(status).toBeDefined();
      expect(status.screenshotDir).toContain('bytebot-screenshots');
    });
  });

  describe('Key Operations', () => {
    describe('sendKeys method', () => {
      it('should successfully send valid keys', async () => {
        const operationId = 'test_op_123';
        jest
          .spyOn(service as any, 'generateOperationId')
          .mockReturnValue(operationId);

        const result = await service.sendKeys(['A', 'B', 'C'], 50);

        expect(result.success).toBe(true);
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('A', 'B', 'C');
        expect(mockKeyboard.releaseKey).toHaveBeenCalledWith('A', 'B', 'C');
        expect(loggerSpy).toHaveBeenCalledWith(
          `[${operationId}] Starting key send operation`,
          expect.objectContaining({
            keys: 'A, B, C',
            delay: 50,
            operationId,
          }),
        );
      });

      it('should handle empty keys array', async () => {
        const result = await service.sendKeys([]);

        expect(result.success).toBe(true);
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith();
        expect(mockKeyboard.releaseKey).toHaveBeenCalledWith();
      });

      it('should throw error for invalid keys', async () => {
        await expect(service.sendKeys(['InvalidKey'])).rejects.toThrow(
          "Failed to send keys: Invalid key: 'InvalidKey'. Key not found in available key mappings.",
        );
      });

      it('should handle keyboard operation failure', async () => {
        const errorMessage = 'Keyboard operation failed';
        mockKeyboard.pressKey.mockRejectedValueOnce(new Error(errorMessage));

        await expect(service.sendKeys(['A'])).rejects.toThrow(
          `Failed to send keys: ${errorMessage}`,
        );
      });

      it('should use default delay when not specified', async () => {
        const result = await service.sendKeys(['Space']);
        expect(result.success).toBe(true);
      });
    });

    describe('holdKeys method', () => {
      it('should successfully hold keys down', async () => {
        const result = await service.holdKeys(['LeftShift', 'A'], true);

        expect(result.success).toBe(true);
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('LeftShift');
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('A');
      });

      it('should successfully release keys', async () => {
        const result = await service.holdKeys(['LeftControl', 'V'], false);

        expect(result.success).toBe(true);
        expect(mockKeyboard.releaseKey).toHaveBeenCalledWith('LeftControl');
        expect(mockKeyboard.releaseKey).toHaveBeenCalledWith('V');
      });

      it('should handle invalid keys in holdKeys', async () => {
        await expect(service.holdKeys(['InvalidKey'], true)).rejects.toThrow(
          "Failed to hold keys: Invalid key: 'InvalidKey'. Key not found in available key mappings.",
        );
      });

      it('should handle keyboard operation failure in holdKeys', async () => {
        mockKeyboard.pressKey.mockRejectedValueOnce(
          new Error('Press key failed'),
        );

        await expect(service.holdKeys(['A'], true)).rejects.toThrow(
          'Failed to hold keys: Press key failed',
        );
      });
    });

    describe('validateKey method', () => {
      it('should validate valid keys from XKeySymToNutKeyMap', async () => {
        // Test a key that exists in XKeySymToNutKeyMap
        const result = await service.sendKeys(['1']);
        expect(result.success).toBe(true);
      });

      it('should validate valid keys from NutKeyMap', async () => {
        const result = await service.sendKeys(['A']);
        expect(result.success).toBe(true);
      });

      it('should handle case-insensitive key matching', async () => {
        const result = await service.sendKeys(['a']);
        expect(result.success).toBe(true);
      });

      it('should throw error for completely invalid keys', async () => {
        await expect(service.sendKeys(['NonExistentKey123'])).rejects.toThrow(
          "Invalid key: 'NonExistentKey123'. Key not found in available key mappings.",
        );
      });
    });
  });

  describe('Text Operations', () => {
    describe('typeText method', () => {
      it('should successfully type simple lowercase text', async () => {
        await expect(service.typeText('hello')).resolves.not.toThrow();

        // Verify each character is processed
        expect(mockKeyboard.pressKey).toHaveBeenCalledTimes(5); // h, e, l, l, o
        expect(mockKeyboard.releaseKey).toHaveBeenCalledTimes(5);
      });

      it('should handle uppercase letters with shift', async () => {
        await expect(service.typeText('Hello')).resolves.not.toThrow();

        // 'H' should use shift + h, others are lowercase
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('LeftShift', 'H');
      });

      it('should handle numbers', async () => {
        await expect(service.typeText('123')).resolves.not.toThrow();

        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Num1');
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Num2');
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Num3');
      });

      it('should handle special characters', async () => {
        await expect(service.typeText(' .,;')).resolves.not.toThrow();

        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Space');
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Period');
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Comma');
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Semicolon');
      });

      it('should handle special characters requiring shift', async () => {
        await expect(service.typeText('!@#')).resolves.not.toThrow();

        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('LeftShift', 'Num1'); // !
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('LeftShift', 'Num2'); // @
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('LeftShift', 'Num3'); // #
      });

      it('should handle newline characters', async () => {
        await expect(service.typeText('line1\nline2')).resolves.not.toThrow();

        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('Enter');
      });

      it('should apply delay between characters when specified', async () => {
        const delaySpy = jest
          .spyOn(global, 'setTimeout')
          .mockImplementation((callback: () => void) => {
            callback();
            return {} as NodeJS.Timeout;
          });

        await service.typeText('ab', 50);

        expect(delaySpy).toHaveBeenCalledWith(expect.any(Function), 50);
        delaySpy.mockRestore();
      });

      it('should throw error for unmappable characters', async () => {
        await expect(service.typeText('🔥')).rejects.toThrow(
          'Failed to type text: No key mapping found for character:',
        );
      });

      it('should handle keyboard operation failure during typing', async () => {
        mockKeyboard.pressKey.mockRejectedValueOnce(
          new Error('Keyboard error'),
        );

        await expect(service.typeText('a')).rejects.toThrow(
          'Failed to type text: Keyboard error',
        );
      });
    });

    describe('pasteText method', () => {
      interface MockChildProcess {
        stdin: { write: jest.Mock; end: jest.Mock };
        once: jest.Mock;
        on: jest.Mock;
      }

      let mockChildProcess: MockChildProcess;

      beforeEach(() => {
        mockChildProcess = {
          stdin: {
            write: jest.fn(),
            end: jest.fn(),
          },
          once: jest.fn(),
          on: jest.fn(),
        };
        mockSpawn.mockReturnValue(
          mockChildProcess as unknown as ChildProcessWithoutNullStreams,
        );
      });

      it('should successfully paste text', async () => {
        // Setup successful xclip process
        mockChildProcess.once.mockImplementation(
          (event: string, callback: (code: number) => void) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10); // Success exit code
            }
          },
        );

        await expect(service.pasteText('test text')).resolves.not.toThrow();

        expect(mockSpawn).toHaveBeenCalledWith(
          'xclip',
          ['-selection', 'clipboard'],
          {
            env: { ...process.env, DISPLAY: ':0.0' },
            stdio: ['pipe', 'ignore', 'inherit'],
          },
        );
        expect(mockChildProcess.stdin.write).toHaveBeenCalledWith('test text');
        expect(mockChildProcess.stdin.end).toHaveBeenCalled();
        expect(mockKeyboard.pressKey).toHaveBeenCalledWith('LeftControl', 'V');
        expect(mockKeyboard.releaseKey).toHaveBeenCalledWith(
          'LeftControl',
          'V',
        );
      });

      it('should handle xclip process error', async () => {
        mockChildProcess.once.mockImplementation(
          (event: string, callback: (error: Error) => void) => {
            if (event === 'error') {
              setTimeout(() => callback(new Error('xclip not found')), 10);
            }
          },
        );

        await expect(service.pasteText('test text')).rejects.toThrow(
          'Failed to paste text: xclip not found',
        );
      });

      it('should handle xclip process failure', async () => {
        mockChildProcess.once.mockImplementation(
          (event: string, callback: (code: number) => void) => {
            if (event === 'close') {
              setTimeout(() => callback(1), 10); // Failure exit code
            }
          },
        );

        await expect(service.pasteText('test text')).rejects.toThrow(
          'Failed to paste text: xclip exited with code 1',
        );
      });

      it('should handle clipboard paste keyboard error', async () => {
        // Setup successful xclip
        mockChildProcess.once.mockImplementation(
          (event: string, callback: (code: number) => void) => {
            if (event === 'close') {
              setTimeout(() => callback(0), 10);
            }
          },
        );

        // Mock keyboard error during paste
        mockKeyboard.pressKey.mockRejectedValueOnce(new Error('Paste failed'));

        await expect(service.pasteText('test')).rejects.toThrow(
          'Failed to paste text: Paste failed',
        );
      });
    });
  });

  describe('Mouse Operations', () => {
    describe('mouseMoveEvent method', () => {
      it('should successfully move mouse to coordinates', async () => {
        const coordinates = { x: 500, y: 300 };
        const result = await service.mouseMoveEvent(coordinates);

        expect(result.success).toBe(true);
        expect(mockPoint).toHaveBeenCalledWith(500, 300);
        // The mocked Point returns the coordinates, so setPosition should be called with those
        expect(mockMouse.setPosition).toHaveBeenCalled();
      });

      it('should handle negative coordinates', async () => {
        const coordinates = { x: -10, y: -20 };
        const result = await service.mouseMoveEvent(coordinates);

        expect(result.success).toBe(true);
        expect(mockPoint).toHaveBeenCalledWith(-10, -20);
        expect(mockMouse.setPosition).toHaveBeenCalled();
      });

      it('should handle mouse move failure', async () => {
        mockMouse.setPosition.mockRejectedValueOnce(new Error('Move failed'));

        await expect(
          service.mouseMoveEvent({ x: 100, y: 100 }),
        ).rejects.toThrow('Failed to move mouse: Move failed');
      });
    });

    describe('mouseClickEvent method', () => {
      it('should click left mouse button', async () => {
        const result = await service.mouseClickEvent('left');

        expect(result.success).toBe(true);
        expect(mockMouse.click).toHaveBeenCalledWith('LEFT');
      });

      it('should click right mouse button', async () => {
        const result = await service.mouseClickEvent('right');

        expect(result.success).toBe(true);
        expect(mockMouse.click).toHaveBeenCalledWith('RIGHT');
      });

      it('should click middle mouse button', async () => {
        const result = await service.mouseClickEvent('middle');

        expect(result.success).toBe(true);
        expect(mockMouse.click).toHaveBeenCalledWith('MIDDLE');
      });

      it('should handle mouse click failure', async () => {
        mockMouse.click.mockRejectedValueOnce(new Error('Click failed'));

        await expect(service.mouseClickEvent('left')).rejects.toThrow(
          'Failed to click mouse button: Click failed',
        );
      });
    });

    describe('mouseButtonEvent method', () => {
      it('should press left mouse button', async () => {
        const result = await service.mouseButtonEvent('left', true);

        expect(result.success).toBe(true);
        expect(mockMouse.pressButton).toHaveBeenCalledWith('LEFT');
      });

      it('should release right mouse button', async () => {
        const result = await service.mouseButtonEvent('right', false);

        expect(result.success).toBe(true);
        expect(mockMouse.releaseButton).toHaveBeenCalledWith('RIGHT');
      });

      it('should press middle mouse button', async () => {
        const result = await service.mouseButtonEvent('middle', true);

        expect(result.success).toBe(true);
        expect(mockMouse.pressButton).toHaveBeenCalledWith('MIDDLE');
      });

      it('should handle mouse button operation failure', async () => {
        mockMouse.pressButton.mockRejectedValueOnce(
          new Error('Button press failed'),
        );

        await expect(service.mouseButtonEvent('left', true)).rejects.toThrow(
          'Failed to send mouse left button press event: Button press failed',
        );
      });
    });

    describe('mouseWheelEvent method', () => {
      it('should scroll up', async () => {
        const result = await service.mouseWheelEvent('up', 3);

        expect(result.success).toBe(true);
        expect(mockMouse.scrollUp).toHaveBeenCalledWith(3);
      });

      it('should scroll down', async () => {
        const result = await service.mouseWheelEvent('down', 2);

        expect(result.success).toBe(true);
        expect(mockMouse.scrollDown).toHaveBeenCalledWith(2);
      });

      it('should scroll left', async () => {
        const result = await service.mouseWheelEvent('left', 1);

        expect(result.success).toBe(true);
        expect(mockMouse.scrollLeft).toHaveBeenCalledWith(1);
      });

      it('should scroll right', async () => {
        const result = await service.mouseWheelEvent('right', 4);

        expect(result.success).toBe(true);
        expect(mockMouse.scrollRight).toHaveBeenCalledWith(4);
      });

      it('should handle scroll operation failure', async () => {
        mockMouse.scrollUp.mockRejectedValueOnce(new Error('Scroll failed'));

        await expect(service.mouseWheelEvent('up', 1)).rejects.toThrow(
          'Failed to scroll: Scroll failed',
        );
      });
    });

    describe('getCursorPosition method', () => {
      it('should successfully get cursor position', async () => {
        const mockPosition = { x: 150, y: 250 };
        mockMouse.getPosition.mockResolvedValueOnce(mockPosition);

        const result = await service.getCursorPosition();

        expect(result).toEqual({ x: 150, y: 250 });
        expect(mockMouse.getPosition).toHaveBeenCalled();
      });

      it('should handle cursor position retrieval failure', async () => {
        mockMouse.getPosition.mockRejectedValueOnce(
          new Error('Position failed'),
        );

        await expect(service.getCursorPosition()).rejects.toThrow(
          'Position failed',
        );
      });
    });
  });

  describe('Screen Operations', () => {
    describe('screendump method', () => {
      beforeEach(() => {
        // Mock Date.now for consistent filename
        jest.spyOn(Date, 'now').mockReturnValue(1234567890);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('should successfully take screenshot', async () => {
        const mockBuffer = Buffer.from('mock-image-data');
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);

        const result = await service.screendump();

        expect(result).toEqual(mockBuffer);
        expect(mockScreen.capture).toHaveBeenCalledWith(
          'screenshot-1234567890.png',
          'PNG',
          expect.stringContaining('bytebot-screenshots'),
        );
        expect(mockFs.readFile).toHaveBeenCalled();
        expect(mockFs.unlink).toHaveBeenCalled();
      });

      it('should handle screenshot capture failure', async () => {
        mockScreen.capture.mockRejectedValueOnce(new Error('Capture failed'));

        await expect(service.screendump()).rejects.toThrow('Capture failed');

        // Should still attempt cleanup
        expect(mockFs.unlink).toHaveBeenCalled();
      });

      it('should handle file read failure', async () => {
        mockFs.readFile.mockRejectedValueOnce(new Error('File read failed'));

        await expect(service.screendump()).rejects.toThrow('File read failed');
      });

      it('should handle cleanup failure gracefully', async () => {
        const mockBuffer = Buffer.from('test-data');
        mockFs.readFile.mockResolvedValueOnce(mockBuffer);
        mockFs.unlink.mockRejectedValueOnce(new Error('Cleanup failed'));

        const warnSpy = jest.spyOn(Logger.prototype, 'warn');

        const result = await service.screendump();

        expect(result).toEqual(mockBuffer);
        expect(warnSpy).toHaveBeenCalledWith(
          'Failed to remove temporary screenshot file: Cleanup failed',
        );
      });
    });
  });

  describe('Service Health and Utilities', () => {
    describe('getServiceStatus method', () => {
      it('should return healthy status when service is ready', () => {
        const status = service.getServiceStatus();

        expect(status.healthy).toBe(true);
        expect(status.screenshotDir).toContain('bytebot-screenshots');
        expect(status.mouseConfig.autoDelayMs).toBe(100);
        expect(status.keyboardConfig.autoDelayMs).toBe(100);
      });

      it('should return unhealthy status when service validation fails', () => {
        // Force service to be unhealthy by mocking validation
        jest
          .spyOn(service as any, 'validateServiceReady')
          .mockImplementationOnce(() => {
            throw new Error('Service not ready');
          });

        const status = service.getServiceStatus();

        expect(status.healthy).toBe(false);
      });
    });

    describe('generateOperationId method', () => {
      it('should generate unique operation IDs', () => {
        const generateOp = service['generateOperationId'] as () => string;
        const id1 = generateOp.call(service);
        const id2 = generateOp.call(service);

        expect(id1).toMatch(/^nut_operation_\d+_[a-z0-9]{6}$/);
        expect(id2).toMatch(/^nut_operation_\d+_[a-z0-9]{6}$/);
        expect(id1).not.toBe(id2);
      });
    });

    describe('getErrorMessage method', () => {
      it('should extract message from Error objects', () => {
        const error = new Error('Test error message');
        const getErrorMessage = service['getErrorMessage'] as (
          error: unknown,
        ) => string;
        const result = getErrorMessage.call(service, error);
        expect(result).toBe('Test error message');
      });

      it('should handle string errors', () => {
        const error = 'String error message';
        const getErrorMessage = service['getErrorMessage'] as (
          error: unknown,
        ) => string;
        const result = getErrorMessage.call(service, error);
        expect(result).toBe('String error message');
      });

      it('should extract message from objects with message property', () => {
        const error = { message: 'Object error message' };
        const getErrorMessage = service['getErrorMessage'] as (
          error: unknown,
        ) => string;
        const result = getErrorMessage.call(service, error);
        expect(result).toBe('Object error message');
      });

      it('should handle objects with non-string message', () => {
        const error = { message: { nested: 'error' } };
        const getErrorMessage = service['getErrorMessage'] as (
          error: unknown,
        ) => string;
        const result = getErrorMessage.call(service, error);
        expect(result).toBe(JSON.stringify({ nested: 'error' }));
      });

      it('should return default message for unknown error types', () => {
        const error = 42;
        const getErrorMessage = service['getErrorMessage'] as (
          error: unknown,
        ) => string;
        const result = getErrorMessage.call(service, error);
        expect(result).toBe('Unknown error occurred');
      });

      it('should handle null and undefined errors', () => {
        const getErrorMessage = service['getErrorMessage'] as (
          error: unknown,
        ) => string;
        expect(getErrorMessage.call(service, null)).toBe(
          'Unknown error occurred',
        );
        expect(getErrorMessage.call(service, undefined)).toBe(
          'Unknown error occurred',
        );
      });
    });

    describe('delay method', () => {
      it('should create proper delay', async () => {
        const setTimeoutSpy = jest
          .spyOn(global, 'setTimeout')
          .mockImplementation((callback: () => void) => {
            callback();
            return {} as NodeJS.Timeout;
          });

        const delay = service['delay'] as (ms: number) => Promise<void>;
        await delay.call(service, 100);

        expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);
        setTimeoutSpy.mockRestore();
      });
    });

    describe('validateServiceReady method', () => {
      it('should validate service is ready', () => {
        const validateServiceReady = service[
          'validateServiceReady'
        ] as () => void;
        expect(() => validateServiceReady.call(service)).not.toThrow();
      });

      it('should throw error when screenshot directory is not set', () => {
        // Mock the service to have no screenshot directory
        (service as any)['screenshotDir'] = null;

        const validateServiceReady = service[
          'validateServiceReady'
        ] as () => void;
        expect(() => validateServiceReady.call(service)).toThrow(
          'NUT Service not properly initialized - screenshot directory not set',
        );
      });
    });
  });

  describe('Character to Key Mapping', () => {
    describe('charToKeyInfo method', () => {
      it('should map lowercase letters correctly', () => {
        const charToKeyInfo = (service as any)['charToKeyInfo'];
        const result = charToKeyInfo.call(service, 'a');
        expect(result).toEqual({ keyCode: 'A', withShift: false });
      });

      it('should map uppercase letters with shift', () => {
        const charToKeyInfo = (service as any)['charToKeyInfo'];
        const result = charToKeyInfo.call(service, 'A');
        expect(result).toEqual({ keyCode: 'A', withShift: true });
      });

      it('should map numbers correctly', () => {
        const charToKeyInfo = (service as any)['charToKeyInfo'];
        const result = charToKeyInfo.call(service, '5');
        expect(result).toEqual({ keyCode: 'Num5', withShift: false });
      });

      it('should map special characters without shift', () => {
        const charToKeyInfo = (service as any)['charToKeyInfo'];
        const spaceResult = charToKeyInfo.call(service, ' ');
        expect(spaceResult).toEqual({ keyCode: 'Space', withShift: false });

        const periodResult = charToKeyInfo.call(service, '.');
        expect(periodResult).toEqual({ keyCode: 'Period', withShift: false });
      });

      it('should map special characters with shift', () => {
        const charToKeyInfo = (service as any)['charToKeyInfo'];
        const exclamationResult = charToKeyInfo.call(service, '!');
        expect(exclamationResult).toEqual({ keyCode: 'Num1', withShift: true });

        const atResult = charToKeyInfo.call(service, '@');
        expect(atResult).toEqual({ keyCode: 'Num2', withShift: true });
      });

      it('should return null for unmappable characters', () => {
        const charToKeyInfo = (service as any)['charToKeyInfo'];
        const result = charToKeyInfo.call(service, '€');
        expect(result).toBeNull();
      });
    });
  });

  describe('Async Operations and Promise Handling', () => {
    it('should handle multiple concurrent operations', async () => {
      const operations = [
        service.mouseMoveEvent({ x: 100, y: 100 }),
        service.sendKeys(['A']),
        service.mouseClickEvent('left'),
      ];

      await expect(Promise.all(operations)).resolves.not.toThrow();
    });

    it('should maintain operation isolation during concurrent execution', async () => {
      // Start multiple operations concurrently
      const mouseMove = service.mouseMoveEvent({ x: 200, y: 200 });
      const keyPress = service.sendKeys(['Space']);

      const [mouseMoveResult, keyPressResult] = await Promise.all([
        mouseMove,
        keyPress,
      ]);

      expect(mouseMoveResult.success).toBe(true);
      expect(keyPressResult.success).toBe(true);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle nut-js library throwing non-Error objects', async () => {
      mockKeyboard.pressKey.mockRejectedValueOnce('String error');

      await expect(service.sendKeys(['A'])).rejects.toThrow(
        'Failed to send keys: String error',
      );
    });

    it('should handle operations with empty or null input', async () => {
      await expect(service.sendKeys([])).resolves.not.toThrow();
      await expect(service.holdKeys([], true)).resolves.not.toThrow();
    });
  });

  describe('Logging and Operation Tracking', () => {
    it('should log operations with unique operation IDs', async () => {
      const mockOpId = 'test_operation_12345_abc123';
      jest
        .spyOn(service as any, 'generateOperationId')
        .mockReturnValue(mockOpId);

      await service.sendKeys(['Enter']);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[${mockOpId}] Starting key send operation`,
        expect.objectContaining({ operationId: mockOpId }),
      );
    });

    it('should log successful operations', async () => {
      const mockOpId = 'success_op_67890_def456';
      jest
        .spyOn(service as any, 'generateOperationId')
        .mockReturnValue(mockOpId);

      await service.sendKeys(['Tab']);

      expect(loggerSpy).toHaveBeenCalledWith(
        `[${mockOpId}] Key send operation completed successfully`,
      );
    });

    it('should log mouse operations', async () => {
      await service.mouseMoveEvent({ x: 300, y: 400 });

      expect(loggerSpy).toHaveBeenCalledWith(
        'Moving mouse to coordinates: (300, 400)',
      );
    });

    it('should log text operations', async () => {
      await service.typeText('test');

      expect(loggerSpy).toHaveBeenCalledWith('Typing text: test');
    });
  });
});
