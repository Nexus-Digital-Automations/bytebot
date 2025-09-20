/**
 * InputCaptureService Unit Tests - Comprehensive Input Tracking and User Interaction Capture Testing
 *
 * Production-ready unit tests covering all InputCaptureService functionality:
 * - WebSocket connection management and lifecycle
 * - Input event capture from desktop application
 * - Action conversion to tool use blocks (click, drag, type, scroll)
 * - Message creation for captured user actions
 * - Socket event handling (connect, disconnect, screenshotAndAction, action)
 * - Configuration and environment setup
 * - Error handling and edge cases
 * - State management and capture control
 * - Safe property extraction utilities
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { TestingModule } from '@nestjs/testing';

import { ConfigService } from '@nestjs/config';

import { InputCaptureService } from '../input-capture.service';
import { MessagesService } from '../../messages/messages.service';
import { MessageRole } from '@prisma/client';
import {
  MessageContentType,
  UserActionContentBlock,
  ClickMouseAction,
  DragMouseAction,
  PressMouseAction,
  TypeKeysAction,
  PressKeysAction,
  TypeTextAction,
  ScrollAction,
} from '@bytebot/shared';

// Mock socket.io-client
const mockSocket = {
  connected: false,
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

// Mock UUID generation
const mockUUID = 'test-uuid-123';
jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => mockUUID),
}));

// Mock shared utility functions
jest.mock('@bytebot/shared', () => {
  const actual = jest.requireActual('@bytebot/shared');
  return {
    ...actual,
    convertClickMouseActionToToolUseBlock: jest.fn((action, id) => ({
      type: actual.MessageContentType._ToolUse,
      id,
      name: 'computer_click_mouse',
      input: action,
    })),
    convertDragMouseActionToToolUseBlock: jest.fn((action, id) => ({
      type: actual.MessageContentType._ToolUse,
      id,
      name: 'computer_drag_mouse',
      input: action,
    })),
    convertPressMouseActionToToolUseBlock: jest.fn((action, id) => ({
      type: actual.MessageContentType._ToolUse,
      id,
      name: 'computer_press_mouse',
      input: action,
    })),
    convertTypeKeysActionToToolUseBlock: jest.fn((action, id) => ({
      type: actual.MessageContentType._ToolUse,
      id,
      name: 'computer_type_keys',
      input: action,
    })),
    convertPressKeysActionToToolUseBlock: jest.fn((action, id) => ({
      type: actual.MessageContentType._ToolUse,
      id,
      name: 'computer_press_keys',
      input: action,
    })),
    convertTypeTextActionToToolUseBlock: jest.fn((action, id) => ({
      type: actual.MessageContentType._ToolUse,
      id,
      name: 'computer_type_text',
      input: action,
    })),
    convertScrollActionToToolUseBlock: jest.fn((action, id) => ({
      type: actual.MessageContentType._ToolUse,
      id,
      name: 'computer_scroll',
      input: action,
    })),
  };
});

import { io } from 'socket.io-client';
import { randomUUID } from 'crypto';
import {
  convertClickMouseActionToToolUseBlock,
  convertDragMouseActionToToolUseBlock,
  convertPressMouseActionToToolUseBlock,
  convertTypeKeysActionToToolUseBlock,
  convertPressKeysActionToToolUseBlock,
  convertTypeTextActionToToolUseBlock,
  convertScrollActionToToolUseBlock,
} from '@bytebot/shared';

describe('InputCaptureService', () => {
  let service: InputCaptureService;
  let messagesService: any;
  let configService: any;
  let logger: any;

  // Test data fixtures
  const mockTaskId = 'task-123';
  const mockBaseUrl = 'http://localhost:8080';

  const mockScreenshotData =
    '_data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const mockClickAction = {
    action: 'click_mouse',
    coordinates: { x: 100, y: 200 },
    button: 'left',
    clickCount: 1,
  };

  const mockDragAction = {
    action: 'drag_mouse',
    path: [
      { x: 100, y: 200 },
      { x: 150, y: 250 },
    ],
    button: 'left',
  };

  const mockPressMouseAction = {
    action: 'press_mouse',
    coordinates: { x: 300, y: 400 },
    button: 'right',
    press: 'down',
  };

  const mockTypeKeysAction = {
    action: 'type_keys',
    keys: ['ctrl', 'c'],
  };

  const mockPressKeysAction = {
    action: 'press_keys',
    keys: ['ctrl', 'v'],
    press: 'up',
  };

  const mockTypeTextAction = {
    action: 'type_text',
    text: 'Hello World',
  };

  const mockScrollAction = {
    action: 'scroll',
    coordinates: { x: 200, y: 300 },
    direction: 'down',
    scrollCount: 3,
  };

  beforeEach(async () => {
    // Create comprehensive mocks
    messagesService = {
      create: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      _error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InputCaptureService,
        {
          provide: MessagesService,
          useValue: messagesService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<InputCaptureService>(InputCaptureService);

    // Override the private logger property with our mock
    (service as any).logger = logger;

    // Setup default mocks
    configService.get.mockReturnValue(mockBaseUrl);
    messagesService.create.mockResolvedValue({ id: 'message-123' });
    mockSocket.connected = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset socket state
    mockSocket.connected = false;
    mockSocket.on.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.removeAllListeners.mockClear();
  });

  describe('Initialization and State Management', () => {
    it('should initialize with correct default state', () => {
      expect(service.isCapturing()).toBe(false);
    });

    it('should track capturing state correctly', () => {
      expect(service.isCapturing()).toBe(false);

      // Simulate connection
      service.start(mockTaskId);

      // Manually trigger connect event to set capturing state
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      if (connectHandler) connectHandler();

      expect(service.isCapturing()).toBe(true);
    });
  });

  describe('WebSocket Connection Management', () => {
    describe('start()', () => {
      it('should create new socket connection when starting', () => {
        service.start(mockTaskId);

        expect(io).toHaveBeenCalledWith(mockBaseUrl, {
          transports: ['websocket'],
        });
        expect(mockSocket.on).toHaveBeenCalledWith(
          'connect',
          expect.any(Function),
        );
        expect(mockSocket.on).toHaveBeenCalledWith(
          'screenshotAndAction',
          expect.any(Function),
        );
        expect(mockSocket.on).toHaveBeenCalledWith(
          'action',
          expect.any(Function),
        );
        expect(mockSocket.on).toHaveBeenCalledWith(
          'disconnect',
          expect.any(Function),
        );
      });

      it('should not create new connection when already connected and capturing', () => {
        // Setup initial connection
        mockSocket.connected = true;
        (service as any).capturing = true;
        (service as any).socket = mockSocket;

        const ioSpy = jest.mocked(io);
        ioSpy.mockClear();

        service.start(mockTaskId);

        expect(io).not.toHaveBeenCalled();
      });

      it('should reconnect existing socket when disconnected', () => {
        // Setup existing disconnected socket
        mockSocket.connected = false;
        (service as any).socket = mockSocket;

        service.start(mockTaskId);

        expect(mockSocket.connect).toHaveBeenCalled();
        expect(io).not.toHaveBeenCalled();
      });

      it('should handle missing base URL configuration', () => {
        configService.get.mockReturnValue(null);

        service.start(mockTaskId);

        expect(logger.warn).toHaveBeenCalledWith(
          'BYTEBOT_DESKTOP_BASE_URL missing.',
        );
        expect(io).not.toHaveBeenCalled();
      });

      it('should handle connect event properly', () => {
        service.start(mockTaskId);

        // Find and trigger connect event handler
        const connectHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'connect',
        )?.[1];

        expect(connectHandler).toBeDefined();
        connectHandler();

        expect(logger.log).toHaveBeenCalledWith('Input socket connected');
        expect(service.isCapturing()).toBe(true);
      });

      it('should handle disconnect event properly', () => {
        service.start(mockTaskId);

        // Trigger connect first
        const connectHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'connect',
        )?.[1];
        connectHandler();

        // Find and trigger disconnect event handler
        const disconnectHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'disconnect',
        )?.[1];

        expect(disconnectHandler).toBeDefined();
        disconnectHandler();

        expect(logger.log).toHaveBeenCalledWith('Input socket disconnected');
        expect(service.isCapturing()).toBe(false);
      });
    });

    describe('stop()', () => {
      it('should disconnect connected socket and cleanup', () => {
        // Setup connected socket
        mockSocket.connected = true;
        (service as any).socket = mockSocket;

        service.stop();

        expect(mockSocket.disconnect).toHaveBeenCalled();
        expect(service.isCapturing()).toBe(false);
      });

      it('should cleanup disconnected socket properly', () => {
        // Setup disconnected socket
        mockSocket.connected = false;
        (service as any).socket = mockSocket;

        service.stop();

        expect(mockSocket.disconnect).not.toHaveBeenCalled();
        expect(mockSocket.removeAllListeners).toHaveBeenCalled();
        expect(service.isCapturing()).toBe(false);
      });

      it('should handle no socket gracefully', () => {
        service.stop();

        expect(mockSocket.disconnect).not.toHaveBeenCalled();
        expect(mockSocket.removeAllListeners).not.toHaveBeenCalled();
      });
    });
  });

  describe('Screenshot and Action Event Handling', () => {
    beforeEach(() => {
      service.start(mockTaskId);
      // Set capturing state
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();
    });

    describe('screenshotAndAction event', () => {
      let screenshotAndActionHandler: any;

      beforeEach(() => {
        screenshotAndActionHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'screenshotAndAction',
        )?.[1];
      });

      it('should handle click_mouse action with screenshot', async () => {
        const shot = { image: mockScreenshotData };

        await screenshotAndActionHandler(shot, mockClickAction);

        expect(convertClickMouseActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'click_mouse',
            coordinates: { x: 100, y: 200 },
            button: 'left',
            clickCount: 1,
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalledWith({
          content: [
            {
              type: MessageContentType._UserAction,
              content: [
                {
                  type: MessageContentType._Image,
                  source: {
                    _data: mockScreenshotData,
                    media_type: 'image/png',
                    type: 'base64',
                  },
                },
                {
                  type: MessageContentType._ToolUse,
                  id: mockUUID,
                  name: 'computer_click_mouse',
                  input: {
                    action: 'click_mouse',
                    coordinates: { x: 100, y: 200 },
                    button: 'left',
                    clickCount: 1,
                  },
                },
              ],
            },
          ],
          role: MessageRole.USER,
          taskId: mockTaskId,
        });
      });

      it('should handle drag_mouse action with screenshot', async () => {
        const shot = { image: mockScreenshotData };

        await screenshotAndActionHandler(shot, mockDragAction);

        expect(convertDragMouseActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'drag_mouse',
            path: [
              { x: 100, y: 200 },
              { x: 150, y: 250 },
            ],
            button: 'left',
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: MessageContentType._UserAction,
                content: expect.arrayContaining([
                  expect.objectContaining({
                    type: MessageContentType._Image,
                    source: expect.objectContaining({
                      _data: mockScreenshotData,
                    }),
                  }),
                ]),
              }),
            ]),
          }),
        );
      });

      it('should ignore unsupported actions in screenshotAndAction', async () => {
        const shot = { image: mockScreenshotData };
        const unsupportedAction = { action: 'type_text', text: 'hello' };

        await screenshotAndActionHandler(shot, unsupportedAction);

        expect(messagesService.create).not.toHaveBeenCalled();
      });

      it('should not process when not capturing', async () => {
        // Stop capturing
        service.stop();

        const shot = { image: mockScreenshotData };
        await screenshotAndActionHandler(shot, mockClickAction);

        expect(messagesService.create).not.toHaveBeenCalled();
      });

      it('should handle click action with missing coordinates gracefully', async () => {
        const shot = { image: mockScreenshotData };
        const actionWithoutCoords = {
          action: 'click_mouse',
          button: 'left',
          clickCount: 1,
        };

        await screenshotAndActionHandler(shot, actionWithoutCoords);

        expect(convertClickMouseActionToToolUseBlock).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'click_mouse',
            coordinates: undefined,
            button: 'left',
            clickCount: 1,
          }),
          mockUUID,
        );
      });

      it('should use default values for missing properties', async () => {
        const shot = { image: mockScreenshotData };
        const minimalAction = { action: 'click_mouse' };

        await screenshotAndActionHandler(shot, minimalAction);

        expect(convertClickMouseActionToToolUseBlock).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'click_mouse',
            button: 'left', // default value
            clickCount: 1, // default value
          }),
          mockUUID,
        );
      });
    });
  });

  describe('Action Event Handling', () => {
    beforeEach(() => {
      service.start(mockTaskId);
      // Set capturing state
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();
    });

    describe('action event', () => {
      let actionHandler: any;

      beforeEach(() => {
        actionHandler = mockSocket.on.mock.calls.find(
          (call) => call[0] === 'action',
        )?.[1];
      });

      it('should handle drag_mouse action', async () => {
        await actionHandler(mockDragAction);

        expect(convertDragMouseActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'drag_mouse',
            path: [
              { x: 100, y: 200 },
              { x: 150, y: 250 },
            ],
            button: 'left',
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalledWith({
          content: [
            {
              type: MessageContentType._UserAction,
              content: [
                {
                  type: MessageContentType._ToolUse,
                  id: mockUUID,
                  name: 'computer_drag_mouse',
                  input: {
                    action: 'drag_mouse',
                    path: [
                      { x: 100, y: 200 },
                      { x: 150, y: 250 },
                    ],
                    button: 'left',
                  },
                },
              ],
            },
          ],
          role: MessageRole.USER,
          taskId: mockTaskId,
        });
      });

      it('should handle press_mouse action', async () => {
        await actionHandler(mockPressMouseAction);

        expect(convertPressMouseActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'press_mouse',
            coordinates: { x: 300, y: 400 },
            button: 'right',
            press: 'down',
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: MessageContentType._UserAction,
                content: expect.arrayContaining([
                  expect.objectContaining({
                    type: MessageContentType._ToolUse,
                    name: 'computer_press_mouse',
                  }),
                ]),
              }),
            ]),
          }),
        );
      });

      it('should handle type_keys action', async () => {
        await actionHandler(mockTypeKeysAction);

        expect(convertTypeKeysActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'type_keys',
            keys: ['ctrl', 'c'],
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                content: expect.arrayContaining([
                  expect.objectContaining({
                    name: 'computer_type_keys',
                  }),
                ]),
              }),
            ]),
          }),
        );
      });

      it('should handle press_keys action', async () => {
        await actionHandler(mockPressKeysAction);

        expect(convertPressKeysActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'press_keys',
            keys: ['ctrl', 'v'],
            press: 'up',
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalled();
      });

      it('should handle type_text action', async () => {
        await actionHandler(mockTypeTextAction);

        expect(convertTypeTextActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'type_text',
            text: 'Hello World',
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalled();
      });

      it('should handle scroll action', async () => {
        await actionHandler(mockScrollAction);

        expect(convertScrollActionToToolUseBlock).toHaveBeenCalledWith(
          {
            action: 'scroll',
            coordinates: { x: 200, y: 300 },
            direction: 'down',
            scrollCount: 3,
          },
          mockUUID,
        );

        expect(messagesService.create).toHaveBeenCalled();
      });

      it('should handle unknown actions gracefully', async () => {
        const unknownAction = { action: 'unknown_action' };

        await actionHandler(unknownAction);

        expect(logger.warn).toHaveBeenCalledWith(
          'Unknown action unknown_action',
        );
        expect(messagesService.create).not.toHaveBeenCalled();
      });

      it('should not process actions when not capturing', async () => {
        service.stop();

        await actionHandler(mockTypeTextAction);

        expect(messagesService.create).not.toHaveBeenCalled();
      });

      it('should handle actions with missing properties using defaults', async () => {
        const minimalScrollAction = {
          action: 'scroll',
          coordinates: { x: 100, y: 200 },
        };

        await actionHandler(minimalScrollAction);

        expect(convertScrollActionToToolUseBlock).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'scroll',
            coordinates: { x: 100, y: 200 },
            direction: 'up', // default
            scrollCount: 1, // default
          }),
          mockUUID,
        );
      });

      it('should handle empty action content gracefully', async () => {
        const emptyAction = { action: 'empty_test' };

        await actionHandler(emptyAction);

        expect(messagesService.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Safe Property Extraction Utilities', () => {
    beforeEach(() => {
      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();
    });

    it('should safely extract string properties with defaults', async () => {
      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      const actionWithoutButton = {
        action: 'press_mouse',
        coordinates: { x: 100, y: 200 },
        press: 'down',
      };

      await actionHandler(actionWithoutButton);

      expect(convertPressMouseActionToToolUseBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          button: 'left', // default for missing button
        }),
        mockUUID,
      );
    });

    it('should safely extract number properties with defaults', async () => {
      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      const actionWithoutScrollCount = {
        action: 'scroll',
        coordinates: { x: 100, y: 200 },
        direction: 'down',
      };

      await actionHandler(actionWithoutScrollCount);

      expect(convertScrollActionToToolUseBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          scrollCount: 1, // default for missing scrollCount
        }),
        mockUUID,
      );
    });

    it('should safely extract array properties with defaults', async () => {
      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      const actionWithoutKeys = {
        action: 'type_keys',
      };

      await actionHandler(actionWithoutKeys);

      expect(convertTypeKeysActionToToolUseBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          keys: [], // default for missing keys
        }),
        mockUUID,
      );
    });

    it('should safely extract coordinate properties', async () => {
      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      const actionWithInvalidCoords = {
        action: 'scroll',
        coordinates: 'invalid',
        direction: 'down',
      };

      await actionHandler(actionWithInvalidCoords);

      expect(convertScrollActionToToolUseBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: undefined, // invalid coordinates return undefined
        }),
        mockUUID,
      );
    });

    it('should handle null and undefined objects safely', async () => {
      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      // This should not throw errors
      await actionHandler(null);
      await actionHandler(undefined);

      expect(messagesService.create).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle MessagesService errors gracefully', async () => {
      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      messagesService.create.mockRejectedValue(
        new Error('Message creation failed'),
      );

      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      // Should not throw error
      await expect(actionHandler(mockTypeTextAction)).rejects.toThrow(
        'Message creation failed',
      );
    });

    it('should handle randomUUID generation errors', async () => {
      (randomUUID as jest.Mock).mockImplementation(() => {
        throw new Error('UUID generation failed');
      });

      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      await expect(actionHandler(mockTypeTextAction)).rejects.toThrow(
        'UUID generation failed',
      );
    });

    it('should handle malformed action data', async () => {
      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      const malformedAction = {
        action: 'type_text',
        text: { invalid: 'object' }, // Should be string
      };

      await actionHandler(malformedAction);

      expect(convertTypeTextActionToToolUseBlock).toHaveBeenCalledWith(
        expect.objectContaining({
          text: '', // default for invalid text property
        }),
        mockUUID,
      );
    });

    it('should handle empty task ID', async () => {
      service.start('');
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      await actionHandler(mockTypeTextAction);

      expect(messagesService.create).not.toHaveBeenCalled();
    });

    it('should maintain state consistency during errors', () => {
      // Start capturing
      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      expect(service.isCapturing()).toBe(true);

      // Stop and verify state
      service.stop();
      expect(service.isCapturing()).toBe(false);
    });
  });

  describe('Integration and Service Coordination', () => {
    it('should properly integrate with MessagesService for action storage', async () => {
      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      await actionHandler(mockTypeTextAction);

      expect(messagesService.create).toHaveBeenCalledWith({
        content: expect.arrayContaining([
          expect.objectContaining({
            type: MessageContentType._UserAction,
          }),
        ]),
        role: MessageRole.USER,
        taskId: mockTaskId,
      });
    });

    it('should properly coordinate with ConfigService for environment setup', () => {
      configService.get.mockReturnValue('http://custom-url:3000');

      service.start(mockTaskId);

      expect(configService.get).toHaveBeenCalledWith(
        'BYTEBOT_DESKTOP_BASE_URL',
      );
      expect(io).toHaveBeenCalledWith('http://custom-url:3000', {
        transports: ['websocket'],
      });
    });

    it('should generate unique IDs for multiple actions', async () => {
      const uuidSequence = ['uuid-1', 'uuid-2', 'uuid-3'];
      let callCount = 0;
      (randomUUID as jest.Mock).mockImplementation(
        () => uuidSequence[callCount++],
      );

      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      await actionHandler(mockTypeTextAction);
      await actionHandler(mockScrollAction);
      await actionHandler(mockTypeKeysAction);

      expect(convertTypeTextActionToToolUseBlock).toHaveBeenCalledWith(
        expect.any(Object),
        'uuid-1',
      );
      expect(convertScrollActionToToolUseBlock).toHaveBeenCalledWith(
        expect.any(Object),
        'uuid-2',
      );
      expect(convertTypeKeysActionToToolUseBlock).toHaveBeenCalledWith(
        expect.any(Object),
        'uuid-3',
      );
    });

    it('should handle concurrent action processing', async () => {
      service.start(mockTaskId);
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      connectHandler();

      const actionHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'action',
      )?.[1];

      // Process multiple actions simultaneously
      const promises = [
        actionHandler(mockTypeTextAction),
        actionHandler(mockScrollAction),
        actionHandler(mockTypeKeysAction),
      ];

      await Promise.all(promises);

      expect(messagesService.create).toHaveBeenCalledTimes(3);
    });
  });
});
