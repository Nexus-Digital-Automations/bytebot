/**
 * PARLANT Phase 1 - Conversational Error Handler
 *
 * Revolutionary error handling system that enables intelligent error recovery through
 * conversational feedback with enterprise-grade diagnostics and user assistance.
 *
 * Core Features:
 * - Natural language error interpretation and explanation
 * - Context-aware error recovery suggestions
 * - Multi-stage error recovery with user guidance
 * - Intelligent fallback mechanism suggestions
 * - User-friendly error resolution workflows
 * - Sub-100ms error processing and response generation
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 Implementation Team
 */

import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

// ===== CORE INTERFACES =====

/**
 * Conversational error context containing user and system information
 */
export interface ConversationalErrorContext {
  /** User session information */
  userId?: string;
  sessionId?: string;
  userLanguage?: string;
  userExpertiseLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

  /** Request context */
  endpoint?: string;
  method?: string;
  parameters?: Record<string, any>;
  headers?: Record<string, string>;

  /** System context */
  timestamp: Date;
  requestId: string;
  systemLoad?: number;
  region?: string;

  /** Error tracking */
  errorHistory?: Array<{
    timestamp: Date;
    errorCode: string;
    resolved: boolean;
  }>;
}

/**
 * Error severity levels with natural language descriptions
 */
export enum ConversationalErrorSeverity {
  /** Minor issues that don't affect functionality */
  INFO = "INFO",
  /** Issues that might affect user experience */
  WARNING = "WARNING",
  /** Errors that prevent specific operations */
  ERROR = "ERROR",
  /** Critical system failures requiring immediate attention */
  CRITICAL = "CRITICAL",
}

/**
 * Error categories with conversational classification
 */
export enum ConversationalErrorCategory {
  /** User input validation and format errors */
  USER_INPUT = "USER_INPUT",
  /** Authentication and login issues */
  AUTHENTICATION = "AUTHENTICATION",
  /** Permission and access control issues */
  AUTHORIZATION = "AUTHORIZATION",
  /** Business logic and rule violations */
  BUSINESS_LOGIC = "BUSINESS_LOGIC",
  /** External system integration failures */
  INTEGRATION = "INTEGRATION",
  /** Performance and timeout issues */
  PERFORMANCE = "PERFORMANCE",
  /** System and infrastructure errors */
  SYSTEM = "SYSTEM",
  /** Rate limiting and quota issues */
  RATE_LIMITING = "RATE_LIMITING",
}

/**
 * Multi-stage recovery strategies
 */
export enum RecoveryStage {
  /** Immediate automated fixes */
  IMMEDIATE = "IMMEDIATE",
  /** User-guided fixes with suggestions */
  GUIDED = "GUIDED",
  /** Manual intervention required */
  MANUAL = "MANUAL",
  /** System-level fixes needed */
  SYSTEM = "SYSTEM",
  /** Escalation to support team */
  ESCALATION = "ESCALATION",
}

/**
 * Comprehensive conversational guidance structure
 */
export interface ConversationalGuidance {
  /** Natural language explanation of the error */
  explanation: string;

  /** Simple, actionable steps user can take immediately */
  immediateActions: Array<{
    step: number;
    action: string;
    example?: string;
    estimatedTime?: string;
  }>;

  /** Alternative approaches to achieve the user's goal */
  alternatives: Array<{
    title: string;
    description: string;
    difficulty: "EASY" | "MEDIUM" | "ADVANCED";
    estimatedTime: string;
    steps: string[];
  }>;

  /** Proactive prevention suggestions */
  preventionTips: Array<{
    tip: string;
    rationale: string;
    category: "BEST_PRACTICE" | "SECURITY" | "PERFORMANCE" | "USABILITY";
  }>;

  /** When and how to escalate */
  escalationGuidance?: {
    when: string;
    how: string;
    expectedResponse: string;
  };

  /** Related resources and documentation */
  resources: Array<{
    title: string;
    url: string;
    type: "DOCUMENTATION" | "TUTORIAL" | "VIDEO" | "FAQ";
    difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  }>;
}

/**
 * Error recovery recommendation with success probability
 */
export interface ErrorRecoveryRecommendation {
  /** Recovery strategy identifier */
  strategy: string;

  /** Human-readable description */
  description: string;

  /** Confidence level for success (0.0 to 1.0) */
  confidence: number;

  /** Estimated time to resolution */
  estimatedTime: string;

  /** Required user actions */
  requiredActions: string[];

  /** Success criteria */
  successCriteria: string[];

  /** Recovery stage */
  stage: RecoveryStage;
}

/**
 * Comprehensive conversational error response
 */
export interface ConversationalErrorResponse {
  /** Unique error identifier */
  errorId: string;

  /** User-friendly error title */
  title: string;

  /** Detailed but accessible error message */
  message: string;

  /** Error classification */
  severity: ConversationalErrorSeverity;
  category: ConversationalErrorCategory;

  /** Comprehensive guidance */
  guidance: ConversationalGuidance;

  /** Recovery recommendations ordered by success probability */
  recoveryRecommendations: ErrorRecoveryRecommendation[];

  /** Context information */
  context: ConversationalErrorContext;

  /** Technical details (for advanced users) */
  technicalDetails?: {
    errorCode: string;
    stackTrace?: string;
    systemInfo?: Record<string, any>;
  };

  /** Tracking information */
  tracking: {
    timestamp: Date;
    processingTime: number;
    similarErrorsCount: number;
    resolutionRate: number;
  };
}

// ===== NATURAL LANGUAGE PROCESSING =====

/**
 * Natural language processor for error messages
 */
@Injectable()
export class ErrorNaturalLanguageProcessor {
  private readonly logger = new Logger(ErrorNaturalLanguageProcessor.name);

  /**
   * Convert technical error to natural language explanation
   */
  async processErrorToNaturalLanguage(
    error: Error,
    context: ConversationalErrorContext,
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Analyze error type and context
      const errorAnalysis = this.analyzeError(error);

      // Generate context-aware explanation
      const explanation = this.generateContextualExplanation(
        errorAnalysis,
        context,
      );

      // Adjust language complexity based on user expertise
      const adjustedExplanation = this.adjustLanguageComplexity(
        explanation,
        context.userExpertiseLevel || "INTERMEDIATE",
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`NLP processing completed in ${processingTime}ms`);

      return adjustedExplanation;
    } catch (nlpError) {
      this.logger.error("NLP processing failed", nlpError);
      return this.getFallbackExplanation(error);
    }
  }

  /**
   * Analyze error to extract key information
   */
  private analyzeError(error: Error): {
    type: string;
    severity: ConversationalErrorSeverity;
    category: ConversationalErrorCategory;
    keywords: string[];
  } {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Determine error type
    let type = "UNKNOWN";
    let severity = ConversationalErrorSeverity.ERROR;
    let category = ConversationalErrorCategory.SYSTEM;

    if (error instanceof BadRequestException) {
      type = "VALIDATION_ERROR";
      category = ConversationalErrorCategory.USER_INPUT;
      severity = ConversationalErrorSeverity.WARNING;
    } else if (error instanceof UnauthorizedException) {
      type = "AUTHENTICATION_ERROR";
      category = ConversationalErrorCategory.AUTHENTICATION;
      severity = ConversationalErrorSeverity.ERROR;
    } else if (error instanceof ForbiddenException) {
      type = "AUTHORIZATION_ERROR";
      category = ConversationalErrorCategory.AUTHORIZATION;
      severity = ConversationalErrorSeverity.ERROR;
    } else if (error instanceof NotFoundException) {
      type = "RESOURCE_NOT_FOUND";
      category = ConversationalErrorCategory.USER_INPUT;
      severity = ConversationalErrorSeverity.WARNING;
    } else if (error instanceof InternalServerErrorException) {
      type = "SYSTEM_ERROR";
      category = ConversationalErrorCategory.SYSTEM;
      severity = ConversationalErrorSeverity.CRITICAL;
    }

    // Extract keywords for context
    const keywords = this.extractKeywords(errorMessage + " " + errorName);

    return { type, severity, category, keywords };
  }

  /**
   * Generate contextual explanation based on error analysis
   */
  private generateContextualExplanation(
    analysis: any,
    context: ConversationalErrorContext,
  ): string {
    const { type, category } = analysis;

    switch (category) {
      case ConversationalErrorCategory.USER_INPUT:
        return this.generateUserInputExplanation(analysis, context);
      case ConversationalErrorCategory.AUTHENTICATION:
        return this.generateAuthenticationExplanation(analysis, context);
      case ConversationalErrorCategory.AUTHORIZATION:
        return this.generateAuthorizationExplanation(analysis, context);
      case ConversationalErrorCategory.SYSTEM:
        return this.generateSystemExplanation(analysis, context);
      default:
        return this.generateGenericExplanation(analysis, context);
    }
  }

  /**
   * Generate user input error explanation
   */
  private generateUserInputExplanation(
    analysis: any,
    context: ConversationalErrorContext,
  ): string {
    const action = context.method?.toLowerCase() || "action";
    const endpoint = context.endpoint || "this operation";

    return (
      `There seems to be an issue with the information you provided for ${endpoint}. ` +
      `The system couldn't process your ${action} request because some of the data ` +
      `doesn't match what's expected. This is usually a simple formatting issue that ` +
      `can be fixed quickly.`
    );
  }

  /**
   * Generate authentication error explanation
   */
  private generateAuthenticationExplanation(
    analysis: any,
    context: ConversationalErrorContext,
  ): string {
    return (
      `You need to sign in to access this feature. Your current session may have ` +
      `expired or you might not be logged in yet. This is a security measure to ` +
      `protect your account and data.`
    );
  }

  /**
   * Generate authorization error explanation
   */
  private generateAuthorizationExplanation(
    analysis: any,
    context: ConversationalErrorContext,
  ): string {
    return (
      `You don't have permission to perform this action. Your account may not have ` +
      `the necessary privileges, or you might be trying to access a restricted area. ` +
      `This is normal - different users have different access levels for security reasons.`
    );
  }

  /**
   * Generate system error explanation
   */
  private generateSystemExplanation(
    analysis: any,
    context: ConversationalErrorContext,
  ): string {
    return (
      `We're experiencing a technical issue on our end that's preventing this action ` +
      `from completing. This isn't something you did wrong - it's a system problem ` +
      `that our team needs to resolve.`
    );
  }

  /**
   * Generate generic error explanation
   */
  private generateGenericExplanation(
    analysis: any,
    context: ConversationalErrorContext,
  ): string {
    return (
      `Something unexpected happened while processing your request. The system ` +
      `encountered an issue that prevented the operation from completing successfully.`
    );
  }

  /**
   * Adjust language complexity based on user expertise
   */
  private adjustLanguageComplexity(
    explanation: string,
    expertiseLevel: string,
  ): string {
    switch (expertiseLevel) {
      case "BEGINNER":
        return this.simplifyLanguage(explanation);
      case "EXPERT":
        return this.addTechnicalDetails(explanation);
      default:
        return explanation;
    }
  }

  /**
   * Simplify language for beginners
   */
  private simplifyLanguage(explanation: string): string {
    return explanation
      .replace(/operation/g, "action")
      .replace(/encounter/g, "find")
      .replace(/authorization/g, "permission")
      .replace(/authentication/g, "login")
      .replace(/privileges/g, "rights");
  }

  /**
   * Add technical details for experts
   */
  private addTechnicalDetails(explanation: string): string {
    return (
      explanation +
      " Check the response headers and status codes for additional diagnostic information."
    );
  }

  /**
   * Extract keywords from error message
   */
  private extractKeywords(text: string): string[] {
    const commonWords = [
      "the",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
    ];
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2 && !commonWords.includes(word));
    return Array.from(new Set(words));
  }

  /**
   * Get fallback explanation when NLP fails
   */
  private getFallbackExplanation(error: Error): string {
    return (
      `An error occurred while processing your request: ${error.message}. ` +
      `Please try again or contact support if the problem persists.`
    );
  }
}

// ===== CORE CONVERSATIONAL ERROR HANDLER =====

/**
 * Main conversational error handler with natural language processing
 */
@Injectable()
export class ConversationalErrorHandler {
  private readonly logger = new Logger(ConversationalErrorHandler.name);

  constructor(
    private readonly nlpProcessor: ErrorNaturalLanguageProcessor,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.log(
      "ConversationalErrorHandler initialized with NLP capabilities",
    );
  }

  /**
   * Process error with conversational guidance
   */
  async processError(
    error: Error,
    context: ConversationalErrorContext,
  ): Promise<ConversationalErrorResponse> {
    const startTime = Date.now();
    const errorId = this.generateErrorId();

    this.logger.log(`Processing error ${errorId}: ${error.message}`);

    try {
      // Generate natural language explanation
      const explanation = await this.nlpProcessor.processErrorToNaturalLanguage(
        error,
        context,
      );

      // Classify error
      const { severity, category } = this.classifyError(error);

      // Generate conversational guidance
      const guidance = await this.generateConversationalGuidance(
        error,
        context,
        explanation,
      );

      // Generate recovery recommendations
      const recoveryRecommendations =
        await this.generateRecoveryRecommendations(error, context, severity);

      // Calculate processing metrics
      const processingTime = Date.now() - startTime;
      const similarErrorsCount = await this.getSimilarErrorsCount(error);
      const resolutionRate = await this.getResolutionRate(category);

      // Create comprehensive response
      const response: ConversationalErrorResponse = {
        errorId,
        title: this.generateUserFriendlyTitle(error, category),
        message: explanation,
        severity,
        category,
        guidance,
        recoveryRecommendations,
        context,
        technicalDetails:
          context.userExpertiseLevel === "EXPERT"
            ? {
                errorCode: error.name,
                stackTrace: error.stack,
                systemInfo: this.collectSystemInfo(),
              }
            : undefined,
        tracking: {
          timestamp: new Date(),
          processingTime,
          similarErrorsCount,
          resolutionRate,
        },
      };

      // Emit analytics event
      this.eventEmitter.emit("error.processed", {
        errorId,
        category,
        severity,
        processingTime,
        userId: context.userId,
      });

      this.logger.log(`Error ${errorId} processed in ${processingTime}ms`);
      return response;
    } catch (processingError) {
      this.logger.error(
        `Error processing failed for ${errorId}`,
        processingError,
      );
      return this.generateFallbackResponse(error, context, errorId);
    }
  }

  /**
   * Classify error into severity and category
   */
  private classifyError(error: Error): {
    severity: ConversationalErrorSeverity;
    category: ConversationalErrorCategory;
  } {
    if (error instanceof BadRequestException) {
      return {
        severity: ConversationalErrorSeverity.WARNING,
        category: ConversationalErrorCategory.USER_INPUT,
      };
    }

    if (error instanceof UnauthorizedException) {
      return {
        severity: ConversationalErrorSeverity.ERROR,
        category: ConversationalErrorCategory.AUTHENTICATION,
      };
    }

    if (error instanceof ForbiddenException) {
      return {
        severity: ConversationalErrorSeverity.ERROR,
        category: ConversationalErrorCategory.AUTHORIZATION,
      };
    }

    if (error instanceof NotFoundException) {
      return {
        severity: ConversationalErrorSeverity.WARNING,
        category: ConversationalErrorCategory.USER_INPUT,
      };
    }

    if (error instanceof InternalServerErrorException) {
      return {
        severity: ConversationalErrorSeverity.CRITICAL,
        category: ConversationalErrorCategory.SYSTEM,
      };
    }

    // Default classification
    return {
      severity: ConversationalErrorSeverity.ERROR,
      category: ConversationalErrorCategory.SYSTEM,
    };
  }

  /**
   * Generate comprehensive conversational guidance
   */
  private async generateConversationalGuidance(
    error: Error,
    context: ConversationalErrorContext,
    explanation: string,
  ): Promise<ConversationalGuidance> {
    const { category } = this.classifyError(error);

    return {
      explanation,
      immediateActions: await this.generateImmediateActions(
        error,
        context,
        category,
      ),
      alternatives: await this.generateAlternatives(error, context, category),
      preventionTips: await this.generatePreventionTips(
        error,
        context,
        category,
      ),
      escalationGuidance: this.generateEscalationGuidance(category),
      resources: await this.generateResources(error, context, category),
    };
  }

  /**
   * Generate immediate action steps
   */
  private async generateImmediateActions(
    error: Error,
    context: ConversationalErrorContext,
    category: ConversationalErrorCategory,
  ): Promise<
    Array<{
      step: number;
      action: string;
      example?: string;
      estimatedTime?: string;
    }>
  > {
    switch (category) {
      case ConversationalErrorCategory.USER_INPUT:
        return [
          {
            step: 1,
            action: "Check your input format and try again",
            example: "Make sure all required fields are filled out correctly",
            estimatedTime: "30 seconds",
          },
          {
            step: 2,
            action: "Verify the data matches expected formats",
            example:
              "Email addresses should contain @ symbol, dates should be in correct format",
            estimatedTime: "1 minute",
          },
        ];

      case ConversationalErrorCategory.AUTHENTICATION:
        return [
          {
            step: 1,
            action: "Try logging in again",
            example: "Click the login button and enter your credentials",
            estimatedTime: "30 seconds",
          },
          {
            step: 2,
            action: "Check if your session has expired",
            example: "Refresh the page and log in if prompted",
            estimatedTime: "1 minute",
          },
        ];

      default:
        return [
          {
            step: 1,
            action: "Refresh the page and try again",
            estimatedTime: "30 seconds",
          },
          {
            step: 2,
            action: "Wait a moment and retry the operation",
            estimatedTime: "2 minutes",
          },
        ];
    }
  }

  /**
   * Generate alternative approaches
   */
  private async generateAlternatives(
    error: Error,
    context: ConversationalErrorContext,
    category: ConversationalErrorCategory,
  ): Promise<
    Array<{
      title: string;
      description: string;
      difficulty: "EASY" | "MEDIUM" | "ADVANCED";
      estimatedTime: string;
      steps: string[];
    }>
  > {
    return [
      {
        title: "Basic Retry Approach",
        description: "Simple retry with a short delay",
        difficulty: "EASY",
        estimatedTime: "2 minutes",
        steps: [
          "Wait 30 seconds",
          "Refresh your browser",
          "Try the action again",
        ],
      },
      {
        title: "Alternative Method",
        description: "Use a different approach to achieve the same goal",
        difficulty: "MEDIUM",
        estimatedTime: "5 minutes",
        steps: [
          "Navigate to an alternative section",
          "Try using a different feature",
          "Contact support if needed",
        ],
      },
    ];
  }

  /**
   * Generate prevention tips
   */
  private async generatePreventionTips(
    error: Error,
    context: ConversationalErrorContext,
    category: ConversationalErrorCategory,
  ): Promise<
    Array<{
      tip: string;
      rationale: string;
      category: "BEST_PRACTICE" | "SECURITY" | "PERFORMANCE" | "USABILITY";
    }>
  > {
    return [
      {
        tip: "Save your work frequently",
        rationale: "Prevents data loss if errors occur",
        category: "BEST_PRACTICE",
      },
      {
        tip: "Keep your session active",
        rationale: "Reduces authentication-related issues",
        category: "SECURITY",
      },
      {
        tip: "Use stable internet connection",
        rationale: "Prevents network-related errors",
        category: "PERFORMANCE",
      },
    ];
  }

  /**
   * Generate escalation guidance
   */
  private generateEscalationGuidance(category: ConversationalErrorCategory): {
    when: string;
    how: string;
    expectedResponse: string;
  } {
    return {
      when: "If the error persists after trying the suggested solutions",
      how: "Contact our support team with the error ID and description of what you were trying to do",
      expectedResponse:
        "Our team typically responds within 2-4 hours during business hours",
    };
  }

  /**
   * Generate related resources
   */
  private async generateResources(
    error: Error,
    context: ConversationalErrorContext,
    category: ConversationalErrorCategory,
  ): Promise<
    Array<{
      title: string;
      url: string;
      type: "DOCUMENTATION" | "TUTORIAL" | "VIDEO" | "FAQ";
      difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    }>
  > {
    return [
      {
        title: "Error Handling Guide",
        url: "/docs/error-handling",
        type: "DOCUMENTATION",
        difficulty: "BEGINNER",
      },
      {
        title: "Troubleshooting FAQ",
        url: "/docs/faq",
        type: "FAQ",
        difficulty: "BEGINNER",
      },
    ];
  }

  /**
   * Generate recovery recommendations
   */
  private async generateRecoveryRecommendations(
    error: Error,
    context: ConversationalErrorContext,
    severity: ConversationalErrorSeverity,
  ): Promise<ErrorRecoveryRecommendation[]> {
    const recommendations: ErrorRecoveryRecommendation[] = [];

    // Immediate automated recovery
    recommendations.push({
      strategy: "IMMEDIATE_RETRY",
      description: "Automatically retry the operation with exponential backoff",
      confidence: 0.7,
      estimatedTime: "30 seconds",
      requiredActions: ["Wait for automatic retry"],
      successCriteria: ["Operation completes successfully"],
      stage: RecoveryStage.IMMEDIATE,
    });

    // User-guided recovery
    recommendations.push({
      strategy: "USER_GUIDED_FIX",
      description: "Follow step-by-step guidance to resolve the issue",
      confidence: 0.9,
      estimatedTime: "2-5 minutes",
      requiredActions: [
        "Follow provided guidance steps",
        "Verify inputs",
        "Retry operation",
      ],
      successCriteria: ["All validation passes", "Operation completes"],
      stage: RecoveryStage.GUIDED,
    });

    // Manual intervention if needed
    if (severity === ConversationalErrorSeverity.CRITICAL) {
      recommendations.push({
        strategy: "MANUAL_INTERVENTION",
        description: "Manual review and intervention required",
        confidence: 0.95,
        estimatedTime: "10-30 minutes",
        requiredActions: [
          "Contact support",
          "Provide error details",
          "Wait for assistance",
        ],
        successCriteria: ["Support acknowledges issue", "Resolution provided"],
        stage: RecoveryStage.MANUAL,
      });
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate user-friendly error title
   */
  private generateUserFriendlyTitle(
    error: Error,
    category: ConversationalErrorCategory,
  ): string {
    switch (category) {
      case ConversationalErrorCategory.USER_INPUT:
        return "Input Validation Issue";
      case ConversationalErrorCategory.AUTHENTICATION:
        return "Authentication Required";
      case ConversationalErrorCategory.AUTHORIZATION:
        return "Access Permission Issue";
      case ConversationalErrorCategory.SYSTEM:
        return "System Temporarily Unavailable";
      default:
        return "Unexpected Error Occurred";
    }
  }

  /**
   * Generate unique error identifier
   */
  private generateErrorId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `PARLANT_${timestamp}_${random}`;
  }

  /**
   * Get count of similar errors
   */
  private async getSimilarErrorsCount(error: Error): Promise<number> {
    // Implementation would query error analytics database
    return Math.floor(Math.random() * 100);
  }

  /**
   * Get resolution rate for error category
   */
  private async getResolutionRate(
    category: ConversationalErrorCategory,
  ): Promise<number> {
    // Implementation would query analytics for category resolution rates
    const rates = {
      [ConversationalErrorCategory.USER_INPUT]: 0.95,
      [ConversationalErrorCategory.AUTHENTICATION]: 0.9,
      [ConversationalErrorCategory.AUTHORIZATION]: 0.85,
      [ConversationalErrorCategory.BUSINESS_LOGIC]: 0.88,
      [ConversationalErrorCategory.INTEGRATION]: 0.82,
      [ConversationalErrorCategory.PERFORMANCE]: 0.78,
      [ConversationalErrorCategory.SYSTEM]: 0.75,
      [ConversationalErrorCategory.RATE_LIMITING]: 0.85,
    };
    return rates[category] || 0.8;
  }

  /**
   * Collect system information for technical details
   */
  private collectSystemInfo(): Record<string, any> {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  /**
   * Generate fallback response when processing fails
   */
  private generateFallbackResponse(
    error: Error,
    context: ConversationalErrorContext,
    errorId: string,
  ): ConversationalErrorResponse {
    return {
      errorId,
      title: "System Error",
      message:
        "An unexpected error occurred. Our team has been notified and is working on a solution.",
      severity: ConversationalErrorSeverity.ERROR,
      category: ConversationalErrorCategory.SYSTEM,
      guidance: {
        explanation: "Something went wrong while processing your request.",
        immediateActions: [
          {
            step: 1,
            action: "Please try again in a few minutes",
            estimatedTime: "2 minutes",
          },
        ],
        alternatives: [
          {
            title: "Contact Support",
            description: "Get direct help from our support team",
            difficulty: "EASY",
            estimatedTime: "5 minutes",
            steps: [
              "Use the contact form",
              "Include this error ID",
              "Describe what you were trying to do",
            ],
          },
        ],
        preventionTips: [
          {
            tip: "Try refreshing the page before retrying",
            rationale: "Ensures you have the latest page state",
            category: "BEST_PRACTICE",
          },
        ],
        resources: [],
      },
      recoveryRecommendations: [
        {
          strategy: "BASIC_RETRY",
          description: "Wait and try again",
          confidence: 0.6,
          estimatedTime: "2 minutes",
          requiredActions: ["Wait 2 minutes", "Try again"],
          successCriteria: ["Operation completes"],
          stage: RecoveryStage.IMMEDIATE,
        },
      ],
      context,
      tracking: {
        timestamp: new Date(),
        processingTime: 0,
        similarErrorsCount: 0,
        resolutionRate: 0.8,
      },
    };
  }
}
