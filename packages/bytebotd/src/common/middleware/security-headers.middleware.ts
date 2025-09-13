/**
 * Security Headers Middleware - Comprehensive HTTP Security Headers for BytebotD
 *
 * This middleware implements enterprise-grade security headers using helmet.js
 * with production-ready configurations for CSP, HSTS, CORS, and other security
 * headers. Includes environment-specific configurations and security monitoring.
 *
 * @fileoverview Enterprise security headers middleware for BytebotD service
 * @version 1.0.0
 * @author Security Headers & CORS Specialist
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { SecurityEventType, createSecurityEvent } from '@bytebot/shared';

/**
 * Type-safe Express request with correlation ID
 */
interface SafeRequest extends Request {
  correlationId?: string;
}

/**
 * Type-safe helmet options interface
 */
interface SafeHelmetOptions {
  contentSecurityPolicy?:
    | {
        directives: Record<string, string[]>;
        reportOnly?: boolean;
      }
    | false;
  hsts?:
    | {
        maxAge: number;
        includeSubDomains: boolean;
        preload: boolean;
      }
    | false;
  frameguard?:
    | {
        action: 'deny' | 'sameorigin';
      }
    | false;
  noSniff?: boolean;
  xssFilter?: boolean;
  referrerPolicy?:
    | {
        policy: string;
      }
    | false;
  hidePoweredBy?: boolean;
  dnsPrefetchControl?: {
    allow: boolean;
  };
}

/**
 * Type-safe error with known properties
 */
interface SafeError extends Error {
  message: string;
  stack?: string;
}

/**
 * Security headers configuration interface
 */
interface SecurityMiddlewareConfig {
  /** Environment (development, staging, production) */
  environment: string;

  /** Enable Content Security Policy */
  csp: boolean;

  /** CSP directives */
  cspDirectives?: Record<string, string[]>;

  /** Enable HSTS */
  hsts: boolean;

  /** HSTS max age in seconds */
  hstsMaxAge: number;

  /** Include subdomains in HSTS */
  hstsIncludeSubDomains: boolean;

  /** Enable HSTS preload */
  hstsPreload: boolean;

  /** Frame options value */
  frameOptions: 'DENY' | 'SAMEORIGIN' | false;

  /** Enable X-Content-Type-Options: nosniff */
  noSniff: boolean;

  /** Enable X-XSS-Protection */
  xssFilter: boolean;

  /** Enable referrer policy */
  referrerPolicy: string | false;

  /** Allowed CORS origins */
  corsOrigins: string[] | string;

  /** CORS credentials */
  corsCredentials: boolean;

  /** Custom security headers */
  customHeaders?: Record<string, string>;

  /** Enable security event logging */
  enableSecurityLogging: boolean;

  /** Trusted proxies for IP detection */
  trustedProxies?: string[];
}

/**
 * Default security configurations by environment
 */
const SECURITY_CONFIGS: Record<string, Partial<SecurityMiddlewareConfig>> = {
  development: {
    csp: false, // Relaxed CSP for development
    hsts: false, // No HSTS in development
    frameOptions: 'SAMEORIGIN',
    corsOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8080',
    ],
    corsCredentials: true,
    enableSecurityLogging: false,
  },

  staging: {
    csp: true,
    hsts: true,
    hstsMaxAge: 86400, // 1 day
    hstsIncludeSubDomains: true,
    hstsPreload: false,
    frameOptions: 'DENY',
    corsCredentials: true,
    enableSecurityLogging: true,
  },

  production: {
    csp: true,
    hsts: true,
    hstsMaxAge: 31536000, // 1 year
    hstsIncludeSubDomains: true,
    hstsPreload: true,
    frameOptions: 'DENY',
    corsCredentials: true,
    enableSecurityLogging: true,
    customHeaders: {
      'X-Powered-By': '', // Remove X-Powered-By header
      Server: '', // Remove Server header
      'X-Service': 'BytebotD',
      'X-API-Version': '1.0',
    },
  },
};

/**
 * Default CSP directives optimized for BytebotD desktop service
 */
const DEFAULT_CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    "'unsafe-eval'",
    'https://cdn.jsdelivr.net',
  ],
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
  'img-src': ["'self'", 'data:', 'https:', 'blob:', 'http://localhost:*'],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'", 'http://localhost:*'],
  'upgrade-insecure-requests': [],
  'connect-src': [
    "'self'",
    'ws:',
    'wss:',
    'http://localhost:*',
    'https://localhost:*',
  ],
};

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);
  private readonly config: SecurityMiddlewareConfig;
  private readonly helmetMiddleware: (
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => void;

  constructor(private configService: ConfigService) {
    const environment =
      this.configService.get<string>('NODE_ENV') ?? 'development';
    const corsOrigins = this.configService.get<string[]>('CORS_ORIGINS') ?? [
      'http://localhost:3000',
      'http://localhost:8080',
    ];
    const securityHeaders =
      this.configService.get<Partial<SecurityMiddlewareConfig>>(
        'security.headers',
      ) ?? {};

    // Build configuration with type safety
    this.config = {
      environment,
      csp: true,
      hsts: environment === 'production',
      hstsMaxAge: environment === 'production' ? 31536000 : 86400,
      hstsIncludeSubDomains: true,
      hstsPreload: environment === 'production',
      frameOptions: 'SAMEORIGIN', // Allow framing for VNC viewer
      noSniff: true,
      xssFilter: true,
      referrerPolicy: 'same-origin',
      corsOrigins,
      corsCredentials: true,
      enableSecurityLogging: environment !== 'development',
      ...SECURITY_CONFIGS[environment],
      // Override with specific config values
      ...securityHeaders,
    };

    // Initialize helmet middleware
    this.helmetMiddleware = this.createHelmetMiddleware();

    this.logger.log('BytebotD security headers middleware initialized', {
      environment,
      csp: this.config.csp,
      hsts: this.config.hsts,
      frameOptions: this.config.frameOptions,
      corsOrigins: Array.isArray(this.config.corsOrigins)
        ? this.config.corsOrigins.length
        : 'wildcard',
      securityLogging: this.config.enableSecurityLogging,
    });
  }

  /**
   * Apply security headers to request
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const operationId = `security-headers-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    // Set correlation ID for request tracking with type safety
    const safeReq = req as SafeRequest;
    safeReq.correlationId = operationId;

    this.logger.debug(`[${operationId}] Applying BytebotD security headers`, {
      operationId,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      origin: req.get('Origin'),
    });

    try {
      // Apply helmet security headers
      this.helmetMiddleware(req, res, (err?: Error | null) => {
        if (err) {
          const processingTime = Date.now() - startTime;
          const safeError = err as SafeError;

          this.logger.error(`[${operationId}] Helmet middleware error`, {
            operationId,
            error: safeError.message,
            stack: safeError.stack,
            processingTimeMs: processingTime,
          });

          // Log security event for middleware failure
          this.logSecurityEvent(
            req,
            'MIDDLEWARE_ERROR',
            safeError.message,
            operationId,
          );

          return next(err);
        }

        // Apply custom security headers
        this.applyCustomHeaders(res, operationId);

        // Apply CORS headers
        this.applyCorsHeaders(req, res, operationId);

        // Log successful application
        const processingTime = Date.now() - startTime;

        this.logger.debug(
          `[${operationId}] BytebotD security headers applied successfully`,
          {
            operationId,
            processingTimeMs: processingTime,
            headersCount: Object.keys(res.getHeaders()).length,
          },
        );

        next();
      });
    } catch (caughtError) {
      const processingTime = Date.now() - startTime;
      const safeError = caughtError as SafeError;

      this.logger.error(`[${operationId}] Security headers middleware error`, {
        operationId,
        error: safeError.message,
        stack: safeError.stack,
        processingTimeMs: processingTime,
      });

      // Log security event
      this.logSecurityEvent(
        req,
        'MIDDLEWARE_FAILURE',
        safeError.message,
        operationId,
      );

      next(caughtError);
    }
  }

  /**
   * Create helmet middleware with BytebotD-specific configuration
   */
  private createHelmetMiddleware(): (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => void {
    const helmetOptions: SafeHelmetOptions = {
      // Content Security Policy optimized for desktop service
      contentSecurityPolicy: this.config.csp
        ? {
            directives: {
              ...DEFAULT_CSP_DIRECTIVES,
              ...this.config.cspDirectives,
            },
            reportOnly: this.config.environment === 'development',
          }
        : false,

      // HTTP Strict Transport Security
      hsts: this.config.hsts
        ? {
            maxAge: this.config.hstsMaxAge,
            includeSubDomains: this.config.hstsIncludeSubDomains,
            preload: this.config.hstsPreload,
          }
        : false,

      // X-Frame-Options - Allow framing for VNC viewer
      frameguard: this.config.frameOptions
        ? {
            action: this.config.frameOptions.toLowerCase() as
              | 'deny'
              | 'sameorigin',
          }
        : false,

      // X-Content-Type-Options
      noSniff: this.config.noSniff,

      // X-XSS-Protection
      xssFilter: this.config.xssFilter,

      // Referrer Policy
      referrerPolicy: this.config.referrerPolicy
        ? {
            policy: this.config.referrerPolicy as
              | 'same-origin'
              | 'strict-origin'
              | 'strict-origin-when-cross-origin'
              | 'no-referrer'
              | 'no-referrer-when-downgrade'
              | 'origin'
              | 'origin-when-cross-origin'
              | 'unsafe-url',
          }
        : false,

      // Hide X-Powered-By
      hidePoweredBy: true,

      // DNS Prefetch Control
      dnsPrefetchControl: {
        allow: false,
      },

      // Note: Expect-CT has been deprecated and removed from helmet v8.1.0
      // CT (Certificate Transparency) is now handled by browsers automatically

      // Note: Permissions Policy is not directly supported by helmet v8.1.0
      // It should be configured separately if needed via custom middleware
    };

    return helmet(helmetOptions);
  }

  /**
   * Apply custom security headers for BytebotD
   */
  private applyCustomHeaders(res: Response, operationId: string): void {
    if (!this.config.customHeaders) {
      return;
    }

    let headersApplied = 0;

    for (const [header, value] of Object.entries(this.config.customHeaders)) {
      if (value === '') {
        // Remove header
        res.removeHeader(header);
      } else {
        // Set header
        res.setHeader(header, value);
      }
      headersApplied++;
    }

    this.logger.debug(
      `[${operationId}] Applied custom BytebotD security headers`,
      {
        operationId,
        headersApplied,
        headers: Object.keys(this.config.customHeaders),
      },
    );
  }

  /**
   * Apply CORS headers with BytebotD-specific origins
   */
  private applyCorsHeaders(
    req: Request,
    res: Response,
    operationId: string,
  ): void {
    const origin = req.get('Origin');

    if (!origin) {
      return; // No CORS needed for same-origin requests
    }

    // Check if origin is allowed
    const isAllowedOrigin = this.isOriginAllowed(origin);

    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);

      if (this.config.corsCredentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      // Set other CORS headers for preflight
      if (req.method === 'OPTIONS') {
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        );
        res.setHeader(
          'Access-Control-Allow-Headers',
          'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key, X-Service-ID',
        );
        res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      }

      this.logger.debug(`[${operationId}] BytebotD CORS headers applied`, {
        operationId,
        origin,
        credentials: this.config.corsCredentials,
        method: req.method,
        isPreflight: req.method === 'OPTIONS',
      });
    } else {
      // Log potential security issue
      this.logger.warn(
        `[${operationId}] CORS blocked for unauthorized origin`,
        {
          operationId,
          origin,
          method: req.method,
          url: req.url,
          ip: req.ip,
        },
      );

      this.logSecurityEvent(
        req,
        'CORS_VIOLATION',
        `Unauthorized origin: ${origin}`,
        operationId,
      );
    }
  }

  /**
   * Check if origin is allowed by CORS policy
   */
  private isOriginAllowed(origin: string): boolean {
    if (typeof this.config.corsOrigins === 'string') {
      return (
        this.config.corsOrigins === '*' ?? this.config.corsOrigins === origin
      );
    }

    if (Array.isArray(this.config.corsOrigins)) {
      return (
        this.config.corsOrigins.includes(origin) ||
        this.config.corsOrigins.includes('*') ||
        this.config.corsOrigins.some((allowed) => {
          // Support wildcard subdomains
          if (allowed.startsWith('*.')) {
            const domain = allowed.substring(2);
            return origin.endsWith(domain);
          }
          // Support localhost with any port
          if (allowed.includes('localhost:*')) {
            const baseOrigin = allowed.replace(':*', '');
            return origin.startsWith(baseOrigin);
          }
          return allowed === origin;
        })
      );
    }

    return false;
  }

  /**
   * Log security events for audit purposes
   */
  private logSecurityEvent(
    req: Request,
    eventType: string,
    message: string,
    operationId: string,
  ): void {
    if (!this.config.enableSecurityLogging) {
      return;
    }

    try {
      const securityEventType = this.mapEventType(eventType);

      const securityEvent = createSecurityEvent(
        securityEventType,
        req.url,
        req.method,
        false,
        message,
        {
          operationId,
          middleware: 'security-headers',
          service: 'BytebotD',
          eventType,
          userAgent: req.get('User-Agent'),
          origin: req.get('Origin'),
          referer: req.get('Referer'),
        },
        undefined, // No user ID at middleware level
        req.ip,
        req.get('User-Agent'),
      );

      this.logger.warn(
        `BytebotD security headers event: ${securityEvent.eventId}`,
        {
          eventId: securityEvent.eventId,
          eventType: securityEvent.type,
          riskScore: securityEvent.riskScore,
          operationId,
        },
      );
    } catch (caughtError) {
      const safeError = caughtError as SafeError;
      this.logger.error('Failed to log BytebotD security headers event', {
        operationId,
        error: safeError.message,
        originalEventType: eventType,
      });
    }
  }

  /**
   * Map internal event types to security event types
   */
  private mapEventType(eventType: string): SecurityEventType {
    switch (eventType) {
      case 'CORS_VIOLATION':
        return SecurityEventType._ACCESS_DENIED;
      case 'MIDDLEWARE_ERROR':
      case 'MIDDLEWARE_FAILURE':
        return SecurityEventType._SECURITY_CONFIG_CHANGED;
      default:
        return SecurityEventType._SUSPICIOUS_ACTIVITY;
    }
  }

  /**
   * Get current security configuration (for debugging)
   */
  getSecurityConfig(): SecurityMiddlewareConfig {
    return { ...this.config };
  }

  /**
   * Validate security headers on response (for testing)
   */
  validateSecurityHeaders(headers: Record<string, string>): {
    valid: boolean;
    missing: string[];
    recommendations: string[];
  } {
    const missing: string[] = [];
    const recommendations: string[] = [];

    // Check for essential security headers
    const essentialHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'referrer-policy',
    ];

    essentialHeaders.forEach((header) => {
      if (!headers[header]) {
        missing.push(header);
      }
    });

    // Check for HSTS in production
    if (
      this.config.environment === 'production' &&
      !headers['strict-transport-security']
    ) {
      missing.push('strict-transport-security');
      recommendations.push('Enable HSTS for production environment');
    }

    // Check for CSP
    if (this.config.csp && !headers['content-security-policy']) {
      missing.push('content-security-policy');
      recommendations.push('Content Security Policy should be configured');
    }

    return {
      valid: missing.length === 0,
      missing,
      recommendations,
    };
  }
}

export default SecurityHeadersMiddleware;
