/**
 * Browser Security Validation Pipe - ByteBotd Computer Control Service
 * Specialized validation and sanitization for browser automation inputs
 *
 * Features:
 * - URL validation and domain whitelisting
 * - Script injection prevention
 * - XSS protection for browser automation inputs
 * - Selector sanitization for DOM interactions
 * - File path validation for screenshots and downloads
 * - Input size and complexity limits
 * - Comprehensive audit logging
 *
 * @author Security Implementation Specialist
 * @version 2.0.0
 * @since ByteBotd Browser Security Implementation
 */

import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError, isURL, isEmail } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import * as DOMPurify from 'isomorphic-dompurify';

/**
 * Browser security validation configuration
 */
interface BrowserSecurityConfig {
  allowedDomains: string[];
  allowedProtocols: string[];
  maxUrlLength: number;
  maxSelectorLength: number;
  maxTextLength: number;
  maxScriptLength: number;
  allowedFileExtensions: string[];
  maxFileSize: number;
  enableStrictValidation: boolean;
  enableAuditLogging: boolean;
}

/**
 * Validation context for browser operations
 */
interface ValidationContext {
  operationType: 'navigation' | 'interaction' | 'extraction' | 'screenshot' | 'upload';
  sessionId?: string;
  userId?: string;
  endpoint: string;
  timestamp: Date;
}

/**
 * Security violation details
 */
interface SecurityViolation {
  type: string;
  field: string;
  value: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  sanitized?: boolean;
  originalValue?: string;
}

/**
 * Validation result with security context
 */
interface ValidationResult {
  isValid: boolean;
  violations: SecurityViolation[];
  sanitizedData?: any;
  riskScore: number;
}

@Injectable()
export class BrowserSecurityValidationPipe implements PipeTransform {
  private readonly logger = new Logger(BrowserSecurityValidationPipe.name);
  private readonly config: BrowserSecurityConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      allowedDomains: this.parseConfigArray('BROWSER_ALLOWED_DOMAINS', [
        'localhost',
        '127.0.0.1',
        '*.example.com',
        '*.trusted-domain.com',
      ]),
      allowedProtocols: this.parseConfigArray('BROWSER_ALLOWED_PROTOCOLS', [
        'http:',
        'https:',
      ]),
      maxUrlLength: this.configService.get<number>('BROWSER_MAX_URL_LENGTH', 2048),
      maxSelectorLength: this.configService.get<number>('BROWSER_MAX_SELECTOR_LENGTH', 500),
      maxTextLength: this.configService.get<number>('BROWSER_MAX_TEXT_LENGTH', 10000),
      maxScriptLength: this.configService.get<number>('BROWSER_MAX_SCRIPT_LENGTH', 1000),
      allowedFileExtensions: this.parseConfigArray('BROWSER_ALLOWED_FILE_EXTENSIONS', [
        '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.csv', '.json',
      ]),
      maxFileSize: this.configService.get<number>('BROWSER_MAX_FILE_SIZE', 10485760), // 10MB
      enableStrictValidation: this.configService.get<boolean>('BROWSER_STRICT_VALIDATION', true),
      enableAuditLogging: this.configService.get<boolean>('BROWSER_AUDIT_LOGGING', true),
    };

    this.logger.log('Browser Security Validation Pipe initialized');
    this.logger.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const startTime = Date.now();

    try {
      // Skip validation for non-object values or specific types
      if (!value || typeof value !== 'object' || metadata.type !== 'body') {
        return value;
      }

      // Create validation context
      const context = this.createValidationContext(value, metadata);

      // Perform class-validator validation first
      const dto = plainToClass(metadata.metatype!, value);
      const validationErrors = await validate(dto);

      if (validationErrors.length > 0) {
        this.logSecurityViolation('validation_error', validationErrors, context);
        throw new BadRequestException({
          message: 'Validation failed',
          errors: this.formatValidationErrors(validationErrors),
          timestamp: new Date().toISOString(),
        });
      }

      // Perform browser-specific security validation
      const securityResult = await this.performSecurityValidation(value, context);

      if (!securityResult.isValid) {
        this.handleSecurityViolations(securityResult, context);
      }

      // Return sanitized data if available, otherwise original
      const result = securityResult.sanitizedData || value;

      const executionTime = Date.now() - startTime;
      this.logger.debug(
        `Browser security validation completed - ` +
        `Risk score: ${securityResult.riskScore}, ` +
        `Violations: ${securityResult.violations.length}, ` +
        `Execution time: ${executionTime}ms`
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Browser security validation failed: ${(error as Error).message} ` +
        `[Execution time: ${executionTime}ms]`,
        (error as Error).stack
      );
      throw error;
    }
  }

  /**
   * Perform comprehensive browser security validation
   */
  private async performSecurityValidation(
    data: any,
    context: ValidationContext,
  ): Promise<ValidationResult> {
    const violations: SecurityViolation[] = [];
    const sanitizedData = { ...data };
    let riskScore = 0;

    // URL validation
    if (data.url) {
      const urlResult = this.validateUrl(data.url);
      violations.push(...urlResult.violations);
      riskScore += urlResult.riskScore;
      if (urlResult.sanitized) {
        sanitizedData.url = urlResult.sanitized;
      }
    }

    // Selector validation (for DOM interactions)
    if (data.selector) {
      const selectorResult = this.validateSelector(data.selector);
      violations.push(...selectorResult.violations);
      riskScore += selectorResult.riskScore;
      if (selectorResult.sanitized) {
        sanitizedData.selector = selectorResult.sanitized;
      }
    }

    // Text input validation
    if (data.text || data.value) {
      const textValue = data.text || data.value;
      const textResult = this.validateTextInput(textValue);
      violations.push(...textResult.violations);
      riskScore += textResult.riskScore;
      if (textResult.sanitized) {
        if (data.text) sanitizedData.text = textResult.sanitized;
        if (data.value) sanitizedData.value = textResult.sanitized;
      }
    }

    // Script validation (for browser automation scripts)
    if (data.script) {
      const scriptResult = this.validateScript(data.script);
      violations.push(...scriptResult.violations);
      riskScore += scriptResult.riskScore;
      if (scriptResult.sanitized) {
        sanitizedData.script = scriptResult.sanitized;
      }
    }

    // File path validation
    if (data.filePath || data.fileName) {
      const filePath = data.filePath || data.fileName;
      const fileResult = this.validateFilePath(filePath);
      violations.push(...fileResult.violations);
      riskScore += fileResult.riskScore;
    }

    // Parameters validation
    if (data.parameters || data.params) {
      const params = data.parameters || data.params;
      const paramsResult = this.validateParameters(params);
      violations.push(...paramsResult.violations);
      riskScore += paramsResult.riskScore;
      if (paramsResult.sanitized) {
        if (data.parameters) sanitizedData.parameters = paramsResult.sanitized;
        if (data.params) sanitizedData.params = paramsResult.sanitized;
      }
    }

    // Check for critical violations
    const criticalViolations = violations.filter(v => v.severity === 'critical');
    const blockedViolations = violations.filter(v => v.blocked);

    const isValid = criticalViolations.length === 0 && blockedViolations.length === 0;

    // Log violations if audit logging is enabled
    if (this.config.enableAuditLogging && violations.length > 0) {
      this.logSecurityViolation('security_validation', violations, context);
    }

    return {
      isValid,
      violations,
      sanitizedData: Object.keys(sanitizedData).length > 0 ? sanitizedData : undefined,
      riskScore: Math.min(riskScore, 100), // Cap at 100
    };
  }

  /**
   * Validate URLs for browser navigation
   */
  private validateUrl(url: string): { violations: SecurityViolation[]; riskScore: number; sanitized?: string } {
    const violations: SecurityViolation[] = [];
    let riskScore = 0;
    let sanitized: string | undefined;

    try {
      // Basic format validation
      if (!isURL(url, { require_protocol: true })) {
        violations.push({
          type: 'invalid_url_format',
          field: 'url',
          value: url,
          reason: 'Invalid URL format',
          severity: 'high',
          blocked: true,
        });
        riskScore += 40;
        return { violations, riskScore };
      }

      // Length validation
      if (url.length > this.config.maxUrlLength) {
        violations.push({
          type: 'url_too_long',
          field: 'url',
          value: url,
          reason: `URL exceeds maximum length of ${this.config.maxUrlLength}`,
          severity: 'medium',
          blocked: this.config.enableStrictValidation,
        });
        riskScore += 20;
      }

      const parsedUrl = new URL(url);

      // Protocol validation
      if (!this.config.allowedProtocols.includes(parsedUrl.protocol)) {
        violations.push({
          type: 'invalid_protocol',
          field: 'url',
          value: parsedUrl.protocol,
          reason: `Protocol not allowed: ${parsedUrl.protocol}`,
          severity: 'critical',
          blocked: true,
        });
        riskScore += 50;
      }

      // Domain validation
      if (!this.isDomainAllowed(parsedUrl.hostname)) {
        violations.push({
          type: 'domain_not_allowed',
          field: 'url',
          value: parsedUrl.hostname,
          reason: `Domain not in allowlist: ${parsedUrl.hostname}`,
          severity: 'high',
          blocked: this.config.enableStrictValidation,
        });
        riskScore += 30;
      }

      // Check for suspicious URL patterns
      const suspiciousPatterns = [
        /javascript:/i,
        /data:/i,
        /file:/i,
        /ftp:/i,
        /<script/i,
        /onclick/i,
        /onload/i,
        /eval\(/i,
        /document\.cookie/i,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(url)) {
          violations.push({
            type: 'suspicious_url_pattern',
            field: 'url',
            value: url,
            reason: `Suspicious pattern detected: ${pattern.source}`,
            severity: 'critical',
            blocked: true,
          });
          riskScore += 60;
          break;
        }
      }

      // Sanitize URL (remove dangerous parameters)
      sanitized = this.sanitizeUrl(url);

    } catch (error) {
      violations.push({
        type: 'url_parsing_error',
        field: 'url',
        value: url,
        reason: `URL parsing failed: ${(error as Error).message}`,
        severity: 'high',
        blocked: true,
      });
      riskScore += 40;
    }

    return { violations, riskScore, sanitized };
  }

  /**
   * Validate CSS selectors for DOM interactions
   */
  private validateSelector(selector: string): { violations: SecurityViolation[]; riskScore: number; sanitized?: string } {
    const violations: SecurityViolation[] = [];
    let riskScore = 0;
    let sanitized: string | undefined;

    // Length validation
    if (selector.length > this.config.maxSelectorLength) {
      violations.push({
        type: 'selector_too_long',
        field: 'selector',
        value: selector,
        reason: `Selector exceeds maximum length of ${this.config.maxSelectorLength}`,
        severity: 'medium',
        blocked: this.config.enableStrictValidation,
      });
      riskScore += 15;
    }

    // Check for dangerous selector patterns
    const dangerousPatterns = [
      /javascript:/i,
      /<script/i,
      /onclick/i,
      /onload/i,
      /onerror/i,
      /eval\(/i,
      /expression\(/i,
      /url\(/i,
      /@import/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(selector)) {
        violations.push({
          type: 'dangerous_selector_pattern',
          field: 'selector',
          value: selector,
          reason: `Dangerous pattern in selector: ${pattern.source}`,
          severity: 'critical',
          blocked: true,
        });
        riskScore += 50;
        break;
      }
    }

    // Sanitize selector
    sanitized = this.sanitizeSelector(selector);

    return { violations, riskScore, sanitized };
  }

  /**
   * Validate text inputs for XSS and injection attacks
   */
  private validateTextInput(text: string): { violations: SecurityViolation[]; riskScore: number; sanitized?: string } {
    const violations: SecurityViolation[] = [];
    let riskScore = 0;
    let sanitized: string | undefined;

    // Length validation
    if (text.length > this.config.maxTextLength) {
      violations.push({
        type: 'text_too_long',
        field: 'text',
        value: text.substring(0, 100) + '...',
        reason: `Text exceeds maximum length of ${this.config.maxTextLength}`,
        severity: 'medium',
        blocked: this.config.enableStrictValidation,
      });
      riskScore += 10;
    }

    // XSS pattern detection
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /on\w+\s*=/gi,
      /javascript:/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(text)) {
        violations.push({
          type: 'xss_pattern_detected',
          field: 'text',
          value: text.substring(0, 100) + '...',
          reason: `XSS pattern detected: ${pattern.source}`,
          severity: 'critical',
          blocked: true,
        });
        riskScore += 60;
      }
    }

    // SQL injection pattern detection
    const sqlPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
      /(\b(or|and)\s+\d+\s*=\s*\d+)/gi,
      /(\'\s*(or|and)\s*\'\w*\'\s*=\s*\'\w*)/gi,
      /(--|\#|\/\*|\*\/)/g,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(text)) {
        violations.push({
          type: 'sql_injection_pattern',
          field: 'text',
          value: text.substring(0, 100) + '...',
          reason: `SQL injection pattern detected: ${pattern.source}`,
          severity: 'high',
          blocked: true,
        });
        riskScore += 40;
      }
    }

    // Sanitize text
    sanitized = this.sanitizeText(text);

    return { violations, riskScore, sanitized };
  }

  /**
   * Validate automation scripts
   */
  private validateScript(script: string): { violations: SecurityViolation[]; riskScore: number; sanitized?: string } {
    const violations: SecurityViolation[] = [];
    let riskScore = 0;
    let sanitized: string | undefined;

    // Length validation
    if (script.length > this.config.maxScriptLength) {
      violations.push({
        type: 'script_too_long',
        field: 'script',
        value: script.substring(0, 100) + '...',
        reason: `Script exceeds maximum length of ${this.config.maxScriptLength}`,
        severity: 'high',
        blocked: true,
      });
      riskScore += 30;
    }

    // Dangerous script patterns
    const dangerousPatterns = [
      /eval\(/gi,
      /Function\(/gi,
      /setTimeout\(/gi,
      /setInterval\(/gi,
      /document\.write/gi,
      /innerHTML/gi,
      /outerHTML/gi,
      /document\.cookie/gi,
      /localStorage/gi,
      /sessionStorage/gi,
      /XMLHttpRequest/gi,
      /fetch\(/gi,
      /import\(/gi,
      /require\(/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(script)) {
        violations.push({
          type: 'dangerous_script_pattern',
          field: 'script',
          value: script.substring(0, 100) + '...',
          reason: `Dangerous pattern in script: ${pattern.source}`,
          severity: 'critical',
          blocked: true,
        });
        riskScore += 70;
      }
    }

    return { violations, riskScore, sanitized };
  }

  /**
   * Validate file paths
   */
  private validateFilePath(filePath: string): { violations: SecurityViolation[]; riskScore: number } {
    const violations: SecurityViolation[] = [];
    let riskScore = 0;

    // Path traversal detection
    if (filePath.includes('../') || filePath.includes('..\\') || filePath.includes('%2e%2e')) {
      violations.push({
        type: 'path_traversal_attempt',
        field: 'filePath',
        value: filePath,
        reason: 'Path traversal patterns detected',
        severity: 'critical',
        blocked: true,
      });
      riskScore += 80;
    }

    // File extension validation
    const extension = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    if (!this.config.allowedFileExtensions.includes(extension)) {
      violations.push({
        type: 'invalid_file_extension',
        field: 'filePath',
        value: extension,
        reason: `File extension not allowed: ${extension}`,
        severity: 'medium',
        blocked: this.config.enableStrictValidation,
      });
      riskScore += 20;
    }

    return { violations, riskScore };
  }

  /**
   * Validate parameters object
   */
  private validateParameters(params: any): { violations: SecurityViolation[]; riskScore: number; sanitized?: any } {
    const violations: SecurityViolation[] = [];
    let riskScore = 0;
    let sanitized: any = undefined;

    if (typeof params === 'object' && params !== null) {
      sanitized = {};
      for (const [key, value] of Object.entries(params)) {
        // Validate key
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          violations.push({
            type: 'invalid_parameter_key',
            field: `params.${key}`,
            value: key,
            reason: 'Parameter key contains invalid characters',
            severity: 'medium',
            blocked: this.config.enableStrictValidation,
          });
          riskScore += 10;
        }

        // Validate value if it's a string
        if (typeof value === 'string') {
          const textResult = this.validateTextInput(value);
          violations.push(...textResult.violations);
          riskScore += textResult.riskScore;
          sanitized[key] = textResult.sanitized || value;
        } else {
          sanitized[key] = value;
        }
      }
    }

    return { violations, riskScore, sanitized };
  }

  /**
   * Check if domain is allowed
   */
  private isDomainAllowed(hostname: string): boolean {
    return this.config.allowedDomains.some(domain => {
      if (domain.startsWith('*.')) {
        const baseDomain = domain.substring(2);
        return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
      }
      return hostname === domain;
    });
  }

  /**
   * Sanitize URL
   */
  private sanitizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);

      // Remove dangerous query parameters
      const dangerousParams = ['javascript', 'onclick', 'onload', 'onerror'];
      dangerousParams.forEach(param => {
        parsedUrl.searchParams.delete(param);
      });

      return parsedUrl.toString();
    } catch {
      return url;
    }
  }

  /**
   * Sanitize CSS selector
   */
  private sanitizeSelector(selector: string): string {
    // Remove dangerous patterns but preserve valid CSS selectors
    return selector
      .replace(/javascript:/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Sanitize text input
   */
  private sanitizeText(text: string): string {
    // Use DOMPurify for HTML sanitization
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // Strip all HTML tags
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  /**
   * Parse configuration array from environment
   */
  private parseConfigArray(key: string, defaultValue: string[]): string[] {
    const value = this.configService.get<string>(key);
    if (!value) return defaultValue;

    try {
      return JSON.parse(value);
    } catch {
      return value.split(',').map(item => item.trim());
    }
  }

  /**
   * Create validation context
   */
  private createValidationContext(data: any, metadata: ArgumentMetadata): ValidationContext {
    // Extract operation type from data or metadata
    let operationType: ValidationContext['operationType'] = 'interaction';

    if (data.url || data.startUrl) operationType = 'navigation';
    if (data.screenshot || data.captureScreenshot) operationType = 'screenshot';
    if (data.extract || data.extractData) operationType = 'extraction';
    if (data.upload || data.filePath) operationType = 'upload';

    return {
      operationType,
      sessionId: data.sessionId,
      userId: data.userId,
      endpoint: metadata.data || 'unknown',
      timestamp: new Date(),
    };
  }

  /**
   * Handle security violations
   */
  private handleSecurityViolations(result: ValidationResult, context: ValidationContext): void {
    const criticalViolations = result.violations.filter(v => v.severity === 'critical');
    const blockedViolations = result.violations.filter(v => v.blocked);

    if (criticalViolations.length > 0 || blockedViolations.length > 0) {
      throw new BadRequestException({
        message: 'Security validation failed',
        violations: blockedViolations.map(v => ({
          type: v.type,
          field: v.field,
          reason: v.reason,
          severity: v.severity,
        })),
        riskScore: result.riskScore,
        timestamp: new Date().toISOString(),
        context: {
          operationType: context.operationType,
          sessionId: context.sessionId,
        },
      });
    }
  }

  /**
   * Log security violations for audit
   */
  private logSecurityViolation(
    type: string,
    violations: SecurityViolation[] | ValidationError[],
    context: ValidationContext,
  ): void {
    const logData = {
      type,
      violations: violations.length,
      context,
      timestamp: new Date(),
      details: violations,
    };

    if (violations.some(v => 'severity' in v && v.severity === 'critical')) {
      this.logger.error(`Critical security violation: ${type}`, logData);
    } else {
      this.logger.warn(`Security violation: ${type}`, logData);
    }
  }

  /**
   * Format validation errors for response
   */
  private formatValidationErrors(errors: ValidationError[]): any[] {
    return errors.map(error => ({
      field: error.property,
      value: error.value,
      constraints: error.constraints,
      children: error.children?.length ? this.formatValidationErrors(error.children) : undefined,
    }));
  }
}