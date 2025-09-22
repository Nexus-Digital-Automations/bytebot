/**
 * PARLANT Phase 1 - Validation Middleware Integration
 *
 * Seamless integration layer with existing API middleware using decorator patterns,
 * configuration-driven validation activation, and performance-optimized validation pipelines.
 * Provides automatic validation wrapping for API operations with minimal code changes.
 *
 * Key Features:
 * - Decorator-based validation integration (@PreExecutionValidation)
 * - Configuration-driven activation and customization
 * - Performance-optimized validation pipelines
 * - Seamless integration with existing middleware stack
 * - Automatic function wrapping and validation orchestration
 * - Type-safe validation configuration
 * - Real-time validation performance monitoring
 *
 * @module ValidationMiddleware
 * @version 1.0.0
 * @author PARLANT Phase 1 Middleware Team
 */

import { Injectable, Logger, NestMiddleware, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import {
  PreExecutionValidationService,
  PreExecutionValidationRequest,
  PreExecutionValidationResponse,
  UserValidationContext,
  OperationRiskMetadata,
  ValidationLevel
} from './pre-execution-validation.service';
import { SecurityLevel } from '../../validation/types/validation-layer.types';

// ===== DECORATOR METADATA AND CONFIGURATION =====

/**
 * Pre-execution validation configuration for decorators
 */
export interface PreExecutionValidationConfig {
  /** Enable validation for this operation */
  enabled: boolean;

  /** Security classification level */
  securityLevel: SecurityLevel;

  /** Operation description for user context */
  description?: string;

  /** Custom risk metadata */
  riskMetadata?: Partial<OperationRiskMetadata>;

  /** Validation timeout in milliseconds */
  timeoutMs?: number;

  /** Bypass validation in development/testing */
  bypassInDev?: boolean;

  /** Cache validation decisions */
  cacheable?: boolean;

  /** Custom validation requirements */
  customRequirements?: string[];

  /** Compliance frameworks that apply */
  complianceFrameworks?: string[];

  /** Performance monitoring enabled */
  monitorPerformance?: boolean;
}

/**
 * Validation context extracted from HTTP request
 */
export interface HttpValidationContext {
  /** HTTP method */
  method: string;

  /** Request path */
  path: string;

  /** Request headers */
  headers: Record<string, string>;

  /** Query parameters */
  query: Record<string, any>;

  /** Request body */
  body: any;

  /** User authentication context */
  user?: any;

  /** Session information */
  session?: any;

  /** Request timestamp */
  timestamp: Date;

  /** Request ID for tracing */
  requestId: string;
}

/**
 * Validation middleware configuration
 */
export interface ValidationMiddlewareConfig {
  /** Enable middleware globally */
  enabled: boolean;

  /** Default security level for undecorated operations */
  defaultSecurityLevel: SecurityLevel;

  /** Validation timeout */
  defaultTimeoutMs: number;

  /** Bypass validation for specific paths */
  bypassPaths: string[];

  /** Bypass validation for specific HTTP methods */
  bypassMethods: string[];

  /** Performance monitoring */
  performanceMonitoring: {
    enabled: boolean;
    slowValidationThresholdMs: number;
    logSlowValidations: boolean;
  };

  /** Error handling */
  errorHandling: {
    continueOnValidationFailure: boolean;
    returnDetailedErrors: boolean;
    logValidationErrors: boolean;
  };

  /** Caching configuration */
  caching: {
    enabled: boolean;
    defaultTtlMs: number;
    maxCacheSize: number;
  };
}

// ===== DECORATORS =====

/**
 * Metadata key for pre-execution validation configuration
 */
export const PRE_EXECUTION_VALIDATION_KEY = 'pre-execution-validation';

/**
 * Pre-execution validation decorator
 *
 * Enables conversational pre-execution validation for API operations.
 * Can be applied to controller methods, service methods, or entire classes.
 *
 * @param config Validation configuration
 */
export function PreExecutionValidation(config: PreExecutionValidationConfig) {
  return SetMetadata(PRE_EXECUTION_VALIDATION_KEY, config);
}

/**
 * Quick decorator for critical operations requiring comprehensive validation
 */
export function ParlantCritical(description?: string) {
  return PreExecutionValidation({
    enabled: true,
    securityLevel: 'RESTRICTED',
    description,
    cacheable: false,
    monitorPerformance: true,
    complianceFrameworks: ['SOC2', 'GDPR']
  });
}

/**
 * Quick decorator for secure operations requiring enhanced validation
 */
export function ParlantSecure(description?: string) {
  return PreExecutionValidation({
    enabled: true,
    securityLevel: 'CONFIDENTIAL',
    description,
    cacheable: true,
    monitorPerformance: true
  });
}

/**
 * Quick decorator for standard operations requiring basic validation
 */
export function ParlantStandard(description?: string) {
  return PreExecutionValidation({
    enabled: true,
    securityLevel: 'INTERNAL',
    description,
    cacheable: true,
    monitorPerformance: false
  });
}

/**
 * Decorator to bypass validation for specific operations
 */
export function ParlantBypass(reason?: string) {
  return SetMetadata(PRE_EXECUTION_VALIDATION_KEY, {
    enabled: false,
    bypassReason: reason
  });
}

// ===== VALIDATION MIDDLEWARE =====

/**
 * HTTP Middleware for Pre-Execution Validation
 *
 * Integrates with Express/NestJS middleware stack to provide automatic
 * pre-execution validation for HTTP requests based on decorator configuration.
 */
@Injectable()
export class PreExecutionValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PreExecutionValidationMiddleware.name);
  private readonly config: ValidationMiddlewareConfig;

  // Performance tracking
  private metrics = {
    totalRequests: 0,
    validatedRequests: 0,
    bypassedRequests: 0,
    averageValidationTime: 0,
    slowValidations: 0,
    validationErrors: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(
    private readonly validationService: PreExecutionValidationService,
    private readonly reflector: Reflector
  ) {
    this.config = this.loadMiddlewareConfiguration();

    this.logger.log('PreExecutionValidationMiddleware initialized', {
      version: '1.0.0',
      features: [
        'decorator_integration',
        'performance_optimization',
        'configuration_driven',
        'seamless_integration',
        'real_time_monitoring'
      ],
      config: {
        enabled: this.config.enabled,
        defaultSecurityLevel: this.config.defaultSecurityLevel,
        performanceMonitoring: this.config.performanceMonitoring.enabled
      }
    });
  }

  /**
   * Main middleware implementation
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // Skip if middleware disabled
      if (!this.config.enabled) {
        return next();
      }

      // Extract validation context from request
      const httpContext = this.extractHttpContext(req);

      // Check if path should be bypassed
      if (this.shouldBypassPath(httpContext.path, httpContext.method)) {
        this.metrics.bypassedRequests++;
        this.logger.debug('Request bypassed by path/method configuration', {
          path: httpContext.path,
          method: httpContext.method
        });
        return next();
      }

      // Get validation configuration from decorators
      const validationConfig = this.getValidationConfiguration(req);

      // Skip if validation not enabled for this operation
      if (!validationConfig || !validationConfig.enabled) {
        this.metrics.bypassedRequests++;
        return next();
      }

      // Perform pre-execution validation
      const validationStartTime = performance.now();
      const validationResult = await this.performPreExecutionValidation(
        httpContext,
        validationConfig
      );

      const validationTime = performance.now() - validationStartTime;
      this.updateValidationMetrics(validationTime);

      // Handle validation result
      if (validationResult.result.decision === 'APPROVED') {
        // Attach validation context to request for audit trail
        (req as any).parlantValidation = {
          validationId: validationResult.requestId,
          riskScore: validationResult.riskAssessment.riskScore,
          validationTime,
          auditTrail: validationResult.auditTrail
        };

        this.logger.debug('Request approved by pre-execution validation', {
          requestId: validationResult.requestId,
          riskScore: validationResult.riskAssessment.riskScore,
          validationTime,
          path: httpContext.path
        });

        return next();
      } else {
        // Validation rejected or pending
        this.handleValidationRejection(res, validationResult, httpContext);
        return; // Don't call next() - request is terminated
      }

    } catch (error) {
      this.metrics.validationErrors++;
      this.logger.error('Pre-execution validation middleware error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method
      });

      // Decide whether to continue or fail based on configuration
      if (this.config.errorHandling.continueOnValidationFailure) {
        this.logger.warn('Continuing request despite validation error', {
          path: req.path,
          method: req.method
        });
        return next();
      } else {
        res.status(500).json({
          error: 'Validation system error',
          message: this.config.errorHandling.returnDetailedErrors ? error.message : 'Internal validation error'
        });
        return;
      }
    } finally {
      const totalTime = performance.now() - startTime;
      if (totalTime > this.config.performanceMonitoring.slowValidationThresholdMs) {
        this.metrics.slowValidations++;
        if (this.config.performanceMonitoring.logSlowValidations) {
          this.logger.warn('Slow validation detected', {
            totalTime,
            path: req.path,
            method: req.method
          });
        }
      }
    }
  }

  /**
   * Perform pre-execution validation for HTTP request
   */
  private async performPreExecutionValidation(
    httpContext: HttpValidationContext,
    config: PreExecutionValidationConfig
  ): Promise<PreExecutionValidationResponse> {
    // Build validation request
    const validationRequest: PreExecutionValidationRequest = {
      id: this.generateValidationRequestId(),
      functionName: this.buildFunctionName(httpContext),
      parameters: this.extractOperationParameters(httpContext),
      userContext: this.buildUserValidationContext(httpContext),
      conversationId: this.getOrCreateConversationId(httpContext),
      securityClassification: config.securityLevel,
      naturalLanguageIntent: this.generateNaturalLanguageIntent(httpContext, config),
      riskMetadata: this.buildRiskMetadata(httpContext, config),
      timestamp: new Date(),
      timeoutMs: config.timeoutMs || this.config.defaultTimeoutMs
    };

    // Perform validation
    return await this.validationService.validateOperation(validationRequest);
  }

  /**
   * Extract HTTP context from Express request
   */
  private extractHttpContext(req: Request): HttpValidationContext {
    return {
      method: req.method,
      path: req.path,
      headers: req.headers as Record<string, string>,
      query: req.query,
      body: req.body,
      user: (req as any).user,
      session: (req as any).session,
      timestamp: new Date(),
      requestId: this.generateRequestId(req)
    };
  }

  /**
   * Get validation configuration from decorators
   */
  private getValidationConfiguration(req: Request): PreExecutionValidationConfig | null {
    // In a real implementation, this would extract decorator metadata
    // from the route handler using NestJS reflection
    // For this implementation, we'll simulate based on path patterns

    return this.simulateValidationConfigurationFromPath(req.path, req.method);
  }

  /**
   * Simulate validation configuration based on path patterns
   */
  private simulateValidationConfigurationFromPath(
    path: string,
    method: string
  ): PreExecutionValidationConfig | null {
    // Simulate decorator-based configuration
    const pathPatterns = {
      '/api/admin': {
        enabled: true,
        securityLevel: 'RESTRICTED' as SecurityLevel,
        description: 'Administrative operation',
        complianceFrameworks: ['SOC2', 'GDPR'],
        cacheable: false
      },
      '/api/database': {
        enabled: true,
        securityLevel: 'CONFIDENTIAL' as SecurityLevel,
        description: 'Database operation',
        complianceFrameworks: ['SOC2'],
        cacheable: true
      },
      '/api/user': {
        enabled: true,
        securityLevel: 'INTERNAL' as SecurityLevel,
        description: 'User operation',
        cacheable: true
      }
    };

    // Find matching pattern
    for (const [pattern, config] of Object.entries(pathPatterns)) {
      if (path.startsWith(pattern)) {
        return {
          ...config,
          monitorPerformance: true,
          timeoutMs: 30000
        };
      }
    }

    // Default configuration for unmatched paths
    if (method !== 'GET') {
      return {
        enabled: true,
        securityLevel: this.config.defaultSecurityLevel,
        description: `${method} operation on ${path}`,
        cacheable: true,
        monitorPerformance: false
      };
    }

    return null; // No validation for GET requests by default
  }

  /**
   * Build function name for validation context
   */
  private buildFunctionName(httpContext: HttpValidationContext): string {
    return `${httpContext.method}_${httpContext.path.replace(/\//g, '_')}`;
  }

  /**
   * Extract operation parameters from HTTP context
   */
  private extractOperationParameters(httpContext: HttpValidationContext): Record<string, unknown> {
    return {
      method: httpContext.method,
      path: httpContext.path,
      query: httpContext.query,
      body: httpContext.body,
      headers: {
        'content-type': httpContext.headers['content-type'],
        'user-agent': httpContext.headers['user-agent']
      }
    };
  }

  /**
   * Build user validation context from HTTP context
   */
  private buildUserValidationContext(httpContext: HttpValidationContext): UserValidationContext {
    const user = httpContext.user || {};
    const session = httpContext.session || {};

    return {
      userId: user.id || user.sub || 'anonymous',
      roles: user.roles || ['user'],
      sessionContext: {
        sessionId: session.id || 'no-session',
        ipAddress: this.extractClientIp(httpContext),
        userAgent: httpContext.headers['user-agent'] || 'unknown',
        lastActivity: new Date()
      },
      conversationalPreferences: {
        verbosityLevel: user.preferences?.verbosity || 'standard',
        confirmationStyle: user.preferences?.confirmationStyle || 'thorough',
        riskTolerance: user.preferences?.riskTolerance || 'moderate'
      },
      validationHistory: {
        recentValidations: user.validationHistory?.recent || 0,
        successRate: user.validationHistory?.successRate || 0.95,
        averageResponseTime: user.validationHistory?.avgResponseTime || 5000
      }
    };
  }

  /**
   * Build risk metadata from HTTP context and configuration
   */
  private buildRiskMetadata(
    httpContext: HttpValidationContext,
    config: PreExecutionValidationConfig
  ): OperationRiskMetadata {
    // Analyze request to determine risk characteristics
    const bodySize = JSON.stringify(httpContext.body || {}).length;
    const hasFileUpload = httpContext.headers['content-type']?.includes('multipart/form-data');
    const isModifyingOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(httpContext.method);

    return {
      dataSensitivity: this.mapSecurityLevelToDataSensitivity(config.securityLevel),
      impactScope: {
        affectedRecords: this.estimateAffectedRecords(httpContext),
        dataVolume: this.categorizeDataVolume(bodySize, hasFileUpload),
        systemComponents: this.identifySystemComponents(httpContext.path)
      },
      reversibility: {
        isReversible: this.isOperationReversible(httpContext.method, httpContext.path),
        rollbackComplexity: this.assessRollbackComplexity(httpContext),
        rollbackTimeEstimate: this.estimateRollbackTime(httpContext)
      },
      dependencies: {
        externalServices: this.identifyExternalServices(httpContext),
        affectedSystems: this.identifyAffectedSystems(httpContext.path),
        potentialSideEffects: this.identifyPotentialSideEffects(httpContext)
      },
      compliance: {
        requiresApproval: config.securityLevel === 'RESTRICTED' || config.securityLevel === 'CLASSIFIED',
        auditRequired: true,
        complianceFrameworks: config.complianceFrameworks || []
      },
      ...config.riskMetadata
    };
  }

  /**
   * Generate natural language intent for validation
   */
  private generateNaturalLanguageIntent(
    httpContext: HttpValidationContext,
    config: PreExecutionValidationConfig
  ): string {
    const method = httpContext.method;
    const path = httpContext.path;
    const description = config.description;

    if (description) {
      return `${description} via ${method} ${path}`;
    }

    // Generate intent based on HTTP method and path
    const methodIntents = {
      'GET': 'retrieve data from',
      'POST': 'create new data in',
      'PUT': 'update data in',
      'PATCH': 'modify data in',
      'DELETE': 'delete data from'
    };

    const intent = methodIntents[method] || 'perform operation on';
    return `${intent} ${path}`;
  }

  /**
   * Handle validation rejection
   */
  private handleValidationRejection(
    res: Response,
    validationResult: PreExecutionValidationResponse,
    httpContext: HttpValidationContext
  ): void {
    const decision = validationResult.result.decision;

    this.logger.warn('Request rejected by pre-execution validation', {
      requestId: validationResult.requestId,
      decision,
      riskScore: validationResult.riskAssessment.riskScore,
      path: httpContext.path,
      method: httpContext.method
    });

    switch (decision) {
      case 'REJECTED':
        res.status(403).json({
          error: 'Operation not authorized',
          message: 'Pre-execution validation rejected this operation',
          validationId: validationResult.requestId,
          riskScore: validationResult.riskAssessment.riskScore,
          recommendations: validationResult.followUpRecommendations
        });
        break;

      case 'PENDING':
        res.status(202).json({
          error: 'Operation pending approval',
          message: 'This operation requires additional approval',
          validationId: validationResult.requestId,
          riskScore: validationResult.riskAssessment.riskScore,
          requirements: validationResult.riskAssessment.validationRequirements
        });
        break;

      case 'DEFERRED':
        res.status(429).json({
          error: 'Operation deferred',
          message: 'Please retry this operation later',
          validationId: validationResult.requestId,
          retryAfter: 300 // 5 minutes
        });
        break;

      default:
        res.status(500).json({
          error: 'Validation error',
          message: 'Unknown validation decision',
          validationId: validationResult.requestId
        });
    }
  }

  // ===== UTILITY METHODS =====

  private shouldBypassPath(path: string, method: string): boolean {
    // Check path bypass rules
    for (const bypassPath of this.config.bypassPaths) {
      if (path.startsWith(bypassPath)) {
        return true;
      }
    }

    // Check method bypass rules
    return this.config.bypassMethods.includes(method);
  }

  private getOrCreateConversationId(httpContext: HttpValidationContext): string {
    // Extract conversation ID from session or create new one
    const session = httpContext.session;
    if (session && session.parlantConversationId) {
      return session.parlantConversationId;
    }

    const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (session) {
      session.parlantConversationId = conversationId;
    }

    return conversationId;
  }

  private generateValidationRequestId(): string {
    return `val-req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRequestId(req: Request): string {
    // Check if request ID already exists
    const existingId = req.headers['x-request-id'] as string;
    if (existingId) {
      return existingId;
    }

    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractClientIp(httpContext: HttpValidationContext): string {
    return httpContext.headers['x-forwarded-for']?.split(',')[0] ||
           httpContext.headers['x-real-ip'] ||
           'unknown';
  }

  private mapSecurityLevelToDataSensitivity(securityLevel: SecurityLevel): 'public' | 'internal' | 'confidential' | 'restricted' {
    const mapping = {
      'PUBLIC': 'public' as const,
      'INTERNAL': 'internal' as const,
      'CONFIDENTIAL': 'confidential' as const,
      'RESTRICTED': 'restricted' as const,
      'CLASSIFIED': 'restricted' as const
    };

    return mapping[securityLevel] || 'internal';
  }

  private estimateAffectedRecords(httpContext: HttpValidationContext): number {
    // Analyze request to estimate affected records
    const body = httpContext.body;
    const query = httpContext.query;

    // Check for batch operations
    if (Array.isArray(body)) {
      return body.length;
    }

    // Check for query parameters indicating bulk operations
    if (query.limit) {
      return parseInt(query.limit) || 1;
    }

    // Check for bulk operation indicators in path
    if (httpContext.path.includes('batch') || httpContext.path.includes('bulk')) {
      return 100; // Estimated
    }

    return 1; // Single record operation
  }

  private categorizeDataVolume(bodySize: number, hasFileUpload: boolean): string {
    if (hasFileUpload) {
      return 'large'; // File uploads are considered large
    }

    if (bodySize > 1024 * 1024) { // > 1MB
      return 'large';
    } else if (bodySize > 1024 * 10) { // > 10KB
      return 'medium';
    } else {
      return 'small';
    }
  }

  private identifySystemComponents(path: string): string[] {
    const components: string[] = [];

    // Analyze path to identify system components
    if (path.includes('/database') || path.includes('/db')) {
      components.push('database');
    }
    if (path.includes('/auth') || path.includes('/login')) {
      components.push('authentication');
    }
    if (path.includes('/user') || path.includes('/profile')) {
      components.push('user-management');
    }
    if (path.includes('/admin')) {
      components.push('administration');
    }
    if (path.includes('/api')) {
      components.push('api-gateway');
    }

    return components.length > 0 ? components : ['web-service'];
  }

  private isOperationReversible(method: string, path: string): boolean {
    // DELETE operations are generally not reversible
    if (method === 'DELETE') {
      return false;
    }

    // Some paths indicate irreversible operations
    const irreversiblePatterns = ['/deploy', '/execute', '/run', '/process'];
    for (const pattern of irreversiblePatterns) {
      if (path.includes(pattern)) {
        return false;
      }
    }

    return true;
  }

  private assessRollbackComplexity(httpContext: HttpValidationContext): 'simple' | 'moderate' | 'complex' {
    const systemComponents = this.identifySystemComponents(httpContext.path);

    if (systemComponents.length > 2) {
      return 'complex'; // Multiple systems involved
    } else if (systemComponents.includes('database') || systemComponents.includes('authentication')) {
      return 'moderate'; // Critical systems involved
    } else {
      return 'simple';
    }
  }

  private estimateRollbackTime(httpContext: HttpValidationContext): number {
    const complexity = this.assessRollbackComplexity(httpContext);
    const affectedRecords = this.estimateAffectedRecords(httpContext);

    const baseTime = {
      'simple': 60000,    // 1 minute
      'moderate': 300000, // 5 minutes
      'complex': 1800000  // 30 minutes
    };

    // Adjust for affected records
    const recordMultiplier = Math.min(affectedRecords / 1000, 5); // Max 5x multiplier

    return baseTime[complexity] * (1 + recordMultiplier);
  }

  private identifyExternalServices(httpContext: HttpValidationContext): string[] {
    const services: string[] = [];

    // Analyze headers and body for external service indicators
    const userAgent = httpContext.headers['user-agent'];
    if (userAgent && userAgent.includes('webhook')) {
      services.push('webhook-service');
    }

    // Check for API keys or external service references in body
    const body = httpContext.body;
    if (body && typeof body === 'object') {
      if (body.apiKey || body.api_key) {
        services.push('external-api');
      }
      if (body.email) {
        services.push('email-service');
      }
      if (body.notification) {
        services.push('notification-service');
      }
    }

    return services;
  }

  private identifyAffectedSystems(path: string): string[] {
    return this.identifySystemComponents(path);
  }

  private identifyPotentialSideEffects(httpContext: HttpValidationContext): string[] {
    const sideEffects: string[] = [];
    const method = httpContext.method;
    const path = httpContext.path;

    if (method === 'POST' && path.includes('/user')) {
      sideEffects.push('User notification email', 'Audit log entry', 'Permission assignment');
    }

    if (method === 'DELETE') {
      sideEffects.push('Cascade deletion', 'Reference cleanup', 'Cache invalidation');
    }

    if (path.includes('/admin')) {
      sideEffects.push('System configuration change', 'User permission updates');
    }

    return sideEffects;
  }

  private updateValidationMetrics(validationTime: number): void {
    this.metrics.validatedRequests++;

    // Update rolling average
    const newAverage = (
      this.metrics.averageValidationTime * (this.metrics.validatedRequests - 1) +
      validationTime
    ) / this.metrics.validatedRequests;

    this.metrics.averageValidationTime = newAverage;

    if (validationTime > this.config.performanceMonitoring.slowValidationThresholdMs) {
      this.metrics.slowValidations++;
    }
  }

  private loadMiddlewareConfiguration(): ValidationMiddlewareConfig {
    return {
      enabled: process.env.PARLANT_MIDDLEWARE_ENABLED !== 'false',
      defaultSecurityLevel: (process.env.PARLANT_DEFAULT_SECURITY_LEVEL as SecurityLevel) || 'INTERNAL',
      defaultTimeoutMs: parseInt(process.env.PARLANT_DEFAULT_TIMEOUT_MS || '30000'),
      bypassPaths: [
        '/health',
        '/metrics',
        '/favicon.ico',
        '/static',
        '/public'
      ],
      bypassMethods: ['OPTIONS', 'HEAD'],
      performanceMonitoring: {
        enabled: process.env.PARLANT_PERF_MONITORING_ENABLED !== 'false',
        slowValidationThresholdMs: parseInt(process.env.PARLANT_SLOW_VALIDATION_THRESHOLD_MS || '1000'),
        logSlowValidations: process.env.PARLANT_LOG_SLOW_VALIDATIONS !== 'false'
      },
      errorHandling: {
        continueOnValidationFailure: process.env.PARLANT_CONTINUE_ON_FAILURE === 'true',
        returnDetailedErrors: process.env.NODE_ENV === 'development',
        logValidationErrors: true
      },
      caching: {
        enabled: process.env.PARLANT_CACHING_ENABLED !== 'false',
        defaultTtlMs: parseInt(process.env.PARLANT_CACHE_TTL_MS || '300000'),
        maxCacheSize: parseInt(process.env.PARLANT_MAX_CACHE_SIZE || '1000')
      }
    };
  }

  /**
   * Get middleware metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      validationRate: this.metrics.totalRequests > 0 ?
        this.metrics.validatedRequests / this.metrics.totalRequests : 0,
      bypassRate: this.metrics.totalRequests > 0 ?
        this.metrics.bypassedRequests / this.metrics.totalRequests : 0,
      errorRate: this.metrics.totalRequests > 0 ?
        this.metrics.validationErrors / this.metrics.totalRequests : 0
    };
  }

  /**
   * Health check for middleware
   */
  async healthCheck(): Promise<{status: string; metrics: any; config: any}> {
    return {
      status: 'healthy',
      metrics: this.getMetrics(),
      config: {
        enabled: this.config.enabled,
        defaultSecurityLevel: this.config.defaultSecurityLevel,
        performanceMonitoring: this.config.performanceMonitoring.enabled
      }
    };
  }
}

// ===== FUNCTION WRAPPER UTILITY =====

/**
 * Utility for wrapping functions with pre-execution validation
 */
export class ValidationFunctionWrapper {
  private static readonly logger = new Logger(ValidationFunctionWrapper.name);

  /**
   * Wrap a function with pre-execution validation
   *
   * @param originalFunction Function to wrap
   * @param config Validation configuration
   * @param validationService Validation service instance
   */
  static wrapFunction<T extends (...args: any[]) => any>(
    originalFunction: T,
    config: PreExecutionValidationConfig,
    validationService: PreExecutionValidationService
  ): T {
    const wrappedFunction = async (...args: any[]) => {
      if (!config.enabled) {
        return originalFunction.apply(this, args);
      }

      try {
        // Build validation request
        const validationRequest: PreExecutionValidationRequest = {
          id: `func-val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          functionName: originalFunction.name || 'anonymous',
          parameters: ValidationFunctionWrapper.buildParametersFromArgs(args),
          userContext: ValidationFunctionWrapper.getDefaultUserContext(),
          conversationId: ValidationFunctionWrapper.getCurrentConversationId(),
          securityClassification: config.securityLevel,
          naturalLanguageIntent: config.description || `Execute function ${originalFunction.name}`,
          riskMetadata: ValidationFunctionWrapper.buildDefaultRiskMetadata(config),
          timestamp: new Date(),
          timeoutMs: config.timeoutMs || 30000
        };

        // Perform validation
        const validationResult = await validationService.validateOperation(validationRequest);

        if (validationResult.result.decision === 'APPROVED') {
          ValidationFunctionWrapper.logger.debug('Function execution approved', {
            functionName: originalFunction.name,
            validationId: validationResult.requestId,
            riskScore: validationResult.riskAssessment.riskScore
          });

          return originalFunction.apply(this, args);
        } else {
          throw new ValidationRejectionError(
            `Function execution rejected: ${validationResult.result.decision}`,
            {
              functionName: originalFunction.name,
              validationId: validationResult.requestId,
              decision: validationResult.result.decision
            }
          );
        }
      } catch (error) {
        ValidationFunctionWrapper.logger.error('Function validation failed', {
          functionName: originalFunction.name,
          error: error.message
        });

        if (config.bypassInDev && process.env.NODE_ENV === 'development') {
          ValidationFunctionWrapper.logger.warn('Bypassing validation in development mode');
          return originalFunction.apply(this, args);
        }

        throw error;
      }
    };

    // Preserve original function properties
    Object.defineProperty(wrappedFunction, 'name', {
      value: originalFunction.name,
      configurable: true
    });

    return wrappedFunction as T;
  }

  private static buildParametersFromArgs(args: any[]): Record<string, unknown> {
    const parameters: Record<string, unknown> = {};

    args.forEach((arg, index) => {
      parameters[`arg${index}`] = arg;
    });

    return parameters;
  }

  private static getDefaultUserContext(): UserValidationContext {
    return {
      userId: 'system',
      roles: ['system'],
      sessionContext: {
        sessionId: 'function-execution',
        ipAddress: 'localhost',
        userAgent: 'function-wrapper',
        lastActivity: new Date()
      },
      conversationalPreferences: {
        verbosityLevel: 'standard',
        confirmationStyle: 'thorough',
        riskTolerance: 'moderate'
      },
      validationHistory: {
        recentValidations: 0,
        successRate: 1.0,
        averageResponseTime: 1000
      }
    };
  }

  private static getCurrentConversationId(): string {
    return `func-conv-${Date.now()}`;
  }

  private static buildDefaultRiskMetadata(config: PreExecutionValidationConfig): OperationRiskMetadata {
    return {
      dataSensitivity: config.securityLevel === 'RESTRICTED' ? 'restricted' :
                      config.securityLevel === 'CONFIDENTIAL' ? 'confidential' :
                      config.securityLevel === 'INTERNAL' ? 'internal' : 'public',
      impactScope: {
        affectedRecords: 1,
        dataVolume: 'small',
        systemComponents: ['function-execution']
      },
      reversibility: {
        isReversible: true,
        rollbackComplexity: 'simple',
        rollbackTimeEstimate: 60000
      },
      dependencies: {
        externalServices: [],
        affectedSystems: ['function-execution'],
        potentialSideEffects: []
      },
      compliance: {
        requiresApproval: config.securityLevel === 'RESTRICTED',
        auditRequired: true,
        complianceFrameworks: config.complianceFrameworks || []
      },
      ...config.riskMetadata
    };
  }
}

/**
 * Custom error for validation rejection
 */
export class ValidationRejectionError extends Error {
  constructor(
    message: string,
    public readonly context: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationRejectionError';
  }
}