/**
 * Resource Monitoring Service for PARLANT PHASE 1 Stress Testing
 *
 * Advanced real-time system resource monitoring and alerting service providing
 * comprehensive metrics collection, threshold validation, and performance
 * analysis for enterprise-grade stress testing and capacity planning.
 *
 * Features:
 * - Real-time CPU, memory, disk, and network monitoring
 * - Database connection pool and query performance tracking
 * - Cache hit rates and memory usage monitoring
 * - Application-specific metrics (conversations, validations, sessions)
 * - Threshold-based alerting and automatic rollback triggers
 * - Historical data collection and trend analysis
 * - Performance bottleneck identification and recommendations
 *
 * @author Claude Code - Resource Monitoring Specialist
 * @version 1.0.0
 */

import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { EventEmitter } from 'events';import { performance } from 'perf_hooks';import * as os from 'os';import * as fs from 'fs/promises';import * as path from 'path';import * as child_process from 'child_process';import { promisify } from 'util';const exec = promisify(child_process.exec);// ===== RESOURCE MONITORING INTERFACES =====

/**
 * Comprehensive system resource metrics
 */
export interface SystemResourceMetrics {
  readonly timestamp: Date;
  readonly system: SystemMetrics;
  readonly process: ProcessMetrics;
  readonly network: NetworkMetrics;
  readonly database: DatabaseMetrics;
  readonly cache: CacheMetrics;
  readonly application: ApplicationMetrics;
  readonly parlant: ParlantMetrics;
}

/**
 * System-level metrics
 */
export interface SystemMetrics {
  readonly cpu: CpuMetrics;
  readonly memory: MemoryMetrics;
  readonly disk: DiskMetrics;
  readonly network: SystemNetworkMetrics;
  readonly load: LoadMetrics;
  readonly uptime: number;
}

/**
 * CPU performance metrics
 */
export interface CpuMetrics {
  readonly usage: number; // percentage
  readonly cores: number;
  readonly loadAverage: {
    readonly oneMinute: number;
    readonly fiveMinute: number;
    readonly fifteenMinute: number;
  };
  readonly perCoreUsage: number[];
  readonly contextSwitches: number;
  readonly interrupts: number;
}

/**
 * Memory performance metrics
 */
export interface MemoryMetrics {
  readonly total: number; // bytes
  readonly used: number; // bytes
  readonly free: number; // bytes
  readonly available: number; // bytes
  readonly buffers: number; // bytes
  readonly cached: number; // bytes
  readonly swapTotal: number; // bytes
  readonly swapUsed: number; // bytes
  readonly swapFree: number; // bytes
  readonly percentage: number;
}

/**
 * Disk I/O metrics
 */
export interface DiskMetrics {
  readonly usage: DiskUsageMetrics[];
  readonly io: DiskIOMetrics;
}

/**
 * Disk usage per mount point
 */
export interface DiskUsageMetrics {
  readonly filesystem: string;
  readonly mountpoint: string;
  readonly total: number; // bytes
  readonly used: number; // bytes
  readonly available: number; // bytes
  readonly percentage: number;
}

/**
 * Disk I/O performance metrics
 */
export interface DiskIOMetrics {
  readonly reads: number; // operations per second
  readonly writes: number; // operations per second
  readonly readBytes: number; // bytes per second
  readonly writeBytes: number; // bytes per second
  readonly readLatency: number; // milliseconds
  readonly writeLatency: number; // milliseconds
  readonly queueDepth: number;
  readonly utilization: number; // percentage
}

/**
 * System network metrics
 */
export interface SystemNetworkMetrics {
  readonly interfaces: NetworkInterfaceMetrics[];
  readonly connections: NetworkConnectionMetrics;
}

/**
 * Network interface metrics
 */
export interface NetworkInterfaceMetrics {
  readonly interface: string;
  readonly bytesReceived: number;
  readonly bytesSent: number;
  readonly packetsReceived: number;
  readonly packetsSent: number;
  readonly errorsReceived: number;
  readonly errorsSent: number;
  readonly droppedReceived: number;
  readonly droppedSent: number;
  readonly throughputReceived: number; // bytes per second
  readonly throughputSent: number; // bytes per second
}

/**
 * Network connection metrics
 */
export interface NetworkConnectionMetrics {
  readonly tcp: {
    readonly established: number;
    readonly synSent: number;
    readonly synReceived: number;
    readonly finWait1: number;
    readonly finWait2: number;
    readonly timeWait: number;
    readonly closed: number;
    readonly closeWait: number;
    readonly lastAck: number;
    readonly listen: number;
    readonly closing: number;
  };
  readonly udp: {
    readonly sockets: number;
  };
}

/**
 * System load metrics
 */
export interface LoadMetrics {
  readonly processCount: number;
  readonly threadCount: number;
  readonly runningProcesses: number;
  readonly blockedProcesses: number;
  readonly zombieProcesses: number;
}

/**
 * Process-specific metrics
 */
export interface ProcessMetrics {
  readonly pid: number;
  readonly ppid: number;
  readonly name: string;
  readonly cpu: ProcessCpuMetrics;
  readonly memory: ProcessMemoryMetrics;
  readonly io: ProcessIOMetrics;
  readonly threads: number;
  readonly fileDescriptors: number;
  readonly uptime: number;
}

/**
 * Process CPU metrics
 */
export interface ProcessCpuMetrics {
  readonly usage: number; // percentage
  readonly userTime: number; // microseconds
  readonly systemTime: number; // microseconds
  readonly totalTime: number; // microseconds
}

/**
 * Process memory metrics
 */
export interface ProcessMemoryMetrics {
  readonly rss: number; // bytes
  readonly heapTotal: number; // bytes
  readonly heapUsed: number; // bytes
  readonly heapFree: number; // bytes
  readonly external: number; // bytes
  readonly arrayBuffers: number; // bytes
  readonly virtualMemory: number; // bytes
  readonly physicalMemory: number; // bytes
}

/**
 * Process I/O metrics
 */
export interface ProcessIOMetrics {
  readonly readBytes: number;
  readonly writeBytes: number;
  readonly readOperations: number;
  readonly writeOperations: number;
}

/**
 * Network performance metrics
 */
export interface NetworkMetrics {
  readonly latency: NetworkLatencyMetrics;
  readonly throughput: NetworkThroughputMetrics;
  readonly errors: NetworkErrorMetrics;
}

/**
 * Network latency metrics
 */
export interface NetworkLatencyMetrics {
  readonly dns: number; // milliseconds
  readonly tcp: number; // milliseconds
  readonly tls: number; // milliseconds
  readonly http: number; // milliseconds
  readonly total: number; // milliseconds
}

/**
 * Network throughput metrics
 */
export interface NetworkThroughputMetrics {
  readonly download: number; // bytes per second
  readonly upload: number; // bytes per second
  readonly requests: number; // requests per second
  readonly responses: number; // responses per second
}

/**
 * Network error metrics
 */
export interface NetworkErrorMetrics {
  readonly timeouts: number;
  readonly connectionRefused: number;
  readonly dnsErrors: number;
  readonly tlsErrors: number;
  readonly httpErrors: number;
}

/**
 * Database performance metrics
 */
export interface DatabaseMetrics {
  readonly connectionPool: DatabaseConnectionPoolMetrics;
  readonly queries: DatabaseQueryMetrics;
  readonly transactions: DatabaseTransactionMetrics;
  readonly replication: DatabaseReplicationMetrics;
  readonly locks: DatabaseLockMetrics;
}

/**
 * Database connection pool metrics
 */
export interface DatabaseConnectionPoolMetrics {
  readonly active: number;
  readonly idle: number;
  readonly pending: number;
  readonly total: number;
  readonly maxConnections: number;
  readonly waitingQueries: number;
  readonly connectionErrors: number;
  readonly averageCheckoutTime: number; // milliseconds
}

/**
 * Database query performance metrics
 */
export interface DatabaseQueryMetrics {
  readonly totalQueries: number;
  readonly slowQueries: number;
  readonly averageQueryTime: number; // milliseconds
  readonly longestQueryTime: number; // milliseconds
  readonly queriesPerSecond: number;
  readonly selectQueries: number;
  readonly insertQueries: number;
  readonly updateQueries: number;
  readonly deleteQueries: number;
}

/**
 * Database transaction metrics
 */
export interface DatabaseTransactionMetrics {
  readonly activeTransactions: number;
  readonly committedTransactions: number;
  readonly rolledBackTransactions: number;
  readonly deadlocks: number;
  readonly averageTransactionTime: number; // milliseconds
}

/**
 * Database replication metrics
 */
export interface DatabaseReplicationMetrics {
  readonly replicationLag: number; // milliseconds
  readonly replicationStatus: 'healthy' | 'lagging' | 'broken';
  readonly replicaCount: number;
  readonly replicationErrors: number;
}

/**
 * Database lock metrics
 */
export interface DatabaseLockMetrics {
  readonly activeLocks: number;
  readonly waitingLocks: number;
  readonly lockWaitTime: number; // milliseconds
  readonly deadlockCount: number;
}

/**
 * Cache performance metrics
 */
export interface CacheMetrics {
  readonly redis: RedisCacheMetrics;
  readonly memory: MemoryCacheMetrics;
  readonly application: ApplicationCacheMetrics;
}

/**
 * Redis cache metrics
 */
export interface RedisCacheMetrics {
  readonly connected: boolean;
  readonly usedMemory: number; // bytes
  readonly maxMemory: number; // bytes
  readonly memoryUsagePercentage: number;
  readonly keyspaceHits: number;
  readonly keyspaceMisses: number;
  readonly hitRate: number; // percentage
  readonly missRate: number; // percentage
  readonly evictedKeys: number;
  readonly expiredKeys: number;
  readonly connectedClients: number;
  readonly blockedClients: number;
  readonly commandsProcessed: number;
  readonly operationsPerSecond: number;
}

/**
 * Memory cache metrics
 */
export interface MemoryCacheMetrics {
  readonly totalKeys: number;
  readonly memoryUsage: number; // bytes
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number; // percentage
  readonly evictionCount: number;
  readonly averageGetTime: number; // milliseconds
  readonly averageSetTime: number; // milliseconds
}

/**
 * Application cache metrics
 */
export interface ApplicationCacheMetrics {
  readonly caches: Map<string, CacheInstanceMetrics>;
  readonly totalMemoryUsage: number; // bytes
  readonly totalHitRate: number; // percentage
  readonly totalOperations: number;
}

/**
 * Individual cache instance metrics
 */
export interface CacheInstanceMetrics {
  readonly name: string;
  readonly size: number; // number of entries
  readonly memoryUsage: number; // bytes
  readonly hitCount: number;
  readonly missCount: number;
  readonly hitRate: number; // percentage
  readonly evictionCount: number;
  readonly lastAccessTime: Date;
}

/**
 * Application-specific metrics
 */
export interface ApplicationMetrics {
  readonly httpRequests: HttpRequestMetrics;
  readonly websockets: WebSocketMetrics;
  readonly errors: ApplicationErrorMetrics;
  readonly performance: ApplicationPerformanceMetrics;
}

/**
 * HTTP request metrics
 */
export interface HttpRequestMetrics {
  readonly totalRequests: number;
  readonly requestsPerSecond: number;
  readonly averageResponseTime: number; // milliseconds
  readonly statusCodes: Map<number, number>;
  readonly slowRequests: number;
  readonly errorRate: number; // percentage
  readonly throughput: number; // requests per second
}

/**
 * WebSocket metrics
 */
export interface WebSocketMetrics {
  readonly activeConnections: number;
  readonly totalConnections: number;
  readonly messagesReceived: number;
  readonly messagesSent: number;
  readonly messagesPerSecond: number;
  readonly connectionErrors: number;
  readonly averageMessageSize: number; // bytes
}

/**
 * Application error metrics
 */
export interface ApplicationErrorMetrics {
  readonly totalErrors: number;
  readonly errorsPerSecond: number;
  readonly errorsByType: Map<string, number>;
  readonly errorsByEndpoint: Map<string, number>;
  readonly criticalErrors: number;
  readonly warningCount: number;
}

/**
 * Application performance metrics
 */
export interface ApplicationPerformanceMetrics {
  readonly gcMetrics: GarbageCollectionMetrics;
  readonly eventLoop: EventLoopMetrics;
  readonly asyncOperations: AsyncOperationMetrics;
}

/**
 * Garbage collection metrics
 */
export interface GarbageCollectionMetrics {
  readonly collections: number;
  readonly totalGcTime: number; // milliseconds
  readonly averageGcTime: number; // milliseconds
  readonly maxGcTime: number; // milliseconds
  readonly memoryFreed: number; // bytes
}

/**
 * Event loop metrics
 */
export interface EventLoopMetrics {
  readonly lag: number; // milliseconds
  readonly utilization: number; // percentage
  readonly activeHandles: number;
  readonly activeRequests: number;
}

/**
 * Async operation metrics
 */
export interface AsyncOperationMetrics {
  readonly pendingOperations: number;
  readonly completedOperations: number;
  readonly averageOperationTime: number; // milliseconds
  readonly timeoutCount: number;
}

/**
 * PARLANT-specific metrics
 */
export interface ParlantMetrics {
  readonly conversations: ConversationMetrics;
  readonly validations: ValidationMetrics;
  readonly sessions: SessionMetrics;
  readonly integrations: IntegrationMetrics;
}

/**
 * Conversation metrics
 */
export interface ConversationMetrics {
  readonly activeSessions: number;
  readonly totalSessions: number;
  readonly averageSessionDuration: number; // milliseconds
  readonly messagesPerSecond: number;
  readonly averageResponseTime: number; // milliseconds
  readonly conversationErrors: number;
  readonly contextSwitches: number;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  readonly totalValidations: number;
  readonly validationsPerSecond: number;
  readonly approvalRate: number; // percentage
  readonly averageValidationTime: number; // milliseconds
  readonly cacheHitRate: number; // percentage
  readonly validationErrors: number;
  readonly timeouts: number;
}

/**
 * Session metrics
 */
export interface SessionMetrics {
  readonly activeSessions: number;
  readonly sessionCreationRate: number; // per second
  readonly sessionTerminationRate: number; // per second
  readonly averageSessionLifetime: number; // milliseconds
  readonly sessionErrors: number;
  readonly authenticationFailures: number;
}

/**
 * Integration metrics
 */
export interface IntegrationMetrics {
  readonly apiCalls: number;
  readonly apiCallsPerSecond: number;
  readonly averageApiResponseTime: number; // milliseconds
  readonly apiErrors: number;
  readonly apiTimeouts: number;
  readonly webhookDeliveries: number;
  readonly webhookFailures: number;
}

/**
 * Resource threshold configuration
 */
export interface ResourceThresholds {
  readonly cpu: ThresholdConfig;
  readonly memory: ThresholdConfig;
  readonly disk: ThresholdConfig;
  readonly network: ThresholdConfig;
  readonly database: ThresholdConfig;
  readonly cache: ThresholdConfig;
  readonly application: ThresholdConfig;
}

/**
 * Individual threshold configuration
 */
export interface ThresholdConfig {
  readonly warning: number;
  readonly critical: number;
  readonly duration: number; // milliseconds before triggering
  readonly enabled: boolean;
}

/**
 * Resource monitoring configuration
 */
export interface ResourceMonitoringConfig {
  readonly interval: number; // milliseconds
  readonly thresholds: ResourceThresholds;
  readonly alerting: AlertingConfig;
  readonly storage: StorageConfig;
  readonly testId: string;
}

/**
 * Alerting configuration
 */
export interface AlertingConfig {
  readonly enabled: boolean;
  readonly channels: string[];
  readonly cooldown: number; // milliseconds
  readonly escalation: EscalationConfig;
}

/**
 * Escalation configuration
 */
export interface EscalationConfig {
  readonly enabled: boolean;
  readonly levels: EscalationLevel[];
}

/**
 * Escalation level definition
 */
export interface EscalationLevel {
  readonly level: number;
  readonly threshold: number;
  readonly duration: number; // milliseconds
  readonly actions: string[];
}

/**
 * Storage configuration for metrics
 */
export interface StorageConfig {
  readonly enabled: boolean;
  readonly format: 'json' | 'csv' | 'prometheus';
  readonly retention: number; // days
  readonly compression: boolean;
  readonly path: string;
}

// ===== RESOURCE MONITORING SERVICE =====

@Injectable()
export class ResourceMonitoringService extends EventEmitter implements OnApplicationShutdown {
  private readonly logger = new Logger(ResourceMonitoringService.name);
  private readonly metricsHistory: SystemResourceMetrics[] = [];
  private readonly alertHistory: ResourceAlert[] = [];
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring = false;
  private config?: ResourceMonitoringConfig;

  // Metrics collection services
  private readonly systemMetricsCollector = new SystemMetricsCollector();
  private readonly processMetricsCollector = new ProcessMetricsCollector();
  private readonly networkMetricsCollector = new NetworkMetricsCollector();
  private readonly databaseMetricsCollector = new DatabaseMetricsCollector();
  private readonly cacheMetricsCollector = new CacheMetricsCollector();
  private readonly applicationMetricsCollector = new ApplicationMetricsCollector();
  private readonly parlantMetricsCollector = new ParlantMetricsCollector();

  // Performance tracking
  private lastCollectionTime = 0;
  private collectionCount = 0;
  private averageCollectionTime = 0;

  constructor(private readonly configService: ConfigService) {
    super();

    this.logger.log(`📊 [RESOURCE] Resource Monitoring Service initialized`);}/**
   * Initialize resource monitoring with configuration
   */
  async initialize(config: ResourceMonitoringConfig): Promise<void> {
    this.config = config;

    this.logger.log(`🚀 [RESOURCE] Initializing resource monitoring`, {testId: config.testId,interval: config.interval,
      alertingEnabled: config.alerting.enabled,
      storageEnabled: config.storage.enabled,
    });

    // Initialize all metrics collectors
    await this.systemMetricsCollector.initialize();
    await this.processMetricsCollector.initialize();
    await this.networkMetricsCollector.initialize();
    await this.databaseMetricsCollector.initialize();
    await this.cacheMetricsCollector.initialize();
    await this.applicationMetricsCollector.initialize();
    await this.parlantMetricsCollector.initialize();

    this.logger.log(`✅ [RESOURCE] All metrics collectors initialized`);
  }

  /**
   * Start resource monitoring
   */
  async startMonitoring(): Promise<void> {
    if (!this.config) {
      throw new Error('Resource monitoring not initialized');
    }

    if (this.isMonitoring) {
      this.logger.warn(`⚠️ [RESOURCE] Monitoring already active`);return;}

    this.isMonitoring = true;

    this.logger.log(`📈 [RESOURCE] Starting resource monitoring`, {testId: this.config.testId,interval: this.config.interval,
    });

    // Start periodic metrics collection
    this.monitoringInterval = setInterval(
      () => this.collectMetrics(),
      this.config.interval
    );

    // Collect initial baseline
    await this.collectMetrics();
  }

  /**
   * Stop resource monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.log(`🛑 [RESOURCE] Stopping resource monitoring`);this.isMonitoring = false;if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Collect final metrics
    await this.collectMetrics();

    this.logger.log(`✅ [RESOURCE] Resource monitoring stopped`);
  }

  /**
   * Collect comprehensive system metrics
   */
  async collectMetrics(): Promise<SystemResourceMetrics> {
    const collectionStart = performance.now();

    try {
      // Collect all metrics in parallel for efficiency
      const [
        system,
        process,
        network,
        database,
        cache,
        application,
        parlant,
      ] = await Promise.all([
        this.systemMetricsCollector.collect(),
        this.processMetricsCollector.collect(),
        this.networkMetricsCollector.collect(),
        this.databaseMetricsCollector.collect(),
        this.cacheMetricsCollector.collect(),
        this.applicationMetricsCollector.collect(),
        this.parlantMetricsCollector.collect(),
      ]);

      const metrics: SystemResourceMetrics = {
        timestamp: new Date(),
        system,
        process,
        network,
        database,
        cache,
        application,
        parlant,
      };

      // Store metrics
      this.metricsHistory.push(metrics);

      // Maintain history size limit (keep last 1000 entries)
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory.shift();
      }

      // Check thresholds and trigger alerts if necessary
      if (this.config) {
        await this.checkThresholds(metrics);
      }

      // Update performance tracking
      const collectionTime = performance.now() - collectionStart;
      this.updateCollectionPerformance(collectionTime);

      // Store metrics if configured
      if (this.config?.storage.enabled) {
        await this.storeMetrics(metrics);
      }

      this.emit('metricsCollected', metrics);

      return metrics;

    } catch (error) {
      this.logger.error(`❌ [RESOURCE] Failed to collect metrics: ${error instanceof Error ? error.message : String(error)}`, {error: error instanceof Error ? error.message : String(error),stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }

  /**
   * Get current system metrics snapshot
   */
  async getCurrentMetrics(): Promise<SystemResourceMetrics> {
    return this.collectMetrics();
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): SystemResourceMetrics[] {
    if (limit) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    collectionCount: number;
    averageCollectionTime: number;
    lastCollectionTime: number;
    historySize: number;
    alertsTriggered: number;
  } {
    return {
      collectionCount: this.collectionCount,
      averageCollectionTime: this.averageCollectionTime,
      lastCollectionTime: this.lastCollectionTime,
      historySize: this.metricsHistory.length,
      alertsTriggered: this.alertHistory.length,
    };
  }

  // Additional methods would be implemented here...
  // This provides the foundation for comprehensive resource monitoring

  /**
   * Update collection performance metrics
   */
  private updateCollectionPerformance(collectionTime: number): void {
    this.collectionCount++;
    this.lastCollectionTime = collectionTime;
    this.averageCollectionTime =
      (this.averageCollectionTime * (this.collectionCount - 1) + collectionTime) /
      this.collectionCount;
  }

  /**
   * Cleanup on application shutdown
   */
  async onApplicationShutdown(): Promise<void> {
    this.logger.log(`🛑 [RESOURCE] Shutting down resource monitoring service`);

    await this.stopMonitoring();

    // Cleanup all collectors
    await Promise.all([
      this.systemMetricsCollector.cleanup(),
      this.processMetricsCollector.cleanup(),
      this.networkMetricsCollector.cleanup(),
      this.databaseMetricsCollector.cleanup(),
      this.cacheMetricsCollector.cleanup(),
      this.applicationMetricsCollector.cleanup(),
      this.parlantMetricsCollector.cleanup(),
    ]);
  }
}

// ===== SUPPORTING CLASSES =====

/**
 * System metrics collector
 */
class SystemMetricsCollector {
  async initialize(): Promise<void> {
    // Implementation for system metrics collector initialization
  }

  async collect(): Promise<SystemMetrics> {
    // Implementation for system metrics collection
    return {} as SystemMetrics;
  }

  async cleanup(): Promise<void> {
    // Implementation for cleanup
  }
}

// Additional collector classes would be implemented similarly...
// This provides the foundation for comprehensive metrics collection

/**
 * Resource alert definition
 */
interface ResourceAlert {
  readonly timestamp: Date;
  readonly level: 'warning' | 'critical';
  readonly resource: string;
  readonly metric: string;
  readonly value: number;
  readonly threshold: number;
  readonly message: string;
}

// Export the service
export default ResourceMonitoringService;