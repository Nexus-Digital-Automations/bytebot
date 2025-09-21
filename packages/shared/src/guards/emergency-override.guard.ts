/**
 * Emergency Override Guard - Bytebot Platform Emergency Security Override
 *
 * This guard provides emergency access capabilities for critical system operations
 * when normal authentication channels are compromised or unavailable.
 *
 * @fileoverview Emergency override guard for critical system access
 * @version 1.0.0
 * @author Security Module Specialist
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { Role, Permission } from "../types/rbac.types";

/**
 * Emergency override context interface
 */
export interface EmergencyOverrideContext {
  /** Override token used for emergency access */
  token: string;
  /** User who initiated the emergency override */
  initiatedBy: string;
  /** Timestamp when override was initiated */
  initiatedAt: Date;
  /** Reason for emergency override */
  reason: string;
  /** Override duration in minutes */
  durationMinutes: number;
  /** Emergency override status */
  active: boolean;
  /** Client IP address */
  clientIP: string;
  /** Requesting user/system (alias for initiatedBy) */
  requestedBy: string;
  /** Timestamp of emergency access request (alias for initiatedAt) */
  timestamp: Date;
}

/**
 * Extended request interface for emergency override context
 */
interface EmergencyOverrideRequest extends Request {
  emergencyOverride?: EmergencyOverrideContext;
}

/**
 * Emergency override configuration
 */
export interface EmergencyOverrideConfig {
  /** Enable emergency override functionality */
  enabled: boolean;

  /** Emergency override token/key */
  overrideToken?: string;

  /** Maximum time emergency access is valid (in minutes) */
  maxDurationMinutes: number;

  /** Required emergency roles */
  requiredRoles: Role[];

  /** Required emergency permissions */
  requiredPermissions: Permission[];

  /** IP whitelist for emergency access */
  allowedIPs?: string[];

  /** Enable audit logging for emergency access */
  auditLogging: boolean;
}

@Injectable()
export class EmergencyOverrideGuard implements CanActivate {
  private readonly logger = new Logger(EmergencyOverrideGuard.name);

  constructor(private readonly _configService: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Check if emergency override is enabled
      const config = this.getEmergencyConfig();
      if (!config.enabled) {
        this.logger.warn("Emergency override attempted but not enabled");
        return false;
      }

      // Extract emergency access context from request
      const emergencyContext = this.extractEmergencyContext(request);
      if (!emergencyContext) {
        return false;
      }

      // Validate emergency access
      const isValid = await this.validateEmergencyAccess(
        emergencyContext,
        config,
      );

      if (isValid) {
        // Log emergency access
        this.logEmergencyAccess(emergencyContext);

        // Attach emergency context to request
        (request as EmergencyOverrideRequest).emergencyOverride =
          emergencyContext;

        return true;
      }

      return false;
    } catch (error) {
      this.logger.error("Emergency override validation failed:", error);
      throw new UnauthorizedException("Emergency access denied");
    }
  }

  /**
   * Get emergency override configuration
   */
  private getEmergencyConfig(): EmergencyOverrideConfig {
    return {
      enabled: this._configService.get<boolean>(
        "emergency.override.enabled",
        false,
      ),
      overrideToken: this._configService.get<string>(
        "emergency.override.token",
      ),
      maxDurationMinutes: this._configService.get<number>(
        "emergency.override.maxDuration",
        60,
      ),
      requiredRoles: [Role._SUPER_ADMIN, Role._ADMIN],
      requiredPermissions: [Permission._ADMIN, Permission._SYSTEM_MANAGEMENT],
      allowedIPs: this._configService.get<string[]>(
        "emergency.override.allowedIPs",
      ),
      auditLogging: this._configService.get<boolean>(
        "emergency.override.auditLogging",
        true,
      ),
    };
  }

  /**
   * Extract emergency access context from request
   */
  private extractEmergencyContext(
    request: Request,
  ): EmergencyOverrideContext | null {
    const emergencyHeader = request.headers["x-emergency-override"] as string;
    const emergencyToken = request.headers["x-emergency-token"] as string;

    if (!emergencyHeader || !emergencyToken) {
      return null;
    }

    try {
      const emergencyData = JSON.parse(emergencyHeader);

      return {
        reason: emergencyData.reason || "Emergency system access",
        requestedBy: emergencyData.requestedBy || "unknown",
        initiatedBy: emergencyData.requestedBy || "unknown",
        durationMinutes: Math.min(emergencyData.durationMinutes || 30, 120), // Max 2 hours
        clientIP: this.getClientIP(request),
        timestamp: new Date(),
        initiatedAt: new Date(),
        token: emergencyToken,
        active: true,
      };
    } catch (error) {
      this.logger.error("Failed to parse emergency override context:", error);
      return null;
    }
  }

  /**
   * Validate emergency access request
   */
  private async validateEmergencyAccess(
    context: EmergencyOverrideContext,
    config: EmergencyOverrideConfig,
  ): Promise<boolean> {
    // Validate token
    if (!config.overrideToken || context.token !== config.overrideToken) {
      this.logger.warn("Invalid emergency override token");
      return false;
    }

    // Validate duration
    if (context.durationMinutes > config.maxDurationMinutes) {
      this.logger.warn("Emergency access duration exceeds maximum allowed");
      return false;
    }

    // Validate IP if configured
    if (config.allowedIPs && config.allowedIPs.length > 0) {
      if (!config.allowedIPs.includes(context.clientIP)) {
        this.logger.warn(
          `Emergency access from unauthorized IP: ${context.clientIP}`,
        );
        return false;
      }
    }

    // Validate reason is provided
    if (!context.reason || context.reason.trim().length < 10) {
      this.logger.warn("Emergency access reason too short or missing");
      return false;
    }

    return true;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(request: Request): string {
    return (
      (request.headers["x-forwarded-for"] as string) ||
      (request.headers["x-real-ip"] as string) ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      "unknown"
    );
  }

  /**
   * Log emergency access for audit purposes
   */
  private logEmergencyAccess(context: EmergencyOverrideContext): void {
    this.logger.warn("EMERGENCY ACCESS GRANTED", {
      reason: context.reason,
      requestedBy: context.requestedBy,
      duration: context.durationMinutes,
      clientIP: context.clientIP,
      timestamp: context.timestamp.toISOString(),
      level: "CRITICAL",
      auditRequired: true,
    });

    // Additional audit logging could be implemented here
    // to send to external audit systems, SIEM, etc.
  }
}
