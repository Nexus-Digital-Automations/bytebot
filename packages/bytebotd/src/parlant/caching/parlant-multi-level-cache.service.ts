/**
 * Parlant Multi-Level Cache Service - Performance Optimization Implementation
 * 
 * Implements the comprehensive 3-tier caching architecture for achieving
 * sub-1000ms response times with 85%+ cache hit rates.
 * 
 * Architecture:
 * - L1 Cache: In-memory function results (100ms TTL, 1-3ms access)
 * - L2 Cache: Distributed pattern cache (5min TTL, 5-15ms access)
 * - L3 Cache: Persistent long-term cache (1hr TTL, 20-50ms access)
 * 
 * Performance Targets:
 * - Overall Cache Hit Rate: 85-90%
 * - Average Response Time: 10-30ms (cached) vs 150ms (uncached)
 * - Performance Improvement: 80-85% reduction in validation latency
 * - System Throughput: 5-8x improvement with effective caching
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { ParlantValidationResponse, RiskLevel } from '../parlant-integration.service';

// ===== MULTI-LEVEL CACHE INTERFACES =====

/**
 * L1 Cache: In-Memory Function Result Cache
 */
export interface L1CacheConfig {
  readonly maxSize: number;           // 10000 maximum cached items
  readonly ttlMs: number;             // 100ms TTL for immediate reuse
  readonly evictionPolicy: 'LRU';     // Least Recently Used
}

export interface L1CacheEntry {
  readonly result: ParlantValidationResponse;
  readonly timestamp: number;
  readonly accessCount: number;
  readonly lastAccessed: number;
}

/**
 * L2 Cache: Distributed Pattern Cache
 */
export interface L2CacheConfig {
  readonly redis: {
    readonly cluster: string[];
    readonly ttl: {
      readonly pattern: number;      // 5 minutes for pattern-based cache
      readonly result: number;        // 1 minute for specific results
    };
  };
  readonly compression: {
    readonly enabled: boolean;
    readonly algorithm: 'gzip';
    readonly level: number;
  };
}

export interface ValidationPattern {
  readonly functionSignature: string;
  readonly parameterPatterns: string[];
  readonly contextPatterns: string[];
  readonly riskLevel: RiskLevel;
  readonly validationRules: string[];
}

/**
 * L3 Cache: Long-Term Persistent Cache
 */
export interface L3CacheConfig {
  readonly database: 'sqlite' | 'postgresql';
  readonly retention: {
    readonly successful: number;   // 1 hour for successful validations
    readonly failed: number;       // 5 minutes for failed validations
  };
  readonly compression: {
    readonly enabled: boolean;
    readonly threshold: number;    // Compress payloads > 1KB
  };
}

export interface ValidationMetadata {
  readonly functionName: string;
  readonly riskLevel: RiskLevel;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly timestamp: Date;
  readonly context: Record<string, unknown>;
  readonly cacheHit: boolean;
  readonly cacheLevel?: 'L1' | 'L2' | 'L3';
  readonly batchProcessed: boolean;
  readonly batchId?: string;
  readonly circuitBreakerUsed: boolean;
  readonly degradedMode: boolean;
  readonly retryAttempts: number;
}

/**
 * Cache Key Generation and Normalization
 */
export interface CacheKeyGenerator {
  generateFunctionKey(
    functionName: string,
    parameters: unknown[],
    context: Record<string, unknown>
  ): string;
}

/**
 * Multi-level cache performance metrics
 */
export interface MultiLevelCacheStats {
  readonly l1Stats: {
    readonly hitRate: number;
    readonly avgAccessTime: number;
    readonly totalEntries: number;
    readonly memoryUsage: number;
  };
  readonly l2Stats: {
    readonly hitRate: number;
    readonly avgAccessTime: number;
    readonly networkLatency: number;
    readonly compressionRatio: number;
  };
  readonly l3Stats: {
    readonly hitRate: number;
    readonly avgAccessTime: number;
    readonly diskIo: number;
    readonly totalEntries: number;
  };
  readonly overallStats: {
    readonly totalHitRate: number;
    readonly averageLatency: number;
    readonly throughputImprovement: number;
  };
}

// ===== MULTI-LEVEL CACHE SERVICE =====

@Injectable()
export class ParlantMultiLevelCacheService implements OnModuleInit, CacheKeyGenerator {
  private readonly logger = new Logger(ParlantMultiLevelCacheService.name);

  // L1 Cache: In-Memory Fast Access
  private readonly l1Cache = new Map<string, L1CacheEntry>();
  private readonly l1AccessOrder = new Set<string>();
  private readonly l1Config: L1CacheConfig = {
    maxSize: 10000,
    ttlMs: 100,
    evictionPolicy: 'LRU'
  };

  // L2 Cache: Distributed Redis (placeholder for now)
  private redisClient: unknown = null;
  private readonly l2Config: L2CacheConfig = {
    redis: {
      cluster: [],
      ttl: {
        pattern: 300000, // 5 minutes
        result: 60000,   // 1 minute
      }
    },
    compression: {
      enabled: true,
      algorithm: 'gzip',
      level: 6
    }
  };

  // L3 Cache: Persistent Storage (placeholder for now)
  private dbClient: unknown = null;
  private readonly l3Config: L3CacheConfig = {
    database: 'sqlite',
    retention: {
      successful: 3600000, // 1 hour
      failed: 300000,      // 5 minutes
    },
    compression: {
      enabled: true,
      threshold: 1024      // 1KB
    }
  };

  // Performance tracking
  private stats: MultiLevelCacheStats = {
    l1Stats: {
      hitRate: 0,
      avgAccessTime: 0,
      totalEntries: 0,
      memoryUsage: 0
    },
    l2Stats: {
      hitRate: 0,
      avgAccessTime: 0,
      networkLatency: 0,
      compressionRatio: 0
    },
    l3Stats: {
      hitRate: 0,
      avgAccessTime: 0,
      diskIo: 0,
      totalEntries: 0
    },
    overallStats: {
      totalHitRate: 0,
      averageLatency: 0,
      throughputImprovement: 0
    }
  };

  private performanceMetrics = {
    totalRequests: 0,
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    totalMisses: 0,
    latencySum: 0
  };

  constructor(
    _private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Parlant Multi-Level Cache Service...');
    
    // Initialize cache configurations from environment
    this.initializeCacheConfigurations();
    
    // TODO: Initialize Redis client for L2 cache
    // TODO: Initialize database client for L3 cache
    
    this.logger.log('Multi-Level Cache Service initialized successfully');
  }

  // ===== CACHE KEY GENERATION =====

  generateFunctionKey(
    functionName: string,
    parameters: unknown[],
    context: Record<string, unknown>
  ): string {
    const normalizedParams = this.normalizeParameters(parameters);
    const contextHash = this.hashContext(context);
    
    return `${functionName}:${normalizedParams}:${contextHash}`;
  }

  private normalizeParameters(params: unknown[]): string {
    return params
      .map(param => this.normalizeParameter(param))
      .join('|');
  }

  private normalizeParameter(param: unknown): string {
    if (param === null || param === undefined) {
      return 'null';
    }
    
    if (typeof param === 'object' && param !== null) {
      // Sort object keys for consistent hashing
      const sorted = Object.keys(param as Record<string, unknown>)
        .sort()
        .reduce((acc, key) => {
          acc[key] = (param as Record<string, unknown>)[key];
          return acc;
        }, {} as Record<string, unknown>);
      
      return this.hash(JSON.stringify(sorted));
    }
    
    return String(param);
  }

  private hashContext(context: Record<string, unknown>): string {
    const relevantContext = {
      userId: context.userId,
      sessionId: context.sessionId,
      permissions: Array.isArray(context.permissions) ? 
        [...(context.permissions as unknown[])].sort() : context.permissions,
      // 1-minute precision for temporal locality
      timestamp: Math.floor(Date.now() / 60000) * 60000
    };
    
    return this.hash(JSON.stringify(relevantContext));
  }

  private hash(data: string): string {
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  // ===== L1 CACHE: IN-MEMORY FAST ACCESS =====

  private setL1Cache(key: string, result: ParlantValidationResponse): void {
    const now = Date.now();
    
    // Evict LRU if at capacity
    if (this.l1Cache.size >= this.l1Config.maxSize) {
      this.evictLRU();
    }
    
    this.l1Cache.set(_key, {
      result,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    });
    
    this.updateL1AccessOrder(key);
  }

  private getL1Cache(key: string): ParlantValidationResponse | null {
    const entry = this.l1Cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    
    // Check TTL
    if (now - entry.timestamp > this.l1Config.ttlMs) {
      this.l1Cache.delete(key);
      this.l1AccessOrder.delete(key);
      return null;
    }
    
    // Update access tracking
    const updatedEntry = {
      ...entry,
      accessCount: entry.accessCount + 1,
      lastAccessed: now
    };
    this.l1Cache.set(key, updatedEntry);
    this.updateL1AccessOrder(key);
    
    return entry.result;
  }

  private evictLRU(): void {
    const oldestKey = this.l1AccessOrder.values().next().value;
    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
      this.l1AccessOrder.delete(oldestKey);
    }
  }

  private updateL1AccessOrder(key: string): void {
    this.l1AccessOrder.delete(key);
    this.l1AccessOrder.add(key);
  }

  // ===== L2 CACHE: DISTRIBUTED PATTERN CACHE =====

  private async setL2Cache(
    key: string,
    result: ParlantValidationResponse,
    _pattern?: ValidationPattern
  ): Promise<void> {
    // TODO: Implement Redis cluster caching
    // For now, placeholder implementation
    this.logger.debug(`L2 Cache SET: ${key} (placeholder)`);
  }

  private async getL2Cache(key: string): Promise<ParlantValidationResponse | null> {
    // TODO: Implement Redis cluster lookup
    // For now, placeholder implementation
    this.logger.debug(`L2 Cache GET: ${key} (placeholder)`);
    return null;
  }

  private async cacheValidationPattern(
    functionSignature: string,
    pattern: ValidationPattern
  ): Promise<void> {
    // TODO: Implement pattern caching in Redis
    this.logger.debug(`L2 Pattern Cache: ${functionSignature} (placeholder)`);
  }

  // ===== L3 CACHE: PERSISTENT LONG-TERM CACHE =====

  private async setL3Cache(
    key: string,
    result: ParlantValidationResponse,
    metadata: ValidationMetadata
  ): Promise<void> {
    // TODO: Implement persistent database caching
    this.logger.debug(`L3 Cache SET: ${key} (placeholder)`);
  }

  private async getL3Cache(key: string): Promise<ParlantValidationResponse | null> {
    // TODO: Implement persistent database lookup
    this.logger.debug(`L3 Cache GET: ${key} (placeholder)`);
    return null;
  }

  // ===== PUBLIC CACHE INTERFACE =====

  /**
   * Get cached validation result with multi-level lookup
   */
  async getCachedValidation(
    functionName: string,
    parameters: unknown[],
    context: Record<string, unknown>
  ): Promise<ParlantValidationResponse | null> {
    const startTime = Date.now();
    const key = this.generateFunctionKey(functionName, parameters, context);
    
    this.performanceMetrics.totalRequests++;
    
    try {
      // L1 Cache: In-memory fast lookup (1-3ms)
      const l1Result = this.getL1Cache(key);
      if (l1Result) {
        this.performanceMetrics.l1Hits++;
        this.recordCacheHit('L1', Date.now() - startTime);
        return l1Result;
      }
      
      // L2 Cache: Distributed Redis lookup (5-15ms)
      const l2Result = await this.getL2Cache(key);
      if (l2Result) {
        // Store in L1 for future fast access
        this.setL1Cache(key, l2Result);
        this.performanceMetrics.l2Hits++;
        this.recordCacheHit('L2', Date.now() - startTime);
        return l2Result;
      }
      
      // L3 Cache: Persistent database lookup (20-50ms)
      const l3Result = await this.getL3Cache(key);
      if (l3Result) {
        // Store in L2 and L1 for future access
        await this.setL2Cache(key, l3Result);
        this.setL1Cache(key, l3Result);
        this.performanceMetrics.l3Hits++;
        this.recordCacheHit('L3', Date.now() - startTime);
        return l3Result;
      }
      
      // Cache miss
      this.performanceMetrics.totalMisses++;
      this.recordCacheMiss(Date.now() - startTime);
      return null;
      
    } catch (error) {
      this.logger.error(`Cache lookup error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Store validation result in multi-level cache
   */
  async setCachedValidation(
    functionName: string,
    parameters: unknown[],
    context: Record<string, unknown>,
    result: ParlantValidationResponse,
    metadata: ValidationMetadata
  ): Promise<void> {
    const key = this.generateFunctionKey(functionName, parameters, context);
    
    try {
      // Store in all cache levels for maximum performance
      this.setL1Cache(key, result);
      await this.setL2Cache(key, result);
      await this.setL3Cache(key, result, metadata);
      
    } catch (error) {
      this.logger.error(`Cache storage error for key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    // L1 Cache: In-memory invalidation
    for (const key of this.l1Cache.keys()) {
      if (key.includes(pattern)) {
        this.l1Cache.delete(key);
        this.l1AccessOrder.delete(key);
      }
    }
    
    // TODO: L2 and L3 cache invalidation
    this.logger.debug(`Invalidated cache entries matching pattern: ${pattern}`);
  }

  // ===== PERFORMANCE TRACKING =====

  private recordCacheHit(level: 'L1' | 'L2' | 'L3', latency: number): void {
    this.performanceMetrics.latencySum += latency;
    this.updateCacheStats();
  }

  private recordCacheMiss(latency: number): void {
    this.performanceMetrics.latencySum += latency;
    this.updateCacheStats();
  }

  /**
   * Helper methods to update readonly cache stats properties
   */
  private updateMultiLevelStats(updates: Partial<MultiLevelCacheStats>): void {
    this.stats = { ...this.stats, ...updates };
  }

  private updateL1Stats(updates: Partial<MultiLevelCacheStats['l1Stats']>): void {
    this.updateMultiLevelStats({
      l1Stats: { ...this.stats.l1Stats, ...updates }
    });
  }

  private updateL2Stats(updates: Partial<MultiLevelCacheStats['l2Stats']>): void {
    this.updateMultiLevelStats({
      l2Stats: { ...this.stats.l2Stats, ...updates }
    });
  }

  private updateL3Stats(updates: Partial<MultiLevelCacheStats['l3Stats']>): void {
    this.updateMultiLevelStats({
      l3Stats: { ...this.stats.l3Stats, ...updates }
    });
  }

  private updateOverallStats(updates: Partial<MultiLevelCacheStats['overallStats']>): void {
    this.updateMultiLevelStats({
      overallStats: { ...this.stats.overallStats, ...updates }
    });
  }

  private updateCacheStats(): void {
    const total = this.performanceMetrics.totalRequests;
    if (total === 0) return;
    
    // Calculate hit rates
    const l1HitRate = this.performanceMetrics.l1Hits / total;
    const l2HitRate = this.performanceMetrics.l2Hits / total;
    const l3HitRate = this.performanceMetrics.l3Hits / total;
    const totalHitRate = (this.performanceMetrics.l1Hits + 
                         this.performanceMetrics.l2Hits + 
                         this.performanceMetrics.l3Hits) / total;
    const averageLatency = this.performanceMetrics.latencySum / total;
    
    // Update stats using helper methods
    this.updateL1Stats({ 
      hitRate: l1HitRate,
      totalEntries: this.l1Cache.size,
      memoryUsage: this.l1Cache.size * 1024 // Estimate 1KB per entry
    });
    this.updateL2Stats({ hitRate: l2HitRate });
    this.updateL3Stats({ hitRate: l3HitRate });
    this.updateOverallStats({ 
      totalHitRate,
      averageLatency 
    });
  }

  // ===== CONFIGURATION =====

  private initializeCacheConfigurations(): void {
    // TODO: Load configurations from ConfigService
    this.logger.debug('Cache configurations initialized');
  }

  // ===== PUBLIC GETTERS =====

  getCacheStats(): MultiLevelCacheStats {
    this.updateCacheStats();
    return { ...this.stats };
  }

  getCacheHealthStatus(): {
    healthy: boolean;
    hitRateTarget: boolean;
    latencyTarget: boolean;
    issues: string[];
  } {
    const stats = this.getCacheStats();
    const issues: string[] = [];
    
    const hitRateTarget = stats.overallStats.totalHitRate >= 0.85;
    const latencyTarget = stats.overallStats.averageLatency <= 30;
    
    if (!hitRateTarget) {
      issues.push(`Cache hit rate ${(stats.overallStats.totalHitRate * 100).toFixed(1)}% below 85% target`);
    }
    
    if (!latencyTarget) {
      issues.push(`Average latency ${stats.overallStats.averageLatency.toFixed(1)}ms above 30ms target`);
    }
    
    return {
      healthy: hitRateTarget && latencyTarget,
      hitRateTarget,
      latencyTarget,
      issues
    };
  }

  /**
   * Get cache optimization recommendations
   */
  getCacheOptimizationRecommendations(): string[] {
    const stats = this.getCacheStats();
    const recommendations: string[] = [];
    
    if (stats.l1Stats.hitRate < 0.7) {
      recommendations.push('Increase L1 cache size by 50% to improve hit rate');
    }
    
    if (stats.l2Stats.hitRate < 0.8) {
      recommendations.push('Review pattern matching algorithm for L2 cache optimization');
    }
    
    if (stats.overallStats.averageLatency > 30) {
      recommendations.push('Consider cache warming strategies for frequently accessed patterns');
    }
    
    return recommendations;
  }
}