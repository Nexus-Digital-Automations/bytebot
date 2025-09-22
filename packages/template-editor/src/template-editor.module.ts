/**
 * Template Editor Module
 * Main module for visual template editing and collaboration system
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

// Controllers
import { TemplateEditorController } from './controllers/template-editor.controller';

// Core Services
import { TemplateEditorService } from './core/template-editor.service';

// Business Services
import { VersionControlService } from './services/version-control.service';
import { CollaborationService } from './services/collaboration.service';
import { TemplateValidationService } from './services/template-validation.service';
import { TemplateRenderingService } from './services/template-rendering.service';
import { SnapshotService } from './services/snapshot.service';
import { DiffService } from './services/diff.service';
import { ImportExportService } from './services/import-export.service';

// WebSocket Gateways
import { CollaborationGateway } from './websockets/collaboration.gateway';

// Document Automation integration
import { DocumentAutomationModule } from '@bytebot/document-automation';

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
      // Configure event emitter for real-time collaboration
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false
    }),
    ScheduleModule.forRoot(),
    DocumentAutomationModule
  ],
  controllers: [
    TemplateEditorController
  ],
  providers: [
    // Core Services
    TemplateEditorService,

    // Business Logic Services
    VersionControlService,
    CollaborationService,
    TemplateValidationService,
    TemplateRenderingService,
    SnapshotService,
    DiffService,
    ImportExportService,

    // WebSocket Gateways
    CollaborationGateway

    // TODO: Add database providers when TypeORM is configured
    // TODO: Add authentication guards and middleware
    // TODO: Add PARLANT integration services
  ],
  exports: [
    TemplateEditorService,
    VersionControlService,
    CollaborationService,
    TemplateValidationService,
    TemplateRenderingService,
    SnapshotService,
    DiffService,
    ImportExportService
  ]
})
export class TemplateEditorModule {
  constructor() {
    console.log('Template Editor Module initialized successfully');
  }
}