/**
 * Browser-Use API Module
 *
 * Provides comprehensive REST API endpoints for browser automation integration
 * with the browser-use framework, following local-only architecture patterns.
 *
 * Features:
 * - Browser task execution and management
 * - Session lifecycle management
 * - Screenshot capture and DOM interaction
 * - Form automation and data extraction
 * - Real-time status monitoring
 * - Results retrieval and export
 *
 * Architecture:
 * - Local-only deployment (no cloud dependencies)
 * - Docker Compose compatible
 * - Enterprise-grade security and validation
 * - Integration with existing bytebot authentication
 *
 * @module BrowserUseModule
 */

import { Module } from '@nestjs/common';
import { ConfigurationModule } from '../config/config.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';

import { BrowserUseController } from './browser-use.controller';
import { BrowserUseService } from './browser-use.service';
import { BrowserSessionService } from './services/browser-session.service';
import { BrowserTaskService } from './services/browser-task.service';
import { BrowserScreenshotService } from './services/browser-screenshot.service';
import { BrowserDomService } from './services/browser-dom.service';
import { BrowserFormService } from './services/browser-form.service';
import { BrowserDataService } from './services/browser-data.service';
import { BrowserMonitoringService } from './services/browser-monitoring.service';
import { BrowserResultsService } from './services/browser-results.service';

@Module({
  imports: [ConfigurationModule, AuthModule, DatabaseModule],
  controllers: [BrowserUseController],
  providers: [
    BrowserUseService,
    BrowserSessionService,
    BrowserTaskService,
    BrowserScreenshotService,
    BrowserDomService,
    BrowserFormService,
    BrowserDataService,
    BrowserMonitoringService,
    BrowserResultsService,
  ],
  exports: [
    BrowserUseService,
    BrowserSessionService,
    BrowserTaskService,
    BrowserScreenshotService,
    BrowserDomService,
    BrowserFormService,
    BrowserDataService,
    BrowserMonitoringService,
    BrowserResultsService,
  ],
})
export class BrowserUseModule {}
