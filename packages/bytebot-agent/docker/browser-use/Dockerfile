# Browser-Use Service Dockerfile
# Python-based browser automation service for bytebot platform
# Includes Chrome, browser-use framework, and MCP server capabilities

FROM python:3.11-slim

# Install system dependencies for Chrome and browser automation
RUN apt-get update && apt-get install -y \
    # Chrome dependencies
    wget \
    gnupg \
    curl \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libxss1 \
    libgconf-2-4 \
    libxkbcommon0 \
    libgtk-4-1 \
    # Additional automation tools
    git \
    build-essential \
    # Process management
    supervisor \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Install Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Create application user and directories
RUN useradd -m -s /bin/bash browser-user \
    && mkdir -p /app/data/browser-use \
    && mkdir -p /app/data/chrome-user-data \
    && mkdir -p /app/data/screenshots \
    && mkdir -p /app/logs \
    && chown -R browser-user:browser-user /app

WORKDIR /app

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create supervisor configuration
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set permissions
RUN chown -R browser-user:browser-user /app \
    && chmod +x /app/docker/scripts/*.sh

# Switch to application user
USER browser-user

# Environment variables
ENV PYTHONPATH=/app \
    CHROME_EXECUTABLE_PATH=/usr/bin/google-chrome \
    DISPLAY=:99 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

# Expose ports
EXPOSE 8080 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Start services via supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]