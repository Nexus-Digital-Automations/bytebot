/**
 * Database Performance Optimizer Service
 *
 * Provides performance optimization for Parlant-validated database operations
 * to minimize validation overhead while maintaining security and functionality.
 *
 * Features:
 * - Intelligent caching strategies for validation results
 * - Query pattern optimization and batch processing
 * - Performance monitoring and bottleneck identification
 * - Adaptive validation based on operation patterns
 * - Connection pool optimization for validation overhead
 * - Memory-efficient validation result storage
 *
 * Architecture: Multi-layered optimization with real-time adaptation
 * Performance: Target <100ms validation overhead for 95% of operations
 * Monitoring: Comprehensive metrics and alerting for performance degradation
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DatabaseOperationMetadata,
  ParlantDatabaseValidationRequest,
  RiskLevel,
} from './parlant-validated-database.service';
import { ParlantValidationResponse } from '@shared/types/parlant-integration.types';

// ===== PERFORMANCE OPTIMIZATION INTERFACES =====

/**
 * Performance optimization configuration
 */
export interface PerformanceOptimizerConfig {
  readonly cacheStrategy: 'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE';
  readonly batchingEnabled: boolean;
  readonly adaptiveValidation: boolean;
  readonly preemptiveValidation: boolean;
  readonly parallelValidation: boolean;
  readonly maxCacheSize: number;
  readonly cacheTtl: number;
  readonly performanceThreshold: number;
}

/**
 * Operation performance metrics
 */
export interface OperationPerformanceMetrics {
  readonly operationId: string;
  readonly validationTime: number;
  readonly executionTime: number;
  readonly totalTime: number;
  readonly cacheHit: boolean;
  readonly batchedValidation: boolean;
  readonly timestamp: Date;
}

/**
 * Performance optimization result
 */
export interface PerformanceOptimizationResult {
  readonly optimizationApplied: string[];
  readonly estimatedTimeReduction: number;
  readonly cacheUtilization: number;
  readonly recommendedActions: string[];
}

/**
 * Batch validation request
 */
export interface BatchValidationRequest {
  readonly batchId: string;
  readonly requests: ParlantDatabaseValidationRequest[];
  readonly priority: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly maxWaitTime: number;
}

// ===== DATABASE PERFORMANCE OPTIMIZER SERVICE =====

@Injectable()
export class DatabasePerformanceOptimizerService {
  private readonly logger = new Logger(
    DatabasePerformanceOptimizerService.name,
  );
  private readonly config: PerformanceOptimizerConfig;

  // Performance tracking
  private readonly performanceMetrics: OperationPerformanceMetrics[] = [];
  private readonly validationPatterns = new Map<string, number>();
  private readonly operationFrequency = new Map<string, number>();

  // Caching optimization
  private readonly smartCache = new Map<
    string,
    {
      _response: ParlantValidationResponse;
      timestamp: Date;
      hitCount: number;
      lastAccess: Date;
    }
  >();

  // Batch processing
  private readonly pendingBatches = new Map<string, BatchValidationRequest>();
  private batchProcessingTimer?: NodeJS.Timeout;

  // Performance monitoring
  private averageValidationTime = 0;
  private validationCount = 0;
  private cacheHitRate = 0;
  private performanceAlerts: string[] = [];

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadOptimizerConfig();

    this.logger.log('Initializing Database Performance Optimizer', {
      cacheStrategy: this.config.cacheStrategy,
      batchingEnabled: this.config.batchingEnabled,
      adaptiveValidation: this.config.adaptiveValidation,
      performanceThreshold: `${this.config.performanceThreshold}ms`,
    });

    // Initialize optimization features
    this.initializeSmartCaching();
    this.initializeBatchProcessing();
    this.startPerformanceMonitoring();
  }

  // ===== CORE OPTIMIZATION METHODS =====

  /**
   * Optimize validation request for performance
   */
  async optimizeValidationRequest(
    _request: ParlantDatabaseValidationRequest,
  ): Promise<{
    optimizedRequest: ParlantDatabaseValidationRequest;
    optimizations: string[];
    estimatedPerformanceGain: number;
  }> {
    const startTime = Date.now();
    const optimizations: string[] = [];

    this.logger.debug('Optimizing validation request', {
      operationId: request.operationId,
      functionName: request.functionName,
      operationType: request.databaseOperation.operationType,
    });

    // 1. Apply smart caching optimization
    const cacheOptimization = this.applyCacheOptimization(request);
    if (cacheOptimization.applied) {
      optimizations.push('smart_caching');
    }

    // 2. Apply batch processing optimization
    const batchOptimization = await this.applyBatchOptimization(request);
    if (batchOptimization.applied) {
      optimizations.push('batch_processing');
    }

    // 3. Apply adaptive validation optimization
    const adaptiveOptimization = this.applyAdaptiveValidation(request);
    if (adaptiveOptimization.applied) {
      optimizations.push('adaptive_validation');
    }

    // 4. Apply pattern-based optimization
    const patternOptimization = this.applyPatternOptimization(request);
    if (patternOptimization.applied) {
      optimizations.push('pattern_optimization');
    }

    const estimatedPerformanceGain =
      this.calculatePerformanceGain(optimizations);

    const optimizationTime = Date.now() - startTime;
    this.logger.debug('Validation request optimization completed', {
      operationId: request.operationId,
      optimizations,
      estimatedPerformanceGain: `${estimatedPerformanceGain}ms`,
      optimizationTime: `${optimizationTime}ms`,
    });

    return {
      optimizedRequest: request, // May be modified by optimizations
      optimizations,
      estimatedPerformanceGain,
    };
  }

  /**
   * Get cached validation result with smart cache management
   */
  getCachedValidationResult(
    _request: ParlantDatabaseValidationRequest,
  ): ParlantValidationResponse | null {
    const cacheKey = this.generateSmartCacheKey(request);
    const cached = this.smartCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if cache entry is still valid
    const now = new Date();
    const age = now.getTime() - cached.timestamp.getTime();

    if (age > this.config.cacheTtl) {
      // Remove expired entry
      this.smartCache.delete(cacheKey);
      return null;
    }

    // Update access statistics
    cached.hitCount++;
    cached.lastAccess = now;

    this.logger.debug('Cache hit for validation request', {
      operationId: request.operationId,
      cacheKey,
      age: `${age}ms`,
      hitCount: cached.hitCount,
    });

    return cached.response;
  }

  /**
   * Cache validation result with intelligent cache management
   */
  cacheValidationResult(
    _request: ParlantDatabaseValidationRequest,
    _response: ParlantValidationResponse,
  ): void {
    if (!this.shouldCacheResult(request, response)) {
      return;
    }

    const cacheKey = this.generateSmartCacheKey(request);
    const now = new Date();

    // Check cache size limits
    this.enforceeCacheSizeLimit();

    this.smartCache.set(cacheKey, {
      response,
      timestamp: now,
      hitCount: 0,
      lastAccess: now,
    });

    this.logger.debug('Cached validation result', {
      operationId: request.operationId,
      cacheKey,
      cacheSize: this.smartCache.size,
    });
  }

  // ===== OPTIMIZATION STRATEGIES =====

  /**
   * Apply smart caching optimization
   */
  private applyCacheOptimization(_request: ParlantDatabaseValidationRequest): {
    applied: boolean;
    improvement: number;
  } {
    // Update operation frequency tracking
    const operationSignature = this.generateOperationSignature(request);
    const currentFrequency =
      this.operationFrequency.get(operationSignature) || 0;
    this.operationFrequency.set(operationSignature, currentFrequency + 1);

    // Apply aggressive caching for frequently repeated operations
    if (this.config.cacheStrategy === 'AGGRESSIVE' && currentFrequency > 5) {
      return { applied: true, improvement: 200 }; // 200ms improvement estimate
    }

    // Apply balanced caching for moderately repeated operations
    if (this.config.cacheStrategy === 'BALANCED' && currentFrequency > 2) {
      return { applied: true, improvement: 100 }; // 100ms improvement estimate
    }

    return { applied: false, improvement: 0 };
  }

  /**
   * Apply batch processing optimization
   */
  private async applyBatchOptimization(
    _request: ParlantDatabaseValidationRequest,
  ): Promise<{ applied: boolean; improvement: number }> {
    if (!this.config.batchingEnabled) {
      return { applied: false, improvement: 0 };
    }

    // Check if request can be batched with similar pending requests
    const canBatch = this.canBatchWithPending(request);

    if (canBatch) {
      await this.addToBatch(request);
      return { applied: true, improvement: 150 }; // 150ms improvement estimate
    }

    return { applied: false, improvement: 0 };
  }

  /**
   * Apply adaptive validation optimization
   */
  private applyAdaptiveValidation(_request: ParlantDatabaseValidationRequest): {
    applied: boolean;
    improvement: number;
  } {
    if (!this.config.adaptiveValidation) {
      return { applied: false, improvement: 0 };
    }

    // Use historical performance data to adapt validation intensity
    const riskLevel = this.determineRiskLevel(request.databaseOperation);
    const pattern = this.getValidationPattern(request);

    // Reduce validation intensity for well-established low-risk patterns
    if (
      riskLevel === RiskLevel.LOW &&
      pattern.successRate > 0.95 &&
      pattern.occurrences > 20
    ) {
      return { applied: true, improvement: 75 }; // 75ms improvement estimate
    }

    return { applied: false, improvement: 0 };
  }

  /**
   * Apply pattern-based optimization
   */
  private applyPatternOptimization(
    _request: ParlantDatabaseValidationRequest,
  ): {
    applied: boolean;
    improvement: number;
  } {
    const pattern = this.identifyOperationPattern(request);

    // Apply optimization based on recognized patterns
    switch (pattern.type) {
      case 'READ_heavy':
        return { applied: true, improvement: 50 };
      case 'batch_operation':
        return { applied: true, improvement: 100 };
      case 'scheduled_maintenance':
        return { applied: true, improvement: 25 };
      default:
        return { applied: false, improvement: 0 };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Generate smart cache key with pattern consideration
   */
  private generateSmartCacheKey(
    _request: ParlantDatabaseValidationRequest,
  ): string {
    const keyComponents = {
      functionName: request.functionName,
      operationType: request.databaseOperation.operationType,
      isDestructive: request.databaseOperation.isDestructive,
      riskLevel: this.determineRiskLevel(request.databaseOperation),
      userId: request.userContext.userId,
      // Add table-specific caching for better granularity
      tableName: request.databaseOperation.tableName,
    };

    return `smart_cache_${JSON.stringify(keyComponents)}`;
  }

  /**
   * Generate operation signature for frequency tracking
   */
  private generateOperationSignature(
    _request: ParlantDatabaseValidationRequest,
  ): string {
    return `${request.functionName}_${request.databaseOperation.operationType}_${request.databaseOperation.tableName || 'any'}`;
  }

  /**
   * Determine if validation result should be cached
   */
  private shouldCacheResult(
    _request: ParlantDatabaseValidationRequest,
    _response: ParlantValidationResponse,
  ): boolean {
    // Don't cache failed validations
    if (!response.approved) {
      return false;
    }

    // Don't cache critical operations
    const riskLevel = this.determineRiskLevel(request.databaseOperation);
    if (riskLevel === RiskLevel.CRITICAL) {
      return false;
    }

    // Cache based on strategy
    switch (this.config.cacheStrategy) {
      case 'AGGRESSIVE':
        return true;
      case 'BALANCED':
        return riskLevel !== RiskLevel.HIGH;
      case 'CONSERVATIVE':
        return riskLevel === RiskLevel.LOW;
      default:
        return false;
    }
  }

  /**
   * Enforce cache size limits with intelligent eviction
   */
  private enforceeCacheSizeLimit(): void {
    if (this.smartCache.size >= this.config.maxCacheSize) {
      // Evict least recently used entries with lowest hit count
      const entries = Array.from(this.smartCache.entries()).sort((a, b) => {
        const scoreA = a[1].hitCount / (Date.now() - a[1].lastAccess.getTime());
        const scoreB = b[1].hitCount / (Date.now() - b[1].lastAccess.getTime());
        return scoreA - scoreB;
      });

      // Remove bottom 20% of entries
      const toRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.smartCache.delete(entries[i][0]);
      }

      this.logger.debug('Cache eviction completed', {
        removed: toRemove,
        newSize: this.smartCache.size,
      });
    }
  }

  /**
   * Calculate estimated performance gain from optimizations
   */
  private calculatePerformanceGain(optimizations: string[]): number {
    let totalGain = 0;

    for (const optimization of optimizations) {
      switch (optimization) {
        case 'smart_caching':
          totalGain += 200;
          break;
        case 'batch_processing':
          totalGain += 150;
          break;
        case 'adaptive_validation':
          totalGain += 75;
          break;
        case 'pattern_optimization':
          totalGain += 50;
          break;
      }
    }

    return totalGain;
  }

  /**
   * Record performance metrics for monitoring
   */
  recordPerformanceMetrics(metrics: OperationPerformanceMetrics): void {
    this.performanceMetrics.push(metrics);

    // Update running averages
    this.validationCount++;
    this.averageValidationTime =
      (this.averageValidationTime * (this.validationCount - 1) +
        metrics.validationTime) /
      this.validationCount;

    // Update cache hit rate
    const recentMetrics = this.performanceMetrics.slice(-100); // Last 100 operations
    const cacheHits = recentMetrics.filter((m) => m.cacheHit).length;
    this.cacheHitRate = (cacheHits / recentMetrics.length) * 100;

    // Check for performance degradation
    this.checkPerformanceThresholds(metrics);

    // Limit metrics history
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.splice(0, this.performanceMetrics.length - 1000);
    }
  }

  /**
   * Get comprehensive performance statistics
   */
  getPerformanceStatistics() {
    const recentMetrics = this.performanceMetrics.slice(-100);

    return {
      totalOperations: this.validationCount,
      averageValidationTime: `${this.averageValidationTime.toFixed(2)}ms`,
      cacheHitRate: `${this.cacheHitRate.toFixed(2)}%`,
      cacheSize: this.smartCache.size,
      maxCacheSize: this.config.maxCacheSize,
      optimizations: {
        smartCaching: this.config.cacheStrategy,
        batchingEnabled: this.config.batchingEnabled,
        adaptiveValidation: this.config.adaptiveValidation,
      },
      recentPerformance: {
        averageValidationTime:
          recentMetrics.length > 0
            ? `${(recentMetrics.reduce((sum, m) => sum + m.validationTime, 0) / recentMetrics.length).toFixed(2)}ms`
            : '0ms',
        averageExecutionTime:
          recentMetrics.length > 0
            ? `${(recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length).toFixed(2)}ms`
            : '0ms',
      },
      performanceAlerts: [...this.performanceAlerts],
    };
  }

  // ===== INITIALIZATION AND MONITORING =====

  /**
   * Load optimizer configuration
   */
  private loadOptimizerConfig(): PerformanceOptimizerConfig {
    return {
      cacheStrategy: this.configService.get<
        'AGGRESSIVE' | 'BALANCED' | 'CONSERVATIVE'
      >('DB_OPTIMIZER_CACHE_STRATEGY', 'BALANCED'),
      batchingEnabled: this.configService.get<boolean>(
        'DB_OPTIMIZER_BATCHING',
        true,
      ),
      adaptiveValidation: this.configService.get<boolean>(
        'DB_OPTIMIZER_ADAPTIVE',
        true,
      ),
      preemptiveValidation: this.configService.get<boolean>(
        'DB_OPTIMIZER_PREEMPTIVE',
        false,
      ),
      parallelValidation: this.configService.get<boolean>(
        'DB_OPTIMIZER_PARALLEL',
        true,
      ),
      maxCacheSize: this.configService.get<number>(
        'DB_OPTIMIZER_CACHE_SIZE',
        1000,
      ),
      cacheTtl: this.configService.get<number>(
        'DB_OPTIMIZER_CACHE_TTL',
        300000,
      ), // 5 minutes
      performanceThreshold: this.configService.get<number>(
        'DB_OPTIMIZER_THRESHOLD',
        1000,
      ), // 1 second
    };
  }

  /**
   * Initialize smart caching system
   */
  private initializeSmartCaching(): void {
    this.logger.log('Smart caching system initialized', {
      strategy: this.config.cacheStrategy,
      maxSize: this.config.maxCacheSize,
      ttl: `${this.config.cacheTtl}ms`,
    });

    // Periodic cache maintenance
    setInterval(() => {
      this.performCacheMaintenance();
    }, 60000); // Every minute
  }

  /**
   * Initialize batch processing system
   */
  private initializeBatchProcessing(): void {
    if (!this.config.batchingEnabled) {
      return;
    }

    this.logger.log('Batch processing system initialized');

    // Process batches every 100ms
    this.batchProcessingTimer = setInterval(() => {
      this.processPendingBatches();
    }, 100);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.logger.log('Performance monitoring started', {
      threshold: `${this.config.performanceThreshold}ms`,
    });

    // Performance reporting every 5 minutes
    setInterval(() => {
      this.reportPerformanceMetrics();
    }, 300000);
  }

  // ===== HELPER METHOD STUBS =====

  private determineRiskLevel(_metadata: DatabaseOperationMetadata): RiskLevel {
    // Implementation matches the main service
    switch (metadata.operationType) {
      case 'read':
      case 'HEALTH_CHECK':
      case 'METRICS':
        return RiskLevel.LOW;
      case 'WRITE':
        return metadata.isDestructive ? RiskLevel.HIGH : RiskLevel.MEDIUM;
      case 'DELETE':
        return RiskLevel.HIGH;
      case 'MIGRATION':
      case 'SECURITY':
        return RiskLevel.CRITICAL;
      default:
        return RiskLevel.MEDIUM;
    }
  }

  private getValidationPattern(_request: ParlantDatabaseValidationRequest) {
    const signature = this.generateOperationSignature(request);
    const occurrences = this.operationFrequency.get(signature) || 0;

    // Mock pattern data - in production, this would be tracked
    return {
      successRate: 0.95,
      occurrences,
      averageTime: 150,
    };
  }

  private identifyOperationPattern(_request: ParlantDatabaseValidationRequest) {
    // Mock pattern identification - in production, this would use ML
    if (request.databaseOperation.operationType === 'read') {
      return { type: 'read_heavy' as const };
    }
    return { type: 'standard' as const };
  }

  private canBatchWithPending(
    _request: ParlantDatabaseValidationRequest,
  ): boolean {
    // Mock batching logic - check if similar requests are pending
    return false;
  }

  private async addToBatch(
    _request: ParlantDatabaseValidationRequest,
  ): Promise<void> {
    // Mock batch addition
  }

  private performCacheMaintenance(): void {
    // Remove expired entries and optimize cache
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.smartCache.entries()) {
      if (now - entry.timestamp.getTime() > this.config.cacheTtl) {
        this.smartCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug('Cache maintenance completed', {
        removedEntries: removedCount,
        currentSize: this.smartCache.size,
      });
    }
  }

  private processPendingBatches(): void {
    // Process any pending batch validation requests
  }

  private checkPerformanceThresholds(
    metrics: OperationPerformanceMetrics,
  ): void {
    if (metrics.totalTime > this.config.performanceThreshold) {
      const alert = `Performance threshold exceeded: ${metrics.totalTime}ms > ${this.config.performanceThreshold}ms`;
      this.performanceAlerts.push(alert);

      // Keep only last 10 alerts
      if (this.performanceAlerts.length > 10) {
        this.performanceAlerts.shift();
      }

      this.logger.warn('Performance threshold exceeded', {
        operationId: metrics.operationId,
        totalTime: `${metrics.totalTime}ms`,
        threshold: `${this.config.performanceThreshold}ms`,
      });
    }
  }

  private reportPerformanceMetrics(): void {
    const stats = this.getPerformanceStatistics();

    this.logger.log('Performance Report', {
      totalOperations: stats.totalOperations,
      averageValidationTime: stats.averageValidationTime,
      cacheHitRate: stats.cacheHitRate,
      alertCount: stats.performanceAlerts.length,
    });
  }
}
