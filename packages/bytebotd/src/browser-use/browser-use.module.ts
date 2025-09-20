import { Module } from '@nestjs/common';import { ConfigModule } from '@nestjs/config';import { EventEmitterModule } from '@nestjs/event-emitter';import { ScheduleModule } from '@nestjs/schedule';import { BrowserUseController } from './browser-use.controller';import { ParlantValidatedBrowserUseController } from './parlant-validated-browser-use.controller';import { EnhancedBrowserAutomationController } from './enhanced-browser-automation.controller';import { BrowserTaskExecutionController } from './browser-task-execution.controller';import { BrowserInteractionController } from './browser-interaction.controller';import { BrowserOrchestrationSessionController } from './browser-orchestration-session.controller';import { BrowserUseService } from './browser-use.service';import { BrowserSessionService } from './browser-session.service';import { BrowserOrchestrationSessionService } from './browser-orchestration-session.service';import { BrowserTaskService } from './browser-task.service';import { BrowserAsyncJobService } from './browser-async-job.service';import { BrowserTaskExecutionService } from './browser-task-execution.service';import { BrowserInteractionService } from './browser-interaction.service';import { EnhancedBrowserAutomationService } from './enhanced-browser-automation.service';import { MediaController } from './media.controller';import { MediaService } from './media.service';import { ExtractionController } from './extraction.controller';import { ExtractionService } from './extraction.service';import { ExtractionOrchestrationController } from './extraction-orchestration.controller';// Parlant-validated browser services importsimport { ParlantModule } from '../parlant/parlant.module';import { ParlantValidatedBrowserUseService } from './parlant-validated-browser-use.service';import { ParlantValidatedBrowserSessionService } from './parlant-validated-browser-session.service';import { ParlantValidatedBrowserTaskService } from './parlant-validated-browser-task.service';import { ParlantValidatedBrowserAsyncJobService } from './parlant-validated-browser-async-job.service';

/**
 * Browser-Use Module - MAXIMUM PARLANT INTEGRATION
 *
 * Provides comprehensive REST API endpoints for browser automation using the
 * browser-use Python library with MAXIMUM Parlant conversational AI validation.
 * Follows 100% local architecture with enterprise-grade conversational security.
 *
 * Core Features:
 * - Browser task execution and management with Parlant validation
 * - Session creation, management, and cleanup with conversational approval
 * - Screenshot capture and DOM manipulation with risk assessment
 * - Form automation and data extraction with user intent verification
 * - Comprehensive data extraction APIs (text, tables, links, images, structured data, XPath)
 * - Real-time status monitoring and logs with audit trails
 * - Results retrieval and export with compliance validation
 *
 * Security Features:
 * - Parlant conversational AI validation for ALL browser operations
 * - JWT authentication required with Parlant enhancement
 * - Role-based access control (Operator/Admin) with conversational verification
 * - Rate limiting and request validation with intelligent monitoring
 * - Comprehensive audit logging with conversation context
 * - Local file system security with Parlant approval workflows
 *
 * Parlant Integration:
 * - Function-level conversational validation for every browser operation
 * - Risk-based assessment and approval workflows
 * - Real-time user intent verification through natural language
 * - Complete audit trail for enterprise compliance
 * - Performance optimization with sub-1000ms validation targets
 */
@Module({
  imports: [
    ConfigModule,
    // Event emitter module for session lifecycle events
    EventEmitterModule.forRoot(),
    // Schedule module for periodic tasks
    ScheduleModule.forRoot(),
    // Import Parlant module for conversational AI validation
    ParlantModule,
  ],
  controllers: [
    BrowserUseController,
    // Parlant-validated browser controller with conversational AI validation
    ParlantValidatedBrowserUseController,
    // Enhanced browser automation controller with advanced features
    EnhancedBrowserAutomationController,
    // Browser task execution controller with specialized endpoints
    BrowserTaskExecutionController,
    // Browser interaction controller with individual DOM action endpoints
    BrowserInteractionController,
    // Browser orchestration session controller with advanced session coordination
    BrowserOrchestrationSessionController,
    // Media controller with screenshot and media management endpoints
    MediaController,
    // Data extraction controller with comprehensive extraction endpoints
    ExtractionController,
    // Extraction orchestration controller with distributed scraping and multi-source capabilities
    ExtractionOrchestrationController,
  ],
  providers: [
    // Original browser services
    BrowserUseService,
    BrowserSessionService,
    // Browser orchestration session service for advanced session coordination
    BrowserOrchestrationSessionService,
    BrowserTaskService,
    BrowserAsyncJobService,
    // Browser task execution service for specialized operations
    BrowserTaskExecutionService,
    // Browser interaction service for individual DOM actions
    BrowserInteractionService,
    // Enhanced browser automation service for advanced features
    EnhancedBrowserAutomationService,
    // Media service for screenshot and media management
    MediaService,
    // Data extraction service for comprehensive web scraping
    ExtractionService,

    // Parlant-validated browser services with conversational AI validation
    ParlantValidatedBrowserUseService,
    ParlantValidatedBrowserSessionService,
    ParlantValidatedBrowserTaskService,
    ParlantValidatedBrowserAsyncJobService,
  ],
  exports: [
    // Export original services for backward compatibility
    BrowserUseService,
    BrowserSessionService,
    // Export browser orchestration session service for advanced session coordination
    BrowserOrchestrationSessionService,
    BrowserTaskService,
    BrowserAsyncJobService,
    // Export browser task execution service
    BrowserTaskExecutionService,
    // Export browser interaction service
    BrowserInteractionService,
    // Export enhanced browser automation service
    EnhancedBrowserAutomationService,
    // Export media service
    MediaService,
    // Export data extraction service
    ExtractionService,

    // Export Parlant-validated services as primary interfaces
    ParlantValidatedBrowserUseService,
    ParlantValidatedBrowserSessionService,
    ParlantValidatedBrowserTaskService,
    ParlantValidatedBrowserAsyncJobService,
  ],
})
export class BrowserUseModule {}
