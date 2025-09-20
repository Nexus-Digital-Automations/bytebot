import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { BrowserUseController } from '../browser-use.controller';
import { BrowserUseService } from '../browser-use.service';
import { BrowserSessionService } from '../browser-session.service';
import { BrowserTaskService } from '../browser-task.service';
import {
  CreateBrowserTaskDto,
  BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
} from '../dto/browser-task.dto';
import {
  CreateBrowserSessionDto,
  BrowserSessionDto,
  BrowserSessionStatus,
} from '../dto/browser-session.dto';
import { CreateAsyncJobDto, AsyncJobResultDto } from '../dto/async-job.dto';

describe('BrowserUseController', () => {
  let controller: BrowserUseController;
  let browserUseService: jest.Mocked<BrowserUseService>;
  let sessionService: jest.Mocked<BrowserSessionService>;
  let taskService: jest.Mocked<BrowserTaskService>;

  const mockTaskResult: BrowserTaskResultDto = {
    taskId: 'task-123',
    status: BrowserTaskStatus.COMPLETED,
    name: 'Test Task',
    actionsCompleted: 5,
    executionTimeMs: 1500,
    result: { success: true },
    createdAt: new Date(),
    completedAt: new Date(),
    metadata: { priority: BrowserTaskPriority.NORMAL },
  };

  const mockSession: BrowserSessionDto = {
    sessionId: 'session-123',
    name: 'Test Session',
    status: BrowserSessionStatus.ACTIVE,
    tabs: [
      {
        tabId: 'tab-1',
        url: 'https://example.com',
        title: 'Example',
        isActive: true,
      },
    ],
    createdAt: new Date(),
    lastActivity: new Date(),
    statistics: {
      tasksExecuted: 0,
      screenshotsTaken: 0,
      interactionsPerformed: 0,
    },
  };

  const mockAsyncJob: AsyncJobResultDto = {
    jobId: 'job-123',
    name: 'Test Job',
    status: 'queued',
    progress: 0,
    estimatedDurationMs: 5000,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockBrowserUseService = {
      executeBrowserTask: jest.fn(),
      createAsyncJob: jest.fn(),
      getAsyncJob: jest.fn(),
      cancelAsyncJob: jest.fn(),
      takeScreenshot: jest.fn(),
      extractPageData: jest.fn(),
    };

    const mockSessionService = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      getAllSessions: jest.fn(),
      closeSession: jest.fn(),
      createTab: jest.fn(),
      closeTab: jest.fn(),
      updateActivity: jest.fn(),
    };

    const mockTaskService = {
      getTask: jest.fn(),
      getAllTasks: jest.fn(),
      cancelTask: jest.fn(),
      getTaskMetrics: jest.fn(),
      getTasksByStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrowserUseController],
      providers: [
        {
          provide: BrowserUseService,
          useValue: mockBrowserUseService,
        },
        {
          provide: BrowserSessionService,
          useValue: mockSessionService,
        },
        {
          provide: BrowserTaskService,
          useValue: mockTaskService,
        },
      ],
    }).compile();

    controller = module.get<BrowserUseController>(BrowserUseController);
    browserUseService = module.get(BrowserUseService);
    sessionService = module.get(BrowserSessionService);
    taskService = module.get(BrowserTaskService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('executeTask', () => {
    const createTaskDto: CreateBrowserTaskDto = {
      name: 'Test Task',
      actions: [
        {
          type: 'navigate',
          url: 'https://example.com',
        },
        {
          type: 'click',
          selector: '#submit-button',
        },
      ],
      priority: BrowserTaskPriority.NORMAL,
      sessionConfig: {
        headless: true,
        viewportWidth: 1280,
        viewportHeight: 720,
      },
    };

    it('should execute a browser task successfully', async () => {
      browserUseService.executeBrowserTask.mockResolvedValue(mockTaskResult);

      const result = await controller.executeTask(createTaskDto);

      expect(result).toEqual(mockTaskResult);
      expect(browserUseService.executeBrowserTask).toHaveBeenCalledWith(createTaskDto);
    });

    it('should handle task execution failure', async () => {
      const error = new Error('Task execution failed');
      browserUseService.executeBrowserTask.mockRejectedValue(error);

      await expect(controller.executeTask(createTaskDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getTask', () => {
    it('should return a task by ID', async () => {
      taskService.getTask.mockReturnValue(mockTaskResult);

      const result = await controller.getTask('task-123');

      expect(result).toEqual(mockTaskResult);
      expect(taskService.getTask).toHaveBeenCalledWith('task-123');
    });

    it('should throw NotFoundException when task not found', async () => {
      taskService.getTask.mockReturnValue(null);

      await expect(controller.getTask('invalid-task')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllTasks', () => {
    it('should return all tasks without filters', async () => {
      const tasks = [mockTaskResult];
      taskService.getAllTasks.mockReturnValue(tasks);

      const result = await controller.getAllTasks();

      expect(result).toEqual(tasks);
      expect(taskService.getAllTasks).toHaveBeenCalled();
    });

    it('should filter tasks by status', async () => {
      const tasks = [mockTaskResult];
      taskService.getAllTasks.mockReturnValue(tasks);

      const result = await controller.getAllTasks(BrowserTaskStatus.COMPLETED);

      expect(result).toEqual(tasks);
    });

    it('should filter tasks by priority', async () => {
      const tasks = [mockTaskResult];
      taskService.getAllTasks.mockReturnValue(tasks);

      const result = await controller.getAllTasks(undefined, BrowserTaskPriority.HIGH);

      expect(result).toEqual(tasks);
    });
  });

  describe('cancelTask', () => {
    it('should cancel a task successfully', async () => {
      taskService.cancelTask.mockReturnValue(undefined);

      await controller.cancelTask('task-123');

      expect(taskService.cancelTask).toHaveBeenCalledWith('task-123');
    });

    it('should throw NotFoundException when task not found', async () => {
      const error = new Error('Task not found');
      taskService.cancelTask.mockImplementation(() => {
        throw error;
      });

      await expect(controller.cancelTask('invalid-task')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTaskMetrics', () => {
    it('should return task metrics', async () => {
      const metrics = {
        totalTasks: 10,
        completedTasks: 8,
        successRate: 0.8,
        averageExecutionTime: 2500,
      };
      taskService.getTaskMetrics.mockReturnValue(metrics);

      const result = await controller.getTaskMetrics();

      expect(result.status).toBe('success');
      expect(result.data).toEqual(metrics);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('createSession', () => {
    const createSessionDto: CreateBrowserSessionDto = {
      name: 'Test Session',
      headless: true,
      viewportWidth: 1280,
      viewportHeight: 720,
      initialUrls: ['https://example.com'],
    };

    it('should create a browser session successfully', async () => {
      sessionService.createSession.mockResolvedValue(mockSession);

      const result = await controller.createSession(createSessionDto);

      expect(result).toEqual(mockSession);
      expect(sessionService.createSession).toHaveBeenCalledWith(createSessionDto);
    });

    it('should handle session creation failure', async () => {
      const error = new Error('Session creation failed');
      sessionService.createSession.mockRejectedValue(error);

      await expect(controller.createSession(createSessionDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getSession', () => {
    it('should return a session by ID', async () => {
      sessionService.getSession.mockReturnValue(mockSession);

      const result = await controller.getSession('session-123');

      expect(result).toEqual(mockSession);
      expect(sessionService.getSession).toHaveBeenCalledWith('session-123');
    });

    it('should throw NotFoundException when session not found', async () => {
      sessionService.getSession.mockReturnValue(null);

      await expect(controller.getSession('invalid-session')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions without filters', async () => {
      const sessions = [mockSession];
      sessionService.getAllSessions.mockReturnValue(sessions);

      const result = await controller.getAllSessions();

      expect(result).toEqual(sessions);
      expect(sessionService.getAllSessions).toHaveBeenCalled();
    });

    it('should filter sessions by status', async () => {
      const sessions = [mockSession];
      sessionService.getAllSessions.mockReturnValue(sessions);

      const result = await controller.getAllSessions(BrowserSessionStatus.ACTIVE);

      expect(result).toEqual(sessions);
    });
  });

  describe('closeSession', () => {
    it('should close a session successfully', async () => {
      sessionService.closeSession.mockResolvedValue(undefined);

      await controller.closeSession('session-123');

      expect(sessionService.closeSession).toHaveBeenCalledWith('session-123');
    });

    it('should throw NotFoundException when session not found', async () => {
      const error = new Error('Session not found');
      sessionService.closeSession.mockRejectedValue(error);

      await expect(controller.closeSession('invalid-session')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createTab', () => {
    it('should create a tab successfully', async () => {
      const tabOptions = {
        url: 'https://example.com',
        title: 'Example',
        makeActive: true,
      };
      const mockTab = {
        tabId: 'tab-2',
        url: 'https://example.com',
        title: 'Example',
        isActive: true,
      };

      sessionService.createTab.mockReturnValue(mockTab);

      const result = await controller.createTab('session-123', tabOptions);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(mockTab);
      expect(sessionService.createTab).toHaveBeenCalledWith('session-123', tabOptions);
    });
  });

  describe('closeTab', () => {
    it('should close a tab successfully', async () => {
      sessionService.closeTab.mockReturnValue(undefined);

      await controller.closeTab('session-123', 'tab-1');

      expect(sessionService.closeTab).toHaveBeenCalledWith('session-123', 'tab-1');
    });
  });

  describe('createAsyncJob', () => {
    const createJobDto: CreateAsyncJobDto = {
      name: 'Test Job',
      jobType: 'automation-workflow',
      priority: 'normal',
      configuration: {
        steps: [
          { action: 'navigate', url: 'https://example.com' },
        ],
      },
    };

    it('should create an async job successfully', async () => {
      browserUseService.createAsyncJob.mockResolvedValue(mockAsyncJob);

      const result = await controller.createAsyncJob(createJobDto);

      expect(result).toEqual(mockAsyncJob);
      expect(browserUseService.createAsyncJob).toHaveBeenCalledWith(createJobDto);
    });

    it('should handle async job creation failure', async () => {
      const error = new Error('Job creation failed');
      browserUseService.createAsyncJob.mockRejectedValue(error);

      await expect(controller.createAsyncJob(createJobDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getAsyncJob', () => {
    it('should return an async job by ID', async () => {
      browserUseService.getAsyncJob.mockResolvedValue(mockAsyncJob);

      const result = await controller.getAsyncJob('job-123');

      expect(result).toEqual(mockAsyncJob);
      expect(browserUseService.getAsyncJob).toHaveBeenCalledWith('job-123');
    });

    it('should throw NotFoundException when job not found', async () => {
      browserUseService.getAsyncJob.mockResolvedValue(null);

      await expect(controller.getAsyncJob('invalid-job')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelAsyncJob', () => {
    it('should cancel an async job successfully', async () => {
      browserUseService.cancelAsyncJob.mockResolvedValue(undefined);

      await controller.cancelAsyncJob('job-123');

      expect(browserUseService.cancelAsyncJob).toHaveBeenCalledWith('job-123');
    });

    it('should throw NotFoundException when job not found', async () => {
      const error = new Error('Job not found');
      browserUseService.cancelAsyncJob.mockRejectedValue(error);

      await expect(controller.cancelAsyncJob('invalid-job')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('takeScreenshot', () => {
    it('should take a screenshot successfully', async () => {
      const screenshotData = {
        screenshotId: 'screenshot-123',
        base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        format: 'png',
        dimensions: { width: 1280, height: 720 },
        fileSizeBytes: 1024,
        timestamp: new Date(),
      };

      browserUseService.takeScreenshot.mockResolvedValue(screenshotData);
      sessionService.updateActivity.mockResolvedValue(undefined);

      const result = await controller.takeScreenshot('session-123', {
        fullPage: true,
        quality: 90,
      });

      expect(result.status).toBe('success');
      expect(result.data).toEqual(screenshotData);
      expect(browserUseService.takeScreenshot).toHaveBeenCalledWith('session-123', {
        fullPage: true,
        quality: 90,
      });
      expect(sessionService.updateActivity).toHaveBeenCalledWith('session-123', {
        screenshot: true,
      });
    });

    it('should handle screenshot failure', async () => {
      const error = new Error('Screenshot failed');
      browserUseService.takeScreenshot.mockRejectedValue(error);

      await expect(
        controller.takeScreenshot('session-123', { fullPage: true }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('extractPageData', () => {
    it('should extract page data successfully', async () => {
      const extractConfig = {
        selectors: {
          title: 'h1',
          description: '.description',
        },
        waitForSelector: '.content',
        timeout: 5000,
      };

      const extractedData = {
        title: 'Example Title',
        description: 'Example Description',
      };

      browserUseService.extractPageData.mockResolvedValue(extractedData);

      const result = await controller.extractPageData('session-123', extractConfig);

      expect(result.status).toBe('success');
      expect(result.data).toEqual(extractedData);
      expect(browserUseService.extractPageData).toHaveBeenCalledWith(
        'session-123',
        extractConfig,
      );
    });

    it('should handle data extraction failure', async () => {
      const extractConfig = {
        selectors: { title: 'h1' },
      };
      const error = new Error('Extraction failed');
      browserUseService.extractPageData.mockRejectedValue(error);

      await expect(
        controller.extractPageData('session-123', extractConfig),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      const sessions = [mockSession];
      const runningTasks = [mockTaskResult];
      const taskMetrics = {
        totalTasks: 10,
        completedTasks: 8,
        successRate: 0.8,
        averageExecutionTime: 2500,
      };

      sessionService.getAllSessions.mockResolvedValue(sessions);
      taskService.getTasksByStatus.mockResolvedValue(runningTasks);
      taskService.getTaskMetrics.mockResolvedValue(taskMetrics);

      const result = await controller.getHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.service).toBe('Browser Use Controller');
      expect(result.statistics.activeSessions).toBe(1);
      expect(result.statistics.runningTasks).toBe(1);
      expect(result.statistics.totalTasksCompleted).toBe(8);
      expect(result.statistics.successRate).toBe(0.8);
      expect(result.version).toBe('2.0.0');
    });
  });
});