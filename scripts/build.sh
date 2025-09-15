#!/bin/bash

# Build script for Autocomplete Search Tool
# Usage: ./scripts/build.sh [options]

set -e

# Default values
BUILD_FRONTEND=true
BUILD_BACKEND=true
RUN_TESTS=true
OPTIMIZE=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[BUILD]${NC} $1"
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
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --frontend-only    Build only frontend"
    echo "  --backend-only     Build only backend"
    echo "  --skip-tests       Skip running tests"
    echo "  --optimize         Enable production optimizations"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Build both frontend and backend"
    echo "  $0 --frontend-only    # Build only frontend"
    echo "  $0 --optimize         # Build with production optimizations"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --frontend-only)
            BUILD_BACKEND=false
            shift
            ;;
        --backend-only)
            BUILD_FRONTEND=false
            shift
            ;;
        --skip-tests)
            RUN_TESTS=false
            shift
            ;;
        --optimize)
            OPTIMIZE=true
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

print_status "Starting build process..."

# Check if we're in the right directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Please run from project root."
    exit 1
fi

# Install root dependencies
print_status "Installing root dependencies..."
npm install

# Build backend
if [[ "$BUILD_BACKEND" == true ]]; then
    print_status "Building backend..."
    
    cd backend
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    # Run linting
    print_status "Running backend linting..."
    npm run lint
    
    # Run tests
    if [[ "$RUN_TESTS" == true ]]; then
        print_status "Running backend tests..."
        npm test
    fi
    
    # Backend doesn't need a build step (Node.js)
    print_success "Backend build completed"
    
    cd ..
fi

# Build frontend
if [[ "$BUILD_FRONTEND" == true ]]; then
    print_status "Building frontend..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm install
    
    # Run linting
    print_status "Running frontend linting..."
    npm run lint
    
    # Run tests
    if [[ "$RUN_TESTS" == true ]]; then
        print_status "Running frontend tests..."
        npm test
    fi
    
    # Build the application
    print_status "Building frontend application..."
    if [[ "$OPTIMIZE" == true ]]; then
        NODE_ENV=production npm run build
    else
        npm run build
    fi
    
    # Check if build was successful
    if [[ -d "dist" ]]; then
        print_success "Frontend build completed successfully"
        print_status "Build output size:"
        du -sh dist/
    else
        print_error "Frontend build failed - dist directory not found"
        exit 1
    fi
    
    cd ..
fi

# Generate build summary
print_status "Generating build summary..."

BUILD_TIME=$(date)
BUILD_INFO_FILE="build-info.json"

cat > "$BUILD_INFO_FILE" << EOF
{
  "buildTime": "$BUILD_TIME",
  "buildOptions": {
    "frontend": $BUILD_FRONTEND,
    "backend": $BUILD_BACKEND,
    "tests": $RUN_TESTS,
    "optimize": $OPTIMIZE
  },
  "environment": {
    "nodeVersion": "$(node --version)",
    "npmVersion": "$(npm --version)",
    "platform": "$(uname -s)",
    "architecture": "$(uname -m)"
  }
}
EOF

print_success "Build completed successfully!"
echo ""
echo "Build Summary:"
echo "  Build time: $BUILD_TIME"
echo "  Frontend built: $BUILD_FRONTEND"
echo "  Backend built: $BUILD_BACKEND"
echo "  Tests run: $RUN_TESTS"
echo "  Optimized: $OPTIMIZE"
echo ""

if [[ "$BUILD_FRONTEND" == true && -d "frontend/dist" ]]; then
    echo "Frontend build artifacts:"
    ls -la frontend/dist/
    echo ""
fi

echo "Build information saved to: $BUILD_INFO_FILE"