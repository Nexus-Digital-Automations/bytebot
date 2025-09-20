import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  ConflictException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { LoggingInterceptor } from '../common/interceptors/logging.interceptor';
import { PerformanceInterceptor } from '../common/interceptors/performance.interceptor';
import { SessionService } from './session.service';
import {
  CreateBrowserSessionDto,
  BrowserSessionDto,
  BrowserSessionStatus,
  SessionHealthCheckDto,
  SessionMetricsDto,
  SessionConfigUpdateDto,
  BulkSessionOperationDto,
  BulkSessionResultDto,
} from '../browser-use/dto/browser-session.dto';

/**
 * Browser Session Management Controller
 *
 * Dedicated controller for comprehensive browser session lifecycle management.
 * Provides specialized endpoints for session creation, monitoring, coordination,
 * and resource management with enterprise-grade security and authentication.
 *
 * Key Features:
 * - Complete session lifecycle management (create, monitor, update, cleanup)
 * - Multi-session coordination and resource management
 * - Session health monitoring and diagnostics
 * - Bulk session operations for enterprise scalability
 * - Authentication and authorization for all operations
 * - Comprehensive audit logging and performance monitoring
 * - Session isolation and security validation
 * - Resource cleanup and memory management
 *
 * Security:
 * - JWT authentication required for all endpoints
 * - Role-based access control (Operator/Admin)
 * - Session ownership validation
 * - Resource usage monitoring and limits
 * - Comprehensive audit trails
 * - Local-only operations (no cloud dependencies)
 *
 * Integration:
 * - Seamless integration with browser-use session management
 * - Coordination with task execution services
 * - Performance metrics and monitoring
 * - Error recovery and fault tolerance
 */
@ApiTags('Browser Session Management')
@Controller('browser/session')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(LoggingInterceptor, PerformanceInterceptor)
@ApiBearerAuth()
export class SessionController {
  private readonly logger = new Logger(SessionController.name);

  constructor(private readonly sessionService: SessionService) {
    this.logger.log('Browser Session Management Controller initialized');
  }

  // ===========================
  // SESSION LIFECYCLE ENDPOINTS
  // ===========================

  /**
   * Create new browser session
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'Create new browser session',
    description:
      'Create a new browser session with comprehensive configuration options. ' +
      'Supports headless/headed mode, custom viewport, proxy settings, and initial tab setup. ' +
      'Returns session ID for subsequent operations.',
  })
  @ApiBody({
    type: CreateBrowserSessionDto,
    description: 'Browser session configuration with security and performance options',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: BrowserSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid session configuration or validation errors',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Resource limits exceeded or session conflicts',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Session creation failed due to system error',
  })
  async createSession(
    @Body() createSessionDto: CreateBrowserSessionDto,
  ): Promise<BrowserSessionDto> {
    this.logger.log(`Creating new browser session: ${createSessionDto.name}`, {
      sessionName: createSessionDto.name,
      headless: createSessionDto.headless,
      viewport: `${createSessionDto.viewportWidth}x${createSessionDto.viewportHeight}`,
      initialUrls: createSessionDto.initialUrls?.length ?? 0,
      userAgent: createSessionDto.userAgent ? 'custom' : 'default',
      proxy: createSessionDto.proxy ? 'enabled' : 'disabled',
    });

    try {
      // Validate resource limits before creating session
      const resourceCheck = await this.sessionService.validateResourceLimits();
      if (!resourceCheck.allowed) {
        throw new ConflictException({
          message: 'Session creation blocked by resource limits',
          limits: resourceCheck.limits,
          current: resourceCheck.current,
        });
      }

      const session = await this.sessionService.createSession(createSessionDto);

      this.logger.log(`Session created successfully: ${session.sessionId}`, {
        sessionId: session.sessionId,
        status: session.status,
        tabsCreated: session.tabs.length,
        browserPid: session.browserPid,
        resourceUsage: resourceCheck.current,
      });

      return session;
    } catch (error) {
      this.logger.error(
        `Session creation failed: ${createSessionDto.name}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException({
        message: 'Browser session creation failed',
        error: error instanceof Error ? error.message : String(error),
        sessionName: createSessionDto.name,
      });
    }
  }

  /**
   * Get session information by ID
   */
  @Get(':sessionId')
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'Get session information',
    description:
      'Retrieve comprehensive information about a browser session including ' +
      'current status, tabs, statistics, resource usage, and performance metrics.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session information retrieved successfully',
    type: BrowserSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async getSession(
    @Param('sessionId') sessionId: string,
  ): Promise<BrowserSessionDto> {
    this.logger.log(`Retrieving session: ${sessionId}`);

    const session = await this.sessionService.getSessionWithMetrics(sessionId);
    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    this.logger.debug(`Session retrieved: ${sessionId}`, {
      status: session.status,
      upTimeMs: session.statistics.upTimeMs,
      tabCount: session.tabs.length,
      lastActivity: session.lastActivityAt,
    });

    return session;
  }

  /**
   * List all sessions with filtering
   */
  @Get()
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'List all browser sessions',
    description:
      'Retrieve all browser sessions with optional filtering by status, ' +
      'creation date, and resource usage. Supports pagination for large session lists.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BrowserSessionStatus,
    description: 'Filter by session status',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Maximum number of sessions to return (default: 50)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: 'number',
    description: 'Number of sessions to skip for pagination (default: 0)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'lastActivityAt', 'upTimeMs', 'name'],
    description: 'Sort sessions by field (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sessions retrieved successfully',
    type: [BrowserSessionDto],
  })
  async getAllSessions(
    @Query('status') status?: BrowserSessionStatus,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @Query('sortBy') sortBy: string = 'createdAt',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<{
    sessions: BrowserSessionDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    this.logger.log('Retrieving all sessions', {
      status,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    const result = await this.sessionService.getAllSessionsWithPagination({
      status,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    this.logger.debug('Sessions retrieved', {
      totalSessions: result.total,
      returnedSessions: result.sessions.length,
      activeSessions: result.sessions.filter(s => s.status === BrowserSessionStatus.ACTIVE).length,
    });

    return result;
  }

  /**
   * Update session configuration
   */
  @Patch(':sessionId')
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'Update session configuration',
    description:
      'Update non-destructive session configuration such as timeout settings, ' +
      'metadata, and monitoring preferences. Some settings require session restart.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiBody({
    type: SessionConfigUpdateDto,
    description: 'Session configuration updates',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session updated successfully',
    type: BrowserSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() updateDto: SessionConfigUpdateDto,
  ): Promise<BrowserSessionDto> {
    this.logger.log(`Updating session: ${sessionId}`, {
      sessionId,
      updates: Object.keys(updateDto),
    });

    try {
      const session = await this.sessionService.updateSessionConfig(sessionId, updateDto);
      if (!session) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }

      this.logger.log(`Session updated successfully: ${sessionId}`, {
        sessionId,
        status: session.status,
        updatedFields: Object.keys(updateDto),
      });

      return session;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Session update failed: ${sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Session update failed',
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  }

  /**
   * Close and cleanup session
   */
  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'Close browser session',
    description:
      'Close browser session and terminate all associated tabs, processes, and resources. ' +
      'Performs comprehensive cleanup including temporary files and memory.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiQuery({
    name: 'force',
    required: false,
    type: 'boolean',
    description: 'Force close even if tasks are running (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Session closed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Session has running tasks (use force=true to override)',
  })
  async closeSession(
    @Param('sessionId') sessionId: string,
    @Query('force') force: boolean = false,
  ): Promise<void> {
    this.logger.log(`Closing session: ${sessionId}`, {
      sessionId,
      force,
    });

    try {
      await this.sessionService.closeSessionWithCleanup(sessionId, { force });

      this.logger.log(`Session closed successfully: ${sessionId}`, {
        sessionId,
        force,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }

      if (error instanceof Error && error.message.includes('running tasks')) {
        throw new ConflictException({
          message: 'Session has running tasks',
          sessionId,
          suggestion: 'Use force=true to force close or wait for tasks to complete',
        });
      }

      this.logger.error(`Session close failed: ${sessionId}`, error);
      throw new InternalServerErrorException({
        message: 'Session closure failed',
        error: error instanceof Error ? error.message : String(error),
        sessionId,
      });
    }
  }

  // ===========================
  // SESSION MONITORING ENDPOINTS
  // ===========================

  /**
   * Get session health status
   */
  @Get(':sessionId/health')
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'Check session health',
    description:
      'Perform comprehensive health check of browser session including ' +
      'process status, memory usage, tab health, and performance metrics.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session health information',
    type: SessionHealthCheckDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async getSessionHealth(
    @Param('sessionId') sessionId: string,
  ): Promise<SessionHealthCheckDto> {
    this.logger.log(`Checking session health: ${sessionId}`);

    const healthCheck = await this.sessionService.performHealthCheck(sessionId);
    if (!healthCheck) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    this.logger.debug(`Session health check completed: ${sessionId}`, {
      status: healthCheck.status,
      score: healthCheck.healthScore,
      issues: healthCheck.issues?.length ?? 0,
    });

    return healthCheck;
  }

  /**
   * Get session metrics and statistics
   */
  @Get(':sessionId/metrics')
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'Get session metrics',
    description:
      'Retrieve detailed session metrics including performance data, ' +
      'resource usage, tab statistics, and activity history.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['5m', '15m', '1h', '24h'],
    description: 'Metrics timeframe (default: 15m)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session metrics retrieved',
    type: SessionMetricsDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async getSessionMetrics(
    @Param('sessionId') sessionId: string,
    @Query('timeframe') timeframe: string = '15m',
  ): Promise<SessionMetricsDto> {
    this.logger.log(`Retrieving session metrics: ${sessionId}`, {
      sessionId,
      timeframe,
    });

    const metrics = await this.sessionService.getSessionMetrics(sessionId, timeframe);
    if (!metrics) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return metrics;
  }

  // ===========================
  // BULK OPERATIONS ENDPOINTS
  // ===========================

  /**
   * Bulk session operations
   */
  @Post('bulk')
  @Roles('admin')
  @ApiOperation({
    summary: 'Perform bulk session operations',
    description:
      'Execute operations on multiple sessions simultaneously. ' +
      'Supports create, close, update, and health check operations.',
  })
  @ApiBody({
    type: BulkSessionOperationDto,
    description: 'Bulk operation configuration',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bulk operation completed',
    type: BulkSessionResultDto,
  })
  async bulkSessionOperation(
    @Body() bulkOperation: BulkSessionOperationDto,
  ): Promise<BulkSessionResultDto> {
    this.logger.log(`Executing bulk session operation: ${bulkOperation.operation}`, {
      operation: bulkOperation.operation,
      sessionCount: bulkOperation.sessionIds?.length ?? bulkOperation.sessionConfigs?.length ?? 0,
      parallel: bulkOperation.parallel,
    });

    try {
      const result = await this.sessionService.executeBulkOperation(bulkOperation);

      this.logger.log(`Bulk operation completed: ${bulkOperation.operation}`, {
        operation: bulkOperation.operation,
        successful: result.successful.length,
        failed: result.failed.length,
        totalSessions: result.totalSessions,
      });

      return result;
    } catch (error) {
      this.logger.error(`Bulk operation failed: ${bulkOperation.operation}`, error);
      throw new InternalServerErrorException({
        message: 'Bulk operation failed',
        error: error instanceof Error ? error.message : String(error),
        operation: bulkOperation.operation,
      });
    }
  }

  /**
   * Cleanup inactive sessions
   */
  @Delete('cleanup/inactive')
  @HttpCode(HttpStatus.OK)
  @Roles('admin')
  @ApiOperation({
    summary: 'Cleanup inactive sessions',
    description:
      'Remove inactive sessions based on configurable criteria such as ' +
      'inactivity timeout, resource usage, and session age.',
  })
  @ApiQuery({
    name: 'maxInactiveMinutes',
    required: false,
    type: 'number',
    description: 'Maximum inactive time in minutes (default: 30)',
  })
  @ApiQuery({
    name: 'dryRun',
    required: false,
    type: 'boolean',
    description: 'Preview cleanup without executing (default: false)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cleanup operation completed',
  })
  async cleanupInactiveSessions(
    @Query('maxInactiveMinutes') maxInactiveMinutes: number = 30,
    @Query('dryRun') dryRun: boolean = false,
  ): Promise<{
    cleaned: number;
    candidates: string[];
    resourcesFreed: {
      memoryMB: number;
      processes: number;
    };
  }> {
    this.logger.log('Starting inactive session cleanup', {
      maxInactiveMinutes,
      dryRun,
    });

    const result = await this.sessionService.cleanupInactiveSessions({
      maxInactiveMinutes,
      dryRun,
    });

    this.logger.log('Inactive session cleanup completed', {
      cleaned: result.cleaned,
      candidates: result.candidates.length,
      resourcesFreed: result.resourcesFreed,
      dryRun,
    });

    return result;
  }

  // ===========================
  // SYSTEM STATUS ENDPOINTS
  // ===========================

  /**
   * Get session management system status
   */
  @Get('system/status')
  @Roles('operator', 'admin')
  @ApiOperation({
    summary: 'Get session system status',
    description:
      'Retrieve comprehensive system status including resource usage, ' +
      'session statistics, performance metrics, and system health.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'System status retrieved',
  })
  async getSystemStatus(): Promise<{
    status: string;
    sessions: {
      total: number;
      active: number;
      idle: number;
      error: number;
    };
    resources: {
      memoryUsageMB: number;
      cpuUsagePercent: number;
      browserProcesses: number;
    };
    performance: {
      averageSessionCreationMs: number;
      averageSessionCleanupMs: number;
      systemUptime: number;
    };
    limits: {
      maxSessions: number;
      maxMemoryMB: number;
      maxProcesses: number;
    };
  }> {
    this.logger.log('Retrieving session management system status');

    const systemStatus = await this.sessionService.getSystemStatus();

    this.logger.debug('System status retrieved', {
      totalSessions: systemStatus.sessions.total,
      activeSessions: systemStatus.sessions.active,
      memoryUsage: systemStatus.resources.memoryUsageMB,
    });

    return systemStatus;
  }
}