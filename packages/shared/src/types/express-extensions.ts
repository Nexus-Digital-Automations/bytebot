/**
 * Express Extensions Type Definitions
 *
 * This file provides TypeScript type definitions for extending Express Request and Response objects
 * with custom properties used throughout the security middleware stack.
 *
 * @fileoverview Express type extensions for security middleware
 * @version 1.0.0
 */

import { Request, Response } from "express";

/**
 * Rate limiting information interface
 */
export interface RateLimitInfo {
  remaining?: number;
  reset?: number;
  limit?: number;
  current?: number;
}

/**
 * Security context for requests
 */
export interface SecurityContext {
  correlationId?: string;
  riskScore?: number;
  threatsDetected?: string[];
  blocked?: boolean;
  reason?: string;
  timestamp?: Date;
}

/**
 * User authentication information
 */
export interface UserInfo {
  id?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Extended Express Request interface with security properties
 */
export interface ExtendedRequest extends Request {
  correlationId?: string;
  securityContext?: SecurityContext;
  rateLimit?: RateLimitInfo;
  user?: UserInfo;
  clientIP?: string;
  nonce?: string;
}

/**
 * Extended Express Response interface with security properties
 */
export interface ExtendedResponse extends Response {
  locals: {
    nonce?: string;
    correlationId?: string;
    securityContext?: SecurityContext;
    [key: string]: unknown;
  } & Record<string, unknown>;
}

/**
 * Helmet options interface for type safety
 */
export interface HelmetOptions {
  contentSecurityPolicy?:
    | {
        directives?: Record<string, string[]>;
        reportOnly?: boolean;
        useDefaults?: boolean;
      }
    | false;
  hsts?:
    | {
        maxAge: number;
        includeSubDomains?: boolean;
        preload?: boolean;
      }
    | false;
  frameguard?:
    | {
        action: string;
      }
    | false;
  noSniff?: boolean;
  xssFilter?: boolean;
  hidePoweredBy?: boolean;
  ieNoOpen?: boolean;
  originAgentCluster?: boolean;
  dnsPrefetchControl?: {
    allow: boolean;
  };
  referrerPolicy?:
    | {
        policy: string | string[];
      }
    | false;
}

/**
 * Threat detection rule interface
 */
export interface ThreatDetectionRule {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  pattern?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Security analysis result interface
 */
export interface SecurityAnalysisResult {
  riskScore: number;
  threatsDetected: ThreatDetectionRule[];
  recommendations?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Type guard for ExtendedRequest
 */
export function isExtendedRequest(req: Request): req is ExtendedRequest {
  return req !== null && typeof req === "object";
}

/**
 * Type guard for ExtendedResponse
 */
export function isExtendedResponse(res: Response): res is ExtendedResponse {
  return res !== null && typeof res === "object";
}
