/**
 * MCP Protocol Types and Interfaces
 *
 * This module provides comprehensive TypeScript definitions for Model Context Protocol
 * operations, ensuring type safety across all MCP-related functionality. These interfaces
 * replace unsafe `any` types with proper TypeScript types for protocol compliance.
 *
 * Interface Categories:
 * - Tool Parameter Types: Strongly typed tool input parameters
 * - MCP Response Types: Standardized response interfaces
 * - Computer Use Types: Specific types for computer automation
 * - Compression Types: Image compression operation types
 * - Error Types: MCP-compliant error structures
 *
 * @author ByteBot Development Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { z } from 'zod';

// ==========================================
// Core MCP Protocol Types
// ==========================================

/**
 * Base MCP tool configuration interface
 */
export interface McpToolConfig {
  name: string;
  description: string;
  parameters: z.ZodSchema;
}

/**
 * MCP content item structure
 */
export interface McpContentItem {
  type: 'text' | 'image' | 'resource';
  text?: string;
  mimeType?: string;
  data?: string;
  uri?: string;
}

/**
 * Standard MCP tool response structure
 */
export interface McpToolResponse {
  content: McpContentItem[];
  isError?: boolean;
}

/**
 * Standard MCP response structure
 */
export interface McpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: McpError;
  metadata?: McpMetadata;
}

/**
 * MCP error structure for consistent error handling
 */
export interface McpError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * MCP operation metadata for performance tracking
 */
export interface McpMetadata {
  operationId: string;
  executionTime: number;
  timestamp: string;
  toolName: string;
}

// ==========================================
// Computer Use Tool Parameter Types
// ==========================================

/**
 * Mouse movement operation parameters
 */
export interface MouseMoveParams {
  coordinates: {
    x: number;
    y: number;
  };
}

/**
 * Mouse click operation parameters
 */
export interface MouseClickParams {
  coordinates: {
    x: number;
    y: number;
  };
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
}

/**
 * Mouse scroll operation parameters
 */
export interface MouseScrollParams {
  coordinates: {
    x: number;
    y: number;
  };
  scrollDirection: 'up' | 'down' | 'left' | 'right';
  clicks?: number;
}

/**
 * Keyboard typing operation parameters
 */
export interface KeyboardTypeParams {
  text: string;
}

/**
 * Keyboard key press operation parameters
 */
export interface KeyboardKeyParams {
  key: string;
}

/**
 * Screenshot capture operation parameters
 */
export interface ScreenshotParams {
  display?: number;
}

/**
 * File read operation parameters
 */
export interface FileReadParams {
  path: string;
}

/**
 * File write operation parameters
 */
export interface FileWriteParams {
  path: string;
  content: string;
}

/**
 * Directory listing operation parameters
 */
export interface DirectoryListParams {
  path: string;
}

/**
 * Directory creation operation parameters
 */
export interface DirectoryCreateParams {
  path: string;
}

// ==========================================
// Computer Use Response Types
// ==========================================

/**
 * Screenshot operation result
 */
export interface ScreenshotResult {
  base64: string;
  originalSizeKB: number;
  compressedSizeKB?: number;
  compressionRatio?: number;
  format: 'png' | 'jpeg' | 'webp';
  dimensions: {
    width: number;
    height: number;
  };
}

/**
 * File operation result
 */
export interface FileOperationResult {
  path: string;
  success: boolean;
  content?: string;
  size?: number;
  lastModified?: string;
}

/**
 * Directory operation result
 */
export interface DirectoryOperationResult {
  path: string;
  success: boolean;
  entries?: DirectoryEntry[];
  totalEntries?: number;
}

/**
 * Directory entry information
 */
export interface DirectoryEntry {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
}

/**
 * Basic operation result for simple actions
 */
export interface BasicOperationResult {
  success: boolean;
  message: string;
  coordinates?: {
    x: number;
    y: number;
  };
}

// ==========================================
// Compression Types
// ==========================================

/**
 * Image compression configuration options
 */
export interface CompressionOptions {
  targetSizeKB?: number;
  initialQuality?: number;
  minQuality?: number;
  format?: 'png' | 'jpeg' | 'webp';
  maxIterations?: number;
}

/**
 * Image compression operation result
 */
export interface CompressionResult {
  /** Compressed image as base64 string */
  base64: string;
  /** Final file size in bytes */
  sizeBytes: number;
  /** Final file size in kilobytes */
  sizeKB: number;
  /** Final file size in megabytes */
  sizeMB: number;
  /** Final quality setting used */
  quality: number;
  /** Output format used */
  format: string;
  /** Number of optimization iterations performed */
  iterations: number;
  /** Original size information for compression metrics */
  originalSizeKB?: number;
  /** Compression ratio achieved */
  compressionRatio?: number;
  /** Original image dimensions */
  originalDimensions?: {
    width: number;
    height: number;
  };
  /** Final image dimensions */
  finalDimensions?: {
    width: number;
    height: number;
  };
  /** Execution time in milliseconds */
  executionTime?: number;
}

// ==========================================
// Test and Mock Types
// ==========================================

/**
 * Mock service interface for testing
 */
export interface MockComputerUseService {
  action: jest.MockedFunction<
    (params: ComputerActionParams) => Promise<unknown>
  >;
}

/**
 * Computer action parameters union type
 */
export type ComputerActionParams =
  | { action: 'move_mouse'; coordinates: { x: number; y: number } }
  | {
      action: 'click';
      coordinates: { x: number; y: number };
      button?: string;
      clickCount?: number;
    }
  | {
      action: 'scroll';
      coordinates: { x: number; y: number };
      scrollDirection: string;
      clicks?: number;
    }
  | { action: 'type'; text: string }
  | { action: 'key'; key: string }
  | { action: 'screenshot'; display?: number }
  | { action: 'read_file'; path: string }
  | { action: 'write_file'; path: string; content: string }
  | { action: 'list_directory'; path: string }
  | { action: 'create_directory'; path: string };

/**
 * Mock module structure for testing
 */
export interface MockModule {
  [key: string]: unknown;
  prototype?: Record<string, unknown>;
}

/**
 * Test context interface for comprehensive testing
 */
export interface TestContext {
  module: MockModule;
  service: MockComputerUseService;
  tools: unknown;
}

// ==========================================
// Zod Schema Types
// ==========================================

/**
 * Typed Zod schemas for MCP tool parameters
 */
export const McpSchemas = {
  mouseMove: z.object({
    coordinates: z.object({
      x: z.number().describe('The x-coordinate to move the mouse to.'),
      y: z.number().describe('The y-coordinate to move the mouse to.'),
    }),
  }),

  mouseClick: z.object({
    coordinates: z.object({
      x: z.number().describe('The x-coordinate to click.'),
      y: z.number().describe('The y-coordinate to click.'),
    }),
    button: z
      .enum(['left', 'right', 'middle'])
      .optional()
      .describe('Mouse button to click.'),
    clickCount: z.number().optional().describe('Number of clicks to perform.'),
  }),

  mouseClickAdvanced: z.object({
    coordinates: z
      .object({
        x: z.number().describe('The x-coordinate to move the mouse to.'),
        y: z.number().describe('The y-coordinate to move the mouse to.'),
      })
      .optional()
      .describe(
        'Optional coordinates for the click. If not provided, clicks at the current mouse position.',
      ),
    button: z
      .enum(['left', 'right', 'middle'])
      .describe('The mouse button to click.'),
    holdKeys: z
      .array(z.string())
      .optional()
      .describe('Optional array of keys to hold during the click.'),
    clickCount: z
      .number()
      .describe('Number of clicks to perform (e.g., 2 for double-click).'),
  }),

  mouseScroll: z.object({
    coordinates: z.object({
      x: z.number().describe('The x-coordinate for scroll center.'),
      y: z.number().describe('The y-coordinate for scroll center.'),
    }),
    scrollDirection: z
      .enum(['up', 'down', 'left', 'right'])
      .describe('Direction to scroll.'),
    clicks: z.number().optional().describe('Number of scroll clicks.'),
  }),

  keyboardType: z.object({
    text: z.string().describe('Text to type.'),
  }),

  keyboardKey: z.object({
    key: z.string().describe('Key to press.'),
  }),

  screenshot: z.object({
    display: z.number().optional().describe('Display number to capture.'),
  }),

  fileRead: z.object({
    path: z.string().describe('Path to the file to read.'),
  }),

  fileWrite: z.object({
    path: z.string().describe('Path to the file to write.'),
    content: z.string().describe('Content to write to the file.'),
  }),

  directoryList: z.object({
    path: z.string().describe('Path to the directory to list.'),
  }),

  directoryCreate: z.object({
    path: z.string().describe('Path to the directory to create.'),
  }),

  mouseTrace: z.object({
    path: z
      .array(
        z.object({
          x: z.number().describe('The x-coordinate to move the mouse to.'),
          y: z.number().describe('The y-coordinate to move the mouse to.'),
        }),
      )
      .describe('An array of coordinate objects representing the path.'),
    holdKeys: z
      .array(z.string())
      .optional()
      .describe('Optional array of keys to hold during the trace.'),
  }),

  mouseDrag: z.object({
    startCoordinates: z.object({
      x: z.number().describe('The starting x-coordinate.'),
      y: z.number().describe('The starting y-coordinate.'),
    }),
    endCoordinates: z.object({
      x: z.number().describe('The ending x-coordinate.'),
      y: z.number().describe('The ending y-coordinate.'),
    }),
  }),

  mouseDragPath: z.object({
    path: z
      .array(
        z.object({
          x: z
            .number()
            .describe('The x-coordinate of a point in the drag path.'),
          y: z
            .number()
            .describe('The y-coordinate of a point in the drag path.'),
        }),
      )
      .describe(
        'An array of coordinate objects representing the drag path. The first coordinate is the start point.',
      ),
    button: z
      .enum(['left', 'right', 'middle'])
      .describe('The mouse button to hold while dragging.'),
    holdKeys: z
      .array(z.string())
      .optional()
      .describe('Optional array of keys to hold during the drag.'),
  }),

  keyboardHotkey: z.object({
    keys: z
      .array(z.string())
      .describe('Array of keys to press simultaneously.'),
  }),

  screenshotElement: z.object({
    selector: z
      .string()
      .describe('CSS selector for the element to screenshot.'),
  }),

  executeCommand: z.object({
    command: z.string().describe('Command to execute.'),
    args: z.array(z.string()).optional().describe('Command arguments.'),
    workingDirectory: z
      .string()
      .optional()
      .describe('Working directory for the command.'),
  }),

  mousePress: z.object({
    coordinates: z
      .object({
        x: z.number().describe('The x-coordinate for the mouse action.'),
        y: z.number().describe('The y-coordinate for the mouse action.'),
      })
      .optional()
      .describe(
        'Optional coordinates for the mouse press/release. If not provided, uses the current mouse position.',
      ),
    button: z
      .enum(['left', 'right', 'middle'])
      .describe('The mouse button to press or release.'),
    press: z
      .enum(['down', 'up'])
      .describe('The action to perform (press or release).'),
  }),
} as const;

// ==========================================
// Type Guards and Utilities
// ==========================================

/**
 * Type guard to check if a value is a valid MCP response
 */
export function isMcpResponse(value: unknown): value is McpResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as McpResponse).success === 'boolean'
  );
}

/**
 * Type guard to check if a value is a compression result
 */
export function isCompressionResult(
  value: unknown,
): value is CompressionResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'base64' in value &&
    'originalSizeKB' in value &&
    'compressedSizeKB' in value
  );
}

/**
 * Helper type for extracting Zod schema input types
 */
export type ZodSchemaInput<T extends z.ZodSchema> = z.input<T>;

/**
 * Helper type for extracting Zod schema output types
 */
export type ZodSchemaOutput<T extends z.ZodSchema> = z.output<T>;
