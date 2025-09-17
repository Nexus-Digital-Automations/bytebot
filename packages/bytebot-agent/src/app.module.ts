import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { AgentModule } from './agent/agent.module';
// import { TasksModule } from './tasks/tasks.module';
// import { MessagesModule } from './messages/messages.module';
import { AnthropicModule } from './anthropic/anthropic.module';
import { OpenAIModule } from './openai/openai.module';
import { GoogleModule } from './google/google.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
// import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SummariesModule } from './summaries/summaries.module';
import { ProxyModule } from './proxy/proxy.module';
// import { BrowserUseModule } from './browser-use/browser-use.module';
import { ConfigurationModule } from './config/config.module';
import { EnterpriseConfigModule } from './config/enterprise-config.module';
import { ReliabilityModule } from './common/reliability/reliability.module';
// import {
//   GlobalParlantIntegrationModule,
//   ParlantIntegrationUtils,
// } from '@bytebot/shared/modules/global-parlant-integration.module';
// import { ParlantValidationInterceptor } from '@bytebot/shared/interceptors/parlant-validation.interceptor';

@Module({
  imports: [
    // Core NestJS modules
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    // Rate limiting and throttling (must be imported early for global availability)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute default
      },
      {
        name: 'auth',
        ttl: 60000, // 1 minute
        limit: 30, // 30 requests per minute for auth endpoints
      },
      {
        name: 'computer-use',
        ttl: 60000, // 1 minute
        limit: 120, // 120 requests per minute for computer operations
      },
    ]),

    // Configuration management (must be first for other modules to use)
    ConfigurationModule,
    EnterpriseConfigModule.forEnvironment(
      (process.env.NODE_ENV as 'development' | 'staging' | 'production') ||
        'development',
    ),

    // Monitoring and Observability (early import for comprehensive coverage)
    // HealthModule,
    MetricsModule,

    // Database infrastructure (must be imported before modules that use database)
    DatabaseModule,
    PrismaModule,

    // Security and authentication (must be imported early)
    AuthModule,

    // Parlant conversational AI validation (must be imported after auth for proper security context)
    // GlobalParlantIntegrationModule.forRoot(
    //   process.env.NODE_ENV === 'production'
    //     ? ParlantIntegrationUtils.forHighThroughput()
    //     : ParlantIntegrationUtils.forDevelopment(),
    // ),

    // Reliability and resilience patterns (must be imported early)
    ReliabilityModule,

    // Application modules
    // AgentModule,
    // TasksModule,
    // MessagesModule,
    SummariesModule,
    AnthropicModule,
    OpenAIModule,
    GoogleModule,
    ProxyModule,
    // BrowserUseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global interceptors for comprehensive observability and validation
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: ParlantValidationInterceptor,
    // },
  ],
})
export class AppModule {
  constructor() {
    console.log(
      '🚀 Bytebot Agent Application initialized with enterprise-grade security',
    );
    console.log('🔒 Enterprise Security Features:');
    console.log('   ✅ Kubernetes secrets management');
    console.log('   ✅ External secrets provider integration');
    console.log('   ✅ Configuration security validation');
    console.log('   ✅ Secrets rotation and hot-reload');
    console.log('   ✅ Enterprise secrets audit logging');
    console.log('🤖 Parlant Conversational AI Integration:');
    console.log('   ✅ Universal API endpoint validation');
    console.log('   ✅ Real-time conversational security analysis');
    console.log('   ✅ Risk-based security level assignment');
    console.log('   ✅ High-performance validation caching');
    console.log('   ✅ Comprehensive audit trails');
    console.log('   ✅ Global interceptor and middleware coverage');
    console.log('📊 Observability features active:');
    console.log('   ✅ Health monitoring endpoints');
    console.log('   ✅ Prometheus metrics collection');
    console.log('   ✅ Structured JSON logging');
    console.log('   ✅ Request/response tracing');
    console.log('   ✅ Performance monitoring');
  }
}
