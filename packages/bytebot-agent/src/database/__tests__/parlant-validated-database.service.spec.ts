/**
 * Comprehensive Unit Test Suite for ParlantValidatedDatabaseService
 *
 * TESTING FRAMEWORK: Jest with NestJS Testing Module
 * TARGET COVERAGE: 95%+ code coverage across all methods and edge cases
 * FOCUS AREAS:
 * - Conversational validation workflow testing
 * - Risk level classification and security mapping
 * - Backup integration and pre-operation safety
 * - Error handling and edge case validation
 * - Performance metrics and caching functionality
 * - Audit trail generation and compliance logging
 *
 * @package @bytebot/bytebot-agent
 * @author Claude Code - Comprehensive Testing Framework
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  ParlantValidatedDatabaseService,
  DatabaseOperationMetadata,
  RiskLevel,
  ConversationalValidationError,
  ParlantDatabaseValidationRequest,
  DatabaseParlantAuditEntry,
} from '../parlant-validated-database.service';
import { DatabaseService } from '../database.service';
import { DatabaseBackupService } from '../database-backup.service';
import {
  ParlantUserContext,
  SecurityLevel,
} from '@shared/types/parlant-integration.types';

// ===== MOCK IMPLEMENTATIONS =====

/**
 * Mock DatabaseService for isolated testing
 */
const mockDatabaseService = {
  getPrismaClient: jest.fn(),
  getMetrics: jest.fn(),
  getHealthStatus: jest.fn(),
  executeRawQuery: jest.fn(),
  executeRawQueryWithReliability: jest.fn(),
  executeWithCircuitBreaker: jest.fn(),
  executeWithRetry: jest.fn(),
  executeWithReliability: jest.fn(),
  getReliabilityMetrics: jest.fn(),
};

/**
 * Mock DatabaseBackupService for testing backup integration
 */
const mockBackupService = {
  createPreOperationBackup: jest.fn(),
  restoreFromBackup: jest.fn(),
  getBackupStatistics: jest.fn(),
  getActiveBackupOperations: jest.fn(),
  getBackupOperation: jest.fn(),
};

/**
 * Mock ConfigService for testing configuration handling
 */
const mockConfigService = {
  get: jest.fn(),
};

/**
 * Test data factory for consistent test contexts
 */
class TestDataFactory {
  static createUserContext(
    overrides: Partial<ParlantUserContext> = {},
  ): ParlantUserContext {
    return {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      permissions: ['read', 'write'],
      roles: ['user'],
      ...overrides,
    };
  }

  static createDatabaseOperationMetadata(
    overrides: Partial<DatabaseOperationMetadata> = {},
  ): DatabaseOperationMetadata {
    return {
      operationType: 'READ',
      tableName: 'test_table',
      affectedRows: 1,
      queryDescription: 'Test database operation',
      dataTypes: ['string', 'number'],
      isDestructive: false,
      requiresBackup: false,
      ...overrides,
    };
  }

  static createValidationRequest(
    overrides: Partial<ParlantDatabaseValidationRequest> = {},
  ): ParlantDatabaseValidationRequest {
    return {
      operationId: 'test-op-123',
      functionName: 'testFunction',
      packageName: 'database-service',
      description: 'Test database operation',
      parameters: { query: 'SELECT * FROM test_table' },
      userContext: this.createUserContext(),
      securityLevel: SecurityLevel._LOW,
      timeout: 5000,
      databaseOperation: this.createDatabaseOperationMetadata(),
      originalQuery: 'SELECT * FROM test_table',
      estimatedImpact: 'LOW',
      ...overrides,
    };
  }
}

// ===== MAIN TEST SUITE =====

describe('ParlantValidatedDatabaseService - Comprehensive Unit Tests', () => {
  let service: ParlantValidatedDatabaseService;
  let module: TestingModule;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Configure default mock returns
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          PARLANT_ENABLED: true,
          PARLANT_CACHE_ENABLED: true,
          PARLANT_AUDIT_ENABLED: true,
        };
        return config[key] ?? defaultValue;
      },
    );

    mockDatabaseService.getPrismaClient.mockResolvedValue({});
    mockDatabaseService.getMetrics.mockResolvedValue({
      connectionCount: 5,
      queryCount: 100,
      averageQueryTime: 50,
    });
    mockDatabaseService.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      uptime: 3600,
    });

    mockBackupService.createPreOperationBackup.mockResolvedValue({
      backupId: 'backup-123',
      backupPath: '/tmp/backup-123.sql',
      backupSize: 1024,
      duration: 500,
      checksum: 'abc123',
      timestamp: new Date(),
      verified: true,
    });

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        ParlantValidatedDatabaseService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: DatabaseBackupService,
          useValue: mockBackupService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ParlantValidatedDatabaseService>(
      ParlantValidatedDatabaseService,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  // ===== INITIALIZATION AND CONFIGURATION TESTS =====

  describe('Service Initialization', () => {
    it('should be defined and properly configured', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ParlantValidatedDatabaseService);
    });

    it('should initialize with correct configuration values', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'PARLANT_ENABLED',
        true,
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'PARLANT_CACHE_ENABLED',
        true,
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'PARLANT_AUDIT_ENABLED',
        true,
      );
    });

    it('should start performance monitoring interval', () => {
      // Verify that the service sets up performance monitoring
      jest.spyOn(global, 'setInterval');

      // Re-create service to test initialization
      const newService = new ParlantValidatedDatabaseService(
        mockDatabaseService as any,
        mockConfigService as any,
        mockBackupService as any,
      );

      expect(setInterval).toHaveBeenCalled();
    });
  });

  // ===== CORE VALIDATION AND EXECUTION TESTS =====

  describe('validateAndExecute Method', () => {
    it('should successfully validate and execute a low-risk read operation', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'READ',
        isDestructive: false,
      });

      const mockOperation = jest
        .fn()
        .mockResolvedValue({ data: 'test-result' });

      const result = await service.validateAndExecute(
        'testReadOperation',
        mockOperation,
        metadata,
        userContext,
      );

      expect(result).toEqual({ data: 'test-result' });
      expect(mockOperation).toHaveBeenCalled();

      // Verify backup was NOT created for low-risk operation
      expect(mockBackupService.createPreOperationBackup).not.toHaveBeenCalled();
    });

    it('should create backup for high-risk destructive operations', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'DELETE',
        isDestructive: true,
        requiresBackup: true,
      });

      const mockOperation = jest.fn().mockResolvedValue({ deletedCount: 1 });

      await service.validateAndExecute(
        'testDeleteOperation',
        mockOperation,
        metadata,
        userContext,
      );

      // Verify backup was created for high-risk operation
      expect(mockBackupService.createPreOperationBackup).toHaveBeenCalledWith({
        operationMetadata: metadata,
        riskLevel: RiskLevel.HIGH,
        requestingUserId: userContext.userId,
        backupReason: 'Pre-operation backup for DELETE operation',
      });
    });

    it('should handle validation failure correctly', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'MIGRATION',
        isDestructive: true,
      });

      // Mock Parlant validation to reject the operation
      const mockOperation = jest.fn();

      // Spy on the private performParlantValidation method
      const performValidationSpy = jest.spyOn(
        service as any,
        'performParlantValidation',
      );
      performValidationSpy.mockResolvedValue({
        approved: false,
        conversationId: 'conv-reject-123',
        reasoning: 'Migration requires administrator approval',
        confidence: 0.95,
        suggestedAlternatives: ['Schedule during maintenance window'],
        executionContext: undefined,
      });

      await expect(
        service.validateAndExecute(
          'testMigration',
          mockOperation,
          metadata,
          userContext,
        ),
      ).rejects.toThrow(ConversationalValidationError);

      expect(mockOperation).not.toHaveBeenCalled();
      performValidationSpy.mockRestore();
    });

    it('should handle operation execution errors and create audit entry', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata();

      const mockOperation = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.validateAndExecute(
          'testFailedOperation',
          mockOperation,
          metadata,
          userContext,
        ),
      ).rejects.toThrow('Database connection failed');

      // Verify error audit entry was created
      const auditTrail = service.getAuditTrail();
      expect(auditTrail).toHaveLength(1);
      expect(auditTrail[0].executionResult).toBe('FAILURE');
      expect(auditTrail[0].functionName).toBe('testFailedOperation');
    });
  });

  // ===== RISK LEVEL DETERMINATION TESTS =====

  describe('Risk Level Classification', () => {
    it('should classify READ operations as LOW risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'READ',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.LOW);
    });

    it('should classify health checks as LOW risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'HEALTH_CHECK',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.LOW);
    });

    it('should classify metrics operations as LOW risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'METRICS',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.LOW);
    });

    it('should classify non-destructive writes as MEDIUM risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'WRITE',
        isDestructive: false,
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.MEDIUM);
    });

    it('should classify destructive writes as HIGH risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'WRITE',
        isDestructive: true,
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should classify delete operations as HIGH risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'DELETE',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.HIGH);
    });

    it('should classify migrations as CRITICAL risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'MIGRATION',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.CRITICAL);
    });

    it('should classify security operations as CRITICAL risk', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'SECURITY',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.CRITICAL);
    });
  });

  // ===== SECURITY LEVEL MAPPING TESTS =====

  describe('Security Level Mapping', () => {
    it('should map LOW risk to _LOW security level', () => {
      const securityLevel = (service as any).mapRiskLevelToSecurityLevel(
        RiskLevel.LOW,
      );
      expect(securityLevel).toBe(SecurityLevel._LOW);
    });

    it('should map MEDIUM risk to _MEDIUM security level', () => {
      const securityLevel = (service as any).mapRiskLevelToSecurityLevel(
        RiskLevel.MEDIUM,
      );
      expect(securityLevel).toBe(SecurityLevel._MEDIUM);
    });

    it('should map HIGH risk to _HIGH security level', () => {
      const securityLevel = (service as any).mapRiskLevelToSecurityLevel(
        RiskLevel.HIGH,
      );
      expect(securityLevel).toBe(SecurityLevel._HIGH);
    });

    it('should map CRITICAL risk to _CRITICAL security level', () => {
      const securityLevel = (service as any).mapRiskLevelToSecurityLevel(
        RiskLevel.CRITICAL,
      );
      expect(securityLevel).toBe(SecurityLevel._CRITICAL);
    });
  });

  // ===== WRAPPED METHOD TESTS =====

  describe('Database Service Method Wrappers', () => {
    const userContext = TestDataFactory.createUserContext();

    it('should successfully wrap getPrismaClient', async () => {
      const mockClient = { $connect: jest.fn() };
      mockDatabaseService.getPrismaClient.mockResolvedValue(mockClient);

      const result = await service.getPrismaClient(userContext);

      expect(result).toBe(mockClient);
      expect(mockDatabaseService.getPrismaClient).toHaveBeenCalled();
    });

    it('should successfully wrap getMetrics', async () => {
      const mockMetrics = { queryCount: 100, connectionCount: 5 };
      mockDatabaseService.getMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getMetrics(userContext);

      expect(result).toEqual(mockMetrics);
      expect(mockDatabaseService.getMetrics).toHaveBeenCalled();
    });

    it('should successfully wrap getHealthStatus', async () => {
      const mockHealth = { status: 'healthy', uptime: 3600 };
      mockDatabaseService.getHealthStatus.mockResolvedValue(mockHealth);

      const result = await service.getHealthStatus(userContext);

      expect(result).toEqual(mockHealth);
      expect(mockDatabaseService.getHealthStatus).toHaveBeenCalled();
    });

    it('should successfully wrap executeRawQuery with validation', async () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const params = [123];
      const mockResult = [{ id: 123, name: 'Test User' }];

      mockDatabaseService.executeRawQuery.mockResolvedValue(mockResult);

      const result = await service.executeRawQuery(query, params, userContext);

      expect(result).toEqual(mockResult);
      expect(mockDatabaseService.executeRawQuery).toHaveBeenCalledWith(
        query,
        params,
      );
    });

    it('should identify destructive queries correctly', () => {
      const destructiveQueries = [
        'DELETE FROM users WHERE id = 1',
        'DROP TABLE old_data',
        'TRUNCATE logs',
        'ALTER TABLE users ADD COLUMN test VARCHAR(255)',
        'UPDATE users SET password = "new_password"',
      ];

      destructiveQueries.forEach((query) => {
        const isDestructive = (service as any).isDestructiveQuery(query);
        expect(isDestructive).toBe(true);
      });
    });

    it('should identify non-destructive queries correctly', () => {
      const safeQueries = [
        'SELECT * FROM users',
        'SELECT COUNT(*) FROM sessions',
        'SHOW TABLES',
        'DESCRIBE users',
      ];

      safeQueries.forEach((query) => {
        const isDestructive = (service as any).isDestructiveQuery(query);
        expect(isDestructive).toBe(false);
      });
    });
  });

  // ===== BACKUP INTEGRATION TESTS =====

  describe('Backup Integration', () => {
    it('should require backup for CRITICAL risk operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'MIGRATION',
      });

      const shouldBackup = (service as any).shouldCreateBackup(
        metadata,
        RiskLevel.CRITICAL,
      );
      expect(shouldBackup).toBe(true);
    });

    it('should require backup for HIGH risk destructive operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'DELETE',
        isDestructive: true,
      });

      const shouldBackup = (service as any).shouldCreateBackup(
        metadata,
        RiskLevel.HIGH,
      );
      expect(shouldBackup).toBe(true);
    });

    it('should require backup when explicitly requested in metadata', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'WRITE',
        requiresBackup: true,
      });

      const shouldBackup = (service as any).shouldCreateBackup(
        metadata,
        RiskLevel.MEDIUM,
      );
      expect(shouldBackup).toBe(true);
    });

    it('should require backup for DELETE operations regardless of risk level', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'DELETE',
      });

      const shouldBackup = (service as any).shouldCreateBackup(
        metadata,
        RiskLevel.LOW,
      );
      expect(shouldBackup).toBe(true);
    });

    it('should not require backup for safe read operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'READ',
        isDestructive: false,
        requiresBackup: false,
      });

      const shouldBackup = (service as any).shouldCreateBackup(
        metadata,
        RiskLevel.LOW,
      );
      expect(shouldBackup).toBe(false);
    });
  });

  // ===== OPERATION IMPACT ESTIMATION TESTS =====

  describe('Operation Impact Estimation', () => {
    it('should estimate CRITICAL impact for security operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'SECURITY',
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('CRITICAL');
    });

    it('should estimate CRITICAL impact for migration operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'MIGRATION',
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('CRITICAL');
    });

    it('should estimate HIGH impact for destructive operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'WRITE',
        isDestructive: true,
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('HIGH');
    });

    it('should estimate HIGH impact for delete operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'DELETE',
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('HIGH');
    });

    it('should estimate MEDIUM impact for large write operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'WRITE',
        affectedRows: 500,
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('MEDIUM');
    });

    it('should estimate LOW impact for small write operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'WRITE',
        affectedRows: 50,
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('LOW');
    });

    it('should estimate MINIMAL impact for read operations', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'READ',
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('MINIMAL');
    });
  });

  // ===== QUERY ANALYSIS TESTS =====

  describe('Query Analysis and Sanitization', () => {
    it('should correctly determine operation type from SELECT queries', () => {
      const queries = [
        'SELECT * FROM users',
        'select id, name from products',
        '  SELECT COUNT(*) FROM sessions  ',
      ];

      queries.forEach((query) => {
        const operationType = (service as any).determineOperationTypeFromQuery(
          query,
        );
        expect(operationType).toBe('READ');
      });
    });

    it('should correctly determine operation type from INSERT queries', () => {
      const queries = [
        'INSERT INTO users (name, email) VALUES ($1, $2)',
        'insert into products (title) values ("test")',
      ];

      queries.forEach((query) => {
        const operationType = (service as any).determineOperationTypeFromQuery(
          query,
        );
        expect(operationType).toBe('WRITE');
      });
    });

    it('should correctly determine operation type from UPDATE queries', () => {
      const queries = [
        'UPDATE users SET name = $1 WHERE id = $2',
        'update products set price = 100',
      ];

      queries.forEach((query) => {
        const operationType = (service as any).determineOperationTypeFromQuery(
          query,
        );
        expect(operationType).toBe('WRITE');
      });
    });

    it('should correctly determine operation type from DELETE queries', () => {
      const queries = [
        'DELETE FROM users WHERE id = $1',
        'delete from sessions where expired = true',
      ];

      queries.forEach((query) => {
        const operationType = (service as any).determineOperationTypeFromQuery(
          query,
        );
        expect(operationType).toBe('DELETE');
      });
    });

    it('should correctly determine operation type from DDL queries', () => {
      const queries = [
        'ALTER TABLE users ADD COLUMN last_login TIMESTAMP',
        'CREATE TABLE new_table (id SERIAL PRIMARY KEY)',
        'CREATE INDEX idx_user_email ON users(email)',
      ];

      queries.forEach((query) => {
        const operationType = (service as any).determineOperationTypeFromQuery(
          query,
        );
        expect(operationType).toBe('MIGRATION');
      });
    });

    it('should sanitize sensitive data in queries for logging', () => {
      const sensitiveQuery =
        'UPDATE users SET password = "secret123", email = "user@test.com" WHERE id = 1234567890123';

      const sanitized = (service as any).sanitizeQueryForLogging(
        sensitiveQuery,
      );

      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('user@test.com');
      expect(sanitized).not.toContain('1234567890123');
      expect(sanitized).toContain('[REDACTED]');
      expect(sanitized).toContain('[NUMBER]');
    });

    it('should truncate very long queries', () => {
      const longQuery =
        'SELECT * FROM users WHERE ' + 'x = 1 AND '.repeat(100) + 'id = 1';

      const sanitized = (service as any).sanitizeQueryForLogging(longQuery);

      expect(sanitized.length).toBeLessThanOrEqual(203); // 200 + '...'
      expect(sanitized).toContain('...');
    });
  });

  // ===== AUDIT TRAIL AND COMPLIANCE TESTS =====

  describe('Audit Trail and Compliance', () => {
    it('should create comprehensive audit entries for successful operations', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata();

      const mockOperation = jest.fn().mockResolvedValue({ data: 'success' });

      await service.validateAndExecute(
        'testAuditOperation',
        mockOperation,
        metadata,
        userContext,
      );

      const auditTrail = service.getAuditTrail();
      expect(auditTrail).toHaveLength(1);

      const auditEntry = auditTrail[0];
      expect(auditEntry.functionName).toBe('testAuditOperation');
      expect(auditEntry.validationResult).toBe('APPROVED');
      expect(auditEntry.executionResult).toBe('SUCCESS');
      expect(auditEntry.userId).toBe(userContext.userId);
      expect(auditEntry.databaseOperation).toEqual(metadata);
      expect(auditEntry.performanceMetrics).toBeDefined();
    });

    it('should generate unique operation IDs', () => {
      const id1 = (service as any).generateOperationId();
      const id2 = (service as any).generateOperationId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^db_parlant_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^db_parlant_\d+_[a-z0-9]+$/);
    });

    it('should generate descriptive action descriptions', () => {
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'DELETE',
        tableName: 'users',
        affectedRows: 5,
        isDestructive: true,
      });

      const description = (service as any).generateActionDescription(
        'deleteUsers',
        metadata,
      );

      expect(description).toContain('deleteUsers');
      expect(description).toContain('DELETE');
      expect(description).toContain('users');
      expect(description).toContain('5');
      expect(description).toContain('DESTRUCTIVE');
    });
  });

  // ===== CACHING AND PERFORMANCE TESTS =====

  describe('Caching and Performance', () => {
    it('should generate consistent cache keys for identical requests', () => {
      const request1 = TestDataFactory.createValidationRequest();
      const request2 = TestDataFactory.createValidationRequest();

      const key1 = (service as any).generateCacheKey(request1);
      const key2 = (service as any).generateCacheKey(request2);

      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different requests', () => {
      const request1 = TestDataFactory.createValidationRequest({
        functionName: 'operation1',
      });
      const request2 = TestDataFactory.createValidationRequest({
        functionName: 'operation2',
      });

      const key1 = (service as any).generateCacheKey(request1);
      const key2 = (service as any).generateCacheKey(request2);

      expect(key1).not.toBe(key2);
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStatistics();

      expect(stats).toHaveProperty('totalValidations');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('averageValidationTime');
    });

    it('should provide database operation statistics', () => {
      const stats = service.getDatabaseOperationStatistics();

      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('operationTypes');
      expect(stats).toHaveProperty('riskLevels');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageExecutionTime');
    });

    it('should clear cache when requested', () => {
      const initialStats = service.getCacheStatistics();

      service.clearCache();

      const clearedStats = service.getCacheStatistics();
      expect(clearedStats.cacheSize).toBe(0);
    });
  });

  // ===== TRANSACTION SUPPORT TESTS =====

  describe('Transaction Support', () => {
    it('should execute multiple operations within a transaction with validation', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'WRITE',
        queryDescription: 'User account setup transaction',
        requiresBackup: true,
      });

      const mockClient = {
        $transaction: jest.fn().mockImplementation((operations) => {
          return Promise.all(operations.map((op) => op(mockClient)));
        }),
      };

      mockDatabaseService.getPrismaClient.mockResolvedValue(mockClient);

      const operations = [
        jest.fn().mockResolvedValue({ id: 1, name: 'User Created' }),
        jest.fn().mockResolvedValue({ id: 1, profileId: 1 }),
        jest.fn().mockResolvedValue({ id: 1, theme: 'dark' }),
      ];

      const result = await service.executeWithTransaction(
        'userAccountSetup',
        operations,
        metadata,
        userContext,
      );

      expect(mockClient.$transaction).toHaveBeenCalledWith(operations);
      expect(mockBackupService.createPreOperationBackup).toHaveBeenCalled();
      expect(result).toEqual([
        { id: 1, name: 'User Created' },
        { id: 1, profileId: 1 },
        { id: 1, theme: 'dark' },
      ]);
    });
  });

  // ===== ERROR HANDLING AND EDGE CASES =====

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing required parameters gracefully', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata();

      // Test with null operation
      await expect(
        service.validateAndExecute(
          'nullOperation',
          null as any,
          metadata,
          userContext,
        ),
      ).rejects.toThrow();
    });

    it('should handle configuration service failures', () => {
      mockConfigService.get.mockImplementation(() => {
        throw new Error('Configuration service unavailable');
      });

      // Service should still function with defaults
      expect(() => {
        new ParlantValidatedDatabaseService(
          mockDatabaseService as any,
          mockConfigService as any,
          mockBackupService as any,
        );
      }).not.toThrow();
    });

    it('should handle backup service failures gracefully', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata({
        operationType: 'DELETE',
        requiresBackup: true,
      });

      mockBackupService.createPreOperationBackup.mockRejectedValue(
        new Error('Backup service unavailable'),
      );

      const mockOperation = jest.fn().mockResolvedValue({ deleted: true });

      await expect(
        service.validateAndExecute(
          'testWithBackupFailure',
          mockOperation,
          metadata,
          userContext,
        ),
      ).rejects.toThrow('Backup service unavailable');

      // Verify operation was not executed due to backup failure
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it('should handle database service method failures', async () => {
      const userContext = TestDataFactory.createUserContext();

      mockDatabaseService.getHealthStatus.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(service.getHealthStatus(userContext)).rejects.toThrow(
        'Database connection lost',
      );
    });

    it('should extract rows affected from various result formats', () => {
      const testCases = [
        { input: { count: 42 }, expected: 42 },
        { input: [1, 2, 3, 4, 5], expected: 5 },
        { input: { id: 1, name: 'test' }, expected: undefined },
        { input: null, expected: undefined },
        { input: undefined, expected: undefined },
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (service as any).extractRowsAffected(input);
        expect(result).toBe(expected);
      });
    });
  });

  // ===== INTEGRATION WITH BACKUP SERVICE TESTS =====

  describe('Backup Service Integration', () => {
    it('should retrieve backup statistics from backup service', () => {
      const mockStats = {
        totalBackups: 10,
        averageBackupTime: '500ms',
        totalBackupSize: '10MB',
        activeBackups: 0,
      };

      mockBackupService.getBackupStatistics.mockReturnValue(mockStats);

      const stats = service.getBackupStatistics();
      expect(stats).toEqual(mockStats);
      expect(mockBackupService.getBackupStatistics).toHaveBeenCalled();
    });

    it('should retrieve active backup operations from backup service', () => {
      const mockOperations = [
        {
          backupId: 'backup-1',
          operationId: 'op-1',
          backupType: 'FULL',
          priority: 'HIGH',
        },
      ];

      mockBackupService.getActiveBackupOperations.mockReturnValue(
        mockOperations,
      );

      const operations = service.getActiveBackupOperations();
      expect(operations).toEqual(mockOperations);
      expect(mockBackupService.getActiveBackupOperations).toHaveBeenCalled();
    });
  });

  // ===== PERFORMANCE OPTIMIZATION TESTS =====

  describe('Performance Optimization', () => {
    it('should execute operations with timeout when specified', async () => {
      const userContext = TestDataFactory.createUserContext();
      const metadata = TestDataFactory.createDatabaseOperationMetadata();

      // Mock a slow operation
      const slowOperation = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise((resolve) =>
              setTimeout(() => resolve('slow-result'), 100),
            ),
        );

      // Set up execution context with timeout
      const mockExecutionContext = {
        monitoringLevel: 'COMPREHENSIVE' as const,
        safeguards: ['query_logging'],
        timeoutMs: 50, // Shorter than operation duration
        retryAttempts: 1,
      };

      // Spy on the performParlantValidation to control the execution context
      const performValidationSpy = jest.spyOn(
        service as any,
        'performParlantValidation',
      );
      performValidationSpy.mockResolvedValue({
        approved: true,
        conversationId: 'conv-timeout-test',
        reasoning: 'Approved for timeout test',
        confidence: 0.95,
        executionContext: mockExecutionContext,
      });

      await expect(
        service.validateAndExecute(
          'slowOperation',
          slowOperation,
          metadata,
          userContext,
        ),
      ).rejects.toThrow('Operation timeout');

      performValidationSpy.mockRestore();
    });

    it('should update validation metrics correctly', () => {
      const initialStats = service.getCacheStatistics();
      const initialValidations = initialStats.totalValidations;

      // Simulate metric update
      (service as any).updateValidationMetrics(250);

      const updatedStats = service.getCacheStatistics();
      expect(updatedStats.totalValidations).toBe(initialValidations + 1);
      expect(updatedStats.averageValidationTime).toContain('250');
    });
  });
});
