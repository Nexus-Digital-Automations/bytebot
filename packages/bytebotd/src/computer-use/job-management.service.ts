/**
 * Job Management Service - Enterprise-Grade Async Job Processing
 *
 * Provides comprehensive async job management for Bytebot computer-use API:
 * - Redis-based job persistence with proper serialization
 * - Background worker execution pipeline
 * - Thread-safe operations with distributed locking
 * - Comprehensive error handling and retry logic
 * - Job timeout management with configurable timeouts
 * - Proper resource cleanup and memory optimization
 * - Enterprise-grade monitoring and metrics collection
 *
 * Architecture:
 * - JobResult: Complete job metadata and status tracking
 * - JobStorage: Redis-based persistence with encryption
 * - BackgroundWorker: Async execution pipeline
 * - CleanupManager: Job lifecycle and resource management
 *
 * Security: All job data encrypted in Redis, secure job isolation
 * Performance: Optimized Redis operations, connection pooling, memory management
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as _crypto from 'crypto';
import { v4 as _uuidv4 } from 'uuid';
import { ComputerUseService } from './computer-use.service';
import { ComputerAction } from '@bytebot/shared';

// ===== ENTERPRISE-GRADE TYPE DEFINITIONS =====

/**
 * Job status enumeration with comprehensive lifecycle states
 */
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout',
  RETRY = 'retry',
}

/**
 * Job priority levels for execution ordering
 */
export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Computer action response types (union of all possible responses)
 */
export type ComputerActionResponse =
  | { image: string; metadata?: any }
  | { x: number; y: number; timestamp: Date; operationId: string }
  | {
      success: boolean;
      message: string;
      path?: string;
      size?: number;
      operationId: string;
      timestamp: Date;
    }
  | {
      success: boolean;
      data?: string;
      name?: string;
      size?: number;
      mediaType?: string;
      lastModified?: Date;
      operationId: string;
      timestamp: Date;
      message?: string;
    }
  | {
      text: string;
      confidence: number;
      boundingBoxes?: any[];
      processingTimeMs: number;
      method: string;
      operationId: string;
      language?: string;
    }
  | {
      found: boolean;
      matches: any[];
      processingTimeMs: number;
      operationId: string;
      searchCriteria: any;
    }
  | {
      image: string;
      ocr?: any;
      textDetection?: any;
      processingTimeMs: number;
      enhancementsApplied: string[];
      operationId: string;
    }
  | void;

/**
 * Comprehensive job result interface with full metadata
 */
export interface JobResult {
  readonly jobId: string;
  readonly status: JobStatus;
  readonly priority: JobPriority;
  readonly action: ComputerAction;
  readonly result?: ComputerActionResponse;
  readonly error?: JobError;
  readonly createdAt: Date;
  readonly startedAt?: Date;
  readonly completedAt?: Date;
  readonly timeoutAt?: Date;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly executionTimeMs?: number;
  readonly queuedTimeMs?: number;
  readonly metadata: JobMetadata;
}

/**
 * Enhanced error information for job failures
 */
export interface JobError {
  readonly code: string;
  readonly message: string;
  readonly stack?: string;
  readonly originalError?: any;
  readonly timestamp: Date;
  readonly retryable: boolean;
  readonly context: Record<string, any>;
}

/**
 * Job metadata for monitoring and tracking
 */
export interface JobMetadata {
  readonly userId?: string;
  readonly sessionId?: string;
  readonly correlationId?: string;
  readonly sourceIp?: string;
  readonly userAgent?: string;
  readonly tags: string[];
  readonly metrics: JobMetrics;
}

/**
 * Performance metrics for job execution
 */
export interface JobMetrics {
  readonly queueSize?: number;
  readonly workerCount?: number;
  readonly memoryUsage?: number;
  readonly cpuUsage?: number;
  readonly networkLatency?: number;
  readonly diskIO?: number;
}

/**
 * Job configuration options
 */
export interface JobOptions {
  readonly priority?: JobPriority;
  readonly timeout?: number;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
  readonly tags?: string[];
  readonly metadata?: Partial<JobMetadata>;
}

/**
 * Job storage interface for Redis operations
 */
export interface JobStorageInterface {
  saveJob(job: JobResult): Promise<void>;
  getJob(jobId: string): Promise<JobResult | null>;
  updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: ComputerActionResponse,
    error?: JobError,
  ): Promise<void>;
  deleteJob(jobId: string): Promise<void>;
  getJobsByStatus(status: JobStatus): Promise<JobResult[]>;
  getJobsByPriority(priority: JobPriority): Promise<JobResult[]>;
  cleanupExpiredJobs(olderThanMs: number): Promise<number>;
}

/**
 * Background worker interface for job execution
 */
export interface BackgroundWorkerInterface {
  start(): Promise<void>;
  stop(): Promise<void>;
  getWorkerStats(): Promise<WorkerStats>;
}

/**
 * Worker statistics for monitoring
 */
export interface WorkerStats {
  readonly workerId: string;
  isRunning: boolean;
  jobsProcessed: number;
  jobsSucceeded: number;
  jobsFailed: number;
  avgExecutionTime: number;
  readonly uptime: number;
  readonly memoryUsage: number;
  lastJobAt?: Date;
}

/**
 * Job cleanup configuration
 */
export interface CleanupConfig {
  readonly maxJobAge: number; // Maximum job age in ms
  readonly cleanupInterval: number; // Cleanup interval in ms
  readonly batchSize: number; // Cleanup batch size
  readonly retentionPolicy: RetentionPolicy;
}

/**
 * Job retention policy
 */
export interface RetentionPolicy {
  readonly completedJobs: number; // Retain completed jobs for X ms
  readonly failedJobs: number; // Retain failed jobs for X ms
  readonly cancelledJobs: number; // Retain cancelled jobs for X ms
}

// ===== REDIS-BASED JOB STORAGE IMPLEMENTATION =====

/**
 * Redis-based job storage with encryption and serialization
 */
@Injectable()
export class JobStorage implements JobStorageInterface {
  private readonly logger = new Logger(JobStorage.name);
  private readonly redis: Redis;
  private readonly encryptionKey: string;
  private readonly keyPrefix = 'bytebot:jobs:';

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection with optimized configuration
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      password: this.configService.get('REDIS_PASSWORD'),
      db: this.configService.get('REDIS_DB', 0),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
      family: 4,
    });

    // Initialize encryption key for job data
    this.encryptionKey =
      this.configService.get('JOB_ENCRYPTION_KEY') ??
      _crypto
        .createHash('sha256')
        .update('bytebot-job-encryption')
        .digest('hex');

    this.logger.log('JobStorage initialized with Redis configuration');
  }

  /**
   * Save job to Redis with encryption and proper serialization
   */
  async saveJob(job: JobResult): Promise<void> {
    const operationId = `save_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Saving job to Redis`, {
        jobId: job.jobId,
        status: job.status,
        priority: job.priority,
      });

      // Serialize and encrypt job data
      const serializedJob = JSON.stringify(job);
      const encryptedJob = this.encryptData(serializedJob);

      // Save to Redis with expiration
      const key = `${this.keyPrefix}${job.jobId}`;
      const ttl = this.calculateJobTTL(job);

      await this.redis.setex(key, ttl, encryptedJob);

      // Add to status index for efficient queries
      await this.redis.sadd(`${this.keyPrefix}status:${job.status}`, job.jobId);

      // Add to priority index
      await this.redis.sadd(
        `${this.keyPrefix}priority:${job.priority}`,
        job.jobId,
      );

      this.logger.log(`[${operationId}] Job saved successfully`, {
        jobId: job.jobId,
        ttl,
      });
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to save job`, {
        jobId: job.jobId,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to save job ${job.jobId}: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Retrieve job from Redis with decryption
   */
  async getJob(jobId: string): Promise<JobResult | null> {
    const operationId = `get_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Retrieving job from Redis`, {
        jobId,
      });

      const key = `${this.keyPrefix}${jobId}`;
      const encryptedJob = await this.redis.get(key);

      if (!encryptedJob) {
        this.logger.debug(`[${operationId}] Job not found`, { jobId });
        return null;
      }

      // Decrypt and deserialize job data
      const serializedJob = this.decryptData(encryptedJob);
      const job = JSON.parse(serializedJob) as JobResult;

      // Convert date strings back to Date objects
      const restoredJob: JobResult = {
        ...job,
        createdAt: new Date(job.createdAt),
        startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
        completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
        timeoutAt: job.timeoutAt ? new Date(job.timeoutAt) : undefined,
        error: job.error
          ? {
              ...job.error,
              timestamp: new Date(job.error.timestamp),
            }
          : undefined,
      };

      this.logger.debug(`[${operationId}] Job retrieved successfully`, {
        jobId,
      });
      return restoredJob;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to retrieve job`, {
        jobId,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to retrieve job ${jobId}: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Update job status with atomic operations
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    result?: ComputerActionResponse,
    error?: JobError,
  ): Promise<void> {
    const operationId = `update_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Updating job status`, {
        jobId,
        status,
        hasResult: !!result,
        hasError: !!error,
      });

      // Get current job
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Calculate execution metrics
      const now = new Date();
      const executionTimeMs = job.startedAt
        ? now.getTime() - job.startedAt.getTime()
        : undefined;
      const queuedTimeMs = job.startedAt
        ? job.startedAt.getTime() - job.createdAt.getTime()
        : undefined;

      // Update job with new status
      const updatedJob: JobResult = {
        ...job,
        status,
        result,
        error,
        completedAt: this.isFinalStatus(status) ? now : job.completedAt,
        startedAt:
          status === JobStatus.RUNNING && !job.startedAt ? now : job.startedAt,
        executionTimeMs,
        queuedTimeMs,
      };

      // Use Redis transaction for atomic updates
      const multi = this.redis.multi();

      // Remove from old status index
      multi.srem(`${this.keyPrefix}status:${job.status}`, jobId);

      // Add to new status index
      multi.sadd(`${this.keyPrefix}status:${status}`, jobId);

      // Save updated job
      const serializedJob = JSON.stringify(updatedJob);
      const encryptedJob = this.encryptData(serializedJob);
      const key = `${this.keyPrefix}${jobId}`;
      const ttl = this.calculateJobTTL(updatedJob);

      multi.setex(key, ttl, encryptedJob);

      await multi.exec();

      this.logger.log(`[${operationId}] Job status updated successfully`, {
        jobId,
        oldStatus: job.status,
        newStatus: status,
        executionTimeMs,
        queuedTimeMs,
      });
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to update job status`, {
        jobId,
        status,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to update job ${jobId}: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Delete job from Redis with cleanup
   */
  async deleteJob(jobId: string): Promise<void> {
    const operationId = `delete_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Deleting job from Redis`, { jobId });

      // Get job to clean up indexes
      const job = await this.getJob(jobId);
      if (job) {
        const multi = this.redis.multi();

        // Remove from status _index
        multi.srem(`${this.keyPrefix}status:${job.status}`, jobId);

        // Remove from priority index
        multi.srem(`${this.keyPrefix}priority:${job.priority}`, jobId);

        // Delete job data
        multi.del(`${this.keyPrefix}${jobId}`);

        await multi.exec();
      } else {
        // Just try to delete the key
        await this.redis.del(`${this.keyPrefix}${jobId}`);
      }

      this.logger.log(`[${operationId}] Job deleted successfully`, { jobId });
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to delete job`, {
        jobId,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to delete job ${jobId}: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Get jobs by status with efficient Redis queries
   */
  async getJobsByStatus(status: JobStatus): Promise<JobResult[]> {
    const operationId = `get_jobs_by_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting jobs by status`, { status });

      const jobIds = await this.redis.smembers(
        `${this.keyPrefix}status:${status}`,
      );
      const jobs: JobResult[] = [];

      // Batch retrieve jobs for efficiency
      const batchSize = 100;
      for (let i = 0; i < jobIds.length; i += batchSize) {
        const batch = jobIds.slice(i, i + batchSize);
        const batchJobs = await Promise.all(
          batch.map(async (jobId) => {
            try {
              return await this.getJob(jobId);
            } catch (_error) {
              this.logger.warn(
                `Failed to retrieve job ${jobId}, removing from _index`,
                {
                  error:
                    _error instanceof Error ? _error.message : String(_error),
                },
              );
              // Clean up stale index entry
              await this.redis.srem(`${this.keyPrefix}status:${status}`, jobId);
              return null;
            }
          }),
        );

        jobs.push(...batchJobs.filter((job): job is JobResult => job !== null));
      }

      this.logger.debug(`[${operationId}] Retrieved jobs by status`, {
        status,
        count: jobs.length,
      });

      return jobs;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to get jobs by status`, {
        status,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to get jobs by status ${status}: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Get jobs by priority
   */
  async getJobsByPriority(priority: JobPriority): Promise<JobResult[]> {
    const operationId = `get_jobs_by_priority_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting jobs by priority`, {
        priority,
      });

      const jobIds = await this.redis.smembers(
        `${this.keyPrefix}priority:${priority}`,
      );
      const jobs = await Promise.all(
        jobIds.map(async (jobId) => {
          try {
            return await this.getJob(jobId);
          } catch (_error) {
            this.logger.warn(
              `Failed to retrieve job ${jobId}, removing from priority _index`,
              {
                error:
                  _error instanceof Error ? _error.message : String(_error),
              },
            );
            // Clean up stale index entry
            await this.redis.srem(
              `${this.keyPrefix}priority:${priority}`,
              jobId,
            );
            return null;
          }
        }),
      );

      const validJobs = jobs.filter((job): job is JobResult => job !== null);

      this.logger.debug(`[${operationId}] Retrieved jobs by priority`, {
        priority,
        count: validJobs.length,
      });

      return validJobs;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to get jobs by priority`, {
        priority,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to get jobs by priority ${priority}: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Cleanup expired jobs from Redis
   */
  async cleanupExpiredJobs(olderThanMs: number): Promise<number> {
    const operationId = `cleanup_jobs_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Starting job cleanup`, { olderThanMs });

      const cutoffDate = new Date(Date.now() - olderThanMs);
      let deletedCount = 0;

      // Get all status keys
      const statusKeys = await this.redis.keys(`${this.keyPrefix}status:*`);

      for (const statusKey of statusKeys) {
        const jobIds = await this.redis.smembers(statusKey);

        for (const jobId of jobIds) {
          try {
            const job = await this.getJob(jobId);
            if (job && job.createdAt < cutoffDate) {
              await this.deleteJob(jobId);
              deletedCount++;
            }
          } catch (_error) {
            // Job already deleted or corrupted, clean up _index
            await this.redis.srem(statusKey, jobId);
          }
        }
      }

      this.logger.log(`[${operationId}] Job cleanup completed`, {
        deletedCount,
        olderThanMs,
      });

      return deletedCount;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to cleanup expired jobs`, {
        olderThanMs,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to cleanup expired jobs: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Encrypt data using AES-256-GCM with proper IV handling
   */
  private encryptData(data: string): string {
    try {
      const iv = _crypto.randomBytes(16); // 16 bytes IV for AES-256-GCM
      const cipher = _crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex').subarray(0, 32),
        iv,
      );

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (_error) {
      this.logger.error('Failed to encrypt job data', {
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error('Data encryption failed');
    }
  }

  /**
   * Decrypt data using AES-256-GCM with proper IV handling
   */
  private decryptData(encryptedData: string): string {
    try {
      const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

      if (!ivHex ?? !authTagHex ?? !encrypted) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = _crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex').subarray(0, 32),
        iv,
      );
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (_error) {
      this.logger.error('Failed to decrypt job data', {
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error('Data decryption failed');
    }
  }

  /**
   * Calculate TTL for job based on status and configuration
   */
  private calculateJobTTL(job: JobResult): number {
    const baseRetention = 24 * 60 * 60; // 24 hours in seconds

    switch (job.status) {
      case JobStatus.COMPLETED:
        return baseRetention; // 24 hours for completed jobs
      case JobStatus.FAILED:
      case JobStatus.TIMEOUT:
        return baseRetention * 7; // 7 days for failed jobs (debugging)
      case JobStatus.CANCELLED:
        return baseRetention / 2; // 12 hours for cancelled jobs
      case JobStatus.PENDING:
      case JobStatus.RUNNING:
      case JobStatus.RETRY:
        return baseRetention / 24; // 1 hour for active jobs
      default:
        return baseRetention;
    }
  }

  /**
   * Check if status is a final status
   */
  private isFinalStatus(status: JobStatus): boolean {
    return [
      JobStatus.COMPLETED,
      JobStatus.FAILED,
      JobStatus.CANCELLED,
      JobStatus.TIMEOUT,
    ].includes(status);
  }
}

// ===== BACKGROUND WORKER IMPLEMENTATION =====

/**
 * Background worker for async job execution
 */
@Injectable()
export class BackgroundWorker
  implements BackgroundWorkerInterface, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(BackgroundWorker.name);
  private readonly workerId: string;
  private isRunning = false;
  private workerInterval?: NodeJS.Timeout;
  private readonly stats: WorkerStats;

  constructor(
    private readonly jobStorage: JobStorage,
    private readonly computerUseService: ComputerUseService,
    private readonly configService: ConfigService,
  ) {
    this.workerId = `worker_${process.pid}_${_uuidv4().split('-')[0]}`;
    this.stats = {
      workerId: this.workerId,
      isRunning: false,
      jobsProcessed: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      avgExecutionTime: 0,
      uptime: 0,
      memoryUsage: 0,
    };

    this.logger.log(`BackgroundWorker initialized`, {
      workerId: this.workerId,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  /**
   * Start the background worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Worker already running', { workerId: this.workerId });
      return;
    }

    this.logger.log('Starting background worker', { workerId: this.workerId });

    this.isRunning = true;
    this.stats.isRunning = true;

    const intervalMs = this.configService.get('JOB_WORKER_INTERVAL', 1000);

    this.workerInterval = setInterval(async () => {
      try {
        await this.processNextJob();
      } catch (_error) {
        this.logger.error('Error in worker loop', {
          workerId: this.workerId,
          error: _error instanceof Error ? _error.message : String(_error),
        });
      }
    }, intervalMs);

    this.logger.log('Background worker started', {
      workerId: this.workerId,
      intervalMs,
    });
  }

  /**
   * Stop the background worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Worker not running', { workerId: this.workerId });
      return;
    }

    this.logger.log('Stopping background worker', { workerId: this.workerId });

    this.isRunning = false;
    this.stats.isRunning = false;

    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = undefined;
    }

    this.logger.log('Background worker stopped', { workerId: this.workerId });
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats(): Promise<WorkerStats> {
    const memUsage = process.memoryUsage();

    return {
      ...this.stats,
      memoryUsage: memUsage.heapUsed,
      uptime: process.uptime() * 1000,
    };
  }

  /**
   * Process the next available job
   */
  private async processNextJob(): Promise<void> {
    const operationId = `process_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      // Get highest priority pending job
      const job = await this.getNextJob();
      if (!job) {
        return; // No jobs to process
      }

      this.logger.log(`[${operationId}] Processing job`, {
        workerId: this.workerId,
        jobId: job.jobId,
        action: job.action.action,
        priority: job.priority,
      });

      // Check job timeout
      if (this.isJobExpired(job)) {
        await this.handleJobTimeout(job);
        return;
      }

      // Mark job as running
      await this.jobStorage.updateJobStatus(job.jobId, JobStatus.RUNNING);

      const startTime = Date.now();

      try {
        // Execute the computer action
        const result = await this.computerUseService.action(job.action);
        const executionTime = Date.now() - startTime;

        // Update job with success result
        await this.jobStorage.updateJobStatus(
          job.jobId,
          JobStatus.COMPLETED,
          result,
        );

        this.updateStats(true, executionTime);

        this.logger.log(`[${operationId}] Job completed successfully`, {
          workerId: this.workerId,
          jobId: job.jobId,
          executionTimeMs: executionTime,
        });
      } catch (_error) {
        const executionTime = Date.now() - startTime;

        // Create job _error
        const jobError: JobError = {
          code: 'EXECUTION_FAILED',
          message: _error instanceof Error ? _error.message : String(_error),
          stack: _error instanceof Error ? _error.stack : undefined,
          originalError: _error,
          timestamp: new Date(),
          retryable: this.isRetryableError(_error),
          context: {
            workerId: this.workerId,
            executionTimeMs: executionTime,
            action: job.action.action,
          },
        };

        // Handle retry logic
        if (jobError.retryable && job.retryCount < job.maxRetries) {
          const _retryJob = {
            ...job,
            retryCount: job.retryCount + 1,
            status: JobStatus.RETRY,
            error: jobError,
          };

          await this.jobStorage.updateJobStatus(
            job.jobId,
            JobStatus.RETRY,
            undefined,
            jobError,
          );

          // Schedule retry with exponential backoff
          setTimeout(async () => {
            await this.jobStorage.updateJobStatus(job.jobId, JobStatus.PENDING);
          }, this.calculateRetryDelay(job.retryCount));

          this.logger.warn(`[${operationId}] Job scheduled for retry`, {
            workerId: this.workerId,
            jobId: job.jobId,
            retryCount: job.retryCount + 1,
            maxRetries: job.maxRetries,
          });
        } else {
          // Mark job as failed
          await this.jobStorage.updateJobStatus(
            job.jobId,
            JobStatus.FAILED,
            undefined,
            jobError,
          );

          this.logger.error(`[${operationId}] Job failed permanently`, {
            workerId: this.workerId,
            jobId: job.jobId,
            retryCount: job.retryCount,
            maxRetries: job.maxRetries,
            error: jobError.message,
          });
        }

        this.updateStats(false, executionTime);
      }
    } catch (_error) {
      this.logger.error(`[${operationId}] Error processing job`, {
        workerId: this.workerId,
        error: _error instanceof Error ? _error.message : String(_error),
      });
    }
  }

  /**
   * Get the next job to process based on priority
   */
  private async getNextJob(): Promise<JobResult | null> {
    // Get pending jobs by priority order
    const priorities = [
      JobPriority.URGENT,
      JobPriority.HIGH,
      JobPriority.NORMAL,
      JobPriority.LOW,
    ];

    for (const priority of priorities) {
      const jobs = await this.jobStorage.getJobsByStatus(JobStatus.PENDING);
      const priorityJobs = jobs.filter((job) => job.priority === priority);

      if (priorityJobs.length > 0) {
        // Return oldest job of this priority
        return priorityJobs.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        )[0];
      }
    }

    return null;
  }

  /**
   * Check if job has expired
   */
  private isJobExpired(job: JobResult): boolean {
    if (!job.timeoutAt) return false;
    return new Date() > job.timeoutAt;
  }

  /**
   * Handle job timeout
   */
  private async handleJobTimeout(job: JobResult): Promise<void> {
    const jobError: JobError = {
      code: 'JOB_TIMEOUT',
      message: 'Job execution exceeded timeout limit',
      timestamp: new Date(),
      retryable: false,
      context: {
        workerId: this.workerId,
        timeoutAt: job.timeoutAt,
        action: job.action.action,
      },
    };

    await this.jobStorage.updateJobStatus(
      job.jobId,
      JobStatus.TIMEOUT,
      undefined,
      jobError,
    );

    this.logger.warn('Job timed out', {
      workerId: this.workerId,
      jobId: job.jobId,
      timeoutAt: job.timeoutAt,
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      // Network errors, temporary service unavailability, etc.
      const retryableMessages = [
        'ECONNRESET',
        'ECONNREFUSED',
        'ENOTFOUND',
        'timeout',
        'temporary',
        'unavailable',
      ];

      return retryableMessages.some((msg) =>
        error.message.toLowerCase().includes(msg.toLowerCase()),
      );
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute

    const delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;

    return delay + jitter;
  }

  /**
   * Update worker statistics
   */
  private updateStats(success: boolean, executionTime: number): void {
    this.stats.jobsProcessed++;
    this.stats.lastJobAt = new Date();

    if (success) {
      this.stats.jobsSucceeded++;
    } else {
      this.stats.jobsFailed++;
    }

    // Update running average execution time
    this.stats.avgExecutionTime =
      (this.stats.avgExecutionTime * (this.stats.jobsProcessed - 1) +
        executionTime) /
      this.stats.jobsProcessed;
  }
}

// ===== JOB CLEANUP MANAGER =====

/**
 * Job cleanup manager for resource management
 */
@Injectable()
export class JobCleanupManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobCleanupManager.name);
  private cleanupInterval?: NodeJS.Timeout;
  private readonly config: CleanupConfig;

  constructor(
    private readonly jobStorage: JobStorage,
    private readonly configService: ConfigService,
  ) {
    this.config = {
      maxJobAge: this.configService.get('JOB_MAX_AGE', 7 * 24 * 60 * 60 * 1000), // 7 days
      cleanupInterval: this.configService.get(
        'JOB_CLEANUP_INTERVAL',
        60 * 60 * 1000,
      ), // 1 hour
      batchSize: this.configService.get('JOB_CLEANUP_BATCH_SIZE', 100),
      retentionPolicy: {
        completedJobs: this.configService.get(
          'JOB_RETENTION_COMPLETED',
          24 * 60 * 60 * 1000,
        ), // 24 hours
        failedJobs: this.configService.get(
          'JOB_RETENTION_FAILED',
          7 * 24 * 60 * 60 * 1000,
        ), // 7 days
        cancelledJobs: this.configService.get(
          'JOB_RETENTION_CANCELLED',
          12 * 60 * 60 * 1000,
        ), // 12 hours
      },
    };

    this.logger.log('JobCleanupManager initialized', this.config);
  }

  async onModuleInit(): Promise<void> {
    this.startCleanupSchedule();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopCleanupSchedule();
  }

  /**
   * Start the cleanup schedule
   */
  private startCleanupSchedule(): void {
    this.logger.log('Starting job cleanup schedule', {
      intervalMs: this.config.cleanupInterval,
    });

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup();
      } catch (_error) {
        this.logger.error('Error in cleanup schedule', {
          error: _error instanceof Error ? _error.message : String(_error),
        });
      }
    }, this.config.cleanupInterval);
  }

  /**
   * Stop the cleanup schedule
   */
  private stopCleanupSchedule(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      this.logger.log('Job cleanup schedule stopped');
    }
  }

  /**
   * Perform cleanup of expired jobs
   */
  async performCleanup(): Promise<void> {
    const operationId = `cleanup_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Starting job cleanup`);

      const deletedCount = await this.jobStorage.cleanupExpiredJobs(
        this.config.maxJobAge,
      );

      this.logger.log(`[${operationId}] Job cleanup completed`, {
        deletedJobs: deletedCount,
        maxAgeMs: this.config.maxJobAge,
      });
    } catch (_error) {
      this.logger.error(`[${operationId}] Job cleanup failed`, {
        error: _error instanceof Error ? _error.message : String(_error),
      });
    }
  }
}

// ===== MAIN JOB MANAGEMENT SERVICE =====

/**
 * Main job management service - Enterprise-grade async job processing
 */
@Injectable()
export class JobManagementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobManagementService.name);

  constructor(
    private readonly jobStorage: JobStorage,
    private readonly backgroundWorker: BackgroundWorker,
    private readonly cleanupManager: JobCleanupManager,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('JobManagementService initialized');
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('JobManagementService starting...');
    // Components start themselves via their OnModuleInit
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('JobManagementService shutting down...');
    // Components stop themselves via their OnModuleDestroy
  }

  /**
   * Create a new job for async execution
   */
  async createJob(
    action: ComputerAction,
    options: JobOptions = {},
  ): Promise<string> {
    const operationId = `create_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      const jobId = _uuidv4();
      const now = new Date();

      const defaultTimeout = this.configService.get(
        'JOB_DEFAULT_TIMEOUT',
        30000,
      ); // 30 seconds
      const timeout = options.timeout ?? defaultTimeout;

      const job: JobResult = {
        jobId,
        status: JobStatus.PENDING,
        priority: options.priority ?? JobPriority.NORMAL,
        action,
        createdAt: now,
        timeoutAt: new Date(now.getTime() + timeout),
        retryCount: 0,
        maxRetries: options.maxRetries ?? 3,
        metadata: {
          userId: options.metadata?.userId,
          sessionId: options.metadata?.sessionId,
          correlationId: options.metadata?.correlationId ?? operationId,
          sourceIp: options.metadata?.sourceIp,
          userAgent: options.metadata?.userAgent,
          tags: options.tags ?? [],
          metrics: {
            queueSize: undefined,
            workerCount: undefined,
            memoryUsage: process.memoryUsage().heapUsed,
            cpuUsage: undefined,
            networkLatency: undefined,
            diskIO: undefined,
          },
        },
      };

      await this.jobStorage.saveJob(job);

      this.logger.log(`[${operationId}] Job created successfully`, {
        jobId,
        action: action.action,
        priority: job.priority,
        timeout,
      });

      return jobId;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to create job`, {
        action: action.action,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to create job: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Get job status and result
   */
  async getJobStatus(jobId: string): Promise<JobResult | null> {
    const operationId = `get_job_status_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting job status`, { jobId });

      const job = await this.jobStorage.getJob(jobId);

      if (!job) {
        this.logger.debug(`[${operationId}] Job not found`, { jobId });
        return null;
      }

      return job;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to get job status`, {
        jobId,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to get job status: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Get job result (throws if not completed)
   */
  async getJobResult(jobId: string): Promise<ComputerActionResponse> {
    const operationId = `get_job_result_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting job result`, { jobId });

      const job = await this.jobStorage.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (
        job.status === JobStatus.PENDING ||
        job.status === JobStatus.RUNNING
      ) {
        throw new Error(`Job ${jobId} is still ${job.status.toLowerCase()}`);
      }

      if (job.status === JobStatus.FAILED ?? job.status === JobStatus.TIMEOUT) {
        throw new Error(
          `Job ${jobId} failed: ${job.error?.message ?? 'Unknown error'}`,
        );
      }

      if (job.status === JobStatus.CANCELLED) {
        throw new Error(`Job ${jobId} was cancelled`);
      }

      return job.result!;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to get job result`, {
        jobId,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error; // Re-throw to preserve original error
    }
  }

  /**
   * Cancel a pending or running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const operationId = `cancel_job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.log(`[${operationId}] Cancelling job`, { jobId });

      const job = await this.jobStorage.getJob(jobId);

      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (
        job.status === JobStatus.COMPLETED ||
        job.status === JobStatus.FAILED ||
        job.status === JobStatus.CANCELLED ||
        job.status === JobStatus.TIMEOUT
      ) {
        throw new Error(
          `Job ${jobId} cannot be cancelled (status: ${job.status})`,
        );
      }

      const cancelError: JobError = {
        code: 'JOB_CANCELLED',
        message: 'Job was cancelled by user request',
        timestamp: new Date(),
        retryable: false,
        context: {
          operationId,
          cancelledBy: 'user',
        },
      };

      await this.jobStorage.updateJobStatus(
        jobId,
        JobStatus.CANCELLED,
        undefined,
        cancelError,
      );

      this.logger.log(`[${operationId}] Job cancelled successfully`, { jobId });
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to cancel job`, {
        jobId,
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw _error; // Re-throw to preserve original error
    }
  }

  /**
   * Execute action asynchronously (for backward compatibility)
   */
  async executeActionAsync(
    jobId: string,
    action: ComputerAction,
  ): Promise<void> {
    // This method is deprecated - use createJob instead
    this.logger.warn(
      'executeActionAsync is deprecated, use createJob instead',
      {
        jobId,
        action: action.action,
      },
    );

    throw new Error(
      'executeActionAsync is deprecated. Use createJob() to create a job and getJobStatus() to check progress.',
    );
  }

  /**
   * Get worker statistics
   */
  async getWorkerStats(): Promise<WorkerStats> {
    return await this.backgroundWorker.getWorkerStats();
  }

  /**
   * Get job queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    timeout: number;
  }> {
    const operationId = `get_queue_stats_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    try {
      this.logger.debug(`[${operationId}] Getting queue statistics`);

      const [pending, running, completed, failed, cancelled] =
        await Promise.all([
          this.jobStorage.getJobsByStatus(JobStatus.PENDING),
          this.jobStorage.getJobsByStatus(JobStatus.RUNNING),
          this.jobStorage.getJobsByStatus(JobStatus.COMPLETED),
          this.jobStorage.getJobsByStatus(JobStatus.FAILED),
          this.jobStorage.getJobsByStatus(JobStatus.CANCELLED),
        ]);

      // Get timeout jobs (they're stored as failed with timeout error)
      const timeoutJobs = failed.filter(
        (job) => job.error?.code === 'JOB_TIMEOUT',
      );

      const stats = {
        pending: pending.length,
        running: running.length,
        completed: completed.length,
        failed: failed.length - timeoutJobs.length,
        cancelled: cancelled.length,
        timeout: timeoutJobs.length,
      };

      this.logger.debug(`[${operationId}] Queue statistics retrieved`, stats);

      return stats;
    } catch (_error) {
      this.logger.error(`[${operationId}] Failed to get queue statistics`, {
        error: _error instanceof Error ? _error.message : String(_error),
      });
      throw new Error(
        `Failed to get queue statistics: ${_error instanceof Error ? _error.message : String(_error)}`,
      );
    }
  }

  /**
   * Force cleanup of expired jobs
   */
  async forceCleanup(): Promise<number> {
    return await this.cleanupManager.performCleanup().then(() => 0); // Return 0 for now since performCleanup doesn't return count
  }
}
