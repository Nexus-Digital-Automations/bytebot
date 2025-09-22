/**
 * Enhanced Browser-Use Service with Python Framework Integration
 * Service Layer Implementation for Browser-Use API Endpoints
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { join } from 'path';

import {
  IBrowserTask,
  IBrowserTaskResult,
  IBrowserError,
  IPythonProcessResult,
  IPythonBrowserUseCommand,
  IServiceResponse,
  IBrowserUseServiceConfig,
} from './interfaces/browser-automation.interface';

import {
  CreateBrowserTaskDto,
  BrowserTaskResponseDto,
  BrowserInteractionDto,
  BrowserInteractionResponseDto,
  ServiceResponseDto,
} from './dto/browser-automation.dto';

@Injectable()
export class BrowserUseService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrowserUseService.name);
  private tasks: Map<string, IBrowserTask> = new Map();
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private taskQueue: IBrowserTask[] = [];
  private isProcessingQueue = false;
  private config: IBrowserUseServiceConfig;

  constructor() {
    super();
    this.initializeConfig();
    this.logger.log('Enhanced BrowserUseService initialized with Python integration');
  }

  async onModuleInit() {
    this.logger.log('BrowserUseService module initialized');
    this.startTaskProcessor();
    await this.validatePythonEnvironment();
  }

  async onModuleDestroy() {
    this.logger.log('BrowserUseService module destroying - cleaning up resources');
    await this.cleanup();
  }

  /**
   * Initialize service configuration with defaults
   */
  private initializeConfig(): void {
    this.config = {
      pythonPath: process.env.PYTHON_PATH || 'python3',
      browserUsePath: process.env.BROWSER_USE_PATH || '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/browser-use',
      maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || '5'),
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '300000'), // 5 minutes
      taskTimeout: parseInt(process.env.TASK_TIMEOUT || '60000'), // 1 minute
      retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      enableMetrics: process.env.ENABLE_METRICS === 'true',
      enableScreenshots: process.env.ENABLE_SCREENSHOTS !== 'false',
    };
  }

  /**
   * Validate Python environment and browser-use framework availability
   */
  private async validatePythonEnvironment(): Promise<void> {
    try {
      const result = await this.executePythonCommand({
        command: this.config.pythonPath,
        args: ['-c', 'import browser_use; print("Browser-use framework available")'],
        timeout: 10000,
      });

      if (!result.success) {
        throw new Error(`Python environment validation failed: ${result.stderr}`);
      }

      this.logger.log('Python environment and browser-use framework validated successfully');
    } catch (error) {
      this.logger.error('Failed to validate Python environment', error);
      throw error;
    }
  }

  /**
   * Create and queue a browser automation task
   */
  async createTask(taskDto: CreateBrowserTaskDto): Promise<BrowserTaskResponseDto> {
    const taskId = uuidv4();
    const timestamp = new Date();

    const task: IBrowserTask = {
      taskId,
      sessionId: taskDto.sessionId,
      type: taskDto.type,
      instruction: taskDto.instruction,
      params: taskDto.params || {},
      status: 'pending',
      priority: taskDto.priority || 'medium',
      createdAt: timestamp,
    };

    this.tasks.set(taskId, task);
    this.queueTask(task);

    this.logger.log(`Created browser task ${taskId} for session ${taskDto.sessionId}`);

    return {
      success: true,
      taskId,
      status: 'pending',
      metadata: {
        timestamp,
      },
    };
  }

  /**
   * Execute a browser interaction through Python browser-use framework
   */
  async executeInteraction(
    sessionId: string,
    interaction: BrowserInteractionDto
  ): Promise<BrowserInteractionResponseDto> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing ${interaction.type} interaction for session ${sessionId}`);

      const pythonScript = this.generateInteractionScript(sessionId, interaction);

      const result = await this.executePythonCommand({
        command: this.config.pythonPath,
        args: ['-c', pythonScript],
        sessionId,
        timeout: interaction.timeout || this.config.taskTimeout,
        workingDir: this.config.browserUsePath,
      });

      if (!result.success) {
        throw new Error(`Interaction failed: ${result.stderr}`);
      }

      const duration = Date.now() - startTime;
      const responseData = this.parseInteractionResult(result.stdout);

      this.logger.log(`Interaction completed in ${duration}ms`);

      return {
        success: true,
        data: responseData,
        screenshot: responseData.screenshot,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const browserError = this.createBrowserError(error, {
        sessionId,
        context: { interaction: interaction.type },
      });

      this.logger.error(`Interaction failed after ${duration}ms`, error);

      return {
        success: false,
        error: browserError,
      };
    }
  }

  /**
   * Get task status and result
   */
  async getTask(taskId: string): Promise<ServiceResponseDto<IBrowserTask>> {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: this.createBrowserError(
          new Error(`Task ${taskId} not found`),
          { context: { taskId } }
        ),
      };
    }

    return {
      success: true,
      data: task,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Cancel a pending or running task
   */
  async cancelTask(taskId: string): Promise<ServiceResponseDto<boolean>> {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: this.createBrowserError(
          new Error(`Task ${taskId} not found`),
          { context: { taskId } }
        ),
      };
    }

    if (task.status === 'running') {
      const process = this.runningProcesses.get(taskId);
      if (process) {
        process.kill('SIGTERM');
        this.runningProcesses.delete(taskId);
      }
    }

    task.status = 'cancelled';
    task.completedAt = new Date();

    this.logger.log(`Task ${taskId} cancelled`);

    return {
      success: true,
      data: true,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Get all tasks for a session with optional filtering
   */
  async getSessionTasks(
    sessionId: string,
    status?: string,
    type?: string
  ): Promise<ServiceResponseDto<IBrowserTask[]>> {
    const sessionTasks = Array.from(this.tasks.values())
      .filter(task => {
        if (task.sessionId !== sessionId) return false;
        if (status && task.status !== status) return false;
        if (type && task.type !== type) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      success: true,
      data: sessionTasks,
      metadata: {
        timestamp: new Date(),
      },
    };
  }

  /**
   * Queue task for processing based on priority
   */
  private queueTask(task: IBrowserTask): void {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const insertIndex = this.taskQueue.findIndex(
      t => priorityOrder[t.priority || 'medium'] > priorityOrder[task.priority || 'medium']
    );

    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }

    this.emit('taskQueued', task);
  }

  /**
   * Start the task processing queue
   */
  private startTaskProcessor(): void {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    const processNextTask = async () => {
      if (this.taskQueue.length === 0 || this.runningProcesses.size >= this.config.maxConcurrentSessions) {
        setTimeout(processNextTask, 100);
        return;
      }

      const task = this.taskQueue.shift();
      if (task) {
        await this.processTask(task);
      }

      setTimeout(processNextTask, 10);
    };

    processNextTask();
  }

  /**
   * Process individual task
   */
  private async processTask(task: IBrowserTask): Promise<void> {
    try {
      task.status = 'running';
      task.startedAt = new Date();
      this.tasks.set(task.taskId, task);

      this.logger.log(`Processing task ${task.taskId}: ${task.type}`);

      const pythonScript = this.generateTaskScript(task);

      const result = await this.executePythonCommand({
        command: this.config.pythonPath,
        args: ['-c', pythonScript],
        sessionId: task.sessionId,
        timeout: this.config.taskTimeout,
        workingDir: this.config.browserUsePath,
      });

      task.completedAt = new Date();

      if (result.success) {
        task.status = 'completed';
        task.result = this.parseTaskResult(result.stdout);
        this.logger.log(`Task ${task.taskId} completed successfully`);
      } else {
        task.status = 'failed';
        task.error = this.createBrowserError(
          new Error(result.stderr || 'Task execution failed'),
          { context: { taskId: task.taskId, sessionId: task.sessionId } }
        );
        this.logger.error(`Task ${task.taskId} failed`, task.error);
      }

      this.tasks.set(task.taskId, task);
      this.emit('taskCompleted', task);

    } catch (error) {
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = this.createBrowserError(
        error,
        { context: { taskId: task.taskId, sessionId: task.sessionId } }
      );

      this.tasks.set(task.taskId, task);
      this.logger.error(`Task ${task.taskId} failed with exception`, error);
      this.emit('taskFailed', task);
    }
  }

  /**
   * Execute Python command with browser-use framework
   */
  private async executePythonCommand(command: IPythonBrowserUseCommand): Promise<IPythonProcessResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const process = spawn(command.command, command.args, {
        cwd: command.workingDir || this.config.browserUsePath,
        env: { ...process.env, ...command.env },
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
      }, command.timeout || this.config.taskTimeout);

      process.on('close', (exitCode) => {
        clearTimeout(timeout);

        if (command.sessionId) {
          this.runningProcesses.delete(command.sessionId);
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

      if (command.sessionId) {
        this.runningProcesses.set(command.sessionId, process);
      }
    });
  }

  /**
   * Generate Python script for browser interaction
   */
  private generateInteractionScript(sessionId: string, interaction: BrowserInteractionDto): string {
    const scriptTemplate = `
import asyncio
import json
from browser_use import Agent

async def execute_interaction():
    agent = Agent(
        task="Execute ${interaction.type} interaction",
        llm="anthropic/claude-3-5-sonnet-20241022"
    )

    try:
        if "${interaction.type}" == "click":
            result = await agent.browser.click("${interaction.selector || ''}")
        elif "${interaction.type}" == "type":
            result = await agent.browser.type("${interaction.selector || ''}", "${interaction.value || ''}")
        elif "${interaction.type}" == "navigate":
            result = await agent.browser.goto("${interaction.value || ''}")
        else:
            result = await agent.step("${interaction.type} interaction")

        # Take screenshot if enabled
        screenshot = None
        if ${this.config.enableScreenshots}:
            screenshot_data = await agent.browser.screenshot()
            if screenshot_data:
                import base64
                screenshot = base64.b64encode(screenshot_data).decode('utf-8')

        output = {
            "success": True,
            "result": str(result),
            "screenshot": screenshot
        }
        print(json.dumps(output))

    except Exception as e:
        output = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(output))

if __name__ == "__main__":
    asyncio.run(execute_interaction())
`;
    return scriptTemplate;
  }

  /**
   * Generate Python script for browser task
   */
  private generateTaskScript(task: IBrowserTask): string {
    const scriptTemplate = `
import asyncio
import json
from browser_use import Agent

async def execute_task():
    agent = Agent(
        task="${task.instruction}",
        llm="anthropic/claude-3-5-sonnet-20241022"
    )

    try:
        result = await agent.run()

        # Take screenshot if enabled
        screenshot = None
        if ${this.config.enableScreenshots}:
            screenshot_data = await agent.browser.screenshot()
            if screenshot_data:
                import base64
                screenshot = base64.b64encode(screenshot_data).decode('utf-8')

        output = {
            "success": True,
            "result": str(result),
            "screenshot": screenshot,
            "task_type": "${task.type}"
        }
        print(json.dumps(output))

    except Exception as e:
        output = {
            "success": False,
            "error": str(e),
            "task_type": "${task.type}"
        }
        print(json.dumps(output))

if __name__ == "__main__":
    asyncio.run(execute_task())
`;
    return scriptTemplate;
  }

  /**
   * Parse interaction result from Python output
   */
  private parseInteractionResult(stdout: string): any {
    try {
      return JSON.parse(stdout.trim());
    } catch {
      return { result: stdout };
    }
  }

  /**
   * Parse task result from Python output
   */
  private parseTaskResult(stdout: string): IBrowserTaskResult {
    try {
      const parsed = JSON.parse(stdout.trim());
      return {
        success: parsed.success || true,
        data: parsed.result,
        screenshot: parsed.screenshot,
        logs: [stdout],
        metrics: {
          duration: 0, // Will be calculated by caller
        },
      };
    } catch {
      return {
        success: true,
        data: stdout,
        logs: [stdout],
        metrics: { duration: 0 },
      };
    }
  }

  /**
   * Create standardized browser error
   */
  private createBrowserError(
    error: any,
    options: { context?: any; severity?: 'info' | 'warning' | 'error' | 'critical' } = {}
  ): IBrowserError {
    return {
      code: error.code || 'BROWSER_ERROR',
      message: error.message || 'Unknown browser error',
      stack: error.stack,
      context: options.context,
      timestamp: new Date(),
      severity: options.severity || 'error',
    };
  }

  /**
   * Cleanup resources and running processes
   */
  private async cleanup(): Promise<void> {
    // Kill all running processes
    for (const [sessionId, process] of this.runningProcesses.entries()) {
      try {
        process.kill('SIGTERM');
        this.logger.log(`Terminated process for session ${sessionId}`);
      } catch (error) {
        this.logger.error(`Failed to terminate process for session ${sessionId}`, error);
      }
    }

    this.runningProcesses.clear();
    this.isProcessingQueue = false;

    this.logger.log('BrowserUseService cleanup completed');
  }

  /**
   * Get service health status
   */
  getHealthStatus(): ServiceResponseDto<any> {
    return {
      success: true,
      data: {
        activeTasks: this.taskQueue.length,
        runningProcesses: this.runningProcesses.size,
        totalTasks: this.tasks.size,
        config: {
          maxConcurrentSessions: this.config.maxConcurrentSessions,
          taskTimeout: this.config.taskTimeout,
          enableScreenshots: this.config.enableScreenshots,
        },
      },
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
      },
    };
  }
}