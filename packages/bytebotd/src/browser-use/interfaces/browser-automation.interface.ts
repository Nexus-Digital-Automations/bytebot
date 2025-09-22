/**
 * Comprehensive TypeScript interfaces for browser automation
 * Service Layer Implementation for Browser-Use API Endpoints
 */

// Core Browser Session Interface
export interface IBrowserSession {
  sessionId: string;
  browserId?: string;
  status: 'initializing' | 'active' | 'paused' | 'error' | 'destroyed';
  createdAt: Date;
  lastActivity: Date;
  config: IBrowserSessionConfig;
  metadata?: Record<string, any>;
}

// Browser Session Configuration
export interface IBrowserSessionConfig {
  headless?: boolean;
  width?: number;
  height?: number;
  userAgent?: string;
  timeout?: number;
  viewport?: {
    width: number;
    height: number;
  };
  browser?: 'chrome' | 'firefox' | 'safari' | 'edge';
  executablePath?: string;
  args?: string[];
  env?: Record<string, string>;
}

// Browser Task Interface
export interface IBrowserTask {
  taskId: string;
  sessionId: string;
  type: 'navigation' | 'interaction' | 'extraction' | 'automation' | 'screenshot';
  instruction: string;
  params?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: IBrowserTaskResult;
  error?: IBrowserError;
}

// Browser Task Result
export interface IBrowserTaskResult {
  success: boolean;
  data?: any;
  screenshot?: string; // Base64 encoded
  logs?: string[];
  metrics?: {
    duration: number;
    memoryUsage?: number;
    networkRequests?: number;
  };
  metadata?: Record<string, any>;
}

// Browser Interaction Interface
export interface IBrowserInteraction {
  type: 'click' | 'type' | 'select' | 'hover' | 'scroll' | 'wait' | 'navigate';
  selector?: string;
  value?: string | number | boolean;
  coordinates?: { x: number; y: number };
  options?: Record<string, any>;
  timeout?: number;
}

// DOM Element Interface
export interface IDOMElement {
  selector: string;
  tagName: string;
  text?: string;
  value?: string;
  attributes?: Record<string, string>;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  enabled: boolean;
}

// Browser Error Interface
export interface IBrowserError {
  code: string;
  message: string;
  stack?: string;
  context?: {
    sessionId?: string;
    taskId?: string;
    selector?: string;
    url?: string;
  };
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

// Python Integration Interfaces
export interface IPythonProcessResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  duration: number;
  pid?: number;
}

export interface IPythonBrowserUseCommand {
  command: string;
  args: string[];
  sessionId?: string;
  timeout?: number;
  workingDir?: string;
  env?: Record<string, string>;
}

// Service Response Interfaces
export interface IServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: IBrowserError;
  metadata?: {
    timestamp: Date;
    duration?: number;
    version?: string;
  };
}

// Browser Health Status
export interface IBrowserHealth {
  sessionId: string;
  healthy: boolean;
  status: string;
  lastPing: Date;
  responseTime: number;
  memoryUsage?: number;
  cpuUsage?: number;
  errors: IBrowserError[];
}

// Session Statistics
export interface ISessionStatistics {
  sessionId: string;
  tasksCompleted: number;
  tasksFailedCount: number;
  averageTaskDuration: number;
  totalMemoryUsage: number;
  totalCpuTime: number;
  uptime: number;
  lastActivity: Date;
}

// Browser Use Service Configuration
export interface IBrowserUseServiceConfig {
  pythonPath: string;
  browserUsePath: string;
  maxConcurrentSessions: number;
  sessionTimeout: number;
  taskTimeout: number;
  retryAttempts: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableMetrics: boolean;
  enableScreenshots: boolean;
}