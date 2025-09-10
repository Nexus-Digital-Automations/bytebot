/**
 * Security Middleware Mock Implementation
 *
 * Mock implementation for security middleware testing including:
 * - CORS validation
 * - CSP header injection
 * - XSS protection
 * - Security header validation
 * - Request sanitization
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { MockConfig } from "./mock-config";
import type { Request, Response, NextFunction } from "express";

// Jest-agnostic mock function type
type MockFunction<T extends (...args: unknown[]) => unknown> = T & {
  mockImplementation?: (impl: T) => void;
  mockReturnValue?: (value: ReturnType<T>) => void;
  mockResolvedValue?: (value: Awaited<ReturnType<T>>) => void;
  mockClear?: () => void;
  mockReset?: () => void;
  mockRestore?: () => void;
};

// Check if Jest is available
const isJestAvailable = typeof jest !== "undefined";

// Create mock function that works with or without Jest
const createMockFn = <T extends (...args: unknown[]) => unknown>(
  impl: T,
): MockFunction<T> => {
  if (isJestAvailable) {
    return jest.fn(impl) as unknown as MockFunction<T>;
  }

  // Fallback implementation when Jest is not available
  const mockFn = impl as MockFunction<T>;
  mockFn.mockImplementation = () => {};
  mockFn.mockReturnValue = () => {};
  mockFn.mockResolvedValue = () => {};
  mockFn.mockClear = () => {};
  mockFn.mockReset = () => {};
  mockFn.mockRestore = () => {};

  return mockFn;
};

export interface SecurityMiddlewareMock {
  validateCors: MockFunction<(_origin: string, _method: string) => boolean>;
  injectSecurityHeaders: MockFunction<
    (_headers: Record<string, string>) => Record<string, string>
  >;
  sanitizeRequest: MockFunction<(_data: unknown) => unknown>;
  validateContentType: MockFunction<(_contentType: string) => boolean>;
  checkRateLimit: MockFunction<
    (_identifier: string) => Promise<{ allowed: boolean; remaining: number }>
  >;
  generateNonce: MockFunction<() => string>;
  validateCSP: MockFunction<(_policy: string) => boolean>;
  detectXSS: MockFunction<
    (_input: string) => { detected: boolean; threats: string[] }
  >;
}

/**
 * Creates a comprehensive security middleware mock
 */
export const createSecurityMiddlewareMock = (): SecurityMiddlewareMock => {
  return {
    validateCors: createMockFn((origin: string, method: string): boolean => {
      const allowedOrigins = ["http://localhost:3000", "https://bytebot.app"];
      const allowedMethods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"];

      return (
        allowedOrigins.includes(origin) &&
        allowedMethods.includes(method.toUpperCase())
      );
    }),

    injectSecurityHeaders: createMockFn(
      (headers: Record<string, string>): Record<string, string> => {
        const securityHeaders = {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-XSS-Protection": "1; mode=block",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
          "Content-Security-Policy":
            "default-src 'self'; script-src 'self' 'unsafe-inline'",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        };

        return { ...headers, ...securityHeaders };
      },
    ),

    sanitizeRequest: createMockFn((data: unknown): unknown => {
      if (typeof data === "string") {
        return data
          .replace(/<script[^>]*>.*?<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "")
          .replace(/<iframe[^>]*>/gi, "")
          .replace(/<object[^>]*>/gi, "")
          .replace(/<embed[^>]*>/gi, "");
      }

      if (typeof data === "object" && data !== null) {
        const sanitized: Record<string, unknown> | unknown[] = Array.isArray(
          data,
        )
          ? []
          : {};

        for (const [key, value] of Object.entries(data)) {
          sanitized[key] =
            createSecurityMiddlewareMock().sanitizeRequest(value);
        }

        return sanitized;
      }

      return data;
    }),

    validateContentType: createMockFn((contentType: string): boolean => {
      const allowedTypes = [
        "application/json",
        "application/x-www-form-urlencoded",
        "multipart/form-data",
        "text/plain",
      ];

      return allowedTypes.some((type) =>
        contentType.toLowerCase().includes(type),
      );
    }),

    checkRateLimit: createMockFn(
      async (
        _identifier: string,
      ): Promise<{ allowed: boolean; remaining: number }> => {
        // Simulate rate limiting logic
        const requestCount = Math.floor(Math.random() * 100);
        const maxRequests = MockConfig.rateLimit.maxRequests;

        return {
          allowed: requestCount < maxRequests,
          remaining: Math.max(0, maxRequests - requestCount),
        };
      },
    ),

    generateNonce: createMockFn((): string => {
      // Generate a mock nonce for CSP
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let nonce = "";
      for (let i = 0; i < 32; i++) {
        nonce += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return nonce;
    }),

    validateCSP: createMockFn((policy: string): boolean => {
      // Basic CSP validation - check for required directives
      const requiredDirectives = ["default-src", "script-src"];
      const hasRequiredDirectives = requiredDirectives.every((directive) =>
        policy.includes(directive),
      );

      // Check for dangerous directives
      const dangerousPatterns = ["unsafe-eval", "data:", "blob:", "*"];
      const hasDangerousPatterns = dangerousPatterns.some((pattern) =>
        policy.includes(pattern),
      );

      return hasRequiredDirectives && !hasDangerousPatterns;
    }),

    detectXSS: createMockFn(
      (input: string): { detected: boolean; threats: string[] } => {
        const xssPatterns = [
          {
            pattern: /<script[^>]*>.*?<\/script>/gi,
            threat: "script-injection",
          },
          { pattern: /javascript:/gi, threat: "javascript-protocol" },
          { pattern: /on\w+\s*=/gi, threat: "event-handler" },
          { pattern: /<iframe[^>]*>/gi, threat: "iframe-injection" },
          { pattern: /data:text\/html/gi, threat: "data-uri-html" },
          { pattern: /vbscript:/gi, threat: "vbscript-protocol" },
          { pattern: /<object[^>]*>/gi, threat: "object-injection" },
          { pattern: /<embed[^>]*>/gi, threat: "embed-injection" },
        ];

        const detectedThreats: string[] = [];

        for (const { pattern, threat } of xssPatterns) {
          if (pattern.test(input)) {
            detectedThreats.push(threat);
          }
        }

        return {
          detected: detectedThreats.length > 0,
          threats: detectedThreats,
        };
      },
    ),
  };
};

// Default mock instance
export const securityMiddlewareMock = createSecurityMiddlewareMock();

// Mock middleware function factory
export const createMockMiddleware = (
  options: {
    allowCors?: boolean;
    detectXSS?: boolean;
    enforceRateLimit?: boolean;
  } = {},
) => {
  const {
    allowCors = true,
    detectXSS = true,
    enforceRateLimit = true,
  } = options;

  return createMockFn((req: Request, res: Response, next: NextFunction) => {
    const middleware = createSecurityMiddlewareMock();

    // Apply CORS validation
    if (allowCors && req.headers.origin) {
      const corsValid = middleware.validateCors(req.headers.origin, req.method);
      if (!corsValid) {
        res.status(403).json({ error: "CORS violation detected" });
        return;
      }
    }

    // Apply XSS detection
    if (detectXSS && req.body) {
      const xssResult = middleware.detectXSS(JSON.stringify(req.body));
      if (xssResult.detected) {
        res.status(400).json({
          error: "XSS attempt detected",
          threats: xssResult.threats,
        });
        return;
      }
    }

    // Apply rate limiting
    if (enforceRateLimit) {
      const rateLimitCheck = middleware.checkRateLimit(req.ip || "test-ip");
      rateLimitCheck.then((result) => {
        if (!result.allowed) {
          res.status(429).json({
            error: "Rate limit exceeded",
            remaining: result.remaining,
          });
          return;
        }

        // Inject security headers
        const headers = middleware.injectSecurityHeaders(
          res.getHeaders?.() || {},
        );
        Object.entries(headers).forEach(([key, value]) => {
          res.setHeader(key, value);
        });

        next();
      });
    } else {
      next();
    }
  });
};
