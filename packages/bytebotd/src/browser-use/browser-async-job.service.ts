import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { BrowserUseService } from './browser-use.service';
import { BrowserTaskService } from './browser-task.service';
import {
  CreateAsyncJobDto,
  AsyncJobResultDto,
  AsyncJobStatus,
  AsyncJobType,
  AsyncJobPriority,
} from './dto/async-job.dto';
import {
  CreateBrowserTaskDto,
  BrowserTaskPriority,
  BrowserActionType,
} from './dto/browser-task.dto';

/**
 * Task configuration interface with proper typing
 */
interface TaskConfig {
  name: string;
  description?: string;
  url?: string;
  selectors?: string[];
  actions?: string[];
  timeout?: number;
  [key: string]: unknown;
}

/**
 * Job configuration with tasks array properly typed
 */
interface TypedJobConfiguration {
  tasks?: TaskConfig[];
  urls?: string[];
  [key: string]: unknown;
}

/**
 * Standard error interface for error handling
 */
interface StandardError {
  message: string;
  name: string;
  stack?: string;
  [key: string]: unknown;
}

/**
 * Browser Async Job Service - Long-Running Task Management
 *
 * Manages asynchronous browser automation jobs that may take extended time to complete.
 * Provides queue management, progress monitoring, and resource optimization for
 * complex browser automation workflows.
 *
 * Key Responsibilities:
 * - Async job lifecycle management
 * - Queue processing and prioritization
 * - Progress monitoring and reporting
 * - Resource allocation and cleanup
 * - Batch processing coordination
 * - Error recovery and retry logic
 */
@Injectable()
export class BrowserAsyncJobService {
  private readonly logger = new Logger(BrowserAsyncJobService.name);
  private readonly jobs: Map<string, AsyncJobResultDto> = new Map();
  private readonly jobQueue: string[] = [];
  private readonly processingJobs = new Set<string>();
  private readonly maxConcurrentJobs = 3;
  private readonly jobProcessingInterval: NodeJS.Timeout;

  constructor(
    private readonly browserService: BrowserUseService,
    private readonly taskService: BrowserTaskService,
  ) {
    // Start job processor
    this.jobProcessingInterval = setInterval(() => {
      this.processJobQueue().catch((err) => {
        this.logger.error('Job queue processing failed', err);
      });
    }, 5000); // Check every 5 seconds

    this.logger.log('Browser Async Job Service initialized');
  }

  /**
   * Create a new async job
   */
  createAsyncJob(dto: CreateAsyncJobDto): AsyncJobResultDto {
    const jobId = uuidv4();
    const now = new Date();

    this.logger.log(`Creating job: ${dto.name}`, {
      jobId,
      name: dto.name,
      jobType: dto.jobType,
      priority: dto.priority,
      estimatedDurationMs: dto.estimatedDurationMs,
    });

    try {
      const job: AsyncJobResultDto = {
        jobId,
        name: dto.name,
        description: dto.description,
        jobType: dto.jobType,
        status: AsyncJobStatus.QUEUED,
        priority: dto.priority ?? AsyncJobPriority.NORMAL,
        progress: {
          currentStep: 'Job queued for processing',
          completedSteps: 0,
          totalSteps: this.estimateTotalSteps(dto),
          percentage: 0,
          estimatedRemainingMs: dto.estimatedDurationMs ?? 300000,
        },
        createdAt: now,
        queuedAt: now,
        estimatedDurationMs: dto.estimatedDurationMs ?? 300000,
        configuration: dto.configuration,
        results: {
          tasksCompleted: 0,
          totalTasks: 0,
          screenshots: [],
          extractedData: {},
          logs: [],
        },
        metadata: {
          retryCount: 0,
          maxRetries: dto.maxRetries ?? 3,
          createdBy: 'browser-automation-api',
          tags: dto.tags ?? [],
          ...dto.metadata,
        },
      };

      // Store job
      this.jobs.set(jobId, job);

      // Add to priority queue
      this.addToQueue(jobId);

      this.logger.log(`Async job created and queued: ${jobId}`, {
        jobId,
        status: job.status,
        queuePosition: this.getQueuePosition(jobId),
      });

      return job;
    } catch (error) {
      this.logger.error(`Failed to create job: ${dto.name}`, error);
      throw error;
    }
  }

  /**
   * Get async job by ID
   */
  async getAsyncJob(_jobId: string): Promise<AsyncJobResultDto | null> {
    const job = this.jobs.get(_jobId);

    if (!job) {
      return null;
    }

    // Update progress for running jobs
    if (job.status === AsyncJobStatus.RUNNING) {
      await this.updateJobProgress(_jobId);
    }

    return job;
  }

  /**
   * Get all async jobs
   */
  async getAllAsyncJobs(): Promise<AsyncJobResultDto[]> {
    const jobs = Array.from(this.jobs.values());

    // Update progress for running jobs
    const runningJobs = jobs.filter(
      (job) => job.status === AsyncJobStatus.RUNNING,
    );
    for (const job of runningJobs) {
      await this.updateJobProgress(job.jobId);
    }

    return jobs;
  }

  /**
   * Cancel async job
   */
  async cancelAsyncJob(_jobId: string): Promise<void> {
    const job = this.jobs.get(_jobId);
    if (!job) {
      throw new Error(`Async job not found: ${_jobId}`);
    }

    if (
      job.status === AsyncJobStatus.COMPLETED ||
      job.status === AsyncJobStatus.FAILED ||
      job.status === AsyncJobStatus.CANCELLED
    ) {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    this.logger.log(`Cancelling job: ${_jobId}`, {
      jobId: _jobId,
      currentStatus: job.status,
    });

    // Store the current status before updating
    const wasRunning = job.status === AsyncJobStatus.RUNNING;

    // Update job status
    job.status = AsyncJobStatus.CANCELLED;
    job.completedAt = new Date();
    job.progress.currentStep = 'Job cancelled by user';

    // Add cancellation log
    job.results.logs.push({
      timestamp: new Date(),
      level: 'warn',
      message: 'Async job cancelled by user',
      metadata: {
        reason: 'user_cancellation',
        completedSteps: job.progress.completedSteps,
        totalSteps: job.progress.totalSteps,
      },
    });

    // Remove from queue if not yet started
    const queueIndex = this.jobQueue.indexOf(_jobId);
    if (queueIndex >= 0) {
      this.jobQueue.splice(queueIndex, 1);
    }

    // Cancel associated tasks if was running
    if (wasRunning && job.taskIds) {
      for (const taskId of job.taskIds) {
        try {
          await this.taskService.cancelTask(taskId);
        } catch (error) {
          this.logger.warn(`Failed to cancel associated task: ${taskId}`, error);
        }
      }
    }

    // Remove from processing set
    this.processingJobs.delete(_jobId);

    this.jobs.set(_jobId, job);

    this.logger.log(`Async job cancelled: ${_jobId}`, {
      jobId: _jobId,
      completedSteps: job.progress.completedSteps,
      totalSteps: job.progress.totalSteps,
    });
  }

  /**
   * Delete completed job (cleanup)
   */
  async deleteAsyncJob(_jobId: string): Promise<void> {
    const job = this.jobs.get(_jobId);
    if (!job) {
      return;
    }

    // Only allow deletion of completed, failed, or cancelled jobs
    if (
      job.status === AsyncJobStatus.RUNNING ||
      job.status === AsyncJobStatus.QUEUED
    ) {
      throw new Error(`Cannot delete job in status: ${job.status}`);
    }

    // Remove from queue if present
    const queueIndex = this.jobQueue.indexOf(_jobId);
    if (queueIndex >= 0) {
      this.jobQueue.splice(queueIndex, 1);
    }

    // Delete associated tasks
    if (job.taskIds) {
      for (const taskId of job.taskIds) {
        try {
          await this.taskService.deleteTask(taskId);
        } catch (error) {
          this.logger.warn(`Failed to delete associated task: ${taskId}`, error);
        }
      }
    }

    // Delete job
    this.jobs.delete(_jobId);

    this.logger.log(`Async job deleted: ${_jobId}`, {
      jobId: _jobId,
      status: job.status,
    });
  }

  /**
   * Get queue status and statistics
   */
  getQueueStatus(): {
    queueLength: number;
    processingJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalJobs: number;
    averageProcessingTime: number;
  } {
    const jobs = Array.from(this.jobs.values());

    const completedJobs = jobs.filter(
      (j) => j.status === AsyncJobStatus.COMPLETED,
    );
    const failedJobs = jobs.filter((j) => j.status === AsyncJobStatus.FAILED);

    const totalProcessingTime = completedJobs.reduce((sum, job) => {
      if (job.startedAt && job.completedAt) {
        return sum + (job.completedAt.getTime() - job.startedAt.getTime());
      }
      return sum;
    }, 0);

    const averageProcessingTime =
      completedJobs.length > 0 ? totalProcessingTime / completedJobs.length : 0;

    return {
      queueLength: this.jobQueue.length,
      processingJobs: this.processingJobs.size,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      totalJobs: this.jobs.size,
      averageProcessingTime: Math.round(averageProcessingTime),
    };
  }

  /**
   * Clean up old jobs
   */
  async cleanupOldJobs(_maxAge: number): Promise<number> {
    // 24 hours default
    const now = Date.now();
    let cleanedCount = 0;

    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      // Skip active jobs
      if (
        job.status === AsyncJobStatus.RUNNING ||
        job.status === AsyncJobStatus.QUEUED
      ) {
        continue;
      }

      // Check age
      const jobAge = job.completedAt
        ? now - job.completedAt.getTime()
        : now - job.createdAt.getTime();

      if (jobAge > _maxAge) {
        await this.deleteAsyncJob(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} old jobs`, {
        cleanedCount,
        maxAgeHours: _maxAge / (1000 * 60 * 60),
        remainingJobs: this.jobs.size,
      });
    }

    return cleanedCount;
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  /**
   * Process job queue
   */
  private async processJobQueue(): Promise<void> {
    // Check if we can process more jobs
    if (this.processingJobs.size >= this.maxConcurrentJobs) {
      return;
    }

    // Get next job from queue
    const jobId = this.getNextJobFromQueue();
    if (!jobId) {
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    // Start processing job
    this.processingJobs.add(jobId);

    this.logger.log(`Starting job processing: ${jobId}`, {
      jobId,
      jobType: job.jobType,
      priority: job.priority,
    });

    try {
      await this.processJob(job);
    } catch (error) {
      this.logger.error(`Job processing failed: ${jobId}`, error);
      await this.handleJobFailure(jobId, error);
    } finally {
      this.processingJobs.delete(jobId);
    }
  }

  /**
   * Process individual job
   */
  private async processJob(_job: AsyncJobResultDto): Promise<void> {
    // Update job status
    _job.status = AsyncJobStatus.RUNNING;
    _job.startedAt = new Date();
    _job.progress.currentStep = 'Initializing job processing';

    this.jobs.set(_job.jobId, _job);

    switch (_job.jobType) {
      case AsyncJobType.BATCH_AUTOMATION:
        await this.processBatchAutomation(_job);
        break;

      case AsyncJobType.DATA_EXTRACTION:
        await this.processDataExtraction(_job);
        break;

      case AsyncJobType.FORM_FILLING:
        await this.processFormFilling(_job);
        break;

      case AsyncJobType.SCREENSHOT_CAPTURE:
        await this.processScreenshotCapture(_job);
        break;

      case AsyncJobType.CUSTOM_WORKFLOW:
        await this.processCustomWorkflow(_job);
        break;

      default:
        // TypeScript exhaustiveness check - this should never be reached
        throw new Error(`Unsupported job type: ${_job.jobType as string}`);
    }

    // Mark job as completed
    await this.completeJob(_job);
  }

  /**
   * Process batch automation job
   */
  private async processBatchAutomation(_job: AsyncJobResultDto): Promise<void> {
    const config = _job.configuration as TypedJobConfiguration;
    const tasks = Array.isArray(config.tasks)
      ? config.tasks
      : ([] as TaskConfig[]);

    _job.progress.totalSteps = tasks.length;
    _job.results.totalTasks = tasks.length;

    for (let i = 0; i < tasks.length; i++) {
      const taskConfig = tasks[i];

      if (!taskConfig) {
        this.logger.warn(`Task config at index ${i} is undefined, skipping`);
        continue;
      }

      _job.progress.currentStep = `Processing task ${i + 1}/${tasks.length}: ${taskConfig.name}`;
      _job.progress.completedSteps = i;
      _job.progress.percentage = Math.round((i / tasks.length) * 100);

      this.jobs.set(_job.jobId, _job);

      try {
        // Convert TaskConfig to CreateBrowserTaskDto format
        const taskDto: CreateBrowserTaskDto = {
          name: taskConfig.name,
          description: taskConfig.description ?? `Task: ${taskConfig.name}`,
          actions: (taskConfig.actions ?? []).map((action) => ({
            type: action as BrowserActionType,
            selector: taskConfig.selectors?.[0],
            url: taskConfig.url,
            waitTimeoutMs: taskConfig.timeout ?? 5000,
          })),
          priority: BrowserTaskPriority.NORMAL,
          sessionConfig: undefined,
          maxExecutionTimeMs: taskConfig.timeout ?? 300000,
          metadata: { ...taskConfig },
          enableLogging: true,
          continueOnError: false,
        };

        const taskResult =
          await this.browserService.executeBrowserTask(taskDto);

        // Store task ID for tracking
        _job.taskIds ??= [];
        _job.taskIds.push(taskResult.taskId);

        // Collect results
        if (taskResult.screenshots) {
          _job.results.screenshots.push(...taskResult.screenshots);
        }

        if (taskResult.extractedData) {
          _job.results.extractedData[`task${i}`] = taskResult.extractedData;
        }

        _job.results.tasksCompleted++;

        _job.results.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Task completed: ${taskConfig.name}`,
          metadata: {
            taskIndex: i,
            taskId: taskResult.taskId,
            status: taskResult.status,
          },
        });
      } catch (error) {
        _job.results.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `Task failed: ${taskConfig?.name ?? 'Unknown task'}`,
          metadata: {
            taskIndex: i,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        // Continue with next task unless configured to stop on error
        if (!config.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * Process data extraction job
   */
  private async processDataExtraction(_job: AsyncJobResultDto): Promise<void> {
    const config = _job.configuration as TypedJobConfiguration;
    const urls = Array.isArray(config.urls) ? config.urls : ([] as string[]);

    _job.progress.totalSteps = urls.length;

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      if (!url) {
        this.logger.warn(`URL at index ${i} is undefined, skipping`);
        continue;
      }

      _job.progress.currentStep = `Extracting data from ${url}`;
      _job.progress.completedSteps = i;
      _job.progress.percentage = Math.round((i / urls.length) * 100);

      this.jobs.set(_job.jobId, _job);

      try {
        // Create session for data extraction
        const sessionId = await this.createExtractionSession();

        const extractedData = await this.browserService.extractPageData(
          sessionId,
          {
            selectors:
              typeof config.selectors === 'object' &&
              config.selectors !== null &&
              !Array.isArray(config.selectors)
                ? (config.selectors as Record<string, string>)
                : ({} as Record<string, string>),
            waitForSelector:
              typeof config.waitForSelector === 'string'
                ? config.waitForSelector
                : undefined,
            timeout:
              typeof config.timeout === 'number' ? config.timeout : 30000,
          },
        );

        _job.results.extractedData[url] = extractedData;

        _job.results.logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Data extracted from: ${url}`,
          metadata: {
            url,
            dataKeys: Object.keys(extractedData).length,
          },
        });
      } catch (error) {
        _job.results.logs.push({
          timestamp: new Date(),
          level: 'error',
          message: `Data extraction failed for: ${url}`,
          metadata: {
            url,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        if (!config.continueOnError) {
          throw error;
        }
      }
    }
  }

  /**
   * Process other job types (placeholder implementations)
   */
  private processFormFilling(_job: AsyncJobResultDto): void {
    // Implementation for form filling jobs
    _job.progress.currentStep = 'Processing form filling job';
    _job.progress.completedSteps = 1;
    _job.progress.totalSteps = 1;
    _job.progress.percentage = 100;
  }

  private processScreenshotCapture(_job: AsyncJobResultDto): void {
    // Implementation for screenshot capture jobs
    _job.progress.currentStep = 'Processing screenshot capture job';
    _job.progress.completedSteps = 1;
    _job.progress.totalSteps = 1;
    _job.progress.percentage = 100;
  }

  private processCustomWorkflow(_job: AsyncJobResultDto): void {
    // Implementation for custom workflow jobs
    _job.progress.currentStep = 'Processing custom workflow job';
    _job.progress.completedSteps = 1;
    _job.progress.totalSteps = 1;
    _job.progress.percentage = 100;
  }

  /**
   * Complete job processing
   */
  private completeJob(_job: AsyncJobResultDto): void {
    _job.status = AsyncJobStatus.COMPLETED;
    _job.completedAt = new Date();
    _job.progress.currentStep = 'Job completed successfully';
    _job.progress.percentage = 100;

    if (_job.startedAt) {
      _job.actualDurationMs =
        _job.completedAt.getTime() - _job.startedAt.getTime();
    }

    _job.results.logs.push({
      timestamp: new Date(),
      level: 'info',
      message: 'Async job completed successfully',
      metadata: {
        tasksCompleted: _job.results.tasksCompleted,
        totalTasks: _job.results.totalTasks,
        actualDurationMs: _job.actualDurationMs,
      },
    });

    this.jobs.set(_job.jobId, _job);

    this.logger.log(`Async job completed: ${_job.jobId}`, {
      jobId: _job.jobId,
      actualDurationMs: _job.actualDurationMs,
      tasksCompleted: _job.results.tasksCompleted,
    });
  }

  /**
   * Handle job failure
   */
  private handleJobFailure(
    jobId: string,
    error: StandardError | Error | unknown,
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = AsyncJobStatus.FAILED;
    job.completedAt = new Date();
    job.errorMessage = error instanceof Error ? error.message : String(error);
    job.progress.currentStep = `Job failed: ${job.errorMessage}`;

    if (job.startedAt) {
      job.actualDurationMs =
        job.completedAt.getTime() - job.startedAt.getTime();
    }

    job.results.logs.push({
      timestamp: new Date(),
      level: 'error',
      message: 'Async job failed',
      metadata: {
        error: job.errorMessage,
        retryCount: job.metadata.retryCount,
        maxRetries: job.metadata.maxRetries,
      },
    });

    // Check if we should retry
    if (job.metadata.retryCount < job.metadata.maxRetries) {
      job.metadata.retryCount++;
      job.status = AsyncJobStatus.QUEUED;
      job.progress.currentStep = `Retrying job (attempt ${job.metadata.retryCount + 1}/${job.metadata.maxRetries + 1})`;

      // Add back to queue for retry
      this.addToQueue(jobId);

      this.logger.warn(`Job failed, retrying: ${jobId}`, {
        jobId,
        retryCount: job.metadata.retryCount,
        maxRetries: job.metadata.maxRetries,
      });
    } else {
      this.logger.error(`Job failed permanently: ${jobId}`, {
        jobId,
        error: job.errorMessage,
        retryCount: job.metadata.retryCount,
      });
    }

    this.jobs.set(jobId, job);
  }

  /**
   * Update job progress
   */
  private updateJobProgress(_jobId: string): void {
    const job = this.jobs.get(_jobId);
    if (!job || job.status !== AsyncJobStatus.RUNNING) {
      return;
    }

    // Update estimated remaining time
    if (job.startedAt && job.progress.completedSteps > 0) {
      const elapsed = Date.now() - job.startedAt.getTime();
      const avgTimePerStep = elapsed / job.progress.completedSteps;
      const remainingSteps =
        job.progress.totalSteps - job.progress.completedSteps;
      job.progress.estimatedRemainingMs = remainingSteps * avgTimePerStep;
    }

    this.jobs.set(_jobId, job);
  }

  /**
   * Add job to priority queue
   */
  private addToQueue(_jobId: string): void {
    const job = this.jobs.get(_jobId);
    if (!job) {
      return;
    }

    // Insert based on priority
    const priorityOrder = {
      [AsyncJobPriority.CRITICAL]: 0,
      [AsyncJobPriority.URGENT]: 1,
      [AsyncJobPriority.HIGH]: 2,
      [AsyncJobPriority.NORMAL]: 3,
      [AsyncJobPriority.LOW]: 4,
    };

    const jobPriorityValue = priorityOrder[job.priority];
    let insertIndex = this.jobQueue.length;

    // Find correct insertion position
    for (let i = 0; i < this.jobQueue.length; i++) {
      const queuedJobId = this.jobQueue[i];
      if (!queuedJobId) continue;
      const queuedJob = this.jobs.get(queuedJobId);

      if (queuedJob) {
        const queuedPriorityValue = priorityOrder[queuedJob.priority];
        if (jobPriorityValue < queuedPriorityValue) {
          insertIndex = i;
          break;
        }
      }
    }

    this.jobQueue.splice(insertIndex, 0, _jobId);

    this.logger.log(`Job added to queue: ${_jobId}`, {
      jobId: _jobId,
      priority: job.priority,
      queuePosition: insertIndex,
      queueLength: this.jobQueue.length,
    });
  }

  /**
   * Get next job from queue
   */
  private getNextJobFromQueue(): string | null {
    return this.jobQueue.shift() ?? null;
  }

  /**
   * Get queue position
   */
  private getQueuePosition(_jobId: string): number {
    return this.jobQueue.indexOf(_jobId);
  }

  /**
   * Estimate total steps for job
   */
  private estimateTotalSteps(_dto: CreateAsyncJobDto): number {
    switch (_dto.jobType) {
      case AsyncJobType.BATCH_AUTOMATION:
        return Array.isArray(_dto.configuration.tasks)
          ? _dto.configuration.tasks.length
          : 1;
      case AsyncJobType.DATA_EXTRACTION:
        return Array.isArray(_dto.configuration.urls)
          ? _dto.configuration.urls.length
          : 1;
      default:
        return 1;
    }
  }

  /**
   * Create session for extraction
   */
  private createExtractionSession(): string {
    // This would create a browser session for data extraction
    // For now, return a mock session ID
    return `extraction_session${Date.now()}`;
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy() {
    if (this.jobProcessingInterval) {
      clearInterval(this.jobProcessingInterval);
    }

    // Cancel all running jobs
    for (const jobId of Array.from(this.processingJobs)) {
      this.cancelAsyncJob(jobId).catch((err) => {
        this.logger.error(
          `Failed to cancel job during shutdown: ${jobId}`,
          err,
        );
      });
    }
  }
}
