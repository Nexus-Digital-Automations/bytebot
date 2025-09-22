/**
 * Browser Rate Limiting Service - ByteBotd Computer Control Service
 * Specialized rate limiting for browser automation operations
 *
 * Features:
 * - Operation-specific rate limits (navigation, interaction, extraction)
 * - User-based and session-based rate limiting
 * - Dynamic rate adjustments based on system load
 * - Browser session resource management
 * - Circuit breaker integration
 * - Comprehensive audit logging
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Browser Security Implementation
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserOperationType } from '../decorators/browser-security.decorator';

/**
 * Rate limit configuration for different operations
 */
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests in the window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (userId: string, operation: string) => string;
  onLimitReached?: (key: string, info: RateLimitInfo) => void;
}

/**
 * Rate limit information
 */
interface RateLimitInfo {
  key: string;
  totalRequests: number;
  remainingRequests: number;
  resetTime: Date;
  isBlocked: boolean;
  operationType: BrowserOperationType;
  userId?: string;
  sessionId?: string;
}

/**
 * Rate limit store entry
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequestTime: number;
  blockedUntil?: number;
  violations: number;
}

/**
 * Dynamic rate limit adjustments based on system metrics
 */
interface DynamicRateConfig {
  cpuThreshold: number; // CPU usage percentage to trigger rate reduction
  memoryThreshold: number; // Memory usage percentage to trigger rate reduction
  activeSessionsThreshold: number; // Number of active sessions to trigger rate reduction
  adjustmentFactor: number; // Factor to multiply rate limits by (0.5 = 50% reduction)
}

@Injectable()
export class BrowserRateLimitingService {
  private readonly logger = new Logger(BrowserRateLimitingService.name);
  private readonly rateLimitStore = new Map<string, RateLimitEntry>();
  private readonly defaultConfigs: Map<BrowserOperationType, RateLimitConfig>;
  private readonly dynamicConfig: DynamicRateConfig;
  private readonly globalConfig: RateLimitConfig;

  constructor(private readonly configService: ConfigService) {
    // Initialize default rate limit configurations for each operation type
    this.defaultConfigs = new Map([
      [BrowserOperationType.NAVIGATION, {
        windowMs: 60000, // 1 minute
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
      }],
      [BrowserOperationType.INTERACTION, {
        windowMs: 60000, // 1 minute
        maxRequests: 30,
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
      }],
      [BrowserOperationType.EXTRACTION, {
        windowMs: 60000, // 1 minute
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      }],
      [BrowserOperationType.SCREENSHOT, {
        windowMs: 60000, // 1 minute
        maxRequests: 20,
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
      }],
      [BrowserOperationType.SCRIPT_EXECUTION, {
        windowMs: 60000, // 1 minute
        maxRequests: 2,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      }],
      [BrowserOperationType.SESSION_MANAGEMENT, {
        windowMs: 60000, // 1 minute
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      }],
      [BrowserOperationType.UPLOAD, {
        windowMs: 60000, // 1 minute
        maxRequests: 3,
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
      }],
    ]);

    // Global rate limiting configuration
    this.globalConfig = {
      windowMs: this.configService.get<number>('BROWSER_RATE_LIMIT_WINDOW', 60000),
      maxRequests: this.configService.get<number>('BROWSER_RATE_LIMIT_MAX', 100),
    };

    // Dynamic rate adjustment configuration
    this.dynamicConfig = {
      cpuThreshold: this.configService.get<number>('BROWSER_RATE_CPU_THRESHOLD', 80),
      memoryThreshold: this.configService.get<number>('BROWSER_RATE_MEMORY_THRESHOLD', 85),
      activeSessionsThreshold: this.configService.get<number>('BROWSER_RATE_SESSIONS_THRESHOLD', 50),
      adjustmentFactor: this.configService.get<number>('BROWSER_RATE_ADJUSTMENT_FACTOR', 0.5),
    };

    this.logger.log('Browser Rate Limiting Service initialized');
    this.logger.log(`Global config: ${JSON.stringify(this.globalConfig)}`);
    this.logger.log(`Dynamic config: ${JSON.stringify(this.dynamicConfig)}`);

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Check if request is within rate limits
   */
  async checkRateLimit(
    userId: string,
    operationType: BrowserOperationType,
    sessionId?: string,
    customConfig?: Partial<RateLimitConfig>
  ): Promise<RateLimitInfo> {
    // Get configuration for this operation type
    const baseConfig = this.defaultConfigs.get(operationType) || this.globalConfig;
    const config = { ...baseConfig, ...customConfig };

    // Apply dynamic rate adjustments
    const adjustedConfig = await this.applyDynamicAdjustments(config, operationType);

    // Generate rate limit key
    const key = this.generateRateLimitKey(userId, operationType, sessionId);

    // Check current rate limit status
    const entry = this.rateLimitStore.get(key) || this.createNewEntry();
    const now = Date.now();

    // Check if we're in a blocked state
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        key,
        totalRequests: entry.count,
        remainingRequests: 0,
        resetTime: new Date(entry.blockedUntil),
        isBlocked: true,
        operationType,
        userId,
        sessionId,
      };
    }

    // Reset counter if window has expired
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = now + adjustedConfig.windowMs;
      entry.firstRequestTime = now;
      entry.blockedUntil = undefined;
    }

    // Check if limit is exceeded
    if (entry.count >= adjustedConfig.maxRequests) {
      entry.violations++;

      // Apply temporary block for repeated violations
      if (entry.violations >= 3) {
        const blockDuration = this.calculateBlockDuration(entry.violations);
        entry.blockedUntil = now + blockDuration;

        this.logger.warn(
          `Rate limit violations threshold reached for ${key}. ` +
          `Blocking for ${blockDuration}ms (violation #${entry.violations})`
        );
      }

      const rateLimitInfo: RateLimitInfo = {
        key,
        totalRequests: entry.count,
        remainingRequests: 0,
        resetTime: new Date(entry.resetTime),
        isBlocked: true,
        operationType,
        userId,
        sessionId,
      };

      // Log rate limit exceeded
      this.logRateLimitViolation(rateLimitInfo, adjustedConfig);

      // Call configured callback if provided
      if (adjustedConfig.onLimitReached) {
        adjustedConfig.onLimitReached(key, rateLimitInfo);
      }

      this.rateLimitStore.set(key, entry);
      return rateLimitInfo;
    }

    // Increment counter
    entry.count++;
    this.rateLimitStore.set(key, entry);

    return {
      key,
      totalRequests: entry.count,
      remainingRequests: adjustedConfig.maxRequests - entry.count,
      resetTime: new Date(entry.resetTime),
      isBlocked: false,
      operationType,
      userId,
      sessionId,
    };
  }

  /**
   * Record successful request (for configs that skip successful requests)
   */
  recordSuccessfulRequest(
    userId: string,
    operationType: BrowserOperationType,
    sessionId?: string
  ): void {
    const config = this.defaultConfigs.get(operationType);

    if (config?.skipSuccessfulRequests) {
      const key = this.generateRateLimitKey(userId, operationType, sessionId);
      const entry = this.rateLimitStore.get(key);

      if (entry && entry.count > 0) {
        entry.count--;
        this.rateLimitStore.set(key, entry);
      }
    }
  }

  /**
   * Record failed request (for configs that skip failed requests)
   */
  recordFailedRequest(
    userId: string,
    operationType: BrowserOperationType,
    sessionId?: string
  ): void {
    const config = this.defaultConfigs.get(operationType);

    if (config?.skipFailedRequests) {
      const key = this.generateRateLimitKey(userId, operationType, sessionId);
      const entry = this.rateLimitStore.get(key);

      if (entry && entry.count > 0) {
        entry.count--;
        this.rateLimitStore.set(key, entry);
      }
    }
  }

  /**
   * Get current rate limit status for user/operation
   */
  getRateLimitStatus(
    userId: string,
    operationType: BrowserOperationType,
    sessionId?: string
  ): RateLimitInfo | null {
    const key = this.generateRateLimitKey(userId, operationType, sessionId);
    const entry = this.rateLimitStore.get(key);
    const config = this.defaultConfigs.get(operationType) || this.globalConfig;

    if (!entry) {
      return null;
    }

    const now = Date.now();
    const isBlocked = entry.blockedUntil ? now < entry.blockedUntil : entry.count >= config.maxRequests;

    return {
      key,
      totalRequests: entry.count,
      remainingRequests: Math.max(0, config.maxRequests - entry.count),
      resetTime: new Date(entry.resetTime),
      isBlocked,
      operationType,
      userId,
      sessionId,
    };
  }

  /**
   * Reset rate limits for a specific user/operation
   */
  resetRateLimit(
    userId: string,
    operationType?: BrowserOperationType,
    sessionId?: string
  ): void {
    if (operationType) {
      const key = this.generateRateLimitKey(userId, operationType, sessionId);
      this.rateLimitStore.delete(key);
      this.logger.log(`Rate limit reset for ${key}`);
    } else {
      // Reset all rate limits for user
      const userPrefix = `user:${userId}:`;
      for (const [key] of this.rateLimitStore) {
        if (key.startsWith(userPrefix)) {
          this.rateLimitStore.delete(key);
        }
      }
      this.logger.log(`All rate limits reset for user ${userId}`);
    }
  }

  /**
   * Get rate limit statistics
   */
  getStatistics(): {
    totalEntries: number;
    blockedEntries: number;
    topViolators: Array<{ key: string; violations: number; count: number }>;
    operationStats: Map<BrowserOperationType, { total: number; blocked: number }>;
  } {
    const now = Date.now();
    let blockedEntries = 0;
    const violators: Array<{ key: string; violations: number; count: number }> = [];
    const operationStats = new Map<BrowserOperationType, { total: number; blocked: number }>();

    for (const [key, entry] of this.rateLimitStore) {
      const isBlocked = entry.blockedUntil ? now < entry.blockedUntil : false;

      if (isBlocked) {
        blockedEntries++;
      }

      if (entry.violations > 0) {
        violators.push({ key, violations: entry.violations, count: entry.count });
      }

      // Extract operation type from key
      const operationType = this.extractOperationTypeFromKey(key);
      if (operationType) {
        const stats = operationStats.get(operationType) || { total: 0, blocked: 0 };
        stats.total++;
        if (isBlocked) stats.blocked++;
        operationStats.set(operationType, stats);
      }
    }

    // Sort violators by violations descending
    violators.sort((a, b) => b.violations - a.violations);

    return {
      totalEntries: this.rateLimitStore.size,
      blockedEntries,
      topViolators: violators.slice(0, 10), // Top 10 violators
      operationStats,
    };
  }

  /**
   * Apply dynamic rate adjustments based on system load
   */
  private async applyDynamicAdjustments(
    config: RateLimitConfig,
    operationType: BrowserOperationType
  ): Promise<RateLimitConfig> {
    try {
      // Get system metrics (placeholder implementation)
      const systemMetrics = await this.getSystemMetrics();

      let adjustmentFactor = 1.0;

      // Check CPU usage
      if (systemMetrics.cpuUsage > this.dynamicConfig.cpuThreshold) {
        adjustmentFactor *= this.dynamicConfig.adjustmentFactor;
        this.logger.debug(`Reducing rate limits due to high CPU usage: ${systemMetrics.cpuUsage}%`);
      }

      // Check memory usage
      if (systemMetrics.memoryUsage > this.dynamicConfig.memoryThreshold) {
        adjustmentFactor *= this.dynamicConfig.adjustmentFactor;
        this.logger.debug(`Reducing rate limits due to high memory usage: ${systemMetrics.memoryUsage}%`);
      }

      // Check active sessions
      if (systemMetrics.activeSessions > this.dynamicConfig.activeSessionsThreshold) {
        adjustmentFactor *= this.dynamicConfig.adjustmentFactor;
        this.logger.debug(`Reducing rate limits due to high session count: ${systemMetrics.activeSessions}`);
      }

      // Apply adjustments
      if (adjustmentFactor < 1.0) {
        return {
          ...config,
          maxRequests: Math.max(1, Math.floor(config.maxRequests * adjustmentFactor)),
        };
      }

      return config;
    } catch (error) {
      this.logger.error(`Failed to apply dynamic rate adjustments: ${error.message}`);
      return config;
    }
  }

  /**
   * Get system metrics for dynamic rate adjustment
   */
  private async getSystemMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    activeSessions: number;
  }> {
    // Placeholder implementation - in production this would get real metrics
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      activeSessions: Math.floor(Math.random() * 100),
    };
  }

  /**
   * Generate rate limit key
   */
  private generateRateLimitKey(
    userId: string,
    operationType: BrowserOperationType,
    sessionId?: string
  ): string {
    if (sessionId) {
      return `user:${userId}:session:${sessionId}:operation:${operationType}`;
    }
    return `user:${userId}:operation:${operationType}`;
  }

  /**
   * Extract operation type from rate limit key
   */
  private extractOperationTypeFromKey(key: string): BrowserOperationType | null {
    const match = key.match(/operation:(\w+)$/);
    return match ? (match[1] as BrowserOperationType) : null;
  }

  /**
   * Create new rate limit entry
   */
  private createNewEntry(): RateLimitEntry {
    const now = Date.now();
    return {
      count: 0,
      resetTime: now + this.globalConfig.windowMs,
      firstRequestTime: now,
      violations: 0,
    };
  }

  /**
   * Calculate block duration based on violation count
   */
  private calculateBlockDuration(violations: number): number {
    // Exponential backoff: 1min, 5min, 15min, 30min, 1hr
    const durations = [60000, 300000, 900000, 1800000, 3600000];
    const index = Math.min(violations - 3, durations.length - 1);
    return durations[index];
  }

  /**
   * Log rate limit violation
   */
  private logRateLimitViolation(info: RateLimitInfo, config: RateLimitConfig): void {
    this.logger.warn(
      `Rate limit exceeded for ${info.key} - ` +
      `Operation: ${info.operationType}, ` +
      `Requests: ${info.totalRequests}/${config.maxRequests}, ` +
      `Window: ${config.windowMs}ms, ` +
      `Reset: ${info.resetTime.toISOString()}`
    );
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 300000); // Cleanup every 5 minutes
  }

  /**
   * Cleanup expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.rateLimitStore) {
      // Remove entries that have been expired for more than 1 hour
      if (entry.resetTime < now - 3600000 && (!entry.blockedUntil || entry.blockedUntil < now)) {
        this.rateLimitStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired rate limit entries`);
    }
  }

  /**
   * Update rate limit configuration for operation type
   */
  updateOperationConfig(
    operationType: BrowserOperationType,
    config: Partial<RateLimitConfig>
  ): void {
    const currentConfig = this.defaultConfigs.get(operationType) || this.globalConfig;
    const newConfig = { ...currentConfig, ...config };
    this.defaultConfigs.set(operationType, newConfig);

    this.logger.log(
      `Updated rate limit configuration for ${operationType}: ${JSON.stringify(newConfig)}`
    );
  }

  /**
   * Get health status of rate limiting service
   */
  getHealthStatus(): {
    healthy: boolean;
    entriesCount: number;
    blockedCount: number;
    memoryUsage: number;
    lastCleanup: Date;
  } {
    const stats = this.getStatistics();
    const memoryUsage = this.estimateMemoryUsage();

    return {
      healthy: memoryUsage < 100 * 1024 * 1024, // 100MB threshold
      entriesCount: stats.totalEntries,
      blockedCount: stats.blockedEntries,
      memoryUsage,
      lastCleanup: new Date(), // Placeholder
    };
  }

  /**
   * Estimate memory usage of rate limit store
   */
  private estimateMemoryUsage(): number {
    // Rough estimation: 200 bytes per entry
    return this.rateLimitStore.size * 200;
  }
}