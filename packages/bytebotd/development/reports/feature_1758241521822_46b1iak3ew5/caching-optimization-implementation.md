# 3-Tier Caching Hierarchy Implementation Guide

**Target Performance**: Sub-1000ms P95 Response Times
**Expected Cache Hit Rate**: 90%+
**Implementation Priority**: Critical

## Current Cache Architecture Analysis

### Existing Implementation Status
- **L1 Cache**: ✅ **IMPLEMENTED** - In-memory with LRU eviction (100ms TTL, 1-3ms access)
- **L2 Cache**: ⚠️ **PLACEHOLDER** - Redis distributed cache (5min TTL, 5-15ms access)
- **L3 Cache**: ⚠️ **PLACEHOLDER** - Persistent database cache (1hr TTL, 20-50ms access)

### Performance Gap Analysis
- Current cache hit rate: ~70% (estimated from L1 only)
- Target cache hit rate: 90%+
- Performance penalty for cache miss: 150-300ms
- **Critical Issue**: 20-30% of requests experiencing full validation latency

## L2 Redis Cache Implementation

### Architecture Design

```typescript
/**
 * Enhanced L2 Redis Cache Implementation
 * Target: 5-15ms access time, 85%+ hit rate
 */
export class EnhancedL2RedisCache {
  private redisCluster: Redis.Cluster;
  private compressionEnabled = true;
  private readonly l2Config = {
    redis: {
      cluster: [
        { host: 'redis-cache-1', port: 6379 },
        { host: 'redis-cache-2', port: 6379 },
        { host: 'redis-cache-3', port: 6379 }
      ],
      ttl: {
        pattern: 300000,    // 5 minutes for pattern-based cache
        result: 60000,      // 1 minute for specific results
        hot: 900000         // 15 minutes for frequently accessed data
      }
    },
    compression: {
      enabled: true,
      algorithm: 'gzip',
      level: 6,
      threshold: 1024     // Compress payloads > 1KB
    }
  };

  async initializeRedisCluster(): Promise<void> {
    this.redisCluster = new Redis.Cluster(this.l2Config.redis.cluster, {
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000,
        commandTimeout: 15000,  // 15ms max for cache operations
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 2
      },
      enableOfflineQueue: false,
      clusterRetryDelayOnFailover: 100,
      scaleReads: 'slave',
      maxRedirections: 3
    });

    // Health check and monitoring
    this.redisCluster.on('ready', () => {
      this.logger.log('Redis cluster ready for L2 cache operations');
    });

    this.redisCluster.on('error', (error) => {
      this.logger.error('Redis cluster error', { error: error.message });
    });
  }

  async setL2Cache(
    key: string,
    result: ParlantValidationResponse,
    options: {
      ttl?: number;
      priority?: 'hot' | 'normal' | 'cold';
      pattern?: ValidationPattern;
    } = {}
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Determine TTL based on priority and access patterns
      const ttl = this.calculateOptimalTTL(options);

      // Compress large payloads for efficiency
      const payload = this.shouldCompress(result)
        ? await this.compressResponse(result)
        : JSON.stringify(result);

      // Store with metadata for intelligent eviction
      const cacheEntry = {
        data: payload,
        compressed: this.shouldCompress(result),
        timestamp: Date.now(),
        accessCount: 1,
        priority: options.priority || 'normal',
        pattern: options.pattern?.functionSignature
      };

      await this.redisCluster.setex(key, ttl / 1000, JSON.stringify(cacheEntry));

      // Update cache performance metrics
      const latency = Date.now() - startTime;
      this.updateL2CacheMetrics('write', latency, true);

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateL2CacheMetrics('write', latency, false);
      this.logger.warn('L2 cache write failed', { key, error: error.message });
    }
  }

  async getL2Cache(key: string): Promise<ParlantValidationResponse | null> {
    const startTime = Date.now();

    try {
      const cached = await this.redisCluster.get(key);

      if (!cached) {
        this.updateL2CacheMetrics('read', Date.now() - startTime, false);
        return null;
      }

      const cacheEntry = JSON.parse(cached);

      // Decompress if needed
      const result = cacheEntry.compressed
        ? await this.decompressResponse(cacheEntry.data)
        : JSON.parse(cacheEntry.data);

      // Update access tracking for intelligent cache management
      await this.updateCacheAccessMetrics(key, cacheEntry);

      const latency = Date.now() - startTime;
      this.updateL2CacheMetrics('read', latency, true);

      return result;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateL2CacheMetrics('read', latency, false);
      this.logger.warn('L2 cache read failed', { key, error: error.message });
      return null;
    }
  }

  private calculateOptimalTTL(options: {
    ttl?: number;
    priority?: 'hot' | 'normal' | 'cold';
  }): number {
    if (options.ttl) return options.ttl;

    switch (options.priority) {
      case 'hot': return this.l2Config.redis.ttl.hot;      // 15 minutes
      case 'cold': return this.l2Config.redis.ttl.result;  // 1 minute
      default: return this.l2Config.redis.ttl.pattern;     // 5 minutes
    }
  }

  private shouldCompress(result: ParlantValidationResponse): boolean {
    const size = JSON.stringify(result).length;
    return this.compressionEnabled && size > this.l2Config.compression.threshold;
  }

  private async compressResponse(result: ParlantValidationResponse): Promise<string> {
    const zlib = await import('zlib');
    const data = JSON.stringify(result);
    return zlib.gzipSync(data, { level: this.l2Config.compression.level }).toString('base64');
  }

  private async decompressResponse(compressed: string): Promise<ParlantValidationResponse> {
    const zlib = await import('zlib');
    const buffer = Buffer.from(compressed, 'base64');
    const decompressed = zlib.gunzipSync(buffer).toString();
    return JSON.parse(decompressed);
  }
}
```

### Expected Performance Impact
- **Cache Hit Rate**: +15-20% improvement
- **Latency Reduction**: 80-150ms for cache hits
- **Throughput**: 200-300% increase for cached requests

## L3 Database Cache Implementation

### SQLite Implementation for Persistent Caching

```typescript
/**
 * L3 Database Cache Implementation
 * Target: 20-50ms access time, long-term persistence
 */
export class L3DatabaseCache {
  private db: Database;
  private readonly l3Config = {
    database: 'sqlite',
    filePath: './data/parlant-cache.db',
    retention: {
      successful: 3600000,  // 1 hour for successful validations
      failed: 300000,       // 5 minutes for failed validations
      hot: 86400000        // 24 hours for frequently accessed
    },
    compression: {
      enabled: true,
      threshold: 1024       // 1KB
    }
  };

  async initializeDatabase(): Promise<void> {
    const sqlite3 = await import('sqlite3');
    const { open } = await import('sqlite');

    this.db = await open({
      filename: this.l3Config.filePath,
      driver: sqlite3.Database
    });

    // Create optimized cache table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS parlant_cache (
        cache_key TEXT PRIMARY KEY,
        validation_data TEXT NOT NULL,
        compressed BOOLEAN DEFAULT FALSE,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        access_count INTEGER DEFAULT 1,
        last_accessed INTEGER NOT NULL,
        function_name TEXT,
        risk_level TEXT,
        user_id TEXT,
        priority TEXT DEFAULT 'normal'
      );

      CREATE INDEX IF NOT EXISTS idx_expires_at ON parlant_cache(expires_at);
      CREATE INDEX IF NOT EXISTS idx_function_name ON parlant_cache(function_name);
      CREATE INDEX IF NOT EXISTS idx_access_count ON parlant_cache(access_count DESC);
      CREATE INDEX IF NOT EXISTS idx_priority_access ON parlant_cache(priority, last_accessed DESC);
    `);

    // Start periodic cleanup
    this.startPeriodicCleanup();
  }

  async setL3Cache(
    key: string,
    result: ParlantValidationResponse,
    metadata: ValidationMetadata
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const now = Date.now();
      const ttl = this.calculateDatabaseTTL(result, metadata);
      const expiresAt = now + ttl;

      // Compress large payloads
      const shouldCompress = JSON.stringify(result).length > this.l3Config.compression.threshold;
      const data = shouldCompress
        ? await this.compressData(JSON.stringify(result))
        : JSON.stringify(result);

      await this.db.run(`
        INSERT OR REPLACE INTO parlant_cache (
          cache_key, validation_data, compressed, created_at, expires_at,
          last_accessed, function_name, risk_level, user_id, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        key, data, shouldCompress, now, expiresAt, now,
        metadata.functionName, metadata.riskLevel, metadata.userId,
        this.determinePriority(metadata)
      ]);

      const latency = Date.now() - startTime;
      this.updateL3CacheMetrics('write', latency, true);

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateL3CacheMetrics('write', latency, false);
      this.logger.error('L3 cache write failed', { key, error: error.message });
    }
  }

  async getL3Cache(key: string): Promise<ParlantValidationResponse | null> {
    const startTime = Date.now();

    try {
      const row = await this.db.get(`
        SELECT validation_data, compressed, access_count
        FROM parlant_cache
        WHERE cache_key = ? AND expires_at > ?
      `, [key, Date.now()]);

      if (!row) {
        this.updateL3CacheMetrics('read', Date.now() - startTime, false);
        return null;
      }

      // Update access tracking
      await this.db.run(`
        UPDATE parlant_cache
        SET access_count = access_count + 1, last_accessed = ?
        WHERE cache_key = ?
      `, [Date.now(), key]);

      // Decompress if needed
      const data = row.compressed
        ? await this.decompressData(row.validation_data)
        : row.validation_data;

      const result = JSON.parse(data);

      const latency = Date.now() - startTime;
      this.updateL3CacheMetrics('read', latency, true);

      return result;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateL3CacheMetrics('read', latency, false);
      this.logger.error('L3 cache read failed', { key, error: error.message });
      return null;
    }
  }

  private calculateDatabaseTTL(
    result: ParlantValidationResponse,
    metadata: ValidationMetadata
  ): number {
    // Longer TTL for successful, frequently accessed validations
    if (result.approved && metadata.cacheHit) {
      return this.l3Config.retention.hot;       // 24 hours
    }

    if (result.approved) {
      return this.l3Config.retention.successful; // 1 hour
    }

    return this.l3Config.retention.failed;      // 5 minutes
  }

  private startPeriodicCleanup(): void {
    setInterval(async () => {
      try {
        const result = await this.db.run(`
          DELETE FROM parlant_cache
          WHERE expires_at < ?
        `, [Date.now()]);

        if (result.changes && result.changes > 0) {
          this.logger.debug(`L3 cache cleanup: removed ${result.changes} expired entries`);
        }
      } catch (error) {
        this.logger.error('L3 cache cleanup failed', { error: error.message });
      }
    }, 300000); // Clean every 5 minutes
  }
}
```

### Expected Performance Impact
- **Long-term Cache**: 24-hour retention for hot data
- **Cold Start Performance**: 50-100ms vs 300ms full validation
- **Persistence**: Survives application restarts

## Cache Integration & Orchestration

### Unified Multi-Level Cache Manager

```typescript
/**
 * Enhanced Multi-Level Cache Orchestrator
 * Intelligent cache tier selection and optimization
 */
export class EnhancedMultiLevelCacheService {
  constructor(
    private l1Cache: InMemoryCache,
    private l2Cache: EnhancedL2RedisCache,
    private l3Cache: L3DatabaseCache,
    private performanceMonitor: ParlantPerformanceMonitorService
  ) {}

  async getCachedValidation(
    functionName: string,
    parameters: unknown[],
    context: Record<string, unknown>
  ): Promise<ParlantValidationResponse | null> {
    const startTime = Date.now();
    const key = this.generateCacheKey(functionName, parameters, context);

    // L1: Ultra-fast in-memory lookup (1-3ms)
    const l1Result = this.l1Cache.get(key);
    if (l1Result) {
      this.recordCacheHit('L1', Date.now() - startTime);
      return l1Result;
    }

    // L2: Fast Redis distributed lookup (5-15ms)
    const l2Result = await this.l2Cache.getL2Cache(key);
    if (l2Result) {
      // Promote to L1 for faster future access
      this.l1Cache.set(key, l2Result);
      this.recordCacheHit('L2', Date.now() - startTime);
      return l2Result;
    }

    // L3: Database persistent lookup (20-50ms)
    const l3Result = await this.l3Cache.getL3Cache(key);
    if (l3Result) {
      // Promote to L2 and L1 for faster future access
      await this.l2Cache.setL2Cache(key, l3Result, { priority: 'hot' });
      this.l1Cache.set(key, l3Result);
      this.recordCacheHit('L3', Date.now() - startTime);
      return l3Result;
    }

    // Cache miss - record for optimization
    this.recordCacheMiss(Date.now() - startTime);
    return null;
  }

  async setCachedValidation(
    functionName: string,
    parameters: unknown[],
    context: Record<string, unknown>,
    result: ParlantValidationResponse,
    metadata: ValidationMetadata
  ): Promise<void> {
    const key = this.generateCacheKey(functionName, parameters, context);

    // Determine cache strategy based on access patterns and performance
    const cacheStrategy = this.determineCacheStrategy(result, metadata);

    // Store in appropriate cache tiers
    await Promise.allSettled([
      this.l1Cache.set(key, result),
      this.l2Cache.setL2Cache(key, result, {
        priority: cacheStrategy.l2Priority,
        ttl: cacheStrategy.l2TTL
      }),
      this.l3Cache.setL3Cache(key, result, metadata)
    ]);
  }

  private determineCacheStrategy(
    result: ParlantValidationResponse,
    metadata: ValidationMetadata
  ): {
    l2Priority: 'hot' | 'normal' | 'cold';
    l2TTL: number;
  } {
    // Hot data: frequently accessed, approved validations
    if (metadata.cacheHit && result.approved) {
      return { l2Priority: 'hot', l2TTL: 900000 }; // 15 minutes
    }

    // Normal data: standard validations
    if (result.approved) {
      return { l2Priority: 'normal', l2TTL: 300000 }; // 5 minutes
    }

    // Cold data: failed validations, high-risk operations
    return { l2Priority: 'cold', l2TTL: 60000 }; // 1 minute
  }
}
```

## Performance Monitoring & Optimization

### Real-Time Cache Performance Tracking

```typescript
interface CachePerformanceMetrics {
  l1Stats: {
    hitRate: number;
    avgAccessTime: number;
    memoryUsage: number;
    evictionRate: number;
  };
  l2Stats: {
    hitRate: number;
    avgAccessTime: number;
    networkLatency: number;
    compressionRatio: number;
    clusterHealth: string[];
  };
  l3Stats: {
    hitRate: number;
    avgAccessTime: number;
    diskUsage: number;
    queryLatency: number;
  };
  overallStats: {
    totalHitRate: number;
    avgLatency: number;
    throughputImprovement: number;
    costSavings: number;
  };
}
```

## Implementation Priority & Timeline

### Week 1: L2 Redis Cache
1. **Day 1-2**: Redis cluster setup and basic implementation
2. **Day 3-4**: Compression and intelligent TTL management
3. **Day 5**: Testing and performance validation

**Expected Improvement**: 40-60% cache hit rate increase

### Week 2: L3 Database Cache
1. **Day 1-2**: SQLite database schema and basic operations
2. **Day 3-4**: Intelligent retention and cleanup policies
3. **Day 5**: Integration testing and performance optimization

**Expected Improvement**: Additional 15-25% cache hit rate

### Week 3: Cache Orchestration
1. **Day 1-2**: Multi-tier cache promotion and eviction logic
2. **Day 3-4**: Performance monitoring and adaptive optimization
3. **Day 5**: Load testing and fine-tuning

**Expected Improvement**: 90%+ overall cache hit rate

## Success Metrics

### Performance Targets
- **Overall Cache Hit Rate**: 90%+ (current ~70%)
- **L1 Cache**: <3ms access, 70%+ hit rate
- **L2 Cache**: <15ms access, 85%+ hit rate when L1 misses
- **L3 Cache**: <50ms access, 95%+ hit rate when L1+L2 miss
- **Cache Miss Penalty**: Reduced from 300ms to <50ms average

### Monitoring KPIs
1. P95 response time reduction: 40-60%
2. Average response time improvement: 50-70%
3. Throughput increase: 200-300%
4. Memory efficiency: <100MB cache overhead
5. Cost optimization: 60-80% reduction in external API calls

This implementation provides a comprehensive path to achieving sub-1000ms P95 response times through intelligent 3-tier caching optimization.