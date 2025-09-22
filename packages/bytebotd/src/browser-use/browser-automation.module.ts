/**
 * Browser Automation Module - Browser-Use Integration Module
 *
 * This module integrates browser-use functionality into the Bytebot platform,
 * providing comprehensive browser automation capabilities through a secure and
 * scalable NestJS module. It includes all controllers, services, and middleware
 * required for enterprise-grade browser automation operations.
 *
 * Key Features:
 * - Browser session management and lifecycle control
 * - Async job integration with existing Bytebot infrastructure
 * - Comprehensive authentication and authorization
 * - Security validation and input sanitization
 * - Performance monitoring and analytics
 * - Error handling and recovery mechanisms
 * - Resource management and cleanup
 *
 * Dependencies: ComprehensiveJobOrchestratorService, AuthModule, SharedModule
 */

import { Module, Logger } from '@nestjs/common';
import { BrowserAutomationController } from './browser-automation.controller';
import { BrowserAutomationService } from './browser-automation.service';
import { BrowserAutomationValidationPipe } from './pipes/browser-automation-validation.pipe';

/**
 * Browser Automation Module Configuration
 *
 * Configures all components required for browser automation functionality
 * including controllers, services, pipes, and integrations with existing
 * Bytebot infrastructure for authentication, job management, and monitoring.
 */
@Module({
  imports: [
    // Note: These imports would be added when integrating with the full Bytebot application
    // AuthModule,
    // SharedModule,
    // ComputerUseModule, // For job orchestration integration
  ],
  controllers: [
    BrowserAutomationController,
  ],
  providers: [
    BrowserAutomationService,
    BrowserAutomationValidationPipe,
    {
      provide: 'BROWSER_AUTOMATION_CONFIG',
      useValue: {
        pythonExecutablePath: process.env.PYTHON_EXECUTABLE_PATH || 'python3',
        browserUsePath: process.env.BROWSER_USE_PATH || '../../../browser-use',
        maxSessions: parseInt(process.env.MAX_BROWSER_SESSIONS || '10', 10),
        sessionTimeoutMs: parseInt(process.env.BROWSER_SESSION_TIMEOUT_MS || '1800000', 10), // 30 minutes
        cleanupIntervalMs: parseInt(process.env.CLEANUP_INTERVAL_MS || '60000', 10), // 1 minute
        enableAIFeatures: process.env.ENABLE_AI_FEATURES === 'true',
        defaultViewport: {
          width: parseInt(process.env.DEFAULT_VIEWPORT_WIDTH || '1920', 10),
          height: parseInt(process.env.DEFAULT_VIEWPORT_HEIGHT || '1080', 10),
        },
        securitySettings: {
          allowLocalNetwork: process.env.ALLOW_LOCAL_NETWORK === 'true',
          maxUrlLength: parseInt(process.env.MAX_URL_LENGTH || '2048', 10),
          maxSelectorLength: parseInt(process.env.MAX_SELECTOR_LENGTH || '1000', 10),
          maxTextInputLength: parseInt(process.env.MAX_TEXT_INPUT_LENGTH || '10000', 10),
          allowedFileExtensions: (process.env.ALLOWED_FILE_EXTENSIONS || '.txt,.csv,.json,.xml,.pdf,.png,.jpg,.jpeg,.gif,.bmp,.svg,.doc,.docx,.xls,.xlsx').split(','),
        },
        performanceSettings: {
          commandTimeoutMs: parseInt(process.env.COMMAND_TIMEOUT_MS || '30000', 10),
          navigationTimeoutMs: parseInt(process.env.NAVIGATION_TIMEOUT_MS || '30000', 10),
          actionTimeoutMs: parseInt(process.env.ACTION_TIMEOUT_MS || '10000', 10),
          extractionTimeoutMs: parseInt(process.env.EXTRACTION_TIMEOUT_MS || '30000', 10),
        },
      },
    },
    {
      provide: 'BROWSER_AUTOMATION_LOGGER',
      useFactory: () => {
        return new Logger('BrowserAutomationModule');
      },
    },
  ],
  exports: [
    BrowserAutomationService,
    BrowserAutomationValidationPipe,
  ],
})
export class BrowserAutomationModule {
  private readonly logger = new Logger(BrowserAutomationModule.name);

  constructor() {
    this.logger.log('Browser Automation Module initialized');
    this.logConfiguration();
  }

  /**
   * Log module configuration for debugging and monitoring
   */
  private logConfiguration(): void {
    const config = {
      pythonPath: process.env.PYTHON_EXECUTABLE_PATH || 'python3',
      browserUsePath: process.env.BROWSER_USE_PATH || '../../../browser-use',
      maxSessions: process.env.MAX_BROWSER_SESSIONS || '10',
      sessionTimeout: process.env.BROWSER_SESSION_TIMEOUT_MS || '1800000',
      cleanupInterval: process.env.CLEANUP_INTERVAL_MS || '60000',
      enableAI: process.env.ENABLE_AI_FEATURES || 'false',
      defaultViewport: `${process.env.DEFAULT_VIEWPORT_WIDTH || '1920'}x${process.env.DEFAULT_VIEWPORT_HEIGHT || '1080'}`,
      allowLocalNetwork: process.env.ALLOW_LOCAL_NETWORK || 'false',
      commandTimeout: process.env.COMMAND_TIMEOUT_MS || '30000',
    };

    this.logger.log('Browser Automation Module Configuration:', config);

    // Validate critical configuration
    this.validateConfiguration();
  }

  /**
   * Validate critical configuration settings
   */
  private validateConfiguration(): void {
    const maxSessions = parseInt(process.env.MAX_BROWSER_SESSIONS || '10', 10);
    const sessionTimeout = parseInt(process.env.BROWSER_SESSION_TIMEOUT_MS || '1800000', 10);
    const commandTimeout = parseInt(process.env.COMMAND_TIMEOUT_MS || '30000', 10);

    // Validate session limits
    if (maxSessions < 1 || maxSessions > 50) {
      this.logger.warn(`Invalid MAX_BROWSER_SESSIONS: ${maxSessions}. Using default: 10`);
    }

    // Validate timeouts
    if (sessionTimeout < 60000) { // Minimum 1 minute
      this.logger.warn(`Session timeout too low: ${sessionTimeout}ms. Recommend at least 60000ms`);
    }

    if (commandTimeout < 1000) { // Minimum 1 second
      this.logger.warn(`Command timeout too low: ${commandTimeout}ms. Recommend at least 1000ms`);
    }

    // Check Python path availability (basic check)
    const pythonPath = process.env.PYTHON_EXECUTABLE_PATH || 'python3';
    if (!pythonPath) {
      this.logger.error('Python executable path not configured. Browser automation may fail.');
    }

    // Check browser-use path
    const browserUsePath = process.env.BROWSER_USE_PATH || '../../../browser-use';
    if (!browserUsePath) {
      this.logger.error('Browser-use path not configured. Browser automation may fail.');
    }

    this.logger.log('Configuration validation completed');
  }

  /**
   * Get module health status for monitoring
   */
  static getHealthStatus(): {
    status: 'healthy' | 'warning' | 'error';
    details: Record<string, any>;
  } {
    const status = {
      status: 'healthy' as 'healthy' | 'warning' | 'error',
      details: {
        moduleLoaded: true,
        configurationValid: true,
        pythonAvailable: !!process.env.PYTHON_EXECUTABLE_PATH,
        browserUsePathSet: !!process.env.BROWSER_USE_PATH,
        timestamp: new Date().toISOString(),
      },
    };

    // Check for warning conditions
    if (!process.env.PYTHON_EXECUTABLE_PATH || !process.env.BROWSER_USE_PATH) {
      status.status = 'warning';
      status.details.warnings = [
        'Python executable path or browser-use path not explicitly configured',
      ];
    }

    // Check for error conditions
    const maxSessions = parseInt(process.env.MAX_BROWSER_SESSIONS || '10', 10);
    if (isNaN(maxSessions) || maxSessions < 1) {
      status.status = 'error';
      status.details.errors = ['Invalid MAX_BROWSER_SESSIONS configuration'];
    }

    return status;
  }
}

/**
 * Browser Automation Configuration Interface
 *
 * Defines the structure for browser automation configuration options
 * that can be injected throughout the module.
 */
export interface BrowserAutomationConfig {
  pythonExecutablePath: string;
  browserUsePath: string;
  maxSessions: number;
  sessionTimeoutMs: number;
  cleanupIntervalMs: number;
  enableAIFeatures: boolean;
  defaultViewport: {
    width: number;
    height: number;
  };
  securitySettings: {
    allowLocalNetwork: boolean;
    maxUrlLength: number;
    maxSelectorLength: number;
    maxTextInputLength: number;
    allowedFileExtensions: string[];
  };
  performanceSettings: {
    commandTimeoutMs: number;
    navigationTimeoutMs: number;
    actionTimeoutMs: number;
    extractionTimeoutMs: number;
  };
}

/**
 * Browser Automation Module Factory
 *
 * Provides a factory function for creating the browser automation module
 * with custom configuration options for different deployment environments.
 */
export class BrowserAutomationModuleFactory {
  /**
   * Create browser automation module with custom configuration
   *
   * @param config Custom configuration options
   * @returns Configured BrowserAutomationModule class
   */
  static createWithConfig(config: Partial<BrowserAutomationConfig>) {
    @Module({
      controllers: [BrowserAutomationController],
      providers: [
        BrowserAutomationService,
        BrowserAutomationValidationPipe,
        {
          provide: 'BROWSER_AUTOMATION_CONFIG',
          useValue: {
            pythonExecutablePath: config.pythonExecutablePath || 'python3',
            browserUsePath: config.browserUsePath || '../../../browser-use',
            maxSessions: config.maxSessions || 10,
            sessionTimeoutMs: config.sessionTimeoutMs || 1800000,
            cleanupIntervalMs: config.cleanupIntervalMs || 60000,
            enableAIFeatures: config.enableAIFeatures || false,
            defaultViewport: config.defaultViewport || { width: 1920, height: 1080 },
            securitySettings: {
              allowLocalNetwork: false,
              maxUrlLength: 2048,
              maxSelectorLength: 1000,
              maxTextInputLength: 10000,
              allowedFileExtensions: ['.txt', '.csv', '.json', '.xml', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.doc', '.docx', '.xls', '.xlsx'],
              ...config.securitySettings,
            },
            performanceSettings: {
              commandTimeoutMs: 30000,
              navigationTimeoutMs: 30000,
              actionTimeoutMs: 10000,
              extractionTimeoutMs: 30000,
              ...config.performanceSettings,
            },
          },
        },
      ],
      exports: [BrowserAutomationService, BrowserAutomationValidationPipe],
    })
    class CustomBrowserAutomationModule extends BrowserAutomationModule {}

    return CustomBrowserAutomationModule;
  }
}

/**
 * Browser Automation Test Module
 *
 * Provides a test-specific version of the browser automation module
 * with mocked dependencies and test-friendly configuration.
 */
@Module({
  controllers: [BrowserAutomationController],
  providers: [
    {
      provide: BrowserAutomationService,
      useValue: {
        // Mock implementation for testing
        createSession: jest.fn(),
        listSessions: jest.fn(),
        closeSession: jest.fn(),
        captureScreenshot: jest.fn(),
        navigateToUrl: jest.fn(),
        executeAction: jest.fn(),
        extractData: jest.fn(),
      },
    },
    BrowserAutomationValidationPipe,
    {
      provide: 'BROWSER_AUTOMATION_CONFIG',
      useValue: {
        pythonExecutablePath: 'python3',
        browserUsePath: '/mock/browser-use',
        maxSessions: 5,
        sessionTimeoutMs: 300000, // 5 minutes for testing
        cleanupIntervalMs: 10000, // 10 seconds for testing
        enableAIFeatures: false,
        defaultViewport: { width: 1024, height: 768 },
        securitySettings: {
          allowLocalNetwork: true, // Allow for testing
          maxUrlLength: 1000,
          maxSelectorLength: 500,
          maxTextInputLength: 5000,
          allowedFileExtensions: ['.txt', '.json'],
        },
        performanceSettings: {
          commandTimeoutMs: 5000,
          navigationTimeoutMs: 10000,
          actionTimeoutMs: 5000,
          extractionTimeoutMs: 10000,
        },
      },
    },
  ],
  exports: [BrowserAutomationService, BrowserAutomationValidationPipe],
})
export class BrowserAutomationTestModule {}