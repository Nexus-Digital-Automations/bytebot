import { Injectable, Logger } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { randomUUID } from 'crypto';
import {
  convertClickMouseActionToToolUseBlock,
  convertDragMouseActionToToolUseBlock,
  convertPressKeysActionToToolUseBlock,
  convertPressMouseActionToToolUseBlock,
  convertScrollActionToToolUseBlock,
  convertTypeKeysActionToToolUseBlock,
  convertTypeTextActionToToolUseBlock,
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
import { Role } from '@prisma/client';
import { MessagesService } from '../messages/messages.service';
import { ConfigService } from '@nestjs/config';

// Type-safe property extractors
function hasProperty(obj: unknown, prop: string): boolean {
  return typeof obj === 'object' && obj !== null && prop in obj;
}

function safeGetString(
  obj: unknown,
  prop: string,
  defaultValue: string,
): string {
  if (hasProperty(obj, prop)) {
    const value = (obj as Record<string, unknown>)[prop];
    return typeof value === 'string' ? value : defaultValue;
  }
  return defaultValue;
}

function safeGetNumber(
  obj: unknown,
  prop: string,
  defaultValue: number,
): number {
  if (hasProperty(obj, prop)) {
    const value = (obj as Record<string, unknown>)[prop];
    return typeof value === 'number' ? value : defaultValue;
  }
  return defaultValue;
}

function safeGetArray<T>(obj: unknown, prop: string, defaultValue: T[]): T[] {
  if (hasProperty(obj, prop)) {
    const value = (obj as Record<string, unknown>)[prop];
    return Array.isArray(value) ? (value as T[]) : defaultValue;
  }
  return defaultValue;
}

function safeGetCoordinates(
  obj: unknown,
  prop: string,
): { x: number; y: number } | undefined {
  if (hasProperty(obj, prop)) {
    const value = (obj as Record<string, unknown>)[prop];
    if (typeof value === 'object' && value !== null) {
      const coords = value as Record<string, unknown>;
      if (typeof coords.x === 'number' && typeof coords.y === 'number') {
        return { x: coords.x, y: coords.y };
      }
    }
  }
  return undefined;
}

// Generic action type
type GenericAction = {
  action: string;
  [key: string]: unknown;
};

@Injectable()
export class InputCaptureService {
  private readonly logger = new Logger(InputCaptureService.name);
  private socket: Socket | null = null;
  private capturing = false;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly configService: ConfigService,
  ) {}

  isCapturing(): boolean {
    return this.capturing;
  }

  start(taskId: string): void {
    if (this.socket?.connected && this.capturing) return;

    if (this.socket && !this.socket.connected) {
      this.socket.connect();
      return;
    }

    const baseUrl = this.configService.get<string>('BYTEBOT_DESKTOP_BASE_URL');
    if (!baseUrl) {
      this.logger.warn('BYTEBOT_DESKTOP_BASE_URL missing.');
      return;
    }

    this.socket = io(baseUrl, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      this.logger.log('Input socket connected');
      this.capturing = true;
    });

    this.socket.on(
      'screenshotAndAction',
      async (shot: { image: string }, action: GenericAction) => {
        if (!this.capturing || !taskId) return;
        // The gateway only sends a click_mouse or drag_mouse action together with screenshots for now.
        if (action.action !== 'click_mouse' && action.action !== 'drag_mouse')
          return;

        const userActionBlock: UserActionContentBlock = {
          type: MessageContentType.UserAction,
          content: [
            {
              type: MessageContentType.Image,
              source: {
                data: shot.image,
                media_type: 'image/png',
                type: 'base64',
              },
            },
          ],
        };

        const toolUseId = randomUUID();
        switch (action.action) {
          case 'drag_mouse': {
            const dragAction: DragMouseAction = {
              action: 'drag_mouse',
              path: safeGetArray(action, 'path', []),
              button: safeGetString(action, 'button', 'left') as
                | 'left'
                | 'right'
                | 'middle',
            };
            userActionBlock.content.push(
              convertDragMouseActionToToolUseBlock(dragAction, toolUseId),
            );
            break;
          }
          case 'click_mouse': {
            const coordinates = safeGetCoordinates(action, 'coordinates');
            const clickAction: ClickMouseAction = {
              action: 'click_mouse',
              coordinates,
              button: safeGetString(action, 'button', 'left') as
                | 'left'
                | 'right'
                | 'middle',
              clickCount: safeGetNumber(action, 'clickCount', 1),
            };
            userActionBlock.content.push(
              convertClickMouseActionToToolUseBlock(clickAction, toolUseId),
            );
            break;
          }
        }

        await this.messagesService.create({
          content: [userActionBlock],
          role: Role.USER,
          taskId,
        });
      },
    );

    this.socket.on('action', async (action: GenericAction) => {
      if (!this.capturing || !taskId) return;
      const toolUseId = randomUUID();
      const userActionBlock: UserActionContentBlock = {
        type: MessageContentType.UserAction,
        content: [],
      };

      switch (action.action) {
        case 'drag_mouse': {
          const dragAction: DragMouseAction = {
            action: 'drag_mouse',
            path: safeGetArray(action, 'path', []),
            button: safeGetString(action, 'button', 'left') as
              | 'left'
              | 'right'
              | 'middle',
          };
          userActionBlock.content.push(
            convertDragMouseActionToToolUseBlock(dragAction, toolUseId),
          );
          break;
        }
        case 'press_mouse': {
          const coordinates = safeGetCoordinates(action, 'coordinates');
          const pressAction: PressMouseAction = {
            action: 'press_mouse',
            coordinates,
            button: safeGetString(action, 'button', 'left') as
              | 'left'
              | 'right'
              | 'middle',
            press: safeGetString(action, 'press', 'down') as 'down' | 'up',
          };
          userActionBlock.content.push(
            convertPressMouseActionToToolUseBlock(pressAction, toolUseId),
          );
          break;
        }
        case 'type_keys': {
          const typeKeysAction: TypeKeysAction = {
            action: 'type_keys',
            keys: safeGetArray(action, 'keys', []),
          };
          userActionBlock.content.push(
            convertTypeKeysActionToToolUseBlock(typeKeysAction, toolUseId),
          );
          break;
        }
        case 'press_keys': {
          const pressKeysAction: PressKeysAction = {
            action: 'press_keys',
            keys: safeGetArray(action, 'keys', []),
            press: safeGetString(action, 'press', 'down') as 'down' | 'up',
          };
          userActionBlock.content.push(
            convertPressKeysActionToToolUseBlock(pressKeysAction, toolUseId),
          );
          break;
        }
        case 'type_text': {
          const typeTextAction: TypeTextAction = {
            action: 'type_text',
            text: safeGetString(action, 'text', ''),
          };
          userActionBlock.content.push(
            convertTypeTextActionToToolUseBlock(typeTextAction, toolUseId),
          );
          break;
        }
        case 'scroll': {
          const coordinates = safeGetCoordinates(action, 'coordinates');
          const scrollAction: ScrollAction = {
            action: 'scroll',
            coordinates,
            direction: safeGetString(action, 'direction', 'up') as
              | 'up'
              | 'down'
              | 'left'
              | 'right',
            scrollCount: safeGetNumber(action, 'scrollCount', 1),
          };
          userActionBlock.content.push(
            convertScrollActionToToolUseBlock(scrollAction, toolUseId),
          );
          break;
        }
        default:
          this.logger.warn(`Unknown action ${action.action}`);
      }

      if (userActionBlock.content.length > 0) {
        await this.messagesService.create({
          content: [userActionBlock],
          role: Role.USER,
          taskId,
        });
      }
    });

    this.socket.on('disconnect', () => {
      this.logger.log('Input socket disconnected');
      this.capturing = false;
    });
  }

  stop(): void {
    if (!this.socket) return;
    if (this.socket.connected) this.socket.disconnect();
    else this.socket.removeAllListeners();
    this.socket = null;
    this.capturing = false;
  }
}
