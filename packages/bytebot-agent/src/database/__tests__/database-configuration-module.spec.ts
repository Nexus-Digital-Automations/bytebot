/**
 * Database Configuration and Module Test Suite
 *
 * Comprehensive test coverage for database configuration management and module setup:
 * - Database Configuration Service with validation and security
 * - Hybrid Database Module with multi-provider support
 * - Standard Database Module with enterprise features
 * - Connection pool configuration and management
 * - SQLite local configuration for development
 * - Module dependency injection and service registration
 *
 * Test Categories:
 * - Configuration initialization and validation
 * - Multi-database provider support (PostgreSQL/SQLite)
 * - Dynamic module registration and factory patterns
 * - Environment-specific optimizations
 * - Security configuration and SSL settings
 * - Health monitoring and metrics configuration
 * - Connection pool management and optimization
 * - Error handling and fallback mechanisms
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

// Configuration services
import { DatabaseConfig, DatabaseConfiguration } from '../database.config';
import { ConnectionPoolConfig } from '../connection-pool.config';
import { SQLiteLocalConfig } from '../sqlite-local.config';

// Module services
import { DatabaseModule } from '../database.module';
import {
  HybridDatabaseModule,
  DatabaseProvider,
  HybridDatabaseConfig,
  determineDatabaseProvider,
  createPrismaService,
  getCurrentDatabaseProvider,
  getDatabaseConnectionString,
} from '../hybrid-database.module';

// Mock dependencies
import { SecretsService } from '../../config/secrets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CircuitBreakerService } from '../../common/services/circuit-breaker.service';
import { RetryService } from '../../common/services/retry.service';
import { ShutdownService } from '../../common/services/shutdown.service';

describe('Database Configuration and Module Components', () => {
  let databaseConfig: DatabaseConfig;
  let connectionPoolConfig: ConnectionPoolConfig;
  let sqliteConfig: SQLiteLocalConfig;
  let configService: jest.Mocked<ConfigService>;
  let secretsService: jest.Mocked<SecretsService>;

  // Test configuration data
  const mockPostgresUrl =
    'postgresql://user:password@localhost:5432/testdb?sslmode=require&schema=public';
  const mockSQLiteUrl = 'file:./test.db';

  const mockEnvironmentConfigs = {
    production: {
      NODE_ENV: 'production',
      DATABASE_URL: mockPostgresUrl,
      DB_SSL_ENABLED: true,
      DB_SSL_MODE: 'require',
      DB_MAX_CONNECTIONS: 50,
      DB_MIN_CONNECTIONS: 10,
      DB_LOG_QUERIES: false,
      DB_AUDIT_ENABLED: true,
    },
    development: {
      NODE_ENV: 'development',
      DATABASE_URL: mockSQLiteUrl,
      DB_SSL_ENABLED: false,
      DB_SSL_MODE: 'prefer',
      DB_MAX_CONNECTIONS: 10,
      DB_MIN_CONNECTIONS: 2,
      DB_LOG_QUERIES: true,
      DB_AUDIT_ENABLED: false,
    },
    test: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      DB_SSL_ENABLED: false,
      DB_LOG_QUERIES: false,
      DB_AUDIT_ENABLED: false,
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock ConfigService
    const mockConfigServiceMethods = {
      get: jest.fn((key: string, defaultValue?: any) => {
        // Default to development environment for most tests
        const envConfig = mockEnvironmentConfigs.development;
        const configMap: Record<string, any> = {
          ...envConfig,
          DATABASE_SCHEMA: 'public',
          DB_ACQUIRE_TIMEOUT_MS: 30000,
          DB_IDLE_TIMEOUT_MS: 600000,
          DB_MAX_WAITING_CLIENTS: 100,
          DB_RETRY_ATTEMPTS: 3,
          DB_RETRY_DELAY_MS: 2000,
          DB_EVICTION_INTERVAL_MS: 300000,
          DB_QUERY_TIMEOUT_MS: 30000,
          DB_STATEMENT_TIMEOUT_MS: 60000,
          DB_SLOW_QUERY_THRESHOLD_MS: 1000,
          DB_HEALTH_ENABLED: true,
          DB_HEALTH_CHECK_INTERVAL: 30000,
          DB_HEALTH_TIMEOUT: 5000,
          DB_HEALTH_UNHEALTHY_THRESHOLD: 3,
          DB_HEALTH_DEGRADED_THRESHOLD: 2,
          DB_HEALTH_RECOVERY_THRESHOLD: 3,
          DB_HEALTH_GRACEFUL_DEGRADATION: true,
          DB_HEALTH_BLOCK_ON_UNHEALTHY: true,
          DB_METRICS_ENABLED: true,
          DB_METRICS_INTERVAL: 60000,
          DB_METRICS_PROMETHEUS: true,
          DB_METRICS_HISTORY_SIZE: 1000,
          DB_METRICS_SLOW_QUERIES: true,
          DB_AUDIT_SENSITIVE: true,
          DB_AUDIT_ALL_QUERIES: false,
          DB_AUDIT_RETENTION_DAYS: 30,
          DB_RESTRICTED_OPS: 'DROP,TRUNCATE,ALTER',
          DB_OBFUSCATE_CONNECTION: true,
          DB_MAX_CONCURRENT_CONNECTIONS: 1000,
          DB_DEBUG: false,
        };
        return configMap[key] ?? defaultValue;
      }),
    };

    // Mock SecretsService
    const mockSecretsServiceMethods = {
      getSecret: jest.fn((secretName: string, fallbackKey?: string) => {
        if (secretName === 'database-url') {
          return mockEnvironmentConfigs.development.DATABASE_URL;
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseConfig,
        ConnectionPoolConfig,
        SQLiteLocalConfig,
        {
          provide: ConfigService,
          useValue: mockConfigServiceMethods,
        },
        {
          provide: SecretsService,
          useValue: mockSecretsServiceMethods,
        },
      ],
    }).compile();

    databaseConfig = module.get<DatabaseConfig>(DatabaseConfig);
    connectionPoolConfig =
      module.get<ConnectionPoolConfig>(ConnectionPoolConfig);
    sqliteConfig = module.get<SQLiteLocalConfig>(SQLiteLocalConfig);
    configService = module.get(ConfigService);
    secretsService = module.get(SecretsService);

    // Mock logger to prevent console output during tests
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    (databaseConfig as any).logger = mockLogger;
    (connectionPoolConfig as any).logger = mockLogger;
    (sqliteConfig as any).logger = mockLogger;
  });

  describe('Database Configuration Service', () => {
    describe('Configuration Initialization', () => {
      it('should initialize configuration with development defaults', () => {
        databaseConfig.initializeConfiguration();

        const config = databaseConfig.getConfiguration();

        expect(config).toBeDefined();
        expect(config.environment.nodeEnv).toBe('development');
        expect(config.environment.isDevelopment).toBe(true);
        expect(config.environment.isProduction).toBe(false);
        expect(config.connection.url).toBe(mockSQLiteUrl);
      });

      it('should load configuration from secrets service', () => {
        databaseConfig.initializeConfiguration();

        expect(secretsService.getSecret).toHaveBeenCalledWith(
          'database-url',
          'DATABASE_URL',
        );

        const config = databaseConfig.getConfiguration();
        expect(config.connection.url).toBe(mockSQLiteUrl);
      });

      it('should fall back to config service when secrets unavailable', () => {
        secretsService.getSecret.mockReturnValue(null);

        databaseConfig.initializeConfiguration();

        const config = databaseConfig.getConfiguration();
        expect(config.connection.url).toBe(mockSQLiteUrl);
      });

      it('should throw error when DATABASE_URL is missing', () => {
        secretsService.getSecret.mockReturnValue(null);
        configService.get.mockImplementation((key: string) => {
          if (key === 'DATABASE_URL') return undefined;
          return mockEnvironmentConfigs.development[key];
        });

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow('DATABASE_URL not found in secrets or configuration');
      });

      it('should parse PostgreSQL connection URL correctly', () => {
        secretsService.getSecret.mockReturnValue(mockPostgresUrl);

        databaseConfig.initializeConfiguration();

        const config = databaseConfig.getConfiguration();
        expect(config.connection.host).toBe('localhost');
        expect(config.connection.port).toBe(5432);
        expect(config.connection.database).toBe('testdb');
        expect(config.connection.username).toBe('user');
        expect(config.connection.password).toBe('password');
      });

      it('should configure production environment optimizations', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            const envConfig = mockEnvironmentConfigs.production;
            return (
              envConfig[key] ??
              defaultValue ??
              mockEnvironmentConfigs.development[key]
            );
          },
        );

        databaseConfig.initializeConfiguration();

        const config = databaseConfig.getConfiguration();
        expect(config.environment.isProduction).toBe(true);
        expect(config.ssl.enabled).toBe(true);
        expect(config.ssl.mode).toBe('require');
        expect(config.pool.maxConnections).toBe(50);
        expect(config.performance.preparedStatements).toBe(true);
        expect(config.performance.logQueries).toBe(false);
        expect(config.security.auditLogging).toBe(true);
      });
    });

    describe('Configuration Validation', () => {
      it('should validate valid configuration successfully', () => {
        expect(() => {
          databaseConfig.initializeConfiguration();
        }).not.toThrow();
      });

      it('should validate connection pool settings', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_MAX_CONNECTIONS') return 5;
            if (key === 'DB_MIN_CONNECTIONS') return 10; // Invalid: max < min
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow(
          'Maximum connections must be greater than or equal to minimum connections',
        );
      });

      it('should validate timeout settings', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_QUERY_TIMEOUT_MS') return 60000;
            if (key === 'DB_STATEMENT_TIMEOUT_MS') return 30000; // Invalid: statement < query
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow(
          'Statement timeout should be greater than or equal to query timeout',
        );
      });

      it('should validate SSL configuration consistency', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_SSL_ENABLED') return true;
            if (key === 'DB_SSL_MODE') return 'disable'; // Invalid: enabled but disabled
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow('SSL cannot be both enabled and disabled');
      });

      it('should validate health check settings', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_HEALTH_TIMEOUT') return 35000;
            if (key === 'DB_HEALTH_CHECK_INTERVAL') return 30000; // Invalid: timeout >= interval
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow('Health check timeout should be less than check interval');
      });

      it('should validate security settings', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_AUDIT_RETENTION_DAYS') return 0; // Invalid: must be >= 1
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow('Audit retention must be at least 1 day');
      });

      it('should warn about SSL disabled in production', () => {
        const mockLogger = {
          log: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        };
        (databaseConfig as any).logger = mockLogger;

        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'NODE_ENV') return 'production';
            if (key === 'DB_SSL_MODE') return 'disable';
            return mockEnvironmentConfigs.production[key] ?? defaultValue;
          },
        );

        databaseConfig.initializeConfiguration();

        expect(mockLogger.warn).toHaveBeenCalledWith(
          'SSL is disabled in production environment',
        );
      });
    });

    describe('Configuration Access Methods', () => {
      beforeEach(() => {
        databaseConfig.initializeConfiguration();
      });

      it('should provide connection configuration', () => {
        const connectionConfig = databaseConfig.getConnectionConfig();

        expect(connectionConfig).toMatchObject({
          host: expect.any(String),
          port: expect.any(Number),
          database: expect.any(String),
          url: expect.any(String),
          schema: 'public',
        });
      });

      it('should provide pool configuration', () => {
        const poolConfig = databaseConfig.getPoolConfig();

        expect(poolConfig).toMatchObject({
          maxConnections: expect.any(Number),
          minConnections: expect.any(Number),
          acquireTimeoutMillis: expect.any(Number),
          idleTimeoutMillis: expect.any(Number),
          testOnBorrow: true,
          testOnCreate: true,
          testWhileIdle: true,
        });
      });

      it('should provide SSL configuration', () => {
        const sslConfig = databaseConfig.getSslConfig();

        expect(sslConfig).toMatchObject({
          enabled: expect.any(Boolean),
          mode: expect.stringMatching(/^(require|prefer|allow|disable)$/),
          rejectUnauthorized: expect.any(Boolean),
        });
      });

      it('should provide metrics configuration', () => {
        const metricsConfig = databaseConfig.getMetricsConfig();

        expect(metricsConfig).toMatchObject({
          enabled: true,
          collectionInterval: 60000,
          prometheusExport: true,
          historySize: 1000,
          slowQueryReporting: true,
        });
      });

      it('should provide security configuration', () => {
        const securityConfig = databaseConfig.getSecurityConfig();

        expect(securityConfig).toMatchObject({
          auditLogging: expect.any(Boolean),
          auditSensitiveOps: true,
          restrictedOperations: ['DROP', 'TRUNCATE', 'ALTER'],
          connectionStringObfuscation: true,
          maxConcurrentConnections: 1000,
        });
      });
    });

    describe('Prisma Connection URL Generation', () => {
      beforeEach(() => {
        databaseConfig.initializeConfiguration();
      });

      it('should generate optimized Prisma connection URL', () => {
        const connectionUrl = databaseConfig.getPrismaConnectionUrl();

        expect(connectionUrl).toContain('connection_limit=');
        expect(connectionUrl).toContain('pool_timeout=');
        expect(connectionUrl).toContain('application_name=bytebot-agent');
        expect(connectionUrl).toContain('prepared_statements=');
        expect(connectionUrl).toContain('pgbouncer=true');
      });

      it('should include SSL parameters when SSL is enabled', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_SSL_ENABLED') return true;
            if (key === 'DB_SSL_MODE') return 'require';
            if (key === 'DB_SSL_CERT_PATH') return '/path/to/cert.pem';
            if (key === 'DB_SSL_KEY_PATH') return '/path/to/key.pem';
            if (key === 'DB_SSL_ROOT_CERT_PATH') return '/path/to/ca.pem';
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        databaseConfig.initializeConfiguration();
        const connectionUrl = databaseConfig.getPrismaConnectionUrl();

        expect(connectionUrl).toContain('sslmode=require');
        expect(connectionUrl).toContain('sslcert=/path/to/cert.pem');
        expect(connectionUrl).toContain('sslkey=/path/to/key.pem');
        expect(connectionUrl).toContain('sslrootcert=/path/to/ca.pem');
      });

      it('should disable SSL when not enabled', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_SSL_ENABLED') return false;
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        databaseConfig.initializeConfiguration();
        const connectionUrl = databaseConfig.getPrismaConnectionUrl();

        expect(connectionUrl).toContain('sslmode=disable');
      });

      it('should include custom schema parameter', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DATABASE_SCHEMA') return 'custom_schema';
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        databaseConfig.initializeConfiguration();
        const connectionUrl = databaseConfig.getPrismaConnectionUrl();

        expect(connectionUrl).toContain('schema=custom_schema');
      });
    });

    describe('Environment Optimizations', () => {
      beforeEach(() => {
        databaseConfig.initializeConfiguration();
      });

      it('should provide production optimizations', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'NODE_ENV') return 'production';
            return mockEnvironmentConfigs.production[key] ?? defaultValue;
          },
        );

        databaseConfig.initializeConfiguration();
        const optimizations = databaseConfig.getEnvironmentOptimizations();

        expect(optimizations).toMatchObject({
          logging: {
            queries: false,
            connections: false,
            performance: true,
            errors: true,
          },
          monitoring: {
            detailed: true,
            sampling: 1.0,
          },
          security: {
            strict: true,
            auditAll: false,
          },
        });
      });

      it('should provide development optimizations', () => {
        const optimizations = databaseConfig.getEnvironmentOptimizations();

        expect(optimizations).toMatchObject({
          logging: {
            queries: true,
            connections: true,
            performance: true,
            errors: true,
          },
          monitoring: {
            detailed: true,
            sampling: 1.0,
          },
          security: {
            strict: false,
            auditAll: true,
          },
        });
      });

      it('should provide Kubernetes health check configuration', () => {
        const k8sConfig = databaseConfig.getKubernetesConfig();

        expect(k8sConfig).toMatchObject({
          liveness: {
            enabled: true,
            path: '/database/health',
            initialDelaySeconds: 30,
            periodSeconds: 10,
            failureThreshold: 3,
          },
          readiness: {
            enabled: true,
            path: '/database/health',
            initialDelaySeconds: 5,
            periodSeconds: 5,
            failureThreshold: 2,
          },
          startup: {
            enabled: true,
            path: '/database/health',
            initialDelaySeconds: 10,
            periodSeconds: 5,
            failureThreshold: 10,
          },
        });
      });
    });
  });

  describe('Connection Pool Configuration', () => {
    it('should initialize with default pool settings', () => {
      expect(connectionPoolConfig).toBeDefined();
      expect(configService.get).toHaveBeenCalledWith(
        'DB_MAX_CONNECTIONS',
        expect.any(Number),
      );
      expect(configService.get).toHaveBeenCalledWith(
        'DB_MIN_CONNECTIONS',
        expect.any(Number),
      );
    });

    it('should provide pool configuration methods', () => {
      expect(typeof connectionPoolConfig.getPoolConfig).toBe('function');
      expect(typeof connectionPoolConfig.validatePoolSettings).toBe('function');
    });
  });

  describe('SQLite Local Configuration', () => {
    it('should initialize with SQLite-specific settings', () => {
      expect(sqliteConfig).toBeDefined();
      expect(typeof sqliteConfig.validateConfiguration).toBe('function');
      expect(typeof sqliteConfig.getSQLiteConnectionString).toBe('function');
    });

    it('should handle SQLite configuration validation', () => {
      expect(() => {
        sqliteConfig.validateConfiguration();
      }).not.toThrow();
    });
  });

  describe('Hybrid Database Module', () => {
    describe('Database Provider Determination', () => {
      it('should determine PostgreSQL from explicit provider', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'DATABASE_PROVIDER') return 'postgresql';
          return undefined;
        });

        const provider = determineDatabaseProvider(configService);
        expect(provider).toBe('postgresql');
      });

      it('should determine PostgreSQL from connection URL', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'DATABASE_URL')
            return 'postgresql://user:pass@localhost/db';
          return undefined;
        });

        const provider = determineDatabaseProvider(configService);
        expect(provider).toBe('postgresql');
      });

      it('should determine SQLite from file URL', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'DATABASE_URL') return 'file:./database.db';
          return undefined;
        });

        const provider = determineDatabaseProvider(configService);
        expect(provider).toBe('sqlite');
      });

      it('should default to SQLite when no explicit configuration', () => {
        configService.get.mockReturnValue(undefined);

        const provider = determineDatabaseProvider(configService);
        expect(provider).toBe('sqlite');
      });

      it('should handle postgres:// protocol', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'DATABASE_URL')
            return 'postgres://user:pass@localhost/db';
          return undefined;
        });

        const provider = determineDatabaseProvider(configService);
        expect(provider).toBe('postgresql');
      });

      it('should determine SQLite from .db extension', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'DATABASE_URL') return '/path/to/database.db';
          return undefined;
        });

        const provider = determineDatabaseProvider(configService);
        expect(provider).toBe('sqlite');
      });
    });

    describe('Dynamic Module Creation', () => {
      it('should create dynamic module with auto-detected provider', async () => {
        const dynamicModule = HybridDatabaseModule.forRoot();

        expect(dynamicModule.module).toBe(HybridDatabaseModule);
        expect(dynamicModule.providers).toBeDefined();
        expect(dynamicModule.exports).toBeDefined();
        expect(dynamicModule.controllers).toBeDefined();

        // Verify provider registration
        const databaseProviderConfig = dynamicModule.providers?.find(
          (provider: any) => provider.provide === 'DATABASE_PROVIDER',
        );
        expect(databaseProviderConfig).toBeDefined();
      });

      it('should create dynamic module with explicit provider', async () => {
        const dynamicModule =
          HybridDatabaseModule.forRootWithProvider('postgresql');

        expect(dynamicModule.module).toBe(HybridDatabaseModule);

        // Verify explicit provider registration
        const databaseProviderConfig = dynamicModule.providers?.find(
          (provider: any) => provider.provide === 'DATABASE_PROVIDER',
        );
        expect(databaseProviderConfig).toBeDefined();
        expect(databaseProviderConfig.useValue).toBe('postgresql');
      });

      it('should create dynamic module with fallback configuration', async () => {
        const dynamicModule = HybridDatabaseModule.forRootWithFallback(
          'postgresql',
          'sqlite',
        );

        expect(dynamicModule.module).toBe(HybridDatabaseModule);

        // Verify fallback provider factory
        const databaseProviderConfig = dynamicModule.providers?.find(
          (provider: any) => provider.provide === 'DATABASE_PROVIDER',
        );
        expect(databaseProviderConfig).toBeDefined();
        expect(databaseProviderConfig.useFactory).toBeDefined();
      });
    });

    describe('Prisma Service Factory', () => {
      it('should create Prisma service for PostgreSQL', () => {
        const mockDatabaseConfig = { initializeConfiguration: jest.fn() };

        const prismaServiceProvider = createPrismaService(
          'postgresql',
          configService,
          mockDatabaseConfig as any,
          undefined,
        );

        expect(prismaServiceProvider.provide).toBe(PrismaService);
        expect(prismaServiceProvider.useFactory).toBeDefined();
      });

      it('should create Prisma service for SQLite', () => {
        const mockSQLiteConfig = { validateConfiguration: jest.fn() };

        const prismaServiceProvider = createPrismaService(
          'sqlite',
          configService,
          undefined,
          mockSQLiteConfig as any,
        );

        expect(prismaServiceProvider.provide).toBe(PrismaService);
        expect(prismaServiceProvider.useFactory).toBeDefined();
      });

      it('should throw error for unsupported provider', () => {
        expect(() => {
          createPrismaService(
            'mysql' as any,
            configService,
            undefined,
            undefined,
          );
        }).toThrow('Unsupported database provider: mysql');
      });
    });

    describe('Utility Functions', () => {
      it('should get current database provider', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'DATABASE_PROVIDER') return 'postgresql';
          return undefined;
        });

        const provider = getCurrentDatabaseProvider(configService);
        expect(provider).toBe('postgresql');
      });

      it('should get PostgreSQL connection string', () => {
        const mockDatabaseConfig = {
          getPrismaConnectionUrl: jest
            .fn()
            .mockReturnValue('postgresql://test-connection'),
        };

        const connectionString = getDatabaseConnectionString(
          'postgresql',
          configService,
          mockDatabaseConfig as any,
          undefined,
        );

        expect(connectionString).toBe('postgresql://test-connection');
        expect(mockDatabaseConfig.getPrismaConnectionUrl).toHaveBeenCalled();
      });

      it('should get SQLite connection string', () => {
        const mockSQLiteConfig = {
          getSQLiteConnectionString: jest
            .fn()
            .mockReturnValue('file:./test.db'),
        };

        const connectionString = getDatabaseConnectionString(
          'sqlite',
          configService,
          undefined,
          mockSQLiteConfig as any,
        );

        expect(connectionString).toBe('file:./test.db');
        expect(mockSQLiteConfig.getSQLiteConnectionString).toHaveBeenCalled();
      });

      it('should throw error when unable to get connection string', () => {
        expect(() => {
          getDatabaseConnectionString(
            'mysql' as any,
            configService,
            undefined,
            undefined,
          );
        }).toThrow('Unable to get connection string for provider: mysql');
      });
    });
  });

  describe('Standard Database Module', () => {
    it('should be defined as global module', () => {
      expect(DatabaseModule).toBeDefined();

      // Verify module decorator metadata
      const moduleMetadata = Reflect.getMetadata('__module__', DatabaseModule);
      expect(moduleMetadata).toBeDefined();
    });

    it('should export all required services', () => {
      const moduleMetadata = Reflect.getMetadata('__module__', DatabaseModule);

      expect(moduleMetadata.exports).toEqual(
        expect.arrayContaining([
          'DatabaseService',
          'ConnectionPoolConfig',
          'ConnectionPoolService',
          'DatabaseHealthService',
          'DatabaseMetricsService',
          'DatabaseSecurityService',
          'QueryLoggingInterceptor',
          'DatabaseHealthGuard',
          'CircuitBreakerGuard',
        ]),
      );
    });
  });

  describe('Integration and Error Scenarios', () => {
    describe('Configuration Integration', () => {
      it('should handle multiple configuration sources', () => {
        // Secrets service returns primary config
        secretsService.getSecret.mockReturnValue(mockPostgresUrl);

        // Config service provides fallback values
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            const fallbackConfig = {
              ...mockEnvironmentConfigs.development,
              DB_MAX_CONNECTIONS: 25, // Override from config service
            };
            return fallbackConfig[key] ?? defaultValue;
          },
        );

        databaseConfig.initializeConfiguration();

        const config = databaseConfig.getConfiguration();
        expect(config.connection.url).toBe(mockPostgresUrl); // From secrets
        expect(config.pool.maxConnections).toBe(25); // From config service
      });

      it('should handle hybrid module with PostgreSQL fallback to SQLite', async () => {
        // Create test module with fallback configuration
        const module: TestingModule = await Test.createTestingModule({
          imports: [
            HybridDatabaseModule.forRootWithFallback('postgresql', 'sqlite'),
          ],
          providers: [
            {
              provide: ConfigService,
              useValue: configService,
            },
            {
              provide: CircuitBreakerService,
              useValue: { isOpen: jest.fn().mockReturnValue(false) },
            },
            {
              provide: RetryService,
              useValue: { execute: jest.fn() },
            },
            {
              provide: ShutdownService,
              useValue: { addShutdownHook: jest.fn() },
            },
          ],
        }).compile();

        expect(module).toBeDefined();

        // Verify provider was determined
        const databaseProvider = module.get('DATABASE_PROVIDER');
        expect(['postgresql', 'sqlite']).toContain(databaseProvider);
      });
    });

    describe('Error Handling', () => {
      it('should handle configuration validation errors gracefully', () => {
        // Force validation error
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            if (key === 'DB_MAX_CONNECTIONS') return -1; // Invalid value
            return mockEnvironmentConfigs.development[key] ?? defaultValue;
          },
        );

        const mockLogger = {
          log: jest.fn(),
          error: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
        };
        (databaseConfig as any).logger = mockLogger;

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should handle missing environment variables gracefully', () => {
        configService.get.mockImplementation(
          (key: string, defaultValue?: any) => {
            // Return undefined for critical configurations
            if (key === 'DATABASE_URL') return undefined;
            return defaultValue;
          },
        );

        secretsService.getSecret.mockReturnValue(null);

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow('DATABASE_URL not found in secrets or configuration');
      });

      it('should handle malformed database URLs', () => {
        secretsService.getSecret.mockReturnValue('invalid-url');

        expect(() => {
          databaseConfig.initializeConfiguration();
        }).toThrow();
      });
    });

    describe('Performance and Memory Management', () => {
      it('should handle large configuration objects efficiently', () => {
        const initialMemory = process.memoryUsage().heapUsed;

        // Initialize multiple configurations
        for (let i = 0; i < 100; i++) {
          databaseConfig.initializeConfiguration();
          const config = databaseConfig.getConfiguration();
          expect(config).toBeDefined();
        }

        const finalMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = finalMemory - initialMemory;

        // Memory increase should be reasonable
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      });

      it('should provide immutable configuration objects', () => {
        databaseConfig.initializeConfiguration();

        const config1 = databaseConfig.getConfiguration();
        const config2 = databaseConfig.getConfiguration();

        // Should be different objects (defensive copying)
        expect(config1).not.toBe(config2);
        expect(config1).toEqual(config2);

        // Modifying returned config should not affect internal state
        config1.pool.maxConnections = 999;
        const config3 = databaseConfig.getConfiguration();
        expect(config3.pool.maxConnections).not.toBe(999);
      });
    });
  });
});
