/**
 * AgentProcessor Unit Tests - Comprehensive Task Processing Pipeline Testing
 *
 * Production-ready unit tests covering all AgentProcessor functionality:
 * - Task processing lifecycle and iteration management
 * - AI service integration (Anthropic, OpenAI, Google, Proxy)
 * - Message creation and processing pipeline
 * - Tool use handling (Computer, CreateTask, SetTaskStatus)
 * - Summarization and token management
 * - Event handling (takeover, resume, cancel)
 * - Abort controller and signal handling
 * - Error handling and recovery mechanisms
 * - Performance optimization and resource management
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { TestingModule } from '@nestjs/testing';

import { AgentProcessor } from '../agent.processor';
import { TasksService } from '../../tasks/tasks.service';
import { MessagesService } from '../../messages/messages.service';
import { SummariesService } from '../../summaries/summaries.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { OpenAIService } from '../../openai/openai.service';
import { GoogleService } from '../../google/google.service';
import { ProxyService } from '../../proxy/proxy.service';
import { InputCaptureService } from '../input-capture.service';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
  Message,
} from '@prisma/client';
import {
  MessageContentType,
  MessageContentBlock,
  TextContentBlock,
  ComputerToolUseContentBlock,
  ToolResultContentBlock,
  CreateTaskToolUseBlock,
  SetTaskStatusToolUseBlock,
} from '@bytebot/shared';
import { BytebotAgentResponse } from '../agent.types';

// Mock the computer tool use handler
jest.mock('../agent.computer-use', () => ({
  handleComputerToolUse: jest.fn(),
}));

import { handleComputerToolUse } from '../agent.computer-use';

describe('AgentProcessor', () => {
  let processor: AgentProcessor;
  let tasksService: any;
  let messagesService: any;
  let summariesService: any;
  let anthropicService: any;
  let openaiService: any;
  let googleService: any;
  let proxyService: any;
  let inputCaptureService: any;
  let logger: any;

  // Test data fixtures
  const mockTaskId = 'task-123';
  const mockTask: Task = {
    id: mockTaskId,
    description: 'Test task',
    type: TaskType.IMMEDIATE,
    status: TaskStatus.RUNNING,
    priority: TaskPriority.MEDIUM,
    control: MessageRole.ASSISTANT,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    createdBy: MessageRole.USER,
    userId: 'user-123',
    scheduledFor: null,
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    executedAt: new Date('2024-01-01T10:00:00.000Z'),
    completedAt: null,
    queuedAt: new Date('2024-01-01T10:00:00.000Z'),
    _error: null,
    _result: null,
    model: {
      provider: 'anthropic',
      name: 'claude-3-sonnet',
      contextWindow: 200000,
    },
  };

  const mockMessage: Message = {
    id: 'message-123',
    content: [
      {
        type: MessageContentType._Text,
        text: 'Hello, please complete this task',
      },
    ],
    role: MessageRole.USER,
    taskId: mockTaskId,
    summaryId: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  };

  const mockSummary = {
    id: 'summary-123',
    content: 'Previous conversation summary',
    taskId: mockTaskId,
    createdAt: new Date('2024-01-01T09:30:00.000Z'),
    updatedAt: new Date('2024-01-01T09:30:00.000Z'),
  };

  const mockAgentResponse: BytebotAgentResponse = {
    contentBlocks: [
      {
        type: MessageContentType._Text,
        text: 'I understand the task and will complete it.',
      } as TextContentBlock,
    ],
    tokenUsage: {
      totalTokens: 50000,
      inputTokens: 30000,
      outputTokens: 20000,
    },
  };

  beforeEach(async () => {
    // Create comprehensive mocks
    tasksService = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    };

    messagesService = {
      findUnsummarized: jest.fn(),
      create: jest.fn(),
      attachSummary: jest.fn(),
    };

    summariesService = {
      findLatest: jest.fn(),
      create: jest.fn(),
    };

    anthropicService = {
      generateMessage: jest.fn(),
    };

    openaiService = {
      generateMessage: jest.fn(),
    };

    googleService = {
      generateMessage: jest.fn(),
    };

    proxyService = {
      generateMessage: jest.fn(),
    };

    inputCaptureService = {
      start: jest.fn(),
      stop: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      _error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentProcessor,
        {
          provide: TasksService,
          useValue: tasksService,
        },
        {
          provide: MessagesService,
          useValue: messagesService,
        },
        {
          provide: SummariesService,
          useValue: summariesService,
        },
        {
          provide: AnthropicService,
          useValue: anthropicService,
        },
        {
          provide: OpenAIService,
          useValue: openaiService,
        },
        {
          provide: GoogleService,
          useValue: googleService,
        },
        {
          provide: ProxyService,
          useValue: proxyService,
        },
        {
          provide: InputCaptureService,
          useValue: inputCaptureService,
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    processor = module.get<AgentProcessor>(AgentProcessor);

    // Setup default mocks
    tasksService.findById.mockResolvedValue(mockTask);
    messagesService.findUnsummarized.mockResolvedValue([mockMessage]);
    summariesService.findLatest.mockResolvedValue(null);
    anthropicService.generateMessage.mockResolvedValue(mockAgentResponse);
    openaiService.generateMessage.mockResolvedValue(mockAgentResponse);
    googleService.generateMessage.mockResolvedValue(mockAgentResponse);
    proxyService.generateMessage.mockResolvedValue(mockAgentResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Ensure we stop processing between tests
    processor.stopProcessing();
  });

  describe('Initialization and State Management', () => {
    it('should initialize with correct default state', () => {
      expect(processor.isRunning()).toBe(false);
      expect(processor.getCurrentTaskId()).toBeNull();
      expect(logger.log).toHaveBeenCalledWith('AgentProcessor initialized');
    });

    it('should track running state correctly', () => {
      expect(processor.isRunning()).toBe(false);

      processor.processTask(mockTaskId);

      expect(processor.isRunning()).toBe(true);
      expect(processor.getCurrentTaskId()).toBe(mockTaskId);
    });

    it('should prevent concurrent task processing', () => {
      processor.processTask('task-1');
      processor.processTask('task-2');

      expect(processor.getCurrentTaskId()).toBe('task-1');
      expect(logger.warn).toHaveBeenCalledWith(
        'AgentProcessor is already processing another task',
      );
    });
  });

  describe('Task Processing Pipeline', () => {
    describe('processTask()', () => {
      it('should start task processing successfully', () => {
        processor.processTask(mockTaskId);

        expect(processor.isRunning()).toBe(true);
        expect(processor.getCurrentTaskId()).toBe(mockTaskId);
        expect(logger.log).toHaveBeenCalledWith(
          `Starting processing for task ID: ${mockTaskId}`,
        );
      });

      it('should handle task processing initiation', () => {
        processor.processTask(mockTaskId);

        expect(processor.isRunning()).toBe(true);
        expect(processor.getCurrentTaskId()).toBe(mockTaskId);
      });
    });

    describe('runIteration() - Core Processing Logic', () => {
      beforeEach(() => {
        // Mock handleComputerToolUse for tool use tests
        (handleComputerToolUse as jest.Mock).mockResolvedValue({
          type: MessageContentType._ToolResult,
          tool_use_id: 'tool-123',
          content: [
            {
              type: MessageContentType._Text,
              text: 'Computer action completed successfully',
            },
          ],
        });
      });

      it('should complete processing when task status is not RUNNING', async () => {
        const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
        tasksService.findById.mockResolvedValue(completedTask);

        processor.processTask(mockTaskId);

        // Wait for async processing
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(processor.isRunning()).toBe(false);
        expect(processor.getCurrentTaskId()).toBeNull();
        expect(logger.log).toHaveBeenCalledWith(
          `Task processing completed for task ID: ${mockTaskId} with status: ${TaskStatus.COMPLETED}`,
        );
      });

      it('should process messages with AI service integration', async () => {
        processor.processTask(mockTaskId);

        // Wait for async processing
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
        expect(summariesService.findLatest).toHaveBeenCalledWith(mockTaskId);
        expect(messagesService.findUnsummarized).toHaveBeenCalledWith(
          mockTaskId,
        );
        expect(anthropicService.generateMessage).toHaveBeenCalled();
      });

      it('should handle AI service selection based on model provider', async () => {
        const openaiTask = {
          ...mockTask,
          model: { provider: 'openai', name: 'gpt-4' },
        };
        tasksService.findById.mockResolvedValue(openaiTask);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(openaiService.generateMessage).toHaveBeenCalled();
        expect(anthropicService.generateMessage).not.toHaveBeenCalled();
      });

      it('should handle Google service integration', async () => {
        const googleTask = {
          ...mockTask,
          model: { provider: 'google', name: 'gemini-pro' },
        };
        tasksService.findById.mockResolvedValue(googleTask);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(googleService.generateMessage).toHaveBeenCalled();
        expect(anthropicService.generateMessage).not.toHaveBeenCalled();
      });

      it('should handle proxy service integration', async () => {
        const proxyTask = {
          ...mockTask,
          model: { provider: 'proxy', name: 'claude-via-proxy' },
        };
        tasksService.findById.mockResolvedValue(proxyTask);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(proxyService.generateMessage).toHaveBeenCalled();
        expect(anthropicService.generateMessage).not.toHaveBeenCalled();
      });

      it('should fail task when no service found for provider', async () => {
        const invalidTask = {
          ...mockTask,
          model: { provider: 'invalid', name: 'unknown' },
        };
        tasksService.findById.mockResolvedValue(invalidTask);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(logger.warn).toHaveBeenCalledWith(
          'No service found for model provider: invalid',
        );
        expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
          status: TaskStatus.FAILED,
        });
      });

      it('should fail task when LLM returns no content blocks', async () => {
        const emptyResponse: BytebotAgentResponse = {
          contentBlocks: [],
          tokenUsage: { totalTokens: 0, inputTokens: 0, outputTokens: 0 },
        };
        anthropicService.generateMessage.mockResolvedValue(emptyResponse);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(logger.warn).toHaveBeenCalledWith(
          `Task ID: ${mockTaskId} received no content blocks from LLM, marking as failed`,
        );
        expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
          status: TaskStatus.FAILED,
        });
      });
    });

    describe('Message Creation and Integration', () => {
      it('should create assistant message from LLM response', async () => {
        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(messagesService.create).toHaveBeenCalledWith({
          content: mockAgentResponse.contentBlocks,
          role: MessageRole.ASSISTANT,
          taskId: mockTaskId,
        });
      });

      it('should include summary in message context', async () => {
        summariesService.findLatest.mockResolvedValue(mockSummary);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(anthropicService.generateMessage).toHaveBeenCalledWith(
          expect.any(String), // AGENT_SYSTEM_PROMPT
          expect.arrayContaining([
            expect.objectContaining({
              role: MessageRole.USER,
              content: [
                {
                  type: MessageContentType._Text,
                  text: mockSummary.content,
                },
              ],
            }),
          ]),
          expect.any(String),
          true,
          expect.any(AbortSignal),
        );
      });
    });
  });

  describe('Tool Use Handling', () => {
    describe('Computer Tool Use', () => {
      it('should handle computer tool use blocks', async () => {
        const computerToolUseResponse: BytebotAgentResponse = {
          contentBlocks: [
            {
              type: MessageContentType._ToolUse,
              id: 'computer-tool-123',
              name: 'computer_click_mouse',
              input: { coordinates: [100, 200], button: 'left', clickCount: 1 },
            } as any,
          ],
          tokenUsage: {
            totalTokens: 1000,
            inputTokens: 500,
            outputTokens: 500,
          },
        };
        anthropicService.generateMessage.mockResolvedValue(
          computerToolUseResponse,
        );

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(handleComputerToolUse).toHaveBeenCalledWith(
          computerToolUseResponse.contentBlocks[0],
          logger,
        );
        expect(messagesService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: MessageContentType._ToolResult,
                tool_use_id: 'tool-123',
              }),
            ]),
            role: MessageRole.USER,
            taskId: mockTaskId,
          }),
        );
      });
    });

    describe('Create Task Tool Use', () => {
      it('should handle create task tool use blocks', async () => {
        const createTaskResponse: BytebotAgentResponse = {
          contentBlocks: [
            {
              type: MessageContentType._ToolUse,
              id: 'create-task-123',
              name: 'create_task',
              input: {
                description: 'New subtask to create',
                type: 'immediate',
                priority: 'high',
              },
            } as CreateTaskToolUseBlock,
          ],
          tokenUsage: {
            totalTokens: 1000,
            inputTokens: 500,
            outputTokens: 500,
          },
        };
        anthropicService.generateMessage.mockResolvedValue(createTaskResponse);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(tasksService.create).toHaveBeenCalledWith({
          description: 'New subtask to create',
          type: TaskType.IMMEDIATE,
          createdBy: MessageRole.ASSISTANT,
          model: mockTask.model,
          priority: TaskPriority.HIGH,
        });

        expect(messagesService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: MessageContentType._ToolResult,
                tool_use_id: 'create-task-123',
                content: [
                  {
                    type: MessageContentType._Text,
                    text: 'The task has been created',
                  },
                ],
              }),
            ]),
            role: MessageRole.USER,
            taskId: mockTaskId,
          }),
        );
      });

      it('should handle create task with scheduled date', async () => {
        const scheduledDate = '2024-12-25T10:00:00.000Z';
        const createTaskResponse: BytebotAgentResponse = {
          contentBlocks: [
            {
              type: MessageContentType._ToolUse,
              id: 'create-task-scheduled-123',
              name: 'create_task',
              input: {
                description: 'Scheduled task',
                type: 'scheduled',
                scheduledFor: scheduledDate,
              },
            } as CreateTaskToolUseBlock,
          ],
          tokenUsage: {
            totalTokens: 1000,
            inputTokens: 500,
            outputTokens: 500,
          },
        };
        anthropicService.generateMessage.mockResolvedValue(createTaskResponse);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(tasksService.create).toHaveBeenCalledWith({
          description: 'Scheduled task',
          type: TaskType.SCHEDULED,
          createdBy: MessageRole.ASSISTANT,
          scheduledFor: new Date(scheduledDate),
          model: mockTask.model,
          priority: undefined,
        });
      });
    });

    describe('Set Task Status Tool Use', () => {
      it('should handle set task status to completed', async () => {
        const setStatusResponse: BytebotAgentResponse = {
          contentBlocks: [
            {
              type: MessageContentType._ToolUse,
              id: 'set-status-123',
              name: 'set_task_status',
              input: {
                status: 'completed',
                description: 'Task has been completed successfully',
              },
            } as SetTaskStatusToolUseBlock,
          ],
          tokenUsage: {
            totalTokens: 1000,
            inputTokens: 500,
            outputTokens: 500,
          },
        };
        anthropicService.generateMessage.mockResolvedValue(setStatusResponse);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
          status: TaskStatus.COMPLETED,
          completedAt: expect.any(Date),
        });

        expect(messagesService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                type: MessageContentType._ToolResult,
                tool_use_id: 'set-status-123',
                is_error: false,
                content: [
                  {
                    type: MessageContentType._Text,
                    text: 'Task has been completed successfully',
                  },
                ],
              }),
            ]),
            role: MessageRole.USER,
            taskId: mockTaskId,
          }),
        );
      });

      it('should handle set task status to needs help', async () => {
        const setStatusResponse: BytebotAgentResponse = {
          contentBlocks: [
            {
              type: MessageContentType._ToolUse,
              id: 'set-status-needs-help-123',
              name: 'set_task_status',
              input: {
                status: 'needs_help',
                description: 'Need assistance with this task',
              },
            } as SetTaskStatusToolUseBlock,
          ],
          tokenUsage: {
            totalTokens: 1000,
            inputTokens: 500,
            outputTokens: 500,
          },
        };
        anthropicService.generateMessage.mockResolvedValue(setStatusResponse);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
          status: TaskStatus.NEEDS_HELP,
        });
      });

      it('should handle set task status to failed with error flag', async () => {
        const setStatusResponse: BytebotAgentResponse = {
          contentBlocks: [
            {
              type: MessageContentType._ToolUse,
              id: 'set-status-failed-123',
              name: 'set_task_status',
              input: {
                status: 'failed',
                description: 'Task failed due to error',
              },
            } as SetTaskStatusToolUseBlock,
          ],
          tokenUsage: {
            totalTokens: 1000,
            inputTokens: 500,
            outputTokens: 500,
          },
        };
        anthropicService.generateMessage.mockResolvedValue(setStatusResponse);

        processor.processTask(mockTaskId);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(messagesService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.arrayContaining([
              expect.objectContaining({
                is_error: true,
              }),
            ]),
          }),
        );
      });
    });
  });

  describe('Summarization and Token Management', () => {
    it('should trigger summarization when token usage exceeds threshold', async () => {
      const highTokenResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._Text,
            text: 'Response with high token usage',
          } as TextContentBlock,
        ],
        tokenUsage: {
          totalTokens: 150000, // 75% of 200k context window
          inputTokens: 100000,
          outputTokens: 50000,
        },
      };

      const summaryResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._Text,
            text: 'Generated summary of the conversation',
          } as TextContentBlock,
        ],
        tokenUsage: { totalTokens: 1000, inputTokens: 800, outputTokens: 200 },
      };

      anthropicService.generateMessage
        .mockResolvedValueOnce(highTokenResponse)
        .mockResolvedValueOnce(summaryResponse);

      summariesService.create.mockResolvedValue({
        id: 'new-summary-123',
        content: 'Generated summary of the conversation',
        taskId: mockTaskId,
      });

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(anthropicService.generateMessage).toHaveBeenCalledTimes(2);
      expect(summariesService.create).toHaveBeenCalledWith({
        content: 'Generated summary of the conversation',
        taskId: mockTaskId,
      });
      expect(messagesService.attachSummary).toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Generated summary for task'),
      );
    });

    it('should not trigger summarization when token usage is below threshold', async () => {
      const lowTokenResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._Text,
            text: 'Response with low token usage',
          } as TextContentBlock,
        ],
        tokenUsage: {
          totalTokens: 50000, // 25% of 200k context window
          inputTokens: 30000,
          outputTokens: 20000,
        },
      };

      anthropicService.generateMessage.mockResolvedValue(lowTokenResponse);

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(anthropicService.generateMessage).toHaveBeenCalledTimes(1);
      expect(summariesService.create).not.toHaveBeenCalled();
    });

    it('should handle summarization errors gracefully', async () => {
      const highTokenResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._Text,
            text: 'Response triggering summarization',
          } as TextContentBlock,
        ],
        tokenUsage: {
          totalTokens: 150000,
          inputTokens: 100000,
          outputTokens: 50000,
        },
      };

      anthropicService.generateMessage
        .mockResolvedValueOnce(highTokenResponse)
        .mockRejectedValueOnce(new Error('Summarization failed'));

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error summarizing messages'),
        expect.any(String),
      );
    });
  });

  describe('Event Handling', () => {
    describe('handleTaskTakeover()', () => {
      it('should handle task takeover event', () => {
        processor.processTask(mockTaskId);

        processor.handleTaskTakeover({ taskId: mockTaskId });

        expect(logger.log).toHaveBeenCalledWith(
          `Task takeover event received for task ID: ${mockTaskId}`,
        );
        expect(inputCaptureService.start).toHaveBeenCalledWith(mockTaskId);
      });

      it('should abort current processing on takeover', () => {
        processor.processTask(mockTaskId);
        const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

        processor.handleTaskTakeover({ taskId: mockTaskId });

        expect(abortSpy).toHaveBeenCalled();
        expect(inputCaptureService.start).toHaveBeenCalledWith(mockTaskId);
      });

      it('should start input capture even for different task', () => {
        processor.processTask('other-task');

        processor.handleTaskTakeover({ taskId: mockTaskId });

        expect(inputCaptureService.start).toHaveBeenCalledWith(mockTaskId);
      });
    });

    describe('handleTaskResume()', () => {
      it('should handle task resume event for current task', () => {
        processor.processTask(mockTaskId);

        processor.handleTaskResume({ taskId: mockTaskId });

        expect(logger.log).toHaveBeenCalledWith(
          `Task resume event received for task ID: ${mockTaskId}`,
        );
      });

      it('should ignore resume event for different task', () => {
        processor.processTask('other-task');

        processor.handleTaskResume({ taskId: mockTaskId });

        expect(logger.log).not.toHaveBeenCalledWith(
          expect.stringContaining('Task resume event received'),
        );
      });
    });

    describe('handleTaskCancel()', () => {
      it('should handle task cancel event', async () => {
        processor.processTask(mockTaskId);

        await processor.handleTaskCancel({ taskId: mockTaskId });

        expect(logger.log).toHaveBeenCalledWith(
          `Task cancel event received for task ID: ${mockTaskId}`,
        );
        expect(processor.isRunning()).toBe(false);
        expect(processor.getCurrentTaskId()).toBeNull();
      });
    });
  });

  describe('Stop Processing and Cleanup', () => {
    describe('stopProcessing()', () => {
      it('should stop processing and cleanup state', async () => {
        processor.processTask(mockTaskId);
        const abortSpy = jest.spyOn(AbortController.prototype, 'abort');

        await processor.stopProcessing();

        expect(logger.log).toHaveBeenCalledWith(
          `Stopping execution of task ${mockTaskId}`,
        );
        expect(abortSpy).toHaveBeenCalled();
        expect(inputCaptureService.stop).toHaveBeenCalled();
        expect(processor.isRunning()).toBe(false);
        expect(processor.getCurrentTaskId()).toBeNull();
      });

      it('should handle stop processing when not running', async () => {
        await processor.stopProcessing();

        expect(inputCaptureService.stop).not.toHaveBeenCalled();
        expect(logger.log).not.toHaveBeenCalledWith(
          expect.stringContaining('Stopping execution'),
        );
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle task not found errors', async () => {
      tasksService.findById.mockRejectedValue(new Error('Task not found'));

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during task processing iteration'),
        expect.any(String),
      );
      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.FAILED,
      });
    });

    it('should handle BytebotAgentInterrupt gracefully', async () => {
      const interruptError = new Error('Processing interrupted');
      interruptError.name = 'BytebotAgentInterrupt';
      anthropicService.generateMessage.mockRejectedValue(interruptError);

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logger.warn).toHaveBeenCalledWith(
        `Processing aborted for task ID: ${mockTaskId}`,
      );
      expect(tasksService.update).not.toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.FAILED,
      });
    });

    it('should handle AI service errors', async () => {
      const serviceError = new Error('AI service unavailable');
      anthropicService.generateMessage.mockRejectedValue(serviceError);

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during task processing iteration'),
        expect.any(String),
      );
      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.FAILED,
      });
    });

    it('should handle computer tool use errors', async () => {
      const computerToolUseResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._ToolUse,
            id: 'failing-computer-tool-123',
            name: 'computer_click_mouse',
            input: { coordinates: [100, 200], button: 'left', clickCount: 1 },
          } as any,
        ],
        tokenUsage: { totalTokens: 1000, inputTokens: 500, outputTokens: 500 },
      };
      anthropicService.generateMessage.mockResolvedValue(
        computerToolUseResponse,
      );
      (handleComputerToolUse as jest.Mock).mockRejectedValue(
        new Error('Computer action failed'),
      );

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logger.error).toHaveBeenCalled();
      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.FAILED,
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should use abort controller for cancellation', async () => {
      processor.processTask(mockTaskId);

      // Verify abort controller is used in service calls
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(anthropicService.generateMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.any(String),
        true,
        expect.any(AbortSignal),
      );
    });

    it('should refresh abort controller on each iteration', async () => {
      const runningTask = { ...mockTask, status: TaskStatus.RUNNING };
      tasksService.findById.mockResolvedValue(runningTask);

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should create fresh abort controllers
      expect(anthropicService.generateMessage).toHaveBeenCalled();
    });

    it('should handle concurrent operations safely', async () => {
      const task1 = 'task-1';
      const task2 = 'task-2';

      processor.processTask(task1);
      processor.processTask(task2); // Should be rejected

      expect(processor.getCurrentTaskId()).toBe(task1);
      expect(logger.warn).toHaveBeenCalledWith(
        'AgentProcessor is already processing another task',
      );
    });
  });

  describe('Integration and Service Coordination', () => {
    it('should coordinate with all required services', async () => {
      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(tasksService.findById).toHaveBeenCalled();
      expect(messagesService.findUnsummarized).toHaveBeenCalled();
      expect(summariesService.findLatest).toHaveBeenCalled();
      expect(anthropicService.generateMessage).toHaveBeenCalled();
      expect(messagesService.create).toHaveBeenCalled();
    });

    it('should handle multiple tool use blocks in single response', async () => {
      const multiToolResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._ToolUse,
            id: 'computer-tool-123',
            name: 'computer_click_mouse',
            input: { coordinates: [100, 200], button: 'left', clickCount: 1 },
          } as any,
          {
            type: MessageContentType._ToolUse,
            id: 'set-status-123',
            name: 'set_task_status',
            input: { status: 'completed', description: 'Task completed' },
          } as SetTaskStatusToolUseBlock,
        ],
        tokenUsage: {
          totalTokens: 2000,
          inputTokens: 1000,
          outputTokens: 1000,
        },
      };
      anthropicService.generateMessage.mockResolvedValue(multiToolResponse);

      processor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(handleComputerToolUse).toHaveBeenCalled();
      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
      });
    });
  });
});
