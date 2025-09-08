/**
 * Enterprise Configuration Module - Comprehensive configuration management for Bytebot API Platform
 * Integrates all configuration services for enterprise-grade configuration management
 *
 * Features:
 * - Centralized configuration service registration
 * - Secrets management with external provider support
 * - Configuration security and validation
 * - Environment-specific configurations
 * - Configuration audit and monitoring
 * - Hot-reload capabilities
 *
 * @author Enterprise Configuration Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { SecretsService } from './secrets.service';
import { ExternalSecretsService } from './external-secrets.service';
import { ConfigurationSecurityService } from './configuration-security.service';
import { ConfigurationHotReloadService } from './hot-reload.service';
import { EnhancedSecretsService } from './secrets-enhanced.service';
import { EnterpriseSecretsService } from './enterprise-secrets.service';

/**
 * Enterprise Configuration Services interface for factory provider
 */
interface EnterpriseConfigServices {
  secrets: SecretsService;
  externalSecrets: ExternalSecretsService;
  security: ConfigurationSecurityService;
  hotReload: ConfigurationHotReloadService;
  enhancedSecrets: EnhancedSecretsService;
  enterpriseSecrets: EnterpriseSecretsService;
}

/**
 * Enterprise Configuration Module
 * Provides comprehensive configuration management services
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [
        '.env.local',
        '.env.development',
        '.env.staging',
        '.env.production',
        '.env',
      ],
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
  providers: [
    // Core configuration services
    SecretsService,
    ExternalSecretsService,
    ConfigurationSecurityService,
    ConfigurationHotReloadService,
    EnhancedSecretsService,
    EnterpriseSecretsService,

    // Configuration service factory
    {
      provide: 'ENTERPRISE_CONFIG_SERVICES',
      useFactory: (
        secretsService: SecretsService,
        externalSecretsService: ExternalSecretsService,
        configSecurityService: ConfigurationSecurityService,
        hotReloadService: ConfigurationHotReloadService,
        enhancedSecretsService: EnhancedSecretsService,
        enterpriseSecretsService: EnterpriseSecretsService,
      ): EnterpriseConfigServices => ({
        secrets: secretsService,
        externalSecrets: externalSecretsService,
        security: configSecurityService,
        hotReload: hotReloadService,
        enhancedSecrets: enhancedSecretsService,
        enterpriseSecrets: enterpriseSecretsService,
      }),
      inject: [
        SecretsService,
        ExternalSecretsService,
        ConfigurationSecurityService,
        ConfigurationHotReloadService,
        EnhancedSecretsService,
        EnterpriseSecretsService,
      ],
    },
  ] as Provider[],
  exports: [
    SecretsService,
    ExternalSecretsService,
    ConfigurationSecurityService,
    ConfigurationHotReloadService,
    EnhancedSecretsService,
    EnterpriseSecretsService,
    'ENTERPRISE_CONFIG_SERVICES',
  ],
})
export class EnterpriseConfigModule {
  /**
   * Get configuration for specific environment
   *
   * @param environment - Target environment
   * @returns Environment-specific configuration module
   */
  static forEnvironment(
    environment: 'development' | 'staging' | 'production',
  ): DynamicModule {
    return {
      module: EnterpriseConfigModule,
      global: true,
      providers: [
        {
          provide: 'CONFIG_ENVIRONMENT',
          useValue: environment,
        },
      ] as Provider[],
      exports: ['CONFIG_ENVIRONMENT'],
    };
  }

  /**
   * Get configuration for testing
   *
   * @returns Test-specific configuration module
   */
  static forTesting(): DynamicModule {
    // Mock external services interface for testing
    const mockExternalSecretsService: Partial<ExternalSecretsService> = {
      getSecret: (() =>
        Promise.resolve(null)) as ExternalSecretsService['getSecret'],
      listSecrets: (() =>
        Promise.resolve([])) as ExternalSecretsService['listSecrets'],
      getProvidersHealth: (() =>
        Promise.resolve({})) as ExternalSecretsService['getProvidersHealth'],
      getServiceStatistics: (() => ({
        providersCount: 0,
        hasPrimaryProvider: false,
        fallbackProvidersCount: 0,
        isHealthy: true,
      })) as ExternalSecretsService['getServiceStatistics'],
    };

    return {
      module: EnterpriseConfigModule,
      global: true,
      providers: [
        {
          provide: 'CONFIG_ENVIRONMENT',
          useValue: 'test' as const,
        },
        // Mock external services for testing
        {
          provide: ExternalSecretsService,
          useValue: mockExternalSecretsService,
        },
      ] as Provider[],
      exports: ['CONFIG_ENVIRONMENT'],
    };
  }
}
