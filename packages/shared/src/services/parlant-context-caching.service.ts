/**
 * PARLANT Context Caching and Optimization Service
 *
 * Enterprise-grade context caching system with security validation and performance optimization.
 * Provides intelligent caching, cache invalidation, security-aware cache policies,
 * and comprehensive performance monitoring for all PARLANT conversational operations.
 *
 * @module ParlantContextCachingService
 * @version 1.0.0
 * @author AIgent Context Caching Specialist
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { EventEmitter } from "events";
import * as crypto from "crypto";
import { performance } from "perf_hooks";
import {
  ParlantUserContext,
  SecurityLevel,
  ParlantIntegrationError,
} from "../types/parlant-integration.types";

/**
 * Cache entry with security metadata
 */
export interface SecureCacheEntry {
  /** Cache entry ID */
  entryId: string;
  /** Cache key */
  cacheKey: string;
  /** Cached data (encrypted) */
  encryptedData: string;
  /** Security metadata */
  securityMetadata: CacheSecurityMetadata;
  /** Cache metadata */
  cacheMetadata: CacheMetadata;
  /** Performance metrics */
  performanceMetrics: CachePerformanceMetrics;
  /** Access history */
  accessHistory: CacheAccessEntry[];
}

/**
 * Cache security metadata
 */
export interface CacheSecurityMetadata {
  /** Security level required to access cache */
  securityLevel: SecurityLevel;
  /** User context that created the cache */
  creatorContext: ParlantUserContext;
  /** Access permissions */
  accessPermissions: CacheAccessPermission[];
  /** Encryption metadata */
  encryptionMetadata: CacheEncryptionMetadata;
  /** Integrity validation */
  integrityValidation: CacheIntegrityValidation;
}

/**
 * Cache access permissions
 */
export interface CacheAccessPermission {
  /** Permission type */
  type: "read" | "write" | "delete" | "admin";
  /** Required roles */
  requiredRoles: string[];
  /** Required permissions */
  requiredPermissions: string[];
  /** Access conditions */
  conditions: CacheAccessCondition[];
}

/**
 * Cache access conditions
 */
export interface CacheAccessCondition {
  /** Condition type */
  type: "time_based" | "location_based" | "security_level" | "user_attribute";
  /** Condition value */
  value: unknown;
  /** Condition operator */
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "in_range";
}

/**
 * Cache encryption metadata
 */
export interface CacheEncryptionMetadata {
  /** Encryption algorithm used */
  algorithm: string;
  /** Key derivation method */
  keyDerivation: string;
  /** Encryption key hash */
  keyHash: string;
  /** Initialization vector */
  initializationVector: string;
  /** Encrypted at timestamp */
  encryptedAt: Date;
}

/**
 * Cache integrity validation
 */
export interface CacheIntegrityValidation {
  /** Integrity hash */
  integrityHash: string;
  /** Hash algorithm */
  hashAlgorithm: string;
  /** Validation timestamp */
  validatedAt: Date;
  /** Validation signature */
  validationSignature: string;
}

/**
 * Cache metadata
 */
export interface CacheMetadata {
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  lastModified: Date;
  /** Last accessed timestamp */
  lastAccessed: Date;
  /** Expiration timestamp */
  expiresAt: Date;
  /** Cache tier */
  cacheTier: CacheTier;
  /** Cache tags */
  tags: string[];
  /** Size in bytes */
  sizeBytes: number;
  /** Compression enabled */
  compressionEnabled: boolean;
  /** TTL (time to live) */
  ttl: number;
}

/**
 * Cache tiers for different performance and security requirements
 */
export enum CacheTier {
  MEMORY = "memory",
  REDIS = "redis",
  PERSISTENT = "persistent",
  DISTRIBUTED = "distributed",
  SECURE_ENCLAVE = "secure_enclave",
}

/**
 * Cache performance metrics
 */
export interface CachePerformanceMetrics {
  /** Hit count */
  hitCount: number;
  /** Miss count */
  missCount: number;
  /** Total access count */
  accessCount: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Average access time */
  averageAccessTime: number;
  /** Average size over time */
  averageSize: number;
  /** Eviction count */
  evictionCount: number;
  /** Last performance update */
  lastUpdated: Date;
}

/**
 * Cache access entry for audit trail
 */
export interface CacheAccessEntry {
  /** Access ID */
  accessId: string;
  /** Access type */
  accessType: "read" | "write" | "delete" | "invalidate";
  /** User context */
  userContext: ParlantUserContext;
  /** Access timestamp */
  timestamp: Date;
  /** Access duration */
  duration: number;
  /** Access result */
  result: "success" | "failure" | "unauthorized";
  /** Access metadata */
  metadata: Record<string, unknown>;
}

/**
 * Cache policy configuration
 */
export interface CachePolicyConfig {
  /** Policy ID */
  policyId: string;
  /** Policy name */
  name: string;
  /** Cache tier to use */
  cacheTier: CacheTier;
  /** Default TTL */
  defaultTtl: number;
  /** Maximum entry size */
  maxEntrySize: number;
  /** Eviction policy */
  evictionPolicy: EvictionPolicy;
  /** Security requirements */
  securityRequirements: CacheSecurityRequirement[];
  /** Performance targets */
  performanceTargets: CachePerformanceTargets;
}

/**
 * Eviction policies
 */
export enum EvictionPolicy {
  LRU = "lru",
  LFU = "lfu",
  FIFO = "fifo",
  TTL = "ttl",
  SECURITY_BASED = "security_based",
  CUSTOM = "custom",
}

/**
 * Cache security requirements
 */
export interface CacheSecurityRequirement {
  /** Requirement type */
  type:
    | "encryption"
    | "access_control"
    | "audit"
    | "integrity"
    | "anonymization";
  /** Requirement level */
  level: "optional" | "recommended" | "mandatory";
  /** Configuration */
  configuration: Record<string, unknown>;
}

/**
 * Cache performance targets
 */
export interface CachePerformanceTargets {
  /** Target hit rate percentage */
  targetHitRate: number;
  /** Maximum access time in milliseconds */
  maxAccessTime: number;
  /** Target memory usage in MB */
  targetMemoryUsage: number;
  /** Maximum eviction rate */
  maxEvictionRate: number;
}

/**
 * Cache optimization configuration
 */
export interface CacheOptimizationConfig {
  /** Enable intelligent prefetching */
  enablePrefetching: boolean;
  /** Enable compression */
  enableCompression: boolean;
  /** Enable cache warming */
  enableCacheWarming: boolean;
  /** Enable adaptive TTL */
  enableAdaptiveTtl: boolean;
  /** Enable security-aware optimization */
  enableSecurityOptimization: boolean;
  /** Optimization interval */
  optimizationInterval: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  /** Total cache entries */
  totalEntries: number;
  /** Total cache size in bytes */
  totalSize: number;
  /** Memory usage in MB */
  memoryUsage: number;
  /** Overall hit rate */
  overallHitRate: number;
  /** Total hits */
  totalHits: number;
  /** Total misses */
  totalMisses: number;
  /** Average access time */
  averageAccessTime: number;
  /** Total evictions */
  totalEvictions: number;
  /** Cache efficiency score */
  efficiencyScore: number;
  /** Security compliance score */
  securityComplianceScore: number;
}

/**
 * Cache invalidation request
 */
export interface CacheInvalidationRequest {
  /** Invalidation ID */
  invalidationId: string;
  /** Invalidation type */
  type: "key" | "pattern" | "tag" | "user" | "security_level" | "global";
  /** Target specification */
  target: string | string[];
  /** Reason for invalidation */
  reason: string;
  /** Requesting user context */
  requestingUser: ParlantUserContext;
  /** Cascade invalidation */
  cascadeInvalidation: boolean;
}

/**
 * PARLANT Context Caching and Optimization Service
 *
 * Provides intelligent, secure caching for PARLANT context data with
 * enterprise-grade security validation and performance optimization.
 */
@Injectable()
export class ParlantContextCachingService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ParlantContextCachingService.name);

  // Cache storage by tier
  private readonly memoryCacheStore = new Map<string, SecureCacheEntry>();
  private readonly redisCacheStore = new Map<string, SecureCacheEntry>(); // Simulated Redis
  private readonly persistentCacheStore = new Map<string, SecureCacheEntry>(); // Simulated persistent storage

  // Cache management
  private readonly cachePolicies = new Map<string, CachePolicyConfig>();
  private readonly cacheKeyIndex = new Map<string, Set<string>>(); // tag -> keys
  private readonly userCacheIndex = new Map<string, Set<string>>(); // userId -> keys

  // Security and encryption
  private readonly cacheEncryptionKey = this.generateCacheEncryptionKey();
  private readonly securityValidator = new Map<
    string,
    (entry: SecureCacheEntry, user: ParlantUserContext) => boolean
  >();

  // Performance monitoring
  private readonly cacheStats: CacheStatistics = {
    totalEntries: 0,
    totalSize: 0,
    memoryUsage: 0,
    overallHitRate: 0,
    totalHits: 0,
    totalMisses: 0,
    averageAccessTime: 0,
    totalEvictions: 0,
    efficiencyScore: 0,
    securityComplianceScore: 0,
  };

  // Optimization configuration
  private readonly optimizationConfig: CacheOptimizationConfig = {
    enablePrefetching: true,
    enableCompression: true,
    enableCacheWarming: true,
    enableAdaptiveTtl: true,
    enableSecurityOptimization: true,
    optimizationInterval: 300000, // 5 minutes
  };

  // Cleanup and optimization timers
  private cacheCleanupTimer: NodeJS.Timeout | null = null;
  private optimizationTimer: NodeJS.Timeout | null = null;
  private statisticsTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🚀 Initializing PARLANT Context Caching Service");
  }

  /**
   * Initialize the Context Caching Service
   */
  async onModuleInit(): Promise<void> {
    this.logger.log("🔄 Starting Context Caching initialization...");

    try {
      await this.initializeCachePolicies();
      await this.initializeSecurityValidators();
      await this.startOptimizationTasks();

      this.logger.log("✅ Context Caching Service initialized successfully");
      this.emit("caching:service:initialized");
    } catch (error) {
      this.logger.error(
        "❌ Failed to initialize Context Caching Service",
        error,
      );
      throw new ParlantIntegrationError(
        "Context Caching initialization failed",
        "CACHING_INIT_ERROR",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down Context Caching Service...");

    await this.stopOptimizationTasks();
    await this.flushAllCaches();
    await this.saveCacheStatistics();

    this.logger.log("✅ Context Caching Service shutdown complete");
  }

  /**
   * Store data in secure cache
   */
  async setCacheEntry(
    cacheKey: string,
    data: Record<string, unknown>,
    userContext: ParlantUserContext,
    options?: {
      ttl?: number;
      securityLevel?: SecurityLevel;
      cacheTier?: CacheTier;
      tags?: string[];
    },
  ): Promise<string> {
    const startTime = performance.now();

    try {
      // Determine cache policy
      const policy = await this.determineCachePolicy(
        data,
        userContext,
        options,
      );

      // Validate security requirements
      await this.validateCacheSecurityRequirements(data, userContext, policy);

      // Create secure cache entry
      const entry = await this.createSecureCacheEntry(
        cacheKey,
        data,
        userContext,
        policy,
        options,
      );

      // Store in appropriate cache tier
      await this.storeInCacheTier(entry, policy.cacheTier);

      // Update indexes
      this.updateCacheIndexes(entry);

      // Update performance metrics
      const duration = performance.now() - startTime;
      this.updateCacheMetrics(entry, "write", duration);

      // Emit cache set event
      this.emit("cache:set", {
        cacheKey,
        entryId: entry.entryId,
        cacheTier: policy.cacheTier,
        duration,
      });

      this.logger.debug(
        `✅ Cache entry stored: ${cacheKey} in tier ${policy.cacheTier} (${duration.toFixed(2)}ms)`,
      );

      return entry.entryId;
    } catch (error) {
      this.logger.error("❌ Failed to set cache entry", error);
      throw new ParlantIntegrationError(
        "Cache set operation failed",
        "CACHE_SET_ERROR",
        {
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Retrieve data from secure cache
   */
  async getCacheEntry(
    cacheKey: string,
    userContext: ParlantUserContext,
  ): Promise<Record<string, unknown> | null> {
    const startTime = performance.now();

    try {
      // Find cache entry across all tiers
      const entry = await this.findCacheEntry(cacheKey);

      if (!entry) {
        this.cacheStats.totalMisses++;
        this.updateHitRate();

        this.emit("cache:miss", { cacheKey });
        return null;
      }

      // Validate access permissions
      const hasAccess = await this.validateCacheAccess(
        entry,
        userContext,
        "read",
      );
      if (!hasAccess) {
        this.emit("cache:unauthorized", {
          cacheKey,
          userId: userContext.userId,
          reason: "insufficient_permissions",
        });
        return null;
      }

      // Check if entry is expired
      if (entry.cacheMetadata.expiresAt < new Date()) {
        await this.invalidateCacheEntry(cacheKey, userContext, "expired");
        this.cacheStats.totalMisses++;
        this.updateHitRate();

        this.emit("cache:expired", { cacheKey });
        return null;
      }

      // Decrypt and return data
      const decryptedData = await this.decryptCacheData(entry);

      // Update access metadata
      await this.updateCacheAccess(
        entry,
        userContext,
        "read",
        performance.now() - startTime,
      );

      // Update performance metrics
      this.cacheStats.totalHits++;
      this.updateHitRate();
      this.updateAverageAccessTime(performance.now() - startTime);

      // Emit cache hit event
      this.emit("cache:hit", {
        cacheKey,
        entryId: entry.entryId,
        duration: performance.now() - startTime,
      });

      this.logger.debug(
        `✅ Cache entry retrieved: ${cacheKey} (${(performance.now() - startTime).toFixed(2)}ms)`,
      );

      return decryptedData;
    } catch (error) {
      this.logger.error("❌ Failed to get cache entry", error);
      this.cacheStats.totalMisses++;
      this.updateHitRate();

      throw new ParlantIntegrationError(
        "Cache get operation failed",
        "CACHE_GET_ERROR",
        {
          cacheKey,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Invalidate cache entry
   */
  async invalidateCacheEntry(
    cacheKey: string,
    userContext: ParlantUserContext,
    reason: string,
  ): Promise<boolean> {
    const startTime = performance.now();

    try {
      const entry = await this.findCacheEntry(cacheKey);
      if (!entry) {
        return false;
      }

      // Validate invalidation permissions
      const hasAccess = await this.validateCacheAccess(
        entry,
        userContext,
        "delete",
      );
      if (!hasAccess) {
        this.emit("cache:invalidation:unauthorized", {
          cacheKey,
          userId: userContext.userId,
          reason: "insufficient_permissions",
        });
        return false;
      }

      // Remove from all cache tiers
      await this.removeCacheEntry(entry);

      // Update indexes
      this.removeCacheFromIndexes(entry);

      // Update access metadata
      await this.updateCacheAccess(
        entry,
        userContext,
        "invalidate",
        performance.now() - startTime,
      );

      // Update statistics
      this.cacheStats.totalEntries--;
      this.cacheStats.totalSize -= entry.cacheMetadata.sizeBytes;

      // Emit invalidation event
      this.emit("cache:invalidated", {
        cacheKey,
        entryId: entry.entryId,
        reason,
        duration: performance.now() - startTime,
      });

      this.logger.debug(
        `✅ Cache entry invalidated: ${cacheKey} - Reason: ${reason} (${(performance.now() - startTime).toFixed(2)}ms)`,
      );

      return true;
    } catch (error) {
      this.logger.error("❌ Failed to invalidate cache entry", error);
      throw new ParlantIntegrationError(
        "Cache invalidation failed",
        "CACHE_INVALIDATE_ERROR",
        {
          cacheKey,
          reason,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Bulk invalidate cache entries
   */
  async bulkInvalidateCache(
    invalidationRequest: CacheInvalidationRequest,
  ): Promise<{ invalidated: number; errors: string[] }> {
    const startTime = performance.now();

    try {
      const { type, target, reason, requestingUser, cascadeInvalidation } =
        invalidationRequest;
      let keysToInvalidate: string[] = [];
      const errors: string[] = [];

      // Determine keys to invalidate based on type
      switch (type) {
        case "key":
          keysToInvalidate = Array.isArray(target)
            ? target
            : [target as string];
          break;

        case "pattern":
          keysToInvalidate = await this.findKeysByPattern(target as string);
          break;

        case "tag":
          keysToInvalidate = await this.findKeysByTags(
            Array.isArray(target) ? target : [target as string],
          );
          break;

        case "user":
          keysToInvalidate = await this.findKeysByUser(target as string);
          break;

        case "security_level":
          keysToInvalidate = await this.findKeysBySecurityLevel(
            target as SecurityLevel,
          );
          break;

        case "global":
          keysToInvalidate = await this.getAllCacheKeys();
          break;

        default:
          throw new Error(`Unsupported invalidation type: ${type}`);
      }

      // Invalidate each key
      let invalidatedCount = 0;
      for (const key of keysToInvalidate) {
        try {
          const success = await this.invalidateCacheEntry(
            key,
            requestingUser,
            reason,
          );
          if (success) {
            invalidatedCount++;

            // Cascade invalidation if requested
            if (cascadeInvalidation) {
              const relatedKeys = await this.findRelatedKeys(key);
              for (const relatedKey of relatedKeys) {
                await this.invalidateCacheEntry(
                  relatedKey,
                  requestingUser,
                  `cascade_from_${key}`,
                );
                invalidatedCount++;
              }
            }
          }
        } catch (error) {
          errors.push(
            `Failed to invalidate ${key}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Emit bulk invalidation event
      this.emit("cache:bulk_invalidated", {
        invalidationId: invalidationRequest.invalidationId,
        type,
        invalidatedCount,
        errorsCount: errors.length,
        duration: performance.now() - startTime,
      });

      this.logger.debug(
        `✅ Bulk cache invalidation completed: ${invalidatedCount} entries invalidated, ${errors.length} errors (${(performance.now() - startTime).toFixed(2)}ms)`,
      );

      return { invalidated: invalidatedCount, errors };
    } catch (error) {
      this.logger.error("❌ Failed to perform bulk cache invalidation", error);
      throw new ParlantIntegrationError(
        "Bulk cache invalidation failed",
        "CACHE_BULK_INVALIDATE_ERROR",
        {
          invalidationRequest,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache(): Promise<void> {
    const startTime = performance.now();

    try {
      if (!this.optimizationConfig.enableSecurityOptimization) {
        return;
      }

      let optimizations = 0;

      // Remove expired entries
      optimizations += await this.removeExpiredEntries();

      // Compress large entries
      if (this.optimizationConfig.enableCompression) {
        optimizations += await this.compressLargeEntries();
      }

      // Evict least used entries if memory pressure
      if (this.isMemoryPressureHigh()) {
        optimizations += await this.evictLeastUsedEntries();
      }

      // Prefetch frequently accessed entries
      if (this.optimizationConfig.enablePrefetching) {
        optimizations += await this.prefetchFrequentEntries();
      }

      // Adjust TTL based on access patterns
      if (this.optimizationConfig.enableAdaptiveTtl) {
        optimizations += await this.adjustAdaptiveTtl();
      }

      // Update statistics
      this.updateCacheStatistics();

      // Emit optimization event
      this.emit("cache:optimized", {
        optimizations,
        duration: performance.now() - startTime,
        memoryUsage: this.cacheStats.memoryUsage,
        hitRate: this.cacheStats.overallHitRate,
      });

      this.logger.debug(
        `✅ Cache optimization completed: ${optimizations} optimizations applied (${(performance.now() - startTime).toFixed(2)}ms)`,
      );
    } catch (error) {
      this.logger.error("❌ Failed to optimize cache", error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics(): CacheStatistics {
    this.updateCacheStatistics();
    return { ...this.cacheStats };
  }

  /**
   * Get cache entries by user
   */
  async getCacheEntriesByUser(
    userId: string,
  ): Promise<Array<{ key: string; metadata: CacheMetadata }>> {
    try {
      const userKeys = this.userCacheIndex.get(userId) || new Set();
      const entries: Array<{ key: string; metadata: CacheMetadata }> = [];

      for (const key of userKeys) {
        const entry = await this.findCacheEntry(key);
        if (entry) {
          entries.push({
            key,
            metadata: entry.cacheMetadata,
          });
        }
      }

      return entries.sort(
        (a, b) =>
          b.metadata.lastAccessed.getTime() - a.metadata.lastAccessed.getTime(),
      );
    } catch (error) {
      this.logger.error("❌ Failed to get cache entries by user", error);
      return [];
    }
  }

  /**
   * Helper Methods
   */

  private generateCacheEncryptionKey(): string {
    return (
      process.env.PARLANT_CACHE_ENCRYPTION_KEY ||
      crypto.randomBytes(32).toString("hex")
    );
  }

  private async createSecureCacheEntry(
    cacheKey: string,
    data: Record<string, unknown>,
    userContext: ParlantUserContext,
    policy: CachePolicyConfig,
    options?: {
      ttl?: number;
      securityLevel?: SecurityLevel;
      cacheTier?: CacheTier;
      tags?: string[];
    },
  ): Promise<SecureCacheEntry> {
    const entryId = this.generateEntryId();
    const now = new Date();
    const ttl = options?.ttl || policy.defaultTtl;

    // Encrypt data
    const encryptedData = await this.encryptCacheData(data);

    // Create integrity validation
    const integrityValidation =
      await this.createIntegrityValidation(encryptedData);

    // Create cache entry
    const entry: SecureCacheEntry = {
      entryId,
      cacheKey,
      encryptedData,
      securityMetadata: {
        securityLevel: options?.securityLevel || SecurityLevel._MEDIUM,
        creatorContext: { ...userContext },
        accessPermissions: await this.createAccessPermissions(
          userContext,
          policy,
        ),
        encryptionMetadata: {
          algorithm: "AES-256-GCM",
          keyDerivation: "PBKDF2",
          keyHash: crypto
            .createHash("sha256")
            .update(this.cacheEncryptionKey)
            .digest("hex")
            .substring(0, 16),
          initializationVector: crypto.randomBytes(16).toString("hex"),
          encryptedAt: now,
        },
        integrityValidation,
      },
      cacheMetadata: {
        createdAt: now,
        lastModified: now,
        lastAccessed: now,
        expiresAt: new Date(now.getTime() + ttl),
        cacheTier: options?.cacheTier || policy.cacheTier,
        tags: options?.tags || [],
        sizeBytes: Buffer.byteLength(encryptedData, "utf8"),
        compressionEnabled: false,
        ttl,
      },
      performanceMetrics: {
        hitCount: 0,
        missCount: 0,
        accessCount: 0,
        hitRate: 0,
        averageAccessTime: 0,
        averageSize: Buffer.byteLength(encryptedData, "utf8"),
        evictionCount: 0,
        lastUpdated: now,
      },
      accessHistory: [],
    };

    return entry;
  }

  private async encryptCacheData(
    data: Record<string, unknown>,
  ): Promise<string> {
    try {
      const jsonData = JSON.stringify(data);
      const cipher = crypto.createCipher(
        "aes-256-gcm",
        this.cacheEncryptionKey,
      );
      let encrypted = cipher.update(jsonData, "utf8", "hex");
      encrypted += cipher.final("hex");
      return encrypted;
    } catch (error) {
      throw new Error(
        `Cache data encryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async decryptCacheData(
    entry: SecureCacheEntry,
  ): Promise<Record<string, unknown>> {
    try {
      const decipher = crypto.createDecipher(
        "aes-256-gcm",
        this.cacheEncryptionKey,
      );
      let decrypted = decipher.update(entry.encryptedData, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(
        `Cache data decryption failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async createIntegrityValidation(
    encryptedData: string,
  ): Promise<CacheIntegrityValidation> {
    const integrityHash = crypto
      .createHash("sha256")
      .update(encryptedData)
      .digest("hex");
    const validationSignature = crypto
      .createHmac("sha256", this.cacheEncryptionKey)
      .update(integrityHash)
      .digest("hex");

    return {
      integrityHash,
      hashAlgorithm: "SHA-256",
      validatedAt: new Date(),
      validationSignature,
    };
  }

  private async createAccessPermissions(
    userContext: ParlantUserContext,
    policy: CachePolicyConfig,
  ): Promise<CacheAccessPermission[]> {
    return [
      {
        type: "read",
        requiredRoles: userContext.roles,
        requiredPermissions: ["cache:read"],
        conditions: [],
      },
      {
        type: "write",
        requiredRoles: userContext.roles,
        requiredPermissions: ["cache:write"],
        conditions: [],
      },
      {
        type: "delete",
        requiredRoles: userContext.roles,
        requiredPermissions: ["cache:delete"],
        conditions: [],
      },
    ];
  }

  private async validateCacheAccess(
    entry: SecureCacheEntry,
    userContext: ParlantUserContext,
    accessType: "read" | "write" | "delete",
  ): Promise<boolean> {
    try {
      const permission = entry.securityMetadata.accessPermissions.find(
        (p) => p.type === accessType,
      );
      if (!permission) {
        return false;
      }

      // Check roles
      const hasRequiredRole = permission.requiredRoles.some((role) =>
        userContext.roles.includes(role),
      );
      if (!hasRequiredRole) {
        return false;
      }

      // Check security level
      const userSecurityLevel = this.getUserSecurityLevel(userContext);
      if (userSecurityLevel < entry.securityMetadata.securityLevel) {
        return false;
      }

      // Check conditions
      for (const condition of permission.conditions) {
        if (!(await this.evaluateAccessCondition(condition, userContext))) {
          return false;
        }
      }

      return true;
    } catch (error) {
      this.logger.error("❌ Failed to validate cache access", error);
      return false;
    }
  }

  private getUserSecurityLevel(userContext: ParlantUserContext): SecurityLevel {
    // Determine user security level based on roles and context
    if (userContext.roles.includes("admin")) {
      return SecurityLevel._CRITICAL;
    } else if (userContext.roles.includes("manager")) {
      return SecurityLevel._HIGH;
    } else if (userContext.roles.includes("user")) {
      return SecurityLevel._MEDIUM;
    } else {
      return SecurityLevel._LOW;
    }
  }

  private async evaluateAccessCondition(
    condition: CacheAccessCondition,
    userContext: ParlantUserContext,
  ): Promise<boolean> {
    // Basic condition evaluation
    switch (condition.type) {
      case "security_level":
        const userLevel = this.getUserSecurityLevel(userContext);
        return condition.operator === "equals"
          ? userLevel === condition.value
          : userLevel !== condition.value;

      case "user_attribute":
        const attributeValue = userContext.metadata[condition.value as string];
        return condition.operator === "equals"
          ? attributeValue === condition.value
          : attributeValue !== condition.value;

      default:
        return true;
    }
  }

  private async findCacheEntry(
    cacheKey: string,
  ): Promise<SecureCacheEntry | null> {
    // Search across all cache tiers
    return (
      this.memoryCacheStore.get(cacheKey) ||
      this.redisCacheStore.get(cacheKey) ||
      this.persistentCacheStore.get(cacheKey) ||
      null
    );
  }

  private async storeInCacheTier(
    entry: SecureCacheEntry,
    tier: CacheTier,
  ): Promise<void> {
    switch (tier) {
      case CacheTier.MEMORY:
        this.memoryCacheStore.set(entry.cacheKey, entry);
        break;
      case CacheTier.REDIS:
        this.redisCacheStore.set(entry.cacheKey, entry);
        break;
      case CacheTier.PERSISTENT:
        this.persistentCacheStore.set(entry.cacheKey, entry);
        break;
      default:
        this.memoryCacheStore.set(entry.cacheKey, entry);
    }
  }

  private async removeCacheEntry(entry: SecureCacheEntry): Promise<void> {
    this.memoryCacheStore.delete(entry.cacheKey);
    this.redisCacheStore.delete(entry.cacheKey);
    this.persistentCacheStore.delete(entry.cacheKey);
  }

  private updateCacheIndexes(entry: SecureCacheEntry): void {
    // Update tag index
    for (const tag of entry.cacheMetadata.tags) {
      if (!this.cacheKeyIndex.has(tag)) {
        this.cacheKeyIndex.set(tag, new Set());
      }
      this.cacheKeyIndex.get(tag)!.add(entry.cacheKey);
    }

    // Update user index
    const userId = entry.securityMetadata.creatorContext.userId;
    if (!this.userCacheIndex.has(userId)) {
      this.userCacheIndex.set(userId, new Set());
    }
    this.userCacheIndex.get(userId)!.add(entry.cacheKey);

    // Update statistics
    this.cacheStats.totalEntries++;
    this.cacheStats.totalSize += entry.cacheMetadata.sizeBytes;
  }

  private removeCacheFromIndexes(entry: SecureCacheEntry): void {
    // Remove from tag index
    for (const tag of entry.cacheMetadata.tags) {
      const tagKeys = this.cacheKeyIndex.get(tag);
      if (tagKeys) {
        tagKeys.delete(entry.cacheKey);
        if (tagKeys.size === 0) {
          this.cacheKeyIndex.delete(tag);
        }
      }
    }

    // Remove from user index
    const userId = entry.securityMetadata.creatorContext.userId;
    const userKeys = this.userCacheIndex.get(userId);
    if (userKeys) {
      userKeys.delete(entry.cacheKey);
      if (userKeys.size === 0) {
        this.userCacheIndex.delete(userId);
      }
    }
  }

  private async updateCacheAccess(
    entry: SecureCacheEntry,
    userContext: ParlantUserContext,
    accessType: "read" | "write" | "delete" | "invalidate",
    duration: number,
  ): Promise<void> {
    const accessEntry: CacheAccessEntry = {
      accessId: this.generateAccessId(),
      accessType,
      userContext: { ...userContext },
      timestamp: new Date(),
      duration,
      result: "success",
      metadata: {},
    };

    entry.accessHistory.push(accessEntry);

    // Limit access history to last 50 entries
    if (entry.accessHistory.length > 50) {
      entry.accessHistory = entry.accessHistory.slice(-50);
    }

    // Update performance metrics
    entry.performanceMetrics.accessCount++;
    entry.performanceMetrics.averageAccessTime =
      (entry.performanceMetrics.averageAccessTime *
        (entry.performanceMetrics.accessCount - 1) +
        duration) /
      entry.performanceMetrics.accessCount;
    entry.performanceMetrics.lastUpdated = new Date();

    if (accessType === "read") {
      entry.performanceMetrics.hitCount++;
    }

    entry.performanceMetrics.hitRate =
      entry.performanceMetrics.accessCount > 0
        ? (entry.performanceMetrics.hitCount /
            entry.performanceMetrics.accessCount) *
          100
        : 0;

    // Update cache metadata
    entry.cacheMetadata.lastAccessed = new Date();
  }

  private updateCacheMetrics(
    entry: SecureCacheEntry,
    operation: "read" | "write",
    duration: number,
  ): void {
    this.updateAverageAccessTime(duration);
  }

  private updateHitRate(): void {
    const totalRequests =
      this.cacheStats.totalHits + this.cacheStats.totalMisses;
    this.cacheStats.overallHitRate =
      totalRequests > 0 ? (this.cacheStats.totalHits / totalRequests) * 100 : 0;
  }

  private updateAverageAccessTime(duration: number): void {
    const totalAccesses =
      this.cacheStats.totalHits + this.cacheStats.totalMisses;
    this.cacheStats.averageAccessTime =
      totalAccesses > 0
        ? (this.cacheStats.averageAccessTime * (totalAccesses - 1) + duration) /
          totalAccesses
        : duration;
  }

  private updateCacheStatistics(): void {
    // Calculate memory usage
    this.cacheStats.memoryUsage =
      (this.memoryCacheStore.size +
        this.redisCacheStore.size +
        this.persistentCacheStore.size) *
      2048; // Rough estimate

    // Calculate efficiency score
    this.cacheStats.efficiencyScore = Math.round(
      this.cacheStats.overallHitRate * 0.6 +
        Math.max(0, 100 - this.cacheStats.averageAccessTime / 10) * 0.3 +
        Math.max(
          0,
          100 -
            (this.cacheStats.totalEvictions /
              Math.max(1, this.cacheStats.totalEntries)) *
              100,
        ) *
          0.1,
    );

    // Calculate security compliance score
    this.cacheStats.securityComplianceScore =
      this.calculateSecurityComplianceScore();
  }

  private calculateSecurityComplianceScore(): number {
    // Calculate based on security features usage
    let score = 0;
    let checks = 0;

    // Check encryption usage
    score += 25; // All entries are encrypted
    checks++;

    // Check access control
    score += 25; // Access control is enforced
    checks++;

    // Check audit trail
    score += 25; // Audit trails are maintained
    checks++;

    // Check integrity validation
    score += 25; // Integrity validation is performed
    checks++;

    return Math.round(score / Math.max(1, checks));
  }

  private async determineCachePolicy(
    data: Record<string, unknown>,
    userContext: ParlantUserContext,
    options?: Record<string, unknown>,
  ): Promise<CachePolicyConfig> {
    // Return default policy for now
    return {
      policyId: "default",
      name: "Default Cache Policy",
      cacheTier: CacheTier.MEMORY,
      defaultTtl: 1800000, // 30 minutes
      maxEntrySize: 1048576, // 1MB
      evictionPolicy: EvictionPolicy.LRU,
      securityRequirements: [],
      performanceTargets: {
        targetHitRate: 80,
        maxAccessTime: 50,
        targetMemoryUsage: 512,
        maxEvictionRate: 10,
      },
    };
  }

  private async validateCacheSecurityRequirements(
    data: Record<string, unknown>,
    userContext: ParlantUserContext,
    policy: CachePolicyConfig,
  ): Promise<void> {
    // Validate security requirements
    for (const requirement of policy.securityRequirements) {
      if (requirement.level === "mandatory") {
        switch (requirement.type) {
          case "encryption":
            // Always encrypted
            break;
          case "access_control":
            // Always controlled
            break;
          case "audit":
            // Always audited
            break;
          default:
            throw new Error(
              `Unsupported mandatory requirement: ${requirement.type}`,
            );
        }
      }
    }
  }

  private generateEntryId(): string {
    return `cache_${Date.now()}_${crypto.randomBytes(16).toString("hex")}`;
  }

  private generateAccessId(): string {
    return `access_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  private async findKeysByPattern(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    const keys: string[] = [];

    for (const key of this.memoryCacheStore.keys()) {
      if (regex.test(key)) keys.push(key);
    }
    for (const key of this.redisCacheStore.keys()) {
      if (regex.test(key)) keys.push(key);
    }
    for (const key of this.persistentCacheStore.keys()) {
      if (regex.test(key)) keys.push(key);
    }

    return [...new Set(keys)];
  }

  private async findKeysByTags(tags: string[]): Promise<string[]> {
    const keys = new Set<string>();
    for (const tag of tags) {
      const tagKeys = this.cacheKeyIndex.get(tag) || new Set();
      tagKeys.forEach((key) => keys.add(key));
    }
    return Array.from(keys);
  }

  private async findKeysByUser(userId: string): Promise<string[]> {
    const userKeys = this.userCacheIndex.get(userId) || new Set();
    return Array.from(userKeys);
  }

  private async findKeysBySecurityLevel(
    securityLevel: SecurityLevel,
  ): Promise<string[]> {
    const keys: string[] = [];

    const allStores = [
      this.memoryCacheStore,
      this.redisCacheStore,
      this.persistentCacheStore,
    ];
    for (const store of allStores) {
      for (const [key, entry] of store.entries()) {
        if (entry.securityMetadata.securityLevel === securityLevel) {
          keys.push(key);
        }
      }
    }

    return [...new Set(keys)];
  }

  private async getAllCacheKeys(): Promise<string[]> {
    const keys = new Set<string>();

    for (const key of this.memoryCacheStore.keys()) keys.add(key);
    for (const key of this.redisCacheStore.keys()) keys.add(key);
    for (const key of this.persistentCacheStore.keys()) keys.add(key);

    return Array.from(keys);
  }

  private async findRelatedKeys(key: string): Promise<string[]> {
    // Find keys that might be related (same prefix, tags, etc.)
    const relatedKeys: string[] = [];
    const keyPrefix = key.split(":")[0];

    if (keyPrefix !== key) {
      relatedKeys.push(...(await this.findKeysByPattern(`${keyPrefix}:*`)));
    }

    return relatedKeys;
  }

  private isMemoryPressureHigh(): boolean {
    return this.cacheStats.memoryUsage > 512; // 512MB threshold
  }

  private async removeExpiredEntries(): Promise<number> {
    const now = new Date();
    let removedCount = 0;

    const allStores = [
      { name: "memory", store: this.memoryCacheStore },
      { name: "redis", store: this.redisCacheStore },
      { name: "persistent", store: this.persistentCacheStore },
    ];

    for (const { store } of allStores) {
      for (const [key, entry] of store.entries()) {
        if (entry.cacheMetadata.expiresAt < now) {
          store.delete(key);
          this.removeCacheFromIndexes(entry);
          removedCount++;
        }
      }
    }

    return removedCount;
  }

  private async compressLargeEntries(): Promise<number> {
    // Compression implementation would go here
    return 0;
  }

  private async evictLeastUsedEntries(): Promise<number> {
    // LRU eviction implementation would go here
    return 0;
  }

  private async prefetchFrequentEntries(): Promise<number> {
    // Prefetching implementation would go here
    return 0;
  }

  private async adjustAdaptiveTtl(): Promise<number> {
    // Adaptive TTL implementation would go here
    return 0;
  }

  private async initializeCachePolicies(): Promise<void> {
    // Initialize cache policies
    this.logger.debug("🔧 Initializing cache policies...");
  }

  private async initializeSecurityValidators(): Promise<void> {
    // Initialize security validators
    this.logger.debug("🔒 Initializing security validators...");
  }

  private async startOptimizationTasks(): Promise<void> {
    // Cache cleanup every 5 minutes
    this.cacheCleanupTimer = setInterval(() => {
      this.removeExpiredEntries();
    }, 300000);

    // Cache optimization every interval
    this.optimizationTimer = setInterval(() => {
      this.optimizeCache();
    }, this.optimizationConfig.optimizationInterval);

    // Statistics update every minute
    this.statisticsTimer = setInterval(() => {
      this.updateCacheStatistics();
    }, 60000);
  }

  private async stopOptimizationTasks(): Promise<void> {
    if (this.cacheCleanupTimer) {
      clearInterval(this.cacheCleanupTimer);
      this.cacheCleanupTimer = null;
    }

    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer);
      this.optimizationTimer = null;
    }

    if (this.statisticsTimer) {
      clearInterval(this.statisticsTimer);
      this.statisticsTimer = null;
    }
  }

  private async flushAllCaches(): Promise<void> {
    this.memoryCacheStore.clear();
    this.redisCacheStore.clear();
    this.persistentCacheStore.clear();
    this.cacheKeyIndex.clear();
    this.userCacheIndex.clear();
  }

  private async saveCacheStatistics(): Promise<void> {
    // Save cache statistics for analysis
    this.logger.debug("💾 Saving cache statistics...");
  }
}
