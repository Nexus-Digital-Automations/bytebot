/**
 * Global Validation Pipe - Enterprise Security Input Validation for BytebotD
 *
 * This pipe provides comprehensive input validation and sanitization for all API endpoints
 * in the BytebotD desktop service. Features include XSS protection, SQL injection prevention,
 * request size limits, and structured error reporting for security audit trails.
 *
 * @fileoverview Enterprise-grade validation pipe for BytebotD API security
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';
import {
  sanitizeInput,
  sanitizeObject,
  detectXSS,
  detectSQLInjection,
  createSecurityEvent,
  SecurityEventType,
  ValidationResult,
  DEFAULT_SANITIZATION_OPTIONS,
  SanitizationOptions,
} from '@bytebot/shared';

/**
 * Configuration options for the global validation pipe
 */
interface GlobalValidationPipeOptions {
  /** Transform input to target class instance */
  transform?: boolean;

  /** Strip properties not defined in DTO class */
  whitelist?: boolean;

  /** Throw error if non-whitelisted properties exist */
  forbidNonWhitelisted?: boolean;

  /** Enable input sanitization */
  enableSanitization?: boolean;

  /** Custom sanitization options */
  sanitizationOptions?: SanitizationOptions;

  /** Maximum request payload size in bytes */
  maxPayloadSize?: number;

  /** Enable security threat detection */
  enableThreatDetection?: boolean;

  /** Skip validation for certain metadata types */
  skipMissingProperties?: boolean;
}

/**
 * Default validation pipe options for BytebotD
 */
const DEFAULT_OPTIONS: GlobalValidationPipeOptions = {
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  enableSanitization: true,
  sanitizationOptions: {
    ...DEFAULT_SANITIZATION_OPTIONS,
    // Allow slightly more flexible content for desktop operations
    maxLength: 100000, // 100KB for large desktop data
  },
  maxPayloadSize: 100 * 1024 * 1024, // 100MB for screenshots and large payloads
  enableThreatDetection: true,
  skipMissingProperties: false,
};

@Injectable()
export class GlobalValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(GlobalValidationPipe.name);
  private readonly options: GlobalValidationPipeOptions;

  constructor(options?: Partial<GlobalValidationPipeOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    this.logger.log('BytebotD global validation pipe initialized', {
      enableSanitization: this.options.enableSanitization,
      enableThreatDetection: this.options.enableThreatDetection,
      maxPayloadSize: this.options.maxPayloadSize,
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
    });
  }

  /**
   * Transform and validate incoming data
   * @param value - Raw input value
   * @param metadata - Argument metadata from NestJS
   * @returns Validated and transformed value
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const operationId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    this.logger.debug(`[${operationId}] Starting BytebotD validation`, {
      operationId,
      type: metadata.type,
      metatype: metadata.metatype?.name,
      hasValue: value !== undefined && value !== null,
      valueType: typeof value,
    });

    try {
      // Skip validation for primitive types or when no metatype is provided
      if (!metadata.metatype || this.isBasicType(metadata.metatype)) {
        this.logger.debug(
          `[${operationId}] Skipping validation for basic type`,
          {
            operationId,
            type: metadata.type,
            metatype: metadata.metatype?.name,
          },
        );
        return this.sanitizeBasicValue(value, operationId);
      }

      // Check payload size if it's an object
      if (typeof value === 'object' && value !== null) {
        this.validatePayloadSize(value, operationId);
      }

      // Perform security threat detection
      if (this.options.enableThreatDetection) {
        this.detectSecurityThreats(value, operationId);
      }

      // Sanitize input if enabled
      let sanitizedValue = value;
      if (this.options.enableSanitization) {
        sanitizedValue = this.sanitizeValue(value, operationId);
      }

      // Transform to class instance
      const transformedValue = this.options.transform
        ? plainToClass(metadata.metatype, sanitizedValue)
        : sanitizedValue;

      // Perform class-validator validation
      if (this.shouldValidate(metadata)) {
        await this.validateValue(
          transformedValue,
          metadata.metatype,
          operationId,
        );
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(
        `[${operationId}] BytebotD validation completed successfully`,
        {
          operationId,
          type: metadata.type,
          metatype: metadata.metatype?.name,
          processingTimeMs: processingTime,
          sanitized: this.options.enableSanitization,
          threatDetected: false,
        },
      );

      return transformedValue;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] BytebotD validation failed`, {
        operationId,
        type: metadata.type,
        metatype: metadata.metatype?.name,
        error: error.message,
        processingTimeMs: processingTime,
      });

      // Log security event for validation failures
      this.logSecurityEvent(operationId, error, value, metadata);

      throw error;
    }
  }

  /**
   * Check if the metatype is a basic JavaScript type
   * @param metatype - The metatype to check
   * @returns True if it's a basic type
   */
  private isBasicType(metatype: any): boolean {
    const basicTypes = [String, Boolean, Number, Array, Object];
    return basicTypes.includes(metatype);
  }

  /**
   * Sanitize basic value (string, number, etc.)
   * @param value - Value to sanitize
   * @param operationId - Operation tracking ID
   * @returns Sanitized value
   */
  private sanitizeBasicValue(value: any, operationId: string): any {
    if (typeof value === 'string' && this.options.enableSanitization) {
      const sanitized = sanitizeInput(value, this.options.sanitizationOptions);

      if (sanitized !== value) {
        this.logger.debug(`[${operationId}] Basic value sanitized`, {
          operationId,
          originalLength: value.length,
          sanitizedLength: sanitized.length,
          changed: true,
        });
      }

      return sanitized;
    }

    return value;
  }

  /**
   * Validate payload size against limits
   * @param value - Value to check size for
   * @param operationId - Operation tracking ID
   */
  private validatePayloadSize(value: any, operationId: string): void {
    try {
      const payloadSize = JSON.stringify(value).length;

      if (payloadSize > this.options.maxPayloadSize!) {
        this.logger.warn(`[${operationId}] Payload size limit exceeded`, {
          operationId,
          payloadSize,
          maxPayloadSize: this.options.maxPayloadSize,
          ratio: (payloadSize / this.options.maxPayloadSize!).toFixed(2),
        });

        throw new PayloadTooLargeException(
          `Request payload too large. Maximum allowed: ${this.options.maxPayloadSize} bytes`,
        );
      }

      this.logger.debug(`[${operationId}] Payload size validation passed`, {
        operationId,
        payloadSize,
        maxPayloadSize: this.options.maxPayloadSize,
        utilizationPercent: (
          (payloadSize / this.options.maxPayloadSize!) *
          100
        ).toFixed(1),
      });
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw error;
      }

      // If we can't stringify the value, it might be too large or contain circular references
      this.logger.warn(`[${operationId}] Could not validate payload size`, {
        operationId,
        error: error.message,
      });
    }
  }

  /**
   * Detect potential security threats in the input
   * @param value - Value to analyze
   * @param operationId - Operation tracking ID
   */
  private detectSecurityThreats(value: any, operationId: string): void {
    const threats: string[] = [];

    // Convert value to string for pattern analysis
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);

    // Detect XSS attempts
    if (detectXSS(stringValue)) {
      threats.push('XSS');

      this.logger.warn(`[${operationId}] XSS attempt detected`, {
        operationId,
        threatType: 'XSS',
        inputLength: stringValue.length,
        inputPreview: stringValue.substring(0, 100) + '...',
      });
    }

    // Detect SQL injection attempts
    if (detectSQLInjection(stringValue)) {
      threats.push('SQL_INJECTION');

      this.logger.warn(`[${operationId}] SQL injection attempt detected`, {
        operationId,
        threatType: 'SQL_INJECTION',
        inputLength: stringValue.length,
        inputPreview: stringValue.substring(0, 100) + '...',
      });
    }

    // Throw error if threats detected
    if (threats.length > 0) {
      const threatTypes = threats.join(', ');

      this.logger.error(`[${operationId}] Security threats blocked`, {
        operationId,
        threatTypes: threatTypes,
        threatCount: threats.length,
        blocked: true,
      });

      throw new BadRequestException(
        `Security violation detected: ${threatTypes}. Request has been blocked and logged.`,
      );
    }
  }

  /**
   * Sanitize input value based on type
   * @param value - Value to sanitize
   * @param operationId - Operation tracking ID
   * @returns Sanitized value
   */
  private sanitizeValue(value: any, operationId: string): any {
    const startTime = Date.now();
    let sanitized: any;

    if (typeof value === 'string') {
      sanitized = sanitizeInput(value, this.options.sanitizationOptions);
    } else if (typeof value === 'object' && value !== null) {
      sanitized = sanitizeObject(value, this.options.sanitizationOptions);
    } else {
      sanitized = value;
    }

    const sanitizationTime = Date.now() - startTime;
    const hasChanges = JSON.stringify(sanitized) !== JSON.stringify(value);

    this.logger.debug(
      `[${operationId}] BytebotD input sanitization completed`,
      {
        operationId,
        inputType: typeof value,
        isObject: typeof value === 'object',
        sanitizationTimeMs: sanitizationTime,
        hasChanges,
        originalSize: JSON.stringify(value).length,
        sanitizedSize: JSON.stringify(sanitized).length,
      },
    );

    return sanitized;
  }

  /**
   * Check if validation should be performed for the given metadata
   * @param metadata - Argument metadata
   * @returns True if validation should be performed
   */
  private shouldValidate(metadata: ArgumentMetadata): boolean {
    const { type, metatype } = metadata;

    // Skip validation for certain types
    if (type === 'custom' || !metatype) {
      return false;
    }

    return true;
  }

  /**
   * Perform class-validator validation
   * @param value - Value to validate
   * @param metatype - Target class type
   * @param operationId - Operation tracking ID
   */
  private async validateValue(
    value: any,
    metatype: any,
    operationId: string,
  ): Promise<void> {
    const startTime = Date.now();

    const errors: ValidationError[] = await validate(value, {
      whitelist: this.options.whitelist,
      forbidNonWhitelisted: this.options.forbidNonWhitelisted,
      skipMissingProperties: this.options.skipMissingProperties,
    });

    const validationTime = Date.now() - startTime;

    if (errors.length > 0) {
      const formattedErrors = this.formatValidationErrors(errors);

      this.logger.warn(`[${operationId}] BytebotD class validation failed`, {
        operationId,
        metatype: metatype.name,
        errorCount: errors.length,
        validationTimeMs: validationTime,
        errors: formattedErrors,
      });

      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
        timestamp: new Date().toISOString(),
        operationId,
        service: 'BytebotD',
      });
    }

    this.logger.debug(`[${operationId}] BytebotD class validation passed`, {
      operationId,
      metatype: metatype.name,
      validationTimeMs: validationTime,
      errorCount: 0,
    });
  }

  /**
   * Format validation errors for consistent response structure
   * @param errors - Class-validator errors
   * @returns Formatted error array
   */
  private formatValidationErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints,
      children:
        error.children?.length > 0
          ? this.formatValidationErrors(error.children)
          : undefined,
    }));
  }

  /**
   * Log security event for audit trail
   * @param operationId - Operation tracking ID
   * @param error - Error that occurred
   * @param value - Original input value
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
        `validation-pipe-${metadata.type}`,
        'POST',
        false,
        error.message || 'Validation failed',
        {
          operationId,
          service: 'BytebotD',
          inputType: typeof value,
          metatype: metadata.metatype?.name,
          errorType: error.constructor.name,
          threatDetection: this.options.enableThreatDetection,
          sanitizationEnabled: this.options.enableSanitization,
        },
      );

      this.logger.warn(
        `BytebotD security event logged: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
          operationId,
        },
      );
    } catch (loggingError) {
      this.logger.error('Failed to log BytebotD security event', {
        operationId,
        originalError: error.message,
        loggingError: loggingError.message,
      });
    }
  }
}

/**
 * Factory function to create validation pipe with custom options
 * @param options - Custom validation pipe options
 * @returns Configured validation pipe instance
 */
export function createBytebotDValidationPipe(
  options?: Partial<GlobalValidationPipeOptions>,
): GlobalValidationPipe {
  return new GlobalValidationPipe(options);
}

/**
 * Pre-configured validation pipes for different security levels in BytebotD
 */
export const BytebotDValidationPipes = {
  /**
   * Maximum security validation with strict sanitization for sensitive operations
   */
  MAXIMUM_SECURITY: createBytebotDValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    enableSanitization: true,
    enableThreatDetection: true,
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    sanitizationOptions: {
      ...DEFAULT_SANITIZATION_OPTIONS,
      stripHtml: true,
      allowHtml: false,
      maxLength: 5000,
    },
  }),

  /**
   * Desktop operations validation with moderate sanitization for computer use
   */
  DESKTOP_OPERATIONS: createBytebotDValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    enableSanitization: true,
    enableThreatDetection: true,
    maxPayloadSize: 50 * 1024 * 1024, // 50MB for screenshots
    sanitizationOptions: {
      ...DEFAULT_SANITIZATION_OPTIONS,
      allowHtml: false,
      stripHtml: true,
      maxLength: 50000, // Allow larger text for desktop operations
    },
  }),

  /**
   * Standard security validation for most BytebotD endpoints
   */
  STANDARD: createBytebotDValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    enableSanitization: true,
    enableThreatDetection: true,
    maxPayloadSize: 100 * 1024 * 1024, // 100MB
  }),

  /**
   * Development-friendly validation with relaxed rules
   */
  DEVELOPMENT: createBytebotDValidationPipe({
    transform: true,
    whitelist: false,
    forbidNonWhitelisted: false,
    enableSanitization: false,
    enableThreatDetection: false,
    maxPayloadSize: 200 * 1024 * 1024, // 200MB for development
  }),
} as const;

export default GlobalValidationPipe;
