/**
 * Document Automation Module
 * Main module for enterprise document automation system
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { DocumentGenerationController } from './controllers/document-generation.controller';
import { TemplateManagementController } from './controllers/template-management.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { BatchProcessingController } from './controllers/batch-processing.controller';
import { DocumentAssemblyController } from './controllers/document-assembly.controller';

// Core Services
import { DocumentEngineService } from './core/document-engine.service';

// Business Services
import { TemplateProcessor } from './services/template-processor.service';
import { FormatConverter } from './services/format-converter.service';
import { ValidationService } from './services/validation.service';
import { MetricsCollector } from './services/metrics-collector.service';
import { AuditLogger } from './services/audit-logger.service';
import { TemplateManagementService } from './services/template-management.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { BatchProcessingService } from './services/batch-processing.service';
import { DocumentAssemblyService } from './services/document-assembly.service';
import { DataIntegrationService } from './services/data-integration.service';

// Shared module imports
// import { SharedModule } from '@bytebot/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env']
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300, // 5 minutes default TTL
      max: 1000 // Maximum number of items in cache
    }),
    EventEmitterModule.forRoot({
      // Configure event emitter for real-time updates
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false
    }),
    ScheduleModule.forRoot()
    // SharedModule
  ],
  controllers: [
    DocumentGenerationController,
    TemplateManagementController,
    WorkflowController,
    BatchProcessingController,
    DocumentAssemblyController
  ],
  providers: [
    // Core Engine
    DocumentEngineService,

    // Processing Services
    TemplateProcessor,
    FormatConverter,
    ValidationService,
    MetricsCollector,
    AuditLogger,

    // Business Logic Services
    TemplateManagementService,
    WorkflowEngineService,
    BatchProcessingService,
    DocumentAssemblyService,
    DataIntegrationService

    // TODO: Add database providers when TypeORM is configured
    // TODO: Add authentication guards and middleware
    // TODO: Add PARLANT integration services
  ],
  exports: [
    DocumentEngineService,
    TemplateManagementService,
    WorkflowEngineService,
    BatchProcessingService,
    DocumentAssemblyService,
    DataIntegrationService
  ]
})
export class DocumentAutomationModule {
  constructor() {
    console.log('Document Automation Module initialized successfully');
  }
}