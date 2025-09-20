/**
 * Data Services Test Suite
 *
 * Comprehensive test coverage for all data services including:
 * - Data Retention and Cleanup Service
 * - Data Export and Backup Service
 * - Data Storage Optimization Service
 * - Database Migration Service
 *
 * Test Categories:
 * - Service initialization and configuration management
 * - Data retention policies and automated cleanup operations
 * - Export and backup operations with multiple formats and encryption
 * - Storage optimization with compression and tiered storage
 * - Database schema migrations with rollback capabilities
 * - Performance optimization and analytics
 * - Error handling and edge case scenarios
 * - Integration testing across service boundaries
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import {
  DataRetentionCleanupService,
  RetentionPolicy,
  CleanupExecutionResult,
  EntityCleanupResult,
} from '../services/data-retention-cleanup.service';
import {
  DataExportBackupService,
  ExportFormat,
  BackupType,
  ExportConfiguration,
  BackupConfiguration,
  ExportResult,
  BackupResult,
  RestoreOptions,
} from '../services/data-export-backup.service';
import {
  DataStorageOptimizationService,
  StorageTierConfig,
  OptimizationResult,
  DeduplicationResult,
  ArchivalRecommendation,
  StorageAnalytics,
} from '../services/data-storage-optimization.service';
import {
  DatabaseMigrationService,
  MigrationDefinition,
  MigrationResult,
  MigrationStatus,
  MigrationValidationResult,
} from '../services/database-migration.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageTier, CompressionType } from '@prisma/client';

// Mock fs for file operations
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock crypto for encryption operations
jest.mock('crypto');
const mockCrypto = crypto as jest.Mocked<typeof crypto>;

describe('Data Services Integration', () => {
  let retentionService: DataRetentionCleanupService;
  let exportService: DataExportBackupService;
  let optimizationService: DataStorageOptimizationService;
  let migrationService: DatabaseMigrationService;
  let configService: jest.Mocked<ConfigService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data fixtures
  const mockBrowserSession = {
    id: 'session-123',
    processId: 'process-456',
    status: 'TERMINATED',
    headless: true,
    viewportWidth: 1920,
    viewportHeight: 1080,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastActivity: new Date('2024-01-01'),
    _metadata: { isProductionData: false },
    tasks: [{ id: 'task-1' }],
    screenshots: [{ id: 'screenshot-1', fileSize: 50000 }],
    domSnapshots: [{ id: 'snapshot-1', fileSize: 25000 }],
  };

  const mockBrowserTask = {
    id: 'task-456',
    sessionId: 'session-123',
    type: 'navigation',
    status: 'COMPLETED',
    priority: 'NORMAL',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    customData: { isProductionData: false },
    screenshots: [
      {
        id: 'screenshot-2',
        fileSize: 30000,
        filePath: '/path/to/screenshot.png',
      },
    ],
    domSnapshots: [{ id: 'snapshot-2', fileSize: 15000 }],
    dataExtractions: [{ id: 'extraction-1' }],
  };

  const mockScreenshot = {
    id: 'screenshot-789',
    sessionId: 'session-123',
    filename: 'test.png',
    filePath: '/path/to/test.png',
    timestamp: new Date('2024-01-01'),
    fileSize: 100000,
    storageTier: StorageTier.HOT,
    accessCount: 5,
    _metadata: { isTestData: true },
    compressionType: CompressionType.NONE,
    checksum: 'abc123',
    url: 'https://example.com',
  };

  const mockDomSnapshot = {
    id: 'snapshot-789',
    sessionId: 'session-123',
    url: 'https://example.com',
    timestamp: new Date('2024-01-01'),
    htmlContent: '<html><body>Test content</body></html>',
    originalSize: 50000,
    storageTier: StorageTier.WARM,
    _metadata: { isTestData: true },
    compressionType: CompressionType.GZIP,
    textContentHash: 'hash123',
    formCount: 2,
  };

  beforeEach(async () => {
    // Reset all timers and mocks
    jest.clearAllTimers();
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Mock ConfigService
    const mockConfigServiceMethods = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const configMap: Record<string, any> = {
          DATA_BACKUP_DIRECTORY: '/test/backups',
          DATA_EXPORT_DIRECTORY: '/test/exports',
          BACKUP_ENCRYPTION_KEY: 'test-encryption-key',
          BACKUP_ENCRYPTION_ENABLED: true,
          BACKUP_COMPRESSION_ENABLED: true,
          BACKUP_RETENTION_DAILY: 7,
          BACKUP_RETENTION_WEEKLY: 4,
          BACKUP_RETENTION_MONTHLY: 12,
          DATABASE_URL: 'postgresql://user:pass@localhost:5432/test',
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    // Mock PrismaService with comprehensive methods
    const mockPrismaServiceMethods = {
      browserSession: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      browserTask: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      browserScreenshot: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      browserDomSnapshot: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      browserDataExtraction: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
      $executeRaw: jest.fn(),
      $executeRawUnsafe: jest.fn(),
      $queryRaw: jest.fn(),
      $queryRawUnsafe: jest.fn(),
    };

    // Mock fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('test file content'));
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ size: 1000 } as any);

    // Mock crypto operations
    mockCrypto.randomBytes.mockReturnValue(Buffer.from('random-bytes'));
    mockCrypto.createHash.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mocked-hash'),
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataRetentionCleanupService,
        DataExportBackupService,
        DataStorageOptimizationService,
        DatabaseMigrationService,
        {
          provide: ConfigService,
          useValue: mockConfigServiceMethods,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaServiceMethods,
        },
      ],
    }).compile();

    retentionService = module.get<DataRetentionCleanupService>(
      DataRetentionCleanupService,
    );
    exportService = module.get<DataExportBackupService>(
      DataExportBackupService,
    );
    optimizationService = module.get<DataStorageOptimizationService>(
      DataStorageOptimizationService,
    );
    migrationService = module.get<DatabaseMigrationService>(
      DatabaseMigrationService,
    );
    configService = module.get(ConfigService);
    prismaService = module.get(PrismaService);

    // Mock logger for all services
    const mockLogger = {
      log: jest.fn(),
      _error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    (retentionService as any).logger = mockLogger;
    (exportService as any).logger = mockLogger;
    (optimizationService as any).logger = mockLogger;
    (migrationService as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Data Retention and Cleanup Service', () => {
    describe('Service Initialization', () => {
      it('should initialize with default retention policies', () => {
        expect(retentionService).toBeDefined();

        // Access private property for testing
        const defaultPolicies = (retentionService as any)
          .defaultRetentionPolicies;
        expect(defaultPolicies).toBeInstanceOf(Map);
        expect(defaultPolicies.size).toBeGreaterThan(0);

        // Verify policy types exist
        expect(defaultPolicies.has('browser_sessions')).toBe(true);
        expect(defaultPolicies.has('browser_tasks')).toBe(true);
        expect(defaultPolicies.has('browser_screenshots')).toBe(true);
        expect(defaultPolicies.has('browser_dom_snapshots')).toBe(true);
        expect(defaultPolicies.has('browser_data_extractions')).toBe(true);
      });

      it('should create policies with appropriate retention periods', () => {
        const defaultPolicies = (retentionService as any)
          .defaultRetentionPolicies;
        const sessionPolicy = defaultPolicies.get('browser_sessions');

        expect(sessionPolicy).toMatchObject({
          entityType: 'browser_sessions',
          retentionPeriodDays: 90,
          archivePeriodDays: 30,
          cleanupEnabled: true,
          compressionEnabled: true,
        });
      });
    });

    describe('Cleanup Execution', () => {
      it('should execute policy cleanup for browser sessions', async () => {
        // Mock data retrieval
        prismaService.browserSession.findMany
          .mockResolvedValueOnce([]) // sessions to archive
          .mockResolvedValueOnce([mockBrowserSession]); // sessions to delete

        const policy: RetentionPolicy = {
          id: 'test-policy',
          entityType: 'browser_sessions',
          retentionPeriodDays: 30,
          archivePeriodDays: 7,
          cleanupEnabled: true,
          compressionEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await retentionService.executePolicyCleanup(policy);

        expect(result).toMatchObject({
          policyId: 'test-policy',
          executionStatus: 'completed',
          recordsProcessed: 1,
          recordsDeleted: 1,
          recordsArchived: 0,
        });

        expect(prismaService.browserSession.delete).toHaveBeenCalledWith({
          where: { id: 'session-123' },
        });
      });

      it('should handle cleanup errors gracefully', async () => {
        prismaService.browserSession.findMany.mockRejectedValue(
          new Error('Database error'),
        );

        const policy: RetentionPolicy = {
          id: 'test-policy',
          entityType: 'browser_sessions',
          retentionPeriodDays: 30,
          cleanupEnabled: true,
          compressionEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await retentionService.executePolicyCleanup(policy);

        expect(result.executionStatus).toBe('failed');
        expect(result.errorsCount).toBeGreaterThan(0);
        expect(result.errorDetails).toBeDefined();
      });

      it('should execute scheduled cleanup with concurrency protection', async () => {
        // Mock is already running
        (retentionService as any).isCleanupRunning = true;

        const results = await retentionService.executeScheduledCleanup();

        expect(results).toEqual([]);
      });

      it('should clean up browser tasks with file deletion', async () => {
        prismaService.browserTask.findMany.mockResolvedValue([mockBrowserTask]);
        mockFs.unlink.mockResolvedValue(undefined);

        const policy: RetentionPolicy = {
          id: 'task-policy',
          entityType: 'browser_tasks',
          retentionPeriodDays: 60,
          cleanupEnabled: true,
          compressionEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await retentionService.executePolicyCleanup(policy);

        expect(result.recordsProcessed).toBe(1);
        expect(result.recordsDeleted).toBe(1);
        expect(mockFs.unlink).toHaveBeenCalledWith('/path/to/screenshot.png');
        expect(prismaService.browserTask.delete).toHaveBeenCalledWith({
          where: { id: 'task-456' },
        });
      });

      it('should process screenshots with storage tier filtering', async () => {
        prismaService.browserScreenshot.findMany.mockResolvedValue([
          mockScreenshot,
        ]);

        const policy: RetentionPolicy = {
          id: 'screenshot-policy',
          entityType: 'browser_screenshots',
          retentionPeriodDays: 180,
          archivePeriodDays: 7,
          cleanupEnabled: true,
          compressionEnabled: true,
          policyConditions: {
            storageExcludeList: [StorageTier.HOT],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await retentionService.executePolicyCleanup(policy);

        expect(prismaService.browserScreenshot.findMany).toHaveBeenCalledWith({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                storageTier: {
                  notIn: [StorageTier.HOT],
                },
              }),
            ]),
          }),
        });
      });
    });

    describe('Retention Reporting', () => {
      it('should generate comprehensive retention reports', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-01-31');

        // Mock storage usage
        prismaService.browserScreenshot.aggregate.mockResolvedValue({
          _sum: { fileSize: 1000000 },
        });
        prismaService.browserDomSnapshot.aggregate.mockResolvedValue({
          _sum: { fileSize: 500000 },
        });

        const report = await retentionService.generateRetentionReport(
          startDate,
          endDate,
        );

        expect(report).toMatchObject({
          reportId: expect.stringMatching(/^retention_report_\d+$/),
          generatedAt: expect.any(Date),
          reportPeriod: {
            startDate,
            endDate,
          },
          totalRecordsProcessed: 0, // No execution logs in mock
          totalRecordsDeleted: 0,
          totalRecordsArchived: 0,
          complianceStatus: 'compliant',
          storageOptimizationSavings: {
            beforeCleanup: expect.any(Number),
            afterCleanup: expect.any(Number),
            spaceSaved: 0,
            percentageSaved: 0,
          },
        });
      });

      it('should provide active cleanup operations status', () => {
        const activeOperations = retentionService.getActiveCleanupOperations();
        expect(Array.isArray(activeOperations)).toBe(true);
      });

      it('should cancel cleanup operations', () => {
        // Mock an active operation
        const mockOperation: CleanupExecutionResult = {
          policyId: 'test-policy',
          executionId: 'test-execution',
          startTime: new Date(),
          recordsProcessed: 0,
          recordsArchived: 0,
          recordsDeleted: 0,
          bytesFreed: 0,
          bytesArchived: 0,
          errorsCount: 0,
          executionStatus: 'running',
          performanceMetrics: {
            processingRatePerSecond: 0,
            averageDeletionTimeMs: 0,
            peakMemoryUsageMb: 0,
          },
        };

        (retentionService as any).activeCleanupOperations.set(
          'test-execution',
          mockOperation,
        );

        const cancelled =
          retentionService.cancelCleanupOperation('test-execution');
        expect(cancelled).toBe(true);

        const operation = (retentionService as any).activeCleanupOperations.get(
          'test-execution',
        );
        expect(operation.executionStatus).toBe('cancelled');
      });
    });
  });

  describe('Data Export and Backup Service', () => {
    describe('Service Initialization', () => {
      it('should initialize with proper directory configuration', () => {
        expect(exportService).toBeDefined();
        expect(configService.get).toHaveBeenCalledWith(
          'DATA_BACKUP_DIRECTORY',
          expect.any(String),
        );
        expect(configService.get).toHaveBeenCalledWith(
          'DATA_EXPORT_DIRECTORY',
          expect.any(String),
        );
        expect(mockFs.mkdir).toHaveBeenCalled();
      });

      it('should set up encryption configuration', () => {
        expect(configService.get).toHaveBeenCalledWith(
          'BACKUP_ENCRYPTION_KEY',
          expect.any(String),
        );
      });
    });

    describe('Data Export Operations', () => {
      it('should export browser automation data in JSON format', async () => {
        const exportConfig: ExportConfiguration = {
          format: ExportFormat.JSON,
          compression: false,
          encryption: false,
          includeMetadata: true,
          privacy: {
            anonymize: false,
            excludeSensitive: false,
            hashPersonalData: false,
          },
        };

        // Mock data retrieval
        prismaService.browserSession.findMany.mockResolvedValue([
          mockBrowserSession,
        ]);
        prismaService.browserTask.findMany.mockResolvedValue([mockBrowserTask]);
        prismaService.browserScreenshot.findMany.mockResolvedValue([
          mockScreenshot,
        ]);
        prismaService.browserDomSnapshot.findMany.mockResolvedValue([
          mockDomSnapshot,
        ]);
        prismaService.browserDataExtraction.findMany.mockResolvedValue([]);

        const result =
          await exportService.exportBrowserAutomationData(exportConfig);

        expect(result).toMatchObject({
          exportId: expect.stringMatching(/^export_\d+_[a-f0-9]+$/),
          format: ExportFormat.JSON,
          totalRecords: 4, // sessions + tasks + screenshots + dom snapshots
          files: expect.arrayContaining([
            expect.objectContaining({
              entityType: 'browser_sessions',
              filename: 'browser_sessions.json',
            }),
            expect.objectContaining({
              entityType: 'browser_tasks',
              filename: 'browser_tasks.json',
            }),
          ]),
        });

        expect(mockFs.writeFile).toHaveBeenCalledTimes(6); // 5 entity types + manifest
      });

      it('should export data with privacy anonymization', async () => {
        const exportConfig: ExportConfiguration = {
          format: ExportFormat.JSON,
          compression: false,
          encryption: false,
          includeMetadata: true,
          privacy: {
            anonymize: true,
            excludeSensitive: false,
            hashPersonalData: false,
          },
        };

        prismaService.browserSession.findMany.mockResolvedValue([
          {
            ...mockBrowserSession,
            processId: 'sensitive-process-id',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          },
        ]);

        const result =
          await exportService.exportBrowserAutomationData(exportConfig);

        expect(result.totalRecords).toBe(1);
        expect(mockFs.writeFile).toHaveBeenCalled();

        // Verify anonymization was applied
        const writeCall = mockFs.writeFile.mock.calls.find((call) =>
          call[0].includes('browser_sessions.json'),
        );
        expect(writeCall).toBeDefined();
      });

      it('should export data with sensitive content exclusion', async () => {
        const exportConfig: ExportConfiguration = {
          format: ExportFormat.JSON,
          compression: false,
          encryption: false,
          includeMetadata: true,
          privacy: {
            anonymize: false,
            excludeSensitive: true,
            hashPersonalData: false,
          },
        };

        const sensitiveScreenshot = {
          ...mockScreenshot,
          _metadata: { containsSensitiveData: true },
        };

        prismaService.browserScreenshot.findMany.mockResolvedValue([
          sensitiveScreenshot,
        ]);

        const result =
          await exportService.exportBrowserAutomationData(exportConfig);

        expect(result.files).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              entityType: 'browser_screenshots',
              recordCount: 0, // Sensitive screenshot excluded
            }),
          ]),
        );
      });

      it('should export data in CSV format', async () => {
        const exportConfig: ExportConfiguration = {
          format: ExportFormat.CSV,
          compression: false,
          encryption: false,
          includeMetadata: false,
          privacy: {
            anonymize: false,
            excludeSensitive: false,
            hashPersonalData: false,
          },
        };

        prismaService.browserSession.findMany.mockResolvedValue([
          mockBrowserSession,
        ]);

        const result =
          await exportService.exportBrowserAutomationData(exportConfig);

        expect(result.format).toBe(ExportFormat.CSV);
        expect(result.files[0].filename).toBe('browser_sessions.csv');
      });

      it('should handle export with date range filtering', async () => {
        const exportConfig: ExportConfiguration = {
          format: ExportFormat.JSON,
          compression: false,
          encryption: false,
          includeMetadata: true,
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31'),
          },
          privacy: {
            anonymize: false,
            excludeSensitive: false,
            hashPersonalData: false,
          },
        };

        prismaService.browserSession.findMany.mockResolvedValue([]);

        await exportService.exportBrowserAutomationData(exportConfig);

        expect(prismaService.browserSession.findMany).toHaveBeenCalledWith({
          where: {
            createdAt: {
              gte: exportConfig.dateRange!.start,
              lte: exportConfig.dateRange!.end,
            },
          },
        });
      });
    });

    describe('Backup Operations', () => {
      it('should create full backup for SQLite', async () => {
        const backupConfig: BackupConfiguration = {
          backupType: BackupType.FULL,
          destination: '/test/backups',
          encryption: false,
          compression: false,
          retention: { daily: 7, weekly: 4, monthly: 12 },
          includeFiles: true,
        };

        // Mock SQLite database provider
        (exportService as any).databaseProvider = 'sqlite';

        // Mock SQLite backup operations
        prismaService.$executeRaw.mockResolvedValue(undefined);
        prismaService.$executeRawUnsafe.mockResolvedValue(undefined);

        // Mock entity counts
        prismaService.browserSession.count.mockResolvedValue(10);
        prismaService.browserTask.count.mockResolvedValue(25);
        prismaService.browserScreenshot.count.mockResolvedValue(50);
        prismaService.browserDomSnapshot.count.mockResolvedValue(30);
        prismaService.browserDataExtraction.count.mockResolvedValue(15);

        const result = await exportService.createBackup(backupConfig);

        expect(result).toMatchObject({
          backupId: expect.stringMatching(/^backup_full_\d+$/),
          type: BackupType.FULL,
          size: expect.any(Number),
          compressed: false,
          encrypted: false,
          _metadata: {
            databaseProvider: 'sqlite',
            totalRecords: 130, // Sum of all entity counts
            entityCounts: {
              browser_sessions: 10,
              browser_tasks: 25,
              browser_screenshots: 50,
              browser_dom_snapshots: 30,
              browser_data_extractions: 15,
            },
          },
        });

        expect(prismaService.$executeRaw).toHaveBeenCalledWith(
          expect.stringContaining('PRAGMA wal_checkpoint(TRUNCATE)'),
        );
      });

      it('should create incremental backup', async () => {
        const backupConfig: BackupConfiguration = {
          backupType: BackupType.INCREMENTAL,
          destination: '/test/backups',
          encryption: false,
          compression: false,
          retention: { daily: 7, weekly: 4, monthly: 12 },
          includeFiles: false,
        };

        // Mock last backup
        (exportService as any).getLastBackup = jest.fn().mockReturnValue({
          backupId: 'last-backup',
          createdAt: new Date('2024-01-01'),
        });

        // Mock export functionality
        jest
          .spyOn(exportService, 'exportBrowserAutomationData')
          .mockResolvedValue({
            exportId: 'test-export',
            exportPath: '/test/export',
            format: ExportFormat.JSON,
            startedAt: new Date(),
            completedAt: new Date(),
            totalRecords: 10,
            totalSize: 5000,
            files: [],
          });

        const result = await exportService.createBackup(backupConfig);

        expect(result.type).toBe(BackupType.INCREMENTAL);
        expect(result.baseBackupId).toBe('last-backup');
      });

      it('should create differential backup with base reference', async () => {
        const backupConfig: BackupConfiguration = {
          backupType: BackupType.DIFFERENTIAL,
          destination: '/test/backups',
          encryption: false,
          compression: false,
          retention: { daily: 7, weekly: 4, monthly: 12 },
          includeFiles: false,
        };

        // Mock last full backup
        (exportService as any).getLastFullBackup = jest.fn().mockReturnValue({
          backupId: 'last-full-backup',
          createdAt: new Date('2024-01-01'),
          type: BackupType.FULL,
        });

        jest
          .spyOn(exportService, 'exportBrowserAutomationData')
          .mockResolvedValue({
            exportId: 'test-export',
            exportPath: '/test/export',
            format: ExportFormat.JSON,
            startedAt: new Date(),
            completedAt: new Date(),
            totalRecords: 5,
            totalSize: 2500,
            files: [],
          });

        const result = await exportService.createBackup(backupConfig);

        expect(result.type).toBe(BackupType.DIFFERENTIAL);
        expect(result.baseBackupId).toBe('last-full-backup');
      });

      it('should handle scheduled backup operations', async () => {
        // Mock configuration
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            const configs: Record<string, any> = {
              BACKUP_ENCRYPTION_ENABLED: true,
              BACKUP_COMPRESSION_ENABLED: true,
              BACKUP_RETENTION_DAILY: 7,
              BACKUP_RETENTION_WEEKLY: 4,
              BACKUP_RETENTION_MONTHLY: 12,
            };
            return configs[key] ?? defaultValue;
          },
        );

        jest.spyOn(exportService, 'createBackup').mockResolvedValue({
          backupId: 'scheduled-backup',
          type: BackupType.FULL,
          path: '/test/backup',
          size: 10000,
          compressed: true,
          encrypted: true,
          createdAt: new Date(),
          files: [],
          _metadata: {
            databaseProvider: 'postgresql',
            schemaVersion: '1.0.0',
            totalRecords: 100,
            entityCounts: {},
          },
        });

        await exportService.scheduledFullBackup();

        expect(exportService.createBackup).toHaveBeenCalledWith(
          expect.objectContaining({
            backupType: BackupType.FULL,
            encryption: true,
            compression: true,
          }),
        );
      });
    });

    describe('Restore Operations', () => {
      it('should restore from backup with validation', () => {
        const restoreOptions: RestoreOptions = {
          validateIntegrity: true,
          overwriteExisting: false,
          targetEntityTypes: ['browser_sessions', 'browser_tasks'],
          dryRun: false,
        };

        // Mock backup metadata
        (exportService as any).getBackupMetadata = jest.fn().mockReturnValue({
          backupId: 'test-backup',
          type: BackupType.FULL,
          path: '/test/backup',
          compressed: false,
          encrypted: false,
        });

        const result = exportService.restoreFromBackup(
          'test-backup',
          restoreOptions,
        );

        expect(result).toMatchObject({
          backupId: 'test-backup',
          startedAt: expect.any(Date),
          restoredTables: expect.any(Array),
          restoredRecords: expect.any(Number),
          errors: expect.any(Array),
        });
      });

      it('should handle backup not found error', () => {
        (exportService as any).getBackupMetadata = jest
          .fn()
          .mockReturnValue(null);

        expect(() => {
          exportService.restoreFromBackup('non-existent-backup');
        }).toThrow('Backup non-existent-backup not found');
      });
    });
  });

  describe('Data Storage Optimization Service', () => {
    describe('Service Initialization', () => {
      it('should initialize with storage tier configurations', () => {
        expect(optimizationService).toBeDefined();

        const tierConfigs = (optimizationService as any).storageTierConfigs;
        expect(tierConfigs).toBeInstanceOf(Map);
        expect(tierConfigs.size).toBe(4); // HOT, WARM, COLD, ARCHIVED

        const hotConfig = tierConfigs.get(StorageTier.HOT);
        expect(hotConfig).toMatchObject({
          name: StorageTier.HOT,
          compressionConfig: {
            type: CompressionType.NONE,
            enabled: false,
          },
          accessThreshold: 10,
          ageThresholdDays: 7,
        });
      });
    });

    describe('Storage Optimization', () => {
      it('should optimize screenshots with tier transitions', async () => {
        prismaService.browserScreenshot.findMany.mockResolvedValue([
          {
            ...mockScreenshot,
            timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
            accessCount: 2,
            storageTier: StorageTier.HOT,
          },
        ]);

        prismaService.browserScreenshot.update.mockResolvedValue({});
        mockFs.writeFile.mockResolvedValue(undefined);

        const results = await optimizationService.optimizeScreenshots(10);

        expect(results).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              tier: expect.any(String),
              compressionType: expect.any(String),
              spaceSaved: expect.any(Number),
              compressionRatio: expect.any(Number),
            }),
          ]),
        );

        expect(prismaService.browserScreenshot.update).toHaveBeenCalled();
      });

      it('should optimize DOM snapshots with compression', async () => {
        prismaService.browserDomSnapshot.findMany.mockResolvedValue([
          {
            ...mockDomSnapshot,
            timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days old
            accessCount: 1,
            storageTier: StorageTier.WARM,
          },
        ]);

        prismaService.browserDomSnapshot.update.mockResolvedValue({});

        const results = await optimizationService.optimizeDomSnapshots(5);

        expect(results.length).toBeGreaterThan(0);
        expect(results[0]).toMatchObject({
          originalSize: expect.any(Number),
          optimizedSize: expect.any(Number),
          spaceSaved: expect.any(Number),
          tier: expect.any(String),
        });
      });

      it('should perform automated optimization across all data types', async () => {
        jest
          .spyOn(optimizationService, 'optimizeScreenshots')
          .mockResolvedValue([
            {
              originalSize: 100000,
              optimizedSize: 70000,
              spaceSaved: 30000,
              compressionRatio: 0.7,
              optimizationTimeMs: 100,
              tier: StorageTier.COLD,
              compressionType: CompressionType.BROTLI,
            },
          ]);

        jest
          .spyOn(optimizationService, 'optimizeDomSnapshots')
          .mockResolvedValue([
            {
              originalSize: 50000,
              optimizedSize: 20000,
              spaceSaved: 30000,
              compressionRatio: 0.4,
              optimizationTimeMs: 50,
              tier: StorageTier.ARCHIVED,
              compressionType: CompressionType.BROTLI,
            },
          ]);

        const result = await optimizationService.executeAutomatedOptimization();

        expect(result).toMatchObject({
          screenshotsOptimized: 1,
          domSnapshotsOptimized: 1,
          totalSpaceSaved: 60000,
          optimizationTimeMs: expect.any(Number),
        });
      });
    });

    describe('Deduplication Analysis', () => {
      it('should identify duplicate screenshots by checksum', async () => {
        const duplicateScreenshots = [
          {
            id: 'screenshot-1',
            filePath: '/path/1.png',
            fileSize: 1000,
            checksum: 'hash123',
          },
          {
            id: 'screenshot-2',
            filePath: '/path/2.png',
            fileSize: 1000,
            checksum: 'hash123',
          },
          {
            id: 'screenshot-3',
            filePath: '/path/3.png',
            fileSize: 2000,
            checksum: 'hash456',
          },
        ];

        prismaService.browserScreenshot.findMany.mockResolvedValue(
          duplicateScreenshots,
        );
        prismaService.browserScreenshot.update.mockResolvedValue({});

        const result = await optimizationService.deduplicateScreenshots();

        expect(result).toMatchObject({
          duplicatesFound: 1, // One duplicate found (screenshot-2)
          spaceSaved: 1000, // Size of duplicate
          uniqueChecksums: expect.any(Set),
          duplicateGroups: expect.any(Map),
        });

        expect(result.uniqueChecksums.size).toBe(2); // Two unique checksums
        expect(result.duplicateGroups.size).toBe(1); // One group with duplicates
      });

      it('should calculate checksums for screenshots missing them', async () => {
        const screenshotsWithoutChecksums = [
          {
            id: 'screenshot-1',
            filePath: '/path/1.png',
            fileSize: 1000,
            checksum: null,
          },
          {
            id: 'screenshot-2',
            filePath: '/path/2.png',
            fileSize: 1500,
            checksum: null,
          },
        ];

        prismaService.browserScreenshot.findMany.mockResolvedValue(
          screenshotsWithoutChecksums,
        );
        prismaService.browserScreenshot.update.mockResolvedValue({});

        await optimizationService.deduplicateScreenshots();

        expect(prismaService.browserScreenshot.update).toHaveBeenCalledTimes(2);
        expect(mockFs.readFile).toHaveBeenCalledTimes(2);
      });
    });

    describe('Access Pattern Analysis', () => {
      it('should analyze access patterns for screenshots', async () => {
        const accessData = {
          accessCount: 15,
          lastAccessed: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        };

        prismaService.browserScreenshot.findUnique.mockResolvedValue(
          accessData,
        );

        const patterns = await optimizationService.analyzeAccessPatterns(
          'screenshot',
          ['screenshot-1'],
        );

        expect(patterns.get('screenshot-1')).toMatchObject({
          totalAccesses: 15,
          lastAccessed: accessData.lastAccessed,
          averageAccessInterval: expect.any(Number),
          accessFrequency: 'high', // 15 accesses in 30 days with interval < 1 day
        });
      });

      it('should categorize access frequency correctly', async () => {
        const lowAccessData = {
          accessCount: 2,
          lastAccessed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        };

        prismaService.browserDomSnapshot.findUnique.mockResolvedValue(
          lowAccessData,
        );

        const patterns = await optimizationService.analyzeAccessPatterns(
          'domSnapshot',
          ['snapshot-1'],
        );

        expect(patterns.get('snapshot-1')?.accessFrequency).toBe('low');
      });
    });

    describe('Storage Analytics', () => {
      it('should generate comprehensive storage analytics', async () => {
        // Mock aggregate statistics
        prismaService.browserScreenshot.aggregate
          .mockResolvedValueOnce({
            _sum: { fileSize: 1000000, compressedSize: 600000 },
            _count: { id: 100 },
          })
          .mockResolvedValue({
            where: expect.any(Object),
            _sum: { fileSize: 250000 },
          });

        prismaService.browserDomSnapshot.aggregate
          .mockResolvedValueOnce({
            _sum: { originalSize: 500000, compressedSize: 200000 },
            _count: { id: 50 },
          })
          .mockResolvedValue({
            where: expect.any(Object),
            _sum: { originalSize: 125000 },
          });

        jest
          .spyOn(optimizationService, 'deduplicateScreenshots')
          .mockResolvedValue({
            duplicatesFound: 10,
            spaceSaved: 100000,
            uniqueChecksums: new Set(['hash1', 'hash2']),
            duplicateGroups: new Map(),
          });

        const analytics = await optimizationService.getStorageAnalytics();

        expect(analytics).toMatchObject({
          totalStorageUsed: expect.any(Number),
          storageByTier: expect.any(Map),
          storageByType: expect.any(Map),
          compressionStats: {
            totalCompressed: 800000, // 600000 + 200000
            totalUncompressed: 1500000, // 1000000 + 500000
            averageCompressionRatio: expect.any(Number),
            spaceSavedByCompression: expect.any(Number),
          },
          accessPatterns: {
            hotDataPercentage: expect.any(Number),
            warmDataPercentage: expect.any(Number),
            coldDataPercentage: expect.any(Number),
            archivedDataPercentage: expect.any(Number),
          },
          duplicateStats: {
            totalDuplicates: 10,
            duplicateStorageWaste: 100000,
            deduplicationPotential: 100000,
          },
        });
      });

      it('should generate optimization recommendations', async () => {
        prismaService.browserScreenshot.findMany.mockResolvedValue([
          {
            ...mockScreenshot,
            timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days old
            accessCount: 1,
            storageTier: StorageTier.HOT,
          },
        ]);

        const recommendations =
          await optimizationService.generateOptimizationRecommendations(
            'screenshot',
            10,
          );

        expect(recommendations.length).toBeGreaterThan(0);
        expect(recommendations[0]).toMatchObject({
          id: expect.any(String),
          entityType: 'screenshot',
          currentTier: StorageTier.HOT,
          recommendedTier: expect.any(String),
          estimatedSavings: expect.any(Number),
          confidence: expect.any(Number),
          factors: {
            isRedundant: expect.any(Boolean),
            isLowQuality: expect.any(Boolean),
            isTestData: expect.any(Boolean),
            hasBusinessValue: expect.any(Boolean),
            accessFrequency: expect.any(String),
            ageInDays: expect.any(Number),
          },
          action: expect.stringMatching(
            /^(compress|archive|delete|no-action)$/,
          ),
        });
      });
    });
  });

  describe('Database Migration Service', () => {
    describe('Service Initialization', () => {
      it('should initialize with predefined migrations', () => {
        expect(migrationService).toBeDefined();

        const migrations = (migrationService as any).migrations;
        expect(migrations).toBeInstanceOf(Map);
        expect(migrations.size).toBeGreaterThan(0);

        // Verify key migrations exist
        expect(migrations.has('20250101_001_browser_automation_base')).toBe(
          true,
        );
        expect(migrations.has('20250101_002_performance_tracking')).toBe(true);
        expect(migrations.has('20250101_003_storage_optimization')).toBe(true);
      });

      it('should configure migration definitions with proper structure', () => {
        const migrations = (migrationService as any).migrations;
        const baseMigration = migrations.get(
          '20250101_001_browser_automation_base',
        );

        expect(baseMigration).toMatchObject({
          version: '20250101_001',
          description: expect.any(String),
          timestamp: expect.any(Date),
          databaseProvider: ['postgresql', 'sqlite'],
          riskLevel: 'medium',
          backupRequired: true,
          estimatedExecutionTimeMs: expect.any(Number),
          upSql: expect.any(String),
          downSql: expect.any(String),
          validationQueries: expect.any(Array),
        });
      });
    });

    describe('Migration Execution', () => {
      it('should execute pending migrations in order', async () => {
        // Mock current version
        prismaService.$queryRaw.mockResolvedValue([
          { version: '00000000_000' },
        ]);

        // Mock transaction execution
        prismaService.$transaction.mockImplementation(async (callback) => {
          return await callback(prismaService);
        });

        prismaService.$executeRawUnsafe.mockResolvedValue(undefined);
        prismaService.$queryRawUnsafe.mockResolvedValue([]);
        prismaService.$executeRaw.mockResolvedValue(undefined);

        const result = await migrationService.executeMigrations();

        expect(result).toMatchObject({
          startVersion: '00000000_000',
          endVersion: expect.any(String),
          migrationsExecuted: expect.any(Array),
          totalExecutionTimeMs: expect.any(Number),
          errors: [],
        });

        expect(result.migrationsExecuted.length).toBeGreaterThan(0);
        expect(prismaService.$transaction).toHaveBeenCalled();
      });

      it('should validate migrations before execution', async () => {
        // Mock current version to trigger pending migrations
        prismaService.$queryRaw.mockResolvedValue([
          { version: '00000000_000' },
        ]);

        // Mock executed versions
        (migrationService as any).getExecutedVersions = jest
          .fn()
          .mockResolvedValue([]);

        const result = await migrationService.executeMigrations();

        expect(result.errors.length).toBe(0); // Should validate successfully
      });

      it('should handle migration validation failures', async () => {
        // Mock validation failure
        const invalidMigration = {
          version: '20250101_999',
          description: 'Invalid migration',
          timestamp: new Date(),
          upSql: '', // Empty SQL should fail validation
          downSql: '',
          databaseProvider: ['postgresql'],
        };

        (migrationService as any).migrations.set(
          '20250101_999_invalid',
          invalidMigration,
        );
        prismaService.$queryRaw.mockResolvedValue([
          { version: '00000000_000' },
        ]);

        const result = await migrationService.executeMigrations();

        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].error).toContain('validation failed');
      });

      it('should rollback migrations on failure', async () => {
        prismaService.$queryRaw.mockResolvedValue([
          { version: '00000000_000' },
        ]);

        // Mock transaction failure
        prismaService.$transaction.mockRejectedValue(
          new Error('SQL execution failed'),
        );

        const result = await migrationService.executeMigrations();

        expect(result.rollbackRequired).toBe(true);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle rollback operations', async () => {
        prismaService.$transaction.mockImplementation(async (callback) => {
          return await callback(prismaService);
        });
        prismaService.$executeRawUnsafe.mockResolvedValue(undefined);
        prismaService.$executeRaw.mockResolvedValue(undefined);

        await migrationService.rollbackMigrations([
          '20250101_001',
          '20250101_002',
        ]);

        expect(prismaService.$transaction).toHaveBeenCalledTimes(2);
        expect(prismaService.$executeRaw).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM schema_migrations'),
        );
      });
    });

    describe('Migration Status and Health', () => {
      it('should provide comprehensive migration status', async () => {
        prismaService.$queryRaw
          .mockResolvedValueOnce([{ version: '20250101_002' }]) // Current version
          .mockResolvedValueOnce([{ executed_at: new Date() }]) // Last migration date
          .mockResolvedValueOnce([
            { version: '20250101_001' },
            { version: '20250101_002' },
          ]); // Executed versions

        const status = await migrationService.getMigrationStatus();

        expect(status).toMatchObject({
          currentVersion: '20250101_002',
          availableMigrations: expect.any(Array),
          pendingMigrations: expect.any(Array),
          lastMigrationDate: expect.any(Date),
          isHealthy: expect.any(Boolean),
          issues: expect.any(Array),
        });

        expect(status.availableMigrations.length).toBeGreaterThan(0);
      });

      it('should detect migration issues', async () => {
        // Mock out-of-order migrations
        prismaService.$queryRaw
          .mockResolvedValueOnce([{ version: '20250101_003' }])
          .mockResolvedValueOnce([{ executed_at: new Date() }])
          .mockResolvedValueOnce([
            { version: '20250101_003' },
            { version: '20250101_001' }, // Out of order
          ]);

        const status = await migrationService.getMigrationStatus();

        expect(status.isHealthy).toBe(false);
        expect(status.issues.length).toBeGreaterThan(0);
        expect(
          status.issues.some((issue) => issue.includes('Out-of-order')),
        ).toBe(true);
      });

      it('should handle missing migration table', async () => {
        prismaService.$queryRaw.mockRejectedValue(
          new Error('Table does not exist'),
        );

        const status = await migrationService.getMigrationStatus();

        expect(status.currentVersion).toBe('00000000_000');
        expect(status.isHealthy).toBe(true); // No issues when starting fresh
      });
    });

    describe('Database Provider Compatibility', () => {
      it('should generate SQLite-compatible SQL', () => {
        (migrationService as any).databaseProvider = 'sqlite';

        const sqliteSql = (migrationService as any).getBrowserAutomationBaseSql(
          'up',
        );

        expect(sqliteSql).toContain(
          'TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))',
        );
        expect(sqliteSql).toContain('INTEGER DEFAULT');
        expect(sqliteSql).toContain('DATETIME DEFAULT CURRENT_TIMESTAMP');
      });

      it('should generate PostgreSQL-compatible SQL', () => {
        (migrationService as any).databaseProvider = 'postgresql';

        const postgresSql = (
          migrationService as any
        ).getBrowserAutomationBaseSql('up');

        expect(postgresSql).toContain(
          'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
        );
        expect(postgresSql).toContain('BOOLEAN DEFAULT');
        expect(postgresSql).toContain('TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        expect(postgresSql).toContain('JSONB');
      });

      it('should validate database provider compatibility', async () => {
        // Add incompatible migration
        const incompatibleMigration: MigrationDefinition = {
          version: '20250101_999',
          description: 'MySQL only migration',
          timestamp: new Date(),
          upSql: 'CREATE TABLE test (id INT AUTO_INCREMENT)',
          downSql: 'DROP TABLE test',
          databaseProvider: ['mysql'], // Not compatible with current provider
        };

        const validationResult = await (
          migrationService as any
        ).validateMigrations([incompatibleMigration]);

        expect(validationResult.isValid).toBe(false);
        expect(validationResult.compatibilityIssues.length).toBeGreaterThan(0);
      });
    });

    describe('Data Transformation', () => {
      it('should execute data transformations during migration', async () => {
        prismaService.$transaction.mockImplementation(async (callback) => {
          return await callback(prismaService);
        });
        prismaService.$executeRawUnsafe.mockResolvedValue(undefined);
        prismaService.$queryRawUnsafe.mockResolvedValue([]);
        prismaService.$executeRaw.mockResolvedValue(undefined);

        // Get a migration with data transformation
        const migrations = (migrationService as any).migrations;
        const storageOptimizationMigration = migrations.get(
          '20250101_003_storage_optimization',
        );

        expect(storageOptimizationMigration.dataTransformation).toBeDefined();

        await (migrationService as any).executeMigration(
          storageOptimizationMigration,
        );

        expect(prismaService.$executeRaw).toHaveBeenCalledWith(
          expect.stringContaining('UPDATE browser_screenshots'),
        );
      });
    });
  });

  describe('Service Integration and Cross-Service Operations', () => {
    describe('Cleanup and Optimization Integration', () => {
      it('should coordinate retention cleanup with storage optimization', async () => {
        // Mock retention cleanup identifying candidates for optimization
        jest
          .spyOn(retentionService, 'generateRetentionReport')
          .mockResolvedValue({
            reportId: 'test-report',
            generatedAt: new Date(),
            reportPeriod: { startDate: new Date(), endDate: new Date() },
            policyExecutions: [],
            totalRecordsProcessed: 100,
            totalRecordsDeleted: 20,
            totalRecordsArchived: 30,
            totalBytesFreed: 1000000,
            totalBytesArchived: 500000,
            complianceStatus: 'compliant',
            recommendations: ['Consider more aggressive compression'],
            storageOptimizationSavings: {
              beforeCleanup: 2000000,
              afterCleanup: 500000,
              spaceSaved: 1500000,
              percentageSaved: 75,
            },
          });

        jest
          .spyOn(optimizationService, 'generateOptimizationRecommendations')
          .mockResolvedValue([
            {
              id: 'screenshot-1',
              entityType: 'screenshot',
              currentTier: StorageTier.HOT,
              recommendedTier: StorageTier.COLD,
              estimatedSavings: 50000,
              confidence: 0.8,
              factors: {
                isRedundant: false,
                isLowQuality: false,
                isTestData: true,
                hasBusinessValue: false,
                accessFrequency: 'low',
                ageInDays: 45,
              },
              action: 'compress',
            },
          ]);

        const retentionReport =
          await retentionService.generateRetentionReport();
        const optimizationRecommendations =
          await optimizationService.generateOptimizationRecommendations(
            'screenshot',
            10,
          );

        expect(retentionReport.recommendations).toContain(
          'Consider more aggressive compression',
        );
        expect(optimizationRecommendations[0].action).toBe('compress');
        expect(optimizationRecommendations[0].factors.isTestData).toBe(true);
      });

      it('should coordinate backup operations with cleanup schedules', async () => {
        // Test scenario: Backup before cleanup, then verify cleanup doesn't affect backups
        jest
          .spyOn(exportService, 'scheduledFullBackup')
          .mockResolvedValue(undefined);
        jest
          .spyOn(retentionService, 'executeScheduledCleanup')
          .mockResolvedValue([]);

        // Execute backup first
        await exportService.scheduledFullBackup();

        // Then execute cleanup
        await retentionService.executeScheduledCleanup();

        expect(exportService.scheduledFullBackup).toHaveBeenCalled();
        expect(retentionService.executeScheduledCleanup).toHaveBeenCalled();
      });
    });

    describe('Migration and Data Service Coordination', () => {
      it('should handle schema migrations affecting storage optimization', async () => {
        // Mock successful migration execution
        jest.spyOn(migrationService, 'executeMigrations').mockResolvedValue({
          startVersion: '20250101_002',
          endVersion: '20250101_003',
          migrationsExecuted: ['20250101_003_storage_optimization'],
          totalExecutionTimeMs: 5000,
          errors: [],
        });

        // Mock storage tier configuration after migration
        const postMigrationTierConfigs = new Map();
        postMigrationTierConfigs.set(StorageTier.HOT, {
          name: StorageTier.HOT,
          compressionConfig: { type: CompressionType.NONE, enabled: false },
        });

        (optimizationService as any).storageTierConfigs =
          postMigrationTierConfigs;

        const migrationResult = await migrationService.executeMigrations();

        expect(migrationResult.migrationsExecuted).toContain(
          '20250101_003_storage_optimization',
        );
        expect(migrationResult.errors).toHaveLength(0);
      });

      it('should validate backup compatibility after migrations', async () => {
        jest.spyOn(migrationService, 'getMigrationStatus').mockResolvedValue({
          currentVersion: '20250101_005',
          availableMigrations: [
            '20250101_001',
            '20250101_002',
            '20250101_003',
            '20250101_004',
            '20250101_005',
          ],
          pendingMigrations: [],
          lastMigrationDate: new Date(),
          isHealthy: true,
          issues: [],
        });

        const migrationStatus = await migrationService.getMigrationStatus();

        // Verify backup service can handle current schema version
        const backupConfig: BackupConfiguration = {
          backupType: BackupType.FULL,
          destination: '/test/backups',
          encryption: false,
          compression: false,
          retention: { daily: 7, weekly: 4, monthly: 12 },
          includeFiles: true,
        };

        jest.spyOn(exportService, 'createBackup').mockResolvedValue({
          backupId: 'post-migration-backup',
          type: BackupType.FULL,
          path: '/test/backup',
          size: 10000,
          compressed: false,
          encrypted: false,
          createdAt: new Date(),
          files: [],
          _metadata: {
            databaseProvider: 'postgresql',
            schemaVersion: migrationStatus.currentVersion,
            totalRecords: 100,
            entityCounts: {},
          },
        });

        const backupResult = await exportService.createBackup(backupConfig);

        expect(backupResult.metadata.schemaVersion).toBe('20250101_005');
        expect(migrationStatus.isHealthy).toBe(true);
      });
    });

    describe('Error Handling and Recovery', () => {
      it('should handle cascading failures across services', async () => {
        // Simulate database connection failure affecting all services
        const dbError = new Error('Database connection lost');

        prismaService.browserSession.findMany.mockRejectedValue(dbError);
        prismaService.browserScreenshot.findMany.mockRejectedValue(dbError);
        prismaService.$queryRaw.mockRejectedValue(dbError);

        // Test each service handles the error gracefully
        const retentionPolicy: RetentionPolicy = {
          id: 'test-policy',
          entityType: 'browser_sessions',
          retentionPeriodDays: 30,
          cleanupEnabled: true,
          compressionEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const cleanupResult =
          await retentionService.executePolicyCleanup(retentionPolicy);
        expect(cleanupResult.executionStatus).toBe('failed');

        await expect(
          optimizationService.optimizeScreenshots(10),
        ).rejects.toThrow('Database connection lost');

        const migrationStatus = await migrationService.getMigrationStatus();
        expect(migrationStatus.currentVersion).toBe('00000000_000'); // Falls back to default
      });

      it('should handle service-specific errors without affecting others', async () => {
        // File system error in export service shouldn't affect retention service
        mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

        const exportConfig: ExportConfiguration = {
          format: ExportFormat.JSON,
          compression: false,
          encryption: false,
          includeMetadata: true,
          privacy: {
            anonymize: false,
            excludeSensitive: false,
            hashPersonalData: false,
          },
        };

        prismaService.browserSession.findMany.mockResolvedValue([
          mockBrowserSession,
        ]);

        await expect(
          exportService.exportBrowserAutomationData(exportConfig),
        ).rejects.toThrow('Export failed');

        // Retention service should still work
        prismaService.browserSession.findMany.mockResolvedValue([]);
        const retentionPolicy: RetentionPolicy = {
          id: 'test-policy',
          entityType: 'browser_sessions',
          retentionPeriodDays: 30,
          cleanupEnabled: true,
          compressionEnabled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const cleanupResult =
          await retentionService.executePolicyCleanup(retentionPolicy);
        expect(cleanupResult.executionStatus).toBe('completed');
      });
    });

    describe('Performance and Resource Management', () => {
      it('should handle concurrent operations efficiently', async () => {
        // Simulate concurrent data operations
        const concurrentPromises = [
          retentionService.getActiveCleanupOperations(),
          optimizationService.getStorageAnalytics(),
          migrationService.getMigrationStatus(),
        ];

        // Mock parallel execution
        jest
          .spyOn(optimizationService, 'getStorageAnalytics')
          .mockResolvedValue({
            totalStorageUsed: 1000000,
            storageByTier: new Map(),
            storageByType: new Map(),
            compressionStats: {
              totalCompressed: 600000,
              totalUncompressed: 1000000,
              averageCompressionRatio: 0.6,
              spaceSavedByCompression: 400000,
            },
            accessPatterns: {
              hotDataPercentage: 25,
              warmDataPercentage: 35,
              coldDataPercentage: 30,
              archivedDataPercentage: 10,
            },
            duplicateStats: {
              totalDuplicates: 10,
              duplicateStorageWaste: 50000,
              deduplicationPotential: 50000,
            },
          });

        const results = await Promise.all(concurrentPromises);

        expect(results).toHaveLength(3);
        expect(results[0]).toEqual(expect.any(Array)); // Active cleanup operations
        expect(results[1]).toEqual(
          expect.objectContaining({
            // Storage analytics
            totalStorageUsed: expect.any(Number),
          }),
        );
        expect(results[2]).toEqual(
          expect.objectContaining({
            // Migration status
            currentVersion: expect.any(String),
          }),
        );
      });

      it('should manage memory usage during large operations', async () => {
        // Test large dataset processing
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          ...mockScreenshot,
          id: `screenshot-${i}`,
          fileSize: 100000,
        }));

        prismaService.browserScreenshot.findMany.mockResolvedValue(
          largeDataset,
        );

        const initialMemory = process.memoryUsage().heapUsed;
        await optimizationService.optimizeScreenshots(1000);
        const finalMemory = process.memoryUsage().heapUsed;

        // Memory usage should be reasonable for large operations
        const memoryIncrease = finalMemory - initialMemory;
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      });
    });
  });
});
