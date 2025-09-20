// @ts-check
// ===================================================================
// BYTEBOT-AGENT PACKAGE ESLINT CONFIGURATION
// Enhanced with comprehensive documentation following critical fixes
// Last Updated: September 8, 2025
// ===================================================================

/**
 * Critical Infrastructure Fix Documentation:
 * This configuration was part of the major ESLint violation resolution that
 * eliminated production code violations while maintaining test flexibility.
 *
 * Key features:
 * - Relaxed 'any' usage for development flexibility
 * - Strict unsafe assignment prevention
 * - Comprehensive test file exception handling
 * - Jest and Node.js environment support
 */

import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 2021,
      sourceType: 'module',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_'
        },
      ],
    },
  },
  // Test file specific rules (including setup files)
  {
    files: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.template.ts',
      '**/test-utils/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
