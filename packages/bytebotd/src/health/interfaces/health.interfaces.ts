/**
 * Health Service Type Definitions
 *
 * Complete type definitions for health monitoring, service status,
 * performance metrics, and health response interfaces.
 *
 * @author Claude Code
 * @version 1.0.0
 */

/**
 * Basic health response interface
 */
export interface BasicHealthResponse {
  status: 'healthy' | 'unhealthy';timestamp: string;uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
  };
}

/**
 * Detailed status response interface
 */
export interface DetailedStatusResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';timestamp: string;uptime: number;
  memory: {
    used: number;
    free: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
  };
  services: {
    database: 'connected' | 'disconnected' | 'unknown';cache: 'available' | 'unavailable' | 'unknown';external: 'reachable' | 'unreachable' | 'unknown';};performance: {
    requestsPerSecond: number;
    averageResponseTime: number;
  };
}

/**
 * Health check response for services
 */
export interface ServiceHealthResponse {
  status: string;
  responseTime?: string;
  error?: string;
}

/**
 * External service check result
 */
export interface ExternalServiceResult {
  status: string;
  responseTime?: string;
  error?: string;
}

/**
 * Module initialization status
 */
export interface ModuleStatus {
  [moduleName: string]: boolean;
}

/**
 * Service health check results
 */
export interface ServiceHealthResults {
  [serviceName: string]: ServiceHealthResponse;
}

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  requestsPerSecond: number;
  averageResponseTime: number;
}

/**
 * Service status map interface
 */
export interface ServiceStatusMap {
  database: 'connected' | 'disconnected' | 'unknown';cache: 'available' | 'unavailable' | 'unknown';external: 'reachable' | 'unreachable' | 'unknown';
}

/**
 * Memory usage information interface
 */
export interface MemoryInfo {
  used: number;
  free: number;
  total: number;
  heapUsed?: number;
  heapTotal?: number;
}
