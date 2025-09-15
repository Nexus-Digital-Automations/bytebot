"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StandardizedValidationPipe_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandardizedValidationPipes = exports.StandardizedValidationPipe = exports.ValidationServiceType = exports.ValidationSecurityLevel = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const security_utils_1 = require("../utils/security.utils");
var ValidationSecurityLevel;
(function (ValidationSecurityLevel) {
    ValidationSecurityLevel["_MAXIMUM"] = "maximum";
    ValidationSecurityLevel["_HIGH"] = "high";
    ValidationSecurityLevel["_STANDARD"] = "standard";
    ValidationSecurityLevel["_DEVELOPMENT"] = "development";
})(ValidationSecurityLevel || (exports.ValidationSecurityLevel = ValidationSecurityLevel = {}));
var ValidationServiceType;
(function (ValidationServiceType) {
    ValidationServiceType["_BYTEBOTD"] = "bytebotd";
    ValidationServiceType["_BYTEBOT_AGENT"] = "bytebot-agent";
    ValidationServiceType["_BYTEBOT_UI"] = "bytebot-ui";
    ValidationServiceType["_SHARED"] = "shared";
})(ValidationServiceType || (exports.ValidationServiceType = ValidationServiceType = {}));
const VALIDATION_PROFILES = {
    [ValidationServiceType._BYTEBOTD]: {
        development: {
            securityLevel: ValidationSecurityLevel._DEVELOPMENT,
            transform: true,
            whitelist: false,
            forbidNonWhitelisted: false,
            enableSanitization: false,
            enableThreatDetection: false,
            maxPayloadSize: 100 * 1024 * 1024,
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
            securityLevel: ValidationSecurityLevel._HIGH,
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            enableSanitization: true,
            enableThreatDetection: true,
            maxPayloadSize: 50 * 1024 * 1024,
            disableErrorMessages: false,
            enableDebugLogging: true,
            sanitizationOptions: {
                ...security_utils_1.DEFAULT_SANITIZATION_OPTIONS,
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
            securityLevel: ValidationSecurityLevel._MAXIMUM,
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            enableSanitization: true,
            enableThreatDetection: true,
            maxPayloadSize: 25 * 1024 * 1024,
            disableErrorMessages: true,
            enableDebugLogging: false,
            stopAtFirstError: true,
            sanitizationOptions: {
                ...security_utils_1.DEFAULT_SANITIZATION_OPTIONS,
                stripHtml: true,
                allowHtml: false,
                maxLength: 5000,
                allowedTags: [],
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
    [ValidationServiceType._BYTEBOT_AGENT]: {
        development: {
            securityLevel: ValidationSecurityLevel._DEVELOPMENT,
            transform: true,
            whitelist: false,
            forbidNonWhitelisted: false,
            enableSanitization: false,
            enableThreatDetection: false,
            maxPayloadSize: 50 * 1024 * 1024,
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
            securityLevel: ValidationSecurityLevel._HIGH,
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            enableSanitization: true,
            enableThreatDetection: true,
            maxPayloadSize: 25 * 1024 * 1024,
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
            securityLevel: ValidationSecurityLevel._HIGH,
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            enableSanitization: true,
            enableThreatDetection: true,
            maxPayloadSize: 15 * 1024 * 1024,
            disableErrorMessages: true,
            enableDebugLogging: false,
            stopAtFirstError: false,
            sanitizationOptions: {
                ...security_utils_1.DEFAULT_SANITIZATION_OPTIONS,
                allowHtml: true,
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
                logSanitization: false,
                logThreatDetection: true,
            },
        },
    },
    [ValidationServiceType._BYTEBOT_UI]: {
        development: {
            securityLevel: ValidationSecurityLevel._DEVELOPMENT,
            transform: true,
            whitelist: false,
            forbidNonWhitelisted: false,
            enableSanitization: false,
            enableThreatDetection: false,
            maxPayloadSize: 10 * 1024 * 1024,
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
            securityLevel: ValidationSecurityLevel._STANDARD,
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: false,
            enableSanitization: true,
            enableThreatDetection: true,
            maxPayloadSize: 5 * 1024 * 1024,
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
            securityLevel: ValidationSecurityLevel._STANDARD,
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: false,
            enableSanitization: true,
            enableThreatDetection: true,
            maxPayloadSize: 2 * 1024 * 1024,
            disableErrorMessages: false,
            enableDebugLogging: false,
            sanitizationOptions: {
                ...security_utils_1.DEFAULT_SANITIZATION_OPTIONS,
                allowHtml: false,
                stripHtml: true,
                maxLength: 1000,
                trim: true,
            },
            auditLogging: {
                enabled: true,
                logLevel: "warn",
                logFailedValidation: false,
                logSanitization: false,
                logThreatDetection: true,
            },
        },
    },
    [ValidationServiceType._SHARED]: {
        development: {
            securityLevel: ValidationSecurityLevel._DEVELOPMENT,
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
let StandardizedValidationPipe = StandardizedValidationPipe_1 = class StandardizedValidationPipe {
    logger = new common_1.Logger(StandardizedValidationPipe_1.name);
    config;
    constructor(serviceType = ValidationServiceType._SHARED, environment = "development", customOptions) {
        this.config = this.buildStandardizedConfig(serviceType, environment, customOptions);
        this.logger.log(`Standardized validation pipe initialized for ${serviceType}`, {
            serviceType,
            environment,
            securityLevel: this.config.securityLevel,
            enableSanitization: this.config.enableSanitization,
            enableThreatDetection: this.config.enableThreatDetection,
            maxPayloadSize: this.config.maxPayloadSize,
            auditLogging: this.config.auditLogging.enabled,
        });
    }
    buildStandardizedConfig(serviceType, environment, customOptions) {
        const profile = VALIDATION_PROFILES[serviceType]?.[environment] ||
            VALIDATION_PROFILES[serviceType]?.["development"] ||
            {};
        const defaultConfig = {
            serviceType,
            securityLevel: ValidationSecurityLevel._STANDARD,
            environment,
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            enableSanitization: true,
            sanitizationOptions: security_utils_1.DEFAULT_SANITIZATION_OPTIONS,
            maxPayloadSize: 10 * 1024 * 1024,
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
        const mergedConfig = this.deepMerge(defaultConfig, profile);
        return this.deepMerge(mergedConfig, customOptions || {});
    }
    deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                const sourceValue = source[key];
                const targetValue = result[key];
                if (sourceValue &&
                    typeof sourceValue === "object" &&
                    !Array.isArray(sourceValue) &&
                    targetValue &&
                    typeof targetValue === "object" &&
                    !Array.isArray(targetValue)) {
                    result[key] = this.deepMerge(targetValue, sourceValue);
                }
                else if (sourceValue !== undefined) {
                    result[key] = sourceValue;
                }
            }
        }
        return result;
    }
    async transform(value, metadata) {
        const operationId = `validation-${this.config.serviceType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        if (this.config.enableDebugLogging) {
            this.logger.debug(`[${operationId}] Starting validation for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                securityLevel: this.config.securityLevel,
                type: metadata.type,
                metatype: metadata.metatype?.name,
                hasValue: value !== undefined && value !== null,
                valueType: typeof value,
            });
        }
        try {
            if (!metadata.metatype || this.isBasicType(metadata.metatype)) {
                if (this.config.enableDebugLogging) {
                    this.logger.debug(`[${operationId}] Skipping validation for basic type`, {
                        operationId,
                        type: metadata.type,
                        metatype: metadata.metatype?.name,
                    });
                }
                return this.sanitizeBasicValue(value, operationId);
            }
            if (typeof value === "object" && value !== null) {
                this.validatePayloadSize(value, operationId);
            }
            if (this.config.enableThreatDetection) {
                this.detectSecurityThreats(value, operationId);
            }
            let sanitizedValue = value;
            if (this.config.enableSanitization) {
                sanitizedValue = this.sanitizeValue(value, operationId);
            }
            const transformedValue = this.config.transform
                ? (0, class_transformer_1.plainToClass)(metadata.metatype, sanitizedValue)
                : sanitizedValue;
            if (this.shouldValidate(metadata)) {
                await this.validateValue(transformedValue, metadata.metatype, operationId);
            }
            const processingTime = Date.now() - startTime;
            if (this.config.enableDebugLogging) {
                this.logger.debug(`[${operationId}] Validation completed successfully for ${this.config.serviceType}`, {
                    operationId,
                    serviceType: this.config.serviceType,
                    type: metadata.type,
                    metatype: metadata.metatype?.name,
                    processingTimeMs: processingTime,
                    sanitized: this.config.enableSanitization,
                    threatDetected: false,
                });
            }
            return transformedValue;
        }
        catch (err) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`[${operationId}] Validation failed for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                securityLevel: this.config.securityLevel,
                type: metadata.type,
                metatype: metadata.metatype?.name,
                error: err instanceof Error ? err.message : String(err),
                processingTimeMs: processingTime,
            });
            if (this.config.auditLogging.enabled &&
                this.config.auditLogging.logFailedValidation) {
                this.logSecurityEvent(operationId, err, value, metadata);
            }
            throw err;
        }
    }
    isBasicType(metatype) {
        const basicTypes = [String, Boolean, Number, Array, Object];
        return basicTypes.includes(metatype);
    }
    sanitizeBasicValue(value, operationId) {
        if (typeof value === "string" && this.config.enableSanitization) {
            const sanitized = (0, security_utils_1.sanitizeInput)(value, this.config.sanitizationOptions);
            if (sanitized !== value &&
                this.config.auditLogging.enabled &&
                this.config.auditLogging.logSanitization) {
                this.logger.debug(`[${operationId}] Basic value sanitized for ${this.config.serviceType}`, {
                    operationId,
                    serviceType: this.config.serviceType,
                    originalLength: value.length,
                    sanitizedLength: sanitized.length,
                    changed: true,
                });
            }
            return sanitized;
        }
        return value;
    }
    validatePayloadSize(value, operationId) {
        try {
            const payloadSize = JSON.stringify(value).length;
            if (payloadSize > this.config.maxPayloadSize) {
                const errorMessage = `Request payload too large for ${this.config.serviceType}. Maximum allowed: ${this.config.maxPayloadSize} bytes`;
                this.logger.warn(`[${operationId}] Payload size limit exceeded for ${this.config.serviceType}`, {
                    operationId,
                    serviceType: this.config.serviceType,
                    securityLevel: this.config.securityLevel,
                    payloadSize,
                    maxPayloadSize: this.config.maxPayloadSize,
                    ratio: (payloadSize / this.config.maxPayloadSize).toFixed(2),
                });
                throw new common_1.PayloadTooLargeException(errorMessage);
            }
            if (this.config.enableDebugLogging) {
                this.logger.debug(`[${operationId}] Payload size validation passed for ${this.config.serviceType}`, {
                    operationId,
                    serviceType: this.config.serviceType,
                    payloadSize,
                    maxPayloadSize: this.config.maxPayloadSize,
                    utilizationPercent: ((payloadSize / this.config.maxPayloadSize) *
                        100).toFixed(1),
                });
            }
        }
        catch (err) {
            if (err instanceof common_1.PayloadTooLargeException) {
                throw err;
            }
            this.logger.warn(`[${operationId}] Could not validate payload size for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    detectSecurityThreats(value, operationId) {
        const threats = [];
        const stringValue = typeof value === "string" ? value : JSON.stringify(value);
        if ((0, security_utils_1.detectXSS)(stringValue)) {
            threats.push("XSS");
            if (this.config.auditLogging.enabled &&
                this.config.auditLogging.logThreatDetection) {
                this.logger.warn(`[${operationId}] XSS attempt detected for ${this.config.serviceType}`, {
                    operationId,
                    serviceType: this.config.serviceType,
                    securityLevel: this.config.securityLevel,
                    threatType: "XSS",
                    inputLength: stringValue.length,
                    inputPreview: stringValue.substring(0, 100) + "...",
                });
            }
        }
        if ((0, security_utils_1.detectSQLInjection)(stringValue)) {
            threats.push("SQL_INJECTION");
            if (this.config.auditLogging.enabled &&
                this.config.auditLogging.logThreatDetection) {
                this.logger.warn(`[${operationId}] SQL injection attempt detected for ${this.config.serviceType}`, {
                    operationId,
                    serviceType: this.config.serviceType,
                    securityLevel: this.config.securityLevel,
                    threatType: "SQL_INJECTION",
                    inputLength: stringValue.length,
                    inputPreview: stringValue.substring(0, 100) + "...",
                });
            }
        }
        if (threats.length > 0) {
            const threatTypes = threats.join(", ");
            this.logger.error(`[${operationId}] Security threats blocked for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                securityLevel: this.config.securityLevel,
                threatTypes: threatTypes,
                threatCount: threats.length,
                blocked: true,
            });
            throw new common_1.BadRequestException(`Security violation detected: ${threatTypes}. Request has been blocked and logged for service ${this.config.serviceType}.`);
        }
    }
    sanitizeValue(value, operationId) {
        const startTime = Date.now();
        let sanitized;
        if (typeof value === "string") {
            sanitized = (0, security_utils_1.sanitizeInput)(value, this.config.sanitizationOptions);
        }
        else if (typeof value === "object" && value !== null) {
            sanitized = (0, security_utils_1.sanitizeObject)(value, this.config.sanitizationOptions);
        }
        else {
            sanitized = value;
        }
        const sanitizationTime = Date.now() - startTime;
        const hasChanges = JSON.stringify(sanitized) !== JSON.stringify(value);
        if (this.config.auditLogging.enabled &&
            this.config.auditLogging.logSanitization &&
            hasChanges) {
            this.logger.debug(`[${operationId}] Input sanitization completed for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                inputType: typeof value,
                isObject: typeof value === "object",
                sanitizationTimeMs: sanitizationTime,
                hasChanges,
                originalSize: JSON.stringify(value).length,
                sanitizedSize: JSON.stringify(sanitized).length,
            });
        }
        return sanitized;
    }
    shouldValidate(metadata) {
        const { type, metatype } = metadata;
        if (type === "custom" || !metatype) {
            return false;
        }
        return true;
    }
    async validateValue(value, metatype, operationId) {
        const startTime = Date.now();
        const validationOptions = {
            whitelist: this.config.whitelist,
            forbidNonWhitelisted: this.config.forbidNonWhitelisted,
            skipMissingProperties: this.config.skipMissingProperties,
            groups: this.config.validationGroups,
            stopAtFirstError: this.config.stopAtFirstError,
        };
        if (typeof value !== "object" || value === null) {
            throw new common_1.BadRequestException("Validation target must be an object");
        }
        const errors = await (0, class_validator_1.validate)(value, validationOptions);
        const validationTime = Date.now() - startTime;
        if (errors.length > 0) {
            const formattedErrors = this.formatValidationErrors(errors);
            this.logger.warn(`[${operationId}] Class validation failed for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                securityLevel: this.config.securityLevel,
                metatype: metatype.name,
                errorCount: errors.length,
                validationTimeMs: validationTime,
                errors: this.config.disableErrorMessages
                    ? undefined
                    : formattedErrors,
            });
            const errorResponse = {
                message: "Validation failed",
                timestamp: new Date().toISOString(),
                operationId,
                serviceType: this.config.serviceType,
            };
            if (!this.config.disableErrorMessages) {
                errorResponse.errors = formattedErrors;
            }
            throw new common_1.BadRequestException(errorResponse);
        }
        if (this.config.enableDebugLogging) {
            this.logger.debug(`[${operationId}] Class validation passed for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                metatype: metatype.name,
                validationTimeMs: validationTime,
                errorCount: 0,
            });
        }
    }
    formatValidationErrors(errors) {
        return errors.map((error) => ({
            property: error.property,
            value: this.config.disableErrorMessages
                ? "[REDACTED]"
                : error.value,
            constraints: error.constraints,
            children: error.children && error.children.length > 0
                ? this.formatValidationErrors(error.children).map((child) => ({
                    property: child.property,
                    value: child.value,
                    constraints: child.constraints,
                }))
                : undefined,
        }));
    }
    logSecurityEvent(operationId, error, value, metadata) {
        try {
            let eventType = security_utils_1.SecurityEventType._VALIDATION_FAILED;
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("XSS")) {
                eventType = security_utils_1.SecurityEventType._XSS_ATTEMPT_BLOCKED;
            }
            else if (errorMessage.includes("SQL")) {
                eventType = security_utils_1.SecurityEventType._INJECTION_ATTEMPT_BLOCKED;
            }
            const securityEvent = (0, security_utils_1.createSecurityEvent)(eventType, `validation-pipe-${this.config.serviceType}-${metadata.type}`, "POST", false, errorMessage || "Validation failed", {
                operationId,
                serviceType: this.config.serviceType,
                securityLevel: this.config.securityLevel,
                inputType: typeof value,
                metatype: metadata.metatype?.name,
                errorType: error instanceof Error ? error.constructor.name : typeof error,
                threatDetection: this.config.enableThreatDetection,
                sanitizationEnabled: this.config.enableSanitization,
            });
            const logMessage = `Validation security event for ${this.config.serviceType}: ${securityEvent.eventId}`;
            const logData = {
                eventId: securityEvent.eventId,
                eventType: securityEvent.type,
                riskScore: securityEvent.riskScore,
                serviceType: this.config.serviceType,
                operationId,
            };
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
        }
        catch (loggingError) {
            this.logger.error(`Failed to log validation security event for ${this.config.serviceType}`, {
                operationId,
                serviceType: this.config.serviceType,
                error: loggingError instanceof Error
                    ? loggingError.message
                    : String(loggingError),
                originalError: error instanceof Error ? error.message : String(error),
            });
        }
    }
    getValidationConfig() {
        return { ...this.config };
    }
    static createBytebotDPipe(environment = "development", customOptions) {
        return new StandardizedValidationPipe_1(ValidationServiceType._BYTEBOTD, environment, customOptions);
    }
    static createBytebotAgentPipe(environment = "development", customOptions) {
        return new StandardizedValidationPipe_1(ValidationServiceType._BYTEBOT_AGENT, environment, customOptions);
    }
    static createBytebotUIPipe(environment = "development", customOptions) {
        return new StandardizedValidationPipe_1(ValidationServiceType._BYTEBOT_UI, environment, customOptions);
    }
};
exports.StandardizedValidationPipe = StandardizedValidationPipe;
exports.StandardizedValidationPipe = StandardizedValidationPipe = StandardizedValidationPipe_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String, String, Object])
], StandardizedValidationPipe);
exports.StandardizedValidationPipes = {
    MAXIMUM_SECURITY: (environment = "production") => StandardizedValidationPipe.createBytebotDPipe(environment, {
        securityLevel: ValidationSecurityLevel._MAXIMUM,
        enableSanitization: true,
        enableThreatDetection: true,
        maxPayloadSize: 10 * 1024 * 1024,
        stopAtFirstError: true,
        sanitizationOptions: {
            ...security_utils_1.DEFAULT_SANITIZATION_OPTIONS,
            stripHtml: true,
            allowHtml: false,
            maxLength: 5000,
        },
    }),
    HIGH_SECURITY: (environment = "production") => StandardizedValidationPipe.createBytebotAgentPipe(environment, {
        securityLevel: ValidationSecurityLevel._HIGH,
        enableSanitization: true,
        enableThreatDetection: true,
        maxPayloadSize: 25 * 1024 * 1024,
        sanitizationOptions: {
            ...security_utils_1.DEFAULT_SANITIZATION_OPTIONS,
            allowHtml: true,
            stripHtml: false,
            maxLength: 25000,
        },
    }),
    STANDARD_SECURITY: (environment = "production") => StandardizedValidationPipe.createBytebotUIPipe(environment, {
        securityLevel: ValidationSecurityLevel._STANDARD,
        enableSanitization: true,
        enableThreatDetection: true,
        maxPayloadSize: 5 * 1024 * 1024,
        forbidNonWhitelisted: false,
    }),
    DEVELOPMENT: (serviceType = ValidationServiceType._SHARED) => new StandardizedValidationPipe(serviceType, "development", {
        securityLevel: ValidationSecurityLevel._DEVELOPMENT,
        enableSanitization: false,
        enableThreatDetection: false,
        maxPayloadSize: 100 * 1024 * 1024,
        disableErrorMessages: false,
        enableDebugLogging: true,
    }),
};
exports.default = StandardizedValidationPipe;
//# sourceMappingURL=validation.standardized.js.map