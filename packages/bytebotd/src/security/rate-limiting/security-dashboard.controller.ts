import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus, HttpException } from '@nestjs/common';
import { SecurityMonitoringService } from './security-monitoring.service';
import { SecurityAlertsService } from './security-alerts.service';
import { SecurityMetricsService } from './security-metrics.service';
import { RateLimiterService } from './rate-limiter.service';
import { DDoSProtectionService } from '../ddos-protection/ddos-protection.service';
import { APIAbusePreventionService } from '../api-abuse-prevention/api-abuse-prevention.service';
import { TrafficPatternAnalysisService } from '../traffic-analysis/traffic-pattern-analysis.service';

/**
 * Security Dashboard API Controller
 *
 * Provides REST API endpoints for security dashboard:
 * - Real-time security metrics and KPIs
 * - Security events and alerts management
 * - System health and performance monitoring
 * - Configuration management for security services
 * - Reporting and analytics endpoints
 * - Administrative controls for security features
 */

@Controller('api/security')
export class SecurityDashboardController {
  constructor(
    private readonly monitoringService: SecurityMonitoringService,
    private readonly alertsService: SecurityAlertsService,
    private readonly metricsService: SecurityMetricsService,
    private readonly rateLimiterService: RateLimiterService,
    private readonly ddosProtectionService: DDoSProtectionService,
    private readonly abusePreventionService: APIAbusePreventionService,
    private readonly trafficAnalysisService: TrafficPatternAnalysisService,
  ) {}

  // ===== DASHBOARD OVERVIEW =====

  @Get('dashboard/overview')
  async getDashboardOverview() {
    try {
      const [health, kpis, recentEvents, threatIntelligence] = await Promise.all([
        this.monitoringService.getSecurityHealth(),
        this.metricsService.getKPIs(),
        this.monitoringService.getSecurityEvents({ limit: 10 }),
        this.monitoringService.getThreatIntelligence()
      ]);

      return {
        status: 'success',
        data: {
          health,
          kpis,
          recentEvents: recentEvents.events,
          threatIntelligence,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get dashboard overview', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('dashboard/health')
  async getSystemHealth() {
    try {
      const health = await this.monitoringService.getSecurityHealth();
      return {
        status: 'success',
        data: health
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get system health', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('dashboard/metrics')
  async getDashboardMetrics(@Query('timeRange') timeRange?: string) {
    try {
      let range: { start: number; end: number } | undefined;

      if (timeRange) {
        const now = Date.now();
        switch (timeRange) {
          case '1h':
            range = { start: now - 3600000, end: now };
            break;
          case '24h':
            range = { start: now - 86400000, end: now };
            break;
          case '7d':
            range = { start: now - 604800000, end: now };
            break;
          case '30d':
            range = { start: now - 2592000000, end: now };
            break;
        }
      }

      const [kpis, trends, metrics] = await Promise.all([
        this.metricsService.getKPIs(),
        this.monitoringService.getSecurityTrends(),
        range ? this.metricsService.getMetricSeries('security_events_total', {}, range) : []
      ]);

      return {
        status: 'success',
        data: {
          kpis,
          trends,
          metrics,
          timeRange: range
        }
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get dashboard metrics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== SECURITY EVENTS =====

  @Get('events')
  async getSecurityEvents(
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('source') source?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('correlationId') correlationId?: string
  ) {
    try {
      const options: any = {};

      if (type) options.type = type;
      if (severity) options.severity = severity;
      if (source) options.source = source;
      if (correlationId) options.correlationId = correlationId;

      if (start && end) {
        options.timeRange = {
          start: parseInt(start),
          end: parseInt(end)
        };
      }

      if (limit) options.limit = parseInt(limit);
      if (offset) options.offset = parseInt(offset);

      const result = this.monitoringService.getSecurityEvents(options);

      return {
        status: 'success',
        data: result,
        pagination: {
          limit: options.limit || 100,
          offset: options.offset || 0,
          total: result.total
        }
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get security events', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('events/:eventId/resolve')
  async resolveSecurityEvent(
    @Param('eventId') eventId: string,
    @Body() body: { resolvedBy: string; notes?: string }
  ) {
    try {
      const success = this.monitoringService.resolveSecurityEvent(
        eventId,
        body.resolvedBy,
        body.notes
      );

      if (!success) {
        throw new HttpException(
          { status: 'error', message: 'Event not found' },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        status: 'success',
        message: 'Event resolved successfully'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        { status: 'error', message: 'Failed to resolve event', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== ALERTS MANAGEMENT =====

  @Get('alerts')
  async getAlerts(
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('type') type?: string,
    @Query('source') source?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      const options: any = {};

      if (status) options.status = status;
      if (severity) options.severity = severity;
      if (type) options.type = type;
      if (source) options.source = source;

      if (start && end) {
        options.timeRange = {
          start: parseInt(start),
          end: parseInt(end)
        };
      }

      if (limit) options.limit = parseInt(limit);
      if (offset) options.offset = parseInt(offset);

      const result = this.alertsService.getAlerts(options);

      return {
        status: 'success',
        data: result,
        pagination: {
          limit: options.limit || 100,
          offset: options.offset || 0,
          total: result.total
        }
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get alerts', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('alerts')
  async createAlert(
    @Body() alertData: {
      type: string;
      severity: 'info' | 'warning' | 'error' | 'critical';
      title: string;
      description: string;
      source: string;
      correlationId?: string;
      data?: Record<string, any>;
      tags?: string[];
    }
  ) {
    try {
      const alert = await this.alertsService.createAlert(alertData);

      return {
        status: 'success',
        data: alert,
        message: 'Alert created successfully'
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to create alert', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('alerts/:alertId/acknowledge')
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
    @Body() body: { acknowledgedBy: string }
  ) {
    try {
      const success = this.alertsService.acknowledgeAlert(alertId, body.acknowledgedBy);

      if (!success) {
        throw new HttpException(
          { status: 'error', message: 'Alert not found' },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        status: 'success',
        message: 'Alert acknowledged successfully'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        { status: 'error', message: 'Failed to acknowledge alert', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('alerts/:alertId/resolve')
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { resolvedBy: string; notes?: string }
  ) {
    try {
      const success = this.alertsService.resolveAlert(alertId, body.resolvedBy, body.notes);

      if (!success) {
        throw new HttpException(
          { status: 'error', message: 'Alert not found' },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        status: 'success',
        message: 'Alert resolved successfully'
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        { status: 'error', message: 'Failed to resolve alert', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('alerts/statistics')
  async getAlertStatistics(
    @Query('start') start?: string,
    @Query('end') end?: string
  ) {
    try {
      let timeRange: { start: number; end: number } | undefined;

      if (start && end) {
        timeRange = {
          start: parseInt(start),
          end: parseInt(end)
        };
      }

      const statistics = this.alertsService.getAlertStatistics(timeRange);

      return {
        status: 'success',
        data: statistics
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get alert statistics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== METRICS AND REPORTING =====

  @Get('metrics/series/:metricName')
  async getMetricSeries(
    @Param('metricName') metricName: string,
    @Query('labels') labels?: string,
    @Query('start') start?: string,
    @Query('end') end?: string
  ) {
    try {
      let parsedLabels: Record<string, string> | undefined;
      let timeRange: { start: number; end: number } | undefined;

      if (labels) {
        try {
          parsedLabels = JSON.parse(labels);
        } catch {
          throw new HttpException(
            { status: 'error', message: 'Invalid labels format' },
            HttpStatus.BAD_REQUEST
          );
        }
      }

      if (start && end) {
        timeRange = {
          start: parseInt(start),
          end: parseInt(end)
        };
      }

      const series = this.metricsService.getMetricSeries(metricName, parsedLabels, timeRange);

      return {
        status: 'success',
        data: series
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        { status: 'error', message: 'Failed to get metric series', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('metrics/prometheus')
  async getPrometheusMetrics() {
    try {
      const metrics = this.metricsService.exportPrometheusMetrics();

      return {
        status: 'success',
        data: metrics,
        contentType: 'text/plain'
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to export Prometheus metrics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('reports/performance')
  async getPerformanceReport(
    @Query('start') start?: string,
    @Query('end') end?: string
  ) {
    try {
      const now = Date.now();
      const timeRange = {
        start: start ? parseInt(start) : now - 86400000, // Default: last 24 hours
        end: end ? parseInt(end) : now
      };

      const report = this.metricsService.generatePerformanceReport(timeRange);

      return {
        status: 'success',
        data: report
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to generate performance report', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== SERVICE-SPECIFIC ENDPOINTS =====

  @Get('rate-limiter/metrics')
  async getRateLimiterMetrics() {
    try {
      const metrics = this.rateLimiterService.getMetrics();
      return {
        status: 'success',
        data: metrics
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get rate limiter metrics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('rate-limiter/rules')
  async getRateLimitingRules() {
    try {
      const rules = this.rateLimiterService.getRules();
      return {
        status: 'success',
        data: rules
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get rate limiting rules', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('rate-limiter/rules')
  async createRateLimitingRule(@Body() rule: any) {
    try {
      this.rateLimiterService.updateRule(rule);
      return {
        status: 'success',
        message: 'Rate limiting rule created successfully'
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to create rate limiting rule', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('rate-limiter/rules/:ruleId')
  async deleteRateLimitingRule(@Param('ruleId') ruleId: string) {
    try {
      this.rateLimiterService.removeRule(ruleId);
      return {
        status: 'success',
        message: 'Rate limiting rule deleted successfully'
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to delete rate limiting rule', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ddos-protection/metrics')
  async getDDoSProtectionMetrics() {
    try {
      const metrics = this.ddosProtectionService.getMetrics();
      return {
        status: 'success',
        data: metrics
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get DDoS protection metrics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ddos-protection/spikes')
  async getTrafficSpikes() {
    try {
      const spikes = this.ddosProtectionService.getActiveSpikes();
      return {
        status: 'success',
        data: spikes
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get traffic spikes', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('ddos-protection/blocked-ips')
  async getBlockedIPs() {
    try {
      const blockedIPs = this.ddosProtectionService.getBlockedIPs();
      return {
        status: 'success',
        data: blockedIPs
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get blocked IPs', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('ddos-protection/block-ip')
  async blockIP(@Body() body: { ip: string; duration: number; reason: string }) {
    try {
      this.ddosProtectionService.manuallyBlockIP(body.ip, body.duration, body.reason);
      return {
        status: 'success',
        message: 'IP blocked successfully'
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to block IP', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('ddos-protection/block-ip/:ip')
  async unblockIP(@Param('ip') ip: string) {
    try {
      this.ddosProtectionService.manuallyUnblockIP(ip);
      return {
        status: 'success',
        message: 'IP unblocked successfully'
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to unblock IP', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('abuse-prevention/metrics')
  async getAbusePreventionMetrics() {
    try {
      const metrics = this.abusePreventionService.getMetrics();
      return {
        status: 'success',
        data: metrics
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get abuse prevention metrics', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('abuse-prevention/patterns')
  async getDetectedAbusePatterns() {
    try {
      const patterns = this.abusePreventionService.getDetectedAbuse();
      return {
        status: 'success',
        data: patterns
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get abuse patterns', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('traffic-analysis/patterns')
  async getTrafficPatterns() {
    try {
      const patterns = this.trafficAnalysisService.getDetectedPatterns();
      return {
        status: 'success',
        data: patterns
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get traffic patterns', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('traffic-analysis/anomalies')
  async getTrafficAnomalies(@Query('limit') limit?: string) {
    try {
      const limitNum = limit ? parseInt(limit) : 100;
      const anomalies = this.trafficAnalysisService.getAnomalies(limitNum);
      return {
        status: 'success',
        data: anomalies
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get traffic anomalies', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('traffic-analysis/forecasts')
  async getTrafficForecasts() {
    try {
      const forecasts = this.trafficAnalysisService.getForecasts();
      return {
        status: 'success',
        data: forecasts
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get traffic forecasts', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== DASHBOARD CONFIGURATION =====

  @Get('dashboards')
  async getDashboards() {
    try {
      const dashboards = this.metricsService.getDashboards();
      return {
        status: 'success',
        data: dashboards
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get dashboards', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('dashboards/:dashboardId')
  async getDashboard(@Param('dashboardId') dashboardId: string) {
    try {
      const dashboard = this.metricsService.getDashboard(dashboardId);

      if (!dashboard) {
        throw new HttpException(
          { status: 'error', message: 'Dashboard not found' },
          HttpStatus.NOT_FOUND
        );
      }

      return {
        status: 'success',
        data: dashboard
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        { status: 'error', message: 'Failed to get dashboard', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== ADMINISTRATIVE CONTROLS =====

  @Post('clear-data')
  async clearSecurityData(@Body() body: { confirm: boolean; services?: string[] }) {
    try {
      if (!body.confirm) {
        throw new HttpException(
          { status: 'error', message: 'Confirmation required' },
          HttpStatus.BAD_REQUEST
        );
      }

      const services = body.services || ['rate-limiter'];

      if (services.includes('rate-limiter')) {
        this.rateLimiterService.clearData();
      }

      // Add other services as needed

      return {
        status: 'success',
        message: 'Security data cleared successfully',
        clearedServices: services
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        { status: 'error', message: 'Failed to clear security data', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('system/status')
  async getSystemStatus() {
    try {
      const status = {
        timestamp: Date.now(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.version,
        services: {
          rateLimiter: 'active',
          ddosProtection: 'active',
          abuseDetection: 'active',
          trafficAnalysis: 'active',
          monitoring: 'active',
          alerts: 'active',
          metrics: 'active'
        }
      };

      return {
        status: 'success',
        data: status
      };
    } catch (error) {
      throw new HttpException(
        { status: 'error', message: 'Failed to get system status', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}