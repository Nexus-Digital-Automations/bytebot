import {
  Button,
  Coordinates,
  Press,
  ComputerToolUseContentBlock,
  ToolResultContentBlock,
  MessageContentType,
  isScreenshotToolUseBlock,
  isCursorPositionToolUseBlock,
  isMoveMouseToolUseBlock,
  isTraceMouseToolUseBlock,
  isClickMouseToolUseBlock,
  isPressMouseToolUseBlock,
  isDragMouseToolUseBlock,
  isScrollToolUseBlock,
  isTypeKeysToolUseBlock,
  isPressKeysToolUseBlock,
  isTypeTextToolUseBlock,
  isWaitToolUseBlock,
  isApplicationToolUseBlock,
  isPasteTextToolUseBlock,
  isReadFileToolUseBlock,
} from '@bytebot/shared';
import { Logger } from '@nestjs/common';

/**
 * Safely extract error message from unknown error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as { message: unknown };
    return typeof errorObj.message === 'string'
      ? errorObj.message
      : JSON.stringify(error);
  }
  return String(error);
}

/**
 * Safely extract error stack from unknown error types
 */
function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (error && typeof error === 'object' && 'stack' in error) {
    const errorObj = error as { stack: unknown };
    return typeof errorObj.stack === 'string' ? errorObj.stack : undefined;
  }
  return undefined;
}

const BYTEBOT_DESKTOP_BASE_URL = process.env.BYTEBOT_DESKTOP_BASE_URL as string;

export async function handleComputerToolUse(
  block: ComputerToolUseContentBlock,
  logger: Logger,
): Promise<ToolResultContentBlock> {
  logger.debug(
    `Handling computer tool use: ${block.name}, tool_use_id: ${block.id}`,
  );

  if (isScreenshotToolUseBlock(block)) {
    logger.debug('Processing screenshot request');
    try {
      logger.debug('Taking screenshot');
      const image = await screenshot();
      logger.debug('Screenshot captured successfully');

      return {
        type: MessageContentType.ToolResult,
        tool_use_id: block.id,
        content: [
          {
            type: MessageContentType.Image,
            source: {
              data: image,
              media_type: 'image/png',
              type: 'base64',
            },
          },
        ],
      };
    } catch (error) {
      logger.error(
        `Screenshot failed: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      return {
        type: MessageContentType.ToolResult,
        tool_use_id: block.id,
        content: [
          {
            type: MessageContentType.Text,
            text: 'ERROR: Failed to take screenshot',
          },
        ],
        is_error: true,
      };
    }
  }

  if (isCursorPositionToolUseBlock(block)) {
    logger.debug('Processing cursor position request');
    try {
      logger.debug('Getting cursor position');
      const position = await cursorPosition();
      logger.debug(`Cursor position obtained: ${position.x}, ${position.y}`);

      return {
        type: MessageContentType.ToolResult,
        tool_use_id: block.id,
        content: [
          {
            type: MessageContentType.Text,
            text: `Cursor position: ${position.x}, ${position.y}`,
          },
        ],
      };
    } catch (error) {
      logger.error(
        `Getting cursor position failed: ${getErrorMessage(error)}`,
        getErrorStack(error),
      );
      return {
        type: MessageContentType.ToolResult,
        tool_use_id: block.id,
        content: [
          {
            type: MessageContentType.Text,
            text: 'ERROR: Failed to get cursor position',
          },
        ],
        is_error: true,
      };
    }
  }

  try {
    if (isMoveMouseToolUseBlock(block)) {
      await moveMouse(block.input);
    }
    if (isTraceMouseToolUseBlock(block)) {
      await traceMouse(block.input);
    }
    if (isClickMouseToolUseBlock(block)) {
      await clickMouse(block.input);
    }
    if (isPressMouseToolUseBlock(block)) {
      await pressMouse(block.input);
    }
    if (isDragMouseToolUseBlock(block)) {
      await dragMouse(block.input);
    }
    if (isScrollToolUseBlock(block)) {
      await scroll(block.input);
    }
    if (isTypeKeysToolUseBlock(block)) {
      await typeKeys(block.input);
    }
    if (isPressKeysToolUseBlock(block)) {
      await pressKeys(block.input);
    }
    if (isTypeTextToolUseBlock(block)) {
      await typeText(block.input);
    }
    if (isPasteTextToolUseBlock(block)) {
      await pasteText(block.input);
    }
    if (isWaitToolUseBlock(block)) {
      await wait(block.input);
    }
    if (isApplicationToolUseBlock(block)) {
      await application(block.input);
    }
    if (isReadFileToolUseBlock(block)) {
      logger.debug(`Reading file: ${block.input.path}`);
      const result = await readFile(block.input);

      if (result.success && result.data) {
        // Return document content block
        return {
          type: MessageContentType.ToolResult,
          tool_use_id: block.id,
          content: [
            {
              type: MessageContentType.Document,
              source: {
                type: 'base64',
                media_type: result.mediaType || 'application/octet-stream',
                data: result.data,
              },
              name: result.name || 'file',
              size: result.size,
            },
          ],
        };
      } else {
        // Return error message
        return {
          type: MessageContentType.ToolResult,
          tool_use_id: block.id,
          content: [
            {
              type: MessageContentType.Text,
              text: result.message || 'Error reading file',
            },
          ],
          is_error: true,
        };
      }
    }

    let image: string | null = null;
    try {
      logger.debug('Taking screenshot');
      image = await screenshot();
      logger.debug('Screenshot captured successfully');
    } catch (error) {
      logger.error('Failed to take screenshot', error);
    }

    logger.debug(`Tool execution successful for tool_use_id: ${block.id}`);
    const toolResult: ToolResultContentBlock = {
      type: MessageContentType.ToolResult,
      tool_use_id: block.id,
      content: [
        {
          type: MessageContentType.Text,
          text: 'Tool executed successfully',
        },
      ],
    };

    if (image) {
      toolResult.content.push({
        type: MessageContentType.Image,
        source: {
          data: image,
          media_type: 'image/png',
          type: 'base64',
        },
      });
    }

    return toolResult;
  } catch (error) {
    logger.error(
      `Error executing ${block.name} tool: ${getErrorMessage(error)}`,
      getErrorStack(error),
    );
    return {
      type: MessageContentType.ToolResult,
      tool_use_id: block.id,
      content: [
        {
          type: MessageContentType.Text,
          text: `Error executing ${block.name} tool: ${getErrorMessage(error)}`,
        },
      ],
      is_error: true,
    };
  }
}

async function moveMouse(input: { coordinates: Coordinates }): Promise<void> {
  const { coordinates } = input;
  console.log(
    `Moving mouse to coordinates: [${coordinates.x}, ${coordinates.y}]`,
  );

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'move_mouse',
        coordinates,
      }),
    });
  } catch (error) {
    console.error('Error in move_mouse action:', getErrorMessage(error));
    throw error;
  }
}

async function traceMouse(input: {
  path: Coordinates[];
  holdKeys?: string[];
}): Promise<void> {
  const { path, holdKeys } = input;
  const pathStr = path.map((coord) => `(${coord.x},${coord.y})`).join(' -> ');
  const holdKeysStr = holdKeys ? ` with holdKeys: ${holdKeys.join(', ')}` : '';
  console.log(`Tracing mouse to path: ${pathStr}${holdKeysStr}`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'trace_mouse',
        path,
        holdKeys,
      }),
    });
  } catch (error) {
    console.error('Error in trace_mouse action:', error);
    throw error;
  }
}

async function clickMouse(input: {
  coordinates?: Coordinates;
  button: Button;
  holdKeys?: string[];
  clickCount: number;
}): Promise<void> {
  const { coordinates, button, holdKeys, clickCount } = input;
  const coordinatesStr = coordinates
    ? `at coordinates: [${coordinates.x}, ${coordinates.y}] `
    : '';
  const holdKeysStr = holdKeys ? `with holdKeys: ${holdKeys.join(', ')}` : '';
  console.log(
    `Clicking mouse ${button} ${clickCount} times ${coordinatesStr}${holdKeysStr}`,
  );

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'click_mouse',
        coordinates,
        button,
        holdKeys: holdKeys && holdKeys.length > 0 ? holdKeys : undefined,
        clickCount,
      }),
    });
  } catch (error) {
    console.error('Error in click_mouse action:', error);
    throw error;
  }
}

async function pressMouse(input: {
  coordinates?: Coordinates;
  button: Button;
  press: Press;
}): Promise<void> {
  const { coordinates, button, press } = input;
  console.log(
    `Pressing mouse ${button} ${press} ${coordinates ? `at coordinates: [${coordinates.x}, ${coordinates.y}]` : ''}`,
  );

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'press_mouse',
        coordinates,
        button,
        press,
      }),
    });
  } catch (error) {
    console.error('Error in press_mouse action:', error);
    throw error;
  }
}

async function dragMouse(input: {
  path: Coordinates[];
  button: Button;
  holdKeys?: string[];
}): Promise<void> {
  const { path, button, holdKeys } = input;
  const pathStr = path.map((coord) => `(${coord.x},${coord.y})`).join(' -> ');
  const holdKeysStr = holdKeys ? ` with holdKeys: ${holdKeys.join(', ')}` : '';
  console.log(`Dragging mouse to path: ${pathStr}${holdKeysStr}`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'drag_mouse',
        path,
        button,
        holdKeys: holdKeys && holdKeys.length > 0 ? holdKeys : undefined,
      }),
    });
  } catch (error) {
    console.error('Error in drag_mouse action:', error);
    throw error;
  }
}

async function scroll(input: {
  coordinates?: Coordinates;
  direction: 'up' | 'down' | 'left' | 'right';
  scrollCount: number;
  holdKeys?: string[];
}): Promise<void> {
  const { coordinates, direction, scrollCount, holdKeys } = input;
  console.log(
    `Scrolling ${direction} ${scrollCount} times ${coordinates ? `at coordinates: [${coordinates.x}, ${coordinates.y}]` : ''}`,
  );

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'scroll',
        coordinates,
        direction,
        scrollCount,
        holdKeys: holdKeys && holdKeys.length > 0 ? holdKeys : undefined,
      }),
    });
  } catch (error) {
    console.error('Error in scroll action:', error);
    throw error;
  }
}

async function typeKeys(input: {
  keys: string[];
  delay?: number;
}): Promise<void> {
  const { keys, delay } = input;
  console.log(`Typing keys: ${keys.join(', ')}`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'type_keys',
        keys,
        delay,
      }),
    });
  } catch (error) {
    console.error('Error in type_keys action:', error);
    throw error;
  }
}

async function pressKeys(input: {
  keys: string[];
  press: Press;
}): Promise<void> {
  const { keys, press } = input;
  console.log(`Pressing keys: ${keys.join(', ')}`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'press_keys',
        keys,
        press,
      }),
    });
  } catch (error) {
    console.error('Error in press_keys action:', error);
    throw error;
  }
}

async function typeText(input: {
  text: string;
  delay?: number;
}): Promise<void> {
  const { text, delay } = input;
  console.log(`Typing text: ${text}`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'type_text',
        text,
        delay,
      }),
    });
  } catch (error) {
    console.error('Error in type_text action:', error);
    throw error;
  }
}

async function pasteText(input: { text: string }): Promise<void> {
  const { text } = input;
  console.log(`Pasting text: ${text}`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'paste_text',
        text,
      }),
    });
  } catch (error) {
    console.error('Error in paste_text action:', error);
    throw error;
  }
}

async function wait(input: { duration: number }): Promise<void> {
  const { duration } = input;
  console.log(`Waiting for ${duration}ms`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'wait',
        duration,
      }),
    });
  } catch (error) {
    console.error('Error in wait action:', error);
    throw error;
  }
}

async function cursorPosition(): Promise<Coordinates> {
  console.log('Getting cursor position');

  try {
    const response = await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cursor_position',
      }),
    });

    const data = (await response.json()) as { x: number; y: number };
    return { x: data.x, y: data.y };
  } catch (error) {
    console.error('Error in cursor_position action:', error);
    throw error;
  }
}

async function screenshot(): Promise<string> {
  console.log('Taking screenshot');

  try {
    const requestBody = {
      action: 'screenshot',
    };

    const response = await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to take screenshot: ${response.statusText}`);
    }

    const data = (await response.json()) as { image?: string };

    if (!data.image) {
      throw new Error('Failed to take screenshot: No image data received');
    }

    return data.image; // Base64 encoded image
  } catch (error) {
    console.error('Error in screenshot action:', error);
    throw error;
  }
}

async function application(input: { application: string }): Promise<void> {
  const { application } = input;
  console.log(`Opening application: ${application}`);

  try {
    await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'application',
        application,
      }),
    });
  } catch (error) {
    console.error('Error in application action:', error);
    throw error;
  }
}

/**
 * Interface for read file API response
 */
interface ReadFileResponse {
  success: boolean;
  data?: string;
  name?: string;
  size?: number;
  mediaType?: string;
  message?: string;
}

/**
 * Type guard to validate read file response
 */
function isReadFileResponse(data: unknown): data is ReadFileResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as { success: unknown }).success === 'boolean'
  );
}

async function readFile(input: { path: string }): Promise<ReadFileResponse> {
  const { path } = input;
  console.log(`Reading file: ${path}`);

  try {
    const response = await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'read_file',
        path,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown;

    if (isReadFileResponse(data)) {
      return data;
    } else {
      return {
        success: false,
        message: 'Invalid response format from read file API',
      };
    }
  } catch (error) {
    console.error('Error in read_file action:', error);
    return {
      success: false,
      message: `Error reading file: ${getErrorMessage(error)}`,
    };
  }
}

/**
 * Interface for write file API response
 */
interface WriteFileResponse {
  success: boolean;
  message?: string;
}

/**
 * Type guard to validate write file response
 */
function isWriteFileResponse(data: unknown): data is WriteFileResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as { success: unknown }).success === 'boolean'
  );
}

export async function writeFile(input: {
  path: string;
  content: string;
}): Promise<WriteFileResponse> {
  const { path, content } = input;
  console.log(`Writing file: ${path}`);

  try {
    // Content is always base64 encoded
    const base64Data = content;

    const response = await fetch(`${BYTEBOT_DESKTOP_BASE_URL}/computer-use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'write_file',
        path,
        data: base64Data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown;

    if (isWriteFileResponse(data)) {
      return data;
    } else {
      return {
        success: false,
        message: 'Invalid response format from write file API',
      };
    }
  } catch (error) {
    console.error('Error in write_file action:', error);
    return {
      success: false,
      message: `Error writing file: ${getErrorMessage(error)}`,
    };
  }
}
