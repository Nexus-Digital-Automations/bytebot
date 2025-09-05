#!/bin/bash

##############################################################################
# Apple Silicon M4 CPU Affinity Optimizer
#
# This script optimizes CPU core allocation for Apple Silicon M4 systems to:
# - Prioritize performance cores (0-5) for high-priority processes  
# - Utilize efficiency cores (6-9) for background tasks
# - Minimize context switching and maximize cache efficiency
# - Achieve target CPU overhead reduction from 25% to 5-10%
#
# Apple Silicon M4 Architecture:
# - 4 Performance cores (P-cores): 0-3  
# - 6 Efficiency cores (E-cores): 4-9
# - Total: 10 cores with unified memory architecture
##############################################################################

set -euo pipefail

# === Logging Configuration ===
log_operation_id=$(date +"%Y%m%d_%H%M%S")_$$
exec 1> >(tee -a /opt/monitoring/logs/m4-cpu-affinity-${log_operation_id}.log)
exec 2> >(tee -a /opt/monitoring/logs/m4-cpu-affinity-errors-${log_operation_id}.log >&2)

echo "[${log_operation_id}] Starting Apple Silicon M4 CPU affinity optimization"
echo "[${log_operation_id}] Timestamp: $(date)"
echo "[${log_operation_id}] M4 Architecture: 4 P-cores (0-3) + 6 E-cores (4-9)"

# === Apple Silicon M4 Core Mapping ===
# Performance cores: High-priority processes, ML workloads, ANE bridge
PERFORMANCE_CORES="0-3"
# Efficiency cores: Background tasks, monitoring, logging
EFFICIENCY_CORES="4-9" 

# === Function: Set Process Affinity ===
set_process_affinity() {
    local process_name="$1"
    local core_set="$2"
    local priority_type="$3"
    
    echo "[${log_operation_id}] Setting ${priority_type} affinity for ${process_name} to cores ${core_set}"
    
    # Find all processes matching the name
    local pids=$(pgrep -f "${process_name}" || echo "")
    
    if [ -n "$pids" ]; then
        for pid in $pids; do
            if [ -d "/proc/$pid" ]; then
                echo "[${log_operation_id}] Applying CPU affinity to PID $pid (${process_name})"
                taskset -cp "${core_set}" "$pid" 2>/dev/null || {
                    echo "[${log_operation_id}] Warning: Could not set affinity for PID $pid"
                }
                
                # Set process priority for performance cores
                if [ "$priority_type" = "performance" ]; then
                    echo "[${log_operation_id}] Setting high priority for PID $pid"
                    renice -10 -p "$pid" 2>/dev/null || {
                        echo "[${log_operation_id}] Warning: Could not set priority for PID $pid"
                    }
                fi
            fi
        done
    else
        echo "[${log_operation_id}] No processes found matching: ${process_name}"
    fi
}

# === Function: Monitor CPU Usage by Core ===
monitor_cpu_usage() {
    echo "[${log_operation_id}] Monitoring per-core CPU usage..."
    
    # Get per-core CPU usage
    local cpu_usage=$(grep "cpu[0-9]" /proc/stat | head -10)
    
    echo "[${log_operation_id}] Current CPU usage by core:"
    local core_num=0
    while IFS= read -r line; do
        local usage=$(echo "$line" | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}')
        local core_type="E-core"
        if [ $core_num -lt 4 ]; then
            core_type="P-core"
        fi
        printf "[${log_operation_id}] Core %d (%s): %.1f%%\n" "$core_num" "$core_type" "$usage"
        ((core_num++))
    done <<< "$cpu_usage"
}

# === Function: Optimize Apple Neural Engine Processes ===
optimize_ane_processes() {
    echo "[${log_operation_id}] Optimizing Apple Neural Engine processes..."
    
    # ANE bridge and related ML processes should use performance cores
    local ane_patterns=(
        "ane-bridge"
        "neural"
        "coreml"
        "vision"
        "bytebot.*desktop"
        "python.*ane"
    )
    
    for pattern in "${ane_patterns[@]}"; do
        set_process_affinity "$pattern" "$PERFORMANCE_CORES" "performance"
    done
}

# === Function: Optimize Background Processes ===
optimize_background_processes() {
    echo "[${log_operation_id}] Optimizing background processes for efficiency cores..."
    
    # Background processes should use efficiency cores
    local background_patterns=(
        "supervisor"
        "systemd"
        "rsyslog"
        "dbus"
        "monitoring"
        "logger"
        "cron"
        "ssh"
    )
    
    for pattern in "${background_patterns[@]}"; do
        set_process_affinity "$pattern" "$EFFICIENCY_CORES" "background"
    done
}

# === Function: Optimize C/ua Framework Processes ===
optimize_cua_processes() {
    echo "[${log_operation_id}] Optimizing C/ua framework processes..."
    
    # C/ua Agent and related processes need performance cores for low latency
    local cua_patterns=(
        "lume"
        "cua.*agent"
        "fastapi"
        "uvicorn"
        "websocket"
        "bytebot.*agent"
    )
    
    for pattern in "${cua_patterns[@]}"; do
        set_process_affinity "$pattern" "$PERFORMANCE_CORES" "performance"
    done
}

# === Function: Set NUMA Topology Optimization ===
optimize_numa_topology() {
    echo "[${log_operation_id}] Optimizing NUMA topology for Apple Silicon unified memory..."
    
    # Apple Silicon has unified memory, but we can still optimize memory allocation
    if command -v numactl >/dev/null 2>&1; then
        echo "[${log_operation_id}] Setting memory allocation policy for unified memory optimization"
        
        # Set interleave policy for better memory bandwidth utilization
        echo 'always' > /sys/kernel/mm/transparent_hugepage/enabled 2>/dev/null || {
            echo "[${log_operation_id}] Warning: Could not configure transparent hugepages"
        }
        
        # Configure memory allocation strategy
        echo 'defer' > /sys/kernel/mm/transparent_hugepage/defrag 2>/dev/null || {
            echo "[${log_operation_id}] Warning: Could not configure hugepage defrag"
        }
    else
        echo "[${log_operation_id}] numactl not available, skipping NUMA optimization"
    fi
}

# === Function: Apply Apple Silicon Specific Optimizations ===
apply_apple_silicon_optimizations() {
    echo "[${log_operation_id}] Applying Apple Silicon M4 specific optimizations..."
    
    # Set CPU governor for performance cores
    if [ -d "/sys/devices/system/cpu/cpu0/cpufreq" ]; then
        for core in {0..3}; do
            echo 'performance' > "/sys/devices/system/cpu/cpu${core}/cpufreq/scaling_governor" 2>/dev/null || {
                echo "[${log_operation_id}] Warning: Could not set governor for P-core $core"
            }
        done
        
        # Set efficiency cores to ondemand for power efficiency
        for core in {4..9}; do
            echo 'ondemand' > "/sys/devices/system/cpu/cpu${core}/cpufreq/scaling_governor" 2>/dev/null || {
                echo "[${log_operation_id}] Warning: Could not set governor for E-core $core"
            }
        done
        
        echo "[${log_operation_id}] Set P-cores to performance mode, E-cores to ondemand mode"
    else
        echo "[${log_operation_id}] CPU frequency scaling not available"
    fi
    
    # Optimize scheduler for Apple Silicon
    if [ -w "/proc/sys/kernel/sched_migration_cost_ns" ]; then
        echo 5000000 > /proc/sys/kernel/sched_migration_cost_ns
        echo "[${log_operation_id}] Optimized scheduler migration cost for M4"
    fi
    
    if [ -w "/proc/sys/kernel/sched_min_granularity_ns" ]; then
        echo 10000000 > /proc/sys/kernel/sched_min_granularity_ns
        echo "[${log_operation_id}] Optimized scheduler granularity for M4"
    fi
}

# === Function: Validate Optimization Results ===
validate_optimizations() {
    echo "[${log_operation_id}] Validating CPU affinity optimizations..."
    
    local performance_procs=0
    local efficiency_procs=0
    
    # Count processes on performance vs efficiency cores
    for pid in $(ps -eo pid --no-headers); do
        if [ -f "/proc/$pid/status" ]; then
            local cpus_allowed=$(grep "Cpus_allowed_list" "/proc/$pid/status" 2>/dev/null | cut -f2)
            
            if [[ "$cpus_allowed" =~ ^[0-3] ]]; then
                ((performance_procs++))
            elif [[ "$cpus_allowed" =~ ^[4-9] ]]; then
                ((efficiency_procs++))
            fi
        fi
    done
    
    echo "[${log_operation_id}] Validation Results:"
    echo "[${log_operation_id}] Processes on P-cores (0-3): $performance_procs"
    echo "[${log_operation_id}] Processes on E-cores (4-9): $efficiency_procs"
    
    # Calculate optimization ratio
    local total_procs=$((performance_procs + efficiency_procs))
    if [ $total_procs -gt 0 ]; then
        local p_core_ratio=$((performance_procs * 100 / total_procs))
        local e_core_ratio=$((efficiency_procs * 100 / total_procs))
        
        echo "[${log_operation_id}] P-core utilization: ${p_core_ratio}%"
        echo "[${log_operation_id}] E-core utilization: ${e_core_ratio}%"
    fi
}

# === Function: Create Monitoring Script ===
create_monitoring_script() {
    echo "[${log_operation_id}] Creating continuous monitoring script..."
    
    cat > /opt/apple-silicon-m4/cpu-monitor.sh << 'EOF'
#!/bin/bash
# Continuous CPU affinity monitoring for Apple Silicon M4
while true; do
    # Log current CPU usage
    echo "[$(date)] CPU Usage:" >> /opt/monitoring/logs/cpu-usage.log
    top -bn1 | grep "Cpu" >> /opt/monitoring/logs/cpu-usage.log
    
    # Log per-core usage
    mpstat -P ALL 1 1 | tail -11 >> /opt/monitoring/logs/per-core-usage.log
    
    sleep 60
done
EOF
    
    chmod +x /opt/apple-silicon-m4/cpu-monitor.sh
    echo "[${log_operation_id}] Created CPU monitoring script"
}

# === Main Optimization Sequence ===
main() {
    echo "[${log_operation_id}] === Apple Silicon M4 CPU Affinity Optimization Started ==="
    
    # 1. Monitor initial CPU usage
    monitor_cpu_usage
    
    # 2. Apply Apple Silicon specific optimizations
    apply_apple_silicon_optimizations
    
    # 3. Optimize NUMA topology
    optimize_numa_topology
    
    # 4. Optimize ANE processes for performance cores
    optimize_ane_processes
    
    # 5. Optimize C/ua framework processes
    optimize_cua_processes
    
    # 6. Move background processes to efficiency cores
    optimize_background_processes
    
    # 7. Wait for affinity changes to take effect
    sleep 5
    
    # 8. Validate optimization results
    validate_optimizations
    
    # 9. Monitor post-optimization CPU usage
    echo "[${log_operation_id}] Post-optimization CPU usage:"
    monitor_cpu_usage
    
    # 10. Create continuous monitoring
    create_monitoring_script
    
    echo "[${log_operation_id}] === Apple Silicon M4 CPU Affinity Optimization Completed ==="
    echo "[${log_operation_id}] Target: Reduce CPU overhead from 25% to 5-10%"
    echo "[${log_operation_id}] P-cores optimized for: ANE bridge, C/ua framework, ML workloads"
    echo "[${log_operation_id}] E-cores optimized for: Background tasks, monitoring, system processes"
}

# === Entry Point ===
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi