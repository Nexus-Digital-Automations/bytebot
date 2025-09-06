/**
 * Security Validation Decorators - Bytebot Platform Advanced Validation Framework
 *
 * This module provides specialized validation decorators with enhanced security features
 * specifically designed for Bytebot services including computer-use operations,
 * task management, and user input validation.
 *
 * @fileoverview Advanced security validation decorators for Bytebot services
 * @version 2.0.0
 * @author Specialized Input Validation Enhancement Subagent
 */

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import {
  detectXSS,
  detectSQLInjection,
  detectMaliciousFileContent,
  validateFilePath,
  validateCoordinates,
  sanitizeInput,
  DEFAULT_SANITIZATION_OPTIONS,
  SanitizationOptions,
} from "../utils/security.utils";

// ===========================
// CONSTRAINT INTERFACES
// ===========================

/**
 * XSS Detection Validator Constraint
 */
@ValidatorConstraint({ async: false })
export class IsNotXSSConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== "string") {
      return true; // Let other validators handle type checking
    }

    return !detectXSS(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains potential XSS content and has been blocked for security`;
  }
}

/**
 * SQL Injection Detection Validator Constraint
 */
@ValidatorConstraint({ async: false })
export class IsNotSQLInjectionConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    if (typeof value !== "string") {
      return true; // Let other validators handle type checking
    }

    return !detectSQLInjection(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains potential SQL injection content and has been blocked for security`;
  }
}

/**
 * Safe File Path Validator Constraint
 */
@ValidatorConstraint({ async: false })
export class IsSafeFilePathConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "string") {
      return false;
    }

    const allowedBasePaths = args.constraints[0] as string[] | undefined;
    const validation = validateFilePath(value, allowedBasePaths);
    return validation.isValid;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains unsafe file path patterns`;
  }
}

/**
 * Screen Coordinates Validator Constraint
 */
@ValidatorConstraint({ async: false })
export class IsValidScreenCoordinatesConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const coords = value as Record<string, unknown>;
    const { x, y } = coords;
    if (typeof x !== "number" || typeof y !== "number") {
      return false;
    }

    const screenBounds = args.constraints[0] as { width: number; height: number; } | undefined;
    const validation = validateCoordinates(x, y, screenBounds);
    return validation.isValid;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains invalid or unsafe screen coordinates`;
  }
}

/**
 * Malicious File Content Validator Constraint
 */
@ValidatorConstraint({ async: false })
export class IsNotMaliciousFileConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "string") {
      return false;
    }

    const filename = args.constraints[0] as string | undefined;
    return !detectMaliciousFileContent(value, filename);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains malicious file content and has been blocked`;
  }
}

/**
 * Safe Text Input Validator Constraint (combines XSS and SQL injection detection)
 */
@ValidatorConstraint({ async: false })
export class IsSafeTextInputConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "string") {
      return true; // Let other validators handle type checking
    }

    // Check for XSS
    if (detectXSS(value)) {
      return false;
    }

    // Check for SQL injection
    if (detectSQLInjection(value)) {
      return false;
    }

    // Additional security checks
    const additionalChecks = args.constraints[0] as boolean | undefined;
    if (additionalChecks) {
      // Check for template injection patterns
      if (/\{\{.*\}\}|\$\{.*\}/.test(value)) {
        return false;
      }

      // Check for command injection patterns
      if (/[;&|`$]/.test(value)) {
        return false;
      }

      // Check for path traversal patterns
      if (/\.{2,}[\/\\]/.test(value)) {
        return false;
      }
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains potentially unsafe content and has been blocked for security`;
  }
}

/**
 * Computer-Use Action Text Validator (specialized for computer actions)
 */
@ValidatorConstraint({ async: false })
export class IsValidComputerActionTextConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (typeof value !== "string") {
      return false;
    }

    // Basic security checks
    if (detectXSS(value) || detectSQLInjection(value)) {
      return false;
    }

    // Check for potentially dangerous key combinations or system commands
    const dangerousPatterns = [
      /ctrl\s*\+\s*alt\s*\+\s*del/gi,
      /cmd\s*\+\s*opt\s*\+\s*esc/gi,
      /sudo\s+/gi,
      /rm\s+-rf/gi,
      /del\s+\/[qsf]/gi,
      /format\s+[a-z]:/gi,
      /shutdown/gi,
      /reboot/gi,
      /halt/gi,
    ];

    if (dangerousPatterns.some((pattern) => pattern.test(value))) {
      return false;
    }

    // Check length constraints for computer-use operations
    const maxLength = (args.constraints[0] as number) ?? 10000;
    if (value.length > maxLength) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} contains potentially dangerous computer action text`;
  }
}

// ===========================
// DECORATOR FUNCTIONS
// ===========================

/**
 * Validates that a string does not contain XSS content
 * @param validationOptions Standard class-validator options
 */
export function IsNotXSS(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isNotXSS",
      target: object.constructor as Function,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsNotXSSConstraint,
    });
  };
}

/**
 * Validates that a string does not contain SQL injection content
 * @param validationOptions Standard class-validator options
 */
export function IsNotSQLInjection(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isNotSQLInjection",
      target: object.constructor as Function,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsNotSQLInjectionConstraint,
    });
  };
}

/**
 * Validates that a file path is safe and within allowed directories
 * @param allowedBasePaths Array of allowed base directories (optional)
 * @param validationOptions Standard class-validator options
 */
export function IsSafeFilePath(
  allowedBasePaths?: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSafeFilePath",
      target: object.constructor as Function,
      propertyName: propertyName,
      constraints: [allowedBasePaths],
      options: validationOptions,
      validator: IsSafeFilePathConstraint,
    });
  };
}

/**
 * Validates screen coordinates for computer-use actions
 * @param screenBounds Optional screen bounds for validation
 * @param validationOptions Standard class-validator options
 */
export function IsValidScreenCoordinates(
  screenBounds?: { width: number; height: number },
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isValidScreenCoordinates",
      target: object.constructor as Function,
      propertyName: propertyName,
      constraints: [screenBounds],
      options: validationOptions,
      validator: IsValidScreenCoordinatesConstraint,
    });
  };
}

/**
 * Validates that file content is not malicious
 * @param filename Optional filename for extension checking
 * @param validationOptions Standard class-validator options
 */
export function IsNotMaliciousFile(
  filename?: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isNotMaliciousFile",
      target: object.constructor as Function,
      propertyName: propertyName,
      constraints: [filename],
      options: validationOptions,
      validator: IsNotMaliciousFileConstraint,
    });
  };
}

/**
 * Comprehensive safe text validation (XSS + SQL injection + additional checks)
 * @param enableAdditionalChecks Enable template injection, command injection, and path traversal checks
 * @param validationOptions Standard class-validator options
 */
export function IsSafeTextInput(
  enableAdditionalChecks: boolean = true,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSafeTextInput",
      target: object.constructor as Function,
      propertyName: propertyName,
      constraints: [enableAdditionalChecks],
      options: validationOptions,
      validator: IsSafeTextInputConstraint,
    });
  };
}

/**
 * Specialized validation for computer-use action text
 * @param maxLength Maximum allowed text length (default: 10000)
 * @param validationOptions Standard class-validator options
 */
export function IsValidComputerActionText(
  maxLength: number = 10000,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isValidComputerActionText",
      target: object.constructor as Function,
      propertyName: propertyName,
      constraints: [maxLength],
      options: validationOptions,
      validator: IsValidComputerActionTextConstraint,
    });
  };
}

/**
 * Sanitized string validation - applies sanitization and validates result
 * @param sanitizationOptions Custom sanitization options
 * @param validationOptions Standard class-validator options
 */
export function IsSanitizedString(
  sanitizationOptions: SanitizationOptions = DEFAULT_SANITIZATION_OPTIONS,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isSanitizedString",
      target: object.constructor as Function,
      propertyName: propertyName,
      constraints: [sanitizationOptions],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (typeof value !== "string") {
            return true; // Let other validators handle type checking
          }

          const options = args.constraints[0] as SanitizationOptions;
          const sanitized = sanitizeInput(value, options);

          // The value should be identical to its sanitized version
          // If they differ, it means potentially malicious content was removed
          return value === sanitized;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} contains content that would be modified during sanitization`;
        },
      },
    });
  };
}

// ===========================
// COMPOSITE DECORATORS FOR BYTEBOT SERVICES
// ===========================

/**
 * Complete security validation for BytebotD computer-use text inputs
 * Combines XSS, SQL injection, and computer-specific safety checks
 */
export function IsBytebotDSecureText(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    // Apply multiple security decorators
    IsNotXSS(validationOptions)(object, propertyName);
    IsNotSQLInjection(validationOptions)(object, propertyName);
    IsValidComputerActionText(5000, validationOptions)(object, propertyName); // Stricter length for computer actions
  };
}

/**
 * Security validation for Bytebot-Agent task-related text inputs
 * Balanced security for task management operations
 */
export function IsBytebotAgentSecureText(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    IsNotXSS(validationOptions)(object, propertyName);
    IsNotSQLInjection(validationOptions)(object, propertyName);
    IsSafeTextInput(true, validationOptions)(object, propertyName);
  };
}

/**
 * Security validation for Bytebot-UI user inputs
 * Standard security for frontend operations
 */
export function IsBytebotUISecureText(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    IsNotXSS(validationOptions)(object, propertyName);
    IsSafeTextInput(false, validationOptions)(object, propertyName); // Lighter checks for UI
  };
}

export default {
  // Basic security decorators
  IsNotXSS,
  IsNotSQLInjection,
  IsSafeFilePath,
  IsValidScreenCoordinates,
  IsNotMaliciousFile,
  IsSafeTextInput,
  IsValidComputerActionText,
  IsSanitizedString,

  // Composite service-specific decorators
  IsBytebotDSecureText,
  IsBytebotAgentSecureText,
  IsBytebotUISecureText,

  // Constraint classes for advanced usage
  IsNotXSSConstraint,
  IsNotSQLInjectionConstraint,
  IsSafeFilePathConstraint,
  IsValidScreenCoordinatesConstraint,
  IsNotMaliciousFileConstraint,
  IsSafeTextInputConstraint,
  IsValidComputerActionTextConstraint,
};
