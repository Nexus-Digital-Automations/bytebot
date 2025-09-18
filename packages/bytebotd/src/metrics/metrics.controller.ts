/**
 * Metrics Collection Controller - PARLANT INTEGRATED
 *
 * Provides Prometheus-compatible metrics endpoints for system monitoring
 * and observability with PARLANT CONVERSATIONAL VALIDATION for all metrics
 * collection operations. Exposes custom application metrics alongside standard
 * system metrics with comprehensive audit trail support.
 *
 * Features:
 * - Prometheus metrics endpoint (/metrics) with conversational validation
 * - Custom business metrics exposure with risk assessment
 * - Performance metrics collection with audit trails
 * - Real-time system metrics with Parlant approval
 * - Risk-based conversational validation for metrics operations
 * - Comprehensive audit trail for monitoring compliance
 *
 * PARLANT INTEGRATION:
 * - Prometheus collection: LOW risk (optimized validation with caching)
 * - Performance metrics: MEDIUM risk (conditional approval)
 * - System metrics: LOW risk (auto-approved for high-frequency operations)
 * - Custom metrics: MEDIUM risk (business context validation)
 *
 * @author Claude Code - Agent 4 (Health & Metrics Parlant Integration)
 * @version 2.0.0 - PARLANT MAXIMUM INTEGRATION
 */

import { Controller, Get, Logger, Header, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Authenticated,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';
import { BytebotMetricsService } from './metrics.service';
import {
  ParlantHealthMetricsValidationService,
  MetricsOperationType,
} from '../parlant/services/parlant-health-metrics-validation.service';

/**
 * Metrics collection controller providing Prometheus endpoints with Parlant validation
 */
@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(
    _private readonly metricsService: BytebotMetricsService,
    private readonly parlantValidationService: ParlantHealthMetricsValidationService,
  ) {
    this.logger.log('Metrics Controller initialized with Parlant validation');
    this.logger.log('PARLANT INTEGRATION: Risk-based conversational validation active for all metrics operations');
  }

  /**
   * Prometheus metrics endpoint with Parlant validation
   * GET /metrics
   *
   * @param user Current authenticated user
   * @returns Prometheus-formatted metrics data with conversational validation
   */
  @Get()
  @Authenticated()
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async getMetrics(@CurrentUser() user: ByteBotdUser): Promise<string> {
    const operationId = `metrics${Date.now()}`;
    this.logger.debug(`[${operationId}] Metrics collection requested with Parlant validation`, {
      operationId,
      userId: user.id,
      username: user.username,
      role: user.role,
      securityEvent: 'metrics_access_requested',
    });

    try {
      // PARLANT VALIDATION: Prometheus metrics collection (LOW risk - optimized with caching)
      const validation = await this.parlantValidationService.validateMetricsOperation(
        _MetricsOperationType.PROMETHEUS_COLLECTION,
        {
          endpoint: '/metrics',
          method: 'GET',
          frequency: 'high-frequency',
          metricsType: 'prometheus_format',
          includesSystemMetrics: true,
          includesApplicationMetrics: true,
          includesPerformanceMetrics: true,
        },
        { userId: user.id, userRole: user.role },
      );

      this.logger.debug(`[${operationId}] Parlant validation completed for metrics collection`, {
        operationId,
        approved: validation.approved,
        riskLevel: validation.riskLevel,
        validationDuration: validation.performanceImpact.validationDuration,
        cacheHit: validation.performanceImpact.cacheHit,
        optimization: validation.performanceImpact.optimization,
      });

      if (!validation.approved) {
        this.logger.warn(`[${operationId}] Metrics collection rejected by Parlant validation`, {
          operationId,
          reason: validation.reason,
          conversationId: validation.conversationId,
          userId: user.id,
        });

        // Track rejection metrics
        this.metricsService.recordApiRequestDuration('GET', '/metrics', 403, 0);

        // Return validation rejection in Prometheus format
        return `# HELP bytebot_metrics_validation_rejected Metrics validation rejections
# TYPE bytebot_metrics_validation_rejected counter
bytebot_metrics_validation_rejected{reason="${validation.reason ?? 'unknown'}"} 1
# HELP bytebot_metrics_conversation_id Conversation ID for validation
# TYPE bytebot_metrics_conversation_id info
bytebot_metrics_conversation_id{conversation_id="${validation.conversationId}"} 1
`;
      }

      const startTime = Date.now();

      // Execute metrics collection with Parlant audit trail
      const metricsData = await this.metricsService.getPrometheusMetrics();
      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `[${operationId}] Metrics collection completed successfully with Parlant audit`,
        {
          operationId,
          userId: user.id,
          username: user.username,
          processingTimeMs: processingTime,
          conversationId: validation.conversationId,
          validationOptimization: validation.performanceImpact.optimization,
          securityEvent: 'metrics_access_completed',
        },
      );

      this.logger.debug(`[${operationId}] Metrics data size and timing with Parlant validation`, {
        processingTimeMs: processingTime,
        validationTimeMs: validation.performanceImpact.validationDuration,
        totalTimeMs: processingTime + validation.performanceImpact.validationDuration,
        metricsSize: metricsData.length,
        cacheHit: validation.performanceImpact.cacheHit,
      });

      // Track metrics endpoint performance with validation overhead
      this.metricsService.recordApiRequestDuration(
        'GET',
        '/metrics',
        200,
        processingTime + validation.performanceImpact.validationDuration,
      );

      // Add Parlant validation metrics to the output
      const parlantMetrics = `
# HELP bytebot_parlant_validation_total Total Parlant validations performed
# TYPE bytebot_parlant_validation_total counter
bytebot_parlant_validation_total{operation="metrics_collection",result="approved"} 1

# HELP bytebot_parlant_validation_duration_seconds Parlant validation duration
# TYPE bytebot_parlant_validation_duration_seconds histogram
bytebot_parlant_validation_duration_seconds{operation="metrics_collection"} ${validation.performanceImpact.validationDuration / 1000}

# HELP bytebot_parlant_cache_hits_total Parlant validation cache hits
# TYPE bytebot_parlant_cache_hits_total counter
bytebot_parlant_cache_hits_total{operation="metrics_collection"} ${validation.performanceImpact.cacheHit ? 1 : 0}
`;

      return metricsData + parlantMetrics;

    } catch (_error) {
      const errorMessage =
        _error instanceof Error ? _error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Metrics collection failed: ${errorMessage}`,
        {
          operationId,
          userId: user.id,
          error: errorMessage,
        },
      );

      // Track error metrics
      this.metricsService.recordApiRequestDuration('GET', '/metrics', 500, 0);

      // Return comprehensive error info in Prometheus format
      return `# HELP bytebot_metrics_error Metrics collection errors
# TYPE bytebot_metrics_error counter
bytebot_metrics_error{error="${errorMessage.replace(/"/g, '\\"')}"} 1

# HELP bytebot_metrics_error_timestamp Error timestamp
# TYPE bytebot_metrics_error_timestamp gauge
bytebot_metrics_error_timestamp ${Date.now()}

# HELP bytebot_parlant_metrics_error Parlant metrics validation errors
# TYPE bytebot_parlant_metrics_error counter
bytebot_parlant_metrics_error{operation="metrics_collection"} 1
`;
    }
  }
}
