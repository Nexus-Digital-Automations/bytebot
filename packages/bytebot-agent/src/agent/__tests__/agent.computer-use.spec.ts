/**
 * AgentComputerUse Unit Tests - Comprehensive Computer Tool Integration Testing
 *
 * Production-ready unit tests covering all AgentComputerUse functionality:
 * - Computer tool use handling and command execution
 * - Mouse actions (move, click, drag, press, scroll)
 * - Keyboard actions (type keys, press keys, type text, paste text)
 * - Screen capture and cursor position detection
 * - File operations (read, write)
 * - Application control and window management
 * - Tool result block generation and error handling
 * - API communication with desktop application
 * - Type guards and response validation
 * - Network error handling and resilience
 * - Performance optimization and resource management
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Logger } from '@nestjs/common';
import { handleComputerToolUse, writeFile } from '../agent.computer-use';
import {
  MessageContentType,
  ComputerToolUseContentBlock,
} from '@bytebot/shared';

// Mock global fetch
global.fetch = jest.fn();

// Mock process.env
const mockEnv = {
  BYTEBOT_DESKTOP_BASE_URL: 'http://localhost:8080',
};
Object.defineProperty(process, 'env', {
  value: mockEnv,
});

describe('AgentComputerUse', () => {
  let logger: any;

  const mockBaseUrl = 'http://localhost:8080';

  // Mock successful responses
  const mockScreenshotResponse = {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      image: 'base64-encoded-screenshot-data',
    }),
  };

  const mockCursorPositionResponse = {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      x: 150,
      y: 250,
    }),
  };

  const mockSuccessResponse = {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({}),
  };

  const mockReadFileResponse = {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      success: true,
      data: 'base64-file-content',
      name: 'test-file.txt',
      size: 1024,
      mediaType: 'text/plain',
    }),
  };

  const mockWriteFileResponse = {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({
      success: true,
      message: 'File written successfully',
    }),
  };

  beforeEach(() => {
    // Create mock logger
    logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Setup default successful mocks
    (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Screenshot Tool Use', () => {
    it('should handle screenshot tool use successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockScreenshotResponse);

      const screenshotBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'screenshot-123',
        name: 'computer_screenshot',
        input: {},
      };

      const result = await handleComputerToolUse(screenshotBlock, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        'Handling computer tool use: computer_screenshot, tool_use_id: screenshot-123',
      );
      expect(logger.debug).toHaveBeenCalledWith(
        'Processing screenshot request',
      );
      expect(logger.debug).toHaveBeenCalledWith('Taking screenshot');
      expect(logger.debug).toHaveBeenCalledWith(
        'Screenshot captured successfully',
      );

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'screenshot' }),
      });

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'screenshot-123',
        content: [
          {
            type: MessageContentType._Image,
            source: {
              data: 'base64-encoded-screenshot-data',
              media_type: 'image/png',
              type: 'base64',
            },
          },
        ],
      });
    });

    it('should handle screenshot tool use failures', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

      const screenshotBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'screenshot-failed-123',
        name: 'computer_screenshot',
        input: {},
      };

      const result = await handleComputerToolUse(screenshotBlock, logger);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Screenshot failed:'),
        expect.any(String),
      );

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'screenshot-failed-123',
        content: [
          {
            type: MessageContentType._Text,
            text: 'ERROR: Failed to take screenshot',
          },
        ],
        is_error: true,
      });
    });

    it('should handle invalid screenshot response format', async () => {
      const invalidResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          data: 'invalid-format',
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(invalidResponse);

      const screenshotBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'screenshot-invalid-123',
        name: 'computer_screenshot',
        input: {},
      };

      const result = await handleComputerToolUse(screenshotBlock, logger);

      expect(result.is_error).toBe(true);
      expect(result.content[0]).toEqual({
        type: MessageContentType._Text,
        text: 'ERROR: Failed to take screenshot',
      });
    });
  });

  describe('Cursor Position Tool Use', () => {
    it('should handle cursor position tool use successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockCursorPositionResponse);

      const cursorBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'cursor-123',
        name: 'computer_cursor_position',
        input: {},
      };

      const result = await handleComputerToolUse(cursorBlock, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        'Processing cursor position request',
      );
      expect(logger.debug).toHaveBeenCalledWith('Getting cursor position');
      expect(logger.debug).toHaveBeenCalledWith(
        'Cursor position obtained: 150, 250',
      );

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cursor_position' }),
      });

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'cursor-123',
        content: [
          {
            type: MessageContentType._Text,
            text: 'Cursor position: 150, 250',
          },
        ],
      });
    });

    it('should handle cursor position tool use failures', async () => {
      const networkError = new Error('Network connection failed');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      const cursorBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'cursor-failed-123',
        name: 'computer_cursor_position',
        input: {},
      };

      const result = await handleComputerToolUse(cursorBlock, logger);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Getting cursor position failed:'),
        expect.any(String),
      );

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'cursor-failed-123',
        content: [
          {
            type: MessageContentType._Text,
            text: 'ERROR: Failed to get cursor position',
          },
        ],
        is_error: true,
      });
    });

    it('should handle invalid cursor position response format', async () => {
      const invalidResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          position: { x: 150, y: 250 },
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(invalidResponse);

      const cursorBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'cursor-invalid-123',
        name: 'computer_cursor_position',
        input: {},
      };

      const result = await handleComputerToolUse(cursorBlock, logger);

      expect(result.is_error).toBe(true);
      expect(result.content[0]).toEqual({
        type: MessageContentType._Text,
        text: 'ERROR: Failed to get cursor position',
      });
    });
  });

  describe('Mouse Action Tool Use', () => {
    it('should handle click mouse tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse) // For click action
        .mockResolvedValueOnce(mockScreenshotResponse); // For screenshot

      const clickBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'click-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 1,
        },
      };

      const result = await handleComputerToolUse(clickBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'click_mouse',
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 1,
        }),
      });

      expect(result.type).toBe(MessageContentType._ToolResult);
      expect(result.tool_use_id).toBe('click-123');
      expect(result.content).toHaveLength(2); // Text + Image
      expect(result.content[0]).toEqual({
        type: MessageContentType._Text,
        text: 'Tool executed successfully',
      });
      expect(result.content[1]).toEqual({
        type: MessageContentType._Image,
        source: {
          data: 'base64-encoded-screenshot-data',
          media_type: 'image/png',
          type: 'base64',
        },
      });
    });

    it('should handle drag mouse tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const dragBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'drag-123',
        name: 'computer_drag_mouse',
        input: {
          path: [
            { x: 100, y: 200 },
            { x: 150, y: 250 },
          ],
          button: 'left',
        },
      };

      const result = await handleComputerToolUse(dragBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'drag_mouse',
          path: [
            { x: 100, y: 200 },
            { x: 150, y: 250 },
          ],
          button: 'left',
        }),
      });

      expect(result.tool_use_id).toBe('drag-123');
      expect(result.content).toHaveLength(2);
    });

    it('should handle move mouse tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const moveBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'move-123',
        name: 'computer_move_mouse',
        input: {
          coordinates: { x: 300, y: 400 },
        },
      };

      const result = await handleComputerToolUse(moveBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_mouse',
          coordinates: { x: 300, y: 400 },
        }),
      });

      expect(result.tool_use_id).toBe('move-123');
    });

    it('should handle press mouse tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const pressBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'press-123',
        name: 'computer_press_mouse',
        input: {
          coordinates: { x: 200, y: 300 },
          button: 'right',
          press: 'down',
        },
      };

      const result = await handleComputerToolUse(pressBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'press_mouse',
          coordinates: { x: 200, y: 300 },
          button: 'right',
          press: 'down',
        }),
      });

      expect(result.tool_use_id).toBe('press-123');
    });

    it('should handle scroll tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const scrollBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'scroll-123',
        name: 'computer_scroll',
        input: {
          coordinates: { x: 500, y: 600 },
          direction: 'down',
          scrollCount: 3,
        },
      };

      const result = await handleComputerToolUse(scrollBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scroll',
          coordinates: { x: 500, y: 600 },
          direction: 'down',
          scrollCount: 3,
        }),
      });

      expect(result.tool_use_id).toBe('scroll-123');
    });
  });

  describe('Keyboard Action Tool Use', () => {
    it('should handle type keys tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const typeKeysBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'type-keys-123',
        name: 'computer_type_keys',
        input: {
          keys: ['ctrl', 'c'],
          delay: 100,
        },
      };

      const result = await handleComputerToolUse(typeKeysBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'type_keys',
          keys: ['ctrl', 'c'],
          delay: 100,
        }),
      });

      expect(result.tool_use_id).toBe('type-keys-123');
    });

    it('should handle press keys tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const pressKeysBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'press-keys-123',
        name: 'computer_press_keys',
        input: {
          keys: ['shift', 'tab'],
          press: 'up',
        },
      };

      const result = await handleComputerToolUse(pressKeysBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'press_keys',
          keys: ['shift', 'tab'],
          press: 'up',
        }),
      });

      expect(result.tool_use_id).toBe('press-keys-123');
    });

    it('should handle type text tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const typeTextBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'type-text-123',
        name: 'computer_type_text',
        input: {
          text: 'Hello World',
          delay: 50,
        },
      };

      const result = await handleComputerToolUse(typeTextBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'type_text',
          text: 'Hello World',
          delay: 50,
        }),
      });

      expect(result.tool_use_id).toBe('type-text-123');
    });

    it('should handle paste text tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const pasteTextBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'paste-text-123',
        name: 'computer_paste_text',
        input: {
          text: 'Pasted content',
        },
      };

      const result = await handleComputerToolUse(pasteTextBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'paste_text',
          text: 'Pasted content',
        }),
      });

      expect(result.tool_use_id).toBe('paste-text-123');
    });
  });

  describe('File Operations Tool Use', () => {
    it('should handle read file tool use successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockReadFileResponse);

      const readFileBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'read-file-123',
        name: 'computer_read_file',
        input: {
          path: '/path/to/test-file.txt',
        },
      };

      const result = await handleComputerToolUse(readFileBlock, logger);

      expect(logger.debug).toHaveBeenCalledWith(
        'Reading file: /path/to/test-file.txt',
      );

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read_file',
          path: '/path/to/test-file.txt',
        }),
      });

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'read-file-123',
        content: [
          {
            type: MessageContentType._Document,
            source: {
              type: 'base64',
              media_type: 'text/plain',
              data: 'base64-file-content',
            },
            name: 'test-file.txt',
            size: 1024,
          },
        ],
      });
    });

    it('should handle read file tool use failures', async () => {
      const failedReadResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: false,
          message: 'File not found',
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(failedReadResponse);

      const readFileBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'read-file-failed-123',
        name: 'computer_read_file',
        input: {
          path: '/nonexistent/file.txt',
        },
      };

      const result = await handleComputerToolUse(readFileBlock, logger);

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'read-file-failed-123',
        content: [
          {
            type: MessageContentType._Text,
            text: 'File not found',
          },
        ],
        is_error: true,
      });
    });

    it('should handle write file function directly', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockWriteFileResponse);

      const result = await writeFile({
        path: '/path/to/output.txt',
        content: 'base64-encoded-content',
      });

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'write_file',
          path: '/path/to/output.txt',
          data: 'base64-encoded-content',
        }),
      });

      expect(result).toEqual({
        success: true,
        message: 'File written successfully',
      });
    });

    it('should handle write file function failures', async () => {
      const networkError = new Error('Network connection failed');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      const result = await writeFile({
        path: '/path/to/output.txt',
        content: 'base64-encoded-content',
      });

      expect(result).toEqual({
        success: false,
        message: 'Error writing file: Network connection failed',
      });
    });
  });

  describe('Utility Tool Use', () => {
    it('should handle wait tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const waitBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'wait-123',
        name: 'computer_wait',
        input: {
          duration: 500,
        },
      };

      const result = await handleComputerToolUse(waitBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'wait',
          duration: 500,
        }),
      });

      expect(result.tool_use_id).toBe('wait-123');
    });

    it('should handle application tool use successfully', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const appBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'app-123',
        name: 'computer_application',
        input: {
          application: 'firefox',
        },
      };

      const result = await handleComputerToolUse(appBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'application',
          application: 'firefox',
        }),
      });

      expect(result.tool_use_id).toBe('app-123');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle tool execution failures with proper error response', async () => {
      const networkError = new Error('Connection timeout');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);

      const clickBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'click-error-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 1,
        },
      };

      const result = await handleComputerToolUse(clickBlock, logger);

      expect(logger.error).toHaveBeenCalledWith(
        'Error executing computer_click_mouse tool: Connection timeout',
        networkError.stack,
      );

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'click-error-123',
        content: [
          {
            type: MessageContentType._Text,
            text: 'Error executing computer_click_mouse tool: Connection timeout',
          },
        ],
        is_error: true,
      });
    });

    it('should handle screenshot failure during tool execution', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse) // Tool execution succeeds
        .mockRejectedValueOnce(new Error('Screenshot failed')); // Screenshot fails

      const clickBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'click-screenshot-fail-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 1,
        },
      };

      const result = await handleComputerToolUse(clickBlock, logger);

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to take screenshot',
        expect.any(Error),
      );

      expect(result).toEqual({
        type: MessageContentType._ToolResult,
        tool_use_id: 'click-screenshot-fail-123',
        content: [
          {
            type: MessageContentType._Text,
            text: 'Tool executed successfully',
          },
        ],
      });
    });

    it('should handle unknown tool types gracefully', async () => {
      const unknownBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'unknown-123',
        name: 'unknown_tool' as any,
        input: {},
      };

      const result = await handleComputerToolUse(unknownBlock, logger);

      expect(result.tool_use_id).toBe('unknown-123');
      expect(result.content[0]).toEqual({
        type: MessageContentType._Text,
        text: 'Tool executed successfully',
      });
    });

    it('should handle malformed input data', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const malformedBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'malformed-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: null,
          button: undefined,
          clickCount: 'invalid',
        } as any,
      };

      const result = await handleComputerToolUse(malformedBlock, logger);

      // Should still execute without throwing
      expect(result.tool_use_id).toBe('malformed-123');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should handle HTTP error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };
      (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

      const clickBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'http-error-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 1,
        },
      };

      const result = await handleComputerToolUse(clickBlock, logger);

      expect(result.is_error).toBe(true);
      expect(result.content[0].text).toContain(
        'Error executing computer_click_mouse tool',
      );
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle multiple concurrent tool operations', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValue(mockSuccessResponse)
        .mockResolvedValue(mockScreenshotResponse);

      const blocks = Array.from({ length: 5 }, (_, i) => ({
        type: MessageContentType._ToolUse,
        id: `concurrent-${i}`,
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 100 + i * 10, y: 200 + i * 10 },
          button: 'left',
          clickCount: 1,
        },
      })) as ComputerToolUseContentBlock[];

      const promises = blocks.map((block) =>
        handleComputerToolUse(block, logger),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.tool_use_id).toBe(`concurrent-${i}`);
      });

      expect(global.fetch).toHaveBeenCalledTimes(10); // 5 actions + 5 screenshots
    });

    it('should handle large file operations efficiently', async () => {
      const largeFileResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: 'A'.repeat(100000), // Large base64 content
          name: 'large-file.bin',
          size: 100000,
          mediaType: 'application/octet-stream',
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(largeFileResponse);

      const readLargeFileBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'read-large-123',
        name: 'computer_read_file',
        input: {
          path: '/path/to/large-file.bin',
        },
      };

      const startTime = Date.now();
      const result = await handleComputerToolUse(readLargeFileBlock, logger);
      const endTime = Date.now();

      expect(result.content[0].type).toBe(MessageContentType._Document);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should properly handle screenshot delay timing', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const clickBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'timing-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 1,
        },
      };

      const resultPromise = handleComputerToolUse(clickBlock, logger);

      // Fast-forward through the 750ms delay
      jest.advanceTimersByTime(750);

      const result = await resultPromise;

      expect(logger.debug).toHaveBeenCalledWith(
        'Waiting 750ms before taking screenshot',
      );
      expect(result.tool_use_id).toBe('timing-123');

      jest.useRealTimers();
    });
  });

  describe('Integration and API Communication', () => {
    it('should use correct base URL from environment', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockSuccessResponse)
        .mockResolvedValueOnce(mockScreenshotResponse);

      const clickBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'env-test-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 100, y: 200 },
          button: 'left',
          clickCount: 1,
        },
      };

      await handleComputerToolUse(clickBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/computer-use',
        expect.any(Object),
      );
    });

    it('should properly format API request payloads', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse);

      const complexBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'complex-123',
        name: 'computer_drag_mouse',
        input: {
          path: [
            { x: 100, y: 200 },
            { x: 150, y: 250 },
            { x: 200, y: 300 },
          ],
          button: 'left',
          holdKeys: ['shift', 'ctrl'],
        },
      };

      await handleComputerToolUse(complexBlock, logger);

      expect(global.fetch).toHaveBeenCalledWith(`${mockBaseUrl}/computer-use`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'drag_mouse',
          path: [
            { x: 100, y: 200 },
            { x: 150, y: 250 },
            { x: 200, y: 300 },
          ],
          button: 'left',
          holdKeys: ['shift', 'ctrl'],
        }),
      });
    });

    it('should handle API response validation correctly', async () => {
      const invalidJsonResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      };
      (global.fetch as jest.Mock).mockResolvedValue(invalidJsonResponse);

      const screenshotBlock: ComputerToolUseContentBlock = {
        type: MessageContentType._ToolUse,
        id: 'invalid-json-123',
        name: 'computer_screenshot',
        input: {},
      };

      const result = await handleComputerToolUse(screenshotBlock, logger);

      expect(result.is_error).toBe(true);
      expect(result.content[0].text).toBe('ERROR: Failed to take screenshot');
    });
  });
});
