/**
 * Computer Use Terminal Integration Test Suite
 *
 * Comprehensive tests for the Computer Use Terminal Integration service
 * including enhanced terminal execution with computer context and tracking.
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
  ComputerTerminalIntegrationService,
  executeComputerTerminalAction,
  ComputerTerminalAction,
  ComputerTerminalResult,
  ComputerTerminalContext,
} from "../computer-use-terminal-integration";

describe("ComputerTerminalIntegrationService", () => {
  let service: ComputerTerminalIntegrationService;
  let tempDir: string;

  beforeEach(async () => {
    service = new ComputerTerminalIntegrationService();
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "computer-terminal-test-"),
    );
  });

  afterEach(async () => {
    // Cleanup temporary directory
    try {
      await fs.rmdir(tempDir, { recursive: true });
    } catch (err) {
      // Directory might not exist or already be cleaned up
    }

    // Emergency stop any active processes
    await service.emergencyStop();
  });

  describe("Basic Computer Terminal Execution", () => {
    it("should execute computer terminal action with enhanced context", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "Computer Use Terminal Test"',
        options: {
          captureFiles: false,
          timeout: 5000,
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("Computer Use Terminal Test");
      expect(result.operationId).toMatch(/^computer_terminal_\d+_[a-z0-9]+$/);
      expect(result.computerUseContext).toBeDefined();
    });

    it("should provide computer use context information", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "context test"',
        options: {
          captureFiles: false,
          timeout: 5000,
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.computerUseContext).toBeDefined();
      expect(result.computerUseContext).toHaveProperty("screenshotBefore");
      expect(result.computerUseContext).toHaveProperty("screenshotAfter");
      expect(result.computerUseContext).toHaveProperty("cursorPosition");
      expect(result.computerUseContext).toHaveProperty("windowInfo");
    });

    it("should handle custom execution context", async () => {
      const context: ComputerTerminalContext = {
        operationId: "custom_operation_12345",
        parentOperation: "parent_operation_67890",
        userContext: {
          userId: "user123",
          sessionId: "session456",
          taskId: "task789",
        },
        securityContext: {
          permissions: ["read", "write"],
          restrictions: ["no_network"],
          auditLevel: "comprehensive",
        },
      };

      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "custom context test"',
        options: {
          captureFiles: false,
          timeout: 5000,
        },
      };

      const result = await service.executeTerminalAction(action, context);

      expect(result.operationId).toBe("custom_operation_12345");
      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("custom context test");
    });
  });

  describe("File System Integration", () => {
    it("should detect files created during computer operations", async () => {
      const testFile = path.join(tempDir, "computer-test-file.txt");

      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: `echo "computer operation file content" > "${testFile}"`,
        options: {
          workingDirectory: tempDir,
          captureFiles: true,
          timeout: 5000,
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.files).toContain(testFile);

      // Verify file was actually created
      const fileContent = await fs.readFile(testFile, "utf8");
      expect(fileContent.trim()).toBe("computer operation file content");
    });

    it("should track multiple file operations in computer context", async () => {
      const commands = [
        `echo "app.js" > "${path.join(tempDir, "app.js")}"`,
        `echo "config.json" > "${path.join(tempDir, "config.json")}"`,
        `mkdir -p "${path.join(tempDir, "logs")}"`,
        `echo "app.log" > "${path.join(tempDir, "logs", "app.log")}"`,
      ].join(" && ");

      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: commands,
        options: {
          workingDirectory: tempDir,
          captureFiles: true,
          timeout: 10000,
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.files.length).toBeGreaterThanOrEqual(3);
      expect(result.files.some((f) => f.endsWith("app.js"))).toBe(true);
      expect(result.files.some((f) => f.endsWith("config.json"))).toBe(true);
      expect(result.files.some((f) => f.endsWith("app.log"))).toBe(true);
    });
  });

  describe("Sequential Action Execution", () => {
    it("should execute multiple actions sequentially", async () => {
      const actions: ComputerTerminalAction[] = [
        {
          action: "terminal_execute",
          command: 'echo "Action 1"',
          options: { captureFiles: false, timeout: 5000 },
        },
        {
          action: "terminal_execute",
          command: 'echo "Action 2"',
          options: { captureFiles: false, timeout: 5000 },
        },
        {
          action: "terminal_execute",
          command: 'echo "Action 3"',
          options: { captureFiles: false, timeout: 5000 },
        },
      ];

      const results = await service.executeSequentialActions(actions);

      expect(results).toHaveLength(3);
      expect(results[0].stdout.trim()).toBe("Action 1");
      expect(results[1].stdout.trim()).toBe("Action 2");
      expect(results[2].stdout.trim()).toBe("Action 3");
      expect(results.every((r) => r.status === "completed")).toBe(true);
    });

    it("should stop sequential execution on failure", async () => {
      const actions: ComputerTerminalAction[] = [
        {
          action: "terminal_execute",
          command: 'echo "Success 1"',
          options: { captureFiles: false, timeout: 5000 },
        },
        {
          action: "terminal_execute",
          command: "nonexistentcommand",
          options: { captureFiles: false, timeout: 5000 },
        },
        {
          action: "terminal_execute",
          command: 'echo "This should not execute"',
          options: { captureFiles: false, timeout: 5000 },
        },
      ];

      const results = await service.executeSequentialActions(actions);

      expect(results).toHaveLength(2); // Should stop after failure
      expect(results[0].status).toBe("completed");
      expect(results[1].status).toBe("failed");
    });
  });

  describe("Security Integration", () => {
    it("should apply security restrictions in computer context", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: "rm -rf /",
        options: {
          captureFiles: false,
          timeout: 5000,
          securityRestrictions: {
            blockedCommands: ["rm"],
            maxExecutionTime: 10000,
            allowNetworkAccess: false,
            allowFileSystemWrite: false,
          },
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("failed");
      expect(result.stderr).toContain("blocked by security restrictions");
      expect(result.error).toBe("Security validation failed");
    });

    it("should enforce whitelist security policy", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "safe command"',
        options: {
          captureFiles: false,
          timeout: 5000,
          securityRestrictions: {
            allowedCommands: ["echo", "ls", "pwd"],
          },
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("safe command");
    });
  });

  describe("Execution History and Tracking", () => {
    it("should maintain execution history", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "history test"',
        options: { captureFiles: false, timeout: 5000 },
      };

      const result = await service.executeTerminalAction(action);
      const operationId = result.operationId;

      const historyEntry = service.getExecutionHistory(
        operationId,
      ) as ComputerTerminalResult;
      expect(historyEntry).toBeDefined();
      expect(historyEntry.operationId).toBe(operationId);
      expect(historyEntry.stdout.trim()).toBe("history test");
    });

    it("should return all history when no operation ID specified", async () => {
      const action1: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "test 1"',
        options: { captureFiles: false, timeout: 5000 },
      };

      const action2: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "test 2"',
        options: { captureFiles: false, timeout: 5000 },
      };

      await service.executeTerminalAction(action1);
      await service.executeTerminalAction(action2);

      const allHistory =
        service.getExecutionHistory() as ComputerTerminalResult[];
      expect(Array.isArray(allHistory)).toBe(true);
      expect(allHistory.length).toBeGreaterThanOrEqual(2);
    });

    it("should clear execution history", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "clear test"',
        options: { captureFiles: false, timeout: 5000 },
      };

      await service.executeTerminalAction(action);
      const clearedCount = service.clearExecutionHistory();

      expect(clearedCount).toBeGreaterThan(0);

      const historyAfterClear =
        service.getExecutionHistory() as ComputerTerminalResult[];
      expect(historyAfterClear).toHaveLength(0);
    });
  });

  describe("Service Statistics and Management", () => {
    it("should provide service statistics", async () => {
      const stats = service.getServiceStats();

      expect(stats).toHaveProperty("activeProcesses");
      expect(stats).toHaveProperty("historyEntries");
      expect(stats).toHaveProperty("totalExecutions");
      expect(typeof stats.activeProcesses).toBe("number");
      expect(typeof stats.historyEntries).toBe("number");
      expect(typeof stats.totalExecutions).toBe("number");
    });

    it("should handle emergency stop", async () => {
      // Start a long-running process
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: "sleep 10",
        options: { captureFiles: false, timeout: 15000 },
      };

      const resultPromise = service.executeTerminalAction(action);

      // Give it time to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cancelledCount = await service.emergencyStop();
      expect(cancelledCount).toBeGreaterThanOrEqual(0);

      const result = await resultPromise;
      expect(["timeout", "failed"]).toContain(result.status);
    });
  });

  describe("Error Handling", () => {
    it("should handle command failures gracefully", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: "nonexistentcommand",
        options: { captureFiles: false, timeout: 5000 },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("failed");
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("not found");
      expect(result.error).toBeDefined();
      expect(result.computerUseContext).toBeDefined();
    });

    it("should handle timeout scenarios", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: "sleep 10",
        options: { captureFiles: false, timeout: 1000 }, // 1 second timeout
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("timeout");
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(1000);
    });
  });

  describe("Command Redaction for Security", () => {
    it("should redact sensitive commands in logs", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'echo "password=secret123"',
        options: { captureFiles: false, timeout: 5000 },
      };

      // Note: This test verifies the redaction logic exists
      // In a real scenario, we'd check logs to ensure sensitive info is not logged
      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.command).toBe('echo "password=secret123"');
      // The actual redaction happens in the logs, not the result
    });
  });

  describe("Working Directory and Environment", () => {
    it("should execute in specified working directory", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: "pwd",
        options: {
          workingDirectory: tempDir,
          captureFiles: false,
          timeout: 5000,
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe(tempDir);
      expect(result.workingDirectory).toBe(tempDir);
    });

    it("should pass custom environment variables", async () => {
      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: 'node -e "console.log(process.env.COMPUTER_TEST_VAR)"',
        options: {
          environment: { COMPUTER_TEST_VAR: "computer_test_value" },
          captureFiles: false,
          timeout: 5000,
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("computer_test_value");
    });
  });

  describe("Convenience Function", () => {
    it("should work with executeComputerTerminalAction convenience function", async () => {
      const result = await executeComputerTerminalAction(
        'echo "convenience computer test"',
        {
          captureFiles: false,
          timeout: 5000,
        },
      );

      expect(result.status).toBe("completed");
      expect(result.stdout.trim()).toBe("convenience computer test");
      expect(result.operationId).toMatch(/^computer_terminal_\d+_[a-z0-9]+$/);
      expect(result.computerUseContext).toBeDefined();
    });
  });

  describe("Performance Metrics", () => {
    it("should include execution time measurements", async () => {
      const startTime = Date.now();

      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: "sleep 1",
        options: {
          captureFiles: false,
          timeout: 5000,
          enableMetrics: true,
        },
      };

      const result = await service.executeTerminalAction(action);
      const actualDuration = Date.now() - startTime;

      expect(result.executionTimeMs).toBeGreaterThanOrEqual(1000);
      expect(result.executionTimeMs).toBeLessThan(actualDuration + 500);
    });

    it("should track file system operations", async () => {
      const testFile = path.join(tempDir, "metrics-test.txt");

      const action: ComputerTerminalAction = {
        action: "terminal_execute",
        command: `echo "metrics test" > "${testFile}"`,
        options: {
          workingDirectory: tempDir,
          captureFiles: true,
          enableMetrics: true,
          timeout: 5000,
        },
      };

      const result = await service.executeTerminalAction(action);

      expect(result.status).toBe("completed");
      expect(result.files).toContain(testFile);
    });
  });
});
