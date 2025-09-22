module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/tests/**/*.test.ts',
    '**/*.spec.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/tests/**',
    '!src/cli/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  testTimeout: 30000,
  maxConcurrency: 5,
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/core/(.*)$': '<rootDir>/src/core/$1',
    '^@/generators/(.*)$': '<rootDir>/src/generators/$1',
    '^@/runners/(.*)$': '<rootDir>/src/runners/$1',
    '^@/validators/(.*)$': '<rootDir>/src/validators/$1',
    '^@/data/(.*)$': '<rootDir>/src/data/$1',
    '^@/reporting/(.*)$': '<rootDir>/src/reporting/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1'
  },
  globals: {
    'ts-jest': {
      useESM: false,
      tsconfig: {
        target: 'ES2022',
        module: 'commonjs'
      }
    }
  }
};