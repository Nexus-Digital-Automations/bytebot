import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BrowserUseController } from './browser-use.controller';
import { ParlantValidatedBrowserUseController } from './parlant-validated-browser-use.controller';
import { BrowserUseService } from './browser-use.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserTaskService } from './browser-task.service';
import { BrowserAsyncJobService } from './browser-async-job.service';

// Parlant-validated browser services imports
import { ParlantModule } from '../parlant/parlant.module';
import { ParlantValidatedBrowserUseService } from './parlant-validated-browser-use.service';
import { ParlantValidatedBrowserSessionService } from './parlant-validated-browser-session.service';
import { ParlantValidatedBrowserTaskService } from './parlant-validated-browser-task.service';
import { ParlantValidatedBrowserAsyncJobService } from './parlant-validated-browser-async-job.service';

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
    // Import Parlant module for conversational AI validation
    ParlantModule,
  ],
  controllers: [
    BrowserUseController,
    // Parlant-validated browser controller with conversational AI validation
    ParlantValidatedBrowserUseController,
  ],
  providers: [
    // Original browser services
    BrowserUseService,
    BrowserSessionService,
    BrowserTaskService,
    BrowserAsyncJobService,
    
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
    BrowserTaskService,
    BrowserAsyncJobService,
    
    // Export Parlant-validated services as primary interfaces
    ParlantValidatedBrowserUseService,
    ParlantValidatedBrowserSessionService,
    ParlantValidatedBrowserTaskService,
    ParlantValidatedBrowserAsyncJobService,
  ],
})
export class BrowserUseModule {}
