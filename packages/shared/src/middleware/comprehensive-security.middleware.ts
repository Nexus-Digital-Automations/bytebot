/**
 * Comprehensive Security Middleware - Enterprise CORS & Security Headers
 *
 * This middleware provides production-ready security policies including:
 * - Dynamic CSP with nonce generation and violation reporting
 * - Environment-specific CORS policies with pattern matching
 * - Comprehensive security headers with helmet.js integration
 * - Security event monitoring and risk scoring
 * - DDoS protection and rate limiting integration
 *
 * @fileoverview Enterprise-grade security middleware with comprehensive protection
 * @version 2.0.0
 * @author CORS & Security Implementation Specialist
 */

import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import { IncomingMessage, ServerResponse } from "node:http";
import helmet from "helmet";
import { randomBytes } from "crypto";
import {
  getEnvironmentConfig,
  validateOriginPattern,
  calculateCorsRiskScore,
  CorsSecurityEnvironmentConfig,
} from "../config/cors-security.config";
import { SecurityEventType, SecurityEvent } from "../types/security.types";
import { ExtendedRequest, ExtendedResponse } from "../types/express-extensions";

// Re-export SecurityEventType and SecurityEvent for easier imports
export { SecurityEventType, SecurityEvent };

/**
 * CSP violation report interface
 */
export interface CSPViolationReport {
  "document-uri": string;
  "violated-directive": string;
  "blocked-uri": string;
  "source-file": string;
  "line-number": number;
  "column-number": number;
  "status-code": number;
}

/**
 * Comprehensive security configuration
 */
export interface ComprehensiveSecurityConfig {
  serviceName: string;
  environment: string;
  enableCSP: boolean;
  enableCSPReporting: boolean;
  cspReportEndpoint: string;
  enableHSTS: boolean;
  hstsMaxAge: number;
  enableVNC: boolean;
  enableSwagger: boolean;
  customOrigins: string[];
  trustedProxies: string[];
  enableSecurityLogging: boolean;
  enableDynamicNonce: boolean;
  enableRiskScoring: boolean;
  maxRiskScore: number;
  blockHighRiskRequests: boolean;
}

@Injectable()
export class ComprehensiveSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ComprehensiveSecurityMiddleware.name);
  private readonly config: ComprehensiveSecurityConfig;
  private readonly envConfig: CorsSecurityEnvironmentConfig;
  private readonly helmetMiddleware: (
    _req: Request,
    _res: Response,
    _next: NextFunction,
  ) => void;
  private readonly nonceMap = new Map<string, string>();

  constructor(private _configService: ConfigService) {
    const environment = this._configService.get<string>(
      "NODE_ENV",
      "development",
    );
    const serviceName = this._configService.get<string>(
      "SERVICE_NAME",
      "Bytebot-Service",
    );

    // Load environment-specific configuration
    this.envConfig = getEnvironmentConfig(environment);

    // Build comprehensive security configuration
    this.config = {
      serviceName: serviceName,
      environment: environment,
      enableCSP: this.envConfig.security.enableCSP,
      enableCSPReporting: this.envConfig.security.enableCSPReporting,
      cspReportEndpoint: "/api/security/csp-report",
      enableHSTS: this.envConfig.security.enableHSTS,
      hstsMaxAge: environment === "production" ? 31536000 : 86400,
      enableVNC: serviceName.toLowerCase().includes("bytebotd"),
      enableSwagger:
        environment !== "production" && serviceName.includes("Agent"),
      customOrigins: (this._configService.get<string>("CORS_ORIGINS", "") || "")
        .split(",")
        .filter(Boolean),
      trustedProxies: this.envConfig.trustedProxies,
      enableSecurityLogging: this.envConfig.security.logCorsViolations,
      enableDynamicNonce: true,
      enableRiskScoring: true,
      maxRiskScore: 75,
      blockHighRiskRequests: environment === "production",
    };

    // Initialize helmet middleware
    this.helmetMiddleware = this.createComprehensiveHelmetConfig();

    this.logger.log("Comprehensive security middleware initialized", {
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      csp: this.config.enableCSP,
      hsts: this.config.enableHSTS,
      vnc: this.config.enableVNC,
      swagger: this.config.enableSwagger,
      riskScoring: this.config.enableRiskScoring,
    });
  }

  /**
   * Apply comprehensive security middleware to request
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    // Set correlation ID for request tracking
    const extendedReq = req as ExtendedRequest;
    extendedReq.correlationId = operationId;

    this.logger.debug(`[${operationId}] Processing security middleware`, {
      method: req.method,
      url: req.url,
      origin: req.get("Origin"),
      userAgent: req.get("User-Agent")?.substring(0, 100),
      ip: this.getClientIP(req),
    });

    try {
      // Generate dynamic nonce for CSP
      const nonce = this.generateNonce(operationId);
      (req as ExtendedRequest).nonce = nonce;
      const extendedRes = res as ExtendedResponse;
      extendedRes.locals = {
        ...extendedRes.locals,
        nonce,
      };

      // Apply CORS validation first
      const corsResult = this.validateCORS(req, res, operationId);
      if (!corsResult.allowed && this.config.blockHighRiskRequests) {
        return this.handleSecurityViolation(
          req,
          res,
          SecurityEventType._CORS_VIOLATION,
          corsResult.reason,
          operationId,
          corsResult.riskScore,
        );
      }

      // Apply comprehensive helmet security headers
      this.helmetMiddleware(req, res, (err?: unknown) => {
        if (err) {
          this.logger.error(`[${operationId}] Helmet middleware error`, {
            operationId,
            error: (err as Error).message,
            processingTimeMs: Date.now() - startTime,
          });
          return next(err);
        }

        // Apply additional security headers
        this.applyAdditionalSecurityHeaders(req, res, nonce, operationId);

        // Set up CSP violation reporting
        this.setupCSPReporting(req, res, operationId);

        // Log successful processing
        const processingTime = Date.now() - startTime;
        this.logger.debug(`[${operationId}] Security middleware completed`, {
          operationId,
          processingTimeMs: processingTime,
          corsAllowed: corsResult.allowed,
          riskScore: corsResult.riskScore,
        });

        next();
      });
    } catch (err) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] Security middleware error`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        processingTimeMs: processingTime,
      });

      this.logSecurityEvent({
        eventId: operationId,
        type: SecurityEventType._MALFORMED_REQUEST,
        timestamp: new Date(),
        serviceName: this.config.serviceName,
        environment: this.config.environment,
        origin: req.get("Origin"),
        ipAddress: this.getClientIP(req),
        userAgent: req.get("User-Agent"),
        endpoint: req.url,
        method: req.method,
        riskScore: 80,
        blocked: true,
        success: false,
        reason: err instanceof Error ? err.message : String(err),
        metadata: { operationId, processingTimeMs: processingTime },
      });

      next(err);
    }
  }

  /**
   * Create comprehensive helmet configuration
   */
  private createComprehensiveHelmetConfig(): (
    _req: Request,
    _res: Response,
    _next: NextFunction,
  ) => void {
    const { config, envConfig } = this;

    return helmet({
      // Content Security Policy with dynamic nonce support
      contentSecurityPolicy: config.enableCSP
        ? {
            directives: {
              defaultSrc: ["'self'"],

              scriptSrc: [
                "'self'",
                // Dynamic nonce will be added per request
                (req: IncomingMessage, res: ServerResponse) => {
                  const extendedRes = res as ExtendedResponse;
                  const nonce = extendedRes.locals?.nonce;
                  return `'nonce-${typeof nonce === "string" ? nonce : ""}'`;
                },
                ...(config.enableSwagger
                  ? ["'unsafe-inline'", "'unsafe-eval'"]
                  : []),
                ...(config.enableVNC
                  ? ["'unsafe-inline'", "'unsafe-eval'"]
                  : []),
                "https://cdn.jsdelivr.net",
                "https://unpkg.com",
                "https://cdnjs.cloudflare.com",
              ],

              styleSrc: [
                "'self'",
                "'unsafe-inline'", // Required for many UI frameworks
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net",
              ],

              fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdn.jsdelivr.net",
                "data:",
              ],

              imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https:",
                ...(config.environment === "development"
                  ? ["http://localhost:*"]
                  : []),
              ],

              connectSrc: [
                "'self'",
                "ws:",
                "wss:",
                ...(config.environment === "development"
                  ? ["http://localhost:*", "https://localhost:*"]
                  : []),
                ...(envConfig.websocketOrigins || []),
                // Add production API endpoints
                ...(config.environment === "production"
                  ? ["https://api.bytebot.ai", "wss://app.bytebot.ai"]
                  : []),
              ],

              objectSrc: ["'none'"],
              mediaSrc: ["'self'", "blob:", "data:"],

              frameSrc: config.enableVNC
                ? [
                    "'self'",
                    ...(config.environment === "development"
                      ? ["http://localhost:*"]
                      : []),
                  ]
                : ["'none'"],

              frameAncestors: config.enableVNC
                ? ["'self'", ...envConfig.allowedOrigins]
                : ["'none'"],

              baseUri: ["'self'"],
              formAction: ["'self'"],

              // Report violations (using modern reportTo instead of deprecated reportUri)
              ...(config.enableCSPReporting
                ? { reportTo: [config.cspReportEndpoint] }
                : {}),

              // Upgrade insecure requests in production
              ...(config.environment === "production"
                ? { upgradeInsecureRequests: [] }
                : {}),
            },
            reportOnly: config.environment === "development",
          }
        : false,

      // HTTP Strict Transport Security
      hsts: config.enableHSTS
        ? {
            maxAge: config.hstsMaxAge,
            includeSubDomains: true,
            preload: config.environment === "production",
          }
        : false,

      // Cross-Origin Policies
      crossOriginEmbedderPolicy: false, // Disabled for WebSocket compatibility
      crossOriginOpenerPolicy: {
        policy: config.enableVNC ? "same-origin-allow-popups" : "same-origin",
      },
      crossOriginResourcePolicy: { policy: "cross-origin" },

      // DNS Prefetch Control
      dnsPrefetchControl: { allow: false },

      // Frame Protection
      frameguard: {
        action: config.enableVNC ? "sameorigin" : "deny",
      },

      // Hide server information
      hidePoweredBy: true,

      // IE Protection
      ieNoOpen: true,

      // MIME type sniffing protection
      noSniff: true,

      // Origin Agent Cluster
      originAgentCluster: true,

      // Cross-domain policies
      permittedCrossDomainPolicies: false,

      // Referrer Policy
      referrerPolicy: {
        policy: "strict-origin-when-cross-origin",
      },

      // XSS Protection
      xssFilter: true,

      // Note: expectCt has been removed from helmet v8 as Certificate Transparency
      // is now widely supported and the header is no longer needed

      // Note: permissionsPolicy has been removed from helmet v8.
      // Use a separate Permissions-Policy header middleware if needed
    });
  }

  /**
   * Validate CORS origin with comprehensive checks
   */
  private validateCORS(
    req: Request,
    res: Response,
    operationId: string,
  ): {
    allowed: boolean;
    reason: string;
    riskScore: number;
  } {
    const origin = req.get("Origin");

    if (!origin) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      return { allowed: true, reason: "No origin header", riskScore: 0 };
    }

    // Check against environment-specific patterns
    const patternValidation = validateOriginPattern(
      origin,
      this.config.environment,
    );
    if (patternValidation.valid) {
      this.applyCORSHeaders(req, res, origin, operationId);
      return { allowed: true, reason: patternValidation.reason, riskScore: 10 };
    }

    // Check custom origins
    const allAllowedOrigins = [
      ...this.envConfig.allowedOrigins,
      ...this.config.customOrigins,
    ];

    if (allAllowedOrigins.includes(origin)) {
      this.applyCORSHeaders(req, res, origin, operationId);
      return { allowed: true, reason: "Explicitly allowed", riskScore: 5 };
    }

    // Calculate risk score for blocked origin
    const riskScore = calculateCorsRiskScore(origin, this.config.environment, {
      userAgent: req.get("User-Agent"),
      referer: req.get("Referer"),
      ipAddress: this.getClientIP(req),
    });

    // Log security event for blocked origin
    this.logSecurityEvent({
      eventId: operationId,
      type: SecurityEventType._CORS_VIOLATION,
      timestamp: new Date(),
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      origin,
      ipAddress: this.getClientIP(req),
      userAgent: req.get("User-Agent"),
      endpoint: req.url,
      method: req.method,
      riskScore,
      blocked: true,
      success: false,
      reason: "Origin not allowed by CORS policy",
      metadata: {
        operationId,
        allowedOrigins: allAllowedOrigins.length,
        patternValidation: patternValidation.reason,
      },
    });

    return {
      allowed: false,
      reason: "Origin not allowed by CORS policy",
      riskScore,
    };
  }

  /**
   * Apply CORS headers for allowed origins
   */
  private applyCORSHeaders(
    req: Request,
    res: Response,
    origin: string,
    operationId: string,
  ): void {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS",
      );
      res.setHeader(
        "Access-Control-Allow-Headers",
        [
          "Content-Type",
          "Authorization",
          "X-Requested-With",
          "Accept",
          "Origin",
          "Cache-Control",
          "X-API-Key",
          "X-Service-ID",
          "X-Request-ID",
        ].join(", "),
      );

      res.setHeader(
        "Access-Control-Expose-Headers",
        [
          "X-Request-ID",
          "X-Response-Time",
          "X-Rate-Limit-Remaining",
          "X-Total-Count",
          "X-Service-ID",
          "X-API-Version",
        ].join(", "),
      );

      const maxAge = this.config.environment === "production" ? 86400 : 3600;
      res.setHeader("Access-Control-Max-Age", maxAge.toString());
    }

    this.logger.debug(
      `[${operationId}] CORS headers applied for origin: ${origin}`,
    );
  }

  /**
   * Apply additional security headers
   */
  private applyAdditionalSecurityHeaders(
    req: Request,
    res: Response,
    nonce: string,
    operationId: string,
  ): void {
    // Service identification headers
    res.setHeader("X-Service", this.config.serviceName);
    res.setHeader("X-API-Version", "2.0");
    res.setHeader("X-Environment", this.config.environment);
    res.setHeader("X-Security-Level", this.getSecurityLevel());

    // Request tracking
    res.setHeader("X-Request-ID", operationId);
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Dynamic nonce for CSP
    if (this.config.enableDynamicNonce) {
      res.setHeader("X-CSP-Nonce", nonce);
    }

    // Remove sensitive headers in production
    if (this.config.environment === "production") {
      res.removeHeader("X-Powered-By");
      res.removeHeader("Server");
      res.removeHeader("X-AspNet-Version");
      res.removeHeader("X-AspNetMvc-Version");
    }

    // Rate limiting information (if available from previous middleware)
    const extendedReq = req as ExtendedRequest;
    if (extendedReq.rateLimit) {
      const { rateLimit } = extendedReq;
      const remaining =
        typeof rateLimit.remaining === "number" ? rateLimit.remaining : 0;
      const reset = typeof rateLimit.reset === "number" ? rateLimit.reset : 0;
      res.setHeader("X-Rate-Limit-Remaining", remaining.toString());
      res.setHeader("X-Rate-Limit-Reset", reset.toString());
    }

    this.logger.debug(`[${operationId}] Additional security headers applied`);
  }

  /**
   * Setup CSP violation reporting
   */
  private setupCSPReporting(
    req: Request,
    res: Response,
    operationId: string,
  ): void {
    if (!this.config.enableCSPReporting) {
      return;
    }

    // Add CSP report endpoint if not already handled
    if (req.url === this.config.cspReportEndpoint && req.method === "POST") {
      this.handleCSPViolationReport(req, res, operationId);
      return;
    }
  }

  /**
   * Handle CSP violation reports
   */
  private handleCSPViolationReport(
    req: Request,
    res: Response,
    operationId: string,
  ): void {
    try {
      const report = req.body as { "csp-report": CSPViolationReport };
      const violation = report["csp-report"];

      if (violation) {
        this.logSecurityEvent({
          eventId: operationId,
          type: SecurityEventType._CSP_VIOLATION,
          timestamp: new Date(),
          serviceName: this.config.serviceName,
          environment: this.config.environment,
          endpoint: violation["document-uri"],
          method: "CSP_REPORT",
          riskScore: this.calculateCSPViolationRisk(violation),
          blocked: true,
          success: false,
          reason: `CSP violation: ${violation["violated-directive"]}`,
          metadata: {
            violatedDirective: violation["violated-directive"],
            blockedUri: violation["blocked-uri"],
            sourceFile: violation["source-file"],
            lineNumber: violation["line-number"],
            columnNumber: violation["column-number"],
          },
        });
      }

      res.status(204).end();
    } catch (err) {
      this.logger.error(
        `[${operationId}] Failed to process CSP violation report`,
        {
          error: err instanceof Error ? err.message : String(err),
        },
      );
      res.status(400).end();
    }
  }

  /**
   * Calculate CSP violation risk score
   */
  private calculateCSPViolationRisk(violation: CSPViolationReport): number {
    let riskScore = 30; // Base risk for CSP violation

    // Higher risk for script violations
    if (violation["violated-directive"].includes("script-src")) {
      riskScore += 40;
    }

    // Higher risk for external domains
    if (
      violation["blocked-uri"] &&
      !violation["blocked-uri"].includes(this.envConfig.domains.primary)
    ) {
      riskScore += 25;
    }

    // Higher risk for eval attempts
    if (violation["blocked-uri"].includes("eval")) {
      riskScore += 35;
    }

    return Math.min(100, riskScore);
  }

  /**
   * Handle security violations
   */
  private handleSecurityViolation(
    req: Request,
    res: Response,
    eventType: SecurityEventType,
    reason: string,
    operationId: string,
    riskScore: number,
  ): void {
    // Set security violation headers
    res.setHeader("X-Security-Violation", eventType);
    res.setHeader("X-Risk-Score", riskScore.toString());
    res.setHeader("X-Blocked-Reason", reason);

    // Log security event
    this.logSecurityEvent({
      eventId: operationId,
      type: eventType,
      timestamp: new Date(),
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      origin: req.get("Origin"),
      ipAddress: this.getClientIP(req),
      userAgent: req.get("User-Agent"),
      endpoint: req.url,
      method: req.method,
      riskScore,
      blocked: true,
      success: false,
      reason,
      metadata: { operationId },
    });

    // Return appropriate error response
    const errorResponse = {
      error: "Security Policy Violation",
      code: "SECURITY_VIOLATION",
      message:
        this.config.environment === "production"
          ? "Request blocked by security policy"
          : reason,
      riskScore:
        this.config.environment !== "production" ? riskScore : undefined,
      timestamp: new Date().toISOString(),
      requestId: operationId,
    };

    res.status(403).json(errorResponse);
  }

  /**
   * Log security event with structured format
   */
  private logSecurityEvent(event: SecurityEvent): void {
    if (!this.config.enableSecurityLogging) {
      return;
    }

    const logLevel =
      event.riskScore > 70 ? "error" : event.riskScore > 40 ? "warn" : "log";

    // Safe dynamic logger access with type guards
    const logData = {
      eventId: event.eventId,
      type: event.type,
      serviceName: event.serviceName,
      environment: event.environment,
      riskScore: event.riskScore,
      blocked: event.blocked,
      origin: event.origin,
      ipAddress: event.ipAddress,
      endpoint: event.endpoint,
      method: event.method,
      reason: event.reason,
      timestamp: event.timestamp.toISOString(),
      metadata: event.metadata,
    };

    if (logLevel === "error" && typeof this.logger.error === "function") {
      this.logger.error(`Security Event: ${event.type}`, logData);
    } else if (logLevel === "warn" && typeof this.logger.warn === "function") {
      this.logger.warn(`Security Event: ${event.type}`, logData);
    } else if (typeof this.logger.log === "function") {
      this.logger.log(`Security Event: ${event.type}`, logData);
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `sec-${Date.now()}-${randomBytes(4).toString("hex")}`;
  }

  /**
   * Generate cryptographic nonce for CSP
   */
  private generateNonce(operationId: string): string {
    const nonce = randomBytes(16).toString("base64");
    this.nonceMap.set(operationId, nonce);

    // Clean up old nonces (prevent memory leaks)
    setTimeout(() => {
      this.nonceMap.delete(operationId);
    }, 60000); // 1 minute

    return nonce;
  }

  /**
   * Get client IP address considering proxies
   */
  private getClientIP(req: Request): string {
    const forwardedFor = req.get("X-Forwarded-For");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }

    const realIP = req.get("X-Real-IP");
    if (realIP) {
      return realIP;
    }

    return req.ip || req.socket?.remoteAddress || "unknown";
  }

  /**
   * Get security level based on service type
   */
  private getSecurityLevel(): string {
    const serviceName = this.config.serviceName.toLowerCase();

    if (serviceName.includes("bytebotd")) {
      return "MAXIMUM";
    } else if (serviceName.includes("agent")) {
      return "HIGH";
    } else if (serviceName.includes("ui")) {
      return "STANDARD";
    }

    return "STANDARD";
  }

  /**
   * Get current security configuration (for debugging)
   */
  getSecurityConfig(): ComprehensiveSecurityConfig {
    return { ...this.config };
  }

  /**
   * Validate security headers on response (for testing)
   */
  validateResponseHeaders(headers: Record<string, string>): {
    valid: boolean;
    missing: string[];
    recommendations: string[];
  } {
    const missing: string[] = [];
    const recommendations: string[] = [];

    // Essential security headers
    const essentialHeaders = [
      "x-content-type-options",
      "x-frame-options",
      "referrer-policy",
      "x-service",
    ];

    essentialHeaders.forEach((header) => {
      if (!headers[header]) {
        missing.push(header);
      }
    });

    // Environment-specific recommendations
    if (this.config.environment === "production") {
      if (!headers["strict-transport-security"]) {
        missing.push("strict-transport-security");
        recommendations.push("Enable HSTS for production environment");
      }

      if (headers["x-powered-by"]) {
        recommendations.push("Remove X-Powered-By header in production");
      }
    }

    // CSP recommendations
    if (this.config.enableCSP && !headers["content-security-policy"]) {
      missing.push("content-security-policy");
      recommendations.push("Content Security Policy should be configured");
    }

    return {
      valid: missing.length === 0,
      missing,
      recommendations,
    };
  }
}

export default ComprehensiveSecurityMiddleware;
