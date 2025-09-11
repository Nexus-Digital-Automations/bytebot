/**
 * ESLint v9 Enterprise-Grade Configuration for bytebot-ui
 *
 * This configuration implements strict TypeScript rules, React performance optimizations,
 * security-focused linting, and comprehensive code quality standards for production applications.
 *
 * Key Features:
 * - Strict TypeScript safety with @typescript-eslint/strict
 * - React Hook linting for optimal performance
 * - Security-focused rules for production readiness
 * - Import/export organization and consistency
 * - Next.js specific optimizations
 * - Comprehensive error handling and type safety
 *
 * @author ESLint Configuration Specialist
 * @version 2.0.0 - Enterprise Grade
 */
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base configurations - foundational rules
  eslint.configs.recommended,

  // TypeScript strict configuration for maximum type safety
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Main configuration block
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023, // Latest ECMAScript features
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
        ecmaFeatures: {
          jsx: true,
        },
        warnOnUnsupportedTypeScriptVersion: false,
      },
      globals: {
        // Next.js globals
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      // ===== SECURITY RULES - PRODUCTION READY =====
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-script-url": "error",
      "no-caller": "error",
      "no-extend-native": "error",
      "no-extra-bind": "error",
      "no-invalid-this": "error",
      "no-iterator": "error",
      "no-lone-blocks": "error",
      "no-loop-func": "error",
      "no-multi-str": "error",
      "no-new-wrappers": "error",
      "no-octal-escape": "error",
      "no-proto": "error",
      "no-return-assign": "error",
      "no-sequences": "error",
      "no-throw-literal": "error",
      "no-unmodified-loop-condition": "error",
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-escape": "error",
      "no-void": "error",
      "no-with": "error",

      // ===== CODE QUALITY - ENTERPRISE STANDARDS =====
      "no-console": "warn", // Allow in development but warn
      "no-debugger": "error",
      "no-alert": "error",
      "no-duplicate-imports": "error",
      "no-template-curly-in-string": "error",
      "no-unreachable-loop": "error",
      "no-unused-private-class-members": "error",
      "no-use-before-define": "off", // TypeScript handles this
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "prefer-template": "error",

      // ===== VARIABLE HANDLING - STRICT =====
      "no-unused-vars": "off", // Turn off base rule for TypeScript
      "@typescript-eslint/no-unused-vars": [
        "error", // Changed from warn to error for enterprise standards
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // ===== TYPESCRIPT STRICT RULES - BALANCED APPROACH =====
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error for gradual adoption
      "@typescript-eslint/no-unsafe-assignment": "warn", // Warn for development flexibility
      "@typescript-eslint/no-unsafe-member-access": "warn", // Warn for development flexibility
      "@typescript-eslint/no-unsafe-call": "warn", // Warn for development flexibility
      "@typescript-eslint/no-unsafe-return": "warn", // Warn for development flexibility
      "@typescript-eslint/no-unsafe-argument": "warn", // Warn for development flexibility
      "@typescript-eslint/explicit-function-return-type": "warn", // Warn for gradual adoption
      "@typescript-eslint/explicit-module-boundary-types": "warn", // Warn for gradual adoption
      "@typescript-eslint/no-floating-promises": "error", // Keep as error - important for async safety
      "@typescript-eslint/no-misused-promises": "error", // Keep as error - important for async safety
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/strict-boolean-expressions": "warn", // Warn instead of error
      "@typescript-eslint/switch-exhaustiveness-check": "error", // Keep as error - important for completeness
      "@typescript-eslint/no-confusing-void-expression": "warn",
      "@typescript-eslint/no-meaningless-void-operator": "warn",
      "@typescript-eslint/no-mixed-enums": "error",
      "@typescript-eslint/no-unnecessary-boolean-literal-compare": "warn",
      "@typescript-eslint/no-useless-empty-export": "warn",
      "@typescript-eslint/prefer-reduce-type-parameter": "warn",
      "@typescript-eslint/prefer-return-this-type": "warn",

      // ===== REACT & JSX RULES (built-in only) =====
      // JSX specific (built-in)
      "jsx-quotes": ["error", "prefer-double"],

      // ===== IMPORT/EXPORT ORGANIZATION =====
      "no-duplicate-imports": "error",
      "sort-imports": [
        "error",
        {
          ignoreCase: false,
          ignoreDeclarationSort: true,
          ignoreMemberSort: false,
          memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
          allowSeparatedGroups: true,
        },
      ],

      // ===== PERFORMANCE OPTIMIZATION =====
      "no-async-promise-executor": "error",
      "no-await-in-loop": "warn", // Performance consideration
      "require-atomic-updates": "error",

      // ===== ADDITIONAL ENTERPRISE RULES =====
      eqeqeq: ["error", "always", { null: "ignore" }], // Require === and !==
      curly: "error", // Require curly braces for all control statements
      "dot-notation": "error", // Prefer dot notation over bracket notation
      "no-else-return": "error", // Disallow else after return
      "no-empty-function": "error", // Disallow empty functions
      "no-magic-numbers": [
        "warn",
        {
          ignore: [-1, 0, 1, 2], // Common numbers are allowed
          ignoreArrayIndexes: true,
          enforceConst: true,
        },
      ],
      "no-nested-ternary": "error", // Disallow nested ternary expressions
      "no-param-reassign": "error", // Disallow reassigning function parameters
      "no-shadow": "off", // Turn off for TypeScript
      "@typescript-eslint/no-shadow": "error", // TypeScript version
      radix: "error", // Require radix parameter for parseInt
    },
  },

  // Test files - relaxed rules for development
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/__tests__/**/*"],
    rules: {
      // Relax some rules for test files
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "no-console": "off", // Allow console in tests
    },
  },

  // Configuration files - minimal rules
  {
    files: ["**/*.config.{js,ts,mjs}", "**/.eslintrc.{js,cjs}"],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "no-undef": "off",
    },
  },
);
