/**
 * Circuit Breaker Guard - Enterprise Database Resilience Pattern
 * Implements circuit breaker pattern to protect against database failures
 * and cascade failures in the Bytebot API platform
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  ServiceUnavailableException,
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
    target: any,
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
        0.5,
      ), // 50%
      successThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_SUCCESS_THRESHOLD',
        3,
      ),
      timeout: this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000), // 1 minute
      monitoringWindow: this.configService.get<number>(
        'CIRCUIT_BREAKER_MONITORING_WINDOW',
        300000,
      ), // 5 minutes
      maxAttempts: this.configService.get<number>(
        'CIRCUIT_BREAKER_MAX_ATTEMPTS',
        3,
      ),
    };

    this.logger.log('Circuit breaker guard initialized', {
      defaultConfig: this.defaultConfig,
    });

    // Start periodic cleanup of old circuit data
    this.startCleanupInterval();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get circuit breaker configuration
    const handlerConfig = this.reflector.get<Partial<CircuitBreakerConfig>>(
      'circuit-breaker-config',
      handler,
    );
    const controllerConfig = this.reflector.get<Partial<CircuitBreakerConfig>>(
      'circuit-breaker-config',
      controller,
    );

    if (!handlerConfig && !controllerConfig) {
      // No circuit breaker configuration, allow request
      return true;
    }

    const config = {
      ...this.defaultConfig,
      ...controllerConfig,
      ...handlerConfig,
    };
    const circuitKey = this.generateCircuitKey(request, handler, controller);

    // Get or create circuit metrics
    const circuit = this.getOrCreateCircuit(circuitKey, config);

    // Check if circuit allows the request
    const canProceed = this.canProceed(circuit, config);

    if (!canProceed) {
      this.logger.warn(`Circuit breaker OPEN - Request blocked`, {
        circuitKey,
        state: circuit.state,
        failureRate: circuit.failureRate,
        nextRetryTime: circuit.nextRetryTime,
      });

      throw new ServiceUnavailableException(
        'Service temporarily unavailable - Circuit breaker is open',
      );
    }

    // If in half-open state, increment attempt counter
    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      circuit.halfOpenAttempts++;
      this.logger.debug(
        `Circuit breaker HALF_OPEN - Attempt ${circuit.halfOpenAttempts}`,
        {
          circuitKey,
          maxAttempts: config.maxAttempts,
        },
      );
    }

    return true;
  }

  /**
   * Record successful operation - call this after successful database operations
   */
  recordSuccess(circuitKey: string) {
    const circuit = this.circuits.get(circuitKey);
    if (!circuit) {
      return;
    }

    const operationId = this.generateOperationId();

    circuit.successCount++;
    circuit.totalRequests++;
    circuit.lastSuccessTime = new Date();

    this.logger.debug(`[${operationId}] Circuit breaker - Success recorded`, {
      circuitKey,
      state: circuit.state,
      successCount: circuit.successCount,
      operationId,
    });

    // Update failure rate
    this.updateFailureRate(circuit);

    // Handle state transitions
    if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      const config = this.getConfigForCircuit(circuitKey);
      if (circuit.successCount >= config.successThreshold) {
        this.transitionToState(circuit, CircuitBreakerState.CLOSED, circuitKey);
        circuit.halfOpenAttempts = 0;
      }
    }
  }

  /**
   * Record failed operation - call this after failed database operations
   */
  recordFailure(circuitKey: string, error?: Error) {
    const circuit = this.circuits.get(circuitKey);
    if (!circuit) {
      return;
    }

    const operationId = this.generateOperationId();

    circuit.failureCount++;
    circuit.totalRequests++;
    circuit.lastFailureTime = new Date();

    this.logger.warn(`[${operationId}] Circuit breaker - Failure recorded`, {
      circuitKey,
      state: circuit.state,
      failureCount: circuit.failureCount,
      error: error?.message,
      operationId,
    });

    // Update failure rate
    this.updateFailureRate(circuit);

    const config = this.getConfigForCircuit(circuitKey);

    // Check if we should open the circuit
    if (circuit.state === CircuitBreakerState.CLOSED) {
      if (this.shouldOpenCircuit(circuit, config)) {
        this.transitionToState(circuit, CircuitBreakerState.OPEN, circuitKey);
        circuit.nextRetryTime = new Date(Date.now() + config.timeout);
      }
    } else if (circuit.state === CircuitBreakerState.HALF_OPEN) {
      // Failed during half-open, go back to open
      this.transitionToState(circuit, CircuitBreakerState.OPEN, circuitKey);
      circuit.nextRetryTime = new Date(Date.now() + config.timeout);
      circuit.halfOpenAttempts = 0;
    }
  }

  /**
   * Get circuit breaker metrics for monitoring
   */
  getCircuitMetrics(circuitKey: string): CircuitBreakerMetrics | null {
    return this.circuits.get(circuitKey) || null;
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllCircuitMetrics(): Map<string, CircuitBreakerMetrics> {
    return new Map(this.circuits);
  }

  /**
   * Reset circuit breaker to closed state (for manual intervention)
   */
  resetCircuit(circuitKey: string) {
    const circuit = this.circuits.get(circuitKey);
    if (!circuit) {
      return;
    }

    this.logger.log(`Manual circuit breaker reset`, { circuitKey });

    circuit.state = CircuitBreakerState.CLOSED;
    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.totalRequests = 0;
    circuit.failureRate = 0;
    circuit.halfOpenAttempts = 0;
    circuit.nextRetryTime = null;
    circuit.stateChangedAt = new Date();
  }

  /**
   * Check if request can proceed based on circuit state
   */
  private canProceed(
    circuit: CircuitBreakerMetrics,
    config: CircuitBreakerConfig,
  ): boolean {
    const now = new Date();

    switch (circuit.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        // Check if enough time has passed to try recovery
        if (circuit.nextRetryTime && now >= circuit.nextRetryTime) {
          this.transitionToState(
            circuit,
            CircuitBreakerState.HALF_OPEN,
            'timeout_recovery',
          );
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        // Allow limited requests in half-open state
        return circuit.halfOpenAttempts < config.maxAttempts;

      default:
        return false;
    }
  }

  /**
   * Check if circuit should be opened based on failure criteria
   */
  private shouldOpenCircuit(
    circuit: CircuitBreakerMetrics,
    config: CircuitBreakerConfig,
  ): boolean {
    // Check failure count threshold
    if (circuit.failureCount >= config.failureThreshold) {
      return true;
    }

    // Check failure rate threshold (only if we have enough samples)
    if (circuit.totalRequests >= config.failureThreshold) {
      return circuit.failureRate >= config.failureRate;
    }

    return false;
  }

  /**
   * Update failure rate calculation
   */
  private updateFailureRate(circuit: CircuitBreakerMetrics) {
    if (circuit.totalRequests === 0) {
      circuit.failureRate = 0;
    } else {
      circuit.failureRate = circuit.failureCount / circuit.totalRequests;
    }
  }

  /**
   * Transition circuit to new state with logging
   */
  private transitionToState(
    circuit: CircuitBreakerMetrics,
    newState: CircuitBreakerState,
    circuitKey: string,
  ) {
    const oldState = circuit.state;
    circuit.state = newState;
    circuit.stateChangedAt = new Date();

    this.logger.log(`Circuit breaker state transition`, {
      circuitKey,
      fromState: oldState,
      toState: newState,
      failureRate: circuit.failureRate,
      totalRequests: circuit.totalRequests,
    });
  }

  /**
   * Get or create circuit metrics for a given key
   */
  private getOrCreateCircuit(
    circuitKey: string,
    config: CircuitBreakerConfig,
  ): CircuitBreakerMetrics {
    let circuit = this.circuits.get(circuitKey);

    if (!circuit) {
      circuit = {
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

      this.circuits.set(circuitKey, circuit);

      this.logger.debug('Created new circuit breaker', {
        circuitKey,
        config,
      });
    }

    return circuit;
  }

  /**
   * Generate unique circuit key based on request context
   */
  private generateCircuitKey(
    request: any,
    handler: Function,
    controller: Function,
  ): string {
    const controllerName = controller.name;
    const handlerName = handler.name;
    const path = request.route?.path || request.path || 'unknown';
    const method = request.method || 'GET';

    return `${controllerName}.${handlerName}:${method}:${path}`;
  }

  /**
   * Get configuration for a specific circuit
   */
  private getConfigForCircuit(circuitKey: string): CircuitBreakerConfig {
    // In a more advanced implementation, this could return circuit-specific config
    // For now, return default config
    return this.defaultConfig;
  }

  /**
   * Start periodic cleanup of old circuit data
   */
  private startCleanupInterval() {
    const cleanupInterval = this.configService.get<number>(
      'CIRCUIT_BREAKER_CLEANUP_INTERVAL',
      3600000,
    ); // 1 hour

    setInterval(() => {
      this.cleanupOldCircuits();
    }, cleanupInterval);
  }

  /**
   * Clean up circuits that haven't been used recently
   */
  private cleanupOldCircuits() {
    const maxAge = this.configService.get<number>(
      'CIRCUIT_BREAKER_MAX_AGE',
      7200000,
    ); // 2 hours
    const now = Date.now();

    for (const [key, circuit] of Array.from(this.circuits.entries())) {
      const lastActivity = Math.max(
        circuit.lastFailureTime?.getTime() || 0,
        circuit.lastSuccessTime?.getTime() || 0,
        circuit.stateChangedAt.getTime(),
      );

      if (now - lastActivity > maxAge) {
        this.circuits.delete(key);
        this.logger.debug(`Cleaned up inactive circuit`, { circuitKey: key });
      }
    }
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `cb_op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
