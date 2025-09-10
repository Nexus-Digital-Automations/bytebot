/**
 * Computer Use Terminal Integration Layer
 *
 * This module provides integration between the Terminal Execution Enhancer
 * and the Computer Use Service, enabling structured output capture for
 * all terminal-based computer actions.
 *
 * Key Features:
 * - Seamless integration with existing Computer Use Service
 * - Backward compatibility with current terminal execution
 * - Enhanced structured output for machine-to-machine communication
 * - File creation tracking during computer actions
 * - Comprehensive error handling and logging
 */

import { Injectable, Logger } from "@nestjs/common";
import { exec } from "child_process";
import { promisify } from "util";
import {
  TerminalExecutionEnhancer,
  TerminalExecutionResult,
  EnhancedExecutionOptions,
} from "./terminal-execution-enhancer";

const execAsync = promisify(exec);

/**
 * Computer terminal action interface extending the base ComputerAction
 */
export interface ComputerTerminalAction {
  readonly action: "terminal_execute";
  readonly command: string;
  readonly options?: {
    readonly workingDirectory?: string;
    readonly environment?: Record<string, string>;
    readonly timeout?: number;
    readonly captureFiles?: boolean;
    readonly enableMetrics?: boolean;
    readonly securityRestrictions?: {
      readonly allowedCommands?: readonly string[];
      readonly blockedCommands?: readonly string[];
      readonly maxExecutionTime?: number;
      readonly allowNetworkAccess?: boolean;
      readonly allowFileSystemWrite?: boolean;
    };
  };
}

/**
 * Enhanced computer terminal result interface
 */
export interface ComputerTerminalResult extends TerminalExecutionResult {
  readonly computerUseContext?: {
    readonly screenshotBefore?: string; // Base64 encoded screenshot
    readonly screenshotAfter?: string; // Base64 encoded screenshot
    readonly cursorPosition?: { x: number; y: number };
    readonly windowInfo?: {
      readonly activeWindow?: string;
      readonly windowList?: string[];
    };
  };
}

/**
 * Terminal execution context for Computer Use operations
 */
export interface ComputerTerminalContext {
  readonly operationId: string;
  readonly parentOperation?: string;
  readonly userContext?: {
    readonly userId?: string;
    readonly sessionId?: string;
    readonly taskId?: string;
  };
  readonly securityContext?: {
    readonly permissions?: string[];
    readonly restrictions?: string[];
    readonly auditLevel?: "basic" | "detailed" | "comprehensive";
  };
}

/**
 * Computer Use Terminal Integration Service
 *
 * This service provides enhanced terminal execution capabilities specifically
 * designed for Computer Use operations. It integrates the Terminal Execution
 * Enhancer with computer-specific context and tracking.
 */
@Injectable()
export class ComputerTerminalIntegrationService {
  private readonly logger = new Logger(ComputerTerminalIntegrationService.name);
  private readonly terminalEnhancer: TerminalExecutionEnhancer;
  private readonly executionHistory: Map<string, ComputerTerminalResult> =
    new Map();

  constructor() {
    this.terminalEnhancer = new TerminalExecutionEnhancer();

    this.logger.log("Computer Use Terminal Integration Service initialized", {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Execute terminal command with Computer Use context and enhanced output capture
   *
   * This method provides the main interface for executing terminal commands
   * within the Computer Use framework with full structured output capture.
   *
   * @param action - Computer terminal action with command and options
   * @param context - Computer Use execution context
   * @returns Promise<ComputerTerminalResult> Enhanced execution result with computer context
   */
  async executeTerminalAction(
    action: ComputerTerminalAction,
    context: ComputerTerminalContext = {
      operationId: this.generateOperationId(),
    },
  ): Promise<ComputerTerminalResult> {
    const startTime = Date.now();
    const operationId = context.operationId;

    this.logger.log(`[${operationId}] Executing computer terminal action`, {
      operationId,
      command: this.shouldRedactCommand(action.command)
        ? "[REDACTED]"
        : action.command,
      workingDirectory: action.options?.workingDirectory,
      timeout: action.options?.timeout,
      captureFiles: action.options?.captureFiles,
      contextInfo: {
        parentOperation: context.parentOperation,
        hasUserContext: !!context.userContext,
        hasSecurityContext: !!context.securityContext,
      },
    });

    let screenshotBefore: string | undefined;
    let screenshotAfter: string | undefined;

    try {
      // Capture pre-execution context if possible
      try {
        screenshotBefore = await this.captureScreenshot(operationId);
      } catch (screenshotError) {
        this.logger.debug(
          `[${operationId}] Could not capture pre-execution screenshot: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}`,
        );
      }

      // Configure enhanced execution options
      const enhancedOptions: EnhancedExecutionOptions = {
        workingDirectory: action.options?.workingDirectory,
        environment: action.options?.environment,
        timeout: action.options?.timeout || 30000, // 30 second default
        captureFiles: action.options?.captureFiles ?? true,
        enableMetrics: action.options?.enableMetrics ?? true,
        securityRestrictions: action.options?.securityRestrictions,
        fileWatchPaths: this.getFileWatchPaths(
          action.options?.workingDirectory,
        ),
        maxOutputSize: 50 * 1024 * 1024, // 50MB for computer use operations
      };

      // Execute command with structured output capture
      const executionResult = await this.terminalEnhancer.executeCommand(
        action.command,
        enhancedOptions,
      );

      // Capture post-execution context
      try {
        screenshotAfter = await this.captureScreenshot(operationId);
      } catch (screenshotError) {
        this.logger.debug(
          `[${operationId}] Could not capture post-execution screenshot: ${screenshotError instanceof Error ? screenshotError.message : String(screenshotError)}`,
        );
      }

      // Build enhanced computer terminal result
      const computerResult: ComputerTerminalResult = {
        ...executionResult,
        computerUseContext: {
          screenshotBefore,
          screenshotAfter,
          cursorPosition: await this.getCursorPosition(operationId),
          windowInfo: await this.getWindowInfo(operationId),
        },
      };

      // Store execution history for analysis and debugging
      this.executionHistory.set(operationId, computerResult);

      // Cleanup old history entries (keep last 100)
      if (this.executionHistory.size > 100) {
        const entries = Array.from(this.executionHistory.entries());
        entries.slice(0, entries.length - 100).forEach(([key]) => {
          this.executionHistory.delete(key);
        });
      }

      const duration = Date.now() - startTime;
      this.logger.log(`[${operationId}] Computer terminal action completed`, {
        operationId,
        status: computerResult.status,
        exitCode: computerResult.exitCode,
        stdoutLength: computerResult.stdout.length,
        stderrLength: computerResult.stderr.length,
        filesCreated: computerResult.files.length,
        executionTimeMs: duration,
        hasScreenshots: !!(screenshotBefore || screenshotAfter),
      });

      return computerResult;
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      this.logger.error(
        `[${operationId}] Computer terminal action failed: ${errorMessage}`,
        {
          operationId,
          command: this.shouldRedactCommand(action.command)
            ? "[REDACTED]"
            : action.command,
          error: errorMessage,
          executionTimeMs: duration,
        },
      );

      // Create error result with available context
      const errorResult: ComputerTerminalResult = {
        status: "failed",
        stdout: "",
        stderr: errorMessage,
        files: [],
        exitCode: 1,
        executionTimeMs: duration,
        operationId,
        timestamp: new Date(),
        command: action.command,
        workingDirectory: action.options?.workingDirectory || process.cwd(),
        error: errorMessage,
        computerUseContext: {
          screenshotBefore,
          screenshotAfter,
        },
      };

      return errorResult;
    }
  }

  /**
   * Execute multiple terminal commands sequentially with context preservation
   *
   * @param actions - Array of terminal actions to execute
   * @param context - Shared execution context
   * @returns Promise<ComputerTerminalResult[]> Array of execution results
   */
  async executeSequentialActions(
    actions: ComputerTerminalAction[],
    context: ComputerTerminalContext = {
      operationId: this.generateOperationId(),
    },
  ): Promise<ComputerTerminalResult[]> {
    const operationId = context.operationId;
    const results: ComputerTerminalResult[] = [];

    this.logger.log(
      `[${operationId}] Executing ${actions.length} sequential terminal actions`,
      {
        operationId,
        actionCount: actions.length,
      },
    );

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const subContext: ComputerTerminalContext = {
        ...context,
        operationId: `${operationId}_seq_${i}`,
        parentOperation: operationId,
      };

      try {
        const result = await this.executeTerminalAction(action, subContext);
        results.push(result);

        // Stop on failure unless explicitly configured to continue
        if (result.status === "failed" && result.exitCode !== 0) {
          this.logger.warn(
            `[${operationId}] Sequential execution stopped due to failure at action ${i}`,
          );
          break;
        }
      } catch (err) {
        this.logger.error(
          `[${operationId}] Sequential execution failed at action ${i}: ${err instanceof Error ? err.message : String(err)}`,
        );
        break;
      }
    }

    this.logger.log(`[${operationId}] Sequential terminal actions completed`, {
      operationId,
      totalActions: actions.length,
      completedActions: results.length,
      successCount: results.filter((r) => r.status === "completed").length,
      failureCount: results.filter((r) => r.status === "failed").length,
    });

    return results;
  }

  /**
   * Get execution history for analysis and debugging
   *
   * @param operationId - Optional operation ID to get specific result
   * @returns Execution history entries
   */
  getExecutionHistory(
    operationId?: string,
  ): ComputerTerminalResult | ComputerTerminalResult[] {
    if (operationId) {
      const result = this.executionHistory.get(operationId);
      if (!result) {
        throw new Error(
          `No execution history found for operation ${operationId}`,
        );
      }
      return result;
    }

    return Array.from(this.executionHistory.values());
  }

  /**
   * Get current service statistics
   */
  getServiceStats(): {
    activeProcesses: number;
    historyEntries: number;
    totalExecutions: number;
  } {
    const terminalStats = this.terminalEnhancer.getExecutionStats();

    return {
      activeProcesses: terminalStats.activeProcesses,
      historyEntries: this.executionHistory.size,
      totalExecutions: terminalStats.totalExecutions,
    };
  }

  /**
   * Clear execution history (useful for memory management)
   */
  clearExecutionHistory(): number {
    const count = this.executionHistory.size;
    this.executionHistory.clear();

    this.logger.log(`Cleared ${count} execution history entries`);
    return count;
  }

  /**
   * Emergency stop all active processes
   */
  async emergencyStop(): Promise<number> {
    this.logger.warn(
      "Emergency stop requested - cancelling all active processes",
    );

    const cancelledCount =
      await this.terminalEnhancer.cancelAllProcesses("SIGKILL");

    this.logger.warn(
      `Emergency stop completed - cancelled ${cancelledCount} processes`,
    );
    return cancelledCount;
  }

  // === PRIVATE HELPER METHODS ===

  /**
   * Generate unique operation ID for tracking
   */
  private generateOperationId(): string {
    return `computer_terminal_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Determine if command should be redacted from logs for security
   */
  private shouldRedactCommand(command: string): boolean {
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /auth/i,
      /credential/i,
    ];

    return sensitivePatterns.some((pattern) => pattern.test(command));
  }

  /**
   * Get file watch paths for monitoring based on working directory
   */
  private getFileWatchPaths(workingDirectory?: string): string[] {
    const basePath = workingDirectory || process.cwd();

    return [
      basePath,
      "/tmp",
      "/var/tmp",
      "/home/user/Desktop",
      "/home/user/Downloads",
    ];
  }

  /**
   * Capture screenshot for computer use context (placeholder implementation)
   */
  private async captureScreenshot(
    operationId: string,
  ): Promise<string | undefined> {
    try {
      // This would integrate with the existing screenshot functionality
      // from the Computer Use Service - placeholder for now
      const { stdout } = await execAsync('echo "screenshot_placeholder"');
      return Buffer.from(stdout).toString("base64");
    } catch (err) {
      this.logger.debug(
        `[${operationId}] Screenshot capture failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  /**
   * Get current cursor position (placeholder implementation)
   */
  private async getCursorPosition(
    operationId: string,
  ): Promise<{ x: number; y: number } | undefined> {
    try {
      // This would integrate with existing cursor position functionality
      // Placeholder implementation
      return { x: 0, y: 0 };
    } catch (err) {
      this.logger.debug(
        `[${operationId}] Cursor position retrieval failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }

  /**
   * Get window information (placeholder implementation)
   */
  private async getWindowInfo(operationId: string): Promise<
    | {
        activeWindow?: string;
        windowList?: string[];
      }
    | undefined
  > {
    try {
      // This would integrate with existing window management functionality
      // Placeholder implementation
      return {
        activeWindow: "terminal",
        windowList: ["terminal", "browser", "editor"],
      };
    } catch (err) {
      this.logger.debug(
        `[${operationId}] Window info retrieval failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return undefined;
    }
  }
}

/**
 * Factory function for creating Computer Use Terminal Integration Service
 * Useful for dependency injection in NestJS applications
 */
export function createComputerTerminalIntegrationService(): ComputerTerminalIntegrationService {
  return new ComputerTerminalIntegrationService();
}

/**
 * Convenience function for executing computer terminal actions
 * Provides a simple interface for one-off terminal executions
 */
export async function executeComputerTerminalAction(
  command: string,
  options: ComputerTerminalAction["options"] = {},
): Promise<ComputerTerminalResult> {
  const service = createComputerTerminalIntegrationService();
  const action: ComputerTerminalAction = {
    action: "terminal_execute",
    command,
    options,
  };

  return await service.executeTerminalAction(action);
}
