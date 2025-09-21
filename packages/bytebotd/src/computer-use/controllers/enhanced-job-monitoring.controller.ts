/**
 * Enhanced Job Monitoring Controller - Advanced Job Status and Analytics API
 *
 * Provides enterprise-grade endpoints for comprehensive job monitoring,
 * real-time status tracking, performance analytics, and system health monitoring.
 *
 * Features:
 * - Enhanced job status with comprehensive metrics
 * - Bulk job status operations for efficiency
 * - Real-time system health monitoring
 * - Performance analytics and trend analysis
 * - Predictive completion time estimation
 * - Advanced alerting and notification system
 *
 * @author Claude Code - Async Job Enhancement Specialist
 * @version 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
  UsePipes,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiTags,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { EnterpriseRateLimitGuard } from '../../common/guards/rate-limit.guard';
import { SecuritySanitizationPipes } from '../../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../../auth/decorators/roles.decorator';
import {
  ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../../common/versioning/api-version.decorator';
import {
  ParlantValidated,
  SecurityLevel,
  ValidationMode,
} from '@bytebot/shared/src/parlant/parlant-validation.decorator';
import { JobMonitoringEnhancedService } from '../services/job-monitoring-enhanced.service';
import {
  EnhancedJobStatusResponseDto,
  BulkJobStatusRequestDto,
  BulkJobStatusResponseDto,
} from '../dto/enhanced-job-status.dto';

// Define error helper interfaces
interface ErrorWithMessage {
  message: string;
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

// Extract error message safely from unknown error
function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) return error.message;
  return typeof error === 'string' ? error : JSON.stringify(error);
}

// Extract error stack safely from unknown error
function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) return error.stack;
  return undefined;
}

/**
 * System health response interface
 */
interface SystemHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    memoryTotal: number;
    loadAverage: number[];
    uptime: number;
    activeJobs: number;
    queueLength: number;
    completedJobsToday: number;
    failedJobsToday: number;
    averageExecutionTime: number;
  };
  alerts: string[];
  timestamp: string;
}

/**
 * Job execution prediction response interface
 */
interface JobPredictionResponse {
  jobId: string;
  estimatedCompletionTimeMs: number;
  confidenceLevel: number;
  factorsConsidered: string[];
  historicalBasis: number;
  resourceAvailability: number;
  estimatedCompletionAt: string;
  timestamp: string;
}

@ApiTags('Enhanced Job Monitoring')
@Controller('computer-use/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')
export class EnhancedJobMonitoringController {
  private readonly logger = new Logger(EnhancedJobMonitoringController.name);

  constructor(
    private readonly jobMonitoringService: JobMonitoringEnhancedService,
  ) {}

  /**
   * Get enhanced status for a single job with comprehensive metrics
   *
   * Provides detailed job status information including performance metrics,
   * resource utilization, queue information, and real-time progress tracking.
   *
   * @param jobId Unique job identifier
   * @param includePerformanceMetrics Include performance metrics in response
   * @param includeResourceUtilization Include resource utilization data
   * @param includeExecutionSteps Include detailed execution step information
   * @param user Authenticated user context
   * @returns Promise<EnhancedJobStatusResponseDto> Enhanced job status
   */
  @Get('jobs/:jobId/status/enhanced')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get enhanced job status with comprehensive metrics',
    description:
      'Retrieve detailed job status including performance metrics, resource utilization, and real-time progress tracking.',
    operationId: 'getEnhancedJobStatus',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @ApiQuery({
    name: 'includePerformanceMetrics',
    description: 'Include performance metrics in response',
    example: true,
    required: false,
  })
  @ApiQuery({
    name: 'includeResourceUtilization',
    description: 'Include resource utilization information',
    example: true,
    required: false,
  })
  @ApiQuery({
    name: 'includeExecutionSteps',
    description: 'Include detailed execution steps',
    example: false,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Enhanced job status retrieved successfully',
    type: EnhancedJobStatusResponseDto,
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
    intent: 'Retrieve comprehensive job status with advanced metrics and real-time tracking',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'ENHANCED_JOB_MONITORING',
    complianceFlags: ['DETAILED_MONITORING', 'PERFORMANCE_METRICS'],
    cacheable: true,
    timeout: 8000,
  })
  async getEnhancedJobStatus(
    @Param('jobId') jobId: string,
    @Query('includePerformanceMetrics') includePerformanceMetrics = true,
    @Query('includeResourceUtilization') includeResourceUtilization = true,
    @Query('includeExecutionSteps') includeExecutionSteps = false,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<EnhancedJobStatusResponseDto> {
    const operationId = `enhanced_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Enhanced job status request for: ${jobId}`,
        {
          operationId,
          jobId,
          userId: user.id,
          username: user.username,
          includePerformanceMetrics,
          includeResourceUtilization,
          includeExecutionSteps,
        },
      );

      const enhancedStatus = await this.jobMonitoringService.getEnhancedJobStatus(
        jobId,
        includePerformanceMetrics,
        includeResourceUtilization,
        includeExecutionSteps,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Enhanced job status retrieved successfully (${processingTime}ms)`,
        {
          operationId,
          jobId,
          status: enhancedStatus.status,
          progress: enhancedStatus.progress,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return enhancedStatus;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving enhanced job status: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to retrieve enhanced job status: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get enhanced status for multiple jobs in a single request
   *
   * Provides bulk job status retrieval with optional performance metrics
   * and resource utilization data for efficient monitoring of multiple jobs.
   *
   * @param request Bulk job status request with job IDs and options
   * @param user Authenticated user context
   * @returns Promise<BulkJobStatusResponseDto> Bulk job status results
   */
  @Post('jobs/status/bulk')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get enhanced status for multiple jobs',
    description:
      'Retrieve enhanced status for multiple jobs in a single request with optional performance metrics.',
    operationId: 'getBulkEnhancedJobStatus',
  })
  @ApiBody({
    type: BulkJobStatusRequestDto,
    description: 'Bulk job status request with job IDs and options',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk job status retrieved successfully',
    type: BulkJobStatusResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
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
    intent: 'Retrieve enhanced status for multiple jobs with bulk processing efficiency',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.CONVERSATIONAL,
    businessCategory: 'BULK_JOB_MONITORING',
    complianceFlags: ['BULK_OPERATIONS', 'PERFORMANCE_MONITORING'],
    cacheable: true,
    timeout: 15000,
  })
  async getBulkEnhancedJobStatus(
    @Body() request: BulkJobStatusRequestDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BulkJobStatusResponseDto> {
    const operationId = `bulk_enhanced_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Bulk enhanced job status request for ${request.jobIds.length} jobs`,
        {
          operationId,
          jobCount: request.jobIds.length,
          userId: user.id,
          username: user.username,
          includePerformanceMetrics: request.includePerformanceMetrics,
          includeResourceUtilization: request.includeResourceUtilization,
          includeExecutionSteps: request.includeExecutionSteps,
        },
      );

      const bulkResponse = await this.jobMonitoringService.getBulkEnhancedJobStatus(request);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Bulk enhanced job status completed: ${bulkResponse.summary.successful} successful, ${bulkResponse.summary.failed} failed (${processingTime}ms)`,
        {
          operationId,
          totalRequested: bulkResponse.summary.totalRequested,
          successful: bulkResponse.summary.successful,
          failed: bulkResponse.summary.failed,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return bulkResponse;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving bulk enhanced job status: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobCount: request.jobIds.length,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      throw new HttpException(
        `Failed to retrieve bulk enhanced job status: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get current system health metrics and status
   *
   * Provides comprehensive system health information including CPU usage,
   * memory utilization, job queue status, and performance indicators.
   *
   * @param user Authenticated user context
   * @returns Promise<SystemHealthResponse> System health metrics
   */
  @Get('system/health')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get system health metrics and status',
    description:
      'Retrieve comprehensive system health information including resource utilization and job queue status.',
    operationId: 'getSystemHealth',
  })
  @ApiResponse({
    status: 200,
    description: 'System health metrics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
          example: 'healthy',
        },
        metrics: {
          type: 'object',
          properties: {
            cpuUsage: { type: 'number', example: 45.2 },
            memoryUsage: { type: 'number', example: 2147483648 },
            memoryTotal: { type: 'number', example: 8589934592 },
            loadAverage: { type: 'array', items: { type: 'number' }, example: [1.2, 1.5, 1.3] },
            uptime: { type: 'number', example: 3600000 },
            activeJobs: { type: 'number', example: 5 },
            queueLength: { type: 'number', example: 12 },
            completedJobsToday: { type: 'number', example: 150 },
            failedJobsToday: { type: 'number', example: 3 },
            averageExecutionTime: { type: 'number', example: 15000 },
          },
        },
        alerts: { type: 'array', items: { type: 'string' }, example: [] },
        timestamp: { type: 'string', example: '2023-12-19T10:31:15.789Z' },
      },
    },
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
    intent: 'Retrieve comprehensive system health metrics and performance indicators',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'SYSTEM_HEALTH_MONITORING',
    complianceFlags: ['SYSTEM_MONITORING', 'HEALTH_CHECKS'],
    cacheable: true,
    timeout: 5000,
  })
  async getSystemHealth(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<SystemHealthResponse> {
    const operationId = `system_health_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] System health request`,
        {
          operationId,
          userId: user.id,
          username: user.username,
        },
      );

      const healthMetrics = this.jobMonitoringService.getSystemHealthMetrics();

      // Determine overall system status
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      const alerts: string[] = [];

      if (healthMetrics.cpuUsage > 80) {
        status = 'degraded';
        alerts.push(`High CPU usage: ${healthMetrics.cpuUsage.toFixed(1)}%`);
      }

      const memoryUsagePercent = (healthMetrics.memoryUsage / healthMetrics.memoryTotal) * 100;
      if (memoryUsagePercent > 85) {
        status = 'degraded';
        alerts.push(`High memory usage: ${memoryUsagePercent.toFixed(1)}%`);
      }

      if (healthMetrics.queueLength > 20) {
        status = 'degraded';
        alerts.push(`Long job queue: ${healthMetrics.queueLength} jobs waiting`);
      }

      if (!healthMetrics.systemResourcesAvailable) {
        status = 'unhealthy';
        alerts.push('System resources critically low');
      }

      const response: SystemHealthResponse = {
        status,
        metrics: {
          cpuUsage: healthMetrics.cpuUsage,
          memoryUsage: healthMetrics.memoryUsage,
          memoryTotal: healthMetrics.memoryTotal,
          loadAverage: healthMetrics.loadAverage,
          uptime: healthMetrics.uptime,
          activeJobs: healthMetrics.activeJobs,
          queueLength: healthMetrics.queueLength,
          completedJobsToday: healthMetrics.completedJobsToday,
          failedJobsToday: healthMetrics.failedJobsToday,
          averageExecutionTime: healthMetrics.averageExecutionTime,
        },
        alerts,
        timestamp: new Date().toISOString(),
      };

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] System health retrieved: ${status} (${processingTime}ms)`,
        {
          operationId,
          status,
          alertCount: alerts.length,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return response;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving system health: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to retrieve system health: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get execution time prediction for a specific job
   *
   * Provides predictive analysis for job completion time based on historical
   * data, current system load, and resource availability.
   *
   * @param jobId Unique job identifier
   * @param user Authenticated user context
   * @returns Promise<JobPredictionResponse> Job execution prediction
   */
  @Get('jobs/:jobId/prediction')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get job execution time prediction',
    description:
      'Predict job completion time based on historical data, system load, and resource availability.',
    operationId: 'getJobPrediction',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Job prediction retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', example: 'job_1702983456789_abc123' },
        estimatedCompletionTimeMs: { type: 'number', example: 25000 },
        confidenceLevel: { type: 'number', example: 0.85 },
        factorsConsidered: {
          type: 'array',
          items: { type: 'string' },
          example: ['historical_performance', 'system_load', 'queue_length'],
        },
        historicalBasis: { type: 'number', example: 30000 },
        resourceAvailability: { type: 'number', example: 0.75 },
        estimatedCompletionAt: { type: 'string', example: '2023-12-19T10:31:40.000Z' },
        timestamp: { type: 'string', example: '2023-12-19T10:31:15.789Z' },
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
  @ParlantValidated({
    intent: 'Predict job execution completion time using ML-based analysis',
    securityLevel: SecurityLevel.LOW,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'JOB_PREDICTION_ANALYTICS',
    complianceFlags: ['PREDICTIVE_ANALYTICS', 'PERFORMANCE_ESTIMATION'],
    cacheable: true,
    timeout: 3000,
  })
  async getJobPrediction(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobPredictionResponse> {
    const operationId = `job_prediction_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Job prediction request for: ${jobId}`,
        {
          operationId,
          jobId,
          userId: user.id,
          username: user.username,
        },
      );

      const prediction = this.jobMonitoringService.predictJobCompletion(jobId);
      const estimatedCompletionAt = new Date(Date.now() + prediction.estimatedCompletionTimeMs);

      const response: JobPredictionResponse = {
        jobId,
        estimatedCompletionTimeMs: prediction.estimatedCompletionTimeMs,
        confidenceLevel: prediction.confidenceLevel,
        factorsConsidered: prediction.factorsConsidered,
        historicalBasis: prediction.historicalBasis,
        resourceAvailability: prediction.resourceAvailability,
        estimatedCompletionAt: estimatedCompletionAt.toISOString(),
        timestamp: new Date().toISOString(),
      };

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job prediction retrieved: ${prediction.estimatedCompletionTimeMs}ms estimated (${processingTime}ms)`,
        {
          operationId,
          jobId,
          estimatedTimeMs: prediction.estimatedCompletionTimeMs,
          confidence: prediction.confidenceLevel,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return response;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error retrieving job prediction: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to retrieve job prediction: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger manual system health check
   *
   * Performs an immediate comprehensive health check and returns
   * current system status with any detected issues or alerts.
   *
   * @param user Authenticated user context
   * @returns Promise<SystemHealthResponse> Health check results
   */
  @Post('system/health-check')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Trigger manual system health check',
    description:
      'Perform immediate comprehensive health check and return current system status.',
    operationId: 'triggerHealthCheck',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed successfully',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['healthy', 'degraded', 'unhealthy'],
          example: 'healthy',
        },
        checkPerformed: { type: 'boolean', example: true },
        timestamp: { type: 'string', example: '2023-12-19T10:31:15.789Z' },
        metrics: { type: 'object' },
        alerts: { type: 'array', items: { type: 'string' } },
      },
    },
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
    intent: 'Trigger immediate comprehensive system health check and diagnostics',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.EXPLICIT,
    businessCategory: 'SYSTEM_DIAGNOSTICS',
    complianceFlags: ['HEALTH_CHECKS', 'SYSTEM_DIAGNOSTICS'],
    cacheable: false,
    timeout: 10000,
  })
  async triggerHealthCheck(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<SystemHealthResponse & { checkPerformed: boolean }> {
    const operationId = `health_check_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Manual health check triggered`,
        {
          operationId,
          userId: user.id,
          username: user.username,
        },
      );

      // Trigger the health check
      await this.jobMonitoringService.performHealthCheck();

      // Get updated health metrics
      const healthResponse = await this.getSystemHealth(user);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Manual health check completed: ${healthResponse.status} (${processingTime}ms)`,
        {
          operationId,
          status: healthResponse.status,
          alertCount: healthResponse.alerts.length,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return {
        ...healthResponse,
        checkPerformed: true,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error performing health check: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to perform health check: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}