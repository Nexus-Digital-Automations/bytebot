/**
 * Encryption Service Mock Implementation
 *
 * Mock implementation for encryption/decryption testing including:
 * - AES-256-GCM encryption/decryption
 * - Key derivation and management
 * - Secure random generation
 * - Hash generation (SHA-256, HMAC)
 * - Digital signature verification
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { MockConfig } from "./mock-config";

// Jest-agnostic mock function type
type MockFunction<T extends (...args: unknown[]) => unknown> = T & {
  mockImplementation?: (impl: T) => void;
  mockReturnValue?: (value: ReturnType<T>) => void;
  mockResolvedValue?: (value: Awaited<ReturnType<T>>) => void;
  mockClear?: () => void;
  mockReset?: () => void;
  mockRestore?: () => void;
};

// Check if Jest is available
const isJestAvailable = typeof jest !== "undefined";

// Create mock function that works with or without Jest
const createMockFn = <T extends (...args: unknown[]) => unknown>(
  impl: T,
): MockFunction<T> => {
  if (isJestAvailable) {
    return jest.fn(impl) as unknown as MockFunction<T>;
  }

  // Fallback implementation when Jest is not available
  const mockFn = impl as MockFunction<T>;
  mockFn.mockImplementation = () => {};
  mockFn.mockReturnValue = () => {};
  mockFn.mockResolvedValue = () => {};
  mockFn.mockClear = () => {};
  mockFn.mockReset = () => {};
  mockFn.mockRestore = () => {};

  return mockFn;
};

export interface EncryptionServiceMock {
  encrypt: MockFunction<
    (
      plaintext: string,
      key?: string,
    ) => Promise<{ encrypted: string; iv: string; tag: string }>
  >;
  decrypt: MockFunction<
    (
      encrypted: string,
      iv: string,
      tag: string,
      key?: string,
    ) => Promise<string>
  >;
  generateKey: MockFunction<() => Promise<string>>;
  deriveKey: MockFunction<
    (password: string, salt: string, iterations?: number) => Promise<string>
  >;
  generateSalt: MockFunction<(length?: number) => string>;
  generateIV: MockFunction<() => string>;
  hash: MockFunction<(data: string, algorithm?: string) => string>;
  hmac: MockFunction<(data: string, key: string, algorithm?: string) => string>;
  verifySignature: MockFunction<
    (data: string, signature: string, publicKey: string) => boolean
  >;
  generateKeyPair: MockFunction<
    () => Promise<{ publicKey: string; privateKey: string }>
  >;
}

/**
 * Creates a comprehensive encryption service mock
 */
export const createEncryptionServiceMock = (): EncryptionServiceMock => {
  return {
    encrypt: createMockFn(
      (
        plaintext: string,
        _key?: string,
      ): Promise<{ encrypted: string; iv: string; tag: string }> => {
        // Simulate encryption with base64 encoding for testing
        const mockIV = Buffer.from(
          Array.from({ length: MockConfig.encryption.ivLength }, () =>
            Math.floor(Math.random() * 256),
          ),
        ).toString("base64");
        const mockTag = Buffer.from(
          Array.from({ length: MockConfig.encryption.tagLength }, () =>
            Math.floor(Math.random() * 256),
          ),
        ).toString("base64");
        const mockEncrypted = Buffer.from(plaintext).toString("base64");

        return Promise.resolve({
          encrypted: mockEncrypted,
          iv: mockIV,
          tag: mockTag,
        });
      },
    ),

    decrypt: jest.fn(
      (
        encrypted: string,
        _iv: string,
        _tag: string,
        _key?: string,
      ): Promise<string> => {
        // Simulate decryption by base64 decoding for testing
        try {
          return Promise.resolve(
            Buffer.from(encrypted, "base64").toString("utf8"),
          );
        } catch {
          return Promise.reject(
            new Error("Decryption failed - invalid encrypted data"),
          );
        }
      },
    ),

    generateKey: jest.fn((): Promise<string> => {
      // Generate a mock 256-bit key (32 bytes)
      const keyBytes = Array.from(
        { length: MockConfig.encryption.keyLength },
        () => Math.floor(Math.random() * 256),
      );
      return Promise.resolve(Buffer.from(keyBytes).toString("base64"));
    }),

    deriveKey: jest.fn(
      (
        password: string,
        salt: string,
        iterations: number = 100000,
      ): Promise<string> => {
        // Mock key derivation using PBKDF2
        const mockKey = Buffer.from(`${password}:${salt}:${iterations}`)
          .toString("base64")
          .slice(0, 44); // 32 bytes base64
        return Promise.resolve(mockKey);
      },
    ),

    generateSalt: jest.fn((length: number = 32): string => {
      // Generate random salt
      const saltBytes = Array.from({ length }, () =>
        Math.floor(Math.random() * 256),
      );
      return Buffer.from(saltBytes).toString("base64");
    }),

    generateIV: jest.fn((): string => {
      // Generate random initialization vector
      const ivBytes = Array.from(
        { length: MockConfig.encryption.ivLength },
        () => Math.floor(Math.random() * 256),
      );
      return Buffer.from(ivBytes).toString("base64");
    }),

    hash: jest.fn((data: string, algorithm: string = "sha256"): string => {
      // Mock hash generation - in tests, just return a deterministic hash-like string
      const mockHash = Buffer.from(`${algorithm}:${data}`).toString("base64");
      return mockHash.slice(0, 64); // Simulate SHA-256 hex length
    }),

    hmac: jest.fn(
      (data: string, key: string, algorithm: string = "sha256"): string => {
        // Mock HMAC generation
        const mockHmac = Buffer.from(`${algorithm}:${key}:${data}`).toString(
          "base64",
        );
        return mockHmac.slice(0, 64); // Simulate HMAC-SHA256 hex length
      },
    ),

    verifySignature: jest.fn(
      (data: string, signature: string, publicKey: string): boolean => {
        // Mock signature verification - return true for test scenarios
        const expectedSignature = Buffer.from(`${publicKey}:${data}`)
          .toString("base64")
          .slice(0, 64);
        return signature === expectedSignature;
      },
    ),

    generateKeyPair: jest.fn(
      (): Promise<{ publicKey: string; privateKey: string }> => {
        // Mock RSA key pair generation
        const keyId = Math.random().toString(36).substring(7);
        return Promise.resolve({
          publicKey: `-----BEGIN PUBLIC KEY-----\nMOCK_PUBLIC_KEY_${keyId}\n-----END PUBLIC KEY-----`,
          privateKey: `-----BEGIN PRIVATE KEY-----\nMOCK_PRIVATE_KEY_${keyId}\n-----END PRIVATE KEY-----`,
        });
      },
    ),
  };
};

// Default mock instance
export const encryptionServiceMock = createEncryptionServiceMock();

// Mock encryption service factory with configurable behavior
export const createMockEncryptionService = (
  options: {
    shouldFailEncryption?: boolean;
    shouldFailDecryption?: boolean;
    encryptionLatency?: number;
    keyStrength?: "weak" | "strong";
  } = {},
) => {
  const {
    shouldFailEncryption = false,
    shouldFailDecryption = false,
    encryptionLatency = 0,
    keyStrength = "strong",
  } = options;

  const mock = createEncryptionServiceMock();

  // Override encrypt to simulate failures if configured
  if (shouldFailEncryption) {
    mock.encrypt = jest.fn().mockRejectedValue(new Error("Encryption failed"));
  }

  // Override decrypt to simulate failures if configured
  if (shouldFailDecryption) {
    mock.decrypt = jest.fn().mockRejectedValue(new Error("Decryption failed"));
  }

  // Add latency simulation if configured
  if (encryptionLatency > 0) {
    const originalEncrypt = mock.encrypt;
    const originalDecrypt = mock.decrypt;

    mock.encrypt = jest.fn(async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, encryptionLatency));
      return originalEncrypt(...args);
    });

    mock.decrypt = jest.fn(async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, encryptionLatency));
      return originalDecrypt(...args);
    });
  }

  // Adjust key strength if configured
  if (keyStrength === "weak") {
    mock.generateKey = jest.fn(() => {
      // Generate weak key for testing purposes
      return Promise.resolve(Buffer.from("weak_test_key").toString("base64"));
    });
  }

  return mock;
};

// Utility functions for encryption testing
export const EncryptionTestUtils = {
  /**
   * Create test data for encryption scenarios
   */
  createTestData: (size: "small" | "medium" | "large" = "small") => {
    const sizes = {
      small: 100,
      medium: 1000,
      large: 10000,
    };

    const length = sizes[size];
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  },

  /**
   * Validate mock encryption response format
   */
  validateEncryptionResponse: (response: {
    encrypted: string;
    iv: string;
    tag: string;
  }): boolean => {
    return !!(
      response &&
      typeof response.encrypted === "string" &&
      typeof response.iv === "string" &&
      typeof response.tag === "string" &&
      response.encrypted.length > 0 &&
      response.iv.length > 0 &&
      response.tag.length > 0
    );
  },

  /**
   * Create deterministic test key for consistent testing
   */
  createTestKey: (seed: string = "test"): string => {
    return Buffer.from(`test_key_${seed}_${MockConfig.encryption.keyLength}`)
      .toString("base64")
      .slice(0, 44);
  },
};
