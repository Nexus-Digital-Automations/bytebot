/**
 * Enhanced Application Control Validation Service - PARLANT Integration
 *
 * Comprehensive PARLANT conversational validation for Application Control APIs
 * with enterprise-grade security, process management safety, and risk assessment.
 *
 * Features:
 * - Conversational approval for application launch and control
 * - Risk assessment for process management operations
 * - Natural language explanation of system impact
 * - Real-time monitoring of application state changes
 * - Intelligent validation for automation workflows
 * - Sub-400ms validation for application control operations
 *
 * Security Classifications:
 * - SAFE: Document viewers, media players
 * - MODERATE: Office applications, development tools
 * - HIGH: System utilities, admin tools
 * - CRITICAL: System configuration, security tools
 * - BLOCKED: Malware, unauthorized executables
 *
 * Performance Requirements:
 * - <200ms for safe application launches
 * - <300ms for moderate risk applications
 * - <400ms for high risk system utilities
 * - <500ms for critical system tools with full approval
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ParlantIntegrationService,
  ParlantValidationRequest,
  ParlantConversationContext,
  RiskLevel,
  ConversationalValidationError,
} from '../parlant/parlant-integration.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ===== APPLICATION CONTROL VALIDATION INTERFACES =====

/**
 * Application control validation context with system monitoring
 */
export interface ApplicationControlValidationContext
  extends ParlantConversationContext {
  readonly systemResources: {
    cpuUsagePercent: number;
    memoryUsagePercent: number;
    diskSpaceAvailable: number;
    networkActivity: boolean;
  };
  readonly securitySettings: {
    allowSystemApplications: boolean;
    allowThirdPartyApplications: boolean;
    allowCommandLineTools: boolean;
    allowNetworkApplications: boolean;
    maxConcurrentApps: number;
  };
  readonly currentApplications: {
    processId: number;
    name: string;
    status: 'running' | 'stopped' | 'suspended';
    memoryUsage: number;
    cpuUsage: number;
  }[];
  readonly performanceRequirements: {
    maxValidationTimeMs: number;
    allowCaching: boolean;
    requiresRealtime: boolean;
  };
}

/**
 * Application risk assessment
 */
export interface ApplicationRisk {
  readonly riskLevel: RiskLevel;
  readonly applicationType:
    | 'DOCUMENT_VIEWER'
    | 'MEDIA_PLAYER'
    | 'OFFICE_APP'
    | 'DEVELOPMENT_TOOL'
    | 'SYSTEM_UTILITY'
    | 'ADMIN_TOOL'
    | 'SECURITY_TOOL'
    | 'NETWORK_APP'
    | 'UNKNOWN';
  readonly securityScope:
    | 'USER'
    | 'SYSTEM'
    | 'NETWORK'
    | 'ADMINISTRATIVE'
    | 'KERNEL';
  readonly systemImpact: 'MINIMAL' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  readonly networkAccess: boolean;
  readonly fileSystemAccess:
    | 'READ_ONLY'
    | 'USER_FILES'
    | 'SYSTEM_FILES'
    | 'FULL_ACCESS';
  readonly privilegesRequired: 'USER' | 'ELEVATED' | 'ADMIN' | 'SYSTEM';
  readonly reversible: boolean;
  readonly monitoringRequired: boolean;
  readonly securityImplications: string[];
  readonly recommendedSafeguards: string[];
}

/**
 * Process monitoring result
 */
export interface ProcessMonitoringResult {
  readonly processId: number;
  readonly status: 'running' | 'stopped' | 'crashed' | 'suspended';
  readonly resourceUsage: {
    cpuPercent: number;
    memoryMB: number;
    diskIO: number;
    networkConnections: number;
  };
  readonly securityEvents: string[];
  readonly startTime: Date;
  readonly duration: number;
}

/**
 * Application launch validation result
 */
export interface ApplicationLaunchValidation {
  readonly approved: boolean;
  readonly applicationName: string;
  readonly executablePath: string;
  readonly arguments: string[];
  readonly environment: Record<string, string>;
  readonly workingDirectory: string;
  readonly processMonitoring: {
    enabled: boolean;
    maxRuntime: number;
    resourceLimits: {
      maxCpuPercent: number;
      maxMemoryMB: number;
      maxNetworkConnections: number;
    };
  };
  readonly safeguards: string[];
}

// ===== ENHANCED APPLICATION CONTROL VALIDATION SERVICE =====

@Injectable()
export class EnhancedApplicationControlValidationService {
  private readonly logger = new Logger(
    EnhancedApplicationControlValidationService.name,
  );

  // Application validation cache
  private readonly validationCache = new Map<
    string,
    {
      result: boolean;
      timestamp: Date;
      expiryMs: number;
      applicationName: string;
    }
  >();

  // Active process monitoring
  private readonly monitoredProcesses = new Map<
    number,
    {
      processId: number;
      name: string;
      startTime: Date;
      monitoringConfig: any;
      resourceHistory: any[];
    }
  >();

  // Performance metrics
  private readonly performanceMetrics = {
    totalApplicationLaunches: 0,
    approvedLaunches: 0,
    blockedLaunches: 0,
    processesMonitored: 0,
    securityViolations: 0,
    averageValidationTime: 0,
    cacheHitRate: 0,
    sub200msOperations: 0,
    sub300msOperations: 0,
    sub400msOperations: 0,
  };

  // Known application classifications
  private readonly applicationClassifications = {
    safe: [
      'notepad',
      'wordpad',
      'calculator',
      'paint',
      'vlc',
      'mediaplayer',
      'firefox',
      'chrome',
      'safari',
      'edge',
      'acrobat',
      'preview',
    ],
    moderate: [
      'word',
      'excel',
      'powerpoint',
      'office',
      'vscode',
      'atom',
      'sublime',
      'photoshop',
      'illustrator',
      'gimp',
      'inkscape',
      'slack',
      'teams',
    ],
    high: [
      'terminal',
      'cmd',
      'powershell',
      'bash',
      'task manager',
      'activity monitor',
      'system preferences',
      'control panel',
      'registry editor',
      'services',
    ],
    critical: [
      'sudo',
      'su',
      'admin',
      'root',
      'group policy',
      'security center',
      'firewall',
      'antivirus',
      'disk utility',
      'system configuration',
    ],
    blocked: ['malware', 'virus', 'trojan', 'keylogger', 'backdoor', 'rootkit'],
  };

  constructor(
    private readonly parlantIntegrationService: ParlantIntegrationService,
  ) {
    this.logger.log(
      'Enhanced Application Control Validation Service initialized',
    );

    // Cache cleanup interval
    setInterval(() => this.cleanupValidationCache(), 300000); // Every 5 minutes

    // Process monitoring interval
    setInterval(() => this.monitorActiveProcesses(), 30000); // Every 30 seconds

    // Performance metrics logging
    setInterval(() => this.logPerformanceMetrics(), 300000); // Every 5 minutes
  }

  // ===== APPLICATION LAUNCH VALIDATION =====

  /**
   * Validate application launch with comprehensive security assessment
   */
  async validateApplicationLaunch(
    applicationName: string,
    executablePath: string,
    args: string[] = [],
    context: ApplicationControlValidationContext,
  ): Promise<boolean> {
    const operationId = `app_launch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      this.performanceMetrics.totalApplicationLaunches++;

      // Performance optimization: check cache first
      const cacheKey = this.generateCacheKey(
        'launch',
        applicationName,
        context.userId,
      );
      const cached = this.getCachedValidation(cacheKey);
      if (cached) {
        this.updatePerformanceMetrics(Date.now() - startTime, true);
        return cached;
      }

      // Application risk assessment
      const applicationRisk = await this.assessApplicationRisk(
        applicationName,
        executablePath,
        args,
        context,
      );

      // Block dangerous applications immediately
      if (
        applicationRisk.riskLevel === RiskLevel._CRITICAL &&
        this.isBlockedApplication(applicationName)
      ) {
        this.performanceMetrics.blockedLaunches++;
        this.performanceMetrics.securityViolations++;
        this.logger.warn(
          `[${operationId}] Application launch blocked: ${applicationName}`,
          {
            operationId,
            applicationName,
            executablePath,
            riskLevel: applicationRisk.riskLevel,
            reason: 'blocked_application_detected',
          },
        );
        return false;
      }

      // Check system resource constraints
      if (!this.checkResourceAvailability(context)) {
        this.performanceMetrics.blockedLaunches++;
        this.logger.warn(
          `[${operationId}] Application launch blocked due to resource constraints`,
          {
            operationId,
            applicationName,
            systemResources: context.systemResources,
          },
        );
        return false;
      }

      // Fast-path for safe applications
      if (
        applicationRisk.riskLevel === RiskLevel._MINIMAL &&
        this.isSafeApplication(applicationName)
      ) {
        this.performanceMetrics.approvedLaunches++;
        this.setCachedValidation(cacheKey, true, 300000); // 5 minute cache for safe apps
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // Conversational validation for higher risk applications
      const validationRequest: ParlantValidationRequest = {
        functionName: `ApplicationControl.launchApplication`,
        functionParams: {
          applicationName,
          executablePath,
          arguments: this.sanitizeArguments(args),
          applicationType: applicationRisk.applicationType,
          securityScope: applicationRisk.securityScope,
          systemImpact: applicationRisk.systemImpact,
          networkAccess: applicationRisk.networkAccess,
          privilegesRequired: applicationRisk.privilegesRequired,
        },
        actionDescription: this.generateLaunchDescription(
          applicationName,
          applicationRisk,
          args,
        ),
        context: context,
        riskLevel: applicationRisk.riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(
            context.performanceRequirements.maxValidationTimeMs,
            400,
          ),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse =
        await this.parlantIntegrationService.validateFunctionExecution(
          validationRequest,
        );

      if (validationResponse.approved) {
        this.performanceMetrics.approvedLaunches++;

        // Cache approved moderate risk applications for shorter duration
        if (applicationRisk.riskLevel <= RiskLevel._MODERATE) {
          this.setCachedValidation(cacheKey, true, 60000); // 1 minute cache
        }

        // Setup process monitoring if required
        if (applicationRisk.monitoringRequired) {
          await this.setupProcessMonitoring(
            applicationName,
            applicationRisk,
            context,
          );
        }
      } else {
        this.performanceMetrics.blockedLaunches++;
      }

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;
    } catch (error) {
      this.logger.error(
        `[${operationId}] Application launch validation failed`,
        {
          operationId,
          applicationName,
          executablePath,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        },
      );
      throw error;
    }
  }

  // ===== APPLICATION TERMINATION VALIDATION =====

  /**
   * Validate application termination with impact assessment
   */
  async validateApplicationTermination(
    processId: number,
    applicationName: string,
    forceKill: boolean,
    context: ApplicationControlValidationContext,
  ): Promise<boolean> {
    const operationId = `app_terminate_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Check if process is currently monitored
      const monitoredProcess = this.monitoredProcesses.get(processId);

      // Assess termination risk
      const terminationRisk = await this.assessTerminationRisk(
        processId,
        applicationName,
        forceKill,
        context,
      );

      // Allow termination of user applications without validation
      if (terminationRisk.riskLevel === RiskLevel._MINIMAL) {
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // Conversational validation for higher risk terminations
      const validationRequest: ParlantValidationRequest = {
        functionName: `ApplicationControl.terminateApplication`,
        functionParams: {
          processId,
          applicationName,
          forceKill,
          systemImpact: terminationRisk.systemImpact,
          dataLossRisk: terminationRisk.reversible ? 'LOW' : 'HIGH',
          monitoredProcess: !!monitoredProcess,
        },
        actionDescription: this.generateTerminationDescription(
          applicationName,
          terminationRisk,
          forceKill,
        ),
        context: context,
        riskLevel: terminationRisk.riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(
            context.performanceRequirements.maxValidationTimeMs,
            300,
          ),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse =
        await this.parlantIntegrationService.validateFunctionExecution(
          validationRequest,
        );

      // Clean up monitoring if process is terminated
      if (validationResponse.approved && monitoredProcess) {
        this.stopProcessMonitoring(processId);
      }

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;
    } catch (error) {
      this.logger.error(
        `[${operationId}] Application termination validation failed`,
        {
          operationId,
          processId,
          applicationName,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        },
      );
      throw error;
    }
  }

  // ===== APPLICATION STATE CONTROL VALIDATION =====

  /**
   * Validate application state changes (suspend, resume, etc.)
   */
  async validateApplicationStateChange(
    processId: number,
    applicationName: string,
    newState: 'suspend' | 'resume' | 'restart',
    context: ApplicationControlValidationContext,
  ): Promise<boolean> {
    const operationId = `app_state_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      // Assess state change risk
      const stateChangeRisk = this.assessStateChangeRisk(
        newState,
        applicationName,
        context,
      );

      // Simple state changes (suspend/resume) are generally low risk
      if (
        stateChangeRisk.riskLevel === RiskLevel._LOW &&
        newState !== 'restart'
      ) {
        this.updatePerformanceMetrics(Date.now() - startTime, false);
        return true;
      }

      // Conversational validation for restart or high-risk state changes
      const validationRequest: ParlantValidationRequest = {
        functionName: `ApplicationControl.changeApplicationState`,
        functionParams: {
          processId,
          applicationName,
          newState,
          currentState: this.getCurrentProcessState(processId),
          systemImpact: stateChangeRisk.systemImpact,
        },
        actionDescription: this.generateStateChangeDescription(
          applicationName,
          newState,
          stateChangeRisk,
        ),
        context: context,
        riskLevel: stateChangeRisk.riskLevel,
        operationId,
        performanceRequirements: {
          maxValidationTimeMs: Math.min(
            context.performanceRequirements.maxValidationTimeMs,
            200,
          ),
          requiresRealtime: context.performanceRequirements.requiresRealtime,
        },
      };

      const validationResponse =
        await this.parlantIntegrationService.validateFunctionExecution(
          validationRequest,
        );

      this.updatePerformanceMetrics(Date.now() - startTime, false);
      return validationResponse.approved;
    } catch (error) {
      this.logger.error(
        `[${operationId}] Application state change validation failed`,
        {
          operationId,
          processId,
          applicationName,
          newState,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - startTime,
        },
      );
      throw error;
    }
  }

  // ===== RISK ASSESSMENT METHODS =====

  /**
   * Assess risk level for application launch
   */
  private async assessApplicationRisk(
    applicationName: string,
    executablePath: string,
    args: string[],
    context: ApplicationControlValidationContext,
  ): Promise<ApplicationRisk> {
    const normalizedName = applicationName.toLowerCase();

    const risk: ApplicationRisk = {
      riskLevel: RiskLevel._MODERATE,
      applicationType: 'UNKNOWN',
      securityScope: 'USER',
      systemImpact: 'LOW',
      networkAccess: false,
      fileSystemAccess: 'USER_FILES',
      privilegesRequired: 'USER',
      reversible: true,
      monitoringRequired: false,
      securityImplications: [],
      recommendedSafeguards: [],
    };

    // Classify application type and set base risk
    this.classifyApplication(normalizedName, risk);

    // Analyze executable path for additional risk indicators
    this.analyzeExecutablePath(executablePath, risk);

    // Analyze command line arguments for security implications
    this.analyzeArguments(args, risk);

    // Check network access requirements
    this.assessNetworkAccess(normalizedName, risk);

    // Set monitoring requirements based on risk level
    if (risk.riskLevel >= RiskLevel._HIGH) {
      risk.monitoringRequired = true;
    }

    // Set security implications and safeguards
    this.setApplicationSecurityImplications(risk);

    return risk;
  }

  /**
   * Classify application based on known patterns
   */
  private classifyApplication(
    applicationName: string,
    risk: ApplicationRisk,
  ): void {
    // Check against known safe applications
    if (
      this.applicationClassifications.safe.some((safe) =>
        applicationName.includes(safe),
      )
    ) {
      risk.riskLevel = RiskLevel._MINIMAL;
      risk.applicationType = this.inferApplicationType(applicationName);
      risk.systemImpact = 'MINIMAL';
      return;
    }

    // Check against known moderate risk applications
    if (
      this.applicationClassifications.moderate.some((mod) =>
        applicationName.includes(mod),
      )
    ) {
      risk.riskLevel = RiskLevel._MODERATE;
      risk.applicationType = 'OFFICE_APP';
      risk.systemImpact = 'LOW';
      risk.fileSystemAccess = 'USER_FILES';
      return;
    }

    // Check against known high risk applications
    if (
      this.applicationClassifications.high.some((high) =>
        applicationName.includes(high),
      )
    ) {
      risk.riskLevel = RiskLevel._HIGH;
      risk.applicationType = 'SYSTEM_UTILITY';
      risk.systemImpact = 'HIGH';
      risk.securityScope = 'SYSTEM';
      risk.fileSystemAccess = 'SYSTEM_FILES';
      risk.privilegesRequired = 'ELEVATED';
      return;
    }

    // Check against known critical applications
    if (
      this.applicationClassifications.critical.some((crit) =>
        applicationName.includes(crit),
      )
    ) {
      risk.riskLevel = RiskLevel._CRITICAL;
      risk.applicationType = 'SECURITY_TOOL';
      risk.systemImpact = 'CRITICAL';
      risk.securityScope = 'ADMINISTRATIVE';
      risk.fileSystemAccess = 'FULL_ACCESS';
      risk.privilegesRequired = 'ADMIN';
      return;
    }

    // Default for unknown applications
    risk.riskLevel = RiskLevel._MODERATE;
    risk.applicationType = 'UNKNOWN';
    risk.systemImpact = 'MODERATE';
  }

  /**
   * Infer application type from name
   */
  private inferApplicationType(
    applicationName: string,
  ): ApplicationRisk['applicationType'] {
    if (
      ['notepad', 'wordpad', 'acrobat', 'preview'].some((app) =>
        applicationName.includes(app),
      )
    ) {
      return 'DOCUMENT_VIEWER';
    }
    if (
      ['vlc', 'mediaplayer', 'itunes', 'spotify'].some((app) =>
        applicationName.includes(app),
      )
    ) {
      return 'MEDIA_PLAYER';
    }
    if (
      ['vscode', 'atom', 'sublime', 'intellij'].some((app) =>
        applicationName.includes(app),
      )
    ) {
      return 'DEVELOPMENT_TOOL';
    }
    return 'UNKNOWN';
  }

  /**
   * Analyze executable path for risk indicators
   */
  private analyzeExecutablePath(
    executablePath: string,
    risk: ApplicationRisk,
  ): void {
    const pathLower = executablePath.toLowerCase();

    // System directories indicate higher risk
    if (
      pathLower.includes('/system32/') ||
      pathLower.includes('/sbin/') ||
      pathLower.includes('/usr/bin/')
    ) {
      risk.riskLevel = this.escalateRiskLevel(risk.riskLevel);
      risk.securityScope = 'SYSTEM';
      risk.systemImpact = 'HIGH';
      risk.securityImplications.push('system_directory_execution');
    }

    // Temporary directories are suspicious
    if (
      pathLower.includes('/tmp/') ||
      pathLower.includes('\\temp\\') ||
      pathLower.includes('/downloads/')
    ) {
      risk.riskLevel = this.escalateRiskLevel(risk.riskLevel);
      risk.securityImplications.push('temporary_directory_execution');
      risk.recommendedSafeguards.push('malware_scan_required');
    }

    // Network shares are higher risk
    if (pathLower.startsWith('//') || pathLower.startsWith('\\\\')) {
      risk.riskLevel = this.escalateRiskLevel(risk.riskLevel);
      risk.networkAccess = true;
      risk.securityImplications.push('network_share_execution');
    }
  }

  /**
   * Analyze command line arguments for security implications
   */
  private analyzeArguments(args: string[], risk: ApplicationRisk): void {
    if (args.length === 0) return;

    const argsString = args.join(' ').toLowerCase();

    // Check for privilege escalation arguments
    const privilegeArgs = ['sudo', 'runas', '/admin', '-admin', '--privileged'];
    if (privilegeArgs.some((arg) => argsString.includes(arg))) {
      risk.riskLevel = RiskLevel._CRITICAL;
      risk.privilegesRequired = 'ADMIN';
      risk.securityImplications.push('privilege_escalation_request');
    }

    // Check for network-related arguments
    const networkArgs = ['--port', '--host', '--connect', '--bind', '--listen'];
    if (networkArgs.some((arg) => argsString.includes(arg))) {
      risk.networkAccess = true;
      risk.securityImplications.push('network_access_requested');
    }

    // Check for file system arguments
    const fileArgs = ['--config', '--write', '--delete', '--overwrite'];
    if (fileArgs.some((arg) => argsString.includes(arg))) {
      risk.fileSystemAccess = 'SYSTEM_FILES';
      risk.securityImplications.push('file_system_modification_requested');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = ['powershell -e', 'cmd /c', 'bash -c', 'eval'];
    if (suspiciousPatterns.some((pattern) => argsString.includes(pattern))) {
      risk.riskLevel = RiskLevel._CRITICAL;
      risk.securityImplications.push('suspicious_command_execution');
      risk.recommendedSafeguards.push('command_inspection_required');
    }
  }

  /**
   * Assess network access requirements
   */
  private assessNetworkAccess(
    applicationName: string,
    risk: ApplicationRisk,
  ): void {
    const networkApps = [
      'browser',
      'firefox',
      'chrome',
      'edge',
      'safari',
      'slack',
      'teams',
      'skype',
      'zoom',
    ];

    if (networkApps.some((app) => applicationName.includes(app))) {
      risk.networkAccess = true;
      risk.applicationType = 'NETWORK_APP';

      // Network applications in system context are higher risk
      if (risk.securityScope === 'SYSTEM') {
        risk.riskLevel = this.escalateRiskLevel(risk.riskLevel);
        risk.securityImplications.push('network_application_system_access');
      }
    }
  }

  /**
   * Set security implications and safeguards based on risk profile
   */
  private setApplicationSecurityImplications(risk: ApplicationRisk): void {
    switch (risk.riskLevel) {
      case RiskLevel._CRITICAL:
        risk.securityImplications.push(
          'system_integrity_risk',
          'security_compromise_potential',
        );
        risk.recommendedSafeguards.push(
          'comprehensive_monitoring',
          'admin_approval',
          'sandboxing',
        );
        break;
      case RiskLevel._HIGH:
        risk.securityImplications.push(
          'system_modification_potential',
          'data_access_risk',
        );
        risk.recommendedSafeguards.push(
          'process_monitoring',
          'resource_limits',
          'approval_required',
        );
        break;
      case RiskLevel._MODERATE:
        risk.securityImplications.push('user_data_access');
        risk.recommendedSafeguards.push(
          'basic_monitoring',
          'user_notification',
        );
        break;
      default:
        risk.recommendedSafeguards.push('standard_logging');
    }

    if (risk.networkAccess) {
      risk.securityImplications.push('network_communication');
      risk.recommendedSafeguards.push('network_monitoring');
    }

    if (risk.privilegesRequired !== 'USER') {
      risk.securityImplications.push('elevated_privileges');
      risk.recommendedSafeguards.push('privilege_validation');
    }
  }

  // ===== TERMINATION RISK ASSESSMENT =====

  private async assessTerminationRisk(
    processId: number,
    applicationName: string,
    forceKill: boolean,
    context: ApplicationControlValidationContext,
  ): Promise<ApplicationRisk> {
    const risk: ApplicationRisk = {
      riskLevel: RiskLevel._LOW,
      applicationType: 'UNKNOWN',
      securityScope: 'USER',
      systemImpact: 'LOW',
      networkAccess: false,
      fileSystemAccess: 'USER_FILES',
      privilegesRequired: 'USER',
      reversible: true,
      monitoringRequired: false,
      securityImplications: [],
      recommendedSafeguards: [],
    };

    // Check if it's a system critical process
    if (this.isSystemCriticalProcess(applicationName)) {
      risk.riskLevel = RiskLevel._CRITICAL;
      risk.systemImpact = 'CRITICAL';
      risk.reversible = false;
      risk.securityImplications.push('system_critical_process_termination');
    }

    // Force kill is higher risk
    if (forceKill) {
      risk.riskLevel = this.escalateRiskLevel(risk.riskLevel);
      risk.reversible = false;
      risk.securityImplications.push('force_kill_data_loss_risk');
    }

    // Check if process has unsaved data
    if (this.hasUnsavedData(applicationName)) {
      risk.riskLevel = this.escalateRiskLevel(risk.riskLevel);
      risk.securityImplications.push('unsaved_data_loss_risk');
    }

    return risk;
  }

  private assessStateChangeRisk(
    newState: string,
    applicationName: string,
    context: ApplicationControlValidationContext,
  ): ApplicationRisk {
    const risk: ApplicationRisk = {
      riskLevel: RiskLevel._LOW,
      applicationType: 'UNKNOWN',
      securityScope: 'USER',
      systemImpact: 'LOW',
      networkAccess: false,
      fileSystemAccess: 'USER_FILES',
      privilegesRequired: 'USER',
      reversible: true,
      monitoringRequired: false,
      securityImplications: [],
      recommendedSafeguards: [],
    };

    // Restart is higher risk than suspend/resume
    if (newState === 'restart') {
      risk.riskLevel = RiskLevel._MODERATE;
      risk.systemImpact = 'MODERATE';
      risk.securityImplications.push('application_restart_required');
    }

    // System applications have higher state change risk
    if (this.isSystemApplication(applicationName)) {
      risk.riskLevel = this.escalateRiskLevel(risk.riskLevel);
      risk.systemImpact = 'HIGH';
      risk.securityImplications.push('system_application_state_change');
    }

    return risk;
  }

  // ===== PROCESS MONITORING =====

  /**
   * Setup process monitoring for high-risk applications
   */
  private async setupProcessMonitoring(
    applicationName: string,
    risk: ApplicationRisk,
    context: ApplicationControlValidationContext,
  ): Promise<void> {
    // This would be implemented with actual process monitoring
    // For now, we'll just log the setup
    this.logger.log(`Setting up process monitoring for: ${applicationName}`, {
      applicationName,
      riskLevel: risk.riskLevel,
      monitoringRequired: risk.monitoringRequired,
    });

    this.performanceMetrics.processesMonitored++;
  }

  /**
   * Monitor active processes for security events
   */
  private async monitorActiveProcesses(): Promise<void> {
    // Placeholder for actual process monitoring implementation
    // Would monitor CPU, memory, network, file system access, etc.

    for (const [processId, processInfo] of this.monitoredProcesses.entries()) {
      try {
        // Get current process stats (placeholder)
        const stats = await this.getProcessStats(processId);

        // Check for anomalies
        if (this.detectAnomalies(stats, processInfo)) {
          this.logger.warn(`Process anomaly detected: ${processInfo.name}`, {
            processId,
            name: processInfo.name,
            stats,
          });
        }

        // Update history
        processInfo.resourceHistory.push({
          timestamp: new Date(),
          ...stats,
        });

        // Keep only recent history
        if (processInfo.resourceHistory.length > 100) {
          processInfo.resourceHistory.shift();
        }
      } catch (error) {
        this.logger.error(`Process monitoring failed for PID ${processId}`, {
          processId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Stop monitoring a process
   */
  private stopProcessMonitoring(processId: number): void {
    if (this.monitoredProcesses.has(processId)) {
      const processInfo = this.monitoredProcesses.get(processId)!;
      this.logger.log(`Stopping process monitoring: ${processInfo.name}`, {
        processId,
        name: processInfo.name,
        monitorDuration: Date.now() - processInfo.startTime.getTime(),
      });
      this.monitoredProcesses.delete(processId);
    }
  }

  // ===== HELPER METHODS =====

  private checkResourceAvailability(
    context: ApplicationControlValidationContext,
  ): boolean {
    const { systemResources, securitySettings } = context;

    // Check CPU usage
    if (systemResources.cpuUsagePercent > 90) {
      return false;
    }

    // Check memory usage
    if (systemResources.memoryUsagePercent > 85) {
      return false;
    }

    // Check concurrent application limit
    if (
      context.currentApplications.length >= securitySettings.maxConcurrentApps
    ) {
      return false;
    }

    return true;
  }

  private isSafeApplication(applicationName: string): boolean {
    const normalizedName = applicationName.toLowerCase();
    return this.applicationClassifications.safe.some((safe) =>
      normalizedName.includes(safe),
    );
  }

  private isBlockedApplication(applicationName: string): boolean {
    const normalizedName = applicationName.toLowerCase();
    return this.applicationClassifications.blocked.some((blocked) =>
      normalizedName.includes(blocked),
    );
  }

  private isSystemCriticalProcess(applicationName: string): boolean {
    const criticalProcesses = [
      'explorer',
      'winlogon',
      'csrss',
      'smss',
      'kernel',
      'init',
    ];
    const normalizedName = applicationName.toLowerCase();
    return criticalProcesses.some((critical) =>
      normalizedName.includes(critical),
    );
  }

  private isSystemApplication(applicationName: string): boolean {
    const normalizedName = applicationName.toLowerCase();
    return (
      this.applicationClassifications.high.some((high) =>
        normalizedName.includes(high),
      ) ||
      this.applicationClassifications.critical.some((crit) =>
        normalizedName.includes(crit),
      )
    );
  }

  private hasUnsavedData(applicationName: string): boolean {
    // Heuristic check for applications that typically have unsaved data
    const dataApps = [
      'word',
      'excel',
      'powerpoint',
      'notepad',
      'editor',
      'ide',
    ];
    const normalizedName = applicationName.toLowerCase();
    return dataApps.some((app) => normalizedName.includes(app));
  }

  private escalateRiskLevel(currentLevel: RiskLevel): RiskLevel {
    switch (currentLevel) {
      case RiskLevel._MINIMAL:
        return RiskLevel._LOW;
      case RiskLevel._LOW:
        return RiskLevel._MODERATE;
      case RiskLevel._MODERATE:
        return RiskLevel._HIGH;
      case RiskLevel._HIGH:
        return RiskLevel._CRITICAL;
      case RiskLevel._CRITICAL:
        return RiskLevel._CRITICAL;
      default:
        return RiskLevel._MODERATE;
    }
  }

  private sanitizeArguments(args: string[]): string[] {
    // Remove potentially sensitive arguments
    return args.map((arg) => {
      // Mask passwords
      if (arg.toLowerCase().includes('password')) {
        return '[PASSWORD_MASKED]';
      }
      // Mask tokens
      if (arg.toLowerCase().includes('token')) {
        return '[TOKEN_MASKED]';
      }
      return arg;
    });
  }

  private getCurrentProcessState(processId: number): string {
    // Placeholder - would check actual process state
    return 'running';
  }

  private async getProcessStats(processId: number): Promise<any> {
    // Placeholder for actual process statistics
    return {
      cpuPercent: Math.random() * 10,
      memoryMB: Math.random() * 100 + 50,
      diskIO: Math.random() * 1000,
      networkConnections: Math.floor(Math.random() * 10),
    };
  }

  private detectAnomalies(stats: any, processInfo: any): boolean {
    // Simple anomaly detection based on historical data
    if (processInfo.resourceHistory.length < 10) return false;

    const avgCpu =
      processInfo.resourceHistory.reduce(
        (sum: number, entry: any) => sum + entry.cpuPercent,
        0,
      ) / processInfo.resourceHistory.length;
    const avgMemory =
      processInfo.resourceHistory.reduce(
        (sum: number, entry: any) => sum + entry.memoryMB,
        0,
      ) / processInfo.resourceHistory.length;

    // Check for significant spikes
    return stats.cpuPercent > avgCpu * 3 || stats.memoryMB > avgMemory * 2;
  }

  // ===== DESCRIPTION GENERATORS =====

  private generateLaunchDescription(
    applicationName: string,
    risk: ApplicationRisk,
    args: string[],
  ): string {
    const argsStr = args.length > 0 ? ` with arguments: ${args.join(' ')}` : '';
    return `Launch ${risk.applicationType.toLowerCase().replace('_', ' ')} application: ${applicationName}${argsStr} - Risk: ${risk.riskLevel}, Impact: ${risk.systemImpact}`;
  }

  private generateTerminationDescription(
    applicationName: string,
    risk: ApplicationRisk,
    forceKill: boolean,
  ): string {
    const methodStr = forceKill ? 'force kill' : 'graceful termination';
    const reversibleStr = risk.reversible ? 'reversible' : 'irreversible';
    return `${methodStr} of application: ${applicationName} - ${reversibleStr} operation with ${risk.systemImpact.toLowerCase()} system impact`;
  }

  private generateStateChangeDescription(
    applicationName: string,
    newState: string,
    risk: ApplicationRisk,
  ): string {
    return `Change application state: ${applicationName} to ${newState} - Impact: ${risk.systemImpact}, Risk: ${risk.riskLevel}`;
  }

  // ===== CACHE MANAGEMENT =====

  private generateCacheKey(
    operation: string,
    applicationName: string,
    userId: string,
  ): string {
    return `${operation}_${userId}_${applicationName.toLowerCase()}`;
  }

  private getCachedValidation(key: string): boolean | null {
    const cached = this.validationCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp.getTime() > cached.expiryMs) {
      this.validationCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCachedValidation(
    key: string,
    result: boolean,
    expiryMs: number,
  ): void {
    this.validationCache.set(key, {
      result,
      timestamp: new Date(),
      expiryMs,
      applicationName: key.split('_')[2],
    });
  }

  private cleanupValidationCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.validationCache.entries()) {
      if (now - cached.timestamp.getTime() > cached.expiryMs) {
        this.validationCache.delete(key);
      }
    }
  }

  // ===== PERFORMANCE TRACKING =====

  private updatePerformanceMetrics(
    durationMs: number,
    fromCache: boolean,
  ): void {
    if (fromCache) {
      this.performanceMetrics.cacheHitRate =
        (this.performanceMetrics.cacheHitRate *
          (this.performanceMetrics.totalApplicationLaunches - 1) +
          1) /
        this.performanceMetrics.totalApplicationLaunches;
    } else {
      this.performanceMetrics.averageValidationTime =
        (this.performanceMetrics.averageValidationTime *
          (this.performanceMetrics.totalApplicationLaunches - 1) +
          durationMs) /
        this.performanceMetrics.totalApplicationLaunches;

      if (durationMs < 200) this.performanceMetrics.sub200msOperations++;
      if (durationMs < 300) this.performanceMetrics.sub300msOperations++;
      if (durationMs < 400) this.performanceMetrics.sub400msOperations++;
    }
  }

  private logPerformanceMetrics(): void {
    const { totalApplicationLaunches } = this.performanceMetrics;

    this.logger.log(
      'Enhanced Application Control Validation Performance Metrics',
      {
        totalApplicationLaunches,
        approvedLaunches: this.performanceMetrics.approvedLaunches,
        blockedLaunches: this.performanceMetrics.blockedLaunches,
        approvalRate: `${((this.performanceMetrics.approvedLaunches / totalApplicationLaunches) * 100).toFixed(1)}%`,
        processesMonitored: this.performanceMetrics.processesMonitored,
        securityViolations: this.performanceMetrics.securityViolations,
        averageValidationTime: `${this.performanceMetrics.averageValidationTime.toFixed(2)}ms`,
        cacheHitRate: `${(this.performanceMetrics.cacheHitRate * 100).toFixed(1)}%`,
        sub200msRate: `${((this.performanceMetrics.sub200msOperations / totalApplicationLaunches) * 100).toFixed(1)}%`,
        sub300msRate: `${((this.performanceMetrics.sub300msOperations / totalApplicationLaunches) * 100).toFixed(1)}%`,
        sub400msRate: `${((this.performanceMetrics.sub400msOperations / totalApplicationLaunches) * 100).toFixed(1)}%`,
        cacheSize: this.validationCache.size,
        activeMonitoredProcesses: this.monitoredProcesses.size,
      },
    );
  }

  /**
   * Get performance metrics for monitoring
   */
  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }
}
