/**
 * ESLint Configuration for Orchestrator Package
 * =============================================
 *
 * Comprehensive TypeScript ESLint configuration with proper rule configuration
 * to avoid compatibility issues and configuration errors.
 */

module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es6: true,
    es2020: true,
  },
  globals: {
    // Explicitly define Node.js globals to prevent no-undef errors
    process: 'readonly',
    Buffer: 'readonly',
    console: 'readonly',
    global: 'readonly',
    setInterval: 'readonly',
    setTimeout: 'readonly',
    clearInterval: 'readonly',
    clearTimeout: 'readonly',
    NodeJS: 'readonly',
  },
  rules: {
    // Basic JavaScript rules
    'prefer-const': 'error',
    'no-var': 'error',
    'no-console': 'off', // Allow console for NestJS logging
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    
    // TypeScript rules with proper configuration
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off', // Too strict for NestJS
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Too strict for NestJS
    
    // Properly configure no-unused-expressions with required options to prevent TypeError
    'no-unused-expressions': 'off', // Disable base rule
    '@typescript-eslint/no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
        enforceForJSX: false,
      },
    ],
    '@typescript-eslint/no-empty-function': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.js',
    '*.mjs',
    '*.d.ts',
    'jest.config.*',
  ],
};