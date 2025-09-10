/**
 * Database Migration Service
 *
 * Enterprise-grade database migration service for managing schema evolution and version control
 * with support for both PostgreSQL and SQLite databases. Provides safe, rollback-capable
 * migrations with comprehensive validation and automated testing.
 *
 * Features:
 * - Safe schema evolution with rollback capabilities
 * - Cross-database compatibility (PostgreSQL/SQLite)
 * - Automated validation and testing
 * - Data transformation support
 * - Migration dependency management
 * - Performance optimization during migrations
 *
 * @service DatabaseMigrationService
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
// import * as fs from 'fs/promises'; // Unused import
import * as path from 'path';
import {
  DatabaseProvider,
  getCurrentDatabaseProvider,
} from '../hybrid-database.module';

export interface MigrationDefinition {
  version: string;
  description: string;
  timestamp: Date;
  upSql: string;
  downSql: string;
  dataTransformation?: (prisma: PrismaService) => Promise<void>;
  validationQueries?: string[];
  prerequisites?: string[]; // Required migration versions
  databaseProvider?: DatabaseProvider[]; // Supported database providers
  estimatedExecutionTimeMs?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  backupRequired?: boolean;
}

export interface MigrationResult {
  startVersion: string;
  endVersion: string;
  migrationsExecuted: string[];
  totalExecutionTimeMs: number;
  errors: Array<{
    migration: string;
    error: string;
    timestamp: Date;
  }>;
  rollbackRequired?: boolean;
  rollbackCompleted?: boolean;
}

export interface MigrationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  dependencyIssues: string[];
  compatibilityIssues: string[];
}

export interface MigrationStatus {
  currentVersion: string;
  availableMigrations: string[];
  pendingMigrations: string[];
  lastMigrationDate?: Date;
  isHealthy: boolean;
  issues: string[];
}

@Injectable()
export class DatabaseMigrationService {
  private readonly logger = new Logger(DatabaseMigrationService.name);

  private readonly migrations: Map<string, MigrationDefinition> = new Map();
  private readonly migrationDirectory: string;
  private readonly databaseProvider: DatabaseProvider;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    this.migrationDirectory = path.join(
      process.cwd(),
      'src/database/migrations',
    );
    this.databaseProvider = getCurrentDatabaseProvider(this.configService);
    this.initializeMigrations();
    this.logger.log(
      `Database Migration Service initialized for ${this.databaseProvider}`,
    );
  }

  /**
   * Initialize migration definitions for browser automation schema
   */
  private initializeMigrations(): void {
    // Base browser automation schema
    this.migrations.set('20250101_001_browser_automation_base', {
      version: '20250101_001',
      description:
        'Create base browser automation tables with enhanced tracking',
      timestamp: new Date('2025-01-01T00:01:00Z'),
      databaseProvider: ['postgresql', 'sqlite'],
      riskLevel: 'medium',
      backupRequired: true,
      estimatedExecutionTimeMs: 5000,
      upSql: this.getBrowserAutomationBaseSql('up'),
      downSql: this.getBrowserAutomationBaseSql('down'),
      validationQueries: [
        'SELECT COUNT(*) FROM browser_sessions',
        'SELECT COUNT(*) FROM browser_tasks',
      ],
    });

    // Performance tracking enhancement
    this.migrations.set('20250101_002_performance_tracking', {
      version: '20250101_002',
      description: 'Add comprehensive performance tracking capabilities',
      timestamp: new Date('2025-01-01T00:02:00Z'),
      prerequisites: ['20250101_001'],
      databaseProvider: ['postgresql', 'sqlite'],
      riskLevel: 'low',
      backupRequired: false,
      estimatedExecutionTimeMs: 2000,
      upSql: this.getPerformanceTrackingSql('up'),
      downSql: this.getPerformanceTrackingSql('down'),
      validationQueries: ['SELECT COUNT(*) FROM browser_performance_metrics'],
    });

    // Storage optimization features
    this.migrations.set('20250101_003_storage_optimization', {
      version: '20250101_003',
      description: 'Add compression and tiered storage support',
      timestamp: new Date('2025-01-01T00:03:00Z'),
      prerequisites: ['20250101_001'],
      databaseProvider: ['postgresql', 'sqlite'],
      riskLevel: 'medium',
      backupRequired: true,
      estimatedExecutionTimeMs: 8000,
      upSql: this.getStorageOptimizationSql('up'),
      downSql: this.getStorageOptimizationSql('down'),
      dataTransformation: this.migrateToStorageOptimization.bind(this) as (
        prisma: PrismaService,
      ) => Promise<void>,
      validationQueries: [
        'SELECT COUNT(*) FROM browser_screenshots WHERE storage_tier IS NOT NULL',
        'SELECT COUNT(*) FROM browser_dom_snapshots WHERE compression_type IS NOT NULL',
      ],
    });

    // Data retention policies
    this.migrations.set('20250101_004_retention_policies', {
      version: '20250101_004',
      description: 'Add data retention and cleanup policy management',
      timestamp: new Date('2025-01-01T00:04:00Z'),
      prerequisites: ['20250101_003'],
      databaseProvider: ['postgresql', 'sqlite'],
      riskLevel: 'low',
      backupRequired: false,
      estimatedExecutionTimeMs: 3000,
      upSql: this.getRetentionPoliciesSql('up'),
      downSql: this.getRetentionPoliciesSql('down'),
      validationQueries: [
        'SELECT COUNT(*) FROM data_retention_policies',
        'SELECT COUNT(*) FROM cleanup_execution_log',
      ],
    });

    // Enhanced indexing for performance
    this.migrations.set('20250101_005_performance_indexes', {
      version: '20250101_005',
      description:
        'Add performance-optimized indexes for browser automation queries',
      timestamp: new Date('2025-01-01T00:05:00Z'),
      prerequisites: ['20250101_004'],
      databaseProvider: ['postgresql', 'sqlite'],
      riskLevel: 'low',
      backupRequired: false,
      estimatedExecutionTimeMs: 15000,
      upSql: this.getPerformanceIndexesSql('up'),
      downSql: this.getPerformanceIndexesSql('down'),
    });
  }

  /**
   * Execute all pending migrations
   */
  async executeMigrations(): Promise<MigrationResult> {
    this.logger.log('Starting database migrations execution');

    const startTime = Date.now();
    const currentVersion = await this.getCurrentVersion();
    const pendingMigrations = this.getPendingMigrations(currentVersion);

    const result: MigrationResult = {
      startVersion: currentVersion,
      endVersion: currentVersion,
      migrationsExecuted: [],
      totalExecutionTimeMs: 0,
      errors: [],
    };

    if (pendingMigrations.length === 0) {
      this.logger.log('No pending migrations found');
      result.totalExecutionTimeMs = Date.now() - startTime;
      return result;
    }

    this.logger.log(`Found ${pendingMigrations.length} pending migrations`);

    // Validate all migrations before execution
    const validationResult = await this.validateMigrations(pendingMigrations);
    if (!validationResult.isValid) {
      const errorMsg = `Migration validation failed: ${validationResult.errors.join(', ')}`;
      this.logger.error(errorMsg);
      result.errors.push({
        migration: 'validation',
        error: errorMsg,
        timestamp: new Date(),
      });
      result.totalExecutionTimeMs = Date.now() - startTime;
      return result;
    }

    // Execute migrations in order
    for (const migration of pendingMigrations) {
      try {
        this.logger.log(
          `Executing migration: ${migration.version} - ${migration.description}`,
        );

        const migrationStartTime = Date.now();
        await this.executeMigration(migration);
        const migrationDuration = Date.now() - migrationStartTime;

        result.migrationsExecuted.push(migration.version);
        result.endVersion = migration.version;

        this.logger.log(
          `Migration ${migration.version} completed in ${migrationDuration}ms`,
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(
          `Migration ${migration.version} failed: ${errorMsg}`,
          errorStack,
        );

        result.errors.push({
          migration: migration.version,
          error: errorMsg,
          timestamp: new Date(),
        });

        // Determine if rollback is needed
        if (
          migration.riskLevel === 'high' ||
          result.migrationsExecuted.length > 0
        ) {
          result.rollbackRequired = true;

          try {
            await this.rollbackMigrations(result.migrationsExecuted);
            result.rollbackCompleted = true;
            this.logger.log('Rollback completed successfully');
          } catch (rollbackError) {
            const rollbackMsg =
              rollbackError instanceof Error
                ? rollbackError.message
                : String(rollbackError);
            const rollbackStack =
              rollbackError instanceof Error ? rollbackError.stack : undefined;
            this.logger.error(`Rollback failed: ${rollbackMsg}`, rollbackStack);
            result.rollbackCompleted = false;
          }
        }

        break; // Stop on first error
      }
    }

    result.totalExecutionTimeMs = Date.now() - startTime;

    this.logger.log(
      `Migrations execution completed. ` +
        `Executed: ${result.migrationsExecuted.length}, ` +
        `Errors: ${result.errors.length}, ` +
        `Duration: ${result.totalExecutionTimeMs}ms`,
    );

    return result;
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus> {
    const currentVersion = await this.getCurrentVersion();
    const availableMigrations = Array.from(this.migrations.keys()).sort();
    const pendingMigrations = this.getPendingMigrations(currentVersion).map(
      (m) => m.version,
    );

    // Get last migration date
    let lastMigrationDate: Date | undefined;
    try {
      const lastMigration = await this.prismaService.$queryRaw<
        Array<{ executed_at: Date }>
      >`
        SELECT executed_at FROM schema_migrations 
        ORDER BY executed_at DESC 
        LIMIT 1
      `;
      lastMigrationDate = lastMigration[0]?.executed_at;
    } catch {
      // Migration table might not exist yet
    }

    // Check for issues
    const issues: string[] = [];

    // Check for out-of-order migrations
    const executedVersions = await this.getExecutedVersions();
    for (let i = 1; i < executedVersions.length; i++) {
      if (executedVersions[i] < executedVersions[i - 1]) {
        issues.push(`Out-of-order migration detected: ${executedVersions[i]}`);
      }
    }

    // Check for missing prerequisites
    for (const migration of pendingMigrations) {
      const migrationDef = this.migrations.get(migration);
      if (migrationDef?.prerequisites) {
        for (const prerequisite of migrationDef.prerequisites) {
          if (!executedVersions.includes(prerequisite)) {
            issues.push(
              `Migration ${migration} missing prerequisite: ${prerequisite}`,
            );
          }
        }
      }
    }

    return {
      currentVersion,
      availableMigrations,
      pendingMigrations,
      lastMigrationDate,
      isHealthy: issues.length === 0,
      issues,
    };
  }

  /**
   * Rollback specific migrations
   */
  async rollbackMigrations(versionsToRollback: string[]): Promise<void> {
    this.logger.log(
      `Rolling back migrations: ${versionsToRollback.join(', ')}`,
    );

    // Sort versions in descending order for rollback
    const sortedVersions = versionsToRollback.sort().reverse();

    for (const version of sortedVersions) {
      const migration = this.migrations.get(version);
      if (!migration) {
        throw new Error(`Migration ${version} not found for rollback`);
      }

      try {
        this.logger.log(`Rolling back migration: ${version}`);

        await this.prismaService.$transaction(async (prisma) => {
          // Execute rollback SQL
          await prisma.$executeRawUnsafe(migration.downSql);

          // Remove from migration tracking table
          await prisma.$executeRaw`
            DELETE FROM schema_migrations 
            WHERE version = ${version}
          `;
        });

        this.logger.log(`Migration ${version} rolled back successfully`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to rollback migration ${version}: ${errorMsg}`,
        );
        throw error;
      }
    }
  }

  /**
   * Validate migrations before execution
   */
  private async validateMigrations(
    migrations: MigrationDefinition[],
  ): Promise<MigrationValidationResult> {
    const result: MigrationValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      dependencyIssues: [],
      compatibilityIssues: [],
    };

    // Check database provider compatibility
    for (const migration of migrations) {
      if (
        migration.databaseProvider &&
        !migration.databaseProvider.includes(this.databaseProvider)
      ) {
        result.compatibilityIssues.push(
          `Migration ${migration.version} not compatible with ${this.databaseProvider}`,
        );
      }
    }

    // Check prerequisites
    const executedVersions = await this.getExecutedVersions();
    for (const migration of migrations) {
      if (migration.prerequisites) {
        for (const prerequisite of migration.prerequisites) {
          if (
            !executedVersions.includes(prerequisite) &&
            !migrations.find((m) => m.version === prerequisite)
          ) {
            result.dependencyIssues.push(
              `Migration ${migration.version} requires ${prerequisite}`,
            );
          }
        }
      }
    }

    // Check for SQL syntax issues (basic validation)
    for (const migration of migrations) {
      if (!migration.upSql.trim()) {
        result.errors.push(`Migration ${migration.version} has empty upSql`);
      }
      if (!migration.downSql.trim()) {
        result.errors.push(`Migration ${migration.version} has empty downSql`);
      }
    }

    // Aggregate results
    if (
      result.errors.length > 0 ||
      result.dependencyIssues.length > 0 ||
      result.compatibilityIssues.length > 0
    ) {
      result.isValid = false;
    }

    return result;
  }

  /**
   * Execute a single migration within a transaction
   */
  private async executeMigration(
    migration: MigrationDefinition,
  ): Promise<void> {
    await this.prismaService.$transaction(async (prisma) => {
      // Execute migration SQL
      await prisma.$executeRawUnsafe(migration.upSql);

      // Execute data transformation if provided
      if (migration.dataTransformation) {
        await migration.dataTransformation(this.prismaService);
      }

      // Run validation queries
      if (migration.validationQueries) {
        for (const query of migration.validationQueries) {
          try {
            await prisma.$queryRawUnsafe(query);
          } catch (error) {
            throw new Error(
              `Validation query failed: ${query} - ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
          }
        }
      }

      // Update migration tracking table
      await this.ensureMigrationTable();
      await prisma.$executeRaw`
        INSERT INTO schema_migrations (version, description, executed_at)
        VALUES (${migration.version}, ${migration.description}, ${new Date()})
      `;
    });
  }

  /**
   * Get current database schema version
   */
  private async getCurrentVersion(): Promise<string> {
    try {
      await this.ensureMigrationTable();

      const result = await this.prismaService.$queryRaw<
        Array<{ version: string }>
      >`
        SELECT version FROM schema_migrations 
        ORDER BY executed_at DESC 
        LIMIT 1
      `;

      return result[0]?.version || '00000000_000';
    } catch {
      // Migration table doesn't exist yet
      return '00000000_000';
    }
  }

  /**
   * Get all executed migration versions
   */
  private async getExecutedVersions(): Promise<string[]> {
    try {
      await this.ensureMigrationTable();

      const result = await this.prismaService.$queryRaw<
        Array<{ version: string }>
      >`
        SELECT version FROM schema_migrations 
        ORDER BY executed_at ASC
      `;

      return result.map((row) => row.version);
    } catch {
      return [];
    }
  }

  /**
   * Get pending migrations that need to be executed
   */
  private getPendingMigrations(currentVersion: string): MigrationDefinition[] {
    return Array.from(this.migrations.values())
      .filter((migration) => migration.version > currentVersion)
      .sort((a, b) => a.version.localeCompare(b.version));
  }

  /**
   * Ensure migration tracking table exists
   */
  private async ensureMigrationTable(): Promise<void> {
    const createTableSql =
      this.databaseProvider === 'sqlite'
        ? `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          executed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `
        : `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version VARCHAR(255) PRIMARY KEY,
          description TEXT NOT NULL,
          executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `;

    await this.prismaService.$executeRawUnsafe(createTableSql);
  }

  // ===== SQL GENERATION METHODS =====

  private getBrowserAutomationBaseSql(direction: 'up' | 'down'): string {
    if (direction === 'up') {
      return this.databaseProvider === 'sqlite'
        ? this.getSQLiteBaseTables()
        : this.getPostgreSQLBaseTables();
    } else {
      return `
        DROP TABLE IF EXISTS browser_data_extractions;
        DROP TABLE IF EXISTS browser_form_data;
        DROP TABLE IF EXISTS browser_dom_snapshots;
        DROP TABLE IF EXISTS browser_screenshots;
        DROP TABLE IF EXISTS browser_task_steps;
        DROP TABLE IF EXISTS browser_tasks;
        DROP TABLE IF EXISTS browser_sessions;
      `;
    }
  }

  private getSQLiteBaseTables(): string {
    return `
      CREATE TABLE browser_sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        process_id TEXT,
        status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'IDLE', 'TERMINATED', 'ERROR')),
        headless INTEGER DEFAULT 1,
        viewport_width INTEGER DEFAULT 1280,
        viewport_height INTEGER DEFAULT 720,
        user_agent TEXT,
        working_directory TEXT,
        screenshots_enabled INTEGER DEFAULT 1,
        video_recording INTEGER DEFAULT 0,
        timeout_ms INTEGER DEFAULT 300000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        terminated_at DATETIME,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        error TEXT,
        metadata TEXT -- JSON as text in SQLite
      );
      
      CREATE TABLE browser_tasks (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        external_task_id TEXT,
        session_id TEXT NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
        priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        start_url TEXT,
        actions TEXT NOT NULL, -- JSON as text
        configuration TEXT, -- JSON as text
        constraints TEXT, -- JSON as text
        validation TEXT, -- JSON as text
        options TEXT, -- JSON as text
        retry_options TEXT, -- JSON as text
        timeout_seconds INTEGER DEFAULT 300,
        tags TEXT DEFAULT '[]', -- JSON array as text
        custom_data TEXT, -- JSON as text
        current_step INTEGER DEFAULT 0,
        total_steps INTEGER DEFAULT 1,
        started_at DATETIME,
        completed_at DATETIME,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        estimated_remaining_ms INTEGER,
        result TEXT, -- JSON as text
        error TEXT, -- JSON as text
        user_id TEXT,
        agent_id TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_browser_sessions_status ON browser_sessions(status);
      CREATE INDEX idx_browser_tasks_session_id ON browser_tasks(session_id);
      CREATE INDEX idx_browser_tasks_status ON browser_tasks(status);
    `;
  }

  private getPostgreSQLBaseTables(): string {
    return `
      CREATE TABLE browser_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        process_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'IDLE', 'TERMINATED', 'ERROR')),
        headless BOOLEAN DEFAULT true,
        viewport_width INTEGER DEFAULT 1280,
        viewport_height INTEGER DEFAULT 720,
        user_agent TEXT,
        working_directory TEXT,
        screenshots_enabled BOOLEAN DEFAULT true,
        video_recording BOOLEAN DEFAULT false,
        timeout_ms INTEGER DEFAULT 300000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        terminated_at TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        error TEXT,
        metadata JSONB
      );
      
      CREATE TABLE browser_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        external_task_id VARCHAR(255),
        session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
        priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
        start_url TEXT,
        actions JSONB NOT NULL,
        configuration JSONB,
        constraints JSONB,
        validation JSONB,
        options JSONB,
        retry_options JSONB,
        timeout_seconds INTEGER DEFAULT 300,
        tags TEXT[] DEFAULT '{}',
        custom_data JSONB,
        current_step INTEGER DEFAULT 0,
        total_steps INTEGER DEFAULT 1,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        estimated_remaining_ms INTEGER,
        result JSONB,
        error JSONB,
        user_id VARCHAR(255),
        agent_id VARCHAR(255),
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_browser_sessions_status ON browser_sessions(status);
      CREATE INDEX idx_browser_tasks_session_id ON browser_tasks(session_id);
      CREATE INDEX idx_browser_tasks_status ON browser_tasks(status);
    `;
  }

  private getPerformanceTrackingSql(direction: 'up' | 'down'): string {
    if (direction === 'up') {
      return this.databaseProvider === 'sqlite'
        ? this.getSQLitePerformanceTracking()
        : this.getPostgreSQLPerformanceTracking();
    } else {
      return `
        DROP TABLE IF EXISTS browser_performance_metrics;
        ALTER TABLE browser_sessions DROP COLUMN IF EXISTS memory_usage_mb;
        ALTER TABLE browser_sessions DROP COLUMN IF EXISTS cpu_usage_percent;
      `;
    }
  }

  private getSQLitePerformanceTracking(): string {
    return `
      ALTER TABLE browser_sessions ADD COLUMN memory_usage_mb INTEGER;
      ALTER TABLE browser_sessions ADD COLUMN cpu_usage_percent REAL;
      
      CREATE TABLE browser_performance_metrics (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_id TEXT REFERENCES browser_sessions(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES browser_tasks(id) ON DELETE CASCADE,
        metric_type TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_unit TEXT NOT NULL,
        measurement_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        context TEXT -- JSON as text
      );
      
      CREATE INDEX idx_performance_metrics_session_id ON browser_performance_metrics(session_id);
      CREATE INDEX idx_performance_metrics_task_id ON browser_performance_metrics(task_id);
      CREATE INDEX idx_performance_metrics_type ON browser_performance_metrics(metric_type);
    `;
  }

  private getPostgreSQLPerformanceTracking(): string {
    return `
      ALTER TABLE browser_sessions ADD COLUMN memory_usage_mb INTEGER;
      ALTER TABLE browser_sessions ADD COLUMN cpu_usage_percent DECIMAL(5,2);
      
      CREATE TABLE browser_performance_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
        task_id UUID REFERENCES browser_tasks(id) ON DELETE CASCADE,
        metric_type VARCHAR(50) NOT NULL,
        metric_value DECIMAL(10,4) NOT NULL,
        metric_unit VARCHAR(20) NOT NULL,
        measurement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        context JSONB
      );
      
      CREATE INDEX idx_performance_metrics_session_id ON browser_performance_metrics(session_id);
      CREATE INDEX idx_performance_metrics_task_id ON browser_performance_metrics(task_id);
      CREATE INDEX idx_performance_metrics_type ON browser_performance_metrics(metric_type);
    `;
  }

  private getStorageOptimizationSql(direction: 'up' | 'down'): string {
    if (direction === 'up') {
      return this.databaseProvider === 'sqlite'
        ? this.getSQLiteStorageOptimization()
        : this.getPostgreSQLStorageOptimization();
    } else {
      return `
        DROP TABLE IF EXISTS browser_data_extractions;
        DROP TABLE IF EXISTS browser_form_data;
        DROP TABLE IF EXISTS browser_dom_snapshots;
        DROP TABLE IF EXISTS browser_screenshots;
      `;
    }
  }

  private getSQLiteStorageOptimization(): string {
    return `
      CREATE TABLE browser_screenshots (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_id TEXT NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES browser_tasks(id) ON DELETE SET NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        url TEXT,
        viewport TEXT NOT NULL, -- JSON as text
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_size INTEGER NOT NULL,
        mime_type TEXT DEFAULT 'image/png',
        compression_type TEXT DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'brotli', 'zstd')),
        compressed_size INTEGER,
        checksum TEXT,
        metadata TEXT, -- JSON as text
        storage_tier TEXT DEFAULT 'hot' CHECK (storage_tier IN ('hot', 'warm', 'cold', 'archived')),
        archived_at DATETIME,
        access_count INTEGER DEFAULT 0,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE browser_dom_snapshots (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        session_id TEXT NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
        task_id TEXT REFERENCES browser_tasks(id) ON DELETE SET NULL,
        url TEXT NOT NULL,
        title TEXT,
        html_content TEXT,
        html_compressed BLOB,
        compression_type TEXT DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'brotli', 'zstd')),
        original_size INTEGER,
        compressed_size INTEGER,
        accessibility_tree TEXT, -- JSON as text
        interactive_elements TEXT, -- JSON as text
        extracted_text TEXT,
        text_content_hash TEXT,
        metadata TEXT, -- JSON as text
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        file_size INTEGER,
        storage_tier TEXT DEFAULT 'hot' CHECK (storage_tier IN ('hot', 'warm', 'cold', 'archived')),
        archived_at DATETIME,
        access_count INTEGER DEFAULT 0,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_screenshots_session_id ON browser_screenshots(session_id);
      CREATE INDEX idx_screenshots_storage_tier ON browser_screenshots(storage_tier);
      CREATE INDEX idx_dom_snapshots_session_id ON browser_dom_snapshots(session_id);
      CREATE INDEX idx_dom_snapshots_url ON browser_dom_snapshots(url);
    `;
  }

  private getPostgreSQLStorageOptimization(): string {
    return `
      CREATE TABLE browser_screenshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
        task_id UUID REFERENCES browser_tasks(id) ON DELETE SET NULL,
        filename VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        url TEXT,
        viewport JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(50) DEFAULT 'image/png',
        compression_type VARCHAR(20) DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'brotli', 'zstd')),
        compressed_size INTEGER,
        checksum VARCHAR(64),
        metadata JSONB,
        storage_tier VARCHAR(20) DEFAULT 'hot' CHECK (storage_tier IN ('hot', 'warm', 'cold', 'archived')),
        archived_at TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE browser_dom_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES browser_sessions(id) ON DELETE CASCADE,
        task_id UUID REFERENCES browser_tasks(id) ON DELETE SET NULL,
        url TEXT NOT NULL,
        title VARCHAR(500),
        html_content TEXT,
        html_compressed BYTEA,
        compression_type VARCHAR(20) DEFAULT 'none' CHECK (compression_type IN ('none', 'gzip', 'brotli', 'zstd')),
        original_size INTEGER,
        compressed_size INTEGER,
        accessibility_tree JSONB,
        interactive_elements JSONB,
        extracted_text TEXT,
        text_content_hash VARCHAR(64),
        metadata JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        file_size INTEGER,
        storage_tier VARCHAR(20) DEFAULT 'hot' CHECK (storage_tier IN ('hot', 'warm', 'cold', 'archived')),
        archived_at TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_screenshots_session_id ON browser_screenshots(session_id);
      CREATE INDEX idx_screenshots_storage_tier ON browser_screenshots(storage_tier);
      CREATE INDEX idx_dom_snapshots_session_id ON browser_dom_snapshots(session_id);
      CREATE INDEX idx_dom_snapshots_url ON browser_dom_snapshots(url);
    `;
  }

  private getRetentionPoliciesSql(direction: 'up' | 'down'): string {
    if (direction === 'up') {
      return this.databaseProvider === 'sqlite'
        ? this.getSQLiteRetentionPolicies()
        : this.getPostgreSQLRetentionPolicies();
    } else {
      return `
        DROP TABLE IF EXISTS cleanup_execution_log;
        DROP TABLE IF EXISTS data_retention_policies;
      `;
    }
  }

  private getSQLiteRetentionPolicies(): string {
    return `
      CREATE TABLE data_retention_policies (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        entity_type TEXT NOT NULL UNIQUE,
        retention_period_days INTEGER NOT NULL,
        archive_period_days INTEGER,
        cleanup_enabled INTEGER DEFAULT 1,
        compression_enabled INTEGER DEFAULT 1,
        policy_conditions TEXT, -- JSON as text
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_executed DATETIME
      );
      
      CREATE TABLE cleanup_execution_log (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        policy_id TEXT REFERENCES data_retention_policies(id) ON DELETE CASCADE,
        execution_started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        execution_completed_at DATETIME,
        records_processed INTEGER DEFAULT 0,
        records_archived INTEGER DEFAULT 0,
        records_deleted INTEGER DEFAULT 0,
        bytes_freed INTEGER DEFAULT 0,
        errors_count INTEGER DEFAULT 0,
        error_details TEXT, -- JSON as text
        execution_status TEXT DEFAULT 'running' CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled'))
      );
      
      CREATE INDEX idx_cleanup_log_policy_id ON cleanup_execution_log(policy_id);
    `;
  }

  private getPostgreSQLRetentionPolicies(): string {
    return `
      CREATE TABLE data_retention_policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(100) NOT NULL UNIQUE,
        retention_period_days INTEGER NOT NULL,
        archive_period_days INTEGER,
        cleanup_enabled BOOLEAN DEFAULT true,
        compression_enabled BOOLEAN DEFAULT true,
        policy_conditions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_executed TIMESTAMP
      );
      
      CREATE TABLE cleanup_execution_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID REFERENCES data_retention_policies(id) ON DELETE CASCADE,
        execution_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        execution_completed_at TIMESTAMP,
        records_processed INTEGER DEFAULT 0,
        records_archived INTEGER DEFAULT 0,
        records_deleted INTEGER DEFAULT 0,
        bytes_freed BIGINT DEFAULT 0,
        errors_count INTEGER DEFAULT 0,
        error_details JSONB,
        execution_status VARCHAR(20) DEFAULT 'running' CHECK (execution_status IN ('running', 'completed', 'failed', 'cancelled'))
      );
      
      CREATE INDEX idx_cleanup_log_policy_id ON cleanup_execution_log(policy_id);
    `;
  }

  private getPerformanceIndexesSql(direction: 'up' | 'down'): string {
    if (direction === 'up') {
      return `
        -- Browser sessions indexes
        CREATE INDEX IF NOT EXISTS idx_browser_sessions_last_activity ON browser_sessions(last_activity);
        CREATE INDEX IF NOT EXISTS idx_browser_sessions_created_at ON browser_sessions(created_at);
        
        -- Browser tasks indexes
        CREATE INDEX IF NOT EXISTS idx_browser_tasks_priority ON browser_tasks(priority);
        CREATE INDEX IF NOT EXISTS idx_browser_tasks_created_at ON browser_tasks(created_at);
        CREATE INDEX IF NOT EXISTS idx_browser_tasks_user_id ON browser_tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_browser_tasks_status_priority ON browser_tasks(status, priority);
        
        -- Browser screenshots indexes
        CREATE INDEX IF NOT EXISTS idx_screenshots_timestamp ON browser_screenshots(timestamp);
        CREATE INDEX IF NOT EXISTS idx_screenshots_file_size ON browser_screenshots(file_size);
        CREATE INDEX IF NOT EXISTS idx_screenshots_access_count ON browser_screenshots(access_count);
        CREATE INDEX IF NOT EXISTS idx_screenshots_checksum ON browser_screenshots(checksum);
        
        -- Browser DOM snapshots indexes
        CREATE INDEX IF NOT EXISTS idx_dom_snapshots_timestamp ON browser_dom_snapshots(timestamp);
        CREATE INDEX IF NOT EXISTS idx_dom_snapshots_text_hash ON browser_dom_snapshots(text_content_hash);
        CREATE INDEX IF NOT EXISTS idx_dom_snapshots_storage_tier ON browser_dom_snapshots(storage_tier);
        
        -- Performance metrics indexes
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_measurement_time ON browser_performance_metrics(measurement_time);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_composite ON browser_performance_metrics(session_id, task_id, metric_type);
      `;
    } else {
      return `
        DROP INDEX IF EXISTS idx_browser_sessions_last_activity;
        DROP INDEX IF EXISTS idx_browser_sessions_created_at;
        DROP INDEX IF EXISTS idx_browser_tasks_priority;
        DROP INDEX IF EXISTS idx_browser_tasks_created_at;
        DROP INDEX IF EXISTS idx_browser_tasks_user_id;
        DROP INDEX IF EXISTS idx_browser_tasks_status_priority;
        DROP INDEX IF EXISTS idx_screenshots_timestamp;
        DROP INDEX IF EXISTS idx_screenshots_file_size;
        DROP INDEX IF EXISTS idx_screenshots_access_count;
        DROP INDEX IF EXISTS idx_screenshots_checksum;
        DROP INDEX IF EXISTS idx_dom_snapshots_timestamp;
        DROP INDEX IF EXISTS idx_dom_snapshots_text_hash;
        DROP INDEX IF EXISTS idx_dom_snapshots_storage_tier;
        DROP INDEX IF EXISTS idx_performance_metrics_measurement_time;
        DROP INDEX IF EXISTS idx_performance_metrics_composite;
      `;
    }
  }

  /**
   * Data transformation for storage optimization migration
   */
  private async migrateToStorageOptimization(
    prisma: PrismaService,
  ): Promise<void> {
    this.logger.log('Executing storage optimization data transformation');

    // Set default storage tiers for existing data
    await prisma.$executeRaw`
      UPDATE browser_screenshots 
      SET storage_tier = 'hot', compression_type = 'none'
      WHERE storage_tier IS NULL
    `;

    await prisma.$executeRaw`
      UPDATE browser_dom_snapshots 
      SET storage_tier = 'warm', compression_type = 'none'
      WHERE storage_tier IS NULL
    `;

    this.logger.log('Storage optimization data transformation completed');
  }
}
