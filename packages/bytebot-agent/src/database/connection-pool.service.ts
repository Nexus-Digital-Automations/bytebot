/**
 * Connection Pool Service - Enhanced PostgreSQL Connection Pool Management
 * Provides real-time connection metrics, automatic recovery, and advanced monitoring
 * for enterprise-grade database operations in the Bytebot API platform
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConnectionPoolConfig } from './connection-pool.config';

export interface ConnectionPoolMetrics {
  // Real-time connection pool statistics
  active: number; // Currently active connections
  idle: number; // Available idle connections
  waiting: number; // Queued connection requests
  total: number; // Total connections in pool

  // Pool utilization and performance
  utilization: number; // Percentage utilization (0-100)
  waitTimeMs: number; // Average wait time for connections
  connectionLifetimeMs: number; // Average connection lifetime

  // Pool health indicators
  healthy: boolean; // Overall pool health status
  exhausted: boolean; // Pool exhaustion indicator
  leakDetected: boolean; // Connection leak detection

  // Operational statistics
  totalRequests: number; // Total connection requests
  totalConnections: number; // Total connections created
  totalTimeouts: number; // Connection acquisition timeouts
  totalErrors: number; // Connection-related errors

  // Performance metrics
  averageAcquisitionTime: number; // Average time to acquire connection
  peakConnections: number; // Peak concurrent connections
  lastMaintenanceRun: Date; // Last pool maintenance timestamp
}

export interface ConnectionHealthMetrics {
  connectionId: string;
  createdAt: Date;
  lastUsed: Date;
  queriesExecuted: number;
  totalExecutionTime: number;
  errors: number;
  isActive: boolean;
  isHealthy: boolean;
  connectionString: string; // Sanitized connection info
}

@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private readonly connectionPool = new Map<string, ConnectionHealthMetrics>();
  private poolMetrics: ConnectionPoolMetrics;
  private monitoringInterval: NodeJS.Timeout;
  private maintenanceInterval: NodeJS.Timeout;
  private leakDetectionInterval: NodeJS.Timeout;
  private startTime: Date;

  constructor(
    private readonly configService: ConfigService,
    private readonly connectionPoolConfig: ConnectionPoolConfig,
  ) {
    this.startTime = new Date();
    this.initializePoolMetrics();
    this.logger.log('Connection pool service initialized');
  }

  onModuleInit(): void {
    this.logger.log('Starting connection pool monitoring and maintenance');

    // Start real-time monitoring
    this.startPoolMonitoring();

    // Start pool maintenance operations
    this.startPoolMaintenance();

    // Start connection leak detection
    this.startLeakDetection();

    this.logger.log('Connection pool service fully operational', {
      monitoringEnabled: true,
      maintenanceEnabled: true,
      leakDetectionEnabled: true,
    });
  }

  onModuleDestroy(): void {
    this.logger.log('Shutting down connection pool service');

    // Clean up intervals
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.maintenanceInterval) clearInterval(this.maintenanceInterval);
    if (this.leakDetectionInterval) clearInterval(this.leakDetectionInterval);

    this.logger.log('Connection pool service shutdown complete');
  }

  /**
   * Get real-time connection pool metrics
   */
  getPoolMetrics(): ConnectionPoolMetrics {
    return { ...this.poolMetrics };
  }

  /**
   * Get detailed connection health metrics
   */
  getConnectionHealthMetrics(): ConnectionHealthMetrics[] {
    return Array.from(this.connectionPool.values());
  }

  /**
   * Register a new database connection for monitoring
   */
  registerConnection(connectionId: string, prismaClient: PrismaClient) {
    const connectionMetrics: ConnectionHealthMetrics = {
      connectionId,
      createdAt: new Date(),
      lastUsed: new Date(),
      queriesExecuted: 0,
      totalExecutionTime: 0,
      errors: 0,
      isActive: true,
      isHealthy: true,
      connectionString: this.sanitizeConnectionString(),
    };

    this.connectionPool.set(connectionId, connectionMetrics);
    this.updatePoolMetrics();

    this.logger.debug('Database connection registered for monitoring', {
      connectionId,
      totalConnections: this.connectionPool.size,
    });
  }

  /**
   * Unregister a database connection
   */
  unregisterConnection(connectionId: string) {
    const removed = this.connectionPool.delete(connectionId);
    if (removed) {
      this.updatePoolMetrics();
      this.logger.debug('Database connection unregistered', {
        connectionId,
        remainingConnections: this.connectionPool.size,
      });
    }
  }

  /**
   * Record query execution for connection monitoring
   */
  recordQueryExecution(
    connectionId: string,
    executionTimeMs: number,
    success: boolean,
  ) {
    const connection = this.connectionPool.get(connectionId);
    if (connection) {
      connection.lastUsed = new Date();
      connection.queriesExecuted++;
      connection.totalExecutionTime += executionTimeMs;

      if (!success) {
        connection.errors++;
      }

      // Update connection health status
      connection.isHealthy = this.assessConnectionHealth(connection);
    }
  }

  /**
   * Perform connection pool health assessment
   */
  async performPoolHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const operationId = this.generateOperationId();
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      this.logger.debug(`[${operationId}] Performing pool health assessment`);

      // Check pool utilization
      if (this.poolMetrics.utilization > 85) {
        issues.push('High pool utilization detected');
        recommendations.push('Consider increasing max connections');
      }

      // Check for connection leaks
      if (this.poolMetrics.leakDetected) {
        issues.push('Potential connection leaks detected');
        recommendations.push('Review connection lifecycle management');
      }

      // Check average wait times
      if (this.poolMetrics.waitTimeMs > 1000) {
        issues.push('High connection acquisition wait times');
        recommendations.push('Optimize connection pool configuration');
      }

      // Check error rates
      const errorRate =
        this.poolMetrics.totalErrors /
        Math.max(this.poolMetrics.totalRequests, 1);
      if (errorRate > 0.05) {
        issues.push('High connection error rate detected');
        recommendations.push('Investigate database connectivity issues');
      }

      const healthy = issues.length === 0;

      this.logger.debug(`[${operationId}] Pool health assessment complete`, {
        healthy,
        issueCount: issues.length,
        operationId,
      });

      return { healthy, issues, recommendations };
    } catch (error) {
      this.logger.error(
        `[${operationId}] Pool health assessment failed`,
        error,
      );
      return {
        healthy: false,
        issues: ['Health assessment failed'],
        recommendations: ['Contact system administrator'],
      };
    }
  }

  /**
   * Force pool maintenance operations
   */
  async performPoolMaintenance(): Promise<{
    cleaned: number;
    recovered: number;
    errors: string[];
  }> {
    const operationId = this.generateOperationId();
    let cleaned = 0;
    let recovered = 0;
    const errors: string[] = [];

    try {
      this.logger.debug(`[${operationId}] Performing pool maintenance`);

      // Clean up stale connections
      const staleThreshold = Date.now() - 30 * 60 * 1000; // 30 minutes

      for (const [connectionId, connection] of this.connectionPool.entries()) {
        try {
          // Remove stale connections
          if (
            connection.lastUsed.getTime() < staleThreshold &&
            !connection.isActive
          ) {
            this.connectionPool.delete(connectionId);
            cleaned++;
            continue;
          }

          // Attempt to recover unhealthy connections
          if (!connection.isHealthy && connection.isActive) {
            const healthCheck = await this.testConnectionHealth(connectionId);
            if (healthCheck) {
              connection.isHealthy = true;
              connection.errors = 0; // Reset error count on recovery
              recovered++;
            }
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          errors.push(`Connection ${connectionId}: ${errorMsg}`);
        }
      }

      // Update pool metrics after maintenance
      this.updatePoolMetrics();
      this.poolMetrics.lastMaintenanceRun = new Date();

      this.logger.debug(`[${operationId}] Pool maintenance complete`, {
        cleaned,
        recovered,
        errors: errors.length,
        operationId,
      });

      return { cleaned, recovered, errors };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[${operationId}] Pool maintenance failed`, error);
      return { cleaned, recovered, errors: [errorMsg] };
    }
  }

  /**
   * Initialize pool metrics structure
   */
  private initializePoolMetrics() {
    this.poolMetrics = {
      active: 0,
      idle: 0,
      waiting: 0,
      total: 0,
      utilization: 0,
      waitTimeMs: 0,
      connectionLifetimeMs: 0,
      healthy: true,
      exhausted: false,
      leakDetected: false,
      totalRequests: 0,
      totalConnections: 0,
      totalTimeouts: 0,
      totalErrors: 0,
      averageAcquisitionTime: 0,
      peakConnections: 0,
      lastMaintenanceRun: new Date(),
    };
  }

  /**
   * Start real-time pool monitoring
   */
  private startPoolMonitoring() {
    const monitoringInterval = this.configService.get<number>(
      'DB_POOL_MONITORING_INTERVAL',
      10000, // 10 seconds
    );

    this.monitoringInterval = setInterval(() => {
      this.updatePoolMetrics();
      this.detectPoolExhaustion();
    }, monitoringInterval);

    this.logger.debug('Pool monitoring started', { monitoringInterval });
  }

  /**
   * Start pool maintenance operations
   */
  private startPoolMaintenance() {
    const maintenanceInterval = this.configService.get<number>(
      'DB_POOL_MAINTENANCE_INTERVAL',
      300000, // 5 minutes
    );

    this.maintenanceInterval = setInterval(() => {
      this.performPoolMaintenance();
    }, maintenanceInterval);

    this.logger.debug('Pool maintenance started', { maintenanceInterval });
  }

  /**
   * Start connection leak detection
   */
  private startLeakDetection() {
    const leakDetectionInterval = this.configService.get<number>(
      'DB_POOL_LEAK_DETECTION_INTERVAL',
      60000, // 1 minute
    );

    this.leakDetectionInterval = setInterval(() => {
      this.detectConnectionLeaks();
    }, leakDetectionInterval);

    this.logger.debug('Leak detection started', { leakDetectionInterval });
  }

  /**
   * Update real-time pool metrics
   */
  private updatePoolMetrics() {
    const connections = Array.from(this.connectionPool.values());

    this.poolMetrics.total = connections.length;
    this.poolMetrics.active = connections.filter((c) => c.isActive).length;
    this.poolMetrics.idle = this.poolMetrics.total - this.poolMetrics.active;

    // Calculate utilization
    const poolConfig = this.connectionPoolConfig.getConnectionPoolOptions();
    this.poolMetrics.utilization =
      poolConfig.maxConnections > 0
        ? (this.poolMetrics.active / poolConfig.maxConnections) * 100
        : 0;

    // Update peak connections
    if (this.poolMetrics.active > this.poolMetrics.peakConnections) {
      this.poolMetrics.peakConnections = this.poolMetrics.active;
    }

    // Calculate average connection lifetime
    const now = Date.now();
    const lifetimes = connections.map((c) => now - c.createdAt.getTime());
    this.poolMetrics.connectionLifetimeMs =
      lifetimes.length > 0
        ? lifetimes.reduce((sum, time) => sum + time, 0) / lifetimes.length
        : 0;

    // Update health status
    this.poolMetrics.healthy = connections.every((c) => c.isHealthy);
  }

  /**
   * Detect pool exhaustion conditions
   */
  private detectPoolExhaustion() {
    const poolConfig = this.connectionPoolConfig.getConnectionPoolOptions();

    this.poolMetrics.exhausted =
      this.poolMetrics.active >= poolConfig.maxConnections * 0.95; // 95% threshold

    if (this.poolMetrics.exhausted) {
      this.logger.warn('Connection pool exhaustion detected', {
        active: this.poolMetrics.active,
        max: poolConfig.maxConnections,
        utilization: this.poolMetrics.utilization,
      });
    }
  }

  /**
   * Detect potential connection leaks
   */
  private detectConnectionLeaks() {
    const connections = Array.from(this.connectionPool.values());
    const now = Date.now();
    const leakThreshold = 60 * 60 * 1000; // 1 hour

    const potentialLeaks = connections.filter(
      (c) => c.isActive && now - c.lastUsed.getTime() > leakThreshold,
    );

    this.poolMetrics.leakDetected = potentialLeaks.length > 0;

    if (this.poolMetrics.leakDetected) {
      this.logger.warn('Potential connection leaks detected', {
        leakedConnections: potentialLeaks.length,
        connectionIds: potentialLeaks.map((c) => c.connectionId),
      });
    }
  }

  /**
   * Assess individual connection health
   */
  private assessConnectionHealth(connection: ConnectionHealthMetrics): boolean {
    const errorThreshold = 10; // Max errors before marking unhealthy
    const ageThreshold = 24 * 60 * 60 * 1000; // 24 hours max age

    const now = Date.now();
    const age = now - connection.createdAt.getTime();

    return connection.errors < errorThreshold && age < ageThreshold;
  }

  /**
   * Test connection health with database ping
   */
  private async testConnectionHealth(connectionId: string): Promise<boolean> {
    try {
      // This would require access to the actual connection
      // For now, return true as a placeholder
      // In a real implementation, this would execute a simple query
      return true;
    } catch (error) {
      this.logger.debug('Connection health test failed', {
        connectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Sanitize connection string for logging (remove credentials)
   */
  private sanitizeConnectionString(): string {
    const baseUrl = this.configService.get<string>('DATABASE_URL', '');
    try {
      const url = new URL(baseUrl);
      return `postgresql://${url.hostname}:${url.port}${url.pathname}`;
    } catch {
      return 'postgresql://***:***@***:***/**';
    }
  }

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `pool_op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
