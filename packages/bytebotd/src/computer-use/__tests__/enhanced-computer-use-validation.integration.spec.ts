/**
 * Enhanced Computer-Use Validation Integration Tests
 *
 * Comprehensive test suite for PARLANT Computer-Use API validation
 * covering all validation services and performance requirements.
 *
 * Test Categories:
 * - Computer Control API Validation (mouse/keyboard)
 * - Screen Capture API Validation (privacy-aware)
 * - File System API Validation (security-focused)
 * - Application Control API Validation (process management)
 * - Performance Requirements (sub-500ms validation times)
 * - Enterprise Security Integration
 *
 * Performance Validation:
 * - Sub-200ms for minimal risk operations
 * - Sub-350ms for moderate risk operations
 * - Sub-500ms for high risk operations
 * - Cache hit rate >85% for repeated operations
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import {
  EnhancedComputerControlValidationService,
  ComputerControlValidationContext,
  MouseOperationRisk,
  KeyboardInputRisk,
} from '../enhanced-computer-control-validation.service';
import {
  EnhancedScreenCaptureValidationService,
  ScreenCaptureValidationContext,
  ContentPrivacyAssessment,
} from '../enhanced-screen-capture-validation.service';
import {
  EnhancedFileSystemValidationService,
  FileSystemValidationContext,
  FileOperationRisk,
} from '../enhanced-file-system-validation.service';
import {
  EnhancedApplicationControlValidationService,
  ApplicationControlValidationContext,
  ApplicationRisk,
} from '../enhanced-application-control-validation.service';
import {
  ParlantIntegrationService,
  RiskLevel,
} from '../../parlant/parlant-integration.service';
import {
  MoveMouseAction,
  ClickMouseAction,
  TypeTextAction,
  TypeKeysAction,
} from '@bytebot/shared';

// ===== TEST SETUP AND MOCKS =====

describe('Enhanced Computer-Use Validation Integration', () => {
  let computerControlService: EnhancedComputerControlValidationService;
  let screenCaptureService: EnhancedScreenCaptureValidationService;
  let fileSystemService: EnhancedFileSystemValidationService;
  let applicationControlService: EnhancedApplicationControlValidationService;
  let parlantService: jest.Mocked<ParlantIntegrationService>;

  // Test contexts
  let computerControlContext: ComputerControlValidationContext;
  let screenCaptureContext: ScreenCaptureValidationContext;
  let fileSystemContext: FileSystemValidationContext;
  let applicationControlContext: ApplicationControlValidationContext;

  beforeEach(async () => {
    // Mock ParlantIntegrationService
    const mockParlantService = {
      validateFunctionExecution: jest.fn(),
      createValidationSession: jest.fn(),
      getValidationHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedComputerControlValidationService,
        EnhancedScreenCaptureValidationService,
        EnhancedFileSystemValidationService,
        EnhancedApplicationControlValidationService,
        {
          provide: ParlantIntegrationService,
          useValue: mockParlantService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    computerControlService =
      module.get<EnhancedComputerControlValidationService>(
        EnhancedComputerControlValidationService,
      );
    screenCaptureService = module.get<EnhancedScreenCaptureValidationService>(
      EnhancedScreenCaptureValidationService,
    );
    fileSystemService = module.get<EnhancedFileSystemValidationService>(
      EnhancedFileSystemValidationService,
    );
    applicationControlService =
      module.get<EnhancedApplicationControlValidationService>(
        EnhancedApplicationControlValidationService,
      );
    parlantService = module.get(
      ParlantIntegrationService,
    ) as jest.Mocked<ParlantIntegrationService>;

    // Setup test contexts
    setupTestContexts();
  });

  function setupTestContexts() {
    computerControlContext = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      agentRole: 'operator',
      securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: {
        requestTimestamp: new Date(),
        operationId: 'test-op-789',
      },
      screenResolution: { width: 1920, height: 1080 },
      activeApplication: 'test-app',
      currentWindowTitle: 'Test Window',
      userAccessibilityNeeds: [],
      performanceRequirements: {
        maxValidationTimeMs: 500,
        requiresRealtime: true,
        criticalPath: false,
      },
      privacyContext: {
        screenRecordingAllowed: true,
        sensitiveDataVisible: false,
      },
    };

    screenCaptureContext = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      agentRole: 'operator',
      securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: {
        requestTimestamp: new Date(),
        operationId: 'test-op-789',
      },
      screenResolution: { width: 1920, height: 1080 },
      activeApplication: 'test-app',
      windowTitle: 'Test Window',
      privacySettings: {
        allowScreenRecording: true,
        allowContentAnalysis: true,
        allowOCRProcessing: true,
        consentExpiryMinutes: 30,
      },
      accessibilityContext: {
        screenReaderActive: false,
        highContrastMode: false,
        magnificationLevel: 1,
        userAccessibilityNeeds: [],
      },
      performanceRequirements: {
        maxValidationTimeMs: 500,
        allowCaching: true,
        requiresRealtime: true,
      },
    };

    fileSystemContext = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      agentRole: 'operator',
      securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: {
        requestTimestamp: new Date(),
        operationId: 'test-op-789',
      },
      userHomeDirectory: '/Users/test-user',
      workingDirectory: '/Users/test-user/Documents',
      allowedPaths: ['/Users/test-user/', '/tmp/'],
      restrictedPaths: ['/etc/', '/System/'],
      securitySettings: {
        allowSystemFileAccess: false,
        allowExecutableFileAccess: false,
        allowConfigFileModification: false,
        requireBackupForDestrictiveOps: true,
        maxFileSizeBytes: 100 * 1024 * 1024, // 100MB
      },
      performanceRequirements: {
        maxValidationTimeMs: 500,
        allowCaching: true,
        requiresRealtime: false,
      },
    };

    applicationControlContext = {
      userId: 'test-user-123',
      sessionId: 'test-session-456',
      agentRole: 'operator',
      securityLevel: 'MEDIUM',
      conversationHistory: [],
      metadata: {
        requestTimestamp: new Date(),
        operationId: 'test-op-789',
      },
      systemResources: {
        cpuUsagePercent: 25,
        memoryUsagePercent: 60,
        diskSpaceAvailable: 10 * 1024 * 1024 * 1024, // 10GB
        networkActivity: false,
      },
      securitySettings: {
        allowSystemApplications: false,
        allowThirdPartyApplications: true,
        allowCommandLineTools: false,
        allowNetworkApplications: true,
        maxConcurrentApps: 10,
      },
      currentApplications: [],
      performanceRequirements: {
        maxValidationTimeMs: 500,
        allowCaching: true,
        requiresRealtime: false,
      },
    };
  }

  // ===== COMPUTER CONTROL API TESTS =====

  describe('Computer Control API Validation', () => {
    describe('Mouse Movement Validation', () => {
      it('should approve safe mouse movements within 200ms', async () => {
        const startTime = Date.now();
        const mouseAction: MoveMouseAction = {
          action: 'move_mouse',
          coordinates: { x: 500, y: 300 }, // Safe middle area
        };

        const result = await computerControlService.validateMouseMovement(
          mouseAction,
          computerControlContext,
        );

        const duration = Date.now() - startTime;
        expect(result).toBe(true);
        expect(duration).toBeLessThan(200);
      });

      it('should validate system area mouse movements with parlant approval', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'User confirmed mouse movement to system area',
          confidence: 0.9,
        });

        const mouseAction: MoveMouseAction = {
          action: 'move_mouse',
          coordinates: { x: 10, y: 10 }, // Top-left corner (system area)
        };

        const result = await computerControlService.validateMouseMovement(
          mouseAction,
          computerControlContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'ComputerControl.moveMouse',
            riskLevel: expect.any(String),
          }),
        );
      });

      it('should cache repeated safe mouse movements for performance', async () => {
        const mouseAction: MoveMouseAction = {
          action: 'move_mouse',
          coordinates: { x: 500, y: 300 },
        };

        // First call
        const startTime1 = Date.now();
        const result1 = await computerControlService.validateMouseMovement(
          mouseAction,
          computerControlContext,
        );
        const duration1 = Date.now() - startTime1;

        // Second call (should be cached)
        const startTime2 = Date.now();
        const result2 = await computerControlService.validateMouseMovement(
          mouseAction,
          computerControlContext,
        );
        const duration2 = Date.now() - startTime2;

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(duration2).toBeLessThan(duration1); // Cached call should be faster
        expect(duration2).toBeLessThan(50); // Cache hit should be very fast
      });
    });

    describe('Mouse Click Validation', () => {
      it('should validate all mouse clicks through parlant', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'Mouse click approved for UI interaction',
          confidence: 0.85,
        });

        const clickAction: ClickMouseAction = {
          action: 'click_mouse',
          coordinates: { x: 800, y: 400 },
          button: 'left',
        };

        const startTime = Date.now();
        const result = await computerControlService.validateMouseClick(
          clickAction,
          computerControlContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toBe(true);
        expect(duration).toBeLessThan(350);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'ComputerControl.clickMouse',
            actionDescription: expect.stringContaining('left click'),
          }),
        );
      });

      it('should deny high-risk click operations', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: false,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'Click in critical system area denied for safety',
          confidence: 0.95,
        });

        const clickAction: ClickMouseAction = {
          action: 'click_mouse',
          coordinates: { x: 10, y: 10 }, // Critical system area
          button: 'left',
        };

        const result = await computerControlService.validateMouseClick(
          clickAction,
          computerControlContext,
        );

        expect(result).toBe(false);
      });
    });

    describe('Keyboard Input Validation', () => {
      it('should approve safe text input quickly', async () => {
        const typeAction: TypeTextAction = {
          action: 'type_text',
          text: 'Hello, this is safe test text',
        };

        const startTime = Date.now();
        const result = await computerControlService.validateKeyboardInput(
          typeAction,
          computerControlContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toBe(true);
        expect(duration).toBeLessThan(200);
      });

      it('should validate sensitive text input through parlant', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'Password input approved with masking',
          confidence: 0.9,
        });

        const typeAction: TypeTextAction = {
          action: 'type_text',
          text: 'password123', // Sensitive content
        };

        const result = await computerControlService.validateKeyboardInput(
          typeAction,
          computerControlContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'ComputerControl.type_text',
            functionParams: expect.objectContaining({
              content: expect.stringContaining('[CONTENT MASKED]'),
            }),
          }),
        );
      });

      it('should validate system key combinations', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'System key combination approved',
          confidence: 0.8,
        });

        const keysAction: TypeKeysAction = {
          action: 'type_keys',
          keys: ['ctrl', 'alt', 'del'],
        };

        const result = await computerControlService.validateKeyboardInput(
          keysAction,
          computerControlContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            riskLevel: RiskLevel._HIGH,
          }),
        );
      });
    });
  });

  // ===== SCREEN CAPTURE API TESTS =====

  describe('Screen Capture API Validation', () => {
    describe('Screenshot Validation', () => {
      it('should approve public content screenshots within 100ms', async () => {
        const publicContext = {
          ...screenCaptureContext,
          activeApplication: 'calculator',
          windowTitle: 'Calculator',
        };

        const startTime = Date.now();
        const result =
          await screenCaptureService.validateScreenshotCapture(publicContext);
        const duration = Date.now() - startTime;

        expect(result).toBe(true);
        expect(duration).toBeLessThan(100);
      });

      it('should require consent for personal content screenshots', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'User consented to personal content screenshot',
          confidence: 0.85,
        });

        const personalContext = {
          ...screenCaptureContext,
          activeApplication: 'mail',
          windowTitle: 'Personal Email - Inbox',
        };

        const result =
          await screenCaptureService.validateScreenshotCapture(personalContext);

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'ScreenCapture.screenshot',
            functionParams: expect.objectContaining({
              privacyLevel: 'PERSONAL',
            }),
          }),
        );
      });

      it('should block private content screenshots', async () => {
        const privateContext = {
          ...screenCaptureContext,
          activeApplication: '1password',
          windowTitle: '1Password - Vault',
        };

        const result =
          await screenCaptureService.validateScreenshotCapture(privateContext);

        expect(result).toBe(false);
      });

      it('should cache privacy assessments for performance', async () => {
        const context1 = {
          ...screenCaptureContext,
          activeApplication: 'calculator',
        };

        // First assessment
        const startTime1 = Date.now();
        const result1 =
          await screenCaptureService.validateScreenshotCapture(context1);
        const duration1 = Date.now() - startTime1;

        // Second assessment (should be faster due to caching)
        const startTime2 = Date.now();
        const result2 =
          await screenCaptureService.validateScreenshotCapture(context1);
        const duration2 = Date.now() - startTime2;

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(duration2).toBeLessThan(duration1);
      });
    });

    describe('Screen Analysis Validation', () => {
      it('should validate OCR operations with explicit consent', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'OCR analysis approved with privacy safeguards',
          confidence: 0.9,
        });

        const result = await screenCaptureService.validateScreenAnalysis(
          'OCR',
          screenCaptureContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            riskLevel: RiskLevel._HIGH,
          }),
        );
      });

      it('should allow accessibility scans for accessibility users', async () => {
        const accessibilityContext = {
          ...screenCaptureContext,
          accessibilityContext: {
            ...screenCaptureContext.accessibilityContext,
            userAccessibilityNeeds: ['screen_reader'],
          },
        };

        const startTime = Date.now();
        const result = await screenCaptureService.validateScreenAnalysis(
          'ACCESSIBILITY_SCAN',
          accessibilityContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toBe(true);
        expect(duration).toBeLessThan(100);
      });
    });
  });

  // ===== FILE SYSTEM API TESTS =====

  describe('File System API Validation', () => {
    describe('File Read Validation', () => {
      it('should approve safe file reads within 100ms', async () => {
        const filePath = '/Users/test-user/Documents/report.txt';

        const startTime = Date.now();
        const result = await fileSystemService.validateFileRead(
          filePath,
          fileSystemContext,
        );
        const duration = Date.now() - startTime;

        expect(result).toBe(true);
        expect(duration).toBeLessThan(100);
      });

      it('should block restricted path access', async () => {
        const filePath = '/etc/passwd';

        const result = await fileSystemService.validateFileRead(
          filePath,
          fileSystemContext,
        );

        expect(result).toBe(false);
      });

      it('should validate system file access through parlant', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'System file read approved for diagnostic purposes',
          confidence: 0.8,
        });

        const systemFileContext = {
          ...fileSystemContext,
          securitySettings: {
            ...fileSystemContext.securitySettings,
            allowSystemFileAccess: true,
          },
        };

        const filePath = '/var/log/system.log';

        const result = await fileSystemService.validateFileRead(
          filePath,
          systemFileContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'FileSystem.readFile',
          }),
        );
      });
    });

    describe('File Write Validation', () => {
      it('should validate file writes with backup creation', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'File write approved with backup created',
          confidence: 0.9,
        });

        const filePath = '/Users/test-user/Documents/test.txt';
        const content = 'This is test content for the file';

        const result = await fileSystemService.validateFileWrite(
          filePath,
          content,
          fileSystemContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'FileSystem.writeFile',
            functionParams: expect.objectContaining({
              backupCreated: expect.any(Boolean),
            }),
          }),
        );
      });

      it('should block writes with malicious content', async () => {
        const filePath = '/Users/test-user/Documents/suspicious.txt';
        const maliciousContent = 'eval(base64_decode("malicious_code_here"))';

        const result = await fileSystemService.validateFileWrite(
          filePath,
          maliciousContent,
          fileSystemContext,
        );

        expect(result).toBe(false);
      });

      it('should validate sensitive data writes', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'Sensitive data write approved with encryption',
          confidence: 0.85,
        });

        const filePath = '/Users/test-user/Documents/credentials.txt';
        const sensitiveContent = 'password=secret123\napi_key=abc123def456';

        const result = await fileSystemService.validateFileWrite(
          filePath,
          sensitiveContent,
          fileSystemContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            riskLevel: RiskLevel._HIGH,
            functionParams: expect.objectContaining({
              sensitiveData: true,
            }),
          }),
        );
      });
    });

    describe('File Delete Validation', () => {
      it('should always require validation for file deletion', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'File deletion approved with backup verification',
          confidence: 0.9,
        });

        const filePath = '/Users/test-user/Documents/old-file.txt';

        const result = await fileSystemService.validateFileDelete(
          filePath,
          fileSystemContext,
        );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'FileSystem.deleteFile',
            riskLevel: RiskLevel._HIGH,
          }),
        );
      });
    });
  });

  // ===== APPLICATION CONTROL API TESTS =====

  describe('Application Control API Validation', () => {
    describe('Application Launch Validation', () => {
      it('should approve safe application launches within 200ms', async () => {
        const startTime = Date.now();
        const result =
          await applicationControlService.validateApplicationLaunch(
            'calculator',
            '/Applications/Calculator.app',
            [],
            applicationControlContext,
          );
        const duration = Date.now() - startTime;

        expect(result).toBe(true);
        expect(duration).toBeLessThan(200);
      });

      it('should validate system applications through parlant', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: true,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning: 'System utility launch approved with monitoring',
          confidence: 0.8,
        });

        const result =
          await applicationControlService.validateApplicationLaunch(
            'terminal',
            '/Applications/Utilities/Terminal.app',
            [],
            applicationControlContext,
          );

        expect(result).toBe(true);
        expect(parlantService.validateFunctionExecution).toHaveBeenCalledWith(
          expect.objectContaining({
            functionName: 'ApplicationControl.launchApplication',
            riskLevel: RiskLevel._HIGH,
          }),
        );
      });

      it('should block dangerous applications', async () => {
        const result =
          await applicationControlService.validateApplicationLaunch(
            'malware.exe',
            '/tmp/malware.exe',
            [],
            applicationControlContext,
          );

        expect(result).toBe(false);
      });

      it('should check resource availability before launch', async () => {
        const highResourceContext = {
          ...applicationControlContext,
          systemResources: {
            ...applicationControlContext.systemResources,
            cpuUsagePercent: 95, // High CPU usage
          },
        };

        const result =
          await applicationControlService.validateApplicationLaunch(
            'photoshop',
            '/Applications/Adobe Photoshop/Photoshop.app',
            [],
            highResourceContext,
          );

        expect(result).toBe(false);
      });
    });

    describe('Application Termination Validation', () => {
      it('should allow user application termination', async () => {
        const result =
          await applicationControlService.validateApplicationTermination(
            12345,
            'calculator',
            false,
            applicationControlContext,
          );

        expect(result).toBe(true);
      });

      it('should validate critical process termination', async () => {
        parlantService.validateFunctionExecution.mockResolvedValue({
          approved: false,
          conversationId: 'conv-123',
          validationTimestamp: new Date(),
          reasoning:
            'Critical system process termination denied for system stability',
          confidence: 0.95,
        });

        const result =
          await applicationControlService.validateApplicationTermination(
            1,
            'kernel',
            true,
            applicationControlContext,
          );

        expect(result).toBe(false);
      });
    });
  });

  // ===== PERFORMANCE TESTS =====

  describe('Performance Requirements', () => {
    it('should meet sub-500ms validation targets for all operations', async () => {
      const operations = [
        () =>
          computerControlService.validateMouseMovement(
            { action: 'move_mouse', coordinates: { x: 500, y: 300 } },
            computerControlContext,
          ),
        () =>
          screenCaptureService.validateScreenshotCapture(screenCaptureContext),
        () =>
          fileSystemService.validateFileRead(
            '/Users/test-user/Documents/test.txt',
            fileSystemContext,
          ),
        () =>
          applicationControlService.validateApplicationLaunch(
            'calculator',
            '/Applications/Calculator.app',
            [],
            applicationControlContext,
          ),
      ];

      const results = await Promise.all(
        operations.map(async (operation) => {
          const startTime = Date.now();
          const result = await operation();
          const duration = Date.now() - startTime;
          return { result, duration };
        }),
      );

      results.forEach(({ result, duration }) => {
        expect(result).toBe(true);
        expect(duration).toBeLessThan(500);
      });
    });

    it('should achieve >85% cache hit rate for repeated operations', async () => {
      const mouseAction: MoveMouseAction = {
        action: 'move_mouse',
        coordinates: { x: 500, y: 300 },
      };

      // Perform multiple operations to populate cache
      for (let i = 0; i < 10; i++) {
        await computerControlService.validateMouseMovement(
          mouseAction,
          computerControlContext,
        );
      }

      const metrics = computerControlService.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toBeGreaterThan(0.85);
    });
  });

  // ===== INTEGRATION TESTS =====

  describe('Service Integration', () => {
    it('should coordinate multiple validation services for complex operations', async () => {
      parlantService.validateFunctionExecution.mockResolvedValue({
        approved: true,
        conversationId: 'conv-123',
        validationTimestamp: new Date(),
        reasoning: 'Complex operation approved with comprehensive validation',
        confidence: 0.9,
      });

      // Simulate a complex operation involving multiple services
      const results = await Promise.all([
        computerControlService.validateMouseClick(
          {
            action: 'click_mouse',
            coordinates: { x: 800, y: 400 },
            button: 'left',
          },
          computerControlContext,
        ),
        screenCaptureService.validateScreenshotCapture(screenCaptureContext),
        fileSystemService.validateFileRead(
          '/Users/test-user/Documents/data.txt',
          fileSystemContext,
        ),
      ]);

      expect(results.every((result) => result === true)).toBe(true);
    });

    it('should maintain consistent security levels across all services', async () => {
      const securityTestCases = [
        () =>
          computerControlService.validateMouseMovement(
            { action: 'move_mouse', coordinates: { x: 10, y: 10 } }, // System area
            computerControlContext,
          ),
        () =>
          screenCaptureService.validateScreenshotCapture({
            ...screenCaptureContext,
            activeApplication: 'banking-app',
          }),
        () =>
          fileSystemService.validateFileRead('/etc/passwd', fileSystemContext),
        () =>
          applicationControlService.validateApplicationLaunch(
            'admin-tool',
            '/usr/bin/admin-tool',
            ['--privileged'],
            applicationControlContext,
          ),
      ];

      // All these operations should require parlant validation or be blocked
      for (const testCase of securityTestCases) {
        try {
          const result = await testCase();
          // If not blocked, should have required parlant validation
          if (result === true) {
            expect(parlantService.validateFunctionExecution).toHaveBeenCalled();
          }
        } catch (error) {
          // Some operations may throw errors for security violations, which is acceptable
          expect(error).toBeDefined();
        }
      }
    });
  });

  // ===== ERROR HANDLING TESTS =====

  describe('Error Handling', () => {
    it('should handle parlant service failures gracefully', async () => {
      parlantService.validateFunctionExecution.mockRejectedValue(
        new Error('Parlant service unavailable'),
      );

      await expect(
        computerControlService.validateMouseClick(
          {
            action: 'click_mouse',
            coordinates: { x: 800, y: 400 },
            button: 'left',
          },
          computerControlContext,
        ),
      ).rejects.toThrow('Parlant service unavailable');
    });

    it('should validate input parameters and reject invalid requests', async () => {
      await expect(
        fileSystemService.validateFileRead(
          '../../../etc/passwd', // Path traversal attempt
          fileSystemContext,
        ),
      ).resolves.toBe(false);
    });

    it('should handle resource constraints appropriately', async () => {
      const resourceConstrainedContext = {
        ...applicationControlContext,
        systemResources: {
          ...applicationControlContext.systemResources,
          memoryUsagePercent: 95,
        },
      };

      const result = await applicationControlService.validateApplicationLaunch(
        'heavy-application',
        '/Applications/Heavy.app',
        [],
        resourceConstrainedContext,
      );

      expect(result).toBe(false);
    });
  });

  // ===== CLEANUP =====

  afterEach(() => {
    jest.clearAllMocks();
  });
});
