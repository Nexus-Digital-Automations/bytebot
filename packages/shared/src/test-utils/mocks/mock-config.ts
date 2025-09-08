/**
 * Mock Configuration - Shared Test Configuration for Security Mocks
 *
 * Centralized configuration for all mock services to ensure consistent
 * behavior across testing environments and prevent circular dependencies.
 *
 * @author Claude Code
 * @version 2.0.0
 */

// Mock configuration for consistent behavior across tests
export const MockConfig = {
  security: {
    enableStrictValidation: true,
    logSecurityEvents: false, // Disabled in tests to avoid noise
    simulateLatency: false,
    failureRate: 0, // 0% failure rate by default
  },
  encryption: {
    algorithm: "aes-256-gcm" as const,
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
  validation: {
    maxInputLength: 10000,
    allowHtml: false,
    strictMode: true,
  },
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    skipSuccessfulRequests: false,
  },
  audit: {
    logLevel: "info" as const,
    includeStackTrace: false,
    maxLogSize: 1000,
  },
};

// Utility function to configure mock behavior
export const configureMocks = (config: Partial<typeof MockConfig>): void => {
  Object.assign(MockConfig, config);
};

// Utility function to reset mock configuration to defaults
export const resetMockConfig = (): void => {
  Object.assign(MockConfig, {
    security: {
      enableStrictValidation: true,
      logSecurityEvents: false,
      simulateLatency: false,
      failureRate: 0,
    },
    encryption: {
      algorithm: "aes-256-gcm",
      keyLength: 32,
      ivLength: 16,
      tagLength: 16,
    },
    validation: {
      maxInputLength: 10000,
      allowHtml: false,
      strictMode: true,
    },
    rateLimit: {
      windowMs: 60000,
      maxRequests: 100,
      skipSuccessfulRequests: false,
    },
    audit: {
      logLevel: "info",
      includeStackTrace: false,
      maxLogSize: 1000,
    },
  });
};
