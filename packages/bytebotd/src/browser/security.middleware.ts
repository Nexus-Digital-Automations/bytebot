/**
 * Browser Automation Security Middleware
 *
 * Provides comprehensive security validation for all browser automation endpoints
 * including request sanitization, XSS prevention, injection attack prevention,
 * rate limiting, and audit logging.
 *
 * Features:
 * - Request validation and sanitization
 * - XSS and injection attack prevention
 * - Rate limiting and request throttling
 * - Security event logging and monitoring
 * - IP-based access control
 * - Payload size validation
 * - Session security validation
 *
 * @author API Security Specialist
 * @version 1.0.0
 * @since Browser Automation Security Implementation
 */

import {
  Injectable,
  NestMiddleware,
  BadRequestException,
  HttpException,
  HttpStatus,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiSecurityService } from '../security/api-security.service';
import { ParlantIntegrationService, ParlantConversationContext, RiskLevel } from '../parlant/parlant-integration.service';

/** Security configuration interface
 */
interface SecurityConfig {
  maxRequestSize: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  enableXssProtection: boolean;
  enableSqlInjectionProtection: boolean;
  enablePayloadValidation: boolean;
  trustedIpRanges: string[];
  blockedIpRanges: string[];
  suspiciousUserAgentPatterns: string[];
}

/**
 * Request security context
 */
interface RequestSecurityContext {
  ipAddress: string;
  userAgent: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  endpoint: string;
  method: string;
  payloadSize: number;
  headers: Record<string, string>;
  riskScore: number;
}

/**
 * Security validation result
 */
interface SecurityValidationResult {
  passed: boolean;
  riskScore: number;
  violations: SecurityViolation[];
  recommendedAction: 'allow' | 'block' | 'monitor' | 'warn';}/**
 * Security violation details
 */
interface SecurityViolation {
  type: SecurityViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';description: string;evidence: Record<string, unknown>;
  recommendedAction: string;
}

/**
 * Security violation types
 */
enum SecurityViolationType {
  XSS_ATTEMPT = 'xss_attempt',SQL_INJECTION = 'sql_injection',COMMAND_INJECTION = 'command_injection',PATH_TRAVERSAL = 'path_traversal',RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',SUSPICIOUS_USER_AGENT = 'suspicious_user_agent',BLOCKED_IP = 'blocked_ip',EXCESSIVE_PAYLOAD = 'excessive_payload',MALFORMED_REQUEST = 'malformed_request',UNAUTHORIZED_ACCESS = 'unauthorized_access',}/**
 * Rate limiting tracker
 */
interface RateLimitTracker {
  requests: number;
  windowStart: number;
  blocked: boolean;
  lastViolation?: Date;
}

/**
 * Browser Automation Security Middleware
 */
@Injectable()
export class BrowserSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BrowserSecurityMiddleware.name);
  private readonly rateLimitTracker = new Map<string, RateLimitTracker>();
  private readonly securityConfig: SecurityConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly apiSecurityService: ApiSecurityService,
    private readonly parlantService: ParlantIntegrationService,
  ) {
    this.securityConfig = this.loadSecurityConfig();

    // Initialize rate limit cleanup
    setInterval(() => this.cleanupRateLimitTrackers(), 60000); // Every minute

    this.logger.log('Browser Security Middleware initialized', {maxRequestSize: this.securityConfig.maxRequestSize,rateLimitWindow: this.securityConfig.rateLimitWindow,
      rateLimitMax: this.securityConfig.rateLimitMax,
      trustedIpRanges: this.securityConfig.trustedIpRanges.length,
    });
  }

  /**
   * Main middleware function - validates all browser automation requests
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // Add request ID to headers for tracking
    req.headers['x-request-id'] = requestId;res.setHeader('X-Request-ID', requestId);

    const securityContext = this.buildSecurityContext(req, requestId);

    this.logger.debug(`[${requestId}] Browser automation security check started`, {
      requestId,
      method: securityContext.method,
      endpoint: securityContext.endpoint,
      ipAddress: securityContext.ipAddress,
      userAgent: securityContext.userAgent?.substring(0, 100),
      payloadSize: securityContext.payloadSize,
    });

    try {
      // 1. Pre-validation security checks
      await this.performPreValidationChecks(securityContext);

      // 2. Rate limiting validation
      await this.validateRateLimit(securityContext);

      // 3. IP-based access control
      await this.validateIpAccess(securityContext);

      // 4. Request payload validation
      await this.validateRequestPayload(req, securityContext);

      // 5. Security threat detection
      const validationResult = await this.performSecurityValidation(req, securityContext);

      // 6. Apply security response based on validation result
      await this.applySecurityResponse(validationResult, securityContext, res);

      // 7. Log security event
      const duration = Date.now() - startTime;
      this.logSecurityEvent('request_validated', securityContext, {
        duration,
        riskScore: validationResult.riskScore,
        violationsCount: validationResult.violations.length,
        action: validationResult.recommendedAction,
      });

      // Security validation passed - continue to next middleware
      next();

    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(`[${requestId}] Security validation failed`, {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        securityContext: {
          endpoint: securityContext.endpoint,
          method: securityContext.method,
          ipAddress: securityContext.ipAddress,
          riskScore: securityContext.riskScore,
        },
      });

      // Log security failure event
      this.logSecurityEvent('security_validation_failed', securityContext, {error: error instanceof Error ? error.message : String(error),duration,
      });

      // Handle specific security exceptions
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS ||
          error instanceof BadRequestException ||
          error instanceof ForbiddenException ||
          error instanceof UnauthorizedException) {
        throw error;
      }

      // Generic security validation failure
      throw new ForbiddenException('Security validation failed');}}

  /**
   * Build security context from request
   */
  private buildSecurityContext(req: Request, requestId: string): RequestSecurityContext {
    const ipAddress = this.extractClientIp(req);
    const userAgent = req.headers['user-agent'] || '';const endpoint = req.route?.path || req.path;const method = req.method;
    const payloadSize = this.calculatePayloadSize(req);

    // Extract user information if available
    const user = (req as any).user;
    const userId = user?.id || user?.sub;
    const sessionId = user?.sessionId;

    // Calculate initial risk score
    const riskScore = this.calculateInitialRiskScore(req, ipAddress, userAgent, endpoint);

    return {
      ipAddress,
      userAgent,
      requestId,
      userId,
      sessionId,
      endpoint,
      method,
      payloadSize,
      headers: req.headers as Record<string, string>,
      riskScore,
    };
  }

  /**
   * Perform pre-validation security checks
   */
  private async performPreValidationChecks(context: RequestSecurityContext): Promise<void> {
    // Check request size limits
    if (context.payloadSize > this.securityConfig.maxRequestSize) {
      throw new BadRequestException({
        message: 'Request payload too large',
        maxAllowedSize: this.securityConfig.maxRequestSize,
        actualSize: context.payloadSize,
      });
    }

    // Check for suspicious user agents
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      this.logger.warn(`[${context.requestId}] Suspicious user agent detected`, {
        requestId: context.requestId,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
      });

      // Don't block immediately, but increase risk score
      context.riskScore += 25;
    }

    // Validate request headers
    this.validateRequestHeaders(context);
  }

  /**
   * Validate rate limiting
   */
  private async validateRateLimit(context: RequestSecurityContext): Promise<void> {
    const key = `${context.ipAddress}:${context.endpoint}`;const now = Date.now();const windowStart = now - this.securityConfig.rateLimitWindow;

    let tracker = this.rateLimitTracker.get(key);

    if (!tracker) {
      tracker = {
        requests: 1,
        windowStart: now,
        blocked: false,
      };
      this.rateLimitTracker.set(key, tracker);
      return;
    }

    // Reset window if expired
    if (tracker.windowStart < windowStart) {
      tracker.requests = 1;
      tracker.windowStart = now;
      tracker.blocked = false;
      return;
    }

    // Increment request count
    tracker.requests++;

    // Check if rate limit exceeded
    if (tracker.requests > this.securityConfig.rateLimitMax) {
      tracker.blocked = true;
      tracker.lastViolation = new Date();

      this.logger.warn(`[${context.requestId}] Rate limit exceeded`, {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
        requests: tracker.requests,
        limit: this.securityConfig.rateLimitMax,
        windowMs: this.securityConfig.rateLimitWindow,
      });

      throw new HttpException({
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(this.securityConfig.rateLimitWindow / 1000),
        limit: this.securityConfig.rateLimitMax,
        windowMs: this.securityConfig.rateLimitWindow,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * Validate IP-based access control
   */
  private async validateIpAccess(context: RequestSecurityContext): Promise<void> {
    // Check if IP is in blocked ranges
    if (this.isIpBlocked(context.ipAddress)) {
      this.logger.warn(`[${context.requestId}] Blocked IP attempted access`, {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
        userAgent: context.userAgent?.substring(0, 100),
      });

      throw new ForbiddenException({
        message: 'Access denied from this IP address',ipAddress: context.ipAddress,});
    }

    // Check if IP is in trusted ranges (lower risk score)
    if (this.isIpTrusted(context.ipAddress)) {
      context.riskScore = Math.max(0, context.riskScore - 10);
    }
  }

  /**
   * Validate request payload for security threats
   */
  private async validateRequestPayload(req: Request, context: RequestSecurityContext): Promise<void> {
    if (!this.securityConfig.enablePayloadValidation) {
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return;
    }

    // Convert payload to JSON string for pattern matching
    const payloadString = JSON.stringify(payload);

    // Check for XSS patterns
    if (this.securityConfig.enableXssProtection && this.containsXssPatterns(payloadString)) {
      this.logger.warn(`[${context.requestId}] XSS attempt detected in payload`, {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
        payloadSample: payloadString.substring(0, 200),
      });

      throw new BadRequestException({
        message: 'Invalid request: potential XSS detected',type: 'xss_validation_failed',
      });
    }

    // Check for SQL injection patterns
    if (this.securityConfig.enableSqlInjectionProtection && this.containsSqlInjectionPatterns(payloadString)) {
      this.logger.warn(`[${context.requestId}] SQL injection attempt detected`, {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
        payloadSample: payloadString.substring(0, 200),
      });

      throw new BadRequestException({
        message: 'Invalid request: potential SQL injection detected',type: 'sql_injection_validation_failed',
      });
    }

    // Check for command injection patterns
    if (this.containsCommandInjectionPatterns(payloadString)) {
      this.logger.warn(`[${context.requestId}] Command injection attempt detected`, {
        requestId: context.requestId,
        ipAddress: context.ipAddress,
        endpoint: context.endpoint,
        payloadSample: payloadString.substring(0, 200),
      });

      throw new BadRequestException({
        message: 'Invalid request: potential command injection detected',type: 'command_injection_validation_failed',});}

    // Validate browser automation specific payloads
    await this.validateBrowserAutomationPayload(payload, context);
  }

  /**
   * Perform comprehensive security validation
   */
  private async performSecurityValidation(req: Request, context: RequestSecurityContext): Promise<SecurityValidationResult> {
    const violations: SecurityViolation[] = [];
    let riskScore = context.riskScore;

    // Validate browser automation specific security concerns
    const browserViolations = await this.validateBrowserAutomationSecurity(req, context);
    violations.push(...browserViolations);

    // Calculate total risk score
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':riskScore += 50;break;
        case 'high':riskScore += 25;break;
        case 'medium':riskScore += 10;break;
        case 'low':riskScore += 5;break;
      }
    });

    // Determine recommended action based on risk score
    let recommendedAction: 'allow' | 'block' | 'monitor' | 'warn' = 'allow';if (riskScore >= 80) {recommendedAction = 'block';} else if (riskScore >= 60) {recommendedAction = 'warn';} else if (riskScore >= 40) {recommendedAction = 'monitor';}return {
      passed: recommendedAction !== 'block',riskScore,violations,
      recommendedAction,
    };
  }

  /**
   * Apply security response based on validation result
   */
  private async applySecurityResponse(
    result: SecurityValidationResult,
    context: RequestSecurityContext,
    res: Response,
  ): Promise<void> {
    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Add risk score header for monitoring
    res.setHeader('X-Risk-Score', result.riskScore.toString());

    // Handle security response based on recommendations
    switch (result.recommendedAction) {
      case 'block':
        throw new ForbiddenException({
          message: 'Request blocked due to security policy violation',
          riskScore: result.riskScore,
          violations: result.violations.map(v => v.type),
        });

      case 'warn':
        this.logger.warn(`[${context.requestId}] High-risk request allowed with warning`, {
          requestId: context.requestId,
          riskScore: result.riskScore,
          violations: result.violations.length,
          ipAddress: context.ipAddress,
          endpoint: context.endpoint,
        });
        res.setHeader('X-Security-Warning', 'high-risk-request');break;case 'monitor':
        this.logger.log(`[${context.requestId}] Medium-risk request under monitoring`, {
          requestId: context.requestId,
          riskScore: result.riskScore,
          violations: result.violations.length,
        });
        res.setHeader('X-Security-Monitor', 'medium-risk-request');break;case 'allow':default:// Low risk - proceed normally
        break;
    }
  }

  /**
   * Validate browser automation specific security concerns
   */
  private async validateBrowserAutomationSecurity(req: Request, context: RequestSecurityContext): Promise<SecurityViolation[]> {
    const violations: SecurityViolation[] = [];

    // Check for potentially dangerous browser automation patterns
    const payload = req.body;
    if (payload && typeof payload === 'object') {
      // Check for dangerous selectors
      if (this.containsDangerousSelectors(payload)) {
        violations.push({
          type: SecurityViolationType.MALFORMED_REQUEST,
          severity: 'high',
          description: 'Potentially dangerous CSS selector or XPath detected',
          evidence: { payload: JSON.stringify(payload).substring(0, 200) },
          recommendedAction: 'Sanitize selectors and validate against whitelist',
        });
      }

      // Check for dangerous URLs
      if (this.containsDangerousUrls(payload)) {
        violations.push({
          type: SecurityViolationType.MALFORMED_REQUEST,
          severity: 'medium',
          description: 'Potentially dangerous URL detected',
          evidence: { payload: JSON.stringify(payload).substring(0, 200) },
          recommendedAction: 'Validate URLs against whitelist',
        });
      }

      // Check for file system access attempts
      if (this.containsFileSystemAccess(payload)) {
        violations.push({
          type: SecurityViolationType.PATH_TRAVERSAL,
          severity: 'critical',
          description: 'File system access attempt detected',
          evidence: { payload: JSON.stringify(payload).substring(0, 200) },
          recommendedAction: 'Block request and investigate',
        });
      }
    }

    return violations;
  }

  /**
   * Validate browser automation payload for specific threats
   */
  private async validateBrowserAutomationPayload(payload: any, context: RequestSecurityContext): Promise<void> {
    // Validate browser session configurations
    if (payload.sessionConfig) {
      this.validateSessionConfig(payload.sessionConfig, context);
    }

    // Validate browser actions
    if (payload.actions && Array.isArray(payload.actions)) {
      this.validateBrowserActions(payload.actions, context);
    }

    // Validate URLs
    if (payload.url || payload.urls) {
      this.validateUrls(payload, context);
    }

    // Validate selectors
    if (payload.selector || payload.selectors) {
      this.validateSelectors(payload, context);
    }
  }

  /**
   * Helper methods for security validation
   */
  private extractClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||(req.headers['x-real-ip'] as string) ||req.connection?.remoteAddress ||req.socket?.remoteAddress ||
      'unknown'
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private calculatePayloadSize(req: Request): number {
    return JSON.stringify(req.body || {}).length;
  }

  private calculateInitialRiskScore(req: Request, ipAddress: string, userAgent: string, endpoint: string): number {
    let score = 0;

    // Base score for browser automation endpoints
    if (endpoint.includes('/browser-use/')) {score += 10;}

    // Higher score for administrative endpoints
    if (endpoint.includes('/admin/') || endpoint.includes('/config/')) {score += 20;}

    // Score based on method
    switch (req.method) {
      case 'DELETE':score += 15;break;
      case 'PUT':case 'PATCH':score += 10;break;
      case 'POST':score += 5;break;
    }

    return score;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      ...this.securityConfig.suspiciousUserAgentPatterns,
      // Default suspicious patterns
      /bot|crawler|spider|scraper/gi,
      /curl|wget|httpie/gi,
      /python|java|go|rust|php/gi,
      /sqlmap|burp|zap|nikto/gi,
    ];

    return suspiciousPatterns.some(pattern => {
      if (typeof pattern === 'string') {return userAgent.toLowerCase().includes(pattern.toLowerCase());}
      return pattern.test(userAgent);
    });
  }

  private isIpBlocked(ipAddress: string): boolean {
    return this.securityConfig.blockedIpRanges.some(range => {
      // Simple IP matching - in production, use proper CIDR matching
      return ipAddress.startsWith(range);
    });
  }

  private isIpTrusted(ipAddress: string): boolean {
    return this.securityConfig.trustedIpRanges.some(range => {
      // Simple IP matching - in production, use proper CIDR matching
      return ipAddress.startsWith(range);
    });
  }

  private containsXssPatterns(payload: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>/gi,
      /<object[^>]*>/gi,
      /<embed[^>]*>/gi,
      /expression\s*\(/gi,
      /vbscript:/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(payload));
  }

  private containsSqlInjectionPatterns(payload: string): boolean {
    const sqlPatterns = [
      /(\'|\").*(\-\-|#)/gi,
      /(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/gi,
      /(\;|\').*(\-\-|#)/gi,
      /\/\*.*\*\//gi,
      /(\b(or|and)\b).*(\=|<|>|\!)/gi,
    ];

    return sqlPatterns.some(pattern => pattern.test(payload));
  }

  private containsCommandInjectionPatterns(payload: string): boolean {
    const commandPatterns = [
      /(\;|\||\&\&|\|\|).*\w/gi,
      /\$\(.*\)/gi,
      /\`.*\`/gi,
      /(exec|system|eval|cmd|shell|bash|sh|powershell)\s*\(/gi,
      /\.\.(\/|\\)/gi,
    ];

    return commandPatterns.some(pattern => pattern.test(payload));
  }

  private containsDangerousSelectors(payload: any): boolean {
    const checkSelector = (selector: string): boolean => {
      const dangerousPatterns = [
        /javascript:/gi,
        /data:/gi,
        /vbscript:/gi,
        /<script/gi,
        /on\w+=/gi,
      ];
      return dangerousPatterns.some(pattern => pattern.test(selector));
    };

    if (payload.selector && typeof payload.selector === 'string') {return checkSelector(payload.selector);}

    if (payload.selectors && typeof payload.selectors === 'object') {return Object.values(payload.selectors).some(selector =>typeof selector === 'string' && checkSelector(selector));}

    if (payload.actions && Array.isArray(payload.actions)) {
      return payload.actions.some(action =>
        action.selector && typeof action.selector === 'string' && checkSelector(action.selector));}

    return false;
  }

  private containsDangerousUrls(payload: any): boolean {
    const checkUrl = (url: string): boolean => {
      const dangerousPatterns = [
        /^file:/gi,
        /^javascript:/gi,
        /^data:/gi,
        /^vbscript:/gi,
        /localhost/gi,
        /127\.0\.0\.1/gi,
        /192\.168\./gi,
        /10\./gi,
        /172\.(1[6-9]|2[0-9]|3[0-1])\./gi,
      ];
      return dangerousPatterns.some(pattern => pattern.test(url));
    };

    if (payload.url && typeof payload.url === 'string') {return checkUrl(payload.url);}

    if (payload.urls && Array.isArray(payload.urls)) {
      return payload.urls.some(url => typeof url === 'string' && checkUrl(url));}if (payload.actions && Array.isArray(payload.actions)) {
      return payload.actions.some(action =>
        action.url && typeof action.url === 'string' && checkUrl(action.url));}

    return false;
  }

  private containsFileSystemAccess(payload: any): boolean {
    const payloadString = JSON.stringify(payload);
    const fileSystemPatterns = [
      /\.\.\/|\.\.\\|\.\.%2f|\.\.%5c/gi,
      /\/etc\/|\\windows\\|c:\\|d:\\|e:\\|f:\\|\/root\/|\/home\//gi,
      /\.ssh|\.aws|\.config|passwd|shadow|hosts|\.env/gi,
    ];

    return fileSystemPatterns.some(pattern => pattern.test(payloadString));
  }

  private validateRequestHeaders(context: RequestSecurityContext): void {
    const headers = context.headers;

    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-host', 'x-original-url', 'x-rewrite-url'];
    suspiciousHeaders.forEach(header => {
      if (headers[header]) {
        this.logger.warn(`[${context.requestId}] Suspicious header detected: ${header}`, {
          requestId: context.requestId,
          header,
          value: headers[header],
          ipAddress: context.ipAddress,
        });
        context.riskScore += 15;
      }
    });

    // Validate content-type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(context.method) && headers['content-type']) {const contentType = headers['content-type'];if (!contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {context.riskScore += 10;}
    }
  }

  private validateSessionConfig(sessionConfig: any, context: RequestSecurityContext): void {
    // Validate viewport settings
    if (sessionConfig.viewportWidth && (sessionConfig.viewportWidth < 320 || sessionConfig.viewportWidth > 3840)) {
      throw new BadRequestException('Invalid viewport width');}if (sessionConfig.viewportHeight && (sessionConfig.viewportHeight < 240 || sessionConfig.viewportHeight > 2160)) {
      throw new BadRequestException('Invalid viewport height');}// Validate additional args for dangerous parameters
    if (sessionConfig.additionalArgs && Array.isArray(sessionConfig.additionalArgs)) {
      const dangerousArgs = ['--disable-web-security', '--user-data-dir', '--allow-running-insecure-content'];const hasDangerousArgs = sessionConfig.additionalArgs.some(arg =>dangerousArgs.some(dangerous => arg.includes(dangerous))
      );

      if (hasDangerousArgs) {
        throw new BadRequestException('Dangerous browser arguments detected');}}
  }

  private validateBrowserActions(actions: any[], context: RequestSecurityContext): void {
    actions.forEach((action, index) => {
      // Validate action types
      const allowedActions = ['navigate', 'click', 'type', 'scroll', 'screenshot', 'extract_text', 'extract_data', 'fill_form', 'submit_form', 'wait_for_element', 'wait_for_url', 'custom'];
      if (!allowedActions.includes(action.type)) {
        throw new BadRequestException(`Invalid action type at index ${index}: ${action.type}`);}// Validate timeouts
      if (action.waitTimeoutMs && (action.waitTimeoutMs < 100 || action.waitTimeoutMs > 60000)) {
        throw new BadRequestException(`Invalid wait timeout at index ${index}`);
      }
    });
  }

  private validateUrls(payload: any, context: RequestSecurityContext): void {
    const urls = [];

    if (payload.url) urls.push(payload.url);
    if (payload.urls) urls.push(...payload.urls);
    if (payload.actions) {
      payload.actions.forEach(action => {
        if (action.url) urls.push(action.url);
      });
    }

    urls.forEach(url => {
      try {
        const parsedUrl = new URL(url);

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new BadRequestException(`Invalid URL protocol: ${parsedUrl.protocol}`);
        }

        // Block internal/localhost URLs
        if (parsedUrl.hostname === 'localhost' ||parsedUrl.hostname === '127.0.0.1' ||
            parsedUrl.hostname.match(/^192\.168\./) ||
            parsedUrl.hostname.match(/^10\./) ||
            parsedUrl.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
          throw new BadRequestException(`Internal URL access not allowed: ${url}`);}} catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(`Invalid URL format: ${url}`);
      }
    });
  }

  private validateSelectors(payload: any, context: RequestSecurityContext): void {
    const selectors = [];

    if (payload.selector) selectors.push(payload.selector);
    if (payload.selectors) {
      if (typeof payload.selectors === 'object') {selectors.push(...Object.values(payload.selectors));}
    }
    if (payload.actions) {
      payload.actions.forEach(action => {
        if (action.selector) selectors.push(action.selector);
      });
    }

    selectors.forEach(selector => {
      if (typeof selector !== 'string') return;

      // Check selector length
      if (selector.length > 1000) {
        throw new BadRequestException('Selector too long');
      }

      // Check for dangerous patterns in selectors
      if (this.containsXssPatterns(selector)) {
        throw new BadRequestException('Invalid selector contains dangerous patterns');
      }
    });
  }

  private cleanupRateLimitTrackers(): void {
    const now = Date.now();
    const expiredThreshold = now - (this.securityConfig.rateLimitWindow * 2);

    for (const [key, tracker] of Array.from(this.rateLimitTracker.entries())) {
      if (tracker.windowStart < expiredThreshold) {
        this.rateLimitTracker.delete(key);
      }
    }
  }

  private logSecurityEvent(eventType: string, context: RequestSecurityContext, metadata: Record<string, unknown>): void {
    this.logger.log(`Security Event: ${eventType}`, {
      eventType,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      security: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent?.substring(0, 100),
        userId: context.userId,
        sessionId: context.sessionId,
        endpoint: context.endpoint,
        method: context.method,
        riskScore: context.riskScore,
      },
      ...metadata,
    });
  }

  private loadSecurityConfig(): SecurityConfig {
    return {
      maxRequestSize: this.configService.get<number>('BROWSER_SECURITY_MAX_REQUEST_SIZE', 1048576), // 1MB
      rateLimitWindow: this.configService.get<number>('BROWSER_SECURITY_RATE_LIMIT_WINDOW', 60000), // 1 minute
      rateLimitMax: this.configService.get<number>('BROWSER_SECURITY_RATE_LIMIT_MAX', 100),
      enableXssProtection: this.configService.get<boolean>('BROWSER_SECURITY_XSS_PROTECTION', true),
      enableSqlInjectionProtection: this.configService.get<boolean>('BROWSER_SECURITY_SQL_INJECTION_PROTECTION', true),
      enablePayloadValidation: this.configService.get<boolean>('BROWSER_SECURITY_PAYLOAD_VALIDATION', true),
      trustedIpRanges: this.configService.get<string>('BROWSER_SECURITY_TRUSTED_IPS', '').split(',').filter(Boolean),
      blockedIpRanges: this.configService.get<string>('BROWSER_SECURITY_BLOCKED_IPS', '').split(',').filter(Boolean),
      suspiciousUserAgentPatterns: this.configService.get<string>('BROWSER_SECURITY_SUSPICIOUS_USER_AGENTS', '').split(',').filter(Boolean),
    };
  }
}