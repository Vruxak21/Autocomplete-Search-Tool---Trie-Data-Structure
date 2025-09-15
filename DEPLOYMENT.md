# Deployment Guide

This guide covers production deployment and configuration for the Autocomplete Search Tool.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Production Build](#production-build)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Troubleshooting](#troubleshooting)
- [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **Node.js**: Version 18 or higher (for local development)
- **Memory**: Minimum 2GB RAM, recommended 4GB+
- **Storage**: Minimum 5GB free space
- **Network**: Ports 80, 443, 3000, 3001, 27017 available

### Software Dependencies

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Environment Configuration

### Environment Files

The application uses environment-specific configuration files:

- `.env.development` - Development environment
- `.env.staging` - Staging environment  
- `.env.production` - Production environment

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Production Environment Configuration
NODE_ENV=production

# Server Configuration
PORT=3001
HOST=0.0.0.0

# MongoDB Configuration
MONGODB_URI=mongodb://admin:${MONGO_ROOT_PASSWORD}@mongodb:27017/autocomplete-search?authSource=admin
MONGODB_DB_NAME=autocomplete-search

# Security
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password-here
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Performance
CACHE_MAX_SIZE=10000
CACHE_TTL=600000

# SSL (if using HTTPS)
SSL_CERT_PATH=/etc/ssl/certs/cert.pem
SSL_KEY_PATH=/etc/ssl/private/key.pem
```

### Security Considerations

1. **Database Security**:
   - Use strong passwords for MongoDB
   - Enable authentication
   - Use SSL/TLS for database connections

2. **Application Security**:
   - Set proper CORS origins
   - Use HTTPS in production
   - Enable security headers (Helmet.js)

3. **Container Security**:
   - Run containers as non-root users
   - Use minimal base images
   - Keep images updated

## Production Build

### Automated Build

Use the provided build script:

```bash
# Linux/macOS
./scripts/build.sh --optimize

# Windows PowerShell
.\scripts\build.ps1 -Optimize
```

### Manual Build

```bash
# Install dependencies
npm run install:all

# Run tests
npm test

# Build frontend
cd frontend
npm run build
cd ..

# Backend doesn't require build (Node.js)
```

### Build Optimization

The production build includes:

- **Frontend Optimizations**:
  - Code minification and compression
  - Tree shaking to remove unused code
  - Asset optimization and caching
  - Bundle splitting for better loading

- **Backend Optimizations**:
  - Production dependencies only
  - Compression middleware enabled
  - Security headers configured
  - Performance monitoring

## Docker Deployment

### Quick Start

```bash
# Set required environment variables
export MONGO_ROOT_PASSWORD="your-secure-password"

# Deploy to production
./scripts/production-deploy.sh

# Or use PowerShell on Windows
.\scripts\production-deploy.ps1
```

### Step-by-Step Deployment

1. **Prepare Environment**:
   ```bash
   # Clone repository
   git clone <repository-url>
   cd autocomplete-search-tool
   
   # Set environment variables
   export MONGO_ROOT_PASSWORD="your-secure-password"
   export FRONTEND_URL="https://your-domain.com"
   ```

2. **Build Images**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
   ```

3. **Deploy Services**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

4. **Verify Deployment**:
   ```bash
   # Check container status
   docker-compose ps
   
   # Check logs
   docker-compose logs -f
   
   # Test endpoints
   curl http://localhost:3001/health
   curl http://localhost:3000/health
   ```

### Docker Compose Configuration

The production deployment uses multiple compose files:

- `docker-compose.yml` - Base configuration
- `docker-compose.prod.yml` - Production overrides

Key production features:

- **Resource Limits**: Memory and CPU limits for containers
- **Health Checks**: Automated health monitoring
- **Restart Policies**: Automatic container restart on failure
- **Security**: Non-root users, security headers
- **Networking**: Isolated container network
- **Volumes**: Persistent data storage

## Manual Deployment

### Frontend Deployment

1. **Build Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Deploy to Web Server**:
   ```bash
   # Copy build files to web server
   cp -r dist/* /var/www/html/
   
   # Configure nginx (example)
   sudo cp nginx.conf /etc/nginx/sites-available/autocomplete-search
   sudo ln -s /etc/nginx/sites-available/autocomplete-search /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

### Backend Deployment

1. **Prepare Backend**:
   ```bash
   cd backend
   npm install --production
   ```

2. **Configure Process Manager**:
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start src/server.js --name autocomplete-backend
   pm2 startup
   pm2 save
   ```

3. **Configure Reverse Proxy**:
   ```nginx
   # nginx configuration
   server {
       listen 80;
       server_name your-domain.com;
       
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
       
       location / {
           root /var/www/html;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

### Database Setup

1. **Install MongoDB**:
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb
   
   # Or use Docker
   docker run -d --name mongodb \
     -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     mongo:7-jammy
   ```

2. **Initialize Database**:
   ```bash
   cd backend
   npm run seed
   ```

## Monitoring and Health Checks

### Health Endpoints

- **Frontend**: `http://localhost:3000/health`
- **Backend**: `http://localhost:3001/health`
- **API Status**: `http://localhost:3001/api/performance`

### Container Health Checks

Docker containers include built-in health checks:

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"

# View health check logs
docker inspect --format='{{json .State.Health}}' container-name
```

### Monitoring Setup

1. **Log Aggregation**:
   ```bash
   # View application logs
   docker-compose logs -f backend
   docker-compose logs -f frontend
   
   # Export logs
   docker-compose logs --no-color > deployment.log
   ```

2. **Performance Monitoring**:
   - Memory usage: `docker stats`
   - Response times: Check `/api/performance` endpoint
   - Database performance: MongoDB monitoring tools

3. **Alerting**:
   - Set up monitoring for health endpoints
   - Configure alerts for container failures
   - Monitor disk space and memory usage

## Troubleshooting

### Common Issues

1. **Container Won't Start**:
   ```bash
   # Check logs
   docker-compose logs container-name
   
   # Check resource usage
   docker stats
   
   # Verify configuration
   docker-compose config
   ```

2. **Database Connection Issues**:
   ```bash
   # Test MongoDB connection
   docker exec -it mongodb-container mongosh
   
   # Check network connectivity
   docker network ls
   docker network inspect autocomplete-network
   ```

3. **Frontend Not Loading**:
   ```bash
   # Check nginx configuration
   docker exec -it frontend-container nginx -t
   
   # Verify build files
   docker exec -it frontend-container ls -la /usr/share/nginx/html
   ```

4. **API Errors**:
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # Test API endpoints
   curl -v http://localhost:3001/api/search?query=test
   ```

### Performance Issues

1. **Slow Response Times**:
   - Check memory usage: `docker stats`
   - Monitor database performance
   - Review application logs for bottlenecks

2. **High Memory Usage**:
   - Adjust container memory limits
   - Optimize Trie data structure size
   - Enable garbage collection monitoring

3. **Database Performance**:
   - Check MongoDB indexes
   - Monitor connection pool usage
   - Review query performance

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export LOG_LEVEL=debug
export ENABLE_DETAILED_ERRORS=true

# Restart containers
docker-compose restart
```

## Rollback Procedures

### Automated Rollback

The deployment script includes automatic rollback on failure:

```bash
# Deploy with rollback enabled (default)
./scripts/production-deploy.sh

# Deploy without rollback
./scripts/production-deploy.sh --no-rollback
```

### Manual Rollback

1. **Stop Current Deployment**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
   ```

2. **Restore Database Backup**:
   ```bash
   # List available backups
   ls -la backups/
   
   # Restore from backup
   docker exec -i mongodb-container mongorestore --archive --gzip < backups/mongodb-backup-YYYYMMDD-HHMMSS.gz
   ```

3. **Deploy Previous Version**:
   ```bash
   # Checkout previous version
   git checkout previous-tag
   
   # Rebuild and deploy
   ./scripts/production-deploy.sh
   ```

### Backup Strategy

1. **Automated Backups**:
   - Database backups before each deployment
   - Retention policy: Keep last 10 backups
   - Backup verification and testing

2. **Manual Backup**:
   ```bash
   # Create database backup
   docker exec mongodb-container mongodump --archive --gzip --db autocomplete-search > backup.gz
   
   # Create application backup
   tar -czf app-backup.tar.gz --exclude=node_modules .
   ```

## SSL/HTTPS Configuration

### Using Let's Encrypt

1. **Install Certbot**:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Update nginx Configuration**:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       # SSL configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
       ssl_prefer_server_ciphers off;
       
       # Security headers
       add_header Strict-Transport-Security "max-age=63072000" always;
       add_header X-Frame-Options DENY;
       add_header X-Content-Type-Options nosniff;
   }
   ```

### Custom SSL Certificates

1. **Place Certificates**:
   ```bash
   # Copy certificates to nginx/ssl directory
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

2. **Update Docker Compose**:
   ```yaml
   nginx:
     volumes:
       - ./nginx/ssl:/etc/nginx/ssl:ro
   ```

## Performance Optimization

### Production Optimizations

1. **Frontend**:
   - Enable gzip compression
   - Set proper cache headers
   - Use CDN for static assets
   - Optimize images and fonts

2. **Backend**:
   - Enable compression middleware
   - Implement response caching
   - Optimize database queries
   - Use connection pooling

3. **Database**:
   - Create appropriate indexes
   - Monitor query performance
   - Configure memory settings
   - Regular maintenance tasks

### Scaling Considerations

1. **Horizontal Scaling**:
   - Load balancer configuration
   - Multiple backend instances
   - Database replication
   - Session management

2. **Vertical Scaling**:
   - Increase container resources
   - Optimize memory usage
   - CPU performance tuning
   - Storage optimization

## Security Checklist

- [ ] Strong database passwords
- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] CORS properly configured
- [ ] Container security (non-root users)
- [ ] Regular security updates
- [ ] Access logging enabled
- [ ] Rate limiting configured
- [ ] Input validation implemented
- [ ] Error handling (no sensitive data exposure)

## Maintenance

### Regular Tasks

1. **Weekly**:
   - Check application logs
   - Monitor performance metrics
   - Verify backup integrity

2. **Monthly**:
   - Update base Docker images
   - Review security patches
   - Clean up old backups
   - Performance optimization review

3. **Quarterly**:
   - Security audit
   - Dependency updates
   - Disaster recovery testing
   - Capacity planning review

### Update Procedures

1. **Application Updates**:
   ```bash
   # Pull latest code
   git pull origin main
   
   # Run deployment
   ./scripts/production-deploy.sh
   ```

2. **Security Updates**:
   ```bash
   # Update base images
   docker-compose pull
   
   # Rebuild with latest patches
   docker-compose build --no-cache
   ```

For additional support or questions, please refer to the project documentation or contact the development team.