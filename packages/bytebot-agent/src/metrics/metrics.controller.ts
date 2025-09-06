/**
 * Prometheus Metrics Controller
 *
 * Exposes Prometheus metrics endpoint for scraping by monitoring systems.
 * Provides comprehensive application metrics, performance data, and business intelligence.
 *
 * Features:
 * - Prometheus metrics exposure endpoint
 * - Custom metrics dashboard endpoint
 * - Metrics health status
 * - Metrics metadata and documentation
 *
 * @author Claude Code - Monitoring & Observability Specialist
 * @version 2.0.0
 */

import {
  Controller,
  Get,
  Logger,
  HttpCode,
  HttpStatus,
  Header,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Prometheus metrics controller
 */
@Controller('metrics')
@ApiTags('Metrics & Observability')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {
    this.logger.log('Prometheus Metrics Controller initialized');
    this.logger.log('📊 Metrics endpoint available at: GET /metrics');
  }

  /**
   * Prometheus metrics endpoint
   * GET /metrics
   *
   * Standard Prometheus metrics endpoint for scraping
   */
  @Get()
  @ApiOperation({
    summary: 'Prometheus metrics endpoint',
    description:
      'Returns Prometheus-formatted metrics for scraping by monitoring systems',
  })
  @ApiResponse({
    status: 200,
    description: 'Prometheus metrics in text format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example:
            '# HELP bytebot_agent_http_requests_total Total number of HTTP requests\n# TYPE bytebot_agent_http_requests_total counter\nbytebot_agent_http_requests_total{method="GET",route="/health",status_code="200"} 1',
        },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(@Res() response: Response): Promise<void> {
    const operationId = `metrics_${Date.now()}`;
    this.logger.debug(`[${operationId}] Prometheus metrics requested`);

    try {
      const metrics = await this.metricsService.getPrometheusMetrics();

      this.logger.debug(`[${operationId}] Metrics collected successfully`, {
        metricsSize: metrics.length,
      });

      response.set({
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      response.send(metrics);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Failed to collect metrics: ${errorMessage}`,
        {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
      );

      response.status(HttpStatus.INTERNAL_SERVER_ERROR);
      response.set('Content-Type', 'text/plain');
      response.send(`# Metrics collection failed: ${errorMessage}\n`);
    }
  }

  /**
   * Metrics health status
   * GET /metrics/health
   */
  @Get('health')
  @ApiOperation({
    summary: 'Metrics system health',
    description: 'Returns health status of the metrics collection system',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics system health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string' },
        metricsCount: { type: 'number' },
        registryStatus: { type: 'string' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async getMetricsHealth() {
    const operationId = `metrics_health_${Date.now()}`;
    this.logger.debug(`[${operationId}] Metrics health check requested`);

    try {
      const registry = this.metricsService.getRegistry();
      const metrics = await registry.metrics();
      const metricsLines = metrics
        .split('\n')
        .filter((line) => line.startsWith('#') || line.trim().length > 0);

      const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        metricsCount: metricsLines.filter((line) => !line.startsWith('#'))
          .length,
        registryStatus: 'active',
        operationId,
      };

      this.logger.debug(`[${operationId}] Metrics health check completed`, {
        status: response.status,
        metricsCount: response.metricsCount,
      });

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `[${operationId}] Metrics health check failed: ${errorMessage}`,
        {
          error: errorMessage,
        },
      );

      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: errorMessage,
        operationId,
      };
    }
  }

  /**
   * Metrics metadata and documentation
   * GET /metrics/info
   */
  @Get('info')
  @ApiOperation({
    summary: 'Metrics information',
    description:
      'Returns information about available metrics and their descriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics metadata and documentation',
  })
  @HttpCode(HttpStatus.OK)
  getMetricsInfo() {
    const operationId = `metrics_info_${Date.now()}`;
    this.logger.debug(`[${operationId}] Metrics info requested`);

    const metricsInfo = {
      service: 'Bytebot Agent',
      version: '2.0.0',
      description:
        'Comprehensive application metrics for monitoring and observability',
      endpoint: '/metrics',
      format: 'Prometheus text format',
      categories: {
        api: {
          description: 'HTTP API request metrics',
          metrics: [
            'bytebot_agent_http_requests_total',
            'bytebot_agent_http_request_duration_seconds',
            'bytebot_agent_http_requests_in_flight',
          ],
        },
        tasks: {
          description: 'Task processing metrics',
          metrics: [
            'bytebot_agent_tasks_total',
            'bytebot_agent_task_processing_duration_seconds',
            'bytebot_agent_tasks_in_progress',
            'bytebot_agent_task_queue_size',
          ],
        },
        computer_use: {
          description: 'Computer-use operation metrics',
          metrics: [
            'bytebot_agent_computer_operations_total',
            'bytebot_agent_computer_operations_duration_seconds',
            'bytebot_agent_computer_use_errors_total',
            'bytebot_agent_ane_processing_duration_seconds',
          ],
        },
        websockets: {
          description: 'WebSocket connection and messaging metrics',
          metrics: [
            'bytebot_agent_websocket_connections_active',
            'bytebot_agent_websocket_messages_total',
            'bytebot_agent_websocket_errors_total',
          ],
        },
        database: {
          description: 'Database performance and connection metrics',
          metrics: [
            'bytebot_agent_database_connections',
            'bytebot_agent_database_query_duration_seconds',
            'bytebot_agent_database_errors_total',
          ],
        },
        authentication: {
          description: 'Authentication and authorization metrics',
          metrics: [
            'bytebot_agent_auth_attempts_total',
            'bytebot_agent_auth_duration_seconds',
            'bytebot_agent_active_user_sessions',
          ],
        },
        system: {
          description: 'System resource and health metrics',
          metrics: [
            'bytebot_agent_memory_usage_bytes',
            'bytebot_agent_cpu_usage_percent',
            'bytebot_agent_disk_usage_bytes',
            'bytebot_agent_system_health_score',
          ],
        },
        errors: {
          description: 'Error tracking and monitoring metrics',
          metrics: [
            'bytebot_agent_errors_total',
            'bytebot_agent_errors_by_category_total',
          ],
        },
        business: {
          description: 'Business intelligence and performance metrics',
          metrics: [
            'bytebot_agent_api_requests_per_second',
            'bytebot_agent_task_success_rate',
          ],
        },
      },
      scraping: {
        interval: '30s',
        timeout: '10s',
        path: '/metrics',
        contentType: 'text/plain; version=0.0.4; charset=utf-8',
      },
      timestamp: new Date().toISOString(),
      operationId,
    };

    this.logger.debug(`[${operationId}] Metrics info provided`, {
      categoriesCount: Object.keys(metricsInfo.categories).length,
    });

    return metricsInfo;
  }
}
