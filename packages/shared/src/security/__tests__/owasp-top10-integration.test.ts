/**
 * OWASP Top 10 Integration Service Test Suite
 *
 * Comprehensive test suite for OWASP Top 10 vulnerability detection engine integration.
 * Tests all scanning capabilities, configuration validation, result processing, and error handling.
 *
 * @author Enterprise Security Team
 * @version 2.0.0 - OWASP Integration Tests
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import { spawn, ChildProcess } from "child_process";

import {
  OWASPTop10IntegrationService,
  OWASPScannerFactory,
  OWASPCategory,
  VulnerabilitySeverity,
  ScanType,
  DetectionMethod,
  ScanConfiguration,
  ScanResult,
  DetectedVulnerability,
  VulnerabilitySignature,
  EngineStatus,
} from "../owasp-top10-integration.service";

// Mock child_process
jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

// Mock fs/promises
jest.mock("fs/promises", () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  unlink: jest.fn(),
}));

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
const mockFs = fs as jest.Mocked<typeof fs>;

// Define proper callback types for Node.js events to replace unsafe Function types
type ProcessCloseCallback = (
  code: number | null,
  signal: NodeJS.Signals | null,
) => void;
type ProcessErrorCallback = (error: Error) => void;
type ProcessDataCallback = (data: string | Buffer) => void;
type ProcessEventCallback = (event: string) => void;

// Mock interfaces for proper Jest typing
interface MockStream {
  on: jest.Mock;
  setEncoding?: jest.Mock;
  write?: jest.Mock;
  end?: jest.Mock;
}

interface MockProcess {
  stdout: MockStream;
  stderr: MockStream;
  stdin: MockStream;
  on: jest.Mock;
  kill: jest.Mock;
  [key: string]: unknown;
  stdio?: unknown[];
  killed?: boolean;
  connected?: boolean;
  pid?: number;
  exitCode?: number | null;
  signalCode?: string | null;
  spawnargs?: string[];
  spawnfile?: string;
}

describe("OWASPTop10IntegrationService", () => {
  let service: OWASPTop10IntegrationService;
  let module: TestingModule;
  let mockProcess: MockProcess;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock process with Jest mock functions
    mockProcess = {
      stdout: {
        on: jest.fn(),
        setEncoding: jest.fn(),
      },
      stderr: {
        on: jest.fn(),
      },
      stdin: {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      },
      on: jest.fn(),
      kill: jest.fn(),
      stdio: [null, null, null],
      killed: false,
      connected: true,
      pid: 1234,
      exitCode: null,
      signalCode: null,
      spawnargs: [],
      spawnfile: "",
    };

    mockSpawn.mockReturnValue(mockProcess as unknown as ChildProcess);

    // Mock filesystem operations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    module = await Test.createTestingModule({
      providers: [
        OWASPTop10IntegrationService,
        OWASPScannerFactory,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OWASPTop10IntegrationService>(
      OWASPTop10IntegrationService,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  describe("Service Initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should initialize engine successfully", async () => {
      await expect(service.initializeEngine()).resolves.toBeUndefined();
      expect(mockFs.access).toHaveBeenCalled();
      expect(mockFs.mkdir).toHaveBeenCalled();
    });

    it("should throw error if Python engine is not found", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("File not found"));

      await expect(service.initializeEngine()).rejects.toThrow(
        "Engine initialization failed: Python engine not found",
      );
    });

    it("should create reports directory on initialization", async () => {
      await service.initializeEngine();
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("owasp_reports"),
        { recursive: true },
      );
    });
  });

  describe("Configuration Validation", () => {
    it("should validate correct scan configuration", async () => {
      const config: ScanConfiguration = {
        target: "https://example.com",
        scan_types: [ScanType.WEB_APPLICATION],
        owasp_categories: [OWASPCategory.A03_INJECTION],
        depth: 2,
        timeout: 300,
        concurrent_requests: 5,
        user_agent: "Test Scanner",
        headers: {},
        cookies: {},
        exclude_patterns: [],
        include_patterns: [],
        follow_redirects: true,
        verify_ssl: false,
        rate_limit: 1.0,
        enable_ml_detection: true,
        enable_active_scanning: false,
        enable_passive_scanning: true,
        report_format: "json",
      };

      // Mock successful scan
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  JSON.stringify(createMockScanResult()),
                ),
              5,
            );
          }
        },
      );

      const result = await service.scanTarget(config);
      expect(result).toBeDefined();
      expect(result.target).toBe("https://example.com");
    });

    it("should throw error for invalid target URL", async () => {
      const config: ScanConfiguration = {
        target: "",
        scan_types: [ScanType.WEB_APPLICATION],
        owasp_categories: [OWASPCategory.A03_INJECTION],
        depth: 2,
        timeout: 300,
        concurrent_requests: 5,
        user_agent: "Test Scanner",
        headers: {},
        cookies: {},
        exclude_patterns: [],
        include_patterns: [],
        follow_redirects: true,
        verify_ssl: false,
        rate_limit: 1.0,
        enable_ml_detection: true,
        enable_active_scanning: false,
        enable_passive_scanning: true,
        report_format: "json",
      };

      await expect(service.scanTarget(config)).rejects.toThrow(
        "Target URL is required and must be a string",
      );
    });

    it("should throw error for empty scan types", async () => {
      const config: ScanConfiguration = {
        target: "https://example.com",
        scan_types: [],
        owasp_categories: [OWASPCategory.A03_INJECTION],
        depth: 2,
        timeout: 300,
        concurrent_requests: 5,
        user_agent: "Test Scanner",
        headers: {},
        cookies: {},
        exclude_patterns: [],
        include_patterns: [],
        follow_redirects: true,
        verify_ssl: false,
        rate_limit: 1.0,
        enable_ml_detection: true,
        enable_active_scanning: false,
        enable_passive_scanning: true,
        report_format: "json",
      };

      await expect(service.scanTarget(config)).rejects.toThrow(
        "At least one scan type must be specified",
      );
    });

    it("should throw error for invalid timeout", async () => {
      const config: ScanConfiguration = {
        target: "https://example.com",
        scan_types: [ScanType.WEB_APPLICATION],
        owasp_categories: [OWASPCategory.A03_INJECTION],
        depth: 2,
        timeout: 5, // Too low
        concurrent_requests: 5,
        user_agent: "Test Scanner",
        headers: {},
        cookies: {},
        exclude_patterns: [],
        include_patterns: [],
        follow_redirects: true,
        verify_ssl: false,
        rate_limit: 1.0,
        enable_ml_detection: true,
        enable_active_scanning: false,
        enable_passive_scanning: true,
        report_format: "json",
      };

      await expect(service.scanTarget(config)).rejects.toThrow(
        "Timeout must be between 10 and 3600 seconds",
      );
    });

    it("should throw error for invalid depth", async () => {
      const config: ScanConfiguration = {
        target: "https://example.com",
        scan_types: [ScanType.WEB_APPLICATION],
        owasp_categories: [OWASPCategory.A03_INJECTION],
        depth: 15, // Too high
        timeout: 300,
        concurrent_requests: 5,
        user_agent: "Test Scanner",
        headers: {},
        cookies: {},
        exclude_patterns: [],
        include_patterns: [],
        follow_redirects: true,
        verify_ssl: false,
        rate_limit: 1.0,
        enable_ml_detection: true,
        enable_active_scanning: false,
        enable_passive_scanning: true,
        report_format: "json",
      };

      await expect(service.scanTarget(config)).rejects.toThrow(
        "Depth must be between 1 and 10",
      );
    });

    it("should throw error for invalid rate limit", async () => {
      const config: ScanConfiguration = {
        target: "https://example.com",
        scan_types: [ScanType.WEB_APPLICATION],
        owasp_categories: [OWASPCategory.A03_INJECTION],
        depth: 2,
        timeout: 300,
        concurrent_requests: 5,
        user_agent: "Test Scanner",
        headers: {},
        cookies: {},
        exclude_patterns: [],
        include_patterns: [],
        follow_redirects: true,
        verify_ssl: false,
        rate_limit: 70, // Too high
        enable_ml_detection: true,
        enable_active_scanning: false,
        enable_passive_scanning: true,
        report_format: "json",
      };

      await expect(service.scanTarget(config)).rejects.toThrow(
        "Rate limit must be between 0.1 and 60 seconds",
      );
    });
  });

  describe("Web Application Scanning", () => {
    it("should scan web application with default configuration", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const result = await service.scanWebApplication("https://example.com");

      expect(result).toBeDefined();
      expect(result.target).toBe("https://example.com");
      expect(result.configuration.scan_types).toContain(
        ScanType.WEB_APPLICATION,
      );
      expect(mockSpawn).toHaveBeenCalledWith(
        "python3",
        [expect.stringContaining("owasp_top10_detection_engine.py"), "scan"],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    });

    it("should scan web application with custom options", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const options = {
        depth: 1,
        timeout: 120,
        enable_active_scanning: true,
        headers: { "X-Custom-Header": "test" },
      };

      const result = await service.scanWebApplication(
        "https://example.com",
        options,
      );

      expect(result).toBeDefined();
      expect(result.configuration.depth).toBe(1);
      expect(result.configuration.timeout).toBe(120);
      expect(result.configuration.enable_active_scanning).toBe(true);
      expect(result.configuration.headers["X-Custom-Header"]).toBe("test");
    });
  });

  describe("API Scanning", () => {
    it("should scan API with conservative settings", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const result = await service.scanApi("https://api.example.com");

      expect(result).toBeDefined();
      expect(result.configuration.scan_types).toContain(ScanType.API);
      expect(result.configuration.enable_active_scanning).toBe(false); // Conservative for APIs
      expect(result.configuration.rate_limit).toBe(2.0); // Slower for APIs
    });

    it("should scan API with authentication token", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const options = {
        authentication: {
          type: "bearer",
          token: "test-token-123",
        },
        headers: {
          "X-API-Version": "2.0",
        },
      };

      const result = await service.scanApi("https://api.example.com", options);

      expect(result).toBeDefined();
      expect(result.configuration.headers["X-API-Version"]).toBe("2.0");
    });
  });

  describe("Network Scanning", () => {
    it("should scan network with security-focused categories", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const result = await service.scanNetwork("https://network.example.com");

      expect(result).toBeDefined();
      expect(result.configuration.scan_types).toContain(ScanType.NETWORK);
      expect(result.configuration.owasp_categories).toContain(
        OWASPCategory.A02_CRYPTOGRAPHIC_FAILURES,
      );
      expect(result.configuration.owasp_categories).toContain(
        OWASPCategory.A05_SECURITY_MISCONFIGURATION,
      );
      expect(result.configuration.verify_ssl).toBe(true);
      expect(result.configuration.enable_active_scanning).toBe(false);
    });
  });

  describe("Scan Result Management", () => {
    it("should store and retrieve scan results", async () => {
      const mockResult = createMockScanResult();

      // Mock successful scan
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const result = await service.scanWebApplication("https://example.com");
      const storedResult = await service.getScanResult(result.scan_id);

      expect(storedResult).toBeDefined();
      expect(storedResult?.scan_id).toBe(result.scan_id);
      expect(storedResult?.target).toBe("https://example.com");
    });

    it("should load scan result from filesystem if not in memory", async () => {
      const mockResult = createMockScanResult();
      mockResult.scan_id = "test-scan-id";

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockResult));

      const result = await service.getScanResult("test-scan-id");

      expect(result).toBeDefined();
      expect(result?.scan_id).toBe("test-scan-id");
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("scan_test-scan-id.json"),
        "utf-8",
      );
    });

    it("should return null for non-existent scan", async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error("File not found"));

      const result = await service.getScanResult("non-existent-scan");

      expect(result).toBeNull();
    });

    it("should track active scans", async () => {
      // Create a long-running mock process
      const longRunningProcess = {
        ...mockProcess,
        on: jest
          .fn()
          .mockImplementation(
            (
              event: string,
              callback:
                | ProcessCloseCallback
                | ProcessDataCallback
                | ProcessErrorCallback,
            ) => {
              if (event === "close") {
                // Don't call callback immediately to simulate running scan
              }
            },
          ),
        stdout: {
          on: jest.fn(),
          setEncoding: jest.fn(),
        },
        stderr: {
          on: jest.fn(),
        },
      };

      mockSpawn.mockReturnValueOnce(
        longRunningProcess as unknown as ChildProcess,
      );

      // Start scan without awaiting
      const scanPromise = service.scanWebApplication("https://example.com");

      // Check active scans
      const activeScans = service.getActiveScans();
      expect(activeScans.length).toBeGreaterThan(0);

      // Complete the scan
      longRunningProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      longRunningProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  JSON.stringify(createMockScanResult()),
                ),
              5,
            );
          }
        },
      );

      // Trigger the process completion
      const closeCallback = longRunningProcess.on.mock.calls.find(
        (call) => call[0] === "close",
      )?.[1];
      if (closeCallback) closeCallback(0);

      const stdoutCallback = longRunningProcess.stdout.on.mock.calls.find(
        (call) => call[0] === "data",
      )?.[1];
      if (stdoutCallback)
        stdoutCallback(JSON.stringify(createMockScanResult()));

      await scanPromise;
    });
  });

  describe("Report Generation", () => {
    it("should generate JSON report", async () => {
      const mockResult = createMockScanResult();

      // Mock Python command execution for report generation
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      // First scan to create result
      const scanResult = await service.scanWebApplication(
        "https://example.com",
      );

      // Then generate report
      const report = await service.generateReport(scanResult.scan_id, "json");

      expect(report).toBeDefined();
      expect(typeof report).toBe("string");
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".json"),
        expect.any(String),
      );
    });

    it("should generate HTML report", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  "<html><body>Test Report</body></html>",
                ),
              5,
            );
          }
        },
      );

      const scanResult = await service.scanWebApplication(
        "https://example.com",
      );
      const report = await service.generateReport(scanResult.scan_id, "html");

      expect(report).toBeDefined();
      expect(report).toContain("<html>");
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".html"),
        expect.any(String),
      );
    });

    it("should generate CSV report", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  "ID,Name,Severity\ntest,XSS,high",
                ),
              5,
            );
          }
        },
      );

      const scanResult = await service.scanWebApplication(
        "https://example.com",
      );
      const report = await service.generateReport(scanResult.scan_id, "csv");

      expect(report).toBeDefined();
      expect(report).toContain("ID,Name,Severity");
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".csv"),
        expect.any(String),
      );
    });

    it("should fallback to JSON for failed report generation", async () => {
      const mockResult = createMockScanResult();

      // First successful scan
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const scanResult = await service.scanWebApplication(
        "https://example.com",
      );

      // Mock failed report generation
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(1, null), 10); // Non-zero exit code
          }
        },
      );

      mockProcess.stderr.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)("Report generation failed"),
              5,
            );
          }
        },
      );

      const report = await service.generateReport(scanResult.scan_id, "json");

      expect(report).toBeDefined();
      expect(typeof report).toBe("string");
    });

    it("should throw error for unsupported report format", async () => {
      const mockResult = createMockScanResult();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockResult)),
              5,
            );
          }
        },
      );

      const scanResult = await service.scanWebApplication(
        "https://example.com",
      );

      // Mock report generation failure
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(1, null), 10);
          }
        },
      );

      await expect(
        service.generateReport(
          scanResult.scan_id,
          "xml" as "json" | "html" | "csv",
        ),
      ).rejects.toThrow("Report generation failed");
    });

    it("should throw error for non-existent scan ID", async () => {
      await expect(
        service.generateReport("non-existent-scan-id"),
      ).rejects.toThrow("Scan result not found");
    });
  });

  describe("Signature Management", () => {
    it("should add custom vulnerability signature", async () => {
      const mockSignature = createMockVulnerabilitySignature();

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  JSON.stringify({ success: true }),
                ),
              5,
            );
          }
        },
      );

      const signatureId = await service.addCustomSignature(mockSignature);

      expect(signatureId).toBeDefined();
      expect(signatureId).toContain("CUSTOM-");
    });

    it("should get all signatures", async () => {
      const mockSignatures = [createMockVulnerabilitySignature()];

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  JSON.stringify(mockSignatures),
                ),
              5,
            );
          }
        },
      );

      const signatures = await service.getSignatures();

      expect(signatures).toBeDefined();
      expect(Array.isArray(signatures)).toBe(true);
    });

    it("should get signatures by category", async () => {
      const mockSignatures = [
        createMockVulnerabilitySignature({
          owasp_category: OWASPCategory.A03_INJECTION,
        }),
      ];

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  JSON.stringify(mockSignatures),
                ),
              5,
            );
          }
        },
      );

      const signatures = await service.getSignatures(
        OWASPCategory.A03_INJECTION,
      );

      expect(signatures).toBeDefined();
      expect(signatures.length).toBeGreaterThanOrEqual(0);
    });

    it("should update signature", async () => {
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(
                  JSON.stringify({ success: true }),
                ),
              5,
            );
          }
        },
      );

      const updates = {
        severity: VulnerabilitySeverity.HIGH,
        confidence: 0.95,
      };

      await expect(
        service.updateSignature("test-signature-id", updates),
      ).resolves.toBeUndefined();
    });
  });

  describe("Engine Status", () => {
    it("should get engine status", async () => {
      const mockStatus = {
        total_scans_performed: 10,
        total_vulnerabilities_found: 25,
        signature_count: 100,
        scan_history_count: 10,
        average_vulnerabilities_per_scan: 2.5,
        latest_scans: [],
      };

      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () =>
                (callback as ProcessDataCallback)(JSON.stringify(mockStatus)),
              5,
            );
          }
        },
      );

      const status = await service.getEngineStatus();

      expect(status).toBeDefined();
      expect(status.engine_running).toBe(true);
      expect(typeof status.total_scans_performed).toBe("number");
    });

    it("should handle engine status failure gracefully", async () => {
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(1, null), 10); // Non-zero exit code
          }
        },
      );

      const status = await service.getEngineStatus();

      expect(status.engine_running).toBe(false);
      expect(status.total_scans_performed).toBe(0);
    });
  });

  describe("Scan Cancellation", () => {
    it("should cancel active scan", async () => {
      const longRunningProcess: MockProcess = {
        ...mockProcess,
        kill: jest.fn(),
        on: jest.fn(),
        stdout: {
          on: jest.fn(),
          setEncoding: jest.fn(),
        },
        stderr: {
          on: jest.fn(),
        },
      };

      mockSpawn.mockReturnValueOnce(
        longRunningProcess as unknown as ChildProcess,
      );

      // Start scan without awaiting
      const scanPromise = service.scanWebApplication("https://example.com");

      // Get active scans to find the scan ID
      const activeScans = service.getActiveScans();
      expect(activeScans.length).toBeGreaterThan(0);

      // Cancel the scan
      const cancelled = await service.cancelScan(activeScans[0]);

      expect(cancelled).toBe(true);
      expect(longRunningProcess.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("should return false for non-existent scan cancellation", async () => {
      const cancelled = await service.cancelScan("non-existent-scan");
      expect(cancelled).toBe(false);
    });
  });

  describe("Cleanup Operations", () => {
    it("should cleanup old scan results", async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days old

      mockFs.readdir.mockResolvedValueOnce([
        "scan_old.json",
        "scan_new.json",
      ] as Parameters<typeof mockFs.readdir>[0] extends Promise<infer T>
        ? T
        : never);
      mockFs.stat.mockImplementation((filePath: string) => {
        const isOld = String(filePath).includes("old");
        return Promise.resolve({
          mtime: isOld ? oldDate : new Date(),
        } as Parameters<typeof mockFs.stat>[0] extends Promise<infer T>
          ? T
          : never);
      });
      mockFs.unlink.mockResolvedValue(undefined);

      const cleanedCount = await service.cleanupOldScans(30);

      expect(cleanedCount).toBeGreaterThan(0);
      expect(mockFs.unlink).toHaveBeenCalled();
    });

    it("should handle cleanup errors gracefully", async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error("Directory not found"));

      const cleanedCount = await service.cleanupOldScans(30);

      expect(cleanedCount).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle Python process spawn failure", async () => {
      mockSpawn.mockImplementation(() => {
        const failedProcess = {
          ...mockProcess,
          on: jest
            .fn()
            .mockImplementation(
              (
                event: string,
                callback:
                  | ProcessCloseCallback
                  | ProcessDataCallback
                  | ProcessErrorCallback,
              ) => {
                if (event === "error") {
                  setTimeout(
                    () =>
                      (callback as ProcessErrorCallback)(
                        new Error("Process spawn failed"),
                      ),
                    5,
                  );
                }
              },
            ),
        } as MockProcess;
        return failedProcess as unknown as ChildProcess;
      });

      const result = await service.scanWebApplication("https://example.com");

      expect(result.status).toBe("failed");
      expect(result.error_message).toContain("Process spawn failed");
    });

    it("should handle Python process non-zero exit", async () => {
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(1, null), 10); // Non-zero exit code
          }
        },
      );

      mockProcess.stderr.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () => (callback as ProcessDataCallback)("Python error occurred"),
              5,
            );
          }
        },
      );

      const result = await service.scanWebApplication("https://example.com");

      expect(result.status).toBe("failed");
      expect(result.error_message).toContain("Python scanner failed");
    });

    it("should handle invalid JSON response", async () => {
      mockProcess.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "close") {
            setTimeout(() => (callback as ProcessCloseCallback)(0, null), 10);
          }
        },
      );

      mockProcess.stdout.on.mockImplementation(
        (
          event: string,
          callback:
            | ProcessCloseCallback
            | ProcessDataCallback
            | ProcessErrorCallback,
        ) => {
          if (event === "data") {
            setTimeout(
              () => (callback as ProcessDataCallback)("Invalid JSON response"),
              5,
            );
          }
        },
      );

      const result = await service.scanWebApplication("https://example.com");

      expect(result.status).toBe("failed");
      expect(result.error_message).toContain("Failed to parse scan result");
    });
  });
});

// Test Factory
describe("OWASPScannerFactory", () => {
  let factory: OWASPScannerFactory;
  let service: OWASPTop10IntegrationService;
  let module: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock filesystem operations
    mockFs.access.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);

    module = await Test.createTestingModule({
      providers: [OWASPTop10IntegrationService, OWASPScannerFactory],
    }).compile();

    service = module.get<OWASPTop10IntegrationService>(
      OWASPTop10IntegrationService,
    );
    factory = module.get<OWASPScannerFactory>(OWASPScannerFactory);
  });

  afterEach(async () => {
    await module.close();
  });

  it("should create web app scanner", () => {
    const scanner = factory.createWebAppScanner({
      enableActiveScanning: true,
      depth: 2,
      rateLimit: 0.5,
    });

    expect(scanner).toBeDefined();
    expect(typeof scanner.scan).toBe("function");
  });

  it("should create API scanner", () => {
    const scanner = factory.createApiScanner({
      authToken: "test-token",
      customHeaders: { "X-API-Key": "key123" },
    });

    expect(scanner).toBeDefined();
    expect(typeof scanner.scan).toBe("function");
  });

  it("should create network scanner", () => {
    const scanner = factory.createNetworkScanner();

    expect(scanner).toBeDefined();
    expect(typeof scanner.scan).toBe("function");
  });

  it("should create comprehensive scanner", () => {
    const scanner = factory.createComprehensiveScanner({
      enableActiveScanning: false,
      depth: 3,
      timeout: 600,
    });

    expect(scanner).toBeDefined();
    expect(typeof scanner.scan).toBe("function");
  });
});

// Helper Functions
function createMockScanResult(): ScanResult {
  return {
    scan_id: "test-scan-id",
    target: "https://example.com",
    configuration: {
      target: "https://example.com",
      scan_types: [ScanType.WEB_APPLICATION],
      owasp_categories: [OWASPCategory.A03_INJECTION],
      depth: 2,
      timeout: 300,
      concurrent_requests: 5,
      user_agent: "Test Scanner",
      headers: {},
      cookies: {},
      exclude_patterns: [],
      include_patterns: [],
      follow_redirects: true,
      verify_ssl: false,
      rate_limit: 1.0,
      enable_ml_detection: true,
      enable_active_scanning: false,
      enable_passive_scanning: true,
      report_format: "json",
    },
    vulnerabilities: [createMockVulnerability()],
    statistics: {
      total_vulnerabilities: 1,
      scan_duration_seconds: 10.5,
      vulnerabilities_per_second: 0.095,
      severity_distribution: {
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
        info: 0,
      },
      owasp_category_distribution: {
        [OWASPCategory.A03_INJECTION]: 1,
      },
      detection_method_distribution: {
        signature: 1,
      },
      confidence_metrics: {
        average_confidence: 0.85,
        high_confidence_count: 1,
        high_confidence_percentage: 100,
      },
      risk_metrics: {
        average_risk_score: 8.2,
        high_risk_count: 1,
        high_risk_percentage: 100,
      },
      verified_vulnerabilities: 0,
      unique_cwe_ids: 1,
    },
    scan_duration: 10.5,
    started_at: new Date(),
    completed_at: new Date(),
    status: "completed",
    coverage_analysis: {
      owasp_categories_tested: 1,
      owasp_categories_with_findings: 1,
      coverage_percentage: 100,
      signatures_tested: 50,
      signatures_triggered: 1,
      signature_effectiveness: 2,
      scan_types_executed: ["web_application"],
      active_scanning_enabled: false,
      passive_scanning_enabled: true,
      ml_detection_enabled: true,
    },
    risk_assessment: {
      overall_risk_level: "high",
      risk_score: 8.2,
      max_risk_score: 8.2,
      critical_issues: 0,
      high_issues: 1,
      verified_issues: 0,
      immediate_action_required: true,
      recommendations: ["HIGH PRIORITY: Fix 1 high-severity vulnerabilities"],
      affected_owasp_categories: 1,
      top_risk_categories: ["A03:2021-Injection"],
    },
  };
}

function createMockVulnerability(): DetectedVulnerability {
  return {
    id: "vuln-test-id",
    signature_id: "OWASP-A03-001",
    owasp_category: OWASPCategory.A03_INJECTION,
    severity: VulnerabilitySeverity.HIGH,
    name: "SQL Injection",
    description: "SQL injection vulnerability detected",
    location: "https://example.com/login",
    evidence: "' OR 1=1--",
    confidence: 0.85,
    risk_score: 8.2,
    detection_method: DetectionMethod.SIGNATURE,
    remediation_guidance: ["Use parameterized queries"],
    references: ["https://owasp.org/www-community/attacks/SQL_Injection"],
    cwe_id: "CWE-89",
    cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    affected_urls: ["https://example.com/login"],
    affected_parameters: ["username"],
    payload_used: "' OR 1=1--",
    response_evidence: "mysql_fetch_array() error",
    false_positive_likelihood: 0.1,
    verified: false,
    detected_at: new Date(),
    last_seen: new Date(),
  };
}

function createMockVulnerabilitySignature(
  overrides?: Partial<VulnerabilitySignature>,
): Omit<VulnerabilitySignature, "id" | "created_at" | "updated_at"> {
  return {
    name: "Test SQL Injection",
    owasp_category: OWASPCategory.A03_INJECTION,
    severity: VulnerabilitySeverity.HIGH,
    pattern: "' OR 1=1",
    pattern_type: "regex",
    description: "Test SQL injection pattern",
    references: ["https://owasp.org/test"],
    cwe_id: "CWE-89",
    cvss_score: 8.1,
    remediation: "Use parameterized queries",
    false_positive_rate: 0.05,
    confidence: 0.9,
    ...overrides,
  };
}
