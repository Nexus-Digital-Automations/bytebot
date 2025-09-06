/**
 * Database Module - Enterprise Database Configuration and Management
 * Provides optimized database connectivity, connection pooling, monitoring,
 * security, and comprehensive health checks for enterprise-grade Bytebot API platform
 */

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

// Core database services
import { DatabaseService } from './database.service';
import { ConnectionPoolConfig } from './connection-pool.config';
import { ConnectionPoolService } from './connection-pool.service';

// Health and monitoring services
import { DatabaseHealthService } from './health/database-health.service';
import { DatabaseMetricsService } from './metrics/database-metrics.service';

// Security services
import { DatabaseSecurityService } from './security/database-security.service';

// Interceptors
import { QueryLoggingInterceptor } from './interceptors/query-logging.interceptor';

// Guards and controllers
import { DatabaseHealthGuard } from '../common/guards/database-health.guard';
import { CircuitBreakerGuard } from '../common/guards/circuit-breaker.guard';
import { DatabaseHealthController } from './database-health.controller';

// External modules
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [DatabaseHealthController],
  providers: [
    // Core database services
    DatabaseService,
    ConnectionPoolConfig,
    ConnectionPoolService,

    // Health and monitoring services
    DatabaseHealthService,
    DatabaseMetricsService,

    // Security services
    DatabaseSecurityService,

    // Interceptors
    QueryLoggingInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useClass: QueryLoggingInterceptor,
    },

    // Guards
    DatabaseHealthGuard,
    CircuitBreakerGuard,
  ],
  exports: [
    // Core services
    DatabaseService,
    ConnectionPoolConfig,
    ConnectionPoolService,

    // Health and monitoring
    DatabaseHealthService,
    DatabaseMetricsService,

    // Security
    DatabaseSecurityService,

    // Interceptors
    QueryLoggingInterceptor,

    // Guards
    DatabaseHealthGuard,
    CircuitBreakerGuard,
  ],
})
export class DatabaseModule {}
