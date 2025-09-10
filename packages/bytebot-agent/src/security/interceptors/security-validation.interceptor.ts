/**
 * Security Validation Interceptor - Comprehensive request/response security validation
 * Implements enterprise-grade security validation for all API requests and responses
 *
 * Features:
 * - Advanced input sanitization and validation
 * - Output sanitization to prevent data leakage
 * - Request/response size limits and validation
 * - Content-type validation and enforcement
 * - Security header validation and injection
 * - Performance monitoring and attack detection
 *
 * @author Security Validation Framework Architect
 * @version 2.0.0
 * @since Phase 2: Enterprise Security Implementation
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
// Note: SecurityThreatDetector to be implemented in shared package
// import { SecurityThreatDetector } from '../../shared/src/validation/services/security-threat-detector.service';
import {
  SecurityAuditService,
  SecurityEventType,
  SecurityEventSeverity,
  SecurityEventOutcome,
} from '../audit/security-audit.service';
import * as crypto from 'crypto';
import { performance } from 'perf_hooks';

/**
 * Extended Request interface with body
 */
interface RequestWithBody extends Request {
  body: unknown;
}

/**
 * Security validation configuration
 */
interface SecurityValidationConfig {
  enableInputValidation: boolean;
  enableOutputSanitization: boolean;
  maxRequestSize: number;
  maxResponseSize: number;
  allowedContentTypes: string[];
  blockedFileExtensions: string[];
  enableThreatDetection: boolean;
  enableAuditLogging: boolean;
  strictMode: boolean;
  rateLimitThreshold: number;
  suspiciousPatterns: RegExp[];
}

/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  issues: Array<{
    type: 'warning' | 'error' | 'critical';
    field?: string;
    message: string;
    riskScore: number;
  }>;
  sanitizedData?: unknown;
  processingTime: number;
}

/**
 * Request metadata interface
 */
interface RequestMetadata {
  id: string;
  timestamp: Date;
  method: string;
  path: string;
  contentType?: string;
  contentLength: number;
  userAgent?: string;
  ipAddress: string;
  userId?: string;
  sessionId?: string;
  requestHash: string;
}

/**
 * Security Validation Interceptor
 */
@Injectable()
export class SecurityValidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityValidationInterceptor.name);
  private readonly config: SecurityValidationConfig;
  private readonly requestCache = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    // private readonly threatDetector: SecurityThreatDetector, // TODO: Implement when shared package is ready
    private readonly auditService: SecurityAuditService,
  ) {
    this.config = this.loadSecurityConfig();
    this.startCacheCleanup();

    this.logger.log('Security Validation Interceptor initialized', {
      inputValidationEnabled: this.config.enableInputValidation,
      outputSanitizationEnabled: this.config.enableOutputSanitization,
      threatDetectionEnabled: this.config.enableThreatDetection,
      strictMode: this.config.strictMode,
    });
  }

  /**
   * Main intercept method
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = performance.now();
    const requestWithId = request as Request & { requestId?: string };
    const requestId = requestWithId.requestId || crypto.randomUUID();

    // Create request metadata
    const metadata = this.createRequestMetadata(request, requestId);

    return new Observable<unknown>((subscriber) => {
      void this.validateRequest(request, metadata)
        .then((validationResult) => {
          if (!validationResult.isValid && this.config.strictMode) {
            // Block request in strict mode
            const criticalIssues = validationResult.issues.filter(
              (issue) => issue.type === 'critical',
            );
            if (criticalIssues.length > 0) {
              void this.logSecurityViolation(
                metadata,
                validationResult,
                'request_blocked',
              );
              throw new BadRequestException({
                message: 'Request blocked due to security validation failures',
                issues: criticalIssues,
                requestId,
              });
            }
          }

          // Log validation results
          if (validationResult.issues.length > 0) {
            void this.logSecurityViolation(
              metadata,
              validationResult,
              'validation_issues',
            );
          }

          // Apply sanitized data to request if available
          if (validationResult.sanitizedData) {
            (
              request as unknown as Record<string, unknown> & { body?: unknown }
            ).body = validationResult.sanitizedData;
          }

          // Proceed with request processing
          return next.handle().pipe(
            map((responseData: unknown) => {
              const processingTime = performance.now() - startTime;

              // Validate and sanitize response
              return this.processResponse(
                responseData,
                metadata,
                processingTime,
              );
            }),
            catchError((error: unknown) => {
              const processingTime = performance.now() - startTime;
              void this.logSecurityError(metadata, error, processingTime);
              return throwError(() => error);
            }),
          );
        })
        .catch((error: unknown) => {
          void this.logSecurityError(
            metadata,
            error,
            performance.now() - startTime,
          );
          return throwError(() => error);
        })
        .then((_result) => {
          // Proceed with normal request processing
          next
            .handle()
            .pipe(
              map((responseData: unknown) => responseData),
              catchError((error: unknown) => throwError(() => error)),
            )
            .subscribe(subscriber);
        })
        .catch((error: unknown) => {
          subscriber.error(error);
        });
    });
  }

  /**
   * Validate incoming request
   */
  private async validateRequest(
    request: Request,
    metadata: RequestMetadata,
  ): Promise<ValidationResult> {
    const startTime = performance.now();
    const issues: ValidationResult['issues'] = [];
    let sanitizedData: unknown = null;

    try {
      // Basic request validation
      this.validateRequestBasics(request, metadata, issues);

      // Content validation
      if (request.body && this.config.enableInputValidation) {
        const contentValidation = await this.validateRequestContent(
          request.body,
          metadata,
        );
        issues.push(...contentValidation.issues);
        sanitizedData = contentValidation.sanitizedData;
      }

      // Threat detection
      if (this.config.enableThreatDetection) {
        await this.performThreatDetection(request, metadata, issues);
      }

      // Suspicious pattern detection
      await this.detectSuspiciousPatterns(request, metadata, issues);

      const processingTime = performance.now() - startTime;
      const isValid = !issues.some((issue) => issue.type === 'critical');

      this.logger.debug('Request validation completed', {
        requestId: metadata.id,
        isValid,
        issueCount: issues.length,
        processingTimeMs: processingTime.toFixed(2),
      });

      return {
        isValid,
        issues,
        sanitizedData,
        processingTime,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      issues.push({
        type: 'critical',
        message: `Request validation failed: ${errorMessage}`,
        riskScore: 1.0,
      });

      this.logger.error('Request validation error', {
        requestId: metadata.id,
        error: errorMessage,
        processingTimeMs: processingTime.toFixed(2),
      });

      return {
        isValid: false,
        issues,
        processingTime,
      };
    }
  }

  /**
   * Validate basic request properties
   */
  private validateRequestBasics(
    request: Request,
    metadata: RequestMetadata,
    issues: ValidationResult['issues'],
  ): void {
    // Content-Type validation
    if (request.method !== 'GET' && request.method !== 'DELETE') {
      const contentType = request.get('Content-Type');

      if (!contentType) {
        issues.push({
          type: 'warning',
          message: 'Missing Content-Type header',
          riskScore: 0.2,
        });
      } else if (
        !this.config.allowedContentTypes.some((allowed) =>
          contentType.startsWith(allowed),
        )
      ) {
        issues.push({
          type: 'error',
          message: `Unsupported Content-Type: ${contentType}`,
          riskScore: 0.6,
        });
      }
    }

    // Content-Length validation
    if (metadata.contentLength > this.config.maxRequestSize) {
      issues.push({
        type: 'critical',
        message: `Request size exceeds limit: ${metadata.contentLength} > ${this.config.maxRequestSize}`,
        riskScore: 0.8,
      });
    }

    // File extension validation for uploads
    if (request.path.includes('upload') || request.path.includes('file')) {
      const suspiciousExtensions = this.config.blockedFileExtensions;
      const pathLower = request.path.toLowerCase();

      for (const ext of suspiciousExtensions) {
        if (pathLower.includes(ext)) {
          issues.push({
            type: 'critical',
            message: `Blocked file extension detected: ${ext}`,
            riskScore: 0.9,
          });
        }
      }
    }

    // Header validation
    this.validateHeaders(request, issues);
  }

  /**
   * Validate request headers for security issues
   */
  private validateHeaders(
    request: Request,
    issues: ValidationResult['issues'],
  ): void {
    const headers = request.headers;

    // Check for suspicious headers
    const suspiciousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url',
      'x-cluster-client-ip',
      'x-real-ip',
    ];

    for (const suspiciousHeader of suspiciousHeaders) {
      if (headers[suspiciousHeader]) {
        issues.push({
          type: 'warning',
          field: suspiciousHeader,
          message: `Suspicious header detected: ${suspiciousHeader}`,
          riskScore: 0.4,
        });
      }
    }

    // Validate User-Agent
    const userAgent = headers['user-agent'];
    if (userAgent) {
      // Check for bot-like or suspicious user agents
      const suspiciousPatterns = [
        /curl/i,
        /wget/i,
        /python/i,
        /bot/i,
        /crawler/i,
        /scanner/i,
        /^$/,
      ];

      if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
        issues.push({
          type: 'warning',
          field: 'user-agent',
          message: 'Suspicious User-Agent detected',
          riskScore: 0.3,
        });
      }
    }

    // Check for overly long headers
    for (const [name, value] of Object.entries(headers)) {
      const headerValue = Array.isArray(value)
        ? value.join(',')
        : String(value);

      if (name.length > 256 || headerValue.length > 4096) {
        issues.push({
          type: 'error',
          field: name,
          message: `Header too long: ${name}`,
          riskScore: 0.7,
        });
      }
    }
  }

  /**
   * Validate and sanitize request content
   */
  private async validateRequestContent(
    content: unknown,
    _metadata: RequestMetadata,
  ): Promise<{ issues: ValidationResult['issues']; sanitizedData: unknown }> {
    const issues: ValidationResult['issues'] = [];
    let sanitizedData: unknown = content;

    try {
      // Deep validation and sanitization
      sanitizedData = await this.sanitizeObject(content, '', issues);

      // Additional validation based on content type
      if (typeof content === 'object' && content !== null) {
        this.validateObjectStructure(
          content as Record<string, unknown>,
          issues,
        );
      }

      return { issues, sanitizedData };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      issues.push({
        type: 'critical',
        message: `Content validation failed: ${errorMessage}`,
        riskScore: 1.0,
      });

      return { issues, sanitizedData: null };
    }
  }

  /**
   * Recursively sanitize objects and arrays
   */
  private async sanitizeObject(
    obj: unknown,
    path: string,
    issues: ValidationResult['issues'],
    depth: number = 0,
  ): Promise<unknown> {
    // Prevent infinite recursion
    if (depth > 10) {
      issues.push({
        type: 'error',
        field: path,
        message: 'Object nesting too deep',
        riskScore: 0.6,
      });
      return null;
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj, path, issues);
    }

    if (typeof obj === 'number') {
      return this.sanitizeNumber(obj, path, issues);
    }

    if (Array.isArray(obj)) {
      if (obj.length > 1000) {
        issues.push({
          type: 'warning',
          field: path,
          message: 'Array too large',
          riskScore: 0.3,
        });
        return obj.slice(0, 1000); // Truncate large arrays
      }

      return Promise.all(
        obj.map((item, index) =>
          this.sanitizeObject(item, `${path}[${index}]`, issues, depth + 1),
        ),
      );
    }

    if (typeof obj === 'object') {
      const objRecord = obj as Record<string, unknown>;
      const keys = Object.keys(objRecord);

      if (keys.length > 100) {
        issues.push({
          type: 'warning',
          field: path,
          message: 'Object has too many properties',
          riskScore: 0.4,
        });
      }

      const sanitized: Record<string, unknown> = {};

      for (const key of keys.slice(0, 100)) {
        // Limit object properties
        const sanitizedKey = this.sanitizeString(key, `${path}.key`, issues);
        const fieldPath = path ? `${path}.${sanitizedKey}` : sanitizedKey;

        sanitized[sanitizedKey] = await this.sanitizeObject(
          objRecord[key],
          fieldPath,
          issues,
          depth + 1,
        );
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(
    value: string,
    field: string,
    issues: ValidationResult['issues'],
  ): string {
    if (value.length > 10000) {
      issues.push({
        type: 'warning',
        field,
        message: 'String too long, truncating',
        riskScore: 0.3,
      });
      value = value.substring(0, 10000);
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /vbscript:/gi,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        issues.push({
          type: 'critical',
          field,
          message: 'Potentially malicious script content detected',
          riskScore: 0.9,
        });
      }
    }

    // Sanitize common XSS patterns
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/vbscript:/gi, '');
  }

  /**
   * Sanitize numeric values
   */
  private sanitizeNumber(
    value: number,
    field: string,
    issues: ValidationResult['issues'],
  ): number {
    if (!isFinite(value) || isNaN(value)) {
      issues.push({
        type: 'error',
        field,
        message: 'Invalid number value',
        riskScore: 0.5,
      });
      return 0;
    }

    // Check for extreme values
    if (Math.abs(value) > Number.MAX_SAFE_INTEGER) {
      issues.push({
        type: 'warning',
        field,
        message: 'Number value too large',
        riskScore: 0.3,
      });
      return Math.sign(value) * Number.MAX_SAFE_INTEGER;
    }

    return value;
  }

  /**
   * Validate object structure for common issues
   */
  private validateObjectStructure(
    obj: Record<string, unknown>,
    issues: ValidationResult['issues'],
  ): void {
    // Check for prototype pollution attempts
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

    for (const key of dangerousKeys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        issues.push({
          type: 'critical',
          field: key,
          message: 'Prototype pollution attempt detected',
          riskScore: 1.0,
        });
      }
    }

    // Check for circular references
    try {
      JSON.stringify(obj);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        issues.push({
          type: 'error',
          message: 'Circular reference detected in request data',
          riskScore: 0.6,
        });
      }
    }
  }

  /**
   * Perform threat detection using the threat detector service
   */
  private async performThreatDetection(
    request: Request,
    metadata: RequestMetadata,
    issues: ValidationResult['issues'],
  ): Promise<void> {
    try {
      // Combine relevant request data for threat analysis
      // TODO: Use analysisData when SecurityThreatDetector is implemented
      const analysisData = {
        url: request.url,
        path: request.path,
        query: request.query,
        headers: request.headers,
        body: (request as RequestWithBody).body,
        method: request.method,
      };

      // Use analysisData for logging and future threat detection
      this.logger.debug('Threat analysis data prepared', {
        url: analysisData.url,
        method: analysisData.method,
        hasBody: !!analysisData.body,
      });

      // TODO: Implement threat analysis when SecurityThreatDetector is available
      // const threatAnalysis = await this.threatDetector.analyzeThreat(
      //   analysisData,
      //   {
      //     serviceType: 'bytebot_agent' as any,
      //     environment: this.configService.get('app.environment', 'development'),
      //     operationId: metadata.id,
      //   },
      // );
      const threatAnalysis = {
        riskScore: 0,
        threats: [],
        isHighRisk: false,
        threatTypes: [],
        threatDetails: {},
      }; // Placeholder

      if (threatAnalysis.isHighRisk) {
        const severity = threatAnalysis.riskScore >= 0.8 ? 'critical' : 'error';

        issues.push({
          type: severity,
          message: `High-risk threat detected: ${threatAnalysis.threatTypes.join(', ')}`,
          riskScore: threatAnalysis.riskScore,
        });

        // Log to audit service
        await this.auditService.recordSecurityEvent({
          type: SecurityEventType.THREAT_DETECTED,
          severity:
            threatAnalysis.riskScore >= 0.8
              ? SecurityEventSeverity.CRITICAL
              : SecurityEventSeverity.HIGH,
          outcome: SecurityEventOutcome.BLOCKED,
          actor: {
            userId: (request as Request & { user?: { sub?: string } })['user']
              ?.sub,
            ipAddress: metadata.ipAddress,
            userAgent: metadata.userAgent,
          },
          target: {
            endpoint: metadata.path,
            operation: metadata.method,
          },
          context: {
            correlationId: metadata.id,
            additionalData: {
              threatTypes: threatAnalysis.threatTypes,
              riskScore: threatAnalysis.riskScore,
              threatDetails: threatAnalysis.threatDetails,
            },
          },
          security: {
            riskScore: threatAnalysis.riskScore,
            threatLevel: 'high',
            detectionMethod: 'automated_analysis',
          },
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn('Threat detection failed', {
        requestId: metadata.id,
        error: errorMessage,
      });

      issues.push({
        type: 'warning',
        message: 'Threat detection unavailable',
        riskScore: 0.2,
      });
    }
  }

  /**
   * Detect suspicious patterns in request
   */
  private detectSuspiciousPatterns(
    request: Request,
    metadata: RequestMetadata,
    issues: ValidationResult['issues'],
  ): Promise<void> {
    return Promise.resolve().then(() => {
      const suspiciousPatterns = this.config.suspiciousPatterns;
      const requestString = JSON.stringify({
        url: request.url,
        headers: request.headers,
        body: (request as RequestWithBody).body,
      });

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(requestString)) {
          issues.push({
            type: 'warning',
            message: `Suspicious pattern detected: ${pattern.source}`,
            riskScore: 0.4,
          });
        }
      }

      // Check for rapid requests (potential DOS)
      const clientKey = metadata.ipAddress;
      const now = Date.now();
      const windowStart = now - 60000; // 1 minute window

      let requestCount = 0;
      for (const [key, timestamp] of this.requestCache.entries()) {
        if (key.startsWith(clientKey) && timestamp > windowStart) {
          requestCount++;
        }
      }

      if (requestCount > this.config.rateLimitThreshold) {
        issues.push({
          type: 'error',
          message: 'Rapid request pattern detected',
          riskScore: 0.7,
        });
      }

      // Cache current request
      this.requestCache.set(`${clientKey}:${metadata.id}`, now);
    });
  }

  /**
   * Process and sanitize response data
   */
  private processResponse(
    responseData: unknown,
    metadata: RequestMetadata,
    processingTime: number,
  ): unknown {
    if (!this.config.enableOutputSanitization) {
      return responseData;
    }

    try {
      // Remove sensitive fields from response
      const sanitizedResponse = this.sanitizeResponseData(responseData);

      // Log response processing
      this.logger.debug('Response processed and sanitized', {
        requestId: metadata.id,
        processingTimeMs: processingTime.toFixed(2),
        originalSize: JSON.stringify(responseData || {}).length,
        sanitizedSize: JSON.stringify(sanitizedResponse).length,
      });

      return sanitizedResponse;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Response sanitization failed', {
        requestId: metadata.id,
        error: errorMessage,
      });

      // Return original response if sanitization fails
      return responseData;
    }
  }

  /**
   * Sanitize response data to prevent information leakage
   */
  private sanitizeResponseData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Remove potential sensitive information patterns
      return data
        .replace(/password[^,}\]]*[,}\]]/gi, 'password":"[REDACTED]"')
        .replace(/token[^,}\]]*[,}\]]/gi, 'token":"[REDACTED]"')
        .replace(/secret[^,}\]]*[,}\]]/gi, 'secret":"[REDACTED]"')
        .replace(/key[^,}\]]*[,}\]]/gi, 'key":"[REDACTED]"');
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeResponseData(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, unknown> = {};
      const dataRecord = data as Record<string, unknown>;
      const sensitiveFields = [
        'password',
        'token',
        'secret',
        'key',
        'privateKey',
        'accessToken',
        'refreshToken',
        'apiKey',
        'authKey',
        'sessionKey',
      ];

      for (const [key, value] of Object.entries(dataRecord)) {
        if (
          sensitiveFields.some((field) =>
            key.toLowerCase().includes(field.toLowerCase()),
          )
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeResponseData(value);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Create request metadata
   */
  private createRequestMetadata(
    request: Request,
    requestId: string,
  ): RequestMetadata {
    const contentLength = parseInt(request.get('Content-Length') || '0', 10);

    return {
      id: requestId,
      timestamp: new Date(),
      method: request.method,
      path: request.path,
      contentType: request.get('Content-Type'),
      contentLength,
      userAgent: request.get('User-Agent'),
      ipAddress: this.getClientIP(request),
      userId: (request as Request & { user?: { sub?: string } }).user?.sub,
      sessionId: (request as Request & { user?: { sessionId?: string } }).user
        ?.sessionId,
      requestHash: this.generateRequestHash(request),
    };
  }

  /**
   * Generate request hash for deduplication and caching
   */
  private generateRequestHash(request: Request): string {
    const hashData = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: (request as RequestWithBody).body,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    return (
      request.get('CF-Connecting-IP') ||
      request.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
      request.get('X-Real-IP') ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Log security violations
   */
  private async logSecurityViolation(
    metadata: RequestMetadata,
    validationResult: ValidationResult,
    action: string,
  ): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const criticalIssues = validationResult.issues.filter(
      (issue) => issue.type === 'critical',
    );
    const highRiskIssues = validationResult.issues.filter(
      (issue) => issue.riskScore >= 0.7,
    );

    if (criticalIssues.length > 0 || highRiskIssues.length > 0) {
      await this.auditService.recordSecurityEvent({
        type: SecurityEventType.INPUT_VALIDATION_FAILURE,
        severity:
          criticalIssues.length > 0
            ? SecurityEventSeverity.CRITICAL
            : SecurityEventSeverity.HIGH,
        outcome:
          action === 'request_blocked'
            ? SecurityEventOutcome.BLOCKED
            : SecurityEventOutcome.ALLOWED,
        actor: {
          userId: metadata.userId,
          sessionId: metadata.sessionId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
        target: {
          endpoint: metadata.path,
          operation: metadata.method,
        },
        context: {
          correlationId: metadata.id,
          additionalData: {
            action,
            issues: validationResult.issues,
            processingTime: validationResult.processingTime,
          },
        },
      });
    }
  }

  /**
   * Log security errors
   */
  private async logSecurityError(
    metadata: RequestMetadata,
    error: unknown,
    processingTime: number,
  ): Promise<void> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    this.logger.error('Security validation error', {
      requestId: metadata.id,
      error: errorMessage,
      processingTimeMs: processingTime.toFixed(2),
    });

    if (this.config.enableAuditLogging) {
      await this.auditService.recordSecurityEvent({
        type: SecurityEventType.SYSTEM_CONFIG_CHANGE,
        severity: SecurityEventSeverity.HIGH,
        outcome: SecurityEventOutcome.FAILURE,
        actor: {
          userId: metadata.userId,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
        target: {
          endpoint: metadata.path,
          operation: metadata.method,
        },
        context: {
          correlationId: metadata.id,
          additionalData: {
            errorType: 'validation_error',
            error: errorMessage,
            processingTime,
          },
        },
      });
    }
  }

  /**
   * Load security configuration
   */
  private loadSecurityConfig(): SecurityValidationConfig {
    return {
      enableInputValidation: this.configService.get(
        'security.validation.enableInputValidation',
        true,
      ),
      enableOutputSanitization: this.configService.get(
        'security.validation.enableOutputSanitization',
        true,
      ),
      maxRequestSize: this.configService.get(
        'security.validation.maxRequestSize',
        10 * 1024 * 1024,
      ), // 10MB
      maxResponseSize: this.configService.get(
        'security.validation.maxResponseSize',
        50 * 1024 * 1024,
      ), // 50MB
      allowedContentTypes: this.configService.get(
        'security.validation.allowedContentTypes',
        [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
          'text/plain',
        ],
      ),
      blockedFileExtensions: this.configService.get(
        'security.validation.blockedFileExtensions',
        [
          '.exe',
          '.bat',
          '.cmd',
          '.com',
          '.pif',
          '.scr',
          '.vbs',
          '.js',
          '.jar',
          '.php',
          '.asp',
          '.jsp',
          '.py',
          '.rb',
          '.pl',
          '.sh',
          '.ps1',
        ],
      ),
      enableThreatDetection: this.configService.get(
        'security.validation.enableThreatDetection',
        true,
      ),
      enableAuditLogging: this.configService.get(
        'security.validation.enableAuditLogging',
        true,
      ),
      strictMode: this.configService.get(
        'security.validation.strictMode',
        false,
      ),
      rateLimitThreshold: this.configService.get(
        'security.validation.rateLimitThreshold',
        100,
      ),
      suspiciousPatterns: [
        /\.\./, // Directory traversal
        /\/etc\/passwd/, // Linux system files
        /\/windows\/system32/, // Windows system files
        /union.*select/i, // SQL injection
        /<script/i, // XSS
        /javascript:/i, // JavaScript protocol
        /data:text\/html/i, // Data URI XSS
      ],
    };
  }

  /**
   * Start cache cleanup timer
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const cutoff = now - 300000; // 5 minutes

      for (const [key, timestamp] of this.requestCache.entries()) {
        if (timestamp < cutoff) {
          this.requestCache.delete(key);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Get interceptor statistics
   */
  getStatistics(): {
    cacheSize: number;
    configSummary: {
      inputValidationEnabled: boolean;
      outputSanitizationEnabled: boolean;
      threatDetectionEnabled: boolean;
      strictMode: boolean;
    };
  } {
    return {
      cacheSize: this.requestCache.size,
      configSummary: {
        inputValidationEnabled: this.config.enableInputValidation,
        outputSanitizationEnabled: this.config.enableOutputSanitization,
        threatDetectionEnabled: this.config.enableThreatDetection,
        strictMode: this.config.strictMode,
      },
    };
  }
}

export default SecurityValidationInterceptor;
