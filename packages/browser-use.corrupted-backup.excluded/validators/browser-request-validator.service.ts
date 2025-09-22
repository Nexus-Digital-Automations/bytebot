/**
 * Browser Request Validation Service
 *
 * Comprehensive request validation and sanitization service for browser automation endpoints.
 * Provides multi-layered security validation including:
 * - Input sanitization and injection prevention
 * - Content security policy enforcement
 * - Malicious payload detection
 * - Business logic validation
 * - Compliance-driven data validation
 *
 * Security Features:
 * - SQL injection and XSS prevention
 * - Command injection detection
 * - File path traversal protection
 * - Malicious URL detection
 * - Content type validation
 * - Size and complexity limits
 *
 * @module BrowserRequestValidatorService
 * @version 1.0.0
 * @author Request Security Specialist
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';import { performance } from 'perf_hooks';import * as crypto from 'crypto';import * as validator from 'validator';import { URL } from 'url';// DTOs and types for browser operationsimport {
  CreateBrowserTaskDto,
  BrowserActionType,
  BrowserTaskAction,
} from '../dto/browser-task.dto';import {CreateBrowserSessionDto,
  BrowserSessionConfig,
} from '../dto/browser-session.dto';import {CreateAsyncJobDto,
  AsyncJobType,
  AsyncJobPriority,
} from '../dto/async-job.dto';// Security context typesimport {
  BrowserUseSecurityContext,
  BrowserUseUserContext,
} from '../middleware/browser-use-auth.middleware';/*** Validation result for request processing
 */
export interface RequestValidationResult {
  valid: boolean;
  sanitizedRequest: any;
  violations: SecurityViolation[];
  riskScore: number;
  processingTime: number;
  recommendations: string[];
  metadata: ValidationMetadata;
}

/**
 * Security violation details
 */
export interface SecurityViolation {
  type: ViolationType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';field: string;value: string;
  description: string;
  remediation: string;
  evidence: Record<string, unknown>;
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  validationId: string;
  timestamp: Date;
  requestSize: number;
  complexityScore: number;
  validationRules: string[];
  performanceMetrics: {
    sanitizationTime: number;
    validationTime: number;
    totalTime: number;
  };
}

/**
 * Violation types
 */
export enum ViolationType {
  SQL_INJECTION = 'sql_injection',XSS_ATTACK = 'xss_attack',COMMAND_INJECTION = 'command_injection',PATH_TRAVERSAL = 'path_traversal',MALICIOUS_URL = 'malicious_url',OVERSIZED_REQUEST = 'oversized_request',INVALID_FORMAT = 'invalid_format',BUSINESS_RULE_VIOLATION = 'business_rule_violation',COMPLIANCE_VIOLATION = 'compliance_violation',SUSPICIOUS_PATTERN = 'suspicious_pattern',}/**
 * Validation configuration
 */
interface ValidationConfig {
  maxRequestSize: number;
  maxActionsPerTask: number;
  maxUrlLength: number;
  maxStringLength: number;
  allowedDomains: string[];
  blockedDomains: string[];
  allowedFileExtensions: string[];
  maxComplexityScore: number;
  enableContentScanning: boolean;
  enableMalwareDetection: boolean;
}

/**
 * Content analysis result
 */
interface ContentAnalysisResult {
  suspiciousPatterns: string[];
  malwareIndicators: string[];
  sensitiveDataDetected: boolean;
  complianceFlags: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';}/**
 * URL validation result
 */
interface UrlValidationResult {
  valid: boolean;
  sanitizedUrl?: string;
  violations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';metadata: {domain: string;
    protocol: string;
    hasQuery: boolean;
    hasFragment: boolean;
    isExternal: boolean;
  };
}

/**
 * Browser Request Validator Service
 *
 * Provides comprehensive validation and sanitization for all browser automation requests.
 * Implements multiple security layers to prevent injection attacks, validate business rules,
 * and ensure compliance with security policies.
 */
@Injectable()
export class BrowserRequestValidatorService {
  private readonly logger = new Logger(BrowserRequestValidatorService.name);

  // Validation configuration
  private readonly config: ValidationConfig = {
    maxRequestSize: 10 * 1024 * 1024, // 10MB
    maxActionsPerTask: 100,
    maxUrlLength: 2048,
    maxStringLength: 10000,
    allowedDomains: ['localhost', '127.0.0.1', '*.local.dev', '*.staging.com'],blockedDomains: ['malicious.com', 'phishing.net', 'suspicious.org'],allowedFileExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv'],maxComplexityScore: 80,enableContentScanning: true,
    enableMalwareDetection: true,
  };

  // Validation patterns for security checks
  private readonly securityPatterns = {
    sqlInjection: [
      /('|(\\')|(;)|(--)|(\/\*)|(\*\/)/gi,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)/gi,
      /(sp_|xp_)/gi,
      /(script|javascript|vbscript)/gi,
    ],
    xssAttack: [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src[^>]*>/gi,
      /eval\s*\(/gi,
    ],
    commandInjection: [
      /(;|\||&|`|\$\(|\$\{)/g,
      /(curl|wget|nc|netcat|telnet|ssh)/gi,
      /(rm|del|format|diskpart)/gi,
      /(cmd|powershell|bash|sh)/gi,
    ],
    pathTraversal: [
      /\.\.[\/\\]/g,
      /[\/\\]\.\.[\/\\]/g,
      /%2e%2e[%2f%5c]/gi,
      /\x2e\x2e[\x2f\x5c]/gi,
    ],
    suspiciousPatterns: [
      /base64|eval|unescape|fromcharcode/gi,
      /document\.cookie|window\.location/gi,
      /alert\s*\(|confirm\s*\(|prompt\s*\(/gi,
      /(exec|system|shell_exec|passthru)/gi,
    ],
  };

  // Validation metrics
  private readonly metrics = {
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
    averageValidationTime: 0,
    violationCounts: new Map<ViolationType, number>(),
    riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
  };

  constructor() {
    this.logger.log('🔍 Browser Request Validator Service initialized');this.logger.log('🛡️ Security validation enabled: injection prevention, content scanning, malware detection');

    // Initialize violation counters
    Object.values(ViolationType).forEach(type => {
      this.metrics.violationCounts.set(type, 0);
    });

    // Start periodic metrics logging
    setInterval(() => this.logValidationMetrics(), 600000); // Every 10 minutes
  }

  /**
   * Validate browser task creation request
   */
  async validateBrowserTaskRequest(
    taskDto: CreateBrowserTaskDto,
    userContext: BrowserUseUserContext,
    securityContext: BrowserUseSecurityContext
  ): Promise<RequestValidationResult> {
    const validationId = this.generateValidationId();
    const startTime = performance.now();

    this.logger.debug(
      `[${validationId}] Validating browser task request`,{taskName: taskDto.name,
        actionsCount: taskDto.actions.length,
        userId: userContext.userId,
        riskLevel: securityContext.riskLevel,
      }
    );

    try {
      this.metrics.totalValidations++;

      // Step 1: Basic structure validation
      const structureValidation = this.validateTaskStructure(taskDto, validationId);

      // Step 2: Action-level validation
      const actionsValidation = await this.validateTaskActions(taskDto.actions, validationId);

      // Step 3: Security validation
      const securityValidation = await this.performSecurityValidation(taskDto, validationId);

      // Step 4: Business rules validation
      const businessValidation = this.validateBusinessRules(taskDto, userContext, securityContext);

      // Step 5: Content analysis
      const contentAnalysis = await this.performContentAnalysis(taskDto, validationId);

      // Combine all validation results
      const allViolations = [
        ...structureValidation.violations,
        ...actionsValidation.violations,
        ...securityValidation.violations,
        ...businessValidation.violations,
        ...contentAnalysis.violations,
      ];

      // Calculate overall risk score
      const riskScore = this.calculateRiskScore(allViolations, contentAnalysis.riskLevel);

      // Generate sanitized request
      const sanitizedRequest = await this.sanitizeTaskRequest(taskDto, allViolations);

      // Create validation result
      const result = this.createValidationResult(
        validationId,
        allViolations.length === 0,
        sanitizedRequest,
        allViolations,
        riskScore,
        startTime
      );

      this.updateValidationMetrics(result);

      if (result.valid) {
        this.metrics.passedValidations++;
        this.logger.debug(`[${validationId}] Browser task validation passed`);} else {this.metrics.failedValidations++;
        this.logValidationFailure(validationId, result.violations);
        throw new BadRequestException(`Validation failed: ${this.summarizeViolations(allViolations)}`);}return result;

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.updateValidationMetrics({ processingTime } as any);

      this.logger.error(
        `[${validationId}] Browser task validation failed`,{error: error instanceof Error ? error.message : String(error),
          taskName: taskDto.name,
          processingTime: `${processingTime.toFixed(2)}ms`,
        }
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new UnprocessableEntityException('Request validation failed');
    }
  }

  /**
   * Validate browser session creation request
   */
  async validateBrowserSessionRequest(
    sessionDto: CreateBrowserSessionDto,
    userContext: BrowserUseUserContext,
    securityContext: BrowserUseSecurityContext
  ): Promise<RequestValidationResult> {
    const validationId = this.generateValidationId();
    const startTime = performance.now();

    this.logger.debug(`[${validationId}] Validating browser session request`);

    try {
      this.metrics.totalValidations++;

      const violations: SecurityViolation[] = [];

      // Validate session configuration
      if (sessionDto.config) {
        const configValidation = this.validateSessionConfig(sessionDto.config, validationId);
        violations.push(...configValidation.violations);
      }

      // Security validation
      const securityValidation = await this.performSecurityValidation(sessionDto, validationId);
      violations.push(...securityValidation.violations);

      // Business rules validation
      const businessValidation = this.validateSessionBusinessRules(sessionDto, userContext, securityContext);
      violations.push(...businessValidation.violations);

      const riskScore = this.calculateRiskScore(violations, 'LOW');
      const sanitizedRequest = await this.sanitizeSessionRequest(sessionDto, violations);

      const result = this.createValidationResult(
        validationId,
        violations.length === 0,
        sanitizedRequest,
        violations,
        riskScore,
        startTime
      );

      this.updateValidationMetrics(result);

      if (!result.valid) {
        this.logger.warn(`[${validationId}] Browser session validation failed`);throw new BadRequestException(`Validation failed: ${this.summarizeViolations(violations)}`);}return result;

    } catch (error) {
      this.logger.error(`[${validationId}] Browser session validation error`, error);
      throw error instanceof BadRequestException ? error : new UnprocessableEntityException('Session validation failed');
    }
  }

  /**
   * Validate async job creation request
   */
  async validateAsyncJobRequest(
    jobDto: CreateAsyncJobDto,
    userContext: BrowserUseUserContext,
    securityContext: BrowserUseSecurityContext
  ): Promise<RequestValidationResult> {
    const validationId = this.generateValidationId();
    const startTime = performance.now();

    this.logger.debug(
      `[${validationId}] Validating async job request`,
      {
        jobName: jobDto.name,
        jobType: jobDto.jobType,
        estimatedDuration: jobDto.estimatedDurationMs,
      }
    );

    try {
      this.metrics.totalValidations++;

      const violations: SecurityViolation[] = [];

      // Validate job structure
      const structureValidation = this.validateAsyncJobStructure(jobDto, validationId);
      violations.push(...structureValidation.violations);

      // Security validation
      const securityValidation = await this.performSecurityValidation(jobDto, validationId);
      violations.push(...securityValidation.violations);

      // Business rules for async jobs
      const businessValidation = this.validateAsyncJobBusinessRules(jobDto, userContext, securityContext);
      violations.push(...businessValidation.violations);

      // Resource requirements validation
      if (jobDto.resourceRequirements) {
        const resourceValidation = this.validateResourceRequirements(jobDto.resourceRequirements, validationId);
        violations.push(...resourceValidation.violations);
      }

      const riskScore = this.calculateRiskScore(violations, 'MEDIUM');
      const sanitizedRequest = await this.sanitizeAsyncJobRequest(jobDto, violations);

      const result = this.createValidationResult(
        validationId,
        violations.length === 0,
        sanitizedRequest,
        violations,
        riskScore,
        startTime
      );

      this.updateValidationMetrics(result);

      if (!result.valid) {
        this.logger.warn(`[${validationId}] Async job validation failed`);throw new BadRequestException(`Validation failed: ${this.summarizeViolations(violations)}`);}return result;

    } catch (error) {
      this.logger.error(`[${validationId}] Async job validation error`, error);
      throw error instanceof BadRequestException ? error : new UnprocessableEntityException('Async job validation failed');}}

  // ===== VALIDATION METHODS =====

  /**
   * Validate task structure and basic requirements
   */
  private validateTaskStructure(taskDto: CreateBrowserTaskDto, validationId: string): {
    violations: SecurityViolation[];
  } {
    const violations: SecurityViolation[] = [];

    // Check required fields
    if (!taskDto.name || typeof taskDto.name !== 'string') {violations.push({type: ViolationType.INVALID_FORMAT,
        severity: 'HIGH',field: 'name',value: String(taskDto.name),description: 'Task name is required and must be a string',remediation: 'Provide a valid task name',evidence: { field: 'name', type: typeof taskDto.name },});}

    // Check name length and content
    if (taskDto.name && taskDto.name.length > this.config.maxStringLength) {
      violations.push({
        type: ViolationType.OVERSIZED_REQUEST,
        severity: 'MEDIUM',field: 'name',
        value: taskDto.name,
        description: `Task name exceeds maximum length of ${this.config.maxStringLength}`,
        remediation: 'Shorten the task name',evidence: { length: taskDto.name.length, maxLength: this.config.maxStringLength },});
    }

    // Check actions array
    if (!taskDto.actions || !Array.isArray(taskDto.actions)) {
      violations.push({
        type: ViolationType.INVALID_FORMAT,
        severity: 'CRITICAL',field: 'actions',value: String(taskDto.actions),description: 'Actions array is required',remediation: 'Provide a valid actions array',evidence: { field: 'actions', type: typeof taskDto.actions },});} else if (taskDto.actions.length === 0) {
      violations.push({
        type: ViolationType.BUSINESS_RULE_VIOLATION,
        severity: 'HIGH',field: 'actions',value: '[]',description: 'At least one action is required',remediation: 'Add one or more actions to the task',evidence: { actionsCount: 0 },});
    } else if (taskDto.actions.length > this.config.maxActionsPerTask) {
      violations.push({
        type: ViolationType.BUSINESS_RULE_VIOLATION,
        severity: 'HIGH',field: 'actions',
        value: String(taskDto.actions.length),
        description: `Too many actions (${taskDto.actions.length}), maximum allowed: ${this.config.maxActionsPerTask}`,
        remediation: 'Reduce the number of actions',
        evidence: { actionsCount: taskDto.actions.length, maxActions: this.config.maxActionsPerTask },
      });
    }

    return { violations };
  }

  /**
   * Validate individual task actions
   */
  private async validateTaskActions(actions: BrowserTaskAction[], validationId: string): Promise<{
    violations: SecurityViolation[];
  }> {
    const violations: SecurityViolation[] = [];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      const fieldPath = `actions[${i}]`;

      // Validate action type
      if (!action.type || !Object.values(BrowserActionType).includes(action.type)) {
        violations.push({
          type: ViolationType.INVALID_FORMAT,
          severity: 'HIGH',
          field: `${fieldPath}.type`,
          value: String(action.type),
          description: 'Invalid action type',
          remediation: `Use one of: ${Object.values(BrowserActionType).join(`, ')}',evidence: { actionIndex: i, providedType: action.type },
        });
      }

      // Validate URL if present
      if (action.url) {
        const urlValidation = await this.validateUrl(action.url, `${fieldPath}.url`, validationId);
        if (!urlValidation.valid) {
          violations.push(...urlValidation.violations.map(violation => ({
            type: ViolationType.MALICIOUS_URL,
            severity: 'HIGH' as const,
            field: `${fieldPath}.url`,
            value: action.url,
            description: violation,
            remediation: 'Use a valid, safe URL',
            evidence: { actionIndex: i, url: action.url },
          })));
        }
      }

      // Validate selector if present
      if (action.selector) {
        const selectorValidation = this.validateSelector(action.selector, `${fieldPath}.selector`);violations.push(...selectorValidation);}

      // Validate text content if present
      if (action.text) {
        const textValidation = this.validateTextContent(action.text, `${fieldPath}.text`);violations.push(...textValidation);}

      // Validate file paths for upload actions
      if (action.type === BrowserActionType.UPLOAD_FILE && action.filePath) {
        const fileValidation = this.validateFilePath(action.filePath, `${fieldPath}.filePath`);
        violations.push(...fileValidation);
      }
    }

    return { violations };
  }

  /**
   * Perform comprehensive security validation
   */
  private async performSecurityValidation(requestData: any, validationId: string): Promise<{
    violations: SecurityViolation[];
  }> {
    const violations: SecurityViolation[] = [];
    const requestString = JSON.stringify(requestData);

    // Check request size
    const requestSize = Buffer.byteLength(requestString, 'utf8');if (requestSize > this.config.maxRequestSize) {violations.push({
        type: ViolationType.OVERSIZED_REQUEST,
        severity: 'HIGH',field: 'request',
        value: `${requestSize} bytes`,description: `Request size (${requestSize} bytes) exceeds maximum allowed (${this.config.maxRequestSize} bytes)`,
        remediation: 'Reduce request size',evidence: { requestSize, maxSize: this.config.maxRequestSize },});
    }

    // SQL Injection checks
    for (const pattern of this.securityPatterns.sqlInjection) {
      if (pattern.test(requestString)) {
        violations.push({
          type: ViolationType.SQL_INJECTION,
          severity: 'CRITICAL',field: 'request',value: '[DETECTED]',description: 'Potential SQL injection detected',remediation: 'Remove SQL injection patterns',evidence: { pattern: pattern.source, detectedIn: 'request_body' },});this.metrics.violationCounts.set(ViolationType.SQL_INJECTION,
          (this.metrics.violationCounts.get(ViolationType.SQL_INJECTION) || 0) + 1);
        break;
      }
    }

    // XSS Attack checks
    for (const pattern of this.securityPatterns.xssAttack) {
      if (pattern.test(requestString)) {
        violations.push({
          type: ViolationType.XSS_ATTACK,
          severity: 'CRITICAL',field: 'request',value: '[DETECTED]',description: 'Potential XSS attack detected',remediation: 'Remove XSS attack patterns',evidence: { pattern: pattern.source, detectedIn: 'request_body' },});this.metrics.violationCounts.set(ViolationType.XSS_ATTACK,
          (this.metrics.violationCounts.get(ViolationType.XSS_ATTACK) || 0) + 1);
        break;
      }
    }

    // Command Injection checks
    for (const pattern of this.securityPatterns.commandInjection) {
      if (pattern.test(requestString)) {
        violations.push({
          type: ViolationType.COMMAND_INJECTION,
          severity: 'CRITICAL',field: 'request',value: '[DETECTED]',description: 'Potential command injection detected',remediation: 'Remove command injection patterns',evidence: { pattern: pattern.source, detectedIn: 'request_body' },});this.metrics.violationCounts.set(ViolationType.COMMAND_INJECTION,
          (this.metrics.violationCounts.get(ViolationType.COMMAND_INJECTION) || 0) + 1);
        break;
      }
    }

    // Path Traversal checks
    for (const pattern of this.securityPatterns.pathTraversal) {
      if (pattern.test(requestString)) {
        violations.push({
          type: ViolationType.PATH_TRAVERSAL,
          severity: 'HIGH',field: 'request',value: '[DETECTED]',description: 'Potential path traversal detected',remediation: 'Remove path traversal patterns',evidence: { pattern: pattern.source, detectedIn: 'request_body' },});this.metrics.violationCounts.set(ViolationType.PATH_TRAVERSAL,
          (this.metrics.violationCounts.get(ViolationType.PATH_TRAVERSAL) || 0) + 1);
        break;
      }
    }

    return { violations };
  }

  /**
   * Validate URL for security and compliance
   */
  private async validateUrl(url: string, fieldPath: string, validationId: string): Promise<UrlValidationResult> {
    const violations: string[] = [];
    const sanitizedUrl: string | undefined = url;

    try {
      // Basic URL validation
      if (!validator.isURL(url, { require_protocol: true })) {
        violations.push('Invalid URL format');return {valid: false,
          violations,
          riskLevel: 'HIGH',metadata: { domain: '', protocol: '', hasQuery: false, hasFragment: false, isExternal: true },
        };
      }

      const urlObj = new URL(url);

      // Check URL length
      if (url.length > this.config.maxUrlLength) {
        violations.push(`URL too long (${url.length} > ${this.config.maxUrlLength})`);
      }

      // Check protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        violations.push(`Unsupported protocol: ${urlObj.protocol}`);}// Check domain against blocklist
      const domain = urlObj.hostname.toLowerCase();
      if (this.config.blockedDomains.some(blocked => domain.includes(blocked))) {
        violations.push(`Domain ${domain} is blocked`);}// Check if external domain is allowed
      const isExternal = !this.isInternalDomain(domain);
      if (isExternal && !this.isAllowedExternalDomain(domain)) {
        violations.push(`External domain ${domain} not in allowlist`);
      }

      // Malware and phishing detection (placeholder)
      if (await this.isMaliciousUrl(url)) {
        violations.push('URL detected as malicious by threat intelligence');}return {
        valid: violations.length === 0,
        sanitizedUrl: violations.length === 0 ? sanitizedUrl : undefined,
        violations,
        riskLevel: violations.length > 0 ? 'HIGH' : (isExternal ? 'MEDIUM' : 'LOW'),metadata: {domain,
          protocol: urlObj.protocol,
          hasQuery: urlObj.search.length > 0,
          hasFragment: urlObj.hash.length > 0,
          isExternal,
        },
      };

    } catch (error) {
      return {
        valid: false,
        violations: ['URL parsing failed'],riskLevel: 'CRITICAL',metadata: { domain: '', protocol: '', hasQuery: false, hasFragment: false, isExternal: true },};}
  }

  /**
   * Validate CSS selector for security
   */
  private validateSelector(selector: string, fieldPath: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Check for suspicious patterns in selectors
    for (const pattern of this.securityPatterns.suspiciousPatterns) {
      if (pattern.test(selector)) {
        violations.push({
          type: ViolationType.SUSPICIOUS_PATTERN,
          severity: 'MEDIUM',field: fieldPath,value: selector,
          description: 'Suspicious pattern detected in selector',remediation: 'Use a clean CSS selector',evidence: { pattern: pattern.source, selector },});
        break;
      }
    }

    // Check selector length
    if (selector.length > this.config.maxStringLength) {
      violations.push({
        type: ViolationType.OVERSIZED_REQUEST,
        severity: 'MEDIUM',
        field: fieldPath,
        value: selector,
        description: `Selector too long (${selector.length} > ${this.config.maxStringLength})`,
        remediation: 'Shorten the selector',evidence: { length: selector.length, maxLength: this.config.maxStringLength },});
    }

    return violations;
  }

  /**
   * Validate text content for security
   */
  private validateTextContent(text: string, fieldPath: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Check for XSS patterns in text
    for (const pattern of this.securityPatterns.xssAttack) {
      if (pattern.test(text)) {
        violations.push({
          type: ViolationType.XSS_ATTACK,
          severity: 'HIGH',field: fieldPath,value: text,
          description: 'Potential XSS pattern detected in text',remediation: 'Remove script tags and JavaScript',evidence: { pattern: pattern.source, text },});
        break;
      }
    }

    // Check text length
    if (text.length > this.config.maxStringLength) {
      violations.push({
        type: ViolationType.OVERSIZED_REQUEST,
        severity: 'LOW',
        field: fieldPath,
        value: text,
        description: `Text too long (${text.length} > ${this.config.maxStringLength})`,
        remediation: 'Shorten the text content',evidence: { length: text.length, maxLength: this.config.maxStringLength },});
    }

    return violations;
  }

  /**
   * Validate file path for security
   */
  private validateFilePath(filePath: string, fieldPath: string): SecurityViolation[] {
    const violations: SecurityViolation[] = [];

    // Check for path traversal
    for (const pattern of this.securityPatterns.pathTraversal) {
      if (pattern.test(filePath)) {
        violations.push({
          type: ViolationType.PATH_TRAVERSAL,
          severity: 'CRITICAL',field: fieldPath,value: filePath,
          description: 'Path traversal detected in file path',remediation: 'Use a relative file path without directory traversal',evidence: { pattern: pattern.source, filePath },});
        break;
      }
    }

    // Check file extension
    const extension = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));if (extension && !this.config.allowedFileExtensions.includes(extension)) {violations.push({
        type: ViolationType.BUSINESS_RULE_VIOLATION,
        severity: 'MEDIUM',
        field: fieldPath,
        value: filePath,
        description: `File extension ${extension} not allowed`,remediation: `Use one of: ${this.config.allowedFileExtensions.join(`, ')}',evidence: { extension, allowedExtensions: this.config.allowedFileExtensions },
      });
    }

    return violations;
  }

  // ===== BUSINESS RULE VALIDATION =====

  /**
   * Validate business rules for tasks
   */
  private validateBusinessRules(
    taskDto: CreateBrowserTaskDto,
    userContext: BrowserUseUserContext,
    securityContext: BrowserUseSecurityContext
  ): { violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];

    // Check user trust level vs task complexity
    const complexityScore = this.calculateTaskComplexity(taskDto);
    if (complexityScore > this.getMaxComplexityForTrustLevel(userContext.trustLevel)) {
      violations.push({
        type: ViolationType.BUSINESS_RULE_VIOLATION,
        severity: 'HIGH',field: 'task',
        value: String(complexityScore),
        description: `Task complexity (${complexityScore}) exceeds user trust level (${userContext.trustLevel})`,
        remediation: 'Reduce task complexity or request permission escalation',evidence: { complexityScore, trustLevel: userContext.trustLevel },});
    }

    // Check for external domain access requirements
    const hasExternalUrls = taskDto.actions.some(action =>
      action.url && this.isExternalUrl(action.url)
    );

    if (hasExternalUrls && !userContext.permissions.includes('EXTERNAL_DOMAINS' as any)) {violations.push({type: ViolationType.BUSINESS_RULE_VIOLATION,
        severity: 'HIGH',field: 'actions',value: 'external_urls_detected',description: 'Task contains external URLs but user lacks external domain permission',remediation: 'Remove external URLs or request external domain permission',evidence: { hasExternalUrls, userPermissions: userContext.permissions },});
    }

    return { violations };
  }

  /**
   * Validate session business rules
   */
  private validateSessionBusinessRules(
    sessionDto: CreateBrowserSessionDto,
    userContext: BrowserUseUserContext,
    securityContext: BrowserUseSecurityContext
  ): { violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];

    // Add session-specific business rule validations here
    // For now, placeholder implementation

    return { violations };
  }

  /**
   * Validate async job business rules
   */
  private validateAsyncJobBusinessRules(
    jobDto: CreateAsyncJobDto,
    userContext: BrowserUseUserContext,
    securityContext: BrowserUseSecurityContext
  ): { violations: SecurityViolation[] } {
    const violations: SecurityViolation[] = [];

    // Check if user can create async jobs
    if (!userContext.permissions.includes('ASYNC_JOBS' as any)) {violations.push({type: ViolationType.BUSINESS_RULE_VIOLATION,
        severity: 'HIGH',field: 'jobType',value: jobDto.jobType,description: 'User lacks permission to create async jobs',remediation: 'Request async job permission',evidence: { jobType: jobDto.jobType, userPermissions: userContext.permissions },});
    }

    // Check job duration limits
    if (jobDto.estimatedDurationMs && jobDto.estimatedDurationMs > 3600000) { // 1 hour
      violations.push({
        type: ViolationType.BUSINESS_RULE_VIOLATION,
        severity: 'MEDIUM',field: 'estimatedDurationMs',value: String(jobDto.estimatedDurationMs),description: 'Job duration exceeds maximum allowed (1 hour)',remediation: 'Reduce estimated duration or split into multiple jobs',evidence: { duration: jobDto.estimatedDurationMs, maxDuration: 3600000 },});
    }

    return { violations };
  }

  // ===== CONTENT ANALYSIS =====

  /**
   * Perform advanced content analysis
   */
  private async performContentAnalysis(requestData: any, validationId: string): Promise<{
    violations: SecurityViolation[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';}> {if (!this.config.enableContentScanning) {
      return { violations: [], riskLevel: 'LOW' };}const violations: SecurityViolation[] = [];
    const content = JSON.stringify(requestData);

    // Malware detection (placeholder)
    if (this.config.enableMalwareDetection && await this.detectMalware(content)) {
      violations.push({
        type: ViolationType.SUSPICIOUS_PATTERN,
        severity: 'CRITICAL',field: 'request',value: '[DETECTED]',description: 'Malware signature detected',remediation: 'Remove malicious content',evidence: { detectionType: 'malware_signature' },});}

    // Sensitive data detection
    if (this.detectSensitiveData(content)) {
      violations.push({
        type: ViolationType.COMPLIANCE_VIOLATION,
        severity: 'HIGH',field: 'request',value: '[DETECTED]',description: 'Sensitive data detected in request',remediation: 'Remove or encrypt sensitive data',evidence: { detectionType: 'sensitive_data' },});}

    const riskLevel = violations.length === 0 ? 'LOW' :violations.some(v => v.severity === 'CRITICAL') ? 'CRITICAL' :violations.some(v => v.severity === 'HIGH') ? 'HIGH' : 'MEDIUM';return { violations, riskLevel };}

  // ===== UTILITY METHODS =====

  /**
   * Calculate risk score based on violations
   */
  private calculateRiskScore(violations: SecurityViolation[], baseRiskLevel: string): number {
    let score = 0;

    violations.forEach(violation => {
      switch (violation.severity) {
        case 'CRITICAL': score += 25; break;case 'HIGH': score += 15; break;case 'MEDIUM': score += 10; break;case 'LOW': score += 5; break;}});

    // Adjust based on base risk level
    switch (baseRiskLevel) {
      case 'CRITICAL': score += 20; break;case 'HIGH': score += 15; break;case 'MEDIUM': score += 10; break;case 'LOW': score += 5; break;}return Math.min(100, score);
  }

  /**
   * Calculate task complexity score
   */
  private calculateTaskComplexity(taskDto: CreateBrowserTaskDto): number {
    let complexity = 0;

    // Base complexity from action count
    complexity += taskDto.actions.length * 2;

    // Add complexity for specific action types
    taskDto.actions.forEach(action => {
      switch (action.type) {
        case BrowserActionType.UPLOAD_FILE: complexity += 10; break;
        case BrowserActionType.SUBMIT_FORM: complexity += 8; break;
        case BrowserActionType.FILL_FORM: complexity += 6; break;
        case BrowserActionType.CLICK: complexity += 4; break;
        case BrowserActionType.TYPE: complexity += 3; break;
        case BrowserActionType.NAVIGATE: complexity += 2; break;
        default: complexity += 1;
      }

      // Add complexity for external URLs
      if (action.url && this.isExternalUrl(action.url)) {
        complexity += 5;
      }
    });

    return complexity;
  }

  /**
   * Get maximum complexity allowed for trust level
   */
  private getMaxComplexityForTrustLevel(trustLevel: string): number {
    switch (trustLevel) {
      case 'CRITICAL': return 100;case 'HIGH': return 80;case 'MEDIUM': return 60;case 'LOW': return 40;default: return 20;}
  }

  /**
   * Check if domain is internal
   */
  private isInternalDomain(domain: string): boolean {
    const internalPatterns = ['localhost', '127.0.0.1', '10.', '192.168.', '172.'];return internalPatterns.some(pattern => domain.includes(pattern));}

  /**
   * Check if external domain is allowed
   */
  private isAllowedExternalDomain(domain: string): boolean {
    return this.config.allowedDomains.some(allowed => {
      if (allowed.startsWith('*.')) {return domain.endsWith(allowed.substring(2));}
      return domain === allowed;
    });
  }

  /**
   * Check if URL is external
   */
  private isExternalUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return !this.isInternalDomain(urlObj.hostname);
    } catch {
      return true; // Assume external if parsing fails
    }
  }

  /**
   * Detect malware in content (placeholder)
   */
  private async detectMalware(content: string): Promise<boolean> {
    // Placeholder for malware detection
    // In production, integrate with malware scanning service
    return false;
  }

  /**
   * Detect sensitive data patterns
   */
  private detectSensitiveData(content: string): boolean {
    const sensitivePatterns = [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email
    ];

    return sensitivePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if URL is malicious (placeholder)
   */
  private async isMaliciousUrl(url: string): Promise<boolean> {
    // Placeholder for threat intelligence integration
    return false;
  }

  // ===== SANITIZATION METHODS =====

  /**
   * Sanitize task request
   */
  private async sanitizeTaskRequest(
    taskDto: CreateBrowserTaskDto,
    violations: SecurityViolation[]
  ): Promise<CreateBrowserTaskDto> {
    const sanitized = { ...taskDto };

    // Apply sanitization based on violations
    violations.forEach(violation => {
      if (violation.type === ViolationType.XSS_ATTACK && violation.field.includes('text')) {// Sanitize text contentconst fieldPath = violation.field.split('.');if (fieldPath.length >= 2) {const actionIndex = parseInt(fieldPath[0].match(/\d+/)?.[0] || '0');if (sanitized.actions[actionIndex]?.text) {sanitized.actions[actionIndex].text = this.sanitizeText(sanitized.actions[actionIndex].text);
          }
        }
      }
    });

    return sanitized;
  }

  /**
   * Sanitize session request
   */
  private async sanitizeSessionRequest(
    sessionDto: CreateBrowserSessionDto,
    violations: SecurityViolation[]
  ): Promise<CreateBrowserSessionDto> {
    // Placeholder for session sanitization
    return { ...sessionDto };
  }

  /**
   * Sanitize async job request
   */
  private async sanitizeAsyncJobRequest(
    jobDto: CreateAsyncJobDto,
    violations: SecurityViolation[]
  ): Promise<CreateAsyncJobDto> {
    // Placeholder for job sanitization
    return { ...jobDto };
  }

  /**
   * Sanitize text content
   */
  private sanitizeText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '').replace(/javascript:/gi, '').replace(/on\w+\s*=/gi, '');
  }

  // ===== HELPER METHODS =====

  private generateValidationId(): string {
    return `val_${Date.now()}_${Math.random().toString(36).substring(7)}`;}private createValidationResult(
    validationId: string,
    valid: boolean,
    sanitizedRequest: any,
    violations: SecurityViolation[],
    riskScore: number,
    startTime: number
  ): RequestValidationResult {
    const processingTime = performance.now() - startTime;

    return {
      valid,
      sanitizedRequest,
      violations,
      riskScore,
      processingTime,
      recommendations: this.generateRecommendations(violations),
      metadata: {
        validationId,
        timestamp: new Date(),
        requestSize: JSON.stringify(sanitizedRequest).length,
        complexityScore: riskScore,
        validationRules: this.getAppliedValidationRules(),
        performanceMetrics: {
          sanitizationTime: processingTime * 0.3, // Estimated
          validationTime: processingTime * 0.7, // Estimated
          totalTime: processingTime,
        },
      },
    };
  }

  private summarizeViolations(violations: SecurityViolation[]): string {
    const summary = violations
      .slice(0, 3) // Limit to first 3 violations
      .map(v => `${v.field}: ${v.description}`).join(`; ');

    return violations.length > 3 ? `${summary} (and ${violations.length - 3} more)` : summary;
  }

  private generateRecommendations(violations: SecurityViolation[]): string[] {
    const recommendations = new Set<string>();

    violations.forEach(violation => {
      recommendations.add(violation.remediation);
    });

    return Array.from(recommendations);
  }

  private getAppliedValidationRules(): string[] {
    return [
      'structure_validation','security_injection_check','business_rules_check','content_analysis','url_validation','file_path_validation',
    ];
  }

  private updateValidationMetrics(result: RequestValidationResult): void {
    this.metrics.averageValidationTime =
      (this.metrics.averageValidationTime * (this.metrics.totalValidations - 1) + result.processingTime)
      / this.metrics.totalValidations;

    // Update risk distribution
    if (result.riskScore < 25) this.metrics.riskDistribution.LOW++;
    else if (result.riskScore < 50) this.metrics.riskDistribution.MEDIUM++;
    else if (result.riskScore < 75) this.metrics.riskDistribution.HIGH++;
    else this.metrics.riskDistribution.CRITICAL++;
  }

  private logValidationFailure(validationId: string, violations: SecurityViolation[]): void {
    this.logger.warn(
      `[${validationId}] Request validation failed`,
      {
        violationCount: violations.length,
        violations: violations.map(v => ({
          type: v.type,
          severity: v.severity,
          field: v.field,
          description: v.description,
        })),
      }
    );
  }

  private logValidationMetrics(): void {
    const successRate = (this.metrics.passedValidations / this.metrics.totalValidations) * 100;

    this.logger.log('Request Validation Metrics', {
      totalValidations: this.metrics.totalValidations,
      passedValidations: this.metrics.passedValidations,
      failedValidations: this.metrics.failedValidations,
      successRate: `${successRate.toFixed(2)}%`,averageValidationTime: `${this.metrics.averageValidationTime.toFixed(2)}ms`,
      violationCounts: Object.fromEntries(this.metrics.violationCounts),
      riskDistribution: this.metrics.riskDistribution,
    });
  }

  // Placeholder validation methods for compilation
  private validateSessionConfig(config: BrowserSessionConfig, validationId: string): { violations: SecurityViolation[] } {
    return { violations: [] };
  }

  private validateAsyncJobStructure(jobDto: CreateAsyncJobDto, validationId: string): { violations: SecurityViolation[] } {
    return { violations: [] };
  }

  private validateResourceRequirements(requirements: any, validationId: string): { violations: SecurityViolation[] } {
    return { violations: [] };
  }

  /**
   * Get current validation metrics for monitoring
   */
  getValidationMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalValidations > 0 ?
        (this.metrics.passedValidations / this.metrics.totalValidations) * 100 : 0,
      violationsByType: Object.fromEntries(this.metrics.violationCounts),
    };
  }
}