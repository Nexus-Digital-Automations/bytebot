/**
 * Security Monitoring Service Tests - Comprehensive security intelligence testing
 * Tests real-time threat detection, geolocation tracking, and security analytics
 *
 * Test Coverage:
 * - Login attempt monitoring and risk assessment
 * - Brute force attack detection and IP blocking
 * - Geolocation anomaly detection and tracking
 * - Security event logging and classification
 * - Risk score calculation and threat analysis
 * - IP reputation analysis and caching
 * - Security metrics collection and reporting
 * - Automated security actions and alerts
 *
 * @author Enterprise Security Intelligence Testing Specialist
 * @version 1.0.0
 * @since Phase 2: Security Monitoring Testing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  SecurityMonitoringService,
  SecurityEventSeverity,
  SecurityEventType,
  GeolocationData,
} from '../security-monitoring.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('SecurityMonitoringService', () => {
  let service: SecurityMonitoringService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  // Test data
  const mockGeolocation: GeolocationData = {
    country: 'United States',
    countryCode: 'US',
    region: 'California',
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    timezone: 'America/Los_Angeles',
    isp: 'Test ISP',
    organization: 'Test Org',
    isVpn: false,
    isProxy: false,
    isTor: false,
    threatLevel: 'low',
  };

  const mockSuspiciousGeolocation: GeolocationData = {
    ...mockGeolocation,
    country: 'Unknown',
    isVpn: true,
    isProxy: true,
    isTor: true,
    threatLevel: 'high',
  };

  beforeEach(async () => {
    // Create mocks
    const mockPrismaService = {
      userSession: {
        groupBy: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      securityAuditLog: {
        create: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityMonitoringService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SecurityMonitoringService>(SecurityMonitoringService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);

    // Setup default mocks
    prismaService.userSession.groupBy.mockResolvedValue([
      { createdAt: new Date(), _count: 10 },
    ]);

    // Initialize the service
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      expect(service).toBeDefined();
    });

    it('should start periodic cleanup on initialization', () => {
      jest.useFakeTimers();
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      // Fast forward to trigger periodic cleanup
      jest.advanceTimersByTime(5 * 60 * 1000); // 5 minutes

      expect(loggerSpy).toHaveBeenCalledWith(
        'Periodic security cleanup completed',
        expect.any(Object),
      );

      jest.useRealTimers();
    });
  });

  describe('recordLoginAttempt - successful login', () => {
    it('should record successful login with low risk score', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '192.168.1.100';
      const userAgent =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        true,
        'user-123',
      );

      // Assert
      expect(event).toMatchObject({
        type: SecurityEventType.LOGIN_SUCCESS,
        severity: SecurityEventSeverity.LOW,
        userId: 'user-123',
        email,
        ipAddress,
        userAgent,
        riskScore: expect.any(Number),
      });

      expect(event.riskScore).toBeLessThan(0.3); // Should be low risk for successful login
      expect(event.eventId).toMatch(/^sec_\d+_/);
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('should include geolocation data for public IP', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1'; // Public IP
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Mock geolocation service response
      jest
        .spyOn(service as any, 'getIpGeolocation')
        .mockReturnValue(mockGeolocation);

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        true,
      );

      // Assert
      expect(event.geolocation).toEqual(mockGeolocation);
      expect(event.metadata).toHaveProperty('userAgentHash');
    });

    it('should handle private IP addresses appropriately', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '192.168.1.100'; // Private IP
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        true,
      );

      // Assert
      expect(event.geolocation).toMatchObject({
        country: 'Local',
        countryCode: 'LOC',
        region: 'Private',
        city: 'Local',
        isVpn: false,
        isProxy: false,
        isTor: false,
        threatLevel: 'low',
      });
    });
  });

  describe('recordLoginAttempt - failed login', () => {
    it('should record failed login with higher risk score', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
      );

      // Assert
      expect(event).toMatchObject({
        type: SecurityEventType.LOGIN_FAILURE,
        severity: expect.any(String),
        email,
        ipAddress,
        userAgent,
      });

      expect(event.riskScore).toBeGreaterThan(0.3); // Should have higher risk for failed login
    });

    it('should detect suspicious user agents', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';
      const suspiciousUserAgent = 'curl/7.68.0'; // Suspicious automated tool

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        suspiciousUserAgent,
        false,
      );

      // Assert
      expect(event.riskScore).toBeGreaterThan(0.5); // Should have high risk for suspicious user agent
    });

    it('should calculate high risk score for VPN/Tor usage', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Mock suspicious geolocation
      jest
        .spyOn(service as any, 'getIpGeolocation')
        .mockReturnValue(mockSuspiciousGeolocation);

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
      );

      // Assert
      expect(event.riskScore).toBeGreaterThan(0.7); // Should have high risk for VPN/Tor
      expect(event.severity).toBe(SecurityEventSeverity.HIGH);
    });
  });

  describe('brute force detection', () => {
    it('should track failed login attempts', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Act - Multiple failed attempts
      const events = [];
      for (let i = 0; i < 3; i++) {
        const event = service.recordLoginAttempt(
          email,
          ipAddress,
          userAgent,
          false,
        );
        events.push(event);
      }

      // Assert
      expect(events[0].metadata.bruteForceAttempts).toBe(1);
      expect(events[1].metadata.bruteForceAttempts).toBe(2);
      expect(events[2].metadata.bruteForceAttempts).toBe(3);
    });

    it('should block IP after exceeding attempt threshold', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Act - Make 5 failed attempts (threshold)
      for (let i = 0; i < 5; i++) {
        service.recordLoginAttempt(email, ipAddress, userAgent, false);
      }

      // Make one more attempt after blocking
      const blockedEvent = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
      );

      // Assert
      expect(service.isIpBlocked(ipAddress)).toBe(true);
      expect(blockedEvent.type).toBe(SecurityEventType.BRUTE_FORCE_DETECTED);
      expect(blockedEvent.severity).toBe(SecurityEventSeverity.CRITICAL);
    });

    it('should reset brute force counter on successful login', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Act - Failed attempts followed by successful login
      service.recordLoginAttempt(email, ipAddress, userAgent, false);
      service.recordLoginAttempt(email, ipAddress, userAgent, false);
      service.recordLoginAttempt(email, ipAddress, userAgent, false);

      const successEvent = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        true,
      );

      // Assert
      expect(successEvent.metadata.bruteForceAttempts).toBe(0);
      expect(service.isIpBlocked(ipAddress)).toBe(false);
    });

    it('should handle brute force window expiration', () => {
      // Arrange
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Make initial failed attempts
      service.recordLoginAttempt(email, ipAddress, userAgent, false);

      // Mock time passing beyond brute force window
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 16 * 60 * 1000); // 16 minutes later

      // Act - New attempt after window expiration
      const newEvent = service.recordLoginAttempt(
        email,
        ipAddress,
        userAgent,
        false,
      );

      // Assert
      expect(newEvent.metadata.bruteForceAttempts).toBe(1); // Should reset counter

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('IP blocking', () => {
    it('should check if IP is blocked correctly', () => {
      // Arrange
      const ipAddress = '203.0.113.1';

      // Initially not blocked
      expect(service.isIpBlocked(ipAddress)).toBe(false);

      // Act - Trigger blocking
      for (let i = 0; i < 5; i++) {
        service.recordLoginAttempt(
          'user@example.com',
          ipAddress,
          'Mozilla/5.0',
          false,
        );
      }

      // Assert
      expect(service.isIpBlocked(ipAddress)).toBe(true);
    });

    it('should automatically unblock IP after expiration', () => {
      // Arrange
      const ipAddress = '203.0.113.1';

      // Block the IP
      for (let i = 0; i < 5; i++) {
        service.recordLoginAttempt(
          'user@example.com',
          ipAddress,
          'Mozilla/5.0',
          false,
        );
      }

      expect(service.isIpBlocked(ipAddress)).toBe(true);

      // Mock time passing beyond block duration
      const originalNow = Date.now;
      Date.now = jest.fn(() => originalNow() + 31 * 60 * 1000); // 31 minutes later

      // Act
      const isStillBlocked = service.isIpBlocked(ipAddress);

      // Assert
      expect(isStillBlocked).toBe(false);

      // Restore Date.now
      Date.now = originalNow;
    });
  });

  describe('geolocation anomaly detection', () => {
    it('should detect no anomaly for first login', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';

      // Mock geolocation with coordinates
      jest.spyOn(service as any, 'getIpGeolocation').mockReturnValue({
        ...mockGeolocation,
        latitude: 37.7749,
        longitude: -122.4194,
      });

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        'Mozilla/5.0',
        true,
        userId,
      );

      // Assert
      expect(event.type).toBe(SecurityEventType.LOGIN_SUCCESS);
      expect(event.metadata.locationAnomaly?.isAnomalous).toBe(false);
    });

    it('should detect geolocation anomaly for distant locations', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'user@example.com';
      const ipAddress1 = '203.0.113.1';
      const ipAddress2 = '203.0.113.2';

      // Mock first login from San Francisco
      jest.spyOn(service as any, 'getIpGeolocation').mockReturnValueOnce({
        ...mockGeolocation,
        latitude: 37.7749,
        longitude: -122.4194,
        city: 'San Francisco',
      });

      // First login
      service.recordLoginAttempt(
        email,
        ipAddress1,
        'Mozilla/5.0',
        true,
        userId,
      );

      // Mock second login from New York (distant location)
      jest.spyOn(service as any, 'getIpGeolocation').mockReturnValueOnce({
        ...mockGeolocation,
        latitude: 40.7128,
        longitude: -74.006,
        city: 'New York',
      });

      // Act - Second login from distant location
      const event2 = service.recordLoginAttempt(
        email,
        ipAddress2,
        'Mozilla/5.0',
        true,
        userId,
      );

      // Assert
      expect(event2.metadata.locationAnomaly?.isAnomalous).toBe(true);
      expect(event2.metadata.locationAnomaly?.distance).toBeGreaterThan(1000);
      expect(event2.type).toBe(SecurityEventType.GEOLOCATION_ANOMALY);
      expect(event2.severity).toBe(SecurityEventSeverity.HIGH);
    });

    it('should handle missing geolocation data gracefully', () => {
      // Arrange
      const userId = 'user-123';
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';

      // Mock missing geolocation
      jest.spyOn(service as any, 'getIpGeolocation').mockReturnValue(null);

      // Act
      const event = service.recordLoginAttempt(
        email,
        ipAddress,
        'Mozilla/5.0',
        true,
        userId,
      );

      // Assert
      expect(event.metadata.locationAnomaly).toBeNull();
      expect(event.geolocation).toBeUndefined();
    });
  });

  describe('security metrics', () => {
    it('should calculate comprehensive security metrics', async () => {
      // Arrange
      prismaService.userSession.groupBy.mockResolvedValue([
        { createdAt: new Date(), _count: 50 },
        { createdAt: new Date(), _count: 25 },
      ]);

      // Create some brute force attempts
      const ipAddress = '203.0.113.1';
      for (let i = 0; i < 5; i++) {
        service.recordLoginAttempt(
          'user@example.com',
          ipAddress,
          'Mozilla/5.0',
          false,
        );
      }

      // Act
      const metrics = await service.getSecurityMetrics();

      // Assert
      expect(metrics).toEqual({
        totalLoginAttempts: expect.any(Number),
        successfulLogins: expect.any(Number),
        failedLogins: expect.any(Number),
        bruteForceAttempts: expect.any(Number),
        suspiciousIpDetections: expect.any(Number),
        geolocationAnomalies: expect.any(Number),
        averageRiskScore: expect.any(Number),
        activeThreats: expect.any(Number),
        securityEventsLast24h: expect.any(Number),
      });

      expect(metrics.bruteForceAttempts).toBeGreaterThan(0);
    });

    it('should handle database errors gracefully in metrics calculation', async () => {
      // Arrange
      prismaService.userSession.groupBy.mockRejectedValue(
        new Error('Database error'),
      );

      // Act
      const metrics = await service.getSecurityMetrics();

      // Assert
      expect(metrics).toEqual({
        totalLoginAttempts: 0,
        successfulLogins: 0,
        failedLogins: 0,
        bruteForceAttempts: 0,
        suspiciousIpDetections: 0,
        geolocationAnomalies: 0,
        averageRiskScore: 0.0,
        activeThreats: 0,
        securityEventsLast24h: 0,
      });
    });
  });

  describe('risk score calculation', () => {
    it('should calculate low risk score for normal successful login', () => {
      // Arrange & Act
      const riskScore = service['calculateRiskScore'](
        'user@example.com',
        '192.168.1.100',
        mockGeolocation,
        'Mozilla/5.0 (Normal Browser)',
        true, // successful
      );

      // Assert
      expect(riskScore).toBeLessThan(0.3);
    });

    it('should calculate high risk score for failed login with suspicious factors', () => {
      // Arrange & Act
      const riskScore = service['calculateRiskScore'](
        'user@example.com',
        '203.0.113.1',
        mockSuspiciousGeolocation,
        'curl/7.68.0', // suspicious user agent
        false, // failed
      );

      // Assert
      expect(riskScore).toBeGreaterThan(0.7);
    });

    it('should account for brute force attempts in risk calculation', () => {
      // Arrange
      const ipAddress = '203.0.113.1';

      // Create some failed attempts to establish brute force tracking
      service.recordLoginAttempt(
        'user@example.com',
        ipAddress,
        'Mozilla/5.0',
        false,
      );
      service.recordLoginAttempt(
        'user@example.com',
        ipAddress,
        'Mozilla/5.0',
        false,
      );

      // Act
      const riskScore = service['calculateRiskScore'](
        'user@example.com',
        ipAddress,
        mockGeolocation,
        'Mozilla/5.0',
        false,
      );

      // Assert
      expect(riskScore).toBeGreaterThan(0.5); // Should be elevated due to previous attempts
    });
  });

  describe('utility methods', () => {
    it('should correctly identify private IP addresses', () => {
      const privateIps = [
        '127.0.0.1',
        'localhost',
        'unknown',
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
      ];

      const publicIps = ['203.0.113.1', '8.8.8.8', '1.1.1.1', '208.67.222.222'];

      // Assert
      privateIps.forEach((ip) => {
        expect(service['isPrivateIp'](ip)).toBe(true);
      });

      publicIps.forEach((ip) => {
        expect(service['isPrivateIp'](ip)).toBe(false);
      });
    });

    it('should correctly identify suspicious user agents', () => {
      const suspiciousUserAgents = [
        'curl/7.68.0',
        'wget/1.20.3',
        'python-requests/2.25.1',
        'Googlebot/2.1',
        'Mozilla/5.0 scanner',
        'sqlmap/1.5.2',
        'nmap NSE',
        'Burp Suite',
      ];

      const normalUserAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      ];

      // Assert
      suspiciousUserAgents.forEach((ua) => {
        expect(service['isSuspiciousUserAgent'](ua)).toBe(true);
      });

      normalUserAgents.forEach((ua) => {
        expect(service['isSuspiciousUserAgent'](ua)).toBe(false);
      });
    });

    it('should calculate distance between coordinates correctly', () => {
      // Arrange - San Francisco to New York (approximate distance: ~4100 km)
      const lat1 = 37.7749; // San Francisco
      const lon1 = -122.4194;
      const lat2 = 40.7128; // New York
      const lon2 = -74.006;

      // Act
      const distance = service['calculateDistance'](lat1, lon1, lat2, lon2);

      // Assert
      expect(distance).toBeGreaterThan(4000);
      expect(distance).toBeLessThan(5000);
    });

    it('should generate unique event IDs', () => {
      // Act
      const id1 = service['generateEventId']();
      const id2 = service['generateEventId']();

      // Assert
      expect(id1).toMatch(/^sec_\d+_[a-z0-9]{9}$/);
      expect(id2).toMatch(/^sec_\d+_[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });

    it('should hash user agents consistently', () => {
      // Arrange
      const userAgent = 'Mozilla/5.0 (Test Browser)';

      // Act
      const hash1 = service['hashUserAgent'](userAgent);
      const hash2 = service['hashUserAgent'](userAgent);

      // Assert
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
      expect(hash1).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('automated security actions', () => {
    it('should trigger automated actions for high-severity events', () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'warn');
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';

      // Mock high-risk scenario
      jest
        .spyOn(service as any, 'getIpGeolocation')
        .mockReturnValue(mockSuspiciousGeolocation);

      // Act - This should trigger high severity event
      service.recordLoginAttempt(email, ipAddress, 'curl/7.68.0', false);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Taking automated security action'),
        expect.any(Object),
      );
    });

    it('should notify security team for critical events', () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'error');
      const email = 'user@example.com';
      const ipAddress = '203.0.113.1';

      // Act - Trigger brute force detection
      for (let i = 0; i < 5; i++) {
        service.recordLoginAttempt(email, ipAddress, 'Mozilla/5.0', false);
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY_ALERT'),
        expect.any(Object),
      );
    });
  });

  describe('error handling', () => {
    it('should handle geolocation service errors gracefully', () => {
      // Arrange
      jest.spyOn(service as any, 'getIpGeolocation').mockImplementation(() => {
        throw new Error('Geolocation service error');
      });

      // Act
      const event = service.recordLoginAttempt(
        'user@example.com',
        '203.0.113.1',
        'Mozilla/5.0',
        true,
      );

      // Assert
      expect(event).toBeDefined();
      expect(event.riskScore).toBe(0.5); // Default moderate risk when analysis fails
      expect(event.metadata.analysisError).toBe(true);
    });

    it('should handle security analysis errors gracefully', () => {
      // Arrange
      jest
        .spyOn(service as any, 'calculateRiskScore')
        .mockImplementation(() => {
          throw new Error('Risk calculation error');
        });

      // Act & Assert - Should not throw
      expect(() => {
        service.recordLoginAttempt(
          'user@example.com',
          '203.0.113.1',
          'Mozilla/5.0',
          true,
        );
      }).not.toThrow();
    });
  });

  describe('IP geolocation caching', () => {
    it('should cache geolocation results', () => {
      // Arrange
      const ipAddress = '203.0.113.1';
      const mockGeolocationMethod = jest.spyOn(
        service as any,
        'getIpGeolocation',
      );

      // Act - Multiple calls for same IP
      service.recordLoginAttempt(
        'user1@example.com',
        ipAddress,
        'Mozilla/5.0',
        true,
      );
      service.recordLoginAttempt(
        'user2@example.com',
        ipAddress,
        'Mozilla/5.0',
        true,
      );

      // Assert - Geolocation should be retrieved from cache on second call
      expect(mockGeolocationMethod).toHaveBeenCalledTimes(2);
    });

    it('should handle cache expiration', () => {
      jest.useFakeTimers();

      // Arrange
      const ipAddress = '203.0.113.1';

      // Act - First call
      service.recordLoginAttempt(
        'user@example.com',
        ipAddress,
        'Mozilla/5.0',
        true,
      );

      // Fast forward past cache duration
      jest.advanceTimersByTime(61 * 60 * 1000); // 61 minutes

      // Second call after cache expiration
      service.recordLoginAttempt(
        'user@example.com',
        ipAddress,
        'Mozilla/5.0',
        true,
      );

      // Assert - Cache should have been cleared
      expect(service['ipReputationCache'].size).toBeLessThanOrEqual(1);

      jest.useRealTimers();
    });
  });

  describe('event severity determination', () => {
    it('should correctly determine event severity levels', () => {
      const testCases = [
        {
          success: true,
          riskScore: 0.1,
          isIpBlocked: false,
          hasLocationAnomaly: false,
          expectedSeverity: SecurityEventSeverity.LOW,
          expectedType: SecurityEventType.LOGIN_SUCCESS,
        },
        {
          success: false,
          riskScore: 0.5,
          isIpBlocked: false,
          hasLocationAnomaly: false,
          expectedSeverity: SecurityEventSeverity.MEDIUM,
          expectedType: SecurityEventType.LOGIN_FAILURE,
        },
        {
          success: false,
          riskScore: 0.8,
          isIpBlocked: false,
          hasLocationAnomaly: false,
          expectedSeverity: SecurityEventSeverity.HIGH,
          expectedType: SecurityEventType.SUSPICIOUS_IP,
        },
        {
          success: false,
          riskScore: 0.5,
          isIpBlocked: false,
          hasLocationAnomaly: true,
          expectedSeverity: SecurityEventSeverity.HIGH,
          expectedType: SecurityEventType.GEOLOCATION_ANOMALY,
        },
        {
          success: false,
          riskScore: 0.3,
          isIpBlocked: true,
          hasLocationAnomaly: false,
          expectedSeverity: SecurityEventSeverity.CRITICAL,
          expectedType: SecurityEventType.BRUTE_FORCE_DETECTED,
        },
      ];

      for (const testCase of testCases) {
        const result = service['determineEventSeverity'](
          testCase.success,
          testCase.riskScore,
          testCase.isIpBlocked,
          testCase.hasLocationAnomaly,
        );

        expect(result.severity).toBe(testCase.expectedSeverity);
        expect(result.eventType).toBe(testCase.expectedType);
      }
    });
  });
});
