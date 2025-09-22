/**
 * @fileoverview Core Application Security Testing Framework
 * @description Main orchestrator for SAST, DAST, IAST, and OWASP Top 10 security testing
 * @version 1.0.0
 * @author ByteBot Security Team
 */

import { EventEmitter } from 'events';
import { SASTScanner } from '../sast/SASTScanner';
import { DASTScanner } from '../dast/DASTScanner';
import { IASTScanner } from '../iast/IASTScanner';
import { OWASPTop10Tester } from '../owasp/OWASPTop10Tester';
import { SecurityTestConfig } from '../config/SecurityTestConfig';
import { SecurityLogger } from '../utils/SecurityLogger';
import { SecurityMetrics } from '../utils/SecurityMetrics';
import { SecurityUtils } from '../utils/SecurityUtils';
import {
  SecurityTestResult,
  SecurityTestOptions,
  SecurityTestStatus,
  VulnerabilitySeverity,
  SecurityTestType
} from '../types/SecurityTypes';

/**
 * Main Application Security Testing Framework
 * Orchestrates all security testing components (SAST, DAST, IAST, OWASP Top 10)
 */
export class ApplicationSecurityTester extends EventEmitter {
  private static readonly DEFAULT_TIMEOUT = 300000; // 5 minutes
  private static readonly MAX_CONCURRENT_TESTS = 10;
  
  private sastScanner: SASTScanner;
  private dastScanner: DASTScanner;
  private iastScanner: IASTScanner;
  private owaspTester: OWASPTop10Tester;
  private config: SecurityTestConfig;
  private logger: SecurityLogger;
  private metrics: SecurityMetrics;
  private utils: SecurityUtils;
  
  private isInitialized: boolean = false;
  private activeTasks: Map<string, SecurityTestResult> = new Map();
  private testHistory: SecurityTestResult[] = [];
  
  constructor(config?: SecurityTestConfig) {
    super();
    this.config = config || new SecurityTestConfig();
    this.logger = new SecurityLogger('ApplicationSecurityTester');
    this.metrics = new SecurityMetrics();
    this.utils = new SecurityUtils();
    
    // Initialize security testing components
    this.sastScanner = new SASTScanner(this.config.sast);
    this.dastScanner = new DASTScanner(this.config.dast);
    this.iastScanner = new IASTScanner(this.config.iast);
    this.owaspTester = new OWASPTop10Tester(this.config.owasp);
    
    this.setupEventHandlers();
  }
  
  /**
   * Initialize the Application Security Testing Framework
   */
  public async initialize(config?: SecurityTestConfig): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Initializing Application Security Testing Framework...');
    
    try {
      if (config) {
        this.config = config;
      }
      
      // Initialize all security testing components
      await Promise.all([
        this.sastScanner.initialize(this.config.sast),
        this.dastScanner.initialize(this.config.dast),
        this.iastScanner.initialize(this.config.iast),
        this.owaspTester.initialize(this.config.owasp)
      ]);
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      this.logger.info(`Application Security Testing Framework initialized in ${initTime}ms`);
      this.metrics.recordInitializationTime(initTime);
      
      this.emit('initialized', { timestamp: new Date(), duration: initTime });
      
    } catch (error) {
      this.logger.error('Failed to initialize Application Security Testing Framework', error);
      this.emit('initializationError', error);
      throw error;
    }
  }
  
  /**
   * Run SAST (Static Application Security Testing) scan
   */
  public async runSASTScan(
    codebasePath: string,
    options: SecurityTestOptions = {}
  ): Promise<SecurityTestResult> {
    const taskId = this.utils.generateTaskId('SAST');
    this.logger.info(`Starting SAST scan for: ${codebasePath}`, { taskId });
    
    const testResult: SecurityTestResult = {
      id: taskId,
      type: SecurityTestType.SAST,
      target: codebasePath,
      status: SecurityTestStatus.RUNNING,
      startTime: new Date(),
      options,
      vulnerabilities: [],
      metrics: {
        scanDuration: 0,
        filesScanned: 0,
        linesAnalyzed: 0,
        rulesExecuted: 0
      }
    };
    
    this.activeTasks.set(taskId, testResult);
    this.emit('testStarted', testResult);
    
    try {
      this.validateInitialization();
      this.validateSASTTarget(codebasePath);
      
      const scanResult = await this.sastScanner.scanCodebase(codebasePath, options);
      
      testResult.status = SecurityTestStatus.COMPLETED;
      testResult.endTime = new Date();
      testResult.vulnerabilities = scanResult.vulnerabilities;
      testResult.metrics = scanResult.metrics;
      testResult.summary = this.generateTestSummary(scanResult.vulnerabilities);
      
      this.logger.info(`SAST scan completed: ${testResult.vulnerabilities.length} vulnerabilities found`, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testCompleted', testResult);
      return testResult;
      
    } catch (error) {
      testResult.status = SecurityTestStatus.FAILED;
      testResult.endTime = new Date();
      testResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`SAST scan failed for: ${codebasePath}`, error, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testFailed', testResult);
      throw error;
    }
  }
  
  /**
   * Run DAST (Dynamic Application Security Testing) scan
   */
  public async runDASTScan(
    targetUrl: string,
    options: SecurityTestOptions = {}
  ): Promise<SecurityTestResult> {
    const taskId = this.utils.generateTaskId('DAST');
    this.logger.info(`Starting DAST scan for: ${targetUrl}`, { taskId });
    
    const testResult: SecurityTestResult = {
      id: taskId,
      type: SecurityTestType.DAST,
      target: targetUrl,
      status: SecurityTestStatus.RUNNING,
      startTime: new Date(),
      options,
      vulnerabilities: [],
      metrics: {
        scanDuration: 0,
        requestsSent: 0,
        responsesCaptured: 0,
        endpointsTested: 0
      }
    };
    
    this.activeTasks.set(taskId, testResult);
    this.emit('testStarted', testResult);
    
    try {
      this.validateInitialization();
      this.validateDASTTarget(targetUrl);
      
      const scanResult = await this.dastScanner.scanApplication(targetUrl, options);
      
      testResult.status = SecurityTestStatus.COMPLETED;
      testResult.endTime = new Date();
      testResult.vulnerabilities = scanResult.vulnerabilities;
      testResult.metrics = scanResult.metrics;
      testResult.summary = this.generateTestSummary(scanResult.vulnerabilities);
      
      this.logger.info(`DAST scan completed: ${testResult.vulnerabilities.length} vulnerabilities found`, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testCompleted', testResult);
      return testResult;
      
    } catch (error) {
      testResult.status = SecurityTestStatus.FAILED;
      testResult.endTime = new Date();
      testResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`DAST scan failed for: ${targetUrl}`, error, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testFailed', testResult);
      throw error;
    }
  }
  
  /**
   * Run IAST (Interactive Application Security Testing) scan
   */
  public async runIASTScan(
    applicationEndpoint: string,
    options: SecurityTestOptions = {}
  ): Promise<SecurityTestResult> {
    const taskId = this.utils.generateTaskId('IAST');
    this.logger.info(`Starting IAST scan for: ${applicationEndpoint}`, { taskId });
    
    const testResult: SecurityTestResult = {
      id: taskId,
      type: SecurityTestType.IAST,
      target: applicationEndpoint,
      status: SecurityTestStatus.RUNNING,
      startTime: new Date(),
      options,
      vulnerabilities: [],
      metrics: {
        scanDuration: 0,
        interactionsMonitored: 0,
        dataFlowsAnalyzed: 0,
        runtimeEventsCapture: 0
      }
    };
    
    this.activeTasks.set(taskId, testResult);
    this.emit('testStarted', testResult);
    
    try {
      this.validateInitialization();
      this.validateIASTTarget(applicationEndpoint);
      
      const scanResult = await this.iastScanner.scanRuntime(applicationEndpoint, options);
      
      testResult.status = SecurityTestStatus.COMPLETED;
      testResult.endTime = new Date();
      testResult.vulnerabilities = scanResult.vulnerabilities;
      testResult.metrics = scanResult.metrics;
      testResult.summary = this.generateTestSummary(scanResult.vulnerabilities);
      
      this.logger.info(`IAST scan completed: ${testResult.vulnerabilities.length} vulnerabilities found`, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testCompleted', testResult);
      return testResult;
      
    } catch (error) {
      testResult.status = SecurityTestStatus.FAILED;
      testResult.endTime = new Date();
      testResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`IAST scan failed for: ${applicationEndpoint}`, error, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testFailed', testResult);
      throw error;
    }
  }
  
  /**
   * Run OWASP Top 10 security testing
   */
  public async runOWASPTop10Test(
    target: string,
    options: SecurityTestOptions = {}
  ): Promise<SecurityTestResult> {
    const taskId = this.utils.generateTaskId('OWASP');
    this.logger.info(`Starting OWASP Top 10 test for: ${target}`, { taskId });
    
    const testResult: SecurityTestResult = {
      id: taskId,
      type: SecurityTestType.OWASP_TOP10,
      target,
      status: SecurityTestStatus.RUNNING,
      startTime: new Date(),
      options,
      vulnerabilities: [],
      metrics: {
        scanDuration: 0,
        testsExecuted: 0,
        categoriesTestsed: 0,
        vulnerabilitiesDetected: 0
      }
    };
    
    this.activeTasks.set(taskId, testResult);
    this.emit('testStarted', testResult);
    
    try {
      this.validateInitialization();
      this.validateOWASPTarget(target);
      
      const testResults = await this.owaspTester.runComprehensiveTest(target, options);
      
      testResult.status = SecurityTestStatus.COMPLETED;
      testResult.endTime = new Date();
      testResult.vulnerabilities = testResults.vulnerabilities;
      testResult.metrics = testResults.metrics;
      testResult.summary = this.generateTestSummary(testResults.vulnerabilities);
      
      this.logger.info(`OWASP Top 10 test completed: ${testResult.vulnerabilities.length} vulnerabilities found`, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testCompleted', testResult);
      return testResult;
      
    } catch (error) {
      testResult.status = SecurityTestStatus.FAILED;
      testResult.endTime = new Date();
      testResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`OWASP Top 10 test failed for: ${target}`, error, { taskId });
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testFailed', testResult);
      throw error;
    }
  }
  
  /**
   * Get current security metrics
   */
  public getSecurityMetrics(): any {
    return {
      activeTasks: this.activeTasks.size,
      totalTestsRun: this.testHistory.length,
      testHistory: this.testHistory.slice(-10), // Last 10 tests
      vulnerabilityStats: this.getVulnerabilityStats(),
      performanceMetrics: this.metrics.getPerformanceMetrics(),
      systemHealth: this.getSystemHealth()
    };
  }
  
  /**
   * Get active security tests
   */
  public getActiveTasks(): SecurityTestResult[] {
    return Array.from(this.activeTasks.values());
  }
  
  /**
   * Get test history
   */
  public getTestHistory(limit: number = 50): SecurityTestResult[] {
    return this.testHistory.slice(-limit);
  }
  
  /**
   * Cancel a running security test
   */
  public async cancelTest(taskId: string): Promise<boolean> {
    const testResult = this.activeTasks.get(taskId);
    if (!testResult) {
      this.logger.warn(`Attempted to cancel non-existent task: ${taskId}`);
      return false;
    }
    
    this.logger.info(`Cancelling security test: ${taskId}`);
    
    try {
      // Cancel the appropriate scanner based on test type
      switch (testResult.type) {
        case SecurityTestType.SAST:
          await this.sastScanner.cancelScan(taskId);
          break;
        case SecurityTestType.DAST:
          await this.dastScanner.cancelScan(taskId);
          break;
        case SecurityTestType.IAST:
          await this.iastScanner.cancelScan(taskId);
          break;
        case SecurityTestType.OWASP_TOP10:
          await this.owaspTester.cancelTest(taskId);
          break;
      }
      
      testResult.status = SecurityTestStatus.CANCELLED;
      testResult.endTime = new Date();
      
      this.activeTasks.delete(taskId);
      this.testHistory.push(testResult);
      
      this.emit('testCancelled', testResult);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to cancel test: ${taskId}`, error);
      return false;
    }
  }
  
  /**
   * Shutdown the security testing framework
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Application Security Testing Framework...');
    
    try {
      // Cancel all active tasks
      const activeTasks = Array.from(this.activeTasks.keys());
      await Promise.all(activeTasks.map(taskId => this.cancelTest(taskId)));
      
      // Shutdown all components
      await Promise.all([
        this.sastScanner.shutdown(),
        this.dastScanner.shutdown(),
        this.iastScanner.shutdown(),
        this.owaspTester.shutdown()
      ]);
      
      this.isInitialized = false;
      this.logger.info('Application Security Testing Framework shutdown completed');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private setupEventHandlers(): void {
    // Set up event handlers for all security testing components
    this.sastScanner.on('progress', (data) => this.emit('sastProgress', data));
    this.dastScanner.on('progress', (data) => this.emit('dastProgress', data));
    this.iastScanner.on('progress', (data) => this.emit('iastProgress', data));
    this.owaspTester.on('progress', (data) => this.emit('owaspProgress', data));
  }
  
  private validateInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('Application Security Testing Framework not initialized. Call initialize() first.');
    }
  }
  
  private validateSASTTarget(codebasePath: string): void {
    if (!codebasePath || typeof codebasePath !== 'string') {
      throw new Error('Invalid SAST target: codebasePath must be a non-empty string');
    }
  }
  
  private validateDASTTarget(targetUrl: string): void {
    if (!targetUrl || typeof targetUrl !== 'string') {
      throw new Error('Invalid DAST target: targetUrl must be a non-empty string');
    }
    
    try {
      new URL(targetUrl);
    } catch {
      throw new Error('Invalid DAST target: targetUrl must be a valid URL');
    }
  }
  
  private validateIASTTarget(applicationEndpoint: string): void {
    if (!applicationEndpoint || typeof applicationEndpoint !== 'string') {
      throw new Error('Invalid IAST target: applicationEndpoint must be a non-empty string');
    }
  }
  
  private validateOWASPTarget(target: string): void {
    if (!target || typeof target !== 'string') {
      throw new Error('Invalid OWASP target: target must be a non-empty string');
    }
  }
  
  private generateTestSummary(vulnerabilities: any[]): any {
    const severityCount = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    vulnerabilities.forEach(vuln => {
      const severity = vuln.severity?.toLowerCase() || 'info';
      if (severity in severityCount) {
        severityCount[severity as keyof typeof severityCount]++;
      }
    });
    
    return {
      totalVulnerabilities: vulnerabilities.length,
      severityBreakdown: severityCount,
      riskScore: this.calculateRiskScore(severityCount),
      recommendedActions: this.generateRecommendations(severityCount)
    };
  }
  
  private calculateRiskScore(severityCount: any): number {
    const weights = { critical: 10, high: 7, medium: 4, low: 2, info: 1 };
    let totalScore = 0;
    
    Object.entries(severityCount).forEach(([severity, count]) => {
      const weight = weights[severity as keyof typeof weights] || 1;
      totalScore += (count as number) * weight;
    });
    
    return Math.min(100, totalScore);
  }
  
  private generateRecommendations(severityCount: any): string[] {
    const recommendations: string[] = [];
    
    if (severityCount.critical > 0) {
      recommendations.push('URGENT: Address critical vulnerabilities immediately');
    }
    if (severityCount.high > 0) {
      recommendations.push('HIGH PRIORITY: Fix high severity vulnerabilities within 24 hours');
    }
    if (severityCount.medium > 0) {
      recommendations.push('Schedule medium severity vulnerability fixes within 1 week');
    }
    if (severityCount.low > 0) {
      recommendations.push('Plan low severity vulnerability fixes in next sprint');
    }
    
    return recommendations;
  }
  
  private getVulnerabilityStats(): any {
    const allVulnerabilities = this.testHistory.flatMap(test => test.vulnerabilities || []);
    const severityCount = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    
    allVulnerabilities.forEach(vuln => {
      const severity = vuln.severity?.toLowerCase() || 'info';
      if (severity in severityCount) {
        severityCount[severity as keyof typeof severityCount]++;
      }
    });
    
    return {
      totalVulnerabilities: allVulnerabilities.length,
      severityDistribution: severityCount,
      averageRiskScore: this.calculateRiskScore(severityCount)
    };
  }
  
  private getSystemHealth(): any {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      activeConnections: this.activeTasks.size,
      isHealthy: this.activeTasks.size < ApplicationSecurityTester.MAX_CONCURRENT_TESTS
    };
  }
}