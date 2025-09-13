import {
  Controller,
  Post,
  Body,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  UseInterceptors,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { EnterpriseRateLimitGuard as EnterpriseRateLimitGuard } from '../common/guards/rate-limit.guard';
import { SecuritySanitizationPipes } from '../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import {
  ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { ComputerUseService } from './computer-use.service';
import { AsyncJobService } from './async-job.service';
import { ComputerActionValidationPipe } from './dto/computer-action-validation.pipe';
import { ComputerActionDto } from './dto/computer-action.dto';
import {
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
  AsyncActionSubmissionDto,
} from './dto/async-job.dto';

// Define interfaces for proper error handling
interface ErrorWithMessage {
  message: string;
}

/**
 * OCR result data interface
 */
interface OcrData {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence?: number;
    text?: string;
  }>;
  words?: Array<{
    text: string;
    confidence: number;
    bbox: [number, number, number, number];
  }>;
  lines?: Array<{
    text: string;
    confidence: number;
    words: string[];
    bbox: [number, number, number, number];
  }>;
  processingTimeMs?: number;
  method?: string;
}

/**
 * Text detection result data interface
 */
interface TextDetectionData {
  detected: boolean;
  regions?: Array<{
    text: string;
    confidence: number;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  language?: string;
  processingTimeMs?: number;
  method?: string;
}

interface ErrorWithStack extends ErrorWithMessage {
  stack?: string;
}

// Type guard to check if an unknown error has a message property
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Type guard to check if an error has a stack property
function isErrorWithStack(error: unknown): error is ErrorWithStack {
  return (
    isErrorWithMessage(error) &&
    'stack' in error &&
    (typeof (error as Record<string, unknown>).stack === 'string' ||
      (error as Record<string, unknown>).stack === undefined)
  );
}

// Extract error message safely from unknown error
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

// Extract error stack safely from unknown error
function getErrorStack(error: unknown): string | undefined {
  if (isErrorWithStack(error)) return error.stack;
  return undefined;
}

// Define union type for all possible computer action response types
type ComputerActionResponse =
  | void
  | { image: string }
  | { x: number; y: number }
  | { success: boolean; message: string }
  | {
      success: boolean;
      data?: string;
      name?: string;
      size?: number;
      mediaType?: string;
      message?: string;
    }
  | {
      text: string;
      confidence: number;
      boundingBoxes?: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        confidence?: number;
        text?: string;
      }>;
      processingTimeMs: number;
      method: string;
    }
  | {
      found: boolean;
      matches: Array<{
        text: string;
        x: number;
        y: number;
        width: number;
        height: number;
        confidence: number;
      }>;
      processingTimeMs: number;
    }
  | {
      image: string;
      ocr?: OcrData;
      textDetection?: TextDetectionData;
      processingTimeMs: number;
      enhancementsApplied: string[];
    };

/**
 * Computer Use Controller - Secured Computer Automation API
 *
 * This controller provides enterprise-grade security for computer automation actions
 * including comprehensive input validation, sanitization, rate limiting, and
 * security monitoring for all computer control operations.
 *
 * Security Features:
 * - Rate limiting with suspicious activity detection
 * - Input sanitization and XSS/injection prevention
 * - Comprehensive request/response logging
 * - Malicious payload detection and blocking
 *
 * Dependencies: ComputerUseService for action execution
 */
@ApiTags('Computer Use API')
@Controller('computer-use')
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')
export class ComputerUseController {
  private readonly logger = new Logger(ComputerUseController.name);

  constructor(
    private readonly computerUseService: ComputerUseService,
    private readonly asyncJobService: AsyncJobService,
  ) {}

  // ===== ASYNC ENDPOINTS =====

  /**
   * Submit computer action for asynchronous execution
   *
   * This endpoint queues a computer action for background execution and returns
   * immediately with a job ID for tracking. Supports priority queuing, caching,
   * and comprehensive job lifecycle management.
   *
   * @param params - Validated computer action parameters
   * @param options - Async execution options (priority, timeout, caching)
   * @param user - Authenticated user context
   * @returns Promise<JobSubmissionResponseDto> - Job submission details with tracking ID
   */
  @Post('action/async')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Submit async computer action',
    description:
      'Submit a computer action for asynchronous execution. Returns immediately with job ID for tracking. Supports priority queuing and result caching.',
    operationId: 'submitAsyncComputerAction',
  })
  @ApiResponse({
    status: 202,
    description: 'Action submitted successfully for async execution',
    type: JobSubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid action parameters or async options',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ApiResponse({
    status: 503,
    description: 'Job queue full or service temporarily unavailable',
  })
  async submitAsyncAction(
    @Body(new ComputerActionValidationPipe())
    params: ComputerActionDto & AsyncActionSubmissionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobSubmissionResponseDto> {
    const operationId = `async_submit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Extract async options from the combined DTO
      const { priority, timeout, useCache, metadata, ...actionParams } = params;

      // Create safe copy for logging
      const paramsCopy = { ...actionParams };
      if (paramsCopy.action === 'write_file') {
        (paramsCopy as Record<string, unknown>).data = '[base64 data redacted]';
      }

      this.logger.log(
        `[${operationId}] Async computer action submission: ${JSON.stringify(paramsCopy)}`,
        {
          operationId,
          action: actionParams.action,
          userId: user.id,
          username: user.username,
          userRole: user.role,
          priority: priority,
          useCache: useCache,
          timeout: timeout,
        },
      );

      // Submit job to async service
      const jobResponse = await this.asyncJobService.submitJob(
        actionParams as ComputerActionDto,
        {
          priority,
          timeout,
          useCache,
          metadata: {
            ...metadata,
            userId: user.id,
            username: user.username,
            operationId,
          },
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Async job submitted successfully: ${jobResponse.jobId} (${processingTime}ms)`,
        {
          operationId,
          jobId: jobResponse.jobId,
          action: actionParams.action,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return jobResponse;
    } catch (_error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(_error);

      this.logger.error(
        `[${operationId}] Error submitting async computer action: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(_error),
        {
          operationId,
          action: params.action,
          processingTime,
          errorType: _error?.constructor?.name || 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      // Map specific errors to appropriate HTTP status codes
      if (
        errorMessage.includes('queue full') ||
        errorMessage.includes('capacity')
      ) {
        throw new HttpException(
          'Job queue is currently full. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to submit async computer action: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get job status and progress information
   *
   * Retrieves current status, progress percentage, and metadata for an async job.
   * Provides real-time tracking of job execution state and estimated completion.
   *
   * @param jobId - Unique job identifier from async submission
   * @param user - Authenticated user context
   * @returns Promise<JobStatusResponseDto> - Current job status and progress
   */
  @Get('jobs/:jobId/status')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get async job status',
    description:
      'Retrieve current status and progress information for an async computer action job.',
    operationId: 'getAsyncJobStatus',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier from async submission',
    example: 'job_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    type: JobStatusResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobStatusResponseDto> {
    const operationId = `status_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Job status request for: ${jobId}`, {
        operationId,
        jobId,
        userId: user.id,
        username: user.username,
      });

      const jobStatus = await this.asyncJobService.getJobStatus(jobId);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job status retrieved successfully: ${jobStatus.status} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          status: jobStatus.status,
          progress: jobStatus.progress,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return jobStatus;
    } catch (_error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(_error);

      this.logger.error(
        `[${operationId}] Error retrieving job status: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(_error),
        {
          operationId,
          jobId,
          processingTime,
          errorType: _error?.constructor?.name || 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      if (errorMessage.includes('not found')) {
        throw new HttpException(
          `Job not found: ${jobId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        `Failed to retrieve job status: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get job execution result
   *
   * Retrieves the final result of a completed async job including execution data,
   * performance metrics, and comprehensive metadata.
   *
   * @param jobId - Unique job identifier from async submission
   * @param user - Authenticated user context
   * @returns Promise<JobResultResponseDto> - Job execution result and metadata
   */
  @Get('jobs/:jobId/result')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get async job result',
    description:
      'Retrieve the execution result of a completed async computer action job.',
    operationId: 'getAsyncJobResult',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier from async submission',
    example: 'job_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Job result retrieved successfully',
    type: JobResultResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Job has not completed yet',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async getJobResult(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobResultResponseDto> {
    const operationId = `result_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Job result request for: ${jobId}`, {
        operationId,
        jobId,
        userId: user.id,
        username: user.username,
      });

      const jobResult = await this.asyncJobService.getJobResult(jobId);

      const processingTime = Date.now() - startTime;

      // Create safe copy for logging (avoid logging large base64 data)
      const resultCopy = { ...jobResult };
      if (resultCopy.result && typeof resultCopy.result === 'object') {
        const _result = resultCopy.result as Record<string, unknown>;
        if (
          _result.image &&
          typeof _result.image === 'string' &&
          _result.image.length > 100
        ) {
          _result.image = `[base64 image data - ${_result.image.length} chars]`;
        }
        if (
          _result.data &&
          typeof _result.data === 'string' &&
          _result.data.length > 100
        ) {
          _result.data = `[base64 file data - ${_result.data.length} chars]`;
        }
      }

      this.logger.log(
        `[${operationId}] Job result retrieved successfully: ${jobResult.status} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          status: jobResult.status,
          executionTimeMs: jobResult.executionTimeMs,
          processingTime,
          userId: user.id,
          username: user.username,
          resultSummary: resultCopy.result,
        },
      );

      return jobResult;
    } catch (_error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(_error);

      this.logger.error(
        `[${operationId}] Error retrieving job result: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(_error),
        {
          operationId,
          jobId,
          processingTime,
          errorType: _error?.constructor?.name || 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      if (errorMessage.includes('not found')) {
        throw new HttpException(
          `Job not found: ${jobId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (errorMessage.includes('not completed')) {
        throw new HttpException(
          `Job has not completed yet: ${jobId}`,
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        `Failed to retrieve job result: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel a pending or in-progress async job
   *
   * Attempts to cancel an async job that is either queued or currently executing.
   * Jobs that have already completed cannot be cancelled.
   *
   * @param jobId - Unique job identifier from async submission
   * @param user - Authenticated user context
   * @returns Promise<{ cancelled: boolean; message: string }> - Cancellation result
   */
  @Delete('jobs/:jobId')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Cancel async job',
    description:
      'Cancel a pending or in-progress async computer action job. Completed jobs cannot be cancelled.',
    operationId: 'cancelAsyncJob',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier from async submission',
    example: 'job_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Job cancellation processed',
    schema: {
      type: 'object',
      properties: {
        cancelled: { type: 'boolean' },
        message: { type: 'string' },
        jobId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async cancelJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ cancelled: boolean; message: string; jobId: string }> {
    const operationId = `cancel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Job cancellation request for: ${jobId}`,
        {
          operationId,
          jobId,
          userId: user.id,
          username: user.username,
        },
      );

      const cancelled = await this.asyncJobService.cancelJob(jobId);

      const processingTime = Date.now() - startTime;
      const message = cancelled
        ? 'Job cancelled successfully'
        : 'Job could not be cancelled (may be completed or not found)';

      this.logger.log(
        `[${operationId}] Job cancellation result: ${cancelled} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          cancelled,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return {
        cancelled,
        message,
        jobId,
      };
    } catch (_error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(_error);

      this.logger.error(
        `[${operationId}] Error cancelling job: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(_error),
        {
          operationId,
          jobId,
          processingTime,
          errorType: _error?.constructor?.name || 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to cancel job: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== SYNCHRONOUS ENDPOINT (Legacy Compatibility) =====

  /**
   * Execute a computer action with comprehensive error handling and logging
   *
   * Supports all computer automation actions including:
   * - Mouse operations (move, click, drag, scroll)
   * - Keyboard operations (type, press keys)
   * - Application control (launch, focus)
   * - File operations (read, write)
   * - Vision operations (screenshot, OCR, text finding)
   *
   * @param params - Validated computer action parameters
   * @returns Promise<ComputerActionResponse> - Response varies by action type
   * @throws HttpException - On action execution failure with detailed error info
   */
  @Post()
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Execute computer action',
    description:
      'Execute various computer control actions including mouse, keyboard, and application operations. Requires OPERATOR or ADMIN role.',
    operationId: 'executeComputerAction',
  })
  @ApiResponse({
    status: 200,
    description: 'Action executed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        result: { type: 'object' },
        operationId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid action parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async action(
    @Body(new ComputerActionValidationPipe()) params: ComputerActionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<ComputerActionResponse> {
    // Generate unique operation ID for tracking this action request
    const operationId = `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Create a safe copy for logging (avoid logging sensitive base64 data)
      const paramsCopy = { ...params };
      if (paramsCopy.action === 'write_file') {
        paramsCopy.data = 'base64 data';
      }

      this.logger.log(
        `[${operationId}] Computer action request: ${JSON.stringify(paramsCopy)}`,
        {
          operationId,
          action: params.action,
          userId: user.id,
          username: user.username,
          userRole: user.role,
        },
      );

      // Execute the computer action through the service
      // Cast to ComputerActionResponse since we know the service returns proper typed responses
      const _result = (await this.computerUseService.action(
        params,
      )) as ComputerActionResponse;

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Computer action completed successfully (${processingTime}ms)`,
        {
          operationId,
          action: params.action,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return _result;
    } catch (_error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(_error);
      const errorStack = getErrorStack(_error);

      // Log the error with comprehensive context for debugging
      this.logger.error(
        `[${operationId}] Error executing computer action: ${errorMessage} (${processingTime}ms)`,
        errorStack,
        {
          operationId,
          action: params.action,
          processingTime,
          errorType: _error?.constructor?.name || 'Unknown',
        },
      );

      // Throw HTTP exception with safe error message for client
      throw new HttpException(
        `Failed to execute computer action: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
