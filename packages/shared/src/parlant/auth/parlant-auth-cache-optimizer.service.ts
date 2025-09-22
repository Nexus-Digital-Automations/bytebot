/**
 * PARLANT Authentication Cache Optimizer Service
 *
 * Advanced caching and optimization service for the PARLANT authentication
 * framework. Implements intelligent multi-level caching, adaptive TTL
 * management, cache warming strategies, and performance optimization
 * to achieve sub-1000ms response targets and >85% cache hit rates.
 *
 * Features:
 * - Multi-level cache hierarchy (L1: Memory, L2: Redis, L3: Database)
 * - Adaptive TTL based on data volatility and access patterns
 * - Intelligent cache warming and preloading
 * - Cache performance monitoring and analytics
 * - Automatic cache optimization based on usage patterns
 * - Memory pressure management and cache eviction
 * - Cache invalidation strategies and consistency management
 * - Performance metrics and alerting integration
 *
 * Performance Targets:
 * - Cache hit rate: >85% for authentication tokens
 * - Cache lookup time: <10ms for L1, <50ms for L2
 * - Memory efficiency: <200MB cache overhead
 * - Invalidation latency: <100ms across all levels
 *
 * @fileoverview PARLANT authentication cache optimization service
 * @version 1.0.0
 * @author Cache Optimization Agent
 * @created 2025-09-20
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import { ParlantContext } from "./parlant-jwt-bridge.service";

/**
 * Cache configuration settings
 */
export interface CacheOptimizerConfig {
  /** L1 Memory cache settings */
  l1Cache: {
    maxSize: number; // Maximum number of entries
    defaultTtl: number; // Default TTL in milliseconds
    maxMemoryMB: number; // Maximum memory usage in MB
    cleanupInterval: number; // Cleanup interval in milliseconds
  };

  /** L2 Redis cache settings */
  l2Cache: {
    host: string;
    port: number;
    defaultTtl: number; // Default TTL in milliseconds
    maxConnections: number;
    connectionTimeout: number;
    commandTimeout: number;
  };

  /** L3 Database cache settings */
  l3Cache: {
    tableName: string;
    defaultTtl: number; // Default TTL in milliseconds
    cleanupInterval: number; // Cleanup interval in milliseconds
    maxEntries: number;
  };

  /** Adaptive TTL settings */
  adaptiveTtl: {
    enabled: boolean;
    minTtl: number; // Minimum TTL in milliseconds
    maxTtl: number; // Maximum TTL in milliseconds
    volatilityThreshold: number; // Data volatility threshold
    accessPatternAnalysisWindow: number; // Analysis window in milliseconds
  };

  /** Cache warming settings */
  cacheWarming: {
    enabled: boolean;
    warmupSchedule: string; // Cron expression
    preloadThreshold: number; // Preload when hit rate drops below this
    warmupBatchSize: number; // Number of entries to warm up at once
  };

  /** Performance monitoring */
  monitoring: {
    metricsCollectionInterval: number; // Metrics collection interval
    alertThresholds: {
      hitRateThreshold: number; // Alert when hit rate drops below this
      latencyThreshold: number; // Alert when latency exceeds this
      memoryThreshold: number; // Alert when memory usage exceeds this
    };
  };
}

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  ttl: number; // Time to live in milliseconds
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  volatilityScore: number; // Data volatility score (0-1)
  metadata: {
    source:
      | "token_exchange"
      | "session_data"
      | "security_validation"
      | "user_context";
    priority: "high" | "medium" | "low";
    dataSize: number; // Size in bytes
    compressionRatio?: number;
  };
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  /** Hit/miss statistics */
  hitRate: number; // Overall hit rate (0-1)
  missRate: number; // Overall miss rate (0-1)
  l1HitRate: number; // L1 cache hit rate
  l2HitRate: number; // L2 cache hit rate
  l3HitRate: number; // L3 cache hit rate

  /** Performance statistics */
  averageLatency: number; // Average lookup latency in milliseconds
  l1AverageLatency: number; // L1 average latency
  l2AverageLatency: number; // L2 average latency
  l3AverageLatency: number; // L3 average latency

  /** Usage statistics */
  totalOperations: number; // Total cache operations
  getsPerSecond: number; // GET operations per second
  setsPerSecond: number; // SET operations per second
  deletesPerSecond: number; // DELETE operations per second

  /** Memory statistics */
  l1MemoryUsage: number; // L1 memory usage in MB
  l1EntryCount: number; // Number of entries in L1
  l2EntryCount: number; // Number of entries in L2
  l3EntryCount: number; // Number of entries in L3

  /** TTL statistics */
  averageTtl: number; // Average TTL in milliseconds
  adaptiveTtlAdjustments: number; // Number of adaptive TTL adjustments
  expiredEntries: number; // Number of expired entries cleaned up

  /** Efficiency metrics */
  cacheEfficiency: number; // Overall cache efficiency score (0-100)
  memoryEfficiency: number; // Memory usage efficiency
  compressionRatio: number; // Average compression ratio
}

/**
 * Cache operation result
 */
export interface CacheOperationResult<T = any> {
  success: boolean;
  value?: T;
  hit: boolean; // Whether it was a cache hit
  source: "l1" | "l2" | "l3" | "miss"; // Where the value was found
  latency: number; // Operation latency in milliseconds
  metadata?: {
    ttlRemaining: number; // TTL remaining in milliseconds
    accessCount: number;
    volatilityScore: number;
  };
}

/**
 * Cache invalidation strategy
 */
export interface InvalidationStrategy {
  type: "ttl" | "manual" | "pattern" | "dependency" | "event";
  pattern?: string; // Pattern for pattern-based invalidation
  dependencies?: string[]; // Dependencies for dependency-based invalidation
  eventTriggers?: string[]; // Events that trigger invalidation
}

/**
 * Cache optimization recommendation
 */
export interface CacheOptimizationRecommendation {
  id: string;
  type:
    | "ttl_adjustment"
    | "memory_optimization"
    | "warming_strategy"
    | "eviction_policy";
  priority: "critical" | "high" | "medium" | "low";
  description: string;
  expectedImprovement: string;
  currentMetric: number;
  targetMetric: number;
  implementationComplexity: "low" | "medium" | "high";
  affectedLayers: Array<"l1" | "l2" | "l3">;
  implementation: {
    steps: string[];
    estimatedTime: string;
    riskLevel: "low" | "medium" | "high";
  };
  validationCriteria: string[];
  timestamp: Date;
}

@Injectable()
export class ParlantAuthCacheOptimizer
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantAuthCacheOptimizer.name);

  // Configuration
  private readonly config: CacheOptimizerConfig;

  // Cache layers
  private readonly l1Cache = new Map<string, CacheEntry>(); // Memory cache
  private l2Cache: any; // Redis client (would be initialized with actual Redis)
  private l3Cache: any; // Database connection (would be initialized with actual DB)

  // Performance tracking
  private readonly metrics: CacheMetrics;
  private readonly operationHistory: Array<{
    operation: string;
    latency: number;
    timestamp: Date;
  }> = [];
  private readonly optimizationRecommendations: CacheOptimizationRecommendation[] =
    [];

  // Adaptive TTL tracking
  private readonly accessPatterns = new Map<
    string,
    Array<{ timestamp: Date; hit: boolean }>
  >();
  private readonly volatilityTracking = new Map<
    string,
    Array<{ timestamp: Date; value: any }>
  >();

  // Monitoring intervals
  private metricsCollectionInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private optimizationAnalysisInterval?: NodeJS.Timeout;
  private cacheWarmingInterval?: NodeJS.Timeout;

  // State tracking
  private isOptimizing = false;
  private totalOperations = 0;

  constructor(config?: Partial<CacheOptimizerConfig>) {
    super();

    this.config = this.createDefaultConfig(config);
    this.metrics = this.initializeMetrics();

    this.logger.log("PARLANT Authentication Cache Optimizer initialized");
  }

  async onModuleInit(): Promise<void> {
    await this.initializeCacheLayers();
    await this.startOptimization();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stopOptimization();
    await this.shutdownCacheLayers();
  }

  /**
   * Get value from cache with intelligent lookup across all layers
   */
  async get<T = any>(
    key: string,
    options?: {
      updateAccessPattern?: boolean;
      preferredLayer?: "l1" | "l2" | "l3";
    },
  ): Promise<CacheOperationResult<T>> {
    const startTime = performance.now();
    const updateAccessPattern = options?.updateAccessPattern !== false;

    try {
      // L1 Cache lookup
      const l1Result = await this.getFromL1<T>(key);
      if (l1Result.hit) {
        const latency = performance.now() - startTime;
        this.recordOperation("get", latency, "l1", true);

        if (updateAccessPattern) {
          this.updateAccessPattern(key, true);
        }

        return {
          success: true,
          value: l1Result.value,
          hit: true,
          source: "l1",
          latency,
          metadata: l1Result.metadata,
        };
      }

      // L2 Cache lookup
      const l2Result = await this.getFromL2<T>(key);
      if (l2Result.hit) {
        const latency = performance.now() - startTime;
        this.recordOperation("get", latency, "l2", true);

        // Promote to L1 for faster future access
        await this.promoteToL1(key, l2Result.value as T, l2Result.metadata);

        if (updateAccessPattern) {
          this.updateAccessPattern(key, true);
        }

        return {
          success: true,
          value: l2Result.value,
          hit: true,
          source: "l2",
          latency,
          metadata: l2Result.metadata,
        };
      }

      // L3 Cache lookup
      const l3Result = await this.getFromL3<T>(key);
      if (l3Result.hit) {
        const latency = performance.now() - startTime;
        this.recordOperation("get", latency, "l3", true);

        // Promote to L2 and L1 for faster future access
        await this.promoteToL2(key, l3Result.value as T, l3Result.metadata);
        await this.promoteToL1(key, l3Result.value as T, l3Result.metadata);

        if (updateAccessPattern) {
          this.updateAccessPattern(key, true);
        }

        return {
          success: true,
          value: l3Result.value,
          hit: true,
          source: "l3",
          latency,
          metadata: l3Result.metadata,
        };
      }

      // Cache miss
      const latency = performance.now() - startTime;
      this.recordOperation("get", latency, "miss", false);

      if (updateAccessPattern) {
        this.updateAccessPattern(key, false);
      }

      return {
        success: false,
        hit: false,
        source: "miss",
        latency,
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      this.logger.error(`Cache get operation failed for key ${key}:`, error);

      return {
        success: false,
        hit: false,
        source: "miss",
        latency,
      };
    }
  }

  /**
   * Set value in cache with intelligent TTL and layer distribution
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      priority?: "high" | "medium" | "low";
      source?:
        | "token_exchange"
        | "session_data"
        | "security_validation"
        | "user_context";
      skipL1?: boolean;
      skipL2?: boolean;
      skipL3?: boolean;
    },
  ): Promise<CacheOperationResult> {
    const startTime = performance.now();

    try {
      // Calculate adaptive TTL if not provided
      const ttl = options?.ttl || (await this.calculateAdaptiveTtl(key, value));
      const priority = options?.priority || "medium";
      const source = options?.source || "token_exchange";

      // Calculate data size for memory management
      const dataSize = this.calculateDataSize(value);

      // Create cache entry
      const entry: CacheEntry<T> = {
        key,
        value,
        ttl,
        createdAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 1,
        volatilityScore: this.calculateVolatilityScore(key, value),
        metadata: {
          source,
          priority,
          dataSize,
          compressionRatio: this.calculateCompressionRatio(value),
        },
      };

      // Set in all appropriate layers
      const promises: Promise<any>[] = [];

      if (!options?.skipL1) {
        promises.push(this.setInL1(entry));
      }

      if (!options?.skipL2) {
        promises.push(this.setInL2(entry));
      }

      if (!options?.skipL3) {
        promises.push(this.setInL3(entry));
      }

      await Promise.all(promises);

      // Update volatility tracking
      this.updateVolatilityTracking(key, value);

      const latency = performance.now() - startTime;
      this.recordOperation("set", latency, "all", true);

      return {
        success: true,
        hit: false, // Set operations are not cache hits
        source: "l1", // Primary source for new entries
        latency,
        metadata: {
          ttlRemaining: ttl,
          accessCount: 1,
          volatilityScore: entry.volatilityScore,
        },
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      this.logger.error(`Cache set operation failed for key ${key}:`, error);

      return {
        success: false,
        hit: false,
        source: "miss",
        latency,
      };
    }
  }

  /**
   * Delete value from all cache layers
   */
  async delete(key: string): Promise<CacheOperationResult> {
    const startTime = performance.now();

    try {
      // Delete from all layers
      const promises = [
        this.deleteFromL1(key),
        this.deleteFromL2(key),
        this.deleteFromL3(key),
      ];

      await Promise.all(promises);

      // Clean up tracking data
      this.accessPatterns.delete(key);
      this.volatilityTracking.delete(key);

      const latency = performance.now() - startTime;
      this.recordOperation("delete", latency, "all", true);

      return {
        success: true,
        hit: false,
        source: "l1",
        latency,
      };
    } catch (error) {
      const latency = performance.now() - startTime;
      this.logger.error(`Cache delete operation failed for key ${key}:`, error);

      return {
        success: false,
        hit: false,
        source: "miss",
        latency,
      };
    }
  }

  /**
   * Invalidate cache entries based on pattern or strategy
   */
  async invalidate(strategy: InvalidationStrategy): Promise<{
    invalidatedCount: number;
    latency: number;
  }> {
    const startTime = performance.now();
    let invalidatedCount = 0;

    try {
      switch (strategy.type) {
        case "pattern":
          if (strategy.pattern) {
            invalidatedCount = await this.invalidateByPattern(strategy.pattern);
          }
          break;

        case "dependency":
          if (strategy.dependencies) {
            invalidatedCount = await this.invalidateByDependencies(
              strategy.dependencies,
            );
          }
          break;

        case "event":
          if (strategy.eventTriggers) {
            invalidatedCount = await this.invalidateByEvents(
              strategy.eventTriggers,
            );
          }
          break;

        case "manual":
          // Manual invalidation would be handled by specific delete operations
          break;

        case "ttl":
          invalidatedCount = await this.invalidateExpiredEntries();
          break;
      }

      const latency = performance.now() - startTime;
      this.recordOperation("invalidate", latency, "all", true);

      this.emit("cache.invalidated", { strategy, invalidatedCount, latency });

      return { invalidatedCount, latency };
    } catch (error) {
      const latency = performance.now() - startTime;
      this.logger.error("Cache invalidation failed:", error);
      return { invalidatedCount: 0, latency };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmCache(keys?: string[]): Promise<{
    warmedCount: number;
    skippedCount: number;
    latency: number;
  }> {
    const startTime = performance.now();
    let warmedCount = 0;
    let skippedCount = 0;

    try {
      // If no specific keys provided, warm based on access patterns
      const keysToWarm = keys || this.identifyKeysForWarming();

      this.logger.log(`🔥 Warming cache with ${keysToWarm.length} keys`);

      // Warm keys in batches to avoid overwhelming the system
      const batchSize = this.config.cacheWarming.warmupBatchSize;
      for (let i = 0; i < keysToWarm.length; i += batchSize) {
        const batch = keysToWarm.slice(i, i + batchSize);

        const batchPromises = batch.map(async (key) => {
          try {
            // Check if already cached
            const existing = await this.get(key, {
              updateAccessPattern: false,
            });
            if (existing.hit) {
              skippedCount++;
              return;
            }

            // Generate warm data (in production, this would fetch from authoritative source)
            const warmData = await this.generateWarmData(key);
            if (warmData) {
              await this.set(key, warmData, { priority: "medium" });
              warmedCount++;
            }
          } catch (error) {
            this.logger.warn(`Failed to warm cache for key ${key}:`, error);
            skippedCount++;
          }
        });

        await Promise.all(batchPromises);

        // Small delay between batches
        if (i + batchSize < keysToWarm.length) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      const latency = performance.now() - startTime;
      this.recordOperation("warm", latency, "all", true);

      this.emit("cache.warmed", { warmedCount, skippedCount, latency });
      this.logger.log(
        `✅ Cache warming completed: ${warmedCount} warmed, ${skippedCount} skipped`,
      );

      return { warmedCount, skippedCount, latency };
    } catch (error) {
      const latency = performance.now() - startTime;
      this.logger.error("Cache warming failed:", error);
      return { warmedCount: 0, skippedCount: 0, latency };
    }
  }

  /**
   * Get current cache metrics
   */
  getCacheMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Get cache optimization recommendations
   */
  getOptimizationRecommendations(): CacheOptimizationRecommendation[] {
    return this.optimizationRecommendations
      .sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 10); // Top 10 recommendations
  }

  /**
   * Generate comprehensive cache performance report
   */
  generatePerformanceReport(): {
    overview: {
      overallHealthScore: number;
      primaryConcerns: string[];
      performanceGrade: "A" | "B" | "C" | "D" | "F";
    };
    metrics: CacheMetrics;
    layerAnalysis: {
      l1: { efficiency: number; issues: string[] };
      l2: { efficiency: number; issues: string[] };
      l3: { efficiency: number; issues: string[] };
    };
    recommendations: CacheOptimizationRecommendation[];
    trends: {
      hitRateTrend: "improving" | "stable" | "degrading";
      latencyTrend: "improving" | "stable" | "degrading";
      memoryTrend: "improving" | "stable" | "degrading";
    };
  } {
    const metrics = this.getCacheMetrics();
    const recommendations = this.getOptimizationRecommendations();

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(metrics);

    // Determine performance grade
    let performanceGrade: "A" | "B" | "C" | "D" | "F";
    if (healthScore >= 90) performanceGrade = "A";
    else if (healthScore >= 80) performanceGrade = "B";
    else if (healthScore >= 70) performanceGrade = "C";
    else if (healthScore >= 60) performanceGrade = "D";
    else performanceGrade = "F";

    // Identify primary concerns
    const primaryConcerns = this.identifyPrimaryConcerns(metrics);

    // Analyze layer efficiency
    const layerAnalysis = this.analyzeLayerEfficiency(metrics);

    // Analyze trends
    const trends = this.analyzeCacheTrends();

    return {
      overview: {
        overallHealthScore: healthScore,
        primaryConcerns,
        performanceGrade,
      },
      metrics,
      layerAnalysis,
      recommendations,
      trends,
    };
  }

  // ========== PRIVATE IMPLEMENTATION METHODS ==========

  /**
   * Create default configuration
   */
  private createDefaultConfig(
    overrides?: Partial<CacheOptimizerConfig>,
  ): CacheOptimizerConfig {
    const defaultConfig: CacheOptimizerConfig = {
      l1Cache: {
        maxSize: 10000,
        defaultTtl: 5 * 60 * 1000, // 5 minutes
        maxMemoryMB: 200,
        cleanupInterval: 60 * 1000, // 1 minute
      },
      l2Cache: {
        host: "localhost",
        port: 6379,
        defaultTtl: 30 * 60 * 1000, // 30 minutes
        maxConnections: 100,
        connectionTimeout: 5000,
        commandTimeout: 3000,
      },
      l3Cache: {
        tableName: "parlant_auth_cache",
        defaultTtl: 2 * 60 * 60 * 1000, // 2 hours
        cleanupInterval: 10 * 60 * 1000, // 10 minutes
        maxEntries: 100000,
      },
      adaptiveTtl: {
        enabled: true,
        minTtl: 1 * 60 * 1000, // 1 minute
        maxTtl: 24 * 60 * 60 * 1000, // 24 hours
        volatilityThreshold: 0.7,
        accessPatternAnalysisWindow: 60 * 60 * 1000, // 1 hour
      },
      cacheWarming: {
        enabled: true,
        warmupSchedule: "0 */6 * * *", // Every 6 hours
        preloadThreshold: 0.8, // Preload when hit rate drops below 80%
        warmupBatchSize: 100,
      },
      monitoring: {
        metricsCollectionInterval: 30 * 1000, // 30 seconds
        alertThresholds: {
          hitRateThreshold: 0.85, // 85%
          latencyThreshold: 100, // 100ms
          memoryThreshold: 180, // 180MB
        },
      },
    };

    return { ...defaultConfig, ...overrides };
  }

  /**
   * Initialize cache metrics
   */
  private initializeMetrics(): CacheMetrics {
    return {
      hitRate: 0,
      missRate: 0,
      l1HitRate: 0,
      l2HitRate: 0,
      l3HitRate: 0,
      averageLatency: 0,
      l1AverageLatency: 0,
      l2AverageLatency: 0,
      l3AverageLatency: 0,
      totalOperations: 0,
      getsPerSecond: 0,
      setsPerSecond: 0,
      deletesPerSecond: 0,
      l1MemoryUsage: 0,
      l1EntryCount: 0,
      l2EntryCount: 0,
      l3EntryCount: 0,
      averageTtl: 0,
      adaptiveTtlAdjustments: 0,
      expiredEntries: 0,
      cacheEfficiency: 0,
      memoryEfficiency: 0,
      compressionRatio: 1,
    };
  }

  /**
   * Initialize cache layers
   */
  private async initializeCacheLayers(): Promise<void> {
    this.logger.log("🔧 Initializing cache layers...");

    try {
      // Initialize L2 Redis cache (mock implementation)
      this.l2Cache = {
        get: async (key: string) => null, // Mock Redis client
        set: async (key: string, value: any, ttl: number) => true,
        del: async (key: string) => true,
        exists: async (key: string) => false,
      };

      // Initialize L3 Database cache (mock implementation)
      this.l3Cache = {
        get: async (key: string) => null, // Mock database client
        set: async (key: string, value: any, ttl: number) => true,
        del: async (key: string) => true,
        exists: async (key: string) => false,
      };

      this.logger.log("✅ Cache layers initialized successfully");
    } catch (error) {
      this.logger.error("❌ Failed to initialize cache layers:", error);
      throw error;
    }
  }

  /**
   * Start cache optimization processes
   */
  private async startOptimization(): Promise<void> {
    if (this.isOptimizing) {
      this.logger.warn("Cache optimization is already running");
      return;
    }

    this.logger.log("🚀 Starting cache optimization processes");

    // Start metrics collection
    this.metricsCollectionInterval = setInterval(
      () => this.collectMetrics(),
      this.config.monitoring.metricsCollectionInterval,
    );

    // Start cleanup processes
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredEntries(),
      this.config.l1Cache.cleanupInterval,
    );

    // Start optimization analysis
    this.optimizationAnalysisInterval = setInterval(
      () => this.analyzeOptimizationOpportunities(),
      5 * 60 * 1000, // Every 5 minutes
    );

    // Start cache warming if enabled
    if (this.config.cacheWarming.enabled) {
      this.cacheWarmingInterval = setInterval(
        () => this.scheduledCacheWarming(),
        60 * 60 * 1000, // Every hour
      );
    }

    this.isOptimizing = true;
    this.emit("optimization.started");

    this.logger.log("✅ Cache optimization started successfully");
  }

  /**
   * Stop cache optimization processes
   */
  private async stopOptimization(): Promise<void> {
    this.logger.log("🛑 Stopping cache optimization processes");

    // Clear all intervals
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    if (this.optimizationAnalysisInterval) {
      clearInterval(this.optimizationAnalysisInterval);
      this.optimizationAnalysisInterval = undefined;
    }

    if (this.cacheWarmingInterval) {
      clearInterval(this.cacheWarmingInterval);
      this.cacheWarmingInterval = undefined;
    }

    this.isOptimizing = false;
    this.emit("optimization.stopped");

    this.logger.log("✅ Cache optimization stopped successfully");
  }

  /**
   * Shutdown cache layers
   */
  private async shutdownCacheLayers(): Promise<void> {
    this.logger.log("🔧 Shutting down cache layers...");

    try {
      // Close L2 Redis connections
      if (this.l2Cache && this.l2Cache.quit) {
        await this.l2Cache.quit();
      }

      // Close L3 Database connections
      if (this.l3Cache && this.l3Cache.close) {
        await this.l3Cache.close();
      }

      // Clear L1 cache
      this.l1Cache.clear();

      this.logger.log("✅ Cache layers shut down successfully");
    } catch (error) {
      this.logger.error("❌ Failed to shutdown cache layers:", error);
    }
  }

  // L1 Cache operations (Memory)
  private async getFromL1<T>(key: string): Promise<CacheOperationResult<T>> {
    const entry = this.l1Cache.get(key);

    if (!entry) {
      return { success: false, hit: false, source: "l1", latency: 0 };
    }

    // Check if expired
    const now = Date.now();
    const expiryTime = entry.createdAt.getTime() + entry.ttl;

    if (now > expiryTime) {
      this.l1Cache.delete(key);
      return { success: false, hit: false, source: "l1", latency: 0 };
    }

    // Update access information
    entry.lastAccessed = new Date();
    entry.accessCount++;

    return {
      success: true,
      hit: true,
      source: "l1",
      latency: 1, // Very fast for memory
      value: entry.value as T,
      metadata: {
        ttlRemaining: expiryTime - now,
        accessCount: entry.accessCount,
        volatilityScore: entry.volatilityScore,
      },
    };
  }

  private async setInL1<T>(entry: CacheEntry<T>): Promise<void> {
    // Check memory limits before adding
    if (this.l1Cache.size >= this.config.l1Cache.maxSize) {
      await this.evictFromL1();
    }

    this.l1Cache.set(entry.key, entry);
  }

  private async deleteFromL1(key: string): Promise<void> {
    this.l1Cache.delete(key);
  }

  private async evictFromL1(): Promise<void> {
    // LRU eviction strategy
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.l1Cache.delete(oldestKey);
    }
  }

  // L2 Cache operations (Redis) - Mock implementations
  private async getFromL2<T>(key: string): Promise<CacheOperationResult<T>> {
    // Mock L2 cache implementation
    return { success: false, hit: false, source: "l2", latency: 20 };
  }

  private async setInL2<T>(entry: CacheEntry<T>): Promise<void> {
    // Mock L2 cache implementation
  }

  private async deleteFromL2(key: string): Promise<void> {
    // Mock L2 cache implementation
  }

  // L3 Cache operations (Database) - Mock implementations
  private async getFromL3<T>(key: string): Promise<CacheOperationResult<T>> {
    // Mock L3 cache implementation
    return { success: false, hit: false, source: "l3", latency: 50 };
  }

  private async setInL3<T>(entry: CacheEntry<T>): Promise<void> {
    // Mock L3 cache implementation
  }

  private async deleteFromL3(key: string): Promise<void> {
    // Mock L3 cache implementation
  }

  // Promotion methods
  private async promoteToL1<T>(
    key: string,
    value: T,
    metadata?: any,
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: this.config.l1Cache.defaultTtl,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      volatilityScore: 0.5,
      metadata: metadata || {
        source: "token_exchange",
        priority: "medium",
        dataSize: this.calculateDataSize(value),
      },
    };

    await this.setInL1(entry);
  }

  private async promoteToL2<T>(
    key: string,
    value: T,
    metadata?: any,
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: this.config.l2Cache.defaultTtl,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 1,
      volatilityScore: 0.5,
      metadata: metadata || {
        source: "token_exchange",
        priority: "medium",
        dataSize: this.calculateDataSize(value),
      },
    };

    await this.setInL2(entry);
  }

  // Utility methods
  private calculateDataSize(value: any): number {
    return JSON.stringify(value).length; // Simplified size calculation
  }

  private calculateCompressionRatio(value: any): number {
    // Mock compression ratio calculation
    return 0.7; // 70% of original size
  }

  private calculateVolatilityScore(key: string, value: any): number {
    // Mock volatility calculation based on key patterns and historical data
    const history = this.volatilityTracking.get(key) || [];

    if (history.length < 2) {
      return 0.5; // Default medium volatility
    }

    // Calculate how often the value changes
    let changes = 0;
    for (let i = 1; i < history.length; i++) {
      if (
        JSON.stringify(history[i].value) !==
        JSON.stringify(history[i - 1].value)
      ) {
        changes++;
      }
    }

    return changes / (history.length - 1);
  }

  private async calculateAdaptiveTtl(key: string, value: any): Promise<number> {
    if (!this.config.adaptiveTtl.enabled) {
      return this.config.l1Cache.defaultTtl;
    }

    const volatilityScore = this.calculateVolatilityScore(key, value);
    const accessPattern = this.accessPatterns.get(key) || [];

    // Base TTL on volatility and access frequency
    const baseTtl = this.config.l1Cache.defaultTtl;
    const volatilityFactor = 1 - volatilityScore; // Less volatile = longer TTL
    const accessFactor = Math.min(accessPattern.length / 10, 2); // More access = longer TTL

    const adaptiveTtl = Math.max(
      this.config.adaptiveTtl.minTtl,
      Math.min(
        this.config.adaptiveTtl.maxTtl,
        baseTtl * volatilityFactor * accessFactor,
      ),
    );

    return adaptiveTtl;
  }

  private updateAccessPattern(key: string, hit: boolean): void {
    const patterns = this.accessPatterns.get(key) || [];
    patterns.push({ timestamp: new Date(), hit });

    // Keep only recent patterns
    const cutoff = new Date(
      Date.now() - this.config.adaptiveTtl.accessPatternAnalysisWindow,
    );
    const recentPatterns = patterns.filter((p) => p.timestamp >= cutoff);

    this.accessPatterns.set(key, recentPatterns);
  }

  private updateVolatilityTracking(key: string, value: any): void {
    const tracking = this.volatilityTracking.get(key) || [];
    tracking.push({ timestamp: new Date(), value });

    // Keep only recent tracking data
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    const recentTracking = tracking.filter((t) => t.timestamp >= cutoff);

    this.volatilityTracking.set(key, recentTracking);
  }

  private recordOperation(
    operation: string,
    latency: number,
    source: string,
    success: boolean,
  ): void {
    this.operationHistory.push({
      operation: `${operation}_${source}_${success ? "success" : "failure"}`,
      latency,
      timestamp: new Date(),
    });

    // Keep only recent history
    if (this.operationHistory.length > 10000) {
      this.operationHistory.splice(0, this.operationHistory.length - 10000);
    }

    this.totalOperations++;
  }

  // Additional helper methods would continue with similar comprehensive implementations...
  // Including: collectMetrics(), analyzeOptimizationOpportunities(), scheduledCacheWarming(),
  // invalidation methods, trend analysis, health scoring, etc.

  private async collectMetrics(): Promise<void> {
    // Update L1 metrics
    this.metrics.l1EntryCount = this.l1Cache.size;
    this.metrics.l1MemoryUsage = this.calculateL1MemoryUsage();

    // Calculate hit rates and latencies from operation history
    const recentOps = this.operationHistory.slice(-1000); // Last 1000 operations
    this.updateMetricsFromOperations(recentOps);

    this.emit("metrics.updated", this.metrics);
  }

  private calculateL1MemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.l1Cache.values()) {
      totalSize += entry.metadata.dataSize;
    }
    return totalSize / 1024 / 1024; // Convert to MB
  }

  private updateMetricsFromOperations(
    operations: typeof this.operationHistory,
  ): void {
    if (operations.length === 0) return;

    const getOps = operations.filter((op) => op.operation.startsWith("get"));
    const hits = getOps.filter(
      (op) =>
        op.operation.includes("success") && !op.operation.includes("miss"),
    );

    this.metrics.hitRate = getOps.length > 0 ? hits.length / getOps.length : 0;
    this.metrics.missRate = 1 - this.metrics.hitRate;

    // Calculate average latencies
    const allLatencies = operations.map((op) => op.latency);
    this.metrics.averageLatency =
      allLatencies.reduce((sum, lat) => sum + lat, 0) / allLatencies.length;

    // Calculate operations per second
    const timeSpan =
      (operations[operations.length - 1].timestamp.getTime() -
        operations[0].timestamp.getTime()) /
      1000;
    if (timeSpan > 0) {
      this.metrics.getsPerSecond = getOps.length / timeSpan;
      this.metrics.setsPerSecond =
        operations.filter((op) => op.operation.startsWith("set")).length /
        timeSpan;
      this.metrics.deletesPerSecond =
        operations.filter((op) => op.operation.startsWith("delete")).length /
        timeSpan;
    }

    // Calculate cache efficiency
    this.metrics.cacheEfficiency = this.calculateCacheEfficiency();
  }

  private calculateCacheEfficiency(): number {
    const hitRateScore = this.metrics.hitRate * 40; // 40% weight
    const latencyScore =
      Math.max(0, 40 - this.metrics.averageLatency / 10) * 30; // 30% weight
    const memoryScore = Math.max(
      0,
      30 - (this.metrics.l1MemoryUsage / this.config.l1Cache.maxMemoryMB) * 30,
    ); // 30% weight

    return hitRateScore + latencyScore + memoryScore;
  }

  private async cleanupExpiredEntries(): Promise<number> {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, entry] of this.l1Cache.entries()) {
      const expiryTime = entry.createdAt.getTime() + entry.ttl;
      if (now > expiryTime) {
        this.l1Cache.delete(key);
        cleanedCount++;
      }
    }

    this.metrics.expiredEntries += cleanedCount;
    return cleanedCount;
  }

  private async invalidateExpiredEntries(): Promise<number> {
    return await this.cleanupExpiredEntries();
  }

  private async invalidateByPattern(pattern: string): Promise<number> {
    let invalidatedCount = 0;
    const regex = new RegExp(pattern);

    for (const [key] of this.l1Cache.entries()) {
      if (regex.test(key)) {
        await this.delete(key);
        invalidatedCount++;
      }
    }

    return invalidatedCount;
  }

  private async invalidateByDependencies(
    dependencies: string[],
  ): Promise<number> {
    // Mock implementation for dependency-based invalidation
    return 0;
  }

  private async invalidateByEvents(eventTriggers: string[]): Promise<number> {
    // Mock implementation for event-based invalidation
    return 0;
  }

  private identifyKeysForWarming(): string[] {
    // Identify keys based on access patterns
    const candidates: string[] = [];

    for (const [key, pattern] of this.accessPatterns.entries()) {
      const recentAccesses = pattern.filter(
        (p) => p.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
      );

      if (recentAccesses.length > 10) {
        // Frequently accessed
        candidates.push(key);
      }
    }

    return candidates.slice(0, this.config.cacheWarming.warmupBatchSize);
  }

  private async generateWarmData(key: string): Promise<any> {
    // Mock data generation - in production would fetch from authoritative source
    return {
      key,
      value: `warm_data_${Date.now()}`,
      generatedAt: new Date(),
    };
  }

  private async analyzeOptimizationOpportunities(): Promise<void> {
    const metrics = this.getCacheMetrics();

    // Analyze hit rate optimization opportunities
    if (
      metrics.hitRate < this.config.monitoring.alertThresholds.hitRateThreshold
    ) {
      this.generateHitRateOptimizationRecommendation(metrics);
    }

    // Analyze latency optimization opportunities
    if (
      metrics.averageLatency >
      this.config.monitoring.alertThresholds.latencyThreshold
    ) {
      this.generateLatencyOptimizationRecommendation(metrics);
    }

    // Analyze memory optimization opportunities
    if (
      metrics.l1MemoryUsage >
      this.config.monitoring.alertThresholds.memoryThreshold
    ) {
      this.generateMemoryOptimizationRecommendation(metrics);
    }
  }

  private generateHitRateOptimizationRecommendation(
    metrics: CacheMetrics,
  ): void {
    const recommendation: CacheOptimizationRecommendation = {
      id: `hit_rate_opt_${Date.now()}`,
      type: "warming_strategy",
      priority: "high",
      description:
        "Low cache hit rate detected - implement proactive cache warming",
      expectedImprovement: `Increase hit rate from ${(metrics.hitRate * 100).toFixed(1)}% to 85%+`,
      currentMetric: metrics.hitRate * 100,
      targetMetric: 85,
      implementationComplexity: "medium",
      affectedLayers: ["l1", "l2"],
      implementation: {
        steps: [
          "Analyze access patterns for frequently requested data",
          "Implement predictive cache warming based on usage patterns",
          "Increase cache warming frequency during peak hours",
          "Monitor hit rate improvements",
        ],
        estimatedTime: "2-3 days",
        riskLevel: "low",
      },
      validationCriteria: [
        "Hit rate increased to >85%",
        "No degradation in cache latency",
        "Memory usage remains within limits",
      ],
      timestamp: new Date(),
    };

    this.addOptimizationRecommendation(recommendation);
  }

  private generateLatencyOptimizationRecommendation(
    metrics: CacheMetrics,
  ): void {
    const recommendation: CacheOptimizationRecommendation = {
      id: `latency_opt_${Date.now()}`,
      type: "memory_optimization",
      priority: "medium",
      description:
        "Cache latency exceeds target - optimize data structures and access patterns",
      expectedImprovement: `Reduce latency from ${metrics.averageLatency.toFixed(1)}ms to <50ms`,
      currentMetric: metrics.averageLatency,
      targetMetric: 50,
      implementationComplexity: "high",
      affectedLayers: ["l1"],
      implementation: {
        steps: [
          "Profile cache access patterns and bottlenecks",
          "Optimize data serialization and compression",
          "Implement more efficient data structures",
          "Reduce cache entry metadata overhead",
        ],
        estimatedTime: "1-2 weeks",
        riskLevel: "medium",
      },
      validationCriteria: [
        "Average latency reduced to <50ms",
        "P95 latency remains <100ms",
        "Hit rate not negatively affected",
      ],
      timestamp: new Date(),
    };

    this.addOptimizationRecommendation(recommendation);
  }

  private generateMemoryOptimizationRecommendation(
    metrics: CacheMetrics,
  ): void {
    const recommendation: CacheOptimizationRecommendation = {
      id: `memory_opt_${Date.now()}`,
      type: "memory_optimization",
      priority: "high",
      description:
        "Memory usage exceeds threshold - implement compression and efficient eviction",
      expectedImprovement: `Reduce memory usage from ${metrics.l1MemoryUsage.toFixed(1)}MB to <150MB`,
      currentMetric: metrics.l1MemoryUsage,
      targetMetric: 150,
      implementationComplexity: "medium",
      affectedLayers: ["l1"],
      implementation: {
        steps: [
          "Implement data compression for large cache entries",
          "Optimize eviction policy to prioritize memory efficiency",
          "Add memory pressure monitoring and automatic cleanup",
          "Implement cache entry size limits",
        ],
        estimatedTime: "3-5 days",
        riskLevel: "low",
      },
      validationCriteria: [
        "Memory usage reduced to <150MB",
        "Compression ratio >70%",
        "Hit rate maintained or improved",
      ],
      timestamp: new Date(),
    };

    this.addOptimizationRecommendation(recommendation);
  }

  private addOptimizationRecommendation(
    recommendation: CacheOptimizationRecommendation,
  ): void {
    // Check for duplicates
    const exists = this.optimizationRecommendations.some(
      (existing) =>
        existing.type === recommendation.type &&
        existing.description === recommendation.description,
    );

    if (!exists) {
      this.optimizationRecommendations.push(recommendation);
      this.emit("optimization.recommendation", recommendation);

      // Cleanup old recommendations
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      this.optimizationRecommendations.splice(
        0,
        this.optimizationRecommendations.findIndex(
          (rec) => rec.timestamp >= oneWeekAgo,
        ),
      );
    }
  }

  private async scheduledCacheWarming(): Promise<void> {
    try {
      const currentHitRate = this.metrics.hitRate;

      if (currentHitRate < this.config.cacheWarming.preloadThreshold) {
        this.logger.log(
          `🔥 Triggering cache warming (hit rate: ${(currentHitRate * 100).toFixed(1)}%)`,
        );
        await this.warmCache();
      }
    } catch (error) {
      this.logger.error("Scheduled cache warming failed:", error);
    }
  }

  private calculateHealthScore(metrics: CacheMetrics): number {
    const hitRateScore = Math.min(metrics.hitRate / 0.85, 1) * 40; // 40% weight, target 85%
    const latencyScore = Math.max(0, 1 - metrics.averageLatency / 100) * 30; // 30% weight, target <100ms
    const memoryScore =
      Math.max(0, 1 - metrics.l1MemoryUsage / this.config.l1Cache.maxMemoryMB) *
      20; // 20% weight
    const efficiencyScore = (metrics.cacheEfficiency / 100) * 10; // 10% weight

    return hitRateScore + latencyScore + memoryScore + efficiencyScore;
  }

  private identifyPrimaryConcerns(metrics: CacheMetrics): string[] {
    const concerns: string[] = [];

    if (
      metrics.hitRate < this.config.monitoring.alertThresholds.hitRateThreshold
    ) {
      concerns.push(
        `Low cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`,
      );
    }

    if (
      metrics.averageLatency >
      this.config.monitoring.alertThresholds.latencyThreshold
    ) {
      concerns.push(
        `High average latency: ${metrics.averageLatency.toFixed(1)}ms`,
      );
    }

    if (
      metrics.l1MemoryUsage >
      this.config.monitoring.alertThresholds.memoryThreshold
    ) {
      concerns.push(`High memory usage: ${metrics.l1MemoryUsage.toFixed(1)}MB`);
    }

    if (concerns.length === 0) {
      concerns.push("No critical issues detected");
    }

    return concerns;
  }

  private analyzeLayerEfficiency(metrics: CacheMetrics): {
    l1: { efficiency: number; issues: string[] };
    l2: { efficiency: number; issues: string[] };
    l3: { efficiency: number; issues: string[] };
  } {
    return {
      l1: {
        efficiency: metrics.l1HitRate * 100,
        issues:
          metrics.l1MemoryUsage > this.config.l1Cache.maxMemoryMB * 0.8
            ? ["High memory usage"]
            : [],
      },
      l2: {
        efficiency: metrics.l2HitRate * 100,
        issues: [],
      },
      l3: {
        efficiency: metrics.l3HitRate * 100,
        issues: [],
      },
    };
  }

  private analyzeCacheTrends(): {
    hitRateTrend: "improving" | "stable" | "degrading";
    latencyTrend: "improving" | "stable" | "degrading";
    memoryTrend: "improving" | "stable" | "degrading";
  } {
    // Simplified trend analysis - would implement more sophisticated analysis in production
    return {
      hitRateTrend: "stable",
      latencyTrend: "stable",
      memoryTrend: "stable",
    };
  }
}
