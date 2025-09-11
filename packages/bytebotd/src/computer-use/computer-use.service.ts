/**
 * Computer Use Service - Enterprise-grade computer automation service
 *
 * Provides comprehensive computer control capabilities including:
 * - Mouse and keyboard automation with precise timing control
 * - Screenshot capture for visual feedback
 * - File system operations with secure path handling
 * - Application lifecycle management with window control
 * - Performance monitoring and structured logging
 *
 * Dependencies: NutService (native automation for Linux X11/XFCE desktop)
 * Security: All file operations use secure path resolution and permission handling
 * Performance: Includes comprehensive timing metrics and operation tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { NutService } from '../nut/nut.service';
import {
  ComputerAction,
  MoveMouseAction,
  TraceMouseAction,
  ClickMouseAction,
  PressMouseAction,
  DragMouseAction,
  _ScrollAction,
  _TypeKeysAction,
  PressKeysAction,
  TypeTextAction,
  _ApplicationAction,
  Application,
  _PasteTextAction,
  WriteFileAction,
  _ReadFileAction,
} from '@bytebot/shared';

// ===== ENTERPRISE-GRADE TYPE DEFINITIONS =====

/**
 * Comprehensive error interface for structured error handling
 * Provides detailed error context for debugging and monitoring
 */
export interface ComputerServiceError {
  readonly code: string;
  readonly message: string;
  readonly operationId: string;
  readonly timestamp: Date;
  readonly context: Record<string, unknown>;
  readonly stack?: string;
  readonly originalError?: Error;
}

/**
 * Screenshot response interface with comprehensive metadata
 * Includes performance metrics and operation tracking
 */
export interface ScreenshotResult {
  readonly image: string; // Base64 encoded image data
  readonly metadata?: {
    readonly width?: number;
    readonly height?: number;
    readonly format?: string;
    readonly captureTime: Date;
    readonly operationId: string;
  };
}

/**
 * Cursor position result with precise coordinate data
 */
export interface CursorPositionResult {
  readonly x: number;
  readonly y: number;
  readonly timestamp: Date;
  readonly operationId: string;
}

/**
 * File operation result interface for write operations
 * Provides detailed success/failure information with security context
 */
export interface FileWriteResult {
  readonly success: boolean;
  readonly message: string;
  readonly path?: string;
  readonly size?: number;
  readonly operationId: string;
  readonly timestamp: Date;
}

/**
 * File operation result interface for read operations
 * Includes comprehensive file metadata and content information
 */
export interface FileReadResult {
  readonly success: boolean;
  readonly data?: string; // Base64 encoded file data
  readonly name?: string;
  readonly size?: number;
  readonly mediaType?: string;
  readonly lastModified?: Date;
  readonly operationId: string;
  readonly timestamp: Date;
  readonly message?: string;
}

/**
 * Spawn options interface for process management
 */
export interface SpawnOptions {
  readonly env?: Record<string, string>;
  readonly stdio?: 'ignore' | 'pipe' | 'inherit';
  readonly detached?: boolean;
  readonly [key: string]: unknown;
}

/**
 * Application command mapping interface
 */
export interface ApplicationCommandMap {
  readonly [key: string]: string;
}

/**
 * Process mapping interface for window management
 */
export type ProcessMap = Record<Application, string>;

/**
 * MIME type mapping for file media type detection
 */
export interface MimeTypeMap {
  readonly [extension: string]: string;
}

/**
 * Wait action parameters interface
 */
export interface WaitActionParams {
  readonly action: 'wait';
  readonly duration: number;
}

/**
 * Error handling utilities for consistent error processing
 */
export class ErrorHandler {
  /**
   * Safely extracts error message from unknown error types
   * @param error - Error of unknown type to extract message from
   * @returns Human-readable error message
   */
  static extractErrorMessage(error: unknown): string {
    if (_error instanceof Error) {
      return _error.message;
    }
    if (typeof _error === 'string') {
      return error;
    }
    if (__error && typeof error === 'object' && 'message' in error) {
      const errorObj = error as { message: unknown };
      return typeof errorObj.message === 'string'
        ? errorObj.message
        : JSON.stringify(_error);
    }
    return typeof error === 'string' ? error : JSON.stringify(_error);
  }

  /**
   * Safely extracts error stack from unknown error types
   * @param error - Error of unknown type to extract stack from
   * @returns Error stack trace or undefined
   */
  static extractErrorStack(error: unknown): string | undefined {
    if (_error instanceof Error) {
      return error.stack;
    }
    if (__error && typeof error === 'object' && 'stack' in error) {
      const errorObj = error as { stack: unknown };
      return typeof errorObj.stack === 'string' ? errorObj.stack : undefined;
    }
    return undefined;
  }

  /**
   * Creates a comprehensive error object with full context
   * @param code - Error code for categorization
   * @param message - Human-readable error message
   * @param operationId - Unique operation identifier
   * @param context - Additional error context
   * @param originalError - Original error object if available
   * @returns Structured error object
   */
  static createError(
    code: string,
    message: string,
    operationId: string,
    context: Record<string, unknown> = {},
    originalError?: unknown,
  ): ComputerServiceError {
    return {
      code,
      message,
      operationId,
      timestamp: new Date(),
      context,
      stack: originalError
        ? ErrorHandler.extractErrorStack(originalError)
        : undefined,
      originalError: originalError instanceof Error ? originalError : undefined,
    };
  }
}

/**
 * Enterprise-grade Computer Use Service with comprehensive automation capabilities
 *
 * This service provides production-ready computer automation with:
 * - Type-safe operation execution with comprehensive error handling
 * - Performance monitoring and structured logging for all operations
 * - Secure file operations with path validation and permission management
 * - Robust application lifecycle management with window control
 * - Linux X11/XFCE desktop automation via NutService
 */
@Injectable()
export class ComputerUseService {
  private readonly logger = new Logger(ComputerUseService._name);

  /**
   * Initialize Computer Use Service with dependency injection
   *
   * @param nutService - Native automation service for low-level computer control
   */
  constructor(private readonly nutService: NutService) {
    const operationId = `init_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] Initializing Computer Use Service`, {
      hasNutService: !!this.nutService,
    });

    this.logger.log(
      `[${operationId}] Computer Use Service initialized successfully`,
      {
        availableFeatures: {
          basicAutomation: true,
          fileOperations: true,
          applicationControl: true,
          screenshotCapture: true,
        },
      },
    );
  }

  /**
   * Execute a computer action with comprehensive error handling and performance monitoring
   *
   * This is the main entry point for all computer automation operations.
   * Supports all action types defined in the ComputerAction union type.
   *
   * @param params - Strongly typed action parameters
   * @returns Promise with action-specific result data
   * @throws Error with detailed context when operation fails
   */
  async action(
    params: ComputerAction,
  ): Promise<
    | ScreenshotResult
    | CursorPositionResult
    | FileWriteResult
    | FileReadResult
    | void
  > {
    const operationId = `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.log(
      `[${operationId}] Executing computer action: ${params.action}`,
      {
        operationId,
        actionType: params.action,
        hasCoordinates: 'coordinates' in params && !!params.coordinates,
        timestamp: new Date().toISOString(),
      },
    );

    try {
      let _result:
        | ScreenshotResult
        | CursorPositionResult
        | FileWriteResult
        | FileReadResult
        | void;

      switch (params.action) {
        case 'move_mouse': {
          await this.moveMouse(params);
          result = undefined;
          break;
        }
        case 'trace_mouse': {
          await this.traceMouse(params);
          result = undefined;
          break;
        }
        case 'click_mouse': {
          await this.clickMouse(params);
          result = undefined;
          break;
        }
        case 'press_mouse': {
          await this.pressMouse(params);
          result = undefined;
          break;
        }
        case 'drag_mouse': {
          await this.dragMouse(params);
          result = undefined;
          break;
        }
        case 'scroll': {
          await this.scroll(params);
          result = undefined;
          break;
        }
        case 'type_keys': {
          await this.typeKeys(params);
          result = undefined;
          break;
        }
        case 'press_keys': {
          await this.pressKeys(params);
          result = undefined;
          break;
        }
        case 'type_text': {
          await this.typeText(params);
          result = undefined;
          break;
        }
        case 'paste_text': {
          await this.pasteText(params);
          result = undefined;
          break;
        }
        case 'wait': {
          const waitParams = params as WaitActionParams;
          await this.delay(waitParams.duration);
          result = undefined;
          break;
        }
        case 'screenshot': {
          result = await this.screenshot();
          break;
        }
        case 'cursor_position': {
          result = await this.cursor_position();
          break;
        }
        case 'application': {
          await this.application(params);
          result = undefined;
          break;
        }
        case 'write_file': {
          result = await this.writeFile(params);
          break;
        }
        case 'read_file': {
          result = await this.readFile(params);
          break;
        }
        default: {
          const exhaustiveCheck: never = params;
          throw new Error(
            `Unsupported computer action: ${JSON.stringify(exhaustiveCheck)}`,
          );
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Computer action completed successfully`,
        {
          operationId,
          actionType: params.action,
          processingTimeMs: duration,
          hasResult: !!result,
          resultType: result ? typeof result : undefined,
        },
      );

      return result;
    } catch (_error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      const errorStack = ErrorHandler.extractErrorStack(_error);

      this.logger._error(
        `[${operationId}] Computer action failed: ${errorMessage}`,
        {
          operationId,
          actionType: params.action,
          processingTimeMs: duration,
          error: errorMessage,
          stack: errorStack,
        },
      );

      // Create and throw structured error
      const structuredError = ErrorHandler.createError(
        'COMPUTER_ACTION_FAILED',
        `Failed to execute ${params.action}: ${errorMessage}`,
        operationId,
        {
          actionType: params.action,
          processingTimeMs: duration,
          originalParams: params,
        },
        _error,
      );

      throw new Error(structuredError.message);
    }
  }

  /**
   * Move mouse cursor to specified coordinates with precise positioning
   *
   * @param action - Move mouse action parameters with target coordinates
   * @throws Error when mouse movement fails
   */
  private async moveMouse(action: MoveMouseAction): Promise<void> {
    const operationId = `move_mouse_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.logger.log(`[${operationId}] Moving mouse to coordinates`, {
      operationId,
      targetX: action.coordinates.x,
      targetY: action.coordinates.y,
    });

    try {
      await this.nutService.mouseMoveEvent(action.coordinates);

      this.logger.log(`[${operationId}] Mouse movement completed successfully`);
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(
        `[${operationId}] Mouse movement failed: ${errorMessage}`,
        {
          operationId,
          targetCoordinates: action.coordinates,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Trace mouse along a path of coordinates with optional key holding
   *
   * @param action - Trace mouse action with path coordinates and optional keys
   * @throws Error when mouse tracing fails
   */
  private async traceMouse(action: TraceMouseAction): Promise<void> {
    const operationId = `trace_mouse_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { path, holdKeys } = action;

    this.logger.log(`[${operationId}] Tracing mouse path`, {
      operationId,
      pathLength: path.length,
      hasHoldKeys: !!holdKeys,
      holdKeysCount: holdKeys?.length || 0,
    });

    try {
      // Validate path has at least one coordinate
      if (!path || path.length === 0) {
        throw new Error(
          'Mouse trace path must contain at least one coordinate',
        );
      }

      // Move to the first coordinate
      await this.nutService.mouseMoveEvent(path[0]);

      // Hold keys if provided
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(
          `[${operationId}] Holding keys: ${holdKeys.join(', ')}`,
        );
        await this.nutService.holdKeys(holdKeys, true);
      }

      // Move to each coordinate in the path
      for (let i = 0; i < path.length; i++) {
        const coordinates = path[i];
        this.logger.debug(
          `[${operationId}] Moving to path point ${i + 1}/${path.length}`,
          {
            x: coordinates.x,
            y: coordinates.y,
          },
        );
        await this.nutService.mouseMoveEvent(coordinates);
      }

      // Release hold keys
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(`[${operationId}] Releasing held keys`);
        await this.nutService.holdKeys(holdKeys, false);
      }

      this.logger.log(`[${operationId}] Mouse tracing completed successfully`);
    } catch (_error) {
      // Ensure keys are released on _error
      if (holdKeys && holdKeys.length > 0) {
        try {
          await this.nutService.holdKeys(holdKeys, false);
        } catch (releaseError) {
          this.logger.warn(
            `[${operationId}] Failed to release held keys on error: ${ErrorHandler.extractErrorMessage(releaseError)}`,
          );
        }
      }

      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger.error(
        `[${operationId}] Mouse tracing failed: ${errorMessage}`,
        {
          operationId,
          pathLength: path.length,
          holdKeys,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Perform mouse click operations with optional coordinate movement and key holding
   *
   * @param action - Click mouse action with coordinates, button, keys, and click count
   * @throws Error when mouse click operation fails
   */
  private async clickMouse(action: ClickMouseAction): Promise<void> {
    const operationId = `click_mouse_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { coordinates, button, holdKeys, clickCount } = action;

    this.logger.log(`[${operationId}] Performing mouse click operation`, {
      operationId,
      hasCoordinates: !!coordinates,
      coordinates,
      button,
      clickCount,
      hasHoldKeys: !!holdKeys,
      holdKeys,
    });

    try {
      // Move to coordinates if provided
      if (coordinates) {
        this.logger.log(
          `[${operationId}] Moving to click coordinates`,
          coordinates,
        );
        await this.nutService.mouseMoveEvent(coordinates);
      }

      // Hold keys if provided
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(
          `[${operationId}] Holding keys: ${holdKeys.join(', ')}`,
        );
        await this.nutService.holdKeys(holdKeys, true);
      }

      // Validate click count
      const validClickCount = Math.max(1, Math.min(clickCount, 10)); // Limit to reasonable range
      if (validClickCount !== clickCount) {
        this.logger.warn(
          `[${operationId}] Click count adjusted from ${clickCount} to ${validClickCount}`,
        );
      }

      // Perform clicks
      if (validClickCount > 1) {
        // Perform multiple clicks with timing control
        this.logger.log(
          `[${operationId}] Performing ${validClickCount} clicks`,
        );
        for (let i = 0; i < validClickCount; i++) {
          this.logger.debug(
            `[${operationId}] Click ${i + 1}/${validClickCount}`,
          );
          await this.nutService.mouseClickEvent(button);

          // Add delay between clicks except for the last one
          if (i < validClickCount - 1) {
            await this.delay(150);
          }
        }
      } else {
        // Perform a single click
        this.logger.log(`[${operationId}] Performing single ${button} click`);
        await this.nutService.mouseClickEvent(button);
      }

      // Release hold keys
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(`[${operationId}] Releasing held keys`);
        await this.nutService.holdKeys(holdKeys, false);
      }

      this.logger.log(
        `[${operationId}] Mouse click operation completed successfully`,
      );
    } catch (_error) {
      // Ensure keys are released on _error
      if (holdKeys && holdKeys.length > 0) {
        try {
          await this.nutService.holdKeys(holdKeys, false);
        } catch (releaseError) {
          this.logger.warn(
            `[${operationId}] Failed to release held keys on error: ${ErrorHandler.extractErrorMessage(releaseError)}`,
          );
        }
      }

      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger.error(
        `[${operationId}] Mouse click operation failed: ${errorMessage}`,
        {
          operationId,
          coordinates,
          button,
          clickCount,
          holdKeys,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Press or release mouse button with optional coordinate movement
   *
   * @param action - Press mouse action with coordinates, button, and press direction
   * @throws Error when mouse button operation fails
   */
  private async pressMouse(action: PressMouseAction): Promise<void> {
    const operationId = `press_mouse_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { coordinates, button, press } = action;

    this.logger.log(
      `[${operationId}] Performing mouse button press operation`,
      {
        operationId,
        hasCoordinates: !!coordinates,
        coordinates,
        button,
        press,
      },
    );

    try {
      // Move to coordinates if provided
      if (coordinates) {
        this.logger.log(
          `[${operationId}] Moving to press coordinates`,
          coordinates,
        );
        await this.nutService.mouseMoveEvent(coordinates);
      }

      // Perform press or release operation
      const isPress = press === 'down';
      this.logger.log(
        `[${operationId}] ${isPress ? 'Pressing' : 'Releasing'} ${button} mouse button`,
      );
      await this.nutService.mouseButtonEvent(button, isPress);

      this.logger.log(
        `[${operationId}] Mouse button operation completed successfully`,
      );
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(
        `[${operationId}] Mouse button operation failed: ${errorMessage}`,
        {
          operationId,
          coordinates,
          button,
          press,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Drag mouse along a path while holding a button down
   *
   * @param action - Drag mouse action with path, button, and optional keys
   * @throws Error when mouse drag operation fails
   */
  private async dragMouse(action: DragMouseAction): Promise<void> {
    const operationId = `drag_mouse_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { path, button, holdKeys } = action;

    this.logger.log(`[${operationId}] Performing mouse drag operation`, {
      operationId,
      pathLength: path.length,
      button,
      hasHoldKeys: !!holdKeys,
      holdKeys,
    });

    let mouseButtonPressed = false;

    try {
      // Validate path has at least one coordinate
      if (!path || path.length === 0) {
        throw new Error('Mouse drag path must contain at least one coordinate');
      }

      // Move to the first coordinate
      this.logger.log(
        `[${operationId}] Moving to drag start position`,
        path[0],
      );
      await this.nutService.mouseMoveEvent(path[0]);

      // Hold keys if provided
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(
          `[${operationId}] Holding keys: ${holdKeys.join(', ')}`,
        );
        await this.nutService.holdKeys(holdKeys, true);
      }

      // Press and hold mouse button to begin drag
      this.logger.log(
        `[${operationId}] Pressing ${button} button to begin drag`,
      );
      await this.nutService.mouseButtonEvent(button, true);
      mouseButtonPressed = true;

      // Move along the drag path
      for (let i = 0; i < path.length; i++) {
        const coordinates = path[i];
        this.logger.debug(
          `[${operationId}] Dragging to point ${i + 1}/${path.length}`,
          {
            x: coordinates.x,
            y: coordinates.y,
          },
        );
        await this.nutService.mouseMoveEvent(coordinates);
      }

      // Release mouse button to end drag
      this.logger.log(
        `[${operationId}] Releasing ${button} button to end drag`,
      );
      await this.nutService.mouseButtonEvent(button, false);
      mouseButtonPressed = false;

      // Release hold keys
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(`[${operationId}] Releasing held keys`);
        await this.nutService.holdKeys(holdKeys, false);
      }

      this.logger.log(
        `[${operationId}] Mouse drag operation completed successfully`,
      );
    } catch (_error) {
      // Cleanup on _error - release mouse button if it was pressed
      if (mouseButtonPressed) {
        try {
          await this.nutService.mouseButtonEvent(button, false);
        } catch (releaseError) {
          this.logger.warn(
            `[${operationId}] Failed to release mouse button on error: ${ErrorHandler.extractErrorMessage(releaseError)}`,
          );
        }
      }

      // Cleanup on error - release hold keys
      if (holdKeys && holdKeys.length > 0) {
        try {
          await this.nutService.holdKeys(holdKeys, false);
        } catch (releaseError) {
          this.logger.warn(
            `[${operationId}] Failed to release held keys on error: ${ErrorHandler.extractErrorMessage(releaseError)}`,
          );
        }
      }

      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger.error(
        `[${operationId}] Mouse drag operation failed: ${errorMessage}`,
        {
          operationId,
          pathLength: path.length,
          button,
          holdKeys,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Perform scroll operations with optional coordinate positioning and key holding
   *
   * @param action - Scroll action with coordinates, direction, count, and optional keys
   * @throws Error when scroll operation fails
   */
  private async scroll(action: ScrollAction): Promise<void> {
    const operationId = `scroll_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { coordinates, direction, scrollCount, holdKeys } = action;

    this.logger.log(`[${operationId}] Performing scroll operation`, {
      operationId,
      hasCoordinates: !!coordinates,
      coordinates,
      direction,
      scrollCount,
      hasHoldKeys: !!holdKeys,
      holdKeys,
    });

    try {
      // Move to coordinates if provided
      if (coordinates) {
        this.logger.log(
          `[${operationId}] Moving to scroll coordinates`,
          coordinates,
        );
        await this.nutService.mouseMoveEvent(coordinates);
      }

      // Hold keys if provided
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(
          `[${operationId}] Holding keys: ${holdKeys.join(', ')}`,
        );
        await this.nutService.holdKeys(holdKeys, true);
      }

      // Validate and limit scroll count
      const validScrollCount = Math.max(1, Math.min(scrollCount, 50)); // Reasonable limits
      if (validScrollCount !== scrollCount) {
        this.logger.warn(
          `[${operationId}] Scroll count adjusted from ${scrollCount} to ${validScrollCount}`,
        );
      }

      // Perform scroll operations
      this.logger.log(
        `[${operationId}] Performing ${validScrollCount} scroll ${direction} operations`,
      );
      for (let i = 0; i < validScrollCount; i++) {
        this.logger.debug(
          `[${operationId}] Scroll ${i + 1}/${validScrollCount} ${direction}`,
        );
        await this.nutService.mouseWheelEvent(direction, 1);

        // Add delay between scroll events except for the last one
        if (i < validScrollCount - 1) {
          await this.delay(150);
        }
      }

      // Release hold keys
      if (holdKeys && holdKeys.length > 0) {
        this.logger.log(`[${operationId}] Releasing held keys`);
        await this.nutService.holdKeys(holdKeys, false);
      }

      this.logger.log(
        `[${operationId}] Scroll operation completed successfully`,
      );
    } catch (_error) {
      // Ensure keys are released on _error
      if (holdKeys && holdKeys.length > 0) {
        try {
          await this.nutService.holdKeys(holdKeys, false);
        } catch (releaseError) {
          this.logger.warn(
            `[${operationId}] Failed to release held keys on error: ${ErrorHandler.extractErrorMessage(releaseError)}`,
          );
        }
      }

      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger.error(
        `[${operationId}] Scroll operation failed: ${errorMessage}`,
        {
          operationId,
          coordinates,
          direction,
          scrollCount,
          holdKeys,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Type a sequence of keys with optional delay between keystrokes
   *
   * @param action - Type keys action with key sequence and optional delay
   * @throws Error when key typing operation fails
   */
  private async typeKeys(action: TypeKeysAction): Promise<void> {
    const operationId = `type_keys_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { keys, delay } = action;

    this.logger.log(`[${operationId}] Typing key sequence`, {
      operationId,
      keyCount: keys.length,
      hasDelay: !!delay,
      delayMs: delay,
      keys: keys.join(', '),
    });

    try {
      await this.nutService.sendKeys(keys, delay);
      this.logger.log(`[${operationId}] Key typing completed successfully`);
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(`[${operationId}] Key typing failed: ${errorMessage}`, {
        operationId,
        keys,
        delay,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Press or release a set of keys simultaneously
   *
   * @param action - Press keys action with key list and press direction
   * @throws Error when key press operation fails
   */
  private async pressKeys(action: PressKeysAction): Promise<void> {
    const operationId = `press_keys_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { keys, press } = action;

    this.logger.log(
      `[${operationId}] ${press === 'down' ? 'Pressing' : 'Releasing'} keys`,
      {
        operationId,
        keys: keys.join(', '),
        press,
      },
    );

    try {
      await this.nutService.holdKeys(keys, press === 'down');
      this.logger.log(
        `[${operationId}] Key ${press} operation completed successfully`,
      );
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(
        `[${operationId}] Key ${press} operation failed: ${errorMessage}`,
        {
          operationId,
          keys,
          press,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Type text with optional delay between characters
   *
   * @param action - Type text action with text content and optional delay
   * @throws Error when text typing operation fails
   */
  private async typeText(action: TypeTextAction): Promise<void> {
    const operationId = `type_text_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { text, delay } = action;

    this.logger.log(`[${operationId}] Typing text`, {
      operationId,
      textLength: text.length,
      hasDelay: !!delay,
      delayMs: delay,
      // Don't log sensitive text content
      isSensitive: action.sensitive,
    });

    try {
      await this.nutService.typeText(text, delay);
      this.logger.log(`[${operationId}] Text typing completed successfully`);
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(
        `[${operationId}] Text typing failed: ${errorMessage}`,
        {
          operationId,
          textLength: text.length,
          delay,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Paste text from clipboard or directly input text
   *
   * @param action - Paste text action with text content
   * @throws Error when text pasting operation fails
   */
  private async pasteText(action: PasteTextAction): Promise<void> {
    const operationId = `paste_text_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { text } = action;

    this.logger.log(`[${operationId}] Pasting text`, {
      operationId,
      textLength: text.length,
    });

    try {
      await this.nutService.pasteText(text);
      this.logger.log(`[${operationId}] Text pasting completed successfully`);
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(
        `[${operationId}] Text pasting failed: ${errorMessage}`,
        {
          operationId,
          textLength: text.length,
          error: errorMessage,
        },
      );
      throw error;
    }
  }

  /**
   * Add a delay/pause in execution with precise timing control
   *
   * @param ms - Delay duration in milliseconds
   * @returns Promise that resolves after the specified delay
   */
  private async delay(ms: number): Promise<void> {
    const operationId = `delay_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Validate delay duration (reasonable limits)
    const validDelay = Math.max(0, Math.min(ms, 300000)); // Max 5 minutes
    if (validDelay !== ms) {
      this.logger.warn(
        `[${operationId}] Delay adjusted from ${ms}ms to ${validDelay}ms`,
      );
    }

    this.logger.debug(`[${operationId}] Starting delay of ${validDelay}ms`);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.logger.debug(
          `[${operationId}] Delay of ${validDelay}ms completed`,
        );
        resolve();
      }, validDelay);
    });
  }

  /**
   * Capture a screenshot of the current screen with performance monitoring
   *
   * @returns Promise<ScreenshotResult> Screenshot data with metadata
   * @throws Error when screenshot capture fails
   */
  async screenshot(): Promise<ScreenshotResult> {
    const startTime = Date.now();
    const operationId = `screenshot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const captureTime = new Date();

    this.logger.log(`[${operationId}] Taking screenshot`, {
      operationId,
      timestamp: captureTime.toISOString(),
    });

    try {
      const buffer = await this.nutService.screendump();
      const image = buffer.toString('base64');
      const duration = Date.now() - startTime;

      const _result: ScreenshotResult = {
        image,
        metadata: {
          captureTime,
          operationId,
          // Note: Width and height would need additional detection
          format: 'png', // Assuming PNG format from screendump
        },
      };

      this.logger.log(`[${operationId}] Screenshot completed successfully`, {
        operationId,
        processingTimeMs: duration,
        imageSizeBytes: image.length,
        base64Length: image.length,
      });

      return result;
    } catch (_error) {
      const duration = Date.now() - startTime;
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      const errorStack = ErrorHandler.extractErrorStack(_error);

      this.logger._error(`[${operationId}] Screenshot failed: ${errorMessage}`, {
        operationId,
        processingTimeMs: duration,
        error: errorMessage,
        stack: errorStack,
      });

      throw new Error(`Screenshot capture failed: ${errorMessage}`);
    }
  }

  /**
   * Get the current cursor position with comprehensive tracking
   *
   * @returns Promise<CursorPositionResult> Current cursor coordinates with metadata
   * @throws Error when cursor position retrieval fails
   */
  private async cursor_position(): Promise<CursorPositionResult> {
    const operationId = `cursor_position_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();

    this.logger.log(`[${operationId}] Getting cursor position`, {
      operationId,
      timestamp: timestamp.toISOString(),
    });

    try {
      const position = await this.nutService.getCursorPosition();

      const _result: CursorPositionResult = {
        x: position.x,
        y: position.y,
        timestamp,
        operationId,
      };

      this.logger.log(
        `[${operationId}] Cursor position retrieved successfully`,
        {
          operationId,
          position: { x: result.x, y: result.y },
        },
      );

      return result;
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(
        `[${operationId}] Failed to get cursor position: ${errorMessage}`,
        {
          operationId,
          error: errorMessage,
        },
      );

      throw new Error(`Cursor position retrieval failed: ${errorMessage}`);
    }
  }

  /**
   * Manage application lifecycle - launch, activate, or control applications
   *
   * @param action - Application action with target application identifier
   * @throws Error when application operation fails
   */
  private async application(action: ApplicationAction): Promise<void> {
    const operationId = `application_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const execAsync = promisify(exec);
    const { application } = action;

    this.logger.log(`[${operationId}] Managing application: ${application}`, {
      operationId,
      application,
    });

    try {
      // Handle desktop-specific action
      if (application === 'desktop') {
        this.logger.log(`[${operationId}] Activating desktop`);
        spawn('sudo', ['-u', 'user', 'wmctrl', '-k', 'on'], {
          env: { ...process.env, DISPLAY: ':0.0' },
          stdio: 'ignore',
          detached: true,
        }).unref();
        return;
      }

      // Application command mappings with type safety
      const commandMap: ApplicationCommandMap = {
        firefox: 'firefox-esr',
        '1password': '1password',
        thunderbird: 'thunderbird',
        vscode: 'code',
        terminal: 'xfce4-terminal',
        directory: 'thunar',
      };

      // Process name mappings for window management with comprehensive types
      const processMap: ProcessMap = {
        firefox: 'Navigator.firefox-esr',
        '1password': '1password.1Password',
        thunderbird: 'Mail.thunderbird',
        vscode: 'code.Code',
        terminal: 'xfce4-terminal.Xfce4-Terminal',
        directory: 'Thunar',
        desktop: 'xfdesktop.Xfdesktop',
      };

      // Validate application is supported
      if (!commandMap[application]) {
        throw new Error(`Unsupported application: ${application}`);
      }

      // Check if application is already running using wmctrl with timeout
      let appOpen = false;
      try {
        this.logger.log(
          `[${operationId}] Checking if ${application} is already running`,
        );

        const { stdout } = await execAsync(
          `sudo -u user wmctrl -lx | grep ${processMap[application]}`,
          { timeout: 5000 }, // 5 second timeout for safety
        );

        appOpen = stdout.trim().length > 0;
        this.logger.log(
          `[${operationId}] Application ${application} running status: ${appOpen}`,
        );
      } catch (_error) {
        // Handle wmctrl/grep errors safely with type checking
        const errorMessage = ErrorHandler.extractErrorMessage(_error);

        // Extract _error code safely
        const errorCode =
          _error && typeof _error === 'object' && 'code' in _error
            ? (_error as { code: unknown }).code
            : null;

        // grep returns exit code 1 when no match found (app not running)
        // Also handle timeout and other expected errors
        if (errorCode !== 1 && !errorMessage.includes('timeout')) {
          this.logger.warn(
            `[${operationId}] Error checking application status: ${errorMessage}`,
          );
          // Continue with assumption app is not running
        }

        // Default to not running if check fails
        appOpen = false;
      }

      if (appOpen) {
        this.logger.log(
          `[${operationId}] Application ${application} is already running - activating window`,
        );

        // Activate existing application window
        spawn(
          'sudo',
          ['-u', 'user', 'wmctrl', '-x', '-a', processMap[application]],
          {
            env: { ...process.env, DISPLAY: ':0.0' },
            stdio: 'ignore',
            detached: true,
          },
        ).unref();

        // Maximize the window for better user experience
        spawn(
          'sudo',
          [
            '-u',
            'user',
            'wmctrl',
            '-x',
            '-r',
            processMap[application],
            '-b',
            'add,maximized_vert,maximized_horz',
          ],
          {
            env: { ...process.env, DISPLAY: ':0.0' },
            stdio: 'ignore',
            detached: true,
          },
        ).unref();

        this.logger.log(
          `[${operationId}] Application ${application} activated and maximized`,
        );
        return;
      }

      // Launch new application instance
      this.logger.log(
        `[${operationId}] Launching new instance of ${application}`,
      );
      spawn('sudo', ['-u', 'user', 'nohup', commandMap[application]], {
        env: { ...process.env, DISPLAY: ':0.0' },
        stdio: 'ignore',
        detached: true,
      }).unref();

      this.logger.log(
        `[${operationId}] Application ${application} launched successfully`,
      );
    } catch (_error) {
      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      this.logger._error(
        `[${operationId}] Application management failed: ${errorMessage}`,
        {
          operationId,
          application,
          error: errorMessage,
        },
      );

      throw new Error(
        `Application management failed for ${application}: ${errorMessage}`,
      );
    }
  }

  /**
   * Write file to disk with secure path handling and permission management
   *
   * @param action - Write file action with path and base64 encoded data
   * @returns Promise<FileWriteResult> Operation result with success status and metadata
   */
  private async writeFile(action: WriteFileAction): Promise<FileWriteResult> {
    const operationId = `write_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();
    const execAsync = promisify(exec);
    let tempFile: string | null = null;

    this.logger.log(`[${operationId}] Writing file`, {
      operationId,
      originalPath: action.path,
      dataLength: action.data.length,
      timestamp: timestamp.toISOString(),
    });

    try {
      // Validate input data
      if (!action.data || typeof action.data !== 'string') {
        throw new Error('File data must be a non-empty base64 encoded string');
      }

      if (!action.path || typeof action.path !== 'string') {
        throw new Error('File path must be a non-empty string');
      }

      // Decode base64 data with error handling
      let buffer: Buffer;
      try {
        buffer = Buffer.from(action.data, 'base64');
      } catch (decodeError) {
        throw new Error(
          `Invalid base64 data: ${ErrorHandler.extractErrorMessage(decodeError)}`,
        );
      }

      // Resolve and validate target path
      let targetPath = action.path;
      if (!path.isAbsolute(targetPath)) {
        targetPath = path.join('/home/user/Desktop', targetPath);
        this.logger.log(
          `[${operationId}] Resolved relative path to: ${targetPath}`,
        );
      }

      // Security check: ensure path is within allowed directories
      const normalizedPath = path.normalize(targetPath);
      if (
        !normalizedPath.startsWith('/home/user/') &&
        !normalizedPath.startsWith('/tmp/')
      ) {
        throw new Error(
          `File path outside allowed directories: ${normalizedPath}`,
        );
      }

      // Ensure target directory exists
      const dir = path.dirname(normalizedPath);
      this.logger.log(`[${operationId}] Ensuring directory exists: ${dir}`);

      try {
        await execAsync(`sudo mkdir -p "${dir}"`);
      } catch (dirError) {
        // Directory might already exist, log but continue
        const dirErrorMessage = ErrorHandler.extractErrorMessage(dirError);
        this.logger.debug(
          `[${operationId}] Directory creation note: ${dirErrorMessage}`,
        );
      }

      // Create temporary file with unique name
      tempFile = `/tmp/bytebot_temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      this.logger.log(
        `[${operationId}] Writing to temporary file: ${tempFile}`,
      );

      await fs.writeFile(tempFile, buffer);

      // Move file to target location with proper permissions
      try {
        await execAsync(`sudo cp "${tempFile}" "${normalizedPath}"`);
        await execAsync(`sudo chown user:user "${normalizedPath}"`);
        await execAsync(`sudo chmod 644 "${normalizedPath}"`);

        this.logger.log(`[${operationId}] File permissions set successfully`);
      } catch (moveError) {
        throw new Error(
          `Failed to move file to target location: ${ErrorHandler.extractErrorMessage(moveError)}`,
        );
      } finally {
        // Clean up temporary file
        if (tempFile) {
          try {
            await fs.unlink(tempFile);
            this.logger.debug(`[${operationId}] Temporary file cleaned up`);
          } catch (cleanupError) {
            this.logger.warn(
              `[${operationId}] Failed to cleanup temp file: ${ErrorHandler.extractErrorMessage(cleanupError)}`,
            );
          }
        }
      }

      const _result: FileWriteResult = {
        success: true,
        message: `File written successfully to: ${normalizedPath}`,
        path: normalizedPath,
        size: buffer.length,
        operationId,
        timestamp,
      };

      this.logger.log(
        `[${operationId}] File write operation completed successfully`,
        {
          operationId,
          finalPath: normalizedPath,
          fileSize: buffer.length,
        },
      );

      return result;
    } catch (_error) {
      // Ensure temp file cleanup on _error
      if (tempFile) {
        try {
          await fs.unlink(tempFile);
        } catch (cleanupError) {
          this.logger.warn(
            `[${operationId}] Failed to cleanup temp file on error: ${ErrorHandler.extractErrorMessage(cleanupError)}`,
          );
        }
      }

      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      const errorStack = ErrorHandler.extractErrorStack(_error);

      this.logger.error(
        `[${operationId}] File write operation failed: ${errorMessage}`,
        {
          operationId,
          originalPath: action.path,
          error: errorMessage,
          stack: errorStack,
        },
      );

      const _result: FileWriteResult = {
        success: false,
        message: `File write failed: ${errorMessage}`,
        operationId,
        timestamp,
      };

      return result;
    }
  }

  /**
   * Read file from disk with secure access and comprehensive metadata
   *
   * @param action - Read file action with file path
   * @returns Promise<FileReadResult> File content and metadata or error information
   */
  private async readFile(action: ReadFileAction): Promise<FileReadResult> {
    const operationId = `read_file_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const timestamp = new Date();
    const execAsync = promisify(exec);
    let tempFile: string | null = null;

    this.logger.log(`[${operationId}] Reading file`, {
      operationId,
      originalPath: action.path,
      timestamp: timestamp.toISOString(),
    });

    try {
      // Validate input path
      if (!action.path || typeof action.path !== 'string') {
        throw new Error('File path must be a non-empty string');
      }

      // Resolve and validate target path
      let targetPath = action.path;
      if (!path.isAbsolute(targetPath)) {
        targetPath = path.join('/home/user/Desktop', targetPath);
        this.logger.log(
          `[${operationId}] Resolved relative path to: ${targetPath}`,
        );
      }

      // Security check: ensure path is within allowed directories
      const normalizedPath = path.normalize(targetPath);
      if (
        !normalizedPath.startsWith('/home/user/') &&
        !normalizedPath.startsWith('/tmp/')
      ) {
        throw new Error(
          `File path outside allowed directories: ${normalizedPath}`,
        );
      }

      // Create temporary file for secure reading
      tempFile = `/tmp/bytebot_read_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      try {
        this.logger.log(
          `[${operationId}] Copying file to temporary location for secure reading`,
        );

        // Copy file to temporary location for reading
        await execAsync(`sudo cp "${normalizedPath}" "${tempFile}"`);
        await execAsync(`sudo chmod 644 "${tempFile}"`);

        // Read file content as buffer
        const buffer = await fs.readFile(tempFile);

        // Get comprehensive file statistics
        const { stdout: statOutput } = await execAsync(
          `sudo stat -c "%s %Y" "${normalizedPath}"`,
        );

        const [sizeStr, lastModifiedStr] = statOutput.trim().split(' ');
        const fileSize = parseInt(sizeStr, 10);
        const lastModified = new Date(parseInt(lastModifiedStr, 10) * 1000);

        if (isNaN(fileSize)) {
          throw new Error('Failed to read file size from stat output');
        }

        // Convert content to base64
        const base64Data = buffer.toString('base64');

        // Extract filename from path
        const fileName = path.basename(normalizedPath);

        // Determine media type using comprehensive MIME type mapping
        const ext = path.extname(normalizedPath).toLowerCase().slice(1);
        const mimeTypes: MimeTypeMap = {
          // Documents
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          doc: 'application/msword',
          txt: 'text/plain',
          html: 'text/html',
          htm: 'text/html',
          json: 'application/json',
          xml: 'text/xml',
          csv: 'text/csv',
          rtf: 'application/rtf',
          odt: 'application/vnd.oasis.opendocument.text',
          epub: 'application/epub+zip',

          // Images
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
          gif: 'image/gif',
          svg: 'image/svg+xml',
          bmp: 'image/bmp',
          tiff: 'image/tiff',
          ico: 'image/x-icon',

          // Audio/Video
          mp3: 'audio/mpeg',
          wav: 'audio/wav',
          mp4: 'video/mp4',
          avi: 'video/x-msvideo',

          // Archives
          zip: 'application/zip',
          tar: 'application/x-tar',
          gz: 'application/gzip',

          // Code files
          js: 'text/javascript',
          ts: 'text/typescript',
          css: 'text/css',
          scss: 'text/scss',
          py: 'text/x-python',
          java: 'text/x-java-source',
          cpp: 'text/x-c++src',
          c: 'text/x-csrc',
          h: 'text/x-chdr',
        };

        const mediaType = mimeTypes[ext] || 'application/octet-stream';

        const _result: FileReadResult = {
          success: true,
          data: base64Data,
          name: fileName,
          size: fileSize,
          mediaType,
          lastModified,
          operationId,
          timestamp,
        };

        this.logger.log(
          `[${operationId}] File read operation completed successfully`,
          {
            operationId,
            fileName,
            fileSize,
            mediaType,
            base64Length: base64Data.length,
          },
        );

        return result;
      } catch (fileError) {
        throw new Error(
          `Failed to read file: ${ErrorHandler.extractErrorMessage(fileError)}`,
        );
      } finally {
        // Clean up temporary file
        if (tempFile) {
          try {
            await fs.unlink(tempFile);
            this.logger.debug(`[${operationId}] Temporary file cleaned up`);
          } catch (cleanupError) {
            this.logger.warn(
              `[${operationId}] Failed to cleanup temp file: ${ErrorHandler.extractErrorMessage(cleanupError)}`,
            );
          }
        }
      }
    } catch (_error) {
      // Ensure temp file cleanup on _error
      if (tempFile) {
        try {
          await fs.unlink(tempFile);
        } catch (cleanupError) {
          this.logger.warn(
            `[${operationId}] Failed to cleanup temp file on error: ${ErrorHandler.extractErrorMessage(cleanupError)}`,
          );
        }
      }

      const errorMessage = ErrorHandler.extractErrorMessage(_error);
      const errorStack = ErrorHandler.extractErrorStack(_error);

      this.logger.error(
        `[${operationId}] File read operation failed: ${errorMessage}`,
        {
          operationId,
          originalPath: action.path,
          error: errorMessage,
          stack: errorStack,
        },
      );

      const _result: FileReadResult = {
        success: false,
        message: `File read failed: ${errorMessage}`,
        operationId,
        timestamp,
      };

      return result;
    }
  }
}
