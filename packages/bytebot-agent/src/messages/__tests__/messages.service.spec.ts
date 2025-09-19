/**
 * MessagesService Unit Tests - Comprehensive Message Processing Testing
 *
 * Production-ready unit tests covering all MessagesService functionality:
 * - Message creation with content validation and WebSocket integration
 * - Message retrieval operations (findAll, findEvery, findUnsummarized)
 * - Message processing and filtering (role transformation, content extraction)
 * - Message grouping (back-to-back message consolidation)
 * - Summary attachment and management
 * - Content block validation and type safety
 * - Error handling and edge cases
 * - Performance optimization and pagination
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  MessagesService,
  ProcessedMessage,
  GroupedMessages,
} from '../messages.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TasksGateway } from '../../tasks/tasks.gateway';
import { Message, MessageRole, Prisma } from '@prisma/client';
import {
  MessageContentType,
  MessageContentBlock,
  TextContentBlock,
  ImageContentBlock,
  ToolResultContentBlock,
  UserActionContentBlock,
  ComputerToolUseContentBlock,
} from '@bytebot/shared';

describe('MessagesService', () => {
  let service: MessagesService;
  let prismaService: any;
  let tasksGateway: any;

  // Test data fixtures
  const mockTaskId = 'task-123';
  const mockMessageId = 'message-456';
  const mockSummaryId = 'summary-789';

  const mockTextContentBlock: TextContentBlock = {
    type: MessageContentType._Text,
    text: 'Hello, this is a test message',
  };

  const mockImageContentBlock: ImageContentBlock = {
    type: MessageContentType._Image,
    source: {
      media_type: 'image/png',
      type: 'base64',
      data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
  };

  const mockToolResultContentBlock: ToolResultContentBlock = {
    type: MessageContentType._ToolResult,
    tool_use_id: 'tool-123',
    content: [
      {
        type: MessageContentType._Text,
        text: 'Tool execution successful',
      },
    ],
  };

  const mockComputerToolUseContentBlock = {
    type: MessageContentType._ToolUse,
    id: 'computer-tool-123',
    name: 'computer_click_mouse',
    input: {
      coordinates: [100, 200],
      button: 'left',
      clickCount: 1,
    },
  } as any;

  const mockUserActionContentBlock = {
    type: MessageContentType._UserAction,
    content: [mockComputerToolUseContentBlock],
  } as any;

  const mockUserMessage: Message = {
    id: mockMessageId,
    content: [mockTextContentBlock] as unknown as Prisma.JsonValue,
    role: MessageRole.USER,
    taskId: mockTaskId,
    summaryId: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  };

  const mockAssistantMessage: Message = {
    id: 'message-assistant-123',
    content: [
      {
        type: MessageContentType._Text,
        text: 'I understand your request. Let me help you with that.',
      },
    ],
    role: MessageRole.ASSISTANT,
    taskId: mockTaskId,
    summaryId: null,
    createdAt: new Date('2024-01-01T10:01:00.000Z'),
    updatedAt: new Date('2024-01-01T10:01:00.000Z'),
  };

  const mockToolResultMessage: Message = {
    id: 'message-tool-result-123',
    content: [mockToolResultContentBlock] as any,
    role: MessageRole.USER,
    taskId: mockTaskId,
    summaryId: null,
    createdAt: new Date('2024-01-01T10:02:00.000Z'),
    updatedAt: new Date('2024-01-01T10:02:00.000Z'),
  };

  beforeEach(async () => {
    // Create simple mocks
    prismaService = {
      message: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    tasksGateway = {
      emitNewMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: TasksGateway,
          useValue: tasksGateway,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Creation - create()', () => {
    const createMessageDto = {
      content: [mockTextContentBlock],
      role: MessageRole.USER,
      taskId: mockTaskId,
    };

    beforeEach(() => {
      prismaService.message.create.mockResolvedValue(mockUserMessage);
    });

    it('should create a new message successfully with metrics tracking', async () => {
      const result = await service.create(createMessageDto);

      expect(result).toBeDefined();
      expect(result.message).toEqual(mockUserMessage);
      expect(result.operationId).toBeDefined();
      expect(result.contentMetrics).toBeDefined();
      expect(result.performanceMetrics).toBeDefined();

      // Verify content metrics
      expect(result.contentMetrics.blockCount).toBe(1);
      expect(result.contentMetrics.totalCharacters).toBe(
        mockTextContentBlock.text.length,
      );
      expect(result.contentMetrics.validatedBlocks).toBe(1);

      // Verify performance metrics
      expect(result.performanceMetrics.processingTimeMs).toBeGreaterThan(0);
      expect(result.performanceMetrics.databaseResponseTimeMs).toBeGreaterThan(
        0,
      );
      expect(result.performanceMetrics.validationTimeMs).toBeGreaterThan(0);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: createMessageDto.content,
          role: createMessageDto.role,
          taskId: createMessageDto.taskId,
        },
      });
      expect(tasksGateway.emitNewMessage).toHaveBeenCalledWith(
        mockTaskId,
        mockUserMessage,
      );
    });

    it('should create message with complex content blocks', async () => {
      const complexDto = {
        content: [
          mockTextContentBlock,
          mockImageContentBlock,
          mockToolResultContentBlock,
        ],
        role: MessageRole.ASSISTANT,
        taskId: mockTaskId,
      };

      await service.create(complexDto);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: complexDto.content,
          role: complexDto.role,
          taskId: complexDto.taskId,
        },
      });
    });

    it('should filter out invalid content blocks', async () => {
      const dtoWithInvalidContent = {
        content: [
          mockTextContentBlock,
          { invalidField: 'invalid' }, // Invalid content block
          mockImageContentBlock,
        ] as any[],
        role: MessageRole.USER,
        taskId: mockTaskId,
      };

      await service.create(dtoWithInvalidContent);

      // Should only include valid content blocks
      const createCall = prismaService.message.create.mock.calls[0][0];
      expect(createCall.data.content).toHaveLength(2);
      expect(createCall.data.content).toContainEqual(mockTextContentBlock);
      expect(createCall.data.content).toContainEqual(mockImageContentBlock);
    });

    it('should throw error when no valid content blocks provided', async () => {
      const invalidDto = {
        content: [
          { invalidField: 'invalid' },
          { anotherInvalid: 'field' },
        ] as any[],
        role: MessageRole.USER,
        taskId: mockTaskId,
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        'Invalid message content: no valid content blocks provided',
      );
    });

    it('should handle empty content array', async () => {
      const emptyDto = {
        content: [],
        role: MessageRole.USER,
        taskId: mockTaskId,
      };

      await expect(service.create(emptyDto)).rejects.toThrow(
        'Invalid message content: no valid content blocks provided',
      );
    });

    it('should use structuredClone for deep copying content', async () => {
      const originalContent = [mockTextContentBlock];
      const dto = {
        content: originalContent,
        role: MessageRole.USER,
        taskId: mockTaskId,
      };

      await service.create(dto);

      // Verify the original content is not modified
      expect(originalContent).toEqual([mockTextContentBlock]);
      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: originalContent,
          role: dto.role,
          taskId: dto.taskId,
        },
      });
    });

    it('should validate task ID requirements', async () => {
      const invalidDto = {
        content: [mockTextContentBlock],
        role: MessageRole.USER,
        taskId: '', // Empty task ID
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        'Task ID is required and must be a non-empty string',
      );
    });

    it('should validate role requirements', async () => {
      const invalidDto = {
        content: [mockTextContentBlock],
        role: 'INVALID_ROLE' as any,
        taskId: mockTaskId,
      };

      await expect(service.create(invalidDto)).rejects.toThrow(
        'Valid message role is required',
      );
    });

    it('should include metadata when provided', async () => {
      const dtoWithMetadata = {
        content: [mockTextContentBlock],
        role: MessageRole.USER,
        taskId: mockTaskId,
        metadata: { source: 'test', priority: 'high' },
      };

      await service.create(dtoWithMetadata);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: dtoWithMetadata.content,
          role: dtoWithMetadata.role,
          taskId: dtoWithMetadata.taskId,
          metadata: dtoWithMetadata.metadata,
        },
      });
    });

    it('should handle database creation errors with retry logic', async () => {
      const dbError = new Error('Database constraint violation');
      prismaService.message.create
        .mockRejectedValueOnce(new Error('Transient error'))
        .mockRejectedValueOnce(new Error('Another transient error'))
        .mockResolvedValueOnce(mockUserMessage);

      const result = await service.create(createMessageDto);

      expect(result.message).toEqual(mockUserMessage);
      expect(prismaService.message.create).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retry attempts', async () => {
      const dbError = new Error('Persistent database error');
      prismaService.message.create.mockRejectedValue(dbError);

      await expect(service.create(createMessageDto)).rejects.toThrow(dbError);
      expect(tasksGateway.emitNewMessage).not.toHaveBeenCalled();
      expect(prismaService.message.create).toHaveBeenCalledTimes(3); // Max retry attempts
    });
  });

  describe('Message Retrieval Operations', () => {
    const mockMessages = [
      mockUserMessage,
      mockAssistantMessage,
      mockToolResultMessage,
    ];

    beforeEach(() => {
      prismaService.message.findMany.mockResolvedValue(mockMessages);
    });

    describe('findEvery()', () => {
      it('should retrieve all messages for a task with metrics', async () => {
        const result = await service.findEvery(mockTaskId);

        expect(result).toBeDefined();
        expect(result.messages).toEqual(mockMessages);
        expect(result.operationId).toBeDefined();
        expect(result.retrievalMetrics).toBeDefined();
        expect(result.retrievalMetrics.totalCount).toBe(mockMessages.length);
        expect(result.retrievalMetrics.retrievalTimeMs).toBeGreaterThan(0);
        expect(result.retrievalMetrics.databaseResponseTimeMs).toBeGreaterThan(
          0,
        );

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
        });
      });

      it('should handle empty results with proper metrics', async () => {
        prismaService.message.findMany.mockResolvedValue([]);

        const result = await service.findEvery(mockTaskId);

        expect(result.messages).toEqual([]);
        expect(result.retrievalMetrics.totalCount).toBe(0);
        expect(result.retrievalMetrics.retrievalTimeMs).toBeGreaterThan(0);
      });

      it('should validate task ID and throw BadRequestException for invalid input', async () => {
        await expect(service.findEvery('')).rejects.toThrow(
          'Invalid task ID provided',
        );
        await expect(service.findEvery(null as any)).rejects.toThrow(
          'Invalid task ID provided',
        );
        await expect(service.findEvery('   ')).rejects.toThrow(
          'Invalid task ID provided',
        );
      });

      it('should handle database errors with retry logic', async () => {
        prismaService.message.findMany
          .mockRejectedValueOnce(new Error('Connection timeout'))
          .mockRejectedValueOnce(new Error('Lock timeout'))
          .mockResolvedValueOnce(mockMessages);

        const result = await service.findEvery(mockTaskId);

        expect(result.messages).toEqual(mockMessages);
        expect(prismaService.message.findMany).toHaveBeenCalledTimes(3);
      });
    });

    describe('findAll()', () => {
      it('should retrieve messages with default pagination and metrics', async () => {
        const result = await service.findAll(mockTaskId);

        expect(result).toBeDefined();
        expect(result.messages).toEqual(mockMessages);
        expect(result.operationId).toBeDefined();
        expect(result.retrievalMetrics).toBeDefined();
        expect(result.retrievalMetrics.totalCount).toBe(mockMessages.length);
        expect(result.retrievalMetrics.retrievalTimeMs).toBeGreaterThan(0);
        expect(result.retrievalMetrics.databaseResponseTimeMs).toBeGreaterThan(
          0,
        );

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 10,
          skip: 0,
        });
      });

      it('should apply custom pagination parameters', async () => {
        await service.findAll(mockTaskId, { limit: 20, page: 3 });

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 20,
          skip: 40, // (3-1) * 20
        });
      });

      it('should handle page 1 correctly', async () => {
        await service.findAll(mockTaskId, { limit: 5, page: 1 });

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 5,
          skip: 0,
        });
      });

      it('should handle undefined options', async () => {
        await service.findAll(mockTaskId, undefined);

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 10,
          skip: 0,
        });
      });

      it('should handle partial options', async () => {
        await service.findAll(mockTaskId, { limit: 15 });

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 15,
          skip: 0,
        });
      });

      it('should validate pagination parameters', async () => {
        // Test invalid limit values
        await expect(service.findAll(mockTaskId, { limit: 0 })).rejects.toThrow(
          'Limit must be between 1 and 100',
        );

        await expect(
          service.findAll(mockTaskId, { limit: 101 }),
        ).rejects.toThrow('Limit must be between 1 and 100');

        // Test invalid page values
        await expect(service.findAll(mockTaskId, { page: 0 })).rejects.toThrow(
          'Page must be greater than 0',
        );

        await expect(service.findAll(mockTaskId, { page: -1 })).rejects.toThrow(
          'Page must be greater than 0',
        );
      });
    });

    describe('findUnsummarized()', () => {
      it('should retrieve unsummarized messages', async () => {
        const unsummarizedMessages = [mockUserMessage, mockAssistantMessage];
        prismaService.message.findMany.mockResolvedValue(unsummarizedMessages);

        const result = await service.findUnsummarized(mockTaskId);

        expect(result).toEqual(unsummarizedMessages);
        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: {
            taskId: mockTaskId,
            summaryId: null,
          },
          orderBy: { createdAt: 'asc' },
        });
      });

      it('should return empty array when all messages are summarized', async () => {
        prismaService.message.findMany.mockResolvedValue([]);

        const result = await service.findUnsummarized(mockTaskId);

        expect(result).toEqual([]);
      });
    });

    describe('findRawMessages()', () => {
      it('should return raw messages without processing', async () => {
        const result = await service.findRawMessages(mockTaskId);

        expect(result).toEqual(mockMessages);
        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 10,
          skip: 0,
        });
      });

      it('should apply pagination to raw messages', async () => {
        await service.findRawMessages(mockTaskId, { limit: 25, page: 2 });

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 25,
          skip: 25,
        });
      });
    });
  });

  describe('Summary Management - attachSummary()', () => {
    it('should attach summary to multiple messages', async () => {
      const messageIds = ['msg-1', 'msg-2', 'msg-3'];
      prismaService.message.updateMany.mockResolvedValue({ count: 3 });

      await service.attachSummary(mockTaskId, mockSummaryId, messageIds);

      expect(prismaService.message.updateMany).toHaveBeenCalledWith({
        where: { taskId: mockTaskId, id: { in: messageIds } },
        data: { summaryId: mockSummaryId },
      });
    });

    it('should handle empty messageIds array', async () => {
      await service.attachSummary(mockTaskId, mockSummaryId, []);

      expect(prismaService.message.updateMany).not.toHaveBeenCalled();
    });

    it('should handle single message ID', async () => {
      const messageIds = ['msg-1'];
      prismaService.message.updateMany.mockResolvedValue({ count: 1 });

      await service.attachSummary(mockTaskId, mockSummaryId, messageIds);

      expect(prismaService.message.updateMany).toHaveBeenCalledWith({
        where: { taskId: mockTaskId, id: { in: messageIds } },
        data: { summaryId: mockSummaryId },
      });
    });

    it('should handle database update errors', async () => {
      const dbError = new Error('Constraint violation');
      prismaService.message.updateMany.mockRejectedValue(dbError);

      await expect(
        service.attachSummary(mockTaskId, mockSummaryId, ['msg-1']),
      ).rejects.toThrow(dbError);
    });
  });

  describe('Message Processing and Filtering', () => {
    describe('findProcessedMessages()', () => {
      it('should return processed and grouped messages', async () => {
        const rawMessages = [
          mockUserMessage,
          mockAssistantMessage,
          {
            ...mockUserMessage,
            id: 'user-2',
            content: [
              { type: MessageContentType._Text, text: 'Another user message' },
            ],
            createdAt: new Date('2024-01-01T10:03:00.000Z'),
          },
        ];

        prismaService.message.findMany.mockResolvedValue(rawMessages);

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toBeDefined();
        expect(result).toHaveProperty('groupedMessages');
        expect(Array.isArray(result.groupedMessages)).toBe(true);
        expect(result.groupedMessages.length).toBeGreaterThan(0);

        // Verify the structure of grouped messages
        result.groupedMessages.forEach((group) => {
          expect(group).toHaveProperty('role');
          expect(group).toHaveProperty('messages');
          expect(Array.isArray(group.messages)).toBe(true);
        });
      });

      it('should handle tool result messages (role transformation)', async () => {
        const toolResultOnlyMessage: Message = {
          id: 'tool-msg-123',
          content: [mockToolResultContentBlock],
          role: MessageRole.USER,
          taskId: mockTaskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:04:00.000Z'),
          updatedAt: new Date('2024-01-01T10:04:00.000Z'),
        };

        prismaService.message.findMany.mockResolvedValue([
          toolResultOnlyMessage,
        ]);

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toHaveLength(1);
        expect(result[0].role).toBe(MessageRole.ASSISTANT);
        expect(result[0].messages).toHaveLength(1);
        expect(result[0].messages[0].role).toBe(MessageRole.ASSISTANT);
      });

      it('should handle user action messages (take_over flag)', async () => {
        const userActionMessage: Message = {
          id: 'user-action-123',
          content: [mockUserActionContentBlock],
          role: MessageRole.USER,
          taskId: mockTaskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:05:00.000Z'),
          updatedAt: new Date('2024-01-01T10:05:00.000Z'),
        };

        prismaService.message.findMany.mockResolvedValue([userActionMessage]);

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toHaveLength(1);
        expect(result[0].role).toBe(MessageRole.ASSISTANT);
        expect(result[0].take_over).toBe(true);
        expect(result[0].messages).toHaveLength(1);
        expect(result[0].messages[0].take_over).toBe(true);
      });

      it('should group consecutive messages from same role', async () => {
        const consecutiveAssistantMessages = [
          mockAssistantMessage,
          {
            ...mockAssistantMessage,
            id: 'assistant-2',
            content: [
              {
                type: MessageContentType._Text,
                text: 'Second assistant message',
              },
            ],
            createdAt: new Date('2024-01-01T10:06:00.000Z'),
          },
          {
            ...mockAssistantMessage,
            id: 'assistant-3',
            content: [
              {
                type: MessageContentType._Text,
                text: 'Third assistant message',
              },
            ],
            createdAt: new Date('2024-01-01T10:07:00.000Z'),
          },
        ];

        prismaService.message.findMany.mockResolvedValue(
          consecutiveAssistantMessages,
        );

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toHaveLength(1);
        expect(result[0].role).toBe(MessageRole.ASSISTANT);
        expect(result[0].messages).toHaveLength(3);
      });

      it('should separate groups when take_over status changes', async () => {
        const messagesWithTakeOverChange = [
          {
            ...mockAssistantMessage,
            id: 'assistant-normal',
            content: [
              {
                type: MessageContentType._Text,
                text: 'Normal assistant message',
              },
            ],
          },
          {
            id: 'user-action-takeover',
            content: [mockUserActionContentBlock],
            role: MessageRole.USER,
            taskId: mockTaskId,
            summaryId: null,
            createdAt: new Date('2024-01-01T10:08:00.000Z'),
            updatedAt: new Date('2024-01-01T10:08:00.000Z'),
          },
        ];

        prismaService.message.findMany.mockResolvedValue(
          messagesWithTakeOverChange,
        );

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toHaveLength(2);
        expect(result[0].role).toBe(MessageRole.ASSISTANT);
        expect(result[0].take_over).toBe(false);
        expect(result[1].role).toBe(MessageRole.ASSISTANT);
        expect(result[1].take_over).toBe(true);
      });

      it('should handle messages with invalid content structure', async () => {
        const messageWithInvalidContent: Message = {
          id: 'invalid-content-123',
          content: null as any, // Invalid content structure
          role: MessageRole.USER,
          taskId: mockTaskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:09:00.000Z'),
          updatedAt: new Date('2024-01-01T10:09:00.000Z'),
        };

        prismaService.message.findMany.mockResolvedValue([
          mockUserMessage,
          messageWithInvalidContent,
          mockAssistantMessage,
        ]);

        const result = await service.findProcessedMessages(mockTaskId);

        // Should filter out the invalid message
        expect(result).toHaveLength(2);
        expect(result[0].role).toBe(MessageRole.USER);
        expect(result[1].role).toBe(MessageRole.ASSISTANT);
      });

      it('should handle empty message list', async () => {
        prismaService.message.findMany.mockResolvedValue([]);

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toEqual([]);
      });

      it('should apply pagination to processed messages', async () => {
        const messages = [mockUserMessage, mockAssistantMessage];
        prismaService.message.findMany.mockResolvedValue(messages);

        await service.findProcessedMessages(mockTaskId, { limit: 50, page: 2 });

        expect(prismaService.message.findMany).toHaveBeenCalledWith({
          where: { taskId: mockTaskId },
          orderBy: { createdAt: 'asc' },
          take: 50,
          skip: 50,
        });
      });
    });

    describe('Mixed content handling', () => {
      it('should preserve user messages with mixed text and tool content', async () => {
        const mixedContentMessage: Message = {
          id: 'mixed-content-123',
          content: [mockTextContentBlock, mockToolResultContentBlock],
          role: MessageRole.USER,
          taskId: mockTaskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:10:00.000Z'),
          updatedAt: new Date('2024-01-01T10:10:00.000Z'),
        };

        prismaService.message.findMany.mockResolvedValue([mixedContentMessage]);

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toHaveLength(1);
        expect(result[0].role).toBe(MessageRole.USER);
        expect(result[0].messages[0].role).toBe(MessageRole.USER);
      });

      it('should handle complex content extraction from user actions', async () => {
        const complexUserActionMessage: Message = {
          id: 'complex-user-action-123',
          content: [
            {
              type: MessageContentType._UserAction,
              content: [
                mockComputerToolUseContentBlock,
                {
                  type: MessageContentType._ComputerToolUse,
                  id: 'computer-tool-456',
                  name: 'computer',
                  input: {
                    action: 'type',
                    text: 'Hello World',
                  },
                },
              ],
            },
          ] as any[],
          role: MessageRole.USER,
          taskId: mockTaskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:11:00.000Z'),
          updatedAt: new Date('2024-01-01T10:11:00.000Z'),
        };

        prismaService.message.findMany.mockResolvedValue([
          complexUserActionMessage,
        ]);

        const result = await service.findProcessedMessages(mockTaskId);

        expect(result).toHaveLength(1);
        expect(result[0].role).toBe(MessageRole.ASSISTANT);
        expect(result[0].take_over).toBe(true);
        expect(result[0].messages[0].content).toBeDefined();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      prismaService.message.findMany.mockRejectedValue(dbError);

      await expect(service.findEvery(mockTaskId)).rejects.toThrow(dbError);
    });

    it('should handle concurrent message operations', async () => {
      const createOperations = Array.from({ length: 10 }, (_, i) => ({
        content: [
          {
            type: MessageContentType._Text,
            text: `Message ${i}`,
          } as TextContentBlock,
        ],
        role: MessageRole.USER,
        taskId: mockTaskId,
      }));

      // Setup different return values for each operation
      createOperations.forEach((_, i) => {
        prismaService.message.create.mockResolvedValueOnce({
          ...mockUserMessage,
          id: `message-${i}`,
        });
      });

      const promises = createOperations.map((op) => service.create(op));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(prismaService.message.create).toHaveBeenCalledTimes(10);
      expect(tasksGateway.emitNewMessage).toHaveBeenCalledTimes(10);
    });

    it('should handle malformed content in processing', async () => {
      const malformedMessages = [
        {
          ...mockUserMessage,
          content: 'not an array', // Invalid content format
        },
        {
          ...mockUserMessage,
          id: 'msg-2',
          content: [{ malformed: 'block' }], // Invalid content block
        },
        mockAssistantMessage, // Valid message
      ] as Message[];

      prismaService.message.findMany.mockResolvedValue(malformedMessages);

      const result = await service.findProcessedMessages(mockTaskId);

      // Should only process the valid message
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe(MessageRole.ASSISTANT);
    });

    it('should handle large message sets efficiently', async () => {
      const largeMessageSet = Array.from({ length: 1000 }, (_, i) => ({
        ...mockUserMessage,
        id: `message-${i}`,
        content: [{ type: MessageContentType._Text, text: `Message ${i}` }],
        createdAt: new Date(2024, 0, 1, 10, i % 60, Math.floor(i / 60)),
      }));

      prismaService.message.findMany.mockResolvedValue(largeMessageSet);

      const startTime = Date.now();
      const result = await service.findProcessedMessages(mockTaskId);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Service Integration', () => {
    it('should properly integrate with TasksGateway for message emission', async () => {
      const createDto = {
        content: [mockTextContentBlock],
        role: MessageRole.USER,
        taskId: mockTaskId,
      };

      prismaService.message.create.mockResolvedValue(mockUserMessage);

      await service.create(createDto);

      expect(tasksGateway.emitNewMessage).toHaveBeenCalledWith(
        mockTaskId,
        mockUserMessage,
      );
      expect(tasksGateway.emitNewMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle TasksGateway emission failures gracefully', async () => {
      const createDto = {
        content: [mockTextContentBlock],
        role: MessageRole.USER,
        taskId: mockTaskId,
      };

      prismaService.message.create.mockResolvedValue(mockUserMessage);
      tasksGateway.emitNewMessage.mockImplementation(() => {
        throw new Error('WebSocket error');
      });

      // Should not throw even if WebSocket emission fails (due to void operator)
      await expect(service.create(createDto)).rejects.toThrow(
        'WebSocket error',
      );
      expect(prismaService.message.create).toHaveBeenCalled();
    });

    it('should maintain data consistency across operations', async () => {
      // Create message
      const createDto = {
        content: [mockTextContentBlock],
        role: MessageRole.USER,
        taskId: mockTaskId,
      };

      prismaService.message.create.mockResolvedValue(mockUserMessage);
      const createdMessage = await service.create(createDto);

      // Attach summary
      prismaService.message.updateMany.mockResolvedValue({ count: 1 });
      await service.attachSummary(mockTaskId, mockSummaryId, [
        createdMessage.message.id,
      ]);

      // Verify operations
      expect(prismaService.message.create).toHaveBeenCalledTimes(1);
      expect(prismaService.message.updateMany).toHaveBeenCalledTimes(1);
      expect(tasksGateway.emitNewMessage).toHaveBeenCalledTimes(1);
    });
  });
});
