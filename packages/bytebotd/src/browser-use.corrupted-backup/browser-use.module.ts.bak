import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BrowserUseController } from './browser-use.controller';
import { BrowserUseService } from './browser-use.service';
import { BrowserSessionService } from './browser-session.service';
import { BrowserTaskService } from './browser-task.service';
import { BrowserAsyncJobService } from './browser-async-job.service';

/**
 * Browser-Use Module - Local-Only Browser Automation Integration
 *
 * Provides comprehensive REST API endpoints for browser automation using the
 * browser-use Python library. Follows 100% local architecture with no cloud
 * dependencies except for AI services.
 *
 * Core Features:
 * - Browser task execution and management
 * - Session creation, management, and cleanup
 * - Screenshot capture and DOM manipulation
 * - Form automation and data extraction
 * - Real-time status monitoring and logs
 * - Results retrieval and export
 *
 * Security Features:
 * - JWT authentication required
 * - Role-based access control (Operator/Admin)
 * - Rate limiting and request validation
 * - Comprehensive audit logging
 * - Local file system security
 */
@Module({
  imports: [ConfigModule],
  controllers: [BrowserUseController],
  providers: [
    BrowserUseService,
    BrowserSessionService,
    BrowserTaskService,
    BrowserAsyncJobService,
  ],
  exports: [
    BrowserUseService,
    BrowserSessionService,
    BrowserTaskService,
    BrowserAsyncJobService,
  ],
})
export class BrowserUseModule {}
