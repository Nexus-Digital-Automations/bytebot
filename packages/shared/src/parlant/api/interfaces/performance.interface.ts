/**
 * @fileoverview Performance Interface Definitions
 * Comprehensive interfaces for high-throughput performance optimization
 *
 * @version 1.0.0
 * @author AIgent Enterprise API Team
 * @since 2025-09-21
 */

export interface PerformanceMetrics {
  timestamp: Date;
  throughput: number; // requests per second
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number; // percentage
  resourceUtilization: ResourceUtilization;
  capacity: SystemCapacity;
}

export interface ResourceUtilization {
  cpu: number; // percentage
  memory: number; // percentage
  disk: number; // percentage
  network: number; // percentage
}

export interface SystemCapacity {
  maxThroughput: number;
  currentUtilization: number;
  availableCapacity: number;
  scalingPotential: number;
}

export interface OptimizationStrategy {
  type: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  expectedGain: number;
  implementationComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedTime: number; // milliseconds
  resourceRequirements: any;
}

export interface ResourceAllocation {
  allocationId: string;
  currentAllocation: ResourceUtilization;
  optimizedAllocation: any;
  implementationResult: any;
  expectedImprovements: {
    throughputIncrease: number;
    latencyReduction: number;
    costOptimization: number;
    resourceEfficiency: number;
  };
  monitoring: any;
  validationSchedule: any;
}

export interface ThroughputTarget {
  requestsPerSecond: number;
  latencyTarget: number;
  errorRateTarget: number;
  availabilityTarget: number;
}

export interface PerformanceInsights {
  timestamp: Date;
  currentMetrics: PerformanceMetrics;
  trendAnalysis: any;
  anomalies: any[];
  performanceScores: any;
  optimizationRecommendations: any[];
  systemHealth: any;
  capacityAnalysis: any;
  benchmarkComparison: any;
}

export interface LoadBalancingStrategy {
  algorithm: 'ROUND_ROBIN' | 'LEAST_CONNECTIONS' | 'WEIGHTED' | 'IP_HASH' | 'PERFORMANCE_BASED';
  healthCheck: boolean;
  sessionAffinity?: boolean;
  instances?: any[];
  geographyAware?: boolean;
}

export interface CachingStrategy {
  type: 'MEMORY' | 'REDIS' | 'DISTRIBUTED' | 'MULTI_TIER';
  targetHitRate: number;
  l1Config?: CacheConfig;
  l2Config?: CacheConfig;
  l3Config?: CacheConfig;
}

export interface CacheConfig {
  type: string;
  maxSize: string;
  ttl: number;
}

export interface ConnectionPoolConfig {
  maxConnections?: number;
  minConnections?: number;
  acquireTimeout?: number;
  idleTimeout?: number;
  maxLifetime?: number;
  validationQuery?: string;
  strategy?: string;
  expectedLoad?: number;
  latencyTargets?: LatencyTargets;
  resourceConstraints?: any;
  serviceTypes?: string[];
  maxSockets?: number;
  maxFreeSockets?: number;
  timeout?: number;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  cacheMaxConnections?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface LatencyTargets {
  p95: number;
  p99: number;
}

export interface AutoScalingPolicy {
  scaleOutThreshold: number;
  scaleInThreshold: number;
  minInstances?: number;
  maxInstances?: number;
  scaleOutCooldown?: number;
  scaleInCooldown?: number;
  predictive?: boolean;
  predictionHorizon?: number;
  confidenceThreshold?: number;
}

export interface PerformanceThresholds {
  cpuThreshold: number;
  memoryThreshold: number;
  networkThreshold: number;
  latencyThreshold: number;
  errorRateThreshold: number;
}

export interface OptimizationResult {
  optimizationId: string;
  optimizationType: string;
  success: boolean;
  performanceImprovement: number;
  resourceSavings: number;
  implementationDetails: any;
  metrics: any;
  recommendations: string[];
}

export interface PerformanceProfile {
  profileId: string;
  baselineMetrics: PerformanceMetrics;
  optimizationHistory: OptimizationResult[];
  currentOptimizations: OptimizationStrategy[];
  performanceTargets: ThroughputTarget;
}

export interface ThroughputOptimization {
  optimizationId: string;
  baselinePerformance: PerformanceMetrics;
  targetThroughput: number;
  achievedThroughput: number;
  latencyImprovement: number;
  resourceEfficiency: number;
  optimizationStrategy: OptimizationStrategy;
  implementedChanges: any[];
  performanceGains: {
    throughputIncrease: number;
    latencyReduction: number;
    resourceSavings: number;
    costOptimization: number;
  };
  validationResults: any;
  optimizationTime: number;
  nextOptimizationRecommendations: string[];
}

export interface SystemResources {
  cpu: {
    cores: number;
    utilization: number;
    capacity: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
  };
  network: {
    bandwidth: number;
    utilization: number;
    capacity: number;
  };
}

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  interval: number;
  metrics: string[];
  alertThresholds: PerformanceThresholds;
  retention: number;
}

export interface ScalingMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  requestRate: number;
  responseTime: number;
  errorRate: number;
  queueDepth: number;
}

export interface PerformanceBenchmark {
  benchmarkId: string;
  name: string;
  industry: string;
  targetMetrics: PerformanceMetrics;
  comparisonResults: BenchmarkComparison;
}

export interface BenchmarkComparison {
  throughputComparison: number;
  latencyComparison: number;
  resourceEfficiencyComparison: number;
  overallScore: number;
  recommendations: string[];
}