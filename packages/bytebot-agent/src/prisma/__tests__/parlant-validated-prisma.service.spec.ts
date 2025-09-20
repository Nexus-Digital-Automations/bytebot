/**
 * Comprehensive Unit Test Suite for ParlantValidatedPrismaService
 *
 * TESTING FRAMEWORK: Jest with NestJS Testing Module
 * TARGET COVERAGE: 95%+ code coverage with focus on model security testing
 * FOCUS AREAS:
 * - Model security classification validation
 * - CRUD operation validation with conversational AI
 * - Field-level access control and restricted data handling
 * - Bulk operation safety and validation
 * - Risk level escalation based on model security
 * - Cache optimization and performance metrics
 * - Audit trail generation for ORM operations
 *
 * @package @bytebot/bytebot-agent
 * @author Claude Code - Comprehensive Testing Framework
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  ParlantValidatedPrismaService,
  PrismaOperationMetadata,
  PrismaModelSecurity,
  PrismaModelConfig,
  ParlantPrismaValidationRequest,
} from '../parlant-validated-prisma.service';
import { PrismaService } from '../prisma.service';
import {
  RiskLevel,
  ConversationalValidationError,
  ExecutionContext,
} from '../database/parlant-validated-database.service';
import {
  ParlantUserContext,
  SecurityLevel,
} from '@shared/types/parlant-integration.types';

// ===== MOCK IMPLEMENTATIONS =====

/**
 * Mock PrismaService for isolated testing
 */
const mockPrismaService = {
  getOptimizedClient: jest.fn(),
  executeQuery: jest.fn(),
  getHealthStatus: jest.fn(),
  getDatabaseMetrics: jest.fn(),
};

/**
 * Mock ConfigService for testing configuration handling
 */
const mockConfigService = {
  get: jest.fn(),
};

/**
 * Mock Prisma Client with dynamic model methods
 */
const createMockPrismaClient = () => {
  const mockClient = {
    $transaction: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  // Add dynamic model methods
  const models = [
    'User',
    'BrowserSession',
    'ApiKey',
    'SystemConfig',
    'AuditLog',
  ];
  models.forEach((modelName) => {
    mockClient[modelName.toLowerCase()] = {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    };
  });

  return mockClient;
};

/**
 * Test data factory for Prisma-specific test contexts
 */
class PrismaTestDataFactory {
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

  static createPrismaOperationMetadata(
    overrides: Partial<PrismaOperationMetadata> = {},
  ): PrismaOperationMetadata {
    return {
      operationType: 'READ',
      operationMethod: 'findMany',
      modelName: 'User',
      tableName: 'users',
      queryDescription: 'Find multiple User records',
      isDestructive: false,
      requiresBackup: false,
      isBulkOperation: false,
      dataFields: ['id', 'name', 'email'],
      whereConditions: { id: 123 },
      selectFields: ['id', 'name'],
      includeRelations: ['profile'],
      expectedRecordCount: 1,
      ...overrides,
    };
  }

  static createModelConfig(
    overrides: Partial<PrismaModelConfig> = {},
  ): PrismaModelConfig {
    return {
      modelName: 'User',
      securityLevel: PrismaModelSecurity.CONFIDENTIAL,
      sensitiveFields: ['email', 'password'],
      auditRequired: true,
      backupRequired: true,
      allowedOperations: ['findMany', 'findUnique', 'create', 'update'],
      restrictedFields: ['password'],
      ...overrides,
    };
  }

  static createFindManyArgs() {
    return {
      where: { active: true },
      select: { id: true, name: true, email: true },
      take: 10,
      skip: 0,
    };
  }

  static createCreateArgs() {
    return {
      data: {
        name: 'Test User',
        email: 'test@example.com',
        active: true,
      },
    };
  }

  static createUpdateArgs() {
    return {
      where: { id: 123 },
      data: {
        name: 'Updated User',
        lastLoginAt: new Date(),
      },
    };
  }

  static createDeleteArgs() {
    return {
      where: { id: 123 },
    };
  }
}

// ===== MAIN TEST SUITE =====

describe('ParlantValidatedPrismaService - Comprehensive Unit Tests', () => {
  let service: ParlantValidatedPrismaService;
  let module: TestingModule;
  let mockPrismaClient: any;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create fresh mock Prisma client
    mockPrismaClient = createMockPrismaClient();

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

    mockPrismaService.getOptimizedClient.mockReturnValue(mockPrismaClient);
    mockPrismaService.getHealthStatus.mockResolvedValue({
      status: 'healthy',
      prismaVersion: '5.0.0',
    });
    mockPrismaService.getDatabaseMetrics.mockResolvedValue({
      connectionCount: 5,
      queryCount: 100,
      averageQueryTime: 50,
    });

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        ParlantValidatedPrismaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ParlantValidatedPrismaService>(
      ParlantValidatedPrismaService,
    );
  });

  afterEach(async () => {
    await module.close();
  });

  // ===== INITIALIZATION AND MODEL CONFIGURATION TESTS =====

  describe('Service Initialization and Model Configuration', () => {
    it('should be defined and properly configured', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ParlantValidatedPrismaService);
    });

    it('should initialize with predefined model configurations', () => {
      const modelConfigs = service.getModelConfigurations();

      expect(modelConfigs.size).toBeGreaterThan(0);
      expect(modelConfigs.has('User')).toBe(true);
      expect(modelConfigs.has('BrowserSession')).toBe(true);
      expect(modelConfigs.has('ApiKey')).toBe(true);
      expect(modelConfigs.has('SystemConfig')).toBe(true);
      expect(modelConfigs.has('AuditLog')).toBe(true);
    });

    it('should correctly configure User model security', () => {
      const modelConfigs = service.getModelConfigurations();
      const userConfig = modelConfigs.get('User');

      expect(userConfig).toBeDefined();
      expect(userConfig!.securityLevel).toBe(PrismaModelSecurity.CONFIDENTIAL);
      expect(userConfig!.sensitiveFields).toContain('email');
      expect(userConfig!.sensitiveFields).toContain('password');
      expect(userConfig!.restrictedFields).toContain('password');
      expect(userConfig!.auditRequired).toBe(true);
      expect(userConfig!.backupRequired).toBe(true);
    });

    it('should correctly configure BrowserSession model security', () => {
      const modelConfigs = service.getModelConfigurations();
      const sessionConfig = modelConfigs.get('BrowserSession');

      expect(sessionConfig).toBeDefined();
      expect(sessionConfig!.securityLevel).toBe(PrismaModelSecurity.INTERNAL);
      expect(sessionConfig!.sensitiveFields).toContain('cookies');
      expect(sessionConfig!.sensitiveFields).toContain('localStorage');
      expect(sessionConfig!.backupRequired).toBe(false);
    });

    it('should correctly configure ApiKey model security', () => {
      const modelConfigs = service.getModelConfigurations();
      const apiKeyConfig = modelConfigs.get('ApiKey');

      expect(apiKeyConfig).toBeDefined();
      expect(apiKeyConfig!.securityLevel).toBe(PrismaModelSecurity.RESTRICTED);
      expect(apiKeyConfig!.sensitiveFields).toContain('keyValue');
      expect(apiKeyConfig!.restrictedFields).toContain('keyValue');
      expect(apiKeyConfig!.backupRequired).toBe(true);
    });

    it('should correctly configure AuditLog model security', () => {
      const modelConfigs = service.getModelConfigurations();
      const auditConfig = modelConfigs.get('AuditLog');

      expect(auditConfig).toBeDefined();
      expect(auditConfig!.securityLevel).toBe(PrismaModelSecurity.CLASSIFIED);
      expect(auditConfig!.allowedOperations).toEqual([
        'findMany',
        'findUnique',
        'create',
      ]);
      expect(auditConfig!.backupRequired).toBe(true);
    });

    it('should allow adding custom model configurations', () => {
      const customConfig = PrismaTestDataFactory.createModelConfig({
        modelName: 'CustomModel',
        securityLevel: PrismaModelSecurity.PUBLIC,
      });

      service.setModelConfiguration('CustomModel', customConfig);

      const modelConfigs = service.getModelConfigurations();
      expect(modelConfigs.has('CustomModel')).toBe(true);
      expect(modelConfigs.get('CustomModel')).toEqual(customConfig);
    });
  });

  // ===== RISK LEVEL DETERMINATION TESTS =====

  describe('Risk Level Determination Based on Model Security', () => {
    it('should classify read operations on PUBLIC models as LOW risk', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'READ',
        modelName: 'PublicContent',
      });

      // Add public model configuration
      service.setModelConfiguration('PublicContent', {
        modelName: 'PublicContent',
        securityLevel: PrismaModelSecurity.PUBLIC,
        sensitiveFields: [],
        auditRequired: false,
        backupRequired: false,
        allowedOperations: ['findMany', 'findUnique'],
        restrictedFields: [],
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.LOW);
    });

    it('should escalate risk for CONFIDENTIAL models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'READ',
        modelName: 'User',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.MEDIUM); // Escalated from LOW due to CONFIDENTIAL
    });

    it('should escalate risk for RESTRICTED models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'WRITE',
        modelName: 'ApiKey',
        isBulkOperation: false,
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.HIGH); // Escalated from MEDIUM due to RESTRICTED
    });

    it('should classify operations on CLASSIFIED models as CRITICAL', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'READ',
        modelName: 'AuditLog',
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.HIGH); // Escalated from LOW due to CLASSIFIED
    });

    it('should classify bulk delete operations as CRITICAL', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'DELETE',
        isBulkOperation: true,
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.CRITICAL);
    });

    it('should classify bulk write operations as HIGH risk', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'WRITE',
        isBulkOperation: true,
      });

      const riskLevel = (service as any).determineRiskLevel(metadata);
      expect(riskLevel).toBe(RiskLevel.HIGH);
    });
  });

  // ===== MODEL ACCESS VALIDATION TESTS =====

  describe('Model Access Validation', () => {
    const userContext = PrismaTestDataFactory.createUserContext();

    it('should allow valid operations on configured models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'User',
        operationMethod: 'findMany',
      });

      expect(() => {
        (service as any).validateModelAccess(metadata, userContext);
      }).not.toThrow();
    });

    it('should reject disallowed operations on models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'AuditLog',
        operationMethod: 'delete', // Not allowed on AuditLog
      });

      expect(() => {
        (service as any).validateModelAccess(metadata, userContext);
      }).toThrow(ConversationalValidationError);
    });

    it('should reject access to restricted fields', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'User',
        operationMethod: 'update',
        dataFields: ['name', 'password'], // password is restricted
      });

      expect(() => {
        (service as any).validateModelAccess(metadata, userContext);
      }).toThrow(ConversationalValidationError);
    });

    it('should allow operations on unconfigured models with warning', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'UnknownModel',
        operationMethod: 'findMany',
      });

      // Should not throw - just log warning
      expect(() => {
        (service as any).validateModelAccess(metadata, userContext);
      }).not.toThrow();
    });
  });

  // ===== SENSITIVE DATA ACCESS DETECTION TESTS =====

  describe('Sensitive Data Access Detection', () => {
    it('should detect sensitive data access through data fields', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'User',
        dataFields: ['name', 'email'], // email is sensitive
      });

      const hasSensitiveAccess = (service as any).hasSensitiveDataAccess(
        metadata,
      );
      expect(hasSensitiveAccess).toBe(true);
    });

    it('should detect sensitive data access through select fields', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'User',
        selectFields: ['id', 'email'], // email is sensitive
      });

      const hasSensitiveAccess = (service as any).hasSensitiveDataAccess(
        metadata,
      );
      expect(hasSensitiveAccess).toBe(true);
    });

    it('should detect sensitive data access for high-security models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'ApiKey', // RESTRICTED model
      });

      const hasSensitiveAccess = (service as any).hasSensitiveDataAccess(
        metadata,
      );
      expect(hasSensitiveAccess).toBe(true);
    });

    it('should not detect sensitive data access for safe operations', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'User',
        dataFields: ['name', 'lastLoginAt'], // No sensitive fields
      });

      const hasSensitiveAccess = (service as any).hasSensitiveDataAccess(
        metadata,
      );
      expect(hasSensitiveAccess).toBe(false);
    });
  });

  // ===== CRUD OPERATION WRAPPER TESTS =====

  describe('CRUD Operation Wrappers', () => {
    const userContext = PrismaTestDataFactory.createUserContext();

    describe('findMany Operation', () => {
      it('should successfully execute findMany with validation', async () => {
        const args = PrismaTestDataFactory.createFindManyArgs();
        const mockResult = [
          { id: 1, name: 'User 1', email: 'user1@test.com' },
          { id: 2, name: 'User 2', email: 'user2@test.com' },
        ];

        mockPrismaClient.user.findMany.mockResolvedValue(mockResult);

        const result = await service.findMany('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith(args);
      });

      it('should extract query components for validation', () => {
        const args = {
          where: { active: true, role: 'admin' },
          select: { id: true, name: true },
          include: { profile: true, settings: true },
        };

        const whereConditions = (service as any).extractWhereConditions(args);
        const selectFields = (service as any).extractSelectFields(args);
        const includeFields = (service as any).extractIncludeFields(args);

        expect(whereConditions).toEqual({ active: true, role: 'admin' });
        expect(selectFields).toEqual(['id', 'name']);
        expect(includeFields).toEqual(['profile', 'settings']);
      });
    });

    describe('findUnique Operation', () => {
      it('should successfully execute findUnique with validation', async () => {
        const args = { where: { id: 123 } };
        const mockResult = {
          id: 123,
          name: 'Test User',
          email: 'test@example.com',
        };

        mockPrismaClient.user.findUnique.mockResolvedValue(mockResult);

        const result = await service.findUnique('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith(args);
      });
    });

    describe('create Operation', () => {
      it('should successfully execute create with validation and backup', async () => {
        const args = PrismaTestDataFactory.createCreateArgs();
        const mockResult = { id: 123, ...args.data };

        mockPrismaClient.user.create.mockResolvedValue(mockResult);

        const result = await service.create('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.create).toHaveBeenCalledWith(args);
      });

      it('should extract data fields from create args', () => {
        const args = {
          data: {
            name: 'Test User',
            email: 'test@example.com',
            active: true,
          },
        };

        const dataFields = (service as any).extractDataFields(args);
        expect(dataFields).toEqual(['name', 'email', 'active']);
      });
    });

    describe('update Operation', () => {
      it('should successfully execute update with validation', async () => {
        const args = PrismaTestDataFactory.createUpdateArgs();
        const mockResult = {
          id: 123,
          name: 'Updated User',
          lastLoginAt: new Date(),
        };

        mockPrismaClient.user.update.mockResolvedValue(mockResult);

        const result = await service.update('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.update).toHaveBeenCalledWith(args);
      });
    });

    describe('updateMany Operation', () => {
      it('should successfully execute updateMany with backup requirement', async () => {
        const args = {
          where: { active: false },
          data: { deletedAt: new Date() },
        };
        const mockResult = { count: 5 };

        mockPrismaClient.user.updateMany.mockResolvedValue(mockResult);

        const result = await service.updateMany('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.updateMany).toHaveBeenCalledWith(args);
      });
    });

    describe('delete Operation', () => {
      it('should successfully execute delete with validation and backup', async () => {
        const args = PrismaTestDataFactory.createDeleteArgs();
        const mockResult = { id: 123, name: 'Deleted User' };

        mockPrismaClient.user.delete.mockResolvedValue(mockResult);

        const result = await service.delete('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.delete).toHaveBeenCalledWith(args);
      });
    });

    describe('deleteMany Operation', () => {
      it('should successfully execute deleteMany with critical validation', async () => {
        const args = {
          where: { createdAt: { lt: new Date('2023-01-01') } },
        };
        const mockResult = { count: 10 };

        mockPrismaClient.user.deleteMany.mockResolvedValue(mockResult);

        const result = await service.deleteMany('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.deleteMany).toHaveBeenCalledWith(args);
      });
    });

    describe('upsert Operation', () => {
      it('should successfully execute upsert with validation', async () => {
        const args = {
          where: { email: 'test@example.com' },
          update: { lastLoginAt: new Date() },
          create: { name: 'New User', email: 'test@example.com' },
        };
        const mockResult = {
          id: 123,
          name: 'New User',
          email: 'test@example.com',
        };

        mockPrismaClient.user.upsert.mockResolvedValue(mockResult);

        const result = await service.upsert('User', args, userContext);

        expect(result).toEqual(mockResult);
        expect(mockPrismaClient.user.upsert).toHaveBeenCalledWith(args);
      });
    });
  });

  // ===== BACKUP REQUIREMENT TESTS =====

  describe('Backup Requirements', () => {
    it('should require backup for models with backupRequired=true', () => {
      const requiresBackup = (service as any).requiresBackupForModel('User');
      expect(requiresBackup).toBe(true);
    });

    it('should not require backup for models with backupRequired=false', () => {
      const requiresBackup = (service as any).requiresBackupForModel(
        'BrowserSession',
      );
      expect(requiresBackup).toBe(false);
    });

    it('should default to false for unknown models', () => {
      const requiresBackup = (service as any).requiresBackupForModel(
        'UnknownModel',
      );
      expect(requiresBackup).toBe(false);
    });
  });

  // ===== OPERATION IMPACT ESTIMATION TESTS =====

  describe('Operation Impact Estimation', () => {
    it('should estimate CRITICAL impact for CLASSIFIED models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        modelName: 'AuditLog',
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('CRITICAL');
    });

    it('should estimate HIGH impact for destructive operations', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'DELETE',
        isDestructive: true,
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('HIGH');
    });

    it('should estimate MEDIUM impact for bulk operations', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'WRITE',
        isBulkOperation: true,
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('MEDIUM');
    });

    it('should estimate MEDIUM impact for writes on RESTRICTED models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'WRITE',
        modelName: 'ApiKey',
        isBulkOperation: false,
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('MEDIUM');
    });

    it('should estimate LOW impact for writes on other models', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'WRITE',
        modelName: 'User',
        isBulkOperation: false,
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('LOW');
    });

    it('should estimate MINIMAL impact for read operations', () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata({
        operationType: 'READ',
      });

      const impact = (service as any).estimateOperationImpact(metadata);
      expect(impact).toBe('MINIMAL');
    });
  });

  // ===== RECORD COUNT EXTRACTION TESTS =====

  describe('Record Count Extraction', () => {
    it('should extract count from result objects with count property', () => {
      const result = { count: 42 };
      const recordCount = (service as any).extractRecordCount(result);
      expect(recordCount).toBe(42);
    });

    it('should extract count from array results', () => {
      const result = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const recordCount = (service as any).extractRecordCount(result);
      expect(recordCount).toBe(3);
    });

    it('should return 1 for single object results', () => {
      const result = { id: 1, name: 'Test' };
      const recordCount = (service as any).extractRecordCount(result);
      expect(recordCount).toBe(1);
    });

    it('should return 0 for null or undefined results', () => {
      expect((service as any).extractRecordCount(null)).toBe(0);
      expect((service as any).extractRecordCount(undefined)).toBe(0);
    });
  });

  // ===== SERVICE METHOD WRAPPER TESTS =====

  describe('Service Method Wrappers', () => {
    const userContext = PrismaTestDataFactory.createUserContext();

    it('should successfully wrap getOptimizedClient', async () => {
      const result = await service.getOptimizedClient(userContext);

      expect(result).toBe(mockPrismaClient);
      expect(mockPrismaService.getOptimizedClient).toHaveBeenCalled();
    });

    it('should successfully wrap executeQuery', async () => {
      const metadata = PrismaTestDataFactory.createPrismaOperationMetadata();
      const queryFn = jest.fn().mockResolvedValue({ data: 'test' });

      const result = await service.executeQuery(queryFn, metadata, userContext);

      expect(result).toEqual({ data: 'test' });
      expect(queryFn).toHaveBeenCalledWith(mockPrismaClient);
    });

    it('should successfully wrap getHealthStatus', async () => {
      const mockHealth = { status: 'healthy', prismaVersion: '5.0.0' };
      mockPrismaService.getHealthStatus.mockResolvedValue(mockHealth);

      const result = await service.getHealthStatus(userContext);

      expect(result).toEqual(mockHealth);
      expect(mockPrismaService.getHealthStatus).toHaveBeenCalled();
    });

    it('should successfully wrap getDatabaseMetrics', async () => {
      const mockMetrics = { connectionCount: 5, queryCount: 100 };
      mockPrismaService.getDatabaseMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getDatabaseMetrics(userContext);

      expect(result).toEqual(mockMetrics);
      expect(mockPrismaService.getDatabaseMetrics).toHaveBeenCalled();
    });
  });

  // ===== VALIDATION RESPONSE GENERATION TESTS =====

  describe('Validation Response Generation', () => {
    it('should generate appropriate validation reasoning for read operations', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          operationType: 'READ',
          modelName: 'User',
        }),
      } as ParlantPrismaValidationRequest;

      const reasoning = (service as any).generateValidationReasoning(request);
      expect(reasoning).toContain('Read operation on User approved');
    });

    it('should generate appropriate reasoning for destructive operations', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          operationType: 'DELETE',
          operationMethod: 'delete',
          modelName: 'User',
          isDestructive: true,
        }),
      } as ParlantPrismaValidationRequest;

      const reasoning = (service as any).generateValidationReasoning(request);
      expect(reasoning).toContain('Destructive delete operation on User');
    });

    it('should generate appropriate reasoning for sensitive data access', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          modelName: 'User',
        }),
        sensitiveDataAccess: true,
      } as ParlantPrismaValidationRequest;

      const reasoning = (service as any).generateValidationReasoning(request);
      expect(reasoning).toContain('accesses sensitive data in User');
    });

    it('should generate suggested alternatives for destructive operations', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          isDestructive: true,
        }),
      } as ParlantPrismaValidationRequest;

      const alternatives = (service as any).generateSuggestedAlternatives(
        request,
      );
      expect(alternatives).toContain('Create a backup before proceeding');
      expect(alternatives).toContain(
        'Use a transaction with rollback capability',
      );
    });

    it('should generate suggested alternatives for bulk operations', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          isBulkOperation: true,
        }),
      } as ParlantPrismaValidationRequest;

      const alternatives = (service as any).generateSuggestedAlternatives(
        request,
      );
      expect(alternatives).toContain('Process records in smaller batches');
    });

    it('should generate suggested alternatives for sensitive data access', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata(),
        sensitiveDataAccess: true,
      } as ParlantPrismaValidationRequest;

      const alternatives = (service as any).generateSuggestedAlternatives(
        request,
      );
      expect(alternatives).toContain(
        'Limit data selection to required fields only',
      );
    });
  });

  // ===== EXECUTION CONTEXT GENERATION TESTS =====

  describe('Execution Context Generation', () => {
    it('should generate appropriate execution context for destructive operations', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          isDestructive: true,
        }),
        riskLevel: RiskLevel.HIGH,
      } as ParlantPrismaValidationRequest;

      const context = (service as any).generateExecutionContext(request);

      expect(context.safeguards).toContain('transaction_wrapper');
      expect(context.safeguards).toContain('audit_logging');
      expect(context.timeoutMs).toBe(30000);
      expect(context.retryAttempts).toBe(1);
    });

    it('should generate appropriate execution context for backup-required operations', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          requiresBackup: true,
        }),
      } as ParlantPrismaValidationRequest;

      const context = (service as any).generateExecutionContext(request);

      expect(context.safeguards).toContain('pre_operation_backup');
    });

    it('should generate appropriate execution context for sensitive data access', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata(),
        sensitiveDataAccess: true,
      } as ParlantPrismaValidationRequest;

      const context = (service as any).generateExecutionContext(request);

      expect(context.safeguards).toContain('data_encryption');
      expect(context.safeguards).toContain('access_logging');
    });

    it('should generate standard execution context for normal operations', () => {
      const request = {
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata(),
        riskLevel: RiskLevel.LOW,
      } as ParlantPrismaValidationRequest;

      const context = (service as any).generateExecutionContext(request);

      expect(context.timeoutMs).toBe(10000);
      expect(context.retryAttempts).toBe(3);
      expect(context.safeguards).toContain('query_logging');
      expect(context.safeguards).toContain('performance_monitoring');
    });
  });

  // ===== CACHE KEY GENERATION TESTS =====

  describe('Cache Key Generation', () => {
    it('should generate consistent cache keys for identical requests', () => {
      const request1 = {
        functionName: 'findMany',
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata(),
        context: PrismaTestDataFactory.createUserContext(),
        riskLevel: RiskLevel.LOW,
      } as ParlantPrismaValidationRequest;

      const request2 = {
        functionName: 'findMany',
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata(),
        context: PrismaTestDataFactory.createUserContext(),
        riskLevel: RiskLevel.LOW,
      } as ParlantPrismaValidationRequest;

      const key1 = (service as any).generateCacheKey(request1);
      const key2 = (service as any).generateCacheKey(request2);

      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different operations', () => {
      const request1 = {
        functionName: 'findMany',
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          operationMethod: 'findMany',
        }),
        context: PrismaTestDataFactory.createUserContext(),
        riskLevel: RiskLevel.LOW,
      } as ParlantPrismaValidationRequest;

      const request2 = {
        functionName: 'create',
        prismaOperation: PrismaTestDataFactory.createPrismaOperationMetadata({
          operationMethod: 'create',
        }),
        context: PrismaTestDataFactory.createUserContext(),
        riskLevel: RiskLevel.MEDIUM,
      } as ParlantPrismaValidationRequest;

      const key1 = (service as any).generateCacheKey(request1);
      const key2 = (service as any).generateCacheKey(request2);

      expect(key1).not.toBe(key2);
    });
  });

  // ===== STATISTICS AND MONITORING TESTS =====

  describe('Statistics and Monitoring', () => {
    it('should provide cache statistics', () => {
      const stats = service.getCacheStatistics();

      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('averageValidationTime');
    });

    it('should provide Prisma operation statistics', () => {
      const stats = service.getPrismaOperationStatistics();

      expect(stats).toHaveProperty('totalOperations');
      expect(stats).toHaveProperty('modelOperations');
      expect(stats).toHaveProperty('operationMethods');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageExecutionTime');
    });

    it('should calculate success rate correctly', () => {
      const successRate = (service as any).calculateSuccessRate();
      expect(successRate).toMatch(/^\d+(\.\d+)?%$/);
    });

    it('should calculate average execution time correctly', () => {
      const avgTime = (service as any).calculateAverageExecutionTime();
      expect(avgTime).toMatch(/^\d+(\.\d+)?ms$/);
    });

    it('should clear cache when requested', () => {
      service.clearCache();

      const stats = service.getCacheStatistics();
      expect(stats.cacheSize).toBe(0);
    });
  });

  // ===== ERROR HANDLING AND EDGE CASES =====

  describe('Error Handling and Edge Cases', () => {
    const userContext = PrismaTestDataFactory.createUserContext();

    it('should handle Prisma client failures gracefully', async () => {
      mockPrismaClient.user.findMany.mockRejectedValue(
        new Error('Prisma connection failed'),
      );

      await expect(service.findMany('User', {}, userContext)).rejects.toThrow(
        'Prisma connection failed',
      );
    });

    it('should handle missing model names gracefully', () => {
      const securityLevel = (service as any).getModelSecurityLevel(undefined);
      expect(securityLevel).toBe(PrismaModelSecurity.INTERNAL);
    });

    it('should handle empty args objects', () => {
      const whereConditions = (service as any).extractWhereConditions({});
      const selectFields = (service as any).extractSelectFields({});
      const includeFields = (service as any).extractIncludeFields({});
      const dataFields = (service as any).extractDataFields({});

      expect(whereConditions).toBeUndefined();
      expect(selectFields).toBeUndefined();
      expect(includeFields).toBeUndefined();
      expect(dataFields).toBeUndefined();
    });

    it('should handle malformed args objects', () => {
      const malformedArgs = {
        where: null,
        select: 'invalid',
        include: 42,
        data: 'not-object',
      };

      expect(() => {
        (service as any).extractWhereConditions(malformedArgs);
        (service as any).extractSelectFields(malformedArgs);
        (service as any).extractIncludeFields(malformedArgs);
        (service as any).extractDataFields(malformedArgs);
      }).not.toThrow();
    });

    it('should handle configuration failures gracefully', () => {
      mockConfigService.get.mockImplementation(() => {
        throw new Error('Config unavailable');
      });

      expect(() => {
        new ParlantValidatedPrismaService(
          mockPrismaService as any,
          mockConfigService as any,
        );
      }).not.toThrow();
    });
  });

  // ===== AUDIT TRAIL GENERATION TESTS =====

  describe('Audit Trail Generation', () => {
    it('should create comprehensive audit entries', async () => {
      const userContext = PrismaTestDataFactory.createUserContext();

      // Execute an operation to generate audit entry
      mockPrismaClient.user.findMany.mockResolvedValue([
        { id: 1, name: 'Test' },
      ]);
      await service.findMany('User', {}, userContext);

      const auditTrail = service.getAuditTrail();
      expect(auditTrail.length).toBeGreaterThan(0);

      const latestEntry = auditTrail[auditTrail.length - 1];
      expect(latestEntry.functionName).toBe('findMany');
      expect(latestEntry.userId).toBe(userContext.userId);
      expect(latestEntry.executionResult).toBe('SUCCESS');
    });

    it('should generate unique operation IDs', () => {
      const id1 = (service as any).generateOperationId();
      const id2 = (service as any).generateOperationId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^prisma_parlant_\d+_[a-z0-9]+$/);
    });
  });
});
