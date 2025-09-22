/**
 * Python Integration Service for Browser-Use Framework Communication
 * Service Layer Implementation for Browser-Use API Endpoints
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { EventEmitter } from 'events';

import {
  IPythonProcessResult,
  IPythonBrowserUseCommand,
  IBrowserError,
  IServiceResponse,
} from './interfaces/browser-automation.interface';

import { ServiceResponseDto } from './dto/browser-automation.dto';

@Injectable()
export class PythonIntegrationService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PythonIntegrationService.name);
  private readonly pythonPath: string;
  private readonly browserUsePath: string;
  private readonly virtualEnvPath?: string;
  private runningProcesses: Map<string, ChildProcess> = new Map();
  private processQueue: IPythonBrowserUseCommand[] = [];
  private isProcessingQueue = false;
  private maxConcurrentProcesses: number;
  private defaultTimeout: number;

  constructor() {
    super();

    // Initialize configuration
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.browserUsePath = process.env.BROWSER_USE_PATH || '/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/browser-use';
    this.virtualEnvPath = process.env.BROWSER_USE_VENV_PATH;
    this.maxConcurrentProcesses = parseInt(process.env.MAX_PYTHON_PROCESSES || '10');
    this.defaultTimeout = parseInt(process.env.PYTHON_DEFAULT_TIMEOUT || '60000'); // 1 minute

    this.logger.log('PythonIntegrationService initialized for browser-use framework communication');
  }

  async onModuleInit() {
    this.logger.log('PythonIntegrationService module initialized');
    await this.validateEnvironment();
    this.startProcessQueue();
  }

  async onModuleDestroy() {
    this.logger.log('PythonIntegrationService module destroying - cleaning up processes');
    await this.cleanup();
  }

  /**
   * Validate Python environment and browser-use framework
   */
  async validateEnvironment(): Promise<ServiceResponseDto<any>> {
    try {
      this.logger.log('Validating Python environment and browser-use framework');

      // Check Python version
      const pythonVersionResult = await this.executeCommand({
        command: this.pythonPath,
        args: ['--version'],
        timeout: 10000,
      });

      if (!pythonVersionResult.success) {
        throw new Error(`Python not found or invalid: ${pythonVersionResult.stderr}`);
      }

      // Check browser-use installation
      const browserUseCheckResult = await this.executeCommand({
        command: this.pythonPath,
        args: ['-c', 'import browser_use; print(browser_use.__version__)'],
        timeout: 10000,
        workingDir: this.browserUsePath,
      });

      if (!browserUseCheckResult.success) {
        throw new Error(`Browser-use framework not found: ${browserUseCheckResult.stderr}`);
      }

      // Check required dependencies
      const dependenciesCheck = await this.checkDependencies();

      const validationResult = {
        pythonVersion: pythonVersionResult.stdout.trim(),
        browserUseVersion: browserUseCheckResult.stdout.trim(),
        browserUsePath: this.browserUsePath,
        virtualEnvPath: this.virtualEnvPath,
        dependencies: dependenciesCheck,
        timestamp: new Date(),
      };

      this.logger.log('Python environment validation successful', validationResult);

      return {
        success: true,
        data: validationResult,
        metadata: {
          timestamp: new Date(),
        },
      };

    } catch (error) {
      this.logger.error('Python environment validation failed', error);

      return {
        success: false,
        error: this.createPythonError(error, {
          context: { validation: 'environment' },
        }),
      };
    }
  }

  /**
   * Execute Python command with enhanced error handling and process management
   */
  async executeCommand(command: IPythonBrowserUseCommand): Promise<IPythonProcessResult> {
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.log(`Executing Python command ${commandId}`, {
        command: command.command,
        args: command.args?.slice(0, 2), // Log first 2 args to avoid logging sensitive data
        timeout: command.timeout,
        workingDir: command.workingDir,
      });

      const result = await this.spawnProcess(commandId, command);

      this.logger.log(`Python command ${commandId} completed`, {
        success: result.success,
        duration: result.duration,
        exitCode: result.exitCode,
      });

      return result;

    } catch (error) {
      this.logger.error(`Python command ${commandId} failed`, error);

      return {
        success: false,
        stderr: `Command execution failed: ${error.message}`,
        duration: 0,
      };
    }
  }

  /**
   * Execute browser-use agent task
   */
  async executeBrowserUseTask(task: {
    instruction: string;
    sessionId?: string;
    timeout?: number;
    llmModel?: string;
    headless?: boolean;
  }): Promise<ServiceResponseDto<any>> {
    try {
      this.logger.log(`Executing browser-use task for session ${task.sessionId || 'default'}`);

      const pythonScript = this.generateBrowserUseTaskScript(task);

      const result = await this.executeCommand({
        command: this.pythonPath,
        args: ['-c', pythonScript],
        sessionId: task.sessionId,
        timeout: task.timeout || this.defaultTimeout,
        workingDir: this.browserUsePath,
      });

      if (!result.success) {
        throw new Error(`Browser-use task failed: ${result.stderr}`);
      }

      const taskResult = this.parseBrowserUseResult(result.stdout);

      return {
        success: true,
        data: taskResult,
        metadata: {
          timestamp: new Date(),
          duration: result.duration,
          sessionId: task.sessionId,
        },
      };

    } catch (error) {
      this.logger.error(`Browser-use task failed for session ${task.sessionId}`, error);

      return {
        success: false,
        error: this.createPythonError(error, {
          context: { sessionId: task.sessionId, task: task.instruction },
        }),
      };
    }
  }

  /**
   * Execute custom Python script with browser-use context
   */
  async executeCustomScript(script: {
    code: string;
    sessionId?: string;
    timeout?: number;
    args?: any[];
  }): Promise<ServiceResponseDto<any>> {
    try {
      this.logger.log(`Executing custom Python script for session ${script.sessionId || 'default'}`);

      // Wrap custom script with browser-use imports and error handling
      const wrappedScript = this.wrapCustomScript(script.code, script.args);

      const result = await this.executeCommand({
        command: this.pythonPath,
        args: ['-c', wrappedScript],
        sessionId: script.sessionId,
        timeout: script.timeout || this.defaultTimeout,
        workingDir: this.browserUsePath,
      });

      if (!result.success) {
        throw new Error(`Custom script execution failed: ${result.stderr}`);
      }

      const scriptResult = this.parseScriptResult(result.stdout);

      return {
        success: true,
        data: scriptResult,
        metadata: {
          timestamp: new Date(),
          duration: result.duration,
          sessionId: script.sessionId,
        },
      };

    } catch (error) {
      this.logger.error(`Custom script execution failed for session ${script.sessionId}`, error);

      return {
        success: false,
        error: this.createPythonError(error, {
          context: { sessionId: script.sessionId, script: 'custom' },
        }),
      };
    }
  }

  /**
   * Install or update browser-use framework
   */
  async installBrowserUse(options?: {
    version?: string;
    upgrade?: boolean;
    preRelease?: boolean;
  }): Promise<ServiceResponseDto<any>> {
    try {
      this.logger.log('Installing/updating browser-use framework', options);

      const installArgs = ['install'];

      if (options?.upgrade) {
        installArgs.push('--upgrade');
      }

      if (options?.preRelease) {
        installArgs.push('--pre');
      }

      const packageName = options?.version ? `browser-use==${options.version}` : 'browser-use';
      installArgs.push(packageName);

      const result = await this.executeCommand({
        command: this.pythonPath,
        args: ['-m', 'pip', ...installArgs],
        timeout: 300000, // 5 minutes for installation
        workingDir: this.browserUsePath,
      });

      if (!result.success) {
        throw new Error(`Browser-use installation failed: ${result.stderr}`);
      }

      // Validate installation
      const validationResult = await this.validateEnvironment();

      return {
        success: true,
        data: {
          installationOutput: result.stdout,
          validation: validationResult.data,
        },
        metadata: {
          timestamp: new Date(),
          duration: result.duration,
        },
      };

    } catch (error) {
      this.logger.error('Browser-use installation failed', error);

      return {
        success: false,
        error: this.createPythonError(error, {
          context: { operation: 'installation' },
        }),
      };
    }
  }

  /**
   * Get browser-use framework information and status
   */
  async getBrowserUseInfo(): Promise<ServiceResponseDto<any>> {
    try {
      const infoScript = `
import json
import sys
import browser_use
from browser_use import Agent

try:
    info = {
        "version": browser_use.__version__,
        "python_version": sys.version,
        "installation_path": browser_use.__file__,
        "available_llms": ["anthropic/claude-3-5-sonnet-20241022"],
        "status": "ready"
    }
    print(json.dumps(info))
except Exception as e:
    error_info = {
        "status": "error",
        "error": str(e)
    }
    print(json.dumps(error_info))
`;

      const result = await this.executeCommand({
        command: this.pythonPath,
        args: ['-c', infoScript],
        timeout: 10000,
        workingDir: this.browserUsePath,
      });

      if (!result.success) {
        throw new Error(`Failed to get browser-use info: ${result.stderr}`);
      }

      const info = JSON.parse(result.stdout.trim());

      return {
        success: true,
        data: info,
        metadata: {
          timestamp: new Date(),
        },
      };

    } catch (error) {
      this.logger.error('Failed to get browser-use info', error);

      return {
        success: false,
        error: this.createPythonError(error, {
          context: { operation: 'info' },
        }),
      };
    }
  }

  /**
   * Check required dependencies
   */
  private async checkDependencies(): Promise<{ [key: string]: string | boolean }> {
    const dependencies = ['playwright', 'anthropic', 'openai', 'asyncio', 'json', 'base64'];
    const results: { [key: string]: string | boolean } = {};

    for (const dep of dependencies) {
      try {
        const result = await this.executeCommand({
          command: this.pythonPath,
          args: ['-c', `import ${dep}; print("${dep} available")`],
          timeout: 5000,
          workingDir: this.browserUsePath,
        });

        results[dep] = result.success ? result.stdout.trim() : false;
      } catch {
        results[dep] = false;
      }
    }

    return results;
  }

  /**
   * Generate browser-use task script
   */
  private generateBrowserUseTaskScript(task: {
    instruction: string;
    sessionId?: string;
    llmModel?: string;
    headless?: boolean;
  }): string {
    return `
import asyncio
import json
import base64
from browser_use import Agent

async def execute_task():
    try:
        agent = Agent(
            task="${task.instruction.replace(/"/g, '\\"')}",
            llm="${task.llmModel || 'anthropic/claude-3-5-sonnet-20241022'}"
        )

        # Execute the task
        result = await agent.run()

        # Capture screenshot if possible
        screenshot = None
        try:
            screenshot_data = await agent.browser.screenshot()
            if screenshot_data:
                screenshot = base64.b64encode(screenshot_data).decode('utf-8')
        except Exception as screenshot_error:
            pass  # Screenshot is optional

        # Get page info
        page_info = {}
        try:
            page_info = {
                "title": await agent.browser.page.title(),
                "url": agent.browser.page.url,
            }
        except Exception as page_error:
            pass  # Page info is optional

        output = {
            "success": True,
            "result": str(result),
            "screenshot": screenshot,
            "page_info": page_info,
            "session_id": "${task.sessionId || 'default'}",
            "task": "${task.instruction}"
        }

        print(json.dumps(output))

    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "session_id": "${task.sessionId || 'default'}",
            "task": "${task.instruction}"
        }
        print(json.dumps(error_output))

if __name__ == "__main__":
    asyncio.run(execute_task())
`;
  }

  /**
   * Wrap custom script with browser-use context
   */
  private wrapCustomScript(code: string, args?: any[]): string {
    const argsJson = JSON.stringify(args || []);

    return `
import asyncio
import json
import base64
import sys
from browser_use import Agent

async def execute_custom_script():
    try:
        # Make Agent available in the script context
        agent = Agent(
            task="Execute custom script",
            llm="anthropic/claude-3-5-sonnet-20241022"
        )

        # Script arguments
        script_args = ${argsJson}

        # Execute the custom code
        ${code}

    except Exception as e:
        error_output = {
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }
        print(json.dumps(error_output))

if __name__ == "__main__":
    asyncio.run(execute_custom_script())
`;
  }

  /**
   * Spawn and manage Python process
   */
  private async spawnProcess(commandId: string, command: IPythonBrowserUseCommand): Promise<IPythonProcessResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      // Use virtual environment if configured
      const pythonCommand = this.virtualEnvPath
        ? join(this.virtualEnvPath, 'bin', 'python')
        : command.command;

      const process = spawn(pythonCommand, command.args, {
        cwd: command.workingDir || this.browserUsePath,
        env: {
          ...process.env,
          ...command.env,
          PYTHONPATH: this.browserUsePath,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        this.emit('processOutput', { commandId, type: 'stdout', data: data.toString() });
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        this.emit('processOutput', { commandId, type: 'stderr', data: data.toString() });
      });

      // Store running process
      this.runningProcesses.set(commandId, process);

      // Set timeout
      const timeout = setTimeout(() => {
        process.kill('SIGTERM');
        this.runningProcesses.delete(commandId);

        resolve({
          success: false,
          stderr: `Process timeout after ${command.timeout || this.defaultTimeout}ms`,
          duration: Date.now() - startTime,
          pid: process.pid,
        });
      }, command.timeout || this.defaultTimeout);

      process.on('close', (exitCode, signal) => {
        clearTimeout(timeout);
        this.runningProcesses.delete(commandId);

        const duration = Date.now() - startTime;

        resolve({
          success: exitCode === 0,
          stdout,
          stderr,
          exitCode: exitCode || undefined,
          duration,
          pid: process.pid,
          signal,
        });

        this.emit('processCompleted', {
          commandId,
          exitCode,
          signal,
          duration,
          success: exitCode === 0,
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        this.runningProcesses.delete(commandId);

        resolve({
          success: false,
          stderr: `Process error: ${error.message}`,
          duration: Date.now() - startTime,
        });
      });

      this.emit('processStarted', { commandId, pid: process.pid });
    });
  }

  /**
   * Start process queue manager
   */
  private startProcessQueue(): void {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    const processNext = async () => {
      if (this.processQueue.length === 0 || this.runningProcesses.size >= this.maxConcurrentProcesses) {
        setTimeout(processNext, 100);
        return;
      }

      const command = this.processQueue.shift();
      if (command) {
        await this.executeCommand(command);
      }

      setTimeout(processNext, 10);
    };

    processNext();
    this.logger.log(`Process queue started with max ${this.maxConcurrentProcesses} concurrent processes`);
  }

  /**
   * Parse browser-use result
   */
  private parseBrowserUseResult(stdout: string): any {
    try {
      return JSON.parse(stdout.trim());
    } catch {
      return { result: stdout };
    }
  }

  /**
   * Parse script result
   */
  private parseScriptResult(stdout: string): any {
    try {
      return JSON.parse(stdout.trim());
    } catch {
      return { output: stdout };
    }
  }

  /**
   * Create Python integration error
   */
  private createPythonError(
    error: any,
    options: { context?: any; severity?: 'info' | 'warning' | 'error' | 'critical' } = {}
  ): IBrowserError {
    return {
      code: error.code || 'PYTHON_INTEGRATION_ERROR',
      message: error.message || 'Unknown Python integration error',
      stack: error.stack,
      context: options.context,
      timestamp: new Date(),
      severity: options.severity || 'error',
    };
  }

  /**
   * Cleanup running processes
   */
  private async cleanup(): Promise<void> {
    this.isProcessingQueue = false;

    // Terminate all running processes
    for (const [commandId, process] of this.runningProcesses.entries()) {
      try {
        process.kill('SIGTERM');
        this.logger.log(`Terminated Python process ${commandId}`);
      } catch (error) {
        this.logger.error(`Failed to terminate process ${commandId}`, error);
      }
    }

    this.runningProcesses.clear();
    this.processQueue.length = 0;

    this.logger.log('Python integration service cleanup completed');
  }

  /**
   * Get service statistics
   */
  getStatistics(): ServiceResponseDto<any> {
    return {
      success: true,
      data: {
        runningProcesses: this.runningProcesses.size,
        queuedCommands: this.processQueue.length,
        maxConcurrentProcesses: this.maxConcurrentProcesses,
        defaultTimeout: this.defaultTimeout,
        pythonPath: this.pythonPath,
        browserUsePath: this.browserUsePath,
        virtualEnvPath: this.virtualEnvPath,
      },
      metadata: {
        timestamp: new Date(),
        version: '1.0.0',
      },
    };
  }

  /**
   * Kill a specific running process
   */
  async killProcess(commandId: string): Promise<ServiceResponseDto<boolean>> {
    const process = this.runningProcesses.get(commandId);

    if (!process) {
      return {
        success: false,
        error: this.createPythonError(
          new Error(`Process ${commandId} not found`),
          { context: { commandId } }
        ),
      };
    }

    try {
      process.kill('SIGTERM');
      this.runningProcesses.delete(commandId);

      this.logger.log(`Killed Python process ${commandId}`);

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date(),
        },
      };

    } catch (error) {
      this.logger.error(`Failed to kill process ${commandId}`, error);

      return {
        success: false,
        error: this.createPythonError(error, {
          context: { commandId },
        }),
      };
    }
  }
}