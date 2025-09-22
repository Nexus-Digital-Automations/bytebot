/**
 * Cross-Service Security Testing Infrastructure
 *
 * Agent 2: Comprehensive cross-service security testing with inter-service authentication,
 * service-to-service authorization validation, API security integration testing,
 * and data flow security validation.
 *
 * @author Bytebot Security Team - Agent 2
 * @version 1.0.0
 */
import { SecurityTestResult } from '../types/security-test-types';
/**
 * Cross-Service Security Testing Framework
 *
 * Provides comprehensive cross-service security validation including:
 * - Inter-service authentication testing
 * - Service-to-service authorization validation
 * - API security integration testing
 * - Data flow security validation
 * - Service mesh security testing
 */
export declare class CrossServiceSecurityTesting {
    private config;
    private httpClients;
    private wsConnections;
    private logs;
    private vulnerabilities;
    private evidence;
    private authTokens;
    constructor(config: CrossServiceSecurityConfig);
    /**
     * Initialize HTTP clients for each service
     */
    private initializeHttpClients;
    /**
     * Run comprehensive cross-service security test suite
     */
    runCrossServiceSecurityTests(): Promise<SecurityTestResult[]>;
    /**
     * Test inter-service authentication
     */
    private testInterServiceAuthentication;
    /**
     * Test service-to-service authorization
     */
    private testServiceToServiceAuthorization;
    /**
     * Test API security integration
     */
    private testAPISecurityIntegration;
    /**
     * Test data flow security
     */
    private testDataFlowSecurity;
    /**
     * Test service mesh security
     */
    private testServiceMeshSecurity;
    /**
     * Test cross-service communication security
     */
    private testCrossServiceCommunication;
    /**
     * Authenticate with service
     */
    private authenticateWithService;
    /**
     * Validate token security
     */
    private validateTokenSecurity;
    /**
     * Test authentication bypass
     */
    private testAuthenticationBypass;
    /**
     * Test token validation
     */
    private testTokenValidation;
    /**
     * Test authorized access
     */
    private testAuthorizedAccess;
    /**
     * Test unauthorized access
     */
    private testUnauthorizedAccess;
    /**
     * Test privilege escalation
     */
    private testPrivilegeEscalation;
    /**
     * Test API rate limiting
     */
    private testAPIRateLimiting;
    /**
     * Test API input validation
     */
    private testAPIInputValidation;
    /**
     * Test API output encoding
     */
    private testAPIOutputEncoding;
    /**
     * Test CORS configuration
     */
    private testCORSConfiguration;
    /**
     * Test security headers
     */
    private testSecurityHeaders;
    /**
     * Test API versioning security
     */
    private testAPIVersioningSecurity;
    /**
     * Test data encryption in transit
     */
    private testDataEncryptionInTransit;
    /**
     * Test data integrity
     */
    private testDataIntegrity;
    /**
     * Test data sanitization
     */
    private testDataSanitization;
    /**
     * Test data access controls
     */
    private testDataAccessControls;
    /**
     * Test data leakage prevention
     */
    private testDataLeakagePrevention;
    /**
     * Test mTLS configuration
     */
    private testMTLSConfiguration;
    /**
     * Test service mesh policies
     */
    private testServiceMeshPolicies;
    /**
     * Test traffic encryption
     */
    private testTrafficEncryption;
    /**
     * Test service identity validation
     */
    private testServiceIdentityValidation;
    /**
     * Test WebSocket security
     */
    private testWebSocketSecurity;
    /**
     * Test gRPC security
     */
    private testGRPCSecurity;
    /**
     * Test message queue security
     */
    private testMessageQueueSecurity;
    /**
     * Add security vulnerability
     */
    private addVulnerability;
    /**
     * Log cross-service testing activities
     */
    private log;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
/**
 * Cross-Service Security Configuration
 */
export interface CrossServiceSecurityConfig {
    services: Record<string, ServiceConfig>;
    authorizationTests: AuthorizationTest[];
    dataFlows: DataFlow[];
    communicationTests: CommunicationTest[];
}
export interface ServiceConfig {
    baseUrl: string;
    timeout?: number;
    auth?: {
        endpoint: string;
        credentials: {
            username: string;
            password: string;
        };
    };
    mtls?: {
        enabled: boolean;
        clientCert?: string;
        clientKey?: string;
    };
    identityValidation?: {
        enabled: boolean;
    };
    protectedEndpoints?: string[];
    rateLimit?: {
        enabled: boolean;
        maxRequests: number;
        testEndpoint: string;
    };
    inputValidationEndpoints?: string[];
    outputEncodingEndpoints?: string[];
    corsTestEndpoint?: string;
    securityHeadersEndpoint?: string;
    apiVersioning?: {
        enabled: boolean;
        versions: string[];
        deprecatedVersions: string[];
        testEndpoint: string;
    };
}
export interface AuthorizationTest {
    name: string;
    sourceService: string;
    targetService: string;
    endpoint: string;
    expectedAccess: boolean;
}
export interface DataFlow {
    name: string;
    sourceService: string;
    targetService: string;
    endpoint: string;
    dataEndpoint?: string;
}
export interface CommunicationTest {
    name: string;
    type: 'websocket' | 'grpc' | 'messagequeue';
    url: string;
    authRequired?: boolean;
    inputValidation?: boolean;
}
export interface AuthResponse {
    success: boolean;
    token?: string;
    error?: string;
    response: any;
}
//# sourceMappingURL=cross-service-security.d.ts.map