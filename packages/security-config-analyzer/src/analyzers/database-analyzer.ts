/**
 * Database Security Configuration Analyzer
 *
 * Comprehensive security analysis for database configurations including SQLite,
 * PostgreSQL, and other database systems. Analyzes authentication, encryption,
 * access controls, and configuration security.
 *
 * @author ByteBot Security Team
 * @version 1.0.0
 */

import { EventEmitter } from "events";
import {
  readFile as fsReadFile,
  pathExists as fsPathExists,
  ensureDir as fsEnsureDir,
  writeFile as fsWriteFile,
  stat as fsStat,
} from "fs-extra";
import { extname as pathExtname, dirname as pathDirname } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { randomBytes as cryptoRandomBytes } from "crypto";
import * as process from "process";

// Type guards for secure property access
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function _isError(err: unknown): err is Error {
  return err instanceof Error;
}

function getErrorMessage(err: unknown): string {
  if (_isError(err)) {
    return err.message;
  }
  return String(err);
}

function hasProperty<T extends string>(
  obj: unknown,
  key: T,
): obj is Record<T, unknown> {
  return isObject(obj) && key in obj;
}

// Safe property access utilities
function safeBooleanProperty(
  obj: unknown,
  key: string,
  defaultValue = false,
): boolean {
  if (hasProperty(obj, key)) {
    const value = obj[key];
    if (typeof value === "boolean") return value;
    if (isString(value)) {
      const lower = value.toLowerCase();
      return (
        lower === "true" || lower === "1" || lower === "on" || lower === "yes"
      );
    }
    if (isNumber(value)) return value !== 0;
  }
  return defaultValue;
}

function safeStringProperty(
  obj: Record<string, unknown> | Record<string, string>,
  key: string,
  defaultValue: string,
): string {
  const value = obj[key];
  return typeof value === "string" ? value : defaultValue;
}

function safeNumberProperty(
  obj: Record<string, unknown> | Record<string, string>,
  key: string,
  defaultValue: number,
): number {
  const value = obj[key];
  if (typeof value === "number" && !isNaN(value)) return value;
  if (typeof value === "string") {
    const num = parseFloat(value);
    return !isNaN(num) ? num : defaultValue;
  }
  return defaultValue;
}

// Use modules directly without unsafe type assertions

import {
  SecurityFinding,
  SecuritySeverity,
  SecurityCategory,
  ConfigurationType,
  DatabaseSecurityConfig,
  SecurityAnalysisResult,
  AnalysisTarget,
  VulnerabilityAssessment as _VulnerabilityAssessment,
  ComplianceReport as _ComplianceReport,
  RemediationRecommendation as _RemediationRecommendation,
  RiskSummary,
  SecurityRecommendation,
  ComplianceAssessment,
  DatabaseUser,
  DatabaseRole,
} from "../types/index.js";

/**
 * Type-safe interface for JSON configuration parsing
 */
interface JSONDatabaseConfig {
  driver?: string;
  dialect?: string;
  host?: string;
  hostname?: string;
  port?: number;
  database?: string;
  dbname?: string;
  ssl?: boolean;
  sslMode?: boolean;
  tls?: boolean;
  connectTimeout?: number;
  timeout?: number;
  maxConnections?: number;
  poolSize?: number;
  authMethod?: string;
  password?: string;
  user?: string;
  cert?: string;
  clientCert?: string;
  mfa?: boolean;
  twoFactor?: boolean;
  encryptAtRest?: boolean;
  keyStorage?: string;
  keyRotation?: boolean;
  hsm?: boolean;
  fieldLevelEncryption?: boolean;
  transparentDataEncryption?: boolean;
  rbacEnabled?: boolean;
  auditEnabled?: boolean;
  logRetention?: number;
  backupEnabled?: boolean;
  backupFrequency?: string;
  [key: string]: unknown;
}

/**
 * Type-safe wrapper for async exec operations
 */
const execAsync = promisify(exec);

/**
 * Database Security Configuration Analyzer
 *
 * Provides comprehensive security analysis for database systems including:
 * - Connection security analysis
 * - Authentication configuration validation
 * - Encryption settings verification
 * - Access control assessment
 * - Database configuration hardening
 * - Credential security analysis
 */
export class DatabaseSecurityAnalyzer extends EventEmitter {
  private readonly logger: Console;
  private readonly findings: SecurityFinding[] = [];
  private readonly supportedDatabases: string[];
  private readonly connectionTimeout: number;
  private readonly enableCredentialScanning: boolean;

  constructor(
    options: {
      supportedDatabases?: string[];
      connectionTimeout?: number;
      enableCredentialScanning?: boolean;
      logger?: Console;
    } = {},
  ) {
    super();

    this.logger = options.logger || console;
    this.supportedDatabases = options.supportedDatabases || [
      "sqlite",
      "postgresql",
      "mysql",
      "mongodb",
    ];
    this.connectionTimeout = options.connectionTimeout || 10000;
    this.enableCredentialScanning = options.enableCredentialScanning !== false;

    void this.initializeAnalyzer();
  }

  /**
   * Type-safe emit method to avoid unsafe call violations
   */
  private safeEmit(
    eventName: string,
    eventData?: Record<string, unknown>,
  ): boolean {
    try {
      return this.emit(eventName, eventData || {});
    } catch (err) {
      console.error(`Error emitting event ${eventName}:`, err);
      return false;
    }
  }

  /**
   * Initialize the database security analyzer
   */
  private async initializeAnalyzer(): Promise<void> {
    try {
      const startTime = performance.now();

      // Initialize database drivers and connections
      await this.initializeDatabaseDrivers();

      // Setup credential scanning if enabled
      if (this.enableCredentialScanning) {
        this.initializeCredentialScanning();
      }

      const duration = performance.now() - startTime;
      this.logger.info(
        `Database Security Analyzer initialized in ${duration.toFixed(2)}ms`,
      );

      this.safeEmit("analyzer_initialized", {
        initializationTime: duration,
        supportedDatabases: this.supportedDatabases,
        credentialScanning: this.enableCredentialScanning,
      });
    } catch (err) {
      this.logger.error(
        "Failed to initialize Database security analyzer:",
        err,
      );
      throw new Error(
        `Database analyzer initialization failed: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Initialize database drivers and verify availability
   */
  private async initializeDatabaseDrivers(): Promise<void> {
    try {
      // Check availability of database command-line tools
      const toolChecks = [
        { db: "sqlite", command: "sqlite3 --version" },
        { db: "postgresql", command: "psql --version" },
        { db: "mysql", command: "mysql --version" },
        { db: "mongodb", command: "mongosh --version" },
      ];

      for (const check of toolChecks) {
        try {
          await execAsync(check.command);
          this.logger.info(`${check.db} tools available`);
        } catch (err) {
          this.logger.warn(
            `${check.db} tools not available: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error("Failed to initialize database drivers:", err);
    }
  }

  /**
   * Initialize credential scanning capabilities
   */
  private initializeCredentialScanning(): void {
    try {
      // Initialize patterns for credential detection
      this.logger.info("Credential scanning initialized for database analysis");
    } catch (err) {
      this.logger.error("Failed to initialize credential scanning:", err);
    }
  }

  /**
   * Perform comprehensive database security analysis
   */
  public async analyzeDatabaseSecurity(
    options: {
      configurationFiles?: string[];
      connectionStrings?: string[];
      databaseTypes?: string[];
      includeCredentialScan?: boolean;
      outputPath?: string;
    } = {},
  ): Promise<SecurityAnalysisResult> {
    const startTime = performance.now();
    const analysisId = this.generateAnalysisId();

    this.logger.info(`Starting database security analysis: ${analysisId}`);
    this.safeEmit("analysis_started", { analysisId, options });

    try {
      // Clear previous findings
      this.findings.length = 0;

      const databaseConfigs: DatabaseSecurityConfig[] = [];

      // Analyze configuration files
      if (options.configurationFiles) {
        for (const configFile of options.configurationFiles) {
          try {
            const config = await this.analyzeConfigurationFile(configFile);
            if (config) {
              databaseConfigs.push(config);
            }
          } catch (err) {
            this.logger.error(
              `Failed to analyze configuration file ${configFile}:`,
              err,
            );
            this.addFinding({
              id: this.generateFindingId(),
              title: "Database Configuration Analysis Failed",
              description: `Failed to analyze configuration file ${configFile}: ${(err as Error).message}`,
              severity: SecuritySeverity.MEDIUM,
              category: SecurityCategory.MISCONFIGURATION,
              configurationType: ConfigurationType.DATABASE_SQLITE,
              location: configFile,
              remediation: "Check file accessibility and format",
              references: [
                "https://security.berkeley.edu/data-management-database-security",
              ],
              metadata: { configFile, error: (err as Error).message },
              discoveredAt: new Date(),
              riskScore: 5.0,
              autoFixable: false,
            });
          }
        }
      }

      // Analyze connection strings
      if (options.connectionStrings) {
        for (const connectionString of options.connectionStrings) {
          try {
            this.analyzeConnectionString(connectionString);
          } catch (err) {
            this.logger.error(`Failed to analyze connection string:`, err);
          }
        }
      }

      // Perform credential scanning if enabled
      if (options.includeCredentialScan && this.enableCredentialScanning) {
        await this.performCredentialScanning(options.configurationFiles || []);
      }

      // Auto-discover database configurations
      await this.discoverDatabaseConfigurations();

      // Create analysis result
      const duration = performance.now() - startTime;
      const result = this.createAnalysisResult(
        analysisId,
        databaseConfigs,
        duration,
      );

      // Save results if output path provided
      if (options.outputPath) {
        await this.saveAnalysisResults(result, options.outputPath);
      }

      this.logger.info(
        `Database security analysis completed: ${analysisId} in ${duration.toFixed(2)}ms`,
      );
      this.safeEmit("analysis_completed", {
        analysisId,
        findings: this.findings.length,
        duration,
      });

      return result;
    } catch (err) {
      this.logger.error(
        `Database security analysis failed: ${analysisId}`,
        err,
      );
      this.safeEmit("analysis_failed", {
        analysisId,
        error: (err as Error).message,
      });
      throw err;
    }
  }

  /**
   * Analyze database configuration file
   */
  private async analyzeConfigurationFile(
    filePath: string,
  ): Promise<DatabaseSecurityConfig | null> {
    try {
      // Type-safe path existence check
      if (typeof filePath !== "string" || !filePath.trim()) {
        throw new Error("Invalid file path provided");
      }

      let fileExists = false;
      try {
        fileExists = await fsPathExists(filePath);
      } catch (err) {
        this.logger.warn(`Error checking path existence: ${filePath}`, err);
        return null;
      }

      if (!fileExists) {
        this.logger.warn(`Configuration file not found: ${filePath}`);
        return null;
      }

      const content = await fsReadFile(filePath, "utf8");
      const fileExtension = pathExtname(filePath).toLowerCase();

      let config: DatabaseSecurityConfig | null = null;

      // Parse based on file type
      switch (fileExtension) {
        case ".conf":
        case ".cnf":
          config = this.parsePostgreSQLConfig(filePath, content);
          break;
        case ".ini":
          config = this.parseMySQLConfig(filePath, content);
          break;
        case ".json":
          config = this.parseJSONConfig(filePath, content);
          break;
        case ".env":
          config = this.parseEnvironmentConfig(filePath, content);
          break;
        default:
          // Try to detect format automatically
          config = this.detectAndParseConfig(filePath, content);
      }

      if (config) {
        this.analyzeDatabaseConfigSecurity(config, filePath);
      }

      return config;
    } catch (err) {
      throw new Error(
        `Failed to analyze configuration file ${filePath}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Parse PostgreSQL configuration file
   */
  private parsePostgreSQLConfig(
    _filePath: string,
    content: string,
  ): DatabaseSecurityConfig {
    const config: DatabaseSecurityConfig = {
      type: "postgresql",
      connection: {
        host: "localhost",
        port: 5432,
        database: "",
        ssl: false,
        connectionTimeout: 30000,
        maxConnections: 100,
      },
      authentication: {
        method: "md5",
        passwordAuth: true,
        certAuth: false,
        mfaEnabled: false,
      },
      encryption: {
        atRest: false,
        inTransit: false,
        keyManagement: {
          keyStorage: "file",
          keyRotation: false,
          hsm: false,
        },
        fieldLevelEncryption: false,
        transparentDataEncryption: false,
      },
      accessControl: {
        rbacEnabled: false,
        users: [],
        roles: [],
        defaultPermissions: [],
        privilegeEscalationPrevention: false,
      },
      auditLogging: {
        enabled: false,
        retentionDays: 0,
        auditedEvents: [],
        logRotation: false,
        logEncryption: false,
      },
      backup: {
        enabled: false,
        frequency: "",
        location: "",
        encryption: false,
        retention: 0,
        pointInTimeRecovery: false,
      },
    };

    // Parse PostgreSQL configuration
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#") || !trimmedLine) continue;

      const [key, ...valueParts] = trimmedLine.split("=");
      if (!key || valueParts.length === 0) continue;

      const value = valueParts.join("=").trim().replace(/'/g, "");
      const cleanKey = key.trim();

      switch (cleanKey) {
        case "port":
          config.connection.port = parseInt(value) || 5432;
          break;
        case "listen_addresses":
          config.connection.host = value === "*" ? "0.0.0.0" : value;
          break;
        case "ssl":
          config.connection.ssl = safeBooleanProperty(
            { value },
            "value",
            false,
          );
          config.encryption.inTransit = safeBooleanProperty(
            { value },
            "value",
            false,
          );
          break;
        case "max_connections":
          config.connection.maxConnections = parseInt(value) || 100;
          break;
        case "log_statement":
          if (value !== "none") {
            config.auditLogging.enabled = true;
            config.auditLogging.auditedEvents.push("statements");
          }
          break;
        case "log_connections":
          if (safeBooleanProperty({ value }, "value", false)) {
            config.auditLogging.enabled = true;
            config.auditLogging.auditedEvents.push("connections");
          }
          break;
        case "log_disconnections":
          if (safeBooleanProperty({ value }, "value", false)) {
            config.auditLogging.enabled = true;
            config.auditLogging.auditedEvents.push("disconnections");
          }
          break;
      }
    }

    return config;
  }

  /**
   * Parse MySQL configuration file
   */
  private parseMySQLConfig(
    _filePath: string,
    content: string,
  ): DatabaseSecurityConfig {
    const config: DatabaseSecurityConfig = {
      type: "mysql",
      connection: {
        host: "localhost",
        port: 3306,
        database: "",
        ssl: false,
        connectionTimeout: 30000,
        maxConnections: 151,
      },
      authentication: {
        method: "mysql_native_password",
        passwordAuth: true,
        certAuth: false,
        mfaEnabled: false,
      },
      encryption: {
        atRest: false,
        inTransit: false,
        keyManagement: {
          keyStorage: "file",
          keyRotation: false,
          hsm: false,
        },
        fieldLevelEncryption: false,
        transparentDataEncryption: false,
      },
      accessControl: {
        rbacEnabled: true,
        users: [],
        roles: [],
        defaultPermissions: [],
        privilegeEscalationPrevention: false,
      },
      auditLogging: {
        enabled: false,
        retentionDays: 0,
        auditedEvents: [],
        logRotation: false,
        logEncryption: false,
      },
      backup: {
        enabled: false,
        frequency: "",
        location: "",
        encryption: false,
        retention: 0,
        pointInTimeRecovery: false,
      },
    };

    // Parse MySQL configuration
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("#") || !trimmedLine) continue;

      // Check for section headers
      if (trimmedLine.startsWith("[") && trimmedLine.endsWith("]")) {
        // Skip section headers for now, add section-specific logic here if needed
        continue;
      }

      const [key, ...valueParts] = trimmedLine.split("=");
      if (!key || valueParts.length === 0) continue;

      const value = valueParts.join("=").trim();
      const cleanKey = key.trim();

      switch (cleanKey) {
        case "port":
          config.connection.port = parseInt(value) || 3306;
          break;
        case "bind-address":
          config.connection.host = value;
          break;
        case "ssl":
          config.connection.ssl = safeBooleanProperty(
            { value },
            "value",
            false,
          );
          config.encryption.inTransit = config.connection.ssl;
          break;
        case "max_connections":
          config.connection.maxConnections = parseInt(value) || 151;
          break;
        case "general_log":
          if (safeBooleanProperty({ value }, "value", false)) {
            config.auditLogging.enabled = true;
            config.auditLogging.auditedEvents.push("general");
          }
          break;
        case "slow_query_log":
          if (safeBooleanProperty({ value }, "value", false)) {
            config.auditLogging.enabled = true;
            config.auditLogging.auditedEvents.push("slow_queries");
          }
          break;
      }
    }

    return config;
  }

  /**
   * Parse JSON configuration file
   */
  private parseJSONConfig(
    filePath: string,
    content: string,
  ): DatabaseSecurityConfig | null {
    try {
      const parsedContent: unknown = JSON.parse(content);
      if (!isObject(parsedContent)) {
        throw new Error("Invalid JSON configuration: not an object");
      }
      const jsonConfig = parsedContent as JSONDatabaseConfig;

      // Try to detect database type from configuration
      let dbType: "sqlite" | "postgresql" | "mysql" | "mongodb" = "sqlite";

      if (
        hasProperty(jsonConfig, "driver") ||
        hasProperty(jsonConfig, "dialect")
      ) {
        const driverValue =
          safeStringProperty(jsonConfig, "driver", "") ||
          safeStringProperty(jsonConfig, "dialect", "");
        if (driverValue) {
          const driver = driverValue.toLowerCase();
          if (driver.includes("postgres")) dbType = "postgresql";
          else if (driver.includes("mysql")) dbType = "mysql";
          else if (driver.includes("mongo")) dbType = "mongodb";
        }
      }

      const config: DatabaseSecurityConfig = {
        type: dbType,
        connection: {
          host: jsonConfig.host || jsonConfig.hostname || "localhost",
          port:
            jsonConfig.port ||
            (dbType === "postgresql"
              ? 5432
              : dbType === "mysql"
                ? 3306
                : 27017),
          database: jsonConfig.database || jsonConfig.dbname || "",
          ssl: jsonConfig.ssl || jsonConfig.sslMode || false,
          connectionTimeout:
            jsonConfig.connectTimeout || jsonConfig.timeout || 30000,
          maxConnections:
            jsonConfig.maxConnections || jsonConfig.poolSize || 10,
        },
        authentication: {
          method: jsonConfig.authMethod || "password",
          passwordAuth: !!jsonConfig.password || !!jsonConfig.user,
          certAuth: !!jsonConfig.cert || !!jsonConfig.clientCert,
          mfaEnabled: !!jsonConfig.mfa || !!jsonConfig.twoFactor,
        },
        encryption: {
          atRest: !!jsonConfig.encryptAtRest,
          inTransit: !!jsonConfig.ssl || !!jsonConfig.tls,
          keyManagement: {
            keyStorage: jsonConfig.keyStorage || "file",
            keyRotation: !!jsonConfig.keyRotation,
            hsm: !!jsonConfig.hsm,
          },
          fieldLevelEncryption: !!jsonConfig.fieldEncryption,
          transparentDataEncryption: !!jsonConfig.tde,
        },
        accessControl: {
          rbacEnabled: !!jsonConfig.rbac,
          users: Array.isArray(jsonConfig.users)
            ? (jsonConfig.users as DatabaseUser[])
            : [],
          roles: Array.isArray(jsonConfig.roles)
            ? (jsonConfig.roles as DatabaseRole[])
            : [],
          defaultPermissions: Array.isArray(jsonConfig.defaultPermissions)
            ? (jsonConfig.defaultPermissions as string[])
            : [],
          privilegeEscalationPrevention:
            !!jsonConfig.preventPrivilegeEscalation,
        },
        auditLogging: {
          enabled: !!jsonConfig.audit || !!jsonConfig.logging,
          retentionDays: jsonConfig.logRetention || 0,
          auditedEvents: Array.isArray(jsonConfig.auditEvents)
            ? (jsonConfig.auditEvents as string[])
            : [],
          logRotation: !!jsonConfig.logRotation,
          logEncryption: !!jsonConfig.encryptLogs,
        },
        backup: {
          enabled: !!jsonConfig.backup,
          frequency: safeStringProperty(jsonConfig, "backupFrequency", "daily"),
          location: safeStringProperty(
            jsonConfig,
            "backupLocation",
            "/var/backups",
          ),
          encryption: !!jsonConfig.encryptBackups,
          retention: safeNumberProperty(jsonConfig, "backupRetention", 30),
          pointInTimeRecovery: !!jsonConfig.pitr,
        },
      };

      return config;
    } catch (err) {
      this.logger.error(
        `Failed to parse JSON config ${filePath}:`,
        getErrorMessage(err),
      );
      return null;
    }
  }

  /**
   * Parse environment configuration file
   */
  private parseEnvironmentConfig(
    _filePath: string,
    content: string,
  ): DatabaseSecurityConfig | null {
    const envVars: Record<string, string> = {};

    // Parse environment variables
    const lines = content.split("\n");
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (
        trimmedLine.startsWith("#") ||
        !trimmedLine ||
        !trimmedLine.includes("=")
      )
        continue;

      const [key, ...valueParts] = trimmedLine.split("=");
      envVars[key.trim()] = valueParts.join("=").trim().replace(/['"]/g, "");
    }

    // Try to detect database type from environment variables
    let dbType: "sqlite" | "postgresql" | "mysql" | "mongodb" = "postgresql";

    if (envVars.DATABASE_URL || envVars.DB_URL) {
      const url =
        safeStringProperty(envVars, "DATABASE_URL", "") ||
        safeStringProperty(envVars, "DB_URL", "");
      if (url) {
        if (url.startsWith("postgres://") || url.startsWith("postgresql://"))
          dbType = "postgresql";
        else if (url.startsWith("mysql://")) dbType = "mysql";
        else if (url.startsWith("mongodb://")) dbType = "mongodb";
        else if (url.includes("sqlite")) dbType = "sqlite";
      }
    }

    const config: DatabaseSecurityConfig = {
      type: dbType,
      connection: {
        host: envVars.DB_HOST || envVars.DATABASE_HOST || "localhost",
        port: parseInt(envVars.DB_PORT || envVars.DATABASE_PORT || "5432"),
        database: envVars.DB_NAME || envVars.DATABASE_NAME || "",
        ssl: safeBooleanProperty(
          { value: envVars.DB_SSL || envVars.DATABASE_SSL || "" },
          "value",
          false,
        ),
        connectionTimeout: parseInt(envVars.DB_TIMEOUT || "30000"),
        maxConnections: parseInt(envVars.DB_MAX_CONNECTIONS || "10"),
      },
      authentication: {
        method: envVars.DB_AUTH_METHOD || "password",
        passwordAuth: !!(envVars.DB_PASSWORD || envVars.DATABASE_PASSWORD),
        certAuth: !!(envVars.DB_CERT || envVars.DATABASE_CERT),
        mfaEnabled: safeBooleanProperty(
          { value: envVars.DB_MFA || "" },
          "value",
          false,
        ),
      },
      encryption: {
        atRest: safeBooleanProperty(
          { value: envVars.DB_ENCRYPT_AT_REST || "" },
          "value",
          false,
        ),
        inTransit: safeBooleanProperty(
          { value: envVars.DB_SSL || envVars.DATABASE_SSL || "" },
          "value",
          false,
        ),
        keyManagement: {
          keyStorage: envVars.DB_KEY_STORAGE || "file",
          keyRotation: safeBooleanProperty(
            { value: envVars.DB_KEY_ROTATION || "" },
            "value",
            false,
          ),
          hsm: safeBooleanProperty(
            { value: envVars.DB_HSM || "" },
            "value",
            false,
          ),
        },
        fieldLevelEncryption: safeBooleanProperty(
          { value: envVars.DB_FIELD_ENCRYPTION || "" },
          "value",
          false,
        ),
        transparentDataEncryption: safeBooleanProperty(
          { value: envVars.DB_TDE || "" },
          "value",
          false,
        ),
      },
      accessControl: {
        rbacEnabled: safeBooleanProperty(
          { value: envVars.DB_RBAC || "" },
          "value",
          false,
        ),
        users: [],
        roles: [],
        defaultPermissions: [],
        privilegeEscalationPrevention: safeBooleanProperty(
          { value: envVars.DB_PREVENT_PRIVILEGE_ESCALATION || "" },
          "value",
          false,
        ),
      },
      auditLogging: {
        enabled: safeBooleanProperty(
          { value: envVars.DB_AUDIT || envVars.DB_LOGGING || "" },
          "value",
          false,
        ),
        retentionDays: parseInt(envVars.DB_LOG_RETENTION || "0"),
        auditedEvents: [],
        logRotation: safeBooleanProperty(
          { value: envVars.DB_LOG_ROTATION || "" },
          "value",
          false,
        ),
        logEncryption: safeBooleanProperty(
          { value: envVars.DB_ENCRYPT_LOGS || "" },
          "value",
          false,
        ),
      },
      backup: {
        enabled: safeBooleanProperty(
          { value: envVars.DB_BACKUP || "" },
          "value",
          false,
        ),
        frequency: envVars.DB_BACKUP_FREQUENCY || "",
        location: envVars.DB_BACKUP_LOCATION || "",
        encryption: safeBooleanProperty(
          { value: envVars.DB_ENCRYPT_BACKUPS || "" },
          "value",
          false,
        ),
        retention: parseInt(envVars.DB_BACKUP_RETENTION || "0"),
        pointInTimeRecovery: safeBooleanProperty(
          { value: envVars.DB_PITR || "" },
          "value",
          false,
        ),
      },
    };

    return config;
  }

  /**
   * Detect and parse configuration format automatically
   */
  private detectAndParseConfig(
    filePath: string,
    content: string,
  ): DatabaseSecurityConfig | null {
    // Try JSON first
    try {
      return this.parseJSONConfig(filePath, content);
    } catch {
      // Not JSON, continue
    }

    // Try key-value format
    if (content.includes("=")) {
      // Check if it looks like PostgreSQL config
      if (
        content.includes("listen_addresses") ||
        content.includes("port") ||
        content.includes("ssl")
      ) {
        return this.parsePostgreSQLConfig(filePath, content);
      }

      // Check if it looks like environment file
      if (content.includes("DB_") || content.includes("DATABASE_")) {
        return this.parseEnvironmentConfig(filePath, content);
      }
    }

    return null;
  }

  /**
   * Analyze connection string for security issues
   */
  private analyzeConnectionString(connectionString: string): void {
    // Check for credentials in connection string
    if (
      connectionString.includes("password=") ||
      connectionString.includes("pwd=")
    ) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Password in Connection String",
        description:
          "Database connection string contains embedded password credentials",
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.DATA_EXPOSURE,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: "connection_string",
        codeSnippet: connectionString.substring(0, 50) + "...",
        remediation:
          "Use environment variables or secure credential management instead of embedded passwords",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-200",
        metadata: { hasPassword: true },
        discoveredAt: new Date(),
        riskScore: 8.0,
        autoFixable: false,
      });
    }

    // Check for SSL/TLS configuration
    if (
      !connectionString.includes("ssl=") &&
      !connectionString.includes("sslmode=")
    ) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Connection Without SSL/TLS",
        description:
          "Database connection string does not specify SSL/TLS encryption",
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.INSECURE_COMMUNICATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: "connection_string",
        remediation:
          "Add SSL/TLS parameters to connection string (e.g., sslmode=require)",
        references: ["https://www.postgresql.org/docs/current/libpq-ssl.html"],
        cweId: "CWE-319",
        metadata: { hasSSL: false },
        discoveredAt: new Date(),
        riskScore: 7.0,
        autoFixable: false,
      });
    }

    // Check for localhost/127.0.0.1 in production-like environments
    if (
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1")
    ) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Connection Using Localhost",
        description:
          "Database connection uses localhost which may indicate development configuration in production",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: "connection_string",
        remediation:
          "Use proper database host configuration for production environments",
        references: [
          "https://security.berkeley.edu/data-management-database-security",
        ],
        metadata: { usesLocalhost: true },
        discoveredAt: new Date(),
        riskScore: 5.0,
        autoFixable: false,
      });
    }
  }

  /**
   * Analyze database configuration for security issues
   */
  private analyzeDatabaseConfigSecurity(
    config: DatabaseSecurityConfig,
    filePath: string,
  ): void {
    // Analyze connection security
    this.analyzeConnectionSecurity(config, filePath);

    // Analyze authentication configuration
    this.analyzeAuthenticationSecurity(config, filePath);

    // Analyze encryption configuration
    this.analyzeEncryptionSecurity(config, filePath);

    // Analyze access control configuration
    this.analyzeAccessControlSecurity(config, filePath);

    // Analyze audit logging configuration
    this.analyzeAuditLoggingSecurity(config, filePath);

    // Analyze backup configuration
    this.analyzeBackupSecurity(config, filePath);
  }

  /**
   * Analyze connection security configuration
   */
  private analyzeConnectionSecurity(
    config: DatabaseSecurityConfig,
    filePath: string,
  ): void {
    // Check for SSL/TLS configuration
    if (!config.connection.ssl) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database SSL/TLS Not Enabled",
        description: `Database ${config.type} does not have SSL/TLS encryption enabled`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.INSECURE_COMMUNICATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation: "Enable SSL/TLS encryption for database connections",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-319",
        metadata: { databaseType: config.type, sslEnabled: false },
        discoveredAt: new Date(),
        riskScore: 8.0,
        autoFixable: false,
      });
    }

    // Check for default ports
    const defaultPorts = {
      postgresql: 5432,
      mysql: 3306,
      mongodb: 27017,
      sqlite: 0, // SQLite doesn't use network ports
    };

    if (
      config.type !== "sqlite" &&
      config.connection.port === defaultPorts[config.type]
    ) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Using Default Port",
        description: `Database ${config.type} is using default port ${config.connection.port}`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation: "Use non-default ports to reduce attack surface",
        references: [
          "https://security.berkeley.edu/data-management-database-security",
        ],
        metadata: { databaseType: config.type, port: config.connection.port },
        discoveredAt: new Date(),
        riskScore: 4.0,
        autoFixable: false,
      });
    }

    // Check for excessive connection limits
    if (config.connection.maxConnections > 1000) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Excessive Database Connection Limit",
        description: `Database allows ${config.connection.maxConnections} concurrent connections`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Set appropriate connection limits based on application requirements",
        references: [
          "https://www.postgresql.org/docs/current/runtime-config-connection.html",
        ],
        cweId: "CWE-400",
        metadata: { maxConnections: config.connection.maxConnections },
        discoveredAt: new Date(),
        riskScore: 5.0,
        autoFixable: false,
      });
    }

    // Check for weak connection timeout
    if (config.connection.connectionTimeout > 60000) {
      // > 60 seconds
      this.addFinding({
        id: this.generateFindingId(),
        title: "Long Database Connection Timeout",
        description: `Database connection timeout is set to ${config.connection.connectionTimeout}ms`,
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Set reasonable connection timeouts to prevent resource exhaustion",
        references: [
          "https://security.berkeley.edu/data-management-database-security",
        ],
        metadata: { connectionTimeout: config.connection.connectionTimeout },
        discoveredAt: new Date(),
        riskScore: 3.0,
        autoFixable: false,
      });
    }
  }

  /**
   * Analyze authentication security configuration
   */
  private analyzeAuthenticationSecurity(
    config: DatabaseSecurityConfig,
    filePath: string,
  ): void {
    // Check for weak authentication methods
    const weakAuthMethods = ["trust", "password", "md5"];
    if (weakAuthMethods.includes(config.authentication.method)) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Weak Database Authentication Method",
        description: `Database uses weak authentication method: ${config.authentication.method}`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.WEAK_AUTHENTICATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Use stronger authentication methods like scram-sha-256 or certificate-based authentication",
        references: [
          "https://www.postgresql.org/docs/current/auth-methods.html",
        ],
        cweId: "CWE-287",
        metadata: { authMethod: config.authentication.method },
        discoveredAt: new Date(),
        riskScore: 8.0,
        autoFixable: false,
      });
    }

    // Check for missing multi-factor authentication
    if (!config.authentication.mfaEnabled && config.type !== "sqlite") {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Multi-Factor Authentication Not Enabled",
        description: `Database ${config.type} does not have multi-factor authentication enabled`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.WEAK_AUTHENTICATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation: "Enable multi-factor authentication for database access",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        metadata: { databaseType: config.type, mfaEnabled: false },
        discoveredAt: new Date(),
        riskScore: 6.0,
        autoFixable: false,
      });
    }

    // Check for password policy configuration
    if (
      config.authentication.passwordAuth &&
      !config.authentication.passwordPolicy
    ) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "No Database Password Policy Configured",
        description:
          "Database password authentication is enabled but no password policy is configured",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.WEAK_AUTHENTICATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Configure strong password policies including complexity requirements and expiration",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-521",
        metadata: { passwordAuth: true, passwordPolicy: false },
        discoveredAt: new Date(),
        riskScore: 5.0,
        autoFixable: false,
      });
    }
  }

  /**
   * Analyze encryption security configuration
   */
  private analyzeEncryptionSecurity(
    config: DatabaseSecurityConfig,
    filePath: string,
  ): void {
    // Check for encryption at rest
    if (!config.encryption.atRest) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Encryption at Rest Not Enabled",
        description: `Database ${config.type} does not have encryption at rest enabled`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation: "Enable encryption at rest to protect stored data",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-311",
        metadata: { databaseType: config.type, encryptionAtRest: false },
        discoveredAt: new Date(),
        riskScore: 8.0,
        autoFixable: false,
      });
    }

    // Check for encryption in transit
    if (!config.encryption.inTransit) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Encryption in Transit Not Enabled",
        description: `Database ${config.type} does not have encryption in transit enabled`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation: "Enable SSL/TLS encryption for data in transit",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-319",
        metadata: { databaseType: config.type, encryptionInTransit: false },
        discoveredAt: new Date(),
        riskScore: 8.0,
        autoFixable: false,
      });
    }

    // Check for key management configuration
    if (!config.encryption.keyManagement.keyRotation) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Key Rotation Not Enabled",
        description: "Database encryption key rotation is not enabled",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation: "Enable automatic key rotation for encryption keys",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html",
        ],
        cweId: "CWE-320",
        metadata: { keyRotation: false },
        discoveredAt: new Date(),
        riskScore: 6.0,
        autoFixable: false,
      });
    }

    // Check for file-based key storage
    if (config.encryption.keyManagement.keyStorage === "file") {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Keys Stored in Files",
        description:
          "Database encryption keys are stored in files instead of secure key management",
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Use dedicated key management systems or hardware security modules",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html",
        ],
        cweId: "CWE-320",
        metadata: { keyStorage: config.encryption.keyManagement.keyStorage },
        discoveredAt: new Date(),
        riskScore: 7.0,
        autoFixable: false,
      });
    }
  }

  /**
   * Analyze access control security configuration
   */
  private analyzeAccessControlSecurity(
    config: DatabaseSecurityConfig,
    filePath: string,
  ): void {
    // Check for RBAC configuration
    if (!config.accessControl.rbacEnabled && config.type !== "sqlite") {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Role-Based Access Control Not Enabled",
        description: `Database ${config.type} does not have role-based access control enabled`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.ACCESS_CONTROL,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation: "Enable and configure role-based access control",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-862",
        metadata: { databaseType: config.type, rbacEnabled: false },
        discoveredAt: new Date(),
        riskScore: 8.0,
        autoFixable: false,
      });
    }

    // Check for privilege escalation prevention
    if (!config.accessControl.privilegeEscalationPrevention) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Privilege Escalation Prevention Not Configured",
        description:
          "Database does not have privilege escalation prevention measures configured",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.PRIVILEGE_ESCALATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Configure privilege escalation prevention and principle of least privilege",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-250",
        metadata: { privilegeEscalationPrevention: false },
        discoveredAt: new Date(),
        riskScore: 6.0,
        autoFixable: false,
      });
    }

    // Check for empty user/role configuration
    if (
      config.accessControl.users.length === 0 &&
      config.accessControl.roles.length === 0
    ) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "No Database Users or Roles Configured",
        description: "Database access control has no users or roles configured",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.ACCESS_CONTROL,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Configure specific users and roles with appropriate permissions",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        metadata: { userCount: 0, roleCount: 0 },
        discoveredAt: new Date(),
        riskScore: 5.0,
        autoFixable: false,
      });
    }
  }

  /**
   * Analyze audit logging security configuration
   */
  private analyzeAuditLoggingSecurity(
    config: DatabaseSecurityConfig,
    filePath: string,
  ): void {
    // Check for audit logging enabled
    if (!config.auditLogging.enabled) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Audit Logging Not Enabled",
        description: `Database ${config.type} does not have audit logging enabled`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.SECURITY_LOGGING,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Enable comprehensive audit logging for security monitoring",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-778",
        metadata: { databaseType: config.type, auditEnabled: false },
        discoveredAt: new Date(),
        riskScore: 7.0,
        autoFixable: false,
      });
    }

    // Check for log retention configuration
    if (
      config.auditLogging.enabled &&
      config.auditLogging.retentionDays === 0
    ) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Audit Log Retention Not Configured",
        description:
          "Database audit logging is enabled but log retention is not configured",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.SECURITY_LOGGING,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Configure appropriate log retention period for compliance and security analysis",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
        ],
        metadata: { retentionDays: 0 },
        discoveredAt: new Date(),
        riskScore: 5.0,
        autoFixable: false,
      });
    }

    // Check for log encryption
    if (config.auditLogging.enabled && !config.auditLogging.logEncryption) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Audit Logs Not Encrypted",
        description:
          "Database audit logs are not encrypted and may contain sensitive information",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Enable encryption for audit logs to protect sensitive information",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html",
        ],
        cweId: "CWE-311",
        metadata: { logEncryption: false },
        discoveredAt: new Date(),
        riskScore: 6.0,
        autoFixable: false,
      });
    }
  }

  /**
   * Analyze backup security configuration
   */
  private analyzeBackupSecurity(
    config: DatabaseSecurityConfig,
    filePath: string,
  ): void {
    // Check for backup configuration
    if (!config.backup.enabled && config.type !== "sqlite") {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Backups Not Configured",
        description: `Database ${config.type} does not have backups configured`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Configure regular database backups for data protection and recovery",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        metadata: { databaseType: config.type, backupEnabled: false },
        discoveredAt: new Date(),
        riskScore: 7.0,
        autoFixable: false,
      });
    }

    // Check for backup encryption
    if (config.backup.enabled && !config.backup.encryption) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Backups Not Encrypted",
        description:
          "Database backups are not encrypted and may expose sensitive data",
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Enable backup encryption to protect sensitive data in backups",
        references: [
          "https://cheatsheetseries.owasp.org/cheatsheets/Database_Security_Cheat_Sheet.html",
        ],
        cweId: "CWE-311",
        metadata: { backupEncryption: false },
        discoveredAt: new Date(),
        riskScore: 8.0,
        autoFixable: false,
      });
    }

    // Check for backup retention
    if (config.backup.enabled && config.backup.retention === 0) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Database Backup Retention Not Configured",
        description:
          "Database backups are enabled but retention policy is not configured",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.DATABASE_POSTGRESQL,
        location: filePath,
        remediation:
          "Configure appropriate backup retention policy based on compliance requirements",
        references: [
          "https://security.berkeley.edu/data-management-database-security",
        ],
        metadata: { backupRetention: 0 },
        discoveredAt: new Date(),
        riskScore: 4.0,
        autoFixable: false,
      });
    }
  }

  /**
   * Perform credential scanning on configuration files
   */
  private async performCredentialScanning(
    configFiles: string[],
  ): Promise<void> {
    const credentialPatterns = [
      {
        pattern: /password\s*[:=]\s*['""]?([^'""]+)['""]?/gi,
        type: "password",
      },
      { pattern: /secret\s*[:=]\s*['""]?([^'""]+)['""]?/gi, type: "secret" },
      { pattern: /token\s*[:=]\s*['""]?([^'""]+)['""]?/gi, type: "token" },
      { pattern: /key\s*[:=]\s*['""]?([^'""]+)['""]?/gi, type: "key" },
      { pattern: /api_key\s*[:=]\s*['""]?([^'""]+)['""]?/gi, type: "api_key" },
      {
        pattern: /private_key\s*[:=]\s*['""]?([^'""]+)['""]?/gi,
        type: "private_key",
      },
      {
        pattern: /connection_string\s*[:=]\s*['""]?([^'""]+)['""]?/gi,
        type: "connection_string",
      },
    ];

    for (const configFile of configFiles) {
      try {
        if (!(await fsPathExists(configFile))) continue;

        const content = await fsReadFile(configFile, "utf8");

        for (const { pattern, type } of credentialPatterns) {
          let match;
          pattern.lastIndex = 0; // Reset regex state

          while ((match = pattern.exec(content)) !== null) {
            const credential = match[1];
            if (credential && credential.length > 3) {
              // Ignore very short values
              this.addFinding({
                id: this.generateFindingId(),
                title: `Potential ${type.replace("_", " ")} in Configuration File`,
                description: `Found potential ${type} in configuration file: ${configFile}`,
                severity: SecuritySeverity.HIGH,
                category: SecurityCategory.DATA_EXPOSURE,
                configurationType: ConfigurationType.DATABASE_POSTGRESQL,
                location: configFile,
                codeSnippet: match[0].replace(credential, "***"),
                remediation:
                  "Move sensitive credentials to environment variables or secure credential management",
                references: [
                  "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
                ],
                cweId: "CWE-200",
                metadata: {
                  credentialType: type,
                  file: configFile,
                  lineMatch: match[0].substring(0, 50),
                },
                discoveredAt: new Date(),
                riskScore: 8.0,
                autoFixable: false,
              });
            }
          }
        }
      } catch (err) {
        this.logger.error(`Failed to scan credentials in ${configFile}:`, err);
      }
    }
  }

  /**
   * Auto-discover database configurations in common locations
   */
  private async discoverDatabaseConfigurations(): Promise<void> {
    const commonConfigPaths = [
      "/etc/postgresql/postgresql.conf",
      "/etc/mysql/my.cnf",
      "/etc/my.cnf",
      "./database.json",
      "./config/database.yml",
      "./config/database.json",
      "./.env",
      "./database.conf",
    ];

    for (const configPath of commonConfigPaths) {
      try {
        if (await fsPathExists(configPath)) {
          this.logger.info(`Discovered database configuration: ${configPath}`);
          await this.analyzeConfigurationFile(configPath);
        }
      } catch (_error) {
        // Silently continue if file cannot be read
      }
    }

    // Check for SQLite database files
    try {
      const sqlitePatterns = ["*.db", "*.sqlite", "*.sqlite3"];
      for (const _pattern of sqlitePatterns) {
        // In production, would use glob to find SQLite files
        // For now, just check common locations
        const commonSqlitePaths = [
          "./database.db",
          "./data.sqlite",
          "./app.db",
        ];
        for (const dbPath of commonSqlitePaths) {
          if (await fsPathExists(dbPath)) {
            await this.analyzeSQLiteDatabase(dbPath);
          }
        }
      }
    } catch (err) {
      this.logger.error("Failed to discover SQLite databases:", err);
    }
  }

  /**
   * Analyze SQLite database file
   */
  private async analyzeSQLiteDatabase(dbPath: string): Promise<void> {
    try {
      const stats = await fsStat(dbPath);

      // Check file permissions
      const mode = stats.mode & parseInt("777", 8);
      if (mode & parseInt("044", 8)) {
        // World readable
        this.addFinding({
          id: this.generateFindingId(),
          title: "SQLite Database File World Readable",
          description: `SQLite database ${dbPath} is readable by all users`,
          severity: SecuritySeverity.HIGH,
          category: SecurityCategory.DATA_EXPOSURE,
          configurationType: ConfigurationType.DATABASE_SQLITE,
          location: dbPath,
          remediation:
            "Restrict file permissions to only necessary users (e.g., chmod 600)",
          references: ["https://sqlite.org/security.html"],
          cweId: "CWE-732",
          metadata: {
            filePath: dbPath,
            permissions: mode.toString(8),
            worldReadable: true,
          },
          discoveredAt: new Date(),
          riskScore: 8.0,
          autoFixable: true,
          autoFixCommand: `chmod 600 ${dbPath}`,
        });
      }

      if (mode & parseInt("022", 8)) {
        // World writable
        this.addFinding({
          id: this.generateFindingId(),
          title: "SQLite Database File World Writable",
          description: `SQLite database ${dbPath} is writable by all users`,
          severity: SecuritySeverity.CRITICAL,
          category: SecurityCategory.DATA_EXPOSURE,
          configurationType: ConfigurationType.DATABASE_SQLITE,
          location: dbPath,
          remediation:
            "Restrict file permissions to only necessary users (e.g., chmod 600)",
          references: ["https://sqlite.org/security.html"],
          cweId: "CWE-732",
          metadata: {
            filePath: dbPath,
            permissions: mode.toString(8),
            worldWritable: true,
          },
          discoveredAt: new Date(),
          riskScore: 9.0,
          autoFixable: true,
          autoFixCommand: `chmod 600 ${dbPath}`,
        });
      }

      // Check for large database files (potential data exposure)
      const sizeInMB = stats.size / (1024 * 1024);
      if (sizeInMB > 100) {
        // > 100MB
        this.addFinding({
          id: this.generateFindingId(),
          title: "Large SQLite Database File",
          description: `SQLite database ${dbPath} is ${sizeInMB.toFixed(0)}MB which may contain significant sensitive data`,
          severity: SecuritySeverity.MEDIUM,
          category: SecurityCategory.DATA_EXPOSURE,
          configurationType: ConfigurationType.DATABASE_SQLITE,
          location: dbPath,
          remediation:
            "Ensure proper access controls and encryption for large database files",
          references: ["https://sqlite.org/security.html"],
          metadata: {
            filePath: dbPath,
            sizeInMB: Math.round(sizeInMB),
          },
          discoveredAt: new Date(),
          riskScore: 5.0,
          autoFixable: false,
        });
      }
    } catch (err) {
      this.logger.error(`Failed to analyze SQLite database ${dbPath}:`, err);
    }
  }

  /**
   * Add security finding to the results
   */
  private addFinding(finding: SecurityFinding): void {
    this.findings.push(finding);
    this.safeEmit("finding_detected", {
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      location: finding.location,
    });
  }

  /**
   * Create analysis result
   */
  private createAnalysisResult(
    analysisId: string,
    databaseConfigs: DatabaseSecurityConfig[],
    duration: number,
  ): SecurityAnalysisResult {
    const target: AnalysisTarget = {
      type: "database" as const,
      name: "Database Configurations",
      location: process.cwd(),
      configuration: {
        databaseCount: databaseConfigs.length,
        supportedTypes: this.supportedDatabases,
        credentialScanning: this.enableCredentialScanning,
      },
    };

    return {
      analysisId,
      timestamp: new Date(),
      duration,
      target,
      findings: [...this.findings],
      riskSummary: this.calculateRiskSummary(),
      recommendations: this.generateRecommendations(),
      complianceAssessment: this.generateComplianceAssessment(),
      metadata: {
        analyzerVersion: "1.0.0",
        configurationVersion: "1.0.0",
        analysisScope: [
          "database_configurations",
          "connection_security",
          "authentication",
          "encryption",
        ],
        excludedItems: [],
        analysisParameters: {
          supportedDatabases: this.supportedDatabases,
          credentialScanning: this.enableCredentialScanning,
          connectionTimeout: this.connectionTimeout,
        },
        environmentInfo: {
          operatingSystem: String(process.platform),
          osVersion: String(process.version),
          architecture: String(process.arch),
          hostname: String(process.env.HOSTNAME) || "unknown",
          uptime: Number(process.uptime()),
          availableMemory: 0,
          totalMemory: 0,
          cpuInfo: {
            model: "unknown",
            cores: 0,
            speed: 0,
            architecture: String(process.arch),
          },
          networkInterfaces: [],
        },
      },
    };
  }

  /**
   * Calculate risk summary from findings
   */
  private calculateRiskSummary(): RiskSummary {
    const summary = {
      overall: SecuritySeverity.LOW,
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      score: 0,
      riskFactors: [],
    };

    // Count findings by severity
    for (const finding of this.findings) {
      switch (finding.severity) {
        case SecuritySeverity.CRITICAL:
          summary.criticalIssues++;
          break;
        case SecuritySeverity.HIGH:
          summary.highIssues++;
          break;
        case SecuritySeverity.MEDIUM:
          summary.mediumIssues++;
          break;
        case SecuritySeverity.LOW:
          summary.lowIssues++;
          break;
      }
    }

    // Calculate overall risk score
    summary.score =
      summary.criticalIssues * 10 +
      summary.highIssues * 7 +
      summary.mediumIssues * 5 +
      summary.lowIssues * 2;

    // Determine risk level
    if (summary.criticalIssues > 0) {
      summary.overall = SecuritySeverity.CRITICAL;
    } else if (summary.highIssues > 0) {
      summary.overall = SecuritySeverity.HIGH;
    } else if (summary.mediumIssues > 3) {
      summary.overall = SecuritySeverity.HIGH;
    } else if (summary.mediumIssues > 0) {
      summary.overall = SecuritySeverity.MEDIUM;
    }

    return summary;
  }

  /**
   * Generate security recommendations
   */
  private generateRecommendations(): SecurityRecommendation[] {
    const recommendations = [];

    // Add recommendations based on common findings
    if (
      this.findings.some(
        (f) => f.category === SecurityCategory.CRYPTOGRAPHIC_FAILURE,
      )
    ) {
      recommendations.push({
        id: this.generateRecommendationId(),
        title: "Implement Comprehensive Database Encryption",
        description:
          "Enable encryption at rest and in transit for all database systems",
        priority: SecuritySeverity.HIGH,
        implementationEffort: "high" as const,
        implementationSteps: [
          "Enable SSL/TLS for all database connections",
          "Configure encryption at rest for data files",
          "Implement proper key management practices",
          "Enable field-level encryption for sensitive data",
        ],
        expectedImpact:
          "Protects sensitive data from unauthorized access and meets compliance requirements",
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        relatedFindings: this.findings
          .filter((f) => f.category === SecurityCategory.CRYPTOGRAPHIC_FAILURE)
          .map((f) => f.id),
        resources: [
          "https://www.postgresql.org/docs/current/encryption-options.html",
          "https://dev.mysql.com/doc/refman/8.0/en/encryption.html",
        ],
      });
    }

    if (
      this.findings.some(
        (f) => f.category === SecurityCategory.WEAK_AUTHENTICATION,
      )
    ) {
      recommendations.push({
        id: this.generateRecommendationId(),
        title: "Strengthen Database Authentication",
        description:
          "Implement strong authentication methods and access controls",
        priority: SecuritySeverity.HIGH,
        implementationEffort: "medium" as const,
        implementationSteps: [
          "Replace weak authentication methods with strong alternatives",
          "Enable multi-factor authentication where possible",
          "Implement strong password policies",
          "Configure role-based access control",
        ],
        expectedImpact:
          "Significantly reduces unauthorized access risk and improves compliance posture",
        category: SecurityCategory.WEAK_AUTHENTICATION,
        relatedFindings: this.findings
          .filter((f) => f.category === SecurityCategory.WEAK_AUTHENTICATION)
          .map((f) => f.id),
        resources: [
          "https://www.postgresql.org/docs/current/auth-methods.html",
          "https://dev.mysql.com/doc/refman/8.0/en/access-control.html",
        ],
      });
    }

    return recommendations;
  }

  /**
   * Generate compliance assessment
   */
  private generateComplianceAssessment(): ComplianceAssessment {
    return {
      framework: "OWASP",
      version: "2021",
      overallScore: 0,
      passedControls: 0,
      failedControls: this.findings.length,
      totalControls: this.findings.length,
      controlResults: [],
      recommendations: [
        "Enable SSL/TLS encryption",
        "Implement proper authentication",
        "Enable audit logging",
      ],
    };
  }

  /**
   * Save analysis results to file
   */
  private async saveAnalysisResults(
    result: SecurityAnalysisResult,
    outputPath: string,
  ): Promise<void> {
    try {
      const outputDir = pathDirname(outputPath);
      await fsEnsureDir(outputDir);
      await fsWriteFile(outputPath, JSON.stringify(result, null, 2));
      this.logger.info(`Analysis results saved to: ${outputPath}`);
    } catch (err) {
      this.logger.error(`Failed to save analysis results:`, err);
      throw err;
    }
  }

  /**
   * Generate unique analysis ID
   */
  private generateAnalysisId(): string {
    return `database_analysis_${Date.now()}_${cryptoRandomBytes(8).toString("hex")}`;
  }

  /**
   * Generate unique finding ID
   */
  private generateFindingId(): string {
    return `finding_${Date.now()}_${cryptoRandomBytes(6).toString("hex")}`;
  }

  /**
   * Generate unique recommendation ID
   */
  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${cryptoRandomBytes(6).toString("hex")}`;
  }

  /**
   * Get current findings
   */
  public getFindings(): SecurityFinding[] {
    return [...this.findings];
  }

  /**
   * Clear all findings
   */
  public clearFindings(): void {
    this.findings.length = 0;
  }

  /**
   * Get analyzer statistics
   */
  public getStatistics(): {
    totalFindings: number;
    findingsBySeverity: Record<SecuritySeverity, number>;
    findingsByCategory: Record<SecurityCategory, number>;
    analysisCount: number;
  } {
    const findingsBySeverity = {} as Record<SecuritySeverity, number>;
    const findingsByCategory = {} as Record<SecurityCategory, number>;

    for (const finding of this.findings) {
      findingsBySeverity[finding.severity] =
        (findingsBySeverity[finding.severity] || 0) + 1;
      findingsByCategory[finding.category] =
        (findingsByCategory[finding.category] || 0) + 1;
    }

    return {
      totalFindings: this.findings.length,
      findingsBySeverity,
      findingsByCategory,
      analysisCount: 1,
    };
  }
}

// Export the analyzer class
export default DatabaseSecurityAnalyzer;
