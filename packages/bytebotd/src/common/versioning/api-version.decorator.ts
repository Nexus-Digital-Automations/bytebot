/**
 * API Versioning Decorators - BytebotD Desktop Service Versioning
 *
 * Adapted versioning decorators for BytebotD desktop computer use operations.
 * Provides header-based, URL-based, and query parameter versioning strategies
 * with desktop-specific deprecation handling.
 *
 * @fileoverview API versioning decorators for BytebotD desktop services
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { ApiHeader, ApiTags, ApiExtraModels } from '@nestjs/swagger';

/**
 * API versioning strategy enumeration
 */
export enum VersioningStrategy {
  /** Version specified in request header (e.g., Accept-Version: v1) */
  HEADER = 'header',

  /** Version specified in URL path (e.g., /api/v1/computer-use) */
  URL = 'url',

  /** Version specified as query parameter (e.g., ?version=v1) */
  QUERY = 'query',

  /** Version specified in Accept header (e.g., Accept: application/vnd.bytebotd.v1+json) */
  MEDIA_TYPE = 'media_type',
}

/**
 * API version configuration for BytebotD
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

    /** Desktop-specific migration considerations */
    desktopMigrationNotes?: string;
  };

  /** Version documentation */
  documentation?: {
    /** Version description */
    description?: string;

    /** Breaking changes in this version */
    breakingChanges?: string[];

    /** New features in this version */
    newFeatures?: string[];

    /** Desktop-specific changes */
    desktopChanges?: string[];
  };

  /** Version stability level */
  stability?: 'experimental' | 'beta' | 'stable' | 'deprecated' | 'sunset';

  /** Desktop service compatibility */
  desktopCompatibility?: {
    /** Minimum desktop environment version */
    minDesktopVersion?: string;

    /** VNC compatibility requirements */
    vncRequirements?: string[];

    /** Computer use feature support */
    computerUseFeatures?: string[];
  };
}

/**
 * Supported API versions for BytebotD desktop services
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
export const DESKTOP_VERSION_KEY = 'desktop_api_version';

/**
 * BytebotD API Version decorator - applies version constraints to desktop service methods
 * @param config - Version configuration with desktop-specific options
 */
export const ApiVersion = (config: string | ApiVersionConfig) => {
  const versionConfig: ApiVersionConfig =
    typeof config === 'string' ? { version: config } : config;

  return applyDecorators(
    SetMetadata(VERSION_METADATA_KEY, versionConfig.version),
    SetMetadata(VERSION_CONFIG_KEY, versionConfig),
    SetMetadata(DESKTOP_VERSION_KEY, true),
    ApiTags(`BytebotD API ${versionConfig.version}`),
    ApiHeader({
      name: 'Accept-Version',
      description: `BytebotD desktop API version header (${versionConfig.version})`,
      required: false,
      schema: {
        type: 'string',
        enum: Object.values(SUPPORTED_API_VERSIONS),
        default: SUPPORTED_API_VERSIONS.V1,
      },
    }),
    ApiHeader({
      name: 'X-Desktop-Client',
      description: 'Desktop client identifier for compatibility tracking',
      required: false,
      schema: {
        type: 'string',
        example: 'BytebotD-Desktop-1.0.0',
      },
    }),
  );
};

/**
 * Deprecated API decorator for BytebotD - marks desktop endpoints as deprecated
 * @param config - Deprecation configuration with desktop-specific notes
 */
export const DeprecatedApi = (config: {
  since: Date;
  sunset?: Date;
  migration?: string;
  reason?: string;
  desktopMigrationNotes?: string;
}) => {
  return applyDecorators(
    SetMetadata('deprecated', true),
    SetMetadata('deprecation_config', config),
    ApiHeader({
      name: 'Deprecation',
      description: 'BytebotD API deprecation warning header',
      required: false,
      schema: {
        type: 'string',
        example: `date="${config.since.toISOString()}"`,
      },
    }),
    config.sunset
      ? ApiHeader({
          name: 'Sunset',
          description: 'BytebotD API sunset date header',
          required: false,
          schema: {
            type: 'string',
            example: config.sunset.toISOString(),
          },
        })
      : () => {},
    config.desktopMigrationNotes
      ? ApiHeader({
          name: 'X-Desktop-Migration-Notes',
          description: 'Desktop-specific migration guidance',
          required: false,
          schema: {
            type: 'string',
            example: config.desktopMigrationNotes,
          },
        })
      : () => {},
  );
};

/**
 * Version-specific endpoint decorator for BytebotD
 * @param version - Specific version this desktop endpoint supports
 * @param config - Optional version configuration with desktop compatibility
 */
export const ForVersion = (
  version: SupportedVersion,
  config?: Partial<ApiVersionConfig>,
) => {
  const versionConfig: ApiVersionConfig = {
    version,
    stability: 'stable',
    desktopCompatibility: {
      minDesktopVersion: '1.0.0',
      vncRequirements: ['noVNC 1.3.0+'],
      computerUseFeatures: ['screenshot', 'click', 'type', 'scroll'],
    },
    ...config,
  };

  return ApiVersion(versionConfig);
};

/**
 * Multi-version endpoint decorator for BytebotD - supports multiple API versions
 * @param versions - Array of supported versions for desktop endpoints
 */
export const MultiVersion = (versions: SupportedVersion[]) => {
  return applyDecorators(
    SetMetadata('multi_version', versions),
    SetMetadata(VERSION_METADATA_KEY, versions[0]), // Default to first version
    SetMetadata(DESKTOP_VERSION_KEY, true),
    ApiTags(`BytebotD API ${versions.join(', ')}`),
    ApiHeader({
      name: 'Accept-Version',
      description: `BytebotD desktop API version header (supports: ${versions.join(', ')})`,
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
 * Experimental API decorator for BytebotD - marks desktop endpoints as experimental
 * @param version - Version when desktop feature was introduced
 */
export const ExperimentalApi = (version: SupportedVersion) => {
  return applyDecorators(
    ForVersion(version, {
      stability: 'experimental',
      desktopCompatibility: {
        minDesktopVersion: '1.0.0-beta',
        vncRequirements: ['noVNC 1.4.0+'],
        computerUseFeatures: ['experimental-features'],
      },
    }),
    SetMetadata('experimental', true),
    SetMetadata('desktop_experimental', true),
    ApiHeader({
      name: 'X-API-Experimental',
      description: 'Accept experimental BytebotD desktop API features',
      required: true,
      schema: {
        type: 'string',
        enum: ['true'],
        example: 'true',
      },
    }),
    ApiHeader({
      name: 'X-Desktop-Experimental',
      description: 'Enable experimental desktop features',
      required: false,
      schema: {
        type: 'boolean',
        default: false,
      },
    }),
  );
};

/**
 * Beta API decorator for BytebotD - marks desktop endpoints as beta
 * @param version - Version when desktop feature was introduced
 */
export const BetaApi = (version: SupportedVersion) => {
  return applyDecorators(
    ForVersion(version, {
      stability: 'beta',
      desktopCompatibility: {
        minDesktopVersion: '1.0.0-rc',
        vncRequirements: ['noVNC 1.3.0+'],
        computerUseFeatures: ['beta-computer-use'],
      },
    }),
    SetMetadata('beta', true),
    SetMetadata('desktop_beta', true),
    ApiHeader({
      name: 'X-API-Beta',
      description: 'Accept beta BytebotD desktop API features',
      required: false,
      schema: {
        type: 'boolean',
        default: false,
      },
    }),
  );
};

/**
 * Computer Use API decorator - specific to BytebotD desktop operations
 * @param version - Version for computer use features
 * @param features - Specific computer use features supported
 */
export const ComputerUseApi = (
  version: SupportedVersion,
  features?: string[],
) => {
  return applyDecorators(
    ForVersion(version, {
      desktopCompatibility: {
        minDesktopVersion: '1.0.0',
        vncRequirements: ['noVNC 1.3.0+', 'WebSocket support'],
        computerUseFeatures: features || [
          'screenshot',
          'click',
          'type',
          'scroll',
          'key',
        ],
      },
    }),
    SetMetadata('computer_use', true),
    ApiTags('Computer Use'),
    ApiHeader({
      name: 'X-Computer-Use-Client',
      description: 'Computer use client identifier',
      required: false,
      schema: {
        type: 'string',
        example: 'BytebotD-ComputerUse-1.0.0',
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

/**
 * Check if endpoint is a desktop API endpoint
 * @param target - Target class or method
 * @returns Boolean indicating if it's a desktop endpoint
 */
export function isDesktopApiVersion(target: any): boolean {
  return Reflect.getMetadata(DESKTOP_VERSION_KEY, target) || false;
}

/**
 * Get desktop compatibility requirements
 * @param target - Target class or method
 * @returns Desktop compatibility configuration or null
 */
export function getDesktopCompatibility(
  target: any,
): ApiVersionConfig['desktopCompatibility'] | null {
  const versionConfig = getVersionConfig(target);
  return versionConfig?.desktopCompatibility || null;
}

export default {
  ApiVersion,
  DeprecatedApi,
  ForVersion,
  MultiVersion,
  ExperimentalApi,
  BetaApi,
  ComputerUseApi,
  SUPPORTED_API_VERSIONS,
  VersioningStrategy,
  getVersionConfig,
  getApiVersion,
  getMultiVersions,
  isDesktopApiVersion,
  getDesktopCompatibility,
};
