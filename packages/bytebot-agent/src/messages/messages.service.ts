/**
 * Messages Service - Advanced message processing and management for ByteBot Agent
 *
 * Provides comprehensive message creation, processing, and retrieval capabilities
 * with enterprise-grade logging, performance monitoring, and async resilience patterns.
 *
 * Features:
 * - Message lifecycle tracking with operation IDs
 * - Content validation and type-safe processing
 * - Performance metrics collection for all operations
 * - Retry mechanisms with exponential backoff
 * - Message filtering and grouping algorithms
 * - Real-time WebSocket notifications
 * - Content analysis and metrics
 *
 * Dependencies: PrismaService, TasksGateway, Logger
 * Usage: Message creation, processing, retrieval with comprehensive monitoring
 */

import {
  Injectable,
  Inject,
  forwardRef,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Message, MessageRole, Prisma } from '@prisma/client';
import {
  MessageContentBlock,
  MessageContentType,
  isComputerToolUseContentBlock,
  isToolResultContentBlock,
  isUserActionContentBlock,
  isMessageContentBlock,
} from '@bytebot/shared';
import { TasksGateway } from '../tasks/tasks.gateway';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

/**
 * Extended message type for processing with comprehensive metadata
 */
export interface ProcessedMessage extends Message {
  take_over?: boolean;
  processingMetrics?: {
    processingTimeMs: number;
    contentBlockCount: number;
    validationPassed: boolean;
  };
}

/**
 * Interface for grouped messages with processing metrics
 */
export interface GroupedMessages {
  role: MessageRole;
  messages: ProcessedMessage[];
  take_over?: boolean;
  groupMetrics?: {
    totalMessages: number;
    totalContentLength: number;
    processingTimeMs: number;
  };
}

/**
 * Interface for message creation with validation
 */
export interface CreateMessageRequest {
  content: MessageContentBlock[];
  role: MessageRole;
  taskId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for message creation result with metrics
 */
export interface MessageCreationResult {
  message: Message;
  operationId: string;
  contentMetrics: {
    blockCount: number;
    totalCharacters: number;
    validatedBlocks: number;
  };
  performanceMetrics: {
    processingTimeMs: number;
    databaseResponseTimeMs: number;
    validationTimeMs: number;
  };
}

/**
 * Interface for message retrieval with comprehensive metrics
 */
export interface MessageRetrievalResult {
  messages: Message[];
  operationId: string;
  retrievalMetrics: {
    totalCount: number;
    retrievalTimeMs: number;
    databaseResponseTimeMs: number;
    filteringTimeMs?: number;
  };
}

/**
 * Retry configuration for database operations
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 2000,
  };

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TasksGateway))
    private readonly tasksGateway: TasksGateway,
  ) {
    this.logger.log(
      'MessagesService initialized with enterprise monitoring capabilities',
      {
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'initialize',
        retryConfig: this.retryConfig,
      },
    );
  }

  /**
   * Creates a new message with comprehensive validation and performance tracking
   * @param data Message creation request with validation
   * @returns Promise<MessageCreationResult> Message with creation metrics
   */
  async create(_data: CreateMessageRequest): Promise<MessageCreationResult> {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Starting message creation', {
      operationId,
      taskId: data.taskId,
      role: data.role,
      contentBlockCount: data.content.length,
      timestamp: new Date().toISOString(),
      component: 'MessagesService',
      action: 'create',
    });

    try {
      // Validate input data
      this.validateMessageData(data, operationId);

      // Validate and process content blocks
      const validationStartTime = performance.now();
      const validatedContent = data.content.filter(
        (block): block is MessageContentBlock => isMessageContentBlock(block),
      );
      const validationTime = performance.now() - validationStartTime;

      if (validatedContent.length === 0) {
        throw new BadRequestException(
          'Invalid message content: no valid content blocks provided',
        );
      }

      // Calculate content metrics
      const contentMetrics = this.calculateContentMetrics(
        validatedContent,
        operationId,
      );

      // Create a deep copy and convert to Prisma JSON format safely
      const contentForStorage = structuredClone(
        validatedContent,
      ) as Prisma.InputJsonValue;

      // Create message with retry logic
      const databaseStartTime = performance.now();
      const message = await this.executeWithRetry(
        () =>
          this.prisma.message.create({
            _data: {
              content: contentForStorage,
              role: data.role,
              taskId: data.taskId,
              ...(data.metadata
                ? { _metadata: data.metadata as Prisma.InputJsonValue }
                : {}),
            },
          }),
        operationId,
        'create_message',
      );
      const databaseResponseTime = performance.now() - databaseStartTime;

      const processingTime = performance.now() - startTime;

      const _result: MessageCreationResult = {
        message,
        operationId,
        contentMetrics,
        performanceMetrics: {
          processingTimeMs: processingTime,
          databaseResponseTimeMs: databaseResponseTime,
          validationTimeMs: validationTime,
        },
      };

      // Emit WebSocket notification (non-blocking)
      void this.emitNewMessageWithLogging(data.taskId, message, operationId);

      this.logger.log('Message creation completed successfully', {
        operationId,
        messageId: message.id,
        taskId: data.taskId,
        role: data.role,
        processingTimeMs: processingTime,
        databaseResponseTimeMs: databaseResponseTime,
        validationTimeMs: validationTime,
        contentBlockCount: contentMetrics.blockCount,
        validatedBlockCount: contentMetrics.validatedBlocks,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'create',
      });

      return result;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Message creation failed', {
        operationId,
        taskId: data.taskId,
        role: data.role,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'create',
      });

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Finds every message for a task with comprehensive performance tracking
   * @param taskId Task identifier
   * @returns Promise<MessageRetrievalResult> All messages with retrieval metrics
   */
  async findEvery(taskId: string): Promise<MessageRetrievalResult> {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Retrieving all messages for task', {
      operationId,
      taskId,
      timestamp: new Date().toISOString(),
      component: 'MessagesService',
      action: 'findEvery',
    });

    try {
      // Validate task ID
      if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
        throw new BadRequestException('Invalid task ID provided');
      }

      const databaseStartTime = performance.now();
      const messages = await this.executeWithRetry(
        () =>
          this.prisma.message.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
          }),
        operationId,
        'find_every_message',
      );
      const databaseResponseTime = performance.now() - databaseStartTime;
      const processingTime = performance.now() - startTime;

      const _result: MessageRetrievalResult = {
        messages,
        operationId,
        retrievalMetrics: {
          totalCount: messages.length,
          retrievalTimeMs: processingTime,
          databaseResponseTimeMs: databaseResponseTime,
        },
      };

      this.logger.log('All messages retrieval completed', {
        operationId,
        taskId,
        messageCount: messages.length,
        processingTimeMs: processingTime,
        databaseResponseTimeMs: databaseResponseTime,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'findEvery',
      });

      return result;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('All messages retrieval failed', {
        operationId,
        taskId,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'findEvery',
      });

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Finds paginated messages for a task with comprehensive metrics
   * @param taskId Task identifier
   * @param options Pagination options
   * @returns Promise<MessageRetrievalResult> Paginated messages with retrieval metrics
   */
  async findAll(
    taskId: string,
    options?: {
      limit?: number;
      page?: number;
    },
  ): Promise<MessageRetrievalResult> {
    const operationId = randomUUID();
    const startTime = performance.now();
    const { limit = 10, page = 1 } = options || {};

    this.logger.log('Retrieving paginated messages for task', {
      operationId,
      taskId,
      limit,
      page,
      timestamp: new Date().toISOString(),
      component: 'MessagesService',
      action: 'findAll',
    });

    try {
      // Validate input parameters
      if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
        throw new BadRequestException('Invalid task ID provided');
      }

      if (limit < 1 || limit > 100) {
        throw new BadRequestException('Limit must be between 1 and 100');
      }

      if (page < 1) {
        throw new BadRequestException('Page must be greater than 0');
      }

      // Calculate offset based on page and limit
      const offset = (page - 1) * limit;

      const databaseStartTime = performance.now();
      const messages = await this.executeWithRetry(
        () =>
          this.prisma.message.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            take: limit,
            skip: offset,
          }),
        operationId,
        'find_all_messages',
      );
      const databaseResponseTime = performance.now() - databaseStartTime;
      const processingTime = performance.now() - startTime;

      const _result: MessageRetrievalResult = {
        messages,
        operationId,
        retrievalMetrics: {
          totalCount: messages.length,
          retrievalTimeMs: processingTime,
          databaseResponseTimeMs: databaseResponseTime,
        },
      };

      this.logger.log('Paginated messages retrieval completed', {
        operationId,
        taskId,
        messageCount: messages.length,
        limit,
        page,
        offset,
        processingTimeMs: processingTime,
        databaseResponseTimeMs: databaseResponseTime,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'findAll',
      });

      return result;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Paginated messages retrieval failed', {
        operationId,
        taskId,
        limit,
        page,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'findAll',
      });

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  async findUnsummarized(taskId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        taskId,
        // find messages that don't have a summaryId
        summaryId: null,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async attachSummary(
    taskId: string,
    summaryId: string,
    messageIds: string[],
  ): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    await this.prisma.message.updateMany({
      where: { taskId, id: { in: messageIds } },
      _data: { summaryId },
    });
  }

  /**
   * Groups back-to-back messages from the same role and take_over status
   */
  private groupBackToBackMessages(
    messages: ProcessedMessage[],
  ): GroupedMessages[] {
    const groupedConversation: GroupedMessages[] = [];
    let currentGroup: GroupedMessages | null = null;

    for (const message of messages) {
      const role = message.role;
      const isTakeOver = message.take_over || false;

      // If this is the first message, role is different, or take_over status is different from the previous group
      if (
        !currentGroup ||
        currentGroup.role !== role ||
        currentGroup.take_over !== isTakeOver
      ) {
        // Save the previous group if it exists
        if (currentGroup) {
          groupedConversation.push(currentGroup);
        }

        // Start a new group
        currentGroup = {
          role: role,
          messages: [message],
          take_over: isTakeOver,
        };
      } else {
        // Same role and take_over status as previous, merge the content
        currentGroup.messages.push(message);
      }
    }

    // Add the last group
    if (currentGroup) {
      groupedConversation.push(currentGroup);
    }

    return groupedConversation;
  }

  /**
   * Filters and processes messages, adding take_over flags where appropriate
   * Only text messages from the user should appear as user messages
   * Computer tool use messages should be shown as assistant messages with take_over flag
   */
  private filterMessages(messages: Message[]): ProcessedMessage[] {
    const filteredMessages: ProcessedMessage[] = [];

    for (const message of messages) {
      const processedMessage: ProcessedMessage = { ...message };

      // Type-safe content processing with validation
      if (!Array.isArray(message.content)) {
        // Skip messages with invalid content structure
        continue;
      }

      const contentBlocks = (message.content as unknown[]).filter(
        (block): block is MessageContentBlock => isMessageContentBlock(block),
      );

      // Skip messages with no valid content blocks
      if (contentBlocks.length === 0) {
        continue;
      }

      // If the role is a user message and all the content blocks are tool result blocks or they are take over actions
      if (message.role === MessageRole.USER) {
        if (contentBlocks.every((block) => isToolResultContentBlock(block))) {
          // Pure tool results should be shown as assistant messages
          processedMessage.role = MessageRole.ASSISTANT;
        } else if (
          contentBlocks.every((block) => isUserActionContentBlock(block))
        ) {
          // Extract computer tool use (take over actions) from the user action content blocks and show them as assistant messages with take_over flag
          const extractedContent = contentBlocks
            .flatMap((block) => {
              // Type-safe content extraction
              return Array.isArray(block.content) ? block.content : [];
            })
            .filter(
              (block) =>
                isMessageContentBlock(block) &&
                isComputerToolUseContentBlock(block),
            );

          processedMessage.content = JSON.parse(
            JSON.stringify(extractedContent),
          ) as Prisma.JsonValue;
          processedMessage.role = MessageRole.ASSISTANT;
          processedMessage.take_over = true;
        }
        // If there are text blocks mixed with tool blocks, keep as user message
        // Only pure text messages from user should remain as user messages
      }

      filteredMessages.push(processedMessage);
    }

    return filteredMessages;
  }

  /**
   * Returns raw messages without any processing - updated with enhanced result type
   * @param taskId Task identifier
   * @param options Pagination options
   * @returns Promise<MessageRetrievalResult> Raw messages with retrieval metrics
   */
  async findRawMessages(
    taskId: string,
    options?: {
      limit?: number;
      page?: number;
    },
  ): Promise<MessageRetrievalResult> {
    return this.findAll(taskId, options);
  }

  /**
   * Returns processed and grouped messages for the chat UI with comprehensive metrics
   * @param taskId Task identifier
   * @param options Pagination options
   * @returns Promise<{groupedMessages: GroupedMessages[], operationId: string, processingMetrics: object}>
   */
  async findProcessedMessages(
    taskId: string,
    options?: {
      limit?: number;
      page?: number;
    },
  ): Promise<{
    groupedMessages: GroupedMessages[];
    operationId: string;
    processingMetrics: {
      totalMessages: number;
      groupCount: number;
      processingTimeMs: number;
      filteringTimeMs: number;
      groupingTimeMs: number;
    };
  }> {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Processing messages for chat UI', {
      operationId,
      taskId,
      options,
      timestamp: new Date().toISOString(),
      component: 'MessagesService',
      action: 'findProcessedMessages',
    });

    try {
      // Get messages with metrics
      const messageResult = await this.findAll(taskId, options);

      // Filter messages with performance tracking
      const filteringStartTime = performance.now();
      const filteredMessages = this.filterMessages(messageResult.messages);
      const filteringTime = performance.now() - filteringStartTime;

      // Group messages with performance tracking
      const groupingStartTime = performance.now();
      const groupedMessages = this.groupBackToBackMessages(filteredMessages);
      const groupingTime = performance.now() - groupingStartTime;

      const processingTime = performance.now() - startTime;

      const result = {
        groupedMessages,
        operationId,
        processingMetrics: {
          totalMessages: messageResult.messages.length,
          groupCount: groupedMessages.length,
          processingTimeMs: processingTime,
          filteringTimeMs: filteringTime,
          groupingTimeMs: groupingTime,
        },
      };

      this.logger.log('Message processing completed', {
        operationId,
        taskId,
        totalMessages: messageResult.messages.length,
        groupCount: groupedMessages.length,
        processingTimeMs: processingTime,
        filteringTimeMs: filteringTime,
        groupingTimeMs: groupingTime,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'findProcessedMessages',
      });

      return result;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Message processing failed', {
        operationId,
        taskId,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'MessagesService',
        action: 'findProcessedMessages',
      });

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Validates message creation data
   * @private
   */
  private validateMessageData(
    _data: CreateMessageRequest,
    operationId: string,
  ): void {
    this.logger.debug('Validating message data', {
      operationId,
      component: 'MessagesService',
      action: 'validateMessageData',
    });

    if (
      !data.taskId ||
      typeof data.taskId !== 'string' ||
      data.taskId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Task ID is required and must be a non-empty string',
      );
    }

    if (!data.role || !Object.values(MessageRole).includes(data.role)) {
      throw new BadRequestException('Valid message role is required');
    }

    if (
      !data.content ||
      !Array.isArray(data.content) ||
      data.content.length === 0
    ) {
      throw new BadRequestException(
        'Message content is required and must be a non-empty array',
      );
    }

    // Validate each content block
    for (let i = 0; i < data.content.length; i++) {
      const block = data.content[i];
      if (!isMessageContentBlock(block)) {
        throw new BadRequestException(`Invalid content block at index ${i}`);
      }
    }
  }

  /**
   * Calculates content metrics for message content blocks
   * @private
   */
  private calculateContentMetrics(
    contentBlocks: MessageContentBlock[],
    operationId: string,
  ): MessageCreationResult['contentMetrics'] {
    this.logger.debug('Calculating content metrics', {
      operationId,
      blockCount: contentBlocks.length,
      component: 'MessagesService',
      action: 'calculateContentMetrics',
    });

    let totalCharacters = 0;
    let validatedBlocks = 0;

    for (const block of contentBlocks) {
      if (isMessageContentBlock(block)) {
        validatedBlocks++;

        // Calculate character count based on block type
        if (
          block.type === MessageContentType._Text &&
          'text' in block &&
          typeof block.text === 'string'
        ) {
          totalCharacters += block.text.length;
        } else if (
          block.type === MessageContentType._ToolResult &&
          'content' in block &&
          typeof block.content === 'string'
        ) {
          totalCharacters += (block.content as string).length;
        }
      }
    }

    return {
      blockCount: contentBlocks.length,
      totalCharacters,
      validatedBlocks,
    };
  }

  /**
   * Calculates total content length for a group of messages
   * @private
   */
  private calculateGroupContentLength(messages: ProcessedMessage[]): number {
    return messages.reduce(
      (total: number, message: ProcessedMessage): number => {
        if (Array.isArray(message.content)) {
          const contentLength = (
            message.content as MessageContentBlock[]
          ).reduce(
            (contentTotal: number, block: MessageContentBlock): number => {
              if (isMessageContentBlock(block)) {
                if (
                  block.type === MessageContentType._Text &&
                  'text' in block &&
                  typeof block.text === 'string'
                ) {
                  return contentTotal + block.text.length;
                } else if (
                  block.type === MessageContentType._ToolResult &&
                  'content' in block &&
                  typeof block.content === 'string'
                ) {
                  return contentTotal + (block.content as string).length;
                }
              }
              return contentTotal;
            },
            0,
          );
          return total + contentLength;
        }
        return total;
      },
      0,
    );
  }

  /**
   * Emits new message WebSocket notification with comprehensive logging
   * @private
   */
  private emitNewMessageWithLogging(
    taskId: string,
    message: Message,
    operationId: string,
  ): void {
    try {
      this.logger.debug('Emitting WebSocket notification for new message', {
        operationId,
        messageId: message.id,
        taskId,
        component: 'MessagesService',
        action: 'emitNewMessageWithLogging',
      });

      this.tasksGateway.emitNewMessage(taskId, message);

      this.logger.debug('WebSocket notification emitted successfully', {
        operationId,
        messageId: message.id,
        taskId,
        component: 'MessagesService',
        action: 'emitNewMessageWithLogging',
      });
    } catch (_error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.warn('WebSocket notification failed (non-critical)', {
        operationId,
        messageId: message.id,
        taskId,
        _error: errorMessage,
        stack: errorStack,
        component: 'MessagesService',
        action: 'emitNewMessageWithLogging',
      });

      // Don't throw - WebSocket notifications are non-critical
    }
  }

  /**
   * Executes database operations with retry logic and circuit breaker patterns
   * @private
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        this.logger.debug('Executing database operation', {
          operationId,
          operationName,
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
          component: 'MessagesService',
          action: 'executeWithRetry',
        });

        const result = await operation();

        if (attempt > 1) {
          this.logger.log('Database operation succeeded after retry', {
            operationId,
            operationName,
            attempt,
            component: 'MessagesService',
            action: 'executeWithRetry',
          });
        }

        return result;
      } catch (_error: unknown) {
        lastError =
          error instanceof Error ? _error : new Error('Unknown database error');

        if (attempt === this.retryConfig.maxAttempts) {
          this.logger.error(
            'Database operation failed after all retry attempts',
            {
              operationId,
              operationName,
              attempt,
              maxAttempts: this.retryConfig.maxAttempts,
              _error: lastError.message,
              stack: lastError.stack,
              component: 'MessagesService',
              action: 'executeWithRetry',
            },
          );
          break;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs,
        );

        this.logger.warn('Database operation failed, retrying', {
          operationId,
          operationName,
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
          retryDelayMs: delay,
          _error: lastError.message,
          component: 'MessagesService',
          action: 'executeWithRetry',
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw (
      lastError ||
      new Error('Database operation failed after all retry attempts')
    );
  }
}
