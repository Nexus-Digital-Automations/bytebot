import {
  Controller,
  Post,
  Get,
  Delete,
  Put as _Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseInterceptors as _UseInterceptors,
  BadRequestException as _BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { BrowserUseService } from './browser-use.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserTaskService } from './browser-task.service';
import {
  CreateBrowserTaskDto,
  BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserTaskPriority,
} from './dto/browser-task.dto';
import {
  CreateBrowserSessionDto,
  BrowserSessionDto,
  BrowserSessionStatus,
} from './dto/browser-session.dto';
import {
  CreateAsyncJobDto,
  AsyncJobResultDto,
  AsyncJobStatus as _AsyncJobStatus,
} from './dto/async-job.dto';
// Note: ResponseInterceptor and SecurityLoggingInterceptor imports removed as they don't exist in shared package

/**
 * Browser Automation Controller
 *
 * REST API endpoints for browser automation using the browser-use Python library.
 * Provides comprehensive local-only browser automation capabilities with no cloud dependencies.
 *
 * Key Features:
 * - Task-based browser automation
 * - Session lifecycle management
 * - Async job processing with real-time monitoring
 * - Screenshot and DOM extraction
 * - Form automation and data extraction
 * - Multi-tab session management
 * - Comprehensive error handling and logging
 *
 * Security:
 * - All operations are local-only
 * - No external API calls or cloud dependencies
 * - Comprehensive input validation
 * - Request/response logging for audit trails
 * - Rate limiting and resource management
 */
@ApiTags('Browser Automation')
@Controller('browser-use')
// Note: Interceptors removed - ResponseInterceptor and SecurityLoggingInterceptor not available in shared package
export class BrowserUseController {
  private readonly logger = new Logger(BrowserUseController.name);

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly sessionService: BrowserSessionService,
    private readonly taskService: BrowserTaskService,
  ) {
    this.logger.log('Browser Use Controller initialized');
  }

  // ===========================
  // TASK MANAGEMENT ENDPOINTS
  // ===========================

  /**
   * Execute browser automation task
   */
  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Execute browser automation task',
    description:
      'Create and execute a browser automation task with specified actions. Returns task ID for monitoring progress.',
  })
  @ApiBody({
    type: CreateBrowserTaskDto,
    description: 'Browser task configuration and actions',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Task created and execution started',
    type: BrowserTaskResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid task configuration',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Task execution failed',
  })
  async executeTask(
    @Body() createTaskDto: CreateBrowserTaskDto,
  ): Promise<BrowserTaskResultDto> {
    this.logger.log(`Executing browser task: ${createTaskDto.name}`, {
      taskName: createTaskDto.name,
      actionsCount: createTaskDto.actions.length,
      sessionConfig: createTaskDto.sessionConfig?.headless,
      priority: createTaskDto.priority,
    });

    try {
      const result =
        await this.browserUseService.executeBrowserTask(createTaskDto);

      this.logger.log(`Task execution completed: ${result.taskId}`, {
        taskId: result.taskId,
        status: result.status,
        actionsCompleted: result.actionsCompleted,
        executionTimeMs: result.executionTimeMs,
      });

      return result;
    } catch (_err) {
      this.logger.error(
        `Task execution failed: ${createTaskDto.name}`,
        _err instanceof Error ? _err.stack : String(_err),
      );

      throw new InternalServerErrorException({
        message: 'Browser task execution failed',
        error: _err instanceof Error ? _err.message : String(_err),
        taskName: createTaskDto.name,
      });
    }
  }

  /**
   * Get task status and results
   */
  @Get('tasks/:taskId')
  @ApiOperation({
    summary: 'Get task status and results',
    description:
      'Retrieve the current status, progress, and results of a browser automation task.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task information retrieved',
    type: BrowserTaskResultDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  async getTask(
    @Param('taskId') taskId: string,
  ): Promise<BrowserTaskResultDto> {
    this.logger.log(`Getting task: ${taskId}`);

    const task = await this.taskService.getTask(taskId);
    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`);
    }

    return task;
  }

  /**
   * Get all tasks with optional filtering
   */
  @Get('tasks')
  @ApiOperation({
    summary: 'Get all tasks',
    description:
      'Retrieve all browser automation tasks with optional status filtering.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BrowserTaskStatus,
    description: 'Filter by task status',
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: BrowserTaskPriority,
    description: 'Filter by task priority',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks retrieved successfully',
    type: [BrowserTaskResultDto],
  })
  async getAllTasks(
    @Query('status') status?: BrowserTaskStatus,
    @Query('priority') priority?: BrowserTaskPriority,
  ): Promise<BrowserTaskResultDto[]> {
    this.logger.log('Getting all tasks', { status, priority });

    let tasks = await this.taskService.getAllTasks();

    // Apply filters
    if (status) {
      tasks = tasks.filter((task) => task.status === status);
    }

    if (priority) {
      tasks = tasks.filter((task) => task.metadata?.priority === priority);
    }

    return tasks;
  }

  /**
   * Cancel running task
   */
  @Delete('tasks/:taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel task',
    description: 'Cancel a running or pending browser automation task.',
  })
  @ApiParam({
    name: 'taskId',
    description: 'Unique task identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Task cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  async cancelTask(@Param('taskId') taskId: string): Promise<void> {
    this.logger.log(`Cancelling task: ${taskId}`);

    try {
      await this.taskService.cancelTask(taskId);
      this.logger.log(`Task cancelled successfully: ${taskId}`);
    } catch (_err) {
      if (_err instanceof Error && _err.message.includes('not found')) {
        throw new NotFoundException(`Task not found: ${taskId}`);
      }
      throw _err;
    }
  }

  /**
   * Get task metrics and statistics
   */
  @Get('tasks/metrics/summary')
  @ApiOperation({
    summary: 'Get task metrics',
    description:
      'Retrieve comprehensive metrics and statistics for all browser automation tasks.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task metrics retrieved successfully',
  })
  async getTaskMetrics() {
    this.logger.log('Getting task metrics');

    const metrics = await this.taskService.getTaskMetrics();

    this.logger.debug('Task metrics retrieved', {
      totalTasks: metrics.totalTasks,
      completedTasks: metrics.completedTasks,
      successRate: metrics.successRate,
    });

    return {
      status: 'success',
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  // ===========================
  // SESSION MANAGEMENT ENDPOINTS
  // ===========================

  /**
   * Create browser session
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create browser session',
    description:
      'Create a new browser session with specified configuration. Session can be reused for multiple tasks.',
  })
  @ApiBody({
    type: CreateBrowserSessionDto,
    description: 'Browser session configuration',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Session created successfully',
    type: BrowserSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid session configuration',
  })
  async createSession(
    @Body() createSessionDto: CreateBrowserSessionDto,
  ): Promise<BrowserSessionDto> {
    this.logger.log(`Creating browser session: ${createSessionDto.name}`, {
      sessionName: createSessionDto.name,
      headless: createSessionDto.headless,
      viewport: `${createSessionDto.viewportWidth}x${createSessionDto.viewportHeight}`,
      initialUrls: createSessionDto.initialUrls?.length || 0,
    });

    try {
      const session = await this.sessionService.createSession(createSessionDto);

      this.logger.log(`Session created successfully: ${session.sessionId}`, {
        sessionId: session.sessionId,
        status: session.status,
        tabsCreated: session.tabs.length,
      });

      return session;
    } catch (_err) {
      this.logger.error(
        `Session creation failed: ${createSessionDto.name}`,
        _err instanceof Error ? _err.stack : String(_err),
      );

      throw new InternalServerErrorException({
        message: 'Browser session creation failed',
        error: _err instanceof Error ? _err.message : String(_err),
        sessionName: createSessionDto.name,
      });
    }
  }

  /**
   * Get session information
   */
  @Get('sessions/:sessionId')
  @ApiOperation({
    summary: 'Get session information',
    description:
      'Retrieve detailed information about a browser session including tabs and statistics.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session information retrieved',
    type: BrowserSessionDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async getSession(
    @Param('sessionId') sessionId: string,
  ): Promise<BrowserSessionDto> {
    this.logger.log(`Getting session: ${sessionId}`);

    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException(`Session not found: ${sessionId}`);
    }

    return session;
  }

  /**
   * Get all sessions
   */
  @Get('sessions')
  @ApiOperation({
    summary: 'Get all sessions',
    description:
      'Retrieve all browser sessions with their current status and statistics.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: BrowserSessionStatus,
    description: 'Filter by session status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Sessions retrieved successfully',
    type: [BrowserSessionDto],
  })
  async getAllSessions(
    @Query('status') status?: BrowserSessionStatus,
  ): Promise<BrowserSessionDto[]> {
    this.logger.log('Getting all sessions', { status });

    let sessions = await this.sessionService.getAllSessions();

    if (status) {
      sessions = sessions.filter((session) => session.status === status);
    }

    return sessions;
  }

  /**
   * Close browser session
   */
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Close session',
    description:
      'Close a browser session and terminate all associated tabs and processes.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Session closed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Session not found',
  })
  async closeSession(@Param('sessionId') sessionId: string): Promise<void> {
    this.logger.log(`Closing session: ${sessionId}`);

    try {
      await this.sessionService.closeSession(sessionId);
      this.logger.log(`Session closed successfully: ${sessionId}`);
    } catch (_err) {
      if (_err instanceof Error && _err.message.includes('not found')) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }
      throw _err;
    }
  }

  /**
   * Create new tab in session
   */
  @Post('sessions/:sessionId/tabs')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create new tab',
    description: 'Create a new tab in an existing browser session.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiBody({
    description: 'Tab configuration',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Initial URL to load' },
        title: { type: 'string', description: 'Tab title' },
        makeActive: { type: 'boolean', description: 'Make this tab active' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tab created successfully',
  })
  async createTab(
    @Param('sessionId') sessionId: string,
    @Body()
    tabOptions?: {
      url?: string;
      title?: string;
      makeActive?: boolean;
    },
  ) {
    this.logger.log(`Creating tab in session: ${sessionId}`, {
      sessionId,
      url: tabOptions?.url,
      makeActive: tabOptions?.makeActive,
    });

    try {
      const tab = await this.sessionService.createTab(sessionId, tabOptions);

      this.logger.log(`Tab created successfully: ${tab.tabId}`, {
        sessionId,
        tabId: tab.tabId,
        url: tab.url,
      });

      return {
        status: 'success',
        data: tab,
        timestamp: new Date().toISOString(),
      };
    } catch (_err) {
      if (_err instanceof Error && _err.message.includes('not found')) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }
      throw _err;
    }
  }

  /**
   * Close tab in session
   */
  @Delete('sessions/:sessionId/tabs/:tabId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Close tab',
    description: 'Close a specific tab in a browser session.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiParam({
    name: 'tabId',
    description: 'Unique tab identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Tab closed successfully',
  })
  async closeTab(
    @Param('sessionId') sessionId: string,
    @Param('tabId') tabId: string,
  ): Promise<void> {
    this.logger.log(`Closing tab: ${tabId} in session: ${sessionId}`);

    try {
      await this.sessionService.closeTab(sessionId, tabId);
      this.logger.log(`Tab closed successfully: ${tabId}`);
    } catch (_err) {
      if (_err instanceof Error && _err.message.includes('not found')) {
        throw new NotFoundException(
          `Session or tab not found: ${sessionId}/${tabId}`,
        );
      }
      throw _err;
    }
  }

  // ===========================
  // ASYNC JOB ENDPOINTS
  // ===========================

  /**
   * Create async job for long-running tasks
   */
  @Post('jobs')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Create async job',
    description:
      'Create an asynchronous job for long-running browser automation tasks with progress monitoring.',
  })
  @ApiBody({
    type: CreateAsyncJobDto,
    description: 'Async job configuration',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Job created and queued for processing',
    type: AsyncJobResultDto,
  })
  async createAsyncJob(
    @Body() createJobDto: CreateAsyncJobDto,
  ): Promise<AsyncJobResultDto> {
    this.logger.log(`Creating async job: ${createJobDto.name}`, {
      jobName: createJobDto.name,
      jobType: createJobDto.jobType,
      priority: createJobDto.priority,
    });

    try {
      const job = await this.browserUseService.createAsyncJob(createJobDto);

      this.logger.log(`Async job created: ${job.jobId}`, {
        jobId: job.jobId,
        status: job.status,
        estimatedDurationMs: job.estimatedDurationMs,
      });

      return job;
    } catch (_err) {
      this.logger.error(
        `Async job creation failed: ${createJobDto.name}`,
        _err instanceof Error ? _err.stack : String(_err),
      );

      throw new InternalServerErrorException({
        message: 'Async job creation failed',
        error: _err instanceof Error ? _err.message : String(_err),
        jobName: createJobDto.name,
      });
    }
  }

  /**
   * Get async job status and results
   */
  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Get async job status',
    description:
      'Retrieve the current status, progress, and results of an async job.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job information retrieved',
    type: AsyncJobResultDto,
  })
  async getAsyncJob(@Param('jobId') jobId: string): Promise<AsyncJobResultDto> {
    this.logger.log(`Getting async job: ${jobId}`);

    const job = await this.browserUseService.getAsyncJob(jobId);
    if (!job) {
      throw new NotFoundException(`Async job not found: ${jobId}`);
    }

    return job;
  }

  /**
   * Cancel async job
   */
  @Delete('jobs/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel async job',
    description: 'Cancel a running or queued async job.',
  })
  @ApiParam({
    name: 'jobId',
    description: 'Unique job identifier',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Job cancelled successfully',
  })
  async cancelAsyncJob(@Param('jobId') jobId: string): Promise<void> {
    this.logger.log(`Cancelling async job: ${jobId}`);

    try {
      await this.browserUseService.cancelAsyncJob(jobId);
      this.logger.log(`Async job cancelled: ${jobId}`);
    } catch (_err) {
      if (_err instanceof Error && _err.message.includes('not found')) {
        throw new NotFoundException(`Async job not found: ${jobId}`);
      }
      throw _err;
    }
  }

  // ===========================
  // UTILITY ENDPOINTS
  // ===========================

  /**
   * Take screenshot
   */
  @Post('sessions/:sessionId/screenshot')
  @ApiOperation({
    summary: 'Take screenshot',
    description:
      'Capture a screenshot of the current page in the specified session.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiBody({
    description: 'Screenshot options',
    schema: {
      type: 'object',
      properties: {
        fullPage: { type: 'boolean', description: 'Capture full page' },
        quality: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          description: 'JPEG quality (0-100)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Screenshot captured successfully',
  })
  async takeScreenshot(
    @Param('sessionId') sessionId: string,
    @Body()
    options?: {
      fullPage?: boolean;
      quality?: number;
    },
  ) {
    this.logger.log(`Taking screenshot for session: ${sessionId}`, {
      sessionId,
      fullPage: options?.fullPage,
      quality: options?.quality,
    });

    try {
      const screenshotData = await this.browserUseService.takeScreenshot(
        sessionId,
        options || {},
      );

      // Update session activity
      await this.sessionService.updateActivity(sessionId, {
        screenshot: true,
      });

      return {
        status: 'success',
        data: screenshotData,
        timestamp: new Date().toISOString(),
      };
    } catch (_err) {
      this.logger.error(
        `Screenshot failed for session: ${sessionId}`,
        _err instanceof Error ? _err.stack : String(_err),
      );

      if (_err instanceof Error && _err.message.includes('not found')) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }

      throw new InternalServerErrorException({
        message: 'Screenshot capture failed',
        error: _err instanceof Error ? _err.message : String(_err),
        sessionId,
      });
    }
  }

  /**
   * Extract page data
   */
  @Post('sessions/:sessionId/extract')
  @ApiOperation({
    summary: 'Extract page data',
    description:
      'Extract structured data from the current page using CSS selectors or XPath.',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'Unique session identifier',
    type: 'string',
  })
  @ApiBody({
    description: 'Data extraction configuration',
    schema: {
      type: 'object',
      properties: {
        selectors: {
          type: 'object',
          description: 'CSS selectors for data extraction',
        },
        waitForSelector: {
          type: 'string',
          description: 'Wait for this selector before extraction',
        },
        timeout: {
          type: 'number',
          description: 'Extraction timeout in milliseconds',
        },
      },
      required: ['selectors'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data extracted successfully',
  })
  async extractPageData(
    @Param('sessionId') sessionId: string,
    @Body()
    extractConfig: {
      selectors: Record<string, string>;
      waitForSelector?: string;
      timeout?: number;
    },
  ) {
    this.logger.log(`Extracting page data for session: ${sessionId}`, {
      sessionId,
      selectorsCount: Object.keys(extractConfig.selectors).length,
      waitForSelector: extractConfig.waitForSelector,
    });

    try {
      const extractedData = await this.browserUseService.extractPageData(
        sessionId,
        extractConfig,
      );

      return {
        status: 'success',
        data: extractedData,
        timestamp: new Date().toISOString(),
      };
    } catch (_err) {
      this.logger.error(
        `Data extraction failed for session: ${sessionId}`,
        _err instanceof Error ? _err.stack : String(_err),
      );

      if (_err instanceof Error && _err.message.includes('not found')) {
        throw new NotFoundException(`Session not found: ${sessionId}`);
      }

      throw new InternalServerErrorException({
        message: 'Page data extraction failed',
        error: _err instanceof Error ? _err.message : String(_err),
        sessionId,
      });
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description:
      'Check the health and status of the browser automation service.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health information',
  })
  async getHealthStatus() {
    this.logger.log('Health check requested');

    const activeSessions = await this.sessionService.getAllSessions();
    const runningTasks = await this.taskService.getTasksByStatus(
      BrowserTaskStatus.RUNNING,
    );
    const taskMetrics = await this.taskService.getTaskMetrics();

    const healthData = {
      status: 'healthy',
      service: 'Browser Use Controller',
      timestamp: new Date().toISOString(),
      statistics: {
        activeSessions: activeSessions.filter(
          (s) => s.status === BrowserSessionStatus.ACTIVE,
        ).length,
        runningTasks: runningTasks.length,
        totalTasksCompleted: taskMetrics.completedTasks,
        successRate: taskMetrics.successRate,
      },
      uptime: process.uptime(),
      version: '2.0.0',
    };

    this.logger.log('Health check completed', {
      activeSessions: healthData.statistics.activeSessions,
      runningTasks: healthData.statistics.runningTasks,
    });

    return healthData;
  }
}
