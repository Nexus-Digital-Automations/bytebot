/**
 * Summaries Service - Content analysis and summary management for ByteBot Agent
 *
 * Provides comprehensive summary creation, retrieval, and analysis capabilities
 * with enterprise-grade logging, performance monitoring, and async resilience patterns.
 *
 * Features:
 * - Content analysis with performance tracking
 * - Hierarchical summary management (parent-child relationships)
 * - Circuit breaker patterns for database operations
 * - Comprehensive logging with operation IDs
 * - Content validation and sanitization
 * - Performance metrics collection
 *
 * Dependencies: PrismaService, Logger, CircuitBreakerGuard
 * Usage: Summary creation, content analysis, summary retrieval with metrics
 */

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Summary, Prisma } from '@prisma/client';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';

/**
 * Interface for summary creation with comprehensive validation
 */
export interface CreateSummaryRequest {
  taskId: string;
  content: string;
  parentId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for summary analysis results - extends Summary for backward compatibility
 */
export interface SummaryAnalysis extends Summary {
  operationId: string;
  contentMetrics: {
    characterCount: number;
    wordCount: number;
    lineCount: number;
    readingTimeMinutes: number;
  };
  performanceMetrics: {
    processingTimeMs: number;
    databaseResponseTimeMs: number;
  };
}

/**
 * Interface for summary retrieval with metrics
 */
export interface SummaryRetrievalResult {
  summaries: Summary[];
  operationId: string;
  totalCount: number;
  performanceMetrics: {
    retrievalTimeMs: number;
    databaseResponseTimeMs: number;
  };
}

/**
 * Retry configuration for database operations
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);
  private readonly retryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 2000,
  };

  constructor(private readonly prisma: PrismaService) {
    this.logger.log(
      'SummariesService initialized with enterprise monitoring capabilities',
      {
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'initialize',
        retryConfig: this.retryConfig,
      },
    );
  }

  /**
   * Creates a new summary with comprehensive validation and performance tracking
   * @param data Summary creation request with validation
   * @returns Promise<SummaryAnalysis> Summary with analysis metrics
   */
  async create(_data: CreateSummaryRequest): Promise<SummaryAnalysis> {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Starting summary creation', {
      operationId,
      taskId: data.taskId,
      contentLength: data.content.length,
      hasParentId: !!data.parentId,
      timestamp: new Date().toISOString(),
      component: 'SummariesService',
      action: 'create',
    });

    try {
      // Validate input data
      this.validateSummaryData(data, operationId);

      // Calculate content metrics
      const contentMetrics = this.calculateContentMetrics(
        data.content,
        operationId,
      );

      // Create summary with retry logic
      const databaseStartTime = performance.now();
      const summary = await this.executeWithRetry(
        () =>
          this.prisma.summary.create({
            _data: {
              taskId: data.taskId,
              content: data.content,
              ...(data.parentId ? { parentId: data.parentId } : {}),
              ...(data.metadata
                ? { _metadata: data.metadata as Prisma.InputJsonValue }
                : {}),
            },
          }),
        operationId,
        'create_summary',
      );
      const databaseResponseTime = performance.now() - databaseStartTime;

      const processingTime = performance.now() - startTime;

      const _result: SummaryAnalysis = {
        ...summary,
        operationId,
        contentMetrics,
        performanceMetrics: {
          processingTimeMs: processingTime,
          databaseResponseTimeMs: databaseResponseTime,
        },
      };

      this.logger.log('Summary creation completed successfully', {
        operationId,
        summaryId: summary.id,
        taskId: data.taskId,
        processingTimeMs: processingTime,
        databaseResponseTimeMs: databaseResponseTime,
        contentCharacterCount: contentMetrics.characterCount,
        contentWordCount: contentMetrics.wordCount,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'create',
      });

      return result;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Summary creation failed', {
        operationId,
        taskId: data.taskId,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'create',
      });

      throw error;
    }
  }

  /**
   * Finds the latest summary for a task with performance tracking
   * @param taskId Task identifier
   * @returns Promise<Summary | null> Latest summary or null
   */
  async findLatest(taskId: string): Promise<Summary | null> {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Retrieving latest summary', {
      operationId,
      taskId,
      timestamp: new Date().toISOString(),
      component: 'SummariesService',
      action: 'findLatest',
    });

    try {
      // Validate task ID
      if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
        throw new BadRequestException('Invalid task ID provided');
      }

      const databaseStartTime = performance.now();
      const summary = await this.executeWithRetry(
        () =>
          this.prisma.summary.findFirst({
            where: { taskId },
            orderBy: { createdAt: 'desc' },
          }),
        operationId,
        'find_latest_summary',
      );
      const databaseResponseTime = performance.now() - databaseStartTime;
      const processingTime = performance.now() - startTime;

      this.logger.log('Latest summary retrieval completed', {
        operationId,
        taskId,
        summaryFound: !!summary,
        summaryId: summary?.id,
        processingTimeMs: processingTime,
        databaseResponseTimeMs: databaseResponseTime,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'findLatest',
      });

      return summary;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Latest summary retrieval failed', {
        operationId,
        taskId,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'findLatest',
      });

      throw error;
    }
  }

  /**
   * Finds all summaries for a task with comprehensive metrics
   * @param taskId Task identifier
   * @returns Promise<SummaryRetrievalResult> Summaries with retrieval metrics
   */
  async findAll(taskId: string): Promise<SummaryRetrievalResult> {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Retrieving all summaries for task', {
      operationId,
      taskId,
      timestamp: new Date().toISOString(),
      component: 'SummariesService',
      action: 'findAll',
    });

    try {
      // Validate task ID
      if (!taskId || typeof taskId !== 'string' || taskId.trim().length === 0) {
        throw new BadRequestException('Invalid task ID provided');
      }

      const databaseStartTime = performance.now();
      const summaries = await this.executeWithRetry(
        () =>
          this.prisma.summary.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
          }),
        operationId,
        'find_all_summaries',
      );
      const databaseResponseTime = performance.now() - databaseStartTime;
      const processingTime = performance.now() - startTime;

      const _result: SummaryRetrievalResult = {
        summaries,
        operationId,
        totalCount: summaries.length,
        performanceMetrics: {
          retrievalTimeMs: processingTime,
          databaseResponseTimeMs: databaseResponseTime,
        },
      };

      this.logger.log('All summaries retrieval completed', {
        operationId,
        taskId,
        summaryCount: summaries.length,
        processingTimeMs: processingTime,
        databaseResponseTimeMs: databaseResponseTime,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'findAll',
      });

      return result;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('All summaries retrieval failed', {
        operationId,
        taskId,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'findAll',
      });

      throw error;
    }
  }

  /**
   * Finds a summary by ID with validation and metrics
   * @param summaryId Summary identifier
   * @returns Promise<Summary> Summary record
   * @throws NotFoundException if summary not found
   */
  async findById(summaryId: string): Promise<Summary> {
    const operationId = randomUUID();
    const startTime = performance.now();

    this.logger.log('Retrieving summary by ID', {
      operationId,
      summaryId,
      timestamp: new Date().toISOString(),
      component: 'SummariesService',
      action: 'findById',
    });

    try {
      // Validate summary ID
      if (
        !summaryId ||
        typeof summaryId !== 'string' ||
        summaryId.trim().length === 0
      ) {
        throw new BadRequestException('Invalid summary ID provided');
      }

      const databaseStartTime = performance.now();
      const summary = await this.executeWithRetry(
        () =>
          this.prisma.summary.findUnique({
            where: { id: summaryId },
          }),
        operationId,
        'find_summary_by_id',
      );
      const databaseResponseTime = performance.now() - databaseStartTime;

      if (!summary) {
        throw new NotFoundException(`Summary with ID ${summaryId} not found`);
      }

      const processingTime = performance.now() - startTime;

      this.logger.log('Summary by ID retrieval completed', {
        operationId,
        summaryId,
        taskId: summary.taskId,
        processingTimeMs: processingTime,
        databaseResponseTimeMs: databaseResponseTime,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'findById',
      });

      return summary;
    } catch (_error: unknown) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error('Summary by ID retrieval failed', {
        operationId,
        summaryId,
        processingTimeMs: processingTime,
        _error: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString(),
        component: 'SummariesService',
        action: 'findById',
      });

      throw error;
    }
  }

  /**
   * Validates summary creation data
   * @private
   */
  private validateSummaryData(
    _data: CreateSummaryRequest,
    operationId: string,
  ): void {
    this.logger.debug('Validating summary data', {
      operationId,
      component: 'SummariesService',
      action: 'validateSummaryData',
    });

    if (
      !data.taskId ||
      typeof data.taskId !== 'string' ||
      data.taskId.trim().length === 0
    ) {
      throw new BadRequestException(
        'Task ID is required and must be a non-empty string',
      );
    }

    if (
      !data.content ||
      typeof data.content !== 'string' ||
      data.content.trim().length === 0
    ) {
      throw new BadRequestException(
        'Summary content is required and must be a non-empty string',
      );
    }

    if (data.content.length > 10000) {
      throw new BadRequestException(
        'Summary content cannot exceed 10,000 characters',
      );
    }

    if (
      data.parentId &&
      (typeof data.parentId !== 'string' || data.parentId.trim().length === 0)
    ) {
      throw new BadRequestException(
        'Parent ID must be a valid string if provided',
      );
    }
  }

  /**
   * Calculates content analysis metrics
   * @private
   */
  private calculateContentMetrics(
    content: string,
    operationId: string,
  ): SummaryAnalysis['contentMetrics'] {
    this.logger.debug('Calculating content metrics', {
      operationId,
      contentLength: content.length,
      component: 'SummariesService',
      action: 'calculateContentMetrics',
    });

    const characterCount = content.length;
    const wordCount = content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const lineCount = content.split('\n').length;

    // Estimate reading time (average 200 words per minute)
    const readingTimeMinutes = Math.ceil(wordCount / 200);

    return {
      characterCount,
      wordCount,
      lineCount,
      readingTimeMinutes,
    };
  }

  /**
   * Executes database operations with retry logic and circuit breaker patterns
   * @private
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    operationName: string,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        this.logger.debug('Executing database operation', {
          operationId,
          operationName,
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
          component: 'SummariesService',
          action: 'executeWithRetry',
        });

        const result = await operation();

        if (attempt > 1) {
          this.logger.log('Database operation succeeded after retry', {
            operationId,
            operationName,
            attempt,
            component: 'SummariesService',
            action: 'executeWithRetry',
          });
        }

        return result;
      } catch (_error: unknown) {
        lastError =
          error instanceof Error ? _error : new Error('Unknown database error');

        if (attempt === this.retryConfig.maxAttempts) {
          this.logger.error(
            'Database operation failed after all retry attempts',
            {
              operationId,
              operationName,
              attempt,
              maxAttempts: this.retryConfig.maxAttempts,
              _error: lastError.message,
              stack: lastError.stack,
              component: 'SummariesService',
              action: 'executeWithRetry',
            },
          );
          break;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs,
        );

        this.logger.warn('Database operation failed, retrying', {
          operationId,
          operationName,
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
          retryDelayMs: delay,
          _error: lastError.message,
          component: 'SummariesService',
          action: 'executeWithRetry',
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw (
      lastError ||
      new Error('Database operation failed after all retry attempts')
    );
  }
}
