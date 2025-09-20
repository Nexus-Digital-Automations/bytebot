/**
 * PARLANT Authentication Module
 *
 * Comprehensive module for Parlant Phase 1 authentication integration
 * including JWT bridge service, session management, and security validation.
 *
 * @author Claude Code (AIgent Integration Specialist)
 * @version 1.0.0
 * @priority CRITICAL - Foundation module for Parlant integration
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ParlantJWTBridgeService } from './parlant-jwt-bridge.service';
import { ParlantSessionManager } from './parlant-session-manager.service';
import { ParlantSecurityValidator } from './parlant-security-validator.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'default-secret-change-in-production'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
          algorithm: 'RS256',
          issuer: 'aigent-parlant-bridge',
          audience: 'parlant-service'
        },
        verifyOptions: {
          algorithms: ['RS256'],
          issuer: 'aigent-parlant-bridge',
          audience: ['parlant-service', 'aigent-service']
        }
      }),
      inject: [ConfigService]
    })
  ],
  providers: [
    ParlantJWTBridgeService,
    ParlantSessionManager,
    ParlantSecurityValidator
  ],
  exports: [
    ParlantJWTBridgeService,
    ParlantSessionManager,
    ParlantSecurityValidator,
    JwtModule
  ]
})
export class ParlantAuthModule {
  constructor() {
    console.log('✅ PARLANT Authentication Module initialized - Phase 1 JWT Bridge Service active');
  }
}