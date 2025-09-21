/**
 * Browser Use Authentication Middleware
 *
 * Comprehensive authentication and security middleware for browser automation API endpoints.
 * Integrates with existing Parlant authentication bridge service to provide:
 * - JWT token validation and session management
 * - Role-based access control for browser operations
 * - Request validation and sanitization
 * - Rate limiting and abuse prevention
 * - Comprehensive audit trail logging
 *
 * Security Features:
 * - Multi-factor authentication support
 * - Risk-based authentication
 * - Session binding and validation
 * - IP and device fingerprinting
 * - Real-time threat detection
 *
 * @module BrowserUseAuthMiddleware
 * @version 1.0.0
 * @author Security Integration Specialist
 */

import {
  Injectable,
  NestMiddleware,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  TooManyRequestsException,
  BadRequestException,
} from '@nestjs/common';import { Request, Response, NextFunction } from 'express';import { performance } from 'perf_hooks';import * as crypto from 'crypto';import { Reflector } from '@nestjs/core';// Parlant Authentication Bridge Integrationimport {
  ParlantAuthenticationBridgeService,
  AuthenticationRequest,
  AuthenticationResult,
  SessionInformation,
} from '../../shared/src/parlant/security/authentication-bridge.service';// Enhanced JWT Bridge for session managementimport { EnhancedJwtParlantBridgeService } from '../../shared/src/services/enhanced-jwt-parlant-bridge.service';// Security context and typesimport {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from '../../shared/src/types/parlant-integration.types';/*** Extended Express Request with authentication context
 */
export interface AuthenticatedRequest extends Request {
  user: BrowserUseUserContext;
  session: BrowserUseSessionContext;
  security: BrowserUseSecurityContext;
  audit: BrowserUseAuditContext;
}

/**
 * Browser use specific user context
 */
export interface BrowserUseUserContext extends ParlantUserContext {
  permissions: BrowserPermission[];
  trustLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';mfaVerified: boolean;lastActivity: Date;
  failedAttempts: number;
  deviceFingerprint: string;
}

/**
 * Browser use session context
 */
export interface BrowserUseSessionContext {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  securityLevel: SecurityLevel;
  ipAddress: string;
  userAgent: string;
  deviceBinding: string;
  ipBinding: string;
  activeOperations: ActiveBrowserOperation[];
  rateLimitCounters: RateLimitCounters;
}

/**
 * Browser use security context
 */
export interface BrowserUseSecurityContext {
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';riskFactors: SecurityRiskFactor[];securityControls: SecurityControl[];
  threatIndicators: ThreatIndicator[];
  complianceFlags: ComplianceFlag[];
  monitoringLevel: 'BASIC' | 'ENHANCED' | 'COMPREHENSIVE';}/**
 * Browser use audit context
 */
export interface BrowserUseAuditContext {
  operationId: string;
  requestId: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  parameters: Record<string, unknown>;
  userAgent: string;
  ipAddress: string;
  sessionId: string;
  authenticationMethod: string;
  securityValidation: SecurityValidationResult;
}

/**
 * Browser operation permissions
 */
export enum BrowserPermission {
  CREATE_TASK = 'browser:task:create',VIEW_TASK = 'browser:task:view',STOP_TASK = 'browser:task:stop',DELETE_TASK = 'browser:task:delete',CREATE_SESSION = 'browser:session:create',MANAGE_SESSION = 'browser:session:manage',EXTRACT_DATA = 'browser:data:extract',UPLOAD_FILES = 'browser:files:upload',EXTERNAL_DOMAINS = 'browser:domains:external',ADMIN_OPERATIONS = 'browser:admin:all',ASYNC_JOBS = 'browser:jobs:async',BULK_OPERATIONS = 'browser:operations:bulk',}/**
 * Active browser operation tracking
 */
export interface ActiveBrowserOperation {
  operationId: string;
  type: 'TASK' | 'SESSION' | 'ASYNC_JOB' | 'DATA_EXTRACTION';startTime: Date;resourceUsage: {
    memoryMB: number;
    cpuPercent: number;
    networkConnections: number;
  };
  riskLevel: SecurityLevel;
}

/**
 * Rate limiting counters
 */
export interface RateLimitCounters {
  requestsPerMinute: number;
  tasksPerHour: number;
  dataExtractionPerDay: number;
  lastReset: Date;
  violations: number;
}

/**
 * Security risk factor
 */
export interface SecurityRiskFactor {
  type: 'LOCATION' | 'DEVICE' | 'BEHAVIOR' | 'CONTENT' | 'FREQUENCY';severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';description: string;value: number;
  source: string;
  timestamp: Date;
}

/**
 * Security control
 */
export interface SecurityControl {
  type: 'MFA' | 'IP_RESTRICTION' | 'DEVICE_BINDING' | 'CONTENT_FILTER' | 'RATE_LIMIT';status: 'ACTIVE' | 'INACTIVE' | 'BYPASSED';description: string;appliedAt: Date;
  parameters: Record<string, unknown>;
}

/**
 * Threat indicator
 */
export interface ThreatIndicator {
  type: 'SUSPICIOUS_IP' | 'MALICIOUS_CONTENT' | 'ANOMALOUS_BEHAVIOR' | 'KNOWN_THREAT';severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';description: string;source: string;
  confidence: number;
  detectedAt: Date;
}

/**
 * Compliance flag
 */
export interface ComplianceFlag {
  regulation: 'GDPR' | 'HIPAA' | 'SOX' | 'PCI_DSS' | 'SOC2';requirement: string;status: 'COMPLIANT' | 'VIOLATION' | 'REVIEW_REQUIRED';description: string;evidence: Record<string, unknown>;
}

/**
 * Security validation result
 */
export interface SecurityValidationResult {
  passed: boolean;
  validations: SecurityValidation[];
  overallScore: number;
  processingTime: number;
}

/**
 * Individual security validation
 */
export interface SecurityValidation {
  type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'INPUT_VALIDATION' | 'RATE_LIMITING' | 'THREAT_DETECTION';passed: boolean;score: number;
  details: string;
  evidence: Record<string, unknown>;
}

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessful: boolean;
  skipFailedRequests: boolean;
  keyGenerator: (req: Request) => string;
}

/**
 * Browser Use Authentication Middleware
 *
 * Provides comprehensive security for browser automation endpoints including:
 * - JWT authentication with Parlant bridge integration
 * - Role-based access control with fine-grained permissions
 * - Advanced rate limiting with adaptive throttling
 * - Request validation and sanitization
 * - Real-time security monitoring and threat detection
 * - Comprehensive audit trail logging
 */
@Injectable()
export class BrowserUseAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(BrowserUseAuthMiddleware.name);

  // Rate limiting storage (in production, use Redis)
  private readonly rateLimitStore = new Map<string, RateLimitCounters>();
  private readonly securityCache = new Map<string, BrowserUseSecurityContext>();
  private readonly threatDetectionCache = new Map<string, ThreatIndicator[]>();

  // Security configuration
  private readonly securityConfig = {
    jwtValidation: {
      enabled: true,
      requireRefresh: true,
      validateClaims: true,
      checkRevocation: true,
    },
    rateLimiting: {
      global: { windowMs: 60000, maxRequests: 100 }, // 100 requests per minute
      perUser: { windowMs: 60000, maxRequests: 50 }, // 50 requests per minute per user
      perEndpoint: {
        'POST /browser-use/tasks': { windowMs: 60000, maxRequests: 10 },'POST /browser-use/sessions': { windowMs: 60000, maxRequests: 5 },'POST /browser-use/async-jobs': { windowMs: 300000, maxRequests: 3 }, // 3 per 5 minutes},},
    threatDetection: {
      enabled: true,
      suspiciousIpThreshold: 0.7,
      anomalyDetectionEnabled: true,
      behaviorAnalysisEnabled: true,
    },
    auditLogging: {
      logAllRequests: true,
      logRequestBodies: true,
      logResponseBodies: false,
      retentionDays: 90,
    },
  };

  // Performance metrics
  private readonly metrics = {
    totalRequests: 0,
    authenticatedRequests: 0,
    deniedRequests: 0,
    rateLimitedRequests: 0,
    averageProcessingTime: 0,
    securityViolations: 0,
  };

  constructor(
    private readonly authBridgeService: ParlantAuthenticationBridgeService,
    private readonly jwtBridgeService: EnhancedJwtParlantBridgeService,
    private readonly reflector: Reflector,
  ) {
    this.logger.log('🔐 Browser Use Authentication Middleware initialized');this.logger.log('🛡️ Security features enabled: JWT validation, RBAC, rate limiting, threat detection');

    // Start periodic cleanup tasks
    setInterval(() => this.performSecurityCleanup(), 300000); // Every 5 minutes
    setInterval(() => this.logSecurityMetrics(), 600000); // Every 10 minutes
  }

  /**
   * Main middleware function - processes all browser automation requests
   */
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = performance.now();
    const operationId = this.generateOperationId();

    this.metrics.totalRequests++;

    this.logger.debug(
      `[${operationId}] Browser Use authentication middleware processing request`,
      {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),ipAddress: this.getClientIpAddress(req),}
    );

    try {
      // Step 1: Extract authentication credentials
      const authCredentials = await this.extractAuthenticationCredentials(req);

      // Step 2: Validate JWT token and session
      const authResult = await this.validateAuthentication(authCredentials, req);

      // Step 3: Perform authorization checks
      await this.validateAuthorization(authResult, req);

      // Step 4: Apply rate limiting
      await this.validateRateLimits(authResult.userContext!, req);

      // Step 5: Validate request security
      const securityValidation = await this.validateRequestSecurity(authResult, req);

      // Step 6: Create audit context
      const auditContext = this.createAuditContext(operationId, authResult, securityValidation, req);

      // Step 7: Attach contexts to request
      this.attachContextsToRequest(req as AuthenticatedRequest, authResult, securityValidation, auditContext);

      // Step 8: Log successful authentication
      this.logAuthenticationSuccess(operationId, authResult, req);
      this.metrics.authenticatedRequests++;

      // Update performance metrics
      const processingTime = performance.now() - startTime;
      this.updatePerformanceMetrics(processingTime);

      next();

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.handleAuthenticationError(operationId, error, req, res, processingTime);
    }
  }

  /**
   * Extract authentication credentials from request
   */
  private async extractAuthenticationCredentials(req: Request): Promise<{
    token?: string;
    sessionId?: string;
    deviceFingerprint?: string;
    apiKey?: string;
  }> {
    const authHeader = req.get('Authorization', );const sessionHeader = req.get('X-Session-ID');const deviceHeader = req.get('X-Device-Fingerprint');const apiKeyHeader = req.get('X-API-Key');// Extract Bearer tokenlet token: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {token = authHeader.substring(7);}

    // Generate device fingerprint if not provided
    const deviceFingerprint = deviceHeader || this.generateDeviceFingerprint(req);

    return {
      token,
      sessionId: sessionHeader,
      deviceFingerprint,
      apiKey: apiKeyHeader,
    };
  }

  /**
   * Validate authentication using Parlant bridge service
   */
  private async validateAuthentication(
    credentials: any,
    req: Request
  ): Promise<AuthenticationResult> {
    if (!credentials.token && !credentials.apiKey) {
      throw new UnauthorizedException('Authentication token or API key required');}// Prepare authentication request
    const authRequest: AuthenticationRequest = {
      userId: this.extractUserIdFromToken(credentials.token),
      method: credentials.token ? 'jwt' : 'api_key',factor: 'primary',credentials: {token: credentials.token,
        apiKey: credentials.apiKey,
        sessionId: credentials.sessionId,
      },
      metadata: {
        ipAddress: this.getClientIpAddress(req),
        userAgent: req.get('User-Agent') || '',deviceFingerprint: credentials.deviceFingerprint,timestamp: new Date(),
        source: 'browser_use_api',
        riskIndicators: await this.detectRiskIndicators(req),
      },
    };

    // Perform authentication
    const authResult = await this.authBridgeService.authenticate(authRequest);

    if (!authResult.success) {
      throw new UnauthorizedException(`Authentication failed: ${authResult.errors.join(`, ')}`);}return authResult;
  }

  /**
   * Validate authorization and permissions
   */
  private async validateAuthorization(
    authResult: AuthenticationResult,
    req: Request
  ): Promise<void> {
    const userContext = authResult.userContext!;
    const endpoint = `${req.method} ${req.route?.path || req.url}`;// Get required permissions for endpointconst requiredPermissions = this.getRequiredPermissions(endpoint);

    // Check if user has required permissions
    const userPermissions = this.getUserPermissions(userContext);

    for (const permission of requiredPermissions) {
      if (!userPermissions.includes(permission)) {
        throw new ForbiddenException(`Insufficient permissions: ${permission} required`);}}

    // Additional security checks based on endpoint
    await this.validateEndpointSpecificSecurity(endpoint, userContext, req);
  }

  /**
   * Validate rate limits for user and endpoint
   */
  private async validateRateLimits(
    userContext: ParlantUserContext,
    req: Request
  ): Promise<void> {
    const now = Date.now();
    const endpoint = `${req.method} ${req.route?.path || req.url}`;const userKey = `user:${userContext.userId}`;const ipKey = `ip:${this.getClientIpAddress(req)}`;

    // Check global rate limit
    await this.checkRateLimit('global', this.securityConfig.rateLimiting.global, now);

    // Check per-user rate limit
    await this.checkRateLimit(userKey, this.securityConfig.rateLimiting.perUser, now);

    // Check endpoint-specific rate limit
    const endpointConfig = this.securityConfig.rateLimiting.perEndpoint[endpoint];
    if (endpointConfig) {
      await this.checkRateLimit(`endpoint:${endpoint}:${userKey}`, endpointConfig, now);
    }

    // Check IP-based rate limit for additional protection
    await this.checkRateLimit(ipKey, { windowMs: 60000, maxRequests: 200 }, now);
  }

  /**
   * Validate request security (input validation, threat detection)
   */
  private async validateRequestSecurity(
    authResult: AuthenticationResult,
    req: Request
  ): Promise<SecurityValidationResult> {
    const validations: SecurityValidation[] = [];
    let overallScore = 100;
    const startTime = performance.now();

    // Input validation
    const inputValidation = await this.validateRequestInput(req);
    validations.push(inputValidation);
    overallScore -= inputValidation.passed ? 0 : 20;

    // Threat detection
    const threatValidation = await this.detectThreats(authResult, req);
    validations.push(threatValidation);
    overallScore -= threatValidation.passed ? 0 : 30;

    // Content analysis
    const contentValidation = await this.validateRequestContent(req);
    validations.push(contentValidation);
    overallScore -= contentValidation.passed ? 0 : 15;

    // Behavioral analysis
    const behaviorValidation = await this.analyzeBehavior(authResult.userContext!, req);
    validations.push(behaviorValidation);
    overallScore -= behaviorValidation.passed ? 0 : 10;

    const processingTime = performance.now() - startTime;
    const passed = validations.every(v => v.passed) && overallScore >= 70;

    if (!passed) {
      this.metrics.securityViolations++;
      throw new ForbiddenException('Request failed security validation');}return {
      passed,
      validations,
      overallScore: Math.max(0, overallScore),
      processingTime,
    };
  }

  /**
   * Create comprehensive audit context
   */
  private createAuditContext(
    operationId: string,
    authResult: AuthenticationResult,
    securityValidation: SecurityValidationResult,
    req: Request
  ): BrowserUseAuditContext {
    return {
      operationId,
      requestId: req.get('X-Request-ID') || crypto.randomUUID(),
      timestamp: new Date(),
      endpoint: `${req.method} ${req.route?.path || req.url}`,
      method: req.method,
      parameters: this.sanitizeParametersForAudit(req),
      userAgent: req.get('User-Agent') || '',ipAddress: this.getClientIpAddress(req),sessionId: authResult.session?.sessionId || 'unknown',authenticationMethod: authResult.metadata.methodUsed,securityValidation,
    };
  }

  /**
   * Attach all contexts to request object
   */
  private attachContextsToRequest(
    req: AuthenticatedRequest,
    authResult: AuthenticationResult,
    securityValidation: SecurityValidationResult,
    auditContext: BrowserUseAuditContext
  ): void {
    // Create browser-specific user context
    req.user = {
      ...authResult.userContext!,
      permissions: this.getUserPermissions(authResult.userContext!),
      trustLevel: this.calculateUserTrustLevel(authResult),
      mfaVerified: authResult.session?.mfaVerified || false,
      lastActivity: new Date(),
      failedAttempts: 0,
      deviceFingerprint: authResult.metadata.riskAssessment.factors
        .find(f => f.type === 'device')?.description || 'unknown',};// Create session context
    req.session = {
      sessionId: authResult.session!.sessionId,
      createdAt: authResult.session!.createdAt,
      expiresAt: authResult.session!.expiresAt,
      securityLevel: authResult.session!.securityLevel,
      ipAddress: this.getClientIpAddress(req),
      userAgent: req.get('User-Agent') || '',deviceBinding: authResult.session!.deviceBinding,ipBinding: authResult.session!.ipBinding,
      activeOperations: [],
      rateLimitCounters: this.getRateLimitCounters(req.user.userId),
    };

    // Create security context
    req.security = {
      riskScore: authResult.metadata.riskAssessment.overallScore,
      riskLevel: authResult.metadata.riskAssessment.level.toUpperCase() as any,
      riskFactors: authResult.metadata.riskAssessment.factors.map(f => ({
        type: f.type.toUpperCase() as any,
        severity: this.mapRiskSeverity(f.weight),
        description: f.description,
        value: f.value,
        source: f.source,
        timestamp: new Date(),
      })),
      securityControls: authResult.metadata.securityControls.map(control => ({
        type: control.toUpperCase() as any,
        status: 'ACTIVE',
        description: `Security control: ${control}`,appliedAt: new Date(),parameters: {},
      })),
      threatIndicators: this.getThreatIndicators(req.user.userId),
      complianceFlags: [],
      monitoringLevel: this.getMonitoringLevel(authResult.metadata.riskAssessment.level),
    };

    // Attach audit context
    req.audit = auditContext;
  }

  // ===== HELPER METHODS =====

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `browser_auth_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get client IP address
   */
  private getClientIpAddress(req: Request): string {
    return (req.get('X-Forwarded-For') ||req.get('X-Real-IP') ||req.ip ||req.connection.remoteAddress ||
            'unknown').split(',')[0].trim();}/**
   * Generate device fingerprint
   */
  private generateDeviceFingerprint(req: Request): string {
    const userAgent = req.get('User-Agent') || '';const acceptLanguage = req.get('Accept-Language') || '';const acceptEncoding = req.get('Accept-Encoding') || '';const fingerprint = crypto.createHash('sha256')
      .update(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .digest('hex').substring(0, 16);return fingerprint;
  }

  /**
   * Extract user ID from JWT token
   */
  private extractUserIdFromToken(token?: string): string {
    if (!token) {
      throw new UnauthorizedException('Token required for user identification');}try {
      // Decode JWT payload (without verification for ID extraction)
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString());return payload.sub || payload.userId || 'unknown';} catch (error) {throw new UnauthorizedException('Invalid token format');}}

  /**
   * Detect risk indicators from request
   */
  private async detectRiskIndicators(req: Request): Promise<string[]> {
    const indicators: string[] = [];

    const userAgent = req.get('User-Agent') || '';if (userAgent.includes('bot') || userAgent.includes('crawler')) {indicators.push('automated_client');}const ipAddress = this.getClientIpAddress(req);
    if (this.isKnownSuspiciousIp(ipAddress)) {
      indicators.push('suspicious_ip');}return indicators;
  }

  /**
   * Get required permissions for endpoint
   */
  private getRequiredPermissions(endpoint: string): BrowserPermission[] {
    const permissionMap: Record<string, BrowserPermission[]> = {
      'POST /parlant/browser-use/tasks': [BrowserPermission.CREATE_TASK],'GET /parlant/browser-use/tasks/:taskId': [BrowserPermission.VIEW_TASK],'POST /parlant/browser-use/sessions': [BrowserPermission.CREATE_SESSION],'POST /parlant/browser-use/async-jobs': [BrowserPermission.ASYNC_JOBS],'GET /parlant/browser-use/async-jobs/:jobId': [BrowserPermission.VIEW_TASK],};return permissionMap[endpoint] || [BrowserPermission.VIEW_TASK];
  }

  /**
   * Get user permissions based on roles
   */
  private getUserPermissions(userContext: ParlantUserContext): BrowserPermission[] {
    const permissions: BrowserPermission[] = [];

    // Map roles to permissions
    if (userContext.roles.includes('admin')) {permissions.push(BrowserPermission.ADMIN_OPERATIONS);permissions.push(...Object.values(BrowserPermission));
    } else if (userContext.roles.includes('user')) {
      permissions.push(
        BrowserPermission.CREATE_TASK,
        BrowserPermission.VIEW_TASK,
        BrowserPermission.CREATE_SESSION,
        BrowserPermission.EXTRACT_DATA
      );
    }

    return permissions;
  }

  /**
   * Check rate limit for a key
   */
  private async checkRateLimit(
    key: string,
    config: { windowMs: number; maxRequests: number },
    now: number
  ): Promise<void> {
    let counters = this.rateLimitStore.get(key);

    if (!counters || now - counters.lastReset.getTime() > config.windowMs) {
      counters = {
        requestsPerMinute: 0,
        tasksPerHour: 0,
        dataExtractionPerDay: 0,
        lastReset: new Date(now),
        violations: 0,
      };
    }

    counters.requestsPerMinute++;

    if (counters.requestsPerMinute > config.maxRequests) {
      counters.violations++;
      this.metrics.rateLimitedRequests++;
      throw new TooManyRequestsException(
        `Rate limit exceeded: ${config.maxRequests} requests per ${config.windowMs}ms`
      );
    }

    this.rateLimitStore.set(key, counters);
  }

  /**
   * Validate request input
   */
  private async validateRequestInput(req: Request): Promise<SecurityValidation> {
    let passed = true;
    const details: string[] = [];

    // Check for SQL injection patterns
    const body = JSON.stringify(req.body || {});
    if (this.containsSqlInjection(body)) {
      passed = false;
      details.push('SQL injection detected');}// Check for XSS patterns
    if (this.containsXssAttack(body)) {
      passed = false;
      details.push('XSS attack detected');}return {
      type: 'INPUT_VALIDATION',passed,score: passed ? 100 : 0,
      details: details.join(', ') || 'Input validation passed',evidence: { body: body.length > 1000 ? '[TRUNCATED]' : body },};}

  /**
   * Detect threats in request
   */
  private async detectThreats(
    authResult: AuthenticationResult,
    req: Request
  ): Promise<SecurityValidation> {
    const threats: string[] = [];

    // Check for known malicious IPs
    const ipAddress = this.getClientIpAddress(req);
    if (this.isKnownMaliciousIp(ipAddress)) {
      threats.push('malicious_ip');}// Check for suspicious user agent
    const userAgent = req.get('User-Agent') || '';if (this.isSuspiciousUserAgent(userAgent)) {threats.push('suspicious_user_agent');}const passed = threats.length === 0;

    return {
      type: 'THREAT_DETECTION',passed,score: passed ? 100 : Math.max(0, 100 - (threats.length * 30)),
      details: passed ? 'No threats detected' : `Threats: ${threats.join(`, ')}',evidence: { threats, ipAddress, userAgent },
    };
  }

  /**
   * Validate request content
   */
  private async validateRequestContent(req: Request): Promise<SecurityValidation> {
    const body = req.body || {};
    let passed = true;
    const issues: string[] = [];

    // Check for suspicious URLs in task actions
    if (body.actions && Array.isArray(body.actions)) {
      for (const action of body.actions) {
        if (action.url && this.isSuspiciousUrl(action.url)) {
          passed = false;
          issues.push(`Suspicious URL: ${action.url}`);
        }
      }
    }

    return {
      type: 'INPUT_VALIDATION',passed,score: passed ? 100 : 50,
      details: passed ? 'Content validation passed' : issues.join(', '),evidence: { issues },};
  }

  /**
   * Analyze user behavior patterns
   */
  private async analyzeBehavior(
    userContext: ParlantUserContext,
    req: Request
  ): Promise<SecurityValidation> {
    // Simple behavior analysis - would be more sophisticated in production
    const hour = new Date().getHours();
    let passed = true;
    const anomalies: string[] = [];

    // Check for unusual time patterns
    if (hour < 6 || hour > 22) {
      anomalies.push('unusual_access_time');
    }

    // Check request frequency (placeholder)
    const userRequests = this.rateLimitStore.get(`user:${userContext.userId}`);
    if (userRequests && userRequests.requestsPerMinute > 30) {
      passed = false;
      anomalies.push('high_frequency_requests');}return {
      type: 'THREAT_DETECTION',passed,score: passed ? 100 : 70,
      details: passed ? 'Behavior analysis passed' : `Anomalies: ${anomalies.join(`, ')}',evidence: { anomalies, hour, requestCount: userRequests?.requestsPerMinute || 0 },
    };
  }

  // ===== UTILITY METHODS =====

  private containsSqlInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\\')|(;)|(--)|(\/\*)|(\*\/)/gi,/(union|select|insert|update|delete|drop|create|alter)/gi,];
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private containsXssAttack(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  }

  private isKnownSuspiciousIp(ipAddress: string): boolean {
    // Placeholder - would integrate with threat intelligence services
    const suspiciousRanges = ['192.168.1.100', '10.0.0.100'];return suspiciousRanges.includes(ipAddress);}

  private isKnownMaliciousIp(ipAddress: string): boolean {
    // Placeholder - would integrate with threat intelligence feeds
    return false;
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /havij/i,
    ];
    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  private isSuspiciousUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const suspiciousDomains = ['malicious.com', 'phishing.net'];return suspiciousDomains.includes(urlObj.hostname);} catch {
      return true; // Invalid URLs are suspicious
    }
  }

  private sanitizeParametersForAudit(req: Request): Record<string, unknown> {
    const params = { ...req.body, ...req.query, ...req.params };

    // Remove sensitive data
    const sensitiveKeys = ['password', 'token', 'secret', 'key'];const sanitized: Record<string, unknown> = {};for (const [key, value] of Object.entries(params)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';} else {sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private calculateUserTrustLevel(authResult: AuthenticationResult): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {const score = authResult.score;if (score >= 90) return 'CRITICAL';if (score >= 70) return 'HIGH';if (score >= 50) return 'MEDIUM';return 'LOW';
  }

  private getRateLimitCounters(userId: string): RateLimitCounters {
    return this.rateLimitStore.get(`user:${userId}`) || {
      requestsPerMinute: 0,
      tasksPerHour: 0,
      dataExtractionPerDay: 0,
      lastReset: new Date(),
      violations: 0,
    };
  }

  private mapRiskSeverity(weight: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {if (weight >= 0.8) return 'CRITICAL';if (weight >= 0.6) return 'HIGH';if (weight >= 0.4) return 'MEDIUM';return 'LOW';}private getThreatIndicators(userId: string): ThreatIndicator[] {
    return this.threatDetectionCache.get(userId) || [];
  }

  private getMonitoringLevel(riskLevel: string): 'BASIC' | 'ENHANCED' | 'COMPREHENSIVE' {switch (riskLevel.toLowerCase()) {case 'critical':case 'high':return 'COMPREHENSIVE';case 'medium':return 'ENHANCED';default:return 'BASIC';
    }
  }

  private validateEndpointSpecificSecurity(
    endpoint: string,
    userContext: ParlantUserContext,
    req: Request
  ): Promise<void> {
    // Placeholder for endpoint-specific security validations
    return Promise.resolve();
  }

  private updatePerformanceMetrics(processingTime: number): void {
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalRequests - 1) + processingTime)
      / this.metrics.totalRequests;
  }

  private logAuthenticationSuccess(
    operationId: string,
    authResult: AuthenticationResult,
    req: Request
  ): void {
    this.logger.log(
      `[${operationId}] Browser use authentication successful`,{userId: authResult.userContext!.userId,
        sessionId: authResult.session?.sessionId,
        endpoint: `${req.method} ${req.url}`,riskScore: authResult.score,securityLevel: authResult.session?.securityLevel,
      }
    );
  }

  private handleAuthenticationError(
    operationId: string,
    error: any,
    req: Request,
    res: Response,
    processingTime: number
  ): void {
    this.metrics.deniedRequests++;
    this.updatePerformanceMetrics(processingTime);

    this.logger.error(
      `[${operationId}] Browser use authentication failed`,{error: error instanceof Error ? error.message : String(error),
        endpoint: `${req.method} ${req.url}`,
        ipAddress: this.getClientIpAddress(req),
        userAgent: req.get('User-Agent'),processingTime,}
    );

    // Return appropriate error response
    if (error instanceof UnauthorizedException) {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',message: error.message,operationId,
        timestamp: new Date().toISOString(),
      });
    } else if (error instanceof ForbiddenException) {
      res.status(403).json({
        success: false,
        error: 'Access forbidden',message: error.message,operationId,
        timestamp: new Date().toISOString(),
      });
    } else if (error instanceof TooManyRequestsException) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',message: error.message,operationId,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',message: 'Authentication processing failed',operationId,timestamp: new Date().toISOString(),
      });
    }
  }

  private performSecurityCleanup(): void {
    const now = Date.now();
    const cleanupThreshold = 3600000; // 1 hour

    // Clean old rate limit entries
    for (const [key, counters] of this.rateLimitStore.entries()) {
      if (now - counters.lastReset.getTime() > cleanupThreshold) {
        this.rateLimitStore.delete(key);
      }
    }

    // Clean old security cache entries
    this.securityCache.clear();

    this.logger.debug('Security cache cleanup completed', {rateLimitEntries: this.rateLimitStore.size,securityCacheEntries: this.securityCache.size,
    });
  }

  private logSecurityMetrics(): void {
    this.logger.log('Browser Use Security Metrics', {
      totalRequests: this.metrics.totalRequests,
      authenticatedRequests: this.metrics.authenticatedRequests,
      deniedRequests: this.metrics.deniedRequests,
      rateLimitedRequests: this.metrics.rateLimitedRequests,
      securityViolations: this.metrics.securityViolations,
      averageProcessingTime: `${this.metrics.averageProcessingTime.toFixed(2)}ms`,authenticationSuccessRate: `${((this.metrics.authenticatedRequests / this.metrics.totalRequests) * 100).toFixed(2)}%`,
    });
  }

  /**
   * Get current security metrics for monitoring
   */
  getSecurityMetrics() {
    return {
      ...this.metrics,
      authenticationSuccessRate: (this.metrics.authenticatedRequests / this.metrics.totalRequests) * 100,
      activeSessions: this.rateLimitStore.size,
      securityCacheSize: this.securityCache.size,
    };
  }
}