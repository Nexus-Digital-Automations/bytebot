/**
 * @fileoverview Comprehensive Application Security Testing Framework
 * @description Main entry point for SAST, DAST, IAST, and OWASP Top 10 security testing
 * @version 1.0.0
 * @author ByteBot Security Team
 */

// Core Security Testing Framework
export { ApplicationSecurityTester } from './core/ApplicationSecurityTester';
export { SecurityTestRunner } from './core/SecurityTestRunner';
export { SecurityTestOrchestrator } from './core/SecurityTestOrchestrator';
export { SecurityReportGenerator } from './core/SecurityReportGenerator';

// SAST (Static Application Security Testing)
export { SASTScanner } from './sast/SASTScanner';
export { StaticCodeAnalyzer } from './sast/StaticCodeAnalyzer';
export { VulnerabilityPatternDetector } from './sast/VulnerabilityPatternDetector';
export { CodeQualityAnalyzer } from './sast/CodeQualityAnalyzer';
export { DependencyScanner } from './sast/DependencyScanner';
export { SecurityCodeReviewAutomator } from './sast/SecurityCodeReviewAutomator';

// DAST (Dynamic Application Security Testing)
export { DASTScanner } from './dast/DASTScanner';
export { WebApplicationTester } from './dast/WebApplicationTester';
export { APISecurityTester } from './dast/APISecurityTester';
export { BusinessLogicTester } from './dast/BusinessLogicTester';
export { AuthenticationTester } from './dast/AuthenticationTester';
export { SessionManagementTester } from './dast/SessionManagementTester';

// IAST (Interactive Application Security Testing)
export { IASTScanner } from './iast/IASTScanner';
export { RuntimeVulnerabilityDetector } from './iast/RuntimeVulnerabilityDetector';
export { RealTimeSecurityMonitor } from './iast/RealTimeSecurityMonitor';
export { SecurityFeedbackLoop } from './iast/SecurityFeedbackLoop';
export { ContinuousSecurityValidator } from './iast/ContinuousSecurityValidator';

// OWASP Top 10 Security Testing
export { OWASPTop10Tester } from './owasp/OWASPTop10Tester';
export { InjectionTester } from './owasp/InjectionTester';
export { AuthenticationFlawDetector } from './owasp/AuthenticationFlawDetector';
export { SensitiveDataExposureDetector } from './owasp/SensitiveDataExposureDetector';
export { XXEDetector } from './owasp/XXEDetector';
export { AccessControlTester } from './owasp/AccessControlTester';
export { SecurityMisconfigurationDetector } from './owasp/SecurityMisconfigurationDetector';
export { XSSDetector } from './owasp/XSSDetector';
export { InsecureDeserializationDetector } from './owasp/InsecureDeserializationDetector';
export { VulnerableComponentsDetector } from './owasp/VulnerableComponentsDetector';
export { LoggingMonitoringTester } from './owasp/LoggingMonitoringTester';

// Utilities and Configuration
export { SecurityTestConfig } from './config/SecurityTestConfig';
export { SecurityLogger } from './utils/SecurityLogger';
export { SecurityMetrics } from './utils/SecurityMetrics';
export { SecurityUtils } from './utils/SecurityUtils';
export { SecurityReporter } from './reports/SecurityReporter';
export { SecurityDashboard } from './reports/SecurityDashboard';
export { CIIntegration } from './ci/CIIntegration';

// Types and Interfaces
export * from './types/SecurityTypes';
export * from './types/VulnerabilityTypes';
export * from './types/ReportTypes';
export * from './types/ConfigTypes';

// Constants and Enums
export * from './constants/SecurityConstants';
export * from './constants/VulnerabilityConstants';
export * from './constants/OWASPConstants';

/**
 * Default export - Main Application Security Testing Framework
 */
export default class ByteBotApplicationSecurityTesting {
  private static instance: ByteBotApplicationSecurityTesting;
  private securityTester: ApplicationSecurityTester;
  private testRunner: SecurityTestRunner;
  private orchestrator: SecurityTestOrchestrator;
  private reportGenerator: SecurityReportGenerator;

  private constructor() {
    this.securityTester = new ApplicationSecurityTester();
    this.testRunner = new SecurityTestRunner();
    this.orchestrator = new SecurityTestOrchestrator();
    this.reportGenerator = new SecurityReportGenerator();
  }

  /**
   * Get singleton instance of the security testing framework
   */
  public static getInstance(): ByteBotApplicationSecurityTesting {
    if (!ByteBotApplicationSecurityTesting.instance) {
      ByteBotApplicationSecurityTesting.instance = new ByteBotApplicationSecurityTesting();
    }
    return ByteBotApplicationSecurityTesting.instance;
  }

  /**
   * Initialize the security testing framework
   */
  public async initialize(config?: SecurityTestConfig): Promise<void> {
    await this.securityTester.initialize(config);
    await this.testRunner.initialize(config);
    await this.orchestrator.initialize(config);
    await this.reportGenerator.initialize(config);
  }

  /**
   * Run comprehensive security testing
   */
  public async runComprehensiveSecurityTest(target: string, options?: any): Promise<any> {
    return await this.orchestrator.runComprehensiveTest(target, options);
  }

  /**
   * Run SAST scanning
   */
  public async runSASTScan(codebasePath: string, options?: any): Promise<any> {
    return await this.securityTester.runSASTScan(codebasePath, options);
  }

  /**
   * Run DAST scanning
   */
  public async runDASTScan(targetUrl: string, options?: any): Promise<any> {
    return await this.securityTester.runDASTScan(targetUrl, options);
  }

  /**
   * Run IAST scanning
   */
  public async runIASTScan(applicationEndpoint: string, options?: any): Promise<any> {
    return await this.securityTester.runIASTScan(applicationEndpoint, options);
  }

  /**
   * Run OWASP Top 10 testing
   */
  public async runOWASPTop10Test(target: string, options?: any): Promise<any> {
    return await this.securityTester.runOWASPTop10Test(target, options);
  }

  /**
   * Generate comprehensive security report
   */
  public async generateSecurityReport(testResults: any[], format?: string): Promise<any> {
    return await this.reportGenerator.generateComprehensiveReport(testResults, format);
  }

  /**
   * Get real-time security metrics
   */
  public getSecurityMetrics(): any {
    return this.securityTester.getSecurityMetrics();
  }

  /**
   * Cleanup and shutdown the framework
   */
  public async shutdown(): Promise<void> {
    await this.securityTester.shutdown();
    await this.testRunner.shutdown();
    await this.orchestrator.shutdown();
    await this.reportGenerator.shutdown();
  }
}