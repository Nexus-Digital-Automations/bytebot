/**
 * SQLite Job Management Module - Local-Only Architecture Implementation
 *
 * Comprehensive module for local SQLite-based job management replacing Redis.
 * Provides enterprise-grade async job processing with 100% local deployment.
 *
 * Features:
 * - SQLite-based job persistence with optimized queries
 * - Local file-based encryption for job data security
 * - Background worker execution with retry logic
 * - Comprehensive cleanup and maintenance scheduling
 * - Enterprise-grade monitoring and metrics
 * - Zero cloud dependencies for local-only architecture
 *
 * Integration:
 * - Replaces Redis-based JobStorage with SQLiteJobStorageService
 * - Maintains compatibility with existing ComputerUseService
 * - Provides monitoring and management endpoints
 * - Supports existing job management API contracts
 *
 * Local-Only Compliance:
 * - All data stored in local SQLite database files
 * - File-based encryption using local keys
 * - Local filesystem-based backup and recovery
 * - No external service dependencies
 *
 * @author Claude Code - Database Integration Specialist
 * @version 1.0.0 - Local-Only Architecture
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Import existing job management components
import {
  JobManagementService,
  BackgroundWorker,
  JobCleanupManager,
} from '../computer-use/job-management.service';

// Import our new SQLite storage service
import { SQLiteJobStorageService } from './services/sqlite-job-storage.service';

// Import required dependencies
import { ComputerUseService } from '../computer-use/computer-use.service';
import { DatabaseModule } from './database.module';

/**
 * SQLite Job Management Module
 *
 * Provides complete job management functionality using SQLite instead of Redis.
 * This module is designed for local-only deployment architecture.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
  ],
  providers: [
    // SQLite storage service (replaces Redis-based storage)
    SQLiteJobStorageService,

    // Job management services (updated to use SQLite storage)
    {
      provide: 'JobStorageInterface',
      useClass: SQLiteJobStorageService,
    },

    // Background worker for job processing
    {
      provide: BackgroundWorker,
      useFactory: (
        jobStorage: SQLiteJobStorageService,
        computerUseService: ComputerUseService,
        configService: any,
      ) => {
        return new BackgroundWorker(jobStorage, computerUseService, configService);
      },
      inject: [SQLiteJobStorageService, ComputerUseService, ConfigModule],
    },

    // Job cleanup manager
    {
      provide: JobCleanupManager,
      useFactory: (
        jobStorage: SQLiteJobStorageService,
        configService: any,
      ) => {
        return new JobCleanupManager(jobStorage, configService);
      },
      inject: [SQLiteJobStorageService, ConfigModule],
    },

    // Main job management service
    {
      provide: JobManagementService,
      useFactory: (
        jobStorage: SQLiteJobStorageService,
        backgroundWorker: BackgroundWorker,
        cleanupManager: JobCleanupManager,
        configService: any,
      ) => {
        return new JobManagementService(
          jobStorage,
          backgroundWorker,
          cleanupManager,
          configService,
        );
      },
      inject: [
        SQLiteJobStorageService,
        BackgroundWorker,
        JobCleanupManager,
        ConfigModule,
      ],
    },
  ],
  exports: [
    SQLiteJobStorageService,
    JobManagementService,
    BackgroundWorker,
    JobCleanupManager,
    'JobStorageInterface',
  ],
})
export class SQLiteJobManagementModule {
  constructor(
    private readonly jobStorage: SQLiteJobStorageService,
    private readonly jobManagement: JobManagementService,
  ) {
    // Log initialization for debugging
    console.log('SQLiteJobManagementModule initialized');
    console.log('Local-only job management with SQLite storage active');
  }
}