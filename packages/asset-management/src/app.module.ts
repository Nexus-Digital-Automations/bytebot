import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

// Core modules
import { AssetModule } from './asset/asset.module';
import { VersionModule } from './version/version.module';
import { CollaborationModule } from './collaboration/collaboration.module';
import { SearchModule } from './search/search.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SecurityModule } from './security/security.module';
import { NotificationModule } from './notification/notification.module';

// Database configuration
import { databaseConfig } from './config/database.config';
import { appConfig } from './config/app.config';

/**
 * Root application module for Digital Asset Management System
 * Configures all core modules with enterprise-grade architecture
 */
@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Database configuration for local-only architecture
    TypeOrmModule.forRootAsync({
      useFactory: () => databaseConfig,
    }),

    // Event system for real-time features
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // Authentication modules
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'asset-management-jwt-secret',
      signOptions: { expiresIn: '24h' },
    }),

    // Core feature modules
    AssetModule,
    VersionModule,
    CollaborationModule,
    SearchModule,
    AnalyticsModule,
    SecurityModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}