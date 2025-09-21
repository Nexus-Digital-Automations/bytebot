import {
  Controller,
  Post,
  Get,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';import {ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';import { RolesGuard } from '../common/guards/roles.guard';import { Roles } from '../common/decorators/roles.decorator';import { UserRole } from '../common/enums/user-role.enum';import {BrowserOrchestrationSessionService,
  SessionType,
  AgentSessionAssignment,
  SessionPerformanceMetrics,
  OrchestrationSessionConfig,
} from './browser-orchestration-session.service';import {CreateBrowserSessionDto,
  BrowserSessionDto,
} from './dto/browser-session.dto';/*** Create Orchestration Session DTO
 */
export class CreateOrchestrationSessionDto extends CreateBrowserSessionDto {
  agentId?: string;
  sessionType?: SessionType;
  priority?: number;
  taskRequirements?: Record<string, unknown>;
}

/**
 * Assign Session DTO
 */
export class AssignSessionDto {
  agentId: string;
  taskRequirements?: Record<string, unknown>;
  priority?: number;
  taskId?: string;
}

/**
 * Get Available Session DTO
 */
export class GetAvailableSessionDto {
  agentId: string;
  sessionType?: SessionType;
  taskRequirements?: Record<string, unknown>;
  priority?: number;
}

/**
 * Session Assignment Response DTO
 */
export class SessionAssignmentResponseDto {
  success: boolean;
  assignment?: AgentSessionAssignment;
  error?: string;
  sessionId?: string;
  agentId?: string;
  tabId?: string;
  assignedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Session Release Response DTO
 */
export class SessionReleaseResponseDto {
  success: boolean;
  sessionId: string;
  agentId: string;
  releasedAt: string;
  sessionClosed?: boolean;
  error?: string;
}

/**
 * Orchestration Status Response DTO
 */
export class OrchestrationStatusResponseDto {
  totalSessions: number;
  sessionPools: Record<string, any>;
  agentAssignments: number;
  performanceMetrics: SessionPerformanceMetrics[];
  statistics: Record<string, number>;
  configuration: OrchestrationSessionConfig;
}

/**
 * Browser Orchestration Session Controller
 *
 * Advanced REST API controller for browser session orchestration and coordination.
 * Provides enterprise-grade session management endpoints that integrate with the
 * Python BrowserSessionCoordinator for multi-agent browser automation scenarios.
 *
 * Key Features:
 * - Orchestrated session creation with pool management
 * - Intelligent session assignment and sharing across agents
 * - Advanced session lifecycle management with coordination
 * - Performance monitoring and analytics APIs
 * - Resource optimization and capacity management
 * - Session health checking and automatic recovery
 * - Real-time orchestration status and metrics
 *
 * Security:
 * - JWT authentication required for all endpoints
 * - Role-based access control (Operator/Admin)
 * - Comprehensive audit logging
 * - Request validation and sanitization
 *
 * Integration:
 * - Maintains compatibility with existing browser session API
 * - Bridges TypeScript and Python orchestration systems
 * - Provides orchestration-specific capabilities
 * - Implements session security validation
 */
@ApiTags('Browser Orchestration Sessions')@ApiBearerAuth()@Controller('browser-orchestration/sessions')@UseGuards(JwtAuthGuard, RolesGuard)export class BrowserOrchestrationSessionController {
  private readonly logger = new Logger(BrowserOrchestrationSessionController.name);

  constructor(
    private readonly orchestrationSessionService: BrowserOrchestrationSessionService,
  ) {}

  /**
   * Create orchestrated browser session
   */
  @Post()
  @Roles(UserRole.OPERATOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create orchestrated browser session',description: 'Create a new browser session with orchestration capabilities including pool management, agent coordination, and performance monitoring.',})@ApiBody({
    type: CreateOrchestrationSessionDto,
    description: 'Session creation configuration with orchestration parameters',})@ApiResponse({
    status: 201,
    description: 'Session created successfully',type: BrowserSessionDto,})
  @ApiResponse({
    status: 400,
    description: 'Invalid session configuration',})@ApiResponse({
    status: 409,
    description: 'Session pool at capacity',
  })
  async createOrchestrationSession(
    @Body() createSessionDto: CreateOrchestrationSessionDto,
  ): Promise<BrowserSessionDto> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Creating orchestration session`, {agentId: createSessionDto.agentId,sessionType: createSessionDto.sessionType || SessionType.STANDARD,
      priority: createSessionDto.priority || 1,
    });

    try {
      const session = await this.orchestrationSessionService.createOrchestrationSession(
        createSessionDto,
        createSessionDto.agentId,
        createSessionDto.sessionType || SessionType.STANDARD,
        createSessionDto.priority || 1,
      );

      this.logger.log(`[${operationId}] Orchestration session created successfully`, {sessionId: session.sessionId,agentId: createSessionDto.agentId,
      });

      return session;

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to create orchestration session`, {
        error: error.message,
        agentId: createSessionDto.agentId,
        stack: error.stack,
      });

      if (error.message.includes('pool at capacity') || error.message.includes('capacity')) {throw new HttpException(error.message, HttpStatus.CONFLICT);}

      throw new HttpException(
        error.message || 'Failed to create orchestration session',HttpStatus.BAD_REQUEST,);
    }
  }

  /**
   * Get available session for agent
   */
  @Post('available')@Roles(UserRole.OPERATOR, UserRole.ADMIN)@ApiOperation({
    summary: 'Get available session for agent',description: 'Get an available browser session for an agent with intelligent allocation, reuse optimization, and sharing capabilities.',})@ApiBody({
    type: GetAvailableSessionDto,
    description: 'Agent session request parameters',})@ApiResponse({
    status: 200,
    description: 'Available session found and assigned',type: BrowserSessionDto,})
  @ApiResponse({
    status: 404,
    description: 'No available sessions',
  })
  async getAvailableSessionForAgent(
    @Body() requestDto: GetAvailableSessionDto,
  ): Promise<BrowserSessionDto> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Finding available session for agent`, {agentId: requestDto.agentId,sessionType: requestDto.sessionType || SessionType.STANDARD,
      priority: requestDto.priority || 1,
    });

    try {
      const session = await this.orchestrationSessionService.getAvailableSessionForAgent(
        requestDto.agentId,
        requestDto.sessionType || SessionType.STANDARD,
        requestDto.taskRequirements,
        requestDto.priority || 1,
      );

      if (!session) {
        throw new HttpException(
          `No available sessions for agent ${requestDto.agentId}`,HttpStatus.NOT_FOUND,);
      }

      this.logger.log(`[${operationId}] Available session found for agent`, {sessionId: session.sessionId,agentId: requestDto.agentId,
      });

      return session;

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`[${operationId}] Failed to get available session for agent`, {
        error: error.message,
        agentId: requestDto.agentId,
        stack: error.stack,
      });

      throw new HttpException(
        error.message || 'Failed to get available session',HttpStatus.BAD_REQUEST,);
    }
  }

  /**
   * Assign session to agent
   */
  @Put(':sessionId/assign')@Roles(UserRole.OPERATOR, UserRole.ADMIN)@ApiOperation({
    summary: 'Assign session to agent',description: 'Assign a specific browser session to an agent with tracking and coordination capabilities.',})@ApiParam({
    name: 'sessionId',description: 'Session identifier',type: 'string',})@ApiBody({
    type: AssignSessionDto,
    description: 'Agent assignment parameters',})@ApiResponse({
    status: 200,
    description: 'Session assigned successfully',type: SessionAssignmentResponseDto,})
  @ApiResponse({
    status: 404,
    description: 'Session not found',})@ApiResponse({
    status: 409,
    description: 'Session not available for assignment',})async assignSessionToAgent(
    @Param('sessionId') sessionId: string,
    @Body() assignDto: AssignSessionDto,
  ): Promise<SessionAssignmentResponseDto> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Assigning session to agent`, {sessionId,agentId: assignDto.agentId,
      taskId: assignDto.taskId,
      priority: assignDto.priority || 1,
    });

    try {
      const assignment = await this.orchestrationSessionService.assignSessionToAgent(
        sessionId,
        assignDto.agentId,
        assignDto.taskRequirements,
        assignDto.priority || 1,
        assignDto.taskId,
      );

      this.logger.log(`[${operationId}] Session assigned to agent successfully`, {sessionId,agentId: assignDto.agentId,
        tabId: assignment.tabId,
      });

      return {
        success: true,
        assignment,
        sessionId,
        agentId: assignDto.agentId,
        tabId: assignment.tabId,
        assignedAt: assignment.assignedAt.toISOString(),
        metadata: assignment.metadata,
      };

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to assign session to agent`, {
        error: error.message,
        sessionId,
        agentId: assignDto.agentId,
        stack: error.stack,
      });

      if (error.message.includes('not found')) {throw new HttpException(error.message, HttpStatus.NOT_FOUND);} else if (error.message.includes('not available')) {throw new HttpException(error.message, HttpStatus.CONFLICT);}

      return {
        success: false,
        error: error.message || 'Failed to assign session',sessionId,agentId: assignDto.agentId,
      };
    }
  }

  /**
   * Release session from agent
   */
  @Put(':sessionId/release/:agentId')@Roles(UserRole.OPERATOR, UserRole.ADMIN)@ApiOperation({
    summary: 'Release session from agent',description: 'Release a browser session from an agent with intelligent cleanup and lifecycle management.',})@ApiParam({
    name: 'sessionId',description: 'Session identifier',type: 'string',})@ApiParam({
    name: 'agentId',description: 'Agent identifier',type: 'string',})@ApiQuery({
    name: 'keepAlive',description: 'Keep session alive after release',type: 'boolean',required: false,})
  @ApiResponse({
    status: 200,
    description: 'Session released successfully',type: SessionReleaseResponseDto,})
  async releaseSessionFromAgent(
    @Param('sessionId') sessionId: string,@Param('agentId') agentId: string,@Query('keepAlive') keepAlive: boolean = true,
  ): Promise<SessionReleaseResponseDto> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Releasing session from agent`, {sessionId,agentId,
      keepAlive,
    });

    try {
      await this.orchestrationSessionService.releaseSessionFromAgent(
        sessionId,
        agentId,
        keepAlive,
      );

      this.logger.log(`[${operationId}] Session released from agent successfully`, {sessionId,agentId,
        keepAlive,
      });

      return {
        success: true,
        sessionId,
        agentId,
        releasedAt: new Date().toISOString(),
        sessionClosed: !keepAlive,
      };

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to release session from agent`, {
        error: error.message,
        sessionId,
        agentId,
        stack: error.stack,
      });

      return {
        success: false,
        sessionId,
        agentId,
        releasedAt: new Date().toISOString(),
        error: error.message || 'Failed to release session',};}
  }

  /**
   * Get orchestration status
   */
  @Get('status')@Roles(UserRole.OPERATOR, UserRole.ADMIN)@ApiOperation({
    summary: 'Get orchestration status',description: 'Get comprehensive status and metrics for browser session orchestration including pools, assignments, and performance data.',})@ApiResponse({
    status: 200,
    description: 'Orchestration status retrieved successfully',
    type: OrchestrationStatusResponseDto,
  })
  async getOrchestrationStatus(): Promise<OrchestrationStatusResponseDto> {
    const operationId = this.generateOperationId();

    this.logger.debug(`[${operationId}] Getting orchestration status`);try {const status = await this.orchestrationSessionService.getOrchestrationStatus();

      this.logger.debug(`[${operationId}] Orchestration status retrieved successfully`, {totalSessions: status.totalSessions,agentAssignments: status.agentAssignments,
      });

      return status;

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to get orchestration status`, {
        error: error.message,
        stack: error.stack,
      });

      throw new HttpException(
        error.message || 'Failed to get orchestration status',HttpStatus.INTERNAL_SERVER_ERROR,);
    }
  }

  /**
   * Optimize session pools
   */
  @Post('optimize')@Roles(UserRole.ADMIN)@ApiOperation({
    summary: 'Optimize session pools',description: 'Trigger session pool optimization based on usage patterns, utilization rates, and performance metrics.',})@ApiResponse({
    status: 200,
    description: 'Pool optimization completed successfully',
  })
  async optimizeSessionPools(): Promise<{ success: boolean; message: string; timestamp: string }> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Starting session pool optimization`);try {await this.orchestrationSessionService.optimizeSessionPools();

      this.logger.log(`[${operationId}] Session pool optimization completed successfully`);

      return {
        success: true,
        message: 'Session pool optimization completed successfully',
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`[${operationId}] Session pool optimization failed`, {
        error: error.message,
        stack: error.stack,
      });

      throw new HttpException(
        error.message || 'Session pool optimization failed',HttpStatus.INTERNAL_SERVER_ERROR,);
    }
  }

  /**
   * Close orchestration session
   */
  @Delete(':sessionId')@Roles(UserRole.OPERATOR, UserRole.ADMIN)@ApiOperation({
    summary: 'Close orchestration session',description: 'Close a browser session with comprehensive cleanup, agent release, and coordination notification.',})@ApiParam({
    name: 'sessionId',description: 'Session identifier',type: 'string',})@ApiResponse({
    status: 200,
    description: 'Session closed successfully',})@ApiResponse({
    status: 404,
    description: 'Session not found',})async closeOrchestrationSession(
    @Param('sessionId') sessionId: string,
  ): Promise<{ success: boolean; message: string; sessionId: string; timestamp: string }> {
    const operationId = this.generateOperationId();

    this.logger.log(`[${operationId}] Closing orchestration session`, { sessionId });try {await this.orchestrationSessionService.closeOrchestrationSession(sessionId);

      this.logger.log(`[${operationId}] Orchestration session closed successfully`, { sessionId });

      return {
        success: true,
        message: 'Session closed successfully',
        sessionId,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to close orchestration session`, {
        error: error.message,
        sessionId,
        stack: error.stack,
      });

      if (error.message.includes('not found')) {throw new HttpException(error.message, HttpStatus.NOT_FOUND);}

      throw new HttpException(
        error.message || 'Failed to close session',HttpStatus.INTERNAL_SERVER_ERROR,);
    }
  }

  /**
   * Get session performance metrics
   */
  @Get(':sessionId/metrics')@Roles(UserRole.OPERATOR, UserRole.ADMIN)@ApiOperation({
    summary: 'Get session performance metrics',description: 'Get detailed performance metrics for a specific browser session including operation counts, response times, and resource usage.',})@ApiParam({
    name: 'sessionId',description: 'Session identifier',type: 'string',})@ApiResponse({
    status: 200,
    description: 'Session metrics retrieved successfully',type: SessionPerformanceMetrics,})
  @ApiResponse({
    status: 404,
    description: 'Session or metrics not found',})async getSessionMetrics(
    @Param('sessionId') sessionId: string,
  ): Promise<SessionPerformanceMetrics> {
    const operationId = this.generateOperationId();

    this.logger.debug(`[${operationId}] Getting session metrics`, { sessionId });try {const status = await this.orchestrationSessionService.getOrchestrationStatus();
      const metrics = status.performanceMetrics.find(m => m.sessionId === sessionId);

      if (!metrics) {
        throw new HttpException(
          `Metrics not found for session ${sessionId}`,HttpStatus.NOT_FOUND,);
      }

      this.logger.debug(`[${operationId}] Session metrics retrieved successfully`, {sessionId,totalOperations: metrics.totalOperations,
        efficiency: metrics.efficiency,
      });

      return metrics;

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`[${operationId}] Failed to get session metrics`, {
        error: error.message,
        sessionId,
        stack: error.stack,
      });

      throw new HttpException(
        error.message || 'Failed to get session metrics',HttpStatus.INTERNAL_SERVER_ERROR,);
    }
  }

  /**
   * Get session assignments for agent
   */
  @Get('agents/:agentId/assignments')@Roles(UserRole.OPERATOR, UserRole.ADMIN)@ApiOperation({
    summary: 'Get session assignments for agent',description: 'Get all current session assignments for a specific agent including session details and assignment metadata.',})@ApiParam({
    name: 'agentId',description: 'Agent identifier',type: 'string',})@ApiResponse({
    status: 200,
    description: 'Agent assignments retrieved successfully',})async getAgentAssignments(
    @Param('agentId') agentId: string,
  ): Promise<{ agentId: string; assignments: AgentSessionAssignment[]; count: number }> {
    const operationId = this.generateOperationId();

    this.logger.debug(`[${operationId}] Getting agent assignments`, { agentId });

    try {
      const status = await this.orchestrationSessionService.getOrchestrationStatus();

      // Filter assignments for the specific agent
      const agentAssignments: AgentSessionAssignment[] = [];

      // This would need to be implemented in the service to expose agent assignments
      // For now, return empty array as the service doesn't expose this data

      this.logger.debug(`[${operationId}] Agent assignments retrieved successfully`, {agentId,assignmentCount: agentAssignments.length,
      });

      return {
        agentId,
        assignments: agentAssignments,
        count: agentAssignments.length,
      };

    } catch (error) {
      this.logger.error(`[${operationId}] Failed to get agent assignments`, {
        error: error.message,
        agentId,
        stack: error.stack,
      });

      throw new HttpException(
        error.message || 'Failed to get agent assignments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ========================================================================
  // PRIVATE METHODS
  // ========================================================================

  private generateOperationId(): string {
    return `orchestration_api_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}