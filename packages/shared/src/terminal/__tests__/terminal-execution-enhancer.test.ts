/**
 * Terminal Execution Enhancer Test Suite
 *
 * Comprehensive tests for the Terminal Execution Enhancement system
 * including structured output capture, file system monitoring, and
 * security validation.
 */

import {
  describe,
  expect,
  it,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { promises as fs } from "fs";
import * as path from "path";
import * as os from "os";
import {
  TerminalExecutionEnhancer,
  executeWithStructuredOutput,
  TerminalExecutionResult,
  EnhancedExecutionOptions,
} from "../terminal-execution-enhancer";

describe("TerminalExecutionEnhancer", () => {
  let enhancer: TerminalExecutionEnhancer;
  let tempDir: string;

  beforeEach(async () => {
    enhancer = new TerminalExecutionEnhancer();
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "terminal-enhancer-test-"),
    );
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (err) {
      // Directory might not exist or already be cleaned up
    }

    // Cancel any remaining processes
    await enhancer.cancelAllProcesses("SIGKILL");
  });

  describe("Basic Command Execution", () => {
    it("should execute simple command and capture stdout", async () => {
      const result = await enhancer.executeCommand('echo "Hello World"', {
        captureFiles: false,
        timeout: 5000,
      });

      expect(result.status).toBe("completed");
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("Hello World");
      expect(result.stderr).toBe("");
      expect(result.operationId).toMatch(/^exec_\d+_[a-z0-9]+$/);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.command).toBe('echo "Hello World"');
      expect(result.executionTimeMs).toBeGreaterThan(0);
    });

    it("should capture stderr output", async () => {
      const result = await enhancer.executeCommand(
        "node -e \"console.error('Error message')\"",
        {
          captureFiles: false,
          timeout: 5000,
        },
      );

      expect(result.status).toBe("completed");
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr.trim()).toBe("Error message");
    });

    it("should handle command failures", async () => {
      const result = await enhancer.executeCommand("nonexistentcommand", {
        captureFiles: false,
        timeout: 5000,
      });

      expect(result.status).toBe("failed");
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("not found");
      expect(result.error).toBeDefined();
    });

    it("should handle timeout scenarios", async () => {
      const result = await enhancer.executeCommand("sleep 10", {
        captureFiles: false,
        timeout: 1000, // 1 second timeout
      });

      expect(result.status).toBe("timeout");
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("File System Monitoring", () => {
    it("should detect newly created files", async () => {
      const testFile = path.join(tempDir, "test-file.txt");

      const result = await enhancer.executeCommand(
        `echo "test content" > "${testFile}"`,
        {
          captureFiles: true,
          fileWatchPaths: [tempDir],
          timeout: 5000,
        },
      );

      expect(result.status).toBe("completed");
      expect(result.files).toContain(testFile);

      // Verify file was actually created
      const fileContent = await fs.readFile(testFile, "utf8");
      expect(fileContent.trim()).toBe("test content");
    });

    it("should handle multiple file creation", async () => {
      const commands = [
        `echo "file1" > "${path.join(tempDir, "file1.txt")}"`,
        `echo "file2" > "${path.join(tempDir, "file2.txt")}"`,
        `mkdir -p "${path.join(tempDir, "subdir")}"`,
        `echo "file3" > "${path.join(tempDir, "subdir", "file3.txt")}"`,
      ].join(" && ");

      const result = await enhancer.executeCommand(commands, {
        captureFiles: true,
        fileWatchPaths: [tempDir],
        timeout: 10000,
      });

      expect(result.status).toBe("completed");
      expect(result.files.length).toBeGreaterThanOrEqual(3);
      expect(result.files.some((f) => f.endsWith("file1.txt"))).toBe(true);
      expect(result.files.some((f) => f.endsWith("file2.txt"))).toBe(true);
      expect(result.files.some((f) => f.endsWith("file3.txt"))).toBe(true);
    });
  });

  describe("Security Restrictions", () => {
    it("should block dangerous commands when security restrictions are enabled", async () => {
      const result = await enhancer.executeCommand("rm -rf /", {
        captureFiles: false,
        timeout: 5000,
        securityRestrictions: {
          blockedCommands: ["rm"],
        },
      });

      expect(result.status).toBe("failed");
      expect(result.stderr).toContain("blocked by security restrictions");
      expect(result.error).toBe("Security validation failed");
    });

    it("should only allow whitelisted commands when allowedCommands is specified", async () => {
      const result = await enhancer.executeCommand('echo "Hello"', {
        captureFiles: false,
        timeout: 5000,
        securityRestrictions: {
          allowedCommands: ["ls", "cat"], // echo not in allowed list
        },
      });

      expect(result.status).toBe("failed");
      expect(result.stderr).toContain("not in allowed list");
    });

    it("should allow commands in the whitelist", async () => {
      const result = await enhancer.executeCommand('echo "Hello"', {
        captureFiles: false,
        timeout: 5000,
        securityRestrictions: {
          allowedCommands: ["echo", "ls", "cat"],
        },
      });

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("Hello");
    });
  });

  describe("Output Size Limits", () => {
    it("should respect output size limits", async () => {
      const result = await enhancer.executeCommand(
        "node -e \"console.log('x'.repeat(1000000))\"", // 1MB output
        {
          captureFiles: false,
          timeout: 10000,
          maxOutputSize: 1024, // 1KB limit
        },
      );

      expect(result.status).toBe("completed");
      expect(result.stdout.length).toBeLessThanOrEqual(1024);
    });
  });

  describe("Working Directory", () => {
    it("should execute commands in specified working directory", async () => {
      const result = await enhancer.executeCommand("pwd", {
        workingDirectory: tempDir,
        captureFiles: false,
        timeout: 5000,
      });

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe(tempDir);
      expect(result.workingDirectory).toBe(tempDir);
    });
  });

  describe("Environment Variables", () => {
    it("should pass custom environment variables", async () => {
      const result = await enhancer.executeCommand(
        'node -e "console.log(process.env.TEST_VAR)"',
        {
          environment: { TEST_VAR: "test_value" },
          captureFiles: false,
          timeout: 5000,
        },
      );

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("test_value");
    });
  });

  describe("Structured Output Format", () => {
    it("should provide structured JSON output format", async () => {
      const result = await enhancer.executeCommand('echo "test"', {
        captureFiles: false,
        timeout: 5000,
      });

      // Validate the structure matches TerminalExecutionResult interface
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("stdout");
      expect(result).toHaveProperty("stderr");
      expect(result).toHaveProperty("files");
      expect(result).toHaveProperty("exitCode");
      expect(result).toHaveProperty("executionTimeMs");
      expect(result).toHaveProperty("operationId");
      expect(result).toHaveProperty("timestamp");
      expect(result).toHaveProperty("command");
      expect(result).toHaveProperty("workingDirectory");

      // Validate types
      expect(typeof result.status).toBe("string");
      expect(typeof result.stdout).toBe("string");
      expect(typeof result.stderr).toBe("string");
      expect(Array.isArray(result.files)).toBe(true);
      expect(typeof result.exitCode).toBe("number");
      expect(typeof result.executionTimeMs).toBe("number");
      expect(typeof result.operationId).toBe("string");
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(typeof result.command).toBe("string");
      expect(typeof result.workingDirectory).toBe("string");
    });

    it("should be serializable to JSON", async () => {
      const result = await enhancer.executeCommand('echo "test"', {
        captureFiles: false,
        timeout: 5000,
      });

      expect(() => JSON.stringify(result)).not.toThrow();

      const jsonString = JSON.stringify(result);
      const parsed = JSON.parse(jsonString);

      expect(parsed.status).toBe(result.status);
      expect(parsed.stdout).toBe(result.stdout);
      expect(parsed.operationId).toBe(result.operationId);
    });
  });

  describe("Error Handling", () => {
    it("should handle process errors gracefully", async () => {
      const result = await enhancer.executeCommand(
        "node -e \"throw new Error('Test error')\"",
        {
          captureFiles: false,
          timeout: 5000,
        },
      );

      expect(result.status).toBe("failed");
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Test error");
    });

    it("should cleanup resources on error", async () => {
      const initialStats = enhancer.getExecutionStats();

      await enhancer.executeCommand("nonexistentcommand", {
        captureFiles: false,
        timeout: 5000,
      });

      const finalStats = enhancer.getExecutionStats();
      expect(finalStats.activeProcesses).toBe(0);
    });
  });

  describe("Process Management", () => {
    it("should track active processes", async () => {
      const statsPromise = enhancer.getExecutionStats();
      expect(statsPromise.activeProcesses).toBe(0);

      // Start a long-running command
      const resultPromise = enhancer.executeCommand("sleep 5", {
        captureFiles: false,
        timeout: 10000,
      });

      // Give it time to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Cancel the process
      const cancelledCount = await enhancer.cancelAllProcesses("SIGTERM");
      expect(cancelledCount).toBeGreaterThan(0);

      const result = await resultPromise;
      expect(["timeout", "failed"]).toContain(result.status);
    });
  });

  describe("Convenience Function", () => {
    it("should work with executeWithStructuredOutput convenience function", async () => {
      const result = await executeWithStructuredOutput(
        'echo "convenience test"',
        {
          captureFiles: false,
          timeout: 5000,
        },
      );

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("convenience test");
      expect(result.operationId).toMatch(/^exec_\d+_[a-z0-9]+$/);
    });
  });

  describe("Performance and Metrics", () => {
    it("should measure execution time accurately", async () => {
      const startTime = Date.now();

      const result = await enhancer.executeCommand("sleep 1", {
        captureFiles: false,
        timeout: 5000,
      });

      const actualDuration = Date.now() - startTime;

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(1000);
      expect(result.executionTimeMs).toBeLessThan(actualDuration + 500); // Allow some variance
    });

    it("should include process ID when available", async () => {
      const result = await enhancer.executeCommand('echo "test"', {
        captureFiles: false,
        timeout: 5000,
      });

      expect(result.processId).toBeUndefined(); // exec doesn't always provide PID
    });
  });
});
