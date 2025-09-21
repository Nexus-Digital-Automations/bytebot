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
import { Role, Permission, ResourceType } from "../types/rbac.types";
import {
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
 * Constructor type for class objects
 * Provides type-safe access to constructor functions without unsafe any types
 */
type ConstructorType<T = object> = new (..._args: readonly unknown[]) => T;

/**
 * Type guard for constructor functions
 * Safely checks if an object has a constructor property
 */
type ObjectWithConstructor = {
  readonly constructor?: ConstructorType | undefined;
  readonly name?: string;
};

/**
 * Named constructor type with stricter constraints
 * Ensures constructor has a name property for identification
 */
type NamedConstructor = ConstructorType & {
  readonly name: string;
};

/**
 * Metadata cache entry with strict typing
 */
interface MetadataCacheEntry {
  /** Cached metadata */
  readonly metadata: RBACMetadata;

  /** Cache creation timestamp */
  readonly createdAt: Date;

  /** Access count (mutable for statistics) */
  accessCount: number;

  /** Last accessed timestamp (mutable for statistics) */
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
   * Generate cache key for target and property with type safety
   * Uses strict type checking to avoid unsafe type assertions
   */
  private generateKey(target: unknown, propertyKey?: string): string {
    const className = this.extractClassName(target);
    return propertyKey ? `${className}#${propertyKey}` : className;
  }

  /**
   * Type-safe class name extraction without unsafe type assertions
   * Implements comprehensive type guards to ensure runtime safety
   */
  private extractClassName(target: unknown): string {
    // Guard clause: early return for null/undefined
    if (target === null || target === undefined) {
      return "Unknown";
    }

    // Type guard: check if target is a function with name
    if (typeof target === "function" && target.name) {
      return target.name;
    }

    // Type guard: check if target is object with name property
    if (this.isObjectWithName(target)) {
      return target.name;
    }

    // Type guard: check if target has constructor with name
    if (this.isObjectWithConstructor(target)) {
      const constructor = target.constructor;
      if (this.isNamedConstructor(constructor)) {
        return constructor.name;
      }
    }

    return "Unknown";
  }

  /**
   * Type guard: checks if value is an object with a string name property
   */
  private isObjectWithName(value: unknown): value is { readonly name: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      typeof (value as { name: unknown }).name === "string" &&
      (value as { name: string }).name.length > 0
    );
  }

  /**
   * Type guard: checks if value is an object with a constructor property
   */
  private isObjectWithConstructor(
    value: unknown,
  ): value is ObjectWithConstructor {
    return (
      typeof value === "object" && value !== null && "constructor" in value
    );
  }

  /**
   * Type guard: checks if constructor is a named constructor function
   */
  private isNamedConstructor(
    constructor: unknown,
  ): constructor is NamedConstructor {
    return (
      typeof constructor === "function" &&
      "name" in constructor &&
      typeof constructor.name === "string" &&
      constructor.name.length > 0
    );
  }

  /**
   * Get metadata from cache with type safety and TTL validation
   * Returns null if cache miss or entry expired
   */
  get(target: unknown, propertyKey?: string): RBACMetadata | null {
    try {
      const key = this.generateKey(target, propertyKey);
      const entry = this.cache.get(key);

      if (!entry) {
        return null;
      }

      // Check TTL with safe date arithmetic
      const currentTime = Date.now();
      const entryAge = currentTime - entry.createdAt.getTime();

      if (entryAge > this.ttlMs) {
        this.cache.delete(key);
        return null;
      }

      // Update access statistics with safe mutation
      entry.accessCount = Math.min(
        entry.accessCount + 1,
        Number.MAX_SAFE_INTEGER,
      );
      entry.lastAccessed = new Date(currentTime);

      return entry.metadata;
    } catch (err) {
      // Log err and return null for safety
      console.error("Error retrieving from metadata cache:", err);
      return null;
    }
  }

  /**
   * Set metadata in cache with validation and safe eviction
   * Ensures cache size limits and data integrity
   */
  set(
    target: unknown,
    propertyKey: string | undefined,
    metadata: RBACMetadata,
  ): void {
    try {
      // Validate input metadata
      if (!this.isValidRBACMetadata(metadata)) {
        console.warn("Invalid RBAC metadata provided to cache, skipping");
        return;
      }

      const key = this.generateKey(target, propertyKey);

      // Ensure cache size doesn't exceed limits
      if (this.cache.size >= this.maxSize) {
        this.evictOldestEntries();
      }

      const currentTime = new Date();
      const cacheEntry: MetadataCacheEntry = {
        metadata: { ...metadata }, // Shallow copy for immutability
        createdAt: currentTime,
        accessCount: 1,
        lastAccessed: currentTime,
      };

      this.cache.set(key, cacheEntry);
    } catch (err) {
      console.error("Error setting metadata cache:", err);
    }
  }

  /**
   * Validates RBAC metadata structure to ensure type safety
   */
  private isValidRBACMetadata(metadata: unknown): metadata is RBACMetadata {
    return (
      typeof metadata === "object" &&
      metadata !== null &&
      // Additional validation can be added here as needed
      true
    );
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
 * Type-safe metadata extraction with comprehensive validation
 * Replaces unsafe type assertions with proper type guards
 *
 * @param target Target class or method (must be object for Reflect operations)
 * @param propertyKey Method name (optional for class-level metadata)
 * @param useCache Whether to use metadata cache (default: true)
 * @returns Comprehensive RBAC metadata with type safety
 */
export function extractRBACMetadata(
  target: unknown,
  propertyKey?: string,
  useCache = true,
): RBACMetadata {
  // Validate target is an object suitable for Reflect operations
  if (!isReflectableObject(target)) {
    console.warn(
      "Invalid target provided to extractRBACMetadata, returning empty metadata",
    );
    return {};
  }

  // Try to get from cache first
  if (useCache) {
    const cached = metadataCache.get(target, propertyKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const metadata: RBACMetadata = propertyKey
      ? extractMethodMetadata(target, propertyKey)
      : extractClassMetadata(target);

    // Cache the result with validation
    if (useCache) {
      metadataCache.set(target, propertyKey, metadata);
    }

    return metadata;
  } catch (err) {
    console.error("Error extracting RBAC metadata:", err);
    return {};
  }
}

/**
 * Type guard to ensure target is suitable for Reflect operations
 */
function isReflectableObject(target: unknown): target is object {
  return (
    target !== null &&
    target !== undefined &&
    (typeof target === "object" || typeof target === "function")
  );
}

/**
 * Extract method-level metadata with type safety
 */
function extractMethodMetadata(
  target: object,
  propertyKey: string,
): RBACMetadata {
  return {
    roles: safeGetMetadata<Role[]>(ROLES_KEY, target, propertyKey),
    permissions: safeGetMetadata<Permission[]>(
      PERMISSIONS_KEY,
      target,
      propertyKey,
    ),
    anyRole: safeGetMetadata<Role[]>(ANY_ROLE_KEY, target, propertyKey),
    allPermissions: safeGetMetadata<Permission[]>(
      ALL_PERMISSIONS_KEY,
      target,
      propertyKey,
    ),
    resource: safeGetMetadata<{ action: string; resource: ResourceType }>(
      RESOURCE_KEY,
      target,
      propertyKey,
    ),
    ownership: safeGetMetadata<boolean>(OWNERSHIP_KEY, target, propertyKey),
    conditionalAccess: safeGetMetadata<RBACMetadata["conditionalAccess"]>(
      CONDITIONAL_ACCESS_KEY,
      target,
      propertyKey,
    ),
    timeAccess: safeGetMetadata<RBACMetadata["timeAccess"]>(
      TIME_ACCESS_KEY,
      target,
      propertyKey,
    ),
    ipAccess: safeGetMetadata<RBACMetadata["ipAccess"]>(
      IP_ACCESS_KEY,
      target,
      propertyKey,
    ),
    auditAccess: safeGetMetadata<boolean>(
      AUDIT_ACCESS_KEY,
      target,
      propertyKey,
    ),
    secureEndpoint: safeGetMetadata<RBACMetadata["secureEndpoint"]>(
      SECURE_ENDPOINT_KEY,
      target,
      propertyKey,
    ),
    adminOnly: safeGetMetadata<boolean>(ADMIN_ONLY_KEY, target, propertyKey),
  };
}

/**
 * Extract class-level metadata with type safety
 */
function extractClassMetadata(target: object): RBACMetadata {
  return {
    roles: safeGetMetadata<Role[]>(ROLES_KEY, target),
    permissions: safeGetMetadata<Permission[]>(PERMISSIONS_KEY, target),
    anyRole: safeGetMetadata<Role[]>(ANY_ROLE_KEY, target),
    allPermissions: safeGetMetadata<Permission[]>(ALL_PERMISSIONS_KEY, target),
    resource: safeGetMetadata<{ action: string; resource: ResourceType }>(
      RESOURCE_KEY,
      target,
    ),
    ownership: safeGetMetadata<boolean>(OWNERSHIP_KEY, target),
    conditionalAccess: safeGetMetadata<RBACMetadata["conditionalAccess"]>(
      CONDITIONAL_ACCESS_KEY,
      target,
    ),
    timeAccess: safeGetMetadata<RBACMetadata["timeAccess"]>(
      TIME_ACCESS_KEY,
      target,
    ),
    ipAccess: safeGetMetadata<RBACMetadata["ipAccess"]>(IP_ACCESS_KEY, target),
    auditAccess: safeGetMetadata<boolean>(AUDIT_ACCESS_KEY, target),
    secureEndpoint: safeGetMetadata<RBACMetadata["secureEndpoint"]>(
      SECURE_ENDPOINT_KEY,
      target,
    ),
    adminOnly: safeGetMetadata<boolean>(ADMIN_ONLY_KEY, target),
  };
}

/**
 * Type-safe metadata extraction helper
 * Eliminates unsafe type assertions by using generic constraints
 */
function safeGetMetadata<T>(
  metadataKey: string | symbol,
  target: object,
  propertyKey?: string,
): T | undefined {
  try {
    const value: unknown = propertyKey
      ? Reflect.getMetadata(metadataKey, target, propertyKey)
      : Reflect.getMetadata(metadataKey, target);

    // Return undefined for null/undefined, otherwise return the value as T
    // The caller is responsible for ensuring T matches the expected type
    return value === null || value === undefined ? undefined : (value as T);
  } catch (err) {
    console.warn(`Error getting metadata for key ${String(metadataKey)}:`, err);
    return undefined;
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

    // Validate time-based access with proper type checking
    if (metadata.timeAccess) {
      const timeConfig = metadata.timeAccess;

      // Type-safe validation of allowedHours
      if (timeConfig.allowedHours) {
        if (!Array.isArray(timeConfig.allowedHours)) {
          errors.push("allowedHours must be an array of numbers");
        } else {
          const invalidHours = timeConfig.allowedHours.filter(
            (hour) => typeof hour !== "number" || hour < 0 || hour > 23,
          );
          if (invalidHours.length > 0) {
            errors.push(
              `Invalid hours in allowedHours: ${invalidHours.join(", ")} (must be numbers 0-23)`,
            );
          }
        }
      }

      // Type-safe validation of allowedDaysOfWeek
      if (timeConfig.allowedDaysOfWeek) {
        if (!Array.isArray(timeConfig.allowedDaysOfWeek)) {
          errors.push("allowedDaysOfWeek must be an array of numbers");
        } else {
          const invalidDays = timeConfig.allowedDaysOfWeek.filter(
            (day) => typeof day !== "number" || day < 0 || day > 6,
          );
          if (invalidDays.length > 0) {
            errors.push(
              `Invalid days in allowedDaysOfWeek: ${invalidDays.join(", ")} (must be numbers 0-6)`,
            );
          }
        }
      }

      // Type-safe date validation
      if (timeConfig.startDate && timeConfig.endDate) {
        if (
          typeof timeConfig.startDate !== "string" ||
          typeof timeConfig.endDate !== "string"
        ) {
          errors.push("startDate and endDate must be strings");
        } else {
          const startDate = new Date(timeConfig.startDate);
          const endDate = new Date(timeConfig.endDate);

          if (isNaN(startDate.getTime())) {
            errors.push("startDate must be a valid date string");
          }
          if (isNaN(endDate.getTime())) {
            errors.push("endDate must be a valid date string");
          }

          if (
            !isNaN(startDate.getTime()) &&
            !isNaN(endDate.getTime()) &&
            startDate >= endDate
          ) {
            errors.push(
              "startDate must be before endDate in time-based access",
            );
          }
        }
      }
    }

    // Validate IP-based access with type safety
    if (metadata.ipAccess) {
      const ipConfig = metadata.ipAccess;

      // Validate allowedIPs
      if (ipConfig.allowedIPs !== undefined) {
        if (!Array.isArray(ipConfig.allowedIPs)) {
          errors.push("allowedIPs must be an array of strings");
        } else if (ipConfig.allowedIPs.length === 0) {
          warnings.push(
            "allowedIPs is an empty array - no IPs will be allowed",
          );
        } else {
          const invalidIPs = ipConfig.allowedIPs.filter(
            (ip) => typeof ip !== "string" || ip.trim().length === 0,
          );
          if (invalidIPs.length > 0) {
            errors.push("All allowedIPs must be non-empty strings");
          }
        }
      }

      // Validate blockedIPs
      if (ipConfig.blockedIPs !== undefined) {
        if (!Array.isArray(ipConfig.blockedIPs)) {
          errors.push("blockedIPs must be an array of strings");
        } else if (ipConfig.blockedIPs.length === 0) {
          warnings.push(
            "blockedIPs is an empty array - no IPs will be blocked",
          );
        } else {
          const invalidIPs = ipConfig.blockedIPs.filter(
            (ip) => typeof ip !== "string" || ip.trim().length === 0,
          );
          if (invalidIPs.length > 0) {
            errors.push("All blockedIPs must be non-empty strings");
          }
        }
      }

      // Validate country codes
      if (ipConfig.allowedCountries !== undefined) {
        if (!Array.isArray(ipConfig.allowedCountries)) {
          errors.push("allowedCountries must be an array of strings");
        } else {
          const invalidCountries = ipConfig.allowedCountries.filter(
            (country) => typeof country !== "string" || country.length !== 2,
          );
          if (invalidCountries.length > 0) {
            errors.push(
              "All allowedCountries must be 2-character country codes",
            );
          }
        }
      }

      if (ipConfig.blockedCountries !== undefined) {
        if (!Array.isArray(ipConfig.blockedCountries)) {
          errors.push("blockedCountries must be an array of strings");
        } else {
          const invalidCountries = ipConfig.blockedCountries.filter(
            (country) => typeof country !== "string" || country.length !== 2,
          );
          if (invalidCountries.length > 0) {
            errors.push(
              "All blockedCountries must be 2-character country codes",
            );
          }
        }
      }
    }

    // Validate conditional access with proper type checking
    if (metadata.conditionalAccess) {
      const condConfig = metadata.conditionalAccess;

      // Validate session age constraints
      if (condConfig.minSessionAge !== undefined) {
        if (typeof condConfig.minSessionAge !== "number") {
          errors.push("minSessionAge must be a number");
        } else if (condConfig.minSessionAge < 0) {
          errors.push("minSessionAge must be non-negative");
        }
      }

      if (condConfig.maxSessionAge !== undefined) {
        if (typeof condConfig.maxSessionAge !== "number") {
          errors.push("maxSessionAge must be a number");
        } else if (condConfig.maxSessionAge < 0) {
          errors.push("maxSessionAge must be non-negative");
        }
      }

      // Cross-validation of session ages
      if (
        typeof condConfig.minSessionAge === "number" &&
        typeof condConfig.maxSessionAge === "number" &&
        condConfig.minSessionAge > condConfig.maxSessionAge
      ) {
        errors.push(
          "minSessionAge must be less than or equal to maxSessionAge",
        );
      }

      // Validate MFA requirement
      if (
        condConfig.requireMFA !== undefined &&
        typeof condConfig.requireMFA !== "boolean"
      ) {
        errors.push("requireMFA must be a boolean value");
      }

      // Validate required attributes
      if (condConfig.requiredAttributes !== undefined) {
        if (
          typeof condConfig.requiredAttributes !== "object" ||
          condConfig.requiredAttributes === null
        ) {
          errors.push("requiredAttributes must be an object");
        }
      }

      // Validate condition function
      if (
        condConfig.conditionFunction !== undefined &&
        typeof condConfig.conditionFunction !== "string"
      ) {
        errors.push("conditionFunction must be a string");
      }
    }

    // Validate secure endpoint configuration with type safety
    if (metadata.secureEndpoint) {
      const secureConfig = metadata.secureEndpoint;

      // Validate roles array
      if (secureConfig.roles !== undefined) {
        if (!Array.isArray(secureConfig.roles)) {
          errors.push("secureEndpoint.roles must be an array");
        } else {
          const invalidRoles = secureConfig.roles.filter(
            (role) => !Object.values(Role).includes(role),
          );
          if (invalidRoles.length > 0) {
            errors.push(
              `Invalid roles in secureEndpoint: ${invalidRoles.join(", ")}`,
            );
          }
        }
      }

      // Validate permissions array
      if (secureConfig.permissions !== undefined) {
        if (!Array.isArray(secureConfig.permissions)) {
          errors.push("secureEndpoint.permissions must be an array");
        } else {
          const invalidPermissions = secureConfig.permissions.filter(
            (permission) => !Object.values(Permission).includes(permission),
          );
          if (invalidPermissions.length > 0) {
            errors.push(
              `Invalid permissions in secureEndpoint: ${invalidPermissions.join(", ")}`,
            );
          }
        }
      }

      // Validate resource types array
      if (secureConfig.resourceTypes !== undefined) {
        if (!Array.isArray(secureConfig.resourceTypes)) {
          errors.push("secureEndpoint.resourceTypes must be an array");
        } else {
          const invalidResourceTypes = secureConfig.resourceTypes.filter(
            (type) => !Object.values(ResourceType).includes(type),
          );
          if (invalidResourceTypes.length > 0) {
            errors.push(
              `Invalid resourceTypes in secureEndpoint: ${invalidResourceTypes.join(", ")}`,
            );
          }
        }
      }

      // Validate rate limit configuration
      if (secureConfig.rateLimit !== undefined) {
        if (
          typeof secureConfig.rateLimit !== "object" ||
          secureConfig.rateLimit === null
        ) {
          errors.push("secureEndpoint.rateLimit must be an object");
        } else {
          const rateLimit = secureConfig.rateLimit;
          if (rateLimit.requests !== undefined) {
            if (
              typeof rateLimit.requests !== "number" ||
              rateLimit.requests <= 0
            ) {
              errors.push("rateLimit.requests must be a positive number");
            }
          }
          if (rateLimit.windowMs !== undefined) {
            if (
              typeof rateLimit.windowMs !== "number" ||
              rateLimit.windowMs <= 0
            ) {
              errors.push("rateLimit.windowMs must be a positive number");
            }
          }
        }
      }

      // Validate boolean flags
      if (
        secureConfig.auditLogging !== undefined &&
        typeof secureConfig.auditLogging !== "boolean"
      ) {
        errors.push("secureEndpoint.auditLogging must be a boolean");
      }

      if (
        secureConfig.requireEncryption !== undefined &&
        typeof secureConfig.requireEncryption !== "boolean"
      ) {
        errors.push("secureEndpoint.requireEncryption must be a boolean");
      }

      if (
        secureConfig.httpsOnly !== undefined &&
        typeof secureConfig.httpsOnly !== "boolean"
      ) {
        errors.push("secureEndpoint.httpsOnly must be a boolean");
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
  } catch (err) {
    return {
      isValid: false,
      errors: [
        `Validation failed with error: ${err instanceof Error ? err.message : String(err)}`,
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
    (metadata.roles && metadata.roles.includes(Role._ADMIN))
  ) {
    analysis.securityLevel = "high";
    analysis.requiresAuditLogging = true;
    analysis.riskFactors.push("Admin access required");
  }

  // Super admin operations are critical security
  if (metadata.roles && metadata.roles.includes(Role._SUPER_ADMIN)) {
    analysis.securityLevel = "critical";
    analysis.requiresAuditLogging = true;
    analysis.requiresEncryption = true;
    analysis.requiresHttpsOnly = true;
    analysis.riskFactors.push("Super admin access required");
  }

  // System management permissions are high security
  if (
    metadata.permissions &&
    (metadata.permissions.includes(Permission._SYSTEM_MANAGEMENT) ||
      metadata.permissions.includes(Permission._SECURITY_MANAGEMENT))
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
    const conditionalAccess = metadata.conditionalAccess;
    if (conditionalAccess.requireMFA === true) {
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

    if (secureConfig.requireEncryption === true) {
      analysis.requiresEncryption = true;
      analysis.requiredCapabilities.push("encryption");
    }

    if (secureConfig.httpsOnly === true) {
      analysis.requiresHttpsOnly = true;
      analysis.requiredCapabilities.push("https-only");
    }

    if (secureConfig.rateLimit !== undefined) {
      analysis.requiresRateLimiting = true;
      analysis.requiredCapabilities.push("rate-limiting");
    }

    if (secureConfig.auditLogging === true) {
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
  if (metadata.adminOnly && role === Role._ADMIN) {
    return true;
  }

  if (metadata.roles && metadata.roles.includes(role)) {
    return true;
  }

  if (metadata.anyRole && metadata.anyRole.includes(role)) {
    return true;
  }

  if (metadata.secureEndpoint && metadata.secureEndpoint.roles) {
    if (metadata.secureEndpoint.roles.includes(role)) {
      return true;
    }
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

  if (metadata.secureEndpoint && metadata.secureEndpoint.permissions) {
    if (metadata.secureEndpoint.permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Get all required roles from metadata
 */
export function getRequiredRoles(metadata: RBACMetadata): Role[] {
  const roles = new Set<Role>();

  if (metadata.adminOnly) {
    roles.add(Role._ADMIN);
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
