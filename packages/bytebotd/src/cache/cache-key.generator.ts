/**
 * Cache Key Generator - Intelligent Cache Key Management
 *
 * Provides systematic cache key generation with namespace support,
 * collision prevention, and performance optimization. Ensures
 * consistent key naming across the application.
 *
 * Features:
 * - Hierarchical key generation with namespacing
 * - Hash-based key normalization for long keys
 * - Collision detection and prevention
 * - Key validation and sanitization
 * - Performance metrics integration
 * - Support for complex object-based keys
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 1.0.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';

/**
 * Cache key generation options
 */
interface KeyGenerationOptions {
  namespace?: string;
  version?: string;
  includeTimestamp?: boolean;
  maxLength?: number;
  hashLongKeys?: boolean;
}

/**
 * Cache key metadata for tracking and debugging
 */
interface KeyMetadata {
  originalKey: string;
  generatedKey: string;
  namespace?: string;
  version?: string;
  hashedKey: boolean;
  timestamp?: number;
}

/**
 * Cache key statistics for monitoring
 */
interface KeyStats {
  totalGenerated: number;
  hashedKeys: number;
  namespaceUsage: Map<string, number>;
  avgKeyLength: number;
}

/**
 * Cache key generator service
 */
@Injectable()
export class CacheKeyGenerator {
  private readonly logger = new Logger(CacheKeyGenerator.name);
  private readonly keyRegistry = new Map<string, KeyMetadata>();
  private readonly stats: KeyStats = {
    totalGenerated: 0,
    hashedKeys: 0,
    namespaceUsage: new Map(),
    avgKeyLength: 0,
  };

  // Configuration constants
  private readonly DEFAULT_NAMESPACE = 'bytebot';
  private readonly MAX_KEY_LENGTH = 250; // Redis key length limit is 512MB, but keep reasonable
  private readonly HASH_THRESHOLD = 200; // Hash keys longer than this
  private readonly KEY_SEPARATOR = ':';

  constructor() {
    this.logger.log('Cache Key Generator initialized');
    this.logger.log(
      `Max key length: ${this.MAX_KEY_LENGTH}, Hash threshold: ${this.HASH_THRESHOLD}`,
    );
  }

  /**
   * Generate cache key with intelligent normalization
   *
   * @param key Base key or key components
   * @param namespace Optional namespace
   * @param options Additional key generation options
   * @returns string Generated cache key
   */
  generate(
    key: string | string[] | Record<string, any>,
    namespace?: string,
    options: KeyGenerationOptions = {},
  ): string {
    const operationId = `keygen_${Date.now()}`;

    try {
      // Normalize the input key
      const normalizedKey = this.normalizeKey(key);

      // Build key components
      const keyComponents: string[] = [];

      // Add namespace
      const keyNamespace =
        namespace || options.namespace || this.DEFAULT_NAMESPACE;
      keyComponents.push(keyNamespace);

      // Add version if specified
      if (options.version) {
        keyComponents.push(`v${options.version}`);
      }

      // Add main key
      keyComponents.push(normalizedKey);

      // Add timestamp if requested
      if (options.includeTimestamp) {
        keyComponents.push(Date.now().toString());
      }

      // Join components
      let fullKey = keyComponents.join(this.KEY_SEPARATOR);

      // Handle long keys
      const shouldHash =
        options.hashLongKeys !== false &&
        fullKey.length > (options.maxLength || this.HASH_THRESHOLD);

      if (shouldHash) {
        fullKey = this.hashKey(fullKey, keyNamespace);
        this.stats.hashedKeys++;
      }

      // Validate final key
      this.validateKey(fullKey);

      // Record metadata
      const metadata: KeyMetadata = {
        originalKey: this.keyToString(key),
        generatedKey: fullKey,
        namespace: keyNamespace,
        version: options.version,
        hashedKey: shouldHash,
        timestamp: options.includeTimestamp ? Date.now() : undefined,
      };

      this.keyRegistry.set(fullKey, metadata);
      this.updateStats(keyNamespace, fullKey.length);

      this.logger.debug(
        `[${operationId}] Generated key: ${fullKey} (original: ${metadata.originalKey})`,
      );

      return fullKey;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `[${operationId}] Key generation failed: ${errorMessage}`,
      );

      // Fallback to simple key generation
      const fallbackKey = `${namespace || this.DEFAULT_NAMESPACE}${this.KEY_SEPARATOR}${this.keyToString(key)}`;
      this.logger.warn(`Using fallback key: ${fallbackKey}`);
      return fallbackKey;
    }
  }

  /**
   * Generate key for API response caching
   *
   * @param method HTTP method
   * @param path Request path
   * @param queryParams Query parameters
   * @param userId Optional user ID for user-specific caching
   * @returns string Generated API cache key
   */
  generateApiKey(
    method: string,
    path: string,
    queryParams?: Record<string, any>,
    userId?: string,
  ): string {
    const keyParts = [
      'api',
      method.toLowerCase(),
      path.replace(/\//g, '_').replace(/^_/, ''),
    ];

    if (queryParams && Object.keys(queryParams).length > 0) {
      // Sort query params for consistent key generation
      const sortedParams = Object.keys(queryParams)
        .sort()
        .reduce(
          (result, key) => {
            result[key] = queryParams[key];
            return result;
          },
          {} as Record<string, any>,
        );

      keyParts.push(this.hashObject(sortedParams));
    }

    if (userId) {
      keyParts.push(`user_${userId}`);
    }

    return this.generate(keyParts, 'api');
  }

  /**
   * Generate key for database query caching
   *
   * @param table Database table name
   * @param operation Database operation
   * @param params Query parameters
   * @returns string Generated database cache key
   */
  generateDbKey(
    table: string,
    operation: string,
    params?: Record<string, any>,
  ): string {
    const keyParts = ['db', table, operation];

    if (params && Object.keys(params).length > 0) {
      keyParts.push(this.hashObject(params));
    }

    return this.generate(keyParts, 'database');
  }

  /**
   * Generate key for task-related caching
   *
   * @param taskId Task identifier
   * @param operation Task operation
   * @param additionalParams Additional parameters
   * @returns string Generated task cache key
   */
  generateTaskKey(
    taskId: string,
    operation: string,
    additionalParams?: Record<string, any>,
  ): string {
    const keyParts = ['task', taskId, operation];

    if (additionalParams && Object.keys(additionalParams).length > 0) {
      keyParts.push(this.hashObject(additionalParams));
    }

    return this.generate(keyParts, 'tasks');
  }

  /**
   * Generate pattern for cache invalidation
   *
   * @param namespace Namespace to invalidate
   * @param pattern Optional pattern within namespace
   * @returns string Invalidation pattern
   */
  generateInvalidationPattern(namespace: string, pattern?: string): string {
    let invalidationPattern = `${namespace}${this.KEY_SEPARATOR}*`;

    if (pattern) {
      invalidationPattern = `${namespace}${this.KEY_SEPARATOR}${pattern}*`;
    }

    this.logger.debug(`Generated invalidation pattern: ${invalidationPattern}`);
    return invalidationPattern;
  }

  /**
   * Get key metadata
   *
   * @param key Cache key
   * @returns KeyMetadata | undefined Key metadata if found
   */
  getKeyMetadata(key: string): KeyMetadata | undefined {
    return this.keyRegistry.get(key);
  }

  /**
   * Get key generation statistics
   *
   * @returns KeyStats Current key generation statistics
   */
  getStats(): KeyStats {
    return {
      totalGenerated: this.stats.totalGenerated,
      hashedKeys: this.stats.hashedKeys,
      namespaceUsage: new Map(this.stats.namespaceUsage),
      avgKeyLength: this.stats.avgKeyLength,
    };
  }

  /**
   * Clear key generation statistics
   */
  clearStats(): void {
    this.stats.totalGenerated = 0;
    this.stats.hashedKeys = 0;
    this.stats.namespaceUsage.clear();
    this.stats.avgKeyLength = 0;
    this.keyRegistry.clear();

    this.logger.log('Cache key statistics cleared');
  }

  /**
   * Normalize key input to string
   */
  private normalizeKey(key: string | string[] | Record<string, any>): string {
    if (typeof key === 'string') {
      return this.sanitizeKey(key);
    }

    if (Array.isArray(key)) {
      return key.map((k) => this.sanitizeKey(k)).join(this.KEY_SEPARATOR);
    }

    if (typeof key === 'object' && key !== null) {
      return this.hashObject(key);
    }

    return this.sanitizeKey(String(key));
  }

  /**
   * Sanitize individual key component
   */
  private sanitizeKey(key: string): string {
    return key
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_') // Replace invalid characters
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase();
  }

  /**
   * Hash long keys for performance and storage efficiency
   */
  private hashKey(key: string, namespace: string): string {
    const hash = createHash('sha256')
      .update(key)
      .digest('hex')
      .substring(0, 16);
    return `${namespace}${this.KEY_SEPARATOR}hash_${hash}`;
  }

  /**
   * Hash object to consistent string representation
   */
  private hashObject(obj: Record<string, any>): string {
    // Sort keys for consistent hashing
    const sortedObj = Object.keys(obj)
      .sort()
      .reduce(
        (result, key) => {
          result[key] = obj[key];
          return result;
        },
        {} as Record<string, any>,
      );

    const objString = JSON.stringify(sortedObj);
    return createHash('md5').update(objString).digest('hex').substring(0, 12);
  }

  /**
   * Convert key input to string for logging
   */
  private keyToString(key: string | string[] | Record<string, any>): string {
    if (typeof key === 'string') {
      return key;
    }

    if (Array.isArray(key)) {
      return key.join(', ');
    }

    return JSON.stringify(key);
  }

  /**
   * Validate generated key
   */
  private validateKey(key: string): void {
    if (!key || key.length === 0) {
      throw new Error('Generated key is empty');
    }

    if (key.length > this.MAX_KEY_LENGTH) {
      throw new Error(
        `Generated key exceeds maximum length: ${key.length} > ${this.MAX_KEY_LENGTH}`,
      );
    }

    // Check for invalid characters that might cause issues
    if (/[\s\r\n\t]/.test(key)) {
      throw new Error('Generated key contains whitespace characters');
    }
  }

  /**
   * Update key generation statistics
   */
  private updateStats(namespace: string, keyLength: number): void {
    this.stats.totalGenerated++;

    // Update namespace usage
    const currentCount = this.stats.namespaceUsage.get(namespace) || 0;
    this.stats.namespaceUsage.set(namespace, currentCount + 1);

    // Update average key length
    this.stats.avgKeyLength =
      (this.stats.avgKeyLength * (this.stats.totalGenerated - 1) + keyLength) /
      this.stats.totalGenerated;
  }
}
