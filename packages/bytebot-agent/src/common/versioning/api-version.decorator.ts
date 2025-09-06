/**
 * API Versioning Decorators - Enterprise API Version Management
 *
 * This module provides decorators and utilities for managing API versions across
 * the Bytebot platform. Supports header-based, URL-based, and query parameter
 * versioning strategies with proper deprecation handling.
 *
 * @fileoverview API versioning decorators and metadata management
 * @version 1.0.0
 * @author API Versioning & Documentation Specialist
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiTags, ApiExtraModels } from '@nestjs/swagger';

/**
 * API versioning strategy enumeration
 */
export enum VersioningStrategy {
  /** Version specified in request header (e.g., Accept-Version: v1) */
  HEADER = 'header',

  /** Version specified in URL path (e.g., /api/v1/users) */
  URL = 'url',

  /** Version specified as query parameter (e.g., ?version=v1) */
  QUERY = 'query',

  /** Version specified in Accept header (e.g., Accept: application/vnd.bytebot.v1+json) */
  MEDIA_TYPE = 'media_type',
}

/**
 * API version configuration
 */
export interface ApiVersionConfig {
  /** Version identifier (e.g., 'v1', 'v2', '1.0') */
  version: string;

  /** Deprecation information */
  deprecation?: {
    /** Is this version deprecated */
    deprecated: boolean;

    /** Deprecation date */
    since?: Date;

    /** Sunset date (when version will be removed) */
    sunset?: Date;

    /** Migration guide or replacement version */
    migration?: string;
  };

  /** Version documentation */
  documentation?: {
    /** Version description */
    description?: string;

    /** Breaking changes in this version */
    breakingChanges?: string[];

    /** New features in this version */
    newFeatures?: string[];
  };

  /** Version stability level */
  stability?: 'experimental' | 'beta' | 'stable' | 'deprecated' | 'sunset';
}

/**
 * Supported API versions registry
 */
export const SUPPORTED_API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
} as const;

export type SupportedVersion =
  (typeof SUPPORTED_API_VERSIONS)[keyof typeof SUPPORTED_API_VERSIONS];

/**
 * API version metadata keys
 */
export const VERSION_METADATA_KEY = 'api_version';
export const VERSION_CONFIG_KEY = 'api_version_config';

/**
 * API Version decorator - applies version constraints to controller methods
 * @param config - Version configuration
 */
export const ApiVersion = (config: string | ApiVersionConfig) => {
  const versionConfig: ApiVersionConfig =
    typeof config === 'string' ? { version: config } : config;

  return applyDecorators(
    SetMetadata(VERSION_METADATA_KEY, versionConfig.version),
    SetMetadata(VERSION_CONFIG_KEY, versionConfig),
    ApiTags(`API ${versionConfig.version}`),
    ApiHeader({
      name: 'Accept-Version',
      description: `API version header (${versionConfig.version})`,
      required: false,
      schema: {
        type: 'string',
        enum: Object.values(SUPPORTED_API_VERSIONS),
        default: SUPPORTED_API_VERSIONS.V1,
      },
    }),
  );
};

/**
 * Deprecated API decorator - marks endpoints as deprecated
 * @param config - Deprecation configuration
 */
export const DeprecatedApi = (config: {
  since: Date;
  sunset?: Date;
  migration?: string;
  reason?: string;
}) => {
  return applyDecorators(
    SetMetadata('deprecated', true),
    SetMetadata('deprecation_config', config),
    ApiHeader({
      name: 'Deprecation',
      description: 'Deprecation warning header',
      required: false,
      schema: {
        type: 'string',
        example: `date="${config.since.toISOString()}"`,
      },
    }),
    config.sunset
      ? ApiHeader({
          name: 'Sunset',
          description: 'API sunset date header',
          required: false,
          schema: {
            type: 'string',
            example: config.sunset.toISOString(),
          },
        })
      : () => {},
  );
};

/**
 * Version-specific endpoint decorator
 * @param version - Specific version this endpoint supports
 * @param config - Optional version configuration
 */
export const ForVersion = (
  version: SupportedVersion,
  config?: Partial<ApiVersionConfig>,
) => {
  const versionConfig: ApiVersionConfig = {
    version,
    stability: 'stable',
    ...config,
  };

  return ApiVersion(versionConfig);
};

/**
 * Multi-version endpoint decorator - supports multiple API versions
 * @param versions - Array of supported versions
 */
export const MultiVersion = (versions: SupportedVersion[]) => {
  return applyDecorators(
    SetMetadata('multi_version', versions),
    SetMetadata(VERSION_METADATA_KEY, versions[0]), // Default to first version
    ApiTags(`API ${versions.join(', ')}`),
    ApiHeader({
      name: 'Accept-Version',
      description: `API version header (supports: ${versions.join(', ')})`,
      required: false,
      schema: {
        type: 'string',
        enum: versions,
        default: versions[0],
      },
    }),
  );
};

/**
 * Experimental API decorator - marks endpoints as experimental
 * @param version - Version when feature was introduced
 */
export const ExperimentalApi = (version: SupportedVersion) => {
  return applyDecorators(
    ForVersion(version, { stability: 'experimental' }),
    SetMetadata('experimental', true),
    ApiHeader({
      name: 'X-API-Experimental',
      description: 'Accept experimental API features',
      required: true,
      schema: {
        type: 'string',
        enum: ['true'],
        example: 'true',
      },
    }),
  );
};

/**
 * Beta API decorator - marks endpoints as beta
 * @param version - Version when feature was introduced
 */
export const BetaApi = (version: SupportedVersion) => {
  return applyDecorators(
    ForVersion(version, { stability: 'beta' }),
    SetMetadata('beta', true),
    ApiHeader({
      name: 'X-API-Beta',
      description: 'Accept beta API features',
      required: false,
      schema: {
        type: 'boolean',
        default: false,
      },
    }),
  );
};

/**
 * Get version configuration from metadata
 * @param target - Target class or method
 * @returns Version configuration or null
 */
export function getVersionConfig(target: any): ApiVersionConfig | null {
  return Reflect.getMetadata(VERSION_CONFIG_KEY, target) || null;
}

/**
 * Get API version from metadata
 * @param target - Target class or method
 * @returns API version or null
 */
export function getApiVersion(target: any): string | null {
  return Reflect.getMetadata(VERSION_METADATA_KEY, target) || null;
}

/**
 * Check if endpoint supports multiple versions
 * @param target - Target class or method
 * @returns Array of supported versions or null
 */
export function getMultiVersions(target: any): SupportedVersion[] | null {
  return Reflect.getMetadata('multi_version', target) || null;
}

export default {
  ApiVersion,
  DeprecatedApi,
  ForVersion,
  MultiVersion,
  ExperimentalApi,
  BetaApi,
  SUPPORTED_API_VERSIONS,
  VersioningStrategy,
};
