/**
 * Standardized Global Validation Pipes - Bytebot Platform Security Framework
 *
 * This module provides standardized validation pipes with security-specific configurations
 * for consistent input validation and sanitization across all Bytebot microservices:
 * - BytebotD (Computer Control Service) - MAXIMUM SECURITY
 * - Bytebot-Agent (Task Management Service) - HIGH SECURITY
 * - Bytebot-UI (Frontend Service) - STANDARD SECURITY
 *
 * @fileoverview Enterprise security validation pipes standardization framework
 * @version 2.0.0
 * @author Enterprise Security Validation Specialist
 */

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
  PayloadTooLargeException,
} from "@nestjs/common";
import { validate, ValidationError } from "class-validator";
import { plainToClass, Transform } from "class-transformer";
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
} from "../utils/security.utils";

/**
 * Security levels for validation configuration
 */
export enum ValidationSecurityLevel {
  /** Maximum security - strict validation, aggressive sanitization */
  MAXIMUM = "maximum",

  /** High security - balanced validation and sanitization */
  HIGH = "high",

  /** Standard security - moderate validation and sanitization */
  STANDARD = "standard",

  /** Development security - relaxed validation for development */
  DEVELOPMENT = "development",
}

/**
 * Service-specific validation profiles
 */
export enum ValidationServiceType {
  /** Computer control service - requires maximum security */
  BYTEBOTD = "bytebotd",

  /** Task management API service - requires high security */
  BYTEBOT_AGENT = "bytebot-agent",

  /** Frontend UI service - requires standard security */
  BYTEBOT_UI = "bytebot-ui",

  /** Shared libraries and utilities */
  SHARED = "shared",
}

/**
 * Comprehensive validation pipe configuration
 */
interface StandardizedValidationConfig {
  /** Service type for profile selection */
  serviceType: ValidationServiceType;

  /** Security level override */
  securityLevel: ValidationSecurityLevel;

  /** Environment (development, staging, production) */
  environment: string;

  /** Transform input to target class instance */
  transform: boolean;

  /** Strip properties not defined in DTO class */
  whitelist: boolean;

  /** Throw error if non-whitelisted properties exist */
  forbidNonWhitelisted: boolean;

  /** Enable input sanitization */
  enableSanitization: boolean;

  /** Custom sanitization options */
  sanitizationOptions: SanitizationOptions;

  /** Maximum request payload size in bytes */
  maxPayloadSize: number;

  /** Enable security threat detection */
  enableThreatDetection: boolean;

  /** Skip validation for certain metadata types */
  skipMissingProperties: boolean;

  /** Enable detailed error messages (disable in production) */
  disableErrorMessages: boolean;

  /** Enable request logging for debugging */
  enableDebugLogging: boolean;

  /** Validate nested objects recursively */
  validateNested: boolean;

  /** Stop at first validation error */
  stopAtFirstError: boolean;

  /** Custom validation groups */
  validationGroups?: string[];

  /** Security event logging configuration */
  auditLogging: {
    enabled: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    logFailedValidation: boolean;
    logSanitization: boolean;
    logThreatDetection: boolean;
  };
}

/**
 * Default validation configurations by service type and environment
 */
const VALIDATION_PROFILES: Record<
  ValidationServiceType,
  Record<string, Partial<StandardizedValidationConfig>>
> = {
  [ValidationServiceType.BYTEBOTD]: {
    development: {
      securityLevel: ValidationSecurityLevel.DEVELOPMENT,
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      enableSanitization: false,
      enableThreatDetection: false,
      maxPayloadSize: 100 * 1024 * 1024, // 100MB
      disableErrorMessages: false,
      enableDebugLogging: true,
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        logFailedValidation: false,
        logSanitization: false,
        logThreatDetection: false,
      },
    },

    staging: {
      securityLevel: ValidationSecurityLevel.HIGH,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 50 * 1024 * 1024, // 50MB
      disableErrorMessages: false,
      enableDebugLogging: true,
      sanitizationOptions: {
        ...DEFAULT_SANITIZATION_OPTIONS,
        stripHtml: true,
        allowHtml: false,
        maxLength: 10000,
      },
      auditLogging: {
        enabled: true,
        logLevel: "info",
        logFailedValidation: true,
        logSanitization: true,
        logThreatDetection: true,
      },
    },

    production: {
      securityLevel: ValidationSecurityLevel.MAXIMUM,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 25 * 1024 * 1024, // 25MB - strict limits
      disableErrorMessages: true, // Hide validation details in prod
      enableDebugLogging: false,
      stopAtFirstError: true,
      sanitizationOptions: {
        ...DEFAULT_SANITIZATION_OPTIONS,
        stripHtml: true,
        allowHtml: false,
        maxLength: 5000, // Strict length limits
        allowedTags: [], // No HTML allowed
        trim: true,
      },
      auditLogging: {
        enabled: true,
        logLevel: "warn",
        logFailedValidation: true,
        logSanitization: true,
        logThreatDetection: true,
      },
    },
  },

  [ValidationServiceType.BYTEBOT_AGENT]: {
    development: {
      securityLevel: ValidationSecurityLevel.DEVELOPMENT,
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      enableSanitization: false,
      enableThreatDetection: false,
      maxPayloadSize: 50 * 1024 * 1024, // 50MB
      disableErrorMessages: false,
      enableDebugLogging: true,
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        logFailedValidation: false,
        logSanitization: false,
        logThreatDetection: false,
      },
    },

    staging: {
      securityLevel: ValidationSecurityLevel.HIGH,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 25 * 1024 * 1024, // 25MB
      disableErrorMessages: false,
      enableDebugLogging: true,
      auditLogging: {
        enabled: true,
        logLevel: "info",
        logFailedValidation: true,
        logSanitization: true,
        logThreatDetection: true,
      },
    },

    production: {
      securityLevel: ValidationSecurityLevel.HIGH,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 15 * 1024 * 1024, // 15MB
      disableErrorMessages: true,
      enableDebugLogging: false,
      stopAtFirstError: false, // Allow full validation for API responses
      sanitizationOptions: {
        ...DEFAULT_SANITIZATION_OPTIONS,
        allowHtml: true, // Allow some HTML for rich content
        stripHtml: false,
        maxLength: 25000,
        allowedTags: ["b", "i", "em", "strong", "p", "br", "a"],
        allowedAttributes: {
          a: ["href"],
        },
        trim: true,
      },
      auditLogging: {
        enabled: true,
        logLevel: "info",
        logFailedValidation: true,
        logSanitization: false, // Reduce logging volume
        logThreatDetection: true,
      },
    },
  },

  [ValidationServiceType.BYTEBOT_UI]: {
    development: {
      securityLevel: ValidationSecurityLevel.DEVELOPMENT,
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
      enableSanitization: false,
      enableThreatDetection: false,
      maxPayloadSize: 10 * 1024 * 1024, // 10MB
      disableErrorMessages: false,
      enableDebugLogging: true,
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        logFailedValidation: false,
        logSanitization: false,
        logThreatDetection: false,
      },
    },

    staging: {
      securityLevel: ValidationSecurityLevel.STANDARD,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra props for frontend flexibility
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 5 * 1024 * 1024, // 5MB
      disableErrorMessages: false,
      auditLogging: {
        enabled: true,
        logLevel: "info",
        logFailedValidation: true,
        logSanitization: false,
        logThreatDetection: true,
      },
    },

    production: {
      securityLevel: ValidationSecurityLevel.STANDARD,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra props for frontend flexibility
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 2 * 1024 * 1024, // 2MB - strict for frontend
      disableErrorMessages: false, // Frontend needs detailed errors
      enableDebugLogging: false,
      sanitizationOptions: {
        ...DEFAULT_SANITIZATION_OPTIONS,
        allowHtml: false,
        stripHtml: true,
        maxLength: 1000, // Short inputs for UI
        trim: true,
      },
      auditLogging: {
        enabled: true,
        logLevel: "warn",
        logFailedValidation: false, // Reduce log volume for frontend
        logSanitization: false,
        logThreatDetection: true,
      },
    },
  },

  [ValidationServiceType.SHARED]: {
    development: {
      securityLevel: ValidationSecurityLevel.DEVELOPMENT,
      auditLogging: {
        enabled: false,
        logLevel: "debug",
        logFailedValidation: false,
        logSanitization: false,
        logThreatDetection: false,
      },
    },
  },
};

@Injectable()
export class StandardizedValidationPipe implements PipeTransform<any> {
  private readonly logger = new Logger(StandardizedValidationPipe.name);
  private readonly config: StandardizedValidationConfig;

  constructor(
    serviceType: ValidationServiceType = ValidationServiceType.SHARED,
    environment: string = "development",
    customOptions?: Partial<StandardizedValidationConfig>,
  ) {
    // Build standardized configuration
    this.config = this.buildStandardizedConfig(
      serviceType,
      environment,
      customOptions,
    );

    this.logger.log(
      `Standardized validation pipe initialized for ${serviceType}`,
      {
        serviceType,
        environment,
        securityLevel: this.config.securityLevel,
        enableSanitization: this.config.enableSanitization,
        enableThreatDetection: this.config.enableThreatDetection,
        maxPayloadSize: this.config.maxPayloadSize,
        auditLogging: this.config.auditLogging.enabled,
      },
    );
  }

  /**
   * Build standardized configuration for service type and environment
   */
  private buildStandardizedConfig(
    serviceType: ValidationServiceType,
    environment: string,
    customOptions?: Partial<StandardizedValidationConfig>,
  ): StandardizedValidationConfig {
    const profile =
      VALIDATION_PROFILES[serviceType]?.[environment] ||
      VALIDATION_PROFILES[serviceType]?.["development"] ||
      {};

    const defaultConfig: StandardizedValidationConfig = {
      serviceType,
      securityLevel: ValidationSecurityLevel.STANDARD,
      environment,
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      enableSanitization: true,
      sanitizationOptions: DEFAULT_SANITIZATION_OPTIONS,
      maxPayloadSize: 10 * 1024 * 1024, // 10MB default
      enableThreatDetection: true,
      skipMissingProperties: false,
      disableErrorMessages: environment === "production",
      enableDebugLogging: environment === "development",
      validateNested: true,
      stopAtFirstError: false,
      auditLogging: {
        enabled: environment !== "development",
        logLevel: "info",
        logFailedValidation: true,
        logSanitization: false,
        logThreatDetection: true,
      },
    };

    // Merge configurations
    const mergedConfig = this.deepMerge(defaultConfig, profile);
    return this.deepMerge(mergedConfig, customOptions || {});
  }

  /**
   * Deep merge configuration objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Transform and validate incoming data with comprehensive security checks
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    const operationId = `validation-${this.config.serviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    if (this.config.enableDebugLogging) {
      this.logger.debug(
        `[${operationId}] Starting validation for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          type: metadata.type,
          metatype: metadata.metatype?.name,
          hasValue: value !== undefined && value !== null,
          valueType: typeof value,
        },
      );
    }

    try {
      // Skip validation for primitive types or when no metatype is provided
      if (!metadata.metatype || this.isBasicType(metadata.metatype)) {
        if (this.config.enableDebugLogging) {
          this.logger.debug(
            `[${operationId}] Skipping validation for basic type`,
            {
              operationId,
              type: metadata.type,
              metatype: metadata.metatype?.name,
            },
          );
        }
        return this.sanitizeBasicValue(value, operationId);
      }

      // Check payload size if it's an object
      if (typeof value === "object" && value !== null) {
        this.validatePayloadSize(value, operationId);
      }

      // Perform security threat detection
      if (this.config.enableThreatDetection) {
        this.detectSecurityThreats(value, operationId);
      }

      // Sanitize input if enabled
      let sanitizedValue = value;
      if (this.config.enableSanitization) {
        sanitizedValue = this.sanitizeValue(value, operationId);
      }

      // Transform to class instance
      const transformedValue = this.config.transform
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

      if (this.config.enableDebugLogging) {
        this.logger.debug(
          `[${operationId}] Validation completed successfully for ${this.config.serviceType}`,
          {
            operationId,
            serviceType: this.config.serviceType,
            type: metadata.type,
            metatype: metadata.metatype?.name,
            processingTimeMs: processingTime,
            sanitized: this.config.enableSanitization,
            threatDetected: false,
          },
        );
      }

      return transformedValue;
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(
        `[${operationId}] Validation failed for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          type: metadata.type,
          metatype: metadata.metatype?.name,
          error: error.message,
          processingTimeMs: processingTime,
        },
      );

      // Log security event for validation failures
      if (
        this.config.auditLogging.enabled &&
        this.config.auditLogging.logFailedValidation
      ) {
        this.logSecurityEvent(operationId, error, value, metadata);
      }

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
   * Sanitize basic value (string, number, etc.)
   */
  private sanitizeBasicValue(value: any, operationId: string): any {
    if (typeof value === "string" && this.config.enableSanitization) {
      const sanitized = sanitizeInput(value, this.config.sanitizationOptions);

      if (
        sanitized !== value &&
        this.config.auditLogging.enabled &&
        this.config.auditLogging.logSanitization
      ) {
        this.logger.debug(
          `[${operationId}] Basic value sanitized for ${this.config.serviceType}`,
          {
            operationId,
            serviceType: this.config.serviceType,
            originalLength: value.length,
            sanitizedLength: sanitized.length,
            changed: true,
          },
        );
      }

      return sanitized;
    }

    return value;
  }

  /**
   * Validate payload size against service-specific limits
   */
  private validatePayloadSize(value: any, operationId: string): void {
    try {
      const payloadSize = JSON.stringify(value).length;

      if (payloadSize > this.config.maxPayloadSize) {
        const errorMessage = `Request payload too large for ${this.config.serviceType}. Maximum allowed: ${this.config.maxPayloadSize} bytes`;

        this.logger.warn(
          `[${operationId}] Payload size limit exceeded for ${this.config.serviceType}`,
          {
            operationId,
            serviceType: this.config.serviceType,
            securityLevel: this.config.securityLevel,
            payloadSize,
            maxPayloadSize: this.config.maxPayloadSize,
            ratio: (payloadSize / this.config.maxPayloadSize).toFixed(2),
          },
        );

        throw new PayloadTooLargeException(errorMessage);
      }

      if (this.config.enableDebugLogging) {
        this.logger.debug(
          `[${operationId}] Payload size validation passed for ${this.config.serviceType}`,
          {
            operationId,
            serviceType: this.config.serviceType,
            payloadSize,
            maxPayloadSize: this.config.maxPayloadSize,
            utilizationPercent: (
              (payloadSize / this.config.maxPayloadSize) *
              100
            ).toFixed(1),
          },
        );
      }
    } catch (error) {
      if (error instanceof PayloadTooLargeException) {
        throw error;
      }

      // If we can't stringify the value, it might be too large or contain circular references
      this.logger.warn(
        `[${operationId}] Could not validate payload size for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          error: error.message,
        },
      );
    }
  }

  /**
   * Detect potential security threats in the input
   */
  private detectSecurityThreats(value: any, operationId: string): void {
    const threats: string[] = [];

    // Convert value to string for pattern analysis
    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    // Detect XSS attempts
    if (detectXSS(stringValue)) {
      threats.push("XSS");

      if (
        this.config.auditLogging.enabled &&
        this.config.auditLogging.logThreatDetection
      ) {
        this.logger.warn(
          `[${operationId}] XSS attempt detected for ${this.config.serviceType}`,
          {
            operationId,
            serviceType: this.config.serviceType,
            securityLevel: this.config.securityLevel,
            threatType: "XSS",
            inputLength: stringValue.length,
            inputPreview: stringValue.substring(0, 100) + "...",
          },
        );
      }
    }

    // Detect SQL injection attempts
    if (detectSQLInjection(stringValue)) {
      threats.push("SQL_INJECTION");

      if (
        this.config.auditLogging.enabled &&
        this.config.auditLogging.logThreatDetection
      ) {
        this.logger.warn(
          `[${operationId}] SQL injection attempt detected for ${this.config.serviceType}`,
          {
            operationId,
            serviceType: this.config.serviceType,
            securityLevel: this.config.securityLevel,
            threatType: "SQL_INJECTION",
            inputLength: stringValue.length,
            inputPreview: stringValue.substring(0, 100) + "...",
          },
        );
      }
    }

    // Throw error if threats detected
    if (threats.length > 0) {
      const threatTypes = threats.join(", ");

      this.logger.error(
        `[${operationId}] Security threats blocked for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          threatTypes: threatTypes,
          threatCount: threats.length,
          blocked: true,
        },
      );

      throw new BadRequestException(
        `Security violation detected: ${threatTypes}. Request has been blocked and logged for service ${this.config.serviceType}.`,
      );
    }
  }

  /**
   * Sanitize input value based on type
   */
  private sanitizeValue(value: any, operationId: string): any {
    const startTime = Date.now();
    let sanitized: any;

    if (typeof value === "string") {
      sanitized = sanitizeInput(value, this.config.sanitizationOptions);
    } else if (typeof value === "object" && value !== null) {
      sanitized = sanitizeObject(value, this.config.sanitizationOptions);
    } else {
      sanitized = value;
    }

    const sanitizationTime = Date.now() - startTime;
    const hasChanges = JSON.stringify(sanitized) !== JSON.stringify(value);

    if (
      this.config.auditLogging.enabled &&
      this.config.auditLogging.logSanitization &&
      hasChanges
    ) {
      this.logger.debug(
        `[${operationId}] Input sanitization completed for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          inputType: typeof value,
          isObject: typeof value === "object",
          sanitizationTimeMs: sanitizationTime,
          hasChanges,
          originalSize: JSON.stringify(value).length,
          sanitizedSize: JSON.stringify(sanitized).length,
        },
      );
    }

    return sanitized;
  }

  /**
   * Check if validation should be performed for the given metadata
   */
  private shouldValidate(metadata: ArgumentMetadata): boolean {
    const { type, metatype } = metadata;

    // Skip validation for certain types
    if (type === "custom" || !metatype) {
      return false;
    }

    return true;
  }

  /**
   * Perform class-validator validation
   */
  private async validateValue(
    value: any,
    metatype: any,
    operationId: string,
  ): Promise<void> {
    const startTime = Date.now();

    const validationOptions = {
      whitelist: this.config.whitelist,
      forbidNonWhitelisted: this.config.forbidNonWhitelisted,
      skipMissingProperties: this.config.skipMissingProperties,
      groups: this.config.validationGroups,
      stopAtFirstError: this.config.stopAtFirstError,
    };

    const errors: ValidationError[] = await validate(value, validationOptions);

    const validationTime = Date.now() - startTime;

    if (errors.length > 0) {
      const formattedErrors = this.formatValidationErrors(errors);

      this.logger.warn(
        `[${operationId}] Class validation failed for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          metatype: metatype.name,
          errorCount: errors.length,
          validationTimeMs: validationTime,
          errors: this.config.disableErrorMessages
            ? undefined
            : formattedErrors,
        },
      );

      const errorResponse = {
        message: "Validation failed",
        timestamp: new Date().toISOString(),
        operationId,
        serviceType: this.config.serviceType,
      };

      // Include detailed errors only if not disabled
      if (!this.config.disableErrorMessages) {
        (errorResponse as any).errors = formattedErrors;
      }

      throw new BadRequestException(errorResponse);
    }

    if (this.config.enableDebugLogging) {
      this.logger.debug(
        `[${operationId}] Class validation passed for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          metatype: metatype.name,
          validationTimeMs: validationTime,
          errorCount: 0,
        },
      );
    }
  }

  /**
   * Format validation errors for consistent response structure
   */
  private formatValidationErrors(errors: ValidationError[]): any[] {
    return errors.map((error) => ({
      property: error.property,
      value: this.config.disableErrorMessages ? "[REDACTED]" : error.value,
      constraints: error.constraints,
      children:
        error.children?.length > 0
          ? this.formatValidationErrors(error.children)
          : undefined,
    }));
  }

  /**
   * Log security event for audit trail
   */
  private logSecurityEvent(
    operationId: string,
    error: any,
    value: any,
    metadata: ArgumentMetadata,
  ): void {
    try {
      let eventType = SecurityEventType.VALIDATION_FAILED;

      if (error.message?.includes("XSS")) {
        eventType = SecurityEventType.XSS_ATTEMPT_BLOCKED;
      } else if (error.message?.includes("SQL")) {
        eventType = SecurityEventType.INJECTION_ATTEMPT_BLOCKED;
      }

      const securityEvent = createSecurityEvent(
        eventType,
        `validation-pipe-${this.config.serviceType}-${metadata.type}`,
        "POST",
        false,
        error.message || "Validation failed",
        {
          operationId,
          serviceType: this.config.serviceType,
          securityLevel: this.config.securityLevel,
          inputType: typeof value,
          metatype: metadata.metatype?.name,
          errorType: error.constructor.name,
          threatDetection: this.config.enableThreatDetection,
          sanitizationEnabled: this.config.enableSanitization,
        },
      );

      const logMessage = `Validation security event for ${this.config.serviceType}: ${securityEvent.eventId}`;
      const logData = {
        eventId: securityEvent.eventId,
        eventType: securityEvent.type,
        riskScore: securityEvent.riskScore,
        serviceType: this.config.serviceType,
        operationId,
      };

      // Log at appropriate level
      switch (this.config.auditLogging.logLevel) {
        case "error":
          this.logger.error(logMessage, logData);
          break;
        case "warn":
          this.logger.warn(logMessage, logData);
          break;
        case "info":
          this.logger.log(logMessage, logData);
          break;
        case "debug":
        default:
          this.logger.debug(logMessage, logData);
          break;
      }
    } catch (loggingError) {
      this.logger.error(
        `Failed to log validation security event for ${this.config.serviceType}`,
        {
          operationId,
          serviceType: this.config.serviceType,
          error: loggingError.message,
          originalError: error.message,
        },
      );
    }
  }

  /**
   * Get current validation configuration (for debugging/testing)
   */
  getValidationConfig(): StandardizedValidationConfig {
    return { ...this.config };
  }

  /**
   * Factory methods for creating service-specific validation pipes
   */
  static createBytebotDPipe(
    environment: string = "development",
    customOptions?: Partial<StandardizedValidationConfig>,
  ): StandardizedValidationPipe {
    return new StandardizedValidationPipe(
      ValidationServiceType.BYTEBOTD,
      environment,
      customOptions,
    );
  }

  static createBytebotAgentPipe(
    environment: string = "development",
    customOptions?: Partial<StandardizedValidationConfig>,
  ): StandardizedValidationPipe {
    return new StandardizedValidationPipe(
      ValidationServiceType.BYTEBOT_AGENT,
      environment,
      customOptions,
    );
  }

  static createBytebotUIPipe(
    environment: string = "development",
    customOptions?: Partial<StandardizedValidationConfig>,
  ): StandardizedValidationPipe {
    return new StandardizedValidationPipe(
      ValidationServiceType.BYTEBOT_UI,
      environment,
      customOptions,
    );
  }
}

/**
 * Pre-configured validation pipes by security level
 */
export const StandardizedValidationPipes = {
  /**
   * Maximum security validation for BytebotD
   */
  MAXIMUM_SECURITY: (environment: string = "production") =>
    StandardizedValidationPipe.createBytebotDPipe(environment, {
      securityLevel: ValidationSecurityLevel.MAXIMUM,
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 10 * 1024 * 1024, // 10MB
      stopAtFirstError: true,
      sanitizationOptions: {
        ...DEFAULT_SANITIZATION_OPTIONS,
        stripHtml: true,
        allowHtml: false,
        maxLength: 5000,
      },
    }),

  /**
   * High security validation for Bytebot-Agent
   */
  HIGH_SECURITY: (environment: string = "production") =>
    StandardizedValidationPipe.createBytebotAgentPipe(environment, {
      securityLevel: ValidationSecurityLevel.HIGH,
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 25 * 1024 * 1024, // 25MB
      sanitizationOptions: {
        ...DEFAULT_SANITIZATION_OPTIONS,
        allowHtml: true,
        stripHtml: false,
        maxLength: 25000,
      },
    }),

  /**
   * Standard security validation for Bytebot-UI
   */
  STANDARD_SECURITY: (environment: string = "production") =>
    StandardizedValidationPipe.createBytebotUIPipe(environment, {
      securityLevel: ValidationSecurityLevel.STANDARD,
      enableSanitization: true,
      enableThreatDetection: true,
      maxPayloadSize: 5 * 1024 * 1024, // 5MB
      forbidNonWhitelisted: false, // Allow extra props for frontend
    }),

  /**
   * Development-friendly validation for all services
   */
  DEVELOPMENT: (
    serviceType: ValidationServiceType = ValidationServiceType.SHARED,
  ) =>
    new StandardizedValidationPipe(serviceType, "development", {
      securityLevel: ValidationSecurityLevel.DEVELOPMENT,
      enableSanitization: false,
      enableThreatDetection: false,
      maxPayloadSize: 100 * 1024 * 1024, // 100MB
      disableErrorMessages: false,
      enableDebugLogging: true,
    }),
} as const;

export default StandardizedValidationPipe;
