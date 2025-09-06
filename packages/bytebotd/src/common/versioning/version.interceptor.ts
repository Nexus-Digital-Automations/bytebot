/**
 * Version Interceptor - BytebotD Desktop Service Version Management
 *
 * This interceptor handles API versioning for BytebotD desktop services,
 * processes version headers, validates desktop client compatibility,
 * and provides version-aware response handling.
 *
 * @fileoverview API version management interceptor for BytebotD desktop services
 * @version 1.0.0
 * @author Input Validation & API Security Specialist
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import {
  getVersionConfig,
  getApiVersion,
  getMultiVersions,
  isDesktopApiVersion,
  getDesktopCompatibility,
  SUPPORTED_API_VERSIONS,
  SupportedVersion,
} from './api-version.decorator';

/**
 * Version resolution result
 */
interface VersionResolution {
  /** Resolved API version */
  resolvedVersion: string;

  /** Version source (header, query, url, default) */
  source: 'header' | 'query' | 'url' | 'default';

  /** Whether version is supported */
  isSupported: boolean;

  /** Desktop client compatibility */
  desktopCompatibility: {
    /** Is desktop client */
    isDesktopClient: boolean;

    /** Desktop client version */
    clientVersion: string;

    /** VNC client information */
    vncClient: string;

    /** Is computer use request */
    isComputerUse: boolean;

    /** Desktop compatibility issues */
    compatibilityIssues: string[];
  };

  /** Validation warnings */
  warnings: string[];
}

/**
 * Desktop compatibility requirements
 */
interface DesktopCompatibility {
  /** Minimum desktop environment version */
  minDesktopVersion?: string;

  /** VNC compatibility requirements */
  vncRequirements?: string[];

  /** Computer use feature support */
  computerUseFeatures?: string[];
}

@Injectable()
export class VersionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(VersionInterceptor.name);
  private readonly defaultVersion: string;
  private readonly strictVersioning: boolean;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.defaultVersion = this.configService.get(
      'api.version.default',
      SUPPORTED_API_VERSIONS.V1,
    );
    this.strictVersioning = this.configService.get('api.version.strict', false);

    this.logger.log('BytebotD version interceptor initialized', {
      defaultVersion: this.defaultVersion,
      strictVersioning: this.strictVersioning,
      supportedVersions: Object.values(SUPPORTED_API_VERSIONS),
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationId = `bytebotd-version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      const request = context.switchToHttp().getRequest<Request>();
      const response = context.switchToHttp().getResponse<Response>();

      // Get endpoint version configuration
      const endpointVersionConfig = getVersionConfig(context.getHandler());
      const endpointVersion = getApiVersion(context.getHandler());
      const multiVersions = getMultiVersions(context.getHandler());
      const isDesktopEndpoint = isDesktopApiVersion(context.getHandler());
      const desktopCompatibility = getDesktopCompatibility(
        context.getHandler(),
      );

      this.logger.debug(`[${operationId}] Processing BytebotD API version`, {
        operationId,
        endpoint: request.path,
        method: request.method,
        endpointVersion,
        multiVersions,
        isDesktopEndpoint,
        desktopCompatibility,
      });

      // Resolve API version from request
      const versionResolution = this.resolveVersion(
        request,
        endpointVersion,
        multiVersions,
        isDesktopEndpoint,
        desktopCompatibility,
        operationId,
      );

      // Validate version compatibility
      this.validateVersionCompatibility(
        versionResolution,
        endpointVersionConfig,
        operationId,
      );

      // Set version information in request for downstream use
      (request as any).apiVersion = versionResolution.resolvedVersion;
      (request as any).versionInfo = versionResolution;
      (request as any).desktopClient = versionResolution.desktopCompatibility;

      // Set response headers with version information
      this.setVersionHeaders(response, versionResolution);

      // Log version resolution
      if (versionResolution.warnings.length > 0) {
        this.logger.warn(`[${operationId}] Version resolution warnings`, {
          operationId,
          warnings: versionResolution.warnings,
          resolvedVersion: versionResolution.resolvedVersion,
          desktopClient: versionResolution.desktopCompatibility,
        });
      }

      return next.handle().pipe(
        tap(() => {
          const processingTime = Date.now() - startTime;
          this.logger.debug(
            `[${operationId}] BytebotD version processing completed`,
            {
              operationId,
              resolvedVersion: versionResolution.resolvedVersion,
              source: versionResolution.source,
              isDesktopClient:
                versionResolution.desktopCompatibility.isDesktopClient,
              processingTimeMs: processingTime,
            },
          );
        }),
        map((data) => {
          // Add version metadata to response
          if (typeof data === 'object' && data !== null) {
            return {
              ...data,
              _metadata: {
                apiVersion: versionResolution.resolvedVersion,
                service: 'BytebotD',
                isDesktopEndpoint,
                desktopClient:
                  versionResolution.desktopCompatibility.isDesktopClient,
                operationId,
              },
            };
          }
          return data;
        }),
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`[${operationId}] BytebotD version interceptor error`, {
        operationId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
      });

      // Allow request to continue on error (fail open)
      return next.handle();
    }
  }

  /**
   * Resolve API version from request with desktop client awareness
   * @param request - Express request
   * @param endpointVersion - Endpoint's declared version
   * @param multiVersions - Array of supported versions
   * @param isDesktopEndpoint - Whether endpoint is desktop-specific
   * @param desktopCompatibility - Desktop compatibility requirements
   * @param operationId - Operation ID for logging
   * @returns Version resolution result
   */
  private resolveVersion(
    request: Request,
    endpointVersion: string | null,
    multiVersions: SupportedVersion[] | null,
    isDesktopEndpoint: boolean,
    desktopCompatibility: DesktopCompatibility | null,
    operationId: string,
  ): VersionResolution {
    let resolvedVersion = this.defaultVersion;
    let source: VersionResolution['source'] = 'default';
    const warnings: string[] = [];

    // Extract desktop client information
    const desktopClientInfo = this.extractDesktopClientInfo(request);

    // Try to resolve version from different sources (in order of precedence)

    // 1. Accept-Version header (most specific)
    const acceptVersion = request.get('Accept-Version');
    if (acceptVersion) {
      if (this.isValidVersion(acceptVersion)) {
        resolvedVersion = acceptVersion;
        source = 'header';
      } else {
        warnings.push(`Invalid Accept-Version header: ${acceptVersion}`);
      }
    }

    // 2. Query parameter version
    const queryVersion = request.query.version as string;
    if (queryVersion && source === 'default') {
      if (this.isValidVersion(queryVersion)) {
        resolvedVersion = queryVersion;
        source = 'query';
      } else {
        warnings.push(`Invalid query version parameter: ${queryVersion}`);
      }
    }

    // 3. URL path version (e.g., /api/v1/computer-use)
    const urlVersionMatch = request.path.match(/\/v(\d+)\//i);
    if (urlVersionMatch && source === 'default') {
      const urlVersion = `v${urlVersionMatch[1]}`;
      if (this.isValidVersion(urlVersion)) {
        resolvedVersion = urlVersion;
        source = 'url';
      } else {
        warnings.push(`Invalid URL version: ${urlVersion}`);
      }
    }

    // 4. Use endpoint's declared version if no version specified
    if (source === 'default' && endpointVersion) {
      resolvedVersion = endpointVersion;
    }

    // Validate version against endpoint constraints
    const isSupported = this.validateEndpointVersion(
      resolvedVersion,
      endpointVersion,
      multiVersions,
      warnings,
    );

    // Check desktop compatibility
    const compatibilityIssues = this.checkDesktopCompatibility(
      desktopClientInfo,
      desktopCompatibility,
      resolvedVersion,
    );

    if (compatibilityIssues.length > 0) {
      warnings.push(
        ...compatibilityIssues.map(
          (issue) => `Desktop compatibility: ${issue}`,
        ),
      );
    }

    this.logger.debug(`[${operationId}] BytebotD version resolved`, {
      operationId,
      resolvedVersion,
      source,
      isSupported,
      warnings,
      desktopClient: desktopClientInfo,
      compatibilityIssues,
    });

    return {
      resolvedVersion,
      source,
      isSupported,
      desktopCompatibility: {
        isDesktopClient: desktopClientInfo.isDesktopClient,
        clientVersion: desktopClientInfo.clientVersion,
        vncClient: desktopClientInfo.vncClient,
        isComputerUse: desktopClientInfo.isComputerUse,
        compatibilityIssues,
      },
      warnings,
    };
  }

  /**
   * Extract desktop client information from request headers
   * @param request - Express request
   * @returns Desktop client information
   */
  private extractDesktopClientInfo(request: Request) {
    const desktopClient = request.get('X-Desktop-Client') || '';
    const computerUseClient = request.get('X-Computer-Use-Client');
    const vncClient = request.get('X-VNC-Client') || 'unknown';
    const userAgent = request.get('User-Agent') || '';

    // Detect if this is a desktop client
    const isDesktopClient = !!(
      desktopClient ||
      computerUseClient ||
      userAgent.toLowerCase().includes('bytebotd') ||
      userAgent.toLowerCase().includes('desktop')
    );

    // Extract version from client header (e.g., "BytebotD-Desktop-1.0.0")
    const versionMatch = desktopClient.match(
      /-([0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9]+)?)/,
    );
    const clientVersion = versionMatch ? versionMatch[1] : 'unknown';

    const isComputerUse = !!(
      computerUseClient ||
      request.path.includes('computer-use') ||
      request.path.includes('screenshot') ||
      request.path.includes('click') ||
      request.path.includes('type') ||
      request.path.includes('key')
    );

    return {
      isDesktopClient,
      clientVersion,
      vncClient,
      isComputerUse,
      userAgent,
      desktopClientHeader: desktopClient,
      computerUseClientHeader: computerUseClient,
    };
  }

  /**
   * Check if version string is valid
   * @param version - Version string to validate
   * @returns Boolean indicating if version is valid
   */
  private isValidVersion(version: string): boolean {
    return Object.values(SUPPORTED_API_VERSIONS).includes(
      version as SupportedVersion,
    );
  }

  /**
   * Validate resolved version against endpoint constraints
   * @param resolvedVersion - Resolved API version
   * @param endpointVersion - Endpoint's declared version
   * @param multiVersions - Array of supported versions
   * @param warnings - Array to collect warnings
   * @returns Boolean indicating if version is supported
   */
  private validateEndpointVersion(
    resolvedVersion: string,
    endpointVersion: string | null,
    multiVersions: SupportedVersion[] | null,
    warnings: string[],
  ): boolean {
    // If endpoint supports multiple versions, check if resolved version is in the list
    if (multiVersions && multiVersions.length > 0) {
      if (!multiVersions.includes(resolvedVersion as SupportedVersion)) {
        warnings.push(
          `Version ${resolvedVersion} not supported by this endpoint. Supported: ${multiVersions.join(', ')}`,
        );
        return false;
      }
      return true;
    }

    // If endpoint has a specific version, check compatibility
    if (endpointVersion && endpointVersion !== resolvedVersion) {
      warnings.push(
        `Version mismatch: endpoint requires ${endpointVersion}, requested ${resolvedVersion}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Check desktop client compatibility
   * @param desktopClientInfo - Desktop client information
   * @param desktopCompatibility - Desktop compatibility requirements
   * @param resolvedVersion - Resolved API version
   * @returns Array of compatibility issues
   */
  private checkDesktopCompatibility(
    desktopClientInfo: any,
    desktopCompatibility: DesktopCompatibility | null,
    resolvedVersion: string,
  ): string[] {
    const issues: string[] = [];

    if (!desktopCompatibility || !desktopClientInfo.isDesktopClient) {
      return issues;
    }

    // Check minimum desktop version
    if (desktopCompatibility.minDesktopVersion) {
      const isCompatible = this.compareVersions(
        desktopClientInfo.clientVersion,
        desktopCompatibility.minDesktopVersion,
      );

      if (!isCompatible) {
        issues.push(
          `Client version ${desktopClientInfo.clientVersion} below minimum ${desktopCompatibility.minDesktopVersion}`,
        );
      }
    }

    // Check VNC requirements
    if (
      desktopCompatibility.vncRequirements &&
      desktopCompatibility.vncRequirements.length > 0
    ) {
      const vncVersion = desktopClientInfo.vncClient;
      if (vncVersion === 'unknown') {
        issues.push('VNC client information not provided');
      } else {
        // Could implement more sophisticated VNC compatibility checking here
        // For now, just log the requirement
      }
    }

    // Check computer use feature requirements
    if (
      desktopCompatibility.computerUseFeatures &&
      desktopCompatibility.computerUseFeatures.length > 0 &&
      desktopClientInfo.isComputerUse
    ) {
      // Could implement feature capability checking here
      // For now, assume all features are supported if client is computer use capable
    }

    return issues;
  }

  /**
   * Compare two semantic versions
   * @param version1 - First version
   * @param version2 - Second version
   * @returns Boolean indicating if version1 >= version2
   */
  private compareVersions(version1: string, version2: string): boolean {
    if (version1 === 'unknown' || version2 === 'unknown') {
      return false;
    }

    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part > v2Part) return true;
      if (v1Part < v2Part) return false;
    }

    return true; // Versions are equal
  }

  /**
   * Validate version compatibility and throw if strict mode enabled
   * @param versionResolution - Version resolution result
   * @param endpointVersionConfig - Endpoint version configuration
   * @param operationId - Operation ID for logging
   */
  private validateVersionCompatibility(
    versionResolution: VersionResolution,
    endpointVersionConfig: any,
    operationId: string,
  ): void {
    if (this.strictVersioning && !versionResolution.isSupported) {
      this.logger.error(`[${operationId}] Strict versioning violation`, {
        operationId,
        resolvedVersion: versionResolution.resolvedVersion,
        warnings: versionResolution.warnings,
        desktopClient: versionResolution.desktopCompatibility,
      });

      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'API version not supported',
          details: {
            requestedVersion: versionResolution.resolvedVersion,
            source: versionResolution.source,
            warnings: versionResolution.warnings,
            supportedVersions: Object.values(SUPPORTED_API_VERSIONS),
            desktopCompatibility: versionResolution.desktopCompatibility,
          },
          operationId,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for critical desktop compatibility issues
    const criticalIssues =
      versionResolution.desktopCompatibility.compatibilityIssues.filter(
        (issue) => issue.includes('below minimum'),
      );

    if (criticalIssues.length > 0 && this.strictVersioning) {
      this.logger.error(
        `[${operationId}] Critical desktop compatibility issues`,
        {
          operationId,
          criticalIssues,
          desktopClient: versionResolution.desktopCompatibility,
        },
      );

      throw new HttpException(
        {
          statusCode: 426, // 426 Upgrade Required
          error: 'Upgrade Required',
          message: 'Desktop client version incompatible',
          details: {
            compatibilityIssues: criticalIssues,
            clientVersion: versionResolution.desktopCompatibility.clientVersion,
            isDesktopClient:
              versionResolution.desktopCompatibility.isDesktopClient,
          },
          operationId,
        },
        426, // 426 Upgrade Required
      );
    }
  }

  /**
   * Set version-related response headers
   * @param response - Express response
   * @param versionResolution - Version resolution result
   */
  private setVersionHeaders(
    response: Response,
    versionResolution: VersionResolution,
  ): void {
    response.setHeader('X-API-Version', versionResolution.resolvedVersion);
    response.setHeader('X-Version-Source', versionResolution.source);
    response.setHeader('X-Service', 'BytebotD');

    if (versionResolution.desktopCompatibility.isDesktopClient) {
      response.setHeader('X-Desktop-Client-Detected', 'true');
      response.setHeader(
        'X-Desktop-Client-Version',
        versionResolution.desktopCompatibility.clientVersion,
      );
      response.setHeader(
        'X-VNC-Client',
        versionResolution.desktopCompatibility.vncClient,
      );

      if (versionResolution.desktopCompatibility.isComputerUse) {
        response.setHeader('X-Computer-Use-Enabled', 'true');
      }
    }

    if (versionResolution.warnings.length > 0) {
      response.setHeader(
        'X-Version-Warnings',
        versionResolution.warnings.join('; '),
      );
    }

    // Add supported versions for client discovery
    response.setHeader(
      'X-Supported-Versions',
      Object.values(SUPPORTED_API_VERSIONS).join(', '),
    );
  }
}

export default VersionInterceptor;
