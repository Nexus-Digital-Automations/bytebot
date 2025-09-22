/**
 * PARLANT Phase 1 - Integration Bridge
 *
 * Integration layer that connects the new conversational error handling system
 * with the existing PARLANT infrastructure and error filter.
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 Implementation Team
 */

import {
  Injectable,
  Logger,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException
} from '@nestjs/common';
import { Request, Response } from 'express';

import {
  ConversationalErrorHandler,
  ConversationalErrorContext,
  ConversationalErrorResponse
} from './conversational-error-handler';

import {
  AdvancedRecoveryFramework,
  RecoverySession
} from './advanced-recovery-framework';

import {
  NaturalLanguageCommunicationSystem,
  UserCommunicationProfile,
  CommunicationResult
} from './natural-language-communication';

import {
  EnterpriseErrorManagementSystem
} from './enterprise-error-management';

// Import existing PARLANT error handler for compatibility
import {
  ParlantErrorFilter,
  ParlantErrorResponse
} from '../../parlant-error-handler';

import { ConversationalValidationError } from '../../monitoring/parlant-integration.service';

// ===== INTEGRATION INTERFACES =====

/**
 * Enhanced PARLANT error response with Phase 1 capabilities
 */
export interface EnhancedParlantErrorResponse extends ParlantErrorResponse {
  /** Phase 1 conversational response */
  conversational?: ConversationalErrorResponse;

  /** Recovery session information */
  recoverySession?: {
    sessionId: string;
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
    availableActions: string[];
  };

  /** Natural language communication */
  communication?: CommunicationResult;

  /** Enterprise tracking */
  tracking?: {
    logEntryId: string;
    patternId?: string;
    analyticsEnabled: boolean;
  };

  /** Integration metadata */
  integration: {
    phase1Enabled: boolean;
    processingTime: number;
    version: string;
  };

  /** HTTP status code */
  statusCode: number;

  /** Metadata for tracking and analytics */
  metadata: {
    /** Error ID for tracking */
    errorId?: string;
    /** Request correlation ID */
    correlationId: string;
    /** Error occurrence timestamp */
    timestamp: string;
    [key: string]: any;
  };
}

/**
 * Integration configuration
 */
export interface ParlantIntegrationConfig {
  /** Enable Phase 1 features */
  enablePhase1: boolean;

  /** Fallback to legacy behavior on error */
  fallbackToLegacy: boolean;

  /** User profile resolver */
  userProfileResolver?: (context: ConversationalErrorContext) => Promise<UserCommunicationProfile | null>;

  /** Custom error context enhancer */
  contextEnhancer?: (req: Request, baseContext: ConversationalErrorContext) => ConversationalErrorContext;

  /** Response transformer */
  responseTransformer?: (response: EnhancedParlantErrorResponse) => any;
}

// ===== INTEGRATION BRIDGE =====

/**
 * Bridge between legacy PARLANT error handling and Phase 1 system
 */
@Injectable()
export class ParlantErrorHandlingBridge {
  private readonly logger = new Logger(ParlantErrorHandlingBridge.name);

  constructor(
    private readonly legacyFilter: ParlantErrorFilter,
    private readonly conversationalHandler: ConversationalErrorHandler,
    private readonly recoveryFramework: AdvancedRecoveryFramework,
    private readonly communicationSystem: NaturalLanguageCommunicationSystem,
    private readonly enterpriseManagement: EnterpriseErrorManagementSystem,
    private readonly config: ParlantIntegrationConfig
  ) {
    this.logger.log('ParlantErrorHandlingBridge initialized with Phase 1 capabilities');
  }

  /**
   * Process error with integrated Phase 1 and legacy support
   */
  async processErrorWithIntegration(
    error: Error,
    host: ArgumentsHost
  ): Promise<EnhancedParlantErrorResponse> {
    const startTime = Date.now();

    try {
      // Get request context
      const ctx = host.switchToHttp();
      const request = ctx.getRequest<Request>();

      // Create conversational error context
      const context = this.createErrorContext(request, error);

      if (this.config.enablePhase1) {
        return await this.processWithPhase1(error, context, host);
      } else {
        return await this.processWithLegacy(error, host);
      }
    } catch (integrationError) {
      this.logger.error('Integration processing failed, falling back to legacy', integrationError);

      if (this.config.fallbackToLegacy) {
        return await this.processWithLegacy(error, host);
      } else {
        throw integrationError;
      }
    }
  }

  /**
   * Process with Phase 1 capabilities
   */
  private async processWithPhase1(
    error: Error,
    context: ConversationalErrorContext,
    host: ArgumentsHost
  ): Promise<EnhancedParlantErrorResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Get legacy response for compatibility
      const legacyResponse = await this.getLegacyResponse(error, host);

      // Step 2: Process with conversational handler
      const conversationalResponse = await this.conversationalHandler.processError(error, context);

      // Step 3: Initiate recovery if appropriate
      let recoverySession: RecoverySession | null = null;
      if (this.shouldInitiateRecovery(conversationalResponse)) {
        const recoveryResult = await this.recoveryFramework.initiateRecovery(error, context);
        recoverySession = recoveryResult.session;
      }

      // Step 4: Generate communication
      let communication: CommunicationResult | null = null;
      const userProfile = await this.resolveUserProfile(context);
      if (userProfile) {
        communication = await this.communicationSystem.generateCommunication(
          error,
          context,
          userProfile,
          conversationalResponse.severity,
          conversationalResponse.category
        );
      }

      // Step 5: Enterprise management
      const managementResult = await this.enterpriseManagement.processError(
        error,
        context,
        conversationalResponse,
        recoverySession || undefined
      );

      // Step 6: Create enhanced response
      const enhancedResponse: EnhancedParlantErrorResponse = {
        ...legacyResponse,
        conversational: conversationalResponse,
        recovery: recoverySession ? {
          sessionId: recoverySession.sessionId,
          status: recoverySession.status,
          availableActions: this.extractAvailableActions(recoverySession)
        } : undefined,
        communication: communication || undefined,
        tracking: {
          logEntryId: managementResult.logEntryId,
          patternId: managementResult.patterns[0]?.patternId,
          analyticsEnabled: true
        },
        integration: {
          phase1Enabled: true,
          processingTime: Date.now() - startTime,
          version: '1.0.0'
        }
      };

      // Step 7: Transform response if configured
      if (this.config.responseTransformer) {
        return this.config.responseTransformer(enhancedResponse);
      }

      return enhancedResponse;
    } catch (phase1Error) {
      this.logger.error('Phase 1 processing failed', phase1Error);

      if (this.config.fallbackToLegacy) {
        return await this.processWithLegacy(error, host);
      } else {
        throw phase1Error;
      }
    }
  }

  /**
   * Process with legacy system only
   */
  private async processWithLegacy(
    error: Error,
    host: ArgumentsHost
  ): Promise<EnhancedParlantErrorResponse> {
    const startTime = Date.now();

    const legacyResponse = await this.getLegacyResponse(error, host);

    return {
      ...legacyResponse,
      integration: {
        phase1Enabled: false,
        processingTime: Date.now() - startTime,
        version: '1.0.0'
      }
    };
  }

  /**
   * Get legacy response for compatibility
   */
  private async getLegacyResponse(
    error: Error,
    host: ArgumentsHost
  ): Promise<ParlantErrorResponse> {
    // Use reflection to access legacy filter's internal methods
    // This is a simplified approach - in practice would need proper integration
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (error instanceof HttpException) {
      return {
        statusCode: error.getStatus(),
        timestamp: new Date().toISOString(),
        path: ctx.getRequest<Request>().url,
        method: ctx.getRequest<Request>().method,
        message: error.message,
        error: error.name,
        guidance: {
          explanation: 'Legacy error processing',
          immediateActions: [],
          alternatives: [],
          preventionTips: [],
          documentationLinks: []
        },
        conversationalResponse: {
          tone: 'PROFESSIONAL',
          complexity: 'MODERATE',
          supportLevel: 'STANDARD',
          personalizedSuggestions: [],
          contextualHelp: [],
          followUpQuestions: []
        },
        metadata: {
          errorId: `legacy_${Date.now()}`,
          processingTime: 0,
          retryable: false,
          escalationRequired: false,
          userImpact: 'LOW',
          systemImpact: 'MINIMAL'
        }
      };
    }

    return {
      statusCode: 500,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest<Request>().url,
      method: ctx.getRequest<Request>().method,
      message: 'Internal server error',
      error: 'InternalServerError',
      guidance: {
        explanation: 'An unexpected error occurred',
        immediateActions: [],
        alternatives: [],
        preventionTips: [],
        documentationLinks: []
      },
      conversationalResponse: {
        tone: 'PROFESSIONAL',
        complexity: 'MODERATE',
        supportLevel: 'STANDARD',
        personalizedSuggestions: [],
        contextualHelp: [],
        followUpQuestions: []
      },
      metadata: {
        errorId: `legacy_${Date.now()}`,
        processingTime: 0,
        retryable: false,
        escalationRequired: true,
        userImpact: 'HIGH',
        systemImpact: 'SIGNIFICANT'
      }
    };
  }

  /**
   * Create error context from request
   */
  private createErrorContext(request: Request, error: Error): ConversationalErrorContext {
    const baseContext: ConversationalErrorContext = {
      userId: this.extractUserId(request),
      sessionId: this.extractSessionId(request),
      userLanguage: this.extractUserLanguage(request),
      userExpertiseLevel: this.extractUserExpertiseLevel(request),
      endpoint: request.url,
      method: request.method as any,
      parameters: { ...request.params, ...request.query, ...request.body },
      headers: request.headers as Record<string, string>,
      timestamp: new Date(),
      requestId: this.extractRequestId(request)
    };

    // Apply custom context enhancer if configured
    if (this.config.contextEnhancer) {
      return this.config.contextEnhancer(request, baseContext);
    }

    return baseContext;
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: Request): string | undefined {
    return (request as any).user?.id ||
           request.headers['x-user-id'] as string ||
           undefined;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: Request): string | undefined {
    return request.headers['x-session-id'] as string ||
           (request as any).session?.id ||
           undefined;
  }

  /**
   * Extract user language from request
   */
  private extractUserLanguage(request: Request): string | undefined {
    return request.headers['accept-language']?.split(',')[0]?.split('-')[0] ||
           'en';
  }

  /**
   * Extract user expertise level from request
   */
  private extractUserExpertiseLevel(request: Request): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' | undefined {
    const level = request.headers['x-expertise-level'] as string;
    if (level && ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].includes(level.toUpperCase())) {
      return level.toUpperCase() as any;
    }
    return 'INTERMEDIATE'; // Default
  }

  /**
   * Extract request ID from request
   */
  private extractRequestId(request: Request): string {
    return request.headers['x-request-id'] as string ||
           `req_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Determine if recovery should be initiated
   */
  private shouldInitiateRecovery(response: ConversationalErrorResponse): boolean {
    // Don't initiate recovery for info-level messages
    if (response.severity === 'INFO') {
      return false;
    }

    // Always initiate for critical errors
    if (response.severity === 'CRITICAL') {
      return true;
    }

    // Initiate for errors with recovery recommendations
    return response.recoveryRecommendations.length > 0;
  }

  /**
   * Resolve user profile for communication
   */
  private async resolveUserProfile(context: ConversationalErrorContext): Promise<UserCommunicationProfile | null> {
    if (this.config.userProfileResolver) {
      return await this.config.userProfileResolver(context);
    }

    // Default profile based on context
    if (context.userId) {
      return {
        userId: context.userId,
        communicationStyle: 'DETAILED',
        learningStyle: 'EXAMPLES',
        expertiseLevels: {
          technical: context.userExpertiseLevel || 'INTERMEDIATE',
          domain: 'INTERMEDIATE',
          general: 'INTERMEDIATE'
        },
        locale: {
          language: context.userLanguage || 'en',
          culturalStyle: 'DIRECT',
          technicalLevel: 'MODERATE'
        },
        interactionHistory: {
          preferredSolutionTypes: [],
          commonErrorPatterns: [],
          successfulRecoveryMethods: [],
          feedbackPatterns: {
            helpfulnessRating: 4.0,
            clarityRating: 4.0,
            completenessRating: 4.0
          }
        }
      };
    }

    return null;
  }

  /**
   * Extract available actions from recovery session
   */
  private extractAvailableActions(session: RecoverySession): string[] {
    const actions: string[] = [];

    if (session.status === 'ACTIVE') {
      actions.push('continue_recovery');

      if (session.attempts.length === 0) {
        actions.push('start_recovery');
      }

      if (session.currentStage < session.workflow.stages.length - 1) {
        actions.push('next_stage');
      }

      actions.push('get_guidance', 'escalate', 'cancel');
    }

    return actions;
  }
}

// ===== ENHANCED EXCEPTION FILTER =====

/**
 * Enhanced exception filter that integrates Phase 1 capabilities
 */
@Catch()
@Injectable()
export class EnhancedParlantErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(EnhancedParlantErrorFilter.name);

  constructor(
    private readonly bridge: ParlantErrorHandlingBridge
  ) {
    this.logger.log('EnhancedParlantErrorFilter initialized');
  }

  async catch(exception: any, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    try {
      // Process error through integration bridge
      const errorResponse = await this.bridge.processErrorWithIntegration(exception, host);

      // Set appropriate status code
      const status = errorResponse.statusCode || 500;

      // Log error for monitoring
      this.logger.error(
        `Error processed: ${exception.message}`,
        {
          errorId: errorResponse.conversational?.errorId || errorResponse.metadata?.errorId,
          path: request.url,
          method: request.method,
          status,
          phase1Enabled: errorResponse.integration.phase1Enabled,
          processingTime: errorResponse.integration.processingTime
        }
      );

      // Send response
      response.status(status).json(errorResponse);

    } catch (filterError) {
      this.logger.error('Enhanced error filter failed', filterError);

      // Fallback response
      response.status(500).json({
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
        message: 'Internal server error',
        error: 'InternalServerError',
        integration: {
          phase1Enabled: false,
          processingTime: 0,
          version: '1.0.0'
        }
      });
    }
  }
}

// ===== INTEGRATION FACTORY =====

/**
 * Factory for creating integrated PARLANT error handling
 */
export class ParlantIntegrationFactory {
  /**
   * Create integration bridge with default configuration
   */
  static createDefaultBridge(
    legacyFilter: ParlantErrorFilter,
    conversationalHandler: ConversationalErrorHandler,
    recoveryFramework: AdvancedRecoveryFramework,
    communicationSystem: NaturalLanguageCommunicationSystem,
    enterpriseManagement: EnterpriseErrorManagementSystem
  ): ParlantErrorHandlingBridge {
    const config: ParlantIntegrationConfig = {
      enablePhase1: true,
      fallbackToLegacy: true
    };

    return new ParlantErrorHandlingBridge(
      legacyFilter,
      conversationalHandler,
      recoveryFramework,
      communicationSystem,
      enterpriseManagement,
      config
    );
  }

  /**
   * Create enhanced exception filter
   */
  static createEnhancedFilter(bridge: ParlantErrorHandlingBridge): EnhancedParlantErrorFilter {
    return new EnhancedParlantErrorFilter(bridge);
  }

  /**
   * Create complete integration setup
   */
  static createCompleteIntegration(
    legacyFilter: ParlantErrorFilter,
    conversationalHandler: ConversationalErrorHandler,
    recoveryFramework: AdvancedRecoveryFramework,
    communicationSystem: NaturalLanguageCommunicationSystem,
    enterpriseManagement: EnterpriseErrorManagementSystem,
    config?: Partial<ParlantIntegrationConfig>
  ): {
    bridge: ParlantErrorHandlingBridge;
    filter: EnhancedParlantErrorFilter;
  } {
    const defaultConfig: ParlantIntegrationConfig = {
      enablePhase1: true,
      fallbackToLegacy: true,
      ...config
    };

    const bridge = new ParlantErrorHandlingBridge(
      legacyFilter,
      conversationalHandler,
      recoveryFramework,
      communicationSystem,
      enterpriseManagement,
      defaultConfig
    );

    const filter = new EnhancedParlantErrorFilter(bridge);

    return { bridge, filter };
  }
}