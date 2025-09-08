/**
 * Hybrid Database Module - Multi-Database Support for Local Operations
 * Supports both PostgreSQL and SQLite databases with automatic provider selection,
 * connection pooling, and enterprise-grade monitoring for local database operations
 */

import { Module, DynamicModule, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseService } from './database.service';
import { ConnectionPoolService } from './connection-pool.service';
import { ConnectionPoolConfig } from './connection-pool.config';
import { DatabaseConfig } from './database.config';
import { SQLiteLocalConfig } from './sqlite-local.config';
import { DatabaseHealthService } from './health/database-health.service';
import { DatabaseMetricsService } from './metrics/database-metrics.service';
import { DatabaseSecurityService } from './security/database-security.service';
import { QueryLoggingInterceptor } from './interceptors/query-logging.interceptor';
import { DatabaseHealthController } from './database-health.controller';

export type DatabaseProvider = 'postgresql' | 'sqlite';

export interface HybridDatabaseConfig {
  provider: DatabaseProvider;
  postgresql?: {
    enabled: boolean;
    connectionString: string;
  };
  sqlite?: {
    enabled: boolean;
    databasePath: string;
  };
  fallback?: {
    enabled: boolean;
    primaryProvider: DatabaseProvider;
    fallbackProvider: DatabaseProvider;
  };
}

/**
 * Factory function to determine database provider based on configuration
 */
export function determineDatabaseProvider(
  configService: ConfigService,
): DatabaseProvider {
  const explicitProvider =
    configService.get<DatabaseProvider>('DATABASE_PROVIDER');

  if (explicitProvider) {
    return explicitProvider;
  }

  // Auto-detect based on DATABASE_URL format
  const databaseUrl = configService.get<string>('DATABASE_URL');

  if (databaseUrl) {
    if (
      databaseUrl.startsWith('postgresql://') ||
      databaseUrl.startsWith('postgres://')
    ) {
      return 'postgresql';
    }
    if (databaseUrl.startsWith('file:') || databaseUrl.endsWith('.db')) {
      return 'sqlite';
    }
  }

  // Default to SQLite for local operations
  return 'sqlite';
}

/**
 * Create Prisma service with appropriate database provider
 */
export function createPrismaService(
  databaseProvider: DatabaseProvider,
  configService: ConfigService,
  postgresConfig?: DatabaseConfig,
  sqliteConfig?: SQLiteLocalConfig,
) {
  return {
    provide: PrismaService,
    useFactory: () => {
      const prismaService = new PrismaService();

      // Configure Prisma based on database provider
      if (databaseProvider === 'postgresql' && postgresConfig) {
        // PostgreSQL configuration is already handled by existing DatabaseConfig
        return prismaService;
      } else if (databaseProvider === 'sqlite' && sqliteConfig) {
        // SQLite-specific configuration - validate configuration
        sqliteConfig.validateConfiguration();

        return prismaService;
      }

      throw new Error(`Unsupported database provider: ${databaseProvider}`);
    },
    inject: [ConfigService, DatabaseConfig, SQLiteLocalConfig],
  };
}

@Global()
@Module({})
export class HybridDatabaseModule {
  /**
   * Create a dynamic database module with automatic provider selection
   */
  static forRoot(): DynamicModule {
    return {
      module: HybridDatabaseModule,
      providers: [
        // Configuration providers
        {
          provide: 'DATABASE_PROVIDER',
          useFactory: (configService: ConfigService) => {
            return determineDatabaseProvider(configService);
          },
          inject: [ConfigService],
        },

        // Database configuration providers
        ConnectionPoolConfig,
        DatabaseConfig,
        SQLiteLocalConfig,

        // Core database services
        {
          provide: DatabaseService,
          useFactory: (
            configService: ConfigService,
            connectionPoolConfig: ConnectionPoolConfig,
            databaseConfig: DatabaseConfig,
            sqliteConfig: SQLiteLocalConfig,
            databaseProvider: DatabaseProvider,
          ) => {
            // Inject appropriate configuration based on provider
            if (databaseProvider === 'postgresql') {
              return new DatabaseService(
                configService,
                connectionPoolConfig,
                // Inject other required dependencies...
              );
            } else if (databaseProvider === 'sqlite') {
              // For SQLite, we might need a specialized service or adapter
              return new DatabaseService(
                configService,
                connectionPoolConfig,
                // Inject other required dependencies...
              );
            }

            throw new Error(
              `Unsupported database provider: ${String(databaseProvider)}`,
            );
          },
          inject: [
            ConfigService,
            ConnectionPoolConfig,
            DatabaseConfig,
            SQLiteLocalConfig,
            'DATABASE_PROVIDER',
          ],
        },

        // Connection pool service with provider-specific configuration
        {
          provide: ConnectionPoolService,
          useFactory: (
            configService: ConfigService,
            connectionPoolConfig: ConnectionPoolConfig,
            _databaseProvider: DatabaseProvider,
          ) => {
            return new ConnectionPoolService(
              configService,
              connectionPoolConfig,
            );
          },
          inject: [ConfigService, ConnectionPoolConfig, 'DATABASE_PROVIDER'],
        },

        // Health monitoring services
        DatabaseHealthService,
        DatabaseMetricsService,
        DatabaseSecurityService,

        // Interceptors and utilities
        QueryLoggingInterceptor,

        // Prisma service with provider-specific configuration
        {
          provide: PrismaService,
          useFactory: async (
            configService: ConfigService,
            databaseProvider: DatabaseProvider,
            databaseConfig: DatabaseConfig,
            sqliteConfig: SQLiteLocalConfig,
          ) => {
            const prismaService = new PrismaService();

            // Provider-specific initialization
            if (databaseProvider === 'postgresql') {
              // PostgreSQL initialization (existing logic)
              databaseConfig.initializeConfiguration();
            } else if (databaseProvider === 'sqlite') {
              // SQLite initialization
              sqliteConfig.validateConfiguration();
            }

            await prismaService.$connect();
            return prismaService;
          },
          inject: [
            ConfigService,
            'DATABASE_PROVIDER',
            DatabaseConfig,
            SQLiteLocalConfig,
          ],
        },
      ],
      controllers: [DatabaseHealthController],
      exports: [
        'DATABASE_PROVIDER',
        DatabaseService,
        ConnectionPoolService,
        ConnectionPoolConfig,
        DatabaseConfig,
        SQLiteLocalConfig,
        DatabaseHealthService,
        DatabaseMetricsService,
        DatabaseSecurityService,
        QueryLoggingInterceptor,
        PrismaService,
      ],
    };
  }

  /**
   * Create a database module with explicit provider configuration
   */
  static forRootWithProvider(provider: DatabaseProvider): DynamicModule {
    return {
      module: HybridDatabaseModule,
      providers: [
        // Explicit provider configuration
        {
          provide: 'DATABASE_PROVIDER',
          useValue: provider,
        },

        // Configuration providers
        ConnectionPoolConfig,
        DatabaseConfig,
        SQLiteLocalConfig,

        // Core services with provider-specific configuration
        DatabaseService,
        ConnectionPoolService,
        DatabaseHealthService,
        DatabaseMetricsService,
        DatabaseSecurityService,
        QueryLoggingInterceptor,

        // Provider-specific Prisma service
        {
          provide: PrismaService,
          useFactory: async (
            configService: ConfigService,
            databaseConfig: DatabaseConfig,
            sqliteConfig: SQLiteLocalConfig,
          ) => {
            const prismaService = new PrismaService();

            if (provider === 'postgresql') {
              databaseConfig.initializeConfiguration();
            } else if (provider === 'sqlite') {
              sqliteConfig.validateConfiguration();
            }

            await prismaService.$connect();
            return prismaService;
          },
          inject: [ConfigService, DatabaseConfig, SQLiteLocalConfig],
        },
      ],
      controllers: [DatabaseHealthController],
      exports: [
        'DATABASE_PROVIDER',
        DatabaseService,
        ConnectionPoolService,
        ConnectionPoolConfig,
        DatabaseConfig,
        SQLiteLocalConfig,
        DatabaseHealthService,
        DatabaseMetricsService,
        DatabaseSecurityService,
        QueryLoggingInterceptor,
        PrismaService,
      ],
    };
  }

  /**
   * Create a database module with fallback configuration
   */
  static forRootWithFallback(
    primaryProvider: DatabaseProvider,
    fallbackProvider: DatabaseProvider,
  ): DynamicModule {
    return {
      module: HybridDatabaseModule,
      providers: [
        // Primary provider with fallback
        {
          provide: 'DATABASE_PROVIDER',
          useFactory: (
            configService: ConfigService,
            databaseConfig: DatabaseConfig,
            sqliteConfig: SQLiteLocalConfig,
          ) => {
            try {
              // Attempt to validate primary provider configuration
              if (primaryProvider === 'postgresql') {
                databaseConfig.initializeConfiguration();
                // PostgreSQL configuration validated
                return primaryProvider;
              } else if (primaryProvider === 'sqlite') {
                sqliteConfig.validateConfiguration();
                // SQLite configuration validated
                return primaryProvider;
              }
            } catch (error) {
              console.warn(
                `Primary database provider ${primaryProvider} failed, falling back to ${fallbackProvider}:`,
                error,
              );
              return fallbackProvider;
            }

            return primaryProvider;
          },
          inject: [ConfigService, DatabaseConfig, SQLiteLocalConfig],
        },

        // Rest of the providers...
        ConnectionPoolConfig,
        DatabaseConfig,
        SQLiteLocalConfig,
        DatabaseService,
        ConnectionPoolService,
        DatabaseHealthService,
        DatabaseMetricsService,
        DatabaseSecurityService,
        QueryLoggingInterceptor,
        PrismaService,
      ],
      controllers: [DatabaseHealthController],
      exports: [
        'DATABASE_PROVIDER',
        DatabaseService,
        ConnectionPoolService,
        ConnectionPoolConfig,
        DatabaseConfig,
        SQLiteLocalConfig,
        DatabaseHealthService,
        DatabaseMetricsService,
        DatabaseSecurityService,
        QueryLoggingInterceptor,
        PrismaService,
      ],
    };
  }
}

/**
 * Utility function to get current database provider
 */
export function getCurrentDatabaseProvider(
  configService: ConfigService,
): DatabaseProvider {
  return determineDatabaseProvider(configService);
}

/**
 * Utility function to get database connection string based on provider
 */
export function getDatabaseConnectionString(
  provider: DatabaseProvider,
  configService: ConfigService,
  databaseConfig?: DatabaseConfig,
  sqliteConfig?: SQLiteLocalConfig,
): string {
  if (provider === 'postgresql' && databaseConfig) {
    return databaseConfig.getPrismaConnectionUrl();
  } else if (provider === 'sqlite' && sqliteConfig) {
    return sqliteConfig.getSQLiteConnectionString();
  }

  throw new Error(`Unable to get connection string for provider: ${provider}`);
}
