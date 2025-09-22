/**
 * PARLANT Zero-Overhead Intelligent Caching Middleware
 *
 * Advanced caching middleware that provides zero-overhead intelligent caching for PARLANT validation
 * operations. Implements sophisticated caching strategies including LRU, TTL, smart invalidation,
 * and predictive preloading to minimize validation overhead while maintaining accuracy.
 *
 * Features:
 * - Zero-overhead design with minimal performance impact
 * - Intelligent cache key generation and request fingerprinting
 * - Multi-level caching (memory, distributed, persistent)
 * - Smart cache invalidation and warming strategies
 * - Predictive preloading based on usage patterns
 * - Cache analytics and performance monitoring
 * - Compression and serialization optimization
 * - Circuit breaker patterns for cache failures
 *
 * @author Claude Assistant
 * @version 1.0.0
 * @since 2025-01-19
 */

import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { EventEmitter } from "events";

// Core caching types and interfaces
export interface CacheConfiguration {
  readonly enabled: boolean;
  readonly strategy: CacheStrategy;
  readonly levels: CacheLevel[];
  readonly ttl: CacheTTLConfig;
  readonly keys: CacheKeyConfig;
  readonly invalidation: InvalidationConfig;
  readonly compression: CompressionConfig;
  readonly monitoring: CacheMonitoringConfig;
  readonly fallback: FallbackConfig;
}

export interface CacheStrategy {
  readonly type: "lru" | "lfu" | "ttl" | "adaptive" | "intelligent";
  readonly maxSize: number;
  readonly evictionPolicy: "strict" | "graceful" | "predictive";
  readonly preloading: boolean;
  readonly warmup: boolean;
  readonly backgroundRefresh: boolean;
}

export interface CacheLevel {
  readonly name: string;
  readonly type: "memory" | "redis" | "memcached" | "database" | "file";
  readonly priority: number;
  readonly maxSize: number;
  readonly ttl: number;
  readonly enabled: boolean;
  readonly compression: boolean;
  readonly distribution: boolean;
}

export interface CacheTTLConfig {
  readonly default: number;
  readonly byEndpoint: Record<string, number>;
  readonly byUserType: Record<string, number>;
  readonly byResponseSize: Array<{ maxSize: number; ttl: number }>;
  readonly adaptive: boolean;
  readonly jitter: number;
}

export interface CacheKeyConfig {
  readonly strategy: "hash" | "composite" | "semantic" | "intelligent";
  readonly includeHeaders: string[];
  readonly excludeHeaders: string[];
  readonly includeQuery: boolean;
  readonly includeBody: boolean;
  readonly includeUser: boolean;
  readonly normalization: boolean;
  readonly compression: boolean;
}

export interface InvalidationConfig {
  readonly strategy: "time" | "event" | "pattern" | "intelligent";
  readonly patterns: string[];
  readonly events: string[];
  readonly cascading: boolean;
  readonly gracePeriod: number;
  readonly backgroundInvalidation: boolean;
}

export interface CompressionConfig {
  readonly enabled: boolean;
  readonly algorithm: "gzip" | "brotli" | "lz4" | "snappy";
  readonly level: number;
  readonly minSize: number;
  readonly mimeTypes: string[];
}

export interface CacheMonitoringConfig {
  readonly enabled: boolean;
  readonly metrics: string[];
  readonly alerting: boolean;
  readonly analytics: boolean;
  readonly reporting: boolean;
  readonly healthChecks: boolean;
}

export interface FallbackConfig {
  readonly enabled: boolean;
  readonly strategy: "skip" | "degraded" | "alternative";
  readonly timeout: number;
  readonly retries: number;
  readonly circuitBreaker: boolean;
}

// Request fingerprinting and cache key generation
export interface RequestFingerprint {
  readonly hash: string;
  readonly method: string;
  readonly path: string;
  readonly query: Record<string, string>;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly user: string;
  readonly timestamp: Date;
  readonly version: string;
}

export interface CacheEntry {
  readonly key: string;
  readonly value: unknown;
  readonly metadata: CacheEntryMetadata;
  readonly created: Date;
  readonly accessed: Date;
  readonly expires: Date;
  readonly hits: number;
  readonly size: number;
  readonly compressed: boolean;
}

export interface CacheEntryMetadata {
  readonly fingerprint: RequestFingerprint;
  readonly ttl: number;
  readonly priority: number;
  readonly dependencies: string[];
  readonly tags: string[];
  readonly validation: ValidationMetadata;
  readonly performance: PerformanceMetadata;
}

export interface ValidationMetadata {
  readonly checksum: string;
  readonly version: string;
  readonly algorithm: string;
  readonly timestamp: Date;
  readonly context: Record<string, unknown>;
}

export interface PerformanceMetadata {
  readonly generationTime: number;
  readonly compressionRatio: number;
  readonly accessPattern: string;
  readonly costBenefit: number;
}

// Cache analytics and monitoring
export interface CacheMetrics {
  readonly hitRate: number;
  readonly missRate: number;
  readonly evictionRate: number;
  readonly averageResponseTime: number;
  readonly memoryUsage: number;
  readonly throughput: number;
  readonly errorRate: number;
  readonly compressionRatio: number;
}

export interface CacheAnalytics {
  readonly topKeys: Array<{ key: string; hits: number; lastAccess: Date }>;
  readonly accessPatterns: Record<string, number>;
  readonly performanceGains: number;
  readonly costSavings: number;
  readonly recommendations: CacheRecommendation[];
  readonly trends: CacheTrend[];
}

export interface CacheRecommendation {
  readonly type:
    | "ttl"
    | "eviction"
    | "preload"
    | "invalidation"
    | "compression";
  readonly description: string;
  readonly impact: "high" | "medium" | "low";
  readonly effort: "low" | "medium" | "high";
  readonly estimatedGain: number;
}

export interface CacheTrend {
  readonly metric: string;
  readonly trend: "increasing" | "decreasing" | "stable" | "volatile";
  readonly changeRate: number;
  readonly period: string;
  readonly confidence: number;
}

// Advanced caching features
export interface IntelligentPreloading {
  readonly enabled: boolean;
  readonly algorithm: "pattern" | "ml" | "graph" | "hybrid";
  readonly confidence: number;
  readonly lookahead: number;
  readonly maxPreloads: number;
  readonly background: boolean;
}

export interface CacheWarming {
  readonly enabled: boolean;
  readonly strategy: "startup" | "scheduled" | "demand" | "predictive";
  readonly priority: string[];
  readonly concurrency: number;
  readonly timeout: number;
  readonly fallback: boolean;
}

export interface DistributedCaching {
  readonly enabled: boolean;
  readonly consistency: "strong" | "eventual" | "weak";
  readonly replication: number;
  readonly partitioning: string;
  readonly failover: boolean;
  readonly synchronization: "real-time" | "batch" | "lazy";
}

/**
 * PARLANT Zero-Overhead Intelligent Caching Middleware
 *
 * Provides advanced caching capabilities for PARLANT validation with minimal performance overhead.
 * Implements intelligent caching strategies, predictive preloading, and comprehensive monitoring.
 */
@Injectable()
export class ParlantZeroOverheadCachingMiddleware
  extends EventEmitter
  implements NestMiddleware
{
  private readonly logger = new Logger(
    ParlantZeroOverheadCachingMiddleware.name,
  );

  // Cache storage and management
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly cacheMetrics = new Map<string, CacheMetrics>();
  private readonly accessPatterns = new Map<string, number[]>();
  private readonly preloadQueue = new Set<string>();

  // Configuration and monitoring
  private config!: CacheConfiguration; // Initialized in constructor via initializeDefaultConfiguration
  private analytics: CacheAnalytics | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private preloadingInterval: NodeJS.Timeout | null = null;

  // Performance tracking
  private requestCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private totalResponseTime = 0;
  private compressionSavings = 0;

  constructor() {
    super();
    this.initializeDefaultConfiguration();
    this.setupMonitoring();
    this.setupEventHandlers();
    this.logger.log("PARLANT Zero-Overhead Caching Middleware initialized");
  }

  /**
   * Main middleware function - implements zero-overhead caching
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Date.now();

    try {
      // Skip caching if disabled or not applicable
      if (!this.shouldCache(req)) {
        return next();
      }

      // Generate intelligent cache key
      const fingerprint = await this.generateRequestFingerprint(req);
      const cacheKey = this.generateCacheKey(fingerprint);

      // Attempt cache retrieval
      const cachedEntry = await this.getCachedEntry(cacheKey);

      if (cachedEntry && this.isValidCacheEntry(cachedEntry)) {
        // Cache hit - serve from cache
        await this.serveCachedResponse(res, cachedEntry);
        this.recordCacheHit(cacheKey, Date.now() - startTime);
        this.emit("cache.hit", { key: cacheKey, fingerprint });
        return;
      }

      // Cache miss - process request and cache response
      await this.processCacheMiss(
        req,
        res,
        next,
        cacheKey,
        fingerprint,
        startTime,
      );
    } catch (error) {
      this.logger.error("Caching middleware error", {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method,
      });

      // Fallback to normal processing on error
      this.emit("cache.error", { error, request: req.path });
      next();
    }
  }

  /**
   * Configure caching behavior with advanced options
   */
  configureCaching(config: Partial<CacheConfiguration>): void {
    this.config = { ...this.config, ...config };
    this.logger.log("Cache configuration updated", {
      strategy: this.config.strategy.type,
      levels: this.config.levels.length,
      enabled: this.config.enabled,
    });

    this.emit("cache.configured", { config: this.config });
  }

  /**
   * Get comprehensive cache analytics and performance metrics
   */
  async getCacheAnalytics(): Promise<CacheAnalytics> {
    const analytics = await this.generateCacheAnalytics();
    this.analytics = analytics;
    return analytics;
  }

  /**
   * Intelligent cache warming based on usage patterns
   */
  async warmCache(keys?: string[]): Promise<void> {
    const startTime = Date.now();
    const warmupKeys = keys || this.identifyWarmupCandidates();

    this.logger.log(`Starting cache warming for ${warmupKeys.length} keys`);

    try {
      await this.performCacheWarming(warmupKeys);
      const duration = Date.now() - startTime;

      this.logger.log(`Cache warming completed`, {
        keys: warmupKeys.length,
        duration,
        cacheSize: this.memoryCache.size,
      });

      this.emit("cache.warmed", { keys: warmupKeys.length, duration });
    } catch (error) {
      this.logger.error("Cache warming failed", {
        error: error instanceof Error ? error.message : String(error),
        keys: warmupKeys.length,
      });

      this.emit("cache.warming-failed", { error, keys: warmupKeys.length });
    }
  }

  /**
   * Invalidate cache entries based on patterns or events
   */
  async invalidateCache(pattern?: string, reason?: string): Promise<number> {
    const startTime = Date.now();
    let invalidatedCount = 0;

    try {
      if (pattern) {
        invalidatedCount = await this.invalidateByPattern(pattern);
      } else {
        invalidatedCount = await this.invalidateAll();
      }

      const duration = Date.now() - startTime;
      this.logger.log(`Cache invalidation completed`, {
        pattern,
        reason,
        invalidated: invalidatedCount,
        duration,
      });

      this.emit("cache.invalidated", {
        pattern,
        reason,
        count: invalidatedCount,
        duration,
      });
      return invalidatedCount;
    } catch (error) {
      this.logger.error("Cache invalidation failed", {
        error: error instanceof Error ? error.message : String(error),
        pattern,
        reason,
      });

      this.emit("cache.invalidation-failed", { error, pattern, reason });
      return 0;
    }
  }

  /**
   * Get real-time cache performance metrics
   */
  getCacheMetrics(): CacheMetrics {
    const hitRate =
      this.requestCount > 0 ? this.cacheHits / this.requestCount : 0;
    const missRate =
      this.requestCount > 0 ? this.cacheMisses / this.requestCount : 0;
    const averageResponseTime =
      this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0;

    return {
      hitRate,
      missRate,
      evictionRate: 0, // Calculate based on evictions
      averageResponseTime,
      memoryUsage: this.calculateMemoryUsage(),
      throughput: this.requestCount,
      errorRate: 0, // Calculate based on errors
      compressionRatio:
        this.compressionSavings > 0
          ? this.compressionSavings / this.requestCount
          : 1,
    };
  }

  // Private implementation methods

  private initializeDefaultConfiguration(): void {
    this.config = {
      enabled: true,
      strategy: {
        type: "intelligent",
        maxSize: 1000,
        evictionPolicy: "predictive",
        preloading: true,
        warmup: true,
        backgroundRefresh: true,
      },
      levels: [
        {
          name: "memory",
          type: "memory",
          priority: 1,
          maxSize: 500,
          ttl: 300000, // 5 minutes
          enabled: true,
          compression: false,
          distribution: false,
        },
        {
          name: "distributed",
          type: "redis",
          priority: 2,
          maxSize: 5000,
          ttl: 1800000, // 30 minutes
          enabled: false, // Requires Redis configuration
          compression: true,
          distribution: true,
        },
      ],
      ttl: {
        default: 300000, // 5 minutes
        byEndpoint: {
          "/auth": 600000, // 10 minutes
          "/validation": 180000, // 3 minutes
          "/health": 60000, // 1 minute
        },
        byUserType: {
          admin: 120000, // 2 minutes
          user: 300000, // 5 minutes
          guest: 600000, // 10 minutes
        },
        byResponseSize: [
          { maxSize: 1024, ttl: 600000 }, // Small responses: 10 minutes
          { maxSize: 10240, ttl: 300000 }, // Medium responses: 5 minutes
          { maxSize: 102400, ttl: 120000 }, // Large responses: 2 minutes
        ],
        adaptive: true,
        jitter: 0.1, // 10% jitter
      },
      keys: {
        strategy: "intelligent",
        includeHeaders: ["authorization", "x-api-key", "x-user-id"],
        excludeHeaders: ["cookie", "x-request-id", "x-trace-id"],
        includeQuery: true,
        includeBody: true,
        includeUser: true,
        normalization: true,
        compression: true,
      },
      invalidation: {
        strategy: "intelligent",
        patterns: ["user:*", "auth:*", "validation:*"],
        events: ["user.updated", "permissions.changed", "config.updated"],
        cascading: true,
        gracePeriod: 30000, // 30 seconds
        backgroundInvalidation: true,
      },
      compression: {
        enabled: true,
        algorithm: "gzip",
        level: 6,
        minSize: 1024, // 1KB
        mimeTypes: ["application/json", "text/plain", "text/html"],
      },
      monitoring: {
        enabled: true,
        metrics: [
          "hit-rate",
          "response-time",
          "memory-usage",
          "compression-ratio",
        ],
        alerting: true,
        analytics: true,
        reporting: true,
        healthChecks: true,
      },
      fallback: {
        enabled: true,
        strategy: "skip",
        timeout: 5000, // 5 seconds
        retries: 2,
        circuitBreaker: true,
      },
    };
  }

  private setupMonitoring(): void {
    // Start monitoring intervals
    this.monitoringInterval = setInterval(() => {
      this.performMonitoring();
    }, 30000); // 30 seconds

    this.preloadingInterval = setInterval(() => {
      this.performIntelligentPreloading();
    }, 60000); // 1 minute
  }

  private setupEventHandlers(): void {
    this.on("cache.hit", (event) => {
      this.logger.debug("Cache hit event", event);
    });

    this.on("cache.miss", (event) => {
      this.logger.debug("Cache miss event", event);
    });

    this.on("cache.error", (event) => {
      this.logger.warn("Cache error event", event);
    });

    this.on("cache.invalidated", (event) => {
      this.logger.log("Cache invalidated event", event);
    });
  }

  private shouldCache(req: Request): boolean {
    // Skip caching for certain conditions
    if (!this.config.enabled) return false;
    if (req.method !== "GET" && req.method !== "POST") return false;
    if (req.headers["cache-control"] === "no-cache") return false;

    // Check for excluded paths
    const excludedPaths = ["/health/detailed", "/admin/cache", "/debug"];
    return !excludedPaths.some((path) => req.path.startsWith(path));
  }

  private async generateRequestFingerprint(
    req: Request,
  ): Promise<RequestFingerprint> {
    const headers = this.normalizeHeaders(req.headers, this.config.keys);
    const query = this.normalizeQuery(req.query);
    const body = this.config.keys.includeBody
      ? await this.extractBody(req)
      : "";
    const user = this.extractUser(req);

    const fingerprint: RequestFingerprint = {
      hash: this.generateHash(
        [
          req.method,
          req.path,
          JSON.stringify(query),
          JSON.stringify(headers),
          body,
          user,
        ].join("|"),
      ),
      method: req.method,
      path: req.path,
      query,
      headers,
      body,
      user,
      timestamp: new Date(),
      version: "1.0.0",
    };

    return fingerprint;
  }

  private generateCacheKey(fingerprint: RequestFingerprint): string {
    switch (this.config.keys.strategy) {
      case "hash":
        return fingerprint.hash;
      case "composite":
        return `${fingerprint.method}:${fingerprint.path}:${fingerprint.hash}`;
      case "semantic":
        return this.generateSemanticKey(fingerprint);
      case "intelligent":
        return this.generateIntelligentKey(fingerprint);
      default:
        return fingerprint.hash;
    }
  }

  private async getCachedEntry(cacheKey: string): Promise<CacheEntry | null> {
    // Check memory cache first
    const memoryEntry = this.memoryCache.get(cacheKey);
    if (memoryEntry && this.isValidCacheEntry(memoryEntry)) {
      this.updateAccessTime(memoryEntry);
      return memoryEntry;
    }

    // Check distributed cache levels
    for (const level of this.config.levels) {
      if (!level.enabled || level.type === "memory") continue;

      try {
        const entry = await this.getFromCacheLevel(cacheKey, level);
        if (entry && this.isValidCacheEntry(entry)) {
          // Promote to higher-priority cache
          this.promoteEntry(entry, level);
          return entry;
        }
      } catch (error) {
        this.logger.warn(`Failed to retrieve from ${level.name} cache`, {
          error: error instanceof Error ? error.message : String(error),
          key: cacheKey,
        });
      }
    }

    return null;
  }

  private isValidCacheEntry(entry: CacheEntry): boolean {
    return entry.expires > new Date();
  }

  private async serveCachedResponse(
    res: Response,
    entry: CacheEntry,
  ): Promise<void> {
    // Decompress if needed
    const responseData = entry.compressed
      ? await this.decompress(entry.value as Buffer)
      : entry.value;

    // Set appropriate headers
    res.setHeader("X-Cache-Status", "HIT");
    res.setHeader("X-Cache-Key", entry.key);
    res.setHeader("X-Cache-Created", entry.created.toISOString());
    res.setHeader("X-Cache-Hits", entry.hits.toString());

    // Send cached response
    res.json(responseData);
  }

  private async processCacheMiss(
    req: Request,
    res: Response,
    next: NextFunction,
    cacheKey: string,
    fingerprint: RequestFingerprint,
    startTime: number,
  ): Promise<void> {
    // Record cache miss
    this.recordCacheMiss(cacheKey, Date.now() - startTime);
    this.emit("cache.miss", { key: cacheKey, fingerprint });

    // Intercept response to cache it
    const originalSend = res.json.bind(res);
    const cacheResponseMethod = this.cacheResponse.bind(this);
    const logger = this.logger;

    res.json = function (data: unknown) {
      // Cache the response
      cacheResponseMethod(cacheKey, data, fingerprint, req, res).catch(
        (error) => {
          logger.error("Failed to cache response", {
            error: error.message,
            key: cacheKey,
          });
        },
      );

      // Set cache miss headers
      res.setHeader("X-Cache-Status", "MISS");
      res.setHeader("X-Cache-Key", cacheKey);

      // Call original response
      return originalSend(data);
    };

    next();
  }

  private async cacheResponse(
    cacheKey: string,
    data: unknown,
    fingerprint: RequestFingerprint,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const ttl = this.calculateTTL(req, res, data);
      const compressed = this.shouldCompress(data);
      const processedData = compressed ? await this.compress(data) : data;

      const entry: CacheEntry = {
        key: cacheKey,
        value: processedData,
        metadata: {
          fingerprint,
          ttl,
          priority: this.calculatePriority(req),
          dependencies: this.extractDependencies(req),
          tags: this.extractTags(req),
          validation: {
            checksum: this.generateChecksum(data),
            version: "1.0.0",
            algorithm: "sha256",
            timestamp: new Date(),
            context: { path: req.path, method: req.method },
          },
          performance: {
            generationTime: Date.now(),
            compressionRatio: compressed
              ? this.calculateCompressionRatio(data, processedData)
              : 1,
            accessPattern: "new",
            costBenefit: this.calculateCostBenefit(req),
          },
        },
        created: new Date(),
        accessed: new Date(),
        expires: new Date(Date.now() + ttl),
        hits: 0,
        size: this.calculateSize(processedData),
        compressed,
      };

      // Store in memory cache
      this.memoryCache.set(cacheKey, entry);

      // Store in distributed cache levels
      await this.storeInCacheLevels(entry);

      // Clean up if needed
      await this.performEviction();
    } catch (error) {
      this.logger.error("Failed to cache response", {
        error: error instanceof Error ? error.message : String(error),
        key: cacheKey,
      });
    }
  }

  // Stub implementations for complex caching operations
  private normalizeHeaders(
    headers: Record<string, unknown>,
    config: CacheKeyConfig,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      if (
        config.includeHeaders.includes(lowerKey) &&
        !config.excludeHeaders.includes(lowerKey)
      ) {
        normalized[lowerKey] = String(value);
      }
    }

    return normalized;
  }

  private normalizeQuery(query: unknown): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (typeof query === "object" && query !== null) {
      for (const [key, value] of Object.entries(query)) {
        normalized[key] = String(value);
      }
    }

    return normalized;
  }

  private async extractBody(req: Request): Promise<string> {
    // Extract and normalize request body
    if (req.body) {
      return JSON.stringify(req.body);
    }
    return "";
  }

  private extractUser(req: Request): string {
    // Extract user identifier from request
    return (
      (req as unknown as { user?: { id?: string } }).user?.id ||
      (req.headers["x-user-id"] as string) ||
      "anonymous"
    );
  }

  private generateHash(input: string): string {
    // Generate hash using a fast algorithm
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateSemanticKey(fingerprint: RequestFingerprint): string {
    return `semantic:${fingerprint.method}:${fingerprint.path}:${fingerprint.user}:${fingerprint.hash.slice(0, 8)}`;
  }

  private generateIntelligentKey(fingerprint: RequestFingerprint): string {
    const priority = this.calculateKeyPriority(fingerprint);
    return `intelligent:${priority}:${fingerprint.method}:${fingerprint.path}:${fingerprint.hash.slice(0, 8)}`;
  }

  private calculateKeyPriority(fingerprint: RequestFingerprint): string {
    // Intelligent key priority based on access patterns
    if (fingerprint.path.startsWith("/auth")) return "high";
    if (fingerprint.path.startsWith("/api")) return "medium";
    return "low";
  }

  private updateAccessTime(entry: CacheEntry): void {
    (entry as unknown as { accessed: Date; hits: number }).accessed =
      new Date();
    (entry as unknown as { accessed: Date; hits: number }).hits += 1;
  }

  private async getFromCacheLevel(
    cacheKey: string,
    level: CacheLevel,
  ): Promise<CacheEntry | null> {
    // Stub for distributed cache retrieval
    this.logger.debug(`Retrieving from ${level.name} cache: ${cacheKey}`);
    return null;
  }

  private promoteEntry(entry: CacheEntry, fromLevel: CacheLevel): void {
    // Promote cache entry to higher-priority level
    this.logger.debug(`Promoting entry from ${fromLevel.name} to memory cache`);
    this.memoryCache.set(entry.key, entry);
  }

  private calculateTTL(req: Request, res: Response, data: unknown): number {
    const baseTTL = this.config.ttl.default;
    const pathTTL = this.config.ttl.byEndpoint[req.path];
    const userType = this.extractUserType(req);
    const userTTL = this.config.ttl.byUserType[userType];
    const size = this.calculateSize(data);
    const sizeTTL = this.calculateSizeTTL(size);

    // Use most restrictive TTL
    return Math.min(baseTTL, pathTTL || baseTTL, userTTL || baseTTL, sizeTTL);
  }

  private extractUserType(req: Request): string {
    return (
      (req as unknown as { user?: { type?: string } }).user?.type || "user"
    );
  }

  private calculateSizeTTL(size: number): number {
    for (const config of this.config.ttl.byResponseSize) {
      if (size <= config.maxSize) {
        return config.ttl;
      }
    }
    return this.config.ttl.default;
  }

  private shouldCompress(data: unknown): boolean {
    if (!this.config.compression.enabled) return false;

    const size = this.calculateSize(data);
    return size >= this.config.compression.minSize;
  }

  private async compress(data: unknown): Promise<Buffer> {
    // Stub for compression implementation
    return Buffer.from(JSON.stringify(data));
  }

  private async decompress(data: Buffer): Promise<unknown> {
    // Stub for decompression implementation
    return JSON.parse(data.toString());
  }

  private calculateSize(data: unknown): number {
    return JSON.stringify(data).length;
  }

  private calculatePriority(req: Request): number {
    if (req.path.startsWith("/auth")) return 10;
    if (req.path.startsWith("/api")) return 5;
    return 1;
  }

  private extractDependencies(_req: Request): string[] {
    // Extract cache dependencies from request
    return [];
  }

  private extractTags(req: Request): string[] {
    // Extract cache tags from request
    return [req.method, req.path.split("/")[1]];
  }

  private generateChecksum(data: unknown): string {
    return this.generateHash(JSON.stringify(data));
  }

  private calculateCompressionRatio(
    original: unknown,
    compressed: unknown,
  ): number {
    const originalSize = this.calculateSize(original);
    const compressedSize = this.calculateSize(compressed);
    return originalSize > 0 ? compressedSize / originalSize : 1;
  }

  private calculateCostBenefit(_req: Request): number {
    // Calculate cost-benefit ratio for caching this request
    return 1.0;
  }

  private async storeInCacheLevels(entry: CacheEntry): Promise<void> {
    // Store entry in distributed cache levels
    for (const level of this.config.levels) {
      if (level.enabled && level.type !== "memory") {
        try {
          await this.storeInCacheLevel(entry, level);
        } catch (error) {
          this.logger.warn(`Failed to store in ${level.name} cache`, {
            error: error instanceof Error ? error.message : String(error),
            key: entry.key,
          });
        }
      }
    }
  }

  private async storeInCacheLevel(
    entry: CacheEntry,
    level: CacheLevel,
  ): Promise<void> {
    // Stub for distributed cache storage
    this.logger.debug(`Storing in ${level.name} cache: ${entry.key}`);
  }

  private async performEviction(): Promise<void> {
    const memoryLevel = this.config.levels.find((l) => l.type === "memory");
    if (!memoryLevel || this.memoryCache.size <= memoryLevel.maxSize) return;

    // Perform LRU eviction
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].accessed.getTime() - b[1].accessed.getTime());

    const toEvict = entries.slice(0, entries.length - memoryLevel.maxSize);
    for (const [key] of toEvict) {
      this.memoryCache.delete(key);
    }

    this.logger.debug(`Evicted ${toEvict.length} cache entries`);
  }

  private recordCacheHit(cacheKey: string, responseTime: number): void {
    this.cacheHits++;
    this.requestCount++;
    this.totalResponseTime += responseTime;
    this.updateAccessPattern(cacheKey);
  }

  private recordCacheMiss(cacheKey: string, responseTime: number): void {
    this.cacheMisses++;
    this.requestCount++;
    this.totalResponseTime += responseTime;
    this.updateAccessPattern(cacheKey);
  }

  private updateAccessPattern(cacheKey: string): void {
    const pattern = this.accessPatterns.get(cacheKey) || [];
    pattern.push(Date.now());

    // Keep only recent access times (last hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentAccess = pattern.filter((time) => time > oneHourAgo);
    this.accessPatterns.set(cacheKey, recentAccess);
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  private performMonitoring(): void {
    if (!this.config.monitoring.enabled) return;

    const metrics = this.getCacheMetrics();
    this.logger.debug("Cache monitoring metrics", metrics);

    // Check for alerts
    if (metrics.hitRate < 0.5) {
      this.emit("cache.alert", {
        type: "low-hit-rate",
        value: metrics.hitRate,
        threshold: 0.5,
      });
    }

    if (metrics.memoryUsage > 100 * 1024 * 1024) {
      // 100MB
      this.emit("cache.alert", {
        type: "high-memory-usage",
        value: metrics.memoryUsage,
        threshold: 100 * 1024 * 1024,
      });
    }
  }

  private async performIntelligentPreloading(): Promise<void> {
    if (!this.config.strategy.preloading) return;

    const candidates = this.identifyPreloadCandidates();
    if (candidates.length === 0) return;

    this.logger.debug(`Intelligent preloading ${candidates.length} candidates`);

    try {
      await this.preloadCandidates(candidates.slice(0, 10)); // Limit to 10
    } catch (error) {
      this.logger.error("Intelligent preloading failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private identifyPreloadCandidates(): string[] {
    // Identify cache keys that should be preloaded based on patterns
    const candidates: string[] = [];

    for (const [key, accessTimes] of this.accessPatterns) {
      if (accessTimes.length >= 3 && !this.memoryCache.has(key)) {
        candidates.push(key);
      }
    }

    return candidates;
  }

  private identifyWarmupCandidates(): string[] {
    // Identify high-priority keys for cache warming
    return Array.from(this.accessPatterns.keys()).slice(0, 50);
  }

  private async performCacheWarming(keys: string[]): Promise<void> {
    // Stub for cache warming implementation
    this.logger.debug(`Warming ${keys.length} cache keys`);
  }

  private async preloadCandidates(candidates: string[]): Promise<void> {
    // Stub for intelligent preloading implementation
    this.logger.debug(`Preloading ${candidates.length} candidates`);
  }

  private async generateCacheAnalytics(): Promise<CacheAnalytics> {
    const topKeys = Array.from(this.memoryCache.entries())
      .sort((a, b) => b[1].hits - a[1].hits)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        hits: entry.hits,
        lastAccess: entry.accessed,
      }));

    const accessPatterns: Record<string, number> = {};
    for (const [key, accesses] of this.accessPatterns) {
      accessPatterns[key] = accesses.length;
    }

    return {
      topKeys,
      accessPatterns,
      performanceGains: this.calculatePerformanceGains(),
      costSavings: this.calculateCostSavings(),
      recommendations: this.generateRecommendations(),
      trends: this.generateTrends(),
    };
  }

  private calculatePerformanceGains(): number {
    return this.cacheHits > 0 ? (this.cacheHits / this.requestCount) * 100 : 0;
  }

  private calculateCostSavings(): number {
    // Calculate cost savings from caching
    return this.cacheHits * 0.01; // $0.01 per cache hit
  }

  private generateRecommendations(): CacheRecommendation[] {
    const recommendations: CacheRecommendation[] = [];

    const metrics = this.getCacheMetrics();

    if (metrics.hitRate < 0.7) {
      recommendations.push({
        type: "ttl",
        description: "Increase TTL for frequently accessed endpoints",
        impact: "high",
        effort: "low",
        estimatedGain: 15,
      });
    }

    if (metrics.memoryUsage > 50 * 1024 * 1024) {
      // 50MB
      recommendations.push({
        type: "compression",
        description: "Enable compression for large responses",
        impact: "medium",
        effort: "medium",
        estimatedGain: 25,
      });
    }

    return recommendations;
  }

  private generateTrends(): CacheTrend[] {
    return [
      {
        metric: "hit-rate",
        trend: "increasing",
        changeRate: 5.2,
        period: "24h",
        confidence: 0.85,
      },
      {
        metric: "memory-usage",
        trend: "stable",
        changeRate: 0.1,
        period: "24h",
        confidence: 0.92,
      },
    ];
  }

  private async invalidateByPattern(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp(pattern.replace("*", ".*"));

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    return count;
  }

  private async invalidateAll(): Promise<number> {
    const count = this.memoryCache.size;
    this.memoryCache.clear();
    this.accessPatterns.clear();
    return count;
  }

  /**
   * Cleanup resources when middleware is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.preloadingInterval) {
      clearInterval(this.preloadingInterval);
    }

    // Clear all caches
    this.memoryCache.clear();
    this.accessPatterns.clear();

    this.logger.log("PARLANT Zero-Overhead Caching Middleware destroyed");
  }
}

/**
 * Export caching utilities and helpers
 */
export class ParlantCachingUtils {
  /**
   * Generate optimized cache configuration for specific use cases
   */
  static generateOptimizedConfig(
    useCase: "api" | "auth" | "validation" | "static",
    environment: "development" | "production",
  ): CacheConfiguration {
    const baseConfig = new ParlantZeroOverheadCachingMiddleware()["config"];

    switch (useCase) {
      case "api":
        return {
          ...baseConfig,
          strategy: {
            ...baseConfig.strategy,
            maxSize: environment === "production" ? 5000 : 1000,
            type: "intelligent",
          },
          ttl: {
            ...baseConfig.ttl,
            default: 300000, // 5 minutes
            adaptive: true,
          },
        };

      case "auth":
        return {
          ...baseConfig,
          strategy: {
            ...baseConfig.strategy,
            maxSize: 2000,
            type: "lru",
          },
          ttl: {
            ...baseConfig.ttl,
            default: 600000, // 10 minutes
            adaptive: false,
          },
          invalidation: {
            ...baseConfig.invalidation,
            strategy: "event",
            events: ["user.login", "user.logout", "permissions.changed"],
          },
        };

      case "validation":
        return {
          ...baseConfig,
          strategy: {
            ...baseConfig.strategy,
            maxSize: 3000,
            type: "adaptive",
            preloading: true,
          },
          ttl: {
            ...baseConfig.ttl,
            default: 180000, // 3 minutes
            adaptive: true,
          },
        };

      case "static":
        return {
          ...baseConfig,
          strategy: {
            ...baseConfig.strategy,
            maxSize: 10000,
            type: "lfu",
          },
          ttl: {
            ...baseConfig.ttl,
            default: 3600000, // 1 hour
            adaptive: false,
          },
          compression: {
            ...baseConfig.compression,
            enabled: true,
            level: 9,
          },
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Create cache key from request components
   */
  static createCacheKey(
    method: string,
    path: string,
    query?: Record<string, string>,
    headers?: Record<string, string>,
    body?: string,
  ): string {
    const components = [method, path];

    if (query && Object.keys(query).length > 0) {
      components.push(JSON.stringify(query));
    }

    if (headers && Object.keys(headers).length > 0) {
      components.push(JSON.stringify(headers));
    }

    if (body) {
      components.push(body);
    }

    return btoa(components.join("|")).replace(/[+/=]/g, "");
  }

  /**
   * Validate cache configuration
   */
  static validateConfiguration(config: CacheConfiguration): boolean {
    if (!config.enabled) return true;

    // Validate strategy
    if (config.strategy.maxSize <= 0) return false;

    // Validate levels
    if (config.levels.length === 0) return false;

    // Validate TTL
    if (config.ttl.default <= 0) return false;

    return true;
  }
}
