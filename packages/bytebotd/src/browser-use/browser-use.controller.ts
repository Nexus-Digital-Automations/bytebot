/**
 * Browser-Use API Controller - BYTEBOT INTEGRATION
 *
 * Provides comprehensive REST API endpoints for browser automation including
 * script execution, navigation, wait operations, status checks, screenshots,
 * and DOM interactions. Integrates with Python browser-use framework for
 * advanced automation capabilities with local-only architecture.
 *
 * Features:
 * - POST /browser/execute - Execute browser automation scripts via Python framework
 * - POST /browser/navigate - Navigate to URLs with options
 * - POST /browser/wait - Wait for elements, conditions, or timeouts
 * - GET /browser/status - Session status and health checks
 * - POST /browser/screenshot - Capture page or element screenshots
 * - POST /browser/interaction - DOM interactions (click, type, hover, etc.)
 *
 * Python Framework Integration:
 * - Integrates with browser-use Python framework
 * - Task-based execution with queueing
 * - Advanced automation capabilities
 * - Local session management
 *
 * @author Claude Code - API Controller Development Agent
 * @version 2.0.0 - BYTEBOT PYTHON FRAMEWORK INTEGRATION
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Logger,
  HttpStatus,
  HttpException,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  Authenticated,
  CurrentUser,
  ByteBotdUser,
} from '../auth/decorators/roles.decorator';

// Import services
import { BrowserUseService } from './browser-use.service';
import { BrowserInteractionService } from './browser-interaction.service';
import { BrowserSessionService } from './browser-session.service';

// Import DTOs - mixing original API design with new service DTOs
import {
  BrowserExecuteDto,
  BrowserExecuteResponseDto,
  BrowserNavigateDto,
  BrowserNavigateResponseDto,
  BrowserWaitDto,
  BrowserWaitResponseDto,
  BrowserStatusDto,
  BrowserStatusResponseDto,
  BrowserScreenshotDto,
  BrowserScreenshotResponseDto,
  BrowserInteractionDto as OriginalBrowserInteractionDto,
  BrowserInteractionResponseDto as OriginalBrowserInteractionResponseDto,
} from './dto';

// Import service DTOs
import {
  CreateBrowserTaskDto,
  BrowserTaskResponseDto,
  BrowserInteractionDto as ServiceBrowserInteractionDto,
  BrowserInteractionResponseDto as ServiceBrowserInteractionResponseDto,
  CreateBrowserSessionDto,
  BrowserSessionResponseDto,
  GetTasksQueryDto,
  ServiceResponseDto,
} from './dto/browser-automation.dto';

/**
 * Browser automation controller providing comprehensive REST API endpoints
 * with Python framework integration
 */
@Controller('browser')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
@ApiTags('Browser Automation')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class BrowserUseController {
  private readonly logger = new Logger(BrowserUseController.name);

  constructor(
    private readonly browserUseService: BrowserUseService,
    private readonly browserInteractionService: BrowserInteractionService,
    private readonly browserSessionService: BrowserSessionService,
  ) {
    this.logger.log('Browser-Use Controller initialized with Python framework integration');
    this.logger.log('BYTEBOT INTEGRATION: Browser automation API endpoints active with task-based execution');
  }

  /**
   * Execute browser automation scripts via Python framework
   * POST /browser/execute
   *
   * @param executeDto Browser execution parameters
   * @param user Current authenticated user
   * @returns Execution result with timing and optional screenshots
   */
  @Post('execute')
  @Authenticated()
  @ApiOperation({
    summary: 'Execute browser automation script',
    description: 'Execute custom browser automation scripts using Python browser-use framework',
  })
  @ApiBody({ type: BrowserExecuteDto })
  @ApiResponse({
    status: 200,
    description: 'Script executed successfully',
    type: BrowserExecuteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid execution parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Script execution failed',
  })
  async executeScript(
    @Body() executeDto: BrowserExecuteDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserExecuteResponseDto> {
    const operationId = `execute_${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Browser script execution requested via Python framework`, {
      operationId,
      userId: user.id,
      script: executeDto.script.substring(0, 100) + '...',
      sessionId: executeDto.sessionId,
      captureScreenshots: executeDto.captureScreenshots,
    });

    try {
      // Create session if not provided
      let sessionId = executeDto.sessionId;
      if (!sessionId) {
        const sessionResponse = await this.browserSessionService.createSession({
          options: executeDto.parameters || {}
        });
        sessionId = sessionResponse.sessionId;
      }

      // Create browser automation task
      const taskRequest: CreateBrowserTaskDto = {
        sessionId,
        type: 'automation',
        instruction: executeDto.script,
        params: {
          ...executeDto.parameters,
          captureScreenshots: executeDto.captureScreenshots,
        },
        priority: 'medium',
      };

      const taskResponse = await this.browserUseService.createTask(taskRequest);

      if (!taskResponse.success) {
        throw new Error('Failed to create automation task');
      }

      // Wait for task completion (simplified for this endpoint)
      // In production, you might want to return the task ID and have clients poll for results
      let task = await this.browserUseService.getTask(taskResponse.taskId);
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds timeout

      while (task.success && task.data && task.data.status === 'pending' || task.data?.status === 'running') {
        if (attempts >= maxAttempts) {
          throw new Error('Task execution timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        task = await this.browserUseService.getTask(taskResponse.taskId);
        attempts++;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!task.success || !task.data) {
        throw new Error(task.error?.message || 'Task execution failed');
      }

      this.logger.log(`[${operationId}] Script execution completed successfully`, {
        operationId,
        userId: user.id,
        duration,
        sessionId,
        taskId: taskResponse.taskId,
        status: task.data.status,
      });

      return {
        success: task.data.status === 'completed',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result: task.data.result?.data as any || null,
        timing: {
          startTime,
          endTime,
          duration,
        },
        sessionId,
        screenshots: executeDto.captureScreenshots ? [task.data.result?.screenshot].filter(Boolean) : undefined,
        error: task.data.status === 'failed' ? task.data.error?.message : undefined,
      };

    } catch (error: unknown) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';

      this.logger.error(`[${operationId}] Script execution failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        duration,
        error: errorMessage,
        script: executeDto.script.substring(0, 100) + '...',
      });

      return {
        success: false,
        result: null,
        error: errorMessage,
        timing: {
          startTime,
          endTime,
          duration,
        },
        sessionId: executeDto.sessionId || 'unknown',
      };
    }
  }

  /**
   * Navigate to URL with options
   * POST /browser/navigate
   *
   * @param navigateDto Navigation parameters
   * @param user Current authenticated user
   * @returns Navigation result with final URL and timing
   */
  @Post('navigate')
  @Authenticated()
  @ApiOperation({
    summary: 'Navigate to URL',
    description: 'Navigate browser to specified URL using Python framework',
  })
  @ApiBody({ type: BrowserNavigateDto })
  @ApiResponse({
    status: 200,
    description: 'Navigation completed successfully',
    type: BrowserNavigateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid navigation parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Navigation failed',
  })
  async navigate(
    @Body() navigateDto: BrowserNavigateDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserNavigateResponseDto> {
    const operationId = `navigate_${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Browser navigation requested`, {
      operationId,
      userId: user.id,
      url: navigateDto.url,
      sessionId: navigateDto.sessionId,
      captureScreenshot: navigateDto.captureScreenshot,
    });

    try {
      // Create session if not provided
      let sessionId = navigateDto.sessionId;
      if (!sessionId) {
        const sessionResponse = await this.browserSessionService.createSession({});
        sessionId = sessionResponse.sessionId;
      }

      // Create navigation interaction
      const interactionRequest: ServiceBrowserInteractionDto = {
        type: 'navigate',
        value: navigateDto.url,
        options: navigateDto.options,
        timeout: navigateDto.options?.timeout,
      };

      const result = await this.browserUseService.executeInteraction(sessionId, interactionRequest);

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!result.success) {
        throw new Error(result.error?.message || 'Navigation failed');
      }

      this.logger.log(`[${operationId}] Navigation completed successfully`, {
        operationId,
        userId: user.id,
        duration,
        sessionId,
      });

      return {
        success: true,
        finalUrl: navigateDto.url, // Python framework doesn't return final URL easily
        statusCode: 200, // Assume success
        timing: {
          startTime,
          endTime,
          duration,
        },
        sessionId,
        pageTitle: undefined, // Would need additional extraction
        screenshot: navigateDto.captureScreenshot ? result.screenshot : undefined,
      };

    } catch (error: unknown) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown navigation error';

      this.logger.error(`[${operationId}] Navigation failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        duration,
        error: errorMessage,
        url: navigateDto.url,
      });

      return {
        success: false,
        finalUrl: navigateDto.url,
        statusCode: 0,
        error: errorMessage,
        timing: {
          startTime,
          endTime,
          duration,
        },
        sessionId: navigateDto.sessionId || 'unknown',
      };
    }
  }

  /**
   * Wait for elements, conditions, or timeouts
   * POST /browser/wait
   *
   * @param waitDto Wait operation parameters
   * @param user Current authenticated user
   * @returns Wait operation result with timing
   */
  @Post('wait')
  @Authenticated()
  @ApiOperation({
    summary: 'Wait for conditions',
    description: 'Wait for elements, network idle, page load, or custom conditions using Python framework',
  })
  @ApiBody({ type: BrowserWaitDto })
  @ApiResponse({
    status: 200,
    description: 'Wait operation completed successfully',
    type: BrowserWaitResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wait parameters',
  })
  @ApiResponse({
    status: 408,
    description: 'Wait operation timed out',
  })
  async wait(
    @Body() waitDto: BrowserWaitDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserWaitResponseDto> {
    const operationId = `wait_${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Browser wait operation requested`, {
      operationId,
      userId: user.id,
      waitType: waitDto.type,
      selector: waitDto.selector,
      timeout: waitDto.timeout,
      sessionId: waitDto.sessionId,
    });

    try {
      // Create session if not provided
      let sessionId = waitDto.sessionId;
      if (!sessionId) {
        const sessionResponse = await this.browserSessionService.createSession({});
        sessionId = sessionResponse.sessionId;
      }

      // Create wait interaction
      const interactionRequest: ServiceBrowserInteractionDto = {
        type: 'wait',
        selector: waitDto.selector,
        value: waitDto.condition,
        timeout: waitDto.timeout,
        options: waitDto.options,
      };

      const result = await this.browserUseService.executeInteraction(sessionId, interactionRequest);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const actualWaitTime = duration; // Simplified - actual framework might provide better timing

      if (!result.success) {
        throw new Error(result.error?.message || 'Wait operation failed');
      }

      this.logger.log(`[${operationId}] Wait operation completed successfully`, {
        operationId,
        userId: user.id,
        duration,
        waitType: waitDto.type,
        actualWaitTime,
      });

      return {
        success: true,
        waitType: waitDto.type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result: result.data as any,
        timing: {
          startTime,
          endTime,
          duration,
          actualWaitTime,
        },
        sessionId,
      };

    } catch (error: unknown) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown wait error';

      this.logger.error(`[${operationId}] Wait operation failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        duration,
        error: errorMessage,
        waitType: waitDto.type,
      });

      return {
        success: false,
        waitType: waitDto.type,
        error: errorMessage,
        timing: {
          startTime,
          endTime,
          duration,
          actualWaitTime: duration,
        },
        sessionId: waitDto.sessionId || 'unknown',
      };
    }
  }

  /**
   * Get browser and session status
   * GET /browser/status
   *
   * @param statusDto Status query parameters
   * @param user Current authenticated user
   * @returns System health and session status information
   */
  @Get('status')
  @Authenticated()
  @ApiOperation({
    summary: 'Get browser status',
    description: 'Get Python framework service health and session status information',
  })
  @ApiQuery({ type: BrowserStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Status retrieved successfully',
    type: BrowserStatusResponseDto,
  })
  async getStatus(
    @Query() statusDto: BrowserStatusDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserStatusResponseDto> {
    const operationId = `status_${Date.now()}`;

    this.logger.log(`[${operationId}] Browser status requested`, {
      operationId,
      userId: user.id,
      sessionId: statusDto.sessionId,
    });

    try {
      // Get service health status
      const serviceHealth = this.browserUseService.getHealthStatus();

      if (!serviceHealth.success) {
        throw new Error('Failed to get service health status');
      }

      const healthData = serviceHealth.data as {
        runningProcesses?: number;
        config?: {
          maxConcurrentSessions?: number;
        };
      };

      // Get session status if requested
      let sessionStatus = undefined;
      let allSessions = undefined;

      if (statusDto.sessionId) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        sessionStatus = await this.browserSessionService.getSessionStatus(statusDto.sessionId) as any;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        allSessions = await this.browserSessionService.getAllSessions() as any;
      }

      const response: BrowserStatusResponseDto = {
        healthy: serviceHealth.success,
        system: {
          browserServiceRunning: true,
          activeSessions: healthData.runningProcesses || 0,
          maxSessions: healthData.config?.maxConcurrentSessions || 5,
          memoryUsage: {
            used: 0, // Would need system monitoring
            free: 0,
            total: 0,
          },
          uptime: process.uptime(),
        },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        session: sessionStatus as any,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        sessions: allSessions as any,
        timestamp: new Date(),
      };

      this.logger.log(`[${operationId}] Status retrieved successfully`, {
        operationId,
        userId: user.id,
        healthy: response.healthy,
        activeSessions: response.system.activeSessions,
      });

      return response;

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown status error';

      this.logger.error(`[${operationId}] Status retrieval failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        error: errorMessage,
      });

      throw new HttpException(
        `Status retrieval failed: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Capture page or element screenshots
   * POST /browser/screenshot
   *
   * @param screenshotDto Screenshot parameters
   * @param user Current authenticated user
   * @returns Screenshot file path or base64 data
   */
  @Post('screenshot')
  @Authenticated()
  @ApiOperation({
    summary: 'Capture screenshot',
    description: 'Capture full page or element screenshots using Python framework',
  })
  @ApiBody({ type: BrowserScreenshotDto })
  @ApiResponse({
    status: 200,
    description: 'Screenshot captured successfully',
    type: BrowserScreenshotResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid screenshot parameters',
  })
  @ApiResponse({
    status: 500,
    description: 'Screenshot capture failed',
  })
  async captureScreenshot(
    @Body() screenshotDto: BrowserScreenshotDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserScreenshotResponseDto> {
    const operationId = `screenshot_${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Screenshot capture requested`, {
      operationId,
      userId: user.id,
      sessionId: screenshotDto.sessionId,
      selector: screenshotDto.selector,
      returnBase64: screenshotDto.returnBase64,
    });

    try {
      // Create session if not provided
      let sessionId = screenshotDto.sessionId;
      if (!sessionId) {
        const sessionResponse = await this.browserSessionService.createSession({});
        sessionId = sessionResponse.sessionId;
      }

      // Create screenshot task
      const taskRequest: CreateBrowserTaskDto = {
        sessionId,
        type: 'screenshot',
        instruction: 'Take a screenshot',
        params: {
          selector: screenshotDto.selector,
          options: screenshotDto.options,
          returnBase64: screenshotDto.returnBase64,
        },
      };

      const taskResponse = await this.browserUseService.createTask(taskRequest);

      if (!taskResponse.success) {
        throw new Error('Failed to create screenshot task');
      }

      // Wait for task completion
      let task = await this.browserUseService.getTask(taskResponse.taskId);
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout for screenshots

      while (task.success && task.data && (task.data.status === 'pending' || task.data.status === 'running')) {
        if (attempts >= maxAttempts) {
          throw new Error('Screenshot task timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        task = await this.browserUseService.getTask(taskResponse.taskId);
        attempts++;
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!task.success || !task.data || task.data.status !== 'completed') {
        throw new Error(task.error?.message || 'Screenshot capture failed');
      }

      this.logger.log(`[${operationId}] Screenshot captured successfully`, {
        operationId,
        userId: user.id,
        duration,
        taskId: taskResponse.taskId,
      });

      return {
        success: true,
        filePath: undefined, // Python framework returns base64 primarily
        base64Data: task.data.result?.screenshot,
        metadata: {
          width: 0, // Would need to be extracted from framework
          height: 0,
          format: 'png',
          size: task.data.result?.screenshot?.length || 0,
          timestamp: new Date(),
        },
        sessionId,
        timing: {
          startTime,
          endTime,
          duration,
        },
      };

    } catch (error: unknown) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown screenshot error';

      this.logger.error(`[${operationId}] Screenshot capture failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        duration,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        sessionId: screenshotDto.sessionId || 'unknown',
        timing: {
          startTime,
          endTime,
          duration,
        },
      };
    }
  }

  /**
   * Perform DOM interactions (click, type, hover, etc.)
   * POST /browser/interaction
   *
   * @param interactionDto Interaction parameters
   * @param user Current authenticated user
   * @returns Interaction result with element information
   */
  @Post('interaction')
  @Authenticated()
  @ApiOperation({
    summary: 'Perform DOM interaction',
    description: 'Interact with page elements through Python framework automation',
  })
  @ApiBody({ type: OriginalBrowserInteractionDto })
  @ApiResponse({
    status: 200,
    description: 'Interaction completed successfully',
    type: OriginalBrowserInteractionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid interaction parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Target element not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Interaction failed',
  })
  async performInteraction(
    @Body() interactionDto: OriginalBrowserInteractionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<OriginalBrowserInteractionResponseDto> {
    const operationId = `interaction_${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] DOM interaction requested`, {
      operationId,
      userId: user.id,
      interactionType: interactionDto.type,
      selector: interactionDto.selector,
      sessionId: interactionDto.sessionId,
      captureScreenshot: interactionDto.captureScreenshot,
    });

    try {
      // Create session if not provided
      let sessionId = interactionDto.sessionId;
      if (!sessionId) {
        const sessionResponse = await this.browserSessionService.createSession({});
        sessionId = sessionResponse.sessionId;
      }

      // Map original interaction to service interaction
      const serviceInteraction: ServiceBrowserInteractionDto = {
        type: interactionDto.type as 'click' | 'type' | 'select' | 'hover' | 'scroll' | 'wait' | 'navigate',
        selector: interactionDto.selector,
        value: interactionDto.value,
        coordinates: interactionDto.options?.coordinates,
        timeout: interactionDto.options?.timeout,
        options: interactionDto.options,
      };

      const result = await this.browserUseService.executeInteraction(sessionId, serviceInteraction);

      const endTime = Date.now();
      const duration = endTime - startTime;

      if (!result.success) {
        throw new Error(result.error?.message || 'Interaction failed');
      }

      this.logger.log(`[${operationId}] Interaction completed successfully`, {
        operationId,
        userId: user.id,
        duration,
        interactionType: interactionDto.type,
      });

      return {
        success: true,
        interactionType: interactionDto.type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result: result.data as any,
        elementInfo: undefined, // Python framework doesn't return detailed element info easily
        timing: {
          startTime,
          endTime,
          duration,
        },
        screenshot: interactionDto.captureScreenshot ? result.screenshot : undefined,
        sessionId,
      };

    } catch (error: unknown) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown interaction error';

      this.logger.error(`[${operationId}] Interaction failed: ${errorMessage}`, {
        operationId,
        userId: user.id,
        duration,
        error: errorMessage,
        interactionType: interactionDto.type,
        selector: interactionDto.selector,
      });

      return {
        success: false,
        interactionType: interactionDto.type,
        error: errorMessage,
        timing: {
          startTime,
          endTime,
          duration,
        },
        sessionId: interactionDto.sessionId || 'unknown',
      };
    }
  }

  /**
   * Create a new browser session
   * POST /browser/session
   */
  @Post('session')
  @Authenticated()
  @ApiOperation({
    summary: 'Create browser session',
    description: 'Create a new browser session for automation tasks',
  })
  @ApiBody({ type: CreateBrowserSessionDto })
  @ApiResponse({
    status: 200,
    description: 'Session created successfully',
    type: BrowserSessionResponseDto,
  })
  async createSession(
    @Body() sessionDto: CreateBrowserSessionDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<BrowserSessionResponseDto> {
    this.logger.log(`Creating browser session for user ${user.id}`);
    return await this.browserSessionService.createSession(sessionDto);
  }

  /**
   * Get task status
   * GET /browser/task/:taskId
   */
  @Get('task/:taskId')
  @Authenticated()
  @ApiOperation({
    summary: 'Get task status',
    description: 'Get the status and result of a browser automation task',
  })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({
    status: 200,
    description: 'Task status retrieved successfully',
    type: BrowserTaskResponseDto,
  })
  async getTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<ServiceResponseDto> {
    this.logger.log(`Getting task ${taskId} status for user ${user.id}`);
    return await this.browserUseService.getTask(taskId);
  }

  /**
   * Get session tasks
   * GET /browser/session/:sessionId/tasks
   */
  @Get('session/:sessionId/tasks')
  @Authenticated()
  @ApiOperation({
    summary: 'Get session tasks',
    description: 'Get all tasks for a browser session',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiQuery({ type: GetTasksQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Session tasks retrieved successfully',
  })
  async getSessionTasks(
    @Param('sessionId') sessionId: string,
    @Query() query: GetTasksQueryDto,
    @CurrentUser() user: ByteBotdUser,
  ): Promise<ServiceResponseDto> {
    this.logger.log(`Getting tasks for session ${sessionId} for user ${user.id}`);
    return await this.browserUseService.getSessionTasks(sessionId, query.status, query.type);
  }
}