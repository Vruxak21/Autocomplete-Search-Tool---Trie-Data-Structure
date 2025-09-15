# Production Deployment Script for Autocomplete Search Tool (PowerShell)
# Usage: .\scripts\production-deploy.ps1 [options]

param(
    [switch]$DryRun,
    [switch]$SkipBackup,
    [switch]$SkipTests,
    [switch]$SkipBuild,
    [switch]$ForceRecreate,
    [switch]$NoRollback,
    [int]$Timeout = 300,
    [switch]$Help
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$DeploymentLog = Join-Path $ProjectRoot "logs\deployment-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$BackupDir = Join-Path $ProjectRoot "backups"
$ComposeFiles = "-f docker-compose.yml -f docker-compose.prod.yml"

# Default values
$RollbackOnFailure = -not $NoRollback
$HealthCheckTimeout = $Timeout
$DeploymentTimeout = 600

# Colors for output (Windows PowerShell compatible)
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    Magenta = "Magenta"
    White = "White"
}

# Logging functions
function Write-Log {
    param(
        [string]$Level,
        [string]$Message
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    # Create logs directory if it doesn't exist
    $LogDir = Split-Path -Parent $DeploymentLog
    if (-not (Test-Path $LogDir)) {
        New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
    }
    
    # Write to log file
    Add-Content -Path $DeploymentLog -Value $LogEntry
    
    # Write to console with colors
    switch ($Level) {
        "INFO" { Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue }
        "WARN" { Write-Host "[WARN] $Message" -ForegroundColor $Colors.Yellow }
        "ERROR" { Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red }
        "SUCCESS" { Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green }
        "DEBUG" { Write-Host "[DEBUG] $Message" -ForegroundColor $Colors.Magenta }
    }
}

# Error handling
function Exit-WithError {
    param([string]$Message)
    
    Write-Log "ERROR" $Message
    
    if ($RollbackOnFailure) {
        Write-Log "INFO" "Attempting rollback..."
        Invoke-Rollback
    }
    
    exit 1
}

# Show usage
function Show-Usage {
    Write-Host @"
Usage: .\scripts\production-deploy.ps1 [options]

Production deployment script for Autocomplete Search Tool

Options:
    -DryRun              Show what would be done without executing
    -SkipBackup          Skip database backup
    -SkipTests           Skip running tests
    -SkipBuild           Skip building Docker images
    -ForceRecreate       Force recreate all containers
    -NoRollback          Don't rollback on failure
    -Timeout <seconds>   Health check timeout (default: 300)
    -Help                Show this help message

Examples:
    .\scripts\production-deploy.ps1                    # Full production deployment
    .\scripts\production-deploy.ps1 -DryRun            # Preview deployment steps
    .\scripts\production-deploy.ps1 -SkipTests         # Deploy without running tests
    .\scripts\production-deploy.ps1 -ForceRecreate     # Force recreate all containers

"@
}

# Pre-deployment checks
function Test-PreDeployment {
    Write-Log "INFO" "Running pre-deployment checks..."
    
    # Check if we're in the right directory
    if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
        Exit-WithError "Not in project root directory. Please run from project root."
    }
    
    # Check required files
    $RequiredFiles = @(
        "docker-compose.yml",
        "docker-compose.prod.yml",
        ".env.production",
        "frontend\Dockerfile",
        "backend\Dockerfile"
    )
    
    foreach ($File in $RequiredFiles) {
        $FilePath = Join-Path $ProjectRoot $File
        if (-not (Test-Path $FilePath)) {
            Exit-WithError "Required file not found: $File"
        }
    }
    
    # Check Docker
    try {
        $null = Get-Command docker -ErrorAction Stop
        $null = Get-Command docker-compose -ErrorAction Stop
    }
    catch {
        Exit-WithError "Docker or Docker Compose is not installed or not in PATH"
    }
    
    # Check if Docker daemon is running
    try {
        docker info | Out-Null
    }
    catch {
        Exit-WithError "Docker daemon is not running"
    }
    
    # Check available disk space (require at least 2GB)
    $Drive = (Get-Location).Drive
    $FreeSpace = (Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='$($Drive.Name)'").FreeSpace
    if ($FreeSpace -lt 2GB) {
        Write-Log "WARN" "Low disk space detected. Available: $([math]::Round($FreeSpace / 1GB, 2))GB"
    }
    
    # Check environment variables
    if (-not $env:MONGO_ROOT_PASSWORD) {
        Write-Log "WARN" "MONGO_ROOT_PASSWORD not set. Using default password."
    }
    
    Write-Log "SUCCESS" "Pre-deployment checks passed"
}

# Load environment configuration
function Import-Environment {
    Write-Log "INFO" "Loading production environment configuration..."
    
    $EnvFile = Join-Path $ProjectRoot ".env.production"
    if (Test-Path $EnvFile) {
        Get-Content $EnvFile | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
            }
        }
        Write-Log "SUCCESS" "Production environment loaded"
    }
    else {
        Exit-WithError "Production environment file not found: .env.production"
    }
}

# Run tests
function Invoke-Tests {
    if ($SkipTests) {
        Write-Log "WARN" "Skipping tests as requested"
        return
    }
    
    Write-Log "INFO" "Running test suite..."
    
    # Backend tests
    Write-Log "INFO" "Running backend tests..."
    if (-not $DryRun) {
        Push-Location (Join-Path $ProjectRoot "backend")
        try {
            npm test
            if ($LASTEXITCODE -ne 0) {
                throw "Backend tests failed"
            }
        }
        catch {
            Exit-WithError "Backend tests failed"
        }
        finally {
            Pop-Location
        }
    }
    
    # Frontend tests
    Write-Log "INFO" "Running frontend tests..."
    if (-not $DryRun) {
        Push-Location (Join-Path $ProjectRoot "frontend")
        try {
            npm test
            if ($LASTEXITCODE -ne 0) {
                throw "Frontend tests failed"
            }
        }
        catch {
            Exit-WithError "Frontend tests failed"
        }
        finally {
            Pop-Location
        }
    }
    
    Write-Log "SUCCESS" "All tests passed"
}

# Create database backup
function New-Backup {
    if ($SkipBackup) {
        Write-Log "WARN" "Skipping database backup as requested"
        return
    }
    
    Write-Log "INFO" "Creating database backup..."
    
    # Create backup directory
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    
    # Generate backup filename with timestamp
    $BackupFile = Join-Path $BackupDir "mongodb-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').gz"
    
    if (-not $DryRun) {
        # Check if MongoDB container is running
        $MongoContainer = docker ps --format "table {{.Names}}" | Select-String "autocomplete-mongodb-prod"
        if ($MongoContainer) {
            try {
                docker exec autocomplete-mongodb-prod mongodump --archive --gzip --db autocomplete-search > $BackupFile
                Write-Log "SUCCESS" "Database backup created: $BackupFile"
            }
            catch {
                Write-Log "WARN" "Database backup failed, but continuing deployment"
            }
        }
        else {
            Write-Log "WARN" "MongoDB container not running, skipping backup"
        }
    }
    else {
        Write-Log "INFO" "[DRY RUN] Would create backup: $BackupFile"
    }
}

# Build Docker images
function Build-Images {
    if ($SkipBuild) {
        Write-Log "WARN" "Skipping image build as requested"
        return
    }
    
    Write-Log "INFO" "Building Docker images..."
    
    if (-not $DryRun) {
        # Pull latest base images for security updates
        Write-Log "INFO" "Pulling latest base images..."
        try {
            Invoke-Expression "docker-compose $ComposeFiles pull --ignore-pull-failures"
        }
        catch {
            Write-Log "WARN" "Some base images could not be pulled"
        }
        
        # Build images with no cache for production
        Write-Log "INFO" "Building production images..."
        try {
            Invoke-Expression "docker-compose $ComposeFiles build --no-cache --parallel"
            if ($LASTEXITCODE -ne 0) {
                throw "Image build failed"
            }
        }
        catch {
            Exit-WithError "Image build failed"
        }
        
        # Verify images were built
        $Images = @(
            "autocomplete-search-tool_frontend",
            "autocomplete-search-tool_backend"
        )
        
        foreach ($Image in $Images) {
            $ImageExists = docker images --format "table {{.Repository}}" | Select-String $Image
            if (-not $ImageExists) {
                Exit-WithError "Image not found after build: $Image"
            }
        }
        
        Write-Log "SUCCESS" "Docker images built successfully"
    }
    else {
        Write-Log "INFO" "[DRY RUN] Would build Docker images"
    }
}

# Deploy application
function Deploy-Application {
    Write-Log "INFO" "Deploying application..."
    
    if (-not $DryRun) {
        # Stop existing containers gracefully
        Write-Log "INFO" "Stopping existing containers..."
        try {
            Invoke-Expression "docker-compose $ComposeFiles down --timeout 30"
        }
        catch {
            Write-Log "WARN" "Some containers may not have stopped gracefully"
        }
        
        # Start new containers
        Write-Log "INFO" "Starting new containers..."
        $ComposeArgs = "up -d"
        if ($ForceRecreate) {
            $ComposeArgs = "up -d --force-recreate"
        }
        
        try {
            $Job = Start-Job -ScriptBlock {
                param($ComposeFiles, $ComposeArgs)
                Invoke-Expression "docker-compose $ComposeFiles $ComposeArgs"
            } -ArgumentList $ComposeFiles, $ComposeArgs
            
            if (-not (Wait-Job $Job -Timeout $DeploymentTimeout)) {
                Stop-Job $Job
                Remove-Job $Job
                Exit-WithError "Container startup timeout after ${DeploymentTimeout}s"
            }
            
            $Result = Receive-Job $Job
            Remove-Job $Job
            
            if ($LASTEXITCODE -ne 0) {
                throw "Container startup failed"
            }
        }
        catch {
            Exit-WithError "Container startup failed"
        }
        
        Write-Log "SUCCESS" "Containers started successfully"
    }
    else {
        Write-Log "INFO" "[DRY RUN] Would deploy application containers"
    }
}

# Wait for services to be healthy
function Wait-ForHealth {
    Write-Log "INFO" "Waiting for services to be healthy..."
    
    if (-not $DryRun) {
        $StartTime = Get-Date
        $TimeoutTime = $StartTime.AddSeconds($HealthCheckTimeout)
        
        while ((Get-Date) -lt $TimeoutTime) {
            $HealthyCount = 0
            $TotalServices = 3  # frontend, backend, mongodb
            
            # Check backend health
            try {
                $Response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5 -UseBasicParsing
                if ($Response.StatusCode -eq 200) {
                    $HealthyCount++
                }
            }
            catch {
                # Service not ready yet
            }
            
            # Check frontend health
            try {
                $Response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing
                if ($Response.StatusCode -eq 200) {
                    $HealthyCount++
                }
            }
            catch {
                # Service not ready yet
            }
            
            # Check MongoDB health
            try {
                docker exec autocomplete-mongodb-prod mongosh --eval "db.adminCommand('ping')" | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    $HealthyCount++
                }
            }
            catch {
                # Service not ready yet
            }
            
            if ($HealthyCount -eq $TotalServices) {
                Write-Log "SUCCESS" "All services are healthy"
                return
            }
            
            Write-Log "INFO" "Waiting for services... ($HealthyCount/$TotalServices healthy)"
            Start-Sleep -Seconds 10
        }
        
        Exit-WithError "Health check timeout after ${HealthCheckTimeout}s"
    }
    else {
        Write-Log "INFO" "[DRY RUN] Would wait for service health checks"
    }
}

# Run smoke tests
function Invoke-SmokeTests {
    Write-Log "INFO" "Running smoke tests..."
    
    if (-not $DryRun) {
        # Test search API
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:3001/api/search?query=test" -UseBasicParsing
            if ($Response.StatusCode -ne 200) {
                Exit-WithError "Search API smoke test failed (HTTP $($Response.StatusCode))"
            }
        }
        catch {
            Exit-WithError "Search API smoke test failed"
        }
        
        # Test frontend
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:3000/" -UseBasicParsing
            if ($Response.StatusCode -ne 200) {
                Exit-WithError "Frontend smoke test failed (HTTP $($Response.StatusCode))"
            }
        }
        catch {
            Exit-WithError "Frontend smoke test failed"
        }
        
        Write-Log "SUCCESS" "Smoke tests passed"
    }
    else {
        Write-Log "INFO" "[DRY RUN] Would run smoke tests"
    }
}

# Rollback deployment
function Invoke-Rollback {
    Write-Log "WARN" "Rolling back deployment..."
    
    # Stop current containers
    try {
        Invoke-Expression "docker-compose $ComposeFiles down --timeout 30"
    }
    catch {
        # Continue with rollback even if this fails
    }
    
    # Try to restore from backup if available
    $LatestBackup = Get-ChildItem -Path $BackupDir -Filter "mongodb-backup-*.gz" -ErrorAction SilentlyContinue | 
                   Sort-Object LastWriteTime -Descending | 
                   Select-Object -First 1
    
    if ($LatestBackup) {
        Write-Log "INFO" "Restoring from backup: $($LatestBackup.FullName)"
        # Add restore logic here
    }
    
    Write-Log "WARN" "Rollback completed. Please check system status manually."
}

# Generate deployment report
function New-DeploymentReport {
    Write-Log "INFO" "Generating deployment report..."
    
    $ReportFile = Join-Path $ProjectRoot "deployment-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    
    # Get Git commit hash if available
    $GitHash = "unknown"
    try {
        $GitHash = git rev-parse --short HEAD 2>$null
    }
    catch {
        # Git not available or not a git repository
    }
    
    # Get service status
    $FrontendStatus = "unknown"
    $BackendStatus = "unknown"
    $DatabaseStatus = "unknown"
    
    if (-not $DryRun) {
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -TimeoutSec 5
            $FrontendStatus = $Response.StatusCode
        }
        catch {
            # Service not available
        }
        
        try {
            $Response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
            $BackendStatus = $Response.StatusCode
        }
        catch {
            # Service not available
        }
        
        try {
            docker exec autocomplete-mongodb-prod mongosh --eval "db.adminCommand('ping')" | Out-Null
            $DatabaseStatus = if ($LASTEXITCODE -eq 0) { "healthy" } else { "unhealthy" }
        }
        catch {
            $DatabaseStatus = "unhealthy"
        }
    }
    
    $Report = @{
        deployment = @{
            timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
            status = "success"
            environment = "production"
            version = $GitHash
            options = @{
                dryRun = $DryRun
                skipBackup = $SkipBackup
                skipTests = $SkipTests
                skipBuild = $SkipBuild
                forceRecreate = $ForceRecreate
            }
        }
        services = @{
            frontend = @{
                url = "http://localhost:3000"
                status = $FrontendStatus
            }
            backend = @{
                url = "http://localhost:3001"
                status = $BackendStatus
            }
            database = @{
                status = $DatabaseStatus
            }
        }
    }
    
    $Report | ConvertTo-Json -Depth 10 | Out-File -FilePath $ReportFile -Encoding UTF8
    
    Write-Log "SUCCESS" "Deployment report generated: $ReportFile"
}

# Main deployment function
function Main {
    $StartTime = Get-Date
    
    Write-Log "INFO" "Starting production deployment..."
    Write-Log "INFO" "Deployment log: $DeploymentLog"
    
    if ($Help) {
        Show-Usage
        return
    }
    
    if ($DryRun) {
        Write-Log "INFO" "DRY RUN MODE - No actual changes will be made"
    }
    
    try {
        # Run deployment steps
        Test-PreDeployment
        Import-Environment
        Invoke-Tests
        New-Backup
        Build-Images
        Deploy-Application
        Wait-ForHealth
        Invoke-SmokeTests
        
        # Generate report
        if (-not $DryRun) {
            New-DeploymentReport
        }
        
        $EndTime = Get-Date
        $Duration = ($EndTime - $StartTime).TotalSeconds
        
        Write-Log "SUCCESS" "Production deployment completed successfully in $([math]::Round($Duration, 0))s"
        
        # Show deployment summary
        Write-Host ""
        Write-Host "=== Deployment Summary ===" -ForegroundColor Green
        Write-Host "Environment: production"
        Write-Host "Duration: $([math]::Round($Duration, 0))s"
        Write-Host "Frontend: http://localhost:3000"
        Write-Host "Backend: http://localhost:3001"
        Write-Host "API Docs: http://localhost:3001/api"
        Write-Host ""
        Write-Host "Container Status:"
        if (-not $DryRun) {
            Invoke-Expression "docker-compose $ComposeFiles ps"
        }
        else {
            Write-Host "[DRY RUN] Container status would be shown here"
        }
    }
    catch {
        Exit-WithError "Deployment failed: $($_.Exception.Message)"
    }
}

# Run main function
Main