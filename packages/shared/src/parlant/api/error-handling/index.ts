/**
 * PARLANT Phase 1 - Error Handling System Exports
 *
 * Main export file for the comprehensive PARLANT error handling system.
 * Provides all components needed for conversational error handling with
 * enterprise-grade recovery, analytics, and natural language communication.
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 Implementation Team
 */

// ===== CONVERSATIONAL ERROR HANDLER =====
export {
  ConversationalErrorHandler,
  ErrorNaturalLanguageProcessor,
  ConversationalErrorContext,
  ConversationalErrorSeverity,
  ConversationalErrorCategory,
  ConversationalGuidance,
  ErrorRecoveryRecommendation,
  ConversationalErrorResponse,
  RecoveryStage
} from './conversational-error-handler';

// ===== ADVANCED RECOVERY FRAMEWORK =====
export {
  AdvancedRecoveryFramework,
  RecoveryWorkflowEngine,
  AutomatedRecoveryStrategies,
  RecoveryAttemptResult,
  RecoveryWorkflow,
  RecoveryWorkflowStage,
  RecoveryStrategy,
  RecoveryImplementation,
  UserAction,
  StageUserGuidance,
  WorkflowTrigger,
  RecoverySession
} from './advanced-recovery-framework';

// ===== NATURAL LANGUAGE COMMUNICATION =====
export {
  NaturalLanguageCommunicationSystem,
  MessageGenerationEngine,
  ContextualHelpEngine,
  ProgressiveDisclosureEngine,
  CommunicationLocale,
  UserCommunicationProfile,
  ContextualHelpResource,
  TroubleshootingStep,
  ProgressiveDisclosureConfig,
  CommunicationResult
} from './natural-language-communication';

// ===== ENTERPRISE ERROR MANAGEMENT =====
export {
  EnterpriseErrorManagementSystem,
  EnterpriseErrorLogger,
  ErrorPatternRecognitionEngine,
  ErrorAnalyticsDashboardEngine,
  EnterpriseErrorLogEntry,
  ErrorPattern,
  ErrorAnalyticsDashboard
} from './enterprise-error-management';

// ===== PARLANT ERROR HANDLING MODULE =====

import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { ConversationalErrorHandler, ErrorNaturalLanguageProcessor } from './conversational-error-handler';
import { AdvancedRecoveryFramework, RecoveryWorkflowEngine, AutomatedRecoveryStrategies } from './advanced-recovery-framework';
import { NaturalLanguageCommunicationSystem, MessageGenerationEngine, ContextualHelpEngine, ProgressiveDisclosureEngine } from './natural-language-communication';
import { EnterpriseErrorManagementSystem, EnterpriseErrorLogger, ErrorPatternRecognitionEngine, ErrorAnalyticsDashboardEngine } from './enterprise-error-management';

/**
 * PARLANT Error Handling Module
 *
 * Provides comprehensive error handling capabilities including:
 * - Conversational error interpretation and guidance
 * - Multi-stage automated recovery workflows
 * - Natural language communication with progressive disclosure
 * - Enterprise-grade logging, analytics, and pattern recognition
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Configure event emitter for error handling events
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
      ignoreErrors: false
    })
  ],
  providers: [
    // Core Conversational Error Handling
    ConversationalErrorHandler,
    ErrorNaturalLanguageProcessor,

    // Advanced Recovery Framework
    AdvancedRecoveryFramework,
    RecoveryWorkflowEngine,
    AutomatedRecoveryStrategies,

    // Natural Language Communication
    NaturalLanguageCommunicationSystem,
    MessageGenerationEngine,
    ContextualHelpEngine,
    ProgressiveDisclosureEngine,

    // Enterprise Error Management
    EnterpriseErrorManagementSystem,
    EnterpriseErrorLogger,
    ErrorPatternRecognitionEngine,
    ErrorAnalyticsDashboardEngine
  ],
  exports: [
    // Export main orchestrators for external use
    ConversationalErrorHandler,
    AdvancedRecoveryFramework,
    NaturalLanguageCommunicationSystem,
    EnterpriseErrorManagementSystem,

    // Export individual components for fine-grained control
    ErrorNaturalLanguageProcessor,
    RecoveryWorkflowEngine,
    AutomatedRecoveryStrategies,
    MessageGenerationEngine,
    ContextualHelpEngine,
    ProgressiveDisclosureEngine,
    EnterpriseErrorLogger,
    ErrorPatternRecognitionEngine,
    ErrorAnalyticsDashboardEngine
  ]
})
export class ParlantErrorHandlingModule {}

// ===== CONVENIENCE FACTORY FUNCTIONS =====

/**
 * Create a fully configured PARLANT error handling system
 */
export function createParlantErrorHandlingSystem() {
  return {
    ConversationalErrorHandler,
    AdvancedRecoveryFramework,
    NaturalLanguageCommunicationSystem,
    EnterpriseErrorManagementSystem
  };
}

/**
 * Create a basic error handling configuration for simple use cases
 */
export function createBasicErrorHandling() {
  return {
    ConversationalErrorHandler,
    ErrorNaturalLanguageProcessor
  };
}

/**
 * Create an enterprise error management configuration
 */
export function createEnterpriseErrorManagement() {
  return {
    EnterpriseErrorManagementSystem,
    EnterpriseErrorLogger,
    ErrorPatternRecognitionEngine,
    ErrorAnalyticsDashboardEngine
  };
}

/**
 * Create a recovery-focused configuration
 */
export function createRecoveryFramework() {
  return {
    AdvancedRecoveryFramework,
    RecoveryWorkflowEngine,
    AutomatedRecoveryStrategies
  };
}

/**
 * Create a communication-focused configuration
 */
export function createCommunicationSystem() {
  return {
    NaturalLanguageCommunicationSystem,
    MessageGenerationEngine,
    ContextualHelpEngine,
    ProgressiveDisclosureEngine
  };
}

// ===== TYPE DEFINITIONS FOR EXTERNAL INTEGRATIONS =====

/**
 * Main PARLANT error handling facade interface
 */
export interface ParlantErrorHandlingFacade {
  /**
   * Process an error with full PARLANT capabilities
   */
  processError(
    error: Error,
    context: ConversationalErrorContext,
    userProfile?: UserCommunicationProfile
  ): Promise<{
    conversationalResponse: ConversationalErrorResponse;
    recoverySession: RecoverySession;
    communication: CommunicationResult;
    logEntryId: string;
  }>;

  /**
   * Continue an active recovery session
   */
  continueRecovery(sessionId: string): Promise<RecoveryAttemptResult | null>;

  /**
   * Get comprehensive analytics for a time period
   */
  getAnalytics(timeRange: { start: Date; end: Date }): Promise<ErrorAnalyticsDashboard>;

  /**
   * Get detected error patterns
   */
  getPatterns(): Promise<ErrorPattern[]>;
}

/**
 * Configuration options for PARLANT error handling
 */
export interface ParlantErrorHandlingConfig {
  /** Enable/disable different components */
  components: {
    conversationalHandler: boolean;
    recoveryFramework: boolean;
    communicationSystem: boolean;
    enterpriseManagement: boolean;
  };

  /** Performance settings */
  performance: {
    maxProcessingTime: number;
    maxRecoveryAttempts: number;
    cacheSize: number;
  };

  /** Analytics settings */
  analytics: {
    enablePatternRecognition: boolean;
    retentionPeriod: number;
    enablePredictions: boolean;
  };

  /** Communication settings */
  communication: {
    defaultLocale: CommunicationLocale;
    enableProgressiveDisclosure: boolean;
    maxResourcesPerCategory: number;
  };
}

/**
 * Default PARLANT configuration
 */
export const DEFAULT_PARLANT_CONFIG: ParlantErrorHandlingConfig = {
  components: {
    conversationalHandler: true,
    recoveryFramework: true,
    communicationSystem: true,
    enterpriseManagement: true
  },
  performance: {
    maxProcessingTime: 100, // milliseconds
    maxRecoveryAttempts: 5,
    cacheSize: 1000
  },
  analytics: {
    enablePatternRecognition: true,
    retentionPeriod: 365, // days
    enablePredictions: true
  },
  communication: {
    defaultLocale: {
      language: 'en',
      region: 'US',
      culturalStyle: 'DIRECT',
      technicalLevel: 'MODERATE'
    },
    enableProgressiveDisclosure: true,
    maxResourcesPerCategory: 5
  }
};

// ===== VERSION INFORMATION =====

/**
 * PARLANT Phase 1 version information
 */
export const PARLANT_VERSION = {
  major: 1,
  minor: 0,
  patch: 0,
  phase: 'PHASE_1',
  buildDate: new Date('2024-01-01'),
  features: [
    'CONVERSATIONAL_ERROR_HANDLING',
    'NATURAL_LANGUAGE_PROCESSING',
    'MULTI_STAGE_RECOVERY',
    'ENTERPRISE_ANALYTICS',
    'PATTERN_RECOGNITION',
    'PROGRESSIVE_DISCLOSURE',
    'AUTOMATED_RECOVERY_STRATEGIES'
  ]
} as const;