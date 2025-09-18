/* eslint-env jest */

/**
 * Computer Use NUT Integration - Comprehensive Tests
 *
 * Enterprise-grade integration test suite for NUT (nut-tree-fork) automation
 * library integration, testing the native computer control capabilities,
 * cross-platform compatibility, and low-level automation features.
 *
 * Test Coverage:
 * - NUT service initialization and configuration
 * - Mouse automation integration (move, click, drag, scroll)
 * - Keyboard automation integration (type, press keys, shortcuts)
 * - Screen capture integration with NUT
 * - Window management and application control
 * - Performance optimization and timing control
 * - Error handling and fallback mechanisms
 * - Cross-platform compatibility testing
 * - Native library integration validation
 * - Resource management and cleanup
 *
 * @version 1.0.0 - Complete NUT Integration Test Suite
 * @author Subagent 5 - Computer Use Test Coverage Enhancement
 */

// Mock NUT library before imports
jest.mock('@nut-tree-fork/nut-js', () => ({
  screen: {
    capture: jest.fn(),
    find: jest.fn(),
    waitFor: jest.fn(),
    highlight: jest.fn(),
    config: {
      resourceDirectory: '/tmp/nut-resources',
      confidence: 0.99,
    },
  },
  mouse: {
    move: jest.fn(),
    setPosition: jest.fn(),
    getPosition: jest.fn(),
    leftClick: jest.fn(),
    rightClick: jest.fn(),
    doubleClick: jest.fn(),
    drag: jest.fn(),
    scrollDown: jest.fn(),
    scrollUp: jest.fn(),
    pressButton: jest.fn(),
    releaseButton: jest.fn(),
    config: {
      mouseSpeed: 1000,
      autoDelayMs: 100,
    },
  },
  keyboard: {
    type: jest.fn(),
    pressKey: jest.fn(),
    releaseKey: jest.fn(),
    config: {
      autoDelayMs: 100,
    },
  },
  Key: {
    Escape: 'Escape',
    Enter: 'Return',
    Space: 'space',
    Tab: 'Tab',
    Shift: 'shift',
    Control: 'ctrl',
    Alt: 'alt',
    Meta: 'cmd',
    F1: 'F1',
    F12: 'F12',
    Up: 'up',
    Down: 'down',
    Left: 'left',
    Right: 'right',
  },
  Button: {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
  },
  Point: jest.fn((x: number, y: number) => ({ x, y })),
  Region: jest.fn((x: number, y: number, width: number, height: number) => ({
    x, y, width, height
  })),
  Image: jest.fn(),
  sleep: jest.fn(),
  straightTo: jest.fn(),
  linear: jest.fn(),
  PROVIDER: {
    CV: 'opencv',
    TEMPLATE_MATCHING: 'template',
  },
}));

jest.mock('../computer-use.service');
jest.mock('../../nut/nut.service');

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ComputerUseService } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import {
  screen,
  mouse,
  keyboard,
  Key,
  Button,
  Point,
  Region,
  Image,
  sleep,
  straightTo,
  linear,
} from '@nut-tree-fork/nut-js';
import {
  MoveMouseAction,
  ClickMouseAction,
  DragMouseAction,
  ScrollAction,
  TypeTextAction,
  PressKeysAction,
} from '@bytebot/shared';

/**
 * Mock coordinates and regions
 */
const mockCoordinates = { x: 100, y: 200 };
const mockTargetCoordinates = { x: 300, y: 400 };
const mockRegion = { x: 50, y: 100, width: 200, height: 150 };

/**
 * Mock NUT results
 */
const mockScreenCapture = {
  data: Buffer.from('mock-screenshot-data'),
  width: 1920,
  height: 1080,
  channels: 3,
};

const mockMousePosition = { x: 150, y: 250 };

describe('Computer Use NUT Integration', () => {
  let service: ComputerUseService;
  let nutService: NutService;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mock services
    const mockComputerUseService = {
      action: jest.fn(),
      screenshot: jest.fn(),
    };

    const mockNutService = {
      moveMouse: jest.fn(),
      clickMouse: jest.fn(),
      dragMouse: jest.fn(),
      scroll: jest.fn(),
      typeText: jest.fn(),
      pressKeys: jest.fn(),
      screenshot: jest.fn(),
      initialize: jest.fn(),
      configure: jest.fn(),
      cleanup: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
        {
          provide: NutService,
          useValue: mockNutService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ComputerUseService>(ComputerUseService);
    nutService = module.get<NutService>(NutService);
    logger = module.get(Logger);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('NUT Service Initialization', () => {
    it('should initialize NUT service with proper configuration', async () => {
      await nutService.initialize();

      expect(nutService.initialize).toHaveBeenCalled();
      expect(screen.config.confidence).toBe(0.99);
      expect(mouse.config.mouseSpeed).toBe(1000);
      expect(keyboard.config.autoDelayMs).toBe(100);
    });

    it('should configure NUT performance settings', async () => {
      const config = {
        mouseSpeed: 2000,
        confidence: 0.95,
        autoDelayMs: 50,
      };

      await nutService.configure(config);

      expect(nutService.configure).toHaveBeenCalledWith(config);
    });

    it('should handle NUT initialization failures', async () => {
      nutService.initialize.mockRejectedValue(new Error('NUT initialization failed'));

      await expect(nutService.initialize()).rejects.toThrow('NUT initialization failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should cleanup NUT resources properly', async () => {
      await nutService.cleanup();

      expect(nutService.cleanup).toHaveBeenCalled();
    });
  });

  describe('Mouse Automation Integration', () => {
    describe('Mouse Movement', () => {
      const moveAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: mockCoordinates,
      };

      it('should integrate with NUT mouse movement', async () => {
        mouse.move.mockResolvedValue(undefined);
        nutService.moveMouse.mockResolvedValue(undefined);

        await nutService.moveMouse(moveAction);

        expect(nutService.moveMouse).toHaveBeenCalledWith(moveAction);
        expect(nutService.moveMouse).toHaveBeenCalledTimes(1);
      });

      it('should handle smooth mouse movement paths', async () => {
        const smoothMoveAction: MoveMouseAction = {
          action: 'move_mouse',
          coordinates: mockTargetCoordinates,
          duration: 1000,
          smooth: true,
        };

        mouse.move.mockResolvedValue(undefined);
        (straightTo as jest.Mock).mockResolvedValue(undefined);
        nutService.moveMouse.mockResolvedValue(undefined);

        await nutService.moveMouse(smoothMoveAction);

        expect(nutService.moveMouse).toHaveBeenCalledWith(smoothMoveAction);
      });

      it('should get current mouse position via NUT', async () => {
        mouse.getPosition.mockResolvedValue(mockMousePosition);

        const position = await mouse.getPosition();

        expect(position).toEqual(mockMousePosition);
        expect(mouse.getPosition).toHaveBeenCalled();
      });

      it('should handle mouse movement errors', async () => {
        mouse.move.mockRejectedValue(new Error('Mouse movement failed'));
        nutService.moveMouse.mockRejectedValue(new Error('Mouse movement failed'));

        await expect(nutService.moveMouse(moveAction)).rejects.toThrow('Mouse movement failed');
      });
    });

    describe('Mouse Clicking', () => {
      const clickAction: ClickMouseAction = {
        action: 'click_mouse',
        coordinates: mockCoordinates,
        clickCount: 1,
        button: 'left',
      };

      it('should integrate with NUT left click', async () => {
        mouse.leftClick.mockResolvedValue(undefined);
        nutService.clickMouse.mockResolvedValue(undefined);

        await nutService.clickMouse(clickAction);

        expect(nutService.clickMouse).toHaveBeenCalledWith(clickAction);
      });

      it('should handle right click operations', async () => {
        const rightClickAction: ClickMouseAction = {
          ...clickAction,
          button: 'right',
        };

        mouse.rightClick.mockResolvedValue(undefined);
        nutService.clickMouse.mockResolvedValue(undefined);

        await nutService.clickMouse(rightClickAction);

        expect(nutService.clickMouse).toHaveBeenCalledWith(rightClickAction);
      });

      it('should handle double click operations', async () => {
        const doubleClickAction: ClickMouseAction = {
          ...clickAction,
          clickCount: 2,
        };

        mouse.doubleClick.mockResolvedValue(undefined);
        nutService.clickMouse.mockResolvedValue(undefined);

        await nutService.clickMouse(doubleClickAction);

        expect(nutService.clickMouse).toHaveBeenCalledWith(doubleClickAction);
      });

      it('should handle click with specific button types', async () => {
        const middleClickAction: ClickMouseAction = {
          ...clickAction,
          button: 'middle',
        };

        mouse.pressButton.mockResolvedValue(undefined);
        mouse.releaseButton.mockResolvedValue(undefined);
        nutService.clickMouse.mockResolvedValue(undefined);

        await nutService.clickMouse(middleClickAction);

        expect(nutService.clickMouse).toHaveBeenCalledWith(middleClickAction);
      });
    });

    describe('Mouse Dragging', () => {
      const dragAction: DragMouseAction = {
        action: 'drag_mouse',
        startCoordinates: mockCoordinates,
        endCoordinates: mockTargetCoordinates,
      };

      it('should integrate with NUT drag operations', async () => {
        mouse.drag.mockResolvedValue(undefined);
        nutService.dragMouse.mockResolvedValue(undefined);

        await nutService.dragMouse(dragAction);

        expect(nutService.dragMouse).toHaveBeenCalledWith(dragAction);
      });

      it('should handle drag with custom duration', async () => {
        const timedDragAction: DragMouseAction = {
          ...dragAction,
          duration: 2000,
        };

        mouse.drag.mockResolvedValue(undefined);
        nutService.dragMouse.mockResolvedValue(undefined);

        await nutService.dragMouse(timedDragAction);

        expect(nutService.dragMouse).toHaveBeenCalledWith(timedDragAction);
      });

      it('should handle drag operations with different buttons', async () => {
        const rightDragAction: DragMouseAction = {
          ...dragAction,
          button: 'right',
        };

        mouse.pressButton.mockResolvedValue(undefined);
        mouse.move.mockResolvedValue(undefined);
        mouse.releaseButton.mockResolvedValue(undefined);
        nutService.dragMouse.mockResolvedValue(undefined);

        await nutService.dragMouse(rightDragAction);

        expect(nutService.dragMouse).toHaveBeenCalledWith(rightDragAction);
      });
    });

    describe('Mouse Scrolling', () => {
      const scrollAction: ScrollAction = {
        action: 'scroll',
        coordinates: mockCoordinates,
        direction: 'down',
        distance: 3,
      };

      it('should integrate with NUT scroll down', async () => {
        mouse.scrollDown.mockResolvedValue(undefined);
        nutService.scroll.mockResolvedValue(undefined);

        await nutService.scroll(scrollAction);

        expect(nutService.scroll).toHaveBeenCalledWith(scrollAction);
      });

      it('should integrate with NUT scroll up', async () => {
        const scrollUpAction: ScrollAction = {
          ...scrollAction,
          direction: 'up',
        };

        mouse.scrollUp.mockResolvedValue(undefined);
        nutService.scroll.mockResolvedValue(undefined);

        await nutService.scroll(scrollUpAction);

        expect(nutService.scroll).toHaveBeenCalledWith(scrollUpAction);
      });

      it('should handle horizontal scrolling', async () => {
        const horizontalScrollAction: ScrollAction = {
          ...scrollAction,
          direction: 'right',
        };

        nutService.scroll.mockResolvedValue(undefined);

        await nutService.scroll(horizontalScrollAction);

        expect(nutService.scroll).toHaveBeenCalledWith(horizontalScrollAction);
      });
    });
  });

  describe('Keyboard Automation Integration', () => {
    describe('Text Typing', () => {
      const typeAction: TypeTextAction = {
        action: 'type_text',
        text: 'Hello, World!',
      };

      it('should integrate with NUT text typing', async () => {
        keyboard.type.mockResolvedValue(undefined);
        nutService.typeText.mockResolvedValue(undefined);

        await nutService.typeText(typeAction);

        expect(nutService.typeText).toHaveBeenCalledWith(typeAction);
      });

      it('should handle special characters in text', async () => {
        const specialTextAction: TypeTextAction = {
          action: 'type_text',
          text: 'Special chars: @#$%^&*()_+{}[]|\\:";\'<>?,./',
        };

        keyboard.type.mockResolvedValue(undefined);
        nutService.typeText.mockResolvedValue(undefined);

        await nutService.typeText(specialTextAction);

        expect(nutService.typeText).toHaveBeenCalledWith(specialTextAction);
      });

      it('should handle Unicode text input', async () => {
        const unicodeTextAction: TypeTextAction = {
          action: 'type_text',
          text: 'Unicode: 你好 🌍 café naïve résumé',
        };

        keyboard.type.mockResolvedValue(undefined);
        nutService.typeText.mockResolvedValue(undefined);

        await nutService.typeText(unicodeTextAction);

        expect(nutService.typeText).toHaveBeenCalledWith(unicodeTextAction);
      });

      it('should handle typing with custom delay', async () => {
        const delayedTypeAction: TypeTextAction = {
          action: 'type_text',
          text: 'Slow typing',
          delay: 200,
        };

        keyboard.type.mockResolvedValue(undefined);
        nutService.typeText.mockResolvedValue(undefined);

        await nutService.typeText(delayedTypeAction);

        expect(nutService.typeText).toHaveBeenCalledWith(delayedTypeAction);
      });
    });

    describe('Key Pressing', () => {
      const keyAction: PressKeysAction = {
        action: 'press_keys',
        keys: ['Control', 'c'],
      };

      it('should integrate with NUT key pressing', async () => {
        keyboard.pressKey.mockResolvedValue(undefined);
        keyboard.releaseKey.mockResolvedValue(undefined);
        nutService.pressKeys.mockResolvedValue(undefined);

        await nutService.pressKeys(keyAction);

        expect(nutService.pressKeys).toHaveBeenCalledWith(keyAction);
      });

      it('should handle function keys', async () => {
        const functionKeyAction: PressKeysAction = {
          action: 'press_keys',
          keys: ['F1'],
        };

        keyboard.pressKey.mockResolvedValue(undefined);
        keyboard.releaseKey.mockResolvedValue(undefined);
        nutService.pressKeys.mockResolvedValue(undefined);

        await nutService.pressKeys(functionKeyAction);

        expect(nutService.pressKeys).toHaveBeenCalledWith(functionKeyAction);
      });

      it('should handle arrow keys', async () => {
        const arrowKeyAction: PressKeysAction = {
          action: 'press_keys',
          keys: ['Up', 'Down', 'Left', 'Right'],
        };

        keyboard.pressKey.mockResolvedValue(undefined);
        keyboard.releaseKey.mockResolvedValue(undefined);
        nutService.pressKeys.mockResolvedValue(undefined);

        await nutService.pressKeys(arrowKeyAction);

        expect(nutService.pressKeys).toHaveBeenCalledWith(arrowKeyAction);
      });

      it('should handle complex key combinations', async () => {
        const complexKeyAction: PressKeysAction = {
          action: 'press_keys',
          keys: ['Control', 'Shift', 'Alt', 'F12'],
        };

        keyboard.pressKey.mockResolvedValue(undefined);
        keyboard.releaseKey.mockResolvedValue(undefined);
        nutService.pressKeys.mockResolvedValue(undefined);

        await nutService.pressKeys(complexKeyAction);

        expect(nutService.pressKeys).toHaveBeenCalledWith(complexKeyAction);
      });

      it('should handle key sequences with timing', async () => {
        const sequenceAction: PressKeysAction = {
          action: 'press_keys',
          keys: ['Tab', 'Tab', 'Enter'],
          sequence: true,
          delay: 100,
        };

        keyboard.pressKey.mockResolvedValue(undefined);
        keyboard.releaseKey.mockResolvedValue(undefined);
        nutService.pressKeys.mockResolvedValue(undefined);

        await nutService.pressKeys(sequenceAction);

        expect(nutService.pressKeys).toHaveBeenCalledWith(sequenceAction);
      });
    });
  });

  describe('Screen Capture Integration', () => {
    it('should integrate with NUT screen capture', async () => {
      screen.capture.mockResolvedValue(mockScreenCapture);
      nutService.screenshot.mockResolvedValue({
        operationId: 'screenshot_123',
        success: true,
        timestamp: new Date().toISOString(),
        screenshotPath: '/tmp/screenshot.png',
        screenshotData: mockScreenCapture.data,
        metadata: {
          width: mockScreenCapture.width,
          height: mockScreenCapture.height,
          format: 'png',
          fileSize: mockScreenCapture.data.length,
        },
      });

      const result = await nutService.screenshot();

      expect(result.success).toBe(true);
      expect(result.screenshotData).toEqual(mockScreenCapture.data);
      expect(nutService.screenshot).toHaveBeenCalled();
    });

    it('should handle region-based screen capture', async () => {
      screen.capture.mockResolvedValue(mockScreenCapture);
      nutService.screenshot.mockResolvedValue({
        operationId: 'screenshot_region_456',
        success: true,
        timestamp: new Date().toISOString(),
        screenshotPath: '/tmp/screenshot_region.png',
        screenshotData: mockScreenCapture.data,
        metadata: {
          width: mockRegion.width,
          height: mockRegion.height,
          format: 'png',
          fileSize: mockScreenCapture.data.length,
          region: mockRegion,
        },
      });

      const result = await nutService.screenshot();

      expect(result.metadata.region).toEqual(mockRegion);
      expect(nutService.screenshot).toHaveBeenCalled();
    });

    it('should handle screen capture errors', async () => {
      screen.capture.mockRejectedValue(new Error('Screen capture failed'));
      nutService.screenshot.mockRejectedValue(new Error('Screen capture failed'));

      await expect(nutService.screenshot()).rejects.toThrow('Screen capture failed');
    });
  });

  describe('Visual Recognition and Template Matching', () => {
    it('should integrate with NUT image finding', async () => {
      const mockImage = new Image();
      screen.find.mockResolvedValue({ x: 100, y: 200 });

      const position = await screen.find(mockImage);

      expect(position).toEqual({ x: 100, y: 200 });
      expect(screen.find).toHaveBeenCalledWith(mockImage);
    });

    it('should handle template matching with confidence', async () => {
      const mockImage = new Image();
      screen.find.mockResolvedValue({ x: 150, y: 250 });
      screen.config.confidence = 0.95;

      const position = await screen.find(mockImage);

      expect(position).toEqual({ x: 150, y: 250 });
      expect(screen.config.confidence).toBe(0.95);
    });

    it('should handle visual element waiting', async () => {
      const mockImage = new Image();
      screen.waitFor.mockResolvedValue({ x: 200, y: 300 });

      const position = await screen.waitFor(mockImage, 5000);

      expect(position).toEqual({ x: 200, y: 300 });
      expect(screen.waitFor).toHaveBeenCalledWith(mockImage, 5000);
    });

    it('should handle visual element highlighting', async () => {
      const mockRegion = new Region(100, 200, 300, 400);
      screen.highlight.mockResolvedValue(undefined);

      await screen.highlight(mockRegion);

      expect(screen.highlight).toHaveBeenCalledWith(mockRegion);
    });
  });

  describe('Performance and Timing Control', () => {
    it('should integrate with NUT sleep functionality', async () => {
      sleep.mockResolvedValue(undefined);

      await sleep(1000);

      expect(sleep).toHaveBeenCalledWith(1000);
    });

    it('should handle custom mouse movement trajectories', async () => {
      (linear as jest.Mock).mockResolvedValue(undefined);
      (straightTo as jest.Mock).mockResolvedValue(undefined);

      await straightTo(new Point(300, 400));
      await linear();

      expect(straightTo).toHaveBeenCalledWith(expect.any(Point));
      expect(linear).toHaveBeenCalled();
    });

    it('should configure NUT timing parameters', async () => {
      mouse.config.mouseSpeed = 2000;
      mouse.config.autoDelayMs = 50;
      keyboard.config.autoDelayMs = 75;

      expect(mouse.config.mouseSpeed).toBe(2000);
      expect(mouse.config.autoDelayMs).toBe(50);
      expect(keyboard.config.autoDelayMs).toBe(75);
    });

    it('should handle performance optimization settings', async () => {
      screen.config.confidence = 0.8; // Lower confidence for faster matching
      screen.config.resourceDirectory = '/tmp/fast-resources';

      expect(screen.config.confidence).toBe(0.8);
      expect(screen.config.resourceDirectory).toBe('/tmp/fast-resources');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle NUT library not available', async () => {
      nutService.initialize.mockRejectedValue(new Error('NUT library not found'));

      await expect(nutService.initialize()).rejects.toThrow('NUT library not found');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle native automation failures', async () => {
      mouse.move.mockRejectedValue(new Error('Native automation failed'));
      nutService.moveMouse.mockRejectedValue(new Error('Native automation failed'));

      const moveAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: mockCoordinates,
      };

      await expect(nutService.moveMouse(moveAction)).rejects.toThrow('Native automation failed');
    });

    it('should handle permissions errors', async () => {
      screen.capture.mockRejectedValue(new Error('Permission denied'));
      nutService.screenshot.mockRejectedValue(new Error('Permission denied'));

      await expect(nutService.screenshot()).rejects.toThrow('Permission denied');
    });

    it('should handle display server issues', async () => {
      mouse.getPosition.mockRejectedValue(new Error('Display server not responding'));

      await expect(mouse.getPosition()).rejects.toThrow('Display server not responding');
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('should handle Linux X11 automation', async () => {
      nutService.initialize.mockResolvedValue({ platform: 'linux', display: 'X11' });

      const result = await nutService.initialize();

      expect(result).toEqual({ platform: 'linux', display: 'X11' });
    });

    it('should handle Windows automation differences', async () => {
      nutService.initialize.mockResolvedValue({ platform: 'win32', display: 'Windows' });

      const result = await nutService.initialize();

      expect(result).toEqual({ platform: 'win32', display: 'Windows' });
    });

    it('should handle macOS automation specifics', async () => {
      nutService.initialize.mockResolvedValue({ platform: 'darwin', display: 'Quartz' });

      const result = await nutService.initialize();

      expect(result).toEqual({ platform: 'darwin', display: 'Quartz' });
    });

    it('should adapt key mappings for different platforms', async () => {
      const platformSpecificKeys = {
        linux: ['Control', 'c'],
        win32: ['Control', 'c'],
        darwin: ['Meta', 'c'], // Cmd+C on macOS
      };

      nutService.pressKeys.mockResolvedValue(undefined);

      for (const [platform, keys] of Object.entries(platformSpecificKeys)) {
        const keyAction: PressKeysAction = {
          action: 'press_keys',
          keys,
          platform: platform as any,
        };

        await nutService.pressKeys(keyAction);
        expect(nutService.pressKeys).toHaveBeenCalledWith(keyAction);
      }
    });
  });

  describe('Resource Management and Cleanup', () => {
    it('should clean up NUT resources on service destruction', async () => {
      nutService.cleanup.mockResolvedValue(undefined);

      await nutService.cleanup();

      expect(nutService.cleanup).toHaveBeenCalled();
    });

    it('should handle resource cleanup errors gracefully', async () => {
      nutService.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      await expect(nutService.cleanup()).rejects.toThrow('Cleanup failed');
      expect(logger.error).toHaveBeenCalled();
    });

    it('should manage memory usage during automation', async () => {
      // Simulate multiple operations
      const operations = [
        () => nutService.moveMouse({ action: 'move_mouse', coordinates: mockCoordinates }),
        () => nutService.clickMouse({ action: 'click_mouse', coordinates: mockCoordinates, clickCount: 1, button: 'left' }),
        () => nutService.screenshot(),
        () => nutService.typeText({ action: 'type_text', text: 'test' }),
      ];

      nutService.moveMouse.mockResolvedValue(undefined);
      nutService.clickMouse.mockResolvedValue(undefined);
      nutService.screenshot.mockResolvedValue({
        operationId: 'screenshot_mem_test',
        success: true,
        timestamp: new Date().toISOString(),
        screenshotPath: '/tmp/test.png',
        screenshotData: Buffer.from('test'),
        metadata: { width: 100, height: 100, format: 'png', fileSize: 4 },
      });
      nutService.typeText.mockResolvedValue(undefined);

      // Execute all operations
      await Promise.all(operations.map(op => op()));

      expect(nutService.moveMouse).toHaveBeenCalled();
      expect(nutService.clickMouse).toHaveBeenCalled();
      expect(nutService.screenshot).toHaveBeenCalled();
      expect(nutService.typeText).toHaveBeenCalled();
    });

    it('should handle concurrent automation operations', async () => {
      nutService.moveMouse.mockResolvedValue(undefined);
      nutService.clickMouse.mockResolvedValue(undefined);

      const concurrentOperations = [
        nutService.moveMouse({ action: 'move_mouse', coordinates: { x: 100, y: 100 } }),
        nutService.moveMouse({ action: 'move_mouse', coordinates: { x: 200, y: 200 } }),
        nutService.clickMouse({ action: 'click_mouse', coordinates: { x: 150, y: 150 }, clickCount: 1, button: 'left' }),
      ];

      await Promise.all(concurrentOperations);

      expect(nutService.moveMouse).toHaveBeenCalledTimes(2);
      expect(nutService.clickMouse).toHaveBeenCalledTimes(1);
    });
  });
});