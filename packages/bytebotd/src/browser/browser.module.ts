import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';
import { BrowserUseModule } from '../browser-use/browser-use.module';

/**
 * Browser Module - Dedicated Session Management
 *
 * Provides comprehensive browser session management capabilities with
 * enterprise-grade features including resource monitoring, health checks,
 * bulk operations, and advanced coordination.
 *
 * Key Features:
 * - Dedicated session lifecycle management endpoints
 * - Enhanced resource monitoring and health checks
 * - Bulk session operations for enterprise scalability
 * - Session coordination and conflict resolution
 * - Performance optimization and memory management
 * - Comprehensive audit logging and event tracking
 * - Integration with existing browser-use services
 *
 * Security Features:
 * - JWT authentication required for all endpoints
 * - Role-based access control (Operator/Admin)
 * - Resource usage monitoring and limits
 * - Session isolation and security validation
 * - Comprehensive audit trails
 * - Local-only operations (no cloud dependencies)
 *
 * Integration:
 * - Seamless integration with browser-use module
 * - Coordination with task execution services
 * - Performance metrics and monitoring
 * - Error recovery and fault tolerance
 */
@Module({
  imports: [
    ConfigModule,
    // Import browser-use module for session service integration
    BrowserUseModule,
  ],
  controllers: [
    // Dedicated browser session management controller
    SessionController,
  ],
  providers: [
    // Enhanced browser session management service
    SessionService,
  ],
  exports: [
    // Export session service for use by other modules
    SessionService,
  ],
})
export class BrowserModule {}