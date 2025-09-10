# Bytebot Desktop Container - Linux ARM64 with XFCE
# Optimized for Linux containerized desktop automation
FROM --platform=linux/arm64 ubuntu:22.04

# === Container Metadata ===
LABEL maintainer="Claude Code <noreply@anthropic.com>"
LABEL description="Bytebot Desktop automation container with XFCE desktop environment"
LABEL version="1.0.0"
LABEL platform.architecture="linux/arm64"
LABEL desktop.environment="xfce4"

# === Build Environment ===
ENV DOCKER_BUILDKIT=1
ENV COMPOSE_DOCKER_CLI_BUILD=1
ENV BUILDKIT_PROGRESS=plain
ENV DOCKER_PLATFORM=linux/arm64
ENV DEBIAN_FRONTEND=noninteractive

# === System Dependencies ===
RUN apt-get update && apt-get install -y \
    # Core system tools
    curl \
    wget \
    git \
    vim \
    nano \
    unzip \
    software-properties-common \
    # Python environment
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    # XFCE Desktop Environment
    xfce4 \
    xfce4-goodies \
    xfce4-terminal \
    # Display and VNC
    xvfb \
    x11vnc \
    novnc \
    websockify \
    # Browser automation dependencies
    chromium-browser \
    firefox \
    # Development tools
    build-essential \
    cmake \
    pkg-config \
    # Network tools
    socat \
    netcat-openbsd \
    jq \
    iproute2 \
    iputils-ping \
    telnet \
    # System monitoring
    htop \
    iotop \
    nethogs \
    # Process management
    supervisor \
    # ARM64 optimization tools
    numactl \
    cpufrequtils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean \
    && apt-get autoremove -y

# === Node.js Installation ===
# Install Node.js 20 LTS for modern JavaScript support
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# === Python Environment Setup ===
# Create optimized Python environment for automation tools
RUN python3 -m venv /opt/bytebot/venv && \
    /opt/bytebot/venv/bin/pip install --upgrade pip && \
    /opt/bytebot/venv/bin/pip install --no-cache-dir \
    # Web automation
    selenium \
    playwright \
    requests \
    beautifulsoup4 \
    # Async frameworks
    aiohttp \
    asyncio \
    websockets \
    # API frameworks
    fastapi \
    "uvicorn[standard]" \
    pydantic \
    # Image processing
    pillow \
    opencv-python-headless \
    # Data processing
    numpy \
    pandas \
    # System monitoring
    psutil \
    # Testing
    pytest \
    pytest-asyncio

# === Directory Structure ===
RUN mkdir -p /opt/bytebot/{config,scripts,logs,data,shared} \
    && mkdir -p /opt/monitoring/{scripts,logs,metrics} \
    && mkdir -p /opt/desktop/{config,themes,scripts} \
    && mkdir -p /var/log/bytebot

# === XFCE Configuration ===
# Set up XFCE desktop environment for automation
RUN mkdir -p /root/.config/xfce4/xfconf/xfce-perchannel-xml \
    && mkdir -p /root/.config/autostart

# Copy XFCE configuration files
COPY docker/desktop/xfce-config/ /root/.config/xfce4/ || true

# === VNC and Display Setup ===
# Configure VNC server for remote desktop access
RUN mkdir -p /root/.vnc \
    && echo "bytebot123" | vncpasswd -f > /root/.vnc/passwd \
    && chmod 600 /root/.vnc/passwd

# === Browser Setup ===
# Configure browsers for automation
RUN mkdir -p /root/.config/chromium \
    && mkdir -p /root/.mozilla/firefox

# === Supervisor Configuration ===
# Configure supervisor for process management
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf || \
    echo "[supervisord]\nnodaemon=true\n\n[program:xvfb]\ncommand=/usr/bin/Xvfb :1 -screen 0 1920x1080x24\nautorestart=true\n\n[program:x11vnc]\ncommand=/usr/bin/x11vnc -display :1 -nopw -listen localhost -xkb\nautorestart=true\n\n[program:novnc]\ncommand=/usr/share/novnc/utils/launch.sh --vnc localhost:5900 --listen 6080\nautorestart=true\n\n[program:xfce]\ncommand=/usr/bin/startxfce4\nenvironment=DISPLAY=\":1\"\nautorestart=true" > /etc/supervisor/conf.d/supervisord.conf

# === Environment Variables ===
# Linux desktop automation environment
ENV DISPLAY=:1
ENV VNC_RESOLUTION=1920x1080
ENV VNC_COLOR_DEPTH=24
ENV VNC_PASSWORD=bytebot123
ENV BYTEBOT_ENV=container
ENV BYTEBOT_LOG_LEVEL=info
ENV BYTEBOT_DATA_DIR=/opt/bytebot/data
ENV BYTEBOT_CONFIG_DIR=/opt/bytebot/config

# === Performance Optimization (Linux ARM64) ===
# ARM64-specific optimizations for Linux containers
ENV ARM64_NEON_ACCELERATION=enabled
ENV CONTAINER_MEMORY_LIMIT=4G
ENV CONTAINER_CPU_LIMIT=4
ENV PERFORMANCE_MONITORING=enabled

# === Network Configuration ===
# Expose ports for desktop automation services
# 5900: VNC server
# 6080: noVNC web interface
# 9990: Bytebot API service
EXPOSE 5900 6080 9990

# === Volume Mounts ===
# Persistent data and configuration volumes
VOLUME ["/opt/bytebot/data", "/opt/bytebot/logs", "/opt/bytebot/shared"]

# === Health Check ===
# Basic health check for container services
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pgrep -f Xvfb && pgrep -f x11vnc || exit 1

# === Startup Script ===
# Create simple startup script
RUN echo '#!/bin/bash\n\
echo "Starting Bytebot Desktop Container..."\n\
# Start supervisor to manage all services\n\
exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf\n\
' > /opt/bytebot/startup.sh && chmod +x /opt/bytebot/startup.sh

# === Working Directory ===
WORKDIR /opt/bytebot

# === Container Startup ===
# Use supervisor to manage desktop environment and services
CMD ["/opt/bytebot/startup.sh"]
