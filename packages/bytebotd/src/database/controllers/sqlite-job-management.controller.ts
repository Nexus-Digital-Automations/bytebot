/**
 * SQLite Job Management Controller - Local-Only Architecture API
 *
 * Comprehensive REST API controller for SQLite-based job management.
 * Provides enterprise-grade endpoints for async job processing with
 * 100% local deployment architecture compliance.
 *
 * Features:
 * - Complete job lifecycle management (create, status, result, cancel)
 * - Advanced job querying and filtering capabilities
 * - Real-time job monitoring and statistics
 * - Database health and performance monitoring
 * - Backup and maintenance operations
 * - Security validation and audit logging
 *
 * API Endpoints:
 * - POST /jobs - Create new async job
 * - GET /jobs/{jobId} - Get job status and details
 * - GET /jobs/{jobId}/result - Get job result (when completed)
 * - DELETE /jobs/{jobId} - Cancel pending/running job
 * - GET /jobs/status/{status} - Get jobs by status
 * - GET /jobs/priority/{priority} - Get jobs by priority
 * - GET /jobs/queue/stats - Get queue statistics
 * - GET /jobs/worker/stats - Get worker statistics
 * - GET /jobs/storage/stats - Get storage statistics
 * - POST /jobs/cleanup - Force cleanup expired jobs
 * - POST /jobs/optimize - Optimize database performance
 * - POST /jobs/backup - Create database backup
 *
 * Local-Only Compliance:
 * - SQLite database storage (no Redis dependency)
 * - Local file-based job persistence
 * - Local encryption for sensitive data
 * - No cloud service dependencies
 *
 * @author Claude Code - Database Integration Specialist
 * @version 1.0.0 - Local-Only Architecture
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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

// Import existing job management types and services
import { ComputerAction } from '@bytebot/shared';
import {
  JobStatus,
  JobPriority,
  JobResult,
  JobOptions,
  JobManagementService,
} from '../../computer-use/job-management.service';

// Import SQLite storage service for advanced operations
import { SQLiteJobStorageService } from '../services/sqlite-job-storage.service';

// Import security and validation
import { JwtAuthGuard, PermissionGuard } from '@bytebot/shared';
import { RequirePermissions } from '@bytebot/shared';

// ===== REQUEST/RESPONSE DTOs =====

/**
 * Job creation request DTO
 */
export interface CreateJobRequest {
  action: ComputerAction;
  options?: {
    priority?: JobPriority;
    timeout?: number;
    maxRetries?: number;
    tags?: string[];
    metadata?: {
      userId?: string;
      sessionId?: string;
      correlationId?: string;
      sourceIp?: string;
      userAgent?: string;
    };
  };
}

/**
 * Job creation response DTO
 */
export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  message: string;
  estimatedCompletionTime?: number;
}

/**
 * Job status response DTO
 */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  priority: JobPriority;
  action: ComputerAction;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  timeoutAt?: string;
  retryCount: number;
  maxRetries: number;
  executionTimeMs?: number;
  queuedTimeMs?: number;
  error?: {
    code: string;
    message: string;
    timestamp: string;
    retryable: boolean;
  };
  metadata: {
    userId?: string;
    sessionId?: string;
    correlationId?: string;
    tags: string[];
  };
}

/**
 * Job result response DTO
 */
export interface JobResultResponse {
  jobId: string;
  status: JobStatus;
  result: unknown;
  completedAt: string;
  executionTimeMs?: number;
  metadata: {
    correlationId?: string;
    tags: string[];
  };
}

/**
 * Queue statistics response DTO
 */
export interface QueueStatsResponse {
  summary: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    timeout: number;
  };
  performance: {
    avgExecutionTime: number;
    avgQueueTime: number;
    throughput: number;
    errorRate: number;
  };
  worker: {
    isRunning: boolean;
    jobsProcessed: number;
    jobsSucceeded: number;
    jobsFailed: number;
    uptime: number;
    memoryUsage: number;
  };
}

/**
 * Storage statistics response DTO
 */
export interface StorageStatsResponse {
  database: {
    totalJobs: number;
    databaseSize: number;
    connectionCount: number;
  };
  jobsByStatus: Record<JobStatus, number>;
  jobsByPriority: Record<JobPriority, number>;
  performance: {
    avgQueryTime: number;
    slowQueryCount: number;
    errorCount: number;
  };
}

/**
 * Backup response DTO
 */
export interface BackupResponse {
  success: boolean;
  backupPath: string;
  backupSize: number;
  timestamp: string;
  message: string;
}

// ===== MAIN CONTROLLER =====

@ApiTags('SQLite Job Management')
@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard, PermissionGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class SQLiteJobManagementController {
  private readonly logger = new Logger(SQLiteJobManagementController.name);

  constructor(
    private readonly jobManagementService: JobManagementService,
    private readonly sqliteStorageService: SQLiteJobStorageService,
  ) {
    this.logger.log('SQLiteJobManagementController initialized');
  }

  // ===== JOB LIFECYCLE ENDPOINTS =====

  /**
   * Create a new async job
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new async job',
    description: 'Create a new asynchronous job for computer automation tasks',
  })
  @ApiResponse({
    status: 201,
    description: 'Job created successfully',
    type: CreateJobResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid job request',
  })
  @RequirePermissions('COMPUTER_CONTROL')
  async createJob(@Body() request: CreateJobRequest): Promise<CreateJobResponse> {
    const operationId = `create_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Creating new job`, {
        action: request.action.action,
        priority: request.options?.priority,
        timeout: request.options?.timeout,
      });

      // Validate action
      if (!request.action || !request.action.action) {
        throw new BadRequestException('Valid computer action is required');
      }

      // Create job options with defaults
      const jobOptions: JobOptions = {
        priority: request.options?.priority || JobPriority.NORMAL,
        timeout: request.options?.timeout || 30000,
        maxRetries: request.options?.maxRetries || 3,
        tags: request.options?.tags || [],
        metadata: request.options?.metadata,
      };

      const jobId = await this.jobManagementService.createJob(request.action, jobOptions);

      this.logger.log(`[${operationId}] Job created successfully`, {
        jobId,
        action: request.action.action,
      });

      return {
        jobId,
        status: JobStatus.PENDING,
        message: 'Job created and queued for execution',
        estimatedCompletionTime: jobOptions.timeout,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to create job`, {
        action: request.action?.action,
        error: errorMessage,
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to create job: ${errorMessage}`);
    }
  }

  /**
   * Get job status and details
   */
  @Get(':jobId')
  @ApiOperation({
    summary: 'Get job status',
    description: 'Retrieve current status and details of a job',
  })
  @ApiParam({ name: 'jobId', description: 'Unique job identifier' })
  @ApiResponse({
    status: 200,
    description: 'Job status retrieved successfully',
    type: JobStatusResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @RequirePermissions('TASK_READ')
  async getJobStatus(@Param('jobId') jobId: string): Promise<JobStatusResponse> {
    const operationId = `get_job_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting job status`, { jobId });

      const job = await this.jobManagementService.getJobStatus(jobId);

      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      return {
        jobId: job.jobId,
        status: job.status,
        priority: job.priority,
        action: job.action,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        timeoutAt: job.timeoutAt?.toISOString(),
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        executionTimeMs: job.executionTimeMs,
        queuedTimeMs: job.queuedTimeMs,
        error: job.error
          ? {
              code: job.error.code,
              message: job.error.message,
              timestamp: job.error.timestamp.toISOString(),
              retryable: job.error.retryable,
            }
          : undefined,
        metadata: {
          userId: job.metadata.userId,
          sessionId: job.metadata.sessionId,
          correlationId: job.metadata.correlationId,
          tags: job.metadata.tags,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to get job status`, {
        jobId,
        error: errorMessage,
      });

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(`Failed to get job status: ${errorMessage}`);
    }
  }

  /**
   * Get job result (when completed)
   */
  @Get(':jobId/result')
  @ApiOperation({
    summary: 'Get job result',
    description: 'Retrieve the result of a completed job',
  })
  @ApiParam({ name: 'jobId', description: 'Unique job identifier' })
  @ApiResponse({
    status: 200,
    description: 'Job result retrieved successfully',
    type: JobResultResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Job not completed',
  })
  @RequirePermissions('TASK_READ')
  async getJobResult(@Param('jobId') jobId: string): Promise<JobResultResponse> {
    const operationId = `get_job_result_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting job result`, { jobId });

      const job = await this.jobManagementService.getJobStatus(jobId);

      if (!job) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      if (job.status !== JobStatus.COMPLETED) {
        throw new BadRequestException(
          `Job ${jobId} is not completed (current status: ${job.status})`
        );
      }

      const result = await this.jobManagementService.getJobResult(jobId);

      return {
        jobId: job.jobId,
        status: job.status,
        result,
        completedAt: job.completedAt!.toISOString(),
        executionTimeMs: job.executionTimeMs,
        metadata: {
          correlationId: job.metadata.correlationId,
          tags: job.metadata.tags,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to get job result`, {
        jobId,
        error: errorMessage,
      });

      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Failed to get job result: ${errorMessage}`);
    }
  }

  /**
   * Cancel a pending or running job
   */
  @Delete(':jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel job',
    description: 'Cancel a pending or running job',
  })
  @ApiParam({ name: 'jobId', description: 'Unique job identifier' })
  @ApiResponse({
    status: 204,
    description: 'Job cancelled successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Job not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Job cannot be cancelled',
  })
  @RequirePermissions('TASK_DELETE')
  async cancelJob(@Param('jobId') jobId: string): Promise<void> {
    const operationId = `cancel_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Cancelling job`, { jobId });

      await this.jobManagementService.cancelJob(jobId);

      this.logger.log(`[${operationId}] Job cancelled successfully`, { jobId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to cancel job`, {
        jobId,
        error: errorMessage,
      });

      if (errorMessage.includes('not found')) {
        throw new NotFoundException(`Job ${jobId} not found`);
      }

      if (errorMessage.includes('cannot be cancelled')) {
        throw new BadRequestException(errorMessage);
      }

      throw new BadRequestException(`Failed to cancel job: ${errorMessage}`);
    }
  }

  // ===== JOB QUERYING ENDPOINTS =====

  /**
   * Get jobs by status
   */
  @Get('status/:status')
  @ApiOperation({
    summary: 'Get jobs by status',
    description: 'Retrieve all jobs with a specific status',
  })
  @ApiParam({
    name: 'status',
    description: 'Job status',
    enum: JobStatus,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of jobs to return',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved successfully',
    type: [JobStatusResponse],
  })
  @RequirePermissions('TASK_READ')
  async getJobsByStatus(
    @Param('status') status: JobStatus,
    @Query('limit') limit?: number,
  ): Promise<JobStatusResponse[]> {
    const operationId = `get_jobs_by_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting jobs by status`, { status, limit });

      const jobs = await this.sqliteStorageService.getJobsByStatus(status);

      // Apply limit if specified
      const limitedJobs = limit ? jobs.slice(0, limit) : jobs;

      return limitedJobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        priority: job.priority,
        action: job.action,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        timeoutAt: job.timeoutAt?.toISOString(),
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        executionTimeMs: job.executionTimeMs,
        queuedTimeMs: job.queuedTimeMs,
        error: job.error
          ? {
              code: job.error.code,
              message: job.error.message,
              timestamp: job.error.timestamp.toISOString(),
              retryable: job.error.retryable,
            }
          : undefined,
        metadata: {
          userId: job.metadata.userId,
          sessionId: job.metadata.sessionId,
          correlationId: job.metadata.correlationId,
          tags: job.metadata.tags,
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to get jobs by status`, {
        status,
        error: errorMessage,
      });

      throw new BadRequestException(`Failed to get jobs by status: ${errorMessage}`);
    }
  }

  /**
   * Get jobs by priority
   */
  @Get('priority/:priority')
  @ApiOperation({
    summary: 'Get jobs by priority',
    description: 'Retrieve all jobs with a specific priority',
  })
  @ApiParam({
    name: 'priority',
    description: 'Job priority',
    enum: JobPriority,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of jobs to return',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Jobs retrieved successfully',
    type: [JobStatusResponse],
  })
  @RequirePermissions('TASK_READ')
  async getJobsByPriority(
    @Param('priority') priority: JobPriority,
    @Query('limit') limit?: number,
  ): Promise<JobStatusResponse[]> {
    const operationId = `get_jobs_by_priority_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting jobs by priority`, { priority, limit });

      const jobs = await this.sqliteStorageService.getJobsByPriority(priority);

      // Apply limit if specified
      const limitedJobs = limit ? jobs.slice(0, limit) : jobs;

      return limitedJobs.map(job => ({
        jobId: job.jobId,
        status: job.status,
        priority: job.priority,
        action: job.action,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        timeoutAt: job.timeoutAt?.toISOString(),
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        executionTimeMs: job.executionTimeMs,
        queuedTimeMs: job.queuedTimeMs,
        error: job.error
          ? {
              code: job.error.code,
              message: job.error.message,
              timestamp: job.error.timestamp.toISOString(),
              retryable: job.error.retryable,
            }
          : undefined,
        metadata: {
          userId: job.metadata.userId,
          sessionId: job.metadata.sessionId,
          correlationId: job.metadata.correlationId,
          tags: job.metadata.tags,
        },
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to get jobs by priority`, {
        priority,
        error: errorMessage,
      });

      throw new BadRequestException(`Failed to get jobs by priority: ${errorMessage}`);
    }
  }

  // ===== MONITORING AND STATISTICS ENDPOINTS =====

  /**
   * Get queue statistics
   */
  @Get('queue/stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Retrieve comprehensive job queue statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
    type: QueueStatsResponse,
  })
  @RequirePermissions('SYSTEM_ADMIN')
  async getQueueStats(): Promise<QueueStatsResponse> {
    const operationId = `get_queue_stats_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting queue statistics`);

      const [queueStats, workerStats] = await Promise.all([
        this.jobManagementService.getQueueStats(),
        this.jobManagementService.getWorkerStats(),
      ]);

      const total = Object.values(queueStats).reduce((sum, count) => sum + count, 0);
      const errorRate = total > 0 ? (queueStats.failed + queueStats.timeout) / total : 0;

      return {
        summary: {
          total,
          pending: queueStats.pending,
          running: queueStats.running,
          completed: queueStats.completed,
          failed: queueStats.failed,
          cancelled: queueStats.cancelled,
          timeout: queueStats.timeout,
        },
        performance: {
          avgExecutionTime: workerStats.avgExecutionTime,
          avgQueueTime: 0, // TODO: Calculate from job data
          throughput: workerStats.jobsProcessed / (workerStats.uptime / 1000), // jobs per second
          errorRate,
        },
        worker: {
          isRunning: workerStats.isRunning,
          jobsProcessed: workerStats.jobsProcessed,
          jobsSucceeded: workerStats.jobsSucceeded,
          jobsFailed: workerStats.jobsFailed,
          uptime: workerStats.uptime,
          memoryUsage: workerStats.memoryUsage,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to get queue statistics`, {
        error: errorMessage,
      });

      throw new BadRequestException(`Failed to get queue statistics: ${errorMessage}`);
    }
  }

  /**
   * Get storage statistics
   */
  @Get('storage/stats')
  @ApiOperation({
    summary: 'Get storage statistics',
    description: 'Retrieve SQLite database storage statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Storage statistics retrieved successfully',
    type: StorageStatsResponse,
  })
  @RequirePermissions('SYSTEM_ADMIN')
  async getStorageStats(): Promise<StorageStatsResponse> {
    const operationId = `get_storage_stats_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting storage statistics`);

      const storageStats = await this.sqliteStorageService.getStorageStats();

      return {
        database: {
          totalJobs: storageStats.totalJobs,
          databaseSize: storageStats.databaseSize,
          connectionCount: storageStats.connectionCount,
        },
        jobsByStatus: storageStats.jobsByStatus,
        jobsByPriority: storageStats.jobsByPriority,
        performance: storageStats.queryPerformance,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to get storage statistics`, {
        error: errorMessage,
      });

      throw new BadRequestException(`Failed to get storage statistics: ${errorMessage}`);
    }
  }

  // ===== MAINTENANCE ENDPOINTS =====

  /**
   * Force cleanup of expired jobs
   */
  @Post('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cleanup expired jobs',
    description: 'Force cleanup of expired jobs from storage',
  })
  @ApiQuery({
    name: 'olderThanDays',
    description: 'Delete jobs older than specified days (default: 7)',
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
  })
  @RequirePermissions('SYSTEM_ADMIN')
  async cleanupExpiredJobs(
    @Query('olderThanDays') olderThanDays: number = 7,
  ): Promise<{ deletedCount: number; message: string }> {
    const operationId = `cleanup_jobs_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Starting job cleanup`, { olderThanDays });

      const olderThanMs = olderThanDays * 24 * 60 * 60 * 1000;
      const deletedCount = await this.sqliteStorageService.cleanupExpiredJobs(olderThanMs);

      this.logger.log(`[${operationId}] Job cleanup completed`, {
        deletedCount,
        olderThanDays,
      });

      return {
        deletedCount,
        message: `Successfully deleted ${deletedCount} expired jobs`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to cleanup expired jobs`, {
        olderThanDays,
        error: errorMessage,
      });

      throw new BadRequestException(`Failed to cleanup expired jobs: ${errorMessage}`);
    }
  }

  /**
   * Optimize database performance
   */
  @Post('optimize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Optimize database',
    description: 'Optimize SQLite database for better performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Database optimization completed successfully',
  })
  @RequirePermissions('SYSTEM_ADMIN')
  async optimizeDatabase(): Promise<{ message: string; timestamp: string }> {
    const operationId = `optimize_db_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Starting database optimization`);

      await this.sqliteStorageService.optimizeDatabase();

      const timestamp = new Date().toISOString();

      this.logger.log(`[${operationId}] Database optimization completed`);

      return {
        message: 'Database optimization completed successfully',
        timestamp,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to optimize database`, {
        error: errorMessage,
      });

      throw new BadRequestException(`Failed to optimize database: ${errorMessage}`);
    }
  }

  /**
   * Create database backup
   */
  @Post('backup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create database backup',
    description: 'Create a backup of the SQLite job database',
  })
  @ApiResponse({
    status: 200,
    description: 'Database backup created successfully',
    type: BackupResponse,
  })
  @RequirePermissions('SYSTEM_ADMIN')
  async createBackup(): Promise<BackupResponse> {
    const operationId = `create_backup_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Creating database backup`);

      const backupPath = await this.sqliteStorageService.createBackup();

      // Get backup file size
      const fs = await import('fs/promises');
      const stats = await fs.stat(backupPath);
      const backupSize = stats.size;

      const timestamp = new Date().toISOString();

      this.logger.log(`[${operationId}] Database backup created successfully`, {
        backupPath,
        backupSize,
      });

      return {
        success: true,
        backupPath,
        backupSize,
        timestamp,
        message: 'Database backup created successfully',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Failed to create database backup`, {
        error: errorMessage,
      });

      throw new BadRequestException(`Failed to create database backup: ${errorMessage}`);
    }
  }
}