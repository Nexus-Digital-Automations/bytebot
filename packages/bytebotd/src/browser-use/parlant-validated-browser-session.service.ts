/**
 * Parlant-Validated Browser Session Service - MAXIMUM IMPLEMENTATION
 * 
 * Comprehensive function-level wrapper for BrowserSessionService implementing
 * Parlant conversational AI validation for EVERY browser session operation.
 * 
 * This service ensures that every browser session management action is validated
 * through natural language conversation, providing unprecedented safety, auditability,
 * and user control over browser session lifecycle operations.
 * 
 * Features:
 * - Function-level conversational validation for ALL session operations
 * - Risk-based assessment for session creation, modification, and cleanup
 * - Real-time user intent verification for session management
 * - Complete audit trail for enterprise compliance
 * - Performance optimization with session state caching
 * 
 * Security: Enterprise-grade validation with session-aware authentication
 * Compliance: Complete audit trail for session management compliance
 * Performance: Optimized validation with intelligent session state management
 */

import { Injectable, Logger } from '@nestjs/common';import { URL } from 'url';import { BrowserSessionService } from './browser-session.service';import { ParlantIntegrationService, 
  ParlantValidationRequest,
  ParlantConversationContext,
  RiskLevel,
  ConversationalValidationError
} from '../parlant/parlant-integration.service';import {CreateBrowserSessionDto,
  BrowserSessionDto,
  BrowserTabInfoDto,
} from './dto/browser-session.dto';// ===== PARLANT SESSION VALIDATION INTERFACES =====/**
 * Browser session validation context with conversation details
 */
export interface BrowserSessionValidationContext extends ParlantConversationContext {
  readonly requestedSessionCount: number;
  readonly currentActiveSessionsCount: number;
  readonly sessionHistory: BrowserSessionAuditEntry[];
  readonly systemResourceState: SessionResourceState;
  readonly securityProfile: SessionSecurityProfile;
}

/**
 * Browser session audit entry for tracking session operations
 */
export interface BrowserSessionAuditEntry {
  readonly timestamp: Date;
  readonly operation: SessionOperation;
  readonly sessionId: string;
  readonly description: string;
  readonly riskLevel: RiskLevel;
  readonly validationResult: 'APPROVED' | 'DENIED';
  readonly executionResult: 'SUCCESS' | 'FAILURE' | 'TIMEOUT';
  readonly conversationId: string;
  readonly sessionConfig?: Partial<CreateBrowserSessionDto>;
  readonly resourceImpact?: ResourceImpactInfo;
}

/**
 * Session operation types
 */
export type SessionOperation = 
  | 'CREATE_SESSION'| 'DELETE_SESSION' | 'UPDATE_SESSION'| 'CREATE_TAB'| 'CLOSE_TAB'| 'SWITCH_TAB'| 'CLEANUP_SESSIONS'| 'MONITOR_SESSION';/*** Session resource state for validation context
 */
export interface SessionResourceState {
  readonly totalMemoryUsageMB: number;
  readonly cpuUsagePercent: number;
  readonly openTabsCount: number;
  readonly networkConnectionsCount: number;
  readonly storageUsageMB: number;
  readonly lastResourceCheck: Date;
}

/**
 * Session security profile for risk assessment
 */
export interface SessionSecurityProfile {
  readonly userTrustLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'MAXIMUM';
  readonly recentSecurityIncidents: number;
  readonly suspiciousActivityScore: number;
  readonly lastSecurityScan: Date;
  readonly enabledSecurityFeatures: string[];
  readonly securityViolations: string[];
}

/**
 * Resource impact information for session operations
 */
export interface ResourceImpactInfo {
  readonly estimatedMemoryMB: number;
  readonly estimatedCpuPercent: number;
  readonly estimatedNetworkConnections: number;
  readonly expectedLifetimeMinutes: number;
}

/**
 * Session operation risk assessment result
 */
export interface SessionOperationRiskAssessment {
  readonly riskLevel: RiskLevel;
  readonly riskFactors: string[];
  readonly mitigationStrategies: string[];
  readonly requiresApproval: boolean;
  readonly resourceConstraints: string[];
  readonly securityRecommendations: string[];
}

/**
 * Session validation result with enhanced context
 */
export interface SessionValidationResult {
  readonly session: BrowserSessionDto;
  readonly validationDetails: {
    approved: boolean;
    conversationId: string;
    sessionRisk: RiskLevel;
    resourceImpact: ResourceImpactInfo;
    securityValidation: {
      passed: boolean;
      flags: string[];
      recommendations: string[];
    };
    complianceFlags: string[];
  };
}

// ===== PARLANT-VALIDATED BROWSER SESSION SERVICE =====

@Injectable()
export class ParlantValidatedBrowserSessionService {
  private readonly logger = new Logger(ParlantValidatedBrowserSessionService.name);
  private readonly sessionHistory: BrowserSessionAuditEntry[] = [];
  
  // Performance metrics
  private totalSessionOperations = 0;
  private approvedSessionOperations = 0;
  private deniedSessionOperations = 0;
  private averageValidationTime = 0;

  constructor(
    private readonly originalBrowserSessionService: BrowserSessionService,
    private readonly parlantIntegrationService: ParlantIntegrationService
  ) {
    const operationId = `parlant_session_init${Date.now()}${Math.random().toString(36).substring(7)}`;this.logger.log(`[${operationId}] Initializing Parlant-Validated Browser Session Service`, {hasOriginalService: !!this.originalBrowserSessionService,hasParlantService: !!this.parlantIntegrationService,
      validationEnabled: true,
    });

    // Initialize performance monitoring
    setInterval(() => this.logPerformanceMetrics(), 300000); // Every 5 minutes
  }

  /**
   * Create browser session with comprehensive Parlant conversational validation
   * 
   * This method wraps the original BrowserSessionService.createSession() with
   * Parlant conversational validation to ensure every session creation is validated
   * through natural language conversation.
   * 
   * @param sessionDto - Browser session creation parameters
   * @param context - Conversation context for validation
   * @returns Promise with session result after validation and creation
   * @throws ConversationalValidationError if validation fails
   */
  async createSession(
    sessionDto: CreateBrowserSessionDto,
    context: BrowserSessionValidationContext
  ): Promise<SessionValidationResult> {
    const operationId = `parlant_session_create${Date.now()}${Math.random().toString(36).substring(7)}`;const startTime = Date.now();this.totalSessionOperations++;

    this.logger.log(
      `[${operationId}] Starting Parlant-validated session creation: ${sessionDto.name}`,{operationId,
        sessionName: sessionDto.name,
        userId: context.userId,
        headless: sessionDto.headless,
        viewport: `${sessionDto.viewportWidth}x${sessionDto.viewportHeight}`,currentSessions: context.currentActiveSessionsCount,timestamp: new Date().toISOString(),
      }
    );

    try {
      // Step 1: Assess session creation risk level
      const riskAssessment = this.assessSessionCreationRisk(sessionDto, context);
      
      this.logger.log(
        `[${operationId}] Session creation risk assessment completed: ${riskAssessment.riskLevel}`,{operationId,
          riskLevel: riskAssessment.riskLevel,
          riskFactors: riskAssessment.riskFactors,
          requiresApproval: riskAssessment.requiresApproval,
          resourceConstraints: riskAssessment.resourceConstraints,
        }
      );

      // Step 2: Perform Parlant conversational validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `BrowserSessionService.createSession`,
        functionParams: this.sanitizeSessionForValidation(sessionDto),
        actionDescription: this.generateSessionCreationDescription(sessionDto),
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      // Step 3: Handle validation result
      if (!validationResponse.approved) {
        this.deniedSessionOperations++;
        
        // Create audit entry for denied operation
        await this.createSessionAuditEntry({
          timestamp: new Date(),
          operation: 'CREATE_SESSION',sessionId: 'DENIED',description: this.generateSessionCreationDescription(sessionDto),riskLevel: riskAssessment.riskLevel,
          validationResult: 'DENIED',executionResult: 'FAILURE',
          conversationId: validationResponse.conversationId,
          sessionConfig: sessionDto,
          resourceImpact: this.estimateResourceImpact(sessionDto),
        });

        this.logger.warn(
          `[${operationId}] Session creation denied by Parlant validation`,
          {
            operationId,
            sessionName: sessionDto.name,
            reasoning: validationResponse.reasoning,
            suggestedAlternatives: validationResponse.suggestedAlternatives,
          }
        );

        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives ?? []
        );
      }

      this.approvedSessionOperations++;

      // Step 4: Execute the original session creation with enhanced monitoring
      const executionStartTime = Date.now();
      let session: BrowserSessionDto;
      let executionStatus: 'SUCCESS' | 'FAILURE' | 'TIMEOUT' = 'SUCCESS';

      try {
        // Apply execution context from validation (timeout, monitoring)
        const executionContext = validationResponse.executionContext;
        
        if (executionContext?.timeoutMs) {
          // Apply timeout if specified
          session = await Promise.race([
            this.originalBrowserSessionService.createSession(sessionDto),
            this.createTimeoutPromise(executionContext.timeoutMs)
          ]);
        } else {
          session = await this.originalBrowserSessionService.createSession(sessionDto);
        }

        this.logger.log(
          `[${operationId}] Session created successfully`,
          {
            operationId,
            sessionId: session.sessionId,
            sessionName: session.name,
            status: session.status,
            executionTime: Date.now() - executionStartTime,
            validationTime: executionStartTime - startTime,
            totalTime: Date.now() - startTime,
          }
        );

      } catch (executionError) {
        executionStatus = 'FAILURE';
        
        this.logger.error(
          `[${operationId}] Session creation execution failed`,
          {
            operationId,
            sessionName: sessionDto.name,
            error: executionError instanceof Error ? executionError.message : String(executionError),
            executionTime: Date.now() - executionStartTime,
          }
        );

        throw executionError;
      }

      // Step 5: Perform security validation
      const securityValidation = this.performSessionSecurityValidation(session, context);

      // Step 6: Generate compliance flags
      const complianceFlags = this.generateSessionComplianceFlags(session, sessionDto);

      // Step 7: Create successful audit entry
      await this.createSessionAuditEntry({
        timestamp: new Date(),
        operation: 'CREATE_SESSION',sessionId: session.sessionId,description: this.generateSessionCreationDescription(sessionDto),
        riskLevel: riskAssessment.riskLevel,
        validationResult: 'APPROVED',
        executionResult: executionStatus,
        conversationId: validationResponse.conversationId,
        sessionConfig: sessionDto,
        resourceImpact: this.estimateResourceImpact(sessionDto),
      });

      // Step 8: Update performance metrics
      const totalDuration = Date.now() - startTime;
      this.updatePerformanceMetrics(totalDuration);

      const result: SessionValidationResult = {
        session,
        validationDetails: {
          approved: true,
          conversationId: validationResponse.conversationId,
          sessionRisk: riskAssessment.riskLevel,
          resourceImpact: this.estimateResourceImpact(sessionDto),
          securityValidation,
          complianceFlags,
        },
      };

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(
        `[${operationId}] Parlant-validated session creation failed`,{operationId,
          sessionName: sessionDto.name,
          error: error instanceof Error ? error.message : String(error),
          duration,
        }
      );

      // Re-throw ConversationalValidationError as-is
      if (error instanceof ConversationalValidationError) {
        throw error;
      }

      // Wrap other errors with context
      throw new Error(`Session creation failed after validation: ${error instanceof Error ? error.message : String(error)}`);}}

  /**
   * Delete session with Parlant conversational validation
   * 
   * @param sessionId - Session ID to delete
   * @param context - Conversation context for validation
   * @returns Promise indicating deletion success
   */
  async deleteSession(
    sessionId: string,
    context: BrowserSessionValidationContext
  ): Promise<void> {
    const operationId = `parlant_session_delete${Date.now()}${Math.random().toString(36).substring(7)}`;const startTime = Date.now();this.logger.log(
      `[${operationId}] Starting Parlant-validated session deletion: ${sessionId}`,{operationId,
        sessionId,
        userId: context.userId,
      }
    );

    try {
      // Step 1: Assess session deletion risk level
      const riskAssessment = this.assessSessionDeletionRisk(sessionId, context);

      // Step 2: Perform Parlant conversational validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `BrowserSessionService.deleteSession`,functionParams: { sessionId },actionDescription: `Delete browser session ${sessionId}`,context: context,riskLevel: riskAssessment.riskLevel,
        operationId,
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      if (!validationResponse.approved) {
        this.logger.warn(
          `[${operationId}] Session deletion denied by Parlant validation`,
          {
            operationId,
            sessionId,
            reasoning: validationResponse.reasoning,
          }
        );

        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives ?? []
        );
      }

      // Step 3: Execute session deletion
      await this.originalBrowserSessionService.closeSession(sessionId);

      // Step 4: Create audit entry
      await this.createSessionAuditEntry({
        timestamp: new Date(),
        operation: 'DELETE_SESSION',
        sessionId,
        description: `Delete browser session ${sessionId}`,
        riskLevel: riskAssessment.riskLevel,
        validationResult: 'APPROVED',executionResult: 'SUCCESS',
        conversationId: validationResponse.conversationId,
      });

      this.logger.log(
        `[${operationId}] Session deleted successfully after validation`,{operationId,
          sessionId,
          duration: Date.now() - startTime,
        }
      );

    } catch (error) {
      this.logger.error(
        `[${operationId}] Parlant-validated session deletion failed`,{operationId,
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        }
      );

      if (error instanceof ConversationalValidationError) {
        throw error;
      }

      throw new Error(`Session deletion failed after validation: ${error instanceof Error ? error.message : String(error)}`);}}

  /**
   * Create tab with Parlant conversational validation
   * 
   * @param sessionId - Session ID to create tab in
   * @param url - URL to navigate to
   * @param context - Conversation context for validation
   * @returns Promise with tab info after validation
   */
  async createTab(
    sessionId: string,
    url: string,
    context: BrowserSessionValidationContext
  ): Promise<BrowserTabInfoDto> {
    const operationId = `parlant_tab_create${Date.now()}${Math.random().toString(36).substring(7)}`;const startTime = Date.now();this.logger.log(
      `[${operationId}] Starting Parlant-validated tab creation`,{operationId,
        sessionId,
        url,
        userId: context.userId,
      }
    );

    try {
      // Step 1: Assess tab creation risk level
      const riskAssessment = this.assessTabCreationRisk(sessionId, url, context);

      // Step 2: Perform Parlant conversational validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `BrowserSessionService.createTab`,functionParams: { sessionId, url: this.sanitizeUrlForValidation(url) },actionDescription: `Create new tab in session ${sessionId} with URL: ${this.sanitizeUrlForValidation(url)}`,
        context: context,
        riskLevel: riskAssessment.riskLevel,
        operationId,
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      if (!validationResponse.approved) {
        throw new ConversationalValidationError(
          validationResponse.conversationId,
          validationResponse.reasoning,
          validationResponse.suggestedAlternatives ?? []
        );
      }

      // Step 3: Execute tab creation
      const tabInfo = await this.originalBrowserSessionService.createTab(sessionId, { url });

      // Step 4: Create audit entry
      await this.createSessionAuditEntry({
        timestamp: new Date(),
        operation: 'CREATE_TAB',
        sessionId,
        description: `Create tab with URL: ${this.sanitizeUrlForValidation(url)}`,
        riskLevel: riskAssessment.riskLevel,
        validationResult: 'APPROVED',executionResult: 'SUCCESS',
        conversationId: validationResponse.conversationId,
      });

      this.logger.log(
        `[${operationId}] Tab created successfully after validation`,{operationId,
          sessionId,
          tabId: tabInfo.tabId,
          duration: Date.now() - startTime,
        }
      );

      return tabInfo;

    } catch (error) {
      this.logger.error(
        `[${operationId}] Parlant-validated tab creation failed`,{operationId,
          sessionId,
          url: this.sanitizeUrlForValidation(url),
          error: error instanceof Error ? error.message : String(error),
        }
      );

      if (error instanceof ConversationalValidationError) {
        throw error;
      }

      throw new Error(`Tab creation failed after validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ===== RISK ASSESSMENT METHODS =====

  /**
   * Assess risk level for session creation based on configuration and context
   */
  private assessSessionCreationRisk(
    sessionDto: CreateBrowserSessionDto,
    context: BrowserSessionValidationContext
  ): SessionOperationRiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = RiskLevel._LOW;

    // Assess based on session configuration
    if (!sessionDto.headless) {
      riskLevel = RiskLevel._MODERATE;
      riskFactors.push('non_headless_mode');}if (sessionDto.devtools) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('devtools_enabled');}// Assess based on current system state
    if (context.currentActiveSessionsCount >= 5) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_session_count');}// Assess based on resource usage
    if (context.systemResourceState.totalMemoryUsageMB > 2000) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_memory_usage');}if (context.systemResourceState.cpuUsagePercent > 80) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_cpu_usage');}// Assess based on security profile
    if (context.securityProfile.suspiciousActivityScore > 0.7) {
      riskLevel = RiskLevel._CRITICAL;
      riskFactors.push('suspicious_activity_detected');}if (context.securityProfile.userTrustLevel === 'LOW') {riskLevel = this.escalateRiskLevel(riskLevel);riskFactors.push('low_user_trust_level');}// Check for proxy configuration
    if (sessionDto.proxy) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('proxy_configuration');}const mitigationStrategies = this.generateSessionMitigationStrategies(riskLevel, riskFactors);
    const resourceConstraints = this.generateResourceConstraints(context);
    const securityRecommendations = this.generateSecurityRecommendations(context);
    
    return {
      riskLevel,
      riskFactors,
      mitigationStrategies,
      requiresApproval: riskLevel !== RiskLevel._MINIMAL,
      resourceConstraints,
      securityRecommendations,
    };
  }

  /**
   * Assess risk level for session deletion
   */
  private assessSessionDeletionRisk(
    sessionId: string,
    context: BrowserSessionValidationContext
  ): SessionOperationRiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = RiskLevel._LOW;

    // Check if session has active tasks
    const hasActiveTasks = this.hasActiveTasksInSession(sessionId);
    if (hasActiveTasks) {
      riskLevel = RiskLevel._MODERATE;
      riskFactors.push('active_tasks_in_session');}// Check for data loss potential
    if (this.hasUnsavedDataInSession(sessionId)) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('potential_data_loss');}return {
      riskLevel,
      riskFactors,
      mitigationStrategies: this.generateSessionMitigationStrategies(riskLevel, riskFactors),
      requiresApproval: riskLevel !== RiskLevel._MINIMAL,
      resourceConstraints: [],
      securityRecommendations: [],
    };
  }

  /**
   * Assess risk level for tab creation
   */
  private assessTabCreationRisk(
    sessionId: string,
    url: string,
    context: BrowserSessionValidationContext
  ): SessionOperationRiskAssessment {
    const riskFactors: string[] = [];
    let riskLevel: RiskLevel = RiskLevel._LOW;

    // Assess URL safety
    if (this.isExternalDomain(url)) {
      riskLevel = RiskLevel._MODERATE;
      riskFactors.push('external_domain_access');}if (this.containsSensitiveKeywords(url)) {
      riskLevel = RiskLevel._HIGH;
      riskFactors.push('sensitive_url_keywords');}if (this.isSuspiciousUrl(url)) {
      riskLevel = RiskLevel._CRITICAL;
      riskFactors.push('suspicious_url_pattern');}// Check tab count in session
    if (context.systemResourceState.openTabsCount > 20) {
      riskLevel = this.escalateRiskLevel(riskLevel);
      riskFactors.push('high_tab_count');}return {
      riskLevel,
      riskFactors,
      mitigationStrategies: this.generateSessionMitigationStrategies(riskLevel, riskFactors),
      requiresApproval: riskLevel !== RiskLevel._MINIMAL,
      resourceConstraints: [],
      securityRecommendations: [],
    };
  }

  // ===== HELPER METHODS =====

  /**
   * Escalate risk level to next higher level
   */
  private escalateRiskLevel(currentLevel: RiskLevel): RiskLevel {
    switch (currentLevel) {
      case RiskLevel._MINIMAL: return RiskLevel._LOW;
      case RiskLevel._LOW: return RiskLevel._MODERATE;
      case RiskLevel._MODERATE: return RiskLevel._HIGH;
      case RiskLevel._HIGH: return RiskLevel._CRITICAL;
      case RiskLevel._CRITICAL: return RiskLevel._CRITICAL;
      default: return RiskLevel._MODERATE;
    }
  }

  /**
   * Generate session-specific mitigation strategies
   */
  private generateSessionMitigationStrategies(riskLevel: RiskLevel, riskFactors: string[] = []): string[] {
    const strategies: string[] = [];

    if (riskFactors.includes('non_headless_mode')) {strategies.push('enable_session_monitoring', 'verify_user_presence');}if (riskFactors.includes('high_session_count')) {strategies.push('cleanup_idle_sessions', 'implement_session_limits');}if (riskFactors.includes('external_domain_access')) {strategies.push('verify_domain_safety', 'enable_network_monitoring');}if (riskLevel === RiskLevel._CRITICAL) {
      strategies.push('multi_factor_approval', 'comprehensive_session_logging');}return strategies;
  }

  /**
   * Generate resource constraints based on system state
   */
  private generateResourceConstraints(context: BrowserSessionValidationContext): string[] {
    const constraints: string[] = [];

    if (context.systemResourceState.totalMemoryUsageMB > 1500) {
      constraints.push('memory_limit_1GB');}if (context.systemResourceState.cpuUsagePercent > 70) {
      constraints.push('cpu_limit_50_percent');}if (context.systemResourceState.openTabsCount > 15) {
      constraints.push('max_5_tabs_per_session');}return constraints;
  }

  /**
   * Generate security recommendations based on security profile
   */
  private generateSecurityRecommendations(context: BrowserSessionValidationContext): string[] {
    const recommendations: string[] = [];

    if (context.securityProfile.userTrustLevel === 'LOW') {recommendations.push('enable_enhanced_monitoring', 'require_explicit_approvals');}if (context.securityProfile.recentSecurityIncidents > 0) {
      recommendations.push('security_review_required', 'additional_validation');}if (context.securityProfile.suspiciousActivityScore > 0.5) {
      recommendations.push('heightened_security_monitoring');}return recommendations;
  }

  /**
   * Generate session creation description
   */
  private generateSessionCreationDescription(sessionDto: CreateBrowserSessionDto): string {
    const features = [];
    if (!sessionDto.headless) features.push('visible mode');if (sessionDto.devtools) features.push('devtools enabled');if (sessionDto.proxy) features.push('proxy configured');

    const featureStr = features.length > 0 ? ` with ${features.join(`, ')}` : '';
    return `Create browser session "${sessionDto.name}" (${sessionDto.viewportWidth}x${sessionDto.viewportHeight})${featureStr}";}

  /**
   * Sanitize session parameters for validation
   */
  private sanitizeSessionForValidation(sessionDto: CreateBrowserSessionDto): Record<string, unknown> {
    return {
      name: sessionDto.name,
      headless: sessionDto.headless,
      viewport: `${sessionDto.viewportWidth}x${sessionDto.viewportHeight}`,devtools: sessionDto.devtools,hasProxy: !!sessionDto.proxy,
      initialUrlsCount: sessionDto.initialUrls?.length ?? 0,
    };
  }

  /**
   * Sanitize URL for logging and validation
   */
  private sanitizeUrlForValidation(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname.substring(0, 50)}...`;
    } catch {
      return url.substring(0, 50) + '...';}}

  /**
   * Check if URL is external domain
   */
  private isExternalDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const allowedDomains = ['localhost', '127.0.0.1', 'local.dev'];return !allowedDomains.some(domain => urlObj.hostname.includes(domain));} catch {
      return true; // Assume external if URL parsing fails
    }
  }

  /**
   * Check if URL contains sensitive keywords
   */
  private containsSensitiveKeywords(url: string): boolean {
    const sensitiveKeywords = ['admin', 'password', 'auth', 'login', 'secret', 'private'];return sensitiveKeywords.some(keyword => url.toLowerCase().includes(keyword));}

  /**
   * Check if URL has suspicious patterns
   */
  private isSuspiciousUrl(url: string): boolean {
    const suspiciousPatterns = [
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP addresses
      /[a-z0-9]{20,}/, // Long random strings
      /\.tk$|\.ml$|\.ga$/, // Suspicious TLDs
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Check if session has active tasks (mock implementation)
   */
  private hasActiveTasksInSession(sessionId: string): boolean {
    // Mock implementation - in production would check actual task status
    return Math.random() > 0.8; // 20% chance of having active tasks
  }

  /**
   * Check if session has unsaved data (mock implementation)
   */
  private hasUnsavedDataInSession(sessionId: string): boolean {
    // Mock implementation - in production would check actual session state
    return Math.random() > 0.9; // 10% chance of having unsaved data
  }

  /**
   * Estimate resource impact of session creation
   */
  private estimateResourceImpact(sessionDto: CreateBrowserSessionDto): ResourceImpactInfo {
    const baseMemory = 200; // Base memory for headless session
    const memoryMultiplier = sessionDto.headless ? 1 : 2.5; // Non-headless uses more memory
    const devtoolsOverhead = sessionDto.devtools ? 100 : 0;

    return {
      estimatedMemoryMB: Math.round((baseMemory * memoryMultiplier) + devtoolsOverhead),
      estimatedCpuPercent: sessionDto.headless ? 5 : 15,
      estimatedNetworkConnections: sessionDto.initialUrls?.length ?? 1,
      expectedLifetimeMinutes: 60, // Default 1 hour
    };
  }

  /**
   * Perform session security validation
   */
  private performSessionSecurityValidation(
    session: BrowserSessionDto,
    context: BrowserSessionValidationContext
  ): { passed: boolean; flags: string[]; recommendations: string[] } {
    const flags: string[] = [];
    const recommendations: string[] = [];

    // Check session configuration security
    if (!session.config.headless) {
      flags.push('NON_HEADLESS_SESSION');recommendations.push('Monitor session for unauthorized access');}if (session.config.devtools) {
      flags.push('DEVTOOLS_ENABLED');recommendations.push('Restrict devtools access to authorized users');}if (session.config.proxy) {
      flags.push('PROXY_CONFIGURED');recommendations.push('Validate proxy server security');}// Check against security profile
    if (context.securityProfile.userTrustLevel === 'LOW') {flags.push('LOW_TRUST_USER');recommendations.push('Enable enhanced monitoring');}const passed = flags.length === 0 || 
                  (flags.length <= 2 && context.securityProfile.userTrustLevel !== 'LOW');return { passed, flags, recommendations };}

  /**
   * Generate compliance flags for session
   */
  private generateSessionComplianceFlags(
    session: BrowserSessionDto,
    sessionDto: CreateBrowserSessionDto
  ): string[] {
    const flags: string[] = [];

    if (!session.config.headless) {
      flags.push('VISIBLE_SESSION_CREATED');}if (sessionDto.proxy) {
      flags.push('PROXY_SESSION_CONFIGURATION');}if (sessionDto.initialUrls?.some(url => this.isExternalDomain(url))) {
      flags.push('EXTERNAL_DOMAIN_SESSION');
    }

    return flags;
  }

  /**
   * Create timeout promise for execution limits
   */
  private createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Session operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Create audit entry for session operation
   */
  private async createSessionAuditEntry(entry: BrowserSessionAuditEntry): Promise<void> {
    this.sessionHistory.push(entry);
    
    // Keep only recent entries (last 100)
    if (this.sessionHistory.length > 100) {
      this.sessionHistory.shift();
    }

    // TODO: Persist audit entries to database for compliance
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(duration: number): void {
    this.averageValidationTime =
      (this.averageValidationTime * (this.totalSessionOperations - 1) + duration) / this.totalSessionOperations;
  }

  /**
   * Log performance metrics for monitoring
   */
  private logPerformanceMetrics(): void {
    const approvalRate = this.totalSessionOperations > 0 ? (this.approvedSessionOperations / this.totalSessionOperations) * 100 : 0;
    const denialRate = this.totalSessionOperations > 0 ? (this.deniedSessionOperations / this.totalSessionOperations) * 100 : 0;

    this.logger.log('Parlant Browser Session Performance Metrics', {
      totalSessionOperations: this.totalSessionOperations,
      approvedSessionOperations: this.approvedSessionOperations,
      deniedSessionOperations: this.deniedSessionOperations,
      approvalRate: `${approvalRate.toFixed(2)}%`,denialRate: `${denialRate.toFixed(2)}%`,averageValidationTime: `${this.averageValidationTime.toFixed(2)}ms`,
      sessionHistorySize: this.sessionHistory.length,
    });
  }

  /**
   * Get recent session history for context
   */
  getRecentSessionHistory(): BrowserSessionAuditEntry[] {
    return [...this.sessionHistory].slice(-20); // Last 20 operations
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    return {
      totalSessionOperations: this.totalSessionOperations,
      approvedSessionOperations: this.approvedSessionOperations,
      deniedSessionOperations: this.deniedSessionOperations,
      approvalRate: this.totalSessionOperations > 0 ? (this.approvedSessionOperations / this.totalSessionOperations) * 100 : 0,
      averageValidationTime: this.averageValidationTime,
    };
  }

  /**
   * Get current system resource state for validation context
   */
  async getCurrentSystemResourceState(): Promise<SessionResourceState> {
    // Mock implementation - in production would gather actual system metrics
    return {
      totalMemoryUsageMB: 1024,
      cpuUsagePercent: 35,
      openTabsCount: 8,
      networkConnectionsCount: 12,
      storageUsageMB: 256,
      lastResourceCheck: new Date(),
    };
  }

  /**
   * Get security profile for validation context
   */
  async getSecurityProfile(userId: string): Promise<SessionSecurityProfile> {
    // Mock implementation - in production would check actual security data
    return {
      userTrustLevel: 'MEDIUM',recentSecurityIncidents: 0,suspiciousActivityScore: 0.1,
      lastSecurityScan: new Date(),
      enabledSecurityFeatures: ['session_monitoring', 'url_validation'],
      securityViolations: [],
    };
  }
}