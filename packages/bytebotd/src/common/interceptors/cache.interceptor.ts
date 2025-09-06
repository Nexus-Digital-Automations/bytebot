/**
 * Cache Interceptor - Intelligent API Response Caching
 *
 * Provides transparent caching for API endpoints with intelligent cache
 * strategies, conditional caching, and automatic invalidation. Designed
 * to maximize cache hit rates while maintaining data consistency.
 *
 * Features:
 * - Automatic cache key generation from request parameters
 * - Conditional caching based on response status and content
 * - TTL configuration per endpoint pattern
 * - Cache invalidation on mutations
 * - ETag and Last-Modified header support
 * - User-specific caching for personalized responses
 * - Comprehensive cache metrics and monitoring
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 1.0.0
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';
import { Request, Response } from 'express';
import { CacheService } from '../../cache/cache.service';
import { CacheKeyGenerator } from '../../cache/cache-key.generator';
import { MetricsService } from '../../metrics/metrics.service';
import { createHash } from 'crypto';

/**
 * Cache configuration for different endpoint patterns
 */
interface CacheRule {
  pattern: RegExp;
  ttl: number; // Time to live in seconds
  varyBy?: string[]; // Request headers/params to vary cache by
  includeUserId?: boolean; // Include user ID in cache key
  cacheableStatuses?: number[]; // HTTP status codes that should be cached
  skipCacheIf?: (req: Request, res: Response) => boolean; // Dynamic cache skipping
}

/**
 * Cache metadata stored with cached responses
 */
interface CacheMetadata {
  timestamp: number;
  etag?: string;
  lastModified?: string;
  userId?: string;
  ttl: number;
  url: string;
  method: string;
}

/**
 * Cached response data structure
 */
interface CachedResponse {
  data: any;
  metadata: CacheMetadata;
  headers: Record<string, string>;
}

/**
 * Cache statistics for monitoring
 */
interface CacheInterceptorStats {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheSkips: number;
  hitRate: number;
  averageResponseTime: number;
  endpointStats: Map<string, {
    hits: number;
    misses: number;
    hitRate: number;
  }>;
}

/**
 * Cache interceptor for API response caching
 */
@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);
  private readonly stats: CacheInterceptorStats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheSkips: 0,
    hitRate: 0,
    averageResponseTime: 0,
    endpointStats: new Map(),
  };

  // Default cache rules for different endpoint patterns
  private readonly cacheRules: CacheRule[] = [
    // Task data - cache for 5 minutes
    {
      pattern: /^\/api\/tasks\/[^/]+$/,
      ttl: 300,
      includeUserId: true,
      cacheableStatuses: [200],
      varyBy: ['Authorization'],
    },
    
    // Task lists - cache for 2 minutes
    {
      pattern: /^\/api\/tasks(\?.*)?$/,
      ttl: 120,
      includeUserId: true,
      cacheableStatuses: [200],
      varyBy: ['Authorization'],
      skipCacheIf: (req) => {
        // Skip cache if real-time data is requested
        return req.query.realtime === 'true';
      },
    },

    // Task messages - cache for 10 minutes
    {
      pattern: /^\/api\/tasks\/[^/]+\/messages/,
      ttl: 600,
      includeUserId: true,
      cacheableStatuses: [200],
      varyBy: ['Authorization'],
    },

    // Static data - cache for 1 hour
    {
      pattern: /^\/api\/models$/,
      ttl: 3600,
      cacheableStatuses: [200],
    },

    // Computer-use screenshots - cache for 30 seconds
    {
      pattern: /^\/computer-use$/,
      ttl: 30,
      cacheableStatuses: [200],
      skipCacheIf: (req) => {
        // Only cache screenshot requests
        return req.body?.action !== 'screenshot';
      },
    },

    // Health checks - cache for 1 minute
    {
      pattern: /^\/health/,
      ttl: 60,
      cacheableStatuses: [200],
    },
  ];

  constructor(
    private readonly cacheService: CacheService,
    private readonly keyGenerator: CacheKeyGenerator,
    private readonly metricsService?: MetricsService,
  ) {
    this.logger.log('Cache Interceptor initialized');
    this.logger.log(`Configured ${this.cacheRules.length} cache rules`);
    
    // Start periodic stats reporting
    this.startPeriodicReporting();
  }

  /**
   * Intercept HTTP requests to implement caching
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Only cache GET requests by default
    if (request.method !== 'GET') {
      // For non-GET requests, invalidate related cache entries
      this.invalidateRelatedCache(request);
      return next.handle();
    }

    const operationId = (request as any).operationId || `cache_${Date.now()}`;
    const startTime = Date.now();

    // Find applicable cache rule
    const cacheRule = this.findCacheRule(request);
    if (!cacheRule) {
      this.stats.cacheSkips++;
      this.updateStats();
      return next.handle();
    }

    // Check if caching should be skipped
    if (cacheRule.skipCacheIf?.(request, response)) {
      this.stats.cacheSkips++;
      this.updateStats();
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request, cacheRule);
    
    return this.handleCachedRequest(
      cacheKey,
      cacheRule,
      request,
      response,
      next,
      operationId,
      startTime,
    );
  }

  /**
   * Handle request with caching logic
   */
  private handleCachedRequest(
    cacheKey: string,
    cacheRule: CacheRule,
    request: Request,
    response: Response,
    next: CallHandler,
    operationId: string,
    startTime: number,
  ): Observable<any> {
    return new Observable((observer) => {
      // Try to get from cache first
      this.cacheService.get<CachedResponse>(cacheKey)
        .then((cachedResponse) => {
          if (cachedResponse && this.isCacheValid(cachedResponse, request)) {
            // Cache hit - return cached response
            this.handleCacheHit(cachedResponse, response, operationId, startTime);
            observer.next(cachedResponse.data);
            observer.complete();
          } else {
            // Cache miss - execute request and cache result
            this.handleCacheMiss(
              cacheKey,
              cacheRule,
              request,
              response,
              next,
              operationId,
              startTime,
            ).subscribe({
              next: (data) => {
                observer.next(data);
              },
              error: (error) => {
                observer.error(error);
              },
              complete: () => {
                observer.complete();
              },
            });
          }
        })
        .catch((error) => {
          // Cache error - proceed without cache
          this.logger.error(
            `[${operationId}] Cache retrieval error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          
          next.handle().subscribe({
            next: (data) => observer.next(data),
            error: (error) => observer.error(error),
            complete: () => observer.complete(),
          });
        });
    });
  }

  /**
   * Handle cache hit scenario
   */
  private handleCacheHit(
    cachedResponse: CachedResponse,
    response: Response,
    operationId: string,
    startTime: number,
  ): void {
    const duration = Date.now() - startTime;
    
    // Set cached headers
    Object.entries(cachedResponse.headers).forEach(([key, value]) => {
      response.set(key, value);
    });

    // Add cache headers
    response.set('X-Cache', 'HIT');
    response.set('X-Cache-Key', this.hashForLogging(operationId));
    
    this.stats.cacheHits++;
    this.recordEndpointStats(cachedResponse.metadata.url, 'hit');
    
    this.logger.debug(
      `[${operationId}] Cache HIT: ${cachedResponse.metadata.url} (${duration}ms)`,
      {
        cacheAge: Date.now() - cachedResponse.metadata.timestamp,
        ttl: cachedResponse.metadata.ttl,
      },
    );

    // Record metrics
    if (this.metricsService) {
      this.metricsService.recordCacheOperation?.('get', 'hit', duration);
    }

    this.updateStats();
  }

  /**
   * Handle cache miss scenario
   */
  private handleCacheMiss(
    cacheKey: string,
    cacheRule: CacheRule,
    request: Request,
    response: Response,
    next: CallHandler,
    operationId: string,
    startTime: number,
  ): Observable<any> {
    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - startTime;
        
        this.stats.cacheMisses++;
        this.recordEndpointStats(request.url, 'miss');

        // Check if response should be cached
        if (this.shouldCacheResponse(response, cacheRule)) {
          // Create cached response
          const cachedResponse: CachedResponse = {
            data,
            metadata: {
              timestamp: Date.now(),
              etag: response.get('ETag'),
              lastModified: response.get('Last-Modified'),
              userId: this.extractUserId(request),
              ttl: cacheRule.ttl,
              url: request.url,
              method: request.method,
            },
            headers: this.extractCacheableHeaders(response),
          };

          // Store in cache
          await this.cacheService.set(cacheKey, cachedResponse, {
            ttl: cacheRule.ttl,
            namespace: 'api-cache',
          });

          this.logger.debug(
            `[${operationId}] Cache MISS: ${request.url} - stored for ${cacheRule.ttl}s (${duration}ms)`,
          );
        } else {
          this.logger.debug(
            `[${operationId}] Cache SKIP: ${request.url} - not cacheable (${duration}ms)`,
          );
        }

        // Add cache headers
        response.set('X-Cache', 'MISS');
        response.set('X-Cache-Key', this.hashForLogging(operationId));

        // Record metrics
        if (this.metricsService) {
          this.metricsService.recordCacheOperation?.('get', 'miss', duration);
        }

        this.updateStats();
      }),
    );
  }

  /**
   * Find applicable cache rule for request
   */
  private findCacheRule(request: Request): CacheRule | null {
    const path = request.url.split('?')[0]; // Remove query string for pattern matching
    
    for (const rule of this.cacheRules) {
      if (rule.pattern.test(path)) {
        return rule;
      }
    }
    
    return null;
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: Request, cacheRule: CacheRule): string {
    const keyParts: string[] = [
      request.method,
      request.url,
    ];

    // Add user ID if required
    if (cacheRule.includeUserId) {
      const userId = this.extractUserId(request);
      if (userId) {
        keyParts.push(`user:${userId}`);
      }
    }

    // Add vary-by headers
    if (cacheRule.varyBy) {
      for (const header of cacheRule.varyBy) {
        const value = request.get(header);
        if (value) {
          keyParts.push(`${header}:${this.hashString(value)}`);
        }
      }
    }

    return this.keyGenerator.generateApiKey(
      request.method,
      request.url,
      request.query,
      cacheRule.includeUserId ? this.extractUserId(request) : undefined,
    );
  }

  /**
   * Check if cached response is still valid
   */
  private isCacheValid(cachedResponse: CachedResponse, request: Request): boolean {
    const now = Date.now();
    const cacheAge = (now - cachedResponse.metadata.timestamp) / 1000;
    
    // Check TTL expiration
    if (cacheAge > cachedResponse.metadata.ttl) {
      return false;
    }

    // Check ETag if provided in request
    const ifNoneMatch = request.get('If-None-Match');
    if (ifNoneMatch && cachedResponse.metadata.etag) {
      return ifNoneMatch === cachedResponse.metadata.etag;
    }

    // Check Last-Modified if provided in request
    const ifModifiedSince = request.get('If-Modified-Since');
    if (ifModifiedSince && cachedResponse.metadata.lastModified) {
      const modifiedSince = new Date(ifModifiedSince);
      const lastModified = new Date(cachedResponse.metadata.lastModified);
      return lastModified <= modifiedSince;
    }

    return true;
  }

  /**
   * Check if response should be cached
   */
  private shouldCacheResponse(response: Response, cacheRule: CacheRule): boolean {
    // Check status code
    if (cacheRule.cacheableStatuses && 
        !cacheRule.cacheableStatuses.includes(response.statusCode)) {
      return false;
    }

    // Check for cache-control directives
    const cacheControl = response.get('Cache-Control');
    if (cacheControl) {
      if (cacheControl.includes('no-store') || cacheControl.includes('private')) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract user ID from request for user-specific caching
   */
  private extractUserId(request: Request): string | undefined {
    // Try to extract from various common locations
    const authHeader = request.get('Authorization');
    if (authHeader) {
      // Simple hash of auth header for user identification
      return this.hashString(authHeader).substring(0, 8);
    }

    // Try session or other user identification methods
    // This would be implemented based on the app's authentication strategy
    return undefined;
  }

  /**
   * Extract cacheable headers from response
   */
  private extractCacheableHeaders(response: Response): Record<string, string> {
    const cacheableHeaders = [
      'Content-Type',
      'ETag',
      'Last-Modified',
      'Expires',
      'Cache-Control',
    ];

    const headers: Record<string, string> = {};
    
    for (const header of cacheableHeaders) {
      const value = response.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    return headers;
  }

  /**
   * Invalidate cache entries related to a mutation request
   */
  private async invalidateRelatedCache(request: Request): Promise<void> {
    try {
      // Extract resource pattern for invalidation
      const resourcePattern = this.extractResourcePattern(request);
      if (resourcePattern) {
        await this.cacheService.invalidatePattern(resourcePattern, 'api-cache');
        
        this.logger.debug(
          `Cache invalidation triggered by ${request.method} ${request.url}`,
          { pattern: resourcePattern },
        );
      }
    } catch (error) {
      this.logger.error(
        `Cache invalidation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Extract resource pattern for cache invalidation
   */
  private extractResourcePattern(request: Request): string | null {
    // Task operations - invalidate task-related cache
    if (request.url.match(/^\/api\/tasks/)) {
      const taskId = request.url.match(/\/api\/tasks\/([^/]+)/)?.[1];
      if (taskId) {
        return `api:*:tasks:${taskId}*`;
      } else {
        return 'api:*:tasks*';
      }
    }

    return null;
  }

  /**
   * Hash string for consistent identification
   */
  private hashString(input: string): string {
    return createHash('md5').update(input).digest('hex');
  }

  /**
   * Create safe hash for logging
   */
  private hashForLogging(input: string): string {
    return createHash('md5').update(input).digest('hex').substring(0, 8);
  }

  /**
   * Record endpoint-specific cache statistics
   */
  private recordEndpointStats(url: string, result: 'hit' | 'miss'): void {
    const normalizedUrl = this.normalizeUrlForStats(url);
    
    if (!this.stats.endpointStats.has(normalizedUrl)) {
      this.stats.endpointStats.set(normalizedUrl, {
        hits: 0,
        misses: 0,
        hitRate: 0,
      });
    }

    const endpointStats = this.stats.endpointStats.get(normalizedUrl)!;
    
    if (result === 'hit') {
      endpointStats.hits++;
    } else {
      endpointStats.misses++;
    }

    const total = endpointStats.hits + endpointStats.misses;
    endpointStats.hitRate = total > 0 ? (endpointStats.hits / total) * 100 : 0;
  }

  /**
   * Normalize URL for statistics grouping
   */
  private normalizeUrlForStats(url: string): string {
    return url
      .split('?')[0] // Remove query string
      .replace(/\/\d+/g, '/:id') // Replace IDs
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid'); // Replace UUIDs
  }

  /**
   * Update overall cache statistics
   */
  private updateStats(): void {
    this.stats.totalRequests = this.stats.cacheHits + this.stats.cacheMisses + this.stats.cacheSkips;
    
    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = (this.stats.cacheHits / this.stats.totalRequests) * 100;
    }
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheInterceptorStats {
    return {
      ...this.stats,
      endpointStats: new Map(this.stats.endpointStats),
    };
  }

  /**
   * Clear cache statistics
   */
  clearStats(): void {
    Object.assign(this.stats, {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      cacheSkips: 0,
      hitRate: 0,
      averageResponseTime: 0,
    });
    
    this.stats.endpointStats.clear();
    this.logger.log('Cache interceptor statistics cleared');
  }

  /**
   * Start periodic statistics reporting
   */
  private startPeriodicReporting(): void {
    // Report cache stats every 5 minutes
    setInterval(() => {
      if (this.stats.totalRequests > 0) {
        this.logger.log('Cache Interceptor Statistics:', {
          totalRequests: this.stats.totalRequests,
          cacheHits: this.stats.cacheHits,
          cacheMisses: this.stats.cacheMisses,
          cacheSkips: this.stats.cacheSkips,
          hitRate: `${this.stats.hitRate.toFixed(1)}%`,
          topEndpoints: Array.from(this.stats.endpointStats.entries())
            .sort((a, b) => (b[1].hits + b[1].misses) - (a[1].hits + a[1].misses))
            .slice(0, 5)
            .map(([url, stats]) => ({
              url,
              requests: stats.hits + stats.misses,
              hitRate: `${stats.hitRate.toFixed(1)}%`,
            })),
        });
      }
    }, 300000); // 5 minutes
  }
}