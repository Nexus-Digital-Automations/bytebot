/**
 * Terminal Execution Enhancement System - Main Export Module
 *
 * This module exports all terminal execution enhancement functionality
 * including structured output capture, file system monitoring, and
 * Computer Use Service integration.
 *
 * Key Exports:
 * - TerminalExecutionEnhancer: Core terminal execution with structured output
 * - ComputerTerminalIntegrationService: Computer Use Service integration
 * - Interfaces and types for structured terminal execution
 * - Convenience functions for enhanced terminal operations
 *
 * Usage:
 * ```typescript
 * import {
 *   TerminalExecutionEnhancer,
 *   executeWithStructuredOutput,
 *   ComputerTerminalIntegrationService,
 *   executeComputerTerminalAction
 * } from '@bytebot/shared/terminal';
 *
 * // Direct usage
 * const result = await executeWithStructuredOutput('ls -la', {
 *   captureFiles: true,
 *   timeout: 5000
 * });
 *
 * // Computer Use integration
 * const computerResult = await executeComputerTerminalAction('npm install', {
 *   workingDirectory: '/home/user/project',
 *   captureFiles: true
 * });
 * ```
 */

// Import types for use in function signatures
import type {
  TerminalExecutionResult as TER,
  EnhancedExecutionOptions as EEO,
} from "./terminal-execution-enhancer";

// === CORE TERMINAL EXECUTION ENHANCER ===
export {
  TerminalExecutionEnhancer,
  executeWithStructuredOutput,
  createTerminalExecutionEnhancer,
  type TerminalExecutionResult,
  type EnhancedExecutionOptions,
  type FileSystemChange,
} from "./terminal-execution-enhancer";

// === COMPUTER USE INTEGRATION ===
export {
  ComputerTerminalIntegrationService,
  createComputerTerminalIntegrationService,
  executeComputerTerminalAction,
} from "./computer-use-terminal-integration";

// === INTERFACES AND TYPES ===

// Core execution interfaces - exported above

// Computer Use integration interfaces
export type {
  ComputerTerminalAction,
  ComputerTerminalResult,
  ComputerTerminalContext,
} from "./computer-use-terminal-integration";

// === UTILITY FUNCTIONS ===

/**
 * Default execution options for common terminal operations
 */
export const DEFAULT_EXECUTION_OPTIONS = {
  timeout: 30000, // 30 seconds
  captureFiles: true,
  enableMetrics: true,
  maxOutputSize: 10 * 1024 * 1024, // 10MB
  shell: true,
  encoding: "utf8",
  killSignal: "SIGTERM",
  windowsHide: true,
} as const;

/**
 * Secure execution options with restricted permissions
 */
export const SECURE_EXECUTION_OPTIONS = {
  ...DEFAULT_EXECUTION_OPTIONS,
  timeout: 10000, // 10 seconds for security
  maxOutputSize: 1 * 1024 * 1024, // 1MB limit
  securityRestrictions: {
    blockedCommands: [
      "rm",
      "del",
      "format",
      "fdisk",
      "mkfs",
      "dd",
      "sudo",
      "su",
      "passwd",
      "useradd",
      "userdel",
      "chmod",
      "chown",
      "mount",
      "umount",
    ],
    maxExecutionTime: 10000,
    allowNetworkAccess: false,
    allowFileSystemWrite: false,
  },
} as const;

/**
 * Development execution options with enhanced monitoring
 */
export const DEVELOPMENT_EXECUTION_OPTIONS: EEO = {
  ...DEFAULT_EXECUTION_OPTIONS,
  timeout: 300000, // 5 minutes for development tasks
  maxOutputSize: 100 * 1024 * 1024, // 100MB for large outputs
  enableMetrics: true,
  captureFiles: true,
  fileWatchPaths: [
    process.cwd(),
    "./src",
    "./dist",
    "./build",
    "./node_modules",
    "/tmp",
  ],
} as const;

// === VALIDATION AND UTILITIES ===

/**
 * Validate terminal execution result for completeness
 * @param result - Terminal execution result to validate
 * @returns Validation result with details
 */
export function validateTerminalResult(result: TER): {
  isValid: boolean;
  issues: string[];
  completeness: number; // 0-100 percentage
} {
  const issues: string[] = [];
  let completeness = 0;

  // Check required fields
  if (!result.operationId) issues.push("Missing operationId");
  if (result.status === undefined) issues.push("Missing status");
  if (result.stdout === undefined) issues.push("Missing stdout");
  if (result.stderr === undefined) issues.push("Missing stderr");
  if (!result.files) issues.push("Missing files array");
  if (result.executionTimeMs === undefined)
    issues.push("Missing executionTimeMs");
  if (!result.timestamp) issues.push("Missing timestamp");
  if (!result.command) issues.push("Missing command");
  if (!result.workingDirectory) issues.push("Missing workingDirectory");

  // Calculate completeness score
  const totalFields = 12;
  const presentFields = totalFields - issues.length;
  completeness = Math.round((presentFields / totalFields) * 100);

  // Additional validation
  if (result.status === "completed" && result.exitCode !== 0) {
    issues.push("Status is completed but exit code indicates failure");
  }

  if (result.status === "failed" && result.exitCode === 0) {
    issues.push("Status is failed but exit code indicates success");
  }

  if (result.executionTimeMs && result.executionTimeMs < 0) {
    issues.push("Invalid execution time (negative value)");
  }

  return {
    isValid: issues.length === 0,
    issues,
    completeness,
  };
}

/**
 * Format terminal execution result for human-readable display
 * @param result - Terminal execution result to format
 * @returns Formatted string representation
 */
export function formatTerminalResult(result: TER): string {
  const lines: string[] = [];

  lines.push("=== TERMINAL EXECUTION RESULT ===");
  lines.push(`Operation ID: ${result.operationId}`);
  lines.push(`Status: ${result.status.toUpperCase()}`);
  lines.push(`Command: ${result.command}`);
  lines.push(`Exit Code: ${result.exitCode}`);
  lines.push(`Execution Time: ${result.executionTimeMs}ms`);
  lines.push(`Working Directory: ${result.workingDirectory}`);
  lines.push(`Timestamp: ${result.timestamp.toISOString()}`);

  if (result.files.length > 0) {
    lines.push(`\nFiles Created (${result.files.length}):`);
    result.files.slice(0, 10).forEach((file: string) => {
      lines.push(`  - ${file}`);
    });
    if (result.files.length > 10) {
      lines.push(`  ... and ${result.files.length - 10} more`);
    }
  }

  if (result.stdout) {
    lines.push("\n=== STDOUT ===");
    lines.push(result.stdout.substring(0, 1000)); // First 1000 chars
    if (result.stdout.length > 1000) {
      lines.push(`... (${result.stdout.length - 1000} more characters)`);
    }
  }

  if (result.stderr) {
    lines.push("\n=== STDERR ===");
    lines.push(result.stderr.substring(0, 1000)); // First 1000 chars
    if (result.stderr.length > 1000) {
      lines.push(`... (${result.stderr.length - 1000} more characters)`);
    }
  }

  if (result.error) {
    lines.push(`\n=== ERROR ===`);
    lines.push(result.error);
  }

  if (result.metrics) {
    lines.push("\n=== METRICS ===");
    lines.push(
      `Peak Memory Usage: ${result.metrics.peakMemoryUsage || 0} bytes`,
    );
    lines.push(`CPU Usage: ${result.metrics.cpuUsage || 0}%`);
    lines.push(`Network Operations: ${result.metrics.networkOperations || 0}`);
    lines.push(
      `File System Operations: ${result.metrics.fileSystemOperations || 0}`,
    );
  }

  lines.push("\n=== END RESULT ===");

  return lines.join("\n");
}

/**
 * Extract summary information from terminal execution result
 * @param result - Terminal execution result to summarize
 * @returns Summary object with key information
 */
export function summarizeTerminalResult(result: TER): {
  operationId: string;
  status: string;
  success: boolean;
  duration: number;
  outputLength: number;
  errorLength: number;
  filesCreated: number;
  command: string;
  timestamp: string;
} {
  return {
    operationId: result.operationId,
    status: result.status,
    success: result.status === "completed" && result.exitCode === 0,
    duration: result.executionTimeMs,
    outputLength: result.stdout?.length || 0,
    errorLength: result.stderr?.length || 0,
    filesCreated: result.files?.length || 0,
    command: result.command,
    timestamp: result.timestamp.toISOString(),
  };
}

// === VERSION AND MODULE INFO ===

/**
 * Terminal execution enhancer version information
 */
export const TERMINAL_ENHANCER_VERSION = "1.0.0" as const;

/**
 * Module information for debugging and logging
 */
export const MODULE_INFO = {
  name: "Terminal Execution Enhancer",
  version: TERMINAL_ENHANCER_VERSION,
  description:
    "Structured output capture for terminal execution with file tracking",
  features: [
    "Structured JSON output format",
    "Real-time stdout/stderr capture",
    "File system change detection",
    "Security restrictions and validation",
    "Performance metrics and monitoring",
    "Computer Use Service integration",
  ],
  compatibility: {
    node: ">=14.0.0",
    platforms: ["linux", "darwin", "win32"],
  },
} as const;
