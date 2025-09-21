import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ComputerUseModule } from './computer-use/computer-use.module';
import { InputTrackingModule } from './input-tracking/input-tracking.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BytebotMcpModule } from './mcp';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { SecurityModule } from './common/security/security.module';
import { AuthModule } from './auth/auth.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsService } from './metrics/metrics.service';
import { ErrorRecoveryInterceptor } from './common/error-handling/error-recovery.interceptor';
import { ParlantModule } from './parlant/parlant.module';
import { EnterpriseApiModule } from './enterprise-api/enterprise-api.module';
import { FormAutomationModule } from './form-automation/form-automation.module';
import { DataExtractionModule } from './data-extraction/data-extraction.module';
import { WorkflowAutomationModule } from './workflow-automation/workflow-automation.module';
import { FileManagementModule } from './file-management/file-management.module';
import { ContentMonitoringModule } from './content-monitoring/content-monitoring.module';
import { ErrorHandlingModule } from './common/error-handling/error-handling.module';
import { AutomationTestingModule } from './automation-testing/automation-testing.module';
import { BrowserUseModule } from './browser-use/browser-use.module';
import { BrowserModule } from './browser/browser.module';
import { ParlantAuthModule, createEnvironmentConfig } from '../../shared/src/modules/parlant-auth.module';
import { HighPerformanceParlantModule } from '../../../../src/modules/high-performance-parlant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Explicitly makes it globally available
    }),
    ServeStaticModule.forRoot({
      rootPath: '/opt/noVNC',
      serveRoot: '/novnc',
    }),
    // PARLANT Authentication Module - Enhanced conversational AI authentication
    ParlantAuthModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const envConfig = createEnvironmentConfig();

        return {
          ...envConfig,
          // Override with specific configurations for AIgent integration
          enableConversationalAuth: configService.get<boolean>('PARLANT_AUTH_ENABLED', true),
          enableConversationalAuthz: configService.get<boolean>('PARLANT_AUTHZ_ENABLED', true),
          enableConversationalMFA: configService.get<boolean>('PARLANT_MFA_ENABLED', true),

          security: {
            jwtSecret: configService.get<string>('JWT_SECRET_HS256', 'bytebot-default-secret-change-in-production'),
            jwtExpiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
            auditLogging: configService.get<boolean>('PARLANT_AUDIT_LOGGING_ENABLED', true),
          },

          performance: {
            caching: configService.get<boolean>('PARLANT_CACHING_ENABLED', true),
            cacheTTL: configService.get<number>('PARLANT_CACHE_TTL', 300000),
            targetResponseTime: configService.get<number>('PARLANT_TARGET_RESPONSE_TIME', 500),
          },

          riskAssessment: {
            enabled: configService.get<boolean>('PARLANT_RISK_ASSESSMENT_ENABLED', true),
            thresholds: {
              low: configService.get<number>('PARLANT_RISK_LOW_THRESHOLD', 25),
              medium: configService.get<number>('PARLANT_RISK_MEDIUM_THRESHOLD', 50),
              high: configService.get<number>('PARLANT_RISK_HIGH_THRESHOLD', 75),
              critical: configService.get<number>('PARLANT_RISK_CRITICAL_THRESHOLD', 90),
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    SecurityModule, // Enterprise security framework for BytebotD
    AuthModule, // JWT authentication and RBAC authorization
    ErrorHandlingModule, // Comprehensive error handling and recovery system
    ComputerUseModule,
    InputTrackingModule,
    BytebotMcpModule,
    HealthModule, // Enterprise health monitoring with Kubernetes support
    MetricsModule, // Prometheus metrics collection
    ParlantModule, // MAXIMUM IMPLEMENTATION - Parlant conversational AI validation for ALL functions
    HighPerformanceParlantModule, // High-performance PARLANT integration with monitoring and optimization
    EnterpriseApiModule, // MAXIMUM IMPLEMENTATION - Enterprise API Gateway with universal Parlant validation
    // Automation API Modules - Comprehensive form automation and data extraction capabilities
    FormAutomationModule, // Form field detection, auto-filling, validation, and submission
    DataExtractionModule, // Structured data extraction from web pages with configurable patterns
    WorkflowAutomationModule, // Multi-step browser workflows with conditional logic and error recovery
    FileManagementModule, // File upload/download automation with validation and security scanning
    ContentMonitoringModule, // Page content monitoring with change detection and alert systems
    AutomationTestingModule, // Comprehensive testing suite for all automation APIs
    BrowserUseModule, // Browser automation with enhanced features and Parlant validation
    BrowserModule, // Dedicated browser session management with enterprise features
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
    // Global error recovery interceptor for automation operations
    {
      provide: APP_INTERCEPTOR,
      useClass: ErrorRecoveryInterceptor,
    },
  ],
})
export class AppModule {}
