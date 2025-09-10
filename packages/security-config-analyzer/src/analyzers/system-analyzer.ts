/**
 * System-wide Security Configuration Analyzer
 *
 * Comprehensive security analysis for system-wide configurations including
 * environment variables, file permissions, network configuration, process security,
 * and local secrets management validation.
 *
 * @author ByteBot Security Team
 * @version 1.0.0
 */

import { EventEmitter } from "events";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from "crypto";
import * as os from "os";
import { exec } from "child_process";
import { promisify } from "util";
import { glob } from "glob";

/**
 * Type-safe glob function interface
 */
interface GlobOptions {
  cwd?: string;
  absolute?: boolean;
  dot?: boolean;
  maxDepth?: number;
  nodir?: boolean;
}

/**
 * Type-safe wrapper for glob function
 */
const safeGlob = async (
  pattern: string,
  options?: GlobOptions,
): Promise<string[]> => {
  try {
    // Type-safe call with explicit typing
    const result = await (
      glob as (_pattern: string, _options?: GlobOptions) => Promise<string[]>
    )(pattern, options);

    if (Array.isArray(result)) {
      return result.filter((item): item is string => typeof item === "string");
    }

    return [];
  } catch (error: unknown) {
    console.warn(`Glob pattern failed: ${pattern}`, getErrorMessage(error));
    return [];
  }
};
import {
  SecurityFinding,
  SecurityAnalysisResult,
  SecuritySeverity,
  SecurityCategory,
  ConfigurationType,
  FilePermissionAnalysis,
  SystemAnalyzerConfig,
  isCommandResult,
  VulnerabilityAssessment,
  ComplianceReport,
  RemediationRecommendation,
} from "../types/index.js";

/**
 * Type-safe HTTP response structure
 */
interface _HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/**
 * Type-safe file statistics
 */
interface _FileStats {
  mode: number;
  size: number;
  isFile(): boolean;
  isDirectory(): boolean;
}

/**
 * Type-safe command execution result
 */
interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Type guard for checking if error is an Error instance
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type-safe error handler
 */
function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

const execAsync = promisify(exec);

/**
 * System Security Analysis Options
 */
export interface SystemAnalysisOptions {
  /** Target directory or system to analyze */
  target?: string;

  /** Enable file system analysis */
  enableFileSystemAnalysis?: boolean;

  /** Enable environment variable analysis */
  enableEnvironmentAnalysis?: boolean;

  /** Enable network configuration analysis */
  enableNetworkAnalysis?: boolean;

  /** Enable process security analysis */
  enableProcessAnalysis?: boolean;

  /** Enable secrets scanning */
  enableSecretsScanning?: boolean;

  /** Enable system hardening analysis */
  enableHardeningAnalysis?: boolean;

  /** Enable software inventory analysis */
  enableSoftwareInventory?: boolean;

  /** Scan depth for file system analysis */
  scanDepth?: number;

  /** Include system files in analysis */
  includeSystemFiles?: boolean;

  /** Custom paths to analyze */
  customPaths?: string[];

  /** Skip potentially dangerous operations */
  safeMode?: boolean;

  /** Maximum execution time per check (ms) */
  timeout?: number;

  /** Enable privilege escalation checks */
  privilegeEscalationChecks?: boolean;

  /** Platform-specific analysis */
  platform?: "linux" | "darwin" | "win32" | "auto";
}

/**
 * System Process Information
 */
interface SystemProcessInfo {
  pid: number;
  name: string;
  user: string;
  command: string;
  arguments: string[];
  workingDirectory: string;
  environmentVars: Record<string, string>;
  permissions: string[];
  networkConnections: NetworkConnection[];
}

/**
 * Network Connection Information
 */
interface NetworkConnection {
  protocol: string;
  localAddress: string;
  localPort: number;
  remoteAddress?: string;
  remotePort?: number;
  state: string;
}

/**
 * File System Analysis Result
 */
interface _FileSystemAnalysisResult {
  permissions: FilePermissionAnalysis[];
  sensitiveFiles: string[];
  worldWritableFiles: string[];
  setuidFiles: string[];
  setgidFiles: string[];
  noOwnerFiles: string[];
  hiddenFiles: string[];
}

/**
 * System-wide Security Configuration Analyzer
 *
 * Provides comprehensive security analysis capabilities for:
 * - Environment variable security analysis
 * - File permission validation
 * - Network configuration security review
 * - Process security configuration analysis
 * - Local secrets management validation
 */
export class SystemSecurityConfigurationAnalyzer extends EventEmitter {
  private findings: SecurityFinding[] = [];
  private _config: SystemAnalyzerConfig;
  private platform: NodeJS.Platform;

  constructor(config: SystemAnalyzerConfig) {
    super();
    this._config = config;
    this.platform = os.platform();

    // Validate configuration
    if (!config) {
      throw new Error("SystemAnalyzerConfig is required");
    }

    this.emit("analyzer_initialized", {
      analyzer: "SystemSecurityConfigurationAnalyzer",
      version: "1.0.0",
      platform: this.platform,
      capabilities: [
        "Environment variable security analysis",
        "File permission validation",
        "Network configuration security review",
        "Process security configuration analysis",
        "Local secrets management validation",
        "System hardening assessment",
        "Software inventory analysis",
        "Privilege escalation detection",
      ],
    });
  }

  /**
   * Analyze system-wide security configuration
   */
  public async analyzeSystemSecurity(
    options: SystemAnalysisOptions = {},
  ): Promise<SecurityAnalysisResult> {
    this.emit("analysis_started", {
      target: options.target || "system-wide",
      platform: options.platform || this.platform,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();
    this.findings = [];

    // Set platform for analysis
    const analysisPlatform =
      options.platform === "auto" || !options.platform
        ? this.platform
        : options.platform;

    try {
      // Environment Variable Security Analysis
      if (options.enableEnvironmentAnalysis !== false) {
        this.analyzeEnvironmentVariables(options);
      }

      // File System Security Analysis
      if (options.enableFileSystemAnalysis !== false) {
        await this.analyzeFileSystemSecurity(options);
      }

      // Network Configuration Analysis
      if (
        options.enableNetworkAnalysis !== false &&
        analysisPlatform !== "win32"
      ) {
        await this.analyzeNetworkConfiguration(options);
      }

      // Process Security Analysis
      if (options.enableProcessAnalysis !== false) {
        await this.analyzeProcessSecurity(options);
      }

      // Secrets Scanning
      if (options.enableSecretsScanning !== false) {
        await this.scanForSecrets(options);
      }

      // System Hardening Analysis
      if (
        options.enableHardeningAnalysis !== false &&
        analysisPlatform !== "win32"
      ) {
        await this.analyzeSystemHardening(options);
      }

      // Software Inventory Analysis
      if (options.enableSoftwareInventory !== false) {
        await this.analyzeSoftwareInventory(options);
      }

      // Generate comprehensive analysis result
      const analysisResult = this.generateSystemAnalysisResult(
        options,
        startTime,
      );

      this.emit("analysis_completed", {
        target: options.target || "system-wide",
        findingsCount: this.findings.length,
        duration: Date.now() - startTime,
        riskLevel: analysisResult.riskSummary.overall,
      });

      return analysisResult;
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("analysis_error", {
        target: options.target || "system-wide",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      throw _error;
    }
  }

  /**
   * Analyze environment variables for security issues
   */
  private analyzeEnvironmentVariables(_options: SystemAnalysisOptions): void {
    this.emit("environment_analysis_started", {});

    try {
      const envVars: Record<string, string | undefined> = process.env;
      const sensitivePatterns = [
        { pattern: /password/i, type: "Password" },
        { pattern: /secret/i, type: "Secret" },
        { pattern: /key/i, type: "Key" },
        { pattern: /token/i, type: "Token" },
        { pattern: /api[_-]?key/i, type: "API Key" },
        { pattern: /private[_-]?key/i, type: "Private Key" },
        { pattern: /auth/i, type: "Authentication" },
        { pattern: /credential/i, type: "Credential" },
        { pattern: /database[_-]?url/i, type: "Database Connection" },
        { pattern: /connection[_-]?string/i, type: "Connection String" },
      ];

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const urlPattern = /^https?:\/\//;
      const base64Pattern = /^[A-Za-z0-9+/]+=*$/;

      for (const [varName, varValue] of Object.entries(envVars)) {
        if (!varValue || typeof varValue !== "string") continue;

        // Check for sensitive variable names
        for (const { pattern, type } of sensitivePatterns) {
          if (pattern.test(varName)) {
            this.addFinding({
              id: this.generateFindingId(),
              title: `Sensitive Environment Variable: ${type}`,
              description: `Environment variable '${varName}' contains sensitive ${type.toLowerCase()} information`,
              severity: this.getSensitiveVarSeverity(type, varValue),
              category: SecurityCategory.DATA_EXPOSURE,
              configurationType: ConfigurationType.ENVIRONMENT_VARS,
              source: "environment",
              location: `ENV:${varName}`,
              evidence: {
                configType: "env-vars" as const,
                filePath: "environment",
                configKey: varName,
                configValue: type,
              },
              remediation: `Secure ${type.toLowerCase()} in environment variable: Use secure secrets management system, avoid hardcoding sensitive values in environment, consider using encrypted configuration files, implement proper access controls for environment variables`,
              references: [
                "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
                "https://12factor.net/config",
              ],
              cwe_ids: ["CWE-798", "CWE-200"],
              compliance_mappings: {
                OWASP: ["A02:2021 – Cryptographic Failures"],
              },
              confidence_score: 0.8,
              discoveredAt: new Date(),
              riskScore:
                this.getSensitiveVarSeverity(type, varValue) ===
                SecuritySeverity.CRITICAL
                  ? 9.0
                  : this.getSensitiveVarSeverity(type, varValue) ===
                      SecuritySeverity.HIGH
                    ? 7.0
                    : 5.0,
              autoFixable: false,
              false_positive_likelihood: "medium",
            });
            break;
          }
        }

        // Check for specific patterns in values
        if (typeof varValue === "string" && emailPattern.test(varValue)) {
          this.addFinding({
            id: this.generateFindingId(),
            title: "Email Address in Environment Variable",
            description: `Environment variable '${varName}' contains an email address`,
            severity: SecuritySeverity.LOW,
            category: SecurityCategory.DATA_EXPOSURE,
            configurationType: ConfigurationType.ENVIRONMENT_VARS,
            source: "environment",
            location: `ENV:${varName}`,
            evidence: {
              configType: "env-vars" as const,
              filePath: "environment",
              configKey: varName,
              configValue: "email",
            },
            remediation:
              "Review necessity of email address in environment: Verify if email address is necessary in environment variable, consider alternative configuration methods, document legitimate use cases",
            references: [
              "https://owasp.org/www-community/vulnerabilities/Information_Exposure_Through_Environment_Variables",
            ],
            cwe_ids: ["CWE-200"],
            compliance_mappings: {
              OWASP: ["A02:2021 – Cryptographic Failures"],
            },
            confidence_score: 0.6,
            discoveredAt: new Date(),
            riskScore: 3.0,
            autoFixable: false,
            false_positive_likelihood: "high",
          });
        }

        // Check for potential secrets based on value characteristics
        if (
          typeof varValue === "string" &&
          varValue.length > 20 &&
          base64Pattern.test(varValue)
        ) {
          this.addFinding({
            id: this.generateFindingId(),
            title: "Potential Encoded Secret in Environment Variable",
            description: `Environment variable '${varName}' contains what appears to be an encoded secret`,
            severity: SecuritySeverity.MEDIUM,
            category: SecurityCategory.DATA_EXPOSURE,
            configurationType: ConfigurationType.ENVIRONMENT_VARS,
            source: "environment",
            location: `ENV:${varName}`,
            evidence: {
              configType: "env-vars" as const,
              filePath: "environment",
              configKey: varName,
              configValue: "potential_encoded_secret",
            },
            remediation:
              "Verify and secure potential secret: Verify if variable contains sensitive data, use proper secrets management if it's a secret, consider environment-specific configuration",
            references: [
              "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
            ],
            cwe_ids: ["CWE-798"],
            compliance_mappings: {
              OWASP: ["A02:2021 – Cryptographic Failures"],
            },
            confidence_score: 0.5,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "high",
          });
        }

        // Check for database URLs or connection strings
        if (
          typeof varValue === "string" &&
          urlPattern.test(varValue) &&
          varValue.includes("://") &&
          (varValue.includes("@") ||
            varValue.includes("password") ||
            varValue.includes("user="))
        ) {
          this.addFinding({
            id: this.generateFindingId(),
            title: "Database Connection String in Environment Variable",
            description: `Environment variable '${varName}' contains a database connection string with credentials`,
            severity: SecuritySeverity.HIGH,
            category: SecurityCategory.DATA_EXPOSURE,
            configurationType: ConfigurationType.ENVIRONMENT_VARS,
            source: "environment",
            location: `ENV:${varName}`,
            evidence: {
              configType: "env-vars" as const,
              filePath: "environment",
              configKey: varName,
              configValue: "database_connection_string",
            },
            remediation:
              "Secure database connection credentials: Use separate environment variables for connection parameters, implement database credential rotation, use IAM-based database authentication where possible, encrypt connection strings if they must be stored",
            references: [
              "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
            ],
            cwe_ids: ["CWE-798", "CWE-312"],
            compliance_mappings: {
              OWASP: ["A02:2021 – Cryptographic Failures"],
            },
            confidence_score: 0.9,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "low",
          });
        }
      }

      // Check for missing important security environment variables
      const importantSecurityVars = [
        "NODE_ENV",
        "NODE_TLS_REJECT_UNAUTHORIZED",
        "SSL_CERT_PATH",
        "SSL_KEY_PATH",
      ];

      for (const secVar of importantSecurityVars) {
        if (!envVars[secVar] || typeof envVars[secVar] !== "string") {
          this.addFinding({
            id: this.generateFindingId(),
            title: `Missing Security Environment Variable: ${secVar}`,
            description: `Important security environment variable '${secVar}' is not set`,
            severity: SecuritySeverity.LOW,
            category: SecurityCategory.MISCONFIGURATION,
            configurationType: ConfigurationType.ENVIRONMENT_VARS,
            source: "environment",
            location: `ENV:${secVar}`,
            evidence: {
              configType: "env-vars" as const,
              filePath: "environment",
              configKey: secVar,
              configValue: "missing",
            },
            remediation: `Set ${secVar} environment variable appropriately: Define ${secVar} with appropriate value, review application security configuration requirements, document environment variable usage`,
            references: [
              "https://nodejs.org/api/process.html#process_process_env",
            ],
            cwe_ids: ["CWE-16"],
            compliance_mappings: {
              OWASP: ["A05:2021 – Security Misconfiguration"],
            },
            confidence_score: 0.4,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "high",
          });
        }
      }

      // Check for dangerous NODE_TLS_REJECT_UNAUTHORIZED setting
      if (
        typeof envVars.NODE_TLS_REJECT_UNAUTHORIZED === "string" &&
        envVars.NODE_TLS_REJECT_UNAUTHORIZED === "0"
      ) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "TLS Certificate Validation Disabled",
          description:
            "NODE_TLS_REJECT_UNAUTHORIZED is set to '0', which disables TLS certificate validation",
          severity: SecuritySeverity.HIGH,
          category: SecurityCategory.INSECURE_COMMUNICATION,
          configurationType: ConfigurationType.ENVIRONMENT_VARS,
          source: "environment",
          location: "ENV:NODE_TLS_REJECT_UNAUTHORIZED",
          evidence: {
            configType: "env-vars" as const,
            filePath: "environment",
            configKey: "NODE_TLS_REJECT_UNAUTHORIZED",
            configValue: "0",
          },
          remediation:
            "Enable TLS certificate validation: Remove NODE_TLS_REJECT_UNAUTHORIZED=0 setting, fix underlying TLS certificate issues instead, use proper certificate management, test TLS connections after enabling validation",
          references: [
            "https://nodejs.org/api/tls.html#tls_tls_connect_options_callback",
          ],
          cwe_ids: ["CWE-295"],
          compliance_mappings: {
            OWASP: ["A02:2021 – Cryptographic Failures"],
          },
          confidence_score: 0.95,
          discoveredAt: new Date(),
          riskScore: 5.0,
          autoFixable: false,
          false_positive_likelihood: "very_low",
        });
      }
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("environment_analysis_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Analyze file system security
   */
  private async analyzeFileSystemSecurity(
    options: SystemAnalysisOptions,
  ): Promise<void> {
    this.emit("filesystem_analysis_started", {
      target: options.target,
    });

    try {
      const targetPath = options.target || String(process.cwd());
      const scanDepth = options.scanDepth || 3;

      // Analyze file permissions
      await this.analyzeFilePermissions(targetPath, scanDepth, options);

      // Find world-writable files
      await this.findWorldWritableFiles(targetPath, scanDepth, options);

      // Find SUID/SGID files
      if (this.platform !== "win32") {
        await this.findSetuidFiles(targetPath, scanDepth, options);
      }

      // Find sensitive files
      await this.findSensitiveFiles(targetPath, scanDepth, options);

      // Analyze directory permissions
      await this.analyzeDirectoryPermissions(targetPath, scanDepth, options);
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("filesystem_analysis_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Analyze file permissions
   */
  private async analyzeFilePermissions(
    basePath: string,
    depth: number,
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    try {
      const files = await this.findFiles(basePath, depth);

      for (const filePath of files.slice(0, 1000)) {
        // Limit to prevent overwhelming
        if (typeof filePath !== "string") continue;

        try {
          const stats = await fs.stat(filePath);
          const mode = stats.mode;

          // Check for overly permissive files
          if (this.platform !== "win32") {
            const permissions = (mode & parseInt("777", 8)).toString(8);

            // World-writable files
            if (mode & 0o002) {
              this.addFinding({
                id: this.generateFindingId(),
                title: "World-Writable File",
                description: `File is writable by all users: ${filePath}`,
                severity: SecuritySeverity.MEDIUM,
                category: SecurityCategory.ACCESS_CONTROL,
                configurationType: ConfigurationType.FILE_PERMISSIONS,
                source: basePath,
                location: filePath,
                evidence: {
                  filePath,
                  permissions,
                  mode: mode.toString(8),
                },
                remediation: {
                  description: "Restrict file permissions",
                  steps: [
                    `Remove world-write permissions: chmod o-w "${filePath}"`,
                    "Review file ownership and group permissions",
                    "Implement principle of least privilege",
                  ],
                  priority: "medium",
                  effort: "low",
                },
                references: [
                  "https://owasp.org/www-community/vulnerabilities/Insecure_File_Permissions",
                ],
                cwe_ids: ["CWE-732"],
                compliance_mappings: {
                  OWASP: ["A01:2021 – Broken Access Control"],
                },
                confidence_score: 0.8,
                discoveredAt: new Date(),
                riskScore: 5.0,
                autoFixable: false,
                false_positive_likelihood: "low",
              });
            }

            // Check for executable files with unusual permissions
            if (stats.isFile() && mode & 0o111 && mode & 0o022) {
              this.addFinding({
                id: this.generateFindingId(),
                title: "Executable File with Group/World Write Permissions",
                description: `Executable file has group or world write permissions: ${filePath}`,
                severity: SecuritySeverity.HIGH,
                category: SecurityCategory.ACCESS_CONTROL,
                configurationType: ConfigurationType.FILE_PERMISSIONS,
                source: basePath,
                location: filePath,
                evidence: {
                  filePath,
                  permissions,
                  isExecutable: true,
                },
                remediation: {
                  description:
                    "Remove dangerous permissions from executable file",
                  steps: [
                    `Remove group/world write permissions: chmod go-w "${filePath}"`,
                    "Verify file integrity after permission change",
                    "Review why executable needs such permissions",
                  ],
                  priority: "high",
                  effort: "low",
                },
                references: [
                  "https://owasp.org/www-community/vulnerabilities/Insecure_File_Permissions",
                ],
                cwe_ids: ["CWE-732"],
                compliance_mappings: {
                  OWASP: ["A01:2021 – Broken Access Control"],
                },
                confidence_score: 0.9,
                discoveredAt: new Date(),
                riskScore: 5.0,
                autoFixable: false,
                false_positive_likelihood: "low",
              });
            }
          }

          // Check for files without owner (orphaned files)
          try {
            // This would check actual ownership in real implementation
            // const ownerInfo = await this.getFileOwnership(filePath);
            // if (!ownerInfo.owner) { ... }
          } catch (_error) {
            // File ownership check failed
          }
        } catch (_error) {
          // File stat error, skip this file
        }
      }
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("file_permissions_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Find world-writable files
   */
  private async findWorldWritableFiles(
    basePath: string,
    depth: number,
    options: SystemAnalysisOptions,
  ): Promise<void> {
    if (this.platform === "win32") return; // Skip on Windows

    if (typeof basePath !== "string" || typeof depth !== "number") {
      throw new Error(
        "Invalid parameters: basePath must be string, depth must be number",
      );
    }

    try {
      const command = `find "${basePath}" -maxdepth ${depth} -type f -perm -o+w 2>/dev/null | head -100`;
      const result = await execAsync(command, {
        timeout: options.timeout || 10000,
      });

      if (!isCommandResult(result)) {
        throw new Error("Invalid command result format");
      }

      const { stdout } = result;

      const worldWritableFiles = stdout.trim().split("\n").filter(Boolean);

      for (const filePath of worldWritableFiles) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "World-Writable File Detected",
          description: `File is writable by all users: ${filePath}`,
          severity: SecuritySeverity.MEDIUM,
          category: SecurityCategory.ACCESS_CONTROL,
          configurationType: ConfigurationType.FILE_PERMISSIONS,
          source: basePath,
          location: filePath,
          evidence: {
            filePath,
            permissionType: "world-writable",
          },
          remediation: {
            description: "Remove world-write permissions",
            steps: [
              `chmod o-w "${filePath}"`,
              "Review file necessity and ownership",
              "Implement proper access controls",
            ],
            priority: "medium",
            effort: "low",
          },
          references: [
            "https://owasp.org/www-community/vulnerabilities/Insecure_File_Permissions",
          ],
          cwe_ids: ["CWE-732"],
          compliance_mappings: {
            OWASP: ["A01:2021 – Broken Access Control"],
          },
          confidence_score: 0.9,
          discoveredAt: new Date(),
          riskScore: 5.0,
          autoFixable: false,
          false_positive_likelihood: "low",
        });
      }
    } catch (_error) {
      // Command failed, skip this analysis
    }
  }

  /**
   * Find SUID/SGID files
   */
  private async findSetuidFiles(
    basePath: string,
    depth: number,
    options: SystemAnalysisOptions,
  ): Promise<void> {
    try {
      // Find SUID files
      const suidCommand = `find "${basePath}" -maxdepth ${depth} -type f -perm -4000 2>/dev/null | head -50`;
      const suidResult = await execAsync(suidCommand, {
        timeout: options.timeout || 10000,
      });

      if (!isCommandResult(suidResult)) {
        throw new Error("Invalid SUID command result format");
      }

      const { stdout: suidStdout } = suidResult;

      const suidFiles = suidStdout.trim().split("\n").filter(Boolean);

      for (const filePath of suidFiles) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "SUID File Found",
          description: `File has SUID bit set: ${filePath}`,
          severity: SecuritySeverity.MEDIUM,
          category: SecurityCategory.PRIVILEGE_ESCALATION,
          configurationType: ConfigurationType.FILE_PERMISSIONS,
          source: basePath,
          location: filePath,
          evidence: {
            filePath,
            permissionType: "suid",
          },
          remediation: {
            description: "Review SUID file necessity",
            steps: [
              "Verify if SUID permission is necessary",
              "Remove SUID bit if not needed: chmod u-s",
              "Monitor SUID files for security implications",
              "Consider alternative privilege management",
            ],
            priority: "medium",
            effort: "medium",
          },
          references: ["https://owasp.org/www-community/attacks/SUID_Attack"],
          cwe_ids: ["CWE-732", "CWE-250"],
          compliance_mappings: {
            OWASP: ["A01:2021 – Broken Access Control"],
          },
          confidence_score: 0.7,
          discoveredAt: new Date(),
          riskScore: 5.0,
          autoFixable: false,
          false_positive_likelihood: "medium",
        });
      }

      // Find SGID files
      const sgidCommand = `find "${basePath}" -maxdepth ${depth} -type f -perm -2000 2>/dev/null | head -50`;
      const sgidResult = await execAsync(sgidCommand, {
        timeout: options.timeout || 10000,
      });

      if (!isCommandResult(sgidResult)) {
        throw new Error("Invalid SGID command result format");
      }

      const { stdout: sgidStdout } = sgidResult;

      const sgidFiles = sgidStdout.trim().split("\n").filter(Boolean);

      for (const filePath of sgidFiles) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "SGID File Found",
          description: `File has SGID bit set: ${filePath}`,
          severity: SecuritySeverity.LOW,
          category: SecurityCategory.ACCESS_CONTROL,
          configurationType: ConfigurationType.FILE_PERMISSIONS,
          source: basePath,
          location: filePath,
          evidence: {
            filePath,
            permissionType: "sgid",
          },
          remediation: {
            description: "Review SGID file necessity",
            steps: [
              "Verify if SGID permission is necessary",
              "Remove SGID bit if not needed: chmod g-s",
              "Monitor SGID files for security implications",
            ],
            priority: "low",
            effort: "low",
          },
          references: [
            "https://owasp.org/www-community/vulnerabilities/Insecure_File_Permissions",
          ],
          cwe_ids: ["CWE-732"],
          compliance_mappings: {
            OWASP: ["A01:2021 – Broken Access Control"],
          },
          confidence_score: 0.6,
          discoveredAt: new Date(),
          riskScore: 5.0,
          autoFixable: false,
          false_positive_likelihood: "high",
        });
      }
    } catch (_error) {
      // Command failed, skip this analysis
    }
  }

  /**
   * Find sensitive files
   */
  private async findSensitiveFiles(
    basePath: string,
    depth: number,
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    try {
      const sensitivePatterns = [
        "**/*.key",
        "**/*.pem",
        "**/*.p12",
        "**/*.jks",
        "**/.env*",
        "**/id_rsa*",
        "**/id_dsa*",
        "**/id_ecdsa*",
        "**/id_ed25519*",
        "**/.ssh/config",
        "**/.aws/credentials",
        "**/.docker/config.json",
        "**/passwords*",
        "**/secrets*",
        "**/*.kdb*",
        "**/*.pfx",
        "**/shadow*",
        "**/passwd*",
      ];

      const sensitiveFiles: string[] = [];

      for (const pattern of sensitivePatterns) {
        try {
          const matches = await safeGlob(pattern, {
            cwd: basePath,
            absolute: true,
            dot: true, // Include hidden files
            maxDepth: depth,
          });
          sensitiveFiles.push(...matches);
        } catch (_error) {
          // Pattern failed
        }
      }

      for (const filePath of [...new Set(sensitiveFiles)].slice(0, 50)) {
        try {
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) continue;

          const fileName = path.basename(filePath);
          const severity = this.getSensitiveFileSeverity(fileName, filePath);

          this.addFinding({
            id: this.generateFindingId(),
            title: "Sensitive File Found",
            description: `Potentially sensitive file detected: ${fileName}`,
            severity,
            category: SecurityCategory.DATA_EXPOSURE,
            configurationType: ConfigurationType.FILE_PERMISSIONS,
            source: basePath,
            location: filePath,
            evidence: {
              fileName,
              filePath,
              fileSize: stats.size,
            },
            remediation: {
              description: "Secure or remove sensitive file",
              steps: [
                "Review file content and necessity",
                "Remove file if not needed",
                "Restrict file permissions (600 or 400)",
                "Move to secure location if required",
                "Consider encrypted storage for secrets",
              ],
              priority: severity === SecuritySeverity.HIGH ? "high" : "medium",
              effort: "low",
            },
            references: [
              "https://owasp.org/www-community/vulnerabilities/Sensitive_Data_Exposure",
            ],
            cwe_ids: ["CWE-200", "CWE-312"],
            compliance_mappings: {
              OWASP: ["A02:2021 – Cryptographic Failures"],
            },
            confidence_score: 0.6,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "medium",
          });
        } catch (_error) {
          // File access error
        }
      }
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("sensitive_files_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Analyze directory permissions
   */
  private async analyzeDirectoryPermissions(
    basePath: string,
    depth: number,
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    try {
      const directories = await this.findDirectories(basePath, depth);

      for (const dirPath of directories.slice(0, 100)) {
        try {
          const stats = await fs.stat(dirPath);
          if (!stats.isDirectory()) continue;

          if (this.platform !== "win32") {
            const mode = stats.mode;
            const permissions = (mode & parseInt("777", 8)).toString(8);

            // World-writable directories
            if (mode & 0o002) {
              this.addFinding({
                id: this.generateFindingId(),
                title: "World-Writable Directory",
                description: `Directory is writable by all users: ${dirPath}`,
                severity: SecuritySeverity.MEDIUM,
                category: SecurityCategory.ACCESS_CONTROL,
                configurationType: ConfigurationType.FILE_PERMISSIONS,
                source: basePath,
                location: dirPath,
                evidence: {
                  directoryPath: dirPath,
                  permissions,
                },
                remediation: {
                  description: "Restrict directory permissions",
                  steps: [
                    `Remove world-write permissions: chmod o-w "${dirPath}"`,
                    "Review directory ownership",
                    "Implement proper access controls",
                  ],
                  priority: "medium",
                  effort: "low",
                },
                references: [
                  "https://owasp.org/www-community/vulnerabilities/Insecure_File_Permissions",
                ],
                cwe_ids: ["CWE-732"],
                compliance_mappings: {
                  OWASP: ["A01:2021 – Broken Access Control"],
                },
                confidence_score: 0.8,
                discoveredAt: new Date(),
                riskScore: 5.0,
                autoFixable: false,
                false_positive_likelihood: "low",
              });
            }
          }
        } catch (_error) {
          // Directory stat error
        }
      }
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("directory_permissions_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Analyze network configuration
   */
  private async analyzeNetworkConfiguration(
    options: SystemAnalysisOptions,
  ): Promise<void> {
    this.emit("network_analysis_started", {});

    try {
      // Analyze listening ports
      await this.analyzeListeningPorts(options);

      // Check network configuration files
      await this.analyzeNetworkConfigFiles(options);

      // Analyze firewall configuration
      await this.analyzeFirewallConfiguration(options);
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("network_analysis_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Analyze listening ports
   */
  private async analyzeListeningPorts(
    options: SystemAnalysisOptions,
  ): Promise<void> {
    try {
      let command: string;

      switch (this.platform) {
        case "linux":
          command = "ss -tuln";
          break;
        case "darwin":
          command = "netstat -tuln";
          break;
        default:
          return; // Skip for unsupported platforms
      }

      const { stdout }: CommandResult = await execAsync(command, {
        timeout: options.timeout || 10000,
      });
      const lines = stdout.split("\n");

      const listeningPorts: Array<{
        protocol: string;
        address: string;
        port: number;
      }> = [];

      for (const line of lines) {
        if (typeof line !== "string") continue;
        const match = line.match(/^(tcp|udp)\s+\d+\s+\d+\s+([\d.]+|::):(\d+)/);
        if (match && match.length >= 4) {
          const [, protocol, address, port] = match;
          const portNumber = parseInt(port, 10);
          if (!isNaN(portNumber)) {
            listeningPorts.push({
              protocol,
              address,
              port: portNumber,
            });
          }
        }
      }

      // Check for potentially dangerous listening ports
      const dangerousPorts = [
        { port: 23, service: "Telnet", severity: SecuritySeverity.HIGH },
        { port: 21, service: "FTP", severity: SecuritySeverity.MEDIUM },
        { port: 135, service: "RPC", severity: SecuritySeverity.MEDIUM },
        { port: 139, service: "NetBIOS", severity: SecuritySeverity.MEDIUM },
        { port: 445, service: "SMB", severity: SecuritySeverity.MEDIUM },
        {
          port: 1433,
          service: "SQL Server",
          severity: SecuritySeverity.MEDIUM,
        },
        { port: 3389, service: "RDP", severity: SecuritySeverity.MEDIUM },
        { port: 5432, service: "PostgreSQL", severity: SecuritySeverity.LOW },
        { port: 3306, service: "MySQL", severity: SecuritySeverity.LOW },
        { port: 6379, service: "Redis", severity: SecuritySeverity.MEDIUM },
        {
          port: 11211,
          service: "Memcached",
          severity: SecuritySeverity.MEDIUM,
        },
      ];

      for (const listening of listeningPorts) {
        // Check for services listening on all interfaces (0.0.0.0)
        if (listening.address === "0.0.0.0") {
          this.addFinding({
            id: this.generateFindingId(),
            title: "Service Listening on All Interfaces",
            description: `Service listening on all interfaces (0.0.0.0) on port ${listening.port}`,
            severity: SecuritySeverity.MEDIUM,
            category: SecurityCategory.NETWORK_CONFIG,
            configurationType: ConfigurationType.NETWORK_CONFIG,
            source: "network",
            location: `${listening.address}:${listening.port}`,
            evidence: {
              protocol: listening.protocol,
              address: listening.address,
              port: listening.port,
            },
            remediation: {
              description: "Restrict service to specific interfaces",
              steps: [
                "Configure service to listen only on required interfaces",
                "Use localhost (127.0.0.1) for local-only services",
                "Implement firewall rules for additional protection",
                "Review service necessity and configuration",
              ],
              priority: "medium",
              effort: "low",
            },
            references: [
              "https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload",
            ],
            cwe_ids: ["CWE-16"],
            compliance_mappings: {
              OWASP: ["A05:2021 – Security Misconfiguration"],
            },
            confidence_score: 0.7,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "medium",
          });
        }

        // Check for dangerous services
        const dangerousService = dangerousPorts.find(
          (dp) => dp.port === listening.port,
        );
        if (dangerousService) {
          this.addFinding({
            id: this.generateFindingId(),
            title: `Potentially Dangerous Service: ${dangerousService.service}`,
            description: `${dangerousService.service} service is listening on port ${listening.port}`,
            severity: dangerousService.severity,
            category: SecurityCategory.NETWORK_CONFIG,
            configurationType: ConfigurationType.NETWORK_CONFIG,
            source: "network",
            location: `${listening.address}:${listening.port}`,
            evidence: {
              protocol: listening.protocol,
              address: listening.address,
              port: listening.port,
              service: dangerousService.service,
            },
            remediation: {
              description: `Secure or disable ${dangerousService.service} service`,
              steps: [
                `Review necessity of ${dangerousService.service} service`,
                "Implement strong authentication if service is needed",
                "Use encrypted alternatives where possible",
                "Restrict network access with firewall rules",
              ],
              priority:
                dangerousService.severity === SecuritySeverity.HIGH
                  ? "high"
                  : "medium",
              effort: "medium",
            },
            references: [
              "https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload",
            ],
            cwe_ids: ["CWE-16", "CWE-319"],
            compliance_mappings: {
              OWASP: ["A05:2021 – Security Misconfiguration"],
            },
            confidence_score: 0.8,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "low",
          });
        }
      }
    } catch (_error) {
      // Network analysis failed
    }
  }

  /**
   * Analyze network configuration files
   */
  private async analyzeNetworkConfigFiles(
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    const networkConfigFiles = [
      "/etc/network/interfaces",
      "/etc/netplan/*.yaml",
      "/etc/sysconfig/network-scripts/ifcfg-*",
      "/etc/NetworkManager/system-connections/*",
    ];

    for (const configPattern of networkConfigFiles) {
      try {
        const files = await safeGlob(configPattern, {
          absolute: true,
        });

        for (const configFile of files) {
          try {
            const content = await fs.readFile(configFile, "utf-8");

            // Check for hardcoded credentials
            const credentialPatterns = [
              /password\s*[:=]\s*["']?([^"'\n\r]+)["']?/i,
              /psk\s*[:=]\s*["']?([^"'\n\r]+)["']?/i,
              /key\s*[:=]\s*["']?([^"'\n\r]+)["']?/i,
            ];

            for (const pattern of credentialPatterns) {
              if (pattern.test(content)) {
                this.addFinding({
                  id: this.generateFindingId(),
                  title: "Hardcoded Credentials in Network Configuration",
                  description: `Network configuration file contains hardcoded credentials: ${configFile}`,
                  severity: SecuritySeverity.HIGH,
                  category: SecurityCategory.DATA_EXPOSURE,
                  configurationType: ConfigurationType.NETWORK_CONFIG,
                  source: configFile,
                  location: configFile,
                  evidence: {
                    configFile,
                    credentialType: "network_credentials",
                  },
                  remediation: {
                    description: "Secure network credentials",
                    steps: [
                      "Remove hardcoded credentials from configuration files",
                      "Use secure credential storage mechanisms",
                      "Implement proper file permissions for config files",
                      "Consider using certificate-based authentication",
                    ],
                    priority: "high",
                    effort: "medium",
                  },
                  references: [
                    "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
                  ],
                  cwe_ids: ["CWE-798"],
                  compliance_mappings: {
                    OWASP: ["A02:2021 – Cryptographic Failures"],
                  },
                  confidence_score: 0.8,
                  discoveredAt: new Date(),
                  riskScore: 5.0,
                  autoFixable: false,
                  false_positive_likelihood: "low",
                });
                break;
              }
            }
          } catch (_error) {
            // File read error
          }
        }
      } catch (_error) {
        // Glob pattern failed
      }
    }
  }

  /**
   * Analyze firewall configuration
   */
  private async analyzeFirewallConfiguration(
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    try {
      // Check iptables status
      if (this.platform === "linux") {
        try {
          const { stdout } = await execAsync("iptables -L -n", {
            timeout: 5000,
          });

          if (
            stdout.includes("Chain INPUT (policy ACCEPT)") &&
            !stdout.includes("-j DROP") &&
            !stdout.includes("-j REJECT")
          ) {
            this.addFinding({
              id: this.generateFindingId(),
              title: "Permissive Firewall Configuration",
              description:
                "Firewall has a permissive default policy with no restrictive rules",
              severity: SecuritySeverity.MEDIUM,
              category: SecurityCategory.NETWORK_CONFIG,
              configurationType: ConfigurationType.NETWORK_CONFIG,
              source: "firewall",
              location: "/etc/iptables",
              evidence: {
                firewallType: "iptables",
                policy: "permissive",
              },
              remediation: {
                description: "Implement restrictive firewall rules",
                steps: [
                  "Configure firewall to deny by default",
                  "Add specific rules for required services only",
                  "Review and test firewall configuration",
                  "Enable firewall logging for monitoring",
                ],
                priority: "medium",
                effort: "medium",
              },
              references: [
                "https://owasp.org/www-community/vulnerabilities/Unrestricted_File_Upload",
              ],
              cwe_ids: ["CWE-16"],
              compliance_mappings: {
                OWASP: ["A05:2021 – Security Misconfiguration"],
              },
              confidence_score: 0.7,
              discoveredAt: new Date(),
              riskScore: 5.0,
              autoFixable: false,
              false_positive_likelihood: "medium",
            });
          }
        } catch (_error) {
          // iptables command failed
        }
      }
    } catch (_error) {
      // Firewall analysis failed
    }
  }

  /**
   * Analyze process security
   */
  private async analyzeProcessSecurity(
    options: SystemAnalysisOptions,
  ): Promise<void> {
    this.emit("process_analysis_started", {});

    try {
      // Get running processes
      const processes = await this.getRunningProcesses(options);

      // Analyze each process for security issues
      for (const process of processes.slice(0, 50)) {
        // Limit analysis
        this.analyzeProcess(process, options);
      }
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("process_analysis_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Get running processes
   */
  private async getRunningProcesses(
    options: SystemAnalysisOptions,
  ): Promise<SystemProcessInfo[]> {
    const processes: SystemProcessInfo[] = [];

    try {
      let command: string;

      switch (this.platform) {
        case "linux":
          command = "ps auxww";
          break;
        case "darwin":
          command = "ps auxww";
          break;
        default:
          return processes;
      }

      const { stdout }: CommandResult = await execAsync(command, {
        timeout: options.timeout || 10000,
      });
      const lines = stdout.split("\n").slice(1); // Skip header

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const [user, pid, , , , , , , , , ...commandParts] = parts;
          const fullCommand = commandParts.join(" ");
          const [command, ...args] = commandParts;
          const pidNumber = parseInt(pid, 10);

          if (isNaN(pidNumber)) continue;

          processes.push({
            pid: pidNumber,
            name: path.basename(command || "unknown"),
            user: user || "unknown",
            command: fullCommand,
            arguments: args,
            workingDirectory: "", // Would get actual working directory
            environmentVars: {}, // Would get actual environment variables
            permissions: [], // Would get actual permissions
            networkConnections: [], // Would get actual network connections
          });
        }
      }
    } catch (_error) {
      // Process listing failed
    }

    return processes;
  }

  /**
   * Analyze individual process for security issues
   */
  private analyzeProcess(
    process: SystemProcessInfo,
    _options: SystemAnalysisOptions,
  ): void {
    // Check for processes running as root
    if (process.user === "root" && !this.isSystemProcess(process.name)) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Non-System Process Running as Root",
        description: `Process '${process.name}' (PID: ${process.pid}) is running as root`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.PRIVILEGE_ESCALATION,
        configurationType: ConfigurationType.SYSTEM_CONFIG,
        source: "process",
        location: `PID:${process.pid}`,
        evidence: {
          processName: process.name,
          pid: process.pid,
          user: process.user,
          command: process.command.substring(0, 200), // Truncate long commands
        },
        remediation: {
          description: "Run process with minimal privileges",
          steps: [
            "Create dedicated user account for the process",
            "Configure process to run with minimal required privileges",
            "Review process requirements and permissions",
            "Implement proper privilege separation",
          ],
          priority: "medium",
          effort: "medium",
        },
        references: [
          "https://owasp.org/www-community/vulnerabilities/Privilege_Escalation",
        ],
        cwe_ids: ["CWE-250"],
        compliance_mappings: {
          OWASP: ["A01:2021 – Broken Access Control"],
        },
        confidence_score: 0.6,
        discoveredAt: new Date(),
        riskScore: 5.0,
        autoFixable: false,
        false_positive_likelihood: "high",
      });
    }

    // Check for processes with suspicious command line arguments
    const suspiciousPatterns = [
      { pattern: /--insecure/, description: "insecure flag" },
      { pattern: /--disable-security/, description: "security disabled" },
      { pattern: /--allow-root/, description: "root access allowed" },
      { pattern: /--no-verify/, description: "verification disabled" },
      {
        pattern: /password\s*=\s*[^\s]+/i,
        description: "password in command line",
      },
    ];

    for (const { pattern, description } of suspiciousPatterns) {
      if (pattern.test(process.command)) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "Suspicious Process Command Line",
          description: `Process contains suspicious command line argument (${description}): ${process.name}`,
          severity: SecuritySeverity.MEDIUM,
          category: SecurityCategory.MISCONFIGURATION,
          configurationType: ConfigurationType.SYSTEM_CONFIG,
          source: "process",
          location: `PID:${process.pid}`,
          evidence: {
            processName: process.name,
            pid: process.pid,
            suspiciousPattern: description,
            command: process.command.substring(0, 200),
          },
          remediation: {
            description: "Review and secure process configuration",
            steps: [
              "Review process command line arguments",
              "Remove insecure flags and options",
              "Use configuration files instead of command line for sensitive data",
              "Implement proper security configuration",
            ],
            priority: "medium",
            effort: "low",
          },
          references: [
            "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
          ],
          cwe_ids: ["CWE-16", "CWE-200"],
          compliance_mappings: {
            OWASP: ["A05:2021 – Security Misconfiguration"],
          },
          confidence_score: 0.7,
          discoveredAt: new Date(),
          riskScore: 5.0,
          autoFixable: false,
          false_positive_likelihood: "medium",
        });
      }
    }
  }

  /**
   * Check if process is a system process
   */
  private isSystemProcess(processName: string): boolean {
    const systemProcesses = [
      "kernel",
      "kthread",
      "ksoftirq",
      "migration",
      "rcu_",
      "watchdog",
      "systemd",
      "init",
      "kworker",
      "dbus",
      "networkd",
      "resolved",
      "cron",
      "rsyslog",
      "ssh",
      "getty",
    ];

    return systemProcesses.some((sysProc) =>
      processName.toLowerCase().includes(sysProc.toLowerCase()),
    );
  }

  /**
   * Scan for secrets in files
   */
  private async scanForSecrets(options: SystemAnalysisOptions): Promise<void> {
    this.emit("secrets_scanning_started", {
      target: options.target,
    });

    try {
      const targetPath = options.target || String(process.cwd());
      const scanDepth = options.scanDepth || 2;

      const secretPatterns = [
        {
          name: "AWS Access Key",
          pattern: /AKIA[0-9A-Z]{16}/g,
          severity: SecuritySeverity.HIGH,
        },
        {
          name: "AWS Secret Key",
          pattern: /[A-Za-z0-9/+=]{40}/g,
          severity: SecuritySeverity.HIGH,
        },
        {
          name: "GitHub Token",
          pattern: /ghp_[a-zA-Z0-9]{36}/g,
          severity: SecuritySeverity.HIGH,
        },
        {
          name: "Private Key",
          pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/g,
          severity: SecuritySeverity.CRITICAL,
        },
        {
          name: "API Key",
          pattern: /api[_-]?key\s*[:=]\s*["']?([a-zA-Z0-9_-]{20,})["']?/gi,
          severity: SecuritySeverity.HIGH,
        },
        {
          name: "JWT Token",
          pattern: /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/g,
          severity: SecuritySeverity.MEDIUM,
        },
        {
          name: "Database Connection String",
          pattern:
            /(?:mongodb|mysql|postgresql):\/\/[^\s"']+:[^\s"']+@[^\s"']+/gi,
          severity: SecuritySeverity.HIGH,
        },
      ];

      const files = await this.findFiles(targetPath, scanDepth);
      const textFiles = files.filter((f) => this.isTextFile(f)).slice(0, 500); // Limit files

      for (const filePath of textFiles) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const _lines = content.split("\n");

          for (const { name, pattern, severity } of secretPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
              const lineNumber = content
                .substring(0, match.index)
                .split("\n").length;

              this.addFinding({
                id: this.generateFindingId(),
                title: `Secret Found: ${name}`,
                description: `Potential ${name} found in file: ${path.basename(filePath)}`,
                severity,
                category: SecurityCategory.DATA_EXPOSURE,
                configurationType: ConfigurationType.SYSTEM_CONFIG,
                source: targetPath,
                location: `${filePath}:${lineNumber}`,
                evidence: {
                  fileName: path.basename(filePath),
                  filePath,
                  lineNumber,
                  secretType: name,
                  // Don't include actual secret value
                },
                remediation: {
                  description: `Remove ${name} from source code`,
                  steps: [
                    `Remove ${name} from file`,
                    "Use environment variables or secure secret management",
                    "Rotate the exposed secret immediately",
                    "Review git history for previous exposures",
                    "Implement pre-commit hooks to prevent future exposures",
                  ],
                  priority:
                    severity === SecuritySeverity.CRITICAL
                      ? "critical"
                      : "high",
                  effort: "medium",
                },
                references: [
                  "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
                  "https://github.com/awslabs/git-secrets",
                ],
                cwe_ids: ["CWE-798", "CWE-200"],
                compliance_mappings: {
                  OWASP: ["A02:2021 – Cryptographic Failures"],
                },
                confidence_score: 0.8,
                discoveredAt: new Date(),
                riskScore: 5.0,
                autoFixable: false,
                false_positive_likelihood: "low",
              });
            }

            // Reset regex global flag
            pattern.lastIndex = 0;
          }
        } catch (_error) {
          // File read error
        }
      }
    } catch (_error) {
      this.emit("secrets_scanning_error", {
        error: _error instanceof Error ? _error.message : String(_error),
      });
    }
  }

  /**
   * Analyze system hardening
   */
  private async analyzeSystemHardening(
    options: SystemAnalysisOptions,
  ): Promise<void> {
    this.emit("hardening_analysis_started", {});

    try {
      // Check kernel parameters
      await this.analyzeKernelParameters(options);

      // Check system services
      await this.analyzeSystemServices(options);

      // Check user accounts
      await this.analyzeUserAccounts(options);
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("hardening_analysis_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Analyze kernel parameters
   */
  private async analyzeKernelParameters(
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    if (this.platform !== "linux") return;

    try {
      const kernelParams = [
        {
          param: "net.ipv4.ip_forward",
          expectedValue: "0",
          description: "IP forwarding",
        },
        {
          param: "net.ipv4.conf.all.send_redirects",
          expectedValue: "0",
          description: "ICMP redirects",
        },
        {
          param: "net.ipv4.conf.all.accept_redirects",
          expectedValue: "0",
          description: "Accept ICMP redirects",
        },
        {
          param: "kernel.dmesg_restrict",
          expectedValue: "1",
          description: "dmesg restrictions",
        },
        {
          param: "kernel.kptr_restrict",
          expectedValue: "1",
          description: "kernel pointer restrictions",
        },
      ];

      for (const { param, expectedValue, description } of kernelParams) {
        try {
          const { stdout }: CommandResult = await execAsync(`sysctl ${param}`, {
            timeout: 2000,
          });
          const currentValue = stdout.trim().split("=")[1]?.trim();

          if (currentValue !== expectedValue) {
            this.addFinding({
              id: this.generateFindingId(),
              title: `Insecure Kernel Parameter: ${param}`,
              description: `Kernel parameter ${param} (${description}) is not set to secure value`,
              severity: SecuritySeverity.LOW,
              category: SecurityCategory.MISCONFIGURATION,
              configurationType: ConfigurationType.SYSTEM_CONFIG,
              source: "kernel",
              location: `/proc/sys/${param.replace(/\./g, "/")}`,
              evidence: {
                parameter: param,
                currentValue: currentValue || "unknown",
                expectedValue,
                description,
              },
              remediation: {
                description: `Set ${param} to secure value`,
                steps: [
                  `Set parameter: echo "${expectedValue}" > /proc/sys/${param.replace(/\./g, "/")}`,
                  `Make permanent: echo "${param} = ${expectedValue}" >> /etc/sysctl.conf`,
                  "Reload sysctl configuration: sysctl -p",
                ],
                priority: "low",
                effort: "low",
              },
              references: [
                "https://linux-audit.com/linux-server-hardening-most-important-steps-to-secure-a-server/",
              ],
              cwe_ids: ["CWE-16"],
              compliance_mappings: {
                OWASP: ["A05:2021 – Security Misconfiguration"],
              },
              confidence_score: 0.6,
              discoveredAt: new Date(),
              riskScore: 5.0,
              autoFixable: false,
              false_positive_likelihood: "medium",
            });
          }
        } catch (_error) {
          // Parameter check failed
        }
      }
    } catch (_error) {
      // Kernel parameter analysis failed
    }
  }

  /**
   * Analyze system services
   */
  private async analyzeSystemServices(
    options: SystemAnalysisOptions,
  ): Promise<void> {
    if (this.platform !== "linux") return;

    try {
      const { stdout }: CommandResult = await execAsync(
        "systemctl list-units --type=service --state=running",
        { timeout: options.timeout || 10000 },
      );

      const lines = stdout.split("\n");
      const unnecessaryServices = [
        "telnet",
        "ftp",
        "tftp",
        "rlogin",
        "rsh",
        "ypbind",
        "ypserv",
        "nfs",
        "portmap",
        "sendmail",
        "dovecot",
        "cups",
      ];

      for (const line of lines) {
        const serviceName = line.trim().split(/\s+/)[0];
        if (!serviceName || !serviceName.includes(".service")) continue;

        const baseServiceName = serviceName.replace(".service", "");

        if (unnecessaryServices.includes(baseServiceName)) {
          this.addFinding({
            id: this.generateFindingId(),
            title: `Potentially Unnecessary Service: ${baseServiceName}`,
            description: `Service '${baseServiceName}' is running but may not be necessary for security`,
            severity: SecuritySeverity.LOW,
            category: SecurityCategory.MISCONFIGURATION,
            configurationType: ConfigurationType.SYSTEM_CONFIG,
            source: "systemd",
            location: serviceName,
            evidence: {
              serviceName: baseServiceName,
              fullServiceName: serviceName,
            },
            remediation: {
              description: `Review necessity of ${baseServiceName} service`,
              steps: [
                `Review service necessity: systemctl status ${serviceName}`,
                `Disable if not needed: systemctl disable ${serviceName}`,
                `Stop if not needed: systemctl stop ${serviceName}`,
                "Monitor system after service changes",
              ],
              priority: "low",
              effort: "low",
            },
            references: [
              "https://linux-audit.com/linux-server-hardening-most-important-steps-to-secure-a-server/",
            ],
            cwe_ids: ["CWE-16"],
            compliance_mappings: {
              OWASP: ["A05:2021 – Security Misconfiguration"],
            },
            confidence_score: 0.4,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "high",
          });
        }
      }
    } catch (_error) {
      // Service analysis failed
    }
  }

  /**
   * Analyze user accounts
   */
  private async analyzeUserAccounts(
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    if (this.platform === "win32") return;

    try {
      // Check for users with UID 0 (root privileges)
      const { stdout: passwdOutput }: CommandResult = await execAsync(
        "cat /etc/passwd",
        {
          timeout: 5000,
        },
      );
      const passwdLines = passwdOutput.split("\n");

      const rootUsers: string[] = [];
      const systemUsers: string[] = [];

      for (const line of passwdLines) {
        if (!line.trim()) continue;

        const lineParts = line.split(":");
        if (lineParts.length < 3) continue;

        const [username, , uid] = lineParts;
        const uidNum = parseInt(uid, 10);

        if (isNaN(uidNum)) continue;

        if (uidNum === 0 && username !== "root") {
          rootUsers.push(username);
        } else if (uidNum < 1000 && uidNum > 0) {
          systemUsers.push(username);
        }
      }

      // Report additional root users
      for (const user of rootUsers) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "Additional Root User Account",
          description: `User account '${user}' has root privileges (UID 0)`,
          severity: SecuritySeverity.HIGH,
          category: SecurityCategory.ACCESS_CONTROL,
          configurationType: ConfigurationType.SYSTEM_CONFIG,
          source: "passwd",
          location: "/etc/passwd",
          evidence: {
            username: user,
            uid: 0,
          },
          remediation: {
            description: "Review and secure root-privileged accounts",
            steps: [
              `Review necessity of root privileges for user '${user}'`,
              "Change UID if root privileges are not needed",
              "Use sudo for privileged operations instead",
              "Monitor account usage and access",
            ],
            priority: "high",
            effort: "medium",
          },
          references: [
            "https://owasp.org/www-community/vulnerabilities/Privilege_Escalation",
          ],
          cwe_ids: ["CWE-250"],
          compliance_mappings: {
            OWASP: ["A01:2021 – Broken Access Control"],
          },
          confidence_score: 0.9,
          discoveredAt: new Date(),
          riskScore: 5.0,
          autoFixable: false,
          false_positive_likelihood: "low",
        });
      }
    } catch (_error) {
      // User account analysis failed
    }
  }

  /**
   * Analyze software inventory
   */
  private async analyzeSoftwareInventory(
    options: SystemAnalysisOptions,
  ): Promise<void> {
    this.emit("software_inventory_started", {});

    try {
      // Check for outdated packages (platform-specific)
      await this.checkOutdatedPackages(options);

      // Check for vulnerable software versions
      await this.checkVulnerableSoftware(options);
    } catch (_error) {
      const errorMessage = getErrorMessage(_error);
      this.emit("software_inventory_error", {
        error: errorMessage,
      });
    }
  }

  /**
   * Check for outdated packages
   */
  private async checkOutdatedPackages(
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    try {
      let command: string;

      switch (this.platform) {
        case "linux":
          // Try different package managers
          try {
            command = "apt list --upgradable 2>/dev/null | wc -l";
            const { stdout }: CommandResult = await execAsync(command, {
              timeout: 10000,
            });
            const updateCount = parseInt(stdout.trim(), 10);

            if (updateCount > 1) {
              // Subtract 1 for header line
              this.addFinding({
                id: this.generateFindingId(),
                title: "Outdated Packages Detected",
                description: `System has ${updateCount - 1} packages with available updates`,
                severity: SecuritySeverity.MEDIUM,
                category: SecurityCategory.VULNERABILITY,
                configurationType: ConfigurationType.SYSTEM_CONFIG,
                source: "package_manager",
                location: "system_packages",
                evidence: {
                  packageManager: "apt",
                  outdatedCount: updateCount - 1,
                },
                remediation: {
                  description: "Update system packages",
                  steps: [
                    "Update package list: apt update",
                    "Upgrade packages: apt upgrade",
                    "Review security updates: apt list --upgradable",
                    "Reboot if kernel updates were installed",
                  ],
                  priority: "medium",
                  effort: "low",
                },
                references: [
                  "https://owasp.org/www-community/vulnerabilities/Using_Components_with_Known_Vulnerabilities",
                ],
                cwe_ids: ["CWE-937"],
                compliance_mappings: {
                  OWASP: ["A06:2021 – Vulnerable and Outdated Components"],
                },
                confidence_score: 0.8,
                discoveredAt: new Date(),
                riskScore: 5.0,
                autoFixable: false,
                false_positive_likelihood: "low",
              });
            }
          } catch (_error) {
            // Try yum/dnf
            try {
              command = "yum check-update 2>/dev/null | grep -c '^[a-zA-Z]'";
              const { stdout }: CommandResult = await execAsync(command, {
                timeout: 10000,
              });
              const updateCount = parseInt(stdout.trim(), 10);

              if (updateCount > 0) {
                this.addFinding({
                  id: this.generateFindingId(),
                  title: "Outdated Packages Detected",
                  description: `System has ${updateCount} packages with available updates`,
                  severity: SecuritySeverity.MEDIUM,
                  category: SecurityCategory.VULNERABILITY,
                  configurationType: ConfigurationType.SYSTEM_CONFIG,
                  source: "package_manager",
                  location: "system_packages",
                  evidence: {
                    packageManager: "yum",
                    outdatedCount: updateCount,
                  },
                  remediation: {
                    description: "Update system packages",
                    steps: [
                      "Update packages: yum update",
                      "Review security updates: yum check-update",
                      "Reboot if kernel updates were installed",
                    ],
                    priority: "medium",
                    effort: "low",
                  },
                  references: [
                    "https://owasp.org/www-community/vulnerabilities/Using_Components_with_Known_Vulnerabilities",
                  ],
                  cwe_ids: ["CWE-937"],
                  compliance_mappings: {
                    OWASP: ["A06:2021 – Vulnerable and Outdated Components"],
                  },
                  confidence_score: 0.8,
                  discoveredAt: new Date(),
                  riskScore: 5.0,
                  autoFixable: false,
                  false_positive_likelihood: "low",
                });
              }
            } catch (_yumError) {
              // Neither apt nor yum available
            }
          }
          break;

        case "darwin":
          try {
            const { stdout }: CommandResult = await execAsync("brew outdated", {
              timeout: 10000,
            });
            const outdatedPackages = stdout.trim().split("\n").filter(Boolean);

            if (outdatedPackages.length > 0) {
              this.addFinding({
                id: this.generateFindingId(),
                title: "Outdated Homebrew Packages",
                description: `System has ${outdatedPackages.length} outdated Homebrew packages`,
                severity: SecuritySeverity.LOW,
                category: SecurityCategory.VULNERABILITY,
                configurationType: ConfigurationType.SYSTEM_CONFIG,
                source: "homebrew",
                location: "homebrew_packages",
                evidence: {
                  packageManager: "homebrew",
                  outdatedCount: outdatedPackages.length,
                },
                remediation: {
                  description: "Update Homebrew packages",
                  steps: [
                    "Update Homebrew: brew update",
                    "Upgrade packages: brew upgrade",
                    "Review outdated packages: brew outdated",
                  ],
                  priority: "low",
                  effort: "low",
                },
                references: [
                  "https://owasp.org/www-community/vulnerabilities/Using_Components_with_Known_Vulnerabilities",
                ],
                cwe_ids: ["CWE-937"],
                compliance_mappings: {
                  OWASP: ["A06:2021 – Vulnerable and Outdated Components"],
                },
                confidence_score: 0.6,
                discoveredAt: new Date(),
                riskScore: 5.0,
                autoFixable: false,
                false_positive_likelihood: "medium",
              });
            }
          } catch (_error) {
            // Homebrew not available or command failed
          }
          break;

        default:
          // Unsupported platform
          break;
      }
    } catch (_error) {
      // Package check failed
    }
  }

  /**
   * Check for vulnerable software versions
   */
  private async checkVulnerableSoftware(
    _options: SystemAnalysisOptions,
  ): Promise<void> {
    const vulnerableSoftware = [
      {
        name: "OpenSSL",
        command: "openssl version",
        vulnerableVersions: ["1.0.1", "1.0.2"],
        severity: SecuritySeverity.HIGH,
      },
      {
        name: "OpenSSH",
        command: "ssh -V",
        vulnerableVersions: ["7.3", "7.4"],
        severity: SecuritySeverity.MEDIUM,
      },
    ];

    for (const software of vulnerableSoftware) {
      try {
        const { stdout }: CommandResult = await execAsync(software.command, {
          timeout: 5000,
        });
        const version = this.extractVersion(stdout);

        if (
          version &&
          this.isVersionVulnerable(version, software.vulnerableVersions)
        ) {
          this.addFinding({
            id: this.generateFindingId(),
            title: `Vulnerable Software: ${software.name}`,
            description: `${software.name} version ${version} has known vulnerabilities`,
            severity: software.severity,
            category: SecurityCategory.VULNERABILITY,
            configurationType: ConfigurationType.SYSTEM_CONFIG,
            source: "software_inventory",
            location: software.name,
            evidence: {
              softwareName: software.name,
              currentVersion: version,
              vulnerableVersions: software.vulnerableVersions,
            },
            remediation: {
              description: `Update ${software.name} to latest version`,
              steps: [
                `Update ${software.name} using system package manager`,
                "Verify version after update",
                "Test functionality after update",
                "Monitor for new vulnerabilities",
              ],
              priority:
                software.severity === SecuritySeverity.HIGH ? "high" : "medium",
              effort: "low",
            },
            references: [
              "https://owasp.org/www-community/vulnerabilities/Using_Components_with_Known_Vulnerabilities",
              "https://cve.mitre.org/",
            ],
            cwe_ids: ["CWE-937"],
            compliance_mappings: {
              OWASP: ["A06:2021 – Vulnerable and Outdated Components"],
            },
            confidence_score: 0.8,
            discoveredAt: new Date(),
            riskScore: 5.0,
            autoFixable: false,
            false_positive_likelihood: "low",
          });
        }
      } catch (_error) {
        // Software not found or command failed
      }
    }
  }

  /**
   * Helper methods
   */

  private async findFiles(basePath: string, depth: number): Promise<string[]> {
    if (typeof basePath !== "string" || typeof depth !== "number") {
      return [];
    }

    try {
      const files = await safeGlob("**/*", {
        cwd: basePath,
        absolute: true,
        maxDepth: depth,
        nodir: true,
      });
      return Array.isArray(files)
        ? files.filter((f) => typeof f === "string")
        : [];
    } catch (_error) {
      return [];
    }
  }

  private async findDirectories(
    basePath: string,
    depth: number,
  ): Promise<string[]> {
    if (typeof basePath !== "string" || typeof depth !== "number") {
      return [];
    }

    try {
      const dirs = await safeGlob("**/", {
        cwd: basePath,
        absolute: true,
        maxDepth: depth,
      });
      return Array.isArray(dirs)
        ? dirs.filter((d) => typeof d === "string")
        : [];
    } catch (_error) {
      return [];
    }
  }

  private isTextFile(filePath: string): boolean {
    const textExtensions = [
      ".txt",
      ".js",
      ".ts",
      ".json",
      ".yaml",
      ".yml",
      ".xml",
      ".html",
      ".css",
      ".md",
      ".py",
      ".rb",
      ".php",
      ".java",
      ".c",
      ".cpp",
      ".h",
      ".hpp",
      ".sh",
      ".bash",
      ".conf",
      ".cfg",
      ".ini",
      ".env",
    ];

    const ext = path.extname(filePath).toLowerCase();
    return textExtensions.includes(ext);
  }

  private getSensitiveVarSeverity(
    type: string,
    _value: string,
  ): SecuritySeverity {
    if (
      type.toLowerCase().includes("password") ||
      type.toLowerCase().includes("secret")
    ) {
      return SecuritySeverity.CRITICAL;
    }
    if (
      type.toLowerCase().includes("key") ||
      type.toLowerCase().includes("token")
    ) {
      return SecuritySeverity.HIGH;
    }
    return SecuritySeverity.MEDIUM;
  }

  private getSensitiveFileSeverity(
    fileName: string,
    _filePath: string,
  ): SecuritySeverity {
    const criticalFiles = [
      ".env",
      "id_rsa",
      "id_dsa",
      "id_ecdsa",
      "private.key",
    ];
    const highFiles = [".pem", ".p12", ".jks", "credentials", "secrets"];

    const lowerFileName = fileName.toLowerCase();

    if (criticalFiles.some((cf) => lowerFileName.includes(cf))) {
      return SecuritySeverity.HIGH;
    }
    if (highFiles.some((hf) => lowerFileName.includes(hf))) {
      return SecuritySeverity.MEDIUM;
    }
    return SecuritySeverity.LOW;
  }

  private extractVersion(versionOutput: string): string | null {
    if (typeof versionOutput !== "string") {
      return null;
    }

    const versionMatch = versionOutput.match(/(\d+\.\d+\.?\d*)/);
    return versionMatch && versionMatch[1] ? versionMatch[1] : null;
  }

  private isVersionVulnerable(
    currentVersion: string,
    vulnerableVersions: string[],
  ): boolean {
    if (
      typeof currentVersion !== "string" ||
      !Array.isArray(vulnerableVersions)
    ) {
      return false;
    }

    return vulnerableVersions.some((vulnVersion) => {
      if (typeof vulnVersion !== "string") return false;
      return currentVersion.startsWith(vulnVersion);
    });
  }

  /**
   * Generate analysis result
   */
  private generateSystemAnalysisResult(
    options: SystemAnalysisOptions,
    startTime: number,
  ): SecurityAnalysisResult {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate risk assessment
    const criticalCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.CRITICAL,
    ).length;
    const highCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.HIGH,
    ).length;
    const mediumCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.MEDIUM,
    ).length;
    const lowCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.LOW,
    ).length;

    let overallRisk: "low" | "medium" | "high" | "critical" = "low";
    let riskScore = 0;

    if (criticalCount > 0) {
      overallRisk = "critical";
      riskScore = Math.min(10, 8 + criticalCount * 0.5);
    } else if (highCount > 0) {
      overallRisk = "high";
      riskScore = Math.min(7.9, 6 + highCount * 0.3);
    } else if (mediumCount > 3) {
      overallRisk = "medium";
      riskScore = Math.min(5.9, 3 + mediumCount * 0.2);
    } else {
      riskScore = Math.min(2.9, lowCount * 0.1 + mediumCount * 0.5);
    }

    // Generate remediation recommendations
    const recommendations: RemediationRecommendation[] = [];

    if (criticalCount > 0) {
      recommendations.push({
        priority: "critical",
        category: "secrets_management",
        description: "Address critical security exposures immediately",
        impact: "Prevents potential data breaches and unauthorized access",
        effort: "high",
        timeframe: "immediate",
      });
    }

    if (highCount > 0) {
      recommendations.push({
        priority: "high",
        category: "system_hardening",
        description: "Implement system security hardening measures",
        impact: "Significantly improves overall security posture",
        effort: "medium",
        timeframe: "1-7 days",
      });
    }

    recommendations.push({
      priority: "medium",
      category: "configuration",
      description: "Review and secure system configurations",
      impact: "Reduces attack surface and improves security",
      effort: "low",
      timeframe: "1-4 weeks",
    });

    return {
      analysisId: crypto.randomUUID(),
      timestamp: new Date(),
      duration: duration,
      target: {
        type: "system",
        name: options.target || "system-wide",
        location: "local",
        configuration: {},
      },
      findings: this.findings,
      riskSummary: {
        overall:
          overallRisk === "critical"
            ? SecuritySeverity.CRITICAL
            : overallRisk === "high"
              ? SecuritySeverity.HIGH
              : overallRisk === "medium"
                ? SecuritySeverity.MEDIUM
                : SecuritySeverity.LOW,
        riskLevel: overallRisk,
        criticalIssues: criticalCount,
        highIssues: highCount,
        mediumIssues: mediumCount,
        lowIssues: lowCount,
        score: riskScore,
        riskFactors: this.getTopRiskCategories().map((category) => ({
          factor: category,
          name: category,
          description: `Issues found in ${category} category`,
          weight: 1.0,
          score: 50,
          impact: SecuritySeverity.MEDIUM,
        })),
      },
      recommendations: recommendations.map((rec, index) => ({
        id: `system-rec-${index + 1}`,
        title: rec.category
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        description: rec.description,
        priority:
          rec.priority === "critical"
            ? SecuritySeverity.CRITICAL
            : rec.priority === "high"
              ? SecuritySeverity.HIGH
              : rec.priority === "medium"
                ? SecuritySeverity.MEDIUM
                : SecuritySeverity.LOW,
        implementationEffort: rec.effort,
        implementationSteps: [rec.description],
        expectedImpact: rec.impact,
        relatedFindings: [],
        resources: [],
      })),
      complianceAssessment: {
        framework: "OWASP Top 10",
        version: "2021",
        overallScore: Math.max(0, 100 - this.findings.length * 5),
        passedControls: Math.max(
          0,
          10 -
            Math.ceil(
              this.findings.filter((f) => f.compliance_mappings?.["OWASP"])
                .length / 3,
            ),
        ),
        failedControls: Math.ceil(
          this.findings.filter((f) => f.compliance_mappings?.["OWASP"]).length /
            3,
        ),
        totalControls: 10,
        controlResults: [],
        recommendations: [
          "Address critical findings",
          "Implement security controls",
          "Regular security audits",
        ],
      },
      metadata: {
        analyzerVersion: "1.0.0",
        configurationVersion: "1.0.0",
        analysisScope: [
          "environment",
          "filesystem",
          "processes",
          "network",
          "packages",
        ],
        excludedItems: [],
        analysisParameters: {
          platform: this.platform,
          target: options.target || "system-wide",
          depth: 3,
        },
        environmentInfo: {
          operatingSystem: process.platform,
          osVersion: process.version,
          architecture: process.arch,
          hostname: os.hostname(),
          uptime: process.uptime(),
          availableMemory: os.freemem(),
          totalMemory: os.totalmem(),
          cpuInfo: {
            model: os.cpus()[0]?.model || "unknown",
            cores: os.cpus().length,
            speed: os.cpus()[0]?.speed || 0,
            architecture: os.arch(),
          },
          networkInterfaces: Object.entries(os.networkInterfaces()).flatMap(
            ([name, interfaces]) =>
              (interfaces || []).map((iface) => ({
                name,
                type: iface.family === "IPv4" ? "IPv4" : "IPv6",
                macAddress: iface.mac,
                ipAddresses: [iface.address],
                status: iface.internal ? "internal" : "external",
              })),
          ),
        },
      },
    };
  }

  /**
   * Get top risk categories
   */
  private getTopRiskCategories(): string[] {
    const categoryCount: Record<string, number> = {};

    for (const finding of this.findings) {
      categoryCount[finding.category] =
        (categoryCount[finding.category] || 0) + 1;
    }

    return Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  /**
   * Generate vulnerability assessment
   */
  private generateVulnerabilityAssessment(): VulnerabilityAssessment {
    return {
      total_vulnerabilities: this.findings.length,
      exploitable_vulnerabilities: this.findings.filter(
        (f) =>
          f.severity === SecuritySeverity.CRITICAL ||
          f.severity === SecuritySeverity.HIGH,
      ).length,
      false_positive_likelihood: {
        very_low: this.findings.filter(
          (f) => f.false_positive_likelihood === "very_low",
        ).length,
        low: this.findings.filter((f) => f.false_positive_likelihood === "low")
          .length,
        medium: this.findings.filter(
          (f) => f.false_positive_likelihood === "medium",
        ).length,
        high: this.findings.filter(
          (f) => f.false_positive_likelihood === "high",
        ).length,
        very_high: this.findings.filter(
          (f) => f.false_positive_likelihood === "very_high",
        ).length,
      },
      attack_vectors: [
        ...new Set(this.findings.flatMap((f) => f.cwe_ids || [])),
      ],
      affected_assets: [
        "system",
        "environment",
        "filesystem",
        "network",
        "processes",
      ].filter(Boolean),
    };
  }

  /**
   * Generate compliance report
   */
  private generateComplianceReport(): ComplianceReport {
    const owaspFindings = this.findings.filter(
      (f) => f.compliance_mappings && f.compliance_mappings["OWASP"],
    ).length;

    return {
      framework_compliance: {
        "OWASP Top 10": {
          covered_controls: 10,
          passed_controls: Math.max(0, 10 - Math.ceil(owaspFindings / 3)),
          compliance_percentage: Math.max(0, 100 - owaspFindings * 5),
        },
        "System Security": {
          covered_controls: 15,
          passed_controls: Math.max(
            0,
            15 - Math.ceil(this.findings.length / 5),
          ),
          compliance_percentage: Math.max(0, 100 - this.findings.length * 2),
        },
      },
      regulatory_compliance: {
        gaps_identified: this.findings.length,
        recommendations: [
          "Implement comprehensive system hardening",
          "Enable security monitoring and logging",
          "Establish proper access controls",
          "Maintain current security patches",
        ],
      },
    };
  }

  /**
   * Add finding to results
   */
  private addFinding(finding: SecurityFinding): void {
    this.findings.push(finding);

    this.emit("finding_detected", {
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      source: finding.source,
    });
  }

  /**
   * Generate unique finding ID
   */
  private generateFindingId(): string {
    return `system_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
