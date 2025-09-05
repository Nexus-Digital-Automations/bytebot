# C/ua Framework Compatible Bytebot Desktop Container
# Hybrid Architecture: Container + Native macOS Services
# Apple Silicon M4 Optimized Runtime
FROM --platform=linux/arm64 ghcr.io/bytebot-ai/bytebot-desktop:edge

# === C/ua Framework Integration === 
LABEL maintainer="Claude Code <noreply@anthropic.com>"
LABEL description="C/ua-enabled Bytebot Desktop with Apple Neural Engine bridge"
LABEL version="1.0.0"
LABEL cua.framework.version="latest"
LABEL cua.ane.support="hybrid-bridge"
LABEL apple.silicon.optimized="m4-neural-engine"
LABEL platform.architecture="arm64"
LABEL performance.target="low-latency"

# === Apple Silicon M4 Optimization Environment ===
ENV DOCKER_BUILDKIT=1
ENV COMPOSE_DOCKER_CLI_BUILD=1
ENV BUILDKIT_PROGRESS=plain
ENV DOCKER_PLATFORM=linux/arm64

# === System Dependencies (ARM64 Optimized) ===
RUN apt-get update && apt-get install -y \
    # C/ua Framework Requirements
    curl \
    wget \
    python3 \
    python3-pip \
    python3-venv \
    # Apple Neural Engine Bridge Dependencies 
    socat \
    netcat-openbsd \
    jq \
    # Performance Monitoring Tools
    htop \
    iotop \
    nethogs \
    # Network Communication Tools
    iproute2 \
    iputils-ping \
    telnet \
    # Container Orchestration Tools
    supervisor \
    # Apple Silicon Performance Tools
    numactl \
    cpufrequtils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# Install Node.js 20 LTS from NodeSource to avoid dependency conflicts
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# === C/ua Framework Installation ===
# Install Lume CLI (C/ua Framework CLI)
RUN npm install -g @lume/cli@latest

# Create C/ua configuration directory
RUN mkdir -p /opt/cua/{config,scripts,logs,shared}

# === Apple Silicon Optimized Python Environment ===
# Use Apple Silicon optimized Python packages where available
RUN python3 -m venv /opt/cua/venv && \
    /opt/cua/venv/bin/pip install --upgrade pip && \
    /opt/cua/venv/bin/pip install --no-cache-dir \
    requests \
    websockets \
    aiohttp \
    fastapi \
    "uvicorn[standard]" \
    pydantic \
    pillow \
    numpy \
    # Apple Silicon Performance Libraries
    psutil \
    memory-profiler \
    asyncio-pool

# === C/ua Agent Configuration ===
COPY docker/cua-config/ /opt/cua/config/
COPY docker/cua-scripts/ /opt/cua/scripts/

# Make C/ua scripts executable
RUN chmod +x /opt/cua/scripts/*.sh

# === Apple Neural Engine Bridge Setup (M4 Optimized) ===
# Create bridge service directory with shared memory support
RUN mkdir -p /opt/ane-bridge/{service,logs,cache,shm,metrics} \
    # Create shared memory mount points for zero-copy IPC
    && mkdir -p /dev/shm/ane-bridge \
    && mkdir -p /opt/ane-bridge/performance \
    # Set optimal permissions for shared memory
    && chmod 755 /dev/shm/ane-bridge

# Copy ANE Bridge configuration
COPY docker/ane-bridge/ /opt/ane-bridge/

# === Apple Silicon M4 Performance Bridge ===
# Create M4-specific optimization scripts
COPY docker/apple-silicon-m4/ /opt/apple-silicon-m4/
RUN find /opt/apple-silicon-m4/ -name "*.sh" -type f -exec chmod +x {} \; || true

# === Enhanced Supervisor Configuration ===
# Copy enhanced supervisor config for C/ua integration
COPY docker/supervisor/cua-supervisord.conf /etc/supervisor/conf.d/cua-supervisord.conf

# === Apple Silicon M4 Performance Monitoring Setup ===
RUN mkdir -p /opt/monitoring/{scripts,logs,metrics,m4-metrics,shared-memory} \
    # Create M4-specific monitoring directories
    && mkdir -p /opt/monitoring/apple-silicon/{cpu,memory,neural-engine,performance-cores} \
    # Create performance profiling directories
    && mkdir -p /opt/monitoring/profiling/{latency,throughput,resource-usage}

COPY docker/monitoring/ /opt/monitoring/
RUN find /opt/monitoring/scripts/ -name "*.sh" -type f -exec chmod +x {} \; || true

# === C/ua Framework Environment Variables (M4 Optimized) ===
ENV CUA_FRAMEWORK_ENABLED=true
ENV CUA_CONTAINER_ID=bytebot-desktop-m4
ENV CUA_ANE_BRIDGE_URL=http://host.docker.internal:8080
ENV CUA_PERFORMANCE_MODE=apple_silicon_m4
ENV CUA_LOG_LEVEL=info
ENV CUA_SHARED_VOLUME=/opt/cua/shared
# Apple Silicon M4 Specific Environment
ENV APPLE_SILICON_OPTIMIZATION=enabled
ENV M4_NEURAL_ENGINE_ACCESS=direct
ENV UNIFIED_MEMORY_OPTIMIZATION=enabled
ENV PERFORMANCE_CORE_PRIORITY=enabled

# === Apple Neural Engine Bridge Environment ===
ENV ANE_BRIDGE_ENABLED=true
ENV ANE_BRIDGE_HOST=host.docker.internal
ENV ANE_BRIDGE_PORT=8080
ENV ANE_FALLBACK_ENABLED=true
ENV ANE_CACHE_ENABLED=true
ENV ANE_BATCH_SIZE=10
ENV ANE_TIMEOUT_MS=5000

# === Apple Silicon M4 Performance Optimization Environment ===
ENV PERFORMANCE_MONITORING=enabled
ENV METRICS_COLLECTION=enabled
ENV RESOURCE_LIMITS_ENABLED=true
ENV MEMORY_OPTIMIZATION=apple_silicon_unified
# Apple Silicon M4 Performance Tuning
ENV ARM64_SIMD_OPTIMIZATION=enabled
ENV MEMORY_MAPPING_OPTIMIZATION=zero_copy
ENV CPU_AFFINITY_OPTIMIZATION=performance_cores
ENV CONTAINER_STARTUP_OPTIMIZATION=fast_boot
# Performance Targets
ENV TARGET_CPU_OVERHEAD=5
ENV TARGET_MEMORY_USAGE=4G
ENV TARGET_STARTUP_TIME=30s

# === Network Configuration for C/ua Communication ===
# Expose additional ports for C/ua services
# 9990: Original bytebotd service
# 9993: C/ua Agent API
# 9994: ANE Bridge Communication
# 9995: Performance Monitoring
# 9996: WebSocket for real-time communication
EXPOSE 9990 9993 9994 9995 9996

# === Volume Mounts for Apple Silicon M4 Hybrid Architecture ===
# Shared volume for native-container communication
# Optimized for Apple Silicon unified memory architecture
VOLUME ["/opt/cua/shared", "/opt/ane-bridge/cache", "/opt/monitoring/logs", "/dev/shm/ane-bridge", "/opt/apple-silicon-m4/shared"]

# === Health Checks ===
# Enhanced health check for C/ua integration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD /opt/cua/scripts/health-check.sh || exit 1

# === Final Configuration ===
# Copy startup script
COPY docker/startup/cua-startup.sh /opt/startup/cua-startup.sh
RUN chmod +x /opt/startup/cua-startup.sh

# Set working directory
WORKDIR /opt/cua

# === Apple Silicon M4 Optimized Startup Command ===
# Use Apple Silicon optimized startup with M4 performance tuning
# Copy M4 optimization startup script
COPY docker/startup/m4-optimized-startup.sh /opt/startup/m4-optimized-startup.sh
RUN chmod +x /opt/startup/m4-optimized-startup.sh

# Use Apple Silicon M4 optimized startup sequence
CMD ["/opt/startup/m4-optimized-startup.sh"]
