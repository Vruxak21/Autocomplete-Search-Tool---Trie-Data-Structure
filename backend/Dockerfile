# Backend Dockerfile - Production optimized
FROM node:18-alpine AS base

# Install security updates and build dependencies
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    tzdata && \
    rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Create app directory
WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy application code
COPY . .

# Create data directory for CSV files
RUN mkdir -p /app/data

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set proper ownership and permissions
RUN chown -R nodejs:nodejs /app && \
    chmod -R 755 /app && \
    chmod -R 644 /app/src && \
    chmod +x /app/scripts/*.js

# Switch to non-root user
USER nodejs

# Set production environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Expose port
EXPOSE 3001

# Add labels for better container management
LABEL maintainer="Autocomplete Search Tool" \
      version="1.0.0" \
      description="Production-optimized backend API for autocomplete search tool"

# Enhanced health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e " \
    const http = require('http'); \
    const options = { \
      hostname: 'localhost', \
      port: 3001, \
      path: '/health', \
      timeout: 5000 \
    }; \
    const req = http.request(options, (res) => { \
      process.exit(res.statusCode === 200 ? 0 : 1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end(); \
  "

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application with production optimizations
CMD ["node", "--max-old-space-size=512", "src/server.js"]