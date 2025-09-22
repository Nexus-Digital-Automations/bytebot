/**
 * Enhanced Validation Pipe - Enterprise-Grade Input Validation
 *
 * This module provides comprehensive input validation with advanced security
 * controls, sanitization, and enterprise-grade validation features for
 * browser automation endpoints.
 *
 * @fileoverview Enhanced validation pipe with security and sanitization
 * @version 2.0.0
 * @author DTO & Validation Agent
 * @since Browser-Use API Endpoints Implementation
 */

import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  Logger,
  PipeTransform,
  UnprocessableEntityException,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate, ValidationError, ValidatorOptions } from 'class-validator';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

/**
 * Enhanced validation options
 */
export interface EnhancedValidationOptions extends ValidatorOptions {
  // Security options
  enableSanitization?: boolean;
  enableSecurityValidation?: boolean;
  enableSqlInjectionDetection?: boolean;
  enableXssDetection?: boolean;
  enableCsrfDetection?: boolean;

  // Performance options
  maxValidationTime?: number;
  enablePerformanceLogging?: boolean;

  // Business options
  enableBusinessRuleValidation?: boolean;
  enableComplianceValidation?: boolean;

  // Development options
  enableDetailedErrors?: boolean;
  enableDebugLogging?: boolean;

  // Custom validation
  customValidators?: Map<string, (value: any) => boolean>;
  customSanitizers?: Map<string, (value: any) => any>;
}

/**
 * Security validation result
 */
interface SecurityValidationResult {
  passed: boolean;
  violations: Array<{
    type:
      | 'sql_injection'
      | 'xss'
      | 'csrf'
      | 'path_traversal'
      | 'command_injection'
      | 'code_injection';
    field: string;
    value: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  sanitized: boolean;
  originalValue?: any;
  sanitizedValue?: any;
}

/**
 * Validation performance metrics
 */
interface ValidationPerformanceMetrics {
  totalTimeMs: number;
  validationTimeMs: number;
  sanitizationTimeMs: number;
  securityCheckTimeMs: number;
  transformationTimeMs: number;
  memoryUsageMB: number;
}

/**
 * Enhanced validation error details
 */
interface EnhancedValidationError {
  field: string;
  value: unknown;
  message: string;
  constraint: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'format' | 'range' | 'security' | 'business' | 'compliance';
  suggestion?: string;
}

/**
 * Enhanced Validation Pipe with comprehensive security and business validation
 */
@Injectable()
export class EnhancedValidationPipe implements PipeTransform {
  private readonly logger = new Logger(EnhancedValidationPipe.name);
  private readonly window: any;

  // Security patterns for detection
  private readonly securityPatterns = {
    sqlInjection: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(UNION\s+SELECT|OR\s+1\s*=\s*1|AND\s+1\s*=\s*1)/gi,
      /('|").*(\b(OR|AND)\b).*('|")/gi,
      /(--|#|\/\*|\*\/)/g,
    ],
    xss: [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript\s*:/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src\s*=\s*["']?javascript:/gi,
    ],
    pathTraversal: [
      /\.\.\/|\.\.\\|\.\.%2f|\.\.%5c/gi,
      /\/etc\/passwd|\/etc\/shadow|\/windows\/system32/gi,
    ],
    commandInjection: [
      /(\||&|;|\$\(|`)/g,
      /(rm\s|del\s|format\s|shutdown\s)/gi,
    ],
    codeInjection: [
      /(eval\s*\(|Function\s*\(|setTimeout\s*\(|setInterval\s*\()/gi,
      /(require\s*\(|import\s*\(|process\.|global\.)/gi,
    ],
  };

  // Sanitization rules
  private readonly sanitizationRules = {
    html: {
      allowedTags: ['b', 'i', 'em', 'strong', 'a'],
      allowedAttributes: {
        a: ['href'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
    },
    css: {
      allowedSelectors: /^[a-zA-Z0-9\s\-_#.,:[\]()>"'=*+~^$|\\]+$/,
      blockedProperties: ['expression', 'behavior', 'binding'],
    },
    url: {
      allowedProtocols: ['http:', 'https:'],
      blockedDomains: ['localhost', '127.0.0.1', '0.0.0.0'],
    },
  };

  constructor(private readonly options: EnhancedValidationOptions = {}) {
    // Initialize DOMPurify with JSDOM
    const jsdom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    this.window = jsdom.window;

    // Set default options
    this.options = {
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      enableSanitization: true,
      enableSecurityValidation: true,
      enableSqlInjectionDetection: true,
      enableXssDetection: true,
      enableDetailedErrors: process.env.NODE_ENV === 'development',
      enableDebugLogging: process.env.NODE_ENV === 'development',
      maxValidationTime: 5000, // 5 seconds
      ...options,
    };
  }

  /**
   * Main transformation pipeline
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      if (this.options.enableDebugLogging) {
        this.logger.debug(
          `Starting validation for ${metadata.type}:${metadata.metatype?.name}`,
        );
      }

      // Skip validation for primitive types or if no metatype
      if (!metadata.metatype || this.isPrimitive(metadata.metatype)) {
        return value;
      }

      // Security validation first
      let securityResult: SecurityValidationResult | null = null;
      if (this.options.enableSecurityValidation) {
        securityResult = await this.performSecurityValidation(value);
        if (!securityResult.passed) {
          throw new BadRequestException({
            message: 'Security validation failed',
            errors: securityResult.violations,
            code: 'SECURITY_VIOLATION',
          });
        }
        value = securityResult.sanitizedValue || value;
      }

      // Input sanitization
      if (this.options.enableSanitization) {
        value = await this.sanitizeInput(value);
      }

      // Transform and validate
      const transformedValue = plainToClass(metadata.metatype, value, {
        enableImplicitConversion: true,
        transform: true,
        excludeExtraneousValues: this.options.whitelist,
      });

      // Perform class-validator validation
      const validationErrors = await validate(transformedValue, {
        ...this.options,
        groups: this.getValidationGroups(metadata),
      });

      if (validationErrors.length > 0) {
        const enhancedErrors = this.enhanceValidationErrors(validationErrors);
        throw new UnprocessableEntityException({
          message: 'Validation failed',
          errors: enhancedErrors,
          code: 'VALIDATION_FAILED',
        });
      }

      // Business rule validation
      if (this.options.enableBusinessRuleValidation) {
        await this.performBusinessRuleValidation(transformedValue, metadata);
      }

      // Performance logging
      if (this.options.enablePerformanceLogging) {
        const metrics = this.calculatePerformanceMetrics(
          startTime,
          startMemory,
        );
        this.logger.log(`Validation metrics: ${JSON.stringify(metrics)}`);
      }

      return transformedValue;
    } catch (error) {
      if (this.options.enableDebugLogging) {
        this.logger.error(`Validation failed: ${error.message}`, error.stack);
      }
      throw error;
    }
  }

  /**
   * Perform comprehensive security validation
   */
  private async performSecurityValidation(
    value: any,
  ): Promise<SecurityValidationResult> {
    const violations: SecurityValidationResult['violations'] = [];
    let sanitizedValue = value;
    let sanitized = false;

    if (typeof value === 'object' && value !== null) {
      sanitizedValue = await this.deepSecurityCheck(value, '', violations);
      sanitized = violations.length > 0;
    } else if (typeof value === 'string') {
      const stringViolations = this.checkStringForSecurityViolations(
        value,
        'input',
      );
      violations.push(...stringViolations);
      if (stringViolations.length > 0) {
        sanitizedValue = this.sanitizeString(value);
        sanitized = true;
      }
    }

    return {
      passed:
        violations.filter(
          (v) => v.severity === 'high' || v.severity === 'critical',
        ).length === 0,
      violations,
      sanitized,
      originalValue: sanitized ? value : undefined,
      sanitizedValue: sanitized ? sanitizedValue : undefined,
    };
  }

  /**
   * Deep security check for objects
   */
  private async deepSecurityCheck(
    obj: any,
    path: string,
    violations: SecurityValidationResult['violations'],
  ): Promise<any> {
    if (typeof obj !== 'object' || obj === null) {
      if (typeof obj === 'string') {
        const stringViolations = this.checkStringForSecurityViolations(
          obj,
          path,
        );
        violations.push(...stringViolations);
        if (stringViolations.length > 0) {
          return this.sanitizeString(obj);
        }
      }
      return obj;
    }

    const result: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Check key for security violations
      if (typeof key === 'string') {
        const keyViolations = this.checkStringForSecurityViolations(
          key,
          `${currentPath}[key]`,
        );
        violations.push(...keyViolations);
      }

      // Recursively check value
      result[key] = await this.deepSecurityCheck(
        value,
        currentPath,
        violations,
      );
    }

    return result;
  }

  /**
   * Check string for security violations
   */
  private checkStringForSecurityViolations(
    value: string,
    field: string,
  ): SecurityValidationResult['violations'] {
    const violations: SecurityValidationResult['violations'] = [];

    // SQL Injection Detection
    if (this.options.enableSqlInjectionDetection) {
      for (const pattern of this.securityPatterns.sqlInjection) {
        if (pattern.test(value)) {
          violations.push({
            type: 'sql_injection',
            field,
            value,
            severity: 'critical',
            description: 'Potential SQL injection attempt detected',
          });
          break;
        }
      }
    }

    // XSS Detection
    if (this.options.enableXssDetection) {
      for (const pattern of this.securityPatterns.xss) {
        if (pattern.test(value)) {
          violations.push({
            type: 'xss',
            field,
            value,
            severity: 'high',
            description: 'Potential XSS attack detected',
          });
          break;
        }
      }
    }

    // Path Traversal Detection
    for (const pattern of this.securityPatterns.pathTraversal) {
      if (pattern.test(value)) {
        violations.push({
          type: 'path_traversal',
          field,
          value,
          severity: 'high',
          description: 'Potential path traversal attack detected',
        });
        break;
      }
    }

    // Command Injection Detection
    for (const pattern of this.securityPatterns.commandInjection) {
      if (pattern.test(value)) {
        violations.push({
          type: 'command_injection',
          field,
          value,
          severity: 'critical',
          description: 'Potential command injection attempt detected',
        });
        break;
      }
    }

    // Code Injection Detection
    for (const pattern of this.securityPatterns.codeInjection) {
      if (pattern.test(value)) {
        violations.push({
          type: 'code_injection',
          field,
          value,
          severity: 'critical',
          description: 'Potential code injection attempt detected',
        });
        break;
      }
    }

    return violations;
  }

  /**
   * Sanitize string input
   */
  private sanitizeString(value: string): string {
    // HTML sanitization
    const purify = DOMPurify(this.window);
    let sanitized = purify.sanitize(value, {
      ALLOWED_TAGS: this.sanitizationRules.html.allowedTags,
      ALLOWED_ATTR: Object.values(
        this.sanitizationRules.html.allowedAttributes,
      ).flat(),
    });

    // Remove potentially dangerous patterns
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    sanitized = sanitized.replace(/data\s*:/gi, '');
    sanitized = sanitized.replace(/vbscript\s*:/gi, '');

    // Encode potentially dangerous characters
    sanitized = sanitized.replace(/[<>'"&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[char] || char;
    });

    return sanitized;
  }

  /**
   * Sanitize input recursively
   */
  private async sanitizeInput(value: any): Promise<any> {
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object' && value !== null) {
      const result: any = Array.isArray(value) ? [] : {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = await this.sanitizeInput(val);
      }
      return result;
    }

    return value;
  }

  /**
   * Enhance validation errors with additional context
   */
  private enhanceValidationErrors(
    errors: ValidationError[],
  ): EnhancedValidationError[] {
    const enhanced: EnhancedValidationError[] = [];

    const processError = (error: ValidationError, parentPath = ''): void => {
      const fieldPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      if (error.constraints) {
        for (const [constraint, message] of Object.entries(error.constraints)) {
          enhanced.push({
            field: fieldPath,
            value: error.value,
            message,
            constraint,
            code: this.getErrorCode(constraint),
            severity: this.getErrorSeverity(constraint),
            category: this.getErrorCategory(constraint),
            suggestion: this.getErrorSuggestion(constraint, error.value),
          });
        }
      }

      if (error.children && error.children.length > 0) {
        for (const child of error.children) {
          processError(child, fieldPath);
        }
      }
    };

    for (const error of errors) {
      processError(error);
    }

    return enhanced;
  }

  /**
   * Get error code from constraint
   */
  private getErrorCode(constraint: string): string {
    const codeMap: Record<string, string> = {
      isNotEmpty: 'FIELD_REQUIRED',
      isString: 'INVALID_STRING',
      isNumber: 'INVALID_NUMBER',
      isBoolean: 'INVALID_BOOLEAN',
      isEmail: 'INVALID_EMAIL',
      isUrl: 'INVALID_URL',
      matches: 'PATTERN_MISMATCH',
      min: 'VALUE_TOO_SMALL',
      max: 'VALUE_TOO_LARGE',
      minLength: 'STRING_TOO_SHORT',
      maxLength: 'STRING_TOO_LONG',
      isEnum: 'INVALID_ENUM_VALUE',
    };
    return codeMap[constraint] || 'VALIDATION_ERROR';
  }

  /**
   * Get error severity from constraint
   */
  private getErrorSeverity(
    constraint: string,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const severityMap: Record<string, 'low' | 'medium' | 'high' | 'critical'> =
      {
        isNotEmpty: 'high',
        isString: 'medium',
        isNumber: 'medium',
        isBoolean: 'medium',
        isEmail: 'medium',
        isUrl: 'medium',
        matches: 'high',
        min: 'medium',
        max: 'medium',
        minLength: 'low',
        maxLength: 'medium',
        isEnum: 'medium',
      };
    return severityMap[constraint] || 'medium';
  }

  /**
   * Get error category from constraint
   */
  private getErrorCategory(
    constraint: string,
  ): 'format' | 'range' | 'security' | 'business' | 'compliance' {
    const categoryMap: Record<
      string,
      'format' | 'range' | 'security' | 'business' | 'compliance'
    > = {
      isNotEmpty: 'format',
      isString: 'format',
      isNumber: 'format',
      isBoolean: 'format',
      isEmail: 'format',
      isUrl: 'format',
      matches: 'security',
      min: 'range',
      max: 'range',
      minLength: 'range',
      maxLength: 'range',
      isEnum: 'business',
    };
    return categoryMap[constraint] || 'format';
  }

  /**
   * Get error suggestion
   */
  private getErrorSuggestion(
    constraint: string,
    _value: any,
  ): string | undefined {
    const suggestions: Record<string, string> = {
      isNotEmpty: 'Please provide a value for this field',
      isString: 'Please provide a valid string value',
      isNumber: 'Please provide a valid number',
      isBoolean: 'Please provide true or false',
      isEmail: 'Please provide a valid email address (e.g., user@example.com)',
      isUrl: 'Please provide a valid URL starting with http:// or https://',
      matches: 'Please ensure the value matches the required format',
      minLength: 'Please provide a longer value',
      maxLength: 'Please provide a shorter value',
    };
    return suggestions[constraint];
  }

  /**
   * Perform business rule validation
   */
  private async performBusinessRuleValidation(
    value: any,
    _metadata: ArgumentMetadata,
  ): Promise<void> {
    // Custom business rule validation logic can be implemented here
    // For example, checking business-specific constraints, quotas, permissions, etc.

    if (this.options.customValidators) {
      for (const [rule, validator] of this.options.customValidators.entries()) {
        if (!validator(value)) {
          throw new UnprocessableEntityException({
            message: `Business rule validation failed: ${rule}`,
            code: 'BUSINESS_RULE_VIOLATION',
          });
        }
      }
    }
  }

  /**
   * Get validation groups based on metadata
   */
  private getValidationGroups(_metadata: ArgumentMetadata): string[] {
    const groups: string[] = [];

    // Add groups based on HTTP method or other context
    // This would typically be determined from the execution context
    groups.push('default');

    return groups;
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    startTime: number,
    startMemory: number,
  ): ValidationPerformanceMetrics {
    const endTime = Date.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      totalTimeMs: endTime - startTime,
      validationTimeMs: endTime - startTime, // Simplified for this example
      sanitizationTimeMs: 0,
      securityCheckTimeMs: 0,
      transformationTimeMs: 0,
      memoryUsageMB: (endMemory - startMemory) / 1024 / 1024,
    };
  }

  /**
   * Check if type is primitive
   */
  private isPrimitive(metatype: any): boolean {
    const primitives = [String, Boolean, Number, Array, Object];
    return primitives.includes(metatype);
  }
}

/**
 * Validation pipe factory for different security levels
 */
export class ValidationPipeFactory {
  static createSecureValidationPipe(
    options?: Partial<EnhancedValidationOptions>,
  ): EnhancedValidationPipe {
    return new EnhancedValidationPipe({
      enableSanitization: true,
      enableSecurityValidation: true,
      enableSqlInjectionDetection: true,
      enableXssDetection: true,
      enableDetailedErrors: false,
      enableDebugLogging: false,
      maxValidationTime: 3000,
      ...options,
    });
  }

  static createDevelopmentValidationPipe(
    options?: Partial<EnhancedValidationOptions>,
  ): EnhancedValidationPipe {
    return new EnhancedValidationPipe({
      enableSanitization: true,
      enableSecurityValidation: true,
      enableDetailedErrors: true,
      enableDebugLogging: true,
      enablePerformanceLogging: true,
      maxValidationTime: 10000,
      ...options,
    });
  }

  static createProductionValidationPipe(
    options?: Partial<EnhancedValidationOptions>,
  ): EnhancedValidationPipe {
    return new EnhancedValidationPipe({
      enableSanitization: true,
      enableSecurityValidation: true,
      enableSqlInjectionDetection: true,
      enableXssDetection: true,
      enableDetailedErrors: false,
      enableDebugLogging: false,
      enablePerformanceLogging: false,
      maxValidationTime: 2000,
      ...options,
    });
  }
}

export default EnhancedValidationPipe;
