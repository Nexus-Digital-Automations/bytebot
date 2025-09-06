/**
 * Validation Cache Service
 *
 * High-performance caching system for validation results to optimize
 * repeated validation operations across all Bytebot services.
 *
 * @fileoverview Validation result caching service
 * @version 1.0.0
 * @author Enterprise Security Validation Team
 */

import { Injectable, Logger } from "@nestjs/common";
import { ArgumentMetadata } from "@nestjs/common";
import { ValidationCacheEntry } from "./types";
import { hashData } from "../../utils/security.utils";

/**
 * Validation Cache Service
 * Handles caching of validation results for performance optimization
 */
@Injectable()
export class ValidationCacheService {
  private readonly logger = new Logger(ValidationCacheService.name);
  private readonly cache = new Map<string, ValidationCacheEntry>();
  private cachingEnabled = true;

  /**
   * Check if caching is enabled
   * @returns True if caching is enabled
   */
  isCachingEnabled(): boolean {
    return this.cachingEnabled;
  }

  /**
   * Get cached validation result
   * @param value Input value
   * @param metadata Argument metadata
   * @returns Cached validation result or null
   */
  async getCachedValidation(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<unknown | null> {
    if (!this.cachingEnabled) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(value, metadata);
      const cacheEntry = this.cache.get(cacheKey);

      if (cacheEntry && cacheEntry.expiresAt > new Date()) {
        // Update access count
        cacheEntry.accessCount++;

        this.logger.debug(`Cache hit for key: ${cacheKey}`);
        return cacheEntry.validationResult;
      }

      // Remove expired entry
      if (cacheEntry) {
        this.cache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      this.logger.warn("Failed to retrieve cached validation result", {
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Cache validation result
   * @param value Input value
   * @param metadata Argument metadata
   * @param result Validation result
   */
  async cacheValidationResult(
    value: unknown,
    metadata: ArgumentMetadata,
    result: unknown,
  ): Promise<void> {
    if (!this.cachingEnabled) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(value, metadata);
      const inputHash = hashData(JSON.stringify(value));
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      const cacheEntry: ValidationCacheEntry = {
        cacheKey,
        inputHash,
        validationResult: result,
        createdAt: now,
        expiresAt,
        accessCount: 0,
        serviceType: "shared" as const,
        securityLevel: "standard" as const,
      };

      this.cache.set(cacheKey, cacheEntry);

      this.logger.debug(`Cached validation result for key: ${cacheKey}`);
    } catch (error) {
      this.logger.warn("Failed to cache validation result", {
        error: (error as Error).message,
      });
    }
  }

  /**
   * Generate cache key for input and metadata
   * @param value Input value
   * @param metadata Argument metadata
   * @returns Cache key
   */
  private generateCacheKey(value: unknown, metadata: ArgumentMetadata): string {
    const valueHash = hashData(JSON.stringify(value));
    const metadataHash = hashData(
      JSON.stringify({
        type: metadata.type,
        metatype: metadata.metatype?.name,
      }),
    );

    return `validation:${valueHash}:${metadataHash}`;
  }
}

export default ValidationCacheService;
