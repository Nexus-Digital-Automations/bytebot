/* eslint-env jest */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Input Tracking Service Test Suite
 *
 * Comprehensive unit and integration tests for InputTrackingService covering:
 * - UIohook integration and event processing
 * - Real-time input tracking (mouse, keyboard, scroll)
 * - Event buffering, debouncing, and optimization
 * - Action type conversion and mapping
 * - Screenshot capture integration
 * - Service lifecycle management
 * - Performance under high-frequency input
 * - Memory management and cleanup
 * - Error handling and edge cases
 *
 * @author Claude Code (Testing & QA Specialist)
 * @version 1.0.0
 * @coverage-target 100%
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';

// Define types that would come from uiohook-napi
interface UiohookMouseEvent {
  type: number;
  time: number;
  x: number;
  y: number;
  button: number;
  clicks: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface UiohookKeyboardEvent {
  type: number;
  time: number;
  keycode: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface UiohookWheelEvent {
  type: number;
  time: number;
  x: number;
  y: number;
  clicks?: number;
  amount?: number;
  direction: number;
  rotation: number;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

enum EventType {
  EVENT_MOUSE_CLICKED = 1,
  EVENT_MOUSE_PRESSED = 2,
  EVENT_MOUSE_RELEASED = 3,
  EVENT_MOUSE_MOVED = 4,
  EVENT_KEY_PRESSED = 5,
  EVENT_KEY_RELEASED = 6,
  EVENT_MOUSE_WHEEL = 7,
}

enum WheelDirection {
  VERTICAL = 3,
  HORIZONTAL = 4,
}

// Mock uiohook-napi module before importing service
const mockUIOhook = {
  start: jest.fn(),
  stop: jest.fn(),
  removeAllListeners: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  listeners: jest.fn(),
};

const mockEventListeners: { [key: string]: Function } = {};

jest.mock('uiohook-napi', () => ({
  uIOhook: {
    ...mockUIOhook,
    on: jest.fn((event: string, callback: Function) => {
      mockEventListeners[event] = callback;
    }),
  },
  UiohookKey: {
    A: 65,
    B: 66,
    C: 67,
    Space: 32,
    Enter: 13,
    Backspace: 8,
    Ctrl: 17,
    Shift: 16,
    Alt: 18,
    Meta: 91,
    ArrowUp: 38,
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
    F1: 112,
  },
  WheelDirection: {
    VERTICAL: 3,
    HORIZONTAL: 4,
  },
  EventType: {
    EVENT_MOUSE_CLICKED: 1,
    EVENT_MOUSE_PRESSED: 2,
    EVENT_MOUSE_RELEASED: 3,
    EVENT_MOUSE_MOVED: 4,
    EVENT_KEY_PRESSED: 5,
    EVENT_KEY_RELEASED: 6,
    EVENT_MOUSE_WHEEL: 7,
  },
}));

// Import service and dependencies AFTER mock
import { InputTrackingService } from '../input-tracking.service';
import { ComputerUseService } from '../../computer-use/computer-use.service';
import { InputTrackingGateway } from '../input-tracking.gateway';
import {
  ComputerAction as _ComputerAction,
  ClickMouseAction,
  DragMouseAction as _DragMouseAction,
  ScrollAction,
  TypeTextAction as _TypeTextAction,
  TypeKeysAction as _TypeKeysAction,
} from '@bytebot/shared';

describe('InputTrackingService', () => {
  let service: InputTrackingService;
  let computerUseService: ComputerUseService;
  let gateway: InputTrackingGateway;
  let logger: Logger;

  const operationId = `input_tracking_service_test_${Date.now()}`;

  // Define proper handler type for better type safety
  type EventHandler = (event: any) => void;
  type MockCall = [string, EventHandler];

  // Mock event objects for testing
  const createMockMouseEvent = (
    overrides: Partial<UiohookMouseEvent> = {},
  ): UiohookMouseEvent => ({
    type: EventType.EVENT_MOUSE_CLICKED,
    time: Date.now(),
    x: 100,
    y: 200,
    button: 1, // Left button
    clicks: 1,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  });

  const createMockKeyboardEvent = (
    overrides: Partial<UiohookKeyboardEvent> = {},
  ): UiohookKeyboardEvent => ({
    type: EventType.EVENT_KEY_PRESSED,
    time: Date.now(),
    keycode: 65, // A key
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  });

  const createMockWheelEvent = (
    overrides: Partial<UiohookWheelEvent> = {},
  ): UiohookWheelEvent => ({
    type: EventType.EVENT_MOUSE_WHEEL,
    time: Date.now(),
    x: 150,
    y: 250,
    direction: WheelDirection.VERTICAL,
    rotation: -3,
    clicks: 1,
    amount: 3,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  });

  beforeEach(async () => {
    console.log(`[${operationId}] Setting up InputTrackingService test module`);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputTrackingService,
        {
          provide: ComputerUseService,
          useValue: {
            screenshot: (jest.fn() as jest.MockedFunction<any>).mockResolvedValue({
              image: 'mock-screenshot-base64-data',
            }),
          },
        },
        {
          provide: InputTrackingGateway,
          useValue: {
            emitAction: jest.fn(),
            emitScreenshotAndAction: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InputTrackingService>(InputTrackingService);
    computerUseService = module.get<ComputerUseService>(ComputerUseService);
    gateway = module.get<InputTrackingGateway>(InputTrackingGateway);
    logger = module.get<Logger>(Logger);

    // Reset mock implementations
    jest.clearAllMocks();

    console.log(`[${operationId}] InputTrackingService test setup completed`);
  });

  afterEach(async () => {
    // Ensure tracking is stopped and cleaned up
    service.stopTracking();
    await new Promise((resolve) => setTimeout(resolve, 10)); // Allow cleanup
    jest.clearAllMocks();
    console.log(`[${operationId}] InputTrackingService test cleanup completed`);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      const testId = `${operationId}_service_defined`;
      console.log(`[${testId}] Testing service initialization`);

      expect(service).toBeDefined();
      expect(computerUseService).toBeDefined();
      expect(gateway).toBeDefined();
      expect(logger).toBeDefined();

      console.log(`[${testId}] Service initialization test completed`);
    });

    it('should initialize with correct dependencies', () => {
      const testId = `${operationId}_dependency_injection`;
      console.log(`[${testId}] Testing dependency injection`);

      expect(service['computerUseService']).toBeDefined();
      expect(service['gateway']).toBeDefined();

      console.log(`[${testId}] Dependency injection test completed`);
    });

    it('should start in non-tracking state', () => {
      const testId = `${operationId}_initial_state`;
      console.log(`[${testId}] Testing initial service state`);

      expect(service['isTracking']).toBe(false);
      expect(service['isDragging']).toBe(false);
      expect(service['pressedKeys'].size).toBe(0);
      expect(service['typingBuffer']).toEqual([]);

      console.log(`[${testId}] Initial service state test completed`);
    });
  });

  describe('Tracking Lifecycle Management', () => {
    it('should start tracking successfully', () => {
      const testId = `${operationId}_start_tracking`;
      console.log(`[${testId}] Testing start tracking`);

      service.startTracking();

      expect(mockUIOhook.start).toHaveBeenCalledTimes(1);
      expect(service['isTracking']).toBe(true);
      expect(logger.log).toHaveBeenCalledWith('Starting input tracking');

      console.log(`[${testId}] Start tracking test completed`);
    });

    it('should not start tracking if already running', () => {
      const testId = `${operationId}_start_tracking_idempotent`;
      console.log(`[${testId}] Testing start tracking idempotency`);

      service.startTracking();
      service.startTracking(); // Second call should be ignored

      expect(mockUIOhook.start).toHaveBeenCalledTimes(1);
      expect(service['isTracking']).toBe(true);

      console.log(`[${testId}] Start tracking idempotency test completed`);
    });

    it('should stop tracking successfully', () => {
      const testId = `${operationId}_stop_tracking`;
      console.log(`[${testId}] Testing stop tracking`);

      service.startTracking();
      service.stopTracking();

      expect(mockUIOhook.stop).toHaveBeenCalledTimes(1);
      expect(mockUIOhook.removeAllListeners).toHaveBeenCalledTimes(1);
      expect(service['isTracking']).toBe(false);
      expect(logger.log).toHaveBeenCalledWith('Stopping input tracking');

      console.log(`[${testId}] Stop tracking test completed`);
    });

    it('should not stop tracking if not running', () => {
      const testId = `${operationId}_stop_tracking_idempotent`;
      console.log(`[${testId}] Testing stop tracking idempotency`);

      service.stopTracking(); // Should not call uIOhook methods

      expect(mockUIOhook.stop).not.toHaveBeenCalled();
      expect(mockUIOhook.removeAllListeners).not.toHaveBeenCalled();

      console.log(`[${testId}] Stop tracking idempotency test completed`);
    });

    it('should clean up on module destroy', () => {
      const testId = `${operationId}_module_destroy_cleanup`;
      console.log(`[${testId}] Testing module destroy cleanup`);

      service.startTracking();
      service.onModuleDestroy();

      expect(mockUIOhook.stop).toHaveBeenCalledTimes(1);
      expect(service['isTracking']).toBe(false);

      console.log(`[${testId}] Module destroy cleanup test completed`);
    });
  });

  describe('Mouse Event Processing', () => {
    beforeEach(() => {
      service.startTracking();
    });

    it('should process click mouse events', () => {
      const testId = `${operationId}_process_click_events`;
      console.log(`[${testId}] Testing click mouse event processing`);

      const mockEvent = createMockMouseEvent({
        x: 300,
        y: 400,
        button: 1,
        clicks: 1,
      });

      // Simulate clicking
      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];
      expect(clickHandler).toBeDefined();

      clickHandler?.(mockEvent);

      // Wait for debounce timeout
      jest.runAllTimers();

      expect(gateway.emitAction).toHaveBeenCalled();

      console.log(`[${testId}] Click mouse event processing test completed`);
    });

    it('should process drag mouse events', () => {
      const testId = `${operationId}_process_drag_events`;
      console.log(`[${testId}] Testing drag mouse event processing`);

      const startEvent = createMockMouseEvent({ x: 100, y: 100 });
      const moveEvent = createMockMouseEvent({ x: 150, y: 150 });
      const endEvent = createMockMouseEvent({ x: 200, y: 200 });

      // Get event handlers
      const mouseDownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousedown')?.[1];
      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];
      const mouseUpHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mouseup')?.[1];

      expect(mouseDownHandler).toBeDefined();
      expect(mouseMoveHandler).toBeDefined();
      expect(mouseUpHandler).toBeDefined();

      // Simulate drag sequence
      mouseDownHandler?.(startEvent);
      mouseMoveHandler?.(moveEvent);
      mouseUpHandler?.(endEvent);

      expect(service['isDragging']).toBe(false); // Should be reset
      expect(gateway.emitAction).toHaveBeenCalled();

      console.log(`[${testId}] Drag mouse event processing test completed`);
    });

    it('should handle double-click events', () => {
      const testId = `${operationId}_double_click_events`;
      console.log(`[${testId}] Testing double-click event processing`);

      const singleClickEvent = createMockMouseEvent({ clicks: 1 });
      const doubleClickEvent = createMockMouseEvent({ clicks: 2 });

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      // Send single click first
      clickHandler?.(singleClickEvent);

      // Then double click (should override)
      clickHandler?.(doubleClickEvent);

      // Wait for debounce
      jest.runAllTimers();

      // Should emit the double-click (highest click count)
      const emitCalls = (gateway.emitAction as jest.Mock).mock.calls as Array<
        [ClickMouseAction]
      >;
      const lastAction = emitCalls[emitCalls.length - 1]?.[0];
      expect(lastAction?.clickCount).toBe(2);

      console.log(`[${testId}] Double-click event processing test completed`);
    });

    it('should process mouse wheel events', () => {
      const testId = `${operationId}_mouse_wheel_events`;
      console.log(`[${testId}] Testing mouse wheel event processing`);

      const wheelEvent = createMockWheelEvent({
        direction: WheelDirection.VERTICAL,
        rotation: -3, // Scroll up
      });

      const wheelHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'wheel')?.[1];

      expect(wheelHandler).toBeDefined();

      // Send multiple scroll events to trigger action emission
      for (let i = 0; i < 4; i++) {
        wheelHandler?.(wheelEvent);
      }

      expect(gateway.emitAction).toHaveBeenCalled();

      console.log(`[${testId}] Mouse wheel event processing test completed`);
    });

    it('should map button codes correctly', () => {
      const testId = `${operationId}_button_mapping`;
      console.log(`[${testId}] Testing button code mapping`);

      const leftClick = createMockMouseEvent({ button: 1 });
      const rightClick = createMockMouseEvent({ button: 2 });
      const middleClick = createMockMouseEvent({ button: 3 });

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      clickHandler?.(leftClick);
      jest.runAllTimers();

      clickHandler?.(rightClick);
      jest.runAllTimers();

      clickHandler?.(middleClick);
      jest.runAllTimers();

      const emitCalls = (gateway.emitAction as jest.Mock).mock.calls as Array<
        [ClickMouseAction]
      >;
      expect(emitCalls[0]?.[0]?.button).toBe('left');
      expect(emitCalls[1]?.[0]?.button).toBe('right');
      expect(emitCalls[2]?.[0]?.button).toBe('middle');

      console.log(`[${testId}] Button code mapping test completed`);
    });
  });

  describe('Keyboard Event Processing', () => {
    beforeEach(() => {
      service.startTracking();
    });

    it('should process printable character typing', () => {
      const testId = `${operationId}_printable_character_typing`;
      console.log(`[${testId}] Testing printable character typing`);

      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];

      expect(keydownHandler).toBeDefined();

      // Type 'hello'
      const chars = [72, 69, 76, 76, 79]; // H, E, L, L, O keycodes
      chars.forEach((keycode) => {
        keydownHandler?.(createMockKeyboardEvent({ keycode }));
      });

      // Wait for typing debounce
      jest.runAllTimers();

      expect(gateway.emitAction).toHaveBeenCalled();
      const emitCalls = (gateway.emitAction as jest.Mock).mock.calls as Array<
        [{ action: string }]
      >;
      const typeAction = emitCalls.find(
        (call) => call[0]?.action === 'type_text',
      )?.[0];
      expect(typeAction).toBeDefined();

      console.log(`[${testId}] Printable character typing test completed`);
    });

    it('should process key combinations with modifiers', () => {
      const testId = `${operationId}_key_combinations`;
      console.log(`[${testId}] Testing key combinations with modifiers`);

      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];
      const keyupHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keyup')?.[1];

      // Ctrl+C combination
      keydownHandler?.(
        createMockKeyboardEvent({
          keycode: 17, // Ctrl
          ctrlKey: true,
        }),
      );

      keydownHandler?.(
        createMockKeyboardEvent({
          keycode: 67, // C
          ctrlKey: true,
        }),
      );

      keyupHandler?.(
        createMockKeyboardEvent({
          keycode: 67,
          ctrlKey: true,
        }),
      );

      expect(gateway.emitAction).toHaveBeenCalled();

      console.log(`[${testId}] Key combinations test completed`);
    });

    it('should handle key repeat suppression', () => {
      const testId = `${operationId}_key_repeat_suppression`;
      console.log(`[${testId}] Testing key repeat suppression`);

      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];

      const keyEvent = createMockKeyboardEvent({
        keycode: 32, // Space
      });

      // Send multiple identical keydown events (auto-repeat)
      keydownHandler?.(keyEvent);
      keydownHandler?.(keyEvent);
      keydownHandler?.(keyEvent);

      // Only first one should be processed
      expect(service['pressedKeys'].size).toBe(1);

      console.log(`[${testId}] Key repeat suppression test completed`);
    });

    it('should detect modifier keys correctly', () => {
      const testId = `${operationId}_modifier_key_detection`;
      console.log(`[${testId}] Testing modifier key detection`);

      const modifierEvent = createMockKeyboardEvent({
        keycode: 17, // Ctrl
        ctrlKey: true,
      });

      const result = service['isModifierKey'](modifierEvent);
      expect(result).toBe(true);

      const nonModifierEvent = createMockKeyboardEvent({
        keycode: 65, // A
      });

      const result2 = service['isModifierKey'](nonModifierEvent);
      expect(result2).toBe(false);

      console.log(`[${testId}] Modifier key detection test completed`);
    });

    it('should handle unknown key codes', () => {
      const testId = `${operationId}_unknown_key_codes`;
      console.log(`[${testId}] Testing unknown key code handling`);

      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];

      const unknownKeyEvent = createMockKeyboardEvent({
        keycode: 999, // Non-existent key
      });

      keydownHandler?.(unknownKeyEvent);

      expect(logger.warn).toHaveBeenCalledWith('Unknown key: 999');

      console.log(`[${testId}] Unknown key code handling test completed`);
    });
  });

  describe('Screenshot Integration', () => {
    beforeEach(() => {
      service.startTracking();
    });

    it('should capture screenshot on mouse movement', async () => {
      const testId = `${operationId}_screenshot_on_mouse_move`;
      console.log(`[${testId}] Testing screenshot capture on mouse movement`);

      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];

      const moveEvent = createMockMouseEvent({ x: 200, y: 300 });
      mouseMoveHandler?.(moveEvent);

      // Wait for screenshot debounce
      jest.runAllTimers();

      // Allow async screenshot to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(computerUseService.screenshot).toHaveBeenCalled();

      console.log(`[${testId}] Screenshot on mouse movement test completed`);
    });

    it('should emit screenshot with mouse actions', async () => {
      const testId = `${operationId}_screenshot_with_actions`;
      console.log(`[${testId}] Testing screenshot emission with actions`);

      // First trigger a screenshot
      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];
      mouseMoveHandler?.(createMockMouseEvent());

      jest.runAllTimers();
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Then trigger a click
      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];
      clickHandler?.(createMockMouseEvent());

      jest.runAllTimers();

      expect(gateway.emitScreenshotAndAction).toHaveBeenCalled();

      console.log(`[${testId}] Screenshot with actions test completed`);
    });

    it('should handle screenshot capture errors', async () => {
      const testId = `${operationId}_screenshot_error_handling`;
      console.log(`[${testId}] Testing screenshot capture error handling`);

      // Mock screenshot to fail
      jest
        .spyOn(computerUseService, 'screenshot')
        .mockRejectedValueOnce(new Error('Screenshot failed'));

      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];
      mouseMoveHandler?.(createMockMouseEvent());

      jest.runAllTimers();
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to take screenshot for action',
        'Screenshot failed',
      );

      console.log(`[${testId}] Screenshot error handling test completed`);
    });
  });

  describe('Event Buffering and Debouncing', () => {
    beforeEach(() => {
      service.startTracking();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce typing events', () => {
      const testId = `${operationId}_typing_debounce`;
      console.log(`[${testId}] Testing typing event debouncing`);

      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];

      // Type characters rapidly
      keydownHandler?.(createMockKeyboardEvent({ keycode: 72 })); // H
      keydownHandler?.(createMockKeyboardEvent({ keycode: 69 })); // E
      keydownHandler?.(createMockKeyboardEvent({ keycode: 76 })); // L
      keydownHandler?.(createMockKeyboardEvent({ keycode: 76 })); // L
      keydownHandler?.(createMockKeyboardEvent({ keycode: 79 })); // O

      // Should not emit until debounce timeout
      expect(gateway.emitAction).not.toHaveBeenCalled();

      // Advance timers past debounce timeout
      jest.advanceTimersByTime(500);

      // Now should emit type_text action
      expect(gateway.emitAction).toHaveBeenCalled();

      console.log(`[${testId}] Typing event debouncing test completed`);
    });

    it('should debounce click events', () => {
      const testId = `${operationId}_click_debounce`;
      console.log(`[${testId}] Testing click event debouncing`);

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      // Rapid clicks
      clickHandler?.(createMockMouseEvent({ clicks: 1 }));
      clickHandler?.(createMockMouseEvent({ clicks: 2 }));

      // Should not emit immediately
      expect(gateway.emitAction).not.toHaveBeenCalled();

      // Advance past debounce timeout
      jest.advanceTimersByTime(250);

      // Should emit the highest click count
      expect(gateway.emitAction).toHaveBeenCalled();
      const emitCalls = (gateway.emitAction as jest.Mock).mock.calls as Array<
        [{ clickCount: number }]
      >;
      const emitCall = emitCalls[0]?.[0];
      expect(emitCall?.clickCount).toBe(2);

      console.log(`[${testId}] Click event debouncing test completed`);
    });

    it('should debounce screenshot capture', () => {
      const testId = `${operationId}_screenshot_debounce`;
      console.log(`[${testId}] Testing screenshot capture debouncing`);

      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];

      // Rapid mouse movements
      mouseMoveHandler?.(createMockMouseEvent({ x: 100, y: 100 }));
      mouseMoveHandler?.(createMockMouseEvent({ x: 101, y: 101 }));
      mouseMoveHandler?.(createMockMouseEvent({ x: 102, y: 102 }));

      // Should not capture screenshot immediately
      expect(computerUseService.screenshot).not.toHaveBeenCalled();

      // Advance past debounce timeout
      jest.advanceTimersByTime(250);

      // Should capture screenshot only once
      expect(computerUseService.screenshot).toHaveBeenCalledTimes(1);

      console.log(`[${testId}] Screenshot debouncing test completed`);
    });
  });

  describe('Performance and Memory Management', () => {
    beforeEach(() => {
      service.startTracking();
    });

    it('should handle high-frequency input events', () => {
      const testId = `${operationId}_high_frequency_input`;
      console.log(`[${testId}] Testing high-frequency input handling`);

      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];

      const startTime = Date.now();

      // Simulate 1000 mouse move events
      for (let i = 0; i < 1000; i++) {
        mouseMoveHandler?.(createMockMouseEvent({ x: i, y: i }));
      }

      const processingTime = Date.now() - startTime;

      // Should handle efficiently
      expect(processingTime).toBeLessThan(1000); // Less than 1 second

      console.log(
        `[${testId}] High-frequency input test completed (${processingTime}ms)`,
      );
    });

    it('should clean up timers properly', () => {
      const testId = `${operationId}_timer_cleanup`;
      console.log(`[${testId}] Testing timer cleanup`);

      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];

      // Start typing to create a timer
      keydownHandler?.(createMockKeyboardEvent({ keycode: 65 }));

      // Stop tracking should clean up
      service.stopTracking();

      // Verify no memory leaks from timers
      expect(service['typingTimer']).toBeNull();

      console.log(`[${testId}] Timer cleanup test completed`);
    });

    it('should handle concurrent event processing', () => {
      const testId = `${operationId}_concurrent_event_processing`;
      console.log(`[${testId}] Testing concurrent event processing`);

      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];
      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];
      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];

      // Simulate concurrent events
      mouseMoveHandler?.(createMockMouseEvent());
      clickHandler?.(createMockMouseEvent());
      keydownHandler?.(createMockKeyboardEvent());

      // All should be processed without issues
      expect(() => {
        jest.runAllTimers();
      }).not.toThrow();

      console.log(`[${testId}] Concurrent event processing test completed`);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    beforeEach(() => {
      service.startTracking();
    });

    it('should handle invalid mouse coordinates', () => {
      const testId = `${operationId}_invalid_mouse_coordinates`;
      console.log(`[${testId}] Testing invalid mouse coordinates`);

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      const invalidEvent = createMockMouseEvent({
        x: -1000,
        y: -1000,
      });

      expect(() => {
        clickHandler?.(invalidEvent);
        jest.runAllTimers();
      }).not.toThrow();

      console.log(`[${testId}] Invalid mouse coordinates test completed`);
    });

    it('should handle malformed keyboard events', () => {
      const testId = `${operationId}_malformed_keyboard_events`;
      console.log(`[${testId}] Testing malformed keyboard events`);

      const keydownHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'keydown')?.[1];

      const malformedEvent: unknown = {
        // Missing required properties
        keycode: null,
      } as any;

      expect(() => {
        keydownHandler?.(malformedEvent);
      }).not.toThrow();

      console.log(`[${testId}] Malformed keyboard events test completed`);
    });

    it('should handle gateway emission errors', () => {
      const testId = `${operationId}_gateway_emission_errors`;
      console.log(`[${testId}] Testing gateway emission error handling`);

      // Mock gateway to throw error
      jest.spyOn(gateway, 'emitAction').mockImplementationOnce(() => {
        throw new Error('Gateway error');
      });

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      expect(() => {
        clickHandler?.(createMockMouseEvent());
        jest.runAllTimers();
      }).toThrow('Gateway error');

      console.log(`[${testId}] Gateway emission error handling test completed`);
    });

    it('should handle uiohook start/stop errors', () => {
      const testId = `${operationId}_uiohook_errors`;
      console.log(`[${testId}] Testing uiohook error handling`);

      // Mock uiohook to throw on start
      mockUIOhook.start.mockImplementationOnce(() => {
        throw new Error('uiohook start failed');
      });

      expect(() => {
        service.startTracking();
      }).toThrow('uiohook start failed');

      console.log(`[${testId}] Uiohook error handling test completed`);
    });

    it('should handle rapid start/stop cycles', () => {
      const testId = `${operationId}_rapid_start_stop_cycles`;
      console.log(`[${testId}] Testing rapid start/stop cycles`);

      // Rapid cycles
      for (let i = 0; i < 10; i++) {
        service.startTracking();
        service.stopTracking();
      }

      expect(service['isTracking']).toBe(false);

      console.log(`[${testId}] Rapid start/stop cycles test completed`);
    });
  });

  describe('Action Conversion and Mapping', () => {
    beforeEach(() => {
      service.startTracking();
    });

    it('should convert mouse events to computer actions correctly', () => {
      const testId = `${operationId}_mouse_action_conversion`;
      console.log(`[${testId}] Testing mouse event to action conversion`);

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      const mouseEvent = createMockMouseEvent({
        x: 150,
        y: 250,
        button: 1,
        clicks: 1,
        ctrlKey: true,
        shiftKey: true,
      });

      clickHandler?.(mouseEvent);
      jest.runAllTimers();

      const emitCalls = (gateway.emitAction as jest.Mock).mock.calls as Array<
        [ClickMouseAction]
      >;
      const emitCall = emitCalls[0]?.[0];
      expect(emitCall?.action).toBe('click_mouse');
      expect(emitCall?.coordinates).toEqual({ x: 150, y: 250 });
      expect(emitCall?.button).toBe('left');
      expect(emitCall?.clickCount).toBe(1);
      expect(emitCall?.holdKeys).toContain('ctrl');
      expect(emitCall?.holdKeys).toContain('shift');

      console.log(`[${testId}] Mouse action conversion test completed`);
    });

    it('should convert scroll events to scroll actions', () => {
      const testId = `${operationId}_scroll_action_conversion`;
      console.log(`[${testId}] Testing scroll event to action conversion`);

      const wheelHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'wheel')?.[1];

      const wheelEvent = createMockWheelEvent({
        x: 200,
        y: 300,
        direction: WheelDirection.VERTICAL,
        rotation: 3, // Scroll down
      });

      // Send enough scroll events to trigger emission
      for (let i = 0; i < 4; i++) {
        wheelHandler?.(wheelEvent);
      }

      const emitCalls = (gateway.emitAction as jest.Mock).mock.calls as Array<
        [ScrollAction]
      >;
      const emitCall = emitCalls[0]?.[0];
      expect(emitCall?.action).toBe('scroll');
      expect(emitCall?.direction).toBe('down');
      expect(emitCall?.coordinates).toEqual({ x: 200, y: 300 });

      console.log(`[${testId}] Scroll action conversion test completed`);
    });

    it('should handle horizontal scrolling', () => {
      const testId = `${operationId}_horizontal_scroll`;
      console.log(`[${testId}] Testing horizontal scroll handling`);

      const wheelHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'wheel')?.[1];

      const horizontalWheelEvent = createMockWheelEvent({
        direction: WheelDirection.HORIZONTAL,
        rotation: -2, // Scroll left
      });

      for (let i = 0; i < 4; i++) {
        wheelHandler?.(horizontalWheelEvent);
      }

      const emitCalls = (gateway.emitAction as jest.Mock).mock.calls as Array<
        [ScrollAction]
      >;
      const emitCall = emitCalls[0]?.[0];
      expect(emitCall?.direction).toBe('left');

      console.log(`[${testId}] Horizontal scroll test completed`);
    });
  });

  describe('Integration with Dependencies', () => {
    it('should integrate with computer use service for screenshots', async () => {
      const testId = `${operationId}_computer_use_integration`;
      console.log(`[${testId}] Testing computer use service integration`);

      service.startTracking();

      const mouseMoveHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'mousemove')?.[1];

      mouseMoveHandler?.(createMockMouseEvent());
      jest.runAllTimers();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(computerUseService.screenshot).toHaveBeenCalled();

      console.log(
        `[${testId}] Computer use service integration test completed`,
      );
    });

    it('should integrate with gateway for event emission', () => {
      const testId = `${operationId}_gateway_integration`;
      console.log(`[${testId}] Testing gateway integration`);

      service.startTracking();

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      clickHandler?.(createMockMouseEvent());
      jest.runAllTimers();

      expect(gateway.emitAction).toHaveBeenCalled();

      console.log(`[${testId}] Gateway integration test completed`);
    });
  });

  describe('Logging and Debugging', () => {
    beforeEach(() => {
      service.startTracking();
    });

    it('should log detected actions', () => {
      const testId = `${operationId}_action_logging`;
      console.log(`[${testId}] Testing action logging`);

      const clickHandler = (
        (mockUIOhook.on as jest.Mock).mock.calls as MockCall[]
      ).find((call: [string, Function]) => call[0] === 'click')?.[1];

      clickHandler?.(createMockMouseEvent());
      jest.runAllTimers();

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Detected action:'),
        expect.any(String),
      );

      console.log(`[${testId}] Action logging test completed`);
    });

    it('should log service lifecycle events', () => {
      const testId = `${operationId}_lifecycle_logging`;
      console.log(`[${testId}] Testing lifecycle event logging`);

      service.stopTracking();
      service.startTracking();

      expect(logger.log).toHaveBeenCalledWith('Starting input tracking');
      expect(logger.log).toHaveBeenCalledWith('Stopping input tracking');

      console.log(`[${testId}] Lifecycle event logging test completed`);
    });
  });
});
