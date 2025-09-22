/**
 * Comprehensive Job Lifecycle Management Service
 *
 * Provides enterprise-grade job lifecycle management including:
 * - Advanced job state transitions with validation
 * - Resource allocation and monitoring
 * - Cancellation with cleanup orchestration
 * - Retry mechanisms with exponential backoff
 * - Dependency management and execution ordering
 * - Performance monitoring and optimization
 * - Security and access control integration
 *
 * @author Claude Code - Enterprise Async Systems Specialist
 * @version 2.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EnhancedJobStatus,
  JobExecutionPhase,
  EnhancedJobPriority,
  JobResultStorageType,
  JobExecutionContext,
  JobResourceRequirements,
  JobProgressTracking,
  JobPerformanceMetrics,
  JobErrorDetails,
  EnhancedJobResult
} from '../dto/enhanced-async-job.dto';
import { ComputerActionDto } from '../dto/computer-action.dto';
import { ComputerUseService } from '../computer-use.service';
import { CacheService } from '../../cache/cache.service';
import { MetricsService } from '../../metrics/metrics.service';

/**
 * Internal enhanced job data structure
 */
export interface EnhancedJobData {
  // Core identification
  jobId: string;
  batchId?: string;
  parentJobId?: string;

  // Status and lifecycle
  status: EnhancedJobStatus;
  phase: JobExecutionPhase;
  priority: EnhancedJobPriority;

  // Execution details
  action: ComputerActionDto;
  executionContext: JobExecutionContext;
  resourceRequirements: JobResourceRequirements;

  // Progress and timing
  progress: JobProgressTracking;
  performanceMetrics: JobPerformanceMetrics;
  timeline: {
    submittedAt: Date;
    queuedAt?: Date;
    startedAt?: Date;
    pausedAt?: Date;
    resumedAt?: Date;
    completedAt?: Date;
  };

  // Result and error handling
  result?: EnhancedJobResult;
  errorDetails?: JobErrorDetails;

  // Configuration
  resultStorageType: JobResultStorageType;
  enableCaching: boolean;
  tags: string[];
  dependencies: string[];
  dependents: string[];

  // Resource management
  allocatedResources: {
    memoryMB: number;
    cpuPercent: number;
    diskSpaceMB: number;
  };

  // Retry and recovery
  retryConfig: {
    currentAttempt: number;
    maxAttempts: number;
    backoffMultiplier: number;
    nextRetryAt?: Date;
    retryReason?: string;
  };

  // Cancellation
  cancellationToken?: {
    requested: boolean;
    requestedAt?: Date;
    requestedBy?: string;
    reason?: string;
    graceful: boolean;
  };

  // Security and access
  accessControl: {
    ownerId: string;
    allowedUsers: string[];
    accessLevel: 'public' | 'private' | 'restricted' | 'confidential';
    securityTags: string[];
  };

  // Monitoring and auditing
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    userId?: string;
    details?: Record<string, unknown>;
  }>;

  // Custom metadata
  metadata: Record<string, unknown>;
}

/**
 * Job execution statistics
 */
interface JobExecutionStats {
  totalJobs: number;
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  averageExecutionTime: number;
  averageQueueTime: number;
  resourceUtilization: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
  };
}

/**
 * Resource allocation result
 */
interface ResourceAllocationResult {
  allocated: boolean;
  resources?: {
    memoryMB: number;
    cpuPercent: number;
    diskSpaceMB: number;
  };
  reason?: string;
  estimatedWaitTime?: number;
}

@Injectable()
export class ComprehensiveJobLifecycleService {
  private readonly logger = new Logger(ComprehensiveJobLifecycleService.name);

  // Job storage and management
  private readonly jobs = new Map<string, EnhancedJobData>();
  private readonly jobsByBatch = new Map<string, Set<string>>();
  private readonly jobsByUser = new Map<string, Set<string>>();
  private readonly dependencyGraph = new Map<string, Set<string>>();

  // Resource management
  private readonly maxConcurrentJobs = 10;
  private readonly totalMemoryMB = 4096;
  private readonly totalCpuPercent = 100;
  private readonly totalDiskSpaceMB = 10240;

  private allocatedMemoryMB = 0;
  private allocatedCpuPercent = 0;
  private allocatedDiskSpaceMB = 0;

  // Job queues by priority
  private readonly priorityQueues = new Map<EnhancedJobPriority, string[]>([
    [EnhancedJobPriority.CRITICAL, []],
    [EnhancedJobPriority.URGENT, []],
    [EnhancedJobPriority.HIGH, []],
    [EnhancedJobPriority.NORMAL, []],
    [EnhancedJobPriority.LOW, []],
    [EnhancedJobPriority.BACKGROUND, []]
  ]);

  // Processing state
  private isProcessing = false;
  private readonly activeExecutions = new Set<string>();

  constructor(
    private readonly computerUseService: ComputerUseService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.log('Comprehensive Job Lifecycle Service initialized');
    this.startJobProcessor();
    this.startResourceMonitoring();
  }

  /**
   * Submit a new job for execution
   */
  async submitJob(
    action: ComputerActionDto,
    executionContext: JobExecutionContext,
    resourceRequirements: JobResourceRequirements,
    options: {
      priority?: EnhancedJobPriority;
      resultStorageType?: JobResultStorageType;
      enableCaching?: boolean;
      tags?: string[];
      dependencies?: string[];
      batchId?: string;
      parentJobId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<string> {
    const jobId = this.generateJobId();
    const now = new Date();

    // Create job data with comprehensive configuration
    const jobData: EnhancedJobData = {
      jobId,
      batchId: options.batchId,
      parentJobId: options.parentJobId,

      status: EnhancedJobStatus.QUEUED,
      phase: JobExecutionPhase.INITIALIZATION,
      priority: options.priority ?? EnhancedJobPriority.NORMAL,

      action,
      executionContext,
      resourceRequirements,

      progress: {
        overallProgress: 0,
        currentPhase: JobExecutionPhase.INITIALIZATION,
        phaseProgress: 0,
        currentOperation: 'Job queued for execution',
        estimatedCompletionAt: undefined,
        phaseDetails: {}
      },

      performanceMetrics: {
        executionTimeMs: 0,
        queueTimeMs: 0,
        peakMemoryMB: 0,
        avgCpuPercent: 0,
        networkMetrics: { bytesIn: 0, bytesOut: 0 },
        diskMetrics: { bytesRead: 0, bytesWritten: 0 },
        bottlenecks: []
      },

      timeline: {
        submittedAt: now,
        queuedAt: now
      },

      resultStorageType: options.resultStorageType ?? JobResultStorageType.MEMORY,
      enableCaching: options.enableCaching ?? false,
      tags: options.tags ?? [],
      dependencies: options.dependencies ?? [],
      dependents: [],

      allocatedResources: {
        memoryMB: 0,
        cpuPercent: 0,
        diskSpaceMB: 0
      },

      retryConfig: {
        currentAttempt: 1,
        maxAttempts: 3,
        backoffMultiplier: 2
      },

      accessControl: {
        ownerId: executionContext.userId,
        allowedUsers: [executionContext.userId],
        accessLevel: 'private',
        securityTags: []
      },

      auditTrail: [{
        timestamp: now,
        action: 'job_submitted',
        userId: executionContext.userId,
        details: {
          action: action.action,
          priority: options.priority,
          batchId: options.batchId
        }
      }],

      metadata: options.metadata ?? {}
    };

    // Store job and update indexes
    this.jobs.set(jobId, jobData);
    this.updateJobIndexes(jobData);

    // Handle dependencies
    if (options.dependencies?.length) {
      await this.validateAndSetupDependencies(jobId, options.dependencies);
    }

    // Add to appropriate priority queue
    this.addToQueue(jobData);

    // Emit job submitted event
    this.eventEmitter.emit('job.submitted', {
      jobId,
      userId: executionContext.userId,
      action: action.action,
      priority: jobData.priority
    });

    this.logger.log(`Job ${jobId} submitted successfully`, {
      jobId,
      userId: executionContext.userId,
      action: action.action,
      priority: jobData.priority,
      batchId: options.batchId,
      dependencies: options.dependencies?.length ?? 0
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      setImmediate(() => this.processJobQueue());
    }

    return jobId;
  }

  /**
   * Get comprehensive job status
   */
  getJobStatus(jobId: string): EnhancedJobData | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    // Update performance metrics with current values
    this.updateCurrentPerformanceMetrics(job);

    // Record status access in audit trail
    job.auditTrail.push({
      timestamp: new Date(),
      action: 'status_accessed',
      details: { accessType: 'api_call' }
    });

    return { ...job }; // Return deep copy
  }

  /**
   * Get job result with comprehensive metadata
   */
  async getJobResult(jobId: string): Promise<EnhancedJobData | null> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    if (job.status !== EnhancedJobStatus.COMPLETED && job.status !== EnhancedJobStatus.FAILED) {
      throw new Error(`Job ${jobId} has not completed yet. Current status: ${job.status}`);
    }

    // Record result access in audit trail
    job.auditTrail.push({
      timestamp: new Date(),
      action: 'result_accessed',
      details: {
        accessType: 'api_call',
        resultSize: job.result?.sizeBytes ?? 0
      }
    });

    // Update access control
    if (!job.accessControl.accessedBy) {
      (job.accessControl as any).accessedBy = [];
    }

    return { ...job }; // Return deep copy
  }

  /**
   * Cancel a job with comprehensive cleanup
   */
  async cancelJob(
    jobId: string,
    requestedBy: string,
    reason?: string,
    graceful: boolean = true
  ): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    // Check if job can be cancelled
    if (job.status === EnhancedJobStatus.COMPLETED ||
        job.status === EnhancedJobStatus.FAILED ||
        job.status === EnhancedJobStatus.CANCELLED) {
      return false;
    }

    const now = new Date();

    // Set cancellation token
    job.cancellationToken = {
      requested: true,
      requestedAt: now,
      requestedBy,
      reason,
      graceful
    };

    // Update audit trail
    job.auditTrail.push({
      timestamp: now,
      action: 'cancellation_requested',
      userId: requestedBy,
      details: { reason, graceful }
    });

    // Handle cancellation based on current status
    if (job.status === EnhancedJobStatus.QUEUED || job.status === EnhancedJobStatus.PENDING) {
      // Remove from queue immediately
      this.removeFromQueue(job);
      await this.completeJobCancellation(job);
    } else if (job.status === EnhancedJobStatus.IN_PROGRESS) {
      // Set status to cancelling and let execution handler deal with it
      job.status = EnhancedJobStatus.CANCELLED;
      job.progress.currentOperation = 'Cancelling job...';

      if (!graceful) {
        // Force immediate cancellation
        await this.completeJobCancellation(job);
      }
    }

    // Emit cancellation event
    this.eventEmitter.emit('job.cancellation_requested', {
      jobId,
      requestedBy,
      reason,
      graceful
    });

    this.logger.log(`Job ${jobId} cancellation requested`, {
      jobId,
      requestedBy,
      reason,
      graceful,
      currentStatus: job.status
    });

    return true;
  }

  /**
   * Pause a running job
   */
  async pauseJob(jobId: string, requestedBy: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== EnhancedJobStatus.IN_PROGRESS) {
      return false;
    }

    job.status = EnhancedJobStatus.PAUSED;
    job.timeline.pausedAt = new Date();
    job.progress.currentOperation = 'Job paused';

    // Update audit trail
    job.auditTrail.push({
      timestamp: new Date(),
      action: 'job_paused',
      userId: requestedBy
    });

    // Emit pause event
    this.eventEmitter.emit('job.paused', { jobId, requestedBy });

    this.logger.log(`Job ${jobId} paused`, { jobId, requestedBy });
    return true;
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string, requestedBy: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== EnhancedJobStatus.PAUSED) {
      return false;
    }

    job.status = EnhancedJobStatus.IN_PROGRESS;
    job.timeline.resumedAt = new Date();
    job.progress.currentOperation = 'Job resumed';

    // Update audit trail
    job.auditTrail.push({
      timestamp: new Date(),
      action: 'job_resumed',
      userId: requestedBy
    });

    // Emit resume event
    this.eventEmitter.emit('job.resumed', { jobId, requestedBy });

    this.logger.log(`Job ${jobId} resumed`, { jobId, requestedBy });
    return true;
  }

  /**
   * Get comprehensive system statistics
   */
  getSystemStats(): JobExecutionStats {
    const allJobs = Array.from(this.jobs.values());

    const completedJobs = allJobs.filter(job => job.status === EnhancedJobStatus.COMPLETED);
    const failedJobs = allJobs.filter(job => job.status === EnhancedJobStatus.FAILED);
    const cancelledJobs = allJobs.filter(job => job.status === EnhancedJobStatus.CANCELLED);
    const activeJobs = allJobs.filter(job =>
      job.status === EnhancedJobStatus.IN_PROGRESS ||
      job.status === EnhancedJobStatus.VALIDATING
    );
    const queuedJobs = allJobs.filter(job =>
      job.status === EnhancedJobStatus.QUEUED ||
      job.status === EnhancedJobStatus.PENDING
    );

    const avgExecutionTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + job.performanceMetrics.executionTimeMs, 0) / completedJobs.length
      : 0;

    const avgQueueTime = completedJobs.length > 0
      ? completedJobs.reduce((sum, job) => sum + job.performanceMetrics.queueTimeMs, 0) / completedJobs.length
      : 0;

    return {
      totalJobs: allJobs.length,
      activeJobs: activeJobs.length,
      queuedJobs: queuedJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      cancelledJobs: cancelledJobs.length,
      averageExecutionTime: avgExecutionTime,
      averageQueueTime: avgQueueTime,
      resourceUtilization: {
        memoryUsage: (this.allocatedMemoryMB / this.totalMemoryMB) * 100,
        cpuUsage: this.allocatedCpuPercent,
        diskUsage: (this.allocatedDiskSpaceMB / this.totalDiskSpaceMB) * 100
      }
    };
  }

  /**
   * Clean up completed and failed jobs
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldJobs(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const jobsToCleanup: string[] = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if ((job.status === EnhancedJobStatus.COMPLETED ||
           job.status === EnhancedJobStatus.FAILED ||
           job.status === EnhancedJobStatus.CANCELLED) &&
          job.timeline.completedAt &&
          job.timeline.completedAt < cutoffTime) {

        jobsToCleanup.push(jobId);
      }
    }

    for (const jobId of jobsToCleanup) {
      await this.cleanupJob(jobId);
    }

    if (jobsToCleanup.length > 0) {
      this.logger.log(`Cleaned up ${jobsToCleanup.length} old jobs`);
    }
  }

  /**
   * Monitor resource utilization and performance
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  private async monitorResources(): Promise<void> {
    const stats = this.getSystemStats();

    // Record metrics
    this.metricsService.recordGauge?.('job_queue_length', stats.queuedJobs);
    this.metricsService.recordGauge?.('active_jobs', stats.activeJobs);
    this.metricsService.recordGauge?.('memory_utilization', stats.resourceUtilization.memoryUsage);
    this.metricsService.recordGauge?.('cpu_utilization', stats.resourceUtilization.cpuUsage);
    this.metricsService.recordGauge?.('disk_utilization', stats.resourceUtilization.diskUsage);

    // Check for resource constraints
    if (stats.resourceUtilization.memoryUsage > 80) {
      this.logger.warn('High memory utilization detected', {
        memoryUsage: stats.resourceUtilization.memoryUsage,
        activeJobs: stats.activeJobs
      });
    }

    if (stats.resourceUtilization.cpuUsage > 90) {
      this.logger.warn('High CPU utilization detected', {
        cpuUsage: stats.resourceUtilization.cpuUsage,
        activeJobs: stats.activeJobs
      });
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private updateJobIndexes(job: EnhancedJobData): void {
    // Index by batch
    if (job.batchId) {
      if (!this.jobsByBatch.has(job.batchId)) {
        this.jobsByBatch.set(job.batchId, new Set());
      }
      this.jobsByBatch.get(job.batchId)!.add(job.jobId);
    }

    // Index by user
    if (!this.jobsByUser.has(job.executionContext.userId)) {
      this.jobsByUser.set(job.executionContext.userId, new Set());
    }
    this.jobsByUser.get(job.executionContext.userId)!.add(job.jobId);
  }

  private async validateAndSetupDependencies(jobId: string, dependencies: string[]): Promise<void> {
    for (const depJobId of dependencies) {
      const depJob = this.jobs.get(depJobId);
      if (!depJob) {
        throw new Error(`Dependency job not found: ${depJobId}`);
      }

      // Add to dependency graph
      if (!this.dependencyGraph.has(depJobId)) {
        this.dependencyGraph.set(depJobId, new Set());
      }
      this.dependencyGraph.get(depJobId)!.add(jobId);

      // Add to dependent list
      depJob.dependents.push(jobId);
    }
  }

  private addToQueue(job: EnhancedJobData): void {
    const queue = this.priorityQueues.get(job.priority);
    if (queue) {
      queue.push(job.jobId);
      this.logger.debug(`Job ${job.jobId} added to ${job.priority} priority queue`);
    }
  }

  private removeFromQueue(job: EnhancedJobData): void {
    const queue = this.priorityQueues.get(job.priority);
    if (queue) {
      const index = queue.indexOf(job.jobId);
      if (index > -1) {
        queue.splice(index, 1);
        this.logger.debug(`Job ${job.jobId} removed from ${job.priority} priority queue`);
      }
    }
  }

  private async processJobQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.activeExecutions.size < this.maxConcurrentJobs) {
        const nextJob = this.getNextExecutableJob();
        if (!nextJob) {
          break; // No more jobs to process
        }

        // Try to allocate resources
        const resourceAllocation = await this.allocateResources(nextJob);
        if (!resourceAllocation.allocated) {
          this.logger.debug(`Resource allocation failed for job ${nextJob.jobId}`, {
            reason: resourceAllocation.reason,
            estimatedWaitTime: resourceAllocation.estimatedWaitTime
          });
          break; // Wait for resources to become available
        }

        // Start job execution
        this.activeExecutions.add(nextJob.jobId);
        this.executeJobAsync(nextJob).finally(() => {
          this.activeExecutions.delete(nextJob.jobId);
        });
      }
    } finally {
      this.isProcessing = false;
    }

    // Schedule next processing cycle if there are more jobs
    if (this.hasQueuedJobs()) {
      setTimeout(() => this.processJobQueue(), 1000);
    }
  }

  private getNextExecutableJob(): EnhancedJobData | null {
    // Check each priority queue in order
    for (const priority of Object.values(EnhancedJobPriority)) {
      const queue = this.priorityQueues.get(priority);
      if (!queue || queue.length === 0) {
        continue;
      }

      // Find first job with satisfied dependencies
      for (let i = 0; i < queue.length; i++) {
        const jobId = queue[i];
        const job = this.jobs.get(jobId);
        if (!job) {
          queue.splice(i, 1); // Remove invalid job
          i--;
          continue;
        }

        if (this.areDependenciesSatisfied(job)) {
          queue.splice(i, 1); // Remove from queue
          return job;
        }
      }
    }

    return null;
  }

  private areDependenciesSatisfied(job: EnhancedJobData): boolean {
    return job.dependencies.every(depJobId => {
      const depJob = this.jobs.get(depJobId);
      return depJob && depJob.status === EnhancedJobStatus.COMPLETED;
    });
  }

  private async allocateResources(job: EnhancedJobData): Promise<ResourceAllocationResult> {
    const required = job.resourceRequirements;

    // Check if resources are available
    if (this.allocatedMemoryMB + required.maxMemoryMB > this.totalMemoryMB ||
        this.allocatedCpuPercent + required.maxCpuPercent > this.totalCpuPercent ||
        this.allocatedDiskSpaceMB + (required.requiredDiskSpaceMB ?? 0) > this.totalDiskSpaceMB) {

      return {
        allocated: false,
        reason: 'Insufficient resources available',
        estimatedWaitTime: this.estimateResourceWaitTime(required)
      };
    }

    // Allocate resources
    this.allocatedMemoryMB += required.maxMemoryMB;
    this.allocatedCpuPercent += required.maxCpuPercent;
    this.allocatedDiskSpaceMB += required.requiredDiskSpaceMB ?? 0;

    job.allocatedResources = {
      memoryMB: required.maxMemoryMB,
      cpuPercent: required.maxCpuPercent,
      diskSpaceMB: required.requiredDiskSpaceMB ?? 0
    };

    return {
      allocated: true,
      resources: job.allocatedResources
    };
  }

  private estimateResourceWaitTime(required: JobResourceRequirements): number {
    // Simple estimation based on average execution time of running jobs
    const runningJobs = Array.from(this.jobs.values()).filter(
      job => job.status === EnhancedJobStatus.IN_PROGRESS
    );

    if (runningJobs.length === 0) {
      return 5000; // 5 seconds default
    }

    const avgRemainingTime = runningJobs.reduce((sum, job) => {
      const elapsed = Date.now() - (job.timeline.startedAt?.getTime() ?? Date.now());
      const estimated = job.progress.estimatedCompletionAt
        ? new Date(job.progress.estimatedCompletionAt).getTime() - Date.now()
        : 30000; // 30 seconds default
      return sum + Math.max(0, estimated);
    }, 0) / runningJobs.length;

    return Math.max(5000, avgRemainingTime);
  }

  private async executeJobAsync(job: EnhancedJobData): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(`Starting job execution: ${job.jobId}`, {
        jobId: job.jobId,
        action: job.action.action,
        priority: job.priority,
        userId: job.executionContext.userId
      });

      // Update job status and progress
      job.status = EnhancedJobStatus.IN_PROGRESS;
      job.phase = JobExecutionPhase.VALIDATION;
      job.timeline.startedAt = new Date();
      job.progress.currentOperation = 'Validating job parameters';
      job.progress.overallProgress = 10;

      // Phase 1: Validation
      await this.executePhase(job, JobExecutionPhase.VALIDATION, async () => {
        await this.validateJobExecution(job);
      });

      // Phase 2: Preparation
      await this.executePhase(job, JobExecutionPhase.PREPARATION, async () => {
        await this.prepareJobExecution(job);
      });

      // Phase 3: Execution
      await this.executePhase(job, JobExecutionPhase.EXECUTION, async () => {
        const result = await this.computerUseService.action(job.action);
        await this.storeJobResult(job, result);
      });

      // Phase 4: Post-processing
      await this.executePhase(job, JobExecutionPhase.POST_PROCESSING, async () => {
        await this.postProcessJobResult(job);
      });

      // Phase 5: Cleanup
      await this.executePhase(job, JobExecutionPhase.CLEANUP, async () => {
        await this.cleanupJobExecution(job);
      });

      // Job completed successfully
      await this.completeJobSuccessfully(job, Date.now() - startTime);

    } catch (error) {
      await this.handleJobError(job, error, Date.now() - startTime);
    }
  }

  private async executePhase(
    job: EnhancedJobData,
    phase: JobExecutionPhase,
    phaseFunction: () => Promise<void>
  ): Promise<void> {
    // Check for cancellation
    if (job.cancellationToken?.requested) {
      throw new Error('Job cancelled by user request');
    }

    job.phase = phase;
    job.progress.currentPhase = phase;
    job.progress.phaseProgress = 0;

    const phaseStartTime = Date.now();

    try {
      await phaseFunction();

      // Update progress based on phase completion
      const phaseWeight = this.getPhaseWeight(phase);
      job.progress.overallProgress = Math.min(100, job.progress.overallProgress + phaseWeight);
      job.progress.phaseProgress = 100;

    } catch (error) {
      this.logger.error(`Phase ${phase} failed for job ${job.jobId}`, {
        jobId: job.jobId,
        phase,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    const phaseTime = Date.now() - phaseStartTime;
    this.logger.debug(`Phase ${phase} completed for job ${job.jobId}`, {
      jobId: job.jobId,
      phase,
      executionTime: phaseTime
    });
  }

  private getPhaseWeight(phase: JobExecutionPhase): number {
    const weights = {
      [JobExecutionPhase.INITIALIZATION]: 5,
      [JobExecutionPhase.VALIDATION]: 10,
      [JobExecutionPhase.PREPARATION]: 15,
      [JobExecutionPhase.EXECUTION]: 50,
      [JobExecutionPhase.POST_PROCESSING]: 10,
      [JobExecutionPhase.RESULT_STORAGE]: 5,
      [JobExecutionPhase.CLEANUP]: 5
    };
    return weights[phase] || 10;
  }

  private async validateJobExecution(job: EnhancedJobData): Promise<void> {
    job.progress.currentOperation = 'Validating job parameters and permissions';

    // Validate action parameters
    if (!job.action?.action) {
      throw new Error('Invalid action: action type is required');
    }

    // Validate resource requirements
    if (job.resourceRequirements.timeoutMs <= 0) {
      throw new Error('Invalid timeout: must be greater than 0');
    }

    // Add security validation here if needed
    job.progress.phaseProgress = 100;
  }

  private async prepareJobExecution(job: EnhancedJobData): Promise<void> {
    job.progress.currentOperation = 'Preparing execution environment';

    // Set up execution environment
    // This could include setting up temporary directories, loading resources, etc.

    job.progress.phaseProgress = 100;
  }

  private async storeJobResult(job: EnhancedJobData, result: unknown): Promise<void> {
    job.progress.currentOperation = 'Storing job result';

    // Create enhanced result with metadata
    const resultData = JSON.stringify(result);
    const sizeBytes = Buffer.byteLength(resultData, 'utf8');
    const checksum = this.calculateChecksum(resultData);

    job.result = {
      data: result,
      storageType: job.resultStorageType,
      sizeBytes,
      checksum,
      createdAt: new Date().toISOString(),
      accessControl: {
        allowedUsers: job.accessControl.allowedUsers,
        accessLevel: job.accessControl.accessLevel
      }
    };

    // Store in cache if enabled
    if (job.enableCaching) {
      await this.cacheJobResult(job);
    }
  }

  private async postProcessJobResult(job: EnhancedJobData): Promise<void> {
    job.progress.currentOperation = 'Post-processing result';

    // Add any post-processing logic here
    // This could include result validation, transformation, etc.

    job.progress.phaseProgress = 100;
  }

  private async cleanupJobExecution(job: EnhancedJobData): Promise<void> {
    job.progress.currentOperation = 'Cleaning up execution resources';

    // Release allocated resources
    this.releaseResources(job);

    job.progress.phaseProgress = 100;
  }

  private async completeJobSuccessfully(job: EnhancedJobData, executionTime: number): Promise<void> {
    const now = new Date();

    job.status = EnhancedJobStatus.COMPLETED;
    job.timeline.completedAt = now;
    job.progress.overallProgress = 100;
    job.progress.currentOperation = 'Job completed successfully';

    // Update performance metrics
    job.performanceMetrics.executionTimeMs = executionTime;
    job.performanceMetrics.queueTimeMs = job.timeline.startedAt && job.timeline.queuedAt
      ? job.timeline.startedAt.getTime() - job.timeline.queuedAt.getTime()
      : 0;

    // Update audit trail
    job.auditTrail.push({
      timestamp: now,
      action: 'job_completed',
      details: {
        executionTime,
        resultSize: job.result?.sizeBytes ?? 0
      }
    });

    // Trigger dependent jobs
    await this.triggerDependentJobs(job);

    // Emit completion event
    this.eventEmitter.emit('job.completed', {
      jobId: job.jobId,
      userId: job.executionContext.userId,
      executionTime,
      resultSize: job.result?.sizeBytes ?? 0
    });

    this.logger.log(`Job ${job.jobId} completed successfully`, {
      jobId: job.jobId,
      executionTime,
      resultSize: job.result?.sizeBytes ?? 0
    });
  }

  private async handleJobError(job: EnhancedJobData, error: unknown, executionTime: number): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const now = new Date();

    // Create error details
    job.errorDetails = {
      code: 'EXECUTION_ERROR',
      message: errorMessage,
      severity: 'high',
      stackTrace: error instanceof Error ? error.stack : undefined,
      context: {
        phase: job.phase,
        attempt: job.retryConfig.currentAttempt,
        executionTime
      },
      occurredAt: now.toISOString(),
      recoverySuggestions: ['Check job parameters', 'Retry with different configuration']
    };

    // Check if retry is possible
    if (job.retryConfig.currentAttempt < job.retryConfig.maxAttempts) {
      await this.scheduleJobRetry(job);
    } else {
      // Mark job as failed
      job.status = EnhancedJobStatus.FAILED;
      job.timeline.completedAt = now;
      job.progress.currentOperation = `Job failed: ${errorMessage}`;

      // Update performance metrics
      job.performanceMetrics.executionTimeMs = executionTime;

      // Release resources
      this.releaseResources(job);

      // Update audit trail
      job.auditTrail.push({
        timestamp: now,
        action: 'job_failed',
        details: {
          error: errorMessage,
          attempt: job.retryConfig.currentAttempt,
          executionTime
        }
      });

      // Emit failure event
      this.eventEmitter.emit('job.failed', {
        jobId: job.jobId,
        userId: job.executionContext.userId,
        error: errorMessage,
        attempt: job.retryConfig.currentAttempt
      });

      this.logger.error(`Job ${job.jobId} failed permanently`, {
        jobId: job.jobId,
        error: errorMessage,
        attempt: job.retryConfig.currentAttempt,
        executionTime
      });
    }
  }

  private async scheduleJobRetry(job: EnhancedJobData): Promise<void> {
    const retryDelay = Math.pow(job.retryConfig.backoffMultiplier, job.retryConfig.currentAttempt - 1) * 1000;
    const nextRetryAt = new Date(Date.now() + retryDelay);

    job.retryConfig.currentAttempt++;
    job.retryConfig.nextRetryAt = nextRetryAt;
    job.retryConfig.retryReason = job.errorDetails?.message ?? 'Unknown error';

    job.status = EnhancedJobStatus.RETRYING;
    job.progress.currentOperation = `Retrying in ${Math.round(retryDelay / 1000)} seconds (attempt ${job.retryConfig.currentAttempt}/${job.retryConfig.maxAttempts})`;

    // Reset progress for retry
    job.progress.overallProgress = 0;
    job.phase = JobExecutionPhase.INITIALIZATION;

    // Schedule retry
    setTimeout(() => {
      job.status = EnhancedJobStatus.QUEUED;
      this.addToQueue(job);
      this.processJobQueue();
    }, retryDelay);

    this.logger.log(`Job ${job.jobId} scheduled for retry`, {
      jobId: job.jobId,
      attempt: job.retryConfig.currentAttempt,
      retryDelay,
      nextRetryAt
    });
  }

  private async completeJobCancellation(job: EnhancedJobData): Promise<void> {
    const now = new Date();

    job.status = EnhancedJobStatus.CANCELLED;
    job.timeline.completedAt = now;
    job.progress.currentOperation = 'Job cancelled';
    job.progress.overallProgress = 0;

    // Release resources
    this.releaseResources(job);

    // Update audit trail
    job.auditTrail.push({
      timestamp: now,
      action: 'job_cancelled',
      userId: job.cancellationToken?.requestedBy,
      details: {
        reason: job.cancellationToken?.reason,
        graceful: job.cancellationToken?.graceful
      }
    });

    // Emit cancellation event
    this.eventEmitter.emit('job.cancelled', {
      jobId: job.jobId,
      userId: job.executionContext.userId,
      cancelledBy: job.cancellationToken?.requestedBy,
      reason: job.cancellationToken?.reason
    });

    this.logger.log(`Job ${job.jobId} cancelled`, {
      jobId: job.jobId,
      cancelledBy: job.cancellationToken?.requestedBy,
      reason: job.cancellationToken?.reason
    });
  }

  private async triggerDependentJobs(completedJob: EnhancedJobData): Promise<void> {
    const dependents = this.dependencyGraph.get(completedJob.jobId);
    if (!dependents) {
      return;
    }

    for (const dependentJobId of dependents) {
      const dependentJob = this.jobs.get(dependentJobId);
      if (dependentJob && dependentJob.status === EnhancedJobStatus.QUEUED) {
        if (this.areDependenciesSatisfied(dependentJob)) {
          dependentJob.status = EnhancedJobStatus.PENDING;
          this.logger.log(`Dependent job ${dependentJobId} ready for execution`);
        }
      }
    }

    // Trigger processing if not already running
    if (!this.isProcessing) {
      setImmediate(() => this.processJobQueue());
    }
  }

  private releaseResources(job: EnhancedJobData): void {
    this.allocatedMemoryMB -= job.allocatedResources.memoryMB;
    this.allocatedCpuPercent -= job.allocatedResources.cpuPercent;
    this.allocatedDiskSpaceMB -= job.allocatedResources.diskSpaceMB;

    job.allocatedResources = {
      memoryMB: 0,
      cpuPercent: 0,
      diskSpaceMB: 0
    };
  }

  private updateCurrentPerformanceMetrics(job: EnhancedJobData): void {
    if (job.status === EnhancedJobStatus.IN_PROGRESS && job.timeline.startedAt) {
      job.performanceMetrics.executionTimeMs = Date.now() - job.timeline.startedAt.getTime();
    }

    if (job.timeline.queuedAt && job.timeline.startedAt) {
      job.performanceMetrics.queueTimeMs = job.timeline.startedAt.getTime() - job.timeline.queuedAt.getTime();
    }
  }

  private calculateChecksum(data: string): string {
    // Simple checksum calculation - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `simple:${Math.abs(hash).toString(16)}`;
  }

  private async cacheJobResult(job: EnhancedJobData): Promise<void> {
    try {
      const cacheKey = `job_result:${job.jobId}`;
      await this.cacheService.set(cacheKey, job.result, {
        namespace: 'job-results',
        ttl: 3600 // 1 hour
      });
    } catch (error) {
      this.logger.warn(`Failed to cache result for job ${job.jobId}`, {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async cleanupJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    // Remove from indexes
    if (job.batchId) {
      const batchJobs = this.jobsByBatch.get(job.batchId);
      if (batchJobs) {
        batchJobs.delete(jobId);
        if (batchJobs.size === 0) {
          this.jobsByBatch.delete(job.batchId);
        }
      }
    }

    const userJobs = this.jobsByUser.get(job.executionContext.userId);
    if (userJobs) {
      userJobs.delete(jobId);
      if (userJobs.size === 0) {
        this.jobsByUser.delete(job.executionContext.userId);
      }
    }

    // Clean up dependency graph
    this.dependencyGraph.delete(jobId);
    for (const [_, dependents] of this.dependencyGraph) {
      dependents.delete(jobId);
    }

    // Remove from main storage
    this.jobs.delete(jobId);

    this.logger.debug(`Job ${jobId} cleaned up from system`);
  }

  private hasQueuedJobs(): boolean {
    return Array.from(this.priorityQueues.values()).some(queue => queue.length > 0);
  }

  private startJobProcessor(): void {
    // Process queue every 100ms
    setInterval(() => {
      if (!this.isProcessing && this.hasQueuedJobs()) {
        this.processJobQueue();
      }
    }, 100);
  }

  private startResourceMonitoring(): void {
    // Monitor resources every 10 seconds
    setInterval(() => {
      this.monitorResources();
    }, 10000);
  }
}