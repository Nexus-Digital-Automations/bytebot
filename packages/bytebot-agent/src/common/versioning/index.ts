/**
 * API Versioning Module - Comprehensive Export Index
 *
 * This module exports all versioning-related functionality including decorators,
 * interceptors, guards, and configuration utilities for enterprise API versioning.
 *
 * @fileoverview API versioning module exports
 * @version 1.0.0
 * @author API Versioning & Documentation Specialist
 */

// Version decorators and metadata
export * from './api-version.decorator';
export type {
  ApiVersionConfig,
  SupportedVersion,
} from './api-version.decorator';
export {
  ApiVersion,
  DeprecatedApi,
  ForVersion,
  MultiVersion,
  ExperimentalApi,
  BetaApi,
  SUPPORTED_API_VERSIONS,
  VersioningStrategy,
  getVersionConfig,
  getApiVersion,
  getMultiVersions,
} from './api-version.decorator';

// Version negotiation interceptor
export { VersionInterceptor } from './version.interceptor';

// Deprecation management guard
export { DeprecationGuard, DeprecationEnforcement } from './deprecation.guard';

// Default exports for convenience
export { default as VersionDecorators } from './api-version.decorator';
export { default as VersionInterceptor } from './version.interceptor';
export { default as DeprecationGuard } from './deprecation.guard';

/**
 * Pre-configured versioning components for common use cases
 */
export const VersioningComponents = {
  /**
   * Standard versioning setup with warning-level deprecation enforcement
   */
  STANDARD: {
    interceptor: VersionInterceptor,
    guard: DeprecationGuard,
    enforcement: DeprecationEnforcement.WARN,
  },

  /**
   * Strict versioning setup with blocking deprecation enforcement
   */
  STRICT: {
    interceptor: VersionInterceptor,
    guard: DeprecationGuard,
    enforcement: DeprecationEnforcement.STRICT_BLOCK,
  },

  /**
   * Development versioning setup with minimal enforcement
   */
  DEVELOPMENT: {
    interceptor: VersionInterceptor,
    guard: DeprecationGuard,
    enforcement: DeprecationEnforcement.LOG_ONLY,
  },
} as const;

/**
 * Common version configurations for typical API evolution patterns
 */
export const CommonVersionConfigs = {
  /**
   * Version 1 - Initial stable release
   */
  V1_STABLE: {
    version: SUPPORTED_API_VERSIONS.V1,
    stability: 'stable' as const,
    documentation: {
      description: 'Initial stable API release',
      newFeatures: [
        'Core task management',
        'Basic computer use operations',
        'File upload and management',
        'User authentication',
      ],
    },
  },

  /**
   * Version 2 - Next generation with new features
   */
  V2_BETA: {
    version: SUPPORTED_API_VERSIONS.V2,
    stability: 'beta' as const,
    documentation: {
      description: 'Next generation API with enhanced features',
      newFeatures: [
        'Advanced computer use capabilities',
        'Batch operations',
        'Real-time WebSocket updates',
        'Enhanced security features',
      ],
      breakingChanges: [
        'Updated response format structure',
        'Modified authentication flow',
        'Renamed endpoint paths',
      ],
    },
  },

  /**
   * Deprecated V1 with sunset date
   */
  V1_DEPRECATED: {
    version: SUPPORTED_API_VERSIONS.V1,
    stability: 'deprecated' as const,
    deprecation: {
      deprecated: true,
      since: new Date('2024-06-01'),
      sunset: new Date('2024-12-01'),
      migration: 'https://docs.bytebot.ai/migration/v1-to-v2',
    },
    documentation: {
      description: 'Deprecated version - migrate to v2',
      breakingChanges: ['This version is deprecated and will be removed'],
    },
  },
} as const;

export default {
  // Decorators
  ApiVersion,
  DeprecatedApi,
  ForVersion,
  MultiVersion,
  ExperimentalApi,
  BetaApi,

  // Components
  VersionInterceptor,
  DeprecationGuard,

  // Constants
  SUPPORTED_API_VERSIONS,
  VersioningStrategy,
  DeprecationEnforcement,

  // Utilities
  getVersionConfig,
  getApiVersion,
  getMultiVersions,

  // Pre-configured setups
  VersioningComponents,
  CommonVersionConfigs,
};
