/**
 * CORS & Security Middleware Tests - Comprehensive Security Validation
 *
 * This test suite validates CORS policies, security headers, and origin validation
 * across different environments and attack scenarios.
 *
 * @fileoverview Comprehensive security middleware test suite
 * @version 1.0.0
 * @author Security Testing Specialist
 */

import {
  createHelmetConfig,
  createCorsConfig,
  validateCorsOrigin,
  getSecurityConfig,
  SECURITY_PRESETS,
} from "../src/middleware/cors-security.middleware";

import {
  getEnvironmentConfig,
  getServiceOrigins,
  validateOriginPattern,
  calculateCorsRiskScore,
  DEVELOPMENT_CONFIG,
} from "../src/config/cors-security.config";

// Mock console methods for testing
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe("CORS & Security Middleware", () => {
  describe("Environment Configuration", () => {
    test("should return development config for development environment", () => {
      const config = getEnvironmentConfig("development");
      expect(config.environment).toBe("development");
      expect(config.security.enforceHTTPS).toBe(false);
      expect(config.security.strictOriginValidation).toBe(false);
      expect(config.allowedOrigins).toContain("http://localhost:3000");
    });

    test("should return production config for production environment", () => {
      const config = getEnvironmentConfig("production");
      expect(config.environment).toBe("production");
      expect(config.security.enforceHTTPS).toBe(true);
      expect(config.security.strictOriginValidation).toBe(true);
      expect(config.allowedOrigins).toContain("https://bytebot.ai");
    });

    test("should default to development for unknown environment", () => {
      const config = getEnvironmentConfig("unknown");
      expect(config.environment).toBe("development");
    });
  });

  describe("Helmet Security Configuration", () => {
    test("should create secure helmet config for production", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");
      const helmetConfig = createHelmetConfig(config);

      expect(helmetConfig).toBeDefined();
      if (helmetConfig) {
        expect(helmetConfig.contentSecurityPolicy).toBeDefined();
        expect(helmetConfig.hsts).toBeDefined();
        expect(helmetConfig.hidePoweredBy).toBe(true);
        expect(helmetConfig.noSniff).toBe(true);
        expect(helmetConfig.xssFilter).toBe(true);
      }
    });

    test("should allow unsafe-inline for Swagger in development", () => {
      const config = getSecurityConfig("Bytebot-Agent", "development", {
        enableSwagger: true,
      });
      const helmetConfig = createHelmetConfig(config);

      expect(helmetConfig).toBeDefined();
      if (helmetConfig) {
        const csp = helmetConfig.contentSecurityPolicy as any;
        expect(csp.directives.scriptSrc).toContain("'unsafe-inline'");
        expect(csp.reportOnly).toBe(true);
      }
    });

    test("should configure VNC-specific directives for BytebotD", () => {
      const config = getSecurityConfig("BytebotD", "development");
      const helmetConfig = createHelmetConfig(config);

      expect(helmetConfig).toBeDefined();
      if (helmetConfig) {
        const csp = helmetConfig.contentSecurityPolicy as any;
        expect(csp.directives.frameSrc).not.toEqual(["'none'"]);
        expect((helmetConfig.frameguard as { action?: string })?.action).toBe(
          "sameorigin",
        );
      }
    });

    test("should enable HSTS only in production", () => {
      const devConfig = getSecurityConfig("Bytebot-Agent", "development");
      const prodConfig = getSecurityConfig("Bytebot-Agent", "production");

      const devHelmet = createHelmetConfig(devConfig);
      const prodHelmet = createHelmetConfig(prodConfig);

      expect(devHelmet).toBeDefined();
      expect(prodHelmet).toBeDefined();
      if (devHelmet && prodHelmet) {
        expect(devHelmet.hsts).toBe(false);
        expect(prodHelmet.hsts).toBeDefined();
        expect((prodHelmet.hsts as { maxAge?: number })?.maxAge).toBe(31536000);
      }
    });
  });

  describe("CORS Configuration", () => {
    test("should allow localhost origins in development", () => {
      const config = getSecurityConfig("Bytebot-Agent", "development");
      const corsConfig = createCorsConfig(config);

      const testOrigin = "http://localhost:3000";
      const mockCallback = jest.fn();

      if (corsConfig.origin && typeof corsConfig.origin === "function") {
        corsConfig.origin(testOrigin, mockCallback);
      }

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    test("should block unauthorized origins in production", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");
      const corsConfig = createCorsConfig(config);

      const testOrigin = "http://malicious-site.com";
      const mockCallback = jest.fn();

      if (corsConfig.origin && typeof corsConfig.origin === "function") {
        corsConfig.origin(testOrigin, mockCallback);
      }

      expect(mockCallback).toHaveBeenCalledWith(expect.any(Error), false);
    });

    test("should allow bytebot.ai subdomains in production", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");
      const corsConfig = createCorsConfig(config);

      const testOrigin = "https://api.bytebot.ai";
      const mockCallback = jest.fn();

      if (corsConfig.origin && typeof corsConfig.origin === "function") {
        corsConfig.origin(testOrigin, mockCallback);
      }

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    test("should allow requests with no origin", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");
      const corsConfig = createCorsConfig(config);

      const mockCallback = jest.fn();

      if (corsConfig.origin && typeof corsConfig.origin === "function") {
        corsConfig.origin(undefined, mockCallback);
      }

      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    test("should have correct CORS headers configuration", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");
      const corsConfig = createCorsConfig(config);

      expect(corsConfig.methods).toContain("GET");
      expect(corsConfig.methods).toContain("POST");
      expect(corsConfig.methods).toContain("OPTIONS");
      expect(corsConfig.allowedHeaders).toContain("Authorization");
      expect(corsConfig.allowedHeaders).toContain("Content-Type");
      expect(corsConfig.exposedHeaders).toContain("X-Request-ID");
      expect(corsConfig.credentials).toBe(true);
    });

    test("should have different maxAge for development vs production", () => {
      const devConfig = getSecurityConfig("Bytebot-Agent", "development");
      const prodConfig = getSecurityConfig("Bytebot-Agent", "production");

      const devCors = createCorsConfig(devConfig);
      const prodCors = createCorsConfig(prodConfig);

      expect(devCors.maxAge).toBe(3600); // 1 hour
      expect(prodCors.maxAge).toBe(86400); // 24 hours
    });
  });

  describe("Origin Validation", () => {
    test("should validate development origins correctly", () => {
      const result = validateOriginPattern(
        "http://localhost:3000",
        "development",
      );
      expect(result.valid).toBe(true);
      expect(result.reason).toContain("development pattern");
    });

    test("should validate production origins correctly", () => {
      const result = validateOriginPattern(
        "https://app.bytebot.ai",
        "production",
      );
      expect(result.valid).toBe(true);
      expect(result.reason).toContain("production pattern");
    });

    test("should reject invalid origins", () => {
      const result = validateOriginPattern(
        "http://malicious.com",
        "production",
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("does not match");
    });

    test("should handle missing origin", () => {
      const result = validateOriginPattern("", "production");
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("No origin provided");
    });
  });

  describe("Security Risk Scoring", () => {
    test("should assign higher risk scores to suspicious origins", () => {
      const legitimateScore = calculateCorsRiskScore(
        "https://app.bytebot.ai",
        "production",
      );
      const ipScore = calculateCorsRiskScore(
        "http://192.168.1.1",
        "production",
      );
      const localhostProdScore = calculateCorsRiskScore(
        "http://localhost:3000",
        "production",
      );

      expect(ipScore).toBeGreaterThan(legitimateScore);
      expect(localhostProdScore).toBeGreaterThan(legitimateScore);
    });

    test("should consider request patterns in risk calculation", () => {
      const singleRequestScore = calculateCorsRiskScore(
        "http://suspicious.com",
        "production",
        { requestCount: 1 },
      );

      const repeatedRequestScore = calculateCorsRiskScore(
        "http://suspicious.com",
        "production",
        { requestCount: 15 },
      );

      expect(repeatedRequestScore).toBeGreaterThan(singleRequestScore);
    });

    test("should assign higher risk in production environment", () => {
      const devScore = calculateCorsRiskScore(
        "http://unknown.com",
        "development",
      );
      const prodScore = calculateCorsRiskScore(
        "http://unknown.com",
        "production",
      );

      expect(prodScore).toBeGreaterThan(devScore);
    });

    test("should penalize non-HTTPS origins in production", () => {
      const httpScore = calculateCorsRiskScore(
        "http://example.com",
        "production",
      );
      const httpsScore = calculateCorsRiskScore(
        "https://example.com",
        "production",
      );

      expect(httpScore).toBeGreaterThan(httpsScore);
    });
  });

  describe("Service-Specific Origins", () => {
    test("should return service-specific origins for BytebotD", () => {
      const origins = getServiceOrigins("BytebotD", "development");
      expect(origins.length).toBeGreaterThan(
        DEVELOPMENT_CONFIG.allowedOrigins.length,
      );
    });

    test("should include base environment origins", () => {
      const origins = getServiceOrigins("Bytebot-Agent", "development");
      expect(origins).toContain("http://localhost:3000");
    });

    test("should handle unknown service names gracefully", () => {
      const origins = getServiceOrigins("Unknown-Service", "development");
      expect(origins).toEqual(DEVELOPMENT_CONFIG.allowedOrigins);
    });
  });

  describe("Security Presets", () => {
    test("should have correct presets for each service", () => {
      expect(SECURITY_PRESETS["Bytebot-Agent"].enableSwagger).toBe(true);
      expect(SECURITY_PRESETS["Bytebot-Agent"].enableVNC).toBe(false);

      expect(SECURITY_PRESETS["BytebotD"].enableSwagger).toBe(false);
      expect(SECURITY_PRESETS["BytebotD"].enableVNC).toBe(true);

      expect(SECURITY_PRESETS["Bytebot-UI"].enableVNC).toBe(true);
    });

    test("should generate complete security config with overrides", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production", {
        enableSwagger: false,
        customOrigins: ["https://custom.domain.com"],
      });

      expect(config.serviceName).toBe("Bytebot-Agent");
      expect(config.environment).toBe("production");
      expect(config.enableSwagger).toBe(false); // Override applied
      expect(config.customOrigins).toContain("https://custom.domain.com");
    });
  });

  describe("Security Event Logging", () => {
    beforeEach(() => {
      console.log = mockConsole.log;
      console.warn = mockConsole.warn;
      console.error = mockConsole.error;
    });

    test("should log CORS violations with proper event structure", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");
      const corsConfig = createCorsConfig(config);

      const mockCallback = jest.fn();
      if (corsConfig.origin && typeof corsConfig.origin === "function") {
        corsConfig.origin("http://malicious.com", mockCallback);
      }

      expect(mockConsole.error).toHaveBeenCalledWith(
        "CORS Security - Blocked unauthorized origin:",
        expect.objectContaining({
          origin: "http://malicious.com",
          environment: "production",
          serviceName: "Bytebot-Agent",
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("should handle null/undefined origins gracefully", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");
      const validation = validateCorsOrigin("", config);

      expect(validation.allowed).toBe(true);
      expect(validation.reason).toBe("No origin header");
      expect(validation.riskScore).toBe(0);
    });

    test("should handle malformed origins", () => {
      const result = validateOriginPattern("not-a-valid-url", "production");
      expect(result.valid).toBe(false);
    });

    test("should handle extremely long origins", () => {
      const longOrigin = "https://" + "a".repeat(1000) + ".com";
      const validation = validateCorsOrigin(
        longOrigin,
        getSecurityConfig("test", "production"),
      );

      expect(validation.allowed).toBe(false);
    });
  });

  describe("Performance Considerations", () => {
    test("should validate origins efficiently", () => {
      const config = getSecurityConfig("Bytebot-Agent", "production");

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        validateCorsOrigin("https://app.bytebot.ai", config);
      }
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete in <100ms
    });
  });
});

describe("Integration Tests", () => {
  test("should work with real Express app middleware", () => {
    // This would typically be an integration test with a real Express app
    // For now, we'll test that the configuration objects are properly structured

    const config = getSecurityConfig("Bytebot-Agent", "production");
    const helmetConfig = createHelmetConfig(config);
    const corsConfig = createCorsConfig(config);

    expect(typeof helmetConfig).toBe("object");
    expect(typeof corsConfig).toBe("object");
    expect(typeof corsConfig.origin).toBe("function");
  });
});
