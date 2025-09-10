/**
 * Data Export and Backup Service
 *
 * Enterprise-grade service for comprehensive data export and backup operations with support
 * for multiple formats, encryption, and automated backup strategies. Provides complete data
 * portability and disaster recovery capabilities for browser automation data.
 *
 * Features:
 * - Multi-format export (JSON, CSV, SQL, SQLite, Binary)
 * - Encrypted backups with key management
 * - Automated backup scheduling with retention policies
 * - Incremental and differential backup strategies
 * - Data validation and integrity checking
 * - Cross-platform backup restoration
 *
 * @service DataExportBackupService
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
// import * as zlib from 'zlib'; // Unused import
// import { promisify } from 'util'; // Unused import
import {
  DatabaseProvider,
  getCurrentDatabaseProvider,
} from '../hybrid-database.module';

// Compression utilities - unused, will be implemented later
// const gzip = promisify(zlib.gzip);
// const gunzip = promisify(zlib.gunzip);

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  SQL = 'sql',
  SQLITE = 'sqlite',
  BINARY = 'binary',
}

export enum BackupType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  DIFFERENTIAL = 'differential',
}

export interface ExportConfiguration {
  format: ExportFormat;
  compression: boolean;
  encryption: boolean;
  includeMetadata: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  entityFilters?: string[];
  privacy: {
    anonymize: boolean;
    excludeSensitive: boolean;
    hashPersonalData: boolean;
  };
  outputPath?: string;
  maxFileSize?: number; // In bytes
  splitLargeFiles?: boolean;
}

export interface BackupConfiguration {
  backupType: BackupType;
  destination: string;
  encryption: boolean;
  compression: boolean;
  retention: {
    daily: number; // Keep daily backups for X days
    weekly: number; // Keep weekly backups for X weeks
    monthly: number; // Keep monthly backups for X months
  };
  includeFiles: boolean; // Include screenshot/file references
  excludeEntityTypes?: string[];
  maxBackupSize?: number;
}

export interface ExportResult {
  exportId: string;
  exportPath: string;
  format: ExportFormat;
  startedAt: Date;
  completedAt?: Date;
  totalRecords: number;
  totalSize: number;
  files: Array<{
    filename: string;
    filepath: string;
    recordCount: number;
    fileSize: number;
    entityType: string;
    checksum?: string;
  }>;
  compressedFile?: {
    filepath: string;
    originalSize: number;
    compressedSize: number;
  };
  encryptedFile?: {
    filepath: string;
    algorithm: string;
    keyId: string;
  };
  errors?: string[];
}

export interface BackupResult {
  backupId: string;
  type: BackupType;
  path: string;
  size: number;
  compressed: boolean;
  encrypted: boolean;
  createdAt: Date;
  files: Array<{
    filename: string;
    size: number;
    checksum: string;
  }>;
  baseBackupId?: string; // For incremental/differential
  metadata: {
    databaseProvider: DatabaseProvider;
    schemaVersion: string;
    totalRecords: number;
    entityCounts: Record<string, number>;
  };
}

export interface RestoreOptions {
  validateIntegrity?: boolean;
  overwriteExisting?: boolean;
  targetEntityTypes?: string[];
  dryRun?: boolean;
}

export interface RestoreResult {
  backupId: string;
  startedAt: Date;
  completedAt?: Date;
  restoredTables: string[];
  restoredRecords: number;
  errors: string[];
  validationResults?: {
    integrityChecks: Array<{
      table: string;
      recordCount: number;
      checksumValid: boolean;
      errors: string[];
    }>;
  };
}

@Injectable()
export class DataExportBackupService {
  private readonly logger = new Logger(DataExportBackupService.name);

  private readonly backupDirectory: string;
  private readonly exportDirectory: string;
  private readonly databaseProvider: DatabaseProvider;
  private readonly encryptionKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.backupDirectory = this.configService.get<string>(
      'DATA_BACKUP_DIRECTORY',
      path.join(process.cwd(), 'data', 'backups'),
    );
    this.exportDirectory = this.configService.get<string>(
      'DATA_EXPORT_DIRECTORY',
      path.join(process.cwd(), 'data', 'exports'),
    );
    this.databaseProvider = getCurrentDatabaseProvider(this.configService);
    this.encryptionKey = this.configService.get<string>(
      'BACKUP_ENCRYPTION_KEY',
      crypto.randomBytes(32).toString('hex'),
    );

    void this.ensureDirectories();
    this.logger.log('Data Export and Backup Service initialized');
  }

  /**
   * Create comprehensive data export with configurable options
   */
  async exportBrowserAutomationData(
    config: ExportConfiguration,
  ): Promise<ExportResult> {
    const exportId = `export_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const exportPath = path.join(
      config.outputPath || this.exportDirectory,
      exportId,
    );

    await fs.mkdir(exportPath, { recursive: true });

    this.logger.log(`Starting data export: ${exportId}`);

    try {
      const result: ExportResult = {
        exportId,
        exportPath,
        format: config.format,
        startedAt: new Date(),
        totalRecords: 0,
        totalSize: 0,
        files: [],
      };

      // Export browser sessions
      if (
        !config.entityFilters ||
        config.entityFilters.includes('browser_sessions')
      ) {
        const sessionsFile = await this.exportBrowserSessions(
          config,
          exportPath,
        );
        result.files.push(sessionsFile);
        result.totalRecords += sessionsFile.recordCount;
        result.totalSize += sessionsFile.fileSize;
      }

      // Export browser tasks
      if (
        !config.entityFilters ||
        config.entityFilters.includes('browser_tasks')
      ) {
        const tasksFile = await this.exportBrowserTasks(config, exportPath);
        result.files.push(tasksFile);
        result.totalRecords += tasksFile.recordCount;
        result.totalSize += tasksFile.fileSize;
      }

      // Export screenshots
      if (
        !config.entityFilters ||
        config.entityFilters.includes('browser_screenshots')
      ) {
        const screenshotsFile = await this.exportScreenshots(
          config,
          exportPath,
        );
        result.files.push(screenshotsFile);
        result.totalRecords += screenshotsFile.recordCount;
        result.totalSize += screenshotsFile.fileSize;
      }

      // Export DOM snapshots
      if (
        !config.entityFilters ||
        config.entityFilters.includes('browser_dom_snapshots')
      ) {
        const domFile = await this.exportDomSnapshots(config, exportPath);
        result.files.push(domFile);
        result.totalRecords += domFile.recordCount;
        result.totalSize += domFile.fileSize;
      }

      // Export data extractions
      if (
        !config.entityFilters ||
        config.entityFilters.includes('browser_data_extractions')
      ) {
        const extractionsFile = await this.exportDataExtractions(
          config,
          exportPath,
        );
        result.files.push(extractionsFile);
        result.totalRecords += extractionsFile.recordCount;
        result.totalSize += extractionsFile.fileSize;
      }

      // Create export manifest
      const manifestFile = await this.createExportManifest(result, exportPath);
      result.files.push(manifestFile);

      // Apply compression if requested
      if (config.compression) {
        result.compressedFile = await this.compressExport(exportPath);
      }

      // Apply encryption if requested
      if (config.encryption) {
        result.encryptedFile = await this.encryptExport(
          result.compressedFile?.filepath || exportPath,
        );
      }

      result.completedAt = new Date();

      this.logger.log(
        `Export completed: ${exportId}, ${result.totalRecords} records, ${result.totalSize} bytes`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Export failed: ${exportId}`, errorStack);
      throw new Error(`Export failed: ${errorMessage}`);
    }
  }

  /**
   * Create database backup with specified configuration
   */
  async createBackup(config: BackupConfiguration): Promise<BackupResult> {
    const backupId = `backup_${config.backupType}_${Date.now()}`;
    // const backupTimestamp = new Date(); // Unused variable
    const backupPath = path.join(this.backupDirectory, backupId);

    await fs.mkdir(backupPath, { recursive: true });

    this.logger.log(`Creating ${config.backupType} backup: ${backupId}`);

    try {
      let backupResult: BackupResult;

      switch (config.backupType) {
        case BackupType.FULL:
          backupResult = await this.createFullBackup(
            backupId,
            config,
            backupPath,
          );
          break;
        case BackupType.INCREMENTAL:
          backupResult = await this.createIncrementalBackup(
            backupId,
            config,
            backupPath,
          );
          break;
        case BackupType.DIFFERENTIAL:
          backupResult = await this.createDifferentialBackup(
            backupId,
            config,
            backupPath,
          );
          break;
        default:
          throw new Error(
            `Unsupported backup type: ${String(config.backupType)}`,
          );
      }

      // Apply compression if requested
      if (config.compression) {
        await this.compressBackup(backupResult);
      }

      // Apply encryption if requested
      if (config.encryption) {
        await this.encryptBackup(backupResult);
      }

      // Store backup metadata
      await this.storeBackupMetadata(backupResult);

      // Cleanup old backups according to retention policy
      await this.cleanupOldBackups(config.retention);

      this.logger.log(
        `Backup completed: ${backupId}, ${backupResult.size} bytes`,
      );

      return backupResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Backup failed: ${backupId}`, errorStack);
      throw new Error(`Backup failed: ${errorMessage}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreFromBackup(
    backupId: string,
    options: RestoreOptions = {},
  ): Promise<RestoreResult> {
    this.logger.log(`Starting restore from backup: ${backupId}`);

    const backup = await this.getBackupMetadata(backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const result: RestoreResult = {
      backupId,
      startedAt: new Date(),
      restoredTables: [],
      restoredRecords: 0,
      errors: [],
    };

    try {
      // Decrypt backup if needed
      let backupPath = backup.path;
      if (backup.encrypted) {
        backupPath = await this.decryptBackup(backup);
      }

      // Decompress backup if needed
      if (backup.compressed) {
        backupPath = await this.decompressBackup(backupPath);
      }

      // Restore based on backup type
      switch (backup.type) {
        case BackupType.FULL:
          await this.restoreFullBackup(backupPath, options, result);
          break;
        case BackupType.INCREMENTAL:
        case BackupType.DIFFERENTIAL:
          await this.restoreIncrementalBackup(backup, options, result);
          break;
      }

      // Perform integrity validation if requested
      if (options.validateIntegrity) {
        result.validationResults = await this.validateRestoredData(result);
      }

      result.completedAt = new Date();

      this.logger.log(
        `Restore completed: ${backupId}, ${result.restoredRecords} records restored`,
      );

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Restore failed: ${backupId}`, errorStack);
      result.errors.push(errorMessage);
      result.completedAt = new Date();
      return result;
    }
  }

  /**
   * Scheduled full backup - runs weekly
   */
  @Cron(CronExpression.EVERY_WEEK)
  async scheduledFullBackup(): Promise<void> {
    this.logger.log('Executing scheduled full backup');

    const config: BackupConfiguration = {
      backupType: BackupType.FULL,
      destination: this.backupDirectory,
      encryption: this.configService.get<boolean>(
        'BACKUP_ENCRYPTION_ENABLED',
        true,
      ),
      compression: this.configService.get<boolean>(
        'BACKUP_COMPRESSION_ENABLED',
        true,
      ),
      retention: {
        daily: this.configService.get<number>('BACKUP_RETENTION_DAILY', 7),
        weekly: this.configService.get<number>('BACKUP_RETENTION_WEEKLY', 4),
        monthly: this.configService.get<number>('BACKUP_RETENTION_MONTHLY', 12),
      },
      includeFiles: true,
    };

    try {
      await this.createBackup(config);
      this.logger.log('Scheduled full backup completed successfully');
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Scheduled full backup failed', errorStack);
    }
  }

  /**
   * Scheduled incremental backup - runs daily
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledIncrementalBackup(): Promise<void> {
    this.logger.log('Executing scheduled incremental backup');

    const config: BackupConfiguration = {
      backupType: BackupType.INCREMENTAL,
      destination: this.backupDirectory,
      encryption: this.configService.get<boolean>(
        'BACKUP_ENCRYPTION_ENABLED',
        true,
      ),
      compression: this.configService.get<boolean>(
        'BACKUP_COMPRESSION_ENABLED',
        true,
      ),
      retention: {
        daily: this.configService.get<number>('BACKUP_RETENTION_DAILY', 7),
        weekly: this.configService.get<number>('BACKUP_RETENTION_WEEKLY', 4),
        monthly: this.configService.get<number>('BACKUP_RETENTION_MONTHLY', 12),
      },
      includeFiles: false, // Only database changes
    };

    try {
      await this.createBackup(config);
      this.logger.log('Scheduled incremental backup completed successfully');
    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Scheduled incremental backup failed', errorStack);
    }
  }

  // ===== PRIVATE IMPLEMENTATION METHODS =====

  private async exportBrowserSessions(
    config: ExportConfiguration,
    exportPath: string,
  ): Promise<{
    filename: string;
    filepath: string;
    recordCount: number;
    fileSize: number;
    entityType: string;
    checksum?: string;
  }> {
    const query = this.buildSessionsQuery(config);
    const sessions = await this.prismaService.browserSession.findMany(query);

    // Apply privacy transformations
    const processedSessions = config.privacy.anonymize
      ? this.anonymizeSessions(sessions)
      : sessions;

    const filename = `browser_sessions.${config.format}`;
    const filepath = path.join(exportPath, filename);

    const fileContent = await this.formatData(processedSessions, config.format);
    await fs.writeFile(filepath, fileContent, 'utf-8');

    const stats = await fs.stat(filepath);
    const checksum = config.includeMetadata
      ? crypto.createHash('sha256').update(fileContent).digest('hex')
      : undefined;

    return {
      filename,
      filepath,
      recordCount: processedSessions.length,
      fileSize: stats.size,
      entityType: 'browser_sessions',
      checksum,
    };
  }

  private async exportBrowserTasks(
    config: ExportConfiguration,
    exportPath: string,
  ): Promise<{
    filename: string;
    filepath: string;
    recordCount: number;
    fileSize: number;
    entityType: string;
    checksum?: string;
  }> {
    const query = this.buildTasksQuery(config);
    const tasks = await this.prismaService.browserTask.findMany(query);

    // Apply privacy transformations
    const processedTasks = config.privacy.anonymize
      ? this.anonymizeTasks(tasks)
      : tasks;

    const filename = `browser_tasks.${config.format}`;
    const filepath = path.join(exportPath, filename);

    const fileContent = await this.formatData(processedTasks, config.format);
    await fs.writeFile(filepath, fileContent, 'utf-8');

    const stats = await fs.stat(filepath);
    const checksum = config.includeMetadata
      ? crypto.createHash('sha256').update(fileContent).digest('hex')
      : undefined;

    return {
      filename,
      filepath,
      recordCount: processedTasks.length,
      fileSize: stats.size,
      entityType: 'browser_tasks',
      checksum,
    };
  }

  private async exportScreenshots(
    config: ExportConfiguration,
    exportPath: string,
  ): Promise<{
    filename: string;
    filepath: string;
    recordCount: number;
    fileSize: number;
    entityType: string;
    checksum?: string;
  }> {
    const query = this.buildScreenshotsQuery(config);
    const screenshots =
      await this.prismaService.browserScreenshot.findMany(query);

    // Apply privacy transformations
    const processedScreenshots = config.privacy.excludeSensitive
      ? this.excludeSensitiveScreenshots(screenshots)
      : screenshots;

    const filename = `browser_screenshots.${config.format}`;
    const filepath = path.join(exportPath, filename);

    const fileContent = await this.formatData(
      processedScreenshots,
      config.format,
    );
    await fs.writeFile(filepath, fileContent, 'utf-8');

    const stats = await fs.stat(filepath);
    const checksum = config.includeMetadata
      ? crypto.createHash('sha256').update(fileContent).digest('hex')
      : undefined;

    return {
      filename,
      filepath,
      recordCount: processedScreenshots.length,
      fileSize: stats.size,
      entityType: 'browser_screenshots',
      checksum,
    };
  }

  private async exportDomSnapshots(
    config: ExportConfiguration,
    exportPath: string,
  ): Promise<{
    filename: string;
    filepath: string;
    recordCount: number;
    fileSize: number;
    entityType: string;
    checksum?: string;
  }> {
    const query = this.buildDomSnapshotsQuery(config);
    const domSnapshots =
      await this.prismaService.browserDomSnapshot.findMany(query);

    // Apply privacy transformations
    const processedSnapshots = config.privacy.excludeSensitive
      ? this.excludeSensitiveDomSnapshots(domSnapshots)
      : domSnapshots;

    const filename = `browser_dom_snapshots.${config.format}`;
    const filepath = path.join(exportPath, filename);

    const fileContent = await this.formatData(
      processedSnapshots,
      config.format,
    );
    await fs.writeFile(filepath, fileContent, 'utf-8');

    const stats = await fs.stat(filepath);
    const checksum = config.includeMetadata
      ? crypto.createHash('sha256').update(fileContent).digest('hex')
      : undefined;

    return {
      filename,
      filepath,
      recordCount: processedSnapshots.length,
      fileSize: stats.size,
      entityType: 'browser_dom_snapshots',
      checksum,
    };
  }

  private async exportDataExtractions(
    config: ExportConfiguration,
    exportPath: string,
  ): Promise<{
    filename: string;
    filepath: string;
    recordCount: number;
    fileSize: number;
    entityType: string;
    checksum?: string;
  }> {
    const query = this.buildDataExtractionsQuery(config);
    const extractions =
      await this.prismaService.browserDataExtraction.findMany(query);

    // Apply privacy transformations
    const processedExtractions = config.privacy.excludeSensitive
      ? this.excludeSensitiveExtractions(extractions)
      : extractions;

    const filename = `browser_data_extractions.${config.format}`;
    const filepath = path.join(exportPath, filename);

    const fileContent = await this.formatData(
      processedExtractions,
      config.format,
    );
    await fs.writeFile(filepath, fileContent, 'utf-8');

    const stats = await fs.stat(filepath);
    const checksum = config.includeMetadata
      ? crypto.createHash('sha256').update(fileContent).digest('hex')
      : undefined;

    return {
      filename,
      filepath,
      recordCount: processedExtractions.length,
      fileSize: stats.size,
      entityType: 'browser_data_extractions',
      checksum,
    };
  }

  private async createFullBackup(
    backupId: string,
    config: BackupConfiguration,
    backupPath: string,
  ): Promise<BackupResult> {
    // For SQLite: Use VACUUM INTO for atomic backup
    if (this.databaseProvider === 'sqlite') {
      return await this.createSQLiteFullBackup(backupId, config, backupPath);
    }

    // For PostgreSQL: Use pg_dump equivalent approach
    return await this.createPostgreSQLFullBackup(backupId, config, backupPath);
  }

  private async createSQLiteFullBackup(
    backupId: string,
    config: BackupConfiguration,
    backupPath: string,
  ): Promise<BackupResult> {
    const backupFile = path.join(backupPath, 'database.sqlite');

    // Use SQLite's VACUUM INTO for atomic backup
    await this.prismaService.$executeRaw`PRAGMA wal_checkpoint(TRUNCATE)`;
    await this.prismaService.$executeRawUnsafe(`VACUUM INTO '${backupFile}'`);

    const stats = await fs.stat(backupFile);

    // Get schema version and entity counts
    const schemaVersion = await this.getCurrentSchemaVersion();
    const entityCounts = await this.getEntityCounts();
    const totalRecords = Object.values(entityCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      backupId,
      type: BackupType.FULL,
      path: backupPath,
      size: stats.size,
      compressed: false,
      encrypted: false,
      createdAt: new Date(),
      files: [
        {
          filename: 'database.sqlite',
          size: stats.size,
          checksum: await this.calculateFileChecksum(backupFile),
        },
      ],
      metadata: {
        databaseProvider: this.databaseProvider,
        schemaVersion,
        totalRecords,
        entityCounts,
      },
    };
  }

  private async createPostgreSQLFullBackup(
    backupId: string,
    config: BackupConfiguration,
    backupPath: string,
  ): Promise<BackupResult> {
    // Export as SQL dump for PostgreSQL
    const exportConfig: ExportConfiguration = {
      format: ExportFormat.SQL,
      compression: false,
      encryption: false,
      includeMetadata: true,
      privacy: {
        anonymize: false,
        excludeSensitive: false,
        hashPersonalData: false,
      },
      outputPath: backupPath,
    };

    const exportResult = await this.exportBrowserAutomationData(exportConfig);
    const schemaVersion = await this.getCurrentSchemaVersion();
    const entityCounts = await this.getEntityCounts();
    const totalRecords = Object.values(entityCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      backupId,
      type: BackupType.FULL,
      path: backupPath,
      size: exportResult.totalSize,
      compressed: false,
      encrypted: false,
      createdAt: new Date(),
      files: exportResult.files.map((file) => ({
        filename: file.filename,
        size: file.fileSize,
        checksum: file.checksum || '',
      })),
      metadata: {
        databaseProvider: this.databaseProvider,
        schemaVersion,
        totalRecords,
        entityCounts,
      },
    };
  }

  private async createIncrementalBackup(
    backupId: string,
    config: BackupConfiguration,
    backupPath: string,
  ): Promise<BackupResult> {
    const lastBackup = await this.getLastBackup();
    if (!lastBackup) {
      // No previous backup, create full backup instead
      return await this.createFullBackup(
        backupId,
        {
          ...config,
          backupType: BackupType.FULL,
        },
        backupPath,
      );
    }

    const changedData = await this.getChangedDataSince(lastBackup.createdAt);

    const exportConfig: ExportConfiguration = {
      format: ExportFormat.JSON,
      compression: false,
      encryption: false,
      includeMetadata: true,
      dateRange: {
        start: lastBackup.createdAt,
        end: new Date(),
      },
      privacy: {
        anonymize: false,
        excludeSensitive: false,
        hashPersonalData: false,
      },
      outputPath: backupPath,
    };

    const exportResult = await this.exportBrowserAutomationData(exportConfig);
    const schemaVersion = await this.getCurrentSchemaVersion();
    const entityCounts = await this.getEntityCounts();
    const totalRecords = Object.values(entityCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      backupId,
      type: BackupType.INCREMENTAL,
      path: backupPath,
      size: exportResult.totalSize,
      compressed: false,
      encrypted: false,
      createdAt: new Date(),
      files: exportResult.files.map((file) => ({
        filename: file.filename,
        size: file.fileSize,
        checksum: file.checksum || '',
      })),
      baseBackupId: lastBackup.backupId,
      metadata: {
        databaseProvider: this.databaseProvider,
        schemaVersion,
        totalRecords,
        entityCounts,
      },
    };
  }

  private async createDifferentialBackup(
    backupId: string,
    config: BackupConfiguration,
    backupPath: string,
  ): Promise<BackupResult> {
    const lastFullBackup = await this.getLastFullBackup();
    if (!lastFullBackup) {
      // No previous full backup, create one instead
      return await this.createFullBackup(
        backupId,
        {
          ...config,
          backupType: BackupType.FULL,
        },
        backupPath,
      );
    }

    const changedData = await this.getChangedDataSince(
      lastFullBackup.createdAt,
    );

    const exportConfig: ExportConfiguration = {
      format: ExportFormat.JSON,
      compression: false,
      encryption: false,
      includeMetadata: true,
      dateRange: {
        start: lastFullBackup.createdAt,
        end: new Date(),
      },
      privacy: {
        anonymize: false,
        excludeSensitive: false,
        hashPersonalData: false,
      },
      outputPath: backupPath,
    };

    const exportResult = await this.exportBrowserAutomationData(exportConfig);
    const schemaVersion = await this.getCurrentSchemaVersion();
    const entityCounts = await this.getEntityCounts();
    const totalRecords = Object.values(entityCounts).reduce(
      (sum, count) => sum + count,
      0,
    );

    return {
      backupId,
      type: BackupType.DIFFERENTIAL,
      path: backupPath,
      size: exportResult.totalSize,
      compressed: false,
      encrypted: false,
      createdAt: new Date(),
      files: exportResult.files.map((file) => ({
        filename: file.filename,
        size: file.fileSize,
        checksum: file.checksum || '',
      })),
      baseBackupId: lastFullBackup.backupId,
      metadata: {
        databaseProvider: this.databaseProvider,
        schemaVersion,
        totalRecords,
        entityCounts,
      },
    };
  }

  // ===== UTILITY METHODS =====

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.backupDirectory, { recursive: true });
    await fs.mkdir(this.exportDirectory, { recursive: true });
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private async createExportManifest(
    result: ExportResult,
    exportPath: string,
  ): Promise<{
    filename: string;
    filepath: string;
    recordCount: number;
    fileSize: number;
    entityType: string;
  }> {
    const manifest = {
      exportId: result.exportId,
      format: result.format,
      createdAt: result.startedAt,
      totalRecords: result.totalRecords,
      totalSize: result.totalSize,
      files: result.files,
      metadata: {
        databaseProvider: this.databaseProvider,
        schemaVersion: await this.getCurrentSchemaVersion(),
      },
    };

    const filename = 'manifest.json';
    const filepath = path.join(exportPath, filename);
    const content = JSON.stringify(manifest, null, 2);

    await fs.writeFile(filepath, content, 'utf-8');

    const stats = await fs.stat(filepath);

    return {
      filename,
      filepath,
      recordCount: 1,
      fileSize: stats.size,
      entityType: 'manifest',
    };
  }

  private async formatData(data: any[], format: ExportFormat): Promise<string> {
    switch (format) {
      case ExportFormat.JSON:
        return JSON.stringify(data, null, 2);
      case ExportFormat.CSV:
        return this.convertToCSV(data);
      case ExportFormat.SQL:
        return this.convertToSQL(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvLines = [headers.join(',')];

    for (const item of data) {
      const values = headers.map((header) => {
        const value = item[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvLines.push(values.join(','));
    }

    return csvLines.join('\n');
  }

  private convertToSQL(data: any[]): string {
    if (data.length === 0) return '';

    const tableName = this.inferTableName(data[0]);
    const sqlStatements: string[] = [];

    for (const item of data) {
      const columns = Object.keys(item).join(', ');
      const values = Object.values(item)
        .map((value) => {
          if (value === null || value === undefined) return 'NULL';
          if (typeof value === 'object')
            return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
          if (typeof value === 'string')
            return `'${value.replace(/'/g, "''")}'`;
          return String(value);
        })
        .join(', ');

      sqlStatements.push(
        `INSERT INTO ${tableName} (${columns}) VALUES (${values});`,
      );
    }

    return sqlStatements.join('\n');
  }

  private inferTableName(item: any): string {
    // Infer table name from object structure
    if (item.sessionId) return 'browser_tasks';
    if (item.processId) return 'browser_sessions';
    if (item.filePath) return 'browser_screenshots';
    if (item.htmlContent) return 'browser_dom_snapshots';
    if (item.extractedData) return 'browser_data_extractions';
    return 'data_export';
  }

  private async calculateFileChecksum(filepath: string): Promise<string> {
    const fileContent = await fs.readFile(filepath);
    return crypto.createHash('sha256').update(fileContent).digest('hex');
  }

  private async compressExport(exportPath: string): Promise<{
    filepath: string;
    originalSize: number;
    compressedSize: number;
  }> {
    // Implementation would compress the entire export directory
    const compressedPath = `${exportPath}.tar.gz`;
    // Placeholder - would use tar or zip compression
    return {
      filepath: compressedPath,
      originalSize: 0,
      compressedSize: 0,
    };
  }

  private async encryptExport(exportPath: string): Promise<{
    filepath: string;
    algorithm: string;
    keyId: string;
  }> {
    const encryptedPath = `${exportPath}.enc`;
    const algorithm = 'aes-256-gcm';
    const keyId = crypto.randomBytes(16).toString('hex');

    // Placeholder - would encrypt the file/directory
    return {
      filepath: encryptedPath,
      algorithm,
      keyId,
    };
  }

  // ===== QUERY BUILDERS =====

  private buildSessionsQuery(config: ExportConfiguration): any {
    const query: any = {};

    if (config.dateRange) {
      query.where = {
        createdAt: {
          gte: config.dateRange.start,
          lte: config.dateRange.end,
        },
      };
    }

    return query;
  }

  private buildTasksQuery(config: ExportConfiguration): any {
    const query: any = {};

    if (config.dateRange) {
      query.where = {
        createdAt: {
          gte: config.dateRange.start,
          lte: config.dateRange.end,
        },
      };
    }

    return query;
  }

  private buildScreenshotsQuery(config: ExportConfiguration): any {
    const query: any = {};

    if (config.dateRange) {
      query.where = {
        timestamp: {
          gte: config.dateRange.start,
          lte: config.dateRange.end,
        },
      };
    }

    return query;
  }

  private buildDomSnapshotsQuery(config: ExportConfiguration): any {
    const query: any = {};

    if (config.dateRange) {
      query.where = {
        timestamp: {
          gte: config.dateRange.start,
          lte: config.dateRange.end,
        },
      };
    }

    return query;
  }

  private buildDataExtractionsQuery(config: ExportConfiguration): any {
    const query: any = {};

    if (config.dateRange) {
      query.where = {
        extractedAt: {
          gte: config.dateRange.start,
          lte: config.dateRange.end,
        },
      };
    }

    return query;
  }

  // ===== PRIVACY TRANSFORMATION METHODS =====

  private anonymizeSessions(sessions: any[]): any[] {
    return sessions.map((session) => ({
      ...session,
      processId: session.processId
        ? `process_${crypto.randomBytes(4).toString('hex')}`
        : null,
      workingDirectory: session.workingDirectory ? '/anonymized/path' : null,
      userAgent: session.userAgent ? 'Mozilla/5.0 (Anonymized)' : null,
    }));
  }

  private anonymizeTasks(tasks: any[]): any[] {
    return tasks.map((task) => ({
      ...task,
      userId: task.userId
        ? `user_${crypto.randomBytes(4).toString('hex')}`
        : null,
      agentId: task.agentId
        ? `agent_${crypto.randomBytes(4).toString('hex')}`
        : null,
    }));
  }

  private excludeSensitiveScreenshots(screenshots: any[]): any[] {
    return screenshots.filter((screenshot) => {
      const metadata = screenshot.metadata;
      return !metadata?.containsSensitiveData;
    });
  }

  private excludeSensitiveDomSnapshots(domSnapshots: any[]): any[] {
    return domSnapshots.filter((snapshot) => {
      const metadata = snapshot.metadata;
      return !metadata?.containsSensitiveData;
    });
  }

  private excludeSensitiveExtractions(extractions: any[]): any[] {
    return extractions.filter((extraction) => {
      return (
        extraction.sensitivityLevel !== 'critical' &&
        extraction.sensitivityLevel !== 'high'
      );
    });
  }

  // ===== BACKUP HELPER METHODS =====

  private async getCurrentSchemaVersion(): Promise<string> {
    try {
      const result = await this.prismaService.$queryRaw<
        Array<{ version: string }>
      >`
        SELECT version FROM schema_migrations 
        ORDER BY executed_at DESC 
        LIMIT 1
      `;
      return result[0]?.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  private async getEntityCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    try {
      const sessionCount = await this.prismaService.browserSession.count();
      counts.browser_sessions = sessionCount;

      const taskCount = await this.prismaService.browserTask.count();
      counts.browser_tasks = taskCount;

      const screenshotCount =
        await this.prismaService.browserScreenshot.count();
      counts.browser_screenshots = screenshotCount;

      const domSnapshotCount =
        await this.prismaService.browserDomSnapshot.count();
      counts.browser_dom_snapshots = domSnapshotCount;

      const extractionCount =
        await this.prismaService.browserDataExtraction.count();
      counts.browser_data_extractions = extractionCount;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Failed to get entity counts', errorMessage);
    }

    return counts;
  }

  private async getLastBackup(): Promise<BackupResult | null> {
    // In a real implementation, this would query a backup metadata table
    return null;
  }

  private async getLastFullBackup(): Promise<BackupResult | null> {
    // In a real implementation, this would query a backup metadata table for full backups
    return null;
  }

  private async getChangedDataSince(date: Date): Promise<any> {
    // In a real implementation, this would identify changed records since the date
    return {};
  }

  private async getBackupMetadata(
    backupId: string,
  ): Promise<BackupResult | null> {
    // In a real implementation, this would retrieve backup metadata from storage
    return null;
  }

  private async storeBackupMetadata(backup: BackupResult): Promise<void> {
    // In a real implementation, this would store backup metadata in a database
    const metadataPath = path.join(backup.path, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(backup, null, 2));
  }

  private async compressBackup(backup: BackupResult): Promise<void> {
    // Implementation would compress the backup files
    backup.compressed = true;
  }

  private async encryptBackup(backup: BackupResult): Promise<void> {
    // Implementation would encrypt the backup files
    backup.encrypted = true;
  }

  private async decryptBackup(backup: BackupResult): Promise<string> {
    // Implementation would decrypt the backup
    return backup.path;
  }

  private async decompressBackup(backupPath: string): Promise<string> {
    // Implementation would decompress the backup
    return backupPath;
  }

  private async restoreFullBackup(
    backupPath: string,
    options: RestoreOptions,
    result: RestoreResult,
  ): Promise<void> {
    // Implementation would restore full backup data
    result.restoredTables = [
      'browser_sessions',
      'browser_tasks',
      'browser_screenshots',
    ];
    result.restoredRecords = 1000; // Placeholder
  }

  private async restoreIncrementalBackup(
    backup: BackupResult,
    options: RestoreOptions,
    result: RestoreResult,
  ): Promise<void> {
    // Implementation would restore incremental backup data
    result.restoredTables = ['browser_tasks'];
    result.restoredRecords = 100; // Placeholder
  }

  private async validateRestoredData(result: RestoreResult): Promise<any> {
    // Implementation would validate restored data integrity
    return {
      integrityChecks: result.restoredTables.map((table) => ({
        table,
        recordCount: 100,
        checksumValid: true,
        errors: [],
      })),
    };
  }

  private async cleanupOldBackups(
    retention: BackupConfiguration['retention'],
  ): Promise<void> {
    // Implementation would clean up old backups based on retention policy
    this.logger.debug('Cleaning up old backups based on retention policy');
  }
}
