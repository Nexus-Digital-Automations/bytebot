/**
 * Enhanced JWT Strategy - TEMPORARY SIMPLIFIED VERSION FOR BUILD FIX
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';import { ConfigService } from '@nestjs/config';import { JwtService } from '@nestjs/jwt';import { PassportStrategy } from '@nestjs/passport';import { Strategy, ExtractJwt } from 'passport-jwt';import { Request as Express } from 'express';import { ByteBotdUser } from '../entities/auth-user.entity';@Injectable()export class EnhancedJwtStrategy extends PassportStrategy(Strategy, 'enhanced-jwt') {constructor(private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET_HS256', 'bytebot-default-secret-change-in-production'),algorithms: ['HS256'],passReqToCallback: true,});
  }

  async validate(request: Express.Request, payload: Record<string, unknown>): Promise<ByteBotdUser> {
    // Basic validation
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    // Ensure async compliance for future database lookups
    await Promise.resolve();

    // Create user from payload
    const user: ByteBotdUser = {
      id: payload.sub as string,
      username: payload.username as string,
      email: payload.email as string,
      roles: (payload.roles as string[]) ?? [],
      permissions: (payload.permissions as string[]) ?? [],
      isActive: (payload.isActive as boolean) ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return user;
  }
}