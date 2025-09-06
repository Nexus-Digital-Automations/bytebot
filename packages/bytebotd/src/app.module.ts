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
import { SecurityModule } from './common/security/security.module';
import { AuthModule } from './auth/auth.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsService } from './metrics/metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Explicitly makes it globally available
    }),
    ServeStaticModule.forRoot({
      rootPath: '/opt/noVNC',
      serveRoot: '/novnc',
    }),
    SecurityModule, // Enterprise security framework for BytebotD
    AuthModule, // JWT authentication and RBAC authorization
    ComputerUseModule,
    InputTrackingModule,
    BytebotMcpModule,
    CuaIntegrationModule, // C/ua Framework Integration
    HealthModule, // Enterprise health monitoring with Kubernetes support
    MetricsModule, // Prometheus metrics collection
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global logging interceptor with correlation IDs
    {
      provide: APP_INTERCEPTOR,
      useFactory: (metricsService: MetricsService) =>
        new LoggingInterceptor(metricsService),
      inject: [MetricsService],
    },
  ],
})
export class AppModule {}
