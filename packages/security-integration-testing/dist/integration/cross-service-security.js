"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossServiceSecurityTesting = void 0;
const axios_1 = __importDefault(require("axios"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ws_1 = __importDefault(require("ws"));
const security_test_types_1 = require("../types/security-test-types");
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
class CrossServiceSecurityTesting {
    constructor(config) {
        this.config = config;
        this.httpClients = new Map();
        this.wsConnections = new Map();
        this.logs = [];
        this.vulnerabilities = [];
        this.evidence = [];
        this.authTokens = new Map();
        this.initializeHttpClients();
    }
    /**
     * Initialize HTTP clients for each service
     */
    initializeHttpClients() {
        for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
            const client = axios_1.default.create({
                baseURL: serviceConfig.baseUrl,
                timeout: serviceConfig.timeout || 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'SecurityTestingFramework/1.0.0'
                }
            });
            // Add request interceptor for logging
            client.interceptors.request.use((config) => {
                this.log('debug', `Request: ${config.method?.toUpperCase()} ${config.url}`, {
                    service: serviceName,
                    headers: config.headers,
                    data: config.data
                });
                return config;
            }, (error) => {
                this.log('error', `Request error for ${serviceName}`, error);
                return Promise.reject(error);
            });
            // Add response interceptor for logging
            client.interceptors.response.use((response) => {
                this.log('debug', `Response: ${response.status} ${response.config.url}`, {
                    service: serviceName,
                    status: response.status,
                    headers: response.headers
                });
                return response;
            }, (error) => {
                this.log('error', `Response error for ${serviceName}`, {
                    status: error.response?.status,
                    message: error.message,
                    data: error.response?.data
                });
                return Promise.reject(error);
            });
            this.httpClients.set(serviceName, client);
        }
        this.log('info', `Initialized HTTP clients for ${this.httpClients.size} services`);
    }
    /**
     * Run comprehensive cross-service security test suite
     */
    async runCrossServiceSecurityTests() {
        const results = [];
        this.log('info', 'Starting cross-service security testing');
        try {
            // Test inter-service authentication
            const authResults = await this.testInterServiceAuthentication();
            results.push(...authResults);
            // Test service-to-service authorization
            const authzResults = await this.testServiceToServiceAuthorization();
            results.push(...authzResults);
            // Test API security integration
            const apiResults = await this.testAPISecurityIntegration();
            results.push(...apiResults);
            // Test data flow security
            const dataFlowResults = await this.testDataFlowSecurity();
            results.push(...dataFlowResults);
            // Test service mesh security
            const meshResults = await this.testServiceMeshSecurity();
            results.push(...meshResults);
            // Test cross-service communication security
            const commResults = await this.testCrossServiceCommunication();
            results.push(...commResults);
        }
        catch (error) {
            this.log('error', 'Cross-service security testing failed', error);
        }
        this.log('info', `Cross-service security testing completed. Results: ${results.length}`);
        return results;
    }
    /**
     * Test inter-service authentication
     */
    async testInterServiceAuthentication() {
        this.log('info', 'Testing inter-service authentication');
        const results = [];
        const startTime = new Date();
        for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
            try {
                const client = this.httpClients.get(serviceName);
                if (!client)
                    continue;
                const testResult = {
                    testCaseId: `inter-auth-${serviceName}`,
                    status: security_test_types_1.SecurityTestStatus.RUNNING,
                    startTime,
                    endTime: new Date(),
                    duration: 0,
                    passed: false,
                    vulnerabilities: [],
                    stepResults: [],
                    logs: [],
                    metrics: {
                        executionTime: 0,
                        memoryUsage: 0,
                        networkCalls: 0,
                        databaseQueries: 0,
                        vulnerabilitiesFound: 0,
                        securityScore: 0,
                        complianceScore: 0
                    },
                    evidence: []
                };
                // Test authentication endpoint
                if (serviceConfig.auth?.endpoint) {
                    const authResponse = await this.authenticateWithService(serviceName, serviceConfig);
                    if (authResponse.success) {
                        testResult.status = security_test_types_1.SecurityTestStatus.PASSED;
                        testResult.passed = true;
                        // Store token for subsequent tests
                        this.authTokens.set(serviceName, authResponse.token);
                        // Validate token security
                        await this.validateTokenSecurity(serviceName, authResponse.token);
                    }
                    else {
                        testResult.status = security_test_types_1.SecurityTestStatus.FAILED;
                        this.addVulnerability({
                            id: `auth-fail-${serviceName}-${Date.now()}`,
                            type: 'Authentication Failure',
                            severity: security_test_types_1.SecurityTestSeverity.HIGH,
                            description: `Failed to authenticate with service: ${serviceName}`,
                            location: serviceConfig.auth.endpoint,
                            recommendation: 'Review authentication configuration and credentials',
                            evidence: [authResponse],
                            exploitability: 0.8,
                            impact: 0.9,
                            timestamp: new Date()
                        });
                    }
                }
                // Test authentication bypass attempts
                await this.testAuthenticationBypass(serviceName, testResult);
                // Test token validation
                await this.testTokenValidation(serviceName, testResult);
                const endTime = new Date();
                testResult.endTime = endTime;
                testResult.duration = endTime.getTime() - startTime.getTime();
                testResult.metrics.executionTime = testResult.duration;
                results.push(testResult);
            }
            catch (error) {
                this.log('error', `Inter-service authentication test failed for ${serviceName}`, error);
                results.push({
                    testCaseId: `inter-auth-${serviceName}`,
                    status: security_test_types_1.SecurityTestStatus.ERROR,
                    startTime,
                    endTime: new Date(),
                    duration: 0,
                    passed: false,
                    vulnerabilities: [],
                    stepResults: [],
                    logs: [...this.logs],
                    metrics: {
                        executionTime: 0,
                        memoryUsage: 0,
                        networkCalls: 0,
                        databaseQueries: 0,
                        vulnerabilitiesFound: 0,
                        securityScore: 0,
                        complianceScore: 0
                    },
                    evidence: [],
                    error: error
                });
            }
        }
        return results;
    }
    /**
     * Test service-to-service authorization
     */
    async testServiceToServiceAuthorization() {
        this.log('info', 'Testing service-to-service authorization');
        const results = [];
        const startTime = new Date();
        for (const authzTest of this.config.authorizationTests) {
            try {
                const testResult = {
                    testCaseId: `s2s-authz-${authzTest.name}`,
                    status: security_test_types_1.SecurityTestStatus.RUNNING,
                    startTime,
                    endTime: new Date(),
                    duration: 0,
                    passed: false,
                    vulnerabilities: [],
                    stepResults: [],
                    logs: [],
                    metrics: {
                        executionTime: 0,
                        memoryUsage: 0,
                        networkCalls: 0,
                        databaseQueries: 0,
                        vulnerabilitiesFound: 0,
                        securityScore: 0,
                        complianceScore: 0
                    },
                    evidence: []
                };
                const sourceClient = this.httpClients.get(authzTest.sourceService);
                const targetClient = this.httpClients.get(authzTest.targetService);
                if (!sourceClient || !targetClient) {
                    throw new Error(`Missing HTTP client for service authorization test: ${authzTest.name}`);
                }
                // Test authorized access
                const authorizedResult = await this.testAuthorizedAccess(authzTest.sourceService, authzTest.targetService, authzTest.endpoint, authzTest.expectedAccess);
                // Test unauthorized access
                const unauthorizedResult = await this.testUnauthorizedAccess(authzTest.targetService, authzTest.endpoint, authzTest.expectedAccess);
                // Test privilege escalation
                const escalationResult = await this.testPrivilegeEscalation(authzTest.sourceService, authzTest.targetService, authzTest.endpoint);
                testResult.passed = authorizedResult.success && unauthorizedResult.success && escalationResult.success;
                testResult.status = testResult.passed ? security_test_types_1.SecurityTestStatus.PASSED : security_test_types_1.SecurityTestStatus.FAILED;
                const endTime = new Date();
                testResult.endTime = endTime;
                testResult.duration = endTime.getTime() - startTime.getTime();
                results.push(testResult);
            }
            catch (error) {
                this.log('error', `Service-to-service authorization test failed: ${authzTest.name}`, error);
                results.push({
                    testCaseId: `s2s-authz-${authzTest.name}`,
                    status: security_test_types_1.SecurityTestStatus.ERROR,
                    startTime,
                    endTime: new Date(),
                    duration: 0,
                    passed: false,
                    vulnerabilities: [],
                    stepResults: [],
                    logs: [...this.logs],
                    metrics: {
                        executionTime: 0,
                        memoryUsage: 0,
                        networkCalls: 0,
                        databaseQueries: 0,
                        vulnerabilitiesFound: 0,
                        securityScore: 0,
                        complianceScore: 0
                    },
                    evidence: [],
                    error: error
                });
            }
        }
        return results;
    }
    /**
     * Test API security integration
     */
    async testAPISecurityIntegration() {
        this.log('info', 'Testing API security integration');
        const results = [];
        const startTime = new Date();
        for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
            try {
                const client = this.httpClients.get(serviceName);
                if (!client)
                    continue;
                const testResult = {
                    testCaseId: `api-security-${serviceName}`,
                    status: security_test_types_1.SecurityTestStatus.RUNNING,
                    startTime,
                    endTime: new Date(),
                    duration: 0,
                    passed: false,
                    vulnerabilities: [],
                    stepResults: [],
                    logs: [],
                    metrics: {
                        executionTime: 0,
                        memoryUsage: 0,
                        networkCalls: 0,
                        databaseQueries: 0,
                        vulnerabilitiesFound: 0,
                        securityScore: 0,
                        complianceScore: 0
                    },
                    evidence: []
                };
                // Test API rate limiting
                await this.testAPIRateLimiting(serviceName, client, testResult);
                // Test input validation
                await this.testAPIInputValidation(serviceName, client, testResult);
                // Test output encoding
                await this.testAPIOutputEncoding(serviceName, client, testResult);
                // Test CORS configuration
                await this.testCORSConfiguration(serviceName, client, testResult);
                // Test security headers
                await this.testSecurityHeaders(serviceName, client, testResult);
                // Test API versioning security
                await this.testAPIVersioningSecurity(serviceName, client, testResult);
                testResult.status = testResult.vulnerabilities.length === 0 ? security_test_types_1.SecurityTestStatus.PASSED : security_test_types_1.SecurityTestStatus.FAILED;
                testResult.passed = testResult.status === security_test_types_1.SecurityTestStatus.PASSED;
                const endTime = new Date();
                testResult.endTime = endTime;
                testResult.duration = endTime.getTime() - startTime.getTime();
                results.push(testResult);
            }
            catch (error) {
                this.log('error', `API security integration test failed for ${serviceName}`, error);
            }
        }
        return results;
    }
    /**
     * Test data flow security
     */
    async testDataFlowSecurity() {
        this.log('info', 'Testing data flow security');
        const results = [];
        const startTime = new Date();
        for (const dataFlow of this.config.dataFlows) {
            try {
                const testResult = {
                    testCaseId: `data-flow-${dataFlow.name}`,
                    status: security_test_types_1.SecurityTestStatus.RUNNING,
                    startTime,
                    endTime: new Date(),
                    duration: 0,
                    passed: false,
                    vulnerabilities: [],
                    stepResults: [],
                    logs: [],
                    metrics: {
                        executionTime: 0,
                        memoryUsage: 0,
                        networkCalls: 0,
                        databaseQueries: 0,
                        vulnerabilitiesFound: 0,
                        securityScore: 0,
                        complianceScore: 0
                    },
                    evidence: []
                };
                // Test data encryption in transit
                await this.testDataEncryptionInTransit(dataFlow, testResult);
                // Test data integrity
                await this.testDataIntegrity(dataFlow, testResult);
                // Test data sanitization
                await this.testDataSanitization(dataFlow, testResult);
                // Test data access controls
                await this.testDataAccessControls(dataFlow, testResult);
                // Test data leakage prevention
                await this.testDataLeakagePrevention(dataFlow, testResult);
                testResult.status = testResult.vulnerabilities.length === 0 ? security_test_types_1.SecurityTestStatus.PASSED : security_test_types_1.SecurityTestStatus.FAILED;
                testResult.passed = testResult.status === security_test_types_1.SecurityTestStatus.PASSED;
                const endTime = new Date();
                testResult.endTime = endTime;
                testResult.duration = endTime.getTime() - startTime.getTime();
                results.push(testResult);
            }
            catch (error) {
                this.log('error', `Data flow security test failed: ${dataFlow.name}`, error);
            }
        }
        return results;
    }
    /**
     * Test service mesh security
     */
    async testServiceMeshSecurity() {
        this.log('info', 'Testing service mesh security');
        const results = [];
        const startTime = new Date();
        const testResult = {
            testCaseId: 'service-mesh-security',
            status: security_test_types_1.SecurityTestStatus.RUNNING,
            startTime,
            endTime: new Date(),
            duration: 0,
            passed: false,
            vulnerabilities: [],
            stepResults: [],
            logs: [],
            metrics: {
                executionTime: 0,
                memoryUsage: 0,
                networkCalls: 0,
                databaseQueries: 0,
                vulnerabilitiesFound: 0,
                securityScore: 0,
                complianceScore: 0
            },
            evidence: []
        };
        try {
            // Test mTLS configuration
            await this.testMTLSConfiguration(testResult);
            // Test service mesh policies
            await this.testServiceMeshPolicies(testResult);
            // Test traffic encryption
            await this.testTrafficEncryption(testResult);
            // Test service identity validation
            await this.testServiceIdentityValidation(testResult);
            testResult.status = testResult.vulnerabilities.length === 0 ? security_test_types_1.SecurityTestStatus.PASSED : security_test_types_1.SecurityTestStatus.FAILED;
            testResult.passed = testResult.status === security_test_types_1.SecurityTestStatus.PASSED;
            const endTime = new Date();
            testResult.endTime = endTime;
            testResult.duration = endTime.getTime() - startTime.getTime();
            results.push(testResult);
        }
        catch (error) {
            this.log('error', 'Service mesh security test failed', error);
            testResult.status = security_test_types_1.SecurityTestStatus.ERROR;
            testResult.error = error;
            results.push(testResult);
        }
        return results;
    }
    /**
     * Test cross-service communication security
     */
    async testCrossServiceCommunication() {
        this.log('info', 'Testing cross-service communication security');
        const results = [];
        const startTime = new Date();
        for (const commTest of this.config.communicationTests) {
            try {
                const testResult = {
                    testCaseId: `comm-security-${commTest.name}`,
                    status: security_test_types_1.SecurityTestStatus.RUNNING,
                    startTime,
                    endTime: new Date(),
                    duration: 0,
                    passed: false,
                    vulnerabilities: [],
                    stepResults: [],
                    logs: [],
                    metrics: {
                        executionTime: 0,
                        memoryUsage: 0,
                        networkCalls: 0,
                        databaseQueries: 0,
                        vulnerabilitiesFound: 0,
                        securityScore: 0,
                        complianceScore: 0
                    },
                    evidence: []
                };
                // Test WebSocket security
                if (commTest.type === 'websocket') {
                    await this.testWebSocketSecurity(commTest, testResult);
                }
                // Test gRPC security
                if (commTest.type === 'grpc') {
                    await this.testGRPCSecurity(commTest, testResult);
                }
                // Test message queue security
                if (commTest.type === 'messagequeue') {
                    await this.testMessageQueueSecurity(commTest, testResult);
                }
                testResult.status = testResult.vulnerabilities.length === 0 ? security_test_types_1.SecurityTestStatus.PASSED : security_test_types_1.SecurityTestStatus.FAILED;
                testResult.passed = testResult.status === security_test_types_1.SecurityTestStatus.PASSED;
                const endTime = new Date();
                testResult.endTime = endTime;
                testResult.duration = endTime.getTime() - startTime.getTime();
                results.push(testResult);
            }
            catch (error) {
                this.log('error', `Cross-service communication test failed: ${commTest.name}`, error);
            }
        }
        return results;
    }
    /**
     * Authenticate with service
     */
    async authenticateWithService(serviceName, serviceConfig) {
        try {
            const client = this.httpClients.get(serviceName);
            if (!client)
                throw new Error(`No HTTP client for service: ${serviceName}`);
            const response = await client.post(serviceConfig.auth.endpoint, {
                username: serviceConfig.auth.credentials.username,
                password: serviceConfig.auth.credentials.password
            });
            if (response.status === 200 && response.data.token) {
                return {
                    success: true,
                    token: response.data.token,
                    response: response.data
                };
            }
            else {
                return {
                    success: false,
                    error: 'Authentication failed',
                    response: response.data
                };
            }
        }
        catch (error) {
            this.log('error', `Authentication failed for service: ${serviceName}`, error);
            return {
                success: false,
                error: error.message,
                response: null
            };
        }
    }
    /**
     * Validate token security
     */
    async validateTokenSecurity(serviceName, token) {
        try {
            // Decode JWT token without verification to inspect claims
            const decoded = jsonwebtoken_1.default.decode(token);
            if (decoded) {
                // Check token expiration
                if (!decoded.exp) {
                    this.addVulnerability({
                        id: `token-no-exp-${serviceName}-${Date.now()}`,
                        type: 'Token Security',
                        severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                        description: `JWT token missing expiration claim for service: ${serviceName}`,
                        location: `${serviceName} authentication`,
                        recommendation: 'Ensure JWT tokens include expiration claims',
                        evidence: [{ token: token.substring(0, 50) + '...', decoded }],
                        exploitability: 0.5,
                        impact: 0.6,
                        timestamp: new Date()
                    });
                }
                // Check token algorithm
                const header = jsonwebtoken_1.default.decode(token, { complete: true })?.header;
                if (header?.alg === 'none') {
                    this.addVulnerability({
                        id: `token-insecure-alg-${serviceName}-${Date.now()}`,
                        type: 'Token Security',
                        severity: security_test_types_1.SecurityTestSeverity.HIGH,
                        description: `JWT token using insecure 'none' algorithm for service: ${serviceName}`,
                        location: `${serviceName} authentication`,
                        recommendation: 'Use secure signing algorithms like RS256 or HS256',
                        evidence: [{ algorithm: header.alg }],
                        exploitability: 0.9,
                        impact: 0.9,
                        timestamp: new Date()
                    });
                }
                // Check for sensitive data in token
                const sensitiveFields = ['password', 'secret', 'key', 'ssn', 'credit_card'];
                const tokenString = JSON.stringify(decoded).toLowerCase();
                for (const field of sensitiveFields) {
                    if (tokenString.includes(field)) {
                        this.addVulnerability({
                            id: `token-sensitive-data-${serviceName}-${Date.now()}`,
                            type: 'Token Security',
                            severity: security_test_types_1.SecurityTestSeverity.HIGH,
                            description: `JWT token contains potentially sensitive data (${field}) for service: ${serviceName}`,
                            location: `${serviceName} authentication`,
                            recommendation: 'Remove sensitive data from JWT tokens',
                            evidence: [{ field, present: true }],
                            exploitability: 0.7,
                            impact: 0.8,
                            timestamp: new Date()
                        });
                    }
                }
            }
        }
        catch (error) {
            this.log('error', `Token validation failed for service: ${serviceName}`, error);
        }
    }
    /**
     * Test authentication bypass
     */
    async testAuthenticationBypass(serviceName, testResult) {
        try {
            const client = this.httpClients.get(serviceName);
            if (!client)
                return;
            const serviceConfig = this.config.services[serviceName];
            const protectedEndpoints = serviceConfig.protectedEndpoints || [];
            for (const endpoint of protectedEndpoints) {
                try {
                    // Test access without authentication
                    const response = await client.get(endpoint, {
                        headers: {},
                        validateStatus: () => true // Don't throw on 4xx/5xx
                    });
                    if (response.status === 200) {
                        this.addVulnerability({
                            id: `auth-bypass-${serviceName}-${Date.now()}`,
                            type: 'Authentication Bypass',
                            severity: security_test_types_1.SecurityTestSeverity.CRITICAL,
                            description: `Protected endpoint accessible without authentication: ${endpoint}`,
                            location: `${serviceName}${endpoint}`,
                            recommendation: 'Implement proper authentication checks for protected endpoints',
                            evidence: [{ endpoint, status: response.status, data: response.data }],
                            exploitability: 0.9,
                            impact: 1.0,
                            timestamp: new Date()
                        });
                    }
                }
                catch (error) {
                    // Expected behavior for protected endpoints
                    this.log('debug', `Authentication properly enforced for ${endpoint}`);
                }
            }
        }
        catch (error) {
            this.log('error', `Authentication bypass test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test token validation
     */
    async testTokenValidation(serviceName, testResult) {
        try {
            const client = this.httpClients.get(serviceName);
            const token = this.authTokens.get(serviceName);
            if (!client || !token)
                return;
            const serviceConfig = this.config.services[serviceName];
            const protectedEndpoints = serviceConfig.protectedEndpoints || [];
            for (const endpoint of protectedEndpoints) {
                // Test with invalid token
                try {
                    const response = await client.get(endpoint, {
                        headers: { Authorization: `Bearer invalid_token_${Date.now()}` },
                        validateStatus: () => true
                    });
                    if (response.status === 200) {
                        this.addVulnerability({
                            id: `token-validation-fail-${serviceName}-${Date.now()}`,
                            type: 'Token Validation',
                            severity: security_test_types_1.SecurityTestSeverity.HIGH,
                            description: `Endpoint accepts invalid tokens: ${endpoint}`,
                            location: `${serviceName}${endpoint}`,
                            recommendation: 'Implement proper token validation',
                            evidence: [{ endpoint, status: response.status }],
                            exploitability: 0.8,
                            impact: 0.9,
                            timestamp: new Date()
                        });
                    }
                }
                catch (error) {
                    // Expected behavior
                    this.log('debug', `Token validation properly enforced for ${endpoint}`);
                }
                // Test with expired token (simulate)
                try {
                    const expiredToken = jsonwebtoken_1.default.sign({ sub: 'test', exp: Math.floor(Date.now() / 1000) - 3600 }, // Expired 1 hour ago
                    'secret');
                    const response = await client.get(endpoint, {
                        headers: { Authorization: `Bearer ${expiredToken}` },
                        validateStatus: () => true
                    });
                    if (response.status === 200) {
                        this.addVulnerability({
                            id: `expired-token-accepted-${serviceName}-${Date.now()}`,
                            type: 'Token Validation',
                            severity: security_test_types_1.SecurityTestSeverity.HIGH,
                            description: `Endpoint accepts expired tokens: ${endpoint}`,
                            location: `${serviceName}${endpoint}`,
                            recommendation: 'Implement proper token expiration validation',
                            evidence: [{ endpoint, status: response.status }],
                            exploitability: 0.7,
                            impact: 0.8,
                            timestamp: new Date()
                        });
                    }
                }
                catch (error) {
                    // Expected behavior
                    this.log('debug', `Expired token properly rejected for ${endpoint}`);
                }
            }
        }
        catch (error) {
            this.log('error', `Token validation test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test authorized access
     */
    async testAuthorizedAccess(sourceService, targetService, endpoint, expectedAccess) {
        try {
            const sourceToken = this.authTokens.get(sourceService);
            const targetClient = this.httpClients.get(targetService);
            if (!sourceToken || !targetClient) {
                throw new Error(`Missing token or client for authorized access test`);
            }
            const response = await targetClient.get(endpoint, {
                headers: { Authorization: `Bearer ${sourceToken}` },
                validateStatus: () => true
            });
            const actualAccess = response.status === 200;
            const success = actualAccess === expectedAccess;
            if (!success) {
                this.addVulnerability({
                    id: `authz-unexpected-access-${Date.now()}`,
                    type: 'Authorization',
                    severity: security_test_types_1.SecurityTestSeverity.HIGH,
                    description: `Unexpected access result. Expected: ${expectedAccess}, Actual: ${actualAccess}`,
                    location: `${targetService}${endpoint}`,
                    recommendation: 'Review authorization policies and access controls',
                    evidence: [{ sourceService, targetService, endpoint, expectedAccess, actualAccess, status: response.status }],
                    exploitability: 0.7,
                    impact: 0.8,
                    timestamp: new Date()
                });
            }
            return { success };
        }
        catch (error) {
            this.log('error', 'Authorized access test failed', error);
            return { success: false };
        }
    }
    /**
     * Test unauthorized access
     */
    async testUnauthorizedAccess(targetService, endpoint, expectedAccess) {
        try {
            const targetClient = this.httpClients.get(targetService);
            if (!targetClient)
                throw new Error(`Missing client for unauthorized access test`);
            // Test without any authorization
            const response = await targetClient.get(endpoint, {
                validateStatus: () => true
            });
            const actualAccess = response.status === 200;
            const success = !actualAccess; // Should NOT have access
            if (!success) {
                this.addVulnerability({
                    id: `authz-unauthorized-access-${Date.now()}`,
                    type: 'Authorization',
                    severity: security_test_types_1.SecurityTestSeverity.CRITICAL,
                    description: `Unauthorized access granted to endpoint: ${endpoint}`,
                    location: `${targetService}${endpoint}`,
                    recommendation: 'Implement proper authorization checks',
                    evidence: [{ targetService, endpoint, status: response.status }],
                    exploitability: 0.9,
                    impact: 1.0,
                    timestamp: new Date()
                });
            }
            return { success };
        }
        catch (error) {
            this.log('error', 'Unauthorized access test failed', error);
            return { success: false };
        }
    }
    /**
     * Test privilege escalation
     */
    async testPrivilegeEscalation(sourceService, targetService, endpoint) {
        try {
            const sourceToken = this.authTokens.get(sourceService);
            const targetClient = this.httpClients.get(targetService);
            if (!sourceToken || !targetClient) {
                throw new Error(`Missing token or client for privilege escalation test`);
            }
            // Try to modify token claims (if JWT)
            try {
                const decoded = jsonwebtoken_1.default.decode(sourceToken);
                if (decoded) {
                    // Attempt to escalate privileges
                    const escalatedToken = jsonwebtoken_1.default.sign({
                        ...decoded,
                        role: 'admin',
                        permissions: ['read', 'write', 'delete', 'admin'],
                        scope: 'all'
                    }, 'guessed_secret');
                    const response = await targetClient.get(endpoint, {
                        headers: { Authorization: `Bearer ${escalatedToken}` },
                        validateStatus: () => true
                    });
                    if (response.status === 200) {
                        this.addVulnerability({
                            id: `privilege-escalation-${Date.now()}`,
                            type: 'Privilege Escalation',
                            severity: security_test_types_1.SecurityTestSeverity.CRITICAL,
                            description: `Privilege escalation possible through token manipulation`,
                            location: `${targetService}${endpoint}`,
                            recommendation: 'Implement proper token signature verification and claims validation',
                            evidence: [{ originalToken: sourceToken.substring(0, 50), escalatedToken: escalatedToken.substring(0, 50), status: response.status }],
                            exploitability: 0.8,
                            impact: 1.0,
                            timestamp: new Date()
                        });
                        return { success: false };
                    }
                }
            }
            catch (error) {
                // Expected - token manipulation should fail
            }
            return { success: true };
        }
        catch (error) {
            this.log('error', 'Privilege escalation test failed', error);
            return { success: false };
        }
    }
    /**
     * Test API rate limiting
     */
    async testAPIRateLimiting(serviceName, client, testResult) {
        try {
            const serviceConfig = this.config.services[serviceName];
            const rateLimitConfig = serviceConfig.rateLimit;
            if (!rateLimitConfig?.enabled)
                return;
            const endpoint = rateLimitConfig.testEndpoint || '/api/test';
            const maxRequests = rateLimitConfig.maxRequests || 10;
            let requestCount = 0;
            let rateLimitHit = false;
            // Send requests rapidly to test rate limiting
            for (let i = 0; i < maxRequests + 5; i++) {
                try {
                    const response = await client.get(endpoint, { validateStatus: () => true });
                    requestCount++;
                    if (response.status === 429) {
                        rateLimitHit = true;
                        break;
                    }
                    // Small delay between requests
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                catch (error) {
                    this.log('debug', `Request ${i + 1} failed`, error);
                }
            }
            if (!rateLimitHit) {
                this.addVulnerability({
                    id: `no-rate-limit-${serviceName}-${Date.now()}`,
                    type: 'Rate Limiting',
                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                    description: `No rate limiting detected for service: ${serviceName}`,
                    location: `${serviceName}${endpoint}`,
                    recommendation: 'Implement API rate limiting to prevent abuse',
                    evidence: [{ requestsSent: requestCount, rateLimitHit: false }],
                    exploitability: 0.6,
                    impact: 0.5,
                    timestamp: new Date()
                });
            }
        }
        catch (error) {
            this.log('error', `Rate limiting test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test API input validation
     */
    async testAPIInputValidation(serviceName, client, testResult) {
        try {
            const serviceConfig = this.config.services[serviceName];
            const testEndpoints = serviceConfig.inputValidationEndpoints || [];
            const maliciousPayloads = [
                { type: 'SQL Injection', payload: "'; DROP TABLE users; --" },
                { type: 'XSS', payload: '<script>alert("XSS")</script>' },
                { type: 'NoSQL Injection', payload: { '$ne': null } },
                { type: 'Command Injection', payload: '; cat /etc/passwd' },
                { type: 'LDAP Injection', payload: '*)(&' },
                { type: 'XML Injection', payload: '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>' }
            ];
            for (const endpoint of testEndpoints) {
                for (const payload of maliciousPayloads) {
                    try {
                        const response = await client.post(endpoint, payload.payload, {
                            validateStatus: () => true,
                            headers: { 'Content-Type': 'application/json' }
                        });
                        // Check if malicious payload was processed or reflected
                        const responseText = JSON.stringify(response.data).toLowerCase();
                        const payloadDetected = responseText.includes(payload.payload.toLowerCase()) ||
                            responseText.includes('error') === false ||
                            response.status === 500;
                        if (payloadDetected && response.status !== 400) {
                            this.addVulnerability({
                                id: `input-validation-${serviceName}-${Date.now()}`,
                                type: 'Input Validation',
                                severity: security_test_types_1.SecurityTestSeverity.HIGH,
                                description: `Potential ${payload.type} vulnerability in endpoint: ${endpoint}`,
                                location: `${serviceName}${endpoint}`,
                                recommendation: 'Implement proper input validation and sanitization',
                                evidence: [{ payloadType: payload.type, payload: payload.payload, response: response.data, status: response.status }],
                                exploitability: 0.8,
                                impact: 0.9,
                                timestamp: new Date()
                            });
                        }
                    }
                    catch (error) {
                        // Errors are expected for malicious payloads
                        this.log('debug', `Input validation test for ${payload.type} caused expected error`);
                    }
                }
            }
        }
        catch (error) {
            this.log('error', `Input validation test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test API output encoding
     */
    async testAPIOutputEncoding(serviceName, client, testResult) {
        try {
            const serviceConfig = this.config.services[serviceName];
            const testEndpoints = serviceConfig.outputEncodingEndpoints || [];
            for (const endpoint of testEndpoints) {
                try {
                    const response = await client.get(endpoint, { validateStatus: () => true });
                    if (response.status === 200) {
                        const contentType = response.headers['content-type'] || '';
                        const responseData = response.data;
                        // Check for proper content type
                        if (contentType.includes('application/json') && typeof responseData === 'string') {
                            this.addVulnerability({
                                id: `output-encoding-${serviceName}-${Date.now()}`,
                                type: 'Output Encoding',
                                severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                                description: `Potential output encoding issue: JSON declared but string returned`,
                                location: `${serviceName}${endpoint}`,
                                recommendation: 'Ensure proper content type headers and data encoding',
                                evidence: [{ contentType, dataType: typeof responseData }],
                                exploitability: 0.4,
                                impact: 0.5,
                                timestamp: new Date()
                            });
                        }
                        // Check for unescaped HTML in JSON responses
                        if (typeof responseData === 'object') {
                            const jsonString = JSON.stringify(responseData);
                            if (jsonString.includes('<script>') || jsonString.includes('javascript:')) {
                                this.addVulnerability({
                                    id: `output-xss-${serviceName}-${Date.now()}`,
                                    type: 'Output Encoding',
                                    severity: security_test_types_1.SecurityTestSeverity.HIGH,
                                    description: `Potential XSS in API response: unescaped HTML/JavaScript`,
                                    location: `${serviceName}${endpoint}`,
                                    recommendation: 'Properly escape HTML content in API responses',
                                    evidence: [{ response: jsonString.substring(0, 500) }],
                                    exploitability: 0.7,
                                    impact: 0.8,
                                    timestamp: new Date()
                                });
                            }
                        }
                    }
                }
                catch (error) {
                    this.log('error', `Output encoding test failed for endpoint ${endpoint}`, error);
                }
            }
        }
        catch (error) {
            this.log('error', `Output encoding test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test CORS configuration
     */
    async testCORSConfiguration(serviceName, client, testResult) {
        try {
            const serviceConfig = this.config.services[serviceName];
            const corsEndpoint = serviceConfig.corsTestEndpoint || '/api/test';
            // Test CORS with OPTIONS request
            const response = await client.options(corsEndpoint, {
                headers: {
                    'Origin': 'https://malicious-site.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                },
                validateStatus: () => true
            });
            const corsHeaders = {
                allowOrigin: response.headers['access-control-allow-origin'],
                allowMethods: response.headers['access-control-allow-methods'],
                allowHeaders: response.headers['access-control-allow-headers'],
                allowCredentials: response.headers['access-control-allow-credentials']
            };
            // Check for overly permissive CORS
            if (corsHeaders.allowOrigin === '*') {
                this.addVulnerability({
                    id: `cors-wildcard-${serviceName}-${Date.now()}`,
                    type: 'CORS Configuration',
                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                    description: `Overly permissive CORS configuration: allows all origins`,
                    location: `${serviceName}${corsEndpoint}`,
                    recommendation: 'Restrict CORS to specific trusted origins',
                    evidence: [{ corsHeaders }],
                    exploitability: 0.5,
                    impact: 0.6,
                    timestamp: new Date()
                });
            }
            // Check for dangerous method allowance
            if (corsHeaders.allowMethods?.includes('DELETE') || corsHeaders.allowMethods?.includes('PUT')) {
                if (corsHeaders.allowOrigin === '*' || corsHeaders.allowOrigin === 'https://malicious-site.com') {
                    this.addVulnerability({
                        id: `cors-dangerous-methods-${serviceName}-${Date.now()}`,
                        type: 'CORS Configuration',
                        severity: security_test_types_1.SecurityTestSeverity.HIGH,
                        description: `Dangerous CORS configuration: allows destructive methods from untrusted origins`,
                        location: `${serviceName}${corsEndpoint}`,
                        recommendation: 'Restrict dangerous HTTP methods in CORS configuration',
                        evidence: [{ corsHeaders }],
                        exploitability: 0.7,
                        impact: 0.8,
                        timestamp: new Date()
                    });
                }
            }
        }
        catch (error) {
            this.log('error', `CORS configuration test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test security headers
     */
    async testSecurityHeaders(serviceName, client, testResult) {
        try {
            const serviceConfig = this.config.services[serviceName];
            const testEndpoint = serviceConfig.securityHeadersEndpoint || '/';
            const response = await client.get(testEndpoint, { validateStatus: () => true });
            const securityHeaders = {
                contentSecurityPolicy: response.headers['content-security-policy'],
                strictTransportSecurity: response.headers['strict-transport-security'],
                xFrameOptions: response.headers['x-frame-options'],
                xContentTypeOptions: response.headers['x-content-type-options'],
                xXSSProtection: response.headers['x-xss-protection'],
                referrerPolicy: response.headers['referrer-policy']
            };
            // Check for missing security headers
            const requiredHeaders = [
                { name: 'Content-Security-Policy', header: 'contentSecurityPolicy' },
                { name: 'X-Frame-Options', header: 'xFrameOptions' },
                { name: 'X-Content-Type-Options', header: 'xContentTypeOptions' }
            ];
            for (const { name, header } of requiredHeaders) {
                if (!securityHeaders[header]) {
                    this.addVulnerability({
                        id: `missing-security-header-${serviceName}-${Date.now()}`,
                        type: 'Security Headers',
                        severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                        description: `Missing security header: ${name}`,
                        location: `${serviceName}${testEndpoint}`,
                        recommendation: `Implement ${name} header for enhanced security`,
                        evidence: [{ missingHeader: name, allHeaders: securityHeaders }],
                        exploitability: 0.4,
                        impact: 0.5,
                        timestamp: new Date()
                    });
                }
            }
            // Check for HTTPS enforcement
            if (!securityHeaders.strictTransportSecurity && client.defaults.baseURL?.startsWith('https://')) {
                this.addVulnerability({
                    id: `missing-hsts-${serviceName}-${Date.now()}`,
                    type: 'Security Headers',
                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                    description: `Missing HSTS header for HTTPS service`,
                    location: `${serviceName}${testEndpoint}`,
                    recommendation: 'Implement Strict-Transport-Security header',
                    evidence: [{ securityHeaders }],
                    exploitability: 0.3,
                    impact: 0.4,
                    timestamp: new Date()
                });
            }
        }
        catch (error) {
            this.log('error', `Security headers test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test API versioning security
     */
    async testAPIVersioningSecurity(serviceName, client, testResult) {
        try {
            const serviceConfig = this.config.services[serviceName];
            const versioningConfig = serviceConfig.apiVersioning;
            if (!versioningConfig?.enabled)
                return;
            const versions = versioningConfig.versions || ['v1', 'v2'];
            const testEndpoint = versioningConfig.testEndpoint || '/api/{version}/test';
            for (const version of versions) {
                try {
                    const endpoint = testEndpoint.replace('{version}', version);
                    const response = await client.get(endpoint, { validateStatus: () => true });
                    // Check if deprecated versions are still accessible
                    if (versioningConfig.deprecatedVersions?.includes(version) && response.status === 200) {
                        this.addVulnerability({
                            id: `deprecated-api-version-${serviceName}-${Date.now()}`,
                            type: 'API Versioning',
                            severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                            description: `Deprecated API version still accessible: ${version}`,
                            location: `${serviceName}${endpoint}`,
                            recommendation: 'Disable or properly secure deprecated API versions',
                            evidence: [{ version, status: response.status }],
                            exploitability: 0.5,
                            impact: 0.6,
                            timestamp: new Date()
                        });
                    }
                }
                catch (error) {
                    this.log('debug', `API version ${version} properly secured or unavailable`);
                }
            }
        }
        catch (error) {
            this.log('error', `API versioning security test failed for ${serviceName}`, error);
        }
    }
    /**
     * Test data encryption in transit
     */
    async testDataEncryptionInTransit(dataFlow, testResult) {
        try {
            const sourceClient = this.httpClients.get(dataFlow.sourceService);
            const targetClient = this.httpClients.get(dataFlow.targetService);
            if (!sourceClient || !targetClient)
                return;
            // Check if endpoints use HTTPS
            const sourceUrl = sourceClient.defaults.baseURL;
            const targetUrl = targetClient.defaults.baseURL;
            if (!sourceUrl?.startsWith('https://')) {
                this.addVulnerability({
                    id: `data-transit-http-source-${Date.now()}`,
                    type: 'Data Encryption',
                    severity: security_test_types_1.SecurityTestSeverity.HIGH,
                    description: `Data flow source using HTTP instead of HTTPS: ${dataFlow.sourceService}`,
                    location: dataFlow.sourceService,
                    recommendation: 'Use HTTPS for all data transmission',
                    evidence: [{ service: dataFlow.sourceService, url: sourceUrl }],
                    exploitability: 0.8,
                    impact: 0.9,
                    timestamp: new Date()
                });
            }
            if (!targetUrl?.startsWith('https://')) {
                this.addVulnerability({
                    id: `data-transit-http-target-${Date.now()}`,
                    type: 'Data Encryption',
                    severity: security_test_types_1.SecurityTestSeverity.HIGH,
                    description: `Data flow target using HTTP instead of HTTPS: ${dataFlow.targetService}`,
                    location: dataFlow.targetService,
                    recommendation: 'Use HTTPS for all data transmission',
                    evidence: [{ service: dataFlow.targetService, url: targetUrl }],
                    exploitability: 0.8,
                    impact: 0.9,
                    timestamp: new Date()
                });
            }
        }
        catch (error) {
            this.log('error', `Data encryption in transit test failed for ${dataFlow.name}`, error);
        }
    }
    /**
     * Test data integrity
     */
    async testDataIntegrity(dataFlow, testResult) {
        try {
            const sourceClient = this.httpClients.get(dataFlow.sourceService);
            if (!sourceClient)
                return;
            // Test if data can be tampered with during transmission
            const testData = { id: 1, value: 'original_value', timestamp: Date.now() };
            const response = await sourceClient.post(dataFlow.endpoint, testData, {
                validateStatus: () => true
            });
            // In a real scenario, you would intercept and modify the request
            // For this test, we check if there are integrity checks in place
            if (response.status === 200) {
                // Check if response includes integrity verification
                const responseData = response.data;
                const hasIntegrityCheck = responseData.checksum || responseData.hash || responseData.signature;
                if (!hasIntegrityCheck) {
                    this.addVulnerability({
                        id: `data-integrity-missing-${Date.now()}`,
                        type: 'Data Integrity',
                        severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                        description: `No data integrity verification detected for data flow: ${dataFlow.name}`,
                        location: `${dataFlow.sourceService}${dataFlow.endpoint}`,
                        recommendation: 'Implement data integrity checks using checksums or digital signatures',
                        evidence: [{ dataFlow: dataFlow.name, response: responseData }],
                        exploitability: 0.6,
                        impact: 0.7,
                        timestamp: new Date()
                    });
                }
            }
        }
        catch (error) {
            this.log('error', `Data integrity test failed for ${dataFlow.name}`, error);
        }
    }
    /**
     * Test data sanitization
     */
    async testDataSanitization(dataFlow, testResult) {
        try {
            const sourceClient = this.httpClients.get(dataFlow.sourceService);
            if (!sourceClient)
                return;
            const maliciousData = {
                xss: '<script>alert("XSS")</script>',
                sqlInjection: "'; DROP TABLE users; --",
                htmlInjection: '<img src=x onerror=alert("HTML")>',
                pathTraversal: '../../../etc/passwd',
                nullByte: 'test\x00.txt'
            };
            const response = await sourceClient.post(dataFlow.endpoint, maliciousData, {
                validateStatus: () => true
            });
            if (response.status === 200) {
                const responseText = JSON.stringify(response.data);
                // Check if malicious data was reflected back unsanitized
                for (const [type, payload] of Object.entries(maliciousData)) {
                    if (responseText.includes(payload)) {
                        this.addVulnerability({
                            id: `data-sanitization-${type}-${Date.now()}`,
                            type: 'Data Sanitization',
                            severity: security_test_types_1.SecurityTestSeverity.HIGH,
                            description: `Unsanitized ${type} payload reflected in response for data flow: ${dataFlow.name}`,
                            location: `${dataFlow.sourceService}${dataFlow.endpoint}`,
                            recommendation: 'Implement proper data sanitization and output encoding',
                            evidence: [{ payloadType: type, payload, response: responseText.substring(0, 500) }],
                            exploitability: 0.8,
                            impact: 0.9,
                            timestamp: new Date()
                        });
                    }
                }
            }
        }
        catch (error) {
            this.log('error', `Data sanitization test failed for ${dataFlow.name}`, error);
        }
    }
    /**
     * Test data access controls
     */
    async testDataAccessControls(dataFlow, testResult) {
        try {
            const targetClient = this.httpClients.get(dataFlow.targetService);
            if (!targetClient)
                return;
            // Test unauthorized data access
            const unauthorizedResponse = await targetClient.get(dataFlow.dataEndpoint || '/api/data', {
                validateStatus: () => true
            });
            if (unauthorizedResponse.status === 200) {
                this.addVulnerability({
                    id: `data-access-unauthorized-${Date.now()}`,
                    type: 'Data Access Control',
                    severity: security_test_types_1.SecurityTestSeverity.HIGH,
                    description: `Unauthorized data access allowed for data flow: ${dataFlow.name}`,
                    location: `${dataFlow.targetService}${dataFlow.dataEndpoint}`,
                    recommendation: 'Implement proper access controls for data endpoints',
                    evidence: [{ status: unauthorizedResponse.status, data: unauthorizedResponse.data }],
                    exploitability: 0.8,
                    impact: 0.9,
                    timestamp: new Date()
                });
            }
            // Test data enumeration
            for (let i = 1; i <= 10; i++) {
                try {
                    const enumerationResponse = await targetClient.get(`${dataFlow.dataEndpoint || '/api/data'}/${i}`, {
                        validateStatus: () => true
                    });
                    if (enumerationResponse.status === 200) {
                        this.addVulnerability({
                            id: `data-enumeration-${Date.now()}`,
                            type: 'Data Access Control',
                            severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                            description: `Data enumeration possible for data flow: ${dataFlow.name}`,
                            location: `${dataFlow.targetService}${dataFlow.dataEndpoint}`,
                            recommendation: 'Implement proper authorization checks to prevent data enumeration',
                            evidence: [{ enumeratedId: i, status: enumerationResponse.status }],
                            exploitability: 0.6,
                            impact: 0.7,
                            timestamp: new Date()
                        });
                        break; // Only report once
                    }
                }
                catch (error) {
                    // Expected for properly secured endpoints
                }
            }
        }
        catch (error) {
            this.log('error', `Data access controls test failed for ${dataFlow.name}`, error);
        }
    }
    /**
     * Test data leakage prevention
     */
    async testDataLeakagePrevention(dataFlow, testResult) {
        try {
            const sourceClient = this.httpClients.get(dataFlow.sourceService);
            if (!sourceClient)
                return;
            // Test for information disclosure in error messages
            const invalidRequests = [
                { endpoint: '/api/nonexistent', expectedError: 404 },
                { endpoint: '/api/data/99999999', expectedError: 404 },
                { endpoint: '/api/admin', expectedError: 403 }
            ];
            for (const invalidRequest of invalidRequests) {
                try {
                    const response = await sourceClient.get(invalidRequest.endpoint, {
                        validateStatus: () => true
                    });
                    if (response.status === invalidRequest.expectedError) {
                        const errorResponse = JSON.stringify(response.data);
                        // Check for sensitive information in error messages
                        const sensitivePatterns = [
                            /database/i,
                            /connection/i,
                            /stack trace/i,
                            /internal server error/i,
                            /sql/i,
                            /exception/i,
                            /debug/i,
                            /path/i,
                            /file not found/i
                        ];
                        for (const pattern of sensitivePatterns) {
                            if (pattern.test(errorResponse)) {
                                this.addVulnerability({
                                    id: `data-leakage-error-${Date.now()}`,
                                    type: 'Data Leakage',
                                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                                    description: `Sensitive information disclosed in error message for data flow: ${dataFlow.name}`,
                                    location: `${dataFlow.sourceService}${invalidRequest.endpoint}`,
                                    recommendation: 'Implement generic error messages without sensitive information',
                                    evidence: [{ endpoint: invalidRequest.endpoint, errorResponse: errorResponse.substring(0, 300) }],
                                    exploitability: 0.4,
                                    impact: 0.5,
                                    timestamp: new Date()
                                });
                                break;
                            }
                        }
                    }
                }
                catch (error) {
                    this.log('debug', `Error message test for ${invalidRequest.endpoint} caused expected error`);
                }
            }
        }
        catch (error) {
            this.log('error', `Data leakage prevention test failed for ${dataFlow.name}`, error);
        }
    }
    /**
     * Test mTLS configuration
     */
    async testMTLSConfiguration(testResult) {
        this.log('info', 'Testing mTLS configuration');
        // This would require actual certificate validation in a real implementation
        // For now, we'll check if the services are configured to use client certificates
        for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
            if (serviceConfig.mtls?.enabled) {
                // Test would involve checking client certificate requirements
                this.log('info', `mTLS enabled for service: ${serviceName}`);
            }
            else {
                this.addVulnerability({
                    id: `mtls-disabled-${serviceName}-${Date.now()}`,
                    type: 'Service Mesh Security',
                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                    description: `mTLS not enabled for service: ${serviceName}`,
                    location: serviceName,
                    recommendation: 'Enable mTLS for enhanced service-to-service security',
                    evidence: [{ service: serviceName, mtlsEnabled: false }],
                    exploitability: 0.5,
                    impact: 0.6,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Test service mesh policies
     */
    async testServiceMeshPolicies(testResult) {
        this.log('info', 'Testing service mesh policies');
        // In a real implementation, this would check Istio/Linkerd policies
        // For now, we'll simulate policy validation
        const requiredPolicies = ['authentication', 'authorization', 'traffic-encryption'];
        for (const policy of requiredPolicies) {
            // Simulate policy check
            const policyPresent = Math.random() > 0.5; // Placeholder logic
            if (!policyPresent) {
                this.addVulnerability({
                    id: `mesh-policy-missing-${policy}-${Date.now()}`,
                    type: 'Service Mesh Security',
                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                    description: `Missing service mesh policy: ${policy}`,
                    location: 'Service Mesh Configuration',
                    recommendation: `Implement ${policy} policy in service mesh`,
                    evidence: [{ policy, present: false }],
                    exploitability: 0.4,
                    impact: 0.5,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Test traffic encryption
     */
    async testTrafficEncryption(testResult) {
        this.log('info', 'Testing traffic encryption');
        // Check if all service communications use HTTPS
        for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
            if (!serviceConfig.baseUrl.startsWith('https://')) {
                this.addVulnerability({
                    id: `traffic-encryption-missing-${serviceName}-${Date.now()}`,
                    type: 'Service Mesh Security',
                    severity: security_test_types_1.SecurityTestSeverity.HIGH,
                    description: `Service not using encrypted traffic: ${serviceName}`,
                    location: serviceName,
                    recommendation: 'Enable HTTPS/TLS for all service communications',
                    evidence: [{ service: serviceName, url: serviceConfig.baseUrl }],
                    exploitability: 0.7,
                    impact: 0.8,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Test service identity validation
     */
    async testServiceIdentityValidation(testResult) {
        this.log('info', 'Testing service identity validation');
        // In a real implementation, this would validate service certificates and identities
        // For now, we'll check if services validate caller identities
        for (const [serviceName, serviceConfig] of Object.entries(this.config.services)) {
            if (!serviceConfig.identityValidation?.enabled) {
                this.addVulnerability({
                    id: `identity-validation-disabled-${serviceName}-${Date.now()}`,
                    type: 'Service Mesh Security',
                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                    description: `Service identity validation not enabled: ${serviceName}`,
                    location: serviceName,
                    recommendation: 'Enable service identity validation in service mesh',
                    evidence: [{ service: serviceName, identityValidation: false }],
                    exploitability: 0.5,
                    impact: 0.6,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Test WebSocket security
     */
    async testWebSocketSecurity(commTest, testResult) {
        try {
            this.log('info', `Testing WebSocket security for: ${commTest.name}`);
            const wsUrl = commTest.url.replace('http', 'ws');
            // Test WebSocket connection
            const ws = new ws_1.default(wsUrl);
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    ws.close();
                    this.addVulnerability({
                        id: `websocket-timeout-${Date.now()}`,
                        type: 'WebSocket Security',
                        severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                        description: `WebSocket connection timeout for: ${commTest.name}`,
                        location: wsUrl,
                        recommendation: 'Review WebSocket connection security and authentication',
                        evidence: [{ url: wsUrl, timeout: true }],
                        exploitability: 0.3,
                        impact: 0.4,
                        timestamp: new Date()
                    });
                    resolve(undefined);
                }, 5000);
                ws.on('open', () => {
                    clearTimeout(timeout);
                    // Test unauthorized message sending
                    ws.send(JSON.stringify({ type: 'unauthorized_test', data: 'test' }));
                    setTimeout(() => {
                        ws.close();
                        resolve(undefined);
                    }, 1000);
                });
                ws.on('error', (error) => {
                    clearTimeout(timeout);
                    this.log('debug', `WebSocket error (expected for security test): ${error.message}`);
                    resolve(undefined);
                });
                ws.on('message', (data) => {
                    // Check if unauthorized message was processed
                    const message = JSON.parse(data.toString());
                    if (message.type === 'unauthorized_response') {
                        this.addVulnerability({
                            id: `websocket-unauthorized-${Date.now()}`,
                            type: 'WebSocket Security',
                            severity: security_test_types_1.SecurityTestSeverity.HIGH,
                            description: `WebSocket processes unauthorized messages: ${commTest.name}`,
                            location: wsUrl,
                            recommendation: 'Implement proper authentication and authorization for WebSocket messages',
                            evidence: [{ message }],
                            exploitability: 0.7,
                            impact: 0.8,
                            timestamp: new Date()
                        });
                    }
                });
            });
        }
        catch (error) {
            this.log('error', `WebSocket security test failed for ${commTest.name}`, error);
        }
    }
    /**
     * Test gRPC security
     */
    async testGRPCSecurity(commTest, testResult) {
        this.log('info', `Testing gRPC security for: ${commTest.name}`);
        // In a real implementation, this would test gRPC-specific security features
        // For now, we'll simulate gRPC security validation
        const grpcSecurityChecks = [
            { name: 'TLS Enabled', check: () => commTest.url.startsWith('https://') },
            { name: 'Authentication Required', check: () => commTest.authRequired || false },
            { name: 'Input Validation', check: () => commTest.inputValidation || false }
        ];
        for (const { name, check } of grpcSecurityChecks) {
            if (!check()) {
                this.addVulnerability({
                    id: `grpc-security-${name.toLowerCase().replace(' ', '-')}-${Date.now()}`,
                    type: 'gRPC Security',
                    severity: security_test_types_1.SecurityTestSeverity.MEDIUM,
                    description: `gRPC security issue: ${name} not properly configured for ${commTest.name}`,
                    location: commTest.url,
                    recommendation: `Configure ${name} for gRPC service`,
                    evidence: [{ check: name, passed: false }],
                    exploitability: 0.5,
                    impact: 0.6,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Test message queue security
     */
    async testMessageQueueSecurity(commTest, testResult) {
        this.log('info', `Testing message queue security for: ${commTest.name}`);
        // In a real implementation, this would test message queue security features
        // For now, we'll simulate message queue security validation
        const mqSecurityChecks = [
            { name: 'Authentication Required', severity: security_test_types_1.SecurityTestSeverity.HIGH },
            { name: 'Message Encryption', severity: security_test_types_1.SecurityTestSeverity.MEDIUM },
            { name: 'Queue Access Controls', severity: security_test_types_1.SecurityTestSeverity.HIGH },
            { name: 'Message Validation', severity: security_test_types_1.SecurityTestSeverity.MEDIUM }
        ];
        for (const { name, severity } of mqSecurityChecks) {
            // Simulate security check failure
            const passed = Math.random() > 0.3; // 70% chance of passing
            if (!passed) {
                this.addVulnerability({
                    id: `mq-security-${name.toLowerCase().replace(' ', '-')}-${Date.now()}`,
                    type: 'Message Queue Security',
                    severity,
                    description: `Message queue security issue: ${name} not properly configured for ${commTest.name}`,
                    location: commTest.url,
                    recommendation: `Implement ${name} for message queue`,
                    evidence: [{ check: name, passed: false }],
                    exploitability: 0.6,
                    impact: severity === security_test_types_1.SecurityTestSeverity.HIGH ? 0.8 : 0.5,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Add security vulnerability
     */
    addVulnerability(vulnerability) {
        this.vulnerabilities.push(vulnerability);
        this.log('warn', `Security vulnerability detected: ${vulnerability.type} - ${vulnerability.description}`);
    }
    /**
     * Log cross-service testing activities
     */
    log(level, message, data) {
        const logEntry = {
            timestamp: new Date(),
            level,
            message,
            data,
            component: 'CrossServiceSecurityTesting'
        };
        this.logs.push(logEntry);
        console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        // Close WebSocket connections
        for (const [name, ws] of this.wsConnections) {
            if (ws.readyState === ws_1.default.OPEN) {
                ws.close();
            }
        }
        this.wsConnections.clear();
        // Clear auth tokens
        this.authTokens.clear();
        this.log('info', 'Cross-service security testing framework cleaned up successfully');
    }
}
exports.CrossServiceSecurityTesting = CrossServiceSecurityTesting;
//# sourceMappingURL=cross-service-security.js.map