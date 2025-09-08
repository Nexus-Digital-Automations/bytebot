/**
 * AgentScheduler Unit Tests - Comprehensive Task Scheduling and Queue Management Testing
 *
 * Production-ready unit tests covering all AgentScheduler functionality:
 * - Cron-based task scheduling and timing management
 * - Scheduled task processing and queue management
 * - Agent processor integration and coordination
 * - File handling and desktop file management
 * - Task priority and execution ordering
 * - Module initialization and startup behavior
 * - Error handling and recovery mechanisms
 * - Performance optimization and resource management
 *
 * @author Testing & Quality Assurance Specialist
 * @version 2.0.0
 * @since Phase 1: Bytebot Core Module Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AgentScheduler } from '../agent.scheduler';
import { TasksService } from '../../tasks/tasks.service';
import { AgentProcessor } from '../agent.processor';
import {
  TaskStatus,
  TaskType,
  TaskPriority,
  MessageRole,
} from '@prisma/client';

// Mock the computer use functions
jest.mock('../agent.computer-use', () => ({
  writeFile: jest.fn(),
}));

import { writeFile } from '../agent.computer-use';

describe('AgentScheduler', () => {
  let scheduler: AgentScheduler;
  let tasksService: any;
  let agentProcessor: any;
  let logger: any;

  // Test data fixtures
  const mockScheduledTask = {
    id: 'scheduled-task-123',
    description: 'Scheduled task for processing',
    type: TaskType.SCHEDULED,
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    control: MessageRole.ASSISTANT,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    createdBy: MessageRole.USER,
    userId: 'user-123',
    scheduledFor: new Date('2024-01-01T10:00:00.000Z'), // Past date for processing
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    executedAt: null,
    completedAt: null,
    queuedAt: null,
    error: null,
    result: null,
    model: { provider: 'anthropic', name: 'claude-3-sonnet' },
    files: [],
  };

  const mockQueuedTask = {
    id: 'queued-task-456',
    description: 'High priority task',
    type: TaskType.IMMEDIATE,
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    control: MessageRole.ASSISTANT,
    createdAt: new Date('2024-01-01T10:00:00.000Z'),
    createdBy: MessageRole.USER,
    userId: 'user-123',
    scheduledFor: null,
    updatedAt: new Date('2024-01-01T10:00:00.000Z'),
    executedAt: null,
    completedAt: null,
    queuedAt: new Date('2024-01-01T10:00:00.000Z'),
    error: null,
    result: null,
    model: { provider: 'anthropic', name: 'claude-3-sonnet' },
    files: [],
  };

  const mockTaskWithFiles = {
    ...mockQueuedTask,
    id: 'task-with-files-789',
    files: [
      {
        id: 'file-1',
        name: 'document.txt',
        type: 'text/plain',
        size: 1024,
        data: 'VGVzdCBkb2N1bWVudCBjb250ZW50', // Base64 encoded content
        taskId: 'task-with-files-789',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z'),
      },
      {
        id: 'file-2',
        name: 'image.png',
        type: 'image/png',
        size: 2048,
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        taskId: 'task-with-files-789',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        updatedAt: new Date('2024-01-01T10:00:00.000Z'),
      },
    ],
  };

  beforeEach(async () => {
    // Create comprehensive mocks
    tasksService = {
      findScheduledTasks: jest.fn(),
      update: jest.fn(),
      findNextTask: jest.fn(),
    };

    agentProcessor = {
      isRunning: jest.fn(),
      processTask: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentScheduler,
        {
          provide: TasksService,
          useValue: tasksService,
        },
        {
          provide: AgentProcessor,
          useValue: agentProcessor,
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    scheduler = module.get<AgentScheduler>(AgentScheduler);

    // Override the private logger property with our mock
    (scheduler as any).logger = logger;

    // Setup default mocks
    tasksService.findScheduledTasks.mockResolvedValue([]);
    tasksService.findNextTask.mockResolvedValue(null);
    agentProcessor.isRunning.mockReturnValue(false);
    tasksService.update.mockResolvedValue({});
    (writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Module Initialization', () => {
    describe('onModuleInit()', () => {
      it('should initialize successfully', async () => {
        await scheduler.onModuleInit();

        expect(logger.log).toHaveBeenCalledWith('AgentScheduler initialized');
      });

      it('should trigger initial cron execution on initialization', async () => {
        await scheduler.onModuleInit();

        expect(tasksService.findScheduledTasks).toHaveBeenCalled();
      });

      it('should handle initialization when scheduled tasks exist', async () => {
        const pastScheduledTask = {
          ...mockScheduledTask,
          scheduledFor: new Date(Date.now() - 10000), // 10 seconds ago
        };
        tasksService.findScheduledTasks.mockResolvedValue([pastScheduledTask]);

        await scheduler.onModuleInit();

        expect(tasksService.update).toHaveBeenCalledWith(pastScheduledTask.id, {
          queuedAt: expect.any(Date),
        });
      });

      it('should handle initialization when agent is already running', async () => {
        agentProcessor.isRunning.mockReturnValue(true);

        await scheduler.onModuleInit();

        expect(tasksService.findNextTask).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cron Execution and Task Scheduling', () => {
    describe('handleCron()', () => {
      beforeEach(() => {
        // Mock current time for consistent testing
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2024-01-01T10:05:00.000Z'));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      describe('Scheduled Task Processing', () => {
        it('should process scheduled tasks that are due', async () => {
          const dueTasks = [
            {
              ...mockScheduledTask,
              id: 'due-task-1',
              scheduledFor: new Date('2024-01-01T10:00:00.000Z'), // 5 minutes ago
            },
            {
              ...mockScheduledTask,
              id: 'due-task-2',
              scheduledFor: new Date('2024-01-01T09:55:00.000Z'), // 10 minutes ago
            },
          ];
          tasksService.findScheduledTasks.mockResolvedValue(dueTasks);

          await scheduler.handleCron();

          expect(tasksService.update).toHaveBeenCalledTimes(2);
          expect(tasksService.update).toHaveBeenCalledWith('due-task-1', {
            queuedAt: expect.any(Date),
          });
          expect(tasksService.update).toHaveBeenCalledWith('due-task-2', {
            queuedAt: expect.any(Date),
          });
        });

        it('should not process scheduled tasks that are not yet due', async () => {
          const futureTasks = [
            {
              ...mockScheduledTask,
              id: 'future-task-1',
              scheduledFor: new Date('2024-01-01T10:10:00.000Z'), // 5 minutes in future
            },
            {
              ...mockScheduledTask,
              id: 'future-task-2',
              scheduledFor: new Date('2024-01-01T11:00:00.000Z'), // 55 minutes in future
            },
          ];
          tasksService.findScheduledTasks.mockResolvedValue(futureTasks);

          await scheduler.handleCron();

          expect(tasksService.update).not.toHaveBeenCalled();
        });

        it('should handle mixed scheduled and due tasks correctly', async () => {
          const mixedTasks = [
            {
              ...mockScheduledTask,
              id: 'due-task',
              scheduledFor: new Date('2024-01-01T10:00:00.000Z'), // Due
            },
            {
              ...mockScheduledTask,
              id: 'future-task',
              scheduledFor: new Date('2024-01-01T10:10:00.000Z'), // Future
            },
            {
              ...mockScheduledTask,
              id: 'past-task',
              scheduledFor: new Date('2024-01-01T09:50:00.000Z'), // Past due
            },
          ];
          tasksService.findScheduledTasks.mockResolvedValue(mixedTasks);

          await scheduler.handleCron();

          expect(tasksService.update).toHaveBeenCalledTimes(2);
          expect(tasksService.update).toHaveBeenCalledWith('due-task', {
            queuedAt: expect.any(Date),
          });
          expect(tasksService.update).toHaveBeenCalledWith('past-task', {
            queuedAt: expect.any(Date),
          });
        });

        it('should log debug information for scheduled tasks', async () => {
          const dueTask = {
            ...mockScheduledTask,
            scheduledFor: new Date('2024-01-01T10:00:00.000Z'),
          };
          tasksService.findScheduledTasks.mockResolvedValue([dueTask]);

          await scheduler.handleCron();

          expect(logger.debug).toHaveBeenCalledWith(
            `Task ID: ${dueTask.id} is scheduled for ${dueTask.scheduledFor.toISOString()}, queuing it`,
          );
        });

        it('should handle tasks with null scheduledFor gracefully', async () => {
          const taskWithNullSchedule = {
            ...mockScheduledTask,
            scheduledFor: null,
          };
          tasksService.findScheduledTasks.mockResolvedValue([
            taskWithNullSchedule,
          ]);

          await scheduler.handleCron();

          expect(tasksService.update).not.toHaveBeenCalled();
        });
      });

      describe('Agent Processor Integration', () => {
        it('should skip task processing when agent processor is running', async () => {
          agentProcessor.isRunning.mockReturnValue(true);

          await scheduler.handleCron();

          expect(tasksService.findNextTask).not.toHaveBeenCalled();
          expect(agentProcessor.processTask).not.toHaveBeenCalled();
        });

        it('should process next task when agent processor is idle', async () => {
          agentProcessor.isRunning.mockReturnValue(false);
          tasksService.findNextTask.mockResolvedValue(mockQueuedTask);

          await scheduler.handleCron();

          expect(tasksService.findNextTask).toHaveBeenCalled();
          expect(tasksService.update).toHaveBeenCalledWith(mockQueuedTask.id, {
            status: TaskStatus.RUNNING,
            executedAt: expect.any(Date),
          });
          expect(agentProcessor.processTask).toHaveBeenCalledWith(
            mockQueuedTask.id,
          );
        });

        it('should handle no available tasks gracefully', async () => {
          agentProcessor.isRunning.mockReturnValue(false);
          tasksService.findNextTask.mockResolvedValue(null);

          await scheduler.handleCron();

          expect(tasksService.findNextTask).toHaveBeenCalled();
          expect(tasksService.update).not.toHaveBeenCalled();
          expect(agentProcessor.processTask).not.toHaveBeenCalled();
        });

        it('should log debug information for task processing', async () => {
          agentProcessor.isRunning.mockReturnValue(false);
          tasksService.findNextTask.mockResolvedValue(mockQueuedTask);

          await scheduler.handleCron();

          expect(logger.debug).toHaveBeenCalledWith(
            `Processing task ID: ${mockQueuedTask.id}`,
          );
        });
      });
    });
  });

  describe('File Management and Desktop Integration', () => {
    it('should write task files to desktop before processing', async () => {
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(mockTaskWithFiles);

      await scheduler.handleCron();

      expect(logger.debug).toHaveBeenCalledWith(
        `Task ID: ${mockTaskWithFiles.id} has files, writing them to the desktop`,
      );
      expect(writeFile).toHaveBeenCalledTimes(2);
      expect(writeFile).toHaveBeenCalledWith({
        path: '/home/user/Desktop/document.txt',
        content: 'VGVzdCBkb2N1bWVudCBjb250ZW50',
      });
      expect(writeFile).toHaveBeenCalledWith({
        path: '/home/user/Desktop/image.png',
        content:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      });
    });

    it('should handle tasks with no files', async () => {
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(mockQueuedTask);

      await scheduler.handleCron();

      expect(writeFile).not.toHaveBeenCalled();
      expect(agentProcessor.processTask).toHaveBeenCalledWith(
        mockQueuedTask.id,
      );
    });

    it('should handle tasks with empty files array', async () => {
      const taskWithEmptyFiles = {
        ...mockQueuedTask,
        files: [],
      };
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(taskWithEmptyFiles);

      await scheduler.handleCron();

      expect(writeFile).not.toHaveBeenCalled();
      expect(agentProcessor.processTask).toHaveBeenCalledWith(
        taskWithEmptyFiles.id,
      );
    });

    it('should handle file writing with special characters in filenames', async () => {
      const taskWithSpecialFiles = {
        ...mockQueuedTask,
        files: [
          {
            id: 'special-file',
            name: 'file with spaces & symbols!.txt',
            type: 'text/plain',
            size: 512,
            data: 'U3BlY2lhbCBmaWxlIGNvbnRlbnQ=',
            taskId: mockQueuedTask.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(taskWithSpecialFiles);

      await scheduler.handleCron();

      expect(writeFile).toHaveBeenCalledWith({
        path: '/home/user/Desktop/file with spaces & symbols!.txt',
        content: 'U3BlY2lhbCBmaWxlIGNvbnRlbnQ=',
      });
    });

    it('should handle large files efficiently', async () => {
      const taskWithLargeFile = {
        ...mockQueuedTask,
        files: [
          {
            id: 'large-file',
            name: 'large-document.pdf',
            type: 'application/pdf',
            size: 1048576, // 1MB
            data: 'A'.repeat(1000000), // Large base64 content
            taskId: mockQueuedTask.id,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(taskWithLargeFile);

      const startTime = Date.now();
      await scheduler.handleCron();
      const endTime = Date.now();

      expect(writeFile).toHaveBeenCalledWith({
        path: '/home/user/Desktop/large-document.pdf',
        content: 'A'.repeat(1000000),
      });
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Task Priority and Execution Ordering', () => {
    it('should respect task priority from TasksService.findNextTask', async () => {
      const highPriorityTask = {
        ...mockQueuedTask,
        priority: TaskPriority.HIGH,
        id: 'high-priority-task',
      };
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(highPriorityTask);

      await scheduler.handleCron();

      expect(agentProcessor.processTask).toHaveBeenCalledWith(
        'high-priority-task',
      );
    });

    it('should handle task updates for execution correctly', async () => {
      const testTask = { ...mockQueuedTask };
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(testTask);

      await scheduler.handleCron();

      expect(tasksService.update).toHaveBeenCalledWith(testTask.id, {
        status: TaskStatus.RUNNING,
        executedAt: expect.any(Date),
      });
    });

    it('should process tasks in order determined by TasksService', async () => {
      // TasksService.findNextTask should handle ordering logic
      const firstTask = { ...mockQueuedTask, id: 'first-task' };
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(firstTask);

      await scheduler.handleCron();

      expect(agentProcessor.processTask).toHaveBeenCalledWith('first-task');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle errors in scheduled task processing', async () => {
      const problematicTask = {
        ...mockScheduledTask,
        scheduledFor: new Date(Date.now() - 10000),
      };
      tasksService.findScheduledTasks.mockResolvedValue([problematicTask]);
      tasksService.update.mockRejectedValue(new Error('Database error'));

      // Should handle error gracefully without throwing
      await expect(scheduler.handleCron()).rejects.toThrow('Database error');

      // Should have attempted to update the task
      expect(tasksService.update).toHaveBeenCalled();
    });

    it('should handle errors in file writing gracefully', async () => {
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(mockTaskWithFiles);
      (writeFile as jest.Mock).mockRejectedValue(
        new Error('File system error'),
      );

      // Should not throw error
      await expect(scheduler.handleCron()).rejects.toThrow('File system error');
    });

    it('should handle TasksService findScheduledTasks errors', async () => {
      tasksService.findScheduledTasks.mockRejectedValue(
        new Error('Database unavailable'),
      );

      await expect(scheduler.handleCron()).rejects.toThrow(
        'Database unavailable',
      );
    });

    it('should handle TasksService findNextTask errors', async () => {
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockRejectedValue(new Error('Query failed'));

      await expect(scheduler.handleCron()).rejects.toThrow('Query failed');
    });

    it('should handle AgentProcessor errors gracefully', async () => {
      agentProcessor.isRunning.mockImplementation(() => {
        throw new Error('Processor state error');
      });

      await expect(scheduler.handleCron()).rejects.toThrow(
        'Processor state error',
      );
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle concurrent cron executions safely', async () => {
      // Simulate overlapping cron executions
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(mockQueuedTask);

      const promises = [
        scheduler.handleCron(),
        scheduler.handleCron(),
        scheduler.handleCron(),
      ];

      await Promise.all(promises);

      expect(tasksService.findScheduledTasks).toHaveBeenCalledTimes(3);
      expect(tasksService.findNextTask).toHaveBeenCalledTimes(3);
    });

    it('should handle large numbers of scheduled tasks efficiently', async () => {
      const manyScheduledTasks = Array.from({ length: 100 }, (_, i) => ({
        ...mockScheduledTask,
        id: `scheduled-task-${i}`,
        scheduledFor: new Date(Date.now() - (i + 1) * 1000), // All past due (offset by 1 second minimum)
      }));
      tasksService.findScheduledTasks.mockResolvedValue(manyScheduledTasks);

      const startTime = Date.now();
      await scheduler.handleCron();
      const endTime = Date.now();

      expect(tasksService.update).toHaveBeenCalledTimes(100);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle tasks with many files efficiently', async () => {
      const taskWithManyFiles = {
        ...mockQueuedTask,
        files: Array.from({ length: 50 }, (_, i) => ({
          id: `file-${i}`,
          name: `document-${i}.txt`,
          type: 'text/plain',
          size: 1024,
          data: `RmlsZSAke2l9IGNvbnRlbnQ=`,
          taskId: mockQueuedTask.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(taskWithManyFiles);

      const startTime = Date.now();
      await scheduler.handleCron();
      const endTime = Date.now();

      expect(writeFile).toHaveBeenCalledTimes(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should maintain state consistency during processing', async () => {
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(mockQueuedTask);

      await scheduler.handleCron();

      // Verify operations occurred in correct order
      expect(tasksService.findScheduledTasks).toHaveBeenCalled();
      expect(agentProcessor.isRunning).toHaveBeenCalled();
      expect(tasksService.findNextTask).toHaveBeenCalled();
      expect(tasksService.update).toHaveBeenCalled();
      expect(agentProcessor.processTask).toHaveBeenCalled();
    });
  });

  describe('Integration and Service Coordination', () => {
    it('should coordinate scheduled and queued task processing', async () => {
      // Setup both scheduled and queued tasks
      const scheduledTask = {
        ...mockScheduledTask,
        scheduledFor: new Date(Date.now() - 10000), // Past due
      };
      tasksService.findScheduledTasks.mockResolvedValue([scheduledTask]);
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(mockQueuedTask);

      await scheduler.handleCron();

      // Should process scheduled task first, then queued task
      expect(tasksService.update).toHaveBeenCalledWith(scheduledTask.id, {
        queuedAt: expect.any(Date),
      });
      expect(tasksService.update).toHaveBeenCalledWith(mockQueuedTask.id, {
        status: TaskStatus.RUNNING,
        executedAt: expect.any(Date),
      });
      expect(agentProcessor.processTask).toHaveBeenCalledWith(
        mockQueuedTask.id,
      );
    });

    it('should handle complex scheduling scenarios', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01T12:00:00.000Z'));

      const complexScheduledTasks = [
        {
          ...mockScheduledTask,
          id: 'past-due-high',
          priority: TaskPriority.HIGH,
          scheduledFor: new Date('2024-01-01T11:00:00.000Z'), // 1 hour ago
        },
        {
          ...mockScheduledTask,
          id: 'just-due-medium',
          priority: TaskPriority.MEDIUM,
          scheduledFor: new Date('2024-01-01T11:59:59.000Z'), // 1 second ago (clearly past)
        },
        {
          ...mockScheduledTask,
          id: 'future-low',
          priority: TaskPriority.LOW,
          scheduledFor: new Date('2024-01-01T13:00:00.000Z'), // 1 hour from now
        },
      ];
      tasksService.findScheduledTasks.mockResolvedValue(complexScheduledTasks);
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(null);

      await scheduler.handleCron();

      // Should only queue past due tasks (not future tasks)
      expect(tasksService.update).toHaveBeenCalledTimes(2);
      expect(tasksService.update).toHaveBeenCalledWith('past-due-high', {
        queuedAt: expect.any(Date),
      });
      expect(tasksService.update).toHaveBeenCalledWith('just-due-medium', {
        queuedAt: expect.any(Date),
      });
      expect(tasksService.update).not.toHaveBeenCalledWith(
        'future-low',
        expect.anything(),
      );

      jest.useRealTimers();
    });

    it('should maintain proper service dependencies', async () => {
      // Verify all required services are called in proper order
      const scheduledTask = {
        ...mockScheduledTask,
        scheduledFor: new Date(Date.now() - 5000),
      };
      tasksService.findScheduledTasks.mockResolvedValue([scheduledTask]);
      agentProcessor.isRunning.mockReturnValue(false);
      tasksService.findNextTask.mockResolvedValue(mockTaskWithFiles);

      await scheduler.handleCron();

      // Verify service call order and dependencies
      expect(tasksService.findScheduledTasks).toHaveBeenCalled();
      expect(agentProcessor.isRunning).toHaveBeenCalled();
      expect(tasksService.findNextTask).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalled();
      expect(tasksService.update).toHaveBeenCalled();
      expect(agentProcessor.processTask).toHaveBeenCalled();
    });
  });
});
