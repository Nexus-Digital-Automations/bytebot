import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';import {ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';import {ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

// Existing imports
import { BrowserUseService } from './browser-use.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserTaskService } from './browser-task.service';
import {
  CreateBrowserTaskDto,
  BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
  BrowserActionDto,
} from './dto/browser-task.dto';
import {
  BrowserOrchestrationDto,
  BrowserOrchestrationResultDto,
  OrchestrationProgressUpdateDto,
  OrchestrationSubscriptionDto,
  OrchestrationMetricsSummaryDto,
  MultiAgentConfigDto,
  OrchestrationStrategy,
  OrchestrationStatus,
} from './dto/browser-orchestration.dto';/*** Browser Task Orchestration Controller
 *
 * Advanced controller for orchestrating browser automation tasks across multiple
 * browser-use agents with intelligent distribution, session coordination, and
 * real-time monitoring.
 *
 * Key Features:
 * - Multi-agent browser task orchestration
 * - Intelligent task distribution with load balancing
 * - Multiple orchestration strategies (sequential, parallel, hybrid, adaptive)
 * - Real-time progress monitoring via WebSocket
 * - Browser session lifecycle management
 * - Comprehensive error handling and retry mechanisms
 * - Integration with Python BrowserOrchestrator
 * - Performance metrics and analytics
 *
 * Security:
 * - All operations are local-only
 * - Comprehensive input validation
 * - Request/response logging
 * - Resource usage monitoring
 */
@ApiTags('Browser Task Orchestration')@Controller('browser-orchestration')@WebSocketGateway({namespace: '/browser-orchestration',cors: {origin: false, // Local-only access
  },
})
@Injectable()
export class BrowserOrchestrationController implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserOrchestrationController.name);

  @WebSocketServer()
  server: Server;

  // Orchestration state management
  private readonly activeOrchestrations = new Map<string, BrowserOrchestrationResultDto>();
  private readonly orchestrationHistory: BrowserOrchestrationResultDto[] = [];
  private orchestrationCounter = 0;

  // Python BrowserOrchestrator integration
  private browserOrchestratorPath: string;
  private readonly pythonProcesses = new Map<string, ChildProcess>();

  // Real-time monitoring
  private readonly connectedClients = new Map<string, Socket>();
  private readonly clientSubscriptions = new Map<string, Set<string>>();

  // Performance metrics
  private totalOrchestrations = 0;
  private totalTasksExecuted = 0;
  private totalSuccessCount = 0;
  private totalFailureCount = 0;

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly sessionService: BrowserSessionService,
    private readonly taskService: BrowserTaskService,
  ) {
    // Initialize Python BrowserOrchestrator path
    this.browserOrchestratorPath = join(
      process.cwd(),
      '..','..','orchestrator','browser_orchestration','browser_orchestrator.py');this.logger.log('Browser Orchestration Controller initialized');}async onModuleInit() {
    this.logger.log('Browser Orchestration module initializing');// Verify Python BrowserOrchestrator availabilityif (!existsSync(this.browserOrchestratorPath)) {
      this.logger.warn(
        'Python BrowserOrchestrator not found, orchestration will use fallback implementation',{ expectedPath: this.browserOrchestratorPath });
    } else {
      this.logger.log('Python BrowserOrchestrator detected', {path: this.browserOrchestratorPath,});
    }

    // Initialize WebSocket event handlers
    this.setupWebSocketHandlers();
  }

  async onModuleDestroy() {
    this.logger.log('Browser Orchestration module shutting down');

    // Cancel all active orchestrations
    const activeIds = Array.from(this.activeOrchestrations.keys());
    for (const orchestrationId of activeIds) {
      await this.cancelOrchestration(orchestrationId);
    }

    // Cleanup Python processes
    for (const id of this.pythonProcesses.keys()) {
      const process = this.pythonProcesses.get(id);
      if (process) {
        this.logger.log(`Terminating Python process for orchestration: ${id}`);
        process.kill('SIGTERM');}}

    this.logger.log('Browser Orchestration module shutdown complete');}/**
   * Execute orchestrated browser tasks
   *
   * Primary endpoint for executing browser automation tasks across multiple agents
   * with intelligent distribution and coordination.
   */
  @Post('tasks/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  async executeOrchestration(
    @Body() orchestrationDto: BrowserOrchestrationDto,
  ): Promise<BrowserOrchestrationResultDto> {
    const orchestrationId = `orch_${Date.now()}_${++this.orchestrationCounter}`;this.logger.log(`Starting browser task orchestration: ${orchestrationId}`, {
      totalTasks: orchestrationDto.tasks.length,
      strategy: orchestrationDto.strategy,
      multiAgentConfig: orchestrationDto.multiAgentConfig,
      enableRealtimeMonitoring: orchestrationDto.enableRealtimeMonitoring,
    });

    // Validate orchestration request
    await this.validateOrchestrationRequest(orchestrationDto);

    // Create orchestration result object
    const orchestrationResult: BrowserOrchestrationResultDto = {
      orchestrationId,
      status: OrchestrationStatus.PENDING,
      strategy: orchestrationDto.strategy || OrchestrationStrategy.ADAPTIVE,
      totalTasks: orchestrationDto.tasks.length,
      successfulTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      inProgressTasks: 0,
      startedAt: new Date(),
      durationMs: 0,
      successRate: 0,
      taskResults: [],
      logs: [{
        timestamp: new Date(),
        level: 'info',message: 'Orchestration initialized',component: 'orchestrator',
        metadata: {
          orchestrationId,
          totalTasks: orchestrationDto.tasks.length,
          strategy: orchestrationDto.strategy,
        },
      }],
      metadata: orchestrationDto.metadata,
    };

    // Store orchestration for tracking
    this.activeOrchestrations.set(orchestrationId, orchestrationResult);

    try {
      // Start async orchestration execution
      this.executeAsyncOrchestration(orchestrationId, orchestrationDto, orchestrationResult)
        .catch((error: Error) => {
          this.logger.error(`Async orchestration failed: ${orchestrationId}`, error);
          this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.FAILED, {
            error: {
              message: error.message,
              code: 'ORCHESTRATION_ERROR',
              details: {
                type: error.constructor.name,
                stack: error.stack,
              },
            },
          });
          this.broadcastOrchestrationUpdate(orchestrationId);
        });

      return orchestrationResult;
    } catch (error: unknown) {
      this.logger.error(`Failed to start orchestration: ${orchestrationId}`, error);

      throw new InternalServerErrorException({
        message: 'Failed to start browser task orchestration',error: error instanceof Error ? error.message : String(error),orchestrationId,
      });
    }
  }

  /**
   * Get orchestration status
   *
   * Retrieve current status and progress of a browser task orchestration.
   */
  @Get('tasks/:orchestrationId/status')async getOrchestrationStatus(@Param('orchestrationId') orchestrationId: string,
  ): Promise<BrowserOrchestrationResultDto> {
    this.logger.log(`Getting orchestration status: ${orchestrationId}`);const orchestration = this.activeOrchestrations.get(orchestrationId);if (orchestration) {
      return orchestration;
    }

    // Check orchestration history
    const historical = this.orchestrationHistory.find(
      o => o.orchestrationId === orchestrationId
    );
    if (historical) {
      return historical;
    }

    throw new NotFoundException(`Orchestration not found: ${orchestrationId}`);
  }

  /**
   * Cancel orchestration
   *
   * Cancel an active browser task orchestration and cleanup resources.
   */
  @Delete('tasks/:orchestrationId/cancel')@HttpCode(HttpStatus.OK)async cancelOrchestration(
    @Param('orchestrationId') orchestrationId: string,
  ): Promise<{ cancelled: boolean; message: string; orchestrationId: string }> {
    this.logger.log(`Cancelling orchestration: ${orchestrationId}`);const orchestration = this.activeOrchestrations.get(orchestrationId);if (!orchestration) {
      throw new NotFoundException(`Active orchestration not found: ${orchestrationId}`);
    }

    try {
      // Terminate Python process if exists
      const pythonProcess = this.pythonProcesses.get(orchestrationId);
      if (pythonProcess) {
        pythonProcess.kill('SIGTERM');
        this.pythonProcesses.delete(orchestrationId);
      }

      // Update orchestration status
      this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.CANCELLED, {
        completedAt: new Date(),
        durationMs: Date.now() - orchestration.startedAt.getTime(),
        cancelledTasks: orchestration.totalTasks - orchestration.successfulTasks - orchestration.failedTasks,
      });

      // Move to history and remove from active
      const finalResult = this.activeOrchestrations.get(orchestrationId);
      if (finalResult) {
        this.orchestrationHistory.push(finalResult);
      }
      this.activeOrchestrations.delete(orchestrationId);

      // Broadcast update
      this.broadcastOrchestrationUpdate(orchestrationId);

      this.logger.log(`Orchestration cancelled successfully: ${orchestrationId}`);return {cancelled: true,
        message: `Orchestration ${orchestrationId} cancelled successfully`,orchestrationId,};
    } catch (error: unknown) {
      this.logger.error(`Failed to cancel orchestration: ${orchestrationId}`, error);

      throw new InternalServerErrorException({
        message: 'Failed to cancel orchestration',error: error instanceof Error ? error.message : String(error),orchestrationId,
      });
    }
  }

  /**
   * Get orchestration metrics
   *
   * Retrieve comprehensive metrics and analytics for orchestration performance.
   */
  @Get('metrics')async getOrchestrationMetrics(@Query('period') period?: number,): Promise<OrchestrationMetricsSummaryDto> {this.logger.log('Getting orchestration metrics', { period });const now = new Date();const periodHours = period || 24;
    const cutoffTime = new Date(now.getTime() - periodHours * 60 * 60 * 1000);

    // Filter recent orchestrations
    const recentOrchestrations = this.orchestrationHistory.filter(
      o => o.startedAt >= cutoffTime
    );

    const recentTasksCount = recentOrchestrations.reduce(
      (sum, o) => sum + o.totalTasks,
      0
    );

    const recentSuccessCount = recentOrchestrations.reduce(
      (sum, o) => sum + o.successfulTasks,
      0
    );

    const averageOrchestrationTime = this.orchestrationHistory.length > 0
      ? this.orchestrationHistory.reduce((sum, o) => sum + o.durationMs, 0) / this.orchestrationHistory.length
      : 0;

    // Get agent metrics from browser services
    const sessionMetrics = await this.sessionService.getAllSessions();

    const result = new OrchestrationMetricsSummaryDto();
    result.summary = {
      totalOrchestrations: this.totalOrchestrations,
      totalTasksExecuted: this.totalTasksExecuted,
      overallSuccessRate: this.totalTasksExecuted > 0
        ? (this.totalSuccessCount / this.totalTasksExecuted) * 100
        : 0,
      averageOrchestrationTime,
    };
    result.activeOrchestrations = this.activeOrchestrations.size;
    result.recentPerformance = {
      orchestrationsLast24h: recentOrchestrations.length,
      tasksLast24h: recentTasksCount,
      successRateLast24h: recentTasksCount > 0
        ? (recentSuccessCount / recentTasksCount) * 100
        : 0,
    };
    result.agentUtilization = {
      totalAgents: sessionMetrics.length,
      averageUtilization: 0.75, // Placeholder - would calculate from actual agent metrics
      healthyAgents: sessionMetrics.length, // Assuming all active sessions are healthy
    };
    result.timestamp = now.toISOString();

    return result;
  }

  // ===========================
  // WEBSOCKET EVENT HANDLERS
  // ===========================

  @SubscribeMessage('subscribe_orchestration')
  handleSubscribeOrchestration(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orchestrationId: string },
  ): void {
    const { orchestrationId } = data;

    this.logger.log(`Client subscribing to orchestration: ${orchestrationId}`, {
      clientId: client.id,
    });

    // Track client subscription
    if (!this.clientSubscriptions.has(client.id)) {
      this.clientSubscriptions.set(client.id, new Set());
    }
    const clientSubscriptions = this.clientSubscriptions.get(client.id);
    if (clientSubscriptions) {
      clientSubscriptions.add(orchestrationId);
    }

    // Send current status if available
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (orchestration) {
      client.emit('orchestration_update', {orchestrationId,status: orchestration.status,
        progress: {
          completedTasks: orchestration.successfulTasks + orchestration.failedTasks,
          totalTasks: orchestration.totalTasks,
          percentage: orchestration.totalTasks > 0
            ? ((orchestration.successfulTasks + orchestration.failedTasks) / orchestration.totalTasks) * 100
            : 0,
        },
        timestamp: new Date(),
      });
    }

    client.emit('subscription_confirmed', { orchestrationId });}@SubscribeMessage('unsubscribe_orchestration')
  handleUnsubscribeOrchestration(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orchestrationId: string },
  ): void {
    const { orchestrationId } = data;

    this.logger.log(`Client unsubscribing from orchestration: ${orchestrationId}`, {
      clientId: client.id,
    });

    const subscriptions = this.clientSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.delete(orchestrationId);
    }

    client.emit('unsubscription_confirmed', { orchestrationId });}// ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  private async validateOrchestrationRequest(
    orchestrationDto: BrowserOrchestrationDto,
  ): Promise<void> {
    // Validate tasks array
    if (!orchestrationDto.tasks || orchestrationDto.tasks.length === 0) {
      throw new BadRequestException('At least one task is required for orchestration');}if (orchestrationDto.tasks.length > 50) {
      throw new BadRequestException('Maximum 50 tasks allowed per orchestration');
    }

    // Validate strategy
    if (
      orchestrationDto.strategy &&
      !Object.values(OrchestrationStrategy).includes(orchestrationDto.strategy)
    ) {
      throw new BadRequestException(`Invalid orchestration strategy: ${orchestrationDto.strategy}`);
    }

    // Validate multi-agent configuration
    const config = orchestrationDto.multiAgentConfig;
    if (config) {
      if (config.maxConcurrentAgents && (config.maxConcurrentAgents < 1 || config.maxConcurrentAgents > 10)) {
        throw new BadRequestException('maxConcurrentAgents must be between 1 and 10');}if (config.maxConcurrentSessions && (config.maxConcurrentSessions < 1 || config.maxConcurrentSessions > 20)) {
        throw new BadRequestException('maxConcurrentSessions must be between 1 and 20');
      }
    }

    // Validate individual tasks
    for (const [index, task] of orchestrationDto.tasks.entries()) {
      if (!task.name || !task.description) {
        throw new BadRequestException(`Task at index ${index} is missing required name or description`);}if (!task.actions || task.actions.length === 0) {
        throw new BadRequestException(`Task at index ${index} must have at least one action`);}}
  }

  private async executeAsyncOrchestration(
    orchestrationId: string,
    orchestrationDto: BrowserOrchestrationDto,
    orchestrationResult: BrowserOrchestrationResultDto,
  ): Promise<void> {
    try {
      // Update status to initializing
      this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.INITIALIZING);
      this.broadcastOrchestrationUpdate(orchestrationId);

      // Check if Python BrowserOrchestrator is available
      if (existsSync(this.browserOrchestratorPath)) {
        await this.executePythonOrchestration(orchestrationId, orchestrationDto, orchestrationResult);
      } else {
        await this.executeFallbackOrchestration(orchestrationId, orchestrationDto, orchestrationResult);
      }

      // Update metrics
      this.totalOrchestrations += 1;
      this.totalTasksExecuted += orchestrationResult.totalTasks;
      this.totalSuccessCount += orchestrationResult.successfulTasks;
      this.totalFailureCount += orchestrationResult.failedTasks;

      // Move to history
      this.orchestrationHistory.push(orchestrationResult);
      this.activeOrchestrations.delete(orchestrationId);

      // Final broadcast
      this.broadcastOrchestrationUpdate(orchestrationId);

      this.logger.log(`Orchestration completed: ${orchestrationId}`, {totalTasks: orchestrationResult.totalTasks,successfulTasks: orchestrationResult.successfulTasks,
        failedTasks: orchestrationResult.failedTasks,
        durationMs: orchestrationResult.durationMs,
        successRate: orchestrationResult.successRate,
      });

    } catch (error: unknown) {
      this.logger.error(`Orchestration execution failed: ${orchestrationId}`, error);

      this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.FAILED, {
        completedAt: new Date(),
        durationMs: Date.now() - orchestrationResult.startedAt.getTime(),
        error: {
          message: error instanceof Error ? error.message : String(error),
          code: 'EXECUTION_ERROR',details: {type: error instanceof Error ? error.constructor.name : 'UnknownError',
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
      });

      this.broadcastOrchestrationUpdate(orchestrationId);
      throw error;
    }
  }

  private async executePythonOrchestration(
    orchestrationId: string,
    orchestrationDto: BrowserOrchestrationDto,
    orchestrationResult: BrowserOrchestrationResultDto,
  ): Promise<void> {
    this.logger.log(`Executing Python orchestration: ${orchestrationId}`);return new Promise((resolve, reject) => {// Prepare Python orchestration configuration
      const pythonConfig = {
        orchestration_id: orchestrationId,
        tasks: orchestrationDto.tasks.map(task => ({
          task_id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
          task_type: 'browser_automation',url: task.actions.find(a => a.url)?.url || '',instructions: task.description,priority: task.priority || 'normal',timeout_seconds: Math.floor((task.maxExecutionTimeMs || 300000) / 1000),metadata: task.metadata || {},
        })),
        strategy: orchestrationDto.strategy,
        config: {
          max_concurrent_agents: orchestrationDto.multiAgentConfig?.maxConcurrentAgents || 3,
          max_concurrent_sessions: orchestrationDto.multiAgentConfig?.maxConcurrentSessions || 5,
          task_timeout_seconds: Math.floor((orchestrationDto.orchestrationTimeoutMs || 600000) / 1000),
          retry_failed_tasks: orchestrationDto.failureStrategy === 'retry_failed',max_retry_attempts: orchestrationDto.maxRetryAttempts || 2,},
      };

      // Spawn Python BrowserOrchestrator process
      const pythonProcess = spawn('python3', [this.browserOrchestratorPath,'--config',JSON.stringify(pythonConfig),], {
        stdio: ['pipe', 'pipe', 'pipe'],env: { ...process.env },});

      this.pythonProcesses.set(orchestrationId, pythonProcess);

      let stdoutData = '';let stderrData = '';pythonProcess.stdout?.on('data', (data) => {stdoutData += data.toString();// Try to parse progress updates
        const lines = stdoutData.split('\n');for (const line of lines) {if (line.trim().startsWith('{')) {try {const update = JSON.parse(line.trim());
              if (update.type === 'progress') {this.handlePythonProgressUpdate(orchestrationId, update);}
            } catch (e) {
              // Ignore invalid JSON lines
            }
          }
        }
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderrData += data.toString();
        this.logger.warn(`Python orchestrator stderr: ${data.toString()}`);
      });

      pythonProcess.on('close', (code) => {this.pythonProcesses.delete(orchestrationId);if (code === 0) {
          try {
            // Parse final result from stdout
            const result = JSON.parse(stdoutData.split('\n').pop() || '{}');

            this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.COMPLETED, {
              completedAt: new Date(),
              durationMs: Date.now() - orchestrationResult.startedAt.getTime(),
              successfulTasks: result.successful_tasks || 0,
              failedTasks: result.failed_tasks || 0,
              successRate: result.success_rate || 0,
              agentMetrics: result.agent_metrics,
            });

            resolve();
          } catch (error) {
            this.logger.error(`Failed to parse Python orchestration result: ${orchestrationId}`, error);
            reject(new Error('Failed to parse orchestration result'));
          }
        } else {
          this.logger.error(`Python orchestration failed with code ${code}: ${orchestrationId}`, {stderr: stderrData,});
          reject(new Error(`Python orchestration failed with exit code ${code}`));
        }
      });

      pythonProcess.on('error', (error) => {
        this.pythonProcesses.delete(orchestrationId);
        this.logger.error(`Python orchestration process error: ${orchestrationId}`, error);reject(error);});

      // Update status to executing
      this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.EXECUTING);
      this.broadcastOrchestrationUpdate(orchestrationId);
    });
  }

  private async executeFallbackOrchestration(
    orchestrationId: string,
    orchestrationDto: BrowserOrchestrationDto,
    orchestrationResult: BrowserOrchestrationResultDto,
  ): Promise<void> {
    this.logger.log(`Executing fallback orchestration: ${orchestrationId}`);// Update status to executingthis.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.EXECUTING);
    this.broadcastOrchestrationUpdate(orchestrationId);

    const startTime = Date.now();
    let successfulTasks = 0;
    let failedTasks = 0;

    // Simple sequential execution as fallback
    for (const [index, task] of orchestrationDto.tasks.entries()) {
      try {
        this.logger.log(`Executing fallback task ${index + 1}/${orchestrationDto.tasks.length}: ${task.name}`);// Convert to browser task formatconst browserTask = await this.taskService.createTask({
          name: task.name,
          description: task.description,
          actions: task.actions,
          priority: task.priority,
          sessionConfig: task.sessionConfig,
          maxExecutionTimeMs: task.maxExecutionTimeMs,
          metadata: task.metadata,
          enableLogging: task.enableLogging,
          continueOnError: task.continueOnError,
        });

        // Execute task
        const taskResult = await this.taskService.executeTask(browserTask.id);

        if (taskResult.status === BrowserTaskStatus.COMPLETED) {
          successfulTasks++;
        } else {
          failedTasks++;
        }

        // Update progress
        const completedTasks = successfulTasks + failedTasks;
        this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.EXECUTING, {
          successfulTasks,
          failedTasks,
        });

        // Broadcast progress update
        this.broadcastProgressUpdate(orchestrationId, {
          completedTasks,
          totalTasks: orchestrationDto.tasks.length,
          percentage: (completedTasks / orchestrationDto.tasks.length) * 100,
        });

      } catch (error) {
        this.logger.error(`Fallback task execution failed: ${task.name}`, error);
        failedTasks++;
      }
    }

    // Finalize orchestration
    const durationMs = Date.now() - startTime;
    const successRate = orchestrationDto.tasks.length > 0
      ? (successfulTasks / orchestrationDto.tasks.length) * 100
      : 0;

    this.updateOrchestrationStatus(orchestrationId, OrchestrationStatus.COMPLETED, {
      completedAt: new Date(),
      durationMs,
      successfulTasks,
      failedTasks,
      successRate,
    });
  }

  private handlePythonProgressUpdate(orchestrationId: string, update: any): void {
    if (update.status) {
      const status = this.mapPythonStatusToOrchestrationStatus(update.status);
      this.updateOrchestrationStatus(orchestrationId, status, {
        successfulTasks: update.successful_tasks || 0,
        failedTasks: update.failed_tasks || 0,
      });
    }

    if (update.progress) {
      this.broadcastProgressUpdate(orchestrationId, update.progress);
    }
  }

  private mapPythonStatusToOrchestrationStatus(pythonStatus: string): OrchestrationStatus {
    const statusMap: Record<string, OrchestrationStatus> = {
      'pending': OrchestrationStatus.PENDING,'initializing': OrchestrationStatus.INITIALIZING,'executing': OrchestrationStatus.EXECUTING,'completed': OrchestrationStatus.COMPLETED,'failed': OrchestrationStatus.FAILED,'cancelled': OrchestrationStatus.CANCELLED,};return statusMap[pythonStatus] || OrchestrationStatus.EXECUTING;
  }

  private updateOrchestrationStatus(
    orchestrationId: string,
    status: OrchestrationStatus,
    updates: Partial<BrowserOrchestrationResultDto> = {},
  ): void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (!orchestration) return;

    const updatedOrchestration = {
      ...orchestration,
      status,
      ...updates,
      logs: [
        ...orchestration.logs,
        {
          timestamp: new Date(),
          level: status === OrchestrationStatus.FAILED ? 'error' as const : 'info' as const,
          message: `Status updated to ${status}`,
          component: 'orchestrator',metadata: { status, ...updates },},
      ],
    };

    this.activeOrchestrations.set(orchestrationId, updatedOrchestration);
  }

  private broadcastOrchestrationUpdate(orchestrationId: string): void {
    const orchestration = this.activeOrchestrations.get(orchestrationId);
    if (!orchestration) return;

    // Broadcast to subscribed clients
    for (const [clientId, subscriptions] of this.clientSubscriptions) {
      if (subscriptions.has(orchestrationId)) {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.emit('orchestration_update', {orchestrationId,status: orchestration.status,
            progress: {
              completedTasks: orchestration.successfulTasks + orchestration.failedTasks,
              totalTasks: orchestration.totalTasks,
              percentage: orchestration.totalTasks > 0
                ? ((orchestration.successfulTasks + orchestration.failedTasks) / orchestration.totalTasks) * 100
                : 0,
            },
            timestamp: new Date(),
          });
        }
      }
    }
  }

  private broadcastProgressUpdate(
    orchestrationId: string,
    progress: { completedTasks: number; totalTasks: number; percentage: number },
  ): void {
    // Broadcast to subscribed clients
    for (const [clientId, subscriptions] of this.clientSubscriptions) {
      if (subscriptions.has(orchestrationId)) {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.emit('progress_update', {orchestrationId,progress,
            timestamp: new Date(),
          });
        }
      }
    }
  }

  private setupWebSocketHandlers(): void {
    // Handle client connections and disconnections
    this.server.on('connection', (client: Socket) => {
      this.logger.log(`Client connected: ${client.id}`);
      this.connectedClients.set(client.id, client);

      client.on('disconnect', () => {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.connectedClients.delete(client.id);
        this.clientSubscriptions.delete(client.id);
      });
    });
  }
}