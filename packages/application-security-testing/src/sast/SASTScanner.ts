/**
 * @fileoverview SAST (Static Application Security Testing) Scanner
 * @description Comprehensive static code analysis for security vulnerabilities
 * @version 1.0.0
 * @author ByteBot Security Team
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { StaticCodeAnalyzer } from './StaticCodeAnalyzer';
import { VulnerabilityPatternDetector } from './VulnerabilityPatternDetector';
import { CodeQualityAnalyzer } from './CodeQualityAnalyzer';
import { DependencyScanner } from './DependencyScanner';
import { SecurityCodeReviewAutomator } from './SecurityCodeReviewAutomator';
import { SecurityLogger } from '../utils/SecurityLogger';
import { SecurityUtils } from '../utils/SecurityUtils';
import {
  SASTScanResult,
  SASTScanOptions,
  Vulnerability,
  VulnerabilitySeverity,
  VulnerabilityCategory,
  CodeSecurityIssue,
  SASTMetrics
} from '../types/SecurityTypes';

/**
 * SAST Scanner - Static Application Security Testing
 * Performs comprehensive static code analysis to identify security vulnerabilities
 */
export class SASTScanner extends EventEmitter {
  private static readonly SUPPORTED_EXTENSIONS = [
    '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java', '.cs', '.php',
    '.rb', '.go', '.rs', '.cpp', '.c', '.h', '.hpp', '.sql', '.xml', '.json'
  ];
  
  private static readonly DEFAULT_SCAN_OPTIONS: SASTScanOptions = {
    includeTests: false,
    includeDependencies: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    timeout: 300000, // 5 minutes
    parallel: true,
    maxParallelJobs: 8,
    reportFormat: 'comprehensive',
    severity: ['critical', 'high', 'medium', 'low'],
    categories: ['injection', 'xss', 'security-misconfiguration', 'sensitive-data-exposure']
  };
  
  private codeAnalyzer: StaticCodeAnalyzer;
  private patternDetector: VulnerabilityPatternDetector;
  private qualityAnalyzer: CodeQualityAnalyzer;
  private dependencyScanner: DependencyScanner;
  private codeReviewAutomator: SecurityCodeReviewAutomator;
  private logger: SecurityLogger;
  private utils: SecurityUtils;
  
  private isInitialized: boolean = false;
  private activeScanTasks: Map<string, any> = new Map();
  private scanHistory: SASTScanResult[] = [];
  
  constructor(options?: Partial<SASTScanOptions>) {
    super();
    this.logger = new SecurityLogger('SASTScanner');
    this.utils = new SecurityUtils();
    
    // Initialize SAST components
    this.codeAnalyzer = new StaticCodeAnalyzer();
    this.patternDetector = new VulnerabilityPatternDetector();
    this.qualityAnalyzer = new CodeQualityAnalyzer();
    this.dependencyScanner = new DependencyScanner();
    this.codeReviewAutomator = new SecurityCodeReviewAutomator();
  }
  
  /**
   * Initialize the SAST Scanner
   */
  public async initialize(options?: Partial<SASTScanOptions>): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Initializing SAST Scanner...');
    
    try {
      // Initialize all SAST components
      await Promise.all([
        this.codeAnalyzer.initialize(),
        this.patternDetector.initialize(),
        this.qualityAnalyzer.initialize(),
        this.dependencyScanner.initialize(),
        this.codeReviewAutomator.initialize()
      ]);
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      this.logger.info(`SAST Scanner initialized in ${initTime}ms`);
      this.emit('initialized', { timestamp: new Date(), duration: initTime });
      
    } catch (error) {
      this.logger.error('Failed to initialize SAST Scanner', error);
      this.emit('initializationError', error);
      throw error;
    }
  }
  
  /**
   * Scan codebase for security vulnerabilities
   */
  public async scanCodebase(
    codebasePath: string,
    options: Partial<SASTScanOptions> = {}
  ): Promise<SASTScanResult> {
    const scanOptions = { ...SASTScanner.DEFAULT_SCAN_OPTIONS, ...options };
    const scanId = this.utils.generateTaskId('SAST_SCAN');
    
    this.logger.info(`Starting SAST scan of codebase: ${codebasePath}`, { scanId });
    
    const scanResult: SASTScanResult = {
      id: scanId,
      codebasePath,
      startTime: new Date(),
      status: 'running',
      options: scanOptions,
      vulnerabilities: [],
      codeIssues: [],
      dependencyIssues: [],
      metrics: {
        scanDuration: 0,
        filesScanned: 0,
        linesAnalyzed: 0,
        rulesExecuted: 0,
        vulnerabilitiesFound: 0,
        falsePositiveRate: 0,
        coveragePercentage: 0
      }
    };
    
    this.activeScanTasks.set(scanId, scanResult);
    this.emit('scanStarted', scanResult);
    
    try {
      this.validateInitialization();
      await this.validateCodebasePath(codebasePath);
      
      const scanStartTime = Date.now();
      
      // Phase 1: Discover and analyze files
      this.logger.info('Phase 1: Discovering and analyzing files...', { scanId });
      const files = await this.discoverFiles(codebasePath, scanOptions);
      scanResult.metrics.filesScanned = files.length;
      
      this.emit('scanProgress', {
        scanId,
        phase: 'file-discovery',
        progress: 10,
        message: `Discovered ${files.length} files for analysis`
      });
      
      // Phase 2: Static code analysis
      this.logger.info('Phase 2: Performing static code analysis...', { scanId });
      const codeAnalysisResults = await this.performCodeAnalysis(files, scanOptions);
      scanResult.vulnerabilities.push(...codeAnalysisResults.vulnerabilities);
      scanResult.codeIssues.push(...codeAnalysisResults.codeIssues);
      scanResult.metrics.linesAnalyzed = codeAnalysisResults.linesAnalyzed;
      
      this.emit('scanProgress', {
        scanId,
        phase: 'code-analysis',
        progress: 40,
        message: `Analyzed ${codeAnalysisResults.linesAnalyzed} lines of code`
      });
      
      // Phase 3: Vulnerability pattern detection
      this.logger.info('Phase 3: Detecting vulnerability patterns...', { scanId });
      const patternResults = await this.detectVulnerabilityPatterns(files, scanOptions);
      scanResult.vulnerabilities.push(...patternResults.vulnerabilities);
      scanResult.metrics.rulesExecuted = patternResults.rulesExecuted;
      
      this.emit('scanProgress', {
        scanId,
        phase: 'pattern-detection',
        progress: 60,
        message: `Executed ${patternResults.rulesExecuted} security rules`
      });
      
      // Phase 4: Code quality analysis
      this.logger.info('Phase 4: Analyzing code quality...', { scanId });
      const qualityResults = await this.analyzeCodeQuality(files, scanOptions);
      scanResult.codeIssues.push(...qualityResults.issues);
      
      this.emit('scanProgress', {
        scanId,
        phase: 'quality-analysis',
        progress: 75,
        message: `Found ${qualityResults.issues.length} code quality issues`
      });
      
      // Phase 5: Dependency scanning
      if (scanOptions.includeDependencies) {
        this.logger.info('Phase 5: Scanning dependencies...', { scanId });
        const dependencyResults = await this.scanDependencies(codebasePath, scanOptions);
        scanResult.dependencyIssues.push(...dependencyResults.issues);
        scanResult.vulnerabilities.push(...dependencyResults.vulnerabilities);
        
        this.emit('scanProgress', {
          scanId,
          phase: 'dependency-scan',
          progress: 90,
          message: `Scanned dependencies, found ${dependencyResults.issues.length} issues`
        });
      }
      
      // Phase 6: Security code review
      this.logger.info('Phase 6: Performing automated security code review...', { scanId });
      const reviewResults = await this.performSecurityCodeReview(files, scanResult.vulnerabilities, scanOptions);
      scanResult.codeIssues.push(...reviewResults.issues);
      
      this.emit('scanProgress', {
        scanId,
        phase: 'security-review',
        progress: 95,
        message: `Completed automated security code review`
      });
      
      // Finalize scan results
      scanResult.status = 'completed';
      scanResult.endTime = new Date();
      scanResult.metrics.scanDuration = Date.now() - scanStartTime;
      scanResult.metrics.vulnerabilitiesFound = scanResult.vulnerabilities.length;
      scanResult.metrics.coveragePercentage = this.calculateCoveragePercentage(files, scanResult);
      scanResult.metrics.falsePositiveRate = await this.calculateFalsePositiveRate(scanResult.vulnerabilities);
      
      // Remove duplicates and sort by severity
      scanResult.vulnerabilities = this.deduplicateAndSortVulnerabilities(scanResult.vulnerabilities);
      
      this.logger.info(`SAST scan completed: ${scanResult.vulnerabilities.length} vulnerabilities, ${scanResult.codeIssues.length} code issues`, { scanId });
      
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanResult);
      
      this.emit('scanCompleted', scanResult);
      return scanResult;
      
    } catch (error) {
      scanResult.status = 'failed';
      scanResult.endTime = new Date();
      scanResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`SAST scan failed for: ${codebasePath}`, error, { scanId });
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanResult);
      
      this.emit('scanFailed', scanResult);
      throw error;
    }
  }
  
  /**
   * Cancel an active SAST scan
   */
  public async cancelScan(scanId: string): Promise<boolean> {
    const scanTask = this.activeScanTasks.get(scanId);
    if (!scanTask) {
      this.logger.warn(`Attempted to cancel non-existent scan: ${scanId}`);
      return false;
    }
    
    this.logger.info(`Cancelling SAST scan: ${scanId}`);
    
    try {
      // Cancel ongoing operations
      await Promise.all([
        this.codeAnalyzer.cancelAnalysis(scanId),
        this.patternDetector.cancelDetection(scanId),
        this.qualityAnalyzer.cancelAnalysis(scanId),
        this.dependencyScanner.cancelScan(scanId),
        this.codeReviewAutomator.cancelReview(scanId)
      ]);
      
      scanTask.status = 'cancelled';
      scanTask.endTime = new Date();
      
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanTask);
      
      this.emit('scanCancelled', scanTask);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to cancel SAST scan: ${scanId}`, error);
      return false;
    }
  }
  
  /**
   * Get scan history
   */
  public getScanHistory(limit: number = 20): SASTScanResult[] {
    return this.scanHistory.slice(-limit);
  }
  
  /**
   * Get active scans
   */
  public getActiveScans(): SASTScanResult[] {
    return Array.from(this.activeScanTasks.values());
  }
  
  /**
   * Shutdown the SAST Scanner
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down SAST Scanner...');
    
    try {
      // Cancel all active scans
      const activeScans = Array.from(this.activeScanTasks.keys());
      await Promise.all(activeScans.map(scanId => this.cancelScan(scanId)));
      
      // Shutdown all components
      await Promise.all([
        this.codeAnalyzer.shutdown(),
        this.patternDetector.shutdown(),
        this.qualityAnalyzer.shutdown(),
        this.dependencyScanner.shutdown(),
        this.codeReviewAutomator.shutdown()
      ]);
      
      this.isInitialized = false;
      this.logger.info('SAST Scanner shutdown completed');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Error during SAST Scanner shutdown', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private validateInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('SAST Scanner not initialized. Call initialize() first.');
    }
  }
  
  private async validateCodebasePath(codebasePath: string): Promise<void> {
    try {
      const stats = await fs.stat(codebasePath);
      if (!stats.isDirectory()) {
        throw new Error('Codebase path must be a directory');
      }
    } catch (error) {
      throw new Error(`Invalid codebase path: ${codebasePath}`);
    }
  }
  
  private async discoverFiles(codebasePath: string, options: SASTScanOptions): Promise<string[]> {
    const files: string[] = [];
    
    const discoverRecursive = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip certain directories
          if (this.shouldSkipDirectory(entry.name, options)) {
            continue;
          }
          await discoverRecursive(fullPath);
        } else if (entry.isFile()) {
          // Check if file should be included
          if (this.shouldIncludeFile(fullPath, options)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    await discoverRecursive(codebasePath);
    return files;
  }
  
  private shouldSkipDirectory(dirName: string, options: SASTScanOptions): boolean {
    const skipDirs = ['node_modules', '.git', '.svn', 'dist', 'build', 'coverage'];
    if (!options.includeTests) {
      skipDirs.push('test', 'tests', '__tests__', 'spec', 'specs');
    }
    return skipDirs.includes(dirName) || dirName.startsWith('.');
  }
  
  private shouldIncludeFile(filePath: string, options: SASTScanOptions): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SASTScanner.SUPPORTED_EXTENSIONS.includes(ext);
  }
  
  private async performCodeAnalysis(files: string[], options: SASTScanOptions): Promise<any> {
    return await this.codeAnalyzer.analyzeFiles(files, options);
  }
  
  private async detectVulnerabilityPatterns(files: string[], options: SASTScanOptions): Promise<any> {
    return await this.patternDetector.detectPatterns(files, options);
  }
  
  private async analyzeCodeQuality(files: string[], options: SASTScanOptions): Promise<any> {
    return await this.qualityAnalyzer.analyzeQuality(files, options);
  }
  
  private async scanDependencies(codebasePath: string, options: SASTScanOptions): Promise<any> {
    return await this.dependencyScanner.scanDependencies(codebasePath, options);
  }
  
  private async performSecurityCodeReview(files: string[], vulnerabilities: Vulnerability[], options: SASTScanOptions): Promise<any> {
    return await this.codeReviewAutomator.performReview(files, vulnerabilities, options);
  }
  
  private calculateCoveragePercentage(files: string[], scanResult: SASTScanResult): number {
    // Calculate how much of the codebase was actually analyzed
    const totalLines = scanResult.metrics.linesAnalyzed;
    const analyzedFiles = scanResult.metrics.filesScanned;
    
    if (files.length === 0) return 0;
    
    // Simplified coverage calculation
    return Math.min(100, (analyzedFiles / files.length) * 100);
  }
  
  private async calculateFalsePositiveRate(vulnerabilities: Vulnerability[]): Promise<number> {
    // This would typically involve machine learning or heuristics
    // For now, return a conservative estimate based on vulnerability types
    if (vulnerabilities.length === 0) return 0;
    
    let estimatedFalsePositives = 0;
    vulnerabilities.forEach(vuln => {
      // Different vulnerability types have different false positive rates
      switch (vuln.category) {
        case VulnerabilityCategory.INJECTION:
          estimatedFalsePositives += 0.1; // 10% false positive rate
          break;
        case VulnerabilityCategory.XSS:
          estimatedFalsePositives += 0.15; // 15% false positive rate
          break;
        default:
          estimatedFalsePositives += 0.2; // 20% default false positive rate
      }
    });
    
    return (estimatedFalsePositives / vulnerabilities.length) * 100;
  }
  
  private deduplicateAndSortVulnerabilities(vulnerabilities: Vulnerability[]): Vulnerability[] {
    // Remove duplicates based on file path, line number, and vulnerability type
    const uniqueVulns = vulnerabilities.filter((vuln, index, arr) => {
      return arr.findIndex(v => 
        v.file === vuln.file && 
        v.line === vuln.line && 
        v.type === vuln.type
      ) === index;
    });
    
    // Sort by severity (critical > high > medium > low > info)
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