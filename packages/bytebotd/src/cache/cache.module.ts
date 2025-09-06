/**
 * Cache Module - Redis-based Caching Infrastructure
 *
 * Provides comprehensive caching capabilities using Redis with advanced
 * patterns including cache-aside, write-through, and cache warming.
 * Designed for high-performance enterprise applications.
 *
 * Features:
 * - Redis integration with connection pooling
 * - Cache-aside and write-through patterns
 * - Intelligent cache key generation
 * - Cache invalidation strategies
 * - Performance metrics and monitoring
 * - TTL management and cache warming
 *
 * @author Claude Code - Performance Optimization Specialist
 * @version 1.0.0
 */

import { Module, Global, Logger } from '@nestjs/common';
import {
  CacheModule as NestCacheModule,
  CacheStore,
} from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { CacheKeyGenerator } from './cache-key.generator';
import * as redisStore from 'cache-manager-redis-store';

/**
 * Cache configuration for enterprise-grade Redis caching
 */
interface CacheConfig {
  store: CacheStore;
  host: string;
  port: number;
  ttl: number;
  max: number;
  password?: string;
  db?: number;
}

/**
 * Global cache module providing Redis-based caching throughout the application
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: (): CacheConfig => {
        const logger = new Logger('CacheModule');

        const config: CacheConfig = {
          store: redisStore as unknown as CacheStore,
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default
          max: parseInt(process.env.CACHE_MAX_ITEMS || '1000', 10),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0', 10),
        };

        logger.log('Cache module configuration:', {
          host: config.host,
          port: config.port,
          ttl: config.ttl,
          maxItems: config.max,
          database: config.db,
        });

        return config;
      },
    }),
  ],
  providers: [CacheService, CacheKeyGenerator],
  exports: [CacheService, CacheKeyGenerator, NestCacheModule],
})
export class CacheModule {
  private readonly logger = new Logger(CacheModule.name);

  constructor() {
    this.logger.log('Redis Cache Module initialized');
    this.logger.log('Cache patterns: cache-aside, write-through');
    this.logger.log('Features: TTL management, key generation, metrics');
  }
}
