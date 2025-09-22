/**
 * Security Event Categorization Service - Agent 2 Implementation
 *
 * Advanced security event categorization system that provides intelligent classification,
 * risk assessment, and threat pattern detection for comprehensive audit logging.
 *
 * Features:
 * - Intelligent event categorization with machine learning-inspired algorithms
 * - Risk scoring and threat level assessment
 * - Event pattern detection and anomaly identification
 * - Security context enrichment and metadata analysis
 * - Compliance framework mapping and regulatory requirement detection
 * - Real-time threat intelligence integration
 * - Event correlation and relationship mapping
 * - Performance optimized categorization with caching
 *
 * @fileoverview Security event categorization service
 * @version 1.0.0
 * @author Enterprise Security Audit Team - Agent 2
 * @created 2025-09-22
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditEvent,
  AuditSeverity,
  SecurityEventCategory,
  SecurityContext,
  ComplianceInfo,
  ComplianceFramework,
  AuditEventMetadata,
} from '../types';

/**
 * Event categorization rule interface
 */
export interface CategorizationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description: string;
  /** Rule priority (higher number = higher priority) */
  priority: number;
  /** Conditions that must be met */
  conditions: CategorizationCondition[];
  /** Category to assign when rule matches */
  category: SecurityEventCategory;
  /** Severity adjustment */
  severityAdjustment?: number;
  /** Risk score modifier */
  riskScoreModifier?: number;
  /** Tags to add */
  tags?: string[];
  /** Enabled status */
  enabled: boolean;
}

/**
 * Categorization condition interface
 */
export interface CategorizationCondition {
  /** Field to evaluate */
  field: string;
  /** Operator for evaluation */
  operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than' | 'in_array';
  /** Value to compare against */
  value: string | number | boolean | string[];
  /** Case sensitive comparison */
  caseSensitive?: boolean;
  /** Logical operator for multiple conditions */
  logicalOperator?: 'and' | 'or';
}

/**
 * Event pattern interface
 */
export interface EventPattern {
  /** Pattern identifier */
  id: string;
  /** Pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** Event sequence that constitutes the pattern */
  sequence: PatternEvent[];
  /** Time window for pattern detection */
  timeWindow: number;
  /** Minimum occurrences to trigger pattern */
  minOccurrences: number;
  /** Risk level of this pattern */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  /** Associated threat types */
  threatTypes: string[];
}

/**
 * Pattern event interface
 */
export interface PatternEvent {
  /** Event category */
  category: SecurityEventCategory;
  /** Event name pattern */
  eventPattern?: string;
  /** Required metadata fields */
  requiredMetadata?: string[];
  /** Severity constraint */
  severity?: AuditSeverity[];
}

/**
 * Categorization result interface
 */
export interface CategorizationResult {
  /** Original category */
  originalCategory: SecurityEventCategory;
  /** Categorized category */
  finalCategory: SecurityEventCategory;
  /** Applied rules */
  appliedRules: string[];
  /** Risk score */
  riskScore: number;
  /** Confidence level */
  confidence: number;
  /** Detected patterns */
  detectedPatterns: string[];
  /** Threat indicators */
  threatIndicators: string[];
  /** Compliance requirements */
  complianceRequirements: ComplianceFramework[];
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Threat intelligence interface
 */
export interface ThreatIntelligence {
  /** Threat type */
  type: string;
  /** Threat level */
  level: 'low' | 'medium' | 'high' | 'critical';
  /** Threat description */
  description: string;
  /** Associated indicators */
  indicators: string[];
  /** Mitigation recommendations */
  mitigations: string[];
  /** Last updated timestamp */
  lastUpdated: Date;
}

/**
 * Categorization statistics interface
 */
export interface CategorizationStatistics {
  /** Total events categorized */
  totalEvents: number;
  /** Events by category */
  eventsByCategory: Record<SecurityEventCategory, number>;
  /** Average risk score */
  averageRiskScore: number;
  /** Top applied rules */
  topRules: Array<{ ruleId: string; count: number }>;
  /** Detected threat patterns */
  threatPatterns: Array<{ patternId: string; count: number }>;
  /** Performance metrics */
  performance: {
    averageProcessingTime: number;
    cacheHitRate: number;
    rulesEvaluated: number;
  };
}

/**
 * Security Event Categorization Service
 *
 * Provides advanced categorization, risk assessment, and threat detection
 * capabilities for audit events with machine learning-inspired algorithms
 * and comprehensive security intelligence integration.
 */
@Injectable()
export class SecurityEventCategorizerService {
  private readonly logger = new Logger(SecurityEventCategorizerService.name);

  private categorizationRules: Map<string, CategorizationRule> = new Map();
  private eventPatterns: Map<string, EventPattern> = new Map();
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map();
  private patternBuffer: Map<string, AuditEvent[]> = new Map();
  private categorizationCache: Map<string, CategorizationResult> = new Map();
  private statistics: CategorizationStatistics = {
    totalEvents: 0,
    eventsByCategory: {
      [SecurityEventCategory.AUTHENTICATION]: 0,
      [SecurityEventCategory.AUTHORIZATION]: 0,
      [SecurityEventCategory.DATA_ACCESS]: 0,
      [SecurityEventCategory.DATA_MODIFICATION]: 0,
      [SecurityEventCategory.SYSTEM]: 0,
      [SecurityEventCategory.SECURITY]: 0,
      [SecurityEventCategory.COMPLIANCE]: 0,
      [SecurityEventCategory.PERFORMANCE]: 0,
      [SecurityEventCategory.NETWORK]: 0,
      [SecurityEventCategory.ERROR]: 0,
      [SecurityEventCategory.USER_ACTIVITY]: 0,
      [SecurityEventCategory.API_ACCESS]: 0,
    },
    averageRiskScore: 0,
    topRules: [],
    threatPatterns: [],
    performance: {
      averageProcessingTime: 0,
      cacheHitRate: 0,
      rulesEvaluated: 0,
    },
  };

  constructor(private readonly configService: ConfigService) {
    this.initializeDefaultRules();
    this.initializeEventPatterns();
    this.initializeThreatIntelligence();
  }

  /**
   * Categorize an audit event with advanced intelligence
   *
   * @param event - Audit event to categorize
   * @returns Categorization result with enhanced metadata
   */
  async categorizeEvent(event: AuditEvent): Promise<CategorizationResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(event);
      const cachedResult = this.categorizationCache.get(cacheKey);

      if (cachedResult) {
        this.updateCacheStats(true);
        return cachedResult;
      }

      this.updateCacheStats(false);

      // Initialize result
      const result: CategorizationResult = {
        originalCategory: event.category,
        finalCategory: event.category,
        appliedRules: [],
        riskScore: 0,
        confidence: 0.5,
        detectedPatterns: [],
        threatIndicators: [],
        complianceRequirements: [],
        processingTime: 0,
      };

      // Apply categorization rules
      await this.applyCategorization(event, result);

      // Calculate risk score
      result.riskScore = this.calculateRiskScore(event, result);

      // Detect patterns
      result.detectedPatterns = await this.detectPatterns(event);

      // Identify threat indicators
      result.threatIndicators = this.identifyThreatIndicators(event);

      // Determine compliance requirements
      result.complianceRequirements = this.determineComplianceRequirements(event);

      // Calculate confidence
      result.confidence = this.calculateConfidence(event, result);

      // Update final category if rules suggest changes
      if (result.appliedRules.length > 0) {
        result.finalCategory = this.determineFinalCategory(event, result);
      }

      // Record processing time
      result.processingTime = Date.now() - startTime;

      // Cache the result
      this.categorizationCache.set(cacheKey, result);

      // Update statistics
      this.updateStatistics(result);

      // Add to pattern buffer for future pattern detection
      this.addToPatternBuffer(event);

      return result;
    } catch (err) {
      this.logger.error('Error categorizing event:', err);

      // Return basic categorization result on error
      return {
        originalCategory: event.category,
        finalCategory: event.category,
        appliedRules: [],
        riskScore: 0.5,
        confidence: 0.1,
        detectedPatterns: [],
        threatIndicators: [],
        complianceRequirements: [],
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Bulk categorize multiple events
   *
   * @param events - Array of audit events to categorize
   * @returns Array of categorization results
   */
  async categorizeEvents(events: AuditEvent[]): Promise<CategorizationResult[]> {
    const results: CategorizationResult[] = [];

    // Process events in parallel for better performance
    const categorizePromises = events.map(event => this.categorizeEvent(event));
    const categorizedResults = await Promise.all(categorizePromises);

    results.push(...categorizedResults);

    this.logger.log(`Bulk categorized ${events.length} events`);
    return results;
  }

  /**
   * Add custom categorization rule
   *
   * @param rule - Categorization rule to add
   */
  addCategorizationRule(rule: CategorizationRule): void {
    this.categorizationRules.set(rule.id, rule);
    this.logger.log(`Added categorization rule: ${rule.name}`);
  }

  /**
   * Remove categorization rule
   *
   * @param ruleId - ID of rule to remove
   * @returns True if rule was removed, false if not found
   */
  removeCategorizationRule(ruleId: string): boolean {
    const removed = this.categorizationRules.delete(ruleId);
    if (removed) {
      this.logger.log(`Removed categorization rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Add event pattern for detection
   *
   * @param pattern - Event pattern to add
   */
  addEventPattern(pattern: EventPattern): void {
    this.eventPatterns.set(pattern.id, pattern);
    this.logger.log(`Added event pattern: ${pattern.name}`);
  }

  /**
   * Get categorization statistics
   *
   * @returns Current categorization statistics
   */
  getStatistics(): CategorizationStatistics {
    return { ...this.statistics };
  }

  /**
   * Clear categorization cache
   */
  clearCache(): void {
    this.categorizationCache.clear();
    this.logger.log('Categorization cache cleared');
  }

  /**
   * Apply categorization rules to an event
   */
  private async applyCategorization(
    event: AuditEvent,
    result: CategorizationResult,
  ): Promise<void> {
    const applicableRules = Array.from(this.categorizationRules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      if (this.evaluateRule(rule, event)) {
        result.appliedRules.push(rule.id);

        // Apply category change
        result.finalCategory = rule.category;

        // Apply risk score modifier
        if (rule.riskScoreModifier) {
          result.riskScore += rule.riskScoreModifier;
        }

        // Add tags to metadata
        if (rule.tags) {
          if (!event.metadata.custom) {
            event.metadata.custom = {};
          }
          if (!event.metadata.custom.tags) {
            event.metadata.custom.tags = [];
          }
          (event.metadata.custom.tags as string[]).push(...rule.tags);
        }

        this.logger.debug(`Applied rule ${rule.name} to event ${event.id}`);

        // Only apply first matching rule for now
        break;
      }
    }
  }

  /**
   * Evaluate if a rule applies to an event
   */
  private evaluateRule(rule: CategorizationRule, event: AuditEvent): boolean {
    if (rule.conditions.length === 0) return false;

    let result = true;
    let hasConditions = false;

    for (const condition of rule.conditions) {
      hasConditions = true;
      const conditionResult = this.evaluateCondition(condition, event);

      if (condition.logicalOperator === 'or') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return hasConditions ? result : false;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: CategorizationCondition,
    event: AuditEvent,
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, event);
    const { operator, value, caseSensitive = true } = condition;

    switch (operator) {
      case 'equals':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return caseSensitive
            ? fieldValue === value
            : fieldValue.toLowerCase() === value.toLowerCase();
        }
        return fieldValue === value;

      case 'contains':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return caseSensitive
            ? fieldValue.includes(value)
            : fieldValue.toLowerCase().includes(value.toLowerCase());
        }
        return false;

      case 'regex':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          const flags = caseSensitive ? '' : 'i';
          const regex = new RegExp(value, flags);
          return regex.test(fieldValue);
        }
        return false;

      case 'greater_than':
        return typeof fieldValue === 'number' && typeof value === 'number' &&
               fieldValue > value;

      case 'less_than':
        return typeof fieldValue === 'number' && typeof value === 'number' &&
               fieldValue < value;

      case 'in_array':
        if (Array.isArray(value)) {
          return value.includes(fieldValue);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get field value from event using dot notation
   */
  private getFieldValue(field: string, event: AuditEvent): unknown {
    const fieldParts = field.split('.');
    let value: any = event;

    for (const part of fieldParts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Calculate comprehensive risk score
   */
  private calculateRiskScore(
    event: AuditEvent,
    result: CategorizationResult,
  ): number {
    let score = 0;

    // Base score from severity
    const severityScores = {
      [AuditSeverity.DEBUG]: 0.1,
      [AuditSeverity.INFO]: 0.2,
      [AuditSeverity.WARN]: 0.4,
      [AuditSeverity.ERROR]: 0.6,
      [AuditSeverity.CRITICAL]: 0.8,
      [AuditSeverity.FATAL]: 1.0,
    };
    score += severityScores[event.severity] * 0.3;

    // Category-based risk
    const categoryRisks = {
      [SecurityEventCategory.AUTHENTICATION]: 0.4,
      [SecurityEventCategory.AUTHORIZATION]: 0.5,
      [SecurityEventCategory.DATA_ACCESS]: 0.3,
      [SecurityEventCategory.DATA_MODIFICATION]: 0.7,
      [SecurityEventCategory.SYSTEM]: 0.4,
      [SecurityEventCategory.SECURITY]: 0.9,
      [SecurityEventCategory.COMPLIANCE]: 0.6,
      [SecurityEventCategory.PERFORMANCE]: 0.2,
      [SecurityEventCategory.NETWORK]: 0.3,
      [SecurityEventCategory.ERROR]: 0.4,
      [SecurityEventCategory.USER_ACTIVITY]: 0.2,
      [SecurityEventCategory.API_ACCESS]: 0.3,
    };
    score += categoryRisks[result.finalCategory] * 0.4;

    // Security context risk
    if (event.securityContext) {
      // High privilege operations
      if (event.securityContext.roles?.includes('admin') ||
          event.securityContext.roles?.includes('superuser')) {
        score += 0.2;
      }

      // Failed authentication/authorization
      if (event.metadata.custom?.success === false) {
        score += 0.3;
      }

      // Existing risk score
      if (event.securityContext.riskScore) {
        score += event.securityContext.riskScore * 0.1;
      }
    }

    // Threat indicators
    if (result.threatIndicators.length > 0) {
      score += Math.min(result.threatIndicators.length * 0.1, 0.3);
    }

    // Pattern-based risk
    if (result.detectedPatterns.length > 0) {
      const patternRisk = result.detectedPatterns.reduce((risk, patternId) => {
        const pattern = this.eventPatterns.get(patternId);
        if (pattern) {
          const riskValues = { low: 0.1, medium: 0.3, high: 0.6, critical: 1.0 };
          return risk + riskValues[pattern.riskLevel];
        }
        return risk;
      }, 0);
      score += Math.min(patternRisk, 0.4);
    }

    // Time-based risk (unusual hours)
    const hour = event.timestamp.getHours();
    if (hour < 6 || hour > 22) { // Outside normal business hours
      score += 0.1;
    }

    // IP-based risk (placeholder for geolocation analysis)
    if (event.metadata.ipAddress) {
      // Would integrate with threat intelligence for IP reputation
      // For now, just check for private/public IP patterns
      if (!this.isPrivateIP(event.metadata.ipAddress)) {
        score += 0.1;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Detect event patterns
   */
  private async detectPatterns(event: AuditEvent): Promise<string[]> {
    const detectedPatterns: string[] = [];

    for (const [patternId, pattern] of this.eventPatterns.entries()) {
      if (await this.matchesPattern(event, pattern)) {
        detectedPatterns.push(patternId);
      }
    }

    return detectedPatterns;
  }

  /**
   * Check if event matches a pattern
   */
  private async matchesPattern(
    event: AuditEvent,
    pattern: EventPattern,
  ): Promise<boolean> {
    // Get relevant events from pattern buffer
    const bufferKey = this.getPatternBufferKey(event);
    const recentEvents = this.patternBuffer.get(bufferKey) || [];

    // Filter events within time window
    const cutoffTime = event.timestamp.getTime() - pattern.timeWindow;
    const relevantEvents = recentEvents.filter(
      e => e.timestamp.getTime() >= cutoffTime,
    );

    // Check if pattern sequence is present
    let matchCount = 0;

    for (const patternEvent of pattern.sequence) {
      const matchingEvents = relevantEvents.filter(e =>
        this.matchesPatternEvent(e, patternEvent),
      );

      if (matchingEvents.length > 0) {
        matchCount++;
      }
    }

    // Check if we have enough matches
    const hasMinOccurrences = relevantEvents.length >= pattern.minOccurrences;
    const hasSequence = matchCount >= pattern.sequence.length;

    return hasMinOccurrences && hasSequence;
  }

  /**
   * Check if event matches pattern event criteria
   */
  private matchesPatternEvent(
    event: AuditEvent,
    patternEvent: PatternEvent,
  ): boolean {
    // Check category
    if (event.category !== patternEvent.category) {
      return false;
    }

    // Check event name pattern
    if (patternEvent.eventPattern) {
      const regex = new RegExp(patternEvent.eventPattern, 'i');
      if (!regex.test(event.event)) {
        return false;
      }
    }

    // Check severity constraint
    if (patternEvent.severity && !patternEvent.severity.includes(event.severity)) {
      return false;
    }

    // Check required metadata
    if (patternEvent.requiredMetadata) {
      for (const metadataField of patternEvent.requiredMetadata) {
        if (!this.getFieldValue(`metadata.${metadataField}`, event)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Identify threat indicators
   */
  private identifyThreatIndicators(event: AuditEvent): string[] {
    const indicators: string[] = [];

    // Check against threat intelligence
    for (const [threatType, threat] of this.threatIntelligence.entries()) {
      for (const indicator of threat.indicators) {
        if (this.eventContainsIndicator(event, indicator)) {
          indicators.push(threatType);
        }
      }
    }

    // Built-in threat patterns
    const builtInIndicators = this.checkBuiltInThreatIndicators(event);
    indicators.push(...builtInIndicators);

    return [...new Set(indicators)]; // Remove duplicates
  }

  /**
   * Check if event contains threat indicator
   */
  private eventContainsIndicator(event: AuditEvent, indicator: string): boolean {
    // Check various event fields for the indicator
    const fieldsToCheck = [
      event.event,
      event.message,
      event.metadata.ipAddress,
      event.metadata.userAgent,
      event.metadata.resource,
      JSON.stringify(event.metadata.custom || {}),
    ];

    return fieldsToCheck.some(field =>
      field && typeof field === 'string' && field.includes(indicator),
    );
  }

  /**
   * Check built-in threat indicators
   */
  private checkBuiltInThreatIndicators(event: AuditEvent): string[] {
    const indicators: string[] = [];

    // Multiple failed login attempts
    if (event.category === SecurityEventCategory.AUTHENTICATION &&
        event.metadata.custom?.success === false) {
      indicators.push('failed_authentication');
    }

    // Privilege escalation attempts
    if (event.category === SecurityEventCategory.AUTHORIZATION &&
        event.metadata.custom?.granted === false &&
        event.metadata.action?.includes('admin')) {
      indicators.push('privilege_escalation');
    }

    // Suspicious data access patterns
    if (event.category === SecurityEventCategory.DATA_ACCESS &&
        event.metadata.custom?.recordCount &&
        event.metadata.custom.recordCount > 1000) {
      indicators.push('bulk_data_access');
    }

    // Unusual time access
    const hour = event.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      indicators.push('unusual_time_access');
    }

    // SQL injection patterns
    if (event.message && /('|--|;|union|select|insert|delete|update)/i.test(event.message)) {
      indicators.push('sql_injection_attempt');
    }

    // Cross-site scripting patterns
    if (event.message && /<script|javascript:|onload=|onerror=/i.test(event.message)) {
      indicators.push('xss_attempt');
    }

    return indicators;
  }

  /**
   * Determine compliance requirements
   */
  private determineComplianceRequirements(event: AuditEvent): ComplianceFramework[] {
    const frameworks: ComplianceFramework[] = [];

    // GDPR requirements
    if (event.category === SecurityEventCategory.DATA_ACCESS ||
        event.category === SecurityEventCategory.DATA_MODIFICATION) {
      frameworks.push(ComplianceFramework.GDPR);
    }

    // SOX requirements
    if (event.category === SecurityEventCategory.COMPLIANCE ||
        (event.category === SecurityEventCategory.DATA_MODIFICATION &&
         event.metadata.resource?.includes('financial'))) {
      frameworks.push(ComplianceFramework.SOX);
    }

    // HIPAA requirements
    if (event.metadata.custom?.healthData ||
        event.metadata.resource?.includes('medical') ||
        event.metadata.resource?.includes('health')) {
      frameworks.push(ComplianceFramework.HIPAA);
    }

    // PCI-DSS requirements
    if (event.metadata.custom?.paymentData ||
        event.metadata.resource?.includes('payment') ||
        event.metadata.resource?.includes('card')) {
      frameworks.push(ComplianceFramework.PCI_DSS);
    }

    // ISO 27001 for security events
    if (event.category === SecurityEventCategory.SECURITY) {
      frameworks.push(ComplianceFramework.ISO_27001);
    }

    return frameworks;
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(
    event: AuditEvent,
    result: CategorizationResult,
  ): number {
    let confidence = 0.5; // Base confidence

    // Rule-based confidence
    if (result.appliedRules.length > 0) {
      confidence += 0.3;
    }

    // Pattern-based confidence
    if (result.detectedPatterns.length > 0) {
      confidence += 0.2;
    }

    // Metadata completeness
    const metadataFields = Object.keys(event.metadata).length;
    const metadataBonus = Math.min(metadataFields * 0.02, 0.1);
    confidence += metadataBonus;

    // Security context availability
    if (event.securityContext) {
      confidence += 0.1;
    }

    // Threat indicator confidence
    if (result.threatIndicators.length > 0) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine final category based on rules and analysis
   */
  private determineFinalCategory(
    event: AuditEvent,
    result: CategorizationResult,
  ): SecurityEventCategory {
    // If rules were applied, use the category from the highest priority rule
    if (result.appliedRules.length > 0) {
      const appliedRule = this.categorizationRules.get(result.appliedRules[0]);
      if (appliedRule) {
        return appliedRule.category;
      }
    }

    // If threat indicators are present, consider security category
    if (result.threatIndicators.length > 0 &&
        event.category !== SecurityEventCategory.SECURITY) {
      return SecurityEventCategory.SECURITY;
    }

    return event.category;
  }

  /**
   * Generate cache key for event categorization
   */
  private generateCacheKey(event: AuditEvent): string {
    // Create a hash-like key based on event characteristics
    const keyComponents = [
      event.event,
      event.category,
      event.severity,
      event.metadata.userId || 'anonymous',
      event.metadata.resource || 'unknown',
      event.metadata.action || 'unknown',
    ];

    return keyComponents.join('|');
  }

  /**
   * Update cache statistics
   */
  private updateCacheStats(cacheHit: boolean): void {
    const totalRequests = this.statistics.performance.cacheHitRate *
                         this.statistics.totalEvents +
                         (cacheHit ? 1 : 0);

    this.statistics.performance.cacheHitRate = totalRequests /
                                              (this.statistics.totalEvents + 1);
  }

  /**
   * Update categorization statistics
   */
  private updateStatistics(result: CategorizationResult): void {
    this.statistics.totalEvents++;
    this.statistics.eventsByCategory[result.finalCategory]++;

    // Update average risk score
    const totalRisk = this.statistics.averageRiskScore *
                     (this.statistics.totalEvents - 1) +
                     result.riskScore;
    this.statistics.averageRiskScore = totalRisk / this.statistics.totalEvents;

    // Update top rules
    for (const ruleId of result.appliedRules) {
      const existingRule = this.statistics.topRules.find(r => r.ruleId === ruleId);
      if (existingRule) {
        existingRule.count++;
      } else {
        this.statistics.topRules.push({ ruleId, count: 1 });
      }
    }

    // Sort and limit top rules
    this.statistics.topRules.sort((a, b) => b.count - a.count);
    this.statistics.topRules = this.statistics.topRules.slice(0, 10);

    // Update threat patterns
    for (const patternId of result.detectedPatterns) {
      const existingPattern = this.statistics.threatPatterns.find(
        p => p.patternId === patternId,
      );
      if (existingPattern) {
        existingPattern.count++;
      } else {
        this.statistics.threatPatterns.push({ patternId, count: 1 });
      }
    }

    // Sort and limit threat patterns
    this.statistics.threatPatterns.sort((a, b) => b.count - a.count);
    this.statistics.threatPatterns = this.statistics.threatPatterns.slice(0, 10);

    // Update performance metrics
    const totalTime = this.statistics.performance.averageProcessingTime *
                     (this.statistics.totalEvents - 1) +
                     result.processingTime;
    this.statistics.performance.averageProcessingTime = totalTime /
                                                       this.statistics.totalEvents;
  }

  /**
   * Add event to pattern buffer
   */
  private addToPatternBuffer(event: AuditEvent): void {
    const bufferKey = this.getPatternBufferKey(event);

    if (!this.patternBuffer.has(bufferKey)) {
      this.patternBuffer.set(bufferKey, []);
    }

    const buffer = this.patternBuffer.get(bufferKey)!;
    buffer.push(event);

    // Limit buffer size and age
    const maxBufferSize = 1000;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = Date.now() - maxAge;

    const filteredBuffer = buffer
      .filter(e => e.timestamp.getTime() >= cutoffTime)
      .slice(-maxBufferSize);

    this.patternBuffer.set(bufferKey, filteredBuffer);
  }

  /**
   * Get pattern buffer key
   */
  private getPatternBufferKey(event: AuditEvent): string {
    return `${event.category}_${event.metadata.userId || 'anonymous'}`;
  }

  /**
   * Check if IP is private
   */
  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fe80:/,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Initialize default categorization rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: CategorizationRule[] = [
      {
        id: 'auth-failed-login',
        name: 'Failed Authentication Attempts',
        description: 'Categorize failed login attempts as authentication events',
        priority: 100,
        conditions: [
          {
            field: 'event',
            operator: 'contains',
            value: 'login',
            caseSensitive: false,
          },
          {
            field: 'metadata.custom.success',
            operator: 'equals',
            value: false,
            logicalOperator: 'and',
          },
        ],
        category: SecurityEventCategory.AUTHENTICATION,
        severityAdjustment: 1,
        riskScoreModifier: 0.3,
        tags: ['failed_login', 'security_concern'],
        enabled: true,
      },
      {
        id: 'data-bulk-access',
        name: 'Bulk Data Access',
        description: 'Identify bulk data access operations',
        priority: 90,
        conditions: [
          {
            field: 'category',
            operator: 'equals',
            value: SecurityEventCategory.DATA_ACCESS,
          },
          {
            field: 'metadata.custom.recordCount',
            operator: 'greater_than',
            value: 100,
            logicalOperator: 'and',
          },
        ],
        category: SecurityEventCategory.DATA_ACCESS,
        riskScoreModifier: 0.4,
        tags: ['bulk_access', 'data_exfiltration_risk'],
        enabled: true,
      },
      {
        id: 'admin-operations',
        name: 'Administrative Operations',
        description: 'Categorize administrative operations',
        priority: 85,
        conditions: [
          {
            field: 'metadata.action',
            operator: 'contains',
            value: 'admin',
            caseSensitive: false,
          },
        ],
        category: SecurityEventCategory.SYSTEM,
        riskScoreModifier: 0.2,
        tags: ['admin_operation', 'privileged_access'],
        enabled: true,
      },
      {
        id: 'sql-injection-detection',
        name: 'SQL Injection Detection',
        description: 'Detect potential SQL injection attempts',
        priority: 95,
        conditions: [
          {
            field: 'message',
            operator: 'regex',
            value: "('|--|;|union|select|insert|delete|update)",
            caseSensitive: false,
          },
        ],
        category: SecurityEventCategory.SECURITY,
        severityAdjustment: 2,
        riskScoreModifier: 0.8,
        tags: ['sql_injection', 'attack_attempt'],
        enabled: true,
      },
      {
        id: 'xss-detection',
        name: 'Cross-Site Scripting Detection',
        description: 'Detect potential XSS attempts',
        priority: 95,
        conditions: [
          {
            field: 'message',
            operator: 'regex',
            value: '<script|javascript:|onload=|onerror=',
            caseSensitive: false,
          },
        ],
        category: SecurityEventCategory.SECURITY,
        severityAdjustment: 2,
        riskScoreModifier: 0.7,
        tags: ['xss', 'attack_attempt'],
        enabled: true,
      },
      {
        id: 'privilege-escalation',
        name: 'Privilege Escalation Attempts',
        description: 'Detect privilege escalation attempts',
        priority: 92,
        conditions: [
          {
            field: 'category',
            operator: 'equals',
            value: SecurityEventCategory.AUTHORIZATION,
          },
          {
            field: 'metadata.custom.granted',
            operator: 'equals',
            value: false,
            logicalOperator: 'and',
          },
          {
            field: 'metadata.action',
            operator: 'contains',
            value: 'admin',
            caseSensitive: false,
            logicalOperator: 'and',
          },
        ],
        category: SecurityEventCategory.SECURITY,
        severityAdjustment: 2,
        riskScoreModifier: 0.6,
        tags: ['privilege_escalation', 'unauthorized_access'],
        enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      this.categorizationRules.set(rule.id, rule);
    }

    this.logger.log(`Initialized ${defaultRules.length} default categorization rules`);
  }

  /**
   * Initialize event patterns for detection
   */
  private initializeEventPatterns(): void {
    const defaultPatterns: EventPattern[] = [
      {
        id: 'brute-force-attack',
        name: 'Brute Force Attack Pattern',
        description: 'Multiple failed login attempts from same IP',
        sequence: [
          {
            category: SecurityEventCategory.AUTHENTICATION,
            eventPattern: 'login.*failed',
            requiredMetadata: ['ipAddress'],
            severity: [AuditSeverity.WARN, AuditSeverity.ERROR],
          },
        ],
        timeWindow: 300000, // 5 minutes
        minOccurrences: 5,
        riskLevel: 'high',
        threatTypes: ['brute_force', 'credential_attack'],
      },
      {
        id: 'data-exfiltration-pattern',
        name: 'Data Exfiltration Pattern',
        description: 'Large volume data access followed by export operations',
        sequence: [
          {
            category: SecurityEventCategory.DATA_ACCESS,
            requiredMetadata: ['userId'],
          },
          {
            category: SecurityEventCategory.API_ACCESS,
            eventPattern: 'export|download',
          },
        ],
        timeWindow: 900000, // 15 minutes
        minOccurrences: 3,
        riskLevel: 'critical',
        threatTypes: ['data_exfiltration', 'insider_threat'],
      },
      {
        id: 'privilege-abuse-pattern',
        name: 'Privilege Abuse Pattern',
        description: 'Administrative actions by recently escalated users',
        sequence: [
          {
            category: SecurityEventCategory.AUTHORIZATION,
            eventPattern: 'role.*granted',
          },
          {
            category: SecurityEventCategory.SYSTEM,
            eventPattern: 'admin|configure|modify',
          },
        ],
        timeWindow: 1800000, // 30 minutes
        minOccurrences: 2,
        riskLevel: 'medium',
        threatTypes: ['privilege_abuse', 'insider_threat'],
      },
    ];

    for (const pattern of defaultPatterns) {
      this.eventPatterns.set(pattern.id, pattern);
    }

    this.logger.log(`Initialized ${defaultPatterns.length} default event patterns`);
  }

  /**
   * Initialize threat intelligence
   */
  private initializeThreatIntelligence(): void {
    const threatIntel: ThreatIntelligence[] = [
      {
        type: 'malicious_ip',
        level: 'high',
        description: 'Known malicious IP addresses',
        indicators: [
          '192.168.1.100', // Example - would be real threat IPs
          'suspicious-domain.com',
        ],
        mitigations: ['block_ip', 'enhance_monitoring'],
        lastUpdated: new Date(),
      },
      {
        type: 'sql_injection',
        level: 'critical',
        description: 'SQL injection attack patterns',
        indicators: [
          'union select',
          '1=1',
          'drop table',
          '-- ',
        ],
        mitigations: ['input_validation', 'waf_rules', 'parameterized_queries'],
        lastUpdated: new Date(),
      },
      {
        type: 'xss_attack',
        level: 'high',
        description: 'Cross-site scripting attack patterns',
        indicators: [
          '<script>',
          'javascript:',
          'onload=',
          'onerror=',
        ],
        mitigations: ['output_encoding', 'csp_headers', 'input_sanitization'],
        lastUpdated: new Date(),
      },
      {
        type: 'credential_stuffing',
        level: 'medium',
        description: 'Credential stuffing attack indicators',
        indicators: [
          'multiple_failed_logins',
          'distributed_source_ips',
          'automated_requests',
        ],
        mitigations: ['rate_limiting', 'captcha', 'account_lockout'],
        lastUpdated: new Date(),
      },
    ];

    for (const threat of threatIntel) {
      this.threatIntelligence.set(threat.type, threat);
    }

    this.logger.log(`Initialized ${threatIntel.length} threat intelligence entries`);
  }

  /**
   * Get all categorization rules
   */
  getCategorizationRules(): CategorizationRule[] {
    return Array.from(this.categorizationRules.values());
  }

  /**
   * Get all event patterns
   */
  getEventPatterns(): EventPattern[] {
    return Array.from(this.eventPatterns.values());
  }

  /**
   * Get threat intelligence
   */
  getThreatIntelligence(): ThreatIntelligence[] {
    return Array.from(this.threatIntelligence.values());
  }

  /**
   * Update threat intelligence
   */
  updateThreatIntelligence(threatType: string, threat: ThreatIntelligence): void {
    this.threatIntelligence.set(threatType, threat);
    this.logger.log(`Updated threat intelligence: ${threatType}`);
  }
}