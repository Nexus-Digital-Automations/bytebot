/**
 * Enhanced Async Job Service - Enterprise Batch Job Management
 *
 * Extends the base AsyncJobService with enterprise-grade batch operations,
 * advanced job search and filtering, dependency management, and real-time
 * progress tracking capabilities.
 *
 * Features:
 * - Batch job submission with dependency management
 * - Advanced job search and filtering
 * - Real-time progress tracking with WebSocket support
 * - Job analytics and performance monitoring
 * - Dependency resolution and execution optimization
 * - Enhanced error handling and recovery
 *
 * @author Claude Code - Enterprise Controller Enhancement Specialist
 * @version 2.0.0
 */

import { Injectable, Logger } from '@nestjs/common';import { EventEmitter2 } from '@nestjs/event-emitter';import { v4 as uuidv4 } from 'uuid';import {JobStatus,
  JobPriority,
  JobSubmissionResponseDto,
  JobStatusResponseDto,
  JobResultResponseDto,
} from './dto/async-job.dto';import {BatchJobSubmissionDto,
  BatchJobSubmissionResponseDto,
  BatchJobSpecDto,
  BatchExecutionMode,
  DependencyType,
  JobSearchCriteriaDto,
  JobSearchResultsDto,
  JobAnalyticsDto,
  JobProgressUpdateDto,
} from './dto/batch-job.dto';import { ComputerActionDto } from './dto/computer-action.dto';import { AsyncJobService } from './async-job.service';/*** Enhanced job data structure with batch and dependency support
 */
interface EnhancedJobData {
  jobId: string;
  batchId?: string;
  jobKey?: string;
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
  dependencies: string[]; // Job IDs this job depends on
  dependents: string[]; // Job IDs that depend on this job
  executionTime?: number;
  currentStep?: string;
  estimatedCompletion?: Date;
}

/**
 * Batch execution context
 */
interface BatchContext {
  batchId: string;
  executionMode: BatchExecutionMode;
  jobKeys: Record<string, string>; // jobKey -> jobId mapping
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  stopOnFirstFailure: boolean;
  submittedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Job dependency graph node
 */
interface DependencyNode {
  jobId: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  isResolved: boolean;
}

@Injectable()
export class EnhancedAsyncJobService {
  private readonly logger = new Logger(EnhancedAsyncJobService.name);
  private readonly enhancedJobs = new Map<string, EnhancedJobData>();
  private readonly batches = new Map<string, BatchContext>();
  private readonly dependencyGraph = new Map<string, DependencyNode>();

  constructor(
    private readonly baseAsyncJobService: AsyncJobService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Enhanced Async Job Service initialized');
    this.startProgressTracking();
  }

  /**
   * Submit a batch of jobs for execution with dependency management
   *
   * @param batchRequest Batch job submission request
   * @param metadata Additional metadata for tracking
   * @returns BatchJobSubmissionResponseDto Batch submission response
   */
  async submitBatch(
    batchRequest: BatchJobSubmissionDto,
    metadata?: Record<string, unknown>,
  ): Promise<BatchJobSubmissionResponseDto> {
    const batchId = this.generateBatchId();
    const submittedAt = new Date();
    const jobIds: Record<string, string> = {};

    this.logger.log(
      `Submitting batch ${batchId} with ${batchRequest.jobs.length} jobs`,
      {
        batchId,
        executionMode: batchRequest.executionMode,
        totalJobs: batchRequest.jobs.length,
      },
    );

    // Create batch context
    const batchContext: BatchContext = {
      batchId,
      executionMode: batchRequest.executionMode,
      jobKeys: {},
      totalJobs: batchRequest.jobs.length,
      completedJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      stopOnFirstFailure: batchRequest.stopOnFirstFailure ?? false,
      submittedAt,
      metadata: { ...batchRequest.metadata, ...metadata },
    };

    // Validate job keys are unique
    const jobKeys = batchRequest.jobs.map((job) => job.jobKey);
    const uniqueJobKeys = new Set(jobKeys);
    if (jobKeys.length !== uniqueJobKeys.size) {
      throw new Error('Duplicate job keys found in batch submission');
    }

    // Create jobs and build dependency graph
    const createdJobs: EnhancedJobData[] = [];
    for (const jobSpec of batchRequest.jobs) {
      const jobId = this.generateJobId();
      jobIds[jobSpec.jobKey] = jobId;
      batchContext.jobKeys[jobSpec.jobKey] = jobId;

      const enhancedJob: EnhancedJobData = {
        jobId,
        batchId,
        jobKey: jobSpec.jobKey,
        status: JobStatus.PENDING,
        priority: jobSpec.priority ?? batchRequest.batchPriority ?? JobPriority.NORMAL,
        action: jobSpec.action,
        progress: 0,
        submittedAt,
        timeout: jobSpec.timeout ?? 30000,
        useCache: jobSpec.useCache ?? false,
        retryCount: 0,
        maxRetries: 3,
        dependencies: [],
        dependents: [],
        metadata: {
          ...jobSpec.metadata,
          batchId,
          jobKey: jobSpec.jobKey,
        },
      };

      this.enhancedJobs.set(jobId, enhancedJob);
      createdJobs.push(enhancedJob);

      // Initialize dependency graph node
      this.dependencyGraph.set(jobId, {
        jobId,
        dependencies: new Set(),
        dependents: new Set(),
        isResolved: false,
      });
    }

    // Build dependency relationships
    for (const jobSpec of batchRequest.jobs) {
      const jobId = batchContext.jobKeys[jobSpec.jobKey];
      const job = this.enhancedJobs.get(jobId)!;
      const depNode = this.dependencyGraph.get(jobId)!;

      if (jobSpec.dependencies) {
        for (const dep of jobSpec.dependencies) {
          const depJobId = batchContext.jobKeys[dep.dependsOnJobId];
          if (!depJobId) {
            throw new Error(
              `Dependency job key '${dep.dependsOnJobId}' not found in batch',);
          }

          job.dependencies.push(depJobId);
          depNode.dependencies.add(depJobId);

          // Add this job as dependent of the dependency
          const depJob = this.enhancedJobs.get(depJobId)!;
          const depDepNode = this.dependencyGraph.get(depJobId)!;
          depJob.dependents.push(jobId);
          depDepNode.dependents.add(jobId);
        }
      }
    }

    // Validate dependency graph for cycles
    this.validateDependencyGraph(batchId);

    // Store batch context
    this.batches.set(batchId, batchContext);

    // Execute batch based on execution mode
    await this.executeBatch(batchId, batchRequest.executionMode);

    this.logger.log(
      `Batch ${batchId} submitted successfully with ${Object.keys(jobIds).length} jobs`,
      {
        batchId,
        jobIds: Object.keys(jobIds),
        executionMode: batchRequest.executionMode,
      },
    );

    // Emit batch submission event
    this.eventEmitter.emit('batch.submitted', {batchId,jobIds,
      executionMode: batchRequest.executionMode,
      totalJobs: batchRequest.jobs.length,
    });

    return {
      batchId,
      jobIds,
      totalJobs: batchRequest.jobs.length,
      executionMode: batchRequest.executionMode,
      submittedAt: submittedAt.toISOString(),
      estimatedCompletionAt: this.estimateBatchCompletion(batchId),
    };
  }

  /**
   * Search jobs with advanced filtering and pagination
   *
   * @param criteria Search criteria and filters
   * @returns JobSearchResultsDto Search results with pagination
   */
  async searchJobs(criteria: JobSearchCriteriaDto): Promise<JobSearchResultsDto> {
    const allJobs = Array.from(this.enhancedJobs.values());
    let filteredJobs = allJobs;

    // Apply filters
    if (criteria.status) {
      filteredJobs = filteredJobs.filter((job) => job.status === criteria.status);
    }

    if (criteria.priority) {
      filteredJobs = filteredJobs.filter((job) => job.priority === criteria.priority);
    }

    if (criteria.actionType) {
      filteredJobs = filteredJobs.filter(
        (job) => job.action.action === criteria.actionType,
      );
    }

    if (criteria.userId) {
      filteredJobs = filteredJobs.filter(
        (job) => job.metadata?.userId === criteria.userId,
      );
    }

    if (criteria.submittedAfter) {
      const afterDate = new Date(criteria.submittedAfter);
      filteredJobs = filteredJobs.filter((job) => job.submittedAt >= afterDate);
    }

    if (criteria.submittedBefore) {
      const beforeDate = new Date(criteria.submittedBefore);
      filteredJobs = filteredJobs.filter((job) => job.submittedAt <= beforeDate);
    }

    if (criteria.executionTimeGte !== undefined) {
      filteredJobs = filteredJobs.filter(
        (job) => (job.executionTime ?? 0) >= criteria.executionTimeGte!,
      );
    }

    if (criteria.executionTimeLte !== undefined) {
      filteredJobs = filteredJobs.filter(
        (job) => (job.executionTime ?? 0) <= criteria.executionTimeLte!,
      );
    }

    if (criteria.searchTerm) {
      const searchTerm = criteria.searchTerm.toLowerCase();
      filteredJobs = filteredJobs.filter(
        (job) =>
          job.errorMessage?.toLowerCase().includes(searchTerm) ||
          JSON.stringify(job.metadata).toLowerCase().includes(searchTerm) ||
          job.action.action.toLowerCase().includes(searchTerm),
      );
    }

    if (criteria.batchId) {
      filteredJobs = filteredJobs.filter((job) => job.batchId === criteria.batchId);
    }

    // Sort results
    const sortBy = criteria.sortBy ?? 'submittedAt';const sortOrder = criteria.sortOrder ?? 'desc';filteredJobs.sort((a, b) => {let aValue: unknown;
      let bValue: unknown;

      switch (sortBy) {
        case 'submittedAt':aValue = a.submittedAt.getTime();bValue = b.submittedAt.getTime();
          break;
        case 'completedAt':aValue = a.completedAt?.getTime() ?? 0;bValue = b.completedAt?.getTime() ?? 0;
          break;
        case 'executionTime':aValue = a.executionTime ?? 0;bValue = b.executionTime ?? 0;
          break;
        case 'priority':const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':aValue = a.status;bValue = b.status;
          break;
        default:
          aValue = a.submittedAt.getTime();
          bValue = b.submittedAt.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply pagination
    const totalCount = filteredJobs.length;
    const limit = criteria.limit ?? 20;
    const offset = criteria.offset ?? 0;
    const paginatedJobs = filteredJobs.slice(offset, offset + limit);

    // Convert to response DTOs
    const jobResponses = paginatedJobs.map((job) => this.convertToStatusResponse(job));

    return {
      jobs: jobResponses,
      totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount,
      criteria,
    };
  }

  /**
   * Get comprehensive job analytics
   *
   * @param timeframeHours Optional timeframe in hours (default: 24)
   * @returns JobAnalyticsDto Analytics summary
   */
  async getJobAnalytics(timeframeHours: number = 24): Promise<JobAnalyticsDto> {
    const cutoffTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000);
    const jobs = Array.from(this.enhancedJobs.values()).filter(
      (job) => job.submittedAt >= cutoffTime,
    );

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((job) => job.status === JobStatus.COMPLETED).length;
    const failedJobs = jobs.filter((job) => job.status === JobStatus.FAILED).length;
    const cancelledJobs = jobs.filter((job) => job.status === JobStatus.CANCELLED).length;
    const pendingJobs = jobs.filter((job) => job.status === JobStatus.PENDING).length;
    const inProgressJobs = jobs.filter((job) => job.status === JobStatus.IN_PROGRESS).length;

    // Calculate execution time statistics
    const completedJobsWithTime = jobs.filter(
      (job) => job.status === JobStatus.COMPLETED && job.executionTime,
    );
    const executionTimes = completedJobsWithTime.map((job) => job.executionTime!);
    const averageExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length
      : 0;

    // Calculate median execution time
    const sortedTimes = [...executionTimes].sort((a, b) => a - b);
    const medianExecutionTime = sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;

    // Calculate success rate
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Action type breakdown
    const actionTypeBreakdown: Record<string, number> = {};
    jobs.forEach((job) => {
      const actionType = job.action.action;
      actionTypeBreakdown[actionType] = (actionTypeBreakdown[actionType] || 0) + 1;
    });

    // Priority breakdown
    const priorityBreakdown: Record<string, number> = {};
    jobs.forEach((job) => {
      priorityBreakdown[job.priority] = (priorityBreakdown[job.priority] || 0) + 1;
    });

    // Performance trends (hourly buckets)
    const performanceTrends: Array<{
      hour: string;
      jobCount: number;
      avgExecutionTime: number;
    }> = [];

    for (let i = 0; i < timeframeHours; i++) {
      const hourStart = new Date(Date.now() - (timeframeHours - i) * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const hourJobs = jobs.filter(
        (job) => job.submittedAt >= hourStart && job.submittedAt < hourEnd,
      );

      const hourCompletedJobs = hourJobs.filter(
        (job) => job.status === JobStatus.COMPLETED && job.executionTime,
      );

      const hourAvgExecutionTime = hourCompletedJobs.length > 0
        ? hourCompletedJobs.reduce((sum, job) => sum + job.executionTime!, 0) / hourCompletedJobs.length
        : 0;

      performanceTrends.push({
        hour: hourStart.toISOString(),
        jobCount: hourJobs.length,
        avgExecutionTime: hourAvgExecutionTime,
      });
    }

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      cancelledJobs,
      pendingJobs,
      inProgressJobs,
      averageExecutionTime,
      medianExecutionTime,
      successRate,
      actionTypeBreakdown,
      priorityBreakdown,
      performanceTrends,
    };
  }

  /**
   * Get real-time progress for a specific job
   *
   * @param jobId Job identifier
   * @returns JobProgressUpdateDto Current progress information
   */
  async getJobProgress(jobId: string): Promise<JobProgressUpdateDto> {
    const job = this.enhancedJobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return {
      jobId: job.jobId,
      progress: job.progress,
      status: job.status,
      currentStep: job.currentStep,
      estimatedCompletion: job.estimatedCompletion?.toISOString(),
      metadata: job.metadata,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Cancel multiple jobs by criteria
   *
   * @param criteria Criteria for selecting jobs to cancel
   * @returns Promise<{ cancelled: string[]; failed: string[] }> Results
   */
  async cancelJobsByCriteria(criteria: {
    batchId?: string;
    status?: JobStatus[];
    olderThan?: Date;
  }): Promise<{ cancelled: string[]; failed: string[] }> {
    const jobs = Array.from(this.enhancedJobs.values());
    let jobsToCancel = jobs;

    if (criteria.batchId) {
      jobsToCancel = jobsToCancel.filter((job) => job.batchId === criteria.batchId);
    }

    if (criteria.status) {
      jobsToCancel = jobsToCancel.filter((job) => criteria.status!.includes(job.status));
    }

    if (criteria.olderThan) {
      jobsToCancel = jobsToCancel.filter((job) => job.submittedAt < criteria.olderThan!);
    }

    const cancelled: string[] = [];
    const failed: string[] = [];

    for (const job of jobsToCancel) {
      try {
        const success = await this.baseAsyncJobService.cancelJob(job.jobId);
        if (success) {
          job.status = JobStatus.CANCELLED;
          job.completedAt = new Date();
          cancelled.push(job.jobId);

          // Emit cancellation event
          this.eventEmitter.emit('job.cancelled', {jobId: job.jobId,batchId: job.batchId,
            reason: 'bulk_cancellation',
          });
        } else {
          failed.push(job.jobId);
        }
      } catch (error) {
        this.logger.error(`Failed to cancel job ${job.jobId}: ${error}`);failed.push(job.jobId);}
    }

    return { cancelled, failed };
  }

  /**
   * Generate unique batch identifier
   */
  private generateBatchId(): string {
    return `batch_${Date.now()}_${uuidv4().substring(0, 8)}`;}/**
   * Generate unique job identifier
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${uuidv4().substring(0, 8)}`;}/**
   * Validate dependency graph for cycles
   */
  private validateDependencyGraph(batchId: string): void {
    const batch = this.batches.get(batchId)!;
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const hasCycle = (jobId: string): boolean => {
      if (visiting.has(jobId)) {
        return true; // Cycle detected
      }
      if (visited.has(jobId)) {
        return false; // Already processed
      }

      visiting.add(jobId);
      const node = this.dependencyGraph.get(jobId);
      if (node) {
        for (const depId of node.dependencies) {
          if (hasCycle(depId)) {
            return true;
          }
        }
      }
      visiting.delete(jobId);
      visited.add(jobId);
      return false;
    };

    for (const jobId of Object.values(batch.jobKeys)) {
      if (hasCycle(jobId)) {
        throw new Error(`Circular dependency detected in batch ${batchId}`);}}
  }

  /**
   * Execute batch based on execution mode
   */
  private async executeBatch(batchId: string, mode: BatchExecutionMode): Promise<void> {
    switch (mode) {
      case BatchExecutionMode.SEQUENTIAL:
        await this.executeSequentialBatch(batchId);
        break;
      case BatchExecutionMode.PARALLEL:
        await this.executeParallelBatch(batchId);
        break;
      case BatchExecutionMode.MIXED:
        await this.executeMixedBatch(batchId);
        break;
    }
  }

  /**
   * Execute batch sequentially
   */
  private async executeSequentialBatch(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId)!;
    const jobIds = Object.values(batch.jobKeys);

    for (const jobId of jobIds) {
      const job = this.enhancedJobs.get(jobId)!;
      await this.submitJobToBaseService(job);
    }
  }

  /**
   * Execute batch in parallel
   */
  private async executeParallelBatch(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId)!;
    const jobIds = Object.values(batch.jobKeys);

    await Promise.all(
      jobIds.map((jobId) => {
        const job = this.enhancedJobs.get(jobId)!;
        return this.submitJobToBaseService(job);
      }),
    );
  }

  /**
   * Execute batch with mixed mode (respecting dependencies)
   */
  private async executeMixedBatch(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId)!;
    const jobIds = Object.values(batch.jobKeys);

    // Find jobs with no dependencies to start with
    const readyJobs = jobIds.filter((jobId) => {
      const node = this.dependencyGraph.get(jobId)!;
      return node.dependencies.size === 0;
    });

    // Submit initial ready jobs
    await Promise.all(
      readyJobs.map((jobId) => {
        const job = this.enhancedJobs.get(jobId)!;
        return this.submitJobToBaseService(job);
      }),
    );
  }

  /**
   * Submit job to base async service
   */
  private async submitJobToBaseService(job: EnhancedJobData): Promise<void> {
    try {
      await this.baseAsyncJobService.submitJob(job.action, {
        priority: job.priority,
        timeout: job.timeout,
        useCache: job.useCache,
        metadata: job.metadata,
      });
    } catch (error) {
      this.logger.error(`Failed to submit job ${job.jobId} to base service: ${error}`);
      throw error;
    }
  }

  /**
   * Convert enhanced job to status response DTO
   */
  private convertToStatusResponse(job: EnhancedJobData): JobStatusResponseDto {
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
   * Estimate batch completion time
   */
  private estimateBatchCompletion(batchId: string): string {
    const batch = this.batches.get(batchId)!;
    const estimatedDuration = batch.totalJobs * 30000; // 30 seconds per job estimate
    const estimatedCompletion = new Date(batch.submittedAt.getTime() + estimatedDuration);
    return estimatedCompletion.toISOString();
  }

  /**
   * Start progress tracking background task
   */
  private startProgressTracking(): void {
    setInterval(() => {
      // Update progress for all in-progress jobs
      for (const job of this.enhancedJobs.values()) {
        if (job.status === JobStatus.IN_PROGRESS) {
          this.updateJobProgress(job);
        }
      }
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update job progress and emit events
   */
  private updateJobProgress(job: EnhancedJobData): void {
    // Try to get updated status from base service
    try {
      const baseStatus = this.baseAsyncJobService.getJobStatus(job.jobId);
      job.status = baseStatus.status;
      job.progress = baseStatus.progress;

      if (baseStatus.completedAt && !job.completedAt) {
        job.completedAt = new Date(baseStatus.completedAt);
        job.executionTime = job.completedAt.getTime() - (job.startedAt?.getTime() ?? job.submittedAt.getTime());
      }

      // Emit progress update event
      this.eventEmitter.emit('job.progress', {
        jobId: job.jobId,
        batchId: job.batchId,
        progress: job.progress,
        status: job.status,
        currentStep: job.currentStep,
      });

      // Check if job completed and resolve dependencies
      if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
        this.resolveDependencies(job.jobId);
      }
    } catch (error) {
      // Job might not exist in base service yet
      this.logger.debug(`Could not get status for job ${job.jobId}: ${error}`);}}

  /**
   * Resolve dependencies and trigger dependent jobs
   */
  private resolveDependencies(completedJobId: string): void {
    const node = this.dependencyGraph.get(completedJobId);
    if (!node) return;

    node.isResolved = true;

    // Check all dependent jobs
    for (const dependentId of node.dependents) {
      const dependentNode = this.dependencyGraph.get(dependentId);
      if (!dependentNode) continue;

      // Check if all dependencies are resolved
      const allDependenciesResolved = Array.from(dependentNode.dependencies).every(
        (depId) => this.dependencyGraph.get(depId)?.isResolved ?? false,
      );

      if (allDependenciesResolved) {
        const dependentJob = this.enhancedJobs.get(dependentId);
        if (dependentJob && dependentJob.status === JobStatus.PENDING) {
          // Submit dependent job
          this.submitJobToBaseService(dependentJob).catch((error) => {
            this.logger.error(`Failed to submit dependent job ${dependentId}: ${error}`);
          });
        }
      }
    }
  }
}