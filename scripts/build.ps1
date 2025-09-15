# PowerShell Build script for Autocomplete Search Tool
# Usage: .\scripts\build.ps1 [options]

param(
    [switch]$FrontendOnly,
    [switch]$BackendOnly,
    [switch]$SkipTests,
    [switch]$Optimize,
    [switch]$Help
)

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[BUILD] $Message" -ForegroundColor Blue
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
    Write-Host "Usage: .\scripts\build.ps1 [options]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -FrontendOnly    Build only frontend"
    Write-Host "  -BackendOnly     Build only backend"
    Write-Host "  -SkipTests       Skip running tests"
    Write-Host "  -Optimize        Enable production optimizations"
    Write-Host "  -Help            Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\scripts\build.ps1                    # Build both frontend and backend"
    Write-Host "  .\scripts\build.ps1 -FrontendOnly      # Build only frontend"
    Write-Host "  .\scripts\build.ps1 -Optimize          # Build with production optimizations"
}

if ($Help) {
    Show-Usage
    exit 0
}

# Set build flags
$BuildFrontend = -not $BackendOnly
$BuildBackend = -not $FrontendOnly

Write-Status "Starting build process..."

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run from project root."
    exit 1
}

# Install root dependencies
Write-Status "Installing root dependencies..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install root dependencies"
    exit 1
}

# Build backend
if ($BuildBackend) {
    Write-Status "Building backend..."
    
    Push-Location backend
    
    # Install dependencies
    Write-Status "Installing backend dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install backend dependencies"
        Pop-Location
        exit 1
    }
    
    # Run linting
    Write-Status "Running backend linting..."
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Backend linting failed"
        Pop-Location
        exit 1
    }
    
    # Run tests
    if (-not $SkipTests) {
        Write-Status "Running backend tests..."
        npm test
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Backend tests failed"
            Pop-Location
            exit 1
        }
    }
    
    # Backend doesn't need a build step (Node.js)
    Write-Success "Backend build completed"
    
    Pop-Location
}

# Build frontend
if ($BuildFrontend) {
    Write-Status "Building frontend..."
    
    Push-Location frontend
    
    # Install dependencies
    Write-Status "Installing frontend dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install frontend dependencies"
        Pop-Location
        exit 1
    }
    
    # Run linting
    Write-Status "Running frontend linting..."
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend linting failed"
        Pop-Location
        exit 1
    }
    
    # Run tests
    if (-not $SkipTests) {
        Write-Status "Running frontend tests..."
        npm test
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Frontend tests failed"
            Pop-Location
            exit 1
        }
    }
    
    # Build the application
    Write-Status "Building frontend application..."
    if ($Optimize) {
        $env:NODE_ENV = "production"
        npm run build
    } else {
        npm run build
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Frontend build failed"
        Pop-Location
        exit 1
    }
    
    # Check if build was successful
    if (Test-Path "dist") {
        Write-Success "Frontend build completed successfully"
        Write-Status "Build output size:"
        $distSize = (Get-ChildItem -Path "dist" -Recurse | Measure-Object -Property Length -Sum).Sum
        Write-Host "  $('{0:N2}' -f ($distSize / 1MB)) MB"
    } else {
        Write-Error "Frontend build failed - dist directory not found"
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

# Generate build summary
Write-Status "Generating build summary..."

$buildTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$buildInfoFile = "build-info.json"

$buildInfo = @{
    buildTime = $buildTime
    buildOptions = @{
        frontend = $BuildFrontend
        backend = $BuildBackend
        tests = -not $SkipTests
        optimize = $Optimize
    }
    environment = @{
        nodeVersion = (node --version)
        npmVersion = (npm --version)
        platform = $env:OS
        architecture = $env:PROCESSOR_ARCHITECTURE
    }
} | ConvertTo-Json -Depth 3

$buildInfo | Out-File -FilePath $buildInfoFile -Encoding UTF8

Write-Success "Build completed successfully!"
Write-Host ""
Write-Host "Build Summary:"
Write-Host "  Build time: $buildTime"
Write-Host "  Frontend built: $BuildFrontend"
Write-Host "  Backend built: $BuildBackend"
Write-Host "  Tests run: $(-not $SkipTests)"
Write-Host "  Optimized: $Optimize"
Write-Host ""

if ($BuildFrontend -and (Test-Path "frontend\dist")) {
    Write-Host "Frontend build artifacts:"
    Get-ChildItem -Path "frontend\dist" | Format-Table Name, Length, LastWriteTime
    Write-Host ""
}

Write-Host "Build information saved to: $buildInfoFile"