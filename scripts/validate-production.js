#!/usr/bin/env node

/**
 * Production Environment Validation Script
 * Validates that the production environment is properly configured
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const PROJECT_ROOT = path.dirname(__dirname);
const REQUIRED_FILES = [
  'docker-compose.yml',
  'docker-compose.prod.yml',
  '.env.production',
  'frontend/Dockerfile',
  'backend/Dockerfile',
  'nginx/nginx.prod.conf'
];

const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'MONGODB_URI',
  'MONGO_ROOT_PASSWORD',
  'FRONTEND_URL',
  'CORS_ORIGIN'
];

const HEALTH_ENDPOINTS = [
  { name: 'Backend Health', url: 'http://localhost:3001/health' },
  { name: 'Frontend Health', url: 'http://localhost:3000/health' },
  { name: 'Search API', url: 'http://localhost:3001/api/search?query=test' }
];

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Logging functions
function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.reset;
  console.log(`${color}[${level.toUpperCase()}]${colors.reset} ${message}`);
}

function info(message) { log('blue', message); }
function success(message) { log('green', message); }
function warn(message) { log('yellow', message); }
function error(message) { log('red', message); }

// Validation functions
async function validateFiles() {
  info('Validating required files...');
  
  const missingFiles = [];
  
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }
  
  if (missingFiles.length > 0) {
    error(`Missing required files: ${missingFiles.join(', ')}`);
    return false;
  }
  
  success('All required files present');
  return true;
}

async function validateEnvironment() {
  info('Validating environment configuration...');
  
  const envFile = path.join(PROJECT_ROOT, '.env.production');
  if (!fs.existsSync(envFile)) {
    error('Production environment file not found');
    return false;
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  const envVars = {};
  
  // Parse environment file
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2];
    }
  });
  
  const missingVars = [];
  for (const varName of REQUIRED_ENV_VARS) {
    if (!envVars[varName] && !process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  // Validate specific configurations
  if (envVars.NODE_ENV !== 'production') {
    warn('NODE_ENV is not set to production');
  }
  
  if (envVars.MONGO_ROOT_PASSWORD === 'password123' || envVars.MONGO_ROOT_PASSWORD === 'password') {
    warn('Using default/weak MongoDB password');
  }
  
  if (envVars.CORS_ORIGIN && envVars.CORS_ORIGIN.includes('localhost')) {
    warn('CORS_ORIGIN includes localhost - may not be suitable for production');
  }
  
  success('Environment configuration validated');
  return true;
}

async function validateDockerConfiguration() {
  info('Validating Docker configuration...');
  
  try {
    const { execSync } = require('child_process');
    
    // Check if Docker is installed
    execSync('docker --version', { stdio: 'ignore' });
    execSync('docker-compose --version', { stdio: 'ignore' });
    
    // Check if Docker daemon is running
    execSync('docker info', { stdio: 'ignore' });
    
    // Validate docker-compose configuration
    execSync('docker-compose -f docker-compose.yml -f docker-compose.prod.yml config', { 
      stdio: 'ignore',
      cwd: PROJECT_ROOT 
    });
    
    success('Docker configuration validated');
    return true;
  } catch (err) {
    error(`Docker validation failed: ${err.message}`);
    return false;
  }
}

async function validateSecurity() {
  info('Validating security configuration...');
  
  const issues = [];
  
  // Check nginx configuration
  const nginxConfig = path.join(PROJECT_ROOT, 'nginx/nginx.prod.conf');
  if (fs.existsSync(nginxConfig)) {
    const nginxContent = fs.readFileSync(nginxConfig, 'utf8');
    
    if (!nginxContent.includes('server_tokens off')) {
      issues.push('nginx server_tokens not disabled');
    }
    
    if (!nginxContent.includes('X-Frame-Options')) {
      issues.push('X-Frame-Options header not set');
    }
    
    if (!nginxContent.includes('X-Content-Type-Options')) {
      issues.push('X-Content-Type-Options header not set');
    }
    
    if (!nginxContent.includes('gzip on')) {
      issues.push('gzip compression not enabled');
    }
  }
  
  // Check Dockerfile security
  const frontendDockerfile = path.join(PROJECT_ROOT, 'frontend/Dockerfile');
  if (fs.existsSync(frontendDockerfile)) {
    const dockerContent = fs.readFileSync(frontendDockerfile, 'utf8');
    
    if (!dockerContent.includes('USER nginx')) {
      issues.push('Frontend container runs as root');
    }
  }
  
  const backendDockerfile = path.join(PROJECT_ROOT, 'backend/Dockerfile');
  if (fs.existsSync(backendDockerfile)) {
    const dockerContent = fs.readFileSync(backendDockerfile, 'utf8');
    
    if (!dockerContent.includes('USER nodejs')) {
      issues.push('Backend container runs as root');
    }
  }
  
  if (issues.length > 0) {
    warn(`Security issues found: ${issues.join(', ')}`);
  } else {
    success('Security configuration validated');
  }
  
  return issues.length === 0;
}

async function validateHealthEndpoints() {
  info('Validating health endpoints...');
  
  const results = [];
  
  for (const endpoint of HEALTH_ENDPOINTS) {
    try {
      const result = await checkEndpoint(endpoint.url);
      if (result.status === 200) {
        success(`${endpoint.name}: OK`);
        results.push(true);
      } else {
        warn(`${endpoint.name}: HTTP ${result.status}`);
        results.push(false);
      }
    } catch (err) {
      warn(`${endpoint.name}: ${err.message}`);
      results.push(false);
    }
  }
  
  const healthyCount = results.filter(r => r).length;
  const totalCount = results.length;
  
  if (healthyCount === totalCount) {
    success(`All ${totalCount} health endpoints are healthy`);
    return true;
  } else {
    warn(`${healthyCount}/${totalCount} health endpoints are healthy`);
    return false;
  }
}

function checkEndpoint(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const timeout = 5000;
    
    const req = client.get(url, { timeout }, (res) => {
      resolve({ status: res.statusCode });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.setTimeout(timeout);
  });
}

async function validatePerformance() {
  info('Validating performance configuration...');
  
  const issues = [];
  
  // Check if compression is enabled
  try {
    const response = await checkEndpoint('http://localhost:3001/api/search?query=test');
    // Additional performance checks could be added here
  } catch (err) {
    issues.push('Cannot test API performance - service not running');
  }
  
  // Check Docker resource limits
  const prodComposeFile = path.join(PROJECT_ROOT, 'docker-compose.prod.yml');
  if (fs.existsSync(prodComposeFile)) {
    const composeContent = fs.readFileSync(prodComposeFile, 'utf8');
    
    if (!composeContent.includes('resources:')) {
      issues.push('No resource limits configured');
    }
    
    if (!composeContent.includes('memory:')) {
      issues.push('No memory limits configured');
    }
  }
  
  if (issues.length > 0) {
    warn(`Performance issues found: ${issues.join(', ')}`);
  } else {
    success('Performance configuration validated');
  }
  
  return issues.length === 0;
}

async function generateReport() {
  info('Generating validation report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    validation: {
      files: await validateFiles(),
      environment: await validateEnvironment(),
      docker: await validateDockerConfiguration(),
      security: await validateSecurity(),
      health: await validateHealthEndpoints(),
      performance: await validatePerformance()
    }
  };
  
  const reportFile = path.join(PROJECT_ROOT, `validation-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  success(`Validation report generated: ${reportFile}`);
  return report;
}

// Main validation function
async function main() {
  console.log('🔍 Production Environment Validation\n');
  
  try {
    const report = await generateReport();
    
    const validationResults = Object.values(report.validation);
    const passedCount = validationResults.filter(r => r).length;
    const totalCount = validationResults.length;
    
    console.log('\n📊 Validation Summary:');
    console.log(`✅ Passed: ${passedCount}/${totalCount} checks`);
    
    if (passedCount === totalCount) {
      success('🎉 All validation checks passed! Production environment is ready.');
      process.exit(0);
    } else {
      warn(`⚠️  ${totalCount - passedCount} validation checks failed. Please review and fix issues before deploying.`);
      process.exit(1);
    }
    
  } catch (err) {
    error(`Validation failed: ${err.message}`);
    process.exit(1);
  }
}

// Run validation if called directly
if (require.main === module) {
  main();
}

module.exports = {
  validateFiles,
  validateEnvironment,
  validateDockerConfiguration,
  validateSecurity,
  validateHealthEndpoints,
  validatePerformance,
  generateReport
};