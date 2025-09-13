/**
 * Audit Logger Mock Implementation
 *
 * Mock implementation for audit logging testing including:
 * - Security event logging
 * - User activity tracking
 * - System audit trails
 * - Compliance logging (GDPR, SOX, HIPAA)
 * - Performance monitoring logs
 * - Error and exception logging
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { MockConfig } from "./mock-config";

export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export type EventCategory =
  | "authentication"
  | "authorization"
  | "data_access"
  | "data_modification"
  | "system"
  | "security"
  | "compliance"
  | "performance"
  | "error";

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: EventCategory;
  event: string;
  message: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  metadata?: Record<string, unknown>;
  stackTrace?: string;
  duration?: number;
  success?: boolean;
  riskScore?: number;
}

export interface AuditLogQuery {
  startDate?: Date;
  endDate?: Date;
  level?: LogLevel[];
  category?: EventCategory[];
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  resource?: string;
  action?: string;
  success?: boolean;
  minRiskScore?: number;
  limit?: number;
  offset?: number;
}

export interface AuditLoggerMock {
  log: jest.MockedFunction<
    (
      _level: LogLevel,
      _category: EventCategory,
      _event: string,
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  info: jest.MockedFunction<
    (
      _category: EventCategory,
      _event: string,
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  warn: jest.MockedFunction<
    (
      _category: EventCategory,
      _event: string,
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  error: jest.MockedFunction<
    (
      _category: EventCategory,
      _event: string,
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  critical: jest.MockedFunction<
    (
      _category: EventCategory,
      _event: string,
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  logSecurityEvent: jest.MockedFunction<
    (
      _event: string,
      _severity: "low" | "medium" | "high" | "critical",
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  logUserActivity: jest.MockedFunction<
    (
      _userId: string,
      _action: string,
      _resource: string,
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  logDataAccess: jest.MockedFunction<
    (
      _userId: string,
      _resource: string,
      _operation: "read" | "write" | "delete",
      _data?: Partial<AuditLogEntry>,
    ) => void
  >;
  logPerformanceMetric: jest.MockedFunction<
    (
      _operation: string,
      _duration: number,
      _metadata?: Record<string, unknown>,
    ) => void
  >;
  query: jest.MockedFunction<
    (
      _query: AuditLogQuery,
    ) => Promise<{ logs: AuditLogEntry[]; totalCount: number }>
  >;
  getLogStats: jest.MockedFunction<
    (_timeframe: "hour" | "day" | "week" | "month") => Promise<{
      totalLogs: number;
      logsByLevel: Record<LogLevel, number>;
      logsByCategory: Record<EventCategory, number>;
      securityEvents: number;
      errorRate: number;
    }>
  >;
  exportLogs: jest.MockedFunction<
    (_query: AuditLogQuery, _format: "json" | "csv" | "xml") => Promise<string>
  >;
  purgeLogs: jest.MockedFunction<
    (_olderThan: Date, _category?: EventCategory[]) => Promise<number>
  >;
  flush: jest.MockedFunction<() => void>;
  setLogLevel: jest.MockedFunction<(_level: LogLevel) => void>;
}

// Mock storage for audit logs
class MockAuditStore {
  private logs: AuditLogEntry[] = [];
  private currentLogLevel: LogLevel = "info";

  addLog(entry: AuditLogEntry): void {
    // Respect log level filtering
    const levelOrder: LogLevel[] = [
      "debug",
      "info",
      "warn",
      "error",
      "critical",
    ];
    const currentLevelIndex = levelOrder.indexOf(this.currentLogLevel);
    const entryLevelIndex = levelOrder.indexOf(entry.level);

    if (entryLevelIndex >= currentLevelIndex) {
      this.logs.push(entry);
    }

    // Respect max log size from config
    if (this.logs.length > MockConfig.audit.maxLogSize) {
      this.logs = this.logs.slice(-MockConfig.audit.maxLogSize);
    }
  }

  queryLogs(query: AuditLogQuery): {
    logs: AuditLogEntry[];
    totalCount: number;
  } {
    let filteredLogs = [...this.logs];

    // Apply filters
    if (query.startDate) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp >= query.startDate!,
      );
    }
    if (query.endDate) {
      filteredLogs = filteredLogs.filter(
        (log) => log.timestamp <= query.endDate!,
      );
    }
    if (query.level) {
      filteredLogs = filteredLogs.filter((log) =>
        query.level!.includes(log.level),
      );
    }
    if (query.category) {
      filteredLogs = filteredLogs.filter((log) =>
        query.category!.includes(log.category),
      );
    }
    if (query.userId) {
      filteredLogs = filteredLogs.filter((log) => log.userId === query.userId);
    }
    if (query.sessionId) {
      filteredLogs = filteredLogs.filter(
        (log) => log.sessionId === query.sessionId,
      );
    }
    if (query.ipAddress) {
      filteredLogs = filteredLogs.filter(
        (log) => log.ipAddress === query.ipAddress,
      );
    }
    if (query.resource) {
      filteredLogs = filteredLogs.filter(
        (log) => log.resource === query.resource,
      );
    }
    if (query.action) {
      filteredLogs = filteredLogs.filter((log) => log.action === query.action);
    }
    if (query.success !== undefined) {
      filteredLogs = filteredLogs.filter(
        (log) => log.success === query.success,
      );
    }
    if (query.minRiskScore !== undefined) {
      filteredLogs = filteredLogs.filter(
        (log) =>
          log.riskScore !== undefined && log.riskScore >= query.minRiskScore!,
      );
    }

    const totalCount = filteredLogs.length;

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || totalCount;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return { logs: paginatedLogs, totalCount };
  }

  getStats(timeframe: "hour" | "day" | "week" | "month"): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByCategory: Record<EventCategory, number>;
    securityEvents: number;
    errorRate: number;
  } {
    // Calculate timeframe cutoff
    const now = new Date();
    let cutoff: Date;

    switch (timeframe) {
      case "hour":
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "day":
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const relevantLogs = this.logs.filter((log) => log.timestamp >= cutoff);
    const totalLogs = relevantLogs.length;

    // Count by level
    const logsByLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      critical: 0,
    };

    // Count by category
    const logsByCategory: Record<EventCategory, number> = {
      authentication: 0,
      authorization: 0,
      data_access: 0,
      data_modification: 0,
      system: 0,
      security: 0,
      compliance: 0,
      performance: 0,
      error: 0,
    };

    let securityEvents = 0;
    let errorCount = 0;

    relevantLogs.forEach((log) => {
      logsByLevel[log.level]++;
      logsByCategory[log.category]++;

      if (log.category === "security") {
        securityEvents++;
      }

      if (log.level === "error" || log.level === "critical") {
        errorCount++;
      }
    });

    const errorRate = totalLogs > 0 ? (errorCount / totalLogs) * 100 : 0;

    return {
      totalLogs,
      logsByLevel,
      logsByCategory,
      securityEvents,
      errorRate: Math.round(errorRate * 100) / 100,
    };
  }

  clear(): void {
    this.logs = [];
  }

  setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  purgeLogs(olderThan: Date, categories?: EventCategory[]): number {
    const originalCount = this.logs.length;

    this.logs = this.logs.filter((log) => {
      if (log.timestamp < olderThan) {
        if (!categories || categories.includes(log.category)) {
          return false; // Remove this log
        }
      }
      return true; // Keep this log
    });

    return originalCount - this.logs.length;
  }

  getAllLogs(): AuditLogEntry[] {
    return [...this.logs];
  }
}

// Singleton store instance
const mockAuditStore = new MockAuditStore();

/**
 * Creates a comprehensive audit logger mock
 */
export const createAuditLoggerMock = (): AuditLoggerMock => {
  const generateLogId = (): string => {
    return `log_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  };

  const createLogEntry = (
    level: LogLevel,
    category: EventCategory,
    event: string,
    data: Partial<AuditLogEntry> = {},
  ): AuditLogEntry => {
    return {
      id: generateLogId(),
      timestamp: new Date(),
      level,
      category,
      event,
      message: data.message || event,
      userId: data.userId,
      sessionId: data.sessionId,
      ipAddress: data.ipAddress || "127.0.0.1",
      userAgent: data.userAgent,
      resource: data.resource,
      action: data.action,
      metadata: data.metadata,
      stackTrace: MockConfig.audit.includeStackTrace
        ? data.stackTrace
        : undefined,
      duration: data.duration,
      success: data.success,
      riskScore: data.riskScore,
    };
  };

  return {
    log: jest.fn(
      (
        level: LogLevel,
        category: EventCategory,
        event: string,
        data?: Partial<AuditLogEntry>,
      ): void => {
        const logEntry = createLogEntry(level, category, event, data);
        mockAuditStore.addLog(logEntry);
      },
    ),

    info: jest.fn(
      (
        category: EventCategory,
        event: string,
        data?: Partial<AuditLogEntry>,
      ): void => {
        const logEntry = createLogEntry("info", category, event, data);
        mockAuditStore.addLog(logEntry);
      },
    ),

    warn: jest.fn(
      (
        category: EventCategory,
        event: string,
        data?: Partial<AuditLogEntry>,
      ): void => {
        const logEntry = createLogEntry("warn", category, event, data);
        mockAuditStore.addLog(logEntry);
      },
    ),

    error: jest.fn(
      (
        category: EventCategory,
        event: string,
        data?: Partial<AuditLogEntry>,
      ): void => {
        const logEntry = createLogEntry("error", category, event, data);
        mockAuditStore.addLog(logEntry);
      },
    ),

    critical: jest.fn(
      (
        category: EventCategory,
        event: string,
        data?: Partial<AuditLogEntry>,
      ): void => {
        const logEntry = createLogEntry("critical", category, event, data);
        mockAuditStore.addLog(logEntry);
      },
    ),

    logSecurityEvent: jest.fn(
      (
        event: string,
        severity: "low" | "medium" | "high" | "critical",
        data?: Partial<AuditLogEntry>,
      ): void => {
        const levelMap = {
          low: "info" as const,
          medium: "warn" as const,
          high: "error" as const,
          critical: "critical" as const,
        };

        const riskScoreMap = { low: 25, medium: 50, high: 75, critical: 100 };

        const logEntry = createLogEntry(levelMap[severity], "security", event, {
          ...data,
          riskScore: data?.riskScore || riskScoreMap[severity],
        });

        mockAuditStore.addLog(logEntry);
      },
    ),

    logUserActivity: jest.fn(
      (
        userId: string,
        action: string,
        resource: string,
        data?: Partial<AuditLogEntry>,
      ): void => {
        const logEntry = createLogEntry(
          "info",
          "authentication",
          `User ${action}`,
          {
            ...data,
            userId,
            action,
            resource,
            message: `User ${userId} performed ${action} on ${resource}`,
          },
        );

        mockAuditStore.addLog(logEntry);
      },
    ),

    logDataAccess: jest.fn(
      (
        userId: string,
        resource: string,
        operation: "read" | "write" | "delete",
        data?: Partial<AuditLogEntry>,
      ): void => {
        const category: EventCategory =
          operation === "read" ? "data_access" : "data_modification";
        const riskScore =
          operation === "delete" ? 75 : operation === "write" ? 50 : 25;

        const logEntry = createLogEntry("info", category, `Data ${operation}`, {
          ...data,
          userId,
          resource,
          action: operation,
          message: `User ${userId} performed ${operation} operation on ${resource}`,
          riskScore,
        });

        mockAuditStore.addLog(logEntry);
      },
    ),

    logPerformanceMetric: jest.fn(
      (
        operation: string,
        duration: number,
        metadata?: Record<string, unknown>,
      ): void => {
        const level: LogLevel =
          duration > 5000 ? "warn" : duration > 10000 ? "error" : "info";

        const logEntry = createLogEntry(
          level,
          "performance",
          `Performance metric: ${operation}`,
          {
            action: operation,
            duration,
            metadata: {
              ...metadata,
              performanceThreshold: duration > 1000 ? "slow" : "fast",
            },
            message: `Operation ${operation} completed in ${duration}ms`,
          },
        );

        mockAuditStore.addLog(logEntry);
      },
    ),

    query: jest.fn(
      (
        query: AuditLogQuery,
      ): Promise<{ logs: AuditLogEntry[]; totalCount: number }> => {
        return Promise.resolve(mockAuditStore.queryLogs(query));
      },
    ),

    getLogStats: jest.fn((timeframe: "hour" | "day" | "week" | "month") => {
      return Promise.resolve(mockAuditStore.getStats(timeframe));
    }),

    exportLogs: jest.fn(
      (
        query: AuditLogQuery,
        format: "json" | "csv" | "xml",
      ): Promise<string> => {
        const { logs } = mockAuditStore.queryLogs(query);

        switch (format) {
          case "json":
            return Promise.resolve(JSON.stringify(logs, null, 2));

          case "csv": {
            if (logs.length === 0) return Promise.resolve("");

            const headers = Object.keys(logs[0]).join(",");
            const rows = logs.map((log) =>
              Object.values(log)
                .map((value) =>
                  typeof value === "string"
                    ? `"${value.replace(/"/g, '""')}"`
                    : String(value),
                )
                .join(","),
            );

            return Promise.resolve([headers, ...rows].join("\n"));
          }

          case "xml": {
            const xmlLogs = logs
              .map((log) => {
                const xmlFields = Object.entries(log)
                  .map(([key, value]) => `<${key}>${String(value)}</${key}>`)
                  .join("");
                return `<log>${xmlFields}</log>`;
              })
              .join("");

            return Promise.resolve(
              `<?xml version="1.0" encoding="UTF-8"?><auditLogs>${xmlLogs}</auditLogs>`,
            );
          }

          default:
            throw new Error(`Unsupported export format: ${format}`);
        }
      },
    ),

    purgeLogs: jest.fn(
      (olderThan: Date, category?: EventCategory[]): Promise<number> => {
        return Promise.resolve(mockAuditStore.purgeLogs(olderThan, category));
      },
    ),

    flush: jest.fn((): void => {
      // In a real implementation, this would flush any pending logs to storage
      // For mock, we just acknowledge the call
    }),

    setLogLevel: jest.fn((level: LogLevel): void => {
      mockAuditStore.setLogLevel(level);
    }),
  };
};

// Default mock instance
export const auditLoggerMock = createAuditLoggerMock();

// Mock audit logger factory with configurable behavior
export const createMockAuditLogger = (
  options: {
    enableLogging?: boolean;
    logLevel?: LogLevel;
    includeStackTrace?: boolean;
    maxLogSize?: number;
    simulateLatency?: number;
    failureRate?: number;
  } = {},
) => {
  const {
    enableLogging = true,
    logLevel = MockConfig.audit.logLevel as LogLevel,
    includeStackTrace = MockConfig.audit.includeStackTrace,
    maxLogSize = MockConfig.audit.maxLogSize,
    simulateLatency = 0,
    failureRate = 0,
  } = options;

  const mock = createAuditLoggerMock();

  // Disable logging if configured
  if (!enableLogging) {
    Object.keys(mock).forEach((key) => {
      const mockRecord = mock as unknown as Record<string, unknown>;
      if (typeof mockRecord[key] === "function") {
        (
          mock as unknown as Record<
            string,
            jest.MockedFunction<(...args: unknown[]) => unknown>
          >
        )[key] = jest.fn().mockResolvedValue(undefined);
      }
    });
    return mock;
  }

  // Set log level
  mock.setLogLevel(logLevel);

  // Configure stack trace inclusion
  if (includeStackTrace !== MockConfig.audit.includeStackTrace) {
    MockConfig.audit.includeStackTrace = includeStackTrace;
  }

  // Configure max log size
  if (maxLogSize !== MockConfig.audit.maxLogSize) {
    MockConfig.audit.maxLogSize = maxLogSize;
  }

  // Add latency simulation
  if (simulateLatency > 0) {
    const originalMethods = {
      log: mock.log,
      query: mock.query,
      exportLogs: mock.exportLogs,
    };

    Object.entries(originalMethods).forEach(([methodName, originalMethod]) => {
      (
        mock as Record<
          string,
          jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>
        >
      )[methodName] = jest.fn(async (...args: unknown[]) => {
        await new Promise((resolve) => setTimeout(resolve, simulateLatency));
        return (originalMethod as (...args: unknown[]) => Promise<unknown>)(
          ...args,
        );
      });
    });
  }

  // Add random failure simulation
  if (failureRate > 0) {
    const loggingMethods = ["log", "info", "warn", "error", "critical"];

    loggingMethods.forEach((methodName) => {
      const originalMethod = (
        mock as Record<
          string,
          jest.MockedFunction<(...args: unknown[]) => unknown>
        >
      )[methodName];
      (
        mock as Record<
          string,
          jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>
        >
      )[methodName] = jest.fn(async (...args: unknown[]) => {
        if (Math.random() < failureRate) {
          throw new Error("Audit logger temporarily unavailable");
        }
        return originalMethod(...args);
      });
    });
  }

  return mock;
};

// Utility functions for audit logging testing
export const AuditLogTestUtils = {
  /**
   * Reset mock audit store
   */
  resetMockStore: (): void => {
    mockAuditStore.clear();
  },

  /**
   * Get all logs from mock store (useful for testing)
   */
  getAllMockLogs: (): AuditLogEntry[] => {
    return mockAuditStore.getAllLogs();
  },

  /**
   * Create test log entry
   */
  createTestLogEntry: (
    overrides: Partial<AuditLogEntry> = {},
  ): AuditLogEntry => {
    const timestamp = Date.now();
    return {
      id: `test_log_${timestamp}`,
      timestamp: new Date(),
      level: "info",
      category: "system",
      event: "test_event",
      message: "Test log message",
      userId: `test_user_${timestamp}`,
      sessionId: `test_session_${timestamp}`,
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Test Browser)",
      resource: "test_resource",
      action: "test_action",
      metadata: { test: true },
      success: true,
      riskScore: 10,
      ...overrides,
    };
  },

  /**
   * Validate audit log entry structure
   */
  validateLogEntry: (entry: AuditLogEntry): boolean => {
    const requiredFields = [
      "id",
      "timestamp",
      "level",
      "category",
      "event",
      "message",
    ];
    return requiredFields.every(
      (field) =>
        Object.prototype.hasOwnProperty.call(entry, field) &&
        (entry as unknown)[field] !== undefined,
    );
  },

  /**
   * Create bulk test data for performance testing
   */
  createBulkTestData: (count: number): AuditLogEntry[] => {
    const categories: EventCategory[] = [
      "authentication",
      "authorization",
      "data_access",
      "security",
      "system",
    ];
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];

    return Array.from({ length: count }, (_, index) =>
      AuditLogTestUtils.createTestLogEntry({
        id: `bulk_test_${index}`,
        category: categories[index % categories.length],
        level: levels[index % levels.length],
        event: `bulk_test_event_${index}`,
        timestamp: new Date(Date.now() - Math.random() * 86400000), // Random time in last 24 hours
      }),
    );
  },
};
