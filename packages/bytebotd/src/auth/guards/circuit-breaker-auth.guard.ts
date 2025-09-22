/**
 * Circuit Breaker Authentication Guard - ByteBotd Computer Control Service
 * Enterprise resilience patterns for browser automation authentication
 *
 * This guard implements circuit breaker patterns for authentication operations,
 * providing advanced resilience against service failures, cascade failures,
 * and high-load scenarios with automatic recovery mechanisms.
 *
 * Features:
 * - Circuit breaker pattern with configurable thresholds
 * - Automatic failure detection and recovery
 * - Fallback authentication mechanisms
 * - Performance monitoring and metrics collection
 * - Graceful degradation under high load
 * - Health check integration for dependent services
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Enterprise Authentication Implementation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { performance } from 'perf_hooks';
import { UserRole, Permission } from '@bytebot/shared';
import { ByteBotdUser } from './jwt-auth.guard';

/**
 * JWT payload interface for type safety
 */
interface JWTPayload {
  sub: string;
  username: string;
  email: string;
  role: UserRole;
  roles: UserRole[];
  permissions: Permission[];
  sessionId: string;
  type: string;
  iat: number;
  exp: number;
}

/**
 * Extended Request interface for circuit breaker context
 */
interface CircuitBreakerRequest extends Request {
  user?: ByteBotdUser & {
    isFallback?: boolean;
  };
  circuitBreakerContext?: {
    attemptId: string;
    startTime: number;
    fallbackUsed: boolean;
  };
}

/**
 * Circuit breaker states
 */
enum CircuitBreakerState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Circuit is open, requests fail fast
  HALF_OPEN = 'half_open', // Testing if service has recovered
}

/**
 * Authentication attempt result
 */
interface AuthAttemptResult {
  success: boolean;
  responseTime: number;
  error?: Error;
  fallbackUsed?: boolean;
}

/**
 * Circuit breaker metrics
 */
interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  totalAttempts: number;
  averageResponseTime: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangedAt: Date;
  halfOpenAttempts: number;
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes in half-open before closing
  timeout: number; // Time to wait before moving to half-open (ms)
  responseTimeThreshold: number; // Response time threshold for failure (ms)
  resetTimeout: number; // Time to reset metrics (ms)
  fallbackEnabled: boolean; // Whether to use fallback authentication
  monitoringEnabled: boolean; // Whether to collect detailed metrics
}

@Injectable()
export class CircuitBreakerAuthGuard implements CanActivate {
  private readonly logger = new Logger(CircuitBreakerAuthGuard.name);
  private readonly metrics: CircuitBreakerMetrics;
  private readonly config: CircuitBreakerConfig;
  private readonly attemptHistory: AuthAttemptResult[] = [];

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    // Initialize circuit breaker configuration
    this.config = {
      failureThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_FAILURE_THRESHOLD',
        5,
      ),
      successThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_SUCCESS_THRESHOLD',
        3,
      ),
      timeout: this.configService.get<number>('CIRCUIT_BREAKER_TIMEOUT', 60000), // 1 minute
      responseTimeThreshold: this.configService.get<number>(
        'CIRCUIT_BREAKER_RESPONSE_TIME_THRESHOLD',
        5000,
      ), // 5 seconds
      resetTimeout: this.configService.get<number>(
        'CIRCUIT_BREAKER_RESET_TIMEOUT',
        300000,
      ), // 5 minutes
      fallbackEnabled: this.configService.get<boolean>(
        'CIRCUIT_BREAKER_FALLBACK_ENABLED',
        true,
      ),
      monitoringEnabled: this.configService.get<boolean>(
        'CIRCUIT_BREAKER_MONITORING_ENABLED',
        true,
      ),
    };

    // Initialize metrics
    this.metrics = {
      state: CircuitBreakerState.CLOSED,
      failureCount: 0,
      successCount: 0,
      totalAttempts: 0,
      averageResponseTime: 0,
      stateChangedAt: new Date(),
      halfOpenAttempts: 0,
    };

    this.logger.log('Circuit Breaker Authentication Guard initialized');
    this.logger.log(`Configuration: ${JSON.stringify(this.config)}`);

    // Start periodic metrics reset
    if (this.config.resetTimeout > 0) {
      setInterval(() => this.resetMetrics(), this.config.resetTimeout);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CircuitBreakerRequest>();
    const startTime = performance.now();

    // Generate attempt ID for tracing
    const attemptId = this.generateAttemptId();
    request.circuitBreakerContext = {
      attemptId,
      startTime,
      fallbackUsed: false,
    };

    try {
      // Check if route is marked as public
      const isPublic = this.reflector.get<boolean>(
        '_isPublic',
        context.getHandler(),
      );
      if (isPublic) {
        this.logger.debug(`Public route accessed: ${request.url}`);
        return true;
      }

      // Check circuit breaker state
      const canProceed = await this.checkCircuitState();
      if (!canProceed) {
        if (this.config.fallbackEnabled) {
          return await this.handleFallbackAuthentication(request, context);
        } else {
          throw new ServiceUnavailableException(
            'Authentication service temporarily unavailable',
          );
        }
      }

      // Attempt primary authentication
      const authResult = await this.attemptAuthentication(request, context);

      // Record result and update circuit state
      await this.recordAttemptResult(authResult);

      // Set user context if successful
      if (authResult.success && request.user) {
        const executionTime = performance.now() - startTime;
        this.logger.debug(
          `Circuit breaker authentication successful: ${request.user.username} ` +
            `[attemptId: ${attemptId}, executionTime: ${executionTime.toFixed(2)}ms, ` +
            `state: ${this.metrics.state}]`,
        );
      }

      return authResult.success;
    } catch (error) {
      const executionTime = performance.now() - startTime;

      // Record failure
      await this.recordAttemptResult({
        success: false,
        responseTime: executionTime,
        error: error as Error,
      });

      this.logger.error(
        `Circuit breaker authentication failed: ${(error as Error).message} ` +
          `[attemptId: ${attemptId}, executionTime: ${executionTime.toFixed(2)}ms, ` +
          `state: ${this.metrics.state}]`,
        (error as Error).stack,
      );

      throw error;
    }
  }

  /**
   * Check if circuit breaker allows requests to proceed
   */
  private async checkCircuitState(): Promise<boolean> {
    const now = Date.now();

    switch (this.metrics.state) {
      case CircuitBreakerState.CLOSED:
        return true;

      case CircuitBreakerState.OPEN:
        // Check if timeout has elapsed to move to half-open
        const timeSinceStateChange =
          now - this.metrics.stateChangedAt.getTime();
        if (timeSinceStateChange >= this.config.timeout) {
          this.changeState(CircuitBreakerState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitBreakerState.HALF_OPEN:
        // Allow limited requests to test service health
        return this.metrics.halfOpenAttempts < this.config.successThreshold;

      default:
        return false;
    }
  }

  /**
   * Attempt primary authentication
   */
  private async attemptAuthentication(
    request: CircuitBreakerRequest,
    context: ExecutionContext,
  ): Promise<AuthAttemptResult> {
    const startTime = performance.now();

    try {
      // Extract JWT token
      const token = this.extractTokenFromHeader(request);
      if (!token) {
        throw new UnauthorizedException('JWT token not found');
      }

      // Validate JWT token
      const payload = await this.validateJwtToken(token);

      // Create user object
      request.user = this.createUserFromPayload(payload);

      const responseTime = performance.now() - startTime;
      return {
        success: true,
        responseTime,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error as Error,
      };
    }
  }

  /**
   * Handle fallback authentication when circuit is open
   */
  private async handleFallbackAuthentication(
    request: CircuitBreakerRequest,
    context: ExecutionContext,
  ): Promise<boolean> {
    try {
      this.logger.warn(
        `Circuit breaker OPEN - attempting fallback authentication for ${request.url}`,
      );

      // Implement basic fallback authentication
      // This could be a simpler validation or cached credentials
      const fallbackToken = this.extractTokenFromHeader(request);
      if (!fallbackToken) {
        throw new UnauthorizedException('No fallback authentication available');
      }

      // Basic token validation without full verification
      const basicPayload = this.decodeTokenBasic(fallbackToken);
      if (!basicPayload) {
        throw new UnauthorizedException('Invalid fallback token');
      }

      // Create fallback user
      request.user = {
        ...this.createUserFromPayload(basicPayload),
        isFallback: true,
      };

      if (request.circuitBreakerContext) {
        request.circuitBreakerContext.fallbackUsed = true;
      }

      this.logger.debug(
        `Fallback authentication successful for user: ${basicPayload.username}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Fallback authentication failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException(
        'Authentication service unavailable',
      );
    }
  }

  /**
   * Extract JWT token from Authorization header
   */
  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  /**
   * Validate JWT token with comprehensive verification
   */
  private async validateJwtToken(token: string): Promise<JWTPayload> {
    try {
      const secret = this.configService.get<string>(
        'JWT_SECRET_HS256',
        'default-secret',
      );
      const payload = this.jwtService.verify(token, {
        secret,
        algorithms: ['HS256'],
      }) as JWTPayload;

      // Additional validations
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new UnauthorizedException('Token has expired');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Basic token decoding for fallback authentication
   */
  private decodeTokenBasic(token: string): JWTPayload | null {
    try {
      // Basic decode without verification for fallback
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString(),
      ) as JWTPayload;

      // Basic checks
      if (!payload.sub || !payload.username) return null;

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Create user object from JWT payload
   */
  private createUserFromPayload(payload: JWTPayload): ByteBotdUser {
    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role || UserRole._VIEWER,
      isActive: true,
      sessionId: payload.sessionId,
      permissions: payload.permissions || [],
    };
  }

  /**
   * Record authentication attempt result and update circuit state
   */
  private async recordAttemptResult(result: AuthAttemptResult): Promise<void> {
    this.metrics.totalAttempts++;

    // Update response time average
    if (this.metrics.totalAttempts === 1) {
      this.metrics.averageResponseTime = result.responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (this.metrics.totalAttempts - 1) +
          result.responseTime) /
        this.metrics.totalAttempts;
    }

    // Store attempt in history (keep last 100)
    this.attemptHistory.push(result);
    if (this.attemptHistory.length > 100) {
      this.attemptHistory.shift();
    }

    // Determine if this is considered a failure
    const isFailure =
      !result.success ||
      result.responseTime > this.config.responseTimeThreshold;

    if (isFailure) {
      this.metrics.failureCount++;
      this.metrics.lastFailureTime = new Date();

      // Check if we should open the circuit
      if (
        this.metrics.state === CircuitBreakerState.CLOSED &&
        this.metrics.failureCount >= this.config.failureThreshold
      ) {
        this.changeState(CircuitBreakerState.OPEN);
      } else if (this.metrics.state === CircuitBreakerState.HALF_OPEN) {
        // Failed during half-open, go back to open
        this.changeState(CircuitBreakerState.OPEN);
      }
    } else {
      this.metrics.successCount++;
      this.metrics.lastSuccessTime = new Date();

      if (this.metrics.state === CircuitBreakerState.HALF_OPEN) {
        this.metrics.halfOpenAttempts++;
        // Check if we have enough successes to close the circuit
        if (this.metrics.halfOpenAttempts >= this.config.successThreshold) {
          this.changeState(CircuitBreakerState.CLOSED);
        }
      }
    }

    // Log metrics if monitoring is enabled
    if (this.config.monitoringEnabled) {
      this.logMetrics(result);
    }
  }

  /**
   * Change circuit breaker state
   */
  private changeState(newState: CircuitBreakerState): void {
    const oldState = this.metrics.state;
    this.metrics.state = newState;
    this.metrics.stateChangedAt = new Date();

    // Reset counters for new state
    if (newState === CircuitBreakerState.CLOSED) {
      this.metrics.failureCount = 0;
      this.metrics.halfOpenAttempts = 0;
    } else if (newState === CircuitBreakerState.HALF_OPEN) {
      this.metrics.halfOpenAttempts = 0;
    }

    this.logger.warn(
      `Circuit breaker state changed: ${oldState} -> ${newState} ` +
        `[failures: ${this.metrics.failureCount}, successes: ${this.metrics.successCount}]`,
    );
  }

  /**
   * Reset metrics periodically
   */
  private resetMetrics(): void {
    const oldFailures = this.metrics.failureCount;
    const oldSuccesses = this.metrics.successCount;

    // Keep state but reset counters (gradual reset)
    this.metrics.failureCount = Math.max(0, this.metrics.failureCount - 1);
    this.metrics.successCount = Math.max(0, this.metrics.successCount - 1);
    this.metrics.totalAttempts = Math.max(0, this.metrics.totalAttempts - 2);

    if (oldFailures > 0 || oldSuccesses > 0) {
      this.logger.debug(
        `Circuit breaker metrics reset: failures ${oldFailures} -> ${this.metrics.failureCount}, ` +
          `successes ${oldSuccesses} -> ${this.metrics.successCount}`,
      );
    }
  }

  /**
   * Log circuit breaker metrics
   */
  private logMetrics(lastResult: AuthAttemptResult): void {
    const successRate =
      this.metrics.totalAttempts > 0
        ? (this.metrics.successCount / this.metrics.totalAttempts) * 100
        : 0;

    this.logger.debug(
      `Circuit Breaker Metrics - State: ${this.metrics.state}, ` +
        `Success Rate: ${successRate.toFixed(1)}%, ` +
        `Avg Response Time: ${this.metrics.averageResponseTime.toFixed(2)}ms, ` +
        `Failures: ${this.metrics.failureCount}, ` +
        `Successes: ${this.metrics.successCount}, ` +
        `Last Result: ${lastResult.success ? 'SUCCESS' : 'FAILURE'} ` +
        `(${lastResult.responseTime.toFixed(2)}ms)`,
    );
  }

  /**
   * Generate unique attempt ID
   */
  private generateAttemptId(): string {
    return `cb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Get current circuit breaker metrics (for monitoring)
   */
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent attempt history (for debugging)
   */
  getAttemptHistory(): AuthAttemptResult[] {
    return [...this.attemptHistory];
  }

  /**
   * Force circuit breaker state (for testing/emergency)
   */
  forceState(state: CircuitBreakerState): void {
    this.logger.warn(`Circuit breaker state forced to: ${state}`);
    this.changeState(state);
  }

  /**
   * Get circuit breaker health status
   */
  getHealthStatus(): {
    healthy: boolean;
    state: CircuitBreakerState;
    successRate: number;
    averageResponseTime: number;
    lastFailure?: Date;
  } {
    const successRate =
      this.metrics.totalAttempts > 0
        ? (this.metrics.successCount / this.metrics.totalAttempts) * 100
        : 100;

    return {
      healthy:
        this.metrics.state === CircuitBreakerState.CLOSED && successRate > 80,
      state: this.metrics.state,
      successRate,
      averageResponseTime: this.metrics.averageResponseTime,
      lastFailure: this.metrics.lastFailureTime,
    };
  }
}
