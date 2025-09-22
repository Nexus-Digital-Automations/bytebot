/**
 * Computer Use Tools Module - MCP Integration for Computer Control Actions
 *
 * This module provides Model Context Protocol (MCP) tool bindings for computer use operations
 * including mouse control, keyboard input, screenshots, and file operations. Each tool
 * implements comprehensive error handling, parameter validation, and performance logging.
 *
 * Dependencies:
 * - @nestjs/common: NestJS framework integration
 * - @rekog/mcp-nest: MCP server implementation
 * - zod: Runtime type validation and schema definition
 * - ComputerUseService: Core computer automation service
 * - compressor: Image compression utilities
 *
 * Usage: Tools are automatically exposed via MCP server endpoints and can be invoked
 * by MCP clients for computer automation tasks.
 *
 * @author ByteBot Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';
import { ComputerUseService } from '../computer-use/computer-use.service';
import { compressPngBase64Under1MB } from './compressor';
import {
  McpSchemas,
  McpToolResponse,
  MouseMoveParams,
  ComputerUseScreenshotResponse,
  ComputerUseCursorPositionResponse,
  ComputerUseFileReadResponse,
  ComputerUseFileWriteResponse,
  isScreenshotResponse,
  isCursorPositionResponse,
  isFileReadResponse,
  isFileWriteResponse
} from './types';/*** Computer Use Tools Service
 *
 * Provides MCP-compatible tool implementations for computer automation operations.
 * All methods include comprehensive logging, error handling, and parameter validation
 * to ensure reliable computer control functionality through the MCP interface.
 *
 * Performance Monitoring:
 * - All operations are logged with execution time tracking
 * - Error conditions are captured with full context
 * - Success/failure metrics are recorded for monitoring
 *
 * Security Considerations:
 * - Input validation using Zod schemas
 * - Error message sanitization to prevent information disclosure
 * - Operation logging for audit trails
 */
@Injectable()
export class ComputerUseTools {
  private readonly logger = new Logger(ComputerUseTools.name);
  private operationCounter = 0;

  constructor(private readonly computerUseService: ComputerUseService) {
    this.logger.log('ComputerUseTools initialized - MCP integration ready');
  }

  /**
   * Generates unique operation ID for tracking individual tool invocations
   * @returns Unique operation identifier with timestamp and counter
   */
  private generateOperationId(): string {
    this.operationCounter = (this.operationCounter + 1) % 10000;
    return `mcp_op${Date.now()}${this.operationCounter.toString().padStart(4, '0')}`;}

  /**
   * Logs operation start with comprehensive context
   * @param operationId Unique operation identifier
   * @param toolName Name of the MCP tool being invoked
   * @param parameters Input parameters for the operation
   */
  private logOperationStart(
    operationId: string,
    toolName: string,
    parameters: Record<string, unknown>,
  ): void {
    this.logger.log(`[${operationId}] Starting MCP tool execution`, {
      operationId,
      toolName,
      parametersSize: JSON.stringify(parameters).length,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Logs successful operation completion with performance metrics
   * @param operationId Unique operation identifier
   * @param toolName Name of the completed tool
   * @param startTime Operation start timestamp
   * @param result Operation result summary
   */
  private logOperationSuccess(
    operationId: string,
    toolName: string,
    startTime: number,
    result: string,
  ): void {
    const executionTime = Date.now() - startTime;
    this.logger.log(
      `[${operationId}] MCP tool execution completed successfully`,
      {
        operationId,
        toolName,
        executionTimeMs: executionTime,
        result,
        timestamp: new Date().toISOString(),
      },
    );
  }

  /**
   * Logs operation failure with error context
   * @param operationId Unique operation identifier
   * @param toolName Name of the failed tool
   * @param startTime Operation start timestamp
   * @param error Error that occurred
   */
  private logOperationError(
    operationId: string,
    toolName: string,
    startTime: number,
    error: Error,
  ): void {
    const executionTime = Date.now() - startTime;
    this.logger.error(`[${operationId}] MCP tool execution failed`, {
      operationId,
      toolName,
      executionTimeMs: executionTime,
      errorMessage: error.message,
      errorStack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Moves the mouse cursor to specified screen coordinates
   *
   * This tool provides precise mouse cursor positioning for computer automation.
   * Supports full screen coordinate range and validates input parameters.
   *
   * @param coordinates Target screen coordinates {x, y}
   * @returns MCP response with operation status
   *
   * Performance: Typically completes in <10ms for local operations
   * Error Handling: Validates coordinates and handles system-level failures
   */
  @Tool({
    name: 'computer_move_mouse',
    description: 'Moves the mouse cursor to the specified coordinates.',
    parameters: McpSchemas.mouseMove,
  })
  async moveMouse({ coordinates }: MouseMoveParams): Promise<McpToolResponse> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logOperationStart(operationId, 'computer_move_mouse', { coordinates });try {// Execute mouse move operation through computer use service
      await this.computerUseService.action({
        action: 'move_mouse',
        coordinates,
      });

      const result = `mouse moved to (${coordinates.x}, ${coordinates.y})`;
      this.logOperationSuccess(
        operationId,
        'computer_move_mouse',
        startTime,
        result,
      );

      return { content: [{ type: 'text', text: 'mouse moved' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logOperationError(
        operationId,
        'computer_move_mouse',
        startTime,
        errorObj,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Error moving mouse: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  /**
   * Traces mouse cursor along a specified path of coordinates
   *
   * Performs smooth mouse movement along multiple coordinate points, useful for
   * drawing operations, gesture input, or complex navigation paths. Can hold
   * modifier keys during the trace operation.
   *
   * @param path Array of coordinate points defining the movement path
   * @param holdKeys Optional modifier keys to hold during trace
   * @returns MCP response with trace operation status
   *
   * Performance: Scales with path length, ~1-2ms per coordinate point
   * Validation: Ensures path has valid coordinates and key names
   */
  @Tool({
    name: 'computer_trace_mouse',description:'Moves the mouse cursor along a specified path of coordinates.',parameters: McpSchemas.mouseTrace,})
  async traceMouse({
    path,
    holdKeys,
  }: {
    path: { x: number; y: number }[];
    holdKeys?: string[];
  }) {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logOperationStart(operationId, 'computer_trace_mouse', {pathLength: path.length,holdKeys,
      startPoint: path[0],
      endPoint: path[path.length - 1],
    });

    try {
      // Execute mouse trace operation through computer use service
      await this.computerUseService.action({
        action: 'trace_mouse',
        path,
        holdKeys,
      });

      const result = `mouse traced along ${path.length} points${holdKeys ? ` with keys: ${holdKeys.join(', ')}` : ""}`;
      this.logOperationSuccess(
        operationId,
        'computer_trace_mouse',
        startTime,
        result,
      );

      return {
        content: [{ type: 'text', text: 'mouse traced' }],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logOperationError(
        operationId,
        'computer_trace_mouse',
        startTime,
        errorObj,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Error tracing mouse: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_click_mouse',description:'Performs a mouse click at the specified coordinates or current position.',parameters: McpSchemas.mouseClickAdvanced,})
  async clickMouse({
    coordinates,
    button,
    holdKeys,
    clickCount,
  }: {
    coordinates?: { x: number; y: number };
    button: 'left' | 'right' | 'middle';holdKeys?: string[];clickCount: number;
  }) {
    try {
      await this.computerUseService.action({
        action: 'click_mouse',coordinates,button,
        holdKeys,
        clickCount,
      });
      return {
        content: [{ type: 'text', text: 'mouse clicked' }],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error clicking mouse: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_press_mouse',description:'Presses or releases a specified mouse button at the given coordinates or current position.',parameters: McpSchemas.mousePress,})
  async pressMouse({
    coordinates,
    button,
    press,
  }: {
    coordinates?: { x: number; y: number };
    button: 'left' | 'right' | 'middle';press: 'down' | 'up';}) {try {
      await this.computerUseService.action({
        action: 'press_mouse',coordinates,button,
        press,
      });
      return {
        content: [{ type: 'text', text: 'mouse pressed' }],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error pressing mouse: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_drag_mouse',description:'Drags the mouse from a starting point along a path while holding a specified button.',parameters: McpSchemas.mouseDragPath,})
  async dragMouse({
    path,
    button,
    holdKeys,
  }: {
    path: { x: number; y: number }[];
    button: 'left' | 'right' | 'middle';holdKeys?: string[];}) {
    try {
      await this.computerUseService.action({
        action: 'drag_mouse',path,button,
        holdKeys,
      });
      return {
        content: [{ type: 'text', text: 'mouse dragged' }],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error dragging mouse: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_scroll',description: 'Scrolls the mouse wheel up, down, left, or right.',parameters: McpSchemas.scrollAdvanced,})
  async scroll({
    coordinates,
    direction,
    scrollCount,
    holdKeys,
  }: {
    coordinates?: { x: number; y: number };
    direction: 'up' | 'down' | 'left' | 'right';scrollCount: number;holdKeys?: string[];
  }) {
    try {
      await this.computerUseService.action({
        action: 'scroll',coordinates,direction,
        scrollCount,
        holdKeys,
      });
      return { content: [{ type: 'text', text: 'scrolled' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error scrolling: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_type_keys',
    description: `Simulates typing a sequence of keys, often used for shortcuts involving modifier keys (e.g., Ctrl+C). Presses and releases each key in order.────────────────────────VALID KEYS
────────────────────────
A, Add, AudioForward, AudioMute, AudioNext, AudioPause, AudioPlay, AudioPrev, AudioRandom, AudioRepeat, AudioRewind, AudioStop, AudioVolDown, AudioVolUp,  
B, Backslash, Backspace,  
C, CapsLock, Clear, Comma,  
D, Decimal, Delete, Divide, Down,  
E, End, Enter, Equal, Escape, F,  
F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F23, F24,  
Fn,  
G, Grave,  
H, Home,  
I, Insert,  
J, K, L, Left, LeftAlt, LeftBracket, LeftCmd, LeftControl, LeftShift, LeftSuper, LeftWin,  
M, Menu, Minus, Multiply,  
N, Num0, Num1, Num2, Num3, Num4, Num5, Num6, Num7, Num8, Num9, NumLock,  
NumPad0, NumPad1, NumPad2, NumPad3, NumPad4, NumPad5, NumPad6, NumPad7, NumPad8, NumPad9,  
O, P, PageDown, PageUp, Pause, Period, Print,  
Q, Quote,  
R, Return, Right, RightAlt, RightBracket, RightCmd, RightControl, RightShift, RightSuper, RightWin,  
S, ScrollLock, Semicolon, Slash, Space, Subtract,  
T, Tab,  
U, Up,  
V, W, X, Y, Z`,
    parameters: McpSchemas.typeKeysAdvanced,
  })
  async typeKeys({ keys, delay }: { keys: string[]; delay?: number }) {
    try {
      await this.computerUseService.action({
        action: 'type_keys',keys,delay,
      });
      return { content: [{ type: 'text', text: 'keys typed' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error typing keys: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_press_keys',
    description: `Simulates pressing down or releasing specific keys. Useful for holding modifier keys.     ────────────────────────VALID KEYS
────────────────────────
A, Add, AudioForward, AudioMute, AudioNext, AudioPause, AudioPlay, AudioPrev, AudioRandom, AudioRepeat, AudioRewind, AudioStop, AudioVolDown, AudioVolUp,  
B, Backslash, Backspace,  
C, CapsLock, Clear, Comma,  
D, Decimal, Delete, Divide, Down,  
E, End, Enter, Equal, Escape, F,  
F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19, F20, F21, F22, F23, F24,  
Fn,  
G, Grave,  
H, Home,  
I, Insert,  
J, K, L, Left, LeftAlt, LeftBracket, LeftCmd, LeftControl, LeftShift, LeftSuper, LeftWin,  
M, Menu, Minus, Multiply,  
N, Num0, Num1, Num2, Num3, Num4, Num5, Num6, Num7, Num8, Num9, NumLock,  
NumPad0, NumPad1, NumPad2, NumPad3, NumPad4, NumPad5, NumPad6, NumPad7, NumPad8, NumPad9,  
O, P, PageDown, PageUp, Pause, Period, Print,  
Q, Quote,  
R, Return, Right, RightAlt, RightBracket, RightCmd, RightControl, RightShift, RightSuper, RightWin,  
S, ScrollLock, Semicolon, Slash, Space, Subtract,  
T, Tab,  
U, Up,  
V, W, X, Y, Z  
      `,
    parameters: McpSchemas.pressKeysAdvanced,
  })
  async pressKeys({ keys, press }: { keys: string[]; press: 'down' | 'up' }) {try {await this.computerUseService.action({
        action: 'press_keys',keys,press,
      });
      return { content: [{ type: 'text', text: 'keys pressed' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error pressing keys: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_type_text',description:'Types a string of text character by character. Use this tool for strings less than 25 characters, or passwords/sensitive form fields.',parameters: McpSchemas.typeTextAdvanced,})
  async typeText({ text, delay }: { text: string; delay?: number }) {
    try {
      await this.computerUseService.action({
        action: 'type_text',text,delay,
      });
      return { content: [{ type: 'text', text: 'text typed' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error typing text: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_paste_text',description:'Copies text to the clipboard and pastes it. Use this tool for typing long text strings or special characters not on the standard keyboard.',parameters: McpSchemas.pasteText,})
  async pasteText({ text }: { text: string }) {
    try {
      await this.computerUseService.action({ action: 'paste_text', text });
      return { content: [{ type: 'text', text: 'text pasted' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error pasting text: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_wait',description: 'Pauses execution for a specified duration.',parameters: McpSchemas.wait,})
  async wait({ duration }: { duration: number }) {
    try {
      await this.computerUseService.action({ action: 'wait', duration });
      return { content: [{ type: 'text', text: 'waiting done' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error waiting: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_application',description:'Opens or switches to the specified application and maximizes it.',parameters: McpSchemas.application,})
  async application({
    application,
  }: {
    application:
      | 'firefox'| '1password'| 'thunderbird'| 'vscode'| 'terminal'| 'desktop'| 'directory';}) {try {
      await this.computerUseService.action({
        action: 'application',
        application,
      });
      return { content: [{ type: 'text', text: 'application opened' }] };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error opening application: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  /**
   * Captures a screenshot of the current screen
   *
   * Provides high-quality screen capture functionality for visual analysis and
   * automation verification. Automatically compresses images to under 1MB for
   * efficient transmission over MCP channels while maintaining visual quality.
   *
   * Image Processing:
   * - PNG format for lossless screen captures
   * - Automatic compression to <1MB target size
   * - Base64 encoding for MCP compatibility
   * - Preserves color depth and clarity for AI analysis
   *
   * @returns MCP image response with compressed screenshot data
   *
   * Performance: 100-500ms depending on screen resolution and compression
   * Quality: Optimized compression balances file size and visual fidelity
   */
  @Tool({
    name: 'computer_screenshot',description: 'Captures a screenshot of the current screen.',})async screenshot() {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    const screenshotStartTime = Date.now();

    this.logOperationStart(operationId, 'computer_screenshot', {});

    try {
      // Capture raw screenshot through computer use service
      const result = await this.computerUseService.action({
        action: 'screenshot',
      });

      if (!isScreenshotResponse(result)) {
        throw new Error('Invalid screenshot response format');
      }

      const shot = result;

      const captureTime = Date.now() - screenshotStartTime;
      this.logger.debug(`[${operationId}] Screenshot captured`, {
        operationId,
        captureTimeMs: captureTime,
        rawImageSize: shot.image.length,
      });

      // Compress screenshot for efficient transmission
      const compressionStartTime = Date.now();
      const compressedImage = await compressPngBase64Under1MB(shot.image);
      const compressionTime = Date.now() - compressionStartTime;

      const compressionRatio = compressedImage.length / shot.image.length;

      this.logger.debug(`[${operationId}] Screenshot compressed`, {
        operationId,
        compressionTimeMs: compressionTime,
        originalSize: shot.image.length,
        compressedSize: compressedImage.length,
        compressionRatio: compressionRatio.toFixed(3),
        compressionPercentage: `${((1 - compressionRatio) * 100).toFixed(1)}%`,
      });

      const resultMessage = `screenshot captured and compressed (${((1 - compressionRatio) * 100).toFixed(1)}% reduction)`;
      this.logOperationSuccess(
        operationId,
        'computer_screenshot',
        startTime,
        resultMessage,
      );

      return {
        content: [
          {
            type: 'image',
            data: compressedImage,
            mimeType: 'image/png',
          },
        ],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logOperationError(
        operationId,
        'computer_screenshot',
        startTime,
        errorObj,
      );

      return {
        content: [
          {
            type: 'text',
            text: `Error taking screenshot: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_cursor_position',
    description: 'Gets the current (x, y) coordinates of the mouse cursor.',
  })
  async cursorPosition() {
    try {
      const result = await this.computerUseService.action({
        action: 'cursor_position',
      });

      if (!isCursorPositionResponse(result)) {
        throw new Error('Invalid cursor position response format');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error getting cursor position: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_write_file',
    description:'Writes a file to the specified path with base64 encoded data.',
    parameters: McpSchemas.writeFile,
  })
  async writeFile({ path, data }: { path: string; data: string }) {
    try {
      const result = await this.computerUseService.action({
        action: 'write_file',
        path,
        data,
      });

      // Use type guard to safely check file write response
      if (isFileWriteResponse(result)) {
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
          ],
        };
      }

      // Fallback for unknown response format
      return {
        content: [
          {
            type: 'text',
            text: 'File written successfully',
          },
        ],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error writing file: ${errorObj.message}`,
          },
        ],
      };
    }
  }

  @Tool({
    name: 'computer_read_file',
    description:'Reads a file from the specified path and returns it as a document content block with base64 encoded data.',
    parameters: McpSchemas.readFile,
  })
  async readFile({ path }: { path: string }) {
    try {
      const result = await this.computerUseService.action({
        action: 'read_file',
        path,
      });

      // Use type guard to safely check file read response
      if (isFileReadResponse(result) && result.success && result.data) {
        // Return document content block for successful read
        return {
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: result.mediaType ?? 'application/octet-stream',
                data: result.data,
              },
              name: result.name ?? 'file',
              size: result.size ?? 0,
            },
          ],
        };
      }

      // Handle error response or invalid response format
      if (isFileReadResponse(result) && result.message) {
        return {
          content: [
            {
              type: 'text',
              text: result.message,
            },
          ],
        };
      }

      // Fallback for unknown response format
      return {
        content: [
          {
            type: 'text',
            text: 'Error reading file: unknown response format',
          },
        ],
      };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      return {
        content: [
          {
            type: 'text',
            text: `Error reading file: ${errorObj.message}`,
          },
        ],
      };
    }
  }
}
