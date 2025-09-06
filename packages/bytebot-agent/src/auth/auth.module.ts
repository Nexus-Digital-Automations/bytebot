/**
 * Authentication Module - Core authentication and authorization module
 * Configures JWT-based authentication system with RBAC authorization
 *
 * Features:
 * - JWT authentication configuration with secure token handling
 * - Role-based access control (RBAC) system setup
 * - Passport JWT strategy integration
 * - Authentication guards and decorators
 * - Security middleware configuration
 * - Comprehensive logging and monitoring
 *
 * @author Security Implementation Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AppConfig } from '../config/configuration';

/**
 * Authentication Module
 * Provides JWT-based authentication and RBAC authorization system
 */
@Module({
  imports: [
    // Passport configuration
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: false, // Use stateless JWT tokens instead of sessions
    }),

    // JWT configuration with dynamic config injection
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService<AppConfig>) => {
        const logger = new Logger('JwtModule');
        const operationId = `jwt-module-config-${Date.now()}`;
        const startTime = Date.now();

        logger.log(`[${operationId}] Configuring JWT module...`, {
          operationId,
        });

        const securityConfig = configService.get('security', { infer: true });
        if (!securityConfig) {
          logger.error(`[${operationId}] Security configuration not found`, {
            operationId,
          });
          throw new Error('Security configuration not found');
        }

        const jwtConfig = {
          secret: securityConfig.jwtSecret,
          signOptions: {
            expiresIn: securityConfig.jwtExpiresIn,
            algorithm: 'HS256' as const, // Use HMAC SHA256 for development
            audience: 'bytebot-api',
            issuer: 'bytebot-auth-service',
          },
        };

        // Validate JWT secret strength
        if (securityConfig.jwtSecret.length < 32) {
          logger.warn(
            `[${operationId}] JWT secret is shorter than recommended 32 characters`,
            {
              operationId,
              secretLength: securityConfig.jwtSecret.length,
            },
          );
        }

        const configTime = Date.now() - startTime;
        logger.log(`[${operationId}] JWT module configured successfully`, {
          operationId,
          algorithm: jwtConfig.signOptions.algorithm,
          expiresIn: securityConfig.jwtExpiresIn,
          audience: jwtConfig.signOptions.audience,
          issuer: jwtConfig.signOptions.issuer,
          configTimeMs: configTime,
        });

        return jwtConfig;
      },
      inject: [ConfigService],
    }),

    // Import required modules
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: 'AUTH_CONFIG',
      useFactory: (configService: ConfigService<AppConfig>) => {
        const logger = new Logger('AuthModule');
        const operationId = `auth-config-${Date.now()}`;

        logger.log(`[${operationId}] Loading authentication configuration...`, {
          operationId,
        });

        const config = {
          security: configService.get('security', { infer: true }),
          features: configService.get('features', { infer: true }),
        };

        if (!config.security || !config.features) {
          logger.error(
            `[${operationId}] Required configuration sections not found`,
            {
              operationId,
              hasSecurity: !!config.security,
              hasFeatures: !!config.features,
            },
          );
          throw new Error('Authentication configuration incomplete');
        }

        logger.log(`[${operationId}] Authentication configuration loaded`, {
          operationId,
          authenticationEnabled: config.features.authentication,
          jwtExpiresIn: config.security.jwtExpiresIn,
          jwtRefreshExpiresIn: config.security.jwtRefreshExpiresIn,
        });

        return config;
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, PassportModule, JwtModule],
})
export class AuthModule {
  private readonly logger = new Logger(AuthModule.name);

  constructor(private readonly configService: ConfigService<AppConfig>) {
    const operationId = `auth-module-init-${Date.now()}`;
    const startTime = Date.now();

    this.logger.log(`[${operationId}] Authentication Module initializing...`, {
      operationId,
    });

    // Log authentication configuration status
    const features = this.configService.get('features', { infer: true });
    const security = this.configService.get('security', { infer: true });

    if (!features || !security) {
      this.logger.error(`[${operationId}] Critical configuration missing`, {
        operationId,
        hasFeatures: !!features,
        hasSecurity: !!security,
      });
      throw new Error('Authentication module configuration failed');
    }

    const initTime = Date.now() - startTime;
    this.logger.log(
      `[${operationId}] Authentication Module initialized successfully`,
      {
        operationId,
        authenticationEnabled: features.authentication,
        jwtConfigured: true,
        passportConfigured: true,
        guardsConfigured: true,
        initTimeMs: initTime,
      },
    );

    // Log security warnings if needed
    if (!features.authentication) {
      this.logger.warn(
        `[${operationId}] Authentication is disabled in configuration`,
        {
          operationId,
          recommendation: 'Enable authentication for production environments',
        },
      );
    }

    // Log JWT configuration summary (without secrets)
    this.logger.debug(`[${operationId}] JWT Configuration Summary`, {
      operationId,
      accessTokenExpiry: security.jwtExpiresIn,
      refreshTokenExpiry: security.jwtRefreshExpiresIn,
      algorithm: 'HS256',
      audience: 'bytebot-api',
      issuer: 'bytebot-auth-service',
    });
  }
}
