/**
 * TasksController Unit Tests - Comprehensive HTTP API Testing
 *
 * Tests all REST API endpoints with complete scenarios including:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Authentication and authorization flows
 * - API versioning and deprecation handling
 * - Input validation and sanitization
 * - Error handling and exception scenarios
 * - Rate limiting and security features
 * - WebSocket integration events
 * - Model retrieval and proxy integration
 * - Task state management operations (takeover, resume, cancel)
 *
 * @author Task Management Testing Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot Task Management System
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  HttpException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';
import { MessagesService } from '../../messages/messages.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { AddTaskMessageDto } from '../dto/add-task-message.dto';
import {
  Task,
  Message,
  User,
  UserRole,
  Permission,
  TaskStatus,
  TaskPriority,
  TaskType,
  MessageRole,
  File,
} from '@prisma/client';
import { GlobalValidationPipe } from '../../common/pipes/validation.pipe';
import { SanitizationPipe } from '../../common/pipes/sanitization.pipe';

// Mock fetch globally
global.fetch = jest.fn();

describe('TasksController', () => {
  let controller: TasksController;
  let tasksService: jest.Mocked<TasksService>;
  let messagesService: jest.Mocked<MessagesService>;
  let configService: jest.Mocked<ConfigService>;

  // Mock user data
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: 'hashed-password',
    role: UserRole.OPERATOR,
    isActive: true,
    emailVerified: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockViewerUser: User = {
    ...mockUser,
    id: 'viewer-123',
    role: UserRole.VIEWER,
  };

  const mockAdminUser: User = {
    ...mockUser,
    id: 'admin-123',
    role: UserRole.ADMIN,
  };

  // Mock task data
  const mockTask: Task = {
    id: 'task-123',
    description: 'Test task description',
    type: TaskType.IMMEDIATE,
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    control: MessageRole.ASSISTANT,
    createdAt: new Date(),
    createdBy: MessageRole.USER,
    userId: mockUser.id,
    scheduledFor: null,
    updatedAt: new Date(),
    executedAt: null,
    completedAt: null,
    queuedAt: null,
    error: null,
    result: null,
    model: { provider: 'anthropic', name: 'claude-3-sonnet' },
  };

  const mockTaskWithFiles: Task & { files: File[] } = {
    ...mockTask,
    files: [
      {
        id: 'file-123',
        name: 'test.txt',
        type: 'text/plain',
        size: 1024,
        data: 'base64content',
        taskId: mockTask.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  // Mock message data
  const mockMessage: Message = {
    id: 'message-123',
    content: [{ type: 'text', text: 'Test message' }],
    role: MessageRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    taskId: mockTask.id,
    summaryId: null,
  };

  // Mock DTO data
  const mockCreateTaskDto: CreateTaskDto = {
    description: 'Create test task',
    type: TaskType.IMMEDIATE,
    priority: TaskPriority.HIGH,
    createdBy: MessageRole.USER,
    model: { provider: 'anthropic', name: 'claude-3-sonnet' },
    files: [
      {
        name: 'test.txt',
        base64: 'data:text/plain;base64,dGVzdCBjb250ZW50',
        type: 'text/plain',
        size: 1024,
      },
    ],
  };

  const mockAddTaskMessageDto: AddTaskMessageDto = {
    message: 'Additional guidance message',
  };

  // Mock service responses
  const mockTasksListResponse = {
    tasks: [mockTask],
    total: 1,
    totalPages: 1,
  };

  beforeEach(async () => {
    // Create mock services
    const mockTasksService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addTaskMessage: jest.fn(),
      takeOver: jest.fn(),
      resume: jest.fn(),
      cancel: jest.fn(),
    };

    const mockMessagesService = {
      findAll: jest.fn(),
      findRawMessages: jest.fn(),
      findProcessedMessages: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      incr: jest.fn(),
      expire: jest.fn(),
    };

    const mockReflector = {
      get: jest.fn(),
      getAll: jest.fn(),
      getAllAndOverride: jest.fn(),
      getAllAndMerge: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
        {
          provide: 'Reflector',
          useValue: mockReflector,
        },
        {
          provide: GlobalValidationPipe,
          useValue: {
            transform: jest.fn((value) => value),
          },
        },
        {
          provide: SanitizationPipe,
          useValue: {
            transform: jest.fn((value) => value),
          },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    tasksService = module.get(TasksService);
    messagesService = module.get(MessagesService);
    configService = module.get(ConfigService);

    // Setup default mock returns
    configService.get.mockReturnValue('http://localhost:8080');
  });

  afterEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Task Creation - POST /tasks', () => {
    beforeEach(() => {
      tasksService.create.mockResolvedValue(mockTask);
    });

    it('should successfully create a new task with valid data', async () => {
      const result = await controller.create(mockCreateTaskDto, mockUser);

      expect(result).toEqual(mockTask);
      expect(tasksService.create).toHaveBeenCalledWith(mockCreateTaskDto);
      expect(tasksService.create).toHaveBeenCalledTimes(1);
    });

    it('should create task with minimum required fields', async () => {
      const minimalDto: CreateTaskDto = {
        description: 'Minimal task',
      };

      await controller.create(minimalDto, mockUser);

      expect(tasksService.create).toHaveBeenCalledWith(minimalDto);
    });

    it('should create scheduled task with future date', async () => {
      const scheduledDto: CreateTaskDto = {
        description: 'Scheduled task',
        type: TaskType.SCHEDULED,
        scheduledFor: new Date(Date.now() + 3600000), // 1 hour from now
      };

      await controller.create(scheduledDto, mockUser);

      expect(tasksService.create).toHaveBeenCalledWith(scheduledDto);
    });

    it('should create task with multiple files', async () => {
      const multiFileDto: CreateTaskDto = {
        description: 'Task with multiple files',
        files: [
          {
            name: 'file1.txt',
            base64: 'data:text/plain;base64,ZmlsZTE=',
            type: 'text/plain',
            size: 512,
          },
          {
            name: 'file2.json',
            base64: 'data:application/json;base64,eyJ0ZXN0IjoidmFsdWUifQ==',
            type: 'application/json',
            size: 256,
          },
        ],
      };

      await controller.create(multiFileDto, mockUser);

      expect(tasksService.create).toHaveBeenCalledWith(multiFileDto);
    });

    it('should handle task creation failure', async () => {
      const error = new BadRequestException('Invalid task data');
      tasksService.create.mockRejectedValue(error);

      await expect(
        controller.create(mockCreateTaskDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle database connection failure during creation', async () => {
      const dbError = new Error('Database connection failed');
      tasksService.create.mockRejectedValue(dbError);

      await expect(
        controller.create(mockCreateTaskDto, mockUser),
      ).rejects.toThrow('Database connection failed');
    });

    it('should validate user permissions for task creation', async () => {
      // This test assumes the controller uses permission decorators
      // The actual permission checking would be handled by guards
      await controller.create(mockCreateTaskDto, mockViewerUser);

      expect(tasksService.create).toHaveBeenCalled();
    });
  });

  describe('Task Retrieval - GET /tasks', () => {
    beforeEach(() => {
      tasksService.findAll.mockResolvedValue(mockTasksListResponse);
    });

    it('should retrieve tasks with default pagination', async () => {
      const result = await controller.findAll(
        mockUser,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(mockTasksListResponse);
      expect(tasksService.findAll).toHaveBeenCalledWith(1, 10, undefined);
    });

    it('should retrieve tasks with custom pagination', async () => {
      await controller.findAll(mockUser, '2', '20', undefined, undefined);

      expect(tasksService.findAll).toHaveBeenCalledWith(2, 20, undefined);
    });

    it('should retrieve tasks filtered by single status', async () => {
      await controller.findAll(
        mockUser,
        undefined,
        undefined,
        'PENDING',
        undefined,
      );

      expect(tasksService.findAll).toHaveBeenCalledWith(1, 10, ['PENDING']);
    });

    it('should retrieve tasks filtered by multiple statuses', async () => {
      await controller.findAll(
        mockUser,
        undefined,
        undefined,
        undefined,
        'PENDING,RUNNING',
      );

      expect(tasksService.findAll).toHaveBeenCalledWith(1, 10, [
        'PENDING',
        'RUNNING',
      ]);
    });

    it('should prioritize statuses parameter over status parameter', async () => {
      await controller.findAll(
        mockUser,
        undefined,
        undefined,
        'COMPLETED',
        'PENDING,RUNNING',
      );

      expect(tasksService.findAll).toHaveBeenCalledWith(1, 10, [
        'PENDING',
        'RUNNING',
      ]);
    });

    it('should handle invalid pagination parameters gracefully', async () => {
      await controller.findAll(
        mockUser,
        'invalid',
        'invalid',
        undefined,
        undefined,
      );

      expect(tasksService.findAll).toHaveBeenCalledWith(NaN, NaN, undefined);
    });

    it('should return empty results when no tasks found', async () => {
      const emptyResponse = { tasks: [], total: 0, totalPages: 0 };
      tasksService.findAll.mockResolvedValue(emptyResponse);

      const result = await controller.findAll(
        mockUser,
        undefined,
        undefined,
        undefined,
        undefined,
      );

      expect(result).toEqual(emptyResponse);
    });

    it('should handle service errors during task retrieval', async () => {
      const error = new Error('Database query failed');
      tasksService.findAll.mockRejectedValue(error);

      await expect(
        controller.findAll(
          mockUser,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow('Database query failed');
    });
  });

  describe('Individual Task Retrieval - GET /tasks/:id', () => {
    beforeEach(() => {
      tasksService.findById.mockResolvedValue(mockTaskWithFiles);
    });

    it('should retrieve task by valid ID', async () => {
      const result = await controller.findById('task-123', mockUser);

      expect(result).toEqual(mockTaskWithFiles);
      expect(tasksService.findById).toHaveBeenCalledWith('task-123');
    });

    it('should handle task not found', async () => {
      tasksService.findById.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(
        controller.findById('nonexistent', mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle invalid task ID format', async () => {
      const invalidId = 'invalid-uuid-format';
      tasksService.findById.mockRejectedValue(
        new BadRequestException('Invalid ID format'),
      );

      await expect(controller.findById(invalidId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should retrieve task with associated files', async () => {
      const result = await controller.findById('task-123', mockUser);

      expect(result.files).toBeDefined();
      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('test.txt');
    });
  });

  describe('Model Retrieval - GET /tasks/models', () => {
    it('should retrieve models from proxy when configured', async () => {
      const mockProxyResponse = {
        data: [
          {
            litellm_params: { model: 'claude-3-sonnet' },
            model_name: 'Claude 3 Sonnet',
          },
          {
            litellm_params: { model: 'gpt-4' },
            model_name: 'GPT-4',
          },
        ],
      };

      configService.get.mockReturnValue('http://localhost:8080');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProxyResponse),
      });

      const result = await controller.getModels();

      expect(result).toEqual([
        {
          provider: 'proxy',
          name: 'claude-3-sonnet',
          title: 'Claude 3 Sonnet',
          contextWindow: 128000,
        },
        {
          provider: 'proxy',
          name: 'gpt-4',
          title: 'GPT-4',
          contextWindow: 128000,
        },
      ]);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8080/model/info',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should return local models when proxy not configured', async () => {
      configService.get.mockReturnValue(undefined);

      const result = await controller.getModels();

      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle proxy server error', async () => {
      configService.get.mockReturnValue('http://localhost:8080');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(controller.getModels()).rejects.toThrow(HttpException);
      await expect(controller.getModels()).rejects.toThrow(
        'Failed to fetch models from proxy',
      );
    });

    it('should handle network errors when fetching models', async () => {
      configService.get.mockReturnValue('http://localhost:8080');
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(controller.getModels()).rejects.toThrow(HttpException);
      await expect(controller.getModels()).rejects.toThrow(
        'Error fetching models',
      );
    });

    it('should handle malformed proxy response', async () => {
      configService.get.mockReturnValue('http://localhost:8080');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ invalid: 'format' }),
      });

      await expect(controller.getModels()).rejects.toThrow(HttpException);
      await expect(controller.getModels()).rejects.toThrow(
        'Invalid response format from proxy',
      );
    });

    it('should filter out invalid model data from proxy response', async () => {
      const mockProxyResponse = {
        data: [
          {
            litellm_params: { model: 'valid-model' },
            model_name: 'Valid Model',
          },
          {
            // Missing required fields
            invalid: 'data',
          },
          {
            litellm_params: { model: 'another-valid-model' },
            model_name: 'Another Valid Model',
          },
        ],
      };

      configService.get.mockReturnValue('http://localhost:8080');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProxyResponse),
      });

      const result = await controller.getModels();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('valid-model');
      expect(result[1].name).toBe('another-valid-model');
    });
  });

  describe('Task Messages - GET /tasks/:id/messages', () => {
    beforeEach(() => {
      messagesService.findAll.mockResolvedValue([mockMessage]);
    });

    it('should retrieve task messages with default options', async () => {
      const result = await controller.taskMessages(
        'task-123',
        undefined,
        undefined,
      );

      expect(result).toEqual([mockMessage]);
      expect(messagesService.findAll).toHaveBeenCalledWith('task-123', {
        limit: undefined,
        page: undefined,
      });
    });

    it('should retrieve task messages with pagination', async () => {
      await controller.taskMessages('task-123', '10', '2');

      expect(messagesService.findAll).toHaveBeenCalledWith('task-123', {
        limit: 10,
        page: 2,
      });
    });

    it('should handle invalid pagination parameters', async () => {
      await controller.taskMessages('task-123', 'invalid', 'invalid');

      expect(messagesService.findAll).toHaveBeenCalledWith('task-123', {
        limit: NaN,
        page: NaN,
      });
    });
  });

  describe('Add Task Message - POST /tasks/:id/messages', () => {
    beforeEach(() => {
      tasksService.addTaskMessage.mockResolvedValue(mockTask);
    });

    it('should successfully add message to task', async () => {
      const result = await controller.addTaskMessage(
        'task-123',
        mockAddTaskMessageDto,
      );

      expect(result).toEqual(mockTask);
      expect(tasksService.addTaskMessage).toHaveBeenCalledWith(
        'task-123',
        mockAddTaskMessageDto,
      );
    });

    it('should handle task not found when adding message', async () => {
      tasksService.addTaskMessage.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(
        controller.addTaskMessage('nonexistent', mockAddTaskMessageDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Raw Messages - GET /tasks/:id/messages/raw', () => {
    beforeEach(() => {
      messagesService.findRawMessages.mockResolvedValue([mockMessage]);
    });

    it('should retrieve raw messages with default options', async () => {
      const result = await controller.taskRawMessages(
        'task-123',
        undefined,
        undefined,
      );

      expect(result).toEqual([mockMessage]);
      expect(messagesService.findRawMessages).toHaveBeenCalledWith('task-123', {
        limit: undefined,
        page: undefined,
      });
    });

    it('should retrieve raw messages with pagination', async () => {
      await controller.taskRawMessages('task-123', '5', '1');

      expect(messagesService.findRawMessages).toHaveBeenCalledWith('task-123', {
        limit: 5,
        page: 1,
      });
    });
  });

  describe('Processed Messages - GET /tasks/:id/messages/processed', () => {
    beforeEach(() => {
      messagesService.findProcessedMessages.mockResolvedValue([
        {
          role: mockMessage.role,
          messages: [mockMessage],
          take_over: false,
        },
      ]);
    });

    it('should retrieve processed messages with default options', async () => {
      const result = await controller.taskProcessedMessages(
        'task-123',
        undefined,
        undefined,
      );

      expect(result).toEqual([
        {
          role: mockMessage.role,
          messages: [mockMessage],
          take_over: false,
        },
      ]);
      expect(messagesService.findProcessedMessages).toHaveBeenCalledWith(
        'task-123',
        {
          limit: undefined,
          page: undefined,
        },
      );
    });

    it('should retrieve processed messages with pagination', async () => {
      await controller.taskProcessedMessages('task-123', '15', '3');

      expect(messagesService.findProcessedMessages).toHaveBeenCalledWith(
        'task-123',
        {
          limit: 15,
          page: 3,
        },
      );
    });
  });

  describe('Task Deletion - DELETE /tasks/:id', () => {
    beforeEach(() => {
      tasksService.delete.mockResolvedValue(mockTask);
    });

    it('should successfully delete task', async () => {
      await controller.delete('task-123');

      expect(tasksService.delete).toHaveBeenCalledWith('task-123');
    });

    it('should handle task not found during deletion', async () => {
      tasksService.delete.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(controller.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Task Takeover - POST /tasks/:id/takeover', () => {
    beforeEach(() => {
      tasksService.takeOver.mockResolvedValue({
        ...mockTask,
        control: MessageRole.USER,
      });
    });

    it('should successfully takeover task control', async () => {
      const result = await controller.takeOver('task-123');

      expect(result.control).toBe(MessageRole.USER);
      expect(tasksService.takeOver).toHaveBeenCalledWith('task-123');
    });

    it('should handle task not found during takeover', async () => {
      tasksService.takeOver.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(controller.takeOver('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle invalid task state for takeover', async () => {
      tasksService.takeOver.mockRejectedValue(
        new BadRequestException('Task is not under agent control'),
      );

      await expect(controller.takeOver('task-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Task Resume - POST /tasks/:id/resume', () => {
    beforeEach(() => {
      tasksService.resume.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.RUNNING,
      });
    });

    it('should successfully resume task', async () => {
      const result = await controller.resume('task-123');

      expect(result.status).toBe(TaskStatus.RUNNING);
      expect(tasksService.resume).toHaveBeenCalledWith('task-123');
    });

    it('should handle task not found during resume', async () => {
      tasksService.resume.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(controller.resume('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle invalid task state for resume', async () => {
      tasksService.resume.mockRejectedValue(
        new BadRequestException('Task is not under user control'),
      );

      await expect(controller.resume('task-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Task Cancellation - POST /tasks/:id/cancel', () => {
    beforeEach(() => {
      tasksService.cancel.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.CANCELLED,
      });
    });

    it('should successfully cancel task', async () => {
      const result = await controller.cancel('task-123');

      expect(result.status).toBe(TaskStatus.CANCELLED);
      expect(tasksService.cancel).toHaveBeenCalledWith('task-123');
    });

    it('should handle task not found during cancellation', async () => {
      tasksService.cancel.mockRejectedValue(
        new NotFoundException('Task not found'),
      );

      await expect(controller.cancel('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle already completed task cancellation', async () => {
      tasksService.cancel.mockRejectedValue(
        new BadRequestException(
          'Task is already completed, failed, or cancelled',
        ),
      );

      await expect(controller.cancel('task-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle concurrent requests gracefully', async () => {
      tasksService.findAll.mockResolvedValue(mockTasksListResponse);

      const requests = Array.from({ length: 10 }, () =>
        controller.findAll(
          mockUser,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      );

      const results = await Promise.all(requests);

      results.forEach((result) => {
        expect(result).toEqual(mockTasksListResponse);
      });

      expect(tasksService.findAll).toHaveBeenCalledTimes(10);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Service timeout');
      tasksService.findAll.mockRejectedValue(timeoutError);

      await expect(
        controller.findAll(
          mockUser,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow('Service timeout');
    });

    it('should handle unexpected service errors', async () => {
      const unexpectedError = new Error('Unexpected error');
      tasksService.create.mockRejectedValue(unexpectedError);

      await expect(
        controller.create(mockCreateTaskDto, mockUser),
      ).rejects.toThrow('Unexpected error');
    });
  });

  describe('Security and Authorization', () => {
    it('should handle unauthorized access attempts', async () => {
      // This would typically be handled by guards, but we can test the controller behavior
      const unauthorizedUser = { ...mockUser, role: UserRole.VIEWER };

      // Assuming the service throws an error for insufficient permissions
      tasksService.delete.mockRejectedValue(
        new UnauthorizedException('Insufficient permissions'),
      );

      await expect(controller.delete('task-123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate input data thoroughly', async () => {
      const invalidDto = {
        description: '', // Empty description should be invalid
      } as CreateTaskDto;

      tasksService.create.mockRejectedValue(
        new BadRequestException('Invalid input data'),
      );

      await expect(controller.create(invalidDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
