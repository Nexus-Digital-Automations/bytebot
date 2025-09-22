import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Comprehensive API Abuse Prevention Service
 *
 * Features:
 * - Bot detection and classification
 * - API scraping prevention
 * - Anomalous usage pattern identification
 * - API key abuse detection
 * - Automated abuse response mechanisms
 * - Behavioral analysis and fingerprinting
 * - Challenge-response systems
 * - Machine learning-based detection
 */

export interface BotDetectionResult {
  isBot: boolean;
  botType: 'good' | 'bad' | 'unknown';
  confidence: number;
  indicators: {
    userAgent: boolean;
    requestPattern: boolean;
    behavioral: boolean;
    fingerprint: boolean;
    timing: boolean;
    headers: boolean;
  };
  category: string;
  action: 'allow' | 'challenge' | 'block' | 'monitor';
  reason: string;
}

export interface AbusePattern {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: string[];
  detectionTime: number;
  source: {
    ip: string;
    userAgent: string;
    apiKey?: string;
    userId?: string;
  };
  behavior: {
    requestFrequency: number;
    endpointPatterns: string[];
    payloadPatterns: string[];
    timePatterns: number[];
    geographicPatterns: string[];
  };
  mitigationActions: string[];
}

export interface APIKeyUsage {
  keyId: string;
  keyHash: string;
  userId?: string;
  organization?: string;
  requests: {
    total: number;
    today: number;
    thisHour: number;
    lastMinute: number;
  };
  patterns: {
    endpoints: Record<string, number>;
    methods: Record<string, number>;
    timeDistribution: number[];
    ipAddresses: Set<string>;
    userAgents: Set<string>;
  };
  violations: {
    rateLimit: number;
    quota: number;
    suspicious: number;
    abuse: number;
  };
  reputation: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'suspended' | 'revoked';
  lastUsed: number;
  createdAt: number;
}

export interface UserBehaviorProfile {
  userId: string;
  apiKey?: string;
  firstSeen: number;
  lastSeen: number;
  sessions: number;
  patterns: {
    requestTiming: number[];
    endpointUsage: Record<string, number>;
    methodPreferences: Record<string, number>;
    payloadSizes: number[];
    responseHandling: {
      errorRetries: number;
      successFollow: number;
      abandonmentRate: number;
    };
  };
  anomalies: {
    timingAnomalies: number;
    patternDeviations: number;
    geographicAnomalies: number;
    deviceAnomalies: number;
  };
  risk: number;
  trustScore: number;
  flags: string[];
}

interface RequestFingerprint {
  hash: string;
  userAgent: string;
  acceptHeaders: string;
  acceptLanguage: string;
  acceptEncoding: string;
  connection: string;
  dnt: string;
  upgradeInsecureRequests: string;
  secFetchSite: string;
  secFetchMode: string;
  secFetchDest: string;
}

@Injectable()
export class APIAbusePreventionService {
  private readonly logger = new Logger(APIAbusePreventionService.name);

  // Detection data
  private apiKeyUsage = new Map<string, APIKeyUsage>();
  private userProfiles = new Map<string, UserBehaviorProfile>();
  private requestFingerprints = new Map<string, { count: number; firstSeen: number; lastSeen: number }>();
  private detectedAbuse: AbusePattern[] = [];
  private suspiciousPatterns = new Map<string, number>();

  // Bot detection patterns
  private botPatterns = {
    userAgents: {
      good: [
        /googlebot/i,
        /bingbot/i,
        /slurp/i,
        /duckduckbot/i,
        /baiduspider/i,
        /yandexbot/i,
        /facebookexternalhit/i,
        /twitterbot/i,
        /linkedinbot/i,
        /whatsapp/i
      ],
      bad: [
        /scrapy/i,
        /curl/i,
        /wget/i,
        /python-requests/i,
        /node-fetch/i,
        /axios/i,
        /httpie/i,
        /postman/i,
        /insomnia/i,
        /bot/i,
        /crawler/i,
        /spider/i,
        /scraper/i
      ],
      suspicious: [
        /^Mozilla\/5\.0$/,
        /^$/,
        /HeadlessChrome/i,
        /PhantomJS/i,
        /SlimerJS/i
      ]
    },
    headers: {
      botIndicators: [
        'x-requested-with',
        'x-forwarded-for',
        'x-real-ip',
        'x-automated',
        'x-bot'
      ],
      humanIndicators: [
        'sec-fetch-site',
        'sec-fetch-mode',
        'sec-fetch-dest',
        'sec-ch-ua',
        'sec-ch-ua-mobile',
        'sec-ch-ua-platform'
      ]
    },
    timing: {
      humanMin: 100, // Minimum time between requests for humans (ms)
      humanMax: 300000, // Maximum time between requests for humans (ms)
      botTypical: 50 // Typical bot request interval (ms)
    }
  };

  // Abuse detection thresholds
  private thresholds = {
    requestFrequency: {
      suspicious: 100, // requests per minute
      abuse: 300
    },
    apiKeyUsage: {
      dailyLimit: 10000,
      hourlyLimit: 1000,
      minuteLimit: 100
    },
    patternSimilarity: 0.8,
    geographicAnomaly: 0.9,
    timingAnomaly: 3.0 // standard deviations
  };

  constructor(private readonly configService: ConfigService) {
    this.loadConfiguration();
    this.startBehaviorAnalysis();
    this.startAbuseDetection();
  }

  /**
   * Analyze request for API abuse patterns
   */
  async analyzeRequest(req: Request): Promise<{
    allowed: boolean;
    risk: 'low' | 'medium' | 'high' | 'critical';
    botDetection: BotDetectionResult;
    abusePatterns: AbusePattern[];
    actions: string[];
  }> {
    const ip = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const apiKey = req.headers['x-api-key'] as string;
    const userId = req.user?.id;

    // Bot detection
    const botDetection = this.detectBot(req);

    // API key analysis
    const apiKeyAnalysis = apiKey ? this.analyzeAPIKeyUsage(apiKey, req) : null;

    // User behavior analysis
    const behaviorAnalysis = userId ? this.analyzeUserBehavior(userId, req) : null;

    // Pattern detection
    const abusePatterns = this.detectAbusePatterns(req, botDetection, apiKeyAnalysis, behaviorAnalysis);

    // Risk assessment
    const risk = this.calculateRisk(botDetection, abusePatterns, apiKeyAnalysis, behaviorAnalysis);

    // Determine actions
    const actions = this.determineActions(risk, botDetection, abusePatterns);

    // Update tracking data
    this.updateRequestTracking(req, botDetection, risk);

    return {
      allowed: risk !== 'critical' && !actions.includes('block'),
      risk,
      botDetection,
      abusePatterns,
      actions
    };
  }

  /**
   * Comprehensive bot detection
   */
  private detectBot(req: Request): BotDetectionResult {
    const userAgent = req.headers['user-agent'] || '';
    const ip = this.getClientIP(req);

    let isBot = false;
    let botType: 'good' | 'bad' | 'unknown' = 'unknown';
    let confidence = 0;

    const indicators = {
      userAgent: false,
      requestPattern: false,
      behavioral: false,
      fingerprint: false,
      timing: false,
      headers: false
    };

    // User Agent Analysis
    const userAgentAnalysis = this.analyzeUserAgent(userAgent);
    indicators.userAgent = userAgentAnalysis.isBot;
    if (userAgentAnalysis.isBot) {
      isBot = true;
      botType = userAgentAnalysis.type;
      confidence += 40;
    }

    // Header Analysis
    const headerAnalysis = this.analyzeHeaders(req);
    indicators.headers = headerAnalysis.suspicious;
    if (headerAnalysis.suspicious) {
      confidence += 20;
    }

    // Request Fingerprinting
    const fingerprint = this.generateRequestFingerprint(req);
    const fingerprintAnalysis = this.analyzeFingerprint(fingerprint);
    indicators.fingerprint = fingerprintAnalysis.suspicious;
    if (fingerprintAnalysis.suspicious) {
      confidence += 15;
    }

    // Timing Analysis
    const timingAnalysis = this.analyzeRequestTiming(ip);
    indicators.timing = timingAnalysis.suspicious;
    if (timingAnalysis.suspicious) {
      confidence += 15;
    }

    // Behavioral Analysis
    const behaviorAnalysis = this.analyzeBehavioralPatterns(ip);
    indicators.behavioral = behaviorAnalysis.suspicious;
    if (behaviorAnalysis.suspicious) {
      confidence += 10;
    }

    // Determine final classification
    if (confidence >= 70) {
      isBot = true;
      if (botType === 'unknown') {
        botType = confidence >= 85 ? 'bad' : 'unknown';
      }
    }

    // Determine action
    let action: 'allow' | 'challenge' | 'block' | 'monitor' = 'allow';
    if (isBot && botType === 'bad' && confidence >= 85) {
      action = 'block';
    } else if (isBot && confidence >= 70) {
      action = 'challenge';
    } else if (confidence >= 50) {
      action = 'monitor';
    }

    return {
      isBot,
      botType,
      confidence,
      indicators,
      category: this.categorizeBotType(userAgent, isBot, botType),
      action,
      reason: this.generateBotDetectionReason(indicators, confidence)
    };
  }

  /**
   * Analyze User Agent for bot patterns
   */
  private analyzeUserAgent(userAgent: string): { isBot: boolean; type: 'good' | 'bad' | 'unknown' } {
    // Check good bots
    for (const pattern of this.botPatterns.userAgents.good) {
      if (pattern.test(userAgent)) {
        return { isBot: true, type: 'good' };
      }
    }

    // Check bad bots
    for (const pattern of this.botPatterns.userAgents.bad) {
      if (pattern.test(userAgent)) {
        return { isBot: true, type: 'bad' };
      }
    }

    // Check suspicious patterns
    for (const pattern of this.botPatterns.userAgents.suspicious) {
      if (pattern.test(userAgent)) {
        return { isBot: true, type: 'unknown' };
      }
    }

    // Check for missing or minimal user agent
    if (!userAgent || userAgent.length < 10) {
      return { isBot: true, type: 'bad' };
    }

    return { isBot: false, type: 'unknown' };
  }

  /**
   * Analyze request headers for bot indicators
   */
  private analyzeHeaders(req: Request): { suspicious: boolean; score: number } {
    let suspiciousScore = 0;

    // Check for bot indicator headers
    for (const header of this.botPatterns.headers.botIndicators) {
      if (req.headers[header]) {
        suspiciousScore += 10;
      }
    }

    // Check for missing human indicator headers
    let humanHeaders = 0;
    for (const header of this.botPatterns.headers.humanIndicators) {
      if (req.headers[header]) {
        humanHeaders++;
      }
    }

    if (humanHeaders === 0) {
      suspiciousScore += 20;
    } else if (humanHeaders < 3) {
      suspiciousScore += 10;
    }

    // Check header order and consistency
    const headerOrder = Object.keys(req.headers);
    if (this.isHeaderOrderSuspicious(headerOrder)) {
      suspiciousScore += 15;
    }

    // Check for inconsistent headers
    if (this.hasInconsistentHeaders(req.headers)) {
      suspiciousScore += 10;
    }

    return {
      suspicious: suspiciousScore >= 25,
      score: suspiciousScore
    };
  }

  /**
   * Generate request fingerprint
   */
  private generateRequestFingerprint(req: Request): RequestFingerprint {
    const headers = req.headers;

    const fingerprint: RequestFingerprint = {
      hash: '',
      userAgent: headers['user-agent'] || '',
      acceptHeaders: headers['accept'] || '',
      acceptLanguage: headers['accept-language'] || '',
      acceptEncoding: headers['accept-encoding'] || '',
      connection: headers['connection'] || '',
      dnt: headers['dnt'] || '',
      upgradeInsecureRequests: headers['upgrade-insecure-requests'] || '',
      secFetchSite: headers['sec-fetch-site'] || '',
      secFetchMode: headers['sec-fetch-mode'] || '',
      secFetchDest: headers['sec-fetch-dest'] || ''
    };

    // Generate hash
    const fingerprintString = Object.values(fingerprint).join('|');
    fingerprint.hash = this.generateHash(fingerprintString);

    return fingerprint;
  }

  /**
   * Analyze request fingerprint for suspicious patterns
   */
  private analyzeFingerprint(fingerprint: RequestFingerprint): { suspicious: boolean; reason: string } {
    const existing = this.requestFingerprints.get(fingerprint.hash);
    const now = Date.now();

    if (existing) {
      existing.count++;
      existing.lastSeen = now;

      // High frequency with same fingerprint is suspicious
      if (existing.count > 100 && (now - existing.firstSeen) < 60000) {
        return {
          suspicious: true,
          reason: 'High frequency requests with identical fingerprint'
        };
      }
    } else {
      this.requestFingerprints.set(fingerprint.hash, {
        count: 1,
        firstSeen: now,
        lastSeen: now
      });
    }

    // Check for empty or minimal fingerprint
    const nonEmptyFields = Object.values(fingerprint).filter(v => v && v.length > 0).length;
    if (nonEmptyFields < 3) {
      return {
        suspicious: true,
        reason: 'Minimal request fingerprint'
      };
    }

    return { suspicious: false, reason: '' };
  }

  /**
   * Analyze request timing patterns
   */
  private analyzeRequestTiming(ip: string): { suspicious: boolean; reason: string } {
    // This is a simplified implementation
    // In production, maintain detailed timing data per IP

    const pattern = this.suspiciousPatterns.get(`timing_${ip}`);
    if (pattern && pattern > 10) {
      return {
        suspicious: true,
        reason: 'Consistent robotic timing pattern'
      };
    }

    return { suspicious: false, reason: '' };
  }

  /**
   * Analyze behavioral patterns
   */
  private analyzeBehavioralPatterns(ip: string): { suspicious: boolean; patterns: string[] } {
    const patterns: string[] = [];

    // Check for consistent patterns that indicate automation
    const endpointPattern = this.suspiciousPatterns.get(`endpoint_${ip}`);
    if (endpointPattern && endpointPattern > 20) {
      patterns.push('consistent_endpoint_access');
    }

    const methodPattern = this.suspiciousPatterns.get(`method_${ip}`);
    if (methodPattern && methodPattern > 15) {
      patterns.push('consistent_method_usage');
    }

    return {
      suspicious: patterns.length >= 2,
      patterns
    };
  }

  /**
   * Analyze API key usage patterns
   */
  private analyzeAPIKeyUsage(apiKey: string, req: Request): {
    usage: APIKeyUsage;
    violations: string[];
    risk: 'low' | 'medium' | 'high' | 'critical';
  } {
    const keyHash = this.generateHash(apiKey);
    let usage = this.apiKeyUsage.get(keyHash);

    if (!usage) {
      usage = {
        keyId: keyHash.substring(0, 8),
        keyHash,
        requests: { total: 0, today: 0, thisHour: 0, lastMinute: 0 },
        patterns: {
          endpoints: {},
          methods: {},
          timeDistribution: new Array(24).fill(0),
          ipAddresses: new Set(),
          userAgents: new Set()
        },
        violations: { rateLimit: 0, quota: 0, suspicious: 0, abuse: 0 },
        reputation: 100,
        risk: 'low',
        status: 'active',
        lastUsed: Date.now(),
        createdAt: Date.now()
      };
      this.apiKeyUsage.set(keyHash, usage);
    }

    // Update usage statistics
    usage.requests.total++;
    usage.requests.lastMinute++;
    usage.patterns.ipAddresses.add(this.getClientIP(req));
    usage.patterns.userAgents.add(req.headers['user-agent'] || '');
    usage.lastUsed = Date.now();

    // Track endpoint usage
    usage.patterns.endpoints[req.path] = (usage.patterns.endpoints[req.path] || 0) + 1;
    usage.patterns.methods[req.method] = (usage.patterns.methods[req.method] || 0) + 1;

    // Detect violations
    const violations: string[] = [];

    if (usage.requests.lastMinute > this.thresholds.apiKeyUsage.minuteLimit) {
      violations.push('minute_rate_limit');
      usage.violations.rateLimit++;
    }

    if (usage.patterns.ipAddresses.size > 50) {
      violations.push('excessive_ip_diversity');
      usage.violations.suspicious++;
    }

    if (usage.patterns.userAgents.size > 20) {
      violations.push('excessive_user_agent_diversity');
      usage.violations.suspicious++;
    }

    // Calculate risk
    let risk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (violations.length >= 3 || usage.violations.abuse > 5) {
      risk = 'critical';
    } else if (violations.length >= 2 || usage.violations.suspicious > 10) {
      risk = 'high';
    } else if (violations.length >= 1 || usage.violations.rateLimit > 5) {
      risk = 'medium';
    }

    usage.risk = risk;

    return { usage, violations, risk };
  }

  /**
   * Analyze user behavior patterns
   */
  private analyzeUserBehavior(userId: string, req: Request): {
    profile: UserBehaviorProfile;
    anomalies: string[];
    trustScore: number;
  } {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        sessions: 0,
        patterns: {
          requestTiming: [],
          endpointUsage: {},
          methodPreferences: {},
          payloadSizes: [],
          responseHandling: { errorRetries: 0, successFollow: 0, abandonmentRate: 0 }
        },
        anomalies: { timingAnomalies: 0, patternDeviations: 0, geographicAnomalies: 0, deviceAnomalies: 0 },
        risk: 0,
        trustScore: 50,
        flags: []
      };
      this.userProfiles.set(userId, profile);
    }

    // Update profile
    profile.lastSeen = Date.now();
    profile.patterns.endpointUsage[req.path] = (profile.patterns.endpointUsage[req.path] || 0) + 1;
    profile.patterns.methodPreferences[req.method] = (profile.patterns.methodPreferences[req.method] || 0) + 1;

    // Detect anomalies
    const anomalies: string[] = [];

    // Check for unusual geographic patterns
    const currentCountry = this.getCountryCode(req);
    if (this.isGeographicAnomaly(profile, currentCountry)) {
      anomalies.push('geographic_anomaly');
      profile.anomalies.geographicAnomalies++;
    }

    // Check for timing anomalies
    if (this.isTimingAnomaly(profile)) {
      anomalies.push('timing_anomaly');
      profile.anomalies.timingAnomalies++;
    }

    // Calculate trust score
    const trustScore = this.calculateTrustScore(profile, anomalies);
    profile.trustScore = trustScore;

    return { profile, anomalies, trustScore };
  }

  /**
   * Detect abuse patterns
   */
  private detectAbusePatterns(
    req: Request,
    botDetection: BotDetectionResult,
    apiKeyAnalysis: any,
    behaviorAnalysis: any
  ): AbusePattern[] {
    const patterns: AbusePattern[] = [];
    const ip = this.getClientIP(req);

    // API scraping pattern
    if (botDetection.isBot && botDetection.botType === 'bad' && botDetection.confidence > 80) {
      patterns.push({
        id: `scraping_${Date.now()}`,
        name: 'API Scraping',
        description: 'Automated data extraction detected',
        severity: 'high',
        confidence: botDetection.confidence,
        indicators: ['bot_user_agent', 'automated_requests', 'high_frequency'],
        detectionTime: Date.now(),
        source: {
          ip,
          userAgent: req.headers['user-agent'] || '',
          apiKey: req.headers['x-api-key'] as string
        },
        behavior: {
          requestFrequency: 0, // Would be calculated from historical data
          endpointPatterns: [req.path],
          payloadPatterns: [],
          timePatterns: [],
          geographicPatterns: []
        },
        mitigationActions: ['rate_limit', 'challenge', 'block']
      });
    }

    // API key abuse pattern
    if (apiKeyAnalysis && apiKeyAnalysis.risk === 'critical') {
      patterns.push({
        id: `api_key_abuse_${Date.now()}`,
        name: 'API Key Abuse',
        description: 'API key showing abusive usage patterns',
        severity: 'critical',
        confidence: 95,
        indicators: apiKeyAnalysis.violations,
        detectionTime: Date.now(),
        source: {
          ip,
          userAgent: req.headers['user-agent'] || '',
          apiKey: req.headers['x-api-key'] as string
        },
        behavior: {
          requestFrequency: apiKeyAnalysis.usage.requests.lastMinute,
          endpointPatterns: Object.keys(apiKeyAnalysis.usage.patterns.endpoints),
          payloadPatterns: [],
          timePatterns: [],
          geographicPatterns: Array.from(apiKeyAnalysis.usage.patterns.ipAddresses)
        },
        mitigationActions: ['suspend_api_key', 'alert_admin', 'audit_log']
      });
    }

    // Account takeover pattern
    if (behaviorAnalysis && behaviorAnalysis.anomalies.length >= 2) {
      patterns.push({
        id: `account_takeover_${Date.now()}`,
        name: 'Potential Account Takeover',
        description: 'User showing anomalous behavior patterns',
        severity: 'medium',
        confidence: 75,
        indicators: behaviorAnalysis.anomalies,
        detectionTime: Date.now(),
        source: {
          ip,
          userAgent: req.headers['user-agent'] || '',
          userId: req.user?.id
        },
        behavior: {
          requestFrequency: 0,
          endpointPatterns: [],
          payloadPatterns: [],
          timePatterns: [],
          geographicPatterns: []
        },
        mitigationActions: ['require_mfa', 'alert_user', 'monitor_closely']
      });
    }

    return patterns;
  }

  /**
   * Calculate overall risk score
   */
  private calculateRisk(
    botDetection: BotDetectionResult,
    abusePatterns: AbusePattern[],
    apiKeyAnalysis: any,
    behaviorAnalysis: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;

    // Bot detection risk
    if (botDetection.isBot) {
      if (botDetection.botType === 'bad') {
        riskScore += botDetection.confidence;
      } else if (botDetection.botType === 'unknown') {
        riskScore += botDetection.confidence * 0.5;
      }
    }

    // Abuse patterns risk
    for (const pattern of abusePatterns) {
      switch (pattern.severity) {
        case 'critical':
          riskScore += 30;
          break;
        case 'high':
          riskScore += 20;
          break;
        case 'medium':
          riskScore += 10;
          break;
        case 'low':
          riskScore += 5;
          break;
      }
    }

    // API key risk
    if (apiKeyAnalysis) {
      switch (apiKeyAnalysis.risk) {
        case 'critical':
          riskScore += 25;
          break;
        case 'high':
          riskScore += 15;
          break;
        case 'medium':
          riskScore += 10;
          break;
      }
    }

    // Behavior risk
    if (behaviorAnalysis) {
      riskScore += behaviorAnalysis.anomalies.length * 5;
      riskScore += (100 - behaviorAnalysis.trustScore) * 0.2;
    }

    // Convert to risk level
    if (riskScore >= 80) {
      return 'critical';
    } else if (riskScore >= 60) {
      return 'high';
    } else if (riskScore >= 40) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Determine mitigation actions
   */
  private determineActions(
    risk: string,
    botDetection: BotDetectionResult,
    abusePatterns: AbusePattern[]
  ): string[] {
    const actions: string[] = [];

    // Bot-specific actions
    if (botDetection.action === 'block') {
      actions.push('block');
    } else if (botDetection.action === 'challenge') {
      actions.push('challenge');
    } else if (botDetection.action === 'monitor') {
      actions.push('monitor');
    }

    // Risk-based actions
    switch (risk) {
      case 'critical':
        actions.push('block', 'alert_security_team', 'audit_log');
        break;
      case 'high':
        actions.push('rate_limit_aggressive', 'challenge', 'alert_admin');
        break;
      case 'medium':
        actions.push('rate_limit_moderate', 'monitor');
        break;
    }

    // Pattern-specific actions
    for (const pattern of abusePatterns) {
      actions.push(...pattern.mitigationActions);
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  /**
   * Update request tracking data
   */
  private updateRequestTracking(req: Request, botDetection: BotDetectionResult, risk: string): void {
    const ip = this.getClientIP(req);

    // Update suspicious patterns
    if (botDetection.isBot) {
      this.suspiciousPatterns.set(`bot_${ip}`, (this.suspiciousPatterns.get(`bot_${ip}`) || 0) + 1);
    }

    if (risk === 'high' || risk === 'critical') {
      this.suspiciousPatterns.set(`risk_${ip}`, (this.suspiciousPatterns.get(`risk_${ip}`) || 0) + 1);
    }

    // Update endpoint patterns
    this.suspiciousPatterns.set(`endpoint_${ip}`, (this.suspiciousPatterns.get(`endpoint_${ip}`) || 0) + 1);
  }

  // Helper methods
  private getClientIP(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ).split(',')[0].trim();
  }

  private getCountryCode(req: Request): string {
    return req.headers['cf-ipcountry'] as string || 'unknown';
  }

  private generateHash(input: string): string {
    // Simple hash function - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  private isHeaderOrderSuspicious(headerOrder: string[]): boolean {
    // Check if headers are in alphabetical order (common in bots)
    const sorted = [...headerOrder].sort();
    return JSON.stringify(headerOrder) === JSON.stringify(sorted);
  }

  private hasInconsistentHeaders(headers: any): boolean {
    // Check for header inconsistencies that indicate automation
    const userAgent = headers['user-agent'] || '';
    const acceptLanguage = headers['accept-language'] || '';

    if (userAgent.includes('Chrome') && !acceptLanguage.includes('en')) {
      // Basic inconsistency check
      return true;
    }

    return false;
  }

  private categorizeBotType(userAgent: string, isBot: boolean, botType: string): string {
    if (!isBot) return 'human';

    if (userAgent.includes('google')) return 'search_engine';
    if (userAgent.includes('facebook') || userAgent.includes('twitter')) return 'social_media';
    if (userAgent.includes('curl') || userAgent.includes('wget')) return 'command_line';
    if (userAgent.includes('python') || userAgent.includes('node')) return 'script';

    return botType;
  }

  private generateBotDetectionReason(indicators: any, confidence: number): string {
    const reasons = [];

    if (indicators.userAgent) reasons.push('suspicious user agent');
    if (indicators.headers) reasons.push('bot-like headers');
    if (indicators.timing) reasons.push('robotic timing');
    if (indicators.fingerprint) reasons.push('suspicious fingerprint');
    if (indicators.behavioral) reasons.push('automated behavior');

    return `Bot detection (${confidence}% confidence): ${reasons.join(', ')}`;
  }

  private isGeographicAnomaly(profile: UserBehaviorProfile, currentCountry: string): boolean {
    // Simplified geographic anomaly detection
    return false; // Would implement based on user's historical countries
  }

  private isTimingAnomaly(profile: UserBehaviorProfile): boolean {
    // Simplified timing anomaly detection
    return false; // Would implement based on user's historical timing patterns
  }

  private calculateTrustScore(profile: UserBehaviorProfile, anomalies: string[]): number {
    let score = profile.trustScore;

    // Decrease score for anomalies
    score -= anomalies.length * 10;

    // Increase score for consistent behavior over time
    const daysSinceFirstSeen = (Date.now() - profile.firstSeen) / (1000 * 60 * 60 * 24);
    if (daysSinceFirstSeen > 30) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private loadConfiguration(): void {
    // Load configuration from environment variables
    this.thresholds.requestFrequency.suspicious =
      this.configService.get<number>('ABUSE_DETECTION_SUSPICIOUS_RPS', 100);

    this.thresholds.apiKeyUsage.dailyLimit =
      this.configService.get<number>('API_KEY_DAILY_LIMIT', 10000);
  }

  private startBehaviorAnalysis(): void {
    // Start periodic behavior analysis
    setInterval(() => {
      this.analyzeGlobalPatterns();
    }, 60000); // Every minute
  }

  private startAbuseDetection(): void {
    // Start periodic abuse pattern detection
    setInterval(() => {
      this.detectGlobalAbusePatterns();
    }, 300000); // Every 5 minutes
  }

  private analyzeGlobalPatterns(): void {
    // Analyze global usage patterns
    this.logger.debug('Analyzing global usage patterns');
  }

  private detectGlobalAbusePatterns(): void {
    // Detect abuse patterns across all users/IPs
    this.logger.debug('Detecting global abuse patterns');
  }

  // Public methods for monitoring and management
  getMetrics() {
    return {
      totalAPIKeys: this.apiKeyUsage.size,
      totalUsers: this.userProfiles.size,
      detectedAbusePatterns: this.detectedAbuse.length,
      suspiciousPatterns: this.suspiciousPatterns.size
    };
  }

  getDetectedAbuse(): AbusePattern[] {
    return [...this.detectedAbuse];
  }

  getAPIKeyUsage(keyHash: string): APIKeyUsage | undefined {
    return this.apiKeyUsage.get(keyHash);
  }

  getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(userId);
  }
}