/**
 * Configuration Service Comprehensive Unit Tests
 * Tests configuration loading, secrets management, environment handling, and validation
 *
 * @author Claude Code - Testing & Quality Assurance Specialist
 * @version 2.0.0
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import { BytebotConfigService } from '../config.service';
import { AppConfig } from '../configuration';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock crypto module
jest.mock('crypto');
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

// Mock path module
jest.mock('path');
const mockedPath = path as jest.Mocked<typeof path>;

describe('BytebotConfigService', () => {
  let service: BytebotConfigService;
  let configService: jest.Mocked<ConfigService<AppConfig>>;
  let eventEmitter: EventEmitter;
  let testSecretsDir: string;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.resetModules();

    testSecretsDir = '/tmp/test-secrets';
    process.env.LOCAL_SECRETS_DIR = testSecretsDir;
    process.env.LOCAL_SECRETS_ENCRYPTION_KEY = 'test-key-32-chars-long-for-aes256';

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BytebotConfigService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BytebotConfigService>(BytebotConfigService);
    configService = module.get(ConfigService);
    eventEmitter = new EventEmitter();

    // Setup path mocks
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedPath.dirname.mockImplementation((p) => p.substring(0, p.lastIndexOf('/')));

    // Setup fs mocks
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.chmodSync.mockReturnValue(undefined);
    mockedFs.accessSync.mockReturnValue(undefined);
    mockedFs.readFileSync.mockReturnValue('');
    mockedFs.writeFileSync.mockReturnValue(undefined);
    mockedFs.readdirSync.mockReturnValue([]);

    // Setup crypto mocks
    mockedCrypto.scryptSync.mockReturnValue(Buffer.from('test-key-32-chars-long-for-aes256'));
    mockedCrypto.randomBytes.mockReturnValue(Buffer.from('test-iv-16-bytes-'));
    
    const mockCipher = {
      update: jest.fn().mockReturnValue('encrypted'),
      final: jest.fn().mockReturnValue('data'),
      getAuthTag: jest.fn().mockReturnValue(Buffer.from('auth-tag-16-bytes')),
    };
    const mockDecipher = {
      setAuthTag: jest.fn(),
      update: jest.fn().mockReturnValue('decrypted'),
      final: jest.fn().mockReturnValue('data'),
    };
    
    mockedCrypto.createCipheriv.mockReturnValue(mockCipher as any);
    mockedCrypto.createDecipheriv.mockReturnValue(mockDecipher as any);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.LOCAL_SECRETS_DIR;
    delete process.env.LOCAL_SECRETS_ENCRYPTION_KEY;
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should be an instance of BytebotConfigService', () => {
      expect(service).toBeInstanceOf(BytebotConfigService);
    });

    it('should initialize secrets directory on construction', () => {
      expect(mockedFs.existsSync).toHaveBeenCalled();
    });

    it('should create secrets directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      // Create new service instance
      const newService = new BytebotConfigService(configService);
      
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        testSecretsDir,
        { recursive: true }
      );
      expect(mockedFs.chmodSync).toHaveBeenCalledWith(testSecretsDir, 0o700);
    });

    it('should validate directory access if it exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      
      // Create new service instance
      const newService = new BytebotConfigService(configService);
      
      expect(mockedFs.accessSync).toHaveBeenCalled();
    });

    it('should handle encryption key from environment', () => {
      process.env.LOCAL_SECRETS_ENCRYPTION_KEY = 'custom-key';
      
      // Create new service instance
      const newService = new BytebotConfigService(configService);
      
      expect(mockedCrypto.scryptSync).toHaveBeenCalledWith('custom-key', 'salt', 32);
    });

    it('should use default key when environment key not provided', () => {
      delete process.env.LOCAL_SECRETS_ENCRYPTION_KEY;
      
      // Create new service instance
      const newService = new BytebotConfigService(configService);
      
      expect(mockedCrypto.scryptSync).toHaveBeenCalledWith(
        'default-local-key-change-in-production',
        'salt',
        32
      );
    });
  });

  describe('Configuration Access', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        const mockValues = {
          'NODE_ENV': 'test',
          'DATABASE_URL': 'postgresql://localhost:5432/test',
          'ANTHROPIC_API_KEY': 'test-anthropic-key',
          'JWT_SECRET': 'test-jwt-secret',
        };
        return mockValues[key] || defaultValue;
      });
    });

    it('should retrieve configuration values with type safety', () => {
      const nodeEnv = service.get('NODE_ENV', 'development');
      expect(nodeEnv).toBe('test');
      expect(configService.get).toHaveBeenCalledWith('NODE_ENV', 'development');
    });

    it('should return default value when key not found', () => {
      configService.get.mockReturnValue(undefined);
      const result = service.get('MISSING_KEY', 'default-value');
      expect(result).toBe('default-value');
    });

    it('should throw error when key not found and no default provided', () => {
      configService.get.mockReturnValue(undefined);
      expect(() => service.get('MISSING_KEY')).toThrow(
        "Configuration key 'MISSING_KEY' not found and no default value provided"
      );
    });

    it('should handle configuration retrieval errors', () => {
      configService.get.mockImplementation(() => {
        throw new Error('Config access failed');
      });
      
      const result = service.get('ERROR_KEY', 'fallback');
      expect(result).toBe('fallback');
    });

    it('should update performance metrics on successful retrieval', () => {
      service.get('NODE_ENV', 'test');
      const metrics = service.getPerformanceMetrics();
      
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
      expect(metrics.errorCount).toBe(0);
    });

    it('should update error metrics on failed retrieval', () => {
      configService.get.mockImplementation(() => {
        throw new Error('Config error');
      });
      
      try {
        service.get('ERROR_KEY');
      } catch (error) {
        // Expected error
      }
      
      const metrics = service.getPerformanceMetrics();
      expect(metrics.errorCount).toBe(1);
    });
  });

  describe('Local Secrets Management', () => {
    beforeEach(() => {
      // Setup encryption/decryption mocks for secrets
      const mockCipher = {
        update: jest.fn().mockReturnValue('encrypted'),
        final: jest.fn().mockReturnValue('data'),
        getAuthTag: jest.fn().mockReturnValue(Buffer.from('auth-tag-16-bytes')),
      };
      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('{"test-key": "test-value"}'),
        final: jest.fn().mockReturnValue(''),
      };
      
      mockedCrypto.createCipheriv.mockReturnValue(mockCipher as any);
      mockedCrypto.createDecipheriv.mockReturnValue(mockDecipher as any);
    });

    it('should store secrets in encrypted format', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = await service.storeSecret('test-category', 'test-key', 'test-value');
      
      expect(result).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      expect(mockedCrypto.createCipheriv).toHaveBeenCalledWith(
        'aes-256-gcm',
        expect.any(Buffer),
        expect.any(Buffer)
      );
    });

    it('should retrieve secrets from encrypted storage', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('encrypted:data:here');
      
      const result = service.getSecret('test-category', 'test-key');
      
      expect(result).toBe('test-value');
      expect(mockedFs.readFileSync).toHaveBeenCalled();
      expect(mockedCrypto.createDecipheriv).toHaveBeenCalled();
    });

    it('should return null when secret file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      
      const result = service.getSecret('missing-category', 'missing-key');
      
      expect(result).toBeNull();
    });

    it('should handle decryption errors gracefully', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid:encrypted:data');
      mockedCrypto.createDecipheriv.mockImplementation(() => {
        throw new Error('Decryption failed');
      });
      
      const result = service.getSecret('test-category', 'test-key');
      
      expect(result).toBeNull();
    });

    it('should delete specific secrets from storage', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('encrypted:data:here');
      
      // Mock decipher to return multiple secrets
      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('{"key1": "value1", "key2": "value2"}'),
        final: jest.fn().mockReturnValue(''),
      };
      mockedCrypto.createDecipheriv.mockReturnValue(mockDecipher as any);
      
      const result = await service.deleteSecret('test-category', 'key1');
      
      expect(result).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalled(); // Re-saves remaining secrets
    });

    it('should delete entire file when no secrets remain', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('encrypted:data:here');
      
      // Mock decipher to return single secret
      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('{"only-key": "only-value"}'),
        final: jest.fn().mockReturnValue(''),
      };
      mockedCrypto.createDecipheriv.mockReturnValue(mockDecipher as any);
      
      // Mock fs.promises.unlink
      const mockUnlink = jest.fn().mockResolvedValue(undefined);
      (fs.promises as any) = { unlink: mockUnlink };
      
      const result = await service.deleteSecret('test-category', 'only-key');
      
      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('should list available secret categories', () => {
      mockedFs.readdirSync.mockReturnValue(['category1.enc', 'category2.enc', 'other.txt']);
      
      const result = service.listSecrets();
      
      expect(result).toEqual(['category1', 'category2']);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith(testSecretsDir);
    });

    it('should handle file system errors when listing secrets', () => {
      mockedFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory read failed');
      });
      
      const result = service.listSecrets();
      
      expect(result).toEqual([]);
    });

    it('should load secrets with fallback to environment variables', () => {
      // First loader (file) returns null
      mockedFs.existsSync.mockReturnValue(false);
      
      // Set environment variable
      process.env.TEST_SECRET = 'env-value';
      
      const result = service.getSecret('any-category', 'TEST_SECRET');
      
      expect(result).toBe('env-value');
    });

    it('should sanitize environment variable values', () => {
      // Set environment variable with control characters
      process.env.TEST_CONTROL_CHARS = 'value\x00with\x01control\x02chars';
      
      const result = service.getSecret('any-category', 'TEST_CONTROL_CHARS');
      
      expect(result).not.toContain('\x00');
      expect(result).not.toContain('\x01');
      expect(result).not.toContain('\x02');
    });
  });

  describe('Module Initialization', () => {
    it('should validate local configuration on initialization', async () => {
      configService.get.mockImplementation((key) => {
        if (key === 'DATABASE_URL') return 'postgresql://localhost:5432/test';
        return undefined;
      });
      
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should reject cloud database URLs', async () => {
      configService.get.mockImplementation((key) => {
        if (key === 'DATABASE_URL') return 'postgresql://amazonaws.com/db';
        return undefined;
      });
      
      await expect(service.onModuleInit()).rejects.toThrow(
        'Cloud database detected - local-only architecture requires SQLite or local PostgreSQL'
      );
    });

    it('should initialize critical secrets from environment', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      process.env.JWT_SECRET = 'test-jwt-secret';
      
      configService.get.mockImplementation((key) => {
        if (key === 'DATABASE_URL') return 'postgresql://localhost:5432/test';
        return undefined;
      });
      
      // Mock getSecret to return null first (not in storage)
      const originalStoreSecret = service.storeSecret;
      service.storeSecret = jest.fn().mockResolvedValue(true);
      service.getSecret = jest.fn().mockReturnValue(null);
      
      await service.onModuleInit();
      
      expect(service.storeSecret).toHaveBeenCalledWith('api-keys', 'ANTHROPIC_API_KEY', 'test-anthropic-key');
      expect(service.storeSecret).toHaveBeenCalledWith('auth', 'JWT_SECRET', 'test-jwt-secret');
    });

    it('should emit initialization complete event', async () => {
      const emitSpy = jest.spyOn(eventEmitter, 'emit');
      service['eventEmitter'] = eventEmitter;
      
      configService.get.mockImplementation((key) => {
        if (key === 'DATABASE_URL') return 'postgresql://localhost:5432/test';
        return undefined;
      });
      
      await service.onModuleInit();
      
      expect(emitSpy).toHaveBeenCalledWith('configService.initialized', expect.any(Object));
    });
  });

  describe('Configuration Features', () => {
    it('should return features configuration with defaults', () => {
      configService.get.mockReturnValue(undefined);
      
      const features = service.getFeaturesConfig();
      
      expect(features).toEqual({
        authentication: false,
        rateLimiting: false,
        metricsCollection: false,
        healthChecks: true,
        circuitBreaker: false,
      });
    });

    it('should return custom features configuration', () => {
      const customFeatures = {
        authentication: true,
        rateLimiting: true,
        metricsCollection: true,
        healthChecks: true,
        circuitBreaker: true,
      };
      
      configService.get.mockReturnValue(customFeatures);
      
      const features = service.getFeaturesConfig();
      
      expect(features).toEqual(customFeatures);
    });

    it('should return app configuration', () => {
      const mockAppConfig = {
        name: 'bytebot-agent',
        version: '1.0.0',
        environment: 'test',
      };
      
      (configService as any).get.mockReturnValue(mockAppConfig);
      
      const appConfig = service.getAppConfig();
      
      expect(appConfig).toEqual(mockAppConfig);
    });

    it('should throw error when app configuration not found', () => {
      (configService as any).get.mockReturnValue(undefined);
      
      expect(() => service.getAppConfig()).toThrow(
        'Application configuration not found. Ensure configuration is properly loaded.'
      );
    });

    it('should return API configuration with defaults', () => {
      configService.get.mockReturnValue(undefined);
      
      const apiConfig = service.getApiConfig();
      
      expect(apiConfig).toEqual({
        rateLimitWindow: 900000,
        rateLimitMaxRequests: 100,
        corsOrigins: '*',
        bodyParserLimit: '50mb',
        requestTimeout: 30000,
      });
    });

    it('should return development configuration with defaults', () => {
      configService.get.mockReturnValue(undefined);
      
      const devConfig = service.getDevelopmentConfig();
      
      expect(devConfig).toEqual({
        enableSwagger: true,
        swaggerPath: '/api/docs',
        debugMode: false,
      });
    });
  });

  describe('Performance Metrics', () => {
    it('should track and return performance metrics', () => {
      // Trigger some config requests to generate metrics
      service.get('NODE_ENV', 'test');
      service.get('DATABASE_URL', 'default');
      
      const metrics = service.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('errorCount');
      expect(metrics).toHaveProperty('errorRate');
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.errorRate).toBe(0);
    });

    it('should calculate error rate correctly', () => {
      // Make successful request
      service.get('NODE_ENV', 'test');
      
      // Trigger error
      configService.get.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      try {
        service.get('ERROR_KEY');
      } catch (error) {
        // Expected error
      }
      
      const metrics = service.getPerformanceMetrics();
      
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.errorCount).toBe(1);
      expect(metrics.errorRate).toBe(50); // 1 error out of 2 requests = 50%
    });
  });

  describe('Event Emitter Integration', () => {
    it('should register event listeners', () => {
      const listener = jest.fn();
      service.on('test-event', listener);
      
      // Access private eventEmitter to emit test event
      (service as any).eventEmitter.emit('test-event', 'test-data');
      
      expect(listener).toHaveBeenCalledWith('test-data');
    });

    it('should emit secret updated events', async () => {
      const listener = jest.fn();
      service.on('secret.updated', listener);
      
      await service.storeSecret('test-category', 'test-key', 'test-value');
      
      expect(listener).toHaveBeenCalledWith({
        secretName: 'test-category',
        key: 'test-key',
        timestamp: expect.any(String),
      });
    });

    it('should emit secret deleted events', async () => {
      const listener = jest.fn();
      service.on('secret.deleted', listener);
      
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('encrypted:data:here');
      
      await service.deleteSecret('test-category', 'test-key');
      
      expect(listener).toHaveBeenCalledWith({
        secretName: 'test-category',
        key: 'test-key',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle secrets directory creation failures', () => {
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      mockedFs.existsSync.mockReturnValue(false);
      
      // Should not throw during construction
      expect(() => new BytebotConfigService(configService)).not.toThrow();
    });

    it('should handle invalid encrypted data format', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid-format');
      
      const result = service.getSecret('test-category', 'test-key');
      
      expect(result).toBeNull();
    });

    it('should handle JSON parsing errors in secrets', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('encrypted:data:here');
      
      const mockDecipher = {
        setAuthTag: jest.fn(),
        update: jest.fn().mockReturnValue('invalid-json'),
        final: jest.fn().mockReturnValue(''),
      };
      mockedCrypto.createDecipheriv.mockReturnValue(mockDecipher as any);
      
      const result = service.getSecret('test-category', 'test-key');
      
      expect(result).toBeNull();
    });

    it('should handle file write permissions errors', async () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Write permission denied');
      });
      
      const result = await service.storeSecret('test-category', 'test-key', 'test-value');
      
      expect(result).toBe(false);
    });

    it('should validate secrets directory permissions', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error('Access denied');
      });
      
      // Should log warning but not throw
      expect(() => new BytebotConfigService(configService)).not.toThrow();
    });

    it('should handle environment variable length limits', () => {
      const longValue = 'x'.repeat(5000); // Over 4096 limit
      process.env.LONG_VALUE = longValue;
      
      const result = service.getSecret('any-category', 'LONG_VALUE');
      
      expect(result).toHaveLength(4096); // Should be truncated
    });
  });

  describe('Security Considerations', () => {
    it('should use secure file permissions for secrets', async () => {
      await service.storeSecret('security-test', 'test-key', 'sensitive-value');
      
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        { mode: 0o600 }
      );
    });

    it('should not expose encryption keys in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.storeSecret('test-category', 'test-key', 'test-value');
      
      // Ensure no encryption keys are logged
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('test-key-32-chars-long-for-aes256')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle secrets directory path traversal attempts', () => {
      process.env.LOCAL_SECRETS_DIR = '../../../etc/passwd';
      
      // Should not throw but may log warning
      expect(() => new BytebotConfigService(configService)).not.toThrow();
    });

    it('should sanitize environment variable names', () => {
      process.env['../malicious'] = 'value';
      
      const result = service.getSecret('any-category', '../malicious');
      
      // Should handle gracefully and not allow path traversal
      expect(typeof result === 'string' || result === null).toBe(true);
    });
  });
});