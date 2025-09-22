/**
 * Documentation Analytics and Monitoring System
 *
 * This system provides comprehensive analytics, monitoring, and insights
 * for documentation usage, performance, user behavior, and quality metrics
 * across the entire AIgent platform documentation ecosystem.
 *
 * @fileoverview Documentation analytics and monitoring infrastructure
 * @version 1.0.0
 * @author Documentation Infrastructure Agent
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  projectName: string;
  analyticsEndpoint?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  mixpanelToken?: string;
  segmentWriteKey?: string;
  enableRealUserMonitoring: boolean;
  enableHeatmaps: boolean;
  enableSessionRecording: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
  enableFeedbackCollection: boolean;
  dataRetentionDays: number;
  samplingRate: number;
  privacyMode: boolean;
  customDimensions: CustomDimension[];
  conversionGoals: ConversionGoal[];
}

/**
 * Custom dimension for analytics
 */
export interface CustomDimension {
  name: string;
  scope: 'hit' | 'session' | 'user' | 'product';
  index: number;
  active: boolean;
}

/**
 * Conversion goal
 */
export interface ConversionGoal {
  id: string;
  name: string;
  type: 'destination' | 'duration' | 'pages_per_session' | 'event';
  value: number;
  conditions: GoalCondition[];
}

/**
 * Goal condition
 */
export interface GoalCondition {
  dimension: string;
  operator: 'equals' | 'contains' | 'regex' | 'greater_than' | 'less_than';
  value: string | number;
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
  eventId: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  customDimensions: Record<string, any>;
  pageData: PageData;
  userAgent: string;
  ipAddress: string;
  referrer: string;
  utm: UTMParameters;
}

/**
 * Page data
 */
export interface PageData {
  url: string;
  path: string;
  title: string;
  category: string;
  tags: string[];
  wordCount: number;
  readingTime: number;
  lastModified: Date;
  author: string;
  version: string;
}

/**
 * UTM parameters
 */
export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

/**
 * User session
 */
export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  pageViews: number;
  events: number;
  bounceRate: number;
  entryPage: string;
  exitPage?: string;
  deviceInfo: DeviceInfo;
  locationInfo: LocationInfo;
  referrerInfo: ReferrerInfo;
}

/**
 * Device information
 */
export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution: string;
  viewportSize: string;
  colorDepth: number;
  language: string;
  timezone: string;
}

/**
 * Location information
 */
export interface LocationInfo {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
}

/**
 * Referrer information
 */
export interface ReferrerInfo {
  type: 'direct' | 'search' | 'social' | 'email' | 'referral' | 'campaign';
  source: string;
  medium: string;
  campaign?: string;
  keyword?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  timestamp: Date;
  url: string;
  metrics: {
    // Core Web Vitals
    largestContentfulPaint: number;
    firstInputDelay: number;
    cumulativeLayoutShift: number;

    // Additional metrics
    firstContentfulPaint: number;
    timeToInteractive: number;
    totalBlockingTime: number;
    speedIndex: number;

    // Navigation timing
    domContentLoaded: number;
    loadComplete: number;

    // Resource timing
    totalResources: number;
    totalResourceSize: number;

    // User timing
    customTimings: Record<string, number>;
  };
}

/**
 * Search analytics
 */
export interface SearchAnalytics {
  searchId: string;
  sessionId: string;
  timestamp: Date;
  query: string;
  resultsCount: number;
  clickedResults: SearchClickResult[];
  refinements: SearchRefinement[];
  abandonmentTime?: number;
  successful: boolean;
}

/**
 * Search click result
 */
export interface SearchClickResult {
  position: number;
  url: string;
  title: string;
  clickTime: Date;
  dwellTime: number;
}

/**
 * Search refinement
 */
export interface SearchRefinement {
  originalQuery: string;
  refinedQuery: string;
  timestamp: Date;
  type: 'autocomplete' | 'suggestion' | 'filter' | 'manual';
}

/**
 * User feedback
 */
export interface UserFeedback {
  feedbackId: string;
  sessionId: string;
  userId?: string;
  timestamp: Date;
  pageUrl: string;
  type: 'rating' | 'comment' | 'bug_report' | 'suggestion';
  rating?: number;
  comment?: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  tags: string[];
  attachments: string[];
}

/**
 * Analytics report
 */
export interface AnalyticsReport {
  reportId: string;
  reportType: string;
  period: DateRange;
  generatedAt: Date;
  metrics: ReportMetrics;
  charts: ChartData[];
  insights: ReportInsight[];
  recommendations: ReportRecommendation[];
}

/**
 * Date range
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Report metrics
 */
export interface ReportMetrics {
  pageViews: number;
  uniqueUsers: number;
  sessions: number;
  bounceRate: number;
  averageSessionDuration: number;
  pagesPerSession: number;
  conversionRate: number;
  topPages: TopPageMetric[];
  topSearchQueries: TopSearchMetric[];
  userFlowPaths: UserFlowPath[];
}

/**
 * Top page metric
 */
export interface TopPageMetric {
  url: string;
  title: string;
  pageViews: number;
  uniqueUsers: number;
  averageTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
}

/**
 * Top search metric
 */
export interface TopSearchMetric {
  query: string;
  searchCount: number;
  resultsCount: number;
  clickThroughRate: number;
  successRate: number;
}

/**
 * User flow path
 */
export interface UserFlowPath {
  path: string[];
  userCount: number;
  conversionRate: number;
  dropoffPoints: DropoffPoint[];
}

/**
 * Dropoff point
 */
export interface DropoffPoint {
  step: number;
  page: string;
  dropoffRate: number;
  commonExitReasons: string[];
}

/**
 * Chart data
 */
export interface ChartData {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  data: ChartDataPoint[];
  xAxis: string;
  yAxis: string;
  series: ChartSeries[];
}

/**
 * Chart data point
 */
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Chart series
 */
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

/**
 * Report insight
 */
export interface ReportInsight {
  type: 'trend' | 'anomaly' | 'opportunity' | 'issue';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  evidence: InsightEvidence[];
  actions: string[];
}

/**
 * Insight evidence
 */
export interface InsightEvidence {
  metric: string;
  value: number;
  change: number;
  significance: number;
  period: DateRange;
}

/**
 * Report recommendation
 */
export interface ReportRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  category: string;
  actions: RecommendationAction[];
  expectedOutcome: string;
  successMetrics: string[];
}

/**
 * Recommendation action
 */
export interface RecommendationAction {
  action: string;
  description: string;
  effort: number; // hours
  priority: number;
  dependencies: string[];
}

/**
 * Default analytics configuration
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  projectName: 'AIgent Documentation',
  enableRealUserMonitoring: true,
  enableHeatmaps: true,
  enableSessionRecording: false, // Privacy consideration
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  enableFeedbackCollection: true,
  dataRetentionDays: 365,
  samplingRate: 1.0,
  privacyMode: false,
  customDimensions: [
    { name: 'Documentation Category', scope: 'hit', index: 1, active: true },
    { name: 'User Type', scope: 'session', index: 2, active: true },
    { name: 'Content Difficulty', scope: 'hit', index: 3, active: true },
  ],
  conversionGoals: [
    {
      id: 'tutorial_completion',
      name: 'Tutorial Completion',
      type: 'destination',
      value: 1,
      conditions: [
        { dimension: 'page', operator: 'contains', value: '/tutorial/complete' },
      ],
    },
    {
      id: 'api_docs_engagement',
      name: 'API Documentation Engagement',
      type: 'duration',
      value: 300, // 5 minutes
      conditions: [
        { dimension: 'page', operator: 'contains', value: '/api/' },
      ],
    },
  ],
};

/**
 * Documentation Analytics and Monitoring System
 *
 * Provides comprehensive analytics, performance monitoring, and insights
 * for documentation usage patterns and user behavior.
 */
export class DocumentationAnalyticsMonitor extends EventEmitter {
  private readonly logger = new Logger('DocumentationAnalyticsMonitor');
  private readonly config: AnalyticsConfig;
  private events: Map<string, AnalyticsEvent> = new Map();
  private sessions: Map<string, UserSession> = new Map();
  private performanceMetrics: PerformanceMetrics[] = [];
  private searchAnalytics: SearchAnalytics[] = [];
  private userFeedback: UserFeedback[] = [];
  private activeMonitoring: boolean = false;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
    this.logger.log('Initializing Documentation Analytics Monitor', {
      projectName: this.config.projectName,
      enableRUM: this.config.enableRealUserMonitoring,
    });
  }

  /**
   * Start analytics monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.activeMonitoring) {
      this.logger.warn('Analytics monitoring already active');
      return;
    }

    this.logger.log('Starting analytics monitoring');

    try {
      // Initialize analytics providers
      await this.initializeAnalyticsProviders();

      // Setup event collectors
      this.setupEventCollectors();

      // Setup performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        this.setupPerformanceMonitoring();
      }

      // Setup error tracking
      if (this.config.enableErrorTracking) {
        this.setupErrorTracking();
      }

      // Setup feedback collection
      if (this.config.enableFeedbackCollection) {
        this.setupFeedbackCollection();
      }

      // Start data processing
      this.startDataProcessing();

      this.activeMonitoring = true;
      this.emit('monitoring:started');

      this.logger.log('Analytics monitoring started successfully');

    } catch (error) {
      this.logger.error('Failed to start analytics monitoring', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Stop analytics monitoring
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.activeMonitoring) return;

    this.logger.log('Stopping analytics monitoring');

    // Flush pending data
    await this.flushPendingData();

    this.activeMonitoring = false;
    this.emit('monitoring:stopped');

    this.logger.log('Analytics monitoring stopped');
  }

  /**
   * Initialize analytics providers
   */
  private async initializeAnalyticsProviders(): Promise<void> {
    this.logger.log('Initializing analytics providers');

    // Google Analytics initialization
    if (this.config.googleAnalyticsId) {
      await this.initializeGoogleAnalytics();
    }

    // Google Tag Manager initialization
    if (this.config.googleTagManagerId) {
      await this.initializeGoogleTagManager();
    }

    // Custom analytics endpoint
    if (this.config.analyticsEndpoint) {
      await this.initializeCustomAnalytics();
    }
  }

  /**
   * Initialize Google Analytics
   */
  private async initializeGoogleAnalytics(): Promise<void> {
    this.logger.log('Initializing Google Analytics');

    const gaScript = `
// Google Analytics 4 Configuration
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());

gtag('config', '${this.config.googleAnalyticsId}', {
  // Custom dimensions
  ${this.config.customDimensions.map((dim, index) =>
    `custom_map.dimension${dim.index}: '${dim.name.toLowerCase().replace(/\s+/g, '_')}'`
  ).join(',\n  ')}
});

// Enhanced ecommerce tracking for documentation goals
gtag('config', '${this.config.googleAnalyticsId}', {
  enhanced_ecommerce: true,
  send_page_view: false // We'll send manually with custom data
});
`;

    await this.injectAnalyticsScript(gaScript, 'google-analytics');
  }

  /**
   * Initialize Google Tag Manager
   */
  private async initializeGoogleTagManager(): Promise<void> {
    this.logger.log('Initializing Google Tag Manager');

    const gtmScript = `
// Google Tag Manager
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${this.config.googleTagManagerId}');
`;

    await this.injectAnalyticsScript(gtmScript, 'google-tag-manager');
  }

  /**
   * Initialize custom analytics
   */
  private async initializeCustomAnalytics(): Promise<void> {
    this.logger.log('Initializing custom analytics');

    const customScript = `
// Custom Analytics Configuration
window.customAnalytics = {
  endpoint: '${this.config.analyticsEndpoint}',
  projectName: '${this.config.projectName}',
  enabled: true,

  // Track event
  track: function(event, properties) {
    if (!this.enabled) return;

    fetch(this.endpoint + '/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        project: this.projectName,
        event: event,
        properties: properties,
        timestamp: new Date().toISOString(),
        session_id: this.getSessionId(),
        user_id: this.getUserId()
      })
    }).catch(function(error) {
      console.warn('Analytics tracking failed:', error);
    });
  },

  // Get or create session ID
  getSessionId: function() {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  },

  // Get user ID (if available)
  getUserId: function() {
    return localStorage.getItem('analytics_user_id') || null;
  }
};
`;

    await this.injectAnalyticsScript(customScript, 'custom-analytics');
  }

  /**
   * Inject analytics script into documentation pages
   */
  private async injectAnalyticsScript(script: string, provider: string): Promise<void> {
    // This would be implemented to inject scripts into the documentation build
    // For now, we'll write the script to a file that can be included
    const scriptPath = path.join(process.cwd(), 'docs-build', 'assets', 'js', `analytics-${provider}.js`);
    await fs.ensureDir(path.dirname(scriptPath));
    await fs.writeFile(scriptPath, script);
  }

  /**
   * Setup event collectors
   */
  private setupEventCollectors(): void {
    this.logger.log('Setting up event collectors');

    // Page view tracking
    this.setupPageViewTracking();

    // Interaction tracking
    this.setupInteractionTracking();

    // Search tracking
    this.setupSearchTracking();

    // Download tracking
    this.setupDownloadTracking();

    // Outbound link tracking
    this.setupOutboundLinkTracking();
  }

  /**
   * Setup page view tracking
   */
  private setupPageViewTracking(): void {
    const pageViewScript = `
// Page View Tracking
(function() {
  // Track initial page view
  trackPageView();

  // Track SPA navigation
  let currentUrl = window.location.href;
  setInterval(function() {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      trackPageView();
    }
  }, 100);

  function trackPageView() {
    const pageData = {
      url: window.location.href,
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
      // Extract custom dimensions
      category: getPageCategory(),
      difficulty: getPageDifficulty(),
      readingTime: getEstimatedReadingTime(),
      wordCount: getWordCount()
    };

    // Send to analytics providers
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', pageData);
    }

    if (window.customAnalytics) {
      window.customAnalytics.track('page_view', pageData);
    }
  }

  function getPageCategory() {
    const path = window.location.pathname;
    if (path.includes('/api/')) return 'API Reference';
    if (path.includes('/tutorial/')) return 'Tutorial';
    if (path.includes('/guide/')) return 'Guide';
    if (path.includes('/examples/')) return 'Examples';
    return 'General';
  }

  function getPageDifficulty() {
    const difficulty = document.querySelector('[data-difficulty]');
    return difficulty ? difficulty.getAttribute('data-difficulty') : 'beginner';
  }

  function getEstimatedReadingTime() {
    const wordsPerMinute = 200;
    const wordCount = getWordCount();
    return Math.ceil(wordCount / wordsPerMinute);
  }

  function getWordCount() {
    const content = document.querySelector('.content-body, .markdown-body, main');
    if (!content) return 0;
    return content.textContent.trim().split(/\s+/).length;
  }
})();
`;

    this.injectAnalyticsScript(pageViewScript, 'page-tracking');
  }

  /**
   * Setup interaction tracking
   */
  private setupInteractionTracking(): void {
    const interactionScript = `
// Interaction Tracking
(function() {
  // Track button clicks
  document.addEventListener('click', function(event) {
    const target = event.target.closest('button, .btn, [role="button"]');
    if (target) {
      trackInteraction('button_click', {
        text: target.textContent.trim(),
        class: target.className,
        id: target.id || null
      });
    }
  });

  // Track link clicks
  document.addEventListener('click', function(event) {
    const target = event.target.closest('a');
    if (target && target.href) {
      trackInteraction('link_click', {
        url: target.href,
        text: target.textContent.trim(),
        external: !target.href.startsWith(window.location.origin)
      });
    }
  });

  // Track form submissions
  document.addEventListener('submit', function(event) {
    const form = event.target;
    trackInteraction('form_submit', {
      action: form.action || 'current_page',
      method: form.method || 'get',
      id: form.id || null
    });
  });

  // Track code copy events
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('copy-button')) {
      trackInteraction('code_copy', {
        language: getCodeBlockLanguage(event.target)
      });
    }
  });

  // Track scroll depth
  let maxScrollDepth = 0;
  window.addEventListener('scroll', throttle(function() {
    const scrollDepth = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );

    if (scrollDepth > maxScrollDepth && scrollDepth % 25 === 0) {
      maxScrollDepth = scrollDepth;
      trackInteraction('scroll_depth', {
        depth: scrollDepth,
        page: window.location.pathname
      });
    }
  }, 1000));

  function trackInteraction(action, properties) {
    const eventData = {
      action: action,
      category: 'interaction',
      ...properties,
      timestamp: new Date().toISOString()
    };

    if (typeof gtag !== 'undefined') {
      gtag('event', action, eventData);
    }

    if (window.customAnalytics) {
      window.customAnalytics.track(action, eventData);
    }
  }

  function getCodeBlockLanguage(button) {
    const codeBlock = button.closest('pre');
    if (!codeBlock) return 'unknown';

    const langClass = Array.from(codeBlock.classList)
      .find(cls => cls.startsWith('language-'));

    return langClass ? langClass.replace('language-', '') : 'unknown';
  }

  function throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  }
})();
`;

    this.injectAnalyticsScript(interactionScript, 'interaction-tracking');
  }

  /**
   * Setup search tracking
   */
  private setupSearchTracking(): void {
    const searchScript = `
// Search Tracking
(function() {
  const searchInput = document.querySelector('#search-input, .search-input, [data-search]');
  if (!searchInput) return;

  let searchStartTime;
  let currentQuery = '';

  // Track search start
  searchInput.addEventListener('focus', function() {
    searchStartTime = Date.now();
    trackSearchEvent('search_start', {
      input_method: 'click'
    });
  });

  // Track search queries
  searchInput.addEventListener('input', debounce(function(event) {
    const query = event.target.value.trim();
    if (query.length > 2 && query !== currentQuery) {
      currentQuery = query;
      trackSearchEvent('search_query', {
        query: query,
        query_length: query.length,
        time_since_start: searchStartTime ? Date.now() - searchStartTime : 0
      });
    }
  }, 500));

  // Track search results
  document.addEventListener('searchResults', function(event) {
    trackSearchEvent('search_results', {
      query: currentQuery,
      results_count: event.detail.count,
      results_shown: event.detail.shown,
      time_to_results: Date.now() - searchStartTime
    });
  });

  // Track search result clicks
  document.addEventListener('click', function(event) {
    const searchResult = event.target.closest('.search-result, [data-search-result]');
    if (searchResult) {
      const position = Array.from(searchResult.parentElement.children).indexOf(searchResult) + 1;
      trackSearchEvent('search_result_click', {
        query: currentQuery,
        position: position,
        url: searchResult.querySelector('a') ? searchResult.querySelector('a').href : null,
        title: searchResult.querySelector('h1, h2, h3, h4, .title') ?
               searchResult.querySelector('h1, h2, h3, h4, .title').textContent.trim() : null
      });
    }
  });

  function trackSearchEvent(action, properties) {
    const eventData = {
      action: action,
      category: 'search',
      ...properties,
      timestamp: new Date().toISOString()
    };

    if (typeof gtag !== 'undefined') {
      gtag('event', action, eventData);
    }

    if (window.customAnalytics) {
      window.customAnalytics.track(action, eventData);
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
})();
`;

    this.injectAnalyticsScript(searchScript, 'search-tracking');
  }

  /**
   * Setup download tracking
   */
  private setupDownloadTracking(): void {
    const downloadScript = `
// Download Tracking
(function() {
  document.addEventListener('click', function(event) {
    const target = event.target.closest('a[download], a[href*=".pdf"], a[href*=".zip"], a[href*=".tar"]');
    if (target) {
      const url = target.href;
      const fileName = target.download || url.split('/').pop();
      const fileExtension = fileName.split('.').pop();

      trackDownload({
        file_name: fileName,
        file_extension: fileExtension,
        file_url: url,
        link_text: target.textContent.trim(),
        page: window.location.pathname
      });
    }
  });

  function trackDownload(properties) {
    const eventData = {
      action: 'file_download',
      category: 'download',
      ...properties,
      timestamp: new Date().toISOString()
    };

    if (typeof gtag !== 'undefined') {
      gtag('event', 'file_download', eventData);
    }

    if (window.customAnalytics) {
      window.customAnalytics.track('file_download', eventData);
    }
  }
})();
`;

    this.injectAnalyticsScript(downloadScript, 'download-tracking');
  }

  /**
   * Setup outbound link tracking
   */
  private setupOutboundLinkTracking(): void {
    const outboundScript = `
// Outbound Link Tracking
(function() {
  document.addEventListener('click', function(event) {
    const target = event.target.closest('a');
    if (target && target.href && !target.href.startsWith(window.location.origin)) {
      trackOutboundLink({
        url: target.href,
        text: target.textContent.trim(),
        domain: new URL(target.href).hostname,
        page: window.location.pathname
      });
    }
  });

  function trackOutboundLink(properties) {
    const eventData = {
      action: 'outbound_link',
      category: 'navigation',
      ...properties,
      timestamp: new Date().toISOString()
    };

    if (typeof gtag !== 'undefined') {
      gtag('event', 'click', {
        event_category: 'outbound',
        event_label: properties.url,
        transport_type: 'beacon'
      });
    }

    if (window.customAnalytics) {
      window.customAnalytics.track('outbound_link', eventData);
    }
  }
})();
`;

    this.injectAnalyticsScript(outboundScript, 'outbound-tracking');
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    const performanceScript = `
// Performance Monitoring
(function() {
  // Wait for page to load
  window.addEventListener('load', function() {
    // Collect navigation timing
    setTimeout(collectNavigationTiming, 1000);

    // Collect Core Web Vitals
    collectCoreWebVitals();

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      observeLongTasks();
      observeLayoutShifts();
      observeLargestContentfulPaint();
    }
  });

  function collectNavigationTiming() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (!navigation) return;

    const timing = {
      dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
      tcp_connection: navigation.connectEnd - navigation.connectStart,
      tls_negotiation: navigation.requestStart - navigation.secureConnectionStart,
      request: navigation.responseStart - navigation.requestStart,
      response: navigation.responseEnd - navigation.responseStart,
      dom_processing: navigation.domContentLoadedEventStart - navigation.responseEnd,
      load_complete: navigation.loadEventEnd - navigation.loadEventStart,
      total_time: navigation.loadEventEnd - navigation.navigationStart
    };

    trackPerformance('navigation_timing', timing);
  }

  function collectCoreWebVitals() {
    // First Input Delay
    if ('PerformanceObserver' in window) {
      new PerformanceObserver(function(list) {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-input') {
            trackPerformance('first_input_delay', {
              value: entry.processingStart - entry.startTime,
              rating: entry.processingStart - entry.startTime < 100 ? 'good' :
                     entry.processingStart - entry.startTime < 300 ? 'needs_improvement' : 'poor'
            });
          }
        }
      }).observe({ type: 'first-input', buffered: true });
    }

    // Time to Interactive (approximation)
    setTimeout(function() {
      const interactive = performance.now();
      trackPerformance('time_to_interactive', {
        value: interactive,
        rating: interactive < 3800 ? 'good' : interactive < 7300 ? 'needs_improvement' : 'poor'
      });
    }, 5000);
  }

  function observeLongTasks() {
    new PerformanceObserver(function(list) {
      for (const entry of list.getEntries()) {
        trackPerformance('long_task', {
          duration: entry.duration,
          start_time: entry.startTime,
          attribution: entry.attribution ? entry.attribution.map(attr => attr.name) : []
        });
      }
    }).observe({ entryTypes: ['longtask'] });
  }

  function observeLayoutShifts() {
    let cumulativeLayoutShift = 0;

    new PerformanceObserver(function(list) {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          cumulativeLayoutShift += entry.value;
        }
      }

      trackPerformance('cumulative_layout_shift', {
        value: cumulativeLayoutShift,
        rating: cumulativeLayoutShift < 0.1 ? 'good' :
               cumulativeLayoutShift < 0.25 ? 'needs_improvement' : 'poor'
      });
    }).observe({ entryTypes: ['layout-shift'] });
  }

  function observeLargestContentfulPaint() {
    new PerformanceObserver(function(list) {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];

      trackPerformance('largest_contentful_paint', {
        value: lastEntry.startTime,
        element: lastEntry.element ? lastEntry.element.tagName : 'unknown',
        rating: lastEntry.startTime < 2500 ? 'good' :
               lastEntry.startTime < 4000 ? 'needs_improvement' : 'poor'
      });
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }

  function trackPerformance(metric, data) {
    const eventData = {
      action: metric,
      category: 'performance',
      page: window.location.pathname,
      ...data,
      timestamp: new Date().toISOString()
    };

    if (typeof gtag !== 'undefined') {
      gtag('event', metric, eventData);
    }

    if (window.customAnalytics) {
      window.customAnalytics.track(metric, eventData);
    }
  }
})();
`;

    this.injectAnalyticsScript(performanceScript, 'performance-monitoring');
  }

  /**
   * Setup error tracking
   */
  private setupErrorTracking(): void {
    const errorScript = `
// Error Tracking
(function() {
  // Global error handler
  window.addEventListener('error', function(event) {
    trackError({
      type: 'javascript_error',
      message: event.message,
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: event.error ? event.error.stack : null,
      user_agent: navigator.userAgent,
      url: window.location.href
    });
  });

  // Unhandled promise rejection handler
  window.addEventListener('unhandledrejection', function(event) {
    trackError({
      type: 'promise_rejection',
      message: event.reason ? event.reason.toString() : 'Unknown promise rejection',
      stack: event.reason && event.reason.stack ? event.reason.stack : null,
      user_agent: navigator.userAgent,
      url: window.location.href
    });
  });

  // Console error tracking
  const originalConsoleError = console.error;
  console.error = function(...args) {
    trackError({
      type: 'console_error',
      message: args.map(arg => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' '),
      user_agent: navigator.userAgent,
      url: window.location.href
    });
    originalConsoleError.apply(console, args);
  };

  // Resource loading errors
  document.addEventListener('error', function(event) {
    if (event.target !== window) {
      trackError({
        type: 'resource_error',
        element: event.target.tagName.toLowerCase(),
        source: event.target.src || event.target.href || 'unknown',
        message: 'Failed to load resource',
        user_agent: navigator.userAgent,
        url: window.location.href
      });
    }
  }, true);

  function trackError(errorData) {
    const eventData = {
      action: 'error',
      category: 'error',
      ...errorData,
      timestamp: new Date().toISOString(),
      session_id: getSessionId()
    };

    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: errorData.message,
        fatal: false
      });
    }

    if (window.customAnalytics) {
      window.customAnalytics.track('error', eventData);
    }
  }

  function getSessionId() {
    return sessionStorage.getItem('analytics_session_id') || 'unknown';
  }
})();
`;

    this.injectAnalyticsScript(errorScript, 'error-tracking');
  }

  /**
   * Setup feedback collection
   */
  private setupFeedbackCollection(): void {
    const feedbackScript = `
// Feedback Collection
(function() {
  // Track feedback submissions
  document.addEventListener('submit', function(event) {
    const form = event.target;
    if (form.classList.contains('feedback-form') || form.id === 'feedback-form') {
      const formData = new FormData(form);
      const feedback = {
        type: formData.get('type') || 'general',
        rating: formData.get('rating') || null,
        comment: formData.get('comment') || '',
        page: window.location.pathname,
        helpful: formData.get('helpful') || null,
        category: formData.get('category') || 'general'
      };

      trackFeedback(feedback);
    }
  });

  // Track helpful/not helpful button clicks
  document.addEventListener('click', function(event) {
    const target = event.target;
    if (target.classList.contains('btn-feedback') || target.dataset.feedback) {
      const helpful = target.dataset.helpful === 'true' || target.textContent.includes('👍');

      trackFeedback({
        type: 'helpful_rating',
        helpful: helpful,
        page: window.location.pathname,
        quick_feedback: true
      });
    }
  });

  function trackFeedback(feedbackData) {
    const eventData = {
      action: 'feedback_submitted',
      category: 'feedback',
      ...feedbackData,
      timestamp: new Date().toISOString(),
      session_id: getSessionId()
    };

    if (typeof gtag !== 'undefined') {
      gtag('event', 'feedback', eventData);
    }

    if (window.customAnalytics) {
      window.customAnalytics.track('feedback_submitted', eventData);
    }
  }

  function getSessionId() {
    return sessionStorage.getItem('analytics_session_id') || 'unknown';
  }
})();
`;

    this.injectAnalyticsScript(feedbackScript, 'feedback-collection');
  }

  /**
   * Start data processing
   */
  private startDataProcessing(): void {
    // Set up periodic data processing
    setInterval(() => {
      this.processAnalyticsData();
    }, 60000); // Process every minute

    // Set up daily report generation
    setInterval(() => {
      this.generateDailyReport();
    }, 24 * 60 * 60 * 1000); // Generate daily reports
  }

  /**
   * Process analytics data
   */
  private async processAnalyticsData(): Promise<void> {
    if (!this.activeMonitoring) return;

    try {
      // Process any pending events
      await this.processPendingEvents();

      // Update session data
      await this.updateSessionData();

      // Check for alerts
      await this.checkPerformanceAlerts();

    } catch (error) {
      this.logger.error('Failed to process analytics data', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Process pending events
   */
  private async processPendingEvents(): Promise<void> {
    // Implementation would process events from various sources
    // For now, this is a placeholder
  }

  /**
   * Update session data
   */
  private async updateSessionData(): Promise<void> {
    // Implementation would update active session information
    // For now, this is a placeholder
  }

  /**
   * Check performance alerts
   */
  private async checkPerformanceAlerts(): Promise<void> {
    // Implementation would check if performance metrics exceed thresholds
    // For now, this is a placeholder
  }

  /**
   * Generate daily report
   */
  private async generateDailyReport(): Promise<void> {
    this.logger.log('Generating daily analytics report');

    try {
      const report = await this.createAnalyticsReport('daily');
      await this.saveReport(report);

      this.emit('report:generated', report);

    } catch (error) {
      this.logger.error('Failed to generate daily report', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create analytics report
   */
  public async createAnalyticsReport(period: 'daily' | 'weekly' | 'monthly'): Promise<AnalyticsReport> {
    const reportId = this.generateReportId();
    const dateRange = this.getDateRange(period);

    const report: AnalyticsReport = {
      reportId,
      reportType: period,
      period: dateRange,
      generatedAt: new Date(),
      metrics: await this.calculateReportMetrics(dateRange),
      charts: await this.generateChartData(dateRange),
      insights: await this.generateInsights(dateRange),
      recommendations: await this.generateRecommendations(),
    };

    return report;
  }

  /**
   * Calculate report metrics
   */
  private async calculateReportMetrics(dateRange: DateRange): Promise<ReportMetrics> {
    // This would calculate actual metrics from stored data
    // For now, returning placeholder data
    return {
      pageViews: 10000,
      uniqueUsers: 2500,
      sessions: 3000,
      bounceRate: 0.45,
      averageSessionDuration: 240,
      pagesPerSession: 2.8,
      conversionRate: 0.05,
      topPages: [],
      topSearchQueries: [],
      userFlowPaths: [],
    };
  }

  /**
   * Generate chart data
   */
  private async generateChartData(dateRange: DateRange): Promise<ChartData[]> {
    // This would generate actual chart data from analytics
    // For now, returning placeholder data
    return [
      {
        title: 'Page Views Over Time',
        type: 'line',
        data: [],
        xAxis: 'Date',
        yAxis: 'Page Views',
        series: [
          {
            name: 'Page Views',
            data: [
              { x: '2024-01-01', y: 500 },
              { x: '2024-01-02', y: 600 },
              { x: '2024-01-03', y: 550 },
            ],
          },
        ],
      },
    ];
  }

  /**
   * Generate insights
   */
  private async generateInsights(dateRange: DateRange): Promise<ReportInsight[]> {
    // This would analyze data to generate insights
    // For now, returning placeholder data
    return [
      {
        type: 'trend',
        title: 'Increasing Mobile Usage',
        description: 'Mobile traffic has increased by 15% this week',
        impact: 'medium',
        confidence: 0.85,
        evidence: [],
        actions: ['Optimize mobile experience', 'Test mobile performance'],
      },
    ];
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(): Promise<ReportRecommendation[]> {
    // This would generate actionable recommendations
    // For now, returning placeholder data
    return [
      {
        id: 'improve-search',
        title: 'Improve Search Experience',
        description: 'Search queries have low success rate',
        priority: 'high',
        effort: 'medium',
        impact: 'high',
        category: 'user_experience',
        actions: [
          {
            action: 'Implement autocomplete',
            description: 'Add search autocomplete functionality',
            effort: 8,
            priority: 1,
            dependencies: [],
          },
        ],
        expectedOutcome: 'Increase search success rate by 20%',
        successMetrics: ['Search success rate', 'Time to find content'],
      },
    ];
  }

  /**
   * Save report
   */
  private async saveReport(report: AnalyticsReport): Promise<void> {
    const reportPath = path.join(
      process.cwd(),
      'analytics-reports',
      `${report.reportType}-${report.reportId}.json`
    );

    await fs.ensureDir(path.dirname(reportPath));
    await fs.writeJson(reportPath, report, { spaces: 2 });

    this.logger.log(`Analytics report saved: ${reportPath}`);
  }

  /**
   * Flush pending data
   */
  private async flushPendingData(): Promise<void> {
    this.logger.log('Flushing pending analytics data');
    // Implementation would flush any pending data to storage/external services
  }

  /**
   * Get date range for report period
   */
  private getDateRange(period: string): DateRange {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'daily':
        start.setDate(end.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(end.getDate() - 7);
        break;
      case 'monthly':
        start.setDate(end.getDate() - 30);
        break;
    }

    return { start, end };
  }

  /**
   * Generate report ID
   */
  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get analytics summary
   */
  public getAnalyticsSummary(): any {
    return {
      activeMonitoring: this.activeMonitoring,
      totalEvents: this.events.size,
      totalSessions: this.sessions.size,
      performanceMetricsCount: this.performanceMetrics.length,
      searchAnalyticsCount: this.searchAnalytics.length,
      feedbackCount: this.userFeedback.length,
      config: {
        projectName: this.config.projectName,
        enableRUM: this.config.enableRealUserMonitoring,
        enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
        enableErrorTracking: this.config.enableErrorTracking,
      },
    };
  }
}

export default {
  DocumentationAnalyticsMonitor,
  DEFAULT_ANALYTICS_CONFIG,
};