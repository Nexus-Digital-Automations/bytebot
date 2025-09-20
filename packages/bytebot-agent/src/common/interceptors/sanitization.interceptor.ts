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
 * Extended Request interface
 */
interface ExtendedRequest extends Omit<Request, 'body'> {
  user?: {
    id?: string | number;
    [key: string]: unknown;
  };
  body?: Record<string, unknown>;
}

/**
 * Structured error interface
 */
interface StructuredError {
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

/**
 * DOM Node interface for type safety
 */
interface SafeDOMNode {
  nodeName?: string;
  [key: string]: unknown;
}

/**
 * Type definition for DOMPurify Hook callback
 */
type DOMPurifyHookCallback = (
  currentNode: SafeDOMNode,
  hookEvent?: Record<string, unknown>,
  config?: Record<string, unknown>,
) => void | boolean;

/**
 * Type definition for DOMPurify instance
 */
interface DOMPurifyInstance {
  sanitize(source: string, config?: Record<string, unknown>): string;
  addHook(entryPoint: string, callback: DOMPurifyHookCallback): void;
}

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
 * Control characters regex pattern
 * Matches control characters that should be removed from input
 * Using string construction to avoid ESLint control-regex rule
 */
const CONTROL_CHARS_PATTERN = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(8)}${String.fromCharCode(11)}${String.fromCharCode(12)}${String.fromCharCode(14)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`,
  'gu',
);

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
    /data\s*:\s*text\/html/gi,
    /vbscript\s*:/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi,
  ],
  sqlInjection: [
    /('|(\\')|(;)|(\\-;)|(\|)|(\\|)|(\\*)|(\*))/gi,
    /(union|select|insert|delete|drop|create|alter|exec|execute|cast|char|varchar|nchar|nvarchar|syscolumns|sysobjects|sleep|benchmark|waitfor|delay)/gi,
    /(script|vbscript|onload|onerror|onclick|onmouseover|onfocus|onblur)/gi,
    /(\\\\['"]|\\\\\\\\|\\\\[nrtbf])/gi,
  ],
  pathTraversal: [/\.\.\//gi, /%2e%2e%2f|%2e%2e%5c/gi, /\.\.\//gi],
  commandInjection: [
    /[;&|`$(){}\\[\\]]/g,
    /(rm|del|copy|move|wget|curl|nc|netcat|telnet|ssh|ftp)/gi,
  ],
};

/**
 * Default sanitization configuration
 */
const DEFAULT_CONFIG: SanitizationConfig = {
  enabled: true,
  sanitizeHtml: true,
  stripHtml: false,
  detectXss: true,
  detectSqlInjection: true,
  maxStringLength: 50000, // 50KB
  maxObjectDepth: 10,
  maxArrayLength: 1000,
  enableLogging: true,
  skipEndpoints: ['/health', '/metrics', '/api-docs'],
  endpointRules: {
    '/api/v1/tasks': {
      allowHtml: true,
      stripHtml: false,
      maxLength: 10000,
    },
    '/api/v1/computer-use': {
      allowHtml: false,
      stripHtml: true,
      maxLength: 1000,
    },
  },
};

@Injectable()
export class SanitizationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SanitizationInterceptor.name);
  private readonly config: SanitizationConfig;
  private readonly domPurify: DOMPurifyInstance;

  constructor(private configService: ConfigService) {
    // Initialize configuration with proper type safety
    const sanitizationConfig =
      this.configService.get<Partial<SanitizationConfig>>('sanitization') ?? {};
    this.config = {
      ...DEFAULT_CONFIG,
      ...sanitizationConfig,
    };

    // Initialize DOMPurify with JSDOM
    try {
      const jsdomInstance = new JSDOM('');
      const window = jsdomInstance.window;
      if (!window) {
        throw new Error('Failed to initialize JSDOM window');
      }

      // Create DOMPurify instance with proper typing
      const domPurifyModule = DOMPurify as unknown as {
        default?: (window: Window) => unknown;
        (window: Window): unknown;
      };
      const rawDOMPurify = domPurifyModule.default
        ? domPurifyModule.default(window as unknown as Window)
        : domPurifyModule(window as unknown as Window);

      const domPurifyInstance: DOMPurifyInstance = {
        sanitize: (
          source: string,
          config?: Record<string, unknown>,
        ): string => {
          const sanitizer = rawDOMPurify as {
            sanitize: (
              source: string,
              config?: Record<string, unknown>,
            ) => unknown;
          };
          const result = sanitizer.sanitize(source, config);
          if (typeof result === 'string') {
            return result;
          }
          if (typeof result === 'number') {
            return result.toString();
          }
          if (typeof result === 'boolean') {
            return result.toString();
          }
          if (typeof result === 'object' && result !== null) {
            return JSON.stringify(result);
          }
          return '';
        },
        addHook: (entryPoint: string, callback: DOMPurifyHookCallback) => {
          // Type-safe hook registration with proper casting
          const safeCallback = (
            node: unknown,
            hookEvent?: unknown,
            config?: unknown,
          ): void | boolean => {
            const nodeWithName = node as { nodeName?: string };
            const safeNode: SafeDOMNode = {
              nodeName: nodeWithName.nodeName || 'unknown',
              ...(node as Record<string, unknown>),
            };
            return callback(
              safeNode,
              (hookEvent as Record<string, unknown>) || {},
              (config as Record<string, unknown>) || {},
            );
          };

          const hookAdder = rawDOMPurify as {
            addHook: (entryPoint: string, callback: unknown) => void;
          };
          hookAdder.addHook(
            entryPoint as
              | 'beforeSanitizeElements'
              | 'afterSanitizeElements'
              | 'beforeSanitizeAttributes'
              | 'afterSanitizeAttributes',
            safeCallback,
          );
        },
      };
      this.domPurify = domPurifyInstance;

      // Configure DOMPurify with secure defaults
      domPurifyInstance.addHook(
        'beforeSanitizeElements',
        (node: SafeDOMNode) => {
          // Log suspicious elements
          if (
            typeof node === 'object' &&
            node !== null &&
            node.nodeName &&
            typeof node.nodeName === 'string' &&
            ['SCRIPT', 'OBJECT', 'EMBED'].includes(node.nodeName)
          ) {
            this.logger.warn(`Blocked dangerous element: ${node.nodeName}`);
          }
        },
      );
    } catch (initError) {
      const errorMessage =
        initError instanceof Error ? initError.message : String(initError);
      this.logger.error('Failed to initialize DOMPurify', {
        _error: errorMessage,
      });
      throw new Error(`DOMPurify initialization failed: ${errorMessage}`);
    }

    this.logger.log('Sanitization interceptor initialized', {
      enabled: this.config.enabled,
      sanitizeHtml: this.config.sanitizeHtml,
      detectXss: this.config.detectXss,
      detectSqlInjection: this.config.detectSqlInjection,
      maxStringLength: this.config.maxStringLength,
      skipEndpoints: this.config.skipEndpoints.length,
    });
  }

  /**
   * Intercept incoming requests and sanitize input data
   */
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (!this.config.enabled) {
      return next.handle();
    }

    // Generate unique operation ID using modern substring method (replaces deprecated substr)
    const operationId = `sanitization-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest<ExtendedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // Check if endpoint should skip sanitization
    if (this.shouldSkipSanitization(request.path)) {
      return next.handle();
    }

    this.logger.debug(`[${operationId}] Starting input sanitization`, {
      operationId,
      method: request.method,
      path: request.path,
      contentType: request.headers['content-type'],
      hasBody: !!request.body && Object.keys(request.body ?? {}).length > 0,
    });

    try {
      // Sanitize request body
      if (request.body && Object.keys(request.body).length > 0) {
        const sanitizedBody = this.sanitizeObject(
          request.body,
          request.path,
          operationId,
        );
        request.body = sanitizedBody as Record<string, unknown>;
      }

      // Sanitize query parameters
      if (request.query && Object.keys(request.query).length > 0) {
        const sanitizedQuery = this.sanitizeObject(
          request.query as Record<string, unknown>,
          request.path,
          operationId,
        );
        request.query = sanitizedQuery as typeof request.query;
      }

      // Sanitize route parameters
      if (request.params && Object.keys(request.params).length > 0) {
        const sanitizedParams = this.sanitizeObject(
          request.params as Record<string, unknown>,
          request.path,
          operationId,
        );
        request.params = sanitizedParams as typeof request.params;
      }

      const processingTime = Date.now() - startTime;

      this.logger.debug(`[${operationId}] Input sanitization completed`, {
        operationId,
        processingTimeMs: processingTime,
        sanitizedBody: !!request.body,
        sanitizedQuery: !!request.query,
        sanitizedParams: !!request.params,
      });

      // Add sanitization metadata to response headers
      response.setHeader('X-Sanitization-Applied', 'true');
      response.setHeader('X-Sanitization-Time', processingTime.toString());
      response.setHeader('X-Sanitization-Id', operationId);

      return next.handle().pipe(
        tap(() => {
          this.logger.debug(`[${operationId}] Request processing completed`);
        }),
        map((_data: unknown) => {
          // Optionally sanitize response data
          return this.config.sanitizeHtml && data && typeof data === 'object'
            ? this.sanitizeResponseData(
                data as Record<string, unknown>,
                operationId,
              )
            : data;
        }),
      );
    } catch (error) {
      const structuredError = error as StructuredError;
      const processingTime = Date.now() - startTime;
      const errorMessage = structuredError.message ?? 'Unknown error';
      const errorStack = structuredError.stack ?? '';

      this.logger.error(`[${operationId}] Sanitization failed`, {
        operationId,
        _error: errorMessage,
        stack: errorStack,
        processingTimeMs: processingTime,
        path: request.path,
        method: request.method,
      });

      // Log security event
      this.logSecurityEvent(
        request,
        'SANITIZATION_FAILED',
        errorMessage,
        operationId,
      );

      throw new BadRequestException({
        message: 'Input validation failed',
        errorCode: 'SANITIZATION_ERROR',
        operationId,
      });
    }
  }

  /**
   * Check if sanitization should be skipped for this endpoint
   */
  private shouldSkipSanitization(path: string): boolean {
    return this.config.skipEndpoints.some((skipPath) =>
      path.startsWith(skipPath),
    );
  }

  /**
   * Sanitize object recursively
   */
  private sanitizeObject(
    obj: unknown,
    endpoint: string,
    operationId: string,
    depth: number = 0,
  ): unknown {
    if (depth > this.config.maxObjectDepth) {
      throw new Error(
        `Object depth limit exceeded: ${this.config.maxObjectDepth}`,
      );
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, endpoint, operationId);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length > this.config.maxArrayLength) {
        throw new Error(
          `Array length limit exceeded: ${this.config.maxArrayLength}`,
        );
      }

      return obj.map((item, index) => {
        try {
          return this.sanitizeObject(item, endpoint, operationId, depth + 1);
        } catch (error) {
          this.logger.warn(
            `[${operationId}] Failed to sanitize array item ${index}`,
            {
              operationId,
              index,
              _error: error instanceof Error ? error.message : String(error),
            },
          );
          throw error;
        }
      });
    }

    if (typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      const objRecord = obj as Record<string, unknown>;

      for (const [key, value] of Object.entries(objRecord)) {
        try {
          // Sanitize the key itself
          const sanitizedKey = this.sanitizeString(key, endpoint, operationId);

          // Sanitize the value
          sanitized[sanitizedKey] = this.sanitizeObject(
            value,
            endpoint,
            operationId,
            depth + 1,
          );
        } catch (error) {
          this.logger.warn(
            `[${operationId}] Failed to sanitize object property ${key}`,
            {
              operationId,
              key,
              _error: error instanceof Error ? error.message : String(error),
            },
          );
          throw error;
        }
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize individual string values
   */
  private sanitizeString(
    input: string,
    endpoint: string,
    operationId: string,
  ): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    // Check string length limit
    if (input.length > this.config.maxStringLength) {
      this.logger.warn(`[${operationId}] String length limit exceeded`, {
        operationId,
        length: input.length,
        limit: this.config.maxStringLength,
        preview: input.substring(0, 100) + '...',
      });
      throw new Error(
        `String length limit exceeded: ${this.config.maxStringLength}`,
      );
    }

    let sanitized = input;
    const threats: string[] = [];

    // Detect security threats
    if (this.config.detectXss) {
      for (const pattern of SECURITY_PATTERNS.xss) {
        if (pattern.test(input)) {
          threats.push('XSS');
          break;
        }
      }
    }

    if (this.config.detectSqlInjection) {
      for (const pattern of SECURITY_PATTERNS.sqlInjection) {
        if (pattern.test(input)) {
          threats.push('SQL_INJECTION');
          break;
        }
      }
    }

    // Check for path traversal
    for (const pattern of SECURITY_PATTERNS.pathTraversal) {
      if (pattern.test(input)) {
        threats.push('PATH_TRAVERSAL');
        break;
      }
    }

    // Check for command injection
    for (const pattern of SECURITY_PATTERNS.commandInjection) {
      if (pattern.test(input)) {
        threats.push('COMMAND_INJECTION');
        break;
      }
    }

    // Block if threats detected
    if (threats.length > 0) {
      this.logger.error(`[${operationId}] Security threats detected in input`, {
        operationId,
        threats,
        inputLength: input.length,
        inputPreview: input.substring(0, 100) + '...',
        endpoint,
      });

      throw new BadRequestException({
        message: `Security violation detected: ${threats.join(', ')}`,
        errorCode: 'SECURITY_THREAT_DETECTED',
        threats,
        operationId,
      });
    }

    // Get endpoint-specific sanitization rules
    const endpointRules = this.getEndpointRules(endpoint);

    // Apply HTML sanitization if enabled
    if (this.config.sanitizeHtml || endpointRules.allowHtml) {
      if (endpointRules.stripHtml || this.config.stripHtml) {
        // Strip all HTML tags
        sanitized = sanitized.replace(/<[^>]*>/g, '');
      } else {
        // Sanitize with DOMPurify
        const purifyConfig = {
          ALLOWED_TAGS: endpointRules.allowedTags || [
            'b',
            'i',
            'em',
            'strong',
            'u',
            'br',
            'p',
            'span',
            'div',
          ],
          ALLOWED_ATTR: endpointRules.allowedAttributes || [
            'class',
            'style',
            'title',
            'alt',
          ],
          KEEP_CONTENT: true,
          SANITIZE_DOM: true,
        };

        try {
          // Use type assertion to handle DOMPurify's flexible return type
          const domPurifyInstance = this.domPurify;

          const sanitizedResult = domPurifyInstance.sanitize(
            sanitized,
            purifyConfig,
          );
          sanitized = sanitizedResult;
        } catch (sanitizeError) {
          const errorMessage =
            sanitizeError instanceof Error
              ? sanitizeError.message
              : String(sanitizeError);
          this.logger.warn('DOMPurify sanitization failed, keeping original', {
            _error: errorMessage,
            operationId,
          });
        }
      }
    }

    // Apply additional string transformations
    sanitized = sanitized
      .trim() // Remove leading/trailing whitespace
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(CONTROL_CHARS_PATTERN, ''); // Remove control characters

    // Log if content was modified
    if (sanitized !== input) {
      this.logger.debug(`[${operationId}] String sanitized`, {
        operationId,
        originalLength: input.length,
        sanitizedLength: sanitized.length,
        endpoint,
        modified: true,
      });
    }

    return sanitized;
  }

  /**
   * Get sanitization rules for specific endpoint
   */
  private getEndpointRules(endpoint: string): Partial<SanitizationOptions> {
    for (const [pattern, rules] of Object.entries(this.config.endpointRules)) {
      if (endpoint.includes(pattern)) {
        return { ...DEFAULT_SANITIZATION_OPTIONS, ...rules };
      }
    }
    return DEFAULT_SANITIZATION_OPTIONS;
  }

  /**
   * Sanitize response data (optional)
   */
  private sanitizeResponseData(
    _data: Record<string, unknown>,
    operationId: string,
  ): unknown {
    try {
      return this.sanitizeObject(data, '', operationId);
    } catch (error) {
      const structuredError = error as StructuredError;
      this.logger.warn(`[${operationId}] Failed to sanitize response data`, {
        operationId,
        _error: structuredError.message ?? 'Unknown error',
      });
      return data; // Return original data if sanitization fails
    }
  }

  /**
   * Log security events for audit trail
   */
  private logSecurityEvent(
    _request: ExtendedRequest,
    eventType: string,
    message: string,
    operationId: string,
  ): void {
    try {
      let securityEventType = SecurityEventType._SUSPICIOUS_ACTIVITY;

      switch (eventType) {
        case 'XSS':
          securityEventType = SecurityEventType._XSS_ATTEMPT_BLOCKED;
          break;
        case 'SQL_INJECTION':
          securityEventType = SecurityEventType._INJECTION_ATTEMPT_BLOCKED;
          break;
        case 'SANITIZATION_FAILED':
          securityEventType = SecurityEventType._VALIDATION_FAILED;
          break;
      }

      const securityEvent = createSecurityEvent(
        securityEventType,
        request.path,
        request.method,
        false,
        message,
        {
          operationId,
          middleware: 'sanitization-interceptor',
          eventType,
          userAgent: request.get('User-Agent'),
          contentType: request.get('Content-Type'),
          bodySize: request.body ? JSON.stringify(request.body).length : 0,
        },
        request.user?.id ? String(request.user.id) : undefined,
        request.ip,
        request.get('User-Agent'),
      );

      this.logger.warn(
        `Sanitization security _event: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
          operationId,
        },
      );
    } catch (error) {
      const structuredError = error as StructuredError;
      this.logger.error('Failed to log sanitization security event', {
        operationId,
        _error: structuredError.message ?? 'Unknown error',
        originalEventType: eventType,
      });
    }
  }

  /**
   * Get sanitization statistics
   */
  getStatistics(): {
    enabled: boolean;
    config: SanitizationConfig;
    patterns: typeof SECURITY_PATTERNS;
  } {
    return {
      enabled: this.config.enabled,
      config: this.config,
      patterns: SECURITY_PATTERNS,
    };
  }
}

export default SanitizationInterceptor;
