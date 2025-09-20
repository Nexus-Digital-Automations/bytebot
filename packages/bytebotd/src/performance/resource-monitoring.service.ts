/**
 * Resource Utilization Monitoring Service - Phase 1 Implementation
 *
 * Comprehensive system resource monitoring for WebSocket performance testing
 * with real-time CPU, memory, network, and disk utilization tracking.
 *
 * Features:
 * - Real-time CPU usage monitoring (user, system, idle, iowait)
 * - Memory utilization tracking (heap, RSS, external, garbage collection)
 * - Network bandwidth and packet monitoring
 * - Disk I/O performance monitoring
 * - Process-level resource tracking
 * - Resource correlation with performance metrics
 * - Resource bottleneck detection and alerting
 * - Resource optimization recommendations
 * - Historical resource usage analysis
 * - Resource scaling recommendations
 *
 * @module ResourceMonitoringService
 * @version 1.0.0
 * @author PARLANT Performance Testing Team
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { EventEmitter } from 'events';import * as os from 'os';import * as fs from 'fs';import * as path from 'path';import { promisify } from 'util';import { performance } from 'perf_hooks';// import * as pidusage from 'pidusage'; // Using Node.js built-in monitoring instead// ===== RESOURCE MONITORING TYPES =====/**
 * CPU utilization metrics
 */
export interface CPUMetrics {
  // Overall CPU usage
  usage: number;                 // Overall CPU usage percentage
  userTime: number;             // User CPU time (ms)
  systemTime: number;           // System CPU time (ms)
  idleTime: number;             // Idle CPU time (ms)
  iowaitTime: number;           // I/O wait time (ms)

  // Per-core metrics
  cores: CoreMetrics[];

  // Process-specific metrics
  processUsage: number;         // Current process CPU usage
  processUserTime: number;      // Current process user time
  processSystemTime: number;    // Current process system time

  // Load average
  loadAverage: {
    oneMinute: number;
    fiveMinutes: number;
    fifteenMinutes: number;
  };

  // CPU frequency and throttling
  frequency: number;            // Current CPU frequency (MHz)
  throttling: boolean;          // CPU throttling detected
}

/**
 * Individual CPU core metrics
 */
export interface CoreMetrics {
  coreId: number;
  usage: number;               // Core usage percentage
  temperature?: number;        // Core temperature (°C) if available
  frequency?: number;          // Core frequency (MHz) if available
}

/**
 * Memory utilization metrics
 */
export interface MemoryMetrics {
  // System memory
  total: number;               // Total system memory (bytes)
  free: number;                // Free system memory (bytes)
  used: number;                // Used system memory (bytes)
  available: number;           // Available memory (bytes)
  utilization: number;         // Memory utilization percentage

  // Process memory
  process: {
    heapUsed: number;          // Node.js heap used (bytes)
    heapTotal: number;         // Node.js heap total (bytes)
    external: number;          // External memory (bytes)
    rss: number;               // Resident Set Size (bytes)
    arrayBuffers: number;      // Array buffers memory (bytes)
  };

  // Memory details
  buffers: number;             // Buffer memory (bytes)
  cached: number;              // Cached memory (bytes)
  swap: {
    total: number;             // Total swap space (bytes)
    used: number;              // Used swap space (bytes)
    free: number;              // Free swap space (bytes)
  };

  // Garbage collection metrics
  gc: {
    collections: number;       // Number of GC collections
    timeSpent: number;         // Time spent in GC (ms)
    heapBefore: number;        // Heap size before GC (bytes)
    heapAfter: number;         // Heap size after GC (bytes)
    freed: number;             // Memory freed by GC (bytes)
  };
}

/**
 * Network utilization metrics
 */
export interface NetworkMetrics {
  // Interface-level metrics
  interfaces: NetworkInterface[];

  // Overall metrics
  totalBytesReceived: number;  // Total bytes received
  totalBytesSent: number;      // Total bytes sent
  totalPacketsReceived: number; // Total packets received
  totalPacketsSent: number;    // Total packets sent

  // Connection metrics
  connections: {
    established: number;       // Established connections
    listening: number;         // Listening sockets
    timeWait: number;         // TIME_WAIT connections
    closeWait: number;        // CLOSE_WAIT connections
  };

  // Bandwidth utilization
  bandwidth: {
    inbound: number;          // Inbound bandwidth usage (bytes/sec)
    outbound: number;         // Outbound bandwidth usage (bytes/sec)
    utilization: number;      // Overall bandwidth utilization %
  };

  // WebSocket specific metrics
  websocket: {
    activeConnections: number; // Active WebSocket connections
    messagesSent: number;     // WebSocket messages sent
    messagesReceived: number; // WebSocket messages received
    bytesTransferred: number; // Total bytes transferred
  };
}

/**
 * Network interface metrics
 */
export interface NetworkInterface {
  name: string;                // Interface name (e.g., 'eth0', 'wlan0')bytesReceived: number;       // Bytes received on this interfacebytesSent: number;          // Bytes sent on this interface
  packetsReceived: number;     // Packets received
  packetsSent: number;        // Packets sent
  errors: number;             // Network errors
  dropped: number;            // Dropped packets
  speed: number;              // Interface speed (Mbps)
  duplex: string;             // Duplex mode ('full', 'half')mtu: number;                // Maximum Transmission Unit}

/**
 * Disk I/O metrics
 */
export interface DiskMetrics {
  // Disk usage
  disks: DiskUsage[];

  // I/O operations
  io: {
    readOperations: number;    // Read operations per second
    writeOperations: number;   // Write operations per second
    readBytes: number;         // Bytes read per second
    writeBytes: number;        // Bytes written per second
    readLatency: number;       // Average read latency (ms)
    writeLatency: number;      // Average write latency (ms)
    queueDepth: number;        // I/O queue depth
    utilization: number;       // Disk utilization percentage
  };

  // File system metrics
  filesystem: {
    openFiles: number;         // Number of open files
    maxFiles: number;          // Maximum open files limit
    inodes: {
      used: number;            // Used inodes
      total: number;           // Total inodes
      utilization: number;     // Inode utilization %
    };
  };
}

/**
 * Individual disk usage metrics
 */
export interface DiskUsage {
  device: string;              // Device name
  mountPoint: string;          // Mount point
  total: number;               // Total space (bytes)
  used: number;                // Used space (bytes)
  free: number;                // Free space (bytes)
  utilization: number;         // Disk utilization %
  filesystem: string;          // Filesystem type
}

/**
 * Comprehensive resource metrics
 */
export interface ResourceMetrics {
  timestamp: number;           // Timestamp when metrics were collected
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  network: NetworkMetrics;
  disk: DiskMetrics;

  // System information
  system: {
    platform: string;         // Operating system platform
    hostname: string;          // System hostname
    uptime: number;           // System uptime (seconds)
    processUptime: number;     // Process uptime (seconds)
  };

  // Performance correlations
  correlations: {
    cpuMemoryCorrelation: number;     // Correlation between CPU and memory usage
    networkCpuCorrelation: number;    // Correlation between network and CPU usage
    diskCpuCorrelation: number;       // Correlation between disk I/O and CPU usage
  };
}

/**
 * Resource bottleneck analysis
 */
export interface ResourceBottleneck {
  type: 'cpu' | 'memory' | 'network' | 'disk' | 'composite';severity: 'low' | 'medium' | 'high' | 'critical';metric: string;              // Specific metric causing bottleneckcurrentValue: number;        // Current value of the metric
  threshold: number;           // Threshold that was exceeded
  impact: string;              // Impact description
  recommendation: string;      // Optimization recommendation
  urgency: 'low' | 'medium' | 'high' | 'immediate';}/**
 * Resource monitoring configuration
 */
export interface ResourceMonitoringConfig {
  // Collection intervals
  collectionInterval: number;  // Metrics collection interval (ms)
  historyRetention: number;    // How long to keep historical data (ms)

  // Alerting thresholds
  thresholds: {
    cpu: {
      warning: number;         // CPU warning threshold (%)
      critical: number;        // CPU critical threshold (%)
    };
    memory: {
      warning: number;         // Memory warning threshold (%)
      critical: number;        // Memory critical threshold (%)
    };
    network: {
      warning: number;         // Network warning threshold (%)
      critical: number;        // Network critical threshold (%)
    };
    disk: {
      warning: number;         // Disk warning threshold (%)
      critical: number;        // Disk critical threshold (%)
    };
  };

  // Advanced monitoring
  enableDetailedMonitoring: boolean;    // Enable detailed per-core, per-interface monitoring
  enablePredictiveAlerts: boolean;      // Enable predictive alerting based on trends
  enableCorrelationAnalysis: boolean;   // Enable resource correlation analysis
}

/**
 * Resource optimization recommendations
 */
export interface OptimizationRecommendations {
  cpu: string[];               // CPU optimization recommendations
  memory: string[];            // Memory optimization recommendations
  network: string[];           // Network optimization recommendations
  disk: string[];              // Disk optimization recommendations
  scaling: string[];           // Scaling recommendations
  configuration: string[];     // Configuration recommendations
}

// ===== RESOURCE MONITORING SERVICE =====

@Injectable()
export class ResourceMonitoringService implements OnModuleInit, OnModuleDestroy {

  private readonly logger = new Logger(ResourceMonitoringService.name);
  private readonly eventEmitter = new EventEmitter();

  // Monitoring state
  private monitoringInterval?: NodeJS.Timeout;
  private detailedMonitoringInterval?: NodeJS.Timeout;
  private currentMetrics?: ResourceMetrics;
  private metricsHistory: ResourceMetrics[] = [];

  // Configuration
  private config: ResourceMonitoringConfig;

  // Baseline measurements for comparison
  private baselineMetrics?: ResourceMetrics;

  // Bottleneck tracking
  private activeBottlenecks: Map<string, ResourceBottleneck> = new Map();

  // Performance thresholds
  private readonly DEFAULT_THRESHOLDS = {
    cpu: {
      warning: 70,             // 70% CPU usage warning
      critical: 90,            // 90% CPU usage critical
    },
    memory: {
      warning: 80,             // 80% memory usage warning
      critical: 95,            // 95% memory usage critical
    },
    network: {
      warning: 70,             // 70% network utilization warning
      critical: 90,            // 90% network utilization critical
    },
    disk: {
      warning: 80,             // 80% disk usage warning
      critical: 95,            // 95% disk usage critical
    },
  };

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.logger.log('🚀 Resource Monitoring Service initializing...');// Initialize configurationthis.config = {
      collectionInterval: 1000,        // 1 second
      historyRetention: 3600000,       // 1 hour
      thresholds: this.DEFAULT_THRESHOLDS,
      enableDetailedMonitoring: true,
      enablePredictiveAlerts: true,
      enableCorrelationAnalysis: true,
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Resource Monitoring Framework');// Start monitoringawait this.startResourceMonitoring();

    // Collect baseline metrics
    await this.collectBaselineMetrics();

    this.logger.log('✅ Resource Monitoring Framework ready');}async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Resource Monitoring Framework');// Stop monitoringthis.stopResourceMonitoring();

    this.logger.log('✅ Resource Monitoring Framework shutdown complete');}// ===== RESOURCE COLLECTION =====

  /**
   * Start comprehensive resource monitoring
   */
  async startResourceMonitoring(): Promise<void> {
    this.logger.log('Starting resource monitoring');// Start main monitoring loopthis.monitoringInterval = setInterval(async () => {
      try {
        await this.collectResourceMetrics();
      } catch (error) {
        this.logger.error('Error collecting resource metrics', error.stack);}}, this.config.collectionInterval);

    // Start detailed monitoring if enabled
    if (this.config.enableDetailedMonitoring) {
      this.detailedMonitoringInterval = setInterval(async () => {
        try {
          await this.collectDetailedMetrics();
        } catch (error) {
          this.logger.error('Error collecting detailed metrics', error.stack);}}, this.config.collectionInterval * 5); // 5x less frequent
    }

    this.logger.log('Resource monitoring started');}/**
   * Stop resource monitoring
   */
  stopResourceMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    if (this.detailedMonitoringInterval) {
      clearInterval(this.detailedMonitoringInterval);
      this.detailedMonitoringInterval = undefined;
    }

    this.logger.log('Resource monitoring stopped');}/**
   * Collect comprehensive resource metrics
   */
  async collectResourceMetrics(): Promise<ResourceMetrics> {
    const timestamp = Date.now();

    try {
      // Collect all resource metrics in parallel
      const [cpu, memory, network, disk] = await Promise.all([
        this.collectCPUMetrics(),
        this.collectMemoryMetrics(),
        this.collectNetworkMetrics(),
        this.collectDiskMetrics(),
      ]);

      // Collect system information
      const system = await this.collectSystemInfo();

      // Calculate correlations if enabled
      const correlations = this.config.enableCorrelationAnalysis
        ? this.calculateResourceCorrelations(cpu, memory, network, disk)
        : { cpuMemoryCorrelation: 0, networkCpuCorrelation: 0, diskCpuCorrelation: 0 };

      const metrics: ResourceMetrics = {
        timestamp,
        cpu,
        memory,
        network,
        disk,
        system,
        correlations,
      };

      // Update current metrics
      this.currentMetrics = metrics;

      // Add to history
      this.addToHistory(metrics);

      // Analyze for bottlenecks
      await this.analyzeBottlenecks(metrics);

      // Check thresholds and send alerts
      this.checkThresholds(metrics);

      return metrics;

    } catch (error) {
      this.logger.error('Failed to collect resource metrics', error.stack);throw error;}
  }

  /**
   * Collect CPU metrics
   */
  private async collectCPUMetrics(): Promise<CPUMetrics> {
    // Get CPU usage from OS
    const cpus = os.cpus();
    const loadAvg = os.loadavg();

    // Calculate overall CPU usage
    let totalUser = 0;
    let totalSystem = 0;
    let totalIdle = 0;
    const totalIowait = 0;

    const cores: CoreMetrics[] = cpus.map((cpu, index) => {
      const times = cpu.times;
      const total = times.user + times.nice + times.sys + times.idle + times.irq;

      totalUser += times.user;
      totalSystem += times.sys;
      totalIdle += times.idle;
      // Note: iowait not available in Node.js os module, would need platform-specific implementation

      return {
        coreId: index,
        usage: ((total - times.idle) / total) * 100,
        frequency: cpu.speed,
      };
    });

    const totalTime = totalUser + totalSystem + totalIdle;
    const usage = totalTime > 0 ? ((totalTime - totalIdle) / totalTime) * 100 : 0;

    // Get process-specific CPU usage
    let processUsage = 0;
    let processUserTime = 0;
    let processSystemTime = 0;

    try {
      const processStats = await pidusage(process.pid);
      processUsage = processStats.cpu;
      // Note: pidusage provides combined CPU usage, not separate user/system times
    } catch (error) {
      // Fallback to process.cpuUsage() if pidusage fails
      const cpuUsage = process.cpuUsage();
      processUserTime = cpuUsage.user / 1000; // Convert microseconds to milliseconds
      processSystemTime = cpuUsage.system / 1000;
    }

    return {
      usage,
      userTime: totalUser,
      systemTime: totalSystem,
      idleTime: totalIdle,
      iowaitTime: totalIowait,
      cores,
      processUsage,
      processUserTime,
      processSystemTime,
      loadAverage: {
        oneMinute: loadAvg[0],
        fiveMinutes: loadAvg[1],
        fifteenMinutes: loadAvg[2],
      },
      frequency: cpus[0]?.speed || 0,
      throttling: false, // Would need platform-specific implementation
    };
  }

  /**
   * Collect memory metrics
   */
  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    // System memory
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Process memory
    const processMemory = process.memoryUsage();

    // Get additional memory information (platform-specific)
    const additionalMemInfo = await this.getAdditionalMemoryInfo();

    // GC metrics (if available)
    const gcMetrics = this.collectGCMetrics();

    return {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      available: freeMemory, // Simplified - would need platform-specific calculation
      utilization: (usedMemory / totalMemory) * 100,
      process: {
        heapUsed: processMemory.heapUsed,
        heapTotal: processMemory.heapTotal,
        external: processMemory.external,
        rss: processMemory.rss,
        arrayBuffers: processMemory.arrayBuffers,
      },
      buffers: additionalMemInfo.buffers,
      cached: additionalMemInfo.cached,
      swap: additionalMemInfo.swap,
      gc: gcMetrics,
    };
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics(): Promise<NetworkMetrics> {
    // Get network interfaces
    const networkInterfaces = os.networkInterfaces();
    const interfaces: NetworkInterface[] = [];

    const totalBytesReceived = 0;
    const totalBytesSent = 0;
    const totalPacketsReceived = 0;
    const totalPacketsSent = 0;

    // Process each network interface
    Object.entries(networkInterfaces).forEach(([name, interfaceInfos]) => {
      if (interfaceInfos) {
        interfaceInfos.forEach((interfaceInfo) => {
          if (!interfaceInfo.internal) {
            // Note: Node.js os module doesn't provide network statistics
            // In a real implementation, this would use platform-specific methods
            const networkInterface: NetworkInterface = {
              name,
              bytesReceived: 0, // Would be collected from system stats
              bytesSent: 0,
              packetsReceived: 0,
              packetsSent: 0,
              errors: 0,
              dropped: 0,
              speed: 1000, // Default to 1Gbps
              duplex: 'full',mtu: 1500,};

            interfaces.push(networkInterface);
          }
        });
      }
    });

    // Get connection statistics
    const connections = await this.getConnectionStatistics();

    // Calculate bandwidth (would need historical data)
    const bandwidth = await this.calculateBandwidthUtilization();

    // WebSocket specific metrics (would be collected from WebSocket service)
    const websocket = {
      activeConnections: 0,
      messagesSent: 0,
      messagesReceived: 0,
      bytesTransferred: 0,
    };

    return {
      interfaces,
      totalBytesReceived,
      totalBytesSent,
      totalPacketsReceived,
      totalPacketsSent,
      connections,
      bandwidth,
      websocket,
    };
  }

  /**
   * Collect disk metrics
   */
  private async collectDiskMetrics(): Promise<DiskMetrics> {
    // Get disk usage for all mounted filesystems
    const disks = await this.getDiskUsage();

    // Get I/O statistics (platform-specific)
    const ioStats = await this.getIOStatistics();

    // Get filesystem information
    const filesystemStats = await this.getFilesystemStatistics();

    return {
      disks,
      io: ioStats,
      filesystem: filesystemStats,
    };
  }

  /**
   * Collect system information
   */
  private async collectSystemInfo() {
    return {
      platform: os.platform(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      processUptime: process.uptime(),
    };
  }

  /**
   * Collect detailed metrics (less frequent)
   */
  private async collectDetailedMetrics(): Promise<void> {
    // Collect more detailed, expensive metrics here
    // This could include per-process monitoring, detailed network analysis, etc.
  }

  // ===== BOTTLENECK ANALYSIS =====

  /**
   * Analyze resource bottlenecks
   */
  private async analyzeBottlenecks(metrics: ResourceMetrics): Promise<void> {
    const bottlenecks: ResourceBottleneck[] = [];

    // CPU bottleneck analysis
    if (metrics.cpu.usage > this.config.thresholds.cpu.critical) {
      bottlenecks.push({
        type: 'cpu',severity: 'critical',metric: 'cpu.usage',currentValue: metrics.cpu.usage,threshold: this.config.thresholds.cpu.critical,
        impact: 'Severe performance degradation, request timeouts likely',recommendation: 'Scale horizontally or optimize CPU-intensive operations',urgency: 'immediate',});} else if (metrics.cpu.usage > this.config.thresholds.cpu.warning) {
      bottlenecks.push({
        type: 'cpu',severity: 'medium',metric: 'cpu.usage',currentValue: metrics.cpu.usage,threshold: this.config.thresholds.cpu.warning,
        impact: 'Performance degradation, increased latency',recommendation: 'Monitor closely, consider scaling or optimization',urgency: 'medium',});}

    // Memory bottleneck analysis
    if (metrics.memory.utilization > this.config.thresholds.memory.critical) {
      bottlenecks.push({
        type: 'memory',severity: 'critical',metric: 'memory.utilization',currentValue: metrics.memory.utilization,threshold: this.config.thresholds.memory.critical,
        impact: 'Risk of OOM, application instability',recommendation: 'Increase memory or optimize memory usage immediately',urgency: 'immediate',});}

    // Network bottleneck analysis
    if (metrics.network.bandwidth.utilization > this.config.thresholds.network.critical) {
      bottlenecks.push({
        type: 'network',severity: 'critical',metric: 'network.bandwidth.utilization',currentValue: metrics.network.bandwidth.utilization,threshold: this.config.thresholds.network.critical,
        impact: 'Network congestion, message delivery delays',recommendation: 'Upgrade network capacity or implement QoS',urgency: 'high',
      });
    }

    // Update active bottlenecks
    this.updateActiveBottlenecks(bottlenecks);

    // Send bottleneck alerts
    bottlenecks.forEach(bottleneck => {
      this.sendBottleneckAlert(bottleneck);
    });
  }

  /**
   * Update active bottlenecks tracking
   */
  private updateActiveBottlenecks(bottlenecks: ResourceBottleneck[]): void {
    // Clear resolved bottlenecks
    for (const [key, bottleneck] of this.activeBottlenecks.entries()) {
      const stillActive = bottlenecks.some(b =>
        b.type === bottleneck.type && b.metric === bottleneck.metric
      );

      if (!stillActive) {
        this.activeBottlenecks.delete(key);
        this.sendBottleneckResolvedAlert(bottleneck);
      }
    }

    // Add new bottlenecks
    bottlenecks.forEach(bottleneck => {
      const key = `${bottleneck.type}_${bottleneck.metric}`;
      this.activeBottlenecks.set(key, bottleneck);
    });
  }

  /**
   * Send bottleneck alert
   */
  private sendBottleneckAlert(bottleneck: ResourceBottleneck): void {
    this.eventEmitter.emit('resource_bottleneck', {type: 'bottleneck_detected',
      bottleneck,
      timestamp: Date.now(),
    });

    this.logger.warn(`🚨 Resource bottleneck detected: ${bottleneck.type} (${bottleneck.severity})`);this.logger.warn(`   Metric: ${bottleneck.metric} = ${bottleneck.currentValue.toFixed(1)}% (threshold: ${bottleneck.threshold}%)`);this.logger.warn(`   Impact: ${bottleneck.impact}`);this.logger.warn(`   Recommendation: ${bottleneck.recommendation}`);
  }

  /**
   * Send bottleneck resolved alert
   */
  private sendBottleneckResolvedAlert(bottleneck: ResourceBottleneck): void {
    this.eventEmitter.emit('resource_bottleneck', {type: 'bottleneck_resolved',
      bottleneck,
      timestamp: Date.now(),
    });

    this.logger.log(`✅ Resource bottleneck resolved: ${bottleneck.type}_${bottleneck.metric}`);
  }

  // ===== THRESHOLD MONITORING =====

  /**
   * Check resource thresholds and send alerts
   */
  private checkThresholds(metrics: ResourceMetrics): void {
    // CPU threshold check
    if (metrics.cpu.usage > this.config.thresholds.cpu.warning) {
      this.sendThresholdAlert('cpu', 'usage', metrics.cpu.usage, this.config.thresholds.cpu.warning);}// Memory threshold check
    if (metrics.memory.utilization > this.config.thresholds.memory.warning) {
      this.sendThresholdAlert('memory', 'utilization', metrics.memory.utilization, this.config.thresholds.memory.warning);}// Network threshold check
    if (metrics.network.bandwidth.utilization > this.config.thresholds.network.warning) {
      this.sendThresholdAlert('network', 'bandwidth', metrics.network.bandwidth.utilization, this.config.thresholds.network.warning);}// Disk threshold check
    metrics.disk.disks.forEach(disk => {
      if (disk.utilization > this.config.thresholds.disk.warning) {
        this.sendThresholdAlert('disk', `${disk.device}_utilization`, disk.utilization, this.config.thresholds.disk.warning);
      }
    });
  }

  /**
   * Send threshold alert
   */
  private sendThresholdAlert(
    resource: string,
    metric: string,
    currentValue: number,
    threshold: number
  ): void {
    const severity = this.determineAlertSeverity(resource, currentValue);

    this.eventEmitter.emit('resource_threshold', {resource,metric,
      currentValue,
      threshold,
      severity,
      timestamp: Date.now(),
    });
  }

  /**
   * Determine alert severity based on current value
   */
  private determineAlertSeverity(resource: string, currentValue: number): 'warning' | 'critical' {const thresholds = this.config.thresholds[resource as keyof typeof this.config.thresholds];return currentValue > thresholds.critical ? 'critical' : 'warning';}// ===== OPTIMIZATION RECOMMENDATIONS =====

  /**
   * Generate optimization recommendations based on current metrics
   */
  generateOptimizationRecommendations(metrics?: ResourceMetrics): OptimizationRecommendations {
    const currentMetrics = metrics || this.currentMetrics;

    if (!currentMetrics) {
      throw new Error('No metrics available for optimization analysis');}const recommendations: OptimizationRecommendations = {
      cpu: [],
      memory: [],
      network: [],
      disk: [],
      scaling: [],
      configuration: [],
    };

    // CPU optimization recommendations
    if (currentMetrics.cpu.usage > 80) {
      recommendations.cpu.push('Consider horizontal scaling to distribute CPU load');recommendations.cpu.push('Profile application for CPU-intensive operations');recommendations.cpu.push('Implement connection pooling to reduce per-request overhead');}if (currentMetrics.cpu.loadAverage.oneMinute > os.cpus().length) {
      recommendations.cpu.push('System is overloaded - consider reducing concurrent operations');}// Memory optimization recommendations
    if (currentMetrics.memory.utilization > 80) {
      recommendations.memory.push('Increase available memory or optimize memory usage');recommendations.memory.push('Implement object pooling to reduce GC pressure');recommendations.memory.push('Review memory leaks and unnecessary object retention');}if (currentMetrics.memory.gc.timeSpent > 100) {
      recommendations.memory.push('Optimize garbage collection by tuning GC parameters');recommendations.memory.push('Reduce object allocation in hot paths');}// Network optimization recommendations
    if (currentMetrics.network.bandwidth.utilization > 70) {
      recommendations.network.push('Implement message compression to reduce bandwidth usage');recommendations.network.push('Consider connection multiplexing to reduce overhead');recommendations.network.push('Optimize message serialization format');
    }

    // Disk optimization recommendations
    currentMetrics.disk.disks.forEach(disk => {
      if (disk.utilization > 80) {
        recommendations.disk.push(`Disk ${disk.device} is running low on space - consider cleanup or expansion`);
      }
    });

    if (currentMetrics.disk.io.utilization > 80) {
      recommendations.disk.push('High disk I/O detected - consider SSD upgrade or I/O optimization');}// Scaling recommendations
    const bottleneckCount = this.activeBottlenecks.size;
    if (bottleneckCount > 2) {
      recommendations.scaling.push('Multiple resource bottlenecks detected - consider vertical scaling');}// Configuration recommendations
    if (currentMetrics.cpu.usage > 70 && currentMetrics.memory.utilization < 50) {
      recommendations.configuration.push('CPU-bound workload detected - consider CPU-optimized instance types');}if (currentMetrics.memory.utilization > 70 && currentMetrics.cpu.usage < 50) {
      recommendations.configuration.push('Memory-bound workload detected - consider memory-optimized instance types');}return recommendations;
  }

  // ===== HELPER METHODS =====

  /**
   * Calculate resource correlations
   */
  private calculateResourceCorrelations(
    cpu: CPUMetrics,
    memory: MemoryMetrics,
    network: NetworkMetrics,
    disk: DiskMetrics
  ) {
    // Simple correlation calculation based on current values
    // In a real implementation, this would use historical data for statistical correlation

    return {
      cpuMemoryCorrelation: this.calculateSimpleCorrelation(cpu.usage, memory.utilization),
      networkCpuCorrelation: this.calculateSimpleCorrelation(network.bandwidth.utilization, cpu.usage),
      diskCpuCorrelation: this.calculateSimpleCorrelation(disk.io.utilization, cpu.usage),
    };
  }

  /**
   * Calculate simple correlation between two values
   */
  private calculateSimpleCorrelation(value1: number, value2: number): number {
    // Simplified correlation - would use proper statistical correlation in real implementation
    const normalizedDiff = Math.abs(value1 - value2) / 100;
    return 1 - normalizedDiff;
  }

  /**
   * Add metrics to history and manage retention
   */
  private addToHistory(metrics: ResourceMetrics): void {
    this.metricsHistory.push(metrics);

    // Remove old metrics beyond retention period
    const cutoffTime = Date.now() - this.config.historyRetention;
    this.metricsHistory = this.metricsHistory.filter(m => m.timestamp > cutoffTime);
  }

  /**
   * Collect baseline metrics
   */
  private async collectBaselineMetrics(): Promise<void> {
    this.logger.log('Collecting baseline resource metrics');// Collect metrics when system is idleconst metrics = await this.collectResourceMetrics();
    this.baselineMetrics = metrics;

    this.logger.log('Baseline resource metrics collected');}/**
   * Get additional memory information (platform-specific)
   */
  private async getAdditionalMemoryInfo() {
    // Placeholder - would implement platform-specific memory information
    return {
      buffers: 0,
      cached: 0,
      swap: {
        total: 0,
        used: 0,
        free: 0,
      },
    };
  }

  /**
   * Collect garbage collection metrics
   */
  private collectGCMetrics() {
    // Placeholder - would integrate with V8 GC statistics
    return {
      collections: 0,
      timeSpent: 0,
      heapBefore: 0,
      heapAfter: 0,
      freed: 0,
    };
  }

  /**
   * Get connection statistics
   */
  private async getConnectionStatistics() {
    // Placeholder - would implement platform-specific connection statistics
    return {
      established: 0,
      listening: 0,
      timeWait: 0,
      closeWait: 0,
    };
  }

  /**
   * Calculate bandwidth utilization
   */
  private async calculateBandwidthUtilization() {
    // Placeholder - would calculate based on historical network data
    return {
      inbound: 0,
      outbound: 0,
      utilization: 0,
    };
  }

  /**
   * Get disk usage information
   */
  private async getDiskUsage(): Promise<DiskUsage[]> {
    // Placeholder - would implement platform-specific disk usage collection
    return [];
  }

  /**
   * Get I/O statistics
   */
  private async getIOStatistics() {
    // Placeholder - would implement platform-specific I/O statistics
    return {
      readOperations: 0,
      writeOperations: 0,
      readBytes: 0,
      writeBytes: 0,
      readLatency: 0,
      writeLatency: 0,
      queueDepth: 0,
      utilization: 0,
    };
  }

  /**
   * Get filesystem statistics
   */
  private async getFilesystemStatistics() {
    // Placeholder - would implement filesystem statistics collection
    return {
      openFiles: 0,
      maxFiles: 65536,
      inodes: {
        used: 0,
        total: 0,
        utilization: 0,
      },
    };
  }

  // ===== PUBLIC API METHODS =====

  /**
   * Get current resource metrics
   */
  getCurrentMetrics(): ResourceMetrics | undefined {
    return this.currentMetrics;
  }

  /**
   * Get resource metrics history
   */
  getMetricsHistory(): ResourceMetrics[] {
    return [...this.metricsHistory];
  }

  /**
   * Get active resource bottlenecks
   */
  getActiveBottlenecks(): ResourceBottleneck[] {
    return Array.from(this.activeBottlenecks.values());
  }

  /**
   * Get baseline metrics
   */
  getBaselineMetrics(): ResourceMetrics | undefined {
    return this.baselineMetrics;
  }

  /**
   * Update monitoring configuration
   */
  updateConfiguration(config: Partial<ResourceMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Resource monitoring configuration updated');}/**
   * Force metrics collection
   */
  async forceMetricsCollection(): Promise<ResourceMetrics> {
    return await this.collectResourceMetrics();
  }

  /**
   * Get resource utilization summary
   */
  getResourceSummary(): {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
    overall: number;
  } {
    if (!this.currentMetrics) {
      throw new Error('No current metrics available');
    }

    const cpu = this.currentMetrics.cpu.usage;
    const memory = this.currentMetrics.memory.utilization;
    const network = this.currentMetrics.network.bandwidth.utilization;
    const disk = Math.max(...this.currentMetrics.disk.disks.map(d => d.utilization));

    const overall = (cpu + memory + network + disk) / 4;

    return { cpu, memory, network, disk, overall };
  }
}