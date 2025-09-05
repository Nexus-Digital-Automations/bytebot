/**
 * Comprehensive Unit Tests for ComputerUseService - Keyboard Operations Focus
 *
 * This test suite provides comprehensive coverage for keyboard-related operations in ComputerUseService:
 * - scroll: Mouse wheel scrolling with keyboard modifiers
 * - typeKeys: Sequential key typing with delay control
 * - pressKeys: Simultaneous key press/release operations
 * - typeText: Text input with character-by-character typing
 * - pasteText: Clipboard-based text insertion
 *
 * Features tested:
 * - Success scenarios with proper parameter validation
 * - Error handling and exception propagation
 * - External dependency mocking (NutService, child_process.exec)
 * - Performance monitoring and structured logging
 * - Parameter validation and edge case handling
 * - Key holding operations and cleanup on errors
 *
 * @author Claude Code
 * @version 1.0.0
 */

 
 

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ComputerUseService, ErrorHandler } from '../computer-use.service';
import { NutService } from '../../nut/nut.service';
import { CuaVisionService } from '../../cua-integration/cua-vision.service';
import { CuaIntegrationService } from '../../cua-integration/cua-integration.service';
import { CuaPerformanceService } from '../../cua-integration/cua-performance.service';
import {
  ScrollAction,
  TypeKeysAction,
  PressKeysAction,
  TypeTextAction,
  PasteTextAction,
  Coordinates,
} from '@bytebot/shared';

// Mock child_process module for external command execution
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
}));

// Mock fs/promises for file system operations
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
}));

/**
 * Mock implementations for all dependencies
 * Provides comprehensive control over external service behavior for testing
 */
const mockNutService = {
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
};

const mockCuaIntegrationService = {
  isFrameworkEnabled: jest.fn(),
};

const mockCuaVisionService = {
  performOcr: jest.fn(),
  detectText: jest.fn(),
};

const mockCuaPerformanceService = {
  recordMetric: jest.fn(),
};

/**
 * Test suite for ComputerUseService keyboard operations
 * Focuses on comprehensive testing of keyboard-related functionality
 */
describe('ComputerUseService - Keyboard Operations', () => {
  let service: ComputerUseService;
  let nutService: jest.Mocked<NutService>;

  // Spy on Logger methods for logging verification
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerWarnSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  /**
   * Test module setup with comprehensive dependency mocking
   * Establishes clean testing environment for each test
   */
  beforeEach(async () => {
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
    nutService = module.get(NutService);

    // Setup logger spies for comprehensive logging verification
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    loggerDebugSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

    // Configure C/ua framework as disabled by default
    mockCuaIntegrationService.isFrameworkEnabled.mockReturnValue(false);
  });

  /**
   * Cleanup after each test to ensure test isolation
   * Resets all mocks and clears spy call histories
   */
  afterEach(() => {
    jest.clearAllMocks();
    loggerLogSpy.mockRestore();
    loggerErrorSpy.mockRestore();
    loggerWarnSpy.mockRestore();
    loggerDebugSpy.mockRestore();
  });

  /**
   * SCROLL OPERATION TESTS
   * Comprehensive testing of scroll functionality including mouse positioning and key modifiers
   */
  describe('scroll operations', () => {
    const mockCoordinates: Coordinates = { x: 100, y: 200 };

    /**
     * Test successful scroll operation without coordinates
     * Verifies basic scrolling functionality and parameter validation
     */
    it('should perform basic scroll operation successfully', async () => {
      // Arrange: Setup successful scroll operation
      const scrollAction: ScrollAction = {
        action: 'scroll',
        direction: 'down',
        scrollCount: 3,
      };

      nutService.mouseWheelEvent.mockResolvedValue(undefined);

      // Act: Execute scroll operation
      await service.action(scrollAction);

      // Assert: Verify correct NutService calls and logging
      expect(nutService.mouseWheelEvent).toHaveBeenCalledTimes(3);
      expect(nutService.mouseWheelEvent).toHaveBeenCalledWith('down', 1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[scroll_\d+_\w+\] Performing scroll operation/),
        expect.objectContaining({
          hasCoordinates: false,
          direction: 'down',
          scrollCount: 3,
          hasHoldKeys: false,
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[scroll_\d+_\w+\] Scroll operation completed successfully/,
        ),
      );
    });

    /**
     * Test scroll operation with coordinate positioning
     * Verifies mouse movement before scrolling
     */
    it('should perform scroll operation with coordinate positioning', async () => {
      // Arrange: Setup scroll with coordinates
      const scrollAction: ScrollAction = {
        action: 'scroll',
        coordinates: mockCoordinates,
        direction: 'up',
        scrollCount: 2,
      };

      nutService.mouseMoveEvent.mockResolvedValue(undefined);
      nutService.mouseWheelEvent.mockResolvedValue(undefined);

      // Act: Execute scroll with coordinates
      await service.action(scrollAction);

      // Assert: Verify mouse movement and scrolling
      expect(nutService.mouseMoveEvent).toHaveBeenCalledWith(mockCoordinates);
      expect(nutService.mouseWheelEvent).toHaveBeenCalledTimes(2);
      expect(nutService.mouseWheelEvent).toHaveBeenCalledWith('up', 1);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[scroll_\d+_\w+\] Moving to scroll coordinates/,
        ),
        mockCoordinates,
      );
    });

    /**
     * Test scroll operation with key modifiers (e.g., Ctrl+scroll for zoom)
     * Verifies proper key holding and release sequence
     */
    it('should perform scroll operation with key modifiers', async () => {
      // Arrange: Setup scroll with hold keys
      const scrollAction: ScrollAction = {
        action: 'scroll',
        coordinates: mockCoordinates,
        direction: 'up',
        scrollCount: 1,
        holdKeys: ['ctrl', 'shift'],
      };

      nutService.mouseMoveEvent.mockResolvedValue(undefined);
      nutService.holdKeys.mockResolvedValue(undefined);
      nutService.mouseWheelEvent.mockResolvedValue(undefined);

      // Act: Execute scroll with modifiers
      await service.action(scrollAction);

      // Assert: Verify key holding sequence
      expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl', 'shift'], true);
      expect(nutService.mouseWheelEvent).toHaveBeenCalledWith('up', 1);
      expect(nutService.holdKeys).toHaveBeenCalledWith(
        ['ctrl', 'shift'],
        false,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[scroll_\d+_\w+\] Holding keys: ctrl, shift/),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[scroll_\d+_\w+\] Releasing held keys/),
      );
    });

    /**
     * Test scroll count boundary validation
     * Verifies automatic adjustment of extreme scroll values
     */
    it('should adjust scroll count to reasonable limits', async () => {
      // Arrange: Setup scroll with excessive count
      const scrollAction: ScrollAction = {
        action: 'scroll',
        direction: 'down',
        scrollCount: 100, // Should be limited to 50
      };

      nutService.mouseWheelEvent.mockResolvedValue(undefined);

      // Act: Execute scroll with high count
      await service.action(scrollAction);

      // Assert: Verify count was limited and warning logged
      expect(nutService.mouseWheelEvent).toHaveBeenCalledTimes(50);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[scroll_\d+_\w+\] Scroll count adjusted from 100 to 50/,
        ),
      );
    });

    /**
     * Test error handling during scroll operation
     * Verifies proper key cleanup when errors occur
     */
    it('should handle scroll errors and cleanup held keys', async () => {
      // Arrange: Setup scroll operation that fails
      const scrollAction: ScrollAction = {
        action: 'scroll',
        direction: 'down',
        scrollCount: 1,
        holdKeys: ['ctrl'],
      };

      const errorMessage = 'Mouse wheel event failed';
      nutService.holdKeys.mockResolvedValue(undefined);
      nutService.mouseWheelEvent.mockRejectedValue(new Error(errorMessage));

      // Act & Assert: Verify error is thrown
      await expect(service.action(scrollAction)).rejects.toThrow(
        `Failed to execute scroll: ${errorMessage}`,
      );

      // Assert: Verify key cleanup was attempted
      expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], true);
      expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl'], false);
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[scroll_\d+_\w+\] Scroll operation failed: Mouse wheel event failed/,
        ),
        expect.objectContaining({
          holdKeys: ['ctrl'],
          error: errorMessage,
          operationId: expect.any(String),
        }),
      );
    });

    /**
     * Test scroll operation with different directions
     * Verifies support for all scroll directions
     */
    it.each(['up', 'down', 'left', 'right'] as const)(
      'should handle %s scroll direction',
      async (direction) => {
        // Arrange: Setup scroll in specific direction
        const scrollAction: ScrollAction = {
          action: 'scroll',
          direction,
          scrollCount: 1,
        };

        nutService.mouseWheelEvent.mockResolvedValue(undefined);

        // Act: Execute scroll in direction
        await service.action(scrollAction);

        // Assert: Verify correct direction parameter
        expect(nutService.mouseWheelEvent).toHaveBeenCalledWith(direction, 1);
      },
    );
  });

  /**
   * TYPE KEYS OPERATION TESTS
   * Comprehensive testing of sequential key typing functionality
   */
  describe('typeKeys operations', () => {
    /**
     * Test basic key typing without delay
     * Verifies sequential key sending functionality
     */
    it('should perform basic key typing successfully', async () => {
      // Arrange: Setup key typing operation
      const typeKeysAction: TypeKeysAction = {
        action: 'type_keys',
        keys: ['h', 'e', 'l', 'l', 'o'],
      };

      nutService.sendKeys.mockResolvedValue(undefined);

      // Act: Execute key typing
      await service.action(typeKeysAction);

      // Assert: Verify correct NutService call and logging
      expect(nutService.sendKeys).toHaveBeenCalledWith(
        ['h', 'e', 'l', 'l', 'o'],
        undefined,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_keys_\d+_\w+\] Typing key sequence/),
        expect.objectContaining({
          keyCount: 5,
          hasDelay: false,
          delayMs: undefined,
          keys: 'h, e, l, l, o',
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[type_keys_\d+_\w+\] Key typing completed successfully/,
        ),
      );
    });

    /**
     * Test key typing with custom delay between keystrokes
     * Verifies timing control functionality
     */
    it('should perform key typing with custom delay', async () => {
      // Arrange: Setup key typing with delay
      const typeKeysAction: TypeKeysAction = {
        action: 'type_keys',
        keys: ['a', 'b', 'c'],
        delay: 100,
      };

      nutService.sendKeys.mockResolvedValue(undefined);

      // Act: Execute key typing with delay
      await service.action(typeKeysAction);

      // Assert: Verify delay parameter passed
      expect(nutService.sendKeys).toHaveBeenCalledWith(['a', 'b', 'c'], 100);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_keys_\d+_\w+\] Typing key sequence/),
        expect.objectContaining({
          keyCount: 3,
          hasDelay: true,
          delayMs: 100,
        }),
      );
    });

    /**
     * Test typing special keys and key combinations
     * Verifies support for modifier keys and special characters
     */
    it('should handle special keys and modifiers', async () => {
      // Arrange: Setup special key typing
      const typeKeysAction: TypeKeysAction = {
        action: 'type_keys',
        keys: ['ctrl+c', 'alt+tab', 'escape', 'enter'],
      };

      nutService.sendKeys.mockResolvedValue(undefined);

      // Act: Execute special key typing
      await service.action(typeKeysAction);

      // Assert: Verify special keys are passed correctly
      expect(nutService.sendKeys).toHaveBeenCalledWith(
        ['ctrl+c', 'alt+tab', 'escape', 'enter'],
        undefined,
      );
    });

    /**
     * Test error handling during key typing
     * Verifies proper error propagation and logging
     */
    it('should handle key typing errors', async () => {
      // Arrange: Setup key typing that fails
      const typeKeysAction: TypeKeysAction = {
        action: 'type_keys',
        keys: ['test'],
        delay: 50,
      };

      const errorMessage = 'Key sending failed';
      nutService.sendKeys.mockRejectedValue(new Error(errorMessage));

      // Act & Assert: Verify error is thrown
      await expect(service.action(typeKeysAction)).rejects.toThrow(
        `Failed to execute type_keys: ${errorMessage}`,
      );

      // Assert: Verify error logging
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[type_keys_\d+_\w+\] Key typing failed: Key sending failed/,
        ),
        expect.objectContaining({
          keys: ['test'],
          delay: 50,
          error: errorMessage,
        }),
      );
    });

    /**
     * Test typing empty key array
     * Verifies handling of edge case with no keys
     */
    it('should handle empty key array', async () => {
      // Arrange: Setup empty key array
      const typeKeysAction: TypeKeysAction = {
        action: 'type_keys',
        keys: [],
      };

      nutService.sendKeys.mockResolvedValue(undefined);

      // Act: Execute empty key typing
      await service.action(typeKeysAction);

      // Assert: Verify empty array is passed
      expect(nutService.sendKeys).toHaveBeenCalledWith([], undefined);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_keys_\d+_\w+\] Typing key sequence/),
        expect.objectContaining({
          keyCount: 0,
          keys: '',
        }),
      );
    });
  });

  /**
   * PRESS KEYS OPERATION TESTS
   * Comprehensive testing of simultaneous key press/release functionality
   */
  describe('pressKeys operations', () => {
    /**
     * Test basic key press operation
     * Verifies simultaneous key pressing functionality
     */
    it('should perform key press operation successfully', async () => {
      // Arrange: Setup key press operation
      const pressKeysAction: PressKeysAction = {
        action: 'press_keys',
        keys: ['ctrl', 'shift'],
        press: 'down',
      };

      nutService.holdKeys.mockResolvedValue(undefined);

      // Act: Execute key press
      await service.action(pressKeysAction);

      // Assert: Verify correct NutService call and logging
      expect(nutService.holdKeys).toHaveBeenCalledWith(['ctrl', 'shift'], true);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[press_keys_\d+_\w+\] Pressing keys/),
        expect.objectContaining({
          keys: 'ctrl, shift',
          press: 'down',
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[press_keys_\d+_\w+\] Key down operation completed successfully/,
        ),
      );
    });

    /**
     * Test key release operation
     * Verifies simultaneous key releasing functionality
     */
    it('should perform key release operation successfully', async () => {
      // Arrange: Setup key release operation
      const pressKeysAction: PressKeysAction = {
        action: 'press_keys',
        keys: ['alt', 'f4'],
        press: 'up',
      };

      nutService.holdKeys.mockResolvedValue(undefined);

      // Act: Execute key release
      await service.action(pressKeysAction);

      // Assert: Verify correct release call
      expect(nutService.holdKeys).toHaveBeenCalledWith(['alt', 'f4'], false);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[press_keys_\d+_\w+\] Releasing keys/),
        expect.objectContaining({
          keys: 'alt, f4',
          press: 'up',
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[press_keys_\d+_\w+\] Key up operation completed successfully/,
        ),
      );
    });

    /**
     * Test single key press
     * Verifies functionality with single key operations
     */
    it('should handle single key press', async () => {
      // Arrange: Setup single key press
      const pressKeysAction: PressKeysAction = {
        action: 'press_keys',
        keys: ['space'],
        press: 'down',
      };

      nutService.holdKeys.mockResolvedValue(undefined);

      // Act: Execute single key press
      await service.action(pressKeysAction);

      // Assert: Verify single key handling
      expect(nutService.holdKeys).toHaveBeenCalledWith(['space'], true);
    });

    /**
     * Test error handling during key press operations
     * Verifies proper error propagation
     */
    it('should handle key press errors', async () => {
      // Arrange: Setup key press that fails
      const pressKeysAction: PressKeysAction = {
        action: 'press_keys',
        keys: ['invalid_key'],
        press: 'down',
      };

      const errorMessage = 'Key press failed';
      nutService.holdKeys.mockRejectedValue(new Error(errorMessage));

      // Act & Assert: Verify error is thrown
      await expect(service.action(pressKeysAction)).rejects.toThrow(
        `Failed to execute press_keys: ${errorMessage}`,
      );

      // Assert: Verify error logging
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[press_keys_\d+_\w+\] Key down operation failed: Key press failed/,
        ),
        expect.objectContaining({
          keys: ['invalid_key'],
          press: 'down',
          error: errorMessage,
        }),
      );
    });

    /**
     * Test empty keys array handling
     * Verifies edge case with no keys specified
     */
    it('should handle empty keys array', async () => {
      // Arrange: Setup empty keys array
      const pressKeysAction: PressKeysAction = {
        action: 'press_keys',
        keys: [],
        press: 'down',
      };

      nutService.holdKeys.mockResolvedValue(undefined);

      // Act: Execute empty key press
      await service.action(pressKeysAction);

      // Assert: Verify empty array is handled
      expect(nutService.holdKeys).toHaveBeenCalledWith([], true);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[press_keys_\d+_\w+\] Pressing keys/),
        expect.objectContaining({
          keys: '',
          press: 'down',
        }),
      );
    });
  });

  /**
   * TYPE TEXT OPERATION TESTS
   * Comprehensive testing of character-by-character text input
   */
  describe('typeText operations', () => {
    /**
     * Test basic text typing without delay
     * Verifies text input functionality
     */
    it('should perform basic text typing successfully', async () => {
      // Arrange: Setup text typing operation
      const typeTextAction: TypeTextAction = {
        action: 'type_text',
        text: 'Hello, World!',
      };

      nutService.typeText.mockResolvedValue(undefined);

      // Act: Execute text typing
      await service.action(typeTextAction);

      // Assert: Verify correct NutService call and logging
      expect(nutService.typeText).toHaveBeenCalledWith(
        'Hello, World!',
        undefined,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_text_\d+_\w+\] Typing text/),
        expect.objectContaining({
          textLength: 13,
          hasDelay: false,
          delayMs: undefined,
          isSensitive: undefined,
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[type_text_\d+_\w+\] Text typing completed successfully/,
        ),
      );
    });

    /**
     * Test text typing with custom delay between characters
     * Verifies character timing control
     */
    it('should perform text typing with custom delay', async () => {
      // Arrange: Setup text typing with delay
      const typeTextAction: TypeTextAction = {
        action: 'type_text',
        text: 'Slow typing',
        delay: 200,
      };

      nutService.typeText.mockResolvedValue(undefined);

      // Act: Execute text typing with delay
      await service.action(typeTextAction);

      // Assert: Verify delay parameter passed
      expect(nutService.typeText).toHaveBeenCalledWith('Slow typing', 200);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_text_\d+_\w+\] Typing text/),
        expect.objectContaining({
          textLength: 11,
          hasDelay: true,
          delayMs: 200,
        }),
      );
    });

    /**
     * Test sensitive text typing (passwords, etc.)
     * Verifies sensitive data handling and logging
     */
    it('should handle sensitive text typing', async () => {
      // Arrange: Setup sensitive text typing
      const typeTextAction: TypeTextAction = {
        action: 'type_text',
        text: 'secretpassword123',
        sensitive: true,
      };

      nutService.typeText.mockResolvedValue(undefined);

      // Act: Execute sensitive text typing
      await service.action(typeTextAction);

      // Assert: Verify sensitive flag in logging
      expect(nutService.typeText).toHaveBeenCalledWith(
        'secretpassword123',
        undefined,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_text_\d+_\w+\] Typing text/),
        expect.objectContaining({
          textLength: 17,
          isSensitive: true,
        }),
      );
    });

    /**
     * Test typing special characters and unicode
     * Verifies support for complex character sets
     */
    it('should handle special characters and unicode', async () => {
      // Arrange: Setup special character typing
      const typeTextAction: TypeTextAction = {
        action: 'type_text',
        text: '!@#$%^&*()_+-={}|[]\\:";\'<>?,./',
      };

      nutService.typeText.mockResolvedValue(undefined);

      // Act: Execute special character typing
      await service.action(typeTextAction);

      // Assert: Verify special characters are passed correctly
      expect(nutService.typeText).toHaveBeenCalledWith(
        '!@#$%^&*()_+-={}|[]\\:";\'<>?,./',
        undefined,
      );
    });

    /**
     * Test typing multiline text
     * Verifies handling of text with newline characters
     */
    it('should handle multiline text', async () => {
      // Arrange: Setup multiline text typing
      const multilineText = 'Line 1\nLine 2\nLine 3';
      const typeTextAction: TypeTextAction = {
        action: 'type_text',
        text: multilineText,
      };

      nutService.typeText.mockResolvedValue(undefined);

      // Act: Execute multiline text typing
      await service.action(typeTextAction);

      // Assert: Verify multiline text handling
      expect(nutService.typeText).toHaveBeenCalledWith(
        multilineText,
        undefined,
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_text_\d+_\w+\] Typing text/),
        expect.objectContaining({
          textLength: 20,
        }),
      );
    });

    /**
     * Test error handling during text typing
     * Verifies proper error propagation and logging
     */
    it('should handle text typing errors', async () => {
      // Arrange: Setup text typing that fails
      const typeTextAction: TypeTextAction = {
        action: 'type_text',
        text: 'Error test',
        delay: 50,
      };

      const errorMessage = 'Text typing failed';
      nutService.typeText.mockRejectedValue(new Error(errorMessage));

      // Act & Assert: Verify error is thrown
      await expect(service.action(typeTextAction)).rejects.toThrow(
        `Failed to execute type_text: ${errorMessage}`,
      );

      // Assert: Verify error logging (sensitive data excluded)
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[type_text_\d+_\w+\] Text typing failed: Text typing failed/,
        ),
        expect.objectContaining({
          textLength: 10,
          delay: 50,
          error: errorMessage,
        }),
      );
    });

    /**
     * Test typing empty text
     * Verifies edge case with empty string
     */
    it('should handle empty text', async () => {
      // Arrange: Setup empty text typing
      const typeTextAction: TypeTextAction = {
        action: 'type_text',
        text: '',
      };

      nutService.typeText.mockResolvedValue(undefined);

      // Act: Execute empty text typing
      await service.action(typeTextAction);

      // Assert: Verify empty string is handled
      expect(nutService.typeText).toHaveBeenCalledWith('', undefined);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[type_text_\d+_\w+\] Typing text/),
        expect.objectContaining({
          textLength: 0,
        }),
      );
    });
  });

  /**
   * PASTE TEXT OPERATION TESTS
   * Comprehensive testing of clipboard-based text insertion
   */
  describe('pasteText operations', () => {
    /**
     * Test basic text pasting
     * Verifies clipboard-based text insertion
     */
    it('should perform basic text pasting successfully', async () => {
      // Arrange: Setup text pasting operation
      const pasteTextAction: PasteTextAction = {
        action: 'paste_text',
        text: 'Clipboard content',
      };

      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute text pasting
      await service.action(pasteTextAction);

      // Assert: Verify correct NutService call and logging
      expect(nutService.pasteText).toHaveBeenCalledWith('Clipboard content');
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[paste_text_\d+_\w+\] Pasting text/),
        expect.objectContaining({
          textLength: 17,
        }),
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[paste_text_\d+_\w+\] Text pasting completed successfully/,
        ),
      );
    });

    /**
     * Test pasting large text content
     * Verifies handling of substantial clipboard content
     */
    it('should handle large text content pasting', async () => {
      // Arrange: Setup large text pasting
      const largeText = 'A'.repeat(10000); // 10KB of text
      const pasteTextAction: PasteTextAction = {
        action: 'paste_text',
        text: largeText,
      };

      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute large text pasting
      await service.action(pasteTextAction);

      // Assert: Verify large text handling
      expect(nutService.pasteText).toHaveBeenCalledWith(largeText);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[paste_text_\d+_\w+\] Pasting text/),
        expect.objectContaining({
          textLength: 10000,
        }),
      );
    });

    /**
     * Test pasting text with special formatting
     * Verifies handling of formatted text content
     */
    it('should handle formatted text pasting', async () => {
      // Arrange: Setup formatted text pasting
      const formattedText =
        '<html><body>Formatted <b>text</b> content</body></html>';
      const pasteTextAction: PasteTextAction = {
        action: 'paste_text',
        text: formattedText,
      };

      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute formatted text pasting
      await service.action(pasteTextAction);

      // Assert: Verify formatted text is passed as-is
      expect(nutService.pasteText).toHaveBeenCalledWith(formattedText);
    });

    /**
     * Test pasting multiline content
     * Verifies handling of content with line breaks
     */
    it('should handle multiline content pasting', async () => {
      // Arrange: Setup multiline text pasting
      const multilineText = 'Line 1\nLine 2\r\nLine 3\nLine 4';
      const pasteTextAction: PasteTextAction = {
        action: 'paste_text',
        text: multilineText,
      };

      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute multiline text pasting
      await service.action(pasteTextAction);

      // Assert: Verify multiline text handling
      expect(nutService.pasteText).toHaveBeenCalledWith(multilineText);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[paste_text_\d+_\w+\] Pasting text/),
        expect.objectContaining({
          textLength: 28,
        }),
      );
    });

    /**
     * Test error handling during text pasting
     * Verifies proper error propagation and logging
     */
    it('should handle text pasting errors', async () => {
      // Arrange: Setup text pasting that fails
      const pasteTextAction: PasteTextAction = {
        action: 'paste_text',
        text: 'Error test content',
      };

      const errorMessage = 'Clipboard paste failed';
      nutService.pasteText.mockRejectedValue(new Error(errorMessage));

      // Act & Assert: Verify error is thrown
      await expect(service.action(pasteTextAction)).rejects.toThrow(
        `Failed to execute paste_text: ${errorMessage}`,
      );

      // Assert: Verify error logging
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[paste_text_\d+_\w+\] Text pasting failed: Clipboard paste failed/,
        ),
        expect.objectContaining({
          textLength: 18,
          error: errorMessage,
        }),
      );
    });

    /**
     * Test pasting empty text
     * Verifies edge case with empty clipboard content
     */
    it('should handle empty text pasting', async () => {
      // Arrange: Setup empty text pasting
      const pasteTextAction: PasteTextAction = {
        action: 'paste_text',
        text: '',
      };

      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute empty text pasting
      await service.action(pasteTextAction);

      // Assert: Verify empty string is handled
      expect(nutService.pasteText).toHaveBeenCalledWith('');
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[paste_text_\d+_\w+\] Pasting text/),
        expect.objectContaining({
          textLength: 0,
        }),
      );
    });

    /**
     * Test pasting text with unicode characters
     * Verifies support for international text content
     */
    it('should handle unicode text pasting', async () => {
      // Arrange: Setup unicode text pasting
      const unicodeText = '🚀 Hello 世界 🌍 Testing émojis and àccents';
      const pasteTextAction: PasteTextAction = {
        action: 'paste_text',
        text: unicodeText,
      };

      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute unicode text pasting
      await service.action(pasteTextAction);

      // Assert: Verify unicode text handling
      expect(nutService.pasteText).toHaveBeenCalledWith(unicodeText);
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[paste_text_\d+_\w+\] Pasting text/),
        expect.objectContaining({
          textLength: unicodeText.length,
        }),
      );
    });
  });

  /**
   * ERROR HANDLER UTILITY TESTS
   * Testing the ErrorHandler utility class used throughout keyboard operations
   */
  describe('ErrorHandler utility', () => {
    /**
     * Test error message extraction from Error objects
     */
    it('should extract error message from Error object', () => {
      const error = new Error('Test error message');
      const result = ErrorHandler.extractErrorMessage(error);
      expect(result).toBe('Test error message');
    });

    /**
     * Test error message extraction from string errors
     */
    it('should extract error message from string', () => {
      const error = 'String error message';
      const result = ErrorHandler.extractErrorMessage(error);
      expect(result).toBe('String error message');
    });

    /**
     * Test error message extraction from objects with message property
     */
    it('should extract error message from object with message property', () => {
      const error = { message: 'Object error message' };
      const result = ErrorHandler.extractErrorMessage(error);
      expect(result).toBe('Object error message');
    });

    /**
     * Test error stack extraction from Error objects
     */
    it('should extract error stack from Error object', () => {
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      const result = ErrorHandler.extractErrorStack(error);
      expect(result).toBe('Error stack trace');
    });

    /**
     * Test comprehensive error object creation
     */
    it('should create structured error object', () => {
      const originalError = new Error('Original error');
      const result = ErrorHandler.createError(
        'TEST_CODE',
        'Test message',
        'op123',
        { context: 'test' },
        originalError,
      );

      expect(result).toMatchObject({
        code: 'TEST_CODE',
        message: 'Test message',
        operationId: 'op123',
        context: { context: 'test' },
        originalError: originalError,
      });
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });

  /**
   * INTEGRATION TESTS
   * Testing keyboard operations in combination scenarios
   */
  describe('keyboard operation integration', () => {
    /**
     * Test sequential keyboard operations
     * Verifies proper state management across multiple operations
     */
    it('should handle sequential keyboard operations', async () => {
      // Arrange: Setup multiple keyboard operations
      nutService.sendKeys.mockResolvedValue(undefined);
      nutService.typeText.mockResolvedValue(undefined);
      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute sequential operations
      await service.action({
        action: 'type_keys',
        keys: ['ctrl', 'a'],
      });

      await service.action({
        action: 'type_text',
        text: 'New content',
      });

      await service.action({
        action: 'paste_text',
        text: 'Pasted content',
      });

      // Assert: Verify all operations were executed
      expect(nutService.sendKeys).toHaveBeenCalledWith(
        ['ctrl', 'a'],
        undefined,
      );
      expect(nutService.typeText).toHaveBeenCalledWith(
        'New content',
        undefined,
      );
      expect(nutService.pasteText).toHaveBeenCalledWith('Pasted content');
    });

    /**
     * Test keyboard operations with error recovery
     * Verifies system continues working after errors
     */
    it('should recover from errors in keyboard operations', async () => {
      // Arrange: Setup operations where first fails, second succeeds
      nutService.sendKeys
        .mockRejectedValueOnce(new Error('First operation failed'))
        .mockResolvedValueOnce(undefined);

      // Act: Execute operations with error recovery
      await expect(
        service.action({
          action: 'type_keys',
          keys: ['test'],
        }),
      ).rejects.toThrow();

      // Second operation should still work
      await expect(
        service.action({
          action: 'type_keys',
          keys: ['recovery'],
        }),
      ).resolves.toBeUndefined();

      // Assert: Verify both calls were made
      expect(nutService.sendKeys).toHaveBeenCalledTimes(2);
    });
  });

  /**
   * PERFORMANCE AND LOGGING TESTS
   * Verifying proper logging and performance tracking
   */
  describe('performance and logging', () => {
    /**
     * Test operation timing and performance logging
     * Verifies all operations include timing information
     */
    it('should include timing information in logs', async () => {
      // Arrange: Setup operation with controlled timing
      nutService.typeText.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      // Act: Execute operation with timing
      await service.action({
        action: 'type_text',
        text: 'Timing test',
      });

      // Assert: Verify timing is logged
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Computer action completed successfully/),
        expect.objectContaining({
          processingTimeMs: expect.any(Number),
        }),
      );
    });

    /**
     * Test structured logging for all keyboard operations
     * Verifies consistent logging format across operations
     */
    it('should use structured logging for all operations', async () => {
      // Arrange: Setup successful operations
      nutService.mouseWheelEvent.mockResolvedValue(undefined);
      nutService.sendKeys.mockResolvedValue(undefined);
      nutService.holdKeys.mockResolvedValue(undefined);
      nutService.typeText.mockResolvedValue(undefined);
      nutService.pasteText.mockResolvedValue(undefined);

      // Act: Execute all keyboard operation types
      const operations = [
        {
          action: 'scroll' as const,
          direction: 'down' as const,
          scrollCount: 1,
        },
        { action: 'type_keys' as const, keys: ['test'] },
        {
          action: 'press_keys' as const,
          keys: ['ctrl'],
          press: 'down' as const,
        },
        { action: 'type_text' as const, text: 'test' },
        { action: 'paste_text' as const, text: 'test' },
      ];

      for (const operation of operations) {
        await service.action(operation);
      }

      // Assert: Verify structured logging for all operations
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[.+\] Executing computer action: /),
        expect.objectContaining({
          operationId: expect.any(String),
          actionType: expect.any(String),
          timestamp: expect.any(String),
        }),
      );
    });
  });
});
