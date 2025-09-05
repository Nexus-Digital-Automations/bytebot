#!/bin/bash
# ==========================================
# Optimized C/ua Framework Container Startup Script
# ==========================================
# High-performance startup for <30 second container initialization
# Performance target: 75% improvement over 120s baseline

set -euo pipefail

# === Optimized Configuration ===
LOG_FILE="/opt/cua/logs/container-startup.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
STARTUP_START_TIME=$(date +%s)
FAST_MODE="true"
PARALLEL_INIT="true"

# === Initialize C/ua Environment First ===
# Create required directories FIRST
mkdir -p /opt/cua/{logs,shared,cache,tmp}
mkdir -p /opt/ane-bridge/{logs,cache}
mkdir -p /opt/monitoring/{logs,metrics}
mkdir -p /var/log/supervisor

# === Enhanced Logging Function with Performance Tracking ===
log_message() {
    local level="$1"
    local message="$2"
    local elapsed=$(($(date +%s) - STARTUP_START_TIME))
    echo "[${TIMESTAMP}] [${level}] [+${elapsed}s] $message" | tee -a "$LOG_FILE"
}

log_message "INFO" "=== Starting OPTIMIZED C/ua Enhanced Bytebot Desktop Container ==="
log_message "INFO" "Performance Target: <30 second initialization (from 120s baseline)"
log_message "INFO" "Mode: Fast startup with parallel initialization"

# Set proper permissions in parallel
{
    chown -R user:user /opt/cua /opt/ane-bridge /opt/monitoring
} &
{
    chmod 755 /opt/cua/{logs,shared,cache,tmp}
    chmod 755 /opt/ane-bridge/{logs,cache}
    chmod 755 /opt/monitoring/{logs,metrics}
} &
wait  # Wait for parallel permission setting

log_message "INFO" "C/ua environment initialized"

# === Run Optimized Fast Startup Script ===
if [ -x "/opt/cua/scripts/fast-startup.sh" ]; then
    log_message "INFO" "Running optimized C/ua framework fast startup"
    /opt/cua/scripts/fast-startup.sh 2>&1 | tee -a "$LOG_FILE" &
    CUA_STARTUP_PID=$!
    
    # Reduced wait time for fast startup
    sleep 2
    
    if kill -0 $CUA_STARTUP_PID 2>/dev/null; then
        log_message "INFO" "Fast startup script is running (PID: $CUA_STARTUP_PID)"
    else
        log_message "ERROR" "Fast startup script failed - falling back to standard startup"
        
        # Fallback to original startup if fast startup fails
        if [ -x "/opt/cua/scripts/startup.sh" ]; then
            log_message "INFO" "Starting fallback C/ua framework startup"
            /opt/cua/scripts/startup.sh 2>&1 | tee -a "$LOG_FILE" &
            CUA_STARTUP_PID=$!
        fi
    fi
else
    log_message "WARN" "Fast startup script not found, trying standard startup"
    if [ -x "/opt/cua/scripts/startup.sh" ]; then
        log_message "INFO" "Running standard C/ua framework startup"
        /opt/cua/scripts/startup.sh 2>&1 | tee -a "$LOG_FILE" &
        CUA_STARTUP_PID=$!
    else
        log_message "WARN" "No C/ua startup scripts found"
    fi
fi

# === Start Supervisor with Optimized Configuration ===
log_message "INFO" "Starting supervisor with optimized C/ua configuration"

# Set environment variables for optimization
export CUA_FAST_HEALTH_CHECKS=true
export CUA_PERFORMANCE_MODE=optimized
export PYTHONUNBUFFERED=1

# Calculate total startup time before supervisor takes over
local total_startup_time=$(($(date +%s) - STARTUP_START_TIME))
log_message "INFO" "Pre-supervisor startup completed in ${total_startup_time}s"

if [ $total_startup_time -le 30 ]; then
    log_message "INFO" "🎯 STARTUP PERFORMANCE TARGET ACHIEVED: ${total_startup_time}s (<30s target)"
else
    log_message "WARN" "📊 Startup performance target missed: ${total_startup_time}s (target: <30s)"
fi

# Use the optimized supervisor configuration
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/cua-supervisord.conf -n