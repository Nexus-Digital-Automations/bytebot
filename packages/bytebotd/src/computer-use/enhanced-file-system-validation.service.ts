/**
 * Enhanced File System Validation Service - PARLANT Integration
 *
 * Comprehensive PARLANT conversational validation for File System Operation APIs
 * with enterprise-grade security, intelligent path validation, and risk assessment.
 *
 * Features:
 * - Conversational approval for file read/write operations
 * - Intelligent path validation and security checks
 * - Natural language explanation of file operation risks
 * - Real-time backup creation for destructive operations
 * - Content-aware validation for sensitive file types
 * - Sub-300ms validation for safe file operations
 *
 * Security Classifications:
 * - SAFE: Read operations on user files (documents, images)
 * - MODERATE: Write operations on user files
 * - HIGH: System file access, executable files
 * - CRITICAL: System configuration, security files
 * - BLOCKED: Kernel files, core system binaries
 *
 * Performance Requirements:
 * - <100ms for safe read operations
 * - <200ms for user file write operations
 * - <300ms for system file access validation
 * - <500ms for critical file operations with full approval
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ParlantIntegrationService,
  ParlantValidationRequest,
  ParlantConversationContext,
  RiskLevel,
  ConversationalValidationError,
} from '../parlant/parlant-integration.service';
import * as path from 'path';
import * as fs from 'fs/promises';

// ===== FILE SYSTEM VALIDATION INTERFACES =====

/**
 * File system validation context with security controls
 */
export interface FileSystemValidationContext
  extends ParlantConversationContext {
  readonly userHomeDirectory: string;
  readonly workingDirectory: string;
  readonly allowedPaths: string[];
  readonly restrictedPaths: string[];
  readonly securitySettings: {
    allowSystemFileAccess: boolean;
    allowExecutableFileAccess: boolean;
    allowConfigFileModification: boolean;
    requireBackupForDestrictiveOps: boolean;
    maxFileSizeBytes: number;
  };
  readonly performanceRequirements: {
    maxValidationTimeMs: number;
    allowCaching: boolean;
    requiresRealtime: boolean;
  };
}

/**
 * File operation risk assessment
 */
export interface FileOperationRisk {
  readonly riskLevel: RiskLevel;
  readonly pathRisk:
    | 'SAFE'
    | 'USER_AREA'
    | 'SYSTEM_AREA'
    | 'CRITICAL_SYSTEM'
    | 'BLOCKED';
  readonly fileType:
    | 'DOCUMENT'
    | 'IMAGE'
    | 'DATA'
    | 'EXECUTABLE'
    | 'CONFIG'
    | 'SYSTEM'
    | 'UNKNOWN';
  readonly operationType: 'READ' | 'write' | 'delete' | 'modify' | 'create';
  readonly destructive: boolean;
  readonly reversible: boolean;
  readonly impactScope: 'USER' | 'APPLICATION' | 'SYSTEM' | 'CRITICAL';
  readonly securityImplications: string[];
  readonly recommendedSafeguards: string[];
  readonly requiresBackup: boolean;
}

/**
 * File content analysis result
 */
export interface FileContentAnalysis {
  readonly sensitiveDataDetected: boolean;
  readonly fileSize: number;
  readonly mimeType: string;
  readonly encoding?: string;
  readonly containsCredentials: boolean;
  readonly containsPersonalInfo: boolean;
  readonly containsSystemConfig: boolean;
  readonly malwareRisk: 'CLEAN' | 'SUSPICIOUS' | 'BLOCKED';
  readonly contentCategories: string[];
}

/**
 * Path validation result
 */
export interface PathValidationResult {
  readonly isValid: boolean;
  readonly isAllowed: boolean;
  readonly pathType:
    | 'USER_FILE'
    | 'USER_DIR'
    | 'SYSTEM_FILE'
    | 'SYSTEM_DIR'
    | 'RESTRICTED'
    | 'INVALID';
  readonly normalizedPath: string;
  readonly parentDirectory: string;
  readonly filename: string;
  readonly extension: string;
  readonly securityViolations: string[];
  readonly recommendations: string[];
}

// ===== ENHANCED FILE SYSTEM VALIDATION SERVICE =====

@Injectable()
export class EnhancedFileSystemValidationService {
  private readonly logger = new Logger(
    EnhancedFileSystemValidationService.name,
  );

  // File operation cache for performance
  private readonly operationCache = new Map<
    string,
    {
      result: boolean;
      timestamp: Date;
      expiryMs: number;
      operationType: string;
    }
  >();

  // Performance metrics
  private readonly performanceMetrics = {
    totalFileOperations: 0,
    readOperations: 0,
    writeOperations: 0,
    blockedOperations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
    backupsCreated: 0,
    securityViolations: 0,
    sub100msOperations: 0,
    sub200msOperations: 0,
    sub300msOperations: 0,
  };

  // System path patterns for risk assessment
  private readonly systemPaths = {
    critical: [
      '/etc/passwd',
      '/etc/shadow',
      '/etc/sudoers',
      '/boot/',
      '/sys/',
      '/proc/',
      'C:\\Windows\\System32\\',
      'C:\\Windows\\',
      '/usr/bin/',
      '/usr/sbin/',
    ],
    system: [
      '/etc/',
      '/var/log/',
      '/usr/',
      '/opt/',
      'C:\\Program Files\\',
      'C:\\Program Files (x86)\\',
      '/Applications/',
    ],
    restricted: [
      '/dev/',
      '/proc/sys/',
      'C:\\Windows\\System32\\config\\',
      'C:\\Windows\\System32\\drivers\\',
    ],
  };

  constructor(
    private readonly parlantIntegrationService: ParlantIntegrationService,
  ) {
    this.logger.log('Enhanced File System Validation Service initialized');

    // Cache cleanup interval
    setInterval(() => this.cleanupOperationCache(), 300000); // Every 5 minutes

    // Performance metrics logging
    setInterval(() => this.logPerformanceMetrics(), 300000); // Every 5 minutes
  }

  // ===== FILE READ VALIDATION =====

  /**
   * Validate file read operations with content analysis
   */
  async validateFileRead(
    filePath: string,
    context: FileSystemValidationContext,
  ): Promise<boolean> {
    const operationId = `file_read_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.performanceMetrics.totalFileOperations++;
      this.performanceMetrics.readOperations++;

      // Performance optimization: check cache first
      const cacheKey = this.generateCacheKey('read', filePath, context.userId);
      const cached = this.getCachedOperation(cacheKey);
      if (cached) {
        this.updatePerformanceMetrics(Date.now() - startTime, true);
        return cached;
      }

      // Path validation and risk assessment
      const pathValidation = await this.validatePath(filePath, context);
      if (!pathValidation.isValid || !pathValidation.isAllowed) {
        this.performanceMetrics.securityViolations++;
        this.logger.warn(
          `[${operationId}] File read blocked due to path validation`,
          {
            operationId,
            filePath,
            pathType: pathValidation.pathType,
            violations: pathValidation.securityViolations,
          },
        );
        return false;
      }

      const operationRisk = await this.assessFileOperationRisk(
        filePath,
        'read',
        context,
      );

      // Fast-path for safe read operations
      if (
        operationRisk.riskLevel === RiskLevel._MINIMAL &&
        operationRisk.pathRisk === 'SAFE'
      ) {
        this.setCachedOperation(cacheKey, true, 60000); // 1 minute cache
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // Conversational validation for higher risk reads
      const validationRequest: ParlantValidationRequest = {
        functionName: `FileSystem.readFile`,
        functionParams: {
          path: pathValidation.normalizedPath,
          fileType: operationRisk.fileType,
          pathRisk: operationRisk.pathRisk,
          impactScope: operationRisk.impactScope,
        },
        actionDescription: this.generateReadDescription(
          filePath,
          operationRisk,
          pathValidation,
        ),
        context: context,
        riskLevel: operationRisk.riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(
            context.performanceRequirements.maxValidationTimeMs,
            200,
          ),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse =
        await this.parlantIntegrationService.validateFunctionExecution(
          validationRequest,
        );

      // Cache approved safe operations
      if (
        validationResponse.approved &&
        operationRisk.riskLevel <= RiskLevel._LOW
      ) {
        this.setCachedOperation(cacheKey, true, 30000); // 30 second cache
      }

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;
    } catch (error) {
      this.logger.error(`[${operationId}] File read validation failed`, {
        operationId,
        filePath,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  // ===== FILE WRITE VALIDATION =====

  /**
   * Validate file write operations with backup creation
   */
  async validateFileWrite(
    filePath: string,
    content: string | Buffer,
    context: FileSystemValidationContext,
  ): Promise<boolean> {
    const operationId = `file_write_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.performanceMetrics.totalFileOperations++;
      this.performanceMetrics.writeOperations++;

      // Path validation
      const pathValidation = await this.validatePath(filePath, context);
      if (!pathValidation.isValid || !pathValidation.isAllowed) {
        this.performanceMetrics.securityViolations++;
        this.performanceMetrics.blockedOperations++;
        return false;
      }

      // Risk assessment for write operation
      const operationRisk = await this.assessFileOperationRisk(
        filePath,
        'write',
        context,
      );

      // Content analysis for sensitive data
      const contentAnalysis = await this.analyzeFileContent(
        content,
        pathValidation.extension,
      );

      // Block operations that are too risky
      if (
        operationRisk.pathRisk === 'BLOCKED' ||
        contentAnalysis.malwareRisk === 'BLOCKED'
      ) {
        this.performanceMetrics.securityViolations++;
        this.performanceMetrics.blockedOperations++;
        this.logger.warn(
          `[${operationId}] File write blocked due to security risk`,
          {
            operationId,
            filePath,
            pathRisk: operationRisk.pathRisk,
            malwareRisk: contentAnalysis.malwareRisk,
          },
        );
        return false;
      }

      // Create backup if required
      let backupCreated = false;
      if (
        operationRisk.requiresBackup &&
        context.securitySettings.requireBackupForDestrictiveOps
      ) {
        backupCreated = await this.createFileBackup(filePath, operationId);
        if (backupCreated) {
          this.performanceMetrics.backupsCreated++;
        }
      }

      // Conversational validation with comprehensive context
      const validationRequest: ParlantValidationRequest = {
        functionName: `FileSystem.writeFile`,
        functionParams: {
          path: pathValidation.normalizedPath,
          fileType: operationRisk.fileType,
          pathRisk: operationRisk.pathRisk,
          contentSize:
            typeof content === 'string' ? content.length : content.length,
          sensitiveData: contentAnalysis.sensitiveDataDetected,
          destructive: operationRisk.destructive,
          backupCreated,
        },
        actionDescription: this.generateWriteDescription(
          filePath,
          operationRisk,
          contentAnalysis,
          backupCreated,
        ),
        context: context,
        riskLevel: this.escalateRiskForWrite(
          operationRisk.riskLevel,
          contentAnalysis,
        ),
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(
            context.performanceRequirements.maxValidationTimeMs,
            300,
          ),
          requiresRealtime: false, // Write operations can tolerate higher latency
        },
      };

      const validationResponse =
        await this.parlantIntegrationService.validateFunctionExecution(
          validationRequest,
        );

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;
    } catch (error) {
      this.logger.error(`[${operationId}] File write validation failed`, {
        operationId,
        filePath,
        contentSize:
          typeof content === 'string' ? content.length : content.length,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  // ===== FILE DELETE VALIDATION =====

  /**
   * Validate file delete operations with comprehensive safeguards
   */
  async validateFileDelete(
    filePath: string,
    context: FileSystemValidationContext,
  ): Promise<boolean> {
    const operationId = `file_delete_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.performanceMetrics.totalFileOperations++;

      // Path validation
      const pathValidation = await this.validatePath(filePath, context);
      if (!pathValidation.isValid || !pathValidation.isAllowed) {
        this.performanceMetrics.securityViolations++;
        this.performanceMetrics.blockedOperations++;
        return false;
      }

      // Risk assessment for delete operation
      const operationRisk = await this.assessFileOperationRisk(
        filePath,
        'delete',
        context,
      );

      // Delete operations are inherently destructive and require validation
      if (
        operationRisk.pathRisk === 'BLOCKED' ||
        operationRisk.pathRisk === 'CRITICAL_SYSTEM'
      ) {
        this.performanceMetrics.securityViolations++;
        this.performanceMetrics.blockedOperations++;
        this.logger.warn(
          `[${operationId}] File delete blocked due to critical system file`,
          {
            operationId,
            filePath,
            pathRisk: operationRisk.pathRisk,
          },
        );
        return false;
      }

      // Always create backup for delete operations
      const backupCreated = await this.createFileBackup(filePath, operationId);
      if (backupCreated) {
        this.performanceMetrics.backupsCreated++;
      }

      // Conversational validation for delete operation
      const validationRequest: ParlantValidationRequest = {
        functionName: `FileSystem.deleteFile`,
        functionParams: {
          path: pathValidation.normalizedPath,
          fileType: operationRisk.fileType,
          pathRisk: operationRisk.pathRisk,
          destructive: true,
          reversible: backupCreated,
          backupCreated,
        },
        actionDescription: this.generateDeleteDescription(
          filePath,
          operationRisk,
          backupCreated,
        ),
        context: context,
        riskLevel: RiskLevel._HIGH, // All delete operations are high risk
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(
            context.performanceRequirements.maxValidationTimeMs,
            500,
          ),
          requiresRealtime: false,
        },
      };

      const validationResponse =
        await this.parlantIntegrationService.validateFunctionExecution(
          validationRequest,
        );

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;
    } catch (error) {
      this.logger.error(`[${operationId}] File delete validation failed`, {
        operationId,
        filePath,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  // ===== PATH AND RISK ASSESSMENT =====

  /**
   * Validate file path against security policies
   */
  private async validatePath(
    filePath: string,
    context: FileSystemValidationContext,
  ): Promise<PathValidationResult> {
    const normalizedPath = path.resolve(filePath);
    const parentDirectory = path.dirname(normalizedPath);
    const filename = path.basename(normalizedPath);
    const extension = path.extname(normalizedPath).toLowerCase();

    const result: PathValidationResult = {
      isValid: true,
      isAllowed: true,
      pathType: 'USER_FILE',
      normalizedPath,
      parentDirectory,
      filename,
      extension,
      securityViolations: [],
      recommendations: [],
    };

    // Check for path traversal attacks
    if (filePath.includes('..') || filePath.includes('//')) {
      result.isValid = false;
      result.securityViolations.push('path_traversal_detected');
      result.recommendations.push('use_absolute_paths_only');
    }

    // Check against restricted paths
    for (const restrictedPath of context.restrictedPaths) {
      if (normalizedPath.startsWith(restrictedPath)) {
        result.isAllowed = false;
        result.pathType = 'RESTRICTED';
        result.securityViolations.push(
          `restricted_path_access: ${restrictedPath}`,
        );
        result.recommendations.push('access_allowed_paths_only');
      }
    }

    // Determine path type based on system path patterns
    result.pathType = this.classifyPath(normalizedPath);

    // Check system path access permissions
    if (
      (result.pathType === 'SYSTEM_FILE' || result.pathType === 'SYSTEM_DIR') &&
      !context.securitySettings.allowSystemFileAccess
    ) {
      result.isAllowed = false;
      result.securityViolations.push('system_file_access_not_allowed');
      result.recommendations.push('enable_system_file_access_in_settings');
    }

    // Check executable file access
    const executableExtensions = [
      '.exe',
      '.bat',
      '.sh',
      '.cmd',
      '.com',
      '.scr',
      '.msi',
    ];
    if (
      executableExtensions.includes(extension) &&
      !context.securitySettings.allowExecutableFileAccess
    ) {
      result.isAllowed = false;
      result.securityViolations.push('executable_file_access_not_allowed');
      result.recommendations.push('enable_executable_file_access_in_settings');
    }

    return result;
  }

  /**
   * Assess risk level for file operation
   */
  private async assessFileOperationRisk(
    filePath: string,
    operation: 'read' | 'write' | 'delete',
    context: FileSystemValidationContext,
  ): Promise<FileOperationRisk> {
    const normalizedPath = path.resolve(filePath);
    const extension = path.extname(normalizedPath).toLowerCase();

    const risk: FileOperationRisk = {
      riskLevel: RiskLevel._LOW,
      pathRisk: 'SAFE',
      fileType: 'UNKNOWN',
      operationType: operation,
      destructive: operation !== 'read',
      reversible: operation === 'read',
      impactScope: 'USER',
      securityImplications: [],
      recommendedSafeguards: [],
      requiresBackup: false,
    };

    // Classify path risk
    risk.pathRisk = this.classifyPathRisk(normalizedPath);

    // Classify file type
    risk.fileType = this.classifyFileType(extension);

    // Assess operation-specific risks
    this.assessOperationRisk(risk, operation);

    // Determine impact scope
    this.determineImpactScope(risk, normalizedPath);

    // Set security implications and safeguards
    this.setSecurityImplications(risk);

    return risk;
  }

  /**
   * Classify path based on system patterns
   */
  private classifyPath(filePath: string): PathValidationResult['pathType'] {
    // Check critical system paths
    for (const criticalPath of this.systemPaths.critical) {
      if (filePath.startsWith(criticalPath)) {
        return 'SYSTEM_FILE';
      }
    }

    // Check general system paths
    for (const systemPath of this.systemPaths.system) {
      if (filePath.startsWith(systemPath)) {
        return 'SYSTEM_DIR';
      }
    }

    // Check restricted paths
    for (const restrictedPath of this.systemPaths.restricted) {
      if (filePath.startsWith(restrictedPath)) {
        return 'RESTRICTED';
      }
    }

    // Default to user file
    return 'USER_FILE';
  }

  /**
   * Classify path risk level
   */
  private classifyPathRisk(filePath: string): FileOperationRisk['pathRisk'] {
    // Check for blocked paths
    for (const restrictedPath of this.systemPaths.restricted) {
      if (filePath.startsWith(restrictedPath)) {
        return 'BLOCKED';
      }
    }

    // Check for critical system paths
    for (const criticalPath of this.systemPaths.critical) {
      if (filePath.startsWith(criticalPath)) {
        return 'CRITICAL_SYSTEM';
      }
    }

    // Check for system paths
    for (const systemPath of this.systemPaths.system) {
      if (filePath.startsWith(systemPath)) {
        return 'SYSTEM_AREA';
      }
    }

    // Check if in user area
    if (
      filePath.includes('/home/') ||
      filePath.includes('/Users/') ||
      filePath.includes('C:\\Users\\')
    ) {
      return 'USER_AREA';
    }

    return 'SAFE';
  }

  /**
   * Classify file type based on extension
   */
  private classifyFileType(extension: string): FileOperationRisk['fileType'] {
    const fileTypeMap: Record<string, FileOperationRisk['fileType']> = {
      // Documents
      '.txt': 'DOCUMENT',
      '.doc': 'DOCUMENT',
      '.docx': 'DOCUMENT',
      '.pdf': 'DOCUMENT',
      '.md': 'DOCUMENT',

      // Images
      '.jpg': 'IMAGE',
      '.jpeg': 'IMAGE',
      '.png': 'IMAGE',
      '.gif': 'IMAGE',
      '.bmp': 'IMAGE',

      // Data files
      '.json': 'DATA',
      '.xml': 'DATA',
      '.csv': 'DATA',
      '.yaml': 'DATA',
      '.yml': 'DATA',

      // Executables
      '.exe': 'EXECUTABLE',
      '.bat': 'EXECUTABLE',
      '.sh': 'EXECUTABLE',
      '.cmd': 'EXECUTABLE',
      '.msi': 'EXECUTABLE',

      // Config files
      '.conf': 'CONFIG',
      '.config': 'CONFIG',
      '.ini': 'CONFIG',
      '.cfg': 'CONFIG',
      '.env': 'CONFIG',

      // System files
      '.sys': 'SYSTEM',
      '.dll': 'SYSTEM',
      '.so': 'SYSTEM',
      '.dylib': 'SYSTEM',
    };

    return fileTypeMap[extension] || 'UNKNOWN';
  }

  // ===== CONTENT ANALYSIS =====

  /**
   * Analyze file content for security risks
   */
  private async analyzeFileContent(
    content: string | Buffer,
    extension: string,
  ): Promise<FileContentAnalysis> {
    const contentStr =
      typeof content === 'string'
        ? content
        : content.toString('utf8', 0, Math.min(content.length, 1024));
    const contentSize =
      typeof content === 'string' ? content.length : content.length;

    const analysis: FileContentAnalysis = {
      sensitiveDataDetected: false,
      fileSize: contentSize,
      mimeType: this.inferMimeType(extension),
      containsCredentials: false,
      containsPersonalInfo: false,
      containsSystemConfig: false,
      malwareRisk: 'CLEAN',
      contentCategories: [],
    };

    // Check for sensitive data patterns
    this.checkForCredentials(contentStr, analysis);
    this.checkForPersonalInfo(contentStr, analysis);
    this.checkForSystemConfig(contentStr, analysis);

    // Simple malware heuristics
    this.checkMalwareRisk(contentStr, analysis);

    // Set overall sensitive data flag
    analysis.sensitiveDataDetected =
      analysis.containsCredentials ||
      analysis.containsPersonalInfo ||
      analysis.containsSystemConfig;

    return analysis;
  }

  private checkForCredentials(
    content: string,
    analysis: FileContentAnalysis,
  ): void {
    const credentialPatterns = [
      /password\s*[:=]\s*[^\s\n]+/i,
      /api[_-]?key\s*[:=]\s*[^\s\n]+/i,
      /secret\s*[:=]\s*[^\s\n]+/i,
      /token\s*[:=]\s*[^\s\n]+/i,
      /BEGIN\s+(RSA\s+)?PRIVATE\s+KEY/i,
    ];

    for (const pattern of credentialPatterns) {
      if (pattern.test(content)) {
        analysis.containsCredentials = true;
        analysis.contentCategories.push('credentials');
        break;
      }
    }
  }

  private checkForPersonalInfo(
    content: string,
    analysis: FileContentAnalysis,
  ): void {
    const personalInfoPatterns = [
      /\d{3}-\d{2}-\d{4}/, // SSN
      /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, // Credit card
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
      /\(\d{3}\)\s*\d{3}-\d{4}/, // Phone number
    ];

    for (const pattern of personalInfoPatterns) {
      if (pattern.test(content)) {
        analysis.containsPersonalInfo = true;
        analysis.contentCategories.push('personal_info');
        break;
      }
    }
  }

  private checkForSystemConfig(
    content: string,
    analysis: FileContentAnalysis,
  ): void {
    const systemConfigPatterns = [
      /sudoers/i,
      /iptables/i,
      /firewall/i,
      /hosts\s*[:=]/i,
      /registry/i,
      /kernel/i,
    ];

    for (const pattern of systemConfigPatterns) {
      if (pattern.test(content)) {
        analysis.containsSystemConfig = true;
        analysis.contentCategories.push('system_config');
        break;
      }
    }
  }

  private checkMalwareRisk(
    content: string,
    analysis: FileContentAnalysis,
  ): void {
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /exec\s*\(/i,
      /system\s*\(/i,
      /shell_exec/i,
      /base64_decode/i,
      /powershell\s+-e/i,
    ];

    let suspiciousCount = 0;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        suspiciousCount++;
      }
    }

    if (suspiciousCount >= 3) {
      analysis.malwareRisk = 'BLOCKED';
    } else if (suspiciousCount >= 1) {
      analysis.malwareRisk = 'SUSPICIOUS';
    }
  }

  private inferMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.exe': 'application/x-executable',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  // ===== BACKUP OPERATIONS =====

  /**
   * Create backup of file before destructive operations
   */
  private async createFileBackup(
    filePath: string,
    operationId: string,
  ): Promise<boolean> {
    try {
      const backupPath = `${filePath}.backup.${operationId}.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);

      this.logger.log(`File backup created: ${backupPath}`, {
        originalFile: filePath,
        backupFile: backupPath,
        operationId,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to create file backup: ${filePath}`, {
        filePath,
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // ===== HELPER METHODS =====

  private assessOperationRisk(
    risk: FileOperationRisk,
    operation: string,
  ): void {
    switch (operation) {
      case 'read':
        risk.destructive = false;
        risk.reversible = true;
        break;
      case 'write':
        risk.destructive = true;
        risk.reversible = true;
        risk.requiresBackup = true;
        break;
      case 'delete':
        risk.destructive = true;
        risk.reversible = false;
        risk.requiresBackup = true;
        break;
    }
  }

  private determineImpactScope(
    risk: FileOperationRisk,
    filePath: string,
  ): void {
    if (risk.pathRisk === 'CRITICAL_SYSTEM' || risk.fileType === 'SYSTEM') {
      risk.impactScope = 'CRITICAL';
      risk.riskLevel = RiskLevel._CRITICAL;
    } else if (risk.pathRisk === 'SYSTEM_AREA' || risk.fileType === 'CONFIG') {
      risk.impactScope = 'SYSTEM';
      risk.riskLevel = RiskLevel._HIGH;
    } else if (risk.fileType === 'EXECUTABLE') {
      risk.impactScope = 'APPLICATION';
      risk.riskLevel = RiskLevel._MODERATE;
    } else {
      risk.impactScope = 'USER';
      risk.riskLevel = risk.destructive ? RiskLevel._MODERATE : RiskLevel._LOW;
    }
  }

  private setSecurityImplications(risk: FileOperationRisk): void {
    switch (risk.riskLevel) {
      case RiskLevel._CRITICAL:
        risk.securityImplications.push(
          'system_stability_risk',
          'security_compromise_risk',
        );
        risk.recommendedSafeguards.push(
          'system_backup',
          'multi_step_approval',
          'rollback_plan',
        );
        break;
      case RiskLevel._HIGH:
        risk.securityImplications.push(
          'application_impact',
          'configuration_change',
        );
        risk.recommendedSafeguards.push(
          'backup_creation',
          'approval_required',
          'monitoring',
        );
        break;
      case RiskLevel._MODERATE:
        risk.securityImplications.push('user_data_impact');
        risk.recommendedSafeguards.push('user_confirmation', 'logging');
        break;
      default:
        risk.recommendedSafeguards.push('basic_logging');
    }
  }

  private escalateRiskForWrite(
    riskLevel: RiskLevel,
    contentAnalysis: FileContentAnalysis,
  ): RiskLevel {
    if (contentAnalysis.malwareRisk === 'BLOCKED') {
      return RiskLevel._CRITICAL;
    }
    if (contentAnalysis.sensitiveDataDetected) {
      return riskLevel === RiskLevel._LOW
        ? RiskLevel._MODERATE
        : riskLevel === RiskLevel._MODERATE
          ? RiskLevel._HIGH
          : riskLevel;
    }
    return riskLevel;
  }

  // ===== DESCRIPTION GENERATORS =====

  private generateReadDescription(
    filePath: string,
    risk: FileOperationRisk,
    pathValidation: PathValidationResult,
  ): string {
    return `Read file: ${pathValidation.filename} (${risk.fileType.toLowerCase()}) from ${risk.pathRisk.toLowerCase()} area - Risk: ${risk.riskLevel}`;
  }

  private generateWriteDescription(
    filePath: string,
    risk: FileOperationRisk,
    content: FileContentAnalysis,
    backupCreated: boolean,
  ): string {
    const sizeStr = `${(content.fileSize / 1024).toFixed(1)}KB`;
    const backupStr = backupCreated ? ' (backup created)' : '';
    const sensitiveStr = content.sensitiveDataDetected
      ? ' containing sensitive data'
      : '';

    return `Write ${sizeStr} to ${risk.fileType.toLowerCase()} file in ${risk.pathRisk.toLowerCase()} area${sensitiveStr}${backupStr} - Risk: ${risk.riskLevel}`;
  }

  private generateDeleteDescription(
    filePath: string,
    risk: FileOperationRisk,
    backupCreated: boolean,
  ): string {
    const backupStr = backupCreated ? ' (backup created)' : '';
    return `Delete ${risk.fileType.toLowerCase()} file from ${risk.pathRisk.toLowerCase()} area${backupStr} - Risk: HIGH (irreversible)`;
  }

  // ===== CACHE MANAGEMENT =====

  private generateCacheKey(
    operation: string,
    filePath: string,
    userId: string,
  ): string {
    const normalizedPath = path.resolve(filePath);
    return `${operation}_${userId}_${normalizedPath}`;
  }

  private getCachedOperation(key: string): boolean | null {
    const cached = this.operationCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp.getTime() > cached.expiryMs) {
      this.operationCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCachedOperation(
    key: string,
    result: boolean,
    expiryMs: number,
  ): void {
    this.operationCache.set(key, {
      result,
      timestamp: new Date(),
      expiryMs,
      operationType: key.split('_')[0],
    });
  }

  private cleanupOperationCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.operationCache.entries()) {
      if (now - cached.timestamp.getTime() > cached.expiryMs) {
        this.operationCache.delete(key);
      }
    }
  }

  // ===== PERFORMANCE TRACKING =====

  private updatePerformanceMetrics(
    durationMs: number,
    fromCache: boolean,
  ): void {
    if (fromCache) {
      this.performanceMetrics.cacheHitRate =
        (this.performanceMetrics.cacheHitRate *
          (this.performanceMetrics.totalFileOperations - 1) +
          1) /
        this.performanceMetrics.totalFileOperations;
    } else {
      this.performanceMetrics.averageValidationTime =
        (this.performanceMetrics.averageValidationTime *
          (this.performanceMetrics.totalFileOperations - 1) +
          durationMs) /
        this.performanceMetrics.totalFileOperations;

      if (durationMs < 100) this.performanceMetrics.sub100msOperations++;
      if (durationMs < 200) this.performanceMetrics.sub200msOperations++;
      if (durationMs < 300) this.performanceMetrics.sub300msOperations++;
    }
  }

  private logPerformanceMetrics(): void {
    const { totalFileOperations } = this.performanceMetrics;

    this.logger.log('Enhanced File System Validation Performance Metrics', {
      totalFileOperations,
      readOperations: this.performanceMetrics.readOperations,
      writeOperations: this.performanceMetrics.writeOperations,
      blockedOperations: this.performanceMetrics.blockedOperations,
      averageValidationTime: `${this.performanceMetrics.averageValidationTime.toFixed(2)}ms`,
      cacheHitRate: `${(this.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`,
      backupsCreated: this.performanceMetrics.backupsCreated,
      securityViolations: this.performanceMetrics.securityViolations,
      sub100msRate: `${((this.performanceMetrics.sub100msOperations / totalFileOperations) * 100).toFixed(1)}%`,
      sub200msRate: `${((this.performanceMetrics.sub200msOperations / totalFileOperations) * 100).toFixed(1)}%`,
      sub300msRate: `${((this.performanceMetrics.sub300msOperations / totalFileOperations) * 100).toFixed(1)}%`,
      cacheSize: this.operationCache.size,
    });
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
}
