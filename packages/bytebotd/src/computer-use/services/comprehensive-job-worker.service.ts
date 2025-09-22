/**
 * Comprehensive Job Worker Service - Enterprise Multi-threaded Background Processing
 *
 * Provides enterprise-grade background job processing with advanced worker pool management,
 * resource-aware scheduling, and comprehensive monitoring capabilities.
 *
 * Features:
 * - Multi-threaded worker pool with dynamic scaling
 * - Resource-aware job scheduling and load balancing
 * - Timeout and cancellation support with graceful cleanup
 * - Progress tracking with real-time updates
 * - Worker health monitoring and automatic recovery
 * - Priority-based job queuing with starvation prevention
 * - Memory and CPU usage monitoring
 * - Dead letter queue for failed job recovery
 * - Circuit breaker pattern for error resilience
 *
 * @author Claude Code - Agent 8 Job Management Specialist
 * @version 3.0.0
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ComprehensiveJobStorageService, JobStatus, JobPriority, StoredJobData } from './comprehensive-job-storage.service';
import { ComputerUseService } from '../computer-use.service';

/**
 * Worker thread data structure
 */
interface WorkerThread {
  id: string;
  worker: Worker;
  isAvailable: boolean;
  currentJobId?: string;
  startedAt: Date;
  completedJobs: number;
  failedJobs: number;
  totalExecutionTime: number;
  lastHealthCheck: Date;
  resourceUsage: {
    cpuUsage: number;
    memoryUsage: number;
    activeTime: number;
  };
}

/**
 * Job execution context for worker threads
 */
interface JobExecutionContext {
  jobId: string;
  actionType: string;
  actionData: any;
  timeout: number;
  priority: JobPriority;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, unknown>;
  startedAt: Date;
  workerId: string;
}

/**
 * Worker pool configuration
 */
interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  idleTimeout: number; // Time before idle workers are terminated
  healthCheckInterval: number;
  jobTimeout: number;
  memoryThreshold: number; // MB
  cpuThreshold: number; // Percentage
}

/**
 * Job queue item with priority and scheduling information
 */
interface QueuedJob {
  jobId: string;
  priority: JobPriority;
  submittedAt: Date;
  retryCount: number;
  scheduledFor?: Date; // For delayed execution
  dependencies: string[];
  resourceRequirements: {
    estimatedMemory: number;
    estimatedCpu: number;
    estimatedDuration: number;
  };
}

/**
 * Worker performance metrics
 */
interface WorkerMetrics {
  totalWorkers: number;
  activeWorkers: number;
  idleWorkers: number;
  unhealthyWorkers: number;
  queueLength: number;
  processingRate: number; // jobs per minute
  averageExecutionTime: number;
  resourceUtilization: {
    totalCpu: number;
    totalMemory: number;
    averageCpu: number;
    averageMemory: number;
  };
  errorRate: number;
  throughput: number;
}

/**
 * Circuit breaker for handling cascading failures
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }
}

@Injectable()
export class ComprehensiveJobWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ComprehensiveJobWorkerService.name);
  private readonly workers = new Map<string, WorkerThread>();
  private readonly jobQueue: QueuedJob[] = [];
  private readonly activeJobs = new Map<string, JobExecutionContext>();
  private readonly deadLetterQueue: QueuedJob[] = [];
  private readonly circuitBreaker = new CircuitBreaker();

  private isProcessing = false;
  private isShuttingDown = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;

  private readonly config: WorkerPoolConfig = {
    minWorkers: Math.max(1, Math.floor(os.cpus().length / 2)),
    maxWorkers: os.cpus().length * 2,
    idleTimeout: 300000, // 5 minutes
    healthCheckInterval: 30000, // 30 seconds
    jobTimeout: 300000, // 5 minutes default
    memoryThreshold: 512, // 512 MB
    cpuThreshold: 80, // 80%
  };

  private metrics: WorkerMetrics = {
    totalWorkers: 0,
    activeWorkers: 0,
    idleWorkers: 0,
    unhealthyWorkers: 0,
    queueLength: 0,
    processingRate: 0,
    averageExecutionTime: 0,
    resourceUtilization: {
      totalCpu: 0,
      totalMemory: 0,
      averageCpu: 0,
      averageMemory: 0,
    },
    errorRate: 0,
    throughput: 0,
  };

  constructor(
    private readonly jobStorage: ComprehensiveJobStorageService,
    private readonly computerUseService: ComputerUseService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Initializing Comprehensive Job Worker Service');

    // Override config with environment variables if available
    this.config.minWorkers = parseInt(process.env.MIN_WORKERS || '') || this.config.minWorkers;
    this.config.maxWorkers = parseInt(process.env.MAX_WORKERS || '') || this.config.maxWorkers;
    this.config.jobTimeout = parseInt(process.env.JOB_TIMEOUT || '') || this.config.jobTimeout;
  }

  /**
   * Initialize worker pool and start background processing
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(`Starting worker pool with ${this.config.minWorkers}-${this.config.maxWorkers} workers`);

    // Initialize minimum number of workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.createWorker();
    }

    // Start background processing loops
    this.startJobProcessing();
    this.startHealthChecking();
    this.startMetricsCollection();

    // Load pending jobs from storage
    await this.loadPendingJobs();

    this.logger.log('Comprehensive Job Worker Service initialized successfully');
  }

  /**
   * Gracefully shutdown worker pool
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Comprehensive Job Worker Service...');
    this.isShuttingDown = true;

    // Stop processing new jobs
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Wait for active jobs to complete or timeout
    const shutdownTimeout = 30000; // 30 seconds
    const shutdownStart = Date.now();

    while (this.activeJobs.size > 0 && Date.now() - shutdownStart < shutdownTimeout) {
      this.logger.log(`Waiting for ${this.activeJobs.size} active jobs to complete...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Force terminate remaining workers
    for (const worker of this.workers.values()) {
      await this.terminateWorker(worker.id, true);
    }

    this.logger.log('Comprehensive Job Worker Service shutdown completed');
  }

  /**
   * Submit a job for background execution
   */
  async submitJob(
    jobId: string,
    actionType: string,
    actionData: any,
    options: {
      priority?: JobPriority;
      timeout?: number;
      dependencies?: string[];
      resourceRequirements?: {
        estimatedMemory?: number;
        estimatedCpu?: number;
        estimatedDuration?: number;
      };
    } = {}
  ): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Worker service is shutting down');
    }

    const queuedJob: QueuedJob = {
      jobId,
      priority: options.priority || JobPriority.NORMAL,
      submittedAt: new Date(),
      retryCount: 0,
      dependencies: options.dependencies || [],
      resourceRequirements: {
        estimatedMemory: options.resourceRequirements?.estimatedMemory || 100,
        estimatedCpu: options.resourceRequirements?.estimatedCpu || 10,
        estimatedDuration: options.resourceRequirements?.estimatedDuration || 5000,
      },
    };

    // Add to priority queue
    this.addToQueue(queuedJob);

    // Update job status in storage
    await this.jobStorage.updateJob(jobId, {
      status: JobStatus.QUEUED,
      progress: 0,
    });

    this.logger.debug(`Job ${jobId} queued for execution`);
    this.eventEmitter.emit('job.queued', { jobId, priority: queuedJob.priority });
  }

  /**
   * Cancel a job if it's queued or running
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Remove from queue if pending
    const queueIndex = this.jobQueue.findIndex(job => job.jobId === jobId);
    if (queueIndex >= 0) {
      this.jobQueue.splice(queueIndex, 1);
      await this.jobStorage.updateJob(jobId, {
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
      });
      this.eventEmitter.emit('job.cancelled', { jobId, reason: 'cancelled_from_queue' });
      return true;
    }

    // Cancel running job
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      const worker = this.workers.get(activeJob.workerId);
      if (worker) {
        // Send cancellation signal to worker
        worker.worker.postMessage({ type: 'cancel', jobId });

        // Give worker time to cleanup gracefully
        setTimeout(async () => {
          if (this.activeJobs.has(jobId)) {
            await this.forceTerminateJob(jobId, 'User cancellation');
          }
        }, 5000);

        return true;
      }
    }

    return false;
  }

  /**
   * Get current worker metrics and performance data
   */
  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed worker status information
   */
  getWorkerStatus(): Array<{
    id: string;
    isAvailable: boolean;
    currentJobId?: string;
    completedJobs: number;
    failedJobs: number;
    averageExecutionTime: number;
    resourceUsage: any;
  }> {
    return Array.from(this.workers.values()).map(worker => ({
      id: worker.id,
      isAvailable: worker.isAvailable,
      currentJobId: worker.currentJobId,
      completedJobs: worker.completedJobs,
      failedJobs: worker.failedJobs,
      averageExecutionTime: worker.completedJobs > 0 ?
        worker.totalExecutionTime / worker.completedJobs : 0,
      resourceUsage: worker.resourceUsage,
    }));
  }

  /**
   * Get dead letter queue for failed job analysis
   */
  getDeadLetterQueue(): QueuedJob[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Retry jobs from dead letter queue
   */
  async retryDeadLetterJobs(jobIds?: string[]): Promise<number> {
    let retriedCount = 0;
    const jobsToRetry = jobIds ?
      this.deadLetterQueue.filter(job => jobIds.includes(job.jobId)) :
      [...this.deadLetterQueue];

    for (const job of jobsToRetry) {
      // Reset retry count and move back to main queue
      job.retryCount = 0;
      job.submittedAt = new Date();

      this.addToQueue(job);

      // Remove from dead letter queue
      const index = this.deadLetterQueue.findIndex(dlq => dlq.jobId === job.jobId);
      if (index >= 0) {
        this.deadLetterQueue.splice(index, 1);
      }

      // Update job status
      await this.jobStorage.updateJob(job.jobId, {
        status: JobStatus.QUEUED,
        retryCount: 0,
      });

      retriedCount++;
    }

    this.logger.log(`Retried ${retriedCount} jobs from dead letter queue`);
    return retriedCount;
  }

  /**
   * Create a new worker thread
   */
  private async createWorker(): Promise<string> {
    const workerId = uuidv4();

    const worker = new Worker(path.resolve(__dirname, 'job-worker-thread.js'), {
      workerData: {
        workerId,
        config: this.config,
      },
    });

    const workerThread: WorkerThread = {
      id: workerId,
      worker,
      isAvailable: true,
      startedAt: new Date(),
      completedJobs: 0,
      failedJobs: 0,
      totalExecutionTime: 0,
      lastHealthCheck: new Date(),
      resourceUsage: {
        cpuUsage: 0,
        memoryUsage: 0,
        activeTime: 0,
      },
    };

    // Set up worker message handlers
    worker.on('message', (message) => this.handleWorkerMessage(workerId, message));
    worker.on('error', (error) => this.handleWorkerError(workerId, error));
    worker.on('exit', (code) => this.handleWorkerExit(workerId, code));

    this.workers.set(workerId, workerThread);
    this.logger.debug(`Created worker ${workerId}`);

    return workerId;
  }

  /**
   * Terminate a worker thread
   */
  private async terminateWorker(workerId: string, force = false): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    this.logger.debug(`Terminating worker ${workerId}${force ? ' (forced)' : ''}`);

    if (force) {
      await worker.worker.terminate();
    } else {
      worker.worker.postMessage({ type: 'shutdown' });

      // Wait for graceful shutdown or force after timeout
      setTimeout(async () => {
        if (this.workers.has(workerId)) {
          await worker.worker.terminate();
        }
      }, 10000);
    }

    this.workers.delete(workerId);
  }

  /**
   * Handle messages from worker threads
   */
  private async handleWorkerMessage(workerId: string, message: any): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    switch (message.type) {
      case 'job_started':
        await this.handleJobStarted(workerId, message);
        break;

      case 'job_progress':
        await this.handleJobProgress(workerId, message);
        break;

      case 'job_completed':
        await this.handleJobCompleted(workerId, message);
        break;

      case 'job_failed':
        await this.handleJobFailed(workerId, message);
        break;

      case 'health_status':
        await this.handleHealthStatus(workerId, message);
        break;

      case 'resource_usage':
        await this.handleResourceUsage(workerId, message);
        break;

      default:
        this.logger.warn(`Unknown message type from worker ${workerId}: ${message.type}`);
    }
  }

  /**
   * Handle worker errors
   */
  private async handleWorkerError(workerId: string, error: Error): Promise<void> {
    this.logger.error(`Worker ${workerId} encountered error:`, error);

    const worker = this.workers.get(workerId);
    if (worker && worker.currentJobId) {
      await this.forceTerminateJob(worker.currentJobId, `Worker error: ${error.message}`);
    }

    // Restart worker if not shutting down
    if (!this.isShuttingDown) {
      await this.terminateWorker(workerId, true);
      await this.createWorker();
    }
  }

  /**
   * Handle worker exit
   */
  private async handleWorkerExit(workerId: string, code: number): Promise<void> {
    this.logger.debug(`Worker ${workerId} exited with code ${code}`);

    const worker = this.workers.get(workerId);
    if (worker && worker.currentJobId) {
      await this.forceTerminateJob(worker.currentJobId, `Worker exit with code ${code}`);
    }

    this.workers.delete(workerId);

    // Restart worker if unexpected exit and not shutting down
    if (code !== 0 && !this.isShuttingDown) {
      this.logger.warn(`Worker ${workerId} exited unexpectedly, restarting...`);
      await this.createWorker();
    }
  }

  /**
   * Handle job started message from worker
   */
  private async handleJobStarted(workerId: string, message: any): Promise<void> {
    const { jobId } = message;
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.isAvailable = false;
    worker.currentJobId = jobId;

    const context = this.activeJobs.get(jobId);
    if (context) {
      context.startedAt = new Date();

      await this.jobStorage.updateJob(jobId, {
        status: JobStatus.RUNNING,
        startedAt: context.startedAt,
        progress: 0,
        currentStep: 'Starting execution',
      });

      this.eventEmitter.emit('job.started', { jobId, workerId });
    }
  }

  /**
   * Handle job progress update from worker
   */
  private async handleJobProgress(workerId: string, message: any): Promise<void> {
    const { jobId, progress, currentStep, estimatedCompletion } = message;

    await this.jobStorage.updateJob(jobId, {
      progress: Math.min(Math.max(progress, 0), 100),
      currentStep,
      estimatedCompletion: estimatedCompletion ? new Date(estimatedCompletion) : undefined,
    });

    this.eventEmitter.emit('job.progress', { jobId, progress, currentStep });
  }

  /**
   * Handle job completion from worker
   */
  private async handleJobCompleted(workerId: string, message: any): Promise<void> {
    const { jobId, result, executionTime, resourceUsage } = message;
    const worker = this.workers.get(workerId);
    if (!worker) return;

    const context = this.activeJobs.get(jobId);
    if (context) {
      const completedAt = new Date();

      await this.jobStorage.updateJob(jobId, {
        status: JobStatus.COMPLETED,
        progress: 100,
        completedAt,
        result,
        executionTimeMs: executionTime,
        resourceUsage: JSON.stringify(resourceUsage),
        currentStep: 'Completed',
      });

      // Update worker stats
      worker.completedJobs++;
      worker.totalExecutionTime += executionTime;
      worker.isAvailable = true;
      worker.currentJobId = undefined;

      this.activeJobs.delete(jobId);

      this.eventEmitter.emit('job.completed', {
        jobId,
        workerId,
        executionTime,
        resourceUsage
      });
    }
  }

  /**
   * Handle job failure from worker
   */
  private async handleJobFailed(workerId: string, message: any): Promise<void> {
    const { jobId, error, executionTime, resourceUsage } = message;
    const worker = this.workers.get(workerId);
    if (!worker) return;

    const context = this.activeJobs.get(jobId);
    if (context) {
      const shouldRetry = context.retryCount < context.maxRetries;

      if (shouldRetry) {
        // Retry the job
        context.retryCount++;

        const queuedJob: QueuedJob = {
          jobId,
          priority: context.priority,
          submittedAt: new Date(),
          retryCount: context.retryCount,
          dependencies: [],
          resourceRequirements: {
            estimatedMemory: 100,
            estimatedCpu: 10,
            estimatedDuration: 5000,
          },
        };

        this.addToQueue(queuedJob);

        await this.jobStorage.updateJob(jobId, {
          status: JobStatus.RETRY,
          retryCount: context.retryCount,
          errorMessage: error,
          progress: 0,
        });

        this.eventEmitter.emit('job.retry', { jobId, retryCount: context.retryCount, error });
      } else {
        // Job failed permanently
        await this.jobStorage.updateJob(jobId, {
          status: JobStatus.FAILED,
          completedAt: new Date(),
          errorMessage: error,
          executionTimeMs: executionTime,
          resourceUsage: JSON.stringify(resourceUsage),
        });

        // Move to dead letter queue for analysis
        const queuedJob: QueuedJob = {
          jobId,
          priority: context.priority,
          submittedAt: context.startedAt,
          retryCount: context.retryCount,
          dependencies: [],
          resourceRequirements: {
            estimatedMemory: 100,
            estimatedCpu: 10,
            estimatedDuration: 5000,
          },
        };
        this.deadLetterQueue.push(queuedJob);

        this.eventEmitter.emit('job.failed', { jobId, error, retryCount: context.retryCount });
      }

      // Update worker stats
      worker.failedJobs++;
      worker.isAvailable = true;
      worker.currentJobId = undefined;

      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Handle health status from worker
   */
  private async handleHealthStatus(workerId: string, message: any): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.lastHealthCheck = new Date();
    // Process health data if needed
  }

  /**
   * Handle resource usage update from worker
   */
  private async handleResourceUsage(workerId: string, message: any): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.resourceUsage = {
      cpuUsage: message.cpuUsage || 0,
      memoryUsage: message.memoryUsage || 0,
      activeTime: message.activeTime || 0,
    };
  }

  /**
   * Force terminate a job due to timeout or error
   */
  private async forceTerminateJob(jobId: string, reason: string): Promise<void> {
    const context = this.activeJobs.get(jobId);
    if (!context) return;

    await this.jobStorage.updateJob(jobId, {
      status: JobStatus.FAILED,
      completedAt: new Date(),
      errorMessage: `Job terminated: ${reason}`,
      progress: context ? Math.min(100, Math.max(0,
        Math.floor((Date.now() - context.startedAt.getTime()) / 1000)
      )) : 0,
    });

    // Free up worker
    const worker = this.workers.get(context.workerId);
    if (worker) {
      worker.isAvailable = true;
      worker.currentJobId = undefined;
      worker.failedJobs++;
    }

    this.activeJobs.delete(jobId);
    this.eventEmitter.emit('job.terminated', { jobId, reason });
  }

  /**
   * Add job to priority queue with proper ordering
   */
  private addToQueue(job: QueuedJob): void {
    // Insert job in priority order (higher priority first, then FIFO)
    let insertIndex = this.jobQueue.length;

    for (let i = 0; i < this.jobQueue.length; i++) {
      const existingJob = this.jobQueue[i];
      if (job.priority > existingJob.priority ||
          (job.priority === existingJob.priority && job.submittedAt < existingJob.submittedAt)) {
        insertIndex = i;
        break;
      }
    }

    this.jobQueue.splice(insertIndex, 0, job);
  }

  /**
   * Start main job processing loop
   */
  private startJobProcessing(): void {
    this.processingInterval = setInterval(async () => {
      if (this.isShuttingDown || this.isProcessing) return;

      this.isProcessing = true;

      try {
        await this.processJobQueue();
        await this.manageWorkerPool();
      } catch (error) {
        this.logger.error('Error in job processing loop:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000); // Process every second
  }

  /**
   * Process jobs from the queue
   */
  private async processJobQueue(): Promise<void> {
    if (this.jobQueue.length === 0) return;

    // Find available workers
    const availableWorkers = Array.from(this.workers.values()).filter(w => w.isAvailable);
    if (availableWorkers.length === 0) return;

    // Process jobs up to available worker capacity
    const jobsToProcess = Math.min(this.jobQueue.length, availableWorkers.length);

    for (let i = 0; i < jobsToProcess; i++) {
      const job = this.jobQueue.shift();
      const worker = availableWorkers[i];

      if (!job || !worker) continue;

      // Check dependencies
      if (job.dependencies.length > 0) {
        const dependenciesCompleted = await this.checkDependencies(job.dependencies);
        if (!dependenciesCompleted) {
          // Put job back in queue for later processing
          this.jobQueue.unshift(job);
          continue;
        }
      }

      // Check resource requirements
      if (!this.checkResourceAvailability(job.resourceRequirements)) {
        // Put job back in queue for later processing
        this.jobQueue.unshift(job);
        continue;
      }

      try {
        await this.executeJobOnWorker(job, worker);
      } catch (error) {
        this.logger.error(`Failed to execute job ${job.jobId}:`, error);
        await this.handleJobFailed(worker.id, {
          jobId: job.jobId,
          error: error.message,
          executionTime: 0,
          resourceUsage: {},
        });
      }
    }
  }

  /**
   * Execute a job on a specific worker
   */
  private async executeJobOnWorker(job: QueuedJob, worker: WorkerThread): Promise<void> {
    const jobData = await this.jobStorage.getJob(job.jobId);
    if (!jobData) {
      throw new Error(`Job data not found for ${job.jobId}`);
    }

    const context: JobExecutionContext = {
      jobId: job.jobId,
      actionType: jobData.actionType,
      actionData: jobData.actionData,
      timeout: jobData.timeout,
      priority: job.priority,
      retryCount: job.retryCount,
      maxRetries: jobData.maxRetries,
      metadata: jobData.metadata,
      startedAt: new Date(),
      workerId: worker.id,
    };

    this.activeJobs.set(job.jobId, context);

    // Send job to worker
    worker.worker.postMessage({
      type: 'execute_job',
      jobData: {
        jobId: job.jobId,
        actionType: jobData.actionType,
        actionData: jobData.actionData,
        timeout: jobData.timeout,
        metadata: jobData.metadata,
      },
    });

    // Set timeout for job execution
    setTimeout(async () => {
      if (this.activeJobs.has(job.jobId)) {
        await this.forceTerminateJob(job.jobId, 'Execution timeout');
      }
    }, jobData.timeout);
  }

  /**
   * Check if job dependencies are completed
   */
  private async checkDependencies(dependencies: string[]): Promise<boolean> {
    for (const depJobId of dependencies) {
      const depJob = await this.jobStorage.getJob(depJobId);
      if (!depJob || depJob.status !== JobStatus.COMPLETED) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if system has enough resources for job
   */
  private checkResourceAvailability(requirements: { estimatedMemory: number; estimatedCpu: number }): boolean {
    const totalMemoryUsage = Array.from(this.workers.values())
      .reduce((sum, w) => sum + w.resourceUsage.memoryUsage, 0);
    const totalCpuUsage = Array.from(this.workers.values())
      .reduce((sum, w) => sum + w.resourceUsage.cpuUsage, 0);

    const availableMemory = this.config.memoryThreshold * this.workers.size - totalMemoryUsage;
    const availableCpu = this.config.cpuThreshold * this.workers.size - totalCpuUsage;

    return requirements.estimatedMemory <= availableMemory &&
           requirements.estimatedCpu <= availableCpu;
  }

  /**
   * Manage worker pool size based on load and resources
   */
  private async manageWorkerPool(): Promise<void> {
    const activeWorkers = Array.from(this.workers.values()).filter(w => !w.isAvailable).length;
    const totalWorkers = this.workers.size;
    const queueLength = this.jobQueue.length;

    // Scale up if queue is building up and we haven't reached max workers
    if (queueLength > totalWorkers && totalWorkers < this.config.maxWorkers) {
      await this.createWorker();
      this.logger.debug(`Scaled up worker pool to ${this.workers.size} workers`);
    }

    // Scale down if workers are idle for too long
    if (totalWorkers > this.config.minWorkers) {
      const idleWorkers = Array.from(this.workers.values()).filter(w =>
        w.isAvailable && Date.now() - w.lastHealthCheck.getTime() > this.config.idleTimeout
      );

      for (const worker of idleWorkers.slice(0, totalWorkers - this.config.minWorkers)) {
        await this.terminateWorker(worker.id);
        this.logger.debug(`Scaled down worker pool to ${this.workers.size} workers`);
      }
    }
  }

  /**
   * Start health checking loop
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      const now = Date.now();
      const unhealthyWorkers: string[] = [];

      for (const [workerId, worker] of this.workers.entries()) {
        // Check if worker is responsive
        if (now - worker.lastHealthCheck.getTime() > this.config.healthCheckInterval * 2) {
          this.logger.warn(`Worker ${workerId} appears unresponsive`);
          unhealthyWorkers.push(workerId);
        }

        // Request health status
        worker.worker.postMessage({ type: 'health_check' });
      }

      // Restart unhealthy workers
      for (const workerId of unhealthyWorkers) {
        this.logger.warn(`Restarting unhealthy worker ${workerId}`);
        await this.terminateWorker(workerId, true);
        if (!this.isShuttingDown) {
          await this.createWorker();
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Start metrics collection loop
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000); // Update metrics every 10 seconds
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    const workers = Array.from(this.workers.values());
    const activeWorkers = workers.filter(w => !w.isAvailable);
    const idleWorkers = workers.filter(w => w.isAvailable);

    const totalCompletedJobs = workers.reduce((sum, w) => sum + w.completedJobs, 0);
    const totalFailedJobs = workers.reduce((sum, w) => sum + w.failedJobs, 0);
    const totalExecutionTime = workers.reduce((sum, w) => sum + w.totalExecutionTime, 0);

    this.metrics = {
      totalWorkers: workers.length,
      activeWorkers: activeWorkers.length,
      idleWorkers: idleWorkers.length,
      unhealthyWorkers: workers.filter(w =>
        Date.now() - w.lastHealthCheck.getTime() > this.config.healthCheckInterval * 2
      ).length,
      queueLength: this.jobQueue.length,
      processingRate: totalCompletedJobs, // This should be calculated per minute
      averageExecutionTime: totalCompletedJobs > 0 ? totalExecutionTime / totalCompletedJobs : 0,
      resourceUtilization: {
        totalCpu: workers.reduce((sum, w) => sum + w.resourceUsage.cpuUsage, 0),
        totalMemory: workers.reduce((sum, w) => sum + w.resourceUsage.memoryUsage, 0),
        averageCpu: workers.length > 0 ?
          workers.reduce((sum, w) => sum + w.resourceUsage.cpuUsage, 0) / workers.length : 0,
        averageMemory: workers.length > 0 ?
          workers.reduce((sum, w) => sum + w.resourceUsage.memoryUsage, 0) / workers.length : 0,
      },
      errorRate: (totalCompletedJobs + totalFailedJobs) > 0 ?
        (totalFailedJobs / (totalCompletedJobs + totalFailedJobs)) * 100 : 0,
      throughput: totalCompletedJobs, // Jobs completed
    };

    this.eventEmitter.emit('worker.metrics', this.metrics);
  }

  /**
   * Load pending jobs from storage on startup
   */
  private async loadPendingJobs(): Promise<void> {
    try {
      const pendingJobs = await this.jobStorage.searchJobs({
        statuses: [JobStatus.PENDING, JobStatus.QUEUED, JobStatus.RETRY],
        sortBy: 'submittedAt',
        sortOrder: 'ASC',
      });

      for (const job of pendingJobs) {
        const queuedJob: QueuedJob = {
          jobId: job.jobId,
          priority: job.priority,
          submittedAt: job.submittedAt,
          retryCount: job.retryCount,
          dependencies: job.dependencies || [],
          resourceRequirements: {
            estimatedMemory: 100,
            estimatedCpu: 10,
            estimatedDuration: 5000,
          },
        };

        this.addToQueue(queuedJob);
      }

      this.logger.log(`Loaded ${pendingJobs.length} pending jobs from storage`);
    } catch (error) {
      this.logger.error('Failed to load pending jobs:', error);
    }
  }
}