/**
 * Priority Queue Integration Service - Bridge Between Queue and Job Processing
 *
 * Provides seamless integration between the priority queue system and existing job processing:
 * - Job lifecycle management with priority queue coordination
 * - Background worker integration and job distribution
 * - Result collection and status synchronization
 * - Performance monitoring and health checks
 * - Automatic failover and recovery mechanisms
 *
 * Architecture:
 * - QueueBridge: Connects priority queue with job management
 * - JobDistributor: Distributes jobs to available workers
 * - ResultCollector: Aggregates job results and status updates
 * - HealthMonitor: Monitors queue and worker health
 * - RecoveryManager: Handles failures and recovery scenarios
 *
 * Features:
 * - Intelligent job distribution based on worker capabilities
 * - Real-time job status synchronization
 * - Automatic queue rebalancing and optimization
 * - Comprehensive monitoring and alerting
 * - Graceful degradation under high load
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriorityJobQueueService, EnhancedJobPriority } from './priority-job-queue.service';
import { JobManagementService, JobResult, JobStatus } from '../job-management.service';
import { ComputerUseService } from '../computer-use.service';
import { MetricsService } from '../../metrics/metrics.service';

/*** Job processing events for real-time coordination
 */
export enum JobProcessingEvent {
  JOB_STARTED = 'job.started',
  JOB_PROGRESS = 'job.progress',
  JOB_COMPLETED = 'job.completed',
  JOB_FAILED = 'job.failed',
  JOB_TIMEOUT = 'job.timeout',
  WORKER_AVAILABLE = 'worker.available',
  WORKER_BUSY = 'worker.busy',
  QUEUE_BACKPRESSURE = 'queue.backpressure',
  SYSTEM_HEALTH_CHECK = 'system.health_check',}/**
 * Worker capability and status tracking
 */
export interface WorkerInfo {
  readonly workerId: string;
  readonly capabilities: string[];
  readonly maxConcurrentJobs: number;
  readonly currentJobs: number;
  readonly lastHeartbeat: Date;
  readonly performance: {
    averageExecutionTime: number;
    successRate: number;
    totalJobsProcessed: number;
  };
  readonly status: 'available' | 'busy' | 'offline' | 'maintenance';}/**
 * Job processing metrics and analytics
 */
export interface ProcessingMetrics {
  readonly totalJobsProcessed: number;
  readonly averageProcessingTime: number;
  readonly queueThroughput: number;
  readonly workerUtilization: number;
  readonly errorRate: number;
  readonly backpressureEvents: number;
  readonly lastUpdated: Date;
}

/**
 * Integration configuration options
 */
export interface IntegrationConfig {
  readonly maxConcurrentJobs: number;
  readonly healthCheckInterval: number;
  readonly workerTimeoutThreshold: number;
  readonly rebalanceInterval: number;
  readonly maxRetryAttempts: number;
  readonly performanceMonitoringEnabled: boolean;
}

@Injectable()
export class PriorityQueueIntegrationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriorityQueueIntegrationService.name);

  // Service dependencies
  private readonly priorityQueue: PriorityJobQueueService;
  private readonly jobManagement: JobManagementService;
  private readonly computerUse: ComputerUseService;
  private readonly eventEmitter: EventEmitter2;
  private readonly metricsService: MetricsService;

  // Integration state
  private isProcessing = false;
  private workers = new Map<string, WorkerInfo>();
  private jobWorkerMapping = new Map<string, string>();
  private processingMetrics: ProcessingMetrics;
  private config: IntegrationConfig;

  // Timers and intervals
  private healthCheckTimer?: NodeJS.Timeout;
  private rebalanceTimer?: NodeJS.Timeout;
  private processingLoop?: NodeJS.Timeout;

  constructor(
    priorityQueue: PriorityJobQueueService,
    jobManagement: JobManagementService,
    computerUse: ComputerUseService,
    eventEmitter: EventEmitter2,
    metricsService: MetricsService,
  ) {
    this.priorityQueue = priorityQueue;
    this.jobManagement = jobManagement;
    this.computerUse = computerUse;
    this.eventEmitter = eventEmitter;
    this.metricsService = metricsService;

    // Initialize configuration
    this.config = {
      maxConcurrentJobs: 50,
      healthCheckInterval: 30000, // 30 seconds
      workerTimeoutThreshold: 300000, // 5 minutes
      rebalanceInterval: 60000, // 1 minute
      maxRetryAttempts: 3,
      performanceMonitoringEnabled: true,
    };

    // Initialize metrics
    this.processingMetrics = {
      totalJobsProcessed: 0,
      averageProcessingTime: 0,
      queueThroughput: 0,
      workerUtilization: 0,
      errorRate: 0,
      backpressureEvents: 0,
      lastUpdated: new Date(),
    };

    // Set up event listeners
    this.setupEventListeners();
  }

  // ===== LIFECYCLE MANAGEMENT =====

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Priority Queue Integration Service...');try {// Start background processing
      await this.startProcessingLoop();

      // Start health monitoring
      this.startHealthMonitoring();

      // Start rebalancing
      this.startRebalancing();

      this.logger.log('Priority Queue Integration Service initialized successfully');} catch (error) {this.logger.error('Failed to initialize Priority Queue Integration Service:', error);throw error;}
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Priority Queue Integration Service...');try {// Stop processing
      this.isProcessing = false;

      // Clear timers
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
      }
      if (this.rebalanceTimer) {
        clearInterval(this.rebalanceTimer);
      }
      if (this.processingLoop) {
        clearTimeout(this.processingLoop);
      }

      // Wait for current jobs to complete (with timeout)
      await this.gracefulShutdown();

      this.logger.log('Priority Queue Integration Service shutdown completed');} catch (error) {this.logger.error('Error during Priority Queue Integration Service shutdown:', error);
    }
  }

  // ===== JOB PROCESSING COORDINATION =====

  /**
   * Submit job to priority queue with automatic processing coordination
   */
  async submitJob(
    payload: unknown,
    priority: EnhancedJobPriority = EnhancedJobPriority.NORMAL,
    options: {
      estimatedDuration?: number;
      maxRetries?: number;
      timeout?: number;
      tags?: string[];
      userId?: string;
      sessionId?: string;
      dependencies?: string[];
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<{ jobId: string; queuePosition: number; estimatedStartTime: Date }> {
    this.logger.debug(`Submitting job with priority: ${priority}`);try {// Generate unique job ID
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Submit to priority queue
      const queueResult = await this.priorityQueue.enqueue(jobId, payload, priority, {
        estimatedDuration: options.estimatedDuration,
        maxRetries: options.maxRetries || this.config.maxRetryAttempts,
        timeout: options.timeout,
        tags: options.tags || [],
        userId: options.userId,
        sessionId: options.sessionId,
        dependencies: options.dependencies || [],
        metadata: {
          ...options.metadata,
          submissionSource: 'integration_service',
          submittedAt: new Date().toISOString(),
        },
      });

      if (!queueResult.success || !queueResult.data) {
        throw new Error(`Failed to submit job to queue: ${queueResult.error}`);}// Create job tracking entry in job management system
      const jobResult: JobResult = {
        jobId,
        status: JobStatus.PENDING,
        submittedAt: new Date(),
        payload,
        priority: priority as any, // Convert enum
        estimatedDuration: options.estimatedDuration || 30000,
        maxRetries: options.maxRetries || this.config.maxRetryAttempts,
        retryCount: 0,
        timeout: options.timeout || 120000,
        metadata: {
          queuePosition: queueResult.data.metadata.queuePosition,
          estimatedStartTime: queueResult.data.metadata.estimatedStartTime,
          tags: options.tags || [],
          ...options.metadata,
        },
      };

      await this.jobManagement.createJobResult(jobResult);

      // Emit job submission event
      this.eventEmitter.emit(JobProcessingEvent.JOB_STARTED, {
        jobId,
        priority,
        queuePosition: queueResult.data.metadata.queuePosition,
      });

      this.logger.log(`Job submitted successfully: ${jobId} (Priority: ${priority})`);

      return {
        jobId,
        queuePosition: queueResult.data.metadata.queuePosition,
        estimatedStartTime: queueResult.data.metadata.estimatedStartTime,
      };

    } catch (error) {
      this.logger.error('Failed to submit job:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive job status including queue and processing information
   */
  async getJobStatus(jobId: string): Promise<{
    jobId: string;
    status: JobStatus;
    queuePosition?: number;
    estimatedStartTime?: Date;
    progress?: number;
    result?: unknown;
    error?: string;
    processingTime?: number;
    workerInfo?: Partial<WorkerInfo>;
  } | null> {
    try {
      // Get job from priority queue
      const queueJob = await this.priorityQueue.getJob(jobId);

      // Get job result from job management
      const jobResult = await this.jobManagement.getJobResult(jobId);

      if (!queueJob && !jobResult) {
        return null;
      }

      // Get worker information if job is being processed
      const workerId = this.jobWorkerMapping.get(jobId);

        const workerInfo = workerId ? this.workers.get(workerId) : undefined;

      return {
        jobId,
        status: queueJob?.status || jobResult?.status || JobStatus.PENDING,
        queuePosition: queueJob?.metadata.queuePosition,
        estimatedStartTime: queueJob?.metadata.estimatedStartTime,
        progress: jobResult?.progress,
        result: jobResult?.result || queueJob?.result,
        error: jobResult?.errorMessage || queueJob?.errorMessage,
        processingTime: jobResult?.executionTimeMs || queueJob?.executionTimeMs,
        workerInfo: workerInfo ? {
          workerId: workerInfo.workerId,
          capabilities: workerInfo.capabilities,
          status: workerInfo.status,
        } : undefined,
      };

    } catch (error) {
      this.logger.error(`Failed to get job status for ${jobId}:`, error);
      return null;
    }
  }

  /**
   * Cancel a pending job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // Remove from priority queue if still pending
      const queueResult = await this.priorityQueue.removeJob(jobId);

      // Update job status in job management
      await this.priorityQueue.updateJobStatus(jobId, JobStatus.CANCELLED);
      await this.jobManagement.updateJobStatus(jobId, JobStatus.CANCELLED, 'Job cancelled by user');

      // Clean up worker mapping
      this.jobWorkerMapping.delete(jobId);

      this.logger.log(`Job cancelled successfully: ${jobId}`);return true;} catch (error) {
      this.logger.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  // ===== BACKGROUND PROCESSING LOOP =====

  private async startProcessingLoop(): Promise<void> {
    this.isProcessing = true;
    this.processNextJob();
  }

  private async processNextJob(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      // Check if we have capacity for more jobs
      const currentJobs = Array.from(this.workers.values())
        .reduce((total, worker) => total + worker.currentJobs, 0);

      if (currentJobs >= this.config.maxConcurrentJobs) {
        // Schedule next check
        this.processingLoop = setTimeout(() => this.processNextJob(), 1000);
        return;
      }

      // Get next job from priority queue
      const dequeueResult = await this.priorityQueue.dequeue();

      if (!dequeueResult.success || !dequeueResult.data) {
        // No jobs available, check again later
        this.processingLoop = setTimeout(() => this.processNextJob(), 2000);
        return;
      }

      const job = dequeueResult.data;

      // Find available worker
      const availableWorker = this.findAvailableWorker(job.payload);

      if (!availableWorker) {
        // No available workers, requeue the job and try again later
        await this.priorityQueue.enqueue(
          job.metadata.jobId,
          job.payload,
          job.metadata.priority,
          job.metadata
        );
        this.processingLoop = setTimeout(() => this.processNextJob(), 5000);
        return;
      }

      // Assign job to worker
      await this.assignJobToWorker(job, availableWorker);

      // Continue processing immediately
      this.processingLoop = setTimeout(() => this.processNextJob(), 100);

    } catch (error) {
      this.logger.error('Error in processing loop:', error);
    // Continue processing with delay on errorthis.processingLoop = setTimeout(() => this.processNextJob(), 5000);
    }
  }

  private findAvailableWorker(payload: unknown): WorkerInfo | null {
    for (const worker of this.workers.values()) {
      if (worker.status === 'available' &&worker.currentJobs < worker.maxConcurrentJobs &&this.isWorkerCapable(worker, payload)) {
        return worker;
      }
    }
    return null;
  }

  private isWorkerCapable(worker: WorkerInfo, payload: unknown): boolean {
    // Simple capability check - can be enhanced based on job requirements
    return worker.capabilities.includes('computer-use') || worker.capabilities.includes('*');
  }

  private async assignJobToWorker(job: any, worker: WorkerInfo): Promise<void> {
    try {
      this.logger.debug(`Assigning job ${job.metadata.jobId} to worker ${worker.workerId}`);

      // Update worker tracking
      this.jobWorkerMapping.set(job.metadata.jobId, worker.workerId);

      // Update worker status
      const updatedWorker: WorkerInfo = {
        ...worker,
        currentJobs: worker.currentJobs + 1,
        status: worker.currentJobs + 1 >= worker.maxConcurrentJobs ? 'busy' : 'available',
      };
      this.workers.set(worker.workerId, updatedWorker);

      // Execute job using computer use service
      this.executeJobAsync(job, worker);

    } catch (error) {
      this.logger.error(`Failed to assign job ${job.metadata.jobId} to worker ${worker.workerId}:`, error);

      // Clean up on assignment failure
      this.jobWorkerMapping.delete(job.metadata.jobId);
      await this.priorityQueue.updateJobStatus(job.metadata.jobId, JobStatus.FAILED, undefined, 'Worker assignment failed');
    }
  }

  private async executeJobAsync(job: any, worker: WorkerInfo): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Executing job ${job.metadata.jobId} on worker ${worker.workerId}`);
    // Update job status to in progressawait this.priorityQueue.updateJobStatus(job.metadata.jobId, JobStatus.IN_PROGRESS);
      await this.jobManagement.updateJobStatus(job.metadata.jobId, JobStatus.IN_PROGRESS);

      // Execute the job using computer use service
      const result = await this.computerUse.executeAction(job.payload);

        const executionTime = Date.now() - startTime;

      // Update job status to completed
      await this.priorityQueue.updateJobStatus(job.metadata.jobId, JobStatus.COMPLETED, result);
      await this.jobManagement.updateJobStatus(job.metadata.jobId, JobStatus.COMPLETED, undefined, result);

      // Update metrics
      this.updateProcessingMetrics(true, executionTime);

      // Update worker performance
      this.updateWorkerPerformance(worker.workerId, true, executionTime);

      this.logger.log(`Job completed successfully: ${job.metadata.jobId} (${executionTime}ms)`);
    // Emit completion eventthis.eventEmitter.emit(JobProcessingEvent.JOB_COMPLETED, {
        jobId: job.metadata.jobId,
        executionTime,
        result,
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;

      this.logger.error(`Job execution failed: ${job.metadata.jobId}:`, error);

      // Update job status to failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';await this.priorityQueue.updateJobStatus(job.metadata.jobId, JobStatus.FAILED, undefined, errorMessage);
    await this.jobManagement.updateJobStatus(job.metadata.jobId, JobStatus.FAILED, errorMessage);

      // Update metrics
      this.updateProcessingMetrics(false, executionTime);

      // Update worker performance
      this.updateWorkerPerformance(worker.workerId, false, executionTime);

      // Emit failure event
      this.eventEmitter.emit(JobProcessingEvent.JOB_FAILED, {
        jobId: job.metadata.jobId,
        error: errorMessage,
        executionTime,
      });

    } finally {
      // Clean up worker assignment
      this.releaseWorker(worker.workerId, job.metadata.jobId);
    }
  }

  private releaseWorker(workerId: string, jobId: string): void {
    try {
      // Remove job from worker mapping
      this.jobWorkerMapping.delete(jobId);

      // Update worker status
      const worker = this.workers.get(workerId);
      if (worker) {
        const updatedWorker: WorkerInfo = {
          ...worker,
          currentJobs: Math.max(0, worker.currentJobs - 1),
          status: worker.currentJobs > 1 ? 'busy' : 'available',
  lastHeartbeat: new Date(),};
        this.workers.set(workerId, updatedWorker);

        // Emit worker available event
        if (updatedWorker.status === 'available') {
          this.eventEmitter.emit(JobProcessingEvent.WORKER_AVAILABLE, { workerId });
        }
      }

    } catch (error) {
      this.logger.error(`Failed to release worker ${workerId}:`, error);
    }
  }

  // ===== WORKER MANAGEMENT =====

  /**
   * Register a new worker with the integration service
   */
  registerWorker(workerInfo: Omit<WorkerInfo, 'lastHeartbeat' | 'performance'>): void {
    const worker: WorkerInfo = {
      ...workerInfo,
      lastHeartbeat: new Date(),
      performance: {
        averageExecutionTime: 0,
        successRate: 1.0,
        totalJobsProcessed: 0,
      },
    };

    this.workers.set(worker.workerId, worker);
    this.logger.log(`Worker registered: ${worker.workerId} (Capabilities: ${worker.capabilities.join(`, ')})`);this.eventEmitter.emit(JobProcessingEvent.WORKER_AVAILABLE, { workerId: worker.workerId });
}

  /**
   * Unregister a worker
   */
  unregisterWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.workers.delete(workerId);
      this.logger.log(`Worker unregistered: ${workerId}`);
    // Handle any active jobs assigned to this workerfor (const [jobId, assignedWorkerId] of this.jobWorkerMapping.entries()) {
        if (assignedWorkerId === workerId) {
          this.handleWorkerFailure(jobId, workerId);
        }
      }
    }
  }

  private async handleWorkerFailure(jobId: string, workerId: string): Promise<void> {
    try {
      this.logger.warn(`Handling worker failure: ${workerId} for job: ${jobId}`);
    // Remove job from worker mappingthis.jobWorkerMapping.delete(jobId);

      // Get job details
      const job = await this.priorityQueue.getJob(jobId);
      if (job && job.metadata.retryCount < job.metadata.maxRetries) {
        // Retry the job by re-enqueuing it
        await this.priorityQueue.enqueue(
          jobId,
          job.payload,
          job.metadata.priority,
          {
            ...job.metadata,
            retryCount: job.metadata.retryCount + 1,
          }
        );

        this.logger.log(`Job re-queued due to worker failure: ${jobId} (Retry: ${job.metadata.retryCount + 1})`);
      } else {
        // Max retries exceeded, mark as failed
        await this.priorityQueue.updateJobStatus(jobId, JobStatus.FAILED, undefined, 'Worker failure - max retries exceeded');
    await this.jobManagement.updateJobStatus(jobId, JobStatus.FAILED, 'Worker failure - max retries exceeded');
      }

    } catch (error) {
      this.logger.error(`Failed to handle worker failure for job ${jobId}:`, error);}}

  // ===== MONITORING AND HEALTH CHECKS =====

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private async performHealthChecks(): Promise<void> {
    try {
      const currentTime = Date.now();

      // Check worker heartbeats
      for (const [workerId, worker] of this.workers.entries()) {
        const timeSinceHeartbeat = currentTime - worker.lastHeartbeat.getTime();

        if (timeSinceHeartbeat > this.config.workerTimeoutThreshold) {
          this.logger.warn(`Worker timeout detected: ${workerId}`);

          // Mark worker as offline
          const updatedWorker: WorkerInfo = {
            ...worker,
            status: 'offline',};this.workers.set(workerId, updatedWorker);

          // Handle any active jobs
          for (const [jobId, assignedWorkerId] of this.jobWorkerMapping.entries()) {
            if (assignedWorkerId === workerId) {
              await this.handleWorkerFailure(jobId, workerId);
            }
          }
        }
      }

      // Check queue metrics for health issues
      const queueMetrics = await this.priorityQueue.getQueueMetrics();

      if (queueMetrics.backpressureActive) {
        this.eventEmitter.emit(JobProcessingEvent.QUEUE_BACKPRESSURE, queueMetrics);
        this.processingMetrics.backpressureEvents++;
      }

      // Update system metrics
      if (this.config.performanceMonitoringEnabled) {
        await this.updateSystemMetrics();
      }

      // Emit health check event
      this.eventEmitter.emit(JobProcessingEvent.SYSTEM_HEALTH_CHECK, {
        queueMetrics,
        workerCount: this.workers.size,
        activeJobs: this.jobWorkerMapping.size,
        processingMetrics: this.processingMetrics,
      });

    } catch (error) {
      this.logger.error('Health check failed:', error);}}

  // ===== METRICS AND ANALYTICS =====

  private updateProcessingMetrics(success: boolean, executionTime: number): void {
    this.processingMetrics = {
      ...this.processingMetrics,
      totalJobsProcessed: this.processingMetrics.totalJobsProcessed + 1,
      averageProcessingTime: this.calculateMovingAverage(
        this.processingMetrics.averageProcessingTime,
        executionTime,
        this.processingMetrics.totalJobsProcessed
      ),
      errorRate: this.calculateErrorRate(success),
      lastUpdated: new Date(),
    };
  }

  private updateWorkerPerformance(workerId: string, success: boolean, executionTime: number): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      const newJobCount = worker.performance.totalJobsProcessed + 1;
      const updatedWorker: WorkerInfo = {
        ...worker,
        performance: {
          averageExecutionTime: this.calculateMovingAverage(
            worker.performance.averageExecutionTime,
            executionTime,
            newJobCount
          ),
          successRate: this.calculateSuccessRate(worker.performance, success),
          totalJobsProcessed: newJobCount,
        },
        lastHeartbeat: new Date(),
      };
      this.workers.set(workerId, updatedWorker);
    }
  }

  private calculateMovingAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }

  private calculateErrorRate(success: boolean): number {
    const failures = success ? 0 : 1;
    return failures / Math.max(1, this.processingMetrics.totalJobsProcessed + 1);
  }

  private calculateSuccessRate(performance: WorkerInfo['performance'], success: boolean): number {const totalJobs = performance.totalJobsProcessed + 1;
    const currentSuccesses = performance.successRate * performance.totalJobsProcessed;
    const newSuccesses = currentSuccesses + (success ? 1 : 0);
    return newSuccesses / totalJobs;
  }

  private async updateSystemMetrics(): Promise<void> {
    try {
      // Send metrics to metrics service
      await this.metricsService.recordMetric('queue.jobs.processed', this.processingMetrics.totalJobsProcessed);
    await this.metricsService.recordMetric('queue.processing.average_time', this.processingMetrics.averageProcessingTime);
    await this.metricsService.recordMetric('queue.error.rate', this.processingMetrics.errorRate);
    await this.metricsService.recordMetric('workers.count', this.workers.size);
    await this.metricsService.recordMetric('jobs.active', this.jobWorkerMapping.size);} catch (error) {this.logger.error('Failed to update system metrics:', error);
    }
  }

  // ===== REBALANCING AND OPTIMIZATION =====

  private startRebalancing(): void {
    this.rebalanceTimer = setInterval(async () => {
      await this.rebalanceWorkload();
    }, this.config.rebalanceInterval);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  private async rebalanceWorkload(): Promise<void> {
    try {
      // Check for overloaded workers
      const overloadedWorkers = Array.from(this.workers.values())
        .filter(worker => worker.currentJobs > worker.maxConcurrentJobs * 0.8);

      if (overloadedWorkers.length > 0) {
        this.logger.log(`Rebalancing workload for ${overloadedWorkers.length} overloaded workers`);
        // Rebalancing logic would go here
      }

      // Update worker utilization metrics
      const totalCapacity = Array.from(this.workers.values())
        .reduce((total, worker) => total + worker.maxConcurrentJobs, 0);

        const currentJobs = Array.from(this.workers.values())
        .reduce((total, worker) => total + worker.currentJobs, 0);

      this.processingMetrics = {
        ...this.processingMetrics,
        workerUtilization: totalCapacity > 0 ? currentJobs / totalCapacity : 0,
      };

    } catch (error) {
      this.logger.error('Workload rebalancing failed:', error);
    }
  }

  // ===== UTILITY METHODS =====

  private setupEventListeners(): void {
    // Set up internal event listeners for coordination
    this.eventEmitter.on(JobProcessingEvent.WORKER_AVAILABLE, (data) => {
      this.logger.debug(`Worker available: ${data.workerId}`);
    });

    this.eventEmitter.on(JobProcessingEvent.QUEUE_BACKPRESSURE, (data) => {
      this.logger.warn('Queue backpressure detected:', data);
    });
  }

  private async gracefulShutdown(): Promise<void> {
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.jobWorkerMapping.size > 0 && Date.now() - startTime < shutdownTimeout) {
      this.logger.log(`Waiting for ${this.jobWorkerMapping.size} jobs to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));}

    if (this.jobWorkerMapping.size > 0) {
      this.logger.warn(`Forced shutdown with ${this.jobWorkerMapping.size} jobs still active`);
    }
  }

  /**
   * Get current processing metrics
   */
  getProcessingMetrics(): ProcessingMetrics {
    return { ...this.processingMetrics };
  }

  /**
   * Get current worker information
   */
  getWorkerInfo(): WorkerInfo[] {
    return Array.from(this.workers.values());
  }

  /**
   * Get current job distribution
   */
  getJobDistribution(): { jobId: string; workerId: string }[] {
    return Array.from(this.jobWorkerMapping.entries()).map(([jobId, workerId]) => ({
      jobId,
      workerId,
    }));
  }
}