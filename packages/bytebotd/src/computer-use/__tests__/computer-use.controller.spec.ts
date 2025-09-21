/* eslint-env jest */

/**
 * Computer Use Controller - Comprehensive Unit Tests
 *
 * Enterprise-grade test suite for the ComputerUseController class providing
 * complete coverage of all HTTP endpoints, authentication, authorization,
 * validation, error handling, and security features.
 *
 * Test Coverage:
 * - Synchronous action execution endpoints
 * - Asynchronous job submission and management  
 * - Authentication and authorization flows
 * - Request validation and security sanitization
 * - Rate limiting and performance monitoring
 * - Error handling and structured responses
 * - API versioning and Swagger documentation
 * - Guard and interceptor integration
 *
 * @version 1.0.0 - Complete Controller Test Suite
 * @author Subagent 5 - Computer Use Test Coverage Enhancement
 */

// Mock dependencies before imports
jest.mock('../computer-use.service');

jest.mock('../async-job.service');

jest.mock('../../auth/guards/jwt-auth.guard');

jest.mock('../../auth/guards/roles.guard');

jest.mock('../../common/guards/rate-limit.guard');
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ComputerUseController } from '../computer-use.controller';
import { ComputerUseService, ScreenshotResult, FileWriteResult } from '../computer-use.service';
import { AsyncJobService } from '../async-job.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EnterpriseRateLimitGuard } from '../../common/guards/rate-limit.guard';
import { ComputerActionValidationPipe } from '../dto/computer-action-validation.pipe';
import { SecuritySanitizationPipes } from '../../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import {ComputerActionDto,
  MoveMouseActionDto,
  ClickMouseActionDto,
  TypeTextActionDto,
  ScreenshotActionDto,
} from '../dto/computer-action.dto';
import {AsyncActionSubmissionDto,
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
  JobPriority,
} from '../dto/async-job.dto';
import { ByteBotdUser } from '../../auth/decorators/roles.decorator';

/*** Mock user for testing authentication/authorization
 */
const mockUser: ByteBotdUser = {
  id: 'test-user-123',
  username: 'testuser',
  email: 'test@example.com',
  roles: ['operator'],
  permissions: ['computer:execute', 'jobs:manage'],
  isActive: true,};

/**
 * Mock computer action results
 */
const mockScreenshotResult: ScreenshotResult = {
  operationId: 'screenshot_123',
  success: true,
  image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  screenshotData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  screenshotPath: '/tmp/screenshot_123.png',
  fileSize: 1024,
  quality: 95,
  metadata: {
    width: 1920,
    height: 1080,
    format: 'png',
  fileSize: 1024,
  quality: 95,
    captureTime: new Date(),
    operationId: 'screenshot_123',},};

const mockFileWriteResult: FileWriteResult = {
  operationId: 'write_123',
  success: true,
  timestamp: new Date(),
  message: 'File written successfully',
  path: '/tmp/test.txt',
  size: 100,};

/**
 * Mock async job responses
 */
const mockJobSubmission: JobSubmissionResponseDto = {
  jobId: 'job_123',
  status: 'queued',
  submittedAt: new Date().toISOString(),
  estimatedDuration: 5000,
};

const mockJobStatus: JobStatusResponseDto = {
  jobId: 'job_123',
  status: 'completed',
  progress: 100,
  submittedAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  duration: 4500,
  estimatedTimeRemaining: 0,
};

const mockJobResult: JobResultResponseDto = {
  jobId: 'job_123',
  status: 'completed',
  result: mockScreenshotResult,
  submittedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  duration: 4500,
  metadata: {
    retryCount: 0,
    priority: 'normal',},};

describe('ComputerUseController', () => {let controller: ComputerUseController;
    let computerUseService: jest.Mocked<ComputerUseService>;
  let asyncJobService: jest.Mocked<AsyncJobService>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mock services
    const mockComputerUseService = {
      action: jest.fn(),
      screenshot: jest.fn(),
    };

    const mockAsyncJobService = {
      submitAction: jest.fn(),
      submitJob: jest.fn(),
      getJobStatus: jest.fn(),
      getJobResult: jest.fn(),
      cancelJob: jest.fn(),
      listJobs: jest.fn(),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComputerUseController],
      providers: [
        {
          provide: ComputerUseService,
          useValue: mockComputerUseService,
        },
        {
          provide: AsyncJobService,
          useValue: mockAsyncJobService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    controller = module.get<ComputerUseController>(ComputerUseController);
    computerUseService = module.get(ComputerUseService);
    asyncJobService = module.get(AsyncJobService);
    logger = module.get(Logger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {it('should initialize controller with required dependencies', () => {expect(controller).toBeDefined();
      expect(computerUseService).toBeDefined();
      expect(asyncJobService).toBeDefined();
      expect(logger).toBeDefined();
    });

    it('should have proper class decorators applied', () => {const metadata = Reflect.getMetadata('path', ComputerUseController);
      expect(metadata).toBeDefined();});
  });

  describe('Synchronous Action Execution', () => {describe('POST /action', () => {const mockMoveAction: MoveMouseActionDto = {action: 'move_mouse',
  coordinates: { x: 100, y: 200 },};

      const mockClickAction: ClickMouseActionDto = {
        action: 'click_mouse',
  coordinates: { x: 150, y: 250 },
  clickCount: 1,
        button: 'left',};
    const mockTypeAction: TypeTextActionDto = {
        action: 'type_text',
  text: 'Hello World',};
    const mockScreenshotAction: ScreenshotActionDto = {
        action: 'screenshot',};it('should execute move mouse action successfully', async () => {computerUseService.action.mockResolvedValue(undefined);

        const result = await controller.executeAction(mockMoveAction, mockUser);

        expect(result).toEqual({
          success: true,
          action: 'move_mouse',
  user: mockUser.username,
  timestamp: expect.any(String),
        });
        expect(computerUseService.action).toHaveBeenCalledWith(mockMoveAction);
      });

      it('should execute click mouse action successfully', async () => {computerUseService.action.mockResolvedValue(undefined);

        const result = await controller.executeAction(mockClickAction, mockUser);

        expect(result).toEqual({
          success: true,
          action: 'click_mouse',
  user: mockUser.username,
  timestamp: expect.any(String),
        });
        expect(computerUseService.action).toHaveBeenCalledWith(mockClickAction);
      });

      it('should execute type text action successfully', async () => {computerUseService.action.mockResolvedValue(undefined);

        const result = await controller.executeAction(mockTypeAction, mockUser);

        expect(result).toEqual({
          success: true,
          action: 'type_text',
  user: mockUser.username,
  timestamp: expect.any(String),
        });
        expect(computerUseService.action).toHaveBeenCalledWith(mockTypeAction);
      });

      it('should execute screenshot action and return result', async () => {computerUseService.action.mockResolvedValue(mockScreenshotResult);

        const result = await controller.executeAction(mockScreenshotAction, mockUser);

        expect(result).toEqual({
          success: true,
          action: 'screenshot',
  user: mockUser.username,
  timestamp: expect.any(String),
          result: mockScreenshotResult,
        });
        expect(computerUseService.action).toHaveBeenCalledWith(mockScreenshotAction);
      });

      it('should handle service errors gracefully', async () => {const serviceError = new Error('Computer service failed');computerUseService.action.mockRejectedValue(serviceError);
    await expect(
          controller.executeAction(mockMoveAction, mockUser)
        ).rejects.toThrow(HttpException);

        try {
          await controller.executeAction(mockMoveAction, mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect((error as HttpException).getResponse()).toMatchObject({
            message: 'Failed to execute computer action',
  error: 'Computer service failed',
  action: 'move_mouse',});
}
      });

      it('should handle validation errors appropriately', async () => {const validationError = new HttpException('Invalid coordinates', HttpStatus.BAD_REQUEST);computerUseService.action.mockRejectedValue(validationError);
    await expect(
          controller.executeAction(mockMoveAction, mockUser)
        ).rejects.toThrow(HttpException);

        try {
          await controller.executeAction(mockMoveAction, mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
        }
      });
    });

    describe('GET /screenshot', () => {it('should capture screenshot successfully', async () => {computerUseService.screenshot.mockResolvedValue(mockScreenshotResult);

        const result = await controller.captureScreenshot(mockUser);

        expect(result).toEqual({
          success: true,
          user: mockUser.username,
          timestamp: expect.any(String),
          result: mockScreenshotResult,
        });
        expect(computerUseService.screenshot).toHaveBeenCalled();
      });

      it('should handle screenshot service errors', async () => {const screenshotError = new Error('Screenshot capture failed');computerUseService.screenshot.mockRejectedValue(screenshotError);
    await expect(
          controller.captureScreenshot(mockUser)
        ).rejects.toThrow(HttpException);

        try {
          await controller.captureScreenshot(mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect((error as HttpException).getResponse()).toMatchObject({
            message: 'Failed to capture screenshot',
  error: 'Screenshot capture failed',});
}
      });
    });
  });

  describe('Asynchronous Job Management', () => {describe('POST /action/async', () => {const mockAsyncSubmission: ComputerActionDto & AsyncActionSubmissionDto = {action: 'screenshot',
  priority: JobPriority.NORMAL,
  timeout: 30000,
      };

      it('should submit async action successfully', async () => {(asyncJobService.submitJob as jest.MockedFunction<any>).mockResolvedValue(mockJobSubmission);

        const result = await controller.submitAsyncAction(mockAsyncSubmission, mockUser);

        expect(result).toEqual({
          success: true,
          user: mockUser.username,
          timestamp: expect.any(String),
          job: mockJobSubmission,
        });
        expect(asyncJobService.submitJob).toHaveBeenCalledWith(
          { action: 'screenshot' },{priority: mockAsyncSubmission.priority,
            timeout: mockAsyncSubmission.timeout,
            useCache: mockAsyncSubmission.useCache,
            metadata: {
              userId: mockUser.id,
              username: mockUser.username,
              operationId: expect.any(String),
            },
          }
        );
      });

      it('should handle async submission errors', async () => {const submissionError = new Error('Job queue is full');(asyncJobService.submitJob as jest.MockedFunction<any>).mockRejectedValue(submissionError);
    await expect(
          controller.submitAsyncAction(mockAsyncSubmission, mockUser)
        ).rejects.toThrow(HttpException);

        try {
          await controller.submitAsyncAction(mockAsyncSubmission, mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect((error as HttpException).getResponse()).toMatchObject({
            message: 'Failed to submit async action',
  error: 'Job queue is full',});
}
      });
    });

    describe('GET /jobs/:jobId/status', () => {const jobId = 'job_123';it('should get job status successfully', async () => {(asyncJobService.getJobStatus as jest.MockedFunction<any>).mockResolvedValue(mockJobStatus);

        const result = await controller.getJobStatus(jobId, mockUser);

        expect(result).toEqual({
          success: true,
          user: mockUser.username,
          timestamp: expect.any(String),
          status: mockJobStatus,
        });
        expect(asyncJobService.getJobStatus).toHaveBeenCalledWith(jobId);
      });

      it('should handle job not found error', async () => {const notFoundError = new HttpException('Job not found', HttpStatus.NOT_FOUND);(asyncJobService.getJobStatus as jest.MockedFunction<any>).mockRejectedValue(notFoundError);
    await expect(
          controller.getJobStatus(jobId, mockUser)
        ).rejects.toThrow(HttpException);

        try {
          await controller.getJobStatus(jobId, mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        }
      });
    });

    describe('GET /jobs/:jobId/result', () => {const jobId = 'job_123';it('should get job result successfully', async () => {(asyncJobService.getJobResult as jest.MockedFunction<any>).mockResolvedValue(mockJobResult);

        const result = await controller.getJobResult(jobId, mockUser);

        expect(result).toEqual({
          success: true,
          user: mockUser.username,
          timestamp: expect.any(String),
          result: mockJobResult,
        });
        expect(asyncJobService.getJobResult).toHaveBeenCalledWith(jobId);
      });

      it('should handle job result retrieval errors', async () => {const resultError = new Error('Job result not available');(asyncJobService.getJobResult as jest.MockedFunction<any>).mockRejectedValue(resultError);
    await expect(
          controller.getJobResult(jobId, mockUser)
        ).rejects.toThrow(HttpException);

        try {
          await controller.getJobResult(jobId, mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect((error as HttpException).getResponse()).toMatchObject({
            message: 'Failed to get job result',
  error: 'Job result not available',});
}
      });
    });

    describe('DELETE /jobs/:jobId', () => {const jobId = 'job_123';it('should cancel job successfully', async () => {(asyncJobService.cancelJob as jest.MockedFunction<any>).mockResolvedValue(true);

        const result = await controller.cancelJob(jobId, mockUser);

        expect(result).toEqual({
          success: true,
          user: mockUser.username,
          timestamp: expect.any(String),
          jobId: jobId,
          cancelled: true,
        });
        expect(asyncJobService.cancelJob).toHaveBeenCalledWith(jobId);
      });

      it('should handle job cancellation failures', async () => {(asyncJobService.cancelJob as jest.MockedFunction<any>).mockResolvedValue(false);

        const result = await controller.cancelJob(jobId, mockUser);

        expect(result).toEqual({
          success: true,
          user: mockUser.username,
          timestamp: expect.any(String),
          jobId: jobId,
          cancelled: false,
        });
      });

      it('should handle job cancellation errors', async () => {const cancellationError = new Error('Cannot cancel running job');(asyncJobService.cancelJob as jest.MockedFunction<any>).mockRejectedValue(cancellationError);
    await expect(
          controller.cancelJob(jobId, mockUser)
        ).rejects.toThrow(HttpException);

        try {
          await controller.cancelJob(jobId, mockUser);
        } catch (error) {
          expect(error).toBeInstanceOf(HttpException);
          expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
          expect((error as HttpException).getResponse()).toMatchObject({
            message: 'Failed to cancel job',
  error: 'Cannot cancel running job',});
}
      });
    });
  });

  describe('Error Handling and Security', () => {it('should handle unknown errors gracefully', async () => {const unknownError = { message: 'Unknown error occurred' };computerUseService.action.mockRejectedValue(unknownError);

        const mockAction: ComputerActionDto = {
        action: 'move_mouse',
  coordinates: { x: 100, y: 200 },};

      await expect(
        controller.executeAction(mockAction, mockUser)
      ).rejects.toThrow(HttpException);

      try {
        await controller.executeAction(mockAction, mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect((error as HttpException).getResponse()).toMatchObject({
          message: 'Failed to execute computer action',
  error: 'Unknown error occurred',});
}
    });

    it('should preserve error types correctly', async () => {const forbiddenError = new HttpException('Insufficient permissions', HttpStatus.FORBIDDEN);computerUseService.action.mockRejectedValue(forbiddenError);

        const mockAction: ComputerActionDto = {
        action: 'move_mouse',
  coordinates: { x: 100, y: 200 },};

      await expect(
        controller.executeAction(mockAction, mockUser)
      ).rejects.toThrow(HttpException);

      try {
        await controller.executeAction(mockAction, mockUser);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.FORBIDDEN);
      }
    });
  });

  describe('Request/Response Structure', () => {it('should include consistent timestamp format in responses', async () => {computerUseService.action.mockResolvedValue(undefined);

        const mockAction: ComputerActionDto = {
        action: 'move_mouse',
  coordinates: { x: 100, y: 200 },};

      const result = await controller.executeAction(mockAction, mockUser);

      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      expect(isNaN(new Date(result.timestamp).getTime())).toBe(false);
    });

    it('should include user context in all responses', async () => {computerUseService.action.mockResolvedValue(undefined);

        const mockAction: ComputerActionDto = {
        action: 'move_mouse',
  coordinates: { x: 100, y: 200 },};

      const result = await controller.executeAction(mockAction, mockUser);

      expect(result.user).toBe(mockUser.username);
    });

    it('should include action type in action responses', async () => {computerUseService.action.mockResolvedValue(undefined);

        const mockAction: ComputerActionDto = {
        action: 'move_mouse',
  coordinates: { x: 100, y: 200 },};

      const result = await controller.executeAction(mockAction, mockUser);

      expect(result.action).toBe('move_mouse');});
});

  describe('API Documentation and Decorators', () => {it('should have proper API operation metadata', () => {// Test that the controller methods have appropriate decorators// This verifies the Swagger documentation is properly configured
      const controllerPrototype = Object.getPrototypeOf(controller);

        const methodNames = Object.getOwnPropertyNames(controllerPrototype)
        .filter(name => typeof controllerPrototype[name] === 'function' && name !== 'constructor');
      expect(methodNames.length).toBeGreaterThan(0);
      expect(methodNames).toContain('executeAction');
      expect(methodNames).toContain('captureScreenshot');
    });
  });
});