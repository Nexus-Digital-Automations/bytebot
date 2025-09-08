/**
 * Next.js Router Mock - Enhanced
 *
 * Comprehensive mocks for Next.js routing including navigation,
 * dynamic routes, and route parameters for component testing.
 *
 * @author Claude Code
 * @version 2.0.0
 */

import { NextRouter } from 'next/router';
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

/**
 * Mock Next.js Pages Router (legacy)
 */
export const createMockPagesRouter = (overrides: Partial<NextRouter> = {}): NextRouter => {
  const mockRouter: NextRouter = {
    basePath: '',
    pathname: '/',
    route: '/',
    query: {},
    asPath: '/',
    back: jest.fn(),
    beforePopState: jest.fn(),
    forward: jest.fn(),
    push: jest.fn().mockResolvedValue(true),
    replace: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    isReady: true,
    isPreview: false,
    isLocaleDomain: false,
    isFallback: false,
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    ...overrides,
  };

  return mockRouter;
};

/**
 * Mock Next.js App Router (App Directory)
 */
export const createMockAppRouter = (overrides: Partial<AppRouterInstance> = {}): AppRouterInstance => {
  const mockRouter: AppRouterInstance = {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    ...overrides,
  };

  return mockRouter;
};

/**
 * Router test utilities for common scenarios
 */
export const RouterTestUtils = {
  /**
   * Simulates navigation to a new route
   */
  simulateNavigation: async (router: NextRouter, url: string, options?: { shallow?: boolean; locale?: string; scroll?: boolean }) => {
    const pushSpy = router.push as jest.Mock;
    await pushSpy(url, options);
    
    // Update router state
    const urlParts = url.split('?');
    const pathname = urlParts[0];
    const query = urlParts[1] ? new URLSearchParams(urlParts[1]) : new URLSearchParams();
    
    Object.assign(router, {
      pathname,
      asPath: url,
      query: Object.fromEntries(query.entries()),
    });
  },

  /**
   * Simulates route with dynamic parameters
   */
  createRouterWithParams: (path: string, params: Record<string, string>): NextRouter => {
    return createMockPagesRouter({
      pathname: path,
      query: params,
      asPath: path.replace(/\[([^\]]+)\]/g, (match, param) => params[param] || match),
    });
  },

  /**
   * Simulates loading state
   */
  createLoadingRouter: (): NextRouter => {
    return createMockPagesRouter({
      isReady: false,
      isFallback: true,
    });
  },

  /**
   * Simulates error state
   */
  createErrorRouter: (error: Error): NextRouter => {
    const router = createMockPagesRouter();
    (router.push as jest.Mock).mockRejectedValue(error);
    (router.replace as jest.Mock).mockRejectedValue(error);
    return router;
  },

  /**
   * Verifies navigation calls
   */
  expectNavigation: (router: NextRouter, url: string, times: number = 1) => {
    expect(router.push).toHaveBeenCalledWith(url);
    expect(router.push).toHaveBeenCalledTimes(times);
  },

  /**
   * Verifies route replacement
   */
  expectReplacement: (router: NextRouter, url: string, times: number = 1) => {
    expect(router.replace).toHaveBeenCalledWith(url);
    expect(router.replace).toHaveBeenCalledTimes(times);
  },
};

/**
 * Task-specific router scenarios for Bytebot UI
 */
export const BytebotRouterScenarios = {
  /**
   * Router for task details page
   */
  taskDetailsRouter: (taskId: string): NextRouter => {
    return createMockPagesRouter({
      pathname: '/tasks/[id]',
      query: { id: taskId },
      asPath: `/tasks/${taskId}`,
    });
  },

  /**
   * Router for desktop view
   */
  desktopRouter: (): NextRouter => {
    return createMockPagesRouter({
      pathname: '/desktop',
      asPath: '/desktop',
    });
  },

  /**
   * Router for chat page
   */
  chatRouter: (): NextRouter => {
    return createMockPagesRouter({
      pathname: '/',
      asPath: '/',
    });
  },

  /**
   * Router for API routes
   */
  apiRouter: (path: string): NextRouter => {
    return createMockPagesRouter({
      pathname: `/api/${path}`,
      asPath: `/api/${path}`,
    });
  },
};

// Export default mock for jest.mock()
const DefaultRouterMock = {
  useRouter: () => createMockPagesRouter(),
};

export default DefaultRouterMock;