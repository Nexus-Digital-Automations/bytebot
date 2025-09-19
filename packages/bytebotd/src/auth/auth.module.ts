/**
 * Enhanced Authentication Module - AIgent-Parlant Enterprise Security Bridge
 * Provides comprehensive JWT-to-Parlant authentication with enterprise-grade security
 *
 * Features:
 * - Multi-algorithm JWT authentication (HS256, RS256, ES256, EdDSA)
 * - AIgent-Parlant Security Bridge integration
 * - 5-tier security classification system
 * - Enterprise compliance and audit trails
 * - Redis session clustering with emergency overrides
 * - Conversational authentication validation
 *
 * @author AIgent Security Implementation Team
 * @version 2.0.0
 * @since AIgent-Parlant Bridge Integration
 */

import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Algorithm } from 'jsonwebtoken';
import { JwtStrategy } from './strategies/jwt.strategy';
import { EnhancedJwtStrategy } from './strategies/enhanced-jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AIgentParlantSecurityBridgeService } from './services/aigent-parlant-security-bridge.service';
import { ParlantModule } from '../parlant/parlant.module';
import { SecurityAuditService } from '../security/security-audit.service';

/**
 * Enhanced enterprise authentication configuration factory
 */
export const enhancedJwtConfigFactory = (configService: ConfigService) => ({
  // Multi-algorithm support configuration
  algorithms: ['HS256', 'RS256', 'ES256', 'EdDSA'] as Algorithm[],

  // Primary secret for HS256 (backward compatibility)
  secret: configService.get<string>('JWT_SECRET_HS256', 'bytebot-default-secret-change-in-production'),

  // Enhanced signing options
  signOptions: {
    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
    algorithm: configService.get<string>('JWT_DEFAULT_ALGORITHM', 'HS256') as Algorithm,
    issuer: configService.get<string>('JWT_ISSUER', 'aigent-bytebot-system'),
    audience: configService.get<string>('JWT_AUDIENCE', 'bytebotd-enterprise-control'),
    keyid: configService.get<string>('JWT_KEY_ID'),
  },

  // Enhanced verification options
  verifyOptions: {
    algorithms: ['HS256', 'RS256', 'ES256', 'EdDSA'] as Algorithm[],
    issuer: configService.get<string>('JWT_ISSUER', 'aigent-bytebot-system'),
    audience: configService.get<string>('JWT_AUDIENCE', 'bytebotd-enterprise-control'),
    clockTolerance: 300, // 5 minutes
    maxAge: configService.get<string>('JWT_MAX_AGE', '24h'),
  },

  // Enterprise security options
  secretOrKeyProvider: (_requestType: unknown, _tokenOrPayload: string | object | Buffer, _options?: unknown) => {
    // Dynamic key resolution handled by EnhancedJwtStrategy
    return configService.get<string>('JWT_SECRET_HS256', 'bytebot-default-secret-change-in-production');
  },
});

/**
 * Enhanced Authentication Module for AIgent-Parlant Enterprise Integration
 * Provides comprehensive JWT-to-Parlant authentication and security bridge
 */
@Module({
  imports: [
    // Enhanced configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Import Parlant module for conversational validation
    forwardRef(() => ParlantModule),

    // Configure Passport with enhanced JWT strategy
    PassportModule.register({
      defaultStrategy: 'enhanced-jwt',
      session: false,
      property: 'user',
    }),

    // Enhanced JWT module with multi-algorithm support
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: enhancedJwtConfigFactory,
      inject: [ConfigService],
    }),
  ],

  providers: [
    // Legacy JWT strategy (for backward compatibility)
    JwtStrategy,

    // Enhanced JWT strategy with multi-algorithm support
    EnhancedJwtStrategy,

    // AIgent-Parlant Security Bridge service
    AIgentParlantSecurityBridgeService,

    // Enhanced authentication guards
    JwtAuthGuard,
    RolesGuard,

    // Security audit service integration
    SecurityAuditService,
  ],

  exports: [
    // Export enhanced guards for use in controllers
    JwtAuthGuard,
    RolesGuard,

    // Export security bridge service
    AIgentParlantSecurityBridgeService,

    // Export JWT and Passport modules
    JwtModule,
    PassportModule,

    // Export audit service for security monitoring
    SecurityAuditService,
  ],
})
export class AuthModule {
  constructor() {
    console.log('Enhanced AIgent-Parlant Authentication Module initialized');
    console.log('Enterprise JWT authentication with conversational security bridge active');
    console.log('Multi-algorithm support: HS256, RS256, ES256, EdDSA');
    console.log('5-tier security classification system enabled');
    console.log('Redis session clustering and emergency overrides available');
  }
}