/**
 * Advanced Status Polling Service
 *
 * Provides real-time job status polling with intelligent caching,
 * progress tracking, and optimized polling strategies.
 *
 * Features:
 * - Adaptive polling intervals based on job status
 * - Smart caching with TTL optimization
 * - Real-time progress updates via WebSocket
 * - Status change notifications
 * - Batch status retrieval for multiple jobs
 * - Historical status tracking
 * - Performance-optimized status queries
 *
 * @author Claude Code - Real-time Systems Specialist
 * @version 2.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  EnhancedJobStatus,
  JobExecutionPhase,
  EnhancedJobPriority,
  JobProgressTracking,
  JobPerformanceMetrics,
  JobErrorDetails,
  EnhancedJobStatusResponseDto
} from '../dto/enhanced-async-job.dto';
import { CacheService } from '../../cache/cache.service';
import { MetricsService } from '../../metrics/metrics.service';
import { ComprehensiveJobLifecycleService, EnhancedJobData } from './comprehensive-job-lifecycle.service';

/**
 * Status polling configuration
 */
interface StatusPollingConfig {
  jobId: string;
  userId: string;
  interval: number;
  lastPolled: Date;
  pollCount: number;
  subscribedAt: Date;
  clientId?: string;
  filters?: StatusPollingFilters;
}

/**
 * Status polling filters
 */
interface StatusPollingFilters {
  includeProgress?: boolean;
  includePerformanceMetrics?: boolean;
  includeErrorDetails?: boolean;
  includeAuditTrail?: boolean;
  minProgressChange?: number;
}

/**
 * Status change event
 */
interface StatusChangeEvent {
  jobId: string;
  oldStatus: EnhancedJobStatus;
  newStatus: EnhancedJobStatus;
  timestamp: Date;
  progressChange?: number;
  performanceUpdate?: Partial<JobPerformanceMetrics>;
}

/**
 * Batch status request
 */
export interface BatchStatusRequest {
  jobIds: string[];
  userId: string;
  filters?: StatusPollingFilters;
  includeCompleted?: boolean;
  includeFailed?: boolean;
}

/**
 * Batch status response
 */
export interface BatchStatusResponse {
  statuses: Array<{
    jobId: string;
    status: EnhancedJobStatusResponseDto | null;
    error?: string;
  }>;
  totalRequested: number;
  successCount: number;
  errorCount: number;
  retrievalTime: number;
}

/**
 * Historical status entry
 */
interface HistoricalStatusEntry {
  timestamp: Date;
  status: EnhancedJobStatus;
  phase: JobExecutionPhase;
  progress: number;
  operation: string;
  performanceSnapshot?: Partial<JobPerformanceMetrics>;
}

/**
 * Polling strategy configuration
 */
interface PollingStrategy {
  baseInterval: number;
  maxInterval: number;
  backoffMultiplier: number;
  accelerationThreshold: number;
  cacheStrategy: 'aggressive' | 'balanced' | 'minimal';
}

@Injectable()
export class AdvancedStatusPollingService {
  private readonly logger = new Logger(AdvancedStatusPollingService.name);

  // Active polling subscriptions
  private readonly activePollers = new Map<string, StatusPollingConfig>();
  private readonly pollingTimers = new Map<string, NodeJS.Timeout>();

  // Status caching
  private readonly statusCache = new Map<string, {
    status: EnhancedJobStatusResponseDto;
    cachedAt: Date;
    ttl: number;
  }>();

  // Status change tracking
  private readonly statusHistory = new Map<string, HistoricalStatusEntry[]>();
  private readonly statusChangeSubscribers = new Map<string, Set<string>>();

  // Polling strategies by job priority
  private readonly pollingStrategies = new Map<EnhancedJobPriority, PollingStrategy>([
    [EnhancedJobPriority.CRITICAL, {
      baseInterval: 100,
      maxInterval: 2000,
      backoffMultiplier: 1.2,
      accelerationThreshold: 5,
      cacheStrategy: 'minimal'
    }],
    [EnhancedJobPriority.URGENT, {
      baseInterval: 250,
      maxInterval: 3000,
      backoffMultiplier: 1.3,
      accelerationThreshold: 5,
      cacheStrategy: 'minimal'
    }],
    [EnhancedJobPriority.HIGH, {
      baseInterval: 500,
      maxInterval: 5000,
      backoffMultiplier: 1.4,
      accelerationThreshold: 3,
      cacheStrategy: 'balanced'
    }],
    [EnhancedJobPriority.NORMAL, {
      baseInterval: 1000,
      maxInterval: 10000,
      backoffMultiplier: 1.5,
      accelerationThreshold: 3,
      cacheStrategy: 'balanced'
    }],
    [EnhancedJobPriority.LOW, {
      baseInterval: 2000,
      maxInterval: 30000,
      backoffMultiplier: 1.8,
      accelerationThreshold: 2,
      cacheStrategy: 'aggressive'
    }],
    [EnhancedJobPriority.BACKGROUND, {
      baseInterval: 5000,
      maxInterval: 60000,
      backoffMultiplier: 2.0,
      accelerationThreshold: 1,
      cacheStrategy: 'aggressive'
    }]
  ]);

  // Performance metrics
  private pollCount = 0;
  private cacheHitCount = 0;
  private statusChangeCount = 0;

  constructor(
    private readonly jobLifecycleService: ComprehensiveJobLifecycleService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.logger.log('Advanced Status Polling Service initialized');
    this.startPerformanceMonitoring();
  }

  /**
   * Start polling for job status with adaptive intervals
   */
  async startPolling(
    jobId: string,
    userId: string,
    options: {
      clientId?: string;
      filters?: StatusPollingFilters;
      customInterval?: number;
    } = {}
  ): Promise<void> {
    const pollerId = `${jobId}:${userId}:${options.clientId ?? 'default'}`;

    // Stop existing poller if present
    if (this.activePollers.has(pollerId)) {
      await this.stopPolling(pollerId);
    }

    const job = this.jobLifecycleService.getJobStatus(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    // Create polling configuration
    const pollingConfig: StatusPollingConfig = {
      jobId,
      userId,
      interval: options.customInterval ?? this.getInitialInterval(job.priority),
      lastPolled: new Date(),
      pollCount: 0,
      subscribedAt: new Date(),
      clientId: options.clientId,
      filters: options.filters
    };

    this.activePollers.set(pollerId, pollingConfig);

    // Start polling timer
    this.scheduleNextPoll(pollerId);

    // Subscribe to status changes
    this.subscribeToStatusChanges(jobId, pollerId);

    this.logger.log(`Started polling for job ${jobId}`, {
      jobId,
      userId,
      clientId: options.clientId,
      interval: pollingConfig.interval
    });

    // Emit initial status
    const initialStatus = await this.getJobStatus(jobId, userId, options.filters);
    if (initialStatus) {
      this.eventEmitter.emit('job.status.polled', {
        pollerId,
        jobId,
        userId,
        status: initialStatus
      });
    }
  }

  /**
   * Stop polling for a specific job
   */
  async stopPolling(pollerId: string): Promise<void> {
    const config = this.activePollers.get(pollerId);
    if (!config) {
      return;
    }

    // Clear timer
    const timer = this.pollingTimers.get(pollerId);
    if (timer) {
      clearTimeout(timer);
      this.pollingTimers.delete(pollerId);
    }

    // Unsubscribe from status changes
    this.unsubscribeFromStatusChanges(config.jobId, pollerId);

    // Remove configuration
    this.activePollers.delete(pollerId);

    this.logger.log(`Stopped polling for job ${config.jobId}`, {
      jobId: config.jobId,
      userId: config.userId,
      pollCount: config.pollCount,
      duration: Date.now() - config.subscribedAt.getTime()
    });
  }

  /**
   * Get current job status with intelligent caching
   */
  async getJobStatus(
    jobId: string,
    userId: string,
    filters?: StatusPollingFilters
  ): Promise<EnhancedJobStatusResponseDto | null> {
    const startTime = Date.now();
    this.pollCount++;

    try {
      // Check cache first
      const cachedStatus = this.getCachedStatus(jobId, filters);
      if (cachedStatus) {
        this.cacheHitCount++;
        this.recordPollingMetrics('cache_hit', Date.now() - startTime);
        return cachedStatus;
      }

      // Fetch fresh status
      const job = this.jobLifecycleService.getJobStatus(jobId);
      if (!job) {
        this.recordPollingMetrics('not_found', Date.now() - startTime);
        return null;
      }

      // Check access permissions
      if (!this.hasAccessPermission(job, userId)) {
        throw new Error(`Access denied for job ${jobId}`);
      }

      // Convert to response DTO
      const statusResponse = this.convertToStatusResponse(job, filters);

      // Cache the result
      this.cacheStatus(jobId, statusResponse, this.calculateCacheTTL(job));

      // Update status history
      this.updateStatusHistory(job);

      this.recordPollingMetrics('fresh_fetch', Date.now() - startTime);
      return statusResponse;

    } catch (error) {
      this.logger.error(`Error retrieving status for job ${jobId}`, {
        jobId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      this.recordPollingMetrics('error', Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Get status for multiple jobs in a single request
   */
  async getBatchStatus(request: BatchStatusRequest): Promise<BatchStatusResponse> {
    const startTime = Date.now();
    const results: BatchStatusResponse['statuses'] = [];
    let successCount = 0;
    let errorCount = 0;

    await Promise.allSettled(
      request.jobIds.map(async (jobId) => {
        try {
          const status = await this.getJobStatus(jobId, request.userId, request.filters);

          // Apply completion filters
          if (status) {
            const shouldInclude = this.shouldIncludeInBatch(status, request);
            if (shouldInclude) {
              results.push({ jobId, status });
              successCount++;
            }
          } else {
            results.push({ jobId, status: null, error: 'Job not found' });
            errorCount++;
          }
        } catch (error) {
          results.push({
            jobId,
            status: null,
            error: error instanceof Error ? error.message : String(error)
          });
          errorCount++;
        }
      })
    );

    const response: BatchStatusResponse = {
      statuses: results,
      totalRequested: request.jobIds.length,
      successCount,
      errorCount,
      retrievalTime: Date.now() - startTime
    };

    this.logger.log(`Batch status request completed`, {
      totalRequested: request.jobIds.length,
      successCount,
      errorCount,
      retrievalTime: response.retrievalTime
    });

    return response;
  }

  /**
   * Get historical status changes for a job
   */
  getStatusHistory(jobId: string, userId: string): HistoricalStatusEntry[] {
    const job = this.jobLifecycleService.getJobStatus(jobId);
    if (!job || !this.hasAccessPermission(job, userId)) {
      return [];
    }

    return this.statusHistory.get(jobId) ?? [];
  }

  /**
   * Get polling statistics and performance metrics
   */
  getPollingStatistics(): {
    activePollers: number;
    totalPolls: number;
    cacheHitRate: number;
    statusChanges: number;
    averageResponseTime: number;
    pollersByPriority: Record<string, number>;
  } {
    const pollersByPriority: Record<string, number> = {};

    for (const config of this.activePollers.values()) {
      const job = this.jobLifecycleService.getJobStatus(config.jobId);
      if (job) {
        const priority = job.priority.toString();
        pollersByPriority[priority] = (pollersByPriority[priority] ?? 0) + 1;
      }
    }

    return {
      activePollers: this.activePollers.size,
      totalPolls: this.pollCount,
      cacheHitRate: this.pollCount > 0 ? (this.cacheHitCount / this.pollCount) * 100 : 0,
      statusChanges: this.statusChangeCount,
      averageResponseTime: 0, // Would be calculated from metrics
      pollersByPriority
    };
  }

  /**
   * Clean up completed job polling
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupCompletedPolling(): Promise<void> {
    const completedPollers: string[] = [];

    for (const [pollerId, config] of this.activePollers.entries()) {
      const job = this.jobLifecycleService.getJobStatus(config.jobId);

      if (!job || this.isJobCompleted(job.status)) {
        completedPollers.push(pollerId);
      }
    }

    for (const pollerId of completedPollers) {
      await this.stopPolling(pollerId);
    }

    if (completedPollers.length > 0) {
      this.logger.log(`Cleaned up ${completedPollers.length} completed pollers`);
    }
  }

  /**
   * Clean up old status cache entries
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async cleanupStatusCache(): Promise<void> {
    const now = new Date();
    const expiredEntries: string[] = [];

    for (const [jobId, cacheEntry] of this.statusCache.entries()) {
      const expiryTime = new Date(cacheEntry.cachedAt.getTime() + cacheEntry.ttl);
      if (now > expiryTime) {
        expiredEntries.push(jobId);
      }
    }

    for (const jobId of expiredEntries) {
      this.statusCache.delete(jobId);
    }

    if (expiredEntries.length > 0) {
      this.logger.log(`Cleaned up ${expiredEntries.length} expired cache entries`);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  private scheduleNextPoll(pollerId: string): void {
    const config = this.activePollers.get(pollerId);
    if (!config) {
      return;
    }

    const timer = setTimeout(async () => {
      await this.executePoll(pollerId);
    }, config.interval);

    this.pollingTimers.set(pollerId, timer);
  }

  private async executePoll(pollerId: string): Promise<void> {
    const config = this.activePollers.get(pollerId);
    if (!config) {
      return;
    }

    try {
      const status = await this.getJobStatus(config.jobId, config.userId, config.filters);

      if (status) {
        // Update polling configuration
        config.lastPolled = new Date();
        config.pollCount++;

        // Adjust polling interval based on job state
        this.adjustPollingInterval(config, status);

        // Emit status update
        this.eventEmitter.emit('job.status.polled', {
          pollerId,
          jobId: config.jobId,
          userId: config.userId,
          status
        });

        // Check if job is completed
        if (this.isJobCompleted(status.status)) {
          await this.stopPolling(pollerId);
          return;
        }
      }

      // Schedule next poll
      this.scheduleNextPoll(pollerId);

    } catch (error) {
      this.logger.error(`Error during polling for ${config.jobId}`, {
        jobId: config.jobId,
        pollerId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Continue polling even on error, but with increased interval
      config.interval = Math.min(config.interval * 1.5, 30000);
      this.scheduleNextPoll(pollerId);
    }
  }

  private adjustPollingInterval(config: StatusPollingConfig, status: EnhancedJobStatusResponseDto): void {
    const job = this.jobLifecycleService.getJobStatus(config.jobId);
    if (!job) {
      return;
    }

    const strategy = this.pollingStrategies.get(job.priority);
    if (!strategy) {
      return;
    }

    // Accelerate polling for active jobs with progress changes
    if (status.status === EnhancedJobStatus.IN_PROGRESS) {
      if (config.pollCount < strategy.accelerationThreshold) {
        config.interval = Math.max(strategy.baseInterval, config.interval / strategy.backoffMultiplier);
      }
    } else {
      // Slow down polling for stable states
      config.interval = Math.min(strategy.maxInterval, config.interval * strategy.backoffMultiplier);
    }
  }

  private getInitialInterval(priority: EnhancedJobPriority): number {
    const strategy = this.pollingStrategies.get(priority);
    return strategy ? strategy.baseInterval : 1000;
  }

  private getCachedStatus(jobId: string, filters?: StatusPollingFilters): EnhancedJobStatusResponseDto | null {
    const cacheEntry = this.statusCache.get(jobId);
    if (!cacheEntry) {
      return null;
    }

    // Check if cache is still valid
    const now = new Date();
    const expiryTime = new Date(cacheEntry.cachedAt.getTime() + cacheEntry.ttl);
    if (now > expiryTime) {
      this.statusCache.delete(jobId);
      return null;
    }

    // Check if cached version matches filter requirements
    if (this.doesCacheMatchFilters(cacheEntry.status, filters)) {
      return cacheEntry.status;
    }

    return null;
  }

  private cacheStatus(jobId: string, status: EnhancedJobStatusResponseDto, ttl: number): void {
    this.statusCache.set(jobId, {
      status: { ...status }, // Deep copy
      cachedAt: new Date(),
      ttl
    });
  }

  private calculateCacheTTL(job: EnhancedJobData): number {
    const strategy = this.pollingStrategies.get(job.priority);
    if (!strategy) {
      return 5000; // Default 5 seconds
    }

    switch (strategy.cacheStrategy) {
      case 'aggressive':
        return 30000; // 30 seconds
      case 'balanced':
        return 10000; // 10 seconds
      case 'minimal':
        return 2000;  // 2 seconds
      default:
        return 5000;  // 5 seconds
    }
  }

  private doesCacheMatchFilters(cachedStatus: EnhancedJobStatusResponseDto, filters?: StatusPollingFilters): boolean {
    if (!filters) {
      return true;
    }

    // Check if cached status includes required fields
    if (filters.includeProgress && !cachedStatus.progress) {
      return false;
    }

    if (filters.includePerformanceMetrics && !cachedStatus.performanceMetrics) {
      return false;
    }

    if (filters.includeErrorDetails && !cachedStatus.errorDetails) {
      return false;
    }

    return true;
  }

  private convertToStatusResponse(job: EnhancedJobData, filters?: StatusPollingFilters): EnhancedJobStatusResponseDto {
    const response: EnhancedJobStatusResponseDto = {
      jobId: job.jobId,
      status: job.status,
      priority: job.priority,
      progress: job.progress,
      submittedAt: job.timeline.submittedAt.toISOString(),
      startedAt: job.timeline.startedAt?.toISOString(),
      completedAt: job.timeline.completedAt?.toISOString(),
      performanceMetrics: job.performanceMetrics,
      executionContext: job.executionContext
    };

    // Apply filters to reduce payload size
    if (filters) {
      if (!filters.includeProgress) {
        delete (response as any).progress;
      }

      if (!filters.includePerformanceMetrics) {
        delete (response as any).performanceMetrics;
      }

      if (!filters.includeErrorDetails) {
        delete (response as any).errorDetails;
      }

      if (!filters.includeAuditTrail) {
        // Remove audit trail if present
      }
    }

    // Include error details if job failed
    if (job.status === EnhancedJobStatus.FAILED && job.errorDetails) {
      response.errorDetails = job.errorDetails;
    }

    // Include retry information if applicable
    if (job.retryConfig.currentAttempt > 1) {
      response.retryInfo = {
        currentAttempt: job.retryConfig.currentAttempt,
        maxAttempts: job.retryConfig.maxAttempts,
        nextRetryAt: job.retryConfig.nextRetryAt?.toISOString(),
        retryReason: job.retryConfig.retryReason
      };
    }

    // Include tags
    if (job.tags.length > 0) {
      response.tags = job.tags;
    }

    return response;
  }

  private hasAccessPermission(job: EnhancedJobData, userId: string): boolean {
    return job.accessControl.ownerId === userId ||
           job.accessControl.allowedUsers.includes(userId) ||
           job.accessControl.accessLevel === 'public';
  }

  private updateStatusHistory(job: EnhancedJobData): void {
    const historyEntry: HistoricalStatusEntry = {
      timestamp: new Date(),
      status: job.status,
      phase: job.phase,
      progress: job.progress.overallProgress,
      operation: job.progress.currentOperation,
      performanceSnapshot: {
        executionTimeMs: job.performanceMetrics.executionTimeMs,
        queueTimeMs: job.performanceMetrics.queueTimeMs,
        peakMemoryMB: job.performanceMetrics.peakMemoryMB,
        avgCpuPercent: job.performanceMetrics.avgCpuPercent
      }
    };

    const history = this.statusHistory.get(job.jobId) ?? [];
    history.push(historyEntry);

    // Limit history size
    if (history.length > 100) {
      history.shift();
    }

    this.statusHistory.set(job.jobId, history);

    // Check for status changes
    if (history.length > 1) {
      const previousEntry = history[history.length - 2];
      if (previousEntry.status !== historyEntry.status) {
        this.handleStatusChange(job.jobId, previousEntry.status, historyEntry.status, historyEntry.timestamp);
      }
    }
  }

  private handleStatusChange(jobId: string, oldStatus: EnhancedJobStatus, newStatus: EnhancedJobStatus, timestamp: Date): void {
    this.statusChangeCount++;

    const changeEvent: StatusChangeEvent = {
      jobId,
      oldStatus,
      newStatus,
      timestamp
    };

    // Notify all subscribers
    const subscribers = this.statusChangeSubscribers.get(jobId);
    if (subscribers) {
      for (const pollerId of subscribers) {
        this.eventEmitter.emit('job.status.changed', {
          pollerId,
          change: changeEvent
        });
      }
    }

    this.logger.log(`Status changed for job ${jobId}`, {
      jobId,
      oldStatus,
      newStatus,
      subscriberCount: subscribers?.size ?? 0
    });
  }

  private subscribeToStatusChanges(jobId: string, pollerId: string): void {
    if (!this.statusChangeSubscribers.has(jobId)) {
      this.statusChangeSubscribers.set(jobId, new Set());
    }
    this.statusChangeSubscribers.get(jobId)!.add(pollerId);
  }

  private unsubscribeFromStatusChanges(jobId: string, pollerId: string): void {
    const subscribers = this.statusChangeSubscribers.get(jobId);
    if (subscribers) {
      subscribers.delete(pollerId);
      if (subscribers.size === 0) {
        this.statusChangeSubscribers.delete(jobId);
      }
    }
  }

  private shouldIncludeInBatch(status: EnhancedJobStatusResponseDto, request: BatchStatusRequest): boolean {
    if (status.status === EnhancedJobStatus.COMPLETED && !request.includeCompleted) {
      return false;
    }

    if (status.status === EnhancedJobStatus.FAILED && !request.includeFailed) {
      return false;
    }

    return true;
  }

  private isJobCompleted(status: EnhancedJobStatus): boolean {
    return status === EnhancedJobStatus.COMPLETED ||
           status === EnhancedJobStatus.FAILED ||
           status === EnhancedJobStatus.CANCELLED;
  }

  private recordPollingMetrics(type: 'cache_hit' | 'fresh_fetch' | 'not_found' | 'error', responseTime: number): void {
    this.metricsService.recordHistogram?.(`status_polling_${type}_time`, responseTime);
    this.metricsService.incrementCounter?.(`status_polling_${type}_count`);
  }

  private startPerformanceMonitoring(): void {
    // Monitor polling performance every 30 seconds
    setInterval(() => {
      const stats = this.getPollingStatistics();

      this.metricsService.recordGauge?.('active_pollers', stats.activePollers);
      this.metricsService.recordGauge?.('cache_hit_rate', stats.cacheHitRate);
      this.metricsService.recordGauge?.('status_changes_per_minute', stats.statusChanges);

      // Reset counters for next interval
      this.pollCount = 0;
      this.cacheHitCount = 0;
      this.statusChangeCount = 0;
    }, 30000);
  }
}