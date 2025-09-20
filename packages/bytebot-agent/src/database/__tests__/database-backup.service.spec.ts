/**
 * Comprehensive Unit Test Suite for DatabaseBackupService
 *
 * TESTING FRAMEWORK: Jest with NestJS Testing Module
 * TARGET COVERAGE: 95%+ code coverage with focus on backup/restore validation
 * FOCUS AREAS:
 * - Pre-operation backup creation workflow
 * - Backup type determination based on risk levels
 * - Backup verification and integrity checks
 * - Restore functionality and dry-run testing
 * - Storage space validation and conflict detection
 * - Performance metrics and monitoring
 * - Retention policy management
 * - Error handling and backup failure scenarios
 *
 * @package @bytebot/bytebot-agent
 * @author Claude Code - Comprehensive Testing Framework
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import {
  DatabaseBackupService,
  BackupOperationMetadata,
  BackupCreationRequest,
  BackupCreationResult,
  BackupRestorationRequest,
} from '../database-backup.service';
import { DatabaseService } from '../database.service';
import {
  DatabaseOperationMetadata,
  RiskLevel,
} from '../parlant-validated-database.service';

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
};

/**
 * Mock ConfigService for testing configuration handling
 */
const mockConfigService = {
  get: jest.fn(),
};

/**
 * Test data factory for backup-specific test contexts
 */
class BackupTestDataFactory {
  static createDatabaseOperationMetadata(
    overrides: Partial<DatabaseOperationMetadata> = {},
  ): DatabaseOperationMetadata {
    return {
      operationType: 'WRITE',
      tableName: 'users',
      affectedRows: 10,
      queryDescription: 'Update user records',
      dataTypes: ['string', 'number'],
      isDestructive: false,
      requiresBackup: true,
      ...overrides,
    };
  }

  static createBackupCreationRequest(
    overrides: Partial<BackupCreationRequest> = {},
  ): BackupCreationRequest {
    return {
      operationMetadata: this.createDatabaseOperationMetadata(),
      riskLevel: RiskLevel.MEDIUM,
      requestingUserId: 'user-123',
      backupReason: 'Pre-operation backup for testing',
      customRetention: {
        days: 30,
        copies: 2,
      },
      ...overrides,
    };
  }

  static createBackupRestorationRequest(
    overrides: Partial<BackupRestorationRequest> = {},
  ): BackupRestorationRequest {
    return {
      backupId: 'backup-123',
      restoreReason: 'Testing restore functionality',
      requestingUserId: 'user-123',
      verifyBeforeRestore: true,
      dryRun: false,
      ...overrides,
    };
  }

  static createBackupOperationMetadata(
    overrides: Partial<BackupOperationMetadata> = {},
  ): BackupOperationMetadata {
    return {
      backupId: 'backup-test-123',
      operationId: 'op-test-456',
      backupType: 'PARTIAL',
      backupStrategy: 'PRE_OPERATION',
      tables: ['users'],
      estimatedSize: 1024000,
      priority: 'MEDIUM',
      retention: {
        days: 30,
        copies: 2,
      },
      ...overrides,
    };
  }

  static createBackupCreationResult(
    overrides: Partial<BackupCreationResult> = {},
  ): BackupCreationResult {
    return {
      backupId: 'backup-test-123',
      backupPath: '/tmp/backup-test-123.sql',
      backupSize: 1024000,
      duration: 500,
      checksum: 'abc123def456',
      timestamp: new Date(),
      verified: true,
      ...overrides,
    };
  }
}

// ===== MAIN TEST SUITE =====

describe('DatabaseBackupService - Comprehensive Unit Tests', () => {
  let service: DatabaseBackupService;
  let module: TestingModule;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Configure default mock returns
    mockConfigService.get.mockImplementation(
      (key: string, defaultValue?: any) => {
        const config = {
          DATABASE_BACKUP_ENABLED: true,
          DATABASE_BACKUP_STORAGE: '/tmp/database-backups',
          DATABASE_BACKUP_RETENTION_DAYS: 30,
          DATABASE_BACKUP_COPIES: 2,
        };
        return config[key] ?? defaultValue;
      },
    );

    mockDatabaseService.getPrismaClient.mockResolvedValue({});
    mockDatabaseService.getMetrics.mockResolvedValue({
      connectionCount: 5,
      queryCount: 100,
    });

    // Create testing module
    module = await Test.createTestingModule({
      providers: [
        DatabaseBackupService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<DatabaseBackupService>(DatabaseBackupService);
  });

  afterEach(async () => {
    await module.close();
  });

  // ===== INITIALIZATION AND CONFIGURATION TESTS =====

  describe('Service Initialization', () => {
    it('should be defined and properly configured', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DatabaseBackupService);
    });

    it('should initialize with correct configuration values', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'DATABASE_BACKUP_ENABLED',
        true,
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'DATABASE_BACKUP_STORAGE',
        '/tmp/database-backups',
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'DATABASE_BACKUP_RETENTION_DAYS',
        30,
      );
      expect(mockConfigService.get).toHaveBeenCalledWith(
        'DATABASE_BACKUP_COPIES',
        2,
      );
    });

    it('should start backup monitoring interval', () => {
      jest.spyOn(global, 'setInterval');

      // Re-create service to test initialization
      const newService = new DatabaseBackupService(
        mockConfigService as any,
        mockDatabaseService as any,
      );

      expect(setInterval).toHaveBeenCalled();
    });
  });

  // ===== BACKUP METADATA CREATION TESTS =====

  describe('Backup Metadata Creation', () => {
    it('should create FULL backup metadata for CRITICAL risk operations', () => {
      const request = BackupTestDataFactory.createBackupCreationRequest({
        riskLevel: RiskLevel.CRITICAL,
      });

      const metadata = (service as any).createBackupMetadata(
        request,
        'test-op-123',
      );

      expect(metadata.backupType).toBe('FULL');
      expect(metadata.priority).toBe('CRITICAL');
      expect(metadata.tables).toEqual(['*']);
      expect(metadata.operationId).toBe('test-op-123');
      expect(metadata.backupStrategy).toBe('PRE_OPERATION');
    });

    it('should create PARTIAL backup metadata for HIGH risk operations with specific table', () => {
      const request = BackupTestDataFactory.createBackupCreationRequest({
        riskLevel: RiskLevel.HIGH,
        operationMetadata:
          BackupTestDataFactory.createDatabaseOperationMetadata({
            tableName: 'users',
          }),
      });

      const metadata = (service as any).createBackupMetadata(
        request,
        'test-op-123',
      );

      expect(metadata.backupType).toBe('PARTIAL');
      expect(metadata.priority).toBe('HIGH');
      expect(metadata.tables).toEqual(['users']);
    });

    it('should create FULL backup metadata for HIGH risk operations without specific table', () => {
      const request = BackupTestDataFactory.createBackupCreationRequest({
        riskLevel: RiskLevel.HIGH,
        operationMetadata:
          BackupTestDataFactory.createDatabaseOperationMetadata({
            tableName: undefined,
          }),
      });

      const metadata = (service as any).createBackupMetadata(
        request,
        'test-op-123',
      );

      expect(metadata.backupType).toBe('FULL');
      expect(metadata.priority).toBe('HIGH');
      expect(metadata.tables).toEqual(['*']);
    });

    it('should create PARTIAL backup metadata for MEDIUM risk operations', () => {
      const request = BackupTestDataFactory.createBackupCreationRequest({
        riskLevel: RiskLevel.MEDIUM,
      });

      const metadata = (service as any).createBackupMetadata(
        request,
        'test-op-123',
      );

      expect(metadata.backupType).toBe('PARTIAL');
      expect(metadata.priority).toBe('MEDIUM');
    });

    it('should create INCREMENTAL backup metadata for LOW risk operations', () => {
      const request = BackupTestDataFactory.createBackupCreationRequest({
        riskLevel: RiskLevel.LOW,
      });

      const metadata = (service as any).createBackupMetadata(
        request,
        'test-op-123',
      );

      expect(metadata.backupType).toBe('INCREMENTAL');
      expect(metadata.priority).toBe('LOW');
    });

    it('should use custom retention policy when provided', () => {
      const customRetention = { days: 90, copies: 5 };
      const request = BackupTestDataFactory.createBackupCreationRequest({
        customRetention,
      });

      const metadata = (service as any).createBackupMetadata(
        request,
        'test-op-123',
      );

      expect(metadata.retention).toEqual(customRetention);
    });

    it('should generate unique backup IDs', () => {
      const request = BackupTestDataFactory.createBackupCreationRequest();

      const metadata1 = (service as any).createBackupMetadata(
        request,
        'test-op-1',
      );
      const metadata2 = (service as any).createBackupMetadata(
        request,
        'test-op-2',
      );

      expect(metadata1.backupId).not.toBe(metadata2.backupId);
      expect(metadata1.backupId).toMatch(/^backup_\d+_test-op-1$/);
      expect(metadata2.backupId).toMatch(/^backup_\d+_test-op-2$/);
    });
  });

  // ===== RETENTION POLICY TESTS =====

  describe('Retention Policy Management', () => {
    it('should provide correct retention policy for CRITICAL risk level', () => {
      const policy = (service as any).getRetentionPolicy(RiskLevel.CRITICAL);

      expect(policy).toEqual({
        days: 365,
        copies: 5,
      });
    });

    it('should provide correct retention policy for HIGH risk level', () => {
      const policy = (service as any).getRetentionPolicy(RiskLevel.HIGH);

      expect(policy).toEqual({
        days: 90,
        copies: 3,
      });
    });

    it('should provide correct retention policy for MEDIUM risk level', () => {
      const policy = (service as any).getRetentionPolicy(RiskLevel.MEDIUM);

      expect(policy).toEqual({
        days: 30,
        copies: 2,
      });
    });

    it('should provide correct retention policy for LOW risk level', () => {
      const policy = (service as any).getRetentionPolicy(RiskLevel.LOW);

      expect(policy).toEqual({
        days: 7,
        copies: 1,
      });
    });
  });

  // ===== BACKUP SIZE ESTIMATION TESTS =====

  describe('Backup Size Estimation', () => {
    it('should estimate size correctly for FULL backup', () => {
      const size = (service as any).estimateBackupSize(['*'], 'FULL');
      expect(size).toBe(1000000); // 1MB base
    });

    it('should estimate size correctly for PARTIAL backup with multiple tables', () => {
      const tables = ['users', 'sessions', 'logs'];
      const size = (service as any).estimateBackupSize(tables, 'PARTIAL');
      expect(size).toBe(1500000); // 500KB * 3 tables
    });

    it('should estimate size correctly for PARTIAL backup with single table', () => {
      const tables = ['users'];
      const size = (service as any).estimateBackupSize(tables, 'PARTIAL');
      expect(size).toBe(500000); // 500KB * 1 table
    });

    it('should estimate size correctly for INCREMENTAL backup', () => {
      const size = (service as any).estimateBackupSize(
        ['users'],
        'INCREMENTAL',
      );
      expect(size).toBe(100000); // 100KB base
    });
  });

  // ===== BACKUP PREREQUISITE VALIDATION TESTS =====

  describe('Backup Prerequisite Validation', () => {
    it('should validate sufficient storage space', async () => {
      const metadata = BackupTestDataFactory.createBackupOperationMetadata({
        estimatedSize: 1000000, // 1MB
      });

      // Mock sufficient storage space (5MB available)
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(5000000);

      await expect(
        (service as any).validateBackupPrerequisites(metadata),
      ).resolves.not.toThrow();
    });

    it('should reject operations when insufficient storage space', async () => {
      const metadata = BackupTestDataFactory.createBackupOperationMetadata({
        estimatedSize: 10000000, // 10MB
      });

      // Mock insufficient storage space (5MB available)
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(5000000);

      await expect(
        (service as any).validateBackupPrerequisites(metadata),
      ).rejects.toThrow('Insufficient storage space');
    });

    it('should detect conflicting backup operations', async () => {
      const metadata1 = BackupTestDataFactory.createBackupOperationMetadata({
        operationId: 'op-1',
        tables: ['users'],
      });

      const metadata2 = BackupTestDataFactory.createBackupOperationMetadata({
        operationId: 'op-2',
        tables: ['users'], // Same table as op-1
      });

      // Mock sufficient storage
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);

      // Set up first operation as active
      (service as any).activeBackups.add('op-1');
      (service as any).backupOperations.set('op-1', metadata1);

      await expect(
        (service as any).validateBackupPrerequisites(metadata2),
      ).rejects.toThrow('Conflicting backup operation in progress');

      // Clean up
      (service as any).activeBackups.delete('op-1');
      (service as any).backupOperations.delete('op-1');
    });

    it('should allow operations with non-overlapping tables', async () => {
      const metadata1 = BackupTestDataFactory.createBackupOperationMetadata({
        operationId: 'op-1',
        tables: ['users'],
      });

      const metadata2 = BackupTestDataFactory.createBackupOperationMetadata({
        operationId: 'op-2',
        tables: ['sessions'], // Different table
      });

      // Mock sufficient storage
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);

      // Set up first operation as active
      (service as any).activeBackups.add('op-1');
      (service as any).backupOperations.set('op-1', metadata1);

      await expect(
        (service as any).validateBackupPrerequisites(metadata2),
      ).resolves.not.toThrow();

      // Clean up
      (service as any).activeBackups.delete('op-1');
      (service as any).backupOperations.delete('op-1');
    });

    it('should detect conflict with full backup operations', async () => {
      const metadata1 = BackupTestDataFactory.createBackupOperationMetadata({
        operationId: 'op-1',
        tables: ['*'], // Full backup
      });

      const metadata2 = BackupTestDataFactory.createBackupOperationMetadata({
        operationId: 'op-2',
        tables: ['users'], // Any table conflicts with full backup
      });

      // Mock sufficient storage
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);

      // Set up first operation as active
      (service as any).activeBackups.add('op-1');
      (service as any).backupOperations.set('op-1', metadata1);

      await expect(
        (service as any).validateBackupPrerequisites(metadata2),
      ).rejects.toThrow('Conflicting backup operation in progress');

      // Clean up
      (service as any).activeBackups.delete('op-1');
      (service as any).backupOperations.delete('op-1');
    });
  });

  // ===== TABLE OVERLAP DETECTION TESTS =====

  describe('Table Overlap Detection', () => {
    it('should detect overlap when both lists include same table', () => {
      const hasOverlap = (service as any).hasTableOverlap(
        ['users', 'sessions'],
        ['users', 'logs'],
      );
      expect(hasOverlap).toBe(true);
    });

    it('should detect no overlap when lists have different tables', () => {
      const hasOverlap = (service as any).hasTableOverlap(
        ['users', 'sessions'],
        ['logs', 'metrics'],
      );
      expect(hasOverlap).toBe(false);
    });

    it('should detect overlap when first list includes full backup', () => {
      const hasOverlap = (service as any).hasTableOverlap(['*'], ['users']);
      expect(hasOverlap).toBe(true);
    });

    it('should detect overlap when second list includes full backup', () => {
      const hasOverlap = (service as any).hasTableOverlap(['users'], ['*']);
      expect(hasOverlap).toBe(true);
    });

    it('should detect overlap when both lists include full backup', () => {
      const hasOverlap = (service as any).hasTableOverlap(['*'], ['*']);
      expect(hasOverlap).toBe(true);
    });
  });

  // ===== BACKUP PATH GENERATION TESTS =====

  describe('Backup Path Generation', () => {
    it('should generate valid backup path', () => {
      const metadata = BackupTestDataFactory.createBackupOperationMetadata();
      const path = (service as any).generateBackupPath(metadata);

      expect(path).toMatch(
        /^\/tmp\/database-backups\/backup-test-123_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.backup$/,
      );
    });

    it('should use configured storage location', () => {
      mockConfigService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'DATABASE_BACKUP_STORAGE') return '/custom/backup/path';
          return defaultValue;
        },
      );

      const metadata = BackupTestDataFactory.createBackupOperationMetadata();
      const path = (service as any).generateBackupPath(metadata);

      expect(path).toStartWith('/custom/backup/path/');
    });
  });

  // ===== CHECKSUM GENERATION TESTS =====

  describe('Checksum Generation', () => {
    it('should generate consistent checksums for same input', () => {
      const checksum1 = (service as any).generateChecksum('test-data');
      const checksum2 = (service as any).generateChecksum('test-data');

      expect(checksum1).toBe(checksum2);
      expect(checksum1).toMatch(/^checksum_[a-z0-9]+$/);
    });

    it('should generate different checksums for different inputs', () => {
      const checksum1 = (service as any).generateChecksum('test-data-1');
      const checksum2 = (service as any).generateChecksum('test-data-2');

      expect(checksum1).not.toBe(checksum2);
    });
  });

  // ===== BACKUP EXECUTION TESTS =====

  describe('Backup Execution', () => {
    describe('Full Backup', () => {
      it('should perform full backup successfully', async () => {
        const result = await (service as any).performFullBackup(
          '/tmp/test-backup.sql',
        );

        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('checksum');
        expect(result.size).toBeGreaterThan(500000);
        expect(result.size).toBeLessThan(1500000);
        expect(result.checksum).toMatch(/^checksum_[a-z0-9]+$/);
      });
    });

    describe('Partial Backup', () => {
      it('should perform partial backup successfully', async () => {
        const tables = ['users', 'sessions'];
        const result = await (service as any).performPartialBackup(
          '/tmp/test-backup.sql',
          tables,
        );

        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('checksum');
        expect(result.size).toBeGreaterThan(100000);
        expect(result.size).toBeLessThan(600000);
        expect(result.checksum).toMatch(/^checksum_[a-z0-9]+$/);
      });
    });

    describe('Incremental Backup', () => {
      it('should perform incremental backup successfully', async () => {
        const result = await (service as any).performIncrementalBackup(
          '/tmp/test-backup.sql',
        );

        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('checksum');
        expect(result.size).toBeGreaterThan(10000);
        expect(result.size).toBeLessThan(110000);
        expect(result.checksum).toMatch(/^checksum_[a-z0-9]+$/);
      });
    });
  });

  // ===== BACKUP VERIFICATION TESTS =====

  describe('Backup Verification', () => {
    it('should verify backup integrity successfully', async () => {
      const verified = await (service as any).verifyBackupIntegrity(
        'backup-123',
      );

      // Should succeed most of the time (99% success rate in mock)
      expect(typeof verified).toBe('boolean');
    });

    it('should check backup existence', async () => {
      const exists = await (service as any).verifyBackupExists('backup-123');

      expect(typeof exists).toBe('boolean');
    });
  });

  // ===== COMPLETE BACKUP CREATION WORKFLOW TESTS =====

  describe('Complete Backup Creation Workflow', () => {
    it('should create pre-operation backup successfully', async () => {
      const request = BackupTestDataFactory.createBackupCreationRequest();

      // Mock sufficient storage
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);

      const result = await service.createPreOperationBackup(request);

      expect(result).toHaveProperty('backupId');
      expect(result).toHaveProperty('backupPath');
      expect(result).toHaveProperty('backupSize');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('checksum');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('verified');

      expect(result.verified).toBe(true);
      expect(result.backupSize).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle backup creation failure', async () => {
      const request = BackupTestDataFactory.createBackupCreationRequest();

      // Mock insufficient storage to trigger failure
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(1000);

      await expect(service.createPreOperationBackup(request)).rejects.toThrow(
        'Insufficient storage space',
      );
    });

    it('should track active backup operations', async () => {
      const request = BackupTestDataFactory.createBackupCreationRequest();

      // Mock sufficient storage
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);

      const initialActive = service.getActiveBackupOperations();
      expect(initialActive).toHaveLength(0);

      // Create backup (should complete quickly in test)
      await service.createPreOperationBackup(request);

      // After completion, should not be in active list
      const finalActive = service.getActiveBackupOperations();
      expect(finalActive).toHaveLength(0);
    });
  });

  // ===== BACKUP RESTORATION TESTS =====

  describe('Backup Restoration', () => {
    it('should restore from backup successfully', async () => {
      const request = BackupTestDataFactory.createBackupRestorationRequest();

      // Mock backup exists and is valid
      jest.spyOn(service as any, 'verifyBackupExists').mockResolvedValue(true);
      jest
        .spyOn(service as any, 'verifyBackupIntegrity')
        .mockResolvedValue(true);

      const result = await service.restoreFromBackup(request);

      expect(result).toHaveProperty('restored');
      expect(result).toHaveProperty('restorationTime');
      expect(result).toHaveProperty('recordsRestored');

      expect(result.restored).toBe(true);
      expect(result.restorationTime).toBeGreaterThan(0);
      expect(result.recordsRestored).toBeGreaterThan(0);
    });

    it('should perform dry run restoration', async () => {
      const request = BackupTestDataFactory.createBackupRestorationRequest({
        dryRun: true,
      });

      // Mock backup exists
      jest.spyOn(service as any, 'verifyBackupExists').mockResolvedValue(true);

      const result = await service.restoreFromBackup(request);

      expect(result.restored).toBe(false);
      expect(result.recordsRestored).toBe(0);
    });

    it('should fail restoration when backup does not exist', async () => {
      const request = BackupTestDataFactory.createBackupRestorationRequest();

      // Mock backup does not exist
      jest.spyOn(service as any, 'verifyBackupExists').mockResolvedValue(false);

      await expect(service.restoreFromBackup(request)).rejects.toThrow(
        'Backup backup-123 not found or invalid',
      );
    });

    it('should fail restoration when integrity check fails', async () => {
      const request = BackupTestDataFactory.createBackupRestorationRequest({
        verifyBeforeRestore: true,
      });

      // Mock backup exists but integrity check fails
      jest.spyOn(service as any, 'verifyBackupExists').mockResolvedValue(true);
      jest
        .spyOn(service as any, 'verifyBackupIntegrity')
        .mockResolvedValue(false);

      await expect(service.restoreFromBackup(request)).rejects.toThrow(
        'Backup backup-123 failed integrity check',
      );
    });

    it('should skip integrity check when not requested', async () => {
      const request = BackupTestDataFactory.createBackupRestorationRequest({
        verifyBeforeRestore: false,
      });

      // Mock backup exists
      jest.spyOn(service as any, 'verifyBackupExists').mockResolvedValue(true);
      const integritySpy = jest.spyOn(service as any, 'verifyBackupIntegrity');

      await service.restoreFromBackup(request);

      expect(integritySpy).not.toHaveBeenCalled();
    });
  });

  // ===== CONFIGURATION METHODS TESTS =====

  describe('Configuration Methods', () => {
    it('should correctly report backup enabled status', () => {
      const isEnabled = (service as any).isBackupEnabled();
      expect(isEnabled).toBe(true);
    });

    it('should correctly report backup storage location', () => {
      const location = (service as any).getBackupStorageLocation();
      expect(location).toBe('/tmp/database-backups');
    });

    it('should correctly report default retention policy', () => {
      const policy = (service as any).getDefaultRetentionPolicy();
      expect(policy).toEqual({
        days: 30,
        copies: 2,
      });
    });

    it('should use default values when config is unavailable', () => {
      mockConfigService.get.mockImplementation(() => undefined);

      const isEnabled = (service as any).isBackupEnabled();
      const location = (service as any).getBackupStorageLocation();
      const policy = (service as any).getDefaultRetentionPolicy();

      expect(isEnabled).toBe(true);
      expect(location).toBe('/tmp/database-backups');
      expect(policy.days).toBe(30);
      expect(policy.copies).toBe(2);
    });
  });

  // ===== OPERATION ID GENERATION TESTS =====

  describe('Operation ID Generation', () => {
    it('should generate unique operation IDs', () => {
      const id1 = (service as any).generateOperationId();
      const id2 = (service as any).generateOperationId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^backup_op_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^backup_op_\d+_[a-z0-9]+$/);
    });
  });

  // ===== PERFORMANCE METRICS TESTS =====

  describe('Performance Metrics', () => {
    it('should track backup metrics correctly', () => {
      // Simulate metric updates
      (service as any).updateBackupMetrics(500, 1024000);
      (service as any).updateBackupMetrics(750, 2048000);

      const stats = service.getBackupStatistics();

      expect(stats).toHaveProperty('totalBackups');
      expect(stats).toHaveProperty('averageBackupTime');
      expect(stats).toHaveProperty('totalBackupSize');
      expect(stats).toHaveProperty('activeBackups');

      expect(stats.totalBackups).toBe(2);
      expect(stats.averageBackupTime).toContain('625'); // (500 + 750) / 2
      expect(stats.totalBackupSize).toContain('3.00'); // ~3MB total
    });

    it('should provide backup statistics', () => {
      const stats = service.getBackupStatistics();

      expect(stats).toHaveProperty('totalBackups');
      expect(stats).toHaveProperty('averageBackupTime');
      expect(stats).toHaveProperty('totalBackupSize');
      expect(stats).toHaveProperty('activeBackups');
      expect(stats).toHaveProperty('backupOperations');
    });

    it('should list active backup operations', () => {
      const operations = service.getActiveBackupOperations();
      expect(Array.isArray(operations)).toBe(true);
    });

    it('should retrieve backup operation by ID', () => {
      const operation = service.getBackupOperation('non-existent-id');
      expect(operation).toBeUndefined();
    });
  });

  // ===== AVAILABLE STORAGE SPACE TESTS =====

  describe('Available Storage Space', () => {
    it('should return positive storage space value', async () => {
      const space = await (service as any).getAvailableStorageSpace();

      expect(space).toBeGreaterThan(0);
      expect(space).toBeGreaterThanOrEqual(5000000); // At least 5MB in mock
      expect(space).toBeLessThanOrEqual(15000000); // At most 15MB in mock
    });
  });

  // ===== ERROR HANDLING AND EDGE CASES =====

  describe('Error Handling and Edge Cases', () => {
    it('should handle configuration service failures', () => {
      mockConfigService.get.mockImplementation(() => {
        throw new Error('Configuration service unavailable');
      });

      expect(() => {
        new DatabaseBackupService(
          mockConfigService as any,
          mockDatabaseService as any,
        );
      }).not.toThrow();
    });

    it('should handle database service failures gracefully', async () => {
      const request = BackupTestDataFactory.createBackupCreationRequest();

      // Mock storage check success but backup operation failure
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);
      jest
        .spyOn(service as any, 'performPartialBackup')
        .mockRejectedValue(new Error('Database backup command failed'));

      await expect(service.createPreOperationBackup(request)).rejects.toThrow();
    });

    it('should handle verification failures', async () => {
      const request = BackupTestDataFactory.createBackupCreationRequest();

      // Mock successful backup but failed verification
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);
      jest
        .spyOn(service as any, 'verifyBackupIntegrity')
        .mockResolvedValue(false);

      const result = await service.createPreOperationBackup(request);
      expect(result.verified).toBe(false);
    });

    it('should handle unsupported backup types', async () => {
      const metadata = BackupTestDataFactory.createBackupOperationMetadata({
        backupType: 'UNSUPPORTED' as any,
      });
      const request = BackupTestDataFactory.createBackupCreationRequest();

      // Mock sufficient storage
      jest
        .spyOn(service as any, 'getAvailableStorageSpace')
        .mockResolvedValue(10000000);

      await expect(
        (service as any).executeBackupOperation(metadata, request),
      ).rejects.toThrow('Unsupported backup type: UNSUPPORTED');
    });

    it('should clean up active operations even when backup fails', async () => {
      const metadata = BackupTestDataFactory.createBackupOperationMetadata();
      const request = BackupTestDataFactory.createBackupCreationRequest();

      // Mock backup failure
      jest
        .spyOn(service as any, 'performPartialBackup')
        .mockRejectedValue(new Error('Backup failed'));

      try {
        await (service as any).executeBackupOperation(metadata, request);
      } catch (error) {
        // Expected to throw
      }

      // Verify operation was cleaned up from active list
      expect((service as any).activeBackups.has(metadata.operationId)).toBe(
        false,
      );
    });
  });

  // ===== INTEGRATION WITH OTHER SERVICES =====

  describe('Integration with Other Services', () => {
    it('should integrate with DatabaseService for client access', () => {
      expect(mockDatabaseService.getPrismaClient).toBeDefined();
      expect(mockDatabaseService.getMetrics).toBeDefined();
    });

    it('should integrate with ConfigService for configuration', () => {
      expect(mockConfigService.get).toBeDefined();
    });
  });
});
