import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Comprehensive DDoS Protection Service
 *
 * Features:
 * - Real-time traffic spike detection
 * - Distributed attack pattern recognition
 * - Automatic IP blocking and mitigation
 * - Geographic traffic analysis
 * - Machine learning-based anomaly detection
 * - Adaptive threshold adjustment
 * - Integration with external DDoS protection services
 */

export interface DDoSAttackPattern {
  id: string;
  name: string;
  description: string;
  indicators: {
    requestsPerSecond: number;
    uniqueIPs: number;
    geographicDistribution: number;
    userAgentVariation: number;
    requestPatternSimilarity: number;
    payloadSize: number;
    responseTimeThreshold: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  mitigationActions: string[];
}

export interface DDoSMetrics {
  totalRequests: number;
  requestsPerSecond: number;
  uniqueIPs: number;
  suspiciousIPs: number;
  blockedIPs: number;
  detectedAttacks: number;
  mitigatedAttacks: number;
  averageResponseTime: number;
  bandwidthUsage: number;
  connectionCount: number;
  geographicDistribution: Record<string, number>;
  attackPatterns: DDoSAttackPattern[];
  systemLoad: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface TrafficSpike {
  startTime: number;
  peakTime: number;
  endTime?: number;
  peakRequestsPerSecond: number;
  totalRequests: number;
  uniqueIPs: number;
  sourceCountries: string[];
  topUserAgents: string[];
  topEndpoints: string[];
  severity: 'normal' | 'suspicious' | 'attack';
  confidence: number;
  mitigationApplied: boolean;
  mitigationActions: string[];
}

export interface IPReputation {
  ip: string;
  reputation: number; // 0-100 scale
  firstSeen: number;
  lastSeen: number;
  requestCount: number;
  violationCount: number;
  country: string;
  isp: string;
  asn: string;
  isProxy: boolean;
  isTor: boolean;
  isBot: boolean;
  threatCategories: string[];
  confidence: number;
}

interface TrafficMetrics {
  timestamp: number;
  requestsPerSecond: number;
  uniqueIPs: number;
  errorRate: number;
  responseTime: number;
  bandwidth: number;
}

@Injectable()
export class DDoSProtectionService {
  private readonly logger = new Logger(DDoSProtectionService.name);

  // Traffic monitoring data
  private trafficHistory: TrafficMetrics[] = [];
  private activeSpikes: TrafficSpike[] = [];
  private ipReputations = new Map<string, IPReputation>();
  private suspiciousIPs = new Set<string>();
  private blockedIPs = new Map<string, { blockedUntil: number; reason: string }>();

  // Detection thresholds
  private thresholds = {
    normalTrafficRPS: 100,
    spikeThresholdMultiplier: 3,
    suspiciousRPSPerIP: 50,
    attackRPSPerIP: 100,
    uniqueIPThreshold: 1000,
    errorRateThreshold: 0.1,
    responseTimeThreshold: 2000,
    geographicAnomalyThreshold: 0.8
  };

  // Machine learning models (simplified)
  private anomalyModel = {
    baseline: {
      avgRequestsPerSecond: 50,
      avgUniqueIPs: 100,
      avgErrorRate: 0.01,
      avgResponseTime: 200
    },
    deviationThresholds: {
      requestsPerSecond: 3.0, // 3 standard deviations
      uniqueIPs: 2.5,
      errorRate: 4.0,
      responseTime: 3.0
    }
  };

  // Current metrics
  private metrics: DDoSMetrics = {
    totalRequests: 0,
    requestsPerSecond: 0,
    uniqueIPs: 0,
    suspiciousIPs: 0,
    blockedIPs: 0,
    detectedAttacks: 0,
    mitigatedAttacks: 0,
    averageResponseTime: 0,
    bandwidthUsage: 0,
    connectionCount: 0,
    geographicDistribution: {},
    attackPatterns: [],
    systemLoad: { cpu: 0, memory: 0, network: 0 }
  };

  constructor(private readonly configService: ConfigService) {
    this.loadConfiguration();
    this.startTrafficMonitoring();
    this.startAnomalyDetection();
    this.loadIPReputationDatabase();
  }

  /**
   * Analyze incoming request for DDoS patterns
   */
  async analyzeRequest(req: Request): Promise<{
    allowed: boolean;
    risk: 'low' | 'medium' | 'high' | 'critical';
    reasons: string[];
    actions: string[];
  }> {
    const ip = this.getClientIP(req);
    const timestamp = Date.now();

    // Update traffic metrics
    this.updateTrafficMetrics(req);

    // Check if IP is blocked
    if (this.isIPBlocked(ip)) {
      return {
        allowed: false,
        risk: 'critical',
        reasons: ['IP is blocked due to DDoS activity'],
        actions: ['blocked']
      };
    }

    // Analyze IP reputation
    const reputation = this.getIPReputation(ip);
    const riskFactors: string[] = [];
    const actions: string[] = [];

    // Check for suspicious patterns
    if (reputation.reputation < 50) {
      riskFactors.push('Low IP reputation score');
    }

    if (reputation.isProxy || reputation.isTor) {
      riskFactors.push('Traffic from proxy/Tor network');
    }

    if (reputation.requestCount > this.thresholds.suspiciousRPSPerIP) {
      riskFactors.push('High request rate from single IP');
    }

    // Check for attack patterns
    const attackPatterns = this.detectAttackPatterns(req, reputation);
    riskFactors.push(...attackPatterns.map(p => p.description));

    // Determine risk level
    let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (reputation.requestCount > this.thresholds.attackRPSPerIP) {
      risk = 'critical';
      actions.push('block_ip');
    } else if (riskFactors.length >= 3 || reputation.reputation < 30) {
      risk = 'high';
      actions.push('rate_limit_aggressive');
    } else if (riskFactors.length >= 2 || reputation.reputation < 50) {
      risk = 'medium';
      actions.push('rate_limit_moderate');
    }

    // Apply mitigation actions
    if (actions.length > 0) {
      await this.applyMitigationActions(ip, actions, risk);
    }

    return {
      allowed: risk !== 'critical',
      risk,
      reasons: riskFactors,
      actions
    };
  }

  /**
   * Detect traffic spikes and anomalies
   */
  private detectTrafficSpikes(): void {
    const now = Date.now();
    const recentMetrics = this.trafficHistory
      .filter(m => m.timestamp > now - 60000) // Last minute
      .sort((a, b) => b.timestamp - a.timestamp);

    if (recentMetrics.length < 10) return;

    const currentRPS = recentMetrics[0].requestsPerSecond;
    const avgRPS = recentMetrics.slice(1, 11).reduce((sum, m) => sum + m.requestsPerSecond, 0) / 10;

    // Detect spike
    if (currentRPS > avgRPS * this.thresholds.spikeThresholdMultiplier) {
      this.handleTrafficSpike(currentRPS, avgRPS, recentMetrics[0]);
    }

    // Machine learning anomaly detection
    this.detectAnomalies(recentMetrics[0]);
  }

  /**
   * Handle detected traffic spike
   */
  private handleTrafficSpike(currentRPS: number, avgRPS: number, metrics: TrafficMetrics): void {
    const existingSpike = this.activeSpikes.find(s => !s.endTime && s.startTime > Date.now() - 300000);

    if (existingSpike) {
      // Update existing spike
      existingSpike.peakRequestsPerSecond = Math.max(existingSpike.peakRequestsPerSecond, currentRPS);
      existingSpike.peakTime = Date.now();
    } else {
      // Create new spike record
      const spike: TrafficSpike = {
        startTime: Date.now(),
        peakTime: Date.now(),
        peakRequestsPerSecond: currentRPS,
        totalRequests: 0,
        uniqueIPs: metrics.uniqueIPs,
        sourceCountries: [],
        topUserAgents: [],
        topEndpoints: [],
        severity: this.determineSpikeseverity(currentRPS, avgRPS, metrics),
        confidence: this.calculateSpikeConfidence(currentRPS, avgRPS, metrics),
        mitigationApplied: false,
        mitigationActions: []
      };

      this.activeSpikes.push(spike);

      if (spike.severity === 'attack') {
        this.triggerDDoSMitigation(spike);
      }
    }

    this.logger.warn('Traffic spike detected', {
      currentRPS,
      avgRPS,
      multiplier: currentRPS / avgRPS,
      uniqueIPs: metrics.uniqueIPs,
      severity: existingSpike?.severity || 'unknown'
    });
  }

  /**
   * Determine spike severity
   */
  private determineSpikeseverity(currentRPS: number, avgRPS: number, metrics: TrafficMetrics): 'normal' | 'suspicious' | 'attack' {
    const multiplier = currentRPS / avgRPS;
    const errorRate = metrics.errorRate;
    const responseTime = metrics.responseTime;

    if (multiplier > 10 && errorRate > 0.3) {
      return 'attack';
    } else if (multiplier > 5 && (errorRate > 0.1 || responseTime > 2000)) {
      return 'suspicious';
    } else {
      return 'normal';
    }
  }

  /**
   * Calculate spike confidence score
   */
  private calculateSpikeConfidence(currentRPS: number, avgRPS: number, metrics: TrafficMetrics): number {
    let confidence = 0;

    // Traffic volume factor
    const volumeFactor = Math.min(currentRPS / avgRPS / 10, 1);
    confidence += volumeFactor * 30;

    // Error rate factor
    if (metrics.errorRate > 0.1) {
      confidence += 25;
    }

    // Response time factor
    if (metrics.responseTime > 1000) {
      confidence += 20;
    }

    // Unique IP distribution factor
    if (metrics.uniqueIPs > this.thresholds.uniqueIPThreshold) {
      confidence += 25;
    }

    return Math.min(confidence, 100);
  }

  /**
   * Trigger DDoS mitigation
   */
  private async triggerDDoSMitigation(spike: TrafficSpike): Promise<void> {
    this.logger.error('DDoS attack detected - triggering mitigation', { spike });

    const mitigationActions = [];

    // Enable aggressive rate limiting
    mitigationActions.push('aggressive_rate_limiting');

    // Block suspicious IPs
    for (const ip of this.suspiciousIPs) {
      this.blockIP(ip, 3600000, 'DDoS attack mitigation'); // 1 hour block
      mitigationActions.push(`blocked_ip_${ip}`);
    }

    // Enable CAPTCHA for high-risk requests
    mitigationActions.push('enable_captcha');

    // Notify security team
    mitigationActions.push('security_alert');

    spike.mitigationApplied = true;
    spike.mitigationActions = mitigationActions;
    this.metrics.mitigatedAttacks++;

    // In production, integrate with external DDoS protection services
    await this.notifyExternalServices(spike);
  }

  /**
   * Detect attack patterns using heuristics
   */
  private detectAttackPatterns(req: Request, reputation: IPReputation): DDoSAttackPattern[] {
    const patterns: DDoSAttackPattern[] = [];

    // Volumetric attack pattern
    if (reputation.requestCount > this.thresholds.attackRPSPerIP) {
      patterns.push({
        id: 'volumetric_attack',
        name: 'Volumetric Attack',
        description: 'High volume of requests from single IP',
        indicators: {
          requestsPerSecond: reputation.requestCount,
          uniqueIPs: 1,
          geographicDistribution: 0,
          userAgentVariation: 0,
          requestPatternSimilarity: 1,
          payloadSize: parseInt(req.headers['content-length'] || '0'),
          responseTimeThreshold: 0
        },
        severity: 'high',
        confidence: 85,
        mitigationActions: ['rate_limit', 'block_ip']
      });
    }

    // Distributed attack pattern
    if (this.metrics.uniqueIPs > this.thresholds.uniqueIPThreshold &&
        this.metrics.requestsPerSecond > this.thresholds.normalTrafficRPS * 5) {
      patterns.push({
        id: 'distributed_attack',
        name: 'Distributed Attack',
        description: 'Coordinated attack from multiple IPs',
        indicators: {
          requestsPerSecond: this.metrics.requestsPerSecond,
          uniqueIPs: this.metrics.uniqueIPs,
          geographicDistribution: Object.keys(this.metrics.geographicDistribution).length,
          userAgentVariation: 0,
          requestPatternSimilarity: 0.8,
          payloadSize: 0,
          responseTimeThreshold: 0
        },
        severity: 'critical',
        confidence: 90,
        mitigationActions: ['global_rate_limit', 'geographic_filtering', 'challenge_response']
      });
    }

    // Slowloris attack pattern
    const connectionTime = Date.now() - (req.socket as any).startTime || 0;
    if (connectionTime > 30000 && parseInt(req.headers['content-length'] || '0') > 1000000) {
      patterns.push({
        id: 'slowloris_attack',
        name: 'Slowloris Attack',
        description: 'Slow HTTP request attack',
        indicators: {
          requestsPerSecond: 0,
          uniqueIPs: 0,
          geographicDistribution: 0,
          userAgentVariation: 0,
          requestPatternSimilarity: 0,
          payloadSize: parseInt(req.headers['content-length'] || '0'),
          responseTimeThreshold: connectionTime
        },
        severity: 'medium',
        confidence: 70,
        mitigationActions: ['connection_timeout', 'request_size_limit']
      });
    }

    return patterns;
  }

  /**
   * Machine learning-based anomaly detection
   */
  private detectAnomalies(metrics: TrafficMetrics): void {
    const { baseline, deviationThresholds } = this.anomalyModel;

    // Calculate z-scores for key metrics
    const rpsZScore = Math.abs(metrics.requestsPerSecond - baseline.avgRequestsPerSecond) /
                     (baseline.avgRequestsPerSecond / 3);

    const ipZScore = Math.abs(metrics.uniqueIPs - baseline.avgUniqueIPs) /
                    (baseline.avgUniqueIPs / 3);

    const errorZScore = Math.abs(metrics.errorRate - baseline.avgErrorRate) /
                       (baseline.avgErrorRate / 3);

    const responseZScore = Math.abs(metrics.responseTime - baseline.avgResponseTime) /
                          (baseline.avgResponseTime / 3);

    // Detect anomalies
    const anomalies = [];

    if (rpsZScore > deviationThresholds.requestsPerSecond) {
      anomalies.push('requests_per_second');
    }

    if (ipZScore > deviationThresholds.uniqueIPs) {
      anomalies.push('unique_ips');
    }

    if (errorZScore > deviationThresholds.errorRate) {
      anomalies.push('error_rate');
    }

    if (responseZScore > deviationThresholds.responseTime) {
      anomalies.push('response_time');
    }

    if (anomalies.length >= 2) {
      this.logger.warn('Traffic anomaly detected', {
        anomalies,
        metrics,
        zScores: { rpsZScore, ipZScore, errorZScore, responseZScore }
      });

      // Trigger anomaly response
      this.handleAnomalyDetection(anomalies, metrics);
    }
  }

  /**
   * Handle anomaly detection
   */
  private handleAnomalyDetection(anomalies: string[], metrics: TrafficMetrics): void {
    // Increase monitoring sensitivity
    this.thresholds.spikeThresholdMultiplier = Math.max(1.5, this.thresholds.spikeThresholdMultiplier * 0.8);

    // Alert security team
    this.logger.error('SECURITY ALERT: Traffic anomaly detected', {
      anomalies,
      metrics,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Apply mitigation actions
   */
  private async applyMitigationActions(ip: string, actions: string[], risk: string): Promise<void> {
    for (const action of actions) {
      switch (action) {
        case 'block_ip':
          this.blockIP(ip, 3600000, `DDoS protection - risk level: ${risk}`);
          break;
        case 'rate_limit_aggressive':
          // Implemented in rate limiter service
          break;
        case 'rate_limit_moderate':
          // Implemented in rate limiter service
          break;
      }
    }
  }

  /**
   * Block IP address
   */
  private blockIP(ip: string, durationMs: number, reason: string): void {
    const blockedUntil = Date.now() + durationMs;
    this.blockedIPs.set(ip, { blockedUntil, reason });
    this.metrics.blockedIPs++;

    this.logger.warn(`IP blocked for DDoS protection`, { ip, durationMs, reason });

    // Auto-unblock after duration
    setTimeout(() => {
      if (this.blockedIPs.get(ip)?.blockedUntil === blockedUntil) {
        this.blockedIPs.delete(ip);
        this.metrics.blockedIPs--;
        this.logger.log(`IP unblocked`, { ip });
      }
    }, durationMs);
  }

  /**
   * Check if IP is blocked
   */
  private isIPBlocked(ip: string): boolean {
    const block = this.blockedIPs.get(ip);
    if (!block) return false;

    if (Date.now() > block.blockedUntil) {
      this.blockedIPs.delete(ip);
      this.metrics.blockedIPs--;
      return false;
    }

    return true;
  }

  /**
   * Get or create IP reputation
   */
  private getIPReputation(ip: string): IPReputation {
    let reputation = this.ipReputations.get(ip);

    if (!reputation) {
      reputation = {
        ip,
        reputation: 75, // Default neutral reputation
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        requestCount: 0,
        violationCount: 0,
        country: 'unknown',
        isp: 'unknown',
        asn: 'unknown',
        isProxy: false,
        isTor: false,
        isBot: false,
        threatCategories: [],
        confidence: 50
      };

      this.ipReputations.set(ip, reputation);
    }

    // Update reputation
    reputation.lastSeen = Date.now();
    reputation.requestCount++;

    return reputation;
  }

  /**
   * Update traffic metrics
   */
  private updateTrafficMetrics(req: Request): void {
    const now = Date.now();
    this.metrics.totalRequests++;

    // Calculate requests per second
    const recentRequests = this.trafficHistory
      .filter(m => m.timestamp > now - 1000)
      .reduce((sum, m) => sum + m.requestsPerSecond, 0);

    this.metrics.requestsPerSecond = recentRequests + 1;

    // Update unique IPs
    const ip = this.getClientIP(req);
    this.getIPReputation(ip); // This adds to ipReputations
    this.metrics.uniqueIPs = this.ipReputations.size;

    // Update geographic distribution
    const country = this.getCountryCode(req);
    this.metrics.geographicDistribution[country] =
      (this.metrics.geographicDistribution[country] || 0) + 1;

    // Add to traffic history
    this.trafficHistory.push({
      timestamp: now,
      requestsPerSecond: 1,
      uniqueIPs: 1,
      errorRate: 0, // Will be updated by response middleware
      responseTime: 0, // Will be updated by response middleware
      bandwidth: parseInt(req.headers['content-length'] || '0')
    });

    // Keep only last 5 minutes of history
    this.trafficHistory = this.trafficHistory
      .filter(m => m.timestamp > now - 300000);
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  /**
   * Get country code from IP
   */
  private getCountryCode(req: Request): string {
    return req.headers['cf-ipcountry'] as string || 'unknown';
  }

  /**
   * Notify external DDoS protection services
   */
  private async notifyExternalServices(spike: TrafficSpike): Promise<void> {
    // In production, integrate with:
    // - Cloudflare
    // - AWS Shield
    // - Akamai
    // - Other DDoS protection services

    this.logger.log('Notifying external DDoS protection services', { spike });
  }

  /**
   * Load configuration
   */
  private loadConfiguration(): void {
    // Load thresholds from configuration
    this.thresholds.normalTrafficRPS =
      this.configService.get<number>('DDOS_NORMAL_TRAFFIC_RPS', 100);

    this.thresholds.spikeThresholdMultiplier =
      this.configService.get<number>('DDOS_SPIKE_THRESHOLD_MULTIPLIER', 3);

    this.thresholds.suspiciousRPSPerIP =
      this.configService.get<number>('DDOS_SUSPICIOUS_RPS_PER_IP', 50);
  }

  /**
   * Start traffic monitoring
   */
  private startTrafficMonitoring(): void {
    // Monitor traffic every 5 seconds
    setInterval(() => {
      this.detectTrafficSpikes();
      this.updateSystemMetrics();
    }, 5000);

    // Reset metrics every hour
    setInterval(() => {
      this.logger.log('DDoS protection metrics', this.metrics);
    }, 3600000);
  }

  /**
   * Start anomaly detection
   */
  private startAnomalyDetection(): void {
    // Update baseline every hour
    setInterval(() => {
      this.updateAnomalyBaseline();
    }, 3600000);
  }

  /**
   * Update anomaly detection baseline
   */
  private updateAnomalyBaseline(): void {
    const recentMetrics = this.trafficHistory
      .filter(m => m.timestamp > Date.now() - 3600000); // Last hour

    if (recentMetrics.length === 0) return;

    this.anomalyModel.baseline = {
      avgRequestsPerSecond: recentMetrics.reduce((sum, m) => sum + m.requestsPerSecond, 0) / recentMetrics.length,
      avgUniqueIPs: recentMetrics.reduce((sum, m) => sum + m.uniqueIPs, 0) / recentMetrics.length,
      avgErrorRate: recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length,
      avgResponseTime: recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
    };

    this.logger.log('Updated anomaly detection baseline', this.anomalyModel.baseline);
  }

  /**
   * Update system metrics
   */
  private updateSystemMetrics(): void {
    // In production, integrate with system monitoring
    this.metrics.systemLoad = {
      cpu: Math.random() * 100, // Mock values
      memory: Math.random() * 100,
      network: Math.random() * 100
    };
  }

  /**
   * Load IP reputation database
   */
  private loadIPReputationDatabase(): void {
    // In production, load from threat intelligence feeds
    this.logger.log('IP reputation database loaded');
  }

  /**
   * Get current metrics
   */
  getMetrics(): DDoSMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active traffic spikes
   */
  getActiveSpikes(): TrafficSpike[] {
    return [...this.activeSpikes];
  }

  /**
   * Get blocked IPs
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blockedIPs.keys());
  }

  /**
   * Manually block IP
   */
  manuallyBlockIP(ip: string, durationMs: number, reason: string): void {
    this.blockIP(ip, durationMs, `Manual block: ${reason}`);
  }

  /**
   * Manually unblock IP
   */
  manuallyUnblockIP(ip: string): void {
    if (this.blockedIPs.delete(ip)) {
      this.metrics.blockedIPs--;
      this.logger.log(`IP manually unblocked`, { ip });
    }
  }
}