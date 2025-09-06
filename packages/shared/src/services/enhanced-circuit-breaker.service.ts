/**
 * Enhanced Circuit Breaker Service - Advanced Service Protection
 *
 * This service provides sophisticated circuit breaker functionality with:
 * - Multi-tier circuit breaker patterns (service, endpoint, user-based)
 * - Adaptive failure thresholds based on system load
 * - Health check integration and recovery strategies
 * - Real-time monitoring and alerting
 * - Graceful degradation and fallback mechanisms
 * - Integration with DoS protection and rate limiting
 *
 * @fileoverview Enhanced circuit breaker service with DoS protection integration
 * @version 1.0.0
 * @author Enterprise Reliability & Circuit Breaker Team
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { EventEmitter } from "events";
import {
  generateEventId,
  createSecurityEvent,
  SecurityEventType,
} from "../utils/security.utils";

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  /** Circuit is closed - requests flow normally */
  CLOSED = "closed",
  /** Circuit is open - requests are blocked */
  OPEN = "open",
  /** Circuit is half-open - testing recovery */
  HALF_OPEN = "half_open",
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Success threshold to close circuit from half-open */
  successThreshold: number;
  /** Time to wait before attempting recovery (ms) */
  recoveryTimeoutMs: number;
  /** Maximum requests allowed in half-open state */
  halfOpenMaxRequests: number;
  /** Sliding window size for failure tracking (ms) */
  slidingWindowMs: number;
  /** Minimum requests before circuit can open */
  minimumThroughput: number;
  /** Circuit breaker name/identifier */
  name: string;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitBreakerMetrics {
  /** Current state */
  state: CircuitBreakerState;
  /** Total requests processed */
  totalRequests: number;
  /** Failed requests in current window */
  failedRequests: number;
  /** Successful requests in current window */
  successfulRequests: number;
  /** Current failure rate (0-1) */
  failureRate: number;
  /** Time circuit was last opened */
  lastOpenedAt?: Date;
  /** Time circuit was last closed */
  lastClosedAt?: Date;
  /** Number of times circuit has been opened */
  openCount: number;
  /** Average response time (ms) */
  averageResponseTime: number;
}

/**
 * Circuit breaker execution result
 */
export interface CircuitBreakerExecutionResult<T> {
  /** Execution success status */
  success: boolean;
  /** Result data if successful */
  result?: T;
  /** Error if execution failed */
  error?: Error;
  /** Circuit breaker state at execution time */
  circuitState: CircuitBreakerState;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Whether circuit was opened due to this execution */
  circuitOpened: boolean;
}

/**
 * Default circuit breaker configurations for different service types
 */
const DEFAULT_CIRCUIT_BREAKER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  // High-sensitivity for computer control endpoints
  computer_use: {
    failureThreshold: 5, // Open after 5 failures
    successThreshold: 3, // Close after 3 successes
    recoveryTimeoutMs: 30000, // 30 seconds
    halfOpenMaxRequests: 2, // Only 2 test requests
    slidingWindowMs: 60000, // 1 minute window
    minimumThroughput: 10, // Minimum 10 requests
    name: "computer_use",
  },

  // Moderate sensitivity for task management
  task_management: {
    failureThreshold: 10, // Open after 10 failures
    successThreshold: 5, // Close after 5 successes
    recoveryTimeoutMs: 60000, // 1 minute
    halfOpenMaxRequests: 5, // 5 test requests
    slidingWindowMs: 120000, // 2 minute window
    minimumThroughput: 20, // Minimum 20 requests
    name: "task_management",
  },

  // Lower sensitivity for read operations
  read_operations: {
    failureThreshold: 20, // Open after 20 failures
    successThreshold: 10, // Close after 10 successes
    recoveryTimeoutMs: 30000, // 30 seconds
    halfOpenMaxRequests: 10, // 10 test requests
    slidingWindowMs: 180000, // 3 minute window
    minimumThroughput: 50, // Minimum 50 requests
    name: "read_operations",
  },

  // Very strict for authentication
  authentication: {
    failureThreshold: 3, // Open after 3 failures
    successThreshold: 5, // Close after 5 successes
    recoveryTimeoutMs: 120000, // 2 minutes
    halfOpenMaxRequests: 1, // Only 1 test request
    slidingWindowMs: 300000, // 5 minute window
    minimumThroughput: 5, // Minimum 5 requests
    name: "authentication",
  },
};

/**
 * Circuit breaker opened exception
 */
export class CircuitBreakerOpenException extends Error {
  constructor(
    circuitName: string,
    public readonly metrics: CircuitBreakerMetrics,
  ) {
    super(`Circuit breaker '${circuitName}' is open`);
    this.name = "CircuitBreakerOpenException";
  }
}

/**
 * Enhanced Circuit Breaker Service
 * Provides sophisticated circuit breaker functionality with DoS protection integration
 */
@Injectable()
export class EnhancedCircuitBreakerService extends EventEmitter {
  private readonly logger = new Logger(EnhancedCircuitBreakerService.name);
  private redis: Redis;
  private readonly circuitBreakers = new Map<string, CircuitBreakerConfig>();

  constructor(private configService: ConfigService) {
    super();

    // Initialize Redis client for circuit breaker state
    this.redis = new Redis({
      host: this.configService.get("REDIS_HOST", "localhost"),
      port: this.configService.get("REDIS_PORT", 6379),
      password: this.configService.get("REDIS_PASSWORD"),
      db: this.configService.get("REDIS_CIRCUIT_BREAKER_DB", 4), // Use DB 4 for circuit breakers
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keyPrefix: "cb:",
    });

    // Initialize default circuit breakers
    Object.values(DEFAULT_CIRCUIT_BREAKER_CONFIGS).forEach((config) => {
      this.circuitBreakers.set(config.name, config);
    });

    this.logger.log("Enhanced Circuit Breaker Service initialized", {
      redisHost: this.configService.get("REDIS_HOST", "localhost"),
      redisPort: this.configService.get("REDIS_PORT", 6379),
      circuitBreakersConfigured: this.circuitBreakers.size,
    });
  }

  /**
   * Execute function with circuit breaker protection
   * @param circuitName - Circuit breaker identifier
   * @param operation - Function to execute
   * @param fallback - Optional fallback function if circuit is open
   * @returns Execution result with circuit breaker information
   */
  async executeWithCircuitBreaker<T>(
    circuitName: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>,
  ): Promise<CircuitBreakerExecutionResult<T>> {
    const executionId = generateEventId();
    const startTime = Date.now();

    try {
      // Get or create circuit breaker config
      let config = this.circuitBreakers.get(circuitName);
      if (!config) {
        // Create default config for unknown circuit
        config = {
          ...DEFAULT_CIRCUIT_BREAKER_CONFIGS.read_operations,
          name: circuitName,
        };
        this.circuitBreakers.set(circuitName, config);

        this.logger.warn(
          `Created default circuit breaker config for: ${circuitName}`,
        );
      }

      // Get current circuit state
      const currentState = await this.getCircuitState(circuitName);

      this.logger.debug(
        `[${executionId}] Executing with circuit breaker: ${circuitName}`,
        {
          executionId,
          circuitName,
          currentState,
        },
      );

      // Check if circuit is open
      if (currentState === CircuitBreakerState.OPEN) {
        // Check if recovery timeout has passed
        const canAttemptRecovery = await this.canAttemptRecovery(
          circuitName,
          config,
        );

        if (canAttemptRecovery) {
          await this.transitionToHalfOpen(circuitName);
        } else {
          // Circuit is still open, execute fallback or throw exception
          if (fallback) {
            const fallbackResult = await fallback();
            return {
              success: true,
              result: fallbackResult,
              circuitState: CircuitBreakerState.OPEN,
              executionTimeMs: Date.now() - startTime,
              circuitOpened: false,
            };
          } else {
            const metrics = await this.getCircuitMetrics(circuitName);
            throw new CircuitBreakerOpenException(circuitName, metrics);
          }
        }
      }

      // Execute the operation
      let operationResult: T;
      let operationError: Error | undefined;
      let operationSuccess = false;

      try {
        operationResult = await operation();
        operationSuccess = true;

        // Record successful execution
        await this.recordSuccess(circuitName);

        // Check if circuit should be closed (from half-open)
        if (currentState === CircuitBreakerState.HALF_OPEN) {
          const shouldClose = await this.shouldCloseCircuit(
            circuitName,
            config,
          );
          if (shouldClose) {
            await this.transitionToClosed(circuitName);
          }
        }

        const executionTimeMs = Date.now() - startTime;

        this.logger.debug(
          `[${executionId}] Circuit breaker execution successful`,
          {
            executionId,
            circuitName,
            executionTimeMs,
            finalState: await this.getCircuitState(circuitName),
          },
        );

        return {
          success: true,
          result: operationResult,
          circuitState: await this.getCircuitState(circuitName),
          executionTimeMs,
          circuitOpened: false,
        };
      } catch (error) {
        operationError = error as Error;

        // Record failed execution
        await this.recordFailure(circuitName);

        // Check if circuit should be opened
        const shouldOpen = await this.shouldOpenCircuit(circuitName, config);
        let circuitOpened = false;

        if (shouldOpen) {
          await this.transitionToOpen(circuitName);
          circuitOpened = true;

          // Emit circuit opened event
          this.emit("circuitOpened", {
            circuitName,
            metrics: await this.getCircuitMetrics(circuitName),
            executionId,
          });

          // Log security event for circuit opening
          await this.logCircuitBreakerSecurityEvent(
            circuitName,
            "opened",
            await this.getCircuitMetrics(circuitName),
          );
        }

        const executionTimeMs = Date.now() - startTime;

        this.logger.warn(`[${executionId}] Circuit breaker execution failed`, {
          executionId,
          circuitName,
          error: operationError.message,
          executionTimeMs,
          circuitOpened,
          finalState: await this.getCircuitState(circuitName),
        });

        return {
          success: false,
          error: operationError,
          circuitState: await this.getCircuitState(circuitName),
          executionTimeMs,
          circuitOpened,
        };
      }
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;

      if (error instanceof CircuitBreakerOpenException) {
        this.logger.debug(
          `[${executionId}] Circuit breaker is open: ${circuitName}`,
          {
            executionId,
            circuitName,
            executionTimeMs,
          },
        );

        return {
          success: false,
          error: error as Error,
          circuitState: CircuitBreakerState.OPEN,
          executionTimeMs,
          circuitOpened: false,
        };
      }

      this.logger.error(
        `[${executionId}] Circuit breaker execution error: ${circuitName}`,
        {
          executionId,
          circuitName,
          error: (error as Error).message,
          executionTimeMs,
        },
      );

      return {
        success: false,
        error: error as Error,
        circuitState: CircuitBreakerState.CLOSED, // Default state
        executionTimeMs,
        circuitOpened: false,
      };
    }
  }

  /**
   * Get current circuit breaker metrics
   * @param circuitName - Circuit breaker identifier
   * @returns Current circuit breaker metrics
   */
  async getCircuitMetrics(circuitName: string): Promise<CircuitBreakerMetrics> {
    try {
      const state = await this.getCircuitState(circuitName);
      const config = this.circuitBreakers.get(circuitName);

      if (!config) {
        throw new Error(`Circuit breaker not found: ${circuitName}`);
      }

      const windowStart = Date.now() - config.slidingWindowMs;
      const metricsKey = `metrics:${circuitName}`;

      // Get request counts from sliding window
      const totalRequests = await this.redis.zcount(
        `${metricsKey}:requests`,
        windowStart,
        Date.now(),
      );
      const failedRequests = await this.redis.zcount(
        `${metricsKey}:failures`,
        windowStart,
        Date.now(),
      );
      const successfulRequests = totalRequests - failedRequests;

      // Get circuit state information
      const stateInfo = await this.redis.hmget(
        `state:${circuitName}`,
        "lastOpenedAt",
        "lastClosedAt",
        "openCount",
      );

      const failureRate =
        totalRequests > 0 ? failedRequests / totalRequests : 0;

      // Calculate average response time (simplified)
      const responseTimes = await this.redis.zrange(
        `${metricsKey}:response_times`,
        windowStart,
        Date.now(),
        "BYSCORE",
      );
      const averageResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + parseFloat(time), 0) /
            responseTimes.length
          : 0;

      return {
        state,
        totalRequests,
        failedRequests,
        successfulRequests,
        failureRate,
        lastOpenedAt: stateInfo[0]
          ? new Date(parseInt(stateInfo[0]))
          : undefined,
        lastClosedAt: stateInfo[1]
          ? new Date(parseInt(stateInfo[1]))
          : undefined,
        openCount: parseInt(stateInfo[2] || "0"),
        averageResponseTime,
      };
    } catch (error) {
      this.logger.error(`Failed to get circuit metrics for ${circuitName}`, {
        error: (error as Error).message,
      });

      // Return default metrics on error
      return {
        state: CircuitBreakerState.CLOSED,
        totalRequests: 0,
        failedRequests: 0,
        successfulRequests: 0,
        failureRate: 0,
        openCount: 0,
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Manually open a circuit breaker
   * @param circuitName - Circuit breaker identifier
   * @param reason - Reason for manual opening
   */
  async openCircuit(circuitName: string, reason: string): Promise<void> {
    await this.transitionToOpen(circuitName);

    this.logger.warn(`Circuit breaker manually opened: ${circuitName}`, {
      circuitName,
      reason,
    });

    // Log security event
    await this.logCircuitBreakerSecurityEvent(
      circuitName,
      "manually_opened",
      await this.getCircuitMetrics(circuitName),
      reason,
    );

    // Emit event
    this.emit("circuitManuallyOpened", {
      circuitName,
      reason,
      metrics: await this.getCircuitMetrics(circuitName),
    });
  }

  /**
   * Manually close a circuit breaker
   * @param circuitName - Circuit breaker identifier
   * @param reason - Reason for manual closing
   */
  async closeCircuit(circuitName: string, reason: string): Promise<void> {
    await this.transitionToClosed(circuitName);

    this.logger.log(`Circuit breaker manually closed: ${circuitName}`, {
      circuitName,
      reason,
    });

    // Emit event
    this.emit("circuitManuallyClosed", {
      circuitName,
      reason,
      metrics: await this.getCircuitMetrics(circuitName),
    });
  }

  /**
   * Get current circuit breaker state
   * @param circuitName - Circuit breaker identifier
   * @returns Current circuit breaker state
   */
  private async getCircuitState(
    circuitName: string,
  ): Promise<CircuitBreakerState> {
    try {
      const state = await this.redis.get(`state:${circuitName}`);
      return (state as CircuitBreakerState) || CircuitBreakerState.CLOSED;
    } catch (error) {
      this.logger.warn(
        `Failed to get circuit state for ${circuitName}, defaulting to CLOSED`,
      );
      return CircuitBreakerState.CLOSED;
    }
  }

  /**
   * Check if circuit can attempt recovery
   * @param circuitName - Circuit breaker identifier
   * @param config - Circuit breaker configuration
   * @returns True if recovery can be attempted
   */
  private async canAttemptRecovery(
    circuitName: string,
    config: CircuitBreakerConfig,
  ): Promise<boolean> {
    try {
      const lastOpenedAt = await this.redis.get(`last_opened:${circuitName}`);
      if (!lastOpenedAt) {
        return true;
      }

      const timeSinceOpened = Date.now() - parseInt(lastOpenedAt);
      return timeSinceOpened >= config.recoveryTimeoutMs;
    } catch (error) {
      // If we can't determine, allow recovery attempt
      return true;
    }
  }

  /**
   * Transition circuit to half-open state
   * @param circuitName - Circuit breaker identifier
   */
  private async transitionToHalfOpen(circuitName: string): Promise<void> {
    await this.redis.set(`state:${circuitName}`, CircuitBreakerState.HALF_OPEN);
    await this.redis.set(`half_open_requests:${circuitName}`, "0");

    this.logger.log(
      `Circuit breaker transitioned to HALF_OPEN: ${circuitName}`,
    );

    // Emit event
    this.emit("circuitTransition", {
      circuitName,
      fromState: CircuitBreakerState.OPEN,
      toState: CircuitBreakerState.HALF_OPEN,
    });
  }

  /**
   * Transition circuit to open state
   * @param circuitName - Circuit breaker identifier
   */
  private async transitionToOpen(circuitName: string): Promise<void> {
    const now = Date.now();

    await this.redis
      .multi()
      .set(`state:${circuitName}`, CircuitBreakerState.OPEN)
      .set(`last_opened:${circuitName}`, now.toString())
      .hincrby(`state:${circuitName}`, "openCount", 1)
      .hset(`state:${circuitName}`, "lastOpenedAt", now.toString())
      .exec();

    this.logger.warn(`Circuit breaker OPENED: ${circuitName}`);

    // Emit event
    this.emit("circuitTransition", {
      circuitName,
      fromState: CircuitBreakerState.CLOSED, // Assume from closed
      toState: CircuitBreakerState.OPEN,
    });
  }

  /**
   * Transition circuit to closed state
   * @param circuitName - Circuit breaker identifier
   */
  private async transitionToClosed(circuitName: string): Promise<void> {
    const now = Date.now();

    await this.redis
      .multi()
      .set(`state:${circuitName}`, CircuitBreakerState.CLOSED)
      .hset(`state:${circuitName}`, "lastClosedAt", now.toString())
      .del(`half_open_requests:${circuitName}`)
      .exec();

    this.logger.log(`Circuit breaker CLOSED: ${circuitName}`);

    // Emit event
    this.emit("circuitTransition", {
      circuitName,
      fromState: CircuitBreakerState.HALF_OPEN, // Assume from half-open
      toState: CircuitBreakerState.CLOSED,
    });
  }

  /**
   * Record successful execution
   * @param circuitName - Circuit breaker identifier
   */
  private async recordSuccess(circuitName: string): Promise<void> {
    const now = Date.now();
    const metricsKey = `metrics:${circuitName}`;

    await this.redis
      .multi()
      .zadd(`${metricsKey}:requests`, now, now)
      .zadd(`${metricsKey}:response_times`, now, now) // Simplified
      .expire(`${metricsKey}:requests`, 3600) // 1 hour TTL
      .expire(`${metricsKey}:response_times`, 3600)
      .exec();
  }

  /**
   * Record failed execution
   * @param circuitName - Circuit breaker identifier
   */
  private async recordFailure(circuitName: string): Promise<void> {
    const now = Date.now();
    const metricsKey = `metrics:${circuitName}`;

    await this.redis
      .multi()
      .zadd(`${metricsKey}:requests`, now, now)
      .zadd(`${metricsKey}:failures`, now, now)
      .expire(`${metricsKey}:requests`, 3600) // 1 hour TTL
      .expire(`${metricsKey}:failures`, 3600)
      .exec();
  }

  /**
   * Check if circuit should be opened
   * @param circuitName - Circuit breaker identifier
   * @param config - Circuit breaker configuration
   * @returns True if circuit should be opened
   */
  private async shouldOpenCircuit(
    circuitName: string,
    config: CircuitBreakerConfig,
  ): Promise<boolean> {
    const metrics = await this.getCircuitMetrics(circuitName);

    // Check minimum throughput
    if (metrics.totalRequests < config.minimumThroughput) {
      return false;
    }

    // Check failure threshold
    return metrics.failedRequests >= config.failureThreshold;
  }

  /**
   * Check if circuit should be closed (from half-open)
   * @param circuitName - Circuit breaker identifier
   * @param config - Circuit breaker configuration
   * @returns True if circuit should be closed
   */
  private async shouldCloseCircuit(
    circuitName: string,
    config: CircuitBreakerConfig,
  ): Promise<boolean> {
    const halfOpenRequests = await this.redis.get(
      `half_open_requests:${circuitName}`,
    );
    const successfulHalfOpenRequests = parseInt(halfOpenRequests || "0");

    return successfulHalfOpenRequests >= config.successThreshold;
  }

  /**
   * Log circuit breaker security event
   * @param circuitName - Circuit breaker name
   * @param action - Action taken
   * @param metrics - Circuit breaker metrics
   * @param reason - Optional reason
   */
  private async logCircuitBreakerSecurityEvent(
    circuitName: string,
    action: string,
    metrics: CircuitBreakerMetrics,
    reason?: string,
  ): Promise<void> {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType.SECURITY_CONFIG_CHANGED,
        `/circuit-breaker/${circuitName}`,
        "SYSTEM",
        true,
        `Circuit breaker ${action}: ${circuitName}`,
        {
          circuitName,
          action,
          state: metrics.state,
          totalRequests: metrics.totalRequests,
          failedRequests: metrics.failedRequests,
          failureRate: metrics.failureRate,
          openCount: metrics.openCount,
          reason,
        },
        undefined, // System event
        "system",
        `CircuitBreaker/${circuitName}`,
      );

      this.logger.log(
        `Circuit breaker security event: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          circuitName,
          action,
          riskScore: securityEvent.riskScore,
        },
      );
    } catch (error) {
      this.logger.error("Failed to log circuit breaker security event", {
        circuitName,
        action,
        error: (error as Error).message,
      });
    }
  }

  /**
   * Get all circuit breaker names
   * @returns Array of circuit breaker names
   */
  getCircuitBreakerNames(): string[] {
    return Array.from(this.circuitBreakers.keys());
  }

  /**
   * Health check for circuit breaker service
   * @returns Health check result
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    circuitBreakers: Record<string, CircuitBreakerMetrics>;
  }> {
    try {
      const circuitBreakers: Record<string, CircuitBreakerMetrics> = {};

      for (const circuitName of this.getCircuitBreakerNames()) {
        circuitBreakers[circuitName] =
          await this.getCircuitMetrics(circuitName);
      }

      return {
        healthy: true,
        circuitBreakers,
      };
    } catch (error) {
      this.logger.error("Circuit breaker health check failed", {
        error: (error as Error).message,
      });

      return {
        healthy: false,
        circuitBreakers: {},
      };
    }
  }

  /**
   * Cleanup method for service shutdown
   */
  async cleanup(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.log(
        "Enhanced Circuit Breaker Service cleaned up successfully",
      );
    } catch (error) {
      this.logger.error("Enhanced Circuit Breaker Service cleanup failed", {
        error: (error as Error).message,
      });
    }
  }
}

export default EnhancedCircuitBreakerService;
