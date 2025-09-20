/**
 * Browser Session Service
 *
 * Manages browser session lifecycle including creation, monitoring, and cleanup.
 * Integrates with the browser-use framework to provide session management
 * with enterprise-grade monitoring and local-only architecture compliance.
 */

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserUseService } from '../browser-use.service';
import {
  CreateBrowserSessionDto,
  BrowserSessionResponseDto,
  BrowserSessionListResponseDto,
  BrowserSessionStatus,
  BrowserTabInfo,
  BrowserSessionMetrics,
} from '../dto/browser-session.dto';
import { randomUUID } from 'crypto';

interface BrowserProfile {
  headless?: boolean;
  screenshots?: boolean;
  videoRecording?: boolean;
  networkLogging?: boolean;
  consoleLogging?: boolean;
  timeout?: number;
  [key: string]: unknown;
}

interface SessionError {
  message: string;
  code: string;
  timestamp: Date;
}

interface BrowserStateResponse {
  success: boolean;
  url?: string;
  title?: string;
  tabs?: Array<{
    id: string;
    title?: string;
    url?: string;
    active?: boolean;
    createdAt?: string | number;
    lastActivity?: string | number;
    loadingStatus?: 'loading' | 'complete' | 'error';
  }>;
  metrics?: {
    pagesVisited?: number;
    actionsPerformed?: number;
    screenshotsTaken?: number;
    errorsEncountered?: number;
    networkRequests?: number;
    dataTransferredBytes?: number;
    averagePageLoadTime?: number;
    memoryUsageMB?: number;
    cpuUsagePercent?: number;
  };
}

interface BrowserCommand {
  action: string;
  url?: string;
  include_tabs?: boolean;
  include_metrics?: boolean;
}

interface SessionSummary {
  totalSessions: number;
  activeSessions: number;
  idleSessions: number;
  closedSessions: number;
  averageSessionDuration: number;
  peakMemoryUsage: number;
}

interface SessionData {
  id: string;
  name: string;
  description?: string;
  status: BrowserSessionStatus;
  profile: BrowserProfile;
  timeoutSeconds: number;
  enableScreenshots: boolean;
  enableVideoRecording: boolean;
  enableNetworkLogging: boolean;
  enableConsoleLogging: boolean;
  tags?: string[];
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  createdBy: string;
  currentUrl?: string;
  currentTitle?: string;
  tabs: BrowserTabInfo[];
  metrics: BrowserSessionMetrics;
  processId?: string;
  websocketUrl?: string;
  config?: Record<string, unknown>;
  error?: SessionError;
}

@Injectable()
export class BrowserSessionService {
  private readonly logger = new Logger(BrowserSessionService.name);
  private readonly sessions = new Map<string, SessionData>();
  private readonly sessionTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly browserUseService: BrowserUseService,
  ) {}

  /**
   * Create a new browser session
   */
  async createSession(
    createDto: CreateBrowserSessionDto,
  ): Promise<BrowserSessionResponseDto> {
    const sessionId = randomUUID();
    const currentTime = new Date();

    this.logger.log(
      `Creating browser session: ${sessionId} (${createDto.name})`,
    );

    try {
      // Create browser process through browser-use service
      const browserProfile: BrowserProfile = {
        ...createDto.profile,
        headless: createDto.profile?.headless ?? true,
        screenshots: createDto.enableScreenshots,
        videoRecording: createDto.enableVideoRecording,
        networkLogging: createDto.enableNetworkLogging,
        consoleLogging: createDto.enableConsoleLogging,
        timeout: (createDto.timeoutSeconds ?? 30) * 1000,
      };

      const processId = await this.browserUseService.createBrowserProcess(
        'session',
        sessionId,
        browserProfile,
      );

      // Initialize session data
      const sessionData: SessionData = {
        id: sessionId,
        name: createDto.name,
        description: createDto.description,
        status: BrowserSessionStatus.INITIALIZING,
        profile: browserProfile,
        timeoutSeconds: createDto.timeoutSeconds || 600,
        enableScreenshots: createDto.enableScreenshots ?? true,
        enableVideoRecording: createDto.enableVideoRecording ?? false,
        enableNetworkLogging: createDto.enableNetworkLogging ?? true,
        enableConsoleLogging: createDto.enableConsoleLogging ?? true,
        tags: createDto.tags,
        createdAt: currentTime,
        lastActivity: currentTime,
        expiresAt: new Date(
          currentTime.getTime() + (createDto.timeoutSeconds || 600) * 1000,
        ),
        createdBy: 'system', // TODO: Get from auth context
        currentUrl: createDto.initialUrl,
        tabs: [],
        metrics: this.initializeSessionMetrics(),
        processId,
        config: createDto.config,
      };

      // Store session
      this.sessions.set(sessionId, sessionData);

      // Setup session timeout
      this.setupSessionTimeout(sessionId);

      // Navigate to initial URL if provided
      if (createDto.initialUrl) {
        await this.navigateToInitialUrl(sessionId, createDto.initialUrl);
      }

      // Update status to active
      sessionData.status = BrowserSessionStatus.ACTIVE;

      this.logger.log(`Browser session created successfully: ${sessionId}`);

      return this.mapToResponseDto(sessionData);
    } catch (error) {
      this.logger.error(
        `Failed to create browser session: ${sessionId}`,
        error,
      );

      // Cleanup on failure
      if (this.sessions.has(sessionId)) {
        this.cleanupSession(sessionId);
      }

      throw new ConflictException(
        `Failed to create browser session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<BrowserSessionResponseDto> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new NotFoundException(`Browser session not found: ${sessionId}`);
    }

    // Update session activity
    sessionData.lastActivity = new Date();

    // Refresh session data from browser process
    await this.refreshSessionData(sessionData);

    return this.mapToResponseDto(sessionData);
  }

  /**
   * List all sessions
   */
  async listSessions(
    filters: { active?: boolean } = {},
  ): Promise<BrowserSessionListResponseDto> {
    let sessions = Array.from(this.sessions.values());

    // Apply filters
    if (filters.active !== undefined) {
      const activeStatuses = [
        BrowserSessionStatus.ACTIVE,
        BrowserSessionStatus.IDLE,
      ];
      sessions = sessions.filter((session) =>
        filters.active
          ? activeStatuses.includes(session.status)
          : !activeStatuses.includes(session.status),
      );
    }

    // Refresh data for active sessions
    await Promise.all(
      sessions
        .filter((session) => session.status === BrowserSessionStatus.ACTIVE)
        .map((session) => this.refreshSessionData(session)),
    );

    const responseSessions = sessions.map((session) =>
      this.mapToResponseDto(session),
    );

    // Calculate summary statistics
    const summary = this.calculateSessionSummary(sessions);

    return {
      sessions: responseSessions,
      total: sessions.length,
      activeCount: sessions.filter(
        (s) => s.status === BrowserSessionStatus.ACTIVE,
      ).length,
      idleCount: sessions.filter((s) => s.status === BrowserSessionStatus.IDLE)
        .length,
      errorCount: sessions.filter(
        (s) => s.status === BrowserSessionStatus.ERROR,
      ).length,
      totalMemoryUsageMB: sessions.reduce(
        (total, s) => total + s.metrics.memoryUsageMB,
        0,
      ),
      summary,
    };
  }

  /**
   * Close a specific session
   */
  async closeSession(sessionId: string): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new NotFoundException(`Browser session not found: ${sessionId}`);
    }

    this.logger.log(`Closing browser session: ${sessionId}`);

    try {
      sessionData.status = BrowserSessionStatus.CLOSING;

      // Cleanup browser process
      if (sessionData.processId) {
        await this.browserUseService.cleanupProcess(sessionData.processId);
      }

      this.cleanupSession(sessionId);

      this.logger.log(`Browser session closed successfully: ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to close browser session: ${sessionId}`, error);
      sessionData.status = BrowserSessionStatus.ERROR;
      sessionData.error = {
        message: error instanceof Error ? error.message : 'Unknown close error',
        code: 'CLOSE_ERROR',
        timestamp: new Date(),
      };
      throw error;
    }
  }

  /**
   * Close all sessions
   */
  async closeAllSessions(): Promise<void> {
    this.logger.log('Closing all browser sessions');

    const sessionIds = Array.from(this.sessions.keys());
    const closePromises = sessionIds.map((sessionId) =>
      this.closeSession(sessionId).catch((error) =>
        this.logger.error(`Failed to close session ${sessionId}`, error),
      ),
    );

    await Promise.all(closePromises);

    this.logger.log('All browser sessions closed');
  }

  /**
   * Update session activity timestamp
   */
  updateSessionActivity(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (sessionData) {
      sessionData.lastActivity = new Date();

      // Reset timeout
      this.setupSessionTimeout(sessionId);
    }
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): BrowserSessionMetrics | null {
    const sessionData = this.sessions.get(sessionId);
    return sessionData ? sessionData.metrics : null;
  }

  /**
   * Navigate to initial URL after session creation
   */
  private async navigateToInitialUrl(
    sessionId: string,
    url: string,
  ): Promise<void> {
    try {
      const sessionData = this.sessions.get(sessionId);
      if (!sessionData || !sessionData.processId) {
        return;
      }

      // Send navigation command to browser process
      const navCommand: BrowserCommand = {
        action: 'navigate',
        url: url,
      };
      await this.browserUseService.sendCommand(
        sessionData.processId,
        navCommand,
      );

      sessionData.currentUrl = url;
      sessionData.lastActivity = new Date();
    } catch (error) {
      this.logger.warn(`Failed to navigate to initial URL: ${url}`, error);
    }
  }

  /**
   * Refresh session data from browser process
   */
  private async refreshSessionData(sessionData: SessionData): Promise<void> {
    if (!sessionData.processId) {
      return;
    }

    try {
      // Get current browser state
      const stateCommand: BrowserCommand = {
        action: 'get_state',
        include_tabs: true,
        include_metrics: true,
      };
      const browserState = (await this.browserUseService.sendCommand(
        sessionData.processId,
        stateCommand,
      )) as BrowserStateResponse;

      if (browserState.success) {
        // Update current URL and title
        sessionData.currentUrl = browserState.url;
        sessionData.currentTitle = browserState.title;

        // Update tabs information
        if (browserState.tabs) {
          sessionData.tabs = browserState.tabs.map((tab) => ({
            id: tab.id,
            title: tab.title || '',
            url: tab.url || '',
            active: tab.active || false,
            createdAt: new Date(tab.createdAt || Date.now()),
            lastActivity: new Date(tab.lastActivity || Date.now()),
            loadingStatus: tab.loadingStatus || 'complete',
          }));
        }

        // Update metrics
        if (browserState.metrics) {
          this.updateSessionMetrics(sessionData, browserState.metrics);
        }

        // Update status based on activity
        const timeSinceActivity =
          Date.now() - sessionData.lastActivity.getTime();
        if (timeSinceActivity > 300000) {
          // 5 minutes
          sessionData.status = BrowserSessionStatus.IDLE;
        } else {
          sessionData.status = BrowserSessionStatus.ACTIVE;
        }
      }
    } catch (error) {
      this.logger.debug(
        `Failed to refresh session _data: ${sessionData.id}`,
        error,
      );
      // Don't throw error - session might be in transition state
    }
  }

  /**
   * Update session metrics with new data
   */
  private updateSessionMetrics(
    sessionData: SessionData,
    metrics: BrowserStateResponse['metrics'],
  ): void {
    const currentTime = Date.now();
    const sessionDuration =
      (currentTime - sessionData.createdAt.getTime()) / 1000;

    sessionData.metrics = {
      totalDurationSeconds: sessionDuration,
      pagesVisited: metrics?.pagesVisited ?? sessionData.metrics.pagesVisited,
      actionsPerformed:
        metrics?.actionsPerformed ?? sessionData.metrics.actionsPerformed,
      screenshotsTaken:
        metrics?.screenshotsTaken ?? sessionData.metrics.screenshotsTaken,
      errorsEncountered:
        metrics?.errorsEncountered ?? sessionData.metrics.errorsEncountered,
      networkRequests:
        metrics?.networkRequests ?? sessionData.metrics.networkRequests,
      dataTransferredBytes:
        metrics?.dataTransferredBytes ??
        sessionData.metrics.dataTransferredBytes,
      averagePageLoadTime:
        metrics?.averagePageLoadTime ?? sessionData.metrics.averagePageLoadTime,
      memoryUsageMB:
        metrics?.memoryUsageMB ?? sessionData.metrics.memoryUsageMB,
      cpuUsagePercent:
        metrics?.cpuUsagePercent ?? sessionData.metrics.cpuUsagePercent,
    };
  }

  /**
   * Initialize session metrics
   */
  private initializeSessionMetrics(): BrowserSessionMetrics {
    return {
      totalDurationSeconds: 0,
      pagesVisited: 0,
      actionsPerformed: 0,
      screenshotsTaken: 0,
      errorsEncountered: 0,
      networkRequests: 0,
      dataTransferredBytes: 0,
      averagePageLoadTime: 0,
      memoryUsageMB: 0,
      cpuUsagePercent: 0,
    };
  }

  /**
   * Setup session timeout
   */
  private setupSessionTimeout(sessionId: string): void {
    // Clear existing timeout
    const existingTimeout = this.sessionTimeouts.get(sessionId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return;
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.logger.log(`Session timeout reached: ${sessionId}`);
      this.closeSession(sessionId).catch((error) =>
        this.logger.error(
          `Failed to close timed-out session: ${sessionId}`,
          error,
        ),
      );
    }, sessionData.timeoutSeconds * 1000);

    this.sessionTimeouts.set(sessionId, timeout);
  }

  /**
   * Cleanup session resources
   */
  private cleanupSession(sessionId: string): void {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return;
    }

    // Clear timeout
    const timeout = this.sessionTimeouts.get(sessionId);
    if (timeout) {
      clearTimeout(timeout);
      this.sessionTimeouts.delete(sessionId);
    }

    // Update final status
    sessionData.status = BrowserSessionStatus.CLOSED;

    // Remove from active sessions after delay (keep for history)
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000); // Keep for 1 minute for potential queries
  }

  /**
   * Calculate session summary statistics
   */
  private calculateSessionSummary(sessions: SessionData[]): SessionSummary {
    const activeSessions = sessions.filter(
      (s) => s.status === BrowserSessionStatus.ACTIVE,
    ).length;
    const idleSessions = sessions.filter(
      (s) => s.status === BrowserSessionStatus.IDLE,
    ).length;
    const closedSessions = sessions.filter(
      (s) => s.status === BrowserSessionStatus.CLOSED,
    ).length;

    const totalDuration = sessions.reduce(
      (total, s) => total + s.metrics.totalDurationSeconds,
      0,
    );
    const averageSessionDuration =
      sessions.length > 0 ? totalDuration / sessions.length : 0;

    const peakMemoryUsage = Math.max(
      ...sessions.map((s) => s.metrics.memoryUsageMB),
      0,
    );

    return {
      totalSessions: sessions.length,
      activeSessions,
      idleSessions,
      closedSessions,
      averageSessionDuration,
      peakMemoryUsage,
    };
  }

  /**
   * Map session data to response DTO
   */
  private mapToResponseDto(
    sessionData: SessionData,
  ): BrowserSessionResponseDto {
    return {
      id: sessionData.id,
      name: sessionData.name,
      description: sessionData.description,
      success: sessionData.status !== BrowserSessionStatus.ERROR,
      status: sessionData.status,
      profile: sessionData.profile,
      timeoutSeconds: sessionData.timeoutSeconds,
      enableScreenshots: sessionData.enableScreenshots,
      enableVideoRecording: sessionData.enableVideoRecording,
      enableNetworkLogging: sessionData.enableNetworkLogging,
      enableConsoleLogging: sessionData.enableConsoleLogging,
      tags: sessionData.tags,
      createdAt: sessionData.createdAt,
      lastActivity: sessionData.lastActivity,
      expiresAt: sessionData.expiresAt,
      createdBy: sessionData.createdBy,
      currentUrl: sessionData.currentUrl,
      currentTitle: sessionData.currentTitle,
      tabs: sessionData.tabs,
      activeTabsCount: sessionData.tabs.filter((tab) => tab.active).length,
      metrics: sessionData.metrics,
      processId: sessionData.processId,
      websocketUrl: sessionData.websocketUrl,
      config: sessionData.config,
      _error: sessionData.error,
    };
  }
}
