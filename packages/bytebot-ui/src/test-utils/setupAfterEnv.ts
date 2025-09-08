/**
 * Jest After Environment Setup - Bytebot-UI
 *
 * Custom Jest matchers and test utilities for Bytebot UI package:
 * - React component testing utilities
 * - UI interaction validation
 * - Socket.io client mocking
 * - Tailwind CSS class validation
 * - Accessibility testing helpers
 *
 * @author Claude Code (Based on Gold Standard Template)
 * @version 2.0.0
 */

import React from 'react';
import { expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Custom Jest matchers for Bytebot UI domain
expect.extend({
  /**
   * Validates that a React element has specific Tailwind classes
   */
  toHaveTailwindClass(received: HTMLElement, className: string): jest.CustomMatcherResult {
    if (!received || !received.classList) {
      return {
        message: () => `Expected element to have classList property`,
        pass: false,
      };
    }

    const pass = received.classList.contains(className);

    if (pass) {
      return {
        message: () => `Expected element not to have Tailwind class "${className}"`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to have Tailwind class "${className}", but got classes: ${Array.from(received.classList).join(', ')}`,
        pass: false,
      };
    }
  },

  /**
   * Validates Socket.io event structure
   */
  toBeValidSocketEvent(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== 'object' || received === null) {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const event = received as Record<string, unknown>;
    const hasEventType = 'type' in event && typeof event.type === 'string';
    const hasPayload = 'payload' in event;
    const hasTimestamp = 'timestamp' in event;

    const pass = hasEventType && hasPayload && hasTimestamp;

    if (pass) {
      return {
        message: () => `Expected event not to be a valid Socket.io event`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected event to be a valid Socket.io event with type, payload, and timestamp`,
        pass: false,
      };
    }
  },

  /**
   * Validates task UI representation
   */
  toBeValidTaskUI(received: unknown): jest.CustomMatcherResult {
    if (typeof received !== 'object' || received === null) {
      return {
        message: () => `Expected ${received} to be an object`,
        pass: false,
      };
    }

    const task = received as Record<string, unknown>;
    const requiredFields = ['id', 'title', 'status', 'createdAt'];
    const missingFields = requiredFields.filter(field => !(field in task));

    if (missingFields.length === 0) {
      return {
        message: () => `Expected task UI object not to have all required fields: ${requiredFields.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected task UI object to have all required fields: ${requiredFields.join(', ')}, missing: ${missingFields.join(', ')}`,
        pass: false,
      };
    }
  },

  /**
   * Validates that an element is accessible
   */
  toBeAccessible(received: HTMLElement): jest.CustomMatcherResult {
    if (!received) {
      return {
        message: () => `Expected element to exist`,
        pass: false,
      };
    }

    // Check for basic accessibility attributes
    const hasAriaLabel = received.hasAttribute('aria-label');
    const hasAriaLabelledBy = received.hasAttribute('aria-labelledby');
    const hasRole = received.hasAttribute('role');
    const hasTabIndex = received.hasAttribute('tabindex');
    
    // Element should have at least one accessibility attribute
    const hasAccessibilityAttrs = hasAriaLabel || hasAriaLabelledBy || hasRole || hasTabIndex;

    if (hasAccessibilityAttrs) {
      return {
        message: () => `Expected element not to have accessibility attributes`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected element to have accessibility attributes (aria-label, aria-labelledby, role, or tabindex)`,
        pass: false,
      };
    }
  },

  /**
   * Validates component render performance
   */
  toRenderWithinTime(received: () => unknown, maxMs: number = 100): jest.CustomMatcherResult {
    const startTime = performance.now();
    
    try {
      received();
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      const pass = renderTime <= maxMs;

      if (pass) {
        return {
          message: () => `Expected component not to render within ${maxMs}ms (took ${renderTime.toFixed(2)}ms)`,
          pass: true,
        };
      } else {
        return {
          message: () => `Expected component to render within ${maxMs}ms, but took ${renderTime.toFixed(2)}ms`,
          pass: false,
        };
      }
    } catch (error) {
      return {
        message: () => `Expected component to render successfully, but threw error: ${error}`,
        pass: false,
      };
    }
  },
});

// Performance monitoring utilities for UI components
const performanceMonitor = {
  slowRenderThreshold: 100, // 100ms for component renders
  memoryLeakThreshold: 50 * 1024 * 1024, // 50MB
  interactionThreshold: 50, // 50ms for user interactions

  logSlowRender(componentName: string, duration: number): void {
    if (duration > this.slowRenderThreshold) {
      console.warn(`⚠️ Slow render detected: "${componentName}" took ${duration.toFixed(2)}ms`);
    }
  },

  logSlowInteraction(interactionType: string, duration: number): void {
    if (duration > this.interactionThreshold) {
      console.warn(`⚠️ Slow interaction: "${interactionType}" took ${duration.toFixed(2)}ms`);
    }
  },

  logMemoryUsage(
    testName: string,
    before: NodeJS.MemoryUsage,
    after: NodeJS.MemoryUsage,
  ): void {
    const heapDelta = after.heapUsed - before.heapUsed;
    if (heapDelta > this.memoryLeakThreshold) {
      console.warn(
        `⚠️ Memory leak detected in "${testName}": +${Math.round(heapDelta / 1024 / 1024)}MB heap`,
      );
    }
  },
};

// Global test hooks for performance monitoring
let testStartTime: number;
let testStartMemory: NodeJS.MemoryUsage;

beforeEach(() => {
  testStartTime = Date.now();
  testStartMemory = process.memoryUsage();
});

afterEach(() => {
  const testName = expect.getState().currentTestName || 'unknown';
  const duration = Date.now() - testStartTime;
  const endMemory = process.memoryUsage();

  performanceMonitor.logSlowRender(testName, duration);
  performanceMonitor.logMemoryUsage(testName, testStartMemory, endMemory);
});

// Test data factories for Bytebot UI objects
export const TestDataFactory = {
  /**
   * Creates a valid task for UI display
   */
  createUITask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Test Task',
      description: 'This is a test task for UI validation',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['test', 'ui'],
      assignee: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'Test User',
        avatar: '/test-avatar.png',
      },
      ...overrides,
    };
  },

  /**
   * Creates a valid Socket.io event
   */
  createSocketEvent(type: string, payload: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      type,
      payload,
      timestamp: new Date().toISOString(),
      id: `event_${Date.now()}`,
      ...overrides,
    };
  },

  /**
   * Creates a valid chat message
   */
  createChatMessage(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      id: '550e8400-e29b-41d4-a716-446655440003',
      content: 'This is a test message',
      sender: {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'Test Sender',
        avatar: '/test-sender.png',
        role: 'assistant',
      },
      timestamp: new Date().toISOString(),
      type: 'text',
      ...overrides,
    };
  },

  /**
   * Creates a valid user session
   */
  createUserSession(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      user: {
        id: '550e8400-e29b-41d4-a716-446655440005',
        email: 'testuser@example.com',
        name: 'Test User',
        image: '/test-user.png',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      accessToken: 'test-access-token',
      ...overrides,
    };
  },
};

// Export test utilities for use in test files
export const TestUtils = {
  performanceMonitor,
  TestDataFactory,

  /**
   * Renders a component and returns testing utilities
   */
  renderComponent: (component: React.ReactElement, options?: Record<string, unknown>) => {
    const startTime = performance.now();
    const result = render(component, options);
    const renderTime = performance.now() - startTime;
    
    performanceMonitor.logSlowRender('Component', renderTime);
    
    return {
      ...result,
      renderTime,
    };
  },

  /**
   * Creates user event utility with performance monitoring
   */
  createUserEvent: () => {
    const user = userEvent.setup();
    
    return {
      ...user,
      click: async (element: Element) => {
        const startTime = performance.now();
        await user.click(element);
        const duration = performance.now() - startTime;
        performanceMonitor.logSlowInteraction('click', duration);
      },
      type: async (element: Element, text: string) => {
        const startTime = performance.now();
        await user.type(element, text);
        const duration = performance.now() - startTime;
        performanceMonitor.logSlowInteraction('type', duration);
      },
    };
  },

  /**
   * Waits for element to appear with timeout
   */
  async waitForElement(
    selector: string,
    timeout = 5000,
  ): Promise<HTMLElement> {
    return screen.findByTestId(selector, {}, { timeout });
  },

  /**
   * Simulates Socket.io connection
   */
  createMockSocket: () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
    id: 'mock-socket-id',
  }),

  /**
   * Creates mock Next.js router
   */
  createMockRouter: (overrides: Record<string, unknown> = {}) => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    isReady: true,
    ...overrides,
  }),

  /**
   * Helper to test responsive behavior
   */
  testResponsive: (component: React.ReactElement, breakpoints: string[]) => {
    return breakpoints.map(breakpoint => {
      // Mock different viewport sizes
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: breakpoint === 'mobile' ? 375 : breakpoint === 'tablet' ? 768 : 1024,
      });
      
      window.dispatchEvent(new Event('resize'));
      
      return TestUtils.renderComponent(component);
    });
  },

  /**
   * Helper to test dark/light mode
   */
  testThemeMode: (component: React.ReactElement, mode: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', mode === 'dark');
    return TestUtils.renderComponent(component);
  },
};

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    return React.createElement('img', props);
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    return React.createElement('a', { href, ...props }, children);
  },
}));

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => TestUtils.createMockRouter(),
}));

// Export test configuration
export const testConfig = {
  slowRenderThreshold: 100,
  memoryLeakThreshold: 50 * 1024 * 1024,
  interactionThreshold: 50,
  timeout: 30000,
};