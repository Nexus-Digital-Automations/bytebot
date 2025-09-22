/**
 * Security Test Data Management System
 *
 * Agent 6: Comprehensive security test data management with synthetic data generation,
 * data masking, test data lifecycle management, and secure data handling.
 *
 * @author Bytebot Security Team - Agent 6
 * @version 1.0.0
 */

import crypto from 'crypto';
import {
  SecurityTestLog,
  SecurityDataConfig
} from '../types/security-test-types';

/**
 * Security Test Data Manager
 *
 * Provides comprehensive security test data management including:
 * - Synthetic test data generation
 * - Data masking and anonymization
 * - Test data lifecycle management
 * - Secure data storage and cleanup
 * - Data validation and integrity checks
 */
export class SecurityTestDataManager {
  private dataStore: Map<string, TestDataSet> = new Map();
  private dataGenerators: Map<string, DataGenerator> = new Map();
  private logs: SecurityTestLog[] = [];
  private encryptionKey: Buffer;
  private dataProfiles: Map<string, DataProfile> = new Map();

  constructor(private config: SecurityDataManagerConfig) {
    this.encryptionKey = crypto.randomBytes(32);
    this.initializeDataGenerators();
    this.initializeDataProfiles();
  }

  /**
   * Initialize data generators for different data types
   */
  private initializeDataGenerators(): void {
    // User data generator
    this.dataGenerators.set('user', {
      type: 'user',
      generate: (count: number, profile?: string) => this.generateUserData(count, profile),
      validate: (data: any) => this.validateUserData(data),
      mask: (data: any) => this.maskUserData(data)
    });

    // Authentication data generator
    this.dataGenerators.set('authentication', {
      type: 'authentication',
      generate: (count: number, profile?: string) => this.generateAuthenticationData(count, profile),
      validate: (data: any) => this.validateAuthenticationData(data),
      mask: (data: any) => this.maskAuthenticationData(data)
    });

    // Transaction data generator
    this.dataGenerators.set('transaction', {
      type: 'transaction',
      generate: (count: number, profile?: string) => this.generateTransactionData(count, profile),
      validate: (data: any) => this.validateTransactionData(data),
      mask: (data: any) => this.maskTransactionData(data)
    });

    // API data generator
    this.dataGenerators.set('api', {
      type: 'api',
      generate: (count: number, profile?: string) => this.generateAPIData(count, profile),
      validate: (data: any) => this.validateAPIData(data),
      mask: (data: any) => this.maskAPIData(data)
    });

    // Malicious data generator for security testing
    this.dataGenerators.set('malicious', {
      type: 'malicious',
      generate: (count: number, profile?: string) => this.generateMaliciousData(count, profile),
      validate: (data: any) => this.validateMaliciousData(data),
      mask: (data: any) => this.maskMaliciousData(data)
    });

    this.log('info', `Initialized ${this.dataGenerators.size} data generators`);
  }

  /**
   * Initialize data profiles for different testing scenarios
   */
  private initializeDataProfiles(): void {
    // Standard testing profile
    this.dataProfiles.set('standard', {
      name: 'standard',
      description: 'Standard security testing data profile',
      userCount: 100,
      transactionVolume: 1000,
      apiCallVolume: 5000,
      dataRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
      encryptionRequired: true,
      maskingSensitiveData: true,
      complianceLevel: 'high'
    });

    // High-volume testing profile
    this.dataProfiles.set('high-volume', {
      name: 'high-volume',
      description: 'High-volume security testing data profile',
      userCount: 10000,
      transactionVolume: 100000,
      apiCallVolume: 500000,
      dataRetention: 3 * 24 * 60 * 60 * 1000, // 3 days
      encryptionRequired: true,
      maskingSensitiveData: true,
      complianceLevel: 'high'
    });

    // Penetration testing profile
    this.dataProfiles.set('penetration', {
      name: 'penetration',
      description: 'Penetration testing data profile with attack vectors',
      userCount: 50,
      transactionVolume: 500,
      apiCallVolume: 2000,
      dataRetention: 1 * 24 * 60 * 60 * 1000, // 1 day
      encryptionRequired: true,
      maskingSensitiveData: true,
      complianceLevel: 'high',
      includeMaliciousData: true,
      attackVectors: ['sql_injection', 'xss', 'csrf', 'path_traversal', 'command_injection']
    });

    // Compliance testing profile
    this.dataProfiles.set('compliance', {
      name: 'compliance',
      description: 'Compliance testing data profile',
      userCount: 1000,
      transactionVolume: 5000,
      apiCallVolume: 10000,
      dataRetention: 30 * 24 * 60 * 60 * 1000, // 30 days
      encryptionRequired: true,
      maskingSensitiveData: true,
      complianceLevel: 'maximum',
      gdprCompliant: true,
      hipaaCompliant: true,
      pciCompliant: true
    });

    this.log('info', `Initialized ${this.dataProfiles.size} data profiles`);
  }

  /**
   * Generate test data set
   */
  async generateTestDataSet(type: string, count: number, profile?: string): Promise<TestDataSet> {
    const generator = this.dataGenerators.get(type);
    if (!generator) {
      throw new Error(`Unknown data generator type: ${type}`);
    }

    this.log('info', `Generating test data set: ${type} (count: ${count}, profile: ${profile || 'default'})`);

    const dataSetId = `${type}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const startTime = new Date();

    try {
      // Generate data
      const data = await generator.generate(count, profile);

      // Validate generated data
      const validationResult = await generator.validate(data);
      if (!validationResult.valid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Apply masking if required
      const maskedData = this.config.masking?.enabled ? await generator.mask(data) : data;

      // Encrypt sensitive data if required
      const encryptedData = this.config.encryption?.enabled ?
        await this.encryptSensitiveData(maskedData) : maskedData;

      // Create data set
      const dataSet: TestDataSet = {
        id: dataSetId,
        type,
        profile: profile || 'default',
        count,
        data: encryptedData,
        metadata: {
          generatedAt: startTime,
          validatedAt: new Date(),
          encrypted: this.config.encryption?.enabled || false,
          masked: this.config.masking?.enabled || false,
          checksum: this.calculateChecksum(encryptedData)
        },
        lifecycle: {
          created: startTime,
          lastAccessed: new Date(),
          expiresAt: new Date(Date.now() + (this.config.retention?.defaultTTL || 24 * 60 * 60 * 1000)),
          accessCount: 0,
          status: 'active'
        }
      };

      // Store data set
      this.dataStore.set(dataSetId, dataSet);

      this.log('info', `Test data set generated successfully: ${dataSetId}`);
      return dataSet;

    } catch (error) {
      this.log('error', `Test data generation failed: ${type}`, error);
      throw error;
    }
  }

  /**
   * Generate user data
   */
  private async generateUserData(count: number, profile?: string): Promise<any[]> {
    const users = [];
    const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;

    for (let i = 0; i < count; i++) {
      const user = {
        id: crypto.randomUUID(),
        username: this.generateUsername(),
        email: this.generateEmail(),
        firstName: this.generateFirstName(),
        lastName: this.generateLastName(),
        phoneNumber: this.generatePhoneNumber(),
        address: this.generateAddress(),
        dateOfBirth: this.generateDateOfBirth(),
        ssn: this.generateSSN(),
        creditCardNumber: this.generateCreditCardNumber(),
        role: this.generateUserRole(),
        permissions: this.generatePermissions(),
        isActive: Math.random() > 0.1, // 90% active users
        createdAt: this.generatePastDate(),
        lastLoginAt: this.generateRecentDate(),
        loginAttempts: Math.floor(Math.random() * 5),
        isLocked: Math.random() > 0.95, // 5% locked accounts
        twoFactorEnabled: Math.random() > 0.3, // 70% with 2FA
        securityQuestions: this.generateSecurityQuestions(),
        preferences: this.generateUserPreferences(),
        metadata: {
          userAgent: this.generateUserAgent(),
          ipAddress: this.generateIPAddress(),
          sessionId: crypto.randomUUID(),
          profileComplete: Math.random() > 0.2 // 80% complete profiles
        }
      };

      // Add compliance-specific fields if needed
      if (dataProfile?.gdprCompliant) {
        user.metadata.gdprConsent = true;
        user.metadata.consentDate = this.generateRecentDate();
      }

      if (dataProfile?.hipaaCompliant) {
        user.metadata.hipaaAuthorization = true;
        user.metadata.medicalRecordAccess = Math.random() > 0.5;
      }

      users.push(user);
    }

    return users;
  }

  /**
   * Generate authentication data
   */
  private async generateAuthenticationData(count: number, profile?: string): Promise<any[]> {
    const authData = [];
    const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;

    for (let i = 0; i < count; i++) {
      const auth = {
        id: crypto.randomUUID(),
        username: this.generateUsername(),
        passwordHash: this.generatePasswordHash(),
        salt: crypto.randomBytes(16).toString('hex'),
        algorithm: 'bcrypt',
        iterations: 10000,
        jwtSecret: crypto.randomBytes(32).toString('hex'),
        refreshToken: crypto.randomBytes(64).toString('hex'),
        accessToken: this.generateJWT(),
        tokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        mfaSecret: crypto.randomBytes(16).toString('hex'),
        mfaEnabled: Math.random() > 0.3,
        backupCodes: this.generateBackupCodes(),
        failedAttempts: Math.floor(Math.random() * 3),
        lastFailedAttempt: this.generateRecentDate(),
        lockoutUntil: Math.random() > 0.95 ? new Date(Date.now() + 30 * 60 * 1000) : null,
        passwordLastChanged: this.generatePastDate(),
        mustChangePassword: Math.random() > 0.9,
        securityEvents: this.generateSecurityEvents(),
        deviceFingerprints: this.generateDeviceFingerprints(),
        trustedDevices: this.generateTrustedDevices(),
        sessionData: {
          sessionId: crypto.randomUUID(),
          ipAddress: this.generateIPAddress(),
          userAgent: this.generateUserAgent(),
          location: this.generateLocation(),
          startTime: this.generateRecentDate(),
          lastActivity: new Date(),
          isActive: true
        }
      };

      authData.push(auth);
    }

    return authData;
  }

  /**
   * Generate transaction data
   */
  private async generateTransactionData(count: number, profile?: string): Promise<any[]> {
    const transactions = [];
    const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;

    for (let i = 0; i < count; i++) {
      const transaction = {
        id: crypto.randomUUID(),
        type: this.generateTransactionType(),
        amount: this.generateAmount(),
        currency: this.generateCurrency(),
        status: this.generateTransactionStatus(),
        description: this.generateTransactionDescription(),
        merchantId: crypto.randomUUID(),
        merchantName: this.generateMerchantName(),
        categoryCode: this.generateMerchantCategoryCode(),
        paymentMethod: this.generatePaymentMethod(),
        cardNumber: this.generateCreditCardNumber(),
        cardType: this.generateCardType(),
        authorizationCode: this.generateAuthorizationCode(),
        processorResponse: this.generateProcessorResponse(),
        riskScore: Math.floor(Math.random() * 100),
        fraudFlags: this.generateFraudFlags(),
        timestamp: this.generateTransactionDate(),
        settledAt: this.generateSettlementDate(),
        fees: this.generateFees(),
        taxes: this.generateTaxes(),
        billingAddress: this.generateAddress(),
        shippingAddress: this.generateAddress(),
        customerData: {
          customerId: crypto.randomUUID(),
          email: this.generateEmail(),
          phoneNumber: this.generatePhoneNumber(),
          ipAddress: this.generateIPAddress(),
          deviceId: crypto.randomUUID(),
          userAgent: this.generateUserAgent()
        },
        metadata: {
          channel: this.generateTransactionChannel(),
          source: this.generateTransactionSource(),
          campaignId: crypto.randomUUID(),
          referrer: this.generateReferrer(),
          sessionId: crypto.randomUUID()
        }
      };

      // Add PCI compliance fields if needed
      if (dataProfile?.pciCompliant) {
        transaction.pciCompliance = {
          tokenized: true,
          encrypted: true,
          auditTrail: crypto.randomUUID(),
          complianceLevel: 'Level 1'
        };
      }

      transactions.push(transaction);
    }

    return transactions;
  }

  /**
   * Generate API data
   */
  private async generateAPIData(count: number, profile?: string): Promise<any[]> {
    const apiData = [];

    for (let i = 0; i < count; i++) {
      const api = {
        id: crypto.randomUUID(),
        endpoint: this.generateAPIEndpoint(),
        method: this.generateHTTPMethod(),
        requestHeaders: this.generateRequestHeaders(),
        requestBody: this.generateRequestBody(),
        responseStatus: this.generateResponseStatus(),
        responseHeaders: this.generateResponseHeaders(),
        responseBody: this.generateResponseBody(),
        responseTime: Math.floor(Math.random() * 2000) + 50,
        requestSize: Math.floor(Math.random() * 10000) + 100,
        responseSize: Math.floor(Math.random() * 50000) + 200,
        timestamp: this.generateAPICallDate(),
        clientId: crypto.randomUUID(),
        apiKey: crypto.randomBytes(32).toString('hex'),
        rateLimitRemaining: Math.floor(Math.random() * 1000),
        rateLimitReset: new Date(Date.now() + 60 * 60 * 1000),
        authentication: {
          type: this.generateAuthType(),
          token: this.generateJWT(),
          userId: crypto.randomUUID(),
          scopes: this.generateAPIScopes()
        },
        security: {
          ipAddress: this.generateIPAddress(),
          userAgent: this.generateUserAgent(),
          tlsVersion: this.generateTLSVersion(),
          certificateFingerprint: crypto.randomBytes(20).toString('hex'),
          correlationId: crypto.randomUUID()
        },
        monitoring: {
          traceId: crypto.randomUUID(),
          spanId: crypto.randomUUID(),
          samplingRate: Math.random(),
          tags: this.generateMonitoringTags()
        }
      };

      apiData.push(api);
    }

    return apiData;
  }

  /**
   * Generate malicious data for security testing
   */
  private async generateMaliciousData(count: number, profile?: string): Promise<any[]> {
    const maliciousData = [];
    const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;
    const attackVectors = dataProfile?.attackVectors || ['sql_injection', 'xss', 'csrf'];

    for (let i = 0; i < count; i++) {
      const attackType = attackVectors[Math.floor(Math.random() * attackVectors.length)];

      const malicious = {
        id: crypto.randomUUID(),
        type: 'malicious_test_data',
        attackType,
        payload: this.generateMaliciousPayload(attackType),
        description: this.generateAttackDescription(attackType),
        severity: this.generateAttackSeverity(),
        category: this.generateAttackCategory(attackType),
        vectors: this.generateAttackVectors(attackType),
        mitigations: this.generateMitigations(attackType),
        testContext: {
          targetEndpoint: this.generateAPIEndpoint(),
          targetParameter: this.generateParameterName(),
          expectedBehavior: this.generateExpectedBehavior(attackType),
          successCriteria: this.generateSuccessCriteria(attackType)
        },
        metadata: {
          createdAt: new Date(),
          source: 'synthetic_generation',
          validated: false,
          safeToUse: true,
          containsRealData: false
        }
      };

      maliciousData.push(malicious);
    }

    return maliciousData;
  }

  /**
   * Retrieve test data set
   */
  async getTestDataSet(dataSetId: string): Promise<TestDataSet | null> {
    const dataSet = this.dataStore.get(dataSetId);

    if (!dataSet) {
      this.log('warn', `Test data set not found: ${dataSetId}`);
      return null;
    }

    // Check if data set has expired
    if (dataSet.lifecycle.expiresAt < new Date()) {
      this.log('info', `Test data set expired: ${dataSetId}`);
      await this.cleanupDataSet(dataSetId);
      return null;
    }

    // Update access tracking
    dataSet.lifecycle.lastAccessed = new Date();
    dataSet.lifecycle.accessCount++;

    this.log('debug', `Retrieved test data set: ${dataSetId}`);
    return dataSet;
  }

  /**
   * Mask sensitive data
   */
  async maskTestData(dataSetId: string): Promise<TestDataSet> {
    const dataSet = await this.getTestDataSet(dataSetId);
    if (!dataSet) {
      throw new Error(`Test data set not found: ${dataSetId}`);
    }

    const generator = this.dataGenerators.get(dataSet.type);
    if (!generator) {
      throw new Error(`Unknown data generator type: ${dataSet.type}`);
    }

    this.log('info', `Masking sensitive data: ${dataSetId}`);

    // Decrypt data if encrypted
    let data = dataSet.data;
    if (dataSet.metadata.encrypted) {
      data = await this.decryptSensitiveData(data);
    }

    // Apply masking
    const maskedData = await generator.mask(data);

    // Re-encrypt if needed
    const finalData = dataSet.metadata.encrypted ?
      await this.encryptSensitiveData(maskedData) : maskedData;

    // Update data set
    dataSet.data = finalData;
    dataSet.metadata.masked = true;
    dataSet.metadata.checksum = this.calculateChecksum(finalData);

    this.dataStore.set(dataSetId, dataSet);

    this.log('info', `Data masking completed: ${dataSetId}`);
    return dataSet;
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(dataSetId: string): Promise<DataValidationResult> {
    const dataSet = await this.getTestDataSet(dataSetId);
    if (!dataSet) {
      throw new Error(`Test data set not found: ${dataSetId}`);
    }

    this.log('info', `Validating data integrity: ${dataSetId}`);

    const result: DataValidationResult = {
      dataSetId,
      valid: true,
      errors: [],
      warnings: [],
      checksumValid: false,
      dataConsistent: true,
      complianceValid: true,
      timestamp: new Date()
    };

    try {
      // Verify checksum
      const currentChecksum = this.calculateChecksum(dataSet.data);
      result.checksumValid = currentChecksum === dataSet.metadata.checksum;

      if (!result.checksumValid) {
        result.errors.push('Data checksum mismatch - data may have been tampered with');
        result.valid = false;
      }

      // Validate data structure
      const generator = this.dataGenerators.get(dataSet.type);
      if (generator) {
        let data = dataSet.data;

        // Decrypt if needed for validation
        if (dataSet.metadata.encrypted) {
          data = await this.decryptSensitiveData(data);
        }

        const structureValidation = await generator.validate(data);
        if (!structureValidation.valid) {
          result.errors.push(...structureValidation.errors);
          result.valid = false;
        }
      }

      // Check compliance requirements
      const complianceCheck = await this.validateCompliance(dataSet);
      if (!complianceCheck.valid) {
        result.errors.push(...complianceCheck.errors);
        result.complianceValid = false;
        result.valid = false;
      }

      // Check data freshness
      const dataAge = Date.now() - dataSet.lifecycle.created.getTime();
      const maxAge = this.config.retention?.maxAge || 7 * 24 * 60 * 60 * 1000; // 7 days

      if (dataAge > maxAge) {
        result.warnings.push('Data set is older than recommended maximum age');
      }

      // Check access patterns
      if (dataSet.lifecycle.accessCount > 1000) {
        result.warnings.push('High access count detected - consider refreshing data set');
      }

    } catch (error) {
      result.valid = false;
      result.errors.push(`Validation error: ${(error as Error).message}`);
    }

    this.log('info', `Data integrity validation completed: ${dataSetId} - Valid: ${result.valid}`);
    return result;
  }

  /**
   * Cleanup expired data sets
   */
  async cleanupExpiredDataSets(): Promise<number> {
    this.log('info', 'Starting cleanup of expired data sets');

    let cleanedCount = 0;
    const now = new Date();

    for (const [dataSetId, dataSet] of this.dataStore) {
      if (dataSet.lifecycle.expiresAt < now || dataSet.lifecycle.status === 'expired') {
        await this.cleanupDataSet(dataSetId);
        cleanedCount++;
      }
    }

    this.log('info', `Cleanup completed. Removed ${cleanedCount} expired data sets`);
    return cleanedCount;
  }

  /**
   * Cleanup specific data set
   */
  private async cleanupDataSet(dataSetId: string): Promise<void> {
    const dataSet = this.dataStore.get(dataSetId);
    if (!dataSet) return;

    this.log('debug', `Cleaning up data set: ${dataSetId}`);

    // Secure deletion of sensitive data
    if (dataSet.metadata.encrypted) {
      // Overwrite encryption key references
      dataSet.data = null;
    }

    // Update lifecycle status
    dataSet.lifecycle.status = 'deleted';
    dataSet.lifecycle.deletedAt = new Date();

    // Remove from active storage
    this.dataStore.delete(dataSetId);

    this.log('debug', `Data set cleanup completed: ${dataSetId}`);
  }

  /**
   * Export data set for external use
   */
  async exportDataSet(dataSetId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    const dataSet = await this.getTestDataSet(dataSetId);
    if (!dataSet) {
      throw new Error(`Test data set not found: ${dataSetId}`);
    }

    this.log('info', `Exporting data set: ${dataSetId} (format: ${format})`);

    let data = dataSet.data;

    // Decrypt if encrypted
    if (dataSet.metadata.encrypted) {
      data = await this.decryptSensitiveData(data);
    }

    // Apply additional masking for export
    if (!dataSet.metadata.masked) {
      const generator = this.dataGenerators.get(dataSet.type);
      if (generator) {
        data = await generator.mask(data);
      }
    }

    // Format data
    switch (format) {
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      case 'json':
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // Data generation helper methods
  private generateUsername(): string {
    const adjectives = ['quick', 'bright', 'clever', 'fast', 'smart', 'swift', 'sharp'];
    const nouns = ['fox', 'eagle', 'wolf', 'lion', 'tiger', 'bear', 'hawk'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 9999);
    return `${adjective}_${noun}_${number}`;
  }

  private generateEmail(): string {
    const domains = ['testmail.com', 'example.org', 'testing.net', 'mockmail.io'];
    const username = this.generateUsername().replace('_', '.');
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${username}@${domain}`;
  }

  private generateFirstName(): string {
    const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica', 'William', 'Ashley'];
    return names[Math.floor(Math.random() * names.length)];
  }

  private generateLastName(): string {
    const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    return names[Math.floor(Math.random() * names.length)];
  }

  private generatePhoneNumber(): string {
    const areaCode = Math.floor(Math.random() * 800) + 200;
    const exchange = Math.floor(Math.random() * 800) + 200;
    const number = Math.floor(Math.random() * 9999);
    return `+1-${areaCode}-${exchange.toString().padStart(3, '0')}-${number.toString().padStart(4, '0')}`;
  }

  private generateAddress(): any {
    const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Maple Dr', 'Cedar Ln', 'Elm St', 'Park Ave'];
    const cities = ['Springfield', 'Riverside', 'Franklin', 'Georgetown', 'Clinton', 'Madison', 'Washington'];
    const states = ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

    return {
      street: `${Math.floor(Math.random() * 9999) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`,
      city: cities[Math.floor(Math.random() * cities.length)],
      state: states[Math.floor(Math.random() * states.length)],
      zipCode: Math.floor(Math.random() * 90000) + 10000,
      country: 'US'
    };
  }

  private generateDateOfBirth(): Date {
    const start = new Date(1950, 0, 1);
    const end = new Date(2005, 11, 31);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  private generateSSN(): string {
    // Generate fake SSN for testing (not real SSNs)
    const area = Math.floor(Math.random() * 800) + 100;
    const group = Math.floor(Math.random() * 99) + 1;
    const serial = Math.floor(Math.random() * 9999) + 1;
    return `${area.toString().padStart(3, '0')}-${group.toString().padStart(2, '0')}-${serial.toString().padStart(4, '0')}`;
  }

  private generateCreditCardNumber(): string {
    // Generate fake credit card numbers for testing
    const prefixes = ['4111', '5555', '3777', '6011']; // Test card prefixes
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const remaining = Array.from({length: 12}, () => Math.floor(Math.random() * 10)).join('');
    return prefix + remaining;
  }

  private generateUserRole(): string {
    const roles = ['user', 'admin', 'moderator', 'viewer', 'editor', 'contributor'];
    return roles[Math.floor(Math.random() * roles.length)];
  }

  private generatePermissions(): string[] {
    const allPermissions = ['read', 'write', 'delete', 'admin', 'moderate', 'edit', 'view', 'create'];
    const count = Math.floor(Math.random() * 4) + 1;
    return allPermissions.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private generatePastDate(): Date {
    const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
    const end = new Date();
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  private generateRecentDate(): Date {
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = new Date();
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  private generateSecurityQuestions(): any[] {
    const questions = [
      'What was your first pet\'s name?',
      'What is your mother\'s maiden name?',
      'What was the name of your first school?',
      'What is your favorite color?'
    ];

    return questions.slice(0, 2).map(q => ({
      question: q,
      answer: crypto.randomBytes(8).toString('hex') // Encrypted fake answers
    }));
  }

  private generateUserPreferences(): any {
    return {
      language: ['en', 'es', 'fr', 'de'][Math.floor(Math.random() * 4)],
      timezone: 'UTC',
      theme: ['light', 'dark'][Math.floor(Math.random() * 2)],
      notifications: {
        email: Math.random() > 0.3,
        sms: Math.random() > 0.7,
        push: Math.random() > 0.2
      }
    };
  }

  private generateUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  private generateIPAddress(): string {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  // Additional helper methods would continue here...
  // (Due to length constraints, showing key methods. Full implementation would include all generators)

  private generatePasswordHash(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateJWT(): string {
    const header = Buffer.from(JSON.stringify({alg: 'HS256', typ: 'JWT'})).toString('base64');
    const payload = Buffer.from(JSON.stringify({sub: crypto.randomUUID(), exp: Date.now() + 3600000})).toString('base64');
    const signature = crypto.randomBytes(32).toString('base64');
    return `${header}.${payload}.${signature}`;
  }

  private generateBackupCodes(): string[] {
    return Array.from({length: 10}, () => crypto.randomBytes(8).toString('hex'));
  }

  private generateMaliciousPayload(attackType: string): string {
    const payloads: Record<string, string[]> = {
      'sql_injection': [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UNION SELECT * FROM passwords; --",
        "admin'--",
        "' OR 1=1#"
      ],
      'xss': [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>'
      ],
      'csrf': [
        '<img src="http://malicious.com/transfer?amount=1000&to=attacker">',
        '<form action="/transfer" method="post"><input type="hidden" name="amount" value="1000"></form>',
        'fetch("/api/delete", {method: "POST", credentials: "include"})'
      ],
      'path_traversal': [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ],
      'command_injection': [
        '; cat /etc/passwd',
        '| whoami',
        '`id`',
        '$(cat /etc/passwd)',
        '; rm -rf /'
      ]
    };

    const typePayloads = payloads[attackType] || ['generic_payload'];
    return typePayloads[Math.floor(Math.random() * typePayloads.length)];
  }

  // Data encryption/decryption methods
  private async encryptSensitiveData(data: any): Promise<any> {
    if (!this.config.encryption?.enabled) return data;

    const iv = crypto.randomIV(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);

    const encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: 'aes-256-gcm'
    };
  }

  private async decryptSensitiveData(encryptedData: any): Promise<any> {
    if (!encryptedData.encrypted) return encryptedData;

    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    const decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8') + decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  private calculateChecksum(data: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  // Validation methods
  private async validateUserData(data: any[]): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [] };

    for (const user of data) {
      if (!user.id || !user.username || !user.email) {
        result.errors.push('Missing required user fields');
        result.valid = false;
      }

      if (user.email && !user.email.includes('@')) {
        result.errors.push('Invalid email format');
        result.valid = false;
      }
    }

    return result;
  }

  private async validateAuthenticationData(data: any[]): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [] };

    for (const auth of data) {
      if (!auth.id || !auth.username || !auth.passwordHash) {
        result.errors.push('Missing required authentication fields');
        result.valid = false;
      }
    }

    return result;
  }

  private async validateTransactionData(data: any[]): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [] };

    for (const transaction of data) {
      if (!transaction.id || !transaction.amount || !transaction.currency) {
        result.errors.push('Missing required transaction fields');
        result.valid = false;
      }

      if (transaction.amount <= 0) {
        result.errors.push('Invalid transaction amount');
        result.valid = false;
      }
    }

    return result;
  }

  private async validateAPIData(data: any[]): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [] };

    for (const api of data) {
      if (!api.id || !api.endpoint || !api.method) {
        result.errors.push('Missing required API fields');
        result.valid = false;
      }
    }

    return result;
  }

  private async validateMaliciousData(data: any[]): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [] };

    for (const malicious of data) {
      if (!malicious.id || !malicious.attackType || !malicious.payload) {
        result.errors.push('Missing required malicious data fields');
        result.valid = false;
      }
    }

    return result;
  }

  // Data masking methods
  private async maskUserData(data: any[]): Promise<any[]> {
    return data.map(user => ({
      ...user,
      email: this.maskEmail(user.email),
      phoneNumber: this.maskPhoneNumber(user.phoneNumber),
      ssn: this.maskSSN(user.ssn),
      creditCardNumber: this.maskCreditCard(user.creditCardNumber),
      firstName: this.maskName(user.firstName),
      lastName: this.maskName(user.lastName)
    }));
  }

  private async maskAuthenticationData(data: any[]): Promise<any[]> {
    return data.map(auth => ({
      ...auth,
      passwordHash: '***MASKED***',
      salt: '***MASKED***',
      jwtSecret: '***MASKED***',
      refreshToken: '***MASKED***',
      mfaSecret: '***MASKED***'
    }));
  }

  private async maskTransactionData(data: any[]): Promise<any[]> {
    return data.map(transaction => ({
      ...transaction,
      cardNumber: this.maskCreditCard(transaction.cardNumber),
      customerData: {
        ...transaction.customerData,
        email: this.maskEmail(transaction.customerData?.email),
        phoneNumber: this.maskPhoneNumber(transaction.customerData?.phoneNumber)
      }
    }));
  }

  private async maskAPIData(data: any[]): Promise<any[]> {
    return data.map(api => ({
      ...api,
      apiKey: '***MASKED***',
      authentication: {
        ...api.authentication,
        token: '***MASKED***'
      }
    }));
  }

  private async maskMaliciousData(data: any[]): Promise<any[]> {
    // Malicious test data doesn't typically need masking as it's synthetic
    return data;
  }

  // Masking helper methods
  private maskEmail(email: string): string {
    if (!email) return email;
    const [local, domain] = email.split('@');
    const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local.slice(-1) : '***';
    return `${maskedLocal}@${domain}`;
  }

  private maskPhoneNumber(phone: string): string {
    if (!phone) return phone;
    return phone.replace(/\d(?=\d{4})/g, '*');
  }

  private maskSSN(ssn: string): string {
    if (!ssn) return ssn;
    return ssn.replace(/\d(?=\d{4})/g, '*');
  }

  private maskCreditCard(cardNumber: string): string {
    if (!cardNumber) return cardNumber;
    return cardNumber.replace(/\d(?=\d{4})/g, '*');
  }

  private maskName(name: string): string {
    if (!name) return name;
    return name.length > 1 ? name[0] + '*'.repeat(name.length - 1) : '*';
  }

  // Compliance validation
  private async validateCompliance(dataSet: TestDataSet): Promise<ValidationResult> {
    const result: ValidationResult = { valid: true, errors: [] };

    // Check encryption requirements
    if (this.config.compliance?.requireEncryption && !dataSet.metadata.encrypted) {
      result.errors.push('Data encryption required for compliance but not enabled');
      result.valid = false;
    }

    // Check masking requirements
    if (this.config.compliance?.requireMasking && !dataSet.metadata.masked) {
      result.errors.push('Data masking required for compliance but not applied');
      result.valid = false;
    }

    // Check retention requirements
    const dataAge = Date.now() - dataSet.lifecycle.created.getTime();
    if (this.config.compliance?.maxRetention && dataAge > this.config.compliance.maxRetention) {
      result.errors.push('Data retention period exceeded compliance requirements');
      result.valid = false;
    }

    return result;
  }

  // Export format converters
  private convertToCSV(data: any[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private convertToXML(data: any[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';

    for (const item of data) {
      xml += '  <item>\n';
      for (const [key, value] of Object.entries(item)) {
        xml += `    <${key}>${this.escapeXML(String(value))}</${key}>\n`;
      }
      xml += '  </item>\n';
    }

    xml += '</data>';
    return xml;
  }

  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Additional generator methods (placeholder implementations)
  private generateSecurityEvents(): any[] { return []; }
  private generateDeviceFingerprints(): any[] { return []; }
  private generateTrustedDevices(): any[] { return []; }
  private generateLocation(): any { return { country: 'US', city: 'Unknown' }; }
  private generateTransactionType(): string { return ['purchase', 'refund', 'transfer'][Math.floor(Math.random() * 3)]; }
  private generateAmount(): number { return Math.floor(Math.random() * 10000) / 100; }
  private generateCurrency(): string { return ['USD', 'EUR', 'GBP'][Math.floor(Math.random() * 3)]; }
  private generateTransactionStatus(): string { return ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)]; }
  private generateTransactionDescription(): string { return 'Test transaction'; }
  private generateMerchantName(): string { return 'Test Merchant'; }
  private generateMerchantCategoryCode(): string { return '5411'; }
  private generatePaymentMethod(): string { return ['credit_card', 'debit_card', 'bank_transfer'][Math.floor(Math.random() * 3)]; }
  private generateCardType(): string { return ['visa', 'mastercard', 'amex'][Math.floor(Math.random() * 3)]; }
  private generateAuthorizationCode(): string { return crypto.randomBytes(6).toString('hex').toUpperCase(); }
  private generateProcessorResponse(): string { return 'APPROVED'; }
  private generateFraudFlags(): string[] { return []; }
  private generateTransactionDate(): Date { return this.generateRecentDate(); }
  private generateSettlementDate(): Date { return new Date(Date.now() + 24 * 60 * 60 * 1000); }
  private generateFees(): number { return Math.floor(Math.random() * 100) / 100; }
  private generateTaxes(): number { return Math.floor(Math.random() * 100) / 100; }
  private generateTransactionChannel(): string { return ['web', 'mobile', 'api'][Math.floor(Math.random() * 3)]; }
  private generateTransactionSource(): string { return ['direct', 'partner', 'affiliate'][Math.floor(Math.random() * 3)]; }
  private generateReferrer(): string { return 'https://example.com'; }
  private generateAPIEndpoint(): string {
    const endpoints = ['/api/users', '/api/transactions', '/api/auth', '/api/data', '/api/admin'];
    return endpoints[Math.floor(Math.random() * endpoints.length)];
  }
  private generateHTTPMethod(): string { return ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)]; }
  private generateRequestHeaders(): any { return { 'Content-Type': 'application/json' }; }
  private generateRequestBody(): any { return {}; }
  private generateResponseStatus(): number { return [200, 201, 400, 401, 404, 500][Math.floor(Math.random() * 6)]; }
  private generateResponseHeaders(): any { return { 'Content-Type': 'application/json' }; }
  private generateResponseBody(): any { return {}; }
  private generateAPICallDate(): Date { return this.generateRecentDate(); }
  private generateAuthType(): string { return ['bearer', 'basic', 'api_key'][Math.floor(Math.random() * 3)]; }
  private generateAPIScopes(): string[] { return ['read', 'write']; }
  private generateTLSVersion(): string { return ['TLS1.2', 'TLS1.3'][Math.floor(Math.random() * 2)]; }
  private generateMonitoringTags(): any { return {}; }
  private generateAttackDescription(type: string): string { return `Test attack: ${type}`; }
  private generateAttackSeverity(): string { return ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)]; }
  private generateAttackCategory(type: string): string { return type; }
  private generateAttackVectors(type: string): string[] { return [type]; }
  private generateMitigations(type: string): string[] { return [`Mitigate ${type}`]; }
  private generateParameterName(): string { return ['id', 'name', 'email', 'query'][Math.floor(Math.random() * 4)]; }
  private generateExpectedBehavior(type: string): string { return `Should block ${type} attack`; }
  private generateSuccessCriteria(type: string): string { return `Attack ${type} is blocked or sanitized`; }

  /**
   * Log data management activities
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logEntry: SecurityTestLog = {
      timestamp: new Date(),
      level,
      message,
      data,
      component: 'SecurityTestDataManager'
    };

    this.logs.push(logEntry);
    console.log(`[${level.toUpperCase()}] ${message}`, data || '');
  }

  /**
   * Get data manager statistics
   */
  getStatistics(): DataManagerStatistics {
    const totalDataSets = this.dataStore.size;
    const dataSetsByType = new Map<string, number>();
    const dataSetsByProfile = new Map<string, number>();
    let totalRecords = 0;
    let encryptedDataSets = 0;
    let maskedDataSets = 0;

    for (const dataSet of this.dataStore.values()) {
      // Count by type
      dataSetsByType.set(dataSet.type, (dataSetsByType.get(dataSet.type) || 0) + 1);

      // Count by profile
      dataSetsByProfile.set(dataSet.profile, (dataSetsByProfile.get(dataSet.profile) || 0) + 1);

      // Count records
      totalRecords += dataSet.count;

      // Count encrypted/masked
      if (dataSet.metadata.encrypted) encryptedDataSets++;
      if (dataSet.metadata.masked) maskedDataSets++;
    }

    return {
      totalDataSets,
      totalRecords,
      encryptedDataSets,
      maskedDataSets,
      dataSetsByType: Object.fromEntries(dataSetsByType),
      dataSetsByProfile: Object.fromEntries(dataSetsByProfile),
      availableGenerators: Array.from(this.dataGenerators.keys()),
      availableProfiles: Array.from(this.dataProfiles.keys())
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cleanup all data sets
    await this.cleanupExpiredDataSets();

    // Clear sensitive data
    this.dataStore.clear();
    this.dataGenerators.clear();
    this.dataProfiles.clear();

    // Clear encryption key
    this.encryptionKey.fill(0);

    this.logs = [];

    this.log('info', 'Security test data manager cleaned up successfully');
  }
}

/**
 * Security Data Manager Configuration
 */
export interface SecurityDataManagerConfig {
  encryption?: {
    enabled: boolean;
    algorithm: string;
    keyRotation: boolean;
  };
  masking?: {
    enabled: boolean;
    rules: Record<string, string>;
    strictMode: boolean;
  };
  retention?: {
    defaultTTL: number;
    maxAge: number;
    autoCleanup: boolean;
  };
  compliance?: {
    requireEncryption: boolean;
    requireMasking: boolean;
    maxRetention: number;
    auditTrail: boolean;
  };
}

export interface TestDataSet {
  id: string;
  type: string;
  profile: string;
  count: number;
  data: any;
  metadata: {
    generatedAt: Date;
    validatedAt: Date;
    encrypted: boolean;
    masked: boolean;
    checksum: string;
  };
  lifecycle: {
    created: Date;
    lastAccessed: Date;
    expiresAt: Date;
    accessCount: number;
    status: 'active' | 'expired' | 'deleted';
    deletedAt?: Date;
  };
}

export interface DataGenerator {
  type: string;
  generate: (count: number, profile?: string) => Promise<any[]>;
  validate: (data: any[]) => Promise<ValidationResult>;
  mask: (data: any[]) => Promise<any[]>;
}

export interface DataProfile {
  name: string;
  description: string;
  userCount: number;
  transactionVolume: number;
  apiCallVolume: number;
  dataRetention: number;
  encryptionRequired: boolean;
  maskingSensitiveData: boolean;
  complianceLevel: string;
  includeMaliciousData?: boolean;
  attackVectors?: string[];
  gdprCompliant?: boolean;
  hipaaCompliant?: boolean;
  pciCompliant?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface DataValidationResult extends ValidationResult {
  dataSetId: string;
  warnings: string[];
  checksumValid: boolean;
  dataConsistent: boolean;
  complianceValid: boolean;
  timestamp: Date;
}

export interface DataManagerStatistics {
  totalDataSets: number;
  totalRecords: number;
  encryptedDataSets: number;
  maskedDataSets: number;
  dataSetsByType: Record<string, number>;
  dataSetsByProfile: Record<string, number>;
  availableGenerators: string[];
  availableProfiles: string[];
}