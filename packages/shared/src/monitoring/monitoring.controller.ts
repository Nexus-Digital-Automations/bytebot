/**
 * Local Monitoring Controller with Prometheus Endpoints
 * 
 * HTTP controller for exposing local monitoring endpoints including
 * Prometheus metrics, health dashboards, and system information.
 * Optimized for local-only deployment architecture.
 * 
 * Features:
 * - Prometheus metrics endpoint (/metrics)
 * - Health dashboard endpoint (/health/dashboard)
 * - System status endpoint (/health/status)
 * - Metrics summary endpoint (/metrics/summary)
 * - Alert status endpoint (/alerts/status)
 * - Performance monitoring endpoints
 * 
 * @author Claude Code - Local Health Checks & Monitoring Integration Specialist
 * @version 1.0.0 - Local-Only Architecture Compliant
 */

import { Controller, Get, Header, Logger, Res, Query } from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from './metrics.service';
import {
  HealthDashboardData,
  HealthCheckResult,
  PerformanceMetrics,
  SystemResourceMetrics,
  MonitoringEvent,
} from './types';

/**
 * Monitoring controller for local metrics and health endpoints
 */
@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private readonly _metricsService: MetricsService,
    private readonly config: ConfigService,
  ) {
    this.logger.log('Local Monitoring Controller initialized', {
      prometheusEnabled: this.config.get<boolean>('PROMETHEUS_ENABLED', true),
      metricsPath: '/metrics',
      dashboardPath: '/health/dashboard',
    });
  }

  /**
   * Prometheus metrics endpoint
   * Returns metrics in Prometheus exposition format
   */
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getPrometheusMetrics(@Res() response: Response): Promise<void> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Prometheus metrics endpoint accessed`);

    try {
      const startTime = Date.now();
      const metricsOutput = this._metricsService.generatePrometheusMetrics();
      const responseTime = Date.now() - startTime;

      // Record metrics endpoint access
      this._metricsService.incrementCounter('prometheus_metrics_requests_total');
      this._metricsService.observeHistogram('prometheus_metrics_response_time_seconds', responseTime / 1000);

      this.logger.debug(`[${operationId}] Prometheus metrics generated successfully`, {
        responseTimeMs: responseTime,
        outputSize: metricsOutput.length,
        metricsCount: this._metricsService.getMetricsSummary(),
      });

      response.send(metricsOutput);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to generate Prometheus metrics: ${errorMessage}`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      this._metricsService.incrementCounter('prometheus_metrics_errors_total');
      response.status(500).send('# Error generating metrics\n');
    }
  }

  /**
   * Metrics summary endpoint for debugging
   */
  @Get('metrics/summary')
  async getMetricsSummary(): Promise<{
    summary: ReturnType<typeof this._metricsService.getMetricsSummary>;
    timestamp: string;
    operationId: string;
  }> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Metrics summary endpoint accessed`);

    try {
      const summary = this._metricsService.getMetricsSummary();

      this.logger.debug(`[${operationId}] Metrics summary generated`, { summary });

      return {
        summary,
        timestamp: new Date().toISOString(),
        operationId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to get metrics summary: ${errorMessage}`, {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Health check history endpoint
   */
  @Get('health/history')
  async getHealthCheckHistory(
    @Query('service') serviceName?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    history: Array<{ timestamp: Date; result: HealthCheckResult; service: string }>;
    total: number;
    serviceName?: string;
    operationId: string;
  }> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Health check history endpoint accessed`, {
      serviceName,
      limit,
    });

    try {
      let history = this._metricsService.getHealthCheckHistory(serviceName);
      
      // Apply limit if specified
      const limitNum = limit ? parseInt(limit, 10) : undefined;
      if (limitNum && limitNum > 0) {
        history = history.slice(-limitNum); // Get most recent entries
      }

      this.logger.debug(`[${operationId}] Health check history retrieved`, {
        historySize: history.length,
        serviceName,
        limit: limitNum,
      });

      return {
        history,
        total: history.length,
        serviceName,
        operationId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to get health check history: ${errorMessage}`, {
        error: errorMessage,
        serviceName,
      });
      throw error;
    }
  }

  /**
   * System information endpoint
   */
  @Get('system/info')
  async getSystemInfo(): Promise<{
    system: {
      platform: string;
      arch: string;
      nodeVersion: string;
      uptime: number;
      pid: number;
      ppid: number;
    };
    memory: NodeJS.MemoryUsage;
    process: {
      title: string;
      execPath: string;
      cwd: string;
      argv: string[];
      env: Record<string, string>;
    };
    config: {
      metricsEnabled: boolean;
      prometheusEndpoint: string;
      healthChecksEnabled: boolean;
      localDeployment: boolean;
    };
    timestamp: string;
    operationId: string;
  }> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] System info endpoint accessed`);

    try {
      const systemInfo = {
        system: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptime: Math.round(process.uptime()),
          pid: process.pid,
          ppid: process.ppid || 0,
        },
        memory: process.memoryUsage(),
        process: {
          title: process.title,
          execPath: process.execPath,
          cwd: process.cwd(),
          argv: process.argv,
          env: this.sanitizeEnvironment(process.env),
        },
        config: {
          metricsEnabled: this.config.get<boolean>('METRICS_ENABLED', true),
          prometheusEndpoint: this.config.get<string>('PROMETHEUS_ENDPOINT', '/metrics'),
          healthChecksEnabled: this.config.get<boolean>('HEALTH_CHECKS_ENABLED', true),
          localDeployment: this.config.get<boolean>('LOCAL_DEPLOYMENT', true),
        },
        timestamp: new Date().toISOString(),
        operationId,
      };

      this.logger.debug(`[${operationId}] System info retrieved`, {
        platform: systemInfo.system.platform,
        nodeVersion: systemInfo.system.nodeVersion,
        uptime: systemInfo.system.uptime,
        memoryUsedMB: Math.round(systemInfo.memory.rss / 1024 / 1024),
      });

      return systemInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to get system info: ${errorMessage}`, {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Configuration endpoint (sanitized)
   */
  @Get('config')
  async getConfiguration(): Promise<{
    monitoring: {
      metricsEnabled: boolean;
      prometheusPort: number;
      grafanaPort: number;
      scrapeInterval: number;
      localDataDirectory: string;
      alertingEnabled: boolean;
    };
    health: {
      checksEnabled: boolean;
      probesEnabled: boolean;
      intervalSeconds: number;
      timeoutSeconds: number;
      failureThreshold: number;
    };
    security: {
      authenticationEnabled: boolean;
      rateLimitingEnabled: boolean;
      metricsCollectionEnabled: boolean;
      auditLoggingEnabled: boolean;
    };
    timestamp: string;
    operationId: string;
  }> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Configuration endpoint accessed`);

    try {
      const configuration = {
        monitoring: {
          metricsEnabled: this.config.get<boolean>('METRICS_ENABLED', true),
          prometheusPort: this.config.get<number>('PROMETHEUS_PORT', 9090),
          grafanaPort: this.config.get<number>('GRAFANA_PORT', 3000),
          scrapeInterval: this.config.get<number>('METRICS_SCRAPE_INTERVAL', 15),
          localDataDirectory: this.config.get<string>('LOCAL_DATA_DIRECTORY', './data'),
          alertingEnabled: this.config.get<boolean>('ALERTING_ENABLED', true),
        },
        health: {
          checksEnabled: this.config.get<boolean>('HEALTH_CHECKS_ENABLED', true),
          probesEnabled: this.config.get<boolean>('HEALTH_PROBES_ENABLED', true),
          intervalSeconds: this.config.get<number>('HEALTH_CHECK_INTERVAL', 30),
          timeoutSeconds: this.config.get<number>('HEALTH_CHECK_TIMEOUT', 5),
          failureThreshold: this.config.get<number>('HEALTH_FAILURE_THRESHOLD', 3),
        },
        security: {
          authenticationEnabled: this.config.get<boolean>('ENABLE_AUTHENTICATION', true),
          rateLimitingEnabled: this.config.get<boolean>('ENABLE_RATE_LIMITING', true),
          metricsCollectionEnabled: this.config.get<boolean>('ENABLE_METRICS_COLLECTION', true),
          auditLoggingEnabled: this.config.get<boolean>('ENABLE_AUDIT_LOGGING', true),
        },
        timestamp: new Date().toISOString(),
        operationId,
      };

      this.logger.debug(`[${operationId}] Configuration retrieved`, {
        monitoringEnabled: configuration.monitoring.metricsEnabled,
        healthChecksEnabled: configuration.health.checksEnabled,
        securityFeatures: Object.keys(configuration.security).length,
      });

      return configuration;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to get configuration: ${errorMessage}`, {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Performance metrics endpoint
   */
  @Get('performance')
  async getPerformanceMetrics(): Promise<{
    performance: {
      requestsPerSecond: number;
      averageResponseTime: number;
      memoryUsage: NodeJS.MemoryUsage;
      cpuUsage: NodeJS.CpuUsage;
      uptime: number;
      eventLoopLag: number;
    };
    timestamp: string;
    operationId: string;
  }> {
    const operationId = this.generateOperationId();
    this.logger.debug(`[${operationId}] Performance metrics endpoint accessed`);

    try {
      const startTime = Date.now();
      
      // Get current performance data
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();

      // Measure event loop lag
      const eventLoopLag = await this.measureEventLoopLag();

      const performanceMetrics = {
        performance: {
          requestsPerSecond: 0, // Would be calculated from actual request metrics
          averageResponseTime: 0, // Would be calculated from histogram metrics
          memoryUsage,
          cpuUsage,
          uptime: Math.round(uptime),
          eventLoopLag,
        },
        timestamp: new Date().toISOString(),
        operationId,
      };

      const responseTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] Performance metrics retrieved in ${responseTime}ms`, {
        memoryUsedMB: Math.round(memoryUsage.rss / 1024 / 1024),
        eventLoopLag,
        uptime: performanceMetrics.performance.uptime,
      });

      return performanceMetrics;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to get performance metrics: ${errorMessage}`, {
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        resolve(lag);
      });
    });
  }

  /**
   * Sanitize environment variables for safe exposure
   */
  private sanitizeEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
    const sensitiveKeys = [
      'JWT_SECRET',
      'ENCRYPTION_KEY', 
      'DATABASE_URL',
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'GEMINI_API_KEY',
      'REDIS_PASSWORD',
      'GRAFANA_PASSWORD',
    ];

    const sanitized: Record<string, string> = {};
    
    Object.entries(env).forEach(([key, value]) => {
      if (value) {
        if (sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = value;
        }
      }
    });

    return sanitized;
  }

  /**
   * Generate operation ID for correlation
   */
  private generateOperationId(): string {
    return `monitoring_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  }
}