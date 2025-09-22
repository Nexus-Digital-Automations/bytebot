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
import {
  ParlantCritical,
  ParlantSecure,
  ParlantValidated,
  ParlantAdmin,
  ParlantBatch,
  SecurityLevel,
  ValidationMode,
  ConversationContext,
  ParlantValidationInterceptor,
} from '@bytebot/shared/src/parlant/parlant-validation.decorator';
import { ConversationContextParameter } from '@bytebot/shared/src/types/conversation-context.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { ComputerUseService } from './computer-use.service';
import { AsyncJobService } from './async-job.service';
import { EnhancedAsyncJobService } from './enhanced-async-job.service';
import { ComprehensiveJobOrchestratorService } from './services/comprehensive-job-orchestrator.service';
import { ComputerActionValidationPipe } from './dto/computer-action-validation.pipe';
import { BatchJobValidationPipe } from './pipes/batch-job-validation.pipe';
import { ComputerActionDto } from './dto/computer-action.dto';
import {
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
  AsyncActionSubmissionDto,
} from './dto/async-job.dto';
import {
  BatchJobSubmissionDto,
  BatchJobSubmissionResponseDto,
  JobSearchCriteriaDto,
  JobSearchResultsDto,
  JobAnalyticsDto,
  JobProgressUpdateDto,
} from './dto/batch-job.dto';
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
} // Extract error stack safely from unknown error
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
@UseInterceptors(LoggingInterceptor, ParlantValidationInterceptor)
@ApiBearerAuth('bearer')
export class ComputerUseController {
  private readonly logger = new Logger(ComputerUseController.name);

  constructor(
    private readonly computerUseService: ComputerUseService,
    private readonly asyncJobService: AsyncJobService,
    private readonly enhancedAsyncJobService: EnhancedAsyncJobService,
    private readonly comprehensiveJobOrchestrator: ComprehensiveJobOrchestratorService,
  ) {}

  // ===== ENHANCED ASYNC ENDPOINTS - ENTERPRISE BATCH & ANALYTICS =====

  /**
   * Submit batch of computer actions for asynchronous execution
   *
   * Enterprise-grade batch submission with dependency management, priority queuing,
   * and comprehensive execution control. Supports sequential, parallel, and mixed
   * execution modes with automatic dependency resolution.
   *
   * @param batchRequest Batch job submission with dependency configuration
   * @param user Authenticated user context
   * @returns Promise<BatchJobSubmissionResponseDto> Batch submission details with job IDs
   */
  @Post('jobs/batch')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Submit batch computer actions',
    description:
      'Submit multiple computer actions as a batch with dependency management and execution control. Supports sequential, parallel, and mixed execution modes.',
    operationId: 'submitBatchComputerActions',
  })
  @ApiResponse({
    status: 202,
    description: 'Batch submitted successfully for async execution',
    type: BatchJobSubmissionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid batch parameters or dependency configuration',
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
  @ParlantBatch(
    'Submit batch computer automation actions with dependency management and execution control',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'BATCH_COMPUTER_AUTOMATION',
      complianceFlags: ['BATCH_PROCESSING', 'SYSTEM_CONTROL', 'HIGH_RISK'],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      customRules: [
        {
          name: 'batch_size_validation',
          condition: 'batch_size <= 50',
          action: 'APPROVE',
          priority: 5,
        },
        {
          name: 'critical_action_detection',
          condition: 'contains_critical_actions',
          action: 'REQUIRE_CONFIRMATION',
          priority: 10,
        },
      ],
    },
  )
  async submitBatchActions(
    @Body(new BatchJobValidationPipe()) batchRequest: BatchJobSubmissionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BatchJobSubmissionResponseDto> {
    const operationId = `batch_submit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    try {
      this.logger.log(
        `[${operationId}] Batch computer action submission: ${batchRequest.jobs.length} jobs`,
        {
          operationId,
          userId: user.id,
          username: user.username,
          userRole: user.role,
          executionMode: batchRequest.executionMode as string,
          totalJobs: batchRequest.jobs.length,
          batchPriority: batchRequest.batchPriority,
        },
      );

      // Submit batch to enhanced service
      const batchResponse = await this.enhancedAsyncJobService.submitBatch(
        batchRequest,
        {
          userId: user.id,
          username: user.username,
          operationId,
          submittedVia: 'api',
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Batch submitted successfully: ${batchResponse.batchId} (${processingTime}ms)`,
        {
          operationId,
          batchId: batchResponse.batchId,
          totalJobs: batchResponse.totalJobs,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return batchResponse;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error submitting batch: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          totalJobs: batchRequest.jobs.length,
          executionMode: batchRequest.executionMode as string,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to submit batch computer actions: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search jobs with advanced filtering and pagination
   *
   * Enterprise-grade job search with comprehensive filtering capabilities including
   * status, priority, date ranges, execution times, and metadata search.
   *
   * @param criteria Search and filtering criteria
   * @param user Authenticated user context
   * @returns Promise<JobSearchResultsDto> Paginated search results
   */
  @Post('jobs/search')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Search jobs with advanced filtering',
    description:
      'Search and filter jobs with comprehensive criteria including status, priority, date ranges, execution times, and metadata search.',
    operationId: 'searchJobs',
  })
  @ApiResponse({
    status: 200,
    description: 'Job search results retrieved successfully',
    type: JobSearchResultsDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search criteria',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ParlantValidated({
    intent:
      'Search and filter computer automation job history with advanced filtering criteria',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.CONVERSATIONAL,
    businessCategory: 'JOB_SEARCH_MONITORING',
    complianceFlags: ['JOB_MONITORING', 'DATA_ACCESS'],
    cacheable: true,
    timeout: 8000,
  })
  async searchJobs(
    @Body() criteria: JobSearchCriteriaDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobSearchResultsDto> {
    const operationId = `job_search_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    try {
      this.logger.log(`[${operationId}] Job search request`, {
        operationId,
        userId: user.id,
        username: user.username,
        searchCriteria: {
          status: criteria.status,
          priority: criteria.priority,
          actionType: criteria.actionType,
          limit: criteria.limit,
          offset: criteria.offset,
        },
      });

      const searchResults = (await this.enhancedAsyncJobService.searchJobs(
        criteria,
      )) as JobSearchResultsDto;

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job search completed: ${(searchResults as JobSearchResultsDto).totalCount} total, ${(searchResults as JobSearchResultsDto).jobs.length} returned (${processingTime}ms)`,
        {
          operationId,
          totalCount: (searchResults as JobSearchResultsDto).totalCount,
          returnedCount: (searchResults as JobSearchResultsDto).jobs.length,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return searchResults as JobSearchResultsDto;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error searching jobs: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to search jobs: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get real-time job progress information
   *
   * Provides real-time progress tracking with current step information,
   * estimated completion times, and detailed progress metadata.
   *
   * @param jobId Unique job identifier
   * @param user Authenticated user context
   * @returns Promise<JobProgressUpdateDto> Real-time progress information
   */
  @Get('jobs/:jobId/progress')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get real-time job progress',
    description:
      'Retrieve real-time progress information including current step, completion estimates, and detailed progress metadata.',
    operationId: 'getJobProgress',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Job progress retrieved successfully',
    type: JobProgressUpdateDto,
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
  @ParlantValidated({
    intent:
      'Retrieve real-time progress information for computer automation job execution',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'JOB_PROGRESS_MONITORING',
    complianceFlags: ['REAL_TIME_MONITORING', 'JOB_TRACKING'],
    cacheable: true,
    timeout: 5000,
  })
  async getJobProgress(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobProgressUpdateDto> {
    const operationId = `progress_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    try {
      this.logger.log(`[${operationId}] Job progress request for: ${jobId}`, {
        operationId,
        jobId,
        userId: user.id,
        username: user.username,
      });

      const progressUpdate = (await this.enhancedAsyncJobService.getJobProgress(
        jobId,
      )) as JobProgressUpdateDto;

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job progress retrieved: ${(progressUpdate as JobProgressUpdateDto).progress}% (${processingTime}ms)`,
        {
          operationId,
          jobId,
          progress: (progressUpdate as JobProgressUpdateDto).progress,
          status: (progressUpdate as JobProgressUpdateDto).status,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return progressUpdate as JobProgressUpdateDto;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving job progress: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
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
        `Failed to retrieve job progress: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get comprehensive job analytics and performance metrics
   *
   * Provides detailed analytics including success rates, execution times,
   * action type breakdowns, priority distributions, and performance trends.
   *
   * @param timeframeHours Optional timeframe in hours (default: 24)
   * @param user Authenticated user context
   * @returns Promise<JobAnalyticsDto> Comprehensive analytics summary
   */
  @Get('jobs/analytics')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get job analytics and performance metrics',
    description:
      'Retrieve comprehensive job analytics including success rates, execution times, and performance trends.',
    operationId: 'getJobAnalytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Job analytics retrieved successfully',
    type: JobAnalyticsDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  @ParlantValidated({
    intent:
      'Retrieve comprehensive analytics and performance metrics for computer automation system',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'ANALYTICS_MONITORING',
    complianceFlags: ['PERFORMANCE_ANALYTICS', 'SYSTEM_METRICS'],
    cacheable: true,
    timeout: 10000,
  })
  async getJobAnalytics(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobAnalyticsDto> {
    const operationId = `analytics_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    try {
      this.logger.log(`[${operationId}] Job analytics request`, {
        operationId,
        userId: user.id,
        username: user.username,
      });

      const analytics = (await this.enhancedAsyncJobService.getJobAnalytics(
        24,
      )) as JobAnalyticsDto;

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job analytics retrieved: ${(analytics as JobAnalyticsDto).totalJobs} total jobs (${processingTime}ms)`,
        {
          operationId,
          totalJobs: (analytics as JobAnalyticsDto).totalJobs,
          successRate: (analytics as JobAnalyticsDto).successRate,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return analytics as JobAnalyticsDto;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving job analytics: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to retrieve job analytics: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel multiple jobs by batch ID or criteria
   *
   * Enterprise-grade bulk cancellation with flexible criteria including
   * batch ID, job status, and age-based filtering.
   *
   * @param batchId Optional batch ID to cancel all jobs in batch
   * @param user Authenticated user context
   * @returns Promise<{ cancelled: string[]; failed: string[] }> Cancellation results
   */
  @Delete('jobs/batch/:batchId')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Cancel jobs by batch ID',
    description:
      'Cancel all jobs within a specific batch. Useful for stopping entire workflows or cleaning up failed batches.',
    operationId: 'cancelJobsBatch',
  })
  @ApiParam({
    name: 'batchId',
    description: 'Batch identifier to cancel all jobs within',
    example: 'batch_1702983456789_xyz789',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch cancellation processed',
    schema: {
      type: 'object',
      properties: {
        cancelled: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of successfully cancelled job IDs',
        },
        failed: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of job IDs that could not be cancelled',
        },
        batchId: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Batch not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async cancelJobsBatch(
    @Param('batchId') batchId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ cancelled: string[]; failed: string[]; batchId: string }> {
    const operationId = `cancel_batch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();
    try {
      this.logger.log(
        `[${operationId}] Batch cancellation request for: ${batchId}`,
        { operationId, batchId, userId: user.id, username: user.username },
      );

      const results = (await this.enhancedAsyncJobService.cancelJobsByCriteria({
        batchId,
      })) as { cancelled: string[]; failed: string[] };

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Batch cancellation completed: ${(results as { cancelled: string[]; failed: string[] }).cancelled.length} cancelled, ${(results as { cancelled: string[]; failed: string[] }).failed.length} failed (${processingTime}ms)`,
        {
          operationId,
          batchId,
          cancelledCount: (results as { cancelled: string[]; failed: string[] })
            .cancelled.length,
          failedCount: (results as { cancelled: string[]; failed: string[] })
            .failed.length,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return {
        ...results,
        batchId,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error cancelling batch: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          batchId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to cancel batch: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== COMPREHENSIVE JOB MANAGEMENT ENDPOINTS =====

  /**
   * Submit computer action using comprehensive job management system
   *
   * Enterprise-grade job submission with advanced monitoring, error recovery,
   * and comprehensive result management. Uses the new comprehensive orchestrator
   * for superior performance and reliability.
   */
  @Post('comprehensive/submit')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Submit job via comprehensive management system',
    description: 'Submit computer action using the new comprehensive job management system with enhanced monitoring and error recovery',
    operationId: 'submitComprehensiveJob',
  })
  @ApiResponse({
    status: 202,
    description: 'Job submitted successfully via comprehensive system',
  })
  @ParlantCritical(
    'Submit computer automation job via comprehensive enterprise job management system',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'COMPREHENSIVE_JOB_SUBMISSION',
      complianceFlags: ['ENTERPRISE_JOB_SYSTEM', 'ADVANCED_MONITORING'],
      requiredRoles: ['OPERATOR', 'ADMIN'],
    },
  )
  async submitComprehensiveJob(
    @Body(new ComputerActionValidationPipe()) params: ComputerActionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ jobId: string; submittedAt: string; estimatedCompletionMs?: number }> {
    const operationId = `comprehensive_submit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Comprehensive job submission: ${params.action}`,
        {
          operationId,
          action: params.action,
          userId: user.id,
          username: user.username,
        },
      );

      // Submit job via comprehensive orchestrator
      const jobId = await this.comprehensiveJobOrchestrator.submitJob(
        params.action,
        params,
        {
          userId: user.id,
          username: user.username,
          operationId,
          source: 'comprehensive-api',
        },
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Comprehensive job submitted: ${jobId} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          action: params.action,
          processingTime,
          userId: user.id,
        },
      );

      return {
        jobId,
        submittedAt: new Date().toISOString(),
        estimatedCompletionMs: 5000, // Default estimate
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Comprehensive job submission failed: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          action: params.action,
          processingTime,
          userId: user.id,
        },
      );

      throw new HttpException(
        `Failed to submit comprehensive job: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get comprehensive job status with detailed monitoring information
   */
  @Get('comprehensive/jobs/:jobId/status')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get comprehensive job status',
    description: 'Retrieve detailed status information from comprehensive job management system',
    operationId: 'getComprehensiveJobStatus',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job identifier from comprehensive system',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive job status retrieved',
  })
  @ParlantValidated({
    intent: 'Retrieve comprehensive job status with detailed monitoring information',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'COMPREHENSIVE_JOB_MONITORING',
    complianceFlags: ['ENTERPRISE_MONITORING', 'JOB_TRACKING'],
  })
  async getComprehensiveJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `comprehensive_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Comprehensive status request: ${jobId}`, {
        operationId,
        jobId,
        userId: user.id,
      });

      const status = await this.comprehensiveJobOrchestrator.getJobStatus(jobId);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Comprehensive status retrieved: ${status.status} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          status: status.status,
          processingTime,
        },
      );

      return status;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Comprehensive status retrieval failed: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          processingTime,
        },
      );

      if (errorMessage.includes('not found')) {
        throw new HttpException(
          `Job not found: ${jobId}`,
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        `Failed to retrieve comprehensive job status: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get comprehensive job result with enhanced metadata
   */
  @Get('comprehensive/jobs/:jobId/result')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get comprehensive job result',
    description: 'Retrieve job result with enhanced metadata from comprehensive system',
    operationId: 'getComprehensiveJobResult',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job identifier from comprehensive system',
  })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive job result retrieved',
  })
  @ParlantValidated({
    intent: 'Retrieve comprehensive job execution results with enhanced metadata',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.CONVERSATIONAL,
    businessCategory: 'COMPREHENSIVE_RESULT_RETRIEVAL',
    complianceFlags: ['RESULT_ACCESS', 'ENHANCED_METADATA'],
  })
  async getComprehensiveJobResult(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `comprehensive_result_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Comprehensive result request: ${jobId}`, {
        operationId,
        jobId,
        userId: user.id,
      });

      const result = await this.comprehensiveJobOrchestrator.getJobResult(jobId);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Comprehensive result retrieved (${processingTime}ms)`,
        {
          operationId,
          jobId,
          status: result.status,
          processingTime,
        },
      );

      return result;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Comprehensive result retrieval failed: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          processingTime,
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
          `Job not completed: ${jobId}`,
          HttpStatus.CONFLICT,
        );
      }

      throw new HttpException(
        `Failed to retrieve comprehensive job result: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Cancel comprehensive job with enhanced cleanup
   */
  @Delete('comprehensive/jobs/:jobId')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Cancel comprehensive job',
    description: 'Cancel job with enhanced cleanup via comprehensive system',
    operationId: 'cancelComprehensiveJob',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Job identifier from comprehensive system',
  })
  @ApiResponse({
    status: 200,
    description: 'Job cancellation processed',
  })
  async cancelComprehensiveJob(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ cancelled: boolean; message: string; jobId: string }> {
    const operationId = `comprehensive_cancel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Comprehensive cancel request: ${jobId}`, {
        operationId,
        jobId,
        userId: user.id,
      });

      const cancelled = await this.comprehensiveJobOrchestrator.cancelJob(jobId);

      const processingTime = Date.now() - startTime;
      const message = cancelled
        ? 'Job cancelled successfully with comprehensive cleanup'
        : 'Job could not be cancelled (may be completed or not found)';

      this.logger.log(
        `[${operationId}] Comprehensive cancel result: ${cancelled} (${processingTime}ms)`,
        {
          operationId,
          jobId,
          cancelled,
          processingTime,
        },
      );

      return {
        cancelled,
        message,
        jobId,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Comprehensive cancel failed: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          processingTime,
        },
      );

      throw new HttpException(
        `Failed to cancel comprehensive job: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get comprehensive system health and performance metrics
   */
  @Get('comprehensive/system/health')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get comprehensive system health',
    description: 'Retrieve comprehensive job management system health and performance metrics',
    operationId: 'getComprehensiveSystemHealth',
  })
  @ApiResponse({
    status: 200,
    description: 'System health metrics retrieved',
  })
  @ParlantValidated({
    intent: 'Retrieve comprehensive job management system health and performance metrics',
    securityLevel: SecurityLevel.LOW,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'SYSTEM_HEALTH_MONITORING',
    complianceFlags: ['SYSTEM_MONITORING', 'PERFORMANCE_METRICS'],
  })
  async getComprehensiveSystemHealth(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `comprehensive_health_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Comprehensive health check request`, {
        operationId,
        userId: user.id,
      });

      const health = await this.comprehensiveJobOrchestrator.getSystemHealth();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Comprehensive health retrieved (${processingTime}ms)`,
        {
          operationId,
          processingTime,
          systemStatus: health.status,
        },
      );

      return health;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Comprehensive health check failed: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          processingTime,
        },
      );

      throw new HttpException(
        `Failed to retrieve comprehensive system health: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== ASYNC ENDPOINTS (Legacy Compatibility) =====

  /**
   * Submit computer action for asynchronous execution (Legacy)
   *
   * Legacy endpoint for single job submission. For enhanced functionality including
   * batch operations and dependency management, use the /jobs/batch endpoint.
   *
   * @param params - Validated computer action parameters
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
  @ParlantCritical(
    'Submit computer automation action for asynchronous execution with comprehensive security validation',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'ASYNC_COMPUTER_AUTOMATION',
      complianceFlags: [
        'ASYNC_EXECUTION',
        'SYSTEM_CONTROL',
        'SECURITY_CRITICAL',
      ],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      timeout: 30000,
      cacheable: false,
      customRules: [
        {
          name: 'destructive_action_validation',
          condition:
            'action_type in ["file_delete", "system_shutdown", "process_kill"]',
          action: 'REQUIRE_CONFIRMATION',
          priority: 10,
        },
        {
          name: 'network_action_validation',
          condition: 'action_type in ["network_request", "download_file"]',
          action: 'REQUIRE_CONFIRMATION',
          priority: 8,
        },
      ],
    },
  )
  async submitAsyncAction(
    @Body(new ComputerActionValidationPipe())
    params: ComputerActionDto & AsyncActionSubmissionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobSubmissionResponseDto> {
    const operationId = `async_submit${Date.now()}${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Extract async options from the combined DTO
      const { priority, timeout, useCache, metadata, ...actionParams } =
        params as AsyncActionSubmissionDto;

      // Create safe copy for logging
      const paramsCopy = { ...actionParams } as Record<string, unknown>;
      if ((paramsCopy as { action?: string }).action === 'write_file') {
        (paramsCopy as Record<string, unknown>).data = '[base64 data redacted]';
      }

      this.logger.log(
        `[${operationId}] Async computer action submission: ${JSON.stringify(paramsCopy)}`,
        {
          operationId,
          action: (actionParams as ComputerActionDto).action,
          userId: user.id,
          username: user.username,
          userRole: user.role,
          priority: priority as JobPriority,
          useCache: useCache as boolean,
          timeout: timeout as number,
        },
      );

      // Submit job to async service
      const jobResponse = await this.asyncJobService.submitJob(
        actionParams as ComputerActionDto,
        {
          priority: priority as JobPriority,
          timeout: timeout as number,
          useCache: useCache as boolean,
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
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error submitting computer action: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          action: params.action,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
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
  @ParlantValidated({
    intent:
      'Retrieve current status and progress information for asynchronous computer automation job',
    securityLevel: SecurityLevel.LOW,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'JOB_STATUS_MONITORING',
    complianceFlags: ['STATUS_MONITORING', 'JOB_TRACKING'],
    cacheable: true,
    timeout: 3000,
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobStatusResponseDto> {
    const operationId = `status${Date.now()}${Math.random().toString(36).substring(7)}`;
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
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving job status: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
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
  @ParlantValidated({
    intent:
      'Retrieve execution results and output data from completed computer automation job',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.CONVERSATIONAL,
    businessCategory: 'JOB_RESULT_RETRIEVAL',
    complianceFlags: ['RESULT_ACCESS', 'DATA_RETRIEVAL'],
    cacheable: true,
    timeout: 8000,
  })
  async getJobResult(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobResultResponseDto> {
    const operationId = `result${Date.now()}${Math.random().toString(36).substring(7)}`;
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
        const result = resultCopy.result as Record<string, unknown>;
        if (
          result.image &&
          typeof result.image === 'string' &&
          result.image.length > 100
        ) {
          result.image = `[base64 image data - ${result.image.length} chars]`;
        }
        if (
          result.data &&
          typeof result.data === 'string' &&
          result.data.length > 100
        ) {
          result.data = `[base64 file data - ${result.data.length} chars]`;
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
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving job result: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
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
    const operationId = `cancel${Date.now()}${Math.random().toString(36).substring(7)}`;
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
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error cancelling job: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
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
  @ParlantCritical(
    'Execute immediate computer automation action with real-time system control and comprehensive validation',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'DIRECT_COMPUTER_AUTOMATION',
      complianceFlags: [
        'IMMEDIATE_EXECUTION',
        'SYSTEM_CONTROL',
        'HIGH_RISK',
        'REAL_TIME',
      ],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      timeout: 45000,
      cacheable: false,
      customRules: [
        {
          name: 'screenshot_action_validation',
          condition: 'action === "screenshot"',
          action: 'APPROVE',
          priority: 2,
        },
        {
          name: 'file_write_validation',
          condition: 'action === "write_file"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 9,
        },
        {
          name: 'mouse_click_validation',
          condition: 'action === "click"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 7,
        },
        {
          name: 'keyboard_input_validation',
          condition: 'action === "type"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 8,
        },
        {
          name: 'application_launch_validation',
          condition: 'action === "launch_app"',
          action: 'REQUIRE_CONFIRMATION',
          priority: 9,
        },
      ],
    },
  )
  async action(
    @Body(new ComputerActionValidationPipe()) params: ComputerActionDto,
    @CurrentUser() user: ByteBotdUser,
    @ConversationContext() conversationContext?: ConversationContextParameter,
  ): Promise<ComputerActionResponse> {
    // Generate unique operation ID for tracking this action request
    const operationId = `action${Date.now()}${Math.random().toString(36).substring(7)}`;
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
          conversationId: conversationContext?.conversationId,
          securityLevel: conversationContext?.securityLevel,
          validationMode: conversationContext?.validationMode,
        },
      );

      // Execute the computer action through the service
      // Cast to ComputerActionResponse since we know the service returns proper typed responses
      const result = (await this.computerUseService.action(
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
          conversationId: conversationContext?.conversationId,
          validationApproved: true,
        },
      );

      return result;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);

      // Log the error with comprehensive context for debugging
      this.logger.error(
        `[${operationId}] Error executing computer action: ${errorMessage} (${processingTime}ms)`,
        errorStack,
        {
          operationId,
          action: params.action,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          conversationId: conversationContext?.conversationId,
          securityLevel: conversationContext?.securityLevel,
        },
      );

      // Throw HTTP exception with safe error message for client
      throw new HttpException(
        `Failed to execute computer action: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Execute computer action (legacy method for backward compatibility)
   * @deprecated Use action() method instead
   */
  @Post('execute')
  @ApiOperation({
    summary: 'Execute computer action (legacy)',
    description:
      'Legacy endpoint for executing computer actions. Use /action instead.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
  @OperatorOrAdmin()
  @UsePipes(
    new ComputerActionValidationPipe(),
    SecuritySanitizationPipes.HIGH_SECURITY,
  )
  @UseInterceptors(LoggingInterceptor)
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  async executeAction(
    @Body() params: ComputerActionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<ComputerActionResponse> {
    return this.action(params, user);
  }

  /**
   * Capture screenshot (convenience method)
   */
  @Post('screenshot')
  @ApiOperation({
    summary: 'Capture screenshot',
    description: 'Convenience endpoint for capturing screenshots',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
  @OperatorOrAdmin()
  @UseInterceptors(LoggingInterceptor)
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  async captureScreenshot(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<ComputerActionResponse> {
    const screenshotAction: ComputerActionDto = {
      action: 'screenshot',
    };
    return this.action(screenshotAction, user);
  }
}
