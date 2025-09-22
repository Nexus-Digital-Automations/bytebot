/**
 * @fileoverview DAST (Dynamic Application Security Testing) Scanner
 * @description Comprehensive dynamic security testing for running applications
 * @version 1.0.0
 * @author ByteBot Security Team
 */

import { EventEmitter } from 'events';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as puppeteer from 'puppeteer';
import { WebApplicationTester } from './WebApplicationTester';
import { APISecurityTester } from './APISecurityTester';
import { BusinessLogicTester } from './BusinessLogicTester';
import { AuthenticationTester } from './AuthenticationTester';
import { SessionManagementTester } from './SessionManagementTester';
import { SecurityLogger } from '../utils/SecurityLogger';
import { SecurityUtils } from '../utils/SecurityUtils';
import {
  DASTScanResult,
  DASTScanOptions,
  Vulnerability,
  VulnerabilitySeverity,
  VulnerabilityCategory,
  DASTMetrics,
  HTTPSecurityTest,
  WebSecurityTest
} from '../types/SecurityTypes';

/**
 * DAST Scanner - Dynamic Application Security Testing
 * Performs comprehensive security testing on running applications
 */
export class DASTScanner extends EventEmitter {
  private static readonly DEFAULT_SCAN_OPTIONS: DASTScanOptions = {
    timeout: 600000, // 10 minutes
    maxDepth: 5,
    maxRequests: 1000,
    followRedirects: true,
    testAuthentication: true,
    testBusinessLogic: true,
    testAPIs: true,
    userAgent: 'ByteBot-DAST-Scanner/1.0',
    concurrent: 5,
    delay: 100, // ms between requests
    scope: ['same-origin'],
    excludeExtensions: ['.jpg', '.png', '.gif', '.css', '.js', '.ico'],
    includePaths: [],
    excludePaths: ['/admin', '/private'],
    customHeaders: {},
    authentication: null
  };
  
  private webAppTester: WebApplicationTester;
  private apiTester: APISecurityTester;
  private businessLogicTester: BusinessLogicTester;
  private authTester: AuthenticationTester;
  private sessionTester: SessionManagementTester;
  private logger: SecurityLogger;
  private utils: SecurityUtils;
  private httpClient: AxiosInstance;
  private browser: puppeteer.Browser | null = null;
  
  private isInitialized: boolean = false;
  private activeScanTasks: Map<string, any> = new Map();
  private scanHistory: DASTScanResult[] = [];
  
  constructor(options?: Partial<DASTScanOptions>) {
    super();
    this.logger = new SecurityLogger('DASTScanner');
    this.utils = new SecurityUtils();
    
    // Initialize HTTP client
    this.httpClient = axios.create({
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: () => true // Accept all status codes
    });
    
    // Initialize DAST components
    this.webAppTester = new WebApplicationTester();
    this.apiTester = new APISecurityTester();
    this.businessLogicTester = new BusinessLogicTester();
    this.authTester = new AuthenticationTester();
    this.sessionTester = new SessionManagementTester();
  }
  
  /**
   * Initialize the DAST Scanner
   */
  public async initialize(options?: Partial<DASTScanOptions>): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Initializing DAST Scanner...');
    
    try {
      // Launch browser for web application testing
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });
      
      // Initialize all DAST components
      await Promise.all([
        this.webAppTester.initialize(this.browser),
        this.apiTester.initialize(this.httpClient),
        this.businessLogicTester.initialize(this.httpClient),
        this.authTester.initialize(this.httpClient, this.browser),
        this.sessionTester.initialize(this.httpClient, this.browser)
      ]);
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      this.logger.info(`DAST Scanner initialized in ${initTime}ms`);
      this.emit('initialized', { timestamp: new Date(), duration: initTime });
      
    } catch (error) {
      this.logger.error('Failed to initialize DAST Scanner', error);
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.emit('initializationError', error);
      throw error;
    }
  }
  
  /**
   * Scan application for security vulnerabilities
   */
  public async scanApplication(
    targetUrl: string,
    options: Partial<DASTScanOptions> = {}
  ): Promise<DASTScanResult> {
    const scanOptions = { ...DASTScanner.DEFAULT_SCAN_OPTIONS, ...options };
    const scanId = this.utils.generateTaskId('DAST_SCAN');
    
    this.logger.info(`Starting DAST scan of application: ${targetUrl}`, { scanId });
    
    const scanResult: DASTScanResult = {
      id: scanId,
      targetUrl,
      startTime: new Date(),
      status: 'running',
      options: scanOptions,
      vulnerabilities: [],
      httpTests: [],
      webTests: [],
      metrics: {
        scanDuration: 0,
        requestsSent: 0,
        responsesCaptured: 0,
        endpointsTested: 0,
        vulnerabilitiesFound: 0,
        coveragePercentage: 0,
        averageResponseTime: 0
      }
    };
    
    this.activeScanTasks.set(scanId, scanResult);
    this.emit('scanStarted', scanResult);
    
    try {
      this.validateInitialization();
      await this.validateTargetUrl(targetUrl);
      
      const scanStartTime = Date.now();
      
      // Phase 1: Application discovery and reconnaissance
      this.logger.info('Phase 1: Discovering application structure...', { scanId });
      const discoveryResults = await this.performApplicationDiscovery(targetUrl, scanOptions);
      scanResult.metrics.endpointsTested = discoveryResults.endpoints.length;
      
      this.emit('scanProgress', {
        scanId,
        phase: 'discovery',
        progress: 15,
        message: `Discovered ${discoveryResults.endpoints.length} endpoints`
      });
      
      // Phase 2: Web application security testing
      this.logger.info('Phase 2: Testing web application security...', { scanId });
      const webTestResults = await this.performWebApplicationTesting(targetUrl, discoveryResults, scanOptions);
      scanResult.vulnerabilities.push(...webTestResults.vulnerabilities);
      scanResult.webTests.push(...webTestResults.tests);
      scanResult.metrics.requestsSent += webTestResults.requestsSent;
      
      this.emit('scanProgress', {
        scanId,
        phase: 'web-testing',
        progress: 35,
        message: `Completed web application testing, found ${webTestResults.vulnerabilities.length} vulnerabilities`
      });
      
      // Phase 3: API security testing
      if (scanOptions.testAPIs && discoveryResults.apiEndpoints.length > 0) {
        this.logger.info('Phase 3: Testing API security...', { scanId });
        const apiTestResults = await this.performAPISecurityTesting(discoveryResults.apiEndpoints, scanOptions);
        scanResult.vulnerabilities.push(...apiTestResults.vulnerabilities);
        scanResult.httpTests.push(...apiTestResults.tests);
        scanResult.metrics.requestsSent += apiTestResults.requestsSent;
        
        this.emit('scanProgress', {
          scanId,
          phase: 'api-testing',
          progress: 55,
          message: `Completed API security testing, found ${apiTestResults.vulnerabilities.length} vulnerabilities`
        });
      }
      
      // Phase 4: Authentication and session management testing
      if (scanOptions.testAuthentication) {
        this.logger.info('Phase 4: Testing authentication and session management...', { scanId });
        const authTestResults = await this.performAuthenticationTesting(targetUrl, discoveryResults, scanOptions);
        scanResult.vulnerabilities.push(...authTestResults.vulnerabilities);
        scanResult.httpTests.push(...authTestResults.tests);
        scanResult.metrics.requestsSent += authTestResults.requestsSent;
        
        this.emit('scanProgress', {
          scanId,
          phase: 'auth-testing',
          progress: 75,
          message: `Completed authentication testing, found ${authTestResults.vulnerabilities.length} vulnerabilities`
        });
      }
      
      // Phase 5: Business logic testing
      if (scanOptions.testBusinessLogic) {
        this.logger.info('Phase 5: Testing business logic security...', { scanId });
        const businessLogicResults = await this.performBusinessLogicTesting(targetUrl, discoveryResults, scanOptions);
        scanResult.vulnerabilities.push(...businessLogicResults.vulnerabilities);
        scanResult.httpTests.push(...businessLogicResults.tests);
        scanResult.metrics.requestsSent += businessLogicResults.requestsSent;
        
        this.emit('scanProgress', {
          scanId,
          phase: 'business-logic-testing',
          progress: 90,
          message: `Completed business logic testing, found ${businessLogicResults.vulnerabilities.length} vulnerabilities`
        });
      }
      
      // Phase 6: Comprehensive vulnerability analysis
      this.logger.info('Phase 6: Analyzing and categorizing vulnerabilities...', { scanId });
      scanResult.vulnerabilities = await this.analyzeVulnerabilities(scanResult.vulnerabilities);
      
      // Finalize scan results
      scanResult.status = 'completed';
      scanResult.endTime = new Date();
      scanResult.metrics.scanDuration = Date.now() - scanStartTime;
      scanResult.metrics.vulnerabilitiesFound = scanResult.vulnerabilities.length;
      scanResult.metrics.responsesCaptured = scanResult.metrics.requestsSent; // Simplified
      scanResult.metrics.coveragePercentage = this.calculateCoveragePercentage(discoveryResults, scanResult);
      scanResult.metrics.averageResponseTime = this.calculateAverageResponseTime(scanResult.httpTests);
      
      // Remove duplicates and sort by severity
      scanResult.vulnerabilities = this.deduplicateAndSortVulnerabilities(scanResult.vulnerabilities);
      
      this.logger.info(`DAST scan completed: ${scanResult.vulnerabilities.length} vulnerabilities found`, { scanId });
      
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanResult);
      
      this.emit('scanCompleted', scanResult);
      return scanResult;
      
    } catch (error) {
      scanResult.status = 'failed';
      scanResult.endTime = new Date();
      scanResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`DAST scan failed for: ${targetUrl}`, error, { scanId });
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanResult);
      
      this.emit('scanFailed', scanResult);
      throw error;
    }
  }
  
  /**
   * Cancel an active DAST scan
   */
  public async cancelScan(scanId: string): Promise<boolean> {
    const scanTask = this.activeScanTasks.get(scanId);
    if (!scanTask) {
      this.logger.warn(`Attempted to cancel non-existent scan: ${scanId}`);
      return false;
    }
    
    this.logger.info(`Cancelling DAST scan: ${scanId}`);
    
    try {
      // Cancel ongoing operations
      await Promise.all([
        this.webAppTester.cancelTest(scanId),
        this.apiTester.cancelTest(scanId),
        this.businessLogicTester.cancelTest(scanId),
        this.authTester.cancelTest(scanId),
        this.sessionTester.cancelTest(scanId)
      ]);
      
      scanTask.status = 'cancelled';
      scanTask.endTime = new Date();
      
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanTask);
      
      this.emit('scanCancelled', scanTask);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to cancel DAST scan: ${scanId}`, error);
      return false;
    }
  }
  
  /**
   * Get scan history
   */
  public getScanHistory(limit: number = 20): DASTScanResult[] {
    return this.scanHistory.slice(-limit);
  }
  
  /**
   * Get active scans
   */
  public getActiveScans(): DASTScanResult[] {
    return Array.from(this.activeScanTasks.values());
  }
  
  /**
   * Shutdown the DAST Scanner
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down DAST Scanner...');
    
    try {
      // Cancel all active scans
      const activeScans = Array.from(this.activeScanTasks.keys());
      await Promise.all(activeScans.map(scanId => this.cancelScan(scanId)));
      
      // Shutdown browser
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      // Shutdown all components
      await Promise.all([
        this.webAppTester.shutdown(),
        this.apiTester.shutdown(),
        this.businessLogicTester.shutdown(),
        this.authTester.shutdown(),
        this.sessionTester.shutdown()
      ]);
      
      this.isInitialized = false;
      this.logger.info('DAST Scanner shutdown completed');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Error during DAST Scanner shutdown', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private validateInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('DAST Scanner not initialized. Call initialize() first.');
    }
  }
  
  private async validateTargetUrl(targetUrl: string): Promise<void> {
    try {
      const url = new URL(targetUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Target URL must use HTTP or HTTPS protocol');
      }
      
      // Test connectivity
      const response = await this.httpClient.get(targetUrl, { timeout: 10000 });
      if (!response) {
        throw new Error('Target URL is not accessible');
      }
    } catch (error) {
      throw new Error(`Invalid or inaccessible target URL: ${targetUrl}`);
    }
  }
  
  private async performApplicationDiscovery(targetUrl: string, options: DASTScanOptions): Promise<any> {
    // Discover application structure, endpoints, forms, etc.
    const endpoints: string[] = [];
    const apiEndpoints: string[] = [];
    const forms: any[] = [];
    
    try {
      // Use browser to crawl the application
      if (this.browser) {
        const page = await this.browser.newPage();
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        
        // Extract links
        const links = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href);
        });
        
        endpoints.push(...links.filter(link => this.isInScope(link, targetUrl, options)));
        
        // Extract forms
        const formData = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('form')).map(form => ({
            action: form.action || window.location.href,
            method: form.method || 'GET',
            inputs: Array.from(form.querySelectorAll('input, select, textarea')).map(input => ({
              name: input.getAttribute('name'),
              type: input.getAttribute('type'),
              value: input.getAttribute('value')
            }))
          }));
        });
        
        forms.push(...formData);
        await page.close();
      }
      
      // Detect API endpoints
      const commonApiPaths = ['/api', '/rest', '/graphql', '/v1', '/v2'];
      for (const apiPath of commonApiPaths) {
        const apiUrl = new URL(apiPath, targetUrl).href;
        try {
          const response = await this.httpClient.get(apiUrl, { timeout: 5000 });
          if (response.status < 500) {
            apiEndpoints.push(apiUrl);
          }
        } catch {
          // Ignore errors for API discovery
        }
      }
      
    } catch (error) {
      this.logger.warn('Error during application discovery', error);
    }
    
    return {
      endpoints: [...new Set(endpoints)],
      apiEndpoints: [...new Set(apiEndpoints)],
      forms
    };
  }
  
  private async performWebApplicationTesting(targetUrl: string, discoveryResults: any, options: DASTScanOptions): Promise<any> {
    return await this.webAppTester.testWebApplication(targetUrl, discoveryResults, options);
  }
  
  private async performAPISecurityTesting(apiEndpoints: string[], options: DASTScanOptions): Promise<any> {
    return await this.apiTester.testAPIEndpoints(apiEndpoints, options);
  }
  
  private async performAuthenticationTesting(targetUrl: string, discoveryResults: any, options: DASTScanOptions): Promise<any> {
    const authResults = await this.authTester.testAuthentication(targetUrl, discoveryResults, options);
    const sessionResults = await this.sessionTester.testSessionManagement(targetUrl, discoveryResults, options);
    
    return {
      vulnerabilities: [...authResults.vulnerabilities, ...sessionResults.vulnerabilities],
      tests: [...authResults.tests, ...sessionResults.tests],
      requestsSent: authResults.requestsSent + sessionResults.requestsSent
    };
  }
  
  private async performBusinessLogicTesting(targetUrl: string, discoveryResults: any, options: DASTScanOptions): Promise<any> {
    return await this.businessLogicTester.testBusinessLogic(targetUrl, discoveryResults, options);
  }
  
  private async analyzeVulnerabilities(vulnerabilities: Vulnerability[]): Promise<Vulnerability[]> {
    // Enhance vulnerabilities with additional analysis
    return vulnerabilities.map(vuln => ({
      ...vuln,
      exploitability: this.calculateExploitability(vuln),
      businessImpact: this.assessBusinessImpact(vuln),
      remediation: this.generateRemediation(vuln)
    }));
  }
  
  private isInScope(url: string, baseUrl: string, options: DASTScanOptions): boolean {
    try {
      const targetDomain = new URL(baseUrl).hostname;
      const urlDomain = new URL(url).hostname;
      
      // Check scope restrictions
      if (options.scope?.includes('same-origin') && targetDomain !== urlDomain) {
        return false;
      }
      
      // Check excluded paths
      if (options.excludePaths?.some(path => url.includes(path))) {
        return false;
      }
      
      // Check excluded extensions
      const urlPath = new URL(url).pathname;
      if (options.excludeExtensions?.some(ext => urlPath.endsWith(ext))) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }
  
  private calculateCoveragePercentage(discoveryResults: any, scanResult: DASTScanResult): number {
    const totalEndpoints = discoveryResults.endpoints.length + discoveryResults.apiEndpoints.length;
    const testedEndpoints = scanResult.metrics.endpointsTested;
    
    if (totalEndpoints === 0) return 100;
    return Math.min(100, (testedEndpoints / totalEndpoints) * 100);
  }
  
  private calculateAverageResponseTime(httpTests: HTTPSecurityTest[]): number {
    if (httpTests.length === 0) return 0;
    
    const totalTime = httpTests.reduce((sum, test) => sum + (test.responseTime || 0), 0);
    return totalTime / httpTests.length;
  }
  
  private calculateExploitability(vulnerability: Vulnerability): string {
    // Simplified exploitability calculation
    const severityScores = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    const score = severityScores[vulnerability.severity.toLowerCase() as keyof typeof severityScores] || 0;
    
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }
  
  private assessBusinessImpact(vulnerability: Vulnerability): string {
    // Assess business impact based on vulnerability type and context
    const highImpactTypes = ['injection', 'broken-authentication', 'sensitive-data-exposure'];
    if (highImpactTypes.includes(vulnerability.category.toLowerCase())) {
      return 'high';
    }
    return 'medium';
  }
  
  private generateRemediation(vulnerability: Vulnerability): string {
    // Generate remediation guidance based on vulnerability type
    const remediationMap: Record<string, string> = {
      'injection': 'Implement input validation and parameterized queries',
      'xss': 'Implement output encoding and Content Security Policy',
      'broken-authentication': 'Implement multi-factor authentication and secure session management',
      'sensitive-data-exposure': 'Implement encryption at rest and in transit',
      'security-misconfiguration': 'Review and harden security configurations'
    };
    
    return remediationMap[vulnerability.category.toLowerCase()] || 'Review and fix the identified security issue';
  }
  
  private deduplicateAndSortVulnerabilities(vulnerabilities: Vulnerability[]): Vulnerability[] {
    // Remove duplicates based on URL, parameter, and vulnerability type
    const uniqueVulns = vulnerabilities.filter((vuln, index, arr) => {
      return arr.findIndex(v => 
        v.url === vuln.url && 
        v.parameter === vuln.parameter && 
        v.type === vuln.type
      ) === index;
    });
    
    // Sort by severity
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4
    };
    
    return uniqueVulns.sort((a, b) => {
      const severityA = severityOrder[a.severity.toLowerCase()] ?? 5;
      const severityB = severityOrder[b.severity.toLowerCase()] ?? 5;
      return severityA - severityB;
    });
  }
}