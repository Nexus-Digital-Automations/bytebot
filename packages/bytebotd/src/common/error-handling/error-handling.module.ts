import { Module, Global } from '@nestjs/common';import { AutomationErrorHandlerService } from './automation-error-handler.service';import { ErrorRecoveryInterceptor } from './error-recovery.interceptor';import { ErrorAnalyticsController } from './error-analytics.controller';

/**
 * Error Handling Module
 *
 * Provides comprehensive error handling and recovery capabilities for all automation modules including:
 * - Centralized error classification and categorization
 * - Intelligent retry mechanisms with exponential backoff
 * - Circuit breaker patterns for failing services
 * - Graceful degradation strategies
 * - Error correlation and tracking across operations
 * - Recovery action orchestration
 * - Error analytics and reporting
 * - Integration with monitoring and alerting systems
 *
 * This module is marked as Global to provide error handling services
 * across all automation modules without explicit imports.
 */
@Global()
@Module({
  providers: [
    AutomationErrorHandlerService,
    ErrorRecoveryInterceptor,
  ],
  controllers: [ErrorAnalyticsController],
  exports: [
    AutomationErrorHandlerService,
    ErrorRecoveryInterceptor,
  ],
})
export class ErrorHandlingModule {}