/**
 * Cache Interceptor
 *
 * Intelligent caching layer for API responses with TTL management,
 * cache invalidation, and performance optimization for browser automation data.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

export interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
  etag: string;
  contentType: string;
  statusCode: number;
  headers: Record<string, string>;
}

export interface CacheConfig {
  defaultTtl: number;
  maxEntries: number;
  enableEtag: boolean;
  cachableStatusCodes: number[];
  cacheableEndpoints: string[];
  uncacheableEndpoints: string[];
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly accessTimes = new Map<string, number>();

  private readonly config: CacheConfig = {
    defaultTtl: 300000, // 5 minutes
    maxEntries: 1000,
    enableEtag: true,
    cachableStatusCodes: [200, 201, 202],
    cacheableEndpoints: [
      '/health',
      '/metrics',
      '/monitoring',
      '/tasks/:id',
      '/sessions/:id',
      '/results/:id',
    ],
    uncacheableEndpoints: [
      '/tasks', // POST requests for task creation
      '/sessions', // POST requests for session creation
      '/forms/submit',
      '/extract',
    ],
  };

  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired cache entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 120000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip caching for non-GET requests (unless explicitly configured)
    if (!this.shouldCache(request)) {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(request);
    const correlationId =
      (request as { correlationId?: string }).correlationId ??
      this.generateCorrelationId();

    // Check if we have a cached response
    const cachedEntry = this.getCachedEntry(cacheKey);
    if (cachedEntry) {
      this.logger.debug(
        `Cache HIT: ${request.method} ${request.url} [${correlationId}]`,
      );

      // Handle ETag for conditional requests
      if (
        this.config.enableEtag &&
        this.handleConditionalRequest(request, response, cachedEntry)
      ) {
        return of(null); // 304 Not Modified
      }

      // Set cache headers
      this.setCacheHeaders(response, cachedEntry, true);

      // Update access time for LRU
      this.accessTimes.set(cacheKey, Date.now());

      return of(cachedEntry.data);
    }

    this.logger.debug(
      `Cache MISS: ${request.method} ${request.url} [${correlationId}]`,
    );

    return next.handle().pipe(
      tap((data) => {
        // Cache the response if conditions are met
        if (this.shouldCacheResponse(response, data)) {
          this.cacheResponse(cacheKey, data, response);
        }
      }),
    );
  }

  private shouldCache(request: Request): boolean {
    // Only cache GET and HEAD requests by default
    if (!['GET', 'HEAD'].includes(request.method)) {
      return false;
    }

    const path = this.sanitizePath(request.originalUrl || request.url);

    // Check if explicitly uncacheable
    if (
      this.config.uncacheableEndpoints.some((pattern) =>
        this.matchesPattern(path, pattern),
      )
    ) {
      return false;
    }

    // Check if explicitly cacheable
    if (
      this.config.cacheableEndpoints.some((pattern) =>
        this.matchesPattern(path, pattern),
      )
    ) {
      return true;
    }

    // Default: cache GET requests for monitoring and read-only endpoints
    return (
      path.includes('/health') ||
      path.includes('/metrics') ||
      path.includes('/monitoring') ||
      (request.method === 'GET' && !path.includes('/api/v1/browser-use/tasks'))
    );
  }

  private shouldCacheResponse(response: Response, data: unknown): boolean {
    // Don't cache error responses or empty data
    if (
      !data ||
      !this.config.cachableStatusCodes.includes(response.statusCode)
    ) {
      return false;
    }

    // Don't cache responses with certain headers
    if (
      response.getHeader('cache-control') === 'no-cache' ||
      response.getHeader('cache-control') === 'no-store'
    ) {
      return false;
    }

    return true;
  }

  private getCachedEntry(cacheKey: string): CacheEntry | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(cacheKey);
      this.accessTimes.delete(cacheKey);
      return null;
    }

    return entry;
  }

  private cacheResponse(
    cacheKey: string,
    data: unknown,
    response: Response,
  ): void {
    // Ensure we don't exceed max entries
    if (this.cache.size >= this.config.maxEntries) {
      this.evictOldestEntry();
    }

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: this.getTtlForResponse(response),
      etag: this.generateEtag(data),
      contentType:
        (response.getHeader('content-type') as string) || 'application/json',
      statusCode: response.statusCode,
      headers: this.extractCacheableHeaders(response),
    };

    this.cache.set(cacheKey, entry);
    this.accessTimes.set(cacheKey, Date.now());

    // Set cache headers on the response
    this.setCacheHeaders(response, entry, false);

    this.logger.debug(`Cached response: ${cacheKey} (TTL: ${entry.ttl}ms)`);
  }

  private generateCacheKey(request: Request): string {
    const path = this.sanitizePath(request.originalUrl || request.url);
    const method = request.method;
    const userId =
      (request as { user?: { id?: string } }).user?.id ?? 'anonymous';

    // Include relevant headers that might affect the response
    const relevantHeaders = {
      accept: request.get('accept'),
      'accept-language': request.get('accept-language'),
      'user-agent': request.get('user-agent')?.substring(0, 50), // Truncate for cache efficiency
    };

    const keyData = {
      method,
      path,
      userId,
      headers: relevantHeaders,
    };

    return `cache_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private sanitizePath(path: string): string {
    // Remove query parameters that shouldn't affect caching
    const url = new URL(path, 'http://localhost');
    const pathname = url.pathname;

    // Keep certain query parameters for cache key generation
    const relevantParams = ['page', 'limit', 'status', 'priority'];
    const searchParams = new URLSearchParams();

    relevantParams.forEach((param) => {
      const value = url.searchParams.get(param);
      if (value) {
        searchParams.set(param, value);
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Convert pattern to regex (simple implementation)
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/:[\w]+/g, '[^/]+');

    return new RegExp(`^${regexPattern}$`).test(path);
  }

  private getTtlForResponse(response: Response): number {
    // Check for Cache-Control header
    const cacheControl = response.getHeader('cache-control') as string;
    if (cacheControl) {
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
      if (maxAgeMatch) {
        return parseInt(maxAgeMatch[1]) * 1000; // Convert to milliseconds
      }
    }

    // Different TTL based on response type
    const contentType = (response.getHeader('content-type') as string) || '';

    if (contentType.includes('application/json')) {
      const statusCode = response.statusCode;
      if (statusCode === 200) {
        return this.config.defaultTtl; // 5 minutes
      } else if (statusCode === 201 || statusCode === 202) {
        return 60000; // 1 minute for newly created resources
      }
    }

    return this.config.defaultTtl;
  }

  private generateEtag(data: unknown): string {
    // Simple ETag generation based on content hash
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `"${Math.abs(hash).toString(16)}"`;
  }

  private handleConditionalRequest(
    request: Request,
    response: Response,
    cachedEntry: CacheEntry,
  ): boolean {
    const ifNoneMatch = request.get('if-none-match');

    if (ifNoneMatch && ifNoneMatch === cachedEntry.etag) {
      response.status(304).end();
      return true;
    }

    return false;
  }

  private setCacheHeaders(
    response: Response,
    entry: CacheEntry,
    isFromCache: boolean,
  ): void {
    if (this.config.enableEtag) {
      response.setHeader('ETag', entry.etag);
    }

    // Set cache status header
    response.setHeader('X-Cache-Status', isFromCache ? 'HIT' : 'MISS');

    if (isFromCache) {
      response.setHeader('X-Cache-Age', Date.now() - entry.timestamp);
    }

    // Set Cache-Control header
    const maxAge = Math.floor(
      (entry.ttl - (Date.now() - entry.timestamp)) / 1000,
    );
    if (maxAge > 0) {
      response.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    }

    // Set other cached headers
    Object.entries(entry.headers).forEach(([key, value]) => {
      if (!response.getHeader(key)) {
        response.setHeader(key, value);
      }
    });
  }

  private extractCacheableHeaders(response: Response): Record<string, string> {
    const cacheableHeaders = ['content-type', 'last-modified', 'expires'];
    const headers: Record<string, string> = {};

    cacheableHeaders.forEach((headerName) => {
      const value = response.getHeader(headerName);
      if (value) {
        headers[headerName] = String(value);
      }
    });

    return headers;
  }

  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    // Find the least recently used entry
    this.accessTimes.forEach((accessTime, key) => {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessTimes.delete(oldestKey);
      this.logger.debug(`Evicted cache entry: ${oldestKey}`);
    }
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;

    this.cache.forEach((entry, key) => {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        expiredCount++;
      }
    });

    if (expiredCount > 0) {
      this.logger.debug(`Cleaned up ${expiredCount} expired cache entries`);
    }
  }

  private generateCorrelationId(): string {
    return `cache_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Manual cache management methods for external use
   */
  public invalidateCache(pattern?: string): number {
    let invalidatedCount = 0;

    if (!pattern) {
      // Clear all cache
      invalidatedCount = this.cache.size;
      this.cache.clear();
      this.accessTimes.clear();
    } else {
      // Clear specific pattern
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach((key) => {
        this.cache.delete(key);
        this.accessTimes.delete(key);
        invalidatedCount++;
      });
    }

    this.logger.log(`Invalidated ${invalidatedCount} cache entries`);
    return invalidatedCount;
  }

  public getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());

    return {
      totalEntries: this.cache.size,
      maxEntries: this.config.maxEntries,
      utilizationPercent: Math.round(
        (this.cache.size / this.config.maxEntries) * 100,
      ),
      averageAge:
        entries.length > 0
          ? entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) /
            entries.length
          : 0,
      upcomingExpirations: entries.filter(
        (entry) => now + 60000 > entry.timestamp + entry.ttl,
      ).length,
      statusCodeDistribution: entries.reduce(
        (acc, entry) => {
          acc[entry.statusCode] = (acc[entry.statusCode] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      ),
    };
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cache.clear();
    this.accessTimes.clear();
  }
}
