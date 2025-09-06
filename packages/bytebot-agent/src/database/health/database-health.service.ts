/**
 * Database Health Service - Enhanced Kubernetes Health Integration
 * Provides comprehensive health checks optimized for Kubernetes liveness/readiness probes
 * with failure recovery and graceful degradation for the Bytebot API platform
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database.service';
import { ConnectionPoolService } from '../connection-pool.service';

export interface HealthCheckOptions {
  timeout: number; // Health check timeout in milliseconds
  critical: boolean; // Whether failure blocks requests
  includeDetails: boolean; // Include detailed diagnostics
  retryAttempts: number; // Number of retry attempts on failure
  retryDelay: number; // Delay between retries in milliseconds
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  duration: number; // Check duration in milliseconds
  timestamp: Date;
  details?: any; // Additional diagnostic information
  error?: string; // Error message if unhealthy
  retryCount?: number; // Number of retries attempted
}

export interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  duration: number; // Total health check duration
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  kubernetes: {
    liveness: boolean; // Liveness probe result
    readiness: boolean; // Readiness probe result
    startup: boolean; // Startup probe result
  };
}

@Injectable()
export class DatabaseHealthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseHealthService.name);
  private readonly healthChecks = new Map<
    string,
    (options: HealthCheckOptions) => Promise<HealthCheckResult>
  >();
  private backgroundMonitoring: NodeJS.Timeout;
  private lastHealthReport: HealthReport;
  private healthHistory: HealthReport[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly connectionPoolService: ConnectionPoolService,
  ) {
    this.registerHealthChecks();
    this.logger.log('Database health service initialized');
  }

  async onModuleInit() {
    this.logger.log('Starting database health monitoring');

    // Perform initial health check
    await this.performHealthCheck();

    // Start background monitoring
    this.startBackgroundMonitoring();

    this.logger.log('Database health service fully operational');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down database health service');

    if (this.backgroundMonitoring) {
      clearInterval(this.backgroundMonitoring);
    }

    this.logger.log('Database health service shutdown complete');
  }

  /**
   * Perform comprehensive health check for all registered checks
   */
  async performHealthCheck(includeDetails = false): Promise<HealthReport> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    try {
      this.logger.debug(`[${operationId}] Starting comprehensive health check`);

      // Execute all health checks in parallel with timeout
      const healthCheckPromises = Array.from(this.healthChecks.entries()).map(
        async ([name, checkFn]) => {
          const options: HealthCheckOptions = {
            timeout: this.configService.get<number>(
              'DB_HEALTH_CHECK_TIMEOUT',
              5000,
            ),
            critical: this.isHealthCheckCritical(name),
            includeDetails,
            retryAttempts: this.configService.get<number>(
              'DB_HEALTH_RETRY_ATTEMPTS',
              2,
            ),
            retryDelay: this.configService.get<number>(
              'DB_HEALTH_RETRY_DELAY',
              1000,
            ),
          };

          try {
            return await this.executeHealthCheckWithRetry(
              name,
              checkFn,
              options,
            );
          } catch (error) {
            return {
              name,
              status: 'unhealthy' as const,
              duration: 0,
              timestamp: new Date(),
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      );

      // Wait for all checks to complete
      const completedResults = await Promise.allSettled(healthCheckPromises);

      // Process results
      completedResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          const checkName = Array.from(this.healthChecks.keys())[index];
          results.push({
            name: checkName,
            status: 'unhealthy',
            duration: 0,
            timestamp: new Date(),
            error: 'Health check execution failed',
          });
        }
      });

      // Generate comprehensive report
      const report = this.generateHealthReport(results, Date.now() - startTime);
      this.lastHealthReport = report;
      this.addToHistory(report);

      this.logger.debug(`[${operationId}] Health check completed`, {
        overallStatus: report.status,
        duration: report.duration,
        healthyChecks: report.summary.healthy,
        unhealthyChecks: report.summary.unhealthy,
        operationId,
      });

      return report;
    } catch (error) {
      this.logger.error(`[${operationId}] Health check failed`, {
        error: error instanceof Error ? error.message : String(error),
        operationId,
      });

      // Return fallback unhealthy report
      return this.generateFallbackReport(Date.now() - startTime, String(error));
    }
  }

  /**
   * Get Kubernetes liveness probe status
   * Liveness probes determine if the container should be restarted
   */
  async getLivenessStatus(): Promise<{
    status: boolean;
    details?: any;
  }> {
    try {
      // Liveness checks focus on basic service responsiveness
      const report = await this.performHealthCheck(false);

      // Service is alive if at least basic connectivity works
      const hasBasicConnectivity = report.checks.some(
        (check) =>
          check.name === 'database-connectivity' &&
          check.status !== 'unhealthy',
      );

      return {
        status: hasBasicConnectivity,
        details: {
          checks: report.checks.length,
          healthy: report.summary.healthy,
          status: report.status,
        },
      };
    } catch (error) {
      this.logger.error('Liveness probe failed', error);
      return { status: false };
    }
  }

  /**
   * Get Kubernetes readiness probe status
   * Readiness probes determine if the container should receive traffic
   */
  async getReadinessStatus(): Promise<{
    status: boolean;
    details?: any;
  }> {
    try {
      // Readiness checks are more comprehensive
      const report = await this.performHealthCheck(true);

      // Service is ready if all critical checks pass
      const criticalChecksHealthy = report.checks
        .filter((check) => this.isHealthCheckCritical(check.name))
        .every((check) => check.status === 'healthy');

      const readyForTraffic =
        report.status === 'healthy' ||
        (report.status === 'degraded' && criticalChecksHealthy);

      return {
        status: readyForTraffic,
        details: {
          overallStatus: report.status,
          criticalChecksHealthy,
          connectionPoolUtilization: this.getConnectionPoolUtilization(),
        },
      };
    } catch (error) {
      this.logger.error('Readiness probe failed', error);
      return { status: false };
    }
  }

  /**
   * Get Kubernetes startup probe status
   * Startup probes give the container time to initialize
   */
  async getStartupStatus(): Promise<{
    status: boolean;
    details?: any;
  }> {
    try {
      // Startup checks focus on initialization completion
      const report = await this.performHealthCheck(false);

      // Check if database service has been initialized
      const databaseInitialized = report.checks.some(
        (check) =>
          check.name === 'database-connectivity' &&
          check.status !== 'unhealthy',
      );

      const connectionPoolReady = this.isConnectionPoolReady();

      return {
        status: databaseInitialized && connectionPoolReady,
        details: {
          databaseInitialized,
          connectionPoolReady,
          uptime: this.getServiceUptime(),
        },
      };
    } catch (error) {
      this.logger.error('Startup probe failed', error);
      return { status: false };
    }
  }

  /**
   * Get last health report
   */
  getLastHealthReport(): HealthReport | null {
    return this.lastHealthReport;
  }

  /**
   * Get health check history
   */
  getHealthHistory(): HealthReport[] {
    return [...this.healthHistory];
  }

  /**
   * Get health check metrics for monitoring
   */
  getHealthMetrics() {
    const recent = this.healthHistory.slice(-20); // Last 20 checks

    if (recent.length === 0) {
      return {
        totalChecks: 0,
        successRate: 0,
        averageDuration: 0,
        recentFailures: 0,
      };
    }

    const successful = recent.filter(
      (report) => report.status === 'healthy',
    ).length;
    const totalDuration = recent.reduce(
      (sum, report) => sum + report.duration,
      0,
    );
    const recentFailures = recent
      .slice(-5)
      .filter((report) => report.status === 'unhealthy').length;

    return {
      totalChecks: recent.length,
      successRate: (successful / recent.length) * 100,
      averageDuration: totalDuration / recent.length,
      recentFailures,
    };
  }

  /**
   * Register all database health checks
   */
  private registerHealthChecks() {
    // Basic database connectivity check
    this.healthChecks.set('database-connectivity', async (options) => {
      const startTime = Date.now();

      try {
        await this.databaseService.executeRawQuery('SELECT 1 as health_check');

        return {
          name: 'database-connectivity',
          status: 'healthy',
          duration: Date.now() - startTime,
          timestamp: new Date(),
          details: options.includeDetails ? { query: 'SELECT 1' } : undefined,
        };
      } catch (error) {
        return {
          name: 'database-connectivity',
          status: 'unhealthy',
          duration: Date.now() - startTime,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Connection pool health check
    this.healthChecks.set('connection-pool', async (options) => {
      const startTime = Date.now();

      try {
        const poolMetrics = this.connectionPoolService.getPoolMetrics();
        const poolHealth =
          await this.connectionPoolService.performPoolHealthCheck();

        const status = poolHealth.healthy
          ? 'healthy'
          : poolMetrics.utilization > 90
            ? 'unhealthy'
            : 'degraded';

        return {
          name: 'connection-pool',
          status,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          details: options.includeDetails
            ? {
                utilization: poolMetrics.utilization,
                active: poolMetrics.active,
                total: poolMetrics.total,
                issues: poolHealth.issues,
              }
            : undefined,
        };
      } catch (error) {
        return {
          name: 'connection-pool',
          status: 'unhealthy',
          duration: Date.now() - startTime,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Database performance check
    this.healthChecks.set('database-performance', async (options) => {
      const startTime = Date.now();

      try {
        // Test query performance with a simple query
        const queryStart = Date.now();
        await this.databaseService.executeRawQuery(
          'SELECT COUNT(*) FROM information_schema.tables',
        );
        const queryDuration = Date.now() - queryStart;

        // Determine status based on performance
        const status =
          queryDuration < 100
            ? 'healthy'
            : queryDuration < 1000
              ? 'degraded'
              : 'unhealthy';

        return {
          name: 'database-performance',
          status,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          details: options.includeDetails
            ? {
                queryDuration,
                threshold: { healthy: 100, degraded: 1000 },
              }
            : undefined,
        };
      } catch (error) {
        return {
          name: 'database-performance',
          status: 'unhealthy',
          duration: Date.now() - startTime,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Database schema integrity check
    this.healthChecks.set('schema-integrity', async (options) => {
      const startTime = Date.now();

      try {
        // Check if critical tables exist
        const criticalTables = ['Task', 'User', 'Message'];
        const tableChecks = await Promise.all(
          criticalTables.map(async (table) => {
            const result = (await this.databaseService.executeRawQuery(
              `SELECT table_name FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = $1`,
              [table],
            )) as any[];
            return result.length > 0;
          }),
        );

        const allTablesExist = tableChecks.every((exists) => exists);
        const status = allTablesExist ? 'healthy' : 'unhealthy';

        return {
          name: 'schema-integrity',
          status,
          duration: Date.now() - startTime,
          timestamp: new Date(),
          details: options.includeDetails
            ? {
                tablesChecked: criticalTables.length,
                tablesFound: tableChecks.filter(Boolean).length,
                missingTables: criticalTables.filter((_, i) => !tableChecks[i]),
              }
            : undefined,
        };
      } catch (error) {
        return {
          name: 'schema-integrity',
          status: 'unhealthy',
          duration: Date.now() - startTime,
          timestamp: new Date(),
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    this.logger.log('Health checks registered', {
      totalChecks: this.healthChecks.size,
      checks: Array.from(this.healthChecks.keys()),
    });
  }

  /**
   * Execute health check with retry logic
   */
  private async executeHealthCheckWithRetry(
    name: string,
    checkFn: (options: HealthCheckOptions) => Promise<HealthCheckResult>,
    options: HealthCheckOptions,
  ): Promise<HealthCheckResult> {
    let lastError: any;

    for (let attempt = 0; attempt <= options.retryAttempts; attempt++) {
      try {
        const result = await Promise.race([
          checkFn(options),
          this.createTimeoutPromise(options.timeout, name),
        ]);

        if (
          result.status !== 'unhealthy' ||
          attempt === options.retryAttempts
        ) {
          return {
            ...result,
            retryCount: attempt,
          };
        }

        // Wait before retry
        if (attempt < options.retryAttempts) {
          await this.delay(options.retryDelay);
        }
      } catch (error) {
        lastError = error;

        if (attempt < options.retryAttempts) {
          await this.delay(options.retryDelay);
        }
      }
    }

    return {
      name,
      status: 'unhealthy',
      duration: options.timeout,
      timestamp: new Date(),
      error: lastError instanceof Error ? lastError.message : String(lastError),
      retryCount: options.retryAttempts,
    };
  }

  /**
   * Create timeout promise for health checks
   */
  private createTimeoutPromise(
    timeout: number,
    checkName: string,
  ): Promise<HealthCheckResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(`Health check '${checkName}' timed out after ${timeout}ms`),
        );
      }, timeout);
    });
  }

  /**
   * Generate comprehensive health report
   */
  private generateHealthReport(
    results: HealthCheckResult[],
    duration: number,
  ): HealthReport {
    const summary = {
      total: results.length,
      healthy: results.filter((r) => r.status === 'healthy').length,
      degraded: results.filter((r) => r.status === 'degraded').length,
      unhealthy: results.filter((r) => r.status === 'unhealthy').length,
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (summary.unhealthy > 0) {
      // Check if any critical checks failed
      const criticalFailures = results.filter(
        (r) => r.status === 'unhealthy' && this.isHealthCheckCritical(r.name),
      );
      overallStatus = criticalFailures.length > 0 ? 'unhealthy' : 'degraded';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    // Generate Kubernetes probe results
    const kubernetes = {
      liveness: summary.healthy > 0 || summary.degraded > 0, // Can handle basic operations
      readiness:
        overallStatus === 'healthy' ||
        (overallStatus === 'degraded' && summary.unhealthy === 0), // Ready for traffic
      startup: results.some(
        (r) => r.name === 'database-connectivity' && r.status !== 'unhealthy',
      ),
    };

    return {
      status: overallStatus,
      timestamp: new Date(),
      duration,
      checks: results,
      summary,
      kubernetes,
    };
  }

  /**
   * Generate fallback health report on error
   */
  private generateFallbackReport(
    duration: number,
    error: string,
  ): HealthReport {
    return {
      status: 'unhealthy',
      timestamp: new Date(),
      duration,
      checks: [
        {
          name: 'health-check-execution',
          status: 'unhealthy',
          duration,
          timestamp: new Date(),
          error,
        },
      ],
      summary: {
        total: 1,
        healthy: 0,
        degraded: 0,
        unhealthy: 1,
      },
      kubernetes: {
        liveness: false,
        readiness: false,
        startup: false,
      },
    };
  }

  /**
   * Start background health monitoring
   */
  private startBackgroundMonitoring() {
    const interval = this.configService.get<number>(
      'DB_BACKGROUND_HEALTH_INTERVAL',
      60000, // 1 minute
    );

    this.backgroundMonitoring = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Background health check failed', error);
      }
    }, interval);

    this.logger.debug('Background health monitoring started', { interval });
  }

  /**
   * Check if health check is critical for service operation
   */
  private isHealthCheckCritical(checkName: string): boolean {
    const criticalChecks = ['database-connectivity', 'connection-pool'];
    return criticalChecks.includes(checkName);
  }

  /**
   * Get connection pool utilization
   */
  private getConnectionPoolUtilization(): number {
    try {
      const metrics = this.connectionPoolService.getPoolMetrics();
      return metrics.utilization;
    } catch {
      return 0;
    }
  }

  /**
   * Check if connection pool is ready
   */
  private isConnectionPoolReady(): boolean {
    try {
      const metrics = this.connectionPoolService.getPoolMetrics();
      return metrics.total > 0 && !metrics.exhausted;
    } catch {
      return false;
    }
  }

  /**
   * Get service uptime in milliseconds
   */
  private getServiceUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Add health report to history
   */
  private addToHistory(report: HealthReport) {
    this.healthHistory.push(report);

    // Keep only recent history
    const maxHistory = this.configService.get<number>(
      'DB_HEALTH_HISTORY_SIZE',
      100,
    );
    if (this.healthHistory.length > maxHistory) {
      this.healthHistory = this.healthHistory.slice(-maxHistory);
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private readonly startTime = Date.now();

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `health_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
