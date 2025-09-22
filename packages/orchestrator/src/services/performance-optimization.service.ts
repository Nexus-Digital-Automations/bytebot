/**
 * Performance Optimization Service
 *
 * Advanced performance optimization service with intelligent caching,
 * async processing, and real-time performance monitoring for
 * PARLANT validation integration in orchestration workflows.
 *
 * Features:
 * - Multi-level intelligent caching (L1: Memory, L2: Redis, L3: Database)
 * - Async validation processing with streaming results
 * - Performance monitoring and optimization
 * - Resource usage optimization
 * - Batch processing for validation operations
 * - Smart prefetching and cache warming
 *
 * Performance Targets:
 * - Validation Response Time: <500ms P95, <1000ms P99
 * - Cache Hit Rate: >85%
 * - Throughput: >5000 validations/second
 * - Resource Efficiency: <70% CPU, <80% Memory
 *
 * @module PerformanceOptimizationService
 * @version 1.0.0
 * @author AIgent Orchestrator Team
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { v4 as uuidv4 } from 'uuid';

// Import types
import {
  ParlantValidationResult,
  SecurityLevel,
  ParlantUserContext,
  _ValidationAuditEntry
} from '../types/parlant-shared.types';
import {
  OrchestrationTask,
  _OrchestrationExecutionContext,
  OrchestrationUserContext
} from '../types/orchestrator.types';

// ===== PERFORMANCE INTERFACES =====

/**
 * Performance optimization configuration
 */
export interface PerformanceOptimizationConfig {
  /** Caching configuration */
  readonly caching: CachingConfig;
  /** Async processing configuration */
  readonly asyncProcessing: AsyncProcessingConfig;
  /** Monitoring configuration */
  readonly monitoring: Record<string, unknown>;
  /** Resource limits */
  readonly resourceLimits: ResourceLimitsConfig;
  /** Batch processing configuration */
  readonly batchProcessing: Record<string, unknown>;
}

/**
 * Caching configuration
 */
export interface CachingConfig {
  /** L1 in-memory cache configuration */
  readonly l1Cache: L1CacheConfig;
  /** L2 distributed cache configuration */
  readonly l2Cache: L2CacheConfig;
  /** L3 persistent cache configuration */
  readonly l3Cache: L3CacheConfig;
  /** Cache warming configuration */
  readonly warming: CacheWarmingConfig;
  /** Cache eviction policies */
  readonly eviction: CacheEvictionConfig;
}

/**
 * L1 in-memory cache configuration
 */
export interface L1CacheConfig {
  /** Maximum entries */
  readonly maxEntries: number;
  /** TTL in milliseconds */
  readonly ttlMs: number;
  /** Maximum memory usage in MB */
  readonly maxMemoryMb: number;
  /** Access time target in ms */
  readonly targetAccessTimeMs: number;
}

/**
 * L2 distributed cache configuration
 */
export interface L2CacheConfig {
  /** Redis cluster configuration */
  readonly redis: RedisClusterConfig;
  /** TTL in milliseconds */
  readonly ttlMs: number;
  /** Maximum entries per node */
  readonly maxEntriesPerNode: number;
  /** Access time target in ms */
  readonly targetAccessTimeMs: number;
}

/**
 * L3 persistent cache configuration
 */
export interface L3CacheConfig {
  /** Database configuration */
  readonly database: DatabaseCacheConfig;
  /** TTL in milliseconds */
  readonly ttlMs: number;
  /** Maximum storage size in MB */
  readonly maxStorageMb: number;
  /** Access time target in ms */
  readonly targetAccessTimeMs: number;
}

/**
 * Redis cluster configuration
 */
export interface RedisClusterConfig {
  readonly nodes: string[];
  readonly password?: string;
  readonly maxRetries: number;
  readonly retryDelayMs: number;
}

/**
 * Database cache configuration
 */
export interface DatabaseCacheConfig {
  readonly connectionString: string;
  readonly tableName: string;
  readonly indexStrategy: string;
  readonly compressionEnabled: boolean;
}

/**
 * Cache warming configuration
 */
export interface CacheWarmingConfig {
  /** Enable automatic cache warming */
  readonly enabled: boolean;
  /** Warming strategies */
  readonly strategies: CacheWarmingStrategy[];
  /** Warming schedule */
  readonly schedule: string; // Cron expression
  /** Parallel warming threads */
  readonly threads: number;
}

/**
 * Cache warming strategy
 */
export interface CacheWarmingStrategy {
  readonly name: string;
  readonly description: string;
  readonly priority: number;
  readonly enabled: boolean;
  readonly config: Record<string, unknown>;
}

/**
 * Cache eviction configuration
 */
export interface CacheEvictionConfig {
  /** L1 eviction policy */
  readonly l1Policy: EvictionPolicy;
  /** L2 eviction policy */
  readonly l2Policy: EvictionPolicy;
  /** L3 eviction policy */
  readonly l3Policy: EvictionPolicy;
  /** Eviction check interval */
  readonly checkIntervalMs: number;
}

/**
 * Eviction policies
 */
export enum EvictionPolicy {
  LRU = 'lru',      // Least Recently Used
  LFU = 'lfu',      // Least Frequently Used
  FIFO = 'fifo',    // First In, First Out
  TTL = 'ttl',      // Time To Live
  ADAPTIVE = 'adaptive' // Adaptive based on access patterns
}

/**
 * Async processing configuration
 */
export interface AsyncProcessingConfig {
  /** Queue configuration */
  readonly queues: QueueConfig;
  /** Record<string, unknown> configuration */
  readonly workers: Record<string, unknown>;
  /** Streaming configuration */
  readonly streaming: StreamingConfig;
  /** Batch processing configuration */
  readonly batching: Record<string, unknown>;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  /** Max queue size */
  readonly maxSize: number;
  /** Queue timeout in ms */
  readonly timeoutMs: number;
  /** Priority levels */
  readonly priorityLevels: number;
  /** Dead letter queue config */
  readonly deadLetter: Record<string, unknown>;
}

/**
 * Record<string, unknown> configuration
 */
export interface WorkerConfig {
  /** Number of worker threads */
  readonly threads: number;
  /** Record<string, unknown> timeout in ms */
  readonly timeoutMs: number;
  /** Concurrency per worker */
  readonly concurrency: number;
  /** Auto-scaling configuration */
  readonly autoScaling: Record<string, unknown>;
}

/**
 * Streaming configuration
 */
export interface StreamingConfig {
  /** Enable streaming validation */
  readonly enabled: boolean;
  /** Stream buffer size */
  readonly bufferSize: number;
  /** Stream timeout in ms */
  readonly timeoutMs: number;
  /** Backpressure handling */
  readonly backpressure: Record<string, unknown>;
}

/**
 * Resource limits configuration
 */
export interface ResourceLimitsConfig {
  /** CPU limits */
  readonly cpu: Record<string, unknown>;
  /** Memory limits */
  readonly memory: Record<string, unknown>;
  /** Network limits */
  readonly network: Record<string, unknown>;
  /** Monitoring thresholds */
  readonly thresholds: Record<string, unknown>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  /** Response time metrics */
  readonly responseTime: ResponseTimeMetrics;
  /** Throughput metrics */
  readonly throughput: Record<string, unknown>;
  /** Resource usage metrics */
  readonly resources: Record<string, unknown>;
  /** Cache performance metrics */
  readonly cache: CachePerformanceMetrics;
  /** Queue performance metrics */
  readonly queue: Record<string, unknown>;
}

/**
 * Response time metrics
 */
export interface ResponseTimeMetrics {
  readonly p50: number; // 50th percentile
  readonly p90: number; // 90th percentile
  readonly p95: number; // 95th percentile
  readonly p99: number; // 99th percentile
  readonly average: number;
  readonly minimum: number;
  readonly maximum: number;
}

/**
 * Cache performance metrics
 */
export interface CachePerformanceMetrics {
  readonly l1: CacheLevelMetrics;
  readonly l2: CacheLevelMetrics;
  readonly l3: CacheLevelMetrics;
  readonly overall: Record<string, unknown>;
}

/**
 * Cache level metrics
 */
export interface CacheLevelMetrics {
  readonly hits: number;
  readonly misses: number;
  readonly hitRate: number;
  readonly averageResponseTime: number;
  readonly memoryUsage: number;
  readonly entryCount: number;
}

/**
 * Performance optimization request
 */
export interface PerformanceOptimizationRequest {
  /** Request ID */
  readonly requestId: string;
  /** Validation request */
  readonly validationRequest: ValidationRequest;
  /** Performance requirements */
  readonly requirements: PerformanceRequirements;
  /** Optimization context */
  readonly context: Record<string, unknown>;
  /** Request timestamp */
  readonly timestamp: Date;
}

/**
 * Validation request
 */
export interface ValidationRequest {
  /** Task to validate */
  readonly task: OrchestrationTask;
  /** User context */
  readonly userContext: OrchestrationUserContext;
  /** Conversation context */
  readonly conversationContext: ParlantUserContext;
  /** Security level required */
  readonly securityLevel: SecurityLevel;
  /** Validation type */
  readonly validationType: 'pre-execution' | 'step-execution' | 'post-execution';
}

/**
 * Performance requirements
 */
export interface PerformanceRequirements {
  /** Maximum response time in ms */
  readonly maxResponseTimeMs: number;
  /** Minimum cache hit rate */
  readonly minCacheHitRate: number;
  /** Maximum resource usage */
  readonly maxResourceUsage: Record<string, unknown>;
  /** Quality of service level */
  readonly qosLevel: QoSLevel;
}

/**
 * Quality of Service levels
 */
export enum QoSLevel {
  BEST_EFFORT = 'best_effort',
  GUARANTEED = 'guaranteed',
  PREMIUM = 'premium',
  CRITICAL = 'critical'
}

/**
 * Performance optimization result
 */
export interface PerformanceOptimizationResult {
  /** Request ID */
  readonly requestId: string;
  /** Validation result */
  readonly validationResult: ParlantValidationResult;
  /** Performance metrics */
  readonly metrics: PerformanceMetrics;
  /** Cache utilization */
  readonly cacheUtilization: Record<string, unknown>;
  /** Optimization applied */
  readonly optimizationsApplied: Record<string, unknown>[];
  /** Total processing time */
  readonly totalProcessingTimeMs: number;
}

// ===== MAIN SERVICE =====

@Injectable()
export class PerformanceOptimizationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceOptimizationService.name);

  // Configuration
  private config!: PerformanceOptimizationConfig;

  // Cache layers
  private readonly l1Cache = new Map<string, CacheEntry>();
  private readonly l2CacheClient: any = null; // Redis client would be injected
  private readonly l3CacheClient: any = null; // Database client would be injected

  // Async processing
  private readonly validationQueue: ValidationRequest[] = [];
  private readonly processingRecord: Record<string, unknown>[] = [];
  private readonly streamingConnections = new Map<string, StreamingConnection>();

  // Performance tracking
  private metrics: PerformanceMetrics = {
    responseTime: {
      p50: 0, p90: 0, p95: 0, p99: 0,
      average: 0, minimum: 0, maximum: 0
    },
    throughput: {
      requestsPerSecond: 0,
      validationsPerSecond: 0,
      completedRequests: 0,
      failedRequests: 0
    },
    resources: {
      cpuUsage: 0,
      memoryUsage: 0,
      networkUsage: 0,
      diskUsage: 0
    },
    cache: {
      l1: { hits: 0, misses: 0, hitRate: 0, averageResponseTime: 0, memoryUsage: 0, entryCount: 0 },
      l2: { hits: 0, misses: 0, hitRate: 0, averageResponseTime: 0, memoryUsage: 0, entryCount: 0 },
      l3: { hits: 0, misses: 0, hitRate: 0, averageResponseTime: 0, memoryUsage: 0, entryCount: 0 },
      overall: { totalHits: 0, totalMisses: 0, overallHitRate: 0, averageResponseTime: 0 }
    },
    queue: {
      size: 0,
      averageWaitTime: 0,
      throughput: 0,
      activeRecord<string, unknown>: 0
    }
  };

  // Response time tracking
  private readonly responseTimeWindow: number[] = [];
  private readonly maxWindowSize = 10000;

  // Background timers
  private metricsTimer: NodeJS.Timeout | null = null;
  private cacheEvictionTimer: NodeJS.Timeout | null = null;
  private warmingTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.loadConfiguration();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Performance Optimization Service...');

    // Initialize cache layers
    await this.initializeCacheLayers();

    // Start async workers
    await this.startAsyncRecord<string, unknown>();

    // Start monitoring
    this.startPerformanceMonitoring();

    // Start cache warming
    await this.startCacheWarming();

    this.logger.log('Performance Optimization Service initialized successfully');
  }

  async onModuleDestroy(): Promise<void> {
    // Stop timers
    if (this.metricsTimer) clearInterval(this.metricsTimer);
    if (this.cacheEvictionTimer) clearInterval(this.cacheEvictionTimer);
    if (this.warmingTimer) clearInterval(this.warmingTimer);

    // Shutdown workers
    await this.shutdownRecord<string, unknown>();

    // Close streaming connections
    await this.closeStreamingConnections();
  }

  // ===== PRIMARY OPTIMIZATION INTERFACE =====

  /**
   * Optimize validation request with intelligent caching and async processing
   */
  async optimizeValidation(
    request: PerformanceOptimizationRequest
  ): Promise<PerformanceOptimizationResult> {
    const startTime = Date.now();

    this.logger.debug(`Starting performance optimization`, {
      requestId: request.requestId,
      qosLevel: request.requirements.qosLevel
    });

    try {
      // 1. Check cache hierarchy for existing result
      const cachedResult = await this.checkCacheHierarchy(request);
      if (cachedResult) {
        return this.createOptimizedResult(
          request,
          cachedResult.validationResult,
          cachedResult.source,
          startTime
        );
      }

      // 2. Route to appropriate processing strategy
      const processingStrategy = this.selectProcessingStrategy(request);

      let validationResult: ParlantValidationResult;

      switch (processingStrategy) {
        case 'IMMEDIATE':
          validationResult = await this.processImmediate(request);
          break;
        case 'ASYNC':
          validationResult = await this.processAsync(request);
          break;
        case 'BATCH':
          validationResult = await this.processBatch(request);
          break;
        case 'STREAMING':
          validationResult = await this.processStreaming(request);
          break;
        default:
          validationResult = await this.processImmediate(request);
      }

      // 3. Cache the result in appropriate layers
      await this.cacheResult(request, validationResult);

      // 4. Update performance metrics
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingTime, true);

      // 5. Emit performance event
      this.eventEmitter.emit('performance.optimization.completed', {
        requestId: request.requestId,
        processingTime,
        strategy: processingStrategy
      });

      return this.createOptimizedResult(
        request,
        validationResult,
        'COMPUTED',
        startTime
      );

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingTime, false);

      this.logger.error(`Performance optimization failed`, {
        requestId: request.requestId,
        error: error instanceof Error ? error.message : String(error),
        processingTime
      });

      throw error;
    }
  }

  /**
   * Pre-warm cache with likely validation requests
   */
  async warmCache(patterns: CacheWarmingPattern[]): Promise<void> {
    this.logger.log(`Starting cache warming with ${patterns.length} patterns`);

    try {
      const warmingPromises = patterns.map(pattern =>
        this.executeWarmingPattern(pattern)
      );

      await Promise.allSettled(warmingPromises);

      this.logger.log('Cache warming completed');
    } catch (error) {
      this.logger.error('Cache warming failed', error);
    }
  }

  /**
   * Get comprehensive performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      responseTime: this.calculateResponseTimeMetrics(),
      cache: this.calculateCacheMetrics()
    };
  }

  /**
   * Optimize resource usage
   */
  async optimizeResources(): Promise<Record<string, unknown>> {
    this.logger.debug('Starting resource optimization');

    const currentUsage = await this.getCurrentResourceUsage();
    const optimizations: Record<string, unknown>[] = [];

    // CPU optimization
    if (currentUsage.cpuUsage > this.config.resourceLimits.thresholds.cpu.warning) {
      optimizations.push(await this.optimizeCpuUsage());
    }

    // Memory optimization
    if (currentUsage.memoryUsage > this.config.resourceLimits.thresholds.memory.warning) {
      optimizations.push(await this.optimizeMemoryUsage());
    }

    // Network optimization
    if (currentUsage.networkUsage > this.config.resourceLimits.thresholds.network.warning) {
      optimizations.push(await this.optimizeNetworkUsage());
    }

    return {
      currentUsage,
      optimizations,
      projectedImprovement: this.calculateProjectedImprovement(optimizations),
      timestamp: new Date()
    };
  }

  // ===== CACHE IMPLEMENTATION =====

  /**
   * Check cache hierarchy (L1 -> L2 -> L3)
   */
  private async checkCacheHierarchy(
    request: PerformanceOptimizationRequest
  ): Promise<CachedValidationResult | null> {
    const cacheKey = this.generateCacheKey(request);

    // L1: In-memory cache (fastest)
    const l1Result = await this.checkL1Cache(cacheKey);
    if (l1Result) {
      this.metrics.cache.l1.hits++;
      return { validationResult: l1Result, source: 'L1' };
    }
    this.metrics.cache.l1.misses++;

    // L2: Redis distributed cache
    const l2Result = await this.checkL2Cache(cacheKey);
    if (l2Result) {
      this.metrics.cache.l2.hits++;
      // Promote to L1
      await this.setL1Cache(cacheKey, l2Result);
      return { validationResult: l2Result, source: 'L2' };
    }
    this.metrics.cache.l2.misses++;

    // L3: Database persistent cache
    const l3Result = await this.checkL3Cache(cacheKey);
    if (l3Result) {
      this.metrics.cache.l3.hits++;
      // Promote to L2 and L1
      await this.setL2Cache(cacheKey, l3Result);
      await this.setL1Cache(cacheKey, l3Result);
      return { validationResult: l3Result, source: 'L3' };
    }
    this.metrics.cache.l3.misses++;

    return null; // Cache miss at all levels
  }

  /**
   * Generate cache key for validation request
   */
  private generateCacheKey(request: PerformanceOptimizationRequest): string {
    const keyComponents = [
      request.validationRequest.task.taskId,
      request.validationRequest.userContext.userId,
      request.validationRequest.securityLevel,
      request.validationRequest.validationType
    ];

    // Add task workflow hash for uniqueness
    const workflowHash = this.hashWorkflow(request.validationRequest.task.workflow);
    keyComponents.push(workflowHash);

    return keyComponents.join(':');
  }

  /**
   * Hash workflow for cache key generation
   */
  private hashWorkflow(workflow: any[]): string {
    // Simple hash implementation (in production, use proper hashing)
    const workflowString = JSON.stringify(workflow);
    return Buffer.from(workflowString).toString('base64').substring(0, 16);
  }

  /**
   * Check L1 in-memory cache
   */
  private async checkL1Cache(key: string): Promise<ParlantValidationResult | null> {
    const startTime = Date.now();

    try {
      const entry = this.l1Cache.get(key);
      if (entry && !this.isCacheEntryExpired(entry)) {
        const accessTime = Date.now() - startTime;
        this.metrics.cache.l1.averageResponseTime =
          (this.metrics.cache.l1.averageResponseTime + accessTime) / 2;

        return entry.value;
      }

      // Remove expired entry
      if (entry) {
        this.l1Cache.delete(key);
      }

      return null;
    } catch (error) {
      this.logger.error('L1 cache check failed', error);
      return null;
    }
  }

  /**
   * Set L1 cache entry
   */
  private async setL1Cache(
    key: string,
    value: ParlantValidationResult
  ): Promise<void> {
    try {
      // Check memory limits
      if (this.l1Cache.size >= this.config.caching.l1Cache.maxEntries) {
        await this.evictL1CacheEntries();
      }

      const entry: CacheEntry = {
        value,
        timestamp: new Date(),
        ttlMs: this.config.caching.l1Cache.ttlMs,
        accessCount: 1,
        lastAccess: new Date()
      };

      this.l1Cache.set(key, entry);
      this.metrics.cache.l1.entryCount = this.l1Cache.size;
    } catch (error) {
      this.logger.error('L1 cache set failed', error);
    }
  }

  /**
   * Check L2 Redis cache
   */
  private async checkL2Cache(_key: string): Promise<ParlantValidationResult | null> {
    const startTime = Date.now();

    try {
      if (!this.l2CacheClient) {
        return null;
      }

      // In a real implementation, this would use Redis
      // For now, return null to simulate cache miss
      const accessTime = Date.now() - startTime;
      this.metrics.cache.l2.averageResponseTime =
        (this.metrics.cache.l2.averageResponseTime + accessTime) / 2;

      return null;
    } catch (error) {
      this.logger.error('L2 cache check failed', error);
      return null;
    }
  }

  /**
   * Set L2 cache entry
   */
  private async setL2Cache(
    _key: string,
    _value: ParlantValidationResult
  ): Promise<void> {
    try {
      if (!this.l2CacheClient) {
        return;
      }

      // In a real implementation, this would use Redis
      // await this.l2CacheClient.setex(key, this.config.caching.l2Cache.ttlMs / 1000, JSON.stringify(value));
    } catch (error) {
      this.logger.error('L2 cache set failed', error);
    }
  }

  /**
   * Check L3 database cache
   */
  private async checkL3Cache(_key: string): Promise<ParlantValidationResult | null> {
    const startTime = Date.now();

    try {
      if (!this.l3CacheClient) {
        return null;
      }

      // In a real implementation, this would query database
      const accessTime = Date.now() - startTime;
      this.metrics.cache.l3.averageResponseTime =
        (this.metrics.cache.l3.averageResponseTime + accessTime) / 2;

      return null;
    } catch (error) {
      this.logger.error('L3 cache check failed', error);
      return null;
    }
  }

  /**
   * Set L3 cache entry
   */
  private async setL3Cache(
    _key: string,
    _value: ParlantValidationResult
  ): Promise<void> {
    try {
      if (!this.l3CacheClient) {
        return;
      }

      // In a real implementation, this would insert into database
    } catch (error) {
      this.logger.error('L3 cache set failed', error);
    }
  }

  /**
   * Cache validation result in appropriate layers
   */
  private async cacheResult(
    request: PerformanceOptimizationRequest,
    result: ParlantValidationResult
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(request);

    try {
      // Always cache in L1 for fastest access
      await this.setL1Cache(cacheKey, result);

      // Cache in L2 for distributed access
      if (this.shouldCacheInL2(request, result)) {
        await this.setL2Cache(cacheKey, result);
      }

      // Cache in L3 for persistence
      if (this.shouldCacheInL3(request, result)) {
        await this.setL3Cache(cacheKey, result);
      }
    } catch (error) {
      this.logger.error('Failed to cache result', error);
    }
  }

  /**
   * Determine if result should be cached in L2
   */
  private shouldCacheInL2(
    request: PerformanceOptimizationRequest,
    result: ParlantValidationResult
  ): boolean {
    // Cache in L2 if:
    // - QoS level is guaranteed or higher
    // - Validation was successful
    // - Security level is internal or higher
    return request.requirements.qosLevel !== QoSLevel.BEST_EFFORT &&
           result.validated &&
           request.validationRequest.securityLevel !== SecurityLevel._MINIMAL;
  }

  /**
   * Determine if result should be cached in L3
   */
  private shouldCacheInL3(
    request: PerformanceOptimizationRequest,
    result: ParlantValidationResult
  ): boolean {
    // Cache in L3 if:
    // - QoS level is premium or critical
    // - Compliance validation is involved
    // - Security level is confidential or higher
    return (request.requirements.qosLevel === QoSLevel.PREMIUM ||
            request.requirements.qosLevel === QoSLevel.CRITICAL) &&
           result.complianceValidation.auditRequired;
  }

  // ===== ASYNC PROCESSING IMPLEMENTATION =====

  /**
   * Select processing strategy based on requirements
   */
  private selectProcessingStrategy(
    request: PerformanceOptimizationRequest
  ): ProcessingStrategy {
    const { requirements } = request;

    // Critical QoS requires immediate processing
    if (requirements.qosLevel === QoSLevel.CRITICAL) {
      return 'IMMEDIATE';
    }

    // Fast response required
    if (requirements.maxResponseTimeMs < 1000) {
      return 'IMMEDIATE';
    }

    // High throughput scenarios benefit from batching
    if (this.validationQueue.length > 10) {
      return 'BATCH';
    }

    // Default to async for better resource utilization
    return 'ASYNC';
  }

  /**
   * Process validation immediately
   */
  private async processImmediate(
    request: PerformanceOptimizationRequest
  ): Promise<ParlantValidationResult> {
    // Direct synchronous processing
    return await this.executeValidation(request.validationRequest);
  }

  /**
   * Process validation asynchronously
   */
  private async processAsync(
    request: PerformanceOptimizationRequest
  ): Promise<ParlantValidationResult> {
    return new Promise((resolve, reject) => {
      // Add to queue with priority based on QoS level
      const priority = this.qosLevelToPriority(request.requirements.qosLevel);

      const queueItem: QueueItem = {
        request: request.validationRequest,
        priority,
        resolve,
        reject,
        timestamp: new Date()
      };

      this.addToQueue(queueItem);
    });
  }

  /**
   * Process validation in batch
   */
  private async processBatch(
    request: PerformanceOptimizationRequest
  ): Promise<ParlantValidationResult> {
    // Group similar requests for batch processing
    const batchKey = this.generateBatchKey(request);
    const batch = this.getOrCreateBatch(batchKey);

    return new Promise((resolve, reject) => {
      batch.requests.push({
        request: request.validationRequest,
        resolve,
        reject
      });

      // Process batch when it reaches optimal size or timeout
      if (batch.requests.length >= this.config.batchProcessing.optimalBatchSize) {
        this.processBatchItems(batch);
      }
    });
  }

  /**
   * Process validation with streaming
   */
  private async processStreaming(
    request: PerformanceOptimizationRequest
  ): Promise<ParlantValidationResult> {
    const streamId = uuidv4();

    return new Promise((resolve, reject) => {
      const connection: StreamingConnection = {
        streamId,
        request: request.validationRequest,
        resolve,
        reject,
        startTime: new Date()
      };

      this.streamingConnections.set(streamId, connection);
      this.processStreamingRequest(connection);
    });
  }

  /**
   * Execute validation (mock implementation)
   */
  private async executeValidation(
    validationRequest: ValidationRequest
  ): Promise<ParlantValidationResult> {
    // This would integrate with actual PARLANT validation service
    // For now, return a mock result
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing time

    return {
      validated: true,
      validationType: validationRequest.validationType,
      securityClassification: validationRequest.securityLevel,
      riskLevel: 'LOW',
      conversationalValidation: {
        approved: true,
        reason: 'Validation passed',
        confidence: 0.95,
        conversationId: uuidv4(),
        validationContext: {}
      },
      complianceValidation: {
        compliant: true,
        violations: [],
        auditRequired: false,
        frameworksChecked: [],
        timestamp: new Date()
      },
      multiServiceValidation: {
        coordinationRequired: false,
        serviceValidations: [],
        distributedStateConsistent: true
      },
      performanceImpact: {
        estimatedLatencyMs: 100,
        resourceRequirements: { cpu: 0.1, memory: 50 },
        cachingBenefit: 0.8
      },
      validationTimeMs: 100,
      timestamp: new Date(),
      validationId: uuidv4(),
      auditTrail: []
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Load configuration
   */
  private loadConfiguration(): void {
    this.config = {
      caching: {
        l1Cache: {
          maxEntries: 10000,
          ttlMs: 300000, // 5 minutes
          maxMemoryMb: 256,
          targetAccessTimeMs: 5
        },
        l2Cache: {
          redis: {
            nodes: ['localhost:6379'],
            maxRetries: 3,
            retryDelayMs: 1000
          },
          ttlMs: 3600000, // 1 hour
          maxEntriesPerNode: 100000,
          targetAccessTimeMs: 15
        },
        l3Cache: {
          database: {
            connectionString: 'postgresql://localhost:5432/cache',
            tableName: 'validation_cache',
            indexStrategy: 'btree',
            compressionEnabled: true
          },
          ttlMs: 86400000, // 24 hours
          maxStorageMb: 10240, // 10GB
          targetAccessTimeMs: 50
        },
        warming: {
          enabled: true,
          strategies: [
            {
              name: 'frequent_patterns',
              description: 'Warm cache with frequently accessed patterns',
              priority: 1,
              enabled: true,
              config: {}
            }
          ],
          schedule: '0 */6 * * *', // Every 6 hours
          threads: 4
        },
        eviction: {
          l1Policy: EvictionPolicy.LRU,
          l2Policy: EvictionPolicy.LFU,
          l3Policy: EvictionPolicy.TTL,
          checkIntervalMs: 60000
        }
      },
      asyncProcessing: {
        queues: {
          maxSize: 10000,
          timeoutMs: 30000,
          priorityLevels: 5,
          deadLetter: {
            enabled: true,
            maxRetries: 3,
            retentionMs: 86400000
          }
        },
        workers: {
          threads: 8,
          timeoutMs: 30000,
          concurrency: 10,
          autoScaling: {
            enabled: true,
            minRecord<string, unknown>: 2,
            maxRecord<string, unknown>: 16,
            scaleUpThreshold: 0.8,
            scaleDownThreshold: 0.2
          }
        },
        streaming: {
          enabled: true,
          bufferSize: 1000,
          timeoutMs: 30000,
          backpressure: {
            enabled: true,
            maxBufferSize: 10000,
            dropPolicy: 'oldest'
          }
        },
        batching: {
          enabled: true,
          optimalBatchSize: 20,
          maxBatchSize: 50,
          timeoutMs: 5000
        }
      },
      monitoring: {
        metricsIntervalMs: 60000,
        alertThresholds: {
          responseTime: { warning: 1000, critical: 2000 },
          cacheHitRate: { warning: 0.7, critical: 0.5 },
          queueSize: { warning: 1000, critical: 5000 }
        }
      },
      resourceLimits: {
        cpu: {
          maxUsagePercent: 80,
          warningThreshold: 70,
          criticalThreshold: 90
        },
        memory: {
          maxUsageMb: 4096,
          warningThreshold: 3200,
          criticalThreshold: 3840
        },
        network: {
          maxBandwidthMbps: 1000,
          warningThreshold: 800,
          criticalThreshold: 950
        },
        thresholds: {
          cpu: { warning: 70, critical: 90 },
          memory: { warning: 80, critical: 95 },
          network: { warning: 80, critical: 95 }
        }
      },
      batchProcessing: {
        enabled: true,
        optimalBatchSize: 20,
        maxBatchSize: 50,
        timeoutMs: 5000,
        strategies: ['similarity', 'priority', 'resource']
      }
    };
  }

  /**
   * Create optimized result
   */
  private createOptimizedResult(
    request: PerformanceOptimizationRequest,
    validationResult: ParlantValidationResult,
    source: string,
    startTime: number
  ): PerformanceOptimizationResult {
    const processingTime = Date.now() - startTime;

    return {
      requestId: request.requestId,
      validationResult,
      metrics: this.getPerformanceMetrics(),
      cacheUtilization: this.calculateRecord<string, unknown>(),
      optimizationsApplied: this.getAppliedOptimizations(source),
      totalProcessingTimeMs: processingTime
    };
  }

  /**
   * Initialize cache layers
   */
  private async initializeCacheLayers(): Promise<void> {
    this.logger.debug('Initializing cache layers...');
    // In a real implementation, initialize Redis and database connections
  }

  /**
   * Start async workers
   */
  private async startAsyncRecord<string, unknown>(): Promise<void> {
    this.logger.debug('Starting async workers...');
    // In a real implementation, start worker threads
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsIntervalMs);
  }

  /**
   * Start cache warming
   */
  private async startCacheWarming(): Promise<void> {
    this.logger.debug('Starting cache warming...');
    // In a real implementation, implement cache warming strategies
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(processingTime: number, success: boolean): void {
    // Update response time window
    this.responseTimeWindow.push(processingTime);
    if (this.responseTimeWindow.length > this.maxWindowSize) {
      this.responseTimeWindow.shift();
    }

    // Update throughput metrics
    if (success) {
      this.metrics.throughput.completedRequests++;
    } else {
      this.metrics.throughput.failedRequests++;
    }
  }

  /**
   * Calculate response time metrics
   */
  private calculateResponseTimeMetrics(): ResponseTimeMetrics {
    if (this.responseTimeWindow.length === 0) {
      return {
        p50: 0, p90: 0, p95: 0, p99: 0,
        average: 0, minimum: 0, maximum: 0
      };
    }

    const sorted = [...this.responseTimeWindow].sort((a, b) => a - b);
    const length = sorted.length;

    return {
      p50: sorted[Math.floor(length * 0.5)] || 0,
      p90: sorted[Math.floor(length * 0.9)] || 0,
      p95: sorted[Math.floor(length * 0.95)] || 0,
      p99: sorted[Math.floor(length * 0.99)] || 0,
      average: sorted.reduce((sum, time) => sum + time, 0) / length,
      minimum: sorted[0] || 0,
      maximum: sorted[length - 1] || 0
    };
  }

  /**
   * Calculate cache metrics
   */
  private calculateCacheMetrics(): CachePerformanceMetrics {
    const l1Total = this.metrics.cache.l1.hits + this.metrics.cache.l1.misses;
    const l2Total = this.metrics.cache.l2.hits + this.metrics.cache.l2.misses;
    const l3Total = this.metrics.cache.l3.hits + this.metrics.cache.l3.misses;
    const overallTotal = l1Total + l2Total + l3Total;

    return {
      l1: {
        ...this.metrics.cache.l1,
        hitRate: l1Total > 0 ? this.metrics.cache.l1.hits / l1Total : 0,
        entryCount: this.l1Cache.size
      },
      l2: {
        ...this.metrics.cache.l2,
        hitRate: l2Total > 0 ? this.metrics.cache.l2.hits / l2Total : 0
      },
      l3: {
        ...this.metrics.cache.l3,
        hitRate: l3Total > 0 ? this.metrics.cache.l3.hits / l3Total : 0
      },
      overall: {
        totalHits: this.metrics.cache.l1.hits + this.metrics.cache.l2.hits + this.metrics.cache.l3.hits,
        totalMisses: this.metrics.cache.l1.misses + this.metrics.cache.l2.misses + this.metrics.cache.l3.misses,
        overallHitRate: overallTotal > 0 ?
          (this.metrics.cache.l1.hits + this.metrics.cache.l2.hits + this.metrics.cache.l3.hits) / overallTotal : 0,
        averageResponseTime: (
          this.metrics.cache.l1.averageResponseTime +
          this.metrics.cache.l2.averageResponseTime +
          this.metrics.cache.l3.averageResponseTime
        ) / 3
      }
    };
  }

  // Placeholder methods for complex operations
  private async shutdownRecord<string, unknown>(): Promise<void> { /* Implementation */ }
  private async closeStreamingConnections(): Promise<void> { /* Implementation */ }
  private isCacheEntryExpired(entry: CacheEntry): boolean { return Date.now() - entry.timestamp.getTime() > entry.ttlMs; }
  private async evictL1CacheEntries(): Promise<void> { /* Implementation */ }
  private qosLevelToPriority(_qos: QoSLevel): number { return 1; }
  private addToQueue(_item: QueueItem): void { /* Implementation */ }
  private generateBatchKey(_request: PerformanceOptimizationRequest): string { return 'batch-key'; }
  private getOrCreateBatch(_key: string): any { return { requests: [] }; }
  private async processBatchItems(_batch: any): Promise<void> { /* Implementation */ }
  private async processStreamingRequest(_connection: StreamingConnection): Promise<void> { /* Implementation */ }
  private calculateRecord(): any { return {}; }
  private getAppliedOptimizations(_source: string): any[] { return []; }
  private collectMetrics(): void { /* Implementation */ }
  private async executeWarmingPattern(_pattern: CacheWarmingPattern): Promise<void> { /* Implementation */ }
  private async getCurrentResourceUsage(): Promise<any> { return {}; }
  private async optimizeCpuUsage(): Promise<any> { return {}; }
  private async optimizeMemoryUsage(): Promise<any> { return {}; }
  private async optimizeNetworkUsage(): Promise<any> { return {}; }
  private calculateProjectedImprovement(_optimizations: any[]): any { return {}; }
}

// ===== ADDITIONAL INTERFACES =====

interface CacheEntry {
  readonly value: ParlantValidationResult;
  readonly timestamp: Date;
  readonly ttlMs: number;
  readonly accessCount: number;
  readonly lastAccess: Date;
}

interface CachedValidationResult {
  readonly validationResult: ParlantValidationResult;
  readonly source: 'L1' | 'L2' | 'L3';
}

interface QueueItem {
  readonly request: ValidationRequest;
  readonly priority: number;
  readonly resolve: (result: ParlantValidationResult) => void;
  readonly reject: (error: Error) => void;
  readonly timestamp: Date;
}

interface StreamingConnection {
  readonly streamId: string;
  readonly request: ValidationRequest;
  readonly resolve: (result: ParlantValidationResult) => void;
  readonly reject: (error: Error) => void;
  readonly startTime: Date;
}

type ProcessingStrategy = 'IMMEDIATE' | 'ASYNC' | 'BATCH' | 'STREAMING';

interface CacheWarmingPattern {
  readonly patternId: string;
  readonly description: string;
  readonly priority: number;
  readonly frequency: string;
}

// ... Additional type definitions would continue here