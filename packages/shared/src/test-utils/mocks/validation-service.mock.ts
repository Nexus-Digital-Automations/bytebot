/**
 * Validation Service Mock Implementation
 *
 * Mock implementation for input validation testing including:
 * - Input sanitization and validation
 * - Schema validation (JSON Schema, Joi, etc.)
 * - Data type validation
 * - Business rule validation
 * - SQL injection detection
 * - XSS protection validation
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { MockConfig } from "./mock-config";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: any;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "email" | "url" | "date";
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (_value: any) => boolean;
}

export interface ValidationServiceMock {
  validate: jest.MockedFunction<
    (_data: any, _rules: ValidationRule[]) => Promise<ValidationResult>
  >;
  validateSchema: jest.MockedFunction<
    (_data: any, _schema: any) => Promise<ValidationResult>
  >;
  sanitizeInput: jest.MockedFunction<(_input: string) => string>;
  validateEmail: jest.MockedFunction<(_email: string) => boolean>;
  validateUrl: jest.MockedFunction<(_url: string) => boolean>;
  validatePassword: jest.MockedFunction<
    (_password: string) => {
      isValid: boolean;
      strength: "weak" | "medium" | "strong";
      issues: string[];
    }
  >;
  detectSqlInjection: jest.MockedFunction<
    (_input: string) => {
      detected: boolean;
      patterns: string[];
      severity: "low" | "medium" | "high";
    }
  >;
  validateFileUpload: jest.MockedFunction<
    (_file: { name: string; size: number; type: string }) => ValidationResult
  >;
  validateApiKey: jest.MockedFunction<(_apiKey: string) => boolean>;
  validateJson: jest.MockedFunction<
    (_jsonString: string) => { isValid: boolean; parsed?: any; error?: string }
  >;
  validateBusinessRules: jest.MockedFunction<
    (_data: any, _context: string) => Promise<ValidationResult>
  >;
}

/**
 * Creates a comprehensive validation service mock
 */
export const createValidationServiceMock = (): ValidationServiceMock => {
  return {
    validate: jest.fn(
      async (data: any, rules: ValidationRule[]): Promise<ValidationResult> => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const sanitized = { ...data };

        for (const rule of rules) {
          const value = data[rule.field];

          // Required field validation
          if (
            rule.required &&
            (value === undefined || value === null || value === "")
          ) {
            errors.push(`Field '${rule.field}' is required`);
            continue;
          }

          // Skip further validation if field is not provided and not required
          if (!rule.required && (value === undefined || value === null)) {
            continue;
          }

          // Type validation
          if (rule.type) {
            switch (rule.type) {
              case "string":
                if (typeof value !== "string") {
                  errors.push(`Field '${rule.field}' must be a string`);
                }
                break;
              case "number":
                if (typeof value !== "number" || isNaN(value)) {
                  errors.push(`Field '${rule.field}' must be a valid number`);
                }
                break;
              case "boolean":
                if (typeof value !== "boolean") {
                  errors.push(`Field '${rule.field}' must be a boolean`);
                }
                break;
              case "email":
                if (!createValidationServiceMock().validateEmail(value)) {
                  errors.push(
                    `Field '${rule.field}' must be a valid email address`,
                  );
                }
                break;
              case "url":
                if (!createValidationServiceMock().validateUrl(value)) {
                  errors.push(`Field '${rule.field}' must be a valid URL`);
                }
                break;
              case "date":
                if (isNaN(Date.parse(value))) {
                  errors.push(`Field '${rule.field}' must be a valid date`);
                }
                break;
            }
          }

          // Length validation for strings
          if (typeof value === "string") {
            if (rule.minLength && value.length < rule.minLength) {
              errors.push(
                `Field '${rule.field}' must be at least ${rule.minLength} characters long`,
              );
            }
            if (rule.maxLength && value.length > rule.maxLength) {
              errors.push(
                `Field '${rule.field}' must not exceed ${rule.maxLength} characters`,
              );
            }

            // Sanitize string inputs
            if (MockConfig.validation.strictMode) {
              sanitized[rule.field] =
                createValidationServiceMock().sanitizeInput(value);
            }
          }

          // Pattern validation
          if (rule.pattern && typeof value === "string") {
            if (!rule.pattern.test(value)) {
              errors.push(
                `Field '${rule.field}' does not match required pattern`,
              );
            }
          }

          // Custom validator
          if (rule.customValidator && !rule.customValidator(value)) {
            errors.push(`Field '${rule.field}' failed custom validation`);
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          sanitized,
        };
      },
    ),

    validateSchema: jest.fn(
      async (data: any, schema: any): Promise<ValidationResult> => {
        // Mock JSON schema validation
        const errors: string[] = [];
        const warnings: string[] = [];

        // Basic schema validation simulation
        if (schema.required) {
          for (const field of schema.required) {
            if (!(field in data)) {
              errors.push(`Required field '${field}' is missing`);
            }
          }
        }

        if (schema.properties) {
          for (const [field, fieldSchema] of Object.entries(
            schema.properties,
          )) {
            const value = data[field];
            if (value !== undefined && (fieldSchema as any).type) {
              const expectedType = (fieldSchema as any).type;
              const actualType = typeof value;

              if (expectedType === "array" && !Array.isArray(value)) {
                errors.push(`Field '${field}' must be an array`);
              } else if (
                expectedType !== "array" &&
                actualType !== expectedType
              ) {
                errors.push(`Field '${field}' must be of type ${expectedType}`);
              }
            }
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    ),

    sanitizeInput: jest.fn((input: string): string => {
      if (!input || typeof input !== "string") {
        return input;
      }

      let sanitized = input;

      // Remove dangerous HTML tags and attributes
      sanitized = sanitized
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "")
        .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, "")
        .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, "")
        .replace(/<link[^>]*>/gi, "")
        .replace(/<meta[^>]*>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/vbscript:/gi, "")
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
        .replace(/on\w+\s*=\s*[^\s>]*/gi, "");

      // Remove SQL injection patterns
      const sqlPatterns = [
        /(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT( +INTO)?|MERGE|SELECT|UPDATE|UNION( +ALL)?)\b)/gi,
        /(;|\||\|\||&&|&|\$\(|\$\{)/g,
      ];

      sqlPatterns.forEach((pattern) => {
        sanitized = sanitized.replace(pattern, "");
      });

      // Limit length if configured
      if (
        MockConfig.validation.maxInputLength &&
        sanitized.length > MockConfig.validation.maxInputLength
      ) {
        sanitized = sanitized.slice(0, MockConfig.validation.maxInputLength);
      }

      return sanitized;
    }),

    validateEmail: jest.fn((email: string): boolean => {
      if (!email || typeof email !== "string") {
        return false;
      }

      const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      return emailRegex.test(email) && email.length <= 254; // RFC 5322 limit
    }),

    validateUrl: jest.fn((url: string): boolean => {
      if (!url || typeof url !== "string") {
        return false;
      }

      try {
        const urlObj = new URL(url);
        return ["http:", "https:"].includes(urlObj.protocol);
      } catch {
        return false;
      }
    }),

    validatePassword: jest.fn(
      (
        password: string,
      ): {
        isValid: boolean;
        strength: "weak" | "medium" | "strong";
        issues: string[];
      } => {
        const issues: string[] = [];
        let score = 0;

        if (!password || typeof password !== "string") {
          return {
            isValid: false,
            strength: "weak",
            issues: ["Password is required"],
          };
        }

        // Length check
        if (password.length < 8) {
          issues.push("Password must be at least 8 characters long");
        } else {
          score += 1;
        }

        // Character variety checks
        if (!/[a-z]/.test(password)) {
          issues.push("Password must contain at least one lowercase letter");
        } else {
          score += 1;
        }

        if (!/[A-Z]/.test(password)) {
          issues.push("Password must contain at least one uppercase letter");
        } else {
          score += 1;
        }

        if (!/\d/.test(password)) {
          issues.push("Password must contain at least one number");
        } else {
          score += 1;
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          issues.push("Password must contain at least one special character");
        } else {
          score += 1;
        }

        // Common password check
        const commonPasswords = [
          "password",
          "123456",
          "password123",
          "admin",
          "qwerty",
        ];
        if (commonPasswords.includes(password.toLowerCase())) {
          issues.push("Password is too common");
          score -= 2;
        }

        const strength: "weak" | "medium" | "strong" =
          score >= 4 ? "strong" : score >= 2 ? "medium" : "weak";

        return {
          isValid: issues.length === 0 && score >= 3,
          strength,
          issues,
        };
      },
    ),

    detectSqlInjection: jest.fn(
      (
        input: string,
      ): {
        detected: boolean;
        patterns: string[];
        severity: "low" | "medium" | "high";
      } => {
        if (!input || typeof input !== "string") {
          return { detected: false, patterns: [], severity: "low" };
        }

        const sqlPatterns = [
          {
            pattern:
              /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
            severity: "high" as const,
            name: "SQL_COMMAND",
          },
          {
            pattern: /(UNION\s+(ALL\s+)?SELECT)/gi,
            severity: "high" as const,
            name: "UNION_ATTACK",
          },
          {
            pattern: /('|"|`)\s*(OR|AND)\s*('|"|`)/gi,
            severity: "high" as const,
            name: "BOOLEAN_INJECTION",
          },
          {
            pattern: /('|")(\s*;\s*)/gi,
            severity: "medium" as const,
            name: "SEMICOLON_TERMINATION",
          },
          {
            pattern: /(--|#|\/\*)/gi,
            severity: "medium" as const,
            name: "COMMENT_INJECTION",
          },
          {
            pattern: /(\b(sys|information_schema|pg_|mysql)\b)/gi,
            severity: "low" as const,
            name: "SYSTEM_TABLE_ACCESS",
          },
        ];

        const detectedPatterns: string[] = [];
        let maxSeverity: "low" | "medium" | "high" = "low";

        for (const { pattern, severity, name } of sqlPatterns) {
          if (pattern.test(input)) {
            detectedPatterns.push(name);

            if (
              severity === "high" ||
              (severity === "medium" && maxSeverity === "low")
            ) {
              maxSeverity = severity;
            }
          }
        }

        return {
          detected: detectedPatterns.length > 0,
          patterns: detectedPatterns,
          severity: maxSeverity,
        };
      },
    ),

    validateFileUpload: jest.fn(
      (file: {
        name: string;
        size: number;
        type: string;
      }): ValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // File size validation (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          errors.push(
            `File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`,
          );
        }

        // File type validation
        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
          "application/pdf",
          "text/plain",
          "application/json",
          "text/csv",
          "application/zip",
        ];

        if (!allowedTypes.includes(file.type)) {
          errors.push("File type not allowed");
        }

        // File extension validation
        const allowedExtensions = [
          ".jpg",
          ".jpeg",
          ".png",
          ".gif",
          ".webp",
          ".pdf",
          ".txt",
          ".json",
          ".csv",
          ".zip",
        ];
        const extension = file.name
          .toLowerCase()
          .substring(file.name.lastIndexOf("."));

        if (!allowedExtensions.includes(extension)) {
          errors.push("File extension not allowed");
        }

        // Suspicious file name patterns
        const suspiciousPatterns = [
          /\.(exe|bat|cmd|scr|com|pif)$/i,
          /\.php\./i,
          /\.\./,
          /[<>:"|?*]/,
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(file.name)) {
            errors.push("Suspicious file name detected");
            break;
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    ),

    validateApiKey: jest.fn((apiKey: string): boolean => {
      if (!apiKey || typeof apiKey !== "string") {
        return false;
      }

      // Mock API key validation - should be alphanumeric, specific length
      const apiKeyPattern = /^[a-zA-Z0-9]{32,64}$/;
      return apiKeyPattern.test(apiKey);
    }),

    validateJson: jest.fn(
      (
        jsonString: string,
      ): { isValid: boolean; parsed?: any; error?: string } => {
        try {
          const parsed = JSON.parse(jsonString);
          return { isValid: true, parsed };
        } catch (err) {
          return {
            isValid: false,
            error: err instanceof Error ? err.message : "Invalid JSON format",
          };
        }
      },
    ),

    validateBusinessRules: jest.fn(
      async (data: any, context: string): Promise<ValidationResult> => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Mock business rule validation based on context
        switch (context) {
          case "user_registration":
            if (data.email && data.email.includes("+")) {
              warnings.push("Email contains plus addressing");
            }
            if (data.username && data.username.length < 3) {
              errors.push("Username must be at least 3 characters long");
            }
            break;

          case "financial_transaction":
            if (data.amount && data.amount > 10000) {
              warnings.push(
                "Large transaction amount requires additional verification",
              );
            }
            if (data.amount && data.amount < 0.01) {
              errors.push("Transaction amount must be at least $0.01");
            }
            break;

          case "content_moderation": {
            const inappropriateWords = ["spam", "scam", "fraud"];
            if (
              data.content &&
              inappropriateWords.some((word) =>
                data.content.toLowerCase().includes(word),
              )
            ) {
              warnings.push("Content may require manual review");
            }
            break;
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
    ),
  };
};

// Default mock instance
export const validationServiceMock = createValidationServiceMock();

// Mock validation service factory with configurable behavior
export const createMockValidationService = (
  options: {
    strictMode?: boolean;
    allowHtml?: boolean;
    customRules?: ValidationRule[];
    failureRate?: number;
  } = {},
) => {
  const {
    strictMode = MockConfig.validation.strictMode,
    allowHtml: _allowHtml = MockConfig.validation.allowHtml,
    customRules = [],
    failureRate = 0,
  } = options;

  const mock = createValidationServiceMock();

  // Override configuration
  if (!strictMode) {
    mock.sanitizeInput = jest.fn((input: string) => input);
  }

  // Add custom rules to validation
  if (customRules.length > 0) {
    const originalValidate = mock.validate;
    mock.validate = jest.fn(async (data: any, rules: ValidationRule[]) => {
      const allRules = [...rules, ...customRules];
      return originalValidate(data, allRules);
    });
  }

  // Simulate random failures if configured
  if (failureRate > 0) {
    const originalValidate = mock.validate;
    mock.validate = jest.fn(async (...args) => {
      if (Math.random() < failureRate) {
        throw new Error("Validation service temporarily unavailable");
      }
      return originalValidate(...args);
    });
  }

  return mock;
};

// Utility functions for validation testing
export const ValidationTestUtils = {
  /**
   * Create test validation rules
   */
  createTestRules: (fields: string[]): ValidationRule[] => {
    return fields.map((field) => ({
      field,
      required: true,
      type: "string" as const,
      minLength: 1,
      maxLength: MockConfig.validation.maxInputLength,
    }));
  },

  /**
   * Create test data that should pass validation
   */
  createValidTestData: (): any => {
    return {
      email: "test@example.com",
      username: "testuser123",
      password: "SecurePass123!",
      age: 25,
      isActive: true,
      website: "https://example.com",
    };
  },

  /**
   * Create test data that should fail validation
   */
  createInvalidTestData: (): any => {
    return {
      email: "invalid-email",
      username: "ab", // too short
      password: "123", // too weak
      age: "not-a-number",
      isActive: "not-a-boolean",
      website: "invalid-url",
    };
  },
};
