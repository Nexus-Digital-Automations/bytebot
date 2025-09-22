/**
 * Orchestration Analytics Controller
 *
 * Advanced analytics and monitoring API for browser orchestration operations
 * providing comprehensive performance metrics, error analytics, real-time monitoring,
 * and intelligent recommendations for distributed browser automation systems.
 *
 * @author Browser Orchestration Specialist
 * @version 1.0.0
 * @security-focus Critical
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  Logger,
  ParseEnumPipe,
  ValidationPipe,
} from '@nestjs/common';import {ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';import { OrchestrationAnalyticsService } from './orchestration-analytics.service';import { OrchestrationOperationType } from '../errors/orchestration-errors';import { OrchestrationResponseInterceptor } from '../interceptors/orchestration-response.interceptor';/*** Analytics query parameters
 */
interface AnalyticsQueryParams {
  startDate?: string;
  endDate?: string;
  operationType?: OrchestrationOperationType;
  timeWindow?: '1h' | '6h' | '24h' | '7d' | '30d';includeRealTime?: boolean;}

/**
 * Export request body
 */
interface ExportRequest {
  format: 'json' | 'csv' | 'excel';startDate: string;endDate: string;
  includeRawData?: boolean;
  operationType?: OrchestrationOperationType;
}

/**
 * Orchestration Analytics Controller
 *
 * Advanced analytics capabilities:
 * - Comprehensive performance metrics and KPIs
 * - Real-time orchestration monitoring and dashboards
 * - Advanced error analytics with pattern recognition
 * - Resource utilization tracking and optimization insights
 * - Intelligent recommendations for performance improvement
 * - Historical trend analysis and predictive analytics
 * - Custom reporting and data export capabilities
 * - Integration with external monitoring and alerting systems
 * - Role-based access control for sensitive analytics data
 */
@ApiTags('Orchestration Analytics')@Controller('orchestration-analytics')@ApiBearerAuth()@UseInterceptors(ClassSerializerInterceptor, OrchestrationResponseInterceptor)
export class OrchestrationAnalyticsController {
  private readonly logger = new Logger(OrchestrationAnalyticsController.name);

  constructor(
    private readonly analyticsService: OrchestrationAnalyticsService
  ) {
    this.logger.log('OrchestrationAnalyticsController initialized');}/**
   * Get comprehensive orchestration analytics
   */
  @Get('overview')@ApiOperation({summary: 'Get orchestration analytics overview',description: 'Retrieves comprehensive analytics overview including performance metrics, error analytics, real-time monitoring, and recommendations',})@ApiQuery({ name: 'startDate', type: String, required: false, description: 'Start date (ISO 8601)' })@ApiQuery({ name: 'endDate', type: String, required: false, description: 'End date (ISO 8601)' })@ApiQuery({ name: 'operationType', enum: OrchestrationOperationType, required: false })@ApiQuery({ name: 'timeWindow', enum: ['1h', '6h', '24h', '7d', '30d'], required: false })@ApiResponse({ status: HttpStatus.OK, description: 'Analytics overview retrieved successfully' })async getAnalyticsOverview(@Query() query: AnalyticsQueryParams
  ) {
    const startTime = Date.now();

    this.logger.log('Getting orchestration analytics overview', {
      timeWindow: query.timeWindow,
      operationType: query.operationType,
      hasDateRange: !!(query.startDate && query.endDate),
    });

    try {
      const timeRange = this.parseTimeRange(query);
      const analytics = await this.analyticsService.getOrchestrationAnalytics(
        timeRange,
        query.operationType
      );

      this.logger.log(`Analytics overview retrieved in ${Date.now() - startTime}ms`, {
        totalErrors: analytics.errors.totalErrors,
        activeOrchestrations: analytics.monitoring.activeOrchestrations.length,
        systemHealthScore: analytics.monitoring.performanceIndicators.systemHealthScore,
      });

      return {
        data: analytics,
        orchestrationContext: {
          orchestrationId: this.generateAnalyticsId(),
          operationType: OrchestrationOperationType.AGGREGATED_REPORTING,
          distributedContext: {
            totalOperations: 1,
            completedOperations: 1,
            failedOperations: 0,
            remainingOperations: 0,
            parallelExecutions: 1,
            coordinationState: 'completed' as const,},resourceContext: {
            browserSessions: 0,
            activeTasks: 0,
          },
          performanceMetrics: {
            executionTime: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      this.logger.error('Failed to get analytics overview', {error: error instanceof Error ? error.message : 'Unknown error',query,duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get real-time orchestration monitoring data
   */
  @Get('monitoring/real-time')@ApiOperation({summary: 'Get real-time monitoring data',description: 'Retrieves real-time monitoring data for active orchestrations, system resources, and performance indicators',})@ApiResponse({ status: HttpStatus.OK, description: 'Real-time monitoring data retrieved successfully' })async getRealTimeMonitoring() {const startTime = Date.now();

    this.logger.log('Getting real-time monitoring data');

    try {
      const monitoringData = await this.analyticsService.getRealTimeMonitoring();

      this.logger.log(`Real-time monitoring data retrieved in ${Date.now() - startTime}ms`, {
        activeOrchestrations: monitoringData.activeOrchestrations.length,
        systemHealthScore: monitoringData.performanceIndicators.systemHealthScore,
        totalAlerts: monitoringData.alerts.length,
      });

      return {
        data: monitoringData,
        orchestrationContext: {
          orchestrationId: this.generateAnalyticsId(),
          operationType: OrchestrationOperationType.MULTI_SITE_MONITORING,
          distributedContext: {
            totalOperations: 1,
            completedOperations: 1,
            failedOperations: 0,
            remainingOperations: 0,
            parallelExecutions: 1,
            coordinationState: 'completed' as const,},resourceContext: {
            browserSessions: 0,
            activeTasks: 0,
          },
          performanceMetrics: {
            executionTime: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      this.logger.error('Failed to get real-time monitoring data', {error: error instanceof Error ? error.message : 'Unknown error',duration: Date.now() - startTime,});
      throw error;
    }
  }

  /**
   * Get performance metrics for specific operation type
   */
  @Get('performance/:operationType')@ApiOperation({summary: 'Get performance metrics by operation type',description: 'Retrieves detailed performance metrics for a specific orchestration operation type',})@ApiParam({ name: 'operationType', enum: OrchestrationOperationType })@ApiQuery({ name: 'startDate', type: String, required: false })@ApiQuery({ name: 'endDate', type: String, required: false })@ApiResponse({ status: HttpStatus.OK, description: 'Performance metrics retrieved successfully' })async getPerformanceMetrics(@Param('operationType', new ParseEnumPipe(OrchestrationOperationType)) operationType: OrchestrationOperationType,@Query() query: AnalyticsQueryParams) {
    const startTime = Date.now();

    this.logger.log('Getting performance metrics', {
      operationType,
      hasDateRange: !!(query.startDate && query.endDate),
    });

    try {
      const timeRange = this.parseTimeRange(query);
      const metrics = await this.analyticsService.getPerformanceMetrics(operationType, timeRange);

      this.logger.log(`Performance metrics retrieved in ${Date.now() - startTime}ms`, {
        operationType,
        totalOperations: metrics.totalOperations,
        successRate: (metrics.successfulOperations / metrics.totalOperations) * 100,
        avgExecutionTime: metrics.averageExecutionTime,
      });

      return {
        data: metrics,
        orchestrationContext: {
          orchestrationId: this.generateAnalyticsId(),
          operationType: OrchestrationOperationType.AGGREGATED_REPORTING,
          distributedContext: {
            totalOperations: 1,
            completedOperations: 1,
            failedOperations: 0,
            remainingOperations: 0,
            parallelExecutions: 1,
            coordinationState: 'completed' as const,},resourceContext: {
            browserSessions: 0,
            activeTasks: 0,
          },
          performanceMetrics: {
            executionTime: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      this.logger.error('Failed to get performance metrics', {error: error instanceof Error ? error.message : 'Unknown error',operationType,duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get orchestration error analytics
   */
  @Get('errors/analytics')@ApiOperation({summary: 'Get orchestration error analytics',description: 'Retrieves comprehensive error analytics including categorization, trends, and recovery statistics',})@ApiQuery({ name: 'startDate', type: String, required: false })@ApiQuery({ name: 'endDate', type: String, required: false })@ApiQuery({ name: 'operationType', enum: OrchestrationOperationType, required: false })@ApiResponse({ status: HttpStatus.OK, description: 'Error analytics retrieved successfully' })async getErrorAnalytics(@Query() query: AnalyticsQueryParams
  ) {
    const startTime = Date.now();

    this.logger.log('Getting orchestration error analytics', {
      operationType: query.operationType,
      hasDateRange: !!(query.startDate && query.endDate),
    });

    try {
      const timeRange = this.parseTimeRange(query);
      const errorAnalytics = await this.analyticsService.getErrorAnalytics(timeRange, query.operationType);

      this.logger.log(`Error analytics retrieved in ${Date.now() - startTime}ms`, {
        totalErrors: errorAnalytics.totalErrors,
        recoverySuccessRate: errorAnalytics.recoveryAnalytics.recoverySuccessRate,
        trendDirection: errorAnalytics.errorTrends.trendDirection,
      });

      return {
        data: errorAnalytics,
        orchestrationContext: {
          orchestrationId: this.generateAnalyticsId(),
          operationType: OrchestrationOperationType.AGGREGATED_REPORTING,
          distributedContext: {
            totalOperations: 1,
            completedOperations: 1,
            failedOperations: 0,
            remainingOperations: 0,
            parallelExecutions: 1,
            coordinationState: 'completed' as const,},resourceContext: {
            browserSessions: 0,
            activeTasks: 0,
          },
          performanceMetrics: {
            executionTime: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      this.logger.error('Failed to get error analytics', {error: error instanceof Error ? error.message : 'Unknown error',query,duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get analytics recommendations
   */
  @Get('recommendations')@ApiOperation({summary: 'Get analytics recommendations',description: 'Retrieves intelligent recommendations for performance optimization and error reduction',})@ApiQuery({ name: 'startDate', type: String, required: false })@ApiQuery({ name: 'endDate', type: String, required: false })@ApiQuery({ name: 'operationType', enum: OrchestrationOperationType, required: false })@ApiResponse({ status: HttpStatus.OK, description: 'Recommendations retrieved successfully' })async getRecommendations(@Query() query: AnalyticsQueryParams
  ) {
    const startTime = Date.now();

    this.logger.log('Getting analytics recommendations', {
      operationType: query.operationType,
      hasDateRange: !!(query.startDate && query.endDate),
    });

    try {
      const timeRange = this.parseTimeRange(query);
      const recommendations = await this.analyticsService.getRecommendations(timeRange, query.operationType);

      this.logger.log(`Recommendations retrieved in ${Date.now() - startTime}ms`, {
        performanceRecommendations: recommendations.performanceRecommendations.length,
        errorReductionItems: recommendations.errorReduction.length,
        systemHealthScore: recommendations.systemHealth.overallScore,
      });

      return {
        data: recommendations,
        orchestrationContext: {
          orchestrationId: this.generateAnalyticsId(),
          operationType: OrchestrationOperationType.AGGREGATED_REPORTING,
          distributedContext: {
            totalOperations: 1,
            completedOperations: 1,
            failedOperations: 0,
            remainingOperations: 0,
            parallelExecutions: 1,
            coordinationState: 'completed' as const,},resourceContext: {
            browserSessions: 0,
            activeTasks: 0,
          },
          performanceMetrics: {
            executionTime: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      this.logger.error('Failed to get recommendations', {error: error instanceof Error ? error.message : 'Unknown error',query,duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Export analytics data
   */
  @Post('export')@HttpCode(HttpStatus.OK)@ApiOperation({
    summary: 'Export analytics data',description: 'Exports analytics data in specified format for external analysis or reporting',})@ApiBody({
    schema: {
      type: 'object',properties: {format: { type: 'string', enum: ['json', 'csv', 'excel'] },startDate: { type: 'string', format: 'date-time' },endDate: { type: 'string', format: 'date-time' },includeRawData: { type: 'boolean', default: false },operationType: { enum: Object.values(OrchestrationOperationType) },},
      required: ['format', 'startDate', 'endDate'],},})
  @ApiResponse({ status: HttpStatus.OK, description: 'Data exported successfully' })async exportAnalyticsData(@Body(ValidationPipe) exportRequest: ExportRequest
  ) {
    const startTime = Date.now();

    this.logger.log('Exporting analytics data', {
      format: exportRequest.format,
      dateRange: `${exportRequest.startDate} - ${exportRequest.endDate}`,includeRawData: exportRequest.includeRawData,operationType: exportRequest.operationType,
    });

    try {
      const timeRange = {
        start: new Date(exportRequest.startDate),
        end: new Date(exportRequest.endDate),
      };

      const exportData = await this.analyticsService.exportAnalyticsData(
        exportRequest.format,
        timeRange,
        exportRequest.includeRawData
      );

      this.logger.log(`Analytics data exported in ${Date.now() - startTime}ms`, {
        format: exportData.format,
        recordCount: exportData.metadata.recordCount,
        fileSize: JSON.stringify(exportData.data).length,
      });

      return {
        data: exportData,
        orchestrationContext: {
          orchestrationId: this.generateAnalyticsId(),
          operationType: OrchestrationOperationType.AGGREGATED_REPORTING,
          distributedContext: {
            totalOperations: 1,
            completedOperations: 1,
            failedOperations: 0,
            remainingOperations: 0,
            parallelExecutions: 1,
            coordinationState: 'completed' as const,},resourceContext: {
            browserSessions: 0,
            activeTasks: 0,
          },
          performanceMetrics: {
            executionTime: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      this.logger.error('Failed to export analytics data', {error: error instanceof Error ? error.message : 'Unknown error',exportRequest,duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Get orchestration health status
   */
  @Get('health')@ApiOperation({summary: 'Get orchestration health status',description: 'Retrieves current health status and system indicators for orchestration operations',})@ApiResponse({ status: HttpStatus.OK, description: 'Health status retrieved successfully' })async getHealthStatus() {const startTime = Date.now();

    this.logger.log('Getting orchestration health status');try {const recommendations = await this.analyticsService.getRecommendations();
      const monitoring = await this.analyticsService.getRealTimeMonitoring();

      const healthStatus = {
        overallHealth: recommendations.systemHealth.overallScore,
        status: recommendations.systemHealth.overallScore > 80 ? 'healthy' :recommendations.systemHealth.overallScore > 60 ? 'warning' : 'critical',
        indicators: recommendations.systemHealth.healthIndicators,
        criticalIssues: recommendations.systemHealth.criticalIssues,
        trend: recommendations.systemHealth.trend,
        activeAlerts: monitoring.alerts.filter(alert => !alert.acknowledged),
        systemLoad: {
          resourceUtilization: monitoring.systemResourceUsage.cpuUsagePercent,
          memoryUsage: monitoring.systemResourceUsage.memoryUsageMb,
          browserUtilization: (monitoring.systemResourceUsage.totalBrowsers - monitoring.systemResourceUsage.availableBrowsers) / monitoring.systemResourceUsage.totalBrowsers,
        },
        performanceIndicators: monitoring.performanceIndicators,
        lastUpdate: new Date(),
      };

      this.logger.log(`Health status retrieved in ${Date.now() - startTime}ms`, {
        overallHealth: healthStatus.overallHealth,
        status: healthStatus.status,
        criticalIssues: healthStatus.criticalIssues,
        activeAlerts: healthStatus.activeAlerts.length,
      });

      return {
        data: healthStatus,
        orchestrationContext: {
          orchestrationId: this.generateAnalyticsId(),
          operationType: OrchestrationOperationType.MULTI_SITE_MONITORING,
          distributedContext: {
            totalOperations: 1,
            completedOperations: 1,
            failedOperations: 0,
            remainingOperations: 0,
            parallelExecutions: 1,
            coordinationState: 'completed' as const,},resourceContext: {
            browserSessions: 0,
            activeTasks: 0,
          },
          performanceMetrics: {
            executionTime: Date.now() - startTime,
          },
        },
      };

    } catch (error) {
      this.logger.error('Failed to get health status', {error: error instanceof Error ? error.message : 'Unknown error',duration: Date.now() - startTime,});
      throw error;
    }
  }

  // Private helper methods

  private parseTimeRange(query: AnalyticsQueryParams): { start: Date; end: Date } | undefined {
    if (query.startDate && query.endDate) {
      return {
        start: new Date(query.startDate),
        end: new Date(query.endDate),
      };
    }

    if (query.timeWindow) {
      const end = new Date();
      const start = new Date();

      switch (query.timeWindow) {
        case '1h':start.setHours(end.getHours() - 1);break;
        case '6h':start.setHours(end.getHours() - 6);break;
        case '24h':start.setDate(end.getDate() - 1);break;
        case '7d':start.setDate(end.getDate() - 7);break;
        case '30d':
          start.setDate(end.getDate() - 30);
          break;
      }

      return { start, end };
    }

    return undefined;
  }

  private generateAnalyticsId(): string {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}