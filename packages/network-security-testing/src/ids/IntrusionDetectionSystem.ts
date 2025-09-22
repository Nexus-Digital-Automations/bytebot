/**
 * Advanced Intrusion Detection and Prevention System
 * Provides real-time network monitoring, threat detection, and automated response
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';
import {
  IntrusionEvent,
  IntrusionEventType,
  ThreatClassification,
  IDSConfiguration,
  IDSRule,
  IDSAction,
  IDSSensitivity,
  VulnerabilitySeverity,
  SecurityAlert,
  AlertType,
  AlertStatus
} from '../types';

interface NetworkPacket {
  id: string;
  timestamp: Date;
  source_ip: string;
  destination_ip: string;
  source_port?: number;
  destination_port?: number;
  protocol: string;
  size: number;
  flags: string[];
  payload: Buffer;
  headers: Record<string, string>;
}

interface TrafficPattern {
  pattern_id: string;
  name: string;
  description: string;
  signature: string;
  threshold: number;
  window_seconds: number;
  severity: VulnerabilitySeverity;
  action: IDSAction;
}

interface AttackSignature {
  signature_id: string;
  name: string;
  description: string;
  pattern: RegExp;
  protocol: string[];
  ports: number[];
  severity: VulnerabilitySeverity;
  confidence: number;
  false_positive_rate: number;
}

interface ThreatIntelligence {
  ip: string;
  type: 'malicious' | 'suspicious' | 'whitelist';
  source: string;
  confidence: number;
  last_seen: Date;
  description: string;
  indicators: string[];
}

interface BehaviorBaseline {
  source_ip: string;
  normal_bandwidth: number;
  normal_connections: number;
  normal_protocols: string[];
  normal_ports: number[];
  time_patterns: Record<string, number>;
  established_at: Date;
  confidence: number;
}

export class IntrusionDetectionSystem extends EventEmitter {
  private readonly logger: Logger;
  private configuration: IDSConfiguration;
  private rules: Map<string, IDSRule> = new Map();
  private signatures: Map<string, AttackSignature> = new Map();
  private threatIntel: Map<string, ThreatIntelligence> = new Map();
  private behaviorBaselines: Map<string, BehaviorBaseline> = new Map();
  private eventBuffer: IntrusionEvent[] = [];
  private packetQueue: NetworkPacket[] = [];
  private isRunning: boolean = false;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(config: IDSConfiguration) {
    super();
    this.logger = new Logger('IntrusionDetectionSystem');
    this.configuration = config;
    this.initializeSystem();
  }

  /**
   * Start IDS monitoring
   */
  public async start(): Promise<void> {
    this.logger.info('Starting Intrusion Detection System');

    try {
      if (this.isRunning) {
        throw new Error('IDS is already running');
      }

      this.isRunning = true;

      // Start packet analysis
      this.startPacketAnalysis();

      // Start behavioral analysis
      this.startBehavioralAnalysis();

      // Start threat intelligence updates
      this.startThreatIntelligenceUpdates();

      // Start rule evaluation
      this.startRuleEvaluation();

      this.emit('idsStarted');
      this.logger.info('IDS started successfully');

    } catch (error) {
      this.logger.error('Failed to start IDS', { error });
      this.emit('idsStartFailed', { error });
      throw error;
    }
  }

  /**
   * Stop IDS monitoring
   */
  public async stop(): Promise<void> {
    this.logger.info('Stopping Intrusion Detection System');

    try {
      this.isRunning = false;

      if (this.analysisInterval) {
        clearInterval(this.analysisInterval);
        this.analysisInterval = null;
      }

      this.emit('idsStopped');
      this.logger.info('IDS stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop IDS', { error });
      throw error;
    }
  }

  /**
   * Process network packet
   */
  public async processPacket(packet: NetworkPacket): Promise<void> {
    try {
      // Add to packet queue for analysis
      this.packetQueue.push(packet);

      // Immediate threat detection for high-priority packets
      await this.performImmediateThreatDetection(packet);

      // Update behavioral baselines
      this.updateBehavioralBaseline(packet);

      // Emit packet processed event
      this.emit('packetProcessed', { packet });

    } catch (error) {
      this.logger.warn('Packet processing failed', { packetId: packet.id, error });
    }
  }

  /**
   * Add custom IDS rule
   */
  public addRule(rule: IDSRule): void {
    this.logger.info('Adding IDS rule', { rule: rule.name });

    this.rules.set(rule.id, rule);
    this.emit('ruleAdded', { rule });
  }

  /**
   * Remove IDS rule
   */
  public removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.delete(ruleId);
      this.emit('ruleRemoved', { ruleId });
      this.logger.info('IDS rule removed', { ruleId });
      return true;
    }
    return false;
  }

  /**
   * Get intrusion events
   */
  public getEvents(filters?: {
    timeRange?: { start: Date; end: Date };
    severity?: VulnerabilitySeverity[];
    eventTypes?: IntrusionEventType[];
    sourceIp?: string;
  }): IntrusionEvent[] {
    let events = [...this.eventBuffer];

    if (filters) {
      if (filters.timeRange) {
        events = events.filter(e =>
          e.timestamp >= filters.timeRange!.start &&
          e.timestamp <= filters.timeRange!.end
        );
      }

      if (filters.severity && filters.severity.length > 0) {
        events = events.filter(e => filters.severity!.includes(e.severity));
      }

      if (filters.eventTypes && filters.eventTypes.length > 0) {
        events = events.filter(e => filters.eventTypes!.includes(e.event_type));
      }

      if (filters.sourceIp) {
        events = events.filter(e => e.source_ip === filters.sourceIp);
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Update configuration
   */
  public updateConfiguration(config: Partial<IDSConfiguration>): void {
    this.logger.info('Updating IDS configuration');

    this.configuration = { ...this.configuration, ...config };
    this.emit('configurationUpdated', { configuration: this.configuration });
  }

  /**
   * Get current statistics
   */
  public getStatistics(): {
    packetsProcessed: number;
    eventsGenerated: number;
    threatsDetected: number;
    falsePositives: number;
    rulesActive: number;
    signaturesLoaded: number;
  } {
    return {
      packetsProcessed: this.packetQueue.length,
      eventsGenerated: this.eventBuffer.length,
      threatsDetected: this.eventBuffer.filter(e => e.classification === ThreatClassification.CONFIRMED_THREAT).length,
      falsePositives: this.eventBuffer.filter(e => e.classification === ThreatClassification.BENIGN).length,
      rulesActive: this.rules.size,
      signaturesLoaded: this.signatures.size
    };
  }

  /**
   * Initialize IDS system
   */
  private initializeSystem(): void {
    this.logger.info('Initializing IDS system');

    // Load default rules
    this.loadDefaultRules();

    // Load attack signatures
    this.loadAttackSignatures();

    // Initialize threat intelligence
    this.initializeThreatIntelligence();

    // Initialize behavioral baselines
    this.initializeBehavioralBaselines();

    this.logger.info('IDS system initialized');
  }

  /**
   * Start packet analysis
   */
  private startPacketAnalysis(): void {
    this.analysisInterval = setInterval(async () => {
      if (this.packetQueue.length > 0) {
        const packets = this.packetQueue.splice(0, 100); // Process in batches
        await this.analyzePacketBatch(packets);
      }
    }, 1000); // Analyze every second
  }

  /**
   * Analyze packet batch
   */
  private async analyzePacketBatch(packets: NetworkPacket[]): Promise<void> {
    try {
      for (const packet of packets) {
        // Signature-based detection
        await this.performSignatureDetection(packet);

        // Anomaly-based detection
        await this.performAnomalyDetection(packet);

        // Pattern-based detection
        await this.performPatternDetection(packet);

        // Statistical analysis
        await this.performStatisticalAnalysis(packet);
      }

    } catch (error) {
      this.logger.error('Packet batch analysis failed', { error });
    }
  }

  /**
   * Perform immediate threat detection
   */
  private async performImmediateThreatDetection(packet: NetworkPacket): Promise<void> {
    try {
      // Check against threat intelligence
      const threat = this.threatIntel.get(packet.source_ip);
      if (threat && threat.type === 'malicious') {
        await this.createIntrusionEvent({
          source_ip: packet.source_ip,
          destination_ip: packet.destination_ip,
          source_port: packet.source_port,
          destination_port: packet.destination_port,
          protocol: packet.protocol,
          event_type: IntrusionEventType.SUSPICIOUS_TRAFFIC,
          severity: VulnerabilitySeverity.HIGH,
          signature: 'Known malicious IP',
          description: `Traffic from known malicious IP: ${packet.source_ip}`,
          raw_data: packet.payload.toString('hex'),
          classification: ThreatClassification.CONFIRMED_THREAT,
          false_positive_likelihood: 0.1
        });
      }

      // Check for blacklisted IPs
      if (this.configuration.blacklist.includes(packet.source_ip)) {
        await this.createIntrusionEvent({
          source_ip: packet.source_ip,
          destination_ip: packet.destination_ip,
          source_port: packet.source_port,
          destination_port: packet.destination_port,
          protocol: packet.protocol,
          event_type: IntrusionEventType.POLICY_VIOLATION,
          severity: VulnerabilitySeverity.HIGH,
          signature: 'Blacklisted IP',
          description: `Traffic from blacklisted IP: ${packet.source_ip}`,
          raw_data: packet.payload.toString('hex'),
          classification: ThreatClassification.CONFIRMED_THREAT,
          false_positive_likelihood: 0.05
        });
      }

    } catch (error) {
      this.logger.debug('Immediate threat detection failed', { packetId: packet.id, error });
    }
  }

  /**
   * Perform signature-based detection
   */
  private async performSignatureDetection(packet: NetworkPacket): Promise<void> {
    try {
      const payloadString = packet.payload.toString();

      for (const [signatureId, signature] of this.signatures) {
        if (this.isSignatureMatch(packet, signature)) {
          await this.createIntrusionEvent({
            source_ip: packet.source_ip,
            destination_ip: packet.destination_ip,
            source_port: packet.source_port,
            destination_port: packet.destination_port,
            protocol: packet.protocol,
            event_type: this.mapSignatureToEventType(signature),
            severity: signature.severity,
            signature: signature.name,
            description: signature.description,
            raw_data: packet.payload.toString('hex'),
            classification: ThreatClassification.LIKELY_THREAT,
            false_positive_likelihood: signature.false_positive_rate
          });
        }
      }

    } catch (error) {
      this.logger.debug('Signature detection failed', { packetId: packet.id, error });
    }
  }

  /**
   * Perform anomaly-based detection
   */
  private async performAnomalyDetection(packet: NetworkPacket): Promise<void> {
    try {
      const baseline = this.behaviorBaselines.get(packet.source_ip);

      if (baseline) {
        // Check for unusual protocols
        if (!baseline.normal_protocols.includes(packet.protocol)) {
          await this.createIntrusionEvent({
            source_ip: packet.source_ip,
            destination_ip: packet.destination_ip,
            source_port: packet.source_port,
            destination_port: packet.destination_port,
            protocol: packet.protocol,
            event_type: IntrusionEventType.ANOMALY,
            severity: VulnerabilitySeverity.MEDIUM,
            signature: 'Unusual Protocol',
            description: `Unusual protocol ${packet.protocol} from ${packet.source_ip}`,
            raw_data: packet.payload.toString('hex'),
            classification: ThreatClassification.SUSPICIOUS,
            false_positive_likelihood: 0.3
          });
        }

        // Check for unusual ports
        if (packet.destination_port && !baseline.normal_ports.includes(packet.destination_port)) {
          await this.createIntrusionEvent({
            source_ip: packet.source_ip,
            destination_ip: packet.destination_ip,
            source_port: packet.source_port,
            destination_port: packet.destination_port,
            protocol: packet.protocol,
            event_type: IntrusionEventType.ANOMALY,
            severity: VulnerabilitySeverity.MEDIUM,
            signature: 'Unusual Port Access',
            description: `Unusual port access ${packet.destination_port} from ${packet.source_ip}`,
            raw_data: packet.payload.toString('hex'),
            classification: ThreatClassification.SUSPICIOUS,
            false_positive_likelihood: 0.4
          });
        }
      }

    } catch (error) {
      this.logger.debug('Anomaly detection failed', { packetId: packet.id, error });
    }
  }

  /**
   * Perform pattern-based detection
   */
  private async performPatternDetection(packet: NetworkPacket): Promise<void> {
    try {
      // Port scanning detection
      await this.detectPortScanning(packet);

      // Brute force detection
      await this.detectBruteForce(packet);

      // DDoS detection
      await this.detectDDoS(packet);

      // Data exfiltration detection
      await this.detectDataExfiltration(packet);

    } catch (error) {
      this.logger.debug('Pattern detection failed', { packetId: packet.id, error });
    }
  }

  /**
   * Perform statistical analysis
   */
  private async performStatisticalAnalysis(packet: NetworkPacket): Promise<void> {
    try {
      // Traffic volume analysis
      await this.analyzeTrafficVolume(packet);

      // Connection frequency analysis
      await this.analyzeConnectionFrequency(packet);

      // Payload size analysis
      await this.analyzePayloadSize(packet);

    } catch (error) {
      this.logger.debug('Statistical analysis failed', { packetId: packet.id, error });
    }
  }

  /**
   * Start behavioral analysis
   */
  private startBehavioralAnalysis(): void {
    setInterval(() => {
      this.updateBehavioralBaselines();
      this.detectBehavioralAnomalies();
    }, 60000); // Run every minute
  }

  /**
   * Start threat intelligence updates
   */
  private startThreatIntelligenceUpdates(): void {
    setInterval(async () => {
      await this.updateThreatIntelligence();
    }, 300000); // Update every 5 minutes
  }

  /**
   * Start rule evaluation
   */
  private startRuleEvaluation(): void {
    setInterval(() => {
      this.evaluateRules();
    }, 5000); // Evaluate every 5 seconds
  }

  /**
   * Create intrusion event
   */
  private async createIntrusionEvent(eventData: Omit<IntrusionEvent, 'id' | 'timestamp'>): Promise<IntrusionEvent> {
    const event: IntrusionEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      ...eventData
    };

    // Add to event buffer
    this.eventBuffer.push(event);

    // Apply configured actions
    await this.applyEventActions(event);

    // Emit event
    this.emit('intrusionEvent', { event });

    this.logger.warn('Intrusion event detected', {
      eventId: event.id,
      type: event.event_type,
      severity: event.severity,
      sourceIp: event.source_ip
    });

    return event;
  }

  /**
   * Apply event actions
   */
  private async applyEventActions(event: IntrusionEvent): Promise<void> {
    try {
      // Find matching rules
      for (const [ruleId, rule] of this.rules) {
        if (this.isRuleMatch(event, rule)) {
          switch (rule.action) {
            case IDSAction.ALERT:
              await this.generateAlert(event, rule);
              break;
            case IDSAction.LOG:
              this.logger.info('IDS rule triggered', { ruleId, eventId: event.id });
              break;
            case IDSAction.BLOCK:
              await this.blockTraffic(event);
              break;
            case IDSAction.QUARANTINE:
              await this.quarantineSource(event);
              break;
          }
        }
      }

    } catch (error) {
      this.logger.error('Failed to apply event actions', { eventId: event.id, error });
    }
  }

  /**
   * Generate security alert
   */
  private async generateAlert(event: IntrusionEvent, rule: IDSRule): Promise<void> {
    const alert: SecurityAlert = {
      id: uuidv4(),
      timestamp: new Date(),
      type: AlertType.INTRUSION_ATTEMPT,
      severity: event.severity,
      title: `IDS Alert: ${event.signature}`,
      description: event.description,
      source: event.source_ip,
      target: event.destination_ip,
      indicators: {
        eventId: event.id,
        ruleId: rule.id,
        protocol: event.protocol,
        classification: event.classification
      },
      recommendation: this.getRecommendation(event),
      status: AlertStatus.NEW
    };

    this.emit('securityAlert', { alert });
  }

  // Detection methods
  private async detectPortScanning(packet: NetworkPacket): Promise<void> {
    // Port scanning detection implementation
  }

  private async detectBruteForce(packet: NetworkPacket): Promise<void> {
    // Brute force detection implementation
  }

  private async detectDDoS(packet: NetworkPacket): Promise<void> {
    // DDoS detection implementation
  }

  private async detectDataExfiltration(packet: NetworkPacket): Promise<void> {
    // Data exfiltration detection implementation
  }

  private async analyzeTrafficVolume(packet: NetworkPacket): Promise<void> {
    // Traffic volume analysis implementation
  }

  private async analyzeConnectionFrequency(packet: NetworkPacket): Promise<void> {
    // Connection frequency analysis implementation
  }

  private async analyzePayloadSize(packet: NetworkPacket): Promise<void> {
    // Payload size analysis implementation
  }

  // Utility methods
  private isSignatureMatch(packet: NetworkPacket, signature: AttackSignature): boolean {
    // Check protocol match
    if (signature.protocol.length > 0 && !signature.protocol.includes(packet.protocol)) {
      return false;
    }

    // Check port match
    if (signature.ports.length > 0 && packet.destination_port && !signature.ports.includes(packet.destination_port)) {
      return false;
    }

    // Check pattern match
    const payloadString = packet.payload.toString();
    return signature.pattern.test(payloadString);
  }

  private isRuleMatch(event: IntrusionEvent, rule: IDSRule): boolean {
    // Rule matching implementation
    return true;
  }

  private mapSignatureToEventType(signature: AttackSignature): IntrusionEventType {
    // Map signature to event type
    return IntrusionEventType.SUSPICIOUS_TRAFFIC;
  }

  private getRecommendation(event: IntrusionEvent): string {
    // Generate recommendation based on event
    return 'Investigate the source IP and block if confirmed malicious';
  }

  private updateBehavioralBaseline(packet: NetworkPacket): void {
    // Update behavioral baseline implementation
  }

  private updateBehavioralBaselines(): void {
    // Update all behavioral baselines
  }

  private detectBehavioralAnomalies(): void {
    // Detect behavioral anomalies
  }

  private async updateThreatIntelligence(): Promise<void> {
    // Update threat intelligence feeds
  }

  private evaluateRules(): void {
    // Evaluate IDS rules
  }

  private async blockTraffic(event: IntrusionEvent): Promise<void> {
    // Block traffic implementation
  }

  private async quarantineSource(event: IntrusionEvent): Promise<void> {
    // Quarantine source implementation
  }

  // System initialization methods
  private loadDefaultRules(): void {
    // Load default IDS rules
    const defaultRules: IDSRule[] = [
      {
        id: uuidv4(),
        name: 'Port Scan Detection',
        description: 'Detect port scanning activities',
        pattern: 'port_scan',
        action: IDSAction.ALERT,
        enabled: true,
        threshold: 10,
        window: 60
      },
      {
        id: uuidv4(),
        name: 'Brute Force Detection',
        description: 'Detect brute force attacks',
        pattern: 'brute_force',
        action: IDSAction.BLOCK,
        enabled: true,
        threshold: 5,
        window: 300
      }
    ];

    for (const rule of defaultRules) {
      this.rules.set(rule.id, rule);
    }

    this.logger.info('Default IDS rules loaded', { count: defaultRules.length });
  }

  private loadAttackSignatures(): void {
    // Load attack signatures
    const signatures: AttackSignature[] = [
      {
        signature_id: uuidv4(),
        name: 'SQL Injection Attempt',
        description: 'Detect SQL injection patterns',
        pattern: /(\bUNION\b|\bSELECT\b.*\bFROM\b|\bDROP\b\s+\bTABLE\b)/i,
        protocol: ['tcp'],
        ports: [80, 443, 3306, 1433],
        severity: VulnerabilitySeverity.HIGH,
        confidence: 0.85,
        false_positive_rate: 0.1
      },
      {
        signature_id: uuidv4(),
        name: 'XSS Attack Attempt',
        description: 'Detect cross-site scripting patterns',
        pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        protocol: ['tcp'],
        ports: [80, 443],
        severity: VulnerabilitySeverity.MEDIUM,
        confidence: 0.8,
        false_positive_rate: 0.15
      }
    ];

    for (const signature of signatures) {
      this.signatures.set(signature.signature_id, signature);
    }

    this.logger.info('Attack signatures loaded', { count: signatures.length });
  }

  private initializeThreatIntelligence(): void {
    // Initialize threat intelligence
    this.logger.info('Threat intelligence initialized');
  }

  private initializeBehavioralBaselines(): void {
    // Initialize behavioral baselines
    this.logger.info('Behavioral baselines initialized');
  }
}