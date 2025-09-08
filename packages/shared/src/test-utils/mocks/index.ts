/**
 * Security Mock Service Registry - Shared Package
 *
 * Central registry for all security-focused testing mocks including:
 * - Security middleware components
 * - Encryption/decryption services
 * - Input validation systems
 * - Rate limiting mechanisms
 * - Audit logging systems
 * - Authentication providers
 *
 * @author Claude Code
 * @version 2.0.0
 */

// Export all mock services
export * from "./security-middleware.mock";
export * from "./encryption-service.mock";
export * from "./validation-service.mock";
export * from "./rate-limiter.mock";
export * from "./audit-logger.mock";
export * from "./auth-provider.mock";
export * from "./vulnerability-scanner.mock";

// Mock service registry for easy access
export const MockRegistry = {
  SecurityMiddleware: () => import("./security-middleware.mock"),
  EncryptionService: () => import("./encryption-service.mock"),
  ValidationService: () => import("./validation-service.mock"),
  RateLimiter: () => import("./rate-limiter.mock"),
  AuditLogger: () => import("./audit-logger.mock"),
  AuthProvider: () => import("./auth-provider.mock"),
  VulnerabilityScanner: () => import("./vulnerability-scanner.mock"),
};

// Re-export mock configuration from dedicated config file
export { MockConfig, configureMocks, resetMockConfig } from "./mock-config";

// Utility function to reset all mocks
export const resetAllMocks = (): void => {
  jest.clearAllMocks();
  jest.resetAllMocks();
  jest.restoreAllMocks();
};
