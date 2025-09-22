/**
 * Test Setup - Global test configuration and setup
 * Configures Jest environment for integration testing
 */

import 'reflect-metadata';

// Global test timeout
jest.setTimeout(300000); // 5 minutes

// Global test setup
beforeAll(async () => {
  // Global setup logic
  console.log('Integration Testing Framework - Global Setup');
});

// Global test teardown
afterAll(async () => {
  // Global teardown logic
  console.log('Integration Testing Framework - Global Teardown');
});

// Configure console logging for tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args: any[]) => {
  // Filter out known non-critical errors during testing
  const message = args.join(' ');
  if (message.includes('Warning:') || message.includes('ExperimentalWarning:')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.warn = (...args: any[]) => {
  // Filter out known non-critical warnings during testing
  const message = args.join(' ');
  if (message.includes('DeprecationWarning:')) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};