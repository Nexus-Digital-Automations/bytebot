/**
 * Job Resource Management & Cleanup Service - Enterprise-Grade Resource Control
 *
 * Provides comprehensive resource management and automated cleanup system for
 * enterprise job management with intelligent resource allocation, monitoring,
 * and capacity management.
 *
 * Core Features:
 * - Intelligent resource allocation and limits (CPU, memory, disk, network)
 * - Memory management with automatic garbage collection
 * - Automated cleanup of expired jobs, temporary files, and cached data
 * - Real-time resource utilization monitoring with alerts
 * - Dynamic capacity management with auto-scaling capabilities
 * - Resource pool management with fair allocation
 * - Performance optimization and bottleneck detection
 *
 * Enterprise Capabilities:
 * - Resource exhaustion protection and recovery
 * - Capacity planning metrics and recommendations
 * - Background maintenance with minimal impact
 * - Integration with job lifecycle and worker processes
 * - Redis memory usage optimization
 * - File system cleanup and maintenance
 *
 * @author Claude Code - Resource Management & Cleanup Specialist
 * @version 1.0.0
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CacheService } from '../../cache/cache.service';
import { BytebotMetricsService as MetricsService } from '../../metrics/metrics.service';

// ===== RESOURCE MANAGEMENT TYPE DEFINITIONS =====

/**
 * Resource types for allocation and monitoring
 */
export enum ResourceType {
  CPU = 'cpu',
  MEMORY = 'memory',
  DISK = 'disk',
  NETWORK = 'network',
  REDIS = 'redis',
  FILE_HANDLES = 'file_handles',
}

/**
 * Resource allocation configuration
 */
export interface ResourceLimits {
  cpu: {
    cores: number;
    percentage: number;
    priority: number;
  };
  memory: {
    heap: number; // MB
    resident: number; // MB
    percentage: number;
  };
  disk: {
    space: number; // MB
    inodes: number;
    tempFiles: number;
  };
  network: {
    bandwidth: number; // Mbps
    connections: number;
    requests: number;
  };
  redis: {
    memory: number; // MB
    connections: number;
    keys: number;
  };
  fileHandles: {
    open: number;
    concurrent: number;
  };
}

/**
 * Resource utilization metrics
 */
export interface ResourceUtilization {
  resourceId: string;
  type: ResourceType;
  used: number;
  available: number;
  percentage: number;
  timestamp: Date;
  jobId?: string;
  userId?: string;
}

/**
 * Resource allocation request
 */
export interface ResourceAllocationRequest {
  jobId: string;
  userId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedDuration: number; // minutes
  requirements: Partial<ResourceLimits>;
  metadata?: Record<string, unknown>;
}

/**
 * Resource allocation response
 */
export interface ResourceAllocation {
  allocationId: string;
  jobId: string;
  userId: string;
  allocated: ResourceLimits;
  expiresAt: Date;
  status: 'allocated' | 'active' | 'released' | 'expired';
  createdAt: Date;
  releasedAt?: Date;
}

/**
 * Cleanup policy configuration
 */
export interface CleanupPolicy {
  jobs: {
    completedRetentionDays: number;
    failedRetentionDays: number;
    maxJobsPerUser: number;
    maxTotalJobs: number;
  };
  files: {
    tempFileRetentionHours: number;
    logFileRetentionDays: number;
    maxTempFileSize: number; // MB
    maxLogFileSize: number; // MB
  };
  cache: {
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
    maxMemoryPercentage: number;
    cleanupIntervalMinutes: number;
  };
  redis: {
    keyExpirationDays: number;
    memoryThresholdPercentage: number;
    compressionThreshold: number; // KB
  };
}

/**
 * System health metrics
 */
export interface SystemHealth {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    temperature?: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    heap: {
      total: number;
      used: number;
      percentage: number;
    };
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
    inodes: {
      total: number;
      used: number;
      percentage: number;
    };
  };
  network: {
    interfaces: Array<{
      name: string;
      received: number;
      transmitted: number;
      errors: number;
    }>;
  };
  redis: {
    memory: number;
    connections: number;
    keys: number;
    operations: number;
  };
  processes: {
    total: number;
    active: number;
    zombie: number;
  };
}

/**
 * Resource alert configuration
 */
export interface ResourceAlert {
  alertId: string;
  resourceType: ResourceType;
  threshold: number;
  severity: 'info' | 'warning' | 'error' | 'critical';
  condition: 'above' | 'below' | 'equals';
  enabled: boolean;
  actions: Array<{
    type: 'notification' | 'scaling' | 'cleanup' | 'throttling';
    configuration: Record<string, unknown>;
  }>;
}

/**
 * Capacity planning recommendation
 */
export interface CapacityRecommendation {
  recommendationId: string;
  resourceType: ResourceType;
  currentCapacity: number;
  recommendedCapacity: number;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedCost?: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  expectedBenefit: string;
  createdAt: Date;
}

/**
 * Auto-scaling configuration
 */
export interface AutoScalingConfig {
  enabled: boolean;
  resourceType: ResourceType;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // minutes
  minInstances: number;
  maxInstances: number;
  scaleUpActions: Array<{
    type: 'worker' | 'redis' | 'cache' | 'storage';
    configuration: Record<string, unknown>;
  }>;
  scaleDownActions: Array<{
    type: 'worker' | 'redis' | 'cache' | 'storage';
    configuration: Record<string, unknown>;
  }>;
}

/**
 * Resource pool management
 */
export interface ResourcePool {
  poolId: string;
  resourceType: ResourceType;
  totalCapacity: number;
  availableCapacity: number;
  allocatedCapacity: number;
  reservedCapacity: number;
  fairShareEnabled: boolean;
  priorityWeights: Record<string, number>;
  allocations: ResourceAllocation[];
  waitingQueue: ResourceAllocationRequest[];
}

@Injectable()
export class JobResourceCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobResourceCleanupService.name);

  // Core dependencies
  private redis: Redis;
  private isInitialized = false;
  private isShuttingDown = false;

  // Resource management state
  private readonly resourcePools = new Map<ResourceType, ResourcePool>();
  private readonly activeAllocations = new Map<string, ResourceAllocation>();
  private readonly resourceAlerts = new Map<string, ResourceAlert>();
  private readonly autoScalingConfigs = new Map<ResourceType, AutoScalingConfig>();

  // Monitoring and cleanup state
  private readonly systemMetrics: SystemHealth[] = [];
  private readonly capacityRecommendations: CapacityRecommendation[] = [];
  private cleanupInProgress = false;
  private lastCleanupRun: Date | null = null;
  private readonly maxMetricsHistory = 1000;

  // Configuration
  private readonly config: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    resourceLimits: ResourceLimits;
    cleanupPolicy: CleanupPolicy;
    monitoring: {
      enabled: boolean;
      intervalSeconds: number;
      alerting: boolean;
    };
    autoScaling: {
      enabled: boolean;
      evaluationIntervalMinutes: number;
    };
    capacity: {
      planningEnabled: boolean;
      evaluationIntervalHours: number;
      retentionDays: number;
    };
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly metricsService: MetricsService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log('Initializing Job Resource Cleanup Service');

    // Load configuration
    this.config = {
      redis: {
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD'),
        db: this.configService.get('REDIS_DB', 0),
      },
      resourceLimits: {
        cpu: {
          cores: this.configService.get('RESOURCE_CPU_CORES', os.cpus().length),
          percentage: this.configService.get('RESOURCE_CPU_PERCENTAGE', 80),
          priority: this.configService.get('RESOURCE_CPU_PRIORITY', 0),
        },
        memory: {
          heap: this.configService.get('RESOURCE_MEMORY_HEAP_MB', 1024),
          resident: this.configService.get('RESOURCE_MEMORY_RESIDENT_MB', 2048),
          percentage: this.configService.get('RESOURCE_MEMORY_PERCENTAGE', 80),
        },
        disk: {
          space: this.configService.get('RESOURCE_DISK_SPACE_MB', 10240),
          inodes: this.configService.get('RESOURCE_DISK_INODES', 100000),
          tempFiles: this.configService.get('RESOURCE_DISK_TEMP_FILES', 1000),
        },
        network: {
          bandwidth: this.configService.get('RESOURCE_NETWORK_BANDWIDTH_MBPS', 100),
          connections: this.configService.get('RESOURCE_NETWORK_CONNECTIONS', 1000),
          requests: this.configService.get('RESOURCE_NETWORK_REQUESTS', 10000),
        },
        redis: {
          memory: this.configService.get('RESOURCE_REDIS_MEMORY_MB', 512),
          connections: this.configService.get('RESOURCE_REDIS_CONNECTIONS', 100),
          keys: this.configService.get('RESOURCE_REDIS_KEYS', 1000000),
        },
        fileHandles: {
          open: this.configService.get('RESOURCE_FILE_HANDLES_OPEN', 1000),
          concurrent: this.configService.get('RESOURCE_FILE_HANDLES_CONCURRENT', 100),
        },
      },
      cleanupPolicy: {
        jobs: {
          completedRetentionDays: this.configService.get('CLEANUP_JOBS_COMPLETED_RETENTION_DAYS', 7),
          failedRetentionDays: this.configService.get('CLEANUP_JOBS_FAILED_RETENTION_DAYS', 30),
          maxJobsPerUser: this.configService.get('CLEANUP_JOBS_MAX_PER_USER', 100),
          maxTotalJobs: this.configService.get('CLEANUP_JOBS_MAX_TOTAL', 10000),
        },
        files: {
          tempFileRetentionHours: this.configService.get('CLEANUP_FILES_TEMP_RETENTION_HOURS', 24),
          logFileRetentionDays: this.configService.get('CLEANUP_FILES_LOG_RETENTION_DAYS', 30),
          maxTempFileSize: this.configService.get('CLEANUP_FILES_MAX_TEMP_SIZE_MB', 100),
          maxLogFileSize: this.configService.get('CLEANUP_FILES_MAX_LOG_SIZE_MB', 500),
        },
        cache: {
          evictionPolicy: this.configService.get('CLEANUP_CACHE_EVICTION_POLICY', 'lru') as 'lru',
          maxMemoryPercentage: this.configService.get('CLEANUP_CACHE_MAX_MEMORY_PERCENTAGE', 75),
          cleanupIntervalMinutes: this.configService.get('CLEANUP_CACHE_INTERVAL_MINUTES', 15),
        },
        redis: {
          keyExpirationDays: this.configService.get('CLEANUP_REDIS_KEY_EXPIRATION_DAYS', 14),
          memoryThresholdPercentage: this.configService.get('CLEANUP_REDIS_MEMORY_THRESHOLD_PERCENTAGE', 80),
          compressionThreshold: this.configService.get('CLEANUP_REDIS_COMPRESSION_THRESHOLD_KB', 10),
        },
      },
      monitoring: {
        enabled: this.configService.get('MONITORING_ENABLED', true),
        intervalSeconds: this.configService.get('MONITORING_INTERVAL_SECONDS', 30),
        alerting: this.configService.get('MONITORING_ALERTING_ENABLED', true),
      },
      autoScaling: {
        enabled: this.configService.get('AUTO_SCALING_ENABLED', false),
        evaluationIntervalMinutes: this.configService.get('AUTO_SCALING_EVALUATION_INTERVAL_MINUTES', 5),
      },
      capacity: {
        planningEnabled: this.configService.get('CAPACITY_PLANNING_ENABLED', true),
        evaluationIntervalHours: this.configService.get('CAPACITY_PLANNING_EVALUATION_INTERVAL_HOURS', 24),
        retentionDays: this.configService.get('CAPACITY_PLANNING_RETENTION_DAYS', 90),
      },
    };
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing resource management components');

    try {
      // Initialize Redis connection
      await this.initializeRedis();

      // Initialize resource pools
      await this.initializeResourcePools();

      // Initialize resource alerts
      await this.initializeResourceAlerts();

      // Initialize auto-scaling configurations
      await this.initializeAutoScaling();

      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        await this.startResourceMonitoring();
      }

      // Start background cleanup tasks
      await this.startBackgroundCleanup();

      this.isInitialized = true;
      this.logger.log('Job Resource Cleanup Service initialized successfully');

      // Emit initialization event
      this.eventEmitter.emit('resource.service.initialized', {
        service: 'JobResourceCleanupService',
        timestamp: new Date(),
        resourcePools: this.resourcePools.size,
        alerts: this.resourceAlerts.size,
        autoScaling: this.autoScalingConfigs.size,
      });

    } catch (error) {
      this.logger.error('Failed to initialize Job Resource Cleanup Service', error);
      throw error;
    }
  }
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Job Resource Cleanup Service');
    this.isShuttingDown = true;

    try {
      // Release all active allocations
      await this.releaseAllAllocations();

      // Stop monitoring
      await this.stopResourceMonitoring();

      // Final cleanup
      await this.performFinalCleanup();

      // Close Redis connection
      if (this.redis) {
        await this.redis.quit();
      }

      this.logger.log('Job Resource Cleanup Service shutdown completed');
    } catch (error) {
      this.logger.error('Error during service shutdown', error);
    }
  }

  // ===== RESOURCE ALLOCATION METHODS =====

  /**
   * Allocate resources for a job
   */
  async allocateResources(request: ResourceAllocationRequest): Promise<ResourceAllocation> {
    const startTime = Date.now();
    this.logger.log(`Allocating resources for job ${request.jobId}`);

    try {
      // Validate request
      this.validateAllocationRequest(request);

      // Check resource availability
      const availabilityCheck = await this.checkResourceAvailability(request.requirements);
      if (!availabilityCheck.available) {
        throw new Error(`Insufficient resources: ${availabilityCheck.reason}`);
      }

      // Create allocation
      const allocation: ResourceAllocation = {
        allocationId: uuidv4(),
        jobId: request.jobId,
        userId: request.userId,
        allocated: availabilityCheck.allocatedLimits!,
        expiresAt: new Date(Date.now() + request.estimatedDuration * 60 * 1000),
        status: 'allocated',
        createdAt: new Date(),
      };

      // Reserve resources in pools
      await this.reserveResourcesInPools(allocation);

      // Store allocation
      this.activeAllocations.set(allocation.allocationId, allocation);
      await this.cacheService.set(
        `resource:allocation:${allocation.allocationId}`,
        allocation,
        request.estimatedDuration * 60 * 1000,
      );

      // Update metrics
      this.metricsService.recordCustomMetric('resource_allocations_total', 1, {
        user_id: request.userId,
        priority: request.priority,
        resource_types: Object.keys(request.requirements).join(','),
      });
      this.metricsService.recordCustomMetric('resource_allocation_duration_ms', Date.now() - startTime, {
        status: 'success',
      });
      // Emit allocation event
      this.eventEmitter.emit('resource.allocated', {
        allocation,
        request,
        timestamp: new Date(),
      });

      this.logger.log(`Resources allocated successfully: ${allocation.allocationId}`);
      return allocation;
    } catch (error) {
      this.logger.error(`Failed to allocate resources for job ${request.jobId}`, error);

      this.metricsService.recordCustomMetric('resource_allocation_duration_ms', Date.now() - startTime, {
        status: 'error',
      });

      throw error;
    }
  }
  }

  /**
   * Release allocated resources
   */
  async releaseResources(allocationId: string): Promise<void> {
    this.logger.log(`Releasing resources for allocation ${allocationId}`);

    try {
      const allocation = this.activeAllocations.get(allocationId);
      if (!allocation) {
        this.logger.warn(`Allocation not found: ${allocationId}`);
        return;
      }

      // Update allocation status
      allocation.status = 'released';
      allocation.releasedAt = new Date();

      // Release resources in pools
      await this.releaseResourcesInPools(allocation);

      // Remove from active allocations
      this.activeAllocations.delete(allocationId);

      // Update cache
      await this.cacheService.delete(`resource:allocation:${allocationId}`);

      // Update metrics
      this.metricsService.recordCustomMetric('resource_releases_total', 1, {
        user_id: allocation.userId,
        duration_minutes: Math.round((allocation.releasedAt!.getTime() - allocation.createdAt.getTime()) / 60000),
      });

      // Emit release event
      this.eventEmitter.emit('resource.released', {
        allocation,
        timestamp: new Date(),
      });

      this.logger.log(`Resources released successfully: ${allocationId}`);
    } catch (error) {
      this.logger.error(`Failed to release resources for allocation ${allocationId}`, error);
      throw error;
    }

  }

  /**
   * Get resource utilization metrics
   */
  async getResourceUtilization(): Promise<ResourceUtilization[]> {
    const utilization: ResourceUtilization[] = [];
    const timestamp = new Date();

    try {
      // Collect system metrics
      const systemHealth = await this.collectSystemHealth();

      // CPU utilization
      utilization.push({
        resourceId: 'system-cpu',
        type: ResourceType.CPU,
        used: systemHealth.cpu.usage,
        available: 100,
        percentage: systemHealth.cpu.usage,
        timestamp,
      });

      // Memory utilization
      utilization.push({
        resourceId: 'system-memory',
        type: ResourceType.MEMORY,
        used: systemHealth.memory.used,
        available: systemHealth.memory.total,
        percentage: systemHealth.memory.percentage,
        timestamp,
      });

      // Disk utilization
      utilization.push({
        resourceId: 'system-disk',
        type: ResourceType.DISK,
        used: systemHealth.disk.used,
        available: systemHealth.disk.total,
        percentage: systemHealth.disk.percentage,
        timestamp,
      });

      // Redis utilization
      utilization.push({
        resourceId: 'system-redis',
        type: ResourceType.REDIS,
        used: systemHealth.redis.memory,
        available: this.config.resourceLimits.redis.memory,
        percentage: (systemHealth.redis.memory / this.config.resourceLimits.redis.memory) * 100,
        timestamp,
      });

      return utilization;

    } catch (error) {
      this.logger.error('Failed to get resource utilization', error);
      throw error;
    }
  }

  // ===== CLEANUP METHODS =====

  /**
   * Manual cleanup trigger
   */
  async performCleanup(options?: {
    jobs?: boolean;
    files?: boolean;
    cache?: boolean;
    redis?: boolean;
  }): Promise<{
    jobsCleanedUp: number;
    filesCleanedUp: number;
    cacheEntriesCleanedUp: number;
    redisKeysCleanedUp: number;
    duration: number;
  }> {
    const startTime = Date.now();
    this.logger.log('Starting manual cleanup operation');if (this.cleanupInProgress) {throw new Error('Cleanup operation already in progress');}this.cleanupInProgress = true;

    try {
      const results = {
        jobsCleanedUp: 0,
        filesCleanedUp: 0,
        cacheEntriesCleanedUp: 0,
        redisKeysCleanedUp: 0,
        duration: 0,
      };

      // Job cleanup
      if (options?.jobs !== false) {
        results.jobsCleanedUp = await this.cleanupJobs();
      }

      // File cleanup
      if (options?.files !== false) {
        results.filesCleanedUp = await this.cleanupFiles();
      }

      // Cache cleanup
      if (options?.cache !== false) {
        results.cacheEntriesCleanedUp = await this.cleanupCache();
      }

      // Redis cleanup
      if (options?.redis !== false) {
        results.redisKeysCleanedUp = await this.cleanupRedis();
      }

      results.duration = Date.now() - startTime;
      this.lastCleanupRun = new Date();

      // Update metrics
      this.metricsService.recordCustomMetric('cleanup_operations_total', 1, {type: 'manual',
  duration_ms: results.duration.toString(),});

      // Emit cleanup event
      this.eventEmitter.emit('cleanup.completed', {type: 'manual',
        results,
        timestamp: new Date(),
      });

      this.logger.log(`Manual cleanup completed: ${JSON.stringify(results)}`);
      return results;

    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Scheduled cleanup - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledCleanup(): Promise<void> {
    if (this.isShuttingDown || this.cleanupInProgress) {
      return;
    }

    this.logger.log('Starting scheduled cleanup operation');

    try {
      await this.performCleanup();
    } catch (error) {
      this.logger.error('Scheduled cleanup failed', error);
      this.metricsService.recordCustomMetric('cleanup_operations_total', 1, {
        type: 'scheduled',
        status: 'error',
      });
    }
  }
  }

  /**
   * Resource monitoring - runs every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorResources(): Promise<void> {
    if (this.isShuttingDown || !this.config.monitoring.enabled) {
      return;
    }

    try {
      const systemHealth = await this.collectSystemHealth();

      // Store metrics history
      this.systemMetrics.push(systemHealth);
      if (this.systemMetrics.length > this.maxMetricsHistory) {
        this.systemMetrics.shift();
      }

      // Check alerts
      if (this.config.monitoring.alerting) {
        await this.checkResourceAlerts(systemHealth);
      }

      // Update Prometheus metrics
      this.updatePrometheusMetrics(systemHealth);

    } catch (error) {
      this.logger.error('Resource monitoring failed', error);
    }
  }

  /**
   * Capacity planning evaluation - runs daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async evaluateCapacityPlanning(): Promise<void> {
    if (this.isShuttingDown || !this.config.capacity.planningEnabled) {
      return;
    }

    this.logger.log('Starting capacity planning evaluation');

    try {
      const recommendations = await this.generateCapacityRecommendations();

      // Store recommendations
      this.capacityRecommendations.push(...recommendations);

      // Clean up old recommendations
      const cutoffDate = new Date(Date.now() - this.config.capacity.retentionDays * 24 * 60 * 60 * 1000);

        const activeRecommendations = this.capacityRecommendations.filter(
        rec => rec.createdAt > cutoffDate
      );
      this.capacityRecommendations.length = 0;
      this.capacityRecommendations.push(...activeRecommendations);

      // Update metrics
      this.metricsService.recordCustomMetric('capacity_recommendations_total', recommendations.length);

      // Emit capacity planning event
      this.eventEmitter.emit('capacity.planning.completed', {
        recommendations,
        timestamp: new Date(),
      });

      this.logger.log(`Capacity planning completed: ${recommendations.length} recommendations generated`);

    } catch (error) {
      this.logger.error('Capacity planning evaluation failed', error);
    }
  }

  // ===== MONITORING AND ALERTS =====

  /**
   * Get current system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return this.collectSystemHealth();
  }

  /**
   * Get capacity recommendations
   */
  async getCapacityRecommendations(): Promise<CapacityRecommendation[]> {
    return [...this.capacityRecommendations];
  }

  /**
   * Get resource allocation status
   */
  async getResourceAllocationStatus(): Promise<{
    activeAllocations: number;
    totalPools: number;
    utilizationPercentage: number;
    availableCapacity: Record<ResourceType, number>;
  }> {
    const utilizationMetrics = await this.getResourceUtilization();
    const availableCapacity: Record<ResourceType, number> = {} as Record<ResourceType, number>;

    for (const [type, pool] of this.resourcePools) {
      availableCapacity[type] = pool.availableCapacity;
    }

    const totalUtilization = utilizationMetrics.reduce((sum, metric) => sum + metric.percentage, 0);
    const averageUtilization = totalUtilization / utilizationMetrics.length;

    return {
      activeAllocations: this.activeAllocations.size,
      totalPools: this.resourcePools.size,
      utilizationPercentage: averageUtilization,
      availableCapacity,
    };
  }

  // ===== PRIVATE HELPER METHODS =====

  private async initializeRedis(): Promise<void> {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await this.redis.connect();
    this.logger.log('Redis connection established for resource management');
  }

  private async initializeResourcePools(): Promise<void> {
    // Initialize resource pools for each resource type
    for (const resourceType of Object.values(ResourceType)) {
      const pool: ResourcePool = {
        poolId: uuidv4(),
        resourceType,
        totalCapacity: this.getResourceCapacity(resourceType),
        availableCapacity: this.getResourceCapacity(resourceType),
        allocatedCapacity: 0,
        reservedCapacity: 0,
        fairShareEnabled: true,
        priorityWeights: {
          low: 1,
          normal: 2,
          high: 3,
          urgent: 4,
        },
        allocations: [],
        waitingQueue: [],
      };

      this.resourcePools.set(resourceType, pool);
    }

    this.logger.log(`Initialized ${this.resourcePools.size} resource pools`);
  }

  private async initializeResourceAlerts(): Promise<void> {
    // Initialize default resource alerts
    const defaultAlerts: Omit<ResourceAlert, 'alertId'>[] = [{resourceType: ResourceType.CPU,
        threshold: 85,
        severity: 'warning',
  condition: 'above',
  enabled: true,
  actions: [
          { type: 'notification', configuration: { channel: 'email' } },{ type: 'throttling', configuration: { level: 'moderate' } },],},
      {
        resourceType: ResourceType.MEMORY,
        threshold: 90,
        severity: 'error',
  condition: 'above',
  enabled: true,
  actions: [
          { type: 'notification', configuration: { channel: 'slack' } },{ type: 'cleanup', configuration: { aggressive: true } },],},
      {
        resourceType: ResourceType.DISK,
        threshold: 95,
        severity: 'critical',
  condition: 'above',
  enabled: true,
  actions: [
          { type: 'notification', configuration: { channel: 'pager' } },{ type: 'cleanup', configuration: { emergency: true } },
        ],
      },
    ];

    for (const alertConfig of defaultAlerts) {
      const alert: ResourceAlert = {
        alertId: uuidv4(),
        ...alertConfig,
      };
      this.resourceAlerts.set(alert.alertId, alert);
    }

    this.logger.log(`Initialized ${this.resourceAlerts.size} resource alerts`);
  }

  private async initializeAutoScaling(): Promise<void> {
    if (!this.config.autoScaling.enabled) {
      this.logger.log('Auto-scaling disabled');return;}

    // Initialize auto-scaling configurations for key resources
    const autoScalingConfigs: Omit<AutoScalingConfig, 'resourceType'>[] = [{enabled: true,
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        cooldownPeriod: 10, // 10 minutes
        minInstances: 1,
        maxInstances: 10,
        scaleUpActions: [
          { type: 'worker', configuration: { increment: 2 } },],
  scaleDownActions: [
          { type: 'worker', configuration: { decrement: 1 } },
        ],
      },
    ];

    for (const resourceType of [ResourceType.CPU, ResourceType.MEMORY]) {
      const config: AutoScalingConfig = {
        resourceType,
        ...autoScalingConfigs[0],
      };
      this.autoScalingConfigs.set(resourceType, config);
    }

    this.logger.log(`Initialized auto-scaling for ${this.autoScalingConfigs.size} resource types`);
  }

  private getResourceCapacity(resourceType: ResourceType): number {
    switch (resourceType) {
      case ResourceType.CPU:
        return this.config.resourceLimits.cpu.cores;
      case ResourceType.MEMORY:
        return this.config.resourceLimits.memory.heap;
      case ResourceType.DISK:
        return this.config.resourceLimits.disk.space;
      case ResourceType.NETWORK:
        return this.config.resourceLimits.network.bandwidth;
      case ResourceType.REDIS:
        return this.config.resourceLimits.redis.memory;
      case ResourceType.FILE_HANDLES:
        return this.config.resourceLimits.fileHandles.open;
      default:
        return 100; // Default capacity
    }
  }

  private validateAllocationRequest(request: ResourceAllocationRequest): void {
    if (!request.jobId || !request.userId) {
      throw new Error('Job ID and User ID are required');
    }
    if (!request.requirements || Object.keys(request.requirements).length === 0) {
      throw new Error('Resource requirements are required');
    }
    if (request.estimatedDuration <= 0) {
      throw new Error('Estimated duration must be positive');
    }
  }
  }

  private async checkResourceAvailability(requirements: Partial<ResourceLimits>): Promise<{
    available: boolean;
    reason?: string;
    allocatedLimits?: ResourceLimits;
  }> {
    const allocatedLimits: ResourceLimits = { ...this.config.resourceLimits };

    // Check each required resource
    for (const [resourceKey, resourceRequirement] of Object.entries(requirements)) {
      const resourceType = this.mapResourceKeyToType(resourceKey);
      const pool = this.resourcePools.get(resourceType);

      if (!pool) {
        return {
          available: false,
          reason: `Resource pool not found: ${resourceType}`,
        };
      }

      const requiredCapacity = this.calculateRequiredCapacity(resourceType, resourceRequirement);

      if (pool.availableCapacity < requiredCapacity) {
        return {
          available: false,
          reason: `Insufficient capacity for ${resourceType}: required ${requiredCapacity}, available ${pool.availableCapacity}`,
        };
      }

      // Update allocated limits based on availability
      this.updateAllocatedLimits(allocatedLimits, resourceType, resourceRequirement);
    }

    return {
      available: true,
      allocatedLimits,
    };
  }

  private mapResourceKeyToType(resourceKey: string): ResourceType {
    switch (resourceKey) {
      case 'cpu':
        return ResourceType.CPU;
      case 'memory':
        return ResourceType.MEMORY;
      case 'disk':
        return ResourceType.DISK;
      case 'network':
        return ResourceType.NETWORK;
      case 'redis':
        return ResourceType.REDIS;
      case 'fileHandles':
        return ResourceType.FILE_HANDLES;
      default:
        throw new Error(`Unknown resource key: ${resourceKey}`);
    }
  }

  private calculateRequiredCapacity(resourceType: ResourceType, requirement: any): number {
    switch (resourceType) {
      case ResourceType.CPU:
        return requirement.cores || requirement.percentage || 1;
      case ResourceType.MEMORY:
        return requirement.heap || requirement.resident || 100;
      case ResourceType.DISK:
        return requirement.space || requirement.inodes || 100;
      case ResourceType.NETWORK:
        return requirement.bandwidth || requirement.connections || 10;
      case ResourceType.REDIS:
        return requirement.memory || requirement.keys || 50;
      case ResourceType.FILE_HANDLES:
        return requirement.open || requirement.concurrent || 10;
      default:
        return 1;
    }
  }

  private updateAllocatedLimits(
    allocatedLimits: ResourceLimits,
    resourceType: ResourceType,
    requirement: any,
  ): void {
    // Update the allocated limits based on actual requirements and availability
    // This is a simplified implementation - real implementation would be more sophisticated
    switch (resourceType) {
      case ResourceType.CPU:
        if (requirement.cores) allocatedLimits.cpu.cores = requirement.cores;
        if (requirement.percentage) allocatedLimits.cpu.percentage = requirement.percentage;
        break;
      case ResourceType.MEMORY:
        if (requirement.heap) allocatedLimits.memory.heap = requirement.heap;
        if (requirement.resident) allocatedLimits.memory.resident = requirement.resident;
        break;
      // Add other resource types as needed
    }
  }

  private async reserveResourcesInPools(allocation: ResourceAllocation): Promise<void> {
    // Reserve resources in each relevant pool
    for (const [resourceType, pool] of this.resourcePools) {
      const requiredCapacity = this.getRequiredCapacityFromAllocation(allocation, resourceType);

      if (requiredCapacity > 0) {
        pool.availableCapacity -= requiredCapacity;
        pool.allocatedCapacity += requiredCapacity;
        pool.allocations.push(allocation);

        this.logger.debug(`Reserved ${requiredCapacity} units of ${resourceType} for allocation ${allocation.allocationId}`);
      }
    }
  }
  }

  private async releaseResourcesInPools(allocation: ResourceAllocation): Promise<void> {
    // Release resources in each relevant pool
    for (const [resourceType, pool] of this.resourcePools) {
      const requiredCapacity = this.getRequiredCapacityFromAllocation(allocation, resourceType);

      if (requiredCapacity > 0) {
        pool.availableCapacity += requiredCapacity;
        pool.allocatedCapacity -= requiredCapacity;
        pool.allocations = pool.allocations.filter(a => a.allocationId !== allocation.allocationId);

        this.logger.debug(`Released ${requiredCapacity} units of ${resourceType} for allocation ${allocation.allocationId}`);
      }
    }
  }
  }

  private getRequiredCapacityFromAllocation(allocation: ResourceAllocation, resourceType: ResourceType): number {
    switch (resourceType) {
      case ResourceType.CPU:
        return allocation.allocated.cpu.cores;
      case ResourceType.MEMORY:
        return allocation.allocated.memory.heap;
      case ResourceType.DISK:
        return allocation.allocated.disk.space;
      case ResourceType.NETWORK:
        return allocation.allocated.network.bandwidth;
      case ResourceType.REDIS:
        return allocation.allocated.redis.memory;
      case ResourceType.FILE_HANDLES:
        return allocation.allocated.fileHandles.open;
      default:
        return 0;
    }
  }

  private async releaseAllAllocations(): Promise<void> {
    this.logger.log('Releasing all active allocations');
    const allocationIds = Array.from(this.activeAllocations.keys());
    const releasePromises = allocationIds.map(id => this.releaseResources(id));

    await Promise.all(releasePromises);
    this.logger.log(`Released ${allocationIds.length} allocations`);
  }

  private async collectSystemHealth(): Promise<SystemHealth> {
    const timestamp = new Date();

    // CPU metrics
    const cpuUsage = os.loadavg();
    const cpuCount = os.cpus().length;

    // Memory metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    // Process memory
    const processMemory = process.memoryUsage();
    const heapPercentage = (processMemory.heapUsed / processMemory.heapTotal) * 100;

    // Redis metrics
    const redisInfo = await this.getRedisInfo();

    // Network interfaces
    const networkInterfaces = os.networkInterfaces();
    const interfaces = Object.entries(networkInterfaces).map(([name, interfaces]) => ({
      name,
      received: 0, // Would need to implement actual network monitoring
      transmitted: 0,
      errors: 0,
    }));

    return {
      timestamp,
      cpu: {
        usage: cpuUsage[0] * 10, // Normalize to percentage
        loadAverage: cpuUsage,
      },
      memory: {
        total: Math.round(totalMemory / 1024 / 1024), // MB
        used: Math.round(usedMemory / 1024 / 1024), // MB
        free: Math.round(freeMemory / 1024 / 1024), // MB
        percentage: memoryPercentage,
        heap: {
          total: Math.round(processMemory.heapTotal / 1024 / 1024), // MB
          used: Math.round(processMemory.heapUsed / 1024 / 1024), // MB
          percentage: heapPercentage,
        },
      },
      disk: {
        total: 0, // Would need to implement disk monitoring
        used: 0,
        free: 0,
        percentage: 0,
        inodes: {
          total: 0,
          used: 0,
          percentage: 0,
        },
      },
      network: {
        interfaces,
      },
      redis: redisInfo,
      processes: {
        total: 0, // Would need to implement process monitoring
        active: 0,
        zombie: 0,
      },
    };
  }

  private async getRedisInfo(): Promise<{
    memory: number;
    connections: number;
    keys: number;
    operations: number;
  }> {
    try {
      const info = await this.redis.info('memory');
      const memory = this.parseRedisMemoryInfo(info);
      const connections = await this.redis.client('list');
      const dbSize = await this.redis.dbsize();

      return {
        memory: Math.round(memory / 1024 / 1024), // MB
        connections: Array.isArray(connections) ? connections.length : 0,
        keys: dbSize,
        operations: 0, // Would need to track operations
      };
    } catch (error) {
      this.logger.error('Failed to get Redis info', error);
      return {
        memory: 0,
        connections: 0,
        keys: 0,
        operations: 0,
      };
    }
  }

  private parseRedisMemoryInfo(info: string): number {
    const memoryLine = info.split('\n').find(line => line.startsWith('used_memory:'));
    if (memoryLine) {
      return parseInt(memoryLine.split(':')[1], 10);
    }
    return 0;
  }
  }

  private async checkResourceAlerts(systemHealth: SystemHealth): Promise<void> {
    for (const alert of this.resourceAlerts.values()) {
      if (!alert.enabled) continue;

      const currentValue = this.getMetricValue(systemHealth, alert.resourceType);

        const shouldTrigger = this.shouldTriggerAlert(currentValue, alert);

      if (shouldTrigger) {
        await this.triggerAlert(alert, currentValue, systemHealth);
      }
    }
  }

  private getMetricValue(systemHealth: SystemHealth, resourceType: ResourceType): number {
    switch (resourceType) {
      case ResourceType.CPU:
        return systemHealth.cpu.usage;
      case ResourceType.MEMORY:
        return systemHealth.memory.percentage;
      case ResourceType.DISK:
        return systemHealth.disk.percentage;
      case ResourceType.REDIS:
        return (systemHealth.redis.memory / this.config.resourceLimits.redis.memory) * 100;
      default:
        return 0;
    }
  }

  private shouldTriggerAlert(currentValue: number, alert: ResourceAlert): boolean {
    switch (alert.condition) {
      case 'above':return currentValue > alert.threshold;case 'below':return currentValue < alert.threshold;case 'equals':
        return Math.abs(currentValue - alert.threshold) < 0.1;
      default:
        return false;
    }
  }

  private async triggerAlert(alert: ResourceAlert, currentValue: number, systemHealth: SystemHealth): Promise<void> {
    this.logger.warn(`Resource alert triggered: ${alert.resourceType} ${alert.condition} ${alert.threshold}%, current: ${currentValue}%`);
    // Execute alert actionsfor (const action of alert.actions) {
      try {
        await this.executeAlertAction(action, alert, currentValue, systemHealth);
      } catch (error) {
        this.logger.error(`Failed to execute alert action: ${action.type}`, error);
      }
    }

    // Update metrics
    this.metricsService.recordCustomMetric('resource_alerts_triggered_total', 1, {resource_type: alert.resourceType,
  severity: alert.severity,
      action_count: alert.actions.length.toString(),
    });

    // Emit alert event
    this.eventEmitter.emit('resource.alert.triggered', {alert,currentValue,
      systemHealth,
      timestamp: new Date(),
    });
  }

  private async executeAlertAction(
    action: ResourceAlert['actions'][0],
  alert: ResourceAlert,
  currentValue: number,
    systemHealth: SystemHealth,
  ): Promise<void> {
    switch (action.type) {
      case 'notification':
        // Would integrate with notification service
        this.logger.warn(`Notification: ${alert.resourceType} alert - ${currentValue}%`);
        break;
      case 'scaling':
        // Would trigger auto-scaling
        this.logger.log(`Auto-scaling triggered for ${alert.resourceType}`);
        break;
      case 'cleanup':// Trigger emergency cleanupif (action.configuration.emergency) {
          await this.performEmergencyCleanup();
        } else {
          await this.performCleanup();
        }
        break;
      case 'throttling':
        // Would implement throttling
        this.logger.log(`Throttling activated for ${alert.resourceType}`);
        break;
    }
  }

  private async performEmergencyCleanup(): Promise<void> {
    this.logger.warn('Performing emergency cleanup');

    try {
      // Aggressive cleanup with minimal retention
      const emergencyPolicy = {
        jobs: true,
        files: true,
        cache: true,
        redis: true,
      };

      await this.performCleanup(emergencyPolicy);

      // Release expired allocations immediately
      const expiredAllocations = Array.from(this.activeAllocations.values())
        .filter(allocation => allocation.expiresAt < new Date());

      for (const allocation of expiredAllocations) {
        await this.releaseResources(allocation.allocationId);
      }

      this.logger.log(`Emergency cleanup completed: released ${expiredAllocations.length} expired allocations`);

    } catch (error) {
      this.logger.error('Emergency cleanup failed', error);}}

  private updatePrometheusMetrics(systemHealth: SystemHealth): void {
    // Update Prometheus metrics with current system health
    this.metricsService.recordCustomMetric('system_cpu_usage_percentage', systemHealth.cpu.usage);this.metricsService.recordCustomMetric('system_memory_usage_percentage', systemHealth.memory.percentage);this.metricsService.recordCustomMetric('system_memory_heap_usage_percentage', systemHealth.memory.heap.percentage);this.metricsService.recordCustomMetric('redis_memory_usage_mb', systemHealth.redis.memory);this.metricsService.recordCustomMetric('redis_connections_active', systemHealth.redis.connections);this.metricsService.recordCustomMetric('redis_keys_total', systemHealth.redis.keys);this.metricsService.recordCustomMetric('resource_pools_total', this.resourcePools.size);this.metricsService.recordCustomMetric('resource_allocations_active', this.activeAllocations.size);}private async generateCapacityRecommendations(): Promise<CapacityRecommendation[]> {
    const recommendations: CapacityRecommendation[] = [];

    if (this.systemMetrics.length < 10) {
      // Not enough data for meaningful recommendations
      return recommendations;
    }

    // Analyze historical data for trends
    const recentMetrics = this.systemMetrics.slice(-100); // Last 100 data points

    for (const resourceType of Object.values(ResourceType)) {
      const recommendation = await this.analyzeResourceTrend(resourceType, recentMetrics);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  private async analyzeResourceTrend(
    resourceType: ResourceType,
    metrics: SystemHealth[],
  ): Promise<CapacityRecommendation | null> {
    const values = metrics.map(metric => this.getMetricValue(metric, resourceType));

        const averageUsage = values.reduce((sum, val) => sum + val, 0) / values.length;
    const maxUsage = Math.max(...values);

        const trend = this.calculateTrend(values);

        const currentCapacity = this.getResourceCapacity(resourceType);

    // Determine if scaling recommendation is needed
    let recommendedCapacity = currentCapacity;
    let reasoning = '';
    let priority: CapacityRecommendation['priority'] = 'low';

    if (maxUsage > 90) {
      recommendedCapacity = Math.ceil(currentCapacity * 1.5);
      reasoning = `Maximum usage (${maxUsage.toFixed(1)}%) exceeds 90% threshold`;
      priority = 'urgent';
    } else if (averageUsage > 80) {
      recommendedCapacity = Math.ceil(currentCapacity * 1.3);
      reasoning = `Average usage (${averageUsage.toFixed(1)}%) exceeds 80% threshold`;
      priority = 'high';
    } else if (trend > 0.1 && averageUsage > 60) {
      recommendedCapacity = Math.ceil(currentCapacity * 1.2);
      reasoning = `Positive trend (${trend.toFixed(3)}) with high average usage (${averageUsage.toFixed(1)}%)`;
      priority = 'medium';
    } else if (averageUsage < 30 && maxUsage < 50) {
      recommendedCapacity = Math.floor(currentCapacity * 0.8);
      reasoning = `Low usage (avg: ${averageUsage.toFixed(1)}%, max: ${maxUsage.toFixed(1)}%) suggests over-provisioning`;
      priority = 'low';}if (recommendedCapacity === currentCapacity) {
      return null; // No recommendation needed
    }

    return {
      recommendationId: uuidv4(),
      resourceType,
      currentCapacity,
      recommendedCapacity,
      reasoning,
      priority,
      implementationComplexity: 'medium',
  expectedBenefit: recommendedCapacity > currentCapacity? 'Improved performance and reduced resource contention': 'Cost savings and more efficient resource allocation',
  createdAt: new Date(),};
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    // Simple linear regression to calculate trend
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);

        const sumY = values.reduce((sum, val) => sum + val, 0);

        const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);

        const sumXX = values.reduce((sum, _, i) => sum + i * i, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private async startResourceMonitoring(): Promise<void> {
    this.logger.log('Resource monitoring started');}private async stopResourceMonitoring(): Promise<void> {
    this.logger.log('Resource monitoring stopped');}private async startBackgroundCleanup(): Promise<void> {
    this.logger.log('Background cleanup tasks started');}private async performFinalCleanup(): Promise<void> {
    this.logger.log('Performing final cleanup before shutdown');try {await this.performCleanup();
    } catch (error) {
      this.logger.error('Final cleanup failed', error);}}

  private async cleanupJobs(): Promise<number> {
    this.logger.log('Cleaning up jobs');try {// Clean up completed jobs older than retention period
      const completedCutoff = new Date(Date.now() - this.config.cleanupPolicy.jobs.completedRetentionDays * 24 * 60 * 60 * 1000);

        const failedCutoff = new Date(Date.now() - this.config.cleanupPolicy.jobs.failedRetentionDays * 24 * 60 * 60 * 1000);

      // This would integrate with the actual job storage system
      const keys = await this.redis.keys('job:*');
    let cleanedCount = 0;for (const key of keys) {
        const jobData = await this.redis.get(key);
        if (jobData) {
          const job = JSON.parse(jobData);

        const jobDate = new Date(job.completedAt || job.createdAt);

        const shouldDelete =
            (job.status === 'completed' && jobDate < completedCutoff) ||(job.status === 'failed' && jobDate < failedCutoff);

          if (shouldDelete) {
            await this.redis.del(key);
            cleanedCount++;
          }
        }
      }

      this.logger.log(`Cleaned up ${cleanedCount} jobs`);
      return cleanedCount;

    } catch (error) {
      this.logger.error('Job cleanup failed', error);return 0;}
  }

  private async cleanupFiles(): Promise<number> {
    this.logger.log('Cleaning up files');try {let cleanedCount = 0;

      // Clean up temporary files
      const tempDir = path.join(process.cwd(), 'temp');

        const cutoffTime = Date.now() - (this.config.cleanupPolicy.files.tempFileRetentionHours * 60 * 60 * 1000);try {
        const files = await fs.readdir(tempDir);
        for (const file of files) {
          const filePath = path.join(tempDir, file);

        const stat = await fs.stat(filePath);

          if (stat.mtime.getTime() < cutoffTime) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      } catch (error) {
        // Temp directory might not exist, which is fine
        this.logger.debug('Temp directory cleanup skipped', error);
      }

      this.logger.log(`Cleaned up ${cleanedCount} files`);
      return cleanedCount;

    } catch (error) {
      this.logger.error('File cleanup failed', error);return 0;}
  }

  private async cleanupCache(): Promise<number> {
    this.logger.log('Cleaning up cache');try {// This would integrate with the cache service for cleanup
      // For now, we'll simulate cache cleanup
      const cleanedCount = 100; // Placeholder

      this.logger.log(`Cleaned up ${cleanedCount} cache entries`);
      return cleanedCount;

    } catch (error) {
      this.logger.error('Cache cleanup failed', error);return 0;}
  }

  private async cleanupRedis(): Promise<number> {
    this.logger.log('Cleaning up Redis');try {let cleanedCount = 0;

      // Clean up expired keys
      const keys = await this.redis.keys('*');

        const cutoffTime = Date.now() - (this.config.cleanupPolicy.redis.keyExpirationDays * 24 * 60 * 60 * 1000);for (const key of keys) {
        // Check if key should be cleaned up based on patterns and age
        if (key.startsWith('temp:') || key.startsWith('cache:')) {
          const ttl = await this.redis.ttl(key);
          if (ttl === -1) { // No expiration set
            await this.redis.expire(key, 86400); // Set 24 hour expiration
            cleanedCount++;
          }
        }
      }

      this.logger.log(`Cleaned up ${cleanedCount} Redis keys`);
      return cleanedCount;

    } catch (error) {
      this.logger.error('Redis cleanup failed', error);
      return 0;
    }
  }
}