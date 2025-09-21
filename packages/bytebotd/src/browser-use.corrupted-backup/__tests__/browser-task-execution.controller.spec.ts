import { Test, TestingModule } from '@nestjs/testing';import { HttpStatus, NotFoundException, InternalServerErrorException } from '@nestjs/common';import { BrowserTaskExecutionController } from '../browser-task-execution.controller';import { BrowserTaskExecutionService } from '../browser-task-execution.service';import { BrowserUseService } from '../browser-use.service';import { BrowserSessionService } from '../browser-session.service';import {
  BrowserExecuteDto,
  BrowserExecutionResultDto,
  BrowserExecutionStatus,
  BrowserExecutionType,
} from '../dto/browser-execution.dto';describe('BrowserTaskExecutionController', () => {let controller: BrowserTaskExecutionController;let taskExecutionService: jest.Mocked<BrowserTaskExecutionService>;
  let browserUseService: jest.Mocked<BrowserUseService>;
  let sessionService: jest.Mocked<BrowserSessionService>;

  const mockTaskExecutionResponse: BrowserExecutionResultDto = {
    executionId: 'exec-123',
    status: BrowserExecutionStatus.COMPLETED,
    taskName: 'Test Task',
    executionType: BrowserExecutionType.INTERACTION,
    startedAt: new Date(),
    completedAt: new Date(),
    durationMs: 1500,
    success: true,
    result: {
      success: true,
      data: { pageTitle: 'Example Page' },
    },
    screenshots: ['data:image/png;base64,iVBOR...'],
    logs: [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Task started',
        category: 'execution',
      },
    ],
  };


  beforeEach(async () => {
    const mockTaskExecutionService = {
      navigateToUrl: jest.fn(),
      navigateBack: jest.fn(),
      navigateForward: jest.fn(),
      reloadPage: jest.fn(),
      performInteraction: jest.fn(),
      executeScript: jest.fn(),
      waitForElement: jest.fn(),
      waitForNetworkIdle: jest.fn(),
      waitForLoadState: jest.fn(),
      waitForCustomCondition: jest.fn(),
      takeScreenshot: jest.fn(),
      extractPageData: jest.fn(),
      getExecutionMetrics: jest.fn(),
      healthCheck: jest.fn(),
    };

    const mockBrowserUseService = {
      getTaskExecutionHealth: jest.fn(),
      getSystemMetrics: jest.fn(),
    };

    const mockSessionService = {
      getAllSessions: jest.fn(),
      getSession: jest.fn(),
      validateSessionHealth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrowserTaskExecutionController],
      providers: [
        {
          provide: BrowserTaskExecutionService,
          useValue: mockTaskExecutionService,
        },
        {
          provide: BrowserUseService,
          useValue: mockBrowserUseService,
        },
        {
          provide: BrowserSessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    controller = module.get<BrowserTaskExecutionController>(BrowserTaskExecutionController);
    taskExecutionService = module.get(BrowserTaskExecutionService);
    browserUseService = module.get(BrowserUseService);
    sessionService = module.get(BrowserSessionService);
  });

  it('should be defined', () => {expect(controller).toBeDefined();});

  describe('executeTask', () => {
    const executionRequest: BrowserExecuteDto = {
      executionType: BrowserExecutionType.INTERACTION,
      taskName: 'Test Task',
      instructions: 'A test automation task',
      targetUrl: 'https://example.com',
      selector: '#submit-button',
      sessionId: 'session-123',
      timeoutMs: 30000,
      captureScreenshots: true,
      enableLogging: true,
    };

    it('should execute a task successfully', async () => {
      // Mock the async execution behavior
      const result = await controller.executeTask(executionRequest);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe(BrowserExecutionStatus.QUEUED);
      expect(result.taskName).toBe(executionRequest.taskName);
    });

    it('should handle task execution failure', async () => {
      const invalidRequest: BrowserExecuteDto = {
        ...executionRequest,
        executionType: BrowserExecutionType.NAVIGATION,
        targetUrl: undefined, // This should cause validation to fail
      };

      await expect(controller.executeTask(invalidRequest)).rejects.toThrow();
    });

    it('should validate task definition before execution', async () => {
      const invalidRequest: BrowserExecuteDto = {
        ...executionRequest,
        executionType: BrowserExecutionType.CUSTOM_SCRIPT,
        scriptCode: undefined, // Invalid: missing script code for custom script
      };

      await expect(controller.executeTask(invalidRequest)).rejects.toThrow();
    });
  });

  describe('navigateBrowser', () => {
    const navigationRequest = {
      navigationType: 'goto' as const,
      url: 'https://example.com',
      sessionId: 'session-123',
      timeoutMs: 30000,
    };

    it('should navigate browser successfully', async () => {
      const result = await controller.navigateBrowser(navigationRequest);

      expect(result).toBeDefined();
      expect(result.executionId).toBeDefined();
      expect(result.status).toBe(BrowserExecutionStatus.COMPLETED);
      expect(result.executionType).toBe(BrowserExecutionType.NAVIGATION);
    });

    it('should handle navigation failure', async () => {
      const invalidRequest = {
        ...navigationRequest,
        navigationType: 'goto' as const,
        url: undefined, // Invalid: missing URL for goto navigation
      };

      await expect(controller.navigateBrowser(invalidRequest)).rejects.toThrow();
    });
  });

  describe('getTaskExecution', () => {it('should return task execution details', async () => {taskExecutionService.getTaskExecution.mockResolvedValue(mockTaskExecutionResponse);const result = await controller.getTaskExecution('exec-123');expect(result).toEqual(mockTaskExecutionResponse);expect(taskExecutionService.getTaskExecution).toHaveBeenCalledWith('exec-123');});it('should throw NotFoundException when execution not found', async () => {taskExecutionService.getTaskExecution.mockResolvedValue(null);await expect(controller.getTaskExecution('invalid-exec')).rejects.toThrow(NotFoundException,);
    });
  });

  describe('cancelTaskExecution', () => {it('should cancel task execution successfully', async () => {const canceledExecution = {...mockTaskExecutionResponse,
        status: TaskExecutionStatus.CANCELLED,
        endTime: new Date(),
      };

      taskExecutionService.cancelTaskExecution.mockResolvedValue(canceledExecution);

      const result = await controller.cancelTaskExecution('exec-123');expect(result).toEqual(canceledExecution);expect(taskExecutionService.cancelTaskExecution).toHaveBeenCalledWith('exec-123');});it('should throw NotFoundException when execution not found', async () => {const error = new Error('Execution not found');taskExecutionService.cancelTaskExecution.mockRejectedValue(error);await expect(controller.cancelTaskExecution('invalid-exec')).rejects.toThrow(NotFoundException,);
    });
  });

  describe('pauseTaskExecution', () => {it('should pause task execution successfully', async () => {const pausedExecution = {...mockTaskExecutionResponse,
        status: TaskExecutionStatus.PAUSED,
      };

      taskExecutionService.pauseTaskExecution.mockResolvedValue(pausedExecution);

      const result = await controller.pauseTaskExecution('exec-123');expect(result).toEqual(pausedExecution);expect(taskExecutionService.pauseTaskExecution).toHaveBeenCalledWith('exec-123');});});

  describe('resumeTaskExecution', () => {it('should resume task execution successfully', async () => {const resumedExecution = {...mockTaskExecutionResponse,
        status: TaskExecutionStatus.RUNNING,
      };

      taskExecutionService.resumeTaskExecution.mockResolvedValue(resumedExecution);

      const result = await controller.resumeTaskExecution('exec-123');expect(result).toEqual(resumedExecution);expect(taskExecutionService.resumeTaskExecution).toHaveBeenCalledWith('exec-123');});});

  describe('getTaskExecutionHistory', () => {it('should return task execution history with filters', async () => {const history = [mockTaskExecutionResponse];taskExecutionService.getTaskExecutionHistory.mockResolvedValue(history);

      const result = await controller.getTaskExecutionHistory(
        'session-123',TaskExecutionStatus.COMPLETED,10,
        0,
      );

      expect(result).toEqual(history);
      expect(taskExecutionService.getTaskExecutionHistory).toHaveBeenCalledWith(
        'session-123',{ status: TaskExecutionStatus.COMPLETED },10,
        0,
      );
    });

    it('should return all history when no filters provided', async () => {const history = [mockTaskExecutionResponse];taskExecutionService.getTaskExecutionHistory.mockResolvedValue(history);

      const result = await controller.getTaskExecutionHistory('session-123');expect(result).toEqual(history);expect(taskExecutionService.getTaskExecutionHistory).toHaveBeenCalledWith(
        'session-123',{},undefined,
        undefined,
      );
    });
  });

  describe('getTaskExecutionMetrics', () => {it('should return task execution metrics', async () => {const metrics = {totalExecutions: 100,
        successfulExecutions: 85,
        failedExecutions: 15,
        successRate: 0.85,
        averageExecutionTime: 2500,
        totalExecutionTime: 250000,
        taskTypeBreakdown: {
          navigation: 40,
          interaction: 35,
          extraction: 25,
        },
        executionsByStatus: {
          [TaskExecutionStatus.COMPLETED]: 85,
          [TaskExecutionStatus.FAILED]: 15,
        },
        performanceTrends: {
          last24Hours: 0.9,
          last7Days: 0.87,
          last30Days: 0.85,
        },
      };

      taskExecutionService.getTaskExecutionMetrics.mockResolvedValue(metrics);

      const result = await controller.getTaskExecutionMetrics('session-123', 30);expect(result.status).toBe('success');expect(result.data).toEqual(metrics);expect(taskExecutionService.getTaskExecutionMetrics).toHaveBeenCalledWith(
        'session-123',30,);
    });
  });

  describe('validateTaskDefinition', () => {it('should validate task definition successfully', async () => {const taskDefinition = {name: 'Valid Task',description: 'A valid task definition',steps: [{ type: 'navigate', url: 'https://example.com' },{ type: 'click', selector: '#button' },],};

      const validationResult = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };

      taskExecutionService.validateTaskDefinition.mockResolvedValue(validationResult);

      const result = await controller.validateTaskDefinition(taskDefinition);

      expect(result.status).toBe('success');expect(result.data).toEqual(validationResult);expect(taskExecutionService.validateTaskDefinition).toHaveBeenCalledWith(taskDefinition);
    });

    it('should return validation errors for invalid task definition', async () => {const invalidTaskDefinition = {name: '',description: '',steps: [],};

      const validationResult = {
        valid: false,
        errors: [
          'Task name is required','Task description is required','At least one step is required',],warnings: [],
        suggestions: ['Consider adding more descriptive step names'],};taskExecutionService.validateTaskDefinition.mockResolvedValue(validationResult);

      const result = await controller.validateTaskDefinition(invalidTaskDefinition);

      expect(result.status).toBe('success');expect(result.data.valid).toBe(false);expect(result.data.errors).toHaveLength(3);
    });
  });

  describe('getTaskExecutionHealth', () => {it('should return task execution health status', async () => {const healthData = {status: 'healthy',service: 'Browser Task Execution Controller',timestamp: new Date().toISOString(),version: '1.0.0',statistics: {activeExecutions: 5,
          queuedExecutions: 3,
          completedToday: 150,
          successRateToday: 0.92,
        },
        performance: {
          averageExecutionTime: 2200,
          peakExecutionTime: 5000,
          memoryUsage: '256MB',cpuUsage: '15%',},capabilities: {
          maxConcurrentExecutions: 10,
          supportedTaskTypes: ['navigation', 'interaction', 'extraction', 'validation'],featuresEnabled: ['screenshot_capture','error_recovery','batch_execution','pause_resume',
          ],
        },
        uptime: process.uptime(),
      };

      browserUseService.getTaskExecutionHealth.mockResolvedValue(healthData);

      const result = await controller.getTaskExecutionHealth();

      expect(result).toEqual(healthData);
      expect(browserUseService.getTaskExecutionHealth).toHaveBeenCalled();
    });
  });
});