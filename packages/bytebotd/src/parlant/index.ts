/**
 * Parlant Integration Module Exports - MAXIMUM IMPLEMENTATION
 * 
 * Comprehensive exports for Parlant conversational AI integration with AIgent.
 * Provides function-level validation wrapper services, controllers, and utilities
 * for implementing maximum Parlant integration across all Bytebot functionality.
 * 
 * Features:
 * - Core Parlant integration service for conversational validation
 * - Validated service wrappers for all critical Bytebot functions
 * - Enhanced controllers with conversational validation endpoints
 * - Configuration utilities and health monitoring
 * - Enterprise-grade audit and compliance features
 * 
 * Architecture: Modular design supporting maximum integration mandate
 * Security: Enterprise-grade conversational authentication and validation
 * Performance: Optimized validation pipeline with sub-1000ms targets
 */

// ===== CORE SERVICES =====

export { ParlantIntegrationService } from './parlant-integration.service';
export { ParlantValidatedComputerUseService } from './parlant-validated-computer-use.service';

// ===== CONTROLLERS =====

export { ParlantComputerUseController } from './parlant-computer-use.controller';

// ===== MODULES =====

export { ParlantModule } from './parlant.module';
export { parlantConfigFactory } from './parlant.module';

// ===== INTERFACES AND TYPES =====

// Core integration interfaces
export type {
  ParlantConversationContext,
  ConversationEntry,
  ParlantValidationRequest,
  ParlantValidationResponse,
  ExecutionContext,
} from './parlant-integration.service';

// Service-specific interfaces
export type {
  ComputerActionValidationContext,
  ComputerActionAuditEntry,
  SystemStateInfo,
  ActionRiskAssessment,
} from './parlant-validated-computer-use.service';

// Controller DTOs
export type {
  ParlantComputerActionDto,
  ParlantValidationResponseDto,
  ParlantComputerActionResultDto,
  ParlantSystemStatusDto,
} from './parlant-computer-use.controller';

// Module configuration
export type {
  ParlantModuleConfig,
  ParlantHealthStatus,
} from './parlant.module';

// ===== ENUMS =====

export { RiskLevel } from './parlant-integration.service';

// ===== EXCEPTIONS =====

export { ConversationalValidationError } from './parlant-integration.service';

// ===== CONFIGURATION =====

export { 
  defaultParlantConfig,
  PARLANT_ENVIRONMENT_VARIABLES,
} from './parlant.module';

// ===== UTILITIES =====

/**
 * Parlant integration utility functions
 */
export const ParlantUtils = {
  /**
   * Generate operation ID for tracking
   */
  generateOperationId: (prefix: string = 'parlant'): string => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  },

  /**
   * Validate conversation context structure
   */
  validateConversationContext: (context: any): boolean => {
    return !!(context?.userId && 
             context.sessionId && 
             Array.isArray(context.conversationHistory));
  },

  /**
   * Sanitize sensitive data from parameters
   */
  sanitizeSensitiveData: (params: Record<string, any>): Record<string, any> => {
    const sanitized = { ...params };
    
    // Remove or mask sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'credential'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    // Truncate long text fields
    if (sanitized.text && typeof sanitized.text === 'string' && sanitized.text.length > 200) {
      sanitized.text = sanitized.text.substring(0, 200) + '...';
    }
    
    return sanitized;
  },

  /**
   * Format validation response for API output
   */
  formatValidationResponse: (response: any): any => {
    return {
      approved: response.approved,
      reasoning: response.reasoning,
      confidence: response.confidence,
      timestamp: response.validationTimestamp,
      conversationId: response.conversationId,
      ...(response.suggestedAlternatives && { suggestedAlternatives: response.suggestedAlternatives }),
      ...(response.executionContext && { executionContext: response.executionContext }),
    };
  },

  /**
   * Calculate performance metrics
   */
  calculatePerformanceMetrics: (startTime: number, validationTime?: number): any => {
    const totalTime = Date.now() - startTime;
    return {
      totalTimeMs: totalTime,
      validationTimeMs: validationTime || 0,
      executionTimeMs: totalTime - (validationTime || 0),
      withinTarget: totalTime < 1000, // Sub-1000ms target
    };
  },

  /**
   * Generate audit log entry
   */
  generateAuditEntry: (operationId: string, action: string, result: string, details: any = {}): any => {
    return {
      operationId,
      action,
      result,
      timestamp: new Date(),
      details: ParlantUtils.sanitizeSensitiveData(details),
    };
  },
};

// ===== CONSTANTS =====

/**
 * Parlant integration constants
 */
export const PARLANT_CONSTANTS = {
  // Performance targets
  MAX_VALIDATION_TIME_MS: 1000,
  MAX_EXECUTION_TIME_MS: 30000,
  TARGET_CACHE_HIT_RATE: 0.85,
  
  // Risk level thresholds
  RISK_LEVELS: {
    MINIMAL: 'MINIMAL',
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  },
  
  // Validation confidence thresholds
  CONFIDENCE_THRESHOLDS: {
    AUTO_APPROVE: 0.9,
    MANUAL_REVIEW: 0.7,
    AUTO_DENY: 0.3,
  },
  
  // Cache configuration
  CACHE: {
    MAX_ENTRIES: 1000,
    DEFAULT_TTL_MS: 300000, // 5 minutes
    CLEANUP_INTERVAL_MS: 600000, // 10 minutes
  },
  
  // Audit configuration
  AUDIT: {
    MAX_HISTORY_ENTRIES: 1000,
    RETENTION_DAYS: 90,
    BATCH_SIZE: 100,
  },
  
  // Security configuration
  SECURITY: {
    MAX_FAILED_VALIDATIONS: 5,
    SUSPICIOUS_ACTIVITY_THRESHOLD: 3,
    SESSION_TIMEOUT_MS: 3600000, // 1 hour
  },
} as const;

// ===== VERSION INFO =====

/**
 * Parlant integration version information
 */
export const PARLANT_VERSION = {
  version: '1.0.0',
  implementation: 'MAXIMUM',
  features: [
    'Function-level conversational validation',
    'Enterprise-grade audit trails',
    'Real-time risk assessment',
    'Performance optimization with caching',
    'Multi-level security validation',
    'Context-aware intent analysis',
  ],
  compatibility: {
    aiAgent: '>=1.0.0',
    nestjs: '>=9.0.0',
    typescript: '>=4.5.0',
  },
  buildDate: new Date().toISOString(),
} as const;

// ===== DEFAULT EXPORT =====

import { ParlantIntegrationService } from './parlant-integration.service';
import { ParlantValidatedComputerUseService } from './parlant-validated-computer-use.service';
import { ParlantComputerUseController } from './parlant-computer-use.controller';
import { ParlantModule } from './parlant.module';
import { ConversationalValidationError } from './parlant-integration.service';

/**
 * Default export with all Parlant integration components
 */
export default {
  // Services
  ParlantIntegrationService,
  ParlantValidatedComputerUseService,
  
  // Controllers
  ParlantComputerUseController,
  
  // Modules
  ParlantModule,
  
  // Utilities
  ParlantUtils,
  
  // Constants
  PARLANT_CONSTANTS,
  PARLANT_VERSION,
  
  // Exceptions
  ConversationalValidationError,
};