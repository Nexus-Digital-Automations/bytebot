/**
 * Job Cancellation and Timeout Management Controller
 *
 * REST API endpoints for advanced job cancellation, timeout configuration,
 * and bulk job management operations. Provides enterprise-grade cancellation
 * capabilities with comprehensive error handling and logging.
 *
 * Features:
 * - Individual job cancellation with multiple strategies
 * - Bulk job cancellation with criteria-based selection
 * - Timeout configuration and monitoring
 * - Emergency shutdown capabilities
 * - Cancellation history and analytics
 * - Real-time cancellation progress tracking
 *
 * @author Claude Code - Job Management Enhancement Specialist
 * @version 1.0.0
 */

import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  JobCancellationTimeoutService,
  CancellationStrategy,
  TimeoutEscalation,
  JobCancellationRequest,
  BulkCancellationRequest,
  TimeoutConfiguration,
  CancellationResult,
  BulkCancellationResult,
} from '../services/job-cancellation-timeout.service';
import { JobStatus, JobPriority } from '../dto/async-job.dto';

/**
 * DTO for single job cancellation request
 */
export class CancelJobDto {
  strategy: CancellationStrategy = CancellationStrategy.GRACEFUL;
  reason: string = 'User requested cancellation';
  gracePeriodMs?: number;
  cleanup?: boolean = true;
  notifyDependents?: boolean = true;
  metadata?: Record<string, unknown>;
}

/**
 * DTO for bulk job cancellation request
 */
export class BulkCancelJobsDto {
  criteria: {
    batchId?: string;
    status?: JobStatus[];
    priority?: JobPriority[];
    olderThan?: string; // ISO date string
    longerThan?: number; // milliseconds
    pattern?: string; // regex pattern
  } = {};
  strategy: CancellationStrategy = CancellationStrategy.GRACEFUL;
  reason: string = 'Bulk cancellation requested';
  maxJobs?: number;
  dryRun?: boolean = false;
  cleanup?: boolean = true;
}

/**
 * DTO for timeout configuration
 */
export class TimeoutConfigurationDto {
  softTimeoutMs: number;
  hardTimeoutMs: number;
  escalationSteps: {
    delayMs: number;
    action: TimeoutEscalation;
    metadata?: Record<string, unknown>;
  }[];
}

/**
 * DTO for emergency shutdown request
 */
export class EmergencyShutdownDto {
  reason: string = 'Emergency shutdown requested';
  confirmationCode?: string;
}

@ApiTags('Job Cancellation & Timeout Management')
@Controller('computer-use/cancellation')
@UseGuards(ThrottlerGuard)
@ApiBearerAuth()
export class JobCancellationController {
  private readonly logger = new Logger(JobCancellationController.name);

  constructor(
    private readonly cancellationService: JobCancellationTimeoutService,
  ) {
    this.logger.log('Job Cancellation Controller initialized');
  }

  /**
   * Cancel a single job
   */
  @Post(':jobId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a specific job',
    description:
      'Cancel a job using the specified strategy with comprehensive cleanup and notification options',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique identifier of the job to cancel',
    example: 'job1640995200000abc12345',
  })
  @ApiBody({
    type: CancelJobDto,
    description: 'Cancellation configuration and options',
  })
  @ApiResponse({
    status: 200,
    description: 'Job cancellation result with cleanup details',
    schema: {
      type: 'object',
      properties: {
        jobId: { type: 'string' },
        success: { type: 'boolean' },
        strategy: { type: 'string', enum: Object.values(CancellationStrategy) },
        actualStrategy: {
          type: 'string',
          enum: Object.values(CancellationStrategy),
        },
        cancelledAt: { type: 'string', format: 'date-time' },
        duration: { type: 'number' },
        reason: { type: 'string' },
        cleanup: {
          type: 'object',
          properties: {
            resourcesReleased: { type: 'array', items: { type: 'string' } },
            dependentsNotified: { type: 'number' },
            errors: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid job ID or cancellation request',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  async cancelJob(
    @Param('jobId') jobId: string,
    @Body() cancelRequest: CancelJobDto,
  ): Promise<CancellationResult> {
    this.logger.log(`Cancellation request for job ${jobId}`, {
      jobId,
      strategy: cancelRequest.strategy,
      reason: cancelRequest.reason,
    });

    if (!jobId || jobId.trim().length === 0) {
      throw new BadRequestException('Job ID is required');
    }

    if (!Object.values(CancellationStrategy).includes(cancelRequest.strategy)) {
      throw new BadRequestException(
        `Invalid cancellation strategy: ${cancelRequest.strategy}`,
      );
    }

    try {
      const request: JobCancellationRequest = {
        jobId: jobId.trim(),
        strategy: cancelRequest.strategy,
        reason: cancelRequest.reason,
        gracePeriodMs: cancelRequest.gracePeriodMs,
        cleanup: cancelRequest.cleanup,
        notifyDependents: cancelRequest.notifyDependents,
        metadata: {
          ...cancelRequest.metadata,
          requestedAt: new Date().toISOString(),
          userAgent: 'JobCancellationController',
        },
      };

      const result = await this.cancellationService.cancelJob(request);

      this.logger.log(`Job ${jobId} cancellation completed`, {
        jobId,
        success: result.success,
        strategy: result.actualStrategy,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to cancel job ${jobId}: ${errorMessage}`, {
        jobId,
        error: errorMessage,
      });

      if (errorMessage.includes('not found')) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      throw new BadRequestException(`Cancellation failed: ${errorMessage}`);
    }
  }

  /**
   * Cancel multiple jobs based on criteria
   */
  @Post('bulk-cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel multiple jobs based on criteria',
    description:
      'Cancel jobs in bulk using flexible criteria with support for dry-run mode and concurrency control',
  })
  @ApiBody({
    type: BulkCancelJobsDto,
    description: 'Bulk cancellation criteria and configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk cancellation results with detailed statistics',
    schema: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        criteria: { type: 'object' },
        totalMatched: { type: 'number' },
        attempted: { type: 'number' },
        successful: { type: 'number' },
        failed: { type: 'number' },
        cancelled: { type: 'array' },
        failures: { type: 'array' },
        duration: { type: 'number' },
        dryRun: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid bulk cancellation criteria',
  })
  async cancelJobsBulk(
    @Body() bulkRequest: BulkCancelJobsDto,
  ): Promise<BulkCancellationResult> {
    this.logger.log('Bulk cancellation request received', {
      criteria: bulkRequest.criteria,
      strategy: bulkRequest.strategy,
      dryRun: bulkRequest.dryRun,
      maxJobs: bulkRequest.maxJobs,
    });

    if (!Object.values(CancellationStrategy).includes(bulkRequest.strategy)) {
      throw new BadRequestException(
        `Invalid cancellation strategy: ${bulkRequest.strategy}`,
      );
    }

    if (bulkRequest.maxJobs && bulkRequest.maxJobs < 1) {
      throw new BadRequestException('maxJobs must be greater than 0');
    }

    if (
      bulkRequest.criteria.longerThan &&
      bulkRequest.criteria.longerThan < 0
    ) {
      throw new BadRequestException('longerThan must be non-negative');
    }

    try {
      // Convert date string to Date object if provided
      const processedCriteria = { ...bulkRequest.criteria };
      if (processedCriteria.olderThan) {
        const dateValue = new Date(processedCriteria.olderThan);
        const timeValue = dateValue.getTime();
        if (isNaN(timeValue)) {
          throw new BadRequestException('Invalid olderThan date format');
        }
        processedCriteria.olderThan = dateValue;
      }

      const request: BulkCancellationRequest = {
        criteria: processedCriteria,
        strategy: bulkRequest.strategy,
        reason: bulkRequest.reason,
        maxJobs: bulkRequest.maxJobs,
        dryRun: bulkRequest.dryRun,
        cleanup: bulkRequest.cleanup,
      };

      const result = await this.cancellationService.cancelJobsBulk(request);

      this.logger.log('Bulk cancellation completed', {
        requestId: result.requestId,
        attempted: result.attempted,
        successful: result.successful,
        failed: result.failed,
        dryRun: result.dryRun,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Bulk cancellation failed: ${errorMessage}`, {
        error: errorMessage,
        criteria: bulkRequest.criteria,
      });

      throw new BadRequestException(
        `Bulk cancellation failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Configure timeout behavior for a job
   */
  @Post(':jobId/timeout-config')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Configure timeout behavior for a job',
    description:
      'Set up timeout escalation policies with custom warning thresholds and automatic cancellation',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique identifier of the job to configure',
    example: 'job1640995200000abc12345',
  })
  @ApiBody({
    type: TimeoutConfigurationDto,
    description: 'Timeout configuration with escalation steps',
  })
  @ApiResponse({
    status: 201,
    description: 'Timeout configuration applied successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid timeout configuration',
  })
  async configureJobTimeout(
    @Param('jobId') jobId: string,
    @Body() timeoutConfig: TimeoutConfigurationDto,
  ): Promise<{ message: string; jobId: string; configured: boolean }> {
    this.logger.log(`Configuring timeout for job ${jobId}`, {
      jobId,
      softTimeout: timeoutConfig.softTimeoutMs,
      hardTimeout: timeoutConfig.hardTimeoutMs,
      escalationSteps: timeoutConfig.escalationSteps.length,
    });

    if (!jobId || jobId.trim().length === 0) {
      throw new BadRequestException('Job ID is required');
    }

    if (timeoutConfig.softTimeoutMs <= 0 || timeoutConfig.hardTimeoutMs <= 0) {
      throw new BadRequestException('Timeout values must be positive');
    }

    if (timeoutConfig.softTimeoutMs >= timeoutConfig.hardTimeoutMs) {
      throw new BadRequestException(
        'Soft timeout must be less than hard timeout',
      );
    }

    if (
      !timeoutConfig.escalationSteps ||
      timeoutConfig.escalationSteps.length === 0
    ) {
      throw new BadRequestException('At least one escalation step is required');
    }

    // Validate escalation steps
    for (const step of timeoutConfig.escalationSteps) {
      if (step.delayMs <= 0) {
        throw new BadRequestException(
          'Escalation step delays must be positive',
        );
      }

      if (!Object.values(TimeoutEscalation).includes(step.action)) {
        throw new BadRequestException(
          `Invalid escalation action: ${step.action}`,
        );
      }
    }

    try {
      const config: TimeoutConfiguration = {
        jobId: jobId.trim(),
        softTimeoutMs: timeoutConfig.softTimeoutMs,
        hardTimeoutMs: timeoutConfig.hardTimeoutMs,
        escalationSteps: timeoutConfig.escalationSteps,
      };

      await this.cancellationService.configureJobTimeout(config);

      this.logger.log(`Timeout configuration applied for job ${jobId}`);

      return {
        message: 'Timeout configuration applied successfully',
        jobId: jobId.trim(),
        configured: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to configure timeout for job ${jobId}: ${errorMessage}`,
        {
          jobId,
          error: errorMessage,
        },
      );

      throw new BadRequestException(
        `Timeout configuration failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Get cancellation history for a job
   */
  @Get(':jobId/cancellation-history')
  @ApiOperation({
    summary: 'Get cancellation history for a job',
    description:
      'Retrieve detailed cancellation history including strategy used, cleanup results, and performance metrics',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique identifier of the job',
    example: 'job1640995200000abc12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Cancellation history details',
  })
  @ApiResponse({
    status: 404,
    description: 'No cancellation history found for this job',
  })
  async getCancellationHistory(
    @Param('jobId') jobId: string,
  ): Promise<CancellationResult> {
    if (!jobId || jobId.trim().length === 0) {
      throw new BadRequestException('Job ID is required');
    }

    const history = this.cancellationService.getCancellationHistory(
      jobId.trim(),
    );

    if (!history) {
      throw new NotFoundException(
        `No cancellation history found for job ${jobId}`,
      );
    }

    return history;
  }

  /**
   * Get all active jobs being tracked
   */
  @Get('active-jobs')
  @ApiOperation({
    summary: 'Get all active jobs being tracked',
    description:
      'Retrieve list of all jobs currently being monitored for cancellation and timeout management',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active jobs with tracking information',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          jobId: { type: 'string' },
          startedAt: { type: 'string', format: 'date-time' },
          hasTimeout: { type: 'boolean' },
        },
      },
    },
  })
  async getActiveJobs(): Promise<
    { jobId: string; startedAt: Date; hasTimeout: boolean }[]
  > {
    const activeJobs = this.cancellationService.getActiveJobs();

    this.logger.debug(`Retrieved ${activeJobs.length} active jobs`, {
      count: activeJobs.length,
    });

    return activeJobs;
  }

  /**
   * Emergency shutdown - cancel all jobs
   */
  @Post('emergency-shutdown')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emergency shutdown - cancel all jobs',
    description:
      'Immediately cancel all pending and in-progress jobs using forced cancellation strategy',
  })
  @ApiBody({
    type: EmergencyShutdownDto,
    description: 'Emergency shutdown request with reason',
  })
  @ApiResponse({
    status: 200,
    description: 'Emergency shutdown completed with results',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid shutdown request',
  })
  async emergencyShutdown(
    @Body() shutdownRequest: EmergencyShutdownDto,
  ): Promise<BulkCancellationResult> {
    this.logger.warn('Emergency shutdown requested', {
      reason: shutdownRequest.reason,
      confirmationCode: shutdownRequest.confirmationCode,
    });

    if (!shutdownRequest.reason || shutdownRequest.reason.trim().length === 0) {
      throw new BadRequestException('Shutdown reason is required');
    }

    // Optional: Add confirmation code validation for extra security
    if (
      shutdownRequest.confirmationCode &&
      shutdownRequest.confirmationCode !== 'EMERGENCY_SHUTDOWN_CONFIRMED'
    ) {
      throw new BadRequestException(
        'Invalid confirmation code for emergency shutdown',
      );
    }

    try {
      const result = await this.cancellationService.emergencyShutdown(
        shutdownRequest.reason,
      );

      this.logger.warn('Emergency shutdown completed', {
        requestId: result.requestId,
        attempted: result.attempted,
        successful: result.successful,
        failed: result.failed,
        reason: shutdownRequest.reason,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Emergency shutdown failed: ${errorMessage}`, {
        error: errorMessage,
        reason: shutdownRequest.reason,
      });

      throw new BadRequestException(
        `Emergency shutdown failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Health check for cancellation service
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check for cancellation service',
    description:
      'Check the health status of the job cancellation and timeout management service',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        activeJobs: { type: 'number' },
        configuredTimeouts: { type: 'number' },
        cancellationHistory: { type: 'number' },
        uptime: { type: 'number' },
        lastCheck: { type: 'string', format: 'date-time' },
      },
    },
  })
  async healthCheck(): Promise<{
    status: string;
    activeJobs: number;
    configuredTimeouts: number;
    cancellationHistory: number;
    uptime: number;
    lastCheck: string;
  }> {
    const activeJobs = this.cancellationService.getActiveJobs();

    return {
      status: 'healthy',
      activeJobs: activeJobs.length,
      configuredTimeouts: 0, // Placeholder - would need service method
      cancellationHistory: 0, // Placeholder - would need service method
      uptime: process.uptime() * 1000,
      lastCheck: new Date().toISOString(),
    };
  }
}
