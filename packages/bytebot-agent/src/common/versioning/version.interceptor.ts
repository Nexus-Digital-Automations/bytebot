/**
 * API Version Interceptor - Enterprise Version Negotiation & Headers
 *
 * This interceptor handles API version negotiation between client and server,
 * sets appropriate version headers, manages deprecation warnings, and ensures
 * proper version routing based on the configured versioning strategy.
 *
 * @fileoverview API version negotiation and header management interceptor
 * @version 1.0.0
 * @author API Versioning & Documentation Specialist
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  SUPPORTED_API_VERSIONS,
  VERSION_METADATA_KEY,
  VERSION_CONFIG_KEY,
  ApiVersionConfig,
  SupportedVersion,
  getVersionConfig,
  getMultiVersions,
} from './api-version.decorator';
import { createSecurityEvent, SecurityEventType } from '@bytebot/shared';

/**
 * Version negotiation result
 */
interface VersionNegotiation {
  /** Negotiated version */
  version: string;

  /** Version configuration */
  config: ApiVersionConfig;

  /** Whether version was found in request */
  found: boolean;

  /** Source of version information */
  source: 'header' | 'url' | 'query' | 'media_type' | 'default';

  /** Any warnings or notices */
  warnings: string[];
}

/**
 * Version validation result
 */
interface VersionValidation {
  /** Is version valid */
  valid: boolean;

  /** Supported versions */
  supported: string[];

  /** Validation errors */
  errors: string[];

  /** Is version deprecated */
  deprecated: boolean;

  /** Is version sunset */
  sunset: boolean;
}

@Injectable()
export class VersionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(VersionInterceptor.name);
  private readonly defaultVersion: string;
  private readonly supportedVersions: string[];

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    this.defaultVersion = this.configService.get(
      'api.defaultVersion',
      SUPPORTED_API_VERSIONS.V1,
    );

    this.supportedVersions = Object.values(SUPPORTED_API_VERSIONS);

    this.logger.log('Version interceptor initialized', {
      defaultVersion: this.defaultVersion,
      supportedVersions: this.supportedVersions,
      versioningEnabled: true,
    });
  }

  /**
   * Intercept requests to handle API versioning
   * @param context - Execution context
   * @param next - Call handler
   * @returns Observable with version headers
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const operationId = `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    try {
      // Perform version negotiation
      const negotiation = this.negotiateVersion(request, context, operationId);

      // Validate negotiated version
      const validation = this.validateVersion(
        negotiation.version,
        negotiation.config,
        operationId,
      );

      if (!validation.valid) {
        this.logger.error(`[${operationId}] Version validation failed`, {
          operationId,
          requestedVersion: negotiation.version,
          errors: validation.errors,
          supportedVersions: validation.supported,
        });

        throw new BadRequestException({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid API version',
          error: 'Bad Request',
          details: {
            requestedVersion: negotiation.version,
            supportedVersions: validation.supported,
            errors: validation.errors,
          },
          operationId,
        });
      }

      // Set version context for downstream processors
      (request as any).apiVersion = negotiation.version;
      (request as any).apiVersionConfig = negotiation.config;
      (request as any).apiVersionSource = negotiation.source;

      // Log version negotiation
      const processingTime = Date.now() - startTime;
      this.logger.debug(`[${operationId}] API version negotiated`, {
        operationId,
        negotiatedVersion: negotiation.version,
        source: negotiation.source,
        found: negotiation.found,
        warnings: negotiation.warnings,
        deprecated: validation.deprecated,
        processingTimeMs: processingTime,
      });

      return next.handle().pipe(
        map((data) => {
          // Set response headers
          this.setVersionHeaders(
            response,
            negotiation,
            validation,
            operationId,
          );

          // Log security events if needed
          if (validation.deprecated || validation.sunset) {
            this.logDeprecationEvent(
              request,
              negotiation,
              validation,
              operationId,
            );
          }

          return data;
        }),
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;

      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`[${operationId}] Version negotiation error`, {
        operationId,
        error: error.message,
        stack: error.stack,
        processingTimeMs: processingTime,
      });

      // Log security event
      this.logVersionError(request, error, operationId);

      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'API version negotiation failed',
        error: 'Bad Request',
        operationId,
      });
    }
  }

  /**
   * Negotiate API version from request
   * @param request - Express request
   * @param context - Execution context
   * @param operationId - Operation ID for tracking
   * @returns Version negotiation result
   */
  private negotiateVersion(
    request: Request,
    context: ExecutionContext,
    operationId: string,
  ): VersionNegotiation {
    const warnings: string[] = [];

    // Get endpoint version configuration
    const endpointVersion = this.reflector.get<string>(
      VERSION_METADATA_KEY,
      context.getHandler(),
    );

    const endpointConfig = this.reflector.get<ApiVersionConfig>(
      VERSION_CONFIG_KEY,
      context.getHandler(),
    );

    const multiVersions = getMultiVersions(context.getHandler());

    this.logger.debug(`[${operationId}] Starting version negotiation`, {
      operationId,
      endpointVersion,
      multiVersions,
      hasConfig: !!endpointConfig,
    });

    // Strategy 1: Accept-Version header
    const headerVersion = request.get('Accept-Version');
    if (headerVersion) {
      if (
        this.isVersionSupported(
          headerVersion,
          multiVersions || [endpointVersion],
        )
      ) {
        const config = endpointConfig || { version: headerVersion };
        return {
          version: headerVersion,
          config,
          found: true,
          source: 'header',
          warnings,
        };
      } else {
        warnings.push(
          `Requested version '${headerVersion}' not supported by this endpoint`,
        );
      }
    }

    // Strategy 2: URL path version (e.g., /api/v1/users)
    const urlVersion = this.extractVersionFromUrl(request.path);
    if (urlVersion) {
      if (
        this.isVersionSupported(urlVersion, multiVersions || [endpointVersion])
      ) {
        const config = endpointConfig || { version: urlVersion };
        return {
          version: urlVersion,
          config,
          found: true,
          source: 'url',
          warnings,
        };
      } else {
        warnings.push(
          `URL version '${urlVersion}' not supported by this endpoint`,
        );
      }
    }

    // Strategy 3: Query parameter version
    const queryVersion = request.query.version as string;
    if (queryVersion) {
      if (
        this.isVersionSupported(
          queryVersion,
          multiVersions || [endpointVersion],
        )
      ) {
        const config = endpointConfig || { version: queryVersion };
        return {
          version: queryVersion,
          config,
          found: true,
          source: 'query',
          warnings,
        };
      } else {
        warnings.push(
          `Query version '${queryVersion}' not supported by this endpoint`,
        );
      }
    }

    // Strategy 4: Accept header media type
    const mediaTypeVersion = this.extractVersionFromMediaType(
      request.get('Accept') || '',
    );
    if (mediaTypeVersion) {
      if (
        this.isVersionSupported(
          mediaTypeVersion,
          multiVersions || [endpointVersion],
        )
      ) {
        const config = endpointConfig || { version: mediaTypeVersion };
        return {
          version: mediaTypeVersion,
          config,
          found: true,
          source: 'media_type',
          warnings,
        };
      } else {
        warnings.push(
          `Media type version '${mediaTypeVersion}' not supported by this endpoint`,
        );
      }
    }

    // Use endpoint-specific version or default
    const defaultVersion = endpointVersion || this.defaultVersion;
    const config = endpointConfig || { version: defaultVersion };

    if (headerVersion || urlVersion || queryVersion || mediaTypeVersion) {
      warnings.push('Requested version not supported, using default version');
    }

    return {
      version: defaultVersion,
      config,
      found: false,
      source: 'default',
      warnings,
    };
  }

  /**
   * Validate negotiated version
   * @param version - Negotiated version
   * @param config - Version configuration
   * @param operationId - Operation ID for tracking
   * @returns Validation result
   */
  private validateVersion(
    version: string,
    config: ApiVersionConfig,
    operationId: string,
  ): VersionValidation {
    const errors: string[] = [];
    let deprecated = false;
    let sunset = false;

    // Check if version is supported
    if (!this.supportedVersions.includes(version)) {
      errors.push(`Version '${version}' is not supported`);
    }

    // Check deprecation status
    if (config.deprecation?.deprecated) {
      deprecated = true;

      // Check if version is sunset
      if (config.deprecation.sunset && new Date() > config.deprecation.sunset) {
        sunset = true;
        errors.push(`Version '${version}' is sunset and no longer available`);
      }
    }

    // Check stability requirements
    if (config.stability === 'experimental') {
      // Require experimental header for experimental APIs
      // This would be checked elsewhere in the pipeline
    }

    const valid = errors.length === 0 && !sunset;

    this.logger.debug(`[${operationId}] Version validation completed`, {
      operationId,
      version,
      valid,
      deprecated,
      sunset,
      stability: config.stability,
      errors,
    });

    return {
      valid,
      supported: this.supportedVersions,
      errors,
      deprecated,
      sunset,
    };
  }

  /**
   * Set version-related response headers
   * @param response - Express response
   * @param negotiation - Version negotiation result
   * @param validation - Version validation result
   * @param operationId - Operation ID
   */
  private setVersionHeaders(
    response: Response,
    negotiation: VersionNegotiation,
    validation: VersionValidation,
    operationId: string,
  ): void {
    // Set API version header
    response.setHeader('API-Version', negotiation.version);

    // Set supported versions header
    response.setHeader(
      'API-Supported-Versions',
      this.supportedVersions.join(', '),
    );

    // Set version source header
    response.setHeader('API-Version-Source', negotiation.source);

    // Set deprecation headers if applicable
    if (validation.deprecated && negotiation.config.deprecation) {
      const deprecation = negotiation.config.deprecation;

      if (deprecation.since) {
        response.setHeader(
          'Deprecation',
          `date="${deprecation.since.toISOString()}"`,
        );
      }

      if (deprecation.sunset) {
        response.setHeader('Sunset', deprecation.sunset.toISOString());
      }

      if (deprecation.migration) {
        response.setHeader('API-Migration-Guide', deprecation.migration);
      }

      // Add warning header
      response.setHeader(
        'Warning',
        `299 - "API version ${negotiation.version} is deprecated"`,
      );
    }

    // Set stability header
    if (negotiation.config.stability) {
      response.setHeader('API-Stability', negotiation.config.stability);
    }

    // Set operation ID for tracing
    response.setHeader('X-Operation-ID', operationId);

    this.logger.debug(`[${operationId}] Version headers set`, {
      operationId,
      version: negotiation.version,
      source: negotiation.source,
      deprecated: validation.deprecated,
      stability: negotiation.config.stability,
    });
  }

  /**
   * Check if version is supported by endpoint
   * @param version - Version to check
   * @param supportedVersions - Endpoint supported versions
   * @returns Whether version is supported
   */
  private isVersionSupported(
    version: string,
    supportedVersions: (string | undefined)[],
  ): boolean {
    const filteredVersions = supportedVersions.filter(Boolean);
    return filteredVersions.length === 0 || filteredVersions.includes(version);
  }

  /**
   * Extract version from URL path
   * @param path - URL path
   * @returns Extracted version or null
   */
  private extractVersionFromUrl(path: string): string | null {
    const versionMatch = path.match(/\/v(\d+(?:\.\d+)?)\//);
    return versionMatch ? `v${versionMatch[1]}` : null;
  }

  /**
   * Extract version from Accept header media type
   * @param accept - Accept header value
   * @returns Extracted version or null
   */
  private extractVersionFromMediaType(accept: string): string | null {
    const mediaTypeMatch = accept.match(
      /application\/vnd\.bytebot\.v(\d+(?:\.\d+)?)\+json/,
    );
    return mediaTypeMatch ? `v${mediaTypeMatch[1]}` : null;
  }

  /**
   * Log deprecation security event
   * @param request - Express request
   * @param negotiation - Version negotiation
   * @param validation - Version validation
   * @param operationId - Operation ID
   */
  private logDeprecationEvent(
    request: Request,
    negotiation: VersionNegotiation,
    validation: VersionValidation,
    operationId: string,
  ): void {
    try {
      const eventType = validation.sunset
        ? SecurityEventType.API_DEPRECATED
        : SecurityEventType.API_DEPRECATED;

      const securityEvent = createSecurityEvent(
        eventType,
        request.url,
        request.method,
        true,
        `Deprecated API version accessed: ${negotiation.version}`,
        {
          operationId,
          apiVersion: negotiation.version,
          versionSource: negotiation.source,
          deprecated: validation.deprecated,
          sunset: validation.sunset,
          deprecationSince: negotiation.config.deprecation?.since,
          sunsetDate: negotiation.config.deprecation?.sunset,
          migrationGuide: negotiation.config.deprecation?.migration,
        },
        (request as any).user?.id,
        request.ip,
        request.get('User-Agent'),
      );

      this.logger.warn(`Deprecated API access: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        apiVersion: negotiation.version,
        riskScore: securityEvent.riskScore,
        operationId,
      });
    } catch (error) {
      this.logger.error('Failed to log deprecation security event', {
        operationId,
        error: error.message,
      });
    }
  }

  /**
   * Log version negotiation error
   * @param request - Express request
   * @param error - Error that occurred
   * @param operationId - Operation ID
   */
  private logVersionError(
    request: Request,
    error: any,
    operationId: string,
  ): void {
    try {
      const securityEvent = createSecurityEvent(
        SecurityEventType.VALIDATION_FAILED,
        request.url,
        request.method,
        false,
        `API version negotiation failed: ${error.message}`,
        {
          operationId,
          requestedVersionHeaders: {
            acceptVersion: request.get('Accept-Version'),
            accept: request.get('Accept'),
          },
          queryVersion: request.query.version,
          urlPath: request.path,
        },
        (request as any).user?.id,
        request.ip,
        request.get('User-Agent'),
      );

      this.logger.error(`Version negotiation error: ${securityEvent.eventId}`, {
        eventId: securityEvent.eventId,
        riskScore: securityEvent.riskScore,
        operationId,
      });
    } catch (loggingError) {
      this.logger.error('Failed to log version error security event', {
        operationId,
        error: loggingError.message,
      });
    }
  }
}

export default VersionInterceptor;
