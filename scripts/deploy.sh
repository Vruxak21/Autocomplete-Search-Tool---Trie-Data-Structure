#!/bin/bash

# Deployment script for Autocomplete Search Tool
# Usage: ./scripts/deploy.sh [environment] [options]

set -e

# Default values
ENVIRONMENT="production"
BUILD_IMAGES=true
PULL_LATEST=false
SKIP_TESTS=false
BACKUP_DB=true

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[DEPLOY]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Environments:"
    echo "  production  Deploy to production (default)"
    echo "  staging     Deploy to staging"
    echo ""
    echo "Options:"
    echo "  --no-build      Skip building Docker images"
    echo "  --pull-latest   Pull latest base images before building"
    echo "  --skip-tests    Skip running tests before deployment"
    echo "  --no-backup     Skip database backup"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Deploy to production"
    echo "  $0 staging                  # Deploy to staging"
    echo "  $0 production --no-build    # Deploy without rebuilding images"
    echo "  $0 staging --skip-tests     # Deploy to staging without tests"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        production|staging)
            ENVIRONMENT="$1"
            shift
            ;;
        --no-build)
            BUILD_IMAGES=false
            shift
            ;;
        --pull-latest)
            PULL_LATEST=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-backup)
            BACKUP_DB=false
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

print_status "Starting deployment to $ENVIRONMENT environment"

# Check if required files exist
if [[ ! -f "docker-compose.yml" ]]; then
    print_error "docker-compose.yml not found. Please run from project root."
    exit 1
fi

if [[ ! -f ".env.$ENVIRONMENT" ]]; then
    print_error ".env.$ENVIRONMENT file not found."
    exit 1
fi

# Load environment variables
print_status "Loading environment configuration..."
export $(cat .env.$ENVIRONMENT | grep -v '^#' | xargs)

# Pre-deployment checks
print_status "Running pre-deployment checks..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
fi

print_success "Pre-deployment checks passed"

# Run tests
if [[ "$SKIP_TESTS" == false ]]; then
    print_status "Running tests..."
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    npm test
    cd ..
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm test
    cd ..
    
    print_success "All tests passed"
else
    print_warning "Skipping tests as requested"
fi

# Backup database
if [[ "$BACKUP_DB" == true && "$ENVIRONMENT" == "production" ]]; then
    print_status "Creating database backup..."
    
    # Create backup directory
    mkdir -p backups
    
    # Generate backup filename with timestamp
    BACKUP_FILE="backups/mongodb-backup-$(date +%Y%m%d-%H%M%S).gz"
    
    # Create MongoDB backup (if container is running)
    if docker ps | grep -q "autocomplete-mongodb"; then
        docker exec autocomplete-mongodb-prod mongodump --archive --gzip --db autocomplete-search > "$BACKUP_FILE"
        print_success "Database backup created: $BACKUP_FILE"
    else
        print_warning "MongoDB container not running, skipping backup"
    fi
fi

# Pull latest base images
if [[ "$PULL_LATEST" == true ]]; then
    print_status "Pulling latest base images..."
    docker-compose pull
fi

# Build images
if [[ "$BUILD_IMAGES" == true ]]; then
    print_status "Building Docker images..."
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    print_success "Docker images built successfully"
else
    print_warning "Skipping image build as requested"
fi

# Stop existing containers
print_status "Stopping existing containers..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
else
    docker-compose down
fi

# Start new containers
print_status "Starting containers..."
if [[ "$ENVIRONMENT" == "production" ]]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
else
    docker-compose up -d
fi

# Wait for services to be healthy
print_status "Waiting for services to be healthy..."
sleep 30

# Health checks
print_status "Running health checks..."

# Check backend health
BACKEND_URL="http://localhost:3001/health"
if curl -f -s "$BACKEND_URL" > /dev/null; then
    print_success "Backend is healthy"
else
    print_error "Backend health check failed"
    exit 1
fi

# Check frontend health
FRONTEND_URL="http://localhost:3000/health"
if curl -f -s "$FRONTEND_URL" > /dev/null; then
    print_success "Frontend is healthy"
else
    print_error "Frontend health check failed"
    exit 1
fi

# Check MongoDB health
if docker ps | grep -q "autocomplete-mongodb"; then
    if docker exec autocomplete-mongodb-${ENVIRONMENT} mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_success "MongoDB is healthy"
    else
        print_error "MongoDB health check failed"
        exit 1
    fi
fi

# Show deployment summary
print_success "Deployment completed successfully!"
echo ""
echo "Deployment Summary:"
echo "  Environment: $ENVIRONMENT"
echo "  Frontend URL: http://localhost:3000"
echo "  Backend URL: http://localhost:3001"
echo "  API Documentation: http://localhost:3001/api"
echo ""
echo "Container Status:"
docker-compose ps

# Show logs for troubleshooting
print_status "Recent logs (last 50 lines):"
if [[ "$ENVIRONMENT" == "production" ]]; then
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=50
else
    docker-compose logs --tail=50
fi

print_success "Deployment script completed!"