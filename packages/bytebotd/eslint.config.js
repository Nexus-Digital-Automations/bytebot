/**
 * ESLint Configuration for BytebotD
 * Proper TypeScript and JavaScript configuration with correct parsers
 */

const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');

module.exports = [
  // Skip problematic files and directories
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'benchmarks/**',
      '**/*.js.map',
      '**/*.d.ts.map',
      'test_shared_exports.js',
      'root/**',
      'logs/**',
    ],
  },
  // Base JavaScript configuration
  js.configs.recommended,
  // TypeScript configuration
  {
    files: ['src/**/*.ts', 'test/**/*.ts', 'e2e/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        NodeJS: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',

        // Jest globals for all test files
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        fail: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Disable base JS no-unused-vars in favor of TypeScript version
      'no-unused-vars': 'off',

      // Relaxed TypeScript rules for better performance
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ], // Enabled for cleanup with underscore prefix ignore

      // General code quality
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'off',
      'no-debugger': 'error',

      // Import/export rules
      'no-duplicate-imports': 'error',
    },
  },
  {
    // Configuration for JavaScript files (only config files and scripts)
    files: ['*.js', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        // Node.js globals for JS files
        process: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
