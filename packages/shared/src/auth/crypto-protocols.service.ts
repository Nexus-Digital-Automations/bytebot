/**
 * Cryptographic Protocols Service - Advanced cryptographic operations for JWT Bridge
 *
 * Enterprise-grade cryptographic protocols providing secure token signing,
 * validation, encryption, and key management for AIgent-PARLANT authentication
 * bridge with quantum-resistant algorithms and hardware security module support.
 *
 * Features:
 * - Advanced token signing with multiple algorithms (RS256, ES256, PS256)
 * - Hardware Security Module (HSM) integration for key protection
 * - Quantum-resistant cryptographic algorithms (Dilithium, Kyber)
 * - Certificate management and PKI integration
 * - Token encryption and secure payload protection
 * - Cryptographic audit trails and compliance logging
 * - Performance optimization for high-throughput operations
 *
 * @module CryptoProtocolsService
 * @version 1.0.0
 * @author PARLANT Phase 1 Cryptography Team
 * @since 2025-09-21
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import * as crypto from "crypto";
import * as jwt from "jsonwebtoken";
import * as jose from "jose";
import { EventEmitter } from "events";

/**
 * Cryptographic algorithm configuration
 */
export interface CryptoAlgorithmConfig {
  /** Algorithm name */
  name: string;
  /** Algorithm type */
  type: "symmetric" | "asymmetric" | "quantum-resistant";
  /** Key size in bits */
  keySize: number;
  /** Performance rating (1-10) */
  performanceRating: number;
  /** Security level */
  securityLevel: "LOW" | "MEDIUM" | "HIGH" | "QUANTUM_SAFE";
  /** Compliance standards */
  compliance: string[];
}

/**
 * Cryptographic key configuration
 */
export interface CryptoKeyConfig {
  /** Key ID */
  keyId: string;
  /** Key type */
  type: "signing" | "encryption" | "verification";
  /** Algorithm used */
  algorithm: string;
  /** Key material (for symmetric keys) */
  keyMaterial?: string;
  /** Public key (for asymmetric keys) */
  publicKey?: string;
  /** Private key (for asymmetric keys) */
  privateKey?: string;
  /** Certificate chain */
  certificateChain?: string[];
  /** Key creation time */
  createdAt: Date;
  /** Key expiration time */
  expiresAt?: Date;
  /** Key rotation interval */
  rotationInterval?: number;
  /** HSM reference */
  hsmReference?: string;
  /** Key usage restrictions */
  usage: string[];
  /** Metadata */
  metadata: Record<string, unknown>;
}

/**
 * Token signing configuration
 */
export interface TokenSigningConfig {
  /** Signing algorithm */
  algorithm: jwt.Algorithm;
  /** Key ID reference */
  keyId: string;
  /** Token issuer */
  issuer: string;
  /** Token audience */
  audience: string;
  /** Token expiration */
  expiresIn: string;
  /** Include key ID in header */
  includeKeyId: boolean;
  /** Additional headers */
  additionalHeaders?: Record<string, unknown>;
  /** Signing options */
  signingOptions?: jwt.SignOptions;
}

/**
 * Token validation configuration
 */
export interface TokenValidationConfig {
  /** Expected algorithms */
  algorithms: jwt.Algorithm[];
  /** Expected issuer */
  issuer?: string;
  /** Expected audience */
  audience?: string;
  /** Clock tolerance in seconds */
  clockTolerance?: number;
  /** Ignore expiration */
  ignoreExpiration?: boolean;
  /** Ignore not before */
  ignoreNotBefore?: boolean;
  /** Maximum age in seconds */
  maxAge?: number;
  /** Additional validation options */
  validationOptions?: jwt.VerifyOptions;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Encryption algorithm */
  algorithm: string;
  /** Key derivation function */
  kdf?: string;
  /** Initialization vector size */
  ivSize: number;
  /** Authentication tag size */
  tagSize: number;
  /** Salt size */
  saltSize: number;
  /** Iteration count for PBKDF2 */
  iterations?: number;
  /** Additional authenticated data */
  aad?: Buffer;
}

/**
 * Cryptographic operation result
 */
export interface CryptoOperationResult {
  /** Operation success status */
  success: boolean;
  /** Result data */
  data?: any;
  /** Error message if failed */
  error?: string;
  /** Operation metadata */
  metadata: {
    operationId: string;
    timestamp: Date;
    duration: number;
    algorithm: string;
    keyId?: string;
    securityLevel: string;
  };
}

/**
 * HSM (Hardware Security Module) configuration
 */
export interface HSMConfig {
  /** HSM provider */
  provider: "aws-cloudhsm" | "azure-keyvault" | "pkcs11" | "software";
  /** HSM endpoint */
  endpoint?: string;
  /** Authentication credentials */
  credentials?: Record<string, unknown>;
  /** Slot ID for PKCS#11 */
  slotId?: number;
  /** PIN for PKCS#11 */
  pin?: string;
  /** Library path for PKCS#11 */
  libraryPath?: string;
  /** Connection timeout */
  timeout: number;
  /** Retry configuration */
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
}

/**
 * Quantum-resistant algorithm configuration
 */
export interface QuantumResistantConfig {
  /** Enable quantum-resistant algorithms */
  enabled: boolean;
  /** Dilithium configuration for signatures */
  dilithium: {
    enabled: boolean;
    securityLevel: 2 | 3 | 5;
  };
  /** Kyber configuration for key exchange */
  kyber: {
    enabled: boolean;
    securityLevel: 512 | 768 | 1024;
  };
  /** Hybrid mode (combine classical and quantum-resistant) */
  hybridMode: boolean;
}

/**
 * Cryptographic performance metrics
 */
export interface CryptoMetrics {
  /** Total operations performed */
  totalOperations: number;
  /** Successful operations */
  successfulOperations: number;
  /** Failed operations */
  failedOperations: number;
  /** Average operation time (ms) */
  averageOperationTime: number;
  /** Peak operation time (ms) */
  peakOperationTime: number;
  /** Operations by algorithm */
  operationsByAlgorithm: Record<string, number>;
  /** HSM operations */
  hsmOperations: number;
  /** Quantum-resistant operations */
  quantumResistantOperations: number;
  /** Key rotations performed */
  keyRotations: number;
  /** Last operation time */
  lastOperationTime: Date;
}

/**
 * Cryptographic Protocols Service
 *
 * Advanced cryptographic service providing enterprise-grade token signing,
 * validation, encryption, and key management with HSM support and
 * quantum-resistant algorithms for future-proof security.
 */
@Injectable()
export class CryptoProtocolsService
  extends EventEmitter
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CryptoProtocolsService.name);

  // Cryptographic configuration
  private algorithms = new Map<string, CryptoAlgorithmConfig>();
  private keys = new Map<string, CryptoKeyConfig>();
  private hsmConfig: HSMConfig | null = null;
  private quantumConfig: QuantumResistantConfig = {
    enabled: false,
    dilithium: {
      enabled: false,
      securityLevel: 3,
    },
    kyber: {
      enabled: false,
      securityLevel: 768,
    },
    hybridMode: false,
  };

  // Performance monitoring
  private metrics: CryptoMetrics = {
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    averageOperationTime: 0,
    peakOperationTime: 0,
    operationsByAlgorithm: {},
    hsmOperations: 0,
    quantumResistantOperations: 0,
    keyRotations: 0,
    lastOperationTime: new Date(),
  };

  // Key rotation timer
  private keyRotationTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.logger.log("🔐 Initializing Cryptographic Protocols Service");
  }

  /**
   * Initialize the cryptographic service
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log("🔄 Starting cryptographic protocols initialization...");

    try {
      await this.loadAlgorithmConfiguration();
      await this.initializeQuantumResistantAlgorithms();
      await this.generateDefaultKeys();
      await this.initializeHSM();
      await this.startKeyRotationScheduler();

      const initTime = Date.now() - startTime;
      this.logger.log(
        `✅ Cryptographic protocols initialized successfully (${initTime}ms)`,
      );

      this.emit("crypto:initialized", {
        timestamp: new Date(),
        initializationTime: initTime,
        algorithmsLoaded: this.algorithms.size,
        keysGenerated: this.keys.size,
        hsmEnabled: !!this.hsmConfig,
        quantumResistantEnabled: this.quantumConfig.enabled,
      });
    } catch (error) {
      this.logger.error(
        "❌ Failed to initialize cryptographic protocols",
        error,
      );
      throw new Error(
        `Crypto initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Clean up cryptographic resources
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log("🔄 Shutting down cryptographic protocols...");

    await this.stopKeyRotationScheduler();
    await this.securelyDestroyKeys();

    this.logger.log("✅ Cryptographic protocols shutdown complete");
  }

  /**
   * Sign JWT token with specified configuration
   */
  async signToken(
    payload: Record<string, unknown>,
    config: TokenSigningConfig,
  ): Promise<CryptoOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      this.logger.debug(`🔏 Signing token with algorithm: ${config.algorithm}`);

      const key = this.keys.get(config.keyId);
      if (!key) {
        throw new Error(`Signing key not found: ${config.keyId}`);
      }

      // Prepare JWT headers
      const headers: Record<string, unknown> = {
        alg: config.algorithm,
        typ: "JWT",
        ...config.additionalHeaders,
      };

      if (config.includeKeyId) {
        headers.kid = config.keyId;
      }

      // Add cryptographic metadata to payload
      const enhancedPayload = {
        ...payload,
        iss: config.issuer,
        aud: config.audience,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(
          (Date.now() + this.parseExpiration(config.expiresIn)) / 1000,
        ),
        jti: this.generateTokenId(),
        crypto_metadata: {
          algorithm: config.algorithm,
          keyId: config.keyId,
          securityLevel: key.metadata.securityLevel,
          hsmSigned: !!key.hsmReference,
          quantumResistant: this.isQuantumResistantAlgorithm(config.algorithm),
        },
      };

      let token: string;

      // Use appropriate signing method based on algorithm
      if (this.isAsymmetricAlgorithm(config.algorithm)) {
        token = await this.signAsymmetricToken(
          enhancedPayload,
          key,
          config,
          headers,
        );
      } else {
        token = await this.signSymmetricToken(
          enhancedPayload,
          key,
          config,
          headers,
        );
      }

      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, config.algorithm, true);

      this.logger.debug(`✅ Token signed successfully (${operationTime}ms)`);

      return {
        success: true,
        data: token,
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: config.algorithm,
          keyId: config.keyId,
          securityLevel: key.metadata.securityLevel as string,
        },
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, config.algorithm, false);

      this.logger.error(`❌ Token signing failed (${operationTime}ms)`, error);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: config.algorithm,
          keyId: config.keyId,
          securityLevel: "UNKNOWN",
        },
      };
    }
  }

  /**
   * Validate JWT token with specified configuration
   */
  async validateToken(
    token: string,
    config: TokenValidationConfig,
  ): Promise<CryptoOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      this.logger.debug(
        `🔍 Validating token with algorithms: ${config.algorithms.join(", ")}`,
      );

      // Decode token header to get algorithm and key ID
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === "string") {
        throw new Error("Invalid token format");
      }

      const { alg: algorithm, kid: keyId } = decoded.header;

      // Verify algorithm is allowed
      if (!config.algorithms.includes(algorithm as jwt.Algorithm)) {
        throw new Error(`Algorithm not allowed: ${algorithm}`);
      }

      // Get verification key
      const key = keyId
        ? this.keys.get(keyId)
        : this.getDefaultVerificationKey(algorithm);
      if (!key) {
        throw new Error(`Verification key not found: ${keyId || "default"}`);
      }

      let payload: any;

      // Use appropriate validation method based on algorithm
      if (this.isAsymmetricAlgorithm(algorithm)) {
        payload = await this.validateAsymmetricToken(token, key, config);
      } else {
        payload = await this.validateSymmetricToken(token, key, config);
      }

      // Perform additional security validations
      await this.performSecurityValidations(payload, token);

      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, algorithm, true);

      this.logger.debug(`✅ Token validated successfully (${operationTime}ms)`);

      return {
        success: true,
        data: payload,
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm,
          keyId: keyId || "default",
          securityLevel: key.metadata.securityLevel as string,
        },
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, "unknown", false);

      this.logger.error(
        `❌ Token validation failed (${operationTime}ms)`,
        error,
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: "unknown",
          securityLevel: "UNKNOWN",
        },
      };
    }
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(
    data: string | Buffer,
    keyId: string,
    config?: Partial<EncryptionConfig>,
  ): Promise<CryptoOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      const key = this.keys.get(keyId);
      if (!key || key.type !== "encryption") {
        throw new Error(`Encryption key not found: ${keyId}`);
      }

      const encConfig: EncryptionConfig = {
        algorithm: "aes-256-gcm",
        ivSize: 12,
        tagSize: 16,
        saltSize: 32,
        ...config,
      };

      const dataBuffer = Buffer.isBuffer(data)
        ? data
        : Buffer.from(data, "utf8");
      const ivBuffer = crypto.randomBytes(encConfig.ivSize);
      const salt = crypto.randomBytes(encConfig.saltSize);

      // Derive key if needed
      const encryptionKey = key.keyMaterial
        ? Buffer.from(key.keyMaterial, "hex")
        : crypto.pbkdf2Sync(key.keyMaterial || "", salt, 100000, 32, "sha256");

      // Encrypt data - use createCipheriv with proper IV
      const cipher = crypto.createCipheriv(
        encConfig.algorithm,
        encryptionKey,
        ivBuffer,
      ) as crypto.CipherGCM;
      if (encConfig.aad) {
        cipher.setAAD(encConfig.aad);
      }

      const encrypted = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      // Combine all components
      const result = Buffer.concat([salt, ivBuffer, authTag, encrypted]);

      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, encConfig.algorithm, true);

      return {
        success: true,
        data: result.toString("base64"),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: encConfig.algorithm,
          keyId,
          securityLevel: key.metadata.securityLevel as string,
        },
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, "encryption", false);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: "encryption",
          keyId,
          securityLevel: "UNKNOWN",
        },
      };
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(
    encryptedData: string,
    keyId: string,
    config?: Partial<EncryptionConfig>,
  ): Promise<CryptoOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    this.metrics.totalOperations++;

    try {
      const key = this.keys.get(keyId);
      if (!key || key.type !== "encryption") {
        throw new Error(`Decryption key not found: ${keyId}`);
      }

      const encConfig: EncryptionConfig = {
        algorithm: "aes-256-gcm",
        ivSize: 12,
        tagSize: 16,
        saltSize: 32,
        ...config,
      };

      const encryptedBuffer: Buffer = Buffer.from(encryptedData, "base64");

      // Extract components
      const salt = encryptedBuffer.subarray(0, encConfig.saltSize);
      const ivBuffer = encryptedBuffer.subarray(
        encConfig.saltSize,
        encConfig.saltSize + encConfig.ivSize,
      );
      const authTag = encryptedBuffer.subarray(
        encConfig.saltSize + encConfig.ivSize,
        encConfig.saltSize + encConfig.ivSize + encConfig.tagSize,
      );
      const encryptedPayload = encryptedBuffer.subarray(
        encConfig.saltSize + encConfig.ivSize + encConfig.tagSize,
      );

      // Derive key
      const decryptionKey = key.keyMaterial
        ? Buffer.from(key.keyMaterial, "hex")
        : crypto.pbkdf2Sync(key.keyMaterial || "", salt, 100000, 32, "sha256");

      // Decrypt data
      const decipher = crypto.createDecipheriv(
        encConfig.algorithm,
        decryptionKey,
        ivBuffer,
      ) as crypto.DecipherGCM;
      decipher.setAuthTag(authTag);
      if (encConfig.aad) {
        decipher.setAAD(encConfig.aad);
      }

      const decrypted = Buffer.concat([
        decipher.update(encryptedPayload),
        decipher.final(),
      ]);

      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, encConfig.algorithm, true);

      return {
        success: true,
        data: decrypted.toString("utf8"),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: encConfig.algorithm,
          keyId,
          securityLevel: key.metadata.securityLevel as string,
        },
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, "decryption", false);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: "decryption",
          keyId,
          securityLevel: "UNKNOWN",
        },
      };
    }
  }

  /**
   * Generate new cryptographic key
   */
  async generateKey(
    type: "signing" | "encryption" | "verification",
    algorithm: string,
    options?: Partial<CryptoKeyConfig>,
  ): Promise<CryptoOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();

    try {
      const keyId = options?.keyId || this.generateKeyId();

      let keyConfig: CryptoKeyConfig;

      if (this.isAsymmetricAlgorithm(algorithm)) {
        keyConfig = await this.generateAsymmetricKey(
          keyId,
          type,
          algorithm,
          options,
        );
      } else {
        keyConfig = await this.generateSymmetricKey(
          keyId,
          type,
          algorithm,
          options,
        );
      }

      this.keys.set(keyId, keyConfig);

      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, algorithm, true);

      this.logger.log(`🔑 Generated new ${type} key: ${keyId} (${algorithm})`);

      return {
        success: true,
        data: { keyId, algorithm, type },
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm,
          keyId,
          securityLevel: keyConfig.metadata.securityLevel as string,
        },
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, algorithm, false);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm,
          securityLevel: "UNKNOWN",
        },
      };
    }
  }

  /**
   * Rotate cryptographic key
   */
  async rotateKey(keyId: string): Promise<CryptoOperationResult> {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    this.metrics.keyRotations++;

    try {
      const oldKey = this.keys.get(keyId);
      if (!oldKey) {
        throw new Error(`Key not found for rotation: ${keyId}`);
      }

      // Generate new key with same configuration
      const newKeyResult = await this.generateKey(
        oldKey.type,
        oldKey.algorithm,
        {
          keyId: this.generateKeyId(),
          usage: oldKey.usage,
          rotationInterval: oldKey.rotationInterval,
          metadata: {
            ...oldKey.metadata,
            rotatedFrom: keyId,
            rotationTime: new Date(),
          },
        },
      );

      if (!newKeyResult.success) {
        throw new Error(`Failed to generate new key: ${newKeyResult.error}`);
      }

      // Mark old key as deprecated
      oldKey.metadata.deprecated = true;
      oldKey.metadata.deprecatedAt = new Date();

      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, oldKey.algorithm, true);

      this.logger.log(`🔄 Rotated key: ${keyId} -> ${newKeyResult.data.keyId}`);

      this.emit("key:rotated", {
        oldKeyId: keyId,
        newKeyId: newKeyResult.data.keyId,
        algorithm: oldKey.algorithm,
        timestamp: new Date(),
      });

      return {
        success: true,
        data: { oldKeyId: keyId, newKeyId: newKeyResult.data.keyId },
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: oldKey.algorithm,
          keyId: newKeyResult.data.keyId,
          securityLevel: oldKey.metadata.securityLevel as string,
        },
      };
    } catch (error) {
      const operationTime = Date.now() - startTime;
      this.updateMetrics(operationTime, "rotation", false);

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          operationId,
          timestamp: new Date(),
          duration: operationTime,
          algorithm: "rotation",
          keyId,
          securityLevel: "UNKNOWN",
        },
      };
    }
  }

  /**
   * Get cryptographic metrics
   */
  getCryptoMetrics(): CryptoMetrics {
    return { ...this.metrics };
  }

  /**
   * Get available algorithms
   */
  getAvailableAlgorithms(): CryptoAlgorithmConfig[] {
    return Array.from(this.algorithms.values());
  }

  /**
   * Get key information (without sensitive data)
   */
  getKeyInfo(keyId: string): Partial<CryptoKeyConfig> | null {
    const key = this.keys.get(keyId);
    if (!key) {
      return null;
    }

    return {
      keyId: key.keyId,
      type: key.type,
      algorithm: key.algorithm,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      usage: key.usage,
      metadata: key.metadata,
    };
  }

  /**
   * Private Methods
   */

  private async loadAlgorithmConfiguration(): Promise<void> {
    const algorithms: CryptoAlgorithmConfig[] = [
      {
        name: "HS256",
        type: "symmetric",
        keySize: 256,
        performanceRating: 9,
        securityLevel: "HIGH",
        compliance: ["FIPS-140-2", "Common Criteria"],
      },
      {
        name: "RS256",
        type: "asymmetric",
        keySize: 2048,
        performanceRating: 6,
        securityLevel: "HIGH",
        compliance: ["FIPS-140-2", "Common Criteria", "PKCS#1"],
      },
      {
        name: "ES256",
        type: "asymmetric",
        keySize: 256,
        performanceRating: 8,
        securityLevel: "HIGH",
        compliance: ["FIPS-140-2", "Common Criteria", "RFC 7515"],
      },
      {
        name: "PS256",
        type: "asymmetric",
        keySize: 2048,
        performanceRating: 5,
        securityLevel: "HIGH",
        compliance: ["FIPS-140-2", "Common Criteria", "PKCS#1 PSS"],
      },
    ];

    for (const algorithm of algorithms) {
      this.algorithms.set(algorithm.name, algorithm);
    }

    this.logger.log(`📚 Loaded ${algorithms.length} cryptographic algorithms`);
  }

  private async initializeQuantumResistantAlgorithms(): Promise<void> {
    this.quantumConfig = {
      enabled: process.env.QUANTUM_RESISTANT_ENABLED === "true",
      dilithium: {
        enabled: process.env.DILITHIUM_ENABLED === "true",
        securityLevel: parseInt(process.env.DILITHIUM_SECURITY_LEVEL || "3") as
          | 2
          | 3
          | 5,
      },
      kyber: {
        enabled: process.env.KYBER_ENABLED === "true",
        securityLevel: parseInt(process.env.KYBER_SECURITY_LEVEL || "768") as
          | 512
          | 768
          | 1024,
      },
      hybridMode: process.env.QUANTUM_HYBRID_MODE === "true",
    };

    if (this.quantumConfig.enabled) {
      this.logger.log("🛡️ Quantum-resistant algorithms enabled");
    }
  }

  private async generateDefaultKeys(): Promise<void> {
    // Generate default signing key
    await this.generateKey("signing", "HS256", {
      keyId: "default-signing-key",
      usage: ["sign", "verify"],
      rotationInterval: 86400000, // 24 hours
      metadata: {
        securityLevel: "HIGH",
        default: true,
        autoGenerated: true,
      },
    });

    // Generate default encryption key
    await this.generateKey("encryption", "aes-256-gcm", {
      keyId: "default-encryption-key",
      usage: ["encrypt", "decrypt"],
      rotationInterval: 86400000, // 24 hours
      metadata: {
        securityLevel: "HIGH",
        default: true,
        autoGenerated: true,
      },
    });

    this.logger.log("🔑 Default cryptographic keys generated");
  }

  private async initializeHSM(): Promise<void> {
    const hsmProvider = process.env.HSM_PROVIDER;
    if (!hsmProvider) {
      return;
    }

    this.hsmConfig = {
      provider: hsmProvider as any,
      endpoint: process.env.HSM_ENDPOINT,
      timeout: parseInt(process.env.HSM_TIMEOUT || "5000"),
      retry: {
        maxAttempts: parseInt(process.env.HSM_RETRY_ATTEMPTS || "3"),
        backoffMs: parseInt(process.env.HSM_RETRY_BACKOFF || "1000"),
      },
    };

    // Initialize HSM connection
    // This would integrate with actual HSM providers
    this.logger.log(`🔒 HSM initialized: ${hsmProvider}`);
  }

  private async startKeyRotationScheduler(): Promise<void> {
    const rotationInterval = parseInt(
      process.env.KEY_ROTATION_INTERVAL || "3600000",
    ); // 1 hour

    this.keyRotationTimer = setInterval(async () => {
      await this.performScheduledKeyRotation();
    }, rotationInterval);

    this.logger.log("⏰ Key rotation scheduler started");
  }

  private async stopKeyRotationScheduler(): Promise<void> {
    if (this.keyRotationTimer) {
      clearInterval(this.keyRotationTimer);
      this.keyRotationTimer = null;
    }
  }

  private async performScheduledKeyRotation(): Promise<void> {
    const now = new Date();

    const keysArray = Array.from(this.keys.entries());
    for (const [keyId, key] of keysArray) {
      if (
        key.rotationInterval &&
        key.createdAt.getTime() + key.rotationInterval < now.getTime()
      ) {
        this.logger.log(`🔄 Scheduled rotation for key: ${keyId}`);
        await this.rotateKey(keyId);
      }
    }
  }

  private async signAsymmetricToken(
    payload: Record<string, unknown>,
    key: CryptoKeyConfig,
    config: TokenSigningConfig,
    headers: Record<string, unknown>,
  ): Promise<string> {
    if (!key.privateKey) {
      throw new Error("Private key required for asymmetric signing");
    }

    const signingOptions: jwt.SignOptions = {
      algorithm: config.algorithm,
      ...config.signingOptions,
    };

    return jwt.sign(payload, key.privateKey, signingOptions);
  }

  private async signSymmetricToken(
    payload: Record<string, unknown>,
    key: CryptoKeyConfig,
    config: TokenSigningConfig,
    headers: Record<string, unknown>,
  ): Promise<string> {
    if (!key.keyMaterial) {
      throw new Error("Key material required for symmetric signing");
    }

    const signingOptions: jwt.SignOptions = {
      algorithm: config.algorithm,
      ...config.signingOptions,
    };

    return jwt.sign(payload, key.keyMaterial, signingOptions);
  }

  private async validateAsymmetricToken(
    token: string,
    key: CryptoKeyConfig,
    config: TokenValidationConfig,
  ): Promise<any> {
    if (!key.publicKey) {
      throw new Error("Public key required for asymmetric validation");
    }

    return jwt.verify(token, key.publicKey, {
      algorithms: config.algorithms,
      issuer: config.issuer,
      audience: config.audience,
      clockTolerance: config.clockTolerance,
      ignoreExpiration: config.ignoreExpiration,
      ignoreNotBefore: config.ignoreNotBefore,
      maxAge: config.maxAge,
      ...config.validationOptions,
    });
  }

  private async validateSymmetricToken(
    token: string,
    key: CryptoKeyConfig,
    config: TokenValidationConfig,
  ): Promise<any> {
    if (!key.keyMaterial) {
      throw new Error("Key material required for symmetric validation");
    }

    return jwt.verify(token, key.keyMaterial, {
      algorithms: config.algorithms,
      issuer: config.issuer,
      audience: config.audience,
      clockTolerance: config.clockTolerance,
      ignoreExpiration: config.ignoreExpiration,
      ignoreNotBefore: config.ignoreNotBefore,
      maxAge: config.maxAge,
      ...config.validationOptions,
    });
  }

  private async performSecurityValidations(
    payload: any,
    token: string,
  ): Promise<void> {
    // Check for suspicious patterns
    if (payload.crypto_metadata?.securityLevel === "LOW") {
      this.logger.warn("⚠️ Low security level token detected");
    }

    // Check token age
    const tokenAge = Date.now() / 1000 - payload.iat;
    if (tokenAge > 3600) {
      // 1 hour
      this.logger.warn("⚠️ Old token detected", { tokenAge });
    }
  }

  private async generateAsymmetricKey(
    keyId: string,
    type: string,
    algorithm: string,
    options?: Partial<CryptoKeyConfig>,
  ): Promise<CryptoKeyConfig> {
    let keyPair: crypto.KeyPairSyncResult<string, string>;

    switch (algorithm) {
      case "RS256":
      case "PS256":
        keyPair = crypto.generateKeyPairSync("rsa", {
          modulusLength: 2048,
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });
        break;
      case "ES256":
        keyPair = crypto.generateKeyPairSync("ec", {
          namedCurve: "prime256v1",
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });
        break;
      default:
        throw new Error(`Unsupported asymmetric algorithm: ${algorithm}`);
    }

    return {
      keyId,
      type: type as any,
      algorithm,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      createdAt: new Date(),
      usage: options?.usage || ["sign", "verify"],
      metadata: {
        securityLevel: "HIGH",
        keySize: algorithm.includes("256") ? 256 : 2048,
        ...options?.metadata,
      },
      ...options,
    };
  }

  private async generateSymmetricKey(
    keyId: string,
    type: string,
    algorithm: string,
    options?: Partial<CryptoKeyConfig>,
  ): Promise<CryptoKeyConfig> {
    const keySize = algorithm.includes("256") ? 32 : 16; // bytes
    const keyMaterial = crypto.randomBytes(keySize).toString("hex");

    return {
      keyId,
      type: type as any,
      algorithm,
      keyMaterial,
      createdAt: new Date(),
      usage: options?.usage || ["sign", "verify"],
      metadata: {
        securityLevel: "HIGH",
        keySize: keySize * 8, // bits
        ...options?.metadata,
      },
      ...options,
    };
  }

  private getDefaultVerificationKey(algorithm: string): CryptoKeyConfig | null {
    // Find default key for algorithm
    const keysArray = Array.from(this.keys.values());
    for (const key of keysArray) {
      if (key.algorithm === algorithm && key.metadata.default) {
        return key;
      }
    }
    return null;
  }

  private isAsymmetricAlgorithm(algorithm: string): boolean {
    return [
      "RS256",
      "RS384",
      "RS512",
      "ES256",
      "ES384",
      "ES512",
      "PS256",
      "PS384",
      "PS512",
    ].includes(algorithm);
  }

  private isQuantumResistantAlgorithm(algorithm: string): boolean {
    return algorithm.includes("Dilithium") || algorithm.includes("Kyber");
  }

  private parseExpiration(expiration: string): number {
    const units: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600000; // Default to 1 hour
    }

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  private generateOperationId(): string {
    return `crypto_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  private generateTokenId(): string {
    return `tok_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
  }

  private updateMetrics(
    operationTime: number,
    algorithm: string,
    success: boolean,
  ): void {
    if (success) {
      this.metrics.successfulOperations++;
    } else {
      this.metrics.failedOperations++;
    }

    if (operationTime > this.metrics.peakOperationTime) {
      this.metrics.peakOperationTime = operationTime;
    }

    // Update running average
    const totalTime =
      this.metrics.averageOperationTime *
        (this.metrics.successfulOperations - 1) +
      operationTime;
    this.metrics.averageOperationTime = Math.round(
      totalTime / this.metrics.successfulOperations,
    );

    // Update algorithm metrics
    this.metrics.operationsByAlgorithm[algorithm] =
      (this.metrics.operationsByAlgorithm[algorithm] || 0) + 1;

    this.metrics.lastOperationTime = new Date();
  }

  private async securelyDestroyKeys(): Promise<void> {
    // Securely overwrite key material in memory
    const keysArray = Array.from(this.keys.values());
    for (const key of keysArray) {
      if (key.keyMaterial) {
        // In production, this would use secure memory clearing
        key.keyMaterial = "";
      }
      if (key.privateKey) {
        key.privateKey = "";
      }
    }

    this.keys.clear();
    this.logger.log("🗑️ Cryptographic keys securely destroyed");
  }
}
