import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ComputerUseModule } from './computer-use/computer-use.module';
import { InputTrackingModule } from './input-tracking/input-tracking.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BytebotMcpModule } from './mcp';
import { CuaIntegrationModule } from './cua-integration/cua-integration.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { CacheModule } from './cache/cache.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { CompressionInterceptor } from './common/interceptors/compression.interceptor';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { MetricsService } from './metrics/metrics.service';
import { CacheService } from './cache/cache.service';
import { CacheKeyGenerator } from './cache/cache-key.generator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Explicitly makes it globally available
    }),
    ServeStaticModule.forRoot({
      rootPath: '/opt/noVNC',
      serveRoot: '/novnc',
    }),
    ComputerUseModule,
    InputTrackingModule,
    BytebotMcpModule,
    CuaIntegrationModule, // C/ua Framework Integration
    HealthModule, // Enterprise health monitoring with Kubernetes support
    MetricsModule, // Prometheus metrics collection
    CacheModule, // Redis-based caching infrastructure
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Performance monitoring interceptor (highest priority)
    {
      provide: APP_INTERCEPTOR,
      useFactory: (metricsService: MetricsService) =>
        new PerformanceInterceptor(metricsService),
      inject: [MetricsService],
    },
    // Cache interceptor for API response caching
    {
      provide: APP_INTERCEPTOR,
      useFactory: (
        cacheService: CacheService,
        keyGenerator: CacheKeyGenerator,
        metricsService: MetricsService,
      ) => new CacheInterceptor(cacheService, keyGenerator, metricsService),
      inject: [CacheService, CacheKeyGenerator, MetricsService],
    },
    // Compression interceptor for response optimization
    {
      provide: APP_INTERCEPTOR,
      useFactory: (metricsService: MetricsService) =>
        new CompressionInterceptor(metricsService),
      inject: [MetricsService],
    },
    // Global logging interceptor with correlation IDs (lowest priority)
    {
      provide: APP_INTERCEPTOR,
      useFactory: (metricsService: MetricsService) =>
        new LoggingInterceptor(metricsService),
      inject: [MetricsService],
    },
  ],
})
export class AppModule {}
