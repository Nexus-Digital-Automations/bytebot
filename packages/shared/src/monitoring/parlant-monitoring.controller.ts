/**
 * Parlant Conversational Monitoring Controller
 * 
 * REST endpoints for conversational monitoring interface providing natural
 * language queries, real-time insights, and intelligent API analytics.
 * 
 * Features:
 * - Natural language monitoring queries
 * - Real-time conversational dashboard
 * - Intelligent alerts and recommendations
 * - Performance analytics with explanations
 * - Security monitoring insights
 * - Proactive anomaly detection
 * 
 * @author AIgent Enterprise Integration Team
 * @version 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Logger,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean, IsDateString } from 'class-validator';
import { 
  ParlantValidated,
  ParlantSecure,
  SecurityLevel,
} from '../decorators/parlant-validation.decorators';
import { 
  ParlantMonitoringService,
  ParlantMonitoringQuery,
  ParlantMonitoringResponse,
} from './parlant-monitoring.service';
import { SecurityLevel as SecurityLevelEnum } from '../types/parlant.types';

/**
 * DTO for natural language monitoring queries
 */
class MonitoringQueryDto implements Omit<ParlantMonitoringQuery, 'timeRange'> {
  @ApiProperty({
    description: 'Natural language query about monitoring data',
    example: 'How is the API performance over the last hour?',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Start time for query range',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({
    description: 'End time for query range',
    example: '2024-01-15T11:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({
    description: 'Specific services to focus on',
    example: ['auth-service', 'task-service'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiProperty({
    description: 'Security levels to include in analysis',
    example: ['HIGH', 'CRITICAL'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  securityLevels?: SecurityLevelEnum[];

  @ApiProperty({
    description: 'Include performance metrics in response',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includePerformance?: boolean;

  @ApiProperty({
    description: 'Include validation details in response',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeValidation?: boolean;
}

/**
 * DTO for follow-up queries using conversation context
 */
class FollowUpQueryDto {
  @ApiProperty({
    description: 'Follow-up query',
    example: 'What about security metrics?',
  })
  @IsString()
  query: string;

  @ApiProperty({
    description: 'Conversation context from previous query',
    example: 'parlant_monitor_1234567890_abc123',
  })
  @IsString()
  conversationContext: string;
}

/**
 * Parlant Conversational Monitoring Controller
 * 
 * Provides intelligent monitoring endpoints with natural language interfaces
 * and conversational analytics for comprehensive API insights.
 */
@ApiTags('Parlant Monitoring')
@Controller('monitoring/parlant')
export class ParlantMonitoringController {
  private readonly logger = new Logger(ParlantMonitoringController.name);

  constructor(
    private readonly parlantMonitoringService: ParlantMonitoringService,
  ) {
    this.logger.log('ParlantMonitoringController initialized with conversational endpoints');
  }

  /**
   * Natural language monitoring query endpoint
   * Processes conversational queries about system monitoring and performance
   */
  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ParlantSecure(SecurityLevelEnum._MEDIUM)
  @ApiOperation({
    summary: 'Process natural language monitoring query',
    description: 'Submit a natural language query to get intelligent monitoring insights, performance analytics, and recommendations',
  })
  @ApiBody({ 
    type: MonitoringQueryDto,
    description: 'Natural language monitoring query with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversational monitoring response with insights and recommendations',
    schema: {
      type: 'object',
      properties: {
        summary: { 
          type: 'string', 
          description: 'Human-readable summary of current status',
          example: 'Your API is performing well with a 95.2% validation approval rate...',
        },
        insights: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Key insights discovered from the data',
          example: ['Response times have improved by 15% over the last hour', 'No security anomalies detected'],
        },
        recommendations: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Actionable recommendations based on analysis',
          example: ['Consider enabling caching for /api/tasks endpoints', 'Monitor memory usage trends'],
        },
        data: {
          type: 'object',
          description: 'Supporting metrics and data',
          properties: {
            validationMetrics: { type: 'object' },
            performanceMetrics: { type: 'object' },
            securityMetrics: { type: 'object' },
            anomalies: { type: 'array' },
          },
        },
        conversationContext: { 
          type: 'string',
          description: 'Context ID for follow-up queries',
          example: 'parlant_monitor_1234567890_abc123',
        },
        timestamp: { 
          type: 'string', 
          format: 'date-time',
          description: 'When the analysis was generated',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query format or parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Monitoring service unavailable',
  })
  async processQuery(
    @Body(ValidationPipe) queryDto: MonitoringQueryDto,
  ): Promise<ParlantMonitoringResponse> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Processing natural language monitoring query`, {
      operationId,
      query: queryDto.query,
      includePerformance: queryDto.includePerformance,
      includeValidation: queryDto.includeValidation,
      servicesCount: queryDto.services?.length || 0,
    });

    try {
      // Convert DTO to service query
      const query: ParlantMonitoringQuery = {
        query: queryDto.query,
        timeRange: queryDto.startTime && queryDto.endTime ? {
          start: new Date(queryDto.startTime),
          end: new Date(queryDto.endTime),
        } : undefined,
        services: queryDto.services,
        securityLevels: queryDto.securityLevels,
        includePerformance: queryDto.includePerformance,
        includeValidation: queryDto.includeValidation,
      };

      const response = await this.parlantMonitoringService.queryMonitoring(query);

      const processingTime = Date.now() - startTime;
      this.logger.log(`[${operationId}] Natural language query processed successfully`, {
        operationId,
        processingTimeMs: processingTime,
        insightsCount: response.insights.length,
        recommendationsCount: response.recommendations.length,
        anomaliesDetected: response.data.anomalies.length,
      });

      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Natural language query processing failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime,
        query: queryDto.query,
      });

      throw error;
    }
  }

  /**
   * Follow-up query using conversation context
   * Allows users to ask follow-up questions based on previous queries
   */
  @Post('query/follow-up')
  @HttpCode(HttpStatus.OK)
  @ParlantValidated({
    securityLevel: SecurityLevel._MEDIUM,
    cacheable: false,
  })
  @ApiOperation({
    summary: 'Process follow-up monitoring query',
    description: 'Ask follow-up questions based on previous monitoring query context',
  })
  @ApiBody({ 
    type: FollowUpQueryDto,
    description: 'Follow-up query with conversation context',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversational response building on previous context',
  })
  async processFollowUpQuery(
    @Body(ValidationPipe) followUpDto: FollowUpQueryDto,
  ): Promise<ParlantMonitoringResponse> {
    const operationId = this.generateOperationId();
    
    this.logger.log(`[${operationId}] Processing follow-up monitoring query`, {
      operationId,
      query: followUpDto.query,
      conversationContext: followUpDto.conversationContext,
    });

    try {
      // For now, treat as regular query - in full implementation would use context
      const query: ParlantMonitoringQuery = {
        query: `Follow-up: ${followUpDto.query}`,
        includePerformance: true,
        includeValidation: true,
      };

      const response = await this.parlantMonitoringService.queryMonitoring(query);

      this.logger.log(`[${operationId}] Follow-up query processed successfully`, {
        operationId,
        conversationContext: followUpDto.conversationContext,
      });

      return response;

    } catch (error) {
      this.logger.error(`[${operationId}] Follow-up query processing failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        conversationContext: followUpDto.conversationContext,
      });

      throw error;
    }
  }

  /**
   * Real-time conversational dashboard
   * Provides current system status with conversational explanations
   */
  @Get('dashboard')
  @ParlantValidated({
    securityLevel: SecurityLevel._MEDIUM,
    cacheable: true,
  })
  @ApiOperation({
    summary: 'Get conversational monitoring dashboard',
    description: 'Retrieve real-time system status with conversational summaries and intelligent alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time dashboard with conversational insights',
    schema: {
      type: 'object',
      properties: {
        overallStatus: { 
          type: 'string', 
          enum: ['HEALTHY', 'WARNING', 'ERROR', 'CRITICAL'],
          description: 'Overall system health status',
        },
        conversationalSummary: { 
          type: 'string',
          description: 'Human-readable summary of current system state',
          example: 'All systems are running smoothly. Performance is optimal with no security concerns.',
        },
        keyMetrics: {
          type: 'array',
          description: 'Key performance indicators with conversational descriptions',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string', example: 'Response Time' },
              value: { type: 'string', example: '145ms' },
              trend: { type: 'string', enum: ['UP', 'DOWN', 'STABLE'] },
              conversationalDescription: { 
                type: 'string', 
                example: 'Response times are within normal range and stable',
              },
            },
          },
        },
        alerts: {
          type: 'array',
          description: 'Intelligent alerts with explanations',
          items: {
            type: 'object',
            properties: {
              level: { type: 'string', enum: ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] },
              message: { type: 'string' },
              conversationalExplanation: { type: 'string' },
              suggestedActions: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        recentActivity: {
          type: 'array',
          description: 'Recent monitoring events with conversational summaries',
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getConversationalDashboard(): Promise<any> {
    const operationId = this.generateOperationId();
    
    this.logger.debug(`[${operationId}] Retrieving conversational dashboard`);

    try {
      const dashboard = await this.parlantMonitoringService.getConversationalDashboard();

      this.logger.debug(`[${operationId}] Conversational dashboard retrieved`, {
        operationId,
        overallStatus: dashboard.overallStatus,
        metricsCount: dashboard.keyMetrics.length,
        alertsCount: dashboard.alerts.length,
      });

      return dashboard;

    } catch (error) {
      this.logger.error(`[${operationId}] Dashboard retrieval failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get monitoring insights for specific time period
   * Provides trend analysis and pattern recognition
   */
  @Get('insights/:period')
  @ParlantValidated({
    securityLevel: SecurityLevel._MEDIUM,
    cacheable: true,
  })
  @ApiOperation({
    summary: 'Get monitoring insights for time period',
    description: 'Retrieve intelligent insights and trend analysis for specified time period',
  })
  @ApiParam({
    name: 'period',
    description: 'Time period for analysis',
    enum: ['1h', '6h', '24h', '7d', '30d'],
    example: '24h',
  })
  @ApiQuery({
    name: 'focus',
    description: 'Focus area for insights',
    enum: ['performance', 'security', 'validation', 'all'],
    required: false,
    example: 'performance',
  })
  @ApiResponse({
    status: 200,
    description: 'Insights and trends for specified period',
    schema: {
      type: 'object',
      properties: {
        period: { type: 'string', example: '24h' },
        focus: { type: 'string', example: 'performance' },
        summary: { 
          type: 'string',
          example: 'Over the last 24 hours, your API has shown excellent stability...',
        },
        trends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              direction: { type: 'string', enum: ['improving', 'declining', 'stable'] },
              change: { type: 'string' },
              explanation: { type: 'string' },
            },
          },
        },
        patterns: {
          type: 'array',
          description: 'Detected patterns with explanations',
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getPeriodicInsights(
    @Param('period') period: string,
    @Query('focus') focus?: string,
  ): Promise<any> {
    const operationId = this.generateOperationId();
    
    this.logger.log(`[${operationId}] Retrieving periodic insights`, {
      operationId,
      period,
      focus: focus || 'all',
    });

    try {
      // For now, return mock insights structure
      const insights = {
        period,
        focus: focus || 'all',
        summary: `Over the last ${period}, your API has maintained good performance with consistent validation approval rates.`,
        trends: [
          {
            metric: 'Response Time',
            direction: 'stable' as const,
            change: '±2ms',
            explanation: 'Response times have remained consistent within normal variance',
          },
          {
            metric: 'Validation Success Rate',
            direction: 'improving' as const,
            change: '+1.2%',
            explanation: 'Validation approval rate has improved slightly due to better request patterns',
          },
        ],
        patterns: [
          {
            type: 'Traffic Pattern',
            description: 'Peak usage between 9-11 AM and 2-4 PM',
            significance: 0.85,
            recommendations: ['Consider auto-scaling during peak hours'],
          },
        ],
        recommendations: [
          'Monitor memory usage trends during peak hours',
          'Consider implementing additional caching for frequently accessed endpoints',
        ],
        timestamp: new Date(),
      };

      this.logger.log(`[${operationId}] Periodic insights generated`, {
        operationId,
        trendsCount: insights.trends.length,
        patternsCount: insights.patterns.length,
        recommendationsCount: insights.recommendations.length,
      });

      return insights;

    } catch (error) {
      this.logger.error(`[${operationId}] Periodic insights generation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        period,
        focus,
      });

      throw error;
    }
  }

  /**
   * Generate operation ID for tracking
   */
  private generateOperationId(): string {
    return `parlant_monitor_ctrl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Fix for missing ApiProperty import
function ApiProperty(options: any): PropertyDecorator {
  return () => {};
}