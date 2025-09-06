/**
 * JWT Payload Interface - Type definitions for JWT token payloads
 * Defines the structure and types for JWT access and refresh tokens
 *
 * Features:
 * - Type-safe JWT payload structure
 * - Support for both access and refresh tokens
 * - Standard JWT claims (iat, exp, sub, aud, iss)
 * - Custom claims for user information and permissions
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { UserRole } from '@prisma/client';

/**
 * JWT Payload interface for access tokens
 * Contains user information and authentication data
 */
export interface JwtPayload {
  /** Subject - User ID (Standard JWT claim) */
  sub: string;

  /** Username for user identification */
  username: string;

  /** User email address */
  email: string;

  /** User role for authorization */
  role: UserRole;

  /** Token type - 'access' or 'refresh' */
  type: 'access' | 'refresh';

  /** Issued at timestamp (Standard JWT claim) */
  iat: number;

  /** Expiration timestamp (Standard JWT claim) */
  exp: number;

  /** Audience - intended recipients (Standard JWT claim) */
  aud?: string;

  /** Issuer - who created the token (Standard JWT claim) */
  iss?: string;

  /** Session ID for token revocation */
  sessionId?: string;
}

/**
 * Refresh Token Payload interface
 * Contains minimal information for token refresh operations
 */
export interface RefreshTokenPayload {
  /** Subject - User ID */
  sub: string;

  /** Session ID for tracking */
  sessionId: string;

  /** Token type - always 'refresh' */
  type: 'refresh';

  /** Issued at timestamp */
  iat: number;

  /** Expiration timestamp */
  exp: number;

  /** Token version for invalidation */
  tokenVersion?: number;
}

/**
 * JWT Token Pair interface
 * Contains both access and refresh tokens
 */
export interface TokenPair {
  /** JWT access token for API authentication */
  accessToken: string;

  /** JWT refresh token for obtaining new access tokens */
  refreshToken: string;

  /** Token type - always 'Bearer' */
  tokenType: 'Bearer';

  /** Access token expiration in seconds */
  expiresIn: number;
}
