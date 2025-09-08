/**
 * RBAC Metadata Utilities - Advanced Metadata Extraction and Processing
 *
 * This module provides utility functions for extracting, processing, and validating
 * RBAC metadata from decorators. Includes metadata caching, validation, and
 * performance optimization features.
 *
 * @fileoverview RBAC metadata extraction and processing utilities
 * @version 2.0.0
 * @author RBAC Decorators Specialist
 */

import "reflect-metadata";
import {
  Role,
  Permission,
  ResourceType,
  ROLES_KEY,
  PERMISSIONS_KEY,
  ANY_ROLE_KEY,
  ALL_PERMISSIONS_KEY,
  RESOURCE_KEY,
  OWNERSHIP_KEY,
  CONDITIONAL_ACCESS_KEY,
  TIME_ACCESS_KEY,
  IP_ACCESS_KEY,
  AUDIT_ACCESS_KEY,
  SECURE_ENDPOINT_KEY,
  ADMIN_ONLY_KEY,
} from "../decorators/rbac-authorization.decorators";
import { RBACMetadata } from "../types/rbac.types";

// ===========================
// METADATA CACHE
// ===========================

/**
 * Metadata cache entry
 */
interface MetadataCacheEntry {
  /** Cached metadata */
  metadata: RBACMetadata;

  /** Cache creation timestamp */
  createdAt: Date;

  /** Access count */
  accessCount: number;

  /** Last accessed timestamp */
  lastAccessed: Date;
}

/**
 * Global metadata cache for performance optimization
 */
class MetadataCache {
  private cache = new Map<string, MetadataCacheEntry>();
  private maxSize = 1000;
  private ttlMs = 300000; // 5 minutes

  /**
   * Generate cache key for target and property
   */
  private generateKey(target: unknown, propertyKey?: string): string {
    const targetObj = target as Record<string, unknown>;
    const targetConstructor = targetObj.constructor as any;
    const className =
      (targetObj.name as string) || targetConstructor?.name || "Unknown";
    return propertyKey ? `${className}#${propertyKey}` : className;
  }

  /**
   * Get metadata from cache
   */
  get(target: unknown, propertyKey?: string): RBACMetadata | null {
    const key = this.generateKey(target, propertyKey);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.createdAt.getTime() > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = new Date();

    return entry.metadata;
  }

  /**
   * Set metadata in cache
   */
  set(
    target: unknown,
    propertyKey: string | undefined,
    metadata: RBACMetadata,
  ): void {
    const key = this.generateKey(target, propertyKey);

    // Evict old entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldestEntries();
    }

    this.cache.set(key, {
      metadata,
      createdAt: new Date(),
      accessCount: 1,
      lastAccessed: new Date(),
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{
      key: string;
      accessCount: number;
      age: number;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      accessCount: entry.accessCount,
      age: Date.now() - entry.createdAt.getTime(),
    }));

    const totalAccesses = entries.reduce(
      (sum, entry) => sum + entry.accessCount,
      0,
    );
    const hitRate =
      totalAccesses > 0 ? (entries.length / totalAccesses) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      entries,
    };
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldestEntries(): void {
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.lastAccessed.getTime() - b.lastAccessed.getTime(),
    );

    // Remove oldest 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}

// Global metadata cache instance
const metadataCache = new MetadataCache();

// ===========================
// METADATA EXTRACTION FUNCTIONS
// ===========================

/**
 * Extract comprehensive RBAC metadata from target and method
 *
 * @param target Target class or method
 * @param propertyKey Method name (optional for class-level metadata)
 * @param useCache Whether to use metadata cache (default: true)
 * @returns Comprehensive RBAC metadata
 */
export function extractRBACMetadata(
  target: unknown,
  propertyKey?: string,
  useCache = true,
): RBACMetadata {
  // Try to get from cache first
  if (useCache) {
    const cached = metadataCache.get(target, propertyKey);
    if (cached) {
      return cached;
    }
  }

  const metadata: RBACMetadata = {};

  try {
    if (propertyKey) {
      // Extract method-level metadata
      metadata.roles = Reflect.getMetadata(
        ROLES_KEY,
        target as object,
        propertyKey,
      ) as Role[] | undefined;
      metadata.permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        target as object,
        propertyKey,
      ) as Permission[] | undefined;
      metadata.anyRole = Reflect.getMetadata(
        ANY_ROLE_KEY,
        target as object,
        propertyKey,
      ) as Role[] | undefined;
      metadata.allPermissions = Reflect.getMetadata(
        ALL_PERMISSIONS_KEY,
        target as object,
        propertyKey,
      ) as Permission[] | undefined;
      metadata.resource = Reflect.getMetadata(
        RESOURCE_KEY,
        target as object,
        propertyKey,
      ) as { action: string; resource: ResourceType } | undefined;
      metadata.ownership = Reflect.getMetadata(
        OWNERSHIP_KEY,
        target as object,
        propertyKey,
      ) as boolean | undefined;
      metadata.conditionalAccess = Reflect.getMetadata(
        CONDITIONAL_ACCESS_KEY,
        target as object,
        propertyKey,
      ) as Record<string, unknown> | undefined;
      metadata.timeAccess = Reflect.getMetadata(
        TIME_ACCESS_KEY,
        target as object,
        propertyKey,
      ) as Record<string, unknown> | undefined;
      metadata.ipAccess = Reflect.getMetadata(
        IP_ACCESS_KEY,
        target as object,
        propertyKey,
      ) as Record<string, unknown> | undefined;
      metadata.auditAccess = Reflect.getMetadata(
        AUDIT_ACCESS_KEY,
        target as object,
        propertyKey,
      ) as boolean | undefined;
      metadata.secureEndpoint = Reflect.getMetadata(
        SECURE_ENDPOINT_KEY,
        target as object,
        propertyKey,
      ) as Record<string, unknown> | undefined;
      metadata.adminOnly = Reflect.getMetadata(
        ADMIN_ONLY_KEY,
        target as object,
        propertyKey,
      ) as boolean | undefined;
    } else {
      // Extract class-level metadata
      metadata.roles = Reflect.getMetadata(ROLES_KEY, target as object) as
        | Role[]
        | undefined;
      metadata.permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        target as object,
      ) as Permission[] | undefined;
      metadata.anyRole = Reflect.getMetadata(ANY_ROLE_KEY, target as object) as
        | Role[]
        | undefined;
      metadata.allPermissions = Reflect.getMetadata(
        ALL_PERMISSIONS_KEY,
        target as object,
      ) as Permission[] | undefined;
      metadata.resource = Reflect.getMetadata(
        RESOURCE_KEY,
        target as object,
      ) as { action: string; resource: ResourceType } | undefined;
      metadata.ownership = Reflect.getMetadata(
        OWNERSHIP_KEY,
        target as object,
      ) as boolean | undefined;
      metadata.conditionalAccess = Reflect.getMetadata(
        CONDITIONAL_ACCESS_KEY,
        target as object,
      ) as Record<string, unknown> | undefined;
      metadata.timeAccess = Reflect.getMetadata(
        TIME_ACCESS_KEY,
        target as object,
      ) as Record<string, unknown> | undefined;
      metadata.ipAccess = Reflect.getMetadata(
        IP_ACCESS_KEY,
        target as object,
      ) as Record<string, unknown> | undefined;
      metadata.auditAccess = Reflect.getMetadata(
        AUDIT_ACCESS_KEY,
        target as object,
      ) as boolean | undefined;
      metadata.secureEndpoint = Reflect.getMetadata(
        SECURE_ENDPOINT_KEY,
        target as object,
      ) as Record<string, unknown> | undefined;
      metadata.adminOnly = Reflect.getMetadata(
        ADMIN_ONLY_KEY,
        target as object,
      ) as boolean | undefined;
    }

    // Cache the result
    if (useCache) {
      metadataCache.set(target, propertyKey, metadata);
    }

    return metadata;
  } catch (error) {
    console.error("Error extracting RBAC metadata:", error);
    return {};
  }
}

/**
 * Extract merged metadata from class and method
 * Method-level metadata takes precedence over class-level metadata
 *
 * @param target Target class
 * @param propertyKey Method name
 * @param useCache Whether to use metadata cache
 * @returns Merged RBAC metadata
 */
export function extractMergedMetadata(
  target: unknown,
  propertyKey: string,
  useCache = true,
): RBACMetadata {
  const classMetadata = extractRBACMetadata(target, undefined, useCache);
  const methodMetadata = extractRBACMetadata(target, propertyKey, useCache);

  // Merge metadata with method taking precedence
  return {
    roles: methodMetadata.roles || classMetadata.roles,
    permissions: methodMetadata.permissions || classMetadata.permissions,
    anyRole: methodMetadata.anyRole || classMetadata.anyRole,
    allPermissions:
      methodMetadata.allPermissions || classMetadata.allPermissions,
    resource: methodMetadata.resource || classMetadata.resource,
    ownership:
      methodMetadata.ownership !== undefined
        ? methodMetadata.ownership
        : classMetadata.ownership,
    conditionalAccess:
      methodMetadata.conditionalAccess || classMetadata.conditionalAccess,
    timeAccess: methodMetadata.timeAccess || classMetadata.timeAccess,
    ipAccess: methodMetadata.ipAccess || classMetadata.ipAccess,
    auditAccess:
      methodMetadata.auditAccess !== undefined
        ? methodMetadata.auditAccess
        : classMetadata.auditAccess,
    secureEndpoint:
      methodMetadata.secureEndpoint || classMetadata.secureEndpoint,
    adminOnly:
      methodMetadata.adminOnly !== undefined
        ? methodMetadata.adminOnly
        : classMetadata.adminOnly,
  };
}

// ===========================
// METADATA VALIDATION FUNCTIONS
// ===========================

/**
 * Validate RBAC metadata for correctness and completeness
 *
 * @param metadata RBAC metadata to validate
 * @returns Validation result with errors and warnings
 */
export function validateRBACMetadata(metadata: RBACMetadata): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate roles
    if (metadata.roles) {
      if (!Array.isArray(metadata.roles) || metadata.roles.length === 0) {
        errors.push("Roles must be a non-empty array");
      } else {
        const invalidRoles = metadata.roles.filter(
          (role) => !Object.values(Role).includes(role),
        );
        if (invalidRoles.length > 0) {
          errors.push(`Invalid roles: ${invalidRoles.join(", ")}`);
        }
      }
    }

    // Validate permissions
    if (metadata.permissions) {
      if (
        !Array.isArray(metadata.permissions) ||
        metadata.permissions.length === 0
      ) {
        errors.push("Permissions must be a non-empty array");
      } else {
        const invalidPermissions = metadata.permissions.filter(
          (permission) => !Object.values(Permission).includes(permission),
        );
        if (invalidPermissions.length > 0) {
          errors.push(`Invalid permissions: ${invalidPermissions.join(", ")}`);
        }
      }
    }

    // Validate anyRole
    if (metadata.anyRole) {
      if (!Array.isArray(metadata.anyRole) || metadata.anyRole.length === 0) {
        errors.push("anyRole must be a non-empty array");
      } else {
        const invalidRoles = metadata.anyRole.filter(
          (role) => !Object.values(Role).includes(role),
        );
        if (invalidRoles.length > 0) {
          errors.push(`Invalid anyRole roles: ${invalidRoles.join(", ")}`);
        }
      }
    }

    // Validate allPermissions
    if (metadata.allPermissions) {
      if (
        !Array.isArray(metadata.allPermissions) ||
        metadata.allPermissions.length === 0
      ) {
        errors.push("allPermissions must be a non-empty array");
      } else {
        const invalidPermissions = metadata.allPermissions.filter(
          (permission) => !Object.values(Permission).includes(permission),
        );
        if (invalidPermissions.length > 0) {
          errors.push(
            `Invalid allPermissions permissions: ${invalidPermissions.join(", ")}`,
          );
        }
      }
    }

    // Validate resource configuration
    if (metadata.resource) {
      if (!metadata.resource.action || !metadata.resource.resource) {
        errors.push(
          "Resource configuration must have both action and resource properties",
        );
      }
    }

    // Validate time-based access
    if (metadata.timeAccess) {
      const timeConfig = metadata.timeAccess;

      if (timeConfig.allowedHours) {
        const invalidHours = timeConfig.allowedHours.filter(
          (hour) => hour < 0 || hour > 23,
        );
        if (invalidHours.length > 0) {
          errors.push(
            `Invalid hours in allowedHours: ${invalidHours.join(", ")} (must be 0-23)`,
          );
        }
      }

      if (timeConfig.allowedDaysOfWeek) {
        const invalidDays = timeConfig.allowedDaysOfWeek.filter(
          (day) => day < 0 || day > 6,
        );
        if (invalidDays.length > 0) {
          errors.push(
            `Invalid days in allowedDaysOfWeek: ${invalidDays.join(", ")} (must be 0-6)`,
          );
        }
      }

      if (timeConfig.startDate && timeConfig.endDate) {
        const startDate = new Date(timeConfig.startDate);
        const endDate = new Date(timeConfig.endDate);
        if (startDate >= endDate) {
          errors.push("startDate must be before endDate in time-based access");
        }
      }
    }

    // Validate IP-based access
    if (metadata.ipAccess) {
      const ipConfig = metadata.ipAccess;

      if (ipConfig.allowedIPs && ipConfig.allowedIPs.length === 0) {
        warnings.push("allowedIPs is an empty array - no IPs will be allowed");
      }

      if (ipConfig.blockedIPs && ipConfig.blockedIPs.length === 0) {
        warnings.push("blockedIPs is an empty array - no IPs will be blocked");
      }
    }

    // Validate conditional access
    if (metadata.conditionalAccess) {
      const condConfig = metadata.conditionalAccess;

      if (
        condConfig.minSessionAge &&
        condConfig.maxSessionAge &&
        condConfig.minSessionAge > condConfig.maxSessionAge
      ) {
        errors.push(
          "minSessionAge must be less than or equal to maxSessionAge",
        );
      }

      if (condConfig.minSessionAge && condConfig.minSessionAge < 0) {
        errors.push("minSessionAge must be non-negative");
      }

      if (condConfig.maxSessionAge && condConfig.maxSessionAge < 0) {
        errors.push("maxSessionAge must be non-negative");
      }
    }

    // Validate secure endpoint configuration
    if (metadata.secureEndpoint) {
      const secureConfig = metadata.secureEndpoint;

      if (secureConfig.roles) {
        const invalidRoles = secureConfig.roles.filter(
          (role) => !Object.values(Role).includes(role),
        );
        if (invalidRoles.length > 0) {
          errors.push(
            `Invalid roles in secureEndpoint: ${invalidRoles.join(", ")}`,
          );
        }
      }

      if (secureConfig.permissions) {
        const invalidPermissions = secureConfig.permissions.filter(
          (permission) => !Object.values(Permission).includes(permission),
        );
        if (invalidPermissions.length > 0) {
          errors.push(
            `Invalid permissions in secureEndpoint: ${invalidPermissions.join(", ")}`,
          );
        }
      }

      if (secureConfig.resourceTypes) {
        const invalidResourceTypes = secureConfig.resourceTypes.filter(
          (type) => !Object.values(ResourceType).includes(type),
        );
        if (invalidResourceTypes.length > 0) {
          errors.push(
            `Invalid resourceTypes in secureEndpoint: ${invalidResourceTypes.join(", ")}`,
          );
        }
      }

      if (secureConfig.rateLimit) {
        if (secureConfig.rateLimit.requests <= 0) {
          errors.push("rateLimit requests must be greater than 0");
        }
        if (secureConfig.rateLimit.windowMs <= 0) {
          errors.push("rateLimit windowMs must be greater than 0");
        }
      }
    }

    // Check for conflicting configurations
    if (metadata.roles && metadata.anyRole) {
      warnings.push(
        "Both roles and anyRole are specified - anyRole will take precedence",
      );
    }

    if (metadata.permissions && metadata.allPermissions) {
      warnings.push(
        "Both permissions and allPermissions are specified - allPermissions will take precedence",
      );
    }

    if (metadata.adminOnly && (metadata.roles || metadata.anyRole)) {
      warnings.push(
        "adminOnly is specified with roles - adminOnly will take precedence",
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [
        `Validation failed with error: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings: [],
    };
  }
}

// ===========================
// METADATA ANALYSIS FUNCTIONS
// ===========================

/**
 * Analyze RBAC metadata to determine security requirements
 *
 * @param metadata RBAC metadata to analyze
 * @returns Security analysis result
 */
export function analyzeSecurityRequirements(metadata: RBACMetadata): {
  securityLevel: "low" | "medium" | "high" | "critical";
  requiresAuthentication: boolean;
  requiresAuthorization: boolean;
  requiresAuditLogging: boolean;
  requiresEncryption: boolean;
  requiresHttpsOnly: boolean;
  requiresRateLimiting: boolean;
  requiredCapabilities: string[];
  riskFactors: string[];
} {
  const analysis: {
    securityLevel: "low" | "medium" | "high" | "critical";
    requiresAuthentication: boolean;
    requiresAuthorization: boolean;
    requiresAuditLogging: boolean;
    requiresEncryption: boolean;
    requiresHttpsOnly: boolean;
    requiresRateLimiting: boolean;
    requiredCapabilities: string[];
    riskFactors: string[];
  } = {
    securityLevel: "low",
    requiresAuthentication: false,
    requiresAuthorization: false,
    requiresAuditLogging: false,
    requiresEncryption: false,
    requiresHttpsOnly: false,
    requiresRateLimiting: false,
    requiredCapabilities: [],
    riskFactors: [],
  };

  // Check if any authorization is required
  if (
    metadata.roles ||
    metadata.permissions ||
    metadata.anyRole ||
    metadata.allPermissions ||
    metadata.adminOnly
  ) {
    analysis.requiresAuthentication = true;
    analysis.requiresAuthorization = true;
    analysis.securityLevel = "medium";
  }

  // Admin-only operations are high security
  if (
    metadata.adminOnly ||
    (metadata.roles && metadata.roles.includes(Role.ADMIN))
  ) {
    analysis.securityLevel = "high";
    analysis.requiresAuditLogging = true;
    analysis.riskFactors.push("Admin access required");
  }

  // Super admin operations are critical security
  if (metadata.roles && metadata.roles.includes(Role.SUPER_ADMIN)) {
    analysis.securityLevel = "critical";
    analysis.requiresAuditLogging = true;
    analysis.requiresEncryption = true;
    analysis.requiresHttpsOnly = true;
    analysis.riskFactors.push("Super admin access required");
  }

  // System management permissions are high security
  if (
    metadata.permissions &&
    (metadata.permissions.includes(Permission.SYSTEM_MANAGEMENT) ||
      metadata.permissions.includes(Permission.SECURITY_MANAGEMENT))
  ) {
    analysis.securityLevel = "high";
    analysis.requiresAuditLogging = true;
    analysis.riskFactors.push("System management permissions required");
  }

  // Resource write/delete operations increase security level
  if (metadata.resource) {
    if (
      metadata.resource.action === "write" ||
      metadata.resource.action === "delete"
    ) {
      analysis.securityLevel =
        analysis.securityLevel === "low" ? "medium" : analysis.securityLevel;
      analysis.riskFactors.push(
        `Resource ${metadata.resource.action} operation`,
      );
    }
  }

  // Time-based access adds complexity
  if (metadata.timeAccess) {
    analysis.requiredCapabilities.push("time-based-access");
    analysis.riskFactors.push("Time-based access restrictions");
  }

  // IP-based access adds complexity
  if (metadata.ipAccess) {
    analysis.requiredCapabilities.push("ip-based-access");
    analysis.riskFactors.push("IP-based access restrictions");
  }

  // Conditional access adds complexity
  if (metadata.conditionalAccess) {
    analysis.requiredCapabilities.push("conditional-access");
    if (metadata.conditionalAccess.requireMFA) {
      analysis.securityLevel =
        analysis.securityLevel === "low" ? "medium" : analysis.securityLevel;
      analysis.riskFactors.push("Multi-factor authentication required");
    }
  }

  // Audit access requirement
  if (metadata.auditAccess) {
    analysis.requiresAuditLogging = true;
    analysis.requiredCapabilities.push("audit-logging");
  }

  // Secure endpoint configuration
  if (metadata.secureEndpoint) {
    const secureConfig = metadata.secureEndpoint;

    if (secureConfig.requireEncryption) {
      analysis.requiresEncryption = true;
      analysis.requiredCapabilities.push("encryption");
    }

    if (secureConfig.httpsOnly) {
      analysis.requiresHttpsOnly = true;
      analysis.requiredCapabilities.push("https-only");
    }

    if (secureConfig.rateLimit) {
      analysis.requiresRateLimiting = true;
      analysis.requiredCapabilities.push("rate-limiting");
    }

    if (secureConfig.auditLogging) {
      analysis.requiresAuditLogging = true;
    }
  }

  return analysis;
}

/**
 * Get cache statistics
 */
export function getCacheStats(): ReturnType<MetadataCache["getStats"]> {
  return metadataCache.getStats();
}

/**
 * Clear metadata cache
 */
export function clearMetadataCache(): void {
  metadataCache.clear();
}

/**
 * Check if metadata requires specific role
 */
export function requiresRole(metadata: RBACMetadata, role: Role): boolean {
  if (metadata.adminOnly && role === Role.ADMIN) {
    return true;
  }

  if (metadata.roles && metadata.roles.includes(role)) {
    return true;
  }

  if (metadata.anyRole && metadata.anyRole.includes(role)) {
    return true;
  }

  if (
    metadata.secureEndpoint &&
    metadata.secureEndpoint.roles &&
    metadata.secureEndpoint.roles.includes(role)
  ) {
    return true;
  }

  return false;
}

/**
 * Check if metadata requires specific permission
 */
export function requiresPermission(
  metadata: RBACMetadata,
  permission: Permission,
): boolean {
  if (metadata.permissions && metadata.permissions.includes(permission)) {
    return true;
  }

  if (metadata.allPermissions && metadata.allPermissions.includes(permission)) {
    return true;
  }

  if (
    metadata.secureEndpoint &&
    metadata.secureEndpoint.permissions &&
    metadata.secureEndpoint.permissions.includes(permission)
  ) {
    return true;
  }

  return false;
}

/**
 * Get all required roles from metadata
 */
export function getRequiredRoles(metadata: RBACMetadata): Role[] {
  const roles = new Set<Role>();

  if (metadata.adminOnly) {
    roles.add(Role.ADMIN);
  }

  if (metadata.roles) {
    metadata.roles.forEach((role) => roles.add(role));
  }

  if (metadata.anyRole) {
    metadata.anyRole.forEach((role) => roles.add(role));
  }

  if (metadata.secureEndpoint && metadata.secureEndpoint.roles) {
    metadata.secureEndpoint.roles.forEach((role) => roles.add(role));
  }

  return Array.from(roles);
}

/**
 * Get all required permissions from metadata
 */
export function getRequiredPermissions(metadata: RBACMetadata): Permission[] {
  const permissions = new Set<Permission>();

  if (metadata.permissions) {
    metadata.permissions.forEach((permission) => permissions.add(permission));
  }

  if (metadata.allPermissions) {
    metadata.allPermissions.forEach((permission) =>
      permissions.add(permission),
    );
  }

  if (metadata.secureEndpoint && metadata.secureEndpoint.permissions) {
    metadata.secureEndpoint.permissions.forEach((permission) =>
      permissions.add(permission),
    );
  }

  return Array.from(permissions);
}

// ===========================
// EXPORT ALL UTILITIES
// ===========================

export default {
  extractRBACMetadata,
  extractMergedMetadata,
  validateRBACMetadata,
  analyzeSecurityRequirements,
  getCacheStats,
  clearMetadataCache,
  requiresRole,
  requiresPermission,
  getRequiredRoles,
  getRequiredPermissions,
};
