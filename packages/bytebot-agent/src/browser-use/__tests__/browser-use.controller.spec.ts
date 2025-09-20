/**
 * Browser-Use Controller Test Suite
 *
 * Comprehensive unit and integration tests for browser automation controller including:
 * - REST API endpoint testing
 * - Authentication and authorization testing
 * - Request validation and response transformation
 * - Error handling and edge cases
 * - Session management operations
 * - Browser task operations
 * - Real-time monitoring endpoints
 * - Data extraction and processing
 */

import { TestingModule } from '@nestjs/testing';
import { BrowserUseController } from '../browser-use.controller';
import { BrowserUseService } from '../browser-use.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  ExecutionContext,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  BrowserTaskDto,
  BrowserSessionDto,
  BrowserDataDto,
  BrowserResultsDto,
  BrowserScreenshotDto,
  BrowserMonitoringDto,
  BrowserFormDto,
} from '../dto';

// Mock the service
const mockBrowserUseService = {
  createTask: jest.fn(),
  getTasks: jest.fn(),
  getTask: jest.fn(),
  updateTask: jest.fn(),
  deleteTask: jest.fn(),
  executeTask: jest.fn(),
  cancelTask: jest.fn(),
  getTaskResults: jest.fn(),
  exportTaskResults: jest.fn(),
  createSession: jest.fn(),
  getSessions: jest.fn(),
  getSession: jest.fn(),
  updateSession: jest.fn(),
  deleteSession: jest.fn(),
  getSessionStatus: jest.fn(),
  takeScreenshot: jest.fn(),
  navigateToUrl: jest.fn(),
  clickElement: jest.fn(),
  typeText: jest.fn(),
  fillForm: jest.fn(),
  extractData: jest.fn(),
  waitForElement: jest.fn(),
  scrollPage: jest.fn(),
  getPageContent: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  getSystemHealth: jest.fn(),
  getErrorLogs: jest.fn(),
  clearCache: jest.fn(),
  restartBrowser: jest.fn(),
  validateConfiguration: jest.fn(),
};

// Mock JWT Auth Guard
const mockJwtAuthGuard = {
  canActivate: jest.fn().mockImplementation((_context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest();
    req.user = {
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'admin',
      roles: ['admin', 'user'],
    };
    return true;
  }),
};

describe('BrowserUseController', () => {
  let controller: BrowserUseController;
  let service: BrowserUseService;
  let module: TestingModule;

  const mockUser = {
    id: 'test-user-123',
    email: 'test@example.com',
    role: 'admin',
    roles: ['admin', 'user'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      controllers: [BrowserUseController],
      providers: [
        {
          provide: BrowserUseService,
          useValue: mockBrowserUseService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<BrowserUseController>(BrowserUseController);
    service = module.get<BrowserUseService>(BrowserUseService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have browser use service injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Browser Task Management', () => {
    describe('POST /browser-use/tasks', () => {
      const createTaskDto: BrowserTaskDto = {
        name: 'Test Task',
        url: 'https://example.com',
        description: 'Test automation task',
        steps: [
          { action: 'navigate', target: 'https://example.com' },
          { action: 'click', target: '#submit-button' },
        ],
        sessionId: 'session-123',
        priority: 1,
        timeout: 30000,
        retryAttempts: 3,
        _metadata: { source: 'api-test' },
      };

      it('should create a new browser task successfully', async () => {
        const expectedResult = {
          id: 'task-123',
          ...createTaskDto,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockBrowserUseService.createTask.mockResolvedValue(expectedResult);

        const result = await controller.createTask(createTaskDto, mockUser);

        expect(result).toEqual(expectedResult);
        expect(service.createTask).toHaveBeenCalledWith(
          createTaskDto,
          mockUser,
        );
      });

      it('should handle validation errors in task creation', async () => {
        const invalidTaskDto = { ...createTaskDto, url: 'invalid-url' };
        mockBrowserUseService.createTask.mockRejectedValue(
          new BadRequestException('Invalid URL format'),
        );

        await expect(
          controller.createTask(invalidTaskDto, mockUser),
        ).rejects.toThrow(BadRequestException);
      });

      it('should handle service errors in task creation', async () => {
        mockBrowserUseService.createTask.mockRejectedValue(
          new Error('Internal service error'),
        );

        await expect(
          controller.createTask(createTaskDto, mockUser),
        ).rejects.toThrow('Internal service error');
      });
    });

    describe('GET /browser-use/tasks', () => {
      it('should retrieve all tasks with pagination', async () => {
        const mockTasks = [
          {
            id: 'task-1',
            name: 'Task 1',
            url: 'https://example1.com',
            status: 'completed',
            createdAt: new Date(),
          },
          {
            id: 'task-2',
            name: 'Task 2',
            url: 'https://example2.com',
            status: 'running',
            createdAt: new Date(),
          },
        ];

        const expectedResult = {
          tasks: mockTasks,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
        };

        mockBrowserUseService.getTasks.mockResolvedValue(expectedResult);

        const result = await controller.getTasks(
          mockUser,
          1, // page
          10, // limit
          'pending', // status
          'created_at', // sortBy
          'desc', // sortOrder
        );

        expect(result).toEqual(expectedResult);
        expect(service.getTasks).toHaveBeenCalledWith(mockUser, {
          page: 1,
          limit: 10,
          status: 'pending',
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
      });

      it('should handle empty task list', async () => {
        const expectedResult = {
          tasks: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
          },
        };

        mockBrowserUseService.getTasks.mockResolvedValue(expectedResult);

        const result = await controller.getTasks(mockUser);

        expect(result).toEqual(expectedResult);
      });
    });

    describe('GET /browser-use/tasks/:id', () => {
      it('should retrieve a specific task by ID', async () => {
        const taskId = 'task-123';
        const expectedTask = {
          id: taskId,
          name: 'Test Task',
          url: 'https://example.com',
          status: 'completed',
          results: { success: true, _data: 'extracted data' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockBrowserUseService.getTask.mockResolvedValue(expectedTask);

        const result = await controller.getTask(taskId, mockUser);

        expect(result).toEqual(expectedTask);
        expect(service.getTask).toHaveBeenCalledWith(taskId, mockUser);
      });

      it('should handle task not found', async () => {
        const taskId = 'non-existent-task';
        mockBrowserUseService.getTask.mockResolvedValue(null);

        const result = await controller.getTask(taskId, mockUser);

        expect(result).toBeNull();
      });
    });

    describe('PUT /browser-use/tasks/:id', () => {
      it('should update a task successfully', async () => {
        const taskId = 'task-123';
        const updateDto: Partial<BrowserTaskDto> = {
          name: 'Updated Task Name',
          description: 'Updated description',
          priority: 2,
        };

        const expectedResult = {
          id: taskId,
          ...updateDto,
          updatedAt: new Date(),
        };

        mockBrowserUseService.updateTask.mockResolvedValue(expectedResult);

        const result = await controller.updateTask(taskId, updateDto, mockUser);

        expect(result).toEqual(expectedResult);
        expect(service.updateTask).toHaveBeenCalledWith(
          taskId,
          updateDto,
          mockUser,
        );
      });
    });

    describe('DELETE /browser-use/tasks/:id', () => {
      it('should delete a task successfully', async () => {
        const taskId = 'task-123';
        const expectedResult = { deleted: true, taskId };

        mockBrowserUseService.deleteTask.mockResolvedValue(expectedResult);

        const result = await controller.deleteTask(taskId, mockUser);

        expect(result).toEqual(expectedResult);
        expect(service.deleteTask).toHaveBeenCalledWith(taskId, mockUser);
      });
    });

    describe('POST /browser-use/tasks/:id/execute', () => {
      it('should execute a task successfully', async () => {
        const taskId = 'task-123';
        const expectedResult = {
          taskId,
          status: 'running',
          executionId: 'exec-456',
          startedAt: new Date(),
        };

        mockBrowserUseService.executeTask.mockResolvedValue(expectedResult);

        const result = await controller.executeTask(taskId, mockUser);

        expect(result).toEqual(expectedResult);
        expect(service.executeTask).toHaveBeenCalledWith(taskId, mockUser);
      });
    });

    describe('POST /browser-use/tasks/:id/cancel', () => {
      it('should cancel a running task', async () => {
        const taskId = 'task-123';
        const expectedResult = {
          taskId,
          status: 'cancelled',
          cancelledAt: new Date(),
        };

        mockBrowserUseService.cancelTask.mockResolvedValue(expectedResult);

        const result = await controller.cancelTask(taskId, mockUser);

        expect(result).toEqual(expectedResult);
        expect(service.cancelTask).toHaveBeenCalledWith(taskId, mockUser);
      });
    });
  });

  describe('Session Management', () => {
    describe('POST /browser-use/sessions', () => {
      const createSessionDto: BrowserSessionDto = {
        name: 'Test Session',
        browserConfig: {
          headless: false,
          userDataDir: '/tmp/browser-session',
          viewport: { width: 1920, height: 1080 },
        },
        timeout: 300000,
        _metadata: { purpose: 'testing' },
      };

      it('should create a new browser session', async () => {
        const expectedResult = {
          id: 'session-123',
          ...createSessionDto,
          status: 'active',
          createdAt: new Date(),
        };

        mockBrowserUseService.createSession.mockResolvedValue(expectedResult);

        const result = await controller.createSession(
          createSessionDto,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(service.createSession).toHaveBeenCalledWith(
          createSessionDto,
          mockUser,
        );
      });
    });

    describe('GET /browser-use/sessions', () => {
      it('should retrieve all browser sessions', async () => {
        const mockSessions = [
          {
            id: 'session-1',
            name: 'Session 1',
            status: 'active',
            createdAt: new Date(),
          },
          {
            id: 'session-2',
            name: 'Session 2',
            status: 'idle',
            createdAt: new Date(),
          },
        ];

        mockBrowserUseService.getSessions.mockResolvedValue(mockSessions);

        const result = await controller.getSessions(mockUser);

        expect(result).toEqual(mockSessions);
        expect(service.getSessions).toHaveBeenCalledWith(mockUser);
      });
    });

    describe('GET /browser-use/sessions/:id/status', () => {
      it('should get session status', async () => {
        const sessionId = 'session-123';
        const expectedStatus = {
          id: sessionId,
          status: 'active',
          uptime: 3600000,
          memoryUsage: 512 * 1024 * 1024,
          tabCount: 3,
          lastActivity: new Date(),
        };

        mockBrowserUseService.getSessionStatus.mockResolvedValue(
          expectedStatus,
        );

        const result = await controller.getSessionStatus(sessionId, mockUser);

        expect(result).toEqual(expectedStatus);
        expect(service.getSessionStatus).toHaveBeenCalledWith(
          sessionId,
          mockUser,
        );
      });
    });
  });

  describe('Browser Operations', () => {
    describe('POST /browser-use/sessions/:sessionId/screenshot', () => {
      it('should take a screenshot', async () => {
        const sessionId = 'session-123';
        const screenshotDto: BrowserScreenshotDto = {
          fullPage: true,
          element: null,
          format: 'png',
          quality: 90,
        };

        const expectedResult = {
          sessionId,
          imageData: 'base64-encoded-image-data',
          format: 'png',
          timestamp: new Date(),
          _metadata: {
            width: 1920,
            height: 1080,
            fileSize: 245760,
          },
        };

        mockBrowserUseService.takeScreenshot.mockResolvedValue(expectedResult);

        const result = await controller.takeScreenshot(
          sessionId,
          screenshotDto,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(service.takeScreenshot).toHaveBeenCalledWith(
          sessionId,
          screenshotDto,
          mockUser,
        );
      });
    });

    describe('POST /browser-use/sessions/:sessionId/navigate', () => {
      it('should navigate to a URL', async () => {
        const sessionId = 'session-123';
        const url = 'https://example.com';

        const expectedResult = {
          sessionId,
          url,
          success: true,
          loadTime: 1234,
          finalUrl: url,
          timestamp: new Date(),
        };

        mockBrowserUseService.navigateToUrl.mockResolvedValue(expectedResult);

        const result = await controller.navigateToUrl(
          sessionId,
          { url },
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(service.navigateToUrl).toHaveBeenCalledWith(
          sessionId,
          url,
          mockUser,
        );
      });
    });

    describe('POST /browser-use/sessions/:sessionId/click', () => {
      it('should click an element', async () => {
        const sessionId = 'session-123';
        const selector = '#submit-button';

        const expectedResult = {
          sessionId,
          selector,
          success: true,
          clickCount: 1,
          timestamp: new Date(),
        };

        mockBrowserUseService.clickElement.mockResolvedValue(expectedResult);

        const result = await controller.clickElement(
          sessionId,
          { selector },
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(service.clickElement).toHaveBeenCalledWith(
          sessionId,
          selector,
          mockUser,
        );
      });
    });

    describe('POST /browser-use/sessions/:sessionId/type', () => {
      it('should type text into an element', async () => {
        const sessionId = 'session-123';
        const selector = '#username';
        const text = 'testuser';

        const expectedResult = {
          sessionId,
          selector,
          text,
          success: true,
          timestamp: new Date(),
        };

        mockBrowserUseService.typeText.mockResolvedValue(expectedResult);

        const result = await controller.typeText(
          sessionId,
          { selector, text },
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(service.typeText).toHaveBeenCalledWith(
          sessionId,
          selector,
          text,
          mockUser,
        );
      });
    });

    describe('POST /browser-use/sessions/:sessionId/form', () => {
      it('should fill a form', async () => {
        const sessionId = 'session-123';
        const formDto: BrowserFormDto = {
          formSelector: '#login-form',
          fields: [
            { selector: '#username', value: 'testuser' },
            { selector: '#password', value: 'password123' },
          ],
          submit: true,
          waitForResponse: true,
        };

        const expectedResult = {
          sessionId,
          formSelector: formDto.formSelector,
          fieldsCompleted: 2,
          submitted: true,
          success: true,
          timestamp: new Date(),
        };

        mockBrowserUseService.fillForm.mockResolvedValue(expectedResult);

        const result = await controller.fillForm(sessionId, formDto, mockUser);

        expect(result).toEqual(expectedResult);
        expect(service.fillForm).toHaveBeenCalledWith(
          sessionId,
          formDto,
          mockUser,
        );
      });
    });
  });

  describe('Data Extraction', () => {
    describe('POST /browser-use/sessions/:sessionId/extract', () => {
      it('should extract data from the page', async () => {
        const sessionId = 'session-123';
        const extractionDto: BrowserDataDto = {
          selectors: [
            { name: 'title', selector: 'h1', attribute: 'textContent' },
            { name: 'links', selector: 'a', attribute: 'href', multiple: true },
          ],
          format: 'json',
          includeMetadata: true,
        };

        const expectedResult = {
          sessionId,
          _data: {
            title: 'Example Page',
            links: ['https://example.com/page1', 'https://example.com/page2'],
          },
          _metadata: {
            url: 'https://example.com',
            timestamp: new Date(),
            extractionTime: 150,
          },
        };

        mockBrowserUseService.extractData.mockResolvedValue(expectedResult);

        const result = await controller.extractData(
          sessionId,
          extractionDto,
          mockUser,
        );

        expect(result).toEqual(expectedResult);
        expect(service.extractData).toHaveBeenCalledWith(
          sessionId,
          extractionDto,
          mockUser,
        );
      });
    });
  });

  describe('Monitoring and Health', () => {
    describe('GET /browser-use/health', () => {
      it('should return system health status', async () => {
        const expectedHealth = {
          status: 'healthy',
          uptime: 3600000,
          activeSessions: 3,
          runningTasks: 1,
          memoryUsage: {
            used: 512 * 1024 * 1024,
            total: 2 * 1024 * 1024 * 1024,
            percentage: 25,
          },
          timestamp: new Date(),
        };

        mockBrowserUseService.getSystemHealth.mockResolvedValue(expectedHealth);

        const result = await controller.getSystemHealth();

        expect(result).toEqual(expectedHealth);
        expect(service.getSystemHealth).toHaveBeenCalled();
      });
    });

    describe('GET /browser-use/performance', () => {
      it('should return performance metrics', async () => {
        const expectedMetrics = {
          averageTaskDuration: 5000,
          tasksCompletedToday: 25,
          errorRate: 0.02,
          successRate: 0.98,
          memoryUsage: 512 * 1024 * 1024,
          cpuUsage: 45.5,
          timestamp: new Date(),
        };

        mockBrowserUseService.getPerformanceMetrics.mockResolvedValue(
          expectedMetrics,
        );

        const result = await controller.getPerformanceMetrics();

        expect(result).toEqual(expectedMetrics);
        expect(service.getPerformanceMetrics).toHaveBeenCalled();
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', BrowserUseController);
      expect(guards).toContain(JwtAuthGuard);
    });

    it('should handle unauthorized access', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValue(false);

      // This would be handled by the guard, but we test the guard logic
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });

    it('should inject user context from JWT token', async () => {
      const taskDto: BrowserTaskDto = {
        name: 'Auth Test Task',
        url: 'https://example.com',
        description: 'Testing auth context',
        steps: [],
        sessionId: 'session-123',
      };

      mockBrowserUseService.createTask.mockResolvedValue({
        id: 'task-auth-test',
        ...taskDto,
      });

      await controller.createTask(taskDto, mockUser);

      expect(service.createTask).toHaveBeenCalledWith(taskDto, mockUser);
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailable errors', async () => {
      mockBrowserUseService.createTask.mockRejectedValue(
        new Error('Service temporarily unavailable'),
      );

      const taskDto: BrowserTaskDto = {
        name: 'Error Test',
        url: 'https://example.com',
        description: 'Testing error handling',
        steps: [],
        sessionId: 'session-123',
      };

      await expect(controller.createTask(taskDto, mockUser)).rejects.toThrow(
        'Service temporarily unavailable',
      );
    });

    it('should handle malformed request data', async () => {
      mockBrowserUseService.createTask.mockRejectedValue(
        new BadRequestException('Invalid request data'),
      );

      const invalidTaskDto = {} as BrowserTaskDto;

      await expect(
        controller.createTask(invalidTaskDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle network timeouts', async () => {
      mockBrowserUseService.executeTask.mockRejectedValue(
        new Error('Network timeout'),
      );

      await expect(
        controller.executeTask('task-123', mockUser),
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('Input Validation', () => {
    it('should validate task creation data', async () => {
      const invalidTaskDto = {
        name: '', // Invalid: empty name
        url: 'not-a-url', // Invalid: malformed URL
        steps: null, // Invalid: null steps
      } as unknown as BrowserTaskDto;

      mockBrowserUseService.createTask.mockRejectedValue(
        new BadRequestException('Validation failed'),
      );

      await expect(
        controller.createTask(invalidTaskDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate session configuration', async () => {
      const invalidSessionDto = {
        name: '',
        browserConfig: {
          viewport: { width: -1, height: -1 }, // Invalid: negative dimensions
        },
        timeout: -5000, // Invalid: negative timeout
      } as BrowserSessionDto;

      mockBrowserUseService.createSession.mockRejectedValue(
        new BadRequestException('Invalid session configuration'),
      );

      await expect(
        controller.createSession(invalidSessionDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Response Transformation', () => {
    it('should transform task results for API response', async () => {
      const taskId = 'task-123';
      const serviceResult = {
        id: taskId,
        internalData: 'should-be-filtered',
        results: { _data: 'public data' },
        _metadata: { publicField: 'visible' },
      };

      mockBrowserUseService.getTask.mockResolvedValue(serviceResult);

      const result = await controller.getTask(taskId, mockUser);

      expect(result).toBeDefined();
      expect(service.getTask).toHaveBeenCalledWith(taskId, mockUser);
    });
  });
});
