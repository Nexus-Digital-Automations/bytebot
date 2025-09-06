/**
 * Authentication Module - ByteBotd Computer Control Security
 * Configures authentication and authorization for computer automation endpoints
 *
 * Features:
 * - JWT authentication strategy configuration
 * - Passport integration for computer control security
 * - Guard and decorator providers for RBAC
 * - Shared configuration with other Bytebot services
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since ByteBotd Authentication Hardening
 */

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Authentication Module for ByteBotd
 * Provides comprehensive authentication and authorization infrastructure
 */
@Module({
  imports: [
    // Import ConfigModule for environment variable access
    ConfigModule,
    
    // Configure Passport for JWT strategy
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Configure JWT module with shared secret
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'bytebot-default-secret-change-in-production'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
          algorithm: 'HS256',
          issuer: 'bytebot-system',
          audience: 'bytebotd-computer-control',
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: 'bytebot-system',
          audience: 'bytebotd-computer-control',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    // JWT Strategy for token validation
    JwtStrategy,
    
    // Authentication guards
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [
    // Export guards for use in controllers
    JwtAuthGuard,
    RolesGuard,
    
    // Export JWT module for potential token operations
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}