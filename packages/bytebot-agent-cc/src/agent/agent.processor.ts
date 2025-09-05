import { TasksService } from '../tasks/tasks.service';
import { MessagesService } from '../messages/messages.service';
import { Injectable, Logger } from '@nestjs/common';
import { Role, Task, TaskStatus } from '@prisma/client';
import {
  RedactedThinkingContentBlock,
  ThinkingContentBlock,
  ToolUseContentBlock,
} from '@bytebot/shared';

import {
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
} from '@bytebot/shared';

/**
 * Type-safe utility for extracting content from unknown message types
 */
interface MessageWithContent {
  content?: unknown;
}

/**
 * Type guard to check if a value has a content property
 */
function isMessageWithContent(value: unknown): value is MessageWithContent {
  return value != null && typeof value === 'object' && 'content' in value;
}

/**
 * Safely extract content from unknown message objects
 */
function getSafeMessageContent(
  message: unknown,
): MessageContentBlock[] | string | null {
  if (!isMessageWithContent(message)) {
    return null;
  }

  const { content } = message;

  if (Array.isArray(content)) {
    // Validate that all items are MessageContentBlock-like
    const isValidContentArray = content.every(
      (item) => item != null && typeof item === 'object' && 'type' in item,
    );

    if (isValidContentArray) {
      return content as MessageContentBlock[];
    }
  }

  if (typeof content === 'string') {
    return content;
  }

  return null;
}

import { InputCaptureService } from './input-capture.service';
import { OnEvent } from '@nestjs/event-emitter';
// Import from agent.types as needed
import { AGENT_SYSTEM_PROMPT } from './agent.constants';
import { query } from '@anthropic-ai/claude-code';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AgentProcessor {
  private readonly logger = new Logger(AgentProcessor.name);
  private currentTaskId: string | null = null;
  private isProcessing = false;
  private abortController: AbortController | null = null;

  private readonly BYTEBOT_DESKTOP_BASE_URL = process.env
    .BYTEBOT_DESKTOP_BASE_URL as string;

  constructor(
    private readonly tasksService: TasksService,
    private readonly messagesService: MessagesService,
    private readonly inputCaptureService: InputCaptureService,
  ) {
    this.logger.log('AgentProcessor initialized');
  }

  /**
   * Check if the processor is currently processing a task
   */
  isRunning(): boolean {
    return this.isProcessing;
  }

  /**
   * Get the current task ID being processed
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  @OnEvent('task.takeover')
  handleTaskTakeover({ taskId }: { taskId: string }) {
    this.logger.log(`Task takeover event received for task ID: ${taskId}`);

    // If the agent is still processing this task, abort any in-flight operations
    if (this.currentTaskId === taskId && this.isProcessing) {
      this.abortController?.abort();
    }

    // Always start capturing user input so that emitted actions are received
    this.inputCaptureService.start(taskId);
  }

  @OnEvent('task.resume')
  handleTaskResume({ taskId }: { taskId: string }) {
    if (this.currentTaskId === taskId && this.isProcessing) {
      this.logger.log(`Task resume event received for task ID: ${taskId}`);
      this.abortController = new AbortController();

      void this.runIteration(taskId);
    }
  }

  @OnEvent('task.cancel')
  async handleTaskCancel({ taskId }: { taskId: string }) {
    this.logger.log(`Task cancel event received for task ID: ${taskId}`);

    await this.stopProcessing();
  }

  processTask(taskId: string) {
    this.logger.log(`Starting processing for task ID: ${taskId}`);

    if (this.isProcessing) {
      this.logger.warn('AgentProcessor is already processing another task');
      return;
    }

    this.isProcessing = true;
    this.currentTaskId = taskId;
    this.abortController = new AbortController();

    // Kick off the first iteration without blocking the caller
    void this.runIteration(taskId);
  }

  /**
   * Convert Anthropic's response content to our MessageContentBlock format
   */
  private formatAnthropicResponse(
    content: Anthropic.ContentBlock[],
  ): MessageContentBlock[] {
    // filter out tool_use blocks that aren't computer tool uses
    content = content.filter(
      (block) =>
        block.type !== 'tool_use' || block.name.startsWith('mcp__desktop__'),
    );
    return content.map((block) => {
      switch (block.type) {
        case 'text':
          return {
            type: MessageContentType.Text,
            text: block.text,
          } as TextContentBlock;
        case 'tool_use':
          return {
            type: MessageContentType.ToolUse,
            id: block.id,
            name: block.name.replace('mcp__desktop__', ''),
            input: block.input,
          } as ToolUseContentBlock;
        case 'thinking':
          return {
            type: MessageContentType.Thinking,
            thinking: block.thinking,
            signature: block.signature,
          } as ThinkingContentBlock;
        case 'redacted_thinking':
          return {
            type: MessageContentType.RedactedThinking,
            data: block.data,
          } as RedactedThinkingContentBlock;
      }
    });
  }

  /**
   * Runs a single iteration of task processing and schedules the next
   * iteration via setImmediate while the task remains RUNNING.
   */
  private async runIteration(taskId: string): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      const task: Task = await this.tasksService.findById(taskId);

      if (task.status !== TaskStatus.RUNNING) {
        this.logger.log(
          `Task processing completed for task ID: ${taskId} with status: ${task.status}`,
        );
        this.isProcessing = false;
        this.currentTaskId = null;
        return;
      }

      this.logger.log(`Processing iteration for task ID: ${taskId}`);

      // Refresh abort controller for this iteration to avoid accumulating
      // "abort" listeners on a single AbortSignal across iterations.
      this.abortController = new AbortController();
      for await (const message of query({
        prompt: task.description,
        options: {
          abortController: this.abortController,
          appendSystemPrompt: AGENT_SYSTEM_PROMPT,
          permissionMode: 'bypassPermissions',
          mcpServers: {
            desktop: {
              type: 'sse',
              url: `${this.BYTEBOT_DESKTOP_BASE_URL}/mcp`,
            },
          },
        },
      })) {
        let messageContentBlocks: MessageContentBlock[] = [];
        let role: Role = Role.ASSISTANT;
        switch (message.type) {
          case 'user': {
            const safeContent = getSafeMessageContent(message.message);
            if (Array.isArray(safeContent)) {
              messageContentBlocks = safeContent;
            } else if (typeof safeContent === 'string') {
              messageContentBlocks = [
                {
                  type: MessageContentType.Text,
                  text: safeContent,
                } as TextContentBlock,
              ];
            }

            role = Role.USER;
            break;
          }
          case 'assistant': {
            const safeContent = getSafeMessageContent(message.message);
            if (Array.isArray(safeContent)) {
              messageContentBlocks = this.formatAnthropicResponse(
                safeContent as Anthropic.ContentBlock[],
              );
            }
            break;
          }
          case 'system':
            break;
          case 'result': {
            switch (message.subtype) {
              case 'success':
                await this.tasksService.update(taskId, {
                  status: TaskStatus.COMPLETED,
                  completedAt: new Date(),
                });
                break;
              case 'error_max_turns':
              case 'error_during_execution':
                await this.tasksService.update(taskId, {
                  status: TaskStatus.NEEDS_HELP,
                });
                break;
            }
            break;
          }
        }

        this.logger.debug(
          `Received ${messageContentBlocks.length} content blocks from LLM`,
        );

        if (messageContentBlocks.length > 0) {
          await this.messagesService.create({
            content: messageContentBlocks,
            role,
            taskId,
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      if (errorMessage === 'Claude Code process aborted by user') {
        this.logger.warn(`Processing aborted for task ID: ${taskId}`);
      } else {
        this.logger.error(
          `Error during task processing iteration for task ID: ${taskId} - ${errorMessage}`,
          errorStack,
        );
        await this.tasksService.update(taskId, {
          status: TaskStatus.FAILED,
        });
        this.isProcessing = false;
        this.currentTaskId = null;
      }
    }
  }

  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    await Promise.resolve(); // Satisfy async requirement

    this.logger.log(`Stopping execution of task ${this.currentTaskId}`);

    // Signal any in-flight async operations to abort
    this.abortController?.abort();

    this.inputCaptureService.stop();

    this.isProcessing = false;
    this.currentTaskId = null;
  }
}
