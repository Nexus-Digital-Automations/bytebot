/**
 * Rate Limiter Mock Implementation
 *
 * Mock implementation for rate limiting testing including:
 * - Token bucket algorithm simulation
 * - Sliding window rate limiting
 * - Per-IP and per-user rate limiting
 * - Burst handling and cooldown periods
 * - Rate limit bypass for testing
 * - Distributed rate limiting simulation
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { MockConfig } from "./mock-config";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  identifier: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

export interface RateLimiterMock {
  checkRateLimit: jest.MockedFunction<
    (
      _identifier: string,
      _config?: Partial<RateLimitConfig>,
    ) => Promise<RateLimitResult>
  >;
  incrementCounter: jest.MockedFunction<
    (_identifier: string, _amount?: number) => Promise<number>
  >;
  resetCounter: jest.MockedFunction<(_identifier: string) => Promise<void>>;
  getRemainingRequests: jest.MockedFunction<
    (_identifier: string) => Promise<number>
  >;
  getResetTime: jest.MockedFunction<(_identifier: string) => Promise<Date>>;
  isBlocked: jest.MockedFunction<(_identifier: string) => Promise<boolean>>;
  blockIdentifier: jest.MockedFunction<
    (
      _identifier: string,
      _durationMs: number,
      _reason?: string,
    ) => Promise<void>
  >;
  unblockIdentifier: jest.MockedFunction<
    (_identifier: string) => Promise<void>
  >;
  getUsageStats: jest.MockedFunction<
    (_identifier: string) => Promise<{
      requestCount: number;
      firstRequest: Date;
      lastRequest: Date;
      blockedCount: number;
    }>
  >;
  configureLimits: jest.MockedFunction<
    (_identifier: string, _limits: Partial<RateLimitConfig>) => Promise<void>
  >;
}

// Internal state tracking for mock
class MockRateLimitStore {
  private requests = new Map<
    string,
    Array<{ timestamp: Date; success: boolean }>
  >();
  private blocks = new Map<string, { until: Date; reason?: string }>();
  private configs = new Map<string, RateLimitConfig>();

  getRequestHistory(
    identifier: string,
  ): Array<{ timestamp: Date; success: boolean }> {
    return this.requests.get(identifier) || [];
  }

  addRequest(identifier: string, success: boolean = true): void {
    const history = this.getRequestHistory(identifier);
    history.push({ timestamp: new Date(), success });

    // Keep only recent requests within window
    const windowMs = this.getConfig(identifier).windowMs;
    const cutoff = new Date(Date.now() - windowMs);
    const filtered = history.filter((req) => req.timestamp > cutoff);

    this.requests.set(identifier, filtered);
  }

  getConfig(identifier: string): RateLimitConfig {
    return (
      this.configs.get(identifier) || {
        windowMs: MockConfig.rateLimit.windowMs,
        maxRequests: MockConfig.rateLimit.maxRequests,
        identifier,
        skipSuccessfulRequests: MockConfig.rateLimit.skipSuccessfulRequests,
        skipFailedRequests: false,
      }
    );
  }

  setConfig(identifier: string, config: Partial<RateLimitConfig>): void {
    const currentConfig = this.getConfig(identifier);
    this.configs.set(identifier, { ...currentConfig, ...config });
  }

  isBlocked(identifier: string): boolean {
    const block = this.blocks.get(identifier);
    if (!block) return false;

    if (block.until <= new Date()) {
      this.blocks.delete(identifier);
      return false;
    }

    return true;
  }

  blockIdentifier(
    identifier: string,
    durationMs: number,
    reason?: string,
  ): void {
    this.blocks.set(identifier, {
      until: new Date(Date.now() + durationMs),
      reason,
    });
  }

  unblockIdentifier(identifier: string): void {
    this.blocks.delete(identifier);
  }

  getBlockInfo(identifier: string): { until: Date; reason?: string } | null {
    return this.blocks.get(identifier) || null;
  }

  reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
      this.blocks.delete(identifier);
      this.configs.delete(identifier);
    } else {
      this.requests.clear();
      this.blocks.clear();
      this.configs.clear();
    }
  }
}

// Singleton store instance for consistent state across mock instances
const mockStore = new MockRateLimitStore();

/**
 * Creates a comprehensive rate limiter mock
 */
export const createRateLimiterMock = (): RateLimiterMock => {
  return {
    checkRateLimit: jest.fn(
      async (
        identifier: string,
        config?: Partial<RateLimitConfig>,
      ): Promise<RateLimitResult> => {
        // Apply custom config if provided
        if (config) {
          mockStore.setConfig(identifier, config);
        }

        const rateLimitConfig = mockStore.getConfig(identifier);

        // Check if identifier is blocked
        if (mockStore.isBlocked(identifier)) {
          const blockInfo = mockStore.getBlockInfo(identifier);
          const retryAfter = blockInfo
            ? Math.ceil((blockInfo.until.getTime() - Date.now()) / 1000)
            : 60;

          return {
            allowed: false,
            remaining: 0,
            resetTime: blockInfo?.until || new Date(Date.now() + 60000),
            retryAfter,
          };
        }

        const history = mockStore.getRequestHistory(identifier);
        const now = new Date();
        const windowStart = new Date(now.getTime() - rateLimitConfig.windowMs);

        // Filter requests within the current window
        let relevantRequests = history.filter(
          (req) => req.timestamp > windowStart,
        );

        // Apply skip options
        if (rateLimitConfig.skipSuccessfulRequests) {
          relevantRequests = relevantRequests.filter((req) => !req.success);
        }

        if (rateLimitConfig.skipFailedRequests) {
          relevantRequests = relevantRequests.filter((req) => req.success);
        }

        const requestCount = relevantRequests.length;
        const allowed = requestCount < rateLimitConfig.maxRequests;
        const remaining = Math.max(
          0,
          rateLimitConfig.maxRequests - requestCount,
        );

        // Calculate reset time (end of current window)
        const oldestRequest =
          relevantRequests.length > 0
            ? Math.min(...relevantRequests.map((r) => r.timestamp.getTime()))
            : now.getTime();

        const resetTime = new Date(oldestRequest + rateLimitConfig.windowMs);

        // If request would be allowed, add it to history
        if (allowed) {
          mockStore.addRequest(identifier, true);
        }

        // Calculate retry after seconds if rate limit exceeded
        const retryAfter = !allowed
          ? Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
          : undefined;

        return {
          allowed,
          remaining: allowed ? remaining - 1 : remaining,
          resetTime,
          retryAfter,
        };
      },
    ),

    incrementCounter: jest.fn(
      async (identifier: string, amount: number = 1): Promise<number> => {
        for (let i = 0; i < amount; i++) {
          mockStore.addRequest(identifier, true);
        }

        const history = mockStore.getRequestHistory(identifier);
        const config = mockStore.getConfig(identifier);
        const windowStart = new Date(Date.now() - config.windowMs);

        return history.filter((req) => req.timestamp > windowStart).length;
      },
    ),

    resetCounter: jest.fn(async (identifier: string): Promise<void> => {
      mockStore.reset(identifier);
    }),

    getRemainingRequests: jest.fn(
      async (identifier: string): Promise<number> => {
        const config = mockStore.getConfig(identifier);
        const history = mockStore.getRequestHistory(identifier);
        const windowStart = new Date(Date.now() - config.windowMs);
        const currentCount = history.filter(
          (req) => req.timestamp > windowStart,
        ).length;

        return Math.max(0, config.maxRequests - currentCount);
      },
    ),

    getResetTime: jest.fn(async (identifier: string): Promise<Date> => {
      const config = mockStore.getConfig(identifier);
      const history = mockStore.getRequestHistory(identifier);
      const windowStart = new Date(Date.now() - config.windowMs);
      const relevantRequests = history.filter(
        (req) => req.timestamp > windowStart,
      );

      if (relevantRequests.length === 0) {
        return new Date(Date.now() + config.windowMs);
      }

      const oldestRequest = Math.min(
        ...relevantRequests.map((r) => r.timestamp.getTime()),
      );
      return new Date(oldestRequest + config.windowMs);
    }),

    isBlocked: jest.fn(async (identifier: string): Promise<boolean> => {
      return mockStore.isBlocked(identifier);
    }),

    blockIdentifier: jest.fn(
      async (
        identifier: string,
        durationMs: number,
        reason?: string,
      ): Promise<void> => {
        mockStore.blockIdentifier(identifier, durationMs, reason);
      },
    ),

    unblockIdentifier: jest.fn(async (identifier: string): Promise<void> => {
      mockStore.unblockIdentifier(identifier);
    }),

    getUsageStats: jest.fn(
      async (
        identifier: string,
      ): Promise<{
        requestCount: number;
        firstRequest: Date;
        lastRequest: Date;
        blockedCount: number;
      }> => {
        const history = mockStore.getRequestHistory(identifier);
        const blockedRequests = history.filter((req) => !req.success);

        return {
          requestCount: history.length,
          firstRequest:
            history.length > 0
              ? new Date(Math.min(...history.map((r) => r.timestamp.getTime())))
              : new Date(),
          lastRequest:
            history.length > 0
              ? new Date(Math.max(...history.map((r) => r.timestamp.getTime())))
              : new Date(),
          blockedCount: blockedRequests.length,
        };
      },
    ),

    configureLimits: jest.fn(
      async (
        identifier: string,
        limits: Partial<RateLimitConfig>,
      ): Promise<void> => {
        mockStore.setConfig(identifier, limits);
      },
    ),
  };
};

// Default mock instance
export const rateLimiterMock = createRateLimiterMock();

// Mock rate limiter factory with configurable behavior
export const createMockRateLimiter = (
  options: {
    defaultLimits?: Partial<RateLimitConfig>;
    alwaysAllow?: boolean;
    alwaysBlock?: boolean;
    simulateLatency?: number;
    failureRate?: number;
  } = {},
) => {
  const {
    defaultLimits = {},
    alwaysAllow = false,
    alwaysBlock = false,
    simulateLatency = 0,
    failureRate = 0,
  } = options;

  const mock = createRateLimiterMock();

  // Override default configuration
  if (Object.keys(defaultLimits).length > 0) {
    const originalCheck = mock.checkRateLimit;
    mock.checkRateLimit = jest.fn(async (identifier, config) => {
      const mergedConfig = { ...defaultLimits, ...config };
      return originalCheck(identifier, mergedConfig);
    });
  }

  // Force allow all requests
  if (alwaysAllow) {
    mock.checkRateLimit = jest.fn(
      async (_identifier): Promise<RateLimitResult> => {
        return {
          allowed: true,
          remaining: 999,
          resetTime: new Date(Date.now() + 60000),
        };
      },
    );
  }

  // Force block all requests
  if (alwaysBlock) {
    mock.checkRateLimit = jest.fn(
      async (_identifier): Promise<RateLimitResult> => {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(Date.now() + 60000),
          retryAfter: 60,
        };
      },
    );
  }

  // Add latency simulation
  if (simulateLatency > 0) {
    const originalMethods = {
      checkRateLimit: mock.checkRateLimit,
      incrementCounter: mock.incrementCounter,
      getRemainingRequests: mock.getRemainingRequests,
    };

    Object.entries(originalMethods).forEach(([methodName, originalMethod]) => {
      (mock as any)[methodName] = jest.fn(async (..._args: unknown[]) => {
        await new Promise((resolve) => setTimeout(resolve, simulateLatency));
        return (originalMethod as (..._args: unknown[]) => unknown)(..._args);
      });
    });
  }

  // Add random failure simulation
  if (failureRate > 0) {
    const originalCheck = mock.checkRateLimit;
    mock.checkRateLimit = jest.fn(async (...args) => {
      if (Math.random() < failureRate) {
        throw new Error("Rate limiter temporarily unavailable");
      }
      return originalCheck(...args);
    });
  }

  return mock;
};

// Utility functions for rate limiting testing
export const RateLimitTestUtils = {
  /**
   * Reset all mock state (useful between tests)
   */
  resetMockStore: (): void => {
    mockStore.reset();
  },

  /**
   * Simulate multiple requests for testing
   */
  simulateRequests: async (
    rateLimiter: RateLimiterMock,
    identifier: string,
    count: number,
    delayMs: number = 0,
  ): Promise<RateLimitResult[]> => {
    const results: RateLimitResult[] = [];

    for (let i = 0; i < count; i++) {
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      const result = await rateLimiter.checkRateLimit(identifier);
      results.push(result);
    }

    return results;
  },

  /**
   * Create test identifiers for different scenarios
   */
  createTestIdentifiers: (): { ip: string; user: string; api: string } => {
    const timestamp = Date.now();
    return {
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      user: `user_${timestamp}_${Math.random().toString(36).substring(7)}`,
      api: `api_key_${timestamp}_${Math.random().toString(36).substring(7)}`,
    };
  },

  /**
   * Validate rate limit result structure
   */
  validateRateLimitResult: (result: RateLimitResult): boolean => {
    return !!(
      result &&
      typeof result.allowed === "boolean" &&
      typeof result.remaining === "number" &&
      result.resetTime instanceof Date &&
      result.remaining >= 0 &&
      (result.retryAfter === undefined || typeof result.retryAfter === "number")
    );
  },

  /**
   * Create load testing scenario
   */
  createLoadTestScenario: (
    concurrentUsers: number = 10,
    requestsPerUser: number = 20,
    requestIntervalMs: number = 100,
  ): {
    concurrentUsers: number;
    requestsPerUser: number;
    requestIntervalMs: number;
    totalRequests: number;
    estimatedDurationMs: number;
  } => {
    return {
      concurrentUsers,
      requestsPerUser,
      requestIntervalMs,
      totalRequests: concurrentUsers * requestsPerUser,
      estimatedDurationMs: requestsPerUser * requestIntervalMs,
    };
  },

  /**
   * Analyze rate limit test results
   */
  analyzeResults: (
    results: RateLimitResult[],
  ): {
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    allowedPercentage: number;
    averageRemaining: number;
  } => {
    const totalRequests = results.length;
    const allowedRequests = results.filter((r) => r.allowed).length;
    const blockedRequests = totalRequests - allowedRequests;
    const allowedPercentage = (allowedRequests / totalRequests) * 100;
    const averageRemaining =
      results.reduce((sum, r) => sum + r.remaining, 0) / totalRequests;

    return {
      totalRequests,
      allowedRequests,
      blockedRequests,
      allowedPercentage: Math.round(allowedPercentage * 100) / 100,
      averageRemaining: Math.round(averageRemaining * 100) / 100,
    };
  },
};
