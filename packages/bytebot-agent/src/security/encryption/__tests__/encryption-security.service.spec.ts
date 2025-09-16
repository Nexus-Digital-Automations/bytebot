/**
 * Encryption Security Service Test Suite - Comprehensive Cryptographic Testing
 * 
 * Tests all encryption, decryption, key management, TLS, and cryptographic operations
 * Validates security boundaries, performance, and enterprise-grade security requirements
 * 
 * @author Claude Code
 * @version 2.0.0
 * @since Security Testing Phase
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import {
  EncryptionSecurityService,
  EncryptionAlgorithm,
  KeyDerivationFunction,
  HashAlgorithm,
  EncryptionResult,
  DecryptionParams,
  CertificateInfo,
  TLSConfig,
} from '../encryption-security.service';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock crypto module selectively
const mockRandomBytes = jest.fn();
const mockPbkdf2Sync = jest.fn();
const mockHkdfSync = jest.fn();
const mockCreateCipheriv = jest.fn();
const mockCreateDecipheriv = jest.fn();
const mockCreateHash = jest.fn();
const mockCreateHmac = jest.fn();
const mockTimingSafeEqual = jest.fn();
const mockRandomUUID = jest.fn();
const mockX509Certificate = jest.fn();

// Mock crypto constants
(crypto as any).constants = {
  SSL_OP_NO_SSLv2: 0x01000000,
  SSL_OP_NO_SSLv3: 0x02000000,
  SSL_OP_NO_TLSv1: 0x04000000,
  SSL_OP_NO_TLSv1_1: 0x10000000,
};

// Replace crypto functions with mocks
Object.defineProperty(crypto, 'randomBytes', { value: mockRandomBytes });
Object.defineProperty(crypto, 'pbkdf2Sync', { value: mockPbkdf2Sync });
Object.defineProperty(crypto, 'hkdfSync', { value: mockHkdfSync });
Object.defineProperty(crypto, 'createCipheriv', { value: mockCreateCipheriv });
Object.defineProperty(crypto, 'createDecipheriv', { value: mockCreateDecipheriv });
Object.defineProperty(crypto, 'createHash', { value: mockCreateHash });
Object.defineProperty(crypto, 'createHmac', { value: mockCreateHmac });
Object.defineProperty(crypto, 'timingSafeEqual', { value: mockTimingSafeEqual });
Object.defineProperty(crypto, 'randomUUID', { value: mockRandomUUID });
Object.defineProperty(crypto, 'X509Certificate', { value: mockX509Certificate });

describe('EncryptionSecurityService', () => {
  let service: EncryptionSecurityService;
  let configService: jest.Mocked<ConfigService>;
  let module: TestingModule;

  const mockLogger = {
    log: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  };

  const defaultConfig = {
    'encryption.tls.version': 'TLSv1.3',
    'encryption.tls.cipherSuites': [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
    ],
    'encryption.tls.enableMutualTLS': false,
    'encryption.tls.clientCertificateRequired': false,
    'encryption.random.useHardwareRandom': false,
    'encryption.random.entropySource': 'system',
    'encryption.masterPassword': 'test-master-password',
    'encryption.masterSalt': 'test-master-salt',
  };

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Configure mock ConfigService
    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        return defaultConfig[key] ?? defaultValue;
      }),
    };

    // Configure crypto mocks with realistic responses
    mockRandomBytes.mockReturnValue(Buffer.from('random-bytes-32-chars-test-data'));
    mockPbkdf2Sync.mockReturnValue(Buffer.from('derived-key-32-chars-test-data-'));
    mockHkdfSync.mockReturnValue(Buffer.from('hkdf-key-32-chars-test-data-here'));
    mockRandomUUID.mockReturnValue('test-uuid-1234-5678-9012-345678901234');
    mockTimingSafeEqual.mockReturnValue(true);

    // Mock cipher operations
    const mockCipher = {
      update: jest.fn().mockReturnValue(Buffer.from('encrypted-chunk')),
      final: jest.fn().mockReturnValue(Buffer.from('final-chunk')),
      setAAD: jest.fn(),
      getAuthTag: jest.fn().mockReturnValue(Buffer.from('auth-tag-16-bytes')),
    };

    const mockDecipher = {
      update: jest.fn().mockReturnValue(Buffer.from('decrypted-chunk')),
      final: jest.fn().mockReturnValue(Buffer.from('final-chunk')),
      setAAD: jest.fn(),
      setAuthTag: jest.fn(),
    };

    mockCreateCipheriv.mockReturnValue(mockCipher);
    mockCreateDecipheriv.mockReturnValue(mockDecipher);

    // Mock hash operations
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue(Buffer.from('hash-result-32-chars-test-data')),
    };

    const mockHmac = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue(Buffer.from('hmac-result-32-chars-test-data')),
    };

    mockCreateHash.mockReturnValue(mockHash);
    mockCreateHmac.mockReturnValue(mockHmac);

    // Mock X509Certificate
    const mockCertificate = {
      subject: 'CN=test.example.com,C=US,ST=CA,L=San Francisco,O=Test Org,OU=IT',
      issuer: 'CN=Test CA,C=US,ST=CA,L=San Francisco,O=Test CA',
      validFrom: '2023-01-01T00:00:00.000Z',
      validTo: '2025-01-01T00:00:00.000Z',
      serialNumber: '1234567890abcdef',
      raw: Buffer.from('cert-data'),
      publicKey: {
        asymmetricKeyType: 'rsa',
        symmetricKeySize: 2048,
      },
    };

    mockX509Certificate.mockImplementation(() => mockCertificate);

    // Mock fs operations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (path.includes('.pem') || path.includes('.crt')) {
        return '-----BEGIN CERTIFICATE-----\ntest-certificate-data\n-----END CERTIFICATE-----';
      }
      return Buffer.from('file-content');
    });

    module = await Test.createTestingModule({
      providers: [
        EncryptionSecurityService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    })
      .setLogger(mockLogger as any)
      .compile();

    configService = module.get<ConfigService>(ConfigService) as jest.Mocked<ConfigService>;
    service = module.get<EncryptionSecurityService>(EncryptionSecurityService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith('Encryption Security Service initializing...');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Encryption Security Service initialized successfully',
        expect.objectContaining({
          tlsVersion: 'TLSv1.3',
          mutualTLSEnabled: false,
          defaultAlgorithm: EncryptionAlgorithm.AES_256_GCM,
          keyRotationEnabled: true,
        })
      );
    });

    it('should load TLS configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith('encryption.tls.version', 'TLSv1.3');
      expect(configService.get).toHaveBeenCalledWith('encryption.tls.enableMutualTLS', false);
      expect(configService.get).toHaveBeenCalledWith('encryption.random.useHardwareRandom', false);
    });

    it('should initialize master key and salt', () => {
      expect(mockPbkdf2Sync).toHaveBeenCalledWith(
        'test-master-password',
        expect.any(Buffer),
        100000,
        32,
        'sha512'
      );
      expect(mockRandomBytes).toHaveBeenCalledWith(32);
    });
  });

  describe('Data Encryption', () => {
    const testData = 'sensitive-test-data';
    const testPassword = 'test-encryption-password';

    it('should encrypt string data with default algorithm', () => {
      const result = service.encryptData(testData);

      expect(result).toBeDefined();
      expect(result.algorithm).toBe(EncryptionAlgorithm.AES_256_GCM);
      expect(result.encrypted).toBeInstanceOf(Buffer);
      expect(result.iv).toBeInstanceOf(Buffer);
      expect(result.salt).toBeInstanceOf(Buffer);
      expect(result.tag).toBeInstanceOf(Buffer);
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
      expect(result.metadata.version).toBe('2.0.0');
    });

    it('should encrypt Buffer data with password-based key derivation', () => {
      const dataBuffer = Buffer.from(testData);
      
      const result = service.encryptData(
        dataBuffer,
        testPassword,
        EncryptionAlgorithm.AES_256_GCM,
        KeyDerivationFunction.PBKDF2
      );

      expect(result).toBeDefined();
      expect(result.keyDerivationParams?.function).toBe(KeyDerivationFunction.PBKDF2);
      expect(result.keyDerivationParams?.iterations).toBe(100000);
      expect(mockPbkdf2Sync).toHaveBeenCalledWith(
        testPassword,
        expect.any(Buffer),
        100000,
        32,
        'sha512'
      );
    });

    it('should support different encryption algorithms', () => {
      const algorithms = [
        EncryptionAlgorithm.AES_256_GCM,
        EncryptionAlgorithm.AES_256_CBC,
        EncryptionAlgorithm.CHACHA20_POLY1305,
        EncryptionAlgorithm.AES_128_GCM,
      ];

      algorithms.forEach((algorithm) => {
        const result = service.encryptData(testData, undefined, algorithm);
        expect(result.algorithm).toBe(algorithm);
      });
    });

    it('should support different key derivation functions', () => {
      const result = service.encryptData(
        testData,
        testPassword,
        EncryptionAlgorithm.AES_256_GCM,
        KeyDerivationFunction.SCRYPT
      );

      expect(result.keyDerivationParams?.function).toBe(KeyDerivationFunction.SCRYPT);
    });

    it('should handle encryption errors gracefully', () => {
      mockCreateCipheriv.mockImplementationOnce(() => {
        throw new Error('Cipher creation failed');
      });

      expect(() => {
        service.encryptData(testData);
      }).toThrow('Encryption failed: Cipher creation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Encryption operation failed'),
        expect.objectContaining({
          error: 'Cipher creation failed',
        })
      );
    });

    it('should log encryption operations with performance metrics', () => {
      service.encryptData(testData);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting encryption operation'),
        expect.objectContaining({
          algorithm: EncryptionAlgorithm.AES_256_GCM,
          dataLength: testData.length,
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Encryption operation completed'),
        expect.objectContaining({
          encryptedSize: expect.any(Number),
          processingTimeMs: expect.any(String),
        })
      );
    });
  });

  describe('Data Decryption', () => {
    const testPassword = 'test-encryption-password';

    let mockEncryptionResult: EncryptionResult;
    let mockDecryptionParams: DecryptionParams;

    beforeEach(() => {
      mockEncryptionResult = {
        encrypted: Buffer.from('encrypted-data'),
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        iv: Buffer.from('initialization-vector-16'),
        tag: Buffer.from('authentication-tag'),
        salt: Buffer.from('salt-32-chars-for-key-derivation'),
        keyDerivationParams: {
          function: KeyDerivationFunction.PBKDF2,
          iterations: 100000,
        },
        metadata: {
          timestamp: new Date(),
          version: '2.0.0',
        },
      };

      mockDecryptionParams = {
        encrypted: mockEncryptionResult.encrypted,
        algorithm: mockEncryptionResult.algorithm,
        iv: mockEncryptionResult.iv,
        tag: mockEncryptionResult.tag,
        salt: mockEncryptionResult.salt,
        keyDerivationParams: mockEncryptionResult.keyDerivationParams,
      };
    });

    it('should decrypt data with password-based key derivation', () => {
      const result = service.decryptData(mockDecryptionParams, testPassword);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockPbkdf2Sync).toHaveBeenCalledWith(
        testPassword,
        mockDecryptionParams.salt,
        100000,
        32,
        'sha512'
      );
    });

    it('should decrypt data with master key derivation', () => {
      const paramsWithoutPassword = {
        ...mockDecryptionParams,
        keyDerivationParams: undefined,
      };

      const result = service.decryptData(paramsWithoutPassword);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockHkdfSync).toHaveBeenCalledWith(
        'sha512',
        expect.any(Buffer), // master key
        mockDecryptionParams.salt,
        `bytebot-encryption-${mockDecryptionParams.algorithm}`,
        32
      );
    });

    it('should handle insufficient decryption parameters', () => {
      const invalidParams = {
        encrypted: Buffer.from('data'),
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        iv: Buffer.from('iv'),
      };

      expect(() => {
        service.decryptData(invalidParams);
      }).toThrow('Insufficient parameters for key derivation');
    });

    it('should handle decryption errors gracefully', () => {
      mockCreateDecipheriv.mockImplementationOnce(() => {
        throw new Error('Decipher creation failed');
      });

      expect(() => {
        service.decryptData(mockDecryptionParams, testPassword);
      }).toThrow('Decryption failed: Decipher creation failed');
    });

    it('should log decryption operations with performance metrics', () => {
      service.decryptData(mockDecryptionParams, testPassword);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Starting decryption operation'),
        expect.objectContaining({
          algorithm: mockDecryptionParams.algorithm,
          encryptedSize: mockDecryptionParams.encrypted.length,
        })
      );
    });
  });

  describe('Hash Generation and Verification', () => {
    const testData = 'data-to-hash';
    const testSalt = Buffer.from('salt-for-hashing');

    it('should generate secure hash with default algorithm', () => {
      const result = service.generateSecureHash(testData);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockCreateHash).toHaveBeenCalledWith(HashAlgorithm.SHA256);
    });

    it('should generate secure hash with salt', () => {
      const result = service.generateSecureHash(testData, HashAlgorithm.SHA512, testSalt);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockCreateHash).toHaveBeenCalledWith(HashAlgorithm.SHA512);
    });

    it('should support different hash algorithms', () => {
      const algorithms = [
        HashAlgorithm.SHA256,
        HashAlgorithm.SHA384,
        HashAlgorithm.SHA512,
        HashAlgorithm.BLAKE2B,
      ];

      algorithms.forEach((algorithm) => {
        service.generateSecureHash(testData, algorithm);
        expect(mockCreateHash).toHaveBeenCalledWith(algorithm);
      });
    });

    it('should generate HMAC with default algorithm', () => {
      const key = Buffer.from('hmac-key');
      const result = service.generateHMAC(testData, key);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockCreateHmac).toHaveBeenCalledWith(HashAlgorithm.SHA256, key);
    });

    it('should verify HMAC signature correctly', () => {
      const key = Buffer.from('hmac-key');
      const signature = Buffer.from('hmac-signature');

      const result = service.verifyHMAC(testData, signature, key);

      expect(result).toBe(true);
      expect(mockTimingSafeEqual).toHaveBeenCalledWith(
        signature,
        expect.any(Buffer)
      );
    });
  });

  describe('Secure Random Generation', () => {
    it('should generate secure random bytes', () => {
      const size = 32;
      const result = service.generateSecureRandom(size);

      expect(result).toBeInstanceOf(Buffer);
      expect(mockRandomBytes).toHaveBeenCalledWith(size);
    });

    it('should handle random generation errors', () => {
      mockRandomBytes.mockImplementationOnce(() => {
        throw new Error('Random generation failed');
      });

      expect(() => {
        service.generateSecureRandom(32);
      }).toThrow('Random generation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to generate secure random bytes',
        expect.objectContaining({
          error: 'Random generation failed',
          size: 32,
        })
      );
    });
  });

  describe('Certificate Analysis', () => {
    const testCertPath = '/path/to/certificate.pem';

    it('should analyze certificate information successfully', () => {
      const result = service.analyzeCertificate(testCertPath);

      expect(result).toBeDefined();
      expect(result.subject.commonName).toBe('test.example.com');
      expect(result.issuer.commonName).toBe('Test CA');
      expect(result.validity.isValid).toBeDefined();
      expect(result.validity.daysUntilExpiry).toBeGreaterThan(0);
      expect(result.fingerprint.sha1).toBeDefined();
      expect(result.fingerprint.sha256).toBeDefined();
    });

    it('should handle non-existent certificate file', () => {
      mockFs.existsSync.mockReturnValueOnce(false);

      expect(() => {
        service.analyzeCertificate(testCertPath);
      }).toThrow(`Certificate file not found: ${testCertPath}`);
    });

    it('should handle certificate parsing errors', () => {
      mockX509Certificate.mockImplementationOnce(() => {
        throw new Error('Certificate parsing failed');
      });

      expect(() => {
        service.analyzeCertificate(testCertPath);
      }).toThrow('Certificate parsing failed');
    });

    it('should log certificate analysis', () => {
      service.analyzeCertificate(testCertPath);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Certificate analyzed successfully',
        expect.objectContaining({
          subject: 'test.example.com',
          issuer: 'Test CA',
          isValid: expect.any(Boolean),
          daysUntilExpiry: expect.any(Number),
        })
      );
    });
  });

  describe('TLS Configuration Generation', () => {
    it('should generate TLS configuration with defaults', () => {
      const config = service.generateTLSConfiguration();

      expect(config).toBeDefined();
      expect(config.minVersion).toBe('TLSv1.2');
      expect(config.maxVersion).toBe('TLSv1.3');
      expect(config.honorCipherOrder).toBe(true);
      expect(config.secureProtocol).toBe('TLSv1_2_method');
    });

    it('should generate TLS configuration with overrides', () => {
      const options = {
        minVersion: 'TLSv1.3' as const,
        enableMutualTLS: true,
        clientCertificateRequired: true,
      };

      const config = service.generateTLSConfiguration(options);

      expect(config.minVersion).toBe('TLSv1.3');
      expect(config.requestCert).toBe(true);
      expect(config.rejectUnauthorized).toBe(true);
    });

    it('should read certificate files when paths provided', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'encryption.tls.certificatePath') return '/path/to/cert.pem';
        if (key === 'encryption.tls.privateKeyPath') return '/path/to/key.pem';
        return defaultConfig[key] ?? defaultValue;
      });

      // Create new service instance with certificate paths
      const newService = new EncryptionSecurityService(configService);
      const config = newService.generateTLSConfiguration();

      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/cert.pem');
      expect(mockFs.readFileSync).toHaveBeenCalledWith('/path/to/key.pem');
      expect(config.cert).toBeDefined();
      expect(config.key).toBeDefined();
    });

    it('should log TLS configuration generation', () => {
      service.generateTLSConfiguration();

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'TLS configuration generated',
        expect.objectContaining({
          minVersion: expect.any(String),
          maxVersion: expect.any(String),
          mutualTLS: expect.any(Boolean),
          cipherCount: expect.any(Number),
        })
      );
    });
  });

  describe('Key Rotation', () => {
    beforeEach(() => {
      // Mock setInterval to prevent actual scheduling
      jest.spyOn(global, 'setInterval').mockImplementation(() => ({} as any));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should rotate all keys due for rotation', () => {
      service.rotateKeys();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Starting key rotation process',
        { keyId: undefined }
      );

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Key rotation process completed',
        expect.objectContaining({
          keyId: undefined,
          processingTimeMs: expect.any(String),
        })
      );
    });

    it('should handle key rotation errors', () => {
      // Mock an error during key rotation
      mockRandomUUID.mockImplementationOnce(() => {
        throw new Error('Key rotation failed');
      });

      expect(() => {
        service.rotateKeys('test-key-id');
      }).toThrow('Key rotation failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Key rotation process failed',
        expect.objectContaining({
          keyId: 'test-key-id',
          error: 'Key rotation failed',
        })
      );
    });
  });

  describe('Health Status', () => {
    it('should return comprehensive health status', () => {
      const health = service.getHealthStatus();

      expect(health).toEqual({
        status: 'healthy',
        masterKeyStatus: 'active',
        activeKeys: expect.any(Number),
        keysNeedingRotation: expect.any(Number),
        tlsConfigured: expect.any(Boolean),
        mutualTLSEnabled: expect.any(Boolean),
      });
    });
  });

  describe('Performance and Security Boundaries', () => {
    it('should handle large data encryption efficiently', () => {
      const largeData = Buffer.alloc(1024 * 1024, 'large-test-data'); // 1MB
      const startTime = Date.now();

      const result = service.encryptData(largeData);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should prevent timing attacks in HMAC verification', () => {
      const key = Buffer.from('hmac-key');
      const data = 'test-data';
      const correctSignature = Buffer.from('correct-signature');
      const incorrectSignature = Buffer.from('incorrect-signature');

      // Mock timing-safe equal to return false for incorrect signature
      mockTimingSafeEqual.mockReturnValueOnce(false);

      const result1 = service.verifyHMAC(data, incorrectSignature, key);
      const result2 = service.verifyHMAC(data, correctSignature, key);

      expect(result1).toBe(false);
      expect(result2).toBe(true);
      expect(mockTimingSafeEqual).toHaveBeenCalledTimes(2);
    });

    it('should secure sensitive data in memory', () => {
      const sensitiveData = 'very-sensitive-password';
      const result = service.encryptData(sensitiveData);

      // Verify sensitive data is not logged in plaintext
      expect(mockLogger.debug).not.toHaveBeenCalledWith(
        expect.stringContaining(sensitiveData)
      );

      // Verify encryption result doesn't expose plaintext
      expect(result.encrypted.toString()).not.toContain(sensitiveData);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid algorithm gracefully', () => {
      const invalidAlgorithm = 'invalid-algorithm' as EncryptionAlgorithm;

      expect(() => {
        service.encryptData('test', undefined, invalidAlgorithm);
      }).toThrow();
    });

    it('should handle corrupted encrypted data', () => {
      const corruptedParams: DecryptionParams = {
        encrypted: Buffer.from('corrupted-data'),
        algorithm: EncryptionAlgorithm.AES_256_GCM,
        iv: Buffer.from('invalid-iv'),
        tag: Buffer.from('invalid-tag'),
        salt: Buffer.from('invalid-salt'),
      };

      expect(() => {
        service.decryptData(corruptedParams);
      }).toThrow();
    });

    it('should handle insufficient entropy scenarios', () => {
      mockRandomBytes.mockImplementationOnce(() => {
        throw new Error('Insufficient entropy');
      });

      expect(() => {
        service.generateSecureRandom(32);
      }).toThrow('Insufficient entropy');
    });

    it('should validate certificate expiry correctly', () => {
      // Mock expired certificate
      const expiredCertificate = {
        subject: 'CN=expired.example.com',
        issuer: 'CN=Test CA',
        validFrom: '2020-01-01T00:00:00.000Z',
        validTo: '2021-01-01T00:00:00.000Z', // Expired
        serialNumber: 'expired123',
        raw: Buffer.from('expired-cert-data'),
        publicKey: {
          asymmetricKeyType: 'rsa',
          symmetricKeySize: 2048,
        },
      };

      mockX509Certificate.mockImplementationOnce(() => expiredCertificate);

      const result = service.analyzeCertificate('/path/to/expired.pem');

      expect(result.validity.isValid).toBe(false);
      expect(result.validity.daysUntilExpiry).toBeLessThan(0);
    });
  });
});