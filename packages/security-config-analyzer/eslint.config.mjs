// @ts-check
// ===================================================================
// SECURITY CONFIG ANALYZER PACKAGE ESLINT CONFIGURATION
// ESLint v9.0+ flat configuration for security analysis tools
// Created: September 9, 2025
// ===================================================================

/**
 * Security-focused ESLint configuration for the security config analyzer package.
 * This configuration ensures high code quality and security standards for
 * critical security analysis tools including Docker, database, and service scanners.
 *
 * Features:
 * - Strict TypeScript type checking for security code
 * - Node.js environment configuration
 * - Security-focused linting rules
 * - Proper handling of test and utility files
 */

import eslint from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "eslint.config.mjs",
      "dist/",
      "coverage/",
      "node_modules/",
      "**/*.js",
      "*.config.js",
      "post-tool-linter-hook.log",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs", "*.js"],
          defaultProject: "./tsconfig.json",
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 10,
        },
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: false,
        },
      },
    },
  },
  {
    rules: {
      // Security package should have strict type checking
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",

      // Security-focused rules
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",

      // Unused variables - maintain strictness for security code
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Async handling rules
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // Fix no-unused-expressions rule configuration
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          allowShortCircuit: false,
          allowTernary: false,
        },
      ],

      // Additional security-focused rules
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // Disable problematic rules that cause internal ESLint errors
      "@typescript-eslint/only-throw-error": "off",
    },
  },

  // Special rules for TypeScript enum files
  {
    files: ["**/types/**/*.ts", "src/types/index.ts"],
    rules: {
      // Disable no-unused-vars for enum members - they are used via namespace access
      // which ESLint cannot detect properly
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
    },
  },

  // Special rules for test files
  {
    files: [
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/__tests__/**/*.ts",
      "**/test-utils/**/*.ts",
      "**/*.mock.ts",
    ],
    rules: {
      // Relax some rules for test files while maintaining security
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",

      // Allow unused variables in tests for mocks
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",

      // Allow floating promises in tests
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
);
