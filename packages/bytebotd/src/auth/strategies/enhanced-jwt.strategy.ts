/**
 * Enhanced JWT Strategy - TEMPORARY SIMPLIFIED VERSION FOR BUILD FIX
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ByteBotdUser } from '../entities/auth-user.entity';

@Injectable()
export class EnhancedJwtStrategy extends PassportStrategy(Strategy, 'enhanced-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_HS256', 'bytebot-default-secret-change-in-production'),
      algorithms: ['HS256'],
      passReqToCallback: true,
    });
  }

  async validate(request: any, payload: any): Promise<ByteBotdUser> {
    // Basic validation
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    // Create user from payload
    const user: ByteBotdUser = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      isActive: payload.isActive || true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return user;
  }
}