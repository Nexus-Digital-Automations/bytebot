/**
 * Browser Automation Service - Browser-Use Python Integration
 *
 * This service orchestrates browser-use Python library functionality through
 * a comprehensive TypeScript interface. It manages browser sessions, executes
 * automation tasks, handles data extraction, and provides session lifecycle
 * management with enterprise-grade error handling and monitoring.
 *
 * Key Features:
 * - Browser session creation and management
 * - Python subprocess execution for browser-use operations
 * - Session state tracking and monitoring
 * - Screenshot capture and visual feedback
 * - Data extraction with multiple strategies
 * - Comprehensive error handling and recovery
 * - Resource cleanup and memory management
 * - Performance monitoring and analytics
 *
 * Dependencies: Python 3.11+, browser-use library, Chrome/Chromium browser
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import {
  BrowserSessionCreateDto,
  BrowserSessionResponseDto,
  BrowserSessionInfoDto,
  BrowserSessionListResponseDto,
  BrowserScreenshotResponseDto,
  BrowserNavigationDto,
  BrowserNavigationResponseDto,
  BrowserActionDto,
  BrowserActionResponseDto,
  BrowserDataExtractionDto,
  BrowserDataExtractionResponseDto,
  BrowserSessionStatus,
} from './dto/browser-automation.dto';

const execAsync = promisify(exec);

/**
 * Interface for managing browser session state
 */
interface BrowserSession {
  sessionId: string;
  status: BrowserSessionStatus;
  processId?: number;
  process?: ChildProcess;
  createdAt: Date;
  lastActivityAt: Date;
  currentUrl?: string;
  currentTitle?: string;
  configuration: {
    headless: boolean;
    viewport?: { width: number; height: number };
    userAgent?: string;
    timeout: number;
  };
  metadata?: Record<string, any>;
  userId: string;
  pythonProcess?: ChildProcess;
  communicationPort?: number;
  tempDirectory?: string;
}

/**
 * Interface for Python communication protocol
 */
interface PythonCommand {
  id: string;
  action: string;
  sessionId: string;
  parameters: Record<string, any>;
  timeout?: number;
}

interface PythonResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}

/**
 * Browser Automation Service Implementation
 *
 * Manages browser-use Python integration with comprehensive session management,
 * error handling, and performance monitoring. Provides enterprise-grade browser
 * automation capabilities through a secure and scalable TypeScript interface.
 */
@Injectable()
export class BrowserAutomationService implements OnModuleDestroy {
  private readonly logger = new Logger(BrowserAutomationService.name);
  private readonly sessions = new Map<string, BrowserSession>();
  private readonly activeCommands = new Map<string, NodeJS.Timeout>();
  private readonly pythonExecutablePath: string;
  private readonly browserUsePath: string;
  private readonly maxSessions = 10;
  private readonly sessionCleanupInterval: NodeJS.Timeout;

  constructor() {
    // Initialize Python and browser-use paths
    this.pythonExecutablePath = this.detectPythonPath();
    this.browserUsePath = this.detectBrowserUsePath();

    // Start session cleanup task
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Clean up every minute

    this.logger.log('Browser Automation Service initialized', {
      pythonPath: this.pythonExecutablePath,
      browserUsePath: this.browserUsePath,
      maxSessions: this.maxSessions,
    });
  }

  /**
   * Clean up resources when module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down Browser Automation Service...');

    // Clear cleanup interval
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Close all active sessions
    const sessionIds = Array.from(this.sessions.keys());
    await Promise.all(
      sessionIds.map(sessionId => this.closeSession(sessionId, 'system'))
    );

    // Cancel all active commands
    for (const [commandId, timeout] of this.activeCommands.entries()) {
      clearTimeout(timeout);
      this.activeCommands.delete(commandId);
    }

    this.logger.log('Browser Automation Service shutdown complete');
  }

  /**
   * Create a new browser automation session
   *
   * @param sessionRequest Session configuration parameters
   * @param context Request context with user information
   * @returns Promise<BrowserSessionResponseDto> Session creation details
   */
  async createSession(
    sessionRequest: BrowserSessionCreateDto,
    context: {
      userId: string;
      username: string;
      operationId: string;
      submittedVia: string;
    },
  ): Promise<BrowserSessionResponseDto> {
    const startTime = Date.now();
    const sessionId = this.generateSessionId();

    try {
      this.logger.log(`Creating browser session: ${sessionId}`, {
        sessionId,
        userId: context.userId,
        operationId: context.operationId,
        config: sessionRequest,
      });

      // Check session limits
      if (this.sessions.size >= this.maxSessions) {
        throw new Error(
          `Maximum number of sessions (${this.maxSessions}) reached. Please close existing sessions.`
        );
      }

      // Create temporary directory for session
      const tempDirectory = await this.createTempDirectory(sessionId);

      // Prepare browser configuration
      const browserConfig = this.prepareBrowserConfig(sessionRequest, tempDirectory);

      // Start Python browser-use process
      const pythonProcess = await this.startPythonProcess(sessionId, browserConfig);
      const communicationPort = await this.establishCommunication(pythonProcess);

      // Create session object
      const session: BrowserSession = {
        sessionId,
        status: BrowserSessionStatus.ACTIVE,
        processId: pythonProcess.pid,
        process: pythonProcess,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        configuration: {
          headless: sessionRequest.headless ?? true,
          viewport: sessionRequest.viewport,
          userAgent: sessionRequest.userAgent,
          timeout: sessionRequest.timeout ?? 300000,
        },
        metadata: {
          ...sessionRequest.metadata,
          createdBy: context.username,
          operationId: context.operationId,
        },
        userId: context.userId,
        pythonProcess,
        communicationPort,
        tempDirectory,
      };

      // Store session
      this.sessions.set(sessionId, session);

      // Initialize browser session in Python
      await this.executePythonCommand(sessionId, 'initialize_session', browserConfig);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Browser session created successfully: ${sessionId} (${processingTime}ms)`,
        {
          sessionId,
          processId: pythonProcess.pid,
          processingTime,
          userId: context.userId,
        }
      );

      return {
        sessionId,
        createdAt: session.createdAt.toISOString(),
        status: session.status,
        processId: session.processId!,
        configuration: session.configuration,
        metadata: session.metadata,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to create browser session: ${errorMessage} (${processingTime}ms)`,
        {
          sessionId,
          processingTime,
          error: errorMessage,
          userId: context.userId,
          operationId: context.operationId,
        }
      );

      // Clean up any partial session creation
      await this.cleanupFailedSession(sessionId);

      throw new Error(`Failed to create browser session: ${errorMessage}`);
    }
  }

  /**
   * Get list of active browser sessions for a user
   *
   * @param userId User identifier to filter sessions
   * @returns Promise<BrowserSessionListResponseDto> List of user's active sessions
   */
  async listSessions(userId: string): Promise<BrowserSessionListResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Listing browser sessions for user: ${userId}`);

      const userSessions = Array.from(this.sessions.values())
        .filter(session => session.userId === userId)
        .map(session => this.mapSessionToInfo(session));

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Listed ${userSessions.length} sessions for user: ${userId} (${processingTime}ms)`,
        {
          userId,
          sessionCount: userSessions.length,
          processingTime,
        }
      );

      return {
        sessions: userSessions,
        totalCount: userSessions.length,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to list sessions for user: ${errorMessage} (${processingTime}ms)`,
        {
          userId,
          processingTime,
          error: errorMessage,
        }
      );

      throw new Error(`Failed to list browser sessions: ${errorMessage}`);
    }
  }

  /**
   * Close a browser automation session
   *
   * @param sessionId Session identifier to close
   * @param userId User identifier for permission checking
   * @returns Promise<boolean> True if session was closed successfully
   */
  async closeSession(sessionId: string, userId: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      this.logger.log(`Closing browser session: ${sessionId}`, {
        sessionId,
        userId,
      });

      const session = this.sessions.get(sessionId);
      if (!session) {
        this.logger.warn(`Session not found: ${sessionId}`, { sessionId, userId });
        return false;
      }

      // Check user permission (allow 'system' for cleanup)
      if (userId !== 'system' && session.userId !== userId) {
        this.logger.warn(`Unauthorized session close attempt: ${sessionId}`, {
          sessionId,
          requestedBy: userId,
          sessionOwner: session.userId,
        });
        return false;
      }

      // Update session status
      session.status = BrowserSessionStatus.CLOSED;

      // Close Python process gracefully
      if (session.pythonProcess) {
        try {
          await this.executePythonCommand(sessionId, 'close_session', {}, 5000);
        } catch (error) {
          this.logger.warn(`Error during graceful session close: ${sessionId}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Force kill if still running
        if (!session.pythonProcess.killed) {
          session.pythonProcess.kill('SIGTERM');
          setTimeout(() => {
            if (!session.pythonProcess!.killed) {
              session.pythonProcess!.kill('SIGKILL');
            }
          }, 5000);
        }
      }

      // Clean up temporary directory
      if (session.tempDirectory) {
        try {
          await fs.rmdir(session.tempDirectory, { recursive: true });
        } catch (error) {
          this.logger.warn(`Failed to clean up temp directory: ${session.tempDirectory}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Remove session from memory
      this.sessions.delete(sessionId);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Browser session closed successfully: ${sessionId} (${processingTime}ms)`,
        {
          sessionId,
          processingTime,
          userId,
        }
      );

      return true;
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to close browser session: ${errorMessage} (${processingTime}ms)`,
        {
          sessionId,
          processingTime,
          error: errorMessage,
          userId,
        }
      );

      return false;
    }
  }

  /**
   * Capture screenshot of a browser session
   *
   * @param sessionId Session identifier
   * @param userId User identifier for permission checking
   * @returns Promise<BrowserScreenshotResponseDto> Screenshot data and metadata
   */
  async captureScreenshot(
    sessionId: string,
    userId: string,
  ): Promise<BrowserScreenshotResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Capturing screenshot for session: ${sessionId}`, {
        sessionId,
        userId,
      });

      const session = this.getValidatedSession(sessionId, userId);

      // Execute screenshot command in Python
      const result = await this.executePythonCommand(sessionId, 'capture_screenshot', {
        format: 'png',
        quality: 90,
      });

      if (!result.success || !result.data?.image) {
        throw new Error(result.error || 'Failed to capture screenshot');
      }

      // Update session activity
      session.lastActivityAt = new Date();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Screenshot captured successfully for session: ${sessionId} (${processingTime}ms)`,
        {
          sessionId,
          imageSize: result.data.image.length,
          processingTime,
          userId,
        }
      );

      return {
        image: result.data.image,
        success: true,
        format: result.data.format || 'png',
        width: result.data.width || 0,
        height: result.data.height || 0,
        fileSizeBytes: result.data.fileSizeBytes || result.data.image.length,
        capturedAt: new Date().toISOString(),
        pageUrl: result.data.pageUrl,
        pageTitle: result.data.pageTitle,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Failed to capture screenshot: ${errorMessage} (${processingTime}ms)`,
        {
          sessionId,
          processingTime,
          error: errorMessage,
          userId,
        }
      );

      throw new Error(`Failed to capture screenshot: ${errorMessage}`);
    }
  }

  /**
   * Execute browser navigation command
   *
   * @param sessionId Session identifier
   * @param navigationRequest Navigation parameters
   * @param userId User identifier for permission checking
   * @returns Promise<BrowserNavigationResponseDto> Navigation results
   */
  async navigateToUrl(
    sessionId: string,
    navigationRequest: BrowserNavigationDto,
    userId: string,
  ): Promise<BrowserNavigationResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Navigating session ${sessionId} to: ${navigationRequest.url}`, {
        sessionId,
        url: navigationRequest.url,
        userId,
      });

      const session = this.getValidatedSession(sessionId, userId);

      // Execute navigation command in Python
      const result = await this.executePythonCommand(
        sessionId,
        'navigate',
        navigationRequest,
        navigationRequest.timeout
      );

      if (!result.success) {
        throw new Error(result.error || 'Navigation failed');
      }

      // Update session state
      session.lastActivityAt = new Date();
      session.currentUrl = result.data?.finalUrl || navigationRequest.url;
      session.currentTitle = result.data?.title;

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Navigation completed for session: ${sessionId} (${processingTime}ms)`,
        {
          sessionId,
          finalUrl: result.data?.finalUrl,
          statusCode: result.data?.statusCode,
          processingTime,
          userId,
        }
      );

      return {
        finalUrl: result.data?.finalUrl || navigationRequest.url,
        title: result.data?.title || '',
        success: true,
        loadTimeMs: result.executionTimeMs || processingTime,
        statusCode: result.data?.statusCode || 200,
        completedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Navigation failed for session: ${errorMessage} (${processingTime}ms)`,
        {
          sessionId,
          url: navigationRequest.url,
          processingTime,
          error: errorMessage,
          userId,
        }
      );

      return {
        finalUrl: navigationRequest.url,
        title: '',
        success: false,
        loadTimeMs: processingTime,
        statusCode: 0,
        errorMessage,
        completedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute browser automation action
   *
   * @param sessionId Session identifier
   * @param actionRequest Action parameters
   * @param userId User identifier for permission checking
   * @returns Promise<BrowserActionResponseDto> Action execution results
   */
  async executeAction(
    sessionId: string,
    actionRequest: BrowserActionDto,
    userId: string,
  ): Promise<BrowserActionResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing action ${actionRequest.action} for session: ${sessionId}`, {
        sessionId,
        action: actionRequest.action,
        userId,
      });

      const session = this.getValidatedSession(sessionId, userId);

      // Execute action command in Python
      const result = await this.executePythonCommand(
        sessionId,
        'execute_action',
        actionRequest,
        actionRequest.timeout
      );

      if (!result.success) {
        throw new Error(result.error || 'Action execution failed');
      }

      // Update session activity
      session.lastActivityAt = new Date();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Action completed for session: ${sessionId} (${processingTime}ms)`,
        {
          sessionId,
          action: actionRequest.action,
          processingTime,
          userId,
        }
      );

      return {
        success: true,
        action: actionRequest.action,
        executionTimeMs: result.executionTimeMs || processingTime,
        result: result.data,
        elementInfo: result.metadata?.elementInfo,
        completedAt: new Date().toISOString(),
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Action execution failed: ${errorMessage} (${processingTime}ms)`,
        {
          sessionId,
          action: actionRequest.action,
          processingTime,
          error: errorMessage,
          userId,
        }
      );

      return {
        success: false,
        action: actionRequest.action,
        executionTimeMs: processingTime,
        errorMessage,
        completedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Execute data extraction from browser session
   *
   * @param sessionId Session identifier
   * @param extractionRequest Data extraction parameters
   * @param userId User identifier for permission checking
   * @returns Promise<BrowserDataExtractionResponseDto> Extraction results
   */
  async extractData(
    sessionId: string,
    extractionRequest: BrowserDataExtractionDto,
    userId: string,
  ): Promise<BrowserDataExtractionResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(
        `Extracting data (${extractionRequest.extractionType}) for session: ${sessionId}`,
        {
          sessionId,
          extractionType: extractionRequest.extractionType,
          userId,
        }
      );

      const session = this.getValidatedSession(sessionId, userId);

      // Execute data extraction command in Python
      const result = await this.executePythonCommand(
        sessionId,
        'extract_data',
        extractionRequest,
        extractionRequest.timeout
      );

      if (!result.success) {
        throw new Error(result.error || 'Data extraction failed');
      }

      // Update session activity
      session.lastActivityAt = new Date();

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Data extraction completed for session: ${sessionId} (${processingTime}ms)`,
        {
          sessionId,
          extractionType: extractionRequest.extractionType,
          elementCount: result.data?.elementCount || 0,
          processingTime,
          userId,
        }
      );

      return {
        success: true,
        extractionType: extractionRequest.extractionType,
        elementCount: result.data?.elementCount || 0,
        data: result.data?.extractedData,
        elements: result.data?.elements,
        executionTimeMs: result.executionTimeMs || processingTime,
        completedAt: new Date().toISOString(),
        pageUrl: result.metadata?.pageUrl,
        pageTitle: result.metadata?.pageTitle,
      };
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `Data extraction failed: ${errorMessage} (${processingTime}ms)`,
        {
          sessionId,
          extractionType: extractionRequest.extractionType,
          processingTime,
          error: errorMessage,
          userId,
        }
      );

      return {
        success: false,
        extractionType: extractionRequest.extractionType,
        elementCount: 0,
        data: null,
        executionTimeMs: processingTime,
        errorMessage,
        completedAt: new Date().toISOString(),
      };
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Generate unique session identifier
   */
  private generateSessionId(): string {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    return `session_${timestamp}_${randomSuffix}`;
  }

  /**
   * Detect Python executable path
   */
  private detectPythonPath(): string {
    // Try common Python paths
    const commonPaths = [
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      '/opt/homebrew/bin/python3',
      'python3',
      'python',
    ];

    for (const pythonPath of commonPaths) {
      try {
        execSync(`${pythonPath} --version`, { stdio: 'ignore' });
        return pythonPath;
      } catch {
        continue;
      }
    }

    this.logger.warn('Python not found in common paths, using default');
    return 'python3';
  }

  /**
   * Detect browser-use installation path
   */
  private detectBrowserUsePath(): string {
    // Path to browser-use Python package
    return path.join(__dirname, '../../../browser-use');
  }

  /**
   * Create temporary directory for session
   */
  private async createTempDirectory(sessionId: string): Promise<string> {
    const tempDir = path.join('/tmp', `bytebot-browser-${sessionId}`);
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  /**
   * Prepare browser configuration for Python process
   */
  private prepareBrowserConfig(
    sessionRequest: BrowserSessionCreateDto,
    tempDirectory: string,
  ): Record<string, any> {
    return {
      headless: sessionRequest.headless ?? true,
      viewport: sessionRequest.viewport || { width: 1920, height: 1080 },
      userAgent: sessionRequest.userAgent,
      timeout: sessionRequest.timeout ?? 300000,
      enableExtensions: sessionRequest.enableExtensions ?? false,
      extraArgs: sessionRequest.extraArgs || [],
      proxy: sessionRequest.proxy,
      tempDirectory,
    };
  }

  /**
   * Start Python subprocess for browser-use
   */
  private async startPythonProcess(
    sessionId: string,
    config: Record<string, any>,
  ): Promise<ChildProcess> {
    const pythonScript = path.join(this.browserUsePath, 'bytebot_bridge.py');
    const configFile = path.join(config.tempDirectory, 'config.json');

    // Write configuration to file
    await fs.writeFile(configFile, JSON.stringify(config, null, 2));

    // Start Python process
    const pythonProcess = spawn(this.pythonExecutablePath, [pythonScript, configFile], {
      cwd: this.browserUsePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        BROWSER_USE_SESSION_ID: sessionId,
        BROWSER_USE_SETUP_LOGGING: 'false',
      },
    });

    // Set up error handling
    pythonProcess.on('error', (error) => {
      this.logger.error(`Python process error for session ${sessionId}:`, error);
    });

    pythonProcess.stderr?.on('data', (data) => {
      this.logger.debug(`Python stderr for session ${sessionId}: ${data.toString()}`);
    });

    return pythonProcess;
  }

  /**
   * Establish communication with Python process
   */
  private async establishCommunication(pythonProcess: ChildProcess): Promise<number> {
    // For now, use stdio communication
    // In a production environment, you might want to use TCP sockets or named pipes
    return 0; // Placeholder port
  }

  /**
   * Execute command in Python subprocess
   */
  private async executePythonCommand(
    sessionId: string,
    action: string,
    parameters: Record<string, any>,
    timeout: number = 30000,
  ): Promise<PythonResponse> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.pythonProcess) {
      throw new Error(`Invalid session: ${sessionId}`);
    }

    const commandId = crypto.randomUUID();
    const command: PythonCommand = {
      id: commandId,
      action,
      sessionId,
      parameters,
      timeout,
    };

    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.activeCommands.delete(commandId);
        reject(new Error(`Command timeout: ${action} (${timeout}ms)`));
      }, timeout);

      this.activeCommands.set(commandId, timeoutHandle);

      // Send command to Python process
      const commandJson = JSON.stringify(command) + '\n';
      session.pythonProcess!.stdin?.write(commandJson);

      // Set up response handler
      const responseHandler = (data: Buffer) => {
        const responses = data.toString().split('\n').filter(line => line.trim());

        for (const responseStr of responses) {
          try {
            const response: PythonResponse = JSON.parse(responseStr);
            if (response.id === commandId) {
              clearTimeout(timeoutHandle);
              this.activeCommands.delete(commandId);
              session.pythonProcess!.stdout?.off('data', responseHandler);
              resolve(response);
              return;
            }
          } catch (error) {
            this.logger.debug(`Invalid JSON response: ${responseStr}`);
          }
        }
      };

      session.pythonProcess!.stdout?.on('data', responseHandler);
    });
  }

  /**
   * Get validated session with permission checking
   */
  private getValidatedSession(sessionId: string, userId: string): BrowserSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (session.userId !== userId) {
      throw new Error(`Unauthorized access to session: ${sessionId}`);
    }

    if (session.status !== BrowserSessionStatus.ACTIVE) {
      throw new Error(`Session not active: ${sessionId} (status: ${session.status})`);
    }

    return session;
  }

  /**
   * Map session to info DTO
   */
  private mapSessionToInfo(session: BrowserSession): BrowserSessionInfoDto {
    return {
      sessionId: session.sessionId,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      currentUrl: session.currentUrl,
      currentTitle: session.currentTitle,
      tabCount: 1, // Simplified for now
      memoryUsageMB: 0, // Would need to implement memory monitoring
      cpuUsagePercent: 0, // Would need to implement CPU monitoring
    };
  }

  /**
   * Clean up failed session creation
   */
  private async cleanupFailedSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (session) {
        if (session.pythonProcess && !session.pythonProcess.killed) {
          session.pythonProcess.kill('SIGTERM');
        }
        if (session.tempDirectory) {
          await fs.rmdir(session.tempDirectory, { recursive: true });
        }
        this.sessions.delete(sessionId);
      }
    } catch (error) {
      this.logger.warn(`Error during failed session cleanup: ${sessionId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Clean up inactive sessions periodically
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivityAt.getTime();

      if (inactiveTime > inactiveThreshold) {
        this.logger.log(`Cleaning up inactive session: ${sessionId}`, {
          sessionId,
          inactiveTimeMs: inactiveTime,
          lastActivity: session.lastActivityAt.toISOString(),
        });

        await this.closeSession(sessionId, 'system');
      }
    }
  }
}

// Helper function for synchronous exec (used in detectPythonPath)
function execSync(command: string, options?: any): Buffer {
  const { execSync: nodeExecSync } = require('child_process');
  return nodeExecSync(command, options);
}