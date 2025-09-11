/**
 * ESLint v9 Enterprise-Grade Configuration for bytebot-ui
 *
 * This configuration implements strict TypeScript rules, React performance optimizations,
 * security-focused linting, and comprehensive code quality standards for production applications.
 *
 * Key Features:
 * - Strict TypeScript safety with @typescript-eslint/strict
 * - React Hook linting for optimal performance and correctness
 * - Security-focused rules for production readiness
 * - Import/export organization and consistency
 * - Next.js specific optimizations and performance rules
 * - Accessibility (a11y) enforcement for inclusive design
 * - Comprehensive error handling and type safety
 *
 * @author ESLint Configuration Specialist
 * @version 3.0.0 - Enterprise Grade with React Hooks & Next.js
 */
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

export default tseslint.config(
  // Global ignore patterns - exclude build and generated files
  {
    ignores: [
      ".next/**/*", // Next.js build output
      "node_modules/**/*", // Node modules
      "dist/**/*", // Distribution/build directories
      "build/**/*", // Build directories
      "coverage/**/*", // Test coverage reports
      ".nyc_output/**/*", // NYC test coverage
      "public/sw.js", // Service worker files
      "public/workbox-*.js", // Workbox files
      "**/*.min.js", // Minified JavaScript files
      "**/*.bundle.js", // Bundle files
      "**/*.map", // Source map files
      ".env*", // Environment files
      "*.config.js", // Configuration files (when needed)
      ".eslintrc*", // Legacy ESLint config files
      "tailwind.config.js", // Tailwind config (if needed)
      "next.config.js", // Next.js config (if needed)
    ],
  },

  // Base configurations - foundational rules
  eslint.configs.recommended,

  // TypeScript strict configuration for maximum type safety
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // React plugin configuration
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
    rules: {
      // ===== REACT HOOK RULES - PERFORMANCE & CORRECTNESS =====
      "react-hooks/rules-of-hooks": "error", // Enforce rules of hooks
      "react-hooks/exhaustive-deps": "warn", // Verify the list of dependencies for Hooks

      // ===== REACT COMPONENT RULES =====
      "react/prop-types": "off", // Disable prop-types (using TypeScript instead)
      "react/react-in-jsx-scope": "off", // Not needed with React 17+ JSX transform
      "react/jsx-uses-react": "off", // Not needed with React 17+ JSX transform
      "react/jsx-uses-vars": "error", // Prevent variables used in JSX to be marked as unused
      "react/jsx-no-duplicate-props": "error", // Prevent duplicate properties in JSX
      "react/jsx-no-undef": "error", // Disallow undeclared variables in JSX
      "react/jsx-pascal-case": "error", // Enforce PascalCase for user-defined JSX components
      "react/no-danger": "warn", // Prevent usage of dangerous JSX properties
      "react/no-deprecated": "error", // Prevent usage of deprecated methods
      "react/no-direct-mutation-state": "error", // Prevent direct mutation of this.state
      "react/no-find-dom-node": "error", // Prevent usage of findDOMNode
      "react/no-render-return-value": "error", // Prevent usage of the return value of React.render
      "react/no-string-refs": "error", // Prevent using string references
      "react/no-unescaped-entities": "error", // Prevent invalid characters from appearing in markup
      "react/no-unknown-property": "error", // Prevent usage of unknown DOM property
      "react/require-render-return": "error", // Enforce ES5 or ES6 class for returning value in render function
      "react/jsx-key": "error", // Detect missing key prop in JSX elements
      "react/jsx-no-comment-textnodes": "error", // Prevent comments from being inserted as text nodes
      "react/jsx-no-target-blank": "error", // Prevent usage of unsafe target='_blank'
      "react/jsx-curly-brace-presence": [
        "warn",
        { props: "never", children: "never" },
      ], // Enforce curly braces or not in JSX props and children

      // ===== ACCESSIBILITY (A11Y) RULES =====
      "jsx-a11y/alt-text": "error", // Enforce img alt attribute
      "jsx-a11y/anchor-has-content": "error", // Enforce anchors to have content
      "jsx-a11y/anchor-is-valid": "warn", // Enforce anchors are valid
      "jsx-a11y/aria-activedescendant-has-tabindex": "error", // Enforce elements with aria-activedescendant have tabindex
      "jsx-a11y/aria-props": "error", // Enforce ARIA properties are valid
      "jsx-a11y/aria-proptypes": "error", // Enforce ARIA property values are valid
      "jsx-a11y/aria-role": "error", // Enforce valid ARIA roles
      "jsx-a11y/aria-unsupported-elements": "error", // Enforce ARIA is not used on unsupported elements
      "jsx-a11y/click-events-have-key-events": "warn", // Enforce click events are accompanied by key events
      "jsx-a11y/heading-has-content": "error", // Enforce heading elements contain accessible content
      "jsx-a11y/img-redundant-alt": "error", // Enforce img alt attribute doesn't contain redundant words
      "jsx-a11y/no-access-key": "warn", // Enforce no accessKey prop on elements
      "jsx-a11y/no-distracting-elements": "error", // Enforce no distracting elements
      "jsx-a11y/no-redundant-roles": "error", // Enforce explicit role property is not the same as implicit role
      "jsx-a11y/role-has-required-aria-props": "error", // Enforce required ARIA properties are provided
      "jsx-a11y/role-supports-aria-props": "error", // Enforce ARIA properties are supported by their role
      "jsx-a11y/scope": "error", // Enforce scope prop is only used on <th> elements
    },
  },

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

      // ===== IMPORT/EXPORT ORGANIZATION & NEXT.JS OPTIMIZATIONS =====
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

      // ===== NEXT.JS SPECIFIC PERFORMANCE RULES =====
      // Prevent usage of <img> tag for better performance optimization
      "jsx-a11y/alt-text": [
        "error",
        {
          elements: ["img", "object", "area", 'input[type="image"]'],
          img: ["Image"],
          object: ["Object"],
          area: ["Area"],
          'input[type="image"]': ["InputImage"],
        },
      ],

      // Encourage use of Next.js optimized components
      "react/no-unknown-property": [
        "error",
        {
          ignore: ["css", "jsx"], // Allow styled-jsx properties
        },
      ],

      // Performance: Prevent large bundles
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lodash",
              message:
                "Import specific lodash functions instead of the entire library for better tree-shaking",
            },
            {
              name: "moment",
              message:
                "Use date-fns instead of moment.js for better performance and smaller bundle size",
            },
          ],
          patterns: [
            {
              group: ["@mui/material/*"],
              message:
                "Import from @mui/material directly for better tree-shaking",
            },
          ],
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

  // Next.js specific configuration
  {
    files: ["src/app/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    rules: {
      // Next.js App Router and Pages Router optimizations
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off", // Using TypeScript instead

      // Enforce Next.js performance best practices
      "jsx-a11y/anchor-is-valid": [
        "error",
        {
          components: ["Link"],
          specialLink: ["hrefLeft", "hrefRight"],
          aspects: ["invalidHref", "preferButton"],
        },
      ],

      // Encourage Next.js Image component usage
      "react/no-unknown-property": [
        "error",
        {
          ignore: ["css", "jsx", "global"], // Next.js styled-jsx support
        },
      ],
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

      // Relax React rules for test files
      "react-hooks/exhaustive-deps": "off", // Tests may have intentional missing deps
      "jsx-a11y/click-events-have-key-events": "off", // Less important in tests
      "jsx-a11y/no-static-element-interactions": "off", // Less important in tests
    },
  },

  // Configuration files - minimal rules
  {
    files: [
      "**/*.config.{js,ts,mjs,cjs}",
      "**/.eslintrc.{js,cjs}",
      "jest.config.{js,ts,cjs}",
      "*.d.ts",
    ],
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/triple-slash-reference": "off",
      "no-undef": "off",
      "no-dupe-keys": "error", // Keep duplicate key detection
    },
  },
);
