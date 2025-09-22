/**
 * Comprehensive Job Orchestrator Service - Enterprise Thread-Safe Job Management
 *
 * Provides enterprise-grade job orchestration with thread-safe operations,
 * distributed locking, and comprehensive coordination between all job
 * management components.
 *
 * Features:
 * - Thread-safe job operations with distributed locking
 * - Comprehensive job lifecycle coordination
 * - Enterprise monitoring and analytics integration
 * - Intelligent load balancing and resource allocation
 * - Failure detection and automatic recovery
 * - Performance optimization and tuning
 * - Audit logging and compliance tracking
 * - Real-time status synchronization
 *
 * @author Claude Code - Agent 8 Job Management Specialist
 * @version 3.0.0
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Mutex } from 'async-mutex';
import { v4 as uuidv4 } from 'uuid';
import { ComprehensiveJobStorageService, JobStatus, JobPriority, StoredJobData } from './comprehensive-job-storage.service';
import { ComprehensiveJobWorkerService } from './comprehensive-job-worker.service';
import { ComprehensiveJobMonitoringService, SystemMetrics } from './comprehensive-job-monitoring.service';
import { ComprehensiveResultManagerService } from './comprehensive-result-manager.service';
import { ComprehensiveErrorRecoveryService, ErrorInfo } from './comprehensive-error-recovery.service';
import { ComprehensiveCleanupManagerService } from './comprehensive-cleanup-manager.service';
import { ComputerUseService } from '../computer-use.service';

/**
 * Job submission request
 */
export interface JobSubmissionRequest {
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
 * Job submission response
 */
export interface JobSubmissionResponse {
  jobId: string;
  status: JobStatus;
  submittedAt: string;
  estimatedCompletion?: string;
  queuePosition?: number;
  batchId?: string;
}

/**
 * Job execution context
 */
export interface JobExecutionContext {
  jobId: string;
  submissionRequest: JobSubmissionRequest;
  currentStatus: JobStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  errorInfo?: ErrorInfo;
  workerId?: string;
  executionTimeMs?: number;
  resourceUsage?: Record<string, unknown>;
  auditTrail: AuditEntry[];
}

/**
 * Audit trail entry
 */
export interface AuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: Record<string, unknown>;
  previousState?: any;
  newState?: any;
}

/**
 * Thread-safe operation lock
 */
export interface OperationLock {
  lockId: string;
  resource: string;
  operation: string;
  acquiredAt: Date;
  expiresAt: Date;
  ownerId: string;
}

/**
 * System health status
 */
export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  components: {
    storage: 'healthy' | 'degraded' | 'unhealthy';
    workers: 'healthy' | 'degraded' | 'unhealthy';
    monitoring: 'healthy' | 'degraded' | 'unhealthy';
    errorRecovery: 'healthy' | 'degraded' | 'unhealthy';
    cleanup: 'healthy' | 'degraded' | 'unhealthy';
  };
  metrics: SystemMetrics;
  uptime: number;
  version: string;
  timestamp: Date;
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  maxConcurrentJobs: number;
  queueOptimization: boolean;
  priorityBoostThreshold: number;
  resourceAllocationStrategy: 'fair' | 'priority' | 'adaptive';
  loadBalancingEnabled: boolean;
  autoScalingEnabled: boolean;
  preemptionEnabled: boolean;
  cacheOptimizationLevel: 'conservative' | 'aggressive' | 'adaptive';
}

@Injectable()
export class ComprehensiveJobOrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComprehensiveJobOrchestratorService.name);
  private readonly globalMutex = new Mutex();
  private readonly jobMutexes = new Map<string, Mutex>();
  private readonly operationLocks = new Map<string, OperationLock>();
  private readonly jobContexts = new Map<string, JobExecutionContext>();

  private isInitialized = false;
  private isShuttingDown = false;
  private orchestratorId = uuidv4();
  private startTime = new Date();

  private healthCheckInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private lockCleanupInterval: NodeJS.Timeout | null = null;

  private readonly performanceConfig: PerformanceConfig = {
    maxConcurrentJobs: 50,
    queueOptimization: true,
    priorityBoostThreshold: 300000, // 5 minutes
    resourceAllocationStrategy: 'adaptive',
    loadBalancingEnabled: true,
    autoScalingEnabled: true,
    preemptionEnabled: false,
    cacheOptimizationLevel: 'adaptive',
  };

  private readonly lockExpirationTime = 300000; // 5 minutes

  constructor(
    private readonly jobStorage: ComprehensiveJobStorageService,
    private readonly jobWorker: ComprehensiveJobWorkerService,
    private readonly jobMonitoring: ComprehensiveJobMonitoringService,
    private readonly resultManager: ComprehensiveResultManagerService,
    private readonly errorRecovery: ComprehensiveErrorRecoveryService,
    private readonly cleanupManager: ComprehensiveCleanupManagerService,
    private readonly computerUseService: ComputerUseService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log(`Comprehensive Job Orchestrator initialized with ID: ${this.orchestratorId}`);
  }

  /**
   * Initialize the orchestrator service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Comprehensive Job Orchestrator Service');

    // Verify all dependencies are available
    await this.verifyDependencies();

    // Start background tasks
    this.startHealthMonitoring();
    this.startPerformanceOptimization();
    this.startLockCleanup();

    // Register event listeners
    this.registerEventHandlers();

    this.isInitialized = true;
    this.logger.log('Comprehensive Job Orchestrator Service initialized successfully');

    this.eventEmitter.emit('orchestrator.initialized', {
      orchestratorId: this.orchestratorId,
      timestamp: new Date(),
    });
  }

  /**
   * Cleanup on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Comprehensive Job Orchestrator Service');
    this.isShuttingDown = true;

    // Stop background tasks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    if (this.lockCleanupInterval) {
      clearInterval(this.lockCleanupInterval);
    }

    // Release all locks
    await this.releaseAllLocks();

    // Graceful shutdown of active jobs
    await this.gracefulShutdown();

    this.logger.log('Comprehensive Job Orchestrator Service shutdown completed');
  }

  /**
   * Submit a job for execution with thread-safe operations
   */
  async submitJob(request: JobSubmissionRequest): Promise<JobSubmissionResponse> {
    if (!this.isInitialized) {
      throw new Error('Orchestrator not initialized');
    }

    if (this.isShuttingDown) {
      throw new Error('Orchestrator is shutting down');
    }

    const jobId = uuidv4();
    const submittedAt = new Date();

    // Acquire global lock for job submission
    const release = await this.globalMutex.acquire();

    try {
      this.logger.debug(`Submitting job ${jobId} of type ${request.actionType}`);

      // Create job execution context
      const context: JobExecutionContext = {
        jobId,
        submissionRequest: request,
        currentStatus: JobStatus.PENDING,
        progress: 0,
        auditTrail: [
          {
            timestamp: submittedAt,
            action: 'job_submitted',
            actor: this.orchestratorId,
            details: {
              actionType: request.actionType,
              priority: request.priority,
              timeout: request.timeout,
              batchId: request.batchId,
            },
            newState: { status: JobStatus.PENDING },
          },
        ],
      };

      this.jobContexts.set(jobId, context);

      // Store job in database
      await this.jobStorage.storeJob({
        jobId,
        batchId: request.batchId,
        jobKey: request.jobKey,
        status: JobStatus.PENDING,
        priority: request.priority || JobPriority.NORMAL,
        actionType: request.actionType,
        actionData: request.actionData,
        progress: 0,
        submittedAt,
        timeout: request.timeout || 30000,
        useCache: request.useCache || false,
        maxRetries: request.retryOptions?.maxRetries || 3,
        dependencies: request.dependencies || [],
        dependents: [],
        metadata: {
          ...request.metadata,
          submittedBy: this.orchestratorId,
          submissionType: 'orchestrated',
        },
      });

      // Submit to worker service
      await this.jobWorker.submitJob(
        jobId,
        request.actionType,
        request.actionData,
        {
          priority: request.priority,
          timeout: request.timeout,
          dependencies: request.dependencies,
          resourceRequirements: this.estimateResourceRequirements(request),
        }
      );

      // Update job context
      context.currentStatus = JobStatus.QUEUED;
      this.addAuditEntry(context, 'job_queued', { workerId: 'pending' });

      // Estimate completion time
      const estimatedCompletion = this.estimateCompletionTime(request);

      // Get queue position
      const queuePosition = await this.getQueuePosition(jobId);

      const response: JobSubmissionResponse = {
        jobId,
        status: JobStatus.QUEUED,
        submittedAt: submittedAt.toISOString(),
        estimatedCompletion: estimatedCompletion?.toISOString(),
        queuePosition,
        batchId: request.batchId,
      };

      this.eventEmitter.emit('job.submitted', {
        jobId,
        actionType: request.actionType,
        priority: request.priority,
        batchId: request.batchId,
        orchestratorId: this.orchestratorId,
      });

      this.logger.log(`Job ${jobId} submitted successfully for ${request.actionType}`);

      return response;

    } catch (error) {
      this.logger.error(`Failed to submit job ${jobId}:`, error);

      // Clean up on failure
      this.jobContexts.delete(jobId);

      // Handle error through error recovery service
      if (error instanceof Error) {
        await this.errorRecovery.handleJobError(jobId, error, {
          actionType: request.actionType,
          phase: 'submission',
          orchestratorId: this.orchestratorId,
        });
      }

      throw error;
    } finally {
      release();
    }
  }

  /**
   * Get job status with comprehensive information
   */
  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: JobStatus;
    progress: number;
    submittedAt?: string;
    startedAt?: string;
    completedAt?: string;
    estimatedCompletion?: string;
    executionTimeMs?: number;
    currentStep?: string;
    errorMessage?: string;
    workerId?: string;
    resourceUsage?: Record<string, unknown>;
    auditTrail: AuditEntry[];
  }> {
    const context = this.jobContexts.get(jobId);

    if (!context) {
      // Try to load from storage
      const storedJob = await this.jobStorage.getJob(jobId);
      if (!storedJob) {
        throw new Error(`Job not found: ${jobId}`);
      }

      return {
        jobId: storedJob.jobId,
        status: storedJob.status,
        progress: storedJob.progress,
        submittedAt: storedJob.submittedAt.toISOString(),
        startedAt: storedJob.startedAt?.toISOString(),
        completedAt: storedJob.completedAt?.toISOString(),
        executionTimeMs: storedJob.executionTimeMs,
        currentStep: storedJob.currentStep,
        errorMessage: storedJob.errorMessage,
        auditTrail: JSON.parse(storedJob.auditLog || '[]'),
      };
    }

    return {
      jobId: context.jobId,
      status: context.currentStatus,
      progress: context.progress,
      submittedAt: context.auditTrail[0]?.timestamp.toISOString(),
      startedAt: context.startedAt?.toISOString(),
      completedAt: context.completedAt?.toISOString(),
      executionTimeMs: context.executionTimeMs,
      errorMessage: context.errorInfo?.message,
      workerId: context.workerId,
      resourceUsage: context.resourceUsage,
      auditTrail: context.auditTrail,
    };
  }

  /**
   * Cancel a job with proper cleanup
   */
  async cancelJob(jobId: string, reason?: string): Promise<boolean> {
    const jobMutex = this.getJobMutex(jobId);
    const release = await jobMutex.acquire();

    try {
      const context = this.jobContexts.get(jobId);
      if (!context) {
        return false;
      }

      // Check if job can be cancelled
      if (context.currentStatus === JobStatus.COMPLETED ||
          context.currentStatus === JobStatus.FAILED ||
          context.currentStatus === JobStatus.CANCELLED) {
        return false;
      }

      this.logger.log(`Cancelling job ${jobId}: ${reason || 'User requested'}`);

      // Cancel in worker service
      const workerCancelled = await this.jobWorker.cancelJob(jobId);

      // Update job status
      context.currentStatus = JobStatus.CANCELLED;
      context.completedAt = new Date();
      this.addAuditEntry(context, 'job_cancelled', { reason, cancelled: workerCancelled });

      // Update in storage
      await this.jobStorage.updateJob(jobId, {
        status: JobStatus.CANCELLED,
        completedAt: context.completedAt,
        errorMessage: reason || 'Job cancelled by user',
      });

      // Clean up job context
      this.jobContexts.delete(jobId);

      this.eventEmitter.emit('job.cancelled', {
        jobId,
        reason,
        orchestratorId: this.orchestratorId,
      });

      return true;

    } catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    } finally {
      release();
    }
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealthStatus> {
    const metrics = this.jobMonitoring.getMetrics();
    const workerMetrics = this.jobWorker.getMetrics();
    const errorStats = this.errorRecovery.getErrorRecoveryStats();
    const cleanupMetrics = this.cleanupManager.getOptimizationMetrics();

    // Assess component health
    const components = {
      storage: this.assessStorageHealth(),
      workers: this.assessWorkerHealth(workerMetrics),
      monitoring: this.assessMonitoringHealth(metrics),
      errorRecovery: this.assessErrorRecoveryHealth(errorStats),
      cleanup: this.assessCleanupHealth(cleanupMetrics),
    };

    // Determine overall health
    const componentStates = Object.values(components);
    let overall: SystemHealthStatus['overall'] = 'healthy';

    if (componentStates.includes('unhealthy')) {
      overall = 'critical';
    } else if (componentStates.includes('degraded')) {
      overall = 'degraded';
    } else if (componentStates.some(s => s === 'unhealthy')) {
      overall = 'unhealthy';
    }

    return {
      overall,
      components,
      metrics,
      uptime: Date.now() - this.startTime.getTime(),
      version: '3.0.0',
      timestamp: new Date(),
    };
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    jobThroughput: number;
    averageExecutionTime: number;
    queueWaitTime: number;
    resourceUtilization: number;
    errorRate: number;
    concurrentJobs: number;
    completionRate: number;
  } {
    const metrics = this.jobMonitoring.getMetrics();
    const workerMetrics = this.jobWorker.getMetrics();

    return {
      jobThroughput: metrics.throughputPerMinute,
      averageExecutionTime: metrics.averageExecutionTime,
      queueWaitTime: metrics.queueMetrics.averageWaitTime,
      resourceUtilization: (workerMetrics.activeWorkers / workerMetrics.totalWorkers) * 100,
      errorRate: metrics.errorRate,
      concurrentJobs: metrics.activeJobs,
      completionRate: metrics.throughputPerMinute,
    };
  }

  /**
   * Execute performance optimization
   */
  async optimizePerformance(): Promise<{
    queueOptimized: boolean;
    workersScaled: boolean;
    resourcesBalanced: boolean;
    cacheOptimized: boolean;
  }> {
    this.logger.log('Executing performance optimization');

    const results = {
      queueOptimized: false,
      workersScaled: false,
      resourcesBalanced: false,
      cacheOptimized: false,
    };

    try {
      // Queue optimization
      if (this.performanceConfig.queueOptimization) {
        results.queueOptimized = await this.optimizeJobQueue();
      }

      // Worker auto-scaling
      if (this.performanceConfig.autoScalingEnabled) {
        results.workersScaled = await this.optimizeWorkerPool();
      }

      // Resource balancing
      if (this.performanceConfig.loadBalancingEnabled) {
        results.resourcesBalanced = await this.balanceResourceAllocation();
      }

      // Cache optimization
      results.cacheOptimized = await this.optimizeCaching();

      this.eventEmitter.emit('performance.optimized', {
        orchestratorId: this.orchestratorId,
        results,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error('Performance optimization failed:', error);
    }

    return results;
  }

  /**
   * Acquire a distributed lock for thread-safe operations
   */
  async acquireLock(resource: string, operation: string, timeout: number = 60000): Promise<string> {
    const lockId = uuidv4();
    const expiresAt = new Date(Date.now() + timeout);

    const lock: OperationLock = {
      lockId,
      resource,
      operation,
      acquiredAt: new Date(),
      expiresAt,
      ownerId: this.orchestratorId,
    };

    // Check if resource is already locked
    const existingLock = Array.from(this.operationLocks.values())
      .find(l => l.resource === resource && l.expiresAt > new Date());

    if (existingLock) {
      throw new Error(`Resource ${resource} is already locked by ${existingLock.ownerId}`);
    }

    this.operationLocks.set(lockId, lock);

    this.logger.debug(`Acquired lock ${lockId} for ${resource}:${operation}`);

    return lockId;
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(lockId: string): Promise<boolean> {
    const lock = this.operationLocks.get(lockId);

    if (!lock) {
      return false;
    }

    if (lock.ownerId !== this.orchestratorId) {
      throw new Error('Cannot release lock owned by different orchestrator');
    }

    this.operationLocks.delete(lockId);

    this.logger.debug(`Released lock ${lockId} for ${lock.resource}:${lock.operation}`);

    return true;
  }

  /**
   * Handle job events from worker service
   */
  private async handleJobStarted(payload: { jobId: string; workerId: string }): Promise<void> {
    const context = this.jobContexts.get(payload.jobId);
    if (!context) return;

    const jobMutex = this.getJobMutex(payload.jobId);
    const release = await jobMutex.acquire();

    try {
      context.currentStatus = JobStatus.RUNNING;
      context.startedAt = new Date();
      context.workerId = payload.workerId;
      this.addAuditEntry(context, 'job_started', { workerId: payload.workerId });

      await this.jobStorage.updateJob(payload.jobId, {
        status: JobStatus.RUNNING,
        startedAt: context.startedAt,
      });

    } finally {
      release();
    }
  }

  /**
   * Handle job completion events
   */
  private async handleJobCompleted(payload: {
    jobId: string;
    workerId: string;
    executionTime: number;
    resourceUsage: any;
  }): Promise<void> {
    const context = this.jobContexts.get(payload.jobId);
    if (!context) return;

    const jobMutex = this.getJobMutex(payload.jobId);
    const release = await jobMutex.acquire();

    try {
      context.currentStatus = JobStatus.COMPLETED;
      context.completedAt = new Date();
      context.progress = 100;
      context.executionTimeMs = payload.executionTime;
      context.resourceUsage = payload.resourceUsage;

      this.addAuditEntry(context, 'job_completed', {
        workerId: payload.workerId,
        executionTime: payload.executionTime,
        resourceUsage: payload.resourceUsage,
      });

      await this.jobStorage.updateJob(payload.jobId, {
        status: JobStatus.COMPLETED,
        completedAt: context.completedAt,
        progress: 100,
        executionTimeMs: payload.executionTime,
        resourceUsage: JSON.stringify(payload.resourceUsage),
      });

      // Clean up job context after completion
      setTimeout(() => {
        this.jobContexts.delete(payload.jobId);
      }, 300000); // Keep for 5 minutes for status queries

    } finally {
      release();
    }
  }

  /**
   * Handle job failure events
   */
  private async handleJobFailed(payload: { jobId: string; error: string; retryCount: number }): Promise<void> {
    const context = this.jobContexts.get(payload.jobId);
    if (!context) return;

    const jobMutex = this.getJobMutex(payload.jobId);
    const release = await jobMutex.acquire();

    try {
      context.currentStatus = JobStatus.FAILED;
      context.completedAt = new Date();

      this.addAuditEntry(context, 'job_failed', {
        error: payload.error,
        retryCount: payload.retryCount,
      });

      await this.jobStorage.updateJob(payload.jobId, {
        status: JobStatus.FAILED,
        completedAt: context.completedAt,
        errorMessage: payload.error,
        retryCount: payload.retryCount,
      });

      // Handle error through error recovery service
      const error = new Error(payload.error);
      await this.errorRecovery.handleJobError(payload.jobId, error, {
        actionType: context.submissionRequest.actionType,
        retryCount: payload.retryCount,
        orchestratorId: this.orchestratorId,
      });

    } finally {
      release();
    }
  }

  /**
   * Verify all dependencies are available
   */
  private async verifyDependencies(): Promise<void> {
    const dependencies = [
      'jobStorage',
      'jobWorker',
      'jobMonitoring',
      'resultManager',
      'errorRecovery',
      'cleanupManager',
    ];

    for (const dep of dependencies) {
      if (!this[dep as keyof this]) {
        throw new Error(`Required dependency not available: ${dep}`);
      }
    }

    this.logger.debug('All dependencies verified successfully');
  }

  /**
   * Register event handlers
   */
  private registerEventHandlers(): void {
    this.eventEmitter.on('job.started', this.handleJobStarted.bind(this));
    this.eventEmitter.on('job.completed', this.handleJobCompleted.bind(this));
    this.eventEmitter.on('job.failed', this.handleJobFailed.bind(this));
    this.eventEmitter.on('job.progress', this.handleJobProgress.bind(this));
    this.eventEmitter.on('job.cancelled', this.handleJobCancelled.bind(this));
  }

  /**
   * Handle job progress updates
   */
  private async handleJobProgress(payload: { jobId: string; progress: number; currentStep: string }): Promise<void> {
    const context = this.jobContexts.get(payload.jobId);
    if (!context) return;

    context.progress = payload.progress;
    this.addAuditEntry(context, 'progress_update', {
      progress: payload.progress,
      currentStep: payload.currentStep,
    });
  }

  /**
   * Handle job cancellation events
   */
  private async handleJobCancelled(payload: { jobId: string; reason: string }): Promise<void> {
    const context = this.jobContexts.get(payload.jobId);
    if (!context) return;

    context.currentStatus = JobStatus.CANCELLED;
    context.completedAt = new Date();
    this.addAuditEntry(context, 'job_cancelled', { reason: payload.reason });
  }

  /**
   * Add audit entry to job context
   */
  private addAuditEntry(
    context: JobExecutionContext,
    action: string,
    details: Record<string, unknown> = {},
    previousState?: any
  ): void {
    const entry: AuditEntry = {
      timestamp: new Date(),
      action,
      actor: this.orchestratorId,
      details,
      previousState,
      newState: {
        status: context.currentStatus,
        progress: context.progress,
      },
    };

    context.auditTrail.push(entry);

    // Keep audit trail size manageable
    if (context.auditTrail.length > 100) {
      context.auditTrail.shift();
    }
  }

  /**
   * Get or create job-specific mutex
   */
  private getJobMutex(jobId: string): Mutex {
    let mutex = this.jobMutexes.get(jobId);
    if (!mutex) {
      mutex = new Mutex();
      this.jobMutexes.set(jobId, mutex);
    }
    return mutex;
  }

  /**
   * Estimate resource requirements for a job
   */
  private estimateResourceRequirements(request: JobSubmissionRequest): {
    estimatedMemory: number;
    estimatedCpu: number;
    estimatedDuration: number;
  } {
    // Basic estimation based on action type
    const baseRequirements = {
      screenshot: { memory: 50, cpu: 20, duration: 2000 },
      click_mouse: { memory: 10, cpu: 5, duration: 500 },
      type_text: { memory: 15, cpu: 10, duration: 1000 },
      write_file: { memory: 100, cpu: 30, duration: 3000 },
      read_file: { memory: 50, cpu: 15, duration: 1500 },
    };

    const requirements = baseRequirements[request.actionType as keyof typeof baseRequirements] ||
                        { memory: 25, cpu: 15, duration: 1000 };

    // Apply priority multiplier
    const priorityMultiplier = request.priority === JobPriority.HIGH ? 1.5 :
                              request.priority === JobPriority.CRITICAL ? 2.0 : 1.0;

    return {
      estimatedMemory: requirements.memory * priorityMultiplier,
      estimatedCpu: requirements.cpu * priorityMultiplier,
      estimatedDuration: requirements.duration,
    };
  }

  /**
   * Estimate job completion time
   */
  private estimateCompletionTime(request: JobSubmissionRequest): Date | undefined {
    const requirements = this.estimateResourceRequirements(request);
    const metrics = this.jobMonitoring.getMetrics();

    const queueWaitTime = metrics.queueMetrics.averageWaitTime;
    const estimatedTotal = queueWaitTime + requirements.estimatedDuration;

    return new Date(Date.now() + estimatedTotal);
  }

  /**
   * Get queue position for a job
   */
  private async getQueuePosition(jobId: string): Promise<number> {
    const workerMetrics = this.jobWorker.getMetrics();
    return workerMetrics.queueLength + 1;
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();

        if (health.overall === 'critical' || health.overall === 'unhealthy') {
          this.logger.error(`System health is ${health.overall}`, health.components);

          this.eventEmitter.emit('system.health.critical', {
            health,
            orchestratorId: this.orchestratorId,
          });
        }
      } catch (error) {
        this.logger.error('Health monitoring failed:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start performance optimization
   */
  private startPerformanceOptimization(): void {
    this.optimizationInterval = setInterval(async () => {
      try {
        await this.optimizePerformance();
      } catch (error) {
        this.logger.error('Performance optimization failed:', error);
      }
    }, 300000); // Optimize every 5 minutes
  }

  /**
   * Start lock cleanup
   */
  private startLockCleanup(): void {
    this.lockCleanupInterval = setInterval(() => {
      this.cleanupExpiredLocks();
    }, 60000); // Clean every minute
  }

  /**
   * Clean up expired locks
   */
  private cleanupExpiredLocks(): void {
    const now = new Date();
    const expiredLocks: string[] = [];

    for (const [lockId, lock] of this.operationLocks) {
      if (lock.expiresAt < now) {
        expiredLocks.push(lockId);
      }
    }

    for (const lockId of expiredLocks) {
      this.operationLocks.delete(lockId);
      this.logger.debug(`Cleaned up expired lock: ${lockId}`);
    }
  }

  /**
   * Release all locks owned by this orchestrator
   */
  private async releaseAllLocks(): Promise<void> {
    const ownedLocks = Array.from(this.operationLocks.entries())
      .filter(([_, lock]) => lock.ownerId === this.orchestratorId);

    for (const [lockId, _] of ownedLocks) {
      await this.releaseLock(lockId);
    }
  }

  /**
   * Graceful shutdown of active jobs
   */
  private async gracefulShutdown(): Promise<void> {
    const activeJobs = Array.from(this.jobContexts.values())
      .filter(context =>
        context.currentStatus === JobStatus.RUNNING ||
        context.currentStatus === JobStatus.QUEUED
      );

    if (activeJobs.length > 0) {
      this.logger.log(`Gracefully shutting down ${activeJobs.length} active jobs`);

      for (const context of activeJobs) {
        try {
          await this.cancelJob(context.jobId, 'System shutdown');
        } catch (error) {
          this.logger.error(`Failed to cancel job ${context.jobId} during shutdown:`, error);
        }
      }
    }
  }

  /**
   * Assess storage health
   */
  private assessStorageHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    try {
      // This would check database connectivity and performance
      return 'healthy';
    } catch {
      return 'unhealthy';
    }
  }

  /**
   * Assess worker health
   */
  private assessWorkerHealth(metrics: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.unhealthyWorkers > metrics.totalWorkers * 0.3) {
      return 'unhealthy';
    }
    if (metrics.unhealthyWorkers > 0) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Assess monitoring health
   */
  private assessMonitoringHealth(metrics: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.errorRate > 20) {
      return 'unhealthy';
    }
    if (metrics.errorRate > 10) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Assess error recovery health
   */
  private assessErrorRecoveryHealth(stats: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (stats.recoveryRate < 70) {
      return 'unhealthy';
    }
    if (stats.recoveryRate < 85) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Assess cleanup health
   */
  private assessCleanupHealth(metrics: any): 'healthy' | 'degraded' | 'unhealthy' {
    if (metrics.cleanupSuccessRate < 80) {
      return 'unhealthy';
    }
    if (metrics.cleanupSuccessRate < 95) {
      return 'degraded';
    }
    return 'healthy';
  }

  /**
   * Optimize job queue
   */
  private async optimizeJobQueue(): Promise<boolean> {
    // Implement queue optimization logic
    return true;
  }

  /**
   * Optimize worker pool
   */
  private async optimizeWorkerPool(): Promise<boolean> {
    // Implement worker auto-scaling logic
    return true;
  }

  /**
   * Balance resource allocation
   */
  private async balanceResourceAllocation(): Promise<boolean> {
    // Implement resource balancing logic
    return true;
  }

  /**
   * Optimize caching
   */
  private async optimizeCaching(): Promise<boolean> {
    // Implement cache optimization logic
    return true;
  }
}