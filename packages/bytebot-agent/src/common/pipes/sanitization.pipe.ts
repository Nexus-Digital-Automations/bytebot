/**
 * Request Sanitization Pipe - Advanced Input Sanitization & XSS Protection
 *
 * This pipe provides specialized sanitization for different types of input data,
 * with configurable sanitization strategies for HTML content, file uploads,
 * and sensitive data fields. Integrates with DOMPurify and sanitize-html.
 *
 * @fileoverview Advanced input sanitization pipe for XSS protection
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  sanitizeInput,
  sanitizeObject,
  detectXSS,
  detectSQLInjection,
  DEFAULT_SANITIZATION_OPTIONS,
  SanitizationOptions,
  createSecurityEvent,
  SecurityEventType,
} from '@bytebot/shared';

/**
 * Sanitization strategies for different input types
 */
export enum SanitizationStrategy {
  /** Strip all HTML tags and scripts */
  STRICT = 'strict',

  /** Allow safe HTML tags only */
  MODERATE = 'moderate',

  /** Allow most HTML with sanitization */
  PERMISSIVE = 'permissive',

  /** Plain text only - strip everything */
  TEXT_ONLY = 'text_only',

  /** No sanitization - passthrough */
  NONE = 'none',
}

/**
 * Field-specific sanitization rules
 */
interface FieldSanitizationRule {
  /** Field name or pattern */
  field: string | RegExp;

  /** Sanitization strategy for this field */
  strategy: SanitizationStrategy;

  /** Custom sanitization options */
  options?: Partial<SanitizationOptions>;

  /** Maximum field length */
  maxLength?: number;

  /** Whether to allow empty values */
  allowEmpty?: boolean;
}

/**
 * Configuration options for sanitization pipe
 */
interface SanitizationPipeOptions {
  /** Default sanitization strategy */
  defaultStrategy: SanitizationStrategy;

  /** Field-specific rules */
  fieldRules?: FieldSanitizationRule[];

  /** Whether to log sanitization actions */
  enableLogging?: boolean;

  /** Whether to throw errors on threats */
  throwOnThreat?: boolean;

  /** Whether to transform input */
  transformInput?: boolean;

  /** Custom sanitization options */
  customOptions?: Partial<SanitizationOptions>;
}

/**
 * Pre-defined sanitization option sets
 */
const SANITIZATION_STRATEGIES: Record<
  SanitizationStrategy,
  SanitizationOptions
> = {
  [SanitizationStrategy.STRICT]: {
    allowHtml: false,
    stripHtml: true,
    allowedTags: [],
    allowedAttributes: {},
    maxLength: 1000,
    trim: true,
  },

  [SanitizationStrategy.MODERATE]: {
    allowHtml: true,
    stripHtml: false,
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowedAttributes: {},
    maxLength: 5000,
    trim: true,
  },

  [SanitizationStrategy.PERMISSIVE]: {
    allowHtml: true,
    stripHtml: false,
    allowedTags: [
      'b',
      'i',
      'em',
      'strong',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'a',
      'img',
      'div',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
    },
    maxLength: 10000,
    trim: true,
  },

  [SanitizationStrategy.TEXT_ONLY]: {
    allowHtml: false,
    stripHtml: true,
    allowedTags: [],
    allowedAttributes: {},
    maxLength: 2000,
    trim: true,
  },

  [SanitizationStrategy.NONE]: {
    allowHtml: true,
    stripHtml: false,
    allowedTags: undefined,
    allowedAttributes: undefined,
    maxLength: undefined,
    trim: false,
  },
};

@Injectable()
export class SanitizationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(SanitizationPipe.name);
  private readonly options: SanitizationPipeOptions;

  constructor(options: Partial<SanitizationPipeOptions> = {}) {
    this.options = {
      defaultStrategy: SanitizationStrategy.MODERATE,
      fieldRules: [],
      enableLogging: true,
      throwOnThreat: true,
      transformInput: true,
      customOptions: {},
      ...options,
    };

    this.logger.log('Sanitization pipe initialized', {
      defaultStrategy: this.options.defaultStrategy,
      fieldRulesCount: this.options.fieldRules?.length || 0,
      enableLogging: this.options.enableLogging,
      throwOnThreat: this.options.throwOnThreat,
    });
  }

  /**
   * Transform and sanitize input data
   * @param value - Raw input value
   * @param metadata - Argument metadata
   * @returns Sanitized value
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const operationId = `sanitization-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Starting sanitization`, {
      operationId,
      type: metadata.type,
      hasValue: value !== undefined && value !== null,
      valueType: typeof value,
    });

    try {
      // Skip sanitization if disabled or no value
      if (
        this.options.defaultStrategy === SanitizationStrategy.NONE ||
        !value
      ) {
        this.logger.debug(`[${operationId}] Sanitization skipped`, {
          operationId,
          reason: !value ? 'no_value' : 'disabled',
        });
        return value;
      }

      // Perform threat detection before sanitization
      if (this.options.throwOnThreat) {
        this.detectThreats(value, operationId);
      }

      // Sanitize the input
      const sanitizedValue = this.sanitizeInput(value, operationId);

      const processingTime = Date.now() - startTime;
      const hasChanges =
        JSON.stringify(sanitizedValue) !== JSON.stringify(value);

      this.logger.debug(`[${operationId}] Sanitization completed`, {
        operationId,
        processingTimeMs: processingTime,
        hasChanges,
        strategy: this.options.defaultStrategy,
        originalSize: this.getValueSize(value),
        sanitizedSize: this.getValueSize(sanitizedValue),
      });

      return sanitizedValue;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Sanitization failed`, {
        operationId,
        error: error.message,
        processingTimeMs: processingTime,
      });

      // Log security event
      this.logSecurityEvent(operationId, error, value, metadata);

      throw error;
    }
  }

  /**
   * Detect security threats in input
   * @param value - Value to analyze
   * @param operationId - Operation tracking ID
   */
  private detectThreats(value: any, operationId: string): void {
    const threats: string[] = [];
    const stringValue = this.valueToString(value);

    // XSS detection
    if (detectXSS(stringValue)) {
      threats.push('XSS');

      this.logger.warn(`[${operationId}] XSS threat detected in sanitization`, {
        operationId,
        threatType: 'XSS',
        inputLength: stringValue.length,
      });
    }

    // SQL injection detection
    if (detectSQLInjection(stringValue)) {
      threats.push('SQL_INJECTION');

      this.logger.warn(
        `[${operationId}] SQL injection threat detected in sanitization`,
        {
          operationId,
          threatType: 'SQL_INJECTION',
          inputLength: stringValue.length,
        },
      );
    }

    // Throw error if threats found
    if (threats.length > 0 && this.options.throwOnThreat) {
      const threatTypes = threats.join(', ');

      this.logger.error(
        `[${operationId}] Security threats blocked by sanitization pipe`,
        {
          operationId,
          threatTypes,
          threatCount: threats.length,
        },
      );

      throw new BadRequestException(
        `Input sanitization blocked security threats: ${threatTypes}`,
      );
    }
  }

  /**
   * Sanitize input based on configured strategy and field rules
   * @param value - Value to sanitize
   * @param operationId - Operation tracking ID
   * @returns Sanitized value
   */
  private sanitizeInput(value: any, operationId: string): any {
    if (typeof value === 'string') {
      return this.sanitizeString(value, null, operationId);
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value, operationId);
    }

    // Return primitive types as-is
    return value;
  }

  /**
   * Sanitize string value with field-specific rules
   * @param value - String value to sanitize
   * @param fieldName - Field name for rule matching
   * @param operationId - Operation tracking ID
   * @returns Sanitized string
   */
  private sanitizeString(
    value: string,
    fieldName: string | null,
    operationId: string,
  ): string {
    const rule = this.getFieldRule(fieldName);
    const strategy = rule?.strategy || this.options.defaultStrategy;
    const sanitizationOptions = this.getSanitizationOptions(strategy, rule);

    this.logger.debug(`[${operationId}] Sanitizing string field`, {
      operationId,
      fieldName,
      strategy,
      originalLength: value.length,
      maxLength: sanitizationOptions.maxLength,
    });

    // Apply length limit if specified
    let sanitized = value;
    if (
      sanitizationOptions.maxLength &&
      sanitized.length > sanitizationOptions.maxLength
    ) {
      sanitized = sanitized.substring(0, sanitizationOptions.maxLength);

      this.logger.debug(
        `[${operationId}] String truncated due to length limit`,
        {
          operationId,
          fieldName,
          originalLength: value.length,
          truncatedLength: sanitized.length,
          maxLength: sanitizationOptions.maxLength,
        },
      );
    }

    // Sanitize using shared utility
    sanitized = sanitizeInput(sanitized, sanitizationOptions);

    // Check if empty values are allowed
    if (
      !rule?.allowEmpty &&
      sanitized.trim().length === 0 &&
      value.trim().length > 0
    ) {
      this.logger.warn(
        `[${operationId}] Field sanitization resulted in empty value`,
        {
          operationId,
          fieldName,
          originalLength: value.length,
          strategy,
        },
      );
    }

    return sanitized;
  }

  /**
   * Sanitize object by processing each field
   * @param value - Object to sanitize
   * @param operationId - Operation tracking ID
   * @returns Sanitized object
   */
  private sanitizeObject(value: any, operationId: string): any {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (typeof item === 'string') {
          return this.sanitizeString(item, `[${index}]`, operationId);
        } else if (typeof item === 'object') {
          return this.sanitizeObject(item, operationId);
        }
        return item;
      });
    }

    const sanitized: any = {};
    let fieldsProcessed = 0;
    let fieldsModified = 0;

    for (const [key, val] of Object.entries(value)) {
      fieldsProcessed++;

      if (typeof val === 'string') {
        const sanitizedVal = this.sanitizeString(val, key, operationId);
        sanitized[key] = sanitizedVal;

        if (sanitizedVal !== val) {
          fieldsModified++;
        }
      } else if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.sanitizeObject(val, operationId);
      } else {
        sanitized[key] = val;
      }
    }

    this.logger.debug(`[${operationId}] Object sanitization completed`, {
      operationId,
      fieldsProcessed,
      fieldsModified,
      modificationRate:
        fieldsProcessed > 0
          ? ((fieldsModified / fieldsProcessed) * 100).toFixed(1) + '%'
          : '0%',
    });

    return sanitized;
  }

  /**
   * Get field-specific sanitization rule
   * @param fieldName - Name of the field
   * @returns Matching rule or null
   */
  private getFieldRule(fieldName: string | null): FieldSanitizationRule | null {
    if (!fieldName || !this.options.fieldRules) {
      return null;
    }

    return (
      this.options.fieldRules.find((rule) => {
        if (typeof rule.field === 'string') {
          return rule.field === fieldName;
        } else if (rule.field instanceof RegExp) {
          return rule.field.test(fieldName);
        }
        return false;
      }) || null
    );
  }

  /**
   * Get sanitization options for strategy and rule
   * @param strategy - Sanitization strategy
   * @param rule - Field-specific rule
   * @returns Sanitization options
   */
  private getSanitizationOptions(
    strategy: SanitizationStrategy,
    rule?: FieldSanitizationRule | null,
  ): SanitizationOptions {
    const baseOptions = { ...SANITIZATION_STRATEGIES[strategy] };

    // Apply custom options from pipe configuration
    Object.assign(baseOptions, this.options.customOptions);

    // Apply field-specific options
    if (rule?.options) {
      Object.assign(baseOptions, rule.options);
    }

    return baseOptions;
  }

  /**
   * Convert value to string for analysis
   * @param value - Value to convert
   * @returns String representation
   */
  private valueToString(value: any): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Get size of value for logging
   * @param value - Value to measure
   * @returns Size in bytes
   */
  private getValueSize(value: any): number {
    try {
      return new Blob([JSON.stringify(value)]).size;
    } catch {
      return String(value).length;
    }
  }

  /**
   * Log security event for audit purposes
   * @param operationId - Operation tracking ID
   * @param error - Error that occurred
   * @param value - Original value
   * @param metadata - Argument metadata
   */
  private logSecurityEvent(
    operationId: string,
    error: any,
    value: any,
    metadata: ArgumentMetadata,
  ): void {
    try {
      let eventType = SecurityEventType.VALIDATION_FAILED;

      if (error.message?.includes('XSS')) {
        eventType = SecurityEventType.XSS_ATTEMPT_BLOCKED;
      } else if (error.message?.includes('SQL')) {
        eventType = SecurityEventType.INJECTION_ATTEMPT_BLOCKED;
      }

      const securityEvent = createSecurityEvent(
        eventType,
        `sanitization-pipe-${metadata.type}`,
        'POST',
        false,
        error.message || 'Sanitization failed',
        {
          operationId,
          defaultStrategy: this.options.defaultStrategy,
          fieldRulesCount: this.options.fieldRules?.length || 0,
          inputSize: this.getValueSize(value),
          throwOnThreat: this.options.throwOnThreat,
        },
      );

      this.logger.warn(
        `Security event logged from sanitization: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
        },
      );
    } catch (loggingError) {
      this.logger.error('Failed to log security event from sanitization pipe', {
        operationId,
        error: loggingError.message,
      });
    }
  }
}

/**
 * Factory function for creating pre-configured sanitization pipes
 */
export const SanitizationPipes = {
  /**
   * Maximum security sanitization - strips all HTML
   */
  MAXIMUM_SECURITY: new SanitizationPipe({
    defaultStrategy: SanitizationStrategy.STRICT,
    throwOnThreat: true,
    enableLogging: true,
    fieldRules: [
      {
        field: /password|secret|token/i,
        strategy: SanitizationStrategy.TEXT_ONLY,
        maxLength: 100,
        allowEmpty: false,
      },
      {
        field: /email|username/i,
        strategy: SanitizationStrategy.TEXT_ONLY,
        maxLength: 255,
        allowEmpty: false,
      },
    ],
  }),

  /**
   * Content sanitization - allows safe HTML
   */
  CONTENT_SAFE: new SanitizationPipe({
    defaultStrategy: SanitizationStrategy.MODERATE,
    throwOnThreat: true,
    enableLogging: true,
    fieldRules: [
      {
        field: /content|description|body|message/i,
        strategy: SanitizationStrategy.MODERATE,
        maxLength: 10000,
      },
      {
        field: /title|name|subject/i,
        strategy: SanitizationStrategy.STRICT,
        maxLength: 255,
      },
    ],
  }),

  /**
   * Development mode - minimal sanitization
   */
  DEVELOPMENT: new SanitizationPipe({
    defaultStrategy: SanitizationStrategy.PERMISSIVE,
    throwOnThreat: false,
    enableLogging: false,
  }),
} as const;

export default SanitizationPipe;
