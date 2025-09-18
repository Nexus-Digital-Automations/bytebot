/**
 * Parlant Performance Optimization Module - Complete Integration
 * 
 * Comprehensive NestJS module that integrates all performance optimization
 * components to achieve sub-1000ms response times for Parlant validation.
 * 
 * Integrated Components:
 * - Multi-Level Caching Service (L1/L2/L3)
 * - Async Batch Processor Service
 * - Performance Orchestrator Service
 * - Health Monitoring and Alerting
 * - Real-time Metrics Collection
 * - Adaptive Optimization Algorithms
 * 
 * Performance Targets:
 * - P95 Response Time: <1000ms
 * - Cache Hit Rate: 85%+
 * - Throughput: 500+ RPS
 * - Availability: 99.95%+
 * 
 * Enterprise Features:
 * - Real-time performance dashboard
 * - Automated optimization recommendations
 * - Comprehensive health monitoring
 * - Performance regression detection
 * - Scalability auto-tuning
 */

import { Module, Global, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Performance optimization services
import { ParlantMultiLevelCacheService } from './caching/parlant-multi-level-cache.service';
import { ParlantAsyncBatchProcessorService } from './optimization/parlant-async-batch-processor.service';
import { ParlantPerformanceOrchestratorService } from './optimization/parlant-performance-orchestrator.service';

// Existing Parlant services that we'll enhance
import { ParlantPerformanceMonitorService } from './performance/parlant-performance-monitor.service';
import { ParlantIntelligentCacheService } from './caching/parlant-intelligent-cache.service';
import { ParlantCircuitBreakerService } from './resilience/parlant-circuit-breaker.service';
import { ParlantRetryFailoverService } from './resilience/parlant-retry-failover.service';
import { ParlantIntegrationOptimizedService } from './parlant-integration-optimized.service';

// ===== PERFORMANCE OPTIMIZATION CONFIGURATION =====

/**
 * Performance optimization configuration factory
 */
export const performanceOptimizationConfig = () => ({
  parlantPerformance: {
    // Multi-level caching configuration
    caching: {
      l1Cache: {
        maxSize: parseInt(process.env.PARLANT_L1_CACHE_SIZE ?? '10000', 10),
        ttlMs: parseInt(process.env.PARLANT_L1_TTL_MS ?? '100', 10),
        enabled: process.env.PARLANT_L1_ENABLED !== 'false'
      },
      l2Cache: {
        redisCluster: (process.env.PARLANT_REDIS_CLUSTER ?? 'localhost:6379').split(','),
        patternTtlMs: parseInt(process.env.PARLANT_L2_PATTERN_TTL_MS ?? '300000', 10),
        resultTtlMs: parseInt(process.env.PARLANT_L2_RESULT_TTL_MS ?? '60000', 10),
        compressionEnabled: process.env.PARLANT_L2_COMPRESSION !== 'false',
        enabled: process.env.PARLANT_L2_ENABLED !== 'false'
      },
      l3Cache: {
        database: process.env.PARLANT_L3_DATABASE ?? 'sqlite',
        successfulTtlMs: parseInt(process.env.PARLANT_L3_SUCCESS_TTL_MS ?? '3600000', 10),
        failedTtlMs: parseInt(process.env.PARLANT_L3_FAILED_TTL_MS ?? '300000', 10),
        compressionEnabled: process.env.PARLANT_L3_COMPRESSION !== 'false',
        enabled: process.env.PARLANT_L3_ENABLED !== 'false'
      }
    },

    // Async batch processing configuration
    batching: {
      enabled: process.env.PARLANT_BATCHING_ENABLED !== 'false',
      maxBatchSize: parseInt(process.env.PARLANT_MAX_BATCH_SIZE ?? '50', 10),
      maxWaitTimeMs: parseInt(process.env.PARLANT_MAX_WAIT_TIME_MS ?? '50', 10),
      minBatchSize: parseInt(process.env.PARLANT_MIN_BATCH_SIZE ?? '5', 10),
      priorityThreshold: parseInt(process.env.PARLANT_PRIORITY_THRESHOLD ?? '10', 10),
      adaptiveBatchSizing: process.env.PARLANT_ADAPTIVE_BATCHING !== 'false'
    },

    // Worker pool configuration
    workerPool: {
      minWorkers: parseInt(process.env.PARLANT_MIN_WORKERS ?? '2', 10),
      maxWorkers: parseInt(process.env.PARLANT_MAX_WORKERS ?? '20', 10),
      idleTimeoutMs: parseInt(process.env.PARLANT_WORKER_IDLE_TIMEOUT_MS ?? '30000', 10),
      taskTimeoutMs: parseInt(process.env.PARLANT_WORKER_TASK_TIMEOUT_MS ?? '5000', 10),
      scalingFactor: parseFloat(process.env.PARLANT_WORKER_SCALING_FACTOR ?? '1.5')
    },

    // Performance targets
    targets: {
      p95ResponseTimeMs: parseInt(process.env.PARLANT_P95_TARGET_MS ?? '1000', 10),
      p99ResponseTimeMs: parseInt(process.env.PARLANT_P99_TARGET_MS ?? '2000', 10),
      cacheHitRatePercent: parseInt(process.env.PARLANT_CACHE_HIT_TARGET ?? '85', 10),
      throughputRps: parseInt(process.env.PARLANT_THROUGHPUT_TARGET_RPS ?? '500', 10),
      availabilityPercent: parseFloat(process.env.PARLANT_AVAILABILITY_TARGET ?? '99.95'),
      errorRatePercent: parseFloat(process.env.PARLANT_ERROR_RATE_TARGET ?? '0.05')
    },

    // Monitoring and alerting
    monitoring: {
      metricsUpdateIntervalMs: parseInt(process.env.PARLANT_METRICS_INTERVAL_MS ?? '30000', 10),
      alertCheckIntervalMs: parseInt(process.env.PARLANT_ALERT_INTERVAL_MS ?? '60000', 10),
      responseTimeWindowSize: parseInt(process.env.PARLANT_RESPONSE_WINDOW_SIZE ?? '1000', 10),
      performanceHistorySize: parseInt(process.env.PARLANT_PERFORMANCE_HISTORY_SIZE ?? '100', 10)
    },

    // Circuit breaker configuration
    circuitBreaker: {
      enabled: process.env.PARLANT_CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.PARLANT_CB_FAILURE_THRESHOLD ?? '5', 10),
      recoveryTimeoutMs: parseInt(process.env.PARLANT_CB_RECOVERY_TIMEOUT_MS ?? '30000', 10),
      successThreshold: parseInt(process.env.PARLANT_CB_SUCCESS_THRESHOLD ?? '3', 10)
    },

    // Optimization strategy
    optimization: {
      aggressiveCaching: process.env.PARLANT_AGGRESSIVE_CACHING !== 'false',
      preloadCommonPatterns: process.env.PARLANT_PRELOAD_PATTERNS !== 'false',
      adaptiveOptimization: process.env.PARLANT_ADAPTIVE_OPTIMIZATION !== 'false',
      degradationStrategy: process.env.PARLANT_DEGRADATION_STRATEGY ?? 'GRACEFUL_DEGRADATION'
    }
  }
});

// ===== PERFORMANCE OPTIMIZATION PROVIDERS =====

/**
 * Performance health check provider
 */
const performanceHealthCheckProvider: Provider = {
  provide: 'PARLANT_PERFORMANCE_HEALTH_CHECK',
  useFactory: (orchestrator: ParlantPerformanceOrchestratorService) => {
    return async () => {
      const metrics = orchestrator.getComprehensiveMetrics();
      const alerts = orchestrator.getActiveAlerts();
      
      return {
        status: metrics.targetCompliance.p95Target && 
                metrics.targetCompliance.cacheHitTarget && 
                metrics.targetCompliance.throughputTarget && 
                metrics.targetCompliance.availabilityTarget ? 'healthy' : 'degraded',
        
        performance: {
          p95ResponseTime: `${metrics.orchestratorMetrics.p95ResponseTime.toFixed(1)}ms`,
          cacheHitRate: `${(metrics.cacheMetrics.overallStats.totalHitRate * 100).toFixed(1)}%`,
          throughput: `${metrics.orchestratorMetrics.throughputPerSecond.toFixed(1)} RPS`,
          availability: `${metrics.orchestratorMetrics.availabilityPercent.toFixed(2)}%`,
          errorRate: `${(metrics.orchestratorMetrics.errorRate * 100).toFixed(2)}%`
        },
        
        targetCompliance: {
          p95Target: {
            met: metrics.targetCompliance.p95Target,
            current: `${metrics.orchestratorMetrics.p95ResponseTime.toFixed(1)}ms`,
            target: '1000ms'
          },
          cacheHitTarget: {
            met: metrics.targetCompliance.cacheHitTarget,
            current: `${(metrics.cacheMetrics.overallStats.totalHitRate * 100).toFixed(1)}%`,
            target: '85%'
          },
          throughputTarget: {
            met: metrics.targetCompliance.throughputTarget,
            current: `${metrics.orchestratorMetrics.throughputPerSecond.toFixed(1)} RPS`,
            target: '500 RPS'
          },
          availabilityTarget: {
            met: metrics.targetCompliance.availabilityTarget,
            current: `${metrics.orchestratorMetrics.availabilityPercent.toFixed(2)}%`,
            target: '99.95%'
          }
        },
        
        cacheHealth: {
          l1: {
            hitRate: `${(metrics.cacheMetrics.l1Stats.hitRate * 100).toFixed(1)}%`,
            avgAccessTime: `${metrics.cacheMetrics.l1Stats.avgAccessTime.toFixed(1)}ms`,
            totalEntries: metrics.cacheMetrics.l1Stats.totalEntries,
            memoryUsage: `${Math.round(metrics.cacheMetrics.l1Stats.memoryUsage / 1024 / 1024)}MB`
          },
          l2: {
            hitRate: `${(metrics.cacheMetrics.l2Stats.hitRate * 100).toFixed(1)}%`,
            avgAccessTime: `${metrics.cacheMetrics.l2Stats.avgAccessTime.toFixed(1)}ms`,
            compressionRatio: `${(metrics.cacheMetrics.l2Stats.compressionRatio * 100).toFixed(1)}%`
          },
          l3: {
            hitRate: `${(metrics.cacheMetrics.l3Stats.hitRate * 100).toFixed(1)}%`,
            avgAccessTime: `${metrics.cacheMetrics.l3Stats.avgAccessTime.toFixed(1)}ms`,
            totalEntries: metrics.cacheMetrics.l3Stats.totalEntries
          }
        },
        
        batchProcessing: {
          batchEfficiency: `${(metrics.batchMetrics.batchEfficiency * 100).toFixed(1)}%`,
          queueDepth: metrics.batchMetrics.queueDepth,
          workerUtilization: `${(metrics.batchMetrics.workerUtilization * 100).toFixed(1)}%`,
          avgBatchLatency: `${metrics.batchMetrics.avgBatchLatency.toFixed(1)}ms`,
          circuitBreakerState: metrics.batchMetrics.circuitBreakerState
        },
        
        activeAlerts: alerts.length,
        alerts: alerts.map(alert => ({
          id: alert.id,
          level: alert.level,
          message: alert.message,
          timestamp: alert.timestamp.toISOString()
        })),
        
        optimizationRecommendations: orchestrator.getOptimizationRecommendations().map(rec => ({
          category: rec.category,
          priority: rec.priority,
          title: rec.title,
          expectedImprovement: rec.expectedImprovement
        })),
        
        uptime: Math.floor((Date.now() - metrics.timestamp.getTime()) / 1000),
        lastUpdate: metrics.timestamp.toISOString()
      };
    };
  },
  inject: [ParlantPerformanceOrchestratorService]
};

/**
 * Performance metrics provider for external monitoring systems
 */
const performanceMetricsProvider: Provider = {
  provide: 'PARLANT_PERFORMANCE_METRICS',
  useFactory: (orchestrator: ParlantPerformanceOrchestratorService) => {
    return () => {
      return orchestrator.getComprehensiveMetrics();
    };
  },
  inject: [ParlantPerformanceOrchestratorService]
};

/**
 * Optimization recommendations provider
 */
const optimizationRecommendationsProvider: Provider = {
  provide: 'PARLANT_OPTIMIZATION_RECOMMENDATIONS',
  useFactory: (orchestrator: ParlantPerformanceOrchestratorService) => {
    return () => {
      return orchestrator.getOptimizationRecommendations();
    };
  },
  inject: [ParlantPerformanceOrchestratorService]
};

// ===== MODULE DEFINITION =====

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [performanceOptimizationConfig],
      isGlobal: true,
    }),
  ],
  providers: [
    // Core performance optimization services
    ParlantMultiLevelCacheService,
    ParlantAsyncBatchProcessorService,
    ParlantPerformanceOrchestratorService,

    // Existing services (maintain backward compatibility)
    ParlantPerformanceMonitorService,
    ParlantIntelligentCacheService,
    ParlantCircuitBreakerService,
    ParlantRetryFailoverService,
    
    // Enhanced optimized service that uses the new performance components
    {
      provide: ParlantIntegrationOptimizedService,
      useFactory: (
        orchestrator: ParlantPerformanceOrchestratorService,
        monitor: ParlantPerformanceMonitorService,
        cache: ParlantIntelligentCacheService,
        circuitBreaker: ParlantCircuitBreakerService,
        retryFailover: ParlantRetryFailoverService
      ) => {
        // Create enhanced service instance with performance orchestrator
        const service = new ParlantIntegrationOptimizedService(
          null as unknown as ConfigService, // ConfigService will be injected
          monitor,
          cache,
          circuitBreaker,
          retryFailover,
          null as unknown as ParlantEnterpriseAuditService  // ParlantEnterpriseAuditService will be injected
        );
        
        // Inject the performance orchestrator
        (service as unknown as { performanceOrchestrator: ParlantPerformanceOrchestratorService }).performanceOrchestrator = orchestrator;
        
        return service;
      },
      inject: [
        ParlantPerformanceOrchestratorService,
        ParlantPerformanceMonitorService,
        ParlantIntelligentCacheService,
        ParlantCircuitBreakerService,
        ParlantRetryFailoverService
      ]
    },

    // Health check and monitoring providers
    performanceHealthCheckProvider,
    performanceMetricsProvider,
    optimizationRecommendationsProvider,
  ],
  exports: [
    // Export performance optimization services
    ParlantMultiLevelCacheService,
    ParlantAsyncBatchProcessorService,
    ParlantPerformanceOrchestratorService,

    // Export existing services
    ParlantPerformanceMonitorService,
    ParlantIntelligentCacheService,
    ParlantCircuitBreakerService,
    ParlantRetryFailoverService,
    ParlantIntegrationOptimizedService,

    // Export health check and monitoring providers
    'PARLANT_PERFORMANCE_HEALTH_CHECK',
    'PARLANT_PERFORMANCE_METRICS',
    'PARLANT_OPTIMIZATION_RECOMMENDATIONS',
  ],
})
export class ParlantPerformanceOptimizationModule {
  constructor(
    private readonly orchestrator: ParlantPerformanceOrchestratorService,
    private readonly cacheService: ParlantMultiLevelCacheService,
    private readonly batchProcessor: ParlantAsyncBatchProcessorService
  ) {
    this.initializePerformanceOptimization();
  }

  /**
   * Initialize performance optimization with logging and monitoring
   */
  private initializePerformanceOptimization(): void {
    const logger = { log: console.log, warn: console.warn, error: console.error };
    
    logger.log('🚀 Parlant Performance Optimization Module initialized', {
      timestamp: new Date().toISOString(),
      components: {
        multiLevelCache: 'loaded',
        asyncBatchProcessor: 'loaded', 
        performanceOrchestrator: 'loaded',
        performanceMonitoring: 'active',
        healthChecks: 'active'
      },
      targets: {
        p95ResponseTime: '< 1000ms',
        cacheHitRate: '> 85%',
        throughput: '> 500 RPS',
        availability: '> 99.95%'
      }
    });

    // Set up real-time performance monitoring
    this.orchestrator.onPerformanceEvent('responseTimeRecorded', (event) => {
      const eventData = event as { latencyMs: number; timestamp: number };
      if (eventData.latencyMs > 2000) {
        logger.warn('High latency detected', {
          latency: `${eventData.latencyMs}ms`,
          timestamp: new Date(eventData.timestamp).toISOString()
        });
      }
    });

    // Monitor performance metrics updates
    this.orchestrator.onPerformanceEvent('performanceMetricsUpdated', (metrics) => {
      const metricsData = metrics as Record<string, unknown>;
      const compliance = metricsData.targetCompliance;
      if (!compliance.p95Target || !compliance.cacheHitTarget || !compliance.throughputTarget) {
        logger.warn('Performance targets not met', {
          p95ResponseTime: compliance.p95Target ? '✅' : '❌',
          cacheHitRate: compliance.cacheHitTarget ? '✅' : '❌',  
          throughput: compliance.throughputTarget ? '✅' : '❌',
          availability: compliance.availabilityTarget ? '✅' : '❌'
        });
      }
    });

    // Monitor alerts
    this.orchestrator.onPerformanceEvent('alertCreated', (alert) => {
      const alertData = alert as { message: string; level: string; metric: string; threshold: number; currentValue: number };
      logger.warn(`Performance Alert: ${alertData.message}`, {
        level: alertData.level,
        metric: alertData.metric,
        threshold: alertData.threshold,
        currentValue: alertData.currentValue
      });
    });

    // Log successful initialization
    setTimeout(async () => {
      try {
        const initialMetrics = this.orchestrator.getComprehensiveMetrics();
        logger.log('✅ Performance optimization system ready', {
          initialState: {
            totalRequests: initialMetrics.orchestratorMetrics.totalRequests,
            cacheHitRate: `${(initialMetrics.cacheMetrics.overallStats.totalHitRate * 100).toFixed(1)}%`,
            avgResponseTime: `${initialMetrics.orchestratorMetrics.avgResponseTime.toFixed(1)}ms`
          }
        });
      } catch (error) {
        logger.error('Error getting initial performance metrics:', error);
      }
    }, 1000);
  }
}