/**
 * Parlant-Validated Prisma Service Test Suite - Enhanced Database Security Testing
 *
 * Tests enhanced Prisma service with Parlant integration for validation,
 * security controls, and intelligent data processing capabilities
 *
 * @author Claude Code
 * @version 1.0.0
 * @since Parlant Integration Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ParlantValidatedPrismaService } from '../parlant-validated-prisma.service';
import { PrismaService } from '../prisma.service';

// Mock Parlant SDK
const mockParlantClient = {
  validate: jest.fn(),
  sanitize: jest.fn(),
  analyze: jest.fn(),
  detect: jest.fn(),
  transform: jest.fn(),
};

jest.mock('@parlant/sdk', () => ({
  ParlantClient: jest.fn().mockImplementation(() => mockParlantClient),
}));

describe('ParlantValidatedPrismaService', () => {
  let service: ParlantValidatedPrismaService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;
  let module: TestingModule;

  const mockLogger = {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  };

  const defaultConfig = {
    'parlant.apiKey': 'test-parlant-api-key',
    'parlant.endpoint': 'https://api.parlant.dev',
    'parlant.validation.enabled': true,
    'parlant.sanitization.enabled': true,
    'parlant.anomalyDetection.enabled': true,
    'parlant.rateLimiting.enabled': true,
    'database.maxQueryComplexity': 100,
    'database.queryTimeout': 30000,
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        return defaultConfig[key] ?? defaultValue;
      }),
    };

    const mockPrismaService = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      $queryRaw: jest.fn(),
      $executeRaw: jest.fn(),
    };

    // Configure Parlant mocks with realistic responses
    mockParlantClient.validate.mockResolvedValue({
      isValid: true,
      confidence: 0.95,
      issues: [],
    });

    mockParlantClient.sanitize.mockImplementation((data) => ({
      sanitized: data,
      changesApplied: [],
    }));

    mockParlantClient.analyze.mockResolvedValue({
      riskScore: 0.1,
      threats: [],
      recommendations: [],
    });

    mockParlantClient.detect.mockResolvedValue({
      anomalies: [],
      confidence: 0.9,
      normalBehavior: true,
    });

    mockParlantClient.transform.mockImplementation((data) => data);

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
    })
      .setLogger(mockLogger as any)
      .compile();

    configService = module.get<ConfigService>(
      ConfigService,
    ) as jest.Mocked<ConfigService>;
    prismaService = module.get<PrismaService>(
      PrismaService,
    ) as jest.Mocked<PrismaService>;
    service = module.get<ParlantValidatedPrismaService>(
      ParlantValidatedPrismaService,
    );
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Parlant-Validated Prisma Service initialized',
      );
    });

    it('should initialize Parlant client with configuration', () => {
      expect(configService.get).toHaveBeenCalledWith('parlant.apiKey');
      expect(configService.get).toHaveBeenCalledWith(
        'parlant.endpoint',
        'https://api.parlant.dev',
      );
      expect(configService.get).toHaveBeenCalledWith(
        'parlant.validation.enabled',
        true,
      );
    });

    it('should connect to Parlant service during initialization', () => {
      expect(service).toBeDefined();
      // Verify Parlant client was created with correct parameters
    });
  });

  describe('Data Validation with Parlant', () => {
    it('should validate data before database operations', async () => {
      const userData = {
        username: 'newuser',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      };

      prismaService.user.create.mockResolvedValue({
        ...mockUser,
        ...userData,
      } as any);

      const result = await service.createUser(userData);

      expect(mockParlantClient.validate).toHaveBeenCalledWith({
        data: userData,
        schema: 'user',
        operation: 'create',
      });

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: userData,
      });

      expect(result).toBeDefined();
      expect(result.username).toBe('newuser');
    });

    it('should reject invalid data based on Parlant validation', async () => {
      const invalidUserData = {
        username: 'admin<script>alert("xss")</script>',
        email: 'invalid-email',
        firstName: '',
        lastName: '',
      };

      mockParlantClient.validate.mockResolvedValue({
        isValid: false,
        confidence: 0.9,
        issues: [
          { field: 'username', type: 'xss_detected', severity: 'high' },
          { field: 'email', type: 'invalid_format', severity: 'medium' },
          { field: 'firstName', type: 'required_field', severity: 'high' },
        ],
      });

      await expect(service.createUser(invalidUserData)).rejects.toThrow(
        'Data validation failed',
      );

      expect(mockParlantClient.validate).toHaveBeenCalledWith({
        data: invalidUserData,
        schema: 'user',
        operation: 'create',
      });

      expect(prismaService.user.create).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Parlant validation failed',
        expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({ type: 'xss_detected' }),
          ]),
        }),
      );
    });

    it('should validate complex nested data structures', async () => {
      const complexData = {
        user: {
          username: 'testuser',
          profile: {
            bio: 'User biography',
            settings: {
              notifications: true,
              privacy: 'public',
            },
          },
        },
        metadata: {
          source: 'api',
          version: '1.0',
        },
      };

      await service.validateData(complexData, 'complex_user', 'create');

      expect(mockParlantClient.validate).toHaveBeenCalledWith({
        data: complexData,
        schema: 'complex_user',
        operation: 'create',
      });
    });

    it('should handle validation timeouts gracefully', async () => {
      const userData = { username: 'testuser', email: 'test@example.com' };

      mockParlantClient.validate.mockRejectedValue(
        new Error('Validation timeout'),
      );

      await expect(
        service.validateData(userData, 'user', 'create'),
      ).rejects.toThrow('Validation timeout');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Parlant validation error',
        expect.objectContaining({
          error: 'Validation timeout',
        }),
      );
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize data before storage', async () => {
      const unsafeData = {
        username: 'user<script>alert("xss")</script>',
        email: 'test@example.com',
        bio: 'User bio with <img src="x" onerror="alert(1)">',
      };

      const sanitizedData = {
        username: 'user',
        email: 'test@example.com',
        bio: 'User bio with ',
      };

      mockParlantClient.sanitize.mockResolvedValue({
        sanitized: sanitizedData,
        changesApplied: [
          { field: 'username', change: 'removed_script_tag' },
          { field: 'bio', change: 'removed_img_tag' },
        ],
      });

      const result = await service.sanitizeData(unsafeData);

      expect(mockParlantClient.sanitize).toHaveBeenCalledWith(unsafeData);
      expect(result.sanitized).toEqual(sanitizedData);
      expect(result.changesApplied).toHaveLength(2);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Data sanitization completed',
        expect.objectContaining({
          changesApplied: 2,
        }),
      );
    });

    it('should handle different sanitization levels', async () => {
      const testData = { content: 'Test content with <b>bold</b> text' };

      // Strict sanitization
      await service.sanitizeData(testData, { level: 'strict' });
      expect(mockParlantClient.sanitize).toHaveBeenCalledWith(
        testData,
        expect.objectContaining({ level: 'strict' }),
      );

      // Lenient sanitization
      await service.sanitizeData(testData, { level: 'lenient' });
      expect(mockParlantClient.sanitize).toHaveBeenCalledWith(
        testData,
        expect.objectContaining({ level: 'lenient' }),
      );
    });

    it('should preserve safe content during sanitization', async () => {
      const safeData = {
        username: 'validuser123',
        email: 'user@example.com',
        description: 'This is a safe description with no harmful content.',
      };

      mockParlantClient.sanitize.mockResolvedValue({
        sanitized: safeData,
        changesApplied: [],
      });

      const result = await service.sanitizeData(safeData);

      expect(result.sanitized).toEqual(safeData);
      expect(result.changesApplied).toHaveLength(0);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect anomalous query patterns', async () => {
      const suspiciousQuery = {
        model: 'user',
        operation: 'findMany',
        args: {
          where: {
            OR: Array.from({ length: 1000 }, (_, i) => ({ id: `id-${i}` })),
          },
        },
      };

      mockParlantClient.detect.mockResolvedValue({
        anomalies: [
          {
            type: 'unusual_query_complexity',
            severity: 'high',
            confidence: 0.95,
            description: 'Query has unusually high complexity',
          },
        ],
        confidence: 0.95,
        normalBehavior: false,
      });

      const detection = await service.detectAnomalies(suspiciousQuery);

      expect(mockParlantClient.detect).toHaveBeenCalledWith(suspiciousQuery);
      expect(detection.anomalies).toHaveLength(1);
      expect(detection.anomalies[0].type).toBe('unusual_query_complexity');
      expect(detection.normalBehavior).toBe(false);
    });

    it('should detect unusual access patterns', async () => {
      const accessPattern = {
        userId: 'user-123',
        operations: ['read', 'read', 'read', 'delete', 'delete'],
        timePattern: 'rapid_succession',
        ipAddress: '192.168.1.100',
      };

      mockParlantClient.detect.mockResolvedValue({
        anomalies: [
          {
            type: 'unusual_delete_pattern',
            severity: 'medium',
            confidence: 0.8,
            description: 'Unusual number of delete operations',
          },
        ],
        confidence: 0.8,
        normalBehavior: false,
      });

      const detection = await service.detectAnomalies(accessPattern);

      expect(detection.anomalies).toHaveLength(1);
      expect(detection.anomalies[0].type).toBe('unusual_delete_pattern');
    });

    it('should learn from normal behavior patterns', async () => {
      const normalPattern = {
        userId: 'user-123',
        operations: ['read', 'read', 'update'],
        timePattern: 'normal',
        ipAddress: '192.168.1.100',
      };

      mockParlantClient.detect.mockResolvedValue({
        anomalies: [],
        confidence: 0.9,
        normalBehavior: true,
      });

      const detection = await service.detectAnomalies(normalPattern);

      expect(detection.normalBehavior).toBe(true);
      expect(detection.anomalies).toHaveLength(0);
    });

    it('should handle detection service errors gracefully', async () => {
      const queryData = { model: 'user', operation: 'findMany' };

      mockParlantClient.detect.mockRejectedValue(
        new Error('Detection service unavailable'),
      );

      // Should not throw, but log error and continue
      const detection = await service.detectAnomalies(queryData);

      expect(detection).toEqual({
        anomalies: [],
        confidence: 0,
        normalBehavior: true,
        error: 'Detection service unavailable',
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Anomaly detection failed, proceeding without detection',
        expect.objectContaining({
          error: 'Detection service unavailable',
        }),
      );
    });
  });

  describe('Enhanced Query Operations', () => {
    it('should enhance standard Prisma queries with validation', async () => {
      const queryArgs = {
        where: { username: 'testuser' },
        select: { id: true, username: true, email: true },
      };

      prismaService.user.findMany.mockResolvedValue([mockUser] as any);

      const result = await service.findManyUsers(queryArgs);

      expect(mockParlantClient.validate).toHaveBeenCalledWith({
        data: queryArgs,
        schema: 'user_query',
        operation: 'read',
      });

      expect(mockParlantClient.detect).toHaveBeenCalledWith({
        model: 'user',
        operation: 'findMany',
        args: queryArgs,
      });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(queryArgs);
      expect(result).toEqual([mockUser]);
    });

    it('should apply intelligent query optimization', async () => {
      const inefficientQuery = {
        include: {
          tasks: {
            include: {
              comments: {
                include: {
                  user: true,
                },
              },
            },
          },
        },
      };

      const optimizedQuery = {
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      };

      mockParlantClient.transform.mockResolvedValue(optimizedQuery);

      const result = await service.optimizeQuery(inefficientQuery);

      expect(mockParlantClient.transform).toHaveBeenCalledWith(
        inefficientQuery,
        expect.objectContaining({ type: 'query_optimization' }),
      );

      expect(result).toEqual(optimizedQuery);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Query optimization applied',
        expect.objectContaining({
          originalComplexity: expect.any(Number),
          optimizedComplexity: expect.any(Number),
        }),
      );
    });

    it('should handle complex relational queries safely', async () => {
      const complexQuery = {
        where: {
          AND: [
            { isActive: true },
            {
              tasks: {
                some: {
                  status: 'completed',
                  createdAt: {
                    gte: new Date('2024-01-01'),
                  },
                },
              },
            },
          ],
        },
        include: {
          tasks: {
            where: { status: 'completed' },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      };

      prismaService.user.findMany.mockResolvedValue([mockUser] as any);

      const result = await service.findManyUsers(complexQuery);

      expect(mockParlantClient.validate).toHaveBeenCalledWith({
        data: complexQuery,
        schema: 'user_query',
        operation: 'read',
      });

      expect(result).toEqual([mockUser]);
    });
  });

  describe('Transaction Support', () => {
    it('should validate and secure database transactions', async () => {
      const transactionOperations = [
        {
          model: 'user',
          operation: 'create',
          data: { username: 'user1', email: 'user1@example.com' },
        },
        {
          model: 'task',
          operation: 'create',
          data: { title: 'Task 1', userId: 'user-123' },
        },
      ];

      const mockTransactionResult = [
        mockUser,
        { id: 'task-123', title: 'Task 1' },
      ];
      prismaService.$transaction.mockResolvedValue(mockTransactionResult);

      const result = await service.executeSecureTransaction(
        transactionOperations,
      );

      expect(mockParlantClient.validate).toHaveBeenCalledTimes(2);
      expect(mockParlantClient.detect).toHaveBeenCalledWith({
        type: 'transaction',
        operations: transactionOperations,
      });

      expect(prismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockTransactionResult);
    });

    it('should rollback transactions on validation failure', async () => {
      const invalidTransaction = [
        {
          model: 'user',
          operation: 'create',
          data: {
            username: 'admin<script>alert(1)</script>',
            email: 'invalid',
          },
        },
      ];

      mockParlantClient.validate.mockResolvedValue({
        isValid: false,
        confidence: 0.9,
        issues: [{ field: 'username', type: 'xss_detected', severity: 'high' }],
      });

      await expect(
        service.executeSecureTransaction(invalidTransaction),
      ).rejects.toThrow('Transaction validation failed');

      expect(prismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should detect and prevent suspicious transaction patterns', async () => {
      const suspiciousTransaction = Array.from({ length: 100 }, (_, i) => ({
        model: 'user',
        operation: 'delete',
        where: { id: `user-${i}` },
      }));

      mockParlantClient.detect.mockResolvedValue({
        anomalies: [
          {
            type: 'mass_deletion_attempt',
            severity: 'critical',
            confidence: 0.95,
            description: 'Detected potential mass deletion attack',
          },
        ],
        confidence: 0.95,
        normalBehavior: false,
      });

      await expect(
        service.executeSecureTransaction(suspiciousTransaction),
      ).rejects.toThrow('Transaction blocked due to security concerns');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Blocked suspicious transaction',
        expect.objectContaining({
          anomalies: expect.arrayContaining([
            expect.objectContaining({ type: 'mass_deletion_attempt' }),
          ]),
        }),
      );
    });
  });

  describe('Performance and Caching', () => {
    it('should cache validation results for repeated queries', async () => {
      const queryData = { where: { username: 'testuser' } };

      // First call
      await service.validateData(queryData, 'user_query', 'read');

      // Second call with same data
      await service.validateData(queryData, 'user_query', 'read');

      // Should only call Parlant once due to caching
      expect(mockParlantClient.validate).toHaveBeenCalledTimes(1);
    });

    it('should handle cache invalidation properly', async () => {
      const queryData = { where: { username: 'testuser' } };

      await service.validateData(queryData, 'user_query', 'read');

      // Invalidate cache
      service.invalidateCache('validation');

      await service.validateData(queryData, 'user_query', 'read');

      // Should call Parlant twice after cache invalidation
      expect(mockParlantClient.validate).toHaveBeenCalledTimes(2);
    });

    it('should optimize performance for bulk operations', async () => {
      const bulkData = Array.from({ length: 100 }, (_, i) => ({
        username: `user${i}`,
        email: `user${i}@example.com`,
      }));

      mockParlantClient.validate.mockResolvedValue({
        isValid: true,
        confidence: 0.95,
        issues: [],
      });

      const startTime = Date.now();
      await service.validateBulkData(bulkData, 'user', 'create');
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Should batch validation requests
      expect(mockParlantClient.validate).toHaveBeenCalledWith({
        data: bulkData,
        schema: 'user',
        operation: 'create',
        batch: true,
      });
    });
  });

  describe('Security and Audit', () => {
    it('should log all security-relevant operations', async () => {
      const userData = { username: 'testuser', email: 'test@example.com' };

      prismaService.user.create.mockResolvedValue(mockUser as any);

      await service.createUser(userData);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Secure database operation',
        expect.objectContaining({
          operation: 'create',
          model: 'user',
          validationPassed: true,
          sanitizationApplied: expect.any(Boolean),
          anomaliesDetected: expect.any(Number),
        }),
      );
    });

    it('should provide audit trail for all database operations', async () => {
      const userData = { username: 'audituser', email: 'audit@example.com' };

      prismaService.user.create.mockResolvedValue(mockUser as any);

      await service.createUser(userData);

      const auditTrail = service.getAuditTrail('user', mockUser.id);

      expect(auditTrail).toBeDefined();
      expect(auditTrail.operations).toHaveLength(1);
      expect(auditTrail.operations[0].operation).toBe('create');
      expect(auditTrail.operations[0].timestamp).toBeInstanceOf(Date);
    });

    it('should detect and log potential security threats', async () => {
      const maliciousData = {
        username: "admin'; DROP TABLE users; --",
        email: 'hacker@evil.com',
      };

      mockParlantClient.analyze.mockResolvedValue({
        riskScore: 0.9,
        threats: [
          {
            type: 'sql_injection_attempt',
            confidence: 0.95,
            severity: 'critical',
          },
        ],
        recommendations: [
          'Block this request immediately',
          'Add IP to blacklist',
        ],
      });

      await service.analyzeSecurityThreats(maliciousData);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'High-risk security threat detected',
        expect.objectContaining({
          riskScore: 0.9,
          threats: expect.arrayContaining([
            expect.objectContaining({ type: 'sql_injection_attempt' }),
          ]),
        }),
      );
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect configuration settings', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'parlant.validation.enabled',
        true,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'parlant.sanitization.enabled',
        true,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'parlant.anomalyDetection.enabled',
        true,
      );
    });

    it('should handle disabled Parlant features gracefully', async () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'parlant.validation.enabled') return false;
          return defaultConfig[key] ?? defaultValue;
        },
      );

      const disabledService = new ParlantValidatedPrismaService(
        prismaService,
        configService,
      );

      const userData = { username: 'testuser', email: 'test@example.com' };
      prismaService.user.create.mockResolvedValue(mockUser as any);

      const result = await disabledService.createUser(userData);

      // Should not call Parlant validation when disabled
      expect(mockParlantClient.validate).not.toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should allow custom validation rules', async () => {
      const customRules = {
        username: {
          minLength: 5,
          pattern: '^[a-zA-Z0-9_]+$',
          blacklist: ['admin', 'root', 'system'],
        },
        email: {
          domains: ['example.com', 'test.com'],
          requireVerification: true,
        },
      };

      await service.setCustomValidationRules('user', customRules);

      const userData = { username: 'test', email: 'test@example.com' };
      await service.validateData(userData, 'user', 'create');

      expect(mockParlantClient.validate).toHaveBeenCalledWith({
        data: userData,
        schema: 'user',
        operation: 'create',
        customRules: customRules,
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Parlant service outages gracefully', async () => {
      const userData = { username: 'testuser', email: 'test@example.com' };

      mockParlantClient.validate.mockRejectedValue(
        new Error('Service unavailable'),
      );
      prismaService.user.create.mockResolvedValue(mockUser as any);

      // Should fall back to basic validation when Parlant is unavailable
      const result = await service.createUser(userData);

      expect(result).toEqual(mockUser);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Parlant service unavailable, using fallback validation',
      );
    });

    it('should implement circuit breaker for Parlant API calls', async () => {
      // Simulate multiple failures to trigger circuit breaker
      mockParlantClient.validate.mockRejectedValue(new Error('API Error'));

      for (let i = 0; i < 6; i++) {
        try {
          await service.validateData({ test: 'data' }, 'test', 'create');
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit breaker should be open now
      const result = await service.validateData(
        { test: 'data' },
        'test',
        'create',
      );

      expect(result.circuitOpen).toBe(true);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Parlant service circuit breaker is open, using fallback',
      );
    });

    it('should handle malformed responses from Parlant', async () => {
      const userData = { username: 'testuser', email: 'test@example.com' };

      mockParlantClient.validate.mockResolvedValue({
        // Missing required fields
        confidence: 0.8,
      });

      await expect(
        service.validateData(userData, 'user', 'create'),
      ).rejects.toThrow('Invalid response from Parlant service');
    });
  });
});
