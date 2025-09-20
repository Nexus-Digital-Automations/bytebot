import { Test, TestingModule } from '@nestjs/testing';import { HttpStatus, NotFoundException, InternalServerErrorException } from '@nestjs/common';import { BrowserTaskExecutionController } from '../browser-task-execution.controller';import { BrowserTaskExecutionService } from '../browser-task-execution.service';import { BrowserUseService } from '../browser-use.service';import { BrowserSessionService } from '../browser-session.service';import {TaskExecutionRequestDto,
  TaskExecutionResponseDto,
  BatchTaskExecutionRequestDto,
  BatchTaskExecutionResponseDto,
  TaskExecutionStatus,
} from '../dto/task-execution.dto';describe('BrowserTaskExecutionController', () => {let controller: BrowserTaskExecutionController;let taskExecutionService: jest.Mocked<BrowserTaskExecutionService>;
  let browserUseService: jest.Mocked<BrowserUseService>;
  let sessionService: jest.Mocked<BrowserSessionService>;

  const mockTaskExecutionResponse: TaskExecutionResponseDto = {
    executionId: 'exec-123',taskId: 'task-123',sessionId: 'session-123',status: TaskExecutionStatus.COMPLETED,progress: 100,
    result: {
      success: true,
      data: { pageTitle: 'Example Page' },},startTime: new Date(),
    endTime: new Date(),
    durationMs: 1500,
    stepsCompleted: 5,
    totalSteps: 5,
    screenshots: [
      {
        stepIndex: 0,
        screenshotId: 'screenshot-1',base64Data: 'data:image/png;base64,iVBOR...',},],
    logs: [
      {
        timestamp: new Date(),
        level: 'info',message: 'Task started',stepIndex: 0,},
    ],
  };

  const mockBatchExecutionResponse: BatchTaskExecutionResponseDto = {
    batchId: 'batch-123',sessionId: 'session-123',totalTasks: 3,completedTasks: 2,
    failedTasks: 1,
    overallStatus: 'partial_success',executions: [mockTaskExecutionResponse],batchStartTime: new Date(),
    batchEndTime: new Date(),
    totalDurationMs: 5000,
  };

  beforeEach(async () => {
    const mockTaskExecutionService = {
      executeTask: jest.fn(),
      executeBatchTasks: jest.fn(),
      getTaskExecution: jest.fn(),
      cancelTaskExecution: jest.fn(),
      getTaskExecutionHistory: jest.fn(),
      getTaskExecutionMetrics: jest.fn(),
      resumeTaskExecution: jest.fn(),
      pauseTaskExecution: jest.fn(),
      validateTaskDefinition: jest.fn(),
    };

    const mockBrowserUseService = {
      getTaskExecutionHealth: jest.fn(),
      getSystemMetrics: jest.fn(),
    };

    const mockSessionService = {
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

  describe('executeTask', () => {const executionRequest: TaskExecutionRequestDto = {taskDefinition: {
        name: 'Test Task',description: 'A test automation task',steps: [{
            type: 'navigate',url: 'https://example.com',},{
            type: 'click',selector: '#submit-button',},{
            type: 'extract',selector: 'h1',property: 'textContent',},],
      },
      sessionId: 'session-123',executionOptions: {captureScreenshots: true,
        continueOnError: false,
        timeout: 30000,
        stepDelay: 1000,
      },
      metadata: {
        priority: 'high',tags: ['automation', 'test'],requestId: 'req-123',},};

    it('should execute a task successfully', async () => {taskExecutionService.executeTask.mockResolvedValue(mockTaskExecutionResponse);const result = await controller.executeTask(executionRequest);

      expect(result).toEqual(mockTaskExecutionResponse);
      expect(taskExecutionService.executeTask).toHaveBeenCalledWith(executionRequest);
    });

    it('should handle task execution failure', async () => {const error = new Error('Task execution failed');taskExecutionService.executeTask.mockRejectedValue(error);await expect(controller.executeTask(executionRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should validate task definition before execution', async () => {const invalidRequest = {...executionRequest,
        taskDefinition: {
          ...executionRequest.taskDefinition,
          steps: [], // Invalid: empty steps
        },
      };

      const validationError = new Error('Task definition validation failed: No steps provided');taskExecutionService.executeTask.mockRejectedValue(validationError);await expect(controller.executeTask(invalidRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('executeBatchTasks', () => {const batchRequest: BatchTaskExecutionRequestDto = {sessionId: 'session-123',tasks: [{
          taskDefinition: {
            name: 'Task 1',description: 'First task',steps: [{ type: 'navigate', url: 'https://example1.com' }],},executionOptions: { captureScreenshots: true },
        },
        {
          taskDefinition: {
            name: 'Task 2',description: 'Second task',steps: [{ type: 'navigate', url: 'https://example2.com' }],},executionOptions: { captureScreenshots: false },
        },
      ],
      batchOptions: {
        parallel: false,
        continueOnError: true,
        maxConcurrent: 2,
        batchTimeout: 60000,
      },
      metadata: {
        batchName: 'Test Batch',priority: 'normal',},};

    it('should execute batch tasks successfully', async () => {taskExecutionService.executeBatchTasks.mockResolvedValue(mockBatchExecutionResponse);const result = await controller.executeBatchTasks(batchRequest);

      expect(result).toEqual(mockBatchExecutionResponse);
      expect(taskExecutionService.executeBatchTasks).toHaveBeenCalledWith(batchRequest);
    });

    it('should handle batch execution failure', async () => {const error = new Error('Batch execution failed');taskExecutionService.executeBatchTasks.mockRejectedValue(error);await expect(controller.executeBatchTasks(batchRequest)).rejects.toThrow(
        InternalServerErrorException,
      );
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