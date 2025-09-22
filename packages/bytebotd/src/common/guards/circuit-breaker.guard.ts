/**
 * Circuit Breaker Guard - ByteBotd Database Resilience Pattern
 * Implements circuit breaker pattern to protect against database failures
 * and cascade failures in the ByteBotd computer control platform
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Enterprise Resilience Implementation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures to trigger open state
  failureRate: number; // Percentage of failures to trigger open state
  successThreshold: number; // Number of successes needed to close circuit
  timeout: number; // Time in ms before attempting recovery
  monitoringWindow: number; // Time window for failure rate calculation
  maxAttempts: number; // Maximum attempts in half-open state
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  failureRate: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  stateChangedAt: Date;
  halfOpenAttempts: number;
  nextRetryTime: Date | null;
}

/**
 * Decorator to enable circuit breaker protection on routes or controllers
 */
export const UseCircuitBreaker = (config?: Partial<CircuitBreakerConfig>) => {
  return (
    target: object,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey && descriptor) {
      // Method decorator
      Reflect.defineMetadata(
        'circuit-breaker-config',
        config || {},
        target,
        propertyKey,
      );
    } else {
      // Class decorator
      Reflect.defineMetadata('circuit-breaker-config', config || {}, target);
    }
  };
};

@Injectable()
export class CircuitBreakerGuard implements CanActivate {
  private readonly logger = new Logger(CircuitBreakerGuard.name);
  private readonly circuits = new Map<string, CircuitBreakerMetrics>();
  private readonly defaultConfig: CircuitBreakerConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.defaultConfig = {
      failureThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_FAILURE_THRESHOLD',
        5,
      ),
      failureRate: this.configService.get<number>(
        'CIRCUIT_BREAKER_FAILURE_RATE',
        50,
      ),
      successThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_SUCCESS_THRESHOLD',
        3,
      ),
      timeout: this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000), // 60 seconds
      monitoringWindow: this.configService.get<number>(
        'CIRCUIT_BREAKER_MONITORING_WINDOW',
        60000,
      ), // 60 seconds
      maxAttempts: this.configService.get<number>(
        'CIRCUIT_BREAKER_MAX_ATTEMPTS',
        5,
      ),
    };

    this.logger.log('Circuit Breaker Guard initialized for ByteBotd');
    this.logger.log(`Default config: ${JSON.stringify(this.defaultConfig)}`);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const _request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get circuit breaker configuration from metadata
    const methodConfig =
      this.reflector.get<Partial<CircuitBreakerConfig>>(
        'circuit-breaker-config',
        handler,
      ) || {};
    const classConfig =
      this.reflector.get<Partial<CircuitBreakerConfig>>(
        'circuit-breaker-config',
        controller,
      ) || {};

    const config = {
      ...this.defaultConfig,
      ...classConfig,
      ...methodConfig,
    };

    // Create circuit key based on controller and method
    const circuitKey = `${controller.name}.${handler.name}`;

    // Get or create circuit metrics
    let metrics = this.circuits.get(circuitKey);
    if (!metrics) {
      metrics = this.createInitialMetrics();
      this.circuits.set(circuitKey, metrics);
    }

    // Clean old metrics
    this.cleanOldMetrics(metrics, config);

    // Check circuit state and handle accordingly
    try {
      const canProceed = await this.checkCircuitState(metrics, config);

      if (!canProceed) {
        this.logger.warn(
          `Circuit breaker OPEN for ${circuitKey} - failing fast. ` +
            `Failures: ${metrics.failureCount}, Rate: ${metrics.failureRate.toFixed(2)}%`,
        );
        throw new ServiceUnavailableException({
          message: 'Service temporarily unavailable due to circuit breaker',
          circuitKey,
          state: metrics.state,
          retryAfter: metrics.nextRetryTime,
          metrics: {
            failureCount: metrics.failureCount,
            failureRate: metrics.failureRate,
            lastFailureTime: metrics.lastFailureTime,
          },
        });
      }

      // If in half-open state, increment attempt counter
      if (metrics.state === CircuitBreakerState.HALF_OPEN) {
        metrics.halfOpenAttempts++;
      }

      return true;
    } catch (error) {
      // Record failure and potentially open circuit
      this.recordFailure(metrics, config);
      throw error;
    }
  }

  /**
   * Record a successful operation
   */
  recordSuccess(circuitKey: string): void {
    const metrics = this.circuits.get(circuitKey);
    if (!metrics) return;

    metrics.successCount++;
    metrics.totalRequests++;
    metrics.lastSuccessTime = new Date();

    // Calculate failure rate
    this.updateFailureRate(metrics);

    // Check if we should close the circuit
    if (metrics.state === CircuitBreakerState.HALF_OPEN) {
      const config = this.defaultConfig; // Use default for success recording
      if (metrics.halfOpenAttempts >= config.successThreshold) {
        this.closeCircuit(metrics);
      }
    }

    this.logger.debug(
      `Success recorded for ${circuitKey} - ` +
        `State: ${metrics.state}, Success: ${metrics.successCount}, ` +
        `Failures: ${metrics.failureCount}, Rate: ${metrics.failureRate.toFixed(2)}%`,
    );
  }

  /**
   * Record a failed operation
   */
  recordFailure(
    metrics: CircuitBreakerMetrics,
    config: CircuitBreakerConfig,
  ): void {
    metrics.failureCount++;
    metrics.totalRequests++;
    metrics.lastFailureTime = new Date();

    // Update failure rate
    this.updateFailureRate(metrics);

    // Check if we should open the circuit
    if (metrics.state === CircuitBreakerState.CLOSED) {
      if (
        metrics.failureCount >= config.failureThreshold ||
        metrics.failureRate >= config.failureRate
      ) {
        this.openCircuit(metrics, config);
      }
    } else if (metrics.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.openCircuit(metrics, config);
    }
  }

  /**
   * Check if the circuit allows requests to proceed
   */
  private async checkCircuitState(
    metrics: CircuitBreakerMetrics,
    config: CircuitBreakerConfig,
  ): Promise<boolean> {
    const now = new Date();

    switch (metrics.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        if (metrics.nextRetryTime && now >= metrics.nextRetryTime) {
          this.halfOpenCircuit(metrics);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        return metrics.halfOpenAttempts < config.maxAttempts;

      default:
        return false;
    }
  }

  /**
   * Open the circuit breaker
   */
  private openCircuit(
    metrics: CircuitBreakerMetrics,
    config: CircuitBreakerConfig,
  ): void {
    metrics.state = CircuitBreakerState.OPEN;
    metrics.stateChangedAt = new Date();
    metrics.nextRetryTime = new Date(Date.now() + config.timeout);
    metrics.halfOpenAttempts = 0;

    this.logger.warn(
      `Circuit breaker OPENED - ` +
        `Failures: ${metrics.failureCount}, Rate: ${metrics.failureRate.toFixed(2)}%, ` +
        `Retry after: ${metrics.nextRetryTime.toISOString()}`,
    );
  }

  /**
   * Move circuit to half-open state
   */
  private halfOpenCircuit(metrics: CircuitBreakerMetrics): void {
    metrics.state = CircuitBreakerState.HALF_OPEN;
    metrics.stateChangedAt = new Date();
    metrics.halfOpenAttempts = 0;
    metrics.nextRetryTime = null;

    this.logger.log(
      'Circuit breaker moved to HALF_OPEN state - testing recovery',
    );
  }

  /**
   * Close the circuit breaker
   */
  private closeCircuit(metrics: CircuitBreakerMetrics): void {
    metrics.state = CircuitBreakerState.CLOSED;
    metrics.stateChangedAt = new Date();
    metrics.halfOpenAttempts = 0;
    metrics.nextRetryTime = null;

    // Reset failure counters
    metrics.failureCount = 0;
    metrics.successCount = 0;
    metrics.totalRequests = 0;
    metrics.failureRate = 0;

    this.logger.log('Circuit breaker CLOSED - service recovered');
  }

  /**
   * Update failure rate calculation
   */
  private updateFailureRate(metrics: CircuitBreakerMetrics): void {
    if (metrics.totalRequests === 0) {
      metrics.failureRate = 0;
    } else {
      metrics.failureRate =
        (metrics.failureCount / metrics.totalRequests) * 100;
    }
  }

  /**
   * Create initial circuit metrics
   */
  private createInitialMetrics(): CircuitBreakerMetrics {
    return {
      state: CircuitBreakerState.CLOSED,
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      failureRate: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      stateChangedAt: new Date(),
      halfOpenAttempts: 0,
      nextRetryTime: null,
    };
  }

  /**
   * Clean old metrics based on monitoring window
   */
  private cleanOldMetrics(
    metrics: CircuitBreakerMetrics,
    config: CircuitBreakerConfig,
  ): void {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.monitoringWindow);

    // Only clean if we have activity and it's outside the window
    if (
      metrics.lastFailureTime &&
      metrics.lastFailureTime < windowStart &&
      metrics.lastSuccessTime &&
      metrics.lastSuccessTime < windowStart
    ) {
      // Reset counters but keep state
      metrics.totalRequests = 0;
      metrics.successCount = 0;
      metrics.failureCount = 0;
      metrics.failureRate = 0;

      this.logger.debug(
        'Circuit breaker metrics cleaned due to monitoring window expiry',
      );
    }
  }

  /**
   * Get circuit metrics for monitoring
   */
  getCircuitMetrics(
    circuitKey?: string,
  ): Map<string, CircuitBreakerMetrics> | CircuitBreakerMetrics | undefined {
    if (circuitKey) {
      return this.circuits.get(circuitKey);
    }
    return this.circuits;
  }

  /**
   * Get circuit health summary
   */
  getHealthSummary(): {
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    closedCircuits: number;
    unhealthyCircuits: string[];
  } {
    const summary = {
      totalCircuits: this.circuits.size,
      openCircuits: 0,
      halfOpenCircuits: 0,
      closedCircuits: 0,
      unhealthyCircuits: [] as string[],
    };

    for (const [key, metrics] of this.circuits.entries()) {
      switch (metrics.state) {
        case CircuitBreakerState.OPEN:
          summary.openCircuits++;
          summary.unhealthyCircuits.push(key);
          break;
        case CircuitBreakerState.HALF_OPEN:
          summary.halfOpenCircuits++;
          break;
        case CircuitBreakerState.CLOSED:
          summary.closedCircuits++;
          break;
      }
    }

    return summary;
  }

  /**
   * Force circuit state for testing/emergency
   */
  forceCircuitState(circuitKey: string, state: CircuitBreakerState): void {
    const metrics = this.circuits.get(circuitKey);
    if (!metrics) {
      this.logger.warn(`Cannot force state for unknown circuit: ${circuitKey}`);
      return;
    }

    const oldState = metrics.state;
    metrics.state = state;
    metrics.stateChangedAt = new Date();

    if (state === CircuitBreakerState.CLOSED) {
      metrics.failureCount = 0;
      metrics.successCount = 0;
      metrics.totalRequests = 0;
      metrics.failureRate = 0;
    }

    this.logger.warn(
      `Circuit breaker state forced: ${circuitKey} ${oldState} -> ${state}`,
    );
  }
}
