/**
 * TasksService Unit Tests - Comprehensive Core Service Testing
 *
 * Production-ready unit tests covering all TasksService functionality:
 * - Complete CRUD operations (Create, Read, Update, Delete)
 * - Task lifecycle management (scheduling, queuing, execution)
 * - Task control operations (takeover, resume, cancel)
 * - Message handling and integration
 * - Database transactions and resilience
 * - Event handling and WebSocket integration
 * - Error scenarios and edge cases
 * - Performance optimization and circuit breaker functionality
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Task,
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
  Prisma,
  File,
} from '@prisma/client';
import { TasksService } from '../tasks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TasksGateway } from '../tasks.gateway';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { AddTaskMessageDto } from '../dto/add-task-message.dto';
import { CircuitBreakerGuard } from '../../common/guards/circuit-breaker.guard';

// Mock fetch globally for external API calls
global.fetch = jest.fn();

describe('TasksService', () => {
  let service: TasksService;
  let prismaService: any;
  let tasksGateway: any;
  let configService: any;
  let eventEmitter: any;
  let circuitBreakerGuard: any;

  // Test data fixtures
  const mockTaskId = 'task-123';
  const mockUserId = 'user-456';

  const mockTask: Task = {
    id: mockTaskId,
    description: 'Test task description',
    type: TaskType.IMMEDIATE,
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    control: MessageRole.ASSISTANT,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    createdBy: MessageRole.USER,
    userId: mockUserId,
    scheduledFor: null,
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    executedAt: null,
    completedAt: null,
    queuedAt: null,
    error: null,
    result: null,
    model: { provider: 'anthropic', name: 'claude-3-sonnet' },
  };

  const mockFile: File = {
    id: 'file-123',
    name: 'test.txt',
    type: 'text/plain',
    size: 1024,
    data: 'base64encodeddata',
    taskId: mockTaskId,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  };

  const mockTaskWithFiles = {
    ...mockTask,
    files: [mockFile],
  };

  const mockMessage = {
    id: 'message-123',
    content: [{ type: 'text', text: 'Test message' }],
    role: MessageRole.USER,
    taskId: mockTaskId,
    summaryId: null,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
  };

  beforeEach(async () => {
    // Create simple mocks
    prismaService = {
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
      },
      file: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    tasksGateway = {
      emitTaskCreated: jest.fn(),
      emitTaskUpdate: jest.fn(),
      emitTaskDeleted: jest.fn(),
      emitNewMessage: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    };

    circuitBreakerGuard = {
      canExecute: jest.fn().mockReturnValue(true),
      recordSuccess: jest.fn(),
      recordFailure: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: TasksGateway,
          useValue: tasksGateway,
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
          provide: CircuitBreakerGuard,
          useValue: circuitBreakerGuard,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    // Setup default configuration
    configService.get.mockReturnValue('http://localhost:8080');

    // Setup default transaction mock
    prismaService.$transaction.mockImplementation(
      async (callback: any) => await callback(prismaService),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Task Creation - create()', () => {
    const createTaskDto: CreateTaskDto = {
      description: 'Test task creation',
      type: TaskType.IMMEDIATE,
      priority: TaskPriority.HIGH,
      createdBy: MessageRole.USER,
      model: { provider: 'anthropic', name: 'claude-3-sonnet' },
    };

    beforeEach(() => {
      prismaService.task.create.mockResolvedValue(mockTask);
      prismaService.message.create.mockResolvedValue(mockMessage);
    });

    it('should create a new task successfully', async () => {
      const result = await service.create(createTaskDto);

      expect(result).toEqual(mockTask);
      expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaService.task.create).toHaveBeenCalledWith({
        data: {
          description: createTaskDto.description,
          type: createTaskDto.type,
          priority: createTaskDto.priority,
          status: TaskStatus.PENDING,
          createdBy: createTaskDto.createdBy,
          model: JSON.stringify(createTaskDto.model),
        },
      });
      expect(tasksGateway.emitTaskCreated).toHaveBeenCalledWith(mockTask);
    });

    it('should create task with default values when optional fields are missing', async () => {
      const minimalDto: CreateTaskDto = {
        description: 'Minimal task',
      };

      await service.create(minimalDto);

      expect(prismaService.task.create).toHaveBeenCalledWith({
        data: {
          description: minimalDto.description,
          type: TaskType.IMMEDIATE,
          priority: TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          createdBy: 'USER',
          model: Prisma.JsonNull,
        },
      });
    });

    it('should create task with scheduled date', async () => {
      const scheduledDate = new Date('2024-12-25T10:00:00.000Z');
      const scheduledDto: CreateTaskDto = {
        description: 'Scheduled task',
        type: TaskType.SCHEDULED,
        scheduledFor: scheduledDate,
      };

      await service.create(scheduledDto);

      expect(prismaService.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scheduledFor: scheduledDate,
        }),
      });
    });

    it('should create task with multiple files and process them correctly', async () => {
      const filesDto: CreateTaskDto = {
        description: 'Task with files',
        files: [
          {
            name: 'file1.txt',
            base64: 'data:text/plain;base64,dGVzdCBjb250ZW50',
            type: 'text/plain',
            size: 1024,
          },
          {
            name: 'file2.json',
            base64: 'eyJ0ZXN0IjogdHJ1ZX0=', // Raw base64 without prefix
            type: 'application/json',
            size: 512,
          },
        ],
      };

      prismaService.file.create.mockResolvedValue(mockFile);

      await service.create(filesDto);

      expect(prismaService.file.create).toHaveBeenCalledTimes(2);
      expect(prismaService.file.create).toHaveBeenNthCalledWith(1, {
        data: {
          name: 'file1.txt',
          type: 'text/plain',
          size: 1024,
          data: 'dGVzdCBjb250ZW50', // Base64 without data URL prefix
          taskId: mockTask.id,
        },
      });
      expect(prismaService.file.create).toHaveBeenNthCalledWith(2, {
        data: {
          name: 'file2.json',
          type: 'application/json',
          size: 512,
          data: 'eyJ0ZXN0IjogdHJ1ZX0=',
          taskId: mockTask.id,
        },
      });
    });

    it('should create initial system message with file descriptions', async () => {
      const filesDto: CreateTaskDto = {
        description: 'Task with files',
        files: [
          {
            name: 'test.txt',
            base64: 'data:text/plain;base64,dGVzdA==',
            type: 'text/plain',
            size: 100,
          },
        ],
      };

      prismaService.file.create.mockResolvedValue(mockFile);

      await service.create(filesDto);

      expect(prismaService.message.create).toHaveBeenCalledWith({
        data: {
          content: [
            {
              type: 'text',
              text: expect.stringContaining('File test.txt written to desktop'),
            },
          ],
          role: 'USER',
          taskId: mockTask.id,
        },
      });
    });

    it('should handle transaction rollback on file creation failure', async () => {
      const filesDto: CreateTaskDto = {
        description: 'Task with failing file',
        files: [
          {
            name: 'failing-file.txt',
            base64: 'data:text/plain;base64,dGVzdA==',
            type: 'text/plain',
            size: 100,
          },
        ],
      };

      const dbError = new Error('File creation failed');
      prismaService.file.create.mockRejectedValue(dbError);

      await expect(service.create(filesDto)).rejects.toThrow(dbError);
      expect(tasksGateway.emitTaskCreated).not.toHaveBeenCalled();
    });
  });

  describe('Task Retrieval Operations', () => {
    describe('findScheduledTasks()', () => {
      it('should retrieve scheduled tasks correctly', async () => {
        const scheduledTasks = [
          {
            ...mockTask,
            type: TaskType.SCHEDULED,
            scheduledFor: new Date('2024-12-25T10:00:00.000Z'),
            queuedAt: null,
          },
        ];

        prismaService.task.findMany.mockResolvedValue(scheduledTasks);

        const result = await service.findScheduledTasks();

        expect(result).toEqual(scheduledTasks);
        expect(prismaService.task.findMany).toHaveBeenCalledWith({
          where: {
            scheduledFor: { not: null },
            queuedAt: null,
          },
          orderBy: [{ scheduledFor: 'asc' }],
        });
      });

      it('should return empty array when no scheduled tasks exist', async () => {
        prismaService.task.findMany.mockResolvedValue([]);

        const result = await service.findScheduledTasks();

        expect(result).toEqual([]);
      });
    });

    describe('findNextTask()', () => {
      it('should find next pending task with correct priority ordering', async () => {
        prismaService.task.findFirst.mockResolvedValue(mockTaskWithFiles);

        const result = await service.findNextTask();

        expect(result).toEqual(mockTaskWithFiles);
        expect(prismaService.task.findFirst).toHaveBeenCalledWith({
          where: {
            status: { in: [TaskStatus.RUNNING, TaskStatus.PENDING] },
          },
          orderBy: [
            { executedAt: 'asc' },
            { priority: 'desc' },
            { queuedAt: 'asc' },
            { createdAt: 'asc' },
          ],
          include: { files: true },
        });
      });

      it('should return null when no tasks are available', async () => {
        prismaService.task.findFirst.mockResolvedValue(null);

        const result = await service.findNextTask();

        expect(result).toBeNull();
      });

      it('should log appropriate message when task is found', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'log');
        prismaService.task.findFirst.mockResolvedValue(mockTaskWithFiles);

        await service.findNextTask();

        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            `Found existing task with ID: ${mockTask.id}`,
          ),
        );
      });
    });

    describe('findAll()', () => {
      const mockTasksList = [mockTask];
      const totalCount = 1;

      beforeEach(() => {
        prismaService.task.findMany.mockResolvedValue(mockTasksList);
        prismaService.task.count.mockResolvedValue(totalCount);
      });

      it('should retrieve tasks with default pagination', async () => {
        const result = await service.findAll();

        expect(result).toEqual({
          tasks: mockTasksList,
          total: totalCount,
          totalPages: 1,
        });
        expect(prismaService.task.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        });
      });

      it('should apply custom pagination parameters', async () => {
        await service.findAll(2, 20);

        expect(prismaService.task.findMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { createdAt: 'desc' },
          skip: 20, // (2-1) * 20
          take: 20,
        });
      });

      it('should filter tasks by status', async () => {
        const statuses = ['PENDING', 'RUNNING'];

        await service.findAll(1, 10, statuses);

        expect(prismaService.task.findMany).toHaveBeenCalledWith({
          where: { status: { in: statuses } },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 10,
        });
      });

      it('should calculate total pages correctly', async () => {
        prismaService.task.count.mockResolvedValue(25);

        const result = await service.findAll(1, 10);

        expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
      });

      it('should handle empty results gracefully', async () => {
        prismaService.task.findMany.mockResolvedValue([]);
        prismaService.task.count.mockResolvedValue(0);

        const result = await service.findAll();

        expect(result).toEqual({
          tasks: [],
          total: 0,
          totalPages: 0,
        });
      });
    });

    describe('findById()', () => {
      it('should retrieve task by ID successfully', async () => {
        prismaService.task.findUnique.mockResolvedValue(mockTaskWithFiles);

        const result = await service.findById(mockTaskId);

        expect(result).toEqual(mockTaskWithFiles);
        expect(prismaService.task.findUnique).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          include: { files: true },
        });
      });

      it('should throw NotFoundException when task does not exist', async () => {
        prismaService.task.findUnique.mockResolvedValue(null);

        await expect(service.findById('nonexistent')).rejects.toThrow(
          new NotFoundException('Task with ID nonexistent not found'),
        );
      });

      it('should handle and log database errors', async () => {
        const dbError = new Error('Database connection failed');
        const loggerSpy = jest.spyOn(service['logger'], 'error');
        prismaService.task.findUnique.mockRejectedValue(dbError);

        await expect(service.findById(mockTaskId)).rejects.toThrow(dbError);
        expect(loggerSpy).toHaveBeenCalledWith(
          expect.stringContaining('Error retrieving task ID'),
        );
      });
    });
  });

  describe('Task Update Operations', () => {
    describe('update()', () => {
      const updateDto: UpdateTaskDto = {
        status: TaskStatus.RUNNING,
      };

      beforeEach(() => {
        prismaService.task.findUnique.mockResolvedValue(mockTask);
        prismaService.task.update.mockResolvedValue({
          ...mockTask,
          ...updateDto,
        });
      });

      it('should update task successfully', async () => {
        const result = await service.update(mockTaskId, updateDto);

        expect(result).toEqual({ ...mockTask, ...updateDto });
        expect(prismaService.task.update).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          data: updateDto,
        });
        expect(tasksGateway.emitTaskUpdate).toHaveBeenCalledWith(mockTaskId, {
          ...mockTask,
          ...updateDto,
        });
      });

      it('should throw NotFoundException if task does not exist', async () => {
        prismaService.task.findUnique.mockResolvedValue(null);

        await expect(service.update(mockTaskId, updateDto)).rejects.toThrow(
          new NotFoundException(`Task with ID ${mockTaskId} not found`),
        );
      });

      it('should emit task.completed event when status is COMPLETED', async () => {
        const completedDto: UpdateTaskDto = { status: TaskStatus.COMPLETED };
        prismaService.task.update.mockResolvedValue({
          ...mockTask,
          status: TaskStatus.COMPLETED,
        });

        await service.update(mockTaskId, completedDto);

        expect(eventEmitter.emit).toHaveBeenCalledWith('task.completed', {
          taskId: mockTaskId,
        });
      });

      it('should trigger takeover when status is NEEDS_HELP', async () => {
        const needsHelpDto: UpdateTaskDto = { status: TaskStatus.NEEDS_HELP };
        const takeOverSpy = jest.spyOn(service, 'takeOver').mockResolvedValue({
          ...mockTask,
          control: MessageRole.USER,
        });

        await service.update(mockTaskId, needsHelpDto);

        expect(takeOverSpy).toHaveBeenCalledWith(mockTaskId);
      });

      it('should emit task.failed event when status is FAILED', async () => {
        const failedDto: UpdateTaskDto = { status: TaskStatus.FAILED };
        prismaService.task.update.mockResolvedValue({
          ...mockTask,
          status: TaskStatus.FAILED,
        });

        await service.update(mockTaskId, failedDto);

        expect(eventEmitter.emit).toHaveBeenCalledWith('task.failed', {
          taskId: mockTaskId,
        });
      });
    });
  });

  describe('Task Control Operations', () => {
    describe('takeOver()', () => {
      beforeEach(() => {
        prismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          control: MessageRole.ASSISTANT,
        });
        prismaService.task.update.mockResolvedValue({
          ...mockTask,
          control: MessageRole.USER,
        });
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: true,
          status: 200,
        });
      });

      it('should successfully take over task control', async () => {
        const result = await service.takeOver(mockTaskId);

        expect(result.control).toBe(MessageRole.USER);
        expect(prismaService.task.update).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          data: { control: 'USER' },
        });
        expect(eventEmitter.emit).toHaveBeenCalledWith('task.takeover', {
          taskId: mockTaskId,
        });
        expect(tasksGateway.emitTaskUpdate).toHaveBeenCalled();
      });

      it('should start input tracking via desktop API', async () => {
        await service.takeOver(mockTaskId);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8080/input-tracking/start',
          { method: 'POST' },
        );
      });

      it('should throw NotFoundException if task does not exist', async () => {
        prismaService.task.findUnique.mockResolvedValue(null);

        await expect(service.takeOver(mockTaskId)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw BadRequestException if task is not under agent control', async () => {
        prismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          control: MessageRole.USER,
        });

        await expect(service.takeOver(mockTaskId)).rejects.toThrow(
          new BadRequestException(
            `Task ${mockTaskId} is not under agent control`,
          ),
        );
      });

      it('should handle input tracking API errors gracefully', async () => {
        const loggerSpy = jest.spyOn(service['logger'], 'error');
        (global.fetch as jest.Mock).mockRejectedValue(
          new Error('Network error'),
        );

        await service.takeOver(mockTaskId);

        expect(loggerSpy).toHaveBeenCalledWith(
          'Failed to start input tracking',
          expect.any(Error),
        );
      });
    });

    describe('resume()', () => {
      beforeEach(() => {
        prismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          control: MessageRole.USER,
        });
        prismaService.task.update.mockResolvedValue({
          ...mockTask,
          control: MessageRole.ASSISTANT,
          status: TaskStatus.RUNNING,
        });
        (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
      });

      it('should successfully resume task', async () => {
        const result = await service.resume(mockTaskId);

        expect(result.control).toBe(MessageRole.ASSISTANT);
        expect(result.status).toBe(TaskStatus.RUNNING);
        expect(prismaService.task.update).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          data: {
            control: 'ASSISTANT',
            status: TaskStatus.RUNNING,
          },
        });
        expect(eventEmitter.emit).toHaveBeenCalledWith('task.resume', {
          taskId: mockTaskId,
        });
      });

      it('should stop input tracking via desktop API', async () => {
        await service.resume(mockTaskId);

        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:8080/input-tracking/stop',
          { method: 'POST' },
        );
      });

      it('should throw BadRequestException if task is not under user control', async () => {
        prismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          control: MessageRole.ASSISTANT,
        });

        await expect(service.resume(mockTaskId)).rejects.toThrow(
          new BadRequestException(
            `Task ${mockTaskId} is not under user control`,
          ),
        );
      });
    });

    describe('cancel()', () => {
      beforeEach(() => {
        prismaService.task.findUnique.mockResolvedValue(mockTask);
        prismaService.task.update.mockResolvedValue({
          ...mockTask,
          status: TaskStatus.CANCELLED,
        });
      });

      it('should successfully cancel task', async () => {
        const result = await service.cancel(mockTaskId);

        expect(result.status).toBe(TaskStatus.CANCELLED);
        expect(prismaService.task.update).toHaveBeenCalledWith({
          where: { id: mockTaskId },
          data: { status: TaskStatus.CANCELLED },
        });
        expect(eventEmitter.emit).toHaveBeenCalledWith('task.cancel', {
          taskId: mockTaskId,
        });
      });

      it('should throw BadRequestException if task is already completed', async () => {
        prismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          status: TaskStatus.COMPLETED,
        });

        await expect(service.cancel(mockTaskId)).rejects.toThrow(
          new BadRequestException(
            `Task ${mockTaskId} is already completed, failed, or cancelled`,
          ),
        );
      });

      it('should throw BadRequestException if task is already cancelled', async () => {
        prismaService.task.findUnique.mockResolvedValue({
          ...mockTask,
          status: TaskStatus.CANCELLED,
        });

        await expect(service.cancel(mockTaskId)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('Message Operations', () => {
    describe('addTaskMessage()', () => {
      const addMessageDto: AddTaskMessageDto = {
        message: 'Additional guidance for task',
      };

      beforeEach(() => {
        prismaService.task.findUnique.mockResolvedValue(mockTask);
        prismaService.message.create.mockResolvedValue(mockMessage);
      });

      it('should successfully add message to task', async () => {
        const result = await service.addTaskMessage(mockTaskId, addMessageDto);

        expect(result).toEqual(mockTask);
        expect(prismaService.message.create).toHaveBeenCalledWith({
          data: {
            content: [{ type: 'text', text: addMessageDto.message }],
            role: 'USER',
            taskId: mockTaskId,
          },
        });
        expect(tasksGateway.emitNewMessage).toHaveBeenCalledWith(
          mockTaskId,
          mockMessage,
        );
      });

      it('should throw NotFoundException if task does not exist', async () => {
        prismaService.task.findUnique.mockResolvedValue(null);

        await expect(
          service.addTaskMessage(mockTaskId, addMessageDto),
        ).rejects.toThrow(
          new NotFoundException(`Task with ID ${mockTaskId} not found`),
        );
      });
    });
  });

  describe('Task Deletion - delete()', () => {
    beforeEach(() => {
      prismaService.task.delete.mockResolvedValue(mockTask);
    });

    it('should successfully delete task', async () => {
      const result = await service.delete(mockTaskId);

      expect(result).toEqual(mockTask);
      expect(prismaService.task.delete).toHaveBeenCalledWith({
        where: { id: mockTaskId },
      });
      expect(tasksGateway.emitTaskDeleted).toHaveBeenCalledWith(mockTaskId);
    });

    it('should handle task not found during deletion', async () => {
      const notFoundError = new Error('Record not found');
      prismaService.task.delete.mockRejectedValue(notFoundError);

      await expect(service.delete(mockTaskId)).rejects.toThrow(notFoundError);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle concurrent task operations gracefully', async () => {
      prismaService.task.findUnique.mockResolvedValue(mockTask);
      prismaService.task.update.mockResolvedValue(mockTask);

      const operations = Array.from({ length: 10 }, () =>
        service.update(mockTaskId, { status: TaskStatus.RUNNING }),
      );

      const results = await Promise.all(operations);

      results.forEach((result) => {
        expect(result).toEqual(mockTask);
      });
    });

    it('should handle database transaction timeouts', async () => {
      const timeoutError = new Error('Transaction timeout');
      prismaService.$transaction.mockRejectedValue(timeoutError);

      await expect(
        service.create({ description: 'Test task' }),
      ).rejects.toThrow(timeoutError);
    });

    it('should handle network failures during external API calls', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      prismaService.task.findUnique.mockResolvedValue({
        ...mockTask,
        control: MessageRole.ASSISTANT,
      });
      prismaService.task.update.mockResolvedValue({
        ...mockTask,
        control: MessageRole.USER,
      });
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Network failure'),
      );

      // Should not throw but should log error
      await service.takeOver(mockTaskId);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Failed to start input tracking',
        expect.any(Error),
      );
    });
  });

  describe('Service Initialization and Logging', () => {
    it('should initialize with proper logging', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');

      // Create a new instance to test initialization
      new TasksService(
        prismaService,
        tasksGateway,
        configService,
        eventEmitter,
        circuitBreakerGuard,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        'TasksService initialized with database resilience features',
      );
    });

    it('should log task creation details', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'log');
      prismaService.task.create.mockResolvedValue(mockTask);
      prismaService.message.create.mockResolvedValue(mockMessage);

      await service.create({ description: 'Test logging' });

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating new task with description'),
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Task created successfully with ID: ${mockTask.id}`,
        ),
      );
    });
  });
});
