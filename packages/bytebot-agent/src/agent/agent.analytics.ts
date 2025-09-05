import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { TasksService } from '../tasks/tasks.service';
import { MessagesService } from '../messages/messages.service';

/**
 * Type guard to safely check if a value is an Error instance
 * @param error - Unknown error value to check
 * @returns True if the value is an Error instance
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Safely extracts error message from unknown error value
 * @param error - Unknown error value
 * @returns Safe error message string
 */
function getSafeErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Safely extracts error stack trace from unknown error value
 * @param error - Unknown error value
 * @returns Safe error stack string or undefined
 */
function getSafeErrorStack(error: unknown): string | undefined {
  if (isError(error)) {
    return error.stack;
  }
  return undefined;
}

@Injectable()
export class AgentAnalyticsService {
  private readonly logger = new Logger(AgentAnalyticsService.name);
  private readonly endpoint?: string;

  constructor(
    private readonly tasksService: TasksService,
    private readonly messagesService: MessagesService,
    configService: ConfigService,
  ) {
    this.endpoint = configService.get<string>('BYTEBOT_ANALYTICS_ENDPOINT');
    if (!this.endpoint) {
      this.logger.warn(
        'BYTEBOT_ANALYTICS_ENDPOINT is not set. Analytics service disabled.',
      );
    }
  }

  @OnEvent('task.cancel')
  @OnEvent('task.failed')
  @OnEvent('task.completed')
  async handleTaskEvent(payload: { taskId: string }) {
    if (!this.endpoint) return;

    try {
      const task = await this.tasksService.findById(payload.taskId);
      const messages = await this.messagesService.findEvery(payload.taskId);

      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, messages }),
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send analytics for task ${payload.taskId}: ${getSafeErrorMessage(error)}`,
        getSafeErrorStack(error),
      );
    }
  }
}
