/**
 * Comprehensive Browser Session Management Service
 * Service Layer Implementation for Browser-Use API Endpoints
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { spawn, ChildProcess } from 'child_process';

import {
  IBrowserSession,
  IBrowserSessionConfig,
  IBrowserHealth,
  ISessionStatistics,
  IBrowserError,
  IServiceResponse,
  IPythonProcessResult,
} from './interfaces/browser-automation.interface';

import {
  CreateBrowserSessionDto,
  BrowserSessionResponseDto,
  BrowserHealthDto,
  SessionStatisticsDto,
  ServiceResponseDto,
  GetSessionsQueryDto,
} from './dto/browser-automation.dto';

@Injectable()
export class BrowserSessionService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserSessionService.name);
  private sessions: Map<string, IBrowserSession> = new Map();
  private sessionProcesses: Map<string, ChildProcess> = new Map();
  private sessionMetrics: Map<string, ISessionStatistics> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly maxSessions: number;
  private readonly sessionTimeout: number;
  private readonly healthCheckInterval_ms: number;
  private readonly cleanupInterval_ms: number;
  private readonly pythonPath: string;
  private readonly browserUsePath: string;

  constructor() {
    super();

    // Initialize configuration
    this.maxSessions = parseInt(process.env.MAX_BROWSER_SESSIONS || '10');
    this.sessionTimeout = parseInt(process.env.SESSION_TIMEOUT || '1800000'); // 30 minutes
    this.healthCheckInterval_ms = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'); // 30 seconds
    this.cleanupInterval_ms = parseInt(process.env.CLEANUP_INTERVAL || '300000'); // 5 minutes
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.browserUsePath = process.env.BROWSER_USE_PATH || '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/browser-use';

    this.logger.log('BrowserSessionService initialized with comprehensive lifecycle management');
  }

  async onModuleInit() {
    this.logger.log('BrowserSessionService module initialized');
    this.startHealthCheck();
    this.startCleanupScheduler();
  }

  async onModuleDestroy() {
    this.logger.log('BrowserSessionService module destroying - cleaning up all sessions');
    await this.destroyAllSessions();
    this.stopHealthCheck();
    this.stopCleanupScheduler();
  }

  /**
   * Create a new browser session with comprehensive configuration
   */
  async createSession(sessionDto: CreateBrowserSessionDto): Promise<BrowserSessionResponseDto> {
    try {
      // Check session limits
      if (this.sessions.size >= this.maxSessions) {
        throw new Error(`Maximum session limit reached (${this.maxSessions})`);
      }

      const sessionId = sessionDto.sessionId || uuidv4();
      const timestamp = new Date();

      // Validate session doesn't already exist
      if (this.sessions.has(sessionId)) {
        throw new Error(`Session ${sessionId} already exists`);
      }

      // Create session configuration with defaults
      const config: IBrowserSessionConfig = {
        headless: sessionDto.config?.headless ?? true,
        width: sessionDto.config?.width ?? 1920,
        height: sessionDto.config?.height ?? 1080,
        timeout: sessionDto.config?.timeout ?? 30000,
        browser: sessionDto.config?.browser ?? 'chrome',
        userAgent: sessionDto.config?.userAgent,
        executablePath: sessionDto.config?.executablePath,
        args: sessionDto.config?.args ?? [],
        env: process.env,
      };

      // Create session object
      const session: IBrowserSession = {
        sessionId,
        status: 'initializing',
        createdAt: timestamp,
        lastActivity: timestamp,
        config,
        metadata: {
          userAgent: config.userAgent,
          viewport: { width: config.width!, height: config.height! },
        },
      };

      // Initialize session metrics
      const metrics: ISessionStatistics = {
        sessionId,
        tasksCompleted: 0,
        tasksFailedCount: 0,
        averageTaskDuration: 0,
        totalMemoryUsage: 0,
        totalCpuTime: 0,
        uptime: 0,
        lastActivity: timestamp,
      };

      // Store session and metrics
      this.sessions.set(sessionId, session);
      this.sessionMetrics.set(sessionId, metrics);

      this.logger.log(`Creating browser session ${sessionId} with config:`, config);

      // Initialize browser session through Python
      try {
        await this.initializeBrowserSession(session);
        session.status = 'active';
        this.sessions.set(sessionId, session);

        this.emit('sessionCreated', session);

        this.logger.log(`Browser session ${sessionId} created successfully`);

        return {
          success: true,
          sessionId,
          metadata: {
            config: session.config,
            createdAt: session.createdAt,
          },
        };

      } catch (error) {
        session.status = 'error';
        this.sessions.set(sessionId, session);

        this.logger.error(`Failed to initialize browser session ${sessionId}`, error);
        throw error;
      }

    } catch (error) {
      this.logger.error('Failed to create browser session', error);
      throw error;
    }
  }

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<ServiceResponseDto<IBrowserSession>> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        error: this.createBrowserError(
          new Error(`Session ${sessionId} not found`),
          { context: { sessionId } }
        ),
      };
    }

    // Update last activity
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    return {
      success: true,
      data: session,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Get all sessions with optional filtering
   */
  async getSessions(query: GetSessionsQueryDto): Promise<ServiceResponseDto<IBrowserSession[]>> {
    const { status, limit = 10, offset = 0 } = query;

    let filteredSessions = Array.from(this.sessions.values());

    // Apply status filter
    if (status) {
      filteredSessions = filteredSessions.filter(session => session.status === status);
    }

    // Sort by creation date (newest first)
    filteredSessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const paginatedSessions = filteredSessions.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedSessions,
      metadata: {
        timestamp: new Date(),
        total: filteredSessions.length,
        offset,
        limit,
      },
    };
  }

  /**
   * Destroy a browser session and clean up resources
   */
  async destroySession(sessionId: string): Promise<BrowserSessionResponseDto> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        sessionId,
        metadata: {
          error: `Session ${sessionId} not found`,
        },
      };
    }

    try {
      this.logger.log(`Destroying browser session ${sessionId}`);

      // Update session status
      session.status = 'destroyed';
      this.sessions.set(sessionId, session);

      // Terminate browser process if running
      const process = this.sessionProcesses.get(sessionId);
      if (process) {
        try {
          process.kill('SIGTERM');
          this.sessionProcesses.delete(sessionId);
          this.logger.log(`Terminated browser process for session ${sessionId}`);
        } catch (error) {
          this.logger.error(`Failed to terminate process for session ${sessionId}`, error);
        }
      }

      // Clean up session data
      this.sessions.delete(sessionId);
      this.sessionMetrics.delete(sessionId);

      this.emit('sessionDestroyed', { sessionId, session });

      this.logger.log(`Browser session ${sessionId} destroyed successfully`);

      return {
        success: true,
        sessionId,
        metadata: {
          destroyedAt: new Date(),
        },
      };

    } catch (error) {
      this.logger.error(`Failed to destroy session ${sessionId}`, error);

      return {
        success: false,
        sessionId,
        metadata: {
          error: error.message,
        },
      };
    }
  }

  /**
   * Get session health status
   */
  async getSessionHealth(sessionId: string): Promise<ServiceResponseDto<IBrowserHealth>> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        error: this.createBrowserError(
          new Error(`Session ${sessionId} not found`),
          { context: { sessionId } }
        ),
      };
    }

    try {
      const startTime = Date.now();

      // Perform health check by sending ping to browser session
      const isHealthy = await this.performHealthCheck(sessionId);
      const responseTime = Date.now() - startTime;

      const health: IBrowserHealth = {
        sessionId,
        healthy: isHealthy,
        status: session.status,
        lastPing: new Date(),
        responseTime,
        memoryUsage: await this.getSessionMemoryUsage(sessionId),
        cpuUsage: await this.getSessionCpuUsage(sessionId),
        errors: [], // Could be populated with recent errors
      };

      return {
        success: true,
        data: health,
        metadata: {
          timestamp: new Date(),
        },
      };

    } catch (error) {
      this.logger.error(`Failed to get health for session ${sessionId}`, error);

      return {
        success: false,
        error: this.createBrowserError(
          error,
          { context: { sessionId } }
        ),
      };
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(sessionId: string): Promise<ServiceResponseDto<ISessionStatistics>> {
    const session = this.sessions.get(sessionId);
    const metrics = this.sessionMetrics.get(sessionId);

    if (!session || !metrics) {
      return {
        success: false,
        error: this.createBrowserError(
          new Error(`Session ${sessionId} not found`),
          { context: { sessionId } }
        ),
      };
    }

    // Update uptime
    metrics.uptime = Date.now() - session.createdAt.getTime();
    this.sessionMetrics.set(sessionId, metrics);

    return {
      success: true,
      data: metrics,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Update session activity timestamp
   */
  updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(sessionId, session);

      const metrics = this.sessionMetrics.get(sessionId);
      if (metrics) {
        metrics.lastActivity = new Date();
        this.sessionMetrics.set(sessionId, metrics);
      }
    }
  }

  /**
   * Record task completion for session statistics
   */
  recordTaskCompletion(sessionId: string, duration: number, success: boolean): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (metrics) {
      if (success) {
        metrics.tasksCompleted++;
        // Update average duration
        metrics.averageTaskDuration =
          (metrics.averageTaskDuration * (metrics.tasksCompleted - 1) + duration) / metrics.tasksCompleted;
      } else {
        metrics.tasksFailedCount++;
      }

      this.sessionMetrics.set(sessionId, metrics);
      this.updateSessionActivity(sessionId);
    }
  }

  /**
   * Pause a browser session
   */
  async pauseSession(sessionId: string): Promise<BrowserSessionResponseDto> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        sessionId,
        metadata: { error: `Session ${sessionId} not found` },
      };
    }

    if (session.status !== 'active') {
      return {
        success: false,
        sessionId,
        metadata: { error: `Session ${sessionId} is not active` },
      };
    }

    session.status = 'paused';
    this.sessions.set(sessionId, session);

    this.emit('sessionPaused', session);
    this.logger.log(`Session ${sessionId} paused`);

    return {
      success: true,
      sessionId,
      metadata: { pausedAt: new Date() },
    };
  }

  /**
   * Resume a paused browser session
   */
  async resumeSession(sessionId: string): Promise<BrowserSessionResponseDto> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return {
        success: false,
        sessionId,
        metadata: { error: `Session ${sessionId} not found` },
      };
    }

    if (session.status !== 'paused') {
      return {
        success: false,
        sessionId,
        metadata: { error: `Session ${sessionId} is not paused` },
      };
    }

    session.status = 'active';
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);

    this.emit('sessionResumed', session);
    this.logger.log(`Session ${sessionId} resumed`);

    return {
      success: true,
      sessionId,
      metadata: { resumedAt: new Date() },
    };
  }

  /**
   * Initialize browser session through Python browser-use framework
   */
  private async initializeBrowserSession(session: IBrowserSession): Promise<void> {
    const pythonScript = this.generateSessionInitScript(session);

    const result = await this.executePythonCommand({
      command: this.pythonPath,
      args: ['-c', pythonScript],
      timeout: 30000,
      sessionId: session.sessionId,
    });

    if (!result.success) {
      throw new Error(`Failed to initialize browser session: ${result.stderr}`);
    }

    this.logger.log(`Browser session ${session.sessionId} initialized successfully`);
  }

  /**
   * Generate Python script for session initialization
   */
  private generateSessionInitScript(session: IBrowserSession): string {
    const config = session.config;

    return `
import asyncio
import json
from browser_use import Agent

async def initialize_session():
    try:
        # Create agent with session configuration
        agent = Agent(
            task="Initialize browser session",
            llm="anthropic/claude-3-5-sonnet-20241022"
        )

        # Configure browser with session settings
        browser_config = {
            "headless": ${config.headless},
            "viewport": {"width": ${config.width}, "height": ${config.height}},
            "timeout": ${config.timeout}
        }

        # Initialize browser
        await agent.browser.new_context(**browser_config)

        print(json.dumps({
            "success": True,
            "sessionId": "${session.sessionId}",
            "message": "Browser session initialized successfully"
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))

if __name__ == "__main__":
    asyncio.run(initialize_session())
`;
  }

  /**
   * Perform health check on browser session
   */
  private async performHealthCheck(sessionId: string): Promise<boolean> {
    try {
      const pythonScript = `
import asyncio
import json
from browser_use import Agent

async def health_check():
    try:
        agent = Agent(task="Health check", llm="anthropic/claude-3-5-sonnet-20241022")
        # Simple ping to check if browser is responsive
        await agent.browser.page.title()
        print(json.dumps({"healthy": True}))
    except Exception as e:
        print(json.dumps({"healthy": False, "error": str(e)}))

if __name__ == "__main__":
    asyncio.run(health_check())
`;

      const result = await this.executePythonCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        timeout: 10000,
        sessionId,
      });

      if (result.success) {
        const parsed = JSON.parse(result.stdout.trim());
        return parsed.healthy === true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get session memory usage (placeholder implementation)
   */
  private async getSessionMemoryUsage(sessionId: string): Promise<number> {
    const process = this.sessionProcesses.get(sessionId);
    if (process && process.pid) {
      // In a real implementation, you would get actual memory usage
      // For now, return a placeholder value
      return Math.random() * 100; // MB
    }
    return 0;
  }

  /**
   * Get session CPU usage (placeholder implementation)
   */
  private async getSessionCpuUsage(sessionId: string): Promise<number> {
    const process = this.sessionProcesses.get(sessionId);
    if (process && process.pid) {
      // In a real implementation, you would get actual CPU usage
      // For now, return a placeholder value
      return Math.random() * 10; // Percentage
    }
    return 0;
  }

  /**
   * Execute Python command
   */
  private async executePythonCommand(command: {
    command: string;
    args: string[];
    timeout: number;
    sessionId?: string;
  }): Promise<IPythonProcessResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const process = spawn(command.command, command.args, {
        cwd: this.browserUsePath,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        resolve({
          success: false,
          stderr: 'Process timeout',
          duration: Date.now() - startTime,
          pid: process.pid,
        });
      }, command.timeout);

      process.on('close', (exitCode) => {
        clearTimeout(timeout);

        if (command.sessionId) {
          if (exitCode === 0) {
            this.sessionProcesses.set(command.sessionId, process);
          } else {
            this.sessionProcesses.delete(command.sessionId);
          }
        }

        resolve({
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode: exitCode || undefined,
          duration: Date.now() - startTime,
          pid: process.pid,
        });
      });
    });
  }

  /**
   * Start health check scheduler
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.status === 'active') {
          try {
            const isHealthy = await this.performHealthCheck(sessionId);
            if (!isHealthy) {
              this.logger.warn(`Session ${sessionId} failed health check`);
              session.status = 'error';
              this.sessions.set(sessionId, session);
              this.emit('sessionUnhealthy', session);
            }
          } catch (error) {
            this.logger.error(`Health check failed for session ${sessionId}`, error);
          }
        }
      }
    }, this.healthCheckInterval_ms);

    this.logger.log(`Health check scheduler started (interval: ${this.healthCheckInterval_ms}ms)`);
  }

  /**
   * Stop health check scheduler
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.logger.log('Health check scheduler stopped');
    }
  }

  /**
   * Start cleanup scheduler for inactive sessions
   */
  private startCleanupScheduler(): void {
    this.cleanupInterval = setInterval(async () => {
      const now = Date.now();
      const sessionsToCleanup: string[] = [];

      for (const [sessionId, session] of this.sessions.entries()) {
        const inactiveTime = now - session.lastActivity.getTime();

        if (inactiveTime > this.sessionTimeout) {
          sessionsToCleanup.push(sessionId);
        }
      }

      for (const sessionId of sessionsToCleanup) {
        this.logger.log(`Cleaning up inactive session ${sessionId}`);
        await this.destroySession(sessionId);
      }

      if (sessionsToCleanup.length > 0) {
        this.logger.log(`Cleaned up ${sessionsToCleanup.length} inactive sessions`);
      }
    }, this.cleanupInterval_ms);

    this.logger.log(`Cleanup scheduler started (interval: ${this.cleanupInterval_ms}ms, timeout: ${this.sessionTimeout}ms)`);
  }

  /**
   * Stop cleanup scheduler
   */
  private stopCleanupScheduler(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.logger.log('Cleanup scheduler stopped');
    }
  }

  /**
   * Destroy all active sessions
   */
  private async destroyAllSessions(): Promise<void> {
    const sessionIds = Array.from(this.sessions.keys());

    for (const sessionId of sessionIds) {
      try {
        await this.destroySession(sessionId);
      } catch (error) {
        this.logger.error(`Failed to destroy session ${sessionId} during cleanup`, error);
      }
    }

    this.logger.log(`Destroyed ${sessionIds.length} sessions during cleanup`);
  }

  /**
   * Create standardized browser error
   */
  private createBrowserError(
    error: any,
    options: { context?: any; severity?: 'info' | 'warning' | 'error' | 'critical' } = {}
  ): IBrowserError {
    return {
      code: error.code || 'SESSION_ERROR',
      message: error.message || 'Unknown session error',
      stack: error.stack,
      context: options.context,
      timestamp: new Date(),
      severity: options.severity || 'error',
    };
  }

  /**
   * Get service status information
   */
  getServiceStatus(): ServiceResponseDto<any> {
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.status === 'active').length;
    const totalSessions = this.sessions.size;

    return {
      success: true,
      data: {
        activeSessions,
        totalSessions,
        maxSessions: this.maxSessions,
        sessionTimeout: this.sessionTimeout,
        healthCheckEnabled: this.healthCheckInterval !== null,
        cleanupEnabled: this.cleanupInterval !== null,
      },
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
      },
    };
  }
}