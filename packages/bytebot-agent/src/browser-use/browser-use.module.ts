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
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigurationModule } from '../config/config.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { SecurityMonitoringModule } from '../security/security-monitoring.module';

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
  imports: [
    ConfigurationModule,
    AuthModule,
    DatabaseModule,
    SecurityMonitoringModule,
    ThrottlerModule, // Import for AdvancedThrottleGuard access to global throttler providers
    CacheModule.register(),
  ],
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
    {
      provide: 'REDIS_CLIENT',
      useValue: null, // Mock Redis client for development
    },
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
