#!/bin/bash

# ==========================================
# C/ua Framework Health Check Script
# ==========================================
# Comprehensive health monitoring for C/ua-enabled Bytebot container
# Checks: Services, ANE Bridge, Performance, Network Connectivity

set -euo pipefail

# === Configuration ===
LOG_FILE="/opt/cua/logs/health-check.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
MAX_RESPONSE_TIME=5000  # milliseconds
ANE_BRIDGE_URL="${ANE_BRIDGE_HOST:-host.docker.internal}:${ANE_BRIDGE_PORT:-8080}"
HEALTH_CHECK_TIMEOUT=10

# === Logging Function ===
log_message() {
    local level="$1"
    local message="$2"
    echo "[${TIMESTAMP}] [${level}] $message" | tee -a "$LOG_FILE"
}

# === Health Check Functions ===

check_bytebotd_service() {
    local service_url="http://localhost:9990"
    
    log_message "INFO" "Checking bytebotd service at $service_url"
    
    if curl -s --max-time $HEALTH_CHECK_TIMEOUT "$service_url" > /dev/null 2>&1; then
        log_message "INFO" "✓ Bytebotd service is healthy"
        return 0
    else
        log_message "ERROR" "✗ Bytebotd service is unhealthy"
        return 1
    fi
}

check_cua_agent_api() {
    local api_url="http://localhost:9993/api/v1/health"
    
    log_message "INFO" "Checking C/ua Agent API at $api_url"
    
    if curl -s --max-time $HEALTH_CHECK_TIMEOUT "$api_url" > /dev/null 2>&1; then
        log_message "INFO" "✓ C/ua Agent API is healthy"
        return 0
    else
        log_message "ERROR" "✗ C/ua Agent API is unhealthy"
        return 1
    fi
}

check_ane_bridge_connectivity() {
    local bridge_url="http://${ANE_BRIDGE_URL}/health"
    
    log_message "INFO" "Checking ANE Bridge connectivity at $bridge_url"
    
    # Test with shorter timeout since this is external
    if curl -s --max-time 3 "$bridge_url" > /dev/null 2>&1; then
        log_message "INFO" "✓ ANE Bridge is accessible"
        return 0
    else
        log_message "WARN" "⚠ ANE Bridge not accessible (fallback mode will be used)"
        return 0  # Non-critical failure
    fi
}

check_system_resources() {
    log_message "INFO" "Checking system resource usage"
    
    # Check memory usage (fail if > 90%)\n    local memory_usage\n    memory_usage=$(free | grep Mem | awk '{printf \"%.0f\", $3/$2 * 100.0}')\n    \n    if [ \"$memory_usage\" -lt 90 ]; then\n        log_message \"INFO\" \"✓ Memory usage is healthy: ${memory_usage}%\"\n    else\n        log_message \"ERROR\" \"✗ High memory usage: ${memory_usage}%\"\n        return 1\n    fi\n    \n    # Check disk space (fail if > 90%)\n    local disk_usage\n    disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')\n    \n    if [ \"$disk_usage\" -lt 90 ]; then\n        log_message \"INFO\" \"✓ Disk usage is healthy: ${disk_usage}%\"\n    else\n        log_message \"ERROR\" \"✗ High disk usage: ${disk_usage}%\"\n        return 1\n    fi\n    \n    return 0\n}\n\ncheck_supervisor_services() {\n    log_message \"INFO\" \"Checking supervisor services\"\n    \n    # Check if supervisord is running\n    if pgrep -f supervisord > /dev/null; then\n        log_message \"INFO\" \"✓ Supervisord is running\"\n    else\n        log_message \"ERROR\" \"✗ Supervisord is not running\"\n        return 1\n    fi\n    \n    # Check critical services via supervisorctl\n    local services=(\"novnc\" \"xvfb\" \"fluxbox\" \"bytebotd\")\n    for service in \"${services[@]}\"; do\n        if supervisorctl status \"$service\" | grep -q \"RUNNING\"; then\n            log_message \"INFO\" \"✓ Service $service is running\"\n        else\n            log_message \"ERROR\" \"✗ Service $service is not running\"\n            return 1\n        fi\n    done\n    \n    return 0\n}\n\ncheck_performance_metrics() {\n    log_message \"INFO\" \"Checking performance metrics\"\n    \n    # Check if performance monitoring is enabled\n    if [ \"${PERFORMANCE_MONITORING:-disabled}\" = \"enabled\" ]; then\n        local monitor_url=\"http://localhost:9995/metrics\"\n        if curl -s --max-time 3 \"$monitor_url\" > /dev/null 2>&1; then\n            log_message \"INFO\" \"✓ Performance monitoring is healthy\"\n        else\n            log_message \"WARN\" \"⚠ Performance monitoring endpoint not accessible\"\n        fi\n    else\n        log_message \"INFO\" \"ℹ Performance monitoring is disabled\"\n    fi\n    \n    return 0\n}\n\ncheck_shared_volumes() {\n    log_message \"INFO\" \"Checking shared volume access\"\n    \n    local shared_path=\"/opt/cua/shared\"\n    if [ -d \"$shared_path\" ] && [ -w \"$shared_path\" ]; then\n        # Test write access\n        local test_file=\"${shared_path}/health_test_$(date +%s)\"\n        if echo \"health_check\" > \"$test_file\" 2>/dev/null; then\n            rm -f \"$test_file\"\n            log_message \"INFO\" \"✓ Shared volume is accessible and writable\"\n        else\n            log_message \"ERROR\" \"✗ Shared volume is not writable\"\n            return 1\n        fi\n    else\n        log_message \"ERROR\" \"✗ Shared volume is not accessible\"\n        return 1\n    fi\n    \n    return 0\n}\n\ngenerate_health_report() {\n    log_message \"INFO\" \"Generating comprehensive health report\"\n    \n    cat > /opt/cua/logs/health-report.json << EOF\n{\n  \"timestamp\": \"${TIMESTAMP}\",\n  \"container_id\": \"${CUA_CONTAINER_ID:-bytebot-desktop-cua}\",\n  \"framework_version\": \"${CUA_VERSION:-1.0.0}\",\n  \"checks_performed\": [\n    \"bytebotd_service\",\n    \"cua_agent_api\", \n    \"ane_bridge_connectivity\",\n    \"system_resources\",\n    \"supervisor_services\",\n    \"performance_metrics\",\n    \"shared_volumes\"\n  ],\n  \"ane_bridge_url\": \"${ANE_BRIDGE_URL}\",\n  \"performance_mode\": \"${CUA_PERFORMANCE_MODE:-standard}\",\n  \"monitoring_enabled\": \"${PERFORMANCE_MONITORING:-disabled}\"\n}\nEOF\n}\n\n# === Main Health Check Execution ===\n\nmain() {\n    local exit_code=0\n    \n    log_message \"INFO\" \"=== Starting C/ua Framework Health Check ===\"\n    \n    # Create logs directory if it doesn't exist\n    mkdir -p \"$(dirname \"$LOG_FILE\")\"\n    \n    # Run all health checks\n    check_bytebotd_service || exit_code=1\n    check_cua_agent_api || exit_code=1  \n    check_ane_bridge_connectivity  # Non-critical\n    check_system_resources || exit_code=1\n    check_supervisor_services || exit_code=1\n    check_performance_metrics  # Non-critical\n    check_shared_volumes || exit_code=1\n    \n    # Generate health report\n    generate_health_report\n    \n    if [ $exit_code -eq 0 ]; then\n        log_message \"INFO\" \"=== All critical health checks passed ===\"\n    else\n        log_message \"ERROR\" \"=== Some critical health checks failed ===\"\n    fi\n    \n    exit $exit_code\n}\n\n# === Error Handling ===\ntrap 'log_message \"ERROR\" \"Health check script encountered an error\"' ERR\n\n# Execute main function\nmain \"$@\""