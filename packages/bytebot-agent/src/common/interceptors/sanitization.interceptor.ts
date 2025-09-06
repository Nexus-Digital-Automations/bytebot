/**
 * Input Sanitization Interceptor - Enterprise Security Input Processing
 *
 * This interceptor provides comprehensive input sanitization using DOMPurify and
 * custom security filters. It processes all incoming requests to remove XSS threats,
 * SQL injection attempts, and other malicious content while preserving legitimate data.
 *
 * @fileoverview Advanced input sanitization interceptor with DOMPurify and threat detection
 * @version 1.0.0
 * @author API Security & Documentation Specialist
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import {
  SecurityEventType,
  createSecurityEvent,
  SanitizationOptions,
  DEFAULT_SANITIZATION_OPTIONS,
} from '@bytebot/shared';

/**
 * Sanitization configuration interface
 */
interface SanitizationConfig {
  /** Enable/disable sanitization */
  enabled: boolean;

  /** Enable HTML sanitization */
  sanitizeHtml: boolean;

  /** Strip HTML completely instead of sanitizing */
  stripHtml: boolean;

  /** Enable XSS detection and blocking */
  detectXss: boolean;

  /** Enable SQL injection detection */
  detectSqlInjection: boolean;

  /** Maximum string length for inputs */
  maxStringLength: number;

  /** Maximum object depth for nested objects */
  maxObjectDepth: number;

  /** Maximum array length */
  maxArrayLength: number;

  /** Enable detailed logging */
  enableLogging: boolean;

  /** Whitelist of endpoints to skip sanitization */
  skipEndpoints: string[];

  /** Custom sanitization rules per endpoint */
  endpointRules: Record<string, Partial<SanitizationOptions>>;
}

/**
 * Threat detection patterns
 */
const SECURITY_PATTERNS = {
  xss: [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript\s*:/gi,
    /on\w+\s*=\s*["'].*?["']/gi,
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /<link[\s\S]*?>/gi,
    /<meta[\s\S]*?>/gi,
    /expression\s*\(/gi,
    /vbscript\s*:/gi,
    /data\s*:[\w\/\-+]*script/gi,
  ],
  sqlInjection: [
    /('|(\\')|(;)|(\\-;)|(\|)|(\\|)|(\\*)|(\*))/gi,
    /(union|select|insert|delete|drop|create|alter|exec|execute|cast|char|varchar|nchar|nvarchar|syscolumns|sysobjects|sleep|benchmark|waitfor|delay)/gi,
    /(script|vbscript|onload|onerror|onclick|onmouseover|onfocus|onblur)/gi,
    /(\\\\\\'|\\\\\"|\\\\\\\\|\\\\\\\\n|\\\\\\\\r|\\\\\\\\t|\\\\\\\\b|\\\\\\\\f)/gi,
  ],
  pathTraversal: [
    /\\.\\.\\/|\\.\\.\\\\/gi,
    /%2e%2e%2f|%2e%2e%5c/gi,
    /\\.\\.\\\\|\\.\\.\\//gi,
  ],
  commandInjection: [
    /[;&|`$(){}\\[\\]]/g,
    /(rm|del|copy|move|wget|curl|nc|netcat|telnet|ssh|ftp)/gi,
  ],
};\n\n/**\n * Default sanitization configuration\n */\nconst DEFAULT_CONFIG: SanitizationConfig = {\n  enabled: true,\n  sanitizeHtml: true,\n  stripHtml: false,\n  detectXss: true,\n  detectSqlInjection: true,\n  maxStringLength: 50000, // 50KB\n  maxObjectDepth: 10,\n  maxArrayLength: 1000,\n  enableLogging: true,\n  skipEndpoints: ['/health', '/metrics', '/api-docs'],\n  endpointRules: {\n    '/api/v1/tasks': {\n      allowHtml: true,\n      stripHtml: false,\n      maxLength: 10000,\n    },\n    '/api/v1/computer-use': {\n      allowHtml: false,\n      stripHtml: true,\n      maxLength: 1000,\n    },\n  },\n};\n\n@Injectable()\nexport class SanitizationInterceptor implements NestInterceptor {\n  private readonly logger = new Logger(SanitizationInterceptor.name);\n  private readonly config: SanitizationConfig;\n  private readonly domPurify: DOMPurify.DOMPurifyI;\n\n  constructor(private configService: ConfigService) {\n    // Initialize configuration\n    this.config = {\n      ...DEFAULT_CONFIG,\n      ...this.configService.get('sanitization', {}),\n    };\n\n    // Initialize DOMPurify with JSDOM\n    const window = new JSDOM('').window;\n    this.domPurify = DOMPurify(window as any);\n\n    // Configure DOMPurify with secure defaults\n    this.domPurify.addHook('beforeSanitizeElements', (node) => {\n      // Log suspicious elements\n      if (node.nodeName && ['SCRIPT', 'OBJECT', 'EMBED'].includes(node.nodeName)) {\n        this.logger.warn(`Blocked dangerous element: ${node.nodeName}`);\n      }\n    });\n\n    this.logger.log('Sanitization interceptor initialized', {\n      enabled: this.config.enabled,\n      sanitizeHtml: this.config.sanitizeHtml,\n      detectXss: this.config.detectXss,\n      detectSqlInjection: this.config.detectSqlInjection,\n      maxStringLength: this.config.maxStringLength,\n      skipEndpoints: this.config.skipEndpoints.length,\n    });\n  }\n\n  /**\n   * Intercept incoming requests and sanitize input data\n   */\n  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {\n    if (!this.config.enabled) {\n      return next.handle();\n    }\n\n    const operationId = `sanitization-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;\n    const startTime = Date.now();\n    const request = context.switchToHttp().getRequest<Request>();\n    const response = context.switchToHttp().getResponse<Response>();\n\n    // Check if endpoint should skip sanitization\n    if (this.shouldSkipSanitization(request.path)) {\n      return next.handle();\n    }\n\n    this.logger.debug(`[${operationId}] Starting input sanitization`, {\n      operationId,\n      method: request.method,\n      path: request.path,\n      contentType: request.headers['content-type'],\n      hasBody: !!request.body && Object.keys(request.body).length > 0,\n    });\n\n    try {\n      // Sanitize request body\n      if (request.body && Object.keys(request.body).length > 0) {\n        const sanitizedBody = this.sanitizeObject(\n          request.body,\n          request.path,\n          operationId,\n        );\n        request.body = sanitizedBody;\n      }\n\n      // Sanitize query parameters\n      if (request.query && Object.keys(request.query).length > 0) {\n        const sanitizedQuery = this.sanitizeObject(\n          request.query,\n          request.path,\n          operationId,\n        );\n        request.query = sanitizedQuery;\n      }\n\n      // Sanitize route parameters\n      if (request.params && Object.keys(request.params).length > 0) {\n        const sanitizedParams = this.sanitizeObject(\n          request.params,\n          request.path,\n          operationId,\n        );\n        request.params = sanitizedParams;\n      }\n\n      const processingTime = Date.now() - startTime;\n\n      this.logger.debug(`[${operationId}] Input sanitization completed`, {\n        operationId,\n        processingTimeMs: processingTime,\n        sanitizedBody: !!request.body,\n        sanitizedQuery: !!request.query,\n        sanitizedParams: !!request.params,\n      });\n\n      // Add sanitization metadata to response headers\n      response.setHeader('X-Sanitization-Applied', 'true');\n      response.setHeader('X-Sanitization-Time', processingTime.toString());\n      response.setHeader('X-Sanitization-Id', operationId);\n\n      return next.handle().pipe(\n        tap(() => {\n          this.logger.debug(`[${operationId}] Request processing completed`);\n        }),\n        map((data) => {\n          // Optionally sanitize response data\n          return this.config.sanitizeHtml && data && typeof data === 'object'\n            ? this.sanitizeResponseData(data, operationId)\n            : data;\n        }),\n      );\n    } catch (error) {\n      const processingTime = Date.now() - startTime;\n\n      this.logger.error(`[${operationId}] Sanitization failed`, {\n        operationId,\n        error: error.message,\n        stack: error.stack,\n        processingTimeMs: processingTime,\n        path: request.path,\n        method: request.method,\n      });\n\n      // Log security event\n      this.logSecurityEvent(\n        request,\n        'SANITIZATION_FAILED',\n        error.message,\n        operationId,\n      );\n\n      throw new BadRequestException({\n        message: 'Input validation failed',\n        errorCode: 'SANITIZATION_ERROR',\n        operationId,\n      });\n    }\n  }\n\n  /**\n   * Check if sanitization should be skipped for this endpoint\n   */\n  private shouldSkipSanitization(path: string): boolean {\n    return this.config.skipEndpoints.some((skipPath) =>\n      path.startsWith(skipPath),\n    );\n  }\n\n  /**\n   * Sanitize object recursively\n   */\n  private sanitizeObject(\n    obj: any,\n    endpoint: string,\n    operationId: string,\n    depth: number = 0,\n  ): any {\n    if (depth > this.config.maxObjectDepth) {\n      throw new Error(`Object depth limit exceeded: ${this.config.maxObjectDepth}`);\n    }\n\n    if (obj === null || obj === undefined) {\n      return obj;\n    }\n\n    if (typeof obj === 'string') {\n      return this.sanitizeString(obj, endpoint, operationId);\n    }\n\n    if (typeof obj === 'number' || typeof obj === 'boolean') {\n      return obj;\n    }\n\n    if (Array.isArray(obj)) {\n      if (obj.length > this.config.maxArrayLength) {\n        throw new Error(`Array length limit exceeded: ${this.config.maxArrayLength}`);\n      }\n\n      return obj.map((item, index) => {\n        try {\n          return this.sanitizeObject(item, endpoint, operationId, depth + 1);\n        } catch (error) {\n          this.logger.warn(`[${operationId}] Failed to sanitize array item ${index}`, {\n            operationId,\n            index,\n            error: error.message,\n          });\n          throw error;\n        }\n      });\n    }\n\n    if (typeof obj === 'object') {\n      const sanitized: any = {};\n\n      for (const [key, value] of Object.entries(obj)) {\n        try {\n          // Sanitize the key itself\n          const sanitizedKey = this.sanitizeString(key, endpoint, operationId);\n          \n          // Sanitize the value\n          sanitized[sanitizedKey] = this.sanitizeObject(\n            value,\n            endpoint,\n            operationId,\n            depth + 1,\n          );\n        } catch (error) {\n          this.logger.warn(`[${operationId}] Failed to sanitize object property ${key}`, {\n            operationId,\n            key,\n            error: error.message,\n          });\n          throw error;\n        }\n      }\n\n      return sanitized;\n    }\n\n    return obj;\n  }\n\n  /**\n   * Sanitize individual string values\n   */\n  private sanitizeString(\n    input: string,\n    endpoint: string,\n    operationId: string,\n  ): string {\n    if (!input || typeof input !== 'string') {\n      return input;\n    }\n\n    // Check string length limit\n    if (input.length > this.config.maxStringLength) {\n      this.logger.warn(`[${operationId}] String length limit exceeded`, {\n        operationId,\n        length: input.length,\n        limit: this.config.maxStringLength,\n        preview: input.substring(0, 100) + '...',\n      });\n      throw new Error(`String length limit exceeded: ${this.config.maxStringLength}`);\n    }\n\n    let sanitized = input;\n    const threats: string[] = [];\n\n    // Detect security threats\n    if (this.config.detectXss) {\n      for (const pattern of SECURITY_PATTERNS.xss) {\n        if (pattern.test(input)) {\n          threats.push('XSS');\n          break;\n        }\n      }\n    }\n\n    if (this.config.detectSqlInjection) {\n      for (const pattern of SECURITY_PATTERNS.sqlInjection) {\n        if (pattern.test(input)) {\n          threats.push('SQL_INJECTION');\n          break;\n        }\n      }\n    }\n\n    // Check for path traversal\n    for (const pattern of SECURITY_PATTERNS.pathTraversal) {\n      if (pattern.test(input)) {\n        threats.push('PATH_TRAVERSAL');\n        break;\n      }\n    }\n\n    // Check for command injection\n    for (const pattern of SECURITY_PATTERNS.commandInjection) {\n      if (pattern.test(input)) {\n        threats.push('COMMAND_INJECTION');\n        break;\n      }\n    }\n\n    // Block if threats detected\n    if (threats.length > 0) {\n      this.logger.error(`[${operationId}] Security threats detected in input`, {\n        operationId,\n        threats,\n        inputLength: input.length,\n        inputPreview: input.substring(0, 100) + '...',\n        endpoint,\n      });\n\n      throw new BadRequestException({\n        message: `Security violation detected: ${threats.join(', ')}`,\n        errorCode: 'SECURITY_THREAT_DETECTED',\n        threats,\n        operationId,\n      });\n    }\n\n    // Get endpoint-specific sanitization rules\n    const endpointRules = this.getEndpointRules(endpoint);\n\n    // Apply HTML sanitization if enabled\n    if (this.config.sanitizeHtml || endpointRules.allowHtml) {\n      if (endpointRules.stripHtml || this.config.stripHtml) {\n        // Strip all HTML tags\n        sanitized = sanitized.replace(/<[^>]*>/g, '');\n      } else {\n        // Sanitize with DOMPurify\n        const purifyConfig = {\n          ALLOWED_TAGS: endpointRules.allowedTags || [\n            'b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span', 'div',\n          ],\n          ALLOWED_ATTR: endpointRules.allowedAttributes || [\n            'class', 'style', 'title', 'alt',\n          ],\n          KEEP_CONTENT: true,\n          SANITIZE_DOM: true,\n        };\n\n        sanitized = this.domPurify.sanitize(sanitized, purifyConfig);\n      }\n    }\n\n    // Apply additional string transformations\n    sanitized = sanitized\n      .trim() // Remove leading/trailing whitespace\n      .replace(/\\s+/g, ' ') // Normalize whitespace\n      .replace(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/g, ''); // Remove control characters\n\n    // Log if content was modified\n    if (sanitized !== input) {\n      this.logger.debug(`[${operationId}] String sanitized`, {\n        operationId,\n        originalLength: input.length,\n        sanitizedLength: sanitized.length,\n        endpoint,\n        modified: true,\n      });\n    }\n\n    return sanitized;\n  }\n\n  /**\n   * Get sanitization rules for specific endpoint\n   */\n  private getEndpointRules(endpoint: string): Partial<SanitizationOptions> {\n    for (const [pattern, rules] of Object.entries(this.config.endpointRules)) {\n      if (endpoint.includes(pattern)) {\n        return { ...DEFAULT_SANITIZATION_OPTIONS, ...rules };\n      }\n    }\n    return DEFAULT_SANITIZATION_OPTIONS;\n  }\n\n  /**\n   * Sanitize response data (optional)\n   */\n  private sanitizeResponseData(data: any, operationId: string): any {\n    try {\n      return this.sanitizeObject(data, '', operationId);\n    } catch (error) {\n      this.logger.warn(`[${operationId}] Failed to sanitize response data`, {\n        operationId,\n        error: error.message,\n      });\n      return data; // Return original data if sanitization fails\n    }\n  }\n\n  /**\n   * Log security events for audit trail\n   */\n  private logSecurityEvent(\n    request: Request,\n    eventType: string,\n    message: string,\n    operationId: string,\n  ): void {\n    try {\n      let securityEventType = SecurityEventType.SUSPICIOUS_ACTIVITY;\n\n      switch (eventType) {\n        case 'XSS':\n          securityEventType = SecurityEventType.XSS_ATTEMPT_BLOCKED;\n          break;\n        case 'SQL_INJECTION':\n          securityEventType = SecurityEventType.INJECTION_ATTEMPT_BLOCKED;\n          break;\n        case 'SANITIZATION_FAILED':\n          securityEventType = SecurityEventType.VALIDATION_FAILED;\n          break;\n      }\n\n      const securityEvent = createSecurityEvent(\n        securityEventType,\n        request.path,\n        request.method,\n        false,\n        message,\n        {\n          operationId,\n          middleware: 'sanitization-interceptor',\n          eventType,\n          userAgent: request.get('User-Agent'),\n          contentType: request.get('Content-Type'),\n          bodySize: request.body ? JSON.stringify(request.body).length : 0,\n        },\n        (request as any).user?.id,\n        request.ip,\n        request.get('User-Agent'),\n      );\n\n      this.logger.warn(`Sanitization security event: ${securityEvent.eventId}`, {\n        eventId: securityEvent.eventId,\n        eventType: securityEvent.type,\n        riskScore: securityEvent.riskScore,\n        operationId,\n      });\n    } catch (error) {\n      this.logger.error('Failed to log sanitization security event', {\n        operationId,\n        error: error.message,\n        originalEventType: eventType,\n      });\n    }\n  }\n\n  /**\n   * Get sanitization statistics\n   */\n  getStatistics(): {\n    enabled: boolean;\n    config: SanitizationConfig;\n    patterns: typeof SECURITY_PATTERNS;\n  } {\n    return {\n      enabled: this.config.enabled,\n      config: this.config,\n      patterns: SECURITY_PATTERNS,\n    };\n  }\n}\n\nexport default SanitizationInterceptor;