import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateBrowserSessionDto,
  BrowserSessionDto,
  BrowserSessionStatus,
  BrowserTabInfoDto,
} from './dto/browser-session.dto';

/**
 * Browser Session Service - Session Lifecycle Management
 *
 * Manages browser session creation, monitoring, and cleanup for the
 * browser-use integration. Provides local-only session management
 * without any cloud dependencies.
 *
 * Key Responsibilities:
 * - Browser session lifecycle management
 * - Tab management and monitoring
 * - Session state tracking
 * - Cleanup and resource management
 * - Local storage and persistence
 */
@Injectable()
export class BrowserSessionService {
  private readonly logger = new Logger(BrowserSessionService.name);
  private readonly sessions: Map<string, BrowserSessionDto> = new Map();
  private readonly sessionCleanupInterval: NodeJS.Timeout;

  constructor() {
    // Start periodic cleanup of expired sessions
    this.sessionCleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions().catch((err) => {
        this.logger.error('Failed to cleanup expired sessions', err);
      });
    }, 60000); // Check every minute
  }

  /**
   * Create a new browser session
   */
  async createSession(
    dto: CreateBrowserSessionDto,
  ): Promise<BrowserSessionDto> {
    const sessionId = uuidv4();
    const now = new Date();

    this.logger.log(`Creating new browser session: ${sessionId}`, {
      sessionId,
      name: _dto.name,
      headless: _dto.headless,
      viewport: `${dto.viewportWidth}x${_dto.viewportHeight}`,
    });

    try {
      // Create initial session object
      const session: BrowserSessionDto = {
        sessionId,
        name: _dto.name ?? `Browser Session ${Date.now()}`,
        status: BrowserSessionStatus.CREATING,
        browserPid: 0, // Will be set when browser starts
        createdAt: now,
        lastActivityAt: now,
        viewport: {
          width: _dto.viewportWidth ?? 1920,
          height: _dto.viewportHeight ?? 1080,
        },
        config: {
          headless: _dto.headless ?? false,
          devtools: _dto.devtools ?? false,
          userAgent: _dto.userAgent,
          proxy: _dto.proxy
            ? {
                server: _dto.proxy.server,
                username: _dto.proxy.username,
              }
            : undefined,
          profilePath: _dto.profilePath,
        },
        tabs: [],
        activeTabId: '',
        statistics: {
          totalTabs: 0,
          totalPageLoads: 0,
          totalScreenshots: 0,
          totalActions: 0,
          upTimeMs: 0,
        },
        metadata: _dto.metadata,
      };

      // Store session
      this.sessions.set(sessionId, session);

      // Initialize browser (mock implementation - in production would start actual browser)
      await this.initializeBrowserSession(session, _dto);

      // Create initial tabs if specified
      if (_dto.initialUrls && _dto.initialUrls.length > 0) {
        for (const url of _dto.initialUrls) {
          await this.createTab(_sessionId, { url, makeActive: false });
        }

        // Make first tab active
        const firstTab = session.tabs.length > 0 ? session.tabs[0] : null;
        if (firstTab) {
          session.activeTabId = firstTab.tabId;
        }
      } else {
        // Create default blank tab
        const tab = await this.createTab(_sessionId, {
          url: 'about:blank',
          title: 'New Tab',
          makeActive: true,
        });
        session.activeTabId = tab.tabId;
      }

      // Update session status
      session.status = BrowserSessionStatus.ACTIVE;
      this.sessions.set(sessionId, session);

      this.logger.log(`Browser session created successfully: ${sessionId}`, {
        sessionId,
        tabsCreated: session.tabs.length,
        status: session.status,
      });

      return session;
    } catch (_err) {
      this.logger.error(`Failed to create browser session: ${sessionId}`, _err);

      // Update session with error status
      const errorSession = this.sessions.get(sessionId);
      if (errorSession) {
        errorSession.status = BrowserSessionStatus.ERROR;
        errorSession.errorInfo = {
          message: _err instanceof Error ? _err.message : String(_err),
          code: 'SESSION_CREATION_FAILED',
          timestamp: new Date(),
          details: {
            error: _err instanceof Error ? _err.stack : String(_err),
          },
        };
        this.sessions.set(sessionId, errorSession);
      }

      throw _err;
    }
  }

  /**
   * Get browser session by ID
   */
  getSession(sessionId: string): BrowserSessionDto | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return null;
    }

    // Update uptime statistics
    session.statistics.upTimeMs = Date.now() - session.createdAt.getTime();

    return session;
  }

  /**
   * Get all browser sessions
   */
  getAllSessions(): BrowserSessionDto[] {
    const sessions = Array.from(this.sessions.values());

    // Update uptime for all sessions
    sessions.forEach((session) => {
      session.statistics.upTimeMs = Date.now() - session.createdAt.getTime();
    });

    return sessions;
  }

  /**
   * Close browser session
   */
  async closeSession(sessionId: string): Promise<void> {
    this.logger.log(`Closing browser session: ${sessionId}`);

    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    try {
      // Update session status
      session.status = BrowserSessionStatus.CLOSING;
      session.lastActivityAt = new Date();

      // Close all tabs
      for (const tab of session.tabs) {
        await this.closeTab(sessionId, tab.tabId);
      }

      // Terminate browser process (mock - in production would kill actual process)
      await this.terminateBrowserSession(session);

      // Update final status
      session.status = BrowserSessionStatus.CLOSED;
      session.closedAt = new Date();

      this.logger.log(`Browser session closed successfully: ${sessionId}`, {
        sessionId,
        upTimeMs: session.statistics.upTimeMs,
        tabsProcessed: session.statistics.totalTabs,
      });
    } catch (_err) {
      this.logger.error(`Failed to close browser session: ${sessionId}`, _err);

      session.status = BrowserSessionStatus.ERROR;
      session.errorInfo = {
        message: _err instanceof Error ? _err.message : String(_err),
        code: 'SESSION_CLOSE_FAILED',
        timestamp: new Date(),
      };

      throw _err;
    }
  }

  /**
   * Create new tab in session
   */
  createTab(
    sessionId: string,
    options?: {
      url?: string;
      title?: string;
      makeActive?: boolean;
    },
  ): BrowserTabInfoDto {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const tabId = uuidv4();
    const now = new Date();

    const tab: BrowserTabInfoDto = {
      tabId,
      url: options?.url ?? 'about:blank',
      title: options?.title ?? 'New Tab',
      active: options?.makeActive ?? false,
      loading: options?.url !== 'about:blank',
      faviconUrl: undefined,
      createdAt: now,
      lastActivityAt: now,
    };

    // Add tab to session
    session.tabs.push(tab);
    session.statistics.totalTabs++;
    session.lastActivityAt = now;

    if (options?.makeActive) {
      // Deactivate other tabs
      session.tabs.forEach((t) => {
        if (t.tabId !== tabId) {
          t.active = false;
        }
      });
      session.activeTabId = tabId;
    }

    this.sessions.set(sessionId, session);

    this.logger.log(`Created new tab: ${tabId}`, {
      sessionId,
      tabId,
      url: tab.url,
      active: tab.active,
    });

    return tab;
  }

  /**
   * Close tab in session
   */
  closeTab(sessionId: string, tabId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const tabIndex = session.tabs.findIndex((t) => t.tabId === tabId);
    if (tabIndex === -1) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    // Remove tab
    session.tabs.splice(tabIndex, 1);
    session.lastActivityAt = new Date();

    // If closed tab was active, make another tab active
    if (
      session.activeTabId === tabId &&
      session.tabs.length > 0
    ) {
      const firstTab = session.tabs[0];
      if (firstTab) {
        session.activeTabId = firstTab.tabId;
        firstTab.active = true;
      }
    } else if (session.tabs.length === 0) {
      session.activeTabId = '';
    }

    this.sessions.set(sessionId, session);

    this.logger.log(`Closed tab: ${tabId}`, {
      sessionId,
      tabId,
      remainingTabs: session.tabs.length,
    });
  }

  /**
   * Switch active tab
   */
  switchTab(sessionId: string, tabId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const tab = session.tabs.find((t) => t.tabId === tabId);
    if (!tab) {
      throw new Error(`Tab not found: ${tabId}`);
    }

    // Deactivate all tabs
    session.tabs.forEach((t) => {
      t.active = false;
    });

    // Activate target tab
    tab.active = true;
    session.activeTabId = tabId;
    session.lastActivityAt = new Date();

    this.sessions.set(sessionId, session);

    this.logger.log(`Switched to tab: ${tabId}`, {
      sessionId,
      tabId,
      url: tab.url,
    });
  }

  /**
   * Update session activity
   */
  updateActivity(
    sessionId: string,
    activity: {
      actionType?: string;
      screenshot?: boolean;
      pageLoad?: boolean;
    },
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.lastActivityAt = new Date();
    session.statistics.totalActions++;

    if (activity.screenshot) {
      session.statistics.totalScreenshots++;
    }

    if (activity.pageLoad) {
      session.statistics.totalPageLoads++;
    }

    this.sessions.set(sessionId, session);
  }

  /**
   * Initialize browser session (mock implementation)
   */
  private initializeBrowserSession(
    session: BrowserSessionDto,
    dto: CreateBrowserSessionDto,
  ): void {
    // In production, this would:
    // 1. Start browser process with specified configuration
    // 2. Connect to CDP (Chrome DevTools Protocol)
    // 3. Set up event listeners
    // 4. Configure viewport, user agent, etc.

    // Mock browser PID
    session.browserPid = Math.floor(Math.random() * 10000) + 1000;

    this.logger.log(
      `Mock browser initialized with PID: ${session.browserPid}`,
      {
        sessionId: session.sessionId,
        config: session.config,
      },
    );
  }

  /**
   * Terminate browser session (mock implementation)
   */
  private terminateBrowserSession(session: BrowserSessionDto): void {
    // In production, this would:
    // 1. Close all browser tabs
    // 2. Disconnect from CDP
    // 3. Terminate browser process
    // 4. Clean up temporary files

    this.logger.log(`Mock browser terminated PID: ${session.browserPid}`, {
      sessionId: session.sessionId,
    });
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      const inactiveTime = now - session.lastActivityAt.getTime();
      const maxInactiveTime = 1800000; // 30 minutes

      if (
        inactiveTime > maxInactiveTime &&
        session.status === BrowserSessionStatus.ACTIVE
      ) {
        expiredSessions.push(sessionId);
      }

      // Remove closed sessions after 24 hours
      const closedTime = session.closedAt
        ? now - session.closedAt.getTime()
        : 0;
      const maxClosedTime = 86400000; // 24 hours

      if (
        session.status === BrowserSessionStatus.CLOSED &&
        closedTime > maxClosedTime
      ) {
        this.sessions.delete(sessionId);
        this.logger.log(`Removed old closed session: ${sessionId}`);
      }
    }

    // Close expired sessions
    for (const sessionId of expiredSessions) {
      try {
        await this.closeSession(sessionId);
        this.logger.log(`Cleaned up expired session: ${sessionId}`);
      } catch (_err) {
        this.logger.error(
          `Failed to cleanup expired session: ${sessionId}`,
          _err,
        );
      }
    }
  }

  /**
   * Cleanup on service destruction
   */
  onModuleDestroy() {
    if (this.sessionCleanupInterval) {
      clearInterval(this.sessionCleanupInterval);
    }

    // Close all active sessions
    for (const sessionId of Array.from(this.sessions.keys())) {
      this.closeSession(sessionId).catch((err) => {
        this.logger.error(
          `Failed to close session during shutdown: ${sessionId}`,
          err,
        );
      });
    }
  }
}
