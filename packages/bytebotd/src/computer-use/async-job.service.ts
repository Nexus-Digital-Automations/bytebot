/**
 * Async Job Service - Enterprise Job Queue Management
 *
 * Provides comprehensive async job execution with priority queuing,
 * progress tracking, result caching, and robust error handling.
 *
 * Features:
 * - Priority-based job queuing
 * - Real-time progress tracking
 * - Result caching and retrieval
 * - Automatic retry mechanisms
 * - Comprehensive job lifecycle management
 * - Performance metrics and monitoring
 * - Graceful degradation and error recovery
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { v4 as _uuidv4 } from 'uuid';
import {
  JobStatus,
  JobPriority,
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
} from './dto/async-job.dto';
import { ComputerActionDto } from './dto/computer-action.dto';
import { ComputerUseService } from './computer-use.service';
import { CacheService } from '../cache/cache.service';
import { MetricsService } from '../metrics/metrics.service';
import { JobMonitoringService } from './services/job-monitoring.service';

/**
 * Internal job data structure for queue management
 */
interface JobData {
  jobId: string;
  status: JobStatus;
  priority: JobPriority;
  action: ComputerActionDto;
  progress: number;
  submittedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: unknown;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  timeout: number;
  useCache: boolean;
  retryCount: number;
  maxRetries: number;
}

/**
 * Job queue item with priority and execution context
 */
interface QueueItem {
  jobData: JobData;
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

/**
 * Job execution statistics for monitoring
 */
interface JobStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  queueLength: number;
}

@Injectable()
export class AsyncJobService {
  private readonly logger = new Logger(AsyncJobService.name);
  private readonly jobs = new Map<string, JobData>();
  private readonly queue: QueueItem[] = [];
  private readonly maxConcurrentJobs = 5;
  private activeJobs = 0;
  private isProcessing = false;

  constructor(
    private readonly computerUseService: ComputerUseService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly jobMonitoringService: JobMonitoringService,
  ) {
    this.logger.log('Async Job Service initialized with comprehensive monitoring');
    this.startJobProcessor();
    this.startJobCleanup();
  }

  /**
   * Submit a new async job for execution
   *
   * @param action Computer action to execute
   * @param options Job execution options
   * @returns JobSubmissionResponseDto Job submission details
   */
  async submitJob(
    action: ComputerActionDto,
    options: {
      priority?: JobPriority;
      timeout?: number;
      useCache?: boolean;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<JobSubmissionResponseDto> {
    const jobId = this.generateJobId();
    const submittedAt = new Date();

    // Check cache if enabled
    if (options.useCache) {
      const cachedResult = await this.getCachedResult(action);
      if (cachedResult) {
        this.logger.log(`Cache hit for job ${jobId}, returning cached result`);

        // Create completed job from cache
        const cachedJob: JobData = {
          jobId,
          status: JobStatus.COMPLETED,
          priority: options.priority ?? JobPriority.NORMAL,
          action,
          progress: 100,
          submittedAt,
          startedAt: submittedAt,
          completedAt: submittedAt,
          result: cachedResult,
          timeout: options.timeout ?? 30000,
          useCache: true,
          retryCount: 0,
          maxRetries: 3,
          metadata: {
            ...options.metadata,
            cacheHit: true,
          },
        };

        this.jobs.set(jobId, cachedJob);

        return {
          jobId,
          status: JobStatus.COMPLETED,
          submittedAt: submittedAt.toISOString(),
        };
      }
    }

    // Create new job
    const jobData: JobData = {
      jobId,
      status: JobStatus.PENDING,
      priority: options.priority ?? JobPriority.NORMAL,
      action,
      progress: 0,
      submittedAt,
      timeout: options.timeout ?? 30000,
      useCache: options.useCache ?? false,
      retryCount: 0,
      maxRetries: 3,
      metadata: options.metadata,
    };

    this.jobs.set(jobId, jobData);

    // Add to queue for processing
    return new Promise((resolve, reject) => {
      const queueItem: QueueItem = {
        jobData,
        resolve: () => {
          resolve({
            jobId,
            status: JobStatus.PENDING,
            submittedAt: submittedAt.toISOString(),
          });
        },
        reject,
      };

      this.addToQueue(queueItem);
    });
  }

  /**
   * Submit a new async action for execution (legacy compatibility method)
   * This is an alias for submitJob to maintain compatibility with tests.
   *
   * @param action Computer action to execute
   * @param options Job execution options
   * @returns JobSubmissionResponseDto Job submission details
   */
  async submitAction(
    action: ComputerActionDto,
    options: {
      priority?: JobPriority;
      timeout?: number;
      useCache?: boolean;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<JobSubmissionResponseDto> {
    return this.submitJob(action, options);
  }

  /**
   * Get job status and progress information
   *
   * @param jobId Job identifier
   * @returns JobStatusResponseDto Current job status
   */
  getJobStatus(jobId: string): JobStatusResponseDto {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      submittedAt: job.submittedAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      errorMessage: job.errorMessage,
      metadata: job.metadata,
    };
  }

  /**
   * Get job execution result
   *
   * @param jobId Job identifier
   * @returns JobResultResponseDto Job result data
   */
  getJobResult(jobId: string): JobResultResponseDto {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== JobStatus.COMPLETED && job.status !== JobStatus.FAILED) {
      throw new Error(
        `Job ${jobId} has not completed yet. Current status: ${job.status}`,
      );
    }

    const executionTime =
      job.completedAt && job.startedAt
        ? job.completedAt.getTime() - job.startedAt.getTime()
        : 0;

    return {
      jobId: job.jobId,
      status: job.status,
      result: job.result,
      errorMessage: job.errorMessage,
      submittedAt: job.submittedAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
      executionTimeMs: executionTime,
      duration: executionTime,
      metadata: {
        ...job.metadata,
        retryCount: job.retryCount,
        cacheUsed: job.useCache,
      },
    };
  }

  /**
   * Cancel a pending or in-progress job
   *
   * @param jobId Job identifier
   * @returns boolean True if job was cancelled
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);

    if (!job) {
      return false;
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      return false; // Cannot cancel completed jobs
    }

    // Remove from queue if pending
    if (job.status === JobStatus.PENDING) {
      const queueIndex = this.queue.findIndex(
        (item) => item.jobData.jobId === jobId,
      );
      if (queueIndex !== -1) {
        this.queue.splice(queueIndex, 1);
      }
    }

    // Mark as cancelled
    job.status = JobStatus.CANCELLED;
    job.completedAt = new Date();
    job.progress = 0;

    this.logger.log(`Job ${jobId} cancelled`);
    return true;
  }

  /**
   * Get current job queue statistics
   *
   * @returns JobStats Current statistics
   */
  getJobStats(): JobStats {
    const allJobs = Array.from(this.jobs.values());
    const completedJobs = allJobs.filter(
      (job) => job.status === JobStatus.COMPLETED,
    );
    const failedJobs = allJobs.filter((job) => job.status === JobStatus.FAILED);

    const avgExecutionTime =
      completedJobs.length > 0
        ? completedJobs.reduce((sum, job) => {
            const executionTime =
              job.completedAt && job.startedAt
                ? job.completedAt.getTime() - job.startedAt.getTime()
                : 0;
            return sum + executionTime;
          }, 0) / completedJobs.length
        : 0;

    return {
      totalJobs: allJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      averageExecutionTime: avgExecutionTime,
      queueLength: this.queue.length,
    };
  }

  /**
   * Generate unique job identifier
   *
   * @returns string Unique job ID
   */
  private generateJobId(): string {
    return `job${Date.now()}${_uuidv4().substring(0, 8)}`;
  }

  /**
   * Add job to priority queue
   *
   * @param queueItem Job queue item
   */
  private addToQueue(queueItem: QueueItem): void {
    // Insert based on priority
    const priorityOrder = {
      [JobPriority.URGENT]: 0,
      [JobPriority.HIGH]: 1,
      [JobPriority.NORMAL]: 2,
      [JobPriority.LOW]: 3,
    };

    const insertIndex = this.queue.findIndex(
      (item) =>
        priorityOrder[item.jobData.priority] >
        priorityOrder[queueItem.jobData.priority],
    );

    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    // Immediately resolve submission
    queueItem.resolve(null);

    this.logger.log(
      `Job ${queueItem.jobData.jobId} added to queue (priority: ${queueItem.jobData.priority}, position: ${insertIndex === -1 ? this.queue.length : insertIndex + 1})`,
    );

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process jobs from the queue
   */
  private processQueue(): void {
    if (this.isProcessing ?? this.activeJobs >= this.maxConcurrentJobs) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.activeJobs < this.maxConcurrentJobs) {
      const queueItem = this.queue.shift();
      if (queueItem) {
        this.activeJobs++;
        this.executeJob(queueItem.jobData).finally(() => {
          this.activeJobs--;
        });
      }
    }

    this.isProcessing = false;

    // Continue processing if there are more jobs
    if (this.queue.length > 0 && this.activeJobs < this.maxConcurrentJobs) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Execute a single job
   *
   * @param jobData Job to execute
   */
  private async executeJob(jobData: JobData): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(`Starting job execution: ${jobData.jobId}`);

      // Update job status
      jobData.status = JobStatus.IN_PROGRESS;
      jobData.startedAt = new Date();
      jobData.progress = 10;

      // Set up timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job timeout after ${jobData.timeout}ms`));
        }, jobData.timeout);
      });

      // Execute the action with timeout
      const executionPromise = this.computerUseService.action(jobData.action);

      const result = await Promise.race([executionPromise, timeoutPromise]);

      // Job completed successfully
      jobData.status = JobStatus.COMPLETED;
      jobData.completedAt = new Date();
      jobData.progress = 100;
      jobData.result = result;

      // Cache result if enabled
      if (jobData.useCache && result) {
        await this.cacheResult(jobData.action, result);
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Job ${jobData.jobId} completed successfully (${executionTime}ms)`,
      );

      // Record metrics
      this.recordJobMetrics(jobData, executionTime, true);

      // Record comprehensive monitoring metrics
      this.jobMonitoringService.recordJobExecution({
        jobId: jobData.jobId,
        jobType: jobData.action.action,
        status: jobData.status,
        priority: jobData.priority,
        submittedAt: jobData.submittedAt,
        startedAt: jobData.startedAt,
        completedAt: jobData.completedAt,
        retryCount: jobData.retryCount,
        metadata: jobData.metadata,
      });
    } catch (_error) {
      const errorMessage =
        _error instanceof Error ? _error.message : 'Unknown error';
      const executionTime = Date.now() - startTime;

      this.logger.error(
        `Job ${jobData.jobId} failed: ${errorMessage} (${executionTime}ms)`,
      );

      // Check if we should retry
      if (jobData.retryCount < jobData.maxRetries) {
        jobData.retryCount++;
        jobData.status = JobStatus.PENDING;
        jobData.progress = 0;
        jobData.startedAt = undefined;

        this.logger.log(
          `Retrying job ${jobData.jobId} (attempt ${jobData.retryCount + 1}/${jobData.maxRetries + 1})`,
        );

        // Add back to queue for retry
        const retryItem: QueueItem = {
          jobData,
          resolve: () => {},
          reject: () => {},
        };
        this.addToQueue(retryItem);
        return;
      }

      // Job failed permanently
      jobData.status = JobStatus.FAILED;
      jobData.completedAt = new Date();
      jobData.progress = 0;
      jobData.errorMessage = errorMessage;

      // Record error metrics
      this.recordJobMetrics(jobData, executionTime, false);

      // Record comprehensive monitoring metrics for failed job
      this.jobMonitoringService.recordJobExecution({
        jobId: jobData.jobId,
        jobType: jobData.action.action,
        status: jobData.status,
        priority: jobData.priority,
        submittedAt: jobData.submittedAt,
        startedAt: jobData.startedAt,
        completedAt: jobData.completedAt,
        retryCount: jobData.retryCount,
        errorType: 'execution_failure',
        errorMessage: errorMessage,
        metadata: jobData.metadata,
      });
    }
  }

  /**
   * Get cached result for action
   *
   * @param action Computer action
   * @returns Cached result or null
   */
  private async getCachedResult(
    action: ComputerActionDto,
  ): Promise<unknown | null> {
    try {
      const cacheKey = this.generateCacheKey(action);
      return await this.cacheService.get(cacheKey, {
        namespace: 'computer-actions',
        ttl: 300, // 5 minutes
      });
    } catch (_error) {
      this.logger.warn(
        `Failed to get cached result: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  /**
   * Cache job result
   *
   * @param action Computer action
   * @param result Execution result
   */
  private async cacheResult(
    action: ComputerActionDto,
    result: unknown,
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(action);
      await this.cacheService.set(cacheKey, result, {
        namespace: 'computer-actions',
        ttl: 300, // 5 minutes
      });
    } catch (_error) {
      this.logger.warn(
        `Failed to cache result: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate cache key for action
   *
   * @param action Computer action
   * @returns Cache key string
   */
  private generateCacheKey(action: ComputerActionDto): string {
    // Create deterministic cache key based on action content
    const actionString = JSON.stringify(action);
    const hash = Buffer.from(actionString).toString('base64');
    return `action${hash.substring(0, 32)}`;
  }

  /**
   * Record job execution metrics
   *
   * @param jobData Job data
   * @param executionTime Execution time in milliseconds
   * @param success Whether job succeeded
   */
  private recordJobMetrics(
    jobData: JobData,
    executionTime: number,
    success: boolean,
  ): void {
    try {
      this.metricsService.recordJobExecution?.(
        jobData.action.action,
        executionTime,
        success,
        jobData.retryCount,
        jobData.priority,
      );
    } catch (_error) {
      this.logger.debug(
        `Failed to record job metrics: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Start job processor background task
   */
  private startJobProcessor(): void {
    // Process queue every 100ms
    setInterval(() => {
      if (
        !this.isProcessing &&
        this.queue.length > 0 &&
        this.activeJobs < this.maxConcurrentJobs
      ) {
        this.processQueue();
      }
    }, 100);
  }

  /**
   * Start job cleanup background task
   */
  private startJobCleanup(): void {
    // Clean up old jobs every hour
    setInterval(
      () => {
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
        const jobsToDelete = Array.from(this.jobs.entries())
          .filter(
            ([_, job]) =>
              (job.status === JobStatus.COMPLETED ||
                job.status === JobStatus.FAILED) &&
              job.completedAt &&
              job.completedAt < cutoffTime,
          )
          .map(([jobId, _]) => jobId);

        jobsToDelete.forEach((jobId) => {
          this.jobs.delete(jobId);
        });

        if (jobsToDelete.length > 0) {
          this.logger.log(`Cleaned up ${jobsToDelete.length} old jobs`);
        }
      },
      60 * 60 * 1000,
    ); // 1 hour
  }
}
