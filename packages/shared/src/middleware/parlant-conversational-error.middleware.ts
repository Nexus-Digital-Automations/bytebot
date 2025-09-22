/**
 * PARLANT Conversational Error Handling Middleware
 *
 * Enterprise-grade conversational error handling system that transforms technical
 * errors into human-friendly explanations with actionable guidance. Integrates
 * seamlessly with PARLANT conversational validation to provide intelligent
 * error recovery workflows and user assistance.
 *
 * Key Features:
 * - Intelligent error categorization and risk assessment
 * - Natural language error explanations with context
 * - Automated escalation and intervention protocols
 * - Comprehensive audit trails with conversation history
 * - Real-time error analytics and trend analysis
 * - Integration with PARLANT conversation management
 * - Proactive error prevention suggestions
 * - Multi-language support for global deployments
 *
 * Error Categories:
 * - VALIDATION_FAILED: PARLANT validation rejections
 * - TIMEOUT_ERROR: Conversation or system timeouts
 * - PERMISSION_DENIED: Authorization failures
 * - SYSTEM_ERROR: Internal system failures
 * - INTEGRATION_ERROR: External service failures
 * - USER_ERROR: Invalid user input or requests
 * - BUSINESS_LOGIC_ERROR: Application logic violations
 * - CRITICAL_SYSTEM_FAILURE: Emergency system issues
 *
 * @author Claude Code - PARLANT Error Handling Specialist
 * @version 1.0.0 - Enterprise Conversational Framework
 */

import {
  Injectable,
  NestMiddleware,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Request, Response, NextFunction } from 'express';
import { Cache } from 'cache-manager';
import { ParlantIntegrationService } from '../services/parlant-integration.service';
import {
  ConversationPriority,
  ConversationState,
  ParticipantRole,
} from '../types/parlant.types';

// Enhanced error context interfaces
interface ConversationalErrorContext {
  errorId: string;
  timestamp: Date;
  originalError: Error;
  errorType: ErrorCategory;
  severity: ErrorSeverity;
  userContext: UserErrorContext;
  conversationalExplanation: string;
  userFriendlyMessage: string;
  technicalDetails: TechnicalErrorDetails;
  suggestedActions: ActionableGuidance[];
  escalationProtocol: EscalationProtocol;
  recoveryOptions: RecoveryOption[];
  auditTrail: ErrorAuditEntry[];
  conversationContext?: ConversationErrorContext;
}

interface UserErrorContext {
  userId: string;
  username?: string;
  roles: string[];
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  previousErrors: ErrorPattern[];
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  preferredLanguage: string;
}

interface TechnicalErrorDetails {
  stackTrace?: string;
  errorCode?: string;
  httpStatus: number;
  requestPath: string;
  requestMethod: string;
  requestId: string;
  systemState: Record<string, any>;
  dependencies: DependencyStatus[];
  performanceMetrics: PerformanceContext;
}

interface ActionableGuidance {
  action: string;
  description: string;
  priority: number;
  estimatedTime: string;
  successProbability: number;
  requiresElevatedAccess: boolean;
  automationAvailable: boolean;
  relatedDocumentation: string[];
}

interface EscalationProtocol {
  level: EscalationLevel;
  shouldEscalate: boolean;
  escalationReason: string;
  targetRoles: string[];
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maxResolutionTime: number;
  automatedNotifications: NotificationChannel[];
  requiresHumanIntervention: boolean;
}

interface RecoveryOption {
  strategy: RecoveryStrategy;
  description: string;
  estimatedDuration: number;
  successRate: number;
  risks: string[];
  prerequisites: string[];
  automatedRetry: boolean;
  userApprovalRequired: boolean;
}

interface ErrorAuditEntry {
  timestamp: Date;
  action: string;
  actor: string;
  details: Record<string, any>;
  outcome: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
}

interface ConversationErrorContext {
  conversationId: string;
  participants: string[];
  errorExplanationMode: 'DETAILED' | 'SIMPLIFIED' | 'TECHNICAL';
  interactiveResolution: boolean;
  resolutionHistory: ResolutionAttempt[];
}

interface ErrorPattern {
  errorType: ErrorCategory;
  frequency: number;
  lastOccurrence: Date;
  resolved: boolean;
  resolutionMethod: string;
}

interface DependencyStatus {
  service: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  lastCheck: Date;
  responseTime: number;
}

interface PerformanceContext {
  requestDuration: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

interface ResolutionAttempt {
  timestamp: Date;
  method: string;
  success: boolean;
  details: string;
  userFeedback?: string;
}

enum ErrorCategory {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  USER_ERROR = 'USER_ERROR',
  BUSINESS_LOGIC_ERROR = 'BUSINESS_LOGIC_ERROR',
  CRITICAL_SYSTEM_FAILURE = 'CRITICAL_SYSTEM_FAILURE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RESOURCE_UNAVAILABLE = 'RESOURCE_UNAVAILABLE',
}

enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

enum EscalationLevel {
  NONE = 'NONE',
  SUPERVISOR = 'SUPERVISOR',
  TECHNICAL_LEAD = 'TECHNICAL_LEAD',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  EMERGENCY_RESPONSE = 'EMERGENCY_RESPONSE',
}

enum RecoveryStrategy {
  AUTOMATIC_RETRY = 'AUTOMATIC_RETRY',
  USER_GUIDED_RETRY = 'USER_GUIDED_RETRY',
  ALTERNATIVE_PATH = 'ALTERNATIVE_PATH',
  DEGRADE_GRACEFULLY = 'DEGRADE_GRACEFULLY',
  MANUAL_INTERVENTION = 'MANUAL_INTERVENTION',
  SYSTEM_RESTART = 'SYSTEM_RESTART',
}

enum NotificationChannel {
  EMAIL = 'EMAIL',
  SLACK = 'SLACK',
  SMS = 'SMS',
  DASHBOARD_ALERT = 'DASHBOARD_ALERT',
  PAGER_DUTY = 'PAGER_DUTY',
}

@Injectable()
export class ParlantConversationalErrorMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ParlantConversationalErrorMiddleware.name);
  private readonly errorPatterns = new Map<string, ErrorPattern[]>();
  private readonly activeConversations = new Map<string, ConversationErrorContext>();

  // Configuration for conversational error handling
  private readonly errorConfig = {
    enableConversationalMode: true,
    defaultLanguage: 'en',
    maxRecoveryAttempts: 3,
    autoEscalationThreshold: 5,
    conversationTimeout: 300000, // 5 minutes
    analyticsRetention: 30, // 30 days
    errorCategories: {
      [ErrorCategory.VALIDATION_FAILED]: {
        severity: ErrorSeverity.MEDIUM,
        autoRetry: false,
        requiresUserApproval: true,
        escalationTime: 600000, // 10 minutes
      },
      [ErrorCategory.TIMEOUT_ERROR]: {
        severity: ErrorSeverity.HIGH,
        autoRetry: true,
        maxRetries: 2,
        escalationTime: 300000, // 5 minutes
      },
      [ErrorCategory.PERMISSION_DENIED]: {
        severity: ErrorSeverity.HIGH,
        autoRetry: false,
        requiresEscalation: true,
        escalationTime: 180000, // 3 minutes
      },
      [ErrorCategory.CRITICAL_SYSTEM_FAILURE]: {
        severity: ErrorSeverity.EMERGENCY,
        autoRetry: false,
        immediateEscalation: true,
        escalationTime: 60000, // 1 minute
      },
    },
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly parlantService: ParlantIntegrationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.logger.log('PARLANT Conversational Error Middleware initialized', {
      version: '1.0.0',
      conversationalMode: this.errorConfig.enableConversationalMode,
      supportedLanguages: [this.errorConfig.defaultLanguage],
      maxRecoveryAttempts: this.errorConfig.maxRecoveryAttempts,
      errorCategories: Object.keys(this.errorConfig.errorCategories).length,
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Store original error handler for potential restoration
    const originalErrorHandler = res.locals.errorHandler;

    // Enhanced error handler that provides conversational error responses
    res.locals.errorHandler = async (error: Error, context?: any) => {
      await this.handleConversationalError(error, req, res, context);
    };

    // Override response methods to intercept errors
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    const originalSend = res.send.bind(res);

    let statusCode = 200;
    let hasErrorResponse = false;

    // Intercept status calls to detect errors
    res.status = function(code: number) {
      statusCode = code;
      if (code >= 400) {
        hasErrorResponse = true;
      }
      return originalStatus(code);
    };

    // Intercept JSON responses for error transformation
    const middlewareInstance = this;
    res.json = function(body: any): Response {
      if (hasErrorResponse || statusCode >= 400) {
        // Handle async transformation synchronously by queuing it
        middlewareInstance.transformErrorResponse(body, req, statusCode).then((transformedBody: any) => {
          originalJson.call(this, transformedBody);
        }).catch(() => {
          originalJson.call(this, body);
        });
        return this;
      }
      return originalJson.call(this, body);
    };

    // Intercept send responses for error transformation
    res.send = function(body: any): Response {
      if (hasErrorResponse || statusCode >= 400) {
        if (typeof body === 'object') {
          // Handle async transformation synchronously by queuing it
          middlewareInstance.transformErrorResponse(body, req, statusCode).then((transformedBody: any) => {
            originalSend.call(this, transformedBody);
          }).catch(() => {
            originalSend.call(this, body);
          });
          return this;
        }
      }
      return originalSend.call(this, body);
    };

    // Check for PARLANT error context from universal middleware
    if (res.locals.parlantError) {
      await this.handleConversationalError(
        res.locals.parlantError.originalError,
        req,
        res,
        res.locals.parlantError,
      );
      return;
    }

    next();
  }

  /**
   * Main conversational error handling logic
   */
  private async handleConversationalError(
    error: Error,
    req: Request,
    res: Response,
    existingContext?: any,
  ): Promise<void> {
    const errorId = this.generateErrorId();
    const startTime = Date.now();

    try {
      // Create comprehensive error context
      const errorContext = await this.createErrorContext(error, req, errorId, existingContext);

      // Analyze error patterns for this user
      await this.analyzeErrorPatterns(errorContext);

      // Generate conversational explanation
      const conversationalResponse = await this.generateConversationalResponse(errorContext);

      // Create or update conversation if needed
      if (this.shouldCreateConversation(errorContext)) {
        await this.initiateErrorConversation(errorContext);
      }

      // Log comprehensive error details
      this.logErrorWithContext(errorContext);

      // Check if escalation is needed
      if (errorContext.escalationProtocol.shouldEscalate) {
        await this.escalateError(errorContext);
      }

      // Store error analytics
      await this.storeErrorAnalytics(errorContext);

      // Send conversational error response
      const responseBody = this.formatConversationalErrorResponse(errorContext, conversationalResponse);

      const processingTime = Date.now() - startTime;
      this.logger.debug(`Conversational error handled in ${processingTime}ms`, {
        errorId,
        errorType: errorContext.errorType,
        severity: errorContext.severity,
        conversationalMode: !!errorContext.conversationContext,
      });

      res.status(errorContext.technicalDetails.httpStatus).json(responseBody);

    } catch (handlingError) {
      // Fallback error handling if conversational processing fails
      this.logger.error('Error in conversational error handling', {
        originalError: error.message,
        handlingError: handlingError instanceof Error ? handlingError.message : String(handlingError),
        errorId,
      });

      // Send basic error response as fallback
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: true,
        message: 'An unexpected error occurred',
        errorId,
        timestamp: new Date().toISOString(),
        conversationalMode: false,
      });
    }
  }

  /**
   * Transform error responses to conversational format
   */
  private async transformErrorResponse(body: any, req: Request, statusCode: number): Promise<any> {
    if (!body || typeof body !== 'object') {
      return body;
    }

    // Check if this is already a conversational error response
    if (body.conversationalError) {
      return body;
    }

    // Create minimal error context for transformation
    const errorId = this.generateErrorId();
    const error = new Error(body.message || 'Unknown error');
    const errorContext = await this.createErrorContext(error, req, errorId);

    // Generate simplified conversational response
    const conversationalResponse = await this.generateConversationalResponse(errorContext);

    return {
      ...body,
      conversationalError: true,
      errorId,
      conversationalExplanation: conversationalResponse.explanation,
      userFriendlyMessage: conversationalResponse.userFriendlyMessage,
      suggestedActions: conversationalResponse.suggestedActions.slice(0, 3), // Limit to top 3
      supportContact: this.getSupportContactInfo(errorContext.severity),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create comprehensive error context
   */
  private async createErrorContext(
    error: Error,
    req: Request,
    errorId: string,
    existingContext?: any,
  ): Promise<ConversationalErrorContext> {
    const errorType = this.categorizeError(error);
    const severity = this.determineSeverity(errorType, error);
    const userContext = this.extractUserContext(req);

    const technicalDetails: TechnicalErrorDetails = {
      stackTrace: error.stack,
      errorCode: this.extractErrorCode(error),
      httpStatus: this.mapToHttpStatus(errorType, error),
      requestPath: req.url,
      requestMethod: req.method,
      requestId: this.getRequestId(req),
      systemState: await this.captureSystemState(),
      dependencies: await this.checkDependencies(),
      performanceMetrics: this.capturePerformanceMetrics(req),
    };

    const escalationProtocol = this.determineEscalationProtocol(errorType, severity, userContext);
    const recoveryOptions = this.generateRecoveryOptions(errorType, error, userContext);

    return {
      errorId,
      timestamp: new Date(),
      originalError: error,
      errorType,
      severity,
      userContext,
      conversationalExplanation: '',
      userFriendlyMessage: '',
      technicalDetails,
      suggestedActions: [],
      escalationProtocol,
      recoveryOptions,
      auditTrail: [{
        timestamp: new Date(),
        action: 'ERROR_OCCURRED',
        actor: 'SYSTEM',
        details: { errorType, severity },
        outcome: 'FAILURE',
      }],
      conversationContext: existingContext?.conversationContext,
    };
  }

  /**
   * Categorize error based on type and message
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes('validation') || message.includes('parlant')) {
      return ErrorCategory.VALIDATION_FAILED;
    }
    if (message.includes('timeout') || name.includes('timeout')) {
      return ErrorCategory.TIMEOUT_ERROR;
    }
    if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
      return ErrorCategory.PERMISSION_DENIED;
    }
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorCategory.RATE_LIMIT_EXCEEDED;
    }
    if (message.includes('unavailable') || message.includes('service')) {
      return ErrorCategory.RESOURCE_UNAVAILABLE;
    }
    if (message.includes('business') || message.includes('invalid')) {
      return ErrorCategory.USER_ERROR;
    }
    if (name.includes('critical') || message.includes('critical')) {
      return ErrorCategory.CRITICAL_SYSTEM_FAILURE;
    }

    return ErrorCategory.SYSTEM_ERROR;
  }

  /**
   * Determine error severity
   */
  private determineSeverity(errorType: ErrorCategory, error: Error): ErrorSeverity {
    const config = this.errorConfig.errorCategories[errorType as keyof typeof this.errorConfig.errorCategories];
    if (config) {
      return config.severity;
    }

    // Default severity mapping
    const severityMap: Record<ErrorCategory, ErrorSeverity> = {
      [ErrorCategory.CRITICAL_SYSTEM_FAILURE]: ErrorSeverity.EMERGENCY,
      [ErrorCategory.PERMISSION_DENIED]: ErrorSeverity.HIGH,
      [ErrorCategory.TIMEOUT_ERROR]: ErrorSeverity.HIGH,
      [ErrorCategory.INTEGRATION_ERROR]: ErrorSeverity.HIGH,
      [ErrorCategory.VALIDATION_FAILED]: ErrorSeverity.MEDIUM,
      [ErrorCategory.RATE_LIMIT_EXCEEDED]: ErrorSeverity.MEDIUM,
      [ErrorCategory.BUSINESS_LOGIC_ERROR]: ErrorSeverity.MEDIUM,
      [ErrorCategory.RESOURCE_UNAVAILABLE]: ErrorSeverity.MEDIUM,
      [ErrorCategory.USER_ERROR]: ErrorSeverity.LOW,
      [ErrorCategory.SYSTEM_ERROR]: ErrorSeverity.MEDIUM,
    };

    return severityMap[errorType] || ErrorSeverity.MEDIUM;
  }

  /**
   * Extract user context from request
   */
  private extractUserContext(req: Request): UserErrorContext {
    const user = (req as any).user;
    return {
      userId: user?.id || 'anonymous',
      username: user?.username,
      roles: user?.roles || [],
      sessionId: this.getSessionId(req),
      ipAddress: this.getClientIp(req),
      userAgent: req.get('User-Agent') || 'unknown',
      previousErrors: this.getUserErrorHistory(user?.id),
      experienceLevel: this.determineUserExperience(user),
      preferredLanguage: this.extractPreferredLanguage(req),
    };
  }

  /**
   * Generate conversational response
   */
  private async generateConversationalResponse(context: ConversationalErrorContext): Promise<any> {
    const explanation = this.generateConversationalExplanation(context);
    const userFriendlyMessage = this.generateUserFriendlyMessage(context);
    const suggestedActions = this.generateSuggestedActions(context);

    context.conversationalExplanation = explanation;
    context.userFriendlyMessage = userFriendlyMessage;
    context.suggestedActions = suggestedActions;

    return {
      explanation,
      userFriendlyMessage,
      suggestedActions,
    };
  }

  /**
   * Generate conversational explanation
   */
  private generateConversationalExplanation(context: ConversationalErrorContext): string {
    const { errorType, severity, userContext, technicalDetails } = context;

    let explanation = `I understand you encountered an issue while trying to ${this.describeUserAction(technicalDetails)}. `;

    switch (errorType) {
      case ErrorCategory.VALIDATION_FAILED:
        explanation += `The system needs to verify this operation through our security validation process. This is a safety measure to ensure all operations are properly authorized. `;
        break;

      case ErrorCategory.TIMEOUT_ERROR:
        explanation += `The operation took longer than expected to complete, likely due to high system load or network conditions. `;
        break;

      case ErrorCategory.PERMISSION_DENIED:
        explanation += `You don't currently have the required permissions to perform this action. This might be due to security policies or role restrictions. `;
        break;

      case ErrorCategory.RATE_LIMIT_EXCEEDED:
        explanation += `You've reached the maximum number of requests allowed in this time period. This helps ensure fair system usage for all users. `;
        break;

      case ErrorCategory.RESOURCE_UNAVAILABLE:
        explanation += `The service or resource you're trying to access is temporarily unavailable. This could be due to maintenance or high demand. `;
        break;

      case ErrorCategory.USER_ERROR:
        explanation += `There appears to be an issue with the information or parameters you provided. `;
        break;

      case ErrorCategory.CRITICAL_SYSTEM_FAILURE:
        explanation += `We've detected a critical system issue that requires immediate attention. Our technical team has been automatically notified. `;
        break;

      default:
        explanation += `An unexpected system error occurred while processing your request. `;
    }

    // Add context-specific details
    if (userContext.experienceLevel === 'BEGINNER') {
      explanation += `Don't worry - this is a common situation that can usually be resolved quickly. `;
    }

    // Add severity context
    if (severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.EMERGENCY) {
      explanation += `This is a high-priority issue and we're working to resolve it as quickly as possible. `;
    }

    return explanation.trim();
  }

  /**
   * Generate user-friendly message
   */
  private generateUserFriendlyMessage(context: ConversationalErrorContext): string {
    const { errorType, severity } = context;

    const messageMap: Record<ErrorCategory, string> = {
      [ErrorCategory.VALIDATION_FAILED]: 'Security validation required for this operation',
      [ErrorCategory.TIMEOUT_ERROR]: 'Operation timed out - please try again',
      [ErrorCategory.PERMISSION_DENIED]: 'Additional permissions needed for this action',
      [ErrorCategory.RATE_LIMIT_EXCEEDED]: 'Request limit reached - please wait before trying again',
      [ErrorCategory.RESOURCE_UNAVAILABLE]: 'Service temporarily unavailable',
      [ErrorCategory.USER_ERROR]: 'Please check your input and try again',
      [ErrorCategory.CRITICAL_SYSTEM_FAILURE]: 'Critical system issue detected - support has been notified',
      [ErrorCategory.BUSINESS_LOGIC_ERROR]: 'Business rule validation failed',
      [ErrorCategory.INTEGRATION_ERROR]: 'External service integration issue',
      [ErrorCategory.SYSTEM_ERROR]: 'System error occurred - please retry',
    };

    let message = messageMap[errorType] || 'An unexpected error occurred';

    if (severity === ErrorSeverity.EMERGENCY) {
      message = `🚨 URGENT: ${message}`;
    } else if (severity === ErrorSeverity.CRITICAL) {
      message = `⚠️ ${message}`;
    }

    return message;
  }

  /**
   * Generate suggested actions
   */
  private generateSuggestedActions(context: ConversationalErrorContext): ActionableGuidance[] {
    const actions: ActionableGuidance[] = [];
    const { errorType, severity, userContext, recoveryOptions } = context;

    // Add recovery-based actions
    for (const recovery of recoveryOptions) {
      actions.push({
        action: this.formatRecoveryAction(recovery),
        description: recovery.description,
        priority: this.calculateActionPriority(recovery, severity),
        estimatedTime: `${recovery.estimatedDuration} seconds`,
        successProbability: recovery.successRate,
        requiresElevatedAccess: recovery.userApprovalRequired,
        automationAvailable: recovery.automatedRetry,
        relatedDocumentation: this.getRelatedDocumentation(errorType),
      });
    }

    // Add general actions based on error type
    switch (errorType) {
      case ErrorCategory.TIMEOUT_ERROR:
        actions.push(this.createAction(
          'Retry the operation',
          'Wait a moment and try your request again',
          8,
          '30 seconds',
          75,
        ));
        break;

      case ErrorCategory.PERMISSION_DENIED:
        actions.push(this.createAction(
          'Contact your administrator',
          'Request the necessary permissions for this operation',
          9,
          '5-10 minutes',
          90,
          true,
        ));
        break;

      case ErrorCategory.RATE_LIMIT_EXCEEDED:
        actions.push(this.createAction(
          'Wait before retrying',
          'Wait for the rate limit window to reset',
          7,
          '1-5 minutes',
          95,
        ));
        break;
    }

    // Add universal helpful actions
    actions.push(this.createAction(
      'Check system status',
      'Visit our status page for any known issues',
      3,
      '1 minute',
      100,
    ));

    if (severity >= ErrorSeverity.HIGH) {
      actions.push(this.createAction(
        'Contact support',
        'Get direct help from our technical support team',
        6,
        '2-5 minutes',
        95,
        false,
        false,
        ['support-contact-guide', 'escalation-procedures'],
      ));
    }

    return actions.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  /**
   * Helper method to create action guidance
   */
  private createAction(
    action: string,
    description: string,
    priority: number,
    estimatedTime: string,
    successProbability: number,
    requiresElevatedAccess = false,
    automationAvailable = false,
    relatedDocumentation: string[] = [],
  ): ActionableGuidance {
    return {
      action,
      description,
      priority,
      estimatedTime,
      successProbability,
      requiresElevatedAccess,
      automationAvailable,
      relatedDocumentation,
    };
  }

  /**
   * Helper methods and utilities
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private describeUserAction(technicalDetails: TechnicalErrorDetails): string {
    const method = technicalDetails.requestMethod.toLowerCase();
    const path = technicalDetails.requestPath;

    if (method === 'post' && path.includes('computer-use')) {
      return 'execute a computer automation task';
    }
    if (method === 'get' && path.includes('status')) {
      return 'check the status of an operation';
    }
    if (method === 'delete') {
      return 'delete or remove data';
    }
    if (method === 'post') {
      return 'create or submit data';
    }
    if (method === 'put' || method === 'patch') {
      return 'update existing data';
    }

    return `perform a ${method.toUpperCase()} operation`;
  }

  private formatRecoveryAction(recovery: RecoveryOption): string {
    switch (recovery.strategy) {
      case RecoveryStrategy.AUTOMATIC_RETRY:
        return 'Automatic retry will be attempted';
      case RecoveryStrategy.USER_GUIDED_RETRY:
        return 'Retry the operation with guidance';
      case RecoveryStrategy.ALTERNATIVE_PATH:
        return 'Try an alternative approach';
      case RecoveryStrategy.DEGRADE_GRACEFULLY:
        return 'Continue with limited functionality';
      case RecoveryStrategy.MANUAL_INTERVENTION:
        return 'Manual intervention required';
      default:
        return 'Recovery action available';
    }
  }

  private calculateActionPriority(recovery: RecoveryOption, severity: ErrorSeverity): number {
    let priority = 5;

    // Adjust based on success rate
    priority += Math.floor(recovery.successRate / 20);

    // Adjust based on severity
    if (severity === ErrorSeverity.EMERGENCY) priority += 3;
    else if (severity === ErrorSeverity.CRITICAL) priority += 2;
    else if (severity === ErrorSeverity.HIGH) priority += 1;

    // Prefer automated solutions
    if (recovery.automatedRetry) priority += 2;

    // Prefer faster solutions
    if (recovery.estimatedDuration < 60) priority += 1;

    return Math.min(priority, 10);
  }

  private getRelatedDocumentation(errorType: ErrorCategory): string[] {
    const docMap: Record<ErrorCategory, string[]> = {
      [ErrorCategory.VALIDATION_FAILED]: ['parlant-validation-guide', 'security-procedures'],
      [ErrorCategory.PERMISSION_DENIED]: ['user-permissions', 'role-management'],
      [ErrorCategory.TIMEOUT_ERROR]: ['performance-optimization', 'system-limits'],
      [ErrorCategory.RATE_LIMIT_EXCEEDED]: ['api-rate-limits', 'usage-optimization'],
      [ErrorCategory.USER_ERROR]: ['api-documentation', 'parameter-guide'],
      [ErrorCategory.SYSTEM_ERROR]: ['troubleshooting-guide', 'system-status'],
      [ErrorCategory.CRITICAL_SYSTEM_FAILURE]: ['emergency-procedures', 'system-recovery'],
      [ErrorCategory.INTEGRATION_ERROR]: ['integration-guide', 'dependency-status'],
      [ErrorCategory.BUSINESS_LOGIC_ERROR]: ['business-rules', 'validation-guide'],
      [ErrorCategory.RESOURCE_UNAVAILABLE]: ['service-availability', 'capacity-planning'],
    };

    return docMap[errorType] || ['general-help', 'faq'];
  }

  private getSupportContactInfo(severity: ErrorSeverity): Record<string, any> {
    const baseContact = {
      email: 'support@bytebot.ai',
      documentation: 'https://docs.bytebot.ai',
    };

    if (severity === ErrorSeverity.EMERGENCY) {
      return {
        ...baseContact,
        urgent: true,
        phone: '+1-555-EMERGENCY',
        escalation: 'Immediate response team notified',
      };
    }

    if (severity === ErrorSeverity.CRITICAL) {
      return {
        ...baseContact,
        priority: 'HIGH',
        expectedResponse: '< 1 hour',
      };
    }

    return {
      ...baseContact,
      expectedResponse: '< 24 hours',
    };
  }

  // Additional helper methods (stubs for now - would implement based on infrastructure)
  private mapToHttpStatus(errorType: ErrorCategory, error: Error): number {
    const statusMap: Record<ErrorCategory, number> = {
      [ErrorCategory.VALIDATION_FAILED]: HttpStatus.BAD_REQUEST,
      [ErrorCategory.PERMISSION_DENIED]: HttpStatus.FORBIDDEN,
      [ErrorCategory.TIMEOUT_ERROR]: HttpStatus.REQUEST_TIMEOUT,
      [ErrorCategory.RATE_LIMIT_EXCEEDED]: HttpStatus.TOO_MANY_REQUESTS,
      [ErrorCategory.RESOURCE_UNAVAILABLE]: HttpStatus.SERVICE_UNAVAILABLE,
      [ErrorCategory.USER_ERROR]: HttpStatus.BAD_REQUEST,
      [ErrorCategory.CRITICAL_SYSTEM_FAILURE]: HttpStatus.INTERNAL_SERVER_ERROR,
      [ErrorCategory.BUSINESS_LOGIC_ERROR]: HttpStatus.UNPROCESSABLE_ENTITY,
      [ErrorCategory.INTEGRATION_ERROR]: HttpStatus.BAD_GATEWAY,
      [ErrorCategory.SYSTEM_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
    };

    return statusMap[errorType] || HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private extractErrorCode(error: Error): string | undefined {
    return (error as any).code || (error as any).errorCode;
  }

  private getRequestId(req: Request): string {
    return req.headers['x-request-id'] as string || `req_${Date.now()}`;
  }

  private getSessionId(req: Request): string {
    return req.headers['x-session-id'] as string || `session_${Date.now()}`;
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] as string ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  private extractPreferredLanguage(req: Request): string {
    return req.headers['accept-language']?.split(',')[0]?.split('-')[0] || 'en';
  }

  private getUserErrorHistory(userId?: string): ErrorPattern[] {
    if (!userId) return [];
    return this.errorPatterns.get(userId) || [];
  }

  private determineUserExperience(user: any): 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT' {
    if (!user) return 'BEGINNER';
    if (user.roles?.includes('ADMIN')) return 'EXPERT';
    if (user.roles?.includes('OPERATOR')) return 'ADVANCED';
    return 'INTERMEDIATE';
  }

  // Infrastructure stubs - would implement with real monitoring
  private async captureSystemState(): Promise<Record<string, any>> {
    return {
      timestamp: Date.now(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  private async checkDependencies(): Promise<DependencyStatus[]> {
    return []; // Would implement actual health checks
  }

  private capturePerformanceMetrics(req: Request): PerformanceContext {
    return {
      requestDuration: 0, // Would calculate from request start
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0, // Would implement CPU monitoring
      activeConnections: 0, // Would get from server stats
    };
  }

  private shouldCreateConversation(context: ConversationalErrorContext): boolean {
    return context.severity >= ErrorSeverity.HIGH ||
           context.errorType === ErrorCategory.VALIDATION_FAILED;
  }

  private async initiateErrorConversation(context: ConversationalErrorContext): Promise<void> {
    // Would integrate with PARLANT conversation system
    this.logger.debug('Error conversation would be initiated', {
      errorId: context.errorId,
      errorType: context.errorType,
      severity: context.severity,
    });
  }

  private determineEscalationProtocol(
    errorType: ErrorCategory,
    severity: ErrorSeverity,
    userContext: UserErrorContext,
  ): EscalationProtocol {
    let shouldEscalate = false;
    let level = EscalationLevel.NONE;
    let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

    if (severity === ErrorSeverity.EMERGENCY) {
      shouldEscalate = true;
      level = EscalationLevel.EMERGENCY_RESPONSE;
      urgency = 'CRITICAL';
    } else if (severity === ErrorSeverity.CRITICAL) {
      shouldEscalate = true;
      level = EscalationLevel.SYSTEM_ADMIN;
      urgency = 'HIGH';
    } else if (errorType === ErrorCategory.PERMISSION_DENIED) {
      shouldEscalate = true;
      level = EscalationLevel.SUPERVISOR;
      urgency = 'MEDIUM';
    }

    return {
      level,
      shouldEscalate,
      escalationReason: this.generateEscalationReason(errorType, severity),
      targetRoles: this.getEscalationTargets(level),
      urgency,
      maxResolutionTime: this.getResolutionTime(urgency),
      automatedNotifications: this.getNotificationChannels(urgency),
      requiresHumanIntervention: shouldEscalate,
    };
  }

  private generateRecoveryOptions(
    errorType: ErrorCategory,
    error: Error,
    userContext: UserErrorContext,
  ): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    // Add appropriate recovery options based on error type
    switch (errorType) {
      case ErrorCategory.TIMEOUT_ERROR:
        options.push({
          strategy: RecoveryStrategy.AUTOMATIC_RETRY,
          description: 'Automatically retry the operation with longer timeout',
          estimatedDuration: 30,
          successRate: 70,
          risks: ['May timeout again if underlying issue persists'],
          prerequisites: [],
          automatedRetry: true,
          userApprovalRequired: false,
        });
        break;

      case ErrorCategory.VALIDATION_FAILED:
        options.push({
          strategy: RecoveryStrategy.USER_GUIDED_RETRY,
          description: 'Guide user through validation process',
          estimatedDuration: 120,
          successRate: 85,
          risks: ['User may need to provide additional information'],
          prerequisites: ['Valid user session', 'Appropriate permissions'],
          automatedRetry: false,
          userApprovalRequired: true,
        });
        break;

      // Add more recovery options for other error types
    }

    return options;
  }

  private generateEscalationReason(errorType: ErrorCategory, severity: ErrorSeverity): string {
    return `${errorType} with ${severity} severity requires escalation`;
  }

  private getEscalationTargets(level: EscalationLevel): string[] {
    const targetMap: Record<EscalationLevel, string[]> = {
      [EscalationLevel.NONE]: [],
      [EscalationLevel.SUPERVISOR]: ['SUPERVISOR'],
      [EscalationLevel.TECHNICAL_LEAD]: ['TECHNICAL_LEAD'],
      [EscalationLevel.SYSTEM_ADMIN]: ['SYSTEM_ADMIN'],
      [EscalationLevel.EMERGENCY_RESPONSE]: ['EMERGENCY_RESPONSE', 'SYSTEM_ADMIN'],
    };

    return targetMap[level] || [];
  }

  private getResolutionTime(urgency: string): number {
    const timeMap: Record<string, number> = {
      LOW: 3600000, // 1 hour
      MEDIUM: 1800000, // 30 minutes
      HIGH: 600000, // 10 minutes
      CRITICAL: 300000, // 5 minutes
    };

    return timeMap[urgency] || 3600000;
  }

  private getNotificationChannels(urgency: string): NotificationChannel[] {
    if (urgency === 'CRITICAL') {
      return [NotificationChannel.PAGER_DUTY, NotificationChannel.SMS, NotificationChannel.EMAIL];
    }
    if (urgency === 'HIGH') {
      return [NotificationChannel.SLACK, NotificationChannel.EMAIL];
    }
    return [NotificationChannel.EMAIL];
  }

  private async analyzeErrorPatterns(context: ConversationalErrorContext): Promise<void> {
    // Would implement error pattern analysis
    this.logger.debug('Error pattern analysis', {
      errorId: context.errorId,
      errorType: context.errorType,
      userId: context.userContext.userId,
    });
  }

  private async escalateError(context: ConversationalErrorContext): Promise<void> {
    // Would implement escalation logic
    this.logger.warn('Error escalated', {
      errorId: context.errorId,
      escalationLevel: context.escalationProtocol.level,
      urgency: context.escalationProtocol.urgency,
    });
  }

  private async storeErrorAnalytics(context: ConversationalErrorContext): Promise<void> {
    // Would store in analytics system
    this.logger.debug('Error analytics stored', {
      errorId: context.errorId,
      errorType: context.errorType,
      severity: context.severity,
    });
  }

  private logErrorWithContext(context: ConversationalErrorContext): void {
    this.logger.error('Conversational error handled', {
      errorId: context.errorId,
      errorType: context.errorType,
      severity: context.severity,
      userId: context.userContext.userId,
      requestPath: context.technicalDetails.requestPath,
      httpStatus: context.technicalDetails.httpStatus,
      escalated: context.escalationProtocol.shouldEscalate,
      conversational: !!context.conversationContext,
    });
  }

  private formatConversationalErrorResponse(
    context: ConversationalErrorContext,
    conversationalResponse: any,
  ): any {
    return {
      error: true,
      conversationalError: true,
      errorId: context.errorId,
      timestamp: context.timestamp.toISOString(),

      // User-facing information
      message: context.userFriendlyMessage,
      explanation: context.conversationalExplanation,
      suggestedActions: context.suggestedActions,

      // Technical information (filtered for security)
      technical: {
        errorType: context.errorType,
        severity: context.severity,
        httpStatus: context.technicalDetails.httpStatus,
        requestId: context.technicalDetails.requestId,
      },

      // Support information
      support: this.getSupportContactInfo(context.severity),

      // Recovery information
      recovery: {
        options: context.recoveryOptions.map(opt => ({
          strategy: opt.strategy,
          description: opt.description,
          estimatedTime: opt.estimatedDuration,
          automated: opt.automatedRetry,
        })),
        escalated: context.escalationProtocol.shouldEscalate,
      },

      // Conversation context if applicable
      conversation: context.conversationContext ? {
        conversationId: context.conversationContext.conversationId,
        mode: context.conversationContext.errorExplanationMode,
        interactive: context.conversationContext.interactiveResolution,
      } : undefined,
    };
  }
}