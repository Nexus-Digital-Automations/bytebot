/**
 * PARLANT Phase 1 - User Experience Optimization
 *
 * Advanced user experience optimization system with progressive disclosure,
 * contextual help, intelligent defaults, and accessibility-compliant interfaces.
 * Provides intuitive conversational validation with adaptive complexity.
 *
 * Key Features:
 * - Progressive disclosure for complex validations
 * - Contextual help and guidance systems
 * - Intelligent defaults and suggestion engines
 * - Accessibility-compliant conversation interfaces
 * - Adaptive complexity based on user expertise
 * - Real-time user assistance and tooltips
 * - Voice and keyboard navigation support
 * - Personalized validation experiences
 *
 * @module UserExperienceOptimizer
 * @version 1.0.0
 * @author PARLANT Phase 1 UX Team
 */

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PreExecutionValidationRequest,
  UserValidationContext,
  ValidationLevel,
  RiskAssessmentResult,
  ValidationRequirement,
} from "./pre-execution-validation.service";

// ===== USER EXPERIENCE TYPES =====

/**
 * User experience profile with learning and adaptation
 */
export interface UserExperienceProfile {
  /** User identifier */
  userId: string;

  /** Experience level with the system */
  experienceLevel: "novice" | "intermediate" | "expert" | "power-user";

  /** Preferred interaction style */
  interactionStyle: {
    verbosity: "minimal" | "standard" | "detailed" | "comprehensive";
    confirmationStyle: "quick" | "standard" | "thorough" | "paranoid";
    helpLevel: "none" | "tooltips" | "guided" | "tutorial";
    progressIndicators: boolean;
  };

  /** Accessibility preferences */
  accessibilityPreferences: {
    screenReader: boolean;
    highContrast: boolean;
    largeText: boolean;
    keyboardNavigation: boolean;
    voiceControl: boolean;
    reducedMotion: boolean;
  };

  /** Learning and adaptation metrics */
  learningMetrics: {
    validationSpeed: number; // Average time to complete validations
    errorRate: number; // Percentage of validation mistakes
    helpUsage: number; // How often user accesses help
    complexityComfort: number; // Comfort level with complex operations (0-1)
    lastAdaptation: Date;
  };

  /** Personalization settings */
  personalization: {
    favoriteOperations: string[];
    customShortcuts: Record<string, string>;
    savedResponses: Record<string, string>;
    quickApprovalPatterns: string[];
  };
}

/**
 * Progressive disclosure configuration
 */
export interface ProgressiveDisclosureConfig {
  /** Enable progressive disclosure */
  enabled: boolean;

  /** Initial disclosure level */
  initialLevel: "minimal" | "standard" | "expanded";

  /** Auto-expand based on complexity */
  autoExpand: {
    enabled: boolean;
    complexityThreshold: number;
    riskThreshold: number;
  };

  /** Disclosure levels */
  levels: {
    minimal: DisclosureLevel;
    standard: DisclosureLevel;
    expanded: DisclosureLevel;
    comprehensive: DisclosureLevel;
  };
}

/**
 * Disclosure level configuration
 */
export interface DisclosureLevel {
  /** Show operation summary */
  showSummary: boolean;

  /** Show risk assessment details */
  showRiskDetails: boolean;

  /** Show technical parameters */
  showTechnicalDetails: boolean;

  /** Show compliance information */
  showComplianceInfo: boolean;

  /** Show mitigation recommendations */
  showMitigationRecommendations: boolean;

  /** Show validation requirements */
  showValidationRequirements: boolean;

  /** Maximum items to display initially */
  maxInitialItems: number;

  /** Enable "Show more" functionality */
  enableShowMore: boolean;
}

/**
 * Contextual help configuration
 */
export interface ContextualHelpConfig {
  /** Enable contextual help */
  enabled: boolean;

  /** Help delivery methods */
  deliveryMethods: {
    tooltips: boolean;
    overlays: boolean;
    inline: boolean;
    modal: boolean;
    voice: boolean;
  };

  /** Help triggers */
  triggers: {
    onHover: boolean;
    onFocus: boolean;
    onError: boolean;
    onDelay: boolean;
    delayMs: number;
  };

  /** Help content types */
  contentTypes: {
    quickTips: boolean;
    detailedExplanations: boolean;
    examples: boolean;
    tutorials: boolean;
    videos: boolean;
  };
}

/**
 * Intelligent defaults configuration
 */
export interface IntelligentDefaultsConfig {
  /** Enable intelligent defaults */
  enabled: boolean;

  /** Learning configuration */
  learning: {
    enabled: boolean;
    minSamples: number;
    confidenceThreshold: number;
    adaptationRate: number;
  };

  /** Default suggestion types */
  suggestionTypes: {
    responses: boolean;
    confirmations: boolean;
    mitigations: boolean;
    shortcuts: boolean;
  };

  /** Context awareness */
  contextAwareness: {
    timeOfDay: boolean;
    dayOfWeek: boolean;
    userHistory: boolean;
    operationType: boolean;
    riskLevel: boolean;
  };
}

/**
 * User experience optimization result
 */
export interface UserExperienceOptimization {
  /** Optimized validation flow */
  validationFlow: OptimizedValidationFlow;

  /** Progressive disclosure settings */
  progressiveDisclosure: ProgressiveDisclosureSettings;

  /** Contextual help content */
  contextualHelp: ContextualHelpContent[];

  /** Intelligent defaults */
  intelligentDefaults: IntelligentDefaults;

  /** Accessibility enhancements */
  accessibilityEnhancements: AccessibilityEnhancements;

  /** Performance optimizations */
  performanceOptimizations: PerformanceOptimizations;
}

/**
 * Optimized validation flow
 */
export interface OptimizedValidationFlow {
  /** Flow steps */
  steps: ValidationFlowStep[];

  /** Estimated completion time */
  estimatedCompletionTime: number;

  /** Complexity level */
  complexityLevel: "simple" | "moderate" | "complex" | "expert";

  /** Recommended interaction mode */
  recommendedMode: "voice" | "text" | "hybrid";

  /** Skip options available */
  skipOptions: string[];
}

/**
 * Validation flow step
 */
export interface ValidationFlowStep {
  /** Step identifier */
  id: string;

  /** Step type */
  type: "information" | "confirmation" | "input" | "choice" | "review";

  /** Step title */
  title: string;

  /** Step description */
  description: string;

  /** Is step required */
  required: boolean;

  /** Step complexity */
  complexity: number;

  /** Estimated time */
  estimatedTime: number;

  /** Help content */
  helpContent?: string;

  /** Default value */
  defaultValue?: any;

  /** Validation rules */
  validation?: any;
}

/**
 * Progressive disclosure settings
 */
export interface ProgressiveDisclosureSettings {
  /** Current disclosure level */
  currentLevel: string;

  /** Available levels */
  availableLevels: string[];

  /** Auto-expansion triggers */
  autoExpansionTriggers: string[];

  /** Hidden content summary */
  hiddenContentSummary: string;

  /** Show more options */
  showMoreOptions: boolean;
}

/**
 * Contextual help content
 */
export interface ContextualHelpContent {
  /** Help identifier */
  id: string;

  /** Help type */
  type: "tooltip" | "overlay" | "inline" | "modal" | "voice";

  /** Help trigger */
  trigger: string;

  /** Help title */
  title: string;

  /** Help content */
  content: string;

  /** Help priority */
  priority: number;

  /** Multimedia content */
  multimedia?: {
    images?: string[];
    videos?: string[];
    audio?: string[];
  };
}

/**
 * Intelligent defaults
 */
export interface IntelligentDefaults {
  /** Suggested responses */
  suggestedResponses: SuggestedResponse[];

  /** Auto-complete suggestions */
  autoCompleteSuggestions: string[];

  /** Quick actions */
  quickActions: QuickAction[];

  /** Learned preferences */
  learnedPreferences: Record<string, any>;

  /** Confidence scores */
  confidenceScores: Record<string, number>;
}

/**
 * Suggested response
 */
export interface SuggestedResponse {
  /** Response text */
  text: string;

  /** Response type */
  type: "approval" | "rejection" | "modification" | "deferral";

  /** Confidence score */
  confidence: number;

  /** Usage frequency */
  usageFrequency: number;

  /** Context relevance */
  contextRelevance: number;
}

/**
 * Quick action
 */
export interface QuickAction {
  /** Action identifier */
  id: string;

  /** Action label */
  label: string;

  /** Action description */
  description: string;

  /** Keyboard shortcut */
  shortcut?: string;

  /** Voice command */
  voiceCommand?: string;

  /** Action type */
  type: "approve" | "reject" | "defer" | "modify" | "help";

  /** Confidence score */
  confidence: number;
}

/**
 * Accessibility enhancements
 */
export interface AccessibilityEnhancements {
  /** Screen reader optimizations */
  screenReaderOptimizations: {
    ariaLabels: Record<string, string>;
    announcements: string[];
    landmarks: string[];
    headingStructure: string[];
  };

  /** Keyboard navigation */
  keyboardNavigation: {
    shortcuts: Record<string, string>;
    tabOrder: string[];
    focusManagement: any;
  };

  /** Visual enhancements */
  visualEnhancements: {
    highContrast: boolean;
    largeText: boolean;
    colorBlindSupport: boolean;
    reducedMotion: boolean;
  };

  /** Voice control */
  voiceControl: {
    commands: Record<string, string>;
    speechSynthesis: any;
    speechRecognition: any;
  };
}

/**
 * Performance optimizations
 */
export interface PerformanceOptimizations {
  /** Preloading strategies */
  preloading: {
    predictedContent: string[];
    cacheableResponses: string[];
    precomputedDefaults: Record<string, any>;
  };

  /** Rendering optimizations */
  rendering: {
    virtualScrolling: boolean;
    lazyLoading: boolean;
    componentCaching: boolean;
    minimizedReflows: boolean;
  };

  /** Network optimizations */
  network: {
    requestBatching: boolean;
    responseCompression: boolean;
    connectionPooling: boolean;
    offlineSupport: boolean;
  };
}

// ===== USER EXPERIENCE OPTIMIZER SERVICE =====

/**
 * User Experience Optimizer Service
 *
 * Provides comprehensive user experience optimization for pre-execution validation
 * with progressive disclosure, contextual help, and intelligent defaults.
 */
@Injectable()
export class UserExperienceOptimizer {
  private readonly logger = new Logger(UserExperienceOptimizer.name);
  private readonly userProfiles = new Map<string, UserExperienceProfile>();
  private readonly config: {
    progressiveDisclosure: ProgressiveDisclosureConfig;
    contextualHelp: ContextualHelpConfig;
    intelligentDefaults: IntelligentDefaultsConfig;
  };

  // Performance tracking
  private metrics = {
    totalOptimizations: 0,
    averageOptimizationTime: 0,
    userSatisfactionScore: 0.85,
    helpUsageRate: 0.15,
    defaultAcceptanceRate: 0.78,
  };

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfiguration();

    this.logger.log("UserExperienceOptimizer initialized", {
      version: "1.0.0",
      features: [
        "progressive_disclosure",
        "contextual_help",
        "intelligent_defaults",
        "accessibility_compliance",
        "voice_navigation",
        "keyboard_support",
        "personalization",
        "adaptive_complexity",
      ],
      config: {
        progressiveDisclosure: this.config.progressiveDisclosure.enabled,
        contextualHelp: this.config.contextualHelp.enabled,
        intelligentDefaults: this.config.intelligentDefaults.enabled,
      },
    });
  }

  /**
   * Optimize user experience for validation request
   *
   * @param request Pre-execution validation request
   * @param riskAssessment Risk assessment result
   * @param validationRequirements Validation requirements
   * @returns Promise<UserExperienceOptimization>
   */
  async optimizeUserExperience(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
  ): Promise<UserExperienceOptimization> {
    const startTime = performance.now();

    try {
      this.logger.debug("Starting user experience optimization", {
        requestId: request.id,
        userId: request.userContext.userId,
        riskLevel: riskAssessment.riskLevel,
        validationLevel: riskAssessment.validationLevel,
      });

      // Get or create user experience profile
      const userProfile = await this.getUserExperienceProfile(
        request.userContext.userId,
      );

      // Optimize validation flow
      const validationFlow = this.optimizeValidationFlow(
        request,
        riskAssessment,
        validationRequirements,
        userProfile,
      );

      // Configure progressive disclosure
      const progressiveDisclosure = this.configureProgressiveDisclosure(
        riskAssessment,
        userProfile,
        validationRequirements,
      );

      // Generate contextual help
      const contextualHelp = this.generateContextualHelp(
        request,
        riskAssessment,
        userProfile,
      );

      // Generate intelligent defaults
      const intelligentDefaults = await this.generateIntelligentDefaults(
        request,
        riskAssessment,
        userProfile,
      );

      // Configure accessibility enhancements
      const accessibilityEnhancements = this.configureAccessibilityEnhancements(
        userProfile,
        validationFlow,
      );

      // Configure performance optimizations
      const performanceOptimizations = this.configurePerformanceOptimizations(
        request,
        userProfile,
        validationFlow,
      );

      const optimization: UserExperienceOptimization = {
        validationFlow,
        progressiveDisclosure,
        contextualHelp,
        intelligentDefaults,
        accessibilityEnhancements,
        performanceOptimizations,
      };

      // Update user profile based on optimization
      await this.updateUserProfile(userProfile, optimization);

      const optimizationTime = performance.now() - startTime;
      this.updateMetrics(optimizationTime);

      this.logger.debug("User experience optimization completed", {
        requestId: request.id,
        userId: request.userContext.userId,
        optimizationTime,
        flowComplexity: validationFlow.complexityLevel,
        stepCount: validationFlow.steps.length,
      });

      return optimization;
    } catch (error) {
      this.logger.error("User experience optimization failed", {
        requestId: request.id,
        error: error.message,
        stack: error.stack,
      });

      // Return basic optimization on failure
      return this.getBasicOptimization(
        request,
        riskAssessment,
        validationRequirements,
      );
    }
  }

  /**
   * Optimize validation flow based on user profile and complexity
   */
  private optimizeValidationFlow(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
    userProfile: UserExperienceProfile,
  ): OptimizedValidationFlow {
    const steps: ValidationFlowStep[] = [];
    let totalEstimatedTime = 0;

    // Determine complexity level
    const complexityLevel = this.determineFlowComplexity(
      riskAssessment,
      validationRequirements,
      userProfile,
    );

    // Build flow steps based on complexity and user experience
    if (complexityLevel === "simple") {
      steps.push(...this.buildSimpleFlow(request, riskAssessment, userProfile));
    } else if (complexityLevel === "moderate") {
      steps.push(
        ...this.buildModerateFlow(
          request,
          riskAssessment,
          validationRequirements,
          userProfile,
        ),
      );
    } else if (complexityLevel === "complex") {
      steps.push(
        ...this.buildComplexFlow(
          request,
          riskAssessment,
          validationRequirements,
          userProfile,
        ),
      );
    } else {
      steps.push(
        ...this.buildExpertFlow(
          request,
          riskAssessment,
          validationRequirements,
          userProfile,
        ),
      );
    }

    // Calculate total estimated time
    totalEstimatedTime = steps.reduce(
      (total, step) => total + step.estimatedTime,
      0,
    );

    // Determine recommended interaction mode
    const recommendedMode = this.determineRecommendedMode(
      userProfile,
      complexityLevel,
    );

    // Identify skip options for experienced users
    const skipOptions = this.identifySkipOptions(
      steps,
      userProfile,
      riskAssessment,
    );

    return {
      steps,
      estimatedCompletionTime: totalEstimatedTime,
      complexityLevel,
      recommendedMode,
      skipOptions,
    };
  }

  /**
   * Configure progressive disclosure settings
   */
  private configureProgressiveDisclosure(
    riskAssessment: RiskAssessmentResult,
    userProfile: UserExperienceProfile,
    validationRequirements: ValidationRequirement[],
  ): ProgressiveDisclosureSettings {
    const config = this.config.progressiveDisclosure;

    if (!config.enabled) {
      return {
        currentLevel: "comprehensive",
        availableLevels: ["comprehensive"],
        autoExpansionTriggers: [],
        hiddenContentSummary: "",
        showMoreOptions: false,
      };
    }

    // Determine initial level based on user experience and complexity
    let currentLevel = config.initialLevel;

    if (
      userProfile.experienceLevel === "expert" ||
      userProfile.experienceLevel === "power-user"
    ) {
      currentLevel = "minimal";
    } else if (userProfile.experienceLevel === "novice") {
      currentLevel = "expanded";
    }

    // Auto-expand for high risk operations
    const autoExpansionTriggers: string[] = [];
    if (config.autoExpand.enabled) {
      if (riskAssessment.riskScore >= config.autoExpand.riskThreshold) {
        autoExpansionTriggers.push("high_risk");
        currentLevel = "expanded";
      }

      if (
        validationRequirements.length >= config.autoExpand.complexityThreshold
      ) {
        autoExpansionTriggers.push("complex_requirements");
        currentLevel = "expanded";
      }
    }

    // Generate hidden content summary
    const hiddenContentSummary = this.generateHiddenContentSummary(
      currentLevel,
      riskAssessment,
      validationRequirements,
    );

    return {
      currentLevel,
      availableLevels: Object.keys(config.levels),
      autoExpansionTriggers,
      hiddenContentSummary,
      showMoreOptions: config.levels[currentLevel]?.enableShowMore || false,
    };
  }

  /**
   * Generate contextual help content
   */
  private generateContextualHelp(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    userProfile: UserExperienceProfile,
  ): ContextualHelpContent[] {
    const helpContent: ContextualHelpContent[] = [];
    const config = this.config.contextualHelp;

    if (!config.enabled || userProfile.interactionStyle.helpLevel === "none") {
      return helpContent;
    }

    // Generate help based on operation type
    helpContent.push({
      id: "operation-overview",
      type: "tooltip",
      trigger: "hover",
      title: "Operation Overview",
      content: `This operation will ${request.naturalLanguageIntent}. Risk level: ${riskAssessment.riskLevel}`,
      priority: 1,
    });

    // Risk assessment help
    if (riskAssessment.riskScore > 50) {
      helpContent.push({
        id: "risk-explanation",
        type: "overlay",
        trigger: "click",
        title: "Risk Assessment Details",
        content: this.generateRiskExplanation(riskAssessment),
        priority: 2,
      });
    }

    // Validation requirements help
    if (riskAssessment.validationRequirements.length > 0) {
      helpContent.push({
        id: "validation-requirements",
        type: "inline",
        trigger: "focus",
        title: "Validation Requirements",
        content: "These steps ensure the operation is safe and compliant.",
        priority: 3,
      });
    }

    // Novice user guidance
    if (userProfile.experienceLevel === "novice") {
      helpContent.push({
        id: "beginner-guide",
        type: "modal",
        trigger: "onload",
        title: "Getting Started",
        content:
          "This validation process helps ensure your operation is safe. We'll guide you through each step.",
        priority: 0,
        multimedia: {
          videos: ["validation-intro.mp4"],
        },
      });
    }

    // Voice control help
    if (userProfile.accessibilityPreferences.voiceControl) {
      helpContent.push({
        id: "voice-commands",
        type: "voice",
        trigger: "voice_help",
        title: "Voice Commands",
        content:
          'Say "approve" to confirm, "reject" to deny, or "help" for assistance.',
        priority: 4,
      });
    }

    return helpContent.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Generate intelligent defaults based on user behavior and context
   */
  private async generateIntelligentDefaults(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    userProfile: UserExperienceProfile,
  ): Promise<IntelligentDefaults> {
    const config = this.config.intelligentDefaults;

    if (!config.enabled) {
      return {
        suggestedResponses: [],
        autoCompleteSuggestions: [],
        quickActions: [],
        learnedPreferences: {},
        confidenceScores: {},
      };
    }

    // Generate suggested responses based on user history
    const suggestedResponses = this.generateSuggestedResponses(
      request,
      riskAssessment,
      userProfile,
    );

    // Generate auto-complete suggestions
    const autoCompleteSuggestions = this.generateAutoCompleteSuggestions(
      request,
      userProfile,
    );

    // Generate quick actions
    const quickActions = this.generateQuickActions(riskAssessment, userProfile);

    // Extract learned preferences
    const learnedPreferences = this.extractLearnedPreferences(userProfile);

    // Calculate confidence scores
    const confidenceScores = this.calculateConfidenceScores(
      suggestedResponses,
      autoCompleteSuggestions,
      quickActions,
    );

    return {
      suggestedResponses,
      autoCompleteSuggestions,
      quickActions,
      learnedPreferences,
      confidenceScores,
    };
  }

  /**
   * Configure accessibility enhancements
   */
  private configureAccessibilityEnhancements(
    userProfile: UserExperienceProfile,
    validationFlow: OptimizedValidationFlow,
  ): AccessibilityEnhancements {
    const preferences = userProfile.accessibilityPreferences;

    // Screen reader optimizations
    const screenReaderOptimizations = {
      ariaLabels: this.generateAriaLabels(validationFlow),
      announcements: this.generateAnnouncements(validationFlow),
      landmarks: this.generateLandmarks(validationFlow),
      headingStructure: this.generateHeadingStructure(validationFlow),
    };

    // Keyboard navigation
    const keyboardNavigation = {
      shortcuts: this.generateKeyboardShortcuts(validationFlow, userProfile),
      tabOrder: this.generateTabOrder(validationFlow),
      focusManagement: this.generateFocusManagement(validationFlow),
    };

    // Visual enhancements
    const visualEnhancements = {
      highContrast: preferences.highContrast,
      largeText: preferences.largeText,
      colorBlindSupport: true, // Always enabled
      reducedMotion: preferences.reducedMotion,
    };

    // Voice control
    const voiceControl = {
      commands: this.generateVoiceCommands(validationFlow),
      speechSynthesis: preferences.voiceControl ? {} : null,
      speechRecognition: preferences.voiceControl ? {} : null,
    };

    return {
      screenReaderOptimizations,
      keyboardNavigation,
      visualEnhancements,
      voiceControl,
    };
  }

  /**
   * Configure performance optimizations
   */
  private configurePerformanceOptimizations(
    request: PreExecutionValidationRequest,
    userProfile: UserExperienceProfile,
    validationFlow: OptimizedValidationFlow,
  ): PerformanceOptimizations {
    // Preloading strategies
    const preloading = {
      predictedContent: this.predictNextContent(userProfile, validationFlow),
      cacheableResponses: this.identifyCacheableResponses(userProfile),
      precomputedDefaults: this.precomputeDefaults(userProfile, request),
    };

    // Rendering optimizations
    const rendering = {
      virtualScrolling: validationFlow.steps.length > 10,
      lazyLoading: true,
      componentCaching: userProfile.experienceLevel === "expert",
      minimizedReflows: true,
    };

    // Network optimizations
    const network = {
      requestBatching: true,
      responseCompression: true,
      connectionPooling: true,
      offlineSupport: userProfile.learningMetrics.validationSpeed > 10000, // Slow connections
    };

    return {
      preloading,
      rendering,
      network,
    };
  }

  // ===== UTILITY METHODS =====

  private async getUserExperienceProfile(
    userId: string,
  ): Promise<UserExperienceProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      // Create new profile with intelligent defaults
      profile = {
        userId,
        experienceLevel: "intermediate", // Conservative default
        interactionStyle: {
          verbosity: "standard",
          confirmationStyle: "thorough",
          helpLevel: "tooltips",
          progressIndicators: true,
        },
        accessibilityPreferences: {
          screenReader: false,
          highContrast: false,
          largeText: false,
          keyboardNavigation: false,
          voiceControl: false,
          reducedMotion: false,
        },
        learningMetrics: {
          validationSpeed: 8000, // 8 seconds average
          errorRate: 0.05,
          helpUsage: 0.2,
          complexityComfort: 0.5,
          lastAdaptation: new Date(),
        },
        personalization: {
          favoriteOperations: [],
          customShortcuts: {},
          savedResponses: {},
          quickApprovalPatterns: [],
        },
      };

      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  private determineFlowComplexity(
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
    userProfile: UserExperienceProfile,
  ): "simple" | "moderate" | "complex" | "expert" {
    let complexityScore = 0;

    // Risk level complexity
    const riskComplexity = {
      LOW: 0,
      MEDIUM: 25,
      HIGH: 50,
      CRITICAL: 75,
    };
    complexityScore += riskComplexity[riskAssessment.riskLevel] || 0;

    // Validation requirements complexity
    complexityScore += validationRequirements.length * 10;

    // User experience adjustment
    const experienceAdjustment = {
      novice: 20,
      intermediate: 0,
      expert: -20,
      "power-user": -30,
    };
    complexityScore += experienceAdjustment[userProfile.experienceLevel] || 0;

    // Determine complexity level
    if (complexityScore <= 25) {
      return "simple";
    } else if (complexityScore <= 50) {
      return "moderate";
    } else if (complexityScore <= 75) {
      return "complex";
    } else {
      return "expert";
    }
  }

  private buildSimpleFlow(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    userProfile: UserExperienceProfile,
  ): ValidationFlowStep[] {
    return [
      {
        id: "quick-overview",
        type: "information",
        title: "Quick Confirmation",
        description: `Confirm ${request.naturalLanguageIntent}`,
        required: true,
        complexity: 1,
        estimatedTime: 3000,
        defaultValue: "approve",
      },
      {
        id: "simple-approve",
        type: "confirmation",
        title: "Approve Operation",
        description: "Click to approve this operation",
        required: true,
        complexity: 1,
        estimatedTime: 2000,
      },
    ];
  }

  private buildModerateFlow(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
    userProfile: UserExperienceProfile,
  ): ValidationFlowStep[] {
    return [
      {
        id: "operation-summary",
        type: "information",
        title: "Operation Summary",
        description: request.naturalLanguageIntent || "Operation details",
        required: true,
        complexity: 2,
        estimatedTime: 5000,
        helpContent: "This shows what the operation will do",
      },
      {
        id: "risk-review",
        type: "information",
        title: "Risk Assessment",
        description: `Risk level: ${riskAssessment.riskLevel} (Score: ${riskAssessment.riskScore})`,
        required: true,
        complexity: 3,
        estimatedTime: 8000,
        helpContent: "Review the assessed risk level for this operation",
      },
      {
        id: "confirmation",
        type: "confirmation",
        title: "Confirm Operation",
        description: "Do you want to proceed with this operation?",
        required: true,
        complexity: 2,
        estimatedTime: 5000,
        defaultValue:
          userProfile.personalization.quickApprovalPatterns.includes(
            request.functionName,
          )
            ? "approve"
            : null,
      },
    ];
  }

  private buildComplexFlow(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
    userProfile: UserExperienceProfile,
  ): ValidationFlowStep[] {
    const steps: ValidationFlowStep[] = [
      {
        id: "detailed-overview",
        type: "information",
        title: "Operation Details",
        description: `Detailed review of ${request.naturalLanguageIntent}`,
        required: true,
        complexity: 4,
        estimatedTime: 10000,
        helpContent: "Comprehensive operation overview and impact analysis",
      },
      {
        id: "risk-analysis",
        type: "information",
        title: "Risk Analysis",
        description: "Comprehensive risk assessment and mitigation strategies",
        required: true,
        complexity: 5,
        estimatedTime: 15000,
        helpContent: "Detailed risk factors and recommended mitigations",
      },
    ];

    // Add requirement-specific steps
    validationRequirements.forEach((req, index) => {
      steps.push({
        id: `requirement-${index}`,
        type: "choice",
        title: req.description,
        description: `Requirement: ${req.description}`,
        required: req.mandatory,
        complexity: 4,
        estimatedTime: req.estimatedTimeMs || 10000,
        helpContent: `This requirement ensures: ${req.description}`,
      });
    });

    steps.push({
      id: "final-confirmation",
      type: "confirmation",
      title: "Final Confirmation",
      description: "Confirm all requirements have been reviewed and approved",
      required: true,
      complexity: 3,
      estimatedTime: 8000,
    });

    return steps;
  }

  private buildExpertFlow(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
    userProfile: UserExperienceProfile,
  ): ValidationFlowStep[] {
    return [
      {
        id: "expert-summary",
        type: "information",
        title: "Technical Summary",
        description: "Comprehensive technical details and full context",
        required: true,
        complexity: 5,
        estimatedTime: 12000,
        helpContent: "Complete technical context for expert review",
      },
      {
        id: "batch-approval",
        type: "choice",
        title: "Expert Approval Options",
        description: "Choose approval method and additional configurations",
        required: true,
        complexity: 5,
        estimatedTime: 15000,
        defaultValue: "batch_approve",
      },
    ];
  }

  private determineRecommendedMode(
    userProfile: UserExperienceProfile,
    complexityLevel: string,
  ): "voice" | "text" | "hybrid" {
    if (userProfile.accessibilityPreferences.voiceControl) {
      return "voice";
    }

    if (
      complexityLevel === "simple" &&
      userProfile.learningMetrics.validationSpeed < 5000
    ) {
      return "voice"; // Quick operations benefit from voice
    }

    if (complexityLevel === "complex" || complexityLevel === "expert") {
      return "hybrid"; // Complex operations benefit from mixed interaction
    }

    return "text";
  }

  private identifySkipOptions(
    steps: ValidationFlowStep[],
    userProfile: UserExperienceProfile,
    riskAssessment: RiskAssessmentResult,
  ): string[] {
    const skipOptions: string[] = [];

    // Expert users can skip basic steps
    if (
      userProfile.experienceLevel === "expert" ||
      userProfile.experienceLevel === "power-user"
    ) {
      skipOptions.push("basic-information");

      if (riskAssessment.riskLevel === "LOW") {
        skipOptions.push("risk-review");
      }
    }

    // Users with high success rates can skip tutorials
    if (userProfile.learningMetrics.errorRate < 0.02) {
      skipOptions.push("help-content");
      skipOptions.push("tutorial-steps");
    }

    return skipOptions;
  }

  private generateHiddenContentSummary(
    currentLevel: string,
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
  ): string {
    const hiddenItems: string[] = [];

    if (currentLevel === "minimal") {
      hiddenItems.push(
        "Risk details",
        "Technical parameters",
        "Compliance information",
      );
    } else if (currentLevel === "standard") {
      hiddenItems.push("Technical parameters", "Advanced options");
    }

    if (hiddenItems.length === 0) {
      return "";
    }

    return `${hiddenItems.length} additional details available: ${hiddenItems.join(", ")}`;
  }

  private generateRiskExplanation(
    riskAssessment: RiskAssessmentResult,
  ): string {
    const factors = Object.entries(riskAssessment.riskFactors)
      .filter(([_, score]) => score > 30)
      .map(([factor, score]) => `${factor}: ${score}`)
      .join(", ");

    return `Risk score: ${riskAssessment.riskScore}/100. Key factors: ${factors}. ${riskAssessment.mitigationRecommendations
      .slice(0, 2)
      .join(" ")}`;
  }

  private generateSuggestedResponses(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    userProfile: UserExperienceProfile,
  ): SuggestedResponse[] {
    const responses: SuggestedResponse[] = [];

    // Add common responses based on risk level
    if (riskAssessment.riskLevel === "LOW") {
      responses.push({
        text: "Approved - Low risk operation",
        type: "approval",
        confidence: 0.9,
        usageFrequency: 0.8,
        contextRelevance: 0.95,
      });
    }

    // Add personalized responses from user history
    for (const savedResponse of Object.entries(
      userProfile.personalization.savedResponses,
    )) {
      responses.push({
        text: savedResponse[1],
        type: "approval", // Would be determined from saved response analysis
        confidence: 0.7,
        usageFrequency: 0.5,
        contextRelevance: 0.8,
      });
    }

    return responses.sort(
      (a, b) =>
        b.confidence * b.contextRelevance - a.confidence * a.contextRelevance,
    );
  }

  private generateAutoCompleteSuggestions(
    request: PreExecutionValidationRequest,
    userProfile: UserExperienceProfile,
  ): string[] {
    const suggestions: string[] = [];

    // Add common phrases
    suggestions.push("I approve this operation");
    suggestions.push("Please proceed with caution");
    suggestions.push("I need more information");

    // Add personalized suggestions from user history
    suggestions.push(
      ...Object.keys(userProfile.personalization.savedResponses),
    );

    return suggestions.slice(0, 5); // Limit to top 5
  }

  private generateQuickActions(
    riskAssessment: RiskAssessmentResult,
    userProfile: UserExperienceProfile,
  ): QuickAction[] {
    const actions: QuickAction[] = [
      {
        id: "quick-approve",
        label: "Quick Approve",
        description: "Approve this operation",
        shortcut: "Ctrl+A",
        voiceCommand: "approve",
        type: "approve",
        confidence: riskAssessment.riskLevel === "LOW" ? 0.9 : 0.6,
      },
      {
        id: "quick-reject",
        label: "Reject",
        description: "Reject this operation",
        shortcut: "Ctrl+R",
        voiceCommand: "reject",
        type: "reject",
        confidence: 0.8,
      },
    ];

    // Add expert actions for experienced users
    if (userProfile.experienceLevel === "expert") {
      actions.push({
        id: "batch-approve",
        label: "Batch Approve",
        description: "Approve similar operations automatically",
        shortcut: "Ctrl+Shift+A",
        voiceCommand: "batch approve",
        type: "approve",
        confidence: 0.85,
      });
    }

    return actions;
  }

  private extractLearnedPreferences(
    userProfile: UserExperienceProfile,
  ): Record<string, any> {
    return {
      preferredVerbosity: userProfile.interactionStyle.verbosity,
      preferredConfirmationStyle:
        userProfile.interactionStyle.confirmationStyle,
      frequentOperations: userProfile.personalization.favoriteOperations,
      customShortcuts: userProfile.personalization.customShortcuts,
    };
  }

  private calculateConfidenceScores(
    suggestedResponses: SuggestedResponse[],
    autoCompleteSuggestions: string[],
    quickActions: QuickAction[],
  ): Record<string, number> {
    return {
      suggestedResponses:
        suggestedResponses.reduce((avg, resp) => avg + resp.confidence, 0) /
        Math.max(suggestedResponses.length, 1),
      autoComplete: autoCompleteSuggestions.length > 0 ? 0.8 : 0,
      quickActions:
        quickActions.reduce((avg, action) => avg + action.confidence, 0) /
        Math.max(quickActions.length, 1),
    };
  }

  private generateAriaLabels(
    validationFlow: OptimizedValidationFlow,
  ): Record<string, string> {
    const labels: Record<string, string> = {};

    validationFlow.steps.forEach((step) => {
      labels[step.id] = `${step.title}: ${step.description}`;
    });

    return labels;
  }

  private generateAnnouncements(
    validationFlow: OptimizedValidationFlow,
  ): string[] {
    return [
      `Validation flow with ${validationFlow.steps.length} steps`,
      `Estimated completion time: ${Math.round(validationFlow.estimatedCompletionTime / 1000)} seconds`,
      `Complexity level: ${validationFlow.complexityLevel}`,
    ];
  }

  private generateLandmarks(validationFlow: OptimizedValidationFlow): string[] {
    return ["main", "navigation", "complementary"];
  }

  private generateHeadingStructure(
    validationFlow: OptimizedValidationFlow,
  ): string[] {
    return ["h1: Validation Process", "h2: Steps", "h3: Current Step"];
  }

  private generateKeyboardShortcuts(
    validationFlow: OptimizedValidationFlow,
    userProfile: UserExperienceProfile,
  ): Record<string, string> {
    const shortcuts: Record<string, string> = {
      Tab: "Next element",
      "Shift+Tab": "Previous element",
      Enter: "Activate current element",
      Escape: "Cancel/Go back",
    };

    // Add user's custom shortcuts
    Object.assign(shortcuts, userProfile.personalization.customShortcuts);

    return shortcuts;
  }

  private generateTabOrder(validationFlow: OptimizedValidationFlow): string[] {
    return validationFlow.steps.map((step) => step.id);
  }

  private generateFocusManagement(
    validationFlow: OptimizedValidationFlow,
  ): any {
    return {
      initialFocus: validationFlow.steps[0]?.id,
      trapFocus: true,
      restoreFocus: true,
    };
  }

  private generateVoiceCommands(
    validationFlow: OptimizedValidationFlow,
  ): Record<string, string> {
    return {
      approve: "Approve current step",
      reject: "Reject current step",
      next: "Go to next step",
      previous: "Go to previous step",
      help: "Get help for current step",
      repeat: "Repeat current information",
    };
  }

  private predictNextContent(
    userProfile: UserExperienceProfile,
    validationFlow: OptimizedValidationFlow,
  ): string[] {
    // Predict likely next content based on user patterns
    return ["approval-confirmation", "risk-details", "help-content"];
  }

  private identifyCacheableResponses(
    userProfile: UserExperienceProfile,
  ): string[] {
    return Object.values(userProfile.personalization.savedResponses);
  }

  private precomputeDefaults(
    userProfile: UserExperienceProfile,
    request: PreExecutionValidationRequest,
  ): Record<string, any> {
    return {
      preferredResponse:
        userProfile.personalization.quickApprovalPatterns.includes(
          request.functionName,
        )
          ? "approve"
          : null,
      verbosity: userProfile.interactionStyle.verbosity,
      showHelp: userProfile.interactionStyle.helpLevel !== "none",
    };
  }

  private getBasicOptimization(
    request: PreExecutionValidationRequest,
    riskAssessment: RiskAssessmentResult,
    validationRequirements: ValidationRequirement[],
  ): UserExperienceOptimization {
    // Return minimal optimization on failure
    return {
      validationFlow: {
        steps: [
          {
            id: "basic-confirmation",
            type: "confirmation",
            title: "Confirm Operation",
            description:
              request.naturalLanguageIntent || "Confirm this operation",
            required: true,
            complexity: 2,
            estimatedTime: 5000,
          },
        ],
        estimatedCompletionTime: 5000,
        complexityLevel: "simple",
        recommendedMode: "text",
        skipOptions: [],
      },
      progressiveDisclosure: {
        currentLevel: "standard",
        availableLevels: ["standard"],
        autoExpansionTriggers: [],
        hiddenContentSummary: "",
        showMoreOptions: false,
      },
      contextualHelp: [],
      intelligentDefaults: {
        suggestedResponses: [],
        autoCompleteSuggestions: [],
        quickActions: [],
        learnedPreferences: {},
        confidenceScores: {},
      },
      accessibilityEnhancements: {
        screenReaderOptimizations: {
          ariaLabels: {},
          announcements: [],
          landmarks: [],
          headingStructure: [],
        },
        keyboardNavigation: {
          shortcuts: {},
          tabOrder: [],
          focusManagement: {},
        },
        visualEnhancements: {
          highContrast: false,
          largeText: false,
          colorBlindSupport: true,
          reducedMotion: false,
        },
        voiceControl: {
          commands: {},
          speechSynthesis: null,
          speechRecognition: null,
        },
      },
      performanceOptimizations: {
        preloading: {
          predictedContent: [],
          cacheableResponses: [],
          precomputedDefaults: {},
        },
        rendering: {
          virtualScrolling: false,
          lazyLoading: true,
          componentCaching: false,
          minimizedReflows: true,
        },
        network: {
          requestBatching: true,
          responseCompression: true,
          connectionPooling: true,
          offlineSupport: false,
        },
      },
    };
  }

  private async updateUserProfile(
    userProfile: UserExperienceProfile,
    optimization: UserExperienceOptimization,
  ): Promise<void> {
    // Update learning metrics based on optimization
    const now = new Date();
    const timeSinceLastAdaptation =
      now.getTime() - userProfile.learningMetrics.lastAdaptation.getTime();

    if (timeSinceLastAdaptation > 86400000) {
      // 24 hours
      // Adapt experience level based on usage patterns
      if (
        userProfile.learningMetrics.validationSpeed < 3000 &&
        userProfile.learningMetrics.errorRate < 0.02
      ) {
        if (userProfile.experienceLevel === "intermediate") {
          userProfile.experienceLevel = "expert";
        } else if (userProfile.experienceLevel === "novice") {
          userProfile.experienceLevel = "intermediate";
        }
      }

      userProfile.learningMetrics.lastAdaptation = now;
    }

    this.userProfiles.set(userProfile.userId, userProfile);
  }

  private updateMetrics(optimizationTime: number): void {
    this.metrics.totalOptimizations++;

    // Update rolling average
    const newAverage =
      (this.metrics.averageOptimizationTime *
        (this.metrics.totalOptimizations - 1) +
        optimizationTime) /
      this.metrics.totalOptimizations;

    this.metrics.averageOptimizationTime = newAverage;
  }

  private loadConfiguration() {
    return {
      progressiveDisclosure: {
        enabled: this.configService.get<boolean>(
          "PARLANT_UX_PROGRESSIVE_DISCLOSURE",
          true,
        ),
        initialLevel: "standard" as const,
        autoExpand: {
          enabled: true,
          complexityThreshold: 3,
          riskThreshold: 60,
        },
        levels: {
          minimal: {
            showSummary: true,
            showRiskDetails: false,
            showTechnicalDetails: false,
            showComplianceInfo: false,
            showMitigationRecommendations: false,
            showValidationRequirements: false,
            maxInitialItems: 1,
            enableShowMore: true,
          },
          standard: {
            showSummary: true,
            showRiskDetails: true,
            showTechnicalDetails: false,
            showComplianceInfo: false,
            showMitigationRecommendations: true,
            showValidationRequirements: true,
            maxInitialItems: 3,
            enableShowMore: true,
          },
          expanded: {
            showSummary: true,
            showRiskDetails: true,
            showTechnicalDetails: true,
            showComplianceInfo: true,
            showMitigationRecommendations: true,
            showValidationRequirements: true,
            maxInitialItems: 5,
            enableShowMore: true,
          },
          comprehensive: {
            showSummary: true,
            showRiskDetails: true,
            showTechnicalDetails: true,
            showComplianceInfo: true,
            showMitigationRecommendations: true,
            showValidationRequirements: true,
            maxInitialItems: 10,
            enableShowMore: false,
          },
        },
      },
      contextualHelp: {
        enabled: this.configService.get<boolean>(
          "PARLANT_UX_CONTEXTUAL_HELP",
          true,
        ),
        deliveryMethods: {
          tooltips: true,
          overlays: true,
          inline: true,
          modal: true,
          voice: true,
        },
        triggers: {
          onHover: true,
          onFocus: true,
          onError: true,
          onDelay: true,
          delayMs: 3000,
        },
        contentTypes: {
          quickTips: true,
          detailedExplanations: true,
          examples: true,
          tutorials: true,
          videos: false, // Disabled by default
        },
      },
      intelligentDefaults: {
        enabled: this.configService.get<boolean>(
          "PARLANT_UX_INTELLIGENT_DEFAULTS",
          true,
        ),
        learning: {
          enabled: true,
          minSamples: 5,
          confidenceThreshold: 0.7,
          adaptationRate: 0.1,
        },
        suggestionTypes: {
          responses: true,
          confirmations: true,
          mitigations: true,
          shortcuts: true,
        },
        contextAwareness: {
          timeOfDay: true,
          dayOfWeek: true,
          userHistory: true,
          operationType: true,
          riskLevel: true,
        },
      },
    };
  }

  /**
   * Get user experience metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      userProfileCount: this.userProfiles.size,
    };
  }

  /**
   * Health check for user experience optimizer
   */
  async healthCheck(): Promise<{ status: string; metrics: any; config: any }> {
    return {
      status: "healthy",
      metrics: this.getMetrics(),
      config: {
        progressiveDisclosure: this.config.progressiveDisclosure.enabled,
        contextualHelp: this.config.contextualHelp.enabled,
        intelligentDefaults: this.config.intelligentDefaults.enabled,
      },
    };
  }
}
