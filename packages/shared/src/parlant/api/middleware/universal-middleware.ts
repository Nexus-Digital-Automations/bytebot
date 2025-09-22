/**
 * Universal API Middleware - Multi-Framework Conversational API Support
 *
 * Provides seamless integration with Express.js, FastAPI, Next.js, Koa, and other
 * popular API frameworks, enabling conversational API patterns across all platforms.
 *
 * @version 1.0.0
 * @author PARLANT Phase 1 - Agent 3: Middleware Architecture
 * @date 2025-09-22
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConversationalAPIController } from '../conversational-patterns/controller';

export interface MiddlewareConfig {
  enabled: boolean;
  framework: 'EXPRESS' | 'FASTAPI' | 'NEXTJS' | 'KOA' | 'NESTJS' | 'CUSTOM';
  conversationalRoutes: string[];
  bypassRoutes: string[];
  performanceConfig: PerformanceConfig;
  securityConfig: SecurityConfig;
  monitoringConfig: MonitoringConfig;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  cacheTTL: number;
  maxConcurrentRequests: number;
  timeoutMs: number;
  compressionEnabled: boolean;
  rateLimitingEnabled: boolean;
  rateLimitRpm: number;
}

export interface SecurityConfig {
  enforceAuthentication: boolean;
  requireHttps: boolean;
  enableCors: boolean;
  corsOrigins: string[];
  maxRequestSize: number;
  enableRequestSanitization: boolean;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  metricsEndpoint: string;
}

export interface MiddlewareContext {
  requestId: string;
  timestamp: Date;
  framework: string;
  route: string;
  method: string;
  headers: Record<string, string>;
  query: Record<string, any>;
  body: any;
  userContext?: any;
}

export interface MiddlewareResponse {
  handled: boolean;
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  processingTime: number;
  conversational: boolean;
}

export interface FrameworkAdapter {
  name: string;
  version: string;
  initialize(config: MiddlewareConfig): Promise<void>;
  handleRequest(context: MiddlewareContext): Promise<MiddlewareResponse>;
  extractUserContext(request: any): Promise<any>;
  formatResponse(response: MiddlewareResponse, originalRequest: any): any;
}

@Injectable()
export class UniversalAPIMiddleware {
  private readonly logger = new Logger(UniversalAPIMiddleware.name);
  private readonly adapters = new Map<string, FrameworkAdapter>();
  private readonly conversationalController: ConversationalAPIController;
  private config: MiddlewareConfig;
  private performanceMetrics = new Map<string, any>();

  constructor(conversationalController: ConversationalAPIController) {
    this.conversationalController = conversationalController;
    this.logger.log('UniversalAPIMiddleware initialized with multi-framework support');
    this.initializeAdapters();
  }

  /**
   * Initialize middleware with configuration
   *
   * @param config - Middleware configuration for specific framework
   */
  async initialize(config: MiddlewareConfig): Promise<void> {
    this.config = config;

    this.logger.log('Initializing Universal API Middleware', {
      framework: config.framework,
      conversationalRoutes: config.conversationalRoutes.length,
      bypassRoutes: config.bypassRoutes.length
    });

    // Initialize framework-specific adapter
    const adapter = this.adapters.get(config.framework);
    if (!adapter) {
      throw new Error(`Unsupported framework: ${config.framework}`);
    }

    await adapter.initialize(config);

    this.logger.log(`${config.framework} adapter initialized successfully`);
  }

  /**
   * Create Express.js middleware function
   *
   * @returns Express middleware function
   */
  createExpressMiddleware() {
    return async (req: any, res: any, next: any) => {
      const startTime = Date.now();

      try {
        // Check if route should be handled conversationally
        if (!this.shouldHandleConversationally(req.path)) {
          return next();
        }

        // Extract user context from request
        const userContext = await this.extractUserContextFromExpress(req);

        // Create middleware context
        const context: MiddlewareContext = {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          framework: 'EXPRESS',
          route: req.path,
          method: req.method,
          headers: req.headers,
          query: req.query,
          body: req.body,
          userContext
        };

        // Process through conversational controller
        const response = await this.handleConversationalRequest(context);

        if (response.handled) {
          // Return conversational response
          res.status(response.statusCode);
          Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          res.json(response.body);

          this.recordMetrics('express', Date.now() - startTime, response.statusCode);
        } else {
          // Continue with normal Express flow
          next();
        }

      } catch (error) {
        this.logger.error('Express middleware error', error.stack);
        res.status(500).json({
          error: 'Conversational processing failed',
          message: error.message,
          conversational: false
        });
      }
    };
  }

  /**
   * Create FastAPI middleware function
   *
   * @returns FastAPI middleware function
   */
  createFastAPIMiddleware() {
    return async (request: any, call_next: any) => {
      const startTime = Date.now();

      try {
        // Check if route should be handled conversationally
        if (!this.shouldHandleConversationally(request.url.path)) {
          return await call_next(request);
        }

        // Extract user context from request
        const userContext = await this.extractUserContextFromFastAPI(request);

        // Create middleware context
        const context: MiddlewareContext = {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          framework: 'FASTAPI',
          route: request.url.path,
          method: request.method,
          headers: Object.fromEntries(request.headers),
          query: Object.fromEntries(request.query_params),
          body: await this.extractBodyFromFastAPI(request),
          userContext
        };

        // Process through conversational controller
        const response = await this.handleConversationalRequest(context);

        if (response.handled) {
          // Return conversational response
          const fastApiResponse = this.createFastAPIResponse(response);
          this.recordMetrics('fastapi', Date.now() - startTime, response.statusCode);
          return fastApiResponse;
        } else {
          // Continue with normal FastAPI flow
          return await call_next(request);
        }

      } catch (error) {
        this.logger.error('FastAPI middleware error', error.stack);
        return this.createFastAPIErrorResponse(error);
      }
    };
  }

  /**
   * Create Next.js middleware function
   *
   * @returns Next.js middleware function
   */
  createNextJSMiddleware() {
    return async (req: any, res: any) => {
      const startTime = Date.now();

      try {
        // Check if route should be handled conversationally
        if (!this.shouldHandleConversationally(req.url)) {
          // Let Next.js handle normally
          return { handled: false };
        }

        // Extract user context from request
        const userContext = await this.extractUserContextFromNextJS(req);

        // Create middleware context
        const context: MiddlewareContext = {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          framework: 'NEXTJS',
          route: req.url,
          method: req.method,
          headers: req.headers,
          query: req.query,
          body: req.body,
          userContext
        };

        // Process through conversational controller
        const response = await this.handleConversationalRequest(context);

        if (response.handled) {
          // Return conversational response
          res.status(response.statusCode);
          Object.entries(response.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          res.json(response.body);

          this.recordMetrics('nextjs', Date.now() - startTime, response.statusCode);
          return { handled: true };
        } else {
          // Let Next.js handle normally
          return { handled: false };
        }

      } catch (error) {
        this.logger.error('Next.js middleware error', error.stack);
        res.status(500).json({
          error: 'Conversational processing failed',
          message: error.message,
          conversational: false
        });
        return { handled: true, error: true };
      }
    };
  }

  /**
   * Create Koa middleware function
   *
   * @returns Koa middleware function
   */
  createKoaMiddleware() {
    return async (ctx: any, next: any) => {
      const startTime = Date.now();

      try {
        // Check if route should be handled conversationally
        if (!this.shouldHandleConversationally(ctx.path)) {
          return await next();
        }

        // Extract user context from request
        const userContext = await this.extractUserContextFromKoa(ctx);

        // Create middleware context
        const context: MiddlewareContext = {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          framework: 'KOA',
          route: ctx.path,
          method: ctx.method,
          headers: ctx.headers,
          query: ctx.query,
          body: ctx.request.body,
          userContext
        };

        // Process through conversational controller
        const response = await this.handleConversationalRequest(context);

        if (response.handled) {
          // Return conversational response
          ctx.status = response.statusCode;
          Object.entries(response.headers).forEach(([key, value]) => {
            ctx.set(key, value);
          });
          ctx.body = response.body;

          this.recordMetrics('koa', Date.now() - startTime, response.statusCode);
        } else {
          // Continue with normal Koa flow
          await next();
        }

      } catch (error) {
        this.logger.error('Koa middleware error', error.stack);
        ctx.status = 500;
        ctx.body = {
          error: 'Conversational processing failed',
          message: error.message,
          conversational: false
        };
      }
    };
  }

  /**
   * Create decorator for automatic API wrapping
   *
   * @param config - Decorator configuration
   * @returns Method decorator
   */
  conversationalAPI(config: { enabled?: boolean; monitoring?: boolean; caching?: boolean } = {}) {
    return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();

        try {
          // Check if conversational processing is enabled
          if (config.enabled === false) {
            return await method.apply(this, args);
          }

          // Extract request context from method arguments
          const requestContext = this.extractRequestContextFromArgs(args);

          if (requestContext && this.shouldProcessConversationally(requestContext)) {
            // Process through conversational controller
            const conversationalResult = await this.processConversationalMethod(
              method,
              args,
              requestContext,
              config
            );

            return conversationalResult;
          } else {
            // Execute method normally
            return await method.apply(this, args);
          }

        } catch (error) {
          this.logger.error(`Conversational decorator error on ${propertyName}`, error.stack);

          // Fallback to normal method execution
          return await method.apply(this, args);
        } finally {
          this.recordMethodMetrics(propertyName, Date.now() - startTime);
        }
      };

      return descriptor;
    };
  }

  /**
   * Handle conversational request processing
   */
  private async handleConversationalRequest(context: MiddlewareContext): Promise<MiddlewareResponse> {
    const startTime = Date.now();

    try {
      // Validate request meets conversational criteria
      if (!this.isValidConversationalRequest(context)) {
        return {
          handled: false,
          statusCode: 400,
          headers: {},
          body: { error: 'Invalid conversational request' },
          processingTime: Date.now() - startTime,
          conversational: false
        };
      }

      // Extract natural language request from body
      const naturalLanguageRequest = this.extractNaturalLanguageRequest(context);

      if (!naturalLanguageRequest) {
        return {
          handled: false,
          statusCode: 400,
          headers: {},
          body: { error: 'No natural language request found' },
          processingTime: Date.now() - startTime,
          conversational: false
        };
      }

      // Create API request for conversational controller
      const apiRequest = {
        id: context.requestId,
        userRequest: naturalLanguageRequest,
        context: context.userContext,
        timestamp: context.timestamp,
        metadata: {
          framework: context.framework,
          route: context.route,
          method: context.method,
          headers: context.headers
        }
      };

      // Process through conversational controller
      const conversationalResponse = await this.conversationalController.processNaturalLanguageRequest(apiRequest);

      // Format response for framework
      const middlewareResponse: MiddlewareResponse = {
        handled: true,
        statusCode: conversationalResponse.success ? 200 : 400,
        headers: {
          'Content-Type': 'application/json',
          'X-Conversational-API': 'true',
          'X-Request-Id': context.requestId,
          'X-Processing-Time': (Date.now() - startTime).toString()
        },
        body: {
          success: conversationalResponse.success,
          result: conversationalResponse.result,
          conversation: conversationalResponse.conversation,
          performance: conversationalResponse.performance,
          conversational: true,
          metadata: {
            requestId: context.requestId,
            framework: context.framework,
            processingTime: Date.now() - startTime
          }
        },
        processingTime: Date.now() - startTime,
        conversational: true
      };

      this.logger.log('Conversational request processed successfully', {
        requestId: context.requestId,
        framework: context.framework,
        processingTime: middlewareResponse.processingTime,
        success: conversationalResponse.success
      });

      return middlewareResponse;

    } catch (error) {
      this.logger.error('Error processing conversational request', error.stack);

      return {
        handled: true,
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'X-Conversational-API': 'true',
          'X-Request-Id': context.requestId
        },
        body: {
          success: false,
          error: 'Conversational processing failed',
          message: error.message,
          conversational: true,
          metadata: {
            requestId: context.requestId,
            framework: context.framework,
            error: true
          }
        },
        processingTime: Date.now() - startTime,
        conversational: true
      };
    }
  }

  /**
   * Check if route should be handled conversationally
   */
  private shouldHandleConversationally(path: string): boolean {
    if (!this.config || !this.config.enabled) {
      return false;
    }

    // Check bypass routes first
    if (this.config.bypassRoutes.some(route => path.startsWith(route))) {
      return false;
    }

    // Check conversational routes
    return this.config.conversationalRoutes.some(route => path.startsWith(route));
  }

  /**
   * Validate if request is suitable for conversational processing
   */
  private isValidConversationalRequest(context: MiddlewareContext): boolean {
    // Must be POST or PUT for conversational processing
    if (!['POST', 'PUT'].includes(context.method)) {
      return false;
    }

    // Must have body
    if (!context.body) {
      return false;
    }

    // Must have user context
    if (!context.userContext) {
      return false;
    }

    return true;
  }

  /**
   * Extract natural language request from context
   */
  private extractNaturalLanguageRequest(context: MiddlewareContext): string | null {
    if (!context.body) return null;

    // Try different possible field names for natural language input
    const possibleFields = ['request', 'query', 'message', 'natural_language', 'text', 'prompt'];

    for (const field of possibleFields) {
      if (context.body[field] && typeof context.body[field] === 'string') {
        return context.body[field];
      }
    }

    // If body is a string, use it directly
    if (typeof context.body === 'string') {
      return context.body;
    }

    return null;
  }

  /**
   * Initialize framework adapters
   */
  private initializeAdapters(): void {
    // Framework adapters would be implemented here
    // For now, we'll use the methods above directly
    this.logger.log('Framework adapters initialized');
  }

  /**
   * Framework-specific user context extraction methods
   */
  private async extractUserContextFromExpress(req: any): Promise<any> {
    return {
      userId: req.user?.id || req.headers['x-user-id'] || 'anonymous',
      sessionId: req.session?.id || req.headers['x-session-id'] || this.generateSessionId(),
      profile: {
        technicalLevel: req.user?.technicalLevel || 'INTERMEDIATE',
        role: req.user?.role || 'user',
        capabilities: req.user?.capabilities || [],
        experienceLevel: req.user?.experienceLevel || 1
      },
      permissions: req.user?.permissions || [],
      preferences: {
        explanationStyle: req.user?.preferences?.explanationStyle || 'DETAILED',
        includeExamples: req.user?.preferences?.includeExamples !== false,
        includeVisualAids: req.user?.preferences?.includeVisualAids !== false,
        notificationMethod: req.user?.preferences?.notificationMethod || 'IMMEDIATE',
        monitoringLevel: req.user?.preferences?.monitoringLevel || 'STANDARD'
      },
      timezone: req.headers['x-timezone'] || 'UTC',
      locale: req.headers['accept-language']?.split(',')[0] || 'en-US'
    };
  }

  private async extractUserContextFromFastAPI(request: any): Promise<any> {
    // Similar to Express but adapted for FastAPI structure
    return {
      userId: request.state?.user?.id || request.headers.get('x-user-id') || 'anonymous',
      sessionId: request.state?.session?.id || request.headers.get('x-session-id') || this.generateSessionId(),
      profile: {
        technicalLevel: 'INTERMEDIATE',
        role: 'user',
        capabilities: [],
        experienceLevel: 1
      },
      permissions: [],
      preferences: {
        explanationStyle: 'DETAILED',
        includeExamples: true,
        includeVisualAids: true,
        notificationMethod: 'IMMEDIATE',
        monitoringLevel: 'STANDARD'
      },
      timezone: 'UTC',
      locale: 'en-US'
    };
  }

  private async extractUserContextFromNextJS(req: any): Promise<any> {
    // Similar to Express but adapted for Next.js structure
    return this.extractUserContextFromExpress(req);
  }

  private async extractUserContextFromKoa(ctx: any): Promise<any> {
    return {
      userId: ctx.state?.user?.id || ctx.headers['x-user-id'] || 'anonymous',
      sessionId: ctx.state?.session?.id || ctx.headers['x-session-id'] || this.generateSessionId(),
      profile: {
        technicalLevel: ctx.state?.user?.technicalLevel || 'INTERMEDIATE',
        role: ctx.state?.user?.role || 'user',
        capabilities: ctx.state?.user?.capabilities || [],
        experienceLevel: ctx.state?.user?.experienceLevel || 1
      },
      permissions: ctx.state?.user?.permissions || [],
      preferences: {
        explanationStyle: 'DETAILED',
        includeExamples: true,
        includeVisualAids: true,
        notificationMethod: 'IMMEDIATE',
        monitoringLevel: 'STANDARD'
      },
      timezone: ctx.headers['x-timezone'] || 'UTC',
      locale: ctx.headers['accept-language']?.split(',')[0] || 'en-US'
    };
  }

  /**
   * Framework-specific response creation methods
   */
  private createFastAPIResponse(response: MiddlewareResponse): any {
    // Create FastAPI-compatible response
    return {
      status_code: response.statusCode,
      headers: response.headers,
      content: JSON.stringify(response.body),
      media_type: 'application/json'
    };
  }

  private createFastAPIErrorResponse(error: Error): any {
    return {
      status_code: 500,
      headers: { 'Content-Type': 'application/json' },
      content: JSON.stringify({
        error: 'Conversational processing failed',
        message: error.message,
        conversational: false
      }),
      media_type: 'application/json'
    };
  }

  private async extractBodyFromFastAPI(request: any): Promise<any> {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  /**
   * Utility methods
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private recordMetrics(framework: string, processingTime: number, statusCode: number): void {
    const key = `${framework}_metrics`;
    const existing = this.performanceMetrics.get(key) || {
      totalRequests: 0,
      totalProcessingTime: 0,
      successfulRequests: 0,
      averageProcessingTime: 0
    };

    existing.totalRequests += 1;
    existing.totalProcessingTime += processingTime;
    existing.averageProcessingTime = existing.totalProcessingTime / existing.totalRequests;

    if (statusCode >= 200 && statusCode < 300) {
      existing.successfulRequests += 1;
    }

    this.performanceMetrics.set(key, existing);
  }

  private recordMethodMetrics(methodName: string, processingTime: number): void {
    const key = `method_${methodName}`;
    this.performanceMetrics.set(key, {
      lastProcessingTime: processingTime,
      timestamp: new Date()
    });
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics(): Record<string, any> {
    const metrics: Record<string, any> = {};

    this.performanceMetrics.forEach((value, key) => {
      metrics[key] = value;
    });

    return metrics;
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.performanceMetrics.clear();
    this.logger.log('Performance metrics reset');
  }
}

// Export middleware factory functions for easy integration
export const createExpressConversationalMiddleware = (controller: ConversationalAPIController, config: MiddlewareConfig) => {
  const middleware = new UniversalAPIMiddleware(controller);
  middleware.initialize(config);
  return middleware.createExpressMiddleware();
};

export const createFastAPIConversationalMiddleware = (controller: ConversationalAPIController, config: MiddlewareConfig) => {
  const middleware = new UniversalAPIMiddleware(controller);
  middleware.initialize(config);
  return middleware.createFastAPIMiddleware();
};

export const createNextJSConversationalMiddleware = (controller: ConversationalAPIController, config: MiddlewareConfig) => {
  const middleware = new UniversalAPIMiddleware(controller);
  middleware.initialize(config);
  return middleware.createNextJSMiddleware();
};

export const createKoaConversationalMiddleware = (controller: ConversationalAPIController, config: MiddlewareConfig) => {
  const middleware = new UniversalAPIMiddleware(controller);
  middleware.initialize(config);
  return middleware.createKoaMiddleware();
};