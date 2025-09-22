/**
 * Enhanced Screen Capture Validation Service - PARLANT Integration
 *
 * Comprehensive PARLANT conversational validation for Screen Capture and Analysis APIs
 * with privacy-aware consent management, intelligent visual element detection,
 * and accessibility feature validation.
 *
 * Features:
 * - Privacy-aware conversational consent for screen recording
 * - Intelligent validation for visual element detection
 * - Natural language guidance for accessibility features
 * - Real-time user confirmation for sensitive screen content
 * - OCR content analysis with privacy protection
 * - Sub-200ms validation for screenshot operations
 *
 * Privacy Classifications:
 * - PUBLIC: General UI screenshots (allowed with minimal validation)
 * - PERSONAL: User content visible (requires user consent)
 * - SENSITIVE: Financial/medical/personal data visible (requires explicit approval)
 * - CONFIDENTIAL: Business/legal documents (requires multi-step approval)
 * - PRIVATE: Personal communications/passwords (blocked by default)
 *
 * Performance Requirements:
 * - <100ms for basic screenshot validation
 * - <200ms for content analysis validation
 * - <300ms for privacy assessment with OCR
 * - <500ms for full conversational approval process
 */

import { Injectable, Logger } from '@nestjs/common';
import { ParlantIntegrationService,
  ParlantValidationRequest,
  ParlantConversationContext,
  RiskLevel,
  ConversationalValidationError
} from '../parlant/parlant-integration.service';

// ===== SCREEN CAPTURE VALIDATION INTERFACES =====

/**
 * Screen capture validation context with privacy controls
 */
export interface ScreenCaptureValidationContext extends ParlantConversationContext {
  readonly screenResolution: { width: number; height: number };
  readonly activeApplication?: string;
  readonly windowTitle?: string;
  readonly privacySettings: {
    allowScreenRecording: boolean;
    allowContentAnalysis: boolean;
    allowOCRProcessing: boolean;
    userConsentTimestamp?: Date;
    consentExpiryMinutes: number;
  };
  readonly accessibilityContext: {
    screenReaderActive: boolean;
    highContrastMode: boolean;
    magnificationLevel: number;
    userAccessibilityNeeds: string[];
  };
  readonly performanceRequirements: {
    maxValidationTimeMs: number;
    requiresRealtime: boolean;
    allowCaching: boolean;
  };
}

/**
 * Content privacy assessment result
 */
export interface ContentPrivacyAssessment {
  readonly privacyLevel: 'PUBLIC' | 'PERSONAL' | 'SENSITIVE' | 'CONFIDENTIAL' | 'PRIVATE';
  readonly detectedContentTypes: string[];
  readonly sensitiveDataFound: {
    personalInfo: boolean;
    financialData: boolean;
    medicalInfo: boolean;
    businessDocuments: boolean;
    personalCommunications: boolean;
    credentials: boolean;
  };
  readonly requiresUserConsent: boolean;
  readonly blockedByDefault: boolean;
  readonly recommendedAction: 'ALLOW' | 'REQUIRE_CONSENT' | 'REQUIRE_APPROVAL' | 'BLOCK';
  readonly privacyRisks: string[];
  readonly mitigationStrategies: string[];
}

/**
 * Screen analysis result interface
 */
export interface ScreenAnalysisResult {
  readonly contentAnalyzed: boolean;
  readonly ocrPerformed: boolean;
  readonly elementsDetected: number;
  readonly privacyAssessment: ContentPrivacyAssessment;
  readonly accessibilityFeatures: {
    textElementsFound: number;
    interactiveElementsFound: number;
    readabilityScore: number;
    contrastScore: number;
  };
  readonly processingTimeMs: number;
}

/**
 * Visual element detection result
 */
export interface VisualElementDetection {
  readonly elements: Array<{
    type: 'BUTTON' | 'LINK' | 'INPUT' | 'TEXT' | 'IMAGE' | 'MENU' | 'DIALOG' | 'UNKNOWN';
    coordinates: { x: number; y: number; width: number; height: number };
    confidence: number;
    text?: string;
    isInteractive: boolean;
    accessibilityRole?: string;
  }>;
  readonly confidence: number;
  readonly processingTimeMs: number;
}

// ===== ENHANCED SCREEN CAPTURE VALIDATION SERVICE =====

@Injectable()
export class EnhancedScreenCaptureValidationService {
  private readonly logger = new Logger(EnhancedScreenCaptureValidationService.name);

  // Privacy consent cache
  private readonly consentCache = new Map<string, {
    userId: string;
    granted: boolean;
    timestamp: Date;
    expiryMinutes: number;
    privacyLevel: string;
  }>();

  // Performance metrics
  private readonly performanceMetrics = {
    totalScreenCaptures: 0,
    totalContentAnalyses: 0,
    averageValidationTime: 0,
    privacyBlockedOperations: 0,
    consentGrantedOperations: 0,
    cacheHitRate: 0,
    sub100msOperations: 0,
    sub200msOperations: 0,
    sub300msOperations: 0,
  };

  constructor(
    private readonly parlantIntegrationService: ParlantIntegrationService
  ) {
    this.logger.log('Enhanced Screen Capture Validation Service initialized');

    // Consent cache cleanup
    setInterval(() => this.cleanupConsentCache(), 300000); // Every 5 minutes

    // Performance metrics logging
    setInterval(() => this.logPerformanceMetrics(), 300000); // Every 5 minutes
  }

  // ===== SCREENSHOT VALIDATION =====

  /**
   * Validate screenshot capture with privacy assessment
   */
  async validateScreenshotCapture(
    context: ScreenCaptureValidationContext
  ): Promise<boolean> {
    const operationId = `screenshot_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.performanceMetrics.totalScreenCaptures++;

      // Fast-path: Check existing consent
      const consentKey = this.generateConsentKey(context.userId, 'screenshot');
      const existingConsent = this.getValidConsent(consentKey);

      if (existingConsent && existingConsent.granted) {
        this.updatePerformanceMetrics(Date.now() - startTime, true);
        return true;
      }

      // Privacy assessment for screen content
      const privacyAssessment = await this.assessScreenPrivacy(context);

      // Handle based on privacy level
      switch (privacyAssessment.privacyLevel) {
        case 'PUBLIC':
          // Public content - allow with minimal validation
          this.setCachedConsent(consentKey, true, 30); // 30 minute cache
          this.updatePerformanceMetrics(Date.now() - startTime, false);
          return true;

        case 'PERSONAL':
          // Personal content - require consent
          return await this.validateWithUserConsent(operationId, privacyAssessment, context, startTime);

        case 'SENSITIVE':
        case 'CONFIDENTIAL':
          // Sensitive content - require explicit approval
          return await this.validateWithExplicitApproval(operationId, privacyAssessment, context, startTime);

        case 'PRIVATE':
          // Private content - blocked by default
          this.performanceMetrics.privacyBlockedOperations++;
          this.logger.warn(`[${operationId}] Screenshot blocked due to private content detection`, {
            operationId,
            privacyLevel: privacyAssessment.privacyLevel,
            detectedContent: privacyAssessment.detectedContentTypes,
          });
          return false;

        default:
          // Unknown privacy level - require approval
          return await this.validateWithExplicitApproval(operationId, privacyAssessment, context, startTime);
      }

    } catch (error) {
      this.logger.error(`[${operationId}] Screenshot validation failed`, {
        operationId,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Validate screen content analysis operations
   */
  async validateScreenAnalysis(
    analysisType: 'OCR' | 'ELEMENT_DETECTION' | 'ACCESSIBILITY_SCAN' | 'CONTENT_ANALYSIS',
    context: ScreenCaptureValidationContext
  ): Promise<boolean> {
    const operationId = `analysis_${analysisType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.performanceMetrics.totalContentAnalyses++;

      // Check if content analysis is allowed by user preferences
      if (!context.privacySettings.allowContentAnalysis) {
        this.logger.warn(`[${operationId}] Screen analysis blocked by user privacy settings`, {
          operationId,
          analysisType,
          userId: context.userId,
        });
        return false;
      }

      // OCR requires additional consent
      if (analysisType === 'OCR' && !context.privacySettings.allowOCRProcessing) {
        return await this.validateOCRConsent(operationId, context, startTime);
      }

      // Accessibility scans are generally allowed for accessibility users
      if (analysisType === 'ACCESSIBILITY_SCAN' && context.accessibilityContext.userAccessibilityNeeds.length > 0) {
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // General content analysis validation
      const validationRequest: ParlantValidationRequest = {
        functionName: `ScreenCapture.${analysisType.toLowerCase()}`,
        functionParams: {
          analysisType,
          allowContentAnalysis: context.privacySettings.allowContentAnalysis,
          allowOCRProcessing: context.privacySettings.allowOCRProcessing,
        },
        actionDescription: this.generateAnalysisDescription(analysisType, context),
        context: context,
        riskLevel: this.determineAnalysisRiskLevel(analysisType, context),
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 300),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;

    } catch (error) {
      this.logger.error(`[${operationId}] Screen analysis validation failed`, {
        operationId,
        analysisType,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Validate visual element detection operations
   */
  async validateElementDetection(
    targetElementTypes: string[],
    context: ScreenCaptureValidationContext
  ): Promise<boolean> {
    const operationId = `element_detection_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Element detection for accessibility is generally allowed
      if (this.isAccessibilityElementDetection(targetElementTypes, context)) {
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // General element detection validation
      const riskLevel = this.assessElementDetectionRisk(targetElementTypes, context);

      const validationRequest: ParlantValidationRequest = {
        functionName: `ScreenCapture.detectElements`,
        functionParams: {
          targetElements: targetElementTypes,
          accessibilityContext: context.accessibilityContext,
        },
        actionDescription: `Detect ${targetElementTypes.join(', ')} elements on screen for ${this.inferDetectionPurpose(targetElementTypes)}`,
        context: context,
        riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 200),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;

    } catch (error) {
      this.logger.error(`[${operationId}] Element detection validation failed`, {
        operationId,
        targetElements: targetElementTypes,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  // ===== PRIVACY ASSESSMENT METHODS =====

  /**
   * Assess privacy level of current screen content
   */
  private async assessScreenPrivacy(context: ScreenCaptureValidationContext): Promise<ContentPrivacyAssessment> {
    const startTime = Date.now();

    try {
      // Use application context and window title for privacy assessment
      const appContext = context.activeApplication?.toLowerCase() || '';
      const windowTitle = context.windowTitle?.toLowerCase() || '';

      const assessment: ContentPrivacyAssessment = {
        privacyLevel: 'PUBLIC',
        detectedContentTypes: [],
        sensitiveDataFound: {
          personalInfo: false,
          financialData: false,
          medicalInfo: false,
          businessDocuments: false,
          personalCommunications: false,
          credentials: false,
        },
        requiresUserConsent: false,
        blockedByDefault: false,
        recommendedAction: 'ALLOW',
        privacyRisks: [],
        mitigationStrategies: [],
      };

      // Assess based on application context
      this.assessApplicationPrivacy(appContext, windowTitle, assessment);

      // Assess based on window patterns
      this.assessWindowPrivacy(windowTitle, assessment);

      // Determine final privacy level and recommendations
      this.finalizePrivacyAssessment(assessment);

      this.logger.debug('Screen privacy assessment completed', {
        privacyLevel: assessment.privacyLevel,
        detectedContent: assessment.detectedContentTypes,
        processingTime: Date.now() - startTime,
      });

      return assessment;

    } catch (error) {
      this.logger.error('Screen privacy assessment failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail-safe: assume sensitive content
      return {
        privacyLevel: 'SENSITIVE',
        detectedContentTypes: ['unknown'],
        sensitiveDataFound: {
          personalInfo: true,
          financialData: false,
          medicalInfo: false,
          businessDocuments: false,
          personalCommunications: false,
          credentials: false,
        },
        requiresUserConsent: true,
        blockedByDefault: false,
        recommendedAction: 'REQUIRE_APPROVAL',
        privacyRisks: ['unknown_content_assessment_failed'],
        mitigationStrategies: ['manual_review_required'],
      };
    }
  }

  /**
   * Assess application-specific privacy concerns
   */
  private assessApplicationPrivacy(appContext: string, windowTitle: string, assessment: ContentPrivacyAssessment): void {
    // Financial applications
    const financialApps = ['bank', 'finance', 'wallet', 'payment', 'quickbooks', 'mint', 'credit', 'investment'];
    if (financialApps.some(app => appContext.includes(app) || windowTitle.includes(app))) {
      assessment.sensitiveDataFound.financialData = true;
      assessment.detectedContentTypes.push('financial_application');
      assessment.privacyLevel = 'SENSITIVE';
    }

    // Medical applications
    const medicalApps = ['health', 'medical', 'doctor', 'patient', 'clinic', 'hospital', 'prescription'];
    if (medicalApps.some(app => appContext.includes(app) || windowTitle.includes(app))) {
      assessment.sensitiveDataFound.medicalInfo = true;
      assessment.detectedContentTypes.push('medical_application');
      assessment.privacyLevel = 'CONFIDENTIAL';
    }

    // Communication applications
    const commApps = ['mail', 'message', 'chat', 'telegram', 'whatsapp', 'slack', 'teams', 'zoom', 'skype'];
    if (commApps.some(app => appContext.includes(app) || windowTitle.includes(app))) {
      assessment.sensitiveDataFound.personalCommunications = true;
      assessment.detectedContentTypes.push('communication_application');
      assessment.privacyLevel = assessment.privacyLevel === 'PUBLIC' ? 'PERSONAL' : assessment.privacyLevel;
    }

    // Password managers and authentication
    const authApps = ['password', 'keychain', 'bitwarden', 'lastpass', '1password', 'authenticator'];
    if (authApps.some(app => appContext.includes(app) || windowTitle.includes(app))) {
      assessment.sensitiveDataFound.credentials = true;
      assessment.detectedContentTypes.push('authentication_application');
      assessment.privacyLevel = 'PRIVATE';
      assessment.blockedByDefault = true;
    }

    // Business applications
    const businessApps = ['office', 'word', 'excel', 'powerpoint', 'google docs', 'sheets', 'slides', 'confluence'];
    if (businessApps.some(app => appContext.includes(app) || windowTitle.includes(app))) {
      assessment.sensitiveDataFound.businessDocuments = true;
      assessment.detectedContentTypes.push('business_application');
      assessment.privacyLevel = assessment.privacyLevel === 'PUBLIC' ? 'CONFIDENTIAL' : assessment.privacyLevel;
    }
  }

  /**
   * Assess window title patterns for privacy concerns
   */
  private assessWindowPrivacy(windowTitle: string, assessment: ContentPrivacyAssessment): void {
    // Check for sensitive patterns in window titles
    const sensitivePatterns = [
      { pattern: /password/i, type: 'credentials' },
      { pattern: /login/i, type: 'authentication' },
      { pattern: /account/i, type: 'personal_info' },
      { pattern: /private/i, type: 'private_content' },
      { pattern: /confidential/i, type: 'confidential_content' },
      { pattern: /ssn|social security/i, type: 'personal_info' },
      { pattern: /credit card|bank account/i, type: 'financial_data' },
    ];

    for (const { pattern, type } of sensitivePatterns) {
      if (pattern.test(windowTitle)) {
        assessment.detectedContentTypes.push(type);

        switch (type) {
          case 'credentials':
          case 'private_content':
            assessment.privacyLevel = 'PRIVATE';
            assessment.blockedByDefault = true;
            break;
          case 'financial_data':
            assessment.sensitiveDataFound.financialData = true;
            assessment.privacyLevel = 'SENSITIVE';
            break;
          case 'personal_info':
            assessment.sensitiveDataFound.personalInfo = true;
            assessment.privacyLevel = assessment.privacyLevel === 'PUBLIC' ? 'PERSONAL' : assessment.privacyLevel;
            break;
          case 'confidential_content':
            assessment.privacyLevel = 'CONFIDENTIAL';
            break;
        }
      }
    }
  }

  /**
   * Finalize privacy assessment with recommendations
   */
  private finalizePrivacyAssessment(assessment: ContentPrivacyAssessment): void {
    // Set requirements based on privacy level
    switch (assessment.privacyLevel) {
      case 'PUBLIC':
        assessment.recommendedAction = 'ALLOW';
        break;
      case 'PERSONAL':
        assessment.requiresUserConsent = true;
        assessment.recommendedAction = 'REQUIRE_CONSENT';
        assessment.privacyRisks.push('personal_content_exposure');
        assessment.mitigationStrategies.push('user_consent_required');
        break;
      case 'SENSITIVE':
        assessment.requiresUserConsent = true;
        assessment.recommendedAction = 'REQUIRE_APPROVAL';
        assessment.privacyRisks.push('sensitive_data_exposure', 'compliance_violation');
        assessment.mitigationStrategies.push('explicit_approval_required', 'audit_logging');
        break;
      case 'CONFIDENTIAL':
        assessment.requiresUserConsent = true;
        assessment.recommendedAction = 'REQUIRE_APPROVAL';
        assessment.privacyRisks.push('confidential_data_exposure', 'business_impact', 'legal_compliance');
        assessment.mitigationStrategies.push('multi_step_approval', 'comprehensive_audit', 'legal_review');
        break;
      case 'PRIVATE':
        assessment.blockedByDefault = true;
        assessment.recommendedAction = 'BLOCK';
        assessment.privacyRisks.push('credential_exposure', 'identity_theft', 'account_compromise');
        assessment.mitigationStrategies.push('operation_blocked', 'user_notification', 'security_alert');
        break;
    }
  }

  // ===== CONSENT MANAGEMENT =====

  /**
   * Validate with user consent for personal content
   */
  private async validateWithUserConsent(
    operationId: string,
    privacyAssessment: ContentPrivacyAssessment,
    context: ScreenCaptureValidationContext,
    startTime: number
  ): Promise<boolean> {
    const validationRequest: ParlantValidationRequest = {
      functionName: 'ScreenCapture.screenshot',
      functionParams: {
        privacyLevel: privacyAssessment.privacyLevel,
        detectedContent: privacyAssessment.detectedContentTypes,
        sensitiveData: privacyAssessment.sensitiveDataFound,
      },
      actionDescription: `Capture screenshot containing ${privacyAssessment.privacyLevel.toLowerCase()} content: ${privacyAssessment.detectedContentTypes.join(', ')}`,
      context: context,
      riskLevel: RiskLevel._MODERATE,
      operationId,
      performanceRequirements: {
        maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 500),
        requiresRealtime: false,
      },
    };

    const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

    if (validationResponse.approved) {
      this.performanceMetrics.consentGrantedOperations++;

      // Cache consent for this privacy level
      const consentKey = this.generateConsentKey(context.userId, privacyAssessment.privacyLevel);
      this.setCachedConsent(consentKey, true, context.privacySettings.consentExpiryMinutes);
    }

    this.updatePerformanceMetrics(Date.now() - startTime, false);
    return validationResponse.approved;
  }

  /**
   * Validate with explicit approval for sensitive/confidential content
   */
  private async validateWithExplicitApproval(
    operationId: string,
    privacyAssessment: ContentPrivacyAssessment,
    context: ScreenCaptureValidationContext,
    startTime: number
  ): Promise<boolean> {
    const validationRequest: ParlantValidationRequest = {
      functionName: 'ScreenCapture.screenshot',
      functionParams: {
        privacyLevel: privacyAssessment.privacyLevel,
        detectedContent: privacyAssessment.detectedContentTypes,
        sensitiveData: privacyAssessment.sensitiveDataFound,
        privacyRisks: privacyAssessment.privacyRisks,
        mitigationStrategies: privacyAssessment.mitigationStrategies,
      },
      actionDescription: `Capture screenshot containing ${privacyAssessment.privacyLevel.toLowerCase()} content with explicit privacy risks: ${privacyAssessment.privacyRisks.join(', ')}`,
      context: context,
      riskLevel: privacyAssessment.privacyLevel === 'CONFIDENTIAL' ? RiskLevel._CRITICAL : RiskLevel._HIGH,
      operationId,
      performanceRequirements: {
        maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 500),
        requiresRealtime: false,
      },
    };

    const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

    if (validationResponse.approved) {
      this.performanceMetrics.consentGrantedOperations++;

      // Shorter cache for explicit approval
      const consentKey = this.generateConsentKey(context.userId, privacyAssessment.privacyLevel);
      this.setCachedConsent(consentKey, true, Math.min(context.privacySettings.consentExpiryMinutes, 15));
    }

    this.updatePerformanceMetrics(Date.now() - startTime, false);
    return validationResponse.approved;
  }

  /**
   * Validate OCR consent specifically
   */
  private async validateOCRConsent(
    operationId: string,
    context: ScreenCaptureValidationContext,
    startTime: number
  ): Promise<boolean> {
    const validationRequest: ParlantValidationRequest = {
      functionName: 'ScreenCapture.OCR',
      functionParams: {
        analysisType: 'OCR',
        privacySettings: context.privacySettings,
      },
      actionDescription: 'Perform OCR text extraction on screen content - requires explicit consent for text privacy',
      context: context,
      riskLevel: RiskLevel._HIGH, // OCR can extract sensitive text
      operationId,
      performanceRequirements: {
        maxValidationTimeMs: Math.min(context.performanceRequirements.maxValidationTimeMs, 300),
        requiresRealtime: false,
      },
    };

    const validationResponse = await this.parlantIntegrationService.validateFunctionExecution(validationRequest);

    this.updatePerformanceMetrics(Date.now() - startTime, false);
    return validationResponse.approved;
  }

  // ===== HELPER METHODS =====

  private generateConsentKey(userId: string, context: string): string {
    return `${userId}_${context}`;
  }

  private getValidConsent(key: string) {
    const consent = this.consentCache.get(key);
    if (!consent) return null;

    const expiryMs = consent.expiryMinutes * 60 * 1000;
    if (Date.now() - consent.timestamp.getTime() > expiryMs) {
      this.consentCache.delete(key);
      return null;
    }

    return consent;
  }

  private setCachedConsent(key: string, granted: boolean, expiryMinutes: number): void {
    this.consentCache.set(key, {
      userId: key.split('_')[0],
      granted,
      timestamp: new Date(),
      expiryMinutes,
      privacyLevel: key.split('_')[1],
    });
  }

  private cleanupConsentCache(): void {
    const now = Date.now();
    for (const [key, consent] of this.consentCache.entries()) {
      const expiryMs = consent.expiryMinutes * 60 * 1000;
      if (now - consent.timestamp.getTime() > expiryMs) {
        this.consentCache.delete(key);
      }
    }
  }

  private generateAnalysisDescription(analysisType: string, context: ScreenCaptureValidationContext): string {
    switch (analysisType) {
      case 'OCR':
        return 'Extract text from screen content using OCR technology';
      case 'ELEMENT_DETECTION':
        return 'Detect and identify UI elements on screen for automation';
      case 'ACCESSIBILITY_SCAN':
        return 'Scan screen for accessibility features and compliance';
      case 'CONTENT_ANALYSIS':
        return 'Analyze screen content for categorization and understanding';
      default:
        return `Perform ${analysisType.toLowerCase()} analysis on screen content`;
    }
  }

  private determineAnalysisRiskLevel(analysisType: string, context: ScreenCaptureValidationContext): RiskLevel {
    switch (analysisType) {
      case 'ACCESSIBILITY_SCAN':
        return RiskLevel._MINIMAL; // Accessibility scans are generally safe
      case 'ELEMENT_DETECTION':
        return RiskLevel._LOW; // Element detection for UI automation
      case 'CONTENT_ANALYSIS':
        return RiskLevel._MODERATE; // Content analysis may reveal sensitive information
      case 'OCR':
        return RiskLevel._HIGH; // OCR can extract all visible text including sensitive data
      default:
        return RiskLevel._MODERATE;
    }
  }

  private isAccessibilityElementDetection(targetElementTypes: string[], context: ScreenCaptureValidationContext): boolean {
    const accessibilityElements = ['button', 'link', 'input', 'text', 'heading', 'label'];
    const isAccessibilityUser = context.accessibilityContext.userAccessibilityNeeds.length > 0;
    const targetsAccessibilityElements = targetElementTypes.some(type =>
      accessibilityElements.includes(type.toLowerCase())
    );

    return isAccessibilityUser && targetsAccessibilityElements;
  }

  private assessElementDetectionRisk(targetElementTypes: string[], context: ScreenCaptureValidationContext): RiskLevel {
    // Lower risk for accessibility users
    if (this.isAccessibilityElementDetection(targetElementTypes, context)) {
      return RiskLevel._MINIMAL;
    }

    // Higher risk for system elements
    const systemElements = ['dialog', 'alert', 'menu', 'toolbar'];
    if (targetElementTypes.some(type => systemElements.includes(type.toLowerCase()))) {
      return RiskLevel._MODERATE;
    }

    return RiskLevel._LOW;
  }

  private inferDetectionPurpose(targetElementTypes: string[]): string {
    if (targetElementTypes.includes('button') || targetElementTypes.includes('link')) {
      return 'UI automation';
    }
    if (targetElementTypes.includes('text') || targetElementTypes.includes('heading')) {
      return 'content analysis';
    }
    if (targetElementTypes.includes('input')) {
      return 'form interaction';
    }
    return 'general automation';
  }

  // ===== PERFORMANCE TRACKING =====

  private updatePerformanceMetrics(durationMs: number, fromCache: boolean): void {
    if (fromCache) {
      this.performanceMetrics.cacheHitRate =
        (this.performanceMetrics.cacheHitRate * (this.performanceMetrics.totalScreenCaptures - 1) + 1) /
        this.performanceMetrics.totalScreenCaptures;
    } else {
      this.performanceMetrics.averageValidationTime =
        (this.performanceMetrics.averageValidationTime * (this.performanceMetrics.totalScreenCaptures - 1) + durationMs) /
        this.performanceMetrics.totalScreenCaptures;

      if (durationMs < 100) this.performanceMetrics.sub100msOperations++;
      if (durationMs < 200) this.performanceMetrics.sub200msOperations++;
      if (durationMs < 300) this.performanceMetrics.sub300msOperations++;
    }
  }

  private logPerformanceMetrics(): void {
    const { totalScreenCaptures, totalContentAnalyses } = this.performanceMetrics;
    const totalOperations = totalScreenCaptures + totalContentAnalyses;

    this.logger.log('Enhanced Screen Capture Validation Performance Metrics', {
      totalScreenCaptures,
      totalContentAnalyses,
      totalOperations,
      averageValidationTime: `${this.performanceMetrics.averageValidationTime.toFixed(2)}ms`,
      cacheHitRate: `${(this.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`,
      privacyBlockedRate: `${((this.performanceMetrics.privacyBlockedOperations / totalOperations) * 100).toFixed(1)}%`,
      consentGrantedRate: `${((this.performanceMetrics.consentGrantedOperations / totalOperations) * 100).toFixed(1)}%`,
      sub100msRate: `${((this.performanceMetrics.sub100msOperations / totalOperations) * 100).toFixed(1)}%`,
      sub200msRate: `${((this.performanceMetrics.sub200msOperations / totalOperations) * 100).toFixed(1)}%`,
      sub300msRate: `${((this.performanceMetrics.sub300msOperations / totalOperations) * 100).toFixed(1)}%`,
      consentCacheSize: this.consentCache.size,
    });
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  /**
   * Get privacy assessment for external monitoring
   */
  async getPrivacyAssessment(context: ScreenCaptureValidationContext): Promise<ContentPrivacyAssessment> {
    return await this.assessScreenPrivacy(context);
  }
}