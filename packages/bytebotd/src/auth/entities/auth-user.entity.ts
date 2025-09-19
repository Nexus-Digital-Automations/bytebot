/**
 * ByteBot User Entity - Authentication User Model
 */

export interface ByteBotdUser {
  id: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JwtPayload {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  isActive: boolean;
  iat?: number;
  exp?: number;
}