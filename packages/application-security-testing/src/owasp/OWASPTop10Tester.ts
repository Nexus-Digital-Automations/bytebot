/**
 * @fileoverview OWASP Top 10 Security Testing Suite
 * @description Comprehensive testing for OWASP Top 10 vulnerabilities
 * @version 1.0.0
 * @author ByteBot Security Team
 */

import { EventEmitter } from 'events';
import { InjectionTester } from './InjectionTester';
import { AuthenticationFlawDetector } from './AuthenticationFlawDetector';
import { SensitiveDataExposureDetector } from './SensitiveDataExposureDetector';
import { XXEDetector } from './XXEDetector';
import { AccessControlTester } from './AccessControlTester';
import { SecurityMisconfigurationDetector } from './SecurityMisconfigurationDetector';
import { XSSDetector } from './XSSDetector';
import { InsecureDeserializationDetector } from './InsecureDeserializationDetector';
import { VulnerableComponentsDetector } from './VulnerableComponentsDetector';
import { LoggingMonitoringTester } from './LoggingMonitoringTester';
import { SecurityLogger } from '../utils/SecurityLogger';
import { SecurityUtils } from '../utils/SecurityUtils';
import {
  OWASPTestResult,
  OWASPTestOptions,
  Vulnerability,
  OWASPCategory,
  OWASPMetrics,
  SecurityTestType
} from '../types/SecurityTypes';

/**
 * OWASP Top 10 Security Tester
 * Comprehensive testing suite for the OWASP Top 10 security vulnerabilities
 */
export class OWASPTop10Tester extends EventEmitter {
  private static readonly OWASP_TOP_10_CATEGORIES = [
    'A01:2021-Broken Access Control',
    'A02:2021-Cryptographic Failures',
    'A03:2021-Injection',
    'A04:2021-Insecure Design',
    'A05:2021-Security Misconfiguration',
    'A06:2021-Vulnerable and Outdated Components',
    'A07:2021-Identification and Authentication Failures',
    'A08:2021-Software and Data Integrity Failures',
    'A09:2021-Security Logging and Monitoring Failures',
    'A10:2021-Server-Side Request Forgery (SSRF)'
  ];
  
  private static readonly DEFAULT_TEST_OPTIONS: OWASPTestOptions = {
    timeout: 900000, // 15 minutes
    enabledCategories: OWASPTop10Tester.OWASP_TOP_10_CATEGORIES,
    thoroughness: 'comprehensive',
    parallelExecution: true,
    maxParallelTests: 5,
    skipLowSeverity: false,
    includeExperimental: false,
    customPayloads: [],
    testDepth: 'deep',
    performanceMode: false,
    reportFormat: 'detailed'
  };
  
  // OWASP Top 10 Testing Components
  private injectionTester: InjectionTester;
  private authFlawDetector: AuthenticationFlawDetector;
  private dataExposureDetector: SensitiveDataExposureDetector;
  private xxeDetector: XXEDetector;
  private accessControlTester: AccessControlTester;
  private misconfigurationDetector: SecurityMisconfigurationDetector;
  private xssDetector: XSSDetector;
  private deserializationDetector: InsecureDeserializationDetector;
  private vulnerableComponentsDetector: VulnerableComponentsDetector;
  private loggingMonitoringTester: LoggingMonitoringTester;
  
  private logger: SecurityLogger;
  private utils: SecurityUtils;
  
  private isInitialized: boolean = false;
  private activeTestTasks: Map<string, any> = new Map();
  private testHistory: OWASPTestResult[] = [];
  
  constructor(options?: Partial<OWASPTestOptions>) {
    super();
    this.logger = new SecurityLogger('OWASPTop10Tester');
    this.utils = new SecurityUtils();
    
    // Initialize OWASP Top 10 testing components
    this.injectionTester = new InjectionTester();
    this.authFlawDetector = new AuthenticationFlawDetector();
    this.dataExposureDetector = new SensitiveDataExposureDetector();
    this.xxeDetector = new XXEDetector();
    this.accessControlTester = new AccessControlTester();
    this.misconfigurationDetector = new SecurityMisconfigurationDetector();
    this.xssDetector = new XSSDetector();
    this.deserializationDetector = new InsecureDeserializationDetector();
    this.vulnerableComponentsDetector = new VulnerableComponentsDetector();
    this.loggingMonitoringTester = new LoggingMonitoringTester();
  }
  
  /**
   * Initialize the OWASP Top 10 Tester
   */
  public async initialize(options?: Partial<OWASPTestOptions>): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Initializing OWASP Top 10 Tester...');
    
    try {
      // Initialize all OWASP testing components
      await Promise.all([
        this.injectionTester.initialize(),
        this.authFlawDetector.initialize(),
        this.dataExposureDetector.initialize(),
        this.xxeDetector.initialize(),
        this.accessControlTester.initialize(),
        this.misconfigurationDetector.initialize(),
        this.xssDetector.initialize(),
        this.deserializationDetector.initialize(),
        this.vulnerableComponentsDetector.initialize(),
        this.loggingMonitoringTester.initialize()
      ]);
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      this.logger.info(`OWASP Top 10 Tester initialized in ${initTime}ms`);
      this.emit('initialized', { timestamp: new Date(), duration: initTime });
      
    } catch (error) {
      this.logger.error('Failed to initialize OWASP Top 10 Tester', error);
      this.emit('initializationError', error);
      throw error;
    }
  }
  
  /**
   * Run comprehensive OWASP Top 10 security tests
   */
  public async runComprehensiveTest(
    target: string,
    options: Partial<OWASPTestOptions> = {}
  ): Promise<OWASPTestResult> {
    const testOptions = { ...OWASPTop10Tester.DEFAULT_TEST_OPTIONS, ...options };
    const testId = this.utils.generateTaskId('OWASP_TEST');
    
    this.logger.info(`Starting OWASP Top 10 comprehensive test: ${target}`, { testId });
    
    const testResult: OWASPTestResult = {
      id: testId,
      target,
      startTime: new Date(),
      status: 'running',
      options: testOptions,
      vulnerabilities: [],
      categoryResults: new Map(),
      metrics: {
        scanDuration: 0,
        testsExecuted: 0,
        categoriesTestsed: 0,
        vulnerabilitiesDetected: 0,
        coveragePercentage: 0,
        falsePositiveRate: 0
      }
    };
    
    this.activeTestTasks.set(testId, testResult);
    this.emit('testStarted', testResult);
    
    try {
      this.validateInitialization();
      
      const testStartTime = Date.now();
      const enabledCategories = testOptions.enabledCategories || OWASPTop10Tester.OWASP_TOP_10_CATEGORIES;
      
      // Execute OWASP Top 10 tests based on enabled categories
      const testPromises: Promise<any>[] = [];
      
      enabledCategories.forEach((category, index) => {
        const categoryTest = this.executeOWASPCategoryTest(testId, target, category, testOptions);
        testPromises.push(categoryTest);
        
        // Update progress
        const progress = Math.floor(((index + 1) / enabledCategories.length) * 90);
        this.emit('testProgress', {
          testId,
          category,
          progress,
          message: `Testing ${category}...`
        });
      });
      
      // Wait for all category tests to complete
      const categoryResults = await Promise.all(testPromises);
      
      // Aggregate results
      categoryResults.forEach((result, index) => {
        const category = enabledCategories[index];
        testResult.categoryResults.set(category, result);
        testResult.vulnerabilities.push(...result.vulnerabilities);
        testResult.metrics.testsExecuted += result.testsExecuted;
      });
      
      // Finalize test results
      testResult.status = 'completed';
      testResult.endTime = new Date();
      testResult.metrics.scanDuration = Date.now() - testStartTime;
      testResult.metrics.categoriesTestsed = enabledCategories.length;
      testResult.metrics.vulnerabilitiesDetected = testResult.vulnerabilities.length;
      testResult.metrics.coveragePercentage = this.calculateCoveragePercentage(testResult);
      testResult.metrics.falsePositiveRate = await this.calculateFalsePositiveRate(testResult.vulnerabilities);
      
      // Remove duplicates and sort by severity
      testResult.vulnerabilities = this.deduplicateAndSortVulnerabilities(testResult.vulnerabilities);
      
      this.logger.info(`OWASP Top 10 test completed: ${testResult.vulnerabilities.length} vulnerabilities found`, { testId });
      
      this.activeTestTasks.delete(testId);
      this.testHistory.push(testResult);
      
      this.emit('testCompleted', testResult);
      return testResult;
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.endTime = new Date();
      testResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`OWASP Top 10 test failed for: ${target}`, error, { testId });
      this.activeTestTasks.delete(testId);
      this.testHistory.push(testResult);
      
      this.emit('testFailed', testResult);
      throw error;
    }
  }
  
  /**
   * Run specific OWASP category test
   */
  public async runCategoryTest(
    target: string,
    category: OWASPCategory,
    options: Partial<OWASPTestOptions> = {}
  ): Promise<any> {
    const testOptions = { ...OWASPTop10Tester.DEFAULT_TEST_OPTIONS, ...options };
    const testId = this.utils.generateTaskId('OWASP_CATEGORY');
    
    this.logger.info(`Running OWASP category test: ${category} for ${target}`, { testId });
    
    try {
      return await this.executeOWASPCategoryTest(testId, target, category, testOptions);
    } catch (error) {
      this.logger.error(`OWASP category test failed: ${category}`, error, { testId });
      throw error;
    }
  }
  
  /**
   * Cancel an active OWASP test
   */
  public async cancelTest(testId: string): Promise<boolean> {
    const testTask = this.activeTestTasks.get(testId);
    if (!testTask) {
      this.logger.warn(`Attempted to cancel non-existent test: ${testId}`);
      return false;
    }
    
    this.logger.info(`Cancelling OWASP test: ${testId}`);
    
    try {
      // Cancel all running component tests
      await Promise.all([
        this.injectionTester.cancelTest(testId),
        this.authFlawDetector.cancelTest(testId),
        this.dataExposureDetector.cancelTest(testId),
        this.xxeDetector.cancelTest(testId),
        this.accessControlTester.cancelTest(testId),
        this.misconfigurationDetector.cancelTest(testId),
        this.xssDetector.cancelTest(testId),
        this.deserializationDetector.cancelTest(testId),
        this.vulnerableComponentsDetector.cancelTest(testId),
        this.loggingMonitoringTester.cancelTest(testId)
      ]);
      
      testTask.status = 'cancelled';
      testTask.endTime = new Date();
      
      this.activeTestTasks.delete(testId);
      this.testHistory.push(testTask);
      
      this.emit('testCancelled', testTask);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to cancel OWASP test: ${testId}`, error);
      return false;
    }
  }
  
  /**
   * Get test history
   */
  public getTestHistory(limit: number = 20): OWASPTestResult[] {
    return this.testHistory.slice(-limit);
  }
  
  /**
   * Get active tests
   */
  public getActiveTests(): OWASPTestResult[] {
    return Array.from(this.activeTestTasks.values());
  }
  
  /**
   * Get OWASP Top 10 coverage report
   */
  public getOWASPCoverageReport(): any {
    const coverageReport = {
      totalCategories: OWASPTop10Tester.OWASP_TOP_10_CATEGORIES.length,
      testedCategories: 0,
      categoryBreakdown: new Map(),
      overallCoverage: 0,
      vulnerabilityDistribution: new Map()
    };
    
    // Analyze test history for coverage
    this.testHistory.forEach(test => {
      test.categoryResults.forEach((result, category) => {
        if (!coverageReport.categoryBreakdown.has(category)) {
          coverageReport.categoryBreakdown.set(category, {
            testCount: 0,
            vulnerabilityCount: 0,
            lastTested: null
          });
        }
        
        const categoryData = coverageReport.categoryBreakdown.get(category);
        categoryData.testCount++;
        categoryData.vulnerabilityCount += result.vulnerabilities.length;
        categoryData.lastTested = test.endTime;
        
        // Track vulnerability distribution
        result.vulnerabilities.forEach((vuln: Vulnerability) => {
          const severity = vuln.severity;
          if (!coverageReport.vulnerabilityDistribution.has(severity)) {
            coverageReport.vulnerabilityDistribution.set(severity, 0);
          }
          coverageReport.vulnerabilityDistribution.set(
            severity,
            coverageReport.vulnerabilityDistribution.get(severity) + 1
          );
        });
      });
    });
    
    coverageReport.testedCategories = coverageReport.categoryBreakdown.size;
    coverageReport.overallCoverage = (coverageReport.testedCategories / coverageReport.totalCategories) * 100;
    
    return coverageReport;
  }
  
  /**
   * Shutdown the OWASP Top 10 Tester
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down OWASP Top 10 Tester...');
    
    try {
      // Cancel all active tests
      const activeTests = Array.from(this.activeTestTasks.keys());
      await Promise.all(activeTests.map(testId => this.cancelTest(testId)));
      
      // Shutdown all components
      await Promise.all([
        this.injectionTester.shutdown(),
        this.authFlawDetector.shutdown(),
        this.dataExposureDetector.shutdown(),
        this.xxeDetector.shutdown(),
        this.accessControlTester.shutdown(),
        this.misconfigurationDetector.shutdown(),
        this.xssDetector.shutdown(),
        this.deserializationDetector.shutdown(),
        this.vulnerableComponentsDetector.shutdown(),
        this.loggingMonitoringTester.shutdown()
      ]);
      
      this.isInitialized = false;
      this.logger.info('OWASP Top 10 Tester shutdown completed');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Error during OWASP Top 10 Tester shutdown', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private validateInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('OWASP Top 10 Tester not initialized. Call initialize() first.');
    }
  }
  
  private async executeOWASPCategoryTest(
    testId: string,
    target: string,
    category: string,
    options: OWASPTestOptions
  ): Promise<any> {
    this.logger.info(`Executing OWASP category test: ${category}`, { testId });
    
    switch (category) {
      case 'A01:2021-Broken Access Control':
        return await this.accessControlTester.testAccessControl(target, options);
        
      case 'A02:2021-Cryptographic Failures':
        return await this.dataExposureDetector.testCryptographicFailures(target, options);
        
      case 'A03:2021-Injection':
        return await this.injectionTester.testInjectionVulnerabilities(target, options);
        
      case 'A04:2021-Insecure Design':
        return await this.misconfigurationDetector.testInsecureDesign(target, options);
        
      case 'A05:2021-Security Misconfiguration':
        return await this.misconfigurationDetector.testSecurityMisconfiguration(target, options);
        
      case 'A06:2021-Vulnerable and Outdated Components':
        return await this.vulnerableComponentsDetector.testVulnerableComponents(target, options);
        
      case 'A07:2021-Identification and Authentication Failures':
        return await this.authFlawDetector.testAuthenticationFailures(target, options);
        
      case 'A08:2021-Software and Data Integrity Failures':
        return await this.deserializationDetector.testIntegrityFailures(target, options);
        
      case 'A09:2021-Security Logging and Monitoring Failures':
        return await this.loggingMonitoringTester.testLoggingMonitoring(target, options);
        
      case 'A10:2021-Server-Side Request Forgery (SSRF)':
        return await this.injectionTester.testSSRFVulnerabilities(target, options);
        
      default:
        throw new Error(`Unknown OWASP category: ${category}`);
    }
  }
  
  private calculateCoveragePercentage(testResult: OWASPTestResult): number {
    const totalCategories = OWASPTop10Tester.OWASP_TOP_10_CATEGORIES.length;
    const testedCategories = testResult.categoryResults.size;
    
    return (testedCategories / totalCategories) * 100;
  }
  
  private async calculateFalsePositiveRate(vulnerabilities: Vulnerability[]): Promise<number> {
    if (vulnerabilities.length === 0) return 0;
    
    let estimatedFalsePositives = 0;
    
    vulnerabilities.forEach(vuln => {
      // Different OWASP categories have different false positive rates
      switch (vuln.category) {
        case 'injection':
          estimatedFalsePositives += 0.08; // 8% false positive rate
          break;
        case 'broken-authentication':
          estimatedFalsePositives += 0.12; // 12% false positive rate
          break;
        case 'sensitive-data-exposure':
          estimatedFalsePositives += 0.15; // 15% false positive rate
          break;
        case 'security-misconfiguration':
          estimatedFalsePositives += 0.20; // 20% false positive rate
          break;
        default:
          estimatedFalsePositives += 0.18; // 18% default false positive rate
      }
    });
    
    return (estimatedFalsePositives / vulnerabilities.length) * 100;
  }
  
  private deduplicateAndSortVulnerabilities(vulnerabilities: Vulnerability[]): Vulnerability[] {
    // Remove duplicates based on type, target, and context
    const uniqueVulns = vulnerabilities.filter((vuln, index, arr) => {
      return arr.findIndex(v => 
        v.type === vuln.type && 
        v.url === vuln.url && 
        v.parameter === vuln.parameter
      ) === index;
    });
    
    // Sort by severity and OWASP category priority
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4
    };
    
    const owaspPriority: Record<string, number> = {
      'broken-access-control': 1,
      'cryptographic-failures': 2,
      'injection': 3,
      'insecure-design': 4,
      'security-misconfiguration': 5,
      'vulnerable-components': 6,
      'authentication-failures': 7,
      'integrity-failures': 8,
      'logging-monitoring-failures': 9,
      'ssrf': 10
    };
    
    return uniqueVulns.sort((a, b) => {
      // Primary sort by severity
      const severityA = severityOrder[a.severity.toLowerCase()] ?? 5;
      const severityB = severityOrder[b.severity.toLowerCase()] ?? 5;
      
      if (severityA !== severityB) {
        return severityA - severityB;
      }
      
      // Secondary sort by OWASP priority
      const priorityA = owaspPriority[a.category.toLowerCase()] ?? 11;
      const priorityB = owaspPriority[b.category.toLowerCase()] ?? 11;
      
      return priorityA - priorityB;
    });
  }
}