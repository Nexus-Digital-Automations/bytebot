/**
 * Simple Jest Setup Configuration - Bytebot-UI
 *
 * This file provides basic setup for Jest tests in the Bytebot UI package.
 * Configures React Testing Library, Next.js environment, and UI testing utilities.
 *
 * @author Claude Code (Based on Gold Standard Template)
 * @version 2.0.0
 */

import "reflect-metadata";

// Set test environment for Bytebot UI
process.env.NODE_ENV = "test";
process.env.BYTEBOT_TEST_MODE = "true";
process.env.BYTEBOT_UI_TEST = "true";

// Next.js specific environment variables
process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001";
process.env.NEXT_PUBLIC_WS_URL = "ws://localhost:3001";
process.env.NEXTAUTH_URL = "http://localhost:3000";
process.env.NEXTAUTH_SECRET = "test-nextauth-secret-for-testing";

// Mock global objects commonly used in browser environment
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value (query: string) {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener () {}, // Deprecated
      removeListener () {}, // Deprecated
      addEventListener () {},
      removeEventListener () {},
      dispatchEvent () {},
    };
  },
});

// Mock ResizeObserver
(global as { ResizeObserver?: unknown }).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
(global as { IntersectionObserver?: unknown }).IntersectionObserver =
  class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    root = null;
    rootMargin = "";
    thresholds: number[] = [];
  };

// Mock WebSocket for Socket.io testing
class MockWebSocket {
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}
(global as { WebSocket?: unknown }).WebSocket = MockWebSocket;

// Export for potential use in tests
export const testEnvironment = {
  isTest: true,
  timeout: 30000,
  isUI: true,
  isNextJS: true,
  hasSocketIO: true,
  hasTailwind: true,
};
