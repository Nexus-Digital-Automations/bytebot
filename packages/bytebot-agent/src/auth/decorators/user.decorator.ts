/**
 * User Decorator
 *
 * Custom decorator to extract user information from the request object
 * after JWT authentication. Provides type-safe access to user data.
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  iat: number;
  exp: number;
}

interface RequestWithUser {
  user: AuthenticatedUser;
  ip?: string;
  connection?: { remoteAddress?: string };
  get(header: string): string | undefined;
}

/**
 * Extract authenticated user from request
 */
export const User = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | string | number | string[] | undefined => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // Enhance user object with request metadata
    if (user && !user.ipAddress) {
      const reqWithUser = request;
      user.ipAddress =
        reqWithUser.ip || reqWithUser.connection?.remoteAddress || 'unknown';
      user.userAgent = reqWithUser.get('User-Agent') || 'unknown';
    }

    return data ? user?.[data] : user;
  },
);
