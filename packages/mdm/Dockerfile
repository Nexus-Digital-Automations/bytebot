# Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages/mdm/package.json ./packages/mdm/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
WORKDIR /app/packages/mdm
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

# Install pnpm and required packages
RUN npm install -g pnpm && \
    apk add --no-cache \
    sqlite \
    curl \
    tini

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mdm -u 1001

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY --from=builder /app/packages/mdm/package.json ./
COPY --from=builder /app/packages/mdm/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/packages/mdm/dist ./dist
COPY --from=builder /app/packages/mdm/src/migrations ./dist/migrations

# Create data directories
RUN mkdir -p /app/data /app/logs /app/uploads && \
    chown -R mdm:nodejs /app

# Copy health check script
COPY --from=builder /app/packages/mdm/scripts/healthcheck.sh ./healthcheck.sh
RUN chmod +x ./healthcheck.sh

# Switch to non-root user
USER mdm

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD ./healthcheck.sh

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/main.js"]