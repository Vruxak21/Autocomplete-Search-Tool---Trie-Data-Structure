# Frontend Dockerfile - Multi-stage build for production optimization
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev && npm cache clean --force

# Copy source code
COPY . .

# Set build environment
ENV NODE_ENV=production

# Build the application with production optimizations
RUN npm run build

# Verify build output
RUN ls -la dist/ && \
    test -f dist/index.html || (echo "Build failed: index.html not found" && exit 1)

# Production stage - optimized nginx
FROM nginx:1.25-alpine AS production

# Install security updates and utilities
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    wget \
    tzdata && \
    rm -rf /var/cache/apk/*

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    mkdir -p /var/cache/nginx/fastcgi_temp && \
    mkdir -p /var/cache/nginx/uwsgi_temp && \
    mkdir -p /var/cache/nginx/scgi_temp

# Create non-root user for security
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx

# Set proper ownership and permissions
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown nginx:nginx /var/run/nginx.pid && \
    chmod 755 /usr/share/nginx/html

# Switch to non-root user
USER nginx

# Expose port
EXPOSE 3000

# Add labels for better container management
LABEL maintainer="Autocomplete Search Tool" \
      version="1.0.0" \
      description="Production-optimized frontend for autocomplete search tool"

# Health check with improved reliability
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider --timeout=5 http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start nginx with optimized configuration
CMD ["nginx", "-g", "daemon off;"]