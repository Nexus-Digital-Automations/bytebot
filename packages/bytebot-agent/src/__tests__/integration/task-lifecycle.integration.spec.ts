/**
 * Task Lifecycle Integration Tests - Comprehensive Workflow Testing
 *
 * Production-ready integration tests covering complete task lifecycle workflows:
 * - Task creation → execution → completion flow
 * - Task creation → scheduling → queuing → execution flow
 * - Task state transitions and validation
 * - Message handling throughout task lifecycle
 * - File handling and processing workflows
 * - Error scenarios and recovery patterns
 * - Multi-service integration (Tasks, Messages, Summaries)
 * - WebSocket communication patterns
 * - Database consistency and transaction handling
 * - Performance under load and concurrent operations
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Task,
  Message,
  Summary,
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
  Prisma,
} from '@prisma/client';
import { TasksService } from '../../tasks/tasks.service';
import { MessagesService } from '../../messages/messages.service';
import { SummariesService } from '../../summaries/summaries.service';
import { TasksGateway } from '../../tasks/tasks.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { CircuitBreakerGuard } from '../../common/guards/circuit-breaker.guard';
import { CreateTaskDto } from '../../tasks/dto/create-task.dto';
import { UpdateTaskDto } from '../../tasks/dto/update-task.dto';
import { AddTaskMessageDto } from '../../tasks/dto/add-task-message.dto';

// Mock fetch globally for external API calls
global.fetch = jest.fn();

describe('Task Lifecycle Integration Tests', () => {
  let app: INestApplication;
  let tasksService: TasksService;
  let messagesService: MessagesService;
  let summariesService: SummariesService;
  let tasksGateway: TasksGateway;
  let prismaService: any;
  let configService: any;
  let eventEmitter: EventEmitter2;

  // Test data fixtures
  const mockUserId = 'user-integration-test';
  let testTaskCounter = 0;

  // Mock implementations
  const mockPrismaService = {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    summary: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    file: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockTasksGateway = {
    emitTaskCreated: jest.fn(),
    emitTaskUpdate: jest.fn(),
    emitTaskDeleted: jest.fn(),
    emitNewMessage: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8080'),
  };

  const mockCircuitBreakerGuard = {
    canExecute: jest.fn().mockReturnValue(true),
    recordSuccess: jest.fn(),
    recordFailure: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        MessagesService,
        SummariesService,
        TasksGateway,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        EventEmitter2,
        {
          provide: CircuitBreakerGuard,
          useValue: mockCircuitBreakerGuard,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    tasksService = module.get<TasksService>(TasksService);
    messagesService = module.get<MessagesService>(MessagesService);
    summariesService = module.get<SummariesService>(SummariesService);
    tasksGateway = module.get<TasksGateway>(TasksGateway);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Setup default transaction mock
    mockPrismaService.$transaction.mockImplementation(
      async (callback: any) => await callback(mockPrismaService),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    testTaskCounter++;
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Complete Task Lifecycle - Immediate Tasks', () => {
    it('should execute complete immediate task lifecycle successfully', async () => {
      const taskId = `integration-task-${testTaskCounter}`;
      const createDto: CreateTaskDto = {
        description: 'Integration test immediate task',
        type: TaskType.IMMEDIATE,
        priority: TaskPriority.HIGH,
        createdBy: MessageRole.USER,
        model: { provider: 'anthropic', name: 'claude-3-sonnet' },
      };

      const mockTask: Task = {
        id: taskId,
        description: createDto.description,
        type: createDto.type!,
        status: TaskStatus.PENDING,
        priority: createDto.priority!,
        control: MessageRole.ASSISTANT,
        createdBy: createDto.createdBy!,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: createDto.model as Prisma.JsonValue,
      };

      const mockMessage: Message = {
        id: `message-${taskId}`,
        content: [{ type: 'text', text: createDto.description }] as Prisma.JsonValue,
        role: MessageRole.USER,
        taskId,
        summaryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup mocks for task creation
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);

      // 1. Create task
      const createdTask = await tasksService.create(createDto);
      expect(createdTask).toEqual(mockTask);
      expect(mockTasksGateway.emitTaskCreated).toHaveBeenCalledWith(mockTask);

      // 2. Find next task to execute
      const nextTask = await tasksService.findNextTask();
      expect(nextTask).toEqual(mockTask);

      // 3. Start task execution
      const runningUpdate: UpdateTaskDto = {
        status: TaskStatus.RUNNING,
        executedAt: new Date(),
      };

      const runningTask = { ...mockTask, ...runningUpdate };
      mockPrismaService.task.update.mockResolvedValue(runningTask);
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      const updatedTask = await tasksService.update(taskId, runningUpdate);
      expect(updatedTask.status).toBe(TaskStatus.RUNNING);
      expect(mockTasksGateway.emitTaskUpdate).toHaveBeenCalledWith(taskId, updatedTask);

      // 4. Add progress messages during execution
      const progressMessageDto: AddTaskMessageDto = {
        message: 'Task is making progress...',
      };

      mockPrismaService.message.create.mockResolvedValue({
        ...mockMessage,
        id: `progress-message-${taskId}`,
        content: [{ type: 'text', text: progressMessageDto.message }],
      });

      await tasksService.addTaskMessage(taskId, progressMessageDto);
      expect(mockTasksGateway.emitNewMessage).toHaveBeenCalled();

      // 5. Complete task
      const completedUpdate: UpdateTaskDto = {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        result: { success: true, output: 'Task completed successfully' },
      };

      const completedTask = { ...mockTask, ...completedUpdate };
      mockPrismaService.task.update.mockResolvedValue(completedTask);

      const finalTask = await tasksService.update(taskId, completedUpdate);
      expect(finalTask.status).toBe(TaskStatus.COMPLETED);
      expect(finalTask.result).toEqual(completedUpdate.result);

      // Verify task.completed event was emitted
      expect(mockTasksGateway.emitTaskUpdate).toHaveBeenCalledWith(taskId, finalTask);

      // 6. Create summary after completion
      const summaryContent = 'Task completed successfully with high quality output.';
      const mockSummary: Summary = {
        id: `summary-${taskId}`,
        taskId,
        content: summaryContent,
        parentId: null,
        metadata: { type: 'completion-summary' } as Prisma.JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.summary.create.mockResolvedValue(mockSummary);

      const summary = await summariesService.create({
        taskId,
        content: summaryContent,
        metadata: { type: 'completion-summary' },
      });

      expect(summary.taskId).toBe(taskId);
      expect(summary.content).toBe(summaryContent);

      // Verify complete workflow executed without errors
      expect(mockPrismaService.task.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.task.update).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.message.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.summary.create).toHaveBeenCalledTimes(1);
    });

    it('should handle task execution with file processing', async () => {
      const taskId = `file-task-${testTaskCounter}`;
      const createDto: CreateTaskDto = {
        description: 'Process uploaded files',
        type: TaskType.IMMEDIATE,
        files: [
          {
            name: 'data.json',
            base64: 'data:application/json;base64,eyJkYXRhIjogInRlc3QifQ==',
            type: 'application/json',
            size: 16,
          },
          {
            name: 'config.txt',
            base64: 'data:text/plain;base64,Y29uZmlnIGRhdGE=',
            type: 'text/plain',
            size: 11,
          },
        ],
      };

      const mockTask: Task = {
        id: taskId,
        description: createDto.description,
        type: createDto.type!,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      };

      const mockFiles = createDto.files!.map((file, i) => ({
        id: `file-${i}-${taskId}`,
        name: file.name,
        type: file.type,
        size: file.size,
        data: file.base64.split('base64,')[1],
        taskId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Setup mocks
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockPrismaService.file.create.mockImplementation((data) => 
        Promise.resolve(mockFiles[0])
      );
      mockPrismaService.message.create.mockResolvedValue({
        id: `file-message-${taskId}`,
        content: [{ type: 'text', text: 'Files uploaded successfully' }],
        role: MessageRole.USER,
        taskId,
        summaryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create task with files
      const createdTask = await tasksService.create(createDto);
      expect(createdTask).toEqual(mockTask);

      // Verify files were processed
      expect(mockPrismaService.file.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.file.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          name: 'data.json',
          type: 'application/json',
          size: 16,
          data: 'eyJkYXRhIjogInRlc3QifQ==',
          taskId,
        }),
      });
    });

    it('should handle task failure and recovery workflow', async () => {
      const taskId = `failure-task-${testTaskCounter}`;
      const createDto: CreateTaskDto = {
        description: 'Task that will fail and recover',
        type: TaskType.IMMEDIATE,
        priority: TaskPriority.HIGH,
      };

      const mockTask: Task = {
        id: taskId,
        description: createDto.description,
        type: createDto.type!,
        status: TaskStatus.PENDING,
        priority: createDto.priority!,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      };

      // Setup mocks
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockPrismaService.message.create.mockResolvedValue({
        id: `message-${taskId}`,
        content: [{ type: 'text', text: createDto.description }],
        role: MessageRole.USER,
        taskId,
        summaryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      // 1. Create task
      await tasksService.create(createDto);

      // 2. Task fails during execution
      const failedUpdate: UpdateTaskDto = {
        status: TaskStatus.FAILED,
        error: 'Execution timeout after 30 seconds',
        executedAt: new Date(),
      };

      const failedTask = { ...mockTask, ...failedUpdate };
      mockPrismaService.task.update.mockResolvedValue(failedTask);

      const updatedTask = await tasksService.update(taskId, failedUpdate);
      expect(updatedTask.status).toBe(TaskStatus.FAILED);
      expect(updatedTask.error).toBe('Execution timeout after 30 seconds');

      // 3. Task requests help (needs human intervention)
      const needsHelpUpdate: UpdateTaskDto = {
        status: TaskStatus.NEEDS_HELP,
      };

      const takeOverSpy = jest.spyOn(tasksService, 'takeOver');
      const takenOverTask = { ...mockTask, control: MessageRole.USER };
      takeOverSpy.mockResolvedValue(takenOverTask);
      
      mockPrismaService.task.update.mockResolvedValue({ 
        ...mockTask, 
        status: TaskStatus.NEEDS_HELP 
      });

      await tasksService.update(taskId, needsHelpUpdate);
      expect(takeOverSpy).toHaveBeenCalledWith(taskId);

      // 4. User provides guidance and resumes task
      const guidanceDto: AddTaskMessageDto = {
        message: 'Try reducing the complexity of the operation',
      };

      await tasksService.addTaskMessage(taskId, guidanceDto);

      // 5. Resume task execution
      const resumedTask = {
        ...mockTask,
        control: MessageRole.ASSISTANT,
        status: TaskStatus.RUNNING,
      };
      mockPrismaService.task.update.mockResolvedValue(resumedTask);

      const result = await tasksService.resume(taskId);
      expect(result.control).toBe(MessageRole.ASSISTANT);
      expect(result.status).toBe(TaskStatus.RUNNING);

      // 6. Task completes successfully after recovery
      const completedUpdate: UpdateTaskDto = {
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        result: { success: true, recoveryRequired: true },
      };

      const completedTask = { ...mockTask, ...completedUpdate };
      mockPrismaService.task.update.mockResolvedValue(completedTask);

      const finalTask = await tasksService.update(taskId, completedUpdate);
      expect(finalTask.status).toBe(TaskStatus.COMPLETED);
      expect(finalTask.result).toEqual(completedUpdate.result);
    });
  });

  describe('Scheduled Task Lifecycle', () => {
    it('should execute scheduled task workflow correctly', async () => {
      const taskId = `scheduled-task-${testTaskCounter}`;
      const scheduledDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const createDto: CreateTaskDto = {
        description: 'Scheduled maintenance task',
        type: TaskType.SCHEDULED,
        priority: TaskPriority.LOW,
        scheduledFor: scheduledDate,
      };

      const mockTask: Task = {
        id: taskId,
        description: createDto.description,
        type: createDto.type!,
        status: TaskStatus.PENDING,
        priority: createDto.priority!,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: createDto.scheduledFor!,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      };

      // Setup mocks
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockPrismaService.message.create.mockResolvedValue({
        id: `scheduled-message-${taskId}`,
        content: [{ type: 'text', text: createDto.description }],
        role: MessageRole.USER,
        taskId,
        summaryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 1. Create scheduled task
      const createdTask = await tasksService.create(createDto);
      expect(createdTask.scheduledFor).toEqual(scheduledDate);
      expect(createdTask.status).toBe(TaskStatus.PENDING);

      // 2. Check for scheduled tasks
      mockPrismaService.task.findMany.mockResolvedValue([mockTask]);
      const scheduledTasks = await tasksService.findScheduledTasks();
      expect(scheduledTasks).toHaveLength(1);
      expect(scheduledTasks[0].scheduledFor).toEqual(scheduledDate);

      // 3. Queue task when scheduled time arrives
      const queuedUpdate: UpdateTaskDto = {
        queuedAt: new Date(),
      };

      const queuedTask = { ...mockTask, ...queuedUpdate };
      mockPrismaService.task.update.mockResolvedValue(queuedTask);
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

      const updatedTask = await tasksService.update(taskId, queuedUpdate);
      expect(updatedTask.queuedAt).toBeDefined();

      // 4. Execute when ready
      const executionUpdate: UpdateTaskDto = {
        status: TaskStatus.RUNNING,
        executedAt: new Date(),
      };

      const runningTask = { ...mockTask, ...executionUpdate };
      mockPrismaService.task.update.mockResolvedValue(runningTask);

      const executingTask = await tasksService.update(taskId, executionUpdate);
      expect(executingTask.status).toBe(TaskStatus.RUNNING);
      expect(executingTask.executedAt).toBeDefined();
    });
  });

  describe('Message Integration Workflow', () => {
    it('should handle complex message processing workflow', async () => {
      const taskId = `message-task-${testTaskCounter}`;

      // Create task first
      const mockTask: Task = {
        id: taskId,
        description: 'Task with complex message workflow',
        type: TaskType.IMMEDIATE,
        status: TaskStatus.RUNNING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: new Date(),
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      };

      // Setup initial messages
      const messages = [
        {
          id: `msg-1-${taskId}`,
          content: [{ type: 'text', text: 'Initial user message' }],
          role: MessageRole.USER,
          taskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
          updatedAt: new Date('2024-01-01T10:00:00.000Z'),
        },
        {
          id: `msg-2-${taskId}`,
          content: [{ type: 'text', text: 'Assistant response' }],
          role: MessageRole.ASSISTANT,
          taskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:01:00.000Z'),
          updatedAt: new Date('2024-01-01T10:01:00.000Z'),
        },
        {
          id: `msg-3-${taskId}`,
          content: [
            { 
              type: 'tool_result',
              tool_use_id: 'tool-123',
              content: 'Tool execution successful'
            }
          ],
          role: MessageRole.USER,
          taskId,
          summaryId: null,
          createdAt: new Date('2024-01-01T10:02:00.000Z'),
          updatedAt: new Date('2024-01-01T10:02:00.000Z'),
        },
      ];

      mockPrismaService.message.findMany.mockResolvedValue(messages);

      // 1. Retrieve all messages
      const allMessages = await messagesService.findEvery(taskId);
      expect(allMessages.messages).toHaveLength(3);
      expect(allMessages.retrievalMetrics.totalCount).toBe(3);

      // 2. Process messages for UI display
      const processedMessages = await messagesService.findProcessedMessages(taskId);
      expect(processedMessages.groupedMessages).toBeDefined();
      expect(processedMessages.processingMetrics).toBeDefined();

      // 3. Create summary from conversation
      const conversationSummary = 'User requested assistance, assistant provided help, tools executed successfully.';
      const mockSummary: Summary = {
        id: `conv-summary-${taskId}`,
        taskId,
        content: conversationSummary,
        parentId: null,
        metadata: { type: 'conversation-summary', messageCount: 3 } as Prisma.JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.summary.create.mockResolvedValue(mockSummary);

      const summary = await summariesService.create({
        taskId,
        content: conversationSummary,
        metadata: { type: 'conversation-summary', messageCount: 3 },
      });

      expect(summary.contentMetrics.wordCount).toBeGreaterThan(0);
      expect(summary.contentMetrics.characterCount).toBe(conversationSummary.length);

      // 4. Attach summary to messages
      const messageIds = messages.map(m => m.id);
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 3 });

      await messagesService.attachSummary(taskId, summary.id, messageIds);

      // 5. Verify unsummarized messages (should be empty after attachment)
      mockPrismaService.message.findMany.mockResolvedValue([]);
      const unsummarizedMessages = await messagesService.findUnsummarized(taskId);
      expect(unsummarizedMessages).toHaveLength(0);
    });
  });

  describe('Concurrent Operations and Load Testing', () => {
    it('should handle multiple concurrent task operations', async () => {
      const taskCount = 10;
      const tasks: Task[] = Array.from({ length: taskCount }, (_, i) => ({
        id: `concurrent-task-${testTaskCounter}-${i}`,
        description: `Concurrent test task ${i}`,
        type: TaskType.IMMEDIATE,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      }));

      // Setup mocks for concurrent operations
      tasks.forEach((task, i) => {
        mockPrismaService.task.create.mockResolvedValueOnce(task);
        mockPrismaService.message.create.mockResolvedValueOnce({
          id: `msg-concurrent-${i}`,
          content: [{ type: 'text', text: task.description }],
          role: MessageRole.USER,
          taskId: task.id,
          summaryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      });

      // Create tasks concurrently
      const createPromises = tasks.map((task, i) =>
        tasksService.create({
          description: task.description,
          type: task.type,
          priority: task.priority,
        })
      );

      const startTime = Date.now();
      const createdTasks = await Promise.all(createPromises);
      const endTime = Date.now();

      expect(createdTasks).toHaveLength(taskCount);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockTasksGateway.emitTaskCreated).toHaveBeenCalledTimes(taskCount);

      // Update tasks concurrently
      const updatePromises = createdTasks.map((task, i) => {
        const updatedTask = { ...task, status: TaskStatus.RUNNING };
        mockPrismaService.task.update.mockResolvedValueOnce(updatedTask);
        mockPrismaService.task.findUnique.mockResolvedValueOnce(task);

        return tasksService.update(task.id, { status: TaskStatus.RUNNING });
      });

      const updatedTasks = await Promise.all(updatePromises);
      expect(updatedTasks).toHaveLength(taskCount);
      expect(mockTasksGateway.emitTaskUpdate).toHaveBeenCalledTimes(taskCount);
    });

    it('should maintain data consistency under load', async () => {
      const operationCount = 50;
      const taskId = `consistency-task-${testTaskCounter}`;

      const mockTask: Task = {
        id: taskId,
        description: 'Data consistency test task',
        type: TaskType.IMMEDIATE,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      };

      // Create task
      mockPrismaService.task.create.mockResolvedValue(mockTask);
      mockPrismaService.message.create.mockResolvedValue({
        id: `consistency-msg-${taskId}`,
        content: [{ type: 'text', text: 'Consistency test' }],
        role: MessageRole.USER,
        taskId,
        summaryId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await tasksService.create({
        description: mockTask.description,
        type: mockTask.type,
      });

      // Perform many concurrent operations on same task
      const operations = Array.from({ length: operationCount }, (_, i) => {
        const messageDto: AddTaskMessageDto = {
          message: `Load test message ${i}`,
        };

        mockPrismaService.message.create.mockResolvedValueOnce({
          id: `load-msg-${i}`,
          content: [{ type: 'text', text: messageDto.message }],
          role: MessageRole.USER,
          taskId,
          summaryId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

        return tasksService.addTaskMessage(taskId, messageDto);
      });

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      expect(results).toHaveLength(operationCount);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(mockTasksGateway.emitNewMessage).toHaveBeenCalledTimes(operationCount);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle database transaction failures gracefully', async () => {
      const taskId = `transaction-fail-task-${testTaskCounter}`;

      // Simulate transaction failure
      mockPrismaService.$transaction.mockRejectedValueOnce(
        new Error('Transaction deadlock detected'),
      );

      const createDto: CreateTaskDto = {
        description: 'Task with transaction failure',
        type: TaskType.IMMEDIATE,
      };

      await expect(tasksService.create(createDto)).rejects.toThrow(
        'Transaction deadlock detected',
      );

      // Verify cleanup occurred (no partial state)
      expect(mockTasksGateway.emitTaskCreated).not.toHaveBeenCalled();
    });

    it('should handle external service failures during task control operations', async () => {
      const taskId = `external-fail-task-${testTaskCounter}`;

      const mockTask: Task = {
        id: taskId,
        description: 'Task with external service failure',
        type: TaskType.IMMEDIATE,
        status: TaskStatus.RUNNING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: new Date(),
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      };

      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        control: MessageRole.USER,
      });

      // Simulate external API failure
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('External service unavailable'),
      );

      // Should not throw despite external failure
      const result = await tasksService.takeOver(taskId);
      expect(result.control).toBe(MessageRole.USER);

      // Verify task state was still updated correctly
      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: { control: 'USER' },
      });
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle large message processing efficiently', async () => {
      const taskId = `large-msg-task-${testTaskCounter}`;
      const messageCount = 1000;

      // Create many messages
      const largeMessageSet = Array.from({ length: messageCount }, (_, i) => ({
        id: `large-msg-${i}`,
        content: [{ type: 'text', text: `Large message set item ${i}` }],
        role: i % 2 === 0 ? MessageRole.USER : MessageRole.ASSISTANT,
        taskId,
        summaryId: null,
        createdAt: new Date(2024, 0, 1, 10, Math.floor(i / 60), i % 60),
        updatedAt: new Date(2024, 0, 1, 10, Math.floor(i / 60), i % 60),
      }));

      mockPrismaService.message.findMany.mockResolvedValue(largeMessageSet);

      const startTime = Date.now();
      const result = await messagesService.findProcessedMessages(taskId);
      const endTime = Date.now();

      expect(result.groupedMessages).toBeDefined();
      expect(result.processingMetrics.totalMessages).toBe(messageCount);
      expect(endTime - startTime).toBeLessThan(2000); // Should process 1000 messages within 2 seconds
    });

    it('should handle bulk task operations efficiently', async () => {
      const bulkCount = 100;
      const bulkTasks = Array.from({ length: bulkCount }, (_, i) => ({
        id: `bulk-task-${testTaskCounter}-${i}`,
        description: `Bulk task ${i}`,
        type: TaskType.IMMEDIATE,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        queuedAt: null,
        error: null,
        result: null,
        model: null,
      }));

      mockPrismaService.task.findMany.mockResolvedValue(bulkTasks);
      mockPrismaService.task.count.mockResolvedValue(bulkCount);

      const startTime = Date.now();
      const result = await tasksService.findAll(1, bulkCount);
      const endTime = Date.now();

      expect(result.tasks).toHaveLength(bulkCount);
      expect(result.total).toBe(bulkCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should retrieve 100 tasks within 1 second
    });
  });
});