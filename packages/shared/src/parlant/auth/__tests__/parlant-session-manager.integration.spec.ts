/**
 * PARLANT Session Manager Service Integration Tests
 *
 * Comprehensive integration test suite for the PARLANT Session Manager Service
 * covering session lifecycle management, multi-device handling, concurrent session
 * limits, security features, performance testing, and enterprise usage patterns.
 *
 * @module ParlantSessionManagerIntegrationSpec
 * @version 1.0.0
 * @author PARLANT Session Management Integration Test Specialist
 */

import { Test, TestingModule } from "@nestjs/testing";
import {
  ParlantSessionManager,
  ParlantSession,
  SessionMetrics,
} from "../parlant-session-manager.service";
import { ParlantContext } from "../parlant-jwt-bridge.service";

describe("ParlantSessionManager Integration Tests", () => {
  let sessionManager: ParlantSessionManager;
  let module: TestingModule;

  // Test data and utilities
  const mockUsers = {
    user1: "test-user-1",
    user2: "test-user-2",
    user3: "test-user-3",
    admin: "admin-user",
    enterprise: "enterprise-user",
  };

  const mockDevices = {
    mobile: {
      deviceId: "mobile-device-001",
      ipAddress: "192.168.1.100",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
      location: {
        country: "US",
        city: "New York",
        coordinates: [40.7128, -74.006] as [number, number],
      },
    },
    desktop: {
      deviceId: "desktop-device-001",
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      location: {
        country: "US",
        city: "San Francisco",
        coordinates: [37.7749, -122.4194] as [number, number],
      },
    },
    tablet: {
      deviceId: "tablet-device-001",
      ipAddress: "192.168.1.102",
      userAgent:
        "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
      location: {
        country: "CA",
        city: "Toronto",
        coordinates: [43.6532, -79.3832] as [number, number],
      },
    },
  };

  const createMockContext = (
    userId: string,
    sessionId?: string,
    conversationId?: string,
    securityLevel:
      | "MINIMAL"
      | "LOW"
      | "MODERATE"
      | "HIGH"
      | "CRITICAL" = "MODERATE",
  ): ParlantContext => ({
    userId,
    sessionId:
      sessionId ||
      `session_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    conversationId:
      conversationId ||
      `conv_${Date.now()}_${Math.random().toString(36).substring(2)}`,
    securityLevel,
    timestamp: new Date(),
    metadata: {
      testContext: true,
      environmentType: "integration-test",
    },
  });

  const waitFor = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [ParlantSessionManager],
    }).compile();

    sessionManager = module.get<ParlantSessionManager>(ParlantSessionManager);

    // Clear any existing sessions before each test
    await sessionManager["sessions"].clear();
    await sessionManager["userSessions"].clear();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe("Session Creation and Lifecycle Management", () => {
    it("should create a new session with complete context and device information", async () => {
      const context = createMockContext(mockUsers.user1);
      const deviceInfo = mockDevices.mobile;

      const session = await sessionManager.createSession(context, deviceInfo);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(context.sessionId);
      expect(session.conversationId).toBe(context.conversationId);
      expect(session.userId).toBe(mockUsers.user1);
      expect(session.deviceId).toBe(deviceInfo.deviceId);
      expect(session.ipAddress).toBe(deviceInfo.ipAddress);
      expect(session.userAgent).toBe(deviceInfo.userAgent);
      expect(session.location).toEqual(deviceInfo.location);
      expect(session.securityLevel).toBe("MODERATE");
      expect(session.isActive).toBe(true);
      expect(session.metadata.parlantIntegration).toBe(true);
      expect(session.metadata.bridgeVersion).toBe("1.0.0");
    });

    it("should create session without device information", async () => {
      const context = createMockContext(mockUsers.user2);

      const session = await sessionManager.createSession(context);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe(context.sessionId);
      expect(session.userId).toBe(mockUsers.user2);
      expect(session.deviceId).toBeUndefined();
      expect(session.ipAddress).toBeUndefined();
      expect(session.userAgent).toBeUndefined();
      expect(session.location).toBeUndefined();
      expect(session.isActive).toBe(true);
    });

    it("should generate session ID when not provided in context", async () => {
      const context = createMockContext(mockUsers.user3);
      delete (context as any).sessionId;

      const session = await sessionManager.createSession(
        context,
        mockDevices.desktop,
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toMatch(/^parlant_session_/);
      expect(session.userId).toBe(mockUsers.user3);
      expect(session.isActive).toBe(true);
    });

    it("should retrieve existing active session", async () => {
      const context = createMockContext(mockUsers.user1);
      const createdSession = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      const retrievedSession = await sessionManager.getSession(
        createdSession.sessionId,
      );

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.sessionId).toBe(createdSession.sessionId);
      expect(retrievedSession!.userId).toBe(mockUsers.user1);
      expect(retrievedSession!.isActive).toBe(true);
    });

    it("should return null for non-existent session", async () => {
      const nonExistentSessionId = "non-existent-session-id";

      const session = await sessionManager.getSession(nonExistentSessionId);

      expect(session).toBeNull();
    });

    it("should update session activity and extend expiration", async () => {
      const context = createMockContext(mockUsers.user1);
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );
      const originalLastActivity = session.lastActivity;
      const originalExpiresAt = session.expiresAt;

      // Wait a bit to ensure timestamp difference
      await waitFor(10);

      const updated = await sessionManager.updateSessionActivity(
        session.sessionId,
      );

      expect(updated).toBe(true);

      const updatedSession = await sessionManager.getSession(session.sessionId);
      expect(updatedSession).toBeDefined();
      expect(updatedSession!.lastActivity.getTime()).toBeGreaterThan(
        originalLastActivity.getTime(),
      );
      expect(updatedSession!.expiresAt.getTime()).toBeGreaterThan(
        originalExpiresAt.getTime(),
      );
    });

    it("should handle session expiration correctly", async () => {
      const context = createMockContext(mockUsers.user1);
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      // Manually expire the session
      session.expiresAt = new Date(Date.now() - 1000);
      sessionManager["sessions"].set(session.sessionId, session);

      const expiredSession = await sessionManager.getSession(session.sessionId);

      expect(expiredSession).toBeNull();
      expect(sessionManager["sessions"].has(session.sessionId)).toBe(false);
    });

    it("should terminate session successfully", async () => {
      const context = createMockContext(mockUsers.user1);
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      const terminated = await sessionManager.terminateSession(
        session.sessionId,
      );

      expect(terminated).toBe(true);

      const terminatedSession = await sessionManager.getSession(
        session.sessionId,
      );
      expect(terminatedSession).toBeNull();
    });

    it("should handle terminating non-existent session", async () => {
      const nonExistentSessionId = "non-existent-session-id";

      const terminated =
        await sessionManager.terminateSession(nonExistentSessionId);

      expect(terminated).toBe(false);
    });
  });

  describe("Multi-Device Session Handling", () => {
    it("should handle multiple sessions for same user on different devices", async () => {
      const userId = mockUsers.enterprise;

      const mobileContext = createMockContext(userId, "mobile-session");
      const desktopContext = createMockContext(userId, "desktop-session");
      const tabletContext = createMockContext(userId, "tablet-session");

      const mobileSession = await sessionManager.createSession(
        mobileContext,
        mockDevices.mobile,
      );
      const desktopSession = await sessionManager.createSession(
        desktopContext,
        mockDevices.desktop,
      );
      const tabletSession = await sessionManager.createSession(
        tabletContext,
        mockDevices.tablet,
      );

      const userSessions = await sessionManager.getUserSessions(userId);

      expect(userSessions).toHaveLength(3);
      expect(userSessions.map((s) => s.sessionId)).toContain(
        mobileSession.sessionId,
      );
      expect(userSessions.map((s) => s.sessionId)).toContain(
        desktopSession.sessionId,
      );
      expect(userSessions.map((s) => s.sessionId)).toContain(
        tabletSession.sessionId,
      );

      // Verify device information is correctly stored
      const mobileSessionData = userSessions.find(
        (s) => s.sessionId === mobileSession.sessionId,
      );
      const desktopSessionData = userSessions.find(
        (s) => s.sessionId === desktopSession.sessionId,
      );
      const tabletSessionData = userSessions.find(
        (s) => s.sessionId === tabletSession.sessionId,
      );

      expect(mobileSessionData!.deviceId).toBe(mockDevices.mobile.deviceId);
      expect(desktopSessionData!.deviceId).toBe(mockDevices.desktop.deviceId);
      expect(tabletSessionData!.deviceId).toBe(mockDevices.tablet.deviceId);
    });

    it("should track device distribution correctly", async () => {
      const userId = mockUsers.enterprise;

      // Create sessions on different device types
      await sessionManager.createSession(
        createMockContext(userId, "mobile-1"),
        mockDevices.mobile,
      );
      await sessionManager.createSession(
        createMockContext(userId, "desktop-1"),
        mockDevices.desktop,
      );
      await sessionManager.createSession(
        createMockContext(userId, "tablet-1"),
        mockDevices.tablet,
      );

      const metrics = sessionManager.getSessionMetrics();

      expect(metrics.deviceDistribution["mobile"]).toBe(1);
      expect(metrics.deviceDistribution["desktop"]).toBe(1);
      expect(metrics.deviceDistribution["tablet"]).toBe(1);
    });

    it("should handle cross-device session synchronization scenarios", async () => {
      const userId = mockUsers.user1;

      // Create session on mobile
      const mobileContext = createMockContext(userId, "mobile-sync-session");
      const mobileSession = await sessionManager.createSession(
        mobileContext,
        mockDevices.mobile,
      );

      // Update activity on mobile
      await sessionManager.updateSessionActivity(mobileSession.sessionId);

      // Verify session is accessible and updated
      const syncedSession = await sessionManager.getSession(
        mobileSession.sessionId,
      );
      expect(syncedSession).toBeDefined();
      expect(syncedSession!.lastActivity.getTime()).toBeGreaterThan(
        mobileSession.lastActivity.getTime(),
      );

      // Create additional session on desktop for same user
      const desktopContext = createMockContext(userId, "desktop-sync-session");
      const desktopSession = await sessionManager.createSession(
        desktopContext,
        mockDevices.desktop,
      );

      const userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(2);
      expect(userSessions.every((s) => s.isActive)).toBe(true);
    });

    it("should handle device location tracking", async () => {
      const userId = mockUsers.user2;

      const contexts = [
        {
          context: createMockContext(userId, "us-session"),
          device: mockDevices.mobile,
        },
        {
          context: createMockContext(userId, "ca-session"),
          device: mockDevices.tablet,
        },
      ];

      const sessions = await Promise.all(
        contexts.map(({ context, device }) =>
          sessionManager.createSession(context, device),
        ),
      );

      expect(sessions[0].location!.country).toBe("US");
      expect(sessions[0].location!.city).toBe("New York");
      expect(sessions[1].location!.country).toBe("CA");
      expect(sessions[1].location!.city).toBe("Toronto");
    });
  });

  describe("Concurrent Session Limits Enforcement", () => {
    it("should enforce maximum concurrent sessions per user", async () => {
      const userId = mockUsers.user1;
      const maxSessions = 10; // Based on default config

      // Create maximum allowed sessions
      const sessionPromises = [];
      for (let i = 0; i < maxSessions; i++) {
        const context = createMockContext(userId, `session-${i}`);
        sessionPromises.push(
          sessionManager.createSession(context, mockDevices.mobile),
        );
      }

      const sessions = await Promise.all(sessionPromises);
      expect(sessions).toHaveLength(maxSessions);

      let userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(maxSessions);

      // Create one more session - should trigger limit enforcement
      const extraContext = createMockContext(userId, "extra-session");
      const extraSession = await sessionManager.createSession(
        extraContext,
        mockDevices.desktop,
      );

      expect(extraSession).toBeDefined();

      // Verify oldest session was terminated
      userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(maxSessions);
      expect(userSessions.map((s) => s.sessionId)).toContain(
        extraSession.sessionId,
      );
    });

    it("should terminate oldest session when limit is exceeded", async () => {
      const userId = mockUsers.user2;

      // Create sessions with slight time delays to ensure ordering
      const session1 = await sessionManager.createSession(
        createMockContext(userId, "oldest-session"),
        mockDevices.mobile,
      );
      await waitFor(10);

      const session2 = await sessionManager.createSession(
        createMockContext(userId, "middle-session"),
        mockDevices.desktop,
      );
      await waitFor(10);

      const session3 = await sessionManager.createSession(
        createMockContext(userId, "newest-session"),
        mockDevices.tablet,
      );

      // Fill up to the limit (assuming limit is 10, create 7 more)
      const additionalSessions = [];
      for (let i = 0; i < 7; i++) {
        await waitFor(5);
        const context = createMockContext(userId, `session-${i + 4}`);
        additionalSessions.push(
          await sessionManager.createSession(context, mockDevices.mobile),
        );
      }

      let userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(10);

      // Create one more session to trigger limit enforcement
      await waitFor(10);
      const newSession = await sessionManager.createSession(
        createMockContext(userId, "trigger-limit-session"),
        mockDevices.desktop,
      );

      userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(10);
      expect(userSessions.map((s) => s.sessionId)).toContain(
        newSession.sessionId,
      );
      expect(userSessions.map((s) => s.sessionId)).not.toContain(
        session1.sessionId,
      ); // Oldest should be removed
    });

    it("should handle concurrent session creation correctly", async () => {
      const userId = mockUsers.user3;

      // Create multiple sessions concurrently
      const concurrentPromises = [];
      for (let i = 0; i < 5; i++) {
        const context = createMockContext(userId, `concurrent-session-${i}`);
        concurrentPromises.push(
          sessionManager.createSession(context, mockDevices.mobile),
        );
      }

      const concurrentSessions = await Promise.all(concurrentPromises);

      expect(concurrentSessions).toHaveLength(5);
      expect(concurrentSessions.every((s) => s.isActive)).toBe(true);

      const userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(5);
    });

    it("should handle user with no existing sessions", async () => {
      const userId = "new-user-with-no-sessions";

      const userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(0);

      // Create first session
      const context = createMockContext(userId, "first-session");
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      expect(session).toBeDefined();
      expect(session.isActive).toBe(true);

      const updatedUserSessions = await sessionManager.getUserSessions(userId);
      expect(updatedUserSessions).toHaveLength(1);
    });
  });

  describe("Session Cleanup and Expiration Handling", () => {
    it("should automatically clean up expired sessions", async () => {
      const userId = mockUsers.user1;
      const context = createMockContext(userId);
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      // Manually expire the session
      session.expiresAt = new Date(Date.now() - 1000);
      sessionManager["sessions"].set(session.sessionId, session);

      // Trigger cleanup manually (normally done by timer)
      await sessionManager["cleanupExpiredSessions"]();

      const cleanedSession = await sessionManager.getSession(session.sessionId);
      expect(cleanedSession).toBeNull();
      expect(sessionManager["sessions"].has(session.sessionId)).toBe(false);
    });

    it("should clean up multiple expired sessions", async () => {
      const users = [mockUsers.user1, mockUsers.user2, mockUsers.user3];
      const expiredSessions = [];

      // Create multiple sessions and expire them
      for (const userId of users) {
        const context = createMockContext(userId);
        const session = await sessionManager.createSession(
          context,
          mockDevices.mobile,
        );
        session.expiresAt = new Date(Date.now() - 1000);
        sessionManager["sessions"].set(session.sessionId, session);
        expiredSessions.push(session);
      }

      // Also create one active session
      const activeContext = createMockContext("active-user");
      const activeSession = await sessionManager.createSession(
        activeContext,
        mockDevices.desktop,
      );

      expect(sessionManager["sessions"].size).toBe(4);

      // Trigger cleanup
      await sessionManager["cleanupExpiredSessions"]();

      // Only active session should remain
      expect(sessionManager["sessions"].size).toBe(1);
      expect(sessionManager["sessions"].has(activeSession.sessionId)).toBe(
        true,
      );

      for (const expiredSession of expiredSessions) {
        expect(sessionManager["sessions"].has(expiredSession.sessionId)).toBe(
          false,
        );
      }
    });

    it("should clean up inactive sessions", async () => {
      const userId = mockUsers.user1;
      const context = createMockContext(userId);
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      // Mark session as inactive
      session.isActive = false;
      sessionManager["sessions"].set(session.sessionId, session);

      // Trigger cleanup
      await sessionManager["cleanupExpiredSessions"]();

      const cleanedSession = await sessionManager.getSession(session.sessionId);
      expect(cleanedSession).toBeNull();
    });

    it("should terminate all sessions for a user", async () => {
      const userId = mockUsers.enterprise;

      // Create multiple sessions for the user
      const sessions = [];
      for (let i = 0; i < 5; i++) {
        const context = createMockContext(userId, `bulk-session-${i}`);
        sessions.push(
          await sessionManager.createSession(context, mockDevices.mobile),
        );
      }

      let userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(5);

      const terminatedCount =
        await sessionManager.terminateUserSessions(userId);

      expect(terminatedCount).toBe(5);

      userSessions = await sessionManager.getUserSessions(userId);
      expect(userSessions).toHaveLength(0);

      // Verify sessions are actually terminated
      for (const session of sessions) {
        const terminatedSession = await sessionManager.getSession(
          session.sessionId,
        );
        expect(terminatedSession).toBeNull();
      }
    });

    it("should handle terminating sessions for user with no sessions", async () => {
      const userId = "user-with-no-sessions";

      const terminatedCount =
        await sessionManager.terminateUserSessions(userId);
      expect(terminatedCount).toBe(0);
    });
  });

  describe("Geolocation Tracking and Device Fingerprinting", () => {
    it("should track geolocation data accurately", async () => {
      const userId = mockUsers.user1;
      const context = createMockContext(userId);
      const deviceWithLocation = {
        ...mockDevices.mobile,
        location: {
          country: "UK",
          city: "London",
          coordinates: [51.5074, -0.1278] as [number, number],
        },
      };

      const session = await sessionManager.createSession(
        context,
        deviceWithLocation,
      );

      expect(session.location).toEqual(deviceWithLocation.location);
      expect(session.location!.country).toBe("UK");
      expect(session.location!.city).toBe("London");
      expect(session.location!.coordinates).toEqual([51.5074, -0.1278]);
    });

    it("should handle sessions without geolocation data", async () => {
      const userId = mockUsers.user2;
      const context = createMockContext(userId);
      const deviceWithoutLocation = {
        deviceId: "device-no-location",
        ipAddress: "10.0.0.1",
        userAgent: "Test Agent",
      };

      const session = await sessionManager.createSession(
        context,
        deviceWithoutLocation,
      );

      expect(session.location).toBeUndefined();
      expect(session.deviceId).toBe(deviceWithoutLocation.deviceId);
      expect(session.ipAddress).toBe(deviceWithoutLocation.ipAddress);
    });

    it("should track device fingerprinting through user agent", async () => {
      const userId = mockUsers.user3;
      const testDevices = [
        {
          deviceId: "fingerprint-mobile",
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
          expectedType: "mobile",
        },
        {
          deviceId: "fingerprint-desktop",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          expectedType: "desktop",
        },
        {
          deviceId: "fingerprint-tablet",
          userAgent:
            "Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
          expectedType: "tablet",
        },
      ];

      const sessions = [];
      for (const device of testDevices) {
        const context = createMockContext(userId, `session-${device.deviceId}`);
        const session = await sessionManager.createSession(context, device);
        sessions.push({ session, expectedType: device.expectedType });
      }

      const metrics = sessionManager.getSessionMetrics();

      expect(metrics.deviceDistribution["mobile"]).toBe(1);
      expect(metrics.deviceDistribution["desktop"]).toBe(1);
      expect(metrics.deviceDistribution["tablet"]).toBe(1);
    });

    it("should handle unknown device types", async () => {
      const userId = mockUsers.user1;
      const context = createMockContext(userId);
      const unknownDevice = {
        deviceId: "unknown-device",
        userAgent: "CustomBot/1.0",
      };

      const session = await sessionManager.createSession(
        context,
        unknownDevice,
      );

      expect(session.userAgent).toBe(unknownDevice.userAgent);

      const metrics = sessionManager.getSessionMetrics();
      expect(metrics.deviceDistribution["desktop"]).toBe(1); // Should default to desktop
    });
  });

  describe("Session Metrics and Health Monitoring", () => {
    it("should provide accurate session metrics", async () => {
      // Create sessions for different users
      const users = [mockUsers.user1, mockUsers.user2, mockUsers.user3];
      const totalSessions = 6;

      for (let i = 0; i < totalSessions; i++) {
        const userId = users[i % users.length];
        const context = createMockContext(userId, `metrics-session-${i}`);
        await sessionManager.createSession(context, mockDevices.mobile);
      }

      const metrics = sessionManager.getSessionMetrics();

      expect(metrics.totalSessions).toBe(totalSessions);
      expect(metrics.activeSessions).toBe(totalSessions);
      expect(metrics.averageSessionDuration).toBeGreaterThan(0);
      expect(Object.keys(metrics.concurrentSessionsPerUser)).toHaveLength(
        users.length,
      );
      expect(metrics.concurrentSessionsPerUser[mockUsers.user1]).toBe(2);
      expect(metrics.concurrentSessionsPerUser[mockUsers.user2]).toBe(2);
      expect(metrics.concurrentSessionsPerUser[mockUsers.user3]).toBe(2);
    });

    it("should calculate average session duration correctly", async () => {
      const userId = mockUsers.user1;
      const context = createMockContext(userId);

      // Create session and wait to accumulate duration
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );
      await waitFor(100); // Wait 100ms

      const metrics = sessionManager.getSessionMetrics();
      expect(metrics.averageSessionDuration).toBeGreaterThan(50); // Should be at least 50ms
    });

    it("should handle device distribution metrics", async () => {
      const userId = mockUsers.enterprise;

      // Create sessions on different device types
      const deviceTypes = [
        { device: mockDevices.mobile, type: "mobile" },
        { device: mockDevices.mobile, type: "mobile" },
        { device: mockDevices.desktop, type: "desktop" },
        { device: mockDevices.tablet, type: "tablet" },
      ];

      for (let i = 0; i < deviceTypes.length; i++) {
        const context = createMockContext(userId, `device-metrics-${i}`);
        await sessionManager.createSession(context, deviceTypes[i].device);
      }

      const metrics = sessionManager.getSessionMetrics();

      expect(metrics.deviceDistribution["mobile"]).toBe(2);
      expect(metrics.deviceDistribution["desktop"]).toBe(1);
      expect(metrics.deviceDistribution["tablet"]).toBe(1);
    });

    it("should perform health checks successfully", async () => {
      // Create some sessions for a healthy state
      const userId = mockUsers.user1;
      for (let i = 0; i < 3; i++) {
        const context = createMockContext(userId, `health-session-${i}`);
        await sessionManager.createSession(context, mockDevices.mobile);
      }

      const healthCheck = await sessionManager.healthCheck();

      expect(healthCheck.status).toBe("healthy");
      expect(healthCheck.metrics).toBeDefined();
      expect(healthCheck.metrics.totalSessions).toBe(3);
      expect(healthCheck.metrics.activeSessions).toBe(3);
    });

    it("should detect degraded health status with too many sessions", async () => {
      // Mock a scenario with too many sessions
      const originalSize = sessionManager["sessions"].size;

      // Simulate many sessions by directly setting the size check
      const mockSessions = new Map();
      for (let i = 0; i < 15000; i++) {
        mockSessions.set(`session-${i}`, {
          sessionId: `session-${i}`,
          isActive: true,
          createdAt: new Date(),
          userId: `user-${i}`,
        });
      }

      // Temporarily replace the sessions map
      const originalSessionsMap = sessionManager["sessions"];
      (sessionManager as any).sessions = mockSessions;

      const healthCheck = await sessionManager.healthCheck();

      expect(healthCheck.status).toBe("degraded");
      expect(healthCheck.metrics).toBeDefined();

      // Restore original sessions map
      (sessionManager as any).sessions = originalSessionsMap;
    });

    it("should handle metrics for empty session state", async () => {
      const metrics = sessionManager.getSessionMetrics();

      expect(metrics.totalSessions).toBe(0);
      expect(metrics.activeSessions).toBe(0);
      expect(metrics.averageSessionDuration).toBe(0);
      expect(Object.keys(metrics.concurrentSessionsPerUser)).toHaveLength(0);
      expect(Object.keys(metrics.deviceDistribution)).toHaveLength(0);
    });
  });

  describe("Performance Testing", () => {
    it("should create sessions within performance targets", async () => {
      const performanceTargets = {
        sessionCreation: 100, // ms
        sessionRetrieval: 10, // ms
        sessionUpdate: 10, // ms
      };

      const userId = mockUsers.user1;
      const context = createMockContext(userId);

      // Test session creation performance
      const creationStart = Date.now();
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );
      const creationTime = Date.now() - creationStart;

      expect(creationTime).toBeLessThan(performanceTargets.sessionCreation);

      // Test session retrieval performance
      const retrievalStart = Date.now();
      await sessionManager.getSession(session.sessionId);
      const retrievalTime = Date.now() - retrievalStart;

      expect(retrievalTime).toBeLessThan(performanceTargets.sessionRetrieval);

      // Test session update performance
      const updateStart = Date.now();
      await sessionManager.updateSessionActivity(session.sessionId);
      const updateTime = Date.now() - updateStart;

      expect(updateTime).toBeLessThan(performanceTargets.sessionUpdate);
    });

    it("should handle high concurrency session operations", async () => {
      const concurrentOperations = 50;
      const userId = mockUsers.enterprise;

      const startTime = Date.now();

      // Create many sessions concurrently
      const sessionPromises = [];
      for (let i = 0; i < concurrentOperations; i++) {
        const context = createMockContext(userId, `concurrent-perf-${i}`);
        sessionPromises.push(
          sessionManager.createSession(context, mockDevices.mobile),
        );
      }

      const sessions = await Promise.all(sessionPromises);
      const totalTime = Date.now() - startTime;

      expect(sessions).toHaveLength(concurrentOperations);
      expect(sessions.every((s) => s.isActive)).toBe(true);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Performance per operation should be reasonable
      const avgTimePerOperation = totalTime / concurrentOperations;
      expect(avgTimePerOperation).toBeLessThan(100); // Average under 100ms per operation
    });

    it("should maintain performance under memory pressure", async () => {
      const userId = mockUsers.user1;

      // Create many sessions to simulate memory pressure
      const sessions = [];
      for (let i = 0; i < 100; i++) {
        const context = createMockContext(userId, `memory-pressure-${i}`);
        sessions.push(
          await sessionManager.createSession(context, mockDevices.mobile),
        );
      }

      // Test operations still perform well
      const testContext = createMockContext(userId, "performance-test-session");

      const start = Date.now();
      const testSession = await sessionManager.createSession(
        testContext,
        mockDevices.desktop,
      );
      const creationTime = Date.now() - start;

      expect(creationTime).toBeLessThan(200); // Should still be fast under pressure
      expect(testSession.isActive).toBe(true);

      // Cleanup test sessions
      for (const session of sessions) {
        await sessionManager.terminateSession(session.sessionId);
      }
    });

    it("should handle rapid session lifecycle operations", async () => {
      const userId = mockUsers.user2;
      const iterations = 20;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const context = createMockContext(userId, `rapid-lifecycle-${i}`);

        // Create session
        const session = await sessionManager.createSession(
          context,
          mockDevices.mobile,
        );

        // Update activity
        await sessionManager.updateSessionActivity(session.sessionId);

        // Retrieve session
        await sessionManager.getSession(session.sessionId);

        // Terminate session
        await sessionManager.terminateSession(session.sessionId);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerCycle = totalTime / iterations;

      expect(avgTimePerCycle).toBeLessThan(50); // Each full cycle should be under 50ms
    });
  });

  describe("Enterprise Usage Patterns", () => {
    it("should handle enterprise multi-tenant scenario", async () => {
      const tenants = ["tenant-a", "tenant-b", "tenant-c"];
      const usersPerTenant = 3;
      const sessionsPerUser = 2;

      const allSessions = [];

      for (const tenant of tenants) {
        for (let u = 0; u < usersPerTenant; u++) {
          const userId = `${tenant}-user-${u}`;
          for (let s = 0; s < sessionsPerUser; s++) {
            const context = createMockContext(
              userId,
              `${tenant}-session-${u}-${s}`,
            );
            context.metadata = { ...context.metadata, tenantId: tenant };
            const session = await sessionManager.createSession(
              context,
              mockDevices.mobile,
            );
            allSessions.push(session);
          }
        }
      }

      expect(allSessions).toHaveLength(
        tenants.length * usersPerTenant * sessionsPerUser,
      );

      const metrics = sessionManager.getSessionMetrics();
      expect(metrics.totalSessions).toBe(allSessions.length);
      expect(metrics.activeSessions).toBe(allSessions.length);

      // Verify tenant isolation in metadata
      const tenantASessions = allSessions.filter(
        (s) => s.metadata.tenantId === "tenant-a",
      );
      const tenantBSessions = allSessions.filter(
        (s) => s.metadata.tenantId === "tenant-b",
      );
      const tenantCSessions = allSessions.filter(
        (s) => s.metadata.tenantId === "tenant-c",
      );

      expect(tenantASessions).toHaveLength(usersPerTenant * sessionsPerUser);
      expect(tenantBSessions).toHaveLength(usersPerTenant * sessionsPerUser);
      expect(tenantCSessions).toHaveLength(usersPerTenant * sessionsPerUser);
    });

    it("should handle enterprise security levels", async () => {
      const securityScenarios = [
        { level: "MINIMAL" as const, userId: "minimal-user" },
        { level: "LOW" as const, userId: "low-user" },
        { level: "MODERATE" as const, userId: "moderate-user" },
        { level: "HIGH" as const, userId: "high-user" },
        { level: "CRITICAL" as const, userId: "critical-user" },
      ];

      const sessions = [];
      for (const scenario of securityScenarios) {
        const context = createMockContext(
          scenario.userId,
          undefined,
          undefined,
          scenario.level,
        );
        const session = await sessionManager.createSession(
          context,
          mockDevices.desktop,
        );
        sessions.push({ session, level: scenario.level });
      }

      expect(sessions).toHaveLength(securityScenarios.length);

      for (const { session, level } of sessions) {
        expect(session.securityLevel).toBe(level);
        expect(session.isActive).toBe(true);
      }
    });

    it("should handle enterprise administrative operations", async () => {
      const adminUserId = mockUsers.admin;
      const regularUsers = [mockUsers.user1, mockUsers.user2, mockUsers.user3];

      // Create sessions for regular users
      const userSessions = [];
      for (const userId of regularUsers) {
        for (let i = 0; i < 3; i++) {
          const context = createMockContext(userId, `${userId}-session-${i}`);
          userSessions.push(
            await sessionManager.createSession(context, mockDevices.mobile),
          );
        }
      }

      // Create admin session
      const adminContext = createMockContext(
        adminUserId,
        "admin-session",
        undefined,
        "HIGH",
      );
      const adminSession = await sessionManager.createSession(
        adminContext,
        mockDevices.desktop,
      );

      expect(userSessions).toHaveLength(9); // 3 users × 3 sessions
      expect(adminSession.securityLevel).toBe("HIGH");

      // Admin can view all metrics
      const metrics = sessionManager.getSessionMetrics();
      expect(metrics.totalSessions).toBe(10); // 9 user sessions + 1 admin session
      expect(metrics.activeSessions).toBe(10);

      // Simulate admin terminating all sessions for a specific user
      const terminatedCount = await sessionManager.terminateUserSessions(
        regularUsers[0],
      );
      expect(terminatedCount).toBe(3);

      const updatedMetrics = sessionManager.getSessionMetrics();
      expect(updatedMetrics.totalSessions).toBe(7); // 6 remaining user sessions + 1 admin session
    });

    it("should handle enterprise failover scenarios", async () => {
      const userId = mockUsers.enterprise;

      // Create sessions representing different data centers
      const dataCenters = ["dc-east", "dc-west", "dc-central"];
      const sessions = [];

      for (const dc of dataCenters) {
        for (let i = 0; i < 2; i++) {
          const context = createMockContext(userId, `${dc}-session-${i}`);
          context.metadata = { ...context.metadata, dataCenter: dc };
          sessions.push(
            await sessionManager.createSession(context, mockDevices.mobile),
          );
        }
      }

      expect(sessions).toHaveLength(6);

      // Simulate failover - terminate sessions from one data center
      const dcEastSessions = sessions.filter(
        (s) => s.metadata.dataCenter === "dc-east",
      );
      for (const session of dcEastSessions) {
        await sessionManager.terminateSession(session.sessionId);
      }

      const remainingSessions = await sessionManager.getUserSessions(userId);
      expect(remainingSessions).toHaveLength(4); // 6 - 2 terminated
      expect(
        remainingSessions.every((s) => s.metadata.dataCenter !== "dc-east"),
      ).toBe(true);
    });

    it("should handle enterprise monitoring and auditing requirements", async () => {
      const auditableUsers = ["audit-user-1", "audit-user-2"];
      const auditSessions = [];

      // Create auditable sessions with detailed metadata
      for (const userId of auditableUsers) {
        const context = createMockContext(userId);
        context.metadata = {
          ...context.metadata,
          auditEnabled: true,
          complianceLevel: "SOX",
          departmentId: "finance",
          accessReason: "quarterly-reporting",
        };

        const session = await sessionManager.createSession(context, {
          ...mockDevices.desktop,
          ipAddress: "10.0.1.100", // Internal corporate IP
          userAgent: "Corporate Browser Enterprise Edition",
        });

        auditSessions.push(session);
      }

      expect(auditSessions).toHaveLength(2);

      for (const session of auditSessions) {
        expect(session.metadata.auditEnabled).toBe(true);
        expect(session.metadata.complianceLevel).toBe("SOX");
        expect(session.metadata.departmentId).toBe("finance");
        expect(session.ipAddress).toBe("10.0.1.100");
      }

      // Verify metrics can support audit requirements
      const metrics = sessionManager.getSessionMetrics();
      expect(metrics.totalSessions).toBe(2);
      expect(metrics.activeSessions).toBe(2);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle malformed context gracefully", async () => {
      const malformedContext = {
        // Missing required userId field
        sessionId: "malformed-session",
      } as any;

      // The service should still handle this gracefully and generate required fields
      // In this case, we'll test with completely missing context
      await expect(
        sessionManager.createSession(null as any, mockDevices.mobile),
      ).rejects.toThrow();
    });

    it("should handle null device information", async () => {
      const context = createMockContext(mockUsers.user1);

      const session = await sessionManager.createSession(context, null as any);

      expect(session).toBeDefined();
      expect(session.deviceId).toBeUndefined();
      expect(session.ipAddress).toBeUndefined();
      expect(session.userAgent).toBeUndefined();
      expect(session.location).toBeUndefined();
    });

    it("should handle updating activity for non-existent session", async () => {
      const nonExistentSessionId = "non-existent-session";

      const updated =
        await sessionManager.updateSessionActivity(nonExistentSessionId);

      expect(updated).toBe(false);
    });

    it("should handle updating activity for inactive session", async () => {
      const context = createMockContext(mockUsers.user1);
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      // Mark session as inactive
      session.isActive = false;
      sessionManager["sessions"].set(session.sessionId, session);

      const updated = await sessionManager.updateSessionActivity(
        session.sessionId,
      );

      expect(updated).toBe(false);
    });

    it("should handle health check with internal errors", async () => {
      // Mock the getSessionMetrics method to throw an error
      const originalGetMetrics = sessionManager.getSessionMetrics;
      sessionManager.getSessionMetrics = jest.fn().mockImplementation(() => {
        throw new Error("Simulated internal error");
      });

      const healthCheck = await sessionManager.healthCheck();

      expect(healthCheck.status).toBe("unhealthy");
      expect(healthCheck.metrics).toBeDefined();

      // Restore the original method
      sessionManager.getSessionMetrics = originalGetMetrics;
    });

    it("should handle concurrent access to session data", async () => {
      const userId = mockUsers.user1;
      const context = createMockContext(userId);
      const session = await sessionManager.createSession(
        context,
        mockDevices.mobile,
      );

      // Simulate concurrent access
      const operations = [
        sessionManager.updateSessionActivity(session.sessionId),
        sessionManager.getSession(session.sessionId),
        sessionManager.updateSessionActivity(session.sessionId),
        sessionManager.getSession(session.sessionId),
      ];

      const results = await Promise.all(operations);

      expect(results[0]).toBe(true); // First update
      expect(results[1]).toBeDefined(); // First get
      expect(results[2]).toBe(true); // Second update
      expect(results[3]).toBeDefined(); // Second get
    });
  });
});
