#!/bin/bash

# Apple Neural Engine Bridge Service Startup Script
#
# This script starts the ANE bridge service with proper environment configuration
# and monitoring for production deployment on macOS hosts.
#
# Usage: ./start-ane-bridge.sh [options]
# Options:
#   --dev        Start in development mode
#   --config     Specify custom config file
#   --port       Override default port
#   --workers    Override worker count
#
# Author: Development Agent
# Version: 1.0.0

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR"
CONFIG_FILE="$SERVICE_DIR/config/service-config.json"
LOG_DIR="$SERVICE_DIR/logs"
PID_FILE="$SERVICE_DIR/ane-bridge.pid"

# Default values
DEVELOPMENT_MODE=false
CUSTOM_CONFIG=""
OVERRIDE_PORT=""
OVERRIDE_WORKERS=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_debug() {
    if [[ "$DEVELOPMENT_MODE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dev)
                DEVELOPMENT_MODE=true
                shift
                ;;
            --config)
                CUSTOM_CONFIG="$2"
                shift 2
                ;;
            --port)
                OVERRIDE_PORT="$2"
                shift 2
                ;;
            --workers)
                OVERRIDE_WORKERS="$2"
                shift 2
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Apple Neural Engine Bridge Service Startup Script

Usage: $0 [options]

Options:
  --dev              Start in development mode with debug logging
  --config PATH      Use custom configuration file
  --port PORT        Override default port (8080)
  --workers COUNT    Override worker count (1 for macOS)
  --help, -h         Show this help message

Environment Variables:
  ANE_BRIDGE_CONFIG  Path to configuration file
  ANE_BRIDGE_HOST    Host to bind to (default: 0.0.0.0)
  ANE_BRIDGE_PORT    Port to listen on (default: 8080)
  ANE_BRIDGE_WORKERS Worker count (default: 1)
  ANE_BRIDGE_LOG_LEVEL Log level (default: info)

Examples:
  $0                 # Start with default settings
  $0 --dev           # Start in development mode
  $0 --port 8090     # Start on port 8090
  $0 --config /path/to/config.json  # Use custom config

EOF
}

# System requirements check
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if we're on macOS
    if [[ "$(uname)" != "Darwin" ]]; then
        log_error "This service requires macOS for Apple Neural Engine access"
        exit 1
    fi
    
    # Check macOS version
    local mac_version
    mac_version=$(sw_vers -productVersion)
    local major_version
    major_version=$(echo "$mac_version" | cut -d '.' -f 1)
    
    if [[ "$major_version" -lt 11 ]]; then
        log_error "macOS 11.0 or later required for Apple Neural Engine support"
        log_error "Current version: $mac_version"
        exit 1
    fi
    
    # Check for Apple Silicon
    local processor
    processor=$(uname -m)
    if [[ "$processor" != "arm64" ]]; then
        log_warn "Apple Silicon (M1/M2/M3/M4) recommended for optimal ANE performance"
        log_warn "Current processor: $processor"
    fi
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3.8+ is required"
        exit 1
    fi
    
    local python_version
    python_version=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
    if ! python3 -c "import sys; exit(0 if sys.version_info >= (3, 8) else 1)"; then
        log_error "Python 3.8+ is required (current: $python_version)"
        exit 1
    fi
    
    # Check required Python packages
    local required_packages=("fastapi" "uvicorn" "psutil")
    for package in "${required_packages[@]}"; do
        if ! python3 -c "import $package" &> /dev/null; then
            log_error "Required Python package missing: $package"
            log_error "Install with: pip3 install $package"
            exit 1
        fi
    done
    
    # Check Swift availability (for Vision framework scripts)
    if ! command -v swift &> /dev/null; then
        log_error "Swift compiler required for Vision framework integration"
        log_error "Install Xcode Command Line Tools: xcode-select --install"
        exit 1
    fi
    
    log_info "System requirements check passed"
}

# Setup environment
setup_environment() {
    log_info "Setting up service environment..."
    
    # Create necessary directories
    mkdir -p "$LOG_DIR"
    mkdir -p "$SERVICE_DIR/scripts"
    mkdir -p "$SERVICE_DIR/temp"
    
    # Use custom config if provided
    if [[ -n "$CUSTOM_CONFIG" ]]; then
        CONFIG_FILE="$CUSTOM_CONFIG"
        export ANE_BRIDGE_CONFIG="$CONFIG_FILE"
    fi
    
    # Verify config file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        log_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Set environment variables
    export ANE_BRIDGE_HOST="${ANE_BRIDGE_HOST:-0.0.0.0}"
    export ANE_BRIDGE_PORT="${OVERRIDE_PORT:-${ANE_BRIDGE_PORT:-8080}}"
    export ANE_BRIDGE_WORKERS="${OVERRIDE_WORKERS:-${ANE_BRIDGE_WORKERS:-1}}"
    
    if [[ "$DEVELOPMENT_MODE" == "true" ]]; then
        export ANE_BRIDGE_LOG_LEVEL="debug"
    else
        export ANE_BRIDGE_LOG_LEVEL="${ANE_BRIDGE_LOG_LEVEL:-info}"
    fi
    
    # Set Python path
    export PYTHONPATH="$SERVICE_DIR:$PYTHONPATH"
    
    log_info "Environment configured:"
    log_debug "  Config: $CONFIG_FILE"
    log_debug "  Host: $ANE_BRIDGE_HOST"
    log_debug "  Port: $ANE_BRIDGE_PORT"
    log_debug "  Workers: $ANE_BRIDGE_WORKERS"
    log_debug "  Log Level: $ANE_BRIDGE_LOG_LEVEL"
}

# Check if service is already running
check_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_error "ANE Bridge Service is already running (PID: $pid)"
            log_error "Stop it first with: kill $pid"
            exit 1
        else
            log_warn "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
}

# Cleanup function
cleanup() {
    log_info "Shutting down ANE Bridge Service..."
    if [[ -f "$PID_FILE" ]]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill -TERM "$pid"
            sleep 2
            if kill -0 "$pid" 2>/dev/null; then
                kill -KILL "$pid"
            fi
        fi
        rm -f "$PID_FILE"
    fi
    log_info "Service shutdown complete"
}

# Signal handlers
trap cleanup EXIT INT TERM

# Hardware detection and validation
detect_hardware() {
    log_info "Detecting hardware capabilities..."
    
    # Get system information
    local system_info
    system_info=$(system_profiler SPHardwareDataType 2>/dev/null || echo "Unable to detect hardware")
    
    # Check for Apple Neural Engine indicators
    if echo "$system_info" | grep -qi "Apple.*M[1-4]"; then
        log_info "Apple Silicon detected - ANE acceleration available"
        export ANE_HARDWARE_DETECTED=true
    else
        log_warn "Apple Silicon not detected - performance may be reduced"
        export ANE_HARDWARE_DETECTED=false
    fi
    
    # Get memory information
    local memory_gb
    memory_gb=$(echo "$(sysctl -n hw.memsize) / 1024 / 1024 / 1024" | bc)
    log_debug "System memory: ${memory_gb}GB"
    
    if [[ "$memory_gb" -lt 8 ]]; then
        log_warn "Minimum 8GB RAM recommended for optimal performance"
    fi
}

# Start the service
start_service() {
    log_info "Starting Apple Neural Engine Bridge Service..."
    
    # Change to service directory
    cd "$SERVICE_DIR"
    
    # Start the service
    if [[ "$DEVELOPMENT_MODE" == "true" ]]; then
        log_info "Starting in development mode with hot reload..."
        python3 ane_service.py &
        local service_pid=$!
    else
        log_info "Starting in production mode..."
        nohup python3 ane_service.py > "$LOG_DIR/service.log" 2>&1 &
        local service_pid=$!
    fi
    
    # Save PID
    echo "$service_pid" > "$PID_FILE"
    
    # Wait a moment and check if service started successfully
    sleep 3
    if kill -0 "$service_pid" 2>/dev/null; then
        log_info "ANE Bridge Service started successfully (PID: $service_pid)"
        log_info "Service URL: http://$ANE_BRIDGE_HOST:$ANE_BRIDGE_PORT"
        log_info "Health check: http://$ANE_BRIDGE_HOST:$ANE_BRIDGE_PORT/health"
        log_info "API docs: http://$ANE_BRIDGE_HOST:$ANE_BRIDGE_PORT/docs"
        
        # Wait for service to be ready
        log_info "Waiting for service to become ready..."
        local max_attempts=30
        local attempt=0
        
        while [[ $attempt -lt $max_attempts ]]; do
            if curl -s "http://$ANE_BRIDGE_HOST:$ANE_BRIDGE_PORT/health" &>/dev/null; then
                log_info "Service is ready and responding to requests"
                break
            fi
            ((attempt++))
            sleep 1
        done
        
        if [[ $attempt -eq $max_attempts ]]; then
            log_error "Service failed to become ready within $max_attempts seconds"
            cleanup
            exit 1
        fi
        
    else
        log_error "Failed to start ANE Bridge Service"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Monitor service (for development mode)
monitor_service() {
    if [[ "$DEVELOPMENT_MODE" == "true" ]]; then
        log_info "Monitoring service in development mode..."
        log_info "Press Ctrl+C to stop the service"
        
        local pid
        pid=$(cat "$PID_FILE")
        
        while kill -0 "$pid" 2>/dev/null; do
            sleep 1
        done
        
        log_warn "Service process has stopped"
    else
        log_info "Service running in background"
        log_info "Monitor logs with: tail -f $LOG_DIR/service.log"
        log_info "Stop service with: kill $(cat "$PID_FILE")"
    fi
}

# Main execution
main() {
    log_info "Apple Neural Engine Bridge Service - Starting..."
    
    parse_args "$@"
    check_requirements
    setup_environment
    check_running
    detect_hardware
    start_service
    monitor_service
}

# Execute main function
main "$@"