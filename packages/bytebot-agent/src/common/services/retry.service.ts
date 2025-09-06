/**
 * Retry Service - Enterprise-Grade Retry Logic with Exponential Backoff
 *
 * Implements sophisticated retry mechanisms with exponential backoff, jitter,
 * and configurable retry policies for various operation types.
 *
 * Research report specifications:
 * - Max attempts: 3
 * - Backoff multiplier: 2x
 * - Base delay: 1000ms
 * - Max delay: 30000ms
 * - Jitter for distributed systems
 *
 * @author Reliability & Resilience Specialist
 * @version 1.0.0
 * @since Bytebot API Hardening Phase 1
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, timer, of, EMPTY } from 'rxjs';
import { mergeMap, retryWhen, tap, delay, switchMap } from 'rxjs/operators';

export interface RetryConfig {
  /** Maximum number of retry attempts. Default: 3 */
  maxAttempts: number;
  /** Base delay in milliseconds before first retry. Default: 1000ms */
  baseDelay: number;
  /** Maximum delay in milliseconds between retries. Default: 30000ms (30s) */
  maxDelay: number;
  /** Exponential backoff multiplier. Default: 2 */
  backoffMultiplier: number;
  /** Whether to add jitter to delays. Default: true */
  useJitter: boolean;
  /** Jitter range (0.0 - 1.0). Default: 0.1 (10% jitter) */
  jitterRange: number;
  /** Custom retry condition function. Default: retry on all errors */
  retryCondition?: (error: any, attempt: number) => boolean;
  /** Custom delay calculation function. Default: exponential backoff */
  delayCalculator?: (
    attempt: number,
    baseDelay: number,
    multiplier: number,
  ) => number;
}

export interface RetryMetrics {
  readonly operationId: string;
  readonly totalAttempts: number;
  readonly successfulAttempt: number | null;
  readonly totalDuration: number;
  readonly delays: number[];
  readonly errors: string[];
  readonly finalSuccess: boolean;
  readonly startTime: Date;
  readonly endTime: Date | null;
}

interface RetryState {
  operationId: string;
  attempt: number;
  startTime: number;
  delays: number[];
  errors: string[];
  config: RetryConfig;
}

/**
 * RetryService - Centralized retry logic with exponential backoff
 *
 * Provides robust retry mechanisms for various operation types with:
 * - Exponential backoff with configurable multiplier
 * - Jitter to prevent thundering herd problems
 * - Comprehensive retry metrics and logging
 * - Custom retry conditions and delay calculations
 * - Observable and Promise-based APIs
 *
 * Key Features:
 * - Research report compliant configuration (3 max attempts, 2x multiplier, etc.)
 * - Distributed systems jitter for load spreading
 * - Comprehensive error classification and retry decisions
 * - Detailed metrics for monitoring and optimization
 * - Type-safe operation execution
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly defaultConfig: RetryConfig;
  private readonly retryMetrics = new Map<string, RetryMetrics>();

  constructor(private readonly configService: ConfigService) {
    // Initialize configuration based on research report specifications
    this.defaultConfig = {
      maxAttempts: this.configService.get<number>('RETRY_MAX_ATTEMPTS', 3),
      baseDelay: this.configService.get<number>('RETRY_BASE_DELAY', 1000), // 1 second
      maxDelay: this.configService.get<number>('RETRY_MAX_DELAY', 30000), // 30 seconds
      backoffMultiplier: this.configService.get<number>(
        'RETRY_BACKOFF_MULTIPLIER',
        2,
      ),
      useJitter: this.configService.get<boolean>('RETRY_USE_JITTER', true),
      jitterRange: this.configService.get<number>('RETRY_JITTER_RANGE', 0.1),
      retryCondition: this.defaultRetryCondition.bind(this),
      delayCalculator: this.exponentialBackoffDelay.bind(this),
    };

    this.logger.log('Retry Service initialized with enterprise configuration', {
      defaultConfig: {
        maxAttempts: this.defaultConfig.maxAttempts,
        baseDelay: this.defaultConfig.baseDelay,
        maxDelay: this.defaultConfig.maxDelay,
        backoffMultiplier: this.defaultConfig.backoffMultiplier,
        useJitter: this.defaultConfig.useJitter,
        jitterRange: this.defaultConfig.jitterRange,
      },
    });

    // Start periodic cleanup of old metrics
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 600000); // Clean every 10 minutes
  }

  /**
   * Execute operation with retry logic (Promise-based)
   *
   * @param operation - Async function to execute with retry
   * @param config - Optional retry configuration
   * @returns Promise with operation result
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>,
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const finalConfig = { ...this.defaultConfig, ...config };
    const retryState: RetryState = {
      operationId,
      attempt: 0,
      startTime: Date.now(),
      delays: [],
      errors: [],
      config: finalConfig,
    };

    this.logger.debug(`Starting retry operation`, {
      operationId,
      maxAttempts: finalConfig.maxAttempts,
      baseDelay: finalConfig.baseDelay,
    });

    let lastError: any;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      retryState.attempt = attempt;

      try {
        this.logger.debug(`Attempt ${attempt}/${finalConfig.maxAttempts}`, {
          operationId,
          attempt,
        });

        const result = await operation();

        // Record success metrics
        this.recordSuccessMetrics(retryState, result);

        this.logger.debug(`Operation succeeded on attempt ${attempt}`, {
          operationId,
          attempt,
          totalDuration: Date.now() - retryState.startTime,
        });

        return result;
      } catch (error) {
        lastError = error;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        retryState.errors.push(errorMessage);

        this.logger.warn(
          `Attempt ${attempt}/${finalConfig.maxAttempts} failed`,
          {
            operationId,
            attempt,
            error: errorMessage,
          },
        );

        // Check if we should retry this error
        if (!finalConfig.retryCondition!(error, attempt)) {
          this.logger.debug('Error not retryable, stopping attempts', {
            operationId,
            attempt,
            error: errorMessage,
          });
          break;
        }

        // Don't delay after the last attempt
        if (attempt < finalConfig.maxAttempts) {
          const delay = this.calculateDelay(attempt, finalConfig);
          retryState.delays.push(delay);

          this.logger.debug(`Waiting ${delay}ms before next attempt`, {
            operationId,
            attempt,
            delay,
            nextAttempt: attempt + 1,
          });

          await this.sleep(delay);
        }
      }
    }

    // Record failure metrics
    this.recordFailureMetrics(retryState, lastError);

    this.logger.error(
      `Operation failed after ${finalConfig.maxAttempts} attempts`,
      {
        operationId,
        totalDuration: Date.now() - retryState.startTime,
        totalAttempts: retryState.attempt,
        errors: retryState.errors,
      },
    );

    throw lastError;
  }

  /**
   * Execute operation with retry logic (Observable-based)
   *
   * @param operation - Observable factory function
   * @param config - Optional retry configuration
   * @returns Observable with retry logic applied
   */
  executeObservableWithRetry<T>(
    operation: () => Observable<T>,
    config?: Partial<RetryConfig>,
  ): Observable<T> {
    const operationId = this.generateOperationId();
    const finalConfig = { ...this.defaultConfig, ...config };

    this.logger.debug(`Starting retry observable operation`, {
      operationId,
      maxAttempts: finalConfig.maxAttempts,
    });

    let attempt = 0;
    const startTime = Date.now();

    return operation().pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error) => {
            attempt++;

            const errorMessage =
              error instanceof Error ? error.message : String(error);

            this.logger.warn(
              `Observable attempt ${attempt}/${finalConfig.maxAttempts} failed`,
              {
                operationId,
                attempt,
                error: errorMessage,
              },
            );

            if (attempt >= finalConfig.maxAttempts) {
              this.logger.error(
                `Observable operation failed after ${finalConfig.maxAttempts} attempts`,
                {
                  operationId,
                  totalDuration: Date.now() - startTime,
                  finalError: errorMessage,
                },
              );
              return throwError(() => error);
            }

            if (!finalConfig.retryCondition!(error, attempt)) {
              this.logger.debug('Observable error not retryable', {
                operationId,
                attempt,
                error: errorMessage,
              });
              return throwError(() => error);
            }

            const delay = this.calculateDelay(attempt, finalConfig);

            this.logger.debug(`Observable waiting ${delay}ms before retry`, {
              operationId,
              attempt,
              delay,
            });

            return timer(delay);
          }),
        ),
      ),
      tap({
        next: () => {
          this.logger.debug(`Observable operation succeeded`, {
            operationId,
            totalAttempts: attempt + 1,
            totalDuration: Date.now() - startTime,
          });
        },
      }),
    );
  }

  /**
   * Get retry metrics for monitoring
   */
  getRetryMetrics(operationId: string): RetryMetrics | null {
    return this.retryMetrics.get(operationId) || null;
  }

  /**
   * Get all retry metrics
   */
  getAllRetryMetrics(): RetryMetrics[] {
    return Array.from(this.retryMetrics.values());
  }

  /**
   * Create predefined retry configurations for common scenarios
   */
  static readonly PresetConfigs = {
    /**
     * Fast retry for lightweight operations
     * 3 attempts, 500ms base, 5s max delay
     */
    FAST: {
      maxAttempts: 3,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 1.5,
    } as Partial<RetryConfig>,

    /**
     * Standard retry for most operations (default from research report)
     * 3 attempts, 1s base, 30s max delay
     */
    STANDARD: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    } as Partial<RetryConfig>,

    /**
     * Slow retry for heavy operations
     * 5 attempts, 2s base, 60s max delay
     */
    SLOW: {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffMultiplier: 2.5,
    } as Partial<RetryConfig>,

    /**
     * Database retry configuration
     * 4 attempts, 1s base, 15s max delay
     */
    DATABASE: {
      maxAttempts: 4,
      baseDelay: 1000,
      maxDelay: 15000,
      backoffMultiplier: 2,
      retryCondition: (error: any) => {
        // Retry on connection errors, timeouts, and temporary failures
        const errorMessage = error?.message?.toLowerCase() || '';
        return (
          errorMessage.includes('connection') ||
          errorMessage.includes('timeout') ||
          errorMessage.includes('temporary') ||
          errorMessage.includes('unavailable')
        );
      },
    } as Partial<RetryConfig>,

    /**
     * HTTP request retry configuration
     * 3 attempts, 1s base, 10s max delay
     */
    HTTP: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryCondition: (error: any) => {
        // Retry on 5xx errors, network errors, timeouts
        const status = error?.status || error?.response?.status;
        return (
          status >= 500 ||
          error?.code === 'ECONNRESET' ||
          error?.code === 'ETIMEDOUT' ||
          error?.message?.includes('timeout')
        );
      },
    } as Partial<RetryConfig>,
  };

  /**
   * Calculate delay for next retry attempt
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay = config.delayCalculator!(
      attempt,
      config.baseDelay,
      config.backoffMultiplier,
    );

    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);

    // Add jitter if configured
    if (config.useJitter) {
      delay = this.addJitter(delay, config.jitterRange);
    }

    return delay;
  }

  /**
   * Default exponential backoff delay calculation
   */
  private exponentialBackoffDelay(
    attempt: number,
    baseDelay: number,
    multiplier: number,
  ): number {
    return baseDelay * Math.pow(multiplier, attempt - 1);
  }

  /**
   * Add jitter to delay to prevent thundering herd
   */
  private addJitter(delay: number, jitterRange: number): number {
    const jitterAmount = delay * jitterRange;
    const randomJitter = (Math.random() * 2 - 1) * jitterAmount; // -jitter to +jitter
    return Math.max(0, Math.round(delay + randomJitter));
  }

  /**
   * Default retry condition - retry most errors except explicit business logic errors
   */
  private defaultRetryCondition(error: any, attempt: number): boolean {
    // Don't retry validation errors (4xx) or authentication errors
    if (error?.status >= 400 && error?.status < 500) {
      return false;
    }

    // Don't retry if explicitly marked as non-retryable
    if (error?.retryable === false) {
      return false;
    }

    // Retry everything else (5xx, network errors, timeouts, etc.)
    return true;
  }

  /**
   * Record successful operation metrics
   */
  private recordSuccessMetrics<T>(retryState: RetryState, result: T): void {
    const metrics: RetryMetrics = {
      operationId: retryState.operationId,
      totalAttempts: retryState.attempt,
      successfulAttempt: retryState.attempt,
      totalDuration: Date.now() - retryState.startTime,
      delays: retryState.delays,
      errors: retryState.errors,
      finalSuccess: true,
      startTime: new Date(retryState.startTime),
      endTime: new Date(),
    };

    this.retryMetrics.set(retryState.operationId, metrics);
  }

  /**
   * Record failed operation metrics
   */
  private recordFailureMetrics(retryState: RetryState, finalError: any): void {
    const metrics: RetryMetrics = {
      operationId: retryState.operationId,
      totalAttempts: retryState.attempt,
      successfulAttempt: null,
      totalDuration: Date.now() - retryState.startTime,
      delays: retryState.delays,
      errors: retryState.errors,
      finalSuccess: false,
      startTime: new Date(retryState.startTime),
      endTime: new Date(),
    };

    this.retryMetrics.set(retryState.operationId, metrics);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const maxAge = 3600000; // 1 hour
    const now = Date.now();

    for (const [operationId, metrics] of Array.from(
      this.retryMetrics.entries(),
    )) {
      const age = now - metrics.startTime.getTime();
      if (age > maxAge) {
        this.retryMetrics.delete(operationId);
      }
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
