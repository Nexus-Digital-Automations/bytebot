/**
 * Security Module - Enterprise Security Framework for BytebotD
 *
 * This module provides comprehensive security infrastructure including
 * validation pipes, security guards, middleware, and monitoring for
 * the BytebotD desktop service.
 *
 * @fileoverview Enterprise security module for BytebotD
 * @version 1.0.0
 * @author Security Framework Specialist
 */

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_PIPE, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  GlobalValidationPipe,
  BytebotDValidationPipes,
} from '../pipes/global-validation.pipe';
import { EnterpriseRateLimitGuard } from '../guards/rate-limit.guard';
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware';
import { DeprecationGuard } from '../versioning/deprecation.guard';
import { VersionInterceptor } from '../versioning/version.interceptor';
import Redis from 'ioredis';

@Module({
  imports: [ConfigModule],
  providers: [
    // Reflector for versioning decorators
    Reflector,

    // Redis client for rate limiting
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 2), // Separate DB for BytebotD
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keyPrefix: 'bytebotd:',
        });
      },
      inject: [ConfigService],
    },

    // Global validation pipe with BytebotD-specific configuration
    {
      provide: APP_PIPE,
      useFactory: (configService: ConfigService) => {
        const environment = configService.get('NODE_ENV', 'development');

        // Use different validation levels based on environment
        switch (environment) {
          case 'production':
            return BytebotDValidationPipes.MAXIMUM_SECURITY;
          case 'staging':
            return BytebotDValidationPipes.DESKTOP_OPERATIONS;
          case 'development':
            return BytebotDValidationPipes.DEVELOPMENT;
          default:
            return BytebotDValidationPipes.STANDARD;
        }
      },
      inject: [ConfigService],
    },

    // Global rate limiting guard (first in guard chain)
    {
      provide: APP_GUARD,
      useClass: EnterpriseRateLimitGuard,
    },

    // Deprecation guard (second in guard chain)
    {
      provide: APP_GUARD,
      useClass: DeprecationGuard,
    },

    // Version interceptor for API versioning
    {
      provide: APP_INTERCEPTOR,
      useClass: VersionInterceptor,
    },

    // Security services
    SecurityHeadersMiddleware,
    EnterpriseRateLimitGuard,
    DeprecationGuard,
    VersionInterceptor,
  ],
  exports: [
    'REDIS_CLIENT',
    SecurityHeadersMiddleware,
    EnterpriseRateLimitGuard,
    DeprecationGuard,
    VersionInterceptor,
    GlobalValidationPipe,
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security headers middleware to all routes
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
  }
}

export default SecurityModule;
