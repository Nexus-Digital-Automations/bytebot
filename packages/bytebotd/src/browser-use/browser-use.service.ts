import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcess as _ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateBrowserTaskDto,
  BrowserTaskResultDto,
  BrowserTaskStatus,
  BrowserActionType,
  BrowserActionDto,
} from './dto/browser-task.dto';
import { CreateAsyncJobDto, AsyncJobResultDto } from './dto/async-job.dto';
import { BrowserSessionService } from './browser-session.service';
import { BrowserTaskService } from './browser-task.service';
import { BrowserAsyncJobService } from './browser-async-job.service';
import { BrowserSessionDto } from './dto/browser-session.dto';

/**
 * Browser-Use Service - Core Python Integration Layer
 *
 * Provides high-level interface for browser automation by integrating with
 * the browser-use Python library. Handles task execution, session management,
 * and data extraction following 100% local-only architecture.
 *
 * Key Responsibilities:
 * - Python process management for browser-use library
 * - Task execution orchestration
 * - Result processing and data extraction
 * - Error handling and recovery
 * - Local file system management
 * - Security and access control
 */
@Injectable()
export class BrowserUseService {
  private readonly logger = new Logger(BrowserUseService.name);
  private readonly browserUsePath: string;
  private readonly workingDirectory: string;
  private readonly tempDirectory: string;
  private readonly pythonExecutable: string = 'python3';

  constructor(
    private readonly sessionService: BrowserSessionService,
    private readonly taskService: BrowserTaskService,
    private readonly asyncJobService: BrowserAsyncJobService,
  ) {
    // Local-only paths - no cloud dependencies
    this.browserUsePath =
      process.env.BROWSER_USE_PATH ||
      '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/browser-use';
    this.workingDirectory =
      process.env.BROWSER_USE_WORK_DIR ||
      path.join(process.cwd(), 'browser-use-workspace');
    this.tempDirectory = path.join(this.workingDirectory, 'temp');

    this.initializeWorkspace().catch((err) => {
      this.logger.error('Failed to initialize browser-use workspace', err);
    });
  }

  /**
   * Execute a browser automation task
   */
  async executeBrowserTask(
    taskDto: CreateBrowserTaskDto,
  ): Promise<BrowserTaskResultDto> {
    const taskId = uuidv4();
    const startTime = Date.now();

    this.logger.log(`Starting browser task execution: ${taskId}`, {
      taskId,
      name: taskDto.name,
      actionsCount: taskDto.actions.length,
      priority: taskDto.priority,
    });

    try {
      // Create task tracking
      const task = await this.taskService.createTask({
        taskId,
        ...taskDto,
        status: BrowserTaskStatus.RUNNING,
        startedAt: new Date(),
        actionsCompleted: 0,
        totalActions: taskDto.actions.length,
        logs: [],
      });

      // Create or reuse browser session
      const session = await this.getOrCreateSession(taskDto.sessionConfig);

      // Execute task actions sequentially
      const _result = await this.executeTaskActions(task, taskDto, session);

      // Update task status
      await this.taskService.updateTaskStatus(taskId, {
        status: _result.status,
        completedAt: new Date(),
        executionTimeMs: Date.now() - startTime,
        extractedData: _result.extractedData,
        screenshots: _result.screenshots,
        logs: _result.logs,
      });

      this.logger.log(`Browser task completed: ${taskId}`, {
        taskId,
        status: _result.status,
        executionTimeMs: _result.executionTimeMs,
        actionsCompleted: _result.actionsCompleted,
      });

      return _result;
    } catch (_err) {
      const errorMessage = _err instanceof Error ? _err.message : String(_err);
      const executionTimeMs = Date.now() - startTime;

      this.logger.error(`Browser task failed: ${taskId}`, {
        taskId,
        error: errorMessage,
        executionTimeMs,
      });

      // Update task with error status
      await this.taskService.updateTaskStatus(taskId, {
        status: BrowserTaskStatus.FAILED,
        completedAt: new Date(),
        executionTimeMs,
        errorMessage,
        errorDetails: {
          type: _err instanceof Error ? _err.constructor.name : 'UnknownError',
          stack: _err instanceof Error ? _err.stack : undefined,
          timestamp: new Date(),
        },
      });

      return {
        taskId,
        status: BrowserTaskStatus.FAILED,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        executionTimeMs,
        actionsCompleted: 0,
        totalActions: taskDto.actions.length,
        errorMessage,
        errorDetails: {
          type: _err instanceof Error ? _err.constructor.name : 'UnknownError',
          message: errorMessage,
          timestamp: new Date(),
        },
        logs: [
          {
            timestamp: new Date(),
            level: 'error',
            message: `Task execution failed: ${errorMessage}`,
            metadata: { taskId, error: errorMessage },
          },
        ],
        metadata: taskDto.metadata,
      };
    }
  }

  /**
   * Take screenshot of current browser state
   */
  async captureScreenshot(
    sessionId: string,
    config?: {
      fullPage?: boolean;
      elementSelector?: string;
      format?: 'png' | 'jpeg';
      quality?: number;
    },
  ): Promise<{
    screenshot: string; // Base64 encoded
    timestamp: Date;
    metadata: {
      format: string;
      size: number;
      dimensions: { width: number; height: number };
    };
  }> {
    this.logger.log(`Capturing screenshot for session: ${sessionId}`);

    try {
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Generate unique filename
      const timestamp = new Date();
      const filename = `screenshot_${sessionId}_${Date.now()}.${config?.format || 'png'}`;
      const filepath = path.join(this.tempDirectory, filename);

      // Execute Python script for screenshot capture
      const screenshotScript = this.generateScreenshotScript(
        sessionId,
        filepath,
        config,
      );
      const result = await this.executePythonScript(screenshotScript);

      if (!result.success) {
        throw new Error(`Screenshot capture failed: ${result.error}`);
      }

      // Read screenshot file and convert to base64
      const screenshotBuffer = await fs.readFile(filepath);
      const screenshotBase64 = screenshotBuffer.toString('base64');

      // Clean up temporary file
      await fs.unlink(filepath).catch((err) => {
        this.logger.warn(`Failed to cleanup screenshot file: ${filepath}`, err);
      });

      return {
        screenshot: screenshotBase64,
        timestamp,
        metadata: {
          format: config?.format || 'png',
          size: screenshotBuffer.length,
          dimensions: { width: 1920, height: 1080 }, // TODO: Extract actual dimensions
        },
      };
    } catch (_err) {
      this.logger.error(
        `Screenshot capture failed for session: ${sessionId}`,
        _err,
      );
      throw _err;
    }
  }

  /**
   * Extract DOM data from current page
   */
  async extractDomData(
    sessionId: string,
    config?: {
      selector?: string;
      includeAttributes?: boolean;
      includeText?: boolean;
      maxDepth?: number;
    },
  ): Promise<{
    data: Record<string, any>;
    timestamp: Date;
    metadata: {
      elementsExtracted: number;
      selectors: string[];
      extractionTime: number;
    };
  }> {
    this.logger.log(`Extracting DOM data for session: ${sessionId}`);

    try {
      const session = await this.sessionService.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const startTime = Date.now();

      // Generate DOM extraction script
      const extractionScript = this.generateDomExtractionScript(
        sessionId,
        config,
      );
      const result = await this.executePythonScript(extractionScript);

      if (!result.success) {
        throw new Error(`DOM extraction failed: ${result.error}`);
      }

      const extractionTime = Date.now() - startTime;
      const extractedData = JSON.parse(result.output);

      return {
        data: extractedData.data,
        timestamp: new Date(),
        metadata: {
          elementsExtracted: extractedData.elementsCount || 0,
          selectors: extractedData.selectors || [],
          extractionTime,
        },
      };
    } catch (_err) {
      this.logger.error(
        `DOM extraction failed for session: ${sessionId}`,
        _err,
      );
      throw _err;
    }
  }

  /**
   * Create async job for long-running browser automation tasks
   */
  async createAsyncJob(_dto: CreateAsyncJobDto): Promise<AsyncJobResultDto> {
    this.logger.log(`Creating async job: ${_dto.name}`, {
      jobName: _dto.name,
      jobType: _dto.jobType,
      priority: _dto.priority,
    });

    return await this.asyncJobService.createAsyncJob(_dto);
  }

  /**
   * Get async job status and results
   */
  async getAsyncJob(jobId: string): Promise<AsyncJobResultDto | null> {
    this.logger.log(`Getting async job: ${jobId}`);

    return await this.asyncJobService.getAsyncJob(jobId);
  }

  /**
   * Cancel async job
   */
  async cancelAsyncJob(jobId: string): Promise<void> {
    this.logger.log(`Cancelling async job: ${jobId}`);

    return await this.asyncJobService.cancelAsyncJob(jobId);
  }

  /**
   * Take screenshot (wrapper for captureScreenshot with controller-expected interface)
   */
  async takeScreenshot(
    sessionId: string,
    options: {
      fullPage?: boolean;
      quality?: number;
    } = {},
  ): Promise<{
    screenshot: string;
    timestamp: string;
    metadata: {
      format: string;
      size: number;
      dimensions: { width: number; height: number };
    };
  }> {
    this.logger.log(`Taking screenshot for session: ${sessionId}`, {
      sessionId,
      fullPage: options.fullPage,
      quality: options.quality,
    });

    try {
      const _result = await this.captureScreenshot(sessionId, {
        fullPage: options.fullPage,
        quality: options.quality,
        format: 'png',
      });

      // Update session activity
      await this.sessionService.updateActivity(sessionId, {
        screenshot: true,
      });

      return {
        screenshot: _result.screenshot,
        timestamp: _result.timestamp.toISOString(),
        metadata: _result.metadata,
      };
    } catch (_err) {
      this.logger.error(`Screenshot failed for session: ${sessionId}`, _err);
      throw _err;
    }
  }

  /**
   * Extract page data (wrapper for extractDomData with controller-expected interface)
   */
  async extractPageData(
    sessionId: string,
    config: {
      selectors: Record<string, string>;
      waitForSelector?: string;
      timeout?: number;
    },
  ): Promise<Record<string, any>> {
    this.logger.log(`Extracting page data for session: ${sessionId}`, {
      sessionId,
      selectorsCount: Object.keys(config.selectors).length,
      waitForSelector: config.waitForSelector,
      timeout: config.timeout,
    });

    try {
      const extractedData: Record<string, any> = {};

      // Extract data for each selector
      for (const [key, selector] of Object.entries(config.selectors)) {
        try {
          const _result = await this.extractDomData(sessionId, {
            selector,
            includeText: true,
            includeAttributes: true,
          });

          extractedData[key] = _result.data;
        } catch (_err) {
          this.logger.warn(
            `Failed to extract data for selector ${key}: ${selector}`,
            _err,
          );
          extractedData[key] = null;
        }
      }

      return extractedData;
    } catch (_err) {
      this.logger.error(
        `Page data extraction failed for session: ${sessionId}`,
        _err,
      );
      throw _err;
    }
  }

  /**
   * Get status of all active browser sessions
   */
  async getBrowserStatus(): Promise<{
    activeSessions: number;
    totalTasks: number;
    runningTasks: number;
    completedTasks: number;
    failedTasks: number;
    systemLoad: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
    };
    uptime: number;
  }> {
    const sessions = await this.sessionService.getAllSessions();
    const tasks = await this.taskService.getAllTasks();

    const runningTasks = tasks.filter(
      (t) => t.status === BrowserTaskStatus.RUNNING,
    ).length;
    const completedTasks = tasks.filter(
      (t) => t.status === BrowserTaskStatus.COMPLETED,
    ).length;
    const failedTasks = tasks.filter(
      (t) => t.status === BrowserTaskStatus.FAILED,
    ).length;

    return {
      activeSessions: sessions.filter((s) => s.status === 'active').length,
      totalTasks: tasks.length,
      runningTasks,
      completedTasks,
      failedTasks,
      systemLoad: await this.getSystemLoad(),
      uptime: process.uptime(),
    };
  }

  /**
   * Execute task actions sequentially
   */
  private async executeTaskActions(
    task: BrowserTaskResultDto,
    taskDto: CreateBrowserTaskDto,
    session: BrowserSessionDto,
  ): Promise<BrowserTaskResultDto> {
    const logs: Array<{
      timestamp: Date;
      level: string;
      message: string;
      actionIndex?: number;
      screenshot?: string;
      metadata?: Record<string, any>;
    }> = [];
    const screenshots: string[] = [];
    let extractedData: Record<string, any> = {};
    let actionsCompleted = 0;

    try {
      for (let i = 0; i < taskDto.actions.length; i++) {
        const action = taskDto.actions[i];
        if (!action) continue;

        this.logger.log(`Executing action ${i + 1}/${taskDto.actions.length}`, {
          taskId: task.taskId,
          actionType: action.type,
          actionIndex: i,
        });

        const actionResult = await this.executeAction(
          session.sessionId,
          action,
          i,
        );

        actionsCompleted++;

        // Log action completion
        logs.push({
          timestamp: new Date(),
          level: 'info',
          message: `Action completed: ${action.type}`,
          actionIndex: i,
          screenshot: actionResult.screenshot,
          metadata: {
            actionType: action.type,
            executionTime: actionResult.executionTime,
            success: actionResult.success,
          },
        });

        // Capture screenshot after each action if enabled
        if (task.metadata?.enableLogging && actionResult.screenshot) {
          screenshots.push(actionResult.screenshot);
        }

        // Merge extracted data
        if (actionResult.extractedData) {
          extractedData = { ...extractedData, ...actionResult.extractedData };
        }

        // Update task progress
        await this.taskService.updateTaskProgress(task.taskId, {
          actionsCompleted,
          currentStep: `Completed: ${action.type}`,
          progress: Math.round(
            (actionsCompleted / taskDto.actions.length) * 100,
          ),
        });

        // Break on error if not continuing
        if (!actionResult.success && !task.metadata?.continueOnError) {
          throw new Error(`Action failed: ${actionResult.error}`);
        }
      }

      return {
        taskId: task.taskId,
        status: BrowserTaskStatus.COMPLETED,
        startedAt: task.startedAt,
        completedAt: new Date(),
        executionTimeMs: Date.now() - task.startedAt.getTime(),
        actionsCompleted,
        totalActions: taskDto.actions.length,
        extractedData,
        screenshots,
        logs,
        metadata: task.metadata,
      };
    } catch (_err) {
      const errorMessage = _err instanceof Error ? _err.message : String(_err);

      logs.push({
        timestamp: new Date(),
        level: '_err',
        message: `Task execution failed: ${errorMessage}`,
        actionIndex: actionsCompleted,
        metadata: { error: errorMessage },
      });

      throw _err;
    }
  }

  /**
   * Execute individual browser action
   */
  private async executeAction(
    sessionId: string,
    action: BrowserActionDto,
    _actionIndex: number,
  ): Promise<{
    success: boolean;
    executionTime: number;
    screenshot?: string;
    extractedData?: Record<string, any>;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Generate action script based on type
      let script = '';

      switch (action.type) {
        case BrowserActionType.NAVIGATE:
          script = this.generateNavigationScript(sessionId, action.url || '');
          break;
        case BrowserActionType.CLICK:
          script = this.generateClickScript(sessionId, action.selector || '');
          break;
        case BrowserActionType.TYPE:
          script = this.generateTypeScript(
            sessionId,
            action.selector || '',
            action.text || '',
          );
          break;
        case BrowserActionType.SCREENSHOT:
          script = this.generateScreenshotScript(sessionId);
          break;
        case BrowserActionType.EXTRACT_DATA:
          script = this.generateExtractionScript(sessionId, action.selector);
          break;
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }

      // Execute the action
      const result = await this.executePythonScript(script);

      if (!result.success) {
        return {
          success: false,
          executionTime: Date.now() - startTime,
          error: result.error,
        };
      }

      // Parse result based on action type
      let extractedData: Record<string, any> | undefined;
      let screenshot: string | undefined;

      if (action.type === BrowserActionType.EXTRACT_DATA) {
        try {
          extractedData = JSON.parse(result.output);
        } catch (parseErr) {
          this.logger.warn('Failed to parse extracted data', parseErr);
        }
      }

      if (action.type === BrowserActionType.SCREENSHOT) {
        screenshot = result.output; // Base64 screenshot
      }

      return {
        success: true,
        executionTime: Date.now() - startTime,
        screenshot,
        extractedData,
      };
    } catch (_err) {
      return {
        success: false,
        executionTime: Date.now() - startTime,
        error: _err instanceof Error ? _err.message : String(_err),
      };
    }
  }

  /**
   * Get or create browser session
   */
  private async getOrCreateSession(
    config?: unknown,
  ): Promise<BrowserSessionDto> {
    // Try to reuse existing idle session
    const existingSessions = await this.sessionService.getAllSessions();
    const idleSession = existingSessions.find((s) => s.status === 'idle');

    if (idleSession && !config) {
      return idleSession;
    }

    // Create new session
    return await this.sessionService.createSession({
      name: `Auto-created session ${Date.now()}`,
      ...(config || {}),
    });
  }

  /**
   * Initialize workspace directories
   */
  private async initializeWorkspace(): Promise<void> {
    try {
      await fs.mkdir(this.workingDirectory, { recursive: true });
      await fs.mkdir(this.tempDirectory, { recursive: true });

      this.logger.log('Browser-use workspace initialized', {
        workingDirectory: this.workingDirectory,
        tempDirectory: this.tempDirectory,
        browserUsePath: this.browserUsePath,
      });
    } catch (_err) {
      throw new Error(
        `Failed to initialize workspace: ${_err instanceof Error ? _err.message : String(_err)}`,
      );
    }
  }

  /**
   * Execute Python script with browser-use library
   */
  private async executePythonScript(script: string): Promise<{
    success: boolean;
    output: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const scriptFile = path.join(
        this.tempDirectory,
        `script_${Date.now()}_${Math.random().toString(36).substring(7)}.py`,
      );

      // Write script to temporary file
      fs.writeFile(scriptFile, script)
        .then(() => {
          // Execute Python script
          const childProcess = spawn(this.pythonExecutable, [scriptFile], {
            cwd: this.browserUsePath,
            env: {
              ...process.env,
              PYTHONPATH: this.browserUsePath,
            },
          });

          let stdout = '';
          let stderr = '';

          childProcess.stdout.on('data', (data) => {
            stdout += data.toString();
          });

          childProcess.stderr.on('data', (data) => {
            stderr += data.toString();
          });

          childProcess.on('close', async (code) => {
            // Cleanup script file
            try {
              await fs.unlink(scriptFile);
            } catch (cleanupErr) {
              this.logger.warn('Failed to cleanup script file', cleanupErr);
            }

            if (code === 0) {
              resolve({
                success: true,
                output: stdout,
              });
            } else {
              resolve({
                success: false,
                output: stdout,
                error: stderr || `Process exited with code ${code}`,
              });
            }
          });

          childProcess.on('_error', async (err) => {
            try {
              await fs.unlink(scriptFile);
            } catch (cleanupErr) {
              this.logger.warn('Failed to cleanup script file', cleanupErr);
            }

            resolve({
              success: false,
              output: '',
              error: err.message,
            });
          });
        })
        .catch((writeErr) => {
          resolve({
            success: false,
            output: '',
            error: `Failed to write script file: ${writeErr.message}`,
          });
        });
    });
  }

  /**
   * Generate Python scripts for different actions
   */
  private generateNavigationScript(sessionId: string, url: string): string {
    return `
import asyncio
from browser_use import Agent
from browser_use.browser import BrowserSession

async def main():
    try:
        # Create browser session
        session = BrowserSession()
        await session.start()
        
        # Navigate to URL
        await session.navigate(${JSON.stringify(url)})
        
        print("Navigation completed successfully")
        await session.close()
        
    except Exception as e:
        print(f"Navigation failed: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  private generateClickScript(sessionId: string, selector: string): string {
    return `
import asyncio
from browser_use import Agent
from browser_use.browser import BrowserSession

async def main():
    try:
        session = BrowserSession()
        await session.start()
        
        # Click element
        element = await session.page.query_selector(${JSON.stringify(selector)})
        if element:
            await element.click()
            print("Click completed successfully")
        else:
            raise Exception(f"Element not found: {${JSON.stringify(selector)}}")
            
        await session.close()
        
    except Exception as e:
        print(f"Click failed: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  private generateTypeScript(
    sessionId: string,
    selector: string,
    text: string,
  ): string {
    return `
import asyncio
from browser_use import Agent
from browser_use.browser import BrowserSession

async def main():
    try:
        session = BrowserSession()
        await session.start()
        
        # Type text into element
        element = await session.page.query_selector(${JSON.stringify(selector)})
        if element:
            await element.fill(${JSON.stringify(text)})
            print("Type completed successfully")
        else:
            raise Exception(f"Element not found: {${JSON.stringify(selector)}}")
            
        await session.close()
        
    except Exception as e:
        print(f"Type failed: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  private generateScreenshotScript(
    sessionId: string,
    filepath?: string,
    config?: unknown,
  ): string {
    return `
import asyncio
from browser_use.browser import BrowserSession

async def main():
    try:
        session = BrowserSession()
        await session.start()
        
        # Capture screenshot
        screenshot = await session.page.screenshot(
            path=${filepath ? JSON.stringify(filepath) : 'None'},
            full_page=${(config as any)?.fullPage || false},
            quality=${(config as any)?.quality || 85},
            type=${JSON.stringify((config as any)?.format || 'png')}
        )
        
        if not ${filepath ? 'True' : 'False'}:
            # Return base64 if no file path
            import base64
            print(base64.b64encode(screenshot).decode())
        else:
            print("Screenshot saved successfully")
            
        await session.close()
        
    except Exception as e:
        print(f"Screenshot failed: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  private generateExtractionScript(
    sessionId: string,
    selector?: string,
  ): string {
    return `
import asyncio
import json
from browser_use.browser import BrowserSession

async def main():
    try:
        session = BrowserSession()
        await session.start()
        
        # Extract data
        if ${selector ? 'True' : 'False'}:
            elements = await session.page.query_selector_all(${JSON.stringify(selector || '')})
            data = []
            for element in elements:
                text_content = await element.text_content()
                inner_html = await element.inner_html()
                data.append({
                    'text': text_content,
                    'html': inner_html
                })
        else:
            # Extract all text from page
            text_content = await session.page.text_content('body')
            data = {'pageText': text_content}
        
        result = {
            'data': data,
            'elementsCount': len(data) if isinstance(data, list) else 1,
            'selectors': [${JSON.stringify(selector || 'body')}]
        }
        
        print(json.dumps(result))
        await session.close()
        
    except Exception as e:
        print(f"Extraction failed: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  private generateDomExtractionScript(
    sessionId: string,
    config?: {
      selector?: string;
      includeAttributes?: boolean;
      includeText?: boolean;
      maxDepth?: number;
    },
  ): string {
    return this.generateExtractionScript(sessionId, config?.selector);
  }

  /**
   * Get system load information
   */
  private async getSystemLoad(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  }> {
    // Basic system load - in production, would use system monitoring
    const memUsage = process.memoryUsage();

    return {
      cpuUsage: Math.random() * 100, // Placeholder
      memoryUsage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      diskUsage: Math.random() * 100, // Placeholder
    };
  }
}
