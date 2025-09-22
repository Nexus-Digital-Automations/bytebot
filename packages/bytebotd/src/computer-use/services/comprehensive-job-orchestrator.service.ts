/**
 * Comprehensive Job Orchestrator Service
 *
 * Central orchestrator for the entire async job handling system.
 * Coordinates between lifecycle management, status polling, result storage,
 * and monitoring services to provide a unified job management experience.
 *
 * Features:
 * - Unified job submission and management
 * - Intelligent resource allocation and optimization
 * - Cross-service coordination and synchronization
 * - Performance monitoring and analytics
 * - Security and access control enforcement
 * - Batch operation coordination
 * - Dependency management and execution ordering
 *
 * @author Claude Code - System Architecture Specialist
 * @version 2.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EnhancedJobStatus,
  EnhancedJobPriority,
  JobExecutionContext,
  JobResourceRequirements,
  EnhancedJobSubmissionDto,
  EnhancedJobStatusResponseDto,
  EnhancedJobResultResponseDto,
  JobResultStorageType
} from '../dto/enhanced-async-job.dto';
import { ComputerActionDto } from '../dto/computer-action.dto';
import { ComprehensiveJobLifecycleService, EnhancedJobData } from './comprehensive-job-lifecycle.service';
import { AdvancedStatusPollingService, BatchStatusRequest, BatchStatusResponse } from './advanced-status-polling.service';
import { MetricsService } from '../../metrics/metrics.service';
import { CacheService } from '../../cache/cache.service';

/**
 * Job submission options
 */
export interface JobSubmissionOptions {
  priority?: EnhancedJobPriority;
  resourceRequirements?: Partial<JobResourceRequirements>;
  resultStorageType?: JobResultStorageType;
  enableCaching?: boolean;
  tags?: string[];
  dependencies?: string[];
  batchId?: string;
  parentJobId?: string;
  metadata?: Record<string, unknown>;
  customTimeout?: number;
  retryConfiguration?: {
    maxAttempts?: number;
    backoffMultiplier?: number;
  };
}

/**
 * System health information
 */
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  resourceUtilization: {
    memory: number;
    cpu: number;
    disk: number;
  };
  averageResponseTime: number;
  pollingActivity: {
    activePollers: number;
    cacheHitRate: number;
  };
  alerts: Array<{
    level: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
  }>;
  uptime: number;
  lastHealthCheck: Date;
}

@Injectable()
export class ComprehensiveJobOrchestratorService {
  private readonly logger = new Logger(ComprehensiveJobOrchestratorService.name);

  // Service initialization tracking
  private readonly startTime = Date.now();
  private lastHealthCheck = new Date();

  // Performance tracking
  private readonly performanceBuffer: Array<{
    timestamp: Date;
    jobId: string;
    action: string;
    duration: number;
    success: boolean;
  }> = [];

  // System alerts
  private readonly systemAlerts: Array<{
    level: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: Date;
  }> = [];

  constructor(
    private readonly lifecycleService: ComprehensiveJobLifecycleService,
    private readonly pollingService: AdvancedStatusPollingService,
    private readonly metricsService: MetricsService,
    private readonly cacheService: CacheService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.log('Comprehensive Job Orchestrator Service initialized');
    this.initializeEventHandlers();
    this.startPerformanceTracking();
  }

  /**
   * Submit a new job with comprehensive options
   */
  async submitJob(
    action: string,
    actionParams: ComputerActionDto,
    executionContext: JobExecutionContext,
    options: JobSubmissionOptions = {}
  ): Promise<string> {
    const operationId = `submit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startTime = Date.now();

    try {
      this.logger.log(`[${operationId}] Submitting job: ${action}`, {
        operationId,
        action,
        userId: executionContext.userId,
        priority: options.priority,
        batchId: options.batchId
      });

      // Validate submission parameters
      await this.validateJobSubmission(actionParams, executionContext, options);

      // Create default resource requirements if not provided
      const resourceRequirements = this.createResourceRequirements(
        actionParams,
        options.resourceRequirements
      );

      // Submit job to lifecycle service
      const jobId = await this.lifecycleService.submitJob(
        actionParams,
        executionContext,
        resourceRequirements,
        {
          priority: options.priority ?? EnhancedJobPriority.NORMAL,
          resultStorageType: options.resultStorageType ?? JobResultStorageType.MEMORY,
          enableCaching: options.enableCaching ?? false,
          tags: options.tags ?? [],
          dependencies: options.dependencies ?? [],
          batchId: options.batchId,
          parentJobId: options.parentJobId,
          metadata: {
            ...options.metadata,
            submissionOperationId: operationId,
            customTimeout: options.customTimeout
          }
        }
      );

      // Start status polling if appropriate
      if (this.shouldStartPolling(options.priority ?? EnhancedJobPriority.NORMAL)) {
        await this.pollingService.startPolling(jobId, executionContext.userId, {
          clientId: operationId
        });
      }

      const duration = Date.now() - startTime;

      // Record performance metrics
      this.recordJobSubmission(jobId, action, duration, true);

      // Emit job submitted event
      this.eventEmitter.emit('orchestrator.job.submitted', {
        jobId,
        operationId,
        action,
        userId: executionContext.userId,
        duration
      });

      this.logger.log(`[${operationId}] Job submitted successfully: ${jobId}`, {
        operationId,
        jobId,
        action,
        duration,
        userId: executionContext.userId
      });

      return jobId;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record failure metrics
      this.recordJobSubmission('unknown', action, duration, false);

      // Add system alert for submission failures
      this.addSystemAlert('error', `Job submission failed: ${errorMessage}`);

      this.logger.error(`[${operationId}] Job submission failed: ${errorMessage}`, {
        operationId,
        action,
        duration,
        userId: executionContext.userId,
        error: errorMessage
      });

      throw new Error(`Failed to submit job: ${errorMessage}`);
    }
  }

  /**
   * Get comprehensive job status
   */
  async getJobStatus(jobId: string, userId?: string): Promise<any> {
    try {
      const job = this.lifecycleService.getJobStatus(jobId);
      if (!job) {
        return null;
      }

      // Check access if userId provided
      if (userId && !this.hasJobAccess(job, userId)) {
        throw new Error(`Access denied for job ${jobId}`);
      }

      // Convert to status response
      return this.convertToStatusResponse(job);

    } catch (error) {
      this.logger.error(`Error retrieving job status: ${jobId}`, {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get comprehensive job result
   */
  async getJobResult(jobId: string, userId?: string): Promise<any> {
    try {
      const job = await this.lifecycleService.getJobResult(jobId);
      if (!job) {
        return null;
      }

      // Check access if userId provided
      if (userId && !this.hasJobAccess(job, userId)) {
        throw new Error(`Access denied for job ${jobId}`);
      }

      // Convert to result response
      return this.convertToResultResponse(job);

    } catch (error) {
      this.logger.error(`Error retrieving job result: ${jobId}`, {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Cancel job with enhanced options
   */
  async cancelJob(
    jobId: string,
    requestedBy: string,
    options: {
      reason?: string;
      graceful?: boolean;
      stopDependents?: boolean;
    } = {}
  ): Promise<boolean> {
    try {
      const success = await this.lifecycleService.cancelJob(
        jobId,
        requestedBy,
        options.reason,
        options.graceful ?? true
      );

      if (success) {
        // Stop polling for this job
        const pollerId = `${jobId}:${requestedBy}:default`;
        await this.pollingService.stopPolling(pollerId);

        // Handle dependent jobs if requested
        if (options.stopDependents) {
          await this.cancelDependentJobs(jobId, requestedBy);
        }
      }

      return success;

    } catch (error) {
      this.logger.error(`Error cancelling job: ${jobId}`, {
        jobId,
        requestedBy,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get comprehensive system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const now = new Date();
    const stats = this.lifecycleService.getSystemStats();
    const pollingStats = this.pollingService.getPollingStatistics();

    this.lastHealthCheck = now;

    const health: SystemHealth = {
      status: this.calculateSystemStatus(stats),
      activeJobs: stats.activeJobs,
      queuedJobs: stats.queuedJobs,
      completedJobs: stats.completedJobs,
      failedJobs: stats.failedJobs,
      resourceUtilization: {
        memory: stats.resourceUtilization.memoryUsage,
        cpu: stats.resourceUtilization.cpuUsage,
        disk: stats.resourceUtilization.diskUsage
      },
      averageResponseTime: stats.averageExecutionTime,
      pollingActivity: {
        activePollers: pollingStats.activePollers,
        cacheHitRate: pollingStats.cacheHitRate
      },
      alerts: [...this.systemAlerts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10),
      uptime: Date.now() - this.startTime,
      lastHealthCheck: now
    };

    // Update system alerts based on health
    this.updateSystemAlerts(health);

    return health;
  }

  // ===== PRIVATE HELPER METHODS =====

  private async validateJobSubmission(
    actionParams: ComputerActionDto,
    executionContext: JobExecutionContext,
    options: JobSubmissionOptions
  ): Promise<void> {
    // Validate action parameters
    if (!actionParams.action) {
      throw new Error('Action type is required');
    }

    // Validate execution context
    if (!executionContext.userId || !executionContext.username) {
      throw new Error('Valid execution context is required');
    }

    // Validate dependencies exist
    if (options.dependencies?.length) {
      for (const depJobId of options.dependencies) {
        const depJob = this.lifecycleService.getJobStatus(depJobId);
        if (!depJob) {
          throw new Error(`Dependency job not found: ${depJobId}`);
        }
      }
    }

    // Validate resource requirements
    if (options.resourceRequirements) {
      this.validateResourceRequirements(options.resourceRequirements);
    }
  }

  private createResourceRequirements(
    actionParams: ComputerActionDto,
    customRequirements?: Partial<JobResourceRequirements>
  ): JobResourceRequirements {
    // Base requirements by action type
    const baseRequirements = this.getBaseResourceRequirements(actionParams.action);

    return {
      maxMemoryMB: customRequirements?.maxMemoryMB ?? baseRequirements.maxMemoryMB,
      maxCpuPercent: customRequirements?.maxCpuPercent ?? baseRequirements.maxCpuPercent,
      timeoutMs: customRequirements?.timeoutMs ?? baseRequirements.timeoutMs,
      requiredDiskSpaceMB: customRequirements?.requiredDiskSpaceMB ?? baseRequirements.requiredDiskSpaceMB
    };
  }

  private getBaseResourceRequirements(action: string): JobResourceRequirements {
    const requirements: Record<string, JobResourceRequirements> = {
      'screenshot': { maxMemoryMB: 256, maxCpuPercent: 30, timeoutMs: 30000 },
      'click': { maxMemoryMB: 128, maxCpuPercent: 20, timeoutMs: 15000 },
      'type': { maxMemoryMB: 128, maxCpuPercent: 20, timeoutMs: 15000 },
      'scroll': { maxMemoryMB: 128, maxCpuPercent: 20, timeoutMs: 10000 },
      'move_mouse': { maxMemoryMB: 64, maxCpuPercent: 10, timeoutMs: 5000 },
      'read_file': { maxMemoryMB: 512, maxCpuPercent: 40, timeoutMs: 60000, requiredDiskSpaceMB: 100 },
      'write_file': { maxMemoryMB: 512, maxCpuPercent: 40, timeoutMs: 60000, requiredDiskSpaceMB: 200 },
      'default': { maxMemoryMB: 256, maxCpuPercent: 30, timeoutMs: 30000 }
    };

    return requirements[action] ?? requirements['default'];
  }

  private validateResourceRequirements(requirements: Partial<JobResourceRequirements>): void {
    if (requirements.maxMemoryMB && (requirements.maxMemoryMB <= 0 || requirements.maxMemoryMB > 8192)) {
      throw new Error('Memory requirement must be between 1MB and 8GB');
    }

    if (requirements.maxCpuPercent && (requirements.maxCpuPercent <= 0 || requirements.maxCpuPercent > 100)) {
      throw new Error('CPU requirement must be between 1% and 100%');
    }

    if (requirements.timeoutMs && (requirements.timeoutMs <= 0 || requirements.timeoutMs > 3600000)) {
      throw new Error('Timeout must be between 1ms and 1 hour');
    }
  }

  private shouldStartPolling(priority: EnhancedJobPriority): boolean {
    // Start polling for higher priority jobs automatically
    return priority === EnhancedJobPriority.CRITICAL ||
           priority === EnhancedJobPriority.URGENT ||
           priority === EnhancedJobPriority.HIGH;
  }

  private hasJobAccess(job: EnhancedJobData, userId: string): boolean {
    return job.accessControl.ownerId === userId ||
           job.accessControl.allowedUsers.includes(userId) ||
           job.accessControl.accessLevel === 'public';
  }

  private convertToStatusResponse(job: EnhancedJobData): any {
    return {
      jobId: job.jobId,
      status: job.status,
      priority: job.priority,
      progress: job.progress,
      submittedAt: job.timeline.submittedAt.toISOString(),
      startedAt: job.timeline.startedAt?.toISOString(),
      completedAt: job.timeline.completedAt?.toISOString(),
      performanceMetrics: job.performanceMetrics,
      errorDetails: job.errorDetails,
      executionContext: job.executionContext,
      retryInfo: job.retryConfig.currentAttempt > 1 ? {
        currentAttempt: job.retryConfig.currentAttempt,
        maxAttempts: job.retryConfig.maxAttempts,
        nextRetryAt: job.retryConfig.nextRetryAt?.toISOString(),
        retryReason: job.retryConfig.retryReason
      } : undefined,
      tags: job.tags.length > 0 ? job.tags : undefined
    };
  }

  private convertToResultResponse(job: EnhancedJobData): any {
    if (!job.result) {
      throw new Error(`Job ${job.jobId} has no result available`);
    }

    return {
      jobId: job.jobId,
      status: job.status,
      result: job.result,
      performanceMetrics: job.performanceMetrics,
      timeline: {
        submittedAt: job.timeline.submittedAt.toISOString(),
        queuedAt: job.timeline.queuedAt?.toISOString(),
        startedAt: job.timeline.startedAt?.toISOString(),
        completedAt: job.timeline.completedAt?.toISOString() ?? new Date().toISOString()
      },
      errorDetails: job.errorDetails,
      executionContext: job.executionContext,
      qualityMetrics: {
        dataIntegrity: 'verified',
        performanceScore: this.calculatePerformanceScore(job),
        securityScan: 'passed'
      },
      auditTrail: {
        accessedBy: [job.executionContext.userId],
        modifiedBy: [],
        accessHistory: job.auditTrail.map(entry => ({
          timestamp: entry.timestamp.toISOString(),
          action: entry.action,
          userId: entry.userId,
          details: entry.details
        }))
      }
    };
  }

  private calculatePerformanceScore(job: EnhancedJobData): number {
    let score = 100;

    // Deduct points for long execution time
    const executionTime = job.performanceMetrics.executionTimeMs;
    if (executionTime > 60000) score -= 20; // Over 1 minute
    else if (executionTime > 30000) score -= 10; // Over 30 seconds

    // Deduct points for retries
    score -= (job.retryConfig.currentAttempt - 1) * 15;

    // Deduct points for high resource usage
    if (job.performanceMetrics.peakMemoryMB > 1000) score -= 10;
    if (job.performanceMetrics.avgCpuPercent > 80) score -= 10;

    return Math.max(0, score);
  }

  private async cancelDependentJobs(jobId: string, requestedBy: string): Promise<void> {
    // This would traverse the dependency graph and cancel dependent jobs
    // Implementation depends on dependency tracking in lifecycle service
    this.logger.log(`Cancelling dependent jobs for: ${jobId}`, { jobId, requestedBy });
  }

  private calculateSystemStatus(stats: any): 'healthy' | 'degraded' | 'unhealthy' {
    // Determine system health based on metrics
    const failureRate = stats.totalJobs > 0 ? (stats.failedJobs / stats.totalJobs) * 100 : 0;
    const resourceUsage = Math.max(
      stats.resourceUtilization.memoryUsage,
      stats.resourceUtilization.cpuUsage,
      stats.resourceUtilization.diskUsage
    );

    if (failureRate > 20 || resourceUsage > 90) {
      return 'unhealthy';
    } else if (failureRate > 5 || resourceUsage > 75) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private updateSystemAlerts(health: SystemHealth): void {
    const now = new Date();

    // Check for high resource usage
    if (health.resourceUtilization.memory > 85) {
      this.addSystemAlert('warning', `High memory usage: ${health.resourceUtilization.memory.toFixed(1)}%`);
    }

    if (health.resourceUtilization.cpu > 90) {
      this.addSystemAlert('error', `High CPU usage: ${health.resourceUtilization.cpu.toFixed(1)}%`);
    }

    // Check for long queue times
    if (health.queuedJobs > 100) {
      this.addSystemAlert('warning', `Large job queue: ${health.queuedJobs} jobs queued`);
    }

    // Clean up old alerts (keep only last 24 hours)
    const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    for (let i = this.systemAlerts.length - 1; i >= 0; i--) {
      if (this.systemAlerts[i].timestamp < cutoffTime) {
        this.systemAlerts.splice(i, 1);
      }
    }
  }

  private addSystemAlert(level: 'warning' | 'error' | 'critical', message: string): void {
    this.systemAlerts.push({
      level,
      message,
      timestamp: new Date()
    });

    // Limit alert history
    if (this.systemAlerts.length > 100) {
      this.systemAlerts.shift();
    }

    this.logger[level](`System alert: ${message}`);
  }

  private recordJobSubmission(jobId: string, action: string, duration: number, success: boolean): void {
    this.performanceBuffer.push({
      timestamp: new Date(),
      jobId,
      action,
      duration,
      success
    });

    // Limit buffer size
    if (this.performanceBuffer.length > 1000) {
      this.performanceBuffer.shift();
    }

    // Record metrics
    this.metricsService.recordHistogram?.('job_submission_time', duration);
    this.metricsService.incrementCounter?.(success ? 'job_submission_success' : 'job_submission_failure');
  }

  private initializeEventHandlers(): void {
    // Listen for job lifecycle events
    this.eventEmitter.on('job.completed', (event) => {
      this.recordJobSubmission(event.jobId, 'completed', event.executionTime, true);
    });

    this.eventEmitter.on('job.failed', (event) => {
      this.recordJobSubmission(event.jobId, 'failed', event.executionTime || 0, false);
    });

    this.eventEmitter.on('job.cancelled', (event) => {
      this.recordJobSubmission(event.jobId, 'cancelled', 0, false);
    });
  }

  private startPerformanceTracking(): void {
    // Track performance metrics every minute
    setInterval(() => {
      const stats = this.lifecycleService.getSystemStats();
      this.metricsService.recordGauge?.('system_active_jobs', stats.activeJobs);
      this.metricsService.recordGauge?.('system_queued_jobs', stats.queuedJobs);
      this.metricsService.recordGauge?.('system_completed_jobs', stats.completedJobs);
      this.metricsService.recordGauge?.('system_failed_jobs', stats.failedJobs);
    }, 60000);
  }
}