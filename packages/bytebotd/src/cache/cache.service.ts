/**
 * Cache Service - Enterprise-grade Redis Caching Implementation
 *
 * Provides high-performance caching with advanced patterns and monitoring.
 * Implements cache-aside, write-through, and cache warming strategies
 * with comprehensive metrics and intelligent cache key management.
 *
 * Features:
 * - Redis-based distributed caching
 * - Cache-aside and write-through patterns
 * - Intelligent TTL management
 * - Cache hit/miss metrics
 * - Bulk operations and cache warming
 * - JSON serialization/deserialization
 * - Error resilience and fallback strategies
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 1.0.0
 */

import { Injectable, Logger, Inject, CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CacheKeyGenerator } from './cache-key.generator';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Cache operation types for metrics tracking
 */
type CacheOperation = 'get' | 'set' | 'del' | 'mget' | 'mset' | 'warm';

/**
 * Cache options for fine-grained control
 */
interface CacheOptions {
  ttl?: number;
  namespace?: string;
  compress?: boolean;
  serialize?: boolean;
}

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalOperations: number;
  avgResponseTime: number;
}

/**
 * Enterprise cache service with Redis backend
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalOperations: 0,
    avgResponseTime: 0,
  };

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly keyGenerator: CacheKeyGenerator,
    private readonly metricsService: MetricsService,
  ) {
    this.logger.log('Cache Service initialized with Redis backend');
    this.startStatsCollection();
  }

  /**
   * Get value from cache (cache-aside pattern)
   *
   * @param key Cache key
   * @param options Cache options
   * @returns Promise<T | null> Cached value or null if not found
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const operationId = `cache_get_${Date.now()}`;
    const startTime = Date.now();

    try {
      const fullKey = this.keyGenerator.generate(key, options.namespace);
      this.logger.debug(`[${operationId}] Cache GET: ${fullKey}`);

      const cachedValue = await this.cacheManager.get<string>(fullKey);
      const duration = Date.now() - startTime;

      if (cachedValue !== undefined && cachedValue !== null) {
        // Cache hit
        this.stats.hits++;
        this.recordOperation('get', 'hit', duration);

        let result: T;
        if (options.serialize !== false) {
          try {
            result = JSON.parse(cachedValue);
          } catch {
            result = cachedValue as unknown as T;
          }
        } else {
          result = cachedValue as unknown as T;
        }

        this.logger.debug(
          `[${operationId}] Cache HIT: ${fullKey} (${duration}ms)`,
        );
        return result;
      } else {
        // Cache miss
        this.stats.misses++;
        this.recordOperation('get', 'miss', duration);

        this.logger.debug(
          `[${operationId}] Cache MISS: ${fullKey} (${duration}ms)`,
        );
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Cache GET error: ${errorMessage} (${duration}ms)`,
      );

      this.recordOperation('get', 'error', duration);
      return null; // Graceful fallback
    } finally {
      this.updateStats();
    }
  }

  /**
   * Set value in cache (cache-aside or write-through pattern)
   *
   * @param key Cache key
   * @param value Value to cache
   * @param options Cache options
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const operationId = `cache_set_${Date.now()}`;
    const startTime = Date.now();

    try {
      const fullKey = this.keyGenerator.generate(key, options.namespace);
      const ttl = options.ttl || 300; // 5 minutes default

      let cacheValue: string;
      if (options.serialize !== false) {
        cacheValue = JSON.stringify(value);
      } else {
        cacheValue = value as unknown as string;
      }

      this.logger.debug(
        `[${operationId}] Cache SET: ${fullKey} (TTL: ${ttl}s)`,
      );

      await this.cacheManager.set(fullKey, cacheValue, ttl * 1000);

      const duration = Date.now() - startTime;
      this.recordOperation('set', 'success', duration);

      this.logger.debug(
        `[${operationId}] Cache SET completed: ${fullKey} (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Cache SET error: ${errorMessage} (${duration}ms)`,
      );

      this.recordOperation('set', 'error', duration);
      // Don't throw - cache errors should be non-fatal
    }
  }

  /**
   * Delete value from cache
   *
   * @param key Cache key
   * @param options Cache options
   */
  async del(key: string, options: CacheOptions = {}): Promise<void> {
    const operationId = `cache_del_${Date.now()}`;
    const startTime = Date.now();

    try {
      const fullKey = this.keyGenerator.generate(key, options.namespace);

      this.logger.debug(`[${operationId}] Cache DEL: ${fullKey}`);

      await this.cacheManager.del(fullKey);

      const duration = Date.now() - startTime;
      this.recordOperation('del', 'success', duration);

      this.logger.debug(
        `[${operationId}] Cache DEL completed: ${fullKey} (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Cache DEL error: ${errorMessage} (${duration}ms)`,
      );

      this.recordOperation('del', 'error', duration);
    }
  }

  /**
   * Get multiple values from cache (bulk operation)
   *
   * @param keys Array of cache keys
   * @param options Cache options
   * @returns Promise<Map<string, T>> Map of key-value pairs
   */
  async mget<T>(
    keys: string[],
    options: CacheOptions = {},
  ): Promise<Map<string, T>> {
    const operationId = `cache_mget_${Date.now()}`;
    const startTime = Date.now();
    const results = new Map<string, T>();

    try {
      this.logger.debug(`[${operationId}] Cache MGET: ${keys.length} keys`);

      // Process keys in parallel
      const promises = keys.map(async (key) => {
        const value = await this.get<T>(key, options);
        if (value !== null) {
          results.set(key, value);
        }
      });

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      this.recordOperation('mget', 'success', duration);

      this.logger.debug(
        `[${operationId}] Cache MGET completed: ${results.size}/${keys.length} found (${duration}ms)`,
      );

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Cache MGET error: ${errorMessage} (${duration}ms)`,
      );

      this.recordOperation('mget', 'error', duration);
      return results; // Return partial results
    }
  }

  /**
   * Set multiple values in cache (bulk operation)
   *
   * @param entries Array of key-value pairs
   * @param options Cache options
   */
  async mset<T>(
    entries: Array<{ key: string; value: T }>,
    options: CacheOptions = {},
  ): Promise<void> {
    const operationId = `cache_mset_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.debug(
        `[${operationId}] Cache MSET: ${entries.length} entries`,
      );

      // Process entries in parallel
      const promises = entries.map(({ key, value }) =>
        this.set(key, value, options),
      );

      await Promise.all(promises);

      const duration = Date.now() - startTime;
      this.recordOperation('mset', 'success', duration);

      this.logger.debug(
        `[${operationId}] Cache MSET completed: ${entries.length} entries (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Cache MSET error: ${errorMessage} (${duration}ms)`,
      );

      this.recordOperation('mset', 'error', duration);
    }
  }

  /**
   * Warm cache with data (pre-populate frequently accessed data)
   *
   * @param dataProvider Function that provides data for caching
   * @param keys Array of keys to warm
   * @param options Cache options
   */
  async warmCache<T>(
    dataProvider: (key: string) => Promise<T | null>,
    keys: string[],
    options: CacheOptions = {},
  ): Promise<void> {
    const operationId = `cache_warm_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.log(
        `[${operationId}] Cache warming started: ${keys.length} keys`,
      );

      const warmPromises = keys.map(async (key) => {
        try {
          const data = await dataProvider(key);
          if (data !== null) {
            await this.set(key, data, options);
          }
        } catch (error) {
          this.logger.warn(
            `Cache warming failed for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      });

      await Promise.all(warmPromises);

      const duration = Date.now() - startTime;
      this.recordOperation('warm', 'success', duration);

      this.logger.log(
        `[${operationId}] Cache warming completed: ${keys.length} keys (${duration}ms)`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Cache warming error: ${errorMessage} (${duration}ms)`,
      );

      this.recordOperation('warm', 'error', duration);
    }
  }

  /**
   * Get cache statistics
   *
   * @returns CacheStats Current cache performance statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Clear cache statistics
   */
  clearStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalOperations: 0,
      avgResponseTime: 0,
    };
    this.logger.log('Cache statistics cleared');
  }

  /**
   * Invalidate cache by pattern
   *
   * @param pattern Key pattern to match (supports wildcards)
   * @param namespace Optional namespace
   */
  async invalidatePattern(pattern: string, namespace?: string): Promise<void> {
    const operationId = `cache_invalidate_${Date.now()}`;

    try {
      // For Redis, we would use SCAN with pattern matching
      // This is a simplified implementation
      this.logger.warn(
        `[${operationId}] Pattern invalidation requested: ${pattern} (not fully implemented)`,
      );

      // TODO: Implement Redis SCAN-based pattern invalidation
      // This would require direct Redis client access
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Pattern invalidation error: ${errorMessage}`,
      );
    }
  }

  /**
   * Record cache operation metrics
   */
  private recordOperation(
    operation: CacheOperation,
    result: 'hit' | 'miss' | 'success' | 'error',
    duration: number,
  ): void {
    try {
      // Record metrics with MetricsService
      this.metricsService.recordCacheOperation?.(operation, result, duration);
    } catch (error) {
      // Ignore metrics errors to prevent cascading failures
      this.logger.debug(
        `Failed to record cache metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.totalOperations = this.stats.hits + this.stats.misses;
    if (this.stats.totalOperations > 0) {
      this.stats.hitRate = (this.stats.hits / this.stats.totalOperations) * 100;
    }
  }

  /**
   * Start periodic statistics collection
   */
  private startStatsCollection(): void {
    // Log cache statistics every 5 minutes
    setInterval(() => {
      if (this.stats.totalOperations > 0) {
        this.logger.log('Cache Performance Stats:', {
          hits: this.stats.hits,
          misses: this.stats.misses,
          hitRate: `${this.stats.hitRate.toFixed(2)}%`,
          totalOperations: this.stats.totalOperations,
        });
      }
    }, 300000); // 5 minutes
  }
}
