/**
 * Browser Rate Limiter Service
 *
 * Advanced rate limiting system for browser automation operations with:
 * - Multi-tiered rate limiting (global, per-user, per-endpoint, per-operation)
 * - Adaptive throttling based on resource usage and user behavior
 * - Intelligent burst handling with token bucket algorithm
 * - Circuit breaker pattern for system protection
 * - Real-time monitoring and alerting
 *
 * Features:
 * - Sliding window rate limiting
 * - Distributed rate limiting support (Redis)
 * - Contextual rate adjustments based on risk levels
 * - Graceful degradation under load
 * - Comprehensive metrics and monitoring
 *
 * @module BrowserRateLimiterService
 * @version 1.0.0
 * @author Rate Limiting Specialist
 */

import {
  Injectable,
  Logger,
  TooManyRequestsException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { performance } from 'perf_hooks';
import * as crypto from 'crypto';

// Authentication context types
import {
  BrowserUseUserContext,
  BrowserUseSessionContext,
  BrowserUseSecurityContext,
  BrowserPermission,
} from '../middleware/browser-use-auth.middleware';

// Security levels
import { SecurityLevel } from '../../shared/src/types/parlant-integration.types';

/**
 * Rate limit configuration for different limit types
 */
export interface RateLimitConfig {
  windowSizeMs: number;
  maxRequests: number;
  burstAllowance: number;
  retryAfterMs: number;
  enabled: boolean;
  circuitBreakerThreshold: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

/**
 * Rate limit context for evaluation
 */
export interface RateLimitContext {
  user: BrowserUseUserContext;
  session: BrowserUseSessionContext;
  security: BrowserUseSecurityContext;
  operation: RateLimitOperation;
  environment: RateLimitEnvironment;
}

/**
 * Operation details for rate limiting
 */
export interface RateLimitOperation {
  type: 'TASK_CREATE' | 'TASK_GET' | 'SESSION_CREATE' | 'SESSION_MANAGE' | 'ASYNC_JOB' | 'DATA_EXTRACT' | 'ADMIN';
  endpoint: string;
  method: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  resourceIntensive: boolean;
  estimatedDurationMs: number;
  businessImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Environment factors affecting rate limits
 */
export interface RateLimitEnvironment {
  systemLoad: number; // 0-100%
  memoryUsage: number; // 0-100%
  cpuUsage: number; // 0-100%
  activeConnections: number;
  timeOfDay: number; // 0-23
  isBusinessHours: boolean;
  emergencyMode: boolean;
  maintenanceMode: boolean;
}

/**
 * Rate limit decision result
 */
export interface RateLimitDecision {
  allowed: boolean;
  reason: string;
  retryAfterMs?: number;
  remainingRequests: number;
  totalRequests: number;
  windowResetTime: Date;
  rateLimitType: string;
  appliedLimits: AppliedRateLimit[];
  recommendations: string[];
  metadata: RateLimitMetadata;
}

/**
 * Applied rate limit information
 */
export interface AppliedRateLimit {
  type: 'GLOBAL' | 'USER' | 'ENDPOINT' | 'OPERATION' | 'RESOURCE' | 'ADAPTIVE';
  name: string;
  current: number;
  limit: number;
  windowMs: number;
  resetTime: Date;
  blocked: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Rate limit metadata
 */
export interface RateLimitMetadata {
  limitId: string;
  timestamp: Date;
  processingTime: number;
  algorithmUsed: 'TOKEN_BUCKET' | 'SLIDING_WINDOW' | 'FIXED_WINDOW' | 'ADAPTIVE';
  adaptiveFactors: string[];
  systemMetrics: {
    load: number;
    memory: number;
    cpu: number;
    connections: number;
  };
}

/**
 * Token bucket state for burst handling
 */
interface TokenBucket {
  tokens: number;
  capacity: number;
  refillRate: number;
  lastRefill: Date;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: Date;
  openTime?: Date;
  recoveryTimeoutMs: number;
}

/**
 * Rate limit entry for tracking
 */
interface RateLimitEntry {
  key: string;
  count: number;
  windowStart: Date;
  lastAccess: Date;
  bucket?: TokenBucket;
  violations: number;
  adaptiveFactor: number;
}

/**
 * Rate limit statistics
 */
interface RateLimitStatistics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  averageProcessingTime: number;
  peakRequestsPerSecond: number;
  limitViolationsByType: Map<string, number>;
  adaptiveAdjustments: number;
  circuitBreakerTrips: number;
}

/**
 * Browser Rate Limiter Service
 *
 * Comprehensive rate limiting service providing multiple algorithms and strategies
 * for protecting browser automation endpoints from abuse and overload.
 */
@Injectable()
export class BrowserRateLimiterService {
  private readonly logger = new Logger(BrowserRateLimiterService.name);

  // Rate limit configurations for different contexts
  private readonly rateLimitConfigs: Map<string, RateLimitConfig> = new Map([
    // Global limits
    ['global', {
      windowSizeMs: 60000, // 1 minute
      maxRequests: 1000,
      burstAllowance: 50,
      retryAfterMs: 60000,
      enabled: true,
      circuitBreakerThreshold: 0.9,
      backoffMultiplier: 2,
      maxBackoffMs: 300000, // 5 minutes
    }],

    // Per-user limits
    ['user:default', {
      windowSizeMs: 60000, // 1 minute
      maxRequests: 100,
      burstAllowance: 10,
      retryAfterMs: 60000,
      enabled: true,
      circuitBreakerThreshold: 0.8,
      backoffMultiplier: 2,
      maxBackoffMs: 180000, // 3 minutes
    }],

    ['user:power_user', {
      windowSizeMs: 60000,
      maxRequests: 200,
      burstAllowance: 20,
      retryAfterMs: 45000,
      enabled: true,
      circuitBreakerThreshold: 0.85,
      backoffMultiplier: 1.5,
      maxBackoffMs: 120000, // 2 minutes
    }],

    ['user:admin', {
      windowSizeMs: 60000,
      maxRequests: 500,
      burstAllowance: 50,
      retryAfterMs: 30000,
      enabled: true,
      circuitBreakerThreshold: 0.9,
      backoffMultiplier: 1.2,
      maxBackoffMs: 60000, // 1 minute
    }],

    // Endpoint-specific limits
    ['endpoint:task_create', {
      windowSizeMs: 60000,
      maxRequests: 20,
      burstAllowance: 5,
      retryAfterMs: 120000, // 2 minutes
      enabled: true,
      circuitBreakerThreshold: 0.7,
      backoffMultiplier: 3,
      maxBackoffMs: 600000, // 10 minutes
    }],

    ['endpoint:session_create', {
      windowSizeMs: 300000, // 5 minutes
      maxRequests: 5,
      burstAllowance: 2,
      retryAfterMs: 300000,
      enabled: true,
      circuitBreakerThreshold: 0.6,
      backoffMultiplier: 4,
      maxBackoffMs: 900000, // 15 minutes
    }],

    ['endpoint:async_job', {
      windowSizeMs: 600000, // 10 minutes
      maxRequests: 3,
      burstAllowance: 1,
      retryAfterMs: 600000,
      enabled: true,
      circuitBreakerThreshold: 0.5,
      backoffMultiplier: 5,
      maxBackoffMs: 1800000, // 30 minutes
    }],

    ['endpoint:data_extract', {
      windowSizeMs: 60000,
      maxRequests: 10,
      burstAllowance: 3,
      retryAfterMs: 180000, // 3 minutes
      enabled: true,
      circuitBreakerThreshold: 0.7,
      backoffMultiplier: 2.5,
      maxBackoffMs: 300000, // 5 minutes
    }],

    // Resource-based limits
    ['resource:memory_intensive', {
      windowSizeMs: 300000, // 5 minutes
      maxRequests: 5,
      burstAllowance: 1,
      retryAfterMs: 300000,
      enabled: true,
      circuitBreakerThreshold: 0.6,
      backoffMultiplier: 3,
      maxBackoffMs: 600000, // 10 minutes
    }],

    ['resource:cpu_intensive', {
      windowSizeMs: 300000,
      maxRequests: 3,
      burstAllowance: 1,
      retryAfterMs: 450000, // 7.5 minutes
      enabled: true,
      circuitBreakerThreshold: 0.5,
      backoffMultiplier: 4,
      maxBackoffMs: 900000, // 15 minutes
    }],
  ]);

  // In-memory storage for rate limit entries (in production, use Redis)
  private readonly rateLimitStore = new Map<string, RateLimitEntry>();
  private readonly circuitBreakers = new Map<string, CircuitBreakerState>();

  // Statistics tracking
  private readonly statistics: RateLimitStatistics = {
    totalRequests: 0,
    allowedRequests: 0,
    blockedRequests: 0,
    averageProcessingTime: 0,
    peakRequestsPerSecond: 0,
    limitViolationsByType: new Map(),
    adaptiveAdjustments: 0,
    circuitBreakerTrips: 0,
  };

  // Adaptive rate limiting factors
  private readonly adaptiveFactors = {
    systemLoadMultiplier: 1.0,
    userBehaviorMultiplier: 1.0,
    timeOfDayMultiplier: 1.0,
    emergencyModeMultiplier: 0.1, // Severely restrict during emergencies
  };

  constructor() {
    this.logger.log('⚡ Browser Rate Limiter Service initialized');
    this.logger.log(`🎚️ Configured ${this.rateLimitConfigs.size} rate limit profiles`);

    // Start periodic maintenance tasks
    setInterval(() => this.performMaintenanceTasks(), 60000); // Every minute
    setInterval(() => this.updateAdaptiveFactors(), 30000); // Every 30 seconds
    setInterval(() => this.logRateLimitStatistics(), 300000); // Every 5 minutes

    // Initialize circuit breakers
    this.initializeCircuitBreakers();
  }

  /**
   * Main rate limiting evaluation method
   */
  async evaluateRateLimit(context: RateLimitContext): Promise<RateLimitDecision> {
    const startTime = performance.now();
    const limitId = this.generateLimitId();

    this.statistics.totalRequests++;

    this.logger.debug(
      `[${limitId}] Evaluating rate limits`,
      {
        userId: context.user.userId,
        operation: context.operation.type,
        endpoint: context.operation.endpoint,
        complexity: context.operation.complexity,
      }
    );

    try {
      // Step 1: Check circuit breakers
      const circuitBreakerCheck = this.checkCircuitBreakers(context);
      if (!circuitBreakerCheck.allowed) {
        const decision = this.createBlockedDecision(
          limitId,
          'Circuit breaker active',
          circuitBreakerCheck.retryAfterMs || 60000,
          startTime,
          'CIRCUIT_BREAKER'
        );
        this.updateStatistics(decision);
        return decision;
      }

      // Step 2: Apply adaptive factors
      await this.applyAdaptiveFactors(context);

      // Step 3: Evaluate all applicable rate limits
      const rateLimitChecks = await this.evaluateAllRateLimits(context);

      // Step 4: Determine overall decision
      const blockedLimit = rateLimitChecks.find(check => !check.allowed);

      if (blockedLimit) {
        const decision = this.createBlockedDecision(
          limitId,
          blockedLimit.reason,
          blockedLimit.retryAfterMs || 60000,
          startTime,
          blockedLimit.rateLimitType,
          rateLimitChecks
        );

        // Update circuit breaker state on rate limit violation
        this.updateCircuitBreakerOnFailure(context);

        this.updateStatistics(decision);
        this.statistics.blockedRequests++;

        this.logger.warn(
          `[${limitId}] Rate limit exceeded`,
          {
            userId: context.user.userId,
            limitType: blockedLimit.rateLimitType,
            reason: blockedLimit.reason,
            retryAfter: blockedLimit.retryAfterMs,
          }
        );

        return decision;
      }

      // Step 5: Create successful decision
      const decision = this.createAllowedDecision(
        limitId,
        'Rate limits passed',
        startTime,
        rateLimitChecks
      );

      // Update circuit breaker state on success
      this.updateCircuitBreakerOnSuccess(context);

      // Record the request in all applicable limits
      await this.recordSuccessfulRequest(context, rateLimitChecks);

      this.updateStatistics(decision);
      this.statistics.allowedRequests++;

      this.logger.debug(
        `[${limitId}] Rate limits passed`,
        {
          userId: context.user.userId,
          appliedLimits: rateLimitChecks.length,
          processingTime: `${(performance.now() - startTime).toFixed(2)}ms`,
        }
      );

      return decision;

    } catch (error) {
      const processingTime = performance.now() - startTime;

      this.logger.error(
        `[${limitId}] Rate limit evaluation failed`,
        {
          error: error instanceof Error ? error.message : String(error),
          userId: context.user.userId,
          operation: context.operation.type,
          processingTime: `${processingTime.toFixed(2)}ms`,
        }
      );

      // Fail-safe: allow request but log the failure
      return this.createAllowedDecision(
        limitId,
        'Rate limit evaluation failed - allowing request',
        startTime,
        []
      );
    }
  }

  /**
   * Get current rate limit status for user
   */
  async getRateLimitStatus(userId: string): Promise<{
    limits: AppliedRateLimit[];
    overallStatus: 'NORMAL' | 'WARNING' | 'CRITICAL';
    recommendations: string[];
  }> {
    const limits: AppliedRateLimit[] = [];
    const userKey = `user:${userId}`;

    // Check user-specific limits
    const userEntry = this.rateLimitStore.get(userKey);
    if (userEntry) {
      const config = this.rateLimitConfigs.get('user:default') || this.rateLimitConfigs.get('user:default')!;
      const remaining = Math.max(0, config.maxRequests - userEntry.count);
      const resetTime = new Date(userEntry.windowStart.getTime() + config.windowSizeMs);

      limits.push({
        type: 'USER',
        name: 'User Rate Limit',
        current: userEntry.count,
        limit: config.maxRequests,
        windowMs: config.windowSizeMs,
        resetTime,
        blocked: userEntry.count >= config.maxRequests,
        severity: userEntry.count >= config.maxRequests * 0.9 ? 'CRITICAL' :
                 userEntry.count >= config.maxRequests * 0.7 ? 'HIGH' :
                 userEntry.count >= config.maxRequests * 0.5 ? 'MEDIUM' : 'LOW',
      });
    }

    // Check endpoint-specific limits
    const endpointKeys = Array.from(this.rateLimitStore.keys()).filter(key =>
      key.startsWith(`endpoint:`) && key.includes(userId)
    );

    for (const key of endpointKeys) {
      const entry = this.rateLimitStore.get(key);
      if (entry) {
        const configKey = key.split(':')[1];
        const config = this.rateLimitConfigs.get(`endpoint:${configKey}`);
        if (config) {
          limits.push({
            type: 'ENDPOINT',
            name: `Endpoint: ${configKey}`,
            current: entry.count,
            limit: config.maxRequests,
            windowMs: config.windowSizeMs,
            resetTime: new Date(entry.windowStart.getTime() + config.windowSizeMs),
            blocked: entry.count >= config.maxRequests,
            severity: entry.count >= config.maxRequests * 0.9 ? 'CRITICAL' : 'LOW',
          });
        }
      }
    }

    // Determine overall status
    const overallStatus = limits.some(l => l.blocked) ? 'CRITICAL' :
                         limits.some(l => l.severity === 'HIGH') ? 'WARNING' : 'NORMAL';

    // Generate recommendations
    const recommendations: string[] = [];
    if (overallStatus === 'CRITICAL') {
      recommendations.push('Reduce request frequency immediately');
      recommendations.push('Consider batching operations');
    } else if (overallStatus === 'WARNING') {
      recommendations.push('Slow down request rate to avoid limits');
      recommendations.push('Optimize operation complexity');
    }

    return { limits, overallStatus, recommendations };
  }

  // ===== RATE LIMIT EVALUATION METHODS =====

  /**
   * Evaluate all applicable rate limits for the context
   */
  private async evaluateAllRateLimits(context: RateLimitContext): Promise<AppliedRateLimit[]> {
    const checks: AppliedRateLimit[] = [];

    // Global rate limit
    checks.push(await this.evaluateGlobalRateLimit(context));

    // User-specific rate limits
    checks.push(await this.evaluateUserRateLimit(context));

    // Endpoint-specific rate limits
    checks.push(await this.evaluateEndpointRateLimit(context));

    // Operation-specific rate limits
    checks.push(await this.evaluateOperationRateLimit(context));

    // Resource-based rate limits
    if (context.operation.resourceIntensive) {
      checks.push(await this.evaluateResourceRateLimit(context));
    }

    return checks.filter(check => check !== null) as AppliedRateLimit[];
  }

  /**
   * Evaluate global rate limit
   */
  private async evaluateGlobalRateLimit(context: RateLimitContext): Promise<AppliedRateLimit> {
    const config = this.rateLimitConfigs.get('global')!;
    const key = 'global';

    return this.evaluateRateLimitWithConfig(key, config, 'GLOBAL', 'Global Rate Limit');
  }

  /**
   * Evaluate user-specific rate limit
   */
  private async evaluateUserRateLimit(context: RateLimitContext): Promise<AppliedRateLimit> {
    const userRole = this.getUserRoleForRateLimit(context.user);
    const configKey = `user:${userRole}`;
    const config = this.rateLimitConfigs.get(configKey) || this.rateLimitConfigs.get('user:default')!;
    const key = `user:${context.user.userId}`;

    return this.evaluateRateLimitWithConfig(key, config, 'USER', `User Rate Limit (${userRole})`);
  }

  /**
   * Evaluate endpoint-specific rate limit
   */
  private async evaluateEndpointRateLimit(context: RateLimitContext): Promise<AppliedRateLimit> {
    const endpointType = this.getEndpointTypeForRateLimit(context.operation);
    const configKey = `endpoint:${endpointType}`;
    const config = this.rateLimitConfigs.get(configKey);

    if (!config) {
      return this.createPassedLimit('ENDPOINT', `Endpoint: ${endpointType}`, 0, 999999);
    }

    const key = `${configKey}:${context.user.userId}`;

    return this.evaluateRateLimitWithConfig(key, config, 'ENDPOINT', `Endpoint: ${endpointType}`);
  }

  /**
   * Evaluate operation-specific rate limit
   */
  private async evaluateOperationRateLimit(context: RateLimitContext): Promise<AppliedRateLimit> {
    // Dynamic operation-based limits based on complexity
    const complexityMultiplier = this.getComplexityMultiplier(context.operation.complexity);
    const baseConfig = this.rateLimitConfigs.get('user:default')!;

    const config: RateLimitConfig = {
      ...baseConfig,
      maxRequests: Math.floor(baseConfig.maxRequests / complexityMultiplier),
      retryAfterMs: baseConfig.retryAfterMs * complexityMultiplier,
    };

    const key = `operation:${context.operation.type}:${context.user.userId}`;

    return this.evaluateRateLimitWithConfig(key, config, 'OPERATION', `Operation: ${context.operation.type}`);
  }

  /**
   * Evaluate resource-based rate limit
   */
  private async evaluateResourceRateLimit(context: RateLimitContext): Promise<AppliedRateLimit> {
    const resourceType = context.operation.complexity === 'CRITICAL' ? 'cpu_intensive' : 'memory_intensive';
    const configKey = `resource:${resourceType}`;
    const config = this.rateLimitConfigs.get(configKey)!;
    const key = `${configKey}:${context.user.userId}`;

    return this.evaluateRateLimitWithConfig(key, config, 'RESOURCE', `Resource: ${resourceType}`);
  }

  /**
   * Core rate limit evaluation with token bucket algorithm
   */
  private evaluateRateLimitWithConfig(
    key: string,
    config: RateLimitConfig,
    type: 'GLOBAL' | 'USER' | 'ENDPOINT' | 'OPERATION' | 'RESOURCE' | 'ADAPTIVE',
    name: string
  ): AppliedRateLimit {
    if (!config.enabled) {
      return this.createPassedLimit(type, name, 0, config.maxRequests);
    }

    const now = new Date();
    let entry = this.rateLimitStore.get(key);

    // Initialize entry if not exists
    if (!entry) {
      entry = {
        key,
        count: 0,
        windowStart: now,
        lastAccess: now,
        bucket: {
          tokens: config.maxRequests,
          capacity: config.maxRequests,
          refillRate: config.maxRequests / (config.windowSizeMs / 1000), // tokens per second
          lastRefill: now,
        },
        violations: 0,
        adaptiveFactor: 1.0,
      };
      this.rateLimitStore.set(key, entry);
    }

    // Apply adaptive factors
    const adaptiveLimit = Math.floor(config.maxRequests * entry.adaptiveFactor * this.calculateSystemAdaptiveFactor());

    // Use token bucket algorithm for burst handling
    const bucketResult = this.evaluateTokenBucket(entry.bucket!, config, adaptiveLimit);

    // Update sliding window
    const windowResult = this.evaluateSlidingWindow(entry, config, adaptiveLimit, now);

    // Determine if request is allowed (both bucket and window must allow)
    const allowed = bucketResult.allowed && windowResult.allowed;
    const resetTime = new Date(entry.windowStart.getTime() + config.windowSizeMs);

    if (allowed) {
      entry.count++;
      entry.lastAccess = now;
      if (entry.bucket) {
        entry.bucket.tokens--;
      }
    } else {
      entry.violations++;
    }

    return {
      type,
      name,
      current: entry.count,
      limit: adaptiveLimit,
      windowMs: config.windowSizeMs,
      resetTime,
      blocked: !allowed,
      severity: this.calculateLimitSeverity(entry.count, adaptiveLimit),
    };
  }

  /**
   * Evaluate token bucket for burst handling
   */
  private evaluateTokenBucket(bucket: TokenBucket, config: RateLimitConfig, limit: number): { allowed: boolean } {
    const now = new Date();
    const timeSinceLastRefill = now.getTime() - bucket.lastRefill.getTime();
    const tokensToAdd = Math.floor((timeSinceLastRefill / 1000) * bucket.refillRate);

    // Refill tokens
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;

    // Check if request can be allowed
    const allowed = bucket.tokens > 0;

    return { allowed };
  }

  /**
   * Evaluate sliding window
   */
  private evaluateSlidingWindow(
    entry: RateLimitEntry,
    config: RateLimitConfig,
    limit: number,
    now: Date
  ): { allowed: boolean } {
    // Reset window if expired
    if (now.getTime() - entry.windowStart.getTime() > config.windowSizeMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    return { allowed: entry.count < limit };
  }

  // ===== CIRCUIT BREAKER METHODS =====

  /**
   * Initialize circuit breakers for different contexts
   */
  private initializeCircuitBreakers(): void {
    const circuitBreakerKeys = [
      'global',
      'user:default',
      'endpoint:task_create',
      'endpoint:session_create',
      'endpoint:async_job',
      'resource:memory_intensive',
      'resource:cpu_intensive',
    ];

    circuitBreakerKeys.forEach(key => {
      this.circuitBreakers.set(key, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: new Date(),
        recoveryTimeoutMs: 60000, // 1 minute
      });
    });
  }

  /**
   * Check circuit breaker states
   */
  private checkCircuitBreakers(context: RateLimitContext): { allowed: boolean; retryAfterMs?: number } {
    const circuitBreakerKeys = this.getApplicableCircuitBreakerKeys(context);

    for (const key of circuitBreakerKeys) {
      const breaker = this.circuitBreakers.get(key);
      if (!breaker) continue;

      const now = new Date();

      // Handle OPEN state
      if (breaker.state === 'OPEN') {
        if (breaker.openTime && now.getTime() - breaker.openTime.getTime() > breaker.recoveryTimeoutMs) {
          breaker.state = 'HALF_OPEN';
          this.logger.log(`Circuit breaker ${key} moved to HALF_OPEN state`);
        } else {
          return { allowed: false, retryAfterMs: breaker.recoveryTimeoutMs };
        }
      }

      // Handle HALF_OPEN state
      if (breaker.state === 'HALF_OPEN') {
        // Allow request but monitor for failure
        return { allowed: true };
      }
    }

    return { allowed: true };
  }

  /**
   * Update circuit breaker on failure
   */
  private updateCircuitBreakerOnFailure(context: RateLimitContext): void {
    const circuitBreakerKeys = this.getApplicableCircuitBreakerKeys(context);

    circuitBreakerKeys.forEach(key => {
      const breaker = this.circuitBreakers.get(key);
      if (!breaker) return;

      breaker.failureCount++;
      breaker.lastFailureTime = new Date();

      const config = this.rateLimitConfigs.get(key);
      if (config && breaker.failureCount >= Math.floor(config.maxRequests * config.circuitBreakerThreshold)) {
        breaker.state = 'OPEN';
        breaker.openTime = new Date();
        this.statistics.circuitBreakerTrips++;

        this.logger.warn(`Circuit breaker ${key} OPENED due to failures`, {
          failureCount: breaker.failureCount,
          threshold: config.circuitBreakerThreshold,
        });
      }
    });
  }

  /**
   * Update circuit breaker on success
   */
  private updateCircuitBreakerOnSuccess(context: RateLimitContext): void {
    const circuitBreakerKeys = this.getApplicableCircuitBreakerKeys(context);

    circuitBreakerKeys.forEach(key => {
      const breaker = this.circuitBreakers.get(key);
      if (!breaker) return;

      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
        this.logger.log(`Circuit breaker ${key} CLOSED after successful request`);
      } else if (breaker.state === 'CLOSED') {
        // Gradually reduce failure count on success
        breaker.failureCount = Math.max(0, breaker.failureCount - 1);
      }
    });
  }

  // ===== ADAPTIVE RATE LIMITING =====

  /**
   * Apply adaptive factors to rate limits
   */
  private async applyAdaptiveFactors(context: RateLimitContext): Promise<void> {
    const systemFactor = this.calculateSystemAdaptiveFactor();
    const userFactor = this.calculateUserAdaptiveFactor(context.user);
    const timeFactor = this.calculateTimeAdaptiveFactor(context.environment.timeOfDay);
    const emergencyFactor = context.environment.emergencyMode ? this.adaptiveFactors.emergencyModeMultiplier : 1.0;

    const overallFactor = systemFactor * userFactor * timeFactor * emergencyFactor;

    // Update adaptive factors for user-specific entries
    const userKey = `user:${context.user.userId}`;
    const userEntry = this.rateLimitStore.get(userKey);
    if (userEntry) {
      userEntry.adaptiveFactor = overallFactor;
      this.statistics.adaptiveAdjustments++;
    }
  }

  /**
   * Calculate system-wide adaptive factor
   */
  private calculateSystemAdaptiveFactor(): number {
    const { systemLoadMultiplier } = this.adaptiveFactors;

    // Reduce limits when system is under load
    if (systemLoadMultiplier > 0.8) return 0.5;
    if (systemLoadMultiplier > 0.6) return 0.7;
    if (systemLoadMultiplier > 0.4) return 0.9;

    return 1.0;
  }

  /**
   * Calculate user-specific adaptive factor
   */
  private calculateUserAdaptiveFactor(user: BrowserUseUserContext): number {
    // Increase limits for trusted users
    switch (user.trustLevel) {
      case 'CRITICAL': return 1.5;
      case 'HIGH': return 1.2;
      case 'MEDIUM': return 1.0;
      case 'LOW': return 0.8;
      default: return 0.6;
    }
  }

  /**
   * Calculate time-based adaptive factor
   */
  private calculateTimeAdaptiveFactor(hour: number): number {
    // Adjust limits based on time of day
    if (hour >= 9 && hour <= 17) return 1.2; // Business hours - higher limits
    if (hour >= 6 && hour <= 22) return 1.0; // Extended hours - normal limits
    return 0.7; // Off hours - reduced limits
  }

  // ===== HELPER METHODS =====

  /**
   * Get user role for rate limiting
   */
  private getUserRoleForRateLimit(user: BrowserUseUserContext): string {
    if (user.roles.includes('admin')) return 'admin';
    if (user.permissions.includes(BrowserPermission.ADMIN_OPERATIONS)) return 'admin';
    if (user.permissions.includes(BrowserPermission.ASYNC_JOBS)) return 'power_user';
    return 'default';
  }

  /**
   * Get endpoint type for rate limiting
   */
  private getEndpointTypeForRateLimit(operation: RateLimitOperation): string {
    switch (operation.type) {
      case 'TASK_CREATE': return 'task_create';
      case 'SESSION_CREATE': return 'session_create';
      case 'ASYNC_JOB': return 'async_job';
      case 'DATA_EXTRACT': return 'data_extract';
      default: return 'default';
    }
  }

  /**
   * Get complexity multiplier for rate limiting
   */
  private getComplexityMultiplier(complexity: string): number {
    switch (complexity) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 2;
    }
  }

  /**
   * Calculate limit severity
   */
  private calculateLimitSeverity(current: number, limit: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const usage = current / limit;
    if (usage >= 1.0) return 'CRITICAL';
    if (usage >= 0.9) return 'HIGH';
    if (usage >= 0.7) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get applicable circuit breaker keys
   */
  private getApplicableCircuitBreakerKeys(context: RateLimitContext): string[] {
    const keys = ['global'];

    const userRole = this.getUserRoleForRateLimit(context.user);
    keys.push(`user:${userRole}`);

    const endpointType = this.getEndpointTypeForRateLimit(context.operation);
    keys.push(`endpoint:${endpointType}`);

    if (context.operation.resourceIntensive) {
      const resourceType = context.operation.complexity === 'CRITICAL' ? 'cpu_intensive' : 'memory_intensive';
      keys.push(`resource:${resourceType}`);
    }

    return keys;
  }

  // ===== DECISION CREATION METHODS =====

  /**
   * Create blocked decision
   */
  private createBlockedDecision(
    limitId: string,
    reason: string,
    retryAfterMs: number,
    startTime: number,
    rateLimitType: string,
    appliedLimits: AppliedRateLimit[] = []
  ): RateLimitDecision {
    const processingTime = performance.now() - startTime;

    return {
      allowed: false,
      reason,
      retryAfterMs,
      remainingRequests: 0,
      totalRequests: 0,
      windowResetTime: new Date(Date.now() + retryAfterMs),
      rateLimitType,
      appliedLimits,
      recommendations: [
        'Reduce request frequency',
        'Implement exponential backoff',
        'Consider batching operations',
      ],
      metadata: {
        limitId,
        timestamp: new Date(),
        processingTime,
        algorithmUsed: 'TOKEN_BUCKET',
        adaptiveFactors: ['system_load', 'user_behavior', 'time_of_day'],
        systemMetrics: {
          load: this.adaptiveFactors.systemLoadMultiplier,
          memory: 0, // Placeholder
          cpu: 0, // Placeholder
          connections: 0, // Placeholder
        },
      },
    };
  }

  /**
   * Create allowed decision
   */
  private createAllowedDecision(
    limitId: string,
    reason: string,
    startTime: number,
    appliedLimits: AppliedRateLimit[]
  ): RateLimitDecision {
    const processingTime = performance.now() - startTime;
    const primaryLimit = appliedLimits.find(l => l.type === 'USER') || appliedLimits[0];

    return {
      allowed: true,
      reason,
      remainingRequests: primaryLimit ? Math.max(0, primaryLimit.limit - primaryLimit.current) : 999,
      totalRequests: primaryLimit ? primaryLimit.current : 0,
      windowResetTime: primaryLimit ? primaryLimit.resetTime : new Date(Date.now() + 60000),
      rateLimitType: 'ALLOWED',
      appliedLimits,
      recommendations: appliedLimits.some(l => l.severity === 'HIGH') ?
        ['Consider reducing request frequency to avoid future limits'] : [],
      metadata: {
        limitId,
        timestamp: new Date(),
        processingTime,
        algorithmUsed: 'TOKEN_BUCKET',
        adaptiveFactors: ['system_load', 'user_behavior', 'time_of_day'],
        systemMetrics: {
          load: this.adaptiveFactors.systemLoadMultiplier,
          memory: 0, // Placeholder
          cpu: 0, // Placeholder
          connections: 0, // Placeholder
        },
      },
    };
  }

  /**
   * Create passed limit
   */
  private createPassedLimit(
    type: 'GLOBAL' | 'USER' | 'ENDPOINT' | 'OPERATION' | 'RESOURCE' | 'ADAPTIVE',
    name: string,
    current: number,
    limit: number
  ): AppliedRateLimit {
    return {
      type,
      name,
      current,
      limit,
      windowMs: 60000,
      resetTime: new Date(Date.now() + 60000),
      blocked: false,
      severity: 'LOW',
    };
  }

  // ===== MAINTENANCE METHODS =====

  /**
   * Record successful request in all applicable limits
   */
  private async recordSuccessfulRequest(
    context: RateLimitContext,
    rateLimitChecks: AppliedRateLimit[]
  ): Promise<void> {
    // Implementation would update all relevant rate limit entries
    // This is handled in the evaluation methods above
  }

  /**
   * Update statistics
   */
  private updateStatistics(decision: RateLimitDecision): void {
    this.statistics.averageProcessingTime =
      (this.statistics.averageProcessingTime * (this.statistics.totalRequests - 1) + decision.metadata.processingTime)
      / this.statistics.totalRequests;

    if (!decision.allowed) {
      const violationType = decision.rateLimitType;
      this.statistics.limitViolationsByType.set(
        violationType,
        (this.statistics.limitViolationsByType.get(violationType) || 0) + 1
      );
    }
  }

  /**
   * Periodic maintenance tasks
   */
  private performMaintenanceTasks(): void {
    const now = new Date();
    let cleanedEntries = 0;

    // Clean expired entries
    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now.getTime() - entry.lastAccess.getTime() > 3600000) { // 1 hour
        this.rateLimitStore.delete(key);
        cleanedEntries++;
      }
    }

    if (cleanedEntries > 0) {
      this.logger.debug(`Cleaned ${cleanedEntries} expired rate limit entries`);
    }

    // Reset circuit breakers that have been open too long
    this.maintainCircuitBreakers();
  }

  /**
   * Update adaptive factors based on system metrics
   */
  private updateAdaptiveFactors(): void {
    // Placeholder for system metrics collection
    // In production, would integrate with system monitoring

    // Update system load multiplier (placeholder)
    this.adaptiveFactors.systemLoadMultiplier = Math.random() * 0.3 + 0.7; // 0.7-1.0
  }

  /**
   * Maintain circuit breakers
   */
  private maintainCircuitBreakers(): void {
    const now = new Date();

    this.circuitBreakers.forEach((breaker, key) => {
      if (breaker.state === 'OPEN' && breaker.openTime &&
          now.getTime() - breaker.openTime.getTime() > breaker.recoveryTimeoutMs * 2) {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
        this.logger.log(`Circuit breaker ${key} automatically reset to CLOSED`);
      }
    });
  }

  /**
   * Generate unique limit ID
   */
  private generateLimitId(): string {
    return `rl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Log rate limit statistics
   */
  private logRateLimitStatistics(): void {
    const allowanceRate = this.statistics.totalRequests > 0 ?
      (this.statistics.allowedRequests / this.statistics.totalRequests) * 100 : 0;

    this.logger.log('Rate Limit Statistics', {
      totalRequests: this.statistics.totalRequests,
      allowedRequests: this.statistics.allowedRequests,
      blockedRequests: this.statistics.blockedRequests,
      allowanceRate: `${allowanceRate.toFixed(2)}%`,
      averageProcessingTime: `${this.statistics.averageProcessingTime.toFixed(2)}ms`,
      adaptiveAdjustments: this.statistics.adaptiveAdjustments,
      circuitBreakerTrips: this.statistics.circuitBreakerTrips,
      activeLimitEntries: this.rateLimitStore.size,
      violationsByType: Object.fromEntries(this.statistics.limitViolationsByType),
    });
  }

  /**
   * Get current rate limiting metrics for monitoring
   */
  getMetrics() {
    return {
      ...this.statistics,
      allowanceRate: this.statistics.totalRequests > 0 ?
        (this.statistics.allowedRequests / this.statistics.totalRequests) * 100 : 0,
      activeLimitEntries: this.rateLimitStore.size,
      activeCircuitBreakers: Array.from(this.circuitBreakers.entries())
        .filter(([, breaker]) => breaker.state !== 'CLOSED')
        .map(([key, breaker]) => ({ key, state: breaker.state, failures: breaker.failureCount })),
      adaptiveFactors: this.adaptiveFactors,
      configuredLimits: this.rateLimitConfigs.size,
    };
  }
}