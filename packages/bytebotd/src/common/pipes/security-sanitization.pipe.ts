/**
 * Enterprise Security Sanitization Pipe - XSS & Injection Prevention
 *
 * This pipe provides comprehensive input sanitization for all Bytebot
 * endpoints with XSS protection, SQL injection prevention, and malicious
 * input detection with real-time security monitoring.
 *
 * @fileoverview Enterprise-grade security sanitization pipe
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';
import {
  sanitizeInput,
  sanitizeObject,
  detectXSS,
  detectSQLInjection,
  DEFAULT_SANITIZATION_OPTIONS,
  SanitizationOptions,
} from '@bytebot/shared';

/**
 * Security sanitization configuration options
 */
interface SecuritySanitizationOptions {
  /** Enable input sanitization */
  enableSanitization?: boolean;

  /** Enable XSS detection and blocking */
  enableXSSDetection?: boolean;

  /** Enable SQL injection detection and blocking */
  enableSQLInjectionDetection?: boolean;

  /** Whitelist mode - remove unknown properties */
  whitelist?: boolean;

  /** Strict mode - reject requests with unknown properties */
  strictMode?: boolean;

  /** Custom sanitization rules */
  sanitizationOptions?: SanitizationOptions;

  /** Maximum input length per field */
  maxInputLength?: number;

  /** Maximum object depth for nested objects */
  maxObjectDepth?: number;

  /** Enable threat logging for security monitoring */
  enableThreatLogging?: boolean;
}

/**
 * Default security sanitization options
 */
const DEFAULT_SECURITY_OPTIONS: Required<SecuritySanitizationOptions> = {
  enableSanitization: true,
  enableXSSDetection: true,
  enableSQLInjectionDetection: true,
  whitelist: true,
  strictMode: true,
  sanitizationOptions: DEFAULT_SANITIZATION_OPTIONS,
  maxInputLength: 10000,
  maxObjectDepth: 10,
  enableThreatLogging: true,
};

/**
 * Security threat detection results
 */
interface ThreatDetectionResult {
  hasThreats: boolean;
  threats: Array<{
    type: 'XSS' | 'SQL_INJECTION' | 'MALICIOUS_INPUT' | 'SIZE_VIOLATION';
    field: string;
    description: string;
    sample: string;
  }>;
  riskScore: number;
}

@Injectable()
export class SecuritySanitizationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(SecuritySanitizationPipe.name);
  private readonly options: Required<SecuritySanitizationOptions>;

  // Security metrics tracking
  private securityMetrics = {
    totalRequests: 0,
    threatsBlocked: 0,
    xssAttemptsBlocked: 0,
    sqlInjectionAttemptsBlocked: 0,
    maliciousInputBlocked: 0,
    lastThreatAt: null as Date | null,
  };

  constructor(options?: Partial<SecuritySanitizationOptions>) {
    this.options = { ...DEFAULT_SECURITY_OPTIONS, ...options };

    this.logger.log('Security sanitization pipe initialized', {
      enableSanitization: this.options.enableSanitization,
      enableXSSDetection: this.options.enableXSSDetection,
      enableSQLInjectionDetection: this.options.enableSQLInjectionDetection,
      strictMode: this.options.strictMode,
      maxInputLength: this.options.maxInputLength,
    });
  }

  /**
   * Transform and sanitize incoming data
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const operationId = `security-sanitization-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.securityMetrics.totalRequests++;

    this.logger.debug(`[${operationId}] Security sanitization started`, {
      operationId,
      inputType: typeof value,
      metatype: metadata.metatype?.name,
      hasValue: value !== undefined && value !== null,
    });

    try {
      // Skip sanitization for basic types without metatype
      if (!metadata.metatype || this.isBasicType(metadata.metatype)) {
        return this.sanitizeBasicValue(value, operationId);
      }

      // Perform comprehensive security checks
      const threatDetection = this.detectSecurityThreats(value, operationId);

      if (threatDetection.hasThreats) {
        this.handleSecurityThreats(threatDetection, operationId);
        this.securityMetrics.threatsBlocked++;
        this.securityMetrics.lastThreatAt = new Date();

        throw new BadRequestException({
          error: 'Security Violation',
          message: 'Malicious input detected and blocked',
          threats: threatDetection.threats.map(threat => ({
            type: threat.type,
            field: threat.field,
            description: threat.description,
            // Don't include samples in production response for security
          })),
          riskScore: threatDetection.riskScore,
          operationId,
          timestamp: new Date().toISOString(),
        });
      }

      // Sanitize input data
      let sanitizedValue = value;
      if (this.options.enableSanitization) {
        sanitizedValue = this.performSecuritySanitization(value, operationId);
      }

      // Validate object depth and size
      this.validateObjectConstraints(sanitizedValue, operationId);

      // Transform to class instance if needed
      let transformedValue = sanitizedValue;
      if (metadata.metatype) {
        transformedValue = plainToClass(metadata.metatype, sanitizedValue);

        // Perform class-validator validation
        const validationErrors = await validate(transformedValue, {
          whitelist: this.options.whitelist,
          forbidNonWhitelisted: this.options.strictMode,
          transform: true,
        });

        if (validationErrors.length > 0) {
          this.logger.warn(`[${operationId}] Validation failed after sanitization`, {
            operationId,
            errorCount: validationErrors.length,
            errors: validationErrors.map(err => ({
              property: err.property,
              constraints: err.constraints,
            })),
          });

          throw new BadRequestException({
            error: 'Validation Failed',
            message: 'Input validation failed after security sanitization',
            errors: validationErrors,
            operationId,
          });
        }
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(`[${operationId}] Security sanitization completed`, {
        operationId,
        processingTimeMs: processingTime,
        threatsDetected: 0,
        sanitized: this.options.enableSanitization,
        validated: true,
      });

      return transformedValue;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Security sanitization failed`, {
        operationId,
        error: error.message,
        processingTimeMs: processingTime,
        inputType: typeof value,
      });

      // Re-throw the error (it's already properly formatted)
      throw error;
    }
  }

  /**
   * Check if the metatype is a basic JavaScript type
   */
  private isBasicType(metatype: any): boolean {
    const basicTypes = [String, Boolean, Number, Array, Object];
    return basicTypes.includes(metatype);
  }

  /**
   * Sanitize basic values (strings, numbers, etc.)
   */
  private sanitizeBasicValue(value: any, operationId: string): any {
    if (typeof value === 'string') {
      // Check for threats in basic string
      if (this.options.enableXSSDetection && detectXSS(value)) {
        this.logger.warn(`[${operationId}] XSS detected in basic string value`, {
          operationId,
          inputLength: value.length,
          threatType: 'XSS',
        });
        this.securityMetrics.xssAttemptsBlocked++;
        throw new BadRequestException('XSS attempt detected in input');
      }

      if (this.options.enableSQLInjectionDetection && detectSQLInjection(value)) {
        this.logger.warn(`[${operationId}] SQL injection detected in basic string value`, {
          operationId,
          inputLength: value.length,
          threatType: 'SQL_INJECTION',
        });
        this.securityMetrics.sqlInjectionAttemptsBlocked++;
        throw new BadRequestException('SQL injection attempt detected in input');
      }

      // Sanitize if enabled
      if (this.options.enableSanitization) {
        return sanitizeInput(value, this.options.sanitizationOptions);
      }
    }

    return value;
  }

  /**
   * Detect comprehensive security threats in input data
   */
  private detectSecurityThreats(value: any, operationId: string): ThreatDetectionResult {
    const threats: ThreatDetectionResult['threats'] = [];
    let totalRiskScore = 0;

    this.recursiveSecurityScan(value, '', threats, 0);

    // Calculate overall risk score
    totalRiskScore = threats.reduce((score, threat) => {
      switch (threat.type) {
        case 'XSS': return score + 8;
        case 'SQL_INJECTION': return score + 9;
        case 'MALICIOUS_INPUT': return score + 6;
        case 'SIZE_VIOLATION': return score + 3;
        default: return score + 2;
      }
    }, 0);

    if (threats.length > 0) {
      this.logger.warn(`[${operationId}] Security threats detected`, {
        operationId,
        threatCount: threats.length,
        riskScore: totalRiskScore,
        threatTypes: threats.map(t => t.type),
      });
    }

    return {
      hasThreats: threats.length > 0,
      threats,
      riskScore: Math.min(10, totalRiskScore), // Cap at 10
    };
  }

  /**
   * Recursively scan object for security threats
   */
  private recursiveSecurityScan(
    obj: any,
    path: string,
    threats: ThreatDetectionResult['threats'],
    depth: number,
  ): void {
    // Check maximum depth
    if (depth > this.options.maxObjectDepth) {
      threats.push({
        type: 'MALICIOUS_INPUT',
        field: path,
        description: 'Object nesting too deep - potential DoS attack',
        sample: '[object depth exceeded]',
      });
      return;
    }

    if (typeof obj === 'string') {
      // Check string length
      if (obj.length > this.options.maxInputLength) {
        threats.push({
          type: 'SIZE_VIOLATION',
          field: path,
          description: `Input too long: ${obj.length} characters (max: ${this.options.maxInputLength})`,
          sample: obj.substring(0, 100) + '...',
        });
      }

      // XSS detection
      if (this.options.enableXSSDetection && detectXSS(obj)) {
        threats.push({
          type: 'XSS',
          field: path,
          description: 'Potential XSS attack detected',
          sample: obj.substring(0, 100) + '...',
        });
      }

      // SQL injection detection
      if (this.options.enableSQLInjectionDetection && detectSQLInjection(obj)) {
        threats.push({
          type: 'SQL_INJECTION',
          field: path,
          description: 'Potential SQL injection attack detected',
          sample: obj.substring(0, 100) + '...',
        });
      }

      // Additional malicious patterns
      if (this.detectMaliciousPatterns(obj)) {
        threats.push({
          type: 'MALICIOUS_INPUT',
          field: path,
          description: 'Malicious input pattern detected',
          sample: obj.substring(0, 100) + '...',
        });
      }
    } else if (Array.isArray(obj)) {
      // Check array length
      if (obj.length > 1000) {
        threats.push({
          type: 'SIZE_VIOLATION',
          field: path,
          description: `Array too large: ${obj.length} items (max: 1000)`,
          sample: '[large array]',
        });
      }

      // Scan array elements
      obj.forEach((item, index) => {
        this.recursiveSecurityScan(item, `${path}[${index}]`, threats, depth + 1);
      });
    } else if (obj && typeof obj === 'object') {
      // Check object property count
      const propCount = Object.keys(obj).length;
      if (propCount > 200) {
        threats.push({
          type: 'SIZE_VIOLATION',
          field: path,
          description: `Too many object properties: ${propCount} (max: 200)`,
          sample: '[large object]',
        });
      }

      // Scan object properties
      for (const [key, value] of Object.entries(obj)) {
        // Check property name for threats
        if (typeof key === 'string') {
          if (detectXSS(key) || detectSQLInjection(key)) {
            threats.push({
              type: 'MALICIOUS_INPUT',
              field: `${path}.${key}`,
              description: 'Malicious property name detected',
              sample: key,
            });
          }
        }

        this.recursiveSecurityScan(value, `${path}.${key}`, threats, depth + 1);
      }
    }
  }

  /**
   * Detect additional malicious input patterns
   */
  private detectMaliciousPatterns(input: string): boolean {
    const maliciousPatterns = [
      // Command injection patterns
      /(\||&|;|`|\$\(|\${|<!--)/gi,
      
      // Path traversal patterns
      /(\.\.[\/\\]|\.\.%2f|\.\.%5c)/gi,
      
      // Template injection patterns
      /(\{\{.*?\}\}|\[\[.*?\]\])/gi,
      
      // Server-side template injection
      /(<%.*?%>|\${.*?})/gi,
      
      // LDAP injection patterns
      /(\(\||\)\(|\*\))/gi,
      
      // XXE patterns
      /(!DOCTYPE|!ENTITY|SYSTEM|PUBLIC)/gi,
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Handle detected security threats
   */
  private handleSecurityThreats(
    threatDetection: ThreatDetectionResult,
    operationId: string,
  ): void {
    // Update specific threat metrics
    threatDetection.threats.forEach(threat => {
      switch (threat.type) {
        case 'XSS':
          this.securityMetrics.xssAttemptsBlocked++;
          break;
        case 'SQL_INJECTION':
          this.securityMetrics.sqlInjectionAttemptsBlocked++;
          break;
        case 'MALICIOUS_INPUT':
        case 'SIZE_VIOLATION':
          this.securityMetrics.maliciousInputBlocked++;
          break;
      }
    });

    // Log detailed threat information for security monitoring
    if (this.options.enableThreatLogging) {
      this.logger.error(`[${operationId}] SECURITY THREAT BLOCKED`, {
        operationId,
        threatCount: threatDetection.threats.length,
        riskScore: threatDetection.riskScore,
        threats: threatDetection.threats.map(threat => ({
          type: threat.type,
          field: threat.field,
          description: threat.description,
          // Include sample for security team analysis
          sample: threat.sample.substring(0, 200),
        })),
        timestamp: new Date().toISOString(),
        blocked: true,
      });
    }
  }

  /**
   * Perform comprehensive security sanitization
   */
  private performSecuritySanitization(value: any, operationId: string): any {
    const startTime = Date.now();

    let sanitizedValue: any;

    if (typeof value === 'string') {
      sanitizedValue = sanitizeInput(value, this.options.sanitizationOptions);
    } else if (typeof value === 'object' && value !== null) {
      sanitizedValue = sanitizeObject(value, this.options.sanitizationOptions);
    } else {
      sanitizedValue = value;
    }

    const sanitizationTime = Date.now() - startTime;

    this.logger.debug(`[${operationId}] Input sanitization completed`, {
      operationId,
      inputType: typeof value,
      sanitizationTimeMs: sanitizationTime,
      hasChanges: JSON.stringify(sanitizedValue) !== JSON.stringify(value),
    });

    return sanitizedValue;
  }

  /**
   * Validate object size and depth constraints
   */
  private validateObjectConstraints(value: any, operationId: string): void {
    try {
      const serialized = JSON.stringify(value);
      const sizeInBytes = Buffer.byteLength(serialized, 'utf8');
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB

      if (sizeInBytes > maxSizeBytes) {
        this.logger.warn(`[${operationId}] Object size constraint violated`, {
          operationId,
          actualSizeBytes: sizeInBytes,
          maxSizeBytes,
          violation: 'OBJECT_TOO_LARGE',
        });

        throw new BadRequestException(
          `Request payload too large: ${sizeInBytes} bytes (max: ${maxSizeBytes} bytes)`,
        );
      }

      this.logger.debug(`[${operationId}] Object constraints validation passed`, {
        operationId,
        sizeBytes: sizeInBytes,
        utilizationPercent: ((sizeInBytes / maxSizeBytes) * 100).toFixed(1),
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.warn(`[${operationId}] Could not validate object constraints`, {
        operationId,
        error: error.message,
      });
    }
  }

  /**
   * Get current security metrics for monitoring
   */
  getSecurityMetrics(): typeof this.securityMetrics {
    return { ...this.securityMetrics };
  }

  /**
   * Reset security metrics (for testing or periodic reset)
   */
  resetSecurityMetrics(): void {
    this.securityMetrics = {
      totalRequests: 0,
      threatsBlocked: 0,
      xssAttemptsBlocked: 0,
      sqlInjectionAttemptsBlocked: 0,
      maliciousInputBlocked: 0,
      lastThreatAt: null,
    };

    this.logger.log('Security metrics reset', {
      resetAt: new Date().toISOString(),
    });
  }
}

/**
 * Pre-configured security sanitization pipes for different security levels
 */
export const SecuritySanitizationPipes = {
  /**
   * Maximum security - strict sanitization and validation
   */
  MAXIMUM_SECURITY: new SecuritySanitizationPipe({
    enableSanitization: true,
    enableXSSDetection: true,
    enableSQLInjectionDetection: true,
    whitelist: true,
    strictMode: true,
    maxInputLength: 1000,
    maxObjectDepth: 5,
    sanitizationOptions: {
      ...DEFAULT_SANITIZATION_OPTIONS,
      stripHtml: true,
      allowHtml: false,
      maxLength: 1000,
    },
  }),

  /**
   * High security - comprehensive protection with some flexibility
   */
  HIGH_SECURITY: new SecuritySanitizationPipe({
    enableSanitization: true,
    enableXSSDetection: true,
    enableSQLInjectionDetection: true,
    whitelist: true,
    strictMode: true,
    maxInputLength: 5000,
    maxObjectDepth: 8,
  }),

  /**
   * Standard security - balanced protection for normal operations
   */
  STANDARD: new SecuritySanitizationPipe({
    enableSanitization: true,
    enableXSSDetection: true,
    enableSQLInjectionDetection: true,
    whitelist: true,
    strictMode: false,
    maxInputLength: 10000,
    maxObjectDepth: 10,
  }),
} as const;

export default SecuritySanitizationPipe;