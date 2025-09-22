/**
 * MDM Database Service
 * Enterprise-grade database management with connection pooling and optimization
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class MdmDatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('MdmDatabase');
  private queryRunners: Set<QueryRunner> = new Set();

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.optimizeDatabase();
    this.logger.log('Database service initialized');
  }

  async onModuleDestroy(): Promise<void> {
    // Clean up query runners
    for (const queryRunner of this.queryRunners) {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
    this.queryRunners.clear();
    this.logger.log('Database service destroyed');
  }

  /**
   * Optimize SQLite database for enterprise performance
   */
  private async optimizeDatabase(): Promise<void> {
    try {
      const queryRunner = this.dataSource.createQueryRunner();
      this.queryRunners.add(queryRunner);

      // SQLite optimization pragmas
      await queryRunner.query('PRAGMA journal_mode = WAL');
      await queryRunner.query('PRAGMA synchronous = NORMAL');
      await queryRunner.query('PRAGMA cache_size = -64000'); // 64MB cache
      await queryRunner.query('PRAGMA temp_store = MEMORY');
      await queryRunner.query('PRAGMA mmap_size = 268435456'); // 256MB
      await queryRunner.query('PRAGMA optimize');

      // Enable foreign key constraints
      await queryRunner.query('PRAGMA foreign_keys = ON');

      // Set WAL autocheckpoint
      await queryRunner.query('PRAGMA wal_autocheckpoint = 1000');

      await queryRunner.release();
      this.queryRunners.delete(queryRunner);

      this.logger.log('Database optimization completed');
    } catch (error) {
      this.logger.error('Database optimization failed', error.stack);
    }
  }

  /**
   * Create a managed query runner with automatic cleanup
   */
  async createManagedQueryRunner(): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();
    this.queryRunners.add(queryRunner);
    return queryRunner;
  }

  /**
   * Release and clean up a query runner
   */
  async releaseManagedQueryRunner(queryRunner: QueryRunner): Promise<void> {
    if (!queryRunner.isReleased) {
      await queryRunner.release();
    }
    this.queryRunners.delete(queryRunner);
  }

  /**
   * Execute database transaction with automatic rollback on error
   */
  async executeTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>
  ): Promise<T> {
    const queryRunner = await this.createManagedQueryRunner();

    try {
      await queryRunner.startTransaction();
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await this.releaseManagedQueryRunner(queryRunner);
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    uptime: number;
    totalConnections: number;
    activeConnections: number;
    databaseSize?: number;
  }> {
    try {
      const queryRunner = await this.createManagedQueryRunner();

      // Check connection
      await queryRunner.query('SELECT 1');

      // Get database statistics
      const [pragmaResults] = await queryRunner.query('PRAGMA database_list');
      const [walModeResult] = await queryRunner.query('PRAGMA journal_mode');
      const [pageSizeResult] = await queryRunner.query('PRAGMA page_size');
      const [pageCountResult] = await queryRunner.query('PRAGMA page_count');

      await this.releaseManagedQueryRunner(queryRunner);

      const databaseSize = pageSizeResult.page_size * pageCountResult.page_count;

      return {
        connected: true,
        uptime: process.uptime(),
        totalConnections: this.queryRunners.size,
        activeConnections: this.queryRunners.size,
        databaseSize
      };
    } catch (error) {
      this.logger.error('Health check failed', error.stack);
      return {
        connected: false,
        uptime: process.uptime(),
        totalConnections: this.queryRunners.size,
        activeConnections: this.queryRunners.size
      };
    }
  }

  /**
   * Perform database maintenance operations
   */
  async performMaintenance(): Promise<void> {
    try {
      const queryRunner = await this.createManagedQueryRunner();

      // Analyze database for query optimization
      await queryRunner.query('ANALYZE');

      // Optimize database
      await queryRunner.query('PRAGMA optimize');

      // Vacuum database if needed (careful with large databases)
      if (this.configService.get<boolean>('MDM_DATABASE_AUTO_VACUUM', false)) {
        await queryRunner.query('VACUUM');
      }

      await this.releaseManagedQueryRunner(queryRunner);

      this.logger.log('Database maintenance completed');
    } catch (error) {
      this.logger.error('Database maintenance failed', error.stack);
      throw error;
    }
  }

  /**
   * Create database backup
   */
  async createBackup(backupPath: string): Promise<void> {
    try {
      const queryRunner = await this.createManagedQueryRunner();

      // SQLite backup command
      await queryRunner.query(`VACUUM INTO '${backupPath}'`);

      await this.releaseManagedQueryRunner(queryRunner);

      this.logger.log(`Database backup created: ${backupPath}`);
    } catch (error) {
      this.logger.error('Database backup failed', error.stack);
      throw error;
    }
  }

  /**
   * Get database metrics for monitoring
   */
  async getDatabaseMetrics(): Promise<{
    size: number;
    pageSize: number;
    pageCount: number;
    freePages: number;
    walSize?: number;
    cacheHitRatio?: number;
  }> {
    const queryRunner = await this.createManagedQueryRunner();

    try {
      const [pageSizeResult] = await queryRunner.query('PRAGMA page_size');
      const [pageCountResult] = await queryRunner.query('PRAGMA page_count');
      const [freePagesResult] = await queryRunner.query('PRAGMA freelist_count');

      // Try to get WAL file size if WAL mode is enabled
      let walSize: number | undefined;
      try {
        const [walResult] = await queryRunner.query('PRAGMA wal_checkpoint(PASSIVE)');
        walSize = walResult ? walResult.wal_size : undefined;
      } catch {
        // WAL mode might not be enabled
      }

      await this.releaseManagedQueryRunner(queryRunner);

      return {
        size: pageSizeResult.page_size * pageCountResult.page_count,
        pageSize: pageSizeResult.page_size,
        pageCount: pageCountResult.page_count,
        freePages: freePagesResult.freelist_count,
        walSize
      };
    } catch (error) {
      await this.releaseManagedQueryRunner(queryRunner);
      throw error;
    }
  }
}