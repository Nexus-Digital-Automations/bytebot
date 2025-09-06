/**
 * Reliability Module - Enterprise-Grade Reliability and Resilience Framework
 *
 * Central module that integrates all reliability patterns and services:
 * - Circuit Breaker Service
 * - Retry Service with Exponential Backoff
 * - Resilience Interceptor
 * - Graceful Shutdown Service
 * - Database Connection Reliability
 *
 * Provides comprehensive reliability infrastructure for the Bytebot API
 * according to research report specifications.
 *
 * @author Reliability & Resilience Specialist
 * @version 1.0.0
 * @since Bytebot API Hardening Phase 1
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';

// Services
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { RetryService } from '../services/retry.service';
import { ShutdownService } from '../services/shutdown.service';

// Guards and Interceptors
import { CircuitBreakerGuard } from '../guards/circuit-breaker.guard';
import { ResilienceInterceptor } from '../interceptors/resilience.interceptor';

/**
 * ReliabilityModule - Comprehensive reliability infrastructure
 *
 * Provides enterprise-grade reliability patterns including:
 * - Circuit breaker protection for external dependencies
 * - Retry logic with exponential backoff and jitter
 * - Request timeout and resilience handling
 * - Graceful shutdown procedures
 * - Database connection reliability
 *
 * This module is marked as @Global so reliability services are available
 * throughout the application without explicit imports.
 */
@Global()
@Module({
  imports: [
    ConfigModule, // For configuration injection
  ],
  providers: [
    // Core reliability services
    CircuitBreakerService,
    RetryService,
    ShutdownService,

    // Guards - Applied globally via APP_GUARD
    {
      provide: APP_GUARD,
      useClass: CircuitBreakerGuard,
    },

    // Interceptors - Applied globally via APP_INTERCEPTOR
    {
      provide: APP_INTERCEPTOR,
      useClass: ResilienceInterceptor,
    },
  ],
  exports: [
    // Export services for use in other modules
    CircuitBreakerService,
    RetryService,
    ShutdownService,
  ],
})
export class ReliabilityModule {
  constructor(
    private readonly shutdownService: ShutdownService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly retryService: RetryService,
  ) {
    // Register default cleanup tasks
    this.registerDefaultCleanupTasks();
  }

  /**
   * Register default cleanup tasks for graceful shutdown
   */
  private registerDefaultCleanupTasks(): void {
    // Circuit breaker cleanup
    this.shutdownService.registerCleanupTask(
      'circuit-breaker-cleanup',
      async () => {
        // Clean up circuit breaker state
        const circuits = this.circuitBreakerService.getAllCircuitMetrics();
        for (const circuit of circuits) {
          this.circuitBreakerService.resetCircuit(circuit.circuitName);
        }
      },
    );

    // Retry service cleanup
    this.shutdownService.registerCleanupTask(
      'retry-service-cleanup',
      async () => {
        // Clean up any pending retry operations
        // The retry service will handle this internally
      },
    );
  }
}
