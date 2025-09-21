/* eslint-env jest */

/**
 * Comprehensive Unit Tests for CacheKeyGenerator
 *
 * Complete test suite for intelligent cache key generation with namespace
 * support, collision prevention, and performance optimization. Tests all
 * key generation patterns, validation logic, and statistics tracking.
 *
 * Features tested:
 * - Key generation from strings, arrays, and objects
 * - Namespace and versioning support
 * - Key sanitization and validation
 * - Hash-based key normalization for long keys
 * - API, database, and task-specific key generation
 * - Invalidation pattern generation
 * - Statistics tracking and metadata management
 * - Error handling and fallback strategies
 *
 * @author Claude Code - Subagent 4 (Cache Testing Specialist)
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';import { CacheKeyGenerator } from '../cache-key.generator';describe('CacheKeyGenerator', () => {let generator: CacheKeyGenerator;beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheKeyGenerator],
    }).compile();

    generator = module.get<CacheKeyGenerator>(CacheKeyGenerator);
  });

  afterEach(() => {
    jest.clearAllMocks();
    generator.clearStats();
  });

  describe('Service Initialization', () => {it('should be defined', () => {expect(generator).toBeDefined();expect(generator).toBeInstanceOf(CacheKeyGenerator);
    });

    it('should initialize with correct default values', () => {const stats = generator.getStats();expect(stats.totalGenerated).toBe(0);
      expect(stats.hashedKeys).toBe(0);
      expect(stats.namespaceUsage.size).toBe(0);
      expect(stats.avgKeyLength).toBe(0);
    });
  });

  describe('generate() - Basic Key Generation', () => {it('should generate simple string keys', () => {const key = 'simple-key';const result = generator.generate(key);expect(result).toBe('bytebot:simple-key');expect(result).toMatch(/^bytebot:/);});

    it('should use custom namespace', () => {const key = 'test-key';const namespace = 'custom';const result = generator.generate(key, namespace);expect(result).toBe('custom:test-key');expect(result).toMatch(/^custom:/);});

    it('should add version when specified', () => {const key = 'versioned-key';const result = generator.generate(key, undefined, { version: '2.0' });expect(result).toBe('bytebot:v2.0:versioned-key');expect(result).toContain(':v2.0:');});it('should add timestamp when requested', () => {const key = 'timestamped-key';const beforeTime = Date.now();const result = generator.generate(key, undefined, { includeTimestamp: true });
      const afterTime = Date.now();

      expect(result).toMatch(/^bytebot:timestamped-key:\d+$/);
      
      // Extract timestamp from result
      const timestampStr = result.split(':')[2];expect(timestampStr).toBeDefined();const timestamp = parseInt(timestampStr ?? '0');expect(timestamp).toBeGreaterThanOrEqual(beforeTime);expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should use namespace from options', () => {
      const key = 'options-key';
      const result = generator.generate(key, undefined, { namespace: 'options' });
      expect(result).toBe('options:options-key');
    });

    it('should prioritize direct namespace parameter over options', () => {
      const key = 'priority-key';
      const result = generator.generate(key, 'direct', { namespace: 'options' });
      expect(result).toBe('direct:priority-key');
    });
  });

  describe('Key Normalization and Sanitization', () => {
    it('should sanitize invalid characters in keys', () => {
      const key = 'key with (spaces ?? "default")@#$%^&*()';
      const result = generator.generate(key);

      expect(result).toBe('bytebot:key_with_spaces');
      expect(result).not.toContain(' ');
      expect(result).not.toContain('!');
      expect(result).not.toContain('@');
    });

    it('should collapse multiple underscores', () => {
      const key = 'key___with____multiple_underscores';
      const result = generator.generate(key);
      expect(result).toBe('bytebot:key_with_multiple_underscores');
      expect(result).not.toContain('__');
    });

    it('should remove leading and trailing underscores', () => {
      const key = '_leading_and_trailing_';
      const result = generator.generate(key);
      expect(result).toBe('bytebot:leading_and_trailing');
      expect(result).not.toMatch(/^.*:/);
      expect(result).not.toMatch(/_$/);
    });

    it('should convert to lowercase', () => {
      const key = 'UpperCaseKey';
      const result = generator.generate(key);
      expect(result).toBe('bytebot:uppercasekey');
      expect(result).toEqual(result.toLowerCase());
    });
  });

  describe('Array Key Generation', () => {
    it('should generate keys from string arrays', () => {
      const key = ['section', 'subsection', 'item'];
      const result = generator.generate(key);
      expect(result).toBe('bytebot:section:subsection:item');
    });

    it('should sanitize array elements', () => {
      const key = ['section with spaces', 'sub@section', 'item#1'];
      const result = generator.generate(key);
      expect(result).toBe('bytebot:section_with_spaces:sub_section:item_1');
    });

    it('should handle empty array elements', () => {
      const key = ['section', '', 'item'];
      const result = generator.generate(key);
      expect(result).toBe('bytebot:section::item');
    });
  });

  describe('Object Key Generation', () => {it('should generate keys from simple objects', () => {const key = { id: 123, type: 'user' };const result = generator.generate(key);expect(result).toMatch(/^bytebot:[a-f0-9]{12}$/);
      expect(result.length).toBe('bytebot:'.length + 12); // MD5 hash is 12 chars});it('should generate consistent keys for same objects', () => {const key1 = { id: 123, type: 'user' };const key2 = { type: 'user', id: 123 }; // Different order, same contentconst result1 = generator.generate(key1);const result2 = generator.generate(key2);

      expect(result1).toBe(result2); // Should be identical due to key sorting
    });

    it('should generate different keys for different objects', () => {const key1 = { id: 123, type: 'user' };const key2 = { id: 456, type: 'user' };const result1 = generator.generate(key1);const result2 = generator.generate(key2);

      expect(result1).not.toBe(result2);
    });

    it('should handle nested objects', () => {const key = {user: { id: 123, profile: { name: 'test' } },timestamp: 1234567890,};

      const result = generator.generate(key);
      expect(result).toMatch(/^bytebot:[a-f0-9]{12}$/);
    });
  });

  describe('Long Key Hashing', () => {it('should hash very long keys', () => {const longKey = 'a'.repeat(300); // Exceeds hash thresholdconst result = generator.generate(longKey);expect(result).toMatch(/^bytebot:hash_[a-f0-9]{16}$/);
      expect(result.length).toBeLessThan(50); // Much shorter than original
    });

    it('should not hash short keys', () => {const shortKey = 'short';const result = generator.generate(shortKey);expect(result).toBe('bytebot:short');expect(result).not.toContain('hash_');});it('should respect custom max length threshold', () => {const key = 'a'.repeat(50);const result = generator.generate(key, undefined, { maxLength: 40 });expect(result).toMatch(/^bytebot:hash_[a-f0-9]{16}$/);
    });

    it('should allow disabling hash for long keys', () => {const longKey = 'a'.repeat(300);
      const result = generator.generate(longKey, undefined, { hashLongKeys: false });

      expect(result).toBe(`bytebot:${'a'.repeat(300)}`);
      expect(result).not.toContain('hash_');
    });
  });

  describe('API Key Generation', () => {
    it('should generate API keys with method and path', () => {
      const result = generator.generateApiKey('GET', '/api/users');
      expect(result).toBe('api:api:get:api_users');
    });

    it('should handle query parameters', () => {
      const queryParams = { limit: 10, offset: 0, sort: 'name' };
      const result = generator.generateApiKey('POST', '/api/search', queryParams);
      expect(result).toMatch(/^api:api:post:api_search:[a-f0-9]{12}$/);
    });

    it('should include user ID when provided', () => {
      const result = generator.generateApiKey('GET', '/api/profile', undefined, 'user123');
      expect(result).toBe('api:api:get:api_profile:user_user123');
    });

    it('should sort query parameters for consistency', () => {
      const params1 = { b: 2, a: 1, c: 3 };
      const params2 = { a: 1, b: 2, c: 3 };

      const result1 = generator.generateApiKey('GET', '/path', params1);
      const result2 = generator.generateApiKey('GET', '/path', params2);
      expect(result1).toBe(result2);
    });

    it('should handle complex query parameters', () => {
      const queryParams = {
        filters: { status: 'active', type: 'user' },
        pagination: { page: 1, size: 20 },
      };

      const result = generator.generateApiKey('GET', '/api/data', queryParams);expect(result).toMatch(/^api:api:get:api_data:[a-f0-9]{12}$/);});
  });

  describe('Database Key Generation', () => {it('should generate database keys with table and operation', () => {const result = generator.generateDbKey('users', 'SELECT');expect(result).toBe('database:db:users:select');});it('should include parameters hash when provided', () => {const params = { id: 123, status: 'active' };const result = generator.generateDbKey('users', 'SELECT', params);expect(result).toMatch(/^database:db:users:select:[a-f0-9]{12}$/);});

    it('should handle empty parameters', () => {const result = generator.generateDbKey('users', 'COUNT', {});expect(result).toBe('database:db:users:count');});});

  describe('Task Key Generation', () => {it('should generate task keys with ID and operation', () => {const result = generator.generateTaskKey('task123', 'status');expect(result).toBe('tasks:task:task123:status');});it('should include additional parameters', () => {const params = { userId: 'user456', priority: 'high' };const result = generator.generateTaskKey('task123', 'execute', params);expect(result).toMatch(/^tasks:task:task123:execute:[a-f0-9]{12}$/);});
  });

  describe('Invalidation Pattern Generation', () => {it('should generate basic invalidation patterns', () => {const result = generator.generateInvalidationPattern('cache');expect(result).toBe('cache:*');});it('should generate specific invalidation patterns', () => {const result = generator.generateInvalidationPattern('cache', 'user');expect(result).toBe('cache:user*');});it('should handle empty patterns', () => {const result = generator.generateInvalidationPattern('namespace', '');expect(result).toBe('namespace:*');});});

  describe('Key Validation', () => {it('should validate normal keys', () => {expect(() => {generator.generate('valid-key');}).not.toThrow();});

    it('should reject empty keys', () => {expect(() => {generator.generate('');}).toThrow('Generated key is empty');});it('should reject extremely long keys', () => {const extremelyLongKey = 'a'.repeat(1000);expect(() => {generator.generate(extremelyLongKey, undefined, { 
          hashLongKeys: false,
          maxLength: 999 
        });
      }).toThrow('Generated key exceeds maximum length');});it('should reject keys with whitespace', () => {// This test verifies the validation catches issues that sanitization missedconst keyWithTabs = 'key\tWith
Whitespace';// Mock the sanitization to let whitespace through for testingconst _originalGenerate = generator.generate;
      jest.spyOn(generator as unknown as { sanitizeKey: jest.Mock }, 'sanitizeKey').mockReturnValue(keyWithTabs);expect(() => {generator.generate(keyWithTabs);
      }).toThrow('Generated key contains whitespace characters');// Restore original method(generator as unknown as { sanitizeKey: jest.Mock }).sanitizeKey.mockRestore();
    });
  });

  describe('Metadata and Statistics', () => {it('should track key metadata', () => {const key = 'metadata-key';const namespace = 'test';const result = generator.generate(key, namespace, { version: '1.0' });const metadata = generator.getKeyMetadata(result);expect(metadata).toBeDefined();
      expect(metadata?.originalKey).toBe(key);
      expect(metadata?.generatedKey).toBe(result);
      expect(metadata?.namespace).toBe(namespace);
      expect(metadata?.version).toBe('1.0');expect(metadata?.hashedKey).toBe(false);});

    it('should track hashed key metadata', () => {const longKey = 'a'.repeat(300);const result = generator.generate(longKey);const metadata = generator.getKeyMetadata(result);
      expect(metadata).toBeDefined();
      expect(metadata?.hashedKey).toBe(true);
    });

    it('should update statistics on key generation', () => {const initialStats = generator.getStats();expect(initialStats.totalGenerated).toBe(0);

      generator.generate('test-key1');generator.generate('test-key2', 'custom');const updatedStats = generator.getStats();expect(updatedStats.totalGenerated).toBe(2);
      expect(updatedStats.namespaceUsage.get('bytebot')).toBe(1);expect(updatedStats.namespaceUsage.get('custom')).toBe(1);expect(updatedStats.avgKeyLength).toBeGreaterThan(0);});

    it('should track hashed keys in statistics', () => {const longKey = 'a'.repeat(300);generator.generate(longKey);const stats = generator.getStats();
      expect(stats.hashedKeys).toBe(1);
    });

    it('should calculate average key length correctly', () => {generator.generate('short'); // 12 chars: bytebot:shortgenerator.generate('a'.repeat(20)); // 28 chars: bytebot: + 20 charsconst stats = generator.getStats();expect(stats.avgKeyLength).toBe((12 + 28) / 2);
    });

    it('should clear statistics and metadata', () => {generator.generate('test-key');const beforeClear = generator.getStats();expect(beforeClear.totalGenerated).toBe(1);

      generator.clearStats();

      const afterClear = generator.getStats();
      expect(afterClear.totalGenerated).toBe(0);
      expect(afterClear.namespaceUsage.size).toBe(0);
      
      // Metadata should also be cleared
      const metadata = generator.getKeyMetadata('bytebot:test-key');expect(metadata).toBeUndefined();});
  });

  describe('Error Handling and Edge Cases', () => {it('should handle null and undefined inputs', () => {const nullResult = generator.generate(null as unknown as string);const undefinedResult = generator.generate(undefined as unknown as string);

      expect(nullResult).toBe('bytebot:null');expect(undefinedResult).toBe('bytebot:undefined');});it('should handle numeric inputs', () => {const result = generator.generate(123 as unknown as string);expect(result).toBe('bytebot:123');});it('should handle boolean inputs', () => {const trueResult = generator.generate(true as unknown as string);const falseResult = generator.generate(false as unknown as string);

      expect(trueResult).toBe('bytebot:true');expect(falseResult).toBe('bytebot:false');});it('should use fallback key generation on errors', () => {// Mock the generate method to throw an error during processingconst _originalNormalizeKey = (generator as unknown as { normalizeKey: jest.Mock }).normalizeKey;
      jest.spyOn(generator as unknown as { normalizeKey: jest.Mock }, 'normalizeKey').mockImplementation(() => {throw new Error('Normalization error');});const result = generator.generate('error-key', 'error-namespace');// Should fall back to simple key generationexpect(result).toBe('error-namespace:error-key');// Restore original method(generator as unknown as { normalizeKey: jest.Mock }).normalizeKey.mockRestore();
    });

    it('should handle circular references in objects gracefully', () => {const circularObj: Record<string, unknown> = { prop: 'value' };circularObj.circular = circularObj;// Should not throw and should generate a hash
      expect(() => {
        const result = generator.generate(circularObj);
        expect(result).toMatch(/^bytebot:[a-f0-9]{12}$/);
      }).not.toThrow();
    });
  });

  describe('Performance and Scalability', () => {it('should handle rapid key generation', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        generator.generate(`key-${i}`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 key generations in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
      
      const stats = generator.getStats();
      expect(stats.totalGenerated).toBe(1000);
    });

    it('should handle many different namespaces', () => {for (let i = 0; i < 100; i++) {generator.generate('key', `namespace-${i}`);
      }
      
      const stats = generator.getStats();
      expect(stats.namespaceUsage.size).toBe(100);
    });
  });

  describe('Complex Integration Scenarios', () => {it('should handle mixed key types consistently', () => {const stringKey = generator.generate('string-key');const arrayKey = generator.generate(['array', 'key']);const objectKey = generator.generate({ type: 'object', id: 1 });expect(stringKey).toMatch(/^bytebot:/);expect(arrayKey).toMatch(/^bytebot:/);
      expect(objectKey).toMatch(/^bytebot:/);
      
      expect(stringKey).not.toBe(arrayKey);
      expect(arrayKey).not.toBe(objectKey);
      expect(stringKey).not.toBe(objectKey);
    });

    it('should maintain consistency across multiple generations', () => {const key = { id: 123, type: 'test' };
      
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(generator.generate(key));
      }
      
      // All results should be identical
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
    });
  });
});