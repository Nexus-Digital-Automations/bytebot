/**
 * PARLANT Enterprise Error Handling Framework
 *
 * Comprehensive error handling system with intelligent recovery, conversational guidance,
 * and enterprise-grade monitoring for PARLANT Bytebot integration.
 *
 * Features:
 * - AI-powered error classification and categorization
 * - Multi-stage intelligent error recovery
 * - Conversational error communication with natural language
 * - Comprehensive audit trail with forensic capabilities
 * - Real-time performance monitoring and pattern analysis
 * - Enterprise visualization dashboards
 * - Graceful degradation strategies
 *
 * @version 2.0.0
 * @author PARLANT Enterprise Security Framework Team
 */

// Core Framework Components
export * from "./core/error-classifier";
export * from "./core/error-registry";
export * from "./core/error-context";
export * from "./core/error-patterns";

// Recovery System
export * from "./recovery/recovery-engine";
export * from "./recovery/recovery-strategies";
export * from "./recovery/fallback-manager";
export * from "./recovery/circuit-breaker";

// Communication System
export * from "./communication/conversational-error-communicator";
export * from "./communication/natural-language-generator";
export * from "./communication/guidance-engine";
export * from "./communication/help-system";

// Monitoring & Analytics
export * from "./monitoring/performance-monitor";
export * from "./monitoring/pattern-analyzer";
export * from "./monitoring/metrics-collector";
export * from "./monitoring/alerting-system";

// Audit & Forensics
export * from "./audit/audit-trail-manager";
export * from "./audit/forensic-analyzer";
export * from "./audit/compliance-reporter";
export * from "./audit/evidence-collector";

// Dashboards & Visualization
export * from "./dashboard/error-dashboard";
export * from "./dashboard/metrics-visualizer";
export * from "./dashboard/real-time-monitor";
export * from "./dashboard/executive-summary";

// Integration Components
export * from "./integration/bytebot-integration";
export * from "./integration/parlant-bridge";
export * from "./integration/api-error-handler";
export * from "./integration/middleware-connector";

// Configuration & Types
export * from "./config/error-config";
export * from "./types/error-types";
export * from "./types/recovery-types";
export * from "./types/monitoring-types";
export * from "./types/dashboard-types";

// Enhanced Error Filter (extends existing)
export * from "./enhanced-error-filter";
