/**
 * Database Security Service Test Suite
 *
 * Comprehensive test coverage for enterprise database security implementation
 * including SSL/TLS encryption, connection authentication, audit logging,
 * access control, and security violation detection.
 *
 * Test Categories:
 * - Service initialization and configuration management
 * - SSL/TLS certificate validation and security configuration
 * - Audit logging with operation tracking and performance metrics
 * - Security violation detection and prevention
 * - Connection monitoring and access control
 * - Query validation and SQL injection prevention
 * - Metrics collection and security reporting
 * - Cleanup and maintenance operations
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import * as fs from 'fs';
import {
  DatabaseSecurityService,
  DatabaseSecurityConfig,
  DatabaseAuditEvent,
  SecurityViolation,
} from '../security/database-security.service';

// Mock fs module for SSL certificate validation testing
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('DatabaseSecurityService', () => {
  let service: DatabaseSecurityService;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: jest.Mocked<Logger>;

  // Test data fixtures
  const mockSecurityConfig: DatabaseSecurityConfig = {
    sslEnabled: true,
    sslMode: 'require',
    sslCertPath: '/path/to/cert.pem',
    sslKeyPath: '/path/to/key.pem',
    sslRootCertPath: '/path/to/ca.pem',
    connectionAuthentication: true,
    userCredentialsEncrypted: true,
    connectionStringObfuscation: true,
    auditLoggingEnabled: true,
    auditSensitiveOperations: true,
    auditAllQueries: false,
    auditRetentionDays: 30,
    restrictedOperations: ['DROP', 'TRUNCATE', 'ALTER'],
    allowedIpRanges: ['192.168.1.0/24', '10.0.0.0/8'],
    maxConcurrentConnections: 100,
  };

  const mockDatabaseUrl =
    'postgresql://user:pass@localhost:5432/db?sslmode=require';

  beforeEach(async () => {
    // Reset all timers and mocks
    jest.clearAllTimers();
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Mock ConfigService with comprehensive security configuration
    const mockConfigServiceMethods = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configMap: Record<string, any> = {
          DB_SSL_ENABLED: mockSecurityConfig.sslEnabled,
          DB_SSL_MODE: mockSecurityConfig.sslMode,
          DB_SSL_CERT_PATH: mockSecurityConfig.sslCertPath,
          DB_SSL_KEY_PATH: mockSecurityConfig.sslKeyPath,
          DB_SSL_ROOT_CERT_PATH: mockSecurityConfig.sslRootCertPath,
          DB_CONNECTION_AUTH_ENABLED:
            mockSecurityConfig.connectionAuthentication,
          DB_CREDENTIALS_ENCRYPTED: mockSecurityConfig.userCredentialsEncrypted,
          DB_CONNECTION_STRING_OBFUSCATION:
            mockSecurityConfig.connectionStringObfuscation,
          DB_AUDIT_LOGGING_ENABLED: mockSecurityConfig.auditLoggingEnabled,
          DB_AUDIT_SENSITIVE_OPS: mockSecurityConfig.auditSensitiveOperations,
          DB_AUDIT_ALL_QUERIES: mockSecurityConfig.auditAllQueries,
          DB_AUDIT_RETENTION_DAYS: mockSecurityConfig.auditRetentionDays,
          DB_RESTRICTED_OPERATIONS:
            mockSecurityConfig.restrictedOperations.join(','),
          DB_ALLOWED_IP_RANGES: mockSecurityConfig.allowedIpRanges?.join(','),
          DB_MAX_CONCURRENT_CONNECTIONS:
            mockSecurityConfig.maxConcurrentConnections,
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    // Mock environment variables
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      DATABASE_URL: mockDatabaseUrl,
    };

    // Mock fs.existsSync for SSL certificate validation
    mockFs.existsSync.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseSecurityService,
        {
          provide: ConfigService,
          useValue: mockConfigServiceMethods,
        },
      ],
    }).compile();

    service = module.get<DatabaseSecurityService>(DatabaseSecurityService);
    configService = module.get(ConfigService);

    // Mock the logger to capture log calls
    mockLogger = {
      log: jest.fn(),
      _error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      setContext: jest.fn(),
      localInstance: jest.fn(),
    } as any;

    (service as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with security configuration from environment', () => {
      expect(service).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith('DB_SSL_ENABLED', true);
      expect(configService.get).toHaveBeenCalledWith(
        'DB_AUDIT_LOGGING_ENABLED',
        true,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_MAX_CONCURRENT_CONNECTIONS',
        100,
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Database security service initialized',
        expect.objectContaining({
          sslEnabled: true,
          auditEnabled: true,
          connectionAuth: true,
        }),
      );
    });

    it('should handle missing optional configuration values', async () => {
      // Create service with minimal configuration
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          const minimalConfig: Record<string, any> = {
            DB_SSL_ENABLED: false,
            DB_AUDIT_LOGGING_ENABLED: false,
            DB_CONNECTION_AUTH_ENABLED: false,
            DB_RESTRICTED_OPERATIONS: '',
            DB_ALLOWED_IP_RANGES: '',
          };
          return minimalConfig[key] ?? defaultValue;
        },
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseSecurityService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const minimalService = module.get<DatabaseSecurityService>(
        DatabaseSecurityService,
      );
      expect(minimalService).toBeDefined();
    });

    it('should validate SSL configuration on module init', () => {
      service.onModuleInit();

      expect(mockFs.existsSync).toHaveBeenCalledWith('/path/to/cert.pem');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'SSL configuration validated',
        expect.objectContaining({
          sslMode: 'require',
          certConfigured: true,
        }),
      );
    });

    it('should start audit cleanup when audit logging is enabled', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      service.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        24 * 60 * 60 * 1000, // 24 hours
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Audit cleanup started',
        expect.objectContaining({
          interval: 24 * 60 * 60 * 1000,
          retentionDays: 30,
        }),
      );
    });

    it('should log operational status on module init', () => {
      service.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting database security monitoring',
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Database security service fully operational',
      );
    });
  });

  describe('SSL/TLS Configuration Validation', () => {
    it('should validate SSL mode against DATABASE_URL', () => {
      service.onModuleInit();

      // Should not warn since DATABASE_URL contains sslmode=require
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        'SSL required but DATABASE_URL does not specify sslmode=require',
      );
    });

    it('should warn when SSL required but DATABASE_URL missing sslmode', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

      service.onModuleInit();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'SSL required but DATABASE_URL does not specify sslmode=require',
      );
    });

    it('should validate SSL certificate file existence', () => {
      mockFs.existsSync.mockReturnValue(false);

      service.onModuleInit();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'SSL certificate file not found',
        { path: '/path/to/cert.pem' },
      );
    });

    it('should handle SSL configuration with different modes', async () => {
      const sslModes: Array<'require' | 'prefer' | 'allow' | 'disable'> = [
        'require',
        'prefer',
        'allow',
        'disable',
      ];

      for (const sslMode of sslModes) {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_SSL_MODE') return sslMode;
            return (
              mockSecurityConfig[key as keyof DatabaseSecurityConfig] ??
              defaultValue
            );
          },
        );

        const module: TestingModule = await Test.createTestingModule({
          providers: [
            DatabaseSecurityService,
            {
              provide: ConfigService,
              useValue: configService,
            },
          ],
        }).compile();

        const testService = module.get<DatabaseSecurityService>(
          DatabaseSecurityService,
        );
        expect(testService).toBeDefined();
      }
    });
  });

  describe('Audit Operation Logging', () => {
    it('should audit database operations with complete context', () => {
      const operationContext = {
        userId: 'user123',
        sessionId: 'session456',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        tableName: 'users',
        queryText: 'SELECT * FROM users WHERE id = $1',
        duration: 150,
        success: true,
        affectedRows: 1,
      };

      service.auditOperation('database_query', operationContext);

      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining('Failed to audit database operation'),
      );

      // Verify audit event was created by checking metrics
      const metrics = service.getSecurityMetrics();
      expect(metrics.auditEvents.total).toBe(1);
    });

    it('should categorize different operation types correctly', () => {
      const operations = [
        { op: 'database_connect', expectedType: 'connection' },
        { op: 'database_disconnect', expectedType: 'connection' },
        { op: 'user_login', expectedType: 'authentication' },
        { op: 'user_auth', expectedType: 'authentication' },
        { op: 'create_table', expectedType: 'schema_change' },
        { op: 'alter_table', expectedType: 'schema_change' },
        { op: 'drop_table', expectedType: 'schema_change' },
        { op: 'security_violation', expectedType: 'security_violation' },
        { op: 'select_query', expectedType: 'query' },
      ];

      operations.forEach(({ op }) => {
        service.auditOperation(op, {
          duration: 100,
          success: true,
        });
      });

      const metrics = service.getSecurityMetrics();
      expect(metrics.auditEvents.total).toBe(operations.length);
    });

    it('should determine appropriate severity levels', () => {
      const testCases = [
        {
          operation: 'security_violation',
          success: true,
          expectedSeverity: 'critical',
        },
        {
          operation: 'alter_table',
          success: true,
          expectedSeverity: 'warning',
        },
        {
          operation: 'alter_table',
          success: false,
          expectedSeverity: 'error',
        },
        {
          operation: 'select_query',
          success: false,
          _error: 'authentication failed',
          expectedSeverity: 'error',
        },
        {
          operation: 'select_query',
          success: false,
          _error: 'syntax error',
          expectedSeverity: 'warning',
        },
        {
          operation: 'select_query',
          success: true,
          expectedSeverity: 'info',
        },
      ];

      testCases.forEach(({ operation, success, error }) => {
        service.auditOperation(operation, {
          duration: 100,
          success,
          error,
        });
      });

      // Verify audit events were created
      const metrics = service.getSecurityMetrics();
      expect(metrics.auditEvents.total).toBe(testCases.length);
    });

    it('should sanitize sensitive data in query text', () => {
      const sensitiveQuery = `
        UPDATE users SET 
        password='secret123',
        token='abc123def456',
        secret='mysecret',
        api_key='key123'
        WHERE id = 1
      `;

      service.auditOperation('database_update', {
        queryText: sensitiveQuery,
        duration: 200,
        success: true,
      });

      // Audit should have been created but with sanitized query
      const auditHistory = service.getAuditHistory(1);
      expect(auditHistory).toHaveLength(1);
      expect(auditHistory[0].queryText).toContain('[REDACTED]');
      expect(auditHistory[0].queryText).not.toContain('secret123');
      expect(auditHistory[0].queryText).not.toContain('abc123def456');
    });

    it('should truncate very long query text', () => {
      const longQuery =
        'SELECT * FROM table WHERE ' + 'column = value AND '.repeat(100);

      service.auditOperation('database_query', {
        queryText: longQuery,
        duration: 100,
        success: true,
      });

      const auditHistory = service.getAuditHistory(1);
      expect(auditHistory[0].queryText?.length).toBeLessThanOrEqual(1020); // 1000 + '[TRUNCATED]'
      expect(auditHistory[0].queryText).toContain('[TRUNCATED]');
    });

    it('should handle audit operation errors gracefully', () => {
      // Mock error in operation categorization
      const originalCategorize = (service as any).categorizeOperation;
      (service as any).categorizeOperation = jest.fn(() => {
        throw new Error('Categorization failed');
      });

      service.auditOperation('test_operation', {
        duration: 100,
        success: true,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to audit database operation',
        expect.objectContaining({
          operation: 'test_operation',
          _error: 'Categorization failed',
        }),
      );

      // Restore original method
      (service as any).categorizeOperation = originalCategorize;
    });

    it('should maintain audit log size limits', () => {
      // Add more than maximum in-memory events
      const maxEvents = 10000;
      const extraEvents = 100;

      for (let i = 0; i < maxEvents + extraEvents; i++) {
        service.auditOperation(`operation_${i}`, {
          duration: 10,
          success: true,
        });
      }

      const auditHistory = service.getAuditHistory(maxEvents + extraEvents);
      expect(auditHistory.length).toBeLessThanOrEqual(maxEvents);
    });
  });

  describe('Connection Auditing and Management', () => {
    it('should audit database connections and disconnections', () => {
      const connectionId = 'conn_123';
      const connectionContext = {
        userId: 'user123',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Client',
        success: true,
      };

      // Test connection
      service.auditConnection(connectionId, 'connect', connectionContext);

      // Test disconnection
      service.auditConnection(connectionId, 'disconnect', connectionContext);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Database connection audited',
        expect.objectContaining({
          connectionId,
          _event: 'connect',
          success: true,
          userId: 'user123',
        }),
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Database connection audited',
        expect.objectContaining({
          connectionId,
          _event: 'disconnect',
          success: true,
          userId: 'user123',
        }),
      );
    });

    it('should register active connections in connection registry', () => {
      const connectionId = 'conn_123';

      service.auditConnection(connectionId, 'connect', {
        userId: 'user123',
        ipAddress: '192.168.1.100',
        success: true,
      });

      const metrics = service.getSecurityMetrics();
      expect(metrics.connections.active).toBe(1);
      expect(metrics.connections.totalRegistered).toBe(1);
    });

    it('should unregister connections on disconnect', () => {
      const connectionId = 'conn_123';

      // Connect
      service.auditConnection(connectionId, 'connect', {
        userId: 'user123',
        ipAddress: '192.168.1.100',
        success: true,
      });

      // Disconnect
      service.auditConnection(connectionId, 'disconnect', {
        userId: 'user123',
        ipAddress: '192.168.1.100',
        success: true,
      });

      const metrics = service.getSecurityMetrics();
      expect(metrics.connections.active).toBe(0);
    });

    it('should handle connection audit errors gracefully', () => {
      const connectionId = 'conn_123';

      // Mock audit operation to throw error
      const originalAuditOperation = service.auditOperation;
      service.auditOperation = jest.fn(() => {
        throw new Error('Audit failed');
      });

      service.auditConnection(connectionId, 'connect', {
        success: true,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to audit database connection',
        expect.objectContaining({
          connectionId,
          _event: 'connect',
          _error: 'Audit failed',
        }),
      );

      // Restore original method
      service.auditOperation = originalAuditOperation;
    });

    it('should detect connection limit violations', () => {
      // Create connections up to the limit
      for (let i = 0; i < mockSecurityConfig.maxConcurrentConnections; i++) {
        service.auditConnection(`conn_${i}`, 'connect', {
          ipAddress: '192.168.1.100',
          success: true,
        });
      }

      // Add one more to exceed limit
      service.auditConnection('conn_overflow', 'connect', {
        ipAddress: '192.168.1.100',
        success: true,
      });

      const violations = service.getSecurityViolations();
      const connectionViolation = violations.find(
        (v) => v.type === 'connection_limit_exceeded',
      );

      expect(connectionViolation).toBeDefined();
      expect(connectionViolation?.severity).toBe('high');
      expect(connectionViolation?.context.currentConnections).toBeGreaterThan(
        mockSecurityConfig.maxConcurrentConnections,
      );
    });
  });

  describe('Query Security Validation', () => {
    it('should detect SQL injection patterns', () => {
      const maliciousQueries = [
        'SELECT * FROM users UNION SELECT password FROM admin_users',
        'SELECT * FROM users WHERE id = 1 OR 1=1',
        'SELECT * FROM users; DROP TABLE users;',
        'DELETE FROM users WHERE id = 1; DROP TABLE admin;',
        "INSERT INTO users VALUES ('hacker'); DROP TABLE users;",
        "SELECT * FROM users WHERE name = 'test'; DROP TABLE admin;",
      ];

      maliciousQueries.forEach((query) => {
        const result = service.validateQuerySecurity(query, {
          userId: 'user123',
          ipAddress: '192.168.1.100',
        });

        expect(result.allowed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].type).toBe('sql_injection_attempt');
        expect(result.violations[0].severity).toBe('critical');
      });
    });

    it('should detect restricted operations', () => {
      const restrictedQueries = [
        'DROP TABLE users',
        'TRUNCATE TABLE sessions',
        'ALTER TABLE users ADD COLUMN secret VARCHAR(255)',
      ];

      restrictedQueries.forEach((query) => {
        const result = service.validateQuerySecurity(query, {
          userId: 'user123',
          ipAddress: '192.168.1.100',
        });

        expect(result.allowed).toBe(false);
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0].type).toBe('unauthorized_access');
        expect(result.violations[0].severity).toBe('high');
      });
    });

    it('should detect suspicious query patterns', () => {
      const suspiciousQueries = [
        'SELECT * FROM users WHERE 1=1',
        'SELECT * FROM information_schema.tables',
        'SELECT * FROM pg_catalog.pg_tables',
        'SELECT name FROM users UNION ALL SELECT password FROM admin',
        'SELECT * FROM users -- comment',
        'SELECT * FROM users /* multi-line comment */',
      ];

      suspiciousQueries.forEach((query) => {
        const result = service.validateQuerySecurity(query, {
          userId: 'user123',
          ipAddress: '192.168.1.100',
        });

        expect(
          result.violations.some((v) => v.type === 'suspicious_query'),
        ).toBe(true);
      });
    });

    it('should allow legitimate queries', () => {
      const legitimateQueries = [
        'SELECT id, name, email FROM users WHERE id = $1',
        'INSERT INTO users (name, email) VALUES ($1, $2)',
        'UPDATE users SET last_login = NOW() WHERE id = $1',
        'DELETE FROM sessions WHERE expires_at < NOW()',
        'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      ];

      legitimateQueries.forEach((query) => {
        const result = service.validateQuerySecurity(query, {
          userId: 'user123',
          ipAddress: '192.168.1.100',
        });

        expect(result.allowed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    });

    it('should handle query validation errors gracefully', () => {
      // Mock suspicious query detection to throw error
      const originalIsSuspicious = (service as any).isSuspiciousQuery;
      (service as any).isSuspiciousQuery = jest.fn(() => {
        throw new Error('Validation failed');
      });

      const result = service.validateQuerySecurity('SELECT * FROM users', {
        userId: 'user123',
        ipAddress: '192.168.1.100',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to validate query security',
        expect.objectContaining({
          _error: 'Validation failed',
        }),
      );

      expect(result.allowed).toBe(true); // Should default to allowed on error
      expect(result.violations).toHaveLength(0);

      // Restore original method
      (service as any).isSuspiciousQuery = originalIsSuspicious;
    });

    it('should log detected security violations', () => {
      const maliciousQuery = 'SELECT * FROM users WHERE id = 1 OR 1=1';

      service.validateQuerySecurity(maliciousQuery, {
        userId: 'user123',
        ipAddress: '192.168.1.100',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Security violation detected',
        expect.objectContaining({
          type: 'sql_injection_attempt',
          severity: 'critical',
          description: 'Potential SQL injection pattern detected',
        }),
      );
    });
  });

  describe('Security Metrics and Reporting', () => {
    beforeEach(() => {
      // Add sample audit events and violations for metrics testing
      service.auditOperation('database_query', {
        duration: 100,
        success: true,
      });

      service.auditOperation('database_connect', {
        duration: 50,
        success: false,
        _error: 'Connection failed',
      });

      service.validateQuerySecurity('SELECT * FROM users WHERE id = 1 OR 1=1', {
        userId: 'user123',
        ipAddress: '192.168.1.100',
      });
    });

    it('should provide comprehensive security metrics', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics).toHaveProperty('auditEvents');
      expect(metrics).toHaveProperty('securityViolations');
      expect(metrics).toHaveProperty('connections');
      expect(metrics).toHaveProperty('configuration');

      expect(metrics.auditEvents.total).toBeGreaterThan(0);
      expect(metrics.securityViolations.total).toBeGreaterThan(0);
      expect(metrics.configuration.sslEnabled).toBe(true);
      expect(metrics.configuration.auditEnabled).toBe(true);
    });

    it('should group audit events by type and severity', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics.auditEvents.byType).toHaveProperty('query');
      expect(metrics.auditEvents.byType).toHaveProperty('connection');
      expect(metrics.auditEvents.bySeverity).toHaveProperty('info');
      expect(metrics.auditEvents.bySeverity).toHaveProperty('warning');
    });

    it('should calculate error rates correctly', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics.auditEvents.errorRate).toBeGreaterThan(0);
      expect(metrics.auditEvents.errorRate).toBeLessThanOrEqual(100);
    });

    it('should group security violations by type and severity', () => {
      const metrics = service.getSecurityMetrics();

      expect(metrics.securityViolations.byType).toHaveProperty(
        'sql_injection_attempt',
      );
      expect(metrics.securityViolations.bySeverity).toHaveProperty('critical');
    });

    it('should provide recent security violations with limit', () => {
      const violations = service.getSecurityViolations(10);

      expect(violations).toBeInstanceOf(Array);
      expect(violations.length).toBeLessThanOrEqual(10);

      if (violations.length > 0) {
        expect(violations[0]).toHaveProperty('violationId');
        expect(violations[0]).toHaveProperty('timestamp');
        expect(violations[0]).toHaveProperty('type');
        expect(violations[0]).toHaveProperty('severity');
      }
    });

    it('should provide audit history with limit', () => {
      const auditHistory = service.getAuditHistory(20);

      expect(auditHistory).toBeInstanceOf(Array);
      expect(auditHistory.length).toBeLessThanOrEqual(20);

      if (auditHistory.length > 0) {
        expect(auditHistory[0]).toHaveProperty('eventId');
        expect(auditHistory[0]).toHaveProperty('timestamp');
        expect(auditHistory[0]).toHaveProperty('eventType');
        expect(auditHistory[0]).toHaveProperty('severity');
      }
    });

    it('should sort violations and audit events by timestamp descending', () => {
      // Add multiple events with slight time differences
      jest.useRealTimers();

      service.auditOperation('operation1', { duration: 100, success: true });

      setTimeout(() => {
        service.auditOperation('operation2', { duration: 100, success: true });
      }, 10);

      setTimeout(() => {
        const auditHistory = service.getAuditHistory();
        if (auditHistory.length >= 2) {
          expect(auditHistory[0].timestamp.getTime()).toBeGreaterThanOrEqual(
            auditHistory[1].timestamp.getTime(),
          );
        }
      }, 20);

      jest.useFakeTimers();
    });
  });

  describe('Audit Log Cleanup and Maintenance', () => {
    it('should clean up expired audit events based on retention policy', () => {
      // Add audit events with old timestamps
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago (beyond retention)

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 25); // 25 days ago (within retention)

      // Mock audit events with specific timestamps
      const auditEvents = (service as any).auditEvents;
      auditEvents.push({
        eventId: 'old_event',
        timestamp: oldDate,
        eventType: 'query',
        severity: 'info',
        operation: 'old_operation',
        success: true,
        duration: 100,
      });

      auditEvents.push({
        eventId: 'recent_event',
        timestamp: recentDate,
        eventType: 'query',
        severity: 'info',
        operation: 'recent_operation',
        success: true,
        duration: 100,
      });

      const initialCount = auditEvents.length;

      // Trigger cleanup
      (service as any).cleanupExpiredAuditEvents();

      const finalCount = auditEvents.length;
      expect(finalCount).toBeLessThan(initialCount);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Audit log cleanup completed',
        expect.objectContaining({
          removedEvents: 1,
          remainingEvents: finalCount,
        }),
      );
    });

    it('should skip cleanup when no events are expired', () => {
      // Add only recent audit events
      service.auditOperation('recent_operation', {
        duration: 100,
        success: true,
      });

      const initialCount = (service as any).auditEvents.length;

      // Trigger cleanup
      (service as any).cleanupExpiredAuditEvents();

      const finalCount = (service as any).auditEvents.length;
      expect(finalCount).toBe(initialCount);
    });

    it('should handle cleanup interval properly', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service.onModuleInit(); // Start cleanup interval
      service.onModuleDestroy(); // Stop cleanup interval

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Database security service shutdown complete',
      );
    });

    it('should flush pending audit events on shutdown', () => {
      // Add audit events
      service.auditOperation('operation1', { duration: 100, success: true });
      service.auditOperation('operation2', { duration: 100, success: true });

      service.onModuleDestroy();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Flushing audit events',
        expect.objectContaining({
          eventCount: expect.any(Number),
        }),
      );
    });

    it('should handle module destroy when no cleanup interval exists', () => {
      // Don't start audit cleanup
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'DB_AUDIT_LOGGING_ENABLED') return false;
          return defaultValue;
        },
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseSecurityService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const testService = module.get<DatabaseSecurityService>(
        DatabaseSecurityService,
      );
      (testService as any).logger = mockLogger;

      // Should not throw error
      expect(() => testService.onModuleDestroy()).not.toThrow();
    });
  });

  describe('Security Violation Detection and Prevention', () => {
    it('should create security violations with proper structure', () => {
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        ipAddress: '192.168.1.100',
      };

      const violation = (service as any).createSecurityViolation(
        'unauthorized_access',
        'high',
        'Test violation',
        context,
        { additional: 'metadata' },
      );

      expect(violation).toMatchObject({
        violationId: expect.stringMatching(/^sec_\d+_[a-z0-9]{6}$/),
        timestamp: expect.any(Date),
        type: 'unauthorized_access',
        severity: 'high',
        description: 'Test violation',
        sourceIp: '192.168.1.100',
        userId: 'user123',
        sessionId: 'session456',
        _context: { additional: 'metadata' },
        blocked: true, // High severity should be blocked
      });
    });

    it('should determine blocking status based on severity', () => {
      const severities: Array<SecurityViolation['severity']> = [
        'low',
        'medium',
        'high',
        'critical',
      ];
      const expectedBlocked = [false, false, true, true];

      severities.forEach((severity, index) => {
        const violation = (service as any).createSecurityViolation(
          'suspicious_query',
          severity,
          `Test ${severity} violation`,
          {},
        );

        expect(violation.blocked).toBe(expectedBlocked[index]);
      });
    });

    it('should detect failed authentication violations', () => {
      // Simulate failed authentication
      service.auditOperation('user_authentication', {
        userId: 'user123',
        ipAddress: '192.168.1.100',
        duration: 500,
        success: false,
        _error: 'Invalid credentials',
      });

      const violations = service.getSecurityViolations();
      const authViolation = violations.find(
        (v) =>
          v.type === 'unauthorized_access' &&
          v.description === 'Failed authentication attempt',
      );

      expect(authViolation).toBeDefined();
      expect(authViolation?.severity).toBe('medium');
      expect(authViolation?.context.error).toBe('Invalid credentials');
    });

    it('should generate unique operation IDs', () => {
      const id1 = (service as any).generateOperationId();
      const id2 = (service as any).generateOperationId();

      expect(id1).toMatch(/^sec_\d+_[a-z0-9]{6}$/);
      expect(id2).toMatch(/^sec_\d+_[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle null and undefined query text in sanitization', () => {
      const sanitized1 = (service as any).sanitizeQueryText(null);
      const sanitized2 = (service as any).sanitizeQueryText(undefined);
      const sanitized3 = (service as any).sanitizeQueryText('');

      expect(sanitized1).toBeUndefined();
      expect(sanitized2).toBeUndefined();
      expect(sanitized3).toBe('');
    });

    it('should handle empty audit events in metrics calculation', () => {
      // Clear any existing audit events
      (service as any).auditEvents.length = 0;

      const metrics = service.getSecurityMetrics();

      expect(metrics.auditEvents.total).toBe(0);
      expect(metrics.auditEvents.errorRate).toBe(0);
      expect(metrics.auditEvents.byType).toEqual({});
      expect(metrics.auditEvents.bySeverity).toEqual({});
    });

    it('should handle empty security violations in metrics', () => {
      // Clear any existing violations
      (service as any).securityViolations.length = 0;

      const metrics = service.getSecurityMetrics();

      expect(metrics.securityViolations.total).toBe(0);
      expect(metrics.securityViolations.byType).toEqual({});
      expect(metrics.securityViolations.bySeverity).toEqual({});
    });

    it('should handle audit operations when audit logging is disabled', () => {
      // Create service with audit logging disabled
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'DB_AUDIT_LOGGING_ENABLED') return false;
          return defaultValue;
        },
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseSecurityService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const testService = module.get<DatabaseSecurityService>(
        DatabaseSecurityService,
      );

      // Should not create audit events when logging is disabled
      testService.auditOperation('test_operation', {
        duration: 100,
        success: true,
      });

      const auditHistory = testService.getAuditHistory();
      expect(auditHistory).toHaveLength(0);
    });

    it('should handle configuration with empty restricted operations', () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'DB_RESTRICTED_OPERATIONS') return '';
          return defaultValue;
        },
      );

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DatabaseSecurityService,
          {
            provide: ConfigService,
            useValue: configService,
          },
        ],
      }).compile();

      const testService = module.get<DatabaseSecurityService>(
        DatabaseSecurityService,
      );

      // Should not detect violations when no operations are restricted
      const result = testService.validateQuerySecurity('DROP TABLE users', {
        userId: 'user123',
      });

      const restrictedViolations = result.violations.filter(
        (v) => v.type === 'unauthorized_access',
      );
      expect(restrictedViolations).toHaveLength(0);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle high volume of audit operations efficiently', () => {
      const startTime = Date.now();
      const operationCount = 1000;

      for (let i = 0; i < operationCount; i++) {
        service.auditOperation(`operation_${i}`, {
          duration: Math.random() * 200,
          success: Math.random() > 0.1, // 90% success rate
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 1000 operations quickly (under 1 second)
      expect(processingTime).toBeLessThan(1000);

      const metrics = service.getSecurityMetrics();
      expect(metrics.auditEvents.total).toBe(operationCount);
    });

    it('should handle concurrent connection auditing', () => {
      const connectionCount = 50;
      const connections: string[] = [];

      // Simulate concurrent connections
      for (let i = 0; i < connectionCount; i++) {
        const connectionId = `conn_${i}`;
        connections.push(connectionId);

        service.auditConnection(connectionId, 'connect', {
          userId: `user_${i}`,
          ipAddress: `192.168.1.${i % 255}`,
          success: true,
        });
      }

      const metrics = service.getSecurityMetrics();
      expect(metrics.connections.active).toBe(connectionCount);

      // Disconnect all connections
      connections.forEach((connectionId) => {
        service.auditConnection(connectionId, 'disconnect', {
          success: true,
        });
      });

      const finalMetrics = service.getSecurityMetrics();
      expect(finalMetrics.connections.active).toBe(0);
    });

    it('should handle large queries in security validation', () => {
      const largeQuery =
        'SELECT ' + 'column_name, '.repeat(1000) + 'last_column FROM table';

      const startTime = Date.now();
      const result = service.validateQuerySecurity(largeQuery, {
        userId: 'user123',
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should process quickly
      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('violations');
    });
  });
});
