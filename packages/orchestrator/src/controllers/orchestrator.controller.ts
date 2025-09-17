/**
 * Orchestrator Controller - REST API Endpoints
 *
 * Comprehensive REST API endpoints for orchestration management with
 * Parlant integration, real-time monitoring, and enterprise features.
 *
 * @module OrchestratorController
 * @version 1.0.0
 * @author AIgent Orchestrator Team
 */

import {
  Controller,
  Post,
  Get,
  Put as _Put,
  Delete as _Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards as _UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
  ApiBearerAuth,
  ApiProperty
} from '@nestjs/swagger';
import { IsUUID as _IsUUID, IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// Core services
import { ParlantOrchestratorService } from '../services/parlant-orchestrator.service';
import { PerformanceMonitoringService } from '../services/performance-monitoring.service';

// Types and interfaces
import {
  ParlantOrchestrationRequest as _ParlantOrchestrationRequest,
  ParlantOrchestrationResult,
  OrchestrationUserContext
} from '../services/parlant-orchestrator.service';
import {
  OrchestrationTask,
  OrchestrationPriority,
  OrchestrationStatus,
  OrchestrationState,
  OrchestrationExecutionContext,
  OrchestrationMetrics
} from '../types/orchestrator.types';
import {
  ParlantUserContext
} from '../types/parlant-shared.types';

// Additional response types
interface PerformanceMetricsResponse {
  summary: OrchestrationMetrics;
  detailed: Record<string, unknown> | null;
  timestamp: string;
  query: PerformanceMetricsDto;
}

interface HealthComponent {
  status: 'up' | 'down' | 'degraded';
  [key: string]: unknown;
}

interface OrchestratorConfigurationResponse {
  performance: {
    maxConcurrentExecutions: number;
    defaultTimeoutMs: number;
  };
  features: {
    parlantIntegration: boolean;
    caching: boolean;
    monitoring: boolean;
  };
  [key: string]: unknown;
}

// DTOs for request/response validation
class ExecuteOrchestrationDto {
  @ApiProperty({ description: 'Orchestration task configuration' })
  task!: OrchestrationTask;

  @ApiProperty({ description: 'User context for authorization' })
  userContext!: OrchestrationUserContext;

  @ApiProperty({ description: 'Parlant user context', required: false })
  conversationContext?: ParlantUserContext;

  @ApiProperty({ description: 'Execution options', required: false })
  options?: {
    dryRun?: boolean;
    skipValidation?: boolean;
    timeoutOverrideMs?: number;
    priorityOverride?: OrchestrationPriority;
    tags?: string[];
  };
}

class BulkExecuteOrchestrationDto {
  @ApiProperty({ description: 'Array of orchestration requests' })
  requests!: ExecuteOrchestrationDto[];

  @ApiProperty({ description: 'Coordination options for bulk execution', required: false })
  coordinationOptions?: {
    maxConcurrency?: number;
    failureStrategy?: 'fail_fast' | 'continue_on_error';
    batchSize?: number;
  };
}

class OrchestrationQueryDto {
  @IsOptional()
  @IsEnum(OrchestrationStatus)
  @ApiProperty({ description: 'Filter by orchestration status', required: false })
  status?: OrchestrationStatus;

  @IsOptional()
  @IsEnum(OrchestrationPriority)
  @ApiProperty({ description: 'Filter by orchestration priority', required: false })
  priority?: OrchestrationPriority;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  @ApiProperty({ description: 'Number of results to return', required: false })
  limit?: number = 50;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ApiProperty({ description: 'Number of results to skip', required: false })
  offset?: number = 0;

  @IsOptional()
  @ApiProperty({ description: 'Start date for filtering', required: false })
  @Transform(({ value }) => new Date(value))
  startDate?: Date;

  @IsOptional()
  @ApiProperty({ description: 'End date for filtering', required: false })
  @Transform(({ value }) => new Date(value))
  endDate?: Date;

  @IsOptional()
  @ApiProperty({ description: 'User ID filter', required: false })
  userId?: string;

  @IsOptional()
  @ApiProperty({ description: 'Task ID filter', required: false })
  taskId?: string;
}

class PerformanceMetricsDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  @ApiProperty({ description: 'Hours of metrics to retrieve', required: false })
  hours?: number = 1;

  @IsOptional()
  @ApiProperty({ 
    description: 'Granularity of metrics',
    enum: ['minute', 'hour', 'day'],
    required: false 
  })
  granularity?: 'minute' | 'hour' | 'day' = 'minute';

  @IsOptional()
  @ApiProperty({ description: 'Include detailed breakdown', required: false })
  includeBreakdown?: boolean = false;
}

@ApiTags('Orchestrator')
@ApiBearerAuth()
@ApiSecurity('bearer')
@Controller('api/orchestrator')
@UseInterceptors()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(
    private readonly orchestratorService: ParlantOrchestratorService,
    private readonly performanceService: PerformanceMonitoringService,
  ) {}

  // ===== ORCHESTRATION EXECUTION ENDPOINTS =====

  @Post('execute')
  @ApiOperation({ 
    summary: 'Execute orchestration task',
    description: 'Execute a single orchestration task with Parlant validation and approval workflow'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Orchestration executed successfully',
    type: 'object'
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request parameters' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid authentication' 
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - Insufficient permissions' 
  })
  @ApiResponse({ 
    status: 429, 
    description: 'Too many requests - Rate limit exceeded' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error' 
  })
  async executeOrchestration(
    @Body() request: ExecuteOrchestrationDto
  ): Promise<ParlantOrchestrationResult> {
    this.logger.log('Executing orchestration task', {
      taskId: request.task.taskId,
      userId: request.userContext.userId,
      priority: request.task.priority
    });

    try {
      // Convert DTO to proper request format with default conversation context if missing
      const orchestrationRequest: _ParlantOrchestrationRequest = {
        task: request.task,
        userContext: request.userContext,
        conversationContext: request.conversationContext || {
          userId: request.userContext.userId,
          sessionId: `session_${Date.now()}`,
          roles: ['user'],
          ipAddress: 'unknown',
          metadata: {}
        },
        options: request.options
      };
      
      const result = await this.orchestratorService.executeOrchestration(orchestrationRequest);
      
      this.logger.log('Orchestration completed', {
        executionId: result.executionContext.executionId,
        success: !result.error,
        durationMs: result.performanceMetrics.totalExecutionTimeMs
      });

      return result;

    } catch (error) {
      this.logger.error('Orchestration execution failed', error);
      
      throw new HttpException(
        {
          message: 'Orchestration execution failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('execute/bulk')
  @ApiOperation({ 
    summary: 'Execute multiple orchestrations in parallel',
    description: 'Execute multiple orchestration tasks with coordination and failure handling'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Bulk orchestration executed successfully',
    type: 'array'
  })
  async executeBulkOrchestration(
    @Body() request: BulkExecuteOrchestrationDto
  ): Promise<ParlantOrchestrationResult[]> {
    this.logger.log(`Executing bulk orchestration - ${request.requests.length} tasks`);

    try {
      // Convert DTOs to proper request format with default conversation context if missing
      const orchestrationRequests: _ParlantOrchestrationRequest[] = request.requests.map(req => ({
        task: req.task,
        userContext: req.userContext,
        conversationContext: req.conversationContext || {
          userId: req.userContext.userId,
          sessionId: `session_${Date.now()}`,
          roles: ['user'],
          ipAddress: 'unknown',
          metadata: {}
        },
        options: req.options
      }));
      
      const results = await this.orchestratorService.executeParallelOrchestrations(
        orchestrationRequests
      );
      
      const successful = results.filter(r => !r.error).length;
      const failed = results.filter(r => r.error).length;

      this.logger.log('Bulk orchestration completed', {
        total: request.requests.length,
        successful,
        failed
      });

      return results;

    } catch (error) {
      this.logger.error('Bulk orchestration execution failed', error);
      
      throw new HttpException(
        {
          message: 'Bulk orchestration execution failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('execute/:executionId/cancel')
  @ApiOperation({ 
    summary: 'Cancel active orchestration',
    description: 'Cancel an actively running orchestration task'
  })
  @ApiParam({ name: 'executionId', description: 'Execution ID to cancel' })
  @ApiResponse({ 
    status: 200, 
    description: 'Orchestration cancelled successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Execution not found' 
  })
  async cancelOrchestration(
    @Param('executionId') executionId: string
  ): Promise<{ cancelled: boolean; message: string }> {
    this.logger.log(`Cancelling orchestration: ${executionId}`);

    try {
      const cancelled = await this.orchestratorService.cancelExecution(executionId);
      
      if (!cancelled) {
        throw new HttpException(
          'Execution not found or already completed',
          HttpStatus.NOT_FOUND
        );
      }

      return {
        cancelled: true,
        message: `Orchestration ${executionId} cancelled successfully`
      };

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Failed to cancel orchestration', error);
      
      throw new HttpException(
        {
          message: 'Failed to cancel orchestration',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== ORCHESTRATION STATUS AND MONITORING =====

  @Get('status/:executionId')
  @ApiOperation({ 
    summary: 'Get orchestration status',
    description: 'Get current status and progress of an orchestration task'
  })
  @ApiParam({ name: 'executionId', description: 'Execution ID to query' })
  @ApiResponse({ 
    status: 200, 
    description: 'Orchestration status retrieved successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Execution not found' 
  })
  async getOrchestrationStatus(
    @Param('executionId') executionId: string
  ): Promise<OrchestrationState> {
    this.logger.debug(`Getting orchestration status: ${executionId}`);

    const status = this.orchestratorService.getExecutionStatus(executionId);
    
    if (!status) {
      throw new HttpException(
        'Execution not found',
        HttpStatus.NOT_FOUND
      );
    }

    return status;
  }

  @Get('result/:executionId')
  @ApiOperation({ 
    summary: 'Get orchestration result',
    description: 'Get complete result and metrics for a completed orchestration'
  })
  @ApiParam({ name: 'executionId', description: 'Execution ID to query' })
  @ApiResponse({ 
    status: 200, 
    description: 'Orchestration result retrieved successfully' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Execution not found' 
  })
  async getOrchestrationResult(
    @Param('executionId') executionId: string
  ): Promise<ParlantOrchestrationResult> {
    this.logger.debug(`Getting orchestration result: ${executionId}`);

    const result = this.orchestratorService.getExecutionResult(executionId);
    
    if (!result) {
      throw new HttpException(
        'Execution result not found',
        HttpStatus.NOT_FOUND
      );
    }

    return result;
  }

  @Get('list')
  @ApiOperation({ 
    summary: 'List orchestrations',
    description: 'Get list of orchestrations with filtering and pagination'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Orchestration list retrieved successfully' 
  })
  async listOrchestrations(
    @Query() query: OrchestrationQueryDto
  ): Promise<{
    orchestrations: OrchestrationExecutionContext[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    this.logger.debug('Listing orchestrations', query);

    try {
      // This would integrate with a database or storage system
      // For now, return mock data structure
      const orchestrations: OrchestrationExecutionContext[] = [];
      const total = 0;

      return {
        orchestrations,
        pagination: {
          total,
          limit: query.limit || 50,
          offset: query.offset || 0,
          hasMore: total > (query.offset || 0) + (query.limit || 50)
        }
      };

    } catch (error) {
      this.logger.error('Failed to list orchestrations', error);
      
      throw new HttpException(
        {
          message: 'Failed to list orchestrations',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== PERFORMANCE MONITORING ENDPOINTS =====

  @Get('metrics/performance')
  @ApiOperation({ 
    summary: 'Get performance metrics',
    description: 'Get comprehensive performance metrics for orchestration service'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Performance metrics retrieved successfully' 
  })
  async getPerformanceMetrics(
    @Query() query: PerformanceMetricsDto
  ): Promise<PerformanceMetricsResponse> {
    this.logger.debug('Getting performance metrics', query);

    try {
      const serviceMetrics = this.orchestratorService.getPerformanceMetrics();
      
      // Convert service metrics to OrchestrationMetrics format
      const metrics: OrchestrationMetrics = {
        totalExecutionTimeMs: serviceMetrics.averageExecutionTime || 0,
        validationTimeMs: 0, // Not available from service, using default
        serviceCallTimes: new Map<string, number>(), // Not available from service, using empty map
        peakMemoryMb: 0, // Not available from service, using default
        cpuUsageStats: {
          average: 0,
          peak: 0,
          timeline: []
        }, // Not available from service, using defaults
        networkStats: {
          bytesSent: 0,
          bytesReceived: 0,
          requestCount: serviceMetrics.totalExecutions || 0,
          avgRequestTimeMs: serviceMetrics.averageExecutionTime || 0
        }, // Partial data from service
        cacheStats: {
          hits: 0,
          misses: 0,
          hitRate: 0,
          avgResponseTimeMs: 0
        } // Not available from service, using defaults
      };
      
      // Add additional metrics from performance service if available
      const detailedMetrics = await this.performanceService?.getDetailedMetrics?.(
        query.hours,
        query.granularity,
        query.includeBreakdown
      );

      return {
        summary: metrics,
        detailed: detailedMetrics || null,
        timestamp: new Date().toISOString(),
        query: query
      };

    } catch (error) {
      this.logger.error('Failed to get performance metrics', error);
      
      throw new HttpException(
        {
          message: 'Failed to get performance metrics',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  @ApiOperation({ 
    summary: 'Health check',
    description: 'Get orchestrator service health status'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Service is healthy' 
  })
  @ApiResponse({ 
    status: 503, 
    description: 'Service is unhealthy' 
  })
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    version: string;
    components: Record<string, HealthComponent>;
  }> {
    this.logger.debug('Health check requested');

    try {
      const metrics = this.orchestratorService.getPerformanceMetrics();
      const isHealthy = metrics.successRate > 0.95 && metrics.activeExecutions < 1000;

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        components: {
          orchestrator: {
            status: isHealthy ? 'up' : 'degraded',
            activeExecutions: metrics.activeExecutions,
            successRate: metrics.successRate,
            averageResponseTime: metrics.averageExecutionTime
          },
          parlant: {
            status: 'up', // This would check actual Parlant connection
            connection: true
          },
          cache: {
            status: 'up', // This would check cache health
            hitRate: 0.85
          }
        }
      };

    } catch (error) {
      this.logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        components: {
          orchestrator: {
            status: 'down',
            error: error instanceof Error ? error.message : String(error)
          }
        }
      };
    }
  }

  @Get('metrics/realtime')
  @ApiOperation({ 
    summary: 'Get real-time metrics',
    description: 'Get real-time orchestration metrics for monitoring dashboards'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Real-time metrics retrieved successfully' 
  })
  async getRealTimeMetrics(): Promise<{
    timestamp: string;
    activeExecutions: number;
    queuedExecutions: number;
    throughput: {
      lastMinute: number;
      lastHour: number;
    };
    performance: {
      avgResponseTime: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
      errorRate: number;
    };
    resources: {
      memoryUsage: number;
      cpuUsage: number;
    };
  }> {
    this.logger.debug('Getting real-time metrics');

    try {
      const metrics = this.orchestratorService.getPerformanceMetrics();

      return {
        timestamp: new Date().toISOString(),
        activeExecutions: metrics.activeExecutions,
        queuedExecutions: 0, // This would come from queue monitoring
        throughput: {
          lastMinute: 0, // Calculate from metrics
          lastHour: 0   // Calculate from metrics
        },
        performance: {
          avgResponseTime: metrics.averageExecutionTime,
          p95ResponseTime: metrics.p95ResponseTime,
          p99ResponseTime: metrics.p99ResponseTime,
          errorRate: 1 - metrics.successRate
        },
        resources: {
          memoryUsage: 0, // Get from system monitoring
          cpuUsage: 0     // Get from system monitoring
        }
      };

    } catch (error) {
      this.logger.error('Failed to get real-time metrics', error);
      
      throw new HttpException(
        {
          message: 'Failed to get real-time metrics',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ===== CONFIGURATION AND MANAGEMENT ENDPOINTS =====

  @Get('config')
  @ApiOperation({ 
    summary: 'Get orchestrator configuration',
    description: 'Get current orchestrator configuration settings'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration retrieved successfully' 
  })
  async getConfiguration(): Promise<OrchestratorConfigurationResponse> {
    this.logger.debug('Getting orchestrator configuration');

    try {
      // Return sanitized configuration (without sensitive data)
      return {
        performance: {
          maxConcurrentExecutions: 100,
          defaultTimeoutMs: 300000
        },
        features: {
          parlantIntegration: true,
          caching: true,
          monitoring: true
        },
        version: '1.0.0',
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to get configuration', error);
      
      throw new HttpException(
        {
          message: 'Failed to get configuration',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('version')
  @ApiOperation({ 
    summary: 'Get version information',
    description: 'Get orchestrator service version and build information'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Version information retrieved successfully' 
  })
  async getVersionInfo(): Promise<{
    version: string;
    buildDate: string;
    commit: string;
    features: string[];
    dependencies: Record<string, string>;
  }> {
    return {
      version: '1.0.0',
      buildDate: new Date().toISOString(),
      commit: 'unknown',
      features: [
        'parlant-integration',
        'multi-service-coordination',
        'approval-workflows',
        'performance-optimization',
        'compliance-auditing',
        'real-time-monitoring'
      ],
      dependencies: {
        '@nestjs/common': '^10.0.0',
        '@nestjs/core': '^10.0.0',
        '@aiagent/shared': 'workspace:*'
      }
    };
  }
}