/**
 * Security Monitoring Service Test Suite - Comprehensive Threat Detection Testing
 *
 * Tests security event processing, threat detection, automated responses, and monitoring capabilities
 * Validates real-time security monitoring, ML-based anomaly detection, and incident response
 *
 * @author Claude Code
 * @version 1.0.0
 * @since Security Testing Phase
 */

import { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service';
import {
  SecurityMonitoringService,
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
} from '../security-monitoring.service';

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService;
  let configService: jest.Mocked<ConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let prismaService: jest.Mocked<PrismaService>;
  let module: TestingModule;

  const mockLogger = {
    log: jest.fn(),
    debug: jest.fn(),
    _error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  };

  const defaultConfig = {
    'security.monitoring.enabled': true,
    'security.monitoring.thresholds.authentication_failures': 5,
    'security.monitoring.thresholds.rate_limit_window': 60000,
    'security.monitoring.autoResponse.enabled': true,
    'security.monitoring.riskScoreThreshold': 75,
    'security.monitoring.anomalyDetection.enabled': true,
    'security.monitoring.threatIntelligence.enabled': true,
  };

  const mockSecurityEvent: SecurityEvent = {
    eventId: 'sec-event-123',
    type: SecurityEventType.AUTHENTICATION_FAILURE,
    severity: SecuritySeverity.MEDIUM,
    timestamp: new Date(),
    sourceIp: '192.168.1.100',
    userId: 'user-123',
    userAgent: 'Mozilla/5.0 (Test Browser)',
    requestUrl: '/api/auth/login',
    httpMethod: 'POST',
    description: 'Failed authentication attempt',
    _metadata: {
      attemptedUsername: 'admin',
      failureReason: 'invalid_password',
    },
    riskScore: 45,
    responseTriggered: false,
    responseActions: [],
    correlationId: 'corr-123',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        return defaultConfig[key] ?? defaultValue;
      }),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
    };

    const mockPrismaService = {
      securityEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        SecurityMonitoringService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .setLogger(mockLogger as any)
      .compile();

    configService = module.get<ConfigService>(
      ConfigService,
    ) as jest.Mocked<ConfigService>;
    eventEmitter = module.get<EventEmitter2>(
      EventEmitter2,
    ) as jest.Mocked<EventEmitter2>;
    prismaService = module.get<PrismaService>(
      PrismaService,
    ) as jest.Mocked<PrismaService>;
    service = module.get<SecurityMonitoringService>(SecurityMonitoringService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Service Initialization', () => {
    it('should be defined and properly initialized', () => {
      expect(service).toBeDefined();
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Security Monitoring Service initialized successfully',
      );
    });

    it('should load configuration from ConfigService', () => {
      expect(configService.get).toHaveBeenCalledWith(
        'security.monitoring.enabled',
        true,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'security.monitoring.autoResponse.enabled',
        true,
      );
      expect(configService.get).toHaveBeenCalledWith(
        'security.monitoring.riskScoreThreshold',
        75,
      );
    });

    it('should set up event listeners during initialization', () => {
      expect(eventEmitter.on).toHaveBeenCalled();
    });
  });

  describe('Security Event Processing', () => {
    beforeEach(() => {
      prismaService.securityEvent.create.mockResolvedValue({
        id: 'db-event-id',
        ...mockSecurityEvent,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    });

    it('should process and store security events', async () => {
      await service.processSecurityEvent(mockSecurityEvent);

      expect(prismaService.securityEvent.create).toHaveBeenCalledWith({
        _data: expect.objectContaining({
          eventId: mockSecurityEvent.eventId,
          type: mockSecurityEvent.type,
          severity: mockSecurityEvent.severity,
          sourceIp: mockSecurityEvent.sourceIp,
          userId: mockSecurityEvent.userId,
          riskScore: mockSecurityEvent.riskScore,
        }),
      });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Security event processed',
        expect.objectContaining({
          eventId: mockSecurityEvent.eventId,
          type: mockSecurityEvent.type,
          severity: mockSecurityEvent.severity,
        }),
      );
    });

    it('should emit security event for real-time processing', async () => {
      await service.processSecurityEvent(mockSecurityEvent);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.event.processed',
        mockSecurityEvent,
      );
    });

    it('should calculate and update risk scores', async () => {
      const highRiskEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.BRUTE_FORCE_ATTACK,
        severity: SecuritySeverity.HIGH,
        riskScore: 85,
      };

      await service.processSecurityEvent(highRiskEvent);

      expect(prismaService.securityEvent.create).toHaveBeenCalledWith({
        _data: expect.objectContaining({
          riskScore: 85,
        }),
      });
    });

    it('should handle database errors gracefully', async () => {
      prismaService.securityEvent.create.mockRejectedValueOnce(
        new Error('Database connection failed'),
      );

      await expect(
        service.processSecurityEvent(mockSecurityEvent),
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to process security event',
        expect.objectContaining({
          _error: 'Database connection failed',
        }),
      );
    });
  });

  describe('Threat Detection and Analysis', () => {
    it('should detect brute force attack patterns', async () => {
      const bruteForceEvents = Array.from({ length: 6 }, (_, i) => ({
        ...mockSecurityEvent,
        eventId: `brute-${i}`,
        type: SecurityEventType.AUTHENTICATION_FAILURE,
        timestamp: new Date(Date.now() - i * 1000),
      }));

      prismaService.securityEvent.count.mockResolvedValue(6);

      for (const event of bruteForceEvents) {
        await service.processSecurityEvent(event);
      }

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Potential brute force attack detected'),
      );
    });

    it('should detect rate limiting violations', async () => {
      const rateLimitEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: SecuritySeverity.HIGH,
        riskScore: 70,
        _metadata: {
          requestsPerMinute: 150,
          limit: 100,
        },
      };

      await service.processSecurityEvent(rateLimitEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit violation detected'),
      );
    });

    it('should detect injection attack attempts', async () => {
      const injectionEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.SQL_INJECTION_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        riskScore: 95,
        _metadata: {
          suspiciousPayload: "'; DROP TABLE users; --",
          detectionPattern: 'sql_injection',
        },
      };

      await service.processSecurityEvent(injectionEvent);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Critical security event detected'),
      );
    });

    it('should correlate related security events', async () => {
      const correlatedEvents = [
        {
          ...mockSecurityEvent,
          eventId: 'corr-1',
          correlationId: 'attack-sequence-123',
        },
        {
          ...mockSecurityEvent,
          eventId: 'corr-2',
          type: SecurityEventType.PRIVILEGE_ESCALATION,
          correlationId: 'attack-sequence-123',
        },
      ];

      for (const event of correlatedEvents) {
        await service.processSecurityEvent(event);
      }

      expect(prismaService.securityEvent.create).toHaveBeenCalledTimes(2);
      expect(prismaService.securityEvent.create).toHaveBeenCalledWith({
        _data: expect.objectContaining({
          correlationId: 'attack-sequence-123',
        }),
      });
    });
  });

  describe('Automated Threat Response', () => {
    it('should trigger automated response for high-risk events', async () => {
      const criticalEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.DATA_EXFILTRATION,
        severity: SecuritySeverity.CRITICAL,
        riskScore: 95,
      };

      await service.processSecurityEvent(criticalEvent);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.response.trigger',
        expect.objectContaining({
          eventId: criticalEvent.eventId,
          responseLevel: 'critical',
        }),
      );
    });

    it('should implement rate limiting for suspicious IPs', async () => {
      const suspiciousEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.SUSPICIOUS_REQUEST_PATTERN,
        severity: SecuritySeverity.HIGH,
        riskScore: 80,
        sourceIp: '10.0.0.100',
      };

      await service.processSecurityEvent(suspiciousEvent);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.response.rateLimit',
        expect.objectContaining({
          sourceIp: '10.0.0.100',
          duration: expect.any(Number),
        }),
      );
    });

    it('should quarantine compromised user accounts', async () => {
      const compromisedEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.PRIVILEGE_ESCALATION,
        severity: SecuritySeverity.CRITICAL,
        riskScore: 90,
        userId: 'compromised-user-123',
      };

      prismaService.user.update.mockResolvedValue({
        id: 'compromised-user-123',
        isActive: false,
      } as any);

      await service.processSecurityEvent(compromisedEvent);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'compromised-user-123' },
        _data: { isActive: false },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.response.quarantine',
        expect.objectContaining({
          userId: 'compromised-user-123',
        }),
      );
    });

    it('should escalate incidents based on severity', async () => {
      const escalationEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.SYSTEM_INTEGRITY_VIOLATION,
        severity: SecuritySeverity.CRITICAL,
        riskScore: 98,
      };

      await service.processSecurityEvent(escalationEvent);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.incident.escalate',
        expect.objectContaining({
          level: 'critical',
          requiresImmediate: true,
        }),
      );
    });
  });

  describe('Security Metrics and Analytics', () => {
    it('should collect security metrics', async () => {
      const metrics = await service.getSecurityMetrics();

      expect(metrics).toBeDefined();
      expect(metrics).toHaveProperty('totalEvents');
      expect(metrics).toHaveProperty('eventsByType');
      expect(metrics).toHaveProperty('eventsBySeverity');
      expect(metrics).toHaveProperty('averageRiskScore');
    });

    it('should generate security reports', async () => {
      prismaService.securityEvent.findMany.mockResolvedValue([
        mockSecurityEvent,
      ] as any);

      const report = await service.generateSecurityReport('24h');

      expect(report).toBeDefined();
      expect(report.timeframe).toBe('24h');
      expect(report.totalEvents).toBe(1);
      expect(report.events).toHaveLength(1);
    });

    it('should track threat trends over time', async () => {
      const trendData = [
        { date: new Date(), count: 10, avgRiskScore: 45 },
        {
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          count: 15,
          avgRiskScore: 52,
        },
      ];

      prismaService.securityEvent.groupBy.mockResolvedValue(trendData as any);

      const trends = await service.getThreatTrends('7d');

      expect(trends).toBeDefined();
      expect(trends).toHaveLength(2);
      expect(trends[0]).toHaveProperty('count');
      expect(trends[0]).toHaveProperty('avgRiskScore');
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect behavioral anomalies', async () => {
      const anomalousEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.ANOMALOUS_BEHAVIOR,
        severity: SecuritySeverity.MEDIUM,
        riskScore: 65,
        _metadata: {
          anomalyType: 'unusual_access_pattern',
          confidence: 0.85,
          baseline: { normal_requests_per_hour: 20 },
          observed: { requests_per_hour: 150 },
        },
      };

      await service.processSecurityEvent(anomalousEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Behavioral anomaly detected'),
      );
    });

    it('should adapt baselines based on user behavior', async () => {
      const behaviorData = {
        userId: 'user-123',
        normalPattern: { loginTimes: [9, 17], requestsPerHour: 25 },
        currentPattern: { loginTime: 23, requestsPerHour: 5 },
      };

      const anomalyScore = await service.calculateAnomalyScore(behaviorData);

      expect(anomalyScore).toBeGreaterThan(0);
      expect(anomalyScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Threat Intelligence Integration', () => {
    it('should enrich events with threat intelligence', async () => {
      const enrichedEvent = {
        ...mockSecurityEvent,
        sourceIp: '192.168.1.100',
        _metadata: {
          ...mockSecurityEvent.metadata,
          threatIntelligence: {
            reputation: 'suspicious',
            knownAttacker: false,
            geoLocation: 'Unknown',
          },
        },
      };

      await service.processSecurityEvent(enrichedEvent);

      expect(prismaService.securityEvent.create).toHaveBeenCalledWith({
        _data: expect.objectContaining({
          _metadata: expect.objectContaining({
            threatIntelligence: expect.any(Object),
          }),
        }),
      });
    });

    it('should check IPs against threat feeds', async () => {
      const maliciousIp = '192.0.2.100';
      const isThreat = await service.checkThreatIntelligence(maliciousIp);

      expect(isThreat).toBeDefined();
      expect(typeof isThreat.isKnownThreat).toBe('boolean');
      expect(typeof isThreat.riskLevel).toBe('string');
    });
  });

  describe('Compliance and Audit', () => {
    it('should maintain audit logs for compliance', async () => {
      const auditEvent = {
        ...mockSecurityEvent,
        type: SecurityEventType.CONFIGURATION_CHANGE,
        _metadata: {
          ...mockSecurityEvent.metadata,
          changeType: 'security_policy_update',
          oldValue: 'policy_v1',
          newValue: 'policy_v2',
          operator: 'admin-user',
        },
      };

      await service.processSecurityEvent(auditEvent);

      expect(prismaService.securityEvent.create).toHaveBeenCalledWith({
        _data: expect.objectContaining({
          type: SecurityEventType.CONFIGURATION_CHANGE,
          _metadata: expect.objectContaining({
            changeType: 'security_policy_update',
          }),
        }),
      });
    });

    it('should generate compliance reports', async () => {
      const complianceReport = await service.generateComplianceReport('SOC2');

      expect(complianceReport).toBeDefined();
      expect(complianceReport.standard).toBe('SOC2');
      expect(complianceReport).toHaveProperty('controlsAssessed');
      expect(complianceReport).toHaveProperty('complianceScore');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume event processing', async () => {
      const events = Array.from({ length: 1000 }, (_, i) => ({
        ...mockSecurityEvent,
        eventId: `bulk-event-${i}`,
      }));

      const startTime = Date.now();
      const promises = events.map((event) =>
        service.processSecurityEvent(event),
      );
      await Promise.all(promises);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should implement efficient event storage and retrieval', async () => {
      prismaService.securityEvent.findMany.mockResolvedValue([]);

      const startTime = Date.now();
      await service.getSecurityEvents({
        limit: 1000,
        offset: 0,
        severity: SecuritySeverity.HIGH,
      });
      const endTime = Date.now();

      const queryTime = endTime - startTime;
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle service unavailability gracefully', async () => {
      prismaService.securityEvent.create.mockRejectedValue(
        new Error('Service unavailable'),
      );

      // Should not throw, but log error
      await expect(
        service.processSecurityEvent(mockSecurityEvent),
      ).rejects.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process security event'),
      );
    });

    it('should implement circuit breaker for external services', async () => {
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        try {
          await service.checkThreatIntelligence('test-ip');
        } catch (error) {
          // Expected failures
        }
      }

      // Circuit should be open now
      const result = await service.checkThreatIntelligence('another-ip');
      expect(result.circuitOpen).toBe(true);
    });

    it('should validate event data integrity', async () => {
      const invalidEvent = {
        ...mockSecurityEvent,
        eventId: '', // Invalid empty eventId
        timestamp: 'invalid-date' as any, // Invalid timestamp
      };

      await expect(service.processSecurityEvent(invalidEvent)).rejects.toThrow(
        'Invalid security event data',
      );
    });
  });

  describe('Configuration and Customization', () => {
    it('should respect monitoring configuration settings', async () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'security.monitoring.enabled') return false;
          return defaultConfig[key] ?? defaultValue;
        },
      );

      // Create new service instance with monitoring disabled
      const disabledService = new SecurityMonitoringService(
        configService,
        eventEmitter,
        prismaService,
      );

      await disabledService.processSecurityEvent(mockSecurityEvent);

      // Should not process events when monitoring is disabled
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Security monitoring is disabled, skipping event processing',
      );
    });

    it('should support custom risk score thresholds', async () => {
      configService.get.mockImplementation(
        (key: string, defaultValue?: any) => {
          if (key === 'security.monitoring.riskScoreThreshold') return 50; // Lower threshold
          return defaultConfig[key] ?? defaultValue;
        },
      );

      const mediumRiskEvent = {
        ...mockSecurityEvent,
        riskScore: 60, // Above new threshold
      };

      await service.processSecurityEvent(mediumRiskEvent);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'security.response.trigger',
        expect.objectContaining({
          responseLevel: 'high',
        }),
      );
    });
  });
});
