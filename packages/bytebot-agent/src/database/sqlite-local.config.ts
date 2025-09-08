/**
 * SQLite Local Database Configuration - Enterprise Local Database Implementation
 * Provides enterprise-grade SQLite configuration with connection pooling, security,
 * monitoring, and performance optimization for local-only database operations
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../config/secrets.service';
import * as path from 'path';
import * as fs from 'fs';

export interface SQLiteConnectionPoolOptions {
  // SQLite-specific connection settings
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;

  // Performance settings
  journalMode: 'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF';
  synchronous: 'OFF' | 'NORMAL' | 'FULL' | 'EXTRA';
  cacheSize: number; // Number of pages in cache
  tempStore: 'DEFAULT' | 'FILE' | 'MEMORY';

  // Security settings
  foreignKeys: boolean;
  enableWAL: boolean; // Write-Ahead Logging
  enableSharedCache: boolean;

  // Monitoring settings
  logQueries: boolean;
  slowQueryThreshold: number;
  enableMetrics: boolean;
}

export interface SQLiteConfiguration {
  // Database file configuration
  database: {
    path: string;
    filename: string;
    fullPath: string;
    backupPath: string;
    tempPath: string;
  };

  // Connection pool settings
  pool: SQLiteConnectionPoolOptions;

  // Security settings
  security: {
    filePermissions: number; // Unix file permissions (e.g., 0o600)
    enableEncryption: boolean;
    encryptionKey?: string;
    backupEncryption: boolean;
  };

  // Performance optimization
  performance: {
    enableWAL: boolean;
    checkpointInterval: number; // WAL checkpoint interval in ms
    cacheSize: number;
    mmapSize: number; // Memory-mapped I/O size
    maxPageCount: number;
  };

  // Backup and maintenance
  backup: {
    enabled: boolean;
    interval: number; // Backup interval in ms
    retentionDays: number;
    compressionEnabled: boolean;
  };

  // Health monitoring
  health: {
    enabled: boolean;
    checkInterval: number;
    integrityCheckInterval: number;
    vacuumInterval: number;
  };
}

@Injectable()
export class SQLiteLocalConfig {
  private readonly logger = new Logger(SQLiteLocalConfig.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly secretsService: SecretsService,
  ) {
    this.logger.log(
      'Initializing enterprise SQLite local database configuration',
    );
  }

  /**
   * Get optimized SQLite configuration for local enterprise operations
   */
  getSQLiteConfiguration(): SQLiteConfiguration {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';
    const dataDir = this.configService.get<string>('SQLITE_DATA_DIR', './data');
    const dbFilename = this.configService.get<string>(
      'SQLITE_DB_NAME',
      'bytebot.db',
    );

    // Ensure data directory exists
    this.ensureDataDirectory(dataDir);

    const configuration: SQLiteConfiguration = {
      database: {
        path: dataDir,
        filename: dbFilename,
        fullPath: path.join(dataDir, dbFilename),
        backupPath: path.join(dataDir, 'backups'),
        tempPath: path.join(dataDir, 'temp'),
      },

      pool: {
        maxConnections: this.configService.get<number>(
          'SQLITE_MAX_CONNECTIONS',
          10,
        ),
        minConnections: this.configService.get<number>(
          'SQLITE_MIN_CONNECTIONS',
          2,
        ),
        acquireTimeoutMillis: this.configService.get<number>(
          'SQLITE_ACQUIRE_TIMEOUT_MS',
          30000,
        ),
        idleTimeoutMillis: this.configService.get<number>(
          'SQLITE_IDLE_TIMEOUT_MS',
          600000,
        ),

        // SQLite performance optimizations
        journalMode: this.configService.get<
          'DELETE' | 'TRUNCATE' | 'PERSIST' | 'MEMORY' | 'WAL' | 'OFF'
        >('SQLITE_JOURNAL_MODE', isProduction ? 'WAL' : 'DELETE'),
        synchronous: this.configService.get<
          'OFF' | 'NORMAL' | 'FULL' | 'EXTRA'
        >('SQLITE_SYNCHRONOUS', isProduction ? 'NORMAL' : 'FULL'),
        cacheSize: this.configService.get<number>('SQLITE_CACHE_SIZE', -64000), // 64MB cache
        tempStore: this.configService.get<'DEFAULT' | 'FILE' | 'MEMORY'>(
          'SQLITE_TEMP_STORE',
          'MEMORY',
        ),

        foreignKeys: this.configService.get<boolean>(
          'SQLITE_FOREIGN_KEYS',
          true,
        ),
        enableWAL: this.configService.get<boolean>(
          'SQLITE_ENABLE_WAL',
          isProduction,
        ),
        enableSharedCache: this.configService.get<boolean>(
          'SQLITE_SHARED_CACHE',
          false,
        ),

        logQueries: this.configService.get<boolean>(
          'SQLITE_LOG_QUERIES',
          !isProduction,
        ),
        slowQueryThreshold: this.configService.get<number>(
          'SQLITE_SLOW_QUERY_THRESHOLD_MS',
          1000,
        ),
        enableMetrics: this.configService.get<boolean>(
          'SQLITE_ENABLE_METRICS',
          true,
        ),
      },

      security: {
        filePermissions: this.configService.get<number>(
          'SQLITE_FILE_PERMISSIONS',
          0o600,
        ),
        enableEncryption: this.configService.get<boolean>(
          'SQLITE_ENCRYPTION_ENABLED',
          false,
        ),
        encryptionKey: this.secretsService.getSecret(
          'sqlite-encryption-key',
          'SQLITE_ENCRYPTION_KEY',
        ),
        backupEncryption: this.configService.get<boolean>(
          'SQLITE_BACKUP_ENCRYPTION',
          false,
        ),
      },

      performance: {
        enableWAL: this.configService.get<boolean>(
          'SQLITE_WAL_ENABLED',
          isProduction,
        ),
        checkpointInterval: this.configService.get<number>(
          'SQLITE_CHECKPOINT_INTERVAL_MS',
          300000,
        ), // 5 minutes
        cacheSize: this.configService.get<number>('SQLITE_CACHE_SIZE', -64000),
        mmapSize: this.configService.get<number>('SQLITE_MMAP_SIZE', 268435456), // 256MB
        maxPageCount: this.configService.get<number>(
          'SQLITE_MAX_PAGE_COUNT',
          1073741823,
        ),
      },

      backup: {
        enabled: this.configService.get<boolean>(
          'SQLITE_BACKUP_ENABLED',
          isProduction,
        ),
        interval: this.configService.get<number>(
          'SQLITE_BACKUP_INTERVAL_MS',
          21600000,
        ), // 6 hours
        retentionDays: this.configService.get<number>(
          'SQLITE_BACKUP_RETENTION_DAYS',
          30,
        ),
        compressionEnabled: this.configService.get<boolean>(
          'SQLITE_BACKUP_COMPRESSION',
          true,
        ),
      },

      health: {
        enabled: this.configService.get<boolean>('SQLITE_HEALTH_ENABLED', true),
        checkInterval: this.configService.get<number>(
          'SQLITE_HEALTH_CHECK_INTERVAL_MS',
          60000,
        ),
        integrityCheckInterval: this.configService.get<number>(
          'SQLITE_INTEGRITY_CHECK_INTERVAL_MS',
          86400000,
        ), // 24 hours
        vacuumInterval: this.configService.get<number>(
          'SQLITE_VACUUM_INTERVAL_MS',
          604800000,
        ), // 7 days
      },
    };

    this.logger.log('SQLite configuration initialized', {
      databasePath: configuration.database.fullPath,
      journalMode: configuration.pool.journalMode,
      walEnabled: configuration.performance.enableWAL,
      encryptionEnabled: configuration.security.enableEncryption,
      backupEnabled: configuration.backup.enabled,
    });

    return configuration;
  }

  /**
   * Generate SQLite connection string with all optimizations
   */
  getSQLiteConnectionString(): string {
    const config = this.getSQLiteConfiguration();
    const params = new URLSearchParams();

    // Basic connection parameters
    params.set('connection_limit', config.pool.maxConnections.toString());
    params.set(
      'pool_timeout',
      Math.ceil(config.pool.acquireTimeoutMillis / 1000).toString(),
    );

    // SQLite-specific performance parameters
    params.set('journal_mode', config.pool.journalMode);
    params.set('synchronous', config.pool.synchronous);
    params.set('cache_size', config.pool.cacheSize.toString());
    params.set('temp_store', config.pool.tempStore);
    params.set('mmap_size', config.performance.mmapSize.toString());

    // Security and integrity parameters
    params.set('foreign_keys', config.pool.foreignKeys ? 'ON' : 'OFF');

    if (config.performance.enableWAL) {
      params.set('journal_mode', 'WAL');
    }

    // Application identification
    params.set('application_name', 'bytebot-agent-sqlite');

    const connectionString = `file:${config.database.fullPath}?${params.toString()}`;

    this.logger.debug('Generated SQLite connection string', {
      path: config.database.fullPath,
      walEnabled: config.performance.enableWAL,
      foreignKeys: config.pool.foreignKeys,
    });

    return connectionString;
  }

  /**
   * Ensure data directory and subdirectories exist with proper permissions
   */
  private ensureDataDirectory(dataDir: string): void {
    try {
      // Create main data directory
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
        this.logger.log(`Created SQLite data directory: ${dataDir}`);
      }

      // Create backup directory
      const backupDir = path.join(dataDir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true, mode: 0o755 });
        this.logger.log(`Created SQLite backup directory: ${backupDir}`);
      }

      // Create temp directory
      const tempDir = path.join(dataDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true, mode: 0o755 });
        this.logger.log(`Created SQLite temp directory: ${tempDir}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to create SQLite data directories: ${errorMessage}`,
      );
      throw new Error(
        `SQLite data directory initialization failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Validate SQLite configuration for consistency and security
   */
  validateConfiguration(): boolean {
    try {
      const config = this.getSQLiteConfiguration();
      const errors: string[] = [];

      // Validate database path
      if (!config.database.path || !config.database.filename) {
        errors.push('Database path and filename are required');
      }

      // Validate pool settings
      if (config.pool.maxConnections < config.pool.minConnections) {
        errors.push(
          'Maximum connections must be greater than or equal to minimum connections',
        );
      }

      if (config.pool.maxConnections < 1) {
        errors.push('Maximum connections must be at least 1');
      }

      // Validate performance settings
      if (
        config.performance.cacheSize > 0 &&
        config.performance.cacheSize < 400
      ) {
        errors.push(
          'SQLite cache size should be at least 400 pages or negative for memory size',
        );
      }

      // Validate backup settings
      if (config.backup.enabled && config.backup.retentionDays < 1) {
        errors.push(
          'Backup retention must be at least 1 day when backup is enabled',
        );
      }

      // Validate security settings
      if (config.security.enableEncryption && !config.security.encryptionKey) {
        errors.push('Encryption key is required when encryption is enabled');
      }

      if (errors.length > 0) {
        const errorMessage = `SQLite configuration validation failed:\n${errors.join('\n')}`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }

      this.logger.log('SQLite configuration validation successful');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('SQLite configuration validation failed', errorMessage);
      throw new Error(
        `SQLite configuration validation failed: ${errorMessage}`,
      );
    }
  }

  /**
   * Get SQLite-specific Prisma configuration
   */
  getSQLitePrismaConfig() {
    const config = this.getSQLiteConfiguration();

    return {
      provider: 'sqlite',
      url: this.getSQLiteConnectionString(),
      relationMode: 'prisma', // Required for SQLite with Prisma
      shadowDatabaseUrl: `file:${config.database.tempPath}/shadow.db`,
    };
  }

  /**
   * Get environment-specific SQLite optimizations
   */
  getEnvironmentOptimizations() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (nodeEnv === 'production') {
      return {
        performance: {
          enableWAL: true,
          journalMode: 'WAL',
          synchronous: 'NORMAL',
          mmapSize: 268435456, // 256MB
        },
        backup: {
          enabled: true,
          frequency: 'every_6_hours',
        },
        monitoring: {
          integrityChecks: true,
          performanceMetrics: true,
        },
      };
    }

    if (nodeEnv === 'development') {
      return {
        performance: {
          enableWAL: false,
          journalMode: 'DELETE',
          synchronous: 'FULL',
          verboseLogging: true,
        },
        backup: {
          enabled: false,
        },
        monitoring: {
          queryLogging: true,
          detailedMetrics: true,
        },
      };
    }

    // Testing environment
    return {
      performance: {
        enableWAL: false,
        journalMode: 'MEMORY',
        synchronous: 'OFF',
        tempStore: 'MEMORY',
      },
      backup: {
        enabled: false,
      },
      monitoring: {
        minimal: true,
      },
    };
  }
}
