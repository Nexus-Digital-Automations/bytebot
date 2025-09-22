/**
 * PARLANT Cache Performance Analyzer
 *
 * Advanced cache performance analysis and optimization module for PARLANT Phase 1
 * database function wrapping. Provides intelligent cache layer analysis, TTL optimization,
 * and multi-level cache coordination for achieving 85%+ cache hit rates.
 *
 * Features:
 * - Multi-level cache performance analysis (L1/L2/L3)
 * - Intelligent TTL optimization based on data patterns
 * - Cache miss analysis and optimization recommendations
 * - Cache warming and preloading strategies
 * - Memory usage optimization and monitoring
 * - Cache invalidation pattern analysis
 * - Real-time cache performance metrics
 *
 * Performance Targets:
 * - L1 Cache: >90% hit rate, <5ms access time
 * - L2 Cache: >85% hit rate, <15ms access time
 * - L3 Cache: >80% hit rate, <50ms access time
 * - Overall Cache Hit Rate: >85% across all levels
 *
 * @fileoverview Cache performance analysis and optimization
 * @version 1.0.0
 * @author Performance Monitoring Agent
 */

import { EventEmitter } from "events";
import { performance } from "perf_hooks";

/**
 * Cache performance analysis configuration
 */
export interface CacheAnalyzerConfig {
  /** Analysis interval in milliseconds */
  analysisInterval: number;
  /** Minimum sample size for analysis */
  minSampleSize: number;
  /** Cache performance targets */
  targets: CachePerformanceTargets;
  /** Enable cache warming recommendations */
  enableCacheWarming: boolean;
  /** Enable TTL optimization */
  enableTTLOptimization: boolean;
  /** Enable memory optimization */
  enableMemoryOptimization: boolean;
  /** Cache analysis window in milliseconds */
  analysisWindow: number;
}

/**
 * Cache performance targets by level
 */
export interface CachePerformanceTargets {
  L1: {
    hitRate: number;
    maxAccessTime: number;
    maxMemoryUsage: number;
  };
  L2: {
    hitRate: number;
    maxAccessTime: number;
    maxMemoryUsage: number;
  };
  L3: {
    hitRate: number;
    maxAccessTime: number;
    maxMemoryUsage: number;
  };
  overall: {
    hitRate: number;
    maxTotalMemory: number;
  };
}

/**
 * Cache operation data
 */
export interface CacheOperation {
  /** Operation identifier */
  id: string;
  /** Cache level */
  level: "L1" | "L2" | "L3";
  /** Operation type */
  operation: "GET" | "SET" | "DELETE" | "INVALIDATE" | "PROMOTE";
  /** Cache key */
  key: string;
  /** Operation timestamp */
  timestamp: Date;
  /** Operation duration in milliseconds */
  duration: number;
  /** Success status */
  success: boolean;
  /** Hit status for GET operations */
  hit?: boolean;
  /** Data size in bytes */
  dataSize: number;
  /** TTL value for SET operations */
  ttl?: number;
  /** Function name associated with cache operation */
  functionName?: string;
  /** User context */
  userId?: string;
  /** Session identifier */
  sessionId?: string;
  /** Additional operation context */
  context: Record<string, unknown>;
}

/**
 * Cache key analysis data
 */
export interface CacheKeyAnalysis {
  /** Cache key pattern */
  keyPattern: string;
  /** Total operations for this pattern */
  totalOperations: number;
  /** GET operations count */
  getOperations: number;
  /** SET operations count */
  setOperations: number;
  /** Cache hits */
  hits: number;
  /** Cache misses */
  misses: number;
  /** Hit rate */
  hitRate: number;
  /** Average access time */
  avgAccessTime: number;
  /** Average data size */
  avgDataSize: number;
  /** Average TTL */
  avgTTL: number;
  /** Most frequent functions using this pattern */
  topFunctions: string[];
  /** Access frequency per hour */
  accessFrequency: number;
  /** Last accessed timestamp */
  lastAccessed: Date;
  /** Data volatility score (0-1) */
  volatility: number;
}

/**
 * Cache level performance analysis
 */
export interface CacheLevelAnalysis {
  /** Cache level */
  level: "L1" | "L2" | "L3";
  /** Analysis period */
  period: { start: Date; end: Date };
  /** Total operations */
  totalOperations: number;
  /** Hit rate */
  hitRate: number;
  /** Miss rate */
  missRate: number;
  /** Average access time */
  avgAccessTime: number;
  /** P95 access time */
  p95AccessTime: number;
  /** P99 access time */
  p99AccessTime: number;
  /** Total memory usage */
  memoryUsage: number;
  /** Memory efficiency (hit rate / memory usage) */
  memoryEfficiency: number;
  /** Key patterns analysis */
  keyPatterns: CacheKeyAnalysis[];
  /** Performance compared to targets */
  performanceScore: number;
  /** Optimization opportunities */
  optimizations: CacheOptimization[];
}

/**
 * Cache optimization recommendation
 */
export interface CacheOptimization {
  /** Optimization identifier */
  id: string;
  /** Optimization type */
  type:
    | "TTL_ADJUSTMENT"
    | "CACHE_WARMING"
    | "KEY_PATTERN_OPTIMIZATION"
    | "MEMORY_OPTIMIZATION"
    | "PROMOTION_STRATEGY"
    | "INVALIDATION_STRATEGY";
  /** Priority level */
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  /** Cache level affected */
  level: "L1" | "L2" | "L3" | "ALL";
  /** Optimization description */
  description: string;
  /** Expected impact */
  expectedImpact: {
    hitRateImprovement: number;
    latencyReduction: number;
    memoryOptimization: number;
  };
  /** Implementation complexity */
  complexity: "LOW" | "MEDIUM" | "HIGH";
  /** Specific key patterns affected */
  affectedPatterns: string[];
  /** Implementation steps */
  implementationSteps: string[];
  /** Monitoring metrics */
  monitoringMetrics: string[];
  /** Optimization timestamp */
  timestamp: Date;
  /** Estimated ROI */
  estimatedROI: string;
}

/**
 * Cache warming strategy
 */
export interface CacheWarmingStrategy {
  /** Strategy identifier */
  id: string;
  /** Strategy name */
  name: string;
  /** Target cache level */
  level: "L1" | "L2" | "L3";
  /** Key patterns to warm */
  keyPatterns: string[];
  /** Warming schedule */
  schedule: {
    /** Frequency in minutes */
    frequency: number;
    /** Warming batch size */
    batchSize: number;
    /** Maximum warming time */
    maxDuration: number;
  };
  /** Warming triggers */
  triggers: ("STARTUP" | "LOW_HIT_RATE" | "SCHEDULED" | "MANUAL")[];
  /** Priority level */
  priority: number;
  /** Expected hit rate improvement */
  expectedImprovement: number;
  /** Implementation status */
  status: "ACTIVE" | "INACTIVE" | "TESTING";
}

/**
 * TTL optimization recommendation
 */
export interface TTLOptimization {
  /** Key pattern */
  keyPattern: string;
  /** Current TTL */
  currentTTL: number;
  /** Recommended TTL */
  recommendedTTL: number;
  /** Optimization reasoning */
  reasoning: string;
  /** Expected impact */
  expectedImpact: {
    hitRateChange: number;
    memoryChange: number;
    freshnessScore: number;
  };
  /** Data volatility analysis */
  volatilityAnalysis: {
    changeFrequency: number;
    predictablePattern: boolean;
    optimalRefreshWindow: number;
  };
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Cache invalidation pattern analysis
 */
export interface InvalidationPattern {
  /** Pattern identifier */
  id: string;
  /** Invalidation trigger */
  trigger: string;
  /** Affected key patterns */
  affectedPatterns: string[];
  /** Invalidation frequency */
  frequency: number;
  /** Impact on hit rate */
  hitRateImpact: number;
  /** Optimization recommendation */
  optimization?: string;
}

/**
 * Cache memory analysis
 */
export interface CacheMemoryAnalysis {
  /** Cache level */
  level: "L1" | "L2" | "L3";
  /** Total allocated memory */
  totalMemory: number;
  /** Used memory */
  usedMemory: number;
  /** Memory utilization percentage */
  utilization: number;
  /** Average entry size */
  avgEntrySize: number;
  /** Memory fragmentation score */
  fragmentation: number;
  /** Memory efficiency score */
  efficiency: number;
  /** Large entries analysis */
  largeEntries: {
    count: number;
    totalSize: number;
    patterns: string[];
  };
  /** Memory optimization recommendations */
  optimizations: string[];
}

/**
 * Cache Analytics Dashboard Data
 */
export interface CacheAnalyticsDashboard {
  /** Dashboard timestamp */
  timestamp: Date;
  /** Overall cache performance */
  overall: {
    hitRate: number;
    avgLatency: number;
    totalMemory: number;
    efficiency: number;
    score: number;
  };
  /** Per-level analysis */
  levels: Record<"L1" | "L2" | "L3", CacheLevelAnalysis>;
  /** Top performing patterns */
  topPatterns: CacheKeyAnalysis[];
  /** Optimization opportunities */
  optimizations: CacheOptimization[];
  /** Trending data */
  trends: {
    hitRateTrend: number[];
    latencyTrend: number[];
    memoryTrend: number[];
    timestamps: Date[];
  };
  /** Alerts */
  alerts: {
    critical: string[];
    warnings: string[];
    info: string[];
  };
}

/**
 * Cache Performance Analyzer implementation
 */
export class CacheAnalyzer extends EventEmitter {
  private config: CacheAnalyzerConfig;
  private operations: CacheOperation[] = [];
  private keyAnalyses: Map<string, CacheKeyAnalysis> = new Map();
  private levelAnalyses: Map<string, CacheLevelAnalysis> = new Map();
  private optimizations: CacheOptimization[] = [];
  private warmingStrategies: CacheWarmingStrategy[] = [];
  private ttlOptimizations: TTLOptimization[] = [];
  private invalidationPatterns: InvalidationPattern[] = [];

  private analysisInterval?: NodeJS.Timeout;
  private isAnalyzing = false;
  private readonly logger: Console;

  constructor(config: Partial<CacheAnalyzerConfig> = {}) {
    super();
    this.logger = console;
    this.config = this.mergeConfig(config);
  }

  /**
   * Start cache performance analysis
   */
  async startAnalysis(): Promise<void> {
    if (this.isAnalyzing) {
      this.logger.warn("Cache analysis is already running");
      return;
    }

    this.logger.log("Starting PARLANT Cache Performance Analysis");

    this.analysisInterval = setInterval(
      () => this.performAnalysis(),
      this.config.analysisInterval,
    );

    this.isAnalyzing = true;
    this.emit("analysis.started");
    this.logger.log("Cache analysis started successfully");
  }

  /**
   * Stop cache performance analysis
   */
  async stopAnalysis(): Promise<void> {
    if (!this.isAnalyzing) {
      this.logger.warn("Cache analysis is not running");
      return;
    }

    this.logger.log("Stopping PARLANT Cache Performance Analysis");

    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = undefined;
    }

    this.isAnalyzing = false;
    this.emit("analysis.stopped");
    this.logger.log("Cache analysis stopped successfully");
  }

  /**
   * Record cache operation
   */
  recordOperation(operation: CacheOperation): void {
    this.operations.push(operation);

    // Update key analysis
    this.updateKeyAnalysis(operation);

    // Emit event for real-time monitoring
    this.emit("operation.recorded", operation);

    // Check for immediate optimization opportunities
    if (this.config.enableTTLOptimization) {
      this.checkTTLOptimization(operation);
    }
  }

  /**
   * Get current cache analytics dashboard
   */
  getCacheAnalytics(): CacheAnalyticsDashboard {
    const cutoffTime = new Date(Date.now() - this.config.analysisWindow);
    const recentOps = this.operations.filter(
      (op) => op.timestamp >= cutoffTime,
    );

    // Calculate overall performance
    const overall = this.calculateOverallPerformance(recentOps);

    // Get level analyses
    const levels = this.calculateLevelAnalyses(recentOps);

    // Get top patterns
    const topPatterns = Array.from(this.keyAnalyses.values())
      .sort((a, b) => b.accessFrequency - a.accessFrequency)
      .slice(0, 10);

    // Get optimization opportunities
    const optimizations = this.getOptimizations();

    // Calculate trends
    const trends = this.calculateTrends();

    // Generate alerts
    const alerts = this.generateAlerts(overall, levels);

    return {
      timestamp: new Date(),
      overall,
      levels,
      topPatterns,
      optimizations,
      trends,
      alerts,
    };
  }

  /**
   * Get cache optimization recommendations
   */
  getOptimizations(): CacheOptimization[] {
    return this.optimizations.slice().sort((a, b) => {
      const priorityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Get TTL optimization recommendations
   */
  getTTLOptimizations(): TTLOptimization[] {
    return this.ttlOptimizations
      .slice()
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get cache warming strategies
   */
  getWarmingStrategies(): CacheWarmingStrategy[] {
    return this.warmingStrategies
      .filter((strategy) => strategy.status === "ACTIVE")
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Analyze cache key patterns
   */
  analyzeKeyPatterns(timeWindow: number = 60 * 60 * 1000): CacheKeyAnalysis[] {
    const cutoffTime = new Date(Date.now() - timeWindow);
    const recentOps = this.operations.filter(
      (op) => op.timestamp >= cutoffTime,
    );

    const patternMap = new Map<string, CacheKeyAnalysis>();

    recentOps.forEach((op) => {
      const pattern = this.extractKeyPattern(op.key);

      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, {
          keyPattern: pattern,
          totalOperations: 0,
          getOperations: 0,
          setOperations: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          avgAccessTime: 0,
          avgDataSize: 0,
          avgTTL: 0,
          topFunctions: [],
          accessFrequency: 0,
          lastAccessed: new Date(0),
          volatility: 0,
        });
      }

      const analysis = patternMap.get(pattern)!;
      analysis.totalOperations++;

      if (op.operation === "GET") {
        analysis.getOperations++;
        if (op.hit) {
          analysis.hits++;
        } else {
          analysis.misses++;
        }
      } else if (op.operation === "SET") {
        analysis.setOperations++;
      }

      // Update averages
      analysis.avgAccessTime =
        (analysis.avgAccessTime * (analysis.totalOperations - 1) +
          op.duration) /
        analysis.totalOperations;
      analysis.avgDataSize =
        (analysis.avgDataSize * (analysis.totalOperations - 1) + op.dataSize) /
        analysis.totalOperations;

      if (op.ttl) {
        analysis.avgTTL =
          (analysis.avgTTL * (analysis.totalOperations - 1) + op.ttl) /
          analysis.totalOperations;
      }

      if (op.timestamp > analysis.lastAccessed) {
        analysis.lastAccessed = op.timestamp;
      }
    });

    // Calculate derived metrics
    patternMap.forEach((analysis) => {
      analysis.hitRate =
        analysis.getOperations > 0 ? analysis.hits / analysis.getOperations : 0;
      analysis.accessFrequency =
        analysis.totalOperations / (timeWindow / (60 * 60 * 1000)); // per hour
      analysis.volatility = this.calculateVolatility(
        analysis.keyPattern,
        recentOps,
      );
    });

    return Array.from(patternMap.values()).sort(
      (a, b) => b.accessFrequency - a.accessFrequency,
    );
  }

  /**
   * Generate cache warming recommendations
   */
  generateWarmingRecommendations(): CacheWarmingStrategy[] {
    const keyAnalyses = this.analyzeKeyPatterns();
    const recommendations: CacheWarmingStrategy[] = [];

    keyAnalyses.forEach((analysis) => {
      // Recommend warming for high-frequency, low-hit-rate patterns
      if (analysis.accessFrequency > 10 && analysis.hitRate < 0.7) {
        recommendations.push({
          id: `warming-${Date.now()}-${analysis.keyPattern.replace(/[^a-zA-Z0-9]/g, "")}`,
          name: `Warm ${analysis.keyPattern} pattern`,
          level: this.selectOptimalCacheLevel(analysis),
          keyPatterns: [analysis.keyPattern],
          schedule: {
            frequency: Math.max(5, Math.round(60 / analysis.accessFrequency)), // Minutes
            batchSize: Math.min(
              100,
              Math.max(10, analysis.totalOperations / 10),
            ),
            maxDuration: 300000, // 5 minutes
          },
          triggers: ["STARTUP", "LOW_HIT_RATE", "SCHEDULED"],
          priority: analysis.accessFrequency * (1 - analysis.hitRate),
          expectedImprovement: Math.min(0.3, (0.9 - analysis.hitRate) * 0.8),
          status: "TESTING",
        });
      }
    });

    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 5); // Top 5 recommendations
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private mergeConfig(
    userConfig: Partial<CacheAnalyzerConfig>,
  ): CacheAnalyzerConfig {
    const defaultConfig: CacheAnalyzerConfig = {
      analysisInterval: 30000, // 30 seconds
      minSampleSize: 100,
      targets: {
        L1: { hitRate: 0.9, maxAccessTime: 5, maxMemoryUsage: 512 },
        L2: { hitRate: 0.85, maxAccessTime: 15, maxMemoryUsage: 2048 },
        L3: { hitRate: 0.8, maxAccessTime: 50, maxMemoryUsage: 8192 },
        overall: { hitRate: 0.85, maxTotalMemory: 10752 },
      },
      enableCacheWarming: true,
      enableTTLOptimization: true,
      enableMemoryOptimization: true,
      analysisWindow: 60 * 60 * 1000, // 1 hour
    };

    return { ...defaultConfig, ...userConfig };
  }

  private async performAnalysis(): Promise<void> {
    try {
      this.logger.log("Performing cache performance analysis");

      // Analyze key patterns
      const keyAnalyses = this.analyzeKeyPatterns();

      // Update stored analyses
      keyAnalyses.forEach((analysis) => {
        this.keyAnalyses.set(analysis.keyPattern, analysis);
      });

      // Generate optimizations
      if (this.config.enableTTLOptimization) {
        this.generateTTLOptimizations();
      }

      if (this.config.enableCacheWarming) {
        this.updateWarmingStrategies();
      }

      if (this.config.enableMemoryOptimization) {
        this.generateMemoryOptimizations();
      }

      // Analyze invalidation patterns
      this.analyzeInvalidationPatterns();

      // Generate level-specific optimizations
      this.generateLevelOptimizations();

      this.emit("analysis.completed");
      this.logger.log("Cache performance analysis completed");
    } catch (error) {
      this.logger.error("Error during cache analysis:", error);
      this.emit("analysis.error", error);
    }
  }

  private updateKeyAnalysis(operation: CacheOperation): void {
    const pattern = this.extractKeyPattern(operation.key);

    if (!this.keyAnalyses.has(pattern)) {
      this.keyAnalyses.set(pattern, {
        keyPattern: pattern,
        totalOperations: 0,
        getOperations: 0,
        setOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        avgAccessTime: 0,
        avgDataSize: 0,
        avgTTL: 0,
        topFunctions: [],
        accessFrequency: 0,
        lastAccessed: new Date(0),
        volatility: 0,
      });
    }

    const analysis = this.keyAnalyses.get(pattern)!;
    analysis.totalOperations++;
    analysis.lastAccessed = operation.timestamp;

    if (operation.operation === "GET") {
      analysis.getOperations++;
      if (operation.hit) {
        analysis.hits++;
      } else {
        analysis.misses++;
      }
    } else if (operation.operation === "SET") {
      analysis.setOperations++;
    }

    // Update running averages
    analysis.avgAccessTime =
      (analysis.avgAccessTime * (analysis.totalOperations - 1) +
        operation.duration) /
      analysis.totalOperations;
    analysis.avgDataSize =
      (analysis.avgDataSize * (analysis.totalOperations - 1) +
        operation.dataSize) /
      analysis.totalOperations;

    if (operation.ttl) {
      analysis.avgTTL =
        (analysis.avgTTL * (analysis.totalOperations - 1) + operation.ttl) /
        analysis.totalOperations;
    }

    // Calculate hit rate
    analysis.hitRate =
      analysis.getOperations > 0 ? analysis.hits / analysis.getOperations : 0;
  }

  private extractKeyPattern(key: string): string {
    // Extract pattern from cache key (replace specific IDs with wildcards)
    return key
      .replace(/\b\d+\b/g, "*") // Replace numbers with *
      .replace(
        /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/g,
        "*",
      ) // Replace UUIDs
      .replace(/\b[a-zA-Z0-9]{20,}\b/g, "*") // Replace long strings (likely IDs)
      .toLowerCase();
  }

  private calculateVolatility(
    pattern: string,
    operations: CacheOperation[],
  ): number {
    const patternOps = operations.filter(
      (op) => this.extractKeyPattern(op.key) === pattern,
    );
    const setOps = patternOps.filter((op) => op.operation === "SET");
    const invalidateOps = patternOps.filter(
      (op) => op.operation === "INVALIDATE",
    );

    if (setOps.length < 2) return 0;

    // Calculate volatility based on SET frequency
    const timeSpan = Math.max(1, Date.now() - setOps[0].timestamp.getTime());
    const setFrequency = setOps.length / (timeSpan / (60 * 60 * 1000)); // per hour
    const invalidateFrequency =
      invalidateOps.length / (timeSpan / (60 * 60 * 1000));

    // Volatility score: higher frequency = higher volatility
    return Math.min(1, (setFrequency + invalidateFrequency * 2) / 10);
  }

  private checkTTLOptimization(operation: CacheOperation): void {
    if (operation.operation !== "SET" || !operation.ttl) return;

    const pattern = this.extractKeyPattern(operation.key);
    const analysis = this.keyAnalyses.get(pattern);

    if (analysis && analysis.totalOperations > 50) {
      // Check if TTL optimization is needed
      const currentTTL = operation.ttl;
      const optimalTTL = this.calculateOptimalTTL(analysis);

      if (Math.abs(currentTTL - optimalTTL) > currentTTL * 0.2) {
        // 20% difference threshold
        const existing = this.ttlOptimizations.find(
          (opt) => opt.keyPattern === pattern,
        );

        if (!existing) {
          this.ttlOptimizations.push({
            keyPattern: pattern,
            currentTTL,
            recommendedTTL: optimalTTL,
            reasoning: this.generateTTLReasoning(
              analysis,
              currentTTL,
              optimalTTL,
            ),
            expectedImpact: {
              hitRateChange: this.estimateHitRateChange(
                analysis,
                currentTTL,
                optimalTTL,
              ),
              memoryChange: this.estimateMemoryChange(
                analysis,
                currentTTL,
                optimalTTL,
              ),
              freshnessScore: this.calculateFreshnessScore(
                analysis,
                optimalTTL,
              ),
            },
            volatilityAnalysis: {
              changeFrequency: analysis.volatility * 10, // Convert to changes per hour
              predictablePattern: analysis.volatility < 0.3,
              optimalRefreshWindow: optimalTTL * 0.8,
            },
            confidence: this.calculateTTLConfidence(analysis),
          });
        }
      }
    }
  }

  private calculateOptimalTTL(analysis: CacheKeyAnalysis): number {
    // Calculate optimal TTL based on access patterns and volatility
    const baseTime = 5 * 60 * 1000; // 5 minutes base

    // Adjust based on access frequency (higher frequency = longer TTL)
    const frequencyMultiplier = Math.min(
      3,
      Math.max(0.5, analysis.accessFrequency / 10),
    );

    // Adjust based on volatility (higher volatility = shorter TTL)
    const volatilityMultiplier = Math.max(0.1, 1 - analysis.volatility);

    // Adjust based on hit rate (lower hit rate might need longer TTL)
    const hitRateMultiplier = Math.max(0.5, analysis.hitRate);

    return Math.round(
      baseTime * frequencyMultiplier * volatilityMultiplier * hitRateMultiplier,
    );
  }

  private generateTTLReasoning(
    analysis: CacheKeyAnalysis,
    currentTTL: number,
    optimalTTL: number,
  ): string {
    const reasons: string[] = [];

    if (optimalTTL > currentTTL) {
      reasons.push(
        `Increase TTL to ${optimalTTL}ms due to high access frequency (${analysis.accessFrequency.toFixed(1)}/hour)`,
      );
      if (analysis.volatility < 0.3) {
        reasons.push("Low data volatility supports longer TTL");
      }
    } else {
      reasons.push(
        `Decrease TTL to ${optimalTTL}ms due to high data volatility (${(analysis.volatility * 100).toFixed(1)}%)`,
      );
      if (analysis.hitRate < 0.7) {
        reasons.push("Low hit rate suggests data becomes stale quickly");
      }
    }

    return reasons.join(". ");
  }

  private estimateHitRateChange(
    analysis: CacheKeyAnalysis,
    currentTTL: number,
    optimalTTL: number,
  ): number {
    const ttlRatio = optimalTTL / currentTTL;

    if (ttlRatio > 1) {
      // Longer TTL should improve hit rate
      return Math.min(0.2, (ttlRatio - 1) * 0.1 * (1 - analysis.hitRate));
    } else {
      // Shorter TTL might reduce hit rate but improve freshness
      return Math.max(-0.1, (ttlRatio - 1) * 0.05);
    }
  }

  private estimateMemoryChange(
    analysis: CacheKeyAnalysis,
    currentTTL: number,
    optimalTTL: number,
  ): number {
    const ttlRatio = optimalTTL / currentTTL;
    const avgEntrySize = analysis.avgDataSize;
    const frequency = analysis.accessFrequency;

    // Estimate memory change based on TTL change and access patterns
    return ((ttlRatio - 1) * avgEntrySize * frequency) / 1000; // KB change estimate
  }

  private calculateFreshnessScore(
    analysis: CacheKeyAnalysis,
    ttl: number,
  ): number {
    // Higher volatility requires shorter TTL for freshness
    const idealTTL = (1 - analysis.volatility) * 60 * 60 * 1000; // 1 hour max for low volatility
    const freshnessScore = Math.max(0, 1 - Math.abs(ttl - idealTTL) / idealTTL);
    return freshnessScore;
  }

  private calculateTTLConfidence(analysis: CacheKeyAnalysis): number {
    let confidence = 0.5; // Base confidence

    // Higher sample size increases confidence
    if (analysis.totalOperations > 100) confidence += 0.2;
    if (analysis.totalOperations > 500) confidence += 0.1;

    // Consistent patterns increase confidence
    if (analysis.volatility < 0.2) confidence += 0.2;
    if (analysis.volatility < 0.1) confidence += 0.1;

    // Recent activity increases confidence
    const hoursSinceLastAccess =
      (Date.now() - analysis.lastAccessed.getTime()) / (60 * 60 * 1000);
    if (hoursSinceLastAccess < 1) confidence += 0.1;

    return Math.min(1, confidence);
  }

  private generateTTLOptimizations(): void {
    // Clear old optimizations
    this.ttlOptimizations = [];

    // Generate new TTL optimizations for active patterns
    this.keyAnalyses.forEach((analysis) => {
      if (analysis.totalOperations > this.config.minSampleSize) {
        const optimalTTL = this.calculateOptimalTTL(analysis);
        const currentTTL = analysis.avgTTL;

        if (
          currentTTL > 0 &&
          Math.abs(currentTTL - optimalTTL) > currentTTL * 0.2
        ) {
          this.ttlOptimizations.push({
            keyPattern: analysis.keyPattern,
            currentTTL,
            recommendedTTL: optimalTTL,
            reasoning: this.generateTTLReasoning(
              analysis,
              currentTTL,
              optimalTTL,
            ),
            expectedImpact: {
              hitRateChange: this.estimateHitRateChange(
                analysis,
                currentTTL,
                optimalTTL,
              ),
              memoryChange: this.estimateMemoryChange(
                analysis,
                currentTTL,
                optimalTTL,
              ),
              freshnessScore: this.calculateFreshnessScore(
                analysis,
                optimalTTL,
              ),
            },
            volatilityAnalysis: {
              changeFrequency: analysis.volatility * 10,
              predictablePattern: analysis.volatility < 0.3,
              optimalRefreshWindow: optimalTTL * 0.8,
            },
            confidence: this.calculateTTLConfidence(analysis),
          });
        }
      }
    });
  }

  private updateWarmingStrategies(): void {
    const newStrategies = this.generateWarmingRecommendations();

    // Update existing strategies and add new ones
    newStrategies.forEach((newStrategy) => {
      const existing = this.warmingStrategies.find((s) =>
        s.keyPatterns.some((pattern) =>
          newStrategy.keyPatterns.includes(pattern),
        ),
      );

      if (existing) {
        // Update existing strategy
        existing.priority = newStrategy.priority;
        existing.expectedImprovement = newStrategy.expectedImprovement;
        existing.schedule = newStrategy.schedule;
      } else {
        // Add new strategy
        this.warmingStrategies.push(newStrategy);
      }
    });

    // Deactivate strategies for patterns that are no longer relevant
    this.warmingStrategies.forEach((strategy) => {
      const pattern = strategy.keyPatterns[0];
      const analysis = this.keyAnalyses.get(pattern);

      if (
        !analysis ||
        analysis.hitRate > 0.85 ||
        analysis.accessFrequency < 1
      ) {
        strategy.status = "INACTIVE";
      }
    });
  }

  private generateMemoryOptimizations(): void {
    // Analyze memory usage patterns and generate optimizations
    const memoryOptimizations: CacheOptimization[] = [];

    this.keyAnalyses.forEach((analysis) => {
      // Large entry optimization
      if (analysis.avgDataSize > 100000) {
        // > 100KB entries
        memoryOptimizations.push({
          id: `mem-opt-large-${Date.now()}-${analysis.keyPattern.replace(/[^a-zA-Z0-9]/g, "")}`,
          type: "MEMORY_OPTIMIZATION",
          priority: "HIGH",
          level: "ALL",
          description: `Optimize storage for large entries in pattern: ${analysis.keyPattern}`,
          expectedImpact: {
            hitRateImprovement: 0,
            latencyReduction: 0.1,
            memoryOptimization: 0.3,
          },
          complexity: "MEDIUM",
          affectedPatterns: [analysis.keyPattern],
          implementationSteps: [
            "Implement compression for large cache entries",
            "Consider splitting large entries into smaller chunks",
            "Review serialization format efficiency",
            "Monitor memory usage after optimization",
          ],
          monitoringMetrics: [
            "memory_usage",
            "entry_size_distribution",
            "compression_ratio",
          ],
          timestamp: new Date(),
          estimatedROI: "25-40% memory reduction",
        });
      }

      // Low hit rate, high memory usage optimization
      if (analysis.hitRate < 0.5 && analysis.avgDataSize > 10000) {
        memoryOptimizations.push({
          id: `mem-opt-efficiency-${Date.now()}-${analysis.keyPattern.replace(/[^a-zA-Z0-9]/g, "")}`,
          type: "MEMORY_OPTIMIZATION",
          priority: "MEDIUM",
          level: "ALL",
          description: `Improve memory efficiency for low-performing pattern: ${analysis.keyPattern}`,
          expectedImpact: {
            hitRateImprovement: 0.1,
            latencyReduction: 0,
            memoryOptimization: 0.2,
          },
          complexity: "LOW",
          affectedPatterns: [analysis.keyPattern],
          implementationSteps: [
            "Reduce cache TTL for infrequently accessed data",
            "Implement more aggressive eviction policies",
            "Consider moving to lower cache tier",
            "Monitor hit rate and memory usage",
          ],
          monitoringMetrics: ["hit_rate", "memory_efficiency", "eviction_rate"],
          timestamp: new Date(),
          estimatedROI: "15-25% memory efficiency improvement",
        });
      }
    });

    // Add memory optimizations to the main optimizations list
    this.optimizations.push(...memoryOptimizations);
  }

  private analyzeInvalidationPatterns(): void {
    const cutoffTime = new Date(Date.now() - this.config.analysisWindow);
    const invalidationOps = this.operations.filter(
      (op) => op.operation === "INVALIDATE" && op.timestamp >= cutoffTime,
    );

    const patternMap = new Map<string, InvalidationPattern>();

    invalidationOps.forEach((op) => {
      const pattern = this.extractKeyPattern(op.key);

      if (!patternMap.has(pattern)) {
        patternMap.set(pattern, {
          id: `inv-pattern-${pattern.replace(/[^a-zA-Z0-9]/g, "")}`,
          trigger: "unknown",
          affectedPatterns: [pattern],
          frequency: 0,
          hitRateImpact: 0,
        });
      }

      const invPattern = patternMap.get(pattern)!;
      invPattern.frequency++;
    });

    // Calculate hit rate impact
    patternMap.forEach((invPattern) => {
      const analysis = this.keyAnalyses.get(invPattern.affectedPatterns[0]);
      if (analysis) {
        // Estimate hit rate impact based on invalidation frequency vs access frequency
        invPattern.hitRateImpact = Math.min(
          0.5,
          invPattern.frequency / (analysis.accessFrequency || 1),
        );

        // Generate optimization if impact is significant
        if (invPattern.hitRateImpact > 0.1) {
          invPattern.optimization = `Consider batching invalidations or implementing more granular cache keys for pattern: ${invPattern.affectedPatterns[0]}`;
        }
      }
    });

    this.invalidationPatterns = Array.from(patternMap.values());
  }

  private generateLevelOptimizations(): void {
    // Generate cache level-specific optimizations
    const levelOptimizations: CacheOptimization[] = [];

    ["L1", "L2", "L3"].forEach((level) => {
      const levelOps = this.operations.filter((op) => op.level === level);
      if (levelOps.length < this.config.minSampleSize) return;

      const levelMetrics = this.calculateLevelMetrics(levelOps as any[]);
      const targets =
        this.config.targets[level as keyof typeof this.config.targets];

      // Hit rate optimization
      if (levelMetrics.hitRate < targets.hitRate) {
        levelOptimizations.push({
          id: `level-opt-hitrate-${level.toLowerCase()}-${Date.now()}`,
          type: "PROMOTION_STRATEGY",
          priority: "HIGH",
          level: level as any,
          description: `Improve ${level} cache hit rate through better promotion strategy`,
          expectedImpact: {
            hitRateImprovement: Math.min(
              0.2,
              targets.hitRate - levelMetrics.hitRate,
            ),
            latencyReduction: 0.1,
            memoryOptimization: 0,
          },
          complexity: "MEDIUM",
          affectedPatterns: [],
          implementationSteps: [
            `Analyze ${level} cache miss patterns`,
            "Implement intelligent promotion from lower cache levels",
            "Optimize cache admission policies",
            "Monitor hit rate improvements",
          ],
          monitoringMetrics: [
            `${level.toLowerCase()}_hit_rate`,
            "promotion_efficiency",
            "cache_utilization",
          ],
          timestamp: new Date(),
          estimatedROI: "10-20% hit rate improvement",
        });
      }

      // Latency optimization
      if (
        "maxAccessTime" in targets &&
        levelMetrics.avgAccessTime > targets.maxAccessTime
      ) {
        levelOptimizations.push({
          id: `level-opt-latency-${level.toLowerCase()}-${Date.now()}`,
          type: "MEMORY_OPTIMIZATION",
          priority: "MEDIUM",
          level: level as any,
          description: `Reduce ${level} cache access latency`,
          expectedImpact: {
            hitRateImprovement: 0,
            latencyReduction: Math.min(
              0.5,
              "maxAccessTime" in targets
                ? (levelMetrics.avgAccessTime - targets.maxAccessTime) /
                    targets.maxAccessTime
                : 0,
            ),
            memoryOptimization: 0.1,
          },
          complexity: "LOW",
          affectedPatterns: [],
          implementationSteps: [
            "Optimize data serialization/deserialization",
            "Review cache storage format",
            "Implement faster lookup algorithms",
            "Monitor access time improvements",
          ],
          monitoringMetrics: [
            `${level.toLowerCase()}_access_time`,
            "serialization_time",
            "lookup_efficiency",
          ],
          timestamp: new Date(),
          estimatedROI: "20-40% latency reduction",
        });
      }
    });

    this.optimizations.push(...levelOptimizations);
  }

  private calculateLevelMetrics(levelOps: CacheOperation[]): {
    hitRate: number;
    avgAccessTime: number;
    memoryUsage: number;
  } {
    const getOps = levelOps.filter((op) => op.operation === "GET");
    const hits = getOps.filter((op) => op.hit).length;
    const hitRate = getOps.length > 0 ? hits / getOps.length : 0;

    const avgAccessTime =
      levelOps.length > 0
        ? levelOps.reduce((sum, op) => sum + op.duration, 0) / levelOps.length
        : 0;

    const memoryUsage =
      levelOps.reduce((sum, op) => sum + op.dataSize, 0) / 1024 / 1024; // MB

    return { hitRate, avgAccessTime, memoryUsage };
  }

  private selectOptimalCacheLevel(
    analysis: CacheKeyAnalysis,
  ): "L1" | "L2" | "L3" {
    // Select optimal cache level based on access patterns
    if (analysis.accessFrequency > 50 && analysis.avgDataSize < 10000) {
      return "L1"; // High frequency, small data -> L1
    } else if (analysis.accessFrequency > 10 && analysis.avgDataSize < 100000) {
      return "L2"; // Medium frequency, medium data -> L2
    } else {
      return "L3"; // Low frequency or large data -> L3
    }
  }

  private calculateOverallPerformance(operations: CacheOperation[]): {
    hitRate: number;
    avgLatency: number;
    totalMemory: number;
    efficiency: number;
    score: number;
  } {
    const getOps = operations.filter((op) => op.operation === "GET");
    const hits = getOps.filter((op) => op.hit).length;
    const hitRate = getOps.length > 0 ? hits / getOps.length : 0;

    const avgLatency =
      operations.length > 0
        ? operations.reduce((sum, op) => sum + op.duration, 0) /
          operations.length
        : 0;

    const totalMemory =
      operations.reduce((sum, op) => sum + op.dataSize, 0) / 1024 / 1024; // MB

    const efficiency = totalMemory > 0 ? hitRate / (totalMemory / 1000) : 0; // hits per GB

    // Calculate overall performance score (0-100)
    let score = 0;
    score += Math.min(40, hitRate * 40); // Hit rate contribution (max 40 points)
    score += Math.min(30, Math.max(0, 30 - avgLatency / 10)); // Latency contribution (max 30 points)
    score += Math.min(20, efficiency * 20); // Efficiency contribution (max 20 points)
    score += 10; // Base score

    return {
      hitRate,
      avgLatency,
      totalMemory,
      efficiency,
      score: Math.round(score),
    };
  }

  private calculateLevelAnalyses(
    operations: CacheOperation[],
  ): Record<"L1" | "L2" | "L3", CacheLevelAnalysis> {
    const levels: Record<"L1" | "L2" | "L3", CacheLevelAnalysis> = {} as any;

    ["L1", "L2", "L3"].forEach((level) => {
      const levelOps = operations.filter((op) => op.level === level);
      const metrics = this.calculateLevelMetrics(levelOps);
      const targets =
        this.config.targets[level as keyof typeof this.config.targets];

      levels[level as "L1" | "L2" | "L3"] = {
        level: level as "L1" | "L2" | "L3",
        period: {
          start: new Date(Date.now() - this.config.analysisWindow),
          end: new Date(),
        },
        totalOperations: levelOps.length,
        hitRate: metrics.hitRate,
        missRate: 1 - metrics.hitRate,
        avgAccessTime: metrics.avgAccessTime,
        p95AccessTime: this.calculatePercentile(
          levelOps.map((op) => op.duration),
          95,
        ),
        p99AccessTime: this.calculatePercentile(
          levelOps.map((op) => op.duration),
          99,
        ),
        memoryUsage: metrics.memoryUsage,
        memoryEfficiency:
          metrics.memoryUsage > 0 ? metrics.hitRate / metrics.memoryUsage : 0,
        keyPatterns: this.analyzeKeyPatterns()
          .filter((pattern) => this.selectOptimalCacheLevel(pattern) === level)
          .slice(0, 5),
        performanceScore: this.calculateLevelScore(metrics, targets),
        optimizations: this.optimizations.filter(
          (opt) => opt.level === level || opt.level === "ALL",
        ),
      };
    });

    return levels;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = values.slice().sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) return sorted[lower];

    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private calculateLevelScore(metrics: any, targets: any): number {
    let score = 0;

    // Hit rate score (50% weight)
    score += Math.min(50, (metrics.hitRate / targets.hitRate) * 50);

    // Latency score (30% weight)
    score += Math.min(
      30,
      Math.max(0, 30 - (metrics.avgAccessTime / targets.maxAccessTime) * 30),
    );

    // Memory efficiency score (20% weight)
    score += Math.min(20, metrics.memoryEfficiency * 20);

    return Math.round(score);
  }

  private calculateTrends(): {
    hitRateTrend: number[];
    latencyTrend: number[];
    memoryTrend: number[];
    timestamps: Date[];
  } {
    // Calculate trends over the last hour with 5-minute intervals
    const intervals = 12; // 12 intervals of 5 minutes
    const intervalDuration = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();

    const hitRateTrend: number[] = [];
    const latencyTrend: number[] = [];
    const memoryTrend: number[] = [];
    const timestamps: Date[] = [];

    for (let i = intervals - 1; i >= 0; i--) {
      const endTime = now - i * intervalDuration;
      const startTime = endTime - intervalDuration;
      const intervalOps = this.operations.filter(
        (op) =>
          op.timestamp.getTime() >= startTime &&
          op.timestamp.getTime() < endTime,
      );

      timestamps.push(new Date(endTime));

      if (intervalOps.length > 0) {
        const getOps = intervalOps.filter((op) => op.operation === "GET");
        const hits = getOps.filter((op) => op.hit).length;
        hitRateTrend.push(getOps.length > 0 ? hits / getOps.length : 0);

        const avgLatency =
          intervalOps.reduce((sum, op) => sum + op.duration, 0) /
          intervalOps.length;
        latencyTrend.push(avgLatency);

        const memory =
          intervalOps.reduce((sum, op) => sum + op.dataSize, 0) / 1024 / 1024;
        memoryTrend.push(memory);
      } else {
        hitRateTrend.push(0);
        latencyTrend.push(0);
        memoryTrend.push(0);
      }
    }

    return { hitRateTrend, latencyTrend, memoryTrend, timestamps };
  }

  private generateAlerts(
    overall: any,
    levels: Record<"L1" | "L2" | "L3", CacheLevelAnalysis>,
  ): { critical: string[]; warnings: string[]; info: string[] } {
    const alerts = {
      critical: [] as string[],
      warnings: [] as string[],
      info: [] as string[],
    };

    // Overall performance alerts
    if (overall.hitRate < this.config.targets.overall.hitRate * 0.8) {
      alerts.critical.push(
        `Overall cache hit rate (${(overall.hitRate * 100).toFixed(1)}%) is critically low`,
      );
    } else if (overall.hitRate < this.config.targets.overall.hitRate) {
      alerts.warnings.push(
        `Overall cache hit rate (${(overall.hitRate * 100).toFixed(1)}%) is below target`,
      );
    }

    if (overall.avgLatency > 100) {
      alerts.warnings.push(
        `Average cache latency (${overall.avgLatency.toFixed(1)}ms) is high`,
      );
    }

    // Level-specific alerts
    Object.entries(levels).forEach(([level, analysis]) => {
      const targets =
        this.config.targets[level as keyof typeof this.config.targets];

      if (analysis.hitRate < targets.hitRate * 0.7) {
        alerts.critical.push(
          `${level} cache hit rate (${(analysis.hitRate * 100).toFixed(1)}%) is critically low`,
        );
      } else if (analysis.hitRate < targets.hitRate) {
        alerts.warnings.push(
          `${level} cache hit rate (${(analysis.hitRate * 100).toFixed(1)}%) is below target`,
        );
      }

      if (
        "maxAccessTime" in targets &&
        analysis.avgAccessTime > targets.maxAccessTime * 1.5
      ) {
        alerts.warnings.push(
          `${level} cache access time (${analysis.avgAccessTime.toFixed(1)}ms) is high`,
        );
      }
    });

    // Optimization opportunities
    const highPriorityOpts = this.optimizations.filter(
      (opt) => opt.priority === "HIGH" || opt.priority === "CRITICAL",
    );
    if (highPriorityOpts.length > 0) {
      alerts.info.push(
        `${highPriorityOpts.length} high-priority cache optimizations available`,
      );
    }

    return alerts;
  }
}

/**
 * Default cache analyzer instance
 */
export const cacheAnalyzer = new CacheAnalyzer();
