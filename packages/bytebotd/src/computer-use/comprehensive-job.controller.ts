/**
 * Comprehensive Job Controller - Enterprise Job Management API
 *
 * Provides enterprise-grade REST API endpoints for the comprehensive job
 * management system with full orchestration and monitoring capabilities.
 *
 * Features:
 * - Job submission with comprehensive options
 * - Real-time job status and progress tracking
 * - System health and performance monitoring
 * - Enterprise-grade error handling and recovery
 * - Thread-safe operations with distributed locking
 * - Comprehensive audit logging and compliance
 *
 * @author Claude Code - Agent 8 Job Management Specialist
 * @version 3.0.0
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { EnterpriseRateLimitGuard } from '../common/guards/rate-limit.guard';
import { SecuritySanitizationPipes } from '../common/pipes/security-sanitization.pipe';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import {
  ForVersion,
  SUPPORTED_API_VERSIONS,
} from '../common/versioning/api-version.decorator';
import {
  ParlantCritical,
  ParlantValidated,
  SecurityLevel,
  ValidationMode,
} from '@bytebot/shared/src/parlant/parlant-validation.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  OperatorOrAdmin,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';

import {
  ComprehensiveJobOrchestratorService,
  JobSubmissionRequest,
  JobSubmissionResponse,
  SystemHealthStatus,
} from './services/comprehensive-job-orchestrator.service';
import { ComprehensiveJobMonitoringService } from './services/comprehensive-job-monitoring.service';
import { ComprehensiveJobStorageService, JobStatus, JobPriority } from './services/comprehensive-job-storage.service';
import { ComprehensiveErrorRecoveryService } from './services/comprehensive-error-recovery.service';
import { ComprehensiveCleanupManagerService } from './services/comprehensive-cleanup-manager.service';

/**
 * Job submission DTO
 */
export class JobSubmissionDto {
  actionType: string;
  actionData: any;
  priority?: JobPriority;
  timeout?: number;
  useCache?: boolean;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
  batchId?: string;
  jobKey?: string;
  retryOptions?: {
    maxRetries?: number;
    backoffMultiplier?: number;
    baseDelay?: number;
  };
}

/**
 * Job search DTO
 */
export class JobSearchDto {
  statuses?: JobStatus[];
  priorities?: JobPriority[];
  actionTypes?: string[];
  submittedAfter?: Date;
  submittedBefore?: Date;
  limit?: number;
  offset?: number;
}

/**
 * System performance response DTO
 */
export class SystemPerformanceDto {
  jobThroughput: number;
  averageExecutionTime: number;
  queueWaitTime: number;
  resourceUtilization: number;
  errorRate: number;
  concurrentJobs: number;
  completionRate: number;
  timestamp: Date;
}

/**
 * Error handling utilities
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

@ApiTags('Comprehensive Job Management API')
@Controller('comprehensive-jobs')
@UseGuards(JwtAuthGuard, RolesGuard, EnterpriseRateLimitGuard)
@UsePipes(SecuritySanitizationPipes.HIGH_SECURITY)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth('bearer')
export class ComprehensiveJobController {
  private readonly logger = new Logger(ComprehensiveJobController.name);

  constructor(
    private readonly orchestrator: ComprehensiveJobOrchestratorService,
    private readonly monitoring: ComprehensiveJobMonitoringService,
    private readonly storage: ComprehensiveJobStorageService,
    private readonly errorRecovery: ComprehensiveErrorRecoveryService,
    private readonly cleanup: ComprehensiveCleanupManagerService,
  ) {}

  /**
   * Submit a job for comprehensive execution
   */
  @Post()
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Submit job for comprehensive execution',
    description:
      'Submit a computer automation job to the comprehensive job management system with full orchestration and monitoring.',
    operationId: 'submitComprehensiveJob',
  })
  @ApiResponse({
    status: 202,
    description: 'Job submitted successfully',
    type: JobSubmissionResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid job parameters',
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
    description: 'System temporarily unavailable',
  })
  @ParlantCritical(
    'Submit computer automation job to comprehensive management system with enterprise orchestration',
    {
      securityLevel: SecurityLevel.CRITICAL,
      validationMode: ValidationMode.EXPLICIT,
      businessCategory: 'COMPREHENSIVE_JOB_SUBMISSION',
      complianceFlags: [
        'COMPREHENSIVE_EXECUTION',
        'ENTERPRISE_ORCHESTRATION',
        'SYSTEM_CONTROL',
      ],
      requiredRoles: ['OPERATOR', 'ADMIN'],
      timeout: 30000,
      cacheable: false,
    },
  )
  async submitJob(
    @Body() jobRequest: JobSubmissionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<JobSubmissionResponse> {
    const operationId = `submit_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Comprehensive job submission: ${jobRequest.actionType}`,
        {
          operationId,
          actionType: jobRequest.actionType,
          priority: jobRequest.priority,
          userId: user.id,
          username: user.username,
          hasMetadata: !!jobRequest.metadata,
          hasDependencies: !!jobRequest.dependencies?.length,
          batchId: jobRequest.batchId,
        },
      );

      // Create comprehensive submission request
      const submissionRequest: JobSubmissionRequest = {
        ...jobRequest,
        metadata: {
          ...jobRequest.metadata,
          submittedBy: user.id,
          submittedByUsername: user.username,
          submissionTimestamp: new Date().toISOString(),
          operationId,
        },
      };

      // Submit through orchestrator
      const response = await this.orchestrator.submitJob(submissionRequest);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job submitted successfully: ${response.jobId} (${processingTime}ms)`,
        {
          operationId,
          jobId: response.jobId,
          status: response.status,
          queuePosition: response.queuePosition,
          estimatedCompletion: response.estimatedCompletion,
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
        `[${operationId}] Job submission failed: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          actionType: jobRequest.actionType,
          processingTime,
          errorType: error?.constructor?.name ?? 'Unknown',
          userId: user.id,
          username: user.username,
        },
      );

      // Map specific errors to appropriate HTTP status codes
      if (errorMessage.includes('not initialized')) {
        throw new HttpException(
          'Job management system is not ready. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      if (errorMessage.includes('shutting down')) {
        throw new HttpException(
          'Job management system is shutting down. No new jobs accepted.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      throw new HttpException(
        `Failed to submit job: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get comprehensive job status
   */
  @Get(':jobId')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get comprehensive job status',
    description:
      'Retrieve detailed status information for a job including execution progress, audit trail, and performance metrics.',
    operationId: 'getComprehensiveJobStatus',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
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
    intent: 'Retrieve comprehensive job status with execution details and audit trail',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'JOB_STATUS_MONITORING',
    complianceFlags: ['STATUS_MONITORING', 'AUDIT_TRAIL_ACCESS'],
    cacheable: true,
    timeout: 5000,
  })
  async getJobStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `status_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Job status request: ${jobId}`, {
        operationId,
        jobId,
        userId: user.id,
        username: user.username,
      });

      const status = await this.orchestrator.getJobStatus(jobId);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job status retrieved: ${status.status} - ${status.progress}% (${processingTime}ms)`,
        {
          operationId,
          jobId,
          status: status.status,
          progress: status.progress,
          workerId: status.workerId,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return status;

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Job status retrieval failed: ${errorMessage} (${processingTime}ms)`,
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
   * Cancel a job
   */
  @Delete(':jobId')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Cancel a job',
    description:
      'Cancel a pending or running job with proper cleanup and audit logging.',
    operationId: 'cancelComprehensiveJob',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    example: 'job_1702983456789_abc123',
  })
  @ApiQuery({
    name: 'reason',
    description: 'Reason for cancellation',
    required: false,
    example: 'User requested cancellation',
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
    @Query('reason') reason: string = 'User requested',
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{ cancelled: boolean; message: string; jobId: string }> {
    const operationId = `cancel_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Job cancellation request: ${jobId}`, {
        operationId,
        jobId,
        reason,
        userId: user.id,
        username: user.username,
      });

      const cancelled = await this.orchestrator.cancelJob(jobId, reason);

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
          reason,
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
        `[${operationId}] Job cancellation failed: ${errorMessage} (${processingTime}ms)`,
        getErrorStack(error),
        {
          operationId,
          jobId,
          reason,
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

  /**
   * Get system health status
   */
  @Get('system/health')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get system health status',
    description:
      'Retrieve comprehensive system health information including all components and metrics.',
    operationId: 'getSystemHealth',
  })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
    type: SystemHealthStatus,
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
    intent: 'Retrieve comprehensive system health status and component metrics',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'SYSTEM_HEALTH_MONITORING',
    complianceFlags: ['HEALTH_MONITORING', 'SYSTEM_METRICS'],
    cacheable: true,
    timeout: 10000,
  })
  async getSystemHealth(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<SystemHealthStatus> {
    const operationId = `health_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] System health request`, {
        operationId,
        userId: user.id,
        username: user.username,
      });

      const health = await this.orchestrator.getSystemHealth();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] System health retrieved: ${health.overall} (${processingTime}ms)`,
        {
          operationId,
          overallHealth: health.overall,
          uptime: health.uptime,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return health;

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] System health retrieval failed: ${errorMessage} (${processingTime}ms)`,
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
   * Get system performance metrics
   */
  @Get('system/performance')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get system performance metrics',
    description:
      'Retrieve comprehensive system performance metrics including throughput, execution times, and resource utilization.',
    operationId: 'getSystemPerformance',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved successfully',
    type: SystemPerformanceDto,
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
    intent: 'Retrieve comprehensive system performance metrics and analytics',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.AUTOMATIC,
    businessCategory: 'PERFORMANCE_MONITORING',
    complianceFlags: ['PERFORMANCE_METRICS', 'SYSTEM_ANALYTICS'],
    cacheable: true,
    timeout: 8000,
  })
  async getSystemPerformance(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<SystemPerformanceDto> {
    const operationId = `performance_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Performance metrics request`, {
        operationId,
        userId: user.id,
        username: user.username,
      });

      const metrics = this.orchestrator.getPerformanceStats();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Performance metrics retrieved: ${metrics.jobThroughput} jobs/min (${processingTime}ms)`,
        {
          operationId,
          throughput: metrics.jobThroughput,
          errorRate: metrics.errorRate,
          concurrentJobs: metrics.concurrentJobs,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return {
        ...metrics,
        timestamp: new Date(),
      };

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Performance metrics retrieval failed: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to retrieve performance metrics: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Optimize system performance
   */
  @Post('system/optimize')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Optimize system performance',
    description:
      'Trigger comprehensive system performance optimization including queue optimization, worker scaling, and resource balancing.',
    operationId: 'optimizeSystemPerformance',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance optimization completed',
    schema: {
      type: 'object',
      properties: {
        queueOptimized: { type: 'boolean' },
        workersScaled: { type: 'boolean' },
        resourcesBalanced: { type: 'boolean' },
        cacheOptimized: { type: 'boolean' },
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
  async optimizePerformance(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<{
    queueOptimized: boolean;
    workersScaled: boolean;
    resourcesBalanced: boolean;
    cacheOptimized: boolean;
  }> {
    const operationId = `optimize_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Performance optimization request`, {
        operationId,
        userId: user.id,
        username: user.username,
      });

      const results = await this.orchestrator.optimizePerformance();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Performance optimization completed (${processingTime}ms)`,
        {
          operationId,
          results,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return results;

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Performance optimization failed: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to optimize performance: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search jobs with advanced filtering
   */
  @Post('search')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Search jobs with advanced filtering',
    description:
      'Search jobs with comprehensive filtering options including status, priority, action types, and date ranges.',
    operationId: 'searchComprehensiveJobs',
  })
  @ApiResponse({
    status: 200,
    description: 'Job search results retrieved successfully',
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
    intent: 'Search and filter jobs with comprehensive criteria and pagination',
    securityLevel: SecurityLevel.MEDIUM,
    validationMode: ValidationMode.CONVERSATIONAL,
    businessCategory: 'JOB_SEARCH_ANALYTICS',
    complianceFlags: ['JOB_SEARCH', 'DATA_ACCESS'],
    cacheable: true,
    timeout: 10000,
  })
  async searchJobs(
    @Body() searchCriteria: JobSearchDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `search_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Job search request`, {
        operationId,
        criteria: {
          statuses: searchCriteria.statuses,
          actionTypes: searchCriteria.actionTypes,
          limit: searchCriteria.limit,
          offset: searchCriteria.offset,
        },
        userId: user.id,
        username: user.username,
      });

      const results = await this.storage.searchJobs({
        statuses: searchCriteria.statuses,
        actionTypes: searchCriteria.actionTypes,
        submittedAfter: searchCriteria.submittedAfter,
        submittedBefore: searchCriteria.submittedBefore,
        limit: searchCriteria.limit,
        offset: searchCriteria.offset,
      });

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Job search completed: ${results.length} results (${processingTime}ms)`,
        {
          operationId,
          resultsCount: results.length,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return {
        jobs: results,
        totalCount: results.length,
        offset: searchCriteria.offset || 0,
        limit: searchCriteria.limit || 100,
      };

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Job search failed: ${errorMessage} (${processingTime}ms)`,
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
   * Get error recovery statistics
   */
  @Get('errors/stats')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Get error recovery statistics',
    description:
      'Retrieve comprehensive error recovery statistics including error patterns, recovery rates, and trends.',
    operationId: 'getErrorRecoveryStats',
  })
  @ApiResponse({
    status: 200,
    description: 'Error recovery statistics retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async getErrorRecoveryStats(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `error_stats_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Error recovery stats request`, {
        operationId,
        userId: user.id,
        username: user.username,
      });

      const stats = this.errorRecovery.getErrorRecoveryStats();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${operationId}] Error recovery stats retrieved: ${stats.recoveryRate}% recovery rate (${processingTime}ms)`,
        {
          operationId,
          recoveryRate: stats.recoveryRate,
          totalErrors: stats.totalErrors,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return stats;

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] Error recovery stats retrieval failed: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to retrieve error recovery stats: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Trigger system cleanup
   */
  @Post('system/cleanup')
  @OperatorOrAdmin()
  @ForVersion(SUPPORTED_API_VERSIONS.V1)
  @ApiOperation({
    summary: 'Trigger system cleanup',
    description:
      'Manually trigger comprehensive system cleanup including job cleanup, resource optimization, and maintenance tasks.',
    operationId: 'triggerSystemCleanup',
  })
  @ApiResponse({
    status: 200,
    description: 'System cleanup completed',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions - OPERATOR or ADMIN role required',
  })
  async triggerCleanup(
    @CurrentUser() user: ByteBotdUser,
  ): Promise<any> {
    const operationId = `cleanup_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] System cleanup request`, {
        operationId,
        userId: user.id,
        username: user.username,
      });

      const results = await this.cleanup.executeCleanup();

      const processingTime = Date.now() - startTime;
      const totalCleaned = results.reduce((sum, r) => sum + r.itemsDeleted, 0);

      this.logger.log(
        `[${operationId}] System cleanup completed: ${totalCleaned} items cleaned (${processingTime}ms)`,
        {
          operationId,
          results,
          totalCleaned,
          processingTime,
          userId: user.id,
          username: user.username,
        },
      );

      return {
        success: true,
        results,
        totalItemsCleaned: totalCleaned,
        executionTime: processingTime,
      };

    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = getErrorMessage(error);

      this.logger.error(
        `[${operationId}] System cleanup failed: ${errorMessage} (${processingTime}ms)`,
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
        `Failed to execute system cleanup: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}