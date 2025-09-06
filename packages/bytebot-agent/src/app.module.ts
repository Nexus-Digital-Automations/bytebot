import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from './agent/agent.module';
import { TasksModule } from './tasks/tasks.module';
import { MessagesModule } from './messages/messages.module';
import { AnthropicModule } from './anthropic/anthropic.module';
import { OpenAIModule } from './openai/openai.module';
import { GoogleModule } from './google/google.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SummariesModule } from './summaries/summaries.modue';
import { ProxyModule } from './proxy/proxy.module';
import { ConfigurationModule } from './config/config.module';
import { ReliabilityModule } from './common/reliability/reliability.module';

@Module({
  imports: [
    // Core NestJS modules
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    // Configuration management (must be first for other modules to use)
    ConfigurationModule,

    // Monitoring and Observability (early import for comprehensive coverage)
    HealthModule,
    MetricsModule,

    // Database infrastructure (must be imported before modules that use database)
    DatabaseModule,
    PrismaModule,

    // Security and authentication (must be imported early)
    AuthModule,

    // Reliability and resilience patterns (must be imported early)
    ReliabilityModule,

    // Application modules
    AgentModule,
    TasksModule,
    MessagesModule,
    SummariesModule,
    AnthropicModule,
    OpenAIModule,
    GoogleModule,
    ProxyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global interceptors for comprehensive observability
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class AppModule {
  constructor() {
    console.log(
      '🚀 Bytebot Agent Application initialized with enterprise monitoring',
    );
    console.log('📊 Observability features active:');
    console.log('   ✅ Health monitoring endpoints');
    console.log('   ✅ Prometheus metrics collection');
    console.log('   ✅ Structured JSON logging');
    console.log('   ✅ Request/response tracing');
    console.log('   ✅ Performance monitoring');
  }
}
