/**
 * Secrets Health Controller - Enterprise-grade secrets management monitoring
 * Provides comprehensive health checks, metrics, and audit information for secrets management
 *
 * Features:
 * - Real-time secrets health monitoring
 * - Performance metrics and statistics
 * - Audit log access and analysis
 * - Secret rotation status and planning
 * - External provider connectivity checks
 * - Security compliance reporting
 *
 * @author Secrets Health Monitoring Specialist
 * @version 2.0.0
 * @since Phase 2: Enhanced Enterprise Secrets Management
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiSecurity } from '@nestjs/swagger';
import { ParlantSecure } from '@bytebot/shared/server';
import { EnhancedSecretsService } from './secrets-enhanced.service';
import { SecretsService } from './secrets.service';
import { ConfigService } from '@nestjs/config';

/**
 * Response interface for secrets health endpoint
 */
interface SecretsHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  summary: {
    total: number;
    healthy: number;
    expiring: number;
    expired: number;
  };
  performance: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorCount: number;
    cacheHitRate: number;
  };
  externalProviders: Record<string, unknown>;
  auditSummary: {
    totalEntries: number;
    recentErrors: number;
    successRate: number;
  };
  checks: {
    secretsAccessible: boolean;
    rotationHealthy: boolean;
    auditingWorking: boolean;
    externalProvidersConnected: boolean;
  };
  details?: Array<{
    name: string;
    status: string;
    age: number;
    source: string;
    lastAccessed?: Date;
  }>;
}

/**
 * Metrics data structure for monitoring systems
 */
interface MetricsData extends Record<string, unknown> {
  timestamp: string;
  secrets: {
    total: number;
    healthy: number;
    expiring: number;
    expired: number;
  };
  performance: {
    totalRequests: number;
    successRate: number;
    cacheHitRate: number;
    errorRate: number;
    averageResponseTime: number;
  };
  sources: Record<string, number>;
  providers: Record<string, number>;
}

/**
 * Enhanced Secrets Health Controller
 * Provides comprehensive monitoring endpoints for secrets management system
 */
@ApiTags('secrets-health')
@Controller('api/secrets')
@ApiSecurity('bearer')
export class SecretsHealthController {
  private readonly logger = new Logger('SecretsHealthController');
  private readonly startTime: number = Date.now();

  constructor(
    private readonly enhancedSecretsService: EnhancedSecretsService,
    private readonly secretsService: SecretsService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log(
      'Secrets Health Controller initialized - monitoring endpoints active',
    );
  }

  /**
   * Get comprehensive secrets health status
   * Provides detailed health information including performance metrics,
   * external provider status, and audit information
   */
  @Get('health')
  @ParlantSecure(
    'Retrieve comprehensive secrets management health status and performance metrics',
  )
  async getSecretsHealth(): Promise<SecretsHealthResponse> {
    const operationId = `health-check-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    this.logger.debug(`[${operationId}] Secrets health check requested`);

    try {
      // Get health information from enhanced secrets service
      const healthInfo = this.enhancedSecretsService.getEnhancedSecretsHealth();
      const performance = healthInfo.performance;
      const summary = healthInfo.summary;
      const auditSummary = healthInfo.auditSummary;

      // Calculate overall health metrics
      const successRate =
        performance.totalRequests > 0
          ? ((performance.totalRequests - performance.errorCount) /
              performance.totalRequests) *
            100
          : 100;

      const cacheHitRate =
        performance.totalRequests > 0
          ? (performance.cacheHits / performance.totalRequests) * 100
          : 0;

      // Determine overall health status
      let overallStatus: SecretsHealthResponse['status'] = 'healthy';
      const healthChecks = {
        secretsAccessible: summary.total > 0,
        rotationHealthy: summary.expired === 0,
        auditingWorking: auditSummary.totalEntries > 0,
        externalProvidersConnected: Object.values(
          (healthInfo.externalProviders as Record<string, unknown>) ?? {},
        ).some((enabled) => Boolean(enabled)),
      };

      // Determine status based on health checks
      if (!healthChecks.secretsAccessible || summary.expired > 0) {
        overallStatus = 'unhealthy';
      } else if (summary.expiring > 0 || successRate < 95) {
        overallStatus = 'degraded';
      }

      const response: SecretsHealthResponse = {
        status: overallStatus,
        timestamp,
        uptime,
        summary: {
          total: summary.total,
          healthy: summary.healthy,
          expiring: summary.expiring,
          expired: summary.expired,
        },
        performance: {
          totalRequests: performance.totalRequests,
          successRate: Number(successRate.toFixed(2)),
          averageResponseTime: performance.averageResponseTime,
          errorCount: performance.errorCount,
          cacheHitRate: Number(cacheHitRate.toFixed(2)),
        },
        externalProviders:
          (healthInfo.externalProviders as Record<string, unknown>) ?? {},
        auditSummary: {
          totalEntries: auditSummary.totalEntries,
          recentErrors: auditSummary.recentErrors,
          successRate: auditSummary.successRate,
        },
        checks: healthChecks,
      };

      // Add detailed information
      response.details = healthInfo.details.map((detail) => ({
        name: detail.name,
        status: detail.status,
        age: detail.age,
        source: detail.source,
        lastAccessed: detail.lastAccessed,
      }));

      this.logger.debug(`[${operationId}] Health check completed`, {
        status: overallStatus,
        totalSecrets: summary.total,
        successRate,
      });

      return Promise.resolve(response);
    } catch (error) {
      this.logger.error(`[${operationId}] Health check failed`, {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        status: 'unhealthy',
        timestamp,
        uptime,
        summary: { total: 0, healthy: 0, expiring: 0, expired: 0 },
        performance: {
          totalRequests: 0,
          successRate: 0,
          averageResponseTime: 0,
          errorCount: 1,
          cacheHitRate: 0,
        },
        externalProviders: {},
        auditSummary: { totalEntries: 0, recentErrors: 1, successRate: 0 },
        checks: {
          secretsAccessible: false,
          rotationHealthy: false,
          auditingWorking: false,
          externalProvidersConnected: false,
        },
      };
    }
  }

  /**
   * Get secrets metrics for monitoring systems
   * Returns metrics in various formats suitable for Prometheus, Grafana, etc.
   */
  @Get('metrics')
  @ParlantSecure(
    'Retrieve secrets management metrics and performance data for monitoring systems',
  )
  async getSecretsMetrics(): Promise<Record<string, unknown>> {
    const operationId = `metrics-${Date.now()}`;
    const finalFormat = 'json';

    this.logger.debug(`[${operationId}] Metrics requested`, {
      format: finalFormat,
    });

    try {
      // Get enhanced health for metrics
      const enhancedHealth =
        this.enhancedSecretsService.getEnhancedSecretsHealth();
      const performance = enhancedHealth.performance;
      const summary = enhancedHealth.summary;

      // Build comprehensive metrics
      const metricsData: MetricsData = {
        timestamp: new Date().toISOString(),
        secrets: {
          total: summary.total,
          healthy: summary.healthy,
          expiring: summary.expiring,
          expired: summary.expired,
        },
        performance: {
          totalRequests: performance.totalRequests,
          successRate:
            performance.totalRequests > 0
              ? Number(
                  (
                    (performance.totalRequests - performance.errorCount) /
                    performance.totalRequests
                  ).toFixed(2),
                )
              : 1,
          cacheHitRate:
            performance.totalRequests > 0
              ? Number(
                  (performance.cacheHits / performance.totalRequests).toFixed(
                    2,
                  ),
                )
              : 0,
          errorRate:
            performance.totalRequests > 0
              ? Number(
                  (performance.errorCount / performance.totalRequests).toFixed(
                    2,
                  ),
                )
              : 0,
          averageResponseTime: performance.averageResponseTime,
        },
        sources: this.buildSourceMetrics(enhancedHealth.details),
        providers: this.buildProviderMetrics(
          Object.fromEntries(
            Object.entries(
              (enhancedHealth.externalProviders as Record<string, unknown>) ??
                {},
            ).map(([key, value]) => [key, Boolean(value)]),
          ),
        ),
      };

      this.logger.debug(`[${operationId}] Metrics generated`, {
        totalSecrets: metricsData.secrets.total,
        totalRequests: metricsData.performance.totalRequests,
      });

      return Promise.resolve(metricsData);
    } catch (error) {
      this.logger.error(`[${operationId}] Metrics generation failed`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get Prometheus-compatible metrics
   * Returns metrics in Prometheus exposition format
   */
  @Get('metrics/prometheus')
  @ParlantSecure(
    'Retrieve secrets management metrics in Prometheus exposition format for monitoring infrastructure',
  )
  async getPrometheusMetrics(): Promise<any> {
    const operationId = `prometheus-${Date.now()}`;

    try {
      const enhancedHealth =
        this.enhancedSecretsService.getEnhancedSecretsHealth();
      const performance = enhancedHealth.performance;
      const summary = enhancedHealth.summary;

      const timestamp = Date.now();
      const metrics = [
        '# HELP secrets_total Total number of secrets',
        '# TYPE secrets_total gauge',
        `secrets_total ${summary.total} ${timestamp}`,
        '',
        '# HELP secrets_healthy Number of healthy secrets',
        '# TYPE secrets_healthy gauge',
        `secrets_healthy ${summary.healthy} ${timestamp}`,
        '',
        '# HELP secrets_expiring Number of expiring secrets',
        '# TYPE secrets_expiring gauge',
        `secrets_expiring ${summary.expiring} ${timestamp}`,
        '',
        '# HELP secrets_expired Number of expired secrets',
        '# TYPE secrets_expired gauge',
        `secrets_expired ${summary.expired} ${timestamp}`,
        '',
        '# HELP secrets_requests_total Total number of secrets requests',
        '# TYPE secrets_requests_total counter',
        `secrets_requests_total ${performance.totalRequests} ${timestamp}`,
        '',
        '# HELP secrets_cache_hits_total Total cache hits',
        '# TYPE secrets_cache_hits_total counter',
        `secrets_cache_hits_total ${performance.cacheHits} ${timestamp}`,
        '',
        '# HELP secrets_cache_misses_total Total cache misses',
        '# TYPE secrets_cache_misses_total counter',
        `secrets_cache_misses_total ${performance.cacheMisses} ${timestamp}`,
        '',
        '# HELP secrets_errors_total Total errors',
        '# TYPE secrets_errors_total counter',
        `secrets_errors_total ${performance.errorCount} ${timestamp}`,
        '',
        '# HELP secrets_response_time_avg Average response time in milliseconds',
        '# TYPE secrets_response_time_avg gauge',
        `secrets_response_time_avg ${performance.averageResponseTime} ${timestamp}`,
      ].join('\n');

      this.logger.debug(`[${operationId}] Prometheus metrics generated`);
      return Promise.resolve(metrics);
    } catch (error) {
      this.logger.error(
        `[${operationId}] Prometheus metrics generation failed`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return Promise.resolve('# Error generating metrics\n');
    }
  }

  /**
   * Build source distribution metrics from secret details
   * @private
   */
  private buildSourceMetrics(
    details: Array<{ source: string }>,
  ): Record<string, number> {
    const sources: Record<string, number> = {};
    for (const detail of details) {
      const source = detail.source;
      sources[source] = (sources[source] || 0) + 1;
    }
    return sources;
  }

  /**
   * Build provider metrics from external providers
   * @private
   */
  private buildProviderMetrics(
    providers: Record<string, boolean>,
  ): Record<string, number> {
    const metrics: Record<string, number> = {};
    for (const [provider, enabled] of Object.entries(providers)) {
      metrics[`provider_${provider}`] = enabled ? 1 : 0;
    }
    return metrics;
  }
}
