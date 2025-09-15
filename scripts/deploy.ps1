# PowerShell Deployment script for Autocomplete Search Tool
# Usage: .\scripts\deploy.ps1 [environment] [options]

param(
    [string]$Environment = "production",
    [switch]$NoBuild,
    [switch]$PullLatest,
    [switch]$SkipTests,
    [switch]$NoBackup,
    [switch]$Help
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[DEPLOY] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to show usage
function Show-Usage {
    Write-Host "Usage: .\scripts\deploy.ps1 [environment] [options]"
    Write-Host ""
    Write-Host "Environments:"
    Write-Host "  production  Deploy to production (default)"
    Write-Host "  staging     Deploy to staging"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -NoBuild      Skip building Docker images"
    Write-Host "  -PullLatest   Pull latest base images before building"
    Write-Host "  -SkipTests    Skip running tests before deployment"
    Write-Host "  -NoBackup     Skip database backup"
    Write-Host "  -Help         Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\deploy.ps1                          # Deploy to production"
    Write-Host "  .\scripts\deploy.ps1 staging                  # Deploy to staging"
    Write-Host "  .\scripts\deploy.ps1 production -NoBuild      # Deploy without rebuilding images"
    Write-Host "  .\scripts\deploy.ps1 staging -SkipTests       # Deploy to staging without tests"
}

if ($Help) {
    Show-Usage
    exit 0
}

Write-Status "Starting deployment to $Environment environment"

# Check if required files exist
if (-not (Test-Path "docker-compose.yml")) {
    Write-Error "docker-compose.yml not found. Please run from project root."
    exit 1
}

if (-not (Test-Path ".env.$Environment")) {
    Write-Error ".env.$Environment file not found."
    exit 1
}

# Pre-deployment checks
Write-Status "Running pre-deployment checks..."

# Check Docker
try {
    docker --version | Out-Null
} catch {
    Write-Error "Docker is not installed or not in PATH"
    exit 1
}

try {
    docker-compose --version | Out-Null
} catch {
    Write-Error "Docker Compose is not installed or not in PATH"
    exit 1
}

# Check if Docker daemon is running
try {
    docker info | Out-Null
} catch {
    Write-Error "Docker daemon is not running"
    exit 1
}

Write-Success "Pre-deployment checks passed"

# Run tests
if (-not $SkipTests) {
    Write-Status "Running tests..."
    
    # Backend tests
    Write-Status "Running backend tests..."
    Push-Location backend
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend tests failed"
        Pop-Location
        exit 1
    }
    Pop-Location
    
    # Frontend tests
    Write-Status "Running frontend tests..."
    Push-Location frontend
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend tests failed"
        Pop-Location
        exit 1
    }
    Pop-Location
    
    Write-Success "All tests passed"
} else {
    Write-Warning "Skipping tests as requested"
}

# Backup database
if (-not $NoBackup -and $Environment -eq "production") {
    Write-Status "Creating database backup..."
    
    # Create backup directory
    if (-not (Test-Path "backups")) {
        New-Item -ItemType Directory -Path "backups" | Out-Null
    }
    
    # Generate backup filename with timestamp
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backups\mongodb-backup-$timestamp.gz"
    
    # Create MongoDB backup (if container is running)
    $mongoContainer = docker ps --filter "name=autocomplete-mongodb" --format "{{.Names}}"
    if ($mongoContainer) {
        docker exec $mongoContainer mongodump --archive --gzip --db autocomplete-search > $backupFile
        Write-Success "Database backup created: $backupFile"
    } else {
        Write-Warning "MongoDB container not running, skipping backup"
    }
}

# Pull latest base images
if ($PullLatest) {
    Write-Status "Pulling latest base images..."
    docker-compose pull
}

# Build images
if (-not $NoBuild) {
    Write-Status "Building Docker images..."
    
    if ($Environment -eq "production") {
        docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
    } else {
        docker-compose build --no-cache
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker image build failed"
        exit 1
    }
    
    Write-Success "Docker images built successfully"
} else {
    Write-Warning "Skipping image build as requested"
}

# Stop existing containers
Write-Status "Stopping existing containers..."
if ($Environment -eq "production") {
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
} else {
    docker-compose down
}

# Start new containers
Write-Status "Starting containers..."
if ($Environment -eq "production") {
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
} else {
    docker-compose up -d
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start containers"
    exit 1
}

# Wait for services to be healthy
Write-Status "Waiting for services to be healthy..."
Start-Sleep -Seconds 30

# Health checks
Write-Status "Running health checks..."

# Check backend health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "Backend is healthy"
    } else {
        Write-Error "Backend health check failed"
        exit 1
    }
} catch {
    Write-Error "Backend health check failed: $($_.Exception.Message)"
    exit 1
}

# Check frontend health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Success "Frontend is healthy"
    } else {
        Write-Error "Frontend health check failed"
        exit 1
    }
} catch {
    Write-Error "Frontend health check failed: $($_.Exception.Message)"
    exit 1
}

# Check MongoDB health
$mongoContainer = docker ps --filter "name=autocomplete-mongodb" --format "{{.Names}}"
if ($mongoContainer) {
    try {
        docker exec $mongoContainer mongosh --eval "db.adminCommand('ping')" | Out-Null
        Write-Success "MongoDB is healthy"
    } catch {
        Write-Error "MongoDB health check failed"
        exit 1
    }
}

# Show deployment summary
Write-Success "Deployment completed successfully!"
Write-Host ""
Write-Host "Deployment Summary:"
Write-Host "  Environment: $Environment"
Write-Host "  Frontend URL: http://localhost:3000"
Write-Host "  Backend URL: http://localhost:3001"
Write-Host "  API Documentation: http://localhost:3001/api"
Write-Host ""
Write-Host "Container Status:"
docker-compose ps

# Show logs for troubleshooting
Write-Status "Recent logs (last 50 lines):"
if ($Environment -eq "production") {
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=50
} else {
    docker-compose logs --tail=50
}

Write-Success "Deployment script completed!"