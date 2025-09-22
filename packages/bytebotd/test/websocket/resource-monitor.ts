/**
 * Resource Monitor for Concurrent WebSocket Sessions
 *
 * Advanced resource monitoring and analysis system for tracking memory usage,
 * CPU utilization, network performance, and resource leaks in concurrent
 * WebSocket environments. Provides real-time monitoring, leak detection,
 * and performance optimization recommendations.
 *
 * Monitoring Capabilities:
 * - Memory usage tracking and leak detection
 * - CPU utilization monitoring and spike detection
 * - Network bandwidth and connection monitoring
 * - Garbage collection performance analysis
 * - Resource efficiency scoring
 * - Performance bottleneck identification
 * - Automatic resource optimization suggestions
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import * as os from 'os';

// ===== RESOURCE MONITORING TYPES =====

/**
 * Resource monitoring configuration
 */
export interface ResourceMonitorConfig {
  monitoringInterval: number; // milliseconds
  memoryLeakThreshold: number; // bytes
  cpuUsageThreshold: number; // percentage (0-100)
  networkLatencyThreshold: number; // milliseconds
  gcPressureThreshold: number; // percentage (0-100)
  enableRealTimeAlerts: boolean;
  enablePerformanceOptimization: boolean;
  enableResourcePrediction: boolean;
  collectGarbageCollectionMetrics: boolean;
  collectNetworkMetrics: boolean;
  collectSystemMetrics: boolean;
}

/**
 * Memory usage metrics
 */
export interface MemoryMetrics {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  heapFree: number;
  external: number;
  rss: number; // Resident Set Size
  arrayBuffers: number;
  allocatedSinceLastGC?: number;
  memoryPressure: number; // 0.0 to 1.0
  leakSuspicion: number; // 0.0 to 1.0
}

/**
 * CPU usage metrics
 */
export interface CpuMetrics {
  timestamp: number;
  userTime: number;
  systemTime: number;
  totalUsage: number; // percentage
  loadAverage: number[];
  cpuPressure: number; // 0.0 to 1.0
  coreUtilization: number[]; // per-core utilization
}

/**
 * Network metrics
 */
export interface NetworkMetrics {
  timestamp: number;
  activeConnections: number;
  bytesTransmitted: number;
  bytesReceived: number;
  packetsTransmitted: number;
  packetsReceived: number;
  connectionLatency: number;
  throughput: number; // bytes per second
  errorRate: number; // 0.0 to 1.0
  connectionDropRate: number; // 0.0 to 1.0
}

/**
 * Garbage collection metrics
 */
export interface GarbageCollectionMetrics {
  timestamp: number;
  gcType: string;
  duration: number; // milliseconds
  freedMemory: number; // bytes
  heapSizeBefore: number;
  heapSizeAfter: number;
  gcPressure: number; // 0.0 to 1.0
  gcFrequency: number; // GCs per minute
}

/**
 * System metrics
 */
export interface SystemMetrics {
  timestamp: number;
  totalMemory: number;
  freeMemory: number;
  usedMemory: number;
  memoryUtilization: number; // percentage
  cpuCount: number;
  platform: string;
  architecture: string;
  nodeVersion: string;
  uptime: number; // seconds
}

/**
 * Resource leak detection result
 */
export interface ResourceLeak {
  leakType: 'memory' | 'handle' | 'connection' | 'event_listener';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  leakSize: number; // bytes or count
  growthRate: number; // bytes/second or count/second
  suspectedSource: string;
  recommendation: string;
  confidence: number; // 0.0 to 1.0
}

/**
 * Performance bottleneck identification
 */
export interface PerformanceBottleneck {
  bottleneckType: 'memory' | 'cpu' | 'network' | 'gc' | 'io';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: number;
  impactScore: number; // 0.0 to 1.0
  description: string;
  metrics: Record<string, number>;
  recommendations: string[];
}

/**
 * Resource efficiency analysis
 */
export interface ResourceEfficiencyAnalysis {
  memoryEfficiency: number; // 0.0 to 1.0
  cpuEfficiency: number; // 0.0 to 1.0
  networkEfficiency: number; // 0.0 to 1.0
  overallEfficiency: number; // 0.0 to 1.0
  performanceScore: number; // 0.0 to 1.0
  sustainabilityScore: number; // 0.0 to 1.0
  optimizationPotential: number; // 0.0 to 1.0
}

/**
 * Resource monitoring report
 */
export interface ResourceMonitoringReport {
  monitoringDuration: number;
  totalSamples: number;
  peakResourceUsage: {
    memory: MemoryMetrics;
    cpu: CpuMetrics;
    network: NetworkMetrics;
  };
  averageResourceUsage: {
    memory: MemoryMetrics;
    cpu: CpuMetrics;
    network: NetworkMetrics;
  };
  resourceLeaks: ResourceLeak[];
  performanceBottlenecks: PerformanceBottleneck[];
  efficiencyAnalysis: ResourceEfficiencyAnalysis;
  gcPerformance: {
    totalGcTime: number;
    avgGcDuration: number;
    gcFrequency: number;
    gcEfficiency: number;
  };
  recommendations: string[];
  alertsTriggered: number;
  complianceStatus: 'compliant' | 'warning' | 'critical';
}

// ===== RESOURCE MONITOR =====

/**
 * ResourceMonitor
 *
 * Comprehensive resource monitoring system for concurrent WebSocket environments.
 * Provides real-time monitoring, leak detection, and performance optimization.
 */
export class ResourceMonitor extends EventEmitter {
  private monitoringActive = false;
  private monitoringStartTime = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;

  // Metric storage
  private memorySnapshots: MemoryMetrics[] = [];
  private cpuSnapshots: CpuMetrics[] = [];
  private networkSnapshots: NetworkMetrics[] = [];
  private gcSnapshots: GarbageCollectionMetrics[] = [];
  private systemSnapshots: SystemMetrics[] = [];

  // Leak detection
  private detectedLeaks: ResourceLeak[] = [];
  private performanceBottlenecks: PerformanceBottleneck[] = [];

  // Performance tracking
  private lastGcTime = 0;
  private gcCount = 0;
  private alertCount = 0;

  // Baseline measurements
  private baselineMemory = 0;
  private baselineCpu = 0;

  constructor(private config: ResourceMonitorConfig) {
    super();
    this.setupGarbageCollectionMonitoring();
  }

  /**
   * Start resource monitoring
   */
  startMonitoring(): void {
    if (this.monitoringActive) {
      throw new Error('Resource monitoring is already active');
    }

    this.monitoringActive = true;
    this.monitoringStartTime = performance.now();
    this.baselineMemory = process.memoryUsage().heapUsed;
    this.baselineCpu = this.getCurrentCpuUsage();

    // Reset collections
    this.memorySnapshots = [];
    this.cpuSnapshots = [];
    this.networkSnapshots = [];
    this.gcSnapshots = [];
    this.systemSnapshots = [];
    this.detectedLeaks = [];
    this.performanceBottlenecks = [];
    this.alertCount = 0;

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectResourceMetrics();
    }, this.config.monitoringInterval);

    this.emit('monitoringStarted', {
      timestamp: Date.now(),
      baseline: {
        memory: this.baselineMemory,
        cpu: this.baselineCpu,
      },
    });
  }

  /**
   * Stop resource monitoring
   */
  stopMonitoring(): ResourceMonitoringReport {
    if (!this.monitoringActive) {
      throw new Error('Resource monitoring is not active');
    }

    this.monitoringActive = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Collect final metrics
    this.collectResourceMetrics();

    // Generate comprehensive report
    const report = this.generateMonitoringReport();

    this.emit('monitoringStopped', {
      timestamp: Date.now(),
      report,
    });

    return report;
  }

  /**
   * Collect comprehensive resource metrics
   */
  private collectResourceMetrics(): void {
    const timestamp = Date.now();

    // Memory metrics
    if (this.config.collectSystemMetrics) {
      const memoryMetrics = this.collectMemoryMetrics(timestamp);
      this.memorySnapshots.push(memoryMetrics);
      this.analyzeMemoryLeaks(memoryMetrics);
    }

    // CPU metrics
    const cpuMetrics = this.collectCpuMetrics(timestamp);
    this.cpuSnapshots.push(cpuMetrics);
    this.analyzeCpuBottlenecks(cpuMetrics);

    // Network metrics
    if (this.config.collectNetworkMetrics) {
      const networkMetrics = this.collectNetworkMetrics(timestamp);
      this.networkSnapshots.push(networkMetrics);
      this.analyzeNetworkBottlenecks(networkMetrics);
    }

    // System metrics
    if (this.config.collectSystemMetrics) {
      const systemMetrics = this.collectSystemMetrics(timestamp);
      this.systemSnapshots.push(systemMetrics);
    }

    // Performance optimization
    if (this.config.enablePerformanceOptimization) {
      this.performOptimizationAnalysis();
    }

    // Real-time alerts
    if (this.config.enableRealTimeAlerts) {
      this.checkAlertConditions();
    }

    this.emit('metricsCollected', {
      timestamp,
      memory: this.memorySnapshots[this.memorySnapshots.length - 1],
      cpu: this.cpuSnapshots[this.cpuSnapshots.length - 1],
      network: this.config.collectNetworkMetrics
        ? this.networkSnapshots[this.networkSnapshots.length - 1]
        : null,
    });
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(timestamp: number): MemoryMetrics {
    const memUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // Calculate memory pressure
    const memoryPressure = (totalMemory - freeMemory) / totalMemory;

    // Calculate leak suspicion based on growth pattern
    const leakSuspicion = this.calculateMemoryLeakSuspicion(memUsage.heapUsed);

    return {
      timestamp,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      heapFree: memUsage.heapTotal - memUsage.heapUsed,
      external: memUsage.external,
      rss: memUsage.rss,
      arrayBuffers: memUsage.arrayBuffers,
      memoryPressure,
      leakSuspicion,
    };
  }

  /**
   * Collect CPU metrics
   */
  private collectCpuMetrics(timestamp: number): CpuMetrics {
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    const cpuCount = os.cpus().length;

    // Calculate total CPU usage percentage
    const totalUsage = this.getCurrentCpuUsage();
    const cpuPressure = Math.min(1.0, totalUsage / 100);

    // Get per-core utilization (simplified)
    const coreUtilization = os.cpus().map((cpu) => {
      const total = Object.values(cpu.times).reduce(
        (sum, time) => sum + time,
        0,
      );
      const idle = cpu.times.idle;
      return ((total - idle) / total) * 100;
    });

    return {
      timestamp,
      userTime: cpuUsage.user,
      systemTime: cpuUsage.system,
      totalUsage,
      loadAverage,
      cpuPressure,
      coreUtilization,
    };
  }

  /**
   * Collect network metrics (simplified)
   */
  private collectNetworkMetrics(timestamp: number): NetworkMetrics {
    // Note: This is a simplified implementation
    // In a real implementation, you would collect actual network statistics

    return {
      timestamp,
      activeConnections: 0, // Would be actual connection count
      bytesTransmitted: 0,
      bytesReceived: 0,
      packetsTransmitted: 0,
      packetsReceived: 0,
      connectionLatency: 0,
      throughput: 0,
      errorRate: 0,
      connectionDropRate: 0,
    };
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(timestamp: number): SystemMetrics {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      timestamp,
      totalMemory,
      freeMemory,
      usedMemory,
      memoryUtilization: (usedMemory / totalMemory) * 100,
      cpuCount: os.cpus().length,
      platform: os.platform(),
      architecture: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
    };
  }

  /**
   * Calculate memory leak suspicion score
   */
  private calculateMemoryLeakSuspicion(currentMemory: number): number {
    if (this.memorySnapshots.length < 5) {
      return 0; // Not enough data
    }

    // Look at memory growth trend over time
    const recentSnapshots = this.memorySnapshots.slice(-5);
    const memoryGrowth = recentSnapshots.map((s) => s.heapUsed);

    // Calculate linear regression to detect consistent growth
    const n = memoryGrowth.length;
    const sumX = memoryGrowth.reduce((sum, _, i) => sum + i, 0);
    const sumY = memoryGrowth.reduce((sum, mem) => sum + mem, 0);
    const sumXY = memoryGrowth.reduce((sum, mem, i) => sum + i * mem, 0);
    const sumX2 = memoryGrowth.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgMemory = sumY / n;

    // High positive slope indicates potential memory leak
    const growthRate = slope / avgMemory;
    return Math.min(1.0, Math.max(0, growthRate * 100));
  }

  /**
   * Get current CPU usage percentage
   */
  private getCurrentCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (totalIdle / totalTick) * 100;
  }

  /**
   * Analyze memory leaks
   */
  private analyzeMemoryLeaks(memoryMetrics: MemoryMetrics): void {
    // Check if memory usage exceeds threshold
    if (memoryMetrics.heapUsed > this.config.memoryLeakThreshold) {
      const leak: ResourceLeak = {
        leakType: 'memory',
        severity: this.getLeakSeverity(
          memoryMetrics.heapUsed,
          this.config.memoryLeakThreshold,
        ),
        detectedAt: memoryMetrics.timestamp,
        leakSize: memoryMetrics.heapUsed - this.baselineMemory,
        growthRate: this.calculateMemoryGrowthRate(),
        suspectedSource: 'heap_allocation',
        recommendation:
          'Investigate heap allocation patterns and implement garbage collection optimization',
        confidence: memoryMetrics.leakSuspicion,
      };

      this.detectedLeaks.push(leak);
      this.emit('leakDetected', leak);
    }
  }

  /**
   * Analyze CPU bottlenecks
   */
  private analyzeCpuBottlenecks(cpuMetrics: CpuMetrics): void {
    if (cpuMetrics.totalUsage > this.config.cpuUsageThreshold) {
      const bottleneck: PerformanceBottleneck = {
        bottleneckType: 'cpu',
        severity: this.getBottleneckSeverity(
          cpuMetrics.totalUsage,
          this.config.cpuUsageThreshold,
        ),
        detectedAt: cpuMetrics.timestamp,
        impactScore: cpuMetrics.cpuPressure,
        description: `High CPU usage detected: ${cpuMetrics.totalUsage.toFixed(2)}%`,
        metrics: {
          usage: cpuMetrics.totalUsage,
          pressure: cpuMetrics.cpuPressure,
          loadAverage: cpuMetrics.loadAverage[0],
        },
        recommendations: [
          'Optimize CPU-intensive operations',
          'Consider implementing worker threads for heavy computations',
          'Review algorithm efficiency',
        ],
      };

      this.performanceBottlenecks.push(bottleneck);
      this.emit('bottleneckDetected', bottleneck);
    }
  }

  /**
   * Analyze network bottlenecks
   */
  private analyzeNetworkBottlenecks(networkMetrics: NetworkMetrics): void {
    if (
      networkMetrics.connectionLatency > this.config.networkLatencyThreshold
    ) {
      const bottleneck: PerformanceBottleneck = {
        bottleneckType: 'network',
        severity: this.getBottleneckSeverity(
          networkMetrics.connectionLatency,
          this.config.networkLatencyThreshold,
        ),
        detectedAt: networkMetrics.timestamp,
        impactScore: networkMetrics.errorRate,
        description: `High network latency detected: ${networkMetrics.connectionLatency}ms`,
        metrics: {
          latency: networkMetrics.connectionLatency,
          throughput: networkMetrics.throughput,
          errorRate: networkMetrics.errorRate,
        },
        recommendations: [
          'Optimize network communication protocols',
          'Implement connection pooling',
          'Consider message compression',
        ],
      };

      this.performanceBottlenecks.push(bottleneck);
      this.emit('bottleneckDetected', bottleneck);
    }
  }

  /**
   * Calculate memory growth rate
   */
  private calculateMemoryGrowthRate(): number {
    if (this.memorySnapshots.length < 2) return 0;

    const recent = this.memorySnapshots[this.memorySnapshots.length - 1];
    const previous = this.memorySnapshots[this.memorySnapshots.length - 2];

    const timeDiff = (recent.timestamp - previous.timestamp) / 1000; // seconds
    const memoryDiff = recent.heapUsed - previous.heapUsed;

    return timeDiff > 0 ? memoryDiff / timeDiff : 0; // bytes per second
  }

  /**
   * Get leak severity based on size
   */
  private getLeakSeverity(
    currentValue: number,
    threshold: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = currentValue / threshold;

    if (ratio >= 4) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Get bottleneck severity
   */
  private getBottleneckSeverity(
    currentValue: number,
    threshold: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = currentValue / threshold;

    if (ratio >= 2) return 'critical';
    if (ratio >= 1.5) return 'high';
    if (ratio >= 1.2) return 'medium';
    return 'low';
  }

  /**
   * Setup garbage collection monitoring
   */
  private setupGarbageCollectionMonitoring(): void {
    if (!this.config.collectGarbageCollectionMetrics) return;

    // Monitor garbage collection events
    if ((global as { gc?: () => void }).gc) {
      const originalGc = (global as { gc: () => void }).gc;
      (global as { gc: () => void }).gc = () => {
        const startTime = performance.now();
        const heapBefore = process.memoryUsage().heapUsed;

        originalGc();

        const endTime = performance.now();
        const heapAfter = process.memoryUsage().heapUsed;

        const gcMetrics: GarbageCollectionMetrics = {
          timestamp: Date.now(),
          gcType: 'manual',
          duration: endTime - startTime,
          freedMemory: heapBefore - heapAfter,
          heapSizeBefore: heapBefore,
          heapSizeAfter: heapAfter,
          gcPressure: this.calculateGcPressure(),
          gcFrequency: this.calculateGcFrequency(),
        };

        this.gcSnapshots.push(gcMetrics);
        this.gcCount++;
        this.lastGcTime = Date.now();

        this.emit('gcCompleted', gcMetrics);
      };
    }
  }

  /**
   * Calculate GC pressure
   */
  private calculateGcPressure(): number {
    // Simple heuristic: more frequent GC = higher pressure
    const now = Date.now();
    if (this.lastGcTime === 0) return 0;

    const timeSinceLastGc = now - this.lastGcTime;
    const expectedGcInterval = 30000; // 30 seconds baseline

    return Math.min(1.0, expectedGcInterval / Math.max(timeSinceLastGc, 1000));
  }

  /**
   * Calculate GC frequency
   */
  private calculateGcFrequency(): number {
    const monitoringDuration =
      (Date.now() - this.monitoringStartTime) / 1000 / 60; // minutes
    return monitoringDuration > 0 ? this.gcCount / monitoringDuration : 0;
  }

  /**
   * Perform optimization analysis
   */
  private performOptimizationAnalysis(): void {
    if (this.memorySnapshots.length < 10) return; // Need sufficient data

    const efficiencyAnalysis = this.calculateResourceEfficiency();

    if (efficiencyAnalysis.overallEfficiency < 0.7) {
      this.emit('optimizationRecommendation', {
        timestamp: Date.now(),
        efficiency: efficiencyAnalysis,
        recommendations:
          this.generateOptimizationRecommendations(efficiencyAnalysis),
      });
    }
  }

  /**
   * Calculate resource efficiency
   */
  private calculateResourceEfficiency(): ResourceEfficiencyAnalysis {
    const recentMemory = this.memorySnapshots.slice(-10);
    const recentCpu = this.cpuSnapshots.slice(-10);
    const recentNetwork = this.networkSnapshots.slice(-10);

    // Memory efficiency (lower usage = higher efficiency)
    const avgMemoryUsage =
      recentMemory.reduce((sum, m) => sum + m.heapUsed, 0) /
      recentMemory.length;
    const memoryEfficiency = Math.max(
      0,
      1 - avgMemoryUsage / (500 * 1024 * 1024),
    ); // 500MB baseline

    // CPU efficiency (lower usage = higher efficiency)
    const avgCpuUsage =
      recentCpu.reduce((sum, c) => sum + c.totalUsage, 0) / recentCpu.length;
    const cpuEfficiency = Math.max(0, 1 - avgCpuUsage / 100);

    // Network efficiency (higher throughput, lower latency = higher efficiency)
    const avgNetworkLatency =
      recentNetwork.length > 0
        ? recentNetwork.reduce((sum, n) => sum + n.connectionLatency, 0) /
          recentNetwork.length
        : 0;
    const networkEfficiency = Math.max(0, 1 - avgNetworkLatency / 1000); // 1 second baseline

    const overallEfficiency =
      (memoryEfficiency + cpuEfficiency + networkEfficiency) / 3;

    return {
      memoryEfficiency,
      cpuEfficiency,
      networkEfficiency,
      overallEfficiency,
      performanceScore: this.calculatePerformanceScore(),
      sustainabilityScore: this.calculateSustainabilityScore(),
      optimizationPotential: 1 - overallEfficiency,
    };
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(): number {
    // Combine latency, throughput, and resource usage metrics
    const recentSnapshots = Math.min(
      this.memorySnapshots.length,
      this.cpuSnapshots.length,
    );
    if (recentSnapshots < 5) return 0.5; // Default score

    const latencyScore = 0.8; // Placeholder
    const throughputScore = 0.7; // Placeholder
    const stabilityScore =
      1 - this.detectedLeaks.length / Math.max(recentSnapshots, 1);

    return (latencyScore + throughputScore + stabilityScore) / 3;
  }

  /**
   * Calculate sustainability score
   */
  private calculateSustainabilityScore(): number {
    // Measure how well resources are managed over time
    const memoryGrowthTrend = this.calculateMemoryGrowthTrend();
    const cpuStabilityTrend = this.calculateCpuStabilityTrend();

    return (memoryGrowthTrend + cpuStabilityTrend) / 2;
  }

  /**
   * Calculate memory growth trend
   */
  private calculateMemoryGrowthTrend(): number {
    if (this.memorySnapshots.length < 10) return 0.5;

    const growthRates = [];
    for (let i = 1; i < this.memorySnapshots.length; i++) {
      const prev = this.memorySnapshots[i - 1];
      const curr = this.memorySnapshots[i];
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
      const memoryDiff = curr.heapUsed - prev.heapUsed;
      growthRates.push(timeDiff > 0 ? memoryDiff / timeDiff : 0);
    }

    const avgGrowthRate =
      growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    return Math.max(0, 1 - Math.abs(avgGrowthRate) / (1024 * 1024)); // 1MB/s baseline
  }

  /**
   * Calculate CPU stability trend
   */
  private calculateCpuStabilityTrend(): number {
    if (this.cpuSnapshots.length < 10) return 0.5;

    const usageValues = this.cpuSnapshots.map((c) => c.totalUsage);
    const avgUsage =
      usageValues.reduce((sum, usage) => sum + usage, 0) / usageValues.length;
    const variance =
      usageValues.reduce(
        (sum, usage) => sum + Math.pow(usage - avgUsage, 2),
        0,
      ) / usageValues.length;
    const standardDeviation = Math.sqrt(variance);

    // Lower standard deviation = higher stability
    return Math.max(0, 1 - standardDeviation / 50); // 50% baseline
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    efficiency: ResourceEfficiencyAnalysis,
  ): string[] {
    const recommendations: string[] = [];

    if (efficiency.memoryEfficiency < 0.7) {
      recommendations.push('Optimize memory usage patterns');
      recommendations.push(
        'Implement object pooling for frequently created objects',
      );
      recommendations.push('Review memory allocation strategies');
    }

    if (efficiency.cpuEfficiency < 0.7) {
      recommendations.push('Optimize CPU-intensive operations');
      recommendations.push('Consider asynchronous processing for heavy tasks');
      recommendations.push('Implement CPU load balancing');
    }

    if (efficiency.networkEfficiency < 0.7) {
      recommendations.push('Optimize network communication protocols');
      recommendations.push('Implement message batching and compression');
      recommendations.push('Review connection management strategies');
    }

    if (efficiency.sustainabilityScore < 0.7) {
      recommendations.push('Implement resource cleanup mechanisms');
      recommendations.push('Add resource monitoring and alerting');
      recommendations.push('Consider implementing resource quotas');
    }

    return recommendations;
  }

  /**
   * Check alert conditions
   */
  private checkAlertConditions(): void {
    const latestMemory = this.memorySnapshots[this.memorySnapshots.length - 1];
    const latestCpu = this.cpuSnapshots[this.cpuSnapshots.length - 1];

    // Memory alerts
    if (
      latestMemory &&
      latestMemory.heapUsed > this.config.memoryLeakThreshold
    ) {
      this.alertCount++;
      this.emit('alert', {
        type: 'memory',
        severity: 'high',
        message: `Memory usage exceeded threshold: ${(latestMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        timestamp: Date.now(),
      });
    }

    // CPU alerts
    if (latestCpu && latestCpu.totalUsage > this.config.cpuUsageThreshold) {
      this.alertCount++;
      this.emit('alert', {
        type: 'cpu',
        severity: 'high',
        message: `CPU usage exceeded threshold: ${latestCpu.totalUsage.toFixed(2)}%`,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Generate comprehensive monitoring report
   */
  private generateMonitoringReport(): ResourceMonitoringReport {
    const monitoringDuration = performance.now() - this.monitoringStartTime;

    // Calculate peak and average usage
    const peakMemory = this.memorySnapshots.reduce(
      (peak, current) => (current.heapUsed > peak.heapUsed ? current : peak),
      this.memorySnapshots[0],
    );

    const avgMemory = this.calculateAverageMemoryMetrics();

    const peakCpu = this.cpuSnapshots.reduce(
      (peak, current) =>
        current.totalUsage > peak.totalUsage ? current : peak,
      this.cpuSnapshots[0],
    );

    const avgCpu = this.calculateAverageCpuMetrics();

    const peakNetwork =
      this.networkSnapshots.length > 0
        ? this.networkSnapshots.reduce(
            (peak, current) =>
              current.throughput > peak.throughput ? current : peak,
            this.networkSnapshots[0],
          )
        : this.createEmptyNetworkMetrics();

    const avgNetwork = this.calculateAverageNetworkMetrics();

    // Calculate GC performance
    const gcPerformance = this.calculateGcPerformance();

    // Generate efficiency analysis
    const efficiencyAnalysis = this.calculateResourceEfficiency();

    // Generate recommendations
    const recommendations = this.generateFinalRecommendations();

    // Determine compliance status
    const complianceStatus = this.determineComplianceStatus();

    return {
      monitoringDuration,
      totalSamples: this.memorySnapshots.length,
      peakResourceUsage: {
        memory: peakMemory,
        cpu: peakCpu,
        network: peakNetwork,
      },
      averageResourceUsage: {
        memory: avgMemory,
        cpu: avgCpu,
        network: avgNetwork,
      },
      resourceLeaks: this.detectedLeaks,
      performanceBottlenecks: this.performanceBottlenecks,
      efficiencyAnalysis,
      gcPerformance,
      recommendations,
      alertsTriggered: this.alertCount,
      complianceStatus,
    };
  }

  /**
   * Calculate average memory metrics
   */
  private calculateAverageMemoryMetrics(): MemoryMetrics {
    if (this.memorySnapshots.length === 0) {
      return this.createEmptyMemoryMetrics();
    }

    const sums = this.memorySnapshots.reduce(
      (acc, snapshot) => ({
        heapUsed: acc.heapUsed + snapshot.heapUsed,
        heapTotal: acc.heapTotal + snapshot.heapTotal,
        heapFree: acc.heapFree + snapshot.heapFree,
        external: acc.external + snapshot.external,
        rss: acc.rss + snapshot.rss,
        arrayBuffers: acc.arrayBuffers + snapshot.arrayBuffers,
        memoryPressure: acc.memoryPressure + snapshot.memoryPressure,
        leakSuspicion: acc.leakSuspicion + snapshot.leakSuspicion,
      }),
      {
        heapUsed: 0,
        heapTotal: 0,
        heapFree: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0,
        memoryPressure: 0,
        leakSuspicion: 0,
      },
    );

    const count = this.memorySnapshots.length;

    return {
      timestamp: Date.now(),
      heapUsed: sums.heapUsed / count,
      heapTotal: sums.heapTotal / count,
      heapFree: sums.heapFree / count,
      external: sums.external / count,
      rss: sums.rss / count,
      arrayBuffers: sums.arrayBuffers / count,
      memoryPressure: sums.memoryPressure / count,
      leakSuspicion: sums.leakSuspicion / count,
    };
  }

  /**
   * Calculate average CPU metrics
   */
  private calculateAverageCpuMetrics(): CpuMetrics {
    if (this.cpuSnapshots.length === 0) {
      return this.createEmptyCpuMetrics();
    }

    const sums = this.cpuSnapshots.reduce(
      (acc, snapshot) => ({
        userTime: acc.userTime + snapshot.userTime,
        systemTime: acc.systemTime + snapshot.systemTime,
        totalUsage: acc.totalUsage + snapshot.totalUsage,
        cpuPressure: acc.cpuPressure + snapshot.cpuPressure,
      }),
      { userTime: 0, systemTime: 0, totalUsage: 0, cpuPressure: 0 },
    );

    const count = this.cpuSnapshots.length;
    const lastSnapshot = this.cpuSnapshots[this.cpuSnapshots.length - 1];

    return {
      timestamp: Date.now(),
      userTime: sums.userTime / count,
      systemTime: sums.systemTime / count,
      totalUsage: sums.totalUsage / count,
      loadAverage: lastSnapshot.loadAverage,
      cpuPressure: sums.cpuPressure / count,
      coreUtilization: lastSnapshot.coreUtilization,
    };
  }

  /**
   * Calculate average network metrics
   */
  private calculateAverageNetworkMetrics(): NetworkMetrics {
    if (this.networkSnapshots.length === 0) {
      return this.createEmptyNetworkMetrics();
    }

    const sums = this.networkSnapshots.reduce(
      (acc, snapshot) => ({
        activeConnections: acc.activeConnections + snapshot.activeConnections,
        bytesTransmitted: acc.bytesTransmitted + snapshot.bytesTransmitted,
        bytesReceived: acc.bytesReceived + snapshot.bytesReceived,
        throughput: acc.throughput + snapshot.throughput,
        connectionLatency: acc.connectionLatency + snapshot.connectionLatency,
        errorRate: acc.errorRate + snapshot.errorRate,
      }),
      {
        activeConnections: 0,
        bytesTransmitted: 0,
        bytesReceived: 0,
        throughput: 0,
        connectionLatency: 0,
        errorRate: 0,
      },
    );

    const count = this.networkSnapshots.length;

    return {
      timestamp: Date.now(),
      activeConnections: sums.activeConnections / count,
      bytesTransmitted: sums.bytesTransmitted / count,
      bytesReceived: sums.bytesReceived / count,
      packetsTransmitted: 0,
      packetsReceived: 0,
      connectionLatency: sums.connectionLatency / count,
      throughput: sums.throughput / count,
      errorRate: sums.errorRate / count,
      connectionDropRate: 0,
    };
  }

  /**
   * Calculate GC performance metrics
   */
  private calculateGcPerformance(): {
    totalGcTime: number;
    avgGcDuration: number;
    gcFrequency: number;
    gcEfficiency: number;
  } {
    if (this.gcSnapshots.length === 0) {
      return {
        totalGcTime: 0,
        avgGcDuration: 0,
        gcFrequency: 0,
        gcEfficiency: 1,
      };
    }

    const totalGcTime = this.gcSnapshots.reduce(
      (sum, gc) => sum + gc.duration,
      0,
    );
    const avgGcDuration = totalGcTime / this.gcSnapshots.length;
    const gcFrequency = this.calculateGcFrequency();

    // GC efficiency: higher freed memory per GC = higher efficiency
    const totalFreedMemory = this.gcSnapshots.reduce(
      (sum, gc) => sum + gc.freedMemory,
      0,
    );
    const gcEfficiency =
      totalFreedMemory > 0
        ? Math.min(1, totalFreedMemory / (totalGcTime * 1024 * 1024))
        : 0;

    return {
      totalGcTime,
      avgGcDuration,
      gcFrequency,
      gcEfficiency,
    };
  }

  /**
   * Generate final recommendations
   */
  private generateFinalRecommendations(): string[] {
    const recommendations: string[] = [];

    // Memory recommendations
    if (this.detectedLeaks.some((leak) => leak.leakType === 'memory')) {
      recommendations.push('Investigate and fix detected memory leaks');
      recommendations.push('Implement regular garbage collection monitoring');
    }

    // CPU recommendations
    if (
      this.performanceBottlenecks.some(
        (bottleneck) => bottleneck.bottleneckType === 'cpu',
      )
    ) {
      recommendations.push('Optimize CPU-intensive operations');
      recommendations.push(
        'Consider implementing worker threads for heavy computations',
      );
    }

    // General recommendations
    if (this.alertCount > 0) {
      recommendations.push(
        'Review alert thresholds and implement proactive monitoring',
      );
    }

    return recommendations;
  }

  /**
   * Determine compliance status
   */
  private determineComplianceStatus(): 'compliant' | 'warning' | 'critical' {
    const criticalLeaks = this.detectedLeaks.filter(
      (leak) => leak.severity === 'critical',
    );
    const criticalBottlenecks = this.performanceBottlenecks.filter(
      (bottleneck) => bottleneck.severity === 'critical',
    );

    if (criticalLeaks.length > 0 || criticalBottlenecks.length > 0) {
      return 'critical';
    }

    if (
      this.detectedLeaks.length > 0 ||
      this.performanceBottlenecks.length > 0 ||
      this.alertCount > 5
    ) {
      return 'warning';
    }

    return 'compliant';
  }

  /**
   * Create empty metrics objects
   */
  private createEmptyMemoryMetrics(): MemoryMetrics {
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      heapFree: 0,
      external: 0,
      rss: 0,
      arrayBuffers: 0,
      memoryPressure: 0,
      leakSuspicion: 0,
    };
  }

  private createEmptyCpuMetrics(): CpuMetrics {
    return {
      timestamp: Date.now(),
      userTime: 0,
      systemTime: 0,
      totalUsage: 0,
      loadAverage: [0, 0, 0],
      cpuPressure: 0,
      coreUtilization: [],
    };
  }

  private createEmptyNetworkMetrics(): NetworkMetrics {
    return {
      timestamp: Date.now(),
      activeConnections: 0,
      bytesTransmitted: 0,
      bytesReceived: 0,
      packetsTransmitted: 0,
      packetsReceived: 0,
      connectionLatency: 0,
      throughput: 0,
      errorRate: 0,
      connectionDropRate: 0,
    };
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): {
    active: boolean;
    duration: number;
    samples: number;
    leaks: number;
    bottlenecks: number;
    alerts: number;
  } {
    return {
      active: this.monitoringActive,
      duration: this.monitoringActive
        ? performance.now() - this.monitoringStartTime
        : 0,
      samples: this.memorySnapshots.length,
      leaks: this.detectedLeaks.length,
      bottlenecks: this.performanceBottlenecks.length,
      alerts: this.alertCount,
    };
  }

  /**
   * Get real-time metrics snapshot
   */
  getCurrentMetrics(): {
    memory: MemoryMetrics | null;
    cpu: CpuMetrics | null;
    network: NetworkMetrics | null;
  } {
    return {
      memory:
        this.memorySnapshots.length > 0
          ? this.memorySnapshots[this.memorySnapshots.length - 1]
          : null,
      cpu:
        this.cpuSnapshots.length > 0
          ? this.cpuSnapshots[this.cpuSnapshots.length - 1]
          : null,
      network:
        this.networkSnapshots.length > 0
          ? this.networkSnapshots[this.networkSnapshots.length - 1]
          : null,
    };
  }
}
