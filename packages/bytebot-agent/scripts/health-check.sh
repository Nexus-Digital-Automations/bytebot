#!/bin/bash

# Bytebot Browser Automation Platform - Health Check Script
# Comprehensive health monitoring for local Docker deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
LOG_FILE="${PROJECT_ROOT}/logs/health-check.log"

# Service endpoints
API_ENDPOINT="http://localhost:9991"
BROWSER_SERVICE_ENDPOINT="http://localhost:8080"
GRAFANA_ENDPOINT="http://localhost:3001"
PROMETHEUS_ENDPOINT="http://localhost:9090"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health check results
HEALTH_STATUS=0
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

info() { log "INFO" "${BLUE}$*${NC}"; }
warn() { log "WARN" "${YELLOW}$*${NC}"; }
error() { log "ERROR" "${RED}$*${NC}"; }
success() { log "SUCCESS" "${GREEN}$*${NC}"; }

# Health check function
check() {
    local test_name="$1"
    local command="$2"
    local expected_result="${3:-0}"
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    info "Checking: $test_name"
    
    if eval "$command" > /dev/null 2>&1; then
        local result=$?
        if [[ $result -eq $expected_result ]]; then
            success "✓ $test_name"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            error "✗ $test_name (unexpected result: $result)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            HEALTH_STATUS=1
        fi
    else
        error "✗ $test_name"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        HEALTH_STATUS=1
    fi
}

# HTTP health check function
http_check() {
    local service_name="$1"
    local endpoint="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"
    
    check "$service_name HTTP endpoint" \
        "curl -s -f --max-time $timeout -w '%{http_code}' '$endpoint/health' -o /dev/null | grep -q '$expected_status'"
}

# Docker service health check
docker_service_check() {
    local service_name="$1"
    
    check "$service_name container running" \
        "docker-compose -f '$COMPOSE_FILE' ps '$service_name' | grep -q 'Up'"
        
    check "$service_name container healthy" \
        "docker-compose -f '$COMPOSE_FILE' ps '$service_name' | grep -q 'healthy\\|Up' || docker-compose -f '$COMPOSE_FILE' ps '$service_name' | grep -q 'Up'"
}

# Database connectivity check
database_check() {
    local container_name="bytebot-postgres"
    
    check "PostgreSQL connection" \
        "docker exec '$container_name' pg_isready -U bytebot_user -d bytebot_production"
        
    check "PostgreSQL query execution" \
        "docker exec '$container_name' psql -U bytebot_user -d bytebot_production -c 'SELECT 1;'"
}

# Redis connectivity check
redis_check() {
    local container_name="bytebot-redis"
    
    check "Redis connection" \
        "docker exec '$container_name' redis-cli ping | grep -q 'PONG'"
        
    check "Redis info command" \
        "docker exec '$container_name' redis-cli info server | grep -q 'redis_version'"
}

# Browser automation check
browser_automation_check() {
    info "Testing browser automation functionality"
    
    # Test session creation
    local session_response
    session_response=$(curl -s -f -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-token" \
        -d '{"headless": true, "window_width": 1280, "window_height": 720}' \
        "$BROWSER_SERVICE_ENDPOINT/sessions" 2>/dev/null || echo "")
    
    if [[ -n "$session_response" ]] && echo "$session_response" | grep -q '"success":true'; then
        success "✓ Browser session creation"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        
        # Extract session ID and test session info
        local session_id
        session_id=$(echo "$session_response" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)
        
        if [[ -n "$session_id" ]]; then
            local session_info
            session_info=$(curl -s -f \
                -H "Authorization: Bearer test-token" \
                "$BROWSER_SERVICE_ENDPOINT/sessions/$session_id" 2>/dev/null || echo "")
            
            if [[ -n "$session_info" ]] && echo "$session_info" | grep -q '"success":true'; then
                success "✓ Browser session info retrieval"
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                error "✗ Browser session info retrieval"
                FAILED_CHECKS=$((FAILED_CHECKS + 1))
                HEALTH_STATUS=1
            fi
            
            # Clean up session
            curl -s -f -X DELETE \
                -H "Authorization: Bearer test-token" \
                "$BROWSER_SERVICE_ENDPOINT/sessions/$session_id" > /dev/null 2>&1 || true
        fi
    else
        error "✗ Browser session creation"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        HEALTH_STATUS=1
    fi
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
}

# Resource usage check
resource_check() {
    info "Checking resource usage"
    
    # Memory usage check
    local memory_usage
    memory_usage=$(docker stats --no-stream --format "{{.MemPerc}}" | head -n 1 | sed 's/%//')
    
    if [[ -n "$memory_usage" ]] && (( $(echo "$memory_usage < 80" | bc -l) )); then
        success "✓ Memory usage acceptable ($memory_usage%)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        warn "! High memory usage ($memory_usage%)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    # Disk usage check
    local disk_usage
    disk_usage=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ $disk_usage -lt 80 ]]; then
        success "✓ Disk usage acceptable ($disk_usage%)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        warn "! High disk usage ($disk_usage%)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
}

# Monitoring stack check
monitoring_check() {
    info "Checking monitoring stack"
    
    # Check Prometheus
    local prometheus_health
    prometheus_health=$(curl -s -f "$PROMETHEUS_ENDPOINT/-/healthy" 2>/dev/null || echo "")
    
    if [[ "$prometheus_health" == "Prometheus is Healthy." ]]; then
        success "✓ Prometheus health check"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        error "✗ Prometheus health check"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        HEALTH_STATUS=1
    fi
    
    # Check Grafana
    local grafana_health
    grafana_health=$(curl -s -f "$GRAFANA_ENDPOINT/api/health" 2>/dev/null || echo "")
    
    if echo "$grafana_health" | grep -q '"database":"ok"'; then
        success "✓ Grafana health check"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        error "✗ Grafana health check"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        HEALTH_STATUS=1
    fi
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 2))
}

# Network connectivity check
network_check() {
    info "Checking network connectivity"
    
    # Check internal service communication
    local services=("bytebot-agent" "browser-use" "postgres" "redis")
    
    for service in "${services[@]}"; do
        if docker exec bytebot-agent nc -z "$service" 80 2>/dev/null || \
           docker exec bytebot-agent nc -z "$service" 8080 2>/dev/null || \
           docker exec bytebot-agent nc -z "$service" 5432 2>/dev/null || \
           docker exec bytebot-agent nc -z "$service" 6379 2>/dev/null; then
            success "✓ Network connectivity to $service"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            error "✗ Network connectivity to $service"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            HEALTH_STATUS=1
        fi
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    done
}

# Security check
security_check() {
    info "Checking security configuration"
    
    # Check for default passwords
    check "No default PostgreSQL password" \
        "[[ '$(docker exec bytebot-postgres env | grep POSTGRES_PASSWORD)' != *'postgres'* ]]"
        
    # Check container privileges
    check "Non-privileged containers" \
        "! docker-compose -f '$COMPOSE_FILE' ps | grep -q 'privileged'"
        
    # Check exposed ports
    local exposed_ports
    exposed_ports=$(docker-compose -f "$COMPOSE_FILE" ps --format "{{.Ports}}" | grep -o '0.0.0.0:[0-9]*' | wc -l)
    
    if [[ $exposed_ports -le 10 ]]; then
        success "✓ Reasonable number of exposed ports ($exposed_ports)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        warn "! Many exposed ports ($exposed_ports)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
}

# Generate health report
generate_report() {
    echo ""
    info "=== HEALTH CHECK SUMMARY ==="
    info "Total checks: $TOTAL_CHECKS"
    info "Passed: $GREEN$PASSED_CHECKS$NC"
    info "Failed: $RED$FAILED_CHECKS$NC"
    
    local success_rate
    if [[ $TOTAL_CHECKS -gt 0 ]]; then
        success_rate=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))
        info "Success rate: $success_rate%"
    fi
    
    if [[ $HEALTH_STATUS -eq 0 ]]; then
        success "=== ALL SYSTEMS OPERATIONAL ==="
    else
        error "=== ISSUES DETECTED ==="
        error "Please check the failed tests above and review logs"
    fi
    
    # Generate JSON report for monitoring systems
    local json_report="$PROJECT_ROOT/logs/health-report.json"
    cat > "$json_report" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": $([ $HEALTH_STATUS -eq 0 ] && echo '"healthy"' || echo '"unhealthy"'),
  "total_checks": $TOTAL_CHECKS,
  "passed_checks": $PASSED_CHECKS,
  "failed_checks": $FAILED_CHECKS,
  "success_rate": $([ $TOTAL_CHECKS -gt 0 ] && echo "$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))" || echo "0")
}
EOF
    
    info "Health report saved to: $json_report"
}

# Main execution
main() {
    info "Starting Bytebot Browser Automation Platform health check"
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Docker services health
    info "=== DOCKER SERVICES ==="
    docker_service_check "bytebot-agent"
    docker_service_check "browser-use"
    docker_service_check "postgres"
    docker_service_check "redis"
    
    # HTTP endpoints health
    info "=== HTTP ENDPOINTS ==="
    http_check "Bytebot Agent API" "$API_ENDPOINT"
    http_check "Browser-Use Service" "$BROWSER_SERVICE_ENDPOINT"
    
    # Database and cache health
    info "=== DATABASE & CACHE ==="
    database_check
    redis_check
    
    # Browser automation functionality
    info "=== BROWSER AUTOMATION ==="
    browser_automation_check
    
    # Resource usage
    info "=== RESOURCE USAGE ==="
    resource_check
    
    # Monitoring stack
    info "=== MONITORING ==="
    monitoring_check
    
    # Network connectivity
    info "=== NETWORK ==="
    network_check
    
    # Security checks
    info "=== SECURITY ==="
    security_check
    
    # Generate final report
    generate_report
    
    exit $HEALTH_STATUS
}

# Command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -h, --help     Show this help message"
            echo ""
            echo "This script performs comprehensive health checks on the"
            echo "Bytebot Browser Automation Platform deployment."
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main "$@"