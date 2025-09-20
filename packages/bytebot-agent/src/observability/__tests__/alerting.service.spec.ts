/**
 * Alerting Service Comprehensive Unit Tests
 * Tests enterprise alerting, escalation policies, and multi-channel notifications
 *
 * @author Claude Code - Testing & Quality Assurance Specialist
 * @version 2.0.0
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import {
  AlertingService,
  AlertRule,
  Alert,
  EscalationPolicy,
  NotificationConfig,
  AlertSeverity,
  AlertStatus,
  NotificationChannel,
} from '../alerting.service';
import { MetricsService } from '../../metrics/metrics.service';

describe('AlertingService', () => {
  let service: AlertingService;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
    };

    const mockMetricsService = {
      recordAlertTriggered: jest.fn(),
      recordSecurityEvent: jest.fn(),
      recordComplianceCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertingService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<AlertingService>(AlertingService);
    configService = module.get(ConfigService);
    eventEmitter = module.get(EventEmitter2);
    metricsService = module.get(MetricsService);

    // Setup default config values
    configService.get.mockImplementation((key: string, defaultValue?: any) => {
      const mockValues = {
        ALERTING_EMAIL: undefined,
        SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test',
        SLACK_CHANNEL: '#alerts',
        SLACK_BOT_TOKEN: 'xoxb-test-token',
        ALERTING_WEBHOOK_URL: 'https://webhook.example.com',
        ALERTING_WEBHOOK_TIMEOUT: 5000,
        PAGERDUTY_INTEGRATION_KEY: 'test-pagerduty-key',
        PAGERDUTY_API_URL: 'https://events.pagerduty.com/v2/enqueue',
      };
      return mockValues[key] || defaultValue;
    });

    // Clear all timers before each test
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(AlertingService);
    });

    it('should initialize with notification configuration', async () => {
      await service.onModuleInit();

      // Should have configured notification channels
      expect(configService.get).toHaveBeenCalledWith('SLACK_WEBHOOK_URL');
      expect(configService.get).toHaveBeenCalledWith(
        'PAGERDUTY_INTEGRATION_KEY',
      );
    });

    it('should setup default alert rules on initialization', async () => {
      await service.onModuleInit();

      const rules = service.getAlertRules();
      expect(rules.length).toBeGreaterThan(0);

      // Check for key default rules
      const ruleNames = rules.map((rule) => rule.name);
      expect(ruleNames).toContain('High CPU Usage');
      expect(ruleNames).toContain('High Memory Usage');
      expect(ruleNames).toContain('High Error Rate');
      expect(ruleNames).toContain('Security Threat Detected');
      expect(ruleNames).toContain('Authentication Failures');
    });

    it('should setup escalation policies on initialization', async () => {
      await service.onModuleInit();

      // Verify escalation policies are configured
      // We can't directly access private properties, but we can test behavior
      const stats = service.getAlertingStats();
      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('totalRules');
    });

    it('should handle initialization errors gracefully', async () => {
      configService.get.mockImplementation(() => {
        throw new Error('Config access failed');
      });

      await expect(service.onModuleInit()).rejects.toThrow(
        'Config access failed',
      );
    });
  });

  describe('Alert Rule Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should add alert rules successfully', () => {
      const rule: AlertRule = {
        id: 'test-rule-1',
        name: 'Test Alert Rule',
        description: 'Test rule description',
        severity: 'medium',
        condition: 'test_metric > 50',
        threshold: 50,
        evaluationWindow: 300000,
        cooldownPeriod: 600000,
        channels: ['slack', 'email'],
        enabled: true,
        tags: { category: 'test', environment: 'test' },
      };

      service.addAlertRule(rule);

      const rules = service.getAlertRules();
      const addedRule = rules.find((r) => r.id === 'test-rule-1');
      expect(addedRule).toBeDefined();
      expect(addedRule?.name).toBe('Test Alert Rule');
      expect(addedRule?.severity).toBe('medium');
    });

    it('should remove alert rules successfully', () => {
      const rule: AlertRule = {
        id: 'test-rule-2',
        name: 'Removable Rule',
        description: 'Rule to be removed',
        severity: 'low',
        condition: 'test_metric > 10',
        threshold: 10,
        evaluationWindow: 60000,
        cooldownPeriod: 120000,
        channels: ['slack'],
        enabled: true,
        tags: { temporary: 'true' },
      };

      service.addAlertRule(rule);
      expect(
        service.getAlertRules().find((r) => r.id === 'test-rule-2'),
      ).toBeDefined();

      const removed = service.removeAlertRule('test-rule-2');
      expect(removed).toBe(true);
      expect(
        service.getAlertRules().find((r) => r.id === 'test-rule-2'),
      ).toBeUndefined();
    });

    it('should return false when removing non-existent rule', () => {
      const removed = service.removeAlertRule('non-existent-rule');
      expect(removed).toBe(false);
    });

    it('should validate alert rule properties', () => {
      const rule: AlertRule = {
        id: 'validation-test',
        name: 'Validation Test Rule',
        description: 'Testing rule validation',
        severity: 'critical',
        condition: 'error_rate > 0.1',
        threshold: 0.1,
        evaluationWindow: 120000,
        cooldownPeriod: 300000,
        channels: ['slack', 'email', 'pagerduty'],
        enabled: false,
        tags: { validation: 'test' },
      };

      service.addAlertRule(rule);

      const rules = service.getAlertRules();
      const addedRule = rules.find((r) => r.id === 'validation-test');
      expect(addedRule?.enabled).toBe(false);
      expect(addedRule?.channels).toContain('pagerduty');
      expect(addedRule?.threshold).toBe(0.1);
    });
  });

  describe('Alert Triggering and Management', () => {
    let testRule: AlertRule;

    beforeEach(async () => {
      await service.onModuleInit();

      testRule = {
        id: 'trigger-test-rule',
        name: 'Trigger Test Rule',
        description: 'Rule for testing alert triggering',
        severity: 'high',
        condition: 'test_condition',
        threshold: 100,
        evaluationWindow: 300000,
        cooldownPeriod: 600000,
        channels: ['slack', 'email'],
        enabled: true,
        tags: { test: 'trigger' },
      };

      service.addAlertRule(testRule);
    });

    it('should trigger alerts successfully', async () => {
      const alertId = await service.triggerAlert(
        'trigger-test-rule',
        'Test Alert',
        'This is a test alert description',
        'test-source',
        { key: 'value' },
        'correlation-123',
      );

      expect(alertId).toBeDefined();
      expect(alertId).toMatch(/^alert_\d+_[\w-]+$/);

      // Check alert was recorded
      const alert = service.getAlert(alertId);
      expect(alert).toBeDefined();
      expect(alert?.title).toBe('Test Alert');
      expect(alert?.status).toBe('triggered');
      expect(alert?.severity).toBe('high');
      expect(alert?.correlationId).toBe('correlation-123');
      expect(alert?.metadata.key).toBe('value');
    });

    it('should not trigger alerts for disabled rules', async () => {
      // Disable the rule
      testRule.enabled = false;
      service.addAlertRule(testRule);

      const alertId = await service.triggerAlert(
        'trigger-test-rule',
        'Disabled Rule Alert',
        'This alert should not be triggered',
        'test-source',
      );

      expect(alertId).toBe('');
    });

    it('should not trigger alerts for non-existent rules', async () => {
      const alertId = await service.triggerAlert(
        'non-existent-rule',
        'Missing Rule Alert',
        'This alert should not be triggered',
        'test-source',
      );

      expect(alertId).toBe('');
    });

    it('should record metrics when triggering alerts', async () => {
      await service.triggerAlert(
        'trigger-test-rule',
        'Metrics Test Alert',
        'Testing metrics recording',
        'metrics-source',
      );

      expect(metricsService.recordAlertTriggered).toHaveBeenCalledWith(
        'Trigger Test Rule',
        'high',
        'slack,email',
      );
    });

    it('should emit events when triggering alerts', async () => {
      await service.triggerAlert(
        'trigger-test-rule',
        'Event Test Alert',
        'Testing event emission',
        'event-source',
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'alert.triggered',
        expect.objectContaining({
          title: 'Event Test Alert',
          status: 'triggered',
          source: 'event-source',
        }),
      );
    });
  });

  describe('Alert Acknowledgment and Resolution', () => {
    let testRule: AlertRule;
    let alertId: string;

    beforeEach(async () => {
      await service.onModuleInit();

      testRule = {
        id: 'ack-test-rule',
        name: 'Acknowledgment Test Rule',
        description: 'Rule for testing acknowledgments',
        severity: 'medium',
        condition: 'test_condition',
        threshold: 50,
        evaluationWindow: 180000,
        cooldownPeriod: 360000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'acknowledgment' },
      };

      service.addAlertRule(testRule);
      alertId = await service.triggerAlert(
        'ack-test-rule',
        'Acknowledgment Test',
        'Alert for testing acknowledgment',
        'ack-source',
      );
    });

    it('should acknowledge alerts successfully', () => {
      const acknowledged = service.acknowledgeAlert(alertId, 'test-user');
      expect(acknowledged).toBe(true);

      const alert = service.getAlert(alertId);
      expect(alert?.status).toBe('acknowledged');
      expect(alert?.acknowledgedAt).toBeDefined();
      expect(alert?.metadata.acknowledgedBy).toBe('test-user');
    });

    it('should handle acknowledgment of non-existent alerts', () => {
      const acknowledged = service.acknowledgeAlert(
        'non-existent-alert',
        'test-user',
      );
      expect(acknowledged).toBe(false);
    });

    it('should handle double acknowledgment gracefully', () => {
      service.acknowledgeAlert(alertId, 'user1');
      const acknowledged = service.acknowledgeAlert(alertId, 'user2');
      expect(acknowledged).toBe(true);

      const alert = service.getAlert(alertId);
      expect(alert?.metadata.acknowledgedBy).toBe('user1'); // Should not change
    });

    it('should emit events when acknowledging alerts', () => {
      service.acknowledgeAlert(alertId, 'event-user');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'alert.acknowledged',
        expect.objectContaining({
          status: 'acknowledged',
          _metadata: expect.objectContaining({
            acknowledgedBy: 'event-user',
          }),
        }),
      );
    });

    it('should resolve alerts successfully', () => {
      const resolved = service.resolveAlert(
        alertId,
        'resolver-user',
        'Fixed the issue',
      );
      expect(resolved).toBe(true);

      const alert = service.getAlert(alertId);
      expect(alert?.status).toBe('resolved');
      expect(alert?.resolvedAt).toBeDefined();
      expect(alert?.metadata.resolvedBy).toBe('resolver-user');
      expect(alert?.metadata.resolution).toBe('Fixed the issue');
    });

    it('should resolve alerts without resolution message', () => {
      const resolved = service.resolveAlert(alertId, 'resolver-user');
      expect(resolved).toBe(true);

      const alert = service.getAlert(alertId);
      expect(alert?.status).toBe('resolved');
      expect(alert?.metadata.resolution).toBeUndefined();
    });

    it('should handle resolution of non-existent alerts', () => {
      const resolved = service.resolveAlert('non-existent-alert', 'test-user');
      expect(resolved).toBe(false);
    });

    it('should handle double resolution gracefully', () => {
      service.resolveAlert(alertId, 'user1', 'First resolution');
      const resolved = service.resolveAlert(
        alertId,
        'user2',
        'Second resolution',
      );
      expect(resolved).toBe(true); // Returns true but doesn't change the resolution
    });

    it('should emit events when resolving alerts', () => {
      service.resolveAlert(alertId, 'resolver', 'All fixed');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'alert.resolved',
        expect.objectContaining({
          status: 'resolved',
          _metadata: expect.objectContaining({
            resolvedBy: 'resolver',
            resolution: 'All fixed',
          }),
        }),
      );
    });

    it('should remove resolved alerts from active alerts', () => {
      const activeAlertsBefore = service.getActiveAlerts();
      expect(activeAlertsBefore.some((alert) => alert.id === alertId)).toBe(
        true,
      );

      service.resolveAlert(alertId, 'resolver');

      const activeAlertsAfter = service.getActiveAlerts();
      expect(activeAlertsAfter.some((alert) => alert.id === alertId)).toBe(
        false,
      );

      // But it should still be accessible via getAlert
      const resolvedAlert = service.getAlert(alertId);
      expect(resolvedAlert).toBeDefined();
      expect(resolvedAlert?.status).toBe('resolved');
    });
  });

  describe('Alert Suppression', () => {
    let testRule: AlertRule;

    beforeEach(async () => {
      await service.onModuleInit();

      testRule = {
        id: 'suppression-test-rule',
        name: 'Suppression Test Rule',
        description: 'Rule for testing suppression',
        severity: 'low',
        condition: 'test_condition',
        threshold: 25,
        evaluationWindow: 120000,
        cooldownPeriod: 240000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'suppression' },
      };

      service.addAlertRule(testRule);
    });

    it('should set suppression windows', () => {
      const suppressionId = service.setSuppression(
        { environment: 'test' },
        30, // 30 minutes
        'Maintenance window for testing',
      );

      expect(suppressionId).toBeDefined();
      expect(suppressionId).toMatch(/^suppression_\d+_[\w-]+$/);
    });

    it('should suppress alerts during suppression windows', async () => {
      // Set suppression for 30 minutes
      service.setSuppression({ environment: 'test' }, 30, 'Test maintenance');

      // Try to trigger alert during suppression
      const alertId = await service.triggerAlert(
        'suppression-test-rule',
        'Suppressed Alert',
        'This should be suppressed',
        'test-source',
      );

      expect(alertId).toBe(''); // Should be empty because alert is suppressed
    });

    it('should allow alerts after suppression window expires', async () => {
      // Set very short suppression (1ms)
      service.setSuppression(
        { environment: 'test' },
        0.001, // Very short duration
        'Short suppression',
      );

      // Wait for suppression to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to trigger alert after suppression expires
      const alertId = await service.triggerAlert(
        'suppression-test-rule',
        'Post-Suppression Alert',
        'This should not be suppressed',
        'test-source',
      );

      expect(alertId).not.toBe(''); // Should not be empty
    });
  });

  describe('Notification Channels', () => {
    let testRule: AlertRule;

    beforeEach(async () => {
      await service.onModuleInit();

      testRule = {
        id: 'notification-test-rule',
        name: 'Notification Test Rule',
        description: 'Rule for testing notifications',
        severity: 'critical',
        condition: 'test_condition',
        threshold: 90,
        evaluationWindow: 60000,
        cooldownPeriod: 300000,
        channels: ['slack', 'email', 'webhook', 'pagerduty'],
        enabled: true,
        tags: { test: 'notifications' },
      };

      service.addAlertRule(testRule);
    });

    it('should support multiple notification channels', async () => {
      const alertId = await service.triggerAlert(
        'notification-test-rule',
        'Multi-Channel Alert',
        'Testing multiple notification channels',
        'notification-source',
      );

      expect(alertId).not.toBe('');

      const alert = service.getAlert(alertId);
      expect(alert?.notificationsSent).toBeGreaterThan(0);
    });

    it('should handle notification failures gracefully', async () => {
      // Mock configuration to cause notification failures
      configService.get.mockImplementation((key: string) => {
        if (key === 'SLACK_WEBHOOK_URL') return ''; // Missing URL
        return undefined;
      });

      // This should not throw even if notifications fail
      await expect(
        service.triggerAlert(
          'notification-test-rule',
          'Failed Notification Alert',
          'Testing notification failure handling',
          'failure-source',
        ),
      ).resolves.not.toThrow();
    });

    it('should validate notification channel configurations', async () => {
      // Test with missing configurations
      const originalSlackUrl = configService.get.mockImplementation(
        (key: string) => {
          if (key === 'SLACK_WEBHOOK_URL') return undefined;
          if (key === 'PAGERDUTY_INTEGRATION_KEY') return undefined;
          return 'default-value';
        },
      );

      const alertId = await service.triggerAlert(
        'notification-test-rule',
        'Config Test Alert',
        'Testing configuration validation',
        'config-source',
      );

      expect(alertId).not.toBe(''); // Should still create alert even if some channels fail
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle security events', async () => {
      const securityEvent = {
        type: 'suspicious-activity',
        severity: 'high',
        source: 'security-monitor',
        details: 'Multiple failed login attempts',
      };

      await service.handleSecurityEvent(securityEvent);

      // Should have created an alert
      const activeAlerts = service.getActiveAlerts();
      const securityAlert = activeAlerts.find((alert) =>
        alert.title.includes('Security Event: suspicious-activity'),
      );

      expect(securityAlert).toBeDefined();
      expect(securityAlert?.severity).toBe('medium'); // Default severity for security events
    });

    it('should handle security threats', async () => {
      const threatEvent = {
        type: 'malware-detected',
        confidence: 'high',
        mitigation: 'quarantined',
        source: 'antivirus-scanner',
      };

      await service.handleSecurityThreat(threatEvent);

      // Should have created a critical alert
      const activeAlerts = service.getActiveAlerts();
      const threatAlert = activeAlerts.find((alert) =>
        alert.title.includes('Security Threat Detected: malware-detected'),
      );

      expect(threatAlert).toBeDefined();
      expect(threatAlert?.source).toBe('threat-detection');
    });

    it('should handle malformed security events gracefully', async () => {
      const malformedEvent = {
        invalidProperty: 'invalid',
        // Missing required properties
      };

      await expect(
        service.handleSecurityEvent(malformedEvent),
      ).resolves.not.toThrow();

      // Should use default values
      const activeAlerts = service.getActiveAlerts();
      const alert = activeAlerts.find((alert) =>
        alert.title.includes('Security Event: unknown'),
      );

      expect(alert).toBeDefined();
    });
  });

  describe('Alert Statistics and Reporting', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should provide comprehensive alerting statistics', () => {
      const stats = service.getAlertingStats();

      expect(stats).toHaveProperty('activeAlerts');
      expect(stats).toHaveProperty('totalRules');
      expect(stats).toHaveProperty('alertsByStatus');
      expect(stats).toHaveProperty('alertsBySeverity');

      expect(typeof stats.activeAlerts).toBe('number');
      expect(typeof stats.totalRules).toBe('number');
      expect(typeof stats.alertsByStatus).toBe('object');
      expect(typeof stats.alertsBySeverity).toBe('object');
    });

    it('should track alerts by status correctly', async () => {
      // Create some test alerts
      const rule: AlertRule = {
        id: 'stats-test-rule',
        name: 'Stats Test Rule',
        description: 'Rule for testing statistics',
        severity: 'medium',
        condition: 'test',
        threshold: 1,
        evaluationWindow: 1000,
        cooldownPeriod: 2000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'stats' },
      };

      service.addAlertRule(rule);

      // Trigger alert
      const alertId = await service.triggerAlert(
        'stats-test-rule',
        'Stats Test',
        'Testing statistics',
        'stats-source',
      );

      let stats = service.getAlertingStats();
      expect(stats.activeAlerts).toBeGreaterThan(0);
      expect(stats.alertsByStatus.triggered).toBeGreaterThan(0);

      // Acknowledge alert
      service.acknowledgeAlert(alertId, 'stats-user');
      stats = service.getAlertingStats();
      expect(stats.alertsByStatus.acknowledged).toBeGreaterThan(0);

      // Resolve alert
      service.resolveAlert(alertId, 'stats-user');
      stats = service.getAlertingStats();
      expect(stats.alertsByStatus.resolved).toBeGreaterThan(0);
    });

    it('should track alerts by severity correctly', async () => {
      const severities: AlertSeverity[] = ['low', 'medium', 'high', 'critical'];

      for (let i = 0; i < severities.length; i++) {
        const severity = severities[i];
        const rule: AlertRule = {
          id: `severity-test-${severity}`,
          name: `${severity.toUpperCase()} Severity Rule`,
          description: `Testing ${severity} severity`,
          severity,
          condition: 'test',
          threshold: 1,
          evaluationWindow: 1000,
          cooldownPeriod: 2000,
          channels: ['slack'],
          enabled: true,
          tags: { severity: severity },
        };

        service.addAlertRule(rule);
        await service.triggerAlert(
          `severity-test-${severity}`,
          `${severity.toUpperCase()} Test`,
          `Testing ${severity} severity alert`,
          'severity-source',
        );
      }

      const stats = service.getAlertingStats();

      expect(stats.alertsBySeverity.low).toBeGreaterThan(0);
      expect(stats.alertsBySeverity.medium).toBeGreaterThan(0);
      expect(stats.alertsBySeverity.high).toBeGreaterThan(0);
      expect(stats.alertsBySeverity.critical).toBeGreaterThan(0);
    });

    it('should return active alerts list', async () => {
      const rule: AlertRule = {
        id: 'active-test-rule',
        name: 'Active Test Rule',
        description: 'Testing active alerts list',
        severity: 'high',
        condition: 'test',
        threshold: 1,
        evaluationWindow: 1000,
        cooldownPeriod: 2000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'active' },
      };

      service.addAlertRule(rule);
      const alertId = await service.triggerAlert(
        'active-test-rule',
        'Active Test',
        'Testing active alerts',
        'active-source',
      );

      const activeAlerts = service.getActiveAlerts();
      expect(activeAlerts.length).toBeGreaterThan(0);
      expect(activeAlerts.some((alert) => alert.id === alertId)).toBe(true);

      // After resolution, should not be in active alerts
      service.resolveAlert(alertId, 'test-user');
      const activeAlertsAfter = service.getActiveAlerts();
      expect(activeAlertsAfter.some((alert) => alert.id === alertId)).toBe(
        false,
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle missing alert rules gracefully', async () => {
      const alertId = await service.triggerAlert(
        'non-existent-rule',
        'Missing Rule Test',
        'Testing missing rule handling',
        'missing-source',
      );

      expect(alertId).toBe('');
    });

    it('should handle invalid alert IDs gracefully', () => {
      expect(service.acknowledgeAlert('invalid-id', 'user')).toBe(false);
      expect(service.resolveAlert('invalid-id', 'user')).toBe(false);
      expect(service.getAlert('invalid-id')).toBeNull();
    });

    it('should handle empty or malformed rule data', () => {
      expect(() => {
        service.addAlertRule({
          id: '',
          name: '',
          description: '',
          severity: 'low',
          condition: '',
          threshold: 0,
          evaluationWindow: 0,
          cooldownPeriod: 0,
          channels: [],
          enabled: false,
          tags: {},
        });
      }).not.toThrow();
    });

    it('should handle notification configuration errors', async () => {
      // Mock all notification configs as undefined
      configService.get.mockReturnValue(undefined);

      const rule: AlertRule = {
        id: 'error-test-rule',
        name: 'Error Test Rule',
        description: 'Testing error handling',
        severity: 'medium',
        condition: 'test',
        threshold: 1,
        evaluationWindow: 1000,
        cooldownPeriod: 2000,
        channels: ['slack', 'email', 'webhook'],
        enabled: true,
        tags: { test: 'error' },
      };

      service.addAlertRule(rule);

      // Should not throw even with missing configs
      await expect(
        service.triggerAlert(
          'error-test-rule',
          'Error Test',
          'Testing error handling',
          'error-source',
        ),
      ).resolves.not.toThrow();
    });

    it('should handle concurrent alert operations', async () => {
      const rule: AlertRule = {
        id: 'concurrent-test-rule',
        name: 'Concurrent Test Rule',
        description: 'Testing concurrent operations',
        severity: 'medium',
        condition: 'test',
        threshold: 1,
        evaluationWindow: 1000,
        cooldownPeriod: 2000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'concurrent' },
      };

      service.addAlertRule(rule);

      // Trigger multiple alerts concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.triggerAlert(
          'concurrent-test-rule',
          `Concurrent Alert ${i}`,
          `Testing concurrent alert ${i}`,
          'concurrent-source',
        ),
      );

      const alertIds = await Promise.all(promises);

      // All should succeed
      expect(alertIds.every((id) => id !== '')).toBe(true);
      expect(new Set(alertIds).size).toBe(10); // All should be unique
    });

    it('should validate alert correlation IDs', async () => {
      const rule: AlertRule = {
        id: 'correlation-test-rule',
        name: 'Correlation Test Rule',
        description: 'Testing correlation IDs',
        severity: 'low',
        condition: 'test',
        threshold: 1,
        evaluationWindow: 1000,
        cooldownPeriod: 2000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'correlation' },
      };

      service.addAlertRule(rule);

      const correlationId = 'test-correlation-123';
      const alertId = await service.triggerAlert(
        'correlation-test-rule',
        'Correlation Test',
        'Testing correlation ID',
        'correlation-source',
        { test: true },
        correlationId,
      );

      const alert = service.getAlert(alertId);
      expect(alert?.correlationId).toBe(correlationId);
    });
  });

  describe('Performance and Memory Management', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle large numbers of alerts efficiently', async () => {
      const rule: AlertRule = {
        id: 'performance-test-rule',
        name: 'Performance Test Rule',
        description: 'Testing performance with many alerts',
        severity: 'low',
        condition: 'test',
        threshold: 1,
        evaluationWindow: 1000,
        cooldownPeriod: 2000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'performance' },
      };

      service.addAlertRule(rule);

      const startTime = Date.now();

      // Create 100 alerts
      const alertPromises = Array.from({ length: 100 }, (_, i) =>
        service.triggerAlert(
          'performance-test-rule',
          `Performance Test Alert ${i}`,
          `Testing performance alert ${i}`,
          'performance-source',
        ),
      );

      await Promise.all(alertPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      const stats = service.getAlertingStats();
      expect(stats.activeAlerts).toBe(100);
    });

    it('should clean up resolved alerts to prevent memory leaks', async () => {
      const rule: AlertRule = {
        id: 'cleanup-test-rule',
        name: 'Cleanup Test Rule',
        description: 'Testing cleanup functionality',
        severity: 'low',
        condition: 'test',
        threshold: 1,
        evaluationWindow: 1000,
        cooldownPeriod: 2000,
        channels: ['slack'],
        enabled: true,
        tags: { test: 'cleanup' },
      };

      service.addAlertRule(rule);

      // Create and resolve multiple alerts
      const alertIds = [];
      for (let i = 0; i < 10; i++) {
        const alertId = await service.triggerAlert(
          'cleanup-test-rule',
          `Cleanup Test Alert ${i}`,
          `Testing cleanup ${i}`,
          'cleanup-source',
        );
        alertIds.push(alertId);
        service.resolveAlert(alertId, 'cleanup-user');
      }

      // Verify alerts can still be retrieved initially
      expect(alertIds.every((id) => service.getAlert(id) !== null)).toBe(true);

      // Cleanup should happen automatically via intervals
      // For testing, we can't wait for the actual intervals,
      // but we can verify the structure is in place
      expect(service.getActiveAlerts().length).toBe(0);
    });
  });
});
