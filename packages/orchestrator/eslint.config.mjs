/**
 * ESLint Flat Configuration for Orchestrator Package
 * ==================================================
 *
 * ESLint v9.0+ flat configuration that resolves compatibility issues
 * with @typescript-eslint/no-unused-expressions rule.
 */

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Apply to TypeScript files only
    files: ["src/**/*.ts"],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Basic TypeScript ESLint configuration (without type checking)
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        // Disable type checking to avoid compatibility issues
        project: false,
      },
      globals: {
        // Node.js globals
        process: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        global: "readonly",
        NodeJS: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // JavaScript rules
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "off", // Allow console for NestJS logging
      "eqeqeq": ["error", "always"],
      "no-unused-vars": "off", // Disable base rule

      // TypeScript rules - only stable ones that work without type checking
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // Explicitly disable problematic rules
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },

  // Global ignore patterns
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "*.js",
      "*.mjs",
      "*.d.ts",
      "jest.config.*",
    ],
  },
);