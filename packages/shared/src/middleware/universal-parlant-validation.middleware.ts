/**
 * Universal Parlant Validation Middleware
 * 
 * Comprehensive middleware for Enterprise API Layer Parlant Integration that ensures
 * ALL REST endpoints across the entire AIgent ecosystem have conversational AI validation.
 * This middleware acts as a safety net to catch any endpoints that don't have explicit
 * Parlant decorators while optimizing for high-throughput operations.
 * 
 * Features:
 * - Universal coverage for all HTTP methods and endpoints
 * - Risk-based security level assignment
 * - High-performance caching and optimization
 * - Real-time monitoring integration
 * - Enterprise-grade audit trails
 * - Bypass capabilities for explicitly decorated endpoints
 * 
 * @author AIgent Integration Team
 * @version 1.0.0
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ParlantIntegrationService } from '../services/parlant-integration.service';
import {
  ParlantValidationRequest,
  ParlantValidationResponse,
  SecurityLevel,
  ParlantValidationError,
} from '../types/parlant-integration.types';

/**
 * Configuration interface for universal Parlant validation
 */
export interface UniversalParlantConfig {
  /** Enable/disable universal validation */
  enabled: boolean;
  
  /** Default security level for endpoints without explicit decorators */
  defaultSecurityLevel: SecurityLevel;
  
  /** Skip validation for endpoints with explicit Parlant decorators */
  bypassDecoratedEndpoints: boolean;
  
  /** Enable high-performance caching */
  enableCaching: boolean;
  
  /** Cache TTL for validation results (milliseconds) */
  cacheTtl: number;
  
  /** Enable real-time monitoring */
  enableMonitoring: boolean;
  
  /** Risk-based security level assignment rules */
  riskBasedAssignment: {
    enabled: boolean;
    rules: RiskAssignmentRule[];
  };
  
  /** Endpoint exclusion patterns */
  excludePatterns: string[];
  
  /** Performance optimization settings */
  performance: {
    maxConcurrentValidations: number;
    timeoutMs: number;
    retryAttempts: number;
  };
}

/**
 * Risk assignment rule for automatic security level determination
 */
export interface RiskAssignmentRule {
  /** URL pattern to match (regex) */
  pattern: string;
  
  /** HTTP methods to apply this rule to */
  methods: string[];
  
  /** Security level to assign */
  securityLevel: SecurityLevel;
  
  /** Rule description for audit trails */
  description: string;
  
  /** Enable caching for this rule */
  cacheable: boolean;
}

/**
 * Validation cache entry
 */
interface ValidationCacheEntry {
  result: ParlantValidationResponse;
  timestamp: number;
  ttl: number;
}

/**
 * Request metadata for Parlant validation
 */
interface RequestMetadata {
  operationId: string;
  startTime: number;
  endpoint: string;
  method: string;
  userAgent: string;
  ipAddress: string;
  userId?: string;
  securityLevel: SecurityLevel;
  bypassReason?: string;
}

/**
 * Universal Parlant Validation Middleware
 * 
 * Provides comprehensive conversational AI validation for all API endpoints
 * across the entire AIgent ecosystem with enterprise-grade performance and security.
 */
@Injectable()
export class UniversalParlantValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(UniversalParlantValidationMiddleware.name);
  
  /** Validation result cache for high-performance operations */
  private readonly validationCache = new Map<string, ValidationCacheEntry>();
  
  /** Active validation tracking for concurrency control */
  private readonly activeValidations = new Set<string>();
  
  /** Merged configuration */
  private readonly config: UniversalParlantConfig;
  
  /** Default configuration */
  private readonly defaultConfig: UniversalParlantConfig = {
    enabled: true,
    defaultSecurityLevel: SecurityLevel._MEDIUM,
    bypassDecoratedEndpoints: true,
    enableCaching: true,
    cacheTtl: 300000, // 5 minutes
    enableMonitoring: true,
    riskBasedAssignment: {
      enabled: true,
      rules: [
        // CRITICAL risk patterns
        {
          pattern: '/(auth|login|register|password|token)',
          methods: ['POST', 'PUT', 'PATCH'],
          securityLevel: SecurityLevel._CRITICAL,
          description: 'Authentication and credential operations',
          cacheable: false,
        },
        {
          pattern: '/(admin|operator|takeover|control)',
          methods: ['POST', 'PUT', 'DELETE'],
          securityLevel: SecurityLevel._CRITICAL,
          description: 'Administrative and control operations',
          cacheable: false,
        },
        
        // HIGH risk patterns
        {
          pattern: '/(execute|run|start|stop|cancel|browser|automation)',
          methods: ['POST', 'PUT', 'DELETE'],
          securityLevel: SecurityLevel._HIGH,
          description: 'Execution and automation operations',
          cacheable: false,
        },
        {
          pattern: '/(delete|remove|destroy)',
          methods: ['DELETE', 'POST'],
          securityLevel: SecurityLevel._HIGH,
          description: 'Data deletion operations',
          cacheable: false,
        },
        {
          pattern: '/(upload|download|file|export)',
          methods: ['POST', 'PUT'],
          securityLevel: SecurityLevel._HIGH,
          description: 'File operations',
          cacheable: false,
        },
        
        // MEDIUM risk patterns
        {
          pattern: '/(create|update|modify|edit)',
          methods: ['POST', 'PUT', 'PATCH'],
          securityLevel: SecurityLevel._MEDIUM,
          description: 'Data modification operations',
          cacheable: true,
        },
        {
          pattern: '/(settings|config|preferences)',
          methods: ['POST', 'PUT', 'PATCH'],
          securityLevel: SecurityLevel._MEDIUM,
          description: 'Configuration operations',
          cacheable: true,
        },
        
        // LOW risk patterns
        {
          pattern: '/(health|status|metrics|monitoring)',
          methods: ['GET'],
          securityLevel: SecurityLevel._LOW,
          description: 'Health and monitoring endpoints',
          cacheable: true,
        },
        {
          pattern: '/.*',
          methods: ['GET'],
          securityLevel: SecurityLevel._LOW,
          description: 'Read-only operations',
          cacheable: true,
        },
      ],
    },
    excludePatterns: [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/robots.txt',
      '/_next',
      '/static',
      '/assets',
    ],
    performance: {
      maxConcurrentValidations: 100,
      timeoutMs: 5000,
      retryAttempts: 2,
    },
  };
  
  constructor(
    private readonly parlantService: ParlantIntegrationService,
    config: Partial<UniversalParlantConfig> = {},
  ) {
    // Merge provided config with defaults
    this.config = { ...this.defaultConfig, ...config };
    
    this.logger.log('Universal Parlant Validation Middleware initialized', {
      enabled: this.config.enabled,
      defaultSecurityLevel: this.config.defaultSecurityLevel,
      cacheEnabled: this.config.enableCaching,
      riskBasedAssignment: this.config.riskBasedAssignment.enabled,
    });
    
    // Start cache cleanup interval
    this.startCacheCleanup();
  }
  
  /**
   * Main middleware handler
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    // Skip if middleware is disabled
    if (!this.config.enabled) {
      return next();
    }
    
    const metadata = this.extractRequestMetadata(req);
    
    try {
      // Check if endpoint should be excluded
      if (this.shouldExcludeEndpoint(metadata.endpoint)) {
        this.logger.debug(`Skipping excluded endpoint: ${metadata.endpoint}`);
        return next();
      }
      
      // Check if endpoint already has explicit Parlant decorators
      if (this.config.bypassDecoratedEndpoints && this.hasExplicitParlantDecorator(req)) {
        this.logger.debug(`Bypassing endpoint with explicit Parlant decorator: ${metadata.endpoint}`);
        metadata.bypassReason = 'explicit_decorator';
        this.logValidationEvent(metadata, { approved: true } as ParlantValidationResponse);
        return next();
      }
      
      // Perform Parlant validation
      const validationResult = await this.performUniversalValidation(req, metadata);
      
      if (!validationResult.approved) {
        this.logger.warn(`Universal Parlant validation blocked request`, {
          operationId: metadata.operationId,
          endpoint: metadata.endpoint,
          method: metadata.method,
          reason: validationResult.reason,
          confidence: validationResult.confidence,
        });
        
        res.status(403).json({
          statusCode: 403,
          message: 'Request denied by conversational AI validation',
          error: 'Universal Parlant Validation Failed',
          details: {
            reasoning: validationResult.reason,
            conversationId: validationResult.conversationId,
            operationId: metadata.operationId,
            securityLevel: metadata.securityLevel,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            universalValidation: true,
          },
        });
        return;
      }
      
      this.logger.debug(`Universal Parlant validation passed`, {
        operationId: metadata.operationId,
        endpoint: metadata.endpoint,
        confidence: validationResult.confidence,
        securityLevel: metadata.securityLevel,
      });
      
      // Log successful validation
      this.logValidationEvent(metadata, validationResult);
      
      // Continue to next middleware/handler
      next();
      
    } catch (error) {
      this.logger.error(`Universal Parlant validation error`, {
        operationId: metadata.operationId,
        endpoint: metadata.endpoint,
        error: error instanceof Error ? error.message : String(error),
      });
      
      // In case of validation service error, allow request through with warning
      // This ensures availability even if Parlant service is temporarily unavailable
      this.logger.warn(`Allowing request through due to validation service error: ${metadata.endpoint}`);
      next();
    }
  }
  
  /**
   * Extract request metadata for validation
   */
  private extractRequestMetadata(req: Request): RequestMetadata {
    const operationId = `universal_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const endpoint = req.path;
    const method = req.method.toUpperCase();
    
    // Determine security level based on risk assessment rules
    const securityLevel = this.determineSecurityLevel(endpoint, method);
    
    return {
      operationId,
      startTime: Date.now(),
      endpoint,
      method,
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: this.extractClientIp(req),
      userId: this.extractUserId(req),
      securityLevel,
    };
  }
  
  /**
   * Determine security level based on risk assessment rules
   */
  private determineSecurityLevel(endpoint: string, method: string): SecurityLevel {
    if (!this.config.riskBasedAssignment.enabled) {
      return this.config.defaultSecurityLevel;
    }
    
    // Apply risk assignment rules in order
    for (const rule of this.config.riskBasedAssignment.rules) {
      if (rule.methods.includes(method) && new RegExp(rule.pattern, 'i').test(endpoint)) {
        this.logger.debug(`Applied risk rule: ${rule.description}`, {
          pattern: rule.pattern,
          endpoint,
          method,
          securityLevel: rule.securityLevel,
        });
        return rule.securityLevel;
      }
    }
    
    return this.config.defaultSecurityLevel;
  }
  
  /**
   * Check if endpoint should be excluded from validation
   */
  private shouldExcludeEndpoint(endpoint: string): boolean {
    return this.config.excludePatterns.some(pattern => 
      new RegExp(pattern, 'i').test(endpoint)
    );
  }
  
  /**
   * Check if request handler already has explicit Parlant decorators
   */
  private hasExplicitParlantDecorator(req: Request): boolean {
    // This would need to be implemented by checking route metadata
    // For now, return false to ensure all endpoints get validation
    // In a real implementation, this would check if the route handler
    // has @ParlantValidated, @ParlantSecure, or @ParlantCritical decorators
    return false;
  }
  
  /**
   * Perform universal Parlant validation
   */
  private async performUniversalValidation(
    req: Request, 
    metadata: RequestMetadata
  ): Promise<ParlantValidationResponse> {
    const cacheKey = this.generateCacheKey(req, metadata);
    
    // Check cache first for performance
    if (this.config.enableCaching) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.logger.debug(`Using cached validation result: ${metadata.operationId}`);
        return cached;
      }
    }
    
    // Check concurrency limits
    if (this.activeValidations.size >= this.config.performance.maxConcurrentValidations) {
      this.logger.warn(`Validation concurrency limit reached, allowing request: ${metadata.endpoint}`);
      return {
        approved: true,
        conversationId: `concurrent_limit_${metadata.operationId}`,
        reason: 'Concurrency limit reached',
        confidence: 0.5,
        metadata: {
          startTime: new Date(),
          endTime: new Date(),
          processingTime: 0,
          cacheStatus: 'miss',
          source: 'fallback',
          riskAssessment: {
            level: metadata.securityLevel,
            factors: ['concurrency_limit'],
            score: 50,
            mitigations: ['Rate limiting in effect'],
          },
        },
      };
    }
    
    this.activeValidations.add(metadata.operationId);
    
    try {
      const validationRequest: ParlantValidationRequest = {
        operationId: metadata.operationId,
        functionName: `API.${metadata.method}.${metadata.endpoint.replace(/[\/\-:]/g, '_')}`,
        packageName: 'universal-api-layer',
        description: `Universal API validation for ${metadata.method} ${metadata.endpoint}`,
        parameters: {
          endpoint: metadata.endpoint,
          method: metadata.method,
          headers: this.sanitizeHeaders(req.headers),
          query: req.query,
          body: metadata.method !== 'GET' ? this.sanitizeBody(req.body) : undefined,
        },
        userContext: {
          userId: metadata.userId || 'anonymous',
          roles: ['api_user'],
          sessionId: (req as any).sessionID || `universal_session_${Date.now()}`,
          ipAddress: metadata.ipAddress,
          metadata: {
            timestamp: Date.now(),
            userAgent: metadata.userAgent,
            universalValidation: true,
            securityLevel: metadata.securityLevel,
            operationId: metadata.operationId,
          },
        },
        securityLevel: metadata.securityLevel,
        timeout: this.config.performance.timeoutMs,
      };
      
      // Perform validation with timeout
      const validationPromise = this.parlantService.validateFunction(validationRequest);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout')), this.config.performance.timeoutMs);
      });
      
      const result = await Promise.race([validationPromise, timeoutPromise]);
      
      // Cache successful results
      if (this.config.enableCaching && result.approved) {
        this.setInCache(cacheKey, result, metadata);
      }
      
      return result;
      
    } finally {
      this.activeValidations.delete(metadata.operationId);
    }
  }
  
  /**
   * Generate cache key for validation result
   */
  private generateCacheKey(req: Request, metadata: RequestMetadata): string {
    // Create a cache key based on endpoint, method, user, and critical parameters
    const keyData = {
      endpoint: metadata.endpoint,
      method: metadata.method,
      userId: metadata.userId,
      securityLevel: metadata.securityLevel,
      // Include relevant headers and query params for cache differentiation
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
    };
    
    return `parlant_universal_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }
  
  /**
   * Get validation result from cache
   */
  private getFromCache(cacheKey: string): ParlantValidationResponse | null {
    const entry = this.validationCache.get(cacheKey);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.validationCache.delete(cacheKey);
      return null;
    }
    
    return entry.result;
  }
  
  /**
   * Set validation result in cache
   */
  private setInCache(
    cacheKey: string, 
    result: ParlantValidationResponse, 
    metadata: RequestMetadata
  ): void {
    // Determine TTL based on security level and endpoint characteristics
    const rule = this.config.riskBasedAssignment.rules.find(r => 
      r.methods.includes(metadata.method) && 
      new RegExp(r.pattern, 'i').test(metadata.endpoint)
    );
    
    const ttl = rule?.cacheable ? this.config.cacheTtl : 0;
    
    if (ttl > 0) {
      this.validationCache.set(cacheKey, {
        result,
        timestamp: Date.now(),
        ttl,
      });
    }
  }
  
  /**
   * Extract client IP address from request
   */
  private extractClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
  
  /**
   * Extract user ID from request (if available)
   */
  private extractUserId(req: Request): string | undefined {
    // Try to extract user ID from various sources
    const reqWithUser = req as any;
    return reqWithUser.user?.id || reqWithUser.user?.userId || undefined;
  }
  
  /**
   * Sanitize headers for validation (remove sensitive information)
   */
  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
    
    Object.entries(headers).forEach(([key, value]) => {
      if (!sensitiveHeaders.includes(key.toLowerCase()) && typeof value === 'string') {
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  }
  
  /**
   * Sanitize request body for validation
   */
  private sanitizeBody(body: any): any {
    if (!body) return undefined;
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
  
  /**
   * Log validation event for monitoring and audit
   */
  private logValidationEvent(
    metadata: RequestMetadata, 
    result: ParlantValidationResponse
  ): void {
    if (!this.config.enableMonitoring) return;
    
    const processingTime = Date.now() - metadata.startTime;
    
    this.logger.log('Universal Parlant validation event', {
      operationId: metadata.operationId,
      endpoint: metadata.endpoint,
      method: metadata.method,
      userId: metadata.userId,
      ipAddress: metadata.ipAddress,
      securityLevel: metadata.securityLevel,
      approved: result.approved,
      confidence: result.confidence,
      processingTimeMs: processingTime,
      bypassReason: metadata.bypassReason,
      conversationId: result.conversationId,
      universalValidation: true,
      timestamp: new Date().toISOString(),
    });
  }
  
  /**
   * Start cache cleanup interval
   */
  private startCacheCleanup(): void {
    if (!this.config.enableCaching) return;
    
    const cleanupInterval = Math.min(this.config.cacheTtl / 4, 60000); // Every minute or 1/4 of TTL
    
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;
      
      for (const [key, entry] of this.validationCache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.validationCache.delete(key);
          cleaned++;
        }
      }
      
      if (cleaned > 0) {
        this.logger.debug(`Cleaned ${cleaned} expired cache entries`);
      }
    }, cleanupInterval);
  }
  
  /**
   * Get middleware statistics for monitoring
   */
  public getStatistics() {
    return {
      cacheSize: this.validationCache.size,
      activeValidations: this.activeValidations.size,
      config: {
        enabled: this.config.enabled,
        defaultSecurityLevel: this.config.defaultSecurityLevel,
        cacheEnabled: this.config.enableCaching,
        cacheTtl: this.config.cacheTtl,
      },
    };
  }
}