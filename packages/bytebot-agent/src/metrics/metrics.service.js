"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MetricsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
const uuid_1 = require("uuid");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
let MetricsService = MetricsService_1 = class MetricsService {
    eventEmitter;
    config;
    logger = new common_1.Logger(MetricsService_1.name);
    registry;
    httpRequestsTotal;
    httpRequestDuration;
    httpRequestsInFlight;
    taskProcessingDuration;
    taskProcessingTotal;
    tasksInProgress;
    taskQueueSize;
    computerUseOperationsTotal;
    computerUseOperationDuration;
    computerUseErrors;
    aneProcessingDuration;
    websocketConnections;
    websocketMessages;
    websocketErrors;
    databaseConnections;
    databaseQueryDuration;
    databaseErrors;
    authenticationAttempts;
    authenticationDuration;
    activeUserSessions;
    authenticationFailures;
    sessionDuration;
    authorizationChecks;
    authorizationDuration;
    accessDenials;
    privilegeEscalations;
    rateLimitHits;
    rateLimitBypass;
    throttledRequests;
    rateLimitWindowUtilization;
    securityEvents;
    threatDetections;
    vulnerabilityScans;
    complianceChecks;
    tracingSpans;
    tracingErrors;
    logEvents;
    alertsTriggered;
    userInteractions;
    featureUsage;
    businessProcessDuration;
    revenueMetrics;
    memoryUsage;
    cpuUsage;
    diskUsage;
    applicationErrors;
    errorsByCategory;
    apiRequestsRate;
    taskSuccessRate;
    systemHealth;
    constructor(eventEmitter, config) {
        this.eventEmitter = eventEmitter;
        this.config = config;
        this.logger.log('Prometheus Metrics Service initializing');
        this.registry = prom_client_1.register;
        (0, prom_client_1.collectDefaultMetrics)({
            prefix: 'bytebot_agent_',
            gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
            register: this.registry,
        });
        this.httpRequestsTotal = new prom_client_1.Counter({
            name: 'bytebot_agent_http_requests_total',
            help: 'Total number of HTTP requests processed',
            labelNames: ['method', 'route', 'status_code', 'user_id'],
            registers: [this.registry],
        });
        this.httpRequestDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'route', 'status_code'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });
        this.httpRequestsInFlight = new prom_client_1.Gauge({
            name: 'bytebot_agent_http_requests_in_flight',
            help: 'Number of HTTP requests currently being processed',
            labelNames: ['method', 'route'],
            registers: [this.registry],
        });
        this.taskProcessingDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_task_processing_duration_seconds',
            help: 'Task processing duration in seconds',
            labelNames: ['task_type', 'status', 'user_id'],
            buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300, 600],
            registers: [this.registry],
        });
        this.taskProcessingTotal = new prom_client_1.Counter({
            name: 'bytebot_agent_tasks_total',
            help: 'Total number of processed tasks',
            labelNames: ['task_type', 'status', 'user_id'],
            registers: [this.registry],
        });
        this.tasksInProgress = new prom_client_1.Gauge({
            name: 'bytebot_agent_tasks_in_progress',
            help: 'Number of tasks currently being processed',
            labelNames: ['task_type', 'user_id'],
            registers: [this.registry],
        });
        this.taskQueueSize = new prom_client_1.Gauge({
            name: 'bytebot_agent_task_queue_size',
            help: 'Number of tasks waiting in queue',
            labelNames: ['priority'],
            registers: [this.registry],
        });
        this.computerUseOperationsTotal = new prom_client_1.Counter({
            name: 'bytebot_agent_computer_operations_total',
            help: 'Total number of computer-use operations',
            labelNames: ['operation_type', 'status', 'user_id'],
            registers: [this.registry],
        });
        this.computerUseOperationDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_computer_operations_duration_seconds',
            help: 'Computer-use operation duration in seconds',
            labelNames: ['operation_type', 'status'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
            registers: [this.registry],
        });
        this.computerUseErrors = new prom_client_1.Counter({
            name: 'bytebot_agent_computer_use_errors_total',
            help: 'Total number of computer-use operation errors',
            labelNames: ['operation_type', 'error_type'],
            registers: [this.registry],
        });
        this.aneProcessingDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_ane_processing_duration_seconds',
            labelNames: ['operation_type', 'status'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.2, 0.5, 1],
            registers: [this.registry],
        });
        this.websocketConnections = new prom_client_1.Gauge({
            name: 'bytebot_agent_websocket_connections_active',
            help: 'Number of active WebSocket connections',
            labelNames: ['connection_type', 'user_id'],
            registers: [this.registry],
        });
        this.websocketMessages = new prom_client_1.Counter({
            name: 'bytebot_agent_websocket_messages_total',
            help: 'Total number of WebSocket messages',
            labelNames: ['direction', 'message_type', 'user_id'],
            registers: [this.registry],
        });
        this.websocketErrors = new prom_client_1.Counter({
            name: 'bytebot_agent_websocket_errors_total',
            help: 'Total number of WebSocket errors',
            labelNames: ['error_type', 'connection_type'],
            registers: [this.registry],
        });
        this.databaseConnections = new prom_client_1.Gauge({
            name: 'bytebot_agent_database_connections',
            help: 'Number of database connections',
            labelNames: ['database', 'state'],
            registers: [this.registry],
        });
        this.databaseQueryDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_database_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['operation', 'table', 'status'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
            registers: [this.registry],
        });
        this.databaseErrors = new prom_client_1.Counter({
            name: 'bytebot_agent_database_errors_total',
            help: 'Total number of database errors',
            labelNames: ['operation', 'error_type', 'table'],
            registers: [this.registry],
        });
        this.authenticationAttempts = new prom_client_1.Counter({
            name: 'bytebot_agent_auth_attempts_total',
            help: 'Total number of authentication attempts',
            labelNames: ['method', 'status', 'user_agent'],
            registers: [this.registry],
        });
        this.authenticationDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_auth_duration_seconds',
            help: 'Authentication operation duration in seconds',
            labelNames: ['method', 'status'],
            buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
            registers: [this.registry],
        });
        this.activeUserSessions = new prom_client_1.Gauge({
            name: 'bytebot_agent_active_user_sessions',
            help: 'Number of active user sessions',
            labelNames: ['session_type'],
            registers: [this.registry],
        });
        this.authenticationFailures = new prom_client_1.Counter({
            name: 'bytebot_agent_auth_failures_total',
            help: 'Total number of authentication failures',
            labelNames: ['method', 'reason', 'user_agent'],
            registers: [this.registry],
        });
        this.sessionDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_session_duration_seconds',
            help: 'User session duration in seconds',
            labelNames: ['session_type', 'termination_reason'],
            buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800],
            registers: [this.registry],
        });
        this.authorizationChecks = new prom_client_1.Counter({
            name: 'bytebot_agent_authorization_checks_total',
            help: 'Total number of authorization checks',
            labelNames: ['resource', 'action', 'result'],
            registers: [this.registry],
        });
        this.authorizationDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_authorization_duration_seconds',
            help: 'Authorization check duration in seconds',
            labelNames: ['resource', 'action'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
            registers: [this.registry],
        });
        this.accessDenials = new prom_client_1.Counter({
            name: 'bytebot_agent_access_denials_total',
            help: 'Total number of access denials',
            labelNames: ['resource', 'reason', 'user_role'],
            registers: [this.registry],
        });
        this.privilegeEscalations = new prom_client_1.Counter({
            name: 'bytebot_agent_privilege_escalations_total',
            help: 'Total number of privilege escalation attempts',
            labelNames: ['user_role', 'target_role', 'result'],
            registers: [this.registry],
        });
        this.rateLimitHits = new prom_client_1.Counter({
            name: 'bytebot_agent_rate_limit_hits_total',
            help: 'Total number of rate limit hits',
            labelNames: ['endpoint', 'limit_type', 'user_id'],
            registers: [this.registry],
        });
        this.rateLimitBypass = new prom_client_1.Counter({
            name: 'bytebot_agent_rate_limit_bypass_total',
            help: 'Total number of rate limit bypass attempts',
            labelNames: ['endpoint', 'method', 'source_ip'],
            registers: [this.registry],
        });
        this.throttledRequests = new prom_client_1.Counter({
            name: 'bytebot_agent_throttled_requests_total',
            help: 'Total number of throttled requests',
            labelNames: ['endpoint', 'throttle_type'],
            registers: [this.registry],
        });
        this.rateLimitWindowUtilization = new prom_client_1.Gauge({
            name: 'bytebot_agent_rate_limit_window_utilization',
            help: 'Current rate limit window utilization percentage',
            labelNames: ['endpoint', 'window_duration'],
            registers: [this.registry],
        });
        this.securityEvents = new prom_client_1.Counter({
            name: 'bytebot_agent_security_events_total',
            help: 'Total number of security events',
            labelNames: ['event_type', 'severity', 'source'],
            registers: [this.registry],
        });
        this.threatDetections = new prom_client_1.Counter({
            name: 'bytebot_agent_threat_detections_total',
            help: 'Total number of threat detections',
            labelNames: ['threat_type', 'confidence', 'mitigation'],
            registers: [this.registry],
        });
        this.vulnerabilityScans = new prom_client_1.Counter({
            name: 'bytebot_agent_vulnerability_scans_total',
            help: 'Total number of vulnerability scans',
            labelNames: ['scan_type', 'result', 'severity'],
            registers: [this.registry],
        });
        this.complianceChecks = new prom_client_1.Counter({
            name: 'bytebot_agent_compliance_checks_total',
            help: 'Total number of compliance checks',
            labelNames: ['framework', 'control', 'result'],
            registers: [this.registry],
        });
        this.tracingSpans = new prom_client_1.Counter({
            name: 'bytebot_agent_tracing_spans_total',
            help: 'Total number of tracing spans',
            labelNames: ['service', 'operation', 'status'],
            registers: [this.registry],
        });
        this.tracingErrors = new prom_client_1.Counter({
            name: 'bytebot_agent_tracing_errors_total',
            help: 'Total number of tracing errors',
            labelNames: ['service', 'error_type'],
            registers: [this.registry],
        });
        this.logEvents = new prom_client_1.Counter({
            name: 'bytebot_agent_log_events_total',
            help: 'Total number of log events',
            labelNames: ['level', 'component', 'correlation_id'],
            registers: [this.registry],
        });
        this.alertsTriggered = new prom_client_1.Counter({
            name: 'bytebot_agent_alerts_triggered_total',
            help: 'Total number of alerts triggered',
            labelNames: ['alert_type', 'severity', 'channel'],
            registers: [this.registry],
        });
        this.userInteractions = new prom_client_1.Counter({
            name: 'bytebot_agent_user_interactions_total',
            help: 'Total number of user interactions',
            labelNames: ['interaction_type', 'feature', 'user_segment'],
            registers: [this.registry],
        });
        this.featureUsage = new prom_client_1.Counter({
            name: 'bytebot_agent_feature_usage_total',
            help: 'Total feature usage count',
            labelNames: ['feature', 'version', 'user_type'],
            registers: [this.registry],
        });
        this.businessProcessDuration = new prom_client_1.Histogram({
            name: 'bytebot_agent_business_process_duration_seconds',
            help: 'Business process completion time in seconds',
            labelNames: ['process_name', 'process_version', 'result'],
            buckets: [0.5, 1, 2, 5, 10, 30, 60, 300, 600, 1800],
            registers: [this.registry],
        });
        this.revenueMetrics = new prom_client_1.Gauge({
            name: 'bytebot_agent_revenue_metrics',
            help: 'Revenue-related metrics',
            labelNames: ['metric_type', 'currency', 'period'],
            registers: [this.registry],
        });
        this.memoryUsage = new prom_client_1.Gauge({
            name: 'bytebot_agent_memory_usage_bytes',
            help: 'Memory usage in bytes',
            labelNames: ['type'],
            registers: [this.registry],
        });
        this.cpuUsage = new prom_client_1.Gauge({
            name: 'bytebot_agent_cpu_usage_percent',
            help: 'CPU usage percentage',
            registers: [this.registry],
        });
        this.diskUsage = new prom_client_1.Gauge({
            name: 'bytebot_agent_disk_usage_bytes',
            help: 'Disk usage in bytes',
            labelNames: ['mount_point'],
            registers: [this.registry],
        });
        this.applicationErrors = new prom_client_1.Counter({
            name: 'bytebot_agent_errors_total',
            help: 'Total number of application errors',
            labelNames: ['error_type', 'severity', 'component'],
            registers: [this.registry],
        });
        this.errorsByCategory = new prom_client_1.Counter({
            name: 'bytebot_agent_errors_by_category_total',
            help: 'Total number of errors by category',
            labelNames: ['category', 'subcategory'],
            registers: [this.registry],
        });
        this.apiRequestsRate = new prom_client_1.Gauge({
            name: 'bytebot_agent_api_requests_per_second',
            help: 'API requests per second',
            registers: [this.registry],
        });
        this.taskSuccessRate = new prom_client_1.Gauge({
            name: 'bytebot_agent_task_success_rate',
            help: 'Task success rate percentage',
            labelNames: ['task_type'],
            registers: [this.registry],
        });
        this.systemHealth = new prom_client_1.Gauge({
            name: 'bytebot_agent_system_health_score',
            help: 'Overall system health score (0-1)',
            registers: [this.registry],
        });
        this.startPeriodicCollection();
        this.logger.log('Prometheus Metrics Service initialized - All metrics registered');
        this.logger.log('📊 Metrics available at: /metrics endpoint');
    }
    async getPrometheusMetrics() {
        const operationId = `metrics_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
        this.logger.debug(`[${operationId}] Collecting Prometheus metrics`);
        try {
            this.updateSystemMetrics();
            const metrics = await this.registry.metrics();
            this.logger.debug(`[${operationId}] Prometheus metrics collected successfully`, {
                metricsLength: metrics.length,
            });
            return metrics;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`[${operationId}] Failed to collect Prometheus metrics: ${errorMessage}`, {
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
    }
    recordApiRequest(method, route, statusCode, duration, userId) {
        const durationSeconds = duration / 1000;
        this.httpRequestsTotal
            .labels(method, route, statusCode.toString(), userId || 'anonymous')
            .inc();
        this.httpRequestDuration
            .labels(method, route, statusCode.toString())
            .observe(durationSeconds);
        this.logger.debug('API request metrics recorded', {
            method,
            route,
            statusCode,
            durationMs: duration,
            userId,
        });
    }
    recordRequestStart(method, route) {
        this.httpRequestsInFlight.labels(method, route).inc();
    }
    recordRequestEnd(method, route) {
        this.httpRequestsInFlight.labels(method, route).dec();
    }
    recordTaskProcessing(taskType, status, duration, userId) {
        const durationSeconds = duration / 1000;
        this.taskProcessingTotal.labels(taskType, status, userId || 'system').inc();
        this.taskProcessingDuration
            .labels(taskType, status, userId || 'system')
            .observe(durationSeconds);
        this.logger.debug('Task processing metrics recorded', {
            taskType,
            status,
            durationMs: duration,
            userId,
        });
    }
    setTasksInProgress(taskType, count, userId) {
        this.tasksInProgress.labels(taskType, userId || 'system').set(count);
    }
    setTaskQueueSize(priority, size) {
        this.taskQueueSize.labels(priority).set(size);
    }
    recordComputerUseOperation(operationType, status, duration, userId) {
        const durationSeconds = duration / 1000;
        this.computerUseOperationsTotal
            .labels(operationType, status, userId || 'system')
            .inc();
        this.computerUseOperationDuration
            .labels(operationType, status)
            .observe(durationSeconds);
        this.logger.debug('Computer-use operation metrics recorded', {
            operationType,
            status,
            durationMs: duration,
            userId,
        });
    }
    recordANEProcessing(operationType, status, duration) {
        const durationSeconds = duration / 1000;
        this.aneProcessingDuration
            .labels(operationType, status)
            .observe(durationSeconds);
        this.logger.debug('ANE processing metrics recorded', {
            operationType,
            status,
            durationMs: duration,
        });
    }
    recordComputerUseError(operationType, errorType) {
        this.computerUseErrors.labels(operationType, errorType).inc();
        this.logger.debug('Computer-use error recorded', {
            operationType,
            errorType,
        });
    }
    setWebSocketConnections(connectionType, count, userId) {
        this.websocketConnections
            .labels(connectionType, userId || 'anonymous')
            .set(count);
    }
    recordWebSocketMessage(direction, messageType, userId) {
        this.websocketMessages
            .labels(direction, messageType, userId || 'anonymous')
            .inc();
    }
    recordWebSocketError(errorType, connectionType) {
        this.websocketErrors.labels(errorType, connectionType).inc();
    }
    setDatabaseConnections(database, state, count) {
        this.databaseConnections.labels(database, state).set(count);
    }
    recordDatabaseQuery(operation, table, duration, status = 'success') {
        const durationSeconds = duration / 1000;
        this.databaseQueryDuration
            .labels(operation, table, status)
            .observe(durationSeconds);
        this.logger.debug('Database query metrics recorded', {
            operation,
            table,
            durationMs: duration,
            status,
        });
    }
    recordDatabaseError(operation, errorType, table) {
        this.databaseErrors.labels(operation, errorType, table || 'unknown').inc();
        this.logger.debug('Database error recorded', {
            operation,
            errorType,
            table,
        });
    }
    recordAuthAttempt(method, status, duration, userAgent) {
        const durationSeconds = duration / 1000;
        this.authenticationAttempts
            .labels(method, status, userAgent || 'unknown')
            .inc();
        this.authenticationDuration.labels(method, status).observe(durationSeconds);
        this.logger.debug('Authentication metrics recorded', {
            method,
            status,
            durationMs: duration,
        });
    }
    setActiveUserSessions(sessionType, count) {
        this.activeUserSessions.labels(sessionType).set(count);
    }
    recordApplicationError(errorType, severity, component) {
        this.applicationErrors.labels(errorType, severity, component).inc();
        this.logger.debug('Application error recorded', {
            errorType,
            severity,
            component,
        });
    }
    recordErrorByCategory(category, subcategory) {
        this.errorsByCategory.labels(category, subcategory).inc();
    }
    updateBusinessMetrics(requestsPerSecond, taskSuccessRates) {
        this.apiRequestsRate.set(requestsPerSecond);
        Object.entries(taskSuccessRates).forEach(([taskType, rate]) => {
            this.taskSuccessRate.labels(taskType).set(rate);
        });
    }
    setSystemHealthScore(score) {
        this.systemHealth.set(Math.max(0, Math.min(1, score)));
    }
    startPeriodicCollection() {
        this.logger.debug('Starting periodic system metrics collection');
        setInterval(() => {
            this.updateSystemMetrics();
        }, 30000);
        setInterval(() => {
            this.updateBusinessMetrics(0, {});
        }, 60000);
    }
    updateSystemMetrics() {
        try {
            const memoryUsage = process.memoryUsage();
            this.memoryUsage.labels('rss').set(memoryUsage.rss);
            this.memoryUsage.labels('heapTotal').set(memoryUsage.heapTotal);
            this.memoryUsage.labels('heapUsed').set(memoryUsage.heapUsed);
            this.memoryUsage.labels('external').set(memoryUsage.external);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to update system metrics: ${errorMessage}`);
        }
    }
    recordAuthFailure(method, reason, userAgent) {
        this.authenticationFailures
            .labels(method, reason, userAgent || 'unknown')
            .inc();
        this.logger.debug('Authentication failure recorded', {
            method,
            reason,
            userAgent,
        });
    }
    recordSessionDuration(sessionType, duration, terminationReason) {
        const durationSeconds = duration / 1000;
        this.sessionDuration
            .labels(sessionType, terminationReason)
            .observe(durationSeconds);
        this.logger.debug('Session duration recorded', {
            sessionType,
            durationMs: duration,
            terminationReason,
        });
    }
    recordAuthorizationCheck(resource, action, result, duration) {
        const durationSeconds = duration / 1000;
        this.authorizationChecks.labels(resource, action, result).inc();
        this.authorizationDuration
            .labels(resource, action)
            .observe(durationSeconds);
        this.logger.debug('Authorization check recorded', {
            resource,
            action,
            result,
            durationMs: duration,
        });
    }
    recordAccessDenial(resource, reason, userRole) {
        this.accessDenials.labels(resource, reason, userRole).inc();
        this.logger.debug('Access denial recorded', {
            resource,
            reason,
            userRole,
        });
    }
    recordPrivilegeEscalation(userRole, targetRole, result) {
        this.privilegeEscalations.labels(userRole, targetRole, result).inc();
        this.logger.warn('Privilege escalation attempt recorded', {
            userRole,
            targetRole,
            result,
        });
    }
    recordRateLimitHit(endpoint, limitType, userId) {
        this.rateLimitHits.labels(endpoint, limitType, userId || 'anonymous').inc();
        this.logger.debug('Rate limit hit recorded', {
            endpoint,
            limitType,
            userId,
        });
    }
    recordRateLimitBypass(endpoint, method, sourceIp) {
        this.rateLimitBypass.labels(endpoint, method, sourceIp).inc();
        this.logger.warn('Rate limit bypass attempt recorded', {
            endpoint,
            method,
            sourceIp,
        });
    }
    recordThrottledRequest(endpoint, throttleType) {
        this.throttledRequests.labels(endpoint, throttleType).inc();
        this.logger.debug('Throttled request recorded', {
            endpoint,
            throttleType,
        });
    }
    updateRateLimitUtilization(endpoint, windowDuration, utilizationPercent) {
        this.rateLimitWindowUtilization
            .labels(endpoint, windowDuration)
            .set(utilizationPercent);
    }
    recordSecurityEvent(eventType, severity, source) {
        this.securityEvents.labels(eventType, severity, source).inc();
        this.logger.debug('Security event recorded', {
            eventType,
            severity,
            source,
        });
        this.eventEmitter.emit('security.event', {
            type: eventType,
            severity,
            source,
            timestamp: new Date().toISOString(),
        });
    }
    recordThreatDetection(threatType, confidence, mitigation) {
        this.threatDetections.labels(threatType, confidence, mitigation).inc();
        this.logger.warn('Threat detection recorded', {
            threatType,
            confidence,
            mitigation,
        });
        this.eventEmitter.emit('security.threat', {
            type: threatType,
            confidence,
            mitigation,
            timestamp: new Date().toISOString(),
        });
    }
    recordVulnerabilityScan(scanType, result, severity) {
        this.vulnerabilityScans.labels(scanType, result, severity || 'none').inc();
        this.logger.debug('Vulnerability scan recorded', {
            scanType,
            result,
            severity,
        });
    }
    recordComplianceCheck(framework, control, result) {
        this.complianceChecks.labels(framework, control, result).inc();
        this.logger.debug('Compliance check recorded', {
            framework,
            control,
            result,
        });
    }
    recordTracingSpan(service, operation, status) {
        this.tracingSpans.labels(service, operation, status).inc();
        this.logger.debug('Tracing span recorded', {
            service,
            operation,
            status,
        });
    }
    recordTracingError(service, errorType) {
        this.tracingErrors.labels(service, errorType).inc();
        this.logger.debug('Tracing error recorded', {
            service,
            errorType,
        });
    }
    recordLogEvent(level, component, correlationId) {
        this.logEvents.labels(level, component, correlationId || 'none').inc();
    }
    recordAlertTriggered(alertType, severity, channel) {
        this.alertsTriggered.labels(alertType, severity, channel).inc();
        this.logger.debug('Alert triggered recorded', {
            alertType,
            severity,
            channel,
        });
        this.eventEmitter.emit('alert.triggered', {
            type: alertType,
            severity,
            channel,
            timestamp: new Date().toISOString(),
        });
    }
    recordUserInteraction(interactionType, feature, userSegment) {
        this.userInteractions.labels(interactionType, feature, userSegment).inc();
        this.logger.debug('User interaction recorded', {
            interactionType,
            feature,
            userSegment,
        });
    }
    recordFeatureUsage(feature, version, userType) {
        this.featureUsage.labels(feature, version, userType).inc();
        this.logger.debug('Feature usage recorded', {
            feature,
            version,
            userType,
        });
    }
    recordBusinessProcess(processName, processVersion, result, duration) {
        const durationSeconds = duration / 1000;
        this.businessProcessDuration
            .labels(processName, processVersion, result)
            .observe(durationSeconds);
        this.logger.debug('Business process recorded', {
            processName,
            processVersion,
            result,
            durationMs: duration,
        });
    }
    updateRevenueMetrics(metricType, value, currency, period) {
        this.revenueMetrics.labels(metricType, currency, period).set(value);
        this.logger.debug('Revenue metrics updated', {
            metricType,
            value,
            currency,
            period,
        });
    }
    async getMetricsSummary() {
        const operationId = `metrics_summary_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
        this.logger.debug(`[${operationId}] Generating metrics summary`);
        try {
            const metricsString = await this.getPrometheusMetrics();
            const lines = metricsString.split('\n');
            const categorizeMetric = (line) => {
                if (line.includes('security_') ||
                    line.includes('auth_') ||
                    line.includes('rate_limit_') ||
                    line.includes('threat_')) {
                    return 'security';
                }
                if (line.includes('duration') ||
                    line.includes('latency') ||
                    line.includes('response_time')) {
                    return 'performance';
                }
                if (line.includes('user_') ||
                    line.includes('feature_') ||
                    line.includes('business_') ||
                    line.includes('revenue_')) {
                    return 'business';
                }
                if (line.includes('tracing_') ||
                    line.includes('log_') ||
                    line.includes('alert_')) {
                    return 'observability';
                }
                return 'other';
            };
            const summary = {
                security: { total: 0, categories: [] },
                performance: { total: 0, categories: [] },
                business: { total: 0, categories: [] },
                observability: { total: 0, categories: [] },
            };
            lines.forEach((line) => {
                if (line.startsWith('bytebot_agent_')) {
                    const category = categorizeMetric(line);
                    if (category !== 'other' && summary[category]) {
                        summary[category].total++;
                    }
                }
            });
            this.logger.debug(`[${operationId}] Metrics summary generated`, {
                security: summary.security.total,
                performance: summary.performance.total,
                business: summary.business.total,
                observability: summary.observability.total,
            });
            return summary;
        }
        catch (error) {
            this.logger.error(`[${operationId}] Failed to generate metrics summary`, {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
    clearMetrics() {
        this.registry.clear();
        this.logger.debug('All metrics cleared');
    }
    getRegistry() {
        return this.registry;
    }
    recordHealthCheck(service, isHealthy, timestamp) {
        try {
            this.httpRequestsTotal.inc({
                method: 'GET',
                route: '/health/' + service,
                status_code: isHealthy ? '200' : '500',
            });
            this.logger.debug('Health check metric recorded', {
                service,
                isHealthy,
                timestamp,
            });
        }
        catch (error) {
            this.logger.warn('Failed to record health check metric', {
                service,
                isHealthy,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    recordDashboardAccess(operationId) {
        try {
            this.httpRequestsTotal.inc({
                method: 'GET',
                route: '/health/dashboard',
                status_code: '200',
            });
            this.logger.debug('Dashboard access metric recorded', { operationId });
        }
        catch (error) {
            this.logger.warn('Failed to record dashboard access metric', {
                operationId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
};
exports.MetricsService = MetricsService;
exports.MetricsService = MetricsService = MetricsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2,
        config_1.ConfigService])
], MetricsService);
//# sourceMappingURL=metrics.service.js.map