/**
 * Comprehensive Secrets Management Integration Tests
 * Tests the complete secrets management system including Kubernetes integration,
 * external secrets providers, and configuration security
 *
 * @author Secrets Management Test Specialist
 * @version 1.0.0
 * @since Phase 1: Bytebot API Hardening
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecretsService } from '../secrets.service';
import { ExternalSecretsService } from '../external-secrets.service';
import { ConfigurationSecurityService } from '../configuration-security.service';

describe('Comprehensive Secrets Management', () => {
  let module: TestingModule;
  let secretsService: SecretsService;
  let externalSecretsService: ExternalSecretsService;
  let configSecurityService: ConfigurationSecurityService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Mock configuration for testing
    const mockConfig = {
      'app.security.encryptionKey': 'test-encryption-key-32-characters-long',
      'app.features.secretsRotation': false,
      'app.secrets.rotationInterval': 86400000,
      'app.secrets.maxAge': 604800000,
      'app.secrets.notifyBeforeExpiry': 86400000,
    };

    const mockConfigService = {
      get: jest.fn((key: string) => mockConfig[key as keyof typeof mockConfig]),
    };

    module = await Test.createTestingModule({
      providers: [
        SecretsService,
        ExternalSecretsService,
        ConfigurationSecurityService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    secretsService = module.get<SecretsService>(SecretsService);
    externalSecretsService = module.get<ExternalSecretsService>(
      ExternalSecretsService,
    );
    configSecurityService = module.get<ConfigurationSecurityService>(
      ConfigurationSecurityService,
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('SecretsService Integration', () => {
    it('should initialize successfully', async () => {
      await expect(secretsService.onModuleInit()).resolves.not.toThrow();
    });

    it('should retrieve secrets from environment variables', async () => {
      // Set up environment variable
      process.env.TEST_SECRET = 'test-value';

      const secret = secretsService.getSecret('test-secret', 'TEST_SECRET');
      expect(secret).toBe('test-value');

      // Cleanup
      delete process.env.TEST_SECRET;
    });

    it('should cache secrets for performance', async () => {
      process.env.TEST_CACHE_SECRET = 'cached-value';

      // First call should load from environment
      const secret1 = secretsService.getSecret(
        'test-cache-secret',
        'TEST_CACHE_SECRET',
      );
      expect(secret1).toBe('cached-value');

      // Change environment value
      process.env.TEST_CACHE_SECRET = 'new-value';

      // Second call should return cached value
      const secret2 = secretsService.getSecret(
        'test-cache-secret',
        'TEST_CACHE_SECRET',
      );
      expect(secret2).toBe('cached-value');

      // Cleanup
      delete process.env.TEST_CACHE_SECRET;
    });

    it('should rotate secrets and clear cache', async () => {
      process.env.TEST_ROTATION_SECRET = 'original-value';

      // Load secret into cache
      const original = secretsService.getSecret(
        'test-rotation',
        'TEST_ROTATION_SECRET',
      );
      expect(original).toBe('original-value');

      // Change environment value
      process.env.TEST_ROTATION_SECRET = 'rotated-value';

      // Rotate secret (should clear cache and reload)
      secretsService.rotateSecret('test-rotation', 'TEST_ROTATION_SECRET');

      // Next call should get new value
      const rotated = secretsService.getSecret(
        'test-rotation',
        'TEST_ROTATION_SECRET',
      );
      expect(rotated).toBe('rotated-value');

      // Cleanup
      delete process.env.TEST_ROTATION_SECRET;
    });

    it('should encrypt and decrypt secrets', () => {
      const plaintext = 'sensitive-secret-value';

      // Set encrypted secret
      secretsService.setSecret('encrypted-test', plaintext, undefined, true);

      // Get encrypted secret (should be decrypted)
      const decrypted = secretsService.getSecret(
        'encrypted-test',
        undefined,
        true,
      );
      expect(decrypted).toBe(plaintext);
    });

    it('should provide secrets health status', () => {
      // Add some test secrets
      secretsService.setSecret('healthy-secret-1', 'value1');
      secretsService.setSecret('healthy-secret-2', 'value2');

      const health = secretsService.getSecretsHealth();
      expect(health.total).toBe(2);
      expect(health.healthy).toBe(2);
      expect(health.expired).toBe(0);
      expect(health.details).toHaveLength(2);
    });
  });

  describe('External Secrets Service', () => {
    it('should initialize without external providers', async () => {
      await expect(
        externalSecretsService.onModuleInit(),
      ).resolves.not.toThrow();
    });

    it('should handle missing external secrets gracefully', async () => {
      const secret =
        await externalSecretsService.getSecret('nonexistent-secret');
      expect(secret).toBeNull();
    });

    it('should return service statistics', () => {
      const stats = externalSecretsService.getServiceStatistics();
      expect(stats).toHaveProperty('providersCount');
      expect(stats).toHaveProperty('hasPrimaryProvider');
      expect(stats).toHaveProperty('fallbackProvidersCount');
      expect(stats).toHaveProperty('isHealthy');
    });

    it('should list secrets from all providers', async () => {
      const secrets = await externalSecretsService.listSecrets();
      expect(Array.isArray(secrets)).toBe(true);
    });
  });

  describe('Configuration Security Service', () => {
    it('should initialize and perform security audit', async () => {
      await expect(configSecurityService.onModuleInit()).resolves.not.toThrow();
    });

    it('should validate configuration security', () => {
      // Test secure configuration
      const secureResult = configSecurityService.validateConfigurationSecurity(
        'secure-field',
        'secure-value-with-sufficient-length',
      );
      expect(secureResult.secure).toBe(true);
      expect(secureResult.violations).toHaveLength(0);

      // Test weak configuration
      const weakResult = configSecurityService.validateConfigurationSecurity(
        'weak-field',
        '123',
      );
      expect(weakResult.violations.length).toBeGreaterThan(0);
    });

    it('should perform comprehensive security audit', () => {
      const auditResult = configSecurityService.performSecurityAudit();

      expect(auditResult).toHaveProperty('secure');
      expect(auditResult).toHaveProperty('score');
      expect(auditResult).toHaveProperty('violations');
      expect(auditResult).toHaveProperty('recommendations');
      expect(auditResult.score).toBeGreaterThanOrEqual(0);
      expect(auditResult.score).toBeLessThanOrEqual(100);
    });

    it('should generate configuration hash for integrity', () => {
      const config = { key1: 'value1', key2: 'value2' };
      const hash1 = configSecurityService.generateConfigurationHash(config);
      const hash2 = configSecurityService.generateConfigurationHash(config);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64); // SHA-256 hex hash length
    });

    it('should verify configuration integrity', () => {
      const config = { test: 'value' };
      const hash = configSecurityService.generateConfigurationHash(config);

      expect(
        configSecurityService.verifyConfigurationIntegrity(config, hash),
      ).toBe(true);

      // Modified configuration should fail verification
      const modifiedConfig = { test: 'different-value' };
      expect(
        configSecurityService.verifyConfigurationIntegrity(
          modifiedConfig,
          hash,
        ),
      ).toBe(false);
    });

    it('should maintain audit history', () => {
      // Perform audit to generate history
      configSecurityService.performSecurityAudit();

      const history = configSecurityService.getAuditHistory(10);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);

      // Check audit entry structure
      const entry = history[0];
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('success');
      expect(entry).toHaveProperty('securityScore');
    });
  });

  describe('Integration Tests', () => {
    it('should integrate secrets service with security validation', async () => {
      // Mock security service to return violations
      const mockValidation = {
        secure: false,
        violations: [
          {
            type: 'WEAK_CONFIGURATION' as const,
            severity: 'high' as const,
            field: 'test-field',
            message: 'Weak value detected',
            recommendation: 'Use stronger values',
            detected: new Date(),
          },
        ],
        recommendations: ['Use stronger values'],
      };

      jest
        .spyOn(configSecurityService, 'validateConfigurationSecurity')
        .mockReturnValue(mockValidation);

      // Listen for security violation events
      const violationPromise = new Promise<void>((resolve) => {
        secretsService.once('secretSecurityViolation', () => resolve());
      });

      // Set a secret that should trigger security validation
      process.env.WEAK_SECRET = 'weak';
      secretsService.getSecret('weak-test', 'WEAK_SECRET');

      // Wait for security event
      await violationPromise;

      // Cleanup
      delete process.env.WEAK_SECRET;
    });

    it('should handle external secrets integration', async () => {
      // Mock external secrets service
      const mockExternalSecret = {
        value: 'external-secret-value',
        metadata: {
          name: 'external-test',
          version: 'v1',
          provider: 'vault' as const,
          lastModified: new Date(),
        },
      };

      jest
        .spyOn(externalSecretsService, 'getSecret')
        .mockResolvedValue(mockExternalSecret);

      // Get secret that should fallback to external service
      const secret = secretsService.getSecret('external-test');

      // Should not be null since external service returns a value
      expect(secret).not.toBeNull();
    });

    it('should provide comprehensive security status', async () => {
      // Get current security status
      const status = configSecurityService.getCurrentSecurityStatus();

      expect(status).toHaveProperty('score');
      expect(status).toHaveProperty('requiresAudit');
      expect(typeof status.score).toBe('number');
      expect(typeof status.requiresAudit).toBe('boolean');
    });

    it('should handle service lifecycle properly', async () => {
      // Test initialization
      secretsService.onModuleInit();
      await externalSecretsService.onModuleInit();
      configSecurityService.onModuleInit();

      // Test cleanup
      await expect(secretsService.onModuleDestroy()).resolves.not.toThrow();
      await expect(
        externalSecretsService.onModuleDestroy(),
      ).resolves.not.toThrow();
      await expect(
        configSecurityService.onModuleDestroy(),
      ).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle configuration service errors gracefully', async () => {
      // Mock config service to throw error
      jest.spyOn(configService, 'get').mockImplementation(() => {
        throw new Error('Configuration error');
      });

      // Should not throw, should handle gracefully
      await expect(secretsService.getSecret('test-error')).resolves.toBeNull();
    });

    it('should handle external service failures', async () => {
      // Mock external service to throw error
      jest
        .spyOn(externalSecretsService, 'getSecret')
        .mockRejectedValue(new Error('External service error'));

      // Should handle error and return null
      const secret = secretsService.getSecret('external-error-test');
      expect(secret).toBeNull();
    });

    it('should handle security service failures gracefully', async () => {
      // Mock security service to throw error
      jest
        .spyOn(configSecurityService, 'validateConfigurationSecurity')
        .mockImplementation(() => {
          throw new Error('Security validation error');
        });

      // Should still return the secret value despite security validation error
      process.env.TEST_SECURITY_ERROR = 'test-value';
      const secret = secretsService.getSecret(
        'test-security-error',
        'TEST_SECURITY_ERROR',
      );
      expect(secret).toBe('test-value');

      // Cleanup
      delete process.env.TEST_SECURITY_ERROR;
    });
  });

  describe('Performance Tests', () => {
    it('should cache secrets for performance', async () => {
      process.env.PERFORMANCE_TEST_SECRET = 'performance-value';

      const startTime = Date.now();

      // First call (should load from environment)
      secretsService.getSecret('performance-test', 'PERFORMANCE_TEST_SECRET');
      const firstCallTime = Date.now() - startTime;

      const midTime = Date.now();

      // Second call (should load from cache)
      secretsService.getSecret('performance-test', 'PERFORMANCE_TEST_SECRET');
      const secondCallTime = Date.now() - midTime;

      // Cached call should be faster (or at least not significantly slower)
      expect(secondCallTime).toBeLessThanOrEqual(firstCallTime + 10); // Allow 10ms margin

      // Cleanup
      delete process.env.PERFORMANCE_TEST_SECRET;
    });

    it('should handle concurrent secret requests', async () => {
      process.env.CONCURRENT_TEST_SECRET = 'concurrent-value';

      // Make multiple concurrent requests
      const promises = Array.from({ length: 10 }, (_, i) =>
        secretsService.getSecret(
          `concurrent-test-${i}`,
          'CONCURRENT_TEST_SECRET',
        ),
      );

      const results = await Promise.all(promises);

      // All should return the same value
      results.forEach((result) => {
        expect(result).toBe('concurrent-value');
      });

      // Cleanup
      delete process.env.CONCURRENT_TEST_SECRET;
    });
  });
});
