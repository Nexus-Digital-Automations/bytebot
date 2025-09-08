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

// Version decorators and metadata - properly typed imports
import {
  ApiVersionConfig,
  SupportedVersion,
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

// Version negotiation interceptor - properly typed import
import { VersionInterceptor } from './version.interceptor';

// Deprecation management guard - properly typed imports
import { DeprecationGuard, DeprecationEnforcement } from './deprecation.guard';

// Default imports for proper typing
import VersionDecorators from './api-version.decorator';
import VersionInterceptorDefault from './version.interceptor';
import DeprecationGuardDefault from './deprecation.guard';

// Re-export all types and functions with explicit typing
export type { ApiVersionConfig, SupportedVersion };
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
  VersionInterceptor,
  DeprecationGuard,
  DeprecationEnforcement,
};

// Default exports for convenience with proper typing
export {
  VersionDecorators,
  VersionInterceptorDefault as VersionInterceptorDefault,
  DeprecationGuardDefault as DeprecationGuardDefault,
};

/**
 * Pre-configured versioning components for common use cases
 * Properly typed to avoid unsafe assignments
 */
export const VersioningComponents = {
  /**
   * Standard versioning setup with warning-level deprecation enforcement
   */
  STANDARD: {
    interceptor: VersionInterceptor,
    guard: DeprecationGuard,
    enforcement: DeprecationEnforcement.WARN as DeprecationEnforcement.WARN,
  },

  /**
   * Strict versioning setup with blocking deprecation enforcement
   */
  STRICT: {
    interceptor: VersionInterceptor,
    guard: DeprecationGuard,
    enforcement:
      DeprecationEnforcement.STRICT_BLOCK as DeprecationEnforcement.STRICT_BLOCK,
  },

  /**
   * Development versioning setup with minimal enforcement
   */
  DEVELOPMENT: {
    interceptor: VersionInterceptor,
    guard: DeprecationGuard,
    enforcement:
      DeprecationEnforcement.LOG_ONLY as DeprecationEnforcement.LOG_ONLY,
  },
} as const;

/**
 * Common version configurations for typical API evolution patterns
 * Properly typed with explicit type annotations
 */
export const CommonVersionConfigs = {
  /**
   * Version 1 - Initial stable release
   */
  V1_STABLE: {
    version: SUPPORTED_API_VERSIONS.V1 as SupportedVersion,
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
  } satisfies ApiVersionConfig,

  /**
   * Version 2 - Next generation with new features
   */
  V2_BETA: {
    version: SUPPORTED_API_VERSIONS.V2 as SupportedVersion,
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
  } satisfies ApiVersionConfig,

  /**
   * Deprecated V1 with sunset date
   */
  V1_DEPRECATED: {
    version: SUPPORTED_API_VERSIONS.V1 as SupportedVersion,
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
  } satisfies ApiVersionConfig,
} as const;

// Default export with proper typing to prevent unsafe assignments
const VersioningModule = {
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
} as const;

export default VersioningModule;
