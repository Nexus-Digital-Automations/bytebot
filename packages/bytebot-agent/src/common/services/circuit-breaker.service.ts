/**
 * Circuit Breaker Service - Enterprise-Grade Reliability Pattern
 *
 * Implements comprehensive circuit breaker pattern for external service calls
 * with configurable failure thresholds, timeouts, and fallback mechanisms.
 *
 * Based on Netflix Hystrix and AWS Architecture Best Practices
 * Specifications from research report: 50% failure rate, 60s timeout, 30s reset
 *
 * @author Reliability & Resilience Specialist
 * @version 1.0.0
 * @since Bytebot API Hardening Phase 1
 */

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, throwError, of, timer, EMPTY } from 'rxjs';
import { catchError, switchMap, timeout } from 'rxjs/operators';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit open, fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerConfig {
  /** Failure threshold percentage (0.0 - 1.0). Default: 0.5 (50%) */
  failureThreshold: number;
  /** Timeout in milliseconds before opening circuit. Default: 60000ms (60s) */
  timeout: number;
  /** Reset timeout in milliseconds before attempting recovery. Default: 30000ms (30s) */
  resetTimeout: number;
  /** Maximum number of calls in half-open state. Default: 10 */
  halfOpenMaxCalls: number;
  /** Minimum number of calls before calculating failure rate. Default: 10 */
  minimumThroughput: number;
  /** Sliding window size in milliseconds for failure rate calculation. Default: 60000ms */
  slidingWindowSize: number;
}

export interface CircuitBreakerMetrics {
  readonly circuitName: string;
  readonly state: CircuitBreakerState;
  readonly totalCalls: number;
  readonly successfulCalls: number;
  readonly failedCalls: number;
  readonly failureRate: number;
  readonly lastFailureTime: Date | null;
  readonly lastSuccessTime: Date | null;
  readonly stateTransitionTime: Date;
  readonly halfOpenCallsCount: number;
  readonly nextAttemptTime: Date | null;
  readonly config: CircuitBreakerConfig;
}

interface CircuitCall {
  timestamp: number;
  success: boolean;
  duration: number;
  error?: string;
}

interface CircuitState {
  state: CircuitBreakerState;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  stateTransitionTime: Date;
  halfOpenCallsCount: number;
  nextAttemptTime: Date | null;
  recentCalls: CircuitCall[];
  config: CircuitBreakerConfig;
}

/**
 * CircuitBreakerService - Centralized circuit breaker implementation
 *
 * Provides fail-fast behavior for external dependencies with automatic recovery.
 * Supports multiple named circuits with individual configurations.
 *
 * Key Features:
 * - Configurable failure thresholds and timeouts
 * - Sliding window failure rate calculation
 * - Automatic state transitions (CLOSED -> OPEN -> HALF_OPEN -> CLOSED)
 * - Comprehensive metrics and monitoring
 * - Fallback mechanism support
 * - Thread-safe operations
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly circuits = new Map<string, CircuitState>();
  private readonly defaultConfig: CircuitBreakerConfig;
  private readonly cleanupInterval: NodeJS.Timer;

  constructor(private readonly configService: ConfigService) {
    // Initialize default configuration from research report specifications
    this.defaultConfig = {
      failureThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_FAILURE_THRESHOLD',
        0.5, // 50% failure rate as specified in research report
      ),
      timeout: this.configService.get<number>(
        'CIRCUIT_BREAKER_TIMEOUT',
        60000, // 60 seconds as specified in research report
      ),
      resetTimeout: this.configService.get<number>(
        'CIRCUIT_BREAKER_RESET_TIMEOUT',
        30000, // 30 seconds as specified in research report
      ),
      halfOpenMaxCalls: this.configService.get<number>(
        'CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS',
        10,
      ),
      minimumThroughput: this.configService.get<number>(
        'CIRCUIT_BREAKER_MIN_THROUGHPUT',
        10,
      ),
      slidingWindowSize: this.configService.get<number>(
        'CIRCUIT_BREAKER_SLIDING_WINDOW',
        60000, // 1 minute sliding window
      ),
    };

    this.logger.log('Circuit Breaker Service initialized', {
      defaultConfig: this.defaultConfig,
      configuredCircuits: 0,
    });

    // Start periodic cleanup of old circuit data
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveCircuits();
    }, 300000); // Clean every 5 minutes
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param circuitName - Unique name for the circuit
   * @param operation - Function to execute (should return Promise)
   * @param fallback - Optional fallback function for when circuit is open
   * @param config - Optional circuit-specific configuration
   * @returns Promise with result or fallback value
   */
  async execute<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Circuit breaker execution started`, {
      circuitName,
      operationId,
    });

    const circuit = this.getOrCreateCircuit(circuitName, config);

    // Check if circuit allows execution
    if (!this.canExecute(circuit)) {
      const metrics = this.getCircuitMetrics(circuitName);

      this.logger.warn(
        `[${operationId}] Circuit breaker OPEN - execution blocked`,
        {
          circuitName,
          operationId,
          state: metrics.state,
          failureRate: metrics.failureRate,
          nextAttemptTime: metrics.nextAttemptTime,
        },
      );

      // Use fallback if available
      if (fallback) {
        this.logger.debug(`[${operationId}] Executing fallback function`, {
          circuitName,
          operationId,
        });

        try {
          const fallbackResult = await fallback();
          this.logger.debug(`[${operationId}] Fallback executed successfully`, {
            circuitName,
            operationId,
            duration: Date.now() - startTime,
          });
          return fallbackResult;
        } catch (fallbackError) {
          this.logger.error(`[${operationId}] Fallback execution failed`, {
            circuitName,
            operationId,
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError),
          });
          throw new ServiceUnavailableException(
            `Service ${circuitName} is currently unavailable and fallback failed`,
          );
        }
      }

      throw new ServiceUnavailableException(
        `Service ${circuitName} is currently unavailable - Circuit breaker is OPEN`,
      );
    }

    // Execute the operation with timeout
    try {
      const timeoutMs = circuit.config.timeout;
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Operation timeout')), timeoutMs),
        ),
      ]);

      // Record success
      this.recordSuccess(circuitName, Date.now() - startTime, operationId);

      return result;
    } catch (error) {
      // Record failure
      this.recordFailure(
        circuitName,
        error,
        Date.now() - startTime,
        operationId,
      );
      throw error;
    }
  }

  /**
   * Execute operation as Observable with circuit breaker protection
   */
  executeObservable<T>(
    circuitName: string,
    operation: () => Observable<T>,
    fallback?: () => Observable<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Observable<T> {
    const operationId = this.generateOperationId();
    const circuit = this.getOrCreateCircuit(circuitName, config);

    if (!this.canExecute(circuit)) {
      if (fallback) {
        this.logger.debug(`Circuit breaker OPEN - using fallback`, {
          circuitName,
          operationId,
        });
        return fallback();
      }

      return throwError(
        () =>
          new ServiceUnavailableException(
            `Service ${circuitName} is currently unavailable`,
          ),
      );
    }

    return operation().pipe(
      timeout(circuit.config.timeout),
      catchError((error) => {
        this.recordFailure(circuitName, error, 0, operationId);
        return throwError(() => error);
      }),
      switchMap((result) => {
        this.recordSuccess(circuitName, 0, operationId);
        return of(result);
      }),
    );
  }

  /**
   * Get current metrics for a circuit
   */
  getCircuitMetrics(circuitName: string): CircuitBreakerMetrics | null {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return null;
    }

    const failureRate = this.calculateFailureRate(circuit);

    return {
      circuitName,
      state: circuit.state,
      totalCalls: circuit.totalCalls,
      successfulCalls: circuit.successfulCalls,
      failedCalls: circuit.failedCalls,
      failureRate,
      lastFailureTime: circuit.lastFailureTime,
      lastSuccessTime: circuit.lastSuccessTime,
      stateTransitionTime: circuit.stateTransitionTime,
      halfOpenCallsCount: circuit.halfOpenCallsCount,
      nextAttemptTime: circuit.nextAttemptTime,
      config: circuit.config,
    };
  }

  /**
   * Get metrics for all circuits
   */
  getAllCircuitMetrics(): CircuitBreakerMetrics[] {
    const allMetrics: CircuitBreakerMetrics[] = [];

    for (const circuitName of Array.from(this.circuits.keys())) {
      const metrics = this.getCircuitMetrics(circuitName);
      if (metrics) {
        allMetrics.push(metrics);
      }
    }

    return allMetrics;
  }

  /**
   * Manually reset a circuit to closed state
   */
  resetCircuit(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return false;
    }

    this.logger.log('Manual circuit reset initiated', {
      circuitName,
      previousState: circuit.state,
    });

    circuit.state = CircuitBreakerState.CLOSED;
    circuit.totalCalls = 0;
    circuit.successfulCalls = 0;
    circuit.failedCalls = 0;
    circuit.halfOpenCallsCount = 0;
    circuit.nextAttemptTime = null;
    circuit.stateTransitionTime = new Date();
    circuit.recentCalls = [];

    return true;
  }

  /**
   * Force circuit to open state
   */
  openCircuit(circuitName: string): boolean {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return false;
    }

    this.logger.log('Manual circuit open initiated', {
      circuitName,
      previousState: circuit.state,
    });

    this.transitionToOpen(circuit, circuitName);
    return true;
  }

  /**
   * Check if circuit can execute requests
   */
  private canExecute(circuit: CircuitState): boolean {
    const now = new Date();

    switch (circuit.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (circuit.nextAttemptTime && now >= circuit.nextAttemptTime) {
          this.transitionToHalfOpen(circuit);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return circuit.halfOpenCallsCount < circuit.config.halfOpenMaxCalls;

      default:
        return false;
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(
    circuitName: string,
    duration: number,
    operationId: string,
  ): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return;
    }

    const now = Date.now();
    circuit.totalCalls++;
    circuit.successfulCalls++;
    circuit.lastSuccessTime = new Date(now);

    // Add to recent calls sliding window
    circuit.recentCalls.push({
      timestamp: now,
      success: true,
      duration,
    });

    this.cleanupOldCalls(circuit);

    this.logger.debug(`Circuit breaker - Success recorded`, {
      circuitName,
      operationId,
      state: circuit.state,
      duration,
      totalCalls: circuit.totalCalls,
    });

    // Handle state transitions
    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      const consecutiveSuccesses = this.getConsecutiveSuccesses(circuit);
      if (consecutiveSuccesses >= circuit.config.halfOpenMaxCalls) {
        this.transitionToClosed(circuit, circuitName);
      }
    }
  }

  /**
   * Record failed operation
   */
  private recordFailure(
    circuitName: string,
    error: any,
    duration: number,
    operationId: string,
  ): void {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      return;
    }

    const now = Date.now();
    circuit.totalCalls++;
    circuit.failedCalls++;
    circuit.lastFailureTime = new Date(now);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Add to recent calls sliding window
    circuit.recentCalls.push({
      timestamp: now,
      success: false,
      duration,
      error: errorMessage,
    });

    this.cleanupOldCalls(circuit);

    this.logger.warn(`Circuit breaker - Failure recorded`, {
      circuitName,
      operationId,
      state: circuit.state,
      error: errorMessage,
      duration,
      totalCalls: circuit.totalCalls,
    });

    // Check if we should open the circuit
    if (this.shouldOpenCircuit(circuit)) {
      this.transitionToOpen(circuit, circuitName);
    }
  }

  /**
   * Get or create circuit state
   */
  private getOrCreateCircuit(
    circuitName: string,
    config?: Partial<CircuitBreakerConfig>,
  ): CircuitState {
    let circuit = this.circuits.get(circuitName);

    if (!circuit) {
      const finalConfig = { ...this.defaultConfig, ...config };

      circuit = {
        state: CircuitBreakerState.CLOSED,
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        lastFailureTime: null,
        lastSuccessTime: null,
        stateTransitionTime: new Date(),
        halfOpenCallsCount: 0,
        nextAttemptTime: null,
        recentCalls: [],
        config: finalConfig,
      };

      this.circuits.set(circuitName, circuit);

      this.logger.debug('Created new circuit', {
        circuitName,
        config: finalConfig,
      });
    }

    return circuit;
  }

  /**
   * Calculate current failure rate from sliding window
   */
  private calculateFailureRate(circuit: CircuitState): number {
    const now = Date.now();
    const windowStart = now - circuit.config.slidingWindowSize;

    const recentCalls = circuit.recentCalls.filter(
      (call) => call.timestamp >= windowStart,
    );

    if (recentCalls.length === 0) {
      return 0;
    }

    const failedCalls = recentCalls.filter((call) => !call.success).length;
    return failedCalls / recentCalls.length;
  }

  /**
   * Check if circuit should transition to open state
   */
  private shouldOpenCircuit(circuit: CircuitState): boolean {
    if (
      circuit.state !== CircuitBreakerState.CLOSED &&
      circuit.state !== CircuitBreakerState.HALF_OPEN
    ) {
      return false;
    }

    const failureRate = this.calculateFailureRate(circuit);
    const hasMinimumThroughput =
      circuit.totalCalls >= circuit.config.minimumThroughput;

    return (
      hasMinimumThroughput && failureRate >= circuit.config.failureThreshold
    );
  }

  /**
   * Transition circuit to OPEN state
   */
  private transitionToOpen(circuit: CircuitState, circuitName: string): void {
    const previousState = circuit.state;
    circuit.state = CircuitBreakerState.OPEN;
    circuit.stateTransitionTime = new Date();
    circuit.nextAttemptTime = new Date(
      Date.now() + circuit.config.resetTimeout,
    );
    circuit.halfOpenCallsCount = 0;

    this.logger.warn('Circuit breaker opened', {
      circuitName,
      previousState,
      failureRate: this.calculateFailureRate(circuit),
      nextAttemptTime: circuit.nextAttemptTime,
    });
  }

  /**
   * Transition circuit to HALF_OPEN state
   */
  private transitionToHalfOpen(circuit: CircuitState): void {
    circuit.state = CircuitBreakerState.HALF_OPEN;
    circuit.stateTransitionTime = new Date();
    circuit.halfOpenCallsCount = 0;
    circuit.nextAttemptTime = null;
  }

  /**
   * Transition circuit to CLOSED state
   */
  private transitionToClosed(circuit: CircuitState, circuitName: string): void {
    const previousState = circuit.state;
    circuit.state = CircuitBreakerState.CLOSED;
    circuit.stateTransitionTime = new Date();
    circuit.halfOpenCallsCount = 0;
    circuit.nextAttemptTime = null;

    this.logger.log('Circuit breaker closed', {
      circuitName,
      previousState,
      totalCalls: circuit.totalCalls,
      successfulCalls: circuit.successfulCalls,
    });
  }

  /**
   * Get consecutive successes in recent calls
   */
  private getConsecutiveSuccesses(circuit: CircuitState): number {
    let count = 0;

    for (let i = circuit.recentCalls.length - 1; i >= 0; i--) {
      if (circuit.recentCalls[i].success) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Clean up old calls outside sliding window
   */
  private cleanupOldCalls(circuit: CircuitState): void {
    const now = Date.now();
    const windowStart = now - circuit.config.slidingWindowSize;

    circuit.recentCalls = circuit.recentCalls.filter(
      (call) => call.timestamp >= windowStart,
    );
  }

  /**
   * Clean up inactive circuits
   */
  private cleanupInactiveCircuits(): void {
    const maxInactiveTime = 3600000; // 1 hour
    const now = Date.now();

    for (const [circuitName, circuit] of Array.from(this.circuits.entries())) {
      const lastActivity = Math.max(
        circuit.lastFailureTime?.getTime() || 0,
        circuit.lastSuccessTime?.getTime() || 0,
        circuit.stateTransitionTime.getTime(),
      );

      if (now - lastActivity > maxInactiveTime) {
        this.circuits.delete(circuitName);
        this.logger.debug('Cleaned up inactive circuit', { circuitName });
      }
    }
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `cb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Cleanup resources on service destruction
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval as NodeJS.Timeout);
    }
    this.circuits.clear();
    this.logger.log('Circuit Breaker Service destroyed');
  }
}
