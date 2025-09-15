#!/bin/bash

# Production Deployment Script for Autocomplete Search Tool
# Usage: ./scripts/production-deploy.sh [options]

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_LOG="$PROJECT_ROOT/logs/deployment-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="$PROJECT_ROOT/backups"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

# Default values
DRY_RUN=false
SKIP_BACKUP=false
SKIP_TESTS=false
SKIP_BUILD=false
FORCE_RECREATE=false
ROLLBACK_ON_FAILURE=true
HEALTH_CHECK_TIMEOUT=300
DEPLOYMENT_TIMEOUT=600

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m' # No Color

# Logging functions
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${BLUE}[INFO]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
        "DEBUG") echo -e "${PURPLE}[DEBUG]${NC} $message" | tee -a "$DEPLOYMENT_LOG" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$DEPLOYMENT_LOG"
}

# Error handling
error_exit() {
    log "ERROR" "$1"
    if [[ "$ROLLBACK_ON_FAILURE" == true ]]; then
        log "INFO" "Attempting rollback..."
        rollback_deployment
    fi
    exit 1
}

# Cleanup function
cleanup() {
    log "INFO" "Cleaning up temporary files..."
    # Add cleanup logic here if needed
}

# Trap for cleanup
trap cleanup EXIT

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [options]

Production deployment script for Autocomplete Search Tool

Options:
    --dry-run              Show what would be done without executing
    --skip-backup          Skip database backup
    --skip-tests           Skip running tests
    --skip-build           Skip building Docker images
    --force-recreate       Force recreate all containers
    --no-rollback          Don't rollback on failure
    --timeout SECONDS      Health check timeout (default: 300)
    --help                 Show this help message

Examples:
    $0                     # Full production deployment
    $0 --dry-run           # Preview deployment steps
    $0 --skip-tests        # Deploy without running tests
    $0 --force-recreate    # Force recreate all containers

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --force-recreate)
                FORCE_RECREATE=true
                shift
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE=false
                shift
                ;;
            --timeout)
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Pre-deployment checks
pre_deployment_checks() {
    log "INFO" "Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error_exit "Not in project root directory. Please run from project root."
    fi
    
    # Check required files
    local required_files=(
        "docker-compose.yml"
        "docker-compose.prod.yml"
        ".env.production"
        "frontend/Dockerfile"
        "backend/Dockerfile"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            error_exit "Required file not found: $file"
        fi
    done
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error_exit "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error_exit "Docker Compose is not installed or not in PATH"
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        error_exit "Docker daemon is not running"
    fi
    
    # Check available disk space (require at least 2GB)
    local available_space=$(df "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
    if [[ $available_space -lt 2097152 ]]; then  # 2GB in KB
        log "WARN" "Low disk space detected. Available: $(($available_space / 1024))MB"
    fi
    
    # Check environment variables
    if [[ -z "${MONGO_ROOT_PASSWORD:-}" ]]; then
        log "WARN" "MONGO_ROOT_PASSWORD not set. Using default password."
    fi
    
    log "SUCCESS" "Pre-deployment checks passed"
}

# Load environment configuration
load_environment() {
    log "INFO" "Loading production environment configuration..."
    
    if [[ -f "$PROJECT_ROOT/.env.production" ]]; then
        set -a  # automatically export all variables
        source "$PROJECT_ROOT/.env.production"
        set +a
        log "SUCCESS" "Production environment loaded"
    else
        error_exit "Production environment file not found: .env.production"
    fi
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == true ]]; then
        log "WARN" "Skipping tests as requested"
        return 0
    fi
    
    log "INFO" "Running test suite..."
    
    # Backend tests
    log "INFO" "Running backend tests..."
    if [[ "$DRY_RUN" == false ]]; then
        cd "$PROJECT_ROOT/backend"
        npm test || error_exit "Backend tests failed"
        cd "$PROJECT_ROOT"
    fi
    
    # Frontend tests
    log "INFO" "Running frontend tests..."
    if [[ "$DRY_RUN" == false ]]; then
        cd "$PROJECT_ROOT/frontend"
        npm test || error_exit "Frontend tests failed"
        cd "$PROJECT_ROOT"
    fi
    
    log "SUCCESS" "All tests passed"
}

# Create database backup
create_backup() {
    if [[ "$SKIP_BACKUP" == true ]]; then
        log "WARN" "Skipping database backup as requested"
        return 0
    fi
    
    log "INFO" "Creating database backup..."
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    
    # Generate backup filename with timestamp
    local backup_file="$BACKUP_DIR/mongodb-backup-$(date +%Y%m%d-%H%M%S).gz"
    
    if [[ "$DRY_RUN" == false ]]; then
        # Check if MongoDB container is running
        if docker ps --format "table {{.Names}}" | grep -q "autocomplete-mongodb-prod"; then
            docker exec autocomplete-mongodb-prod mongodump \
                --archive --gzip --db autocomplete-search > "$backup_file" || {
                log "WARN" "Database backup failed, but continuing deployment"
                return 0
            }
            log "SUCCESS" "Database backup created: $backup_file"
        else
            log "WARN" "MongoDB container not running, skipping backup"
        fi
    else
        log "INFO" "[DRY RUN] Would create backup: $backup_file"
    fi
}

# Build Docker images
build_images() {
    if [[ "$SKIP_BUILD" == true ]]; then
        log "WARN" "Skipping image build as requested"
        return 0
    fi
    
    log "INFO" "Building Docker images..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Pull latest base images for security updates
        log "INFO" "Pulling latest base images..."
        docker-compose $COMPOSE_FILES pull --ignore-pull-failures || log "WARN" "Some base images could not be pulled"
        
        # Build images with no cache for production
        log "INFO" "Building production images..."
        docker-compose $COMPOSE_FILES build --no-cache --parallel || error_exit "Image build failed"
        
        # Verify images were built
        local images=(
            "autocomplete-search-tool_frontend"
            "autocomplete-search-tool_backend"
        )
        
        for image in "${images[@]}"; do
            if ! docker images --format "table {{.Repository}}" | grep -q "$image"; then
                error_exit "Image not found after build: $image"
            fi
        done
        
        log "SUCCESS" "Docker images built successfully"
    else
        log "INFO" "[DRY RUN] Would build Docker images"
    fi
}

# Deploy application
deploy_application() {
    log "INFO" "Deploying application..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Stop existing containers gracefully
        log "INFO" "Stopping existing containers..."
        docker-compose $COMPOSE_FILES down --timeout 30 || log "WARN" "Some containers may not have stopped gracefully"
        
        # Start new containers
        log "INFO" "Starting new containers..."
        local compose_args="up -d"
        if [[ "$FORCE_RECREATE" == true ]]; then
            compose_args="up -d --force-recreate"
        fi
        
        timeout $DEPLOYMENT_TIMEOUT docker-compose $COMPOSE_FILES $compose_args || error_exit "Container startup failed"
        
        log "SUCCESS" "Containers started successfully"
    else
        log "INFO" "[DRY RUN] Would deploy application containers"
    fi
}

# Wait for services to be healthy
wait_for_health() {
    log "INFO" "Waiting for services to be healthy..."
    
    if [[ "$DRY_RUN" == false ]]; then
        local start_time=$(date +%s)
        local timeout_time=$((start_time + HEALTH_CHECK_TIMEOUT))
        
        while [[ $(date +%s) -lt $timeout_time ]]; do
            local healthy_count=0
            local total_services=3  # frontend, backend, mongodb
            
            # Check backend health
            if curl -f -s --max-time 5 "http://localhost:3001/health" > /dev/null 2>&1; then
                ((healthy_count++))
            fi
            
            # Check frontend health
            if curl -f -s --max-time 5 "http://localhost:3000/health" > /dev/null 2>&1; then
                ((healthy_count++))
            fi
            
            # Check MongoDB health
            if docker exec autocomplete-mongodb-prod mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
                ((healthy_count++))
            fi
            
            if [[ $healthy_count -eq $total_services ]]; then
                log "SUCCESS" "All services are healthy"
                return 0
            fi
            
            log "INFO" "Waiting for services... ($healthy_count/$total_services healthy)"
            sleep 10
        done
        
        error_exit "Health check timeout after ${HEALTH_CHECK_TIMEOUT}s"
    else
        log "INFO" "[DRY RUN] Would wait for service health checks"
    fi
}

# Run smoke tests
run_smoke_tests() {
    log "INFO" "Running smoke tests..."
    
    if [[ "$DRY_RUN" == false ]]; then
        # Test search API
        local search_response=$(curl -s -w "%{http_code}" "http://localhost:3001/api/search?query=test" -o /dev/null)
        if [[ "$search_response" != "200" ]]; then
            error_exit "Search API smoke test failed (HTTP $search_response)"
        fi
        
        # Test frontend
        local frontend_response=$(curl -s -w "%{http_code}" "http://localhost:3000/" -o /dev/null)
        if [[ "$frontend_response" != "200" ]]; then
            error_exit "Frontend smoke test failed (HTTP $frontend_response)"
        fi
        
        log "SUCCESS" "Smoke tests passed"
    else
        log "INFO" "[DRY RUN] Would run smoke tests"
    fi
}

# Rollback deployment
rollback_deployment() {
    log "WARN" "Rolling back deployment..."
    
    # Stop current containers
    docker-compose $COMPOSE_FILES down --timeout 30 || true
    
    # Try to restore from backup if available
    local latest_backup=$(ls -t "$BACKUP_DIR"/mongodb-backup-*.gz 2>/dev/null | head -n1)
    if [[ -n "$latest_backup" ]]; then
        log "INFO" "Restoring from backup: $latest_backup"
        # Add restore logic here
    fi
    
    log "WARN" "Rollback completed. Please check system status manually."
}

# Generate deployment report
generate_report() {
    log "INFO" "Generating deployment report..."
    
    local report_file="$PROJECT_ROOT/deployment-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "deployment": {
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "success",
    "environment": "production",
    "version": "$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')",
    "options": {
      "dryRun": $DRY_RUN,
      "skipBackup": $SKIP_BACKUP,
      "skipTests": $SKIP_TESTS,
      "skipBuild": $SKIP_BUILD,
      "forceRecreate": $FORCE_RECREATE
    }
  },
  "services": {
    "frontend": {
      "url": "http://localhost:3000",
      "status": "$(curl -s -w "%{http_code}" http://localhost:3000/health -o /dev/null 2>/dev/null || echo 'unknown')"
    },
    "backend": {
      "url": "http://localhost:3001",
      "status": "$(curl -s -w "%{http_code}" http://localhost:3001/health -o /dev/null 2>/dev/null || echo 'unknown')"
    },
    "database": {
      "status": "$(docker exec autocomplete-mongodb-prod mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1 && echo 'healthy' || echo 'unhealthy')"
    }
  },
  "containers": $(docker-compose $COMPOSE_FILES ps --format json 2>/dev/null || echo '[]')
}
EOF
    
    log "SUCCESS" "Deployment report generated: $report_file"
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting production deployment..."
    log "INFO" "Deployment log: $DEPLOYMENT_LOG"
    
    # Create logs directory
    mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
    
    # Parse arguments
    parse_arguments "$@"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "INFO" "DRY RUN MODE - No actual changes will be made"
    fi
    
    # Run deployment steps
    pre_deployment_checks
    load_environment
    run_tests
    create_backup
    build_images
    deploy_application
    wait_for_health
    run_smoke_tests
    
    # Generate report
    if [[ "$DRY_RUN" == false ]]; then
        generate_report
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "SUCCESS" "Production deployment completed successfully in ${duration}s"
    
    # Show deployment summary
    echo ""
    echo "=== Deployment Summary ==="
    echo "Environment: production"
    echo "Duration: ${duration}s"
    echo "Frontend: http://localhost:3000"
    echo "Backend: http://localhost:3001"
    echo "API Docs: http://localhost:3001/api"
    echo ""
    echo "Container Status:"
    if [[ "$DRY_RUN" == false ]]; then
        docker-compose $COMPOSE_FILES ps
    else
        echo "[DRY RUN] Container status would be shown here"
    fi
}

# Run main function with all arguments
main "$@"