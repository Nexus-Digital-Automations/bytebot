/**
 * MDM Platform Core Module
 * Central module orchestrating all MDM platform components
 *
 * Agent 2: Module Architecture & Dependency Injection Configuration
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TerminusModule } from '@nestjs/terminus';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Feature Modules
import { DeviceModule } from './device/device.module';
import { PolicyModule } from './policy/policy.module';
import { ApplicationModule } from './application/application.module';
import { SecurityModule } from './security/security.module';
import { AssetModule } from './asset/asset.module';
import { ComplianceModule } from './compliance/compliance.module';
import { MobileSecurityModule } from './mobile-security/mobile-security.module';
import { IdentityModule } from './identity/identity.module';
import { NotificationModule } from './notification/notification.module';

// Common Services
import { MdmLogger } from './common/logger/mdm-logger.service';
import { MdmDatabaseService } from './common/database/mdm-database.service';
import { MdmHealthController } from './common/health/mdm-health.controller';
import { MdmMetricsService } from './common/metrics/mdm-metrics.service';
import { MdmCacheService } from './common/cache/mdm-cache.service';

// Middleware
import { MdmLoggingMiddleware } from './common/middleware/mdm-logging.middleware';
import { MdmSecurityMiddleware } from './common/middleware/mdm-security.middleware';
import { ParlantValidationMiddleware } from './common/middleware/parlant-validation.middleware';

// Configuration
import { mdmConfig } from './config/mdm.config';
import { databaseConfig } from './config/database.config';
import { securityConfig } from './config/security.config';
import { parlantConfig } from './config/parlant.config';

/**
 * MDM Platform Root Module
 * Configures enterprise-grade mobile device management platform
 * with comprehensive security, monitoring, and PARLANT integration
 */
@Module({
  imports: [
    // Configuration management
    ConfigModule.forRoot({
      isGlobal: true,
      load: [mdmConfig, databaseConfig, securityConfig, parlantConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true
      }
    }),

    // Database configuration with SQLite for local-only architecture
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'sqlite',
        database: configService.get<string>('MDM_DATABASE_PATH', './data/mdm.sqlite'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: true,
        synchronize: configService.get<string>('NODE_ENV') === 'development',
        logging: configService.get<boolean>('MDM_DATABASE_LOGGING', false),
        autoLoadEntities: true,
        retryAttempts: 3,
        retryDelay: 3000,
        extra: {
          // SQLite-specific optimizations
          journal_mode: 'WAL',
          synchronous: 'NORMAL',
          cache_size: -64000, // 64MB cache
          temp_store: 'MEMORY',
          mmap_size: 268435456, // 256MB memory-mapped I/O
          busy_timeout: 30000
        }
      })
    }),

    // Rate limiting and throttling
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'short',
          ttl: 1000, // 1 second
          limit: configService.get<number>('MDM_RATE_LIMIT_SHORT', 10)
        },
        {
          name: 'medium',
          ttl: 10000, // 10 seconds
          limit: configService.get<number>('MDM_RATE_LIMIT_MEDIUM', 50)
        },
        {
          name: 'long',
          ttl: 60000, // 1 minute
          limit: configService.get<number>('MDM_RATE_LIMIT_LONG', 200)
        }
      ]
    }),

    // Event system for asynchronous processing
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false
    }),

    // JWT authentication
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('MDM_JWT_SECRET', 'mdm-super-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('MDM_JWT_EXPIRES_IN', '24h'),
          issuer: 'mdm-platform',
          audience: 'mdm-clients'
        },
        verifyOptions: {
          issuer: 'mdm-platform',
          audience: 'mdm-clients'
        }
      }),
      global: true
    }),

    // Passport authentication strategies
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false
    }),

    // Health checks and monitoring
    TerminusModule,

    // Feature modules
    DeviceModule,
    PolicyModule,
    ApplicationModule,
    SecurityModule,
    AssetModule,
    ComplianceModule,
    MobileSecurityModule,
    IdentityModule,
    NotificationModule
  ],
  controllers: [
    MdmHealthController
  ],
  providers: [
    // Core services
    MdmLogger,
    MdmDatabaseService,
    MdmMetricsService,
    MdmCacheService,

    // Global error handling
    {
      provide: 'APP_INTERCEPTOR',
      useClass: MdmSecurityMiddleware
    }
  ],
  exports: [
    MdmLogger,
    MdmDatabaseService,
    MdmMetricsService,
    MdmCacheService
  ]
})
export class MdmModule implements NestModule {
  /**
   * Configure middleware pipeline
   * Implements comprehensive request processing with security and monitoring
   */
  configure(consumer: MiddlewareConsumer): void {
    // Global middleware pipeline
    consumer
      .apply(
        MdmLoggingMiddleware,
        MdmSecurityMiddleware,
        ParlantValidationMiddleware
      )
      .forRoutes('*');
  }
}