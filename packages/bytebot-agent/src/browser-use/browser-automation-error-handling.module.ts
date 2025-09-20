/**
 * Browser Automation Error Handling Module
 *
 * Comprehensive integration module that combines error classification,
 * recovery mechanisms, response formatting, monitoring, and graceful
 * degradation for a complete error handling framework.
 *
 * Features:
 * - Centralized error handling coordination
 * - Automatic integration between all components
 * - Configuration management
 * - Service orchestration
 * - Health monitoring and diagnostics
 */

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Core Services
import { BrowserAutomationRecoveryManager } from './recovery/browser-automation-recovery-manager';
import { BrowserAutomationMonitoringService } from './monitoring/browser-automation-monitoring.service';
import { BrowserAutomationDegradationManager } from './degradation/browser-automation-degradation-manager';

// Utility Classes
import { BrowserAutomationErrorClassifier } from './errors/browser-automation-error-classification';
import { BrowserAutomationResponseFormatter } from './response/browser-automation-response-formatter';

// Enhanced Exception Filter
import { BrowserUseExceptionFilter } from '../common/filters/browser-use-exception.filter';

// Main Orchestrator Service
import { BrowserAutomationErrorHandlingOrchestrator } from './browser-automation-error-handling.orchestrator';

/**
 * Configuration interface for the error handling module
 */
export interface BrowserAutomationErrorHandlingConfig {
  monitoring: {
    enabled: boolean;
    metricsRetentionHours: number;
    alertingEnabled: boolean;
    exportFormat: 'prometheus' | 'json' | 'csv';
    healthCheckIntervalSeconds: number;
  };
  recovery: {
    enabled: boolean;
    maxRetryAttempts: number;
    defaultBackoffStrategy: 'linear' | 'exponential' | 'fixed';
    circuitBreakerEnabled: boolean;
    circuitBreakerThreshold: number;
  };
  degradation: {
    enabled: boolean;
    autoActivation: boolean;
    errorRateThresholds: {
      minimal: number;
      moderate: number;
      severe: number;
      emergency: number;
    };
    resourceThresholds: {
      memoryPercent: number;
      cpuPercent: number;
    };
  };
  responses: {
    includeStackTrace: boolean;
    sanitizeSensitiveData: boolean;
    includeRecoveryInfo: boolean;
    correlationIdPrefix: string;
  };
  logging: {
    logLevel: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
    structuredLogging: boolean;
    includeErrorContext: boolean;
  };
}

/**
 * Default configuration for the error handling framework
 */
const DEFAULT_CONFIG: BrowserAutomationErrorHandlingConfig = {
  monitoring: {
    enabled: true,
    metricsRetentionHours: 24,
    alertingEnabled: true,
    exportFormat: 'json',
    healthCheckIntervalSeconds: 30
  },
  recovery: {
    enabled: true,
    maxRetryAttempts: 3,
    defaultBackoffStrategy: 'exponential',
    circuitBreakerEnabled: true,
    circuitBreakerThreshold: 5
  },
  degradation: {
    enabled: true,
    autoActivation: true,
    errorRateThresholds: {
      minimal: 0.05,
      moderate: 0.15,
      severe: 0.3,
      emergency: 0.5
    },
    resourceThresholds: {
      memoryPercent: 85,
      cpuPercent: 90
    }
  },
  responses: {
    includeStackTrace: false,
    sanitizeSensitiveData: true,
    includeRecoveryInfo: true,
    correlationIdPrefix: 'ba'
  },
  logging: {
    logLevel: 'INFO',
    structuredLogging: true,
    includeErrorContext: true
  }
};

@Global()
@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // Event emitter configuration
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false
    })
  ],
  providers: [
    // Core Services
    BrowserAutomationRecoveryManager,
    BrowserAutomationMonitoringService,
    BrowserAutomationDegradationManager,

    // Main Orchestrator
    BrowserAutomationErrorHandlingOrchestrator,

    // Utility Providers
    {
      provide: 'ERROR_CLASSIFIER',
      useClass: BrowserAutomationErrorClassifier
    },
    {
      provide: 'RESPONSE_FORMATTER',
      useClass: BrowserAutomationResponseFormatter
    },

    // Configuration Provider
    {
      provide: 'ERROR_HANDLING_CONFIG',
      useFactory: (configService: any) => {
        const config = configService.get('browserAutomationErrorHandling') || {};
        return { ...DEFAULT_CONFIG, ...config };
      },
      inject: ['ConfigService']
    },

    // Exception Filter
    BrowserUseExceptionFilter
  ],
  exports: [
    BrowserAutomationRecoveryManager,
    BrowserAutomationMonitoringService,
    BrowserAutomationDegradationManager,
    BrowserAutomationErrorHandlingOrchestrator,
    'ERROR_CLASSIFIER',
    'RESPONSE_FORMATTER',
    'ERROR_HANDLING_CONFIG',
    BrowserUseExceptionFilter
  ]
})
export class BrowserAutomationErrorHandlingModule {
  /**
   * Configure the module with custom settings
   */
  static forRoot(config?: Partial<BrowserAutomationErrorHandlingConfig>) {
    return {
      module: BrowserAutomationErrorHandlingModule,
      providers: [
        {
          provide: 'ERROR_HANDLING_CONFIG',
          useValue: { ...DEFAULT_CONFIG, ...config }
        }
      ]
    };
  }

  /**
   * Configure the module for feature modules
   */
  static forFeature() {
    return {
      module: BrowserAutomationErrorHandlingModule
    };
  }
}