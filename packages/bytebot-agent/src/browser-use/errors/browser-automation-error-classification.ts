/**
 * Browser Automation Error Classification System
 *
 * Comprehensive error categorization for browser automation failures with
 * detailed classification, severity levels, and recovery strategies.
 *
 * Features:
 * - Hierarchical error classification system
 * - Severity assessment and impact analysis
 * - Recovery strategy mapping
 * - Error context enrichment
 * - Monitoring and alerting integration
 */

export enum BrowserAutomationErrorCategory {
  // Network and Connectivity Errors
  NETWORK = 'NETWORK',
  CONNECTIVITY = 'CONNECTIVITY',
  TIMEOUT = 'TIMEOUT',
  DNS_RESOLUTION = 'DNS_RESOLUTION',

  // Browser Process and Session Errors
  BROWSER_PROCESS = 'BROWSER_PROCESS',
  SESSION_MANAGEMENT = 'SESSION_MANAGEMENT',
  PROCESS_LIFECYCLE = 'PROCESS_LIFECYCLE',
  RESOURCE_ALLOCATION = 'RESOURCE_ALLOCATION',

  // Page and Navigation Errors
  NAVIGATION = 'NAVIGATION',
  PAGE_LOAD = 'PAGE_LOAD',
  PAGE_INTERACTION = 'PAGE_INTERACTION',
  URL_VALIDATION = 'URL_VALIDATION',

  // Element and DOM Errors
  ELEMENT_LOCATION = 'ELEMENT_LOCATION',
  ELEMENT_INTERACTION = 'ELEMENT_INTERACTION',
  DOM_MANIPULATION = 'DOM_MANIPULATION',
  SELECTOR_VALIDATION = 'SELECTOR_VALIDATION',

  // Authentication and Security Errors
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SECURITY_POLICY = 'SECURITY_POLICY',
  CORS_VIOLATION = 'CORS_VIOLATION',

  // Performance and Resource Errors
  MEMORY_EXHAUSTION = 'MEMORY_EXHAUSTION',
  CPU_OVERLOAD = 'CPU_OVERLOAD',
  DISK_SPACE = 'DISK_SPACE',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',

  // Configuration and Environment Errors
  CONFIGURATION = 'CONFIGURATION',
  ENVIRONMENT = 'ENVIRONMENT',
  DEPENDENCY = 'DEPENDENCY',
  VERSION_COMPATIBILITY = 'VERSION_COMPATIBILITY',

  // Task and Execution Errors
  TASK_VALIDATION = 'TASK_VALIDATION',
  EXECUTION_FAILURE = 'EXECUTION_FAILURE',
  WORKFLOW_INTERRUPTION = 'WORKFLOW_INTERRUPTION',
  DATA_PROCESSING = 'DATA_PROCESSING',

  // External Service and Integration Errors
  EXTERNAL_API = 'EXTERNAL_API',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITING = 'RATE_LIMITING',
  INTEGRATION_FAILURE = 'INTEGRATION_FAILURE',

  // Unknown and Uncategorized Errors
  UNKNOWN = 'UNKNOWN',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
}

export enum BrowserAutomationErrorSeverity {
  CRITICAL = 'CRITICAL', // System-wide failure, complete service disruption
  HIGH = 'HIGH', // Major functionality broken, significant impact
  MEDIUM = 'MEDIUM', // Feature degradation, workarounds available
  LOW = 'LOW', // Minor issues, minimal impact
  INFO = 'INFO', // Informational, no functional impact
}

export enum BrowserAutomationErrorRecoverability {
  RECOVERABLE = 'RECOVERABLE', // Can be automatically recovered
  MANUAL_RECOVERY = 'MANUAL_RECOVERY', // Requires manual intervention
  RETRY_POSSIBLE = 'RETRY_POSSIBLE', // Can be retried with modifications
  NON_RECOVERABLE = 'NON_RECOVERABLE', // Cannot be recovered
  DEGRADED_MODE = 'DEGRADED_MODE', // Can continue with reduced functionality
}

/**
 * Detailed error classification with specific error codes
 */
export interface BrowserAutomationErrorCode {
  code: string;
  category: BrowserAutomationErrorCategory;
  severity: BrowserAutomationErrorSeverity;
  recoverability: BrowserAutomationErrorRecoverability;
  description: string;
  commonCauses: string[];
  recoveryStrategies: string[];
  monitoringTags: string[];
  estimatedImpact: {
    userExperience: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    systemPerformance: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    dataIntegrity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
}

/**
 * Comprehensive error code registry
 */
export const BROWSER_AUTOMATION_ERROR_REGISTRY: Record<
  string,
  BrowserAutomationErrorCode
> = {
  // Network and Connectivity Errors
  NET_CONNECTION_REFUSED: {
    code: 'NET_CONNECTION_REFUSED',
    category: BrowserAutomationErrorCategory.NETWORK,
    severity: BrowserAutomationErrorSeverity.HIGH,
    recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
    description: 'Connection refused by target server',
    commonCauses: [
      'Server is down or unreachable',
      'Firewall blocking connections',
      'Incorrect port configuration',
      'Network connectivity issues',
    ],
    recoveryStrategies: [
      'Retry with exponential backoff',
      'Verify server status',
      'Check network connectivity',
      'Try alternative endpoints',
    ],
    monitoringTags: ['network', 'connectivity', 'server-down'],
    estimatedImpact: {
      userExperience: 'HIGH',
      systemPerformance: 'MEDIUM',
      dataIntegrity: 'NONE',
    },
  },

  NET_TIMEOUT: {
    code: 'NET_TIMEOUT',
    category: BrowserAutomationErrorCategory.TIMEOUT,
    severity: BrowserAutomationErrorSeverity.MEDIUM,
    recoverability: BrowserAutomationErrorRecoverability.RECOVERABLE,
    description: 'Network request timed out',
    commonCauses: [
      'Slow network connection',
      'Server overload',
      'Large data transfer',
      'DNS resolution delays',
    ],
    recoveryStrategies: [
      'Increase timeout values',
      'Retry with longer timeout',
      'Optimize request payload',
      'Use connection pooling',
    ],
    monitoringTags: ['network', 'timeout', 'performance'],
    estimatedImpact: {
      userExperience: 'MEDIUM',
      systemPerformance: 'LOW',
      dataIntegrity: 'NONE',
    },
  },

  NET_DNS_RESOLUTION_FAILED: {
    code: 'NET_DNS_RESOLUTION_FAILED',
    category: BrowserAutomationErrorCategory.DNS_RESOLUTION,
    severity: BrowserAutomationErrorSeverity.HIGH,
    recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
    description: 'Failed to resolve domain name',
    commonCauses: [
      'DNS server unavailable',
      'Invalid domain name',
      'DNS configuration issues',
      'Network connectivity problems',
    ],
    recoveryStrategies: [
      'Use alternative DNS servers',
      'Verify domain name spelling',
      'Check DNS configuration',
      'Use IP address directly',
    ],
    monitoringTags: ['dns', 'network', 'resolution'],
    estimatedImpact: {
      userExperience: 'HIGH',
      systemPerformance: 'LOW',
      dataIntegrity: 'NONE',
    },
  },

  // Browser Process and Session Errors
  BROWSER_PROCESS_CRASHED: {
    code: 'BROWSER_PROCESS_CRASHED',
    category: BrowserAutomationErrorCategory.BROWSER_PROCESS,
    severity: BrowserAutomationErrorSeverity.CRITICAL,
    recoverability: BrowserAutomationErrorRecoverability.RECOVERABLE,
    description: 'Browser process unexpectedly terminated',
    commonCauses: [
      'Memory exhaustion',
      'Segmentation fault',
      'System resource limits',
      'Browser version incompatibility',
    ],
    recoveryStrategies: [
      'Restart browser process',
      'Increase memory allocation',
      'Update browser version',
      'Check system resources',
    ],
    monitoringTags: ['browser', 'crash', 'process', 'critical'],
    estimatedImpact: {
      userExperience: 'CRITICAL',
      systemPerformance: 'HIGH',
      dataIntegrity: 'MEDIUM',
    },
  },

  BROWSER_SESSION_EXPIRED: {
    code: 'BROWSER_SESSION_EXPIRED',
    category: BrowserAutomationErrorCategory.SESSION_MANAGEMENT,
    severity: BrowserAutomationErrorSeverity.MEDIUM,
    recoverability: BrowserAutomationErrorRecoverability.RECOVERABLE,
    description: 'Browser session has expired or been invalidated',
    commonCauses: [
      'Session timeout reached',
      'Idle timeout exceeded',
      'Manual session termination',
      'Resource cleanup',
    ],
    recoveryStrategies: [
      'Create new browser session',
      'Restore session state',
      'Re-authenticate if required',
      'Resume from last checkpoint',
    ],
    monitoringTags: ['session', 'timeout', 'lifecycle'],
    estimatedImpact: {
      userExperience: 'MEDIUM',
      systemPerformance: 'LOW',
      dataIntegrity: 'LOW',
    },
  },

  BROWSER_PROCESS_STARTUP_FAILED: {
    code: 'BROWSER_PROCESS_STARTUP_FAILED',
    category: BrowserAutomationErrorCategory.PROCESS_LIFECYCLE,
    severity: BrowserAutomationErrorSeverity.HIGH,
    recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
    description: 'Failed to start browser process',
    commonCauses: [
      'Chrome/Chromium not installed',
      'Insufficient permissions',
      'Resource constraints',
      'Configuration errors',
    ],
    recoveryStrategies: [
      'Verify browser installation',
      'Check file permissions',
      'Free up system resources',
      'Review configuration settings',
    ],
    monitoringTags: ['browser', 'startup', 'process', 'configuration'],
    estimatedImpact: {
      userExperience: 'HIGH',
      systemPerformance: 'MEDIUM',
      dataIntegrity: 'NONE',
    },
  },

  // Page and Navigation Errors
  PAGE_LOAD_TIMEOUT: {
    code: 'PAGE_LOAD_TIMEOUT',
    category: BrowserAutomationErrorCategory.PAGE_LOAD,
    severity: BrowserAutomationErrorSeverity.MEDIUM,
    recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
    description: 'Page failed to load within timeout period',
    commonCauses: [
      'Slow server response',
      'Large page resources',
      'Network latency',
      'JavaScript execution delays',
    ],
    recoveryStrategies: [
      'Increase page load timeout',
      'Optimize page resources',
      'Use page load strategies',
      'Implement progressive loading',
    ],
    monitoringTags: ['page-load', 'timeout', 'performance'],
    estimatedImpact: {
      userExperience: 'MEDIUM',
      systemPerformance: 'LOW',
      dataIntegrity: 'NONE',
    },
  },

  NAVIGATION_BLOCKED: {
    code: 'NAVIGATION_BLOCKED',
    category: BrowserAutomationErrorCategory.NAVIGATION,
    severity: BrowserAutomationErrorSeverity.HIGH,
    recoverability: BrowserAutomationErrorRecoverability.MANUAL_RECOVERY,
    description: 'Navigation to URL was blocked by security policy',
    commonCauses: [
      'CORS policy violations',
      'Security headers blocking',
      'Content Security Policy',
      'Mixed content restrictions',
    ],
    recoveryStrategies: [
      'Review security policies',
      'Configure CORS settings',
      'Use proxy for requests',
      'Request policy exceptions',
    ],
    monitoringTags: ['navigation', 'security', 'policy', 'cors'],
    estimatedImpact: {
      userExperience: 'HIGH',
      systemPerformance: 'NONE',
      dataIntegrity: 'NONE',
    },
  },

  // Element and DOM Errors
  ELEMENT_NOT_FOUND: {
    code: 'ELEMENT_NOT_FOUND',
    category: BrowserAutomationErrorCategory.ELEMENT_LOCATION,
    severity: BrowserAutomationErrorSeverity.MEDIUM,
    recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
    description: 'Target element not found on page',
    commonCauses: [
      'Element not yet loaded',
      'Dynamic content changes',
      'Incorrect selector',
      'Page structure modifications',
    ],
    recoveryStrategies: [
      'Wait for element to appear',
      'Use alternative selectors',
      'Check page state',
      'Implement dynamic waiting',
    ],
    monitoringTags: ['element', 'selector', 'dom', 'waiting'],
    estimatedImpact: {
      userExperience: 'MEDIUM',
      systemPerformance: 'NONE',
      dataIntegrity: 'LOW',
    },
  },

  ELEMENT_NOT_INTERACTIVE: {
    code: 'ELEMENT_NOT_INTERACTIVE',
    category: BrowserAutomationErrorCategory.ELEMENT_INTERACTION,
    severity: BrowserAutomationErrorSeverity.MEDIUM,
    recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
    description: 'Element exists but is not in an interactive state',
    commonCauses: [
      'Element is disabled',
      'Element is hidden',
      'Overlay blocking interaction',
      'Element not fully loaded',
    ],
    recoveryStrategies: [
      'Wait for element to become interactive',
      'Remove overlays or obstructions',
      'Check element state',
      'Use alternative interaction methods',
    ],
    monitoringTags: ['element', 'interaction', 'state', 'visibility'],
    estimatedImpact: {
      userExperience: 'MEDIUM',
      systemPerformance: 'NONE',
      dataIntegrity: 'LOW',
    },
  },

  // Authentication and Security Errors
  AUTH_SESSION_INVALID: {
    code: 'AUTH_SESSION_INVALID',
    category: BrowserAutomationErrorCategory.AUTHENTICATION,
    severity: BrowserAutomationErrorSeverity.HIGH,
    recoverability: BrowserAutomationErrorRecoverability.MANUAL_RECOVERY,
    description: 'Authentication session is invalid or expired',
    commonCauses: [
      'Session timeout',
      'Token expiration',
      'Logout action performed',
      'Security policy changes',
    ],
    recoveryStrategies: [
      'Re-authenticate user',
      'Refresh authentication tokens',
      'Check security policies',
      'Implement token refresh',
    ],
    monitoringTags: ['authentication', 'session', 'security', 'token'],
    estimatedImpact: {
      userExperience: 'HIGH',
      systemPerformance: 'NONE',
      dataIntegrity: 'MEDIUM',
    },
  },

  // Performance and Resource Errors
  MEMORY_LIMIT_EXCEEDED: {
    code: 'MEMORY_LIMIT_EXCEEDED',
    category: BrowserAutomationErrorCategory.MEMORY_EXHAUSTION,
    severity: BrowserAutomationErrorSeverity.HIGH,
    recoverability: BrowserAutomationErrorRecoverability.RECOVERABLE,
    description: 'Browser process exceeded memory limits',
    commonCauses: [
      'Memory leaks',
      'Large data processing',
      'Multiple open tabs',
      'Resource-intensive operations',
    ],
    recoveryStrategies: [
      'Restart browser process',
      'Optimize memory usage',
      'Close unnecessary tabs',
      'Implement memory monitoring',
    ],
    monitoringTags: ['memory', 'performance', 'resource', 'limits'],
    estimatedImpact: {
      userExperience: 'HIGH',
      systemPerformance: 'HIGH',
      dataIntegrity: 'LOW',
    },
  },

  // Task and Execution Errors
  TASK_EXECUTION_FAILED: {
    code: 'TASK_EXECUTION_FAILED',
    category: BrowserAutomationErrorCategory.EXECUTION_FAILURE,
    severity: BrowserAutomationErrorSeverity.MEDIUM,
    recoverability: BrowserAutomationErrorRecoverability.RETRY_POSSIBLE,
    description: 'Browser automation task failed to execute',
    commonCauses: [
      'Invalid task parameters',
      'Unexpected page state',
      'Resource unavailability',
      'Execution timeout',
    ],
    recoveryStrategies: [
      'Validate task parameters',
      'Check page state',
      'Retry with modifications',
      'Break down complex tasks',
    ],
    monitoringTags: ['task', 'execution', 'failure', 'automation'],
    estimatedImpact: {
      userExperience: 'MEDIUM',
      systemPerformance: 'LOW',
      dataIntegrity: 'MEDIUM',
    },
  },

  // Configuration and Environment Errors
  CONFIG_INVALID: {
    code: 'CONFIG_INVALID',
    category: BrowserAutomationErrorCategory.CONFIGURATION,
    severity: BrowserAutomationErrorSeverity.HIGH,
    recoverability: BrowserAutomationErrorRecoverability.MANUAL_RECOVERY,
    description: 'Invalid or missing configuration parameters',
    commonCauses: [
      'Missing required configuration',
      'Invalid configuration values',
      'Configuration file corruption',
      'Environment variable errors',
    ],
    recoveryStrategies: [
      'Validate configuration files',
      'Check environment variables',
      'Use default values',
      'Restore from backup',
    ],
    monitoringTags: ['configuration', 'validation', 'environment'],
    estimatedImpact: {
      userExperience: 'HIGH',
      systemPerformance: 'MEDIUM',
      dataIntegrity: 'NONE',
    },
  },

  // Unknown and System Errors
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    category: BrowserAutomationErrorCategory.UNKNOWN,
    severity: BrowserAutomationErrorSeverity.MEDIUM,
    recoverability: BrowserAutomationErrorRecoverability.MANUAL_RECOVERY,
    description: 'An unknown error occurred during browser automation',
    commonCauses: [
      'Unexpected system behavior',
      'Unhandled edge cases',
      'Third-party service issues',
      'Race conditions',
    ],
    recoveryStrategies: [
      'Collect detailed error information',
      'Retry operation',
      'Check system logs',
      'Contact technical support',
    ],
    monitoringTags: ['unknown', 'investigation', 'support'],
    estimatedImpact: {
      userExperience: 'MEDIUM',
      systemPerformance: 'LOW',
      dataIntegrity: 'LOW',
    },
  },
};

/**
 * Error classification service for determining error categories and recovery strategies
 */
export class BrowserAutomationErrorClassifier {
  /**
   * Classify an error based on its message, stack trace, and context
   */
  static classifyError(
    _error: Error | string,
    context?: Record<string, unknown>,
  ): BrowserAutomationErrorCode {
    const errorMessage = typeof error === 'string' ? _error : error.message;
    // Stack trace available for Error objects but not used in current classification logic

    // Pattern matching for error classification
    const patterns = [
      {
        pattern: /connection refused|ECONNREFUSED/i,
        code: 'NET_CONNECTION_REFUSED',
      },
      { pattern: /timeout|ETIMEDOUT/i, code: 'NET_TIMEOUT' },
      {
        pattern: /dns.*resolution|ENOTFOUND|getaddrinfo/i,
        code: 'NET_DNS_RESOLUTION_FAILED',
      },
      {
        pattern: /browser.*crash|process.*crash/i,
        code: 'BROWSER_PROCESS_CRASHED',
      },
      {
        pattern: /session.*expired|session.*invalid/i,
        code: 'BROWSER_SESSION_EXPIRED',
      },
      {
        pattern: /failed.*start.*browser|browser.*startup/i,
        code: 'BROWSER_PROCESS_STARTUP_FAILED',
      },
      {
        pattern: /page.*load.*timeout|navigation.*timeout/i,
        code: 'PAGE_LOAD_TIMEOUT',
      },
      {
        pattern: /navigation.*blocked|blocked.*navigation/i,
        code: 'NAVIGATION_BLOCKED',
      },
      {
        pattern: /element.*not.*found|selector.*not.*found/i,
        code: 'ELEMENT_NOT_FOUND',
      },
      {
        pattern: /element.*not.*interactive|not.*clickable/i,
        code: 'ELEMENT_NOT_INTERACTIVE',
      },
      {
        pattern: /auth.*invalid|authentication.*failed/i,
        code: 'AUTH_SESSION_INVALID',
      },
      {
        pattern: /memory.*limit|out.*of.*memory|OOM/i,
        code: 'MEMORY_LIMIT_EXCEEDED',
      },
      {
        pattern: /task.*execution.*failed|automation.*failed/i,
        code: 'TASK_EXECUTION_FAILED',
      },
      {
        pattern: /config.*invalid|configuration.*error/i,
        code: 'CONFIG_INVALID',
      },
    ];

    // Find matching pattern
    for (const { pattern, code } of patterns) {
      if (pattern.test(errorMessage)) {
        const classification = BROWSER_AUTOMATION_ERROR_REGISTRY[code];
        if (classification) {
          return classification;
        }
      }
    }

    // Context-based classification
    if (context) {
      if (context.type === 'network' || context.operation === 'fetch') {
        return BROWSER_AUTOMATION_ERROR_REGISTRY['NET_CONNECTION_REFUSED'];
      }
      if (context.type === 'element' || context.operation === 'click') {
        return BROWSER_AUTOMATION_ERROR_REGISTRY['ELEMENT_NOT_FOUND'];
      }
      if (context.type === 'page' || context.operation === 'navigate') {
        return BROWSER_AUTOMATION_ERROR_REGISTRY['NAVIGATION_BLOCKED'];
      }
    }

    // Default to unknown error
    return BROWSER_AUTOMATION_ERROR_REGISTRY['UNKNOWN_ERROR'];
  }

  /**
   * Get recovery strategies for a specific error category
   */
  static getRecoveryStrategies(
    category: BrowserAutomationErrorCategory,
  ): string[] {
    const errorCodes = Object.values(BROWSER_AUTOMATION_ERROR_REGISTRY).filter(
      (code) => code.category === category,
    );

    const strategies = new Set<string>();
    errorCodes.forEach((code) => {
      code.recoveryStrategies.forEach((strategy) => strategies.add(strategy));
    });

    return Array.from(strategies);
  }

  /**
   * Determine if an error is recoverable
   */
  static isRecoverable(errorCode: string): boolean {
    const classification = BROWSER_AUTOMATION_ERROR_REGISTRY[errorCode];
    return (
      classification?.recoverability ===
        BrowserAutomationErrorRecoverability.RECOVERABLE ||
      classification?.recoverability ===
        BrowserAutomationErrorRecoverability.RETRY_POSSIBLE
    );
  }

  /**
   * Get error severity level
   */
  static getErrorSeverity(errorCode: string): BrowserAutomationErrorSeverity {
    const classification = BROWSER_AUTOMATION_ERROR_REGISTRY[errorCode];
    return classification?.severity || BrowserAutomationErrorSeverity.MEDIUM;
  }

  /**
   * Get monitoring tags for error tracking
   */
  static getMonitoringTags(errorCode: string): string[] {
    const classification = BROWSER_AUTOMATION_ERROR_REGISTRY[errorCode];
    return classification?.monitoringTags || ['unknown', 'browser-automation'];
  }
}
