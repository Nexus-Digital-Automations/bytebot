/**
 * Security Test Data Management System
 *
 * Agent 6: Comprehensive security test data management with synthetic data generation,
 * data masking, test data lifecycle management, and secure data handling.
 *
 * @author Bytebot Security Team - Agent 6
 * @version 1.0.0
 */
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
export declare class SecurityTestDataManager {
    private config;
    private dataStore;
    private dataGenerators;
    private logs;
    private encryptionKey;
    private dataProfiles;
    constructor(config: SecurityDataManagerConfig);
    /**
     * Initialize data generators for different data types
     */
    private initializeDataGenerators;
    /**
     * Initialize data profiles for different testing scenarios
     */
    private initializeDataProfiles;
    /**
     * Generate test data set
     */
    generateTestDataSet(type: string, count: number, profile?: string): Promise<TestDataSet>;
    /**
     * Generate user data
     */
    private generateUserData;
    /**
     * Generate authentication data
     */
    private generateAuthenticationData;
    /**
     * Generate transaction data
     */
    private generateTransactionData;
    /**
     * Generate API data
     */
    private generateAPIData;
    /**
     * Generate malicious data for security testing
     */
    private generateMaliciousData;
    /**
     * Retrieve test data set
     */
    getTestDataSet(dataSetId: string): Promise<TestDataSet | null>;
    /**
     * Mask sensitive data
     */
    maskTestData(dataSetId: string): Promise<TestDataSet>;
    /**
     * Validate data integrity
     */
    validateDataIntegrity(dataSetId: string): Promise<DataValidationResult>;
    /**
     * Cleanup expired data sets
     */
    cleanupExpiredDataSets(): Promise<number>;
    /**
     * Cleanup specific data set
     */
    private cleanupDataSet;
    /**
     * Export data set for external use
     */
    exportDataSet(dataSetId: string, format?: 'json' | 'csv' | 'xml'): Promise<string>;
    private generateUsername;
    private generateEmail;
    private generateFirstName;
    private generateLastName;
    private generatePhoneNumber;
    private generateAddress;
    private generateDateOfBirth;
    private generateSSN;
    private generateCreditCardNumber;
    private generateUserRole;
    private generatePermissions;
    private generatePastDate;
    private generateRecentDate;
    private generateSecurityQuestions;
    private generateUserPreferences;
    private generateUserAgent;
    private generateIPAddress;
    private generatePasswordHash;
    private generateJWT;
    private generateBackupCodes;
    private generateMaliciousPayload;
    private encryptSensitiveData;
    private decryptSensitiveData;
    private calculateChecksum;
    private validateUserData;
    private validateAuthenticationData;
    private validateTransactionData;
    private validateAPIData;
    private validateMaliciousData;
    private maskUserData;
    private maskAuthenticationData;
    private maskTransactionData;
    private maskAPIData;
    private maskMaliciousData;
    private maskEmail;
    private maskPhoneNumber;
    private maskSSN;
    private maskCreditCard;
    private maskName;
    private validateCompliance;
    private convertToCSV;
    private convertToXML;
    private escapeXML;
    private generateSecurityEvents;
    private generateDeviceFingerprints;
    private generateTrustedDevices;
    private generateLocation;
    private generateTransactionType;
    private generateAmount;
    private generateCurrency;
    private generateTransactionStatus;
    private generateTransactionDescription;
    private generateMerchantName;
    private generateMerchantCategoryCode;
    private generatePaymentMethod;
    private generateCardType;
    private generateAuthorizationCode;
    private generateProcessorResponse;
    private generateFraudFlags;
    private generateTransactionDate;
    private generateSettlementDate;
    private generateFees;
    private generateTaxes;
    private generateTransactionChannel;
    private generateTransactionSource;
    private generateReferrer;
    private generateAPIEndpoint;
    private generateHTTPMethod;
    private generateRequestHeaders;
    private generateRequestBody;
    private generateResponseStatus;
    private generateResponseHeaders;
    private generateResponseBody;
    private generateAPICallDate;
    private generateAuthType;
    private generateAPIScopes;
    private generateTLSVersion;
    private generateMonitoringTags;
    private generateAttackDescription;
    private generateAttackSeverity;
    private generateAttackCategory;
    private generateAttackVectors;
    private generateMitigations;
    private generateParameterName;
    private generateExpectedBehavior;
    private generateSuccessCriteria;
    /**
     * Log data management activities
     */
    private log;
    /**
     * Get data manager statistics
     */
    getStatistics(): DataManagerStatistics;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
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
//# sourceMappingURL=security-test-data-manager.d.ts.map