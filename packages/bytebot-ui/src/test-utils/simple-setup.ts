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
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "test";
}
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
  value(query: string): MediaQueryList {
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener(): void {
        // Deprecated MediaQueryList method - no operation needed in tests
      }, // Deprecated
      removeListener(): void {
        // Deprecated MediaQueryList method - no operation needed in tests
      }, // Deprecated
      addEventListener(): void {
        // MediaQueryList addEventListener mock - no operation needed in tests
      },
      removeEventListener(): void {
        // MediaQueryList removeEventListener mock - no operation needed in tests
      },
      dispatchEvent(): boolean {
        return false;
      },
    } as MediaQueryList;
  },
});

// Mock ResizeObserver
(global as { ResizeObserver?: unknown }).ResizeObserver = class ResizeObserver {
  observe(): void {
    // ResizeObserver observe mock - no operation needed in tests
  }
  unobserve(): void {
    // ResizeObserver unobserve mock - no operation needed in tests
  }
  disconnect(): void {
    // ResizeObserver disconnect mock - no operation needed in tests
  }
};

// Mock IntersectionObserver
(global as { IntersectionObserver?: unknown }).IntersectionObserver =
  class IntersectionObserver {
    observe(): void {
      // IntersectionObserver observe mock - no operation needed in tests
    }
    unobserve(): void {
      // IntersectionObserver unobserve mock - no operation needed in tests
    }
    disconnect(): void {
      // IntersectionObserver disconnect mock - no operation needed in tests
    }
    root = null;
    rootMargin = "";
    thresholds: number[] = [];
  };

// Mock WebSocket for Socket.io testing
class MockWebSocket {
  close(): void {
    // WebSocket close mock - no operation needed in tests
  }
  send(): void {
    // WebSocket send mock - no operation needed in tests
  }
  addEventListener(): void {
    // WebSocket addEventListener mock - no operation needed in tests
  }
  removeEventListener(): void {
    // WebSocket removeEventListener mock - no operation needed in tests
  }
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
