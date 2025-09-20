/**
 * Browser Automation Validation Service
 *
 * Provides comprehensive input validation and sanitization for browser automation
 * endpoints including parameter validation, data sanitization, business rule
 * validation, and security constraint enforcement.
 *
 * Features:
 * - Input parameter validation and sanitization
 * - Business rule enforcement
 * - Data type and format validation
 * - Security constraint validation
 * - Custom validation rule support
 * - Validation result caching
 * - Performance optimization
 *
 * @author API Security Specialist
 * @version 1.0.0
 * @since Browser Automation Security Implementation
 */

import {
  Injectable,
  BadRequestException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  validate,
  ValidationError,
  ValidatorOptions,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';
import { ParlantIntegrationService, ParlantConversationContext, RiskLevel } from '../parlant/parlant-integration.service';

/**
 * Validation configuration
 */
interface ValidationConfig {
  enableStrictValidation: boolean;
  enableBusinessRuleValidation: boolean;
  enableSecurityValidation: boolean;
  maxValidationCacheSize: number;
  validationCacheTtl: number;
  enableCustomValidators: boolean;
  maxStringLength: number;
  maxArrayLength: number;
  maxObjectDepth: number;
}

/**
 * Validation context for business rules
 */
interface ValidationContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  timestamp: Date;
}

/**
 * Validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  sanitizedData?: any;
  validationTime: number;
  cacheHit?: boolean;
}

/**
 * Validation issue details
 */
interface ValidationIssue {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
  constraint?: string;
  context?: Record<string, unknown>;
}

/**
 * Business rule validation result
 */
interface BusinessRuleResult {
  valid: boolean;
  violations: BusinessRuleViolation[];
}

/**
 * Business rule violation
 */
interface BusinessRuleViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  field?: string;
  context?: Record<string, unknown>;
}

/**
 * Validation cache entry
 */
interface ValidationCacheEntry {
  result: ValidationResult;
  timestamp: number;
  ttl: number;
}

/**
 * Custom validator for browser automation specific constraints
 */
@ValidatorConstraint({ name: 'isSafeBrowserSelector', async: false })
export class IsSafeBrowserSelectorConstraint implements ValidatorConstraintInterface {
  validate(selector: string): boolean {
    if (!selector || typeof selector !== 'string') {
      return false;
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /javascript:/gi,
      /data:/gi,
      /vbscript:/gi,
      /<script/gi,
      /on\w+=/gi,
      /eval\(/gi,
      /expression\(/gi,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(selector));
  }

  defaultMessage(): string {
    return 'Selector contains potentially dangerous patterns';
  }
}

/**
 * Custom validator for safe URLs
 */
@ValidatorConstraint({ name: 'isSafeUrl', async: false })
export class IsSafeUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      const parsedUrl = new URL(url);

      // Only allow http and https
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return false;
      }

      // Block internal URLs
      const hostname = parsedUrl.hostname.toLowerCase();
      const blockedHosts = [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '::1',
      ];

      if (blockedHosts.includes(hostname)) {
        return false;
      }

      // Block private IP ranges
      const privateRanges = [
        /^192\.168\./,
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^169\.254\./, // Link-local
        /^224\./, // Multicast
      ];

      if (privateRanges.some(range => range.test(hostname))) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(): string {
    return 'URL is not safe for browser automation';
  }
}

/**
 * Decorator for safe browser selector validation
 */
export function IsSafeBrowserSelector(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeBrowserSelectorConstraint,
    });
  };
}

/**
 * Decorator for safe URL validation
 */
export function IsSafeUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSafeUrlConstraint,
    });
  };
}

/**
 * Decorator for sanitizing HTML content
 */
export function SanitizeHtml() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;

    // Basic HTML sanitization
    return value
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '');
  });
}

/**
 * Browser Automation Validation Service
 */
@Injectable()
export class BrowserValidationService {
  private readonly logger = new Logger(BrowserValidationService.name);
  private readonly validationCache = new Map<string, ValidationCacheEntry>();
  private readonly config: ValidationConfig;

  // Business rules for browser automation
  private readonly businessRules = {
    maxConcurrentSessions: 10,
    maxTaskDuration: 1800000, // 30 minutes
    maxActionsPerTask: 100,
    allowedBrowsers: ['chrome', 'chromium'],
    allowedProtocols: ['http:', 'https:'],
    maxViewportWidth: 3840,
    maxViewportHeight: 2160,
    minViewportWidth: 320,
    minViewportHeight: 240,
    maxScreenshotsPerTask: 50,
    maxExtractionsPerTask: 100,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    this.config = this.loadValidationConfig();

    // Setup cache cleanup interval
    setInterval(() => this.cleanupValidationCache(), 300000); // Every 5 minutes

    this.logger.log('Browser Validation Service initialized', {
      strictValidation: this.config.enableStrictValidation,
      businessRuleValidation: this.config.enableBusinessRuleValidation,
      securityValidation: this.config.enableSecurityValidation,
      cacheEnabled: this.config.maxValidationCacheSize > 0,
    });
  }

  /**
   * Validate and sanitize browser task creation request
   */
  async validateBrowserTask(data: any, context: ValidationContext): Promise<ValidationResult> {
    const operationId = `validate_task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating browser task`, {
      operationId,
      taskName: data.name,
      actionsCount: data.actions?.length,
      userId: context.userId,
      requestId: context.requestId,
    });

    try {
      // Check validation cache
      const cacheKey = this.generateCacheKey('browser_task', data, context);
      const cachedResult = this.getFromCache(cacheKey);

      if (cachedResult) {
        this.logger.debug(`[${operationId}] Validation cache hit`, { operationId, cacheKey });
        return { ...cachedResult, cacheHit: true };
      }

      const errors: ValidationIssue[] = [];
      const warnings: ValidationIssue[] = [];

      // 1. Basic data validation
      await this.validateBasicTaskData(data, errors, warnings);

      // 2. Security validation
      if (this.config.enableSecurityValidation) {
        await this.validateTaskSecurity(data, context, errors, warnings);
      }

      // 3. Business rule validation
      if (this.config.enableBusinessRuleValidation) {
        await this.validateTaskBusinessRules(data, context, errors, warnings);
      }

      // 4. Action-specific validation
      if (data.actions && Array.isArray(data.actions)) {
        await this.validateBrowserActions(data.actions, context, errors, warnings);
      }

      // 5. Session configuration validation
      if (data.sessionConfig) {
        await this.validateSessionConfiguration(data.sessionConfig, context, errors, warnings);
      }

      // 6. Sanitize data
      const sanitizedData = await this.sanitizeBrowserTaskData(data);

      const validationTime = Date.now() - startTime;
      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData,
        validationTime,
      };

      // Cache result if successful
      if (result.isValid && this.config.maxValidationCacheSize > 0) {
        this.setCache(cacheKey, result);
      }

      this.logger.log(`[${operationId}] Browser task validation completed`, {
        operationId,
        isValid: result.isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        validationTime,
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Browser task validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        validationTime,
      });

      throw new UnprocessableEntityException({
        message: 'Validation processing failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate browser session creation request
   */
  async validateBrowserSession(data: any, context: ValidationContext): Promise<ValidationResult> {
    const operationId = `validate_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating browser session`, {
      operationId,
      sessionName: data.name,
      headless: data.headless,
      viewport: `${data.viewportWidth}x${data.viewportHeight}`,
      userId: context.userId,
    });

    try {
      const errors: ValidationIssue[] = [];
      const warnings: ValidationIssue[] = [];

      // Basic session data validation
      await this.validateBasicSessionData(data, errors, warnings);

      // Security validation for session
      if (this.config.enableSecurityValidation) {
        await this.validateSessionSecurity(data, context, errors, warnings);
      }

      // Business rule validation for session
      if (this.config.enableBusinessRuleValidation) {
        await this.validateSessionBusinessRules(data, context, errors, warnings);
      }

      // Sanitize session data
      const sanitizedData = await this.sanitizeSessionData(data);

      const validationTime = Date.now() - startTime;
      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData,
        validationTime,
      };

      this.logger.log(`[${operationId}] Browser session validation completed`, {
        operationId,
        isValid: result.isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        validationTime,
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Browser session validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        validationTime,
      });

      throw new UnprocessableEntityException({
        message: 'Session validation processing failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Validate data extraction request
   */
  async validateDataExtraction(data: any, context: ValidationContext): Promise<ValidationResult> {
    const operationId = `validate_extraction_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Validating data extraction`, {
      operationId,
      selectorsCount: data.selectors ? Object.keys(data.selectors).length : 0,
      waitForSelector: data.waitForSelector,
      userId: context.userId,
    });

    try {
      const errors: ValidationIssue[] = [];
      const warnings: ValidationIssue[] = [];

      // Validate extraction configuration
      await this.validateExtractionConfig(data, errors, warnings);

      // Validate selectors
      if (data.selectors) {
        await this.validateSelectors(data.selectors, errors, warnings);
      }

      // Security validation
      if (this.config.enableSecurityValidation) {
        await this.validateExtractionSecurity(data, context, errors, warnings);
      }

      // Sanitize extraction data
      const sanitizedData = await this.sanitizeExtractionData(data);

      const validationTime = Date.now() - startTime;
      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData,
        validationTime,
      };

      this.logger.log(`[${operationId}] Data extraction validation completed`, {
        operationId,
        isValid: result.isValid,
        errorsCount: errors.length,
        warningsCount: warnings.length,
        validationTime,
      });

      return result;

    } catch (error) {
      const validationTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Data extraction validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        validationTime,
      });

      throw new UnprocessableEntityException({
        message: 'Data extraction validation failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStatistics(): {
    cacheSize: number;
    cacheHitRate: number;
    totalValidations: number;
    averageValidationTime: number;
  } {
    return {
      cacheSize: this.validationCache.size,
      cacheHitRate: 0.85, // Mock value - would track in real implementation
      totalValidations: 1250, // Mock value - would track in real implementation
      averageValidationTime: 45, // Mock value - would track in real implementation
    };
  }

  // ===== PRIVATE VALIDATION METHODS =====

  private async validateBasicTaskData(data: any, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Task name is required and must be a non-empty string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
        value: data.name,
      });
    }

    if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
      errors.push({
        field: 'description',
        message: 'Task description is required and must be a non-empty string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
        value: data.description,
      });
    }

    if (!data.actions || !Array.isArray(data.actions) || data.actions.length === 0) {
      errors.push({
        field: 'actions',
        message: 'At least one browser action is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
        value: data.actions,
      });
    }

    // Validate field lengths
    if (data.name && data.name.length > this.config.maxStringLength) {
      errors.push({
        field: 'name',
        message: `Task name exceeds maximum length of ${this.config.maxStringLength} characters`,
        code: 'STRING_TOO_LONG',
        severity: 'error',
        value: data.name.length,
      });
    }

    if (data.description && data.description.length > this.config.maxStringLength * 2) {
      errors.push({
        field: 'description',
        message: `Task description exceeds maximum length of ${this.config.maxStringLength * 2} characters`,
        code: 'STRING_TOO_LONG',
        severity: 'error',
        value: data.description.length,
      });
    }

    // Validate priority
    if (data.priority && !['low', 'normal', 'high', 'critical'].includes(data.priority)) {
      errors.push({
        field: 'priority',
        message: 'Invalid task priority',
        code: 'INVALID_ENUM',
        severity: 'error',
        value: data.priority,
      });
    }

    // Validate execution timeout
    if (data.maxExecutionTimeMs) {
      if (typeof data.maxExecutionTimeMs !== 'number' || data.maxExecutionTimeMs < 5000 || data.maxExecutionTimeMs > 1800000) {
        errors.push({
          field: 'maxExecutionTimeMs',
          message: 'Execution timeout must be between 5 seconds and 30 minutes',
          code: 'INVALID_RANGE',
          severity: 'error',
          value: data.maxExecutionTimeMs,
        });
      }
    }
  }

  private async validateTaskSecurity(data: any, context: ValidationContext, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Check for suspicious task names or descriptions
    const suspiciousPatterns = [
      /password|credential|secret|token|key/gi,
      /<script|javascript:|vbscript:|data:/gi,
      /\.\./gi, // Path traversal
      /cmd|exec|system|eval/gi,
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(data.name) || pattern.test(data.description)) {
        warnings.push({
          field: 'content',
          message: 'Task content contains potentially suspicious patterns',
          code: 'SUSPICIOUS_CONTENT',
          severity: 'warning',
          context: { pattern: pattern.source },
        });
      }
    });

    // Validate metadata for security issues
    if (data.metadata && typeof data.metadata === 'object') {
      const metadataString = JSON.stringify(data.metadata);
      if (metadataString.length > 10000) {
        errors.push({
          field: 'metadata',
          message: 'Metadata object too large',
          code: 'PAYLOAD_TOO_LARGE',
          severity: 'error',
          value: metadataString.length,
        });
      }

      // Check for sensitive data in metadata
      const sensitivePatterns = [
        /password|passwd|pwd/gi,
        /secret|private|confidential/gi,
        /token|key|credential/gi,
        /ssn|social.security/gi,
      ];

      sensitivePatterns.forEach(pattern => {
        if (pattern.test(metadataString)) {
          warnings.push({
            field: 'metadata',
            message: 'Metadata may contain sensitive information',
            code: 'SENSITIVE_DATA',
            severity: 'warning',
            context: { pattern: pattern.source },
          });
        }
      });
    }
  }

  private async validateTaskBusinessRules(data: any, context: ValidationContext, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Validate action count limits
    if (data.actions && data.actions.length > this.businessRules.maxActionsPerTask) {
      errors.push({
        field: 'actions',
        message: `Too many actions in task. Maximum allowed: ${this.businessRules.maxActionsPerTask}`,
        code: 'BUSINESS_RULE_VIOLATION',
        severity: 'error',
        value: data.actions.length,
        constraint: 'maxActionsPerTask',
      });
    }

    // Validate task duration limits
    if (data.maxExecutionTimeMs && data.maxExecutionTimeMs > this.businessRules.maxTaskDuration) {
      errors.push({
        field: 'maxExecutionTimeMs',
        message: `Task duration exceeds maximum allowed: ${this.businessRules.maxTaskDuration}ms`,
        code: 'BUSINESS_RULE_VIOLATION',
        severity: 'error',
        value: data.maxExecutionTimeMs,
        constraint: 'maxTaskDuration',
      });
    }

    // Count screenshot actions
    if (data.actions) {
      const screenshotCount = data.actions.filter(action => action.type === 'screenshot').length;
      if (screenshotCount > this.businessRules.maxScreenshotsPerTask) {
        errors.push({
          field: 'actions',
          message: `Too many screenshot actions. Maximum allowed: ${this.businessRules.maxScreenshotsPerTask}`,
          code: 'BUSINESS_RULE_VIOLATION',
          severity: 'error',
          value: screenshotCount,
          constraint: 'maxScreenshotsPerTask',
        });
      }
    }

    // Count extraction actions
    if (data.actions) {
      const extractionCount = data.actions.filter(action =>
        action.type === 'extract_text' || action.type === 'extract_data'
      ).length;

      if (extractionCount > this.businessRules.maxExtractionsPerTask) {
        errors.push({
          field: 'actions',
          message: `Too many extraction actions. Maximum allowed: ${this.businessRules.maxExtractionsPerTask}`,
          code: 'BUSINESS_RULE_VIOLATION',
          severity: 'error',
          value: extractionCount,
          constraint: 'maxExtractionsPerTask',
        });
      }
    }
  }

  private async validateBrowserActions(actions: any[], context: ValidationContext, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    const allowedActionTypes = [
      'navigate', 'click', 'type', 'scroll', 'screenshot',
      'extract_text', 'extract_data', 'fill_form', 'submit_form',
      'wait_for_element', 'wait_for_url', 'custom'
    ];

    actions.forEach((action, index) => {
      // Validate action type
      if (!action.type || !allowedActionTypes.includes(action.type)) {
        errors.push({
          field: `actions[${index}].type`,
          message: `Invalid action type: ${action.type}`,
          code: 'INVALID_ACTION_TYPE',
          severity: 'error',
          value: action.type,
        });
      }

      // Validate selectors
      if (action.selector) {
        const selectorConstraint = new IsSafeBrowserSelectorConstraint();
        if (!selectorConstraint.validate(action.selector)) {
          errors.push({
            field: `actions[${index}].selector`,
            message: selectorConstraint.defaultMessage(),
            code: 'UNSAFE_SELECTOR',
            severity: 'error',
            value: action.selector,
          });
        }
      }

      // Validate URLs
      if (action.url) {
        const urlConstraint = new IsSafeUrlConstraint();
        if (!urlConstraint.validate(action.url)) {
          errors.push({
            field: `actions[${index}].url`,
            message: urlConstraint.defaultMessage(),
            code: 'UNSAFE_URL',
            severity: 'error',
            value: action.url,
          });
        }
      }

      // Validate wait timeouts
      if (action.waitTimeoutMs) {
        if (typeof action.waitTimeoutMs !== 'number' || action.waitTimeoutMs < 100 || action.waitTimeoutMs > 60000) {
          errors.push({
            field: `actions[${index}].waitTimeoutMs`,
            message: 'Wait timeout must be between 100ms and 60 seconds',
            code: 'INVALID_RANGE',
            severity: 'error',
            value: action.waitTimeoutMs,
          });
        }
      }

      // Validate text inputs
      if (action.text && action.text.length > this.config.maxStringLength) {
        errors.push({
          field: `actions[${index}].text`,
          message: `Text input too long. Maximum: ${this.config.maxStringLength} characters`,
          code: 'STRING_TOO_LONG',
          severity: 'error',
          value: action.text.length,
        });
      }

      // Validate action parameters
      if (action.parameters && typeof action.parameters === 'object') {
        const paramString = JSON.stringify(action.parameters);
        if (paramString.length > 5000) {
          warnings.push({
            field: `actions[${index}].parameters`,
            message: 'Action parameters object is large',
            code: 'LARGE_PARAMETERS',
            severity: 'warning',
            value: paramString.length,
          });
        }
      }
    });
  }

  private async validateSessionConfiguration(sessionConfig: any, context: ValidationContext, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Validate viewport dimensions
    if (sessionConfig.viewportWidth) {
      if (typeof sessionConfig.viewportWidth !== 'number' ||
          sessionConfig.viewportWidth < this.businessRules.minViewportWidth ||
          sessionConfig.viewportWidth > this.businessRules.maxViewportWidth) {
        errors.push({
          field: 'sessionConfig.viewportWidth',
          message: `Viewport width must be between ${this.businessRules.minViewportWidth} and ${this.businessRules.maxViewportWidth}`,
          code: 'INVALID_RANGE',
          severity: 'error',
          value: sessionConfig.viewportWidth,
        });
      }
    }

    if (sessionConfig.viewportHeight) {
      if (typeof sessionConfig.viewportHeight !== 'number' ||
          sessionConfig.viewportHeight < this.businessRules.minViewportHeight ||
          sessionConfig.viewportHeight > this.businessRules.maxViewportHeight) {
        errors.push({
          field: 'sessionConfig.viewportHeight',
          message: `Viewport height must be between ${this.businessRules.minViewportHeight} and ${this.businessRules.maxViewportHeight}`,
          code: 'INVALID_RANGE',
          severity: 'error',
          value: sessionConfig.viewportHeight,
        });
      }
    }

    // Validate additional arguments for security
    if (sessionConfig.additionalArgs && Array.isArray(sessionConfig.additionalArgs)) {
      const dangerousArgs = [
        '--disable-web-security',
        '--user-data-dir',
        '--allow-running-insecure-content',
        '--disable-features',
        '--enable-features',
        '--proxy-server',
      ];

      sessionConfig.additionalArgs.forEach((arg, index) => {
        if (typeof arg !== 'string') {
          errors.push({
            field: `sessionConfig.additionalArgs[${index}]`,
            message: 'Browser argument must be a string',
            code: 'INVALID_TYPE',
            severity: 'error',
            value: arg,
          });
          return;
        }

        const isDangerous = dangerousArgs.some(dangerous => arg.includes(dangerous));
        if (isDangerous) {
          errors.push({
            field: `sessionConfig.additionalArgs[${index}]`,
            message: 'Dangerous browser argument detected',
            code: 'DANGEROUS_ARGUMENT',
            severity: 'error',
            value: arg,
          });
        }
      });
    }

    // Validate user agent
    if (sessionConfig.userAgent) {
      if (typeof sessionConfig.userAgent !== 'string' || sessionConfig.userAgent.length > 500) {
        errors.push({
          field: 'sessionConfig.userAgent',
          message: 'User agent must be a string with maximum 500 characters',
          code: 'INVALID_USER_AGENT',
          severity: 'error',
          value: sessionConfig.userAgent?.length,
        });
      }
    }

    // Validate timeout
    if (sessionConfig.timeoutMs) {
      if (typeof sessionConfig.timeoutMs !== 'number' || sessionConfig.timeoutMs < 1000 || sessionConfig.timeoutMs > 3600000) {
        errors.push({
          field: 'sessionConfig.timeoutMs',
          message: 'Session timeout must be between 1 second and 1 hour',
          code: 'INVALID_RANGE',
          severity: 'error',
          value: sessionConfig.timeoutMs,
        });
      }
    }
  }

  private async validateBasicSessionData(data: any, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Validate required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Session name is required and must be a non-empty string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
        value: data.name,
      });
    }

    // Validate boolean fields
    if (data.headless !== undefined && typeof data.headless !== 'boolean') {
      errors.push({
        field: 'headless',
        message: 'Headless must be a boolean value',
        code: 'INVALID_TYPE',
        severity: 'error',
        value: data.headless,
      });
    }

    if (data.devtools !== undefined && typeof data.devtools !== 'boolean') {
      errors.push({
        field: 'devtools',
        message: 'Devtools must be a boolean value',
        code: 'INVALID_TYPE',
        severity: 'error',
        value: data.devtools,
      });
    }

    // Validate initial URLs
    if (data.initialUrls && Array.isArray(data.initialUrls)) {
      const urlConstraint = new IsSafeUrlConstraint();
      data.initialUrls.forEach((url, index) => {
        if (!urlConstraint.validate(url)) {
          errors.push({
            field: `initialUrls[${index}]`,
            message: urlConstraint.defaultMessage(),
            code: 'UNSAFE_URL',
            severity: 'error',
            value: url,
          });
        }
      });
    }
  }

  private async validateSessionSecurity(data: any, context: ValidationContext, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Check for suspicious session names
    const suspiciousPatterns = [
      /admin|root|system|test/gi,
      /<script|javascript:|vbscript:/gi,
    ];

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(data.name)) {
        warnings.push({
          field: 'name',
          message: 'Session name contains potentially suspicious patterns',
          code: 'SUSPICIOUS_NAME',
          severity: 'warning',
          context: { pattern: pattern.source },
        });
      }
    });
  }

  private async validateSessionBusinessRules(data: any, context: ValidationContext, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // In a real implementation, you would check current session count
    // For now, we'll add a placeholder validation

    // Mock: Check if user has too many active sessions
    const currentSessionCount = 5; // This would be fetched from a service
    if (currentSessionCount >= this.businessRules.maxConcurrentSessions) {
      errors.push({
        field: 'session',
        message: `Maximum concurrent sessions (${this.businessRules.maxConcurrentSessions}) exceeded`,
        code: 'BUSINESS_RULE_VIOLATION',
        severity: 'error',
        value: currentSessionCount,
        constraint: 'maxConcurrentSessions',
      });
    }
  }

  private async validateExtractionConfig(data: any, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Validate selectors object
    if (!data.selectors || typeof data.selectors !== 'object' || Object.keys(data.selectors).length === 0) {
      errors.push({
        field: 'selectors',
        message: 'Selectors object is required and must contain at least one selector',
        code: 'REQUIRED_FIELD',
        severity: 'error',
        value: data.selectors,
      });
    }

    // Validate timeout
    if (data.timeout) {
      if (typeof data.timeout !== 'number' || data.timeout < 100 || data.timeout > 60000) {
        errors.push({
          field: 'timeout',
          message: 'Timeout must be between 100ms and 60 seconds',
          code: 'INVALID_RANGE',
          severity: 'error',
          value: data.timeout,
        });
      }
    }

    // Validate waitForSelector
    if (data.waitForSelector) {
      const selectorConstraint = new IsSafeBrowserSelectorConstraint();
      if (!selectorConstraint.validate(data.waitForSelector)) {
        errors.push({
          field: 'waitForSelector',
          message: selectorConstraint.defaultMessage(),
          code: 'UNSAFE_SELECTOR',
          severity: 'error',
          value: data.waitForSelector,
        });
      }
    }
  }

  private async validateSelectors(selectors: Record<string, string>, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    const selectorConstraint = new IsSafeBrowserSelectorConstraint();

    Object.entries(selectors).forEach(([key, selector]) => {
      if (typeof selector !== 'string') {
        errors.push({
          field: `selectors.${key}`,
          message: 'Selector must be a string',
          code: 'INVALID_TYPE',
          severity: 'error',
          value: selector,
        });
        return;
      }

      if (!selectorConstraint.validate(selector)) {
        errors.push({
          field: `selectors.${key}`,
          message: selectorConstraint.defaultMessage(),
          code: 'UNSAFE_SELECTOR',
          severity: 'error',
          value: selector,
        });
      }

      if (selector.length > 1000) {
        errors.push({
          field: `selectors.${key}`,
          message: 'Selector too long (maximum 1000 characters)',
          code: 'STRING_TOO_LONG',
          severity: 'error',
          value: selector.length,
        });
      }
    });
  }

  private async validateExtractionSecurity(data: any, context: ValidationContext, errors: ValidationIssue[], warnings: ValidationIssue[]): Promise<void> {
    // Check for attempts to extract sensitive data
    const sensitivePatterns = [
      /password|passwd|pwd/gi,
      /secret|private|confidential/gi,
      /token|key|credential/gi,
      /ssn|social.security|credit.card/gi,
    ];

    const selectorsString = JSON.stringify(data.selectors);
    sensitivePatterns.forEach(pattern => {
      if (pattern.test(selectorsString)) {
        warnings.push({
          field: 'selectors',
          message: 'Extraction selectors may target sensitive data',
          code: 'SENSITIVE_DATA_EXTRACTION',
          severity: 'warning',
          context: { pattern: pattern.source },
        });
      }
    });
  }

  private async sanitizeBrowserTaskData(data: any): Promise<any> {
    const sanitized = { ...data };

    // Sanitize strings
    if (sanitized.name) {
      sanitized.name = this.sanitizeString(sanitized.name);
    }

    if (sanitized.description) {
      sanitized.description = this.sanitizeString(sanitized.description);
    }

    // Sanitize actions
    if (sanitized.actions && Array.isArray(sanitized.actions)) {
      sanitized.actions = sanitized.actions.map(action => ({
        ...action,
        selector: action.selector ? this.sanitizeSelector(action.selector) : action.selector,
        text: action.text ? this.sanitizeString(action.text) : action.text,
      }));
    }

    return sanitized;
  }

  private async sanitizeSessionData(data: any): Promise<any> {
    const sanitized = { ...data };

    if (sanitized.name) {
      sanitized.name = this.sanitizeString(sanitized.name);
    }

    if (sanitized.userAgent) {
      sanitized.userAgent = this.sanitizeString(sanitized.userAgent);
    }

    return sanitized;
  }

  private async sanitizeExtractionData(data: any): Promise<any> {
    const sanitized = { ...data };

    if (sanitized.selectors && typeof sanitized.selectors === 'object') {
      const sanitizedSelectors = {};
      Object.entries(sanitized.selectors).forEach(([key, selector]) => {
        sanitizedSelectors[key] = typeof selector === 'string' ? this.sanitizeSelector(selector) : selector;
      });
      sanitized.selectors = sanitizedSelectors;
    }

    if (sanitized.waitForSelector) {
      sanitized.waitForSelector = this.sanitizeSelector(sanitized.waitForSelector);
    }

    return sanitized;
  }

  private sanitizeString(input: string): string {
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .trim();
  }

  private sanitizeSelector(selector: string): string {
    return selector
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  }

  private generateCacheKey(type: string, data: any, context: ValidationContext): string {
    const dataHash = this.hashObject({ type, data, userId: context.userId });
    return `${type}_${dataHash}`;
  }

  private hashObject(obj: any): string {
    // Simple hash function - in production, use a proper hashing library
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
  }

  private getFromCache(key: string): ValidationResult | null {
    const entry = this.validationCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.validationCache.delete(key);
      return null;
    }

    return entry.result;
  }

  private setCache(key: string, result: ValidationResult): void {
    if (this.validationCache.size >= this.config.maxValidationCacheSize) {
      // Remove oldest entry
      const oldestKey = this.validationCache.keys().next().value;
      this.validationCache.delete(oldestKey);
    }

    this.validationCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: this.config.validationCacheTtl,
    });
  }

  private cleanupValidationCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.validationCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.validationCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger.debug(`Cleaned up ${removedCount} expired validation cache entries`, {
        cacheSize: this.validationCache.size,
      });
    }
  }

  private loadValidationConfig(): ValidationConfig {
    return {
      enableStrictValidation: this.configService.get<boolean>('BROWSER_VALIDATION_STRICT', true),
      enableBusinessRuleValidation: this.configService.get<boolean>('BROWSER_VALIDATION_BUSINESS_RULES', true),
      enableSecurityValidation: this.configService.get<boolean>('BROWSER_VALIDATION_SECURITY', true),
      maxValidationCacheSize: this.configService.get<number>('BROWSER_VALIDATION_CACHE_SIZE', 1000),
      validationCacheTtl: this.configService.get<number>('BROWSER_VALIDATION_CACHE_TTL', 300000), // 5 minutes
      enableCustomValidators: this.configService.get<boolean>('BROWSER_VALIDATION_CUSTOM', true),
      maxStringLength: this.configService.get<number>('BROWSER_VALIDATION_MAX_STRING', 10000),
      maxArrayLength: this.configService.get<number>('BROWSER_VALIDATION_MAX_ARRAY', 1000),
      maxObjectDepth: this.configService.get<number>('BROWSER_VALIDATION_MAX_DEPTH', 10),
    };
  }
}