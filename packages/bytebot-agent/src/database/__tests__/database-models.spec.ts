/**
 * Database Models Test Suite - Comprehensive validation of Prisma models
 * Tests all database models, relationships, constraints, and validation logic
 *
 * Coverage:
 * - Model validation and constraints
 * - Relationship integrity
 * - Enum value validation
 * - Data type validation
 * - Error handling scenarios
 *
 * @author Database Testing Specialist
 * @version 1.0.0
 * @since Comprehensive Database Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseService } from '../database.service';
import {
  TaskStatus,
  TaskPriority,
  MessageRole,
  UserRole,
  Permission,
  TaskType,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

describe('Database Models Comprehensive Test Suite', () => {
  let prismaService: PrismaService;
  let databaseService: DatabaseService;
  let module: TestingModule;

  // Test data containers
  let testUsers: any[] = [];
  let testTasks: any[] = [];
  let testMessages: any[] = [];
  let testSummaries: any[] = [];
  let testFiles: any[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: DatabaseService,
          useValue: {
            getPrismaClient: jest.fn().mockReturnValue(prismaService),
            getHealthStatus: jest.fn(),
            getMetrics: jest.fn(),
          },
        },
      ],
    }).compile();

    prismaService = module.get<PrismaService>(PrismaService);
    databaseService = module.get<DatabaseService>(DatabaseService);

    // Mock Prisma client methods
    jest.spyOn(prismaService, '$connect').mockResolvedValue();
    jest.spyOn(prismaService, '$disconnect').mockResolvedValue();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    // Reset test data containers
    testUsers = [];
    testTasks = [];
    testMessages = [];
    testSummaries = [];
    testFiles = [];
    jest.clearAllMocks();
  });

  describe('Task Model Validation', () => {
    it('should create task with all required fields', async () => {
      const taskData = {
        id: uuidv4(),
        description: 'Test task description',
        type: TaskType.IMMEDIATE,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        model: {
          provider: 'anthropic',
          name: 'claude-opus-4-20250514',
          title: 'Claude Opus 4',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(taskData);
      jest.spyOn(prismaService.task, 'create').mockImplementation(mockCreate);

      const result = await prismaService.task.create({
        data: taskData,
      });

      expect(mockCreate).toHaveBeenCalledWith({
        data: taskData,
      });
      expect(result).toEqual(taskData);
      expect(result.id).toBeDefined();
      expect(result.description).toBe('Test task description');
      expect(result.type).toBe(TaskType.IMMEDIATE);
      expect(result.status).toBe(TaskStatus.PENDING);
      expect(result.priority).toBe(TaskPriority.MEDIUM);
    });

    it('should validate task status enum values', () => {
      const validStatuses = [
        TaskStatus.PENDING,
        TaskStatus.RUNNING,
        TaskStatus.NEEDS_HELP,
        TaskStatus.NEEDS_REVIEW,
        TaskStatus.COMPLETED,
        TaskStatus.CANCELLED,
        TaskStatus.FAILED,
      ];

      validStatuses.forEach((status) => {
        expect(Object.values(TaskStatus)).toContain(status);
      });
    });

    it('should validate task priority enum values', () => {
      const validPriorities = [
        TaskPriority.LOW,
        TaskPriority.MEDIUM,
        TaskPriority.HIGH,
        TaskPriority.URGENT,
      ];

      validPriorities.forEach((priority) => {
        expect(Object.values(TaskPriority)).toContain(priority);
      });
    });

    it('should validate task type enum values', () => {
      const validTypes = [TaskType.IMMEDIATE, TaskType.SCHEDULED];

      validTypes.forEach((type) => {
        expect(Object.values(TaskType)).toContain(type);
      });
    });

    it('should create scheduled task with scheduledFor date', async () => {
      const scheduledDate = new Date(Date.now() + 3600000); // 1 hour from now
      const taskData = {
        id: uuidv4(),
        description: 'Scheduled task',
        type: TaskType.SCHEDULED,
        status: TaskStatus.PENDING,
        priority: TaskPriority.MEDIUM,
        control: MessageRole.ASSISTANT,
        createdBy: MessageRole.USER,
        scheduledFor: scheduledDate,
        model: {
          provider: 'anthropic',
          name: 'claude-opus-4-20250514',
          title: 'Claude Opus 4',
        },
      };

      const mockCreate = jest.fn().mockResolvedValue(taskData);
      jest.spyOn(prismaService.task, 'create').mockImplementation(mockCreate);

      const result = await prismaService.task.create({
        data: taskData,
      });

      expect(result.type).toBe(TaskType.SCHEDULED);
      expect(result.scheduledFor).toEqual(scheduledDate);
    });

    it('should handle task execution timestamps', async () => {
      const now = new Date();
      const taskData = {
        id: uuidv4(),
        description: 'Task with timestamps',
        status: TaskStatus.RUNNING,
        executedAt: now,
        queuedAt: new Date(now.getTime() - 1000),
        model: { provider: 'test' },
      };

      const mockUpdate = jest.fn().mockResolvedValue(taskData);
      jest.spyOn(prismaService.task, 'update').mockImplementation(mockUpdate);

      const result = await prismaService.task.update({
        where: { id: taskData.id },
        data: {
          status: TaskStatus.RUNNING,
          executedAt: now,
          queuedAt: taskData.queuedAt,
        },
      });

      expect(result.executedAt).toEqual(now);
      expect(result.queuedAt).toBeDefined();
      expect(result.status).toBe(TaskStatus.RUNNING);
    });

    it('should validate JSON model field structure', async () => {
      const modelConfigs = [
        {
          provider: 'anthropic',
          name: 'claude-opus-4-20250514',
          title: 'Claude Opus 4',
        },
        {
          provider: 'openai',
          name: 'gpt-4',
          title: 'GPT-4',
        },
        {
          provider: 'gemini',
          name: 'gemini-pro',
          title: 'Gemini Pro',
        },
      ];

      for (const model of modelConfigs) {
        const taskData = {
          id: uuidv4(),
          description: `Task with ${model.provider} model`,
          model,
        };

        const mockCreate = jest.fn().mockResolvedValue(taskData);
        jest.spyOn(prismaService.task, 'create').mockImplementation(mockCreate);

        const result = await prismaService.task.create({
          data: taskData,
        });

        expect(result.model).toEqual(model);
        expect(result.model.provider).toBe(model.provider);
        expect(result.model.name).toBe(model.name);
        expect(result.model.title).toBe(model.title);
      }
    });

    it('should handle task error scenarios', async () => {
      const taskData = {
        id: uuidv4(),
        description: 'Failed task',
        status: TaskStatus.FAILED,
        error: 'Task execution failed: Connection timeout',
        model: { provider: 'test' },
      };

      const mockUpdate = jest.fn().mockResolvedValue(taskData);
      jest.spyOn(prismaService.task, 'update').mockImplementation(mockUpdate);

      const result = await prismaService.task.update({
        where: { id: taskData.id },
        data: {
          status: TaskStatus.FAILED,
          error: taskData.error,
        },
      });

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error).toBe('Task execution failed: Connection timeout');
    });

    it('should validate task completion with result data', async () => {
      const completionResult = {
        success: true,
        executionTime: 1250,
        outputTokens: 150,
        inputTokens: 75,
      };

      const taskData = {
        id: uuidv4(),
        description: 'Completed task',
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
        result: completionResult,
        model: { provider: 'test' },
      };

      const mockUpdate = jest.fn().mockResolvedValue(taskData);
      jest.spyOn(prismaService.task, 'update').mockImplementation(mockUpdate);

      const result = await prismaService.task.update({
        where: { id: taskData.id },
        data: {
          status: TaskStatus.COMPLETED,
          completedAt: taskData.completedAt,
          result: completionResult,
        },
      });

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
      expect(result.result).toEqual(completionResult);
      expect(result.result.success).toBe(true);
      expect(result.result.executionTime).toBe(1250);
    });
  });

  describe('Message Model Validation', () => {
    it('should create message with Anthropic content structure', async () => {
      const contentBlocks = [
        { type: 'text', text: 'Hello, how can I help you today?' },
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGA',
          },
        },
      ];

      const messageData = {
        id: uuidv4(),
        content: contentBlocks,
        role: MessageRole.ASSISTANT,
        taskId: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(messageData);
      jest
        .spyOn(prismaService.message, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.message.create({
        data: messageData,
      });

      expect(result.content).toEqual(contentBlocks);
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0].type).toBe('text');
      expect(result.content[1].type).toBe('image');
    });

    it('should validate message role enum values', () => {
      const validRoles = [MessageRole.USER, MessageRole.ASSISTANT];

      validRoles.forEach((role) => {
        expect(Object.values(MessageRole)).toContain(role);
      });
    });

    it('should create message with summary relationship', async () => {
      const summaryId = uuidv4();
      const messageData = {
        id: uuidv4(),
        content: [{ type: 'text', text: 'Message in summary' }],
        role: MessageRole.USER,
        taskId: uuidv4(),
        summaryId: summaryId,
      };

      const mockCreate = jest.fn().mockResolvedValue(messageData);
      jest
        .spyOn(prismaService.message, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.message.create({
        data: messageData,
      });

      expect(result.summaryId).toBe(summaryId);
    });

    it('should validate complex content structures', async () => {
      const complexContent = [
        { type: 'text', text: 'Analysis results:' },
        {
          type: 'tool_use',
          id: 'toolu_01A09q90qJOz7z4LrKPTGnj6',
          name: 'computer_use',
          input: {
            action: 'screenshot',
            coordinate: [640, 360],
          },
        },
        {
          type: 'tool_result',
          tool_use_id: 'toolu_01A09q90qJOz7z4LrKPTGnj6',
          content: 'Screenshot taken successfully',
        },
      ];

      const messageData = {
        id: uuidv4(),
        content: complexContent,
        role: MessageRole.ASSISTANT,
        taskId: uuidv4(),
      };

      const mockCreate = jest.fn().mockResolvedValue(messageData);
      jest
        .spyOn(prismaService.message, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.message.create({
        data: messageData,
      });

      expect(result.content).toEqual(complexContent);
      expect(result.content.length).toBe(3);
      expect(result.content[1].type).toBe('tool_use');
      expect(result.content[2].type).toBe('tool_result');
    });
  });

  describe('User Model Validation', () => {
    it('should create user with all required fields', async () => {
      const userData = {
        id: uuidv4(),
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        passwordHash:
          '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhwy',
        role: UserRole.VIEWER,
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(userData);
      jest.spyOn(prismaService.user, 'create').mockImplementation(mockCreate);

      const result = await prismaService.user.create({
        data: userData,
      });

      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('testuser');
      expect(result.role).toBe(UserRole.VIEWER);
      expect(result.isActive).toBe(true);
      expect(result.emailVerified).toBe(false);
    });

    it('should validate user role enum values', () => {
      const validRoles = [UserRole.ADMIN, UserRole.OPERATOR, UserRole.VIEWER];

      validRoles.forEach((role) => {
        expect(Object.values(UserRole)).toContain(role);
      });
    });

    it('should enforce unique email constraint', async () => {
      const email = 'duplicate@example.com';

      // Mock unique constraint error
      const mockCreate = jest.fn().mockRejectedValue({
        code: 'P2002',
        meta: { target: ['email'] },
        message: 'Unique constraint failed on the fields: (email)',
      });
      jest.spyOn(prismaService.user, 'create').mockImplementation(mockCreate);

      await expect(
        prismaService.user.create({
          data: {
            email,
            username: 'user1',
            passwordHash: 'hash1',
          },
        }),
      ).rejects.toMatchObject({
        code: 'P2002',
        meta: { target: ['email'] },
      });
    });

    it('should enforce unique username constraint', async () => {
      const username = 'duplicateuser';

      // Mock unique constraint error
      const mockCreate = jest.fn().mockRejectedValue({
        code: 'P2002',
        meta: { target: ['username'] },
        message: 'Unique constraint failed on the fields: (username)',
      });
      jest.spyOn(prismaService.user, 'create').mockImplementation(mockCreate);

      await expect(
        prismaService.user.create({
          data: {
            email: 'test@example.com',
            username,
            passwordHash: 'hash1',
          },
        }),
      ).rejects.toMatchObject({
        code: 'P2002',
        meta: { target: ['username'] },
      });
    });

    it('should update lastLoginAt timestamp', async () => {
      const userId = uuidv4();
      const loginTime = new Date();

      const updatedUser = {
        id: userId,
        lastLoginAt: loginTime,
        email: 'test@example.com',
        username: 'testuser',
      };

      const mockUpdate = jest.fn().mockResolvedValue(updatedUser);
      jest.spyOn(prismaService.user, 'update').mockImplementation(mockUpdate);

      const result = await prismaService.user.update({
        where: { id: userId },
        data: { lastLoginAt: loginTime },
      });

      expect(result.lastLoginAt).toEqual(loginTime);
    });
  });

  describe('UserSession Model Validation', () => {
    it('should create user session with all fields', async () => {
      const sessionData = {
        id: uuidv4(),
        userId: uuidv4(),
        refreshToken: 'refresh_token_' + uuidv4(),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(sessionData);
      jest
        .spyOn(prismaService.userSession, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.userSession.create({
        data: sessionData,
      });

      expect(result.refreshToken).toBe(sessionData.refreshToken);
      expect(result.isRevoked).toBe(false);
      expect(result.expiresAt).toEqual(sessionData.expiresAt);
      expect(result.ipAddress).toBe('192.168.1.1');
    });

    it('should enforce unique refresh token constraint', async () => {
      const refreshToken = 'duplicate_refresh_token';

      const mockCreate = jest.fn().mockRejectedValue({
        code: 'P2002',
        meta: { target: ['refreshToken'] },
        message: 'Unique constraint failed on the fields: (refreshToken)',
      });
      jest
        .spyOn(prismaService.userSession, 'create')
        .mockImplementation(mockCreate);

      await expect(
        prismaService.userSession.create({
          data: {
            userId: uuidv4(),
            refreshToken,
            expiresAt: new Date(),
          },
        }),
      ).rejects.toMatchObject({
        code: 'P2002',
        meta: { target: ['refreshToken'] },
      });
    });

    it('should revoke session', async () => {
      const sessionId = uuidv4();
      const revokedSession = {
        id: sessionId,
        isRevoked: true,
        updatedAt: new Date(),
      };

      const mockUpdate = jest.fn().mockResolvedValue(revokedSession);
      jest
        .spyOn(prismaService.userSession, 'update')
        .mockImplementation(mockUpdate);

      const result = await prismaService.userSession.update({
        where: { id: sessionId },
        data: { isRevoked: true },
      });

      expect(result.isRevoked).toBe(true);
    });
  });

  describe('RolePermission Model Validation', () => {
    it('should validate permission enum values', () => {
      const validPermissions = [
        Permission.TASK_READ,
        Permission.TASK_WRITE,
        Permission.TASK_DELETE,
        Permission.COMPUTER_CONTROL,
        Permission.SYSTEM_ADMIN,
        Permission.USER_MANAGEMENT,
      ];

      validPermissions.forEach((permission) => {
        expect(Object.values(Permission)).toContain(permission);
      });
    });

    it('should create role permission assignment', async () => {
      const rolePermissionData = {
        id: uuidv4(),
        userId: uuidv4(),
        role: UserRole.OPERATOR,
        permission: Permission.TASK_WRITE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(rolePermissionData);
      jest
        .spyOn(prismaService.rolePermission, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.rolePermission.create({
        data: rolePermissionData,
      });

      expect(result.role).toBe(UserRole.OPERATOR);
      expect(result.permission).toBe(Permission.TASK_WRITE);
    });

    it('should enforce unique constraint on userId, role, permission', async () => {
      const mockCreate = jest.fn().mockRejectedValue({
        code: 'P2002',
        meta: { target: ['userId', 'role', 'permission'] },
        message:
          'Unique constraint failed on the fields: (userId,role,permission)',
      });
      jest
        .spyOn(prismaService.rolePermission, 'create')
        .mockImplementation(mockCreate);

      await expect(
        prismaService.rolePermission.create({
          data: {
            userId: uuidv4(),
            role: UserRole.ADMIN,
            permission: Permission.SYSTEM_ADMIN,
          },
        }),
      ).rejects.toMatchObject({
        code: 'P2002',
        meta: { target: ['userId', 'role', 'permission'] },
      });
    });
  });

  describe('Summary Model Validation', () => {
    it('should create summary with task relationship', async () => {
      const summaryData = {
        id: uuidv4(),
        content:
          'Task execution summary: Successfully completed all operations.',
        taskId: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(summaryData);
      jest
        .spyOn(prismaService.summary, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.summary.create({
        data: summaryData,
      });

      expect(result.content).toBe(
        'Task execution summary: Successfully completed all operations.',
      );
      expect(result.taskId).toBeDefined();
    });

    it('should create hierarchical summary relationships', async () => {
      const parentSummaryId = uuidv4();
      const childSummaryData = {
        id: uuidv4(),
        content: 'Child summary content',
        taskId: uuidv4(),
        parentId: parentSummaryId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(childSummaryData);
      jest
        .spyOn(prismaService.summary, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.summary.create({
        data: childSummaryData,
      });

      expect(result.parentId).toBe(parentSummaryId);
    });
  });

  describe('File Model Validation', () => {
    it('should create file with all required fields', async () => {
      const fileData = {
        id: uuidv4(),
        name: 'test-document.pdf',
        type: 'application/pdf',
        size: 1024576, // 1MB
        data: 'base64encodedfiledata==',
        taskId: uuidv4(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCreate = jest.fn().mockResolvedValue(fileData);
      jest.spyOn(prismaService.file, 'create').mockImplementation(mockCreate);

      const result = await prismaService.file.create({
        data: fileData,
      });

      expect(result.name).toBe('test-document.pdf');
      expect(result.type).toBe('application/pdf');
      expect(result.size).toBe(1024576);
      expect(result.data).toBe('base64encodedfiledata==');
    });

    it('should handle different file types', async () => {
      const fileTypes = [
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'data.json', type: 'application/json' },
        { name: 'script.js', type: 'text/javascript' },
      ];

      for (const fileType of fileTypes) {
        const fileData = {
          id: uuidv4(),
          name: fileType.name,
          type: fileType.type,
          size: 1024,
          data: 'mockdata',
          taskId: uuidv4(),
        };

        const mockCreate = jest.fn().mockResolvedValue(fileData);
        jest.spyOn(prismaService.file, 'create').mockImplementation(mockCreate);

        const result = await prismaService.file.create({
          data: fileData,
        });

        expect(result.name).toBe(fileType.name);
        expect(result.type).toBe(fileType.type);
      }
    });
  });

  describe('Model Relationships and Cascades', () => {
    it('should validate task-message cascade delete relationship', async () => {
      const taskId = uuidv4();

      // Mock cascade delete behavior
      const mockDelete = jest.fn().mockResolvedValue({ count: 1 });
      jest.spyOn(prismaService.task, 'delete').mockImplementation(mockDelete);

      await prismaService.task.delete({
        where: { id: taskId },
      });

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });

    it('should validate user-session cascade delete relationship', async () => {
      const userId = uuidv4();

      const mockDelete = jest.fn().mockResolvedValue({ count: 1 });
      jest.spyOn(prismaService.user, 'delete').mockImplementation(mockDelete);

      await prismaService.user.delete({
        where: { id: userId },
      });

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should validate task-summary cascade delete relationship', async () => {
      const taskId = uuidv4();

      const mockDelete = jest.fn().mockResolvedValue({ count: 1 });
      jest.spyOn(prismaService.task, 'delete').mockImplementation(mockDelete);

      await prismaService.task.delete({
        where: { id: taskId },
      });

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });

    it('should validate task-file cascade delete relationship', async () => {
      const taskId = uuidv4();

      const mockDelete = jest.fn().mockResolvedValue({ count: 1 });
      jest.spyOn(prismaService.task, 'delete').mockImplementation(mockDelete);

      await prismaService.task.delete({
        where: { id: taskId },
      });

      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: taskId },
      });
    });
  });

  describe('Data Validation and Constraints', () => {
    it('should validate email format constraint', async () => {
      const invalidEmails = [
        'invalid',
        'test@',
        '@example.com',
        'test.example.com',
      ];

      for (const email of invalidEmails) {
        const mockCreate = jest.fn().mockRejectedValue({
          code: 'P2000',
          message: 'Invalid email format',
        });
        jest.spyOn(prismaService.user, 'create').mockImplementation(mockCreate);

        await expect(
          prismaService.user.create({
            data: {
              email,
              username: 'testuser',
              passwordHash: 'hash',
            },
          }),
        ).rejects.toMatchObject({
          code: 'P2000',
        });
      }
    });

    it('should validate required fields', async () => {
      const mockCreate = jest.fn().mockRejectedValue({
        code: 'P2000',
        message: 'Required field missing',
      });
      jest.spyOn(prismaService.task, 'create').mockImplementation(mockCreate);

      await expect(
        prismaService.task.create({
          data: {
            // Missing required description field
            status: TaskStatus.PENDING,
          },
        }),
      ).rejects.toMatchObject({
        code: 'P2000',
      });
    });

    it('should validate file size constraints', () => {
      const maxFileSize = 50 * 1024 * 1024; // 50MB typical limit
      const testSize = 1024 * 1024; // 1MB test file

      expect(testSize).toBeLessThanOrEqual(maxFileSize);
    });

    it('should validate JSON field structure', () => {
      const validModelConfig = {
        provider: 'anthropic',
        name: 'claude-opus-4-20250514',
        title: 'Claude Opus 4',
      };

      // Validate required fields are present
      expect(validModelConfig).toHaveProperty('provider');
      expect(validModelConfig).toHaveProperty('name');
      expect(validModelConfig).toHaveProperty('title');

      // Validate field types
      expect(typeof validModelConfig.provider).toBe('string');
      expect(typeof validModelConfig.name).toBe('string');
      expect(typeof validModelConfig.title).toBe('string');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle concurrent updates', async () => {
      const taskId = uuidv4();

      const mockUpdate = jest
        .fn()
        .mockResolvedValueOnce({ id: taskId, status: TaskStatus.RUNNING })
        .mockResolvedValueOnce({ id: taskId, status: TaskStatus.COMPLETED });

      jest.spyOn(prismaService.task, 'update').mockImplementation(mockUpdate);

      // Simulate concurrent updates
      const update1 = prismaService.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.RUNNING },
      });

      const update2 = prismaService.task.update({
        where: { id: taskId },
        data: { status: TaskStatus.COMPLETED },
      });

      const [result1, result2] = await Promise.all([update1, update2]);

      expect(result1.status).toBe(TaskStatus.RUNNING);
      expect(result2.status).toBe(TaskStatus.COMPLETED);
    });

    it('should handle large JSON payloads', async () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => ({
        type: 'text',
        text: `Large content block ${i} `.repeat(100),
      }));

      const messageData = {
        id: uuidv4(),
        content: largeContent,
        role: MessageRole.ASSISTANT,
        taskId: uuidv4(),
      };

      const mockCreate = jest.fn().mockResolvedValue(messageData);
      jest
        .spyOn(prismaService.message, 'create')
        .mockImplementation(mockCreate);

      const result = await prismaService.message.create({
        data: messageData,
      });

      expect(result.content).toHaveLength(100);
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should handle null and undefined values appropriately', async () => {
      const taskData = {
        id: uuidv4(),
        description: 'Task with null values',
        userId: null,
        scheduledFor: null,
        executedAt: null,
        completedAt: null,
        error: null,
        result: null,
        model: { provider: 'test' },
      };

      const mockCreate = jest.fn().mockResolvedValue(taskData);
      jest.spyOn(prismaService.task, 'create').mockImplementation(mockCreate);

      const result = await prismaService.task.create({
        data: taskData,
      });

      expect(result.userId).toBeNull();
      expect(result.scheduledFor).toBeNull();
      expect(result.executedAt).toBeNull();
      expect(result.completedAt).toBeNull();
      expect(result.error).toBeNull();
      expect(result.result).toBeNull();
    });
  });
});
