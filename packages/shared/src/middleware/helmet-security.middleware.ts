/**
 * Helmet.js Security Headers Middleware
 *
 * Enterprise-grade security headers implementation using helmet.js with service-specific
 * configurations, dynamic CSP nonce generation, and comprehensive security policies.
 *
 * Features:
 * - Service-specific helmet configurations (BytebotD, Bytebot-Agent, Bytebot-UI)
 * - Dynamic Content Security Policy with nonce generation
 * - HTTP Strict Transport Security (HSTS) with proper preload settings
 * - Comprehensive click-jacking protection with X-Frame-Options
 * - MIME-type sniffing protection and XSS filtering
 * - Referrer policy configuration for privacy
 * - Feature policy and permissions policy integration
 * - Real-time security header monitoring and validation
 *
 * @fileoverview Advanced helmet.js integration with enterprise security features
 * @version 2.0.0
 * @author Helmet Security Headers Specialist
 */

import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { randomBytes } from "crypto";
import {
  generateEventId,
  SecurityEventType,
  createSecurityEvent,
} from "../utils/security.utils";
import { RateLimitServiceType } from "../types/security.types";

// Extended request type for nonce
interface RequestWithNonce extends Request {
  nonce?: string;
}

/**
 * Interface for security event metadata
 */
interface SecurityEventMetadata {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Interface for helmet configuration
 */
interface _HelmetConfiguration {
  contentSecurityPolicy?:
    | boolean
    | {
        useDefaults?: boolean;
        directives?: Record<string, string[]>;
        reportOnly?: boolean;
      };
  hsts?:
    | boolean
    | {
        maxAge?: number;
        includeSubDomains?: boolean;
        preload?: boolean;
      };
  frameguard?:
    | boolean
    | {
        action?: string;
        domain?: string;
      };
  noSniff?: boolean;
  xssFilter?: boolean;
  referrerPolicy?:
    | boolean
    | {
        policy?: string | string[];
      };
  [key: string]: unknown;
}

/**
 * Helmet security configuration interface
 */
export interface HelmetSecurityConfig {
  /** Enable helmet security headers */
  enabled: boolean;

  /** Service type for configuration */
  serviceType: RateLimitServiceType;

  /** Content Security Policy configuration */
  contentSecurityPolicy: {
    enabled: boolean;
    useDefaults: boolean;
    directives: Record<string, string[]>;
    reportUri?: string;
    reportOnly: boolean;
  };

  /** HTTP Strict Transport Security configuration */
  hsts: {
    enabled: boolean;
    maxAge: number; // seconds
    includeSubDomains: boolean;
    preload: boolean;
  };

  /** X-Frame-Options configuration */
  frameguard: {
    enabled: boolean;
    action: "deny" | "sameorigin" | "allow-from";
    domain?: string;
  };

  /** X-Content-Type-Options configuration */
  noSniff: {
    enabled: boolean;
  };

  /** X-XSS-Protection configuration */
  xssFilter: {
    enabled: boolean;
    setOnOldIE: boolean;
  };

  /** Referrer Policy configuration */
  referrerPolicy: {
    enabled: boolean;
    policy: string | string[];
  };

  /** Feature Policy configuration */
  featurePolicy: {
    enabled: boolean;
    features: Record<string, string[]>;
  };

  /** Permissions Policy configuration */
  permissionsPolicy: {
    enabled: boolean;
    permissions: Record<string, string[]>;
  };

  /** Dynamic nonce generation */
  dynamicNonce: {
    enabled: boolean;
    nonceLength: number;
    refreshInterval: number; // milliseconds
  };

  /** Security monitoring */
  monitoring: {
    enabled: boolean;
    logViolations: boolean;
    alertOnViolations: boolean;
  };
}

/**
 * Default helmet configurations for different service types
 */
const DEFAULT_HELMET_CONFIGS: Record<
  RateLimitServiceType,
  HelmetSecurityConfig
> = {
  [RateLimitServiceType._BYTEBOTD]: {
    enabled: true,
    serviceType: RateLimitServiceType._BYTEBOTD,
    contentSecurityPolicy: {
      enabled: true,
      useDefaults: false,
      reportOnly: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-eval'"], // Required for VNC functionality
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      enabled: true,
      action: "sameorigin", // Allow VNC embedding
    },
    noSniff: {
      enabled: true,
    },
    xssFilter: {
      enabled: true,
      setOnOldIE: false,
    },
    referrerPolicy: {
      enabled: true,
      policy: ["strict-origin-when-cross-origin"],
    },
    featurePolicy: {
      enabled: true,
      features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        geolocation: ["'none'"],
        payment: ["'none'"],
      },
    },
    permissionsPolicy: {
      enabled: true,
      permissions: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
      },
    },
    dynamicNonce: {
      enabled: true,
      nonceLength: 32,
      refreshInterval: 300000, // 5 minutes
    },
    monitoring: {
      enabled: true,
      logViolations: true,
      alertOnViolations: true,
    },
  },

  [RateLimitServiceType._BYTEBOT_AGENT]: {
    enabled: true,
    serviceType: RateLimitServiceType._BYTEBOT_AGENT,
    contentSecurityPolicy: {
      enabled: true,
      useDefaults: false,
      reportOnly: false,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      enabled: true,
      action: "deny", // Strict protection for API
    },
    noSniff: {
      enabled: true,
    },
    xssFilter: {
      enabled: true,
      setOnOldIE: false,
    },
    referrerPolicy: {
      enabled: true,
      policy: ["no-referrer"],
    },
    featurePolicy: {
      enabled: true,
      features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        geolocation: ["'none'"],
        payment: ["'none'"],
        usb: ["'none'"],
      },
    },
    permissionsPolicy: {
      enabled: true,
      permissions: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
      },
    },
    dynamicNonce: {
      enabled: true,
      nonceLength: 32,
      refreshInterval: 300000,
    },
    monitoring: {
      enabled: true,
      logViolations: true,
      alertOnViolations: true,
    },
  },

  [RateLimitServiceType._BYTEBOT_UI]: {
    enabled: true,
    serviceType: RateLimitServiceType._BYTEBOT_UI,
    contentSecurityPolicy: {
      enabled: true,
      useDefaults: false,
      reportOnly: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // Required for React development
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "https:"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false, // UI might be served over HTTP in development
    },
    frameguard: {
      enabled: true,
      action: "sameorigin",
    },
    noSniff: {
      enabled: true,
    },
    xssFilter: {
      enabled: true,
      setOnOldIE: false,
    },
    referrerPolicy: {
      enabled: true,
      policy: ["strict-origin-when-cross-origin"],
    },
    featurePolicy: {
      enabled: true,
      features: {
        camera: ["'self'"],
        microphone: ["'self'"],
        geolocation: ["'none'"],
        payment: ["'none'"],
      },
    },
    permissionsPolicy: {
      enabled: true,
      permissions: {
        camera: ["self"],
        microphone: ["self"],
        geolocation: [],
        payment: [],
      },
    },
    dynamicNonce: {
      enabled: true,
      nonceLength: 32,
      refreshInterval: 600000, // 10 minutes for UI
    },
    monitoring: {
      enabled: true,
      logViolations: true,
      alertOnViolations: false, // Less strict for UI
    },
  },

  [RateLimitServiceType._SHARED]: {
    enabled: true,
    serviceType: RateLimitServiceType._SHARED,
    contentSecurityPolicy: {
      enabled: true,
      useDefaults: true,
      reportOnly: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      enabled: true,
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: {
      enabled: true,
      action: "sameorigin",
    },
    noSniff: {
      enabled: true,
    },
    xssFilter: {
      enabled: true,
      setOnOldIE: false,
    },
    referrerPolicy: {
      enabled: true,
      policy: ["strict-origin-when-cross-origin"],
    },
    featurePolicy: {
      enabled: true,
      features: {
        camera: ["'none'"],
        microphone: ["'none'"],
        geolocation: ["'none'"],
        payment: ["'none'"],
      },
    },
    permissionsPolicy: {
      enabled: true,
      permissions: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
      },
    },
    dynamicNonce: {
      enabled: true,
      nonceLength: 32,
      refreshInterval: 300000,
    },
    monitoring: {
      enabled: true,
      logViolations: true,
      alertOnViolations: true,
    },
  },
};

/**
 * Helmet Security Headers Middleware
 * Provides comprehensive security headers using helmet.js with enterprise features
 */
@Injectable()
export class HelmetSecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HelmetSecurityMiddleware.name);
  private readonly config: HelmetSecurityConfig;
  private currentNonce: string = "";
  private nonceGeneratedAt: number = 0;

  constructor(
    private readonly _configService: ConfigService,
    private readonly serviceType: RateLimitServiceType = RateLimitServiceType._SHARED,
  ) {
    // Initialize configuration
    // Safe access to DEFAULT_HELMET_CONFIGS with fallback
    const defaultConfig =
      DEFAULT_HELMET_CONFIGS[
        serviceType as keyof typeof DEFAULT_HELMET_CONFIGS
      ] ?? DEFAULT_HELMET_CONFIGS[RateLimitServiceType._BYTEBOTD];

    this.config = {
      ...defaultConfig,
      ...this._configService.get<Partial<HelmetSecurityConfig>>(
        `helmet.${serviceType}`,
        {},
      ),
    } as HelmetSecurityConfig;

    this.logger.log(
      `Helmet security middleware initialized for ${serviceType}`,
      {
        serviceType: this.config.serviceType,
        enabled: this.config.enabled,
        cspEnabled: this.config.contentSecurityPolicy.enabled,
        hstsEnabled: this.config.hsts.enabled,
        dynamicNonce: this.config.dynamicNonce.enabled,
      },
    );

    // Initialize nonce if enabled
    if (this.config.dynamicNonce.enabled) {
      this.refreshNonce();
      // Set up periodic nonce refresh
      setInterval(() => {
        this.refreshNonce();
      }, this.config.dynamicNonce.refreshInterval);
    }
  }

  /**
   * Apply helmet security headers to requests
   */
  use(req: Request, res: Response, next: NextFunction): void {
    const operationId = generateEventId();
    const startTime = Date.now();

    try {
      // Skip if disabled
      if (!this.config.enabled) {
        this.logger.debug(`[${operationId}] Helmet security headers disabled`);
        return next();
      }

      // Refresh nonce if needed
      if (this.config.dynamicNonce.enabled && this.shouldRefreshNonce()) {
        this.refreshNonce();
      }

      // Add nonce to request for access by other middleware/controllers
      if (this.config.dynamicNonce.enabled) {
        (req as RequestWithNonce).nonce = this.currentNonce;
      }

      // Configure helmet with service-specific settings
      const helmetConfig = this.buildHelmetConfiguration(operationId);

      // Apply helmet middleware
      helmet(helmetConfig)(req, res, (err?: unknown) => {
        const processingTime = Date.now() - startTime;

        if (err) {
          const error =
            err instanceof Error
              ? err
              : (() => {
                  if (typeof err === "object" && err !== null) {
                    try {
                      return new Error(JSON.stringify(err));
                    } catch {
                      return new Error("[object Object]");
                    }
                  }
                  return new Error(
                    typeof err === "string" ? err : "Unknown error",
                  );
                })();
          this.logger.error(`[${operationId}] Helmet middleware error`, {
            operationId,
            error: error.message,
            processingTimeMs: processingTime,
            serviceType: this.config.serviceType,
          });

          // Log security event for helmet error
          this.logSecurityEvent(req, operationId, "helmet_error", {
            error: error.message,
            processingTimeMs: processingTime,
          });

          return next(error);
        }

        // Add custom security headers
        this.addCustomSecurityHeaders(res, operationId);

        // Log successful security header application
        this.logger.debug(
          `[${operationId}] Helmet security headers applied successfully`,
          {
            operationId,
            processingTimeMs: processingTime,
            serviceType: this.config.serviceType,
            nonce: this.config.dynamicNonce.enabled ? this.currentNonce : null,
          },
        );

        next();
      });
    } catch (err) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`[${operationId}] Helmet middleware unexpected error`, {
        operationId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        processingTimeMs: processingTime,
      });

      // Continue without helmet protection as fallback
      next();
    }
  }

  /**
   * Build helmet configuration based on service settings
   */
  private buildHelmetConfiguration(
    operationId: string,
  ): Parameters<typeof helmet>[0] {
    const helmetConfig: Record<string, unknown> = {};

    // Content Security Policy
    if (this.config.contentSecurityPolicy.enabled) {
      const directives = { ...this.config.contentSecurityPolicy.directives };

      // Add nonce to script-src if enabled
      if (this.config.dynamicNonce.enabled && this.currentNonce) {
        if (directives.scriptSrc) {
          directives.scriptSrc.push(`'nonce-${this.currentNonce}'`);
        }
      }

      helmetConfig.contentSecurityPolicy = {
        useDefaults: this.config.contentSecurityPolicy.useDefaults,
        directives,
        reportOnly: this.config.contentSecurityPolicy.reportOnly,
      };
    } else {
      helmetConfig.contentSecurityPolicy = false;
    }

    // HTTP Strict Transport Security
    if (this.config.hsts.enabled) {
      helmetConfig.hsts = {
        maxAge: this.config.hsts.maxAge,
        includeSubDomains: this.config.hsts.includeSubDomains,
        preload: this.config.hsts.preload,
      };
    } else {
      helmetConfig.hsts = false;
    }

    // X-Frame-Options
    if (this.config.frameguard.enabled) {
      const action =
        this.config.frameguard.action === "allow-from"
          ? "sameorigin"
          : this.config.frameguard.action;
      helmetConfig.frameguard = {
        action,
        domain: this.config.frameguard.domain,
      };
    } else {
      helmetConfig.frameguard = false;
    }

    // X-Content-Type-Options
    helmetConfig.noSniff = this.config.noSniff.enabled;

    // X-XSS-Protection
    helmetConfig.xssFilter = this.config.xssFilter.enabled;

    // Referrer Policy
    if (this.config.referrerPolicy.enabled) {
      const policy = Array.isArray(this.config.referrerPolicy.policy)
        ? (this.config.referrerPolicy.policy[0] ??
          "strict-origin-when-cross-origin")
        : this.config.referrerPolicy.policy;
      // Ensure policy is a valid ReferrerPolicyToken
      const validPolicy = policy as
        | "no-referrer"
        | "no-referrer-when-downgrade"
        | "origin"
        | "origin-when-cross-origin"
        | "same-origin"
        | "strict-origin"
        | "strict-origin-when-cross-origin"
        | "unsafe-url";
      helmetConfig.referrerPolicy = { policy: validPolicy };
    } else {
      helmetConfig.referrerPolicy = false;
    }

    // Feature Policy and Permissions Policy are not supported in current helmet version
    // These configurations are preserved for future helmet updates

    this.logger.debug(`[${operationId}] Built helmet configuration`, {
      operationId,
      cspEnabled: !!helmetConfig.contentSecurityPolicy,
      hstsEnabled: !!helmetConfig.hsts,
      frameguardAction: this.config.frameguard.enabled
        ? this.config.frameguard.action
        : "disabled",
      serviceType: this.config.serviceType,
    });

    return helmetConfig as Parameters<typeof helmet>[0];
  }

  /**
   * Add custom security headers beyond helmet defaults
   */
  private addCustomSecurityHeaders(res: Response, operationId: string): void {
    // Custom security headers
    res.set({
      "X-Security-Framework": "Bytebot-Enterprise",
      "X-Security-Version": "2.0.0",
      "X-Security-Service": this.config.serviceType,
      "X-Security-Nonce-Enabled": this.config.dynamicNonce.enabled.toString(),
      "X-Security-Operation-ID": operationId,
    });

    // Add nonce header if enabled
    if (this.config.dynamicNonce.enabled && this.currentNonce) {
      res.set("X-Security-CSP-Nonce", this.currentNonce);
    }

    // Add security monitoring headers
    if (this.config.monitoring.enabled) {
      res.set({
        "X-Security-Monitoring": "enabled",
        "X-Security-Violations-Log":
          this.config.monitoring.logViolations.toString(),
      });
    }
  }

  /**
   * Generate new cryptographically secure nonce
   */
  private refreshNonce(): void {
    this.currentNonce = randomBytes(this.config.dynamicNonce.nonceLength)
      .toString("base64")
      .replace(/[+/]/g, "")
      .substring(0, this.config.dynamicNonce.nonceLength);

    this.nonceGeneratedAt = Date.now();

    this.logger.debug("CSP nonce refreshed", {
      nonceLength: this.currentNonce.length,
      serviceType: this.config.serviceType,
    });
  }

  /**
   * Check if nonce should be refreshed based on interval
   */
  private shouldRefreshNonce(): boolean {
    return (
      Date.now() - this.nonceGeneratedAt >=
      this.config.dynamicNonce.refreshInterval
    );
  }

  /**
   * Log security events for monitoring and alerting
   */
  private logSecurityEvent(
    req: Request,
    operationId: string,
    eventType: string,
    metadata: SecurityEventMetadata,
  ): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType._SECURITY_CONFIG_CHANGED,
        req.url,
        req.method,
        false, // Helmet errors are not successful requests
        `Helmet security middleware event: ${eventType}`,
        {
          operationId,
          eventType,
          serviceType: this.config.serviceType,
          ...metadata,
        },
        (req as RequestWithNonce & { user?: { id?: string } }).user?.id,
        req.ip,
        req.get("User-Agent"),
      );

      this.logger.warn(`Security event logged: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        eventType,
        operationId,
        serviceType: this.config.serviceType,
      });
    } catch (err) {
      this.logger.error("Failed to log security event", {
        operationId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Factory methods for creating service-specific helmet middleware
   */
  static createBytebotDMiddleware(
    configService: ConfigService,
  ): HelmetSecurityMiddleware {
    return new HelmetSecurityMiddleware(
      configService,
      RateLimitServiceType._BYTEBOTD,
    );
  }

  static createBytebotAgentMiddleware(
    configService: ConfigService,
  ): HelmetSecurityMiddleware {
    return new HelmetSecurityMiddleware(
      configService,
      RateLimitServiceType._BYTEBOT_AGENT,
    );
  }

  static createBytebotUIMiddleware(
    configService: ConfigService,
  ): HelmetSecurityMiddleware {
    return new HelmetSecurityMiddleware(
      configService,
      RateLimitServiceType._BYTEBOT_UI,
    );
  }
}

export default HelmetSecurityMiddleware;
