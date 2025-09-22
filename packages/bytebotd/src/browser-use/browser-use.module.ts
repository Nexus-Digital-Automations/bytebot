import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { BrowserUseService } from './browser-use.service';
import { BrowserInteractionService } from './browser-interaction.service';
import { BrowserSessionService } from './browser-session.service';
import { PythonIntegrationService } from './python-integration.service';
import { ErrorHandlerService } from './error-handler.service';
import { BrowserUseController } from './browser-use.controller';
import { BrowserUseErrorClassificationService } from './errors/browser-use-error-classification.service';
import { BrowserUseErrorInterceptor } from './errors/browser-use-error.interceptor';
import { BrowserUseExceptionFilter } from './errors/browser-use-exception.filter';
import { BrowserUseMonitoringService } from './errors/browser-use-monitoring.service';

/**
 * Browser-Use Module with Comprehensive Error Handling
 *
 * Integrates all Browser-Use API services with comprehensive error handling,
 * monitoring, and analytics capabilities for enterprise-grade browser automation.
 *
 * Features:
 * - Browser automation services (session, interaction, task management)
 * - Comprehensive error classification and handling
 * - Standardized error response formatting
 * - Real-time monitoring and analytics
 * - Circuit breaker patterns and recovery strategies
 * - Performance tracking and SLA monitoring
 * - Security incident detection and reporting
 * - Automated alerting and notifications
 *
 * This module is marked as Global to provide error handling services
 * across all browser automation endpoints without explicit imports.
 */
@Global()
@Module({
  controllers: [
    BrowserUseController,
  ],
  providers: [
    // Core browser automation services
    BrowserUseService,
    BrowserInteractionService,
    BrowserSessionService,

    // Python integration and framework communication
    PythonIntegrationService,

    // Error handling and monitoring services
    BrowserUseErrorClassificationService,
    BrowserUseMonitoringService,
    BrowserUseExceptionFilter,
    ErrorHandlerService,

    // Global error interceptor for all Browser-Use endpoints
    {
      provide: APP_INTERCEPTOR,
      useClass: BrowserUseErrorInterceptor,
    },

    // Global exception filter for standardized error responses
    {
      provide: APP_FILTER,
      useClass: BrowserUseExceptionFilter,
    },
  ],
  exports: [
    // Export core services for use in other modules
    BrowserUseService,
    BrowserInteractionService,
    BrowserSessionService,
    PythonIntegrationService,

    // Export error handling services for integration
    BrowserUseErrorClassificationService,
    BrowserUseMonitoringService,
    BrowserUseExceptionFilter,
    ErrorHandlerService,
  ],
})
export class BrowserUseModule {}