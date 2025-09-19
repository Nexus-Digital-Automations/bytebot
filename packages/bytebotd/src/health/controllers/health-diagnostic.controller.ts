/**
 * Health Diagnostic Controller - Parlant Enhanced Diagnostics API
 *
 * REST API controller providing comprehensive health diagnostics with conversational
 * AI validation. Exposes endpoints for system analysis, issue identification,
 * recommendation generation, and real-time health monitoring.
 *
 * Features:
 * - Comprehensive diagnostic API with Parlant validation
 * - Real-time health monitoring endpoints
 * - AI-powered issue analysis and recommendations
 * - Conversational diagnostic reporting
 * - Performance benchmarking with trend analysis
 * - Security assessment with risk evaluation
 * - Automated remediation guidance
 *
 * @author Claude Code - Health & Metrics Parlant Integration
 * @version 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  HttpStatus,
  HttpException,
  Logger,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { HealthDiagnosticService } from '../services/health-diagnostic.service';
import {
  SystemDiagnosticRequest,
  SystemDiagnosticResult,
  DiagnosticType,
  DiagnosticScope,
  DiagnosticStatus,
  DiagnosticIssue,
  IssueSeverity,
  RecommendationType,
} from '../interfaces/health-diagnostic.interfaces';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LoggingInterceptor } from '../../common/interceptors/logging.interceptor';

// ===== REQUEST/RESPONSE DTOs =====

/**
 * Diagnostic request DTO
 */
export class DiagnosticRequestDto {
  diagnosticType: DiagnosticType;
  scope: DiagnosticScope;
  includePerformanceAnalysis?: boolean = true;
  includeResourceUsage?: boolean = true;
  includeNetworkDiagnostics?: boolean = false;
  includeDependencyChecks?: boolean = true;
  generateRecommendations?: boolean = true;
  deepAnalysis?: boolean = false;
  requireParlantValidation?: boolean = true;
  autoApproveRoutine?: boolean = true;
  generateConversationalReport?: boolean = true;
}

/**
 * Quick health check response DTO
 */
export class QuickHealthResponseDto {
  status: DiagnosticStatus;
  healthScore: number;
  timestamp: Date;
  componentCount: number;
  issuesFound: number;
  criticalIssues: number;
  uptime: number;
  responseTime: number;
}

/**
 * Component health summary DTO
 */
export class ComponentHealthSummaryDto {
  componentName: string;
  status: DiagnosticStatus;
  healthScore: number;
  responseTime: number;
  uptime: number;
  errorRate: number;
  lastCheck: Date;
}

/**
 * System metrics overview DTO
 */
export class SystemMetricsDto {
  cpu: { usage: number; status: string };
  memory: { usage: number; status: string };
  disk: { usage: number; status: string };
  network: { usage: number; status: string };
  performance: {
    averageResponseTime: number;
    throughput: number;
    errorRate: number;
    availability: number;
  };
}

/**
 * Issue summary DTO
 */
export class IssueSummaryDto {
  id: string;
  type: string;
  severity: IssueSeverity;
  title: string;
  affectedComponents: string[];
  businessImpact: string;
  urgency: string;
  estimatedResolution: Date;
}

/**
 * Recommendation summary DTO
 */
export class RecommendationSummaryDto {
  id: string;
  type: RecommendationType;
  title: string;
  priority: string;
  effort: string;
  timeframe: string;
  expectedBenefit: number;
}

// ===== MAIN CONTROLLER =====

@ApiTags('Health Diagnostics')
@Controller('health/diagnostics')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class HealthDiagnosticController {
  private readonly logger = new Logger(HealthDiagnosticController.name);

  constructor(private readonly diagnosticService: HealthDiagnosticService) {}

  // ===== QUICK HEALTH ENDPOINTS =====

  /**
   * Get quick system health overview
   */
  @Get('quick')
  @ApiOperation({
    summary: 'Quick Health Check',
    description: 'Get a rapid overview of system health status without full diagnostic analysis',
  })
  @ApiResponse({
    status: 200,
    description: 'Quick health check completed successfully',
    type: QuickHealthResponseDto,
  })
  @ApiResponse({
    status: 503,
    description: 'System is experiencing issues',
  })
  @Roles('admin', 'sre', 'developer', 'monitor')
  async getQuickHealth(): Promise<QuickHealthResponseDto> {
    const operationId = `quick${Date.now()}${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[${operationId}] Quick health check requested`);

    try {
      // Perform lightweight diagnostic
      const request: SystemDiagnosticRequest = {
        operationId,
        diagnosticType: DiagnosticType.QUICK_HEALTH_CHECK,
        scope: DiagnosticScope.SYSTEM_LEVEL,
        userContext: {
          userId: 'system',
          userRole: 'monitor',
          securityClearance: 'LOW',
        },
        parameters: {
          includePerformanceAnalysis: false,
          includeResourceUsage: true,
          includeNetworkDiagnostics: false,
          includeDependencyChecks: false,
          generateRecommendations: false,
          deepAnalysis: false,
        },
        parlantPreferences: {
          requireValidation: false,
          autoApproveRoutine: true,
          escalateOnCritical: false,
          generateConversationalReport: false,
        },
      };

      const result = await this.diagnosticService.performSystemDiagnostic(request);

      const response: QuickHealthResponseDto = {
        status: result.status,
        healthScore: result.healthScore,
        timestamp: result.metadata.timestamp,
        componentCount: result.componentResults.size,
        issuesFound: result.issues.length,
        criticalIssues: result.issues.filter(i => i.severity === IssueSeverity.CRITICAL || i.severity === IssueSeverity.EMERGENCY).length,
        uptime: 99.9, // TODO: Calculate actual uptime
        responseTime: result.metadata.executionTime,
      };

      this.logger.log(`[${operationId}] Quick health check completed`, {
        operationId,
        status: response.status,
        healthScore: response.healthScore,
        issuesFound: response.issuesFound,
      });

      // Return 503 if system is in critical state
      if (result.status === DiagnosticStatus.CRITICAL || result.status === DiagnosticStatus.FAILED) {
        throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
      }

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Quick health check failed`, {
        operationId,
        error: errorMessage,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          status: DiagnosticStatus.FAILED,
          healthScore: 0,
          timestamp: new Date(),
          componentCount: 0,
          issuesFound: 1,
          criticalIssues: 1,
          uptime: 0,
          responseTime: 0,
          error: errorMessage,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get component health summaries
   */
  @Get('components')
  @ApiOperation({
    summary: 'Component Health Summary',
    description: 'Get health status overview for all system components',
  })
  @ApiResponse({
    status: 200,
    description: 'Component health summaries retrieved successfully',
    type: [ComponentHealthSummaryDto],
  })
  @Roles('admin', 'sre', 'developer', 'monitor')
  async getComponentHealthSummary(): Promise<ComponentHealthSummaryDto[]> {
    const operationId = `comp${Date.now()}${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[${operationId}] Component health summary requested`);

    try {
      const request: SystemDiagnosticRequest = {
        operationId,
        diagnosticType: DiagnosticType.QUICK_HEALTH_CHECK,
        scope: DiagnosticScope.COMPONENT_LEVEL,
        userContext: {
          userId: 'system',
          userRole: 'monitor',
          securityClearance: 'LOW',
        },
        parameters: {
          includePerformanceAnalysis: false,
          includeResourceUsage: false,
          includeNetworkDiagnostics: false,
          includeDependencyChecks: false,
          generateRecommendations: false,
          deepAnalysis: false,
        },
        parlantPreferences: {
          requireValidation: false,
          autoApproveRoutine: true,
          escalateOnCritical: false,
          generateConversationalReport: false,
        },
      };

      const result = await this.diagnosticService.performSystemDiagnostic(request);

      const summaries: ComponentHealthSummaryDto[] = Array.from(result.componentResults.entries()).map(([name, component]) => ({
        componentName: name,
        status: component.status,
        healthScore: component.healthScore,
        responseTime: component.performance.responseTime,
        uptime: component.performance.uptime,
        errorRate: component.performance.errorRate,
        lastCheck: new Date(),
      }));

      this.logger.log(`[${operationId}] Component health summary completed`, {
        operationId,
        componentCount: summaries.length,
      });

      return summaries;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Component health summary failed`, {
        operationId,
        error: errorMessage,
      });

      throw new HttpException(
        { message: 'Failed to retrieve component health summary', error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get system metrics overview
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'System Metrics Overview',
    description: 'Get current system resource utilization and performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'System metrics retrieved successfully',
    type: SystemMetricsDto,
  })
  @Roles('admin', 'sre', 'developer', 'monitor')
  async getSystemMetrics(): Promise<SystemMetricsDto> {
    const operationId = `metrics${Date.now()}${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[${operationId}] System metrics overview requested`);

    try {
      const request: SystemDiagnosticRequest = {
        operationId,
        diagnosticType: DiagnosticType.RESOURCE_UTILIZATION,
        scope: DiagnosticScope.SYSTEM_LEVEL,
        userContext: {
          userId: 'system',
          userRole: 'monitor',
          securityClearance: 'LOW',
        },
        parameters: {
          includePerformanceAnalysis: true,
          includeResourceUsage: true,
          includeNetworkDiagnostics: false,
          includeDependencyChecks: false,
          generateRecommendations: false,
          deepAnalysis: false,
        },
        parlantPreferences: {
          requireValidation: false,
          autoApproveRoutine: true,
          escalateOnCritical: false,
          generateConversationalReport: false,
        },
      };

      const result = await this.diagnosticService.performSystemDiagnostic(request);

      const metrics: SystemMetricsDto = {
        cpu: {
          usage: result.resourceAnalysis.cpu.currentUsage,
          status: result.resourceAnalysis.cpu.currentUsage > 80 ? 'WARNING' : 'NORMAL',
        },
        memory: {
          usage: (result.resourceAnalysis.memory.usedMemory / result.resourceAnalysis.memory.totalMemory) * 100,
          status: (result.resourceAnalysis.memory.usedMemory / result.resourceAnalysis.memory.totalMemory) > 0.85 ? 'WARNING' : 'NORMAL',
        },
        disk: {
          usage: (result.resourceAnalysis.storage.usedSpace / result.resourceAnalysis.storage.totalSpace) * 100,
          status: (result.resourceAnalysis.storage.usedSpace / result.resourceAnalysis.storage.totalSpace) > 0.85 ? 'WARNING' : 'NORMAL',
        },
        network: {
          usage: result.resourceAnalysis.network.throughput,
          status: result.resourceAnalysis.network.throughput > 800 ? 'WARNING' : 'NORMAL',
        },
        performance: {
          averageResponseTime: result.performanceAnalysis.responseTime?.average ?? 0,
          throughput: result.performanceAnalysis.throughput?.requestsPerSecond ?? 0,
          errorRate: result.performanceAnalysis.errorRate?.overall ?? 0,
          availability: 99.9, // TODO: Calculate from component uptimes
        },
      };

      this.logger.log(`[${operationId}] System metrics overview completed`, {
        operationId,
        cpuUsage: metrics.cpu.usage,
        memoryUsage: metrics.memory.usage,
        diskUsage: metrics.disk.usage,
      });

      return metrics;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] System metrics overview failed`, {
        operationId,
        error: errorMessage,
      });

      throw new HttpException(
        { message: 'Failed to retrieve system metrics', error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== COMPREHENSIVE DIAGNOSTIC ENDPOINTS =====

  /**
   * Perform comprehensive system diagnostic
   */
  @Post('comprehensive')
  @ApiOperation({
    summary: 'Comprehensive System Diagnostic',
    description: 'Perform in-depth system analysis with AI insights and recommendations',
  })
  @ApiBody({ type: DiagnosticRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Comprehensive diagnostic completed successfully',
    type: Object, // SystemDiagnosticResult is too complex for Swagger
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid diagnostic request parameters',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions for diagnostic operation',
  })
  @Roles('admin', 'sre')
  async performComprehensiveDiagnostic(
    @Body() diagnosticDto: DiagnosticRequestDto,
  ): Promise<SystemDiagnosticResult> {
    const operationId = `comp${Date.now()}${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[${operationId}] Comprehensive diagnostic requested`, {
      operationId,
      type: diagnosticDto.diagnosticType,
      scope: diagnosticDto.scope,
    });

    try {
      const request: SystemDiagnosticRequest = {
        operationId,
        diagnosticType: diagnosticDto.diagnosticType,
        scope: diagnosticDto.scope,
        userContext: {
          userId: 'api_user', // TODO: Extract from JWT token
          userRole: 'sre',
          securityClearance: 'HIGH',
        },
        parameters: {
          includePerformanceAnalysis: diagnosticDto.includePerformanceAnalysis ?? true,
          includeResourceUsage: diagnosticDto.includeResourceUsage ?? true,
          includeNetworkDiagnostics: diagnosticDto.includeNetworkDiagnostics ?? false,
          includeDependencyChecks: diagnosticDto.includeDependencyChecks ?? true,
          generateRecommendations: diagnosticDto.generateRecommendations ?? true,
          deepAnalysis: diagnosticDto.deepAnalysis ?? false,
        },
        parlantPreferences: {
          requireValidation: diagnosticDto.requireParlantValidation ?? true,
          autoApproveRoutine: diagnosticDto.autoApproveRoutine ?? true,
          escalateOnCritical: true,
          generateConversationalReport: diagnosticDto.generateConversationalReport ?? true,
        },
      };

      const result = await this.diagnosticService.performSystemDiagnostic(request);

      this.logger.log(`[${operationId}] Comprehensive diagnostic completed`, {
        operationId,
        status: result.status,
        healthScore: result.healthScore,
        executionTime: result.metadata.executionTime,
        issuesFound: result.issues.length,
        recommendationsGenerated: result.recommendations.length,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Comprehensive diagnostic failed`, {
        operationId,
        error: errorMessage,
      });

      if (errorMessage.includes('denied by Parlant validation')) {
        throw new HttpException(
          { message: 'Diagnostic operation not approved', error: errorMessage },
          HttpStatus.FORBIDDEN,
        );
      }

      throw new HttpException(
        { message: 'Comprehensive diagnostic failed', error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ===== ISSUE MANAGEMENT ENDPOINTS =====

  /**
   * Get current system issues
   */
  @Get('issues')
  @ApiOperation({
    summary: 'Get System Issues',
    description: 'Retrieve current system issues and their severity levels',
  })
  @ApiQuery({ name: 'severity', required: false, enum: IssueSeverity, description: 'Filter by issue severity' })
  @ApiQuery({ name: 'component', required: false, description: 'Filter by affected component' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Maximum number of issues to return' })
  @ApiResponse({
    status: 200,
    description: 'System issues retrieved successfully',
    type: [IssueSummaryDto],
  })
  @Roles('admin', 'sre', 'developer', 'monitor')
  async getSystemIssues(
    @Query('severity') severity?: IssueSeverity,
    @Query('component') component?: string,
    @Query('limit') limit: number = 50,
  ): Promise<IssueSummaryDto[]> {
    const operationId = `issues${Date.now()}${Math.random().toString(36).substring(7)}`;
    this.logger.log(`[${operationId}] System issues requested`, {
      operationId,
      severity,
      component,
      limit,
    });

    try {
      // Perform lightweight diagnostic to get current issues
      const request: SystemDiagnosticRequest = {
        operationId,
        diagnosticType: DiagnosticType.ERROR_INVESTIGATION,
        scope: DiagnosticScope.SYSTEM_LEVEL,
        userContext: {
          userId: 'system',
          userRole: 'monitor',
          securityClearance: 'MEDIUM',
        },
        parameters: {
          includePerformanceAnalysis: false,
          includeResourceUsage: true,
          includeNetworkDiagnostics: false,
          includeDependencyChecks: true,
          generateRecommendations: false,
          deepAnalysis: false,
        },
        parlantPreferences: {
          requireValidation: false,
          autoApproveRoutine: true,
          escalateOnCritical: false,
          generateConversationalReport: false,
        },
      };

      const result = await this.diagnosticService.performSystemDiagnostic(request);

      let issues = result.issues;

      // Apply filters
      if (severity) {
        issues = issues.filter(issue => issue.severity === severity);
      }

      if (component) {
        issues = issues.filter(issue => issue.affectedComponents.includes(component));
      }

      // Apply limit
      issues = issues.slice(0, limit);

      const summaries: IssueSummaryDto[] = issues.map(issue => ({
        id: issue.id,
        type: issue.type,
        severity: issue.severity,
        title: issue.title,
        affectedComponents: issue.affectedComponents,
        businessImpact: issue.impact.businessImpact,
        urgency: issue.urgency,
        estimatedResolution: issue.estimatedResolution,
      }));

      this.logger.log(`[${operationId}] System issues retrieved`, {
        operationId,
        totalIssues: summaries.length,
        criticalIssues: summaries.filter(i => i.severity === IssueSeverity.CRITICAL).length,
      });

      return summaries;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`[${operationId}] Failed to retrieve system issues`, {
        operationId,
        error: errorMessage,
      });

      throw new HttpException(
        { message: 'Failed to retrieve system issues', error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get issue details
   */
  @Get('issues/:issueId')
  @ApiOperation({
    summary: 'Get Issue Details',
    description: 'Retrieve detailed information about a specific issue',
  })
  @ApiParam({ name: 'issueId', description: 'Issue identifier' })
  @ApiResponse({
    status: 200,
    description: 'Issue details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Issue not found',
  })
  @Roles('admin', 'sre', 'developer')
  async getIssueDetails(@Param('issueId') issueId: string): Promise<DiagnosticIssue> {
    this.logger.log(`Issue details requested for: ${issueId}`);

    try {
      // TODO: Implement issue details retrieval from storage
      throw new HttpException(
        { message: 'Issue details storage not implemented' },
        HttpStatus.NOT_IMPLEMENTED,
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to retrieve issue details for: ${issueId}`, {
        issueId,
        error: errorMessage,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        { message: 'Failed to retrieve issue details', error: errorMessage },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}