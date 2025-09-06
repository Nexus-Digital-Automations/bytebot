/**
 * Metrics Collection Controller
 *
 * Provides Prometheus-compatible metrics endpoints for system monitoring
 * and observability. Exposes custom application metrics alongside standard
 * system metrics for comprehensive platform monitoring.
 *
 * Features:
 * - Prometheus metrics endpoint (/metrics)
 * - Custom business metrics exposure
 * - Performance metrics collection
 * - Real-time system metrics
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { Controller, Get, Logger, Header, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Authenticated, CurrentUser, ByteBotdUser } from '../auth/decorators/roles.decorator';
import { MetricsService } from './metrics.service';

/**
 * Metrics collection controller providing Prometheus endpoints
 */
@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(private readonly metricsService: MetricsService) {
    this.logger.log('Metrics Controller initialized');
  }

  /**
   * Prometheus metrics endpoint
   * GET /metrics
   *
   * @returns Prometheus-formatted metrics data
   */
  @Get()
  @Authenticated()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async getMetrics(@CurrentUser() user: ByteBotdUser): Promise<string> {
    const operationId = `metrics_${Date.now()}`;
    this.logger.debug(`[${operationId}] Metrics collection requested`, {
      operationId,
      userId: user.id,
      username: user.username,
      role: user.role,
      securityEvent: 'metrics_access_requested'
    });

    try {
      const startTime = Date.now();
      const metricsData = await this.metricsService.getPrometheusMetrics();
      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `[${operationId}] Metrics collection completed successfully`,
        {
          operationId,
          userId: user.id,
          username: user.username,
          processingTimeMs: processingTime,
          securityEvent: 'metrics_access_completed'
        }
      );

      this.logger.debug(
        `[${operationId}] Metrics data size and timing`,
        {
          processingTimeMs: processingTime,
          metricsSize: metricsData.length,
        },
      );

      // Track metrics endpoint performance
      this.metricsService.recordApiRequestDuration(
        'GET',
        '/metrics',
        200,
        processingTime,
      );

      return metricsData;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Metrics collection failed: ${errorMessage}`,
      );

      // Track error metrics
      this.metricsService.recordApiRequestDuration('GET', '/metrics', 500, 0);

      // Return basic error info in Prometheus format
      return `# HELP bytebot_metrics_error Metrics collection errors
# TYPE bytebot_metrics_error counter
bytebot_metrics_error{error="${errorMessage}"} 1
`;
    }
  }
}
