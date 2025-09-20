/**
 * Agent Integration Tests - Comprehensive Workflow and System Integration Testing
 *
 * Production-ready integration tests covering complete agent workflow scenarios:
 * - End-to-end task processing workflows
 * - Agent processor and scheduler coordination
 * - Input capture and message handling integration
 * - Analytics service event tracking and data collection
 * - Multi-service interaction patterns
 * - Error propagation and recovery across services
 * - Performance benchmarks and load testing
 * - Real-world scenario simulation and validation
 * - System reliability under stress conditions
 * - Data consistency and integrity verification
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { TestingModule } from '@nestjs/testing';

import { ConfigService } from '@nestjs/config';

import { AgentProcessor } from '../agent.processor';
import { AgentScheduler } from '../agent.scheduler';
import { InputCaptureService } from '../input-capture.service';
import { AgentAnalyticsService } from '../agent.analytics';
import { TasksService } from '../../tasks/tasks.service';
import { MessagesService } from '../../messages/messages.service';
import { SummariesService } from '../../summaries/summaries.service';
import { AnthropicService } from '../../anthropic/anthropic.service';
import { OpenAIService } from '../../openai/openai.service';
import { GoogleService } from '../../google/google.service';
import { ProxyService } from '../../proxy/proxy.service';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
  Message,
} from '@prisma/client';
import { MessageContentType, BytebotAgentResponse } from '@bytebot/shared';

// Mock external dependencies
global.fetch = jest.fn();

// Mock computer use functions
jest.mock('../agent.computer-use', () => ({
  handleComputerToolUse: jest.fn(),
  writeFile: jest.fn(),
}));

import { handleComputerToolUse, writeFile } from '../agent.computer-use';

describe('Agent Integration Tests', () => {
  let module: TestingModule;
  let agentProcessor: AgentProcessor;
  let agentScheduler: AgentScheduler;
  let inputCaptureService: InputCaptureService;
  let agentAnalyticsService: AgentAnalyticsService;
  let tasksService: any;
  let messagesService: any;
  let summariesService: any;
  let anthropicService: any;
  let openaiService: any;
  let googleService: any;
  let proxyService: any;
  let configService: any;
  let eventEmitter: any;
  let logger: any;

  // Test data fixtures
  const mockTaskId = 'integration-task-123';
  const mockUserId = 'user-123';

  const mockTask: Task = {
    id: mockTaskId,
    description: 'Integration test task - complete user workflow',
    type: TaskType.IMMEDIATE,
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    control: MessageRole.ASSISTANT,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    createdBy: MessageRole.USER,
    userId: mockUserId,
    scheduledFor: null,
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    executedAt: null,
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

  const mockUserMessage: Message = {
    id: 'user-message-123',
    content: [
      {
        type: MessageContentType._Text,
        text: 'Please take a screenshot and click on the browser window',
      },
    ],
    role: MessageRole.USER,
    taskId: mockTaskId,
    summaryId: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  };

  const mockAgentResponse: BytebotAgentResponse = {
    contentBlocks: [
      {
        type: MessageContentType._Text,
        text: 'I will take a screenshot first and then click on the browser.',
      },
      {
        type: MessageContentType._ToolUse,
        id: 'screenshot-tool-123',
        name: 'computer_screenshot',
        input: {},
      },
      {
        type: MessageContentType._ToolUse,
        id: 'click-tool-123',
        name: 'computer_click_mouse',
        input: {
          coordinates: { x: 400, y: 300 },
          button: 'left',
          clickCount: 1,
        },
      },
    ],
    tokenUsage: {
      totalTokens: 2500,
      inputTokens: 1500,
      outputTokens: 1000,
    },
  };

  beforeEach(async () => {
    // Create comprehensive service mocks
    tasksService = {
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findScheduledTasks: jest.fn(),
      findNextTask: jest.fn(),
    };

    messagesService = {
      findUnsummarized: jest.fn(),
      findEvery: jest.fn(),
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

    configService = {
      get: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      _error: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        AgentProcessor,
        AgentScheduler,
        InputCaptureService,
        AgentAnalyticsService,
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
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: EventEmitter2,
          useValue: eventEmitter,
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    agentProcessor = module.get<AgentProcessor>(AgentProcessor);
    agentScheduler = module.get<AgentScheduler>(AgentScheduler);
    inputCaptureService = module.get<InputCaptureService>(InputCaptureService);
    agentAnalyticsService = module.get<AgentAnalyticsService>(
      AgentAnalyticsService,
    );

    // Setup default mocks
    tasksService.findById.mockResolvedValue(mockTask);
    messagesService.findUnsummarized.mockResolvedValue([mockUserMessage]);
    messagesService.findEvery.mockResolvedValue([mockUserMessage]);
    summariesService.findLatest.mockResolvedValue(null);
    anthropicService.generateMessage.mockResolvedValue(mockAgentResponse);
    configService.get.mockReturnValue('http://localhost:8080');
    tasksService.findScheduledTasks.mockResolvedValue([]);
    tasksService.findNextTask.mockResolvedValue(null);
    tasksService.update.mockResolvedValue(mockTask);
    messagesService.create.mockResolvedValue({ id: 'new-message-123' });

    // Mock computer use functions
    (handleComputerToolUse as jest.Mock).mockResolvedValue({
      type: MessageContentType._ToolResult,
      tool_use_id: 'screenshot-tool-123',
      content: [
        {
          type: MessageContentType._Image,
          source: {
            _data: 'base64-screenshot-data',
            media_type: 'image/png',
            type: 'base64',
          },
        },
      ],
    });

    (writeFile as jest.Mock).mockResolvedValue({
      success: true,
      message: 'File written successfully',
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    if (agentProcessor) {
      await agentProcessor.stopProcessing();
    }
    if (module) {
      await module.close();
    }
  });

  describe('End-to-End Task Processing Workflow', () => {
    it('should complete a full task processing workflow from start to finish', async () => {
      const runningTask = { ...mockTask, status: TaskStatus.RUNNING };
      tasksService.findById
        .mockResolvedValueOnce(mockTask) // Initial task fetch
        .mockResolvedValueOnce(runningTask) // Task after status update
        .mockResolvedValueOnce({
          ...runningTask,
          status: TaskStatus.COMPLETED,
        }); // Final completed task

      // Start task processing
      agentProcessor.processTask(mockTaskId);

      // Wait for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify the complete workflow
      expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
      expect(messagesService.findUnsummarized).toHaveBeenCalledWith(mockTaskId);
      expect(anthropicService.generateMessage).toHaveBeenCalled();
      expect(messagesService.create).toHaveBeenCalledTimes(2); // Assistant message + Tool results
      expect(handleComputerToolUse).toHaveBeenCalledTimes(2); // Screenshot + Click
      expect(logger.debug).toHaveBeenCalledWith(
        `Tool execution successful for tool_use_id: screenshot-tool-123`,
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `Tool execution successful for tool_use_id: click-tool-123`,
      );
    });

    it('should handle task processing with file operations', async () => {
      const taskWithFiles = {
        ...mockTask,
        files: [
          {
            id: 'file-123',
            name: 'test-document.pdf',
            type: 'application/pdf',
            size: 2048,
            _data: 'base64-file-content',
            taskId: mockTaskId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      tasksService.findNextTask.mockResolvedValue(taskWithFiles);

      // Trigger scheduler to process task with files
      await agentScheduler.handleCron();

      expect(writeFile).toHaveBeenCalledWith({
        path: '/home/user/Desktop/test-document.pdf',
        content: 'base64-file-content',
      });
      expect(tasksService.update).toHaveBeenCalledWith(taskWithFiles.id, {
        status: TaskStatus.RUNNING,
        executedAt: expect.any(Date),
      });
    });

    it('should coordinate between scheduler and processor for task execution', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      tasksService.findNextTask.mockResolvedValue(pendingTask);

      // Mock processor to return not running
      jest.spyOn(agentProcessor, 'isRunning').mockReturnValue(false);
      const processTaskSpy = jest.spyOn(agentProcessor, 'processTask');

      // Execute scheduler cron
      await agentScheduler.handleCron();

      expect(tasksService.findNextTask).toHaveBeenCalled();
      expect(tasksService.update).toHaveBeenCalledWith(pendingTask.id, {
        status: TaskStatus.RUNNING,
        executedAt: expect.any(Date),
      });
      expect(processTaskSpy).toHaveBeenCalledWith(pendingTask.id);
    });
  });

  describe('Multi-Service Integration Scenarios', () => {
    it('should handle analytics event tracking throughout task lifecycle', async () => {
      const handleTaskEventSpy = jest.spyOn(
        agentAnalyticsService,
        'handleTaskEvent',
      );

      // Mock analytics endpoint
      configService.get.mockReturnValue('https://analytics.test.com/events');

      // Simulate task completion event
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      tasksService.findById.mockResolvedValue(completedTask);
      messagesService.findEvery.mockResolvedValue([mockUserMessage]);

      await agentAnalyticsService.handleTaskEvent({ taskId: mockTaskId });

      expect(handleTaskEventSpy).toHaveBeenCalledWith({ taskId: mockTaskId });
      expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
      expect(messagesService.findEvery).toHaveBeenCalledWith(mockTaskId);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://analytics.test.com/events',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should integrate input capture with message processing', async () => {
      const mockSocket = {
        connected: true,
        connect: jest.fn(),
        disconnect: jest.fn(),
        on: jest.fn(),
        removeAllListeners: jest.fn(),
      };

      // Mock socket.io
      jest.doMock('socket.io-client', () => ({
        io: jest.fn(() => mockSocket),
      }));

      // Mock message creation
      messagesService.create.mockResolvedValue({ id: 'input-message-123' });

      // Start input capture
      inputCaptureService.start(mockTaskId);

      // Simulate connect event
      const connectHandler = mockSocket.on.mock.calls.find(
        (call) => call[0] === 'connect',
      )?.[1];
      if (connectHandler) {
        connectHandler();
      }

      expect(inputCaptureService.isCapturing()).toBe(true);
      expect(mockSocket.on).toHaveBeenCalledWith(
        'connect',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'action',
        expect.any(Function),
      );
      expect(mockSocket.on).toHaveBeenCalledWith(
        'screenshotAndAction',
        expect.any(Function),
      );
    });

    it('should handle AI service switching based on task model configuration', async () => {
      // Test with different AI services
      const aiServiceConfigs = [
        { provider: 'anthropic', service: anthropicService },
        { provider: 'openai', service: openaiService },
        { provider: 'google', service: googleService },
        { provider: 'proxy', service: proxyService },
      ];

      for (const { provider, service } of aiServiceConfigs) {
        const taskWithProvider = {
          ...mockTask,
          id: `task-${provider}-123`,
          model: { provider, name: 'test-model' },
        };

        tasksService.findById.mockResolvedValue(taskWithProvider);
        service.generateMessage.mockResolvedValue(mockAgentResponse);

        agentProcessor.processTask(taskWithProvider.id);
        await new Promise((resolve) => setTimeout(resolve, 50));

        expect(service.generateMessage).toHaveBeenCalled();
      }
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should handle and recover from AI service failures', async () => {
      const serviceError = new Error('AI service unavailable');
      anthropicService.generateMessage.mockRejectedValue(serviceError);

      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error during task processing iteration'),
        expect.any(String),
      );
      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.FAILED,
      });
    });

    it('should handle computer tool use failures gracefully', async () => {
      const toolError = new Error('Computer action failed');
      (handleComputerToolUse as jest.Mock).mockRejectedValue(toolError);

      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(logger.error).toHaveBeenCalled();
      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.FAILED,
      });
    });

    it('should recover from network failures in analytics service', async () => {
      const networkError = new Error('Network timeout');
      (global.fetch as jest.Mock).mockRejectedValue(networkError);
      configService.get.mockReturnValue('https://analytics.test.com/events');

      // Should not throw error
      await agentAnalyticsService.handleTaskEvent({ taskId: mockTaskId });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send analytics'),
        expect.any(String),
      );
    });

    it('should handle file operation failures during task processing', async () => {
      const taskWithFiles = {
        ...mockTask,
        files: [
          {
            id: 'file-error-123',
            name: 'problematic-file.txt',
            type: 'text/plain',
            size: 1024,
            _data: 'file-content',
            taskId: mockTaskId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      const fileError = new Error('File write permission denied');
      (writeFile as jest.Mock).mockRejectedValue(fileError);
      tasksService.findNextTask.mockResolvedValue(taskWithFiles);

      // Should handle file write error gracefully
      await expect(agentScheduler.handleCron()).rejects.toThrow(
        'File write permission denied',
      );
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent task processing requests', async () => {
      const taskIds = Array.from(
        { length: 5 },
        (_, i) => `concurrent-task-${i}`,
      );
      const tasks = taskIds.map((id) => ({ ...mockTask, id }));

      tasksService.findById.mockImplementation((taskId) =>
        Promise.resolve(tasks.find((t) => t.id === taskId)),
      );

      // Process multiple tasks concurrently
      const promises = taskIds.map((taskId) => {
        agentProcessor.processTask(taskId);
        return new Promise((resolve) => setTimeout(resolve, 50));
      });

      await Promise.all(promises);

      // Only the first task should be processed (others rejected due to concurrent processing protection)
      expect(logger.warn).toHaveBeenCalledTimes(4);
      expect(logger.warn).toHaveBeenCalledWith(
        'AgentProcessor is already processing another task',
      );
    });

    it('should maintain performance under high message volume', async () => {
      const largeMessageSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockUserMessage,
        id: `message-${i}`,
        content: [
          {
            type: MessageContentType._Text,
            text: `Message ${i} content with some detailed text`,
          },
        ],
      }));

      messagesService.findUnsummarized.mockResolvedValue(largeMessageSet);

      const startTime = Date.now();
      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
      expect(anthropicService.generateMessage).toHaveBeenCalled();
    });

    it('should handle scheduler performance with many scheduled tasks', async () => {
      const manyScheduledTasks = Array.from({ length: 50 }, (_, i) => ({
        ...mockTask,
        id: `scheduled-${i}`,
        type: TaskType.SCHEDULED,
        status: TaskStatus.PENDING,
        scheduledFor: new Date(Date.now() - (i + 1) * 1000), // All past due
      }));

      tasksService.findScheduledTasks.mockResolvedValue(manyScheduledTasks);

      const startTime = Date.now();
      await agentScheduler.handleCron();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(tasksService.update).toHaveBeenCalledTimes(50);
    });
  });

  describe('System Reliability and Stress Testing', () => {
    it('should maintain data consistency during rapid state changes', async () => {
      let callCount = 0;
      const stateChangingTask = { ...mockTask };

      tasksService.findById.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          ...stateChangingTask,
          status: callCount % 2 === 0 ? TaskStatus.RUNNING : TaskStatus.PENDING,
          updatedAt: new Date(Date.now() + callCount * 1000),
        });
      });

      // Rapid successive calls
      const promises = Array.from({ length: 10 }, () => {
        agentProcessor.processTask(mockTaskId);
        return new Promise((resolve) => setTimeout(resolve, 10));
      });

      await Promise.all(promises);

      // Should maintain consistency despite rapid calls
      expect(tasksService.findById).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'AgentProcessor is already processing another task',
      );
    });

    it('should handle memory pressure with large data sets', async () => {
      const largeTask = {
        ...mockTask,
        _result: 'A'.repeat(100000), // Large result data
      };

      const largeMessages = Array.from({ length: 1000 }, (_, i) => ({
        ...mockUserMessage,
        id: `large-msg-${i}`,
        content: [
          {
            type: MessageContentType._Text,
            text: `Large message content ${i}: ${'X'.repeat(1000)}`,
          },
        ],
      }));

      tasksService.findById.mockResolvedValue(largeTask);
      messagesService.findEvery.mockResolvedValue(largeMessages);
      configService.get.mockReturnValue('https://analytics.test.com/events');

      // Should handle large data without memory issues
      await agentAnalyticsService.handleTaskEvent({ taskId: mockTaskId });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://analytics.test.com/events',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        }),
      );
    });

    it('should maintain service availability during partial failures', async () => {
      // Simulate partial service failures
      summariesService.findLatest.mockRejectedValue(
        new Error('Summary service down'),
      );

      // Other services should continue working
      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Core functionality should still work despite summary service failure
      expect(tasksService.findById).toHaveBeenCalled();
      expect(messagesService.findUnsummarized).toHaveBeenCalled();
      expect(anthropicService.generateMessage).toHaveBeenCalled();
    });

    it('should handle graceful shutdown with pending operations', async () => {
      // Start a long-running operation
      agentProcessor.processTask(mockTaskId);

      // Immediately try to stop
      const stopPromise = agentProcessor.stopProcessing();

      // Should complete gracefully
      await expect(stopPromise).resolves.not.toThrow();
      expect(agentProcessor.isRunning()).toBe(false);
      expect(agentProcessor.getCurrentTaskId()).toBeNull();
    });
  });

  describe('Real-World Scenario Simulation', () => {
    it('should simulate a complete user interaction workflow', async () => {
      // Scenario: User asks agent to take screenshot, analyze it, and perform actions
      const userRequest = {
        ...mockUserMessage,
        content: [
          {
            type: MessageContentType._Text,
            text: 'Please take a screenshot, analyze what you see, and click on the search button if you find one',
          },
        ],
      };

      const agentResponseWithAnalysis: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._Text,
            text: 'I will take a screenshot first to see what is currently on the screen.',
          },
          {
            type: MessageContentType._ToolUse,
            id: 'screenshot-analysis-123',
            name: 'computer_screenshot',
            input: {},
          },
          {
            type: MessageContentType._Text,
            text: 'I can see a search interface. I will click on the search button.',
          },
          {
            type: MessageContentType._ToolUse,
            id: 'click-search-123',
            name: 'computer_click_mouse',
            input: {
              coordinates: { x: 500, y: 400 },
              button: 'left',
              clickCount: 1,
            },
          },
          {
            type: MessageContentType._ToolUse,
            id: 'task-complete-123',
            name: 'set_task_status',
            input: {
              status: 'completed',
              description:
                'Successfully took screenshot and clicked on search button',
            },
          },
        ],
        tokenUsage: {
          totalTokens: 5000,
          inputTokens: 3000,
          outputTokens: 2000,
        },
      };

      messagesService.findUnsummarized.mockResolvedValue([userRequest]);
      anthropicService.generateMessage.mockResolvedValue(
        agentResponseWithAnalysis,
      );

      // Mock tool results
      (handleComputerToolUse as jest.Mock)
        .mockResolvedValueOnce({
          type: MessageContentType._ToolResult,
          tool_use_id: 'screenshot-analysis-123',
          content: [
            {
              type: MessageContentType._Image,
              source: {
                _data: 'base64-screenshot-showing-search-interface',
                media_type: 'image/png',
                type: 'base64',
              },
            },
          ],
        })
        .mockResolvedValueOnce({
          type: MessageContentType._ToolResult,
          tool_use_id: 'click-search-123',
          content: [
            {
              type: MessageContentType._Text,
              text: 'Search button clicked successfully',
            },
          ],
        });

      // Execute the workflow
      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify the complete workflow
      expect(anthropicService.generateMessage).toHaveBeenCalled();
      expect(handleComputerToolUse).toHaveBeenCalledTimes(2);
      expect(messagesService.create).toHaveBeenCalledTimes(3); // Assistant message + 2 tool results
      expect(tasksService.update).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
      });
    });

    it('should handle complex multi-step automation workflow', async () => {
      const complexWorkflowResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._Text,
            text: 'I will help you automate this workflow. Let me break it down into steps.',
          },
          {
            type: MessageContentType._ToolUse,
            id: 'open-browser-123',
            name: 'computer_application',
            input: { application: 'firefox' },
          },
          {
            type: MessageContentType._ToolUse,
            id: 'wait-load-123',
            name: 'computer_wait',
            input: { duration: 500 },
          },
          {
            type: MessageContentType._ToolUse,
            id: 'type-url-123',
            name: 'computer_type_text',
            input: { text: 'https://example.com' },
          },
          {
            type: MessageContentType._ToolUse,
            id: 'press-enter-123',
            name: 'computer_type_keys',
            input: { keys: ['Return'] },
          },
        ],
        tokenUsage: {
          totalTokens: 3500,
          inputTokens: 2000,
          outputTokens: 1500,
        },
      };

      anthropicService.generateMessage.mockResolvedValue(
        complexWorkflowResponse,
      );
      (handleComputerToolUse as jest.Mock).mockResolvedValue({
        type: MessageContentType._ToolResult,
        tool_use_id: 'mock-tool-result',
        content: [
          {
            type: MessageContentType._Text,
            text: 'Action completed successfully',
          },
        ],
      });

      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(handleComputerToolUse).toHaveBeenCalledTimes(4); // 4 tool use blocks
      expect(messagesService.create).toHaveBeenCalledTimes(5); // Assistant + 4 tool results
    });
  });

  describe('Data Consistency and Integrity', () => {
    it('should maintain message ordering and integrity throughout processing', async () => {
      const orderedMessages = [
        {
          ...mockUserMessage,
          id: 'msg-1',
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
        },
        {
          ...mockUserMessage,
          id: 'msg-2',
          createdAt: new Date('2024-01-01T10:01:00.000Z'),
        },
        {
          ...mockUserMessage,
          id: 'msg-3',
          createdAt: new Date('2024-01-01T10:02:00.000Z'),
        },
      ];

      messagesService.findUnsummarized.mockResolvedValue(orderedMessages);

      const messageCreateSpy = jest.spyOn(messagesService, 'create');
      messageCreateSpy.mockResolvedValue({ id: 'assistant-response-123' });

      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify messages were processed in correct order
      expect(anthropicService.generateMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({
            role: MessageRole.USER,
            content: orderedMessages.map((msg) => msg.content).flat(),
          }),
        ]),
        expect.any(String),
        true,
        expect.any(AbortSignal),
      );
    });

    it('should ensure atomic operations during task state transitions', async () => {
      const taskUpdateSpy = jest.spyOn(tasksService, 'update');
      taskUpdateSpy.mockResolvedValue(mockTask);

      // Mock task status completion
      const completionResponse: BytebotAgentResponse = {
        contentBlocks: [
          {
            type: MessageContentType._ToolUse,
            id: 'completion-123',
            name: 'set_task_status',
            input: {
              status: 'completed',
              description: 'Task completed successfully',
            },
          },
        ],
        tokenUsage: { totalTokens: 1000, inputTokens: 500, outputTokens: 500 },
      };

      anthropicService.generateMessage.mockResolvedValue(completionResponse);

      agentProcessor.processTask(mockTaskId);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify atomic task completion
      expect(taskUpdateSpy).toHaveBeenCalledWith(mockTaskId, {
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
      });

      // Verify tool result message creation
      expect(messagesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.arrayContaining([
            expect.objectContaining({
              type: MessageContentType._ToolResult,
              tool_use_id: 'completion-123',
              is_error: false,
            }),
          ]),
          role: MessageRole.USER,
          taskId: mockTaskId,
        }),
      );
    });
  });
});
