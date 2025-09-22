/**
 * Test Setup Configuration
 *
 * Global test setup for the security integration testing framework
 */

// Extend Jest timeout for long-running security tests
jest.setTimeout(300000); // 5 minutes

// Global test configuration
global.console = {
  ...console,
  // Suppress console logs during tests unless debugging
  log: process.env.DEBUG ? console.log : jest.fn(),
  debug: process.env.DEBUG ? console.debug : jest.fn(),
  info: process.env.DEBUG ? console.info : jest.fn(),
  warn: console.warn,
  error: console.error,
};

// Global setup for security tests
beforeAll(async () => {
  // Initialize test environment
  process.env.NODE_ENV = 'test';
  process.env.SECURITY_TEST_MODE = 'true';
});

afterAll(async () => {
  // Cleanup after all tests
  delete process.env.SECURITY_TEST_MODE;
});