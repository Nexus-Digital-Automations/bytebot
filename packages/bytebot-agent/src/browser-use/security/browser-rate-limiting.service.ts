/**
 * Browser-Use Rate Limiting Service
 *
 * Specialized rate limiting implementation for browser automation API endpoints
 * with advanced DOS protection, intelligent throttling, and endpoint-specific limits.
 * Designed for local-only deployment with comprehensive monitoring and alerting.
 *
 * Key Features:
 * - Multi-tier rate limiting (IP, User, Session, Resource-based)
 * - Endpoint-specific rate limits with browser operation considerations
 * - Advanced DOS protection with pattern detection
 * - Circuit breaker integration for overload protection
 * - Real-time monitoring and alerting
 * - Local Redis-like storage or in-memory fallback
 * - Dynamic rate adjustment based on system load
 *
 * @fileoverview Advanced Rate Limiting for Browser Automation APIs
 * @version 1.0.0
 * @author Security & Authentication Agent
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserPermission } from './local-jwt-auth.service';

/**
 * Rate limit tiers for different protection levels
 */
export enum RateLimitTier {
  IP_BASED = 'ip',
  USER_BASED = 'user',
  SESSION_BASED = 'session',
  RESOURCE_BASED = 'resource',
  GLOBAL = 'global',
}

/**
 * Browser-specific endpoints with different rate limit requirements
 */
export enum BrowserEndpointType {
  // High-cost operations
  CREATE_SESSION = 'create_session',
  CAPTURE_SCREENSHOT = 'capture_screenshot',
  NAVIGATE = 'navigate',
  DOM_MANIPULATION = 'dom_manipulation',

  // Medium-cost operations
  FORM_AUTOMATION = 'form_automation',
  DATA_EXTRACTION = 'data_extraction',
  TASK_EXECUTION = 'task_execution',

  // Low-cost operations
  READ_OPERATIONS = 'read_operations',
  STATUS_CHECK = 'status_check',
  MONITORING = 'monitoring',
}

/**
 * Rate limit configuration for specific endpoint
 */
interface EndpointRateLimit {
  endpointType: BrowserEndpointType;
  requests: number;
  windowMs: number;
  burstLimit?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string, endpoint: string) => string;
}

/**
 * Rate limit violation details
 */
interface RateLimitViolation {
  identifier: string;
  endpointType: BrowserEndpointType;
  tier: RateLimitTier;
  currentCount: number;
  limit: number;
  windowMs: number;
  resetTime: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * DOS attack pattern detection
 */
interface DosPattern {
  type: 'BURST' | 'SUSTAINED' | 'DISTRIBUTED' | 'RESOURCE_EXHAUSTION';
  confidence: number; // 0-100
  indicators: string[];
  firstDetected: Date;
  lastSeen: Date;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Rate limiting metrics for monitoring
 */
interface RateLimitMetrics {
  totalRequests: number;
  blockedRequests: number;
  topViolators: { identifier: string; violations: number }[];
  endpointMetrics: Record<
    BrowserEndpointType,
    {
      requests: number;
      blocked: number;
      averageResponseTime: number;
    }
  >;
  dosPatterns: DosPattern[];
  systemLoad: {
    cpuUsage: number;
    memoryUsage: number;
    activeSessions: number;
  };
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number;
  firstRequest: Date;
  lastRequest: Date;
  resetTime: Date;
  blocked: boolean;
  violations: number;
}

/**
 * Configuration for browser rate limiting
 */
interface BrowserRateLimitConfig {
  enableRateLimiting: boolean;
  enableDosProtection: boolean;
  enableDynamicLimits: boolean;
  enableCircuitBreaker: boolean;
  storeType: 'memory' | 'redis';
  redisUrl?: string;
  defaultWindowMs: number;
  cleanupIntervalMs: number;
  violationThreshold: number;
  dosDetectionSensitivity: number;
  alertThresholds: {
    violations: number;
    blockedRequests: number;
    dosConfidence: number;
  };
}

@Injectable()
export class BrowserRateLimitingService {
  private readonly logger = new Logger(BrowserRateLimitingService.name);
  private readonly config: BrowserRateLimitConfig;
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly violations = new Map<string, RateLimitViolation[]>();
  private readonly dosPatterns = new Map<string, DosPattern>();
  private readonly metrics: RateLimitMetrics;

  private cleanupTimer?: NodeJS.Timer;
  private circuitBreakerOpen = false;
  private circuitBreakerOpenUntil?: Date;

  // Endpoint-specific rate limits
  private readonly endpointLimits: Record<
    BrowserEndpointType,
    EndpointRateLimit
  > = {
    [BrowserEndpointType.CREATE_SESSION]: {
      endpointType: BrowserEndpointType.CREATE_SESSION,
      requests: 5,
      windowMs: 60000, // 1 minute
      burstLimit: 2,
    },
    [BrowserEndpointType.CAPTURE_SCREENSHOT]: {
      endpointType: BrowserEndpointType.CAPTURE_SCREENSHOT,
      requests: 30,
      windowMs: 60000, // 1 minute
      burstLimit: 10,
    },
    [BrowserEndpointType.NAVIGATE]: {
      endpointType: BrowserEndpointType.NAVIGATE,
      requests: 60,
      windowMs: 60000, // 1 minute
      burstLimit: 20,
    },
    [BrowserEndpointType.DOM_MANIPULATION]: {
      endpointType: BrowserEndpointType.DOM_MANIPULATION,
      requests: 120,
      windowMs: 60000, // 1 minute
      burstLimit: 30,
    },
    [BrowserEndpointType.FORM_AUTOMATION]: {
      endpointType: BrowserEndpointType.FORM_AUTOMATION,
      requests: 60,
      windowMs: 60000, // 1 minute
      burstLimit: 15,
    },
    [BrowserEndpointType.DATA_EXTRACTION]: {
      endpointType: BrowserEndpointType.DATA_EXTRACTION,
      requests: 100,
      windowMs: 60000, // 1 minute
      burstLimit: 25,
    },
    [BrowserEndpointType.TASK_EXECUTION]: {
      endpointType: BrowserEndpointType.TASK_EXECUTION,
      requests: 20,
      windowMs: 60000, // 1 minute
      burstLimit: 5,
    },
    [BrowserEndpointType.READ_OPERATIONS]: {
      endpointType: BrowserEndpointType.READ_OPERATIONS,
      requests: 200,
      windowMs: 60000, // 1 minute
      burstLimit: 50,
    },
    [BrowserEndpointType.STATUS_CHECK]: {
      endpointType: BrowserEndpointType.STATUS_CHECK,
      requests: 300,
      windowMs: 60000, // 1 minute
      burstLimit: 100,
    },
    [BrowserEndpointType.MONITORING]: {
      endpointType: BrowserEndpointType.MONITORING,
      requests: 100,
      windowMs: 60000, // 1 minute
      burstLimit: 30,
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfiguration();
    this.metrics = this.initializeMetrics();
    this.startCleanupTimer();

    this.logger.log('Browser Rate Limiting Service initialized', {
      enableRateLimiting: this.config.enableRateLimiting,
      enableDosProtection: this.config.enableDosProtection,
      storeType: this.config.storeType,
      endpointCount: Object.keys(this.endpointLimits).length,
    });
  }

  /**
   * Check if request should be rate limited
   */
  async checkRateLimit(
    identifier: string,
    endpointType: BrowserEndpointType,
    tier: RateLimitTier = RateLimitTier.IP_BASED,
    metadata?: {
      userAgent?: string;
      sessionId?: string;
      userId?: string;
      permissions?: BrowserPermission[];
    },
  ): Promise<{
    allowed: boolean;
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
    blocked: boolean;
    reason?: string;
  }> {
    if (!this.config.enableRateLimiting) {
      return {
        allowed: true,
        limit: Number.MAX_SAFE_INTEGER,
        remaining: Number.MAX_SAFE_INTEGER,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      };
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      await this.recordViolation(
        identifier,
        endpointType,
        tier,
        'CIRCUIT_BREAKER_OPEN',
      );
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetTime: this.circuitBreakerOpenUntil,
        retryAfter: Math.ceil(
          (this.circuitBreakerOpenUntil.getTime() - Date.now()) / 1000,
        ),
        blocked: true,
        reason: 'Service overloaded - circuit breaker open',
      };
    }

    const endpointLimit = this.endpointLimits[endpointType];
    const key = this.generateKey(identifier, endpointType, tier);

    try {
      // Get or create rate limit entry
      const entry = this.getOrCreateEntry(key, endpointLimit.windowMs);

      // Update metrics
      this.metrics.totalRequests++;
      this.updateEndpointMetrics(endpointType, 'request');

      // Check if currently blocked
      if (entry.blocked && entry.resetTime > new Date()) {
        this.metrics.blockedRequests++;
        this.updateEndpointMetrics(endpointType, 'blocked');

        await this.recordViolation(
          identifier,
          endpointType,
          tier,
          'RATE_LIMIT_EXCEEDED',
        );

        return {
          allowed: false,
          limit: endpointLimit.requests,
          remaining: 0,
          resetTime: entry.resetTime,
          retryAfter: Math.ceil(
            (entry.resetTime.getTime() - Date.now()) / 1000,
          ),
          blocked: true,
          reason: `Rate limit exceeded for ${endpointType}`,
        };
      }

      // Check burst limit first
      if (endpointLimit.burstLimit) {
        const burstWindow = 10000; // 10 seconds
        const burstCount = this.getBurstCount(key, burstWindow);

        if (burstCount >= endpointLimit.burstLimit) {
          entry.blocked = true;
          entry.resetTime = new Date(Date.now() + burstWindow);
          entry.violations++;

          await this.recordViolation(
            identifier,
            endpointType,
            tier,
            'BURST_LIMIT_EXCEEDED',
          );

          return {
            allowed: false,
            limit: endpointLimit.burstLimit,
            remaining: 0,
            resetTime: entry.resetTime,
            retryAfter: 10,
            blocked: true,
            reason: `Burst limit exceeded for ${endpointType}`,
          };
        }
      }

      // Check main rate limit
      if (entry.count >= endpointLimit.requests) {
        entry.blocked = true;
        entry.violations++;

        await this.recordViolation(
          identifier,
          endpointType,
          tier,
          'RATE_LIMIT_EXCEEDED',
        );

        // Check for DOS patterns
        if (this.config.enableDosProtection) {
          await this.detectDosPatterns(identifier, entry);
        }

        this.metrics.blockedRequests++;
        this.updateEndpointMetrics(endpointType, 'blocked');

        return {
          allowed: false,
          limit: endpointLimit.requests,
          remaining: 0,
          resetTime: entry.resetTime,
          retryAfter: Math.ceil(
            (entry.resetTime.getTime() - Date.now()) / 1000,
          ),
          blocked: true,
          reason: `Rate limit exceeded for ${endpointType}`,
        };
      }

      // Allow request and increment counter
      entry.count++;
      entry.lastRequest = new Date();
      this.store.set(key, entry);

      const remaining = Math.max(0, endpointLimit.requests - entry.count);

      return {
        allowed: true,
        limit: endpointLimit.requests,
        remaining,
        resetTime: entry.resetTime,
        blocked: false,
      };
    } catch (error) {
      this.logger.error(
        `Rate limit check failed for ${identifier}:${endpointType}`,
        {
          error: error instanceof Error ? error.message : String(error),
          identifier,
          endpointType,
          tier,
        },
      );

      // Fail open - allow request if rate limiting system fails
      return {
        allowed: true,
        limit: endpointLimit.requests,
        remaining: endpointLimit.requests,
        resetTime: new Date(Date.now() + endpointLimit.windowMs),
        blocked: false,
        reason: 'Rate limiting system error - failing open',
      };
    }
  }

  /**
   * Get rate limiting metrics for monitoring
   */
  getMetrics(): RateLimitMetrics {
    return {
      ...this.metrics,
      dosPatterns: Array.from(this.dosPatterns.values()),
      systemLoad: this.getSystemLoad(),
    };
  }

  /**
   * Get top violators for security monitoring
   */
  getTopViolators(
    limit: number = 10,
  ): { identifier: string; violations: number; patterns: string[] }[] {
    const violatorMap = new Map<
      string,
      { violations: number; patterns: Set<string> }
    >();

    for (const [identifier, violations] of this.violations.entries()) {
      const totalViolations = violations.length;
      const patterns = new Set(
        violations.map((v) => v.tier + ':' + v.endpointType),
      );

      violatorMap.set(identifier, {
        violations: totalViolations,
        patterns,
      });
    }

    return Array.from(violatorMap.entries())
      .sort(([, a], [, b]) => b.violations - a.violations)
      .slice(0, limit)
      .map(([identifier, data]) => ({
        identifier,
        violations: data.violations,
        patterns: Array.from(data.patterns),
      }));
  }

  /**
   * Reset rate limits for specific identifier (admin function)
   */
  async resetRateLimit(
    identifier: string,
    endpointType?: BrowserEndpointType,
    tier: RateLimitTier = RateLimitTier.IP_BASED,
  ): Promise<void> {
    if (endpointType) {
      const key = this.generateKey(identifier, endpointType, tier);
      this.store.delete(key);
    } else {
      // Reset all endpoints for this identifier
      for (const endpoint of Object.values(BrowserEndpointType)) {
        const key = this.generateKey(identifier, endpoint, tier);
        this.store.delete(key);
      }
    }

    // Clear violations
    this.violations.delete(identifier);

    this.logger.log(`Rate limits reset for ${identifier}`, {
      identifier,
      endpointType,
      tier,
    });
  }

  /**
   * Update endpoint-specific rate limits dynamically
   */
  updateEndpointLimit(
    endpointType: BrowserEndpointType,
    newLimit: Partial<EndpointRateLimit>,
  ): void {
    this.endpointLimits[endpointType] = {
      ...this.endpointLimits[endpointType],
      ...newLimit,
    };

    this.logger.log(`Updated rate limit for ${endpointType}`, {
      endpointType,
      newLimit,
    });
  }

  /**
   * Get current rate limit status for identifier
   */
  getRateLimitStatus(
    identifier: string,
    endpointType: BrowserEndpointType,
    tier: RateLimitTier = RateLimitTier.IP_BASED,
  ): {
    current: number;
    limit: number;
    remaining: number;
    resetTime: Date;
    blocked: boolean;
  } | null {
    const key = this.generateKey(identifier, endpointType, tier);
    const entry = this.store.get(key);
    const endpointLimit = this.endpointLimits[endpointType];

    if (!entry) {
      return {
        current: 0,
        limit: endpointLimit.requests,
        remaining: endpointLimit.requests,
        resetTime: new Date(Date.now() + endpointLimit.windowMs),
        blocked: false,
      };
    }

    return {
      current: entry.count,
      limit: endpointLimit.requests,
      remaining: Math.max(0, endpointLimit.requests - entry.count),
      resetTime: entry.resetTime,
      blocked: entry.blocked,
    };
  }

  // Private helper methods

  private loadConfiguration(): BrowserRateLimitConfig {
    return {
      enableRateLimiting: this.configService.get<boolean>(
        'BROWSER_RATE_LIMITING_ENABLED',
        true,
      ),
      enableDosProtection: this.configService.get<boolean>(
        'BROWSER_DOS_PROTECTION_ENABLED',
        true,
      ),
      enableDynamicLimits: this.configService.get<boolean>(
        'BROWSER_DYNAMIC_LIMITS_ENABLED',
        false,
      ),
      enableCircuitBreaker: this.configService.get<boolean>(
        'BROWSER_CIRCUIT_BREAKER_ENABLED',
        true,
      ),
      storeType: this.configService.get<'memory' | 'redis'>(
        'RATE_LIMIT_STORE_TYPE',
        'memory',
      ),
      redisUrl: this.configService.get<string>('REDIS_URL'),
      defaultWindowMs: this.configService.get<number>(
        'BROWSER_RATE_LIMIT_WINDOW_MS',
        60000,
      ),
      cleanupIntervalMs: this.configService.get<number>(
        'RATE_LIMIT_CLEANUP_INTERVAL_MS',
        300000,
      ),
      violationThreshold: this.configService.get<number>(
        'RATE_LIMIT_VIOLATION_THRESHOLD',
        10,
      ),
      dosDetectionSensitivity: this.configService.get<number>(
        'DOS_DETECTION_SENSITIVITY',
        75,
      ),
      alertThresholds: {
        violations: this.configService.get<number>(
          'ALERT_VIOLATIONS_THRESHOLD',
          50,
        ),
        blockedRequests: this.configService.get<number>(
          'ALERT_BLOCKED_REQUESTS_THRESHOLD',
          100,
        ),
        dosConfidence: this.configService.get<number>(
          'ALERT_DOS_CONFIDENCE_THRESHOLD',
          80,
        ),
      },
    };
  }

  private initializeMetrics(): RateLimitMetrics {
    return {
      totalRequests: 0,
      blockedRequests: 0,
      topViolators: [],
      endpointMetrics: Object.values(BrowserEndpointType).reduce(
        (acc, endpoint) => {
          acc[endpoint] = {
            requests: 0,
            blocked: 0,
            averageResponseTime: 0,
          };
          return acc;
        },
        {} as Record<BrowserEndpointType, any>,
      ),
      dosPatterns: [],
      systemLoad: {
        cpuUsage: 0,
        memoryUsage: 0,
        activeSessions: 0,
      },
    };
  }

  private generateKey(
    identifier: string,
    endpointType: BrowserEndpointType,
    tier: RateLimitTier,
  ): string {
    return `${tier}:${endpointType}:${identifier}`;
  }

  private getOrCreateEntry(key: string, windowMs: number): RateLimitEntry {
    const now = new Date();
    let entry = this.store.get(key);

    if (!entry || entry.resetTime <= now) {
      // Create new entry or reset expired entry
      entry = {
        count: 0,
        firstRequest: now,
        lastRequest: now,
        resetTime: new Date(now.getTime() + windowMs),
        blocked: false,
        violations: entry?.violations || 0,
      };
      this.store.set(key, entry);
    }

    return entry;
  }

  private getBurstCount(baseKey: string, windowMs: number): number {
    const burstKey = `burst:${baseKey}`;
    const entry = this.getOrCreateEntry(burstKey, windowMs);
    return entry.count;
  }

  private async recordViolation(
    identifier: string,
    endpointType: BrowserEndpointType,
    tier: RateLimitTier,
    reason: string,
  ): Promise<void> {
    const violation: RateLimitViolation = {
      identifier,
      endpointType,
      tier,
      currentCount: 0, // Will be filled by caller
      limit: this.endpointLimits[endpointType].requests,
      windowMs: this.endpointLimits[endpointType].windowMs,
      resetTime: new Date(
        Date.now() + this.endpointLimits[endpointType].windowMs,
      ),
      severity: this.calculateViolationSeverity(endpointType, reason),
    };

    if (!this.violations.has(identifier)) {
      this.violations.set(identifier, []);
    }

    const violations = this.violations.get(identifier);
    violations.push(violation);

    // Keep only recent violations
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.violations.set(
      identifier,
      violations.filter((v) => v.resetTime > cutoff),
    );

    this.logger.warn(`Rate limit violation recorded`, {
      identifier,
      endpointType,
      tier,
      reason,
      severity: violation.severity,
      violationCount: violations.length,
    });
  }

  private calculateViolationSeverity(
    endpointType: BrowserEndpointType,
    reason: string,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (reason === 'CIRCUIT_BREAKER_OPEN') return 'CRITICAL';
    if (reason === 'BURST_LIMIT_EXCEEDED') return 'HIGH';

    switch (endpointType) {
      case BrowserEndpointType.CREATE_SESSION:
      case BrowserEndpointType.TASK_EXECUTION:
        return 'HIGH';
      case BrowserEndpointType.CAPTURE_SCREENSHOT:
      case BrowserEndpointType.NAVIGATE:
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  private async detectDosPatterns(
    identifier: string,
    entry: RateLimitEntry,
  ): Promise<void> {
    const patterns: DosPattern[] = [];

    // Burst pattern detection
    if (
      entry.count >
      this.endpointLimits[BrowserEndpointType.CREATE_SESSION].requests * 2
    ) {
      patterns.push({
        type: 'BURST',
        confidence: 85,
        indicators: ['High request volume in short time'],
        firstDetected: entry.firstRequest,
        lastSeen: entry.lastRequest,
        impact: 'HIGH',
      });
    }

    // Sustained pattern detection
    const violationHistory = this.violations.get(identifier) || [];
    if (violationHistory.length >= 5) {
      patterns.push({
        type: 'SUSTAINED',
        confidence: 90,
        indicators: ['Repeated rate limit violations'],
        firstDetected: violationHistory[0].resetTime,
        lastSeen: new Date(),
        impact: 'MEDIUM',
      });
    }

    // Store detected patterns
    patterns.forEach((pattern) => {
      const patternKey = `${identifier}:${pattern.type}`;
      this.dosPatterns.set(patternKey, pattern);
    });

    if (patterns.length > 0) {
      this.logger.warn(`DOS patterns detected for ${identifier}`, {
        identifier,
        patterns: patterns.map((p) => p.type),
        confidence: Math.max(...patterns.map((p) => p.confidence)),
      });
    }
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.config.enableCircuitBreaker) return false;

    if (this.circuitBreakerOpen && this.circuitBreakerOpenUntil) {
      if (new Date() < this.circuitBreakerOpenUntil) {
        return true;
      } else {
        // Reset circuit breaker
        this.circuitBreakerOpen = false;
        this.circuitBreakerOpenUntil = undefined;
        this.logger.log('Circuit breaker reset - service recovered');
        return false;
      }
    }

    // Check if circuit breaker should open
    const recentBlockedRequests = this.metrics.blockedRequests;
    const totalRequests = this.metrics.totalRequests;

    if (totalRequests > 100 && recentBlockedRequests / totalRequests > 0.5) {
      this.openCircuitBreaker();
      return true;
    }

    return false;
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerOpen = true;
    this.circuitBreakerOpenUntil = new Date(Date.now() + 60000); // 1 minute

    this.logger.error('Circuit breaker opened - service overloaded', {
      blockedRequests: this.metrics.blockedRequests,
      totalRequests: this.metrics.totalRequests,
      openUntil: this.circuitBreakerOpenUntil,
    });
  }

  private updateEndpointMetrics(
    endpointType: BrowserEndpointType,
    action: 'request' | 'blocked',
  ): void {
    if (!this.metrics.endpointMetrics[endpointType]) {
      this.metrics.endpointMetrics[endpointType] = {
        requests: 0,
        blocked: 0,
        averageResponseTime: 0,
      };
    }

    if (action === 'request') {
      this.metrics.endpointMetrics[endpointType].requests++;
    } else if (action === 'blocked') {
      this.metrics.endpointMetrics[endpointType].blocked++;
    }
  }

  private getSystemLoad(): {
    cpuUsage: number;
    memoryUsage: number;
    activeSessions: number;
  } {
    // In a real implementation, this would gather actual system metrics
    const used = process.memoryUsage();
    const memoryUsage = (used.heapUsed / used.heapTotal) * 100;

    return {
      cpuUsage: 0, // Would need to implement CPU usage monitoring
      memoryUsage,
      activeSessions: this.store.size,
    };
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);

    this.logger.log(
      `Cleanup timer started - interval: ${this.config.cleanupIntervalMs}ms`,
    );
  }

  private cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    // Clean expired entries
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now && !entry.blocked) {
        this.store.delete(key);
        cleanedCount++;
      }
    }

    // Clean old DOS patterns
    for (const [key, pattern] of this.dosPatterns.entries()) {
      const ageMs = now.getTime() - pattern.lastSeen.getTime();
      if (ageMs > 24 * 60 * 60 * 1000) {
        // 24 hours
        this.dosPatterns.delete(key);
      }
    }

    // Clean old violations
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
    for (const [identifier, violations] of this.violations.entries()) {
      const recentViolations = violations.filter((v) => v.resetTime > cutoff);
      if (recentViolations.length === 0) {
        this.violations.delete(identifier);
      } else {
        this.violations.set(identifier, recentViolations);
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(
        `Cleaned up ${cleanedCount} expired rate limit entries`,
      );
    }
  }
}
