import { Module } from '@nestjs/common';import { APP_INTERCEPTOR } from '@nestjs/core';import { ComputerUseModule } from './computer-use/computer-use.module';import { InputTrackingModule } from './input-tracking/input-tracking.module';import { ConfigModule } from '@nestjs/config';import { ServeStaticModule } from '@nestjs/serve-static';import { AppController } from './app.controller';import { AppService } from './app.service';import { BytebotMcpModule } from './mcp';import { HealthModule } from './health/health.module';import { MetricsModule } from './metrics/metrics.module';import { SecurityModule } from './common/security/security.module';import { AuthModule } from './auth/auth.module';import { LoggingInterceptor } from './common/interceptors/logging.interceptor';import { MetricsService } from './metrics/metrics.service';import { ErrorRecoveryInterceptor } from './common/error-handling/error-recovery.interceptor';import { ParlantModule } from './parlant/parlant.module';import { EnterpriseApiModule } from './enterprise-api/enterprise-api.module';import { FormAutomationModule } from './form-automation/form-automation.module';import { DataExtractionModule } from './data-extraction/data-extraction.module';import { WorkflowAutomationModule } from './workflow-automation/workflow-automation.module';import { FileManagementModule } from './file-management/file-management.module';import { ContentMonitoringModule } from './content-monitoring/content-monitoring.module';import { ErrorHandlingModule } from './common/error-handling/error-handling.module';import { AutomationTestingModule } from './automation-testing/automation-testing.module';import { BrowserUseModule } from './browser-use/browser-use.module';import { BrowserModule } from './browser/browser.module';@Module({imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Explicitly makes it globally available
    }),
    ServeStaticModule.forRoot({
      rootPath: '/opt/noVNC',serveRoot: '/novnc',
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
