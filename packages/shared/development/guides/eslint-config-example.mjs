// @ts-check
/**
 * Enhanced ESLint Configuration for Bytebot Shared Package
 *
 * This configuration demonstrates the architectural preservation strategy
 * for comprehensive security framework enums while maintaining strict
 * enforcement for implementation code.
 *
 * Configuration Strategy:
 * 1. Comprehensive enum files: Suppress unused-vars for architectural preservation
 * 2. Implementation files: Strict enforcement of all ESLint rules
 * 3. Test files: Balanced approach with test-specific allowances
 *
 * Based on: eslint-enum-preservation-guide.md
 */

import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore files that don't need linting
  {
    ignores: [
      "eslint.config.mjs",
      "dist/",
      "node_modules/",
      "coverage/",
      "*.config.js",
    ],
  },

  // Base configuration for all files
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,

  // Global language options
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 5,
      sourceType: "module",
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // =====================================
  // ARCHITECTURAL PRESERVATION STRATEGY
  // =====================================

  // Comprehensive Security Framework Type Files
  // These files contain intentionally "unused" enum values for enterprise completeness
  {
    name: "architectural-preservation-comprehensive",
    files: [
      "src/types/security.types.ts",
      "src/audit/types/audit-event.types.ts",
      "src/types/rbac.types.ts",
      "src/config/environment-security.config.ts",
    ],
    rules: {
      // Complete suppression for architectural enums - INTENTIONAL DESIGN DECISION
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",

      // Maintain type safety for interfaces and implementation code
      "@typescript-eslint/no-explicit-any": [
        "error",
        {
          ignoreRestArgs: true,
          fixToUnknown: false,
          // Allow 'any' in metadata fields for enterprise flexibility
          ignoreProperties: ["metadata", "context", "custom"],
        },
      ],

      // Allow comprehensive interface definitions for enterprise APIs
      "@typescript-eslint/no-empty-interface": "off",

      // Require comprehensive documentation for architectural decisions
      "require-jsdoc": [
        "warn",
        {
          require: {
            FunctionDeclaration: true,
            ClassDeclaration: true,
            ArrowFunctionExpression: false,
          },
        },
      ],

      // Maintain other strict type checking
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-return": "error",
    },
  },

  // Mixed Strategy Files (Selective Suppression)
  // Files with both comprehensive enums and implementation code
  {
    name: "architectural-preservation-selective",
    files: ["src/types/agent.types.ts", "src/types/messageContent.types.ts"],
    rules: {
      // Pattern-based suppression for comprehensive coverage
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          // Ignore comprehensive enum and interface patterns
          varsIgnorePattern:
            "^(Security|Audit|Compliance|RBAC|Enterprise|Framework)",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern:
            "^(SECURITY_|AUDIT_|COMPLIANCE_|RBAC_|ENTERPRISE_)",
        },
      ],
    },
  },

  // =====================================
  // STRICT IMPLEMENTATION ENFORCEMENT
  // =====================================

  // Service Implementation Files
  // Full ESLint enforcement for business logic and implementation
  {
    name: "strict-implementation-services",
    files: [
      "src/services/**/*.ts",
      "src/middleware/**/*.ts",
      "src/guards/**/*.ts",
      "src/decorators/**/*.ts",
      "src/pipes/**/*.ts",
      "src/interceptors/**/*.ts",
    ],
    rules: {
      // Maximum strictness for implementation code
      "@typescript-eslint/no-unused-vars": "error",
      "no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",

      // Function and class strictness
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",

      // Type safety enforcement
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      // Code quality rules
      "@typescript-eslint/prefer-readonly": "error",
      "@typescript-eslint/prefer-readonly-parameter-types": "warn",
      "@typescript-eslint/no-floating-promises": "error",

      // Import and export quality
      "@typescript-eslint/consistent-type-exports": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },

  // Utility Files (Balanced Enforcement)
  {
    name: "balanced-utilities",
    files: ["src/utils/**/*.ts", "src/config/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn", // More lenient for utilities
      "@typescript-eslint/explicit-function-return-type": "warn",
    },
  },

  // =====================================
  // TEST CONFIGURATION
  // =====================================

  // Test Files Configuration
  {
    name: "test-files-configuration",
    files: [
      "**/*.test.ts",
      "**/*.spec.ts",
      "__tests__/**/*.ts",
      "src/test-utils/**/*.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Test-friendly unused variable rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern:
            "^(mock|stub|fixture|test|spy|jest|expect|describe|it|beforeEach|afterEach)",
        },
      ],

      // Allow flexibility in test files
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",

      // Test-specific allowances
      "@typescript-eslint/no-empty-function": "off", // Mock functions can be empty
      "@typescript-eslint/no-non-null-assertion": "off", // Tests can assert non-null

      // Maintain some strictness in tests
      "@typescript-eslint/no-floating-promises": "error",
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^(mock|stub|fixture|test)",
        },
      ],
    },
  },

  // =====================================
  // SPECIALIZED CONFIGURATIONS
  // =====================================

  // Configuration for specific problematic test files
  {
    name: "specific-test-file-overrides",
    files: [
      "src/utils/__tests__/messageContent.utils.test.ts",
      "src/utils/__tests__/security.utils.test.ts",
      "src/decorators/__tests__/rbac-authorization.decorators.test.ts",
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 5,
      sourceType: "module",
      parserOptions: {
        projectService: {
          allowDefaultProject: [
            "src/utils/__tests__/messageContent.utils.test.ts",
            "src/utils/__tests__/security.utils.test.ts",
            "src/decorators/__tests__/rbac-authorization.decorators.test.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Index Files (Export-only files)
  {
    name: "index-files-exports",
    files: ["src/index*.ts", "**/index.ts"],
    rules: {
      // Allow re-exports that might appear unused
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",

      // Ensure proper export practices
      "@typescript-eslint/consistent-type-exports": "error",
    },
  },

  // =====================================
  // GLOBAL RULE ENFORCEMENT
  // =====================================

  // Global rules applied to all files (unless overridden above)
  {
    name: "global-rules",
    rules: {
      // Core quality rules
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-unused-vars": "error",

      // JavaScript rules
      "no-unused-vars": "error",
      "no-useless-escape": "error",
      "no-control-regex": "error",

      // Import rules for better organization
      "sort-imports": [
        "error",
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
        },
      ],
    },
  },
);
