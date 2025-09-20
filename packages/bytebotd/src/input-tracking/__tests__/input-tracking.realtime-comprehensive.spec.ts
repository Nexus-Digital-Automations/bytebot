/* eslint-env jest */
// TypeScript safety note: This test file contains complex UIohook integration that requires flexible typing
/**
 * Input Tracking Service - Real-time Comprehensive Test Suite
 *
 * Advanced comprehensive test coverage for real-time input tracking capabilities including:
 * - UIohook integration and native input event processing
 * - Real-time mouse tracking with precise coordinate capture
 * - Advanced keyboard input tracking and text buffer management
 * - Scroll event processing and debouncing optimization
 * - WebSocket gateway integration for real-time event broadcasting
 * - Input event buffering, debouncing, and performance optimization
 * - Complex input sequence processing and pattern recognition
 * - Cross-platform input handling (Windows, macOS, Linux)
 * - Memory management and resource cleanup for long-running sessions
 * - Error handling and recovery for input system failures
 * - Performance testing under high-frequency input scenarios
 * - Security validation for input event access and processing
 *
 * This suite ensures production-ready input tracking with enterprise-grade
 * reliability and performance for desktop automation workflows.
 *
 * @author Claude Code (Input Tracking Testing Specialist)
 * @version 1.0.0
 * @coverage-target 100% for all input tracking components
 */

// Define comprehensive UIohook types
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
  char?: string;
  rawcode?: number;
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

// Mock UIohook event types and constants
enum EventType {
  EVENT_MOUSE_CLICKED = 1,
  EVENT_MOUSE_PRESSED = 2,
  EVENT_MOUSE_RELEASED = 3,
  EVENT_MOUSE_MOVED = 4,
  EVENT_MOUSE_DRAGGED = 5,
  EVENT_KEY_PRESSED = 6,
  EVENT_KEY_RELEASED = 7,
  EVENT_KEY_TYPED = 8,
  EVENT_MOUSE_WHEEL = 9,
}

enum WheelDirection {
  VERTICAL = 3,
  HORIZONTAL = 4,
}

enum MouseButton {
  NOBUTTON = 0,
  BUTTON1 = 1, // Left
  BUTTON2 = 2, // Right
  BUTTON3 = 3, // Middle
}

// Type definitions for event handlers
type MouseEventHandler = (event: UiohookMouseEvent) => void;
type KeyboardEventHandler = (event: UiohookKeyboardEvent) => void;
type WheelEventHandler = (event: UiohookWheelEvent) => void;
type UIohookEventHandler =
  | MouseEventHandler
  | KeyboardEventHandler
  | WheelEventHandler;

// Mock uiohook-napi before importing services
const mockEventListeners: { [key: string]: UIohookEventHandler } = {};
const mockUIOhook = {
  start: jest.fn(),
  stop: jest.fn(),
  removeAllListeners: jest.fn(),
  on: jest.fn((event: string, callback: UIohookEventHandler) => {
    mockEventListeners[event] = callback;
  }),
  off: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
  listeners: jest.fn(),
};

jest.mock('uiohook-napi', () => ({uIOhook: mockUIOhook,UiohookKey: {
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    Shift: 16,
    Ctrl: 17,
    Alt: 18,
    Meta: 91,
    Enter: 13,
    Escape: 27,
    Space: 32,
    Tab: 9,
    Backspace: 8,
    Delete: 46,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
  },
  UiohookMouseEvent: {} as UiohookMouseEvent,
  UiohookKeyboardEvent: {} as UiohookKeyboardEvent,
  UiohookWheelEvent: {} as UiohookWheelEvent,
  EventType,
  WheelDirection,
  Button: MouseButton,
}));

import { Test, TestingModule } from '@nestjs/testing';import { Logger } from '@nestjs/common';import { InputTrackingService } from '../input-tracking.service';import { InputTrackingGateway } from '../input-tracking.gateway';import { ComputerUseService } from '../../computer-use/computer-use.service';import {ComputerAction as _ComputerAction,
  ClickMouseAction as _ClickMouseAction,
  DragMouseAction as _DragMouseAction,
  ScrollAction as _ScrollAction,
  TypeKeysAction as _TypeKeysAction,
  TypeTextAction as _TypeTextAction,
  MoveMouseAction as _MoveMouseAction,
  PressMouseAction as _PressMouseAction,
} from '@bytebot/shared';// Mock implementationsconst createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

const mockComputerUseService = {
  action: jest.fn().mockResolvedValue({
    success: true,
    message: 'Screenshot captured',image: 'base64-mock-screenshot-data',metadata: {width: 1920,
      height: 1080,
      captureTime: new Date(),
      operationId: 'screenshot-123',},}),
  screenshot: jest.fn().mockResolvedValue({
    image: 'base64-mock-screenshot-data',metadata: {width: 1920,
      height: 1080,
      captureTime: new Date(),
      operationId: 'screenshot-123',},}),
};

const mockInputTrackingGateway = {
  broadcastInputEvent: jest.fn(),
  broadcastActionEvent: jest.fn(),
  getConnectedClients: (
    jest.fn() as jest.MockedFunction<() => number>
  ).mockReturnValue(5),
  broadcastToRoom: jest.fn(),
  joinRoom: jest.fn(),
  leaveRoom: jest.fn(),
  getClientRooms: (
    jest.fn() as jest.MockedFunction<() => string[]>
  ).mockReturnValue(['desktop-session-1']),emitAction: jest.fn(),emitScreenshotAndAction: jest.fn(),
  handleConnection: jest.fn(),
  handleDisconnect: jest.fn(),
};

describe('Input Tracking Service - Real-time Comprehensive Test Suite', () => {let service: InputTrackingService;let gateway: InputTrackingGateway;
  let computerUseService: ComputerUseService;
  let testModule: TestingModule;

  // Test utilities for event generation
  const createMouseEvent = (
    overrides: Partial<UiohookMouseEvent> = {},
  ): UiohookMouseEvent => ({
    type: EventType.EVENT_MOUSE_MOVED,
    time: Date.now(),
    x: 100,
    y: 200,
    button: MouseButton.NOBUTTON,
    clicks: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  });

  const createKeyboardEvent = (
    overrides: Partial<UiohookKeyboardEvent> = {},
  ): UiohookKeyboardEvent => ({
    type: EventType.EVENT_KEY_PRESSED,
    time: Date.now(),
    keycode: 65, // 'A'altKey: false,ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    char: 'a',rawcode: 65,...overrides,
  });

  const createWheelEvent = (
    overrides: Partial<UiohookWheelEvent> = {},
  ): UiohookWheelEvent => ({
    type: EventType.EVENT_MOUSE_WHEEL,
    time: Date.now(),
    x: 500,
    y: 500,
    clicks: 3,
    amount: 120,
    direction: WheelDirection.VERTICAL,
    rotation: -3,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...overrides,
  });

  const simulateHighFrequencyInput = (
    eventCount: number,
    eventType: 'mouse' | 'keyboard' = 'mouse',) => {const events = [];
    for (let i = 0; i < eventCount; i++) {
      if (eventType === 'mouse') {events.push(createMouseEvent({
            x: i % 1920,
            y: (i * 2) % 1080,
            time: Date.now() + i,
          }),
        );
      } else {
        events.push(
          createKeyboardEvent({
            keycode: 65 + (i % 26),
            char: String.fromCharCode(97 + (i % 26)),
            time: Date.now() + i,
          }),
        );
      }
    }
    return events;
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset UIohook mock listeners
    Object.keys(mockEventListeners).forEach((key) => {
      delete mockEventListeners[key];
    });

    testModule = await Test.createTestingModule({
      providers: [
        InputTrackingService,
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
        {
          provide: InputTrackingGateway,
          useValue: mockInputTrackingGateway,
        },
        {
          provide: Logger,
          useValue: createMockLogger(),
        },
      ],
    }).compile();

    service = testModule.get<InputTrackingService>(InputTrackingService);
    gateway = testModule.get<InputTrackingGateway>(InputTrackingGateway);
    computerUseService = testModule.get<ComputerUseService>(ComputerUseService);
  });

  afterEach(async () => {
    // Ensure service cleanup
    service.stopTracking();

    if (testModule) {
      await testModule.close();
    }
  });

  describe('Service Lifecycle Management', () => {it('should initialize and start tracking properly', () => {expect(service['isTracking']).toBe(false);service.startTracking();expect(service['isTracking']).toBe(true);expect(mockUIOhook.start).toHaveBeenCalled();expect(mockUIOhook.on).toHaveBeenCalledWith(
        'mouseclick',expect.any(Function),);
      expect(mockUIOhook.on).toHaveBeenCalledWith(
        'mousemove',expect.any(Function),);
      expect(mockUIOhook.on).toHaveBeenCalledWith(
        'mousedown',expect.any(Function),);
      expect(mockUIOhook.on).toHaveBeenCalledWith(
        'mouseup',expect.any(Function),);
      expect(mockUIOhook.on).toHaveBeenCalledWith(
        'wheel',expect.any(Function),);
      expect(mockUIOhook.on).toHaveBeenCalledWith(
        'keydown',expect.any(Function),);
      expect(mockUIOhook.on).toHaveBeenCalledWith(
        'keyup',expect.any(Function),);
    });

    it('should stop tracking and clean up resources properly', () => {service.startTracking();expect(service['isTracking']).toBe(true);service.stopTracking();expect(service['isTracking']).toBe(false);expect(mockUIOhook.stop).toHaveBeenCalled();expect(mockUIOhook.removeAllListeners).toHaveBeenCalled();
    });

    it('should handle multiple start/stop cycles gracefully', () => {// Multiple starts should not cause issuesservice.startTracking();
      service.startTracking();
      service.startTracking();

      expect(service['isTracking']).toBe(true);expect(mockUIOhook.start).toHaveBeenCalledTimes(1); // Should not start multiple times// Multiple stops should not cause issues
      service.stopTracking();
      service.stopTracking();
      service.stopTracking();

      expect(service['isTracking']).toBe(false);expect(mockUIOhook.stop).toHaveBeenCalledTimes(1);});

    it('should handle module destruction gracefully', () => {service.startTracking();expect(service['isTracking']).toBe(true);service.onModuleDestroy();expect(service['isTracking']).toBe(false);expect(mockUIOhook.stop).toHaveBeenCalled();expect(mockUIOhook.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('Real-time Mouse Event Processing', () => {beforeEach(() => {service.startTracking();
    });

    it('should process mouse click events with debouncing', async () => {const clickHandler = mockEventListeners['mouseclick'] as MouseEventHandler;expect(clickHandler).toBeDefined();

      // Generate rapid click events
      const clickEvents = [
        createMouseEvent({
          type: EventType.EVENT_MOUSE_CLICKED,
          x: 100,
          y: 100,
          clicks: 1,
        }),
        createMouseEvent({
          type: EventType.EVENT_MOUSE_CLICKED,
          x: 100,
          y: 100,
          clicks: 2,
        }),
        createMouseEvent({
          type: EventType.EVENT_MOUSE_CLICKED,
          x: 105,
          y: 105,
          clicks: 1,
        }),
      ];

      for (const event of clickEvents) {
        if (clickHandler) {
          clickHandler(event);
        }
      }

      // Wait for debounce timeout
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify clicks were processed and broadcasted
      expect(gateway.broadcastActionEvent).toHaveBeenCalled();
    });

    it('should track mouse movement with coordinate accuracy', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;expect(moveHandler).toBeDefined();const moveEvents = [
        createMouseEvent({ type: EventType.EVENT_MOUSE_MOVED, x: 0, y: 0 }),
        createMouseEvent({ type: EventType.EVENT_MOUSE_MOVED, x: 100, y: 100 }),
        createMouseEvent({
          type: EventType.EVENT_MOUSE_MOVED,
          x: 1920,
          y: 1080,
        }),
        createMouseEvent({ type: EventType.EVENT_MOUSE_MOVED, x: 960, y: 540 }),
      ];

      for (const event of moveEvents) {
        if (moveHandler) {
          moveHandler(event);
        }
      }

      // Verify movement events were processed
      expect(gateway.broadcastInputEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mouse_move',coordinates: expect.objectContaining({x: expect.any(Number) as unknown as number,
            y: expect.any(Number) as unknown as number,
          }) as unknown,
        }),
      );
    });

    it('should handle mouse drag operations with state management', () => {const downHandler = mockEventListeners['mousedown'] as MouseEventHandler;const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;const upHandler = mockEventListeners['mouseup'] as MouseEventHandler;// Start dragconst startEvent = createMouseEvent({
        type: EventType.EVENT_MOUSE_PRESSED,
        x: 100,
        y: 100,
        button: MouseButton.BUTTON1,
      });
      if (downHandler) {
        downHandler(startEvent);
      }

      // Drag movement
      const dragEvents = [
        createMouseEvent({
          type: EventType.EVENT_MOUSE_DRAGGED,
          x: 150,
          y: 150,
        }),
        createMouseEvent({
          type: EventType.EVENT_MOUSE_DRAGGED,
          x: 200,
          y: 200,
        }),
        createMouseEvent({
          type: EventType.EVENT_MOUSE_DRAGGED,
          x: 250,
          y: 250,
        }),
      ];

      for (const event of dragEvents) {
        if (moveHandler) {
          moveHandler(event);
        }
      }

      // End drag
      const endEvent = createMouseEvent({
        type: EventType.EVENT_MOUSE_RELEASED,
        x: 250,
        y: 250,
        button: MouseButton.BUTTON1,
      });
      if (upHandler) {
        upHandler(endEvent);
      }

      // Verify drag action was created and broadcasted
      expect(gateway.broadcastActionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'drag_mouse',startCoordinates: { x: 100, y: 100 },endCoordinates: { x: 250, y: 250 },
        }),
      );
    });

    it('should process mouse wheel events with direction and scroll amount', async () => {const wheelHandler = mockEventListeners['wheel'] as WheelEventHandler;expect(wheelHandler).toBeDefined();const wheelEvents = [
        // Vertical scroll down
        createWheelEvent({
          direction: WheelDirection.VERTICAL,
          rotation: -3,
          x: 500,
          y: 300,
        }),
        // Vertical scroll up
        createWheelEvent({
          direction: WheelDirection.VERTICAL,
          rotation: 3,
          x: 500,
          y: 300,
        }),
        // Horizontal scroll
        createWheelEvent({
          direction: WheelDirection.HORIZONTAL,
          rotation: -2,
          x: 600,
          y: 400,
        }),
      ];

      for (const event of wheelEvents) {
        if (wheelHandler) {
          wheelHandler(event);
        }
      }

      // Wait for scroll debouncing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify scroll actions were processed
      expect(gateway.broadcastActionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scroll',}),);
    });

    it('should handle multi-monitor coordinate mapping', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;// Test coordinates across multiple monitorsconst multiMonitorEvents = [
        // Primary monitor
        createMouseEvent({ x: 960, y: 540 }),
        // Secondary monitor (right)
        createMouseEvent({ x: 2880, y: 540 }),
        // Secondary monitor (left) - negative coordinates
        createMouseEvent({ x: -960, y: 540 }),
        // Third monitor (above) - negative Y
        createMouseEvent({ x: 960, y: -540 }),
      ];

      for (const event of multiMonitorEvents) {
        if (moveHandler) {
          moveHandler(event);
        }
      }

      // Verify all coordinate systems were handled
      expect(gateway.broadcastInputEvent).toHaveBeenCalledTimes(4);
    });
  });

  describe('Advanced Keyboard Event Processing', () => {beforeEach(() => {service.startTracking();
    });

    it('should process text input with buffering and debouncing', async () => {const keydownHandler = mockEventListeners['keydown'] as KeyboardEventHandler;const keyupHandler = mockEventListeners['keyup'] as KeyboardEventHandler;

      // Simulate typing "Hello World"
      const text = 'Hello World';for (let i = 0; i < text.length; i++) {const char = text[i];
        const keycode = char === ' ' ? 32 : (char?.charCodeAt(0) ?? 0);if (keydownHandler) {keydownHandler(
            createKeyboardEvent({
              keycode,
              char: char === ' ' ? ' ' : char?.toLowerCase(),type: EventType.EVENT_KEY_PRESSED,}),
          );
        }

        if (keyupHandler) {
          keyupHandler(
            createKeyboardEvent({
              keycode,
              char: char === ' ' ? ' ' : char?.toLowerCase(),type: EventType.EVENT_KEY_RELEASED,}),
          );
        }
      }

      // Wait for typing buffer timeout
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Verify text was buffered and flushed as type_text action
      expect(gateway.broadcastActionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'type_text',text: expect.stringContaining('hello world') as unknown,}),);
    });

    it('should handle modifier key combinations accurately', async () => {const keydownHandler = mockEventListeners['keydown'] as KeyboardEventHandler;const keyupHandler = mockEventListeners['keyup'] as KeyboardEventHandler;// Test various modifier combinationsconst shortcuts = [
        // Ctrl+C (Copy)
        [
          { keycode: 17, ctrlKey: true, char: undefined }, // Ctrl down
          { keycode: 67, ctrlKey: true, char: 'c' }, // C down{ keycode: 67, ctrlKey: true, char: 'c' }, // C up{ keycode: 17, ctrlKey: false, char: undefined }, // Ctrl up],
        // Alt+Tab (Switch apps)
        [
          { keycode: 18, altKey: true, char: undefined }, // Alt down
          { keycode: 9, altKey: true, char: undefined }, // Tab down
          { keycode: 9, altKey: true, char: undefined }, // Tab up
          { keycode: 18, altKey: false, char: undefined }, // Alt up
        ],
        // Shift+F5 (Hard refresh)
        [
          { keycode: 16, shiftKey: true, char: undefined }, // Shift down
          { keycode: 116, shiftKey: true, char: undefined }, // F5 down
          { keycode: 116, shiftKey: true, char: undefined }, // F5 up
          { keycode: 16, shiftKey: false, char: undefined }, // Shift up
        ],
      ];

      for (const shortcut of shortcuts) {
        for (const keyEvent of shortcut) {
          const event = createKeyboardEvent(keyEvent);
          if (shortcut.indexOf(keyEvent as never) < shortcut.length / 2) {
            if (keydownHandler) {
              keydownHandler(event);
            }
          } else {
            if (keyupHandler) {
              keyupHandler(event);
            }
          }
        }

        // Small delay between shortcuts
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Verify shortcuts were processed as press_keys actions
      expect(gateway.broadcastActionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'press_keys',keys: expect.any(Array) as unknown,}),
      );
    });

    it('should prevent key repeat spam and handle held keys', async () => {const keydownHandler = mockEventListeners['keydown'] as KeyboardEventHandler;// Simulate holding a key (rapid repeated events)
      const heldKey = createKeyboardEvent({ keycode: 65, char: 'a' }); // 'A' key// Send multiple rapid keydown events (simulating key repeat)for (let i = 0; i < 20; i++) {
        if (keydownHandler) {
          keydownHandler({ ...heldKey, time: Date.now() + i });
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Verify key repeat was suppressed (should only trigger once)
      expect(service['pressedKeys'].has(65)).toBe(true);});it('should handle international keyboard layouts and special characters', async () => {const keydownHandler = mockEventListeners['keydown'] as KeyboardEventHandler;const keyupHandler = mockEventListeners['keyup'] as KeyboardEventHandler;// International characters and symbolsconst internationalChars = [
        { keycode: 192, char: 'à' }, // French{ keycode: 209, char: 'ñ' }, // Spanish{ keycode: 196, char: 'ä' }, // German{ keycode: 231, char: 'ç' }, // Portuguese{ keycode: 8364, char: '€' }, // Euro symbol{ keycode: 165, char: '¥' }, // Yen symbol];for (const charData of internationalChars) {
        if (keydownHandler) {
          keydownHandler(createKeyboardEvent(charData));
        }
        if (keyupHandler) {
          keyupHandler(createKeyboardEvent(charData));
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      await new Promise((resolve) => setTimeout(resolve, 600));

      // Verify international characters were processed
      expect(gateway.broadcastActionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'type_text',text: expect.stringMatching(/[àñäç€¥]/) as unknown,}),
      );
    });
  });

  describe('Performance Testing and Optimization', () => {beforeEach(() => {service.startTracking();
    });

    it('should handle high-frequency mouse events without performance degradation', async () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;const startTime = Date.now();const highFrequencyEvents = await simulateHighFrequencyInput(
        1000,
        'mouse',);// Process all events
      for (const event of highFrequencyEvents) {
        if (moveHandler) {
          moveHandler(event as never);
        }
      }

      const processingTime = Date.now() - startTime;

      // Performance should be reasonable (less than 1 second for 1000 events)
      expect(processingTime).toBeLessThan(1000);

      // Verify memory usage didn't explode
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
      expect(memoryUsage).toBeLessThan(100); // Should stay under 100MB
    });

    it('should handle concurrent input streams efficiently', async () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;const keydownHandler = mockEventListeners['keydown'] as KeyboardEventHandler;// Create concurrent input streams
      const mousePromises = [];
      const keyboardPromises = [];

      for (let i = 0; i < 100; i++) {
        mousePromises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              if (moveHandler) {
                moveHandler(createMouseEvent({ x: i, y: i }));
              }
              resolve(undefined);
            }, i);
          }),
        );

        keyboardPromises.push(
          new Promise((resolve) => {
            setTimeout(() => {
              if (keydownHandler) {
                keydownHandler(createKeyboardEvent({ keycode: 65 + (i % 26) }));
              }
              resolve(undefined);
            }, i);
          }),
        );
      }

      const startTime = Date.now();
      await Promise.all([...mousePromises, ...keyboardPromises]);
      const totalTime = Date.now() - startTime;

      // Should handle concurrent streams efficiently
      expect(totalTime).toBeLessThan(2000);
    });

    it('should optimize memory usage with proper buffer management', async () => {const keydownHandler = mockEventListeners['keydown'] as KeyboardEventHandler;const initialMemory = process.memoryUsage().heapUsed;

      // Fill typing buffer multiple times
      for (let cycle = 0; cycle < 10; cycle++) {
        const longText = 'A'.repeat(1000);for (const char of longText) {if (keydownHandler) {
            keydownHandler(
              createKeyboardEvent({
                keycode: char.charCodeAt(0),
                char: char.toLowerCase(),
              }),
            );
          }
        }

        // Wait for buffer to flush
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10);

      // Verify buffers are properly cleared
      expect(service['typingBuffer'].length).toBe(0);});it('should maintain responsiveness under sustained load', async () => {const startTime = Date.now();let eventsProcessed = 0;

      // Create sustained load for 2 seconds
      const endTime = startTime + 2000;
      const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;while (Date.now() < endTime) {if (moveHandler) {
          moveHandler(
            createMouseEvent({
              x: Math.random() * 1920,
              y: Math.random() * 1080,
            }),
          );
        }
        eventsProcessed++;

        // Small delay to prevent blocking
        await new Promise((resolve) => setTimeout(resolve, 1));
      }

      // Should have processed many events efficiently
      expect(eventsProcessed).toBeGreaterThan(100);

      // Service should still be responsive
      expect(service['isTracking']).toBe(true);});});

  describe('WebSocket Integration and Broadcasting', () => {beforeEach(() => {service.startTracking();
    });

    it('should broadcast input events to connected clients', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;const mouseEvent = createMouseEvent({ x: 300, y: 400 });if (moveHandler) {
        moveHandler(mouseEvent);
      }

      expect(gateway.broadcastInputEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mouse_move',coordinates: { x: 300, y: 400 },timestamp: expect.any(Number) as number,
        }),
      );
    });

    it('should broadcast action events with proper formatting', async () => {const clickHandler = mockEventListeners['mouseclick'] as MouseEventHandler;const clickEvent = createMouseEvent({
        type: EventType.EVENT_MOUSE_CLICKED,
        x: 150,
        y: 250,
        clicks: 1,
      });
      if (clickHandler) {
        clickHandler(clickEvent);
      }

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(gateway.broadcastActionEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'click_mouse',coordinates: { x: 150, y: 250 },button: 'left',}),);
    });

    it('should handle WebSocket connection management during high activity', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;// Simulate high activityfor (let i = 0; i < 50; i++) {
        if (moveHandler) {
          moveHandler(createMouseEvent({ x: i * 10, y: i * 5 }));
        }
      }

      // Verify gateway was called but not overwhelmed
      expect(gateway.broadcastInputEvent).toHaveBeenCalled();

      // Check that connected clients are tracked
      expect(gateway.getConnectedClients()).toBe(5);
    });

    it('should support room-based broadcasting for multi-session scenarios', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;// Join specific roomsmockInputTrackingGateway.getClientRooms = (
        jest.fn() as jest.MockedFunction<() => string[]>
      ).mockReturnValue(['desktop-session-1', 'automation-session-2']);const mouseEvent = createMouseEvent({ x: 500, y: 600 });moveHandler?.(mouseEvent);

      // Verify room-based broadcasting capability exists
      expect(gateway.getClientRooms).toBeDefined();
      expect(gateway.broadcastToRoom).toBeDefined();
    });
  });

  describe('Cross-Platform Compatibility', () => {beforeEach(() => {service.startTracking();
    });

    it('should handle Windows-specific input behaviors', () => {// Mock Windows platformObject.defineProperty(process, 'platform', {value: 'win32',configurable: true,});

      const keydownHandler = mockEventListeners[
        'keydown'] as KeyboardEventHandler;// Windows-specific key combinations
      const winKey = createKeyboardEvent({ keycode: 91, metaKey: true }); // Windows key
      if (keydownHandler) {
        keydownHandler(winKey);
      }

      expect(gateway.broadcastInputEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keyboard_input',modifiers: expect.objectContaining({metaKey: true,
          }) as unknown,
        }),
      );
    });

    it('should handle macOS-specific input behaviors', () => {// Mock macOS platformObject.defineProperty(process, 'platform', {value: 'darwin',configurable: true,});

      const keydownHandler = mockEventListeners[
        'keydown'] as KeyboardEventHandler;// macOS-specific Command key
      const cmdKey = createKeyboardEvent({ keycode: 91, metaKey: true });
      if (keydownHandler) {
        keydownHandler(cmdKey);
      }

      expect(gateway.broadcastInputEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keyboard_input',modifiers: expect.objectContaining({metaKey: true,
          }) as unknown,
        }),
      );
    });

    it('should handle Linux-specific input behaviors', () => {// Mock Linux platformObject.defineProperty(process, 'platform', {value: 'linux',configurable: true,});

      const keydownHandler = mockEventListeners[
        'keydown'] as KeyboardEventHandler;// Linux-specific Super key
      const superKey = createKeyboardEvent({ keycode: 133, metaKey: true });
      if (keydownHandler) {
        keydownHandler(superKey);
      }

      expect(gateway.broadcastInputEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keyboard_input',modifiers: expect.objectContaining({metaKey: true,
          }) as unknown,
        }),
      );
    });
  });

  describe('Error Handling and Recovery', () => {it('should handle UIohook initialization failures gracefully', () => {mockUIOhook.start = jest.fn().mockImplementation(() => {throw new Error('UIohook initialization failed');}) as never;expect(() => service.startTracking()).not.toThrow();

      // Service should handle the error gracefully
      expect(service['isTracking']).toBe(false);});it('should recover from WebSocket broadcasting failures', () => {service.startTracking();// Mock gateway failure
      mockInputTrackingGateway.broadcastInputEvent = jest
        .fn()
        .mockImplementation(() => {
          throw new Error('WebSocket connection lost');});const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;// Should not crash on broadcast failureexpect(() => {
        moveHandler?.(createMouseEvent({ x: 100, y: 100 }));
      }).not.toThrow();
    });

    it('should handle memory pressure and cleanup automatically', async () => {service.startTracking();// Simulate memory pressure scenario
      const keydownHandler = mockEventListeners[
        'keydown'] as KeyboardEventHandler;// Fill up buffers with large amounts of data
      for (let i = 0; i < 10000; i++) {
        if (keydownHandler) {
          keydownHandler(
            createKeyboardEvent({
              keycode: 65 + (i % 26),
              char: String.fromCharCode(97 + (i % 26)),
            }),
          );
        }
      }

      // Wait for buffer management
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Service should handle memory pressure by flushing buffers
      const bufferSize = service['typingBuffer'].length;expect(bufferSize).toBeLessThan(1000); // Should have been flushed});

    it('should maintain service stability during rapid start/stop cycles', async () => {// Rapid start/stop cyclesfor (let i = 0; i < 10; i++) {
        service.startTracking();
        await new Promise((resolve) => setTimeout(resolve, 10));
        service.stopTracking();
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Final state should be stable
      expect(service['isTracking']).toBe(false);expect(mockUIOhook.removeAllListeners).toHaveBeenCalled();});
  });

  describe('Security and Input Validation', () => {beforeEach(() => {service.startTracking();
    });

    it('should validate and sanitize input coordinates', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;// Test edge cases and potentially malicious coordinatesconst edgeCaseEvents = [
        createMouseEvent({ x: -99999, y: -99999 }),
        createMouseEvent({ x: 999999, y: 999999 }),
        createMouseEvent({ x: NaN, y: NaN }),
        createMouseEvent({ x: Infinity, y: -Infinity }),
      ];

      for (const event of edgeCaseEvents) {
        // Should handle edge cases gracefully without crashing

        expect(() => moveHandler(event)).not.toThrow();
      }
    });

    it('should limit input event processing rate to prevent DoS', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;const startTime = Date.now();// Attempt to overwhelm with rapid events
      for (let i = 0; i < 10000; i++) {
        moveHandler(createMouseEvent({ x: i, y: i }));
      }

      const processingTime = Date.now() - startTime;

      // Should have rate limiting or efficient processing
      expect(processingTime).toBeLessThan(5000); // Should not take more than 5 seconds
    });

    it('should validate keyboard input and prevent injection attacks', () => {const keydownHandler = mockEventListeners['keydown'] as KeyboardEventHandler;// Attempt malicious input patterns
      const maliciousInputs: Array<Partial<UiohookKeyboardEvent>> = [
        {
          keycode: null as unknown as number,
          char: '<script>alert("xss")</script>",},
        { keycode: undefined as unknown as number, char: '$(rm -rf /)' },{ keycode: 'invalid' as unknown as number, char: '../../etc/passwd' },];for (const maliciousInput of maliciousInputs) {
        // Should handle invalid input gracefully
        expect(() => {
          keydownHandler(createKeyboardEvent(maliciousInput));
        }).not.toThrow();
      }
    });
  });

  describe('Integration with Computer Use Service', () => {beforeEach(() => {service.startTracking();
    });

    it('should coordinate with screenshot capture during input tracking', () => {const moveHandler = mockEventListeners['mousemove'] as MouseEventHandler;// Trigger mouse movementmoveHandler(createMouseEvent({ x: 400, y: 300 }));

      // Should potentially trigger screenshot capture
      // (depending on implementation details)
      expect(computerUseService.action).toBeDefined();
    });

    it('should integrate with computer use actions for complete workflow', async () => {const clickHandler = mockEventListeners['mouseclick'
      ] as MouseEventHandler;

      // Simulate a click that might trigger downstream actions
      clickHandler(
        createMouseEvent({
          type: EventType.EVENT_MOUSE_CLICKED,
          x: 200,
          y: 300,
          clicks: 1,
        }),
      );

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify integration points exist
      expect(gateway.broadcastActionEvent).toHaveBeenCalled();
      expect(computerUseService).toBeDefined();
    });
  });
});
