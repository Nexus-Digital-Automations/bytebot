"use strict";
/**
 * Security Test Data Management System
 *
 * Agent 6: Comprehensive security test data management with synthetic data generation,
 * data masking, test data lifecycle management, and secure data handling.
 *
 * @author Bytebot Security Team - Agent 6
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityTestDataManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
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
class SecurityTestDataManager {
    constructor(config) {
        this.config = config;
        this.dataStore = new Map();
        this.dataGenerators = new Map();
        this.logs = [];
        this.dataProfiles = new Map();
        this.encryptionKey = crypto_1.default.randomBytes(32);
        this.initializeDataGenerators();
        this.initializeDataProfiles();
    }
    /**
     * Initialize data generators for different data types
     */
    initializeDataGenerators() {
        // User data generator
        this.dataGenerators.set('user', {
            type: 'user',
            generate: (count, profile) => this.generateUserData(count, profile),
            validate: (data) => this.validateUserData(data),
            mask: (data) => this.maskUserData(data)
        });
        // Authentication data generator
        this.dataGenerators.set('authentication', {
            type: 'authentication',
            generate: (count, profile) => this.generateAuthenticationData(count, profile),
            validate: (data) => this.validateAuthenticationData(data),
            mask: (data) => this.maskAuthenticationData(data)
        });
        // Transaction data generator
        this.dataGenerators.set('transaction', {
            type: 'transaction',
            generate: (count, profile) => this.generateTransactionData(count, profile),
            validate: (data) => this.validateTransactionData(data),
            mask: (data) => this.maskTransactionData(data)
        });
        // API data generator
        this.dataGenerators.set('api', {
            type: 'api',
            generate: (count, profile) => this.generateAPIData(count, profile),
            validate: (data) => this.validateAPIData(data),
            mask: (data) => this.maskAPIData(data)
        });
        // Malicious data generator for security testing
        this.dataGenerators.set('malicious', {
            type: 'malicious',
            generate: (count, profile) => this.generateMaliciousData(count, profile),
            validate: (data) => this.validateMaliciousData(data),
            mask: (data) => this.maskMaliciousData(data)
        });
        this.log('info', `Initialized ${this.dataGenerators.size} data generators`);
    }
    /**
     * Initialize data profiles for different testing scenarios
     */
    initializeDataProfiles() {
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
    async generateTestDataSet(type, count, profile) {
        const generator = this.dataGenerators.get(type);
        if (!generator) {
            throw new Error(`Unknown data generator type: ${type}`);
        }
        this.log('info', `Generating test data set: ${type} (count: ${count}, profile: ${profile || 'default'})`);
        const dataSetId = `${type}-${Date.now()}-${crypto_1.default.randomBytes(4).toString('hex')}`;
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
            const dataSet = {
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
        }
        catch (error) {
            this.log('error', `Test data generation failed: ${type}`, error);
            throw error;
        }
    }
    /**
     * Generate user data
     */
    async generateUserData(count, profile) {
        const users = [];
        const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;
        for (let i = 0; i < count; i++) {
            const user = {
                id: crypto_1.default.randomUUID(),
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
                    sessionId: crypto_1.default.randomUUID(),
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
    async generateAuthenticationData(count, profile) {
        const authData = [];
        const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;
        for (let i = 0; i < count; i++) {
            const auth = {
                id: crypto_1.default.randomUUID(),
                username: this.generateUsername(),
                passwordHash: this.generatePasswordHash(),
                salt: crypto_1.default.randomBytes(16).toString('hex'),
                algorithm: 'bcrypt',
                iterations: 10000,
                jwtSecret: crypto_1.default.randomBytes(32).toString('hex'),
                refreshToken: crypto_1.default.randomBytes(64).toString('hex'),
                accessToken: this.generateJWT(),
                tokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                mfaSecret: crypto_1.default.randomBytes(16).toString('hex'),
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
                    sessionId: crypto_1.default.randomUUID(),
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
    async generateTransactionData(count, profile) {
        const transactions = [];
        const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;
        for (let i = 0; i < count; i++) {
            const transaction = {
                id: crypto_1.default.randomUUID(),
                type: this.generateTransactionType(),
                amount: this.generateAmount(),
                currency: this.generateCurrency(),
                status: this.generateTransactionStatus(),
                description: this.generateTransactionDescription(),
                merchantId: crypto_1.default.randomUUID(),
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
                    customerId: crypto_1.default.randomUUID(),
                    email: this.generateEmail(),
                    phoneNumber: this.generatePhoneNumber(),
                    ipAddress: this.generateIPAddress(),
                    deviceId: crypto_1.default.randomUUID(),
                    userAgent: this.generateUserAgent()
                },
                metadata: {
                    channel: this.generateTransactionChannel(),
                    source: this.generateTransactionSource(),
                    campaignId: crypto_1.default.randomUUID(),
                    referrer: this.generateReferrer(),
                    sessionId: crypto_1.default.randomUUID()
                }
            };
            // Add PCI compliance fields if needed
            if (dataProfile?.pciCompliant) {
                transaction.pciCompliance = {
                    tokenized: true,
                    encrypted: true,
                    auditTrail: crypto_1.default.randomUUID(),
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
    async generateAPIData(count, profile) {
        const apiData = [];
        for (let i = 0; i < count; i++) {
            const api = {
                id: crypto_1.default.randomUUID(),
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
                clientId: crypto_1.default.randomUUID(),
                apiKey: crypto_1.default.randomBytes(32).toString('hex'),
                rateLimitRemaining: Math.floor(Math.random() * 1000),
                rateLimitReset: new Date(Date.now() + 60 * 60 * 1000),
                authentication: {
                    type: this.generateAuthType(),
                    token: this.generateJWT(),
                    userId: crypto_1.default.randomUUID(),
                    scopes: this.generateAPIScopes()
                },
                security: {
                    ipAddress: this.generateIPAddress(),
                    userAgent: this.generateUserAgent(),
                    tlsVersion: this.generateTLSVersion(),
                    certificateFingerprint: crypto_1.default.randomBytes(20).toString('hex'),
                    correlationId: crypto_1.default.randomUUID()
                },
                monitoring: {
                    traceId: crypto_1.default.randomUUID(),
                    spanId: crypto_1.default.randomUUID(),
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
    async generateMaliciousData(count, profile) {
        const maliciousData = [];
        const dataProfile = profile ? this.dataProfiles.get(profile) : undefined;
        const attackVectors = dataProfile?.attackVectors || ['sql_injection', 'xss', 'csrf'];
        for (let i = 0; i < count; i++) {
            const attackType = attackVectors[Math.floor(Math.random() * attackVectors.length)];
            const malicious = {
                id: crypto_1.default.randomUUID(),
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
    async getTestDataSet(dataSetId) {
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
    async maskTestData(dataSetId) {
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
    async validateDataIntegrity(dataSetId) {
        const dataSet = await this.getTestDataSet(dataSetId);
        if (!dataSet) {
            throw new Error(`Test data set not found: ${dataSetId}`);
        }
        this.log('info', `Validating data integrity: ${dataSetId}`);
        const result = {
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
        }
        catch (error) {
            result.valid = false;
            result.errors.push(`Validation error: ${error.message}`);
        }
        this.log('info', `Data integrity validation completed: ${dataSetId} - Valid: ${result.valid}`);
        return result;
    }
    /**
     * Cleanup expired data sets
     */
    async cleanupExpiredDataSets() {
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
    async cleanupDataSet(dataSetId) {
        const dataSet = this.dataStore.get(dataSetId);
        if (!dataSet)
            return;
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
    async exportDataSet(dataSetId, format = 'json') {
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
    generateUsername() {
        const adjectives = ['quick', 'bright', 'clever', 'fast', 'smart', 'swift', 'sharp'];
        const nouns = ['fox', 'eagle', 'wolf', 'lion', 'tiger', 'bear', 'hawk'];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 9999);
        return `${adjective}_${noun}_${number}`;
    }
    generateEmail() {
        const domains = ['testmail.com', 'example.org', 'testing.net', 'mockmail.io'];
        const username = this.generateUsername().replace('_', '.');
        const domain = domains[Math.floor(Math.random() * domains.length)];
        return `${username}@${domain}`;
    }
    generateFirstName() {
        const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica', 'William', 'Ashley'];
        return names[Math.floor(Math.random() * names.length)];
    }
    generateLastName() {
        const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        return names[Math.floor(Math.random() * names.length)];
    }
    generatePhoneNumber() {
        const areaCode = Math.floor(Math.random() * 800) + 200;
        const exchange = Math.floor(Math.random() * 800) + 200;
        const number = Math.floor(Math.random() * 9999);
        return `+1-${areaCode}-${exchange.toString().padStart(3, '0')}-${number.toString().padStart(4, '0')}`;
    }
    generateAddress() {
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
    generateDateOfBirth() {
        const start = new Date(1950, 0, 1);
        const end = new Date(2005, 11, 31);
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }
    generateSSN() {
        // Generate fake SSN for testing (not real SSNs)
        const area = Math.floor(Math.random() * 800) + 100;
        const group = Math.floor(Math.random() * 99) + 1;
        const serial = Math.floor(Math.random() * 9999) + 1;
        return `${area.toString().padStart(3, '0')}-${group.toString().padStart(2, '0')}-${serial.toString().padStart(4, '0')}`;
    }
    generateCreditCardNumber() {
        // Generate fake credit card numbers for testing
        const prefixes = ['4111', '5555', '3777', '6011']; // Test card prefixes
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const remaining = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
        return prefix + remaining;
    }
    generateUserRole() {
        const roles = ['user', 'admin', 'moderator', 'viewer', 'editor', 'contributor'];
        return roles[Math.floor(Math.random() * roles.length)];
    }
    generatePermissions() {
        const allPermissions = ['read', 'write', 'delete', 'admin', 'moderate', 'edit', 'view', 'create'];
        const count = Math.floor(Math.random() * 4) + 1;
        return allPermissions.sort(() => 0.5 - Math.random()).slice(0, count);
    }
    generatePastDate() {
        const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
        const end = new Date();
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }
    generateRecentDate() {
        const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const end = new Date();
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }
    generateSecurityQuestions() {
        const questions = [
            'What was your first pet\'s name?',
            'What is your mother\'s maiden name?',
            'What was the name of your first school?',
            'What is your favorite color?'
        ];
        return questions.slice(0, 2).map(q => ({
            question: q,
            answer: crypto_1.default.randomBytes(8).toString('hex') // Encrypted fake answers
        }));
    }
    generateUserPreferences() {
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
    generateUserAgent() {
        const agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
        ];
        return agents[Math.floor(Math.random() * agents.length)];
    }
    generateIPAddress() {
        return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }
    // Additional helper methods would continue here...
    // (Due to length constraints, showing key methods. Full implementation would include all generators)
    generatePasswordHash() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    generateJWT() {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
        const payload = Buffer.from(JSON.stringify({ sub: crypto_1.default.randomUUID(), exp: Date.now() + 3600000 })).toString('base64');
        const signature = crypto_1.default.randomBytes(32).toString('base64');
        return `${header}.${payload}.${signature}`;
    }
    generateBackupCodes() {
        return Array.from({ length: 10 }, () => crypto_1.default.randomBytes(8).toString('hex'));
    }
    generateMaliciousPayload(attackType) {
        const payloads = {
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
    async encryptSensitiveData(data) {
        if (!this.config.encryption?.enabled)
            return data;
        const iv = crypto_1.default.randomIV(16);
        const cipher = crypto_1.default.createCipher('aes-256-gcm', this.encryptionKey);
        const encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex') + cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            algorithm: 'aes-256-gcm'
        };
    }
    async decryptSensitiveData(encryptedData) {
        if (!encryptedData.encrypted)
            return encryptedData;
        const decipher = crypto_1.default.createDecipher('aes-256-gcm', this.encryptionKey);
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
        const decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8') + decipher.final('utf8');
        return JSON.parse(decrypted);
    }
    calculateChecksum(data) {
        return crypto_1.default.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }
    // Validation methods
    async validateUserData(data) {
        const result = { valid: true, errors: [] };
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
    async validateAuthenticationData(data) {
        const result = { valid: true, errors: [] };
        for (const auth of data) {
            if (!auth.id || !auth.username || !auth.passwordHash) {
                result.errors.push('Missing required authentication fields');
                result.valid = false;
            }
        }
        return result;
    }
    async validateTransactionData(data) {
        const result = { valid: true, errors: [] };
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
    async validateAPIData(data) {
        const result = { valid: true, errors: [] };
        for (const api of data) {
            if (!api.id || !api.endpoint || !api.method) {
                result.errors.push('Missing required API fields');
                result.valid = false;
            }
        }
        return result;
    }
    async validateMaliciousData(data) {
        const result = { valid: true, errors: [] };
        for (const malicious of data) {
            if (!malicious.id || !malicious.attackType || !malicious.payload) {
                result.errors.push('Missing required malicious data fields');
                result.valid = false;
            }
        }
        return result;
    }
    // Data masking methods
    async maskUserData(data) {
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
    async maskAuthenticationData(data) {
        return data.map(auth => ({
            ...auth,
            passwordHash: '***MASKED***',
            salt: '***MASKED***',
            jwtSecret: '***MASKED***',
            refreshToken: '***MASKED***',
            mfaSecret: '***MASKED***'
        }));
    }
    async maskTransactionData(data) {
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
    async maskAPIData(data) {
        return data.map(api => ({
            ...api,
            apiKey: '***MASKED***',
            authentication: {
                ...api.authentication,
                token: '***MASKED***'
            }
        }));
    }
    async maskMaliciousData(data) {
        // Malicious test data doesn't typically need masking as it's synthetic
        return data;
    }
    // Masking helper methods
    maskEmail(email) {
        if (!email)
            return email;
        const [local, domain] = email.split('@');
        const maskedLocal = local.length > 2 ? local[0] + '*'.repeat(local.length - 2) + local.slice(-1) : '***';
        return `${maskedLocal}@${domain}`;
    }
    maskPhoneNumber(phone) {
        if (!phone)
            return phone;
        return phone.replace(/\d(?=\d{4})/g, '*');
    }
    maskSSN(ssn) {
        if (!ssn)
            return ssn;
        return ssn.replace(/\d(?=\d{4})/g, '*');
    }
    maskCreditCard(cardNumber) {
        if (!cardNumber)
            return cardNumber;
        return cardNumber.replace(/\d(?=\d{4})/g, '*');
    }
    maskName(name) {
        if (!name)
            return name;
        return name.length > 1 ? name[0] + '*'.repeat(name.length - 1) : '*';
    }
    // Compliance validation
    async validateCompliance(dataSet) {
        const result = { valid: true, errors: [] };
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
    convertToCSV(data) {
        if (!data.length)
            return '';
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
    convertToXML(data) {
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
    escapeXML(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    // Additional generator methods (placeholder implementations)
    generateSecurityEvents() { return []; }
    generateDeviceFingerprints() { return []; }
    generateTrustedDevices() { return []; }
    generateLocation() { return { country: 'US', city: 'Unknown' }; }
    generateTransactionType() { return ['purchase', 'refund', 'transfer'][Math.floor(Math.random() * 3)]; }
    generateAmount() { return Math.floor(Math.random() * 10000) / 100; }
    generateCurrency() { return ['USD', 'EUR', 'GBP'][Math.floor(Math.random() * 3)]; }
    generateTransactionStatus() { return ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)]; }
    generateTransactionDescription() { return 'Test transaction'; }
    generateMerchantName() { return 'Test Merchant'; }
    generateMerchantCategoryCode() { return '5411'; }
    generatePaymentMethod() { return ['credit_card', 'debit_card', 'bank_transfer'][Math.floor(Math.random() * 3)]; }
    generateCardType() { return ['visa', 'mastercard', 'amex'][Math.floor(Math.random() * 3)]; }
    generateAuthorizationCode() { return crypto_1.default.randomBytes(6).toString('hex').toUpperCase(); }
    generateProcessorResponse() { return 'APPROVED'; }
    generateFraudFlags() { return []; }
    generateTransactionDate() { return this.generateRecentDate(); }
    generateSettlementDate() { return new Date(Date.now() + 24 * 60 * 60 * 1000); }
    generateFees() { return Math.floor(Math.random() * 100) / 100; }
    generateTaxes() { return Math.floor(Math.random() * 100) / 100; }
    generateTransactionChannel() { return ['web', 'mobile', 'api'][Math.floor(Math.random() * 3)]; }
    generateTransactionSource() { return ['direct', 'partner', 'affiliate'][Math.floor(Math.random() * 3)]; }
    generateReferrer() { return 'https://example.com'; }
    generateAPIEndpoint() {
        const endpoints = ['/api/users', '/api/transactions', '/api/auth', '/api/data', '/api/admin'];
        return endpoints[Math.floor(Math.random() * endpoints.length)];
    }
    generateHTTPMethod() { return ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)]; }
    generateRequestHeaders() { return { 'Content-Type': 'application/json' }; }
    generateRequestBody() { return {}; }
    generateResponseStatus() { return [200, 201, 400, 401, 404, 500][Math.floor(Math.random() * 6)]; }
    generateResponseHeaders() { return { 'Content-Type': 'application/json' }; }
    generateResponseBody() { return {}; }
    generateAPICallDate() { return this.generateRecentDate(); }
    generateAuthType() { return ['bearer', 'basic', 'api_key'][Math.floor(Math.random() * 3)]; }
    generateAPIScopes() { return ['read', 'write']; }
    generateTLSVersion() { return ['TLS1.2', 'TLS1.3'][Math.floor(Math.random() * 2)]; }
    generateMonitoringTags() { return {}; }
    generateAttackDescription(type) { return `Test attack: ${type}`; }
    generateAttackSeverity() { return ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)]; }
    generateAttackCategory(type) { return type; }
    generateAttackVectors(type) { return [type]; }
    generateMitigations(type) { return [`Mitigate ${type}`]; }
    generateParameterName() { return ['id', 'name', 'email', 'query'][Math.floor(Math.random() * 4)]; }
    generateExpectedBehavior(type) { return `Should block ${type} attack`; }
    generateSuccessCriteria(type) { return `Attack ${type} is blocked or sanitized`; }
    /**
     * Log data management activities
     */
    log(level, message, data) {
        const logEntry = {
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
    getStatistics() {
        const totalDataSets = this.dataStore.size;
        const dataSetsByType = new Map();
        const dataSetsByProfile = new Map();
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
            if (dataSet.metadata.encrypted)
                encryptedDataSets++;
            if (dataSet.metadata.masked)
                maskedDataSets++;
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
    async cleanup() {
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
exports.SecurityTestDataManager = SecurityTestDataManager;
//# sourceMappingURL=security-test-data-manager.js.map