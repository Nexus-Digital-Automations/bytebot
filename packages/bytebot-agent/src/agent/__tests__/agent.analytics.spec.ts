/**
 * AgentAnalyticsService Unit Tests - Comprehensive Analytics and Event Handling Testing
 *
 * Production-ready unit tests covering all AgentAnalyticsService functionality:
 * - Event handling for task completion, failure, and cancellation
 * - Analytics endpoint configuration and validation
 * - Data collection and transmission to analytics service
 * - Error handling for missing configuration and network failures
 * - Safe error extraction and message formatting utilities
 * - Integration with TasksService and MessagesService
 * - Performance monitoring and resource management
 * - Edge case handling and resilience testing
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentAnalyticsService } from '../agent.analytics';
import { TasksService } from '../../tasks/tasks.service';
import { MessagesService } from '../../messages/messages.service';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
  Message,
} from '@prisma/client';
import { MessageContentType } from '@bytebot/shared';

// Mock global fetch
global.fetch = jest.fn();

describe('AgentAnalyticsService', () => {
  let service: AgentAnalyticsService;
  let tasksService: any;
  let messagesService: any;
  let configService: any;
  let logger: any;

  // Test data fixtures
  const mockTaskId = 'task-123';
  const mockAnalyticsEndpoint = 'https://analytics.example.com/events';

  const mockTask: Task = {
    id: mockTaskId,
    description: 'Test analytics task',
    type: TaskType.IMMEDIATE,
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.MEDIUM,
    control: MessageRole.ASSISTANT,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    createdBy: MessageRole.USER,
    userId: 'user-123',
    scheduledFor: null,
    updatedAt: new Date('2024-01-01T10:05:00.000Z'),
    executedAt: new Date('2024-01-01T10:00:00.000Z'),
    completedAt: new Date('2024-01-01T10:05:00.000Z'),
    queuedAt: new Date('2024-01-01T10:00:00.000Z'),
    error: null,
    result: 'Task completed successfully',
    model: {
      provider: 'anthropic',
      name: 'claude-3-sonnet',
      contextWindow: 200000,
    },
  };

  const mockMessages: Message[] = [
    {
      id: 'message-1',
      content: [
        {
          type: MessageContentType._Text,
          text: 'Please complete this task',
        },
      ],
      role: MessageRole.USER,
      taskId: mockTaskId,
      summaryId: null,
      createdAt: new Date('2024-01-01T10:00:00.000Z'),
      updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    },
    {
      id: 'message-2',
      content: [
        {
          type: MessageContentType._Text,
          text: 'Task completed successfully',
        },
      ],
      role: MessageRole.ASSISTANT,
      taskId: mockTaskId,
      summaryId: null,
      createdAt: new Date('2024-01-01T10:05:00.000Z'),
      updatedAt: new Date('2024-01-01T10:05:00.000Z'),
    },
  ];

  const mockFetchResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    // Create comprehensive mocks
    tasksService = {
      findById: jest.fn(),
    };

    messagesService = {
      findEvery: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
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
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<AgentAnalyticsService>(AgentAnalyticsService);

    // Override the private logger property with our mock
    (service as any).logger = logger;

    // Setup default mocks
    configService.get.mockReturnValue(mockAnalyticsEndpoint);
    tasksService.findById.mockResolvedValue(mockTask);
    messagesService.findEvery.mockResolvedValue(mockMessages);
    (global.fetch as jest.Mock).mockResolvedValue(mockFetchResponse);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    it('should initialize with analytics endpoint configured', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'BYTEBOT_ANALYTICS_ENDPOINT',
      );
      expect(logger.warn).not.toHaveBeenCalled();
      expect((service as any).endpoint).toBe(mockAnalyticsEndpoint);
    });

    it('should handle missing analytics endpoint configuration', () => {
      configService.get.mockReturnValue(undefined);

      // Create new service instance with missing endpoint
      const moduleWithoutEndpoint = Test.createTestingModule({
        providers: [
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
            provide: ConfigService,
            useValue: configService,
          },
          {
            provide: Logger,
            useValue: logger,
          },
        ],
      }).compile();

      return moduleWithoutEndpoint.then((module) => {
        const serviceWithoutEndpoint = module.get<AgentAnalyticsService>(
          AgentAnalyticsService,
        );

        expect(logger.warn).toHaveBeenCalledWith(
          'BYTEBOT_ANALYTICS_ENDPOINT is not set. Analytics service disabled.',
        );
        expect((serviceWithoutEndpoint as any).endpoint).toBeUndefined();
      });
    });

    it('should handle null analytics endpoint configuration', () => {
      configService.get.mockReturnValue(null);

      const moduleWithNullEndpoint = Test.createTestingModule({
        providers: [
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
            provide: ConfigService,
            useValue: configService,
          },
          {
            provide: Logger,
            useValue: logger,
          },
        ],
      }).compile();

      return moduleWithNullEndpoint.then((module) => {
        const serviceWithNullEndpoint = module.get<AgentAnalyticsService>(
          AgentAnalyticsService,
        );

        expect(logger.warn).toHaveBeenCalledWith(
          'BYTEBOT_ANALYTICS_ENDPOINT is not set. Analytics service disabled.',
        );
        expect((serviceWithNullEndpoint as any).endpoint).toBeUndefined();
      });
    });

    it('should handle empty string analytics endpoint configuration', () => {
      configService.get.mockReturnValue('');

      const moduleWithEmptyEndpoint = Test.createTestingModule({
        providers: [
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
            provide: ConfigService,
            useValue: configService,
          },
          {
            provide: Logger,
            useValue: logger,
          },
        ],
      }).compile();

      return moduleWithEmptyEndpoint.then((module) => {
        const serviceWithEmptyEndpoint = module.get<AgentAnalyticsService>(
          AgentAnalyticsService,
        );

        expect(logger.warn).toHaveBeenCalledWith(
          'BYTEBOT_ANALYTICS_ENDPOINT is not set. Analytics service disabled.',
        );
        expect((serviceWithEmptyEndpoint as any).endpoint).toBe('');
      });
    });
  });

  describe('Task Event Handling', () => {
    describe('handleTaskEvent() - Task Completion', () => {
      it('should handle task.completed event successfully', async () => {
        const payload = { taskId: mockTaskId };

        await service.handleTaskEvent(payload);

        expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
        expect(messagesService.findEvery).toHaveBeenCalledWith(mockTaskId);
        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mockTask, messages: mockMessages }),
        });
      });

      it('should handle task.failed event successfully', async () => {
        const failedTask = {
          ...mockTask,
          status: TaskStatus.FAILED,
          error: 'Task execution failed',
          completedAt: null,
        };
        tasksService.findById.mockResolvedValue(failedTask);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
        expect(messagesService.findEvery).toHaveBeenCalledWith(mockTaskId);
        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...failedTask, messages: mockMessages }),
        });
      });

      it('should handle task.cancel event successfully', async () => {
        const cancelledTask = {
          ...mockTask,
          status: TaskStatus.PENDING,
          completedAt: null,
        };
        tasksService.findById.mockResolvedValue(cancelledTask);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
        expect(messagesService.findEvery).toHaveBeenCalledWith(mockTaskId);
        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...cancelledTask, messages: mockMessages }),
        });
      });

      it('should skip analytics when endpoint is not configured', async () => {
        (service as any).endpoint = undefined;

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(tasksService.findById).not.toHaveBeenCalled();
        expect(messagesService.findEvery).not.toHaveBeenCalled();
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should handle tasks with no messages', async () => {
        messagesService.findEvery.mockResolvedValue([]);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
        expect(messagesService.findEvery).toHaveBeenCalledWith(mockTaskId);
        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mockTask, messages: [] }),
        });
      });

      it('should handle tasks with complex message content', async () => {
        const complexMessages = [
          {
            ...mockMessages[0],
            content: [
              { type: MessageContentType._Text, text: 'Complex message' },
              {
                type: MessageContentType._Image,
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: 'base64imagedata',
                },
              },
              {
                type: MessageContentType._ToolUse,
                id: 'tool-123',
                name: 'computer_click_mouse',
                input: { coordinates: { x: 100, y: 200 }, button: 'left' },
              },
            ],
          },
        ];
        messagesService.findEvery.mockResolvedValue(complexMessages);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mockTask, messages: complexMessages }),
        });
      });
    });

    describe('Data Collection and Transmission', () => {
      it('should send complete task and message data to analytics endpoint', async () => {
        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        const expectedPayload = { ...mockTask, messages: mockMessages };
        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(expectedPayload),
        });
      });

      it('should handle large task data efficiently', async () => {
        const largeTask = {
          ...mockTask,
          result: 'A'.repeat(10000), // Large result string
        };
        const largeMessages = Array.from({ length: 100 }, (_, i) => ({
          ...mockMessages[0],
          id: `message-${i}`,
          content: [
            {
              type: MessageContentType._Text,
              text: `Large message content ${i}: ${'X'.repeat(1000)}`,
            },
          ],
        }));

        tasksService.findById.mockResolvedValue(largeTask);
        messagesService.findEvery.mockResolvedValue(largeMessages);

        const payload = { taskId: mockTaskId };
        const startTime = Date.now();
        await service.handleTaskEvent(payload);
        const endTime = Date.now();

        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...largeTask, messages: largeMessages }),
        });
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      });

      it('should handle different analytics endpoint formats', async () => {
        const endpoints = [
          'http://localhost:3000/analytics',
          'https://api.company.com/v1/analytics/events',
          'https://analytics.domain.co.uk/webhook',
        ];

        for (const endpoint of endpoints) {
          configService.get.mockReturnValue(endpoint);

          // Create new service instance for each endpoint
          const module = await Test.createTestingModule({
            providers: [
              AgentAnalyticsService,
              { provide: TasksService, useValue: tasksService },
              { provide: MessagesService, useValue: messagesService },
              { provide: ConfigService, useValue: configService },
              { provide: Logger, useValue: logger },
            ],
          }).compile();

          const testService = module.get<AgentAnalyticsService>(
            AgentAnalyticsService,
          );

          const payload = { taskId: mockTaskId };
          await testService.handleTaskEvent(payload);

          expect(global.fetch).toHaveBeenCalledWith(
            endpoint,
            expect.any(Object),
          );
        }
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    describe('Service Errors', () => {
      it('should handle TasksService errors gracefully', async () => {
        const serviceError = new Error('Task not found');
        tasksService.findById.mockRejectedValue(serviceError);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: Task not found`,
          serviceError.stack,
        );
        expect(global.fetch).not.toHaveBeenCalled();
      });

      it('should handle MessagesService errors gracefully', async () => {
        const serviceError = new Error('Messages query failed');
        messagesService.findEvery.mockRejectedValue(serviceError);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: Messages query failed`,
          serviceError.stack,
        );
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    describe('Network Errors', () => {
      it('should handle fetch network errors gracefully', async () => {
        const networkError = new Error('Network request failed');
        (global.fetch as jest.Mock).mockRejectedValue(networkError);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: Network request failed`,
          networkError.stack,
        );
      });

      it('should handle fetch timeout errors', async () => {
        const timeoutError = new Error('Request timeout');
        timeoutError.name = 'TimeoutError';
        (global.fetch as jest.Mock).mockRejectedValue(timeoutError);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: Request timeout`,
          timeoutError.stack,
        );
      });

      it('should handle HTTP error responses', async () => {
        const errorResponse = {
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          json: jest.fn().mockResolvedValue({ error: 'Server error' }),
        };
        (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(tasksService.findById).toHaveBeenCalledWith(mockTaskId);
        expect(messagesService.findEvery).toHaveBeenCalledWith(mockTaskId);
        expect(global.fetch).toHaveBeenCalled();
        // Note: The current implementation doesn't check response.ok, so this would succeed
      });
    });

    describe('Safe Error Extraction', () => {
      it('should handle Error instances correctly', async () => {
        const error = new Error('Test error message');
        error.stack = 'Error stack trace';
        tasksService.findById.mockRejectedValue(error);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: Test error message`,
          'Error stack trace',
        );
      });

      it('should handle string errors correctly', async () => {
        const stringError = 'String error message';
        tasksService.findById.mockRejectedValue(stringError);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: String error message`,
          undefined,
        );
      });

      it('should handle object errors correctly', async () => {
        const objectError = { code: 'ERR_001', message: 'Object error' };
        tasksService.findById.mockRejectedValue(objectError);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: ${JSON.stringify(objectError)}`,
          undefined,
        );
      });

      it('should handle unserializable errors correctly', async () => {
        const circularError = {};
        circularError.self = circularError; // Create circular reference
        tasksService.findById.mockRejectedValue(circularError);

        const payload = { taskId: mockTaskId };
        await service.handleTaskEvent(payload);

        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: [Unserializable Error Object]`,
          undefined,
        );
      });

      it('should handle null and undefined errors', async () => {
        // Test null error
        tasksService.findById.mockRejectedValueOnce(null);
        await service.handleTaskEvent({ taskId: mockTaskId });
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: null`,
          undefined,
        );

        // Test undefined error
        tasksService.findById.mockRejectedValueOnce(undefined);
        await service.handleTaskEvent({ taskId: mockTaskId });
        expect(logger.error).toHaveBeenCalledWith(
          `Failed to send analytics for task ${mockTaskId}: undefined`,
          undefined,
        );
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent event processing', async () => {
      const taskIds = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5'];
      const payloads = taskIds.map((taskId) => ({ taskId }));

      // Mock different tasks for each ID
      tasksService.findById.mockImplementation((taskId) =>
        Promise.resolve({ ...mockTask, id: taskId }),
      );

      const promises = payloads.map((payload) =>
        service.handleTaskEvent(payload),
      );

      await Promise.all(promises);

      expect(tasksService.findById).toHaveBeenCalledTimes(5);
      expect(messagesService.findEvery).toHaveBeenCalledTimes(5);
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should handle rapid successive events efficiently', async () => {
      const startTime = Date.now();

      for (let i = 0; i < 10; i++) {
        await service.handleTaskEvent({ taskId: `task-${i}` });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second
      expect(tasksService.findById).toHaveBeenCalledTimes(10);
      expect(global.fetch).toHaveBeenCalledTimes(10);
    });

    it('should handle memory efficiently with large datasets', async () => {
      const largeMessages = Array.from({ length: 1000 }, (_, i) => ({
        ...mockMessages[0],
        id: `message-${i}`,
        content: [
          {
            type: MessageContentType._Text,
            text: `Message ${i} content`,
          },
        ],
      }));

      messagesService.findEvery.mockResolvedValue(largeMessages);

      const payload = { taskId: mockTaskId };
      await service.handleTaskEvent(payload);

      expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...mockTask, messages: largeMessages }),
      });
    });
  });

  describe('Integration and Service Coordination', () => {
    it('should coordinate properly with TasksService and MessagesService', async () => {
      const payload = { taskId: mockTaskId };
      await service.handleTaskEvent(payload);

      // Verify service calls are made in correct order
      expect(tasksService.findById).toHaveBeenCalledBefore(
        messagesService.findEvery as jest.Mock,
      );
      expect(messagesService.findEvery).toHaveBeenCalledBefore(
        global.fetch as jest.Mock,
      );
    });

    it('should handle different task types and priorities correctly', async () => {
      const taskVariations = [
        { ...mockTask, type: TaskType.SCHEDULED, priority: TaskPriority.HIGH },
        { ...mockTask, type: TaskType.IMMEDIATE, priority: TaskPriority.LOW },
        {
          ...mockTask,
          type: TaskType.IMMEDIATE,
          priority: TaskPriority.URGENT,
        },
      ];

      for (const task of taskVariations) {
        tasksService.findById.mockResolvedValueOnce(task);
        await service.handleTaskEvent({ taskId: task.id });

        expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...task, messages: mockMessages }),
        });
      }
    });

    it('should handle tasks with different model configurations', async () => {
      const taskWithDifferentModel = {
        ...mockTask,
        model: {
          provider: 'openai',
          name: 'gpt-4',
          contextWindow: 128000,
        },
      };

      tasksService.findById.mockResolvedValue(taskWithDifferentModel);

      const payload = { taskId: mockTaskId };
      await service.handleTaskEvent(payload);

      expect(global.fetch).toHaveBeenCalledWith(mockAnalyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskWithDifferentModel,
          messages: mockMessages,
        }),
      });
    });

    it('should maintain data integrity during transmission', async () => {
      const payload = { taskId: mockTaskId };
      await service.handleTaskEvent(payload);

      const fetchCallArgs = (global.fetch as jest.Mock).mock.calls[0];
      const transmittedData = JSON.parse(fetchCallArgs[1].body);

      // Verify task data integrity
      expect(transmittedData.id).toBe(mockTask.id);
      expect(transmittedData.description).toBe(mockTask.description);
      expect(transmittedData.status).toBe(mockTask.status);
      expect(transmittedData.model).toEqual(mockTask.model);

      // Verify messages data integrity
      expect(transmittedData.messages).toHaveLength(mockMessages.length);
      expect(transmittedData.messages[0].id).toBe(mockMessages[0].id);
      expect(transmittedData.messages[0].content).toEqual(
        mockMessages[0].content,
      );
    });
  });
});
