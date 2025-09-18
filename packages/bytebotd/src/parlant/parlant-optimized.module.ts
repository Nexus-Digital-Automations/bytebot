/**
 * Parlant Optimized Module - Enterprise Performance & Compliance Integration
 * 
 * Provides comprehensive NestJS module configuration for the optimized Parlant
 * integration with all performance optimization and enterprise compliance services.
 * 
 * Features:
 * - Optimized Parlant integration service with sub-500ms performance
 * - Performance monitoring and metrics collection
 * - Intelligent caching with Redis support
 * - Circuit breaker and connection pooling
 * - Retry logic and failover strategies
 * - Enterprise audit and compliance reporting
 * - Performance benchmarking and regression testing
 * 
 * Architecture: Enterprise-grade microservices with dependency injection
 * Performance: <500ms avg, <1000ms 95th percentile, 25+ validations/sec
 * Compliance: GDPR, SOX, HIPAA, ISO 27001 support
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

/**
 * Type definitions for Parlant optimization status objects
 */
interface CircuitBreakerStatus {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
  totalRequests: number;
}

interface PerformanceStats {
  averageLatency: number;
  p95Latency: number;
  throughputRpm: number;
  cacheHitRate: number;
  errorRate: number;
  performanceScore: number;
}

interface PerformanceStatus {
  currentStats: PerformanceStats;
  recommendations?: string[];
  alerts?: string[];
}

interface CacheStatus {
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
}

interface AuditStatus {
  totalEntries: number;
  complianceDistribution: Record<string, number>;
}

interface OptimizationStatusConfig {
  performanceTargets: {
    averageLatency: number;
    p95Latency: number;
    throughput: number;
    cacheHitRate: number;
    availability: number;
  };
}

interface OptimizationStatus {
  targetsMet: boolean;
  uptime: number;
  circuitBreaker?: CircuitBreakerStatus;
  performance?: PerformanceStatus;
  cache?: CacheStatus;
  audit?: AuditStatus;
  config: OptimizationStatusConfig;
}

/**
 * Type guard functions for safe property access
 */
function isCircuitBreakerStatus(obj: unknown): obj is CircuitBreakerStatus {
  if (!obj || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  return (
    'state' in record && typeof record.state === 'string' && 
    'successCount' in record && typeof record.successCount === 'number' && 
    'totalRequests' in record && typeof record.totalRequests === 'number'
  );
}

function isPerformanceStatus(obj: unknown): obj is PerformanceStatus {
  if (!obj || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  if (!('currentStats' in record) || !record.currentStats || typeof record.currentStats !== 'object') return false;
  
  const stats = record.currentStats as Record<string, unknown>;
  return (
    'averageLatency' in stats && typeof stats.averageLatency === 'number' &&
    'throughputRpm' in stats && typeof stats.throughputRpm === 'number'
  );
}

function isCacheStatus(obj: unknown): obj is CacheStatus {
  if (!obj || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  return (
    'hitRate' in record && typeof record.hitRate === 'number' && 
    'totalEntries' in record && typeof record.totalEntries === 'number' && 
    'memoryUsage' in record && typeof record.memoryUsage === 'number'
  );
}

function isAuditStatus(obj: unknown): obj is AuditStatus {
  if (!obj || typeof obj !== 'object') return false;
  const record = obj as Record<string, unknown>;
  const result = (
    'totalEntries' in record && typeof record.totalEntries === 'number' && 
    'complianceDistribution' in record && record.complianceDistribution &&
    typeof record.complianceDistribution === 'object'
  );
  return result as boolean;
}

// Core optimized integration service
import { ParlantIntegrationOptimizedService } from './parlant-integration-optimized.service';

// Performance optimization services
import { ParlantPerformanceMonitorService } from './performance/parlant-performance-monitor.service';
import { ParlantIntelligentCacheService } from './caching/parlant-intelligent-cache.service';

// Resilience and reliability services
import { ParlantCircuitBreakerService } from './resilience/parlant-circuit-breaker.service';
import { ParlantRetryFailoverService } from './resilience/parlant-retry-failover.service';

// Enterprise compliance and audit services
import { ParlantEnterpriseAuditService } from './audit/parlant-enterprise-audit.service';

// Performance testing and benchmarking
import { ParlantPerformanceBenchmarkService } from './testing/parlant-performance-benchmark.service';

// Legacy service for compatibility
import { ParlantIntegrationService } from './parlant-integration.service';

/**
 * Configuration factory for Parlant optimization settings
 */
export const parlantOptimizationConfig = () => ({
  parlant: {
    // Performance optimization settings
    optimization: {
      intelligentCacheEnabled: process.env.PARLANT_INTELLIGENT_CACHE_ENABLED === 'true',
      circuitBreakerEnabled: process.env.PARLANT_CIRCUIT_BREAKER_ENABLED === 'true',
      retryFailoverEnabled: process.env.PARLANT_RETRY_FAILOVER_ENABLED === 'true',
      performanceMonitoringEnabled: process.env.PARLANT_PERFORMANCE_MONITORING_ENABLED === 'true',
      enterpriseAuditEnabled: process.env.PARLANT_ENTERPRISE_AUDIT_ENABLED === 'true',
    },

    // Performance targets
    performanceTargets: {
      averageLatency: parseInt(process.env.PARLANT_TARGET_AVG_LATENCY_MS ?? '500', 10),
      p95Latency: parseInt(process.env.PARLANT_TARGET_P95_LATENCY_MS ?? '1000', 10),
      throughput: parseInt(process.env.PARLANT_TARGET_THROUGHPUT_RPS ?? '25', 10),
      cacheHitRate: parseInt(process.env.PARLANT_TARGET_CACHE_HIT_RATE ?? '95', 10),
      availability: parseFloat(process.env.PARLANT_TARGET_AVAILABILITY ?? '99.9'),
    },

    // Cache configuration
    cache: {
      warmingEnabled: process.env.PARLANT_CACHE_WARMING_ENABLED === 'true',
      warmingInterval: parseInt(process.env.PARLANT_CACHE_WARMING_INTERVAL ?? '15', 10),
      redisEnabled: process.env.PARLANT_REDIS_ENABLED === 'true',
      redisHost: process.env.PARLANT_REDIS_HOST ?? 'localhost',
      redisPort: parseInt(process.env.PARLANT_REDIS_PORT ?? '6379', 10),
      redisPassword: process.env.PARLANT_REDIS_PASSWORD,
    },

    // Circuit breaker configuration
    circuitBreaker: {
      failureThreshold: parseInt(process.env.PARLANT_CIRCUIT_FAILURE_THRESHOLD ?? '5', 10),
      recoveryTimeout: parseInt(process.env.PARLANT_CIRCUIT_RECOVERY_TIMEOUT_MS ?? '60000', 10),
      successThreshold: parseInt(process.env.PARLANT_CIRCUIT_SUCCESS_THRESHOLD ?? '3', 10),
      timeWindow: parseInt(process.env.PARLANT_CIRCUIT_TIME_WINDOW_MS ?? '60000', 10),
      minimumRequests: parseInt(process.env.PARLANT_CIRCUIT_MIN_REQUESTS ?? '10', 10),
    },

    // Connection pool configuration
    connectionPool: {
      maxConnections: parseInt(process.env.PARLANT_POOL_MAX_CONNECTIONS ?? '20', 10),
      minConnections: parseInt(process.env.PARLANT_POOL_MIN_CONNECTIONS ?? '5', 10),
      acquireTimeout: parseInt(process.env.PARLANT_POOL_ACQUIRE_TIMEOUT_MS ?? '5000', 10),
      idleTimeout: parseInt(process.env.PARLANT_POOL_IDLE_TIMEOUT_MS ?? '300000', 10),
      healthCheckInterval: parseInt(process.env.PARLANT_POOL_HEALTH_CHECK_MS ?? '30000', 10),
    },

    // Retry and failover configuration
    retry: {
      maxAttempts: {
        minimal: parseInt(process.env.PARLANT_RETRY_MAX_ATTEMPTS_MINIMAL ?? '5', 10),
        low: parseInt(process.env.PARLANT_RETRY_MAX_ATTEMPTS_LOW ?? '4', 10),
        medium: parseInt(process.env.PARLANT_RETRY_MAX_ATTEMPTS_MEDIUM ?? '3', 10),
        high: parseInt(process.env.PARLANT_RETRY_MAX_ATTEMPTS_HIGH ?? '2', 10),
        critical: parseInt(process.env.PARLANT_RETRY_MAX_ATTEMPTS_CRITICAL ?? '1', 10),
      },
      baseDelay: {
        minimal: parseInt(process.env.PARLANT_RETRY_BASE_DELAY_MINIMAL ?? '100', 10),
        low: parseInt(process.env.PARLANT_RETRY_BASE_DELAY_LOW ?? '200', 10),
        medium: parseInt(process.env.PARLANT_RETRY_BASE_DELAY_MEDIUM ?? '500', 10),
        high: parseInt(process.env.PARLANT_RETRY_BASE_DELAY_HIGH ?? '1000', 10),
        critical: parseInt(process.env.PARLANT_RETRY_BASE_DELAY_CRITICAL ?? '0', 10),
      },
    },

    // Audit and compliance configuration
    audit: {
      encryptionEnabled: process.env.PARLANT_AUDIT_ENCRYPTION_ENABLED === 'true',
      digitalSigningEnabled: process.env.PARLANT_AUDIT_DIGITAL_SIGNING_ENABLED === 'true',
      retentionDays: parseInt(process.env.PARLANT_AUDIT_RETENTION_DAYS ?? '2555', 10), // 7 years
      encryptionKey: process.env.PARLANT_AUDIT_ENCRYPTION_KEY,
      signingKey: process.env.PARLANT_AUDIT_SIGNING_KEY,
      realTimeMonitoring: process.env.PARLANT_AUDIT_REAL_TIME_MONITORING === 'true',
    },

    // Compliance regulations
    compliance: {
      gdprEnabled: process.env.PARLANT_COMPLIANCE_GDPR_ENABLED === 'true',
      soxEnabled: process.env.PARLANT_COMPLIANCE_SOX_ENABLED === 'true',
      hipaaEnabled: process.env.PARLANT_COMPLIANCE_HIPAA_ENABLED === 'true',
      iso27001Enabled: process.env.PARLANT_COMPLIANCE_ISO27001_ENABLED === 'true',
    },

    // Performance alerts configuration
    alerts: {
      enabled: process.env.PARLANT_PERFORMANCE_ALERTS_ENABLED === 'true',
      thresholds: {
        maxAverageLatency: parseInt(process.env.PARLANT_ALERT_MAX_AVG_LATENCY_MS ?? '500', 10),
        maxP95Latency: parseInt(process.env.PARLANT_ALERT_MAX_P95_LATENCY_MS ?? '1000', 10),
        minThroughput: parseInt(process.env.PARLANT_ALERT_MIN_THROUGHPUT_RPM ?? '25', 10),
        minCacheHitRate: parseInt(process.env.PARLANT_ALERT_MIN_CACHE_HIT_RATE ?? '95', 10),
        maxErrorRate: parseInt(process.env.PARLANT_ALERT_MAX_ERROR_RATE ?? '5', 10),
      },
      actions: (process.env.PARLANT_ALERT_ACTIONS ?? 'log,webhook').split(','),
    },

    // Benchmarking configuration
    benchmarking: {
      enabled: process.env.PARLANT_BENCHMARKING_ENABLED === 'true',
      regressionTesting: process.env.PARLANT_REGRESSION_TESTING_ENABLED === 'true',
      tolerancePercent: parseInt(process.env.PARLANT_REGRESSION_TOLERANCE_PERCENT ?? '10', 10),
      autoRebaseline: process.env.PARLANT_REGRESSION_AUTO_REBASELINE === 'true',
    },

    // API endpoints configuration
    endpoints: (_process.env.PARLANT_API_ENDPOINTS ?? 'http://localhost:8000').split(','),

    // Degradation strategy
    degradationStrategy: process.env.PARLANT_DEGRADATION_STRATEGY ?? 'GRACEFUL_DEGRADATION',
  },
});

/**
 * Parlant Optimized Module
 * 
 * Provides enterprise-grade Parlant integration with comprehensive performance
 * optimization and compliance features.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [parlantOptimizationConfig],
      isGlobal: true,
    }),
  ],
  providers: [
    // Core services in dependency order
    ParlantPerformanceMonitorService,
    ParlantIntelligentCacheService,
    ParlantCircuitBreakerService,
    ParlantRetryFailoverService,
    ParlantEnterpriseAuditService,
    
    // Testing and benchmarking
    ParlantPerformanceBenchmarkService,
    
    // Main optimized service (depends on all above)
    ParlantIntegrationOptimizedService,
    
    // Legacy service for backward compatibility
    {
      provide: ParlantIntegrationService,
      useExisting: ParlantIntegrationOptimizedService,
    },
    
    // Health check provider
    {
      provide: 'PARLANT_HEALTH_CHECK',
      useFactory: (optimizedService: ParlantIntegrationOptimizedService) => {
        return () => {
          const status = optimizedService.getOptimizationStatus() as OptimizationStatus;
          return {
            status: status.targetsMet ? 'healthy' : 'degraded',
            uptime: status.uptime,
            services: {
              cache: status.cache ? 'healthy' : 'disabled',
              circuitBreaker: status.circuitBreaker && isCircuitBreakerStatus(status.circuitBreaker) ? 
                (status.circuitBreaker.state === 'CLOSED' ? 'healthy' : 'degraded') : 'disabled',
              audit: status.audit ? 'healthy' : 'disabled',
            },
            performance: status.performance && isPerformanceStatus(status.performance) ? {
              averageLatency: `${status.performance.currentStats.averageLatency.toFixed(2)}ms`,
              throughput: `${status.performance.currentStats.throughputRpm.toFixed(1)} req/min`,
              cacheHitRate: `${status.performance.currentStats.cacheHitRate.toFixed(1)}%`,
            } : null,
            targetsMet: status.targetsMet,
          };
        };
      },
      inject: [ParlantIntegrationOptimizedService],
    },
  ],
  exports: [
    // Export main services for application use
    ParlantIntegrationOptimizedService,
    ParlantIntegrationService, // For backward compatibility
    
    // Export individual services for direct access if needed
    ParlantPerformanceMonitorService,
    ParlantIntelligentCacheService,
    ParlantCircuitBreakerService,
    ParlantRetryFailoverService,
    ParlantEnterpriseAuditService,
    ParlantPerformanceBenchmarkService,
    
    // Export health check
    'PARLANT_HEALTH_CHECK',
  ],
})
export class ParlantOptimizedModule {
  constructor(
    _private readonly optimizedService: ParlantIntegrationOptimizedService,
    private readonly performanceMonitor: ParlantPerformanceMonitorService,
    private readonly intelligentCache: ParlantIntelligentCacheService,
    private readonly circuitBreaker: ParlantCircuitBreakerService,
    private readonly enterpriseAudit: ParlantEnterpriseAuditService,
  ) {
    // Log module initialization
    const logger = { log: console.log, warn: console.warn, error: console.error };
    
    logger.log('Parlant Optimized Module initialized successfully', {
      timestamp: new Date().toISOString(),
      services: {
        optimizedIntegration: 'loaded',
        performanceMonitoring: 'loaded',
        intelligentCaching: 'loaded',
        circuitBreaker: 'loaded',
        enterpriseAudit: 'loaded',
      },
      performanceTargets: {
        averageLatency: '500ms',
        p95Latency: '1000ms',
        throughput: '25+ req/s',
        cacheHitRate: '95%+',
        availability: '99.9%+',
      },
    });
  }
}

/**
 * Health check controller for Parlant optimization status
 */
export class ParlantHealthController {
  constructor(
    _private readonly optimizedService: ParlantIntegrationOptimizedService,
  ) {}

  /**
   * GET /health/parlant
   * Returns comprehensive health and performance status
   */
  async getHealth() {
    const status = this.optimizedService.getOptimizationStatus() as OptimizationStatus;
    
    return {
      status: status.targetsMet ? 'healthy' : 'degraded',
      uptime: `${Math.floor(status.uptime / 1000 / 60)} minutes`,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      
      // Performance metrics
      performance: status.performance && isPerformanceStatus(status.performance) ? {
        averageLatency: `${status.performance.currentStats.averageLatency.toFixed(2)}ms`,
        p95Latency: `${status.performance.currentStats.p95Latency.toFixed(2)}ms`,
        throughput: `${status.performance.currentStats.throughputRpm.toFixed(1)} req/min`,
        cacheHitRate: `${status.performance.currentStats.cacheHitRate.toFixed(1)}%`,
        errorRate: `${status.performance.currentStats.errorRate.toFixed(2)}%`,
        performanceScore: `${status.performance.currentStats.performanceScore.toFixed(1)}/100`,
      } : null,
      
      // Service status
      services: {
        intelligentCache: status.cache && isCacheStatus(status.cache) ? {
          status: 'healthy',
          hitRate: `${status.cache.hitRate.toFixed(1)}%`,
          totalEntries: status.cache.totalEntries,
          memoryUsage: `${Math.round(status.cache.memoryUsage / 1024 / 1024)}MB`,
        } : { status: 'disabled' },
        
        circuitBreaker: status.circuitBreaker && isCircuitBreakerStatus(status.circuitBreaker) ? {
          status: status.circuitBreaker.state === 'CLOSED' ? 'healthy' : 'degraded',
          state: status.circuitBreaker.state,
          successRate: `${((status.circuitBreaker.successCount / Math.max(status.circuitBreaker.totalRequests, 1)) * 100).toFixed(1)}%`,
        } : { status: 'disabled' },
        
        enterpriseAudit: status.audit && isAuditStatus(status.audit) ? {
          status: 'healthy',
          totalEntries: status.audit.totalEntries,
          complianceDistribution: status.audit.complianceDistribution,
        } : { status: 'disabled' },
      },
      
      // Target compliance
      targets: {
        averageLatencyTarget: status.config.performanceTargets.averageLatency + 'ms',
        p95LatencyTarget: status.config.performanceTargets.p95Latency + 'ms',
        throughputTarget: status.config.performanceTargets.throughput + ' req/s',
        cacheHitRateTarget: status.config.performanceTargets.cacheHitRate + '%',
        availabilityTarget: status.config.performanceTargets.availability + '%',
        targetsMet: status.targetsMet,
      },
      
      // Recommendations (if any performance issues)
      recommendations: status.performance && isPerformanceStatus(status.performance) ? (status.performance.recommendations ?? []) : [],
      alerts: status.performance && isPerformanceStatus(status.performance) ? (status.performance.alerts ?? []) : [],
    };
  }

  /**
   * GET /health/parlant/performance
   * Returns detailed performance metrics
   */
  async getPerformanceMetrics() {
    const status = this.optimizedService.getOptimizationStatus() as OptimizationStatus;
    return status.performance && isPerformanceStatus(status.performance) 
      ? status.performance 
      : { error: 'Performance monitoring disabled' };
  }

  /**
   * GET /health/parlant/cache
   * Returns cache performance statistics
   */
  async getCacheMetrics() {
    const status = this.optimizedService.getOptimizationStatus() as OptimizationStatus;
    return status.cache && isCacheStatus(status.cache) 
      ? status.cache 
      : { error: 'Intelligent caching disabled' };
  }

  /**
   * GET /health/parlant/audit
   * Returns audit and compliance statistics
   */
  async getAuditMetrics() {
    const status = this.optimizedService.getOptimizationStatus() as OptimizationStatus;
    return status.audit && isAuditStatus(status.audit) 
      ? status.audit 
      : { error: 'Enterprise audit disabled' };
  }
}