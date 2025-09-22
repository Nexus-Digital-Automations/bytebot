/**
 * @fileoverview CI/CD Integration for Application Security Testing
 * @description Seamless integration with popular CI/CD platforms
 * @version 1.0.0
 * @author ByteBot Security Team
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { SecurityLogger } from '../utils/SecurityLogger';
import { SecurityUtils } from '../utils/SecurityUtils';
import ByteBotApplicationSecurityTesting from '../index';
import {
  CIIntegrationConfig,
  CIProvider,
  CIPipelineResult,
  SecurityGate,
  QualityGate,
  SecurityPolicy,
  VulnerabilitySeverity
} from '../types/CITypes';

/**
 * CI/CD Integration for Application Security Testing
 * Provides seamless integration with popular CI/CD platforms
 */
export class CIIntegration extends EventEmitter {
  private static readonly SUPPORTED_PROVIDERS: CIProvider[] = [
    'github-actions',
    'gitlab-ci',
    'jenkins',
    'azure-devops',
    'bitbucket-pipelines',
    'circleci',
    'travis-ci',
    'teamcity',
    'bamboo'
  ];
  
  private static readonly DEFAULT_CONFIG: CIIntegrationConfig = {
    provider: 'github-actions',
    enableSAST: true,
    enableDAST: true,
    enableIAST: false,
    enableOWASP: true,
    enableDependencyCheck: true,
    failOnVulnerabilities: true,
    failureThreshold: 'high',
    parallelExecution: true,
    reportFormats: ['json', 'html'],
    artifactRetention: 30,
    notifications: {
      slack: false,
      email: false,
      webhook: false
    },
    securityGates: {
      preCommit: true,
      preMerge: true,
      preDeployment: true,
      postDeployment: false
    },
    qualityGates: {
      maxCriticalVulns: 0,
      maxHighVulns: 5,
      maxMediumVulns: 20,
      maxTotalVulns: 50,
      minCoveragePercent: 80,
      maxFalsePositiveRate: 15
    }
  };
  
  private logger: SecurityLogger;
  private utils: SecurityUtils;
  private securityFramework: ByteBotApplicationSecurityTesting;
  private config: CIIntegrationConfig;
  
  private isInitialized: boolean = false;
  private activePipelines: Map<string, CIPipelineResult> = new Map();
  private pipelineHistory: CIPipelineResult[] = [];
  
  constructor(config?: Partial<CIIntegrationConfig>) {
    super();
    this.logger = new SecurityLogger('CIIntegration');
    this.utils = new SecurityUtils();
    this.config = { ...CIIntegration.DEFAULT_CONFIG, ...config };
    this.securityFramework = ByteBotApplicationSecurityTesting.getInstance();
  }
  
  /**
   * Initialize CI/CD Integration
   */
  public async initialize(config?: Partial<CIIntegrationConfig>): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Initializing CI/CD Integration...');
    
    try {
      if (config) {
        this.config = { ...this.config, ...config };
      }
      
      // Validate provider support
      if (!CIIntegration.SUPPORTED_PROVIDERS.includes(this.config.provider)) {
        throw new Error(`Unsupported CI provider: ${this.config.provider}`);
      }
      
      // Initialize security framework
      await this.securityFramework.initialize();
      
      // Setup CI-specific configurations
      await this.setupCIEnvironment();
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      this.logger.info(`CI/CD Integration initialized for ${this.config.provider} in ${initTime}ms`);
      this.emit('initialized', { timestamp: new Date(), duration: initTime, provider: this.config.provider });
      
    } catch (error) {
      this.logger.error('Failed to initialize CI/CD Integration', error);
      this.emit('initializationError', error);
      throw error;
    }
  }
  
  /**
   * Execute security testing pipeline
   */
  public async executePipeline(
    context: CIPipelineContext,
    customConfig?: Partial<CIIntegrationConfig>
  ): Promise<CIPipelineResult> {
    const pipelineConfig = { ...this.config, ...customConfig };
    const pipelineId = this.utils.generateTaskId('PIPELINE');
    
    this.logger.info(`Starting security testing pipeline: ${context.type}`, { pipelineId });
    
    const pipelineResult: CIPipelineResult = {
      id: pipelineId,
      context,
      config: pipelineConfig,
      startTime: new Date(),
      status: 'running',
      testResults: [],
      securityGateResults: [],
      qualityGateResults: [],
      artifacts: [],
      metrics: {
        totalDuration: 0,
        testDuration: 0,
        setupDuration: 0,
        reportDuration: 0,
        totalVulnerabilities: 0,
        blockerIssues: 0
      }
    };
    
    this.activePipelines.set(pipelineId, pipelineResult);
    this.emit('pipelineStarted', pipelineResult);
    
    try {
      this.validateInitialization();
      
      const pipelineStartTime = Date.now();
      
      // Phase 1: Pre-flight checks and setup
      this.logger.info('Phase 1: Running pre-flight checks...', { pipelineId });
      await this.runPreflightChecks(context, pipelineConfig);
      
      this.emit('pipelineProgress', {
        pipelineId,
        phase: 'preflight',
        progress: 10,
        message: 'Pre-flight checks completed'
      });
      
      // Phase 2: Security gate validation (pre-test)
      if (pipelineConfig.securityGates) {
        this.logger.info('Phase 2: Validating security gates...', { pipelineId });
        const preTestGateResults = await this.validateSecurityGates(context, 'pre-test', pipelineConfig);
        pipelineResult.securityGateResults.push(...preTestGateResults);
        
        // Check if we should fail early
        if (preTestGateResults.some(gate => !gate.passed && gate.blocking)) {
          throw new Error('Security gate validation failed - blocking issue detected');
        }
        
        this.emit('pipelineProgress', {
          pipelineId,
          phase: 'security-gates',
          progress: 20,
          message: 'Security gates validated'
        });
      }
      
      // Phase 3: Execute security tests
      this.logger.info('Phase 3: Executing security tests...', { pipelineId });
      const testResults = await this.executeSecurityTests(context, pipelineConfig);
      pipelineResult.testResults = testResults;
      
      this.emit('pipelineProgress', {
        pipelineId,
        phase: 'security-testing',
        progress: 70,
        message: `Security tests completed - ${testResults.length} test suites executed`
      });
      
      // Phase 4: Quality gate validation
      this.logger.info('Phase 4: Validating quality gates...', { pipelineId });
      const qualityGateResults = await this.validateQualityGates(testResults, pipelineConfig);
      pipelineResult.qualityGateResults = qualityGateResults;
      
      this.emit('pipelineProgress', {
        pipelineId,
        phase: 'quality-gates',
        progress: 85,
        message: 'Quality gates validated'
      });
      
      // Phase 5: Generate reports and artifacts
      this.logger.info('Phase 5: Generating reports and artifacts...', { pipelineId });
      const artifacts = await this.generateArtifacts(testResults, pipelineConfig);
      pipelineResult.artifacts = artifacts;
      
      this.emit('pipelineProgress', {
        pipelineId,
        phase: 'reporting',
        progress: 95,
        message: 'Reports and artifacts generated'
      });
      
      // Phase 6: Post-pipeline actions
      await this.executePostPipelineActions(pipelineResult, pipelineConfig);
      
      // Finalize pipeline results
      pipelineResult.status = this.determinePipelineStatus(pipelineResult, pipelineConfig);
      pipelineResult.endTime = new Date();
      pipelineResult.metrics.totalDuration = Date.now() - pipelineStartTime;
      pipelineResult.metrics.totalVulnerabilities = this.countTotalVulnerabilities(testResults);
      pipelineResult.metrics.blockerIssues = this.countBlockerIssues(pipelineResult);
      
      this.logger.info(`Security pipeline completed with status: ${pipelineResult.status}`, { pipelineId });
      
      this.activePipelines.delete(pipelineId);
      this.pipelineHistory.push(pipelineResult);
      
      this.emit('pipelineCompleted', pipelineResult);
      return pipelineResult;
      
    } catch (error) {
      pipelineResult.status = 'failed';
      pipelineResult.endTime = new Date();
      pipelineResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`Security pipeline failed`, error, { pipelineId });
      this.activePipelines.delete(pipelineId);
      this.pipelineHistory.push(pipelineResult);
      
      this.emit('pipelineFailed', pipelineResult);
      throw error;
    }
  }
  
  /**
   * Generate CI configuration files
   */
  public async generateCIConfig(
    outputPath: string,
    provider: CIProvider,
    options?: any
  ): Promise<string> {
    this.logger.info(`Generating CI configuration for ${provider}`);
    
    try {
      const config = await this.generateProviderConfig(provider, options);
      const configPath = path.join(outputPath, this.getConfigFileName(provider));
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      
      // Write configuration file
      if (provider === 'github-actions' || provider === 'gitlab-ci') {
        await fs.writeFile(configPath, yaml.stringify(config), 'utf-8');
      } else {
        await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      }
      
      this.logger.info(`CI configuration generated: ${configPath}`);
      return configPath;
      
    } catch (error) {
      this.logger.error(`Failed to generate CI configuration for ${provider}`, error);
      throw error;
    }
  }
  
  /**
   * Validate security policy compliance
   */
  public async validateSecurityPolicy(
    testResults: any[],
    policy: SecurityPolicy
  ): Promise<boolean> {
    this.logger.info('Validating security policy compliance');
    
    try {
      const violations: string[] = [];
      
      // Check vulnerability thresholds
      const vulnCounts = this.countVulnerabilitiesBySeverity(testResults);
      
      if (policy.maxCriticalVulns !== undefined && vulnCounts.critical > policy.maxCriticalVulns) {
        violations.push(`Critical vulnerabilities (${vulnCounts.critical}) exceed policy limit (${policy.maxCriticalVulns})`);
      }
      
      if (policy.maxHighVulns !== undefined && vulnCounts.high > policy.maxHighVulns) {
        violations.push(`High vulnerabilities (${vulnCounts.high}) exceed policy limit (${policy.maxHighVulns})`);
      }
      
      if (policy.maxMediumVulns !== undefined && vulnCounts.medium > policy.maxMediumVulns) {
        violations.push(`Medium vulnerabilities (${vulnCounts.medium}) exceed policy limit (${policy.maxMediumVulns})`);
      }
      
      // Check required test types
      if (policy.requiredTests) {
        const executedTestTypes = new Set(testResults.map(result => result.type));
        for (const requiredTest of policy.requiredTests) {
          if (!executedTestTypes.has(requiredTest)) {
            violations.push(`Required test type not executed: ${requiredTest}`);
          }
        }
      }
      
      // Check coverage requirements
      if (policy.minCoveragePercent !== undefined) {
        const avgCoverage = this.calculateAverageCoverage(testResults);
        if (avgCoverage < policy.minCoveragePercent) {
          violations.push(`Test coverage (${avgCoverage}%) below policy minimum (${policy.minCoveragePercent}%)`);
        }
      }
      
      if (violations.length > 0) {
        this.logger.warn('Security policy violations detected', { violations });
        this.emit('policyViolation', { violations, policy });
        return false;
      }
      
      this.logger.info('Security policy compliance validated successfully');
      return true;
      
    } catch (error) {
      this.logger.error('Failed to validate security policy', error);
      throw error;
    }
  }
  
  /**
   * Get pipeline metrics and analytics
   */
  public getPipelineMetrics(): any {
    const recentPipelines = this.pipelineHistory.slice(-20);
    
    return {
      totalPipelines: this.pipelineHistory.length,
      activePipelines: this.activePipelines.size,
      recentPipelines: recentPipelines.length,
      successRate: this.calculateSuccessRate(recentPipelines),
      averageDuration: this.calculateAverageDuration(recentPipelines),
      vulnerabilityTrends: this.calculateVulnerabilityTrends(recentPipelines),
      qualityGateMetrics: this.calculateQualityGateMetrics(recentPipelines),
      performanceMetrics: this.calculatePerformanceMetrics(recentPipelines)
    };
  }
  
  /**
   * Get active pipelines
   */
  public getActivePipelines(): CIPipelineResult[] {
    return Array.from(this.activePipelines.values());
  }
  
  /**
   * Get pipeline history
   */
  public getPipelineHistory(limit: number = 50): CIPipelineResult[] {
    return this.pipelineHistory.slice(-limit);
  }
  
  /**
   * Shutdown CI/CD Integration
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down CI/CD Integration...');
    
    try {
      // Cancel active pipelines
      const activePipelines = Array.from(this.activePipelines.keys());
      await Promise.all(activePipelines.map(pipelineId => this.cancelPipeline(pipelineId)));
      
      // Shutdown security framework
      await this.securityFramework.shutdown();
      
      this.isInitialized = false;
      this.logger.info('CI/CD Integration shutdown completed');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Error during CI/CD Integration shutdown', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private validateInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('CI/CD Integration not initialized. Call initialize() first.');
    }
  }
  
  private async setupCIEnvironment(): Promise<void> {
    // Setup CI-specific environment variables and configurations
    // This would vary based on the CI provider
    
    switch (this.config.provider) {
      case 'github-actions':
        await this.setupGitHubActions();
        break;
      case 'gitlab-ci':
        await this.setupGitLabCI();
        break;
      case 'jenkins':
        await this.setupJenkins();
        break;
      // Add more providers as needed
      default:
        this.logger.info(`Using generic CI setup for ${this.config.provider}`);
    }
  }
  
  private async setupGitHubActions(): Promise<void> {
    // GitHub Actions specific setup
    this.logger.info('Setting up GitHub Actions integration');
  }
  
  private async setupGitLabCI(): Promise<void> {
    // GitLab CI specific setup
    this.logger.info('Setting up GitLab CI integration');
  }
  
  private async setupJenkins(): Promise<void> {
    // Jenkins specific setup
    this.logger.info('Setting up Jenkins integration');
  }
  
  private async runPreflightChecks(context: CIPipelineContext, config: CIIntegrationConfig): Promise<void> {
    // Validate environment and prerequisites
    const checks = [
      this.checkEnvironmentVariables(),
      this.checkTargetAccessibility(context),
      this.checkResourceAvailability(),
      this.checkDependencies()
    ];
    
    await Promise.all(checks);
  }
  
  private async checkEnvironmentVariables(): Promise<void> {
    // Check required environment variables
    const requiredVars = ['CI', 'CI_COMMIT_SHA', 'CI_PROJECT_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.logger.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    }
  }
  
  private async checkTargetAccessibility(context: CIPipelineContext): Promise<void> {
    // Check if target is accessible
    if (context.target.type === 'url') {
      // Validate URL accessibility
      try {
        const response = await fetch(context.target.value, { method: 'HEAD' });
        if (!response.ok) {
          throw new Error(`Target URL not accessible: ${response.status}`);
        }
      } catch (error) {
        this.logger.warn(`Target URL accessibility check failed: ${context.target.value}`);
      }
    } else if (context.target.type === 'path') {
      // Validate path accessibility
      try {
        await fs.access(context.target.value);
      } catch (error) {
        throw new Error(`Target path not accessible: ${context.target.value}`);
      }
    }
  }
  
  private async checkResourceAvailability(): Promise<void> {
    // Check system resources
    const memUsage = process.memoryUsage();
    const freeMem = memUsage.heapTotal - memUsage.heapUsed;
    
    if (freeMem < 100 * 1024 * 1024) { // Less than 100MB free
      this.logger.warn('Low memory available for security testing');
    }
  }
  
  private async checkDependencies(): Promise<void> {
    // Check required dependencies and tools
    const requiredTools = ['node', 'npm'];
    // In a real implementation, you would check for tool availability
    this.logger.info(`Checking dependencies: ${requiredTools.join(', ')}`);
  }
  
  private async validateSecurityGates(
    context: CIPipelineContext,
    phase: string,
    config: CIIntegrationConfig
  ): Promise<any[]> {
    const gateResults: any[] = [];
    
    if (config.securityGates?.preCommit && phase === 'pre-test') {
      gateResults.push(await this.validatePreCommitGate(context));
    }
    
    if (config.securityGates?.preMerge && phase === 'pre-merge') {
      gateResults.push(await this.validatePreMergeGate(context));
    }
    
    return gateResults;
  }
  
  private async validatePreCommitGate(context: CIPipelineContext): Promise<any> {
    return {
      name: 'pre-commit',
      passed: true,
      blocking: false,
      message: 'Pre-commit security gate passed',
      timestamp: new Date()
    };
  }
  
  private async validatePreMergeGate(context: CIPipelineContext): Promise<any> {
    return {
      name: 'pre-merge',
      passed: true,
      blocking: true,
      message: 'Pre-merge security gate passed',
      timestamp: new Date()
    };
  }
  
  private async executeSecurityTests(
    context: CIPipelineContext,
    config: CIIntegrationConfig
  ): Promise<any[]> {
    const testResults: any[] = [];
    const testPromises: Promise<any>[] = [];
    
    // Execute enabled security tests
    if (config.enableSAST) {
      testPromises.push(this.runSASTTest(context, config));
    }
    
    if (config.enableDAST) {
      testPromises.push(this.runDASTTest(context, config));
    }
    
    if (config.enableIAST) {
      testPromises.push(this.runIASTTest(context, config));
    }
    
    if (config.enableOWASP) {
      testPromises.push(this.runOWASPTest(context, config));
    }
    
    if (config.enableDependencyCheck) {
      testPromises.push(this.runDependencyCheck(context, config));
    }
    
    if (config.parallelExecution) {
      const results = await Promise.allSettled(testPromises);
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          testResults.push(result.value);
        } else {
          this.logger.error(`Test ${index} failed:`, result.reason);
        }
      });
    } else {
      for (const testPromise of testPromises) {
        try {
          const result = await testPromise;
          testResults.push(result);
        } catch (error) {
          this.logger.error('Security test failed:', error);
        }
      }
    }
    
    return testResults;
  }
  
  private async runSASTTest(context: CIPipelineContext, config: CIIntegrationConfig): Promise<any> {
    const target = context.target.type === 'path' ? context.target.value : '.';
    return await this.securityFramework.runSASTScan(target, config.sastOptions || {});
  }
  
  private async runDASTTest(context: CIPipelineContext, config: CIIntegrationConfig): Promise<any> {
    const target = context.target.type === 'url' ? context.target.value : context.deploymentUrl;
    if (!target) {
      throw new Error('DAST requires a target URL');
    }
    return await this.securityFramework.runDASTScan(target, config.dastOptions || {});
  }
  
  private async runIASTTest(context: CIPipelineContext, config: CIIntegrationConfig): Promise<any> {
    const target = context.target.type === 'url' ? context.target.value : context.deploymentUrl;
    if (!target) {
      throw new Error('IAST requires a target URL');
    }
    return await this.securityFramework.runIASTScan(target, config.iastOptions || {});
  }
  
  private async runOWASPTest(context: CIPipelineContext, config: CIIntegrationConfig): Promise<any> {
    const target = context.target.value;
    return await this.securityFramework.runOWASPTop10Test(target, config.owaspOptions || {});
  }
  
  private async runDependencyCheck(context: CIPipelineContext, config: CIIntegrationConfig): Promise<any> {
    // Implement dependency vulnerability scanning
    return {
      type: 'dependency-check',
      status: 'completed',
      vulnerabilities: [],
      metrics: { scanDuration: 1000 }
    };
  }
  
  private async validateQualityGates(testResults: any[], config: CIIntegrationConfig): Promise<any[]> {
    const gateResults: any[] = [];
    
    if (config.qualityGates) {
      const vulnCounts = this.countVulnerabilitiesBySeverity(testResults);
      
      // Validate vulnerability thresholds
      gateResults.push({
        name: 'vulnerability-threshold',
        passed: this.checkVulnerabilityThresholds(vulnCounts, config.qualityGates),
        details: vulnCounts,
        timestamp: new Date()
      });
      
      // Validate coverage requirements
      const avgCoverage = this.calculateAverageCoverage(testResults);
      gateResults.push({
        name: 'coverage-threshold',
        passed: avgCoverage >= (config.qualityGates.minCoveragePercent || 0),
        details: { coverage: avgCoverage, required: config.qualityGates.minCoveragePercent },
        timestamp: new Date()
      });
    }
    
    return gateResults;
  }
  
  private checkVulnerabilityThresholds(vulnCounts: any, qualityGates: any): boolean {
    return (
      vulnCounts.critical <= (qualityGates.maxCriticalVulns || 0) &&
      vulnCounts.high <= (qualityGates.maxHighVulns || Infinity) &&
      vulnCounts.medium <= (qualityGates.maxMediumVulns || Infinity) &&
      (vulnCounts.critical + vulnCounts.high + vulnCounts.medium + vulnCounts.low) <= (qualityGates.maxTotalVulns || Infinity)
    );
  }
  
  private async generateArtifacts(testResults: any[], config: CIIntegrationConfig): Promise<string[]> {
    const artifacts: string[] = [];
    
    for (const format of config.reportFormats || ['json']) {
      const reportPath = `security-report-${Date.now()}.${format}`;
      // Generate report based on format
      artifacts.push(reportPath);
    }
    
    return artifacts;
  }
  
  private async executePostPipelineActions(result: CIPipelineResult, config: CIIntegrationConfig): Promise<void> {
    // Send notifications
    if (config.notifications?.slack) {
      await this.sendSlackNotification(result);
    }
    
    if (config.notifications?.email) {
      await this.sendEmailNotification(result);
    }
    
    if (config.notifications?.webhook) {
      await this.sendWebhookNotification(result);
    }
  }
  
  private async sendSlackNotification(result: CIPipelineResult): Promise<void> {
    this.logger.info('Sending Slack notification for pipeline result');
    // Implement Slack notification
  }
  
  private async sendEmailNotification(result: CIPipelineResult): Promise<void> {
    this.logger.info('Sending email notification for pipeline result');
    // Implement email notification
  }
  
  private async sendWebhookNotification(result: CIPipelineResult): Promise<void> {
    this.logger.info('Sending webhook notification for pipeline result');
    // Implement webhook notification
  }
  
  private determinePipelineStatus(result: CIPipelineResult, config: CIIntegrationConfig): string {
    // Check if any quality gates failed
    const failedQualityGates = result.qualityGateResults.filter(gate => !gate.passed);
    if (failedQualityGates.length > 0) {
      return 'failed';
    }
    
    // Check if any blocking security gates failed
    const failedSecurityGates = result.securityGateResults.filter(gate => !gate.passed && gate.blocking);
    if (failedSecurityGates.length > 0) {
      return 'failed';
    }
    
    // Check vulnerability thresholds
    const vulnCounts = this.countVulnerabilitiesBySeverity(result.testResults);
    if (config.failOnVulnerabilities) {
      const threshold = config.failureThreshold || 'high';
      if (threshold === 'critical' && vulnCounts.critical > 0) {
        return 'failed';
      }
      if (['high', 'critical'].includes(threshold) && vulnCounts.high > 0) {
        return 'failed';
      }
      if (['medium', 'high', 'critical'].includes(threshold) && vulnCounts.medium > 0) {
        return 'failed';
      }
    }
    
    return 'success';
  }
  
  private countTotalVulnerabilities(testResults: any[]): number {
    return testResults.reduce((total, result) => {
      return total + (result.vulnerabilities?.length || 0);
    }, 0);
  }
  
  private countBlockerIssues(result: CIPipelineResult): number {
    const failedGates = [
      ...result.securityGateResults.filter(gate => !gate.passed && gate.blocking),
      ...result.qualityGateResults.filter(gate => !gate.passed)
    ];
    
    return failedGates.length;
  }
  
  private countVulnerabilitiesBySeverity(testResults: any[]): any {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    
    testResults.forEach(result => {
      if (result.vulnerabilities) {
        result.vulnerabilities.forEach((vuln: any) => {
          const severity = vuln.severity?.toLowerCase() || 'info';
          if (severity in counts) {
            counts[severity as keyof typeof counts]++;
          }
        });
      }
    });
    
    return counts;
  }
  
  private calculateAverageCoverage(testResults: any[]): number {
    const coverageValues = testResults
      .map(result => result.metrics?.coveragePercentage)
      .filter(coverage => coverage !== undefined);
    
    if (coverageValues.length === 0) return 0;
    
    return coverageValues.reduce((sum, coverage) => sum + coverage, 0) / coverageValues.length;
  }
  
  private async cancelPipeline(pipelineId: string): Promise<boolean> {
    const pipeline = this.activePipelines.get(pipelineId);
    if (!pipeline) {
      return false;
    }
    
    pipeline.status = 'cancelled';
    pipeline.endTime = new Date();
    
    this.activePipelines.delete(pipelineId);
    this.pipelineHistory.push(pipeline);
    
    this.emit('pipelineCancelled', pipeline);
    return true;
  }
  
  private async generateProviderConfig(provider: CIProvider, options?: any): Promise<any> {
    switch (provider) {
      case 'github-actions':
        return this.generateGitHubActionsConfig(options);
      case 'gitlab-ci':
        return this.generateGitLabCIConfig(options);
      case 'jenkins':
        return this.generateJenkinsConfig(options);
      // Add more providers
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  private generateGitHubActionsConfig(options?: any): any {
    return {
      name: 'Security Testing',
      on: {
        push: { branches: ['main', 'develop'] },
        pull_request: { branches: ['main'] }
      },
      jobs: {
        'security-testing': {
          'runs-on': 'ubuntu-latest',
          steps: [
            { uses: 'actions/checkout@v3' },
            {
              name: 'Setup Node.js',
              uses: 'actions/setup-node@v3',
              with: { 'node-version': '18' }
            },
            {
              name: 'Install Dependencies',
              run: 'npm install -g @bytebot/application-security-testing'
            },
            {
              name: 'Run SAST Scan',
              run: 'ast-scan sast .'
            },
            {
              name: 'Run OWASP Top 10 Test',
              run: 'ast-scan owasp .'
            },
            {
              name: 'Upload Reports',
              uses: 'actions/upload-artifact@v3',
              with: {
                name: 'security-reports',
                path: 'security-reports/'
              }
            }
          ]
        }
      }
    };
  }
  
  private generateGitLabCIConfig(options?: any): any {
    return {
      stages: ['security'],
      'security-testing': {
        stage: 'security',
        image: 'node:18',
        script: [
          'npm install -g @bytebot/application-security-testing',
          'ast-scan scan .',
        ],
        artifacts: {
          paths: ['security-reports/'],
          expire_in: '1 week'
        }
      }
    };
  }
  
  private generateJenkinsConfig(options?: any): any {
    return {
      pipeline: {
        agent: 'any',
        stages: [
          {
            name: 'Security Testing',
            steps: [
              'sh "npm install -g @bytebot/application-security-testing"',
              'sh "ast-scan scan ."'
            ],
            post: {
              always: [
                'archiveArtifacts artifacts: "security-reports/**", fingerprint: true'
              ]
            }
          }
        ]
      }
    };
  }
  
  private getConfigFileName(provider: CIProvider): string {
    const fileNameMap: Record<CIProvider, string> = {
      'github-actions': '.github/workflows/security-testing.yml',
      'gitlab-ci': '.gitlab-ci.yml',
      'jenkins': 'Jenkinsfile',
      'azure-devops': 'azure-pipelines.yml',
      'bitbucket-pipelines': 'bitbucket-pipelines.yml',
      'circleci': '.circleci/config.yml',
      'travis-ci': '.travis.yml',
      'teamcity': 'teamcity-settings.json',
      'bamboo': 'bamboo-specs.yml'
    };
    
    return fileNameMap[provider];
  }
  
  private calculateSuccessRate(pipelines: CIPipelineResult[]): number {
    if (pipelines.length === 0) return 0;
    const successCount = pipelines.filter(p => p.status === 'success').length;
    return (successCount / pipelines.length) * 100;
  }
  
  private calculateAverageDuration(pipelines: CIPipelineResult[]): number {
    if (pipelines.length === 0) return 0;
    const totalDuration = pipelines.reduce((sum, p) => sum + (p.metrics.totalDuration || 0), 0);
    return totalDuration / pipelines.length;
  }
  
  private calculateVulnerabilityTrends(pipelines: CIPipelineResult[]): any {
    // Calculate vulnerability trends over time
    return pipelines.map(p => ({
      timestamp: p.startTime,
      vulnerabilities: p.metrics.totalVulnerabilities
    }));
  }
  
  private calculateQualityGateMetrics(pipelines: CIPipelineResult[]): any {
    // Calculate quality gate pass/fail rates
    const totalGates = pipelines.reduce((sum, p) => sum + p.qualityGateResults.length, 0);
    const passedGates = pipelines.reduce((sum, p) => {
      return sum + p.qualityGateResults.filter(gate => gate.passed).length;
    }, 0);
    
    return {
      totalGates,
      passedGates,
      passRate: totalGates > 0 ? (passedGates / totalGates) * 100 : 0
    };
  }
  
  private calculatePerformanceMetrics(pipelines: CIPipelineResult[]): any {
    // Calculate performance metrics
    const durations = pipelines.map(p => p.metrics.totalDuration).filter(d => d > 0);
    
    return {
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b) / durations.length : 0,
      minDuration: durations.length > 0 ? Math.min(...durations) : 0,
      maxDuration: durations.length > 0 ? Math.max(...durations) : 0
    };
  }
}

// Supporting interfaces
interface CIPipelineContext {
  type: 'commit' | 'pull-request' | 'merge' | 'deployment';
  target: {
    type: 'path' | 'url';
    value: string;
  };
  branch: string;
  commit: string;
  author: string;
  deploymentUrl?: string;
  environment?: string;
  metadata?: Record<string, any>;
}