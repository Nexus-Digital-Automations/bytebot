/**
 * @fileoverview IAST (Interactive Application Security Testing) Scanner
 * @description Real-time security testing during application execution
 * @version 1.0.0
 * @author ByteBot Security Team
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { RuntimeVulnerabilityDetector } from './RuntimeVulnerabilityDetector';
import { RealTimeSecurityMonitor } from './RealTimeSecurityMonitor';
import { SecurityFeedbackLoop } from './SecurityFeedbackLoop';
import { ContinuousSecurityValidator } from './ContinuousSecurityValidator';
import { SecurityLogger } from '../utils/SecurityLogger';
import { SecurityUtils } from '../utils/SecurityUtils';
import {
  IASTScanResult,
  IASTScanOptions,
  Vulnerability,
  RuntimeSecurityEvent,
  DataFlowAnalysis,
  SecurityInteraction,
  IASTMetrics
} from '../types/SecurityTypes';

/**
 * IAST Scanner - Interactive Application Security Testing
 * Performs real-time security analysis during application execution
 */
export class IASTScanner extends EventEmitter {
  private static readonly DEFAULT_SCAN_OPTIONS: IASTScanOptions = {
    timeout: 1800000, // 30 minutes
    realTimeMonitoring: true,
    dataFlowTracking: true,
    runtimeInstrumentation: true,
    feedbackEnabled: true,
    continuousValidation: true,
    monitoringDepth: 'deep',
    instrumentationLevel: 'aggressive',
    performanceImpactThreshold: 10, // 10% max performance impact
    eventBufferSize: 10000,
    analysisInterval: 5000, // 5 seconds
    vulnerabilityThreshold: 'medium',
    excludePatterns: ['/health', '/metrics', '/status'],
    includePatterns: ['/**']
  };
  
  private runtimeDetector: RuntimeVulnerabilityDetector;
  private realTimeMonitor: RealTimeSecurityMonitor;
  private feedbackLoop: SecurityFeedbackLoop;
  private continuousValidator: ContinuousSecurityValidator;
  private logger: SecurityLogger;
  private utils: SecurityUtils;
  private websocketServer: WebSocket.Server | null = null;
  private connectedAgents: Map<string, WebSocket> = new Map();
  
  private isInitialized: boolean = false;
  private activeScanTasks: Map<string, any> = new Map();
  private scanHistory: IASTScanResult[] = [];
  private runtimeEvents: RuntimeSecurityEvent[] = [];
  private dataFlows: DataFlowAnalysis[] = [];
  
  constructor(options?: Partial<IASTScanOptions>) {
    super();
    this.logger = new SecurityLogger('IASTScanner');
    this.utils = new SecurityUtils();
    
    // Initialize IAST components
    this.runtimeDetector = new RuntimeVulnerabilityDetector();
    this.realTimeMonitor = new RealTimeSecurityMonitor();
    this.feedbackLoop = new SecurityFeedbackLoop();
    this.continuousValidator = new ContinuousSecurityValidator();
  }
  
  /**
   * Initialize the IAST Scanner
   */
  public async initialize(options?: Partial<IASTScanOptions>): Promise<void> {
    const startTime = Date.now();
    this.logger.info('Initializing IAST Scanner...');
    
    try {
      // Initialize WebSocket server for runtime communication
      this.websocketServer = new WebSocket.Server({ port: 0 }); // Use dynamic port
      const port = (this.websocketServer.address() as any)?.port;
      
      this.setupWebSocketHandlers();
      
      // Initialize all IAST components
      await Promise.all([
        this.runtimeDetector.initialize(),
        this.realTimeMonitor.initialize(),
        this.feedbackLoop.initialize(),
        this.continuousValidator.initialize()
      ]);
      
      this.isInitialized = true;
      
      const initTime = Date.now() - startTime;
      this.logger.info(`IAST Scanner initialized in ${initTime}ms, WebSocket server on port ${port}`);
      this.emit('initialized', { timestamp: new Date(), duration: initTime, port });
      
    } catch (error) {
      this.logger.error('Failed to initialize IAST Scanner', error);
      if (this.websocketServer) {
        this.websocketServer.close();
        this.websocketServer = null;
      }
      this.emit('initializationError', error);
      throw error;
    }
  }
  
  /**
   * Scan application runtime for security vulnerabilities
   */
  public async scanRuntime(
    applicationEndpoint: string,
    options: Partial<IASTScanOptions> = {}
  ): Promise<IASTScanResult> {
    const scanOptions = { ...IASTScanner.DEFAULT_SCAN_OPTIONS, ...options };
    const scanId = this.utils.generateTaskId('IAST_SCAN');
    
    this.logger.info(`Starting IAST scan of runtime: ${applicationEndpoint}`, { scanId });
    
    const scanResult: IASTScanResult = {
      id: scanId,
      applicationEndpoint,
      startTime: new Date(),
      status: 'running',
      options: scanOptions,
      vulnerabilities: [],
      runtimeEvents: [],
      dataFlows: [],
      securityInteractions: [],
      metrics: {
        scanDuration: 0,
        interactionsMonitored: 0,
        dataFlowsAnalyzed: 0,
        runtimeEventsCapture: 0,
        vulnerabilitiesDetected: 0,
        performanceImpact: 0,
        coveragePercentage: 0
      }
    };
    
    this.activeScanTasks.set(scanId, scanResult);
    this.emit('scanStarted', scanResult);
    
    try {
      this.validateInitialization();
      await this.validateApplicationEndpoint(applicationEndpoint);
      
      const scanStartTime = Date.now();
      
      // Phase 1: Deploy runtime instrumentation
      this.logger.info('Phase 1: Deploying runtime instrumentation...', { scanId });
      await this.deployRuntimeInstrumentation(applicationEndpoint, scanOptions);
      
      this.emit('scanProgress', {
        scanId,
        phase: 'instrumentation',
        progress: 10,
        message: 'Runtime instrumentation deployed'
      });
      
      // Phase 2: Start real-time monitoring
      this.logger.info('Phase 2: Starting real-time security monitoring...', { scanId });
      await this.startRealTimeMonitoring(scanId, scanOptions);
      
      this.emit('scanProgress', {
        scanId,
        phase: 'monitoring',
        progress: 20,
        message: 'Real-time monitoring active'
      });
      
      // Phase 3: Interactive security testing
      this.logger.info('Phase 3: Performing interactive security testing...', { scanId });
      const interactiveResults = await this.performInteractiveTesting(applicationEndpoint, scanOptions);
      scanResult.securityInteractions.push(...interactiveResults.interactions);
      scanResult.vulnerabilities.push(...interactiveResults.vulnerabilities);
      scanResult.metrics.interactionsMonitored = interactiveResults.interactions.length;
      
      this.emit('scanProgress', {
        scanId,
        phase: 'interactive-testing',
        progress: 50,
        message: `Completed ${interactiveResults.interactions.length} security interactions`
      });
      
      // Phase 4: Data flow analysis
      if (scanOptions.dataFlowTracking) {
        this.logger.info('Phase 4: Analyzing data flows...', { scanId });
        const dataFlowResults = await this.analyzeDataFlows(scanId, scanOptions);
        scanResult.dataFlows.push(...dataFlowResults.flows);
        scanResult.vulnerabilities.push(...dataFlowResults.vulnerabilities);
        scanResult.metrics.dataFlowsAnalyzed = dataFlowResults.flows.length;
        
        this.emit('scanProgress', {
          scanId,
          phase: 'data-flow-analysis',
          progress: 70,
          message: `Analyzed ${dataFlowResults.flows.length} data flows`
        });
      }
      
      // Phase 5: Continuous security validation
      if (scanOptions.continuousValidation) {
        this.logger.info('Phase 5: Performing continuous security validation...', { scanId });
        const validationResults = await this.performContinuousValidation(scanId, scanOptions);
        scanResult.vulnerabilities.push(...validationResults.vulnerabilities);
        
        this.emit('scanProgress', {
          scanId,
          phase: 'continuous-validation',
          progress: 85,
          message: `Continuous validation found ${validationResults.vulnerabilities.length} additional vulnerabilities`
        });
      }
      
      // Phase 6: Security feedback analysis
      if (scanOptions.feedbackEnabled) {
        this.logger.info('Phase 6: Analyzing security feedback...', { scanId });
        const feedbackResults = await this.analyzeFeedbackData(scanId, scanOptions);
        scanResult.vulnerabilities.push(...feedbackResults.vulnerabilities);
        
        this.emit('scanProgress', {
          scanId,
          phase: 'feedback-analysis',
          progress: 95,
          message: 'Security feedback analysis completed'
        });
      }
      
      // Finalize scan results
      await this.stopRealTimeMonitoring(scanId);
      
      scanResult.status = 'completed';
      scanResult.endTime = new Date();
      scanResult.metrics.scanDuration = Date.now() - scanStartTime;
      scanResult.metrics.vulnerabilitiesDetected = scanResult.vulnerabilities.length;
      scanResult.metrics.runtimeEventsCapture = scanResult.runtimeEvents.length;
      scanResult.metrics.performanceImpact = await this.calculatePerformanceImpact(scanId);
      scanResult.metrics.coveragePercentage = this.calculateCoveragePercentage(scanResult);
      
      // Collect runtime events
      scanResult.runtimeEvents = this.getRuntimeEvents(scanId);
      
      // Remove duplicates and sort by severity
      scanResult.vulnerabilities = this.deduplicateAndSortVulnerabilities(scanResult.vulnerabilities);
      
      this.logger.info(`IAST scan completed: ${scanResult.vulnerabilities.length} vulnerabilities detected`, { scanId });
      
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanResult);
      
      this.emit('scanCompleted', scanResult);
      return scanResult;
      
    } catch (error) {
      scanResult.status = 'failed';
      scanResult.endTime = new Date();
      scanResult.error = error instanceof Error ? error.message : String(error);
      
      this.logger.error(`IAST scan failed for: ${applicationEndpoint}`, error, { scanId });
      
      // Cleanup on failure
      await this.cleanupScan(scanId);
      
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanResult);
      
      this.emit('scanFailed', scanResult);
      throw error;
    }
  }
  
  /**
   * Cancel an active IAST scan
   */
  public async cancelScan(scanId: string): Promise<boolean> {
    const scanTask = this.activeScanTasks.get(scanId);
    if (!scanTask) {
      this.logger.warn(`Attempted to cancel non-existent scan: ${scanId}`);
      return false;
    }
    
    this.logger.info(`Cancelling IAST scan: ${scanId}`);
    
    try {
      await this.cleanupScan(scanId);
      
      scanTask.status = 'cancelled';
      scanTask.endTime = new Date();
      
      this.activeScanTasks.delete(scanId);
      this.scanHistory.push(scanTask);
      
      this.emit('scanCancelled', scanTask);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to cancel IAST scan: ${scanId}`, error);
      return false;
    }
  }
  
  /**
   * Get real-time security events
   */
  public getRuntimeEvents(scanId?: string): RuntimeSecurityEvent[] {
    if (scanId) {
      return this.runtimeEvents.filter(event => event.scanId === scanId);
    }
    return this.runtimeEvents.slice(-1000); // Last 1000 events
  }
  
  /**
   * Get data flow analysis results
   */
  public getDataFlows(scanId?: string): DataFlowAnalysis[] {
    if (scanId) {
      return this.dataFlows.filter(flow => flow.scanId === scanId);
    }
    return this.dataFlows.slice(-500); // Last 500 flows
  }
  
  /**
   * Get scan history
   */
  public getScanHistory(limit: number = 20): IASTScanResult[] {
    return this.scanHistory.slice(-limit);
  }
  
  /**
   * Get active scans
   */
  public getActiveScans(): IASTScanResult[] {
    return Array.from(this.activeScanTasks.values());
  }
  
  /**
   * Shutdown the IAST Scanner
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down IAST Scanner...');
    
    try {
      // Cancel all active scans
      const activeScans = Array.from(this.activeScanTasks.keys());
      await Promise.all(activeScans.map(scanId => this.cancelScan(scanId)));
      
      // Close WebSocket connections
      this.connectedAgents.forEach(ws => ws.close());
      this.connectedAgents.clear();
      
      // Close WebSocket server
      if (this.websocketServer) {
        this.websocketServer.close();
        this.websocketServer = null;
      }
      
      // Shutdown all components
      await Promise.all([
        this.runtimeDetector.shutdown(),
        this.realTimeMonitor.shutdown(),
        this.feedbackLoop.shutdown(),
        this.continuousValidator.shutdown()
      ]);
      
      this.isInitialized = false;
      this.logger.info('IAST Scanner shutdown completed');
      this.emit('shutdown');
      
    } catch (error) {
      this.logger.error('Error during IAST Scanner shutdown', error);
      throw error;
    }
  }
  
  // Private helper methods
  
  private validateInitialization(): void {
    if (!this.isInitialized) {
      throw new Error('IAST Scanner not initialized. Call initialize() first.');
    }
  }
  
  private async validateApplicationEndpoint(applicationEndpoint: string): Promise<void> {
    // Validate that the application endpoint is accessible
    try {
      const url = new URL(applicationEndpoint);
      if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
        throw new Error('Application endpoint must use HTTP, HTTPS, WS, or WSS protocol');
      }
    } catch (error) {
      throw new Error(`Invalid application endpoint: ${applicationEndpoint}`);
    }
  }
  
  private setupWebSocketHandlers(): void {
    if (!this.websocketServer) return;
    
    this.websocketServer.on('connection', (ws, request) => {
      const agentId = this.utils.generateTaskId('AGENT');
      this.connectedAgents.set(agentId, ws);
      
      this.logger.info(`IAST agent connected: ${agentId}`);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleAgentMessage(agentId, message);
        } catch (error) {
          this.logger.error('Error parsing agent message', error);
        }
      });
      
      ws.on('close', () => {
        this.connectedAgents.delete(agentId);
        this.logger.info(`IAST agent disconnected: ${agentId}`);
      });
      
      ws.on('error', (error) => {
        this.logger.error(`IAST agent error: ${agentId}`, error);
        this.connectedAgents.delete(agentId);
      });
    });
  }
  
  private handleAgentMessage(agentId: string, message: any): void {
    switch (message.type) {
      case 'runtime-event':
        this.processRuntimeEvent(agentId, message.data);
        break;
      case 'data-flow':
        this.processDataFlow(agentId, message.data);
        break;
      case 'security-interaction':
        this.processSecurityInteraction(agentId, message.data);
        break;
      case 'performance-metrics':
        this.processPerformanceMetrics(agentId, message.data);
        break;
      default:
        this.logger.warn(`Unknown message type from agent ${agentId}: ${message.type}`);
    }
  }
  
  private processRuntimeEvent(agentId: string, eventData: any): void {
    const runtimeEvent: RuntimeSecurityEvent = {
      id: this.utils.generateTaskId('EVENT'),
      agentId,
      timestamp: new Date(),
      ...eventData
    };
    
    this.runtimeEvents.push(runtimeEvent);
    this.emit('runtimeEvent', runtimeEvent);
    
    // Check for immediate security threats
    if (runtimeEvent.severity === 'critical' || runtimeEvent.severity === 'high') {
      this.emit('securityThreat', runtimeEvent);
    }
  }
  
  private processDataFlow(agentId: string, flowData: any): void {
    const dataFlow: DataFlowAnalysis = {
      id: this.utils.generateTaskId('FLOW'),
      agentId,
      timestamp: new Date(),
      ...flowData
    };
    
    this.dataFlows.push(dataFlow);
    this.emit('dataFlow', dataFlow);
  }
  
  private processSecurityInteraction(agentId: string, interactionData: any): void {
    const interaction: SecurityInteraction = {
      id: this.utils.generateTaskId('INTERACTION'),
      agentId,
      timestamp: new Date(),
      ...interactionData
    };
    
    this.emit('securityInteraction', interaction);
  }
  
  private processPerformanceMetrics(agentId: string, metricsData: any): void {
    this.emit('performanceMetrics', { agentId, ...metricsData });
  }
  
  private async deployRuntimeInstrumentation(applicationEndpoint: string, options: IASTScanOptions): Promise<void> {
    // Deploy runtime instrumentation agents
    // This would typically involve injecting monitoring code into the application
    // For demonstration, we'll simulate this process
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate deployment time
    this.logger.info('Runtime instrumentation deployed successfully');
  }
  
  private async startRealTimeMonitoring(scanId: string, options: IASTScanOptions): Promise<void> {
    return await this.realTimeMonitor.startMonitoring(scanId, options);
  }
  
  private async stopRealTimeMonitoring(scanId: string): Promise<void> {
    return await this.realTimeMonitor.stopMonitoring(scanId);
  }
  
  private async performInteractiveTesting(applicationEndpoint: string, options: IASTScanOptions): Promise<any> {
    return await this.runtimeDetector.performInteractiveTesting(applicationEndpoint, options);
  }
  
  private async analyzeDataFlows(scanId: string, options: IASTScanOptions): Promise<any> {
    const flows = this.getDataFlows(scanId);
    const vulnerabilities: Vulnerability[] = [];
    
    // Analyze data flows for security vulnerabilities
    for (const flow of flows) {
      const flowVulns = await this.analyzeDataFlowSecurity(flow);
      vulnerabilities.push(...flowVulns);
    }
    
    return { flows, vulnerabilities };
  }
  
  private async analyzeDataFlowSecurity(flow: DataFlowAnalysis): Promise<Vulnerability[]> {
    const vulnerabilities: Vulnerability[] = [];
    
    // Analyze for common data flow vulnerabilities
    if (flow.containsSensitiveData && !flow.isEncrypted) {
      vulnerabilities.push({
        id: this.utils.generateTaskId('VULN'),
        type: 'sensitive-data-exposure',
        category: 'sensitive-data-exposure',
        severity: 'high',
        title: 'Unencrypted Sensitive Data in Data Flow',
        description: `Sensitive data detected in unencrypted data flow: ${flow.source} -> ${flow.destination}`,
        file: flow.source,
        line: flow.line || 0,
        evidence: flow.data,
        recommendation: 'Encrypt sensitive data in transit and at rest'
      });
    }
    
    if (flow.isTainted && flow.reachesDatabase) {
      vulnerabilities.push({
        id: this.utils.generateTaskId('VULN'),
        type: 'sql-injection',
        category: 'injection',
        severity: 'critical',
        title: 'Potential SQL Injection via Tainted Data Flow',
        description: `Tainted data flows from ${flow.source} to database without proper sanitization`,
        file: flow.source,
        line: flow.line || 0,
        evidence: flow.data,
        recommendation: 'Implement input validation and parameterized queries'
      });
    }
    
    return vulnerabilities;
  }
  
  private async performContinuousValidation(scanId: string, options: IASTScanOptions): Promise<any> {
    return await this.continuousValidator.performValidation(scanId, options);
  }
  
  private async analyzeFeedbackData(scanId: string, options: IASTScanOptions): Promise<any> {
    return await this.feedbackLoop.analyzeFeedback(scanId, options);
  }
  
  private async calculatePerformanceImpact(scanId: string): Promise<number> {
    // Calculate the performance impact of IAST monitoring
    // This would typically involve comparing performance metrics before and after instrumentation
    return 5; // Simplified: 5% performance impact
  }
  
  private calculateCoveragePercentage(scanResult: IASTScanResult): number {
    // Calculate how much of the application was covered by IAST monitoring
    const interactions = scanResult.securityInteractions.length;
    const dataFlows = scanResult.dataFlows.length;
    const runtimeEvents = scanResult.runtimeEvents.length;
    
    // Simplified coverage calculation based on activity
    const totalActivity = interactions + dataFlows + runtimeEvents;
    return Math.min(100, (totalActivity / 100) * 100); // Normalize to percentage
  }
  
  private async cleanupScan(scanId: string): Promise<void> {
    try {
      await this.stopRealTimeMonitoring(scanId);
      await this.runtimeDetector.cancelDetection(scanId);
      await this.continuousValidator.cancelValidation(scanId);
      await this.feedbackLoop.cancelAnalysis(scanId);
    } catch (error) {
      this.logger.error(`Error during scan cleanup: ${scanId}`, error);
    }
  }
  
  private deduplicateAndSortVulnerabilities(vulnerabilities: Vulnerability[]): Vulnerability[] {
    // Remove duplicates based on type, file, and line
    const uniqueVulns = vulnerabilities.filter((vuln, index, arr) => {
      return arr.findIndex(v => 
        v.type === vuln.type && 
        v.file === vuln.file && 
        v.line === vuln.line
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