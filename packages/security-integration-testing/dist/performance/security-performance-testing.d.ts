/**
 * Security Performance Integration Testing
 *
 * Agent 5: Comprehensive security performance testing with load testing,
 * scalability validation, security overhead measurement, and performance monitoring.
 *
 * @author Bytebot Security Team - Agent 5
 * @version 1.0.0
 */
import { SecurityTestResult } from '../types/security-test-types';
/**
 * Security Performance Testing Framework
 *
 * Provides comprehensive security performance testing including:
 * - Security feature performance impact testing
 * - Security load testing and validation
 * - Security scalability testing
 * - Security monitoring integration testing
 * - Security compliance validation automation
 */
export declare class SecurityPerformanceTesting {
    private config;
    private logs;
    private performanceResults;
    private activeLoadTests;
    private monitoringData;
    constructor(config: SecurityPerformanceConfig);
    /**
     * Run comprehensive security performance test suite
     */
    runSecurityPerformanceTests(): Promise<SecurityTestResult[]>;
    /**
     * Test authentication performance under load
     */
    private testAuthenticationPerformance;
    /**
     * Execute authentication load test
     */
    private executeAuthenticationLoadTest;
    /**
     * Test authorization performance
     */
    private testAuthorizationPerformance;
    /**
     * Execute authorization performance test
     */
    private executeAuthorizationPerformanceTest;
    /**
     * Test encryption/decryption performance
     */
    private testEncryptionPerformance;
    /**
     * Execute encryption performance test
     */
    private executeEncryptionPerformanceTest;
    /**
     * Test security monitoring overhead
     */
    private testSecurityMonitoringOverhead;
    /**
     * Execute monitoring overhead test
     */
    private executeMonitoringOverheadTest;
    /**
     * Test security scalability
     */
    private testSecurityScalability;
    /**
     * Execute scalability test
     */
    private executeScalabilityTest;
    /**
     * Test security feature impact
     */
    private testSecurityFeatureImpact;
    /**
     * Execute security feature impact test
     */
    private executeSecurityFeatureImpactTest;
    private startLoadTestSession;
    private monitorLoadTestPerformance;
    private analyzeAuthenticationPerformance;
    private checkPerformanceVulnerabilities;
    private calculateSecurityScore;
    private calculateComplianceScore;
    private calculateAuthorizationSecurityScore;
    private calculateEncryptionSecurityScore;
    private calculateMonitoringSecurityScore;
    private calculateScalabilitySecurityScore;
    private calculateFeatureImpactSecurityScore;
    private executeAuthorizationScenario;
    private testJWTPerformance;
    private testPasswordHashingPerformance;
    private testDataEncryptionPerformance;
    private testTLSHandshakePerformance;
    private analyzeEncryptionPerformance;
    private runBaselinePerformanceTest;
    private runMonitoredPerformanceTest;
    private calculateMonitoringOverhead;
    private executeScalabilityLoadTest;
    private analyzeScalabilityTrend;
    private executeFeatureImpactScenario;
    private analyzeFeatureImpact;
    /**
     * Log performance testing activities
     */
    private log;
    /**
     * Get performance results
     */
    getPerformanceResults(): Map<string, PerformanceTestResult>;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
/**
 * Security Performance Configuration
 */
export interface SecurityPerformanceConfig {
    thresholds: {
        maxResponseTime: number;
        maxErrorRate: number;
        authorizationResponseTime: number;
        maxMonitoringOverhead: number;
        maxMemoryOverhead: number;
        maxScalabilityResponseTime: number;
        maxScalabilityErrorRate: number;
        maxFeatureImpact: number;
        minEncryptionThroughput: number;
    };
    testEnvironment: {
        baseUrl: string;
        authEndpoint: string;
        testDataSize: number;
    };
    monitoring: {
        enabled: boolean;
        interval: number;
        metrics: string[];
    };
}
export interface LoadTestSession {
    testId: string;
    startTime: Date;
    config: any;
    status: 'running' | 'completed' | 'stopped' | 'error';
    metrics: {
        requestsPerSecond: number;
        averageResponseTime: number;
        errorRate: number;
        activeConnections: number;
    };
}
export interface PerformanceTestResult {
    testId: string;
    testType: string;
    config: any;
    performanceData: any;
    timestamp: Date;
}
export interface PerformanceMonitoringData {
    timestamp: Date;
    testId: string;
    metrics: {
        cpu: number;
        memory: number;
        network: number;
        disk: number;
        responseTime: number;
        throughput: number;
        errorRate: number;
    };
}
//# sourceMappingURL=security-performance-testing.d.ts.map