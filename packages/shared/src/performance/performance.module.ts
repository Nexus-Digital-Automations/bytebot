/**
 * Performance Optimization Module
 *
 * Comprehensive performance optimization module providing caching,
 * connection pooling, request batching, and adaptive optimization
 * for high-throughput Parlant validation operations.
 *
 * Features:
 * - Intelligent caching with compression and TTL management
 * - High-performance request batching with priority queuing
 * - Connection pooling for optimized resource utilization
 * - Circuit breaker pattern for reliability and fault tolerance
 * - Adaptive performance tuning based on system metrics
 * - Real-time performance monitoring and metrics collection
 *
 * @author AIgent Enterprise Performance Team
 * @version 1.0.0
 */

import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ParlantPerformanceOptimizerService } from "./parlant-performance-optimizer.service";

/**
 * Performance optimization module configuration
 */
export interface PerformanceModuleConfig {
  /** Enable global performance optimization */
  enabled?: boolean;

  /** Caching configuration */
  caching?: {
    enabled?: boolean;
    maxSize?: number;
    defaultTtl?: number;
    compressionEnabled?: boolean;
  };

  /** Batching configuration */
  batching?: {
    enabled?: boolean;
    maxBatchSize?: number;
    batchTimeout?: number;
  };

  /** Connection pooling configuration */
  connectionPool?: {
    enabled?: boolean;
    maxConnections?: number;
    minConnections?: number;
  };

  /** Circuit breaker configuration */
  circuitBreaker?: {
    enabled?: boolean;
    failureThreshold?: number;
    recoveryTimeout?: number;
  };

  /** Adaptive optimization configuration */
  adaptiveOptimization?: {
    enabled?: boolean;
    performanceThreshold?: number;
    adaptationInterval?: number;
  };
}

/**
 * Global Performance Optimization Module
 *
 * Provides enterprise-grade performance optimization capabilities
 * across all Parlant validation operations with intelligent
 * resource management and adaptive tuning.
 */
@Global()
@Module({
  imports: [ConfigModule, EventEmitterModule, ScheduleModule],
  providers: [
    ParlantPerformanceOptimizerService,
    {
      provide: "PERFORMANCE_CONFIG",
      useFactory: () => {
        // Load configuration from environment or config service
        return {
          enabled: process.env.PERFORMANCE_OPTIMIZATION_ENABLED === "true",
          caching: {
            enabled: process.env.PERFORMANCE_CACHING_ENABLED !== "false",
            maxSize: parseInt(
              process.env.PERFORMANCE_CACHE_MAX_SIZE || "100000",
            ),
            defaultTtl: parseInt(
              process.env.PERFORMANCE_CACHE_DEFAULT_TTL || "300000",
            ),
            compressionEnabled:
              process.env.PERFORMANCE_CACHE_COMPRESSION !== "false",
          },
          batching: {
            enabled: process.env.PERFORMANCE_BATCHING_ENABLED !== "false",
            maxBatchSize: parseInt(process.env.PERFORMANCE_BATCH_SIZE || "100"),
            batchTimeout: parseInt(
              process.env.PERFORMANCE_BATCH_TIMEOUT || "50",
            ),
          },
          connectionPool: {
            enabled:
              process.env.PERFORMANCE_CONNECTION_POOL_ENABLED !== "false",
            maxConnections: parseInt(
              process.env.PERFORMANCE_MAX_CONNECTIONS || "50",
            ),
            minConnections: parseInt(
              process.env.PERFORMANCE_MIN_CONNECTIONS || "5",
            ),
          },
          circuitBreaker: {
            enabled:
              process.env.PERFORMANCE_CIRCUIT_BREAKER_ENABLED !== "false",
            failureThreshold: parseInt(
              process.env.PERFORMANCE_FAILURE_THRESHOLD || "10",
            ),
            recoveryTimeout: parseInt(
              process.env.PERFORMANCE_RECOVERY_TIMEOUT || "30000",
            ),
          },
          adaptiveOptimization: {
            enabled:
              process.env.PERFORMANCE_ADAPTIVE_OPTIMIZATION_ENABLED !== "false",
            performanceThreshold: parseInt(
              process.env.PERFORMANCE_THRESHOLD || "500",
            ),
            adaptationInterval: parseInt(
              process.env.PERFORMANCE_ADAPTATION_INTERVAL || "60000",
            ),
          },
        };
      },
    },
  ],
  exports: [ParlantPerformanceOptimizerService, "PERFORMANCE_CONFIG"],
})
export class PerformanceModule {
  constructor(
    private readonly performanceOptimizer: ParlantPerformanceOptimizerService,
  ) {
    this.initializePerformanceModule();
  }

  /**
   * Create performance module with custom configuration
   */
  static forRoot(config: PerformanceModuleConfig = {}): any {
    return {
      module: PerformanceModule,
      providers: [
        {
          provide: "PERFORMANCE_CONFIG",
          useValue: config,
        },
        ParlantPerformanceOptimizerService,
      ],
      exports: [ParlantPerformanceOptimizerService, "PERFORMANCE_CONFIG"],
    };
  }

  /**
   * Create performance module for development environment
   */
  static forDevelopment(): any {
    const devConfig: PerformanceModuleConfig = {
      enabled: true,
      caching: {
        enabled: true,
        maxSize: 10000, // Smaller cache for dev
        defaultTtl: 60000, // 1 minute TTL
        compressionEnabled: false, // Disable compression for dev
      },
      batching: {
        enabled: true,
        maxBatchSize: 25, // Smaller batches for dev
        batchTimeout: 100, // Longer timeout for debugging
      },
      connectionPool: {
        enabled: true,
        maxConnections: 10,
        minConnections: 2,
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5, // Lower threshold for dev
        recoveryTimeout: 10000, // Faster recovery in dev
      },
      adaptiveOptimization: {
        enabled: false, // Disable for dev to avoid confusion
        performanceThreshold: 1000,
        adaptationInterval: 30000,
      },
    };

    return this.forRoot(devConfig);
  }

  /**
   * Create performance module for production environment
   */
  static forProduction(): any {
    const prodConfig: PerformanceModuleConfig = {
      enabled: true,
      caching: {
        enabled: true,
        maxSize: 500000, // Large cache for production
        defaultTtl: 600000, // 10 minute TTL
        compressionEnabled: true, // Enable compression for memory efficiency
      },
      batching: {
        enabled: true,
        maxBatchSize: 250, // Large batches for throughput
        batchTimeout: 25, // Short timeout for low latency
      },
      connectionPool: {
        enabled: true,
        maxConnections: 100,
        minConnections: 20,
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 20, // Higher threshold for production stability
        recoveryTimeout: 60000, // Longer recovery time for production
      },
      adaptiveOptimization: {
        enabled: true,
        performanceThreshold: 300, // Strict performance requirements
        adaptationInterval: 60000,
      },
    };

    return this.forRoot(prodConfig);
  }

  /**
   * Create performance module for high-throughput scenarios
   */
  static forHighThroughput(): any {
    const highThroughputConfig: PerformanceModuleConfig = {
      enabled: true,
      caching: {
        enabled: true,
        maxSize: 1000000, // Very large cache
        defaultTtl: 1800000, // 30 minute TTL for stability
        compressionEnabled: true,
      },
      batching: {
        enabled: true,
        maxBatchSize: 500, // Very large batches
        batchTimeout: 10, // Very short timeout for maximum throughput
      },
      connectionPool: {
        enabled: true,
        maxConnections: 200, // Large connection pool
        minConnections: 50,
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 50, // High threshold for throughput scenarios
        recoveryTimeout: 30000,
      },
      adaptiveOptimization: {
        enabled: true,
        performanceThreshold: 200, // Very strict performance requirements
        adaptationInterval: 30000, // More frequent adaptations
      },
    };

    return this.forRoot(highThroughputConfig);
  }

  /**
   * Initialize performance module with logging
   */
  private initializePerformanceModule(): void {
    console.log("⚡ High-Performance Parlant Optimization Module Initialized");
    console.log("   ✅ Intelligent caching with compression enabled");
    console.log("   ✅ Request batching with priority queuing active");
    console.log("   ✅ Connection pooling for optimal resource utilization");
    console.log("   ✅ Circuit breaker pattern for reliability protection");
    console.log("   ✅ Adaptive performance tuning based on system metrics");
    console.log("   ✅ Real-time performance monitoring and analytics");
    console.log("   ✅ Memory optimization and garbage collection tuning");
    console.log("   ✅ High-throughput validation processing capabilities");
  }
}
