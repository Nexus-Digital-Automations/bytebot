/**
 * OWASP Top 10 Detection Engine Integration Service
 *
 * TypeScript integration layer for the comprehensive OWASP Top 10 vulnerability detection engine.
 * Provides local-only scanning capabilities with integration to existing Bytebot security infrastructure.
 *
 * Features:
 * - Complete OWASP Top 10 2021/2024 vulnerability detection
 * - Multi-protocol scanning (HTTP/HTTPS/TCP/UDP)
 * - Machine learning enhanced detection
 * - Real-time threat intelligence
 * - Comprehensive reporting and remediation guidance
 * - Integration with existing security framework
 *
 * @author Enterprise Security Team
 * @version 2.0.0 - OWASP Top 10 Integration Service
 */

import { Injectable, Logger } from "@nestjs/common";
import { spawn, ChildProcess } from "child_process";
import { promises as fs } from "fs";
import { join, resolve } from "path";
import { randomBytes } from "crypto";
import { performance } from "perf_hooks";

// ===========================
// TYPES AND INTERFACES
// ===========================

/* eslint-disable no-unused-vars -- Enum values are used via Object.values() and type annotations throughout the codebase */
export enum OWASPCategory {
  A01_BROKEN_ACCESS_CONTROL = "A01:2021-Broken Access Control",
  A02_CRYPTOGRAPHIC_FAILURES = "A02:2021-Cryptographic Failures",
  A03_INJECTION = "A03:2021-Injection",
  A04_INSECURE_DESIGN = "A04:2021-Insecure Design",
  A05_SECURITY_MISCONFIGURATION = "A05:2021-Security Misconfiguration",
  A06_VULNERABLE_COMPONENTS = "A06:2021-Vulnerable and Outdated Components",
  A07_IDENTIFICATION_AUTHENTICATION_FAILURES = "A07:2021-Identification and Authentication Failures",
  A08_SOFTWARE_DATA_INTEGRITY_FAILURES = "A08:2021-Software and Data Integrity Failures",
  A09_SECURITY_LOGGING_MONITORING_FAILURES = "A09:2021-Security Logging and Monitoring Failures",
  A10_SERVER_SIDE_REQUEST_FORGERY = "A10:2021-Server-Side Request Forgery (SSRF)",
}

export enum VulnerabilitySeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

export enum ScanType {
  WEB_APPLICATION = "web_application",
  API = "api",
  NETWORK = "network",
  DATABASE = "database",
  CONFIGURATION = "configuration",
  SOURCE_CODE = "source_code",
}

export enum DetectionMethod {
  SIGNATURE = "signature",
  BEHAVIORAL = "behavioral",
  MACHINE_LEARNING = "machine_learning",
  HEURISTIC = "heuristic",
  STATIC_ANALYSIS = "static_analysis",
  DYNAMIC_ANALYSIS = "dynamic_analysis",
}
/* eslint-enable no-unused-vars */

export interface DetectedVulnerability {
  id: string;
  signature_id: string;
  owasp_category: OWASPCategory;
  severity: VulnerabilitySeverity;
  name: string;
  description: string;
  location: string;
  evidence: string;
  confidence: number;
  risk_score: number;
  detection_method: DetectionMethod;
  remediation_guidance: string[];
  references: string[];
  cwe_id?: string;
  cvss_vector?: string;
  affected_urls: string[];
  affected_parameters: string[];
  payload_used?: string;
  response_evidence?: string;
  false_positive_likelihood: number;
  verified: boolean;
  detected_at: Date;
  last_seen: Date;
}

export interface ScanConfiguration {
  target: string;
  scan_types: ScanType[];
  owasp_categories: OWASPCategory[];
  depth: number;
  timeout: number;
  concurrent_requests: number;
  user_agent: string;
  authentication?: Record<string, string>;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  exclude_patterns: string[];
  include_patterns: string[];
  follow_redirects: boolean;
  verify_ssl: boolean;
  rate_limit: number;
  enable_ml_detection: boolean;
  enable_active_scanning: boolean;
  enable_passive_scanning: boolean;
  report_format: string;
}

export interface ScanResult {
  scan_id: string;
  target: string;
  configuration: ScanConfiguration;
  vulnerabilities: DetectedVulnerability[];
  statistics: {
    total_vulnerabilities: number;
    scan_duration_seconds: number;
    vulnerabilities_per_second: number;
    severity_distribution: Record<string, number>;
    owasp_category_distribution: Record<string, number>;
    detection_method_distribution: Record<string, number>;
    confidence_metrics: {
      average_confidence: number;
      high_confidence_count: number;
      high_confidence_percentage: number;
    };
    risk_metrics: {
      average_risk_score: number;
      high_risk_count: number;
      high_risk_percentage: number;
    };
    verified_vulnerabilities: number;
    unique_cwe_ids: number;
  };
  scan_duration: number;
  started_at: Date;
  completed_at: Date;
  status: string;
  error_message?: string;
  coverage_analysis: {
    owasp_categories_tested: number;
    owasp_categories_with_findings: number;
    coverage_percentage: number;
    signatures_tested: number;
    signatures_triggered: number;
    signature_effectiveness: number;
    scan_types_executed: string[];
    active_scanning_enabled: boolean;
    passive_scanning_enabled: boolean;
    ml_detection_enabled: boolean;
  };
  risk_assessment: {
    overall_risk_level: string;
    risk_score: number;
    max_risk_score: number;
    critical_issues: number;
    high_issues: number;
    verified_issues: number;
    immediate_action_required: boolean;
    recommendations: string[];
    affected_owasp_categories: number;
    top_risk_categories: string[];
  };
}

export interface VulnerabilitySignature {
  id: string;
  name: string;
  owasp_category: OWASPCategory;
  severity: VulnerabilitySeverity;
  pattern: string;
  pattern_type: string;
  description: string;
  references: string[];
  cwe_id?: string;
  cvss_score?: number;
  remediation?: string;
  false_positive_rate: number;
  confidence: number;
  created_at: Date;
  updated_at: Date;
}

export interface EngineStatus {
  engine_running: boolean;
  active_scans: string[];
  total_scans_performed: number;
  total_vulnerabilities_found: number;
  signature_count: number;
  scan_history_count: number;
  average_vulnerabilities_per_scan: number;
  latest_scans: Array<{
    scan_id: string;
    target: string;
    vulnerabilities_found: number;
    duration: number;
    completed_at: string;
  }>;
}

// ===========================
// OWASP TOP 10 INTEGRATION SERVICE
// ===========================

/**
 * Static configuration to ensure all enum values are properly registered
 * This helps ESLint understand that all enum values are intentionally used
 */
const SUPPORTED_OWASP_CATEGORIES = [
  OWASPCategory.A01_BROKEN_ACCESS_CONTROL,
  OWASPCategory.A02_CRYPTOGRAPHIC_FAILURES,
  OWASPCategory.A03_INJECTION,
  OWASPCategory.A04_INSECURE_DESIGN,
  OWASPCategory.A05_SECURITY_MISCONFIGURATION,
  OWASPCategory.A06_VULNERABLE_COMPONENTS,
  OWASPCategory.A07_IDENTIFICATION_AUTHENTICATION_FAILURES,
  OWASPCategory.A08_SOFTWARE_DATA_INTEGRITY_FAILURES,
  OWASPCategory.A09_SECURITY_LOGGING_MONITORING_FAILURES,
  OWASPCategory.A10_SERVER_SIDE_REQUEST_FORGERY,
] as const;

const SUPPORTED_VULNERABILITY_SEVERITIES = [
  VulnerabilitySeverity.CRITICAL,
  VulnerabilitySeverity.HIGH,
  VulnerabilitySeverity.MEDIUM,
  VulnerabilitySeverity.LOW,
  VulnerabilitySeverity.INFO,
] as const;

const SUPPORTED_SCAN_TYPES = [
  ScanType.WEB_APPLICATION,
  ScanType.API,
  ScanType.NETWORK,
  ScanType.DATABASE,
  ScanType.CONFIGURATION,
  ScanType.SOURCE_CODE,
] as const;

const SUPPORTED_DETECTION_METHODS = [
  DetectionMethod.SIGNATURE,
  DetectionMethod.BEHAVIORAL,
  DetectionMethod.MACHINE_LEARNING,
  DetectionMethod.HEURISTIC,
  DetectionMethod.STATIC_ANALYSIS,
  DetectionMethod.DYNAMIC_ANALYSIS,
] as const;

@Injectable()
export class OWASPTop10IntegrationService {
  private readonly logger = new Logger(OWASPTop10IntegrationService.name);
  private readonly pythonEnginePath = resolve(
    "/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/orchestrator/security/owasp_top10_detection_engine.py",
  );
  private readonly reportsDir = resolve(
    "/Users/jeremyparker/Desktop/Claude Coding Projects/AIgent/logs/owasp_reports",
  );
  private activeProcesses = new Map<string, ChildProcess>();
  private scanResults = new Map<string, ScanResult>();

  constructor() {
    this.logger.log("OWASP Top 10 Integration Service initialized");
    void this.ensureReportsDirectory();

    // Log supported configurations to ensure enum usage is detected by ESLint
    this.logger.debug(
      `Initialized with ${SUPPORTED_OWASP_CATEGORIES.length} OWASP categories, ` +
        `${SUPPORTED_VULNERABILITY_SEVERITIES.length} severity levels, ` +
        `${SUPPORTED_SCAN_TYPES.length} scan types, and ` +
        `${SUPPORTED_DETECTION_METHODS.length} detection methods`,
    );
  }

  /**
   * Initialize the OWASP detection engine
   */
  async initializeEngine(): Promise<void> {
    this.logger.log("Initializing OWASP Top 10 Detection Engine...");

    try {
      // Ensure Python engine exists
      await this.validateEngineAvailability();

      // Create reports directory
      await this.ensureReportsDirectory();

      this.logger.log("OWASP Top 10 Detection Engine initialized successfully");
    } catch (err) {
      this.logger.error("Failed to initialize OWASP detection engine", err);
      throw new Error(
        `Engine initialization failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Perform comprehensive OWASP Top 10 vulnerability scan
   */
  async scanTarget(configuration: ScanConfiguration): Promise<ScanResult> {
    const scanId = this.generateScanId();
    const startTime = performance.now();

    this.logger.log(
      `Starting OWASP Top 10 scan: ${scanId} for target: ${configuration.target}`,
    );

    try {
      // Validate configuration
      this.validateScanConfiguration(configuration);

      // Prepare scan parameters
      const scanParams = {
        scan_id: scanId,
        target_url: configuration.target,
        max_depth: configuration.depth,
        scan_types: configuration.scan_types.map((type) => type.toString()),
        timeout: configuration.timeout,
      };

      // Execute Python scanning engine
      const result = await this.executePythonScanner(scanParams);

      // Store scan result
      this.scanResults.set(scanId, result);

      const duration = performance.now() - startTime;
      this.logger.log(
        `Scan completed: ${scanId} - Found ${result.vulnerabilities.length} vulnerabilities in ${duration.toFixed(2)}ms`,
      );

      return result;
    } catch (err) {
      this.logger.error(
        `Scan failed: ${scanId} - ${err instanceof Error ? err.message : String(err)}`,
        err,
      );

      // Create error result
      const errorResult: ScanResult = {
        scan_id: scanId,
        target: configuration.target,
        configuration,
        vulnerabilities: [],
        statistics: {
          total_vulnerabilities: 0,
          scan_duration_seconds: (performance.now() - startTime) / 1000,
          vulnerabilities_per_second: 0,
          severity_distribution: {},
          owasp_category_distribution: {},
          detection_method_distribution: {},
          confidence_metrics: {
            average_confidence: 0,
            high_confidence_count: 0,
            high_confidence_percentage: 0,
          },
          risk_metrics: {
            average_risk_score: 0,
            high_risk_count: 0,
            high_risk_percentage: 0,
          },
          verified_vulnerabilities: 0,
          unique_cwe_ids: 0,
        },
        scan_duration: (performance.now() - startTime) / 1000,
        started_at: new Date(),
        completed_at: new Date(),
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
        coverage_analysis: {
          owasp_categories_tested: 0,
          owasp_categories_with_findings: 0,
          coverage_percentage: 0,
          signatures_tested: 0,
          signatures_triggered: 0,
          signature_effectiveness: 0,
          scan_types_executed: [],
          active_scanning_enabled: false,
          passive_scanning_enabled: false,
          ml_detection_enabled: false,
        },
        risk_assessment: {
          overall_risk_level: "unknown",
          risk_score: 0,
          max_risk_score: 0,
          critical_issues: 0,
          high_issues: 0,
          verified_issues: 0,
          immediate_action_required: false,
          recommendations: [
            `Scan failed: ${err instanceof Error ? err.message : String(err)}`,
          ],
          affected_owasp_categories: 0,
          top_risk_categories: [],
        },
      };

      this.scanResults.set(scanId, errorResult);
      return errorResult;
    }
  }

  /**
   * Scan web application for OWASP vulnerabilities
   */
  async scanWebApplication(
    target: string,
    options: Partial<ScanConfiguration> = {},
  ): Promise<ScanResult> {
    const configuration: ScanConfiguration = {
      target,
      scan_types: [ScanType.WEB_APPLICATION],
      owasp_categories: Object.values(OWASPCategory),
      depth: 3,
      timeout: 300,
      concurrent_requests: 10,
      user_agent: "OWASP-Scanner/2.0.0",
      headers: {},
      cookies: {},
      exclude_patterns: [],
      include_patterns: [],
      follow_redirects: true,
      verify_ssl: false,
      rate_limit: 1.0,
      enable_ml_detection: true,
      enable_active_scanning: true,
      enable_passive_scanning: true,
      report_format: "comprehensive",
      ...options,
    };

    return this.scanTarget(configuration);
  }

  /**
   * Scan API endpoints for vulnerabilities
   */
  async scanApi(
    target: string,
    options: Partial<ScanConfiguration> = {},
  ): Promise<ScanResult> {
    const configuration: ScanConfiguration = {
      target,
      scan_types: [ScanType.API],
      owasp_categories: Object.values(OWASPCategory),
      depth: 2,
      timeout: 180,
      concurrent_requests: 5,
      user_agent: "OWASP-API-Scanner/2.0.0",
      headers: {},
      cookies: {},
      exclude_patterns: [],
      include_patterns: [],
      follow_redirects: true,
      verify_ssl: false,
      rate_limit: 2.0,
      enable_ml_detection: true,
      enable_active_scanning: false, // More conservative for APIs
      enable_passive_scanning: true,
      report_format: "comprehensive",
      ...options,
    };

    return this.scanTarget(configuration);
  }

  /**
   * Perform network security scan
   */
  async scanNetwork(
    target: string,
    options: Partial<ScanConfiguration> = {},
  ): Promise<ScanResult> {
    const configuration: ScanConfiguration = {
      target,
      scan_types: [ScanType.NETWORK],
      owasp_categories: [
        OWASPCategory.A02_CRYPTOGRAPHIC_FAILURES,
        OWASPCategory.A05_SECURITY_MISCONFIGURATION,
        OWASPCategory.A06_VULNERABLE_COMPONENTS,
      ],
      depth: 1,
      timeout: 120,
      concurrent_requests: 3,
      user_agent: "OWASP-Network-Scanner/2.0.0",
      headers: {},
      cookies: {},
      exclude_patterns: [],
      include_patterns: [],
      follow_redirects: false,
      verify_ssl: true,
      rate_limit: 3.0,
      enable_ml_detection: false,
      enable_active_scanning: false,
      enable_passive_scanning: true,
      report_format: "comprehensive",
      ...options,
    };

    return this.scanTarget(configuration);
  }

  /**
   * Get scan result by ID
   */
  async getScanResult(scanId: string): Promise<ScanResult | null> {
    const result = this.scanResults.get(scanId);
    if (result) {
      return result;
    }

    // Try loading from file system
    try {
      const reportPath = join(this.reportsDir, `scan_${scanId}.json`);
      const reportData = await fs.readFile(reportPath, "utf-8");
      const loadedResult = JSON.parse(reportData);

      // Parse dates
      loadedResult.started_at = new Date(loadedResult.started_at);
      loadedResult.completed_at = new Date(loadedResult.completed_at);
      loadedResult.vulnerabilities.forEach(
        (
          vuln: DetectedVulnerability & {
            detected_at: string | Date;
            last_seen: string | Date;
          },
        ) => {
          vuln.detected_at = new Date(vuln.detected_at);
          vuln.last_seen = new Date(vuln.last_seen);
        },
      );

      this.scanResults.set(scanId, loadedResult);
      return loadedResult;
    } catch (err) {
      this.logger.warn(
        `Could not load scan result ${scanId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Get active scans
   */
  getActiveScans(): string[] {
    return Array.from(this.activeProcesses.keys());
  }

  /**
   * Get engine status and statistics
   */
  async getEngineStatus(): Promise<EngineStatus> {
    try {
      // Execute status check via Python engine
      const statusData = await this.executePythonCommand(
        "get_engine_statistics",
        {},
      );

      // Type guard for statusData
      const typedStatusData = statusData as {
        total_scans_performed: number;
        total_vulnerabilities_found: number;
        signature_count: number;
        scan_history_count: number;
        average_vulnerabilities_per_scan: number;
        latest_scans: Array<{
          scan_id: string;
          target: string;
          vulnerabilities_found: number;
          duration: number;
          completed_at: string;
        }>;
      };

      return {
        engine_running: true,
        active_scans: this.getActiveScans(),
        ...typedStatusData,
      };
    } catch (err) {
      this.logger.error("Failed to get engine status", err);
      return {
        engine_running: false,
        active_scans: [],
        total_scans_performed: 0,
        total_vulnerabilities_found: 0,
        signature_count: 0,
        scan_history_count: 0,
        average_vulnerabilities_per_scan: 0,
        latest_scans: [],
      };
    }
  }

  /**
   * Generate comprehensive vulnerability report
   */
  async generateReport(
    scanId: string,
    format: "json" | "html" | "csv" = "json",
  ): Promise<string> {
    const result = await this.getScanResult(scanId);
    if (!result) {
      throw new Error(`Scan result not found: ${scanId}`);
    }

    try {
      const reportData = await this.executePythonCommand("generate_report", {
        scan_id: scanId,
        format: format,
      });

      // Type guard and save report to filesystem
      const reportString =
        typeof reportData === "string"
          ? reportData
          : JSON.stringify(reportData);
      const reportPath = join(this.reportsDir, `scan_${scanId}.${format}`);
      await fs.writeFile(reportPath, reportString);

      this.logger.log(`Report generated: ${reportPath}`);
      return reportString;
    } catch (err) {
      this.logger.error(`Report generation failed for ${scanId}`, err);

      // Fallback to basic JSON report
      if (format === "json") {
        return JSON.stringify(result, null, 2);
      }

      throw new Error(
        `Report generation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Add custom vulnerability signature
   */
  async addCustomSignature(
    signature: Omit<VulnerabilitySignature, "id" | "created_at" | "updated_at">,
  ): Promise<string> {
    const signatureId = this.generateSignatureId();
    const fullSignature: VulnerabilitySignature = {
      id: signatureId,
      created_at: new Date(),
      updated_at: new Date(),
      ...signature,
    };

    try {
      await this.executePythonCommand("add_custom_signature", {
        signature: fullSignature,
      });
      this.logger.log(`Custom signature added: ${signatureId}`);
      return signatureId;
    } catch (err) {
      this.logger.error("Failed to add custom signature", err);
      throw new Error(
        `Custom signature creation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Get all vulnerability signatures
   */
  async getSignatures(
    category?: OWASPCategory,
  ): Promise<VulnerabilitySignature[]> {
    try {
      const signaturesResponse = await this.executePythonCommand(
        "get_signatures",
        {
          category,
        },
      );

      // Type guard for signatures array
      const signatures = Array.isArray(signaturesResponse)
        ? (signaturesResponse as VulnerabilitySignature[])
        : [];

      // Parse dates
      signatures.forEach(
        (
          sig: VulnerabilitySignature & {
            created_at: string | Date;
            updated_at: string | Date;
          },
        ) => {
          sig.created_at = new Date(sig.created_at);
          sig.updated_at = new Date(sig.updated_at);
        },
      );

      return signatures;
    } catch (err) {
      this.logger.error("Failed to get signatures", err);
      return [];
    }
  }

  /**
   * Update vulnerability signature
   */
  async updateSignature(
    signatureId: string,
    updates: Partial<VulnerabilitySignature>,
  ): Promise<void> {
    try {
      await this.executePythonCommand("update_signature", {
        signature_id: signatureId,
        updates: {
          ...updates,
          updated_at: new Date().toISOString(),
        },
      });
      this.logger.log(`Signature updated: ${signatureId}`);
    } catch (err) {
      this.logger.error(`Failed to update signature ${signatureId}`, err);
      throw new Error(
        `Signature update failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Cancel active scan
   */
  async cancelScan(scanId: string): Promise<boolean> {
    const process = this.activeProcesses.get(scanId);
    if (process) {
      process.kill("SIGTERM");
      this.activeProcesses.delete(scanId);
      this.logger.log(`Scan cancelled: ${scanId}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up old scan results and reports
   */
  async cleanupOldScans(olderThanDays: number = 30): Promise<number> {
    let cleanedCount = 0;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    try {
      // Clean up in-memory results
      for (const [scanId, result] of Array.from(this.scanResults.entries())) {
        if (result.completed_at < cutoffDate) {
          this.scanResults.delete(scanId);
          cleanedCount++;
        }
      }

      // Clean up report files
      const reportFiles = await fs.readdir(this.reportsDir);
      for (const file of reportFiles) {
        if (file.startsWith("scan_")) {
          const filePath = join(this.reportsDir, file);
          const stats = await fs.stat(filePath);
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        }
      }

      this.logger.log(
        `Cleaned up ${cleanedCount} old scan results and reports`,
      );
      return cleanedCount;
    } catch (err) {
      this.logger.error("Failed to cleanup old scans", err);
      return cleanedCount;
    }
  }

  // ===========================
  // PRIVATE METHODS
  // ===========================

  /**
   * Validate engine availability
   */
  private async validateEngineAvailability(): Promise<void> {
    try {
      await fs.access(this.pythonEnginePath);
    } catch (_err) {
      throw new Error(`Python engine not found at: ${this.pythonEnginePath}`);
    }
  }

  /**
   * Ensure reports directory exists
   */
  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (err) {
      this.logger.error(
        `Failed to create reports directory: ${this.reportsDir}`,
        err,
      );
    }
  }

  /**
   * Validate scan configuration
   */
  private validateScanConfiguration(config: ScanConfiguration): void {
    if (!config.target || typeof config.target !== "string") {
      throw new Error("Target URL is required and must be a string");
    }

    if (!config.scan_types || config.scan_types.length === 0) {
      throw new Error("At least one scan type must be specified");
    }

    if (config.timeout && (config.timeout < 10 || config.timeout > 3600)) {
      throw new Error("Timeout must be between 10 and 3600 seconds");
    }

    if (config.depth && (config.depth < 1 || config.depth > 10)) {
      throw new Error("Depth must be between 1 and 10");
    }

    if (
      config.rate_limit &&
      (config.rate_limit < 0.1 || config.rate_limit > 60)
    ) {
      throw new Error("Rate limit must be between 0.1 and 60 seconds");
    }
  }

  /**
   * Execute Python scanning engine
   */
  private async executePythonScanner(params: {
    scan_id: string;
    target_url: string;
    max_depth: number;
    scan_types: string[];
    timeout: number;
  }): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const process = spawn("python3", [this.pythonEnginePath, "scan"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.activeProcesses.set(params.scan_id, process);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        this.activeProcesses.delete(params.scan_id);

        if (code === 0) {
          try {
            const result = JSON.parse(stdout);

            // Parse dates
            result.started_at = new Date(result.started_at);
            result.completed_at = new Date(result.completed_at);
            result.vulnerabilities.forEach(
              (
                vuln: DetectedVulnerability & {
                  detected_at: string | Date;
                  last_seen: string | Date;
                },
              ) => {
                vuln.detected_at = new Date(vuln.detected_at);
                vuln.last_seen = new Date(vuln.last_seen);
              },
            );

            resolve(result);
          } catch (err) {
            reject(
              new Error(
                `Failed to parse scan result: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
          }
        } else {
          reject(
            new Error(`Python scanner failed with code ${code}: ${stderr}`),
          );
        }
      });

      process.on("error", (error) => {
        this.activeProcesses.delete(params.scan_id);
        reject(new Error(`Failed to execute Python scanner: ${error.message}`));
      });

      // Send parameters to Python process
      process.stdin.write(JSON.stringify(params));
      process.stdin.end();
    });
  }

  /**
   * Execute Python command
   */
  private async executePythonCommand(
    command: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const process = spawn("python3", [this.pythonEnginePath, command], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (err) {
            reject(
              new Error(
                `Failed to parse command result: ${err instanceof Error ? err.message : String(err)}`,
              ),
            );
          }
        } else {
          reject(
            new Error(`Python command failed with code ${code}: ${stderr}`),
          );
        }
      });

      process.on("error", (error) => {
        reject(new Error(`Failed to execute Python command: ${error.message}`));
      });

      // Send parameters to Python process
      process.stdin.write(JSON.stringify(params));
      process.stdin.end();
    });
  }

  /**
   * Generate unique scan ID
   */
  private generateScanId(): string {
    const timestamp = Date.now();
    const random = randomBytes(8).toString("hex");
    return `owasp_scan_${timestamp}_${random}`;
  }

  /**
   * Generate unique signature ID
   */
  private generateSignatureId(): string {
    const timestamp = Date.now();
    const random = randomBytes(6).toString("hex");
    return `CUSTOM-${timestamp}-${random}`;
  }
}

// ===========================
// OWASP SCANNER FACTORY
// ===========================

/**
 * Factory service for creating pre-configured OWASP scanners
 */
@Injectable()
export class OWASPScannerFactory {
  private readonly logger = new Logger(OWASPScannerFactory.name);

  constructor(private readonly _owaspService: OWASPTop10IntegrationService) {}

  /**
   * Create web application scanner with optimized settings
   */
  createWebAppScanner(
    options: {
      enableActiveScanning?: boolean;
      depth?: number;
      rateLimit?: number;
    } = {},
  ): {
    scan: (_target: string) => Promise<ScanResult>;
  } {
    return {
      scan: async (_target: string) => {
        return this._owaspService.scanWebApplication(_target, {
          depth: options.depth ?? 2,
          rate_limit: options.rateLimit ?? 1.0,
          enable_active_scanning: options.enableActiveScanning ?? false,
        });
      },
    };
  }

  /**
   * Create API scanner with conservative settings
   */
  createApiScanner(
    options: {
      authToken?: string;
      customHeaders?: Record<string, string>;
    } = {},
  ): {
    scan: (_target: string) => Promise<ScanResult>;
  } {
    return {
      scan: async (_target: string) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          ...options.customHeaders,
        };

        if (options.authToken) {
          headers["Authorization"] = `Bearer ${options.authToken}`;
        }

        return this._owaspService.scanApi(_target, {
          headers,
          enable_active_scanning: false, // Conservative for APIs
          rate_limit: 2.0, // Slower for APIs
        });
      },
    };
  }

  /**
   * Create network scanner for infrastructure assessment
   */
  createNetworkScanner(): {
    scan: (_target: string) => Promise<ScanResult>;
  } {
    return {
      scan: async (_target: string) => {
        return this._owaspService.scanNetwork(_target, {
          verify_ssl: true,
          rate_limit: 3.0,
        });
      },
    };
  }

  /**
   * Create comprehensive scanner with all scan types
   */
  createComprehensiveScanner(
    options: {
      enableActiveScanning?: boolean;
      depth?: number;
      timeout?: number;
    } = {},
  ): {
    scan: (_target: string) => Promise<ScanResult>;
  } {
    return {
      scan: async (_target: string) => {
        const configuration: ScanConfiguration = {
          target: _target,
          scan_types: Object.values(ScanType),
          owasp_categories: Object.values(OWASPCategory),
          depth: options.depth ?? 3,
          timeout: options.timeout ?? 600,
          concurrent_requests: 5,
          user_agent: "OWASP-Comprehensive-Scanner/2.0.0",
          headers: {},
          cookies: {},
          exclude_patterns: [],
          include_patterns: [],
          follow_redirects: true,
          verify_ssl: false,
          rate_limit: 2.0,
          enable_ml_detection: true,
          enable_active_scanning: options.enableActiveScanning ?? false,
          enable_passive_scanning: true,
          report_format: "comprehensive",
        };

        return this._owaspService.scanTarget(configuration);
      },
    };
  }
}

// ===========================
// EXPORTS
// ===========================

// All types and classes are exported inline above
